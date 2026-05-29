---
title: "Tip 18: There Are No Final Decisions"
date: 2026-05-11T18:00:00
description: "최종 결정은 없다 — 모든 결정은 가역적이라 가정하고 설계하라."
series: "The Pragmatic Programmer"
seriesOrder: 18
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Tip 18: There Are No Final Decisions.** No decision is cast in stone. Instead, consider each as being written in the sand at the beach, and plan for change.

"이번엔 확실해. 이 기술을 영원히 쓸 거야." 이렇게 생각한 결정이 몇 년 후 안티패턴이 된다. 영원한 결정은 신화다. 모든 결정을 가역적으로 설계해야 한다.

## 어제의 영원, 오늘의 안티

불과 몇 년 전에 "영원할 것"처럼 보였던 선택들이 있다.

- "MongoDB가 답이야" → 스케일 문제로 PostgreSQL로 이전.
- "REST가 표준이야" → GraphQL이 더 적합한 상황이 생김.
- "AngularJS로 통일이야" → React로 재작성.
- "VM이 미래야" → 컨테이너로 전환.

영원하다고 가정한 결정일수록 바꿀 때 비용이 크다.

## 결정을 격리한다

결정이 바뀔 수 있다면, 바뀔 때 영향 범위를 줄여야 한다. 결정을 추상 뒤에 숨기면 교체가 쉬워진다.

- **데이터베이스**: 리포지토리 패턴 뒤에 둔다. 구현만 교체하면 나머지는 그대로.
- **외부 API**: 어댑터 뒤에 둔다. 인터페이스만 유지하면 내부 구현은 자유.
- **프레임워크**: 핵심 도메인 로직을 프레임워크 밖에 둔다.
- **클라우드 제공자**: 추상 계층 뒤에 둔다. 특정 벤더에 종속되지 않는다.

한 자리만 바꾸면 전체가 따라오게 만든다.

## 두 가지 비용

결정에는 두 가지 비용이 따른다.

1. **결정을 내리는 비용**: 선택하는 데 드는 시간과 노력.
2. **결정을 바꾸는 비용**: 나중에 다른 선택으로 전환하는 데 드는 비용.

많은 팀이 첫 번째 비용에만 집중하고 두 번째 비용을 무시한다. 그러나 장기적으로는 두 번째 비용이 훨씬 크다.

## 정리

- 영원한 결정은 신화다. 모든 결정은 바뀔 수 있다.
- 결정을 추상 뒤에 격리한다. 바꿀 때 영향 범위를 줄인다.
- 결정을 내리는 비용뿐 아니라 바꾸는 비용도 고려한다.
- 가역성을 설계에 내장한다.

## 다음 장 예고

[Tip 19: Forgo Following Fads](/blog/programming/engineering/pragmatic-programmer/tip19)에서는 유행을 따르지 말라는 경고를 다룬다. "새롭다"는 이유만으로 선택하면 나중에 후회한다.

## 관련 항목

- [Tip 17: Eliminate Effects Between Unrelated Things](/blog/programming/engineering/pragmatic-programmer/tip17)
- [Tip 19: Forgo Following Fads](/blog/programming/engineering/pragmatic-programmer/tip19)
