---
title: "C로 구현하는 Bus Functional Model — Driver 검증용 BFM 설계"
slug: "tools/emulation/driver-cosim/chapter06-bfm"
date: 2026-05-22T09:06:00
description: "Driver와 RTL 사이의 protocol-aware adapter."
series: "Driver-RTL Co-simulation"
seriesOrder: 6
tags: [bfm, axi, pcie, protocol-checker, ahb]
draft: false
topics: ["tools", "tools/emulation"]
---

driver는 *MMIO write/read* 같은 high-level 추상을 다룹니다. RTL은 *AXI handshake와 timing*을 다룹니다. 두 추상 사이를 잇는 protocol-aware adapter가 **BFM**(Bus Functional Model)입니다.

이 장은 BFM의 정의, 역할(master·slave·monitor), DPI-C와의 결합, protocol assertion까지를 다룹니다. BFM이 *없다면* driver 한 줄마다 RTL 신호를 한 토글씩 짜야 하는데, BFM이 있으면 *transaction 단위*로 생각할 수 있습니다. 비유하면 BFM은 통역사입니다. driver는 "0x4에 이 값을 써 줘"라고 말하고, BFM이 그것을 AXI라는 언어의 문장(handshake 순서)으로 옮깁니다. 아래 예제는 모두 Verilator 5.054, Icarus Verilog 13.0, cocotb 2.0.1로 macOS 27.2.1(Apple M2 Pro)에서 실행했습니다.

## 어떤 문제를 푸는가

driver의 다음 호출을 떠올려 봅시다.

```c
writel(0xDEADBEEF, dev->regs + REG_CTRL);
```

이걸 cosim 환경에서 *문자 그대로* 실현하려면 RTL의 AXI4-Lite slave에 다음 시퀀스를 보내야 합니다.

1. `AWVALID=1`, `AWADDR=...`을 올리고 `AWREADY=1`을 기다림
2. `WVALID=1`, `WDATA=0xDEADBEEF`, `WSTRB=0xF`를 올리고 `WREADY=1`을 기다림
3. `BVALID=1`을 기다리고 `BREADY=1`로 응답을 받음

AXI4-Lite의 AW와 W는 별도 채널입니다. 주소와 data handshake는 서로 다른 cycle에 끝날 수 있으므로 BFM은 두 완료 상태를 각각 기억해야 합니다. 응답을 받기 전까지 BFM이 이 상태를 보존하면 driver 호출 한 건으로 캡슐화할 수 있습니다.

```c
axi_master_bfm_write(0x1000, 0xDEADBEEF);
```

이 한 줄이 내부에서 AXI handshake를 처리합니다. AWREADY와 WREADY가 동시에 올라오는 경우만 가정하지 않고 각 채널의 handshake를 따로 처리해야 합니다.

## BFM의 종류

대상 protocol과 역할에 따라 분류됩니다.

| 분류 축 | 옵션 | 의미 |
|---------|------|------|
| 대상 protocol | AXI4·AXI-Lite·AXI-Stream·AHB·APB·PCIe·CXL·OCP·Avalon | 어떤 bus를 시뮬레이션할지 |
| 역할 | Master·Slave·Monitor·Checker | DUT의 어느 쪽 끝에서 동작할지 |
| 구현 언어 | SV·C(DPI)·Python(cocotb) | testbench가 어디서 호출할지 |

이 시리즈의 NPU 예제에서 쓰는 조합은 다음 셋입니다.

- **AXI Master BFM** — driver가 register/메모리에 접근합니다.
- **AXI Slave BFM** — DUT가 외부 메모리에 DMA 요청을 보낼 때 응답합니다.
- **AXI Monitor BFM** — protocol assertion과 transaction log를 남깁니다.

세 가지가 함께 있어야 *driver→DUT→메모리→driver*의 끝-끝 경로가 완성됩니다.

## Master BFM 구현

AXI-Lite Master BFM의 SV 쪽입니다. write는 AW와 W를 동시에 올린 뒤 각 채널의 handshake를 따로 기록하고, 둘 다 끝나면 B를 기다립니다. 모든 대기에는 cycle 상한이 있습니다.

```systemverilog title="axi_lite_master_bfm.sv"
module axi_lite_master_bfm(
  input  wire        clk, rst_n,
  output reg  [31:0] awaddr, output reg awvalid, input wire awready,
  output reg  [31:0] wdata,  output reg [3:0] wstrb, output reg wvalid, input wire wready,
  input  wire        bvalid, input wire [1:0] bresp, output reg bready,
  output reg  [31:0] araddr, output reg arvalid, input wire arready,
  input  wire [31:0] rdata,  input wire [1:0] rresp, input wire rvalid, output reg rready
);
  initial begin awvalid = 0; wvalid = 0; bready = 0; arvalid = 0; rready = 0; end

  task automatic bfm_write(input int unsigned addr, input int unsigned data,
                           input int timeout_cycles);
    bit aw_done, w_done;
    int waited;
    aw_done = 0; w_done = 0;
    @(negedge clk);
    awaddr = addr; awvalid = 1;
    wdata = data; wstrb = 4'hF; wvalid = 1;
    bready = 1;
    waited = 0;
    while ((!aw_done || !w_done) && waited < timeout_cycles) begin
      @(posedge clk);
      if (awvalid && awready) aw_done = 1;
      if (wvalid && wready) w_done = 1;
      waited++;
      @(negedge clk);
      if (aw_done) awvalid = 0;
      if (w_done) wvalid = 0;
    end
    if (!aw_done || !w_done) $fatal(1, "AXI write address/data timeout");
    waited = 0;
    while (!bvalid && waited < timeout_cycles) begin
      @(posedge clk);
      waited++;
    end
    if (!bvalid) $fatal(1, "AXI write response timeout");
    if (bresp != 2'b00) $error("AXI write error resp=%h", bresp);
    @(negedge clk);
    bready = 0;
  endtask

  task automatic bfm_read(input int unsigned addr, output int unsigned data,
                          input int timeout_cycles);
    int waited;
    bit ar_done, r_done;
    @(negedge clk);
    araddr = addr; arvalid = 1; rready = 1;
    waited = 0; ar_done = 0;
    while (!ar_done && waited < timeout_cycles) begin
      @(posedge clk);
      if (arvalid && arready) ar_done = 1;
      waited++;
    end
    if (!ar_done) $fatal(1, "AXI read address timeout");
    @(negedge clk); arvalid = 0;
    waited = 0; r_done = 0;
    while (!r_done && waited < timeout_cycles) begin
      @(posedge clk);
      if (rvalid && rready) begin data = rdata; r_done = 1; end
      waited++;
    end
    if (!r_done) $fatal(1, "AXI read response timeout");
    @(negedge clk); rready = 0;
    if (rresp != 2'b00) $error("AXI read error resp=%h", rresp);
  endtask
endmodule
```

이 BFM을 4장의 AXI4-Lite register slave(`axil_regs`, register 4개, 범위 밖은 SLVERR)에 연결하고 testbench의 initial 블록에서 task를 불렀습니다.

```systemverilog
initial begin
  repeat (2) @(posedge clk); rst = 0;
  bfm.bfm_write(32'h4, 32'hDEADBEEF, 1000);
  bfm.bfm_read(32'h4, v, 1000);
  $display("[%0t] read back 0x%08h", $time, v);
  bfm.bfm_write(32'h40, 32'h0, 1000);   // out of range -> SLVERR
  $display("[%0t] done", $time);
  $finish;
end
```

두 simulator에서 handshake 결과는 같았지만, SLVERR에 대한 `$error`의 처리가 달랐습니다.

```text
$ verilator --binary -j 0 --timing --assert -Wno-fatal --top-module tb tb.sv axi_lite_master_bfm.sv axil_regs.sv axi_monitor.sv
$ ./obj_dir/Vtb
[25000] AXI WRITE ADDR=00000004
[80000] read back 0xdeadbeef
[95000] AXI WRITE ADDR=00000040
[115000] %Error: axi_lite_master_bfm.sv:37: Assertion failed in tb.bfm.bfm_write: AXI write error resp=2
%Error: axi_lite_master_bfm.sv:37: Verilog $stop
Aborting...
$ iverilog -g2012 -o tb.vvp tb_nomon.sv axi_lite_master_bfm.sv axil_regs.sv && vvp -n tb.vvp
[80000] read back 0xdeadbeef
ERROR: axi_lite_master_bfm.sv:37: AXI write error resp=2
       Time: 115000  Scope: tb.bfm.bfm_write
[120000] done
```

Verilator는 `$error` 하나에 simulation을 멈추고 exit 1로 끝났고, Icarus는 메시지를 찍고 `done`까지 진행했습니다(Icarus 실행에는 아래 SVA monitor를 빼고 빌드했습니다). 오류 응답을 *의도한 test*라면 `$error` 대신 결과를 돌려주는 방식으로 바꿔야 두 simulator에서 같은 흐름이 됩니다.

### C에서 이 task를 부를 수 있나

원래 계획은 이 두 task를 `export "DPI-C"`로 내보내 driver C 코드가 직접 부르는 것이었습니다. 시간 제어가 없는 같은 signature로 Verilator 5.054가 생성한 prototype은 다음과 같습니다.

```c
extern void bfm_read(unsigned int addr, unsigned int* data, int timeout_cycles);
extern void bfm_write(unsigned int addr, unsigned int data, int timeout_cycles);
```

하지만 실제 BFM에 export를 붙이면 `@(posedge clk)`가 있는 두 task 모두에서 빌드가 멈춥니다.

```text
%Error-UNSUPPORTED: bfm_export.sv:18:5: Unsupported: Timing controls inside DPI-exported tasks
%Error-UNSUPPORTED: bfm_export.sv:48:5: Unsupported: Timing controls inside DPI-exported tasks
```

그래서 Verilator 기반 구성에서는 C가 BFM task를 직접 부르지 않습니다. C driver는 요청을 queue에 넣고 0-time으로 반환하며, SV 쪽 BFM process가 queue를 비우면서 handshake를 수행한 뒤 완료를 C에 알립니다. 시간 제어가 있는 export task를 지원하는 상용 simulator에서 C가 직접 부르는 구성은 이 글에서 실행하지 않았습니다.

## Slave BFM — 응답을 누가 하나

DUT가 메모리에 *DMA*를 요청한다면, 그 메모리 쪽에서 응답해 줄 무엇이 필요합니다. 그게 Slave BFM이고, 아래 예제는 *RAM 모델*과 결합합니다. 아래 C 모델은 4-byte beat의 INCR burst만 받는 단순 RAM이지만, 주소 범위·WSTRB·WLAST 불일치·동시 burst를 명시적으로 거절합니다.

```c title="axi_slave_ram.c"
#include <stdint.h>
#include <string.h>
#define RAM_SIZE 0x10000u
static uint8_t ram[RAM_SIZE];
struct burst { int active; int id; uint32_t addr; uint32_t beats_left; };
static struct burst wr;                 /* one outstanding write burst only */

/* AW: INCR burst of (len+1) 4-byte beats. Returns AXI resp to latch for B. */
int slave_aw(int id, uint32_t addr, uint32_t len) {
    const uint64_t end = (uint64_t)addr + 4u * ((uint64_t)len + 1u);
    if (wr.active) return -1;           /* caller must stall AWREADY */
    if (addr % 4 || end > RAM_SIZE) return 2;   /* SLVERR */
    wr = (struct burst){1, id, addr, len + 1};
    return 0;
}
/* W beat. Returns 1 when WLAST completes the burst, 0 otherwise, <0 on protocol error. */
int slave_w(uint32_t data, uint32_t strb, int last) {
    if (!wr.active || wr.beats_left == 0) return -1;
    for (int b = 0; b < 4; b++)
        if (strb & (1u << b)) ram[wr.addr + b] = (uint8_t)(data >> (8 * b));
    wr.addr += 4; wr.beats_left--;
    if (last != (wr.beats_left == 0)) { wr.active = 0; return -2; }  /* WLAST mismatch */
    if (last) wr.active = 0;
    return last;
}
int slave_ar(uint32_t addr, uint32_t* data) {
    if (addr % 4 || (uint64_t)addr + 4 > RAM_SIZE) return 2;
    memcpy(data, &ram[addr], 4);       /* host little-endian assumed */
    return 0;
}
```

host에서 ASan/UBSan으로 경계 동작을 확인했습니다. 두 번째 beat는 WSTRB `0x3`이라 하위 2 byte만 써져 `0x00003344`가 읽힙니다.

```text
$ clang -std=c11 -Wall -Wextra -g -fsanitize=address,undefined axi_slave_ram.c check.c -o check && ./check
slave RAM: strobe, bounds, single-outstanding, WLAST checks passed
```

이 모델은 outstanding write burst를 하나만 허용하고, burst ID별 상태·WRAP/FIXED burst·4 byte가 아닌 beat를 처리하지 않습니다. 여러 transaction을 허용하려면 ID별 상태가 필요합니다. 이 C 모델을 RTL에 DPI로 연결한 실행은 이 장에서 하지 않았습니다.

## Monitor BFM — 위반을 잡다

Monitor BFM은 DUT를 *바꾸지 않고* 관찰만 합니다. 역할은 두 가지입니다.

- **Protocol assertion** — VALID가 떴는데 READY 없이 주소가 바뀌면 위반입니다.
- **Transaction logging** — 모든 transaction을 stdout/file로 dump합니다.

```systemverilog title="axi_monitor.sv"
module axi_monitor(input wire clk, input wire rst_n,
                   input wire [31:0] awaddr, input wire awvalid, input wire awready,
                   input wire bvalid);
  property valid_stable;
    @(posedge clk) disable iff (!rst_n)
    awvalid && !awready |=> $stable(awaddr) && awvalid;
  endproperty
  a_valid_stable: assert property(valid_stable) else $error("AWADDR changed mid-handshake");

  property write_response_timeout;
    @(posedge clk) disable iff (!rst_n)
    $rose(awvalid && awready) |-> ##[1:16] bvalid;
  endproperty
  a_bresp_timeout: assert property(write_response_timeout) else $error("AXI write response timeout");

  always @(posedge clk) if (awvalid && awready) $display("[%0t] AXI WRITE ADDR=%h", $time, awaddr);
endmodule
```

위 master BFM 실행 로그의 `[25000] AXI WRITE ADDR=00000004`가 이 monitor의 transaction log입니다. monitor는 testbench 전용이라 합성 대상이 아니므로 `property`·`$stable`·`$display` 같은 simulation 전용 구문을 씁니다. 그렇다고 모든 SV 기능이 모든 simulator에서 되는 것은 아닙니다. Icarus 13.0에 이 monitor를 넣으면 `property`가 있는 줄(4~14행)마다 `syntax error`가 나고 rc=12로 끝납니다. 위 Icarus 실행에서 monitor를 뺀 이유가 그것입니다.

## Driver와 BFM의 결합 패턴

cosim 환경에서 driver를 *얼마나 진짜처럼* 만들지가 설계 결정입니다. 세 단계가 있습니다.

| 단계 | driver 변형 | 장점 | 단점 |
|------|--------------|------|------|
| A. 직접 호출 | `my_driver_write(offset, val)` 내부에서 BFM 요청 | 단순 | driver 코드 변경 필요 |
| B. host MMIO shim | 명시적 함수 포인터나 링크 시 대체 symbol로 요청 queue에 전달 | kernel 종속부 분리 | shim과 비동기 완료 계약 필요 |
| C. 가상 page mapping | 보호된 페이지 접근을 fault handler에서 포착 | 일부 legacy 코드를 연결 가능 | signal 안전성·메모리 모델·재진입 위험이 커서 제한된 harness에서만 검토 |

이 시리즈는 B로 시작합니다(8장의 `cosim_shim.h`). fault 기반 우회(C)는 signal handler의 안전성과 simulator scheduling을 별도로 검증할 때만 선택하며, 이 시리즈에서 구현하지 않았습니다.

## Protocol 별 BFM 라이브러리

PyPI와 GitHub에서 존재를 확인한 open-source BFM입니다(2026-11-16).

| Protocol | 라이브러리 | 비고 |
|----------|-------------|------|
| AXI4/AXI-Lite/AXI-Stream/APB | cocotbext-axi 0.1.28 | 이 장과 4장에서 `AxiLiteMaster`·`AxiLiteRam` 실행 |
| PCIe | cocotbext-pcie 0.2.16 | 실행하지 않음 |
| Ethernet | cocotbext-eth 0.1.28 | 실행하지 않음 |
| UART | cocotbext-uart 0.1.4 | 실행하지 않음 |

cocotbext-axi 패키지에는 `apb.py`도 들어 있습니다. 선택한 BFM이 지원하는 AXI revision·channel·burst·assertion 범위는 그 라이브러리의 소스와 README로 확인하고, 필요한 기능은 직접 돌려 봅니다.

## Timing checker

protocol assertion 외에 *응답 지연 상한*도 함께 둡니다. RTL simulation에는 gate delay가 없으므로 setup/hold 같은 ns 단위 timing은 여기서 다루지 않고, cycle 단위 상한만 봅니다. 위 monitor의 두 번째 property가 "AW handshake 뒤 16 cycle 안에 BVALID"입니다.

```systemverilog
property write_response_timeout;
  @(posedge clk) disable iff (!rst_n)
  $rose(awvalid && awready) |-> ##[1:16] bvalid;
endproperty
```

slave가 B 응답을 20 cycle 늦게 내도록 바꾼 변형으로 돌리면, BFM의 1000 cycle timeout보다 훨씬 먼저 monitor가 잡습니다.

```text
$ ./obj_slow/Vtb
[25000] AXI WRITE ADDR=00000004
[185000] %Error: axi_monitor.sv:14: Assertion failed in tb.mon.a_bresp_timeout: AXI write response timeout
%Error: axi_monitor.sv:14: Verilog $stop
```

25 ns의 AW handshake에서 16 cycle(160 ns) 뒤인 185 ns에 실패가 보고됐습니다. 이런 assertion이 없으면 driver는 BFM timeout까지 1000 cycle을 기다린 뒤에야 원인을 모른 채 실패합니다.

## CocoTB와 결합

cocotb에서는 Python BFM을 *같은 RTL bus*에 붙입니다. 아래 test는 위 SV master BFM을 DUT로 두고, 그 master port(`m_axil_*`)에 cocotbext-axi의 `AxiLiteRam`을 slave로 연결했습니다. SV BFM이 0x1000에 `0xDEADBEEF`를 쓰고 읽은 뒤, Python이 RAM 모델을 backdoor로 읽어 byte를 확인합니다.

```python
from cocotbext.axi import AxiLiteBus, AxiLiteRam

@cocotb.test()
async def sv_bfm_against_python_ram(dut):
    Clock(dut.clk, 10, unit="ns").start()
    ram = AxiLiteRam(AxiLiteBus.from_prefix(dut, "m_axil"), dut.clk, dut.rst, size=2**16)
    dut.rst.value = 1
    for _ in range(2):
        await RisingEdge(dut.clk)
    dut.rst.value = 0
    while not dut.done.value:
        await RisingEdge(dut.clk)
    data = ram.read(0x1000, 4)          # backdoor read of the Python RAM model
    assert data == b"\xef\xbe\xad\xde"
```

```text
$ make SIM=icarus
 30.00ns INFO  cocotb.bfm_top.m_axil  Write data awaddr: 0x00001000 awprot: 0 wstrb: 0x0f data: ef be ad de
 70.00ns INFO  cocotb.bfm_top.m_axil  Read data araddr: 0x00001000 arprot: 0 data: ef be ad de
100.00ns INFO  cocotb.bfm_top         RAM[0x1000..0x1003] = ef be ad de
** TESTS=1 PASS=1 FAIL=0 SKIP=0   100.00   0.00   21389.69  **
[95000] SV BFM read back 0xdeadbeef
```

SV BFM과 Python BFM이 같은 handshake 규칙으로 서로 맞물렸고, 32-bit 값이 little-endian byte로 RAM에 들어갔습니다. 이 장의 이전 판에 있던 `axi_ram.wait_for_write(...)`는 cocotbext-axi 0.1.28 소스 어디에도 없는 메서드라 지웠습니다. 쓰기 완료를 기다리려면 위처럼 DUT의 상태 신호를 기다린 뒤 `read()`로 확인합니다.

## 정리

- **BFM**은 driver의 *MMIO/transaction* 추상과 RTL의 *signal handshake* 사이의 protocol-aware adapter입니다.
- 분류 축은 protocol(AXI/PCIe/AHB/...)·역할(Master/Slave/Monitor)·언어(SV/C/Python)입니다.
- AW/W를 독립적으로 추적하는 SV master BFM이 RTL slave와 Python RAM 모델 양쪽에서 동작했습니다.
- Verilator 5.054는 시간 제어가 있는 export task를 거부하므로, C driver는 요청 queue로 SV BFM에 일을 넘깁니다.
- Slave RAM 모델은 범위·WSTRB·WLAST·동시 burst를 명시적으로 거절해야 하며, host sanitizer 검사로 확인할 수 있습니다.
- Monitor의 assertion은 응답 지연을 16 cycle에서 잡아, BFM timeout(1000 cycle)보다 훨씬 빨리 원인을 보여 줬습니다.
- `$error` 처리는 simulator마다 달랐습니다(Verilator 중단, Icarus 계속).

## 다음 장 예고

다음 장은 검증 측 도구인 **UVM**과 그 위에서 *driver와 reference model을 공유*하는 패턴을 다룹니다. UVM testbench의 reference model을 C로 두고, 같은 C 코드를 driver가 쓰는 *single source of truth* 접근입니다.

## 1차 자료와 실행 환경

- cocotbext-axi 0.1.28 소스 — `axil_ram.py:45` `AxiLiteRam`, `memory.py:38` `read`
- PyPI JSON API(2026-11-16) — cocotbext-pcie/-eth/-uart 버전. `verilator-axi-bfm`은 PyPI 404, GitHub 저장소 이름 검색 0건이라 표에서 뺐습니다
- Verilator 5.054 `src/V3Timing.cpp:954`

실행 환경은 macOS 27.2.1, Apple M2 Pro, Verilator 5.054, Icarus Verilog 13.0, cocotb 2.0.1, Homebrew clang 23.1.5입니다. 상용 simulator와 상용 VIP, C slave 모델의 DPI 연결은 실행하지 않았습니다.

## 관련 항목

- [Ch 5: SystemC TLM](/blog/tools/emulation/driver-cosim/chapter05-systemc-tlm)
- [Ch 7: UVM C Reference Model](/blog/tools/emulation/driver-cosim/chapter07-uvm-c-model)
- [PCIe Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — 표의 cocotbext-pcie 같은 PCIe BFM이 다루는 TLP 단위의 구조
- QEMU Fake Device — Register Bank — register 모델링 패턴
- FPGA Driver — AXI/PCIe Bridge
