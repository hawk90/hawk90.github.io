---
title: "CocoTB 분석 — Python으로 작성하는 RTL Testbench"
slug: "tools/emulation/driver-cosim/chapter04-cocotb"
date: 2026-05-22T09:04:00
description: "Python coroutine으로 RTL testbench — productivity gain."
series: "Driver-RTL Co-simulation"
seriesOrder: 4
tags: [cocotb, python, testbench, vpi, pytest]
draft: false
topics: ["tools", "tools/emulation"]
---

**CocoTB**(Coroutine-based Cosimulation TestBench)는 RTL testbench를 *Python*으로 짜는 프레임워크입니다. SystemVerilog 대신 Python coroutine으로 자극·확인 시퀀스를 표현하고, simulator hook(VPI/VHPI/FLI/DPI)을 통해 DUT(Design Under Test) 신호에 접근합니다. Python 생태계와 coroutine을 활용할 수 있지만 생산성 개선 폭은 testcase와 팀 환경에서 확인해야 합니다.

이 장은 CocoTB의 모델·기본 API·driver-RTL cosim 패턴·pytest 통합까지 다룹니다.

## 어떤 문제를 푸는가

SV testbench는 강력하지만 다음 문제가 있습니다.

- **반복 작업이 무거움** — 매번 task·function·class 선언, file I/O는 SystemVerilog DPI 거쳐 C로 위임.
- **라이브러리 생태계 빈약** — JSON parser·HTTP client·numpy 같은 데이터 분석 도구를 SV에서 곧바로 못 씀.
- **CI 도구 빈약** — pytest 같은 표준 test runner가 없고, 결과 reporting이 simulator 별로 다름.

Python으로 쓰면 위 셋이 한 번에 풀립니다. CocoTB가 *시뮬레이터를 그대로 쓰면서* 그 위에 Python layer만 얹는 접근입니다.

## 어떻게 동작하는가

CocoTB의 본체는 *Python 인터프리터를 simulator 프로세스 안에 띄우는* shim입니다. 흐름:

![CocoTB Architecture](/images/blog/driver-cosim/diagrams/ch04-cocotb-arch.svg)

simulator는 정상적으로 실행되고, 매 시뮬레이션 step마다 cocotb의 Python scheduler가 깨어나 다음 coroutine을 실행합니다.

## 가장 작은 예제

아래는 **cocotb 2.0.0 API**를 기준으로 clock과 reset을 명시한 예시입니다. 이 환경에는 cocotb·RTL simulator가 없어 실제 simulation은 실행하지 않았으며 Python 구문 검사와 문서 대조만 수행했습니다.

```python title="test_basic.py"
import cocotb
from cocotb.clock import Clock
from cocotb.triggers import RisingEdge, FallingEdge, ReadOnly

@cocotb.test()
async def reset_then_idle(dut):
    dut.rst.value = 1
    clock = Clock(dut.clk, 10, unit="ns")
    clock.start()  # cocotb 2.0: Task를 자동 생성
    for _ in range(2):
        await RisingEdge(dut.clk)
    await FallingEdge(dut.clk)
    dut.rst.value = 0
    await RisingEdge(dut.clk)
    await ReadOnly()
    assert int(dut.status.value) == 0
    clock.stop()
```

이 예시는 clk/rst/status port와 reset 후 status=0 계약을 가진 별도 top.sv를 요구합니다. clock을 다른 HDL process에서도 동시에 구동하면 안 됩니다.

빌드+실행은 Makefile 한 장.

```makefile
# Makefile
SIM ?= verilator
TOPLEVEL_LANG = verilog
VERILOG_SOURCES = $(PWD)/top.sv
TOPLEVEL = top
COCOTB_TEST_MODULES = test_basic

include $(shell cocotb-config --makefiles)/Makefile.sim
```

```bash
make
```

이 한 번이 Verilator를 빌드하고, libpython을 link하고, test_basic 모듈의 test를 실행해 결과를 print합니다. 실패하면 testcase 진단이 출력됩니다. waveform은 simulator trace 옵션과 dump 설정을 별도로 켜야 남습니다.

## 핵심 API — Awaitable과 신호 접근

CocoTB의 어휘 핵심은 **awaitable**과 **signal proxy**입니다.

### Awaitable

```python
from cocotb.triggers import RisingEdge, FallingEdge, Timer, ReadOnly, Event, Combine

await RisingEdge(dut.clk)        # 다음 rising edge까지 대기
await Timer(100, unit="ns")     # 100 ns 진행
await ReadOnly()                 # 현재 cycle의 모든 신호 안정화 후
event = Event()
await event.wait()     # 다른 coroutine이 set할 때까지
```

`async def`로 정의한 함수가 `cocotb.test()`로 등록되면 cocotb scheduler가 그것을 *coroutine*으로 다룹니다. `await`이 시뮬레이션 시간 진행과 자연스럽게 묶입니다.

### Signal proxy

DUT의 모든 신호는 `dut.<name>` 형태로 노출됩니다.

```python
# 읽기·쓰기
dut.cpu_addr.value = 0x1000
val = int(dut.cpu_rdata.value)

# Vector
dut.data_bus.value = 0xDEADBEEF
print(str(dut.data_bus.value))   # '11011110101011011011111011101111'

# Bit slicing
high_byte = (int(dut.data_bus.value) >> 24) & 0xFF
```

write 직후 값, edge 발생 직후 값과 HDL evaluation이 끝난 ReadOnly 값을 구분합니다. ReadOnly는 현재 timestep의 최종 값을 읽는 단계이며 반드시 한 clock cycle 뒤를 뜻하지 않습니다. ReadOnly에 들어간 뒤 같은 timestep에 다시 write하지 말고 다음 적절한 phase/time에 구동합니다.

## Bus driver/monitor 패턴

cocotb-bus와 cocotbext-* 라이브러리는 흔한 bus protocol에 대한 driver/monitor 클래스를 제공합니다. 가장 자주 쓰는 AXI 예시.

```python
from cocotbext.axi import AxiBus, AxiMaster

@cocotb.test()
async def axi_write_read(dut):
    axi = AxiMaster(AxiBus.from_prefix(dut, "s_axi"), dut.clk, dut.rst)
    await RisingEdge(dut.clk)
    dut.rst.value = 0

    await axi.write(0x1000, b"\x12\x34\x56\x78")
    data = await axi.read(0x1000, 4)
    assert data.data == b"\x12\x34\x56\x78"
```

`AxiMaster`가 AXI handshake 전체를 캡슐화하므로 test 작성자는 *transaction-level*에서 사고합니다. 비슷한 라이브러리가 PCIe·Ethernet·UART·SPI·I2C에 모두 있습니다.

## Driver C 코드와 결합

cosim의 본질은 *driver C 코드를 같이 돌리는 것*입니다. CocoTB에서는 두 방법이 일반적입니다.

### host C callback 계약부터 분리 검증하기

동기 ctypes callback은 Python coroutine을 await할 수 없습니다. C driver가 blocking MMIO 완료를 기다리는데 같은 thread의 cocotb scheduler가 멈추면 simulation도 진행하지 못합니다. 실제 연결은 요청 queue와 simulator 소유 coroutine, 완료 응답·timeout으로 설계하거나 지원되는 bridge API를 사용해야 합니다. kernel inline readl/writel이나 직접 포인터 store를 LD_PRELOAD로 자동 가로챌 수 있다는 가정도 잘못입니다.

다음은 RTL 연결에 앞서 callback signature와 수명을 검사하는 **host 메모리 모델**입니다. 실제 cocotb timing 검증이 아닙니다.

```c title="driver-hooks.c"
#include <stdint.h>
typedef uint32_t (*read_cb)(uint32_t);
typedef int (*write_cb)(uint32_t, uint32_t);
static read_cb read_hook;
static write_cb write_hook;
void set_hooks(read_cb rd, write_cb wr) { read_hook = rd; write_hook = wr; }
int driver_roundtrip(uint32_t address, uint32_t value) {
    if (!read_hook || !write_hook) return -1;
    if (write_hook(address, value) != 0) return -2;
    return read_hook(address) == value ? 0 : -3;
}
```

```python title="ffi-check.py"
import ctypes
import sys
lib = ctypes.CDLL(sys.argv[1])
Read = ctypes.CFUNCTYPE(ctypes.c_uint32, ctypes.c_uint32)
Write = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.c_uint32, ctypes.c_uint32)
lib.set_hooks.argtypes = [Read, Write]
lib.set_hooks.restype = None
lib.driver_roundtrip.argtypes = [ctypes.c_uint32, ctypes.c_uint32]
lib.driver_roundtrip.restype = ctypes.c_int
memory = {}
@Read
def read(address):
    return memory.get(address, 0)
@Write
def write(address, value):
    if address % 4 or address >= 64:
        return -1
    memory[address] = value
    return 0
assert lib.driver_roundtrip(4, 1) == -1
lib.set_hooks(read, write)  # read/write 참조는 등록 기간 내내 유지
assert lib.driver_roundtrip(4, 0x80000001) == 0
assert lib.driver_roundtrip(3, 1) == -2
lib.set_hooks(Read(), Write())
assert lib.driver_roundtrip(4, 1) == -1
print("host callback uint32/bounds/lifetime checks passed")
```

```bash
clang -shared -fPIC driver-hooks.c -o libdriver-hooks.so
python3 ffi-check.py ./libdriver-hooks.so
```

Clang 23.1.3 host에서 shared library를 빌드해 위 FFI 검사를 실행했습니다. 미등록 callback, uint32 high bit, 잘못된 주소, 해제 후 호출 거부를 확인했습니다. 이것은 C callback 경계의 검증이며 RTL bus handshake의 증거가 아닙니다.

### DPI와 Python scenario의 연결

export DPI task를 선언했다고 cocotb에서 await dut.some_task()로 임의 SV task를 호출할 수 있는 것은 아닙니다. simulator가 지원하는 구체 bridge 또는 start/done signal mailbox를 정의하고 Python이 요청을 넣으며 HDL/DPI 쪽이 완료 상태를 돌려주도록 구성합니다. 호출할 수 있는 API, thread, scheduling phase를 명시하지 않은 placeholder를 완성 통합 코드로 제시하지 않습니다.

## Pytest 통합

runner는 cocotb 1.8에서 도입되었고 여기서는 2.0.0의 경로를 사용합니다. experimental runner API를 사용할 때 설치한 판을 고정합니다.

```python
# test_pytest.py
import pytest
from pathlib import Path
from cocotb_tools.runner import get_runner

def test_dut():
    runner = get_runner("verilator")
    runner.build(
        sources=[Path("top.sv")],
        hdl_toplevel="top",
        always=True,
    )
    runner.test(
        hdl_toplevel="top",
        test_module="test_basic",
    )
```

```bash
pytest -v test_pytest.py
```

이로써 다음이 가능해집니다.

- **parametrize**로 같은 testbench에 *시나리오 행렬*을 자동 적용.
- **pytest fixture** 재사용(`@pytest.fixture` 안에서 driver 준비, DUT setup, etc.).
- **GitHub Actions에서 코드 차분에 따라 일부만 도는** test selection.

## Coverage reporting

cocotb-coverage 같은 보조 라이브러리로 functional coverage를 모을 수 있습니다.

```python
from cocotb_coverage import CoverPoint, CoverCross, coverage_db

@CoverPoint("top.cpu_addr", xf=lambda dut: int(dut.cpu_addr.value), bins=[0x1000, 0x2000, 0x3000])
@CoverPoint("top.op", xf=lambda dut: "read" if dut.cpu_read_req.value else "write", bins=["read", "write"])
@CoverCross("top.cross", items=["top.cpu_addr", "top.op"])
def sample_coverage(dut):
    pass

@cocotb.test()
async def coverage_test(dut):
    # ... 자극 적용
    sample_coverage(dut)
    coverage_db.export_to_xml("coverage.xml")
```

`coverage.xml`은 CI artifact로 올려 trend dashboard에 연결할 수 있습니다.

## 흔한 함정

- **`value`를 자주 잊음** — `dut.signal = 1`은 *Python attribute set*이라 SV 신호에 안 가닿습니다. 반드시 `dut.signal.value = 1`.
- **same-cycle race** — ReadOnly는 현재 timestep의 HDL 평가 완료 후 값을 읽습니다. edge 직후에 바로 읽는 것과 구분하고 read-only phase 뒤에는 같은 timestep write를 피합니다.
- **logger 출력 누락** — cocotb logger는 별도. `print()`도 되지만 cocotb log 포맷이 더 친절합니다(`dut._log.info(...)`).
- **simulator 선택** — Verilator는 빠르지만 4-state·일부 SVA 제한. Icarus는 GPL 친화적이고 가벼움. VCS/Questa/Xcelium은 상용. testbench는 동일.

## 정리

- **CocoTB**는 RTL testbench를 *Python*으로 쓰는 프레임워크. simulator hook은 표준 VPI/VHPI/DPI.
- 어휘는 *awaitable*(`RisingEdge`, `Timer`, `ReadOnly`)과 *signal proxy*(`dut.x.value`) 둘이 전부.
- bus driver/monitor 라이브러리(`cocotbext-axi`·`-pcie`·`-eth`)로 transaction-level 자극을 표현하며 실제 protocol/clock/reset 검증은 simulator에서 수행.
- ctypes의 동기 callback 계약과 simulator coroutine scheduling은 분리하며, DPI task 선언만으로 Python task 호출 API가 생기지는 않습니다.
- **pytest** 통합으로 parametrize·fixture·CI selection. 매 push마다 cosim regression이 현실.
- Functional coverage는 cocotb-coverage 등 보조 라이브러리로. CI artifact로 trend 추적.
- 시뮬레이터는 자유(Verilator/Icarus/VCS/Questa/Xcelium). testbench는 동일.

## 다음 장 예고

다음 장은 *추상화를 한 단계 더 올려* **SystemC TLM**(Transaction-Level Modeling)을 다룹니다. cycle-accurate 너머의 빠른 virtual platform — Linux를 boot시킬 수 있는 환경에서 driver를 검증하는 시나리오입니다.

## 1차 자료와 남은 검증

- [cocotb 2.0 timing model](https://docs.cocotb.org/en/v2.0.0/timing_model.html)
- [cocotb 2.0 runner](https://docs.cocotb.org/en/v2.0.0/runner.html), [Clock/Event/Timer API](https://docs.cocotb.org/en/v2.0.0/library_reference.html)

Python source 구문과 host FFI는 검사했습니다. cocotb 설치·RTL simulation·AXI BFM·coverage extension·pytest runner의 실제 실행은 검증 대기입니다. 위 runner는 test_basic 한 개를 호출하며 scenario plusarg를 소비하는 구현이 없는 parameter 행렬은 넣지 않았습니다.

## 관련 항목

- [Ch 3: Verilator](/blog/tools/emulation/driver-cosim/chapter03-verilator)
- [Ch 5: SystemC TLM](/blog/tools/emulation/driver-cosim/chapter05-systemc-tlm)
- [Ch 8: 실행 파일과 시나리오 연결](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — 공유 library와 실행 binary를 구분
