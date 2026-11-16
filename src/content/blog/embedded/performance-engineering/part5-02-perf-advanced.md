---
title: "Linux perf 고급 — Raw Event·Tracepoint·perf script"
slug: "embedded/performance-engineering/part5-02-perf-advanced"
date: 2026-04-27T09:01:00
description: "perf의 raw event, tracepoint, perf script Python을 사용한 커스텀 분석."
series: "Embedded Performance Engineering"
seriesOrder: 41
tags: [perf, raw-event, scripting, tracepoint]
topics: ["embedded"]
---

## 한 줄 요약

> **"perf의 진짜 힘은 raw event와 perf script에 있으며, 두 가지를 묶으면 사용자 정의 분석기를 만들 수 있습니다."** 단, raw event는 그 장비의 PMU가 실제로 세는지 먼저 확인해야 합니다.

## 어떤 문제를 푸는가

[5-01](/blog/embedded/performance-engineering/part5-01-perf-basics)의 `perf stat`과 `perf record`는 미리 이름 붙은 기본 이벤트에 머뭅니다. 튜닝 현장에서는 특정 코어의 마이크로아키텍처 이벤트를 번호로 지정하거나, 커널 tracepoint로 스케줄러 동작을 기록하거나, 기록한 표본을 내 질문에 맞는 표로 가공해야 할 때가 옵니다.

이 글은 그 세 가지를 실제로 돌린 출력으로 설명합니다. 실행 환경은 5-01과 같습니다. Apple M2 Pro 위 QEMU 11.1.3 HVF guest(8 vCPU)의 Debian 13 arm64, 커널 `6.12.116+deb13-arm64`, perf `6.12.117`이고, PMU 이벤트 문법은 같은 이미지를 `-accel tcg -cpu max`로 띄운 guest에서 따로 확인했습니다. 예제 프로그램 `prog_v1`은 5-01의 열 우선 행렬 합산입니다.

명령 옵션은 v6.12 소스 트리의 `tools/perf/Documentation/`([perf-stat.txt](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-stat.txt), [perf-record.txt](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-record.txt), [perf-report.txt](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-report.txt), [perf-sched.txt](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-sched.txt))와 대조했습니다.

## perf list — 사용 가능한 이벤트 둘러보기

`perf list`는 이 장비·커널·perf 빌드 조합에서 쓸 수 있는 이벤트 메뉴판입니다. 같은 perf 바이너리라도 메뉴는 장비마다 다릅니다.

```bash
perf list                    # 모든 event
perf list hw                 # hardware event
perf list sw                 # software event
perf list cache              # hardware cache event
perf list 'sched:*'          # tracepoint 패턴
```

HVF guest에서 돌린 결과입니다. 전체 목록은 1728줄이었지만 `hw`와 `cache`는 빈 출력이었습니다. PMU가 사이클 카운터 하나만 보이는 guest라서입니다([5-01](/blog/embedded/performance-engineering/part5-01-perf-basics) 참고).

```text
$ perf list sw
  alignment-faults                                   [Software event]
  bpf-output                                         [Software event]
  cgroup-switches                                    [Software event]
  context-switches OR cs                             [Software event]
  cpu-clock                                          [Software event]
  cpu-migrations OR migrations                       [Software event]
  dummy                                              [Software event]
  emulation-faults                                   [Software event]
  major-faults                                       [Software event]
  minor-faults                                       [Software event]
  page-faults OR faults                              [Software event]
  task-clock                                         [Software event]
...
$ perf list 'sched:*' | head -3
  sched:sched_kthread_stop                           [Tracepoint event]
  sched:sched_kthread_stop_ret                       [Tracepoint event]
  sched:sched_kthread_work_execute_end               [Tracepoint event]
```

`sched:` tracepoint는 29개였습니다. 이벤트는 다섯 부류로 나뉩니다.

| 부류 | 예 | 누가 세는가 |
|---|---|---|
| Hardware event | `cycles`, `instructions`, `branch-misses` | CPU PMU (generic 이름) |
| Hardware cache event | `L1-dcache-loads`, `LLC-load-misses` | CPU PMU (generic 이름) |
| Software event | `context-switches`, `page-faults`, `cpu-clock` | 커널 |
| Tracepoint | `sched:sched_switch`, `syscalls:sys_enter_read` | 커널 정적 계측 지점 |
| Raw PMU event | `r11`, `armv8_pmuv3_0/event=0x11/` | CPU PMU (아키텍처·코어별 번호) |

### Raw event — 번호로 지정하기

Raw event는 PMU에 넣을 이벤트 번호를 직접 주는 방식입니다. 라디오 주파수를 채널 이름 대신 숫자로 맞추는 것과 같습니다. 숫자가 맞는지는 PMU의 `format`이 정합니다.

```text
$ cat /sys/bus/event_source/devices/armv8_pmuv3_0/format/event
config:0-15
```

이 PMU에서 이벤트 번호는 `config`의 하위 16비트입니다. 그리고 `events/` 디렉터리에는 PMU가 지원한다고 알린 이벤트만 이름으로 올라옵니다. TCG guest에서는 네 개였습니다.

```text
$ ls /sys/bus/event_source/devices/armv8_pmuv3_0/events
cpu_cycles stall stall_backend stall_frontend
$ cat /sys/bus/event_source/devices/armv8_pmuv3_0/events/cpu_cycles
event=0x0011
```

그래서 같은 이벤트를 세 가지로 쓸 수 있습니다. 이름(`cpu_cycles`), `event=` 항, `r` 접두 raw 번호입니다. 셋 다 같은 값을 냈습니다.

```text
$ perf stat -e armv8_pmuv3_0/cpu_cycles/,armv8_pmuv3_0/event=0x11/,r11,r03,r04 ./prog_v1 1
        6987448000      armv8_pmuv3_0/cpu_cycles/
        6987448000      armv8_pmuv3_0/event=0x11/
        6987447000      r11
                 0      r03
                 0      r04
```

여기서 **`r03`·`r04`가 오류 없이 `0`**으로 나온 것이 함정입니다. v6.12 `include/linux/perf/arm_pmuv3.h`에서 0x0003은 `ARMV8_PMUV3_PERFCTR_L1D_CACHE_REFILL`, 0x0004는 `ARMV8_PMUV3_PERFCTR_L1D_CACHE`이지만, QEMU 11.1.0 `target/arm/cpregs-pmu.c`의 지원 이벤트 표에는 없습니다. TCG guest의 PMU는 모르는 번호를 받아 주고 세지 않았습니다. 반면 HVF guest는 같은 `r03,r04`와 `armv8_pmuv3_0/event=0x17/`을 `<not supported>`로 거부했습니다. 0이 "일어나지 않음"인지 "세지 않음"인지는 `events/` 목록과 코어 TRM의 이벤트 표로 가립니다.

PMU 이름도 장비가 정합니다. 흔히 예제에 나오는 `armv8_pmuv3/...`는 이 guest에 없는 이름이라 perf가 이렇게 거부했습니다.

```text
$ perf stat -e armv8_pmuv3/l2d_cache_refill/ ./prog_v1 1
event syntax error: 'armv8_pmuv3/l2d_cache_refill/'
                     \___ Bad event or PMU
Unable to find PMU or event on a PMU of 'armv8_pmuv3'
...
                                 \___ unknown term 'l2d_cache_refill' for pmu 'armv8_pmuv3_0'
```

PMU 이름은 `/sys/bus/event_source/devices/`에 있는 디렉터리 이름(여기서는 `armv8_pmuv3_0`)을 씁니다. 그 PMU가 `l2d_cache_refill`을 알리지 않았으므로 이름으로도 쓸 수 없습니다.

## Hardware Event 묶음 측정

이벤트를 쉼표로 나열하면 각각 따로 스케줄됩니다. 중괄호로 묶은 **group**은 "항상 같은 구간에 함께 올라가는" 단위입니다. 비율(IPC처럼 두 값을 나누는 지표)을 낼 때 분모와 분자가 같은 구간에서 세어졌다는 보장이 필요하면 group을 씁니다.

```bash
perf stat -e cycles,instructions,cache-misses ./app        # 독립 이벤트
perf stat -e '{cycles,instructions,cache-misses}' ./app    # group
```

group은 하나라도 올라갈 수 없으면 통째로 안 셉니다. HVF guest에서는 group 안의 `cycles`가 지원되지 않아 시작부터 실패했습니다.

```text
$ perf stat -e '{cycles,instructions,cache-misses}' ./prog_v1 1
Error:
The cycles event is not supported.
```

카운터가 7개인 TCG guest에서 `r11` 9개를 group으로 묶었을 때는 7개가 `<not counted>`, 2개가 `<not supported>`였고, 쉼표로 나열했을 때는 각각 약 78% 시간만 돌고 보정된 값이 나왔습니다(5-01의 multiplex 예). 대상 장비에서 group 크기가 카운터 수를 넘지 않게 짜고, 결과의 `<not counted>`와 괄호 안 비율을 먼저 봅니다.

## Software Event와 시스템 동작

Software event는 커널이 직접 세므로 PMU가 없는 guest에서도 그대로 나옵니다.

```text
$ perf stat -e context-switches,cpu-migrations,page-faults,minor-faults,major-faults ./prog_v1 1
                 0      context-switches
                 0      cpu-migrations
               595      page-faults
               595      minor-faults
                 0      major-faults
```

`page-faults` 595개는 모두 minor였습니다. 64 MiB `malloc` 영역을 처음 건드릴 때 생긴 폴트이고 디스크를 읽지 않았습니다. 페이지 캐시를 비운 뒤 다시 돌리면 major가 하나 생깁니다.

```text
$ sync; echo 3 > /proc/sys/vm/drop_caches; perf stat -e page-faults,minor-faults,major-faults ./prog_v1 1
               594      page-faults
               593      minor-faults
                 1      major-faults
```

| Event | 의미 | 이 실행에서 |
|---|---|---|
| `context-switches` | 컨텍스트 스위치 횟수 | 0 (1회 반복, 약 0.23초) |
| `cpu-migrations` | 다른 CPU로 옮겨진 횟수 | 0 |
| `page-faults` | 페이지 폴트 합계 | 594–595 |
| `minor-faults` | 저장장치 I/O 없이 해결된 폴트 | 593–595 |
| `major-faults` | 저장장치에서 읽어 와야 했던 폴트 | 캐시를 비운 뒤에만 1 |

그 한 건이 어느 주소였는지는 `perf trace -F maj`(perf-trace.txt "Trace pagefaults")로 찍습니다. 같은 조건에서 돌린 결과입니다.

```text
$ sync; echo 3 > /proc/sys/vm/drop_caches; perf trace -F maj --no-syscalls ./prog_v1 1
     0.000 ( 0.000 ms): prog_v1/8774 majfault [__arch_clear_user+0x10] => 0xaaaae6eb0068 (?k)
```

커널의 `__arch_clear_user`가 `prog_v1` 매핑 안의 주소 `0xaaaae6eb0068`을 0으로 채우다가 폴트가 났습니다. 프로그램 적재 중 실행 파일의 데이터 페이지를 디스크에서 다시 읽어야 했던 한 건입니다.

## Tracepoint — 커널 이벤트

Tracepoint는 커널 개발자가 소스에 미리 박아 둔 계측 지점입니다. 도로의 과속 카메라처럼 위치가 정해져 있고, 켜 둔 카메라만 기록합니다. `perf record -e`로 켜고 `perf script`로 읽습니다.

```text
$ perf record -e sched:sched_switch -a -o sw.data sleep 1
[ perf record: Captured and wrote 0.117 MB sw.data (101 samples) ]
$ perf script -i sw.data | head -5
            perf    8121 [000]  1283.814216: sched:sched_switch: perf:8121 [120] R ==> migration/0:20 [0]
     migration/0      20 [000]  1283.814225: sched:sched_switch: migration/0:20 [0] S ==> swapper/0:0 [120]
            perf    8121 [001]  1283.814499: sched:sched_switch: perf:8121 [120] R ==> migration/1:23 [0]
     migration/1      23 [001]  1283.814510: sched:sched_switch: migration/1:23 [0] S ==> swapper/1:0 [120]
            perf    8121 [002]  1283.814529: sched:sched_switch: perf:8121 [120] R ==> migration/2:28 [0]
```

한 줄은 "CPU [000]에서 `perf`(pid 8121, 우선순위 120, 상태 R)가 `migration/0`에게 CPU를 넘겼다"는 뜻입니다. 1초 동안 8개 CPU의 전환이 101건이었습니다. 처음 몇 줄은 `perf` 자신이 CPU [000], [001], [002] 순서로 옮겨 다니며 `migration/N`에게 CPU를 넘기는 모습이라, 측정 도구 자체가 기록에 나타난다는 점도 보입니다.

자주 쓰는 tracepoint 부류와 이 guest의 `perf list '<접두사>:*'` 개수입니다.

| 접두사 | 다루는 영역 | 개수 |
|---|---|---:|
| `sched:` | 스케줄러 | 29 |
| `syscalls:` | 시스템 호출 진입·복귀 | 628 |
| `irq:` | 인터럽트 핸들러·softirq·tasklet | 7 |
| `block:` | 블록 I/O | 21 |
| `net:` | 네트워크 송수신 | 16 |
| `kmem:` | 커널 메모리 할당 | 12 |

## perf record와 Call Graph

call graph 수집 방식(`fp`·`dwarf`·`lbr`)의 차이와 실측은 [5-01의 Call Graph 절](/blog/embedded/performance-engineering/part5-01-perf-basics)에 있습니다. Arm guest에서 `lbr`은 "PMU Hardware or event type doesn't support branch stack sampling"으로 거부되었고, `dwarf`는 `fp`보다 약 60배 큰 파일을 만들었습니다. 여기서는 그렇게 모은 그래프를 **어느 방향으로 펼칠지**를 봅니다.

```bash
perf report -g graph,0.5,caller
perf report -g graph,0.5,callee
```

`graph,0.5`는 0.5% 미만 가지를 숨기라는 뜻입니다. perf-report.txt는 order를 이렇게 정의합니다. `callee`는 "callee based call graph", `caller`는 "inverted caller based call graph"이고, 기본값은 `--children`이면 `caller`, 아니면 `callee`입니다. 같은 기록을 두 방향으로 펼친 결과입니다.

```text
$ perf report -i g.data --stdio --no-children -g graph,0.5,caller --sort sym
    81.01%  [.] hot_function
            |
            ---__libc_start_main@@GLIBC_2.34
               __libc_start_call_main
               main
               process_batch
               hot_function

$ perf report -i g.data --stdio --no-children -g graph,0.5,callee --sort sym
    81.01%  [.] hot_function
            |
            ---process_batch
               main
               __libc_start_call_main
               __libc_start_main@@GLIBC_2.34
               _start
```

`caller`는 시작점(`__libc_start_main`)에서 내려가고, `callee`는 표본이 찍힌 함수에서 호출자 쪽으로 올라갑니다. "이 hot 함수를 누가 불렀나"가 궁금하면 `callee`, "main에서 시작해 어디로 시간이 흘러갔나"가 궁금하면 `caller`입니다.

## perf script — Python 후처리

`perf script`는 기록을 한 줄씩 텍스트로 풀어 주고, `-s`로 Python 스크립트를 붙이면 이벤트마다 함수를 호출해 줍니다. 엑셀 매크로처럼 표본 하나하나를 내 손으로 집계할 수 있습니다. Debian perf 빌드에 Python 지원이 들어 있는지부터 확인합니다.

```text
$ perf version --build-options | grep -i python
             libpython: [ on  ]  # HAVE_LIBPYTHON_SUPPORT
```

`-g python`은 기록에 들어 있는 이벤트에 맞춘 뼈대를 만들어 줍니다. 위 `sw.data`로 만든 `perf-script.py`의 `sched_switch` 콜백 선언은 다음과 같았습니다.

```python
def sched__sched_switch(event_name, context, common_cpu,
	common_secs, common_nsecs, common_pid, common_comm,
	common_callchain, prev_comm, prev_pid, prev_prio, prev_state,
	next_comm, next_pid, next_prio, perf_sample_dict):
```

이 선언을 그대로 써서 "comm별 on-CPU 시간"을 내는 스크립트를 만들었습니다. CPU마다 마지막으로 들어온 task와 시각을 기억해 두고, 다음 전환에서 그 차이를 더합니다.

```python title="oncpu.py"
from collections import defaultdict

since = {}                      # cpu -> (comm, t_ns) of the task switched in
oncpu = defaultdict(int)        # comm -> ns
nswitch = defaultdict(int)

def sched__sched_switch(event_name, context, common_cpu,
        common_secs, common_nsecs, common_pid, common_comm,
        common_callchain, prev_comm, prev_pid, prev_prio, prev_state,
        next_comm, next_pid, next_prio, perf_sample_dict):
    t = common_secs * 1_000_000_000 + common_nsecs
    if common_cpu in since:
        comm, t0 = since[common_cpu]
        oncpu[comm] += t - t0
    since[common_cpu] = (next_comm, t)
    nswitch[next_comm] += 1

def trace_end():
    print(f"{'comm':16} {'on-CPU ms':>10} {'switch-in':>10}")
    busy = {c: ns for c, ns in oncpu.items() if not c.startswith("swapper")}
    for comm, ns in sorted(busy.items(), key=lambda kv: -kv[1])[:6]:
        print(f"{comm:16} {ns / 1e6:10.3f} {nswitch[comm]:10d}")
```

입력은 아래 `perf sched` 절에서 기록한 `sched.data`(`perf bench sched pipe -l 20000`)입니다. idle task(`swapper/N`)는 뺐습니다.

```text
$ perf script -i sched.data -s oncpu.py
comm              on-CPU ms  switch-in
sched-pipe          213.951      39975
perf-exec             8.020          1
perf                  7.691         15
sshd-session          0.196          2
ksoftirqd/5           0.074          1
systemd-journal       0.049          1
```

두 프로세스가 파이프로 2만 번 주고받는 벤치마크라 `sched-pipe`가 약 4만 번 CPU에 들어왔습니다. 이 스크립트는 기록 시작 전부터 돌던 task의 첫 구간과 기록 끝의 마지막 구간을 세지 않으므로, 짧은 기록에서는 그 차이만큼 작게 나옵니다.

## perf top — 실시간 hotspot

`perf top`의 기본 표본 주파수(4000 Hz, `builtin-top.c`)와 `--stdio` 실행 결과는 [5-01](/blog/embedded/performance-engineering/part5-01-perf-basics)에 있습니다. 이 글의 이벤트 지정은 `perf top`에도 그대로 붙습니다.

```bash
perf top -p 1234
perf top -e sched:sched_switch
perf top -g
```

## perf sched — 스케줄러 분석

`perf sched record`는 워크로드의 스케줄링 이벤트를 기록하고(perf-sched.txt), `latency`·`timehist`·`map`이 그 기록을 task별 대기 시간 표나 시간순 목록으로 바꿔 줍니다. 식당에 비유하면 손님(task)이 줄을 선 시각과 자리에 앉은 시각을 모두 적어 두었다가 "평균 몇 분, 최대 몇 분 기다렸나"를 계산하는 도구입니다.

```text
$ perf sched record -o sched.data -- perf bench sched pipe -l 20000
# Executed 20000 pipe operations between two processes
     Total time: 0.423 [sec]
      21.158800 usecs/op
          47261 ops/sec
[ perf record: Captured and wrote 17.530 MB sched.data (160097 samples) ]
```

0.42초 벤치마크에 16만 건, 17.5 MB가 쌓였습니다. 스케줄 이벤트 전부를 기록하므로 짧게 돌립니다.

```text
$ perf sched -i sched.data latency
  Task                  |   Runtime ms  |  Count   | Avg delay ms    | Max delay ms    | Max delay start           | Max delay end          |
  kworker/u32:0-w:11    |      0.009 ms |        1 | avg:   0.040 ms | max:   0.040 ms | max start:  1288.667582 s | max end:  1288.667622 s
  perf:8151             |      7.642 ms |        2 | avg:   0.028 ms | max:   0.030 ms | max start:  1288.845672 s | max end:  1288.845703 s
...
  sched-pipe:(2)        |    242.991 ms |    39956 | avg:   0.009 ms | max:   0.872 ms | max start:  1288.811220 s | max end:  1288.812091 s
...
```

`sched-pipe` 두 프로세스는 39956번 스케줄되면서 평균 0.009 ms, 최대 0.872 ms를 기다렸습니다. 평균이 작아도 최대가 100배 가까이 큽니다. RT task라면 이 최대값과 그 시각(`max start`)이 다음 조사의 출발점입니다. `timehist`는 같은 기록을 시간순으로, `map`은 CPU별 열로 보여 줍니다.

```text
$ perf sched -i sched.data timehist | head -6
           time    cpu  task name                       wait time  sch delay   run time
                        [tid/pid]                          (msec)     (msec)     (msec)
--------------- ------  ------------------------------  ---------  ---------  ---------
    1288.412999 [0000]  perf[8151]                          0.000      0.000      0.000
    1288.413016 [0000]  migration/0[20]                     0.000      0.001      0.016
    1288.413043 [0001]  perf[8151]                          0.000      0.000      0.000
$ perf sched -i sched.data map | head -4
  *A0                                1288.412999 secs A0 => migration/0:20
  *.                                 1288.413016 secs .  => swapper:0
   .  *B0                            1288.413043 secs B0 => migration/1:23
   .  *.                             1288.413052 secs
```

perf-sched.txt의 설명대로 `map`의 열은 CPU, 두 글자는 그 CPU에서 도는 task, `*`는 이벤트가 난 CPU, `.`은 idle CPU입니다. `timehist`의 `sch delay`는 runnable이 된 뒤 실제로 돌기까지의 시간입니다.

## perf mem과 perf c2c

`perf mem`은 perf-mem.txt의 표현으로 "memory operation data"를 모으는 도구이고, `perf c2c`는 "cacheline contentions"를 추적하며 HITM 접근이 많은 캐시 라인을 먼저 보여 줍니다(perf-c2c.txt). 여러 CPU가 같은 캐시 라인을 두고 다투는 false sharing을 찾을 때 씁니다. 둘 다 PMU의 메모리 표본 기능에 기대므로, PMU가 없는 이 guest에서는 기록 단계에서 멈췄습니다.

```text
$ perf mem record -o mem.data ./prog_v1 1
failed: no PMU supports the memory events
$ perf c2c record -o c2c.data ./prog_v1 1
failed: no PMU supports the memory events
```

이 오류가 나면 도구 문제가 아니라 장비 문제입니다. 실제 보드에서 같은 오류가 나면 그 코어에 메모리 표본 기능이 있는지 TRM에서 먼저 확인합니다. false sharing을 PMU 없이 재현·측정하는 방법은 [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)에서 다룹니다.

## Sampling Overhead 측정

표본 주파수(`-F`)와 call graph 방식에 따른 비용은 5-01에서 프로그램 자체 타이머로 쟀습니다. 9999 Hz까지는 실행 간 흩어짐 안이었고, 99999 Hz(상한 `perf_event_max_sample_rate` = 100000 바로 아래)에서 중앙값이 약 10% 늘었습니다. `-c`는 주파수 대신 "이벤트 N번마다 한 표본"을 정합니다(perf-record.txt "Event period to sample").

```text
$ perf record -e task-clock -c 1000000 -o c.data ./prog_v1 10
[ perf record: Captured and wrote 0.035 MB c.data (862 samples) ]
$ perf report -i c.data --stdio --sort sym | grep -E 'Samples|Event count'
# Samples: 862  of event 'task-clock'
# Event count (approx.): 862000000
```

`task-clock`의 단위는 나노초이므로 `-c 1000000`은 1 ms마다 한 표본입니다. 862개 × 10⁶ ns = 0.862초가 `Event count`와 정확히 맞습니다.

Tracepoint 기록 비용은 이벤트 빈도에 비례합니다. 초당 수만 번 스케줄되는 `perf bench sched pipe -l 50000`을 7번씩 돌려 한 왕복 시간의 중앙값을 비교했습니다(`tpcost.sh`).

| 조건 | 중앙값 (usecs/op) | 7회 범위 |
|---|---:|---|
| perf 없음 | 19.06 | 18.02–20.83 |
| `perf stat -e sched:sched_switch` (세기만) | 21.31 | 20.04–21.60 |
| `perf record -e sched:sched_switch` | 18.92 | 15.19–22.46 |
| `perf record -g -e sched:sched_switch` | 24.38 | 22.00–25.04 |
| `perf record -e 'sched:*'` (29개) | 32.00 | 29.68–32.51 |

`sched_switch` 하나만 기록할 때는 baseline과 범위가 겹쳤습니다. 같은 이벤트에 call graph를 붙이면 중앙값이 약 28%, `sched:*` 전부를 켜면 약 68% 늘었습니다. `-g` 조건의 마지막 실행이 남긴 `tp.data`는 34 MB였습니다. "tracepoint는 무겁다/가볍다"보다 "몇 개를, 스택까지 기록하는가"가 비용을 정합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Raw event의 `0`을 "일어나지 않음"으로 읽기

TCG guest의 `r03`·`r04`는 지원하지 않는 번호인데도 오류 없이 `0`이었습니다. `events/` 목록에 없는 번호는 코어 TRM으로 확인하고, 일부러 이벤트를 일으키는 작은 프로그램으로 값이 움직이는지 봅니다.

> ⚠️ 다른 장비의 PMU 이름 복사

예제의 `armv8_pmuv3/...`는 이 guest에서 "Bad event or PMU"였습니다. PMU 이름은 `/sys/bus/event_source/devices/`에서 읽습니다.

> ⚠️ Multiplex된 event를 정확하다고 믿기

```bash
perf stat -e e1,e2,e3,e4,e5,e6,e7,e8 ./app
```

카운터 수를 넘는 요청은 시간 분할되고 보정값이 나옵니다. 괄호 안 비율과 `<not counted>`를 확인합니다. 실측 예는 5-01에 있습니다.

> ⚠️ Tracepoint를 와일드카드로 몽땅 켜기

`sched:*` 하나로 pipe 왕복 시간이 약 68% 늘었습니다. 필요한 이벤트만 이름으로 켜고, 스택은 꼭 필요할 때만 붙입니다.

> ⚠️ `perf sched record`를 길게 돌리기

0.42초 벤치마크에 17.5 MB가 쌓였습니다. 스케줄 이벤트가 많은 시스템에서는 몇 초만 돌려도 수백 MB가 됩니다. 재현 구간을 좁혀 짧게 기록합니다.

## 정리

- `perf list`의 결과는 장비마다 다릅니다. 이 HVF guest는 `hw`·`cache`가 비어 있었고 software event와 tracepoint만 있었습니다.
- Raw event는 `rNN` 또는 `<pmu>/event=0xNN/`로 지정합니다. PMU 이름과 지원 번호는 `/sys/bus/event_source/devices/<pmu>/`의 `format`·`events`에서 읽습니다.
- 지원하지 않는 raw 번호가 `0`으로 나올 수 있습니다(TCG의 `r03`·`r04`).
- Group은 함께 올라가지 못하면 통째로 `<not counted>`가 됩니다.
- `perf script -g python`이 만든 콜백 선언 그대로 comm별 on-CPU 집계기를 만들 수 있습니다.
- `perf sched latency`는 평균 0.009 ms, 최대 0.872 ms처럼 평균에 묻힌 꼬리를 보여 줍니다.
- `perf mem`·`perf c2c`는 PMU 메모리 표본 기능이 필요합니다. 이 guest에서는 "no PMU supports the memory events"였습니다.
- Tracepoint 비용은 개수와 스택 수집이 정합니다. `sched_switch` 하나는 잡음 안, `-g`는 약 28%, `sched:*`는 약 68%였습니다.

다음 편은 **ftrace 활용** — 커널 내부 흐름을 추적합니다.

## 관련 항목

- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-03: ftrace 활용](/blog/embedded/performance-engineering/part5-03-ftrace)
- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [DWARF: Call Frame Information](/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame) — `--call-graph dwarf`가 콜스택을 복원할 때 읽는 CFI
