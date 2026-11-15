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

이 장은 BFM의 정의, 역할(master·slave·monitor), DPI-C와의 결합, protocol assertion까지를 다룹니다. cosim 환경에서 BFM이 *없다면* driver 한 줄 한 줄을 RTL 신호 한 토글씩 짜야 하는데, BFM이 있으면 *transaction 단위*로 사고할 수 있습니다.

## 어떤 문제를 푸는가

driver의 다음 호출을 떠올려 봅시다.

```c
writel(0xDEADBEEF, dev->regs + REG_CTRL);
```

이걸 cosim 환경에서 *문자 그대로* 실현하려면 RTL의 AXI Lite slave에 다음 시퀀스를 보내야 합니다.

1. `AWVALID=1`, `AWADDR=...`, `AWREADY=1`을 기다림
2. `WVALID=1`, `WDATA=0xDEADBEEF`, `WSTRB=0xF`, `WREADY=1`을 기다림
3. `BVALID=1`을 기다리고 `BREADY=1`로 ack

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

가장 흔한 조합:
- **AXI4 Master BFM (C, DPI)** — driver가 register/메모리에 접근.
- **AXI4 Slave BFM (C, DPI)** — DUT가 외부 메모리에 DMA 요청을 보낼 때 응답.
- **AXI4 Monitor BFM (SV)** — protocol assertion + transaction log.

세 가지가 함께 있어야 *driver→DUT→메모리→driver*의 끝-끝 사이클이 완성됩니다.

## Master BFM 구현 스케치

AXI-Lite Master BFM의 최소 골격(SV 쪽).

```systemverilog
// axi_lite_master_bfm.sv
module axi_lite_master_bfm(
  input  wire        clk, rst_n,
  output reg  [31:0] awaddr, output reg awvalid, input wire awready,
  output reg  [31:0] wdata,  output reg [3:0] wstrb, output reg wvalid, input wire wready,
  input  wire        bvalid, input wire [1:0] bresp, output reg bready,
  output reg  [31:0] araddr, output reg arvalid, input wire arready,
  input  wire [31:0] rdata,  input wire [1:0] rresp, input wire rvalid, output reg rready
);

  // DPI-C로 노출
  export "DPI-C" task bfm_write;
  export "DPI-C" task bfm_read;

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

C helper의 호출 계약을 보여 주는 조각입니다. export된 task는 임의의 C thread에서 부를 수 있는 일반 함수가 아닙니다. caller가 SystemVerilog context 안에 있어야 하므로, 예를 들면 simulator가 호출한 DPI `context` 경로에서 실행합니다. Python coroutine이나 별도 host thread에서는 요청 queue와 simulator-owned coroutine으로 연결합니다.

```c
// driver_harness.c
#include <stdint.h>
extern void bfm_write(uint32_t addr, uint32_t data, int timeout_cycles);
extern void bfm_read(uint32_t addr, uint32_t *data, int timeout_cycles);

uint32_t my_driver_read(uint32_t offset) {
    uint32_t val;
    bfm_read(offset, &val, 1000);
    return val;
}

void my_driver_write(uint32_t offset, uint32_t data) {
    bfm_write(offset, data, 1000);
}
```

driver는 *자기 시그니처*(`my_driver_read/write`)를 호출하면 됩니다. 그 안에서 BFM이 RTL handshake를 모두 처리합니다.

## Slave BFM — 응답을 누가 하나

DUT가 메모리에 *DMA*를 요청한다면, 그 메모리 쪽에서 응답해 줄 무엇이 필요합니다. 그게 Slave BFM입니다. 보통 *RAM 모델*과 결합해서 씁니다.

```c
// axi_slave_bfm_callbacks.c
static uint8_t fake_ram[0x100000];

void bfm_slave_handle_aw(int id, uint32_t addr, uint32_t len, uint32_t size) {
    pending_burst.id    = id;
    pending_burst.addr  = addr;
    pending_burst.len   = len;
    pending_burst.size  = size;
}

void bfm_slave_handle_w(int id, uint32_t data, uint32_t strb, int last) {
    uint32_t addr = pending_burst.addr;
    uint8_t *dst = fake_ram + addr;
    for (int b = 0; b < 4; b++) {
        if (strb & (1 << b)) dst[b] = (data >> (b*8)) & 0xFF;
    }
    pending_burst.addr += 4;
    if (last) bfm_slave_send_b(pending_burst.id, 0);  // OK response
}

uint32_t bfm_slave_handle_ar(int id, uint32_t addr) {
    // memory에서 읽어 응답
    uint32_t *src = (uint32_t *)(fake_ram + addr);
    return *src;
}
```

이 스케치는 burst ID·주소 범위·burst 길이·WSTRB·unaligned 접근·동시 outstanding transaction을 처리하지 않습니다. 여러 transaction을 허용하려면 ID별 상태가 필요하고, 실제 AXI 검증에는 독립 채널을 추적하는 protocol checker와 simulator 실행을 추가합니다. 위 코드를 완전한 AXI RAM으로 사용하지 않습니다.

## Monitor BFM — 위반을 잡다

Monitor BFM은 DUT를 *바꾸지 않고* 관찰만 합니다. 보통 두 역할.

- **Protocol assertion** — VALID가 떴는데 READY 없이 신호가 바뀌면 위반.
- **Transaction logging** — 모든 transaction을 stdout/file로 dump.

```systemverilog
module axi_monitor_bfm(input wire clk, /* ... */);
  // Protocol assertion
  property valid_stable;
    @(posedge clk) disable iff (!rst_n)
    awvalid && !awready |=> $stable(awaddr) && awvalid;
  endproperty
  assert property(valid_stable) else $error("AWADDR changed mid-handshake");

  // Transaction log
  always @(posedge clk) begin
    if (awvalid && awready) begin
      $display("[%0t] AXI WRITE ADDR=%h", $time, awaddr);
    end
  end
endmodule
```

monitor는 *testbench-only*입니다. 합성되지 않으므로 SV의 모든 기능을 자유롭게 씁니다.

## Driver와 BFM의 결합 패턴

cosim 환경에서 driver를 *얼마나 진짜처럼* 만들지가 설계 결정입니다. 세 단계 있는 셈입니다.

| 단계 | driver 변형 | 장점 | 단점 |
|------|--------------|------|------|
| A. 직접 호출 | `my_driver_write(offset, val)` 내부에서 BFM 호출 | 단순 | driver 코드 변경 필요 |
| B. host MMIO shim | 명시적 함수 포인터나 링크 시 대체 symbol로 요청 queue에 전달 | kernel 종속부 분리 | shim과 비동기 완료 계약 필요 |
| C. 가상 page mapping | 보호된 페이지 접근을 fault handler에서 포착 | 일부 legacy 코드를 연결 가능 | signal 안전성·메모리 모델·재진입 위험이 커서 제한된 harness에서만 검토 |

구현은 작은 MMIO shim으로 시작해 driver 수정 범위와 시뮬레이터 계약을 확인합니다. fault 기반 우회는 signal handler의 안전성과 simulator scheduling을 별도로 검증할 때만 선택합니다.

## Protocol 별 BFM 라이브러리

흔히 쓰는 open-source BFM.

| Protocol | 라이브러리 | 비고 |
|----------|-------------|------|
| AXI4/AXI-Lite | cocotbext-axi | Python BFM. cocotb integration |
| AXI4 | verilator-axi-bfm | C++ BFM, Verilator 친화 |
| PCIe | cocotbext-pcie | TLP-level master/slave |
| Ethernet | cocotbext-eth | MAC, GMII, XGMII |
| UART | cocotbext-uart | RX/TX simple |
| AMBA UVM-AXI | Cadence/Synopsys | 상용 UVM BFM |

선택한 BFM이 지원하는 AXI revision·channel·burst·assertion 범위를 확인하고 필요한 기능을 직접 검증합니다.

## Timing checker

protocol assertion 외에 *timing checker*도 함께 둡니다.

- *T_setup* — VALID 신호가 clock edge 이전 N ns에 안정
- *T_hold* — clock edge 이후 N ns 동안 안정
- *T_max_response* — request 후 응답까지 최대 cycle

```systemverilog
// 4-byte burst write가 시작되면 16 cycle 안에 응답
property write_response_timeout;
  @(posedge clk) disable iff (!rst_n)
  $rose(awvalid && awready) |-> ##[1:16] bvalid;
endproperty
assert property(write_response_timeout)
  else $error("AXI write response timeout");
```

이런 assertion은 RTL 버그가 *조용히* 지나가는 걸 막아 줍니다. driver가 응답을 기다리며 hang하는 시나리오가 5분짜리 cosim 안에서 즉시 발견됩니다.

## CocoTB와 결합

CocoTB의 AXI BFM은 *Python에서 곧장* 호출합니다.

```python
from cocotbext.axi import AxiBus, AxiMaster, AxiRam

@cocotb.test()
async def driver_dma_test(dut):
    axi_master = AxiMaster(AxiBus.from_prefix(dut, "m_axi"), dut.clk, dut.rst)
    axi_ram = AxiRam(AxiBus.from_prefix(dut, "s_axi"), dut.clk, dut.rst, size=2**16)

    await axi_master.write(0x1000, b"\xDE\xAD\xBE\xEF")
    data = await axi_master.read(0x1000, 4)
    assert data.data == b"\xDE\xAD\xBE\xEF"

    # DUT가 0x2000에 DMA 데이터를 쓰고 있는지 monitor
    await axi_ram.wait_for_write(0x2000, 64)
```

C BFM과 Python BFM은 *같은 protocol* 같은 *transaction abstraction*을 다른 언어로 표현한 것입니다. 환경에 맞춰 고르면 됩니다.

## 정리

- **BFM**은 driver의 *MMIO/transaction* 추상과 RTL의 *signal handshake* 사이의 protocol-aware adapter.
- 분류 축: protocol(AXI/PCIe/AHB/...)·역할(Master/Slave/Monitor)·언어(SV/C/Python).
- driver의 `writel` 한 줄이 BFM 함수 하나로 매핑되어 testbench의 의미 거리가 *대폭* 줄어듦.
- Slave BFM은 *fake RAM* 등 응답 자원을 같이 제공. DMA 검증의 핵심.
- Monitor BFM은 *protocol assertion + transaction log*. 위반을 cycle 단위로 잡음.
- driver-BFM 결합은 A(직접 호출) → C(가상 page mapping)로 점진적 진화. 대부분은 A로 충분.
- BFM 선택은 protocol revision, channel coverage, assertion 구성, simulator 지원, 유지 비용을 기준으로 합니다.
- Protocol assertion + timing checker가 RTL 버그를 *조용히* 통과시키지 않게 막음.

## 다음 장 예고

다음 장은 검증 측 도구인 **UVM**과 그 위에서 *driver와 reference model을 공유*하는 패턴을 다룹니다. UVM testbench의 reference model을 C로 두고, 같은 C 코드를 driver가 쓰는 *single source of truth* 접근.

## 관련 항목

- [Ch 5: SystemC TLM](/blog/tools/emulation/driver-cosim/chapter05-systemc-tlm)
- [Ch 7: UVM C Reference Model](/blog/tools/emulation/driver-cosim/chapter07-uvm-c-model)
- [PCIe Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — 표의 cocotbext-pcie 같은 PCIe BFM이 다루는 TLP 단위의 구조
- QEMU Fake Device — Register Bank — register 모델링 패턴
- FPGA Driver — AXI/PCIe Bridge
