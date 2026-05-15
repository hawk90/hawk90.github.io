---
title: "Ch 2: 커스텀 명령, Convenience Function, Event 훅, Breakpoint"
date: 2025-09-03T02:00:00
description: "사용자 정의 명령, $name(...) 함수, stop hook, 자동 BP 액션 패턴."
tags: [gdb, python, command, event, breakpoint]
series: "GDB Extension and IDE"
seriesOrder: 2
draft: false
---

GDB 명령을 *내가 만든다*는 것이 Python API의 두 번째 즐거움입니다. 단순 매크로부터 자동 BP 액션, 정지마다 떨어지는 통계까지 — 모두 같은 패턴 (gdb.Command / gdb.Function / gdb.Breakpoint / 이벤트 hook)으로 가능합니다.

## gdb.Command — 사용자 명령

```python
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

`gdb.string_to_argv(arg)`가 *셸 스타일 파싱* — quote·escape 처리.

```text
(gdb) hello
hello, world
(gdb) hello "Mr. Smith"
hello, Mr. Smith
```

### COMMAND_* 카테고리

`help <category>`로 분류 보기.

```
COMMAND_NONE        분류 없음
COMMAND_RUNNING     run, step, continue 류
COMMAND_DATA        print, x 류
COMMAND_STACK       bt, frame 류
COMMAND_FILES       file, load 류
COMMAND_SUPPORT     set, show 류
COMMAND_STATUS      info 류
COMMAND_BREAKPOINTS break, watch 류
COMMAND_TRACEPOINTS tracepoint
COMMAND_USER        사용자
COMMAND_OBSCURE
COMMAND_MAINTENANCE
```

내 명령이 *어디 보일지*를 결정. 진단 명령은 `COMMAND_STATUS`, 트리거는 `COMMAND_BREAKPOINTS` 같은 식으로.

### Completion

탭 자동 완성을 켜려면.

```python
class MyCmd(gdb.Command):
    def __init__(self):
        super().__init__("mycmd", gdb.COMMAND_USER, gdb.COMPLETE_SYMBOL)
```

| 종류 | 설명 |
|------|------|
| COMPLETE_NONE | 없음 |
| COMPLETE_FILENAME | 파일명 |
| COMPLETE_LOCATION | 위치 (`function`, `file:line`) |
| COMPLETE_COMMAND | GDB 명령 |
| COMPLETE_SYMBOL | 심볼 이름 |
| COMPLETE_EXPRESSION | 표현식 |

### Custom completion

```python
class MyCmd(gdb.Command):
    def __init__(self):
        super().__init__("mycmd", gdb.COMMAND_USER, gdb.COMPLETE_NONE)
    def complete(self, text, word):
        candidates = ['foo', 'bar', 'baz']
        return [c for c in candidates if c.startswith(word)]
    def invoke(self, arg, from_tty):
        ...
```

도구 안에 *제한된 옵션*이 있을 때 (예: `mycmd start | stop | status`).

### Prefix 명령 — 서브 명령 트리

```python
class MyTop(gdb.Command):
    def __init__(self):
        super().__init__("my", gdb.COMMAND_USER, prefix=True)
    def invoke(self, arg, from_tty):
        gdb.execute("help my")

class MyList(gdb.Command):
    def __init__(self):
        super().__init__("my list", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        gdb.write("listing...\n")

class MyStop(gdb.Command):
    def __init__(self):
        super().__init__("my stop", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        gdb.write("stopping...\n")

MyTop(); MyList(); MyStop()
```

`my list`, `my stop` 같은 서브 명령. 큰 도구 묶음을 깔끔하게.

## Parameter — 사용자 설정 가능 옵션

```python
import gdb

class MyVerbosity(gdb.Parameter):
    """my-verbose: 도구의 출력 상세도."""
    def __init__(self):
        super().__init__("my-verbose",
                         gdb.COMMAND_SUPPORT,
                         gdb.PARAM_INTEGER)
        self.value = 1
    def get_set_string(self):
        return f"my-verbose set to {self.value}"
    def get_show_string(self, value):
        return f"my-verbose is currently {value}"

MyVerbosity()
```

```text
(gdb) set my-verbose 3
my-verbose set to 3
(gdb) show my-verbose
my-verbose is currently 3
```

`gdb.PARAM_*` 종류: BOOLEAN, AUTO_BOOLEAN, INTEGER, UINTEGER, STRING, FILENAME, ENUM, ...

도구가 *사용자 옵션*을 가질 때.

```python
# 다른 곳에서 접근
v = gdb.parameter("my-verbose")
if v > 1:
    gdb.write("verbose info\n")
```

## gdb.Function — Convenience function

`$<name>(...)` 형태로 *표현식 안*에서 호출 가능한 함수.

```python
import gdb

class StrLen(gdb.Function):
    """문자열 길이 반환."""
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

(gdb) break process if $strlen2(buffer) > 100
```

조건부 BP에서 매우 강력. *복잡한 조건*을 함수로 캡슐화.

## 이벤트 훅

```python
import gdb

def on_stop(event):
    if isinstance(event, gdb.BreakpointEvent):
        bps = event.breakpoints
        gdb.write(f"stopped at BP #{bps[0].number}\n")
    elif isinstance(event, gdb.SignalEvent):
        gdb.write(f"stopped by signal {event.stop_signal}\n")

def on_exited(event):
    gdb.write(f"exit code {event.exit_code}\n")

def on_new_obj(event):
    gdb.write(f"loaded {event.new_objfile.filename}\n")

def on_cont(event):
    gdb.write("continuing...\n")

gdb.events.stop.connect(on_stop)
gdb.events.exited.connect(on_exited)
gdb.events.new_objfile.connect(on_new_obj)
gdb.events.cont.connect(on_cont)
```

이벤트 종류.

| 이벤트 | 의미 |
|--------|------|
| `gdb.events.stop` | 정지 (BP, signal, watch) |
| `gdb.events.cont` | continue |
| `gdb.events.exited` | 프로세스 종료 |
| `gdb.events.new_objfile` | 새 ELF 로드 |
| `gdb.events.free_objfile` | ELF unload |
| `gdb.events.clear_objfiles` | 모든 ELF 클리어 |
| `gdb.events.new_inferior` | 새 인페리어 (fork 등) |
| `gdb.events.inferior_deleted` | 인페리어 제거 |
| `gdb.events.new_thread` | 새 스레드 |
| `gdb.events.gdb_exiting` | GDB 종료 |
| `gdb.events.before_prompt` | 프롬프트 표시 전 |
| `gdb.events.memory_changed` | 메모리 쓰기 |
| `gdb.events.register_changed` | 레지스터 쓰기 |
| `gdb.events.breakpoint_created/modified/deleted` | BP 관리 |

### 활용 — 특정 라이브러리 로드 시 자동 셋업

```python
def on_new_obj(event):
    name = event.new_objfile.filename
    if 'libmylib.so' in name:
        gdb.execute("source /opt/mylib/gdb-helpers.py")
        gdb.write(f"loaded mylib helpers\n")

gdb.events.new_objfile.connect(on_new_obj)
```

### 활용 — 매 정지마다 통계

```python
class StopCounter:
    def __init__(self):
        self.count = 0
        gdb.events.stop.connect(self.on_stop)
    def on_stop(self, event):
        self.count += 1
        gdb.write(f"\n--- stopped {self.count} times so far ---\n")

StopCounter()
```

### 활용 — 무한 루프 진단

별도 스레드에서 1초마다 `info threads`.

```python
import threading, time, gdb

class ThreadDumper:
    def __init__(self):
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self.loop)
        self.thread.daemon = True
    def start(self):
        self.thread.start()
    def stop(self):
        self.stop_event.set()
    def loop(self):
        while not self.stop_event.wait(1.0):
            gdb.post_event(lambda: gdb.execute("info threads"))
```

`gdb.post_event(...)`이 *GDB 메인 스레드*에서 콜백 실행 — GDB API는 *main thread only*.

## gdb.Breakpoint — Python 서브클래스

브레이크포인트의 행동을 *Python으로* 정의.

```python
import gdb

class LogAllocs(gdb.Breakpoint):
    def __init__(self):
        super().__init__("malloc")
    def stop(self):
        size = int(gdb.parse_and_eval("$rdi"))   # x86-64 첫 인자
        gdb.write(f"malloc({size})\n")
        return False    # False = 정지하지 않고 continue

LogAllocs()
```

`stop()` 반환값.

- `True` → 정지 (사용자에게 제어).
- `False` → 자동 continue.

기본 `commands silent printf`의 효과지만 *Python의 모든 표현력*.

### 조건부 자동 액션

```python
class BigMalloc(gdb.Breakpoint):
    def __init__(self):
        super().__init__("malloc")
    def stop(self):
        size = int(gdb.parse_and_eval("$rdi"))
        if size > 1024 * 1024:
            gdb.write(f"big malloc: {size} bytes\n")
            gdb.execute("bt 5")
            return True   # 정지
        return False

BigMalloc()
```

### Watchpoint 서브클래스

```python
class TrackWrites(gdb.Breakpoint):
    def __init__(self, expr):
        super().__init__(expr, gdb.BP_WATCHPOINT, gdb.WP_WRITE)
    def stop(self):
        val = gdb.parse_and_eval(self.location)
        gdb.write(f"{self.location} = {val}\n")
        return False

TrackWrites("g_counter")
```

GDB의 `watch g_counter`를 *프로그램 측에서* 설치.

### Internal vs User

```python
super().__init__("malloc", internal=True)
```

`internal=True`면 *사용자 BP 목록에 안 보임*. 자동화 도구가 *몰래* BP 설치할 때.

## .gdbinit으로 자동 로드

```
# ~/.gdbinit
set history save on
set print pretty on

python
import sys
sys.path.insert(0, '/home/me/gdb-helpers')
import myhelpers
myhelpers.register_all()
end
```

또는 *프로젝트별 .gdbinit* (GDB 8.0+, 보안상 `add-auto-load-safe-path`).

```
# project/.gdbinit
add-auto-load-safe-path .
source ./gdb-helpers/init.py
```

```
(gdb) set auto-load local-gdbinit on
```

## 자주 쓰는 패턴

### 1. 메모리 누수 추적

```python
import gdb
from collections import defaultdict

alloc_table = {}
alloc_count = defaultdict(int)

class MallocTrack(gdb.Breakpoint):
    def __init__(self):
        super().__init__("malloc", internal=True)
    def stop(self):
        size = int(gdb.parse_and_eval("$rdi"))
        # rax는 return 후 — finish 사용
        gdb.events.stop.connect(self._capture_return)
        self.size = size
        return False
    def _capture_return(self, event):
        addr = int(gdb.parse_and_eval("$rax"))
        alloc_table[addr] = self.size
        alloc_count[self.size] += 1
        gdb.events.stop.disconnect(self._capture_return)

class FreeTrack(gdb.Breakpoint):
    def __init__(self):
        super().__init__("free", internal=True)
    def stop(self):
        addr = int(gdb.parse_and_eval("$rdi"))
        if addr in alloc_table:
            del alloc_table[addr]
        return False

MallocTrack(); FreeTrack()

def dump_leaks(_evt=None):
    if not alloc_table:
        gdb.write("no leaks\n"); return
    total = sum(alloc_table.values())
    gdb.write(f"{len(alloc_table)} allocations leaked, {total} bytes\n")

gdb.events.exited.connect(dump_leaks)
```

운영에는 ASan을 쓰지만 *원리 학습*에 매우 유용.

### 2. 함수 호출 통계

```python
class CountCalls(gdb.Breakpoint):
    def __init__(self, fn):
        super().__init__(fn, internal=True)
        self.count = 0
        self.name = fn
    def stop(self):
        self.count += 1
        return False

watchers = []
for fn in ['process_request', 'handle_packet', 'send_response']:
    watchers.append(CountCalls(fn))

def report(_evt=None):
    for w in watchers:
        gdb.write(f"{w.name}: {w.count} calls\n")
gdb.events.exited.connect(report)
```

`perf`로 할 수도 있지만 *정확한 조건부 카운트*는 GDB가 유리.

### 3. 표현식 추적 (display의 자동화)

```python
class Tracer:
    def __init__(self, exprs):
        self.exprs = exprs
        gdb.events.stop.connect(self.on_stop)
    def on_stop(self, _evt):
        for e in self.exprs:
            try:
                v = gdb.parse_and_eval(e)
                gdb.write(f"  {e} = {v}\n")
            except gdb.error:
                gdb.write(f"  {e} = <error>\n")

Tracer(['counter', 'state', 'queue.size()'])
```

매 정지마다 *지정 표현식*들 출력. `display`의 Python 버전.

## 헤드리스 모드 — batch

```bash
$ gdb -batch -ex 'source script.py' -ex 'run' -ex 'quit' --args ./prog
```

`-batch`로 *사용자 입력 없이* 스크립트 실행. CI 자동화의 표준.

```bash
# segfault된 바이너리를 자동으로 분석
$ gdb -batch \
    -ex 'run' \
    -ex 'bt' \
    -ex 'info threads' \
    -ex 'thread apply all bt' \
    --args ./buggy_prog
```

## 정리

- `gdb.Command` 서브클래스로 새 명령. COMMAND_* 카테고리·completion·prefix.
- `gdb.Parameter`로 사용자 옵션.
- `gdb.Function`으로 `$name(...)` convenience function — 조건부 BP에 강력.
- `gdb.events.*`로 stop / cont / new_objfile / exited 등 hook.
- `gdb.Breakpoint` 서브클래스 + `stop()` 반환값으로 자동 액션.
- `internal=True`로 사용자 비가시 BP.
- `.gdbinit`에 모두 등록.
- `gdb -batch`로 헤드리스 자동화.

## 다음 장 예고

Ch 3 — Pretty-printer 깊이. `to_string`/`children`/`display_hint`, MI 출력, auto-load.

## 관련 항목

- [Ch 1: Python API 입문](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)
- [Ch 3: Pretty-printer 깊이](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)
- [GDB Python Commands](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Commands-In-Python.html)
- [GDB Events](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Events-In-Python.html)
