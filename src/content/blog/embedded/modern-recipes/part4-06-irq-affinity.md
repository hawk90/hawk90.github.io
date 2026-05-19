---
title: "4-06: IRQ Affinity — smp_affinity·isolcpus·irqbalance"
date: 2026-05-07T19:00:00
description: "IRQ를 코어에 고정하는 방법과 isolcpus·irqbalance·threaded IRQ의 상호작용을 측정과 함께 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 24
tags: [recipes, irq-affinity, isolcpus, irqbalance, preempt-rt]
---

## 한 줄 요약

> **"IRQ Affinity = 인터럽트를 어느 코어에 보낼지 선택하는 것."** RT core 격리, NIC RX 분배, cache locality 모두 같은 도구로 해결합니다.

## 어떤 상황에서 쓰나

산업·자동차 ECU에서 한 코어를 RT 제어 루프에 통째로 내어 주는 일이 흔합니다. 그 코어로 일반 IRQ가 한 번 들어오면 cyclictest의 max latency가 수십 µs 단위로 튀어 오릅니다. RT core에 인터럽트가 닿지 않도록 모든 IRQ를 다른 코어로 밀어야 합니다.

10 GbE 이상의 NIC에서는 반대로 *분산*이 목표입니다. RX queue를 여러 개 만들고 각 queue의 IRQ를 다른 코어에 매핑해야 single core가 병목이 되지 않습니다. 두 시나리오 모두 `/proc/irq/N/smp_affinity` 한 줄에서 시작합니다.

## 핵심 개념

```text
/proc/interrupts                    IRQ별 코어별 카운트
/proc/irq/N/smp_affinity            bitmask (예: 0x2 = CPU1)
/proc/irq/N/smp_affinity_list       사람이 읽기 쉬운 형식 (예: 1-3)
/proc/irq/N/affinity_hint           driver가 제안하는 mask
```

`smp_affinity`는 *kernel hint*입니다. irqbalance daemon이 켜져 있으면 자동으로 덮어쓸 수 있습니다. 수동 pinning이 필요하면 irqbalance를 끄거나 ban 목록을 지정합니다.

isolcpus는 한 단계 더 강한 도구입니다. 부팅 시 cmdline으로 코어를 격리하면 일반 scheduler가 그 코어에 task를 배치하지 않고, IRQ도 명시 affinity가 없는 한 들어가지 않습니다. PREEMPT_RT에서는 IRQ가 *threaded*로 변환되어 일반 task처럼 priority와 affinity를 따로 조정할 수 있습니다.

## 코드 / 실제 사용 예

### 현재 상태 확인

```bash
$ cat /proc/interrupts
           CPU0    CPU1    CPU2    CPU3
 16:        12     345     678     901   GICv3   timer
 23:    123456       0       0       0   GICv3   eth0
 24:      4321    8765       0       0   GICv3   spi0
 56:         0       0  234567       0   GICv3   custom

$ cat /proc/irq/23/smp_affinity
00000000,00000000,00000000,00000001
$ cat /proc/irq/23/smp_affinity_list
0
```

eth0가 CPU0 한 곳으로 몰리고 있습니다. 분산을 위해 mask를 바꿔 줍니다.

### 수동 affinity 설정

```bash
# CPU 1만
echo 2 > /proc/irq/23/smp_affinity

# CPU 2,3
echo c > /proc/irq/23/smp_affinity

# list 형식이 더 안전
echo 2-3 > /proc/irq/23/smp_affinity_list
```

변경 후 다시 `/proc/interrupts`로 카운트가 늘어나는 코어가 바뀌었는지 확인합니다. 변경이 반영되지 않는다면 driver가 `IRQ_NO_BALANCING` 플래그를 걸어 두었거나, 일부 platform IRQ controller가 특정 코어로의 routing만 허용하는 경우입니다.

### irqbalance 다루기

```bash
# 자동 분산 daemon
systemctl status irqbalance

# RT 시스템에서는 보통 끈다
sudo systemctl stop irqbalance
sudo systemctl disable irqbalance

# 또는 특정 IRQ만 ban
echo "IRQBALANCE_BANNED_CPUS=0xc" >> /etc/default/irqbalance
echo "IRQBALANCE_ARGS=\"--banirq=23 --banirq=24\""    >> /etc/default/irqbalance
```

irqbalance는 일반 server에서는 합리적인 기본값을 만들어 주지만, manual affinity와는 충돌합니다. 둘 중 하나를 선택해야 합니다.

### isolcpus로 RT core 분리

```text
# /boot/cmdline 또는 GRUB
isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3 irqaffinity=0-1
```

`irqaffinity=0-1`이 핵심입니다. 명시 affinity가 없는 모든 IRQ의 기본 mask가 0~1로 묶이니, isolated CPU 2~3에 잘못된 IRQ가 들어가지 않습니다.

```bash
# 부팅 후 확인
for f in /proc/irq/*/smp_affinity_list; do
    printf "%s: %s\n" "$f" "$(cat $f)"
done | head
```

### NIC RSS와 결합

```bash
# RX queue 8개 활성화
sudo ethtool -L eth0 combined 8

# 각 queue IRQ를 코어 0~7에 분배
i=0
for irq in $(grep eth0- /proc/interrupts | awk -F: '{print $1}'); do
    echo $((1 << i)) > /proc/irq/$irq/smp_affinity
    i=$((i + 1))
done
```

RSS hash가 packet을 queue별로 나누고, 각 queue가 자기 코어에서 처리됩니다. cache locality가 살아 latency도 함께 좋아집니다.

### PREEMPT_RT — threaded IRQ

```bash
$ ps -eo pid,pri,comm | grep irq
 4321  50 irq/23-eth0
 4322  49 irq/24-spi

# priority 조정
sudo chrt -f -p 80 4321

# 코어 고정
sudo taskset -pc 1 4321
```

PREEMPT_RT 커널은 거의 모든 IRQ를 thread로 변환합니다. RT task의 priority와 명확히 정렬해야 우선순위 역전을 피할 수 있습니다.

### Driver 측 affinity hint

```c
const struct cpumask *m = cpumask_of(2);
irq_set_affinity_hint(irq, m);
```

NIC PMD나 multi-queue device는 자기가 *어디서 처리되면 좋겠는지*를 hint로 제공합니다. irqbalance가 이 hint를 참고합니다.

## 측정 / 성능 비교

Cortex-A72 quad-core 보드에서 RT 루프(SCHED_FIFO 80, busy work)와 eth0 트래픽을 동시에 돌렸을 때입니다.

```text
설정                                          cyclictest p99
기본 (irqbalance, IRQ가 RT 코어에도 진입)     180 µs
isolcpus=2,3 + irqaffinity=0-1                12 µs
isolcpus=2,3 + irqaffinity=0-1 + RT thread    8 µs
```

x86 서버에서 NIC RSS를 활용했을 때입니다.

```text
설정                                          throughput  CPU
single queue, CPU0 IRQ                        4.1 Gbps    CPU0 100%
RSS 8 queue, 8 코어에 분배                    9.6 Gbps    CPU 평균 22%
```

RT 시나리오에서는 단순히 IRQ를 옮기는 것만으로 p99가 10배 이상 좋아질 수 있고, throughput 시나리오에서는 분산만으로 line rate가 가까워집니다.

## 자주 보는 함정

> irqbalance가 manual 설정을 덮어씀

```bash
echo 2 > /proc/irq/23/smp_affinity
# 몇 초 뒤
cat /proc/irq/23/smp_affinity
# 1   ← irqbalance가 되돌림
```

irqbalance를 끄거나 ban 목록을 명시해야 manual 설정이 유지됩니다.

> isolcpus만 두고 IRQ는 그대로

```text
isolcpus=2,3                # IRQ는 여전히 어디든 갈 수 있음
```

`irqaffinity=`를 함께 지정하지 않으면 격리한 코어에 일반 IRQ가 그대로 들어옵니다. cmdline 한 줄을 빼먹지 않도록 주의합니다.

> Hyperthread sibling 무시

```text
# CPU 0,1이 같은 코어의 sibling이라면
# IRQ를 0번에, RT task를 1번에 두면 사실상 같은 자원 경합
```

`/sys/devices/system/cpu/cpu0/topology/thread_siblings_list`로 sibling 관계를 확인하고, 가능하면 RT task와 IRQ는 *완전히 다른 물리 코어*에 둡니다.

> All-CPU mask = 사실상 affinity 없음

```bash
echo f > /proc/irq/23/smp_affinity   # 0xf = CPU 0~3 전부
```

bitmask가 모든 코어를 포함하면 의미 있는 pinning이 아닙니다. 명확한 단일 코어 또는 좁은 mask를 지정합니다.

> Core hotplug 후 affinity 손실

```bash
echo 0 > /sys/devices/system/cpu/cpu1/online
echo 1 > /sys/devices/system/cpu/cpu1/online
# IRQ affinity가 초기값으로 돌아갈 수 있음
```

hotplug나 suspend/resume 후에는 affinity를 다시 적용하는 systemd unit이나 init 스크립트를 두는 편이 안전합니다.

## 정리

- `/proc/irq/N/smp_affinity`는 IRQ를 어느 코어에 보낼지 결정하는 가장 기본적인 도구입니다.
- irqbalance는 일반 server에 유용하지만 manual 설정과 충돌하므로 RT 환경에서는 보통 끕니다.
- isolcpus는 cmdline 한 줄로 코어를 격리하고, `irqaffinity=`를 함께 두어야 IRQ까지 격리됩니다.
- NIC는 RSS로 RX queue를 늘리고 각 queue의 IRQ를 다른 코어에 매핑하면 throughput과 latency가 동시에 좋아집니다.
- PREEMPT_RT는 IRQ를 thread로 변환하므로 `chrt`·`taskset`으로 priority와 affinity를 별도로 조정합니다.
- Hyperthread sibling, all-CPU mask, hotplug 직후 설정 손실은 가장 흔한 함정입니다.
- 측정은 cyclictest와 `/proc/interrupts` 카운트 비교가 가장 명확합니다.

Modern Embedded Recipes **Part 4**는 여기까지입니다.

## 관련 항목

- [4-05: sysfs](/blog/embedded/modern-recipes/part4-05-sysfs)
- [PE 3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [RTOS 5-07: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
