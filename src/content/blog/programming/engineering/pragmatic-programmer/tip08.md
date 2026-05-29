---
title: "Tip 8: Make Quality a Requirements Issue"
date: 2026-05-11T08:00:00
description: "품질을 요구사항의 일부로 만들어라 — 사용자와 함께 '얼마나 좋아야 하는가'를 결정하라."
series: "The Pragmatic Programmer"
seriesOrder: 8
tags: [pragmatic-programmer, quality]
draft: true
---

## 이 팁의 메시지

> **Tip 8: Make Quality a Requirements Issue.** Involve your users in determining the project's real quality requirements.

품질은 개발이 끝난 뒤에 점검하는 것이 아니다. 요구사항 단계에서 사용자와 함께 "얼마나 좋아야 하는가"를 정의해야 한다.

## "더 좋게"의 함정

프로그래머는 항상 "더 좋게"의 유혹을 받는다. 코드를 한 번 더 리팩터링하고, 성능을 조금 더 끌어올리고, 엣지 케이스를 하나 더 처리한다. 좋은 의도다.

그러나 사용자 입장에서는 "충분히 좋으면" 만족한다. 0.1초 더 빠른 응답보다 새 기능을 원할 수 있다. 프로그래머 혼자 품질을 결정하면 자원이 엉뚱한 곳에 쓰인다.

## "충분히 좋은"의 정의

품질은 추상적인 개념이 아니다. 구체적인 기준으로 정의할 수 있다.

- **성능** — 응답 시간 200ms 이하, 동시 사용자 1000명 처리
- **정확도** — 계산 오차 0.01% 이하
- **가용성** — 99.9% uptime
- **보안** — OWASP Top 10 취약점 차단

이런 기준은 프로젝트 시작 시점에 사용자, PM, 개발팀이 함께 합의한다. 그래야 "충분히 좋은"이 무엇인지 모두가 알 수 있다.

## 과잉 품질은 낭비다

99.999% 가용성이 필요한 시스템이 있고, 99% 가용성이면 충분한 시스템이 있다. 둘을 같은 수준으로 만들면 후자에서 자원이 낭비된다.

저자들은 이렇게 말한다.

> "Great software today is often preferable to perfect software tomorrow."

오늘의 충분히 좋은 소프트웨어가 내일의 완벽한 소프트웨어보다 나을 때가 많다. 품질과 일정의 트레이드오프를 투명하게 논의하는 것이 실용주의다.

## 누가 결정하는가

품질 기준은 프로그래머 단독으로 정할 수 없다. 사용자, PM, 개발팀이 함께 정한다. 프로그래머의 역할은 트레이드오프를 설명하는 것이다.

- "이 수준의 성능을 맞추려면 2주가 더 필요합니다."
- "이 기능을 포기하면 보안 강화에 시간을 쓸 수 있습니다."

결정은 정보를 가진 사람들이 함께 내린다.

## 정리

- 품질은 요구사항의 일부다. 개발 후 점검 사항이 아니다.
- "충분히 좋은"의 기준을 사용자와 함께 정의한다.
- 과잉 품질은 자원 낭비다. 트레이드오프를 투명하게 논의한다.
- 프로그래머는 트레이드오프를 설명하고, 결정은 함께 내린다.

## 다음 장 예고

[Tip 9: Invest Regularly in Your Knowledge Portfolio](/blog/programming/engineering/pragmatic-programmer/tip09)에서는 개발자의 지식을 금융 포트폴리오처럼 관리하는 전략을 다룬다.

## 관련 항목

- [Tip 7: Remember the Big Picture](/blog/programming/engineering/pragmatic-programmer/tip07)
- [Tip 9: Invest Regularly in Your Knowledge Portfolio](/blog/programming/engineering/pragmatic-programmer/tip09)
