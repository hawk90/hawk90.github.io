---
title: "Tip 36: You Can't Write Perfect Software"
date: 2026-05-11T12:00:00
description: "완벽한 소프트웨어는 못 쓴다. 이 사실을 받아들이고 방어적으로 코드를 짜라."
series: "The Pragmatic Programmer"
seriesOrder: 36
tags: [pragmatic-programmer, defensive-programming]
draft: true
---

## 이 팁의 메시지

> **Tip 36: You Can't Write Perfect Software.** Software can't be perfect. Protect your code and users from the inevitable errors.

소프트웨어는 완벽할 수 없다. 불가피한 오류로부터 코드와 사용자를 보호하라.

## 완벽은 신화다

완벽한 코드는 존재하지 않는다. 자기 코드에 버그가 있고, 남의 코드에도 버그가 있고, 사용자는 예상치 못한 입력을 넣는다. 이 사실을 받아들이면 방어적으로 코드를 짤 수 있다. 부정하면 버그가 나타날 때마다 당황한다.

## 자기 코드를 의심한다

자기가 짠 코드도 믿지 않는다. 다음을 습관으로 삼는다.

- **입력 검증**: 자기 함수가 받는 인자를 검증한다.
- **출력 검증**: 자기 함수가 반환하는 값이 계약을 지키는지 확인한다.
- **가정 명시**: 코드의 가정을 assert로 드러낸다.

"내가 짠 코드니까 괜찮겠지"라는 생각이 버그를 숨긴다.

## 다른 사람의 코드는 더 의심한다

외부 API, 라이브러리, 시스템 호출도 완벽하지 않다. 다음을 습관으로 삼는다.

- **실패 처리**: API 호출이 실패할 수 있다고 가정한다.
- **에러 처리**: 파일 I/O, 네트워크 호출은 항상 에러를 처리한다.
- **타임아웃**: 네트워크 호출에는 타임아웃을 건다.

"이 라이브러리는 잘 알려져 있으니 괜찮겠지"라는 생각이 장애를 부른다.

## 사용자 입력은 적대적이다

사용자 입력은 모두 적대적이라고 가정한다. 악의가 없더라도 예상치 못한 값이 들어온다.

1. **검증**: 입력이 올바른 형식인지 확인한다.
2. **정규화**: 입력을 안전한 형태로 변환한다.
3. **사용**: 그제야 비즈니스 로직에 넣는다.

검증 없이 사용자 입력을 그대로 쓰면 SQL 인젝션, XSS 같은 취약점이 생긴다.

## 방어는 자신감이다

방어적 프로그래밍은 망설임이 아니다. 자기 코드의 한계를 *인지*하고 있다는 뜻이다. "내 코드가 이 조건에서 실패할 수 있다. 그래서 방어한다." 이게 자신감의 표현이다.

## 정리

- 완벽한 코드는 존재하지 않는다.
- 자기 코드, 남의 코드, 사용자 입력 모두 의심한다.
- 검증, 에러 처리, 타임아웃을 습관으로 삼는다.
- 방어적 프로그래밍은 자신감의 표현이다.

## 다음 장 예고

[Tip 37: Design with Contracts](/blog/programming/engineering/pragmatic-programmer/tip37)에서는 계약 설계(Design by Contract)를 다룬다. 사전 조건, 사후 조건, 불변식으로 책임을 명확히 한다.

## 관련 항목

- [Tip 35: Learn a Text Manipulation Language](/blog/programming/engineering/pragmatic-programmer/tip35)
- [Tip 37: Design with Contracts](/blog/programming/engineering/pragmatic-programmer/tip37)
