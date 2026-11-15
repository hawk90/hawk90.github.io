---
title: "GDB FrameDecorator·Unwinder — 콜스택 가공과 JIT 지원"
slug: "tools/debugging/gdb-extension/chapter04-frame-unwinder"
date: 2026-05-27T09:04:00
description: "Frame filter·FrameDecorator의 표시와 실제 unwind를 구분합니다. 고정한 x86-64 fixture의 caller 복원, GDB JIT 등록과 runtime helper의 경계를 살펴봅니다."
tags: [gdb, python, frame, unwinder, jit]
series: "GDB Extension and IDE"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

비동기 코드의 깊은 코루틴 콜스택, V8 같은 JIT 안의 *DWARF 없는* 코드, *합성된 자식 프레임* — 표준 `bt`로는 정리되지 않는 콜스택이 많습니다. GDB는 두 가지 메커니즘으로 이를 풀어 줍니다.

- **Frame Filter** — 기존 프레임을 *숨기거나 묶거나 데코레이트*.
- **Unwinder** — DWARF가 없는 영역의 콜스택을 *Python으로 직접 풀기*.

GDB 17.2의 동봉 Python API/source를 기준으로 합니다. filter의 입력은 gdb.Frame 자체가 아니라 frame-decorator protocol 객체이며 실제 frame 상태는 바꾸지 않습니다.

## Frame Filter

`bt`가 출력할 프레임 목록을 가로채 *수정*.

```python
import gdb

class SkipBoostFilter:
    def __init__(self):
        self.name = "skip-boost"
        self.priority = 100
        self.enabled = True
        gdb.frame_filters[self.name] = self
    def filter(self, frame_iter):
        for frame in frame_iter:
            name = frame.function()
            name = name if isinstance(name, str) else ""
            if "boost::" not in name:
                yield frame

SkipBoostFilter()
```

`filter()`가 *iterator*를 받아 *iterator*를 yield. 통과시킬 프레임만 yield.

```text
(gdb) bt
# boost::* 프레임이 모두 제거된 콜스택
```

### priority

여러 filter는 priority가 큰 순서로 적용됩니다. 같은 priority의 상대 순서에 의존하지 않으며 scope·enabled 상태도 확인합니다.

```text
frame_iter → filter1 → filter2 → filter3 → 사용자
```

### enable/disable

```text
(gdb) info frame-filter
(gdb) disable frame-filter global skip-boost
(gdb) enable frame-filter global skip-boost
```

런타임 토글.

## FrameDecorator — 프레임 모양 변경

원본 프레임을 감싸 `function()`/`address()`/`frame_args()` 등을 *가로채* 다른 값을 반환.

```python
from gdb.FrameDecorator import FrameDecorator

class HighlightDecorator(FrameDecorator):
    def __init__(self, frame):
        super().__init__(frame)
    def function(self):
        name = super().function()
        if isinstance(name, str) and 'critical' in name:
            return f"⭐ {name}"
        return name
```

함수명에 ⭐ 추가 (또는 색깔 escape sequence).

### 코루틴 콜스택 압축

C++20 coroutine·boost::asio 같은 비동기 코드는 콜스택이 *내부 implementation*으로 가득. 연속된 implementation frame 표시를 접을 수 있지만, 이 작업으로 아직 존재하지 않는 비동기 logical stack을 복원하는 것은 아닙니다.

```python
class FoldCoroutineFilter:
    def __init__(self):
        self.name = "fold-coroutine"
        self.priority = 100
        self.enabled = True
        gdb.frame_filters[self.name] = self
    def filter(self, frame_iter):
        buffer = []
        for frame in frame_iter:
            name = frame.function()
            name = name if isinstance(name, str) else ""
            if "std::__n4861::coroutine_handle" in name or "asio::detail::" in name:
                buffer.append(frame)
            else:
                if buffer:
                    # 묶음을 한 데코레이터로
                    yield CoroFoldedFrame(buffer)
                    buffer = []
                yield frame
        if buffer:
            yield CoroFoldedFrame(buffer)

class CoroFoldedFrame(FrameDecorator):
    def __init__(self, frames):
        super().__init__(frames[0])
        self.frames = frames
    def function(self):
        return f"[{len(self.frames)} coroutine frames]"
```

```text
#0  process_request at handler.cpp:42
#1  [12 coroutine frames]
#2  main at main.cpp:10
```

이 출력은 접는 표시의 모형입니다. namespace 문자열은 compiler/runtime별로 다르며 물리적 frame을 숨기는 것과 coroutine의 logical parent를 복원하는 일은 다릅니다.

## frame_args() — 인자 표시 커스터마이즈

```python title="argument-decorator.py"
from gdb.FrameDecorator import FrameDecorator

class SmartArgsDecorator(FrameDecorator):
    def frame_args(self):
        original = super().frame_args()
        if original is None:
            return None
        result = []
        for argument in original:
            symbol = argument.symbol()
            name = symbol if isinstance(symbol, str) else getattr(symbol, "name", None)
            if name != "this":
                result.append(argument)
        return result
```

Symbol/Value interface의 symbol()·value()를 사용합니다. sym()이나 SymValueWrapper(name, value)는 GDB17.2의 실제 interface/constructor가 아닙니다. 기존 wrapper를 그대로 반환하면 원래 value 조회 계약을 보존합니다.

## Unwinder — DWARF 없이 콜스택 풀기

unwinder는 표시가 아니라 **caller register와 stable frame ID**를 제공해야 합니다. 어디에 saved state가 있는지 ABI/PC별로 알아야 합니다. 미정의 V8 g_heap·frame_size_·caller_sp_offset_를 추측한 기존 코드는 사용하지 않습니다.

다음은 **x86-64 little-endian의 알려진 fixture 한 PC**에서만 동작하는 예입니다. 그 위치에서는 RBP가 saved caller RBP를, RBP+8이 return PC를 가리키는 계약을 갖습니다. 실제 V8/JVM·전체 함수 prologue/epilogue unwinder가 아닙니다.

```python title="toy-unwinder.py"
import gdb
import gdb.unwinder

class FrameId:
    def __init__(self, sp, pc):
        self.sp, self.pc = sp, pc

class ToyUnwinder(gdb.unwinder.Unwinder):
    def __init__(self):
        super().__init__("article-toy-rbp")

    def __call__(self, pending_frame):
        try:
            if pending_frame.architecture().name() != "i386:x86-64":
                return None
            site = int(gdb.parse_and_eval("(void *)&toy_unwind_site"))
            pc = int(pending_frame.read_register("rip"))
            if pc != site:
                return None
            rbp = int(pending_frame.read_register("rbp"))
            if rbp == 0 or rbp % 8 != 0:
                return None
            raw = bytes(gdb.selected_inferior().read_memory(rbp, 16))
            saved_rbp = int.from_bytes(raw[:8], "little")
            return_pc = int.from_bytes(raw[8:], "little")
            caller_sp = rbp + 16
            if caller_sp >= 1 << 64 or return_pc == 0 or saved_rbp == rbp:
                return None
            info = pending_frame.create_unwind_info(FrameId(caller_sp, pc))
            for register, value in (("rip", return_pc), ("rsp", caller_sp), ("rbp", saved_rbp)):
                register_type = pending_frame.read_register(register).type
                info.add_saved_register(register, gdb.Value(value).cast(register_type))
            return info
        except gdb.error:
            return None

gdb.unwinder.register_unwinder(None, ToyUnwinder(), replace=True)
```

범위 밖은 None을 반환합니다. PendingFrame은 callback이 끝난 뒤 보관해 다시 쓰지 않습니다. 여기서 inferior function call·다른 frame 조회처럼 unwind 재진입을 일으킬 수 있는 작업을 피합니다. fixture 검사와 실제 runtime JIT의 stack 복원은 서로 다른 검증 범위입니다.

## 실전 — V8 디버깅

V8은 tools/gdbinit와 version별 helper를 제공합니다. 사용 중인 V8/Node build·debug symbol과 같은 revision을 고정하고 실제 지원 command를 help/source에서 확인합니다. jss/jlh/job가 모든 release에 같은 이름·인자로 존재한다고 가정하지 않습니다. [공식 source](https://github.com/v8/v8/blob/main/tools/gdbinit)는 탐색 출발점입니다.

## 인터프리터 — Python의 GDB 헬퍼

CPython 자체는 *C로* 구현. CPython 인터프리터 안에서 PyObject가 어떻게 흐르는지 디버깅하려면.

```text
(gdb) source /path/to/matching/python-gdb.py
(gdb) py-bt
Traceback (most recent call first):
  File "myapp.py", line 42, in process_data
    result = compute(x)
  File "myapp.py", line 60, in main
    process_data(req)
```

py-bt가 Python-level traceback을 구성하며 CPython version·debug build/추가 symbol·matching helper가 필요합니다. 설치 경로는 distro별입니다. 출력 예는 형식 설명이며 이 검증에서 실제 CPython crash를 수집한 결과는 아닙니다.

`py-bt`가 *C 콜스택 안의 Python 프레임*을 해석. 일반 `bt`는 `PyEval_EvalFrameDefault`로 가득.

이게 가능한 이유는 *CPython이 자체 GDB 헬퍼를 제공* — Python frame object를 디코딩하는 코드.

## JVM과 JIT 등록의 경계

hsdis는 disassembler이고 HotSpot Serviceability Agent/jhsdb와 역할이 다릅니다. 일반적인 GDB SA 하나가 모든 Java frame을 자동 복원한다는 설명은 사용하지 않습니다. 정확한 JDK·symbol·helper와 live/core 조건을 맞춥니다.

## GDB JIT Interface와 Runtime Unwind

GDB의 JIT interface는 __jit_debug_descriptor와 __jit_debug_register_code 등 정해진 rendezvous를 이용해 in-memory symbol object를 등록합니다. runtime/libgcc의 __register_frame FDE 등록을 GDB가 무조건 watch해 같은 정보를 얻는다는 설명은 틀립니다.

Python unwinder, GDB JIT symbol registration, runtime exception unwinding과 perf jitdump는 목적과 소비 도구가 다른 경로입니다. JIT의 하나뿐인 해결책으로 묶지 않습니다. [JIT interface](https://sourceware.org/gdb/current/onlinedocs/gdb.html/JIT-Interface.html)를 선택한 GDB/runtime source와 대조합니다.

## frame() / read_register() / function()

`gdb.Frame`의 API.

```python
frame = gdb.selected_frame()

frame.name()           # 함수 이름 (str) 또는 None
frame.function()       # gdb.Symbol 또는 None
frame.pc()             # 정수
frame.older()          # 호출자
frame.newer()          # 피호출자
frame.read_register("rax")  # gdb.Value
frame.read_var("local")     # gdb.Value
frame.find_sal()       # gdb.Symtab_and_line
frame.is_valid()
frame.architecture()   # gdb.Architecture
frame.unwind_stop_reason()  # 왜 unwind 멈췄나
frame.type()           # NORMAL_FRAME / DUMMY_FRAME / INLINE_FRAME / ...
```

`frame.type()`이 *프레임 종류*:

- `gdb.NORMAL_FRAME` — 일반 함수.
- `gdb.DUMMY_FRAME` — GDB가 만든 함수 호출용 가짜 프레임.
- `gdb.INLINE_FRAME` — 인라인된 함수.
- `gdb.TAILCALL_FRAME` — tail call로 사라진 함수.
- `gdb.SIGTRAMP_FRAME` — 시그널 trampoline.
- `gdb.ARCH_FRAME` — 아키텍처별 특수 프레임.

## unwind_stop_reason — 왜 끊겼나

```python
top = gdb.newest_frame()
f = top
while f is not None and f.older():
    f = f.older()

if f is not None:
    reason = f.unwind_stop_reason()
    print(gdb.frame_stop_reason_string(reason))
```

```text
FRAME_UNWIND_NO_REASON           정상
FRAME_UNWIND_NULL_ID             null frame ID
FRAME_UNWIND_OUTERMOST           바깥 끝
FRAME_UNWIND_UNAVAILABLE         정보 없음
FRAME_UNWIND_INNER_ID            안쪽 ID
FRAME_UNWIND_SAME_ID             ID 같음 (loop)
FRAME_UNWIND_NO_SAVED_PC         PC 보존 안 됨
FRAME_UNWIND_MEMORY_ERROR        메모리 read 실패
FRAME_UNWIND_FIRST_ERROR
```

콜스택이 *끊기는 이유*를 진단. unavailable는 여러 종류의 register/memory 미수집·target 한계를 포함합니다. memory error도 손상만의 증거는 아닙니다. 실제 constant는 gdb.FRAME_UNWIND_*이며 DWARF 유무 하나로 원인을 확정하지 않습니다.

## 정리

- Frame Filter — 콜스택 *외관* 변경. 숨기기·묶기·데코레이트.
- FrameDecorator — 개별 frame의 *function/address/args* 변환.
- Custom unwinder로 DWARF 없는 영역 풀기 — JIT, 인터프리터, exotic ABI.
- GDB JIT symbol 등록과 runtime/libgcc FDE 등록은 다른 interface.
- runtime별 matching version·symbol·helper와 지원 범위를 확인.
- `frame.type()`, `unwind_stop_reason()`이 콜스택 깨짐의 1차 진단.

## 다음 장 예고

Ch 5 — MI 프로토콜 + DAP 프로토콜. IDE 통합의 안쪽.

## 관련 항목

- [Ch 3: Pretty-Printer 깊이](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)
- [Ch 5: MI / DAP 프로토콜](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)
- [Frame Filters API](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Frame-Filter-API.html)
- [Unwinding API](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Unwinding-Frames-in-Python.html)
- [V8 gdbinit](https://github.com/v8/v8/blob/main/tools/gdbinit)
- [CPython python-gdb.py](https://github.com/python/cpython/blob/main/Tools/gdb/libpython.py)
