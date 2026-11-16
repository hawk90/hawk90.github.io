---
title: "Interrupt Storm 처리 — NAPI·Rate-Limit·Polling 전환"
slug: "embedded/performance-engineering/part3-06-interrupt-storm"
date: 2026-04-25T09:05:00
description: "Interrupt storm의 비용을 계산하고, Linux NAPI 규칙을 커널 문서로 확인하며, Debian 게스트의 virtio-net에서 인터럽트당 패킷 수를 잽니다."
series: "Embedded Performance Engineering"
seriesOrder: 24
tags: [interrupt, storm, rate-limit, napi, coalescing]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"IRQ가 너무 많으면 CPU가 100% ISR에 잡힙니다."** 인터럽트 진입·처리에 CPU가 다 쓰여 정작 데이터 처리가 밀립니다.

## Storm 발생 시나리오

Gigabit Ethernet에서 최소 크기 frame은 64 byte이고, 선로에는 여기에 preamble·SFD 8 byte와 inter-frame gap 12 byte가 붙습니다. 그래서 1 Gbps의 최대 frame rate는 `1e9 / (84 × 8) ≈ 1.488 Mpps`입니다. 패킷마다 인터럽트를 건다면 인터럽트도 초당 1.488백만 번이고, 인터럽트 하나에 쓸 수 있는 시간은 672 ns입니다. 1 GHz 코어라면 672 cycle 안에 진입, 처리, 복귀를 모두 끝내야 한다는 뜻이고, 10 Gbps라면 그 10분의 1입니다.

Cortex-M에서는 3-05에서 본 진입 12 + 복귀 12 cycle이 바닥입니다. 168 MHz에서 인터럽트가 1 µs마다 오면 본문이 비어 있어도 CPU의 14%가 진입·복귀에 쓰입니다.

## Top-Half 짧음 + Bottom-Half에서 batch

```c
volatile int pending = 0;

void net_rx_irq(void) {
    pending = 1;
    NET->IMR &= ~RX_INT;   /* 이 인터럽트를 막음 */
}

void net_task(void) {
    while (pending) {
        pending = 0;
        process_all_packets();   /* 쌓인 것을 한 번에 */
        NET->IMR |= RX_INT;      /* 다 비운 뒤 다시 허용 */
    }
}
```

`NET->IMR`은 주변장치의 인터럽트 mask 레지스터를 나타낸 가상의 이름입니다. 핵심은 ISR이 자기 인터럽트를 막고, 처리 쪽이 쌓인 일을 다 비운 뒤에 다시 연다는 점입니다. 그동안 도착한 이벤트는 인터럽트 없이 한 번의 처리에서 함께 소화됩니다.

## NAPI - Linux Pattern

Linux 네트워크 드라이버의 NAPI가 이 패턴입니다. 커널 문서 `Documentation/networking/napi.rst`(Linux 6.12)의 규칙은 다음과 같습니다.

- poll 메서드는 `budget`만큼까지만 Rx 패킷을 처리합니다. 할 일이 남았으면(budget을 다 썼으면) 정확히 `budget`을 돌려줍니다.
- 일을 다 끝냈으면 돌아가기 전에 `napi_complete_done()`을 부릅니다. 이 함수가 instance의 소유권을 놓습니다.
- NAPI instance를 schedule한 뒤에는 polling이 끝날 때까지 인터럽트를 막아 둡니다. 그리고 "IRQ should only be unmasked after a successful call to napi_complete_done()".

```c
static int net_napi_poll(struct napi_struct *napi, int budget) {
    int packets = 0;
    while (packets < budget) {
        struct sk_buff *skb = rx_one_packet(...);
        if (!skb) break;
        netif_receive_skb(skb);
        packets++;
    }

    if (packets < budget && napi_complete_done(napi, packets))
        enable_rx_irq();      /* 소유권을 놓은 경우에만 */
    return packets;
}

static irqreturn_t net_irq(int irq, void *dev_id) {
    if (napi_schedule_prep(&napi)) {
        disable_rx_irq();          /* mask한 뒤에 schedule (napi.rst) */
        __napi_schedule(&napi);
    }
    return IRQ_HANDLED;
}
```

`netif_napi_add()`가 쓰는 기본 weight는 `NAPI_POLL_WEIGHT` 64입니다(`include/linux/netdevice.h` 2636·2654행). 인터럽트를 직접 mask하는 드라이버는 napi.rst의 예처럼 `napi_schedule_prep()` → mask → `__napi_schedule()` 순서로 씁니다. `rx_one_packet()`·`enable_rx_irq()`·`disable_rx_irq()`는 드라이버마다 다른 하드웨어 접근을 나타낸 이름입니다.

### 측정 — virtio-net의 패킷당 인터럽트

Debian 게스트의 `virtio_net` 드라이버도 NAPI를 씁니다(`drivers/net/virtio_net.c`의 `virtqueue_napi_schedule()`, `napi_complete_done()`). 호스트에서 게스트로 SSH를 통해 200 MiB를 보내면서, 전후로 `/proc/interrupts`의 `virtio0` 인터럽트 수와 `/sys/class/net/enp0s1/statistics/rx_packets`를 읽었습니다(`logs/p3-06-napi.log`, 3회).

| 실행 | 인터럽트 증가 | rx 패킷 증가 | 인터럽트당 패킷 |
|---:|---:|---:|---:|
| 1 | 8,115 | 147,013 | 18.1 |
| 2 | 9,564 | 147,705 | 15.4 |
| 3 | 12,421 | 148,695 | 12.0 |

패킷이 14만 7천 개 들어오는 동안 인터럽트는 8천~1만 2천 번이었습니다. 인터럽트 한 번에 평균 12~18개의 패킷이 처리됐습니다. `virtio0`은 장치의 모든 큐가 함께 쓰는 level 인터럽트 하나라 tx와 설정 알림도 이 수에 들어가므로, 인터럽트당 rx 패킷 수는 이보다 크거나 같습니다. 이 장치의 `ethtool -c enp0s1`은 `rx-usecs: 0`, `rx-frames: 1`, `Adaptive RX: off`로 coalescing이 꺼져 있었으므로, 이 묶음은 인터럽트를 막아 둔 동안 쌓인 패킷을 poll이 함께 처리한 결과로 볼 수 있습니다. QEMU 쪽 virtqueue 알림 동작은 따로 보지 않았습니다.

## Interrupt Coalescing (Hardware)

장치가 이벤트를 모았다가 시간(`rx-usecs`)이나 개수(`rx-frames`) 조건이 차면 인터럽트를 한 번 거는 기능입니다. Linux에서는 `ethtool -C`로 설정하고, `ethtool -c`로 현재 값을 봅니다.

```bash
ethtool -c enp0s1                       # 현재 값
ethtool -C eth0 rx-usecs 50 rx-frames 16
ethtool -C eth0 adaptive-rx on          # 지원하는 드라이버에서
```

시간 조건을 길게 잡으면 인터럽트는 줄지만, 첫 패킷이 그만큼 더 기다립니다. `napi.rst`의 "Software IRQ coalescing" 절은 NAPI 자체는 기본적으로 명시적 coalescing을 하지 않고 대부분의 묶음은 장치의 IRQ coalescing에서 생긴다고 적으며, 소프트웨어로 재poll timer를 거는 `gro_flush_timeout`과 `napi_defer_hard_irqs`를 설명합니다. 이 게스트에서는 둘 다 0이었습니다.

## DMA Coalescing

```c
/* STM32 HAL: circular DMA + half/full transfer callback */
HAL_UART_Receive_DMA(&huart, rx_buf, 4096);

void HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *huart) { /* 앞 절반 처리 */ }
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)     { /* 뒤 절반 처리 */ }
```

byte마다 인터럽트를 거는 대신 buffer 절반(2,048 byte)마다 걸면 인터럽트 수가 2,048분의 1이 됩니다. 두 callback은 STM32H7 HAL `stm32h7xx_hal_uart.h`에 선언되어 있습니다(`HAL_UART_RxHalfCpltCallback` 1654행). 보드에서 실행하지 않았습니다.

## Polling Mode

이벤트가 끊임없이 오면 인터럽트로 깨울 필요 없이 계속 읽는 쪽이 낫습니다. NAPI가 budget을 다 쓰는 동안 인터럽트를 다시 열지 않는 것이 바로 이 전환입니다.

```c
while (1) {
    while (rx_queue_not_empty()) {
        process_packet();
    }
    /* 짧게 쉬거나, 비었으면 인터럽트를 다시 연다 */
}
```

## Hybrid - busy-poll Linux

```bash
sysctl net.core.busy_poll=50
```

`Documentation/admin-guide/sysctl/net.rst`는 `busy_poll`을 poll과 select의 "low latency busy poll timeout"으로, 이벤트를 기다리며 busy loop할 대략의 µs 값으로 정의하고(`CONFIG_NET_RX_BUSY_POLL` 필요), 소켓 몇 개면 50, 수백 개면 100을 권합니다.

## IRQ Affinity

```bash
echo 2 > /proc/irq/24/smp_affinity   # IRQ 24 → CPU 1만 (bitmask 0b10)
```

`Documentation/core-api/irq/irq-affinity.rst`에 따르면 `/proc/irq/IRQ#/smp_affinity`와 `smp_affinity_list`는 그 IRQ를 받을 수 있는 CPU를 bitmask와 CPU 목록으로 지정합니다. 위 게스트의 `virtio1`(블록 장치)은 큐마다 다른 CPU에 인터럽트가 몰려 있었습니다(`/proc/interrupts`의 `virtio1-req.0`~`req.3`).

```bash
ethtool -X eth0 equal 4   # RSS indirection table을 4개 Rx 큐에 고르게
```

`ethtool` man page는 `-X ... equal N`으로 RSS indirection table을 N개 큐에 고르게 나누는 형식을 둡니다.

## 공격성 트래픽

외부에서 패킷을 쏟아부으면 수신 인터럽트가 storm이 됩니다. `net.ipv4.icmp_ratelimit`은 이것을 막는 설정이 아닙니다. `Documentation/networking/ip-sysctl.rst`는 이 값을 `icmp_ratemask`에 해당하는 ICMP 패킷을 *보내는* 속도의 제한(응답 사이 최소 간격, ms)으로 정의합니다. 수신 쪽 대책은 위의 NAPI와 coalescing입니다.

## Embedded - IRQ Budget 계산

RTOS task 주기가 10 ms이고 인터럽트 하나에 진입·처리·복귀를 합쳐 1 µs가 든다고 가정하면:

| 단계 | 값 |
|------|-----|
| 주기 하나에 들어갈 수 있는 인터럽트 | 10 ms / 1 µs = 10,000 |
| 절반을 task에 남긴다면 | 5,000 |
| 그중 20%를 여유로 남긴다면 | 4,000 → 초당 40만 번 |

인터럽트가 이보다 자주 오면 task가 주기 안에 끝나지 못합니다. 이 표는 가정한 숫자로 한 계산이고, 1 µs는 대상에서 ISR 하나를 재서 바꿔 넣습니다(3-05의 측정 절차).

## IRQ Off vs BASEPRI

```c
/* PRIMASK: 모든 설정 가능 인터럽트를 막음 */
__disable_irq();
critical_code();
__enable_irq();

/* BASEPRI: 정한 우선순위 이하만 막음 */
__set_BASEPRI(SYSCALL_PRI);
critical_code();
__set_BASEPRI(0);
```

BASEPRI로 막으면 그보다 높은 우선순위 인터럽트는 critical section 중에도 들어옵니다(ARMv7-M ARM B1.5.4, 3-05). storm이 낮은 우선순위 인터럽트에서 일어나는 동안 높은 우선순위 인터럽트의 응답을 지킬 수 있습니다.

## 자주 하는 실수

> ⚠️ ISR에서 처리 다 함

```c
void net_irq(void) {
    while (rx_queue_not_empty()) {
        process_packet();
    }
}
```

이벤트가 처리보다 빨리 오면 ISR에서 빠져나오지 못하고, 같거나 낮은 우선순위의 모든 것이 멈춥니다. 처리는 task나 NAPI poll로 넘깁니다.

> ⚠️ Coalescing을 끔

```bash
ethtool -C eth0 rx-usecs 0 rx-frames 1
```

장치가 패킷마다 인터럽트를 걸려고 합니다. 위 virtio-net이 이 설정이었지만, NAPI가 poll 동안 인터럽트를 막아 두어 인터럽트당 12~18 패킷이 됐습니다. 지연 요구와 인터럽트 수를 함께 재고 값을 정합니다.

> ⚠️ DMA half-transfer callback 무시

full callback만 처리하면 앞 절반의 데이터도 buffer가 다 찰 때까지 기다립니다. half callback에서 앞 절반을 처리하면 그만큼 일찍 처리됩니다.

## 정리

- 1 Gbps 최소 frame에서 패킷마다 인터럽트를 걸면 초당 1.488백만 번, 인터럽트당 672 ns입니다.
- NAPI는 schedule 뒤 인터럽트를 막고 `napi_complete_done()`이 성공한 뒤에만 다시 엽니다(napi.rst).
- 게스트의 virtio-net은 하드웨어 coalescing이 꺼진 상태에서도 인터럽트 하나에 패킷 12~18개를 처리했습니다.
- `icmp_ratelimit`은 송신 ICMP 제한이지 수신 storm 대책이 아닙니다.
- DMA half/full callback은 인터럽트를 buffer 절반마다로 줄입니다.

다음 편은 **MMIO 접근**을 다룹니다.

## 관련 항목

- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [3-07: MMIO 접근](/blog/embedded/performance-engineering/part3-07-mmio)

## 참고 자료

- Linux v6.12: `Documentation/networking/napi.rst`, `Documentation/admin-guide/sysctl/net.rst`, `Documentation/networking/ip-sysctl.rst`, `Documentation/core-api/irq/irq-affinity.rst`, `include/linux/netdevice.h`, `drivers/net/virtio_net.c`
- `ethtool(8)` man page (Debian 13)
- [STM32CubeH7 HAL driver](https://github.com/STMicroelectronics/stm32h7xx-hal-driver) `stm32h7xx_hal_uart.h`
