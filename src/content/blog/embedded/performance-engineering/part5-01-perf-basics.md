---
title: "5-01: Linux perf 기초 — stat·record·report"
date: 2026-05-08T20:00:00
description: "Linux perf 표준 도구의 세 가지 핵심 명령. 설치, 권한, 그리고 첫 측정부터 핫스팟 분석까지."
series: "Embedded Performance Engineering"
seriesOrder: 40
tags: [perf, profiling, sampling, linux]
---

## 한 줄 요약

> **"Linux perf의 stat, record, report 세 명령만 익혀도 90%의 성능 진단을 할 수 있습니다."**

## 어떤 문제를 푸는가

성능 문제는 측정 없이는 추측의 영역에 머뭅니다. 코드를 읽고 "여기가 느릴 것 같다"고 짐작해 수정하면 절반 이상은 빗나갑니다. 진짜 병목은 컴파일러가 자동 인라인한 함수 안이거나, 캐시 미스가 폭주하는 데이터 접근 패턴이거나, 미세한 분기 예측 실패 누적인 경우가 많습니다.

Linux perf는 이런 보이지 않는 곳을 들춰 보는 표준 도구입니다. 커널에 내장되어 있어 별도 daemon이 없고, 하드웨어 PMU에 직접 접근해 사이클 단위로 측정합니다. 상용 profiler 없이도 동등한 수준의 분석이 가능하며, 임베디드 Linux SoC에서도 그대로 동작합니다.

이 글에서는 perf의 설치와 권한 설정부터 가장 자주 쓰는 `stat`, `record`, `report`, `top` 명령까지 다룹니다. 다음 편에서는 raw event와 스크립팅으로 들어갑니다.

## perf 설치와 권한

대부분의 배포판은 `linux-tools` 패키지로 제공합니다.

```bash
# Ubuntu·Debian
sudo apt install linux-tools-common linux-tools-$(uname -r)

# Fedora·RHEL
sudo dnf install perf

# 임베디드 (Yocto)
IMAGE_INSTALL += "perf"

# 확인
perf --version
```

설치 후 권한 설정이 필요합니다. perf는 커널 이벤트에 접근하므로 보안상 제한됩니다.

```bash
# /proc/sys/kernel/perf_event_paranoid
#  2 — kernel·CPU event 접근 차단 (기본)
#  1 — user-space event 가능
#  0 — kernel event도 가능
# -1 — 모두 허용 (보안 위험)

echo 1 | sudo tee /proc/sys/kernel/perf_event_paranoid
```

상시 적용하려면 `/etc/sysctl.d/`에 추가합니다.

```bash
echo 'kernel.perf_event_paranoid = 1' | sudo tee /etc/sysctl.d/99-perf.conf
```

Capability 방식이 더 안전합니다. perf 실행 파일에만 권한을 부여합니다.

```bash
sudo setcap cap_perfmon,cap_sys_ptrace=ep $(which perf)
```

## perf stat — 첫 측정

`perf stat`은 프로그램 한 번 실행 동안의 누적 카운터를 보여 줍니다. 가장 빠르고 가벼운 첫 측정 도구입니다.

```bash
perf stat ./prog

# 출력
#  Performance counter stats for './prog':
#
#         1234.56 msec task-clock                #    0.987 CPUs utilized
#                 12   context-switches          #    9.72  /sec
#                  3   cpu-migrations            #    2.43  /sec
#                234   page-faults               #  189.5   /sec
#      5,123,456,789   cycles                    #    4.150 GHz
#      8,234,567,890   instructions              #    1.61  insn per cycle
#        234,567,890   branches                  #  190.0 M/sec
#            123,456   branch-misses             #    0.05% of all branches
```

세 가지 metric을 먼저 봅니다.

| Metric | 의미 | 기준 |
|---|---|---|
| **IPC** (insns per cycle) | 한 사이클에 실행한 명령어 수 | 1.0 이상 양호, 0.5 이하 의심 |
| **Branch miss rate** | 분기 예측 실패 비율 | 1% 이하 정상 |
| **Page faults** | 페이지 폴트 횟수 | 메모리 압박 신호 |

IPC가 낮다면 stall 원인을 찾아야 합니다. Cache miss, branch miss, dependency chain 중 하나가 보통 범인입니다.

특정 이벤트만 골라 측정할 수도 있습니다.

```bash
perf stat -e cycles,instructions,cache-references,cache-misses ./prog

#  5,234,567,890   cycles
#  8,123,456,789   instructions          #    1.55  insn per cycle
#    234,567,890   cache-references      #  190.0 M/sec
#     12,345,678   cache-misses          #    5.26% of all cache refs
```

Cache miss rate가 10%를 넘으면 데이터 레이아웃을 점검할 차례입니다.

여러 번 실행해 평균과 분산을 보고 싶다면 `-r`을 씁니다.

```bash
perf stat -r 10 ./prog

#   1234.56 msec task-clock                #    0.987 CPUs utilized ( +-  0.45% )
```

분산이 5%를 넘으면 측정 자체에 noise가 있다는 뜻이므로, CPU governor를 performance로 고정하거나 다른 백그라운드 작업을 줄여야 합니다.

## perf record / report — 핫스팟 찾기

`stat`이 누적 합계라면 `record`는 sampling profiler입니다. 주기적으로 PC와 call stack을 캡처해 어느 함수가 hot한지 보여 줍니다.

```bash
# 99 Hz sampling, call graph 포함
perf record -F 99 -g ./prog

# 결과는 perf.data에 저장됩니다
ls perf.data
```

분석은 `perf report`로 합니다.

```bash
perf report

# Samples: 12K of event 'cycles'
# Event count (approx.): 5234567890
#
# Overhead  Command  Shared Object       Symbol
#   23.45%  prog     prog                [.] hot_function
#   12.34%  prog     libc-2.31.so        [.] __memcpy_avx_unaligned
#    8.91%  prog     prog                [.] another_function
#    5.67%  prog     [kernel.kallsyms]   [k] copy_user_enhanced_fast_string
```

`Overhead` 열이 전체 사이클 중 비율입니다. 위 예에서는 `hot_function`이 23.45%를 차지하므로 이 함수부터 들여다봅니다.

Enter 키로 함수를 펼치면 호출 경로 트리가 나옵니다.

```text
- 23.45% hot_function
   - 18.20% process_batch
        main
   - 5.25% retry_loop
        error_handler
        main
```

어느 호출 경로에서 비용이 집중되는지 한눈에 보입니다.

소스 라인별 분포는 `annotate`로 봅니다.

```bash
perf annotate hot_function
```

```text
       │     for (i = 0; i < N; i++) {
  0.5  │ 10:   mov    %eax, %edx
       │         sum += data[i];
 23.4  │ 12:   add    (%rcx), %edx       ← 가장 hot
  0.3  │ 14:   inc    %rax
  0.2  │ 16:   cmp    $0x1000, %rax
 76.0  │ 19:   jne    10                 ← 분기 hot
```

명령어 단위까지 내려가면 "이 add가 메모리 fetch를 기다리고 있구나" 같은 결론이 가능합니다.

## Call Graph 수집 방식

`-g` 플래그는 call stack을 함께 캡처합니다. 수집 방식은 세 가지입니다.

```bash
# Frame pointer 기반 — 빠름, -fno-omit-frame-pointer 필요
perf record -g --call-graph fp ./prog

# DWARF debug info 기반 — 정확, overhead 큼
perf record -g --call-graph dwarf ./prog

# Last Branch Record — Intel 전용, 가장 빠름
perf record -g --call-graph lbr ./prog
```

ARM Cortex-A에서는 frame pointer가 무난한 선택입니다. 단, GCC는 `-O2`에서 frame pointer를 생략하므로 `-fno-omit-frame-pointer`를 추가해야 합니다. 그렇지 않으면 call stack이 깨지거나 한두 단계만 나옵니다.

## perf top — 실시간 모니터

`perf top`은 1초마다 sampling 결과를 갱신해 화면에 보여 줍니다. `htop`의 함수 단위 버전이라고 생각하면 됩니다.

```bash
perf top                  # 시스템 전체
perf top -p $(pidof app)  # 특정 프로세스
perf top -e cache-misses  # 다른 이벤트로
```

배포된 시스템에서 갑자기 CPU 사용률이 올라간 경우, ssh로 접속해 `perf top`을 띄우면 즉시 hot 함수를 알 수 있습니다. 30분 이상 켜 두면 perf 자체가 noise가 되므로 짧게 사용하는 것이 좋습니다.

## perf diff — 최적화 효과 비교

두 번의 record 결과를 나란히 비교할 수 있습니다.

```bash
perf record -o before.data ./prog_v1
perf record -o after.data  ./prog_v2
perf diff before.data after.data

# Baseline    Delta   Command  Symbol
#   30.0%    -10.0%   prog     hot_function     ← v2가 빠름
#    5.0%     +2.0%   prog     new_check
```

추측이 아니라 정량으로 "10% 줄었다"를 증명하는 도구입니다. 최적화 PR을 올릴 때 같이 첨부하면 리뷰가 쉬워집니다.

## 결과 해석 — IPC와 Cache Miss

`perf stat`의 두 숫자만 잘 보면 1차 진단의 절반은 끝납니다.

$$\text{IPC} = \frac{\text{instructions}}{\text{cycles}}$$

```text
IPC > 2.0  — superscalar 잘 활용
IPC 1.0~2.0 — 일반적
IPC < 0.5  — 심각한 stall, 원인 찾기 필요
```

IPC가 낮을 때 다음 순서로 좁혀 갑니다.

```bash
# 1) Cache miss로 stall?
perf stat -e cache-references,cache-misses ./prog

# 2) Branch miss로 pipeline flush?
perf stat -e branches,branch-misses ./prog

# 3) Front-end stall? Back-end stall?
perf stat -e stalled-cycles-frontend,stalled-cycles-backend ./prog
```

Front-end stall은 instruction fetch 문제(I-cache miss, branch miss)이고, back-end stall은 execution 단계 문제(D-cache miss, dependency)입니다. 두 stall을 구분하면 다음 측정 방향이 잡힙니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Symbol이 없는 바이너리

```bash
strip prog                    # symbol 제거
perf report                   # [.] 0x12345 만 표시
```

배포용으로 strip한 바이너리는 `-g`로 컴파일한 디버그 심볼을 같이 두거나, separate debug info 패키지를 함께 설치해야 함수 이름이 나옵니다.

> ⚠️ Sampling rate 과도

```bash
perf record -F 99999 ./prog   # 100 kHz, overhead 5% 이상
```

너무 높이면 측정 대상보다 perf 자체가 noise가 됩니다. 999~4000 Hz가 표준이며 ARM Cortex-A에서는 4000 Hz에서 2~5% overhead를 봅니다.

> ⚠️ Frame pointer 없이 call graph

```bash
gcc -O2 app.c                 # frame pointer 자동 제거
perf record -g --call-graph fp ./app
```

Call stack이 깨집니다. `-fno-omit-frame-pointer`를 추가하거나 `--call-graph dwarf`를 씁니다.

> ⚠️ Multiplex된 결과를 정확하다고 믿기

PMU counter는 보통 4-6개입니다. 그보다 많은 이벤트를 요청하면 자동으로 시간 분할됩니다. 결과에 `(50.00%)` 같이 측정 비율이 표시되며, 그 비율이 50% 이하라면 수치가 추정값임을 인지해야 합니다.

> ⚠️ Production 서버에서 paranoid를 -1로

```bash
echo -1 > /proc/sys/kernel/perf_event_paranoid
```

비특권 사용자도 커널 이벤트를 모두 볼 수 있게 되므로 정보 누출 위험이 있습니다. 개발 환경에서만 사용합니다.

## 정리

- perf는 `linux-tools` 패키지로 설치하며 `perf_event_paranoid` 또는 capability로 권한을 부여합니다.
- `perf stat`으로 IPC와 cache miss rate부터 확인합니다.
- `perf record -g`로 sampling profile을 수집하고 `perf report`로 핫스팟을 찾습니다.
- `perf annotate`는 명령어 단위까지 cycle 분포를 보여 줍니다.
- `perf top`은 실시간 응급 진단에 유용하며, `perf diff`로 최적화 효과를 정량 비교합니다.
- Sampling rate는 999~4000 Hz가 표준이며, `-fno-omit-frame-pointer`가 call graph 정확도를 좌우합니다.

다음 편은 **perf 고급** — raw event, tracepoint, perf script Python으로 들어갑니다.

## 관련 항목

- [5-02: perf 고급](/blog/embedded/performance-engineering/part5-02-perf-advanced)
- [1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
- [2-10: PMU 활용](/blog/embedded/performance-engineering/part2-10-pmu)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
