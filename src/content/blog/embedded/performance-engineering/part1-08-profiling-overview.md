---
title: "프로파일링 기법 개요 — Sampling vs Instrumentation·PGO·LTO"
slug: "embedded/performance-engineering/part1-08-profiling-overview"
date: 2026-04-23T09:08:00
description: "Sampling과 instrumentation의 수집 방식과 해석상 주의점을 비교합니다. perf·gprof·PGO·LTO를 살펴봅니다."
series: "Embedded Performance Engineering"
seriesOrder: 8
tags: [profiling, sampling, instrumentation, gprof, perf, pgo, lto]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **Sampling은 표본 기반 추정이고, instrumentation은 실행 경로에 계측 hook을 넣습니다.** overhead와 해석 한계는 도구와 환경에 따라 확인해야 합니다.

## 이 글의 예제

모든 도구를 같은 프로그램 하나로 돌렸습니다. `foo()`가 `bar()`를 45,000번(5회 × 9,000), `baz()`를 5번 부르고, 자기 루프도 하나 갖습니다. 실행 환경은 Debian 13 arm64 게스트(QEMU HVF), GCC 14.2, perf 6.12, Valgrind 3.24입니다. 소스는 `bench/prof/prof.c`에 있습니다.

```c
__attribute__((noinline)) void bar(int n){ uint64_t x=g; for(int i=0;i<n;i++) x=x*2862933555777941757ULL+3037000493ULL; g=x; }
__attribute__((noinline)) void baz(int n){ uint64_t x=g; for(int i=0;i<n;i++) x^=x<<7, x^=x>>9; g=x; }
__attribute__((noinline)) void foo(void){
  for(int k=0;k<9000;k++) bar(20000);     /* most of the time */
  baz(10000000);                          /* some */
  uint64_t x=g; for(int i=0;i<15000000;i++) x+=i*i; g=x;   /* foo self */
}
int main(void){ for(int r=0;r<5;r++) foo(); printf("%llu\n",(unsigned long long)g); return 0; }
```

## Sampling Profiling

일정한 간격으로 실행을 멈춰 그 순간의 PC(와 call stack)를 기록하고, 함수별 표본 수로 시간 비율을 추정합니다. 코드를 고치지 않고, 표본 간격을 넓히면 비용이 줄어듭니다. 대신 표본이 적게 떨어지는 짧은 함수는 추정이 거칩니다. 표본 수는 대략 "주파수 × 실행 시간"입니다.

```bash title="perf-sampling"
perf record -e cpu-clock -F 999 -g -o perf.data -- ./prof
perf report --stdio --no-children -i perf.data
```

이 게스트에는 하드웨어 PMU 카운터가 없어서(1-01) `-e cycles` 대신 소프트웨어 타이머 이벤트 `cpu-clock`을 썼습니다. 결과는 1,195개 표본이었고, self 기준 상위는 다음과 같습니다.

```text
# Samples: 1K of event 'cpu-clock'
# Event count (approx.): 1196196195
# Overhead  Command  Shared Object      Symbol
    92.13%  prof     prof               [.] bar
     5.44%  prof     prof               [.] baz
```

999 Hz로 약 1.2초를 돌았으니 표본 수가 맞습니다. 같은 실행 파일을 `perf stat -e task-clock`으로 세 번 돌리면 task-clock은 1,312.69 / 1,228.32 / 1,288.23 ms였습니다.

### 대표 도구

- **perf** (Linux): 주파수는 `-F`, 이벤트는 `-e`로 줍니다.
- **gprof**: 아래 instrumentation 절에서 보듯 PC 샘플링과 호출 계측을 함께 씁니다.
- **Instruments** (macOS), **Visual Studio Profiler** (Windows)

## Instrumentation Profiling

함수 진입·종료에 코드를 넣어 호출을 *모두* 셉니다. 표본이 아니므로 호출 횟수는 정확하지만, 넣은 코드만큼 실행이 바뀝니다.

GCC 14.2 매뉴얼에 따르면 `-finstrument-functions`는 함수 진입 직후와 종료 직전에 `__cyg_profile_func_enter(this_fn, call_site)`/`__cyg_profile_func_exit()`를 현재 함수 주소와 호출 위치를 넘겨 부르고, `no_instrument_function` 속성이 붙은 함수에는 이 계측을 하지 않습니다. hook 함수 자신에 이 속성을 붙여야 hook이 hook을 부르지 않습니다. 진입 횟수만 세는 hook을 붙여 예제를 돌렸습니다(`bench/prof/hooks.c`, `-no-pie`로 빌드해 `addr2line`으로 이름을 찾음).

| 함수 | 진입 횟수 |
|---|---:|
| `main` | 1 |
| `foo` | 5 |
| `bar` | 45,000 |
| `baz` | 5 |

이 예제는 호출이 1초에 4만 5천 번뿐이라, 계측한 빌드와 안 한 빌드의 실행 시간이 다섯 번 모두 1.05~1.17 s 범위로 구분되지 않았습니다. hook 비용은 호출마다 들기 때문에 호출 횟수가 많은 코드일수록 커집니다. 이 글에서는 호출이 많은 경우를 따로 재지 않았습니다.

`-pg`는 이것과 다른 옵션입니다. GNU gprof 매뉴얼의 "Implementation of Profiling"에 따르면 `-pg`는 모든 함수가 `mcount`를 부르게 컴파일해 호출 그래프를 기록하고, 따로 PC를 대략 초당 100번 샘플링해 히스토그램을 만듭니다.

```bash
gcc -O2 -pg -o prof-pg prof.c && ./prof-pg && gprof -b -p prof-pg gmon.out
```

```text
Each sample counts as 0.01 seconds.
  %   cumulative   self              self     total
 time   seconds   seconds    calls  ms/call  ms/call  name
 90.92      1.07     1.07    45000     0.02     0.02  bar
  8.50      1.17     0.10        5    20.05    20.05  baz
  0.85      1.18     0.01        5     2.01   236.64  foo
```

`calls` 열은 `mcount`가 센 정확한 값(45,000, 5, 5)이고, 시간 열은 0.01초 표본에서 나온 추정입니다. `cumulative seconds`는 inclusive 시간이 *아닙니다*. gprof 매뉴얼 "The Flat Profile"은 이 열을 "이 함수와 표에서 이 함수보다 위에 있는 모든 함수가 쓴 시간의 누계"로 정의합니다. 그래서 `foo`의 cumulative 1.18은 bar + baz + foo의 합일 뿐입니다. 함수의 inclusive 시간은 `total ms/call`(foo 236.64 ms/call)이나 call graph(`gprof -q`)의 `children` 열에서 봅니다.

### 대표 도구

- **gprof**: `-pg`. 호출 수는 계측, 시간은 샘플링입니다.
- **callgrind** (Valgrind): 프로그램을 Valgrind 위에서 실행하며 명령어를 셉니다. 시간이 아니라 실행한 명령어 수(Ir)를 줍니다.
- **bpftrace·BCC** (eBPF): 실행 중인 커널과 프로세스에 probe를 붙입니다.

callgrind로 같은 예제를 돌리면 inclusive 명령어 수가 나옵니다(`valgrind --tool=callgrind`, `callgrind_annotate --inclusive=yes`).

```text
4,000,864,524 (100.0%)  PROGRAM TOTALS
4,000,765,145 (100.0%)  prof.c:foo [/root/prof/prof]
3,600,585,000 (90.00%)  prof.c:bar [/root/prof/prof]
  250,000,045 ( 6.25%)  prof.c:baz [/root/prof/prof]
```

bar의 비율은 perf(92.13%), gprof(90.92%), callgrind(90.00%)가 비슷하지만 baz는 5.44%, 8.50%, 6.25%로 갈립니다. 앞의 둘은 시간 표본이고 callgrind는 명령어 수라서, 명령어당 cycle이 다른 함수끼리는 비율이 달라집니다.

## Self vs Children (Inclusive vs Exclusive)

같은 perf 기록을 `--children`으로 보면 함수마다 두 숫자가 나옵니다.

```bash
perf report --stdio --children --sort symbol -g none -i perf.data
```

```text
# Children      Self  Symbol
   100.00%     2.34%  [.] foo
   100.00%     0.00%  [.] main
    92.22%    92.13%  [.] bar
     5.44%     5.44%  [.] baz
```

| 함수 | inclusive (Children) | exclusive (Self) |
|---|---:|---:|
| `foo` | 100.00% | 2.34% |
| `bar` | 92.22% | 92.13% |
| `baz` | 5.44% | 5.44% |

`foo`는 모든 표본의 stack에 있으므로 inclusive가 100%지만, `foo` 자신의 코드에서 잡힌 표본은 2.34%뿐입니다. 고칠 곳은 self가 큰 `bar`입니다. inclusive가 큰 함수는 "어느 호출 경로 아래에서 시간이 쓰였는가"를 알려 줍니다.

### Flamegraph

stack 표본을 펼쳐 그림으로 보는 방법입니다. 5-05에서 다룹니다.

```bash
perf record -F 99 -g ./app
perf script | stackcollapse-perf.pl | flamegraph.pl > out.svg
```

## eBPF — Dynamic Tracing

bpftrace는 `tracepoint:`, `kprobe:`, `uprobe:` 같은 probe에 짧은 프로그램을 붙여 커널 안에서 집계합니다(bpftrace man page의 예제가 이 세 종류를 씁니다). Debian 게스트에서 bpftrace 0.23.2로 5초 동안 `read` syscall을 프로세스별로 셌습니다. 그 사이 다른 셸에서 `cat /etc/services`를 세 번 돌렸습니다.

```bash
bpftrace -e 'tracepoint:syscalls:sys_enter_read { @[comm] = count(); }'
```

```text
Attaching 1 probe...
@[systemd-journal]: 1
@[systemd]: 4
@[cat]: 9
```

BCC 도구는 Debian에서 `bpfcc-tools` 패키지로 설치되고, 이름 뒤에 `-bpfcc`가 붙습니다(`opensnoop-bpfcc`, `biolatency-bpfcc`, `funclatency-bpfcc`). 5-04에서 자세히 다룹니다.

## ftrace — Linux Kernel Tracer

커널 문서 `Documentation/trace/ftrace.rst`는 ftrace를 커널 안에서 무슨 일이 일어나는지 보기 위한 내부 tracer로 소개하고, function tracer 외에 인터럽트·선점 비활성 구간과 wake-up 지연을 보는 latency tracer도 들어 있는 프레임워크라고 적습니다. 같은 문서에 따르면 제어 파일은 tracefs의 `/sys/kernel/tracing`에 있고, 4.1 이전에는 debugfs 아래 `/sys/kernel/debug/tracing`에 있었습니다.

arm64에서는 syscall 함수 이름이 `__arm64_sys_*`입니다. 게스트에서 `sys_*` 필터를 주면 `sys_ni_syscall`, `sys_fillrect` 같은 7개만 걸리고, syscall 진입점은 `__arm64_sys_*` 쪽 438개입니다.

```bash
cd /sys/kernel/tracing
echo __arm64_sys_openat > set_ftrace_filter
echo function > current_tracer
echo 1 > tracing_on
cat /etc/hostname > /dev/null
echo 0 > tracing_on
cat trace
```

```text
             cat-3795    [002] .....  2992.766784: __arm64_sys_openat <-invoke_syscall
             cat-3795    [002] .....  2992.766966: __arm64_sys_openat <-invoke_syscall
             cat-3795    [002] .....  2992.766973: __arm64_sys_openat <-invoke_syscall
```

function tracer는 커널 함수만 추적합니다. 사용자 공간은 uprobe 이벤트(`/sys/kernel/tracing/uprobe_events`)로 봅니다. 5-03에서 자세히 다룹니다.

## 임베디드 — RTOS Tracer

| 도구 | 지원 대상 (출처) |
| --- | --- |
| **Tracealyzer** (Percepio) | 제품 페이지 예시: FreeRTOS, Zephyr, ThreadX, PX5 RTOS, SafeRTOS, LynxOS-178, VxWorks, Linux |
| **SystemView** (SEGGER) | 타깃 소스 `Sample/` 디렉터리: embOS, FreeRTOS(V8~V11), Micrium OS Kernel, uC/OS-II·III, ThreadX, NuttX, NoOS |
| **Zephyr Tracing** | Zephyr 문서: 내장. 형식은 CTF, SystemView, Tracealyzer, 사용자 정의 |
| **CTF** (Common Trace Format) | Zephyr 문서: "an open format and language to describe trace formats". babeltrace, TraceCompass 같은 호스트 도구를 재사용할 수 있음 |

SystemView에서 task 실행 시작·종료는 `SEGGER_SYSVIEW.h` 321~322행의 두 함수로 기록합니다. RTOS 포팅 계층이 스케줄러 hook에서 이 함수를 부릅니다.

```c
SEGGER_SYSVIEW_OnTaskStartExec(task_id);
SEGGER_SYSVIEW_OnTaskStopExec();
```

## Profile-Guided Optimization (PGO)

GCC 14.2 매뉴얼에 따르면 `-fprofile-generate`는 `-fprofile-arcs`, `-fprofile-values`, `-finline-functions`, `-fipa-bit-cp`를 켜고, `-fprofile-use`는 profile feedback과 함께 `-fbranch-probabilities`, `-funroll-loops`, `-fpeel-loops`, `-ftracer`, `-fvpt`, `-finline-functions`, `-fipa-cp-clone`, `-ftree-loop-vectorize` 등을 켭니다. 매뉴얼은 이 최적화 상당수가 profile이 있을 때만 대체로 이득이라고 적습니다.

예제는 if-else 사슬의 *마지막* 갈래로 연산의 97%가 가는 dispatcher입니다(`bench/prof/pgo.c`).

```bash
gcc -O2 -fprofile-generate -o pgo pgo.c
./pgo 20                      # 학습 실행: pgo.gcda 생성
gcc -O2 -fprofile-use -o pgo pgo.c
```

처음에는 학습 빌드를 `-o pgo-gen`, 최종 빌드를 `-o pgo-use`로 다르게 이름 지었다가 GCC가 `pgo-gen-pgo.gcda`를 만들고 최종 빌드에서 `'/root/prof/pgo-use-pgo.gcda' profile count data file not found [-Wmissing-profile]` 경고만 내는 것을 겪었습니다. 이 경우 PGO는 적용되지 않습니다. 두 빌드의 출력 이름을 같게 맞추면 `pgo.gcda`가 만들어지고 찾아집니다.

같은 입력(`./pgo`, 200 rounds)으로 7번씩 번갈아 잰 결과입니다.

| 빌드 | 실행 시간 7회 | 중앙값 | `.text` |
|---|---|---:|---:|
| `-O2` | 0.37 0.37 0.39 0.38 0.38 0.38 0.34 s | 0.38 s | 2,146 B |
| `-O2 -fprofile-use` | 0.32 0.35 0.35 0.34 0.38 0.32 0.32 s | 0.34 s | 2,750 B |

중앙값으로 약 10% 빨라졌고 코드는 604 byte(28%) 커졌습니다. 두 실행 파일의 출력 값은 같았습니다. PGO의 이득은 학습 입력이 실제 입력의 분기 분포를 닮았을 때만 생기므로, 학습 데이터도 측정 조건과 함께 기록합니다.

## Link-Time Optimization (LTO)

GCC 14.2 매뉴얼의 `-flto` 설명에 따르면 컴파일러는 GIMPLE(GCC 내부 표현)을 오브젝트 파일의 특수 ELF section에 써 두고, 링크할 때 모든 함수 본문을 읽어 "같은 translation unit에 있었던 것처럼" 다시 최적화합니다. 그래서 파일 경계를 넘는 inlining과 상수 전파가 가능해집니다. `arm-none-eabi-gcc` 16.2, Cortex-M4, `-O2 -nostdlib`로 두 파일짜리 예제를 빌드했습니다(`qemu-m/lto/`). `a.c`의 `main`이 `b.c`의 `scale()`을 1000번 부르고, `b.c`에는 쓰이지 않는 함수 `table_sum()`과 1 KiB 배열 `big_table`이 있습니다.

| 추가 플래그 | `.text` | 남은 심볼 |
|---|---:|---|
| 없음 | 1,120 B | `big_table`, `scale`, `table_sum` |
| `-ffunction-sections -fdata-sections -Wl,--gc-sections` | 56 B | `scale` |
| `-flto` | 24 B | 없음 |
| `-flto` + 위 gc-sections 플래그 | 24 B | 없음 |

`-ffunction-sections -fdata-sections`는 함수와 데이터를 각자의 section에 넣고(GCC 매뉴얼), `--gc-sections`는 링커가 참조되지 않는 section을 버리게 합니다. 그래서 쓰이지 않는 `table_sum`과 `big_table`이 사라졌습니다. LTO는 여기서 더 나아가 `scale()`을 `main`에 inline하고 1000번의 루프를 상수 1,499,500(0x16e16c)으로 접어, 리셋 핸들러가 그 값을 저장하는 명령 네 개만 남겼습니다.

**LTO의 함정.** 벡터 테이블을 `__attribute__((section(".vectors")))`만으로 정의하고 링커 스크립트에서 `KEEP(*(.vectors))`로 지켰는데도, `-flto` 빌드는 `.text`가 0 byte가 되었습니다. 코드 어디에서도 `vectors`를 참조하지 않으니 LTO 단계에서 지워졌고, 링커의 `KEEP`에는 지킬 것이 남아 있지 않았습니다(지워진 결과를 보고 내린 해석입니다). GCC 매뉴얼은 `used` 속성을 "참조되지 않는 것처럼 보여도 변수를 내보내야 한다"는 뜻으로 정의합니다. `__attribute__((used, section(".vectors")))`로 바꾸자 위 표의 결과가 나왔습니다. 벡터 테이블과 ISR처럼 코드에서 직접 부르지 않는 심볼에는 `used`를 붙입니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -flto \
  -ffunction-sections -fdata-sections -Wl,--gc-sections \
  -T link.ld -o firmware.elf a.c b.c
```

## Microbenchmark vs System Benchmark

| | Microbench | System |
| --- | --- | --- |
| 대상 | 단일 함수 | 전체 app |
| 결과 활용 | 대안 비교 | 병목 찾기, 사용자 경험 |
| 위험 | 실제 사용 조건(캐시·입력)을 반영하지 못함 | 어디가 느린지 알려 주지 않음 |

System 측정과 프로파일로 병목을 찾고, Microbench로 대안을 비교합니다. 1-06의 warmup 측정처럼 microbench는 조건 하나를 바꾸면 결과가 몇 배씩 바뀌므로 조건을 함께 적습니다.

## 자주 하는 실수

> ⚠️ Sample 수가 너무 적음

10 Hz로 5초를 샘플링하면 표본이 50개입니다. 위 perf 기록에서 5.44%였던 baz는 50개 표본이면 2~3개만 떨어집니다. 보려는 함수의 비율에서 거꾸로 주파수와 시간을 정합니다.

> ⚠️ gprof의 cumulative를 inclusive로 읽기

gprof flat profile의 `cumulative seconds`는 표의 위쪽 행들을 더한 누계입니다. inclusive 시간은 call graph의 `children`이나 perf의 `--children`에서 봅니다.

> ⚠️ Debug build profile

`-O0` 빌드는 inline도 벡터화도 하지 않으므로 hot path가 release와 다릅니다. 1-06의 A/B에서 벡터화를 끄는 것만으로 같은 함수가 7.6배 느려졌습니다. release와 같은 최적화 수준으로 프로파일합니다.

> ⚠️ PGO profile이 실제로 쓰였는지 확인 안 함

학습 빌드와 최종 빌드의 출력 이름이 다르면 GCC 14는 경고만 내고 profile 없이 `-funroll-loops` 같은 `-fprofile-use`의 플래그만 켠 채 빌드합니다(.text가 2,146 B에서 2,426 B로 커졌지만 profile은 쓰이지 않음). `-Wmissing-profile` 경고를 오류로 다루거나, `.gcda` 파일 이름을 확인합니다.

## 정리 — Part 1 마무리

- 같은 예제에서 bar의 비율은 perf 92.13%, gprof 90.92%, callgrind 90.00%였습니다. 시간 표본과 명령어 수는 함수마다 조금씩 다르게 나옵니다.
- Instrumentation은 호출 수를 정확히 셉니다(bar 45,000번). 비용은 호출 횟수에 비례합니다.
- inclusive(Children)와 exclusive(Self)를 구분하고, gprof의 cumulative는 inclusive가 아닙니다.
- PGO는 이 예제에서 10% 빨라지고 코드가 28% 커졌습니다. LTO는 파일 경계를 넘어 루프 전체를 상수로 접었고, 벡터 테이블에는 `used`가 필요했습니다.

**Part 1 (Performance Analysis Fundamentals)이 끝났습니다.** Part 2부터는 CPU와 Microarchitecture를 깊이 다룹니다.

## 관련 항목

- [1-07: 성능 모델링](/blog/embedded/performance-engineering/part1-07-modeling)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)

## 참고 자료

- [GCC 14.2 Instrumentation Options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Instrumentation-Options.html), [Optimize Options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Optimize-Options.html)
- [GNU gprof: Implementation of Profiling](https://sourceware.org/binutils/docs/gprof/Implementation.html), [The Flat Profile](https://sourceware.org/binutils/docs/gprof/Flat-Profile.html)
- Linux v6.12 `Documentation/trace/ftrace.rst`
- [Zephyr Tracing](https://docs.zephyrproject.org/latest/services/tracing/index.html), [Percepio Tracealyzer](https://percepio.com/tracealyzer/), [SEGGER SystemView 소스](https://github.com/SEGGERMicro/SystemView)
