---
title: "Speculative Execution 분석 — OoO·Reorder Buffer·Register Renaming"
slug: "embedded/performance-engineering/part2-04-speculative-execution"
date: 2026-04-24T09:03:00
description: "Out-of-order execution의 ROB·rename·추측 load를 보고, M2 Pro에서 독립 cache miss를 겹치는 효과를 재고, Cortex-A72 SOG에 공개된 값만 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 12
tags: [cpu, speculative, ooo, reorder-buffer, renaming]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Speculation = 미래 예측 실행"**입니다. 결과가 맞으면 *commit*하고 틀리면 *rollback*합니다.

## In-Order vs Out-of-Order

```asm
ldr x0, [x1]        // load — DRAM까지 가면 이 글의 측정에서 약 120 ns
add x2, x3, x4      // x0 무관 — 독립
sub x5, x6, x7      // 독립
mul x8, x0, x9      // x0 의존 — load 완료까지 대기
```

in-order 코어는 명령을 프로그램 순서대로 발행하므로, `ldr`이 결과를 기다리는 동안 뒤의 독립 명령도 나아가지 못할 수 있습니다. out-of-order 코어는 뒤의 `add`, `sub`처럼 준비된 명령을 먼저 실행하고, `mul`만 `ldr`을 기다립니다. Arm 문서 기준으로 Cortex-A53은 in-order(TRM DDI 0500E 1.3), Cortex-A72는 dispatch 이후 out-of-order(SOG UAN 0016A 2.1)입니다.

## 측정 — 독립 miss를 겹쳐 기다리기

OoO의 효과가 가장 크게 드러나는 곳은 독립적인 cache miss 여러 개를 동시에 기다릴 때입니다. M2 Pro에서 256 MiB 무작위 순환 리스트를 따라가는 포인터 사슬을 K개 만들고, 루프 한 번에 K개를 한 걸음씩 나아가게 했습니다. 사슬끼리는 서로 의존하지 않으므로 코어가 그 load들을 겹칠 수 있습니다. 전체 load 수는 6,400만 개로 고정했습니다(`bench/mlp.c`, `clang -O2`, K마다 3회).

```c
for (long s = 0; s < steps; s++)
    for (int k = 0; k < K; k++)
        p[k] = next[p[k]];      /* 각 사슬의 load는 자기 사슬의 앞 load에만 의존 */
```

| K (독립 사슬 수) | load 하나당 시간 (3회) |
|---:|---|
| 1 | 119.68, 122.24, 113.97 ns |
| 2 | 60.90, 60.92, 61.02 ns |
| 4 | 32.96, 32.58, 32.67 ns |
| 8 | 17.08, 17.41, 16.88 ns |
| 16 | 9.41, 9.00, 9.22 ns |

사슬 하나일 때 load 하나는 약 120 ns, 즉 메모리 왕복 한 번입니다. 사슬을 16개로 늘리자 load당 시간이 13분의 1로 줄었습니다. 각 load의 latency가 줄어든 게 아니라 16개의 miss가 동시에 진행되며 서로의 대기를 가렸습니다. 1-07의 Little's Law로 말하면, 동시에 나가 있는 요청 수가 대역폭을 정합니다.

## OoO 핵심 구성요소

![Out-of-Order 실행 구조 — Fetch, Decode, Issue Queue, Execution Units, ROB, Commit](/images/blog/perf-eng/diagrams/part2-04-ooo-structure.svg)

Cortex-A72 Software Optimization Guide 2.1절의 설명은 이 그림과 같은 흐름입니다. 명령을 fetch해 µop로 decode하고, register rename과 dispatch를 거친 µop는 피연산자를 기다렸다가 여덟 개의 실행 파이프라인 중 하나로 out-of-order issue됩니다. 각 파이프라인은 cycle마다 µop 하나를 받아 끝낼 수 있습니다.

## Register Renaming

```text
ISA:  add x0, x1, x2   →   p10 = p1 + p2    (x0 → p10)
      sub x3, x0, x4   →   p11 = p10 + p4   (x0는 p10을 읽고, x3 → p11)
      add x0, x5, x6   →   p12 = p5 + p6    (x0 → p12, WAW 해소)
```

같은 ISA 레지스터 `x0`의 두 정의가 서로 다른 물리 레지스터로 갈라지므로, 진짜 의존성(RAW)만 남습니다. A72 SOG 4.9절은 A72가 범용 레지스터를 rename하지만 대부분의 특수 목적 레지스터는 rename하지 않고, 그런 레지스터를 읽고 쓰는 명령은 비추측 실행 같은 제약을 받는다고 적습니다. 물리 레지스터 수는 SOG에 나오지 않습니다.

## Reorder Buffer (ROB)

OoO 코어는 명령을 순서와 다르게 *실행*하지만, 결과는 프로그램 순서대로 *확정(commit, retire)*합니다. 위 예에서 `add`와 `sub`가 먼저 끝나도, 앞선 `ldr`이 끝나기 전에는 확정되지 않고 기다립니다. 이렇게 해야 `ldr`이 예외를 일으켰을 때 그 뒤의 명령이 아무 일도 하지 않은 것처럼 되돌릴 수 있습니다. ROB 크기와 issue queue 크기는 A72 SOG에 공개되어 있지 않습니다.

## Speculative Load — Load Hoisting

```c
if (ptr != NULL) {
    x = ptr->field;   // 분기 확정 전에 미리 load될 수 있음
}
```

분기 예측(2-03)이 `ptr != NULL` 쪽을 고르면, 코어는 비교 결과가 나오기 전에 `ptr->field`의 load를 시작합니다. 예측이 맞으면 그 결과를 쓰고, 틀리면 결과를 버립니다. 이때 버린 load가 캐시에 가져온 line은 그대로 남습니다.

## Wrong-Path Execution과 Spectre

잘못 예측한 경로에서 실행한 명령은 architectural state(레지스터, 메모리)에서는 모두 되돌려지지만, 캐시 상태는 되돌려지지 않습니다. Spectre는 이 차이를 이용합니다. Linux `Documentation/admin-guide/hw-vuln/spectre.rst`의 설명대로 variant 1(CVE-2017-5753, bounds check bypass)은 추측 실행 경로에서 경계 검사를 우회한 인덱스로 메모리를 읽고, 그 흔적을 캐시 timing으로 읽어 냅니다. arm64 커널의 대책(`array_index_mask_nospec()`과 `csdb`)은 2-03에서 보았습니다.

## Memory Disambiguation

```asm
str x0, [x1]        // store
ldr x2, [x3]        // load — x1 == x3?
```

load를 앞선 store보다 먼저 실행하려면 두 주소가 다르다는 것을 알아야 합니다. 같은 주소라면 store할 값을 load로 바로 넘기거나(store-to-load forwarding), store가 끝날 때까지 기다립니다. A72 SOG 3.9절은 store µop가 주소 피연산자만 준비되면 데이터 피연산자를 기다리지 않고 issue될 수 있다고 적습니다. load와 store의 순서를 맞추는 내부 구조는 SOG에 나오지 않습니다.

## Speculative Execution의 측정

```bash
perf stat -e instructions,cycles,branches,branch-misses ./prog
```

IPC가 낮은데 branch-miss 비율도 낮으면, 시간은 분기가 아니라 메모리나 의존 사슬에서 쓰이고 있습니다. 1-02의 `chase`(IPC 0.11)와 위 K = 1 측정이 그 예입니다. 이 시리즈의 게스트에는 PMU 카운터가 없어 이 명령은 실행하지 못했습니다(1-01).

## ARM Cortex-A72 — SOG에 공개된 값

| 항목 | 값 | 출처 |
|---|---|---|
| Dispatch | cycle당 최대 3 µop | UAN 0016A 4.1 |
| 실행 파이프라인 | Branch 1, Integer 2, Integer Multi-Cycle 1, FP/ASIMD 2, Load 1, Store 1 | UAN 0016A 2.1 |
| L1 D-cache hit load latency | 즉시 오프셋 `LDR` 4 cycle, 감산 레지스터 오프셋 5 cycle | UAN 0016A 3.8 |
| ROB, issue queue, 물리 레지스터 수 | 공개되지 않음 | — |

3.1절은 "Exec Latency"를 "그 그룹 명령에 의존하는 연산이 보는 최소 latency"로 정의합니다.

## OoO와 WCET

Wilhelm 외(2008) 5절은 timing anomaly가 있으면 측정 기반 방법이 최악의 초기 상태를 찾기가 매우 어렵다고 적습니다. 안전하려면 모든 초기 상태에서 재야 하지만 그것은 비현실적이므로, 일부 초기 상태만 쓰는 측정 기반 방법은 안전하지 않습니다. 같은 논문 2.1.3절은 강력한 마이크로프로세서 대부분이 timing anomaly를 겪는다고 적고, 그림 2로 추측 실행이 일으키는 anomaly를 예로 듭니다.

## 자주 하는 실수

> ⚠️ OoO가 의존 사슬도 빠르게 해 준다는 가정

위 측정에서 사슬 하나는 OoO 코어에서도 load당 120 ns였습니다. OoO는 *독립* 명령을 겹칠 뿐이므로, 의존 사슬은 자료구조나 알고리즘을 바꿔야 줄어듭니다.

> ⚠️ Speculation barrier 남발

```c
__asm__ volatile("dsb sy; isb" ::: "memory");
```

이런 장벽을 루프 안에 넣으면 앞선 명령이 끝날 때까지 뒤를 막으므로, 위 측정에서 본 것 같은 독립 load의 겹치기를 막게 됩니다(이 경우는 재지 않았습니다). Spectre 대책은 커널처럼 공격자가 영향을 줄 수 있는 인덱스·포인터에만 `csdb` 같은 정해진 장치를 씁니다.

> ⚠️ WCET = 관측 최대

관측 최대는 시험한 초기 상태의 최대일 뿐입니다(Wilhelm 5절).

## 정리

- OoO에서는 **issue 순서와 완료 순서가 다르고**, 확정은 프로그램 순서대로 합니다.
- **Register renaming**으로 WAR·WAW 의존성을 제거합니다(A72 SOG 4.9).
- M2 Pro에서 독립 포인터 사슬을 1개에서 16개로 늘리자 load당 시간이 120 ns에서 9 ns로 줄었습니다. OoO의 이득은 독립 miss를 겹치는 데서 나옵니다.
- 잘못된 경로의 실행은 레지스터에서는 사라지지만 캐시에는 흔적을 남기고, Spectre가 이것을 이용합니다.
- A72 SOG는 dispatch 폭, 실행 파이프라인, load latency를 공개하고 ROB 크기는 공개하지 않습니다.

다음 편은 **Cache 기초**입니다.

## 관련 항목

- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)
- [2-05: Cache 기초](/blog/embedded/performance-engineering/part2-05-cache-basics)

## 참고 자료

- Cortex-A72 Software Optimization Guide (UAN 0016A) 2.1, 3.1, 3.8, 3.9, 4.1, 4.9
- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 1.3
- R. Wilhelm et al., "The Worst-Case Execution-Time Problem—Overview of Methods and Survey of Tools," *ACM TECS* 7(3), 2008, 5절
- Linux v6.12 `Documentation/admin-guide/hw-vuln/spectre.rst`
