---
title: "GDB·LLDB Python 스크립팅 — Pretty-Printer·Custom Command"
date: 2026-05-24T09:09:00
description: "GDB / LLDB Python API. pretty-printer 작성, 커스텀 명령, 자동화, MI."
tags: [gdb, lldb, Python, Scripting]
series: "GDB and LLDB"
seriesOrder: 9
draft: false
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [GDB Extension and IDE 시리즈](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)를 참고하세요 — Python API 깊이, pretty-printer 메커니즘, FrameDecorator/Unwinder, MI/DAP.
:::


GDB와 LLDB 모두 Python 인터프리터를 내장합니다. 단순한 매크로는 GDB의 user-defined command로도 되지만, *데이터 구조 시각화*나 *조건이 복잡한 자동화*에는 Python이 거의 유일한 답입니다. STL 컨테이너가 `vector<int>{1, 2, 3}`처럼 깔끔히 보이는 것도 모두 pretty-printer 덕입니다.

이 장은 GDB Python API의 핵심 객체에서 출발해 *어떻게 pretty-printer가 동작하는지*, *MI 프런트엔드(VSCode 등)가 어떻게 트리를 그리는지*, *FrameDecorator로 콜스택을 변형*, 그리고 LLDB의 SB API까지 다룹니다.

## 시작 — 한 줄 Python

```text
(gdb) python print("hello from gdb")
hello from gdb

(gdb) python
>import os
>print(os.getpid())
>end
12345

(gdb) source script.py
```

`python ... end`로 여러 줄, `python <expr>`로 한 줄. 외부 파일은 `source`. `.gdbinit`에 자동 로드되게 박아 둘 수 있습니다.

GDB가 *내장한* Python의 버전은 GDB 빌드 시점의 옵션입니다. `python print(sys.version)`으로 확인. 보통 Python 3.6+. 대부분의 표준 라이브러리는 쓸 수 있지만, *외부 시스템* Python의 venv·third-party 패키지는 별도 설정이 필요합니다.

```python
(gdb) python
>>> import sys
>>> sys.path.insert(0, '/home/me/venv/lib/python3.10/site-packages')
>>> import numpy   # 이제 외부 패키지 사용 가능
```

LLDB는 `script`.

```text
(lldb) script print("hello")
(lldb) command script import my_module.py
```

LLDB는 `lldb` 모듈을 직접 import해 외부 스크립트로도 디버거를 *원격* 제어 가능합니다 (스크립트가 lldb 인스턴스를 생성).

## gdb 모듈 — 진입점

```python
import gdb

gdb.execute("info threads")              # 명령 실행
val = gdb.parse_and_eval("my_var + 1")   # 표현식 평가
print(val, type(val))                    # gdb.Value, gdb.Type

frame = gdb.selected_frame()             # 현재 프레임
print(frame.name(), frame.pc())

inferior = gdb.selected_inferior()
print(inferior.pid)
```

핵심 객체.

| 객체 | 역할 | 주요 메서드 |
|------|------|-------------|
| `gdb.Value` | 디버기 안의 값(int/string/struct/포인터) | `int()`, `string()`, `[key]`, `cast()`, `dereference()` |
| `gdb.Type` | 타입 정보(size, fields, target) | `sizeof`, `fields()`, `target()`, `tag` |
| `gdb.Frame` | 콜스택 한 프레임 | `name()`, `pc()`, `function()`, `read_var()`, `older()`, `newer()` |
| `gdb.Symbol` | 변수·함수 심볼 | `name`, `type`, `value()`, `is_function`, `addr_class` |
| `gdb.Breakpoint` | 브레이크포인트 (subclass로 stop hook 구현) | `stop()`, `enabled`, `condition`, `commands` |
| `gdb.Inferior` | 프로세스 | `pid`, `threads()`, `read_memory()`, `write_memory()`, `search_memory()` |
| `gdb.Thread` | 스레드 | `switch()`, `is_stopped()`, `is_running()` |
| `gdb.Objfile` | 로드된 ELF 파일 | `filename`, `build_id`, `progspace` |

`gdb.Value`가 가장 자주 다루는 객체입니다. 내부적으로 *디버기 메모리의 한 영역을 가리키는 핸들*. 산술 연산도 가능.

```python
v = gdb.parse_and_eval("my_array")        # gdb.Value
length = v['length']                       # 멤버 접근
data = v['data']                           # 포인터
first = data.dereference()                 # *data
nth = data[5]                              # data[5]
sliced = data[0:10]                        # 슬라이스 (10개)

# Python 타입으로 변환
n = int(v['count'])
s = v['name'].string()                     # C string
```

## 첫 예 — 커스텀 명령

이름 그대로 GDB의 새 명령을 Python으로 정의합니다.

```python
# myhello.py
import gdb

class HelloCmd(gdb.Command):
    """간단한 인사 명령."""

    def __init__(self):
        super().__init__("hello", gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        argv = gdb.string_to_argv(arg)
        name = argv[0] if argv else "world"
        gdb.write(f"hello, {name}\n")

HelloCmd()
```

```text
(gdb) source myhello.py
(gdb) hello
hello, world
(gdb) hello GDB
hello, GDB
```

`gdb.COMMAND_*` 카테고리: `BREAKPOINTS`, `DATA`, `STACK`, `RUNNING`, `USER`, `SUPPORT`. 사용자에게 `help <cat>`로 분류해 보여 줍니다.

### 자동 완성

```python
class MyCmd(gdb.Command):
    def __init__(self):
        super().__init__("mycmd", gdb.COMMAND_USER, gdb.COMPLETE_SYMBOL)

    def invoke(self, arg, from_tty):
        ...
```

`COMPLETE_SYMBOL` / `COMPLETE_LOCATION` / `COMPLETE_FILENAME` / `COMPLETE_COMMAND` 중 하나. 탭으로 자동 완성됩니다.

### Prefix 명령 (서브 명령 트리)

```python
class MyTop(gdb.Command):
    def __init__(self):
        super().__init__("my", gdb.COMMAND_USER, prefix=True)
    def invoke(self, arg, from_tty):
        gdb.execute("help my")    # 인자 없으면 도움말

class MySub(gdb.Command):
    def __init__(self):
        super().__init__("my list", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        gdb.write("listing...\n")

MyTop(); MySub()
```

`my list` 형태로 호출. 큰 도구 모음을 `my <sub>` 트리로 묶으면 깔끔합니다.

## 두 번째 예 — 자동 브레이크포인트 액션

브레이크포인트가 잡힐 때마다 Python으로 처리.

```python
import gdb

class LogAllocs(gdb.Breakpoint):
    def __init__(self):
        super().__init__("malloc")

    def stop(self):
        size = gdb.parse_and_eval("$rdi")   # x86-64 첫 인자
        gdb.write(f"malloc({size})\n")
        return False                         # False = 정지하지 말고 계속

LogAllocs()
```

`stop`이 `False`를 반환하면 사용자에게 제어가 안 넘어가고 자동으로 continue. Ch 5의 `commands silent`+`printf`와 같은 효과지만 *Python으로 조건을 만들 수 있습니다*.

```python
def stop(self):
    size = int(gdb.parse_and_eval("$rdi"))
    if size > 1024 * 1024:
        gdb.write(f"big malloc: {size}\n")
        # 콜스택까지
        gdb.execute("bt 5")
        return True  # 큰 할당만 정지
    return False
```

### 종합 — 메모리 누수 추적

malloc/free의 짝을 카운트해 어디서 새는지 추적.

```python
import gdb
from collections import defaultdict

class MallocTrack(gdb.Breakpoint):
    def __init__(self, table):
        super().__init__("malloc")
        self.table = table

    def stop(self):
        size = int(gdb.parse_and_eval("$rdi"))
        # 콜스택 해시
        frame = gdb.selected_frame()
        callstack = []
        for _ in range(5):
            frame = frame.older()
            if not frame: break
            callstack.append(frame.name() or '??')
        key = tuple(callstack)

        # 다음 step에서 반환값(rax) 기록
        gdb.events.stop.connect(lambda e: self._record(e, size, key))
        return False

    def _record(self, e, size, key):
        ret = int(gdb.parse_and_eval("$rax"))
        self.table[ret] = (size, key)

class FreeTrack(gdb.Breakpoint):
    def __init__(self, table):
        super().__init__("free")
        self.table = table
    def stop(self):
        addr = int(gdb.parse_and_eval("$rdi"))
        self.table.pop(addr, None)
        return False

table = {}
MallocTrack(table); FreeTrack(table)

# 프로그램 종료 시 누수 출력
def dump(_evt):
    by_stack = defaultdict(lambda: [0, 0])
    for addr, (size, stack) in table.items():
        by_stack[stack][0] += size
        by_stack[stack][1] += 1
    for stack, (size, n) in sorted(by_stack.items(), key=lambda x: -x[1][0])[:20]:
        print(f"{size:>10} bytes / {n:>6} blocks @ {' -> '.join(stack)}")

gdb.events.exited.connect(dump)
```

ASan보다 거칠지만 *원리*가 보이는 미니 누수 추적기. 실제로는 `valgrind`나 ASan이 훨씬 견고합니다.

## Pretty-Printer — 구조체를 사람 읽을 형태로

가장 자주 만들어지는 확장. `std::vector<int>` 같은 STL 컨테이너가 멤버 변수의 원시 형태가 아니라 `{1, 2, 3, 4, 5}`로 보이는 이유입니다.

### 동작 원리

GDB가 `print v`를 받으면.

1. `v`의 타입을 알아냄 (`gdb.Value.type`).
2. 등록된 pretty-printer 중 *이 타입 이름이 매칭*되는 게 있는지 확인 (regex).
3. 매칭되면 그 클래스 인스턴스를 만들어 `to_string()` 호출. 결과를 출력.
4. `children()` 메서드가 있으면 자식 노드 순회.
5. `display_hint()`가 있으면 그 힌트(`"array"`, `"map"`, `"string"`)로 표시 방식 결정.

매칭이 없으면 원시 출력(`{x = 3, y = 4}`).

### 단순 printer

```python
import gdb
import gdb.printing

class MyPointPrinter:
    """struct Point { int x, y; } 용 pretty-printer."""

    def __init__(self, val):
        self.val = val

    def to_string(self):
        x = int(self.val['x'])
        y = int(self.val['y'])
        return f"Point({x}, {y})"

def build_pretty_printer():
    pp = gdb.printing.RegexpCollectionPrettyPrinter("myproject")
    pp.add_printer('Point', '^Point$', MyPointPrinter)
    return pp

gdb.printing.register_pretty_printer(
    gdb.current_objfile(),
    build_pretty_printer())
```

이제 `print` 했을 때:

```text
(gdb) print p
$1 = Point(3, 4)
```

원시 형태로 보고 싶으면 `/r`.

```text
(gdb) print /r p
$2 = {x = 3, y = 4}
```

### 컬렉션 — children 추가

벡터·맵 같은 시퀀스는 `children()` 메서드로 원소를 표현합니다.

```python
class MyListPrinter:
    def __init__(self, val):
        self.val = val

    def to_string(self):
        size = int(self.val['size'])
        return f"MyList of length {size}"

    def children(self):
        size = int(self.val['size'])
        data = self.val['data']
        for i in range(size):
            yield f"[{i}]", data[i]

    def display_hint(self):
        return "array"
```

`display_hint`는 GDB에게 표시 방식을 알림.

| hint | 표시 |
|------|------|
| `"array"` | `[0] = .., [1] = ..` 인덱스 형식 |
| `"map"` | `[key] = value` 쌍 (children이 key, value 교대 emit) |
| `"string"` | 따옴표 + 이스케이프 |

MI(머신 인터페이스) 프런트엔드(VSCode 등)가 이 힌트를 이용해 트리 위젯을 그립니다.

### Map printer 예

```python
class MyMapPrinter:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        return f"MyMap of {int(self.val['size'])} elements"
    def children(self):
        # children이 (key0, value0, key1, value1, ...) 순서로 emit
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
$1 = MyMap of 3 elements = {
  ["foo"] = 1,
  ["bar"] = 2,
  ["baz"] = 3
}
```

### auto-load — 빌드 시 자동 적용

`libfoo.so`마다 `libfoo.so-gdb.py`가 같이 설치돼 있으면 GDB가 *그 라이브러리를 로드할 때* 자동으로 그 스크립트를 실행합니다 — pretty-printer가 *자동 등록*.

```bash
# 라이브러리와 같은 디렉터리에 두기
/usr/lib/libfoo.so
/usr/lib/libfoo.so-gdb.py    # 라이브러리 로드 시 source됨
```

배포 시 라이브러리에 따라가는 pretty-printer를 *번들*로 제공하는 표준 방법. libstdc++의 STL printer가 이런 식으로 배포됩니다.

```text
(gdb) set auto-load safe-path /
```

보안상 *알려진 경로*만 auto-load가 허용. 신뢰하는 환경에선 `/`로 풀어 둡니다.

## libstdc++ / libc++ pretty-printer

이미 만들어진 것을 받아 쓰는 게 보통입니다.

```bash
# libstdc++ (GCC 소스에 포함)
$ git clone https://gcc.gnu.org/git/gcc.git
$ ls gcc/libstdc++-v3/python/libstdcxx/v6/printers.py
```

`~/.gdbinit`에 등록.

```python
python
import sys
sys.path.insert(0, '/path/to/libstdcxx/python')
from libstdcxx.v6.printers import register_libstdcxx_printers
register_libstdcxx_printers(None)
end
```

대부분의 배포판은 GDB 패키지가 자동으로 등록합니다. macOS의 `libc++`는 LLVM 소스의 `utils/gdb/libcxx/printers.py`.

이 패키지 안에 `StdVectorPrinter`, `StdMapPrinter`, `StdStringPrinter` 등 STL의 거의 모든 컨테이너 printer가 있습니다. 새 컨테이너가 추가될 때마다 (`std::span`, `std::flat_map`) 같이 갱신됩니다.

## 트리 / 그래프 시각화

복잡한 구조는 그래프뷰가 가장 빠릅니다. `gdb.Command`로 `viz` 같은 명령을 만들어 자료구조를 DOT으로 출력하면 외부 graphviz로 PNG 변환.

```python
import gdb

class VizTree(gdb.Command):
    def __init__(self):
        super().__init__("viz_tree", gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        root = gdb.parse_and_eval(arg)
        with open("/tmp/tree.dot", "w") as f:
            f.write("digraph G {\n")
            self._walk(root, f)
            f.write("}\n")
        gdb.write("wrote /tmp/tree.dot\n")

    def _walk(self, node, f):
        if int(node) == 0:
            return
        val = int(node['value'])
        f.write(f'  n{int(node)} [label="{val}"];\n')
        for side in ('left', 'right'):
            child = node[side]
            if int(child) != 0:
                f.write(f'  n{int(node)} -> n{int(child)};\n')
                self._walk(child, f)

VizTree()
```

```text
(gdb) viz_tree root
wrote /tmp/tree.dot
$ dot -Tpng /tmp/tree.dot > tree.png
```

링크드 리스트·해시 테이블·트리·그래프 — 모두 같은 패턴. 큰 자료구조 디버깅에서 시각화는 *콘솔 출력*과 비교가 안 됩니다.

## Convenience function

`$<name>(...)` 형태로 식 안에서 부를 수 있는 함수.

```python
import gdb

class StrLen(gdb.Function):
    """문자열 길이를 반환."""

    def __init__(self):
        super().__init__("strlen2")

    def invoke(self, str_arg):
        s = str_arg.string()
        return len(s)

StrLen()
```

```text
(gdb) print $strlen2(msg)
$1 = 12
```

조건부 BP에 쓰면 매우 강력합니다.

```text
(gdb) break process if $strlen2(msg) > 100
```

## Frame filter — 콜스택 가공

특정 라이브러리 프레임을 숨기거나 합치고 싶을 때. 비동기 코드(future/coroutine)의 콜스택을 *의미 있는 단위*로 묶을 때 자주 씁니다.

```python
class SkipBoostFilter:
    def __init__(self):
        self.name = "skip-boost"
        self.priority = 100
        self.enabled = True
        gdb.frame_filters[self.name] = self

    def filter(self, frame_iter):
        for frame in frame_iter:
            name = frame.function() or ""
            if "boost::" not in name:
                yield frame

SkipBoostFilter()
```

### FrameDecorator — 프레임을 *변형*

원본 프레임을 감싸 `function()`, `address()`, `frame_args()` 등을 가로채 다른 값을 반환할 수 있습니다.

```python
from gdb.FrameDecorator import FrameDecorator

class FoldedCoroFrame(FrameDecorator):
    def __init__(self, frame, inner_frames):
        super().__init__(frame)
        self.inner = inner_frames

    def function(self):
        # 코루틴 awaiter 체인을 한 줄로
        names = [f.function() or '??' for f in self.inner]
        return ' → '.join(names)
```

`std::coroutine`이나 `boost::asio`의 깊은 콜스택을 *논리적 한 단계*로 압축하는 데 유용. Stripe·Bloomberg 같은 대형 C++ 환경의 디버깅 인프라가 이런 식으로 비대한 콜스택을 다듬습니다.

## Unwinder — 콜스택 직접 풀기

DWARF로 풀리지 않는 특수 frame이 있으면 (예: JIT 코드, 인터프리터) Python으로 직접 unwinder를 제공.

```python
class JitUnwinder(gdb.unwinder.Unwinder):
    def __init__(self):
        super().__init__("jit-unwinder")
    def __call__(self, pending_frame):
        pc = pending_frame.read_register("pc")
        if not in_jit_region(int(pc)):
            return None
        # JIT 사이드 테이블에서 frame 정보 추출
        next_pc = lookup_jit_frame(int(pc))
        sp = pending_frame.read_register("sp")
        unwind_info = pending_frame.create_unwind_info(...)
        unwind_info.add_saved_register("pc", next_pc)
        return unwind_info

gdb.unwinder.register_unwinder(None, JitUnwinder(), replace=False)
```

V8, HotSpot JVM 같은 환경의 디버깅 지원이 이 메커니즘 위에 만들어집니다.

## Event 훅

```python
def on_stop(event):
    print(f"stopped at {gdb.selected_frame().name()}")

def on_exit(event):
    print(f"exit code {event.exit_code}")

def on_new_obj(event):
    print(f"loaded {event.new_objfile.filename}")

gdb.events.stop.connect(on_stop)
gdb.events.exited.connect(on_exit)
gdb.events.new_objfile.connect(on_new_obj)
```

특정 라이브러리가 로드되는 순간 자동으로 BP를 설치하거나, 매 정지 시 콜스택을 외부 파일로 떨어뜨리는 등의 자동화.

## MI — 머신 인터페이스 (IDE 통합)

VSCode·Emacs gud·DDD 같은 프런트엔드는 *MI* (Machine Interface) 프로토콜로 GDB와 통신합니다. CLI 출력 대신 *구조화된 명령·응답*.

```text
(gdb) -exec-run
^running
(gdb) -break-insert main
^done,bkpt={number="1",type="breakpoint",addr="0x...",func="main",...}
```

Python pretty-printer는 *MI 출력에도 반영*됩니다 — VSCode의 변수 패널이 트리로 보이는 이유. `display_hint`의 `"array"`/`"map"`이 MI 응답에 포함돼 IDE가 트리를 그립니다.

직접 MI를 다룰 일은 거의 없지만, IDE 디버깅이 *왜* 그렇게 보이는지의 답은 여기 있습니다.

## LLDB의 Python — 다른 API

LLDB도 Python 내장이지만 API가 다릅니다.

```text
(lldb) script
>>> target = lldb.debugger.GetSelectedTarget()
>>> process = target.GetProcess()
>>> thread = process.GetSelectedThread()
>>> frame = thread.GetSelectedFrame()
>>> print(frame.GetFunctionName())
```

핵심 클래스가 `SBTarget`, `SBProcess`, `SBThread`, `SBFrame`, `SBValue`. *SB*는 "Scripted Bridge". 모두 `lldb` 모듈에 있습니다.

| GDB | LLDB |
|-----|------|
| `gdb.Value` | `lldb.SBValue` |
| `gdb.Type` | `lldb.SBType` |
| `gdb.Frame` | `lldb.SBFrame` |
| `gdb.Inferior` | `lldb.SBProcess` |
| `gdb.parse_and_eval(...)` | `frame.EvaluateExpression(...)` |
| `gdb.execute(...)` | `lldb.debugger.HandleCommand(...)` |

### LLDB 커스텀 명령

```python
import lldb

def hello(debugger, command, result, internal_dict):
    result.PutCString(f"hello, {command or 'world'}")

def __lldb_init_module(debugger, internal_dict):
    debugger.HandleCommand('command script add -f my_cmds.hello hello')
```

```text
(lldb) command script import my_cmds.py
(lldb) hello LLDB
hello, LLDB
```

### LLDB pretty-printer

`type summary`와 `type synthetic`이 GDB의 pretty-printer 역할.

```python
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
        return data.GetChildAtIndex(idx, lldb.eNoDynamicValues, True)
    def update(self):
        pass
```

```text
(lldb) type summary add -F my_mod.Point_SummaryProvider Point
(lldb) type synthetic add -l my_mod.MyListProvider MyList
```

GDB보다 *summary*와 *synthetic*이 분리돼 있어 한 줄 표시(summary)와 자식 트리(synthetic)를 따로 정의합니다.

### LLDB의 platform 추상화

LLDB의 진짜 매력은 *외부 스크립트에서 디버거를 제어*할 수 있다는 점입니다.

```python
#!/usr/bin/env python
import lldb

debugger = lldb.SBDebugger.Create()
target = debugger.CreateTarget('./my_prog')
target.BreakpointCreateByName('main')
process = target.LaunchSimple(None, None, '.')
print(process.GetSelectedThread().GetSelectedFrame())
```

CI에서 자동 디버깅, 자체 디버거 UI, 테스트 자동화 — 모두 가능합니다. GDB도 `gdb.execute("python ...")`로 비슷한 일이 되지만 LLDB가 더 깔끔.

## 실전 — .gdbinit 한 페이지

자주 쓰는 셋업을 모아 두면 모든 세션에 자동 적용.

```python
# ~/.gdbinit
set history save on
set history filename ~/.gdb_history
set history size 10000
set print pretty on
set print object on
set pagination off

# 색깔
set style sources on

python
import sys
sys.path.insert(0, '/usr/share/gcc-13/python')
from libstdcxx.v6.printers import register_libstdcxx_printers
register_libstdcxx_printers(None)

# 내 프로젝트 printer
sys.path.insert(0, '/home/me/myproj/gdb')
import myproj_printers
myproj_printers.register_all()

# 이벤트 훅
def on_new_obj(event):
    name = event.new_objfile.filename
    if 'mylib.so' in name:
        gdb.execute('source /opt/mylib-gdb-helpers.py')
gdb.events.new_objfile.connect(on_new_obj)
end
```

## 자주 쓰는 패턴

1. **메모리 누수 추적** — `malloc`/`free`에 Python 브레이크 + 카운터 집계.
2. **무한 루프 진단** — 1초마다 `info threads` 출력하는 백그라운드 Python.
3. **테스트 자동화** — `gdb -batch -ex "source script.py"`로 헤드리스 실행.
4. **회귀 검증** — `parse_and_eval`로 변수 값 비교, 차이가 있으면 `gdb.write`.
5. **JIT 디버깅** — Custom unwinder + 사이드 테이블 lookup.
6. **포렌식** — 콜스택을 Sentry/Datadog 등 외부로 전송.

## 디버깅 자체의 디버깅

Python 스크립트가 *조용히 실패*하면.

```text
(gdb) set python print-stack full
```

이후 모든 Python 예외의 콜스택이 표시됩니다. 사용자 명령 안에서 `try/except`로 명시적으로 잡는 것도 좋은 습관.

## 정리

- `python ... end` / `source` / `.gdbinit`에서 자동 로드.
- `gdb.Value`/`Type`/`Frame`이 핵심 객체.
- `gdb.Command` 서브클래스로 새 명령, prefix로 트리 구성.
- `gdb.Breakpoint.stop`으로 자동 처리(False면 정지하지 않고 continue).
- pretty-printer = 구조체를 사람 읽을 형태로. `to_string`+`children`+`display_hint`.
- `display_hint`의 `array`/`map`/`string`이 MI를 거쳐 IDE 트리로.
- auto-load (`libfoo.so-gdb.py`)로 라이브러리 따라가는 printer 배포.
- libstdc++/libc++ printer는 GCC/LLVM 소스에 있다.
- FrameDecorator·Unwinder로 콜스택 변형·JIT 지원.
- LLDB는 SB API — 외부 스크립트로 디버거 제어 가능.

## 다음 장 예고

Ch 10 — TUI와 프런트엔드. 터미널 UI, cgdb, gdb-dashboard, VSCode/Neovim DAP. 평소 작업 환경을 GDB와 어떻게 연결하나.

## 관련 항목

- [Ch 5: 브레이크포인트와 워치포인트](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints) — Python stop hook
- [Ch 10: TUI / 프런트엔드](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends) — DAP가 MI/Python을 활용
- [Ch 12: DWARF](/blog/tools/debugging/gdb-lldb/chapter12-dwarf) — pyelftools와 함께
- [GDB Python API 공식 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Python-API.html)
- [LLDB Python API](https://lldb.llvm.org/python_reference/index.html)
- [GDB/MI 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI.html)
- [libstdc++ pretty-printers 소스](https://gcc.gnu.org/git/?p=gcc.git;a=tree;f=libstdc%2B%2B-v3/python)
