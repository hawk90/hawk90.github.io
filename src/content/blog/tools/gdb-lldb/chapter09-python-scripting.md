---
title: "Ch 9: Python 스크립팅"
date: 2025-08-20T09:00:00
description: "GDB / LLDB Python API. pretty-printer 작성, 커스텀 명령, 자동화."
tags: [gdb, lldb, Python, Scripting]
series: "GDB and LLDB"
seriesOrder: 9
draft: false
---

GDB와 LLDB 모두 Python 인터프리터를 내장합니다. 단순한 매크로는 GDB의 user-defined command로도 되지만, *데이터 구조 시각화*나 *조건이 복잡한 자동화*에는 Python이 거의 유일한 답입니다. STL 컨테이너가 `vector<int>{1, 2, 3}`처럼 깔끔히 보이는 것도 모두 pretty-printer 덕입니다.

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

LLDB는 `script`.

```text
(lldb) script print("hello")
(lldb) command script import my_module.py
```

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

| 객체 | 역할 |
|------|------|
| `gdb.Value` | 디버기 안의 값(int/string/struct/포인터) |
| `gdb.Type` | 타입 정보(size, fields, target) |
| `gdb.Frame` | 콜스택 한 프레임 |
| `gdb.Symbol` | 변수·함수 심볼 |
| `gdb.Breakpoint` | 브레이크포인트 (subclass로 stop hook 구현) |
| `gdb.Inferior` | 프로세스 |

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

`gdb.COMMAND_*` 카테고리: `BREAKPOINTS`, `DATA`, `STACK`, `RUNNING`, `USER`, `SUPPORT`.

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
        return True  # 큰 할당만 정지
    return False
```

## Pretty-Printer — 구조체를 사람 읽을 형태로

가장 자주 만들어지는 확장. `std::vector<int>` 같은 STL 컨테이너가 멤버 변수의 원시 형태가 아니라 `{1, 2, 3, 4, 5}`로 보이는 이유입니다.

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

`display_hint`는 GDB에게 표시 방식을 알림 — `"array"`, `"map"`, `"string"`. MI(머신 인터페이스) 프런트엔드(VSCode 등)가 이 힌트를 이용해 트리 위젯을 그립니다.

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

링크드 리스트·해시 테이블·트리·그래프 — 모두 같은 패턴.

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
```

```text
(lldb) type summary add -F my_mod.Point_SummaryProvider Point
```

GDB보다 *summary*와 *synthetic*이 분리돼 있어 한 줄 표시(summary)와 자식 트리(synthetic)를 따로 정의합니다.

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
end
```

## 자주 쓰는 패턴

1. **메모리 누수 추적** — `malloc`/`free`에 Python 브레이크 + 카운터 집계.
2. **무한 루프 진단** — 1초마다 `info threads` 출력하는 백그라운드 Python.
3. **테스트 자동화** — `gdb -batch -ex "source script.py"`로 헤드리스 실행.
4. **회귀 검증** — `parse_and_eval`로 변수 값 비교, 차이가 있으면 `gdb.write`.

## 정리

- `python ... end` / `source` / `.gdbinit`에서 자동 로드.
- `gdb.Value`/`Type`/`Frame`이 핵심 객체.
- `gdb.Command` 서브클래스로 새 명령.
- `gdb.Breakpoint.stop`으로 자동 처리(False면 정지하지 않고 continue).
- pretty-printer = 구조체를 사람 읽을 형태로. `to_string`+`children`+`display_hint`.
- libstdc++/libc++ printer는 GCC/LLVM 소스에 있다.
- LLDB는 API가 다르지만 같은 일을 할 수 있다 (`lldb.SB*`).

## 다음 장 예고

Ch 10 — TUI와 프런트엔드. 터미널 UI, cgdb, gdb-dashboard, VSCode/Neovim DAP. 평소 작업 환경을 GDB와 어떻게 연결하나.

## 관련 항목

- [Ch 5: 브레이크포인트와 워치포인트](/blog/tools/gdb-lldb/chapter05-breakpoints-watchpoints) — Python stop hook
- [Ch 10: TUI / 프런트엔드](/blog/tools/gdb-lldb/chapter10-tui-frontends)
- [GDB Python API 공식 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Python-API.html)
- [LLDB Python API](https://lldb.llvm.org/python_reference/index.html)
