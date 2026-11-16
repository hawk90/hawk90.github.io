---
title: "GDB FrameDecorator·Unwinder — 콜스택 가공과 JIT 지원"
slug: "tools/debugging/gdb-extension/chapter04-frame-unwinder"
date: 2026-05-27T09:04:00
description: "Frame filter·FrameDecorator의 표시와 실제 unwind를 구분합니다. 고정한 AArch64 fixture의 caller 복원, GDB JIT 등록과 runtime helper의 경계를 살펴봅니다."
tags: [gdb, python, frame, unwinder, jit]
series: "GDB Extension and IDE"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

래퍼 함수가 겹겹이 쌓인 콜스택, C++20 coroutine의 resume 프레임, CFI(Call Frame Information)가 없는 손으로 짠 어셈블리나 JIT 코드까지, 표준 `bt`로는 정리되지 않는 콜스택이 많습니다. GDB는 성격이 전혀 다른 두 장치로 이를 다룹니다.

- **Frame Filter / FrameDecorator** — 이미 풀린 프레임 목록을 *숨기거나 접거나 꾸밉니다*. 표시만 바꾸고 실제 프레임은 건드리지 않습니다.
- **Unwinder** — GDB가 스스로 풀지 못하는 프레임에서 *호출자의 레지스터*를 Python으로 알려 줍니다. 콜스택 자체가 늘어납니다.

전자는 지도 위에 형광펜을 긋는 일이고, 후자는 지도에 없던 길을 그려 넣는 일입니다. 이 장의 코드는 모두 Debian 13 arm64 VM의 GDB 16.3(Debian 16.3-1)과 GCC 14.2.0에서 돌렸습니다. unwinder 예제는 AArch64 어셈블리로 짠 trampoline 하나를 고정 fixture로 씁니다.

## Frame Filter

`bt`가 출력할 프레임 목록을 가로채 *수정*합니다. GDB 16.3 매뉴얼 Frame Filter API 절에 따르면 `filter()`는 프레임 decorator들의 iterator를 받아 iterator를 돌려줘야 하고, 첫 filter가 받는 항목은 각 `gdb.Frame`을 감싼 기본 `FrameDecorator`입니다. 그래서 `frame.function()`은 `gdb.Symbol`이 아니라 함수 이름 문자열(또는 주소)을 돌려줍니다.

실습 프로그램 `frames.cpp`는 `Handler::handle()` → `detail::invoke1` → `invoke2` → `invoke3` → `critical_section()`으로 부르는 구조입니다. 실무의 콜백 디스패처나 라이브러리 내부 래퍼처럼, 사람이 보고 싶은 것은 양 끝이고 가운데 `detail::`은 잡음입니다.

```text
#0  critical_section (v=101) at frames.cpp:11
#1  0x0000aaaaaaaa07c4 in detail::invoke3 (fn=0xaaaaaaaa0814 <critical_section(int)>, v=101) at frames.cpp:5
#2  0x0000aaaaaaaa07e8 in detail::invoke2 (fn=0xaaaaaaaa0814 <critical_section(int)>, v=101) at frames.cpp:6
#3  0x0000aaaaaaaa080c in detail::invoke1 (fn=0xaaaaaaaa0814 <critical_section(int)>, v=101) at frames.cpp:7
#4  0x0000aaaaaaaa08a0 in Handler::handle (this=0xfffffffffa88, req=1) at frames.cpp:17
#5  0x0000aaaaaaaa085c in main () at frames.cpp:22
```

`detail::`로 시작하는 프레임을 빼는 filter입니다. `gdb.frame_filters` 사전에 넣으면 전역 filter가 됩니다.

```python title="filters.py (발췌)"
import gdb
from gdb.FrameDecorator import FrameDecorator

class SkipDetailFilter:
    """detail:: 네임스페이스 프레임을 bt에서 숨긴다."""
    def __init__(self):
        self.name = "skip-detail"
        self.priority = 100
        self.enabled = False            # 기본은 꺼 둔다
        gdb.frame_filters[self.name] = self
    def filter(self, frame_iter):
        for frame in frame_iter:
            name = frame.function()
            name = name if isinstance(name, str) else ""
            if not name.startswith("detail::"):
                yield frame
```

```text
(gdb) source filters.py
(gdb) enable frame-filter global skip-detail
(gdb) bt
#0  critical_section (v=101) at frames.cpp:11
#4  0x0000aaaaaaaa08a0 in Handler::handle (this=0xfffffffffa88, req=1) at frames.cpp:17
#5  0x0000aaaaaaaa085c in main () at frames.cpp:22
(gdb) bt -no-filters
#0  critical_section (v=101) at frames.cpp:11
#1  0x0000aaaaaaaa07c4 in detail::invoke3 (...) at frames.cpp:5
...
```

번호가 `#0`, `#4`, `#5`로 건너뛰는 점을 눈여겨봅니다. filter는 실제 프레임 번호를 바꾸지 않으므로 `frame 4`는 여전히 `Handler::handle`입니다. 숨긴 프레임을 보고 싶으면 `bt -no-filters`를 씁니다.

### priority

매뉴얼에 따르면 `priority`는 필수 정수이고 클수록 먼저 실행되며, 같은 priority끼리는 순서가 정해져 있지 않습니다. 매뉴얼이 권하는 기본값은 100입니다. 이 장의 filter 넷을 등록한 직후의 목록입니다.

```text
(gdb) info frame-filter
global frame-filters:
  Priority  Enabled  Name
  100       No       skip-detail
  100       No       fold-detail
  50        No       highlight-critical
  10        No       drop-this
```

priority 100인 filter가 먼저 프레임을 접고, 50인 filter가 그 결과를 받아 꾸미는 식으로 이어집니다. 앞 filter가 감싼 decorator를 뒤 filter가 다시 감쌀 수 있다는 것도 매뉴얼에 적혀 있습니다.

### enable/disable

`enable frame-filter`/`disable frame-filter`의 첫 인자는 사전 이름(`global`, `progspace`, objfile 이름)이고 둘째가 filter 이름입니다. 위 세션의 `enable frame-filter global skip-detail`이 그 형식입니다.

## FrameDecorator — 프레임 모양 변경

`FrameDecorator`를 상속해 `function()`·`address()`·`frame_args()`·`filename()` 같은 메서드를 덮어쓰면 한 프레임의 *표시*가 바뀝니다. 매뉴얼 Frame Decorator API 절이 이 메서드 목록을 정합니다. 이름에 `critical`이 든 함수에 표시를 붙여 보았습니다.

```python
class HighlightDecorator(FrameDecorator):
    def function(self):
        name = super().function()
        if isinstance(name, str) and "critical" in name:
            return f"[!] {name}"
        return name

class HighlightFilter:
    def __init__(self):
        self.name = "highlight-critical"
        self.priority = 50
        self.enabled = False
        gdb.frame_filters[self.name] = self
    def filter(self, frame_iter):
        return map(HighlightDecorator, frame_iter)
```

### 래퍼 프레임 접기

연속된 `detail::` 프레임을 하나의 decorator로 묶습니다. 묶음의 첫 프레임을 감싸고 `function()`이 개수를 돌려줍니다.

```python
class FoldedFrame(FrameDecorator):
    def __init__(self, frames):
        super().__init__(frames[0])
        self.frames = frames
    def function(self):
        return f"[{len(self.frames)} detail:: frames]"
    def frame_args(self):
        return None
    def filename(self):
        return None

class FoldDetailFilter:
    """연속된 detail:: 프레임을 한 줄로 접는다."""
    def __init__(self):
        self.name = "fold-detail"
        self.priority = 100
        self.enabled = False
        gdb.frame_filters[self.name] = self
    def filter(self, frame_iter):
        buffer = []
        for frame in frame_iter:
            name = frame.function()
            name = name if isinstance(name, str) else ""
            if name.startswith("detail::"):
                buffer.append(frame)
                continue
            if buffer:
                yield FoldedFrame(buffer)
                buffer = []
            yield frame
        if buffer:
            yield FoldedFrame(buffer)
```

`fold-detail`을 켜고, 이어서 `highlight-critical`을 켰습니다.

```text
(gdb) enable frame-filter global fold-detail
(gdb) bt
#0  critical_section (v=101) at frames.cpp:11
#1  0x0000aaaaaaaa07c4 in [3 detail:: frames] ():5
#4  0x0000aaaaaaaa08a0 in Handler::handle (this=0xfffffffffa88, req=1) at frames.cpp:17
#5  0x0000aaaaaaaa085c in main () at frames.cpp:22
(gdb) enable frame-filter global highlight-critical
(gdb) bt
#0  [!] critical_section (v=101) at frames.cpp:11
#1  0x0000aaaaaaaa07c4 in [3 detail:: frames] ():5
...
```

접힌 줄 끝의 `:5`는 `filename()`만 `None`으로 바꾸고 `line()`은 첫 프레임(`invoke3`의 5행) 값을 그대로 둔 결과입니다. 어떤 메서드를 덮어쓸지가 출력 모양을 그대로 정한다는 것을 보여 줍니다.

### C++20 coroutine의 실제 콜스택

coroutine 콜스택도 같은 방법으로 접을 수 있을까요. 먼저 GCC 14에서 실제로 어떻게 보이는지 확인했습니다. `worker()` coroutine을 `main()`에서 `resume()`한 지점입니다.

```text
#0  worker(_Z6workeri.Frame *) (frame_ptr=0xaaaaaaad32b0) at coro.cpp:17
#1  0x0000aaaaaaaa0f1c in std::__n4861::coroutine_handle<Task::promise_type>::resume (this=0xfffffffffa98) at /usr/include/c++/14/coroutine:242
#2  0x0000aaaaaaaa0db4 in main () at coro.cpp:23
```

coroutine 본문은 `worker(_Z6workeri.Frame *)`라는 이름의 함수로 나오고, 그 위에 libstdc++의 `std::__n4861::coroutine_handle<...>::resume`이 있습니다. `__n4861`은 `/usr/include/c++/14/coroutine` 64행의 `inline namespace __n4861`입니다. 그 위의 호출자는 `resume()`을 부른 `main()`일 뿐, coroutine을 기다리던 논리적인 부모가 아닙니다. frame filter로 `resume` 프레임을 숨길 수는 있지만, 물리 스택에 없는 논리적 부모를 만들어 낼 수는 없습니다. 그러려면 coroutine 프레임(`frame_ptr`)의 구조를 아는 별도 도구가 필요합니다.

## frame_args() — 인자 표시 커스터마이즈

매뉴얼 Frame Decorator API 절에 따르면 `frame_args()`는 `symbol()`과 `value()` 메서드를 가진 객체의 iterable을 돌려줘야 하고, `None`이나 빈 iterable이면 인자를 찍지 않습니다. 기본 구현의 항목은 `gdb/FrameDecorator.py` 230행의 `SymValueWrapper(frame, symbol)`입니다. 매뉴얼 예제에도 같은 이름의 `SymValueWrapper(symbol, value)` 클래스가 나오지만, 그것은 사용자가 직접 정의하는 예이고 생성자 인자도 다릅니다. 기존 항목을 걸러서 그대로 돌려주면 이런 차이를 신경 쓸 필요가 없습니다.

C++ 메서드 프레임에서 `this`를 빼는 decorator입니다.

```python title="filters.py (발췌)"
class DropThisDecorator(FrameDecorator):
    def frame_args(self):
        original = super().frame_args()
        if original is None:
            return None
        return [a for a in original if str(a.symbol()) != "this"]
```

```text
(gdb) enable frame-filter global drop-this
(gdb) bt
#0  [!] critical_section (v=101) at frames.cpp:11
#1  0x0000aaaaaaaa07c4 in [3 detail:: frames] ():5
#4  0x0000aaaaaaaa08a0 in Handler::handle (req=1) at frames.cpp:17
#5  0x0000aaaaaaaa085c in main () at frames.cpp:22
```

`Handler::handle`의 `this=0xfffffffffa88`이 사라졌습니다. 세 filter(priority 100, 50, 10)가 차례로 적용된 결과입니다.

## Unwinder — CFI 없이 콜스택 풀기

filter와 달리 unwinder는 표시가 아니라 *호출자 프레임의 레지스터와 프레임 ID*를 GDB에 알려 줍니다. GDB는 보통 DWARF CFI(`.eh_frame`/`.debug_frame`)로 호출자를 찾고, 없으면 아키텍처별 prologue 분석으로 짐작합니다. 둘 다 실패하는 코드가 손으로 짠 어셈블리와 JIT 코드입니다.

### 실패하는 예

전용 스택으로 갈아탄 뒤 콜백을 부르는 AArch64 trampoline을 CFI 지시어 없이 짰습니다. 호출자의 `sp`, `x29`, `x30`을 전용 스택에 저장하고, 프레임 체인을 끊으려고 `x29`를 0으로 만듭니다.

```text title="tramp.S (발췌)"
toy_trampoline:                 // void toy_trampoline(void (*fn)(void))
        adrp    x9, toy_stack_top
        add     x9, x9, :lo12:toy_stack_top
        mov     x10, sp
        stp     x29, x30, [x9, #-16]!   // [top-16] = 호출자 x29, x30
        stp     x10, xzr, [x9, #-16]!   // [top-32] = 호출자 sp
        mov     sp, x9
        mov     x29, xzr                // 프레임 체인을 끊는다
        blr     x0
        ldp     x10, xzr, [sp], #16
        ldp     x29, x30, [sp], #16
        mov     sp, x10
        ret
        .global toy_trampoline_end
toy_trampoline_end:
```

`main()` → `dispatch()` → `toy_trampoline(jit_callback)` → `jit_callback()` 순서인데, `jit_callback`에서 멈추면 GDB는 trampoline에서 길을 잃습니다.

```text
(gdb) bt
#0  jit_callback () at unw.c:8
#1  0x0000aaaaaaaa0860 in toy_trampoline () at tramp.S:19
Backtrace stopped: previous frame identical to this frame (corrupt stack?)
```

### Python unwinder

매뉴얼 Unwinding Frames in Python 절의 계약은 이렇습니다. unwinder는 `name`·`enabled` 속성과 `__call__(pending_frame)`을 갖고, 자기가 맡을 프레임이 아니면 `None`을, 맡으면 `pending_frame.create_unwind_info(frame_id)`로 만든 `gdb.UnwindInfo`에 호출자 레지스터를 `add_saved_register()`로 채워 돌려줍니다. 위 trampoline은 저장 위치가 고정이므로 PC가 trampoline 안일 때만 그 위치를 읽으면 됩니다.

```python title="toy_unwinder.py"
import gdb
import gdb.unwinder
from gdb.unwinder import FrameId

class ToyTrampolineUnwinder(gdb.unwinder.Unwinder):
    """toy_trampoline 안의 프레임만 푼다. 전용 스택 레이아웃:
       [sp] = 호출자 sp, [sp+16] = 호출자 x29, [sp+24] = 호출자 x30"""
    def __init__(self):
        super().__init__("toy-trampoline")
        self.start = int(gdb.parse_and_eval("(long)&toy_trampoline"))
        self.end = int(gdb.parse_and_eval("(long)&toy_trampoline_end"))

    def __call__(self, pending_frame):
        pc = int(pending_frame.read_register("pc"))
        if not self.start <= pc < self.end:
            return None                       # 내 담당이 아니면 다음 unwinder로
        sp = int(pending_frame.read_register("sp"))
        raw = bytes(gdb.selected_inferior().read_memory(sp, 32))
        saved = {
            "sp": int.from_bytes(raw[0:8], "little"),
            "x29": int.from_bytes(raw[16:24], "little"),
            "pc": int.from_bytes(raw[24:32], "little"),
        }
        info = pending_frame.create_unwind_info(FrameId(sp, self.start))
        for reg, value in saved.items():
            reg_type = pending_frame.read_register(reg).type
            info.add_saved_register(reg, gdb.Value(value).cast(reg_type))
        return info

gdb.unwinder.register_unwinder(None, ToyTrampolineUnwinder(), replace=True)
```

호출자의 `pc`에는 저장해 둔 `x30`(복귀 주소)을 넣습니다. 처음에는 `add_saved_register("pc", caller_pc)`처럼 Python 정수를 넘겼다가 `TypeError: argument 2 must be gdb.Value, not int`가 났습니다. 레지스터 타입으로 `cast`한 `gdb.Value`를 넘겨야 합니다.

```text
(gdb) source toy_unwinder.py
(gdb) bt
#0  jit_callback () at unw.c:8
#1  0x0000aaaaaaaa0860 in toy_trampoline () at tramp.S:19
#2  0x0000aaaaaaaa0808 in dispatch () at unw.c:10
#3  0x0000aaaaaaaa0820 in main () at unw.c:11
(gdb) info unwinder
Global:
  toy-trampoline
(gdb) frame 2
#2  0x0000aaaaaaaa0808 in dispatch () at unw.c:10
(gdb) info frame
Stack level 2, frame at 0xfffffffffa90:
 pc = 0xaaaaaaaa0808 in dispatch (unw.c:10); saved pc = 0xaaaaaaaa0820
 called by frame at 0xfffffffffaa0, caller of frame at 0xaaaaaaac1030
...
(gdb) disable unwinder global toy-trampoline
1 unwinder disabled
(gdb) bt
#0  jit_callback () at unw.c:8
#1  0x0000aaaaaaaa0860 in toy_trampoline () at tramp.S:19
Backtrace stopped: previous frame identical to this frame (corrupt stack?)
```

unwinder가 trampoline 프레임의 호출자를 알려 주자, 그 위의 `dispatch`·`main`은 GDB가 원래대로 DWARF CFI로 풀었습니다. `dispatch`의 프레임 주소(`0xfffffffffa90`)가 원래 스택이고 trampoline 쪽(`0xaaaaaaac1030`)이 전용 스택이라는 것도 `info frame`에서 보입니다.

매뉴얼은 unwinder가 가능한 한 적게 일해야 하며, unwinder 안에서 디버기 함수를 부르면 GDB의 unwind 과정이 초기화돼 재진입할 수 있다고 경고합니다. 위 코드가 심볼 주소를 생성자에서 한 번만 계산하고 `__call__`에서는 레지스터와 메모리 32바이트만 읽는 이유입니다. 같은 절은 `PendingFrame`이 unwinder 호출이 끝나면 무효가 된다고도 적습니다.

## 실전 — V8 디버깅

V8 저장소의 `tools/gdbinit`은 Python unwinder가 아니라 GDB 명령 매크로 모음입니다. 2026-07-03 커밋(`main` 브랜치)의 파일을 받아 보니 `job`(`_v8_internal_Print_Object`를 디버기 안에서 호출해 객체 출력), `jco`, `jst`, `jss` 같은 `define` 명령이 있었습니다. 이 중 `jss`의 도움말은 "Skip the jitted stack on x64 to where we entered JS last"이고, 본문은 `$rbp`·`$rsp`·`$pc`를 직접 덮어씁니다. 즉 x64 전용이며, JIT 프레임을 풀어 주는 것이 아니라 건너뜁니다. 이 장에서는 V8을 빌드해 돌리지 않았습니다.

## 인터프리터 — CPython의 GDB 헬퍼

CPython은 C로 구현돼 있어서, Python 프로그램이 크래시하면 `bt`에는 C 함수만 나옵니다. CPython은 Python 프레임을 해석해 주는 GDB 스크립트(`Tools/gdb/libpython.py`)를 제공하고, Debian에서는 `python3.13-dbg` 패키지가 `/usr/share/gdb/auto-load/usr/bin/python3.13-gdb.py`로 설치합니다. 패키지만 깔려 있으면 auto-load됩니다.

`ctypes.string_at(0)`으로 일부러 SIGSEGV를 낸 `myapp.py`를 돌렸습니다.

```python title="myapp.py"
import ctypes

def compute(x):
    return ctypes.string_at(x)      # x=0 -> SIGSEGV

def process_data(req):
    result = compute(req)
    return result

def main():
    process_data(0)

main()
```

```text
$ gdb -q -nx -batch -ex run -ex py-bt -ex "bt 3" --args python3 myapp.py
Program received signal SIGSEGV, Segmentation fault.
__strlen_asimd () at ../sysdeps/aarch64/multiarch/strlen_asimd.S:96
Traceback (most recent call first):
  File "/usr/lib/python3.13/ctypes/__init__.py", line 538, in string_at
    return _string_at(ptr, size)
  File "/root/ext/ch04/myapp.py", line 4, in compute
    return ctypes.string_at(x)      # x=0 -> SIGSEGV
  File "/root/ext/ch04/myapp.py", line 7, in process_data
    result = compute(req)
  File "/root/ext/ch04/myapp.py", line 11, in main
    process_data(0)
  File "/root/ext/ch04/myapp.py", line 13, in <module>
    main()
#0  __strlen_asimd () at ../sysdeps/aarch64/multiarch/strlen_asimd.S:96
#1  0x0000fffff79d80d4 in string_at (ptr=0x0, size=-1) at ../Modules/_ctypes/_ctypes.c:5615
#2  0x0000fffff79a6a94 [PAC] in ?? () from /lib/aarch64-linux-gnu/libffi.so.8
```

같은 크래시의 C 콜스택은 25프레임이었고, 그중 `_PyEval_EvalFrameDefault`는 한 프레임뿐이었습니다. Python 함수 네 개(`<module>` → `main` → `process_data` → `compute`)가 C 스택에서는 프레임 하나로 겹쳐 있다는 뜻이라, `bt`만으로는 어느 Python 함수에서 죽었는지 알 수 없습니다. `py-bt`는 그 프레임 안의 Python 프레임 객체를 읽어 traceback을 다시 만듭니다. 설치된 스크립트 2037행의 `class PyBacktrace(gdb.Command)`, 즉 unwinder가 아니라 [Ch 2](/blog/tools/debugging/gdb-extension/chapter02-commands-events)의 사용자 명령으로 만든 도구입니다.

## JVM과 혼합 언어 프레임

GDB 16.3 매뉴얼 Unwinding Frames in Python 절은 Python unwinder가 필요한 예로 "Java Virtual Machine을 돌리는 응용처럼, GDB 내장 unwinder가 다루지 못하는 프레임 레이아웃을 쓰는 혼합 언어 응용"을 듭니다. 이 장에서는 JVM을 붙여 보지 않았으므로 JVM 쪽 도구에 대해서는 적지 않습니다.

## GDB JIT Interface와 Runtime Unwind

GDB 16.3 매뉴얼 JIT Compilation Interface 장에 따르면, JIT 컴파일러는 전역 변수 `__jit_debug_descriptor`에 in-memory 심볼 파일 정보를 쓰고 `__jit_debug_register_code()` 함수를 부르는 방식으로 GDB에 코드를 등록합니다. GDB는 붙을 때 전역 변수의 연결 리스트에서 이미 있는 심볼 파일을 읽고, 그 함수에 breakpoint를 걸어 두어 새 코드가 등록될 때마다 알게 됩니다. 매뉴얼은 이 구조가 동적 로더 인터페이스를 본뜬 것이며, 작성 시점에 알려진 사용자는 LLVM JIT뿐이라고 적습니다.

이 인터페이스로 등록하는 것은 *심볼 파일*입니다. 위의 Python unwinder는 심볼 파일 없이 레지스터 복원 규칙을 Python으로 직접 주는 다른 경로입니다. 두 방법은 [JIT interface](https://sourceware.org/gdb/current/onlinedocs/gdb.html/JIT-Interface.html)와 Unwinding Frames in Python 절에 각각 정의돼 있습니다.

## frame() / read_register() / function()

`gdb.Frame`의 주요 메서드를 위 `unw` 프로그램의 `jit_callback` 프레임에서 확인했습니다.

```text
(gdb) python f = gdb.selected_frame(); print(f.name(), f.function(), hex(f.pc()), f.is_valid(), f.architecture().name(), f.type() == gdb.NORMAL_FRAME, f.read_register("x30"), f.find_sal().line)
jit_callback jit_callback 0xaaaaaaaa07cc True aarch64 True 187649984432224 8
```

`read_register("x30")`의 187649984432224는 `0xaaaaaaaa0860`, 즉 `bt`의 `#1` 주소입니다. `older()`/`newer()`, `read_var()`, `find_sal()`은 [Ch 1](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)에서 보았습니다.

`frame.type()`의 값은 GDB 16.3에 다음 일곱 개가 있습니다. 설명은 매뉴얼 Frames In Python 절의 것입니다.

```text
(gdb) python print([c for c in dir(gdb) if c.endswith("_FRAME")])
['ARCH_FRAME', 'DUMMY_FRAME', 'INLINE_FRAME', 'NORMAL_FRAME', 'SENTINEL_FRAME', 'SIGTRAMP_FRAME', 'TAILCALL_FRAME']
```

| 상수 | 매뉴얼의 뜻 |
|------|-------------|
| `gdb.NORMAL_FRAME` | 일반 함수 프레임 |
| `gdb.DUMMY_FRAME` | GDB가 디버기 함수를 호출할 때 만든 가짜 프레임 |
| `gdb.INLINE_FRAME` | 더 바깥의 `NORMAL_FRAME`에 인라인된 함수의 프레임 |
| `gdb.TAILCALL_FRAME` | tail call로 사라진 함수의 프레임 |
| `gdb.SIGTRAMP_FRAME` | OS가 시그널 핸들러를 부를 때 만든 trampoline 프레임 |
| `gdb.ARCH_FRAME` | 아키텍처가 다른 코드로의 호출을 나타내는 가짜 프레임 |
| `gdb.SENTINEL_FRAME` | `NORMAL_FRAME`과 같지만 가장 안쪽(newest) 프레임에만 쓰임 |

## unwind_stop_reason — 왜 끊겼나

콜스택이 끊기면 가장 바깥 프레임의 `unwind_stop_reason()`이 이유를 알려 줍니다. 위 trampoline 예에서 unwinder를 넣기 전과 후를 비교했습니다.

```python title="stopreason.py"
import gdb

def outermost_reason():
    f = gdb.newest_frame()
    while f.older() is not None:
        f = f.older()
    reason = f.unwind_stop_reason()
    print(f.level(), f.name(), reason, gdb.frame_stop_reason_string(reason))
```

```text
(gdb) python outermost_reason()
1 toy_trampoline 5 previous frame identical to this frame (corrupt stack?)
(gdb) source toy_unwinder.py
(gdb) python outermost_reason()
3 main 0 no reason
```

unwinder가 없을 때는 `FRAME_UNWIND_SAME_ID`(5)였습니다. `x29`를 0으로 만든 탓에 GDB가 짐작한 호출자 프레임 ID가 현재 프레임과 같아졌고, 무한 루프를 막으려고 멈춘 것입니다. GDB 16.3에 있는 이유 상수와 `gdb/unwind_stop_reasons.def`의 설명 문구입니다.

| 상수 | `unwind_stop_reasons.def`의 설명 |
|------|------|
| `FRAME_UNWIND_NO_REASON` | no reason |
| `FRAME_UNWIND_NULL_ID` | unwinder did not report frame ID |
| `FRAME_UNWIND_OUTERMOST` | outermost |
| `FRAME_UNWIND_UNAVAILABLE` | not enough registers or memory available to unwind further |
| `FRAME_UNWIND_INNER_ID` | previous frame inner to this frame (corrupt stack?) |
| `FRAME_UNWIND_SAME_ID` | previous frame identical to this frame (corrupt stack?) |
| `FRAME_UNWIND_NO_SAVED_PC` | frame did not save the PC |
| `FRAME_UNWIND_MEMORY_ERROR` | memory error while unwinding |

`SAME_ID`와 `INNER_ID`의 문구에 "corrupt stack?"이 붙어 있지만, 위 예처럼 스택이 멀쩡해도 GDB가 레이아웃을 모르면 같은 이유로 멈춥니다. 손상을 의심하기 전에 그 PC가 CFI 없는 코드인지부터 확인합니다.

## 정리

- Frame filter는 이미 풀린 프레임의 *표시*를 바꿉니다. 숨긴 프레임도 번호는 그대로이고 `bt -no-filters`로 볼 수 있습니다.
- filter는 priority가 큰 순서로 실행되고, 앞 filter가 감싼 decorator를 뒤 filter가 다시 감쌉니다.
- FrameDecorator는 `function()`·`frame_args()`·`filename()` 등 덮어쓴 메서드만 출력에 반영합니다.
- GCC 14의 coroutine 콜스택은 `worker(_Z6workeri.Frame *)` 위에 `std::__n4861::coroutine_handle<...>::resume`과 resumer만 있습니다. 논리적 부모는 물리 스택에 없습니다.
- Unwinder는 호출자 레지스터를 알려 주는 별개의 장치입니다. CFI 없는 AArch64 trampoline에서 `bt`가 `SAME_ID`로 끊겼고, 30줄짜리 unwinder로 `main`까지 이어졌습니다.
- `add_saved_register()`에는 레지스터 타입으로 `cast`한 `gdb.Value`를 넘깁니다.
- CPython의 `py-bt`는 C 스택 25프레임 중 `_PyEval_EvalFrameDefault` 한 프레임에 겹친 Python 함수 넷을 traceback으로 다시 만듭니다.
- GDB JIT interface는 심볼 파일을 등록하는 길이고, Python unwinder는 레지스터 규칙을 직접 주는 길입니다.

## 다음 장 예고

[Ch 5](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol) — MI 프로토콜과 DAP 프로토콜. IDE 통합의 안쪽입니다.

## 관련 항목

- [Ch 3: Pretty-Printer 깊이](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)
- [Ch 5: MI / DAP 프로토콜](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)
- [GDB and LLDB Ch 4: Backtrace와 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames) — `bt`·`frame`·`info frame` 기본
- [Frame Filters API](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Frame-Filter-API.html)
- [Unwinding API](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Unwinding-Frames-in-Python.html)
- [V8 gdbinit](https://github.com/v8/v8/blob/main/tools/gdbinit)
- [CPython libpython.py](https://github.com/python/cpython/blob/main/Tools/gdb/libpython.py)

## 검증 기준

모든 세션은 Debian 13 arm64 VM의 GDB 16.3(Debian 16.3-1), GCC 14.2.0, Python 3.13.5(`python3.13-dbg`)로 `frames.cpp`·`coro.cpp`(`-std=c++20`)·`unw.c`+`tramp.S`·`myapp.py`를 돌렸습니다. API 설명은 GDB 16.3 tarball의 `gdb/doc/python.texi`(Frame Filter API, Frame Decorator API, Unwinding Frames in Python, Frames In Python 절), `gdb/doc/gdb.texinfo`(JIT Compilation Interface 장), `gdb/unwind_stop_reasons.def`, `gdb/python/lib/gdb/FrameDecorator.py`와 대조했습니다. V8 `tools/gdbinit`은 GitHub `main`의 2026-07-03 커밋 판을 받아 읽었습니다.
