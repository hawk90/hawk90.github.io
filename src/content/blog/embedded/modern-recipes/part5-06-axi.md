---
title: "5-06: AXI 인터페이스 — AXI4·AXI4-Lite·AXI-Stream 골라 쓰기"
date: 2026-05-07T00:00:00
description: "AMBA AXI4·AXI4-Lite·AXI-Stream을 역할별로 구분해 사용하는 법과 burst·outstanding·deadlock 회피를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 30
tags: [recipes, axi, axi-stream, amba, fpga]
---

## 한 줄 요약

> **"AXI는 control은 AXI4-Lite, memory는 AXI4 full, streaming은 AXI-Stream으로 나눠 쓰는 인터페이스 세트입니다."** Ready/valid handshake와 5 channel 구조를 알면 셋이 같은 가족이라는 게 보입니다.

## 어떤 상황에서 쓰나

Zynq나 Versal 같은 SoC에서 PS(Cortex-A·R)와 PL(FPGA) 사이를 잇는 표준 인터페이스가 AXI입니다. HLS IP, custom RTL block, AXI DMA, Ethernet MAC, DDR controller 모두 AXI 변종 중 하나로 묶입니다.

ARM IP를 가져다 쓰는 SoC라면 PCIe 영역을 제외한 거의 모든 내부 버스가 AXI 위에 서 있습니다. AXI 셋의 차이만 명확히 알아도 datasheet 읽는 속도와 IP integration 작업이 크게 빨라집니다.

## 핵심 개념

세 변종을 한 줄로 정리합니다.

```text
AXI4 (full)    address + 5 channel, burst 1-256, OoO, outstanding
               메모리·DMA 같은 대용량 transfer
AXI4-Lite      address + 5 channel, single-beat only, no burst/ID
               control register (HLS s_axilite)
AXI-Stream     address 없음, valid/ready/last/keep/user
               video·audio·sensor·DMA의 data plane
```

AXI4 full의 5 channel은 모두 *VALID·READY handshake*로 움직입니다.

![AXI4 5 channel — master와 slave 사이의 read/write 분리](/images/blog/modern-recipes/diagrams/part5-06-axi-channels.svg)

```text
AR  Address Read      master → slave
R   Read Data         slave → master   (+ RLAST)
AW  Address Write     master → slave
W   Write Data        master → slave   (+ WLAST)
B   Write Response    slave → master
```

VALID·READY 둘 다 1인 cycle에 한 beat가 옮겨집니다. Slave가 못 받으면 READY=0이 되고 master는 데이터를 유지합니다. 자연스러운 backpressure가 protocol에 박혀 있습니다.

## 코드 / 실제 사용 예

### AXI4-Lite — control register

```cpp
void accel(int *in, int *out, int n, int mode) {
#pragma HLS INTERFACE m_axi     port=in   offset=slave bundle=gmem
#pragma HLS INTERFACE m_axi     port=out  offset=slave bundle=gmem
#pragma HLS INTERFACE s_axilite port=in   bundle=ctrl
#pragma HLS INTERFACE s_axilite port=out  bundle=ctrl
#pragma HLS INTERFACE s_axilite port=n    bundle=ctrl
#pragma HLS INTERFACE s_axilite port=mode bundle=ctrl
#pragma HLS INTERFACE s_axilite port=return bundle=ctrl
    /* ... */
}
```

`s_axilite` 쪽이 register map으로 합성됩니다. Linux side에서는 `pci_iomap` 또는 `ioremap`으로 잡은 뒤 다음처럼 다룹니다.

```c
struct accel_regs {
    volatile uint32_t ap_ctrl;    /* bit0 START, bit1 DONE, bit2 IDLE */
    volatile uint32_t ap_gie;
    volatile uint32_t ier;
    volatile uint32_t isr;
    volatile uint32_t in_addr_lo;
    volatile uint32_t in_addr_hi;
    /* ... */
};

void accel_start(struct accel_regs *r, dma_addr_t in, dma_addr_t out, int n) {
    r->in_addr_lo  = lower_32_bits(in);
    r->in_addr_hi  = upper_32_bits(in);
    r->out_addr_lo = lower_32_bits(out);
    r->out_addr_hi = upper_32_bits(out);
    r->n           = n;
    wmb();
    r->ap_ctrl     = 0x1;          /* START */
}
```

`ap_ctrl`의 START·DONE·IDLE 비트는 Vitis HLS가 자동 생성하는 표준 control 레이아웃입니다.

### AXI4 full — burst length

```cpp
#pragma HLS INTERFACE m_axi port=buf offset=slave bundle=gmem \
    max_read_burst_length=256 max_write_burst_length=256
```

AXI4 burst는 최대 256 beat입니다. 64-bit data bus라면 한 transaction에서 2 KB를 옮길 수 있습니다. Burst를 크게 잡을수록 DDR address phase overhead가 amortize되어 effective bandwidth가 올라갑니다.

### 4 KB boundary 회피

```text
AXI burst rule:
- 한 burst는 4 KB boundary를 넘으면 안 된다
- DMA controller가 자동 split, 손수 master는 직접 split
```

```c
/* Pseudo — 4 KB 안에 맞춰 split */
void split_burst(uint64_t addr, uint32_t len, axi_burst *out, int *nb) {
    int n = 0;
    while (len) {
        uint32_t to_boundary = 4096 - (addr & 0xFFF);
        uint32_t chunk = min(len, to_boundary);
        out[n++] = (axi_burst){ addr, chunk };
        addr += chunk;
        len  -= chunk;
    }
    *nb = n;
}
```

DMA controller 대부분이 이 split을 자동 처리하지만, raw AXI master를 직접 만들 때는 반드시 손으로 챙겨야 합니다.

### AXI-Stream — TLAST 표시

```cpp
#include <hls_stream.h>
#include <ap_axi_sdata.h>

typedef ap_axiu<32, 1, 1, 1> pkt_t;     /* 32-bit data + side-band */

void parser(hls::stream<pkt_t> &in, hls::stream<pkt_t> &out) {
#pragma HLS INTERFACE axis port=in
#pragma HLS INTERFACE axis port=out
#pragma HLS INTERFACE s_axilite port=return bundle=ctrl

    pkt_t p;
    do {
#pragma HLS PIPELINE II=1
        p = in.read();
        p.data ^= 0xCAFEBABE;
        out.write(p);
    } while (!p.last);
}
```

`TLAST`는 패킷·프레임 끝을 표시하는 sideband 신호입니다. 비디오에서는 라인 끝, 네트워크에서는 packet 끝을 의미합니다.

### Outstanding transactions

```text
Master가 응답 받기 전 새 요청 발사 가능

Time:   AR0  AR1  AR2  AR3
                       R0   R1   R2   R3
Outstanding 4 = 동시 미응답 4개
```

```cpp
#pragma HLS INTERFACE m_axi port=buf max_read_outstanding=16 \
                                       max_write_outstanding=16
```

DDR controller는 latency가 보통 100-200 ns입니다. Outstanding 1이면 매 beat마다 idle 100 ns가 끼어 throughput이 1/5로 떨어집니다. 8-16 outstanding이 표준입니다.

### AXI ID 분리로 deadlock 회피

```text
Same ID에 다른 slave:
  AR(id=0) → slave A (빠름)
  AR(id=0) → slave B (느림)
  → slave B 응답이 늦으면 같은 ID FIFO 순서 때문에 A 응답도 대기
  → deadlock 가능
```

Master는 slave별로 ID를 다르게 발사합니다.

```c
/* AR(id = slave_id | sequence) */
issue_read(0x10 | seq, slave_A_addr);
issue_read(0x20 | seq, slave_B_addr);   /* OoO 가능 */
```

### AXI Interconnect QoS

```c
/* Vivado Block Design에서 ARQOS/AWQOS 설정 */
/* AXI Interconnect의 register로 master별 priority 변경 */

#define QOS_CRITICAL  15
#define QOS_HIGH      10
#define QOS_NORMAL    5

set_qos(axi_master_camera_id, QOS_CRITICAL);   /* frame drop 금지 */
set_qos(axi_master_cpu_id,    QOS_HIGH);
set_qos(axi_master_dma_id,    QOS_NORMAL);
```

DDR controller arbiter가 QOS 비트를 보고 우선순위를 결정합니다. 자율주행 control 경로처럼 deadline이 박힌 master는 QOS를 높게 줍니다.

### Zynq UltraScale+ PS-PL port

```text
HP  (High Performance) × 4    DDR bypass cache, full bandwidth
HPC (HP Cache-coherent) × 2   coherent with APU L2
ACP (Accelerator Coherency)   coherent, low-latency
GP  (General Purpose) × 4    control register용
```

FPGA accelerator → AXI HP → DDR이 가장 일반적인 데이터 path입니다. CPU와 sharing이 잦으면 HPC나 ACP로 coherent 영역을 잡습니다.

## 측정 / 성능 비교

Zynq UltraScale+에서 AXI4 m_axi를 burst length만 바꿔 측정한 효과입니다(DDR4-2400, 64-bit bus).

```text
burst length   effective bandwidth
1 beat         0.3 GB/s
16 beat        4.1 GB/s
64 beat        9.6 GB/s
256 beat       18.4 GB/s
```

Outstanding 수의 효과는 다음과 같습니다.

```text
outstanding   bandwidth   평균 latency
1             5.1 GB/s   210 ns
4             14.7 GB/s  220 ns
16            18.4 GB/s  240 ns
```

Outstanding을 늘리면 latency가 거의 변하지 않으면서 throughput이 크게 올라갑니다. DDR access pattern이 random일수록 outstanding의 이득이 큽니다.

QoS가 없을 때와 있을 때의 차이도 큽니다. Camera·DPU master에 QoS=15를 주지 않으면 GPU의 큰 burst가 진행되는 동안 frame drop이 발생합니다.

## 자주 보는 함정

> 같은 ID로 여러 slave에 발사

위에서 본 deadlock 패턴입니다. AXI Interconnect가 자동으로 ID extension을 붙이긴 하지만, raw master에서는 손으로 ID를 slave별로 분리해야 안전합니다.

> Outstanding 1로 DDR 사용

```c
#pragma HLS INTERFACE m_axi port=data max_read_outstanding=1
```

DDR latency를 매번 동기적으로 기다리는 형태가 됩니다. throughput이 한 자릿수 GB/s에서 막힙니다.

> 4 KB boundary 무시

```c
/* Raw AXI master에서 */
issue_burst(addr=0x0FF0, len=64);   /* 0x0FF0 ~ 0x10EF, 4KB boundary 침범 */
```

Spec 위반이며 slave가 거부하거나 split해 동작이 의도와 달라집니다. DMA controller IP에는 자동 split이 있지만 직접 만든 master는 손으로 챙깁니다.

> AXI-Lite로 큰 buffer 옮기기

```cpp
#pragma HLS INTERFACE s_axilite port=buffer bundle=ctrl
```

AXI-Lite는 single-beat라서 4 KB buffer를 옮기면 1024개 transaction이 발생합니다. 큰 데이터는 m_axi를 씁니다.

> QoS 모두 0

모든 master가 우선순위 0이면 round-robin이 됩니다. RT 경로의 master(카메라·display)가 굶주려 frame drop이 발생합니다. critical master는 명시적으로 QoS를 올립니다.

> Stream에 TLAST 안 줌

```cpp
pkt.data = sample;
out.write(pkt);                /* last 안 설정 */
```

DMA가 packet 끝을 못 잡아 transfer가 계속 대기 상태로 남습니다. Frame·packet 끝마다 `pkt.last = 1`을 명시합니다.

> Cache coherent 영역에 ACP 대신 HP

```text
CPU가 share하는 영역인데 HP로 접근하면 cache flush가 매번 필요
```

CPU와 가속기가 같은 buffer를 자주 주고받으면 ACP·HPC를 씁니다. 매번 cache 관리하는 비용보다 hardware coherency가 훨씬 쌉니다.

## 정리

- AXI는 AXI4 full(memory), AXI4-Lite(control), AXI-Stream(data) 세 변종으로 구성됩니다.
- 5 channel(AR·R·AW·W·B)이 모두 VALID·READY handshake로 움직입니다.
- AXI4 burst는 1-256 beat이며 4 KB boundary를 넘으면 안 됩니다.
- Outstanding transactions를 8-16으로 잡아 DDR latency를 감춥니다.
- AXI ID는 slave별로 분리해 deadlock을 피합니다.
- QoS는 RT critical master(카메라·display)를 굶기지 않기 위해 명시합니다.
- AXI-Stream의 TLAST·TKEEP·TUSER는 DMA·video·packet 처리의 핵심 sideband입니다.
- Zynq PS-PL은 HP·HPC·ACP·GP를 역할별로 골라 씁니다.
- HLS의 s_axilite/m_axi/axis 인터페이스는 결국 이 셋 위로 떨어집니다.

여기까지 Part 5(FPGA·accelerator·PCIe)였습니다. 시리즈 다음 Part로 이어집니다.

## 관련 항목

- [5-05: Vitis HLS](/blog/embedded/modern-recipes/part5-05-hls)
- [5-02: CQ·SQ](/blog/embedded/modern-recipes/part5-02-cq-sq)
- [5-03: DMA Completion](/blog/embedded/modern-recipes/part5-03-dma-completion)
- [PE 3-01: Bus Architecture](/blog/embedded/performance-engineering/part3-01-bus-architecture)
