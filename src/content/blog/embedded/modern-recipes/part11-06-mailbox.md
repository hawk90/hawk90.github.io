---
title: "11-06: Mailbox Protocol — Host와 Accelerator를 잇는 Doorbell 채널"
date: 2026-05-17T08:00:00
description: "Host CPU와 FPGA·NPU·보조 CPU를 잇는 mailbox 프로토콜을 register layout, doorbell IRQ, sequence·CRC, OpenAMP 비교 관점에서 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 128
tags: [recipes, mailbox, doorbell, fpga, openamp]
---

## 한 줄 요약

> **"Mailbox는 공유 register 한 줄과 doorbell IRQ 한 비트로 host와 device를 잇는 가장 단순한 통신 채널입니다."** 무거운 RPC 프레임워크를 끌어들이기 전에, 먼저 이 패턴이 충분한지부터 검토하는 편이 좋습니다.

## 어떤 상황에서 쓰나

Zynq UltraScale+ 같은 SoC에서 Cortex-A 위에서 도는 Linux와 Cortex-R에서 도는 FreeRTOS가 짧은 명령을 주고받아야 할 때 mailbox부터 검토합니다. RPMsg 같은 상위 프레임워크도 안을 들여다보면 결국 IPI(Inter-Processor Interrupt) mailbox 한 쌍 위에 세워져 있습니다.

FPGA accelerator도 마찬가지입니다. AXI-Lite로 노출된 control register 몇 개와 doorbell IRQ 하나만 있으면 "argument 적고, 시작 시그널 쏘고, 완료 IRQ 기다린다"는 패턴 전체가 만들어집니다. 자동차 ECU에서 lock-step Cortex-R52와 옆의 영상 처리 FPGA가 매 프레임 통신하는 구조도 같은 원리입니다.

## 핵심 개념

Mailbox는 세 가지 요소로 정의됩니다.

1. **Shared register / shared memory** — 명령과 응답이 놓이는 슬롯
2. **Doorbell** — 상대편에게 "확인하라"고 알리는 IRQ
3. **Sequence·CRC·timeout** — 손실·중복·hang 방어

Polling만 쓰면 latency는 짧지만 CPU 한 코어가 항상 묶입니다. Doorbell IRQ를 더하면 CPU는 자유로워지지만 IRQ entry/exit 비용 5-50 µs가 붙습니다. 작은 message는 mailbox로, 큰 buffer는 mailbox로 "준비됐다"만 알리고 실제 데이터는 DMA로 나르는 분리가 자연스럽습니다.

Register-only mailbox는 8-16 word 정도면 충분합니다. 그보다 큰 payload는 shared memory(주로 OCM이나 reserved DDR)에 두고 mailbox로는 주소·길이·sequence만 넘기는 hybrid 구조가 일반적입니다.

## 코드 / 실제 사용 예

### Register layout 한 장

FPGA 측 AXI-Lite slave를 다음처럼 정의하면 host driver가 다루기 쉽습니다.

```text
offset  name
0x00    CMD          — opcode (host writes)
0x04    ARG0..ARG3   — 명령 인자
0x14    SEQ_TX       — host sequence number
0x18    DOORBELL_TX  — write any value → FPGA IRQ
0x20    STATUS       — busy/idle/error (device writes)
0x24    RES0..RES3   — 응답
0x34    SEQ_RX       — device sequence number
0x38    IRQ_STATUS   — W1C ack
0x3C    IRQ_ENABLE
```

### Host에서 명령을 보내는 패턴

```c
#include <stdint.h>

#define DMB() __asm__ volatile ("dmb sy" ::: "memory")

struct mbox_regs {
    volatile uint32_t cmd;
    volatile uint32_t arg[4];
    volatile uint32_t seq_tx;
    volatile uint32_t doorbell_tx;
    volatile uint32_t _pad;
    volatile uint32_t status;
    volatile uint32_t res[4];
    volatile uint32_t seq_rx;
    volatile uint32_t irq_status;
    volatile uint32_t irq_enable;
};

static uint32_t g_seq;

void mbox_send(struct mbox_regs *r, uint32_t op,
               const uint32_t *args, int nargs) {
    for (int i = 0; i < nargs; i++)
        r->arg[i] = args[i];
    r->seq_tx = ++g_seq;
    r->cmd    = op;

    DMB();                       /* args·seq·cmd가 device 측에서 보이도록 */
    r->doorbell_tx = 0x1;        /* IRQ to device */
}
```

순서는 *인자 → sequence → 명령 → doorbell*입니다. 마지막 doorbell이 떨어지기 *전*에 모든 필드가 메모리에 보여야 하므로 DMB가 필수입니다.

### Device에서 응답을 가져오는 ISR

```c
static volatile int g_response_ready;

irqreturn_t mbox_isr(int irq, void *data) {
    struct mbox_regs *r = data;
    uint32_t flags = r->irq_status;

    if (flags & IRQ_RESPONSE) {
        g_response_ready = 1;
        wake_up_interruptible(&mbox_wait);
    }
    if (flags & IRQ_ERROR) {
        pr_err("mbox: error 0x%x\n", r->res[0]);
    }

    r->irq_status = flags;       /* W1C */
    return IRQ_HANDLED;
}

int mbox_wait_response(struct mbox_regs *r, int ms, uint32_t *out) {
    long t = wait_event_interruptible_timeout(mbox_wait,
                                              g_response_ready,
                                              msecs_to_jiffies(ms));
    if (t <= 0) return -ETIMEDOUT;

    *out = r->res[0];
    g_response_ready = 0;
    return 0;
}
```

W1C(Write 1 to Clear)는 표준 ack 방식입니다. 읽기만 하고 끝내면 IRQ가 계속 pending되어 storm이 발생합니다.

### Linux mailbox client

Vendor-specific register를 직접 다루기 전에 Linux mailbox framework를 확인합니다.

```c
#include <linux/mailbox_client.h>

struct mbox_chan   *chan;
struct mbox_client  cl = {
    .dev         = &pdev->dev,
    .tx_block    = true,
    .tx_tout     = 100,
    .rx_callback = my_rx_cb,
};

chan = mbox_request_channel(&cl, 0);

struct my_msg msg = { .op = OP_PROCESS, .arg = 42 };
mbox_send_message(chan, &msg);
```

Zynq UltraScale+ IPI, NXP MU, TI Sec/PMU, STM32 IPCC 모두 같은 client API 뒤에 숨습니다. Vendor lock-in을 피하기 좋습니다.

### Sequence와 CRC로 신뢰성 더하기

Shared memory를 거치는 큰 payload는 register만으로는 무결성이 보장되지 않습니다. 짧은 헤더를 붙입니다.

```c
struct mbox_msg {
    uint32_t seq;
    uint32_t op;
    uint32_t arg[4];
    uint32_t crc;
} __attribute__((packed));

static uint32_t crc32(const void *p, size_t n);

int mbox_recv(struct mbox_msg *m) {
    static uint32_t last_seq;

    if (crc32(m, offsetof(struct mbox_msg, crc)) != m->crc)
        return -EBADMSG;
    if (m->seq <= last_seq)
        return -EAGAIN;          /* 중복·역순 */
    last_seq = m->seq;
    return 0;
}
```

Idempotent하지 않은 명령(예: "카운터 +1")은 sequence 중복 검사가 없으면 device가 두 번 처리하는 사고로 이어집니다.

### Mailbox와 DMA 결합

1. Host가 DMA buffer 준비
2. Mailbox로 "buffer ready, addr=0xC0..., len=8K, seq=42"
3. Device가 DMA 처리
4. Device가 mailbox로 "done, seq=42, result=..."
5. Host가 응답 register 읽음

작은 control은 mailbox, 큰 데이터는 DMA로 옮기는 분리 덕분에 register 폭도 작게 유지되고 DMA 채널 활용도 올라갑니다.

## 측정 / 성능 비교

Zynq UltraScale+ APU(Cortex-A53)와 PL의 HLS accelerator 사이 mailbox round-trip을 측정한 예입니다.

| 방식 | RTT | CPU 사용 |
|---|---|---|
| APU polling (busy-wait) | ~0.6 µs | 100% one core |
| APU doorbell IRQ + sleep | ~7 µs | <1% |
| APU mailbox + DMA 8KB | ~9 µs | <1% (CPU) |
| OpenAMP RPMsg (mailbox + virtio) | ~25 µs | <1% |

RPMsg는 ring buffer, endpoint multiplex, name service까지 포함하므로 overhead가 mailbox 단독 대비 한 자릿수 µs 더 늘어납니다. 1 ms 주기 control loop처럼 latency가 직접 deadline에 박히는 경로에서는 raw mailbox가 유리합니다.

```text
STM32MP1 IPCC (Cortex-A7 ↔ Cortex-M4)
6 channel × 2 방향, IRQ-driven
짧은 status notify: ~3 µs
RPMsg 같은 상위 stack: ~15 µs
```

## 자주 보는 함정

> Argument를 적기 전에 doorbell을 친 경우

```c
r->cmd = OP_PROCESS;
r->doorbell_tx = 1;          /* arg를 아직 안 적었음 */
r->arg[0] = 0xCAFEBABE;
```

Device가 doorbell IRQ에서 arg를 읽을 때 *옛 값* 또는 *0*을 보게 됩니다. 모든 인자와 sequence를 적은 *뒤* DMB와 함께 doorbell을 칩니다.

> IRQ 안 ack

```c
irqreturn_t isr(int irq, void *d) {
    uint32_t s = r->irq_status;
    process(s);
    return IRQ_HANDLED;       /* W1C 누락 → storm */
}
```

`r->irq_status = s;` 한 줄을 빼먹는 실수가 가장 흔합니다. 부팅 직후에는 멀쩡해 보이다가 첫 IRQ가 떨어지는 순간 CPU가 100%로 묶입니다.

> Sequence 없는 idempotent 가정

같은 doorbell이 두 번 들어왔을 때 device가 두 번 처리해도 되는 명령(stateless read)은 sequence가 없어도 됩니다. 그러나 "카운터 증가", "버퍼 swap" 같은 상태 변화 명령은 sequence가 없으면 *spurious wake*나 *재시도*에 망가집니다.

> Timeout 없는 wait

```c
while (r->status == STATUS_BUSY) ;   /* device hang 시 무한 대기 */
```

FPGA가 reconfig되거나 RPU가 watchdog로 reset되는 경우 mailbox 자체가 응답을 못 보냅니다. 반드시 timeout + 복구(예: device reset, mailbox 재초기화)를 둡니다.

> 큰 payload를 register로 옮긴 경우

8 word 넘는 데이터를 mailbox register로 흘리면 host가 write할 때마다 MMIO transaction이 발생해 throughput이 급격히 떨어집니다. 큰 데이터는 shared memory + mailbox notification으로 분리합니다.

> Cache 관리 누락 (shared memory 모드)

Shared memory를 cacheable 영역에 두면 host의 `dma_wmb()` 또는 `__clean_dcache_area_poc` 같은 cache flush가 필요합니다. Non-cacheable 영역으로 잡거나 OCM(on-chip memory)을 쓰면 이 문제를 우회할 수 있습니다.

## 정리

- Mailbox는 register + doorbell + sequence의 조합이며, 대부분의 host-accelerator 통신은 이 셋만 있으면 됩니다.
- 짧은 명령은 polling 또는 doorbell, 큰 payload는 mailbox + DMA로 분리합니다.
- Linux mailbox framework를 거치면 Zynq IPI·NXP MU·STM32 IPCC 모두 같은 client API로 다룰 수 있습니다.
- Argument → sequence → 명령 → doorbell 순서를 지키고 사이에 DMB를 두지 않으면 device가 옛 값을 봅니다.
- W1C ack를 빼먹으면 IRQ storm이 발생합니다.
- Sequence와 CRC는 idempotent하지 않은 명령을 위한 최소 방어선입니다.
- Timeout과 device reset 경로는 production에서 반드시 갖춥니다.
- OpenAMP RPMsg가 무거우면 raw mailbox로 내려갑니다. 두 layer는 같은 doorbell 위에 서 있습니다.

다음 편은 **CQ·SQ**입니다.

## 관련 항목

- [4-04: UIO·VFIO](/blog/embedded/modern-recipes/part4-04-uio-vfio)
- [5-02: CQ·SQ](/blog/embedded/modern-recipes/part5-02-cq-sq)
- [1-03: PCIe BAR](/blog/embedded/modern-recipes/part1-03-pcie-bar)
- [RTOS 4-12: AMP·OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
