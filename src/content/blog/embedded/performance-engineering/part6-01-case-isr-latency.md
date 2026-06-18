---
title: "실전 사례 — ISR Latency 100µs Deadline Miss 추적"
date: 2026-04-28T09:00:00
description: "산업용 센서 보드에서 산발적으로 발생한 ISR latency spike. 가설 두 개를 거쳐 SD 카드 드라이버를 범인으로 확정한 과정."
series: "Embedded Performance Engineering"
seriesOrder: 50
tags: [case-study, isr, latency, ftrace, irq]
---

## 한 줄 요약

> **"평균은 멀쩡한데 0.1%가 deadline을 놓친다 — 범인은 같은 코어를 잠시 점유한 다른 IRQ 핸들러였습니다."**

## 증상 — 보고된 문제

산업용 진동 센서 보드에서 사용 현장에서 산발적인 데이터 드롭이 보고됐습니다.

```text
HW: Cortex-A53 quad-core, Linux 5.10, PREEMPT
센서: vibration sensor, 10 kHz sampling
요구: sample → user buffer 전달 deadline 100 µs
SLA: 99.99% 만족

현장 보고:
  - 평균 latency 25 µs (여유 충분)
  - 그러나 시간당 수십 회 deadline miss
  - 미스 발생 시 latency 200~500 µs까지 spike
  - 재현 시점이 일정하지 않음
```

평균은 한참 여유였지만 worst case가 spec을 깨고 있었습니다. 평균 metric만 보면 절대 발견할 수 없는 형태의 문제입니다.

## 가설 1 — CPU 부하 과다

처음 의심한 것은 시스템 CPU 부하였습니다. 다른 프로세스가 CPU를 점유해 ISR이 늦게 처리되는 그림입니다.

```bash
mpstat -P ALL 1

# 12:30:01  CPU   %usr   %nice   %sys  %iowait  %irq  %soft  %idle
# 12:30:02  all   18.5    0.0    7.2     0.5    0.3   1.1   72.4
# 12:30:02    0   22.0    0.0    8.0     0.0    0.5   2.1   67.4
# 12:30:02    1   17.2    0.0    7.0     1.0    0.2   0.8   73.8
# 12:30:02    2   18.0    0.0    7.5     0.5    0.3   0.9   72.8
# 12:30:02    3   17.0    0.0    6.5     0.3    0.2   0.6   75.4
```

전 코어 평균 idle 70% 이상. CPU는 충분히 여유가 있었습니다.

`top`에서도 CPU 사용량이 높은 프로세스는 보이지 않았고, 우리 사용자 데몬과 시스템 서비스 모두 5% 이하였습니다.

**가설 1 기각**: CPU 부하가 원인이 아닙니다.

## 가설 2 — 다른 IRQ가 CPU를 점유

다음으로 의심한 것은 다른 IRQ 핸들러였습니다. Linux에서 한 IRQ가 처리되는 동안 같은 코어의 다른 IRQ는 막힙니다. 누군가가 IRQ disabled section을 길게 쥐고 있다면 우리 센서 IRQ는 그만큼 늦게 처리됩니다.

이 가설은 `irqsoff` tracer로 직접 측정할 수 있습니다.

```bash
# IRQ disabled 구간을 길이 순으로 추적
echo 0 > /sys/kernel/debug/tracing/tracing_max_latency
echo irqsoff > /sys/kernel/debug/tracing/current_tracer
echo 1 > /sys/kernel/debug/tracing/tracing_on

# 10분 가동 후
cat /sys/kernel/debug/tracing/tracing_max_latency
# 312
```

312 µs. ISR이 막힐 수 있는 최대 시간이 312 µs라는 뜻입니다. 우리 deadline 100 µs로는 절대 만족이 불가능한 수치였습니다.

`trace` 파일을 열어 어느 함수가 IRQ를 그렇게 오래 막았는지 확인합니다.

```text
# tracer: irqsoff
#
# tracing_max_latency: 312 us, # at: <ffffffc010234abc>
#  => sdhci_irq_handler+0x18/0x180 [sdhci]
#  => __handle_irq_event_percpu+0x60/0x1c0
#  => handle_irq_event+0x40/0x90
#  => handle_fasteoi_irq+0xc4/0x180
#
#  CPU#: 1
#  Pid: 0 (swapper/1)
#
#  =>      0us : sdhci_irq_handler
#  =>     50us : sdhci_data_irq
#  =>    180us : sdhci_finish_data
#  =>    280us : sdhci_request_done
#  =>    312us : irq_exit
```

SD 카드 컨트롤러의 IRQ 핸들러가 312 µs 동안 IRQ를 막고 있었습니다. SD 카드는 시스템 로그를 주기적으로 쓰는 곳이었고, 로그 flush 타이밍이 우리 deadline miss와 정확히 일치했습니다.

**가설 2 확정**: SD 카드 IRQ 핸들러가 범인입니다.

## 원인 — 진단 확정

소스를 보니 `sdhci_irq_handler`가 데이터 전송 완료 후 다음 작업을 IRQ context에서 모두 처리하고 있었습니다.

```c
/* 간략화한 흐름 */
irqreturn_t sdhci_irq_handler(int irq, void *dev)
{
    spin_lock(&host->lock);

    if (intmask & SDHCI_INT_DATA_END) {
        sdhci_data_irq(host);            /* ~50 µs */
        sdhci_finish_data(host);         /* ~130 µs */
        sdhci_request_done(host);        /* ~100 µs */
    }

    spin_unlock(&host->lock);
    return IRQ_HANDLED;
}
```

IRQ가 disabled된 채 약 300 µs 동안 모든 후처리가 진행되고 있었습니다. 같은 코어에 우리 센서 IRQ가 도착하면 이 작업이 끝날 때까지 무조건 대기해야 했습니다.

원인이 분명해지자 해결책은 두 갈래로 나뉘었습니다.

1. SD 카드 IRQ를 다른 코어로 격리
2. SD 카드 핸들러를 threaded IRQ로 전환해 짧게 만들기

두 가지 모두 적용했습니다.

## 해결 — IRQ Affinity와 Threaded IRQ

먼저 SD 카드 IRQ를 우리 센서가 쓰지 않는 코어로 옮겼습니다.

```bash
# 센서 IRQ 번호 확인
grep sensor /proc/interrupts
# 142:  ...  vibration_sensor

# SD 카드 IRQ 번호 확인
grep mmc /proc/interrupts
# 89:   ...  mmc0

# 센서는 코어 0, SD는 코어 3으로 고정
echo 1 > /proc/irq/142/smp_affinity
echo 8 > /proc/irq/89/smp_affinity
```

다음으로 SD 카드 드라이버의 threaded IRQ 옵션을 활성화했습니다. 최소한의 ack만 IRQ context에서 처리하고, 나머지는 커널 thread에서 일반 스케줄로 돌리는 방식입니다.

```c
/* 커널 부팅 파라미터 */
threadirqs

/* 또는 드라이버 자체에서 */
request_threaded_irq(irq, sdhci_irq, sdhci_thread_irq,
                     IRQF_SHARED, "mmc0", host);
```

ISR에서는 SDHCI 상태 register만 읽고 인터럽트 소스를 마스킹한 뒤 즉시 반환합니다. 데이터 후처리는 thread context에서 일반 우선순위로 처리되므로 다른 IRQ를 막지 않습니다.

마지막으로 측정 결과를 검증할 수 있도록 ftrace histogram을 상시 켰습니다.

```bash
echo 'hist:keys=common_pid:vals=hitcount:sort=hitcount' \
    > /sys/kernel/debug/tracing/events/irq/irq_handler_entry/trigger
```

## 검증 — Before / After

10분 동안 deadline 만족률을 측정했습니다.

| 지표 | Before | After |
|---|---|---|
| Avg latency | 25 µs | 22 µs |
| P99 latency | 85 µs | 41 µs |
| P999 latency | 240 µs | 58 µs |
| Max latency | 512 µs | 78 µs |
| Deadline miss rate | 0.12% | 0.0001% |
| SLA 99.99% | 미달 | 충족 |

평균은 거의 변하지 않았지만 worst case가 절반 이하로 떨어졌습니다. SLA 99.99% deadline 100 µs를 안정적으로 만족하게 됐습니다.

추가로 SD 카드 throughput은 약 5% 감소했지만, 시스템 로깅 용도였으므로 문제가 되지 않았습니다.

## 교훈

이번 사례에서 배운 것을 정리합니다.

- **평균은 거짓말입니다**. RT 시스템에서는 P99, P999, max만 의미 있습니다. `perf stat`처럼 누적 metric만 보면 worst case 문제는 보이지 않습니다.
- **ISR은 공유 자원입니다**. 한 핸들러가 길게 IRQ를 disabled 상태로 두면 같은 코어의 다른 모든 IRQ가 영향을 받습니다.
- **`irqsoff` tracer는 강력합니다**. "어디서 IRQ가 막혔는지"를 직접 보여 주는 거의 유일한 도구이며, 이런 산발적 문제에 처음 꺼낼 카드입니다.
- **IRQ affinity로 격리**. RT critical IRQ는 다른 시끄러운 IRQ와 코어를 분리하는 것이 정석입니다.
- **Threaded IRQ는 비용을 분산**. 무거운 후처리를 thread context로 옮기면 IRQ disabled 시간을 짧게 유지할 수 있습니다.
- **가설을 측정으로 끝까지 검증**. 첫 가설(CPU 부하)이 빨리 기각된 것이 다음 가설로 빠르게 넘어갈 수 있게 했습니다.

가장 중요한 교훈은 "평균이 OK라도 안심하면 안 된다"입니다. RT 시스템의 SLA는 worst case로 정의되므로, 측정 도구도 worst case를 보여 주는 것을 골라야 합니다.

## 관련 항목

- [6-02: Cache Thrashing 사례](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)
- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [Practical RTOS Internals 2-08: Interrupt Latency](/blog/embedded/rtos/practical-internals/part2-08-interrupt-latency)
