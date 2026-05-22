---
title: "5-03: ftrace 활용 — function·function_graph·latency tracer"
date: 2026-05-08T41:00:00
description: "ftrace의 function tracer, function_graph, irqsoff·preemptoff latency tracer 활용."
series: "Embedded Performance Engineering"
seriesOrder: 42
tags: [ftrace, function-tracer, latency-tracer, trace-cmd]
---

## 한 줄 요약

> **"ftrace는 커널을 다시 컴파일하지 않고 모든 함수 진입과 이탈, 인터럽트 지연을 추적하는 빌트인 도구입니다."**

## 어떤 문제를 푸는가

커널의 어느 함수에서 시간이 새는지, 인터럽트가 얼마나 오래 disable되는지, real-time task가 왜 wake-up이 늦었는지 같은 질문은 perf의 sampling만으로는 답하기 어렵습니다. Sampling은 통계적이며 짧은 spike를 놓칠 수 있기 때문입니다.

ftrace는 GCC의 `-pg`로 모든 커널 함수 앞뒤에 trace hook이 삽입된 상태에서, runtime에 그 hook을 켜고 끄는 방식입니다. 비활성 상태에서는 NOP 두 명령과 같아 거의 zero overhead이며, 활성화 시에만 측정 비용이 발생합니다.

이 글에서는 `/sys/kernel/debug/tracing` 인터페이스, function tracer, function_graph, latency tracer를 다루며, `trace-cmd`와 KernelShark도 짧게 살펴봅니다.

## tracefs 인터페이스

ftrace는 tracefs라는 가상 파일시스템으로 노출됩니다.

```bash
mount -t tracefs nodev /sys/kernel/tracing
cd /sys/kernel/tracing
ls
```

```text
available_tracers       current_tracer   trace
available_events        events           trace_pipe
set_event               set_ftrace_filter set_graph_function
tracing_on              tracing_max_latency
```

기본 사용 패턴은 다음과 같습니다.

```bash
echo function > current_tracer       # tracer 선택
echo 1 > tracing_on                  # 시작
sleep 1
echo 0 > tracing_on                  # 정지
cat trace                            # 결과 확인
```

## Function Tracer — 모든 함수 진입 기록

```bash
cd /sys/kernel/tracing
echo function > current_tracer
echo 1 > tracing_on
sleep 0.1
echo 0 > tracing_on
head trace
```

```text
            <idle>-0     [000]  1234.567: cpuidle_enter <-cpu_startup_entry
            <idle>-0     [000]  1234.567: cpuidle_enter_state <-cpuidle_enter
            <idle>-0     [000]  1234.568: arch_cpu_idle <-cpuidle_enter_state
              app-1234  [001]  1234.568: __schedule <-schedule
              app-1234  [001]  1234.568: pick_next_task <-__schedule
```

너무 많은 함수가 찍히므로 필터를 거는 것이 필수입니다.

```bash
echo 'tcp_*' > set_ftrace_filter         # 'tcp_'로 시작하는 함수만
echo '!nf_*' >> set_ftrace_filter        # 'nf_' 제외
```

## Function Graph Tracer — 호출 그래프와 시간

```bash
echo function_graph > current_tracer
echo do_sys_open > set_graph_function
echo 1 > tracing_on
cat /etc/hostname > /dev/null
echo 0 > tracing_on
cat trace
```

```text
 1)               |  do_sys_open() {
 1)               |    getname() {
 1)   0.234 us    |      kmem_cache_alloc();
 1)   1.456 us    |    }
 1)               |    do_filp_open() {
 1)               |      path_openat() {
 1)   3.123 us    |        link_path_walk();
 1)   5.678 us    |      }
 1)   8.901 us    |    }
 1) + 12.345 us   |  }
```

들여쓰기로 호출 깊이를, 우측의 us 값으로 함수 전체 실행 시간을 보여줍니다. `+`는 10us 이상, `!`는 100us 이상을 표시합니다.

## Latency Tracer — irqsoff·preemptoff·wakeup_rt

Real-time 시스템에서 가장 중요한 metric은 worst-case latency입니다. 평균은 좋아도 한 번의 100us spike가 deadline을 깨면 의미가 없습니다.

```bash
echo irqsoff > current_tracer            # IRQ disable 구간 측정
echo 0 > tracing_max_latency             # 리셋
echo 1 > tracing_on
sleep 10
cat trace
```

```text
# tracer: irqsoff
# latency: 234 us, #20/20, CPU#1
#   -----------------
#   | task: swapper-0 (uid:0 nice:0 policy:0 rt_prio:0)
#   -----------------
#  => started at: __do_softirq
#  => ended at:   net_rx_action
```

| Tracer | 측정 대상 |
|---|---|
| `irqsoff` | 인터럽트가 disable된 가장 긴 구간 |
| `preemptoff` | preemption이 disable된 가장 긴 구간 |
| `preemptirqsoff` | 둘 다 disable된 구간 |
| `wakeup` | 가장 우선순위 높은 task의 wake-up latency |
| `wakeup_rt` | RT task만 대상 |
| `wakeup_dl` | Deadline scheduler task |

`wakeup_rt`는 PREEMPT_RT 커널에서 hardware interrupt부터 RT task가 CPU를 받기까지의 시간을 측정합니다. 자동차나 산업 제어에서 핵심 지표입니다.

## Event Tracing — Tracepoint 직접 활성화

ftrace는 perf와 같은 tracepoint를 공유합니다.

```bash
echo 1 > events/sched/sched_switch/enable
echo 1 > events/irq/irq_handler_entry/enable
echo 1 > tracing_on
sleep 1
echo 0 > tracing_on
cat trace
```

또는 그룹 전체를 한 번에 켤 수 있습니다.

```bash
echo 1 > events/sched/enable             # sched 그룹 전체
echo 1 > events/enable                   # 모든 event (주의)
```

특정 조건만 trace하려면 filter를 사용합니다.

```bash
echo 'prev_pid == 1234' > events/sched/sched_switch/filter
```

## trace-cmd — Wrapper

직접 tracefs를 만지는 대신 `trace-cmd`가 편합니다.

```bash
trace-cmd record -p function_graph -l 'tcp_*' ./app
trace-cmd report                          # 사람이 보기 좋은 포맷
trace-cmd report -O cpu                   # CPU별 정렬
```

생성된 `trace.dat`은 KernelShark로 GUI 시각화도 가능합니다.

```bash
kernelshark trace.dat
```

CPU별 timeline, 프로세스 상태 색상, zoom in/out으로 마이크로초 단위 분석이 가능합니다.

## kprobe·uprobe로 동적 trace point 추가

미리 정의된 tracepoint가 없는 함수도 kprobe로 동적으로 hook을 걸 수 있습니다.

```bash
echo 'p:my_open do_sys_open filename=+0(%si):string' > kprobe_events
echo 1 > events/kprobes/my_open/enable
cat trace_pipe
```

이는 ftrace의 정적 hook을 보완하며, 모듈 함수나 inline되지 않은 함수에 사용합니다. eBPF의 base가 같은 mechanism입니다.

## Overhead — Nop의 이점

ftrace의 가장 큰 장점은 비활성 상태의 거의 zero overhead입니다.

```text
비활성 (nop):  ~1-2% (NOP 명령 비용)
function:     ~10-30% (모든 함수 hook)
function_graph: ~30-50%
event tracing: 1-5% (event 빈도 의존)
latency tracer: 5-15%
```

Production에서 latency tracer는 background로 켜 두고, function tracer는 디버깅 세션에만 사용하는 것이 보통입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Filter 없이 function tracer 활성화

```bash
echo function > current_tracer
echo 1 > tracing_on
# → 버퍼가 1초도 안 되어 가득 참
```

`set_ftrace_filter`로 좁히지 않으면 ring buffer가 즉시 wrap-around합니다.

> ⚠️ tracing_max_latency 리셋을 잊음

```bash
echo irqsoff > current_tracer
# → 어제의 latency가 그대로 표시됨
```

새 측정 전에 `echo 0 > tracing_max_latency`로 리셋해야 합니다.

> ⚠️ ring buffer 크기 부족

```bash
echo 4096 > buffer_size_kb               # 기본은 1408 KB
```

긴 trace는 buffer를 늘려야 wrap이 발생하지 않습니다. CPU당 buffer 크기이므로 코어 수만큼 총 메모리가 잡힙니다.

> ⚠️ tracing_on을 끄지 않고 cat trace

```bash
cat trace                                # tracing 계속 중
# → 읽는 동안에도 새 event가 쌓여 inconsistent
```

stable한 snapshot이 필요하면 먼저 `echo 0 > tracing_on`을 실행합니다.

## 정리

- ftrace는 GCC `-pg` hook을 runtime에 토글하는 방식으로 비활성 시 zero overhead입니다.
- `function` tracer는 모든 진입을, `function_graph`는 호출 그래프와 시간을 보여줍니다.
- `irqsoff`, `preemptoff`, `wakeup_rt`로 worst-case latency를 측정합니다.
- Tracepoint는 ftrace와 perf가 공유하는 정적 probe입니다.
- `trace-cmd`와 KernelShark로 record와 GUI 시각화가 가능합니다.
- Filter 없는 function tracer는 ring buffer를 즉시 wrap시키므로 좁은 범위 지정이 필수입니다.

다음 편은 **eBPF/bpftrace** — 안전한 커널 내 프로그램으로 분석합니다.

## 관련 항목

- [5-02: perf 고급](/blog/embedded/performance-engineering/part5-02-perf-advanced)
- [5-04: eBPF/bpftrace](/blog/embedded/performance-engineering/part5-04-ebpf)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
