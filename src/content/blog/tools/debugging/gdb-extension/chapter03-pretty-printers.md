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

`std::vector<int>`가 `std::vector of length 3, capacity 3 = {1, 2, 3}`으로 깔끔하게 표시되는 것은 **pretty-printer** 덕입니다. Python 클래스 하나가 *원시 메모리*를 *사람이 읽을 표현*으로 바꿉니다. 같은 값을 `print/r`로 찍으면 `_M_impl`·`_M_start`·`_M_finish`가 줄줄이 나오는데, pretty-printer는 그 위에 씌운 번역기입니다.

이 장은 그 메커니즘을 깊이 다룹니다. `to_string`/`children`/`display_hint` 인터페이스, MI의 트리 출력, auto-load, 그리고 libstdc++ 표준 printer의 내부를 봅니다.

:::tldr
GDB의 `print val`은 *val의 타입*을 맡을 Python printer를 objfile → progspace → global 순으로 찾고, 그 printer가 *문자열 + 자식 목록 + 표시 힌트*로 출력을 정합니다. 이 장의 출력은 모두 Debian 13 arm64의 GDB 16.3과 libstdc++ 14.2.0(`libstdc++6 14.2.0-19`)에서 `pp.cpp`를 돌려 얻었습니다.
:::

## 실습 프로그램

`pp.cpp`는 직접 만든 구조체 두 개(`Point`, 원형 큐 `DebugQueue`), STL 컨테이너 넷, typedef가 든 구조체, 그리고 공유 라이브러리 `libfoo.so`의 `FooNode`를 한 곳에 모았습니다. `g++ -g -O0`으로 빌드하고 23행에 멈춘 상태에서 시작합니다.

```cpp title="pp.cpp (발췌)"
struct Point { int x; int y; };
struct DebugQueue { int capacity; int used; int head; int data[4]; };
typedef unsigned int sensor_id_t;
struct Reading { sensor_id_t id; int value; };

int main() {
    Point p = {3, 4};
    DebugQueue queue = {4, 3, 2, {10, 20, 30, 40}};   // head=2: 30, 40, 10
    DebugQueue broken = {0, 7, 5, {0, 0, 0, 0}};
    std::vector<int> v = {1, 2, 3};
    std::vector<bool> flags = {true, false, true, true, false};
    std::map<std::string, int> ports = {{"http", 80}, {"ssh", 22}};
    std::string s = "hello";
    Reading r = {7, 42};
    FooNode *node = foo_make(5);
    std::printf(...);  // 23행, break here
}
```

## Dispatch 메커니즘

![Pretty-printer dispatch 흐름](/images/blog/tools/diagrams/pretty-printer-dispatch.svg)

GDB 16.3 매뉴얼 Selecting Pretty-Printers 절은 printer를 고르는 순서를 이렇게 적습니다. 현재 프로그램 공간의 각 `gdb.Objfile`에 붙은 `pretty_printers` 목록을 먼저 보고, 없으면 progspace의 목록, 마지막으로 전역 `gdb.pretty_printers`를 봅니다. 각 목록의 함수에 `gdb.Value`를 넘겨 printer 객체가 나오면 거기서 멈춥니다. 같은 절은 "가능한 가장 좁은 범위"에 등록하라고 권합니다.

printer 객체가 정해지면 Pretty Printing API 절의 메서드가 쓰입니다.

| 메서드 | 역할 |
|--------|------|
| `to_string()` | 값 자체를 나타내는 문자열 |
| `children()` | `(이름, 값)` 쌍을 내는 iterator |
| `display_hint()` | `"array"`, `"map"`, `"string"` 또는 `None` |

맞는 printer가 없으면 원시 형식(구조체 멤버 그대로)으로 출력하고, `print/r`은 printer를 건너뜁니다.

## 단순 printer

가장 작은 printer는 `to_string()` 하나만 있습니다. `gdb.printing.RegexpCollectionPrettyPrinter`가 타입 이름을 정규식으로 매칭해 줍니다.

```python title="point.py"
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
$1 = {x = 3, y = 4}
(gdb) source /root/ext/ch03/point.py
(gdb) print p
$2 = Point(3, 4)
(gdb) print/r p
$3 = {x = 3, y = 4}
(gdb) python print(gdb.current_objfile())
None
```

`source`로 읽으면 `gdb.current_objfile()`이 `None`이라서 이 printer는 *전역*으로 등록됩니다. 아래 `info pretty-printer`에서 `myproject`가 `global` 아래에 있는 이유입니다. 특정 objfile에 묶으려면 뒤의 auto-load로 읽혀야 합니다.

### 매칭 — regex

`add_printer(name, regexp, cls)`의 정규식은 *타입 이름*에만 맞춰집니다. libstdc++는 같은 일을 직접 짠 등록 함수로 합니다. Debian 13의 `/usr/share/gcc/python/libstdcxx/v6/printers.py` 2826행이 `libstdcxx_printer.add_container('std::', 'vector', StdVectorPrinter)`이고, 2849행이 debug 모드용 `std::__debug::vector`를 같은 클래스에 따로 등록합니다. 이름 한 줄로 끝나지 않고 inline namespace(`std::__8::`)와 debug 변형을 하나씩 챙긴다는 뜻입니다.

## 자식 노드 — children()

원형 큐는 메모리 순서와 논리 순서가 다릅니다. `head=2`인 `queue`의 원시 출력은 `data = {10, 20, 30, 40}`이지만 실제 꺼내질 순서는 30, 40, 10입니다. 회전초밥 레일에서 접시가 놓인 칸 번호와 내 앞에 올 순서가 다른 것과 같습니다.

아래 printer는 `head`부터 `used`개를 논리 순서로 냅니다. 생성자에서 메타데이터를 검사해, 깨진 값이면 0으로 나누거나 배열 밖을 읽는 대신 오류를 보여 줍니다.

```python title="queue.py"
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

```text
(gdb) print queue
$4 = {capacity = 4, used = 3, head = 2, data = {10, 20, 30, 40}}
(gdb) source /root/ext/ch03/queue.py
(gdb) print queue
$5 = DebugQueue 3/4 = {30, 40, 10}
(gdb) print broken
$6 = DebugQueue <invalid queue metadata>
```

`broken`은 `capacity=0`이라 그대로 두면 `% self.capacity`에서 `ZeroDivisionError`가 났을 값입니다. `children()`은 generator라서 GDB가 필요한 만큼만 꺼내 갑니다. 아래 `set print elements 2`에서 그 효과를 봅니다.

### display_hint 종류

매뉴얼 Pretty Printing API 절이 정의하는 힌트는 셋입니다.

| hint | 매뉴얼의 뜻 |
|------|-------------|
| `"array"` | 배열 같은 값. CLI가 `set print elements`·`set print array`를 따릅니다 |
| `"map"` | map 같은 값. 자식이 key, value, key, value 순서로 번갈아 나온다고 봅니다 |
| `"string"` | 문자열 같은 값. `to_string()`이 Python 문자열이면 따옴표·escape·`set print elements`를 적용합니다 |

같은 절은 이 힌트가 MI 소비자에게 `displayhint` 속성으로 전달된다고 적습니다. IDE가 트리 모양을 정하는 근거가 이 값입니다(아래 MI 절).

### map printer

libstdc++의 `std::map` printer가 `map` 힌트를 씁니다. CLI에서는 key와 value가 `[key] = value`로 묶여 나옵니다.

```text
(gdb) print ports
$10 = std::map with 2 elements = {["http"] = 80, ["ssh"] = 22}
```

MI에서 자식을 펼치면 원소 2개가 아니라 자식 4개가 나옵니다. `[0]`이 `"http"`, `[1]`이 80, `[2]`가 `"ssh"`, `[3]`이 22입니다. 자식 *이름*이 key인 것이 아니라 자식이 key와 value를 *번갈아* 내는 계약입니다. 그래서 직접 map printer를 짜면 `children()`에서 key와 value를 각각 한 항목씩 yield해야 합니다.

## String printer

`std::string`은 printer가 `"hello"`로 보여 줍니다. printer를 끄면 원래 모습이 드러납니다(뒤의 비활성화 절).

```text
(gdb) print s
$2 = {_M_dataplus = {<std::allocator<char>> = {...}, _M_p = 0xfffffffff930 "hello"},
  _M_string_length = 5, {_M_local_buf = "hello\000\000\000h\372\377\377\377\377\000", _M_allocated_capacity = 478560413032}}
```

길이가 `_M_string_length`에 따로 있고, 5글자짜리는 힙이 아니라 객체 안의 `_M_local_buf`(SSO 버퍼)에 들어 있습니다. 버퍼 뒤쪽은 쓰레기 값입니다. 그래서 문자열 printer는 `_M_p`를 NUL까지 읽는 대신 길이 필드로 범위를 정해야 합니다. `Value.string(length=n)`이나 `Value.lazy_string(length=n)`이 그 수단입니다.

## auto-load — 라이브러리를 따라가는 printer

라이브러리를 만든 쪽이 printer를 함께 배포하는 방법이 auto-load입니다. GDB 16.3 매뉴얼의 `objfile-gdb.ext file` 절에 따르면, GDB는 새 objfile을 읽을 때 그 파일의 절대 경로(심볼릭 링크를 따라간 실제 경로)에 `-gdb.py`를 붙인 파일을 찾습니다. 같은 디렉터리에 없으면 auto-load 디렉터리(Debian은 `/usr/share/gdb/auto-load`) 아래의 같은 경로를 봅니다.

```python title="libfoo.so-gdb.py"
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

gdb.write(f"libfoo.so-gdb.py: current_objfile = {gdb.current_objfile().filename}\n")
gdb.printing.register_pretty_printer(gdb.current_objfile(), build_pp(), replace=True)
```

`libfoo.so` 옆에 이 파일을 두고 그냥 실행하면 거부됩니다.

```text
warning: File "/root/ext/ch03/libfoo.so-gdb.py" auto-loading has been declined by your `auto-load safe-path' set to "$debugdir:$datadir/auto-load".
To enable execution of this file add
	add-auto-load-safe-path /root/ext/ch03/libfoo.so-gdb.py
...
(gdb) info auto-load
gdb-scripts:  No auto-load scripts.
libthread-db:  No auto-loaded libthread-db.
local-gdbinit:  Local .gdbinit file was not found.
python-scripts:
Loaded  Script
No      /root/ext/ch03/libfoo.so-gdb.py
Yes     /usr/share/gdb/auto-load/usr/lib/aarch64-linux-gnu/libstdc++.so.6.0.33-gdb.py
(gdb) print *node
$13 = {id = 5, next = 0x0}
```

`-iex "add-auto-load-safe-path /root/ext/ch03/libfoo.so-gdb.py"`로 그 파일 하나만 허용하자 로드됐고, 이번에는 `current_objfile()`이 `libfoo.so`를 가리켜 printer가 그 objfile에 붙었습니다.

```text
libfoo.so-gdb.py: current_objfile = /root/ext/ch03/libfoo.so
...
$1 = FooNode(5)
(gdb) info auto-load python-scripts
Loaded  Script
Yes     /root/ext/ch03/libfoo.so-gdb.py
Yes     /usr/share/gdb/auto-load/usr/lib/aarch64-linux-gnu/libstdc++.so.6.0.33-gdb.py
(gdb) info pretty-printer
global pretty-printers:
  builtin
objfile /root/ext/ch03/libfoo.so pretty-printers:
  libfoo
    FooNode
objfile /lib/aarch64-linux-gnu/libstdc++.so.6 pretty-printers:
  libstdc++-v6
```

libstdc++의 스크립트 이름이 `libstdc++.so.6`이 아니라 `libstdc++.so.6.0.33-gdb.py`인 것은 심볼릭 링크를 따라간 실제 파일 이름에 맞추기 때문입니다. 이 스크립트는 Debian 패키지 `libstdc++6`이 설치하며, 내용은 `/usr/share/gcc/python`을 `sys.path`에 넣고 `libstdcxx.v6.register_libstdcxx_printers(gdb.current_objfile())`를 부르는 것이 전부입니다.

### 보안

safe-path는 *받은 소스 트리의 스크립트가 GDB를 띄우기만 해도 실행되는 것*을 막는 장치입니다. 경고 문구는 `set auto-load safe-path /`로 보호를 끄는 방법도 알려 주지만, 그러면 모든 경로가 허용됩니다. 위처럼 신뢰하는 파일 하나만 사용자 init 파일이나 `-iex`에서 허용합니다. 프로젝트 쪽 스크립트가 스스로를 허용할 수는 없습니다. [Ch 2](/blog/tools/debugging/gdb-extension/chapter02-commands-events)의 로컬 `.gdbinit`과 같은 규칙입니다.

## libstdc++ printer 내부

Debian 13에서는 `libstdc++6` 패키지의 `/usr/share/gcc/python/libstdcxx/v6/printers.py`가 실제 코드입니다. GCC 저장소에서는 `libstdc++-v3/python/libstdcxx/v6/printers.py`입니다. `StdVectorPrinter`(520행)의 `to_string()`은 일반 vector와 `vector<bool>`을 다르게 셉니다.

```python title="printers.py 571~587행 (libstdc++ 14.2.0)"
    def to_string(self):
        start = self._val['_M_impl']['_M_start']
        finish = self._val['_M_impl']['_M_finish']
        end = self._val['_M_impl']['_M_end_of_storage']
        if self._is_bool:
            start = self._val['_M_impl']['_M_start']['_M_p']
            finish = self._val['_M_impl']['_M_finish']['_M_p']
            fo = self._val['_M_impl']['_M_finish']['_M_offset']
            itype = start.dereference().type
            bl = 8 * itype.sizeof
            length = bl * (finish - start) + fo
            capacity = bl * (end - start)
            return ('%s<bool> of length %d, capacity %d'
                    % (self._typename, int(length), int(capacity)))
        else:
            return ('%s of length %d, capacity %d'
                    % (self._typename, int(finish - start), int(end - start)))
```

일반 vector는 `_M_finish - _M_start`가 원소 수입니다. `vector<bool>`은 비트를 워드에 채워 담으므로 길이가 `워드 비트 수 × (finish 워드 - start 워드) + finish 오프셋`입니다. 시작 오프셋은 빼지 않습니다. 실습의 원소 5개짜리 `flags`가 어떻게 보이는지 확인했습니다.

```text
(gdb) print flags
$9 = std::vector<bool> of length 5, capacity 64 = {true, false, true, true, false}
```

capacity가 64인 것은 비트 워드가 8바이트이고 한 워드를 통째로 잡았기 때문입니다. `ptype flags._M_impl._M_start._M_p`는 `type = unsigned long *`이었습니다. 원소 이터레이터(`_iterator`, 523~558행)도 `bitvec`이면 워드 안의 비트를 하나씩 읽고 `_isize`(워드 비트 수)를 넘으면 다음 워드로 넘어갑니다.

## libc++ printer

LLVM 쪽은 `llvm-project` 저장소의 `libcxx/utils/gdb/libcxx/printers.py` 한 파일이 GDB용 libc++ printer입니다. 이 장에서는 libc++로 빌드한 프로그램을 돌리지 않았으므로, 이 printer의 동작은 확인하지 않았습니다.

## 디스플레이 옵션

pretty-printer가 결과를 내도 최종 표시는 `set print` 옵션을 따릅니다. GDB 16.3 매뉴얼 Print Settings 절에 있는 이름들입니다.

```text
(gdb) set print pretty on            # 구조체를 들여쓰기해 여러 줄로
(gdb) set print elements 100         # 배열·문자열 표시 한도 (기본 200, 0이나 unlimited는 무제한)
(gdb) set print array on             # 배열을 여러 줄로 표시
(gdb) set print array-indexes on     # 인덱스 표시
(gdb) set print max-depth 5          # 중첩 깊이
(gdb) set print null-stop on         # char 배열을 NUL에서 자르기
(gdb) set print address on
```

`array` 힌트를 단 printer는 `set print elements`를 따르고, `children()`은 그 한도까지만 소비됩니다. 직접 만든 `DebugQueue`도 STL과 똑같이 잘립니다.

```text
(gdb) set print elements 2
(gdb) print v
$14 = std::vector of length 3, capacity 3 = {1, 2...}
(gdb) print queue
$15 = DebugQueue 3/4 = {30, 40...}
(gdb) set print elements 200
(gdb) set print pretty on
(gdb) print ports
$16 = std::map with 2 elements = {
  ["http"] = 80,
  ["ssh"] = 22
}
```

## Type Printer — 타입 표시 자체 커스터마이즈

pretty-printer가 *값*의 표시를 바꾼다면, type printer는 `ptype`·`whatis`가 보여 주는 *타입 이름*을 바꿉니다. 매뉴얼 Type Printing API 절에 따르면 type printer는 `name`·`enabled` 속성과 `instantiate()` 메서드를 갖고, `instantiate()`가 돌려준 recognizer의 `recognize(type)`가 문자열을 주면 그 이름으로 표시합니다. 값의 타입이나 크기는 그대로입니다.

아래 예는 프로젝트 typedef `sensor_id_t`만 `SensorId`로 바꿔 보입니다. 기본 타입 `unsigned int` 전체가 아니라 typedef 이름 하나로 범위를 좁혔습니다.

```python title="typeprinter.py"
import gdb
import gdb.types

class SensorIdRecognizer:
    def recognize(self, type_obj):
        if type_obj.name == "sensor_id_t":
            return "SensorId"
        return None

class SensorIdTypePrinter:
    def __init__(self):
        self.name = "sensor-id"
        self.enabled = True
    def instantiate(self):
        return SensorIdRecognizer()

gdb.types.register_type_printer(None, SensorIdTypePrinter())
```

```text
(gdb) ptype r
type = struct Reading {
    sensor_id_t id;
    int value;
}
(gdb) source /root/ext/ch03/typeprinter.py
(gdb) ptype r
type = struct Reading {
    SensorId id;
    int value;
}
(gdb) whatis r.id
type = SensorId
```

libstdc++도 type printer를 씁니다. `info type-printers`를 치면 `libstdc++.so.6` 아래에 `std::__8::map`, `std::__8::list`, `std::__8::mt19937` 같은 항목이 248개 등록돼 있습니다. 긴 템플릿 이름 대신 표준 typedef 이름으로 보여 주기 위한 것입니다.

## Xmethod — 디버거가 계산하는 C++ 메서드

`print v.size()`는 원래 디버기 안에서 `size()`를 *실제로 호출*합니다. 매뉴얼 Xmethods In Python 절에 따르면 xmethod는 그 호출을 Python 구현으로 대신합니다. 함수가 인라인돼 바이너리에 없거나, 실행 중인 프로세스가 없는 core 파일에서도 `v.size()`가 동작하게 하려는 장치입니다.

구조는 matcher와 worker 둘입니다. matcher의 `match(class_type, method_name)`이 클래스와 메서드 이름을 보고 worker를 돌려주고, worker의 `__call__`이 값을 계산합니다. `DebugQueue`에 원래 없는 `front()`를 붙여 보았습니다.

```python title="xm.py"
import gdb
import gdb.xmethod

class QueueFrontWorker(gdb.xmethod.XMethodWorker):
    def get_arg_types(self):
        return None
    def get_result_type(self, obj):
        return gdb.lookup_type("int")
    def __call__(self, obj):
        return obj["data"][obj["head"]]

class QueueFrontMatcher(gdb.xmethod.XMethodMatcher):
    def __init__(self):
        super().__init__("DebugQueue::front")
    def match(self, class_type, method_name):
        if class_type.tag == "DebugQueue" and method_name == "front":
            return QueueFrontWorker()
        return None

gdb.xmethod.register_xmethod_matcher(None, QueueFrontMatcher())
```

```text
(gdb) print queue.front()
Couldn't find method DebugQueue::front
(gdb) source /root/ext/ch03/xm.py
(gdb) print queue.front()
$5 = 30
(gdb) info xmethod
Xmethods in global:
  DebugQueue::front
Xmethods in objfile /lib/aarch64-linux-gnu/libstdc++.so.6:
  libstdc++::shared_ptr
    get
    operator->
  ...
  libstdc++::vector
    size
    empty
    front
    back
    at
    operator[]
  ...
```

matcher가 `class_type.tag`로 클래스를 정확히 확인하는 점이 중요합니다. 이름이 `front`인 모든 메서드에 반응하면 다른 클래스의 `front()`까지 가로챕니다. libstdc++도 `/usr/share/gcc/python/libstdcxx/v6/xmethods.py`에 컨테이너별 xmethod를 둡니다. xmethod를 끄면 무엇이 달라지는지도 확인했습니다. `disable xmethod` 뒤 `std::vector<int>::size`에 breakpoint를 걸고 `print v.size()`를 치자 디버기 안의 실제 함수에서 멈췄습니다.

```text
(gdb) disable xmethod
(gdb) break std::vector<int, std::allocator<int> >::size
Breakpoint 2 at 0xaaaaaaaa23b0: file /usr/include/c++/14/bits/stl_vector.h, line 993.
(gdb) print v.size()

Breakpoint 2, std::vector<int, std::allocator<int> >::size (this=0xfffffffff998) at /usr/include/c++/14/bits/stl_vector.h:993
993	      { return size_type(this->_M_impl._M_finish - this->_M_impl._M_start); }
The program being debugged stopped while in a function called from GDB.
```

xmethod가 켜져 있을 때는 같은 `print v.size()`가 이 breakpoint를 건드리지 않고 3을 냈습니다. 매뉴얼이 살아 있는 프로그램에서도 xmethod 호출은 디버기를 실행할 필요가 없다("which can potentially perturb its state")고 적는 차이가 이것입니다.

## MI 출력 — IDE 트리

VS Code의 cppdbg 같은 MI 프런트엔드는 `-var-create`로 변수 객체(varobj)를 만들고 `-var-list-children`으로 자식을 받아 트리를 그립니다. GDB 16.3 매뉴얼 GDB/MI Variable Objects 절에 따르면 pretty-printer가 MI에 반영되려면 프런트엔드가 먼저 `-enable-pretty-printing`을 보내야 하고, 한 번 켜면 끌 수 없습니다. `gdb --interpreter=mi3`에 두 경우를 보냈습니다.

```text
-var-create - * v
^done,name="var1",numchild="1",value="{...}",type="std::vector<int, std::allocator<int> >",thread-id="1",has_more="0"
```

`-enable-pretty-printing` 없이는 위처럼 원시 구조체(`{...}`)가 나옵니다. 켜고 나면 다음과 같습니다.

```text
-enable-pretty-printing
^done
-var-create - * v
^done,name="var1",numchild="0",value="std::vector of length 3, capacity 3",type="std::vector<int, std::allocator<int> >",thread-id="1",displayhint="array",dynamic="1",has_more="1"
-var-list-children var1
^done,numchild="3",displayhint="array",children=[child={name="var1.[0]",exp="[0]",numchild="0",type="int",thread-id="1"},child={name="var1.[1]",exp="[1]",numchild="0",type="int",thread-id="1"},child={name="var1.[2]",exp="[2]",numchild="0",type="int",thread-id="1"}],has_more="0"
-var-create - * queue
^done,name="var2",numchild="0",value="DebugQueue 3/4",type="DebugQueue",thread-id="1",displayhint="array",dynamic="1",has_more="1"
-var-list-children --all-values var2
^done,numchild="3",displayhint="array",children=[child={name="var2.[0]",exp="[0]",numchild="0",value="30",...},child={name="var2.[1]",exp="[1]",numchild="0",value="40",...},child={name="var2.[2]",exp="[2]",numchild="0",value="10",...}],has_more="0"
```

세 가지를 읽을 수 있습니다. 첫째, `value`가 printer의 `to_string()` 결과이고 `displayhint`가 `display_hint()` 결과입니다. 둘째, printer가 붙은 varobj는 `dynamic="1"`이고, 만들 때는 `numchild="0"`·`has_more="1"`입니다. 매뉴얼은 dynamic varobj의 `numchild`를 믿지 말고 `has_more`를 보라고 적습니다. 자식 수는 `-var-list-children`으로 `children()`을 실제로 돌려 봐야 압니다. 셋째, 직접 만든 `DebugQueue`도 STL과 똑같은 모양으로 나옵니다. IDE는 printer가 누구 것인지 구분하지 않습니다.

`std::map`의 varobj는 `displayhint="map"`이고, 앞의 map 절에서 말한 대로 자식이 4개(key, value, key, value)였습니다. key 자식에는 다시 `displayhint="string"`이 붙었습니다.

## 활용 — 도메인 객체

pretty-printer가 가장 값을 하는 곳은 팀이 매일 들여다보는 도메인 구조체입니다. 위 `DebugQueue`처럼 레이아웃과 불변식(`used ≤ capacity`, `head < capacity`)을 아는 객체부터 시작합니다. 디버깅 중인 메모리는 손상돼 있을 수 있으므로, printer는 불변식이 깨진 값을 빈 컨테이너로 위장하지 말고 `broken`처럼 오류로 드러내야 합니다. 의심스러우면 `print/r`로 원시 값과 나란히 봅니다.

## 디버깅 — 어떤 printer가 쓰였나

```text
(gdb) info pretty-printer
global pretty-printers:
  article-queue
    DebugQueue
  builtin
  myproject
    Point
objfile /lib/aarch64-linux-gnu/libstdc++.so.6 pretty-printers:
  libstdc++-v6
(gdb) info auto-load python-scripts
(gdb) print/r queue
```

`builtin`은 GDB 16.3 `gdb/python/lib/gdb/printing.py` 433~435행이 시작할 때 전역에 등록하는 collection입니다. libstdc++의 `libstdc++-v6`는 하위 printer 목록이 보이지 않습니다. `RegexpCollectionPrettyPrinter`가 아니라 libstdc++가 직접 만든 printer라서 `subprinters`를 노출하지 않기 때문입니다.

## 비활성화

`disable pretty-printer [object-regexp [name-regexp]]`의 이름 정규식은 `info pretty-printer`에 보이는 이름에 맞춰집니다. 처음 시도한 두 명령은 아무것도 끄지 못했습니다.

```text
(gdb) disable pretty-printer .* std::vector
0 printers disabled
1 of 1 printers enabled
(gdb) disable pretty-printer .*libstdc.* libstdc\+\+-v6
0 printers disabled
```

첫 명령은 `std::vector`라는 이름의 printer가 목록에 없어서 실패했습니다. 두 번째는 GDB가 인자를 `gdb.string_to_argv`로 풀면서 `\+`의 백슬래시를 먹어 Python 정규식이 `libstdc++-v6`(`c++`는 Python 3.11부터 possessive 수량자)가 됐기 때문입니다. 특수문자를 피한 정규식이 통했습니다.

```text
(gdb) disable pretty-printer .*libstdc.* libstdc..-v6
1 printer disabled
0 of 1 printers enabled
(gdb) print v
$1 = {<std::_Vector_base<int, std::allocator<int> >> = {
    _M_impl = {... _M_start = 0xaaaaaaad32b0, _M_finish = 0xaaaaaaad32bc, _M_end_of_storage = 0xaaaaaaad32bc}, <No data fields>}}, <No data fields>}
(gdb) enable pretty-printer
1 printer enabled
1 of 1 printers enabled
```

libstdc++ printer는 하위 printer를 노출하지 않으므로 vector만 골라 끌 수는 없고, collection 전체를 끄거나 값 하나만 `print/r`로 봅니다. `_M_finish - _M_start`가 12바이트, 즉 `int` 3개라는 것도 원시 출력에서 직접 확인됩니다.

## 정리

- pretty-printer는 `to_string()` + `children()` + `display_hint()`를 가진 Python 객체이고, objfile → progspace → global 순으로 찾습니다.
- `source`로 읽으면 `current_objfile()`이 `None`이라 전역 등록이 되고, `objfile-gdb.py` auto-load로 읽혀야 그 objfile에 붙습니다.
- auto-load는 safe-path가 허용한 파일만 실행합니다. 허용은 파일 하나 단위로 합니다.
- `map` 힌트는 자식이 key·value를 번갈아 내는 계약이고, MI에서도 자식 4개로 나왔습니다.
- libstdc++ 14.2.0의 `vector<bool>` 길이는 `워드 비트 수 × 워드 차이 + finish 오프셋`입니다.
- type printer는 `ptype`의 타입 이름을, xmethod는 `obj.method()` 호출을 Python으로 대신합니다.
- MI에서 pretty-printer는 `-enable-pretty-printing` 뒤에만 쓰이고, dynamic varobj는 `numchild` 대신 `has_more`를 봅니다.
- libstdc++ printer는 collection 단위로만 끌 수 있고, `disable pretty-printer`의 정규식에서 `\+`는 통하지 않았습니다.

## 다음 장 예고

[Ch 4](/blog/tools/debugging/gdb-extension/chapter04-frame-unwinder) — Frame filter·FrameDecorator·Unwinder. 콜스택을 *가공*하고, CFI가 없는 코드도 풀어냅니다.

## 관련 항목

- [Ch 2: 커스텀 명령](/blog/tools/debugging/gdb-extension/chapter02-commands-events)
- [Ch 4: FrameDecorator / Unwinder](/blog/tools/debugging/gdb-extension/chapter04-frame-unwinder)
- [Pretty Printing API 공식](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Pretty-Printing-API.html)
- [libstdc++ printer 소스](https://gcc.gnu.org/git/?p=gcc.git;a=tree;f=libstdc%2B%2B-v3/python/libstdcxx)
- [libc++ printer 소스](https://github.com/llvm/llvm-project/tree/main/libcxx/utils/gdb/libcxx)
- [GDB and LLDB Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting) — printer 첫 소개와 LLDB 대응

## 검증 기준

모든 세션은 Debian 13 arm64 VM의 GDB 16.3(Debian 16.3-1), GCC 14.2.0, `libstdc++6 14.2.0-19`로 `pp.cpp`·`libfoo.so`를 `-g -O0`으로 빌드해 CLI와 `--interpreter=mi3`로 돌렸습니다. API 설명은 GDB 16.3 tarball의 `gdb/doc/python.texi`(Pretty Printing API, Selecting Pretty-Printers, Type Printing API, Xmethods In Python 절), `gdb/doc/gdb.texinfo`(Print Settings, `objfile-gdb.ext file`, GDB/MI Variable Objects 절), `gdb/python/lib/gdb/command/pretty_printers.py`와 VM의 `/usr/share/gcc/python/libstdcxx/v6/printers.py`로 대조했습니다.
