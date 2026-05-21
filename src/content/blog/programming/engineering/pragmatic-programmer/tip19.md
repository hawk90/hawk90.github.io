---
title: "Tip 19: Forgo Following Fads"
date: 2026-05-11T19:00:00
description: "유행을 따르지 마라 — 트렌드가 답이 아니다. 자기 문제와 자기 맥락이 답이다."
series: "The Pragmatic Programmer"
seriesOrder: 19
tags: [pragmatic-programmer, design]
draft: false
---

## 이 팁의 메시지

> **Tip 19: Forgo Following Fads.** Neal Ford calls this "problem first, not solution first" principle.

"이 기술이 요즘 뜨니까 써야 해." 이건 답이 아니다. 유행은 문제를 해결하지 않는다. 자기 문제와 자기 맥락에 맞는 도구를 선택해야 한다.

## 유행의 패턴

기술 유행에는 반복되는 패턴이 있다.

콘퍼런스에서 누군가 멋진 발표를 한다. 트위터와 Hacker News에 퍼진다. 모두가 채택한다. 6개월 후 단점이 드러난다. 1년 후 다음 유행이 등장한다. 이전 기술을 쓰던 팀은 레거시를 떠안는다.

3~5년 후에도 가치를 유지하는 기술은 유행이 아니라 검증된 도구다.

## 5년 룰

새 기술을 평가할 때 묻는다.

- 이 기술이 5년 후에도 살아남을까?
- 누가 안정적으로 후원하는가?
- 누가 이미 그만뒀는가? (Google의 여러 프로젝트들처럼)

5년 룰을 통과하지 못하는 기술은 프로덕션에 넣기 전에 다시 생각한다.

## 적용 전 검사

새 기술을 채택하기 전에 다음을 확인한다.

- **문제 적합성**: 우리 문제가 이 기술이 푸는 문제인가?
- **팀 역량**: 우리 팀이 이 기술을 다룰 수 있는가?
- **유지보수**: 5년 후 누가 이 코드를 유지보수하는가?
- **폐기 비용**: 이 기술이 안 맞으면 폐기하는 데 얼마나 드는가?

질문에 명확히 답할 수 없으면, 채택을 미룬다.

## 학습과 채택은 다르다

유행하는 기술을 배우는 것은 좋다. 시야가 넓어지고, 다른 접근 방식을 이해하게 된다. 그러나 배운다고 해서 프로덕션에 넣어야 하는 것은 아니다.

학습은 자유롭게, 채택은 신중하게. 둘을 구분해야 한다.

## 정리

- 유행은 답이 아니다. 자기 문제와 맥락이 답이다.
- 5년 룰로 기술의 지속 가능성을 판단한다.
- 채택 전에 문제 적합성, 팀 역량, 유지보수, 폐기 비용을 검토한다.
- 학습과 채택을 구분한다.

## 다음 장 예고

[Tip 20: Use Tracer Bullets to Find the Target](/blog/programming/engineering/pragmatic-programmer/tip20)에서는 조명탄 개발 방법론을 다룬다. 끝에서 끝까지 얇게 연결하고, 피드백을 받아 조준을 조정한다.

## 관련 항목

- [Tip 10: Critically Analyze What You Read and Hear](/blog/programming/engineering/pragmatic-programmer/tip10)
- [Tip 18: There Are No Final Decisions](/blog/programming/engineering/pragmatic-programmer/tip18)
- [Tip 20: Use Tracer Bullets to Find the Target](/blog/programming/engineering/pragmatic-programmer/tip20)
