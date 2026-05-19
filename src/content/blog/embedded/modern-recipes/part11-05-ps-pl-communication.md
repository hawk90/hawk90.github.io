---
title: "11-05: PS-PL 통신 (Zynq) — GP·HP·ACP 인터페이스 선택"
date: 2026-05-17T07:00:00
description: "Zynq의 GP·HP·ACP·M_AXI·S_AXI 인터페이스를 latency·throughput·cache coherence 관점에서 비교합니다."
series: "Modern Embedded Recipes"
seriesOrder: 127
tags: [recipes, fpga, zynq, ps-pl, axi]
---

## 한 줄 요약

> **"Zynq의 GP/HP/ACP는 *latency × throughput × cache coherence*의 3축에서 다른 자리를 차지합니다."** 작은 control은 GP, 큰 throughput은 HP, cache-coherent shared data는 ACP가 답입니다.

## 어떤 상황에서 쓰나

Zynq 7000, UltraScale+, Versal 등 SoC FPGA에서 *ARM PS(Processing System)*와 *PL(Programmable Logic)*이 데이터를 주고받을 때마다 인터페이스 선택이 필요합니다. 이걸 잘못 고르면 throughput이 1/10로 줍니다.

## 핵심 개념 — 인터페이스 종류

Zynq 7000 기준입니다 (UltraScale+는 더 다양함).

```text
PS → PL (PS가 master, PL이 slave):
  M_AXI_GP0, GP1                — General Purpose, 32-bit, 250 MHz
                                  → PL의 control register access

PL → PS (PL이 master, PS가 slave):
  S_AXI_GP0, GP1                — 32-bit, 일반 access
  S_AXI_HP0..HP3                — High Performance, 64-bit, ~600 MB/s 각
                                  → DDR 직접 access (cache bypass)
  S_AXI_ACP                     — Accelerator Coherency Port, 64-bit
                                  → L2 cache coherent
```

| 인터페이스 | 폭 | Cache coherent | 용도 |
|---|---|---|---|
| M_AXI_GP | 32 | No | PS → PL register write |
| S_AXI_GP | 32 | No | PL → PS, 작은 size |
| S_AXI_HP | 64 | No (cache bypass) | PL → DDR, 큰 throughput |
| S_AXI_ACP | 64 | Yes (L2) | PL ↔ PS cache-shared data |

## GP — Control Register

```verilog
// PL 측 AXI-Lite slave (M_AXI_GP의 target)
module ctrl_regs (
    input  wire        s_aclk,
    input  wire        s_aresetn,
    // ... AXI-Lite slave signals
    output reg  [31:0] cmd,
    output reg  [31:0] args[0:7],
    input  wire [31:0] status,
    input  wire [31:0] res[0:7]
);
```

PS의 Cortex-A에서 일반 pointer write로 PL register에 access:

```c
volatile uint32_t *regs = (uint32_t*)0x43C00000;   // BAR base
regs[0] = OP_PROCESS;          // cmd
regs[1] = buf_addr;
regs[2] = buf_len;
```

작은 control은 GP, *전송 비용*은 µs 단위. 큰 data 못 옮김.

## HP — DDR Bulk Throughput

PL에서 DDR에 직접 read/write. PS의 L1/L2 cache를 *우회*합니다.

```text
S_AXI_HP path:
  PL AXI master → HP port → DDR controller → DDR

throughput: 64-bit × 150 MHz × 4 port = ~4.8 GB/s 이론값
```

```c
// PS 측에서 buffer 준비
uint8_t *buf = aligned_alloc(64, SIZE);
// cache 일관성 위해 *PS write 후 flush*
__clean_dcache_area_poc(buf, SIZE);

// PL에 buf physical addr 전달
regs[0] = OP_DMA;
regs[1] = virt_to_phys(buf);
regs[2] = SIZE;

// PL이 HP로 DDR에서 read
// 완료 IRQ 받음

// 결과는 *PL이 DDR에 write*. PS는 cache invalidate 후 read.
__invalidate_dcache_area_poc(buf, SIZE);
process(buf);
```

Cache flush/invalidate를 잊으면 *옛 cache 값*을 봅니다.

## ACP — Cache-Coherent

PL이 L2 cache에 *coherent*하게 access. Cache flush 필요 없음.

```text
S_AXI_ACP path:
  PL → ACP port → L2 cache (snoop) → DDR (miss 시)

throughput: HP보다 *낮음* (~400 MB/s)
latency:    HP보다 *낮음* (cache hit 시)
```

```c
// PS 측 — cache flush 필요 없음
uint8_t *buf = aligned_alloc(64, SIZE);
prepare(buf);

regs[0] = OP_ACP_DMA;
regs[1] = virt_to_phys(buf);
regs[2] = SIZE;

// PL이 ACP로 read — L2 cache에서 가져옴
// PL이 ACP로 write — L2 cache에 쓰임 (snoop)
// PS가 buf를 다시 읽으면 자동 coherent
process(buf);
```

작은 frequent transaction에 유리. 큰 bulk는 cache pollution 위험.

## 선택 가이드

| 사용 사례 | 인터페이스 |
|---|---|
| PL register polling | M_AXI_GP |
| 1 KB 이하, control 위주 | M_AXI_GP + S_AXI_GP |
| 1 KB 이상, throughput | S_AXI_HP |
| 자주 access, cache 공유 | S_AXI_ACP |
| Stream (camera, network) | S_AXI_HP + descriptor in GP |
| Real-time DMA | S_AXI_HP (predictable latency) |

## AXI Lite slave 예 (M_AXI_GP 측)

```verilog
module mbox_lite #(
    parameter ADDR_W = 8
)(
    input  wire        clk,
    input  wire        rstn,
    // AXI Lite slave
    input  wire [ADDR_W-1:0] s_awaddr,
    input  wire        s_awvalid,
    output wire        s_awready,
    input  wire [31:0] s_wdata,
    input  wire [3:0]  s_wstrb,
    input  wire        s_wvalid,
    output wire        s_wready,
    output wire [1:0]  s_bresp,
    output wire        s_bvalid,
    input  wire        s_bready,
    input  wire [ADDR_W-1:0] s_araddr,
    input  wire        s_arvalid,
    output wire        s_arready,
    output wire [31:0] s_rdata,
    output wire [1:0]  s_rresp,
    output wire        s_rvalid,
    input  wire        s_rready,
    // User signal
    output reg  [31:0] cmd,
    output reg  [31:0] doorbell,
    input  wire [31:0] status
);
    // ... 매우 길어짐. Vivado IP Wizard가 자동 생성 가능
endmodule
```

손으로 짜면 한 모듈에 100+ line. Vivado의 *Create and Package New IP → AXI Peripheral* wizard가 boilerplate를 만들어 줍니다.

## AXI Master (S_AXI_HP 측)

```verilog
module dma_engine (
    input  wire        clk,
    input  wire        rstn,
    // AXI master
    output reg  [31:0] m_araddr,
    output reg  [7:0]  m_arlen,        // burst length
    output reg  [2:0]  m_arsize,
    output reg  [1:0]  m_arburst,      // INCR / WRAP
    output reg         m_arvalid,
    input  wire        m_arready,
    input  wire [63:0] m_rdata,
    input  wire        m_rvalid,
    output reg         m_rready,
    input  wire        m_rlast,
    // Control
    input  wire        start,
    input  wire [31:0] src_addr,
    input  wire [31:0] len_bytes
);
    // burst read state machine
endmodule
```

Burst size를 키울수록 throughput이 좋습니다. AXI는 최대 256 beat까지 한 burst.

## Linux에서 PL과 통신

### /dev/mem로 register access

```c
int fd = open("/dev/mem", O_RDWR | O_SYNC);
volatile uint32_t *regs = mmap(NULL, 0x1000, PROT_READ | PROT_WRITE,
                                MAP_SHARED, fd, 0x43C00000);
regs[0] = 0x1234;
```

테스트용은 OK. Production은 UIO 사용.

### UIO

```c
int fd = open("/dev/uio0", O_RDWR);
volatile uint32_t *regs = mmap(NULL, 0x1000, PROT_READ | PROT_WRITE,
                                MAP_SHARED, fd, 0);
regs[0] = OP_START;

uint32_t irq_count;
read(fd, &irq_count, 4);    /* wait IRQ */
```

Device tree에 PL device 등록:

```text
my_accel@43c00000 {
    compatible = "generic-uio";
    reg = <0x43c00000 0x1000>;
    interrupt-parent = <&intc>;
    interrupts = <0 29 4>;
};
```

### DMA buffer

```c
// CMA-allocated coherent buffer
void *buf = dma_alloc_coherent(dev, SIZE, &dma_handle, GFP_KERNEL);
// dma_handle은 physical addr — PL에 전달
```

cache invalidate를 kernel이 자동 처리.

## 측정 — 인터페이스별 throughput

Zynq Z-7020, 100 MHz fabric, 533 MHz DDR3 기준입니다.

| 인터페이스 | bandwidth (이론) | 실측 (sustained) |
|------------|------------------|-------------------|
| `M_AXI_GP` | 32-bit × 100 MHz | ~80 MB/s (write), ~50 MB/s (read) |
| `S_AXI_HP` | 64-bit × 150 MHz | ~600 MB/s |
| `S_AXI_ACP` | 64-bit × 150 MHz | ~400 MB/s (cache hit), ~150 MB/s (miss) |
| 4× `S_AXI_HP` | parallel | ~2 GB/s aggregate |

Camera 1080p60 (~370 MB/s)는 *HP 하나*면 충분. 4K60 raw 12-bit (~3 GB/s)는 *4× HP* 또는 압축 필요.

## 자주 보는 함정

> Cache invalidate 누락

```c
dma_read_to(buf, SIZE);    /* PL이 buf 채움 */
process(buf);              /* PS가 옛 cache 값 봄 */
```

`__invalidate_dcache_area_poc(buf, SIZE)` 또는 non-cacheable 영역 사용.

> Write coalescing 없는 HP

```verilog
// 1 byte씩 100번 write → 100 transaction
// 32-byte burst 1번 = 25 cycle, 100배 차이
```

PL DMA는 *burst* 단위로 묶기. 1 cycle 1 transaction은 throughput을 망칩니다.

> ACP를 큰 bulk에 사용

```text
1 MB을 ACP로 read → L2 cache (256 KB) 전체 오염 → PS performance 폭락
```

ACP는 *작고 잦은* access에. Bulk는 HP.

> GP에 큰 데이터 보냄

```c
for (int i = 0; i < 1024; i++) regs[i] = data[i];
/* → MMIO 1024번, 수십 ms */
```

GP는 control만. Bulk는 DMA + HP/ACP.

> Multiple master 충돌

```text
HP0: camera DMA
HP1: network packet
HP2: video encoder
HP3: audio

→ DDR bandwidth 한계로 *serialize* + jitter 증가
```

Total HP throughput ≤ DDR bandwidth × 0.7 (efficiency). 4× HP의 합이 DDR 한계를 넘으면 backpressure.

> AXI handshake protocol 위반

`valid`가 떨어진 후 *그대로 유지*해야 `ready`까지 기다림. 중간에 `valid`를 떨구면 *bus hang*.

## 정리

- Zynq PS-PL은 GP (control), HP (throughput), ACP (coherent) 세 종류.
- GP는 32-bit 250 MHz, 작은 register access.
- HP는 64-bit 150 MHz × 4 port, ~2 GB/s aggregate, cache bypass.
- ACP는 cache-coherent, 작은 frequent access에 유리.
- HP 사용 시 cache flush/invalidate 명시.
- Burst size 키우기 = throughput 키우기.
- Linux는 UIO + dma_alloc_coherent가 표준.
- DDR bandwidth 한계를 항상 염두에.

다음 편은 **Mailbox Protocol**입니다.

## 관련 항목

- [11-01: FPGA 기초](/blog/embedded/modern-recipes/part11-01-fpga-basics)
- [11-04: AXI 인터페이스](/blog/embedded/modern-recipes/part11-04-axi)
- [11-06: Mailbox Protocol](/blog/embedded/modern-recipes/part11-06-mailbox-protocol)
- [11-08: DMA Completion](/blog/embedded/modern-recipes/part11-08-dma-completion)
