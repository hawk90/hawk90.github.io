---
title: "Tip 43: Avoid Fortune-Telling"
date: 2026-05-11T19:00:00
description: "점치지 마라. 미래의 요구를 지금 설계에 넣지 마라. YAGNI."
series: "The Pragmatic Programmer"
seriesOrder: 43
tags: [pragmatic-programmer, design, yagni]
draft: true
---

## 이 팁의 메시지

> **Tip 43: Avoid Fortune-Telling.** Only look ahead as far as you can see.

볼 수 있는 만큼만 앞을 보라.

## "혹시 모르니까"의 함정

"혹시 나중에 다른 결제 수단이 필요할지도 모르니까 플러그인 아키텍처를 만들자."

지금 결제 수단은 하나다. 두 번째 결제 수단이 언제 올지, 어떤 형태일지 모른다. 그런데 미리 만든 추상화는 그 미지의 요구에 맞을까? 거의 항상 맞지 않는다.

세 번째 사용 사례를 보기 전에는 진짜 패턴을 모른다. 그 전에 만든 추상화는 잘못된 추상화일 가능성이 높다.

## YAGNI

YAGNI는 "You Aren't Gonna Need It"의 약자다. 지금 필요하지 않으면 지금 만들지 않는다.

미래의 요구가 실제로 나오면 그때 추상화를 추출한다. 실제 사용 사례가 있으니 올바른 추상화를 할 수 있다.

## 점치기 vs 준비

| 점치기 | 준비 |
|--------|------|
| "혹시 여러 데이터베이스가 필요할지도" → 지금 추상화 | 외부 의존(DB)을 인터페이스로 감싸기 → 나중에 교체 가능 |
| "혹시 플러그인이 필요할지도" → 지금 플러그인 시스템 | 단일 구현체로 시작 → 필요 시 추출 |

차이점은 지금 보이는 요구인가, 상상의 요구인가이다.

## 예외

다음 경우에는 미리 추상화해도 좋다.

- **잘 알려진 패턴**: 데이터베이스 추상(Repository 패턴)은 이미 검증됐다.
- **외부 의존의 격리**: 변경될 수 있는 외부 시스템은 인터페이스로 감싼다.
- **명확한 가까운 요구**: 다음 스프린트에 들어올 요구가 확실하다면 미리 준비할 수 있다.

그 외에는 점치기다.

## 정리

- 미래는 예측할 수 없다.
- "혹시 모르니까"는 거의 항상 잘못된 추상화를 낳는다.
- 세 번째 사용 사례를 본 후에 추상화한다.
- YAGNI: 지금 필요한 것만 만든다.

## 다음 장 예고

[Tip 44: Decoupled Code Is Easier to Change](/blog/programming/engineering/pragmatic-programmer/tip44)에서는 결합도를 낮추면 변경이 쉬워지는 이유를 다룬다.

## 관련 항목

- [Tip 42: Take Small Steps—Always](/blog/programming/engineering/pragmatic-programmer/tip42)
- [Tip 44: Decoupled Code Is Easier to Change](/blog/programming/engineering/pragmatic-programmer/tip44)
