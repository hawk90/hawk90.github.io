---
title: "사례 분석 — ISR latency deadline miss 진단 절차"
slug: "embedded/performance-engineering/part6-01-case-isr-latency"
date: 2026-04-28T09:00:00
description: "HVF VM에서 cyclictest로 재현한 IRQ affinity 문제로 irqsoff가 측정하는 범위와 IRQ affinity·threaded IRQ 검증 절차를 설명합니다."
series: "Embedded Performance Engineering"
seriesOrder: 50
tags: [case-study, isr, latency, ftrace, irq]
topics: ["embedded"]
---

## 한 줄 요약

> **"평균 지연이 짧아도 deadline miss는 납니다. 꼬리 분포를 재고, 그 꼬리를 만드는 IRQ가 *어느 CPU에서* 처리되는지 확인합니다."**

## 증상 — 재현한 문제

산업용 진동 센서 보드처럼 10 kHz로 샘플을 받는 시스템을 생각해 봅니다. 샘플 하나당 처리 예산은 100 µs입니다. 그런 보드에서 "평균은 여유 있는데 가끔 샘플이 빠진다"는 보고가 들어왔다고 가정해 봅니다. 다만 이 글은 남의 보드 로그를 옮기지 않고, 같은 모양의 문제를 직접 만들어 측정했습니다.

재현 환경은 다음과 같습니다. 진짜 센서 대신 `cyclictest`가 100 µs 주기로 깨어나며, 예정 시각보다 얼마나 늦게 깨어났는지를 기록합니다. 이 값이 "샘플이 user 공간에 도착하기까지의 지연"을 대신합니다. 샘플을 제때 받는 일을 정시 출발 버스에 빗대면, `cyclictest`는 버스가 정류장에 몇 분 늦게 왔는지를 매번 적는 사람입니다.

| 항목 | 값 |
|------|-----|
| Host | Apple M2 Pro, macOS, QEMU 11.1.3 `-M virt -accel hvf -cpu host` (8 vCPU, 8 GiB) |
| Guest | Debian 13 arm64, kernel `6.12.116+deb13-arm64` (`CONFIG_PREEMPT_VOLUNTARY=y`, `CONFIG_HZ=250`) |
| "센서" | `cyclictest` V 2.60, SCHED_FIFO 95, CPU0 고정, 100 µs 주기, 20초(약 200,000 표본) |
| Deadline | 100 µs 초과 = miss |
| 방해 부하 | host의 HTTP 서버에서 1 GiB 파일을 반복 다운로드(`curl`, CPU5 고정). 수신 IRQ는 virtio-net(`virtio0`, IRQ 46) |
| 반복 | idle / IRQ를 CPU0에 / IRQ를 CPU3에, 세 조건을 한 라운드로 묶어 10라운드 |

측정 스크립트는 다음과 같습니다. 조건마다 IRQ 46의 affinity를 바꾸고, 다운로드를 CPU5에서 돌리면서 CPU0의 `cyclictest` 히스토그램을 받습니다.

```bash
# isr-exp.sh <idle|load-cpu0|load-cpu3> <round> (발췌, $out = 결과 파일 접두어)
case $sc in
  load-cpu0) echo 0 > /proc/irq/46/smp_affinity_list ;;
  load-cpu3) echo 3 > /proc/irq/46/smp_affinity_list ;;
esac
cat /proc/irq/46/effective_affinity_list > $out.eff
[ $sc != idle ] && { ( while :; do taskset -c 5 curl -s -o /dev/null http://10.0.2.2:8766/big; done ) & }
mpstat -P 0,3 -u -I SUM 5 1 > $out.mpstat &
cyclictest -m -p 95 -t 1 -a 0 -i 100 -D 20 -q -h 5000 > $out.hist
```

부하는 CPU5에서만 돌고 `cyclictest`는 CPU0에 있습니다. 그런데도 IRQ 46이 CPU0으로 가 있으면 결과가 크게 나빠졌습니다. 10라운드의 중앙값은 다음과 같습니다.

| 조건 | 평균 | p50 | p99 | p99.9 | 100 µs 초과(20초당) |
|---|---|---|---|---|---|
| idle | 32 µs | 25 µs | 139.5 µs | 792 µs | 2,917 |
| 다운로드 + IRQ 46 → CPU0 | 38.5 µs | 30 µs | 159 µs | 573.5 µs | 5,606 |
| 다운로드 + IRQ 46 → CPU3 | 32.5 µs | 28.5 µs | 106 µs | 337 µs | 2,015.5 |

10라운드의 표본을 모두 합치면 100 µs를 넘은 비율은 idle 2.07%, IRQ가 CPU0일 때 5.84%, CPU3일 때 2.30%입니다. 같은 라운드 안에서 비교하면 IRQ를 CPU0에 둔 쪽이 10번 중 9번 더 나빴습니다. 예외인 5라운드는 CPU3 쪽 로그가 VM 재부팅(다른 작업이 일으킨 guest panic)으로 사라져 다른 시간대에 다시 돌린 값이라 짝이 맞지 않습니다.

평균만 보면 32 µs와 38.5 µs로, 100 µs 예산 안에서 여유가 있어 보입니다. 하지만 deadline을 넘긴 샘플 수는 두 배 가까이 차이 납니다. **평균은 이 문제를 보여 주지 못합니다.**

> ⚠️ **VM의 꼬리는 host가 만듭니다.** 아무 부하가 없는 idle에서도 최대 지연이 라운드마다 4,075 µs ~ 36,002 µs로 튀었습니다. 측정 직후 확인했을 때 같은 Mac에서 이 guest를 포함해 QEMU 프로세스가 8개 돌고 있었습니다. guest 안에는 부하가 없었고, 이 꼬리의 원인은 이 글에서 따로 확인하지 않았습니다. 그래서 이 글에서는 *최댓값*으로 결론을 내리지 않고, 중앙값과 100 µs 초과 개수를 비교합니다. VM 바깥의 잡음이 없는 실제 보드라면 최댓값도 분석 대상이 됩니다.

## 가설 1 — CPU 부하 과다

처음 의심할 것은 CPU 부하입니다. 다른 프로세스가 CPU를 점유해 처리가 늦어진다는 그림입니다. 다운로드 중 `mpstat`(sysstat 12.7.5)의 5초 표본을 보면 이 가설이 왜 헷갈리는지 알 수 있습니다.

```text
09:40:53     CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest  %gnice   %idle
09:40:58       0    1.00    0.00    1.34    0.00    0.00   62.37    0.00    0.00    0.00   35.28
09:40:58       3    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00  100.00

09:40:53     CPU    intr/s
09:40:58       0  22424.15
09:40:58       3     13.97
```

CPU0의 `%usr`는 1%입니다. 이 CPU에서 사용자 프로세스는 거의 돌지 않습니다. 대신 `%soft`가 62%이고, 모든 인터럽트를 합쳐 초당 22,424번을 받고 있습니다. 10라운드의 CPU0 `%soft` 중앙값은 IRQ가 CPU0일 때 58.5%, CPU3일 때 11.3%였습니다.

8개 CPU 전체 평균만 보면 CPU0의 62%는 8분의 1로 희석되어 7.8%포인트밖에 되지 않습니다. 비유하면 사무실 전체 출근율은 정상인데 한 사람 책상에만 전화가 몰리는 상황입니다. **CPU별로, 그리고 `%usr`와 `%soft`를 나눠서 봐야 합니다.**

어떤 소프트IRQ인지는 같은 다운로드를 따로 돌리며 `/proc/softirqs`의 5초 차이로 확인했습니다(`cyclictest` 없이). 수신 처리(`NET_RX`)가 IRQ를 받은 CPU에서 그대로 돕니다.

```text
== IRQ46 -> CPU0
NET_RX:    cpu0=58506 cpu3=0 cpu5=0
== IRQ46 -> CPU3
NET_RX:    cpu0=0 cpu3=47215 cpu5=0
```

이 guest는 RPS가 꺼져 있었습니다(`rps_cpus`가 `00`). [Documentation/networking/scaling.rst](https://elixir.bootlin.com/linux/v6.12/source/Documentation/networking/scaling.rst)는 `rps_cpus`가 0(기본값)이면 패킷을 인터럽트를 받은 CPU에서 처리한다고 적습니다. 같은 문서가 RSS·RPS로 이 처리를 여러 CPU에 나누는 방법을 다루고, CPU별 부하는 `mpstat`로 보라고 권합니다. 다만 IRQ를 CPU3으로 옮긴 뒤에도 CPU0의 `%soft`가 11.3% 남은 이유는 이 글에서 확인하지 못했습니다. 그 조건에서 CPU0의 `NET_RX`는 0회였습니다.

**가설 1 기각**: 전체 CPU 사용률은 낮았지만, 지연을 만든 것은 CPU0 한 곳의 IRQ·소프트IRQ 처리였습니다.

## 가설 2 — IRQ 비활성 구간

다음 후보는 "누군가 IRQ를 오래 꺼 둔다"는 가설입니다. 이 가설을 재는 도구는 ftrace의 `irqsoff` tracer입니다. [ftrace 문서](https://elixir.bootlin.com/linux/v6.12/source/Documentation/trace/ftrace.rst)는 이 tracer가 인터럽트가 꺼져 있던 시간을 추적하고, 최대값이 갱신될 때 그 직전의 trace를 저장한다고 설명합니다. 즉 `irqsoff`가 재는 것은 *IRQ가 꺼져 있던 구간*이지, 샘플이 user 공간에 도착하기까지의 end-to-end 지연이 아닙니다.

그런데 이 guest에서는 `irqsoff`를 쓸 수 없었습니다.

```text
$ cat /sys/kernel/tracing/available_tracers
blk function_graph function nop
$ grep -E 'CONFIG_IRQSOFF_TRACER|CONFIG_IRQ_FORCED_THREADING' /boot/config-6.12.116+deb13-arm64
CONFIG_IRQ_FORCED_THREADING=y
# CONFIG_IRQSOFF_TRACER is not set
```

`IRQSOFF_TRACER`는 [kernel/trace/Kconfig](https://elixir.bootlin.com/linux/v6.12/source/kernel/trace/Kconfig#L346)에서 `default n`이고, Debian 배포판 커널은 이 옵션을 켜지 않았습니다. 양산 보드에서 이 tracer로 진단하려면 먼저 그 커널의 설정에 이 옵션이 있는지 확인하고, 없으면 켠 커널을 따로 빌드합니다. 이 글에서는 커널을 다시 빌드하지 않았으므로 IRQ 비활성 구간은 측정하지 않았습니다.

대신 앞의 실험이 질문을 더 직접 답합니다. 방해 부하를 그대로 두고 IRQ의 CPU만 바꿨을 때 100 µs 초과가 5,606에서 2,015.5로 줄었습니다. 원인 후보가 "CPU0이 받는 IRQ와 그 뒤의 소프트IRQ"로 좁혀집니다.

## 원인 — IRQ와 소프트IRQ가 측정 대상 CPU에 몰림

정리하면 다음과 같습니다.

1. virtio-net의 IRQ 46은 아무것도 바꾸지 않은 첫 idle 라운드에서 `effective_affinity_list`가 `0`이었습니다. 실제로 CPU0 한 곳만 이 IRQ를 받았습니다. 이 guest에는 `irqbalance`도 돌지 않았습니다.
2. 다운로드 중 CPU0은 초당 약 22,000번 인터럽트를 받고, `NET_RX` 소프트IRQ를 돌리느라 시간의 절반 이상을 썼습니다.
3. SCHED_FIFO 95로 돌던 `cyclictest`도 IRQ와 소프트IRQ 처리가 끝날 때까지 기다려야 했고, 100 µs 초과가 늘었습니다.

`cyclictest`가 RT 우선순위를 갖고 있어도 이 문제를 피하지 못한 이유가 여기 있습니다. 이 커널은 IRQ handler를 스레드로 돌리지 않으므로(`threadirqs` 미사용), hard IRQ는 스케줄러 우선순위와 상관없이 실행됩니다. IRQ가 끝나는 시점에 바로 도는 소프트IRQ도 마찬가지입니다. [kernel/softirq.c](https://elixir.bootlin.com/linux/v6.12/source/kernel/softirq.c#L541)의 `handle_softirqs()`는 대기 중인 소프트IRQ를 한 바퀴 다 처리한 *뒤에야* `need_resched()`·시간 제한(`MAX_SOFTIRQ_TIME`은 `msecs_to_jiffies(2)`라 `HZ=250`인 이 커널에서는 1 jiffy, 곧 4 ms)·재시작 횟수(10회)를 검사하고, 남은 일을 `ksoftirqd` 스레드로 넘깁니다. 그 한 바퀴 동안은 깨어난 RT 태스크도 기다립니다.

## 해결 — IRQ Affinity와 Threaded IRQ

첫 번째 해결은 앞의 실험에서 이미 쓴 IRQ affinity입니다. [Documentation/core-api/irq/irq-affinity.rst](https://elixir.bootlin.com/linux/v6.12/source/Documentation/core-api/irq/irq-affinity.rst)에 따르면 `/proc/irq/<N>/smp_affinity_list`는 그 IRQ가 갈 수 있는 CPU 목록입니다. 실제로 어느 CPU가 받는지는 읽기 전용 `effective_affinity_list`로 확인합니다([kernel/irq/proc.c](https://elixir.bootlin.com/linux/v6.12/source/kernel/irq/proc.c#L385)).

```bash
grep virtio0 /proc/interrupts            # IRQ 번호 확인 (이 guest에서는 46)
echo 3 > /proc/irq/46/smp_affinity_list  # 측정 대상 CPU0에서 떼어 냄
cat /proc/irq/46/effective_affinity_list # 3
```

모든 IRQ를 이렇게 옮길 수 있지는 않습니다. 같은 guest의 virtio-blk 큐 IRQ(`virtio1-req.0`, IRQ 52)는 쓰기 자체가 거부됐습니다.

```text
$ ls -l /proc/irq/52/smp_affinity
-r--r--r-- 1 root root 0 Nov 16 10:01 /proc/irq/52/smp_affinity
$ echo 3 > /proc/irq/52/smp_affinity_list
bash: line 1: echo: write error: Operation not permitted
```

이 큐 IRQ는 커널이 CPU별로 배치를 관리하는 *managed interrupt*입니다. `kernel/irq/manage.c`의 [`irq_can_set_affinity_usr()`](https://elixir.bootlin.com/linux/v6.12/source/kernel/irq/manage.c#L173)가 managed IRQ에 false를 돌려주고, [`kernel/irq/proc.c`](https://elixir.bootlin.com/linux/v6.12/source/kernel/irq/proc.c#L142)는 그 경우 `-EPERM`을 반환합니다. 파일 권한에 쓰기 비트가 없는 것도 같은 함수 때문입니다. 이런 IRQ를 측정 대상 CPU에서 떼어 내려면 부팅 파라미터 `isolcpus=managed_irq,<cpu>`를 씁니다. [kernel-parameters.txt](https://elixir.bootlin.com/linux/v6.12/source/Documentation/admin-guide/kernel-parameters.txt)는 이 격리가 best effort라고 적습니다. 큐의 affinity mask에 housekeeping CPU가 함께 있을 때만 효과가 있습니다. 같은 문서는 `isolcpus` 자체에 "Deprecated - use cpusets instead"를 달아 두었으므로, 스케줄링 격리는 cpuset으로 하고 managed IRQ 격리에만 이 플래그를 쓰는 편이 문서의 권고와 맞습니다.

두 번째 후보는 threaded IRQ입니다. 드라이버가 [`request_threaded_irq()`](https://elixir.bootlin.com/linux/v6.12/source/kernel/irq/manage.c#L2105)로 handler를 둘로 나누면, hard IRQ 문맥의 primary handler는 장치 인터럽트를 확인하고 끈 뒤 `IRQ_WAKE_THREAD`를 반환합니다. 나머지 일은 `thread_fn`이 커널 스레드에서 합니다. 드라이버를 고치지 않고 전체에 적용하려면 부팅 파라미터 `threadirqs`를 씁니다. 이 파라미터는 `IRQF_NO_THREAD`가 없는 모든 handler를 강제로 스레드화합니다. 이 guest의 커널은 `CONFIG_IRQ_FORCED_THREADING=y`라 이 옵션을 받을 수 있습니다.

IRQ 스레드는 `irq_thread()`에서 `sched_set_fifo()`로 SCHED_FIFO가 됩니다([kernel/irq/manage.c](https://elixir.bootlin.com/linux/v6.12/source/kernel/irq/manage.c#L1310)). 일반 스레드처럼 `chrt`로 우선순위를 바꿀 수 있으니 측정 대상 태스크보다 낮게 둘 수도 있습니다. 다만 이 글에서는 `threadirqs`를 켠 실험을 하지 않았습니다. 공유 VM을 다시 부팅해야 했기 때문입니다. 효과가 있는지, 처리량을 얼마나 잃는지는 위 표와 같은 방식으로 다시 재야 합니다.

## 검증 — Before / After

앞의 표에서 "Before"는 IRQ 46이 CPU0에 있는 조건, "After"는 CPU3으로 옮긴 조건입니다. 방해 부하와 측정 방법은 같습니다.

| 지표 (10라운드 중앙값) | Before (IRQ → CPU0) | After (IRQ → CPU3) | 참고: idle |
|---|---|---|---|
| p50 | 30 µs | 28.5 µs | 25 µs |
| p99 | 159 µs | 106 µs | 139.5 µs |
| p99.9 | 573.5 µs | 337 µs | 792 µs |
| 100 µs 초과 / 20초 | 5,606 | 2,015.5 | 2,917 |
| 100 µs 초과 비율 (전 표본) | 5.84% | 2.30% | 2.07% |
| CPU0 `%soft` | 58.5% | 11.3% | 0.0% |

IRQ를 옮긴 뒤의 결과는 idle과 거의 같아졌습니다. 몇몇 지표는 idle보다 좋기까지 한데, 이는 개선 효과가 아니라 잡음입니다. guest에 부하가 없던 idle 2·4·6라운드에서도 100 µs 초과가 4,598~11,775개였습니다. 그래서 **After가 idle 수준까지 돌아왔다**까지만 결론으로 삼습니다.

같은 결과를 SLA로 읽으면 다음과 같습니다. 99.99% 만족이 목표라면 이 VM은 idle에서도 목표를 지키지 못합니다(2.07%가 100 µs 초과). VM에서 할 수 있는 것은 원인을 좁히고 개선 방향을 확인하는 데까지입니다. 최종 SLA 판정은 실제 보드와 실제 커널에서 다시 해야 합니다.

## 교훈

- **평균과 꼬리를 따로 봅니다.** HVF VM에서 잰 평균 32 µs와 38.5 µs는 비슷해 보이지만, deadline 초과는 두 배 가까이 차이 났습니다.
- **CPU 사용률은 CPU별로, 종류별로 봅니다.** 8개 CPU 평균으로는 소프트IRQ 부하가 희석됐습니다. CPU0의 `%soft` 62%가 원인이었습니다.
- **`irqsoff`는 커널 설정부터 확인합니다.** Debian 6.12 커널에는 이 tracer가 없었습니다. 또 이 tracer는 IRQ가 꺼진 구간을 잴 뿐, end-to-end 지연을 재지 않습니다.
- **IRQ affinity는 바꿀 수 있는 IRQ에만 통합니다.** managed IRQ는 `/proc/irq`로 옮길 수 없고(`EPERM`), `isolcpus=managed_irq`가 필요합니다.
- **변수 하나만 바꿔 비교합니다.** 부하와 측정은 그대로 두고 IRQ의 CPU만 바꿨기 때문에 원인을 그 하나로 좁힐 수 있었습니다.
- **VM 측정의 한계를 적습니다.** host가 바쁘면 idle에서도 ms 단위 지연이 생깁니다. 이럴 때는 최댓값 대신 반복 측정의 중앙값과 짝지은 비교를 씁니다.

다음 사례에서는 [행렬 곱의 메모리 접근 패턴](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)을 조사합니다.

## 관련 항목

- [6-02: Cache Thrashing 사례](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)
- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-03: ftrace와 IRQ 비활성 구간](/blog/embedded/performance-engineering/part5-03-ftrace)
