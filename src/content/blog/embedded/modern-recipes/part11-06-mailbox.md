---
title: "Mailbox Protocol 분석 — Host와 Accelerator를 잇는 Doorbell"
slug: "embedded/modern-recipes/part11-06-mailbox"
date: 2026-04-20T09:05:00
description: "Host와 accelerator를 잇는 mailbox를 register layout·doorbell IRQ·W1C ack·sequence 검사로 정리하고, QEMU edu 장치로 doorbell 왕복·polling·ack 누락 IRQ storm을 Linux 커널 모듈에서 직접 재 봅니다."
series: "Modern Embedded Recipes"
seriesOrder: 128
tags: [recipes, mailbox, doorbell, fpga, openamp]
topics: ["embedded"]
---

## 한 줄 요약

> **"Mailbox는 공유 레지스터 몇 개와 doorbell 인터럽트 한 줄로 host와 device를 잇는 가장 단순한 통신 채널입니다."** 무거운 RPC 프레임워크를 끌어들이기 전에, 이 패턴으로 충분한지부터 검토합니다.

## 어떤 상황에서 쓰나

FPGA 가속기, NPU, 보조 코어처럼 "짧은 명령을 주고 결과를 받는" 상대와 이야기할 때 mailbox를 씁니다. 인자를 레지스터에 적고, doorbell로 "확인하라"고 알리고, 상대가 끝나면 인터럽트로 돌아오는 구조입니다. 우체국 사서함에 편지를 넣고 벨을 누르면, 상대가 편지를 꺼내 읽고 답장을 넣은 뒤 벨을 눌러 주는 것과 같습니다.

Linux에서도 이 패턴은 곳곳에 있습니다. 예를 들어 Linux 6.12의 Zynq UltraScale+ R5 remoteproc 드라이버(`drivers/remoteproc/xlnx_r5_remoteproc.c`)는 `mbox_request_channel_byname()`으로 "tx"·"rx" mailbox 채널을 잡고, virtqueue에 새 메시지가 있다고 상대 코어에 알릴 때(`zynqmp_r5_rproc_kick()`) `mbox_send_message()`를 부릅니다. RPMsg처럼 큰 프레임워크도 상대를 깨우는 마지막 한 걸음은 mailbox doorbell입니다.

### 이 글의 실행 환경

- 실습 장치는 QEMU 교육용 PCI 장치 **edu**입니다. QEMU `docs/specs/edu.rst`에 따르면 0x60(interrupt raise)에 값을 쓰면 그 값이 0x24(interrupt status)에 bitwise OR로 들어가며 인터럽트가 올라가고, 0x64(interrupt acknowledge)에 쓴 비트가 status에서 지워져야 인터럽트가 내려갑니다. host가 doorbell을 치면 device가 즉시 응답 인터럽트를 보내는 "에코 mailbox"로 쓸 수 있습니다.
- 환경: QEMU 11.1.3 `-M virt`(HVF 가속, vCPU 4개), Debian 13 arm64, 커널 `6.12.116+deb13-arm64`, gcc 14.2.0. user space 검사 프로그램은 macOS의 Apple clang 21.0.0으로 빌드했습니다.
- 시간 측정값은 모두 이 VM의 것입니다. 실제 Zynq나 FPGA의 doorbell 지연이 아닙니다.

## 핵심 개념

mailbox는 세 요소로 이뤄집니다.

1. **공유 레지스터(또는 공유 메모리)**: 명령·인자·응답이 놓이는 자리입니다.
2. **Doorbell**: 상대에게 "새 내용이 있다"고 알리는 인터럽트입니다.
3. **Sequence·timeout**: 중복 처리와 영원한 대기를 막는 장치입니다.

레지스터만으로 감당할 수 있는 크기는 작습니다. 큰 payload는 공유 메모리(DMA 버퍼)에 두고, mailbox로는 주소·길이·sequence만 넘깁니다. 레지스터 쓰기 하나하나가 MMIO transaction이기 때문입니다.

## Register layout 한 장

FPGA 쪽 AXI4-Lite slave([11-04](/blog/embedded/modern-recipes/part11-04-axi)의 레지스터 블록을 넓힌 것)를 다음처럼 잡으면 host 드라이버가 다루기 쉽습니다.

| Offset | 이름 | 쓰는 쪽 | 의미 |
|---|---|---|---|
| 0x00 | `CMD` | host | opcode |
| 0x04~0x10 | `ARG0`~`ARG3` | host | 명령 인자 |
| 0x14 | `SEQ_TX` | host | host sequence number |
| 0x18 | `DOORBELL_TX` | host | 아무 값이나 쓰면 device에 인터럽트 |
| 0x20 | `STATUS` | device | busy/idle/error |
| 0x24~0x30 | `RES0`~`RES3` | device | 응답 |
| 0x34 | `SEQ_RX` | device | 응답이 어느 요청에 대한 것인지 |
| 0x38 | `IRQ_STATUS` | device | 원인 비트, 1을 쓰면 지워짐(W1C) |
| 0x3C | `IRQ_ENABLE` | host | 인터럽트 원인별 enable |

C 구조체로 옮기면 다음과 같고, 오프셋이 표와 맞는지는 `_Static_assert`로 컴파일 때 확인합니다(아래 `mbox_seq.c`가 `cc -Wall -Wextra`로 경고 없이 빌드됩니다).

```c
#include <stddef.h>
#include <stdint.h>

struct mbox_regs {
    volatile uint32_t cmd;          /* 0x00 */
    volatile uint32_t arg[4];       /* 0x04 */
    volatile uint32_t seq_tx;       /* 0x14 */
    volatile uint32_t doorbell_tx;  /* 0x18 */
    volatile uint32_t _pad;         /* 0x1C */
    volatile uint32_t status;       /* 0x20 */
    volatile uint32_t res[4];       /* 0x24 */
    volatile uint32_t seq_rx;       /* 0x34 */
    volatile uint32_t irq_status;   /* 0x38 */
    volatile uint32_t irq_enable;   /* 0x3C */
};
_Static_assert(offsetof(struct mbox_regs, doorbell_tx) == 0x18, "doorbell");
_Static_assert(offsetof(struct mbox_regs, status)      == 0x20, "status");
_Static_assert(offsetof(struct mbox_regs, irq_enable)  == 0x3C, "irq_enable");
```

## Host에서 명령을 보내는 순서

순서는 **인자 → sequence → 명령 → doorbell**입니다. doorbell이 마지막이어야 device가 인터럽트를 받고 레지스터를 읽을 때 모든 필드가 이미 써져 있습니다.

Linux 드라이버라면 이 순서를 `writel()`로 쓰는 것만으로 지킬 수 있습니다. `Documentation/memory-barriers.txt`의 "KERNEL I/O BARRIER EFFECTS" 절은 같은 CPU 스레드가 같은 주변장치에 하는 `readX()`/`writeX()`가 프로그램 순서대로 도착한다고 보장하고, `writeX()`는 앞서 한 일반 메모리 쓰기가 끝난 뒤에 나간다고 보장합니다. 그래서 인자가 레지스터에 있든 공유 메모리(coherent DMA 버퍼)에 있든 doorbell `writel()` 앞에 별도 barrier가 필요 없습니다.

```c
static u32 seq;

static void mbox_send(void __iomem *r, u32 op, const u32 *args, int nargs)
{
	int i;

	for (i = 0; i < nargs; i++)
		writel(args[i], r + 0x04 + 4 * i);   /* ARG0..ARG3 */
	writel(++seq, r + 0x14);                 /* SEQ_TX */
	writel(op,    r + 0x00);                 /* CMD */
	writel(1,     r + 0x18);                 /* DOORBELL_TX: 마지막 */
}
```

반대로 `__raw_writel()`이나 `writel_relaxed()`처럼 순서 보장이 약한 함수를 쓰거나, 포인터로 직접 쓰면 이 보장이 사라집니다. 그때는 doorbell 앞에 barrier를 직접 넣어야 합니다.

## 응답 ISR과 W1C ack

device가 응답을 쓰고 인터럽트를 올리면, host의 ISR은 원인을 읽고, **장치 쪽 원인 비트를 지우고**, 기다리는 쪽을 깨웁니다. 원인 비트 지우기를 W1C(Write 1 to Clear)로 하면 "읽은 값을 그대로 다시 쓰면 그 비트만 지워진다"는 장점이 있습니다. ISR이 원인을 읽은 뒤에 새로 생긴 비트는 지워지지 않기 때문입니다. edu의 0x64도 쓴 비트만 status에서 지우므로 같은 방식입니다.

edu로 이 구조를 실제로 만든 커널 모듈의 핵심 부분입니다. `mode` 파라미터로 세 실험을 고릅니다.

```c
static irqreturn_t edu_isr(int irq, void *data)
{
	struct edu *e = data;
	u32 st = readl(e->mmio + EDU_IRQ_STATUS);

	if (!st)
		return IRQ_NONE;                  /* 공유 라인: 우리 장치가 아님 */
	atomic_inc(&e->hits);
	if (e->ack || atomic_read(&e->hits) >= 200000)
		writel(st, e->mmio + EDU_IRQ_ACK);   /* W1C: 쓴 비트만 지운다 */
	complete(&e->done);
	return IRQ_HANDLED;
}

/* mode=irq: doorbell -> ISR -> complete() 왕복을 1000번 */
for (i = 0; i < n; i++) {
	reinit_completion(&e->done);
	t0 = ktime_get_ns();
	writel(1, e->mmio + EDU_IRQ_RAISE);              /* doorbell */
	if (!wait_for_completion_timeout(&e->done, HZ))
		return -ETIMEDOUT;
	t0 = ktime_get_ns() - t0;
	sum += t0;
	best = min(best, t0);
}
```

`mode=poll`은 인터럽트 없이 liveness 레지스터(0x04, 쓴 값의 비트 반전을 돌려줌)에 쓰고 반전 값이 보일 때까지 `readl()`로 도는 MMIO 왕복이고, `mode=noack`은 ISR이 ack를 빼먹는 경우입니다(폭주를 끝내기 위해 200,000번째 호출에서만 ack). 모듈 전체는 `edu_mbox.c` 한 파일이고, 각 모드로 `insmod`/`rmmod`를 반복한 `dmesg` 결과입니다.

```text
edu_mbox 0000:00:03.0: irq rtt: n=1000 avg=19972 ns min=12583 ns isr_hits=1000
edu_mbox 0000:00:03.0: irq rtt: n=1000 avg=5554 ns min=4458 ns isr_hits=1000
edu_mbox 0000:00:03.0: poll rtt: n=1000 avg=2478 ns min=2333 ns
edu_mbox 0000:00:03.0: poll rtt: n=1000 avg=2513 ns min=2292 ns
edu_mbox 0000:00:03.0: noack: isr ran 200000 times in first 318932 us (ack only after 200000)
```

세 가지를 읽을 수 있습니다.

- **IRQ 왕복은 같은 VM에서도 실행마다 크게 달랐습니다.** 첫 번째 실행은 평균 약 20 µs, 바로 다음 실행은 약 5.6 µs였습니다. 인터럽트 경로에는 스케줄러 깨우기가 끼므로 한 번의 평균으로 결론 내리면 안 되고, 분포를 봐야 합니다.
- **같은 VM에서 polling 왕복(약 2.5 µs)이 IRQ 왕복보다 짧았습니다.** 대신 polling은 그동안 CPU를 붙잡습니다. 어느 쪽이 나은지는 응답 지연 요구와 CPU 여유로 정합니다.
- **ack를 빼먹으면 IRQ storm이 됩니다.** edu의 INTx는 level 인터럽트라 원인이 남아 있는 동안 계속 다시 들어옵니다. ISR이 `IRQ_HANDLED`를 돌려줘도 원인을 지우지 않았으므로, 10 ms를 기다리려던 `mdelay(10)`이 ISR 20만 번에 밀려 약 319 ms 걸렸습니다. 실제 장치에서는 이 상태가 끝나지 않고 CPU 하나가 계속 묶입니다.

## Linux mailbox framework

SoC에 mailbox 하드웨어가 있으면 레지스터를 직접 다루기 전에 Linux mailbox framework를 확인합니다. Linux 6.12의 `drivers/mailbox/`에는 Zynq UltraScale+ IPI(`zynqmp-ipi-mailbox.c`), NXP MU(`imx-mailbox.c`), STM32MP1 IPCC(`stm32-ipcc.c`, `st,stm32mp1-ipcc`), TI Message Manager(`ti-msgmgr.c`) 같은 컨트롤러 드라이버가 있고, 사용하는 쪽은 모두 같은 client API를 씁니다.

```c
#include <linux/mailbox_client.h>

static struct mbox_client cl = {
	.tx_block    = true,
	.tx_tout     = 100,          /* ms */
	.rx_callback = my_rx_cb,
};

cl.dev = &pdev->dev;
chan = mbox_request_channel(&cl, 0);      /* DT의 mboxes 0번 */
if (IS_ERR(chan))
	return PTR_ERR(chan);
mbox_send_message(chan, &msg);
```

`struct mbox_client`의 필드(`dev`, `tx_block`, `tx_tout`, `knows_txdone`, `rx_callback`, `tx_prepare`, `tx_done`)는 `include/linux/mailbox_client.h`에 정의되어 있습니다. `Documentation/driver-api/mailbox.rst`의 예제는 동기 클라이언트에 `tx_block = true`, `tx_tout = 500`("by half a second")을 주므로 `tx_tout`의 단위는 ms입니다. 메시지 내용(`void *`)의 형식은 컨트롤러 드라이버마다 다르므로, 컨트롤러 소스에서 무엇을 기대하는지 확인합니다.

## Sequence로 중복과 역순 걸러내기

doorbell이 재전송되거나 응답이 늦게 도착하면 같은 명령이 두 번 처리될 수 있습니다. "읽기"처럼 여러 번 해도 결과가 같은 명령은 괜찮지만, "카운터 +1"이나 "버퍼 교체"는 두 번 처리되면 상태가 망가집니다. 그래서 명령마다 sequence를 붙이고, 수신 쪽은 이미 본 번호를 거릅니다.

흔한 실수는 `seq <= last`로 비교하는 것입니다. 32-bit 카운터가 `0xFFFFFFFF`에서 0으로 넘어가는 순간 새 메시지를 전부 버립니다. RFC 1982(Serial Number Arithmetic) 3.2절의 비교 규칙처럼 두 번호의 차이가 절반(2^31)보다 작은지로 판단하면 넘어가는 순간에도 맞게 동작합니다. C에서는 차이를 signed로 보면 됩니다.

```c
/* naive: 새 seq가 이전보다 커야 받는다 */
static int accept_naive(uint32_t *last, uint32_t seq)
{
    if (seq <= *last) return 0;
    *last = seq; return 1;
}

/* wrap-safe: 차이를 signed 32-bit로 본다 */
static int accept_serial(uint32_t *last, uint32_t seq)
{
    if ((int32_t)(seq - *last) <= 0) return 0;
    *last = seq; return 1;
}
```

마지막으로 받은 번호가 `0xFFFFFFFC`인 상태에서 여섯 메시지를 넣어 본 결과입니다.

```text
$ cc -O2 -Wall -Wextra -o mbox_seq mbox_seq.c && ./mbox_seq
seq         naive  serial
0xfffffffd  accept accept
0xfffffffe  accept accept
0xfffffffe  DROP   DROP
0xffffffff  accept accept
0x00000000  DROP   accept
0x00000001  DROP   accept
```

중복된 `0xfffffffe`는 둘 다 걸렀지만, 0으로 넘어간 뒤의 정상 메시지를 naive 비교는 버렸습니다. 공유 메모리로 큰 payload를 넘긴다면 여기에 CRC 같은 무결성 검사를 더할 수 있지만, 그것은 sequence와 별개의 문제(데이터 손상)를 막는 장치입니다.

## Mailbox와 DMA 결합

큰 데이터는 레지스터로 옮기지 않습니다. 순서는 다음과 같습니다.

1. host가 DMA 버퍼를 준비합니다(`dma_alloc_coherent()` 등).
2. mailbox로 "버퍼 준비됨, 주소, 길이, seq"를 보내고 doorbell을 칩니다.
3. device가 DMA로 버퍼를 처리합니다.
4. device가 응답 레지스터에 "완료, seq, 결과"를 쓰고 인터럽트를 올립니다.
5. host가 ISR에서 ack하고 응답을 읽습니다.

mailbox는 짧은 제어만 맡으므로 레지스터 수가 작게 유지됩니다. 버퍼 여러 개를 연달아 처리해야 한다면 mailbox 한 쌍으로는 한 번에 명령 하나만 떠 있게 되므로, 다음 편의 SQ·CQ ring으로 넘어갑니다.

## 자주 보는 함정

> 인자를 적기 전에 doorbell을 침

```c
writel(OP_PROCESS, r + 0x00);
writel(1,          r + 0x18);   /* doorbell: 인자를 아직 안 적었음 */
writel(0xCAFEBABE, r + 0x04);
```

device가 doorbell 인터럽트에서 인자를 읽으면 이전 값을 봅니다. doorbell은 항상 마지막에 씁니다.

> ISR에서 장치 쪽 원인을 지우지 않음

```c
irqreturn_t isr(int irq, void *d) {
	u32 s = readl(r + 0x38);
	process(s);
	return IRQ_HANDLED;          /* writel(s, r + 0x38) 누락 */
}
```

위 실습의 `mode=noack`처럼 level 인터럽트가 계속 다시 들어옵니다. 원인 레지스터에 읽은 값을 다시 써서(W1C) 지웁니다.

> 공유 라인에서 무조건 IRQ_HANDLED

인터럽트 라인을 다른 장치와 나눠 쓰면(`IRQF_SHARED`) 우리 장치의 원인 비트가 0일 때 `IRQ_NONE`을 돌려줘야 합니다. 위 ISR의 첫 `if`가 그 역할입니다.

> sequence를 `<=`로 비교

`0xFFFFFFFF` 다음 메시지부터 모두 버려집니다. 차이를 signed로 비교합니다.

> Timeout 없는 대기

```c
while (readl(r + 0x20) == STATUS_BUSY)
	;                            /* device가 멈추면 영원히 돈다 */
```

FPGA가 재구성되거나 상대 코어가 리셋되면 응답은 오지 않습니다. 위 모듈처럼 `wait_for_completion_timeout()`을 쓰거나, polling이라면 `readl_poll_timeout()` 계열을 써서 시간 제한을 두고, 시간이 넘으면 device 리셋과 mailbox 재초기화로 복구합니다.

## 정리

- mailbox는 공유 레지스터 + doorbell + sequence로 구성됩니다.
- 쓰는 순서는 인자 → sequence → 명령 → doorbell이고, Linux의 `writel()`은 이 순서와 앞선 메모리 쓰기의 완료를 보장합니다.
- ISR은 원인을 읽고 W1C로 지운 뒤 깨웁니다. 빼먹으면 level 인터럽트가 storm이 됩니다(VM에서 `mdelay(10)`이 319 ms로 늘어남).
- VM에서 측정한 IRQ 왕복은 실행마다 약 5~20 µs로 흔들렸고 polling 왕복은 약 2.5 µs였습니다. 숫자는 VM의 것이므로 실제 장치에서 다시 잽니다.
- SoC mailbox 하드웨어는 Linux mailbox framework의 같은 client API로 다룹니다.
- sequence는 signed 차이로 비교해야 32-bit wrap에서 메시지를 버리지 않습니다.

다음 편은 **CQ·SQ**입니다.

## 관련 항목

- [11-03: PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)
- [11-07: CQ·SQ](/blog/embedded/modern-recipes/part11-07-cq-sq)
- [7-11: UIO·VFIO](/blog/embedded/modern-recipes/part7-11-uio-vfio)
- [RTOS 4-12: AMP·OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
