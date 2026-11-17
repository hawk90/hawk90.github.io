---
title: "모던 프로파일러 비교 — Tracy·Hotspot·uftrace·Coz"
slug: "embedded/performance-engineering/part5-09-tracy-hotspot"
date: 2026-04-27T09:08:00
description: "Tracy nanosecond instrumentation, Hotspot GUI, uftrace function trace, Coz causal profiler."
series: "Embedded Performance Engineering"
seriesOrder: 48
tags: [profiling, tracy, hotspot, uftrace, coz, low-overhead]
topics: ["embedded"]
---

## 한 줄 요약

> **"perf로 부족한 곳에는 Tracy의 ns marker, Hotspot의 GUI, uftrace의 함수 trace, Coz의 causal 분석이 각자 다른 질문에 답합니다."** 다만 비용과 함정은 플랫폼마다 다릅니다. 같은 Tracy zone이 Mac에서는 약 7.6 ns, Linux arm64 VM에서는 약 47 ns였습니다.

## 어떤 문제를 푸는가

perf와 ftrace는 강력하지만 결과를 텍스트로 훑어야 하고, sampling은 "자주 걸리는 곳"만 보여 줍니다. 몇 초에 한 번 튀는 프레임이나, 한 번만 불리지만 오래 걸리는 함수는 sampling 통계에 묻힙니다. 그리고 "가장 오래 걸리는 함수"가 "고치면 가장 빨라지는 함수"라는 보장도 없습니다.

이 글의 도구들은 이 빈틈을 하나씩 맡습니다. 비유하면 Tracy는 경기 영상에 선수마다 붙인 스톱워치, Hotspot은 perf가 찍은 사진을 보기 좋게 붙인 앨범, uftrace는 모든 출입문에 단 출입 기록부, Coz는 "이 선수가 10% 빨라지면 팀 기록이 얼마나 줄까"를 실험해 보는 코치입니다.

> **실행 환경** Tracy·uftrace·perf는 Debian 13 arm64 QEMU guest(kernel 6.12.116, `-accel hvf -cpu host`, host Apple M2 Pro, gcc 14.2.0)에서, Tracy와 Instruments는 같은 Mac(Apple clang 21.0.0)에서 직접 돌렸습니다. Hotspot은 Debian arm64 패키지와 arm64 AppImage가 없어 실행하지 못했고, Coz는 이 작업 환경에서 빌드가 허용되지 않아 실행하지 않았습니다. 두 도구는 README와 논문으로만 설명합니다.

## Tracy — ns 단위 instrumentation

[Tracy](https://github.com/wolfpld/tracy)는 Bartosz Taudul이 만든 프로파일러입니다. [Tracy 매뉴얼](https://github.com/wolfpld/tracy/releases/download/v0.15.0/tracy.pdf)(v0.15.0)은 자신을 "real-time, nanosecond resolution hybrid frame and sampling profiler"로 소개하고, 게임 같은 실시간 애플리케이션의 frame 시간 분석에 초점이 있지만 frame 개념이 없는 프로그램에도 쓸 수 있다고 적습니다. 프로파일링 대상은 CPU, GPU(OpenGL·Vulkan·Direct3D 11/12·Metal·OpenCL·CUDA·WebGPU), 메모리 할당, lock, context switch입니다.

매뉴얼 2.3절의 GUI(서버) 빌드 명령은 다음과 같습니다.

```bash
git clone https://github.com/wolfpld/tracy
cd tracy
cmake -B profiler/build -S profiler -DCMAKE_BUILD_TYPE=Release
cmake --build profiler/build --config Release --parallel
```

애플리케이션 쪽은 `public/TracyClient.cpp` 하나를 같이 빌드하고 `TRACY_ENABLE`을 정의한 뒤 marker를 심습니다.

```cpp
#include <tracy/Tracy.hpp>

void process_frame() {
    ZoneScoped;                               /* 자동 함수 이름 */
    preprocess();

    {
        ZoneScopedN("inference");             /* 명시 이름 */
        run_model();
    }

    FrameMark;                                /* frame 끝 마커 */
}
```

`ZoneScoped`는 RAII 객체라 scope에 들어갈 때와 나갈 때 timestamp를 남깁니다. 매뉴얼 1.7절은 etcpak 압축에 zone 16,777,216개를 단 실험에서 zone 하나(시작·끝 이벤트 둘)의 비용을 2.25 ns로 계산합니다. 다만 이 값은 12개 스레드가 병렬로 압축한 이미지 한 장의 wall-clock 차이(37.7 ms)를 전체 zone 수로 나눈 것이라, 스레드 하나가 zone 하나에 쓰는 시간이 아닙니다. 또 매뉴얼 2.1.10.5절은 가상 머신에서는 timestamp 정밀도가 떨어질 수 있으니 bare metal에서 돌리라고 권합니다. 이 두 점을 염두에 두고 직접 재 봤습니다. `ZoneScopedN`을 단 함수를 200만 번 부르고 호출당 시간을 쟀습니다(서버는 연결하지 않았고, 다섯 번 실행).

| 환경 | `TRACY_ENABLE` 없음 | `TRACY_ENABLE` | zone당 증가분(중앙값) |
|---|---|---|---|
| Mac (M2 Pro, clang 21) | 2.03 ns | 9.63 ns | 약 7.6 ns |
| Debian 13 arm64 VM (gcc 14.2) | 2.06 ns | 49.34 ns | 약 47.3 ns |
| 같은 VM, `TRACY_ON_DEMAND` | — | 2.17 ns | 서버 미연결 시 약 0.1 ns |

VM에서 여섯 배 넘게 비싼 이유는 timer입니다. Tracy v0.15.0의 `TracyProfiler.hpp`는 hardware timer(`TRACY_HAS_CNTVCT`)를 Apple ARM64와 Windows ARM64에만 켜고, Linux aarch64에서는 `clock_gettime(CLOCK_MONOTONIC_RAW)`로 떨어집니다. 같은 VM에서 이 호출 하나가 17.48 ns(중앙값)였고 zone 하나에 두 번 부르므로 증가분의 대부분이 설명됩니다. Mac 빌드는 `CNTVCT_EL0` 레지스터를 직접 읽습니다. 그러니 "Tracy zone은 몇 ns"라는 숫자는 timer 경로까지 같은 플랫폼에서만 옮겨 쓸 수 있습니다.

`TRACY_ON_DEMAND`는 서버가 연결됐을 때만 기록하는 옵션입니다. 매뉴얼은 이 옵션이 꺼진 기본 상태에서는 서버가 연결될 때까지 이벤트를 메모리에 쌓고, 그 양이 "a couple of gigabytes"까지 늘 수 있다고 경고합니다. 위 표의 `TRACY_ENABLE` 행이 바로 그 상태(서버 없음, 계속 쌓음)에서 잰 값입니다.

Tracy의 기능 중 매뉴얼에서 확인한 것은 다음과 같습니다.

- 대상 애플리케이션과 GUI가 네트워크로 분리되어, 임베디드 보드에서 기록하고 PC에서 봅니다.
- lock 표시(3.6절 "Marking locks")와 메모리 프로파일링(3.9절), 데드락 탐지 창(5.19절)이 있습니다.
- GPU zone은 3.10절에 OpenGL·Vulkan·Direct3D·CUDA 등 API별로 나뉘어 있습니다.
- 한 세션은 1.6일을 넘길 수 없습니다(제약 목록).

frame이라는 반복 단위가 있는 시스템(영상 파이프라인, 모터 제어 루프, 센서 fusion 주기)이면 `FrameMark`로 frame마다 시간을 나눠 볼 수 있습니다.

## Hotspot — perf의 Qt GUI

[Hotspot](https://github.com/KDAB/hotspot)은 KDAB의 R&D 프로젝트로, `perf record`가 만든 `perf.data`를 Qt GUI로 보여 줍니다. README가 보여 주는 화면은 Summary, Bottom-Up, Top-Down, Flame Graph, Caller/Callee, 디스어셈블리, 시간·스레드로 거르는 timeline입니다.

```bash
perf record --call-graph dwarf ./app
hotspot perf.data
```

README는 backtrace를 얻으려면 "dwarf callgraph mode"를 켜라고 안내합니다. Off-CPU 분석은 `-e sched:sched_switch --switch-events`를 함께 기록해야 하고, Hotspot의 record 페이지에도 off-CPU 체크박스가 있습니다. 임베디드 보드에서 기록하고 다른 아키텍처의 host에서 분석하는 절차도 README에 있습니다. 보드에서 `perf record --call-graph dwarf`를 돌리고 `/proc/kallsyms`를 일반 파일로 복사해 `perf.data`와 함께 host로 가져갑니다.

설치에는 제약이 있습니다. README는 Hotspot이 "not yet packaged on all Linux distributions"이라 AppImage를 권하는데, 최신 릴리스 v1.6.0의 AppImage는 `hotspot-v1.6.0-x86_64.AppImage` 하나뿐입니다. 이 글의 Debian 13 arm64 guest에서 `apt-cache policy hotspot`은 후보를 내지 않았습니다. 그래서 arm64 보드에서 기록하고 x86_64 PC에서 여는 위 절차가 실제 경로가 됩니다.

## uftrace — 사용자 함수 전체 trace

[uftrace](https://github.com/namhyung/uftrace)는 사용자 공간 함수의 진입과 반환을 ftrace의 function_graph처럼 기록합니다. README(v0.17)에 따르면 계측 방법은 두 가지입니다. `-pg`·`-finstrument-functions`·`-fpatchable-function-entry=N`으로 컴파일한 코드를 쓰거나(aarch64는 `=2`면 충분), `-P.`로 함수를 동적으로 패치합니다. README는 재컴파일이 필요 없는 동적 추적을 x86_64와 AArch64의 "experimental support"로 적습니다.

예제로 `parse_input()`과 `process()` → `compute()` → `inner_loop()` 두 번을 부르는 작은 프로그램을 `gcc -O2 -pg`로 빌드했습니다.

```bash
gcc -O2 -pg -o app_pg app.c
uftrace record -F parse_input -F process ./app_pg 1
uftrace replay
```

```text
# DURATION     TID      FUNCTION
            [   4159] | parse_input() {
   0.375 us [   4159] |   malloc();
   0.500 us [   4159] |   memcpy();
   0.334 us [   4159] |   free();
   2.708 us [   4159] | } /* parse_input */
            [   4159] | process() {
            [   4159] |   compute() {
   3.500 us [   4159] |     inner_loop();
   3.459 us [   4159] |     inner_loop();
   7.167 us [   4159] |   } /* compute */
   7.250 us [   4159] | } /* process */
```

Duration은 함수가 반환하는 행에 찍히고, 진입 행은 비어 있습니다([replay 문서](https://github.com/namhyung/uftrace/blob/master/doc/uftrace-replay.md)). `process()` 안의 `memcpy(dst, src, 4096)`은 크기가 고정이라 컴파일러가 인라인 복사로 바꿔 `bl memcpy`가 남지 않았고, 그래서 trace에도 없습니다. `-F`는 해당 함수와 그 아래만 기록하고, `-N`은 해당 함수를 빼는 필터입니다.

### arm64 Debian에서 main을 추적하면 SIGILL

`-F` 없이 `uftrace record ./app_pg 1`을 돌리면 이 guest에서는 `WARN: child terminated by signal: 4: Illegal instruction`으로 죽었습니다. `-F main`도 같았고, `-F process`나 `-F parse_input`은 정상이었습니다. `debug.exception-trace`를 켜고 다시 돌린 커널 로그가 원인을 보여 줍니다.

```text
app_pg[4079]: unhandled exception: undefined instruction in libc.so.6[2225c,ffffbd5d0000+19c000]
pstate: 40001400 (nZcv daif -PAN -UAO -TCO -DIT +SSBS BTYPE=jc)
pc : 0000ffffbd5f225c
```

libc의 0x2225c는 정상 명령인 `bl exit`이고, 바로 앞이 `main`을 부르는 `blr x3`입니다. 즉 `main`이 돌아갈 자리입니다. 이 Debian의 glibc 2.41은 `readelf -n`에 "AArch64 feature: BTI, PAC"가 표시되는 BTI 빌드입니다. uftrace v0.17의 `arch/aarch64/mcount.S`에서 반환 trampoline(`mcount_return`)은 원래 반환 주소로 `br x16`을 씁니다. `ret`이 아닌 간접 분기가 BTI landing pad가 아닌 곳에 떨어졌고, `pstate`의 `BTYPE=jc`가 그 흔적입니다. Linux v6.12의 `do_el0_bti()`는 이 예외를 `SIGILL`로 보내고, `force_signal_inject()`가 SIGILL을 "undefined instruction"으로 찍습니다. 실무에서는 `-F`로 `main` 아래 함수만 골라 기록하면 피해 갈 수 있었습니다.

### -pg와 uftrace의 비용

같은 프로그램을 1회 반복과 20,000회 반복으로 돌려 다섯 번 실행의 중앙값을 비교했습니다(`flock`으로 다른 벤치마크와 겹치지 않게 했습니다).

| 빌드·실행 | 1회 반복 | 20,000회 반복 |
|---|---|---|
| `gcc -O2` | 0 ms | 148 ms |
| `gcc -O2 -pg`, uftrace 없이 실행 | 0 ms | 150 ms |
| `uftrace record -F parse_input -F process` | 103 ms | 269 ms |
| `uftrace record -F process -D 1` | 102 ms | 252 ms |

`-pg`로 들어간 `_mcount` 호출 자체는 uftrace 없이 실행하면 차이가 보이지 않았습니다. uftrace를 붙인 쪽은 1회 반복에서 이미 약 100 ms가 걸렸습니다. 이 값은 기록 준비와 종료 처리에 드는 고정 비용입니다. 20,000회에서 1회 값을 빼면 `-F parse_input -F process`는 166 ms로 계측 없는 실행(148 ms)보다 약 18 ms, 반복 하나에 약 0.9 µs 더 듭니다. 한 반복에 기록되는 함수는 `parse_input`·`malloc`·`memcpy`·`free`·`process`·`compute`·`inner_loop` 두 번으로 여덟 개입니다. `-D 1`로 깊이를 1로 줄이면 늘어난 몫이 약 2 ms로 작아졌습니다. 그러니 짧은 프로그램에서는 고정 비용이, 오래 도는 프로그램에서는 기록하는 함수 수가 비용을 정합니다.

## Coz — Causal Profiler

Coz는 Charlie Curtsinger와 Emery D. Berger의 SOSP'15 논문 ["COZ: Finding Code that Counts with Causal Profiling"](https://arxiv.org/abs/1608.03676)에서 나온 도구입니다. 질문이 다릅니다. 기존 profiler는 "이 함수가 시간의 30%를 쓴다"를 알려 주지만, 그 함수를 없애도 전체가 30% 빨라진다는 보장은 없습니다. 다른 스레드가 그 결과를 기다리지 않는다면 효과가 없기 때문입니다.

논문의 핵심 기법은 *virtual speedup*입니다. 선택한 코드 줄이 실행될 때마다 *다른* 스레드들을 잠깐 멈춰서, 그 줄이 상대적으로 빨라진 효과를 흉내 냅니다. 초록은 이 방법으로 Memcached를 9%, SQLite를 25%, PARSEC 응용 여섯 개를 최대 68% 빠르게 했고 대부분 10줄 미만의 수정이었다고 적습니다. 실행 오버헤드는 평균 17%(최소 0.1%, 최대 65%)로, gprof의 최대 6배보다 작다고 보고합니다.

[README](https://github.com/plasma-umass/coz)의 사용법은 다음과 같습니다. 먼저 "더 자주 실행되기를 바라는 줄"에 progress point를 답니다.

```c
#include <coz.h>

void process_request(Request* r) {
    handle(r);
    COZ_PROGRESS;                /* 처리 한 단위 */
}
```

README는 `libdl`을 링크(`-ldl`)하고 debug 정보와 함께 빌드한 뒤 다음처럼 실행하라고 합니다. `COZ_PROGRESS_NAMED("이름")`을 쓰면 여러 위치를 같은 progress point로 묶을 수 있습니다.

```bash
coz run --- ./app
coz plot                 # 브라우저에서 profile.coz 보기
coz plot --text          # 터미널 출력
```

결과는 줄마다 "이 줄을 x% 빠르게 하면 progress point 처리율이 y% 오른다"는 곡선입니다. 곡선이 평평한 줄은 아무리 최적화해도 전체에 효과가 없는 줄입니다.

## Apple Instruments — 비교 참고

macOS에는 Xcode의 Instruments가 있고, CLI인 `xctrace`로도 쓸 수 있습니다. 이 Mac(xctrace 27.2)에서 `xcrun xctrace list templates`는 Time Profiler, System Trace, CPU Counters, Processor Trace, Metal System Trace, Allocations, Leaks, Power Profiler 등을 보여 줬습니다.

위 uftrace 예제를 Mac에서 빌드해 Time Profiler로 기록했습니다.

```bash
xcrun xctrace record --template 'Time Profiler' --output tp.trace --launch -- ./app_mac 20000
```

`xctrace export`로 꺼낸 `time-profile` 표는 샘플마다 weight가 1.00 ms였고, 50개 샘플 중 46개의 최상위 frame이 `inner_loop`였습니다. GUI 없이도 기록과 추출이 되므로 CI에서 쓸 수 있습니다.

## 언제 어떤 도구를 쓰나

| 시나리오 | 추천 도구 | 이 글에서 확인한 비용·제약 |
|---|---|---|
| Frame 기반 시스템의 구간 분석 | Tracy | zone당 Mac 약 7.6 ns, Linux arm64 VM 약 47 ns |
| perf record 결과를 GUI로 | Hotspot | x86_64 AppImage만 배포, dwarf callgraph 권장 |
| 사용자 함수 전체 호출 trace | uftrace | 기록 고정 비용 약 100 ms + 함수 진입당 비용, BTI glibc에서 main 추적 시 SIGILL |
| 어디를 최적화해야 효과적인지 | Coz | 논문 기준 평균 17% 오버헤드 |
| GPU와 CPU 통합 (NVIDIA) | Nsight Systems | [5-08](/blog/embedded/performance-engineering/part5-08-nsight) |
| macOS 전체 | Instruments(`xctrace`) | Time Profiler 1 ms 샘플 |
| 시스템 전체 sampling | perf record | [5-01](/blog/embedded/performance-engineering/part5-01-perf-basics) |

이 도구들은 perf를 대체하지 않습니다. perf로 큰 그림을 보고, Coz로 손댈 곳을 고르고, Tracy로 그 구간을 frame 단위로 쪼개고, uftrace로 호출 흐름을 따라가는 식으로 조합합니다.

## 시나리오 — 미디어 처리 pipeline 튜닝

decoder → filter → encoder 파이프라인의 처리율이 목표에 못 미친다고 해 봅시다. 아래는 위 도구들의 역할을 순서로 엮은 절차이며, 실제 파이프라인에서 돌린 결과는 아닙니다.

1. **`perf record --call-graph dwarf`로 hot 함수를 찾습니다.** 세 단계가 비슷하게 나오면 sampling만으로는 어디를 먼저 고칠지 정할 수 없습니다.
2. **Coz로 단계별 효과를 비교합니다.** progress point를 encoder 출력(프레임 하나 완료)에 두고, 어느 단계의 줄이 가파른 곡선을 보이는지 봅니다.
3. **그 단계에 Tracy `ZoneScopedN`을 심습니다.** 프레임마다 어느 하위 구간이 길어지는지 봅니다. 측정 대상 플랫폼에서 zone 비용을 먼저 재 둡니다.
4. **uftrace로 그 구간의 호출 흐름을 따라갑니다.** `-F`로 범위를 좁혀야 비용이 줄고, arm64 BTI 환경에서는 `main`을 피합니다.
5. **고친 뒤 1번부터 다시 측정합니다.**

## 자주 보는 함정과 안티패턴

> ⚠️ Tracy를 release build에 그대로 두기

```cpp
#define TRACY_ENABLE             // production 빌드에 켜져 있음
```

매뉴얼은 `TRACY_ENABLE`이 없으면 계측이 컴파일에서 빠진다고 적습니다. 위 측정에서도 `TRACY_ENABLE`이 없는 빌드는 marker가 없는 빌드와 같은 2.0 ns대였습니다. 켜 둔 채 서버를 연결하지 않으면 이벤트가 메모리에 계속 쌓이므로, 출시 빌드에 남겨야 한다면 최소한 `TRACY_ON_DEMAND`를 씁니다.

> ⚠️ uftrace로 main까지 기록하기 (arm64 BTI)

BTI가 켜진 glibc 위에서는 `main`의 반환이 uftrace trampoline의 `br x16`을 거치면서 SIGILL이 났습니다. `-F`로 `main` 아래 함수만 고릅니다.

> ⚠️ Coz의 progress point 위치를 잘못 선택

```c
void main() {
    while (true) {
        process();
        COZ_PROGRESS;            /* 한 cycle = 한 progress */
    }
}
```

Progress point는 "더 자주 일어나기를 바라는 일"의 단위여야 합니다. 요청 처리량이 목표면 요청 하나가 끝나는 줄에, frame rate가 목표면 frame 하나가 끝나는 줄에 둡니다.

> ⚠️ Hotspot에는 frame pointer가 필수라고 생각하기

Hotspot README가 권하는 것은 `--call-graph dwarf`입니다. 이 guest에서 같은 프로그램을 `perf record -e cpu-clock`으로 기록해 보니, gcc 14.2의 `-O2` 기본값이 `-fomit-frame-pointer [enabled]`인데도 `--call-graph fp`로 `main → compute → inner_loop`가 이어졌습니다. 디스어셈블리를 보면 leaf가 아닌 `compute`가 `stp x29, x30`으로 frame record를 그대로 만들었습니다. 그런데 커널의 arm64 user unwinder는 x29에서 시작하므로, leaf인 `inner_loop`를 부른 `compute` 자체는 frame record로는 나오지 않습니다. 이 칸을 채운 것은 perf 도구 쪽입니다. Linux v6.12 `tools/perf/arch/arm64/util/machine.c`의 `arch__add_leaf_frame_record_opts()`가 샘플에 LR 레지스터를 함께 기록하게 하고(이 기록의 `sample_regs_user = 0x40000000`이 LR bit입니다), `tools/perf/util/arm64-frame-pointer-unwind-support.c`의 `get_leaf_frame_caller_aarch64()`가 그 LR로 leaf의 호출자를 끼워 넣습니다. 반대로 `--call-graph dwarf`는 같은 체인을 복원했지만 libc 위쪽 두 frame이 `0x2bffffa5e2233b` 같은 값으로 찍혔습니다. 하위 48 bit(`0xffffa5e2233b`)는 libc 주소 범위인데 상위에 `0x2b`가 붙어 있어, PAC로 서명된 반환 주소의 서명 bit가 지워지지 않은 것으로 읽힙니다. arm64에서는 두 방식을 모두 찍어 비교합니다.

## 정리

아래 수치는 모두 이 글의 측정 환경(Apple M2 Pro 위 HVF Debian 13 arm64 게스트)에서 잰 값이며, 다른 CPU나 보드의 값이 아닙니다.

- Tracy zone 비용은 timer 경로가 정합니다. Mac(CNTVCT)에서 약 7.6 ns, Linux arm64 VM(`clock_gettime`)에서 약 47 ns였습니다. 매뉴얼의 2.25 ns는 12개 스레드의 wall-clock 차이를 zone 수로 나눈 값이라 스레드당 비용과 직접 비교할 수 없습니다.
- Hotspot은 `--call-graph dwarf`로 기록한 `perf.data`를 보여 주며, 배포 AppImage는 x86_64용뿐입니다.
- uftrace는 `-pg` 또는 동적 패치로 사용자 함수의 진입·반환을 기록합니다. 이 예제에서는 기록 고정 비용이 약 100 ms였고, 20,000회 반복에서 늘어난 몫은 반복당 약 0.9 µs였습니다.
- BTI가 켜진 arm64 glibc에서는 uftrace로 `main`을 추적하면 SIGILL이 납니다.
- Coz는 virtual speedup으로 "고치면 효과가 있는 줄"을 찾으며, 논문 기준 평균 오버헤드는 17%입니다.
- Instruments는 `xctrace`로 GUI 없이 기록하고 표로 추출할 수 있습니다.

다음 편은 **Continuous Profiling** — profile을 시간에 따라 저장하고 비교하는 방법.

## 관련 항목

- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
- [5-08: Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [5-10: 연속 프로파일링](/blog/embedded/performance-engineering/part5-10-ebpf-continuous)
- [Embedded C++ 2-07: 템플릿 비용](/blog/embedded/embedded-cpp/part2-07-templates-cost)
