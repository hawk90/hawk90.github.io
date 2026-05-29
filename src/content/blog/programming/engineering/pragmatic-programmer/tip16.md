---
title: "Tip 16: Make It Easy to Reuse"
date: 2026-05-11T16:00:00
description: "재사용을 쉽게 하라 — 재사용이 어려우면 사람들은 — 다시 짠다(중복 발생)."
series: "The Pragmatic Programmer"
seriesOrder: 16
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Tip 16: Make It Easy to Reuse.** If it isn't easy, people won't do it.

DRY의 짝이 되는 원칙이다. 아무리 좋은 코드를 작성해도 재사용이 어려우면 사람들은 쓰지 않는다. 대신 새로 짠다. 결과적으로 중복이 생긴다.

## 재사용 가능 ≠ 재사용 쉬움

코드가 재사용 가능하다고 해서 재사용이 쉬운 것은 아니다.

어딘가에 좋은 유틸리티 함수가 있다. 그러나 그 함수가 어디 있는지 모른다. 찾아도 의존성이 무겁다. 설정 방법이 복잡하다. 문서가 없거나 오래되었다. 인터페이스가 직관적이지 않다.

이런 상황에서 개발자는 "그냥 새로 짜는 게 빠르겠다"고 판단한다. 그 순간 중복이 시작된다.

## 재사용을 어렵게 하는 것들

다음 요소들이 재사용을 방해한다.

- **검색 불가**: 어디 있는지 찾을 수 없다.
- **무거운 의존성**: 하나 쓰려면 열 개를 끌어와야 한다.
- **복잡한 설정**: 시작하기 전에 설정 파일 세 개를 만들어야 한다.
- **부패한 문서**: 문서가 현재 버전과 맞지 않는다.
- **직관적이지 않은 인터페이스**: 사용 방법을 추론하기 어렵다.

하나라도 해당하면 재사용률이 떨어진다.

## 재사용을 쉽게 만드는 것들

반대로, 다음 요소들이 재사용을 촉진한다.

- **발견**: 검색이나 인덱스로 쉽게 찾을 수 있다.
- **설치**: 한 줄로 끝난다(`npm install`, `cargo add`, `pip install`).
- **사용**: 명확한 예제가 첫 페이지에 있다.
- **문서**: "빠른 시작" 가이드가 5분 안에 동작한다.

사용자 경험을 고려해서 코드를 공개하면 재사용률이 올라간다.

## 팀 안에서의 재사용

외부 라이브러리뿐 아니라 팀 내부에서도 같은 원칙이 적용된다.

- **공통 유틸리티 한 자리**: 팀 모두가 아는 장소에 모은다.
- **패키지화**: 다른 프로젝트에서 임포트할 수 있게 분리한다.
- **알림**: 새 유틸리티가 생기면 팀에 공유한다.

좋은 코드가 있어도 아무도 모르면 재사용되지 않는다.

## 정리

- 재사용 가능하다고 재사용 쉬운 것은 아니다.
- 재사용이 어려우면 사람들은 새로 짠다. 중복이 생긴다.
- 검색, 설치, 사용, 문서가 쉬워야 재사용된다.
- 팀 내부에서도 같은 원칙을 적용한다.

## 다음 장 예고

[Tip 17: Eliminate Effects Between Unrelated Things](/blog/programming/engineering/pragmatic-programmer/tip17)에서는 직교성(Orthogonality)을 다룬다. 관련 없는 것들 사이의 영향을 제거해야 변경이 국지화된다.

## 관련 항목

- [Tip 15: DRY—Don't Repeat Yourself](/blog/programming/engineering/pragmatic-programmer/tip15)
- [Tip 17: Eliminate Effects Between Unrelated Things](/blog/programming/engineering/pragmatic-programmer/tip17)
