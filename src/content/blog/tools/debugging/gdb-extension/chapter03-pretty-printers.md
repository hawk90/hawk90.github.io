---
title: "GDB Pretty-Printer 심화 — STL·커스텀 타입 시각화"
slug: "tools/debugging/gdb-extension/chapter03-pretty-printers"
date: 2026-05-27T09:03:00
description: "to_string / children / display_hint, MI 출력, auto-load, libstdc++ printer 분석."
tags: [gdb, python, pretty-printer, stl]
series: "GDB Extension and IDE"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

`std::vector<int>`가 `{1, 2, 3, 4}`로 깔끔하게 표시되는 이유는 **pretty-printer** 덕입니다. Python 클래스 하나가 *원시 메모리*를 *사람 읽을 표현*으로 변환. 이 장은 그 메커니즘을 깊이 다룹니다 — `to_string`/`children`/`display_hint` 인터페이스, MI 트리 출력, auto-load 메커니즘, 그리고 libstdc++ 표준 printer의 내부.

:::tldr
GDB의 `print val`이 *val의 타입*에 매칭된 Python 클래스를 호출하고, 그 클래스가 *문자열 + 자식 트리*로 표현을 반환.
:::

GDB 17.2 Python printing API를 기준으로 합니다. 표준 library 내부 field는 ABI·release에 묶이므로 보이는 이름만 보고 다른 구현에 적용하지 않습니다.

## Dispatch 메커니즘

![Pretty-printer dispatch 흐름](/images/blog/tools/diagrams/pretty-printer-dispatch.svg)

`(gdb) print v` 처리 흐름:

1. `v`의 타입을 파악 → `gdb.Type`
2. 등록된 pretty-printer들 순회
3. 첫 매칭되는 printer로 인스턴스 생성
4. `instance.to_string()` 호출 → 결과 문자열
5. `instance.children()` 호출 (있으면) → 자식 노드 yield
6. `instance.display_hint()` (있으면) → `"array"`/`"map"`/`"string"`
7. 위 정보를 종합해 출력

매칭이 없으면 *원시 출력* (struct 멤버 그대로). `print /r val`로 *강제 원시*.

## 단순 printer

```python
import gdb
import gdb.printing

class PointPrinter:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        return f"Point({int(self.val['x'])}, {int(self.val['y'])})"

def build_pp():
    pp = gdb.printing.RegexpCollectionPrettyPrinter("myproject")
    pp.add_printer('Point', '^Point$', PointPrinter)
    return pp

gdb.printing.register_pretty_printer(gdb.current_objfile(), build_pp(), replace=True)
```

```text
(gdb) print p
$1 = Point(3, 4)

(gdb) print /r p
$2 = {x = 3, y = 4}
```

### 매칭 — regex

```python
pp.add_printer('std::vector', '^std::vector<.*>$', VectorPrinter)
pp.add_printer('std::shared_ptr', '^std::shared_ptr<.*>$', SharedPtrPrinter)
```

regex는 이름 매칭일 뿐입니다. inline namespace·debug/ABI variant·vector<bool> specialization·libc++/libstdc++의 layout이 달라 broad regex가 잘못된 구조를 같은 printer로 보낼 수 있습니다.

## 자식 노드 — children()

표준 STL의 미확인 private field 대신, layout이 알려진 작은 도메인 queue를 사용합니다. 대상 구조의 data는 고정 4-element int array입니다.

```python title="debug-queue-printer.py"
import gdb
import gdb.printing

class DebugQueuePrinter:
    def __init__(self, value):
        self.value = value
        self.error = None
        try:
            self.capacity = int(value["capacity"])
            self.used = int(value["used"])
            self.head = int(value["head"])
            low, high = value["data"].type.strip_typedefs().range()
            if (low != 0 or not 1 <= self.capacity <= high + 1 or
                    not 0 <= self.used <= self.capacity or
                    not 0 <= self.head < self.capacity):
                self.error = "invalid queue metadata"
        except (gdb.error, TypeError, ValueError) as error:
            self.error = str(error)

    def to_string(self):
        return f"DebugQueue <{self.error}>" if self.error else f"DebugQueue {self.used}/{self.capacity}"

    def children(self):
        if self.error:
            return
        for i in range(self.used):
            index = (self.head + i) % self.capacity
            yield f"[{i}]", self.value["data"][index]

    def display_hint(self):
        return "array"

def register_debug_queue(objfile=None):
    collection = gdb.printing.RegexpCollectionPrettyPrinter("article-queue")
    collection.add_printer("DebugQueue", r"^DebugQueue$", DebugQueuePrinter)
    gdb.printing.register_pretty_printer(objfile, collection, replace=True)

register_debug_queue(gdb.current_objfile())
```

used/capacity/head 범위를 검사해 modulo-zero·out-of-bounds·거대한 corrupted iteration을 피합니다. children은 lazy iterator이며 caller의 CLI/MI 범위 요청에 따라 소비됩니다. 잘못된 metadata와 memory read failure를 empty queue로 위장하지 않습니다. 이것은 FreeRTOS Queue_t나 STL queue의 printer가 아닙니다.

### display_hint 종류

| hint | 표시 방식 |
|------|-----------|
| `"array"` | `{[0] = .., [1] = ..}` 인덱스 형식 |
| `"map"` | children이 *key, value 교대*로 emit, `[key] = value` |
| `"string"` | 따옴표 + 이스케이프 |

MI(머신 인터페이스) 프런트엔드(VSCode)가 이 힌트로 *트리 위젯 모양*을 결정.

### map printer

map hint는 child가 key, value, key, value 순으로 나오는 계약입니다. child 이름 자체가 key라는 뜻은 아닙니다. 실제 tree의 sentinel·successor·payload storage는 ABI별로 달라, undefined next_node와 가짜 KeyT/ValueT cast가 들어간 이전 std::map 조각은 구현 예로 사용하지 않습니다.

선택한 compiler/runtime과 함께 배포되는 검증된 printer를 사용하거나, version을 고정한 실제 구조로 정상·empty·손상·순환 node를 검증합니다.

## String printer

string hint는 quoting·escape·최종 표시 한계를 적용하도록 GDB에 알려 줍니다. std::string의 _M_p만 NUL까지 읽으면 embedded NUL·실제 length·손상/비종료 buffer를 잘못 처리할 수 있습니다. 해당 ABI의 length를 검증하고 pointer.string(length=...) 또는 lazy-string contract를 사용합니다.

print elements는 표시 한계이며 printer가 그 전에 unbounded string을 읽어도 안전하게 막아 주는 독립 memory budget은 아닙니다. children에서 가짜 "..." child를 추가하면 실제 container element와 혼동될 수 있어 사용하지 않습니다. CLI/MI의 lazy/range 계약과 제품별 안전 상한을 나눕니다.

## auto-load — 라이브러리 따라가는 printer

objfile에 대응하는 -gdb.py naming/search 규칙과 auto-load 설정·safe-path가 모두 맞아야 script를 실행합니다. 같은 디렉터리의 파일은 한 경로 예이지 무조건 실행된다는 보장은 아닙니다.

```text
/usr/lib/libfoo.so
/usr/lib/libfoo.so-gdb.py    ← 자동 로드
```

내용 예.

```python
# libfoo.so-gdb.py
import gdb, gdb.printing

class FooNode:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        return f"FooNode({int(self.val['id'])})"

def build_pp():
    pp = gdb.printing.RegexpCollectionPrettyPrinter("libfoo")
    pp.add_printer('FooNode', '^FooNode$', FooNode)
    return pp

# 등록 시 objfile=현재 로드된 객체
gdb.printing.register_pretty_printer(gdb.current_objfile(), build_pp(), replace=True)
```

### 보안

전체 /를 safe-path로 허용하지 말고 신뢰하는 정확한 script/경로만 user 설정에서 지정합니다. 현재 신뢰되지 않은 project script가 자기 자신을 허용하도록 두지 않습니다.

```text
(gdb) info auto-load
gdb-scripts:  No auto-loaded scripts.
libthread-db:  No auto-loaded libthread-db.
local-gdbinit:  No auto-loaded .gdbinit.
python-scripts:
Loaded  Script
Yes     /usr/lib/libstdc++.so.6.0.32-gdb.py
```

경로와 자동 설치 여부는 distro/toolchain package에 따라 다릅니다. info auto-load python-scripts와 info pretty-printer로 실제 loaded/registered 상태를 확인합니다.

## libstdc++ printer 내부

libstdc++ printer는 compiler release·ABI와 함께 맞춥니다. GCC source의 libstdc++-v3/python/libstdcxx/v6/printers.py에서 StdVectorPrinter·iterator와 registration을 확인할 수 있습니다.

일반 vector는 start/finish/end pointer 차이를 사용하지만 vector<bool>은 bit iterator의 word pointer·offset과 target word bit 폭을 함께 계산합니다. length는 word 차이 × word_bits + finish_offset - start_offset 형태의 실제 ABI 산술을 확인해야 합니다. start offset을 더하고 host의 8만 곱한 재구성 코드는 올바른 upstream 인용이 아니었습니다.

이 글은 fake/ellipsis가 섞인 전체 클래스 대신 다음 검토 지점을 남깁니다: typedef/inline namespace stripping, specialization dispatch, lazy child, empty iterator, target type/width, corrupt length와 memory read failure, objfile scope와 registration lifecycle.

## libc++ printer

LLVM repository의 libcxx/utils/gdb/libcxx가 GDB용 libc++ printer 경로입니다. source root의 utils/gdb와 혼동하지 않습니다. Clang이 항상 libc++를 쓰는 것은 아니므로 target toolchain·linked library·ABI를 확인합니다. 두 printer를 등록했다는 사실만으로 모든 std::__1/버전/ABI가 자동 호환되지는 않습니다.

## 디스플레이 옵션

```text
(gdb) set print pretty on            # 들여쓰기
(gdb) set print elements 100         # 컨테이너 표시 한도
(gdb) set print array on             # 배열을 여러 줄로 표시
(gdb) set print array-indexes on     # 인덱스 표시
(gdb) set print max-depth 5              # 중첩 깊이
(gdb) set print null-stop on         # NUL에서 string 자르기
(gdb) set print address on
```

pretty-printer가 동작해도 이 옵션들이 *최종 표시*에 영향.

## Type Printer — 타입 표시 자체 커스터마이즈

`typedef`나 *긴 템플릿*을 짧은 이름으로 표시.

type printer는 type 이름을 인식해 표시를 바꾸며 실제 type identity/ABI를 바꾸지 않습니다. unsigned long은 기본 타입이라 tag가 없을 수 있고 target에 따라 size_t의 underlying type도 다릅니다. tag == "unsigned long"인 모든 값을 size_t로 바꾸는 기존 예는 사용하지 않습니다.

프로젝트의 고유 typedef 이름·정확한 layout을 확인한 recognizer를 objfile scope에 등록하고 영향 범위를 제한합니다. ptype·CLI/MI에서 적용되는 출력도 해당 API 계약으로 확인합니다.

## Xmethod — 가짜 C++ 메서드

C++ 객체에 *가짜 메서드*를 추가. 예: `std::vector::size()`가 *실제 호출 없이* Python으로 평가.

xmethod는 실제 inferior 함수 호출을 대신해 debugger가 값을 계산하도록 할 수 있습니다. match는 class_type·namespace/ABI·method와 signature를 함께 검사하고 result type/argument contract를 맞춰야 합니다. 이름이 size인 모든 클래스에 libstdc++ _M_impl를 읽는 matcher를 붙이면 다른 타입이 깨집니다.

코어·remote target에서 unavailable memory를 처리할 수 있는지 확인하고, container의 실제 method 실행과 xmethod의 debugger 계산을 구분합니다. 미검증 generic matcher는 실행 가능한 vector implementation으로 제시하지 않습니다.

## MI 출력 — IDE 트리

VSCode·Emacs gud 등 *MI 프로토콜*을 쓰는 프런트엔드에서 pretty-printer가 *어떻게 트리*로 보이는가.

```text
(gdb) -var-create - * v
^done,name="var1",numchild="3",value="std::vector of size 3",
       type="std::vector<int, std::allocator<int> >",
       has_more="0",displayhint="array"

(gdb) -var-list-children var1
^done,numchild="3",children=[
  child={name="var1.0",exp="[0]",numchild="0",value="1",type="int"},
  child={name="var1.1",exp="[1]",numchild="0",value="2",type="int"},
  child={name="var1.2",exp="[2]",numchild="0",value="3",type="int"}
]
```

`displayhint="array"`가 IDE에게 *트리 표시 방식*을 알림.

-var-list-children은 지정 varobj의 child를 요청합니다. 필요한 자식을 다시 요청하며 트리를 펼치는 것은 client의 동작이고 한 명령이 무조건 전체 tree를 재귀 순회한다는 뜻은 아닙니다. -enable-pretty-printing과 dynamic varobj의 numchild/has_more/표시 범위도 확인합니다.

## 활용 — 도메인 객체

위 DebugQueue처럼 layout·invariant를 정한 객체부터 시작합니다. task state를 고정 4-element list로 indexing하거나 watermark를 used stack byte로 바꾸는 등 실제 RTOS와 맞지 않는 decoder를 붙이지 않습니다. 원본 raw 값과 printer 해석을 나란히 확인하고 corrupt metadata를 별도 오류로 표시합니다.

## 디버깅 — print-pretty-printer-info

```text
(gdb) info pretty-printer
(gdb) info auto-load python-scripts
(gdb) print /r queue
```

등록 scope·이름과 실제 선택된 collection을 확인합니다. 다른 standard library의 namespace가 뒤섞인 만들어 낸 전체 목록을 설치 결과로 제시하지 않습니다.

## 비활성화

특정 printer를 비활성화.

```text
(gdb) disable pretty-printer global builtin
(gdb) disable pretty-printer .* std::vector
(gdb) print /r v       # 일시적 원시 출력
```

가끔 printer가 *너무 적극적으로* 줄여 정보가 사라질 때 (`set print elements 0`은 unlimited이므로 큰/손상된 container에서는 오히려 비용이 커질 수 있음).

## 정리

- pretty-printer = Python 클래스. `to_string` + `children` + `display_hint`.
- `display_hint`로 array/map/string 트리 모양.
- regex로 타입 매칭 — 템플릿 인스턴스화 전부.
- `gdb.printing.register_pretty_printer`로 objfile별 등록.
- auto-load: `libfoo.so-gdb.py`가 자동 source.
- libstdc++/libc++의 표준 printer는 GCC/LLVM 소스에.
- Type printer로 긴 타입 이름 단축.
- Xmethod로 가짜 메서드 (`v.size()` 등).
- MI 출력의 트리 모양도 pretty-printer가 결정.
- 도메인 객체에 printer를 만들면 팀 디버깅이 *훨씬* 빨라짐.

## 다음 장 예고

Ch 4 — FrameDecorator / Unwinder. 콜스택을 *변형*하고 JIT 코드도 풀어내기.

## 관련 항목

- [Ch 2: 커스텀 명령](/blog/tools/debugging/gdb-extension/chapter02-commands-events)
- [Ch 4: FrameDecorator / Unwinder](/blog/tools/debugging/gdb-extension/chapter04-frame-unwinder)
- [Pretty Printing API 공식](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Pretty-Printing-API.html)
- [libstdc++ printer 소스](https://gcc.gnu.org/git/?p=gcc.git;a=tree;f=libstdc%2B%2B-v3/python/libstdcxx)
- [libc++ printer 소스](https://github.com/llvm/llvm-project/tree/main/libcxx/utils/gdb/libcxx)
