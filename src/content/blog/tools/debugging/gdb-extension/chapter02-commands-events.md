---
title: "GDB 커스텀 명령·Convenience Function·Event 훅·Breakpoint"
slug: "tools/debugging/gdb-extension/chapter02-commands-events"
date: 2026-05-27T09:02:00
description: "사용자 정의 명령, $name(...) 함수, stop hook, 자동 BP 액션 패턴."
tags: [gdb, python, command, event, breakpoint]
series: "GDB Extension and IDE"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

GDB 명령을 *내가 만든다*는 것이 Python API의 두 번째 즐거움입니다. 단순 매크로부터 자동 BP 액션, 정지마다 떨어지는 통계까지 — 모두 같은 패턴 (gdb.Command / gdb.Function / gdb.Breakpoint / 이벤트 hook)으로 가능합니다.

이 장은 GDB 17.2 Python API를 기준으로 합니다. 명령의 argument/실패, event 연결 수명과 breakpoint callback의 실행 제약을 함께 다룹니다.

## gdb.Command — 사용자 명령

```python title="hello-command.py"
import gdb

class HelloCmd(gdb.Command):
    """간단한 인사 명령."""
    def __init__(self):
        super().__init__("hello", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        argv = gdb.string_to_argv(arg)
        self.dont_repeat()
        if len(argv) > 1:
            raise gdb.GdbError('usage: hello ["NAME"]')
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

```text
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

```python title="verbosity-parameter.py"
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

```python title="string-length-function.py"
import gdb

class StrLen(gdb.Function):
    """UTF-8 decoding한 Python 문자열의 문자 수. C strlen byte 수 아님."""
    def __init__(self):
        super().__init__("strlen2")
    def invoke(self, str_arg, byte_length):
        n = int(byte_length)
        if not 0 <= n <= 4096:
            raise gdb.GdbError("length must be 0..4096 bytes")
        s = str_arg.string(encoding="utf-8", errors="strict", length=n)
        return len(s.split("\0", 1)[0])

StrLen()
```

```text
(gdb) print $strlen2(msg, sizeof(msg))
$1 = 12

(gdb) break process if $strlen2(buffer, sizeof(buffer)) > 100
```

두 번째 인자 길이는 실제 readable buffer 범위를 넘으면 안 됩니다. 아래 함수는 strlen 대체가 아니라 길이가 알려진 debug array용 UTF-8 문자 수 예입니다. C byte length와 문자 수, 읽기 실패·최대 범위를 구분합니다.

## 이벤트 훅

```python title="session-hooks.py"
import gdb

class SessionHooks:
    def __init__(self):
        self.count = 0
        self.connections = []
        self.closed = False
        for registry, callback in ((gdb.events.stop, self.on_stop),
                                   (gdb.events.exited, self.on_exited)):
            registry.connect(callback)
            self.connections.append((registry, callback))

    def on_stop(self, event):
        if self.closed:
            return
        self.count += 1
        if isinstance(event, gdb.SignalEvent):
            reason = f"signal {event.stop_signal}"
        elif isinstance(event, gdb.BreakpointEvent):
            reason = "breakpoints " + ",".join(str(bp.number) for bp in event.breakpoints)
        else:
            reason = "stop"
        gdb.write(f"stop {self.count}: {reason}\n")

    def on_exited(self, event):
        # signal로 종료된 경우 등 exit_code가 없을 수 있음.
        code = getattr(event, "exit_code", None)
        gdb.write(f"inferior {event.inferior.num} exited: {code}\n")

    def close(self):
        if not self.closed:
            self.closed = True
            for registry, callback in self.connections:
                registry.disconnect(callback)
            self.connections.clear()

old_hooks = globals().get("article_session_hooks")
if old_hooks is not None:
    old_hooks.close()
article_session_hooks = SessionHooks()
```

반복 source 시 이전 연결을 해제합니다. event 종류/속성은 해당 registry와 GDB revision을 따르고, memory/register change event를 모든 inferior write의 기록으로 해석하지 않습니다. all-stop/non-stop의 selected context도 구분합니다.

### 활용 — 특정 라이브러리 로드 시 자동 셋업

```python
def on_new_obj(event):
    name = event.new_objfile.filename
    if name is not None and name.endswith("/libmylib.so"):
        gdb.execute("source /opt/mylib/gdb-helpers.py")
        gdb.write(f"loaded mylib helpers\n")

gdb.events.new_objfile.connect(on_new_obj)
```

### 활용 — 매 정지마다 통계

앞 SessionHooks.count처럼 session별로 수집하고 더 이상 쓰지 않을 때 close/disconnect합니다. 다음은 개념 fragment이며 반복 등록하지 않습니다.

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

GDB API 대부분은 GDB main thread에서만 사용합니다. worker가 필요하면 gdb.post_event로 작은 callback을 예약할 수 있지만 실행 시점·지연 상한은 보장되지 않습니다. 종료 후 이미 queue에 든 callback과 반복 예약 backlog도 처리해야 합니다.

`threading.Thread`를 daemon으로 만들고 1초마다 무제한 post하면 stop 이후에도 callback이 남을 수 있습니다. GDB의 Python thread/signal·event 계약을 확인하고 pending 한 개와 closed flag·disconnect/join 등을 설계합니다. 별도 thread dumper를 곧바로 hang detector로 제시하지 않습니다.

## gdb.Breakpoint — Python 서브클래스

브레이크포인트의 행동을 *Python으로* 정의.

```python
import gdb

class LogAllocs(gdb.Breakpoint):
    def __init__(self):
        super().__init__("malloc")
    def stop(self):
        size = int(gdb.parse_and_eval("$rdi"))   # x86-64 System V ABI의 정수/포인터 첫 인자
        gdb.write(f"malloc({size})\n")
        return False    # False = 정지하지 않고 continue

LogAllocs()
```

이 register 예는 x86-64 System V ABI 전용이며 Windows x64·AArch64에 그대로 쓸 수 없습니다. breakpoint hit의 observer overhead와 재귀·여러 thread도 고려합니다.

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
        self.expr = expr
        super().__init__(expr, gdb.BP_WATCHPOINT, gdb.WP_WRITE)
    def stop(self):
        val = gdb.parse_and_eval(self.expr)
        gdb.write(f"{self.expr} = {val}\n")
        return False

TrackWrites("g_counter")
```

GDB의 `watch g_counter`를 *프로그램 측에서* 설치.

### Internal vs User

```python
super().__init__("malloc", internal=True)
```

`internal=True`면 *사용자 BP 목록에 안 보임*. 도구 내부 breakpoint를 일반 목록과 구분할 때 사용합니다. maint info breakpoints 등에서는 보이며 비밀/보안 경계가 아닙니다.

## .gdbinit으로 자동 로드

```text
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

프로젝트별 .gdbinit을 자동 실행하려면 **신뢰 설정을 이미 읽히는 user 설정 또는 command-line에** 둡니다. 아직 신뢰되지 않아 읽히지 않는 project .gdbinit이 자기 자신을 허용하는 흐름은 성립하지 않습니다.

```text
# 신뢰하는 user ~/.gdbinit에서 exact project path만 지정하는 예
add-auto-load-safe-path /absolute/trusted/project/.gdbinit
```

전체 / 또는 현재 디렉터리 전체를 항상 신뢰하도록 넓히기 전에 script의 출처와 적용 범위를 확인합니다. 이 글의 검증은 user 설정을 수정하지 않고 gdb -nx -batch에서 source를 명시합니다.

## 자주 쓰는 패턴

### 1. 반환값과 누수 추적의 경계

malloc entry에서 stop=False로 넘긴 뒤 다음 임의 gdb.events.stop의 RAX를 반환값으로 수집하면 다른 함수/스레드의 값을 기록할 수 있습니다. 기존 예는 그 이유로 사용하지 않습니다.

```python title="return-watch.py"
import gdb

class ReturnWatch(gdb.FinishBreakpoint):
    """정지된 non-inline newest frame에서 명시적으로 생성하는 반환 관찰."""
    def __init__(self):
        super().__init__(gdb.newest_frame(), internal=True)
    def stop(self):
        value = self.return_value
        gdb.write("return unavailable\n" if value is None else f"return: {value}\n")
        return True
    def out_of_scope(self):
        gdb.write("frame left without a captured normal return\n")
```

이 observer는 complete allocator/leak tracker가 아닙니다. stopped frame에서 ReturnWatch()를 설치한 뒤 사용하고 정상 return·out_of_scope·return_value=None을 구분합니다. Breakpoint.stop 안에서 continue/step·frame 변경·breakpoint 추가/삭제를 하는 방식은 API 제약을 위반할 수 있습니다.

실제 할당 추적에는 thread별 call/return, NULL·realloc·free·주소 재사용·비정상 종료와 tracker 시작 이전 할당을 다뤄야 합니다. 수집 표가 비었다고 no leaks를 증명하지 않습니다.

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

설치한 symbol/location과 그 이후 관찰한 hit만 셉니다. inline·최적화·lost event·여러 inferior와 instrumentation 비용을 분리합니다. 함수 전체 실제 호출 수의 보편적인 정확성 보증은 아닙니다.

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

Tracer(['counter', 'state'])
```

매 정지의 selected context에서 값만 읽습니다. queue.size() 같은 expression은 실제 inferior 함수 호출이나 부작용을 일으킬 수 있어 observer에 무조건 넣지 않습니다. 연결 해제와 unavailable/error 처리도 필요합니다.

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
