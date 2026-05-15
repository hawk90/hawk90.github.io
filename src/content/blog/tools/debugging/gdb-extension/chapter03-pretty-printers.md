---
title: "Ch 3: Pretty-Printer 깊이"
date: 2025-09-03T03:00:00
description: "to_string / children / display_hint, MI 출력, auto-load, libstdc++ printer 분석."
tags: [gdb, python, pretty-printer, stl]
series: "GDB Extension and IDE"
seriesOrder: 3
draft: false
---

`std::vector<int>`가 `{1, 2, 3, 4}`로 깔끔하게 표시되는 이유는 **pretty-printer** 덕입니다. Python 클래스 하나가 *원시 메모리*를 *사람 읽을 표현*으로 변환. 이 장은 그 메커니즘을 깊이 다룹니다 — `to_string`/`children`/`display_hint` 인터페이스, MI 트리 출력, auto-load 메커니즘, 그리고 libstdc++ 표준 printer의 내부.

## 한 줄 요약

GDB의 `print val`이 *val의 타입*에 매칭된 Python 클래스를 호출하고, 그 클래스가 *문자열 + 자식 트리*로 표현을 반환.

## Dispatch 메커니즘

```
(gdb) print v

1. v의 타입을 파악 → gdb.Type
2. 등록된 pretty-printer들 순회
3. 첫 매칭되는 printer로 인스턴스 생성
4. instance.to_string() 호출 → 결과 문자열
5. instance.children() 호출 (있으면) → 자식 노드 yield
6. instance.display_hint() (있으면) → "array"/"map"/"string"
7. 위 정보를 종합해 출력
```

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

gdb.printing.register_pretty_printer(gdb.current_objfile(), build_pp())
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

regex 매칭. `^std::vector<.*>$` 같은 패턴으로 *템플릿 인스턴스화 전체*를 한 패턴이 잡음.

## 자식 노드 — children()

```python
class VectorPrinter:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        size = int(self.val['_M_impl']['_M_finish'] - self.val['_M_impl']['_M_start'])
        return f"std::vector of size {size}"
    def children(self):
        start = self.val['_M_impl']['_M_start']
        finish = self.val['_M_impl']['_M_finish']
        size = int(finish - start)
        for i in range(size):
            yield f"[{i}]", start[i]
    def display_hint(self):
        return "array"
```

```text
(gdb) print v
$1 = std::vector of size 3 = {
  [0] = 1,
  [1] = 2,
  [2] = 3
}
```

`children()`이 `(name, value)` 쌍을 yield. value는 `gdb.Value` 또는 Python 기본 타입.

### display_hint 종류

| hint | 표시 방식 |
|------|-----------|
| `"array"` | `{[0] = .., [1] = ..}` 인덱스 형식 |
| `"map"` | children이 *key, value 교대*로 emit, `[key] = value` |
| `"string"` | 따옴표 + 이스케이프 |

MI(머신 인터페이스) 프런트엔드(VSCode)가 이 힌트로 *트리 위젯 모양*을 결정.

### map printer

```python
class MapPrinter:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        return f"std::map of {int(self.val['_M_t']['_M_impl']['_M_node_count'])} entries"
    def children(self):
        # red-black tree 순회
        node = self.val['_M_t']['_M_impl']['_M_header']['_M_left']  # 최소
        idx = 0
        while node:
            # key/value 추출 (단순화)
            kv = node.cast(gdb.lookup_type("std::_Rb_tree_node<std::pair<KeyT, ValueT>>").pointer())
            pair = kv['_M_storage']['_M_storage']
            yield f"key{idx}", pair['first']
            yield f"val{idx}", pair['second']
            # 다음 노드
            node = next_node(node)
            idx += 1
    def display_hint(self):
        return "map"
```

```text
(gdb) print m
$1 = std::map of 3 entries = {
  ["a"] = 1,
  ["b"] = 2,
  ["c"] = 3
}
```

## String printer

```python
class StringPrinter:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        # std::string 내부: _M_dataplus._M_p 가 char *
        ptr = self.val['_M_dataplus']['_M_p']
        return ptr.string(encoding='utf-8')
    def display_hint(self):
        return "string"
```

`display_hint = "string"`이면 GDB가 자동으로 `"..."`로 감싸고 이스케이프. `set print elements N`이 잘림 한계.

## 똑똑한 printer — 크기 제한

```python
class VectorPrinter:
    ...
    def children(self):
        max_elements = gdb.parameter("print elements")
        start = self.val['_M_impl']['_M_start']
        finish = self.val['_M_impl']['_M_finish']
        size = int(finish - start)
        n_show = min(size, max_elements) if max_elements else size
        for i in range(n_show):
            yield f"[{i}]", start[i]
        if size > n_show:
            yield "...", f"and {size - n_show} more"
```

큰 컨테이너 출력 시 *전체*를 yield하면 디버거가 느려집니다. `print elements`를 따라 자르기.

## auto-load — 라이브러리 따라가는 printer

`libfoo.so`와 같은 디렉터리에 `libfoo.so-gdb.py` 두면 GDB가 라이브러리 로드 시 *자동 source*.

```
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
gdb.printing.register_pretty_printer(gdb.current_objfile(), build_pp())
```

### 보안

`set auto-load safe-path /` (또는 특정 디렉터리). 신뢰하는 환경.

```text
(gdb) info auto-load
gdb-scripts:  No auto-loaded scripts.
libthread-db:  No auto-loaded libthread-db.
local-gdbinit:  No auto-loaded .gdbinit.
python-scripts:
Loaded  Script
Yes     /usr/lib/libstdc++.so.6.0.32-gdb.py
```

`/usr/lib/libstdc++.so.6.x.x-gdb.py`가 *libstdc++ pretty-printer*. 시스템에 자동 설치.

## libstdc++ printer 내부

libstdc++의 표준 printer 분석. 소스: `gcc/libstdc++-v3/python/libstdcxx/v6/printers.py`.

```python
class StdVectorPrinter:
    "Print a std::vector"

    class _iterator(Iterator):
        def __init__(self, start, finish, bitvec):
            self.bitvec = bitvec
            if bitvec:
                self.item = start['_M_p']
                self.so = 0
                self.finish = finish['_M_p']
                self.fo  = finish['_M_offset']
                ...
            else:
                self.item = start
                self.finish = finish
            self.count = 0

        def __next__(self):
            count = self.count
            self.count = self.count + 1
            if self.bitvec:
                # vector<bool> 특수 처리
                ...
            else:
                if self.item == self.finish:
                    raise StopIteration
                elt = self.item.dereference()
                self.item = self.item + 1
                return ('[%d]' % count, elt)

    def __init__(self, typename, val):
        self.typename = strip_versioned_namespace(typename)
        self.val = val
        self.is_bool = val.type.template_argument(0).code == gdb.TYPE_CODE_BOOL

    def children(self):
        return self._iterator(self.val['_M_impl']['_M_start'],
                              self.val['_M_impl']['_M_finish'],
                              self.is_bool)

    def to_string(self):
        start = self.val['_M_impl']['_M_start']
        finish = self.val['_M_impl']['_M_finish']
        end = self.val['_M_impl']['_M_end_of_storage']
        if self.is_bool:
            length = start['_M_offset'] + finish['_M_p'] * 8 - start['_M_p'] * 8 + finish['_M_offset']
            capacity = (end['_M_p'] - start['_M_p']) * 8
            return ('%s<bool> of length %d, capacity %d'
                    % (self.typename, int (length), int (capacity)))
        return ('%s of length %d, capacity %d'
                % (self.typename, int (finish - start), int (end - start)))

    def display_hint(self):
        return 'array'
```

핵심 패턴 셋.

1. `__init__` — 타입 이름과 Value 저장.
2. `to_string` — 한 줄 요약 ("vector of length N").
3. `children` — Iterator를 yield하면서 원소 emit.
4. `_iterator` — 별도 클래스로 *상태 머신* 보유 (vector<bool> 같은 특수 처리).
5. `display_hint = 'array'`.

GCC의 모든 STL printer가 같은 구조. unordered_map, list, map, set, multimap, ...

### 등록 — 한 줄

```python
def build_libstdcxx_dictionary():
    libstdcxx_printer = Printer("libstdc++-v6")
    
    # Add all the templated types
    libstdcxx_printer.add_version('std::', 'vector', StdVectorPrinter)
    libstdcxx_printer.add_version('std::', 'map', StdMapPrinter)
    libstdcxx_printer.add_version('std::', 'unordered_map', Tr1UnorderedMapPrinter)
    libstdcxx_printer.add_version('std::', 'shared_ptr', SharedPointerPrinter)
    ...

def register_libstdcxx_printers(obj):
    gdb.printing.register_pretty_printer(obj, build_libstdcxx_dictionary())
```

수십 종류. 매 GCC 버전마다 추가·수정. 의외로 코드량 — printers.py가 *수천 줄*.

## libc++ printer

LLVM 소스 `utils/gdb/libcxx/printers.py`. 비슷한 구조지만 `std::__1::` namespace.

```python
class StdVectorPrinter(object):
    "Print a std::vector"

    class _VectorIterator(object):
        ...

    def __init__(self, val):
        self.val = val
        ...
```

macOS의 기본 표준 라이브러리는 libc++. clang 빌드도 보통 libc++. 두 printer를 *함께 등록*하면 어느 라이브러리의 vector든 잘 표시.

## 디스플레이 옵션

```text
(gdb) set print pretty on            # 들여쓰기
(gdb) set print elements 100         # 컨테이너 표시 한도
(gdb) set print array on             # 배열 한 줄로
(gdb) set print array-indexes on     # 인덱스 표시
(gdb) set print depth 5              # 중첩 깊이
(gdb) set print null-stop on         # NUL에서 string 자르기
(gdb) set print address on
```

pretty-printer가 동작해도 이 옵션들이 *최종 표시*에 영향.

## Type Printer — 타입 표시 자체 커스터마이즈

`typedef`나 *긴 템플릿*을 짧은 이름으로 표시.

```python
import gdb, gdb.types

class SizeTPrinter:
    name = "size_t"
    enabled = True
    def __init__(self):
        pass
    def instantiate(self):
        return self.recognizer()
    class recognizer:
        def recognize(self, type_obj):
            if type_obj.tag == 'unsigned long':
                return 'size_t'
            return None

gdb.types.register_type_printer(gdb.current_objfile(), SizeTPrinter())
```

```text
(gdb) ptype my_var
type = size_t          ← unsigned long 대신
```

`std::__cxx11::basic_string<char, ...>` 같은 *지옥의 긴 이름*을 `std::string`으로 단순화하는 데 활용.

## Xmethod — 가짜 C++ 메서드

C++ 객체에 *가짜 메서드*를 추가. 예: `std::vector::size()`가 *실제 호출 없이* Python으로 평가.

```python
import gdb.xmethod

class VectorSizeWorker(gdb.xmethod.XMethodWorker):
    def get_arg_types(self):
        return None
    def get_result_type(self, obj):
        return gdb.lookup_type('size_t')
    def __call__(self, obj):
        start = obj['_M_impl']['_M_start']
        finish = obj['_M_impl']['_M_finish']
        return int(finish - start)

class VectorSize(gdb.xmethod.XMethodMatcher):
    def __init__(self):
        super().__init__("vector_size")
    def match(self, class_type, method_name):
        if method_name != 'size': return None
        return VectorSizeWorker()

gdb.xmethod.register_xmethod_matcher(None, VectorSize())
```

```text
(gdb) print v.size()
$1 = 3
```

*실제 함수 호출* 없이 Python으로 계산. `print x.size()`이 *프로세스가 정지된 상태*에서도 동작 (실제 호출은 인라인됐을 때).

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

`-var-list-children`은 *재귀 호출* — 사용자가 트리 노드를 펼치면 그때 호출. *지연 로드* 패턴.

## 활용 — 도메인 객체

내 프로젝트의 핵심 객체에 printer를 만들면 디버깅이 *훨씬* 쉬워집니다.

```python
class TaskPrinter:
    """RTOS Task 객체."""
    def __init__(self, val):
        self.val = val
    def to_string(self):
        name = self.val['name'].string()
        prio = int(self.val['priority'])
        state = int(self.val['state'])
        state_str = ['ready', 'running', 'blocked', 'suspended'][state]
        return f"Task '{name}' prio={prio} state={state_str}"
    def children(self):
        yield 'stack_used', self.val['stack_high_water_mark']
        yield 'tick_count', self.val['tick_count']
        yield 'name', self.val['name']

class QueuePrinter:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        used = int(self.val['used'])
        cap = int(self.val['capacity'])
        return f"Queue {used}/{cap}"
    def children(self):
        used = int(self.val['used'])
        head = self.val['head']
        data = self.val['data']
        for i in range(used):
            idx = (head + i) % int(self.val['capacity'])
            yield f"[{i}]", data[idx]
    def display_hint(self):
        return "array"
```

```text
(gdb) print *current_task
$1 = Task 'worker' prio=5 state=running = {
  stack_used = 1024,
  tick_count = 12345,
  name = "worker"
}

(gdb) print *queue
$2 = Queue 3/16 = {
  [0] = ...,
  [1] = ...,
  [2] = ...
}
```

팀 단위로 *공통 printer*를 두면 신입 개발자가 디버깅을 빠르게 시작할 수 있습니다.

## 디버깅 — print-pretty-printer-info

```text
(gdb) info pretty-printer
global pretty-printers:
  builtin
    mpx_bound128
  myproject
    Point
    MyClass

objfile /usr/lib/libstdc++.so.6 pretty-printers:
  libstdc++-v6
    __gnu_cxx::__normal_iterator
    __gnu_cxx::_Slist_iterator
    __gnu_debug::_Safe_iterator
    std::__1::shared_ptr
    std::__cxx11::basic_string
    std::__cxx11::list
    std::_Fwd_list_iterator
    std::_Fwd_list_const_iterator
    std::_List_iterator
    std::_List_const_iterator
    std::_Rb_tree_iterator
    std::_Rb_tree_const_iterator
    std::_Bit_iterator
    std::_Bit_const_iterator
    std::_Slist_iterator
    std::_Slist_const_iterator
    std::any
    std::array
    std::atomic
    std::basic_string
    std::bitset
    std::deque
    std::deque::iterator
    std::error_code
    std::experimental::any
    std::experimental::basic_string_view
    std::experimental::optional
    std::forward_list
    std::list
    std::map
    std::map::iterator
    std::multimap
    std::multimap::iterator
    std::multiset
    std::multiset::iterator
    std::optional
    std::pair
    std::priority_queue
    std::queue
    std::set
    std::set::iterator
    std::shared_ptr
    std::stack
    std::tuple
    std::unique_ptr
    std::unordered_map
    std::unordered_map::iterator
    std::unordered_multimap
    std::unordered_multimap::iterator
    std::unordered_multiset
    std::unordered_set
    std::variant
    std::vector
    std::vector::iterator
    std::weak_ptr
```

등록된 printer 전체. 이 목록을 보면 *어떤 STL 타입*이 지원되는지 한눈에.

## 비활성화

특정 printer를 비활성화.

```text
(gdb) disable pretty-printer global builtin
(gdb) disable pretty-printer .* std::vector
(gdb) print /r v       # 일시적 원시 출력
```

가끔 printer가 *너무 적극적으로* 줄여 정보가 사라질 때 (`set print elements 0`도 도움).

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
