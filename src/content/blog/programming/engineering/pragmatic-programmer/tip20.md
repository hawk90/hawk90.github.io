---
title: "Tip 20: Use Tracer Bullets to Find the Target"
date: 2026-05-11T20:00:00
description: "조명탄을 써서 표적을 찾아라 — 끝과 끝을 잇는 얇은 코드로 — 빠른 피드백."
series: "The Pragmatic Programmer"
seriesOrder: 20
tags: [pragmatic-programmer, development]
draft: true
---

## 이 팁의 메시지

> **Tip 20: Use Tracer Bullets to Find the Target.** Tracer bullets let you home in on your target by trying things and seeing how close they land.

군인이 어둠 속에서 표적을 찾아야 한다. 조준이 맞는지 모른다. 이때 조명탄(tracer bullet)을 쏜다. 궤적이 빛나며 날아가고, 어디에 떨어지는지 보인다. 조준을 조정하고 다시 쏜다. 점점 표적에 가까워진다.

소프트웨어 개발도 같다. 처음부터 완벽한 조준은 불가능하다. 얇게 쏘고, 피드백을 받고, 조정한다.

## 조명탄 코드란

조명탄 코드는 시스템의 끝에서 끝까지를 관통하는 얇은 코드다.

새 웹 앱을 만든다고 하자. 첫 단계로 "Hello World" 한 페이지를 띄운다. 그러나 그냥 HTML 파일이 아니다. 데이터베이스 연결, 인증, 배포 파이프라인까지 모두 통과한다. 모든 층을 얇게 연결한 것이다.

이 얇은 코드가 동작하면, 각 부분에 살을 붙여 나간다.

## 조명탄 vs 프로토타입

둘은 다르다.

| 조명탄 코드 | 프로토타입 |
|------------|-----------|
| 살아남는 코드 | 폐기되는 코드 |
| 점차 완성됨 | 학습 후 버림 |
| 모든 층을 관통 | 한 측면만 탐구 |
| 실제 아키텍처 | 빠른 실험 |

프로토타입은 "이게 가능한가?"를 확인하고 버린다. 조명탄은 "어떻게 만들 것인가?"의 뼈대가 되어 계속 자란다.

## 조명탄의 이점

조명탄 접근법에는 여러 장점이 있다.

- **빠른 피드백**: 동작하는 코드가 있으므로 즉시 피드백을 받을 수 있다.
- **통합 문제 조기 발견**: 모든 층이 연결되어 있으므로 통합 문제가 일찍 드러난다.
- **사용자 조기 확인**: 사용자에게 일찍 보여줄 수 있다. 방향이 맞는지 확인한다.
- **동기 유지**: 동작하는 것이 있으면 팀의 사기가 올라간다.

## 적용 예시

새 프로젝트를 시작한다면 다음 순서를 따른다.

1. 가장 간단한 기능 하나를 정한다.
2. 그 기능이 모든 층을 통과하게 만든다(UI → 로직 → DB → 배포).
3. 동작을 확인한다.
4. 피드백을 받는다.
5. 다음 기능으로 살을 붙인다.

각 단계에서 시스템은 항상 동작한다.

## 정리

- 조명탄 = 끝에서 끝까지 관통하는 얇은 코드.
- 프로토타입과 다르다. 조명탄 코드는 버리지 않고 키운다.
- 빠른 피드백, 조기 통합, 사용자 확인, 동기 유지가 장점이다.
- 처음부터 완벽을 추구하지 않는다. 쏘고, 보고, 조정한다.

## 다음 장 예고

[Tip 21: Prototype to Learn](/blog/programming/engineering/pragmatic-programmer/tip21)에서는 조명탄과 달리 버리는 것을 전제로 한 프로토타입을 다룬다. 불확실성을 줄이기 위한 실험이다.

## 관련 항목

- [Tip 19: Forgo Following Fads](/blog/programming/engineering/pragmatic-programmer/tip19)
- [Tip 21: Prototype to Learn](/blog/programming/engineering/pragmatic-programmer/tip21)
