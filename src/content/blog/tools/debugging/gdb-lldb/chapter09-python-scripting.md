---
title: "GDB·LLDB Python 스크립팅 — Pretty-Printer·Custom Command"
slug: "tools/debugging/gdb-lldb/chapter09-python-scripting"
date: 2026-05-24T09:09:00
description: "GDB / LLDB Python API. pretty-printer 작성, 커스텀 명령, 자동화, MI."
tags: [gdb, lldb, Python, Scripting]
series: "GDB and LLDB"
seriesOrder: 9
draft: false
topics: ["tools", "tools/debugging"]
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [GDB Extension and IDE 시리즈](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)를 참고하세요 — Python API 깊이, pretty-printer 메커니즘, FrameDecorator/Unwinder, MI/DAP.
:::


GDB와 LLDB 모두 Python 인터프리터를 내장합니다. 단순한 매크로는 GDB의 user-defined command로도 되지만, *데이터 구조 시각화*나 *조건이 복잡한 자동화*는 Python으로 짜는 편이 훨씬 수월합니다. [Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)에서 `std::vector`가 `{1, 2, 3, 4, 5}`로 보였던 것도 libstdc++가 배포하는 Python pretty-printer 덕입니다.

이 장의 코드는 모두 실제로 돌린 것입니다. 실습 프로그램 `py.c`(점·리스트·맵·트리 구조체, `helper`·`process` 함수, `malloc` 두 번)를 Debian 13 arm64의 GDB 16.3(내장 Python 3.13.5)과 lldb 19.1.7로 실행했고, 스크립트는 `tools.py` 한 파일에 모아 `source`했습니다.

```c title="py.c (구조체 정의)"
struct Point { int x; int y; };
struct MyList { int size; int* data; };
struct MapNode { const char* key; int value; struct MapNode* next; };
struct MyMap { int size; struct MapNode* root; };
struct Tree { int value; struct Tree* left; struct Tree* right; };
```

## 시작 — 한 줄 Python

`python <문장>`은 한 줄, `python` … `end`는 여러 줄, 외부 파일은 `source`입니다.

```text
(gdb) python print("hello from gdb")
hello from gdb
(gdb) python import sys; print(sys.version)
3.13.5 (main, Aug 10 2026, 12:06:59) [GCC 14.2.0]
(gdb) source tools.py
```

GDB가 내장한 Python의 버전은 GDB를 빌드할 때 정해집니다. Debian 13의 GDB 16.3은 Python 3.13.5였습니다. 시스템 Python의 venv나 외부 패키지를 쓰려면 `sys.path`에 그 경로를 직접 넣어야 합니다.

LLDB는 `script`입니다.

```text
(lldb) script print("hello")
hello
(lldb) command script import /root/ch09/my_cmds.py
```

## gdb 모듈 — 진입점

`gdb` 모듈이 디버거와 대상 프로세스를 들여다보는 입구입니다. 33행에 멈춘 상태에서 몇 가지를 실행했습니다.

```text
(gdb) python v = gdb.parse_and_eval("list"); print(v.type, v["size"], v["data"].dereference(), v["data"][2])
struct MyList 3 10 30
(gdb) python f = gdb.selected_frame(); print(f.name(), hex(f.pc()), gdb.selected_inferior().pid > 0)
main 0xaaaaaaaa0a2c True
(gdb) python print(gdb.parse_and_eval("msg").string())
hello, world
```

`gdb.Value`는 대상 프로세스 안의 값을 가리키는 핸들입니다. `v["size"]`처럼 멤버에, `v["data"][2]`처럼 포인터 인덱스에 접근하고, `.string()`으로 C 문자열을 Python 문자열로 바꿉니다. 자주 쓰는 객체는 다음과 같습니다. 각 객체의 메서드 목록은 GDB 매뉴얼 Python API 절에 있습니다.

| 객체 | 역할 |
|------|------|
| `gdb.Value` | 대상 안의 값(int/string/struct/포인터). 멤버 접근·산술·`cast()`·`dereference()` |
| `gdb.Type` | 타입 정보(크기, 필드, 가리키는 타입) |
| `gdb.Frame` | 콜스택 한 프레임(`name()`, `pc()`, `read_var()`, `older()`) |
| `gdb.Breakpoint` | breakpoint. 서브클래스의 `stop()`으로 정지 여부 결정 |
| `gdb.Inferior` | 프로세스(`pid`, `threads()`, `read_memory()`) |
| `gdb.Objfile` | 로드된 ELF 파일 |

## 첫 예 — 커스텀 명령

`gdb.Command`를 상속하면 새 명령이 생깁니다. 클래스의 docstring이 `help` 문구가 됩니다.

```python
class HelloCmd(gdb.Command):
    """간단한 인사 명령."""

    def __init__(self):
        super().__init__("hello", gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        argv = gdb.string_to_argv(arg)
        name = argv[0] if argv else "world"
        gdb.write(f"hello, {name}\n")
```

```text
(gdb) python HelloCmd()
(gdb) hello
hello, world
(gdb) hello GDB
hello, GDB
```

두 번째 인자는 `help` 분류입니다. GDB 16.3의 `gdb` 모듈에 실제로 있는 이름을 찍어 보면 다음과 같습니다.

```text
(gdb) python print([c for c in dir(gdb) if c.startswith("COMMAND_")])
['COMMAND_BREAKPOINTS', 'COMMAND_DATA', 'COMMAND_FILES', 'COMMAND_MAINTENANCE', 'COMMAND_NONE', 'COMMAND_OBSCURE', 'COMMAND_RUNNING', 'COMMAND_STACK', 'COMMAND_STATUS', 'COMMAND_SUPPORT', 'COMMAND_TRACEPOINTS', 'COMMAND_TUI', 'COMMAND_USER']
(gdb) python print([c for c in dir(gdb) if c.startswith("COMPLETE_")])
['COMPLETE_COMMAND', 'COMPLETE_EXPRESSION', 'COMPLETE_FILENAME', 'COMPLETE_LOCATION', 'COMPLETE_NONE', 'COMPLETE_SYMBOL']
```

세 번째 인자로 `COMPLETE_*` 중 하나를 주면 탭 자동 완성 방식이 정해집니다.

### Prefix 명령 (서브 명령 트리)

`prefix=True`로 만든 명령 아래에 `"my list"`처럼 이름을 붙이면 서브 명령이 됩니다. 도구가 많아지면 한 이름 아래로 묶습니다.

```python
class MyTop(gdb.Command):
    """my 도구 모음."""
    def __init__(self):
        super().__init__("my", gdb.COMMAND_USER, prefix=True)

class MySub(gdb.Command):
    """my list 서브 명령."""
    def __init__(self):
        super().__init__("my list", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        gdb.write("listing...\n")
```

```text
(gdb) my list
listing...
(gdb) help my
my 도구 모음.

List of my subcommands:

my list -- my list 서브 명령.
```

## 두 번째 예 — 자동 브레이크포인트 액션

`gdb.Breakpoint`를 상속해 `stop()`을 정의하면 breakpoint에 걸릴 때마다 Python이 실행되고, `False`를 돌려주면 멈추지 않고 계속 갑니다. 첫 인자는 ABI가 정한 레지스터에 있으므로, arm64에서는 `$x0`을 읽습니다(AAPCS64의 parameter register, [Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state) 참고). 1 MiB보다 큰 할당일 때만 멈추게 했습니다.

```python
class LogAllocs(gdb.Breakpoint):
    def __init__(self):
        super().__init__("malloc", internal=False)

    def stop(self):
        size = int(gdb.parse_and_eval("$x0"))    # AArch64 첫 인자
        if size > 1024 * 1024:
            gdb.write(f"big malloc: {size}\n")
            return True
        gdb.write(f"malloc({size})\n")
        return False
```

```text
(gdb) break main
(gdb) run
(gdb) python LogAllocs()
Breakpoint 2 at 0xfffff7e87804: malloc. (46 locations)
(gdb) continue
malloc(24)
malloc(24)
malloc(24)
malloc(64)
big malloc: 2097152

Breakpoint 2.1, __GI___libc_malloc (bytes=2097152) at ./malloc/malloc.c:3392
(gdb) bt 2
#0  __GI___libc_malloc (bytes=2097152) at ./malloc/malloc.c:3392
#1  0x0000aaaaaaaa0a34 in main () at py.c:33
```

`malloc(24)` 세 번은 트리 노드 셋, `malloc(64)`는 `small`, 2 MiB가 `big`입니다. `(46 locations)`는 GDB가 `malloc`이라는 이름의 위치를 46곳 찾아 모두에 걸었다는 표시입니다. [Ch 5](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)의 `commands` + `silent` + `printf`와 같은 일을 하지만, 조건을 Python으로 짤 수 있다는 점이 다릅니다.

### malloc 반환값을 추적하려면

반환값은 함수가 *끝날 때* 생깁니다. [GDB 매뉴얼 Finish Breakpoints in Python](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Finish-Breakpoints-in-Python.html)의 `gdb.FinishBreakpoint`는 지정한 프레임이 반환하는 자리에 임시 breakpoint를 걸고 `return_value`로 반환값을 줍니다. `malloc` 진입에서 하나씩 만들었습니다.

```python
class MallocReturn(gdb.FinishBreakpoint):
    def __init__(self, size):
        super().__init__(gdb.newest_frame(), internal=True)
        self.size = size

    def stop(self):
        gdb.write(f"malloc({self.size}) -> {int(self.return_value):#x}\n")
        return False

    def out_of_scope(self):
        gdb.write("malloc frame left without return\n")


class TraceMalloc(gdb.Breakpoint):
    def stop(self):
        MallocReturn(int(gdb.parse_and_eval("$x0")))
        return False
```

위 세션에서 `big`의 `malloc`에 멈춘 뒤 `TraceMalloc("malloc")`을 걸고 계속하자, 그 뒤에 일어난 할당 하나가 잡혔습니다. `printf`가 stdout 버퍼로 잡은 4096바이트입니다.

```text
malloc(4096) -> 0xaaaaaaac1350
```

이 코드는 `malloc` 하나만 보고, `realloc`·`calloc`이나 스레드가 여럿인 경우는 다루지 않습니다. 누수 검출이 목적이라면 [Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)나 [ASan/LSan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)을 씁니다.

## Pretty-Printer — 구조체를 사람 읽을 형태로

가장 자주 만드는 확장입니다. 원시 출력 `{x = 3, y = 4}`를 `Point(3, 4)`처럼 바꿉니다.

### 동작 원리

GDB 매뉴얼 Pretty Printing API 절에 따르면, GDB는 값을 출력할 때 등록된 printer 목록에서 그 값을 맡을 printer를 찾고, 찾으면 `to_string()`의 결과를 출력합니다. `children()`이 있으면 자식 노드를 순회하고, `display_hint()`가 있으면 그 힌트로 표시 방식을 바꿉니다. 맞는 printer가 없으면 원시 형식으로 출력합니다.

### 단순 printer

```python
class PointPrinter:
    def __init__(self, val):
        self.val = val

    def to_string(self):
        return f"Point({int(self.val['x'])}, {int(self.val['y'])})"

def build_pretty_printer():
    pp = gdb.printing.RegexpCollectionPrettyPrinter("myproject")
    pp.add_printer('Point', '^Point$', PointPrinter)
    pp.add_printer('MyList', '^MyList$', MyListPrinter)
    pp.add_printer('MyMap', '^MyMap$', MyMapPrinter)
    return pp

gdb.printing.register_pretty_printer(gdb.current_objfile(), build_pretty_printer())
```

```text
(gdb) print p
$1 = Point(3, 4)
(gdb) print/r p
$2 = {x = 3, y = 4}
(gdb) info pretty-printer
global pretty-printers:
  builtin
  myproject
    MyList
    MyMap
    Point
```

`/r`(raw)는 printer를 건너뜁니다. 매뉴얼에 따르면 `gdb.current_objfile()`은 스크립트를 auto-load하는 동안에만 해당 objfile을 돌려주고 그 밖에는 `None`입니다. `source`로 직접 읽었으므로 `None`이 넘어가 printer가 전역(`global pretty-printers`)에 등록됐습니다.

### 컬렉션 — children 추가

배열처럼 원소가 있는 타입은 `children()`이 `(이름, 값)` 쌍을 내놓습니다.

```python
class MyListPrinter:
    def __init__(self, val):
        self.val = val

    def to_string(self):
        return f"MyList of length {int(self.val['size'])}"

    def children(self):
        data = self.val['data']
        for i in range(int(self.val['size'])):
            yield f"[{i}]", data[i]

    def display_hint(self):
        return "array"
```

```text
(gdb) print list
$3 = MyList of length 3 = {10, 20, 30}
```

`display_hint`의 값은 매뉴얼 Pretty Printing API 절이 정의합니다.

| hint | 매뉴얼의 정의 |
|------|------|
| `"array"` | 배열 같은 값. CLI가 `set print elements`·`set print array`를 따름 |
| `"map"` | 맵 같은 값. 자식이 key, value 순서로 번갈아 나온다고 가정 |
| `"string"` | 문자열 같은 값. `to_string`이 Python 문자열을 돌려주면 언어별 문자열 형식으로 출력 |

### Map printer 예

`"map"` 힌트에서는 자식을 key, value, key, value 순서로 내놓습니다.

```python
class MyMapPrinter:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        return f"MyMap of {int(self.val['size'])} elements"
    def children(self):
        node = self.val['root']
        for i in range(int(self.val['size'])):
            yield f"key{i}", node['key']
            yield f"val{i}", node['value']
            node = node['next']
    def display_hint(self):
        return "map"
```

```text
(gdb) print m
$4 = MyMap of 3 elements = {[0xaaaaaaaa0ac0 "foo"] = 1, [0xaaaaaaaa0ab8 "bar"] = 2, [0xaaaaaaaa0b00 "baz"] = 3}
```

키가 `const char*`라 포인터 주소와 문자열이 함께 찍혔습니다. 키를 문자열만 보이게 하려면 `node['key'].string()`을 넘기면 됩니다.

### MI에도 그대로 반영된다

IDE는 GDB/MI로 GDB와 대화합니다. GDB 매뉴얼은 GDB/MI를 "a line based machine oriented text interface"로, 디버거를 큰 시스템의 한 부품으로 쓰는 프로그램을 위한 것이라고 설명합니다. `display_hint`는 MI 응답의 `displayhint` 필드로 나갑니다. 같은 printer를 등록하고 `gdb --interpreter=mi3`로 변수 객체를 만들었습니다.

```text
-enable-pretty-printing
^done
-var-create pv * p
^done,name="pv",numchild="0",value="Point(3, 4)",type="struct Point",thread-id="1",dynamic="1",has_more="0"
-var-create lv * list
^done,name="lv",numchild="0",value="MyList of length 3",type="struct MyList",thread-id="1",displayhint="array",dynamic="1",has_more="1"
-var-list-children lv
^done,numchild="3",displayhint="array",children=[child={name="lv.[0]",exp="[0]",numchild="0",type="int",thread-id="1"},child={name="lv.[1]",exp="[1]",numchild="0",type="int",thread-id="1"},child={name="lv.[2]",exp="[2]",numchild="0",type="int",thread-id="1"}],
```

자식 원소는 `-var-list-children`으로 따로 받습니다.

### auto-load — 라이브러리에 printer 딸려 보내기

GDB 매뉴얼 objfile-gdb.py file 절에 따르면 GDB는 새 objfile을 읽을 때 `<objfile>-gdb.py`라는 이름의 스크립트를 찾아 실행합니다. `libfoo.so` 옆에 `libfoo.so-gdb.py`를 두고 확인했습니다. 처음에는 safe-path 밖이라 거부됐고, `add-auto-load-safe-path`로 그 디렉터리를 허용하자 라이브러리가 로드될 때 스크립트가 실행됐습니다.

```text
$ gdb -q ./usefoo -ex 'break main' -ex run
warning: File "/root/ch09/lib/libfoo.so-gdb.py" auto-loading has been declined by your `auto-load safe-path' set to "$debugdir:$datadir/auto-load".
...
$ gdb -q -iex 'add-auto-load-safe-path /root/ch09/lib' ./usefoo -ex 'break main' -ex run -ex 'info auto-load python-scripts'
libfoo.so-gdb.py loaded
...
Loaded  Script
Yes     /root/ch09/lib/libfoo.so-gdb.py
```

safe-path에는 신뢰하는 디렉터리만 넣습니다. `/` 전체를 허용하면 아무 실행 파일 옆의 스크립트까지 자동으로 실행됩니다.

## libstdc++ / libc++ pretty-printer

STL printer는 대부분 직접 만들 필요가 없습니다. Debian 13에서는 GCC 패키지가 `/usr/share/gcc/python/libstdcxx/v6/printers.py`를 설치하고, [Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)에서 본 auto-load 스크립트 `libstdc++.so.6.0.33-gdb.py`가 그 디렉터리를 `sys.path`에 넣은 뒤 등록합니다.

```text
$ grep -n "register_libstdcxx_printers\|sys.path" /usr/share/gdb/auto-load/usr/lib/aarch64-linux-gnu/libstdc++.so.6.0.33-gdb.py
55:    if not dir_ in sys.path:
56:        sys.path.insert(0, dir_)
60:from libstdcxx.v6 import register_libstdcxx_printers
61:register_libstdcxx_printers(gdb.current_objfile())
$ grep -c "^class Std" /usr/share/gcc/python/libstdcxx/v6/printers.py
49
```

이 `printers.py`에는 `Std`로 시작하는 클래스가 49개 있고, `StdVectorPrinter`(520행)·`StdMapPrinter`(834행)·`StdSpanPrinter`(1906행)도 그중 하나입니다. 자동 등록이 안 되는 환경이라면 같은 두 줄을 `.gdbinit`에 직접 넣습니다.

```python
python
import sys
sys.path.insert(0, '/usr/share/gcc/python')
from libstdcxx.v6.printers import register_libstdcxx_printers
register_libstdcxx_printers(None)
end
```

LLVM의 libc++용 GDB printer는 llvm-project 저장소의 [`libcxx/utils/gdb/libcxx/printers.py`](https://github.com/llvm/llvm-project/blob/main/libcxx/utils/gdb/libcxx/printers.py)에 있습니다.

## 트리 / 그래프 시각화

복잡한 구조는 그림으로 보는 편이 빠릅니다. 트리를 따라가며 Graphviz DOT 파일을 쓰는 명령을 만들었습니다.

```python
class VizTree(gdb.Command):
    def __init__(self):
        super().__init__("viz_tree", gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        root = gdb.parse_and_eval(arg)
        with open("/root/ch09/tree.dot", "w") as f:
            f.write("digraph G {\n")
            self._walk(root, f)
            f.write("}\n")
        gdb.write("wrote /root/ch09/tree.dot\n")

    def _walk(self, node, f):
        if int(node) == 0:
            return
        f.write(f'  n{int(node)} [label="{int(node["value"])}"];\n')
        for side in ('left', 'right'):
            child = node[side]
            if int(child) != 0:
                f.write(f'  n{int(node)} -> n{int(child)};\n')
                self._walk(child, f)
```

```text
(gdb) viz_tree root
wrote /root/ch09/tree.dot
(gdb) shell cat /root/ch09/tree.dot
digraph G {
  n187649984565984 [label="2"];
  n187649984565984 -> n187649984565920;
  n187649984565920 [label="1"];
  n187649984565984 -> n187649984565952;
  n187649984565952 [label="3"];
}
```

노드 이름은 구조체의 주소(10진수)입니다. 이 파일을 `dot -Tpng tree.dot -o tree.png`로 그림으로 바꿉니다. 이 VM에는 Graphviz를 설치하지 않아 변환은 하지 않았습니다.

## Convenience function

`gdb.Function`을 상속하면 식 안에서 `$이름(...)`으로 부를 수 있는 함수가 생깁니다. GDB 안에서 계산하므로 대상 프로세스의 함수를 부르지 않습니다.

```python
class StrLen(gdb.Function):
    """문자열 길이를 반환."""

    def __init__(self):
        super().__init__("strlen2")

    def invoke(self, str_arg):
        return len(str_arg.string())
```

```text
(gdb) print $strlen2(msg)
$5 = 12
```

조건부 breakpoint에서 `break process if $strlen2(msg) > 100`처럼 쓰면, [Ch 2](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)에서 본 `strcmp` 반환 타입 문제 없이 문자열 조건을 걸 수 있습니다.

## Frame filter — 콜스택 가공

frame filter는 `bt`에 나갈 프레임을 걸러 내거나 바꿉니다. `helper` 프레임을 숨기고, 나머지 함수 이름을 `FrameDecorator`로 대문자로 바꾸는 filter를 만들었습니다.

```python
from gdb.FrameDecorator import FrameDecorator

class UpperDecorator(FrameDecorator):
    def function(self):
        name = super().function()
        return name.upper() if isinstance(name, str) else name

class HideHelper:
    def __init__(self):
        self.name = "hide-helper"
        self.priority = 100
        self.enabled = True
        gdb.frame_filters[self.name] = self

    def filter(self, frame_iter):
        for frame in frame_iter:
            if frame.function() == "helper":
                continue
            yield UpperDecorator(frame)
```

```text
(gdb) bt
#0  helper (v=12) at py.c:15
#1  0x0000aaaaaaaa08d8 in process (msg=0xaaaaaaaa0ac8 "hello, world") at py.c:16
#2  0x0000aaaaaaaa0a40 in main () at py.c:34
(gdb) python HideHelper()
(gdb) bt
#1  0x0000aaaaaaaa08d8 in PROCESS (msg=0xaaaaaaaa0ac8 "hello, world") at py.c:16
#2  0x0000aaaaaaaa0a40 in MAIN () at py.c:34
(gdb) bt -no-filters
#0  helper (v=12) at py.c:15
...
(gdb) info frame-filter
global frame-filters:
  Priority  Enabled  Name
  100       Yes      hide-helper
```

프레임 번호(#1, #2)는 원래 번호 그대로이고, `bt -no-filters`([Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)의 `bt no-filters`)로 원본을 다시 볼 수 있습니다.

## Unwinder — 콜스택 직접 풀기

GDB 매뉴얼 Unwinding Frames in Python 절에 따르면 unwinder는 현재 프레임을 자기가 처리할 수 있는지 판단하고, 처리할 수 있으면 프레임 ID와 이전 프레임의 레지스터를 돌려줍니다. 매뉴얼은 GDB의 기본 unwinder가 다루지 못하는 프레임의 예로 Java 가상 머신을 돌리는 혼합 언어 애플리케이션을 듭니다. 이 장에서는 그런 대상이 없어 unwinder를 작성해 돌리지 않았습니다.

## Event 훅

`gdb.events`에 함수를 연결하면 정지·종료·objfile 로드 같은 사건마다 불립니다.

```python
def on_stop(event):
    print(f"stopped at {gdb.selected_frame().name()}")

def on_exit(event):
    print(f"exit code {getattr(event, 'exit_code', None)}")

def on_new_obj(event):
    print(f"loaded {event.new_objfile.filename}")

gdb.events.stop.connect(on_stop)
gdb.events.exited.connect(on_exit)
gdb.events.new_objfile.connect(on_new_obj)
```

```text
(gdb) source events.py
(gdb) break helper
(gdb) run
loaded /usr/lib/debug/.build-id/d7/be73c7b2bf2531fb3e11318f0949141af7063a.debug
loaded /lib/ld-linux-aarch64.so.1
loaded system-supplied DSO at 0xfffff7ffa000
loaded /usr/lib/debug/.build-id/5f/3926d9963ff284b8173bf3601bbb00c3abad16.debug
loaded /lib/aarch64-linux-gnu/libc.so.6

Breakpoint 1, helper (v=12) at py.c:15
stopped at helper
(gdb) continue
...
[Inferior 1 (process 2394) exited with code 02]
exit code 2
```

`new_objfile`은 공유 라이브러리뿐 아니라 build-id 경로에서 찾은 별도 디버그 파일에도 불렸습니다. 특정 라이브러리가 로드되는 순간에 breakpoint를 거는 자동화에 이 훅을 씁니다.

## LLDB의 Python — 다른 API

LLDB의 Python API는 `SB`(Scripting Bridge)로 시작하는 클래스로 이루어집니다([LLDB SB API 문서](https://lldb.llvm.org/resources/sbapi.html)). `script` 안에서는 `lldb.frame`, `lldb.process` 같은 편의 변수가 현재 상태를 가리킵니다.

```text
(lldb) script print(lldb.frame.GetFunctionName(), lldb.process.GetSelectedThread().GetIndexID())
main 1
(lldb) script print(lldb.frame.EvaluateExpression("p.x + p.y"))
(int) $0 = 7
(lldb) script lldb.debugger.HandleCommand("bt 1")
* thread #1, name = 'py', stop reason = breakpoint 1.1
    frame #0: 0x0000aaaaaaaa0a2c py`main at py.c:33:17
```

| GDB | LLDB |
|-----|------|
| `gdb.Value` | `lldb.SBValue` |
| `gdb.Type` | `lldb.SBType` |
| `gdb.Frame` | `lldb.SBFrame` |
| `gdb.Inferior` | `lldb.SBProcess` |
| `gdb.parse_and_eval(...)` | `frame.EvaluateExpression(...)` |
| `gdb.execute(...)` | `lldb.debugger.HandleCommand(...)` |

### LLDB 커스텀 명령과 formatter

LLDB에서는 모듈의 `__lldb_init_module`이 `command script import` 때 불립니다. 명령 하나와, GDB pretty-printer에 해당하는 summary(한 줄 요약)·synthetic(자식 목록) provider를 한 파일에 넣었습니다.

```python
import lldb

def hello(debugger, command, result, internal_dict):
    result.PutCString(f"hello, {command or 'world'}")

def Point_SummaryProvider(valobj, internal_dict):
    x = valobj.GetChildMemberWithName('x').GetValueAsSigned()
    y = valobj.GetChildMemberWithName('y').GetValueAsSigned()
    return f"Point({x}, {y})"

class MyListProvider:
    def __init__(self, valobj, dict):
        self.valobj = valobj
    def num_children(self):
        return self.valobj.GetChildMemberWithName('size').GetValueAsUnsigned()
    def get_child_at_index(self, idx):
        data = self.valobj.GetChildMemberWithName('data')
        return data.CreateChildAtOffset(f"[{idx}]", idx * 4, data.GetType().GetPointeeType())
    def update(self):
        pass

def __lldb_init_module(debugger, internal_dict):
    debugger.HandleCommand('command script add -f my_cmds.hello hello')
    debugger.HandleCommand('type summary add -F my_cmds.Point_SummaryProvider Point')
    debugger.HandleCommand('type synthetic add -l my_cmds.MyListProvider MyList')
```

```text
(lldb) command script import /root/ch09/my_cmds.py
(lldb) hello LLDB
hello, LLDB
(lldb) frame variable p list
(Point) p = Point(3, 4)
(MyList) list = ([0] = 10, [1] = 20, [2] = 30)
```

GDB는 한 printer 클래스가 `to_string`과 `children`을 함께 갖지만, LLDB는 요약(`type summary`)과 자식 트리(`type synthetic`)를 따로 등록합니다.

### 외부 스크립트에서 LLDB 제어하기

LLDB는 `lldb` 모듈을 일반 Python에서 import해 디버거 자체를 스크립트로 만들 수 있습니다. 아래는 breakpoint를 걸고 실행해 변수를 읽는 스크립트입니다.

```python
#!/usr/bin/env python3
import lldb

debugger = lldb.SBDebugger.Create()
debugger.SetAsync(False)
target = debugger.CreateTarget('./hello')
bp = target.BreakpointCreateByName('factorial')
process = target.LaunchSimple(None, None, '.')
frame = process.GetSelectedThread().GetSelectedFrame()
print(frame)
print(frame.FindVariable('n'))
print(process.GetState() == lldb.eStateStopped, bp.GetHitCount())
process.Kill()
```

macOS에서는 `lldb -P`가 알려 주는 경로를 `PYTHONPATH`에 넣고 Xcode의 Python(3.9.6)으로 실행해 동작했습니다. 실행 파일은 [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)의 `hello`입니다.

```text
$ PYTHONPATH=$(lldb -P) xcrun python3 drive_lldb.py
frame #0: 0x0000000100000470 hello`factorial(n=5) at hello.c:5:9
(int) n = 5
True 1
```

같은 스크립트가 Debian 13에서는 돌지 않았습니다. `lldb -P`가 가리키는 `/usr/lib/llvm-19/lib/python3.13/site-packages/lldb/_lldb.cpython-313-aarch64-linux-gnu.so`가 존재하지 않는 `../../../liblldb.so`를 가리켜 `ImportError: cannot import name '_lldb'`가 났고, `python3-lldb-19`를 설치한 상태였습니다. GDB의 `gdb` 모듈은 GDB 프로세스 안에서만 쓸 수 있으므로, GDB를 외부에서 제어할 때는 이런 방식 대신 GDB/MI나 `gdb -batch`를 씁니다.

## 실전 — .gdbinit 한 페이지

위에서 확인한 설정을 모으면 다음과 같습니다. libstdc++ 경로는 Debian 13 기준입니다.

```python
# ~/.gdbinit
set history save on
set history filename ~/.gdb_history
set history size 10000
set print pretty on
set print object on
set pagination off

python
import sys
sys.path.insert(0, '/usr/share/gcc/python')
from libstdcxx.v6.printers import register_libstdcxx_printers
register_libstdcxx_printers(None)

# 내 프로젝트 printer
sys.path.insert(0, '/home/me/myproj/gdb')
import myproj_printers
myproj_printers.register_all()
end
```

`myproj_printers`는 위 `build_pretty_printer()` 같은 등록 함수를 담은 각자의 모듈 이름입니다.

## 자주 쓰는 패턴

1. **할당 추적** — `malloc`에 `gdb.Breakpoint` 서브클래스 + `FinishBreakpoint`로 크기와 반환 주소를 기록합니다.
2. **테스트 자동화** — `gdb -batch -ex "source script.py"`로 헤드리스 실행합니다. 이 장의 세션이 모두 이 방식입니다.
3. **회귀 검증** — `parse_and_eval`로 변수 값을 읽어 기대값과 비교하고, 다르면 `gdb.write`로 남깁니다.
4. **사후 분석** — core를 열고 Python으로 자료구조를 순회해 요약을 파일로 남깁니다([Ch 7](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)).

## 디버깅 자체의 디버깅

Python 스크립트가 실패하면 기본값에서는 예외 메시지만 나옵니다. `set python print-stack full`을 켜면 traceback이 나옵니다.

```text
(gdb) python 1/0
Python Exception <class 'ZeroDivisionError'>: division by zero
Error occurred in Python: division by zero
(gdb) set python print-stack full
(gdb) python 1/0
Traceback (most recent call last):
  File "<string>", line 1, in <module>
ZeroDivisionError: division by zero
Error occurred in Python: division by zero
```

## 정리

- `python ... end` / `source` / `.gdbinit`로 Python을 씁니다. Debian 13 GDB 16.3의 내장 Python은 3.13.5였습니다.
- `gdb.Value`·`Frame`·`Inferior`가 핵심 객체입니다.
- `gdb.Command`로 새 명령을, `prefix=True`로 명령 트리를 만듭니다.
- `gdb.Breakpoint.stop()`이 `False`를 돌려주면 멈추지 않습니다. 반환값은 `gdb.FinishBreakpoint`로 받습니다.
- pretty-printer는 `to_string` + `children` + `display_hint`이고, `displayhint`는 MI 응답에도 그대로 실립니다.
- `<objfile>-gdb.py`는 safe-path 안에 있을 때만 자동 실행됩니다.
- frame filter는 `bt`의 프레임을 숨기거나 바꾸고, `bt -no-filters`로 원본을 봅니다.
- LLDB는 SB API를 쓰고 summary·synthetic을 따로 등록합니다. 외부 Python 제어는 macOS에서 동작했고 Debian 13 패키지에서는 import가 실패했습니다.

## 다음 장 예고

[Ch 10: TUI와 프런트엔드](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends)는 터미널 UI, cgdb, gdb-dashboard, VS Code·Neovim의 DAP를 다룹니다. 이 장의 pretty-printer와 MI가 그 프런트엔드들 밑에서 어떻게 쓰이는지 이어서 봅니다.

## 관련 항목

- [Ch 5: 브레이크포인트와 워치포인트](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints) — Python stop hook
- [Ch 10: TUI / 프런트엔드](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends) — DAP가 MI/Python을 활용
- [Ch 12: DWARF](/blog/tools/debugging/gdb-lldb/chapter12-dwarf) — pyelftools와 함께
- [GDB Python API 공식 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Python-API.html)
- [LLDB Python API](https://lldb.llvm.org/python_reference/index.html)
- [GDB/MI 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI.html)
- [libstdc++ pretty-printers 소스](https://gcc.gnu.org/git/?p=gcc.git;a=tree;f=libstdc%2B%2B-v3/python)
