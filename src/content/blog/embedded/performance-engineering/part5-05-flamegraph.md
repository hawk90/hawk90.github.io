---
title: "Flamegraph 분석 — On-CPU·Off-CPU·Differential"
slug: "embedded/performance-engineering/part5-05-flamegraph"
date: 2026-04-27T09:04:00
description: "Brendan Gregg flamegraph로 on-CPU·off-CPU·차분 분석. perf·BCC stack 수집."
series: "Embedded Performance Engineering"
seriesOrder: 44
tags: [flamegraph, perf, brendan-gregg, off-cpu]
topics: ["embedded"]
---

## 한 줄 요약

> **"Flamegraph는 수천 개의 stack 표본을 한 장의 가로폭으로 압축해, 어디서 시간을 쓰는지 한눈에 보여 줍니다."** 그리고 on-CPU 그림은 기다리는 시간을 보여 주지 않습니다.

## 어떤 문제를 푸는가

`perf report`의 트리는 정확하지만 한 번에 한 경로씩 펼쳐야 합니다. 함수 수십 개에 시간이 고르게 흩어져 있으면 경로를 하나하나 열어 비교하다가 지칩니다.

Flamegraph는 같은 stack을 합쳐 가로폭으로 그립니다. 도시 지도를 위에서 내려다보는 것과 같습니다. 넓은 구역이 시간을 많이 쓴 곳이고, 위로 쌓인 층은 호출 깊이입니다. FlameGraph 저장소의 `flamegraph.pl` 머리 주석은 x축 순서가 시간이 아니라 함수 이름의 **알파벳 순**이라고 적습니다("The order used sorts function names alphabetically"). 시간순으로 보려면 `--flamechart`를 씁니다.

이 글은 perf와 BCC로 stack을 모아 FlameGraph 스크립트로 on-CPU·off-CPU·차분 그림을 만드는 과정을 실제로 돌린 출력으로 설명합니다. 실행 환경은 Apple M2 Pro 위 QEMU 11.1.3 HVF guest(8 vCPU)의 Debian 13 arm64, 커널 `6.12.116+deb13-arm64`, perf 6.12.117, BCC 0.31.0이고, FlameGraph는 GitHub 저장소의 커밋 `41fee1f`(2024-10-21)를 받아 썼습니다.

## 표준 Workflow — perf → flamegraph

FlameGraph 스크립트는 GitHub에서 받습니다. Perl 스크립트라 빌드가 필요 없습니다.

```bash
git clone https://github.com/brendangregg/FlameGraph
```

예제로 "요청 하나 = 파싱(CPU) + 백엔드 대기(sleep) + 로그 fsync(I/O)"인 작은 서버 흉내 프로그램을 씁니다.

```c title="server.c"
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>

static volatile unsigned long sink;

__attribute__((noipa)) static void parse_request(void) {      /* ~2 ms CPU */
    unsigned long x = 1;
    for (long i = 0; i < 3000000; i++) x = x * 6364136223846793005UL + 1;
    sink = x;
}

__attribute__((noipa)) static void wait_backend(void) {        /* 5 ms off-CPU */
    struct timespec ts = {0, 5 * 1000 * 1000};
    nanosleep(&ts, NULL);
}

__attribute__((noipa)) static void log_fsync(int fd) {         /* write + fsync */
    char buf[4096] = {0};
    if (write(fd, buf, sizeof buf) < 0) perror("write");
    fsync(fd);
}

__attribute__((noipa)) static void handle_request(int fd) {
    parse_request();
    wait_backend();
    log_fsync(fd);
}

int main(int argc, char **argv) {
    int n = argc > 1 ? atoi(argv[1]) : 200;
    int fd = open("server.log", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);
    for (int i = 0; i < n; i++) handle_request(fd);
    clock_gettime(CLOCK_MONOTONIC, &t1);
    fprintf(stderr, "%d requests in %.1f ms\n", n,
            (t1.tv_sec - t0.tv_sec) * 1e3 + (t1.tv_nsec - t0.tv_nsec) / 1e6);
    close(fd);
    return 0;
}
```

`gcc -O2 -g -fno-omit-frame-pointer`로 빌드해 `perf stat -e task-clock ./server 50`을 세 번 돌리면 경과 579.2–606.1 ms 중 `task-clock`이 210.47–214.38 ms(`0.352`–`0.370 CPUs utilized`)였습니다. CPU를 쓴 시간은 36% 안팎이고, 나머지는 기다린 시간입니다.

수집과 변환은 네 단계입니다.

```bash
perf record -F 99 -g -o on.data ./server 200          # 1. stack 표본 수집
perf script -i on.data > on.perf                       # 2. 텍스트로 풀기
./stackcollapse-perf.pl on.perf > on.folded            # 3. folded 형식으로 접기
./flamegraph.pl --title 'server on-CPU' on.folded > on.svg   # 4. SVG 그리기
```

200개 요청(1969.6 ms)에서 표본 72개, `perf script` 출력 576줄이 나왔습니다. 2단계 출력은 표본마다 이런 모양입니다.

```text
server   13216  2903.693936:   10101010 task-clock:ppp:
	    aaaac2f60be0 parse_request+0x20 (/root/w/f4/server)
	    aaaac2f60cb3 handle_request+0x13 (/root/w/f4/server)
	    aaaac2f60990 main+0x50 (/root/w/f4/server)
	    ffff94d3225c __libc_start_call_main+0x7c (/usr/lib/aarch64-linux-gnu/libc.so.6)
	    ffff94d3233c __libc_start_main@@GLIBC_2.34+0x9c (/usr/lib/aarch64-linux-gnu/libc.so.6)
	    aaaac2f60ab0 _start+0x30 (/root/w/f4/server)
```

SVG는 14,761바이트였고, 브라우저에서 열면 클릭으로 확대하고 검색할 수 있습니다.

## Collapsed Format 이해

`stackcollapse-perf.pl`이 만드는 folded 형식은 한 줄에 "세미콜론으로 이은 stack, 공백, 값"입니다. 이 서버의 on-CPU 기록은 **단 한 줄**로 접혔습니다.

```text
server;_start;__libc_start_main@@GLIBC_2.34;__libc_start_call_main;main;handle_request;parse_request 727272720
```

CPU 표본 72개가 모두 같은 stack(`parse_request`)이었기 때문입니다. 그리고 값이 72가 아니라 727272720입니다. 2단계 출력의 `10101010`이 표본 하나의 period(이 guest는 hardware 이벤트가 없어 `task-clock`, 단위 ns)이고, 72 × 10101010 = 727272720입니다. 이 기록에서 folded 값은 표본 수가 아니라 period의 합, 즉 나노초였습니다. 그림의 비율은 같지만, 숫자를 읽을 때는 단위를 확인합니다.

형식이 단순하므로 다른 도구가 같은 형식만 내면 같은 `flamegraph.pl`로 그릴 수 있습니다. BCC `profile -f`와 `offcputime -f`가 바로 이 형식을 냅니다. Java는 `jstack` 출력을 `stackcollapse-jstack.pl`로 접습니다. 저장소에는 `stackcollapse-*` 변환기가 perf·DTrace·gdb·Go·Chrome tracing 등 형식별로 들어 있습니다.

## 읽는 법

| 요소 | 의미 |
|------|------|
| 폭 | 그 stack의 folded 값 비율 (on-CPU면 CPU 시간 비율, wall-clock 비율이 아님) |
| 높이 | 호출 깊이 |
| 색상 | 기본 `hot` 팔레트는 이름 해시에 따른 빨강~노랑 무작위 계열로, 구분용일 뿐 의미가 없음 |
| x축 순서 | 함수 이름 알파벳 순 (`--flamechart`는 시간순, stack을 합치지 않음) |

넓은 막대 위에 놓인 좁은 막대들은 그 함수가 부른 자식입니다. 시간이 실제로 쓰인 곳은 위쪽 끝(더 이상 자식이 없는 막대, "plateau")이 넓은 곳입니다.

![Flamegraph 해부 — x축 sample 비율, y축 call depth, hot leaf 강조](/images/blog/perf-eng/diagrams/part5-05-flamegraph-anatomy.svg)

## Off-CPU Flamegraph

on-CPU 그림은 CPU 위에서 찍힌 표본만 담습니다. 위 서버는 경과 시간의 약 64%를 기다렸는데, on-CPU 그림에는 `parse_request` 하나만 보입니다. 식당 주방을 사진으로 찍으면 요리사가 칼질하는 장면만 나오고, 재료 배달을 기다리며 서 있던 시간은 안 나오는 것과 같습니다.

BCC `offcputime`의 man page는 이 도구를 "threads가 block되어 off-CPU였던 stack과 그 총 시간"을 커널 안에서 eBPF map으로 합산한다고 설명합니다. `-f`는 folded 형식, `-d`는 커널과 사용자 stack 사이에 `-` 구분자를 넣으라는 옵션입니다. 400개 요청을 처리하는 동안 2초를 기록했습니다.

```bash
./server 400 &
offcputime-bpfcc -df -p $! 2 > off.folded
./flamegraph.pl --colors=io --title="Off-CPU Time" --countname=us < off.folded > offcpu.svg
```

folded 결과는 4줄이었습니다. 각 줄의 사용자 쪽 위치와 값(마이크로초)만 추리면 다음과 같습니다.

| 사용자 stack 끝 | off-CPU 합계 (us) |
|---|---:|
| `handle_request;wait_backend;nanosleep;...` | 1,106,285 |
| `log_fsync;fsync;...` (두 경로 합) | 155,022 |
| `parse_request` (타이머 인터럽트 뒤 재스케줄) | 46 |

2초 중 1.11초가 백엔드 대기, 0.16초가 `fsync`였습니다. 같은 비율을 on-CPU 그림으로는 전혀 알 수 없습니다. man page는 "this tool only traces off-CPU times that began and ended while tracing"이라고 적으므로, 기록 시작 전에 시작된 대기는 빠집니다.

`perf`의 sched tracepoint로도 off-CPU 그림을 만들 수 있습니다. 저장소의 `stackcollapse-perf-sched.awk`가 그 변환기이고, 머리 주석의 사용법은 `sched:sched_switch`·`sched_stat_sleep`·`sched_stat_blocked`를 `-g`로 기록한 뒤 `perf script -f time,comm,...`을 넘기라고 합니다. 그런데 perf 6.12에서 `-f`는 `--force`라 그대로 치면 "Couldn't find script `time,comm,pid,tid,event,ip,sym,dso,trace'"로 실패합니다. 필드 목록은 `-F`입니다. `-F`로 바꾸고 `kernel.sched_schedstats=1`로 기록했지만 이 guest에서는 folded 결과가 0줄이었고, 원인은 이번에 확인하지 않았습니다. 이 글의 off-CPU 결과는 위 BCC 측정입니다.

## On-CPU와 Off-CPU 함께 보기

두 그림을 나란히 두면 시간이 어디로 갔는지 맞춰 볼 수 있습니다. 이 서버의 요청 하나는 약 10 ms(200개에 1969.6 ms)이고, 그중 on-CPU는 `parse_request`, off-CPU는 `nanosleep`과 `fsync`로 나뉩니다.

| 패턴 | 읽는 법 |
|---|---|
| on-CPU가 넓고 off-CPU가 좁음 | CPU에서 계산하는 시간이 대부분 |
| off-CPU가 넓고 on-CPU가 좁음 | I/O·lock·sleep 대기가 대부분 (이 서버) |
| 둘 다 넓음 | 단계별로 나눠 따로 봄 |
| 둘 다 좁은데 응답이 느림 | 이 프로세스 밖(다른 프로세스, 네트워크 상대편)에서 시간이 감 |

## 차분 Flamegraph — Before/After 비교

개선 전후를 비교할 때는 `difffolded.pl`로 두 folded 파일을 합쳐 차분 그림을 그립니다. 스크립트 머리 주석에 따르면 색은 "higher samples (red) and smaller samples (blue)"이고, **폭은 두 번째 파일** 기준입니다. 두 번째 파일에서 사라진 stack은 폭이 0이 되어 보이지 않으므로, 순서를 바꾸고 `--negate`로 색을 뒤집은 그림도 같이 만들라고 권합니다.

[5-01](/blog/embedded/performance-engineering/part5-01-perf-basics)의 열 우선 `prog_v1`과 행 우선 `prog_v2`로 해 봤습니다. 처음에는 겹치는 stack이 하나도 없었습니다.

```text
$ ./difffolded.pl v1.folded v2.folded | awk '$2>0 && $3>0' | wc -l
0
```

folded의 첫 칸이 프로세스 이름(`prog_v1`, `prog_v2`)이라 모든 stack이 서로 다른 것으로 취급되었습니다. 이름을 맞춘 뒤에는 11개 stack이 짝을 찾았습니다.

```bash
sed 's/^prog_v[12];/prog;/' v1.folded > v1n.folded
sed 's/^prog_v[12];/prog;/' v2.folded > v2n.folded
./difffolded.pl v1n.folded v2n.folded | ./flamegraph.pl --title 'diff v1 -> v2' > diff.svg
```

```text
prog;...;main;process_batch;hot_function 647647647 49049049
prog;...;main;fill;rand;__random;__random_r 92092092 82082082
prog;...;main;fill;rand;__random 16016016 23023023
prog;...;main;process_batch;checksum 7007007 6006006
```

`hot_function`이 647 ms → 49 ms로 줄어 파랗게 칠해지고, 코드가 같은 `fill`·`rand` 경로는 92 ms → 82 ms처럼 비슷하게 남습니다. 회귀가 다른 곳에 생겼다면 그 경로가 빨갛게 보입니다. [5-01의 `perf diff`](/blog/embedded/performance-engineering/part5-01-perf-basics)에서 바이너리 이름 때문에 `-s symbol`이 필요했던 것과 같은 함정입니다.

## Icicle Graph — 거꾸로

`flamegraph.pl --help`의 옵션 설명은 `--inverted`가 "icicle graph", `--reverse`가 "generate stack-reversed flame graph"입니다.

```bash
./flamegraph.pl --inverted < out.folded > icicle.svg
./flamegraph.pl --reverse  < out.folded > reversed-stack.svg
./flamegraph.pl --flamechart < out.folded > chart.svg
```

`--inverted`는 그림을 위아래로 뒤집어 root가 위에 오게 하고, `--reverse`는 각 stack의 frame 순서를 뒤집어 leaf 함수부터 합칩니다. 여러 경로에서 불리는 함수(예: `memcpy`) 하나의 총 비용을 보려면 `--reverse`가 편합니다. 세 옵션 모두 위 서버의 folded로 SVG가 만들어지는 것까지 확인했습니다.

## 색상 옵션

`--colors`에 쓸 수 있는 팔레트는 `--help` 기준으로 `hot`(기본), `mem`, `io`, `wakeup`, `chain`, `java`, `js`, `perl`, `red`, `green`, `blue`, `aqua`, `yellow`, `purple`, `orange`입니다. `flamegraph.pl` 소스에서 확인한 실제 색은 다음과 같습니다.

| 팔레트 | 막대 색 (소스의 rgb 식) | 배경 |
|---|---|---|
| `hot` | 빨강~노랑 (r 205–255, g 0–230, b 0–55) | 노랑 그라데이션 |
| `mem` | 초록~청록 (r 0, g 190–240, b 0–210) | 초록 |
| `io` | 파랑~회청 (r=g 80–140, b 190–245) | 파랑 |
| `wakeup` | `aqua`로 처리 | 파랑 |

```bash
./flamegraph.pl --colors=io --countname=us < off.folded > off.svg
```

`--colors=java`는 README의 예에서 `stackcollapse-perf.pl --all`의 주석과 함께 쓰면 "green == Java, yellow == C++, red == user-mode native, orange == kernel"로 나눕니다.

## 시나리오 — 웹 서비스 응답 시간 분석

위 서버 실험을 실제 서비스에 옮기면 순서는 같습니다.

```bash
# 1. on-CPU 30초
perf record -F 99 -g -p <pid> -- sleep 30
perf script | ./stackcollapse-perf.pl > on.folded
./flamegraph.pl on.folded > on.svg

# 2. off-CPU 30초
offcputime-bpfcc -df -p <pid> 30 > off.folded
./flamegraph.pl --colors=io --countname=us off.folded > off.svg

# 3. 두 SVG를 같이 열고 비교
```

이 글의 서버에서는 2단계가 결론을 바꿨습니다. on-CPU 그림만 보면 `parse_request` 최적화가 답처럼 보이지만, 요청 시간의 대부분은 `wait_backend`였습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Frame pointer와 leaf 함수

이 AArch64 GCC 14.2 빌드는 `-fno-omit-frame-pointer` 없이도 non-leaf 함수에 frame record를 남겼고, perf의 `fp` 체인이 끊기지 않았습니다([5-01](/blog/embedded/performance-engineering/part5-01-perf-basics)). 대신 bpftrace `ustack`에서는 leaf 함수(`hot_function`)의 호출자 `process_batch`가 빠졌습니다([5-04](/blog/embedded/performance-engineering/part5-04-ebpf)). 그림에서 한 층이 이상하게 비면 다른 수집기나 `--call-graph dwarf`로 교차 확인합니다.

> ⚠️ Sampling rate가 너무 낮음

같은 `prog_v1`을 `-F 9`와 `-F 999`로 5번씩 기록해 `hot_function` 비율을 봤습니다.

| `-F` | 표본 수 (5회) | `hot_function` 비율 (5회) |
|---:|---|---|
| 9 | 11, 8, 8, 7, 7 | 90.91%, 87.50%, 87.50%, 85.71%, 85.71% |
| 999 | 916, 1K, 923, 992, 834 | 82.97%, 82.62%, 82.23%, 82.46%, 81.41% |

표본이 7–11개면 비율이 1/7 단위로 움직여 85.7–90.9% 사이를 오갔고, 999 Hz에서는 81.4–83.0%에 모였습니다. 9 Hz 결과는 전부 999 Hz 범위 밖이었습니다. 그림이 넓다고 다 믿지 말고 표본 수를 같이 봅니다.

> ⚠️ On-CPU만 보고 I/O 무시

위 서버에서 on-CPU 그림은 `parse_request` 한 줄이었지만, off-CPU 기록은 2초 중 1.11초가 `wait_backend`였습니다. 응답 시간은 긴데 on-CPU 그림이 단순하면 off-CPU를 먼저 봅니다.

> ⚠️ 이름이 다른 두 바이너리를 차분

`difffolded.pl`은 stack 문자열 전체를 키로 씁니다. 첫 칸의 프로세스 이름이 다르면 겹치는 stack이 0개가 됩니다. 이름을 맞추고 차분합니다.

> ⚠️ 너무 짧은 측정 시간

0.87초 프로그램을 99 Hz로 찍으면 표본은 84개입니다(5-01). 짧은 워크로드는 여러 번 돌려 folded를 합치거나 주파수를 올리고, 표본 수와 반복 간 변동을 같이 기록합니다.

## 정리

- Flamegraph는 folded stack(세미콜론으로 이은 stack + 값)을 SVG로 그립니다. 이 guest의 perf 기록에서 값은 `task-clock` period의 합(ns)이었습니다.
- 폭은 folded 값의 비율, 높이는 호출 깊이입니다. x축은 알파벳 순이고, 기본 색은 구분용입니다.
- On-CPU 그림은 CPU 시간만, off-CPU 그림(BCC `offcputime -f`)은 block된 시간만 보여 줍니다. 이 서버는 2초 중 1.26초가 off-CPU였습니다.
- 차분 그림은 두 번째 파일 폭에 빨강(증가)·파랑(감소)으로 칠합니다. 프로세스 이름을 맞춰야 짝이 생깁니다.
- `stackcollapse-perf-sched.awk` 주석의 `perf script -f` 사용법은 perf 6.12에서 `-F`로 바꿔야 합니다.
- 9 Hz처럼 표본이 적으면 비율이 크게 흔들립니다. 표본 수를 함께 확인합니다.

다음 편은 **ARM DS / Lauterbach** — 임베디드 전용 hardware trace 도구.

## 관련 항목

- [5-04: eBPF/bpftrace](/blog/embedded/performance-engineering/part5-04-ebpf)
- [5-06: ARM DS / Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)
- [5-09: Tracy·Hotspot·uftrace](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
