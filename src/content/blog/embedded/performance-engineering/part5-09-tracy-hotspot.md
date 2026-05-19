---
title: "5-09: Tracy·Hotspot·uftrace·Coz — 저오버헤드 모던 프로파일러"
date: 2026-05-08T28:00:00
description: "Tracy nanosecond instrumentation, Hotspot GUI, uftrace function trace, Coz causal profiler."
series: "Embedded Performance Engineering"
seriesOrder: 51
tags: [profiling, tracy, hotspot, uftrace, coz, low-overhead]
---

## 한 줄 요약

> **"perf로 부족한 곳에는 Tracy의 ns marker, Hotspot의 GUI, uftrace의 함수 trace, Coz의 causal 분석이 차례로 답을 줍니다."**

## 어떤 문제를 푸는가

perf와 ftrace는 강력하지만 GUI가 빈약하고, 사용자 코드에 직접 marker를 심기에는 비용이 듭니다. 게임이나 실시간 시스템처럼 ns 단위 분석이 필요하면 sampling은 한계가 분명합니다.

이 글에서 다루는 도구들은 perf와 ftrace의 약점을 다른 각도에서 보완합니다. Tracy는 게임 엔진 수준의 ns marker, Hotspot은 perf의 modern Qt GUI, uftrace는 사용자 함수 진입/이탈 전체 trace, Coz는 "이 함수를 N% 빠르게 하면 전체가 얼마나 빨라지나"를 답해 주는 causal profiler입니다.

각 도구의 설치, 출력, 적합한 시나리오를 살펴보고 마지막에 비교 표로 정리합니다.

## Tracy — ns 단위 instrumentation

Tracy는 Bartosz Taudul이 만든 frame profiler입니다. 게임 엔진의 frame profiling에서 출발해 임베디드와 일반 application에도 확산되고 있습니다.

```bash
git clone https://github.com/wolfpld/tracy
cd tracy
cmake -B build/profiler tracy/profiler
cmake --build build/profiler
```

코드에 marker를 심는 방식은 매우 단순합니다.

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

`ZoneScoped`은 RAII로 진입과 이탈을 자동 기록하며, marker 한 개당 약 50-100 ns의 비용입니다. Network 한 줄로 profiler GUI에 실시간 송신되어, ns resolution timeline을 즉시 봅니다.

Tracy의 강점은 다음과 같습니다.

```text
- Marker 비용 50-100 ns
- 실시간 네트워크 송신 (target과 GUI 분리)
- Memory allocation tracking, lock tracking
- GPU(OpenGL, Vulkan, DirectX, CUDA) annotation 지원
- Frame statistics (95th, 99th percentile, max)
```

게임이 아니어도 frame이라는 개념이 있는 시스템(video pipeline, motion control loop, 센서 fusion cycle)에 잘 맞습니다.

## Hotspot — perf의 Qt GUI

Hotspot은 KDAB가 만든 perf 결과 viewer입니다. `perf report`의 텍스트 UI를 Qt GUI로 재구성한 형태이며 무료 오픈 소스입니다.

```bash
# Ubuntu
apt install hotspot

# AppImage
wget https://github.com/KDAB/hotspot/releases/download/v1.5.0/hotspot-v1.5.0-x86_64.AppImage
chmod +x hotspot-*.AppImage
```

기본 사용은 매우 단순합니다.

```bash
perf record -g ./app
hotspot perf.data
```

GUI는 다음 view를 한 화면에 띄웁니다.

```text
Summary       — 전체 통계, 시스템 정보
Bottom-Up     — leaf 함수 순위
Top-Down      — root부터 호출 트리
Flamegraph    — 내장 flamegraph (수집 없이 즉시)
Caller/Callee — 특정 함수의 호출 관계
Off-CPU       — sched switch가 같이 수집되면 표시
```

Flamegraph를 별도 스크립트 없이 GUI에서 바로 그릴 수 있고, 클릭으로 source line까지 navigate됩니다. perf 결과를 자주 본다면 작업 효율이 크게 올라갑니다.

## uftrace — 사용자 함수 전체 trace

uftrace는 Linux 사용자 공간 함수 진입/이탈을 ftrace 스타일로 기록하는 도구입니다. ftrace가 커널을 대상으로 했다면 uftrace는 사용자 application이 대상입니다.

```bash
apt install uftrace

# 컴파일 시 -pg 추가
gcc -pg -o app app.c

# 기록
uftrace record ./app

# 출력
uftrace replay
uftrace report
uftrace graph
```

```text
# uftrace replay
   DURATION    TID     FUNCTION
            [ 1234] | main() {
   12.345 us [ 1234] |   parse_input() {
    1.234 us [ 1234] |     malloc();
    2.345 us [ 1234] |     memcpy();
   12.000 us [ 1234] |   } /* parse_input */
   45.678 us [ 1234] |   process() {
            [ 1234] |     compute() {
   30.000 us [ 1234] |       inner_loop();
   30.500 us [ 1234] |     } /* compute */
   45.000 us [ 1234] |   } /* process */
```

ftrace의 function_graph와 거의 같은 출력을 사용자 코드에서 봅니다. Sampling profiler가 빠뜨리는 짧은 함수 호출도 모두 보입니다.

Filter로 특정 함수만 trace할 수 있습니다.

```bash
uftrace record -F 'parse_*' -F 'compute' ./app
uftrace record -N 'malloc' -N 'free' ./app    # 제외
```

ChromeBook 개발팀과 일부 Linux 배포판에서 디버깅 도구로 사용합니다.

## Coz — Causal Profiler

UMass의 Curtsinger와 Berger가 발표한 도구로, "이 함수를 N% 빠르게 하면 전체 throughput이 얼마나 향상되나"를 답합니다.

기존 profiler는 "이 함수가 30% 시간을 쓴다"를 알려 줍니다. 그러나 30% 시간을 쓰는 함수를 0%로 줄여도 전체가 30% 빨라진다는 보장이 없습니다. 다른 thread가 그 함수의 결과를 기다리지 않으면 의미가 없기 때문입니다.

Coz는 가상으로 다른 모든 코드를 느리게 만들어, 대상 함수가 상대적으로 빨라진 효과를 시뮬레이션합니다.

```bash
git clone https://github.com/plasma-umass/coz
cd coz
make
sudo make install
```

코드에 progress point를 심습니다.

```c
#include <coz.h>

void process_request(Request* r) {
    handle(r);
    COZ_PROGRESS;                /* 처리 한 단위 */
}
```

실행은 다음과 같습니다.

```bash
coz run --- ./app
plot profile.coz
```

결과는 함수별 가상 속도 향상과 전체 throughput 향상의 관계 그래프입니다.

```text
function: parse_json
  10% faster  → 1% throughput gain   (병목 아님)

function: db_query
  10% faster  → 9% throughput gain   (진짜 병목)
```

병렬 시스템에서 "어느 함수를 최적화해야 가장 효과가 큰가"를 직접 답해 줍니다.

## Apple Instruments — 비교 참고

macOS와 iOS에는 Instruments가 표준 도구입니다. Time Profiler, System Trace, Allocations, Leaks 등 여러 instrument를 한 timeline에서 결합합니다. Tracy와 사고 방식이 유사하며 GPU(Metal) trace도 통합되어 있습니다.

오픈 소스 도구를 쓸 수 없는 환경에서 Mac을 갖고 있다면 Instruments는 매우 강력한 대안입니다.

## 언제 어떤 도구를 쓰나

| 시나리오 | 추천 도구 |
|---|---|
| Frame 기반 시스템의 ns 단위 분석 | Tracy |
| perf record 결과를 보기 좋게 | Hotspot |
| 사용자 함수 전체 호출 trace | uftrace |
| 어디를 최적화해야 효과적인지 | Coz |
| GPU와 CPU 통합 (NVIDIA) | Nsight Systems |
| GPU와 CPU 통합 (Apple) | Instruments |
| 시스템 전체 sampling | perf record |
| 커널 내부 흐름 | ftrace, eBPF |

이 글에서 다룬 도구들은 perf의 대체가 아닙니다. perf로 큰 그림을 보고, Tracy로 ns 단위 phase를 확인하고, Coz로 어디부터 손대야 할지 정한 뒤, uftrace로 함수 흐름을 거꾸로 따라가는 식의 조합이 효과적입니다.

## 시나리오 — 미디어 처리 pipeline 튜닝

```text
1. perf record로 hot 함수 식별
   → decoder, filter, encoder가 골고루 hot

2. Coz로 어디가 진짜 병목인지 확인
   → encoder를 10% 빠르게 하면 전체 8% 향상
      decoder를 10% 빠르게 해도 전체 1% 향상

3. encoder에 Tracy ZoneScoped 심기
   → 어느 phase가 ns 단위로 오래 걸리는지

4. 발견한 phase를 uftrace로 호출 흐름 추적
   → 의외의 memcpy가 보임

5. memcpy 제거 후 다시 1번부터 측정
```

이 흐름이 일반적인 모던 profiling cycle입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Tracy를 release build에 그대로 두기

```cpp
#define TRACY_ENABLE             // production 빌드에 켜져 있음
```

Tracy marker는 가볍지만 0은 아닙니다. 평가용 build에만 enable하거나 macro로 빠르게 끌 수 있도록 분리합니다.

> ⚠️ uftrace -pg overhead 무시

```bash
gcc -pg ./app                    # 모든 함수에 hook 삽입
```

`-pg`는 모든 함수 prologue에 mcount 호출을 추가하므로 5-20% overhead입니다. Production binary에는 절대 빌드하지 않습니다.

> ⚠️ Coz의 progress point 위치를 잘못 선택

```c
void main() {
    while (true) {
        process();
        COZ_PROGRESS;            /* 한 cycle = 한 progress */
    }
}
```

Progress가 의미하는 단위(요청 한 개, frame 한 개, 처리 한 단위)를 정확히 정해야 결과가 의미 있습니다. 너무 자잘하면 noise, 너무 큰 단위면 통계가 부족합니다.

> ⚠️ Hotspot에서 frame pointer 없는 perf.data

Hotspot도 perf와 같은 데이터를 보므로 frame pointer가 없으면 callchain이 깨집니다. 컴파일 단계에서 `-fno-omit-frame-pointer`가 필수입니다.

## 정리

- Tracy는 ns 단위 marker로 frame 기반 시스템에 적합하며 marker 비용이 50-100 ns입니다.
- Hotspot은 perf.data를 Qt GUI로 보여 주며 flamegraph를 GUI 안에서 생성합니다.
- uftrace는 ftrace 스타일로 사용자 함수 전체 호출 trace를 제공합니다.
- Coz는 causal profiler로 가상의 속도 향상이 전체 throughput에 미치는 효과를 측정합니다.
- 도구들은 perf의 대체가 아니라 보완이며, 함께 조합해 사용합니다.
- Apple Instruments는 macOS/iOS의 통합 대안이며 Metal GPU trace를 포함합니다.

다음 편은 **Continuous Profiling** — production 24/7 항상 켠 상태로 분석.

## 관련 항목

- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
- [5-08: Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [5-10: 연속 프로파일링](/blog/embedded/performance-engineering/part5-10-ebpf-continuous)
- [Embedded C++ 2-07: 템플릿 비용](/blog/embedded/embedded-cpp/part2-07-templates-cost)
