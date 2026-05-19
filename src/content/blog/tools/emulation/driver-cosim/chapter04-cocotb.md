---
title: "Ch 4: CocoTB — Python Testbench"
date: 2026-05-17T04:00:00
description: "Python coroutine으로 RTL testbench — productivity gain."
series: "Driver-RTL Co-simulation"
seriesOrder: 4
tags: [cocotb, python, testbench, vpi, pytest]
draft: true
---

**CocoTB**(Coroutine-based Cosimulation TestBench)는 RTL testbench를 *Python*으로 짜는 프레임워크입니다. SystemVerilog 대신 Python coroutine으로 자극·확인 시퀀스를 표현하고, simulator hook(VPI/VHPI/FLI/DPI)을 통해 DUT(Design Under Test) 신호에 접근합니다. testbench 생산성을 *수배* 끌어올린다는 평이 산업 전반에 일반화되어 있습니다.

이 장은 CocoTB의 모델·기본 API·driver-RTL cosim 패턴·pytest 통합까지 다룹니다.

## 어떤 문제를 푸는가

SV testbench는 강력하지만 다음 문제가 있습니다.

- **반복 작업이 무거움** — 매번 task·function·class 선언, file I/O는 SystemVerilog DPI 거쳐 C로 위임.
- **라이브러리 생태계 빈약** — JSON parser·HTTP client·numpy 같은 데이터 분석 도구를 SV에서 곧바로 못 씀.
- **CI 도구 빈약** — pytest 같은 표준 test runner가 없고, 결과 reporting이 simulator 별로 다름.

Python으로 쓰면 위 셋이 한 번에 풀립니다. CocoTB가 *시뮬레이터를 그대로 쓰면서* 그 위에 Python layer만 얹는 접근입니다.

## 어떻게 동작하는가

CocoTB의 본체는 *Python 인터프리터를 simulator 프로세스 안에 띄우는* shim입니다. 흐름:

```text
┌─────────────────────────────────────────────┐
│         Simulator (Verilator/Icarus/VCS)    │
│                                             │
│   ┌──────────────┐    VPI/VHPI    ┌──────┐ │
│   │     DUT      │ ◀───────────▶ │ libpython │
│   │  (top.sv)    │                │  3.x  │ │
│   └──────────────┘                └──┬───┘ │
│                                       │     │
│              ┌─────────────────────┐ │     │
│              │   cocotb runtime    │◀┘     │
│              │  (scheduler·decor)  │       │
│              └─────────────────────┘       │
└─────────────────────────────────────────────┘
                    ▲
                    │
                test.py (user)
```

simulator는 정상적으로 실행되고, 매 시뮬레이션 step마다 cocotb의 Python scheduler가 깨어나 다음 coroutine을 실행합니다.

## 가장 작은 예제

5줄짜리 testbench로 감을 잡습니다.

```python
# test_basic.py
import cocotb
from cocotb.triggers import Timer, RisingEdge

@cocotb.test()
async def reset_then_idle(dut):
    dut.rst.value = 1
    await Timer(20, units="ns")
    dut.rst.value = 0
    await RisingEdge(dut.clk)
    assert dut.status.value == 0
```

빌드+실행은 Makefile 한 장.

```makefile
# Makefile
SIM ?= verilator
TOPLEVEL_LANG = verilog
VERILOG_SOURCES = $(PWD)/top.sv
TOPLEVEL = top
MODULE = test_basic

include $(shell cocotb-config --makefiles)/Makefile.sim
```

```bash
make
```

이 한 번이 Verilator를 빌드하고, libpython을 link하고, test.py를 실행해 결과를 print합니다. 실패하면 traceback이 cocotb-style로 출력되고, waveform이 함께 남습니다.

## 핵심 API — Awaitable과 신호 접근

CocoTB의 어휘 핵심은 **awaitable**과 **signal proxy**입니다.

### Awaitable

```python
from cocotb.triggers import RisingEdge, FallingEdge, Timer, ReadOnly, Event, Combine

await RisingEdge(dut.clk)        # 다음 rising edge까지 대기
await Timer(100, units="ns")     # 100 ns 진행
await ReadOnly()                 # 현재 cycle의 모든 신호 안정화 후
await Event(name="my_event")     # 다른 coroutine이 set할 때까지
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
print(dut.data_bus.value.binstr)   # '11011110101011011011111011101111'

# Bit slicing
high_byte = (int(dut.data_bus.value) >> 24) & 0xFF
```

신호 쓰기는 *다음 evaluation까지 반영되지 않음*. 즉 같은 cycle 안에 여러 signal을 set한 뒤 `await ReadOnly()` 또는 `await RisingEdge(clk)`로 진행시켜야 변화가 propagate됩니다.

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

### 방법 1 — ctypes로 C library 호출

driver를 `.so`로 빌드해 Python에서 직접 부릅니다.

```bash
gcc -shared -fPIC -o libmydriver.so my_driver.c
```

```python
import ctypes
lib = ctypes.CDLL("./libmydriver.so")
lib.my_driver_init.restype = ctypes.c_int
lib.my_driver_write.argtypes = [ctypes.c_int, ctypes.c_int]
lib.my_driver_read.argtypes = [ctypes.c_int]
lib.my_driver_read.restype = ctypes.c_uint32

# ↓ MMIO 호출 시 RTL 신호를 우리가 직접 토글
def mmio_write(addr, data):
    dut.cpu_addr.value = addr
    dut.cpu_wdata.value = data
    dut.cpu_write_req.value = 1
    # ...

# driver 함수가 *우리가 정의한* mmio_write을 호출하도록 hook
# (driver 쪽이 콜백 등록 API를 노출해야 함)
```

driver 코드가 *callback 기반*이면 이 방법이 깔끔합니다. driver가 plain MMIO write로 작성되어 있으면 LD_PRELOAD로 가로채는 방법으로 우회합니다.

### 방법 2 — DPI-C와 결합

driver는 simulator 안에 DPI로 link하고, CocoTB는 *test scenario*만 Python으로 작성합니다.

```python
# test_driver.py — driver는 이미 binary에 link됨
@cocotb.test()
async def driver_smoke(dut):
    # SV 쪽에 export "DPI-C" task로 driver init 노출
    # cocotb에서 task 호출은 dut.<scope>의 함수 형태로
    await dut.driver_init_task()
    await Timer(1, units="us")
    assert dut.driver_ready.value == 1
```

두 방법은 상황에 맞춰 섞어 씁니다. 보통:
- 일찍부터 driver를 *Linux 환경에서 컴파일·테스트*하려면 방법 1.
- *모든 cosim을 simulator-driven*으로 두려면 방법 2.

## Pytest 통합

cocotb 1.7부터 *runner API*를 통해 pytest와 결합이 깔끔해졌습니다.

```python
# test_pytest.py
import pytest
from cocotb.runner import get_runner

@pytest.mark.parametrize("scenario", ["smoke", "stress", "edge"])
def test_dut(scenario):
    runner = get_runner("verilator")
    runner.build(
        sources=["top.sv"],
        hdl_toplevel="top",
        always=True,
    )
    runner.test(
        hdl_toplevel="top",
        test_module="test_driver",
        plusargs=[f"+scenario={scenario}"],
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
- **same-cycle race** — 같은 cycle 안에서 set한 신호는 *이번* `ReadOnly`에서 못 봅니다. 한 cycle 뒤에 읽어야 합니다.
- **logger 출력 누락** — cocotb logger는 별도. `print()`도 되지만 cocotb log 포맷이 더 친절합니다(`dut._log.info(...)`).
- **simulator 선택** — Verilator는 빠르지만 4-state·일부 SVA 제한. Icarus는 GPL 친화적이고 가벼움. VCS/Questa/Xcelium은 상용. testbench는 동일.

## 정리

- **CocoTB**는 RTL testbench를 *Python*으로 쓰는 프레임워크. simulator hook은 표준 VPI/VHPI/DPI.
- 어휘는 *awaitable*(`RisingEdge`, `Timer`, `ReadOnly`)과 *signal proxy*(`dut.x.value`) 둘이 전부.
- bus driver/monitor 라이브러리(`cocotbext-axi`·`-pcie`·`-eth`)로 transaction-level testbench를 *분 단위*로 구축.
- driver 결합은 **ctypes**(driver `.so` 직접 호출) 또는 **DPI-C + SV export task** 두 방법. 섞어 씁니다.
- **pytest** 통합으로 parametrize·fixture·CI selection. 매 push마다 cosim regression이 현실.
- Functional coverage는 cocotb-coverage 등 보조 라이브러리로. CI artifact로 trend 추적.
- 시뮬레이터는 자유(Verilator/Icarus/VCS/Questa/Xcelium). testbench는 동일.

## 다음 장 예고

다음 장은 *추상화를 한 단계 더 올려* **SystemC TLM**(Transaction-Level Modeling)을 다룹니다. cycle-accurate 너머의 빠른 virtual platform — Linux를 boot시킬 수 있는 환경에서 driver를 검증하는 시나리오입니다.

## 관련 항목

- [Ch 3: Verilator](/blog/tools/emulation/driver-cosim/chapter03-verilator)
- [Ch 5: SystemC TLM](/blog/tools/emulation/driver-cosim/chapter05-systemc-tlm)
- [QEMU Fake Device Driver — Test Automation](/blog/tools/emulation/qemu-fake-device/chapter10-test-automation) — pytest 통합 패턴
