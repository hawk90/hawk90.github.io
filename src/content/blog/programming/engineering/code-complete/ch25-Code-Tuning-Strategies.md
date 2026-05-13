---
title: "Chapter 25: Code-Tuning Strategies"
date: 2026-06-21T01:00:00
description: "성능 튜닝의 전략 — 측정 먼저, 80/20, 디자인 변경 우선, 작은 코드 최적화는 마지막."
series: "Code Complete"
seriesOrder: 25
tags: [code-complete, performance, McConnell]
---

## 이 챕터의 메시지

성능 문제는 — 직관과 다르다. **추측은 거의 항상 틀린다**.

> 성능 튜닝의 첫 단계 = **측정**.

## 핵심 내용

- **측정 먼저**, 추측 X.
- **80/20** — 시간의 80%가 코드의 20%에.
- **디자인·아키텍처가 가장 큰 영향** — 마이크로 최적화는 마지막.
- **알고리즘 복잡도**가 코드 트릭보다 효과 크다.
- Knuth: "조기 최적화는 모든 악의 뿌리".

## 측정 먼저

> 어떤 코드가 느린지 — **프로파일러로 측정**한 뒤에야 안다.

```
사용자의 직관: A 함수가 느릴 것 같음.
프로파일러: 실제론 B 함수에서 시간의 70%를 씀.
```

추측 기반 튜닝은 — **노력 낭비**.

도구:

- C/C++: gprof, perf, Intel VTune.
- Python: cProfile.
- Java: JProfiler, async-profiler.
- 일반: 시스템 단의 perf, eBPF.

## 80/20 법칙

> 시간의 80%가 코드의 20%에서 일어난다.

성능 튜닝의 의미 — **그 20%만 최적화**. 나머지 80% 코드는 — 가독성 우선.

## 디자인이 우선

성능에 가장 큰 영향:

1. **알고리즘 복잡도** — O(n²)을 O(n log n)으로.
2. **자료구조 선택** — 적절한 컨테이너.
3. **아키텍처** — 어디서 무엇을 캐시할지.
4. **세부 코드** — loop unrolling, cache friendly.

순서가 중요하다. **위에서 아래로**.

## 알고리즘이 코드 트릭보다 크다

```python
# 비효율 알고리즘 — O(n²)
for x in list1:
    if x in list2:    # list2 검색 = O(n)
        ...

# 효율 알고리즘 — O(n)
set2 = set(list2)
for x in list1:
    if x in set2:     # set 검색 = O(1)
        ...
```

한 줄의 변경이 — 100배 차이.

## 조기 최적화의 함정

> Donald Knuth — "조기 최적화는 모든 악의 뿌리"
> (단, 모든 게 아니라 **약 97%의 자리에서**).

조기 최적화 = 측정 없이 — 추측에 기반한 최적화.

문제:

- 가독성 저하.
- 측정 안 했으니 — 진짜 병목이 다른 자리.
- 시간 낭비.

남은 3% — **진짜 병목이 측정으로 확인된 자리**에선 — 적극적 최적화 OK.

## 성능 vs 가독성

> 성능 향상은 — 가독성 손실의 비용을 정당화해야.

```c
// 가독성 — clear
for (auto& item : items) total += item.price;

// 최적화 — 빠르지만 어려움
auto* p = items.data();
auto* end = p + items.size();
double total = 0;
while (p != end) total += (p++)->price;
```

후자가 빠르지만 — 1% 향상에 가독성 50% 손실이라면 의미 없음.

## 정리

- **측정 먼저** — 추측 금지.
- **80/20** — 핫스팟에만 집중.
- **디자인 → 알고리즘 → 자료구조 → 코드 트릭** 순서.
- Knuth의 조기 최적화 경고.
- 성능 향상은 — **가독성 손실을 정당화**해야.

## 관련 항목

- [Ch 24: Refactoring](/blog/programming/engineering/code-complete/ch24-Refactoring)
- [Ch 26: Code-Tuning Techniques](/blog/programming/engineering/code-complete/ch26-Code-Tuning-Techniques)
