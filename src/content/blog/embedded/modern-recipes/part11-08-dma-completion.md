---
title: "DMA Completion 메커니즘 — Interrupt·Polling·Completion Ring"
slug: "embedded/modern-recipes/part11-08-dma-completion"
date: 2026-04-20T09:07:00
description: "DMA가 끝났음을 CPU가 아는 세 가지 방식(interrupt, polling, completion ring)을 QEMU edu 장치의 IRQ·polling 비교, phase bit 링의 barrier 실험, Linux NVMe·e1000e·NAPI 소스로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 130
tags: [recipes, dma, completion, interrupt, polling]
topics: ["embedded"]
---

## 한 줄 요약

> **"DMA 완료를 아는 방법은 interrupt, polling, completion ring 세 가지입니다."** Interrupt는 CPU를 재우고, polling은 CPU를 태워 대기 시간을 줄이고, completion ring은 완료 여러 건을 한 번에 거둡니다. Linux NAPI와 DPDK는 이 셋을 섞어 씁니다.

## 어떤 상황에서 쓰나

UART를 1 Mbps, 8N1로 받으면 한 바이트가 10비트이므로 초당 100,000바이트가 들어옵니다. 바이트마다 IRQ를 쓰면 초당 100,000번 ISR에 들어가야 합니다. 같은 입력을 4096바이트 원형 버퍼와 DMA의 절반·전체 완료 IRQ로 받으면 IRQ는 2048바이트마다 한 번, 초당 약 48.8번으로 줄어듭니다(계산 로그는 글 끝 재현 절차에 있습니다).

반대 방향의 극단이 NVMe·NIC입니다. 완료가 초당 수십만 건 쏟아지는 장치에서는 완료마다 IRQ를 받는 대신 링에 쌓인 완료를 한 번에 거두거나, 아예 IRQ를 끄고 CPU 한 코어가 링을 계속 들여다봅니다. 같은 "DMA가 끝났는가"라는 질문에 장치마다 답이 다른 이유가 이 비용 차이입니다. 세 패턴을 알면 새 장치의 드라이버를 열었을 때 어디부터 읽어야 할지 보입니다.

## 핵심 개념

세 방식은 무엇을 아끼고 무엇을 쓰는지가 다릅니다. 비유하면 interrupt는 택배가 오면 초인종이 울리는 방식이고, polling은 현관 앞에 서서 계속 내다보는 방식이며, completion ring은 우편함에 쌓인 것을 한 번에 꺼내는 방식입니다.

| 방식 | 완료를 아는 방법 | CPU가 쓰는 것 | 맞는 곳 |
|---|---|---|---|
| Interrupt | 장치가 IRQ를 올림 | ISR 진입·복귀 비용, 대기 중에는 잠들 수 있음 | 완료가 드물고 전송이 큰 경우 |
| Polling | CPU가 상태 레지스터나 메모리를 반복해서 읽음 | 기다리는 동안 코어 하나 전체 | 완료가 매우 잦고 대기 시간이 중요한 경우 |
| Completion ring | 장치가 메모리의 링에 완료 항목을 쓰고, CPU가 여러 개를 한 번에 거둠 | IRQ 한 번 또는 poll 한 번에 여러 완료 처리 | NIC·NVMe처럼 완료가 계속 쏟아지는 장치 |

Completion ring은 앞의 두 방식과 따로 노는 것이 아니라 그 위에 얹힙니다. 링에 완료가 쌓였다는 사실을 IRQ로 알릴 수도 있고 polling으로 알아낼 수도 있습니다. Linux 커널 문서 [`napi.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/networking/napi.rst)는 IRQ가 오면 장치 IRQ를 가린 채 poll 함수로 링을 거두고, 다 거둔 뒤에만 IRQ를 다시 켜라고 적습니다. 이것이 interrupt와 polling을 오가는 NAPI의 기본 형태입니다.

## 코드 / 실제 사용 예

### Cortex-M 기본 interrupt 모델과 polling 모델

STM32L4의 DMA1 채널 1을 예로 든 두 대기 함수입니다. 레지스터와 비트 이름은 ST의 CMSIS 장치 헤더 `stm32l476xx.h`([cmsis_device_l4](https://github.com/STMicroelectronics/cmsis_device_l4) `ca0bfa2`)에 있는 이름 그대로입니다.

```c
#include <stdbool.h>
#include "stm32l476xx.h"

static volatile bool dma_done;

void DMA1_Channel1_IRQHandler(void)
{
    if (DMA1->ISR & DMA_ISR_TCIF1) {
        DMA1->IFCR = DMA_IFCR_CTCIF1;   /* clear the flag first */
        dma_done = true;
    }
}

void wait_dma_irq(void)                 /* TCIE set: IRQ wakes the core */
{
    __disable_irq();                    /* PRIMASK=1: an IRQ still wakes WFI */
    while (!dma_done) {
        __WFI();
        __enable_irq();                 /* the pending handler runs here */
        __disable_irq();
    }
    dma_done = false;
    __enable_irq();
}

void wait_dma_poll(void)                /* TCIE clear: CPU spins on the flag */
{
    while (!(DMA1->ISR & DMA_ISR_TCIF1))
        ;
    DMA1->IFCR = DMA_IFCR_CTCIF1;
}
```

`wait_dma_irq`가 `while (!dma_done) __WFI();`처럼 단순하지 않은 데는 이유가 있습니다. 플래그를 확인한 직후, `WFI`를 실행하기 직전에 IRQ가 와서 처리되면 코어는 이미 끝난 일을 기다리며 다음 IRQ까지 잠듭니다. Arm의 *Cortex-M4 Devices Generic User Guide*(DUI 0553B) "Wakeup from WFI or sleep-on-exit" 절은 PRIMASK가 1이어도 우선순위가 충분한 IRQ가 오면 코어가 깨어나고, 핸들러는 PRIMASK를 0으로 내린 뒤에 실행된다고 적습니다. 그래서 IRQ를 가린 채 확인하고 잠들면 확인과 잠들기 사이의 틈이 사라집니다.

이 파일은 arm-none-eabi-gcc 16.2.0으로 경고 없이 빌드됩니다. QEMU의 STM32L4 모델에는 DMA가 없어 실행은 하지 않았고, 빌드와 디스어셈블(`cpsid i` → `wfi` → `cpsie i`)만 확인했습니다.

### Linux에서 IRQ와 polling을 직접 비교하기 (QEMU edu 장치)

두 방식의 CPU 비용 차이를 직접 보려면 DMA 엔진이 있는 장치가 필요합니다. QEMU의 교육용 PCI 장치 `edu`([`hw/misc/edu.c`](https://gitlab.com/qemu-project/qemu/-/blob/v11.1.0/hw/misc/edu.c))는 BAR0에 DMA 레지스터(0x80 source, 0x88 destination, 0x90 count, 0x98 command)를 두고, command의 비트 0으로 시작해 비트 2가 켜져 있으면 끝날 때 IRQ를 올립니다. 완료되면 비트 0이 0으로 내려가므로 polling으로도 알 수 있습니다.

아래는 Debian 13 arm64 게스트(커널 6.12.116)에서 빌드한 모듈의 핵심 부분입니다. `mode=irq`면 completion에서 잠들고, `mode=poll`이면 command 레지스터를 계속 읽습니다.

```c
writeq(dma, bar + EDU_DMA_SRC);          /* RAM -> edu buffer at 0x40000 */
writeq(EDU_BUF, bar + EDU_DMA_DST);
writeq(len, bar + EDU_DMA_CNT);
t0 = ktime_get_ns();
writeq(DMA_RUN | (use_irq ? DMA_IRQ : 0), bar + EDU_DMA_CMD);

if (use_irq) {
	wait_for_completion(&dma_done);      /* ISR calls complete() */
} else {
	while (readq(bar + EDU_DMA_CMD) & DMA_RUN)
		polls++;                         /* CPU spins on MMIO */
}
t1 = ktime_get_ns();
```

`insmod`를 `/usr/bin/time`으로 감싸 두 방식을 세 번씩 번갈아 돌린 결과입니다.

```text
insmod mode=irq: 0.10 s elapsed, 0.00 s user, 0.00 s sys
[   51.243326] edu_cmpl 0000:00:04.0: mode=irq len=4096 done after 103412 us, status reads=0
insmod mode=poll: 0.10 s elapsed, 0.00 s user, 0.10 s sys
[   51.394648] edu_cmpl 0000:00:04.0: mode=poll len=4096 done after 104652 us, status reads=88057
insmod mode=irq: 0.10 s elapsed, 0.00 s user, 0.00 s sys
[   51.553803] edu_cmpl 0000:00:04.0: mode=irq len=4096 done after 100618 us, status reads=0
insmod mode=poll: 0.10 s elapsed, 0.00 s user, 0.10 s sys
[   51.701972] edu_cmpl 0000:00:04.0: mode=poll len=4096 done after 101523 us, status reads=86134
```

두 방식 모두 약 100 ms 뒤에 끝났습니다. 이 100 ms는 하드웨어 성능이 아니라 edu 모델이 DMA 시작 뒤 가상 시계로 100 ms 타이머를 거는 구현(`edu.c`의 `dma_rw()`)에서 나온 값입니다. 의미 있는 숫자는 CPU 쪽입니다. IRQ 방식은 기다리는 동안 sys 시간이 0.00 s였고, polling 방식은 같은 100 ms 동안 sys 시간 0.10 s를 쓰며 상태 레지스터를 8만 6천~8만 8천 번 읽었습니다. 기다린 시간 전체가 그대로 CPU 시간이 됐습니다. 읽기 한 번에 걸린 평균 시간(약 1.2 µs)은 QEMU가 MMIO 읽기를 에뮬레이션하는 비용이므로 실제 PCIe 장치의 읽기 지연으로 쓰면 안 됩니다.

### Completion ring (NIC RX 패턴)

NIC는 수신 descriptor 링을 장치와 CPU가 나눠 씁니다. 장치는 패킷을 버퍼에 쓴 뒤 descriptor의 상태에 DD(Descriptor Done) 비트를 세우고, CPU는 DD가 선 descriptor만 거둡니다. 아래는 Linux e1000e 드라이버의 [`e1000_clean_rx_irq()`](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ethernet/intel/e1000e/netdev.c#L914)를 뼈대만 남겨 줄였습니다.

```c
staterr = le32_to_cpu(rx_desc->wb.upper.status_error);
while (staterr & E1000_RXD_STAT_DD) {        /* 0x01: device is done */
	if (*work_done >= work_to_do)
		break;                               /* NAPI budget used up */
	(*work_done)++;
	dma_rmb();       /* read the rest of the descriptor only after DD */

	/* ... hand the buffer to the stack, advance next_to_clean ... */

	if (++cleaned_count >= E1000_RX_BUFFER_WRITE) {   /* 16 */
		adapter->alloc_rx_buf(rx_ring, cleaned_count, GFP_ATOMIC);
		cleaned_count = 0;                   /* refill + tail write */
	}
	staterr = le32_to_cpu(next_rxd->wb.upper.status_error);
}
```

두 가지가 눈에 띕니다. 첫째, DD 비트를 읽은 뒤 descriptor의 나머지를 읽기 전에 `dma_rmb()`를 둡니다. 둘째, 다 쓴 descriptor를 장치에 돌려주는 일(새 버퍼를 채우고 tail 레지스터에 쓰기)을 한 개씩 하지 않고 16개씩 묶어서 합니다. 드라이버 주석은 이유를 "one at a time is too slow"라고 적습니다.

### NVMe CQ의 phase bit

NVMe completion queue에는 DD 비트 대신 phase tag가 있습니다. 컨트롤러는 큐를 한 바퀴 돌 때마다 자기가 쓰는 phase 값을 뒤집고, 호스트는 "이번 바퀴에 기대하는 phase"를 들고 있다가 같은 값이 보이면 새 항목으로 봅니다. 그래서 호스트는 링 메모리를 지우거나 고칠 필요가 없습니다. QEMU의 NVMe 모델([`hw/nvme/ctrl.c`](https://gitlab.com/qemu-project/qemu/-/blob/v11.1.0/hw/nvme/ctrl.c))은 CQE의 status 하위 비트에 `cq->phase`를 넣고, tail이 큐 끝에서 0으로 돌아갈 때 `cq->phase = !cq->phase`로 뒤집습니다.

Linux NVMe 드라이버의 [`nvme_poll_cq()`](https://github.com/torvalds/linux/blob/v6.12/drivers/nvme/host/pci.c#L1059)가 그 반대편입니다.

```c
while (nvme_cqe_pending(nvmeq)) {        /* status & 1 == cq_phase ? */
	found++;
	/*
	 * load-load control dependency between phase and the rest of
	 * the cqe requires a full read memory barrier
	 */
	dma_rmb();
	nvme_handle_cqe(nvmeq, iob, nvmeq->cq_head);
	nvme_update_cq_head(nvmeq);          /* wrap -> cq_phase ^= 1 */
}
if (found)
	nvme_ring_cq_doorbell(nvmeq);        /* one head doorbell per batch */
```

호스트가 슬롯을 다 썼다고 알리는 수단은 링 메모리가 아니라 CQ head doorbell입니다. 그리고 그 doorbell도 거둔 완료가 있을 때 한 번만 씁니다.

### phase를 본 뒤 payload를 읽을 때 barrier가 필요한 이유

`dma_rmb()`를 빼면 실제로 무슨 일이 나는지 확인해 봤습니다. 장치 대신 스레드 하나가 phase bit 링(깊이 64)에 순번을 payload로 쓰고, phase를 store-release로 내보냅니다. 소비자 스레드는 phase가 기대값이면 payload를 읽어 순번과 맞는지 셉니다. 두 버전의 차이는 phase 읽기와 payload 읽기 사이에 acquire fence(arm64의 `dmb ishld`)가 있느냐 없느냐뿐이고, fence가 없는 쪽에도 컴파일러가 순서를 바꾸지 못하게 컴파일러 barrier는 넣었습니다.

```c
if (atomic_load_explicit(&cq[idx].phase, memory_order_relaxed) != expected)
	continue;                                   /* not ours yet */
if (use_fence)
	atomic_thread_fence(memory_order_acquire);  /* dma_rmb() stand-in */
else
	atomic_signal_fence(memory_order_seq_cst);  /* compiler-only */
v = atomic_load_explicit(&cq[idx].payload, memory_order_relaxed);
if (v != head) stale++;
```

Apple M2 Pro(macOS, Apple clang 21)에서 항목 2억 개씩 세 번 돌린 결과입니다.

```text
fence=0 entries=200000000 stale_payload=131562
fence=1 entries=200000000 stale_payload=0
fence=0 entries=200000000 stale_payload=127903
fence=1 entries=200000000 stale_payload=0
fence=0 entries=200000000 stale_payload=143584
fence=1 entries=200000000 stale_payload=0
```

Fence가 없으면 2억 건 중 13만 건 안팎에서 새 phase와 함께 지난 바퀴의 payload를 읽었습니다. Arm64 CPU가 서로 다른 주소에 대한 두 load의 순서를 바꿀 수 있기 때문이고, NVMe 드라이버 주석의 "load-load control dependency"가 바로 이 경우입니다. 이 실험의 "장치"는 CPU 스레드이므로 실제 DMA 쓰기와 똑같지는 않습니다. 그래도 소비자 쪽 CPU의 load 재정렬은 같은 현상이고, 커널은 arm64에서 `dma_rmb()`를 `dmb oshld`로 구현합니다([`barrier.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/barrier.h#L65)).

### Interrupt coalescing 설정

NIC는 IRQ를 몇 µs 또는 몇 프레임마다 한 번으로 묶는 기능을 장치에 두고, Linux는 이를 `ethtool -C`로 노출합니다. 필드 이름은 [`ethtool.h`](https://github.com/torvalds/linux/blob/v6.12/include/uapi/linux/ethtool.h#L475)의 `rx_coalesce_usecs`, `rx_max_coalesced_frames`입니다. 같은 게스트의 e1000e(QEMU 82574L 모델)와 virtio-net에서 돌려 본 결과입니다.

```text
+ ethtool -C enp0s5 rx-usecs 64
+ ethtool -c enp0s5
rx-usecs:	64
+ ethtool -C enp0s5 rx-usecs 3
+ ethtool -c enp0s5
rx-usecs:	3
+ ethtool -C enp0s1 rx-usecs 64 rx-frames 32
netlink error: Operation not supported
```

e1000e는 값을 받아들였지만 virtio-net은 거절했습니다. 어떤 knob이 있는지는 장치와 드라이버마다 다르다는 것을 보여 줍니다. e1000e의 기본값 3은 µs가 아니라 모드 번호입니다. 커널 문서 [`e1000e.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/networking/device_drivers/ethernet/intel/e1000e.rst)는 `InterruptThrottleRate`의 유효 범위를 0, 1, 3, 4, 100~100000으로, 1과 3을 트래픽에 따라 값을 바꾸는 적응 모드로 설명하고, 드라이버의 `e1000_get_coalesce()`는 설정값이 4 이하면 그대로 `rx-usecs`에 보여 줍니다.

### 바쁠 때는 poll, 한가할 때는 IRQ

Polling과 IRQ를 오가는 것은 링 드라이버의 기본 동작입니다. `napi.rst`가 정리하는 NAPI poll 함수의 규칙은 다음 골격으로 요약됩니다. IRQ가 오면 장치 IRQ를 가린 뒤 poll을 예약하고, poll은 `budget`만큼만 거두고, 다 거두고도 budget이 남았을 때만 `napi_complete_done()`이 성공한 경우에 IRQ를 다시 켭니다.

```c
static int my_napi_poll(struct napi_struct *napi, int budget)
{
	struct my_queue *q = container_of(napi, struct my_queue, napi);
	int done = my_reap_rx(q, budget);       /* at most budget packets */

	if (done < budget && napi_complete_done(napi, done))
		my_unmask_rx_irq(q);                /* idle again: back to IRQ */
	return done;                             /* == budget: poll me again */
}
```

e1000e의 [`e1000e_poll()`](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ethernet/intel/e1000e/netdev.c#L2658)이 이 형태이고, IRQ를 다시 켜는 곳은 `napi_complete_done()`이 참을 돌려준 분기 안입니다. 커널 `enable_irq()`로 IRQ 라인 자체를 켜고 끄는 것이 아니라 장치의 interrupt mask 레지스터(e1000e라면 `IMS`)를 씁니다.

`budget`의 기본값은 커널 소스에 있습니다. 드라이버가 NAPI를 등록할 때 쓰는 기본 weight는 `NAPI_POLL_WEIGHT` 64이고([`netdevice.h`](https://github.com/torvalds/linux/blob/v6.12/include/linux/netdevice.h#L2620)), softirq 한 번이 모든 NAPI 인스턴스에서 처리하는 총량은 `net.core.netdev_budget` 300입니다. 게스트에서 `sysctl`로 읽은 값도 `netdev_budget = 300`, `netdev_budget_usecs = 8000`이었습니다.

NAPI는 여기서 한 걸음 더 나간 설정도 둡니다. `napi.rst`의 "Software IRQ coalescing" 절에 따르면 `napi_defer_hard_irqs`는 연속으로 빈 poll을 몇 번 허용한 뒤 하드웨어 IRQ로 돌아갈지, `gro_flush_timeout`은 그동안 다시 poll할 타이머 간격을 정합니다(게스트의 e1000e에서는 둘 다 0, 즉 꺼져 있었습니다). 사용자 공간 쪽에서는 DPDK가 같은 절충을 API로 둡니다. [`rte_ethdev.h`](https://github.com/DPDK/dpdk/blob/v25.11/lib/ethdev/rte_ethdev.h#L4340)는 Rx 큐에 오래 패킷이 없으면 lcore를 재우고 `rte_eth_dev_rx_intr_enable()`로 IRQ를 켰다가, 깨어나면 IRQ를 끄고 polling으로 돌아가라고 설명합니다.

### Cortex-M 원형 DMA + half/full IRQ

UART 수신을 원형 버퍼로 받는 ST HAL의 형태입니다. 원형 동작은 `HAL_UART_Receive_DMA()`가 정하는 것이 아니라 DMA 핸들 설정에서 정합니다.

```c
hdma_usart2_rx.Init.Mode = DMA_CIRCULAR;      /* set before HAL_DMA_Init() */
/* ... */
HAL_UART_Receive_DMA(&huart2, rx_buf, 4096);

void HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *h)
{
    process(&rx_buf[0], 2048);                /* first half is stable */
}

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *h)
{
    process(&rx_buf[2048], 2048);             /* second half is stable */
}
```

[stm32f4xx-hal-driver v1.8.6](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.6/Src/stm32f4xx_hal_uart.c)의 `UART_Start_Receive_DMA()`는 DMA 핸들의 `XferHalfCpltCallback`과 `XferCpltCallback`에 UART용 함수를 연결하고, 전체 완료 처리 `UART_DMAReceiveCplt()`는 DMA 스트림의 `CIRC` 비트가 꺼져 있을 때만 수신을 끝내고 `RxState`를 READY로 돌립니다. 원형 모드라면 DMA가 계속 돌고, 콜백은 절반과 끝에서 번갈아 불립니다. 이 HAL 코드는 실행하지 않았고, 근거는 위 소스 파일입니다.

## 측정 / 성능 비교

이 글에서 직접 잰 것은 두 가지입니다.

| 실험 | 환경 | 결과 |
|---|---|---|
| IRQ vs polling 대기 | QEMU 11.1 `edu` 장치, Debian 13 arm64 게스트(HVF) | 둘 다 약 100 ms(모델의 고정 지연). IRQ는 sys 0.00 s, polling은 sys 0.10 s에 상태 읽기 약 8.6만~8.8만 번 |
| phase 확인 뒤 payload 읽기 | Apple M2 Pro, 스레드가 장치 역할 | 2억 건 중 fence 없음 12.8만~14.4만 건 stale, fence 있음 0건 |

이 표의 숫자를 다른 장치에 옮기면 안 됩니다. edu의 100 ms는 모델이 정한 값이고, 상태 읽기 한 번의 비용도 QEMU의 MMIO 에뮬레이션 비용입니다. 실제 보드에서 IRQ 한 번의 비용이나 polling 한 번의 비용은 그 보드에서 재야 하며, 이 글은 그런 측정값을 갖고 있지 않습니다. NVMe나 NIC의 IOPS·지연 비교표도 같은 이유로 싣지 않습니다.

재야 할 때는 같은 실험 틀을 그대로 쓸 수 있습니다. 대기 방식별로 `/usr/bin/time`의 sys 시간(또는 `perf stat`의 task-clock)과 완료 지연의 분포(p50·p99)를 함께 기록하면, polling이 줄여 준 지연과 그 대가로 쓴 CPU가 한 표에 나옵니다.

## 자주 보는 함정

> Polling 루프에 `cpu_relax()` 누락

```c
while (!(readl(regs + STATUS) & DONE))
	cpu_relax();
```

커널에서 busy-wait 루프는 `cpu_relax()`를 넣는 것이 관례입니다. 커널 소스에서 이 함수는 arm64에서 `yield` 명령, x86에서 `rep; nop`(PAUSE)이고, x86 쪽 주석은 "REP NOP (PAUSE) is a good thing to insert into busy-wait loops"라고 적습니다([arm64](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/vdso/processor.h), [x86](https://github.com/torvalds/linux/blob/v6.12/arch/x86/include/asm/vdso/processor.h)). 이 힌트가 코어를 덜 태우는 것은 아니므로, 기다림이 길다면 polling 자체를 IRQ로 바꿔야 합니다. 위 edu 실험에서 100 ms가 고스란히 sys 시간이 된 것처럼요.

> IRQ coalescing을 크게 잡고 throughput만 보기

`rx-usecs`를 크게 잡으면 IRQ 수가 줄어 throughput 그래프는 좋아 보이지만, 첫 패킷이 IRQ를 기다리는 시간도 그만큼 늘 수 있습니다. e1000e는 모드 번호(0~4) 말고는 `rx-usecs`로 10~10000 µs 범위만 받습니다(`E1000_MIN_ITR_USECS`·`E1000_MAX_ITR_USECS`, [`e1000.h`](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ethernet/intel/e1000e/e1000.h#L55)). 설정을 바꿨다면 throughput과 지연 분포를 같이 재서 비교합니다.

> Phase·DD 확인 전 payload 읽기

```c
process(e->result);                 /* 회피: phase 확인 전 */
if (e->phase != expected) return;
```

순서가 뒤집히면 아직 장치가 채우지 않은 옛 값을 처리합니다. 확인 → `dma_rmb()` → 읽기 순서를 지켜야 하고, 위 실험이 보여 주듯 순서를 소스에서 맞춰도 barrier가 없으면 CPU가 다시 뒤집을 수 있습니다.

> 슬롯 반납을 잊음

NVMe CQ라면 호스트가 CQ head doorbell을 갱신하지 않는 경우입니다. QEMU NVMe 모델의 `nvme_cq_full()`은 `(tail + 1) % size == head`이면 큐가 찼다고 보고 완료 쓰기를 멈춥니다. head가 움직이지 않으면 완료가 더는 들어오지 않습니다. NIC RX 링이라면 거둔 descriptor에 새 버퍼를 채워 tail로 돌려주지 않는 경우이고, 장치가 쓸 descriptor가 바닥나면 수신이 멈춥니다. e1000e가 poll 안에서 16개마다, 그리고 poll 끝에서 남은 만큼 버퍼를 다시 채우는 이유입니다. 반대로 NVMe CQ 항목의 phase는 호스트가 고쳐 쓰는 값이 아닙니다. 컨트롤러가 바퀴마다 뒤집어 쓰고, 호스트는 기대값만 뒤집습니다.

> ISR 안에서 무거운 일

```c
void DMA_IRQHandler(void)
{
    parse_packet();                 /* 회피 */
    decrypt();
}
```

ISR이 길면 같은 우선순위 이하의 다른 IRQ가 그만큼 기다립니다. ISR에서는 플래그를 지우고 일을 넘기기만 하고, 무거운 처리는 thread·workqueue·NAPI poll로 미룹니다. NAPI가 IRQ에서 하는 일이 `napi_schedule()` 한 번뿐인 것도 같은 이유입니다.

> 원형 DMA에서 half나 full 콜백 하나만 처리

절반 콜백만 처리하면 버퍼 뒤쪽 절반을 놓치고, 전체 콜백만 처리하면 앞쪽 절반이 처리되기 전에 DMA가 다시 덮어쓸 수 있습니다. 두 콜백이 번갈아 서로 다른 절반을 맡아야 double buffer가 됩니다.

## 정리

- DMA 완료는 interrupt, polling, completion ring으로 알립니다. Ring은 앞의 둘 위에 얹히는 구조입니다.
- Interrupt는 기다리는 동안 CPU를 쉬게 하고, polling은 기다린 시간만큼 CPU를 씁니다. QEMU edu 실험에서 100 ms 대기가 polling 쪽에서만 sys 0.10 s가 됐습니다.
- Ring 드라이버는 완료를 묶어서 거두고, doorbell도 묶어서 씁니다(NVMe는 배치당 CQ head 한 번, e1000e는 16개마다 refill).
- Phase·DD를 확인한 뒤 `dma_rmb()`를 두고 나머지를 읽습니다. Arm64에서 barrier 없이 2억 건 중 13만 건 안팎이 stale이었습니다.
- NAPI는 IRQ로 깨어나 budget만큼 poll하고, 일이 없을 때만 IRQ를 다시 켭니다. DPDK도 Rx interrupt로 같은 전환을 제공합니다.
- 원형 DMA의 half/full 콜백은 Cortex-M에서 바이트당 IRQ를 수천 분의 일로 줄이는 기본 형태입니다.
- IRQ·polling 비용은 장치와 보드에서 직접 잽니다. CPU 시간과 지연 분포를 같이 봅니다.

다음 편은 **PCIe Streaming**입니다.

## 재현 절차

- edu 실험: QEMU 11.1.3 `qemu-system-aarch64 -M virt,gic-version=3 -accel hvf -cpu host -m 4g -smp 4 ... -device edu,id=edu0,dma_mask=0xffffffff`, 게스트 Debian 13 arm64(`debian-13-nocloud-arm64.qcow2`, 커널 6.12.116+deb13-arm64, gcc 14.2.0). edu의 기본 DMA 주소 마스크는 28비트라서 게스트 RAM 주소를 그대로 쓰려면 `dma_mask` 속성을 넓혀야 합니다. 모듈은 `make -C /lib/modules/$(uname -r)/build M=$PWD modules`로 빌드하고 `insmod edu_cmpl.ko mode=irq|poll`로 실행했습니다.
- Ring 실험: `clang -O2 -std=c11 -pthread cq_ring.c -o cq_ring && ./cq_ring 0 && ./cq_ring 1` (Apple clang 21.0.0, Apple M2 Pro).
- Cortex-M 코드: `arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -Wall -Wextra -ffreestanding -c dma_l4.c -I<cmsis_device_l4>/Include -I<CMSIS_5>/CMSIS/Core/Include` (arm-none-eabi-gcc 16.2.0).
- UART IRQ 수: 1,000,000 bit/s ÷ 10 bit = 100,000 byte/s, 100,000 ÷ 2048 = 48.8 IRQ/s.

## 관련 항목

- [11-07: CQ·SQ](/blog/embedded/modern-recipes/part11-07-cq-sq)
- [11-09: PCIe Streaming](/blog/embedded/modern-recipes/part11-09-pcie-streaming)
- [8-04: DMA Allocator](/blog/embedded/modern-recipes/part8-04-dma-allocator)
- [PE 3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
