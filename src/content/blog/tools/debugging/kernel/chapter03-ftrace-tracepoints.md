---
title: "ftrace와 tracepoints 활용 — 커널 함수 호출 트레이싱"
slug: "tools/debugging/kernel/chapter03-ftrace-tracepoints"
date: 2026-05-25T09:03:00
description: "함수 단위 trace, 이벤트 trace, 정적 tracepoint, function graph."
tags: [kernel, ftrace, tracepoint, tracing]
series: "Kernel Debugging"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

ftrace는 커널에 내장된 추적 기반입니다. printk를 넣고 다시 빌드하지 않아도 함수 진입·반환, 정적 이벤트, 임의 지점의 kprobe를 ring buffer에 기록합니다. 이 장은 Ch 1·2와 같은 Debian 13.7 arm64 게스트(커널 `6.12.116+deb13-arm64`, trace-cmd 3.3.1)에서 실행한 결과로 설명합니다. 실행할 때 게스트에서는 Ch 5용 커널 빌드(`cc1`)가 돌고 있어서, trace에 `cc1` task가 섞여 보입니다.

:::tldr
`/sys/kernel/tracing`의 파일에 값을 써서 tracer와 이벤트를 고르고, `trace` 파일로 읽습니다. 필터(`set_ftrace_filter`, `set_graph_function`)로 범위를 먼저 좁히고, 반복 작업은 trace-cmd로 묶습니다.
:::

## tracefs 진입

v6.12 `Documentation/trace/ftrace.rst`(69~77행)에 따르면 4.1 이전에는 제어 파일이 debugfs의 `/sys/kernel/debug/tracing`에 있었고, 지금은 tracefs가 따로 있으며 debugfs를 마운트하면 호환을 위해 같은 내용이 그 아래에도 자동으로 보입니다. 이 게스트는 systemd의 `sys-kernel-tracing.mount` 유닛이 부팅 때 tracefs를 `/sys/kernel/tracing`에 마운트해 두었습니다.

```text
$ mount | grep tracefs
tracefs on /sys/kernel/tracing type tracefs (rw,nosuid,nodev,noexec,relatime)
# ls /sys/kernel/tracing | column -c 110
README					set_event_notrace_pid
available_events			set_event_pid
available_filter_functions		set_ftrace_filter
available_filter_functions_addrs	set_ftrace_notrace
available_tracers			set_ftrace_notrace_pid
buffer_percent				set_ftrace_pid
buffer_size_kb				set_graph_function
buffer_subbuf_size_kb			set_graph_notrace
buffer_total_size_kb			snapshot
current_tracer				stack_max_size
dyn_ftrace_total_info			stack_trace
dynamic_events				stack_trace_filter
enabled_functions			synthetic_events
error_log				timestamp_mode
events					touched_functions
free_buffer				trace
instances				trace_clock
kprobe_events				trace_marker
kprobe_profile				trace_marker_raw
max_graph_depth				trace_options
options					trace_pipe
per_cpu					tracing_cpumask
printk_formats				tracing_max_latency
saved_cmdlines				tracing_on
saved_cmdlines_size			tracing_thresh
saved_tgids				uprobe_events
set_event				uprobe_profile
```

이하 명령은 root로 이 디렉터리에서 실행합니다.

## available_tracers

먼저 이 커널에 어떤 tracer가 있는지 봅니다. 자료에서 흔히 보는 목록과 다를 수 있기 때문입니다.

```text
# cat available_tracers
blk function_graph function nop
```

Debian 6.12 arm64 커널에는 네 개뿐이었습니다. 나머지 tracer는 `kernel/trace/Kconfig`의 별도 옵션이고, 이 커널의 `/boot/config-*`에서는 모두 꺼져 있었습니다.

| Tracer | 용도 | Kconfig | 이 커널 |
|--------|------|---------|---------|
| `nop` | 비활성 | `NOP_TRACER` | 있음 |
| `function` | 함수 진입 기록 | `FUNCTION_TRACER` | 있음 |
| `function_graph` | 진입 + 반환 + 소요 시간 | `FUNCTION_GRAPH_TRACER` | 있음 |
| `blk` | block I/O | `BLK_DEV_IO_TRACE` | 있음 |
| `irqsoff` | IRQ off 최대 구간 | `IRQSOFF_TRACER` | not set |
| `preemptoff` | preempt off 최대 구간 | `PREEMPT_TRACER` (`depends on PREEMPTION`) | not set (커널이 `PREEMPT_VOLUNTARY`) |
| `wakeup`·`wakeup_rt`·`wakeup_dl` | wakeup latency | `SCHED_TRACER` | not set |
| `hwlat` | 하드웨어 latency(SMI 등) | `HWLAT_TRACER` | not set |
| `mmiotrace` | MMIO 추적 | `MMIOTRACE` (`HAVE_MMIOTRACE_SUPPORT`는 x86만) | 해당 없음 |

latency tracer가 필요하면 커널을 다시 빌드해야 합니다. 이 장은 latency tracer를 실행하지 않았습니다.

## 단순 사용 — function tracer

`open(2)` 경로의 중심 함수 하나만 기록해 봅니다. v6.12 `fs/open.c:1399`의 `do_sys_openat2()`입니다. 필터에 쓰기 전에 그 이름이 추적 가능한 목록에 있는지 확인합니다.

```text
# wc -l < available_filter_functions
52673
# grep -E '^(do_sys_open|do_sys_openat2|do_filp_open|path_openat|__arm64_sys_openat|getname_flags)( |$)' available_filter_functions
do_sys_openat2
do_sys_open
__arm64_sys_openat
getname_flags
path_openat
do_filp_open
```

```text
# echo 0 > tracing_on; echo > trace
# echo do_sys_openat2 > set_ftrace_filter
# echo function > current_tracer
# echo 1 > tracing_on; cat /etc/hostname > /dev/null; echo 0 > tracing_on
# head -20 trace
# tracer: function
#
# entries-in-buffer/entries-written: 112/112   #P:4
#
#                                _-----=> irqs-off/BH-disabled
#                               / _----=> need-resched
#                              | / _---=> hardirq/softirq
#                              || / _--=> preempt-depth
#                              ||| / _-=> migrate-disable
#                              |||| /     delay
#           TASK-PID     CPU#  |||||  TIMESTAMP  FUNCTION
#              | |         |   |||||     |         |
             cc1-65966   [003] .....  1141.093520: do_sys_openat2 <-__arm64_sys_openat
             cc1-65966   [003] .....  1141.093522: do_sys_openat2 <-__arm64_sys_openat
             cc1-65966   [003] .....  1141.093523: do_sys_openat2 <-__arm64_sys_openat
             cc1-65966   [003] .n...  1141.093535: do_sys_openat2 <-__arm64_sys_openat
           <...>-65960   [000] .....  1141.093611: do_sys_openat2 <-__arm64_sys_openat
           <...>-65960   [000] .....  1141.093614: do_sys_openat2 <-__arm64_sys_openat
           <...>-65960   [000] .....  1141.093614: do_sys_openat2 <-__arm64_sys_openat
             cat-65967   [003] .....  1141.093640: do_sys_openat2 <-__arm64_sys_openat
```

각 행은 `TASK-PID [CPU] 플래그 TIMESTAMP 함수 <-호출자`입니다. arm64에서 호출자는 `__arm64_sys_openat`, 즉 시스템 콜 진입점이었습니다. 다섯 칸 플래그의 뜻은 ftrace.rst 1030~1052행에 있습니다. 첫 칸 `d`는 인터럽트 꺼짐, 둘째 칸 `n`은 `TIF_NEED_RESCHED`만 설정, 셋째 칸 `h`·`s`는 hardirq·softirq 문맥, 넷째 칸은 preempt depth입니다. `<...>`는 PID에 대응하는 comm이 `saved_cmdlines` 캐시에 없을 때 찍힙니다(ftrace.rst 468~474행).

필터 없이 `function`을 켜면 5만 개 함수가 모두 기록돼 버퍼(아래)가 순식간에 넘칩니다. 112개 항목이 들어온 위 실행처럼 필터를 먼저 거는 것이 기본 순서입니다.

## function_graph — 진입+반환 트리

`function_graph`는 함수 반환도 잡아서 호출 트리와 각 함수의 소요 시간을 보여 줍니다. `set_graph_function`으로 루트 함수를 지정하면 그 함수 안에서 불린 것만 기록합니다.

```text
# echo > set_ftrace_filter
# echo function_graph > current_tracer
# echo do_sys_openat2 > set_graph_function
# echo 1 > tracing_on; cat /etc/hostname > /dev/null; echo 0 > tracing_on
# cat trace
# CPU  DURATION                  FUNCTION CALLS
# |     |   |                     |   |   |   |
 1)               |  do_sys_openat2() {
 1)               |    getname() {
 1)               |      getname_flags.part.0() {
 1)               |        kmem_cache_alloc_noprof() {
 1)               |          __cond_resched() {
 1)   0.125 us    |            rcu_all_qs();
 1)   0.500 us    |          }
 1)   0.959 us    |        }
 1)               |        __check_object_size() {
 1)   0.084 us    |          check_stack_object();
 1)   0.083 us    |          is_vmalloc_addr();
 ...
 1)               |    do_filp_open() {
 1)               |      path_openat() {
 1)               |        alloc_empty_file() {
 ...
```

트리가 깊어서 한 번의 `open`이 수백 줄이 됩니다. `getname_flags.part.0`처럼 `.part.N`이 붙은 이름은 컴파일러가 함수를 쪼갠 사본이라 소스에는 없습니다. 깊이를 3으로 자르면 전체 모양이 보입니다.

```text
# echo 3 > max_graph_depth
# echo > trace; echo 1 > tracing_on; cat /etc/hostname > /dev/null; echo 0 > tracing_on
 3)               |  do_sys_openat2() {
 3)               |    getname() {
 3)   0.958 us    |      getname_flags.part.0();
 3)   1.167 us    |    }
 3)               |    get_unused_fd_flags() {
 3)   0.541 us    |      alloc_fd();
 3)   0.792 us    |    }
 3)               |    do_filp_open() {
 3) + 13.542 us   |      path_openat();
 3) + 13.750 us   |    }
 3)   0.083 us    |    fd_install();
 3)               |    putname() {
 3)   0.125 us    |      kmem_cache_free();
 3)   0.292 us    |    }
 3) + 16.708 us   |  }
```

`open` 한 번의 16.7 µs 중 13.5 µs가 경로 탐색(`path_openat`)이었습니다. 시간 앞의 `+`는 10 µs를 넘었다는 표시입니다(ftrace.rst 1073행). 이 값은 빌드가 돌던 VM에서 한 번 잰 것이라 절대값보다 비율로 읽습니다. 확인이 끝나면 `echo 0 > max_graph_depth; echo > set_graph_function; echo nop > current_tracer`로 되돌립니다.

## Filtering

`set_ftrace_filter`는 와일드카드를 받고, `>>`로 쓰면 기존 목록에 더합니다. 파일을 다시 읽으면 실제로 적용된 함수 목록이 나오므로 패턴이 몇 개에 걸렸는지 바로 셉니다.

```text
# echo 'vfs_*' > set_ftrace_filter; wc -l < set_ftrace_filter
78
# echo 'kfree' >> set_ftrace_filter; wc -l < set_ftrace_filter
79
# echo > set_ftrace_filter; cat set_ftrace_filter
#### all functions enabled ####
```

제외는 `set_ftrace_notrace`에 씁니다. 두 파일에 모두 있으면 추적하지 않습니다(ftrace.rst 284~289행). `available_filter_functions`는 "ftrace가 처리해서 추적할 수 있는 함수 목록"이고(355~361행), 이 커널에서는 52,673개였습니다. 인라인된 함수와 `notrace`로 표시된 함수는 여기에 없으므로, 필터가 안 걸리면 먼저 이 목록을 grep합니다.

## PID 필터

```bash
echo $$ > set_ftrace_pid     # 현재 셸의 함수 호출만
echo $$ > set_event_pid      # 현재 셸의 이벤트만
```

ftrace.rst(291~320행)에 따르면 `set_ftrace_pid`는 function tracer를, `set_event_pid`는 이벤트를 그 PID로 제한합니다. 둘은 별개의 파일이므로 함수와 이벤트를 모두 거르려면 두 파일에 다 씁니다. 자식 프로세스까지 따라가려면 `function-fork`·`event-fork` 옵션을 켭니다.

## set_event — Tracepoints

함수 추적은 이름만 남기지만, tracepoint는 커널 개발자가 고른 지점에서 인자까지 구조화해서 남깁니다. 이 커널에는 1,695개가 있었습니다.

```text
# grep -c '' available_events
1695
# cat events/sched/sched_switch/format
name: sched_switch
ID: 250
format:
	field:unsigned short common_type;	offset:0;	size:2;	signed:0;
	field:unsigned char common_flags;	offset:2;	size:1;	signed:0;
	field:unsigned char common_preempt_count;	offset:3;	size:1;	signed:0;
	field:int common_pid;	offset:4;	size:4;	signed:1;

	field:char prev_comm[16];	offset:8;	size:16;	signed:0;
	field:pid_t prev_pid;	offset:24;	size:4;	signed:1;
	field:int prev_prio;	offset:28;	size:4;	signed:1;
	field:long prev_state;	offset:32;	size:8;	signed:1;
	field:char next_comm[16];	offset:40;	size:16;	signed:0;
	field:pid_t next_pid;	offset:56;	size:4;	signed:1;
	field:int next_prio;	offset:60;	size:4;	signed:1;

print fmt: "prev_comm=%s prev_pid=%d prev_prio=%d prev_state=%s%s ==> next_comm=%s ..."
```

`format`은 바이너리 레코드의 배치표입니다. trace-cmd·perf·bpftrace는 이 파일을 읽어 레코드를 디코딩합니다. 이벤트를 켜고 0.2초 동안 기록한 결과입니다.

```text
# echo 1 > events/sched/sched_switch/enable
# echo 1 > tracing_on; sleep 0.2; echo 0 > tracing_on
# echo 0 > events/sched/sched_switch/enable
# grep -m3 sched_switch trace
            bash-65909   [000] d....  1141.805172: sched_switch: prev_comm=bash prev_pid=65909 prev_prio=120 prev_state=R ==> next_comm=sshd-session next_pid=65908 next_prio=120
    sshd-session-65908   [000] d....  1141.805178: sched_switch: prev_comm=sshd-session prev_pid=65908 prev_prio=120 prev_state=S ==> next_comm=bash next_pid=65909 next_prio=120
            bash-65909   [000] d....  1141.805253: sched_switch: prev_comm=bash prev_pid=65909 prev_prio=120 prev_state=S ==> next_comm=bash next_pid=65998 next_prio=120
```

카테고리 전체는 `events/sched/enable`, 전부는 `events/enable`에 1을 씁니다.

## 정의된 tracepoint 작성

자기 모듈에 tracepoint를 넣으면 `trace_printk`(Ch 2)와 달리 운영 빌드에 남겨 둘 수 있습니다. v6.12 `Documentation/trace/tracepoints.rst`(18~22행)는 꺼진 tracepoint의 비용을 "분기 하나를 확인하는 작은 시간 비용과 몇 바이트의 공간 비용"으로 설명합니다. 아래는 실제로 빌드해 로드한 최소 예제입니다. 헤더 하나, `CREATE_TRACE_POINTS`를 정의하는 소스 하나, Makefile 한 줄이 필요합니다.

```c
/* kdbg_tp.h */
#undef TRACE_SYSTEM
#define TRACE_SYSTEM kdbg

#if !defined(_KDBG_TP_H) || defined(TRACE_HEADER_MULTI_READ)
#define _KDBG_TP_H
#include <linux/tracepoint.h>

TRACE_EVENT(kdbg_event,
	TP_PROTO(int val, const char *name),
	TP_ARGS(val, name),
	TP_STRUCT__entry(
		__field(int, val)
		__string(name, name)
	),
	TP_fast_assign(
		__entry->val = val;
		__assign_str(name);
	),
	TP_printk("val=%d name=%s", __entry->val, __get_str(name))
);
#endif

#undef TRACE_INCLUDE_PATH
#define TRACE_INCLUDE_PATH .
#undef TRACE_INCLUDE_FILE
#define TRACE_INCLUDE_FILE kdbg_tp
#include <trace/define_trace.h>
```

```c
/* kdbg_tp.c: debugfs 파일에 쓰면 이벤트 발생 */
#define CREATE_TRACE_POINTS
#include "kdbg_tp.h"

static ssize_t fire_write(struct file *f, const char __user *ubuf,
			  size_t len, loff_t *ppos)
{
	trace_kdbg_event((int)len, "hello");
	return len;
}
```

```makefile
obj-m += kdbg_tp.o
CFLAGS_kdbg_tp.o := -I$(src)
```

v6.12에서 `__assign_str()`는 인자가 하나입니다(`include/trace/stages/stage6_event_callback.h:34`, 예제는 `samples/trace_events/trace-events-sample.h:139`). 소스 값은 `__string(name, name)`의 둘째 인자에서 가져옵니다. 인터넷의 예제는 대부분 `__assign_str(name, name)`처럼 두 인자를 쓰는데, 6.10 이전 형식이라 6.12에서는 컴파일되지 않습니다.

```text
# insmod /root/tpmod/kdbg_tp.ko
# ls events/kdbg/
enable  filter  kdbg_event
# echo 1 > events/kdbg/kdbg_event/enable; echo 1 > tracing_on
# echo -n abc > /sys/kernel/debug/kdbg_tp/fire
# grep kdbg_event trace
            bash-65909   [003] .....  1143.477571: kdbg_event: val=3 name=hello
```

`TRACE_SYSTEM`이 `events/` 아래 디렉터리 이름이 됐고, 문자열 필드는 format에 `__data_loc char[] name`으로 기록됐습니다.

## kprobe / kretprobe

tracepoint가 없는 곳은 kprobe로 잡습니다. `kprobe_events`에 정의를 쓰면 `events/kprobes/` 아래에 이벤트가 생깁니다. 인자는 v6.12 `Documentation/trace/kprobetrace.rst`(53~54행)의 `$argN`(1부터)과 `$retval`로 가져오고, 사용자 공간 포인터인 파일 이름은 `ustring` 타입으로 읽습니다(105, 142~143행).

```text
# echo 'p:my_open do_sys_openat2 dfd=$arg1:s32 filename=+0($arg2):ustring' > kprobe_events
# echo 'r:my_open_ret do_sys_openat2 ret=$retval:s64' >> kprobe_events
# cat kprobe_events
p:kprobes/my_open do_sys_openat2 dfd=$arg1:s32 filename=+0($arg2):ustring
r10:kprobes/my_open_ret do_sys_openat2 ret=$retval:s64
# echo 1 > events/kprobes/enable; echo 1 > tracing_on
# cat /etc/hostname > /dev/null
# echo 0 > tracing_on; echo 0 > events/kprobes/enable
# grep cat- trace | head -4
             cat-66020   [003] d....  1142.068381: my_open: (do_sys_openat2+0x0/0x110) dfd=-100 filename="/dev/null"
             cat-66020   [003] d....  1142.068387: my_open_ret: (__arm64_sys_openat+0x6c/0xc8 <- do_sys_openat2) ret=3
             cat-66020   [003] d....  1142.068468: my_open: (do_sys_openat2+0x0/0x110) dfd=-100 filename="/etc/ld.so.cache"
             cat-66020   [003] d....  1142.068470: my_open_ret: (__arm64_sys_openat+0x6c/0xc8 <- do_sys_openat2) ret=3
```

`dfd=-100`은 `AT_FDCWD`이고, `cat`이 동적 링커를 거쳐 `/etc/ld.so.cache`와 libc를 여는 순서가 그대로 보입니다. 커널은 kretprobe 정의를 `r10`으로 다시 보여 줬습니다. kprobetrace.rst 32·43행의 `r[MAXACTIVE]`, 즉 동시에 추적할 수 있는 인스턴스 수입니다.

레지스터 이름을 직접 쓰는 x86 예제(`+0(%si):string`)를 arm64에 그대로 넣으면 거부됩니다. 이유는 `error_log`에 남습니다.

```text
# echo 'p:bad do_sys_openat2 filename=+0(%si):string' > kprobe_events
bash: echo: write error: Invalid argument
# tail -3 error_log
[ 1142.185705] trace_kprobe: error: Invalid register name
  Command: p:bad do_sys_openat2 filename=+0(%si):string
                                            ^
```

`$argN`은 커널이 아키텍처의 인자 레지스터를 대신 골라 주므로 위 정의는 아키텍처 이름 없이 쓸 수 있습니다. 다만 kprobetrace.rst 65~67행은 함수 진입(offset 0)에서만, 그리고 레지스터로 넘어온 인자만 지원하는 best effort라고 적고 있습니다. 표현력이 더 필요하면 Ch 4의 bpftrace가 같은 kprobe 위에서 돕니다.

## function_graph + filter — 콜그래프 추출

위 `set_graph_function` + `max_graph_depth` 조합이 이 용도입니다. 정리하면 순서는 다음과 같습니다.

1. `available_filter_functions`에서 루트 함수 이름 확인.
2. `echo <함수> > set_graph_function`, `echo function_graph > current_tracer`.
3. `max_graph_depth`를 3 정도로 두고 전체 모양을 봅니다.
4. 시간이 큰 자식(위 예에서 `path_openat`)을 새 루트로 삼아 반복합니다.

## Latency tracers — irqsoff, preemptoff

`irqsoff`·`preemptoff`는 IRQ나 선점이 꺼진 최대 구간과 그때의 스택을 `tracing_max_latency`에 남기는 tracer입니다. 위 표처럼 이 Debian 커널에는 없어서 실행하지 않았습니다. `preemptoff`는 `depends on PREEMPTION`(`kernel/trace/Kconfig:370~373`)이라 `PREEMPT_VOLUNTARY` 커널에서는 켤 수도 없습니다. 사용법과 출력 형식은 v6.12 `Documentation/trace/ftrace.rst`의 "irqsoff"·"preemptoff" 절에 있습니다.

## trace-cmd

tracefs 파일을 손으로 쓰면 되돌리는 것을 잊기 쉽습니다. trace-cmd는 설정, 기록, 복구를 한 명령으로 묶고 결과를 `trace.dat` 파일로 남깁니다.

```text
# trace-cmd record -e sched_switch -e sched_wakeup sleep 1
...
CPU3 data recorded at offset=0x172000
    2645 bytes in size (20480 uncompressed)
# ls -la trace.dat
-rw-r--r-- 1 root root 1518421 Nov 16 09:56 trace.dat
# trace-cmd report | head -4
cpus=4
           sleep-66868 [000] dN...  1146.173819: sched_wakeup:         migration/0:20 [0] CPU:000
           sleep-66868 [000] d....  1146.173821: sched_switch:         trace-cmd:66868 [120] R ==> migration/0:20 [0]
     migration/0-20    [000] d....  1146.173830: sched_switch:         migration/0:20 [0] S ==> cc1:66781 [120]
# trace-cmd report --stat | sed -n 6,14p
CPU: 0
entries: 400
overrun: 0
commit overrun: 0
bytes: 23888
oldest event ts:  1146.173819
now ts:  1147.174441
dropped events: 0
read events: 0
```

`--stat`의 `overrun`·`dropped events`가 0이면 버퍼가 넘치지 않은 것입니다. function_graph도 같은 식으로 기록합니다. `-g`가 `set_graph_function`, `-F`가 "이 명령만 추적"입니다.

```text
# trace-cmd record -p function_graph -g do_sys_openat2 -F cat /etc/hostname
# trace-cmd report | grep -m1 -A3 'do_sys_openat2() {'
             cat-67368 [003] .....  1152.758239: funcgraph_entry:                   |  do_sys_openat2() {
             cat-67368 [003] .....  1152.758240: funcgraph_entry:                   |    getname() {
             cat-67368 [003] .....  1152.758240: funcgraph_entry:                   |      getname_flags.part.0() {
             cat-67368 [003] .....  1152.758240: funcgraph_entry:                   |        kmem_cache_alloc_noprof() {
```

## tracing_on, free_buffer

```bash
echo 0 > tracing_on      # 기록 일시 정지 (버퍼는 유지)
echo 1 > tracing_on      # 재개
echo > trace             # 버퍼 비우기
```

버퍼 크기는 CPU마다 따로입니다. 이 게스트의 값입니다.

```text
# cat buffer_size_kb buffer_total_size_kb
1410
5640
```

CPU당 약 1.4 MB이고 4 CPU 합계가 5,640 KB입니다. 소스의 기본값은 `kernel/trace/trace.c:896`의 `TRACE_BUF_SIZE_DEFAULT` 1,441,792바이트(16384 × 88, 1,408 KiB)입니다. function tracer를 필터 없이 켜면 이 버퍼는 1초도 못 가므로, `--stat`의 `overrun`이 0이 아니면 `echo 16384 > buffer_size_kb`처럼 늘리거나 필터를 좁힙니다. 부팅 시에는 `trace_buf_size=nn[KMG]`(`kernel-parameters.txt:6786`)로 정합니다.

## 크래시 전 trace 보존

ftrace 버퍼는 커널 메모리에 있으므로 panic하면 같이 사라집니다. 이 게스트에서 확인한 사실은 두 가지입니다.

- Debian의 `crash` 8.0.6 패키지가 설치한 확장은 `/usr/lib/crash/extensions/`의 `dminfo.so`, `echo.so`, `snap.so` 셋뿐이었습니다. vmcore에서 ftrace 버퍼를 꺼내는 crash 확장은 이 패키지에 없습니다.
- 커널 쪽 대안은 부팅 인자 `ftrace_dump_on_oops`(`kernel-parameters.txt:1597~1606`)로, oops 순간 trace 버퍼를 콘솔로 덤프합니다. `=orig_cpu`를 주면 oops가 난 CPU의 버퍼만 덤프합니다. 콘솔이 시리얼이면 호스트 쪽 로그에 남습니다. 이 장에서는 실행하지 않았습니다.

## ftrace + eBPF — 자리매김

| | ftrace | eBPF (Ch 4) |
|---|--------|------|
| 진입 | tracefs 파일 쓰기 | bpftrace / BCC / libbpf |
| 필터·집계 | 함수 이름 필터, 이벤트 `filter` 식 | 프로그램 안에서 임의 로직, map 집계 |
| 인자 | kprobe `$argN`, tracepoint 필드 | 같음 + BTF로 구조체 필드 |
| 출력 | 텍스트 ring buffer | 텍스트, map, 히스토그램 |
| 선행 조건 | `FUNCTION_TRACER` 등 | `BPF_SYSCALL`, BTF |

둘은 같은 hook(함수 진입 patch, tracepoint, kprobe) 위에서 돕니다. 이 장의 kprobe 정의를 Ch 4에서 bpftrace로 다시 써 보면 차이가 분명해집니다.

## 부팅 시 활성화

초기화 단계의 버그는 셸이 뜨기 전에 일어나므로 부팅 인자로 tracer를 켭니다. v6.12 `kernel-parameters.txt`의 정의는 다음과 같고, 이 장에서는 실행하지 않았습니다.

| 인자 | 정의 위치 | 뜻 |
|------|-----------|----|
| `ftrace=[tracer]` | 1575행 | 지정 tracer를 가능한 한 일찍 시작 |
| `ftrace_filter=[function-list]` | 1620행 | 부팅 시 function tracer 필터(쉼표 구분) |
| `trace_event=[event-list]` | 6811행 | 부팅 시 이벤트 켜기(쉼표 구분) |
| `trace_buf_size=nn[KMG]` | 6786행 | CPU당 버퍼 크기 |

```text
trace_event=sched:sched_switch,sched:sched_wakeup ftrace=function_graph ftrace_filter=do_sys_openat2
```

## 자주 만나는 함정

| 증상 | 원인 (이 장에서 확인한 것) |
|------|------|
| `echo irqsoff > current_tracer`가 실패 | `available_tracers`에 없음. Debian 6.12 arm64는 4개뿐 |
| 필터가 안 걸림 | `available_filter_functions`에 없는 이름 (인라인·`notrace`·이름 변경) |
| 트리에 `foo.part.0` 같은 이름 | 컴파일러가 만든 함수 조각. 소스에서는 `foo` |
| kprobe 정의가 `Invalid argument` | `error_log` 확인. 다른 아키텍처의 레지스터 이름 등 |
| 파일 이름이 깨져 나옴 | 사용자 포인터에 `string` 사용. `ustring` 사용 |
| `__assign_str` 컴파일 오류 | 6.10 이전 두 인자 형식. v6.12는 한 인자 |
| `overrun`·`dropped events` 증가 | 버퍼 부족. `buffer_size_kb` 증가 또는 필터 축소 |

## 정리

- tracefs는 `/sys/kernel/tracing`에 있고, debugfs 아래 경로는 호환용입니다.
- 이 Debian 커널의 tracer는 `blk function_graph function nop` 넷이고, latency tracer는 재빌드가 필요합니다.
- `set_ftrace_filter`·`set_graph_function`·`max_graph_depth`로 범위를 좁히면 `open` 한 번의 호출 트리와 시간(`path_openat` 13.5 µs / 전체 16.7 µs)이 보입니다.
- tracepoint 1,695개는 `format` 파일로 자기 구조를 설명합니다. 자기 모듈의 tracepoint는 v6.12에서 `__assign_str(field)` 한 인자 형식입니다.
- kprobe는 `$argN`·`$retval`·`ustring`으로 아키텍처 독립적으로 씁니다.
- trace-cmd는 기록을 `trace.dat`로 남기고 `--stat`으로 손실 여부를 알려 줍니다.

## 다음 장 예고

Ch 4 — eBPF / bpftrace로 커널 디버깅. 이 장의 kprobe와 tracepoint 위에서 집계·히스토그램·스택을 프로그램으로 만듭니다.

## 관련 항목

- [Ch 2: printk / dmesg](/blog/tools/debugging/kernel/chapter02-printk-dmesg)
- [Ch 4: eBPF for kernel debugging](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Performance Engineering: ftrace 활용](/blog/embedded/performance-engineering/part5-03-ftrace) — tracer를 켜고 끌 때의 overhead까지 따지는 성능 쪽
- [`Documentation/trace/ftrace.rst` (v6.12)](https://www.kernel.org/doc/html/v6.12/trace/ftrace.html)
- [`Documentation/trace/kprobetrace.rst` (v6.12)](https://www.kernel.org/doc/html/v6.12/trace/kprobetrace.html)
- [trace-cmd](https://github.com/rostedt/trace-cmd)
