---
title: "3-06: Interrupt Storm — NAPI·Rate-Limit·Polling 전환"
date: 2026-05-08T05:00:00
description: "IRQ flooding으로 main loop 봉쇄. NAPI 패턴, rate limit, interrupt coalescing."
series: "Embedded Performance Engineering"
seriesOrder: 24
tags: [interrupt, storm, rate-limit, napi, coalescing]
draft: true
---

## 한 줄 요약

> **"IRQ 너무 많으면 CPU 100% ISR"** — context switch overhead로 throughput 역행.

## Storm 발생 시나리오

```text
Gigabit Ethernet — 1 Gbps × 64-byte frame = 1.95 Mpps (packets/sec)
매 패킷마다 IRQ → 1.95M IRQ/sec
ISR 진입 12 cycle + 처리 100 cycle × 1.95M = 220 Mcycle/sec
@ 1 GHz CPU → 22% CPU on ISR overhead만
```

10 Gbit → CPU 100% 가능. 데이터 처리 *전혀 못 함* → throughput 0.

## Top-Half 짧음 + Bottom-Half에서 batch

```c
volatile int pending = 0;

void net_rx_irq(void) {
    pending = 1;   // 매우 짧음
    NET->IMR &= ~RX_INT;   // ← IRQ mask (다음 IRQ 차단)
}

void net_task(void) {
    while (pending) {
        pending = 0;
        process_all_packets();   // batch
        NET->IMR |= RX_INT;       // ← IRQ unmask
    }
}
```

**핵심** — *ISR이 자기 IRQ disable* → storm 종료까지 *한 번만 호출됨*.

## NAPI — Linux Pattern

```c
/* NAPI (New API) — Linux network driver 표준 */

static int net_napi_poll(struct napi_struct *napi, int budget) {
    int packets = 0;
    while (packets < budget) {
        struct sk_buff *skb = rx_one_packet(...);
        if (!skb) break;
        netif_receive_skb(skb);
        packets++;
    }
    
    if (packets < budget) {
        napi_complete(napi);     // budget 안 채움 → IRQ 다시 enable
        enable_rx_irq();
    }
    return packets;
}

static irqreturn_t net_irq(int irq, void *dev_id) {
    disable_rx_irq();
    napi_schedule(&napi);
    return IRQ_HANDLED;
}
```

- IRQ 한 번 → poll mode 전환
- Budget 만큼 처리 (e.g. 64 packet)
- Queue empty 시 IRQ 다시 enable

**효과** — 트래픽 많을 땐 polling (overhead 0), 적을 땐 IRQ (latency 짧음).

## Interrupt Coalescing (Hardware)

```c
/* 네트워크·SATA·NVMe 칩 — coalescing register */
NIC->IRQ_COALESCE = COALESCE_TIME(50us) | COALESCE_COUNT(16);
/* → 16 패킷 또는 50µs마다 IRQ */
```

장점 — IRQ rate ↓.
단점 — 평균 latency ↑.

```text
Trade-off:
  short coalesce: low latency, high CPU
  long coalesce: high throughput, high latency
```

이더넷 — *50µs / 16 packet*이 일반 default.

## Adaptive Coalescing

```c
if (cpu_load > 80%) coalesce_time = 200us;   // CPU 보호
else                coalesce_time = 20us;    // latency 우선
```

Linux `ethtool -C eth0 adaptive-rx on`.

## DMA Coalescing

```c
/* Cortex-M DMA — circular buffer + half/full transfer IRQ */
HAL_UART_Receive_DMA(&huart, rx_buf, 4096);
/* → IRQ at 2048 byte (half) + 4096 byte (full) */
```

매 byte IRQ가 아닌 *buffer 절반*마다 → IRQ rate 1/2000.

## Polling Mode — Trafficl Heavy

```c
/* 1 Mpps 이상 — IRQ 자체 무의미 */
while (1) {
    while (rx_queue_not_empty()) {
        process_packet();
    }
    /* short sleep */
}
```

DPDK·SPDK 패턴 — *user-space polling*. IRQ 0개로 *60 Mpps* 달성.

## Hybrid — busy-poll Linux

```c
sysctl net.core.busy_poll = 50   // 50 µs polling 후 IRQ로 fallback
```

Low-latency app — IRQ로 깰 때까지 *짧은 polling 시도*.

## IRQ Affinity

```bash
echo 2 > /proc/irq/24/smp_affinity   # IRQ 24 → CPU 1만
```

이더넷 IRQ를 *특정 코어*에 고정 — cache locality + 다른 코어 보호.

```bash
# RSS (Receive Side Scaling) — 자동 분산
ethtool -X eth0 equal 4   # 4 CPU에 균등 분산
```

## ICMP Flood — 공격 시 storm

```text
악의적 트래픽 (ICMP flood) → ISR storm → CPU 100% → OS hang
```

해결:
- `sysctl net.ipv4.icmp_ratelimit = 100`   # rate limit
- 방화벽에서 *drop before NIC IRQ* (XDP 사용)

XDP (eXpress Data Path) — Linux BPF로 *driver level에서 drop*.

## Embedded — IRQ Budget 계산

```text
RTOS task 주기 10 ms, ISR overhead 1 µs당
  - 이론 IRQ budget: 10 ms × 100% = 10,000 IRQ
  - 실제 budget (50% for task): 5,000 IRQ
  - 안전 마진 (20% headroom): 4,000 IRQ → 0.4 MHz max IRQ rate
```

IRQ rate ≥ budget → *task miss deadline*. CAN bus 1 Mbps 메시지 폭주 시 흔함.

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

Path 2가 storm에 강함 — high priority IRQ는 *동작 유지*.

## 자주 하는 실수

> ⚠️ ISR에서 처리 다 함

```c
void net_irq(void) {
    while (rx_queue_not_empty()) {
        process_packet();   // ← ISR 안에서 무한
    }
}
```

→ task에 위임. Storm 시 *영원 ISR에 머묾*.

> ⚠️ Coalescing 0 / 1

```c
NIC->IRQ_COALESCE = 0;
/* → 매 packet IRQ — 보통 사용 X */
```

기본값 (50µs 또는 16 packet) 사용.

> ⚠️ DMA half-transfer IRQ 무시

```c
HAL_UART_Receive_DMA(&huart, buf, 4096);
/* full transfer IRQ만 처리 → buffer 절반은 *나중에야* 처리 */
```

매 half에서 *그 절반 처리* → latency 절반.

> ⚠️ 우선순위 잘못

낮은 priority IRQ가 *상시 대기* → high IRQ 처리 동안 storm 발생 → high IRQ 처리 지연.

## 정리

- Storm — IRQ rate가 *CPU 처리 능력 초과*.
- **NAPI 패턴** — IRQ → polling → IRQ 동적 전환.
- **Coalescing**으로 hardware IRQ rate 제한.
- 큰 transfer DMA + buffer IRQ (매 byte 아님).
- **IRQ affinity·RSS**로 다중 코어 분산.
- DPDK·XDP — driver/kernel bypass.

다음 편은 **MMIO 접근**.

## 관련 항목

- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [3-07: MMIO 접근](/blog/embedded/performance-engineering/part3-07-mmio)
