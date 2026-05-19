---
title: "Ch 4: FrameDecorator / Unwinder — 콜스택 가공과 JIT"
date: 2026-05-17T04:00:00
description: "Frame filter, FrameDecorator로 콜스택 변형, custom unwinder로 JIT 코드 추적."
tags: [gdb, python, frame, unwinder, jit]
series: "GDB Extension and IDE"
seriesOrder: 4
draft: false
---

비동기 코드의 깊은 코루틴 콜스택, V8 같은 JIT 안의 *DWARF 없는* 코드, *합성된 자식 프레임* — 표준 `bt`로는 정리되지 않는 콜스택이 많습니다. GDB는 두 가지 메커니즘으로 이를 풀어 줍니다.

- **Frame Filter** — 기존 프레임을 *숨기거나 묶거나 데코레이트*.
- **Unwinder** — DWARF가 없는 영역의 콜스택을 *Python으로 직접 풀기*.

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
            name = frame.function() or ""
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

여러 필터가 등록되면 *priority 순*으로 chain.

```
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
        if name and 'critical' in name:
            return f"⭐ {name}"
        return name
```

함수명에 ⭐ 추가 (또는 색깔 escape sequence).

### 코루틴 콜스택 압축

C++20 coroutine·boost::asio 같은 비동기 코드는 콜스택이 *내부 implementation*으로 가득. 의미 있는 *논리적 호출 체인*을 한 단계로 묶기.

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
            name = frame.function() or ""
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

12개 implementation frame이 *한 줄*로. 의미 있는 콜스택만 남음.

## frame_args() — 인자 표시 커스터마이즈

```python
class SmartArgsDecorator(FrameDecorator):
    def frame_args(self):
        orig = super().frame_args()
        if orig is None:
            return None
        # 중요한 인자만 강조, 나머지는 짧게
        result = []
        for arg in orig:
            name = arg.sym().name
            val = arg.value()
            if 'this' in name:
                # this는 표시 생략
                continue
            result.append(SymValueWrapper(name, val))
        return result

from gdb.FrameDecorator import SymValueWrapper
```

`bt full`이 표시하는 인자를 가공.

## Unwinder — DWARF 없이 콜스택 풀기

JIT 코드 (V8, JVM, .NET, Lua), 인터프리터, 또는 *완전히 별 ABI*의 코드에서 GDB가 콜스택을 풀려면 *Python으로 직접* unwind 정보를 제공.

```python
import gdb
import gdb.unwinder

class JitUnwinder(gdb.unwinder.Unwinder):
    def __init__(self):
        super().__init__("jit-unwinder")

    def __call__(self, pending_frame):
        pc = pending_frame.read_register("pc")
        if not in_jit_region(int(pc)):
            return None    # 다른 unwinder가 처리하도록

        # JIT 사이드 테이블 lookup
        info = lookup_jit_frame(int(pc))
        if not info: return None

        # 새 frame 정보 빌드
        unwind_info = pending_frame.create_unwind_info(
            FrameId(int(pending_frame.read_register("sp")), int(pc)))
        unwind_info.add_saved_register("pc", info.return_pc)
        unwind_info.add_saved_register("sp", info.caller_sp)
        return unwind_info

class FrameId:
    def __init__(self, sp, pc):
        self.sp = sp
        self.pc = pc

gdb.unwinder.register_unwinder(None, JitUnwinder(), replace=False)
```

핵심:

1. `__call__(pending_frame)` — 현재 프레임이 *나에게 속하는가* 결정.
2. 속하면 *create_unwind_info*로 unwind 정보 빌드.
3. *호출자 측 레지스터*를 `add_saved_register`로 등록.
4. 속하지 않으면 `None` 반환 — 다른 unwinder가 처리.

### in_jit_region — JIT 영역 판단

```python
def in_jit_region(pc):
    inferior = gdb.selected_inferior()
    # JIT은 보통 mmap한 RWX 영역에 코드를 둠
    # 또는 메타데이터에 영역 정보 보관
    
    # 예: V8은 v8::internal::Heap에 코드 영역 보관
    heap = gdb.parse_and_eval("v8::internal::g_heap")
    code_start = int(heap['code_space_']['allocation_top_'])
    code_end = int(heap['code_space_']['allocation_limit_'])
    return code_start <= pc < code_end
```

각 JIT 엔진마다 *영역 검출* 방식이 다름.

### lookup_jit_frame

JIT은 보통 *사이드 테이블*에 컴파일된 함수의 *프롤로그/에필로그* 정보를 보관. Python에서 그 테이블을 읽어 unwind 정보 재구성.

```python
def lookup_jit_frame(pc):
    # V8의 경우: optimized code의 *deoptimization data*에 unwind 정보
    code = find_code_object_containing(pc)
    if not code: return None
    
    # 프레임 크기 + saved register offset
    frame_size = int(code['frame_size_'])
    sp_offset = int(code['caller_sp_offset_'])
    
    # 현재 SP에서 호출자 SP·PC 계산
    sp = pending_frame.read_register("sp")
    caller_sp = int(sp) + frame_size
    return_pc_addr = caller_sp - 8
    return_pc = read_memory_u64(return_pc_addr)
    
    return JitFrameInfo(caller_sp, return_pc)
```

복잡하지만 *JIT 디버깅의 유일한 길*. 큰 JIT 엔진은 보통 *자체 GDB 헬퍼*를 제공.

## 실전 — V8 디버깅

V8은 [공식 GDB 매크로](https://github.com/v8/v8/blob/main/tools/gdbinit)를 제공.

```text
(gdb) source /path/to/v8/tools/gdbinit
(gdb) jss        # JavaScript stack 출력 (간단)
(gdb) jlh        # JS local handles
(gdb) job        # JS object 출력
```

JS 객체를 *그 시점의 V8 표현*으로 디코딩. 일반 `print`로는 못 보는 정보.

Node.js·Chrome 디버깅에서 V8 helpers 없이는 native crash 분석이 매우 어렵습니다.

## 인터프리터 — Python의 GDB 헬퍼

CPython 자체는 *C로* 구현. CPython 인터프리터 안에서 PyObject가 어떻게 흐르는지 디버깅하려면.

```text
(gdb) source /usr/share/gdb/python/python-gdb.py
(gdb) py-bt
Traceback (most recent call first):
  File "myapp.py", line 42, in process_data
    result = compute(x)
  File "myapp.py", line 60, in main
    process_data(req)
```

`py-bt`가 *C 콜스택 안의 Python 프레임*만 추출. 일반 `bt`는 `PyEval_EvalFrameDefault`로 가득.

이게 가능한 이유는 *CPython이 자체 GDB 헬퍼를 제공* — Python frame object를 디코딩하는 코드.

## JVM — hsdis

HotSpot JVM도 비슷. `libjvm.so`와 함께 *GDB SA*(Service Agent)가 제공돼 Java frame을 풀어내지만 GDB와 통합이 거칠어 보통 *jhsdb*나 *async-profiler* 같은 별 도구를 씁니다.

## DWARF JIT 등록 — __register_frame

`Python Unwinder` 대안 — *런타임에 DWARF FDE를 직접 등록*.

```c
// JIT가 컴파일한 코드에 대한 FDE 생성
void *fde_data = generate_fde_for_jit_function(addr, size);
__register_frame(fde_data);

// 정리
__deregister_frame(fde_data);
```

libgcc가 제공하는 함수. GDB가 `__register_frame`을 *watch* — 호출되면 그 FDE를 자기 unwind 정보에 추가.

`perf_jitdump` 형식으로 *perf와 통합*도 가능 — Linux perf가 JIT 콜스택을 정확히 그릴 수 있게.

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
while f.older():
    f = f.older()

reason = f.unwind_stop_reason()
print(gdb.frame_stop_reason_string(reason))
```

```
UNWIND_NO_REASON           정상
UNWIND_NULL_ID             null frame ID
UNWIND_OUTERMOST           바깥 끝
UNWIND_UNAVAILABLE         정보 없음
UNWIND_INNER_ID            안쪽 ID
UNWIND_SAME_ID             ID 같음 (loop)
UNWIND_NO_SAVED_PC         PC 보존 안 됨
UNWIND_MEMORY_ERROR        메모리 read 실패
UNWIND_FIRST_ERROR
```

콜스택이 *끊기는 이유*를 진단. 보통 `UNWIND_UNAVAILABLE` (DWARF 없음) 또는 `UNWIND_MEMORY_ERROR` (스택 손상).

## 정리

- Frame Filter — 콜스택 *외관* 변경. 숨기기·묶기·데코레이트.
- FrameDecorator — 개별 frame의 *function/address/args* 변환.
- Custom unwinder로 DWARF 없는 영역 풀기 — JIT, 인터프리터, exotic ABI.
- `__register_frame`으로 *런타임 DWARF FDE 등록*도 가능.
- V8·CPython·JVM은 *자체 GDB 헬퍼* 제공 — 활용 권장.
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
