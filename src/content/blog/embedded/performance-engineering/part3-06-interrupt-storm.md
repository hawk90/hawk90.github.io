---
title: "Interrupt Storm 처리 — NAPI·Rate-Limit·Polling 전환"
slug: "embedded/performance-engineering/part3-06-interrupt-storm"
date: 2026-04-25T09:05:00
description: "IRQ flooding으로 main loop 봉쇄. NAPI 패턴, rate limit, interrupt coalescing."
series: "Embedded Performance Engineering"
seriesOrder: 24
tags: [interrupt, storm, rate-limit, napi, coalescing]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"IRQ가 너무 많으면 CPU가 100% ISR에 잡힙니다."** context switch overhead 때문에 throughput이 오히려 떨어집니다.

## Storm 발생 시나리오

Gigabit Ethernet에서 최소 64-byte Ethernet frame마다 IRQ가 발생한다고 가정해도, 선로 점유에는 preamble/SFD 8 byte와 inter-frame gap 12 byte가 더해집니다. 따라서 1 Gbps line rate의 상한은 `1e9 / (84 × 8) ≈ 1.488 Mpps`입니다. 매 패킷마다 IRQ를 걸면:

| 항목 | 값 |
|------|-----|
| IRQ 빈도 상한 | 약 1.488 M IRQ/sec |
| ISR 비용 | 진입 12 cycle + 처리 100 cycle |
| 총 cycle | 112 × 1.488 M ≈ 166.7 Mcycle/sec |
| 1 GHz CPU 점유 | *약 16.7%* (가정한 112 cycle/IRQ만 계산) |

같은 단순 가정을 10 Gbit/s에 적용하면 IRQ 진입·처리에만 CPU 용량을 넘는 시간이 필요합니다. 실제 NIC는 coalescing이나 queueing 같은 동작이 개입하므로 이 계산은 패킷 처리 성능 측정값이 아니라 line-rate 상한에 대한 비용 예시입니다.

## Top-Half 짧음 + Bottom-Half에서 batch

```c
volatile int pending = 0;

void net_rx_irq(void) {
    pending = 1;   // 매우 짧음
    NET->IMR &= ~RX_INT;   // IRQ mask (다음 IRQ 차단)
}

void net_task(void) {
    while (pending) {
        pending = 0;
        process_all_packets();   // batch
        NET->IMR |= RX_INT;       // IRQ unmask
    }
}
```

**핵심은 *ISR이 자기 IRQ를 disable*하는 것**입니다. 이렇게 하면 storm이 끝날 때까지 *ISR이 한 번만 호출*됩니다.

## NAPI - Linux Pattern

```c
/* NAPI (New API) - Linux network driver 표준
 * poll/completion/IRQ 재활성화 순서는 kernel 및 driver API 문서를 따릅니다. */

static int net_napi_poll(struct napi_struct *napi, int budget) {
    int packets = 0;
    while (packets < budget) {
        struct sk_buff *skb = rx_one_packet(...);
        if (!skb) break;
        netif_receive_skb(skb);
        packets++;
    }
    
    if (packets < budget) {
        if (napi_complete_done(napi, packets)) {
            enable_rx_irq(); // poll ownership을 놓은 경우에만 IRQ 재활성화
        }
    }
    return packets;
}

static irqreturn_t net_irq(int irq, void *dev_id) {
    disable_rx_irq();
    napi_schedule(&napi);
    return IRQ_HANDLED;
}
```

- IRQ 한 번이 들어오면 poll mode로 전환합니다.
- Budget만큼 처리합니다 (예: 64 packet).
- Queue가 비면 IRQ를 다시 enable합니다.

실제 드라이버는 [Linux NAPI completion contract](https://docs.kernel.org/networking/napi.html)에 따라 poll 소유권을 넘긴 경우에만 IRQ를 재활성화해야 합니다.

**효과**는 트래픽이 많을 때 interrupt 횟수를 줄여 batch 처리하는 것입니다. polling도 CPU 시간을 사용하므로 비용이 0은 아닙니다. 트래픽이 적을 때는 IRQ 기반 처리로 불필요한 polling을 줄일 수 있습니다.

## Interrupt Coalescing (Hardware)

```c
/* 네트워크·SATA·NVMe 칩 - coalescing register */
NIC->IRQ_COALESCE = COALESCE_TIME(50us) | COALESCE_COUNT(16);
/* → 16 패킷 또는 50µs마다 IRQ */
```

장점은 IRQ rate가 줄어드는 것이고, 단점은 평균 latency가 늘어나는 것입니다.

**Trade-off:**

- short coalesce: low latency, high CPU
- long coalesce: high throughput, high latency

이더넷에서는 *50µs / 16 packet*이 일반적인 default입니다.

## Adaptive Coalescing

```c
if (cpu_load > 80%) coalesce_time = 200us;   // CPU 보호
else                coalesce_time = 20us;    // latency 우선
```

Linux `ethtool -C eth0 adaptive-rx on`.

## DMA Coalescing

```c
/* Cortex-M DMA - circular buffer + half/full transfer IRQ */
HAL_UART_Receive_DMA(&huart, rx_buf, 4096);
/* → IRQ at 2048 byte (half) + 4096 byte (full) */
```

매 byte마다가 아니라 *buffer 절반*마다 IRQ를 걸어 IRQ rate를 1/2000로 줄입니다.

## Polling Mode - Traffic Heavy

```c
/* 1 Mpps 이상이면 IRQ 자체가 무의미합니다 */
while (1) {
    while (rx_queue_not_empty()) {
        process_packet();
    }
    /* short sleep */
}
```

DPDK와 SPDK는 설정에 따라 user-space polling을 사용할 수 있습니다. polling 처리량은 NIC·queue 수·CPU·packet 크기와 workload에 따라 달라지므로 고정 PPS 값으로 일반화하지 않습니다.

## Hybrid - busy-poll Linux

```c
sysctl net.core.busy_poll = 50   // 50 µs polling 후 IRQ로 fallback
```

Low-latency app에서는 IRQ로 깰 때까지 *짧게 polling을 시도*합니다.

## IRQ Affinity

```bash
echo 2 > /proc/irq/24/smp_affinity   # IRQ 24 → CPU 1만
```

이더넷 IRQ를 *특정 코어*에 고정하면 cache locality를 얻고 다른 코어를 보호할 수 있습니다.

```bash
# RSS (Receive Side Scaling) — 자동 분산
ethtool -X eth0 equal 4   # 4 CPU에 균등 분산
```

## ICMP Flood - 공격 시 storm

```text
악의적 트래픽 (ICMP flood) → ISR storm → CPU 100% → OS hang
```

해결책은 다음과 같습니다.
- `net.ipv4.icmp_ratelimit`은 커널이 생성하는 일부 ICMP 오류 메시지의 rate limit 설정입니다. 수신 ICMP flood 전체를 제한하는 입력 rate limiter로 간주하지 않습니다.
- XDP는 지원되는 드라이버의 RX 처리 경로에서 패킷을 일찍 drop할 수 있습니다. 일반적으로 NIC가 interrupt를 만들기 전 drop한다고 보장하지 않으며, 하드웨어 offload 여부는 NIC·드라이버에 따릅니다.

XDP (eXpress Data Path)는 Linux BPF로 *RX 경로 초기에 처리·drop*하는 기법입니다.

## Embedded - IRQ Budget 계산

RTOS task 주기 10 ms, ISR overhead 1 µs/IRQ:

| 단계 | 값 |
|------|-----|
| 이론 IRQ budget | 10 ms × 100% = 10,000 IRQ |
| 실제 budget (50% for task) | 5,000 IRQ |
| 안전 마진 (20% headroom) | 4,000 IRQ → *0.4 MHz max IRQ rate* |

IRQ rate가 budget을 넘으면 *task가 deadline을 놓칩니다*. CAN bus 1 Mbps에서 메시지가 폭주할 때 흔히 발생합니다.

## Lock Pendling vs IRQ Off

```c
/* Path 1: IRQ off in critical */
__disable_irq();
critical_code();
__enable_irq();
/* → critical 동안 모든 IRQ 차단 */

/* Path 2: pending PendSV */
__set_BASEPRI(SYSCALL_PRI);   // selective
critical_code();
__set_BASEPRI(0);
/* → low priority IRQ만 차단 */
```

Path 2가 storm에 더 강합니다. high priority IRQ는 *그대로 동작*하기 때문입니다.

## 자주 하는 실수

> ⚠️ ISR에서 처리 다 함

```c
void net_irq(void) {
    while (rx_queue_not_empty()) {
        process_packet();   // ISR 안에서 무한 loop
    }
}
```

처리는 task에 위임해야 합니다. 그렇지 않으면 storm 발생 시 *ISR에 영원히 머무릅니다*.

> ⚠️ Coalescing 0 / 1

```c
NIC->IRQ_COALESCE = 0;
/* → 매 packet마다 IRQ. 보통은 쓰지 않습니다 */
```

기본값(50µs 또는 16 packet)을 사용합니다.

> ⚠️ DMA half-transfer IRQ 무시

```c
HAL_UART_Receive_DMA(&huart, buf, 4096);
/* full transfer IRQ만 처리하면 buffer 절반은 *나중에야* 처리됩니다 */
```

매 half에서 *해당 절반을 처리*하면 latency를 절반으로 줄일 수 있습니다.

> ⚠️ 우선순위 잘못

낮은 priority IRQ가 *상시 대기* 상태가 되면 high IRQ 처리 동안 storm이 발생해 high IRQ 처리가 지연됩니다.

## 정리

- Storm은 IRQ rate가 *CPU 처리 능력을 넘어선* 상태입니다.
- **NAPI 패턴**은 IRQ → polling → IRQ를 동적으로 전환합니다.
- **Coalescing**으로 hardware IRQ rate를 제한합니다.
- 큰 transfer에서는 DMA와 buffer IRQ를 함께 씁니다(매 byte 아님).
- **IRQ affinity와 RSS**로 다중 코어에 분산합니다.
- DPDK와 XDP는 driver/kernel을 우회합니다.

다음 편은 **MMIO 접근**을 다룹니다.

## 관련 항목

- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [3-07: MMIO 접근](/blog/embedded/performance-engineering/part3-07-mmio)
