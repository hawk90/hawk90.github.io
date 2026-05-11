---
title: "DSA 1: 알고리즘이란 — 좋은 알고리즘의 5가지 기준"
date: 2026-03-01T10:00:00
description: "알고리즘의 정의와 좋은 알고리즘이 갖춰야 할 속성들."
tags: [Data Structure, Algorithm, Fundamentals]
series: "Data Structures and Algorithms"
seriesOrder: 1
draft: false
---

## 한 줄 요약

> **"알고리즘은 입력 → 출력의 유한한 단계"** — 5가지(입력·출력·명확성·유한성·실효성)를 모두 만족해야 진짜 알고리즘.

## 어떤 문제를 푸는가

"알고리즘"이란 단어는 일상에서 너무 광범위하게 쓰입니다. 정확히 무엇이 알고리즘이고 무엇이 아닐까?

Horowitz는 다음 5가지 기준을 제시합니다.

## 좋은 알고리즘의 5가지 기준

| 기준 | 의미 |
| --- | --- |
| **입력 (Input)** | 0개 이상의 명확한 입력 |
| **출력 (Output)** | 1개 이상의 결과 — 입력에 대해 의미 있는 |
| **명확성 (Definiteness)** | 각 단계가 모호하지 않게 정의 |
| **유한성 (Finiteness)** | 유한한 단계 후 반드시 종료 |
| **실효성 (Effectiveness)** | 각 단계가 사람이 종이로도 수행 가능한 기본 연산 |

### 알고리즘 vs 그냥 절차

```
프로그램: 무한 루프 OS — 알고리즘 X (유한성 위반)
요리 레시피: 알고리즘 — 5가지 모두 충족
```

OS는 영원히 도는 게 의도이므로 알고리즘이 아닌 **계산 절차**(computational procedure).

## 알고리즘 명세 4단계

1. **자연어** — 한국어/영어로 설명
2. **순서도** (flowchart) — 단순 알고리즘에 적합
3. **의사코드** (pseudocode) — 본 시리즈 표준
4. **프로그래밍 언어** — 최종 구현

## 의사코드 예 — 두 수의 최댓값

```
Algorithm Max(a, b):
    if a > b then return a
    else return b
```

→ C++ 구현:

```cpp
int max(int a, int b) {
    return (a > b) ? a : b;
}
```

→ C 구현:

```c
int max(int a, int b) {
    return (a > b) ? a : b;
}
```

## 알고리즘과 자료구조

> 알고리즘 + 자료구조 = 프로그램 (Niklaus Wirth)

자료구조 없이 알고리즘만으로는 부족 — 데이터를 어떻게 저장·접근하느냐가 알고리즘 성능을 결정.

이 시리즈는 **자료구조 → 자료구조 위 알고리즘** 순서로 진행.

## 핵심 정리

- 알고리즘은 5가지 기준(입력/출력/명확성/유한성/실효성)을 모두 만족해야 함
- 무한 루프 프로세스는 알고리즘이 아닌 절차
- 의사코드 → 프로그래밍 언어 순으로 명세
- 자료구조와 알고리즘은 분리 불가능

## 다음

- [복잡도 분석](/blog/programming/data-structures-and-algorithms/item02-asymptotic-analysis) — 알고리즘 비교 도구
