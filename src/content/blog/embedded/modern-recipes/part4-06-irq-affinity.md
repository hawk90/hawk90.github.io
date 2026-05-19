---
title: "4-06: IRQ Affinity·RPS·RSS — Multi-Core Network Tuning"
date: 2026-05-20T19:00:00
description: "IRQ pinning, RPS (Receive Packet Steering), RSS (Receive Side Scaling), XPS, NAPI."
series: "Modern Embedded Recipes"
seriesOrder: 24
tags: [recipes, irq-affinity, rps, rss, network-tuning]
draft: true
---

## 한 줄 요약

> **"IRQ Affinity = ISR을 특정 core에"** — RT core 보호 + network RPS·RSS로 분산.

## /proc/interrupts

```bash
cat /proc/interrupts

#         CPU0    CPU1    CPU2    CPU3
#  16:    1234    5678    9012    3456    GICv3   timer
#  23:  123456       0       0       0    GICv3   eth0
#  24:    1234    5678       0       0    GICv3   spi
#  42:       0       0  234567       0    GICv3   custom
```

각 IRQ — *어느 core가 처리했나*. eth0 → CPU 0만 → 불균등.

## IRQ Affinity 설정

```bash
# IRQ 23 (eth0) → CPU 1만
echo 2 > /proc/irq/23/smp_affinity      /* mask 0x2 */

# CPU 2,3
echo 0xC > /proc/irq/23/smp_affinity

# CPU list 형식
echo 1-3 > /proc/irq/23/smp_affinity_list
```

`smp_affinity` — *kernel hint*. balancer가 *override 가능*.

## irqbalance — 자동 분산

```bash
# Daemon
systemctl status irqbalance

# Disable for manual control
systemctl stop irqbalance
systemctl disable irqbalance
```

RT 시스템 — irqbalance *비활성*. 명시 pinning.

## isolcpus — RT 전용 코어

```text
# Kernel cmdline
isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3

# CPU 2,3 — kernel scheduler·tick·RCU 제외
```

```bash
# IRQ를 isolated 외 core에만
for i in /proc/irq/*/smp_affinity; do
    echo 3 > $i   /* CPU 0,1만 */
done

# RT app — CPU 2,3에만
taskset -c 2,3 ./rt_app
```

자동차·산업 — *RT core jitter 최소화*.

## RSS — Receive Side Scaling

```text
RSS (Receive Side Scaling):
  - NIC hardware feature
  - Packet hash → 여러 RX queue 분산
  - 각 queue가 다른 CPU IRQ
  - Multi-core throughput ↑
```

```bash
# 현재 RSS queue 수
ethtool -l eth0
# Channel parameters:
# Pre-set maximums:
# RX:		0
# TX:		0
# Combined:	8
# Current hardware settings:
# Combined:	4

# 8 queue 활성
sudo ethtool -L eth0 combined 8

# 각 queue IRQ를 다른 CPU에
cat /proc/interrupts | grep eth0
# 24: eth0-rx-0  → CPU 0
# 25: eth0-rx-1  → CPU 1
# ...
```

10G+ NIC — RSS *자동*. 각 core 자기 queue 처리.

## RPS — Receive Packet Steering (Software)

```text
RPS — NIC가 single queue만 지원 시:
  - ISR core가 packet 받음
  - Hash → 다른 core에 IPI로 전달
  - 그 core가 stack 처리
  - ISR core 부담 ↓
```

```bash
# CPU 1, 2, 3에 RPS 분산 (CPU 0이 ISR)
echo e > /sys/class/net/eth0/queues/rx-0/rps_cpus    # 0xE = 1110
```

embedded·저가 NIC — RPS로 *software RSS*.

## XPS — Transmit Packet Steering

```bash
# CPU별로 TX queue 분리
echo 1 > /sys/class/net/eth0/queues/tx-0/xps_cpus    # CPU 0 → TX queue 0
echo 2 > /sys/class/net/eth0/queues/tx-1/xps_cpus    # CPU 1 → TX queue 1
```

CPU·TX queue 1:1 — false sharing 회피.

## NAPI — Adaptive

```text
NAPI (New API):
  - Low traffic: IRQ-driven (latency 우선)
  - High traffic: polling mode (throughput 우선)
  - 자동 전환
```

```bash
# Receive batch size
cat /proc/sys/net/core/netdev_budget
# 300

# Adjust
echo 600 > /proc/sys/net/core/netdev_budget
```

## Threaded IRQ — PREEMPT_RT

```bash
# IRQ thread 확인
ps -eo pid,pri,comm | grep irq

# 4321 50 [irq/23-eth0]
# 4322 49 [irq/24-spi]

# Priority 조정
chrt -f -p 80 4321

# Affinity
taskset -p 0x4 4321   # CPU 2
```

PREEMPT_RT — *모든 IRQ가 thread*. priority·affinity 둘 다 조정.

## SO_INCOMING_CPU — Application Pinning

```c
int sock = socket(AF_INET, SOCK_STREAM, 0);
int cpu;
socklen_t len = sizeof(cpu);
getsockopt(sock, SOL_SOCKET, SO_INCOMING_CPU, &cpu, &len);
/* socket이 어느 CPU에 incoming → 그 CPU에서 처리 */

cpu_set_t set;
CPU_ZERO(&set);
CPU_SET(cpu, &set);
sched_setaffinity(0, sizeof(set), &set);
```

Nginx·Envoy — *connection received CPU에 pin*. NUMA 친화.

## DPDK — User-Space + CPU Mask

```bash
sudo ./dpdk-app -l 0-7 -n 4 -- ...
# -l 0-7 : CPU 0~7 사용
# -n 4   : 4 memory channel
```

DPDK가 *각 CPU별 worker thread* + NIC RX queue 분배.

## 자동차 — Real-Time IRQ

```text
ASIL ECU layout:
  CPU 0 — Linux scheduler·housekeeping
  CPU 1 — User app
  CPU 2 — RT control (isolated)
  CPU 3 — RT control (isolated)
  
IRQ assignment:
  Brake sensor IRQ   → CPU 2 (RT)
  Camera DMA IRQ     → CPU 0 (best-effort)
  CAN bus IRQ        → CPU 2 (low latency)
  Ethernet IRQ       → CPU 0,1 (RSS)
```

명시 affinity + isolcpus = jitter 안정.

## ksoftirqd Threading

```bash
# Soft IRQ thread per CPU
ps -eo pid,comm | grep ksoftirqd
# ksoftirqd/0
# ksoftirqd/1
# ksoftirqd/2
# ksoftirqd/3
```

NAPI poll·timer·tasklet 처리. CPU별 *softirq 처리*.

## tuned·tuned-adm

```bash
# 미리 정의된 profile
tuned-adm list
# realtime
# network-throughput
# network-latency
# low-latency
# ...

sudo tuned-adm profile realtime
```

산업·서버 — *tuned profile 적용 표준*.

## Cyclictest로 검증

```bash
# IRQ affinity 변경 전후 측정
sudo cyclictest -p 99 -t -n -m -h 200 -i 1000 -a 2,3

# Max latency 비교
```

각 core 분리·affinity 후 *cyclictest로 jitter 확인*.

## perf로 IRQ 분석

```bash
# IRQ event trace
perf record -e irq:irq_handler_entry,irq:irq_handler_exit -a sleep 5
perf script | head

# IRQ별 timing histogram
perf stat -e irq:* sleep 5
```

## Linux 6.12+ — IRQ 자동 Affinity Hint

```c
/* Driver hint */
irq_set_affinity_hint(irq, &cpumask);
```

Driver가 *적절한 CPU mask 제안*. irqbalance가 활용.

## 자주 하는 실수

> ⚠️ All-CPU mask로 affinity

```bash
echo f > /proc/irq/24/smp_affinity   # 모든 CPU — 사실상 비 affinity
```

→ specific CPU.

> ⚠️ irqbalance + manual affinity 충돌

```bash
echo 2 > smp_affinity
# irqbalance가 다시 변경
```

→ irqbalance 비활성 또는 *exclusion list*.

> ⚠️ RT core에 일반 IRQ

```bash
# isolcpus=2,3 — RT 전용
# 그러나 eth0 IRQ를 CPU 2에 affinity → RT jitter
```

→ housekeeping·RT core *명확히 분리*.

> ⚠️ NIC RSS off로 single queue

```bash
ethtool -L eth0 combined 1
# CPU 1개로 IRQ 폭주 → bottleneck
```

→ combined 늘림.

## 정리

- **IRQ affinity** = `/proc/irq/N/smp_affinity`로 pinning.
- **RSS** (hardware) — 여러 NIC queue → 여러 CPU.
- **RPS** (software) — single queue → 여러 CPU 분산.
- **XPS** — TX queue per-CPU.
- **isolcpus** — RT 전용 core.
- **PREEMPT_RT** — threaded IRQ priority 조정.
- 자동차·산업 — manual affinity + isolcpus 표준.

이 시리즈 **Modern Recipes Part 4** 여기까지.

## 관련 항목

- [4-05: sysfs](/blog/embedded/modern-recipes/part4-05-sysfs)
- [PE 3-06: Interrupt Storm](/blog/embedded/performance-engineering/part3-06-interrupt-storm)
- [PE 4-10: SMP 분석](/blog/embedded/performance-engineering/part4-10-smp-analysis)
