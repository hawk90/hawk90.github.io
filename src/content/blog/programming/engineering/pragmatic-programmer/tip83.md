---
title: "Tip 83: Maintain Small, Stable Teams"
date: 2026-05-12T11:00:00
description: "작고 안정적인 팀을 유지하라. 팀원이 자주 바뀌면 신뢰와 효율이 무너진다."
series: "The Pragmatic Programmer"
seriesOrder: 83
tags: [pragmatic-programmer, team, organization]
draft: false
---

## 이 팁의 메시지

> **Tip 83: Maintain Small, Stable Teams.** Teams work best when membership is stable.

팀은 멤버십이 안정적일 때 가장 잘 작동한다.

## 팀의 크기

작은 팀이 효과적이다.

| 팀 크기 | 특징 |
|---------|------|
| 2-3명 | 의사소통 오버헤드 최소 |
| 5-7명 | 이상적인 크기 ("피자 두 판") |
| 8-10명 | 의사소통 복잡해짐 |
| 10명+ | 하위 팀 분리 필요 |

```text
의사소통 채널 수 = n(n-1)/2

5명: 10개 채널
7명: 21개 채널
10명: 45개 채널
15명: 105개 채널
```

사람이 늘수록 의사소통 비용이 기하급수적으로 증가한다.

## 안정성의 중요성

팀원이 자주 바뀌면 문제가 생긴다.

```text
새 멤버가 올 때마다:
- 기존 멤버가 온보딩에 시간을 쓴다
- 코드베이스를 처음부터 배운다
- 팀 문화를 익힌다
- 신뢰를 쌓아야 한다
- 생산성이 일시적으로 떨어진다
```

## 팀 형성 단계

```text
터크만의 팀 발달 단계:

1. 형성(Forming): 서로를 알아간다
2. 혼란(Storming): 갈등이 생긴다
3. 규범(Norming): 규칙이 생긴다
4. 성취(Performing): 높은 생산성
5. 해산(Adjourning): 프로젝트 종료

팀이 바뀔 때마다 1단계부터 다시 시작한다.
```

## 안정적인 팀의 이점

| 불안정한 팀 | 안정적인 팀 |
|-------------|-------------|
| 매번 온보딩 | 즉시 작업 시작 |
| 암묵지 없음 | 풍부한 암묵지 |
| 신뢰 부족 | 깊은 신뢰 |
| 비효율적 의사소통 | 효율적 의사소통 |
| 책임 회피 | 공동 책임 |
| 단기 사고 | 장기 사고 |

## 팀 중심 조직

프로젝트에 사람을 배치하지 말고, 팀에 프로젝트를 배치한다.

```text
기존 방식:
프로젝트 A → 인력 풀에서 5명 배치
프로젝트 B → 인력 풀에서 7명 배치
프로젝트 종료 → 인력 해산

권장 방식:
팀 Alpha (5명, 안정적) → 프로젝트 A 담당
팀 Beta (6명, 안정적) → 프로젝트 B 담당
프로젝트 종료 → 팀 유지, 다음 프로젝트 담당
```

## 팀 안정성 위협 요소

```text
경계해야 할 것:
- 잦은 조직 개편
- 프로젝트 종료 후 팀 해산
- 기술 수요에 따른 인력 이동
- "필요한 곳에 자원 배치" 사고방식
- 개인 성과 중심 평가
```

## 팀을 지키는 방법

```text
팀 안정성 확보:
1. 팀 단위로 프로젝트 배정
2. 팀 단위로 성과 측정
3. 팀원 이동 최소화
4. 신중한 채용과 온보딩
5. 팀 문화와 규범 존중
6. 장기적 관점의 투자
```

## 정리

- 5~7명 규모의 작은 팀이 효과적이다.
- 팀원이 자주 바뀌면 생산성이 떨어진다.
- 안정적인 팀은 암묵지와 신뢰를 쌓는다.
- 프로젝트에 사람을 배치하지 말고 팀에 프로젝트를 배치한다.
- 팀 해산과 재구성은 비용이 크다.
- 팀 단위로 투자하고 평가한다.

## 다음 장 예고

[Tip 84: Schedule It to Make It Happen](/blog/programming/engineering/pragmatic-programmer/tip84)에서는 일정에 넣어야 실행된다는 원칙을 다룬다.

## 관련 항목

- [Tip 82: Agile Is Not a Noun; Agile Is How You Do Things](/blog/programming/engineering/pragmatic-programmer/tip82)
- [Tip 81: Don't Go into the Code Alone](/blog/programming/engineering/pragmatic-programmer/tip81)
