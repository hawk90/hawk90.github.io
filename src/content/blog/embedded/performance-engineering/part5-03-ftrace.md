---
title: "ftrace 활용 — function·function_graph·latency tracer"
slug: "embedded/performance-engineering/part5-03-ftrace"
date: 2026-04-27T09:02:00
description: "ftrace의 function tracer, function_graph, irqsoff·preemptoff latency tracer 활용."
series: "Embedded Performance Engineering"
seriesOrder: 42
tags: [ftrace, function-tracer, latency-tracer, trace-cmd]
topics: ["embedded"]
---

## 한 줄 요약

> **"ftrace는 커널에 내장된 추적기입니다. 함수 진입, 호출 그래프와 시간, tracepoint를 켜고 끌 수 있고, 어떤 tracer가 있는지는 그 커널의 빌드 설정이 정합니다."**

## 어떤 문제를 푸는가

커널의 어느 함수에서 시간이 새는지, 파일 하나를 여는 동안 커널 안에서 무슨 일이 일어나는지 같은 질문은 perf의 표본만으로는 답하기 어렵습니다. 표본은 일정 간격으로 찍는 사진이라, 몇 마이크로초짜리 호출은 사진 사이에 빠집니다. ftrace는 사진 대신 **출입 기록부**입니다. 켜 둔 함수를 지나갈 때마다 한 줄씩 적습니다.

[ftrace.rst @v6.12](https://github.com/torvalds/linux/blob/v6.12/Documentation/trace/ftrace.rst)의 "dynamic ftrace" 절은 원리를 이렇게 설명합니다. `-pg`로 빌드한 커널은 함수마다 첫머리에 추적 호출이 들어가는데, `CONFIG_DYNAMIC_FTRACE`가 있으면 부팅 때 이 호출을 nop으로 바꿔 두었다가 켤 때만 되살립니다. 이 설명은 문서의 mcount(x86) 기준이고, v6.12 arm64는 `arch/arm64/Makefile`에서 `CONFIG_DYNAMIC_FTRACE_WITH_CALL_OPS`면 `-fpatchable-function-entry=4,2`, `CONFIG_DYNAMIC_FTRACE_WITH_ARGS`면 `-fpatchable-function-entry=2`로 함수 첫머리에 nop 자리를 만듭니다. 이 guest 커널은 두 설정이 모두 `y`였습니다. 그래서 "function tracing is disabled"일 때는 "virtually no overhead"라고 적습니다. 이 글 끝의 측정에서 확인하겠지만, 켜는 순간의 비용은 켠 함수 수에 따라 크게 달라집니다.

이 글의 출력은 모두 Apple M2 Pro 위 QEMU 11.1.3 HVF guest(8 vCPU)의 Debian 13 arm64, 커널 `6.12.116+deb13-arm64`, trace-cmd 3.3.1에서 얻었습니다. 아키텍처가 arm64라 함수 이름과 레지스터 이름이 x86 예제와 다르다는 점도 함께 보입니다.

## tracefs 인터페이스

ftrace는 tracefs라는 가상 파일시스템으로 노출됩니다. Debian guest는 부팅 때 이미 마운트해 두었습니다.

```text
$ mount | grep tracefs
tracefs on /sys/kernel/tracing type tracefs (rw,nosuid,nodev,noexec,relatime)
```

수동으로 마운트할 때는 다음 명령입니다.

```bash
mount -t tracefs nodev /sys/kernel/tracing
```

디렉터리에는 다음 같은 파일이 있습니다(`ls` 출력에서 이 글이 쓰는 것만 골랐습니다).

```text
README  available_events  available_filter_functions  available_tracers
buffer_size_kb  buffer_total_size_kb  current_tracer  events  kprobe_events
max_graph_depth  per_cpu  set_event  set_ftrace_filter  set_graph_function
trace  trace_pipe  tracing_on  uprobe_events
```

먼저 이 커널에 어떤 tracer가 들어 있는지 봅니다.

```text
$ cat available_tracers
blk function_graph function nop
```

이 Debian 커널에는 `function`, `function_graph`, `blk`, `nop` 넷뿐입니다. latency tracer는 아래 절에서 다시 봅니다. 추적 가능한 함수 목록(`available_filter_functions`)은 52315줄이었습니다.

기본 사용 패턴은 "tracer 고르기 → 켜기 → 끄기 → 읽기"입니다.

```bash
cd /sys/kernel/tracing
echo function > current_tracer       # tracer 선택
echo 1 > tracing_on                  # 시작
sleep 0.1
echo 0 > tracing_on                  # 정지
cat trace                            # 결과 확인
```

## Function Tracer — 사용 가능한 함수 진입 기록

필터 없이 0.1초 켠 결과입니다. 한 줄은 "누가(`sh-9851`), 어느 CPU에서(`[001]`), 언제, 어떤 함수를, 누가 불러서(`<-`) 들어갔나"입니다.

```text
              sh-9851    [001] .....  1698.838890: mutex_unlock <-rb_simple_write
              sh-9851    [001] .....  1698.838892: get_random_u16 <-invoke_syscall
              sh-9851    [001] d....  1698.838893: do_notify_resume <-el0_svc
              sh-9851    [001] .....  1698.838893: mem_cgroup_handle_over_high <-do_notify_resume
              sh-9851    [001] .....  1698.838893: blkcg_maybe_throttle_current <-do_notify_resume
              sh-9851    [001] .....  1698.838893: __rseq_handle_notify_resume <-do_notify_resume
```

첫 줄의 `rb_simple_write`는 방금 `echo 1 > tracing_on`을 처리한 커널 함수이고, `el0_svc`는 arm64에서 사용자 공간 시스템 호출이 커널로 들어오는 경로입니다. 측정 명령 자신이 기록의 첫머리를 채운다는 점을 기억해 둡니다. 0.1초 동안 8개 CPU 버퍼에 쌓인 항목은 27999개였고, 거의 쉬고 있는 guest라 덮어쓴 항목(`overrun`)은 0이었습니다.

함수가 너무 많을 때는 `set_ftrace_filter`로 좁힙니다. 와일드카드와 `!` 제외를 쓸 수 있습니다.

```text
$ echo 'tcp_*' > set_ftrace_filter; wc -l < set_ftrace_filter
394
$ echo '!tcp_v4_*' >> set_ftrace_filter; wc -l < set_ftrace_filter
367
```

`tcp_*`가 394개를 고르고, `tcp_v4_*` 27개를 빼서 367개가 남았습니다. 함수 하나만 골라 `cat`이 파일을 읽는 모습을 보면 다음과 같습니다.

```text
$ echo vfs_read > set_ftrace_filter; echo function > current_tracer
$ echo 1 > tracing_on; cat /etc/hostname > /dev/null; echo 0 > tracing_on
             cat-9865    [006] .....  1699.303101: vfs_read <-ksys_read
             cat-9865    [006] .....  1699.303325: vfs_read <-ksys_read
```

## Function Graph Tracer — 호출 그래프와 시간

`function_graph`는 진입과 복귀를 모두 기록해 호출 트리와 걸린 시간을 보여 줍니다. 출입 기록부에 "들어간 시각"뿐 아니라 "나온 시각"까지 적는 셈입니다. 파일 열기의 커널 진입점을 `set_graph_function`으로 지정합니다. v6.12 arm64에서 `open`·`openat`이 거치는 함수는 `do_sys_openat2`이고, `available_filter_functions`에 `do_sys_open`과 함께 들어 있었습니다.

트리가 깊어서 `max_graph_depth`로 3단계까지만 펼쳤습니다.

```bash
echo do_sys_openat2 > set_graph_function
echo 3 > max_graph_depth
echo function_graph > current_tracer
echo 1 > tracing_on; cat /etc/hostname > /dev/null; echo 0 > tracing_on
```

```text
 3)   cat-15175    |               |  do_sys_openat2() {
 3)   cat-15175    |               |    getname() {
 3)   cat-15175    |   0.625 us    |      getname_flags.part.0();
 3)   cat-15175    |   0.917 us    |    }
 3)   cat-15175    |               |    get_unused_fd_flags() {
 3)   cat-15175    |   0.167 us    |      alloc_fd();
 3)   cat-15175    |   0.333 us    |    }
 3)   cat-15175    |               |    do_filp_open() {
 3)   cat-15175    |   5.625 us    |      path_openat();
 3)   cat-15175    |   5.791 us    |    }
 3)   cat-15175    |   0.083 us    |    fd_install();
 3)   cat-15175    |               |    putname() {
 3)   cat-15175    |   0.125 us    |      kmem_cache_free();
 3)   cat-15175    |   0.250 us    |    }
 3)   cat-15175    |   8.583 us    |  }
```

기본 출력에는 task 이름이 없어서 `echo funcgraph-proc > trace_options`로 `cat-15175` 열을 켰습니다. 들여쓰기가 호출 깊이, 왼쪽 숫자가 CPU, 오른쪽이 함수의 전체 실행 시간입니다. `cat`의 첫 열기 8.583 us 중 5.791 us가 경로 탐색(`do_filp_open` → `path_openat`)이었습니다. 같은 기록에서 `cat`의 `do_sys_openat2` 진입은 31번이었습니다. 기호는 ftrace.rst의 "Flags" 표 그대로입니다.

| 기호 | 의미 |
|---|---|
| `+` | 10 us 초과 |
| `!` | 100 us 초과 |
| `#` | 1000 us 초과 |
| `*` | 10 ms 초과 |
| `@` | 100 ms 초과 |
| `$` | 1 s 초과 |

`max_graph_depth`를 1로 하면 진입점만 한 줄씩 남습니다. `cat` 한 번을 감싼 구간에서 `do_sys_openat2`가 33번 지나갔고(같은 시간에 파일을 연 다른 task 포함) 6.708–77.584 us가 걸렸습니다. 특정 프로세스만 보려면 `set_ftrace_pid`로 좁힙니다. 처음 보는 경로라면 깊이 1로 횟수와 시간을 보고, 느린 호출을 골라 깊이를 늘리는 순서가 덜 피곤합니다.

## Latency Tracer — irqsoff·preemptoff·wakeup_rt

RT 시스템에서는 평균보다 최악의 지연이 중요합니다. 평균이 좋아도 한 번의 긴 인터럽트 금지 구간이 deadline을 깨면 소용이 없습니다. ftrace의 latency tracer는 그 "최악의 한 번"을 기록해 두는 장치입니다. ftrace.rst는 각 tracer를 이렇게 정의합니다.

| Tracer | ftrace.rst의 정의 |
|---|---|
| `irqsoff` | 인터럽트를 끈 구간을 추적하고 가장 긴 지연의 trace를 저장 |
| `preemptoff` | irqsoff와 같되 preemption을 끈 시간 |
| `preemptirqsoff` | 인터럽트나 preemption이 꺼진 가장 긴 시간 |
| `wakeup` | 가장 높은 우선순위 task가 깨어난 뒤 스케줄되기까지의 최대 지연 |
| `wakeup_rt` | 같은 측정을 RT task만 대상으로 |
| `wakeup_dl` | `SCHED_DEADLINE` task가 깨어나기까지의 최대 지연 |

최대값은 `tracing_max_latency`에 남고, 새 trace는 이 값보다 클 때만 기록됩니다(같은 문서). 그래서 새 측정 전에 `echo 0 > tracing_max_latency`로 초기화합니다.

그런데 이 Debian 커널에서는 하나도 쓸 수 없었습니다.

```text
$ echo irqsoff > current_tracer
sh: 1: echo: echo: I/O error
$ echo wakeup_rt > current_tracer
sh: 1: echo: echo: I/O error
```

커널 설정이 이유를 보여 줍니다. `/boot/config-6.12.116+deb13-arm64`에는 `# CONFIG_IRQSOFF_TRACER is not set`과 `# CONFIG_SCHED_TRACER is not set`이 있고, 선점 모델이 `CONFIG_PREEMPT_VOLUNTARY=y`입니다. v6.12 `kernel/trace/Kconfig`에서 `PREEMPT_TRACER`는 `depends on PREEMPTION`이라, voluntary 선점 커널에서는 고를 수조차 없습니다. 이 Debian 커널처럼 tracer가 빠져 있을 수 있으므로, 쓰기 전에 `available_tracers`부터 확인합니다. 이 글은 latency tracer를 실제로 돌리지 않았고, 위 표는 문서의 정의만 옮긴 것입니다. 직접 쓰려면 `CONFIG_IRQSOFF_TRACER`·`CONFIG_PREEMPT_TRACER`·`CONFIG_SCHED_TRACER`를 켜고 선점 가능한 커널(`PREEMPT` 또는 `PREEMPT_RT`)을 빌드해야 합니다.

## Event Tracing — Tracepoint 직접 활성화

ftrace는 perf와 같은 tracepoint를 씁니다. `events/` 아래에 이 커널의 이벤트 그룹 디렉터리가 115개 있었고, 각 이벤트의 `enable`에 1을 쓰면 켜집니다. [events.rst @v6.12](https://github.com/torvalds/linux/blob/v6.12/Documentation/trace/events.rst) 5절의 filter 식을 붙이면 버퍼에 들어가기 전에 커널이 걸러 냅니다. `cat`이 CPU를 내놓는 순간만 남겨 봤습니다.

```text
$ echo 'prev_comm == "cat"' > events/sched/sched_switch/filter
$ echo 1 > events/sched/sched_switch/enable
$ echo 1 > tracing_on; cat /etc/hostname > /dev/null; sleep 0.05; echo 0 > tracing_on
           <...>-9875    [004] d....  1699.651922: sched_switch: prev_comm=cat prev_pid=9875 prev_prio=120 prev_state=Z ==> next_comm=swapper/4 next_pid=0 next_prio=120
```

`prev_state=Z`는 종료되어 좀비가 된 `cat`이 마지막으로 CPU를 내놓은 장면입니다. 그룹 전체를 켜려면 상위 디렉터리의 `enable`을 씁니다.

```bash
echo 1 > events/sched/enable             # sched 그룹 전체
echo 1 > events/enable                   # 모든 event
```

## trace-cmd — Wrapper

tracefs 파일을 하나하나 쓰는 대신 `trace-cmd`가 같은 일을 한 줄로 해 줍니다. 결과는 `trace.dat` 파일로 남아 나중에 다시 읽을 수 있습니다.

```text
$ trace-cmd record -q -p function_graph -l 'vfs_*' -o tc.dat cat /etc/hostname
$ ls -l tc.dat
-rw-r--r-- 1 root root 1598896 Nov 16 10:18 tc.dat
$ trace-cmd report -i tc.dat | grep -w cat | head -6
             cat-9912  [004] .....  1702.776509: funcgraph_entry:        0.916 us   |  vfs_open();
             cat-9912  [004] .....  1702.776598: funcgraph_entry:        0.500 us   |  vfs_open();
             cat-9912  [004] .....  1702.776712: funcgraph_entry:        0.584 us   |  vfs_open();
             cat-9912  [004] .....  1702.776714: funcgraph_entry:                   |  vfs_fstat() {
             cat-9912  [004] .....  1702.776714: funcgraph_entry:        0.416 us   |    vfs_getattr_nosec();
             cat-9912  [004] .....  1702.776714: funcgraph_exit:         0.791 us   |  }
```

`cat` 한 번에 1.6 MB 파일이 생겼습니다. 대상 명령 말고도 그 시간에 `vfs_*`를 지난 모든 task가 기록되기 때문입니다. `trace.dat`은 GUI 도구 KernelShark로도 열 수 있지만, 이 guest에서는 설치하지 않았습니다.

## kprobe·uprobe로 동적 trace point 추가

tracepoint가 없는 함수에도 `kprobe_events`에 한 줄을 써서 동적으로 계측점을 걸 수 있습니다. 문법은 [kprobetrace.rst @v6.12](https://github.com/torvalds/linux/blob/v6.12/Documentation/trace/kprobetrace.rst)에 있습니다. 인자는 `%REG`(레지스터)나 `$argN`(N번째 함수 인자)으로 가져오고, 사용자 공간 문자열은 `ustring` 타입으로 읽습니다.

흔히 돌아다니는 x86 예제를 그대로 넣으면 arm64에서는 거부됩니다.

```text
$ echo 'p:my_open do_sys_open filename=+0(%si):string' > kprobe_events
sh: 1: echo: echo: I/O error
```

`%si`는 x86 레지스터 이름입니다. arm64에서는 첫 인자가 `x0`, 둘째가 `x1`이므로 `do_sys_openat2(dfd, filename, how)`의 파일 이름은 `%x1`에 있습니다.

```text
$ echo 'p:my_open do_sys_openat2 dfd=%x0 filename=+0(%x1):ustring' > kprobe_events
$ echo 1 > events/kprobes/my_open/enable
$ echo 1 > tracing_on; cat /etc/hostname > /dev/null; echo 0 > tracing_on
             cat-9884    [004] d....  1699.833005: my_open: (do_sys_openat2+0x0/0x110) dfd=0xffffffffffffff9c filename="/etc/ld.so.cache"
             cat-9884    [004] d....  1699.833010: my_open: (do_sys_openat2+0x0/0x110) dfd=0xffffffffffffff9c filename="/lib/aarch64-linux-gnu/libc.so.6"
             cat-9884    [004] d....  1699.833088: my_open: (do_sys_openat2+0x0/0x110) dfd=0xffffffffffffff9c filename=(fault)
```

`dfd=0x...ff9c`는 -100, 곧 `AT_FDCWD`입니다. 세 번째 줄의 `(fault)`는 probe가 도는 순간 그 사용자 문자열을 읽지 못했다는 표시입니다. kprobetrace.rst는 커널 공간 `string` 타입이 문자열이 담긴 페이지가 paged out이면 실패한다고 적고, `ustring`은 같은 일을 사용자 공간에서 하는 타입이라고 설명합니다. 이 실행에서는 `ustring`으로도 한 번 `(fault)`가 났습니다. 레지스터 이름을 몰라도 되게 `$arg2`로 쓰면 아키텍처와 무관한 정의가 됩니다. kprobetrace.rst는 `$argN`이 함수 진입(offset 0)에서만, 레지스터로 넘어온 인자만 지원한다고 적습니다. 이 커널은 받아들였습니다.

```text
$ echo 'p:my_open2 do_sys_openat2 filename=+0($arg2):ustring' > kprobe_events; cat kprobe_events
p:kprobes/my_open2 do_sys_openat2 filename=+0($arg2):ustring
```

사용자 함수에는 `uprobe_events`를 씁니다. 5-01의 `prog_v1`에서 `hot_function`의 파일 오프셋(`nm`으로 본 `0xac0`)에 걸었습니다.

```text
$ echo "p:hot /root/w/f4/prog_v1:0x0000000000000ac0" > uprobe_events
$ echo 1 > events/uprobes/hot/enable; echo 1 > tracing_on; ./prog_v1 3; echo 0 > tracing_on
$ grep -c 'hot:' trace
3
$ grep 'hot:' trace | head -2
         prog_v1-9898    [004] .....  1700.280362: hot: (0xaaaab78f0ac0)
         prog_v1-9898    [004] .....  1700.346325: hot: (0xaaaab78f0ac0)
```

`./prog_v1 3`은 `hot_function`을 세 번 부르므로 기록도 정확히 3건입니다. 두 호출 사이 간격 약 66 ms가 함수 한 번의 실행 시간입니다.

## 측정 비용

"켜기 전에는 거의 공짜"라는 문서의 설명과 "켠 뒤에는 얼마인가"를 직접 쟀습니다. `perf bench syscall basic -l 1000000`은 `getppid`를 100만 번 부르는 루프입니다. 조건마다 7번 돌린 한 번 호출당 시간의 중앙값입니다(`ftcost.sh`).

| ftrace 상태 | 중앙값 (usecs/op) | baseline 대비 |
|---|---:|---:|
| `nop` (꺼짐) | 0.1156 | 1.0× |
| `function`, 필터 `vfs_read` (경로에 없음) | 0.1145 | 1.0× |
| `function`, 필터 `__arm64_sys_getppid` | 0.1656 | 1.4× |
| `events/raw_syscalls` 켬 | 0.2210 | 1.9× |
| `function`, 필터 없음 | 0.4534 | 3.9× |
| `function_graph`, 필터 없음 | 1.4437 | 12.5× |

필터가 루프 경로 밖의 함수만 고르면 꺼진 것과 차이가 없었습니다. 경로 위 함수 하나를 켜면 1.4배, 전부 켜면 3.9배, `function_graph`로 전부 켜면 12.5배였습니다. `function_graph` 7회는 1.23–2.24 us로 흩어짐도 컸습니다. 같은 조건에서 필터 없는 `function` tracer를 `perf bench sched pipe -l 20000` 동안 켜 두었더니 CPU당 1410 KB 버퍼에 남은 항목은 163385개, 덮어쓴 항목(`overrun`)은 12728245개였습니다. 기록의 99%가 사라진 셈입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Filter 없이 function tracer 활성화

위 측정대로 필터 없는 `function`은 시스템 호출 루프를 3.9배 느리게 했고, 부하 중에는 버퍼가 받은 기록의 99%를 덮어썼습니다. 쉬고 있는 guest에서는 0.1초에 27999개로 버퍼가 남았으니, "얼마나 빨리 차는가"는 부하가 정합니다. `set_ftrace_filter`나 `set_graph_function`으로 먼저 좁힙니다.

> ⚠️ 다른 아키텍처의 kprobe 예제 복사

`%si` 같은 레지스터 이름은 아키텍처마다 다릅니다. `$argN`을 쓰거나 대상 ABI의 인자 레지스터를 확인합니다. 함수 이름도 커널 버전마다 바뀌므로 `available_filter_functions`에서 먼저 찾습니다.

> ⚠️ ring buffer 크기 착각

```text
$ cat buffer_size_kb
7 (expanded: 1408)
```

tracer를 쓰기 전 이 guest의 `buffer_size_kb`는 위처럼 나왔습니다. tracer를 처음 쓸 때 버퍼가 펼쳐지며, v6.12 `kernel/trace/trace.c`의 기본값 `TRACE_BUF_SIZE_DEFAULT`는 `1441792UL`(= 1408 KiB)입니다. 펼쳐진 뒤에는 `1410`이 보였는데, ftrace.rst는 관리용 메타데이터 때문에 실제 할당이 요청보다 조금 클 수 있다고 적습니다. 이 값은 **CPU당** 크기라 `buffer_total_size_kb`는 8 vCPU에서 `11280`이었습니다. 긴 기록에는 늘립니다.

```bash
echo 4096 > buffer_size_kb               # CPU당 4 MiB
```

> ⚠️ tracing_on을 끄지 않고 cat trace

ftrace.rst의 `trace` 파일 설명은 tracing이 켜져 있을 때 "it may produce inconsistent results as it tries to read the entire buffer without consuming it"라고 경고합니다. 일관된 스냅숏이 필요하면 먼저 `echo 0 > tracing_on`을 하고, 흘러가는 기록을 계속 읽으려면 소비형인 `trace_pipe`를 씁니다.

## 정리

- ftrace는 tracefs(`/sys/kernel/tracing`)로 노출되며, 쓸 수 있는 tracer는 `available_tracers`가 알려 줍니다. 이 Debian 커널은 `blk function_graph function nop`뿐이었습니다.
- `function`은 함수 진입을, `function_graph`는 호출 트리와 시간을 보여 줍니다. `max_graph_depth`로 깊이를 조절합니다.
- `irqsoff`·`preemptoff`·`wakeup*`는 커널 설정(`CONFIG_IRQSOFF_TRACER`, `PREEMPTION`에 의존하는 `PREEMPT_TRACER`, `CONFIG_SCHED_TRACER`)이 있어야 생깁니다.
- tracepoint는 ftrace와 perf가 같이 쓰며, `filter` 식으로 커널 안에서 거를 수 있습니다.
- kprobe 인자는 아키텍처의 레지스터 이름(arm64는 `%x0`…)이나 `$argN`으로 가져옵니다.
- 이 환경에서 필터 없는 `function`은 3.9배, `function_graph`는 12.5배 느려졌고, 경로 밖 함수만 고른 필터는 비용이 없었습니다.

다음 편은 **eBPF/bpftrace** — 안전한 커널 내 프로그램으로 분석합니다.

## 관련 항목

- [5-02: perf 고급](/blog/embedded/performance-engineering/part5-02-perf-advanced)
- [5-04: eBPF/bpftrace](/blog/embedded/performance-engineering/part5-04-ebpf)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [Kernel Debugging: ftrace와 tracepoints](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints) — 같은 ftrace로 호출 출처와 hot path 버그를 쫓는 디버깅 쪽
