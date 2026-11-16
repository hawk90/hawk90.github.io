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

**CocoTB**(Coroutine-based Cosimulation TestBench)는 RTL testbench를 *Python*으로 짜는 프레임워크입니다. SystemVerilog 대신 Python coroutine으로 자극·확인 시퀀스를 표현하고, simulator의 VPI·VHPI·FLI 인터페이스를 통해 DUT(Design Under Test) 신호에 접근합니다. 설치한 cocotb 2.0.1 패키지의 `cocotb/libs/`에는 simulator별 `libcocotbvpi_*`(verilator·icarus·vcs·modelsim 등), `libcocotbvhpi_*`(aldec·ius·modelsim·nvc), `libcocotbfli_modelsim.so`가 들어 있습니다.

이 장은 CocoTB의 모델·기본 API·driver-RTL cosim 패턴·pytest 통합까지 다룹니다. 예제는 모두 macOS 27.2.1(Apple M2 Pro)에서 cocotb 2.0.1, cocotbext-axi 0.1.28, cocotb-coverage 2.0, Python 3.13으로 Verilator 5.054와 Icarus Verilog 13.0 위에서 돌렸고, 출력은 그 실행에서 옮겼습니다.

## 어떤 문제를 푸는가

SV testbench로도 모든 것을 할 수 있지만, driver 팀 입장에서는 불편한 점이 셋 있습니다.

- **언어 장벽** — driver 개발자는 C·Python에 익숙하고, SV의 class·interface·clocking block은 따로 배워야 합니다.
- **라이브러리** — JSON parser·HTTP client·numpy 같은 도구를 SV에서 쓰려면 DPI로 C 라이브러리를 감싸야 합니다.
- **test runner** — pytest의 parametrize·fixture·선택 실행 같은 기능을 SV testbench에서 쓰려면 직접 만들어야 합니다.

CocoTB는 *simulator를 그대로 쓰면서* 그 위에 Python layer만 얹어 이 셋을 Python 쪽에서 풉니다. 비유하면 기존 공장(simulator) 설비는 그대로 두고 제어실만 Python으로 바꾸는 방식입니다.

## 어떻게 동작하는가

CocoTB의 본체는 *Python 인터프리터를 simulator 프로세스 안에 띄우는* shim입니다. 실행 로그 첫 줄이 이 사실을 그대로 보여 줍니다.

```text
-.--ns INFO     gpi    ..mbed/gpi_embed.cpp:94   in _embed_init_python   Using Python 3.13.9 interpreter at .../venv/bin/python
-.--ns INFO     gpi    ../gpi/GpiCommon.cpp:79   in gpi_print_registered_impl   VPI registered
 0.00ns INFO     cocotb   Running on Verilator version 5.054 2026-11-01
 0.00ns INFO     cocotb   Initialized cocotb v2.0.1 from .../site-packages/cocotb
```

![CocoTB Architecture](/images/blog/driver-cosim/diagrams/ch04-cocotb-arch.svg)

simulator는 평소처럼 돌고, Python coroutine이 `await`한 trigger(edge, timer, ReadOnly 등)가 발생할 때만 simulator가 cocotb에 제어를 넘깁니다. cocotb scheduler는 그 trigger를 기다리던 coroutine들을 이어서 실행하고, 다음 trigger를 등록한 뒤 simulator에 제어를 돌려줍니다.

## 가장 작은 예제

아래는 **cocotb 2.0 API**로 clock과 reset을 명시한 test입니다. reset 동안 `status`가 `4'hA`이고 reset을 푼 다음 edge에서 0이 되는 RTL을 대상으로 합니다.

```systemverilog title="top.sv"
module top(input logic clk, input logic rst, output logic [3:0] status, output logic [31:0] data_bus_q,
           input logic [31:0] data_bus);
  always_ff @(posedge clk) begin
    if (rst) status <= 4'hA;
    else status <= 0;
    data_bus_q <= data_bus;
  end
endmodule
```

```python title="test_basic.py"
import cocotb
from cocotb.clock import Clock
from cocotb.triggers import RisingEdge, FallingEdge, ReadOnly, Timer

@cocotb.test()
async def reset_then_idle(dut):
    dut.rst.value = 1
    clock = Clock(dut.clk, 10, unit="ns")
    clock.start()
    for _ in range(2):
        await RisingEdge(dut.clk)
    await ReadOnly()
    dut._log.info("status during reset = %s", dut.status.value)
    await FallingEdge(dut.clk)
    dut.rst.value = 0
    await RisingEdge(dut.clk)
    await ReadOnly()
    assert int(dut.status.value) == 0
    clock.stop()
```

clock을 Python에서 구동하므로 HDL 쪽에서 같은 clock을 또 구동하면 안 됩니다. 빌드+실행은 Makefile 한 장입니다.

```makefile
# Makefile
SIM ?= verilator
TOPLEVEL_LANG = verilog
VERILOG_SOURCES = $(PWD)/top.sv
TOPLEVEL = top
COCOTB_TEST_MODULES = test_basic

include $(shell cocotb-config --makefiles)/Makefile.sim
```

`make` 한 번이 Verilator로 RTL을 빌드하고, cocotb의 VPI library를 link하고, `test_basic` 모듈의 test를 실행해 결과 표를 찍습니다. `make SIM=icarus`로 바꾸면 같은 test가 Icarus에서 돕니다. 두 simulator의 결과는 다음과 같았습니다(아래 signal proxy test 포함). 이 장의 cocotb 로그는 열 간격을 줄이고 필요한 줄만 발췌했으며, 전체 로그는 실행 디렉터리에 남겼습니다.

```text
$ make SIM=verilator
    10.00ns INFO     cocotb.top     status during reset = 1010
    20.00ns INFO     cocotb.regression   test_basic.reset_then_idle passed
** test_basic.reset_then_idle     PASS          20.00           0.00      50141.11  **
** test_basic.signal_proxy        PASS          11.00           0.00      44150.57  **
** TESTS=2 PASS=2 FAIL=0 SKIP=0                 31.00           0.00      19632.74  **
$ make SIM=icarus
** TESTS=2 PASS=2 FAIL=0 SKIP=0                 31.00           0.00      28920.73  **
```

실패하면 assertion 메시지와 traceback이 찍히고 표의 해당 줄이 FAIL이 됩니다. waveform은 simulator trace 옵션과 dump 설정을 따로 켜야 남습니다.

## 핵심 API — Awaitable과 신호 접근

CocoTB의 어휘 핵심은 **awaitable**과 **signal proxy**입니다.

### Awaitable

```python
from cocotb.triggers import RisingEdge, FallingEdge, Timer, ReadOnly, Event

await RisingEdge(dut.clk)        # 다음 rising edge까지 대기
await Timer(100, unit="ns")      # simulation 시간 100 ns 진행
await ReadOnly()                 # 현재 timestep의 HDL 평가가 모두 끝난 뒤
event = Event()
await event.wait()               # 다른 coroutine이 set할 때까지
```

`async def`로 정의한 함수를 `cocotb.test()`로 등록하면 cocotb scheduler가 그것을 *coroutine*으로 실행합니다. `await` 한 번이 "simulation 시간이 그 지점까지 흐를 때까지 양보한다"는 뜻입니다.

### Signal proxy

DUT의 신호는 `dut.<name>` 형태로 노출됩니다. 아래 test는 `0xDEADBEEF`를 입력에 쓰고, rising edge 직후와 ReadOnly 뒤에 flip-flop 출력을 읽은 다음, `.value` 없이 대입을 시도합니다.

```python
@cocotb.test()
async def signal_proxy(dut):
    clock = Clock(dut.clk, 10, unit="ns"); clock.start()
    dut.data_bus.value = 0xDEADBEEF
    await RisingEdge(dut.clk)
    dut._log.info("right after edge: data_bus_q=%s", dut.data_bus_q.value)
    await ReadOnly()
    dut._log.info("ReadOnly: str=%s int=0x%X", str(dut.data_bus_q.value), int(dut.data_bus_q.value))
    await Timer(1, unit="ns")
    try:
        dut.data_bus = 1
    except Exception as e:
        dut._log.info("dut.data_bus = 1 raised %s: %s", type(e).__name__, e)
    clock.stop()
```

```text
# Verilator 5.054
30.00ns  right after edge: data_bus_q=00000000000000000000000000000000
30.00ns  ReadOnly: str=11011110101011011011111011101111 int=0xDEADBEEF
31.00ns  dut.data_bus = 1 raised AttributeError: Cannot set attribute 'data_bus' on simulation object top. Did you forget to add `.value`?
# Icarus 13.0
30.00ns  right after edge: data_bus_q=ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
30.00ns  ReadOnly: str=11011110101011011011111011101111 int=0xDEADBEEF
```

세 가지를 확인할 수 있습니다. 첫째, `str(value)`는 MSB부터 쓴 binary 문자열입니다. 둘째, rising edge 직후에는 flip-flop이 아직 갱신되지 않았고 ReadOnly 뒤에야 새 값이 보입니다. cocotb 문서의 timing model 절이 RisingEdge 직후를 "no HDL that reacts to that value change will have executed"로, ReadOnly를 "all HDL will have executed for the time step"으로 설명하는 그대로입니다. 셋째, 갱신 전 값은 simulator마다 다릅니다. 2-state인 Verilator는 0을, 4-state인 Icarus는 Z를 보여 줬습니다. 같은 문서는 ReadOnly 단계에서 "no writes are allowed"라고 적으므로, 값을 다시 쓰려면 다음 Timer나 edge 뒤로 미룹니다.

## Bus driver/monitor 패턴

cocotb-bus와 cocotbext-* 라이브러리는 bus protocol의 driver/monitor 클래스를 제공합니다. 아래는 cocotbext-axi의 `AxiLiteMaster`로 AXI4-Lite register slave RTL(register 4개, 범위 밖 주소는 SLVERR)을 두드리는 test입니다.

```python
from cocotbext.axi import AxiLiteBus, AxiLiteMaster, AxiResp

@cocotb.test()
async def axil_write_read(dut):
    Clock(dut.clk, 10, unit="ns").start()
    axil = AxiLiteMaster(AxiLiteBus.from_prefix(dut, "s_axil"), dut.clk, dut.rst)
    dut.rst.value = 1
    for _ in range(2):
        await RisingEdge(dut.clk)
    dut.rst.value = 0
    await axil.write(0x4, b"\x12\x34\x56\x78")
    data = await axil.read(0x4, 4)
    assert data.data == b"\x12\x34\x56\x78"
    wr = await axil.write(0x40, b"\x00\x00\x00\x00")
    assert wr.resp == AxiResp.SLVERR
```

```text
10.00ns  cocotb.axil_regs.s_axil  Write start addr: 0x00000004 prot: 2 data: 12 34 56 78
50.00ns  cocotb.axil_regs.s_axil  Write complete addr: 0x00000004 prot: 2 resp: 0 length: 4
80.00ns  cocotb.axil_regs.s_axil  Read complete addr: 0x00000004 prot: 2 resp: 0 data: 12 34 56 78
120.00ns cocotb.axil_regs.s_axil  Write complete addr: 0x00000040 prot: 2 resp: 2 length: 4
** TESTS=1 PASS=1 FAIL=0 SKIP=0   120.00   0.01   17291.35  **
```

`AxiLiteMaster`가 AW·W·B 채널 handshake를 캡슐화하므로 test 작성자는 *transaction-level*에서 생각합니다. 위 로그에서 write 한 건이 10 ns clock으로 40 ns(4 cycle), read가 30 ns 걸린 것은 이 RTL slave의 구현 결과입니다. `from_prefix(dut, "s_axil")`은 `s_axil_awaddr`·`s_axil_wvalid` 같은 이름 규칙으로 port를 찾습니다.

같은 저자(Alex Forencich)의 cocotbext-pcie·cocotbext-eth·cocotbext-uart·cocotbext-i2c와, 다른 저자의 cocotbext-spi가 PyPI에 있습니다(2026-11-16 PyPI JSON API 확인). 이 장에서 실제로 돌린 것은 cocotbext-axi뿐입니다.

## Driver C 코드와 결합

cosim의 본질은 *driver C 코드를 같이 돌리는 것*입니다. CocoTB에서 C를 붙이는 지점은 Python과 C 사이(ctypes·cffi)와 HDL과 C 사이(DPI) 두 곳입니다.

### host C callback 계약부터 분리 검증하기

동기 ctypes callback은 Python coroutine을 await할 수 없습니다. C driver가 blocking MMIO 완료를 기다리는 동안 같은 thread의 cocotb scheduler가 멈추면 simulation도 진행하지 못합니다. 실제 연결은 C가 요청을 queue에 넣고, simulator가 소유한 coroutine이 그 요청을 bus transaction으로 바꾼 뒤 완료 응답을 돌려주는 구조로 설계합니다. kernel inline `readl`/`writel`이나 직접 포인터 store는 함수 호출이 아니므로 `LD_PRELOAD`로 가로챌 수 없습니다.

다음은 RTL 연결에 앞서 callback signature와 수명을 검사하는 **host 메모리 모델**입니다. cocotb timing 검증이 아닙니다.

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

```text
$ clang -shared -fPIC driver-hooks.c -o libdriver-hooks.so
$ python3 ffi-check.py ./libdriver-hooks.so
host callback uint32/bounds/lifetime checks passed
```

Homebrew clang 23.1.5로 빌드해 미등록 callback, uint32 high bit, 잘못된 주소, NULL callback으로 바꾼 뒤의 호출 거부를 확인했습니다. 이것은 C callback 경계의 검증이며 RTL bus handshake의 증거가 아닙니다.

### DPI와 Python scenario의 연결

export DPI task를 선언했다고 cocotb에서 `await dut.some_task()`로 SV task를 호출할 수 있는 것은 아닙니다. cocotb 2.0.1의 `cocotb/handle.py`에 있는 handle 클래스는 hierarchy·값·배열을 다루는 것들(`HierarchyObject`, `LogicObject`, `ArrayObject` 등)이고, 파일 어디에도 `__call__`이 없습니다. Python이 start/done signal에 요청을 쓰고 HDL/DPI 쪽이 완료 상태를 돌려주는 mailbox를 RTL에 두는 것이 이 시리즈의 연결 방법입니다. 이 mailbox 구성은 이 장에서 실행하지 않았습니다.

## Pytest 통합

Makefile 대신 Python runner로 빌드·실행할 수도 있습니다. cocotb 1.8.0 release note가 runner를 "an experimental replacement for the traditional Makefile-based build and run flow"로 소개했고, 2.0.0에서 `cocotb.runner`가 `cocotb_tools.runner`로 옮겨졌습니다.

```python
# test_pytest.py
from pathlib import Path
from cocotb_tools.runner import get_runner

HERE = Path(__file__).parent

def test_dut():
    runner = get_runner("verilator")
    runner.build(
        sources=[HERE / "top.sv"],
        hdl_toplevel="top",
        always=True,
    )
    runner.test(
        hdl_toplevel="top",
        test_module="test_basic",
    )
```

```text
$ pytest -v test_pytest.py
test_pytest.py::test_dut PASSED                                          [100%]
============================== 1 passed in 5.46s ===============================
```

CI에 쓰려면 cocotb test 실패가 pytest 실패로 올라오는지가 중요합니다. 항상 실패하는 test module을 같은 runner로 돌리면 pytest가 실패하고 exit code 1을 돌려줍니다.

```text
** test_fail.always_fails         FAIL           0.00           0.00          0.00  **
FAILED test_pytest_fail.py::test_dut_fail - SystemExit: 1
1 failed in 0.43s
rc=1
```

이 구조 위에서 pytest의 **parametrize**(같은 runner를 설정별로 반복), **fixture**(빌드 결과 재사용), `-k`·`-m` 선택 실행을 그대로 쓸 수 있습니다. 이 장에서 실행한 것은 위 두 test뿐입니다.

## Coverage reporting

cocotb-coverage는 Python decorator로 functional coverage를 모읍니다. 위 AXI-Lite test를 확장해 주소 4개(0x0~0xC)와 read/write를 coverpoint로 두고, 0xC는 일부러 건드리지 않았습니다.

```python
from cocotb_coverage.coverage import CoverPoint, CoverCross, coverage_db

@CoverPoint("top.addr", xf=lambda addr, op: addr, bins=[0x0, 0x4, 0x8, 0xC])
@CoverPoint("top.op", xf=lambda addr, op: op, bins=["read", "write"])
@CoverCross("top.cross", items=["top.addr", "top.op"])
def sample(addr, op):
    pass
```

```text
220.00ns INFO  cocotb.axil_regs  top.addr: 3/4 bins, 75.0%
220.00ns INFO  cocotb.axil_regs  top.op: 2/2 bins, 100.0%
220.00ns INFO  cocotb.axil_regs  top.cross: 6/8 bins, 75.0%
```

`coverage_db.export_to_xml("coverage.xml")`이 만든 파일에는 bin별 hit 수가 들어 있어서, 비어 있는 bin(`bin="12" hits="0"`)을 CI에서 바로 찾을 수 있습니다.

```text
<top abs_name="top" size="14" coverage="11" cover_percentage="78.57">
  <addr size="4" coverage="3" cover_percentage="75.0" abs_name="top.addr" weight="1" at_least="1">
    <bin0 bin="0" hits="2" abs_name="top.addr.bin0" />
    <bin3 bin="12" hits="0" abs_name="top.addr.bin3" />
```

## 흔한 함정

- **`.value` 누락** — cocotb 2.0.1에서 `dut.signal = 1`은 조용히 무시되지 않고 `AttributeError: Cannot set attribute ... Did you forget to add .value?`로 test를 깨뜨립니다. 반드시 `dut.signal.value = 1`입니다.
- **same-timestep race** — RisingEdge 직후에는 flip-flop 출력이 아직 이전 값입니다. 위 실행에서 Verilator는 0, Icarus는 Z를 보여 줬습니다. 새 값을 확인하려면 ReadOnly를 기다리고, ReadOnly 뒤에는 같은 timestep에 쓰지 않습니다.
- **logger** — `print()`도 되지만 `dut._log.info(...)`는 simulation 시각과 logger 이름을 붙여 줍니다. 위 로그의 `30.00ns INFO cocotb.top`이 그 형식입니다.
- **simulator 차이** — 같은 test가 Verilator 5.054와 Icarus 13.0에서 모두 통과했지만, 초기화되지 않은 값처럼 2-state/4-state 차이가 드러나는 지점은 결과가 다릅니다. VCS·Questa·Xcelium은 실행하지 않았습니다.

## 정리

- **CocoTB**는 RTL testbench를 *Python*으로 쓰는 프레임워크입니다. simulator 프로세스 안에 Python을 embed하고 VPI/VHPI/FLI로 신호에 접근합니다.
- 어휘는 *awaitable*(`RisingEdge`, `Timer`, `ReadOnly`)과 *signal proxy*(`dut.x.value`) 둘입니다. edge 직후와 ReadOnly 뒤의 값이 다릅니다.
- cocotbext-axi `AxiLiteMaster`로 RTL slave에 write/read/SLVERR를 transaction 단위로 확인했습니다.
- ctypes 동기 callback과 simulator coroutine scheduling은 분리하며, DPI task 선언만으로 Python에서 SV task를 호출할 수는 없습니다.
- **pytest** runner에서 cocotb 실패가 pytest 실패(rc=1)로 올라오므로 CI에 바로 씁니다.
- Functional coverage는 cocotb-coverage로 모으고, XML로 빈 bin을 찾습니다.

## 다음 장 예고

다음 장은 *추상화를 한 단계 더 올려* **SystemC TLM**(Transaction-Level Modeling)을 다룹니다. signal 대신 transaction을 단위로 모델을 짜는 방식과, 그 위에 virtual platform을 올리는 구조입니다.

## 1차 자료와 실행 환경

- [cocotb 2.0 timing model](https://docs.cocotb.org/en/v2.0.0/timing_model.html) — RisingEdge·ReadOnly 시점, ReadOnly의 "no writes"
- [cocotb 2.0 runner](https://docs.cocotb.org/en/v2.0.0/runner.html), [release notes](https://docs.cocotb.org/en/v2.0.0/release_notes.html) — 1.8.0 runner 도입, 2.0.0 `cocotb_tools.runner` 이동
- cocotbext-axi 0.1.28 소스(`axil_master.py`), cocotb-coverage 2.0
- cocotb 2.0.1 설치 패키지 — `cocotb/libs/` 파일 목록, `cocotb/handle.py` 클래스 정의

실행 환경은 macOS 27.2.1, Apple M2 Pro, cocotb 2.0.1(Python 3.13 venv), Verilator 5.054, Icarus Verilog 13.0입니다(2026-11-16). cocotb 2.0.1은 Python 3.15를 거부("only supports a maximum Python version of 3.13")해서 3.13 venv를 따로 만들었습니다. 상용 simulator, DPI mailbox 구성, PCIe·Ethernet 등 다른 cocotbext 라이브러리는 실행하지 않았습니다.

## 관련 항목

- [Ch 3: Verilator](/blog/tools/emulation/driver-cosim/chapter03-verilator)
- [Ch 5: SystemC TLM](/blog/tools/emulation/driver-cosim/chapter05-systemc-tlm)
- [Ch 8: 실행 파일과 시나리오 연결](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — 공유 library와 실행 binary를 구분
