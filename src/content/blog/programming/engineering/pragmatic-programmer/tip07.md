---
title: "Tip 7: Remember the Big Picture"
date: 2026-05-11T07:00:00
description: "큰 그림을 기억하라 — 끓는 개구리가 되지 마라. 작은 변화의 누적을 인식하라."
series: "The Pragmatic Programmer"
seriesOrder: 7
tags: [pragmatic-programmer, perspective]
draft: false
---

## 이 팁의 메시지

> **Tip 7: Remember the Big Picture.** Don't get so engrossed in the details that you forget to check what's happening around you.

[Tip 5](/blog/programming/engineering/pragmatic-programmer/tip05)와 [Tip 6](/blog/programming/engineering/pragmatic-programmer/tip06)이 작은 것에 집중하라고 했다면, 이 팁은 반대 방향의 위험을 경고한다. 세부에 파묻히면 전체가 망가지는 것을 놓친다.

## 끓는 개구리 우화

개구리를 끓는 물에 넣으면 즉시 뛰쳐나온다. 그러나 찬물에 넣고 천천히 가열하면 개구리는 위험을 감지하지 못한다. 온도가 서서히 올라가는 동안 적응하다가, 결국 끓는 물에 익어 버린다.

실제 생물학적 사실은 아니다. 그러나 메타포로서의 힘은 여전하다. 작은 변화는 알아차리기 어렵고, 그래서 더 위험하다.

## 소프트웨어의 끓는 물

프로젝트에서 다음과 같은 일이 일어난다.

- 빌드 시간이 5초에서 5분으로 늘어났다. 매일 조금씩 늘었기 때문에 누구도 문제 삼지 않았다.
- 테스트 커버리지가 80%에서 30%로 떨어졌다. 한 번에 떨어진 게 아니라 PR마다 조금씩 빠졌다.
- 회의가 30분에서 2시간으로 늘어났다. 안건이 하나씩 추가되면서 자연스럽게 그렇게 되었다.
- "임시" 코드가 1년째 프로덕션에서 돌아가고 있다. 고칠 시간이 없어서 매번 미뤘다.

하루하루는 작은 변화다. 그러나 누적되면 시스템 전체가 끓는 물이 된다.

## 거리 두고 보기

끓는 개구리가 되지 않으려면 주기적으로 물 밖으로 나와야 한다.

- **회고(retrospective)** — 정기적으로 "지난 달/분기 동안 무엇이 달라졌나?"를 묻는다.
- **메트릭 시각화** — 빌드 시간, 테스트 커버리지, 버그 수 같은 지표를 시간 축 그래프로 그린다. 느린 변화가 눈에 보인다.
- **새 사람의 시각** — 팀에 새로 합류한 사람은 아직 끓지 않은 개구리다. "이게 원래 이런가요?"라는 질문에 귀 기울인다.

## Tip 5, 6과의 관계

세 팁은 한 세트다.

| 팁 | 방향 | 핵심 |
|----|------|------|
| Tip 5: Broken Windows | 작은 것 → 고친다 | 작은 부패가 큰 부패를 부른다 |
| Tip 6: Catalyst | 작은 것 → 시작한다 | 작게 시작해서 변화를 이끈다 |
| Tip 7: Big Picture | 작은 것 ← 경계한다 | 작은 변화에 파묻히면 전체를 놓친다 |

작은 것에 집중하되, 큰 그림을 잊지 않는 균형이 필요하다.

## 정리

- **끓는 개구리**: 작은 변화는 감지하기 어렵고, 누적되면 치명적이다.
- 빌드 시간, 커버리지, 회의 시간 같은 지표가 서서히 악화된다.
- 회고, 메트릭 시각화, 새 사람의 시각으로 거리 두고 본다.
- 세부에 집중하면서도 전체를 놓치지 않는 균형을 유지한다.

## 다음 장 예고

[Tip 8: Make Quality a Requirements Issue](/blog/programming/engineering/pragmatic-programmer/tip08)에서는 품질을 "나중에 챙길 것"이 아니라 처음부터 요구사항으로 정의하는 접근을 다룬다.

## 관련 항목

- [Tip 5: Don't Live with Broken Windows](/blog/programming/engineering/pragmatic-programmer/tip05)
- [Tip 6: Be a Catalyst for Change](/blog/programming/engineering/pragmatic-programmer/tip06)
- [Tip 8: Make Quality a Requirements Issue](/blog/programming/engineering/pragmatic-programmer/tip08)
