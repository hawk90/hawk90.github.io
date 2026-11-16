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

GDB 명령을 *직접 만든다*는 것이 Python API의 두 번째 재미입니다. 단순한 매크로부터 자동 breakpoint 액션, 정지할 때마다 찍히는 통계까지 모두 네 가지 틀(`gdb.Command`, `gdb.Function`, `gdb.Breakpoint`, 이벤트 hook) 위에서 만들어집니다. 공구함에 비유하면 GDB가 기본 공구 세트를 주고, Python API는 그 손잡이에 끼울 내 비트를 깎게 해 주는 셈입니다.

이 장의 코드는 모두 Debian 13 arm64 VM의 GDB 16.3(Debian 16.3-1)에서 실습 프로그램 `server.c`로 돌렸습니다. `main()`이 `malloc(64)`과 `malloc(2 MiB)`를 한 번씩 부르고, `process_request()` → `handle_packet()` → `send_response()`를 세 번 호출한 뒤 공유 라이브러리 `libmylib.so`의 함수를 부릅니다.

```c title="server.c (발췌)"
int g_counter = 0;
int counter = 0;
int state = 0;
char msg[32] = "héllo, gdb";

int send_response(int id) { g_counter += id; return id * 10; }        /* 13행 */
int handle_packet(int id) { state = id % 3; return send_response(id); } /* 14행 */
int process_request(int id) {
    counter++;
    return handle_packet(id);
}

int main(void) {
    char *small = malloc(64);                 /* 21행 */
    char *big = malloc(2 * 1024 * 1024);
    int total = 0;
    for (int i = 1; i <= 3; i++)
        total += process_request(i);
    snprintf(small, 64, "total=%d lib=%d", total, mylib_version());
    puts(small);
    ...
}
```

## gdb.Command — 사용자 명령

`gdb.Command`를 상속하고 `invoke()`를 정의하면 새 명령이 생깁니다. 클래스 docstring이 `help` 문구가 됩니다.

```python title="ext2.py (발췌)"
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

`gdb.string_to_argv(arg)`가 따옴표와 escape를 셸처럼 풀어 줍니다. `"Mr. Smith"`가 인자 하나로 들어오는 것을 볼 수 있습니다.

```text
(gdb) hello
hello, world
(gdb) hello "Mr. Smith"
hello, Mr. Smith
(gdb) hello a b
usage: hello ["NAME"]
```

`dont_repeat()`는 빈 줄 Enter로 같은 명령이 반복되지 않게 합니다. `gdb.GdbError`는 traceback 없이 문구만 보여 줍니다.

### COMMAND_* 카테고리

두 번째 인자는 `help`에서 명령이 들어갈 분류입니다. GDB 16.3에 있는 이름을 그대로 찍었습니다.

```text
(gdb) python print([c for c in dir(gdb) if c.startswith("COMMAND_")])
['COMMAND_BREAKPOINTS', 'COMMAND_DATA', 'COMMAND_FILES', 'COMMAND_MAINTENANCE', 'COMMAND_NONE', 'COMMAND_OBSCURE', 'COMMAND_RUNNING', 'COMMAND_STACK', 'COMMAND_STATUS', 'COMMAND_SUPPORT', 'COMMAND_TRACEPOINTS', 'COMMAND_TUI', 'COMMAND_USER']
```

`COMMAND_USER`로 만든 명령은 `help user-defined`에 모입니다. 이 장의 `ext2.py`를 source한 뒤의 목록입니다.

```text
(gdb) help user-defined
User-defined commands.
The commands in this class are those defined by the user.
Use the "define" command to define a command.

List of commands:

hello -- 간단한 인사 명령.
my -- my 도구 모음.
my list -- my 목록 출력.
my stop -- my 정지.
svc -- svc start|stop|status
symcmd -- 심볼 이름 자동 완성 예.
```

진단 명령은 `COMMAND_STATUS`, breakpoint 관련 도구는 `COMMAND_BREAKPOINTS`처럼 성격에 맞는 분류에 넣으면 `help status`·`help breakpoints`에서 같이 보입니다.

### Completion

세 번째 인자로 `COMPLETE_*` 상수를 주면 GDB 내장 완성기가 붙습니다.

```text
(gdb) python print([c for c in dir(gdb) if c.startswith("COMPLETE_")])
['COMPLETE_COMMAND', 'COMPLETE_EXPRESSION', 'COMPLETE_FILENAME', 'COMPLETE_LOCATION', 'COMPLETE_NONE', 'COMPLETE_SYMBOL']
```

| 상수 | 완성 대상 |
|------|-----------|
| `COMPLETE_NONE` | 없음 |
| `COMPLETE_FILENAME` | 파일명 |
| `COMPLETE_LOCATION` | 위치 (`function`, `file:line`) |
| `COMPLETE_COMMAND` | GDB 명령 |
| `COMPLETE_SYMBOL` | 심볼 이름 |
| `COMPLETE_EXPRESSION` | 표현식 |

`COMPLETE_SYMBOL`로 만든 `symcmd`에 `complete` 명령을 쓰면 Tab을 누른 것과 같은 결과를 볼 수 있습니다.

```python
class SymCmd(gdb.Command):
    """심볼 이름 자동 완성 예."""
    def __init__(self):
        super().__init__("symcmd", gdb.COMMAND_USER, gdb.COMPLETE_SYMBOL)
```

```text
(gdb) complete symcmd process_
symcmd process_request
```

### Custom completion

선택지가 정해진 명령(`svc start | stop | status`)은 `complete(text, word)` 메서드로 후보를 직접 돌려줍니다. 여기서 두 번 넘어졌습니다.

첫째, 생성자에 `completer_class`를 주면 `complete()`는 불리지 않습니다. GDB 16.3 매뉴얼 CLI Commands In Python 절은 `completer_class`가 *주어지지 않았을 때만* `complete` 메서드로 완성한다고 적습니다. `gdb.COMPLETE_NONE`을 같이 넘긴 판에서는 `complete svc st`가 아무것도 내지 않았습니다.

둘째, `word`가 `None`으로 들어오는 호출이 있습니다. 매뉴얼은 두 인자가 모두 문자열이라고 적지만, `gdb/python/py-cmd.c`의 `cmdpy_completer_handle_brkchars`(228행)는 단어 경계를 정하는 단계에서 `word`를 `NULL`로 넘기고, `cmdpy_completer_helper`(191~194행)가 이를 Python `None`으로 바꿉니다. 가드 없이 `c.startswith(word)`를 쓰면 다음처럼 됩니다.

```text
(gdb) complete svc st
Python Exception <class 'TypeError'>: startswith first arg must be str or a tuple of str, not NoneType
```

두 가지를 고친 판입니다.

```python
class SvcCmd(gdb.Command):
    """svc start|stop|status"""
    def __init__(self):
        super().__init__("svc", gdb.COMMAND_USER)      # completer_class 없음
    def complete(self, text, word):
        if word is None:        # 단어 경계 계산 단계 (py-cmd.c)
            return None
        return [c for c in ['start', 'stop', 'status'] if c.startswith(word)]
    def invoke(self, arg, from_tty):
        gdb.write(f"svc: {arg}\n")
```

```text
(gdb) complete svc st
svc start
svc status
svc stop
```

### Prefix 명령 — 서브 명령 트리

`prefix=True`로 만든 명령 아래에 `"my list"`처럼 이름을 붙이면 서브 명령이 됩니다. 파일 탐색기의 폴더처럼 도구를 한 이름 아래에 정리하는 방법입니다.

```python
class MyTop(gdb.Command):
    """my 도구 모음."""
    def __init__(self):
        super().__init__("my", gdb.COMMAND_USER, prefix=True)

class MyList(gdb.Command):
    """my 목록 출력."""
    def __init__(self):
        super().__init__("my list", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        gdb.write("listing...\n")

class MyStop(gdb.Command):
    """my 정지."""
    def __init__(self):
        super().__init__("my stop", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        gdb.write("stopping...\n")

MyTop(); MyList(); MyStop()
```

```text
(gdb) my list
listing...
(gdb) help my
my 도구 모음.

List of my subcommands:

my list -- my 목록 출력.
my stop -- my 정지.
(gdb) my
"my" must be followed by the name of a subcommand.
List of my subcommands:
...
```

prefix 명령에 `invoke()`를 정의하지 않으면 GDB가 알아서 서브 명령 목록을 보여 줍니다. 따로 `gdb.execute("help my")`를 부를 필요가 없습니다.

## Parameter — 사용자 설정 가능 옵션

도구에 `set`/`show`로 바꿀 수 있는 옵션을 두려면 `gdb.Parameter`를 상속합니다. GDB 16.3의 `PARAM_*` 종류는 다음과 같습니다.

```text
(gdb) python print([c for c in dir(gdb) if c.startswith("PARAM_")])
['PARAM_AUTO_BOOLEAN', 'PARAM_BOOLEAN', 'PARAM_ENUM', 'PARAM_FILENAME', 'PARAM_INTEGER', 'PARAM_OPTIONAL_FILENAME', 'PARAM_STRING', 'PARAM_STRING_NOESCAPE', 'PARAM_UINTEGER', 'PARAM_ZINTEGER', 'PARAM_ZUINTEGER', 'PARAM_ZUINTEGER_UNLIMITED']
```

매뉴얼 Parameters In Python 절에 따르면 `PARAM_INTEGER`·`PARAM_UINTEGER`는 `None`(또는 `unlimited`)이 "무제한"이고 0은 예약된 값입니다. 상세도처럼 0도 평범한 값으로 쓰고 싶다면 `PARAM_ZINTEGER`가 맞습니다.

```python title="ext2.py (발췌)"
class MyVerbosity(gdb.Parameter):
    """my-verbose: 도구의 출력 상세도."""
    set_doc = "Set my-verbose."
    show_doc = "Show my-verbose."
    def __init__(self):
        super().__init__("my-verbose", gdb.COMMAND_SUPPORT, gdb.PARAM_ZINTEGER)
        self.value = 1
    def get_set_string(self):
        return f"my-verbose set to {self.value}"
    def get_show_string(self, svalue):
        return f"my-verbose is currently {svalue}"

MyVerbosity()
```

```text
(gdb) set my-verbose 3
my-verbose set to 3
(gdb) show my-verbose
my-verbose is currently 3
(gdb) python print(gdb.parameter("my-verbose"), type(gdb.parameter("my-verbose")))
3 <class 'int'>
(gdb) help set my-verbose
Set my-verbose.
my-verbose: 도구의 출력 상세도.
```

`gdb.parameter()`는 Python `int`를 돌려주므로 다른 명령 안에서 `if gdb.parameter("my-verbose") > 1:`처럼 바로 비교합니다. 매뉴얼은 `get_set_string()`이 `gdb.GdbError`를 던지면 `set`이 실패하지만 `value`는 이미 바뀐 채 남는다고 경고합니다. 값을 검증하려면 이전 값을 따로 저장해 두고 되돌려야 합니다.

## gdb.Function — Convenience function

`gdb.Function`을 상속하면 `$이름(...)` 형태로 *표현식 안*에서 부를 수 있는 함수가 생깁니다. `print`, breakpoint 조건, `x` 명령 어디든 들어갑니다.

아래 `$strlen2`는 C의 `strlen`(바이트 수)과 다르게 UTF-8로 풀어 *문자 수*를 셉니다. 길이를 인자로 받아 읽을 범위를 고정하고, 4096바이트를 넘으면 거부합니다.

```python title="ext2.py (발췌)"
class StrLen(gdb.Function):
    """$strlen2(arr, n): 앞 n바이트를 UTF-8로 풀어 NUL 앞까지의 문자 수."""
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

`msg`는 `"héllo, gdb"`입니다. `é`가 UTF-8로 2바이트라서 바이트로는 11, 문자로는 10입니다.

```text
(gdb) print $strlen2(msg, sizeof(msg))
$1 = 10
(gdb) print sizeof(msg)
$2 = 32
(gdb) print $strlen2(msg, 5000)
length must be 0..4096 bytes
(gdb) tbreak handle_packet if $strlen2(msg, sizeof(msg)) > 5
Temporary breakpoint 2 at 0xaaaaaaaa0938: file server.c, line 14.
(gdb) info breakpoints
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x0000aaaaaaaa098c in process_request at server.c:16
	breakpoint already hit 1 time
2       breakpoint     del  y   0x0000aaaaaaaa0938 in handle_packet at server.c:14
	stop only if $strlen2(msg, sizeof(msg)) > 5
```

조건부 breakpoint의 조건 안에 Python 함수를 넣을 수 있다는 점이 핵심입니다. C 표현식으로 쓰기 어려운 판정을 Python으로 짜서 조건으로 씁니다.

## 이벤트 훅

`gdb.events.*`는 GDB 안에서 일이 생길 때 호출될 콜백을 붙이는 게시판입니다. GDB 16.3에 있는 registry 목록입니다.

```text
['before_prompt', 'breakpoint_created', 'breakpoint_deleted', 'breakpoint_modified', 'clear_objfiles', 'connection_removed', 'cont', 'executable_changed', 'exited', 'free_objfile', 'free_progspace', 'gdb_exiting', 'inferior_call', 'inferior_deleted', 'memory_changed', 'new_inferior', 'new_objfile', 'new_progspace', 'new_thread', 'register_changed', 'stop', 'thread_exited', 'tui_enabled']
```

아래 `SessionHooks`는 `stop`과 `exited`에 연결하고, 같은 파일을 다시 source하면 이전 연결을 끊습니다. 스크립트를 고쳐 가며 여러 번 source해도 콜백이 쌓이지 않습니다.

```python title="hooks.py"
import gdb

class SessionHooks:
    def __init__(self):
        self.count = 0
        self.connections = []
        for registry, callback in ((gdb.events.stop, self.on_stop),
                                   (gdb.events.exited, self.on_exited)):
            registry.connect(callback)
            self.connections.append((registry, callback))

    def on_stop(self, event):
        self.count += 1
        if isinstance(event, gdb.SignalEvent):
            reason = f"signal {event.stop_signal}"
        elif isinstance(event, gdb.BreakpointEvent):
            reason = "breakpoints " + ",".join(str(bp.number) for bp in event.breakpoints)
        else:
            reason = "stop"
        gdb.write(f"stop {self.count}: {reason}\n")

    def on_exited(self, event):
        code = getattr(event, "exit_code", None)
        gdb.write(f"inferior {event.inferior.num} exited: {code}\n")

    def close(self):
        for registry, callback in self.connections:
            registry.disconnect(callback)
        self.connections.clear()

old_hooks = globals().get("article_session_hooks")
if old_hooks is not None:
    old_hooks.close()
article_session_hooks = SessionHooks()
```

`hooks.py`를 두 번 source하고 `handle_packet`에 breakpoint를 걸어 실행했습니다. 정지마다 줄이 하나씩만 찍히므로 첫 번째 연결이 제대로 끊긴 것입니다.

```text
(gdb) source /root/ext/ch02/hooks.py
(gdb) source /root/ext/ch02/hooks.py
(gdb) break handle_packet
(gdb) run
Breakpoint 1, handle_packet (id=1) at server.c:14
stop 1: breakpoints 1
(gdb) continue
Breakpoint 1, handle_packet (id=2) at server.c:14
stop 2: breakpoints 1
(gdb) delete
(gdb) continue
total=60 lib=3
[Inferior 1 (process 3255) exited normally]
inferior 1 exited: 0
```

`exit_code`가 늘 있는 것은 아닙니다. 널 포인터를 따라가다 죽는 `buggy.c`에서 SIGSEGV로 멈춘 뒤 `quit`으로 프로세스를 죽이자 `exit_code` 속성이 없어 `None`이 찍혔습니다. `getattr(..., None)`을 쓴 이유입니다.

```text
Program received signal SIGSEGV, Segmentation fault.
0x0000aaaaaaaa07bc in sum (n=0x10) at buggy.c:3
stop 1: signal SIGSEGV
(gdb) quit
...
inferior 1 exited: None
```

### 활용 — 특정 라이브러리 로드 시 자동 셋업

`new_objfile`은 실행 파일이나 공유 라이브러리가 로드될 때마다 불립니다. 특정 라이브러리가 올라올 때만 그 라이브러리용 도우미 스크립트를 source합니다.

```python title="objhook.py"
import gdb

def on_new_obj(event):
    name = event.new_objfile.filename
    if name is not None and name.endswith("/libmylib.so"):
        gdb.execute("source /root/ext/ch02/mylib-helpers.py")
        gdb.write(f"loaded mylib helpers for {name}\n")

gdb.events.new_objfile.connect(on_new_obj)
```

```text
(gdb) source /root/ext/ch02/objhook.py
(gdb) run
Starting program: /root/ext/ch02/server
mylib-helpers.py: registering...
loaded mylib helpers for /root/ext/ch02/libmylib.so
[Thread debugging using libthread_db enabled]
...
total=60 lib=3
```

`mylib-helpers.py`는 한 줄을 찍기만 하는 자리표시 스크립트입니다. 같은 일을 GDB의 auto-load(`libmylib.so-gdb.py`)로도 할 수 있으며, 그 방식은 [Ch 3](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)에서 다룹니다.

### 활용 — 매 정지마다 표현식 추적 (display의 자동화)

`display`처럼 정지할 때마다 표현식 몇 개를 찍되, 실패한 표현식은 `<error>`로 표시하고 계속 갑니다. 필요 없어지면 `close()`로 연결을 끊습니다.

```python title="bps.py (발췌)"
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
    def close(self):
        gdb.events.stop.disconnect(self.on_stop)
```

```text
(gdb) python tracer = Tracer(['counter', 'state', 'no_such_var'])
(gdb) break handle_packet
(gdb) run
Breakpoint 1, handle_packet (id=1) at server.c:14
  counter = 1
  state = 0
  no_such_var = <error>
(gdb) continue
Breakpoint 1, handle_packet (id=2) at server.c:14
  counter = 2
  state = 1
  no_such_var = <error>
(gdb) python tracer.close()
(gdb) continue
Breakpoint 1, handle_packet (id=3) at server.c:14
```

`state`가 아직 이전 값인 것은 14행의 `state = id % 3;`이 실행되기 전에 멈췄기 때문입니다. 표현식에 `queue.size()` 같은 함수 호출을 넣으면 정지할 때마다 디버기 안에서 그 함수가 실제로 실행되므로, 관찰용 목록에는 부작용 없는 변수만 넣습니다.

### 다른 스레드에서 GDB에 일 맡기기 — post_event

GDB 16.3 매뉴얼 Basic Python 절은 `gdb.post_event()`가 대부분의 GDB Python API와 달리 thread-safe하다고 적습니다. 다른 스레드는 GDB API를 직접 부르지 말고, 할 일을 callable로 만들어 이 큐에 넣습니다. 매뉴얼은 넣은 순서대로 실행되지만 *언제* 실행될지는 알 수 없다고도 적습니다.

```python title="postevent.py"
import gdb, threading

class Writer:
    def __init__(self, message):
        self.message = message
    def __call__(self):
        gdb.write(f"[main thread? {threading.current_thread() is threading.main_thread()}] {self.message}\n")

def worker():
    gdb.post_event(Writer("posted from worker"))

t = threading.Thread(target=worker)
t.start()
t.join()
gdb.write("worker joined\n")
```

```text
(gdb) source /root/ext/ch02/postevent.py
worker joined
(gdb) [main thread? True] posted from worker
```

worker 스레드는 이미 끝났는데 callback은 `source`가 끝나고 GDB가 이벤트 루프로 돌아간 뒤에야 메인 스레드에서 실행됐습니다. 식당 주방의 주문표 꽂이와 같습니다. 홀 직원(worker)은 주문표를 꽂고 돌아가고, 요리사(GDB 메인 스레드)는 손이 빌 때 꽂힌 순서대로 처리합니다.

## gdb.Breakpoint — Python 서브클래스

`gdb.Breakpoint`를 상속해 `stop()`을 정의하면 breakpoint에 걸릴 때마다 Python이 실행됩니다. 매뉴얼 Breakpoints In Python 절에 따르면 `True`를 돌려주면 멈추고, 그 밖의 값이면 계속 갑니다.

첫 인자는 ABI가 정한 레지스터로 들어오므로, AArch64에서는 `$x0`을 읽습니다. AAPCS64 General-purpose Registers 절은 r0-r7(64비트로 쓰면 x0-x7)을 인자 전달과 반환값에 쓴다고 정합니다.

```python title="bps.py (발췌)"
class LogAllocs(gdb.Breakpoint):
    def __init__(self):
        super().__init__("malloc")
    def stop(self):
        size = int(gdb.parse_and_eval("$x0"))   # AAPCS64 첫 정수/포인터 인자
        gdb.write(f"malloc({size})\n")
        return False
```

`main`에 멈춘 뒤 설치하고 `next`로 두 줄을 넘겼습니다.

```text
(gdb) python LogAllocs()
Breakpoint 2 at 0xfffff7e67804: malloc. (46 locations)
(gdb) next
malloc(64)
22	    char *big = malloc(2 * 1024 * 1024);
(gdb) next
malloc(2097152)
23	    int total = 0;
```

`commands` + `silent` + `printf`로도 같은 로그를 낼 수 있지만, Python이면 조건과 가공을 자유롭게 짤 수 있습니다.

### 조건부 자동 액션 — 그리고 46곳의 함정

1 MiB보다 큰 할당일 때만 멈추고 콜스택을 찍는 판입니다.

```python
class BigMalloc(gdb.Breakpoint):
    def __init__(self):
        super().__init__("malloc")
    def stop(self):
        size = int(gdb.parse_and_eval("$x0"))
        if size > 1024 * 1024:
            gdb.write(f"big malloc: {size} bytes\n")
            gdb.execute("bt 2")
            return True
        return False
```

이번에는 프로그램을 처음부터 다시 `run`했더니 엉뚱한 곳에서 멈췄습니다.

```text
(gdb) python BigMalloc()
Breakpoint 3 at 0xfffff7e67804: malloc. (46 locations)
(gdb) run
big malloc: 281474842453488 bytes
#0  malloc (size=40) at ../include/rtld-malloc.h:56
#1  _dl_init_paths (llp=<optimized out>, ...) at ./elf/dl-load.c:700

Breakpoint 3.17, malloc (size=40) at ../include/rtld-malloc.h:56
```

`(46 locations)`가 단서입니다. `malloc`이라는 이름은 libc의 진입점뿐 아니라 동적 로더(ld.so) 안의 인라인 `malloc` 래퍼에도 붙어 있어서, 46곳 모두에 breakpoint가 걸렸습니다. glibc 2.41 `include/rtld-malloc.h` 53~57행이 그 래퍼로, `__extern_inline`으로 정의돼 ld.so의 `__rtld_malloc` 함수 포인터를 부릅니다. 처음부터 실행하면 ld.so가 `main` 전에 그 래퍼를 지나가고, 인라인된 자리에서는 `$x0`이 인자 값이 아닙니다. `main` 뒤에 설치한 `LogAllocs`가 멀쩡했던 것은 ld.so의 초기화가 이미 끝난 뒤였기 때문입니다.

libc의 진입 함수 `__libc_malloc`에만 걸면 위치가 하나로 줄고 값도 맞습니다. 실행 전에는 libc가 아직 로드되지 않아 pending으로 걸렸다가, 로드되면서 확정됩니다.

```text
(gdb) python BigLibcMalloc()
Function "__libc_malloc" not defined.
Breakpoint 1 (__libc_malloc) pending.
(gdb) run
big malloc: 2097152 bytes
#0  __GI___libc_malloc (bytes=2097152) at ./malloc/malloc.c:3392
#1  0x0000aaaaaaaa09d4 in main () at server.c:22

Breakpoint 1, __GI___libc_malloc (bytes=2097152) at ./malloc/malloc.c:3392
(gdb) info breakpoints
1       breakpoint     keep y   0x0000fffff7e67804 in __GI___libc_malloc at ./malloc/malloc.c:3392
```

`BigLibcMalloc`은 `BigMalloc`에서 spec만 `"__libc_malloc"`으로 바꾼 클래스입니다. 이 이름은 Debian 13 glibc 2.41 기준이고 libc 구현마다 다를 수 있으므로, 다른 환경에서는 `info breakpoints`의 위치 수와 `bt`로 먼저 확인합니다.

### Watchpoint 서브클래스

두 번째 인자로 `gdb.BP_WATCHPOINT`를 주면 `watch` 명령과 같은 watchpoint가 됩니다. `stop()`에서 값을 찍고 `False`를 돌려주면 쓰기 로그만 남깁니다.

```python
class TrackWrites(gdb.Breakpoint):
    def __init__(self, expr):
        self.expr = expr
        super().__init__(expr, gdb.BP_WATCHPOINT, gdb.WP_WRITE)
    def stop(self):
        val = gdb.parse_and_eval(self.expr)
        gdb.write(f"{self.expr} = {val}\n")
        return False
```

```text
(gdb) python TrackWrites("g_counter")
Hardware watchpoint 2: g_counter
(gdb) continue
Continuing.
g_counter = 1
g_counter = 3
g_counter = 6
total=60 lib=3
[Inferior 1 (process 3127) exited normally]
```

`send_response(1..3)`이 `g_counter`에 1, 2, 3을 더한 누적값이 그대로 찍혔습니다.

### Internal vs User

매뉴얼에 따르면 `internal=True`로 만든 breakpoint는 만들 때 보고되지 않고 `info breakpoints`에도 나오지 않지만, `maint info breakpoints`에는 음수 번호로 나옵니다. 바로 아래 `ReturnWatch`가 internal이라 그 모습을 볼 수 있습니다.

```python
super().__init__("malloc", internal=True)
```

## .gdbinit으로 자동 로드

자주 쓰는 도구는 사용자 init 파일에 등록합니다. GDB 16.3 매뉴얼 Initialization Files 절에 따르면 Linux에서는 `$XDG_CONFIG_HOME/gdb/gdbinit`, `~/.config/gdb/gdbinit`, `~/.gdbinit` 순서로 찾아 처음 발견한 파일 하나만 읽습니다. 아래 경고 문구도 `~/.config/gdb/gdbinit`을 가리킵니다.

```text
# ~/.config/gdb/gdbinit
set history save on
set print pretty on

python
import sys
sys.path.insert(0, '/home/me/gdb-helpers')
import myhelpers
myhelpers.register_all()
end
```

프로젝트 디렉터리의 `.gdbinit`은 다릅니다. 매뉴얼 Init File in the Current Directory 절은 현재 디렉터리의 `.gdbinit`을 읽으려면 `auto-load safe-path`가 그 파일을 허용해야 한다고 적습니다. `echo` 한 줄짜리 `.gdbinit`을 둔 디렉터리에서 GDB를 띄워 확인했습니다.

```text
$ gdb -q -batch -ex "info auto-load local-gdbinit"
warning: File "/root/ext/ch02/proj/.gdbinit" auto-loading has been declined by your `auto-load safe-path' set to "$debugdir:$datadir/auto-load".
To enable execution of this file add
	add-auto-load-safe-path /root/ext/ch02/proj/.gdbinit
line to your configuration file "/root/.config/gdb/gdbinit".
...
Local .gdbinit file "/root/ext/ch02/proj/.gdbinit" has not been loaded.

$ gdb -q -batch -iex "add-auto-load-safe-path /root/ext/ch02/proj/.gdbinit" -ex "info auto-load local-gdbinit"
project .gdbinit loaded
Local .gdbinit file "/root/ext/ch02/proj/.gdbinit" has been loaded.
```

허용은 *이미 신뢰받는 곳*(사용자 init 파일이나 명령줄의 `-iex`)에서 해야 합니다. 프로젝트 `.gdbinit` 자신은 아직 읽히지 않았으므로 스스로를 허용할 수 없습니다. 경고 문구가 함께 안내하는 `set auto-load safe-path /`는 모든 경로를 허용하므로, 받은 저장소의 스크립트가 GDB를 띄우기만 해도 실행됩니다. 위처럼 파일 하나만 지정하는 편이 안전합니다.

## 자주 쓰는 패턴

### 1. 반환값 관찰 — FinishBreakpoint

함수의 반환값은 함수가 *끝날 때* 생깁니다. 매뉴얼 Finish Breakpoints in Python 절의 `gdb.FinishBreakpoint`는 지정한 프레임의 반환 주소에 임시 breakpoint를 걸고, 정상 반환이면 `return_value`에 값을 담습니다. `longjmp`나 C++ 예외로 프레임을 벗어나면 `out_of_scope()`가 불립니다.

```python title="bps.py (발췌)"
class ReturnWatch(gdb.FinishBreakpoint):
    def __init__(self):
        super().__init__(gdb.newest_frame(), internal=True)
    def stop(self):
        value = self.return_value
        gdb.write("return unavailable\n" if value is None else f"return: {value}\n")
        return True
    def out_of_scope(self):
        gdb.write("frame left without a captured normal return\n")
```

`send_response`에 멈춘 상태에서 설치했습니다.

```text
Breakpoint 1, send_response (id=1) at server.c:13
(gdb) python ReturnWatch()
(gdb) info breakpoints
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x0000aaaaaaaa08f0 in send_response at server.c:13
	breakpoint already hit 1 time
(gdb) maint info breakpoints
...
-5      breakpoint     del  y   0x0000aaaaaaaa0978 in handle_packet at server.c:14 inf 1
	stop only in thread 1
-5.1                        y   0x0000aaaaaaaa0978 in handle_packet at server.c:14 inf 1
	stop only in stack frame at 0x0000fffffffffa50
(gdb) continue
Continuing.
return: 10

Breakpoint -5, handle_packet (id=1) at server.c:14
```

`info breakpoints`에는 없고 `maint info breakpoints`에만 `-5`번으로 있습니다. 호출자 `handle_packet` 안의 반환 지점에 걸렸고, "그 스레드에서만", "그 스택 프레임에서만" 멈추는 조건이 붙어 있습니다. 재귀 호출이 있어도 지정한 프레임의 반환만 잡는 이유입니다.

이 클래스는 `stop()` 바깥, 즉 사용자가 멈춘 상태에서 만들었습니다. 매뉴얼은 `Breakpoint.stop()` 안에서 디버기 실행 상태를 바꾸거나(step, next 등), 현재 프레임을 바꾸거나, breakpoint를 추가·삭제하지 말라고 적습니다. 그래서 `malloc` 진입 breakpoint의 `stop()` 안에서 `FinishBreakpoint`를 만들어 반환값을 모으는 방식은 쓰지 않았습니다. 할당 추적 자체가 목적이라면 [Valgrind Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)나 [ASan/LSan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)이 맞는 도구입니다.

### 2. 함수 호출 통계

`stop()`에서 숫자만 세고 `False`를 돌려주면 프로그램을 멈추지 않고 호출 횟수를 셉니다. `exited` 이벤트에서 결과를 찍습니다.

```python title="bps.py (발췌)"
class CountCalls(gdb.Breakpoint):
    def __init__(self, fn):
        super().__init__(fn, internal=True)
        self.count = 0
        self.name = fn
    def stop(self):
        self.count += 1
        return False

def install_counters():
    global watchers
    watchers = [CountCalls(fn) for fn in ['process_request', 'handle_packet', 'send_response']]
    def report(_evt=None):
        for w in watchers:
            gdb.write(f"{w.name}: {w.count} calls\n")
    gdb.events.exited.connect(report)
```

```text
(gdb) python install_counters()
(gdb) info breakpoints
No breakpoints, watchpoints, tracepoints, or catchpoints.
(gdb) run
total=60 lib=3
[Inferior 1 (process 3191) exited normally]
process_request: 3 calls
handle_packet: 3 calls
send_response: 3 calls
```

breakpoint는 함수의 *심볼 위치*에 걸리므로 셀 수 있는 것도 그 위치를 지난 횟수입니다. `-O2`로 빌드해 함수가 호출 지점에 인라인되면 그 호출은 세어지지 않습니다. 이 프로그램은 `-O0`이라 세 번이 정확합니다.

## 헤드리스 모드 — batch

`-batch`는 명령을 다 실행하면 끝나는 모드입니다. 매뉴얼 Mode Options 절에 따르면 페이지 나눔을 끄고 `set confirm off`처럼 동작하며, 명령 *파일*(`-x`)에서 오류가 나면 0이 아닌 종료 코드를 냅니다. CI에서 크래시 정보를 모을 때 씁니다.

```bash
gdb -batch -ex 'source script.py' -ex 'run' -ex 'quit' --args ./prog
```

널 포인터를 따라가는 `buggy.c`에 크래시 수집 명령을 붙여 돌렸습니다.

```text
$ gdb -batch -ex run -ex bt -ex "info threads" -ex "thread apply all bt" --args ./buggy

Program received signal SIGSEGV, Segmentation fault.
0x0000aaaaaaaa07bc in sum (n=0x10) at buggy.c:3
3	int sum(struct node *n) { int s = 0; while (n) { s += n->value; n = n->next; } return s; }
#0  0x0000aaaaaaaa07bc in sum (n=0x10) at buggy.c:3
#1  0x0000aaaaaaaa0830 in main () at buggy.c:6
  Id   Target Id                                Frame
* 1    Thread 0xfffff7ff0020 (LWP 3341) "buggy" 0x0000aaaaaaaa07bc in sum (n=0x10) at buggy.c:3

Thread 1 (Thread 0xfffff7ff0020 (LWP 3341) "buggy"):
#0  0x0000aaaaaaaa07bc in sum (n=0x10) at buggy.c:3
#1  0x0000aaaaaaaa0830 in main () at buggy.c:6
$ echo $?
0
```

종료 코드가 0이라는 점에 주의합니다. 디버기가 크래시해도 GDB 명령 자체는 성공했기 때문입니다. CI에서 크래시 여부로 실패를 내려면 정상 종료 때만 값이 생기는 `$_exitcode`(매뉴얼 Convenience Variables 절)나 시그널 정보 `$_siginfo`를 스크립트에서 검사해 직접 판정합니다.

## 정리

- `gdb.Command` 서브클래스로 새 명령을 만들고, `COMMAND_*`로 `help` 분류를, `COMPLETE_*`로 자동 완성을 정합니다.
- 직접 만든 `complete()`는 `completer_class`를 주지 않았을 때만 불리고, `word`가 `None`인 호출도 받습니다.
- `gdb.Parameter`로 `set`/`show` 옵션을 둡니다. 0을 평범한 값으로 쓰려면 `PARAM_ZINTEGER`입니다.
- `gdb.Function`의 `$name(...)`은 breakpoint 조건 안에서도 동작합니다.
- `gdb.events.*` 연결은 다시 source할 때 끊어 줘야 쌓이지 않습니다. 다른 스레드에서는 `gdb.post_event()`만 씁니다.
- `malloc` 같은 이름은 ld.so 안에도 있어 46곳에 걸렸습니다. `(N locations)`를 확인하고 필요하면 `__libc_malloc`처럼 좁힙니다.
- `internal=True` breakpoint는 `maint info breakpoints`에서만 보이고, `FinishBreakpoint`는 지정한 스레드·프레임의 반환만 잡습니다.
- `gdb -batch`는 디버기가 크래시해도 0으로 끝납니다.

## 다음 장 예고

[Ch 3](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers) — Pretty-printer 깊이. `to_string`/`children`/`display_hint`, MI 출력, auto-load.

## 관련 항목

- [Ch 1: Python API 입문](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)
- [Ch 3: Pretty-printer 깊이](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)
- [GDB Python Commands](https://sourceware.org/gdb/current/onlinedocs/gdb.html/CLI-Commands-In-Python.html)
- [GDB Events](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Events-In-Python.html)
- [GDB and LLDB Ch 5: Breakpoint·Watchpoint](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints) — CLI `commands`·조건부 breakpoint

## 검증 기준

모든 세션은 Debian 13 arm64 VM의 GDB 16.3(Debian 16.3-1)과 GCC 14.2.0으로 `server.c`·`buggy.c`·`libmylib.so`를 `-g -O0`으로 빌드해 돌렸습니다. API 설명은 GDB 16.3 tarball의 `gdb/doc/python.texi`(Basic Python의 `post_event`, CLI Commands In Python, Parameters In Python, Breakpoints In Python, Finish Breakpoints in Python 절), `gdb/doc/gdb.texinfo`(Mode Options의 `-batch`, Init File in the Current Directory 절), `gdb/python/py-cmd.c`, glibc 2.41 `include/rtld-malloc.h`, AAPCS64(ARM-software/abi-aa) General-purpose Registers 절과 대조했습니다.
