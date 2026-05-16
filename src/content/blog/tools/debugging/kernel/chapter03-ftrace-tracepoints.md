---
title: "Ch 3: ftrace + tracepoints"
date: 2025-09-06T03:00:00
description: "함수 단위 trace, 이벤트 trace, 정적 tracepoint, function graph."
tags: [kernel, ftrace, tracepoint, tracing]
series: "Kernel Debugging"
seriesOrder: 3
draft: false
---

ftrace는 *커널의 내장 tracer*입니다. 별 도구 설치 없이 *모든 함수 호출·이벤트·latency*를 추적할 수 있습니다. printk로는 *너무 느려서* 못 잡는 핫 path 버그, *어디서 호출됐는지 모르는* 함수 호출의 출처 추적, *latency spike*의 원인 분석 — 모두 ftrace의 영역입니다.

:::tldr
`/sys/kernel/debug/tracing/` 디렉터리의 파일 셋으로 *모든 커널 함수 호출과 정의된 이벤트*를 ring buffer에 기록.
:::

## tracefs 진입

```bash
$ ls /sys/kernel/debug/tracing/
available_events    options/         set_event_pid    trace_pipe
available_filter_functions  per_cpu/  set_ftrace_filter  trace_stat/
available_tracers   printk_formats   set_ftrace_pid   tracing_cpumask
buffer_size_kb      saved_cmdlines   stack_max_size   tracing_max_latency
current_tracer      saved_tgids      stack_trace      tracing_on
dynamic_events      set_event        sysprof          trace
events/             set_event_notrace_pid  trace      uprobe_events
free_buffer         set_ftrace_notrace  trace_clock   ...
```

배포판은 `/sys/kernel/tracing/`에 *심볼릭 링크* 또는 별 mount. 권한 = root.

```bash
$ sudo -i
# cd /sys/kernel/debug/tracing
```

## available_tracers

```bash
# cat available_tracers
hwlat blk function_graph wakeup_dl wakeup_rt wakeup function nop
```

| Tracer | 용도 |
|--------|------|
| `nop` | 비활성 (기본) |
| `function` | 모든 함수 진입 기록 |
| `function_graph` | 진입 + 반환 + 들여쓰기 |
| `wakeup` | wakeup latency 최대값 |
| `wakeup_rt` | RT 태스크 wakeup |
| `irqsoff` | IRQ off 최대 구간 |
| `preemptoff` | preempt off 구간 |
| `hwlat` | 하드웨어 latency |
| `mmiotrace` | MMIO 추적 |
| `branch` | branch 통계 |

## 단순 사용 — function tracer

```bash
# cd /sys/kernel/debug/tracing
# echo function > current_tracer
# echo 1 > tracing_on
# sleep 0.1
# echo 0 > tracing_on
# cat trace | head -30
# tracer: function
#
# entries-in-buffer/entries-written: 12345/678901   #P:8
#
#                              _-----=> irqs-off
#                             / _----=> need-resched
#                            | / _---=> hardirq/softirq
#                            || / _--=> preempt-depth
#                            ||| /     delay
#           TASK-PID   CPU#  ||||    TIMESTAMP  FUNCTION
#              | |       |   ||||       |         |
            bash-1234    [002] ....  100.123: do_sys_open <-system_call_fastpath
            bash-1234    [002] ....  100.124: do_filp_open <-do_sys_open
            bash-1234    [002] ....  100.125: path_openat <-do_filp_open
            ...
```

각 행: `TASK-PID [CPU] FLAGS TIMESTAMP FUNCTION <-CALLER`.

## function_graph — 진입+반환 트리

```bash
# echo function_graph > current_tracer
# echo 1 > tracing_on
# sleep 0.1
# echo 0 > tracing_on
# cat trace | head -30
# tracer: function_graph
#
# CPU  DURATION                  FUNCTION CALLS
# |     |   |                     |   |   |   |
 2)               |  do_sys_open() {
 2)               |    do_filp_open() {
 2)   1.234 us    |      path_openat();
 2)   3.456 us    |    }
 2)   4.567 us    |  }
```

들여쓰기 + 함수별 소요 시간. *콜그래프*가 그대로. 그래도 트레이스가 *어마어마하게* 많아서 필터 필수.

## Filtering

```bash
# 특정 함수만 — 정확한 이름
# echo do_sys_open > set_ftrace_filter

# 와일드카드 *
# echo 'btrfs_*' > set_ftrace_filter

# 여러 패턴 추가 (>>로 append)
# echo 'kfree' >> set_ftrace_filter

# 제외 (notrace)
# echo 'memcpy' > set_ftrace_notrace

# 클리어
# echo > set_ftrace_filter
```

`available_filter_functions`에 *지원되는 함수 전체 목록*.

```bash
# wc -l available_filter_functions
67890
```

수만 개. ftrace가 *모든 nm-가능 함수*에 hook을 설치 가능 — 컴파일 시 `-pg` 또는 `-mfentry`로 *모든 함수 시작*에 nop 5바이트 패딩을 둠. 활성화 시 nop → call _ftrace.

## PID 필터

```bash
# echo $$ > set_ftrace_pid     # 현재 셸만
# echo $! > set_event_pid      # 마지막 백그라운드 작업
```

특정 프로세스가 *어떤 syscall*을 부르는지 — strace보다 깊게 (커널 함수까지) 봅니다.

## set_event — Tracepoints

ftrace는 *함수* 외에도 *정적 tracepoint* (커널 코드 안의 `trace_xxx()` 호출 지점)도 출력.

```bash
# ls available_events | head -10
alarmtimer:alarmtimer_cancel
alarmtimer:alarmtimer_fired
...
block:block_bio_complete
block:block_bio_queue
block:block_bio_remap
...
sched:sched_switch
sched:sched_wakeup
syscalls:sys_enter_openat
syscalls:sys_exit_openat
```

수천 개. 카테고리별 grouped.

```bash
# 한 이벤트 활성화
# echo 1 > events/sched/sched_switch/enable

# 카테고리 전체
# echo 1 > events/sched/enable

# 모든 syscall
# echo 1 > events/syscalls/enable

# 비활성
# echo 0 > events/sched/sched_switch/enable
```

결과:

```
       <idle>-0   [002] d.s.  101.234: sched_switch: prev_comm=swapper/2 prev_pid=0 prev_state=R ==> next_comm=kworker/2:1 next_pid=42 next_prio=120
```

각 이벤트의 *포맷*은:

```bash
# cat events/sched/sched_switch/format
name: sched_switch
ID: 245
format:
        field:unsigned short common_type;       offset:0;  size:2;
        field:unsigned char common_flags;       offset:2;  size:1;
        field:unsigned char common_preempt_count; offset:3; size:1;
        field:int common_pid;                   offset:4;  size:4;

        field:char prev_comm[16];               offset:8;  size:16;
        field:pid_t prev_pid;                   offset:24; size:4;
        ...

print fmt: "prev_comm=%s prev_pid=%d ...", REC->prev_comm, REC->prev_pid, ...
```

bpftrace·perf 같은 도구가 이 포맷을 보고 자체적으로 디코딩.

## 정의된 tracepoint 작성

커널 모듈에 자체 tracepoint 추가.

```c
#include <linux/tracepoint.h>

// my_trace.h
TRACE_EVENT(my_event,
    TP_PROTO(int val, const char *name),
    TP_ARGS(val, name),
    TP_STRUCT__entry(
        __field(int, val)
        __string(name, name)
    ),
    TP_fast_assign(
        __entry->val = val;
        __assign_str(name, name);
    ),
    TP_printk("val=%d name=%s", __entry->val, __get_str(name))
);

// my_code.c
trace_my_event(42, "hello");
```

부팅 후:
```bash
# echo 1 > events/my_event/enable
# cat trace_pipe
       myprog-1234  [002] ....  150.123: my_event: val=42 name=hello
```

*프로덕션 코드*에 영구 설치 가능 — 비활성 시 *NOP 한 줄* 비용. 활성 시만 ring buffer 쓰기.

## kprobe / kretprobe

*동적* tracepoint. 임의 함수에 hook.

```bash
# kprobe — function entry
# echo 'p:my_open do_sys_open' > kprobe_events
# echo 1 > events/kprobes/my_open/enable

# 인자 추출 — arch별 reg 이름
# echo 'p:my_open do_sys_open filename=+0(%si):string flags=%dx' \
#   > kprobe_events

# kretprobe — function return
# echo 'r:my_open_ret do_sys_open retval=$retval' >> kprobe_events
```

`%si`, `%dx` 등은 x86-64 register. *함수 인자* — 위치 알려면 ABI 알아야.

bpftrace가 *훨씬 쉬운 인터페이스* — kprobe를 위한 *고급 언어*. strace-tracing 시리즈 참고.

## function_graph + filter — 콜그래프 추출

```bash
# echo function_graph > current_tracer
# echo do_sys_open > set_graph_function    # 이 함수 호출 시만 추적
# echo 1 > tracing_on
# cat /tmp/somefile     # 트리거
# echo 0 > tracing_on
# cat trace
 2)               |  do_sys_open() {
 2)   0.123 us    |    getname_flags();
 2)               |    do_filp_open() {
 2)               |      path_openat() {
 2)               |        link_path_walk() {
 2)   ...
 2)   ...         |        }
 2)   ...         |      }
 2)   ...         |    }
 2)   12.345 us   |  }
```

깊이 제한:
```bash
# echo 3 > max_graph_depth
```

특정 함수가 *어떤 경로*로 호출됐는지 — 깊은 콜그래프를 깔끔하게.

## Latency tracers — irqsoff, preemptoff

```bash
# echo irqsoff > current_tracer
# echo 1 > tracing_on
# 한참 기다림
# cat trace_max_latency
1234   <- 마이크로초

# cat trace
# tracer: irqsoff
# IRQ-1234: 1234 us, depth=1
# ...
# (해당 latency 구간의 콜스택)
```

*가장 긴 IRQ-off 구간*과 그때의 콜스택. 실시간 시스템 latency 디버깅의 표준.

## trace-cmd

raw tracefs는 손이 많이 감. `trace-cmd`가 wrapper.

```bash
$ sudo trace-cmd record -p function_graph -F /usr/bin/ls
$ sudo trace-cmd report | head -30
$ sudo trace-cmd report --stat | head
```

`-F` = 명령 실행하면서 추적. 결과는 `trace.dat`로.

```bash
# 이벤트별
$ sudo trace-cmd record -e sched_switch -e sched_wakeup sleep 5

# 함수 그래프 + 필터
$ sudo trace-cmd record -p function_graph -l 'btrfs_*' sleep 5
```

## KernelShark — GUI

`kernelshark trace.dat`로 *시각화*. 멀티 CPU timeline, 이벤트별 색, 줌·필터. trace-cmd record + kernelshark가 *시각적 latency 분석*의 가장 흔한 조합.

## tracing_on, free_buffer

```bash
# echo 0 > tracing_on    # 추적 일시 정지
# echo 1 > tracing_on    # 재개
# echo > trace           # ring buffer 클리어
# > free_buffer          # 버퍼 메모리 해제
```

`buffer_size_kb` 기본 1408 KB per CPU. 작은 시스템에선 큰 trace가 손실. 늘리기:

```bash
# echo 16384 > buffer_size_kb    # 16MB per CPU
```

## trace-cmd extract + crash analysis

ftrace는 *crash 직전* ring buffer가 메모리에 있어 *vmcore에서 추출* 가능.

```bash
$ crash vmlinux vmcore
crash> trace dump
[ring buffer 출력]

# 또는 별 도구
$ trace-cmd extract -i vmcore -o trace.dat
```

panic 직전의 *모든 함수 호출* 분석. ftrace가 *postmortem 도구*로도 작동.

## ftrace + eBPF — 자리매김

이 시리즈 Ch 4가 eBPF.

| | ftrace | eBPF |
|---|--------|------|
| 진입 | tracefs 파일 | bpftrace / BCC |
| 언어 | 없음 (echo) | C-like / Python |
| 인자 처리 | kprobe args | 자유 (struct 캐스팅) |
| 출력 | text only | text / map / histogram |
| in-kernel logic | 없음 | bytecode 검증 후 실행 |
| 운영 안전 | 매우 안전 | 검증 통과 시 안전 |
| 학습 곡선 | 낮음 | 중-높음 |

ftrace는 *exploratory*, eBPF는 *분석*. 둘 다 활용.

## 부팅 시 활성화

```
boot cmdline:
trace_event=sched:sched_switch,sched:sched_wakeup
ftrace=function_graph
ftrace_filter=do_sys_*
```

부팅 초기부터 추적 (초기화 버그 잡기).

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `Permission denied` | root 필요 또는 `chmod +r` |
| `current_tracer` 변경 안 됨 | tracefs 미마운트, 또는 다른 도구가 사용 중 |
| 출력 없음 | tracing_on=0, 또는 trace 비움, 또는 필터가 너무 좁음 |
| 출력 폭주, 시스템 느림 | 필터 적용 또는 `echo 0 > tracing_on` |
| ring buffer 손실 (`LOST EVENTS`) | buffer_size_kb 늘리기 |
| 함수가 `available_filter_functions`에 없음 | inline 되었거나 `notrace` 마크 |

## 정리

- ftrace = 커널 내장 tracer. *모든 함수 호출 추적*.
- 진입은 `/sys/kernel/debug/tracing/`.
- tracers: function / function_graph / latency / wakeup.
- set_ftrace_filter로 함수 좁히기.
- events/로 정적 tracepoint.
- kprobe로 *임의 함수* 동적 hook.
- trace-cmd로 record/report.
- KernelShark로 GUI 시각화.
- crash vmcore에서도 ftrace 추출 가능.

## 다음 장 예고

Ch 4 — eBPF / bpftrace로 커널 디버깅. ftrace의 모든 것을 *훨씬 표현력 있게*.

## 관련 항목

- [Ch 2: printk / dmesg](/blog/tools/debugging/kernel/chapter02-printk-dmesg)
- [Ch 4: eBPF for kernel debugging](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [strace-tracing Ch 9: ftrace](/blog/tools/strace-tracing/chapter09-ftrace)
- [Brendan Gregg — perf 페이지 (ftrace 자료 많음)](https://www.brendangregg.com/perf.html)
- [`Documentation/trace/ftrace.rst`](https://www.kernel.org/doc/html/latest/trace/ftrace.html)
- [trace-cmd GitHub](https://github.com/rostedt/trace-cmd)
