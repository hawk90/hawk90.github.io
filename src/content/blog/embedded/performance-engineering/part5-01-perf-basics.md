---
title: "Linux perf 기초 — stat·record·report 활용"
slug: "embedded/performance-engineering/part5-01-perf-basics"
date: 2026-04-27T09:00:00
description: "Linux perf 표준 도구의 세 가지 핵심 명령. 설치, 권한, 그리고 첫 측정부터 핫스팟 분석까지."
series: "Embedded Performance Engineering"
seriesOrder: 40
tags: [perf, profiling, sampling, linux]
topics: ["embedded"]
---

## 한 줄 요약

> **"`perf stat`으로 얼마나 걸리는지 보고, `perf record`·`perf report`로 어디서 걸리는지 봅니다."** 그리고 그 전에 이 장비에서 어떤 이벤트가 실제로 세어지는지부터 확인합니다.

## 어떤 문제를 푸는가

코드를 읽고 "여기가 느릴 것 같다"고 짐작해 고치는 것은 지도 없이 길을 찾는 것과 같습니다. 이 글의 예제도 그렇습니다. 같은 행렬을 더하는 두 함수가 있는데, 소스만 보면 차이가 한 줄(루프 순서)뿐입니다. 그런데 실제로 재어 보면 한쪽이 13배 느립니다.

Linux perf는 커널의 `perf_event_open(2)` 위에 있는 사용자 공간 도구입니다. 카운터를 세는 `perf stat`, 표본을 모으는 `perf record`, 표본을 함수별로 보여 주는 `perf report`가 기본 세 명령입니다. 이 글은 그 세 명령과 `perf annotate`·`perf top`·`perf diff`를 실제로 돌린 출력으로 설명합니다.

**실행 환경.** 이 글의 출력은 모두 Apple M2 Pro 위 QEMU 11.1.3(`-M virt -accel hvf -cpu host`, 8 vCPU) 안의 Debian 13 arm64 guest에서 얻었습니다. 커널은 `6.12.116+deb13-arm64`, perf는 `6.12.117`, 컴파일러는 GCC 14.2.0입니다. 하드웨어 PMU 이벤트가 필요한 절은 같은 이미지를 `-accel tcg -cpu max`로 띄운 두 번째 guest에서 돌렸고, 그 결과가 실제 CPU 사이클이 아니라는 점을 해당 절에 적었습니다. 호스트는 다른 작업과 공유했습니다. 같은 실행을 10번 반복한 `perf stat -r 10`의 흩어짐은 ±1.30%였지만, 가끔 2배 가까이 튄 실행(734.2 ms 대신 1499.9 ms, 아래 표의 2589.3 ms·1099.5 ms)도 섞였습니다.

## 측정 대상 — 열 우선과 행 우선 합산

이 글 전체에서 쓰는 예제입니다. 4096×4096 `int` 행렬(64 MiB)을 `hot_function`이 여러 번 합산합니다. 기본 빌드는 열 방향(`j` 바깥, `i` 안쪽)으로 돌고, `-DROW_MAJOR`로 빌드하면 행 방향으로 돕니다. `noipa`는 GCC가 같은 호출을 하나로 합쳐 루프 밖으로 빼지 못하게 막습니다.

```c title="prog.c"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define N 4096
static int *m;

__attribute__((noipa)) static void fill(void) {
    for (long i = 0; i < (long)N * N; i++) m[i] = rand() & 0xff;
}

__attribute__((noipa)) static long hot_function(void) {
    long s = 0;
#ifdef ROW_MAJOR
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) s += m[i * N + j];
#else
    for (int j = 0; j < N; j++)
        for (int i = 0; i < N; i++) s += m[i * N + j];
#endif
    return s;
}

__attribute__((noipa)) static long checksum(void) {
    long s = 0;
    for (long i = 0; i < (long)N * N; i++) s ^= m[i];
    return s;
}

__attribute__((noipa)) static long process_batch(int reps) {
    long s = 0;
    for (int r = 0; r < reps; r++) s += hot_function();
    return s + checksum();
}

int main(int argc, char **argv) {
    int reps = argc > 1 ? atoi(argv[1]) : 10;
    m = malloc(sizeof(int) * N * N);
    fill();
    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);
    long r = process_batch(reps);
    clock_gettime(CLOCK_MONOTONIC, &t1);
    printf("%ld\n", r);
    fprintf(stderr, "process_batch %.1f ms\n",
            (t1.tv_sec - t0.tv_sec) * 1e3 + (t1.tv_nsec - t0.tv_nsec) / 1e6);
    free(m);
    return 0;
}
```

빌드는 세 가지입니다. `prog_nofp`는 뒤의 call graph 절에서 frame pointer 옵션의 효과를 보려고 따로 만듭니다.

```bash
gcc -O2 -g -fno-omit-frame-pointer -o prog_v1 prog.c
gcc -O2 -g -fno-omit-frame-pointer -DROW_MAJOR -o prog_v2 prog.c
gcc -O2 -g -o prog_nofp prog.c
```

프로그램이 직접 잰 `process_batch` 시간을 세 번씩 재 보니 열 우선은 734.2·696.8·1499.9 ms, 행 우선은 55.4·56.0·54.5 ms였습니다(`./prog_v1 10`, `./prog_v2 10`). 중앙값으로 734.2 ms 대 55.4 ms, 약 13배입니다. 열 우선의 1499.9 ms 한 번은 호스트 공유 환경에서 튄 값이고, 이런 값이 섞이므로 이 글의 비교는 모두 중앙값으로 합니다.

## perf 설치와 권한

Debian 13에서 perf는 `linux-perf` 패키지에 들어 있습니다. 설치한 perf는 실행 중인 커널(6.12.116)과 패치 번호가 하나 다른 6.12.117이었고, 이 글의 명령은 모두 그 조합에서 동작했습니다.

```bash
apt-get install linux-perf
perf --version          # perf version 6.12.117
```

권한은 `kernel.perf_event_paranoid` sysctl과 capability가 정합니다. 건물 출입증에 비유하면 sysctl 값은 "출입증 없는 방문객이 어디까지 들어올 수 있는가"이고, capability는 특정 사람에게 주는 출입증입니다. 커널 문서([admin-guide/sysctl/kernel.rst @v6.12](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/sysctl/kernel.rst#perf_event_paranoid))는 기본값을 2로 적고, 값마다 `CAP_PERFMON`이 없는 사용자에게 막는 범위를 이렇게 정의합니다.

| 값 | `CAP_PERFMON` 없는 사용자에게 막는 것 |
|---|---|
| -1 | (거의) 막지 않음, `perf_event_mlock_kb` 한도도 무시 |
| ≥0 | ftrace function tracepoint, raw tracepoint |
| ≥1 | CPU 단위 이벤트(`-a`, `-C`) |
| ≥2 | 커널 프로파일링 |

그런데 Debian guest의 값은 2가 아니라 3이었습니다.

```text
$ cat /proc/sys/kernel/perf_event_paranoid
3
```

3은 upstream에 없는 값입니다. Debian 커널 패치 [`security-perf-allow-further-restriction-of-perf_event_open.patch`](https://salsa.debian.org/kernel-team/linux/-/blob/debian/6.12/trixie/debian/patches/features/all/security-perf-allow-further-restriction-of-perf_event_open.patch)(trixie 6.12 브랜치)가 추가한 것으로, 패치 설명은 "3 이상이면 `CAP_SYS_ADMIN`이 없는 사용자의 모든 perf 이벤트 접근을 막는다"이고, `perf_event_open` 진입부에 `perf_paranoid_any() && !capable(CAP_SYS_ADMIN)`이면 `-EACCES`를 돌려주는 검사를 넣습니다. 그래서 Debian에서는 `CAP_PERFMON`만 준 바이너리도 막힙니다. 실제로 `nobody` 사용자로 확인했습니다.

```bash
install -m 755 /usr/bin/perf /usr/local/bin/perfcap
setcap cap_perfmon=ep /usr/local/bin/perfcap
```

| `perf_event_paranoid` | 명령 (`nobody`로 실행) | 결과 |
|---|---|---|
| 3 | `perf stat -e task-clock true` | `Error: Access to performance monitoring ... is limited.` |
| 3 | `perfcap stat -a -e task-clock sleep 0.1` | `Error:` (`CAP_PERFMON`으로도 거부) |
| 2 | `perf stat -e task-clock ./prog_v1 1` | `234.34 msec task-clock:u` (사용자 공간만, `:u`) |
| 2 | `perf stat -a -e task-clock sleep 0.1` | `Error:` (`>= 1: Disallow CPU event access`) |
| 2 | `perfcap stat -a -e task-clock sleep 0.1` | `828.53 msec task-clock`, `8.003 CPUs utilized` |

정리하면 upstream 의미대로라면 개발자에게는 `perf_event_paranoid`를 낮추는 것보다 perf 바이너리에 `CAP_PERFMON`을 주는 쪽이 범위가 좁습니다. [perf-security.rst @v6.12](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/perf-security.rst)는 Linux 5.9부터 `CAP_SYS_PTRACE` 없이 `CAP_PERFMON`만으로 충분하다고 적습니다. 다만 Debian처럼 값이 3이면 먼저 2로 내려야 capability가 의미를 가집니다. 상시 적용은 sysctl 파일로 합니다.

```bash
echo 'kernel.perf_event_paranoid = 2' | sudo tee /etc/sysctl.d/99-perf.conf
```

## perf stat — 첫 측정

`perf stat`은 프로그램 한 번 실행 동안의 카운터 합계를 보여 줍니다. 자동차 계기판의 누적 주행 거리처럼 "어디서"는 모르고 "얼마나"만 압니다. 인자 없이 돌리면 perf가 기본 이벤트 묶음을 고릅니다.

```text
$ perf stat ./prog_v1 10

 Performance counter stats for './prog_v1 10':

            874.90 msec task-clock                       #    0.999 CPUs utilized
                 3      context-switches                 #    3.429 /sec
                 0      cpu-migrations                   #    0.000 /sec
               594      page-faults                      #  678.935 /sec
   <not supported>      cycles
   <not supported>      instructions
   <not supported>      branches
   <not supported>      branch-misses

       0.875424897 seconds time elapsed

       0.871391000 seconds user
       0.003997000 seconds sys
```

위 네 줄은 커널이 세는 **software event**라 어디서나 나옵니다. 아래 네 줄은 CPU의 PMU가 세는 **hardware event**인데, 이 HVF guest에서는 전부 `<not supported>`입니다. 부팅 로그에 PMU 드라이버가 사이클 카운터 하나만 보였습니다.

```text
hw perfevents: enabled with armv8_pmuv3_0 PMU driver, 1 (0,80000000) counters available
```

이 HVF guest처럼 PMU 카운터가 guest에 보이지 않으면 이렇게 됩니다. 그래서 숫자를 해석하기 전에 `<not supported>`·`<not counted>` 줄이 있는지부터 봅니다. 이벤트를 직접 고르면 결과가 더 분명합니다.

```text
$ perf stat -e cycles,instructions,cache-references,cache-misses ./prog_v1 10
   <not supported>      cycles
   <not supported>      instructions
   <not supported>      cache-references
   <not supported>      cache-misses
```

### 에뮬레이션 PMU에서 본 cycles

같은 이미지를 TCG(`-accel tcg -cpu max`)로 띄우면 PMU 드라이버가 `7 (0,8000003f) counters available`로 올라옵니다. 이번에는 `cycles`가 세어집니다(TCG는 느려서 반복 횟수를 1로 줄였습니다).

```text
$ perf stat -e cycles,instructions,cache-references,cache-misses ./prog_v1 1
       12518147000      cycles
   <not supported>      instructions
   <not supported>      cache-references
   <not supported>      cache-misses

      12.615047072 seconds time elapsed
```

하지만 이 숫자는 CPU 사이클이 아닙니다. QEMU 11.1.3 소스 `target/arm/cpregs-pmu.c`에서 `CPU_CYCLES`(0x011)는 `qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL)`에 `ARM_CPU_FREQ`(`1000000000`, 주석 "FIXME: 1 GHz")를 곱해 만든 값입니다. 경과 12.6초에 12.5×10⁹ "cycles"가 나온 것은 그 때문입니다. `INST_RETIRED`(0x008)는 `icount_enabled() == ICOUNT_PRECISE`일 때만 지원되어 위처럼 `<not supported>`이고, 캐시 이벤트는 표에 없습니다. 에뮬레이터 카운터로는 IPC나 캐시 미스율을 낼 수 없다는 것을 기억해 두면 됩니다.

### 반복 측정

`-r`은 같은 명령을 여러 번 돌리고 평균과 상대 표준편차를 보여 줍니다.

```text
$ perf stat -r 10 ./prog_v1 10
 Performance counter stats for './prog_v1 10' (10 runs):

            888.97 msec task-clock                       #    1.000 CPUs utilized               ( +-  1.30% )
                 4      context-switches                 #    4.500 /sec                        ( +- 14.65% )
                 0      cpu-migrations                   #    0.000 /sec
               594      page-faults                      #  668.187 /sec                        ( +-  0.03% )
...
            0.8894 +- 0.0116 seconds time elapsed  ( +-  1.30% )
```

`task-clock`의 ±1.30%는 이 실행 10번의 흩어짐입니다. `context-switches`는 4번 안팎이라 ±14.65%처럼 상대값이 커 보여도 절대값은 작습니다. 평균만 보지 말고 이 `+-` 열을 같이 읽어야 "두 버전이 정말 다른가"를 판단할 수 있습니다.

## perf record / report — 핫스팟 찾기

`stat`이 누적 주행 거리라면 `record`는 일정 간격으로 찍는 위치 사진입니다. 표본마다 PC와 call stack을 저장하고, `report`가 그 사진을 함수별로 셉니다. 아래는 99 Hz로 call graph까지 모은 예입니다.

```text
$ perf record -F 99 -g -o v1.data ./prog_v1 10
[ perf record: Woken up 1 times to write data ]
[ perf record: Captured and wrote 0.018 MB v1.data (84 samples) ]
```

0.86초를 99 Hz로 찍었으니 표본은 84개입니다. hardware `cycles`가 없는 환경이라 perf는 software 이벤트 `task-clock`으로 바꿔 샘플링했고, report 머리에 그 이름이 그대로 나옵니다.

```text
$ perf report -i v1.data --stdio --no-children --sort comm,dso,sym
# Samples: 84  of event 'task-clock:ppp'
# Event count (approx.): 848484840
#
# Overhead  Command  Shared Object  Symbol
    80.95%  prog_v1  prog_v1        [.] hot_function
            |
            ---hot_function
               process_batch
               main
               __libc_start_call_main
               __libc_start_main@@GLIBC_2.34
               _start
     8.33%  prog_v1  libc.so.6      [.] __random_r
            |
            ---__random_r
               __random
               rand
               fill
               main
...
```

`Overhead`는 선택한 이벤트 표본 중 그 항목에 떨어진 비율입니다. 여기서는 시간 기반 표본이므로 "CPU 시간의 81%가 `hot_function` 안"이라고 읽습니다. `--children`을 켜면 호출자 쪽에서 본 누적 비율이 트리로 나옵니다.

```text
$ perf report -i v1.data --stdio --children --sort sym
# Children      Self  Symbol
   100.00%     0.00%  [.] _start
            |
            ---__libc_start_main@@GLIBC_2.34
               __libc_start_call_main
               main
               |
               |--82.14%--process_batch
               |          |
               |          |--80.95%--hot_function
               |          |
               |           --1.19%--checksum
               |
                --17.86%--fill
                          |
                          |--16.67%--rand
...
```

초기화(`fill`)가 17.86%, 본 작업(`process_batch`)이 82.14%로 나뉘는 것이 한눈에 보입니다.

명령어 단위 분포는 `perf annotate`로 봅니다.

```text
$ perf annotate -i v1.data --stdio -s hot_function
 Percent |	Source code & Disassembly of prog_v1 for task-clock:ppp (68 samples, percent: local period)
...
         : 10  for (int j = 0; j < N; j++)
         : 11  for (int i = 0; i < N; i++) s += m[i * N + j];
    0.00 :   ad4:    add     x3, x2, #0x4, lsl #12
    0.00 :   ad8:    mov     x0, x2
    0.00 :   adc:    nop
   72.06 :   ae0:    ldr     d30, [x0]
    0.00 :   ae4:    add     x0, x0, #0x4, lsl #12
    5.88 :   ae8:    saddw   v31.2d, v31.2d, v30.2s
    0.00 :   aec:    cmp     x1, x0
   22.06 :   af0:    b.ne    ae0 <hot_function+0x20>  // b.any
         : 25  for (int j = 0; j < N; j++)
    0.00 :   af4:    add     x2, x2, #0x8
...
```

디스어셈블리가 두 가지를 알려 줍니다. 첫째, GCC가 안쪽 루프를 `ldr d30`(8바이트, 즉 `int` 두 개)과 `saddw`로 바꿔 열 두 개를 한 번에 더합니다(바깥 루프가 `x2`를 8씩 늘림). 둘째, 안쪽 루프의 주소 증가가 `#0x4, lsl #12` = 16384바이트입니다. 한 행이 4096×4 = 16 KiB이므로 매 load가 앞 load와 16 KiB 떨어진 곳을 읽습니다. 표본의 72%가 그 load에 떨어졌습니다. 다만 timer 기반 표본은 정확히 그 명령어에서 멈춘 것이 아니라 근처에 찍힐 수 있으므로(`b.ne`의 22.06%도 같은 루프 몸체입니다), "이 load 줄이 범인"보다 "이 루프의 메모리 접근 패턴이 후보"로 읽고 다음 측정으로 확인합니다. 여기서는 루프 순서만 바꾼 `prog_v2`가 734.2 ms → 55.4 ms(중앙값)로 줄어든 것이 그 확인입니다.

## Call Graph 수집 방식

`-g`는 `--call-graph fp`와 같습니다. [perf-record.txt @v6.12](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-record.txt)는 사용자 공간 기본값이 `fp`이고, 선택지가 `fp`·`dwarf`·`lbr` 셋이라고 적습니다. 그리고 `-fomit-frame-pointer`로 빌드한 바이너리에서는 `fp`가 "bogus call graphs"를 만들 수 있으니 `dwarf`를 쓰라고 하고, `lbr`은 "new Intel platforms"에서만 된다고 합니다. Arm guest에서 세 방식을 모두 돌려 봤습니다.

```text
$ perf record -F 999 --call-graph lbr -o lbr.data ./prog_v1 10
Error:
cycles:PH: PMU Hardware or event type doesn't support branch stack sampling.
```

`lbr`은 문서대로 거부됩니다. `fp`는 `-fno-omit-frame-pointer` 없이 빌드한 `prog_nofp`에서도 체인이 끊기지 않았습니다.

```text
$ perf record -F 999 --call-graph fp -o nofp.data ./prog_nofp 10
$ perf report -i nofp.data --stdio --no-children --sort sym
    81.24%  [.] hot_function
            |
            ---process_batch
               main
               __libc_start_call_main
               __libc_start_main@@GLIBC_2.34
               _start
```

이유는 생성된 코드에 있습니다. `gcc -Q --help=optimizers -O2`는 `-fomit-frame-pointer [enabled]`로 나오지만, 두 바이너리의 `process_batch` 첫머리는 똑같이 frame record를 만듭니다.

```text
0000000000000b40 <process_batch>:
 b40:	stp	x29, x30, [sp, #-48]!
 b44:	mov	x29, sp
```

이 빌드(Debian GCC 14.2.0, AArch64)에서는 옵션 이름과 실제 결과가 달랐습니다. 그래서 "`-O2`면 체인이 깨진다"를 전제하지 말고, 대상 툴체인의 디스어셈블리에서 `stp x29, x30`이 있는지 먼저 봅니다. 다른 아키텍처나 다른 컴파일러라면 같은 확인을 대상 툴체인에서 다시 합니다.

`dwarf`는 표본마다 사용자 스택을 통째로 복사합니다(기본 8192바이트, 같은 문서). 같은 프로그램에서 파일 크기 차이가 분명했습니다.

| 방식 | 표본 수 | perf.data 크기 |
|---|---:|---:|
| `--call-graph fp` | 837 | 120,808 B |
| `--call-graph dwarf` | 846 | 7,255,152 B |

크기가 약 60배입니다. 게다가 이 guest에는 glibc 디버그 정보가 없어서 `dwarf` 체인의 libc 구간이 `0x29ffff8213233b` 같은 주소로 끝났습니다. `dwarf`는 unwind 정보가 있는 바이너리에서만 이름을 돌려줍니다.

## perf top — 실시간 모니터

`perf top`은 `htop`의 함수 단위 판입니다. 돌고 있는 프로세스에 붙여 화면을 계속 갱신합니다. 출력이 TTY가 아닐 때를 위해 `--stdio`로 돌린 결과입니다.

```text
$ perf top --stdio -d 2 -E 6 -p $(pidof prog_v1)
   PerfTop:    3693 irqs/sec  kernel: 0.0%  exact:  0.0% lost: 0/0 drop: 0/0 [4000Hz task-clock:ppp],  (target_pid: 3413)
-------------------------------------------------------------------------------
    99.99%  prog_v1        [.] hot_function
     0.01%  prog_v1        [.] process_batch
```

`[4000Hz ...]`는 perf top의 기본 표본 주파수입니다(`tools/perf/builtin-top.c`의 `.freq = 4000`). `perf record`의 99 Hz 예보다 40배 촘촘하므로, 오래 붙여 둘 때는 `-F`로 낮춥니다. `-p` 없이 쓰면 시스템 전체(`-a`)라서 앞 절 표대로 `perf_event_paranoid` 1 이상에서는 권한이 필요합니다.

## perf diff — 최적화 효과 비교

두 record 결과를 나란히 놓고 함수별 비중 변화를 봅니다. 그런데 처음 돌리면 같은 함수가 두 줄로 갈립니다.

```text
$ perf record -F 999 -o before.data ./prog_v1 10
$ perf record -F 999 -o after.data  ./prog_v2 10
$ perf diff before.data after.data
# Baseline  Delta Abs  Shared Object      Symbol
     9.91%    +30.29%  libc.so.6          [.] __random_r
              +23.53%  prog_v2            [.] hot_function
...
    81.47%             prog_v1            [.] hot_function
```

기본 정렬 키에 `dso`가 들어 있어서 `prog_v1`과 `prog_v2`의 `hot_function`이 서로 다른 항목입니다. `-s symbol`로 짝을 맞춥니다.

```text
$ perf diff -s symbol before.data after.data
# Baseline  Delta Abs  Symbol
    81.47%    -57.94%  [.] hot_function
     9.91%    +30.29%  [.] __random_r
     1.17%     +8.15%  [.] __aarch64_cas4_acq
     3.26%     +7.03%  [.] __random
     1.40%     +4.48%  [.] rand
...
```

여기서 `-57.94%`를 "58% 빨라졌다"로 읽으면 틀립니다. [perf-diff.txt @v6.12](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-diff.txt)의 `delta`는 `A->period_percent - B->period_percent`, 즉 **각 파일 안에서의 비율 차이**입니다(기본 `delta-abs`는 같은 값을 절댓값으로 정렬할 뿐입니다). `hot_function`이 빨라지자 두 프로그램에서 똑같이 도는 초기화 코드(`fill`이 부르는 `rand`·`__random_r`)의 비중이 상대적으로 커졌고, 그래서 코드가 바뀌지 않은 이 함수들에 `+`가 붙었습니다. 표본 수도 858개에서 204개로 줄었습니다. 절대 시간의 변화는 `perf stat -r`이나 프로그램 자체 타이머(여기서는 706.5 ms → 54.5 ms)로 따로 증명합니다. `perf diff`는 "병목이 어디로 옮겨 갔는가"를 보여 주는 도구입니다.

## 결과 해석 — IPC와 Cache Miss

hardware 이벤트가 있는 장비에서는 `perf stat`이 `instructions` 줄 옆에 `insn per cycle`을 함께 찍습니다.

$$\text{IPC} = \frac{\text{instructions}}{\text{cycles}}$$

v6.12 `drivers/perf/arm_pmuv3.c`의 generic 이벤트 표를 보면 Arm에서 `cycles`는 `CPU_CYCLES`, `instructions`는 `INST_RETIRED`, `stalled-cycles-frontend`/`-backend`는 `STALL_FRONTEND`/`STALL_BACKEND`로 연결됩니다. IPC가 낮게 나오면 다음 묶음으로 좁혀 갑니다.

```bash
perf stat -e cache-references,cache-misses ./prog
perf stat -e branches,branch-misses ./prog
perf stat -e stalled-cycles-frontend,stalled-cycles-backend ./prog
```

이 글의 두 guest에서는 이 진단을 끝까지 할 수 없었습니다. HVF guest는 세 묶음 모두 `<not supported>`였고, TCG guest는 stall 이벤트를 받아들였지만 값이 둘 다 `0`이었습니다.

```text
$ perf stat -e stalled-cycles-frontend,stalled-cycles-backend ./prog_v1 1
                 0      stalled-cycles-frontend
                 0      stalled-cycles-backend
```

QEMU 소스가 이유를 그대로 적고 있습니다. `STALL_FRONTEND`(0x023)와 `STALL_BACKEND`(0x024)의 `get_count`가 `zero_event_get_count`이고, 그 함수의 주석은 "For events which on QEMU never fire, so their count is always zero"입니다. **0은 "stall이 없다"가 아니라 "세지 않는다"**입니다. 실제 Cortex-A 보드에서 이 진단을 할 때는 그 코어의 TRM이 정의한 PMU 이벤트 목록을 기준으로 합니다(→ [2-10: PMU 활용](/blog/embedded/performance-engineering/part2-10-pmu)).

## 자주 보는 함정과 안티패턴

> ⚠️ Symbol이 없는 바이너리

`strip`한 바이너리를 기록했는데도 처음에는 `hot_function` 이름이 나왔습니다. `strip`이 build-id를 남기고, 앞서 기록한 `prog_v1`이 같은 build-id로 `~/.debug` 캐시에 들어 있었기 때문입니다. 캐시를 빈 디렉터리로 돌리면 진짜 모습이 나옵니다.

```text
$ perf --buildid-dir /tmp/emptybid report -i strip.data --stdio --sort dso,sym
# Overhead  Shared Object      Symbol
    64.98%  prog_strip         [.] 0x0000000000000ae0
...
```

`hot_function`의 load 명령어 주소(`0xae0`)만 남고 이름이 사라졌습니다. `readelf -n`으로 보면 `prog_strip`과 `prog_v1`의 Build ID가 `30b21fb7…`로 같았습니다. 배포 바이너리를 strip한다면 분석 장비에 같은 build-id의 디버그 파일을 따로 두어야 합니다.

> ⚠️ Sampling rate 과도

표본 주파수를 바꿔 가며 프로그램 자신의 타이머로 `process_batch` 시간을 7번씩 잰 중앙값입니다(같은 guest, `overhead3.sh`).

| 모드 | 중앙값 | 7회 범위 | perf.data |
|---|---:|---|---:|
| perf 없음 | 684.6 ms | 669.5–718.5 | — |
| `-F 99` | 711.9 ms | 700.1–716.9 | 27,828 B |
| `-F 999` | 703.7 ms | 682.2–718.9 | 58,548 B |
| `-F 9999` | 711.7 ms | 680.4–714.8 | 368,884 B |
| `-F 99999` | 755.5 ms | 720.6–1099.5 | 3,706,736 B |
| `-F 999 --call-graph fp` | 712.8 ms | 675.3–2589.3 | 123,436 B |
| `-F 999 --call-graph dwarf` | 720.8 ms | 698.0–898.9 | 7,528,876 B |

9999 Hz까지는 perf 없는 실행과의 차이가 실행 간 흩어짐(약 50 ms) 안에 있었습니다. 99999 Hz에서는 중앙값이 약 10% 늘고, 7번 중 3번이 939–1100 ms로 튀었습니다. 이 커널의 상한은 `perf_event_max_sample_rate` = `100000`이었으므로 `-F 99999`는 거의 상한입니다. `fp` 열의 2589.3 ms 한 번은 원인을 확인하지 못한 튐이고, 나머지 6회는 675–867 ms였습니다. 정리하면 이 환경에서 비용은 주파수보다 **파일 크기**로 먼저 드러났고, 99 Hz와 99999 Hz 사이에 133배 차이가 났습니다.

> ⚠️ 가상 머신에서 숫자를 그대로 믿기

이 HVF guest에서는 hardware 이벤트가 전부 `<not supported>`였고, perf는 경고 없이 `task-clock`으로 바꿔 샘플링했습니다(report 머리의 `task-clock:ppp`). 에뮬레이터의 `cycles`는 가상 시계에서 나온 값이고, stall 이벤트는 0으로 고정입니다. 결과를 공유할 때는 report 머리의 이벤트 이름을 같이 붙입니다.

> ⚠️ Multiplex된 결과를 정확하다고 믿기

PMU 카운터보다 많은 이벤트를 요청하면 커널이 시간을 나눠 돌리고, perf는 실행된 비율로 값을 늘려 추정합니다. perf-stat.txt의 `--no-scale` 옵션 설명("Don't scale/normalize counter values")이 기본 동작이 그 보정이라는 것을 보여 줍니다. TCG guest(카운터 7개)에서 같은 `r11`(CPU_CYCLES)을 6개와 9개 요청해 봤습니다.

```text
$ perf stat -e r11,r11,r11,r11,r11,r11 ./prog_v1 1
        6374931000      r11
        6374934000      r11
...
$ perf stat -e r11,r11,r11,r11,r11,r11,r11,r11,r11 ./prog_v1 1
        5924947207      r11                                                                     (77.82%)
        5924157692      r11                                                                     (77.85%)
...
        5924740158      r11                                                                     (78.02%)
```

6개일 때는 비율 표시가 없고 값이 사실상 같습니다. 9개일 때는 각 이벤트가 시간의 약 78%만 돌았고, 값은 그 비율로 늘린 추정치라 서로 조금씩 다릅니다. 9개를 `{...}` 그룹으로 묶으면 함께 올라갈 수 없어서 7개는 `<not counted>`, 2개는 `<not supported>`가 됩니다. 괄호 안 비율이 보이면 그 숫자는 추정치입니다.

> ⚠️ Production 서버에서 paranoid를 -1로

```bash
echo -1 > /proc/sys/kernel/perf_event_paranoid
```

-1은 위 표대로 `CAP_PERFMON` 없는 모든 사용자에게 (거의) 모든 이벤트와 mlock 한도 무시를 엽니다. 공용 서버라면 특정 바이너리에 `CAP_PERFMON`을 주는 쪽이 범위가 좁습니다.

## 정리

- Debian 13에서는 `linux-perf` 패키지이고, 기본 `perf_event_paranoid`가 upstream의 2가 아니라 Debian 패치의 3이라 `CAP_SYS_ADMIN` 없이는 아무것도 안 됩니다.
- `perf stat` 출력의 `<not supported>`·`<not counted>`·`(77.82%)`를 먼저 읽습니다. 가상 머신에서는 hardware 이벤트가 없을 수 있습니다.
- `perf record -g` + `perf report`로 81%가 `hot_function`에 있음을 찾았고, `perf annotate`로 16 KiB 간격 load 루프를 확인했습니다.
- 이 AArch64 GCC 14.2 빌드는 `-fno-omit-frame-pointer` 없이도 frame record를 남겼습니다. 툴체인마다 디스어셈블리로 확인합니다. `dwarf`는 비슷한 표본 수에 약 60배 큰 파일을 만들었습니다.
- `perf diff`의 Delta는 파일 안 비율의 차이입니다. 절대 시간 개선은 `perf stat -r`이나 타이머로 따로 보입니다.
- 이 환경에서 9999 Hz까지는 실행 시간 차이가 잡음 안이었고, 99999 Hz에서 중앙값 약 10% 증가와 큰 꼬리가 보였습니다.

다음 편은 **perf 고급** — raw event, tracepoint, perf script Python으로 들어갑니다.

## 관련 항목

- [5-02: perf 고급](/blog/embedded/performance-engineering/part5-02-perf-advanced)
- [1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
- [2-10: PMU 활용](/blog/embedded/performance-engineering/part2-10-pmu)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
