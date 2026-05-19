---
title: "5-05: Flamegraph 분석 — On-CPU·Off-CPU·Differential"
date: 2026-05-08T43:00:00
description: "Brendan Gregg flamegraph로 on-CPU·off-CPU·차분 분석. perf·BCC stack 수집."
series: "Embedded Performance Engineering"
seriesOrder: 43
tags: [flamegraph, perf, brendan-gregg, off-cpu]
---

## 한 줄 요약

> **"Flamegraph는 수천 개의 stack sample을 한 장의 가로폭으로 압축해, 어디서 시간을 쓰는지 한눈에 보여 줍니다."**

## 어떤 문제를 푸는가

`perf report`의 tree view는 정확하지만 한 화면에 한 path만 보여 줍니다. 100개 함수가 균등하게 hot하면 모든 path를 펼쳐 보며 비교해야 합니다.

Flamegraph는 동일한 stack sample을 가로폭으로 합쳐 보여 줍니다. 가로폭이 넓으면 hot, 세로가 높으면 깊은 호출입니다. 색상은 의미가 없고 시각적 구분 용도이며, 정렬은 알파벳 순입니다.

이 글에서는 perf로 stack을 수집해 flamegraph로 변환하는 표준 workflow, off-CPU flamegraph, 차분 flamegraph를 살펴봅니다.

## 표준 Workflow — perf → flamegraph

Brendan Gregg의 flamegraph 스크립트는 GitHub에서 받습니다.

```bash
git clone https://github.com/brendangregg/FlameGraph
cd FlameGraph
```

수집과 변환은 세 단계입니다.

```bash
# 1. perf record로 99 Hz로 stack sample 수집
perf record -F 99 -g --call-graph dwarf -- ./app
# 또는 PID 지정
perf record -F 99 -g -p <pid> -- sleep 30

# 2. perf script로 텍스트로 dump
perf script > out.perf

# 3. stackcollapse-perf.pl로 collapsed format으로
./stackcollapse-perf.pl out.perf > out.folded

# 4. flamegraph.pl로 SVG 생성
./flamegraph.pl out.folded > flame.svg
```

생성된 SVG는 브라우저에서 열면 클릭과 검색이 가능합니다.

## Collapsed Format 이해

`stackcollapse-perf.pl`의 출력은 매우 단순합니다.

```text
app;main;process_request;parse_json   1234
app;main;process_request;db_query     567
app;main;write_response               89
```

세미콜론으로 구분된 stack과 sample 횟수입니다. 이 포맷이 단순하므로 다른 source에서도 같은 형식으로만 만들면 동일한 flamegraph를 그릴 수 있습니다.

```bash
# BCC profile이 직접 만들어 줌
profile-bpfcc -F 99 -af 30 > out.folded
flamegraph.pl < out.folded > flame.svg

# Java용
stackcollapse-jstack.pl jstack.txt > out.folded
```

## 읽는 법

```text
폭     — 해당 stack의 sample 비율 (전체 시간에서 차지하는 비중)
높이   — 호출 깊이
색상   — 무의미 (시각 구분용)
정렬   — 알파벳 순 (시간 순서 아님)
```

가장 흔한 패턴은 다음과 같습니다.

```text
[main           ]   ← 폭 = 전체
[ a    ][   b   ]   ← a는 30%, b는 70% 시간
   [ a1][ b1][b2]   ← 자식들
```

`a`가 30%의 시간을 쓰고 `b`가 70%라면, `b`의 자식 중 가장 넓은 것이 가장 큰 hot spot입니다. 폭이 좁은 leaf는 무시해도 됩니다.

## Off-CPU Flamegraph

일반 flamegraph는 on-CPU 시간만 보여 줍니다. 즉 sleep, I/O 대기, lock 대기 같은 blocked 시간은 빠집니다. 100ms 응답 시간 중 99ms를 I/O로 대기하면 on-CPU flamegraph는 1ms 영역만 보여 줍니다.

Off-CPU flamegraph는 `sched_switch` tracepoint로 task가 CPU를 떠나는 순간 stack을 기록합니다.

```bash
# BCC offcputime
offcputime-bpfcc -df 30 > out.stacks
flamegraph.pl --color=io --title="Off-CPU Time" < out.stacks > offcpu.svg

# 또는 perf로
perf record -e sched:sched_switch -g --call-graph dwarf -- sleep 30
perf script | ./stackcollapse-perf.pl > out.folded
flamegraph.pl --color=io < out.folded > offcpu.svg
```

I/O 대기와 mutex contention이 우측에 큰 면적으로 나타납니다.

## On-CPU와 Off-CPU 함께 보기

```text
응답 시간 = on-CPU + off-CPU
```

두 flamegraph를 나란히 두고 보면 병목의 정체가 드러납니다.

| 패턴 | 의미 |
|---|---|
| on-CPU가 크고 off-CPU가 작음 | CPU bound, 알고리즘 최적화 |
| off-CPU가 크고 on-CPU가 작음 | I/O 또는 lock bound |
| 둘 다 큼 | 시간 사용이 분산, 단계별 진단 |
| 둘 다 작음 | 응답 시간이 다른 곳에서 발생 (network round-trip 등) |

## 차분 Flamegraph — Before/After 비교

성능 개선 전후를 비교할 때 차분 flamegraph가 유용합니다.

```bash
# before 측정
perf record -F 99 -g -- ./app-old
perf script | ./stackcollapse-perf.pl > before.folded

# after 측정
perf record -F 99 -g -- ./app-new
perf script | ./stackcollapse-perf.pl > after.folded

# 차분 flamegraph
./difffolded.pl before.folded after.folded | ./flamegraph.pl > diff.svg
```

빨간색은 after에서 증가한 부분, 파란색은 감소한 부분입니다. 의도한 함수만 파랗게 변했는지, 다른 곳에 회귀가 생겼는지 한눈에 확인할 수 있습니다.

## Icicle Graph — 거꾸로

기본 flamegraph는 bottom-up으로 leaf가 위쪽입니다. Icicle graph는 top-down으로 root가 위쪽입니다.

```bash
flamegraph.pl --reverse < out.folded > icicle.svg
flamegraph.pl --inverted < out.folded > inverted.svg
```

`--reverse`는 함수 순서를 뒤집어 leaf부터 보여 줍니다. 어떤 leaf 함수가 여러 path에서 호출되는지 확인할 때 유용합니다.

## 색상 옵션

```bash
flamegraph.pl --color=hot < out.folded > hot.svg       # 기본 (warm)
flamegraph.pl --color=mem < out.folded > mem.svg       # 초록 계열
flamegraph.pl --color=io < out.folded > io.svg         # off-CPU용
flamegraph.pl --color=java < out.folded > java.svg     # Java JIT 구분
flamegraph.pl --color=wakeup < out.folded > wake.svg   # wakeup analysis
```

`--color=java`는 JIT 컴파일된 메서드와 native, GC를 다른 색으로 구분해 줍니다.

## 시나리오 — 웹 서비스 응답 시간 분석

```bash
# 1. on-CPU 30초
perf record -F 99 -g -p <pid> -- sleep 30
perf script | ./stackcollapse-perf.pl > on.folded
./flamegraph.pl on.folded > on.svg

# 2. off-CPU 30초
offcputime-bpfcc -df -p <pid> 30 > off.folded
./flamegraph.pl --color=io off.folded > off.svg

# 3. 두 SVG를 같이 열고 비교
```

대부분의 web service는 off-CPU가 80% 이상이며, on-CPU는 JSON 직렬화나 암호화에 집중됩니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Frame pointer 누락

```bash
gcc -O2 app.c                          # -fno-omit-frame-pointer 없음
perf record -g --call-graph fp ./app   # → stack 깨짐, flame이 짧고 평평
```

`-fno-omit-frame-pointer`로 컴파일하거나 `--call-graph dwarf`를 사용합니다.

> ⚠️ Sampling rate가 너무 낮음

```bash
perf record -F 9 ./app                 # 9 Hz → 30초에 270 sample
```

Sample이 적으면 통계가 부정확합니다. 99 Hz 또는 999 Hz가 표준입니다. 99 Hz는 다른 주기적 작업과 alias가 발생하지 않도록 prime number를 쓰는 관행입니다.

> ⚠️ On-CPU만 보고 I/O 무시

```text
on-CPU flame이 비어 있음 → "최적화할 곳 없음"으로 결론
```

응답 시간이 길지만 on-CPU가 비어 있으면 거의 항상 off-CPU에 답이 있습니다.

> ⚠️ 너무 짧은 측정 시간

```bash
perf record -F 99 ./app                # 0.1초만 실행
```

수집 시간이 짧으면 잡음에 묻힙니다. 최소 5초, 가능하면 30초 이상을 기록합니다.

## 정리

- Flamegraph는 collapsed stack format을 SVG로 시각화한 표준 도구입니다.
- 폭이 hot의 비율을, 높이가 호출 깊이를 나타내며 색상과 정렬은 의미가 없습니다.
- On-CPU flamegraph는 CPU 시간을, off-CPU flamegraph는 blocked 시간을 보여 줍니다.
- 차분 flamegraph로 before/after 회귀를 시각적으로 확인합니다.
- Frame pointer가 없으면 stack이 깨지므로 컴파일 옵션 또는 DWARF를 사용합니다.
- 99 Hz, 30초 이상이 표준 sampling 설정입니다.

다음 편은 **ARM DS / Lauterbach** — 임베디드 전용 hardware trace 도구.

## 관련 항목

- [5-04: eBPF/bpftrace](/blog/embedded/performance-engineering/part5-04-ebpf)
- [5-06: ARM DS / Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)
- [5-09: Tracy·Hotspot·uftrace](/blog/embedded/performance-engineering/part5-09-tracy-hotspot)
