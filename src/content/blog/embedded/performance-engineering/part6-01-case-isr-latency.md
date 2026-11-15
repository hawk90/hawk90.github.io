---
title: "사례 분석 — ISR latency deadline miss 진단 절차"
slug: "embedded/performance-engineering/part6-01-case-isr-latency"
date: 2026-04-28T09:00:00
description: "산업용 센서 보드의 지연 사례를 바탕으로 irqsoff가 측정하는 범위와 IRQ affinity·threaded IRQ 검증 절차를 설명합니다."
series: "Embedded Performance Engineering"
seriesOrder: 50
tags: [case-study, isr, latency, ftrace, irq]
topics: ["embedded"]
---

## 한 줄 요약

> **"평균 지연이 짧아도 deadline miss가 발생할 수 있습니다. IRQ 비활성 구간과 end-to-end 지연을 따로 측정합니다."**

## 증상 — 보고된 문제

산업용 진동 센서 보드에서 사용 현장에서 산발적인 데이터 드롭이 보고됐습니다.

이 절의 장치 사양·latency·trace·Before/After 숫자는 원시 로그나 보드 정보가 없어 재현된 사례로 확인하지 않았습니다. 아래는 진단 절차를 설명하는 시나리오입니다.

| 항목 | 값 |
|------|-----|
| HW | Cortex-A53 quad-core, Linux 5.10, PREEMPT |
| 센서 | vibration sensor, 10 kHz sampling |
| 요구 | sample → user buffer 전달 deadline 100 µs |
| SLA | 99.99% 만족 |

현장 보고 내용은 다음과 같았습니다.

- 평균 latency는 25 µs로 여유가 충분했습니다.
- 그런데도 시간당 수십 회 deadline miss가 발생했습니다.
- 미스가 나면 latency가 200~500 µs까지 spike했습니다.
- 재현 시점이 일정하지 않았습니다.

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

**가설 1만으로는 설명되지 않음**: 짧은 mpstat 표본은 순간 CPU 평균을 보여 줄 뿐, deadline miss의 원인을 배제하지 않습니다.

## 가설 2 — 다른 IRQ가 CPU를 점유

다음으로 살펴볼 것은 IRQ 비활성 구간입니다. Linux에서 hard IRQ가 실행된다는 사실만으로 같은 코어의 모든 IRQ가 계속 막히는 것은 아닙니다. `irqsoff`는 IRQ가 비활성화된 구간의 길이를 추적하며, 이 값은 센서 IRQ의 end-to-end 지연과 같은 측정치가 아닙니다. (출처: [Linux ftrace 문서](https://docs.kernel.org/trace/ftrace.html))

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

아래 값은 설명을 위한 예시이며, 해당 보드에서 수집한 로그가 아닙니다. 실제 `irqsoff` 최댓값은 관찰 구간에서 IRQ가 비활성화되어 있던 최장 시간입니다. 이 값만으로 센서 샘플에서 user buffer까지의 deadline 만족 여부나 다른 IRQ handler의 실행 시간을 판정할 수는 없습니다.

`trace` 파일을 열어 어느 함수가 IRQ를 그렇게 오래 막았는지 확인합니다.

```text
# tracer: irqsoff
# irqsoff latency trace v1.x on <kernel-version>
# latency: <measured-us> us, #<entries>/<entries>, CPU#<cpu>
# => started at: <function with local IRQs disabled>
# => ended at:   <function restoring local IRQ state>
# <trace rows depend on kernel, configuration, and enabled options>
```

실제 추적에서 시작·종료 함수가 SD 카드 경로와 겹친다면 후속 조사 단서로 삼을 수 있습니다. 이 예시에는 원본 trace, 커널 버전, 동시 센서 지연 표본이 없으므로 SD 카드가 원인이었다거나 로그 flush와 deadline miss가 일치했다고 결론 내릴 수 없습니다.

**판정 보류**: IRQ 비활성 구간은 측정 대상이지만, 이 예시 자료만으로 실제 원인을 확정할 수 없습니다.

## 원인 후보 — 진단에 필요한 증거

원인을 확정하려면 대상 커널의 SDHCI 구현과 trace를 함께 확인해야 합니다. 아래 코드는 처리 시간이 측정된 실제 Linux 구현이 아니라 흐름을 단순화한 예시입니다.

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

`irqsoff` trace가 이 코드의 handler duration이나 모든 IRQ의 차단 시간을 뜻하지는 않습니다. IRQ masking·nesting·controller 동작은 아키텍처와 드라이버에 따라 달라집니다.

IRQ 비활성 구간과 센서 지연의 연관성을 확인한 뒤 다음 두 조치를 비교할 수 있습니다.

1. SD 카드 IRQ를 다른 코어로 격리
2. SD 카드 핸들러를 threaded IRQ로 전환해 짧게 만들기

두 가지는 후보 조치이며, 보드에서 적용·측정하지 않았습니다. affinity 변경도 실제 IRQ 배치와 제약을 확인한 뒤 평가해야 합니다.

## 해결 — IRQ Affinity와 Threaded IRQ

다음은 센서와 SD 카드 IRQ를 다른 코어에 배치하는 명령 예시입니다. 실제 IRQ 번호·허용 CPU·effective affinity와 irqbalance의 영향을 먼저 확인합니다.

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

다음은 검토할 수 있는 threaded IRQ 구성 예시입니다. 이 보드에서 옵션을 활성화하거나 성능을 측정하지 않았습니다.

```bash
# 커널 부팅 파라미터 예시
threadirqs
```

```c
/* 드라이버 구현 예시 */
request_threaded_irq(irq, sdhci_irq, sdhci_thread_irq,
                     IRQF_SHARED, "mmc0", host);
```

드라이버는 장치별 acknowledge/mask 요구사항에 맞춰 primary handler를 구현해야 합니다. `request_threaded_irq()`의 primary handler가 `IRQ_WAKE_THREAD`를 반환하면 `thread_fn`이 실행되는 형태입니다. thread 전환만으로 센서 지연이 줄거나 우선순위가 보장되는 것은 아닙니다. (출처: [Linux generic IRQ 문서](https://docs.kernel.org/core-api/genericirq.html))

아래 histogram은 IRQ entry 횟수를 세는 예시일 뿐 latency를 측정하지 않습니다. latency 분석에는 tracer의 정의에 맞는 별도 측정과 end-to-end timestamp가 필요합니다.

```bash
echo 'hist:keys=common_pid:vals=hitcount:sort=hitcount' \
    > /sys/kernel/debug/tracing/events/irq/irq_handler_entry/trigger
```

## 검증 — Before / After

다음 값은 형식 예시이며, 실측 결과가 아닙니다. max latency가 100 µs 미만인 표본 전체에서 miss rate가 0보다 크다고 표기하면 모순이므로, 실제 보고서에는 같은 표본·같은 latency 정의의 원시 분포를 기록해야 합니다.

| 지표 | Before | After |
|---|---|---|
| Avg latency | 25 µs | 22 µs |
| P99 latency | 85 µs | 41 µs |
| P999 latency | 240 µs | 58 µs |
| Max latency | 512 µs | 78 µs |
| Deadline miss rate (>100 µs) | 0.12% | 0% |
| SLA 99.99% | 미달 | 표본에서 충족* |

\* 예시의 표본 범위에서만 성립하며, 장기 보장이나 실제 보드 결과를 뜻하지 않습니다.

이 예시 표에서는 max와 miss-rate 정의가 일치합니다. 실제 적용 시에는 표본 수, 측정 경계, 계측 오버헤드, 실행 커널을 함께 공개해야 합니다.

원문에 적힌 SD 카드 throughput 약 5% 감소도 측정 조건과 원시 기록이 없어 확인할 수 없습니다.

## 교훈

이번 사례에서 배운 것을 정리합니다.

- **평균과 꼬리 지연을 함께 봅니다**. 평균은 전체 경향에, percentile과 관측 최댓값은 deadline 초과를 조사하는 데 유용합니다. 관측 최댓값은 모든 실행의 최악 시간 상한을 증명하지 않습니다.
- **IRQ 비활성 구간은 IRQ 응답에 영향을 줄 수 있습니다**. 장치 handler의 실행 시간과 local IRQ disable 구간을 구분해 관찰합니다.
- **`irqsoff`는 IRQ 비활성 시간을 보여 줍니다**. IRQ handler 실행 시간이나 end-to-end latency를 대신 측정하지 않으므로 질문에 맞는 tracer를 선택합니다.
- **IRQ affinity를 비교 실험합니다**. 지원되는 IRQ에 한해 CPU 배치를 바꿔 지연과 처리량을 함께 확인합니다.
- **Threaded IRQ는 실행 맥락을 바꿉니다**. 장치별 인터럽트 처리 계약을 지키고 실제 지연·처리량을 다시 측정해야 합니다.
- **가설을 별도 증거로 검증합니다**. CPU 평균 부하만으로 순간 지연의 원인을 기각하지 않고 동시 trace와 timestamp를 비교합니다.

가장 중요한 교훈은 "평균이 OK라도 안심하면 안 된다"입니다. hard deadline과 percentile SLO를 구분하고, 측정 경계·표본 수·관측 기간을 요구사항에 맞춰 정해야 합니다.

다음 사례에서는 [행렬 곱의 메모리 접근 패턴](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)을 조사합니다.

## 관련 항목

- [6-02: Cache Thrashing 사례](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)
- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-03: ftrace와 IRQ 비활성 구간](/blog/embedded/performance-engineering/part5-03-ftrace)
