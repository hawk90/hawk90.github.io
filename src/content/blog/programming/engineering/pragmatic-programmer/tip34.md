---
title: "Tip 34: Don't Assume It—Prove It"
date: 2026-05-11T10:00:00
description: "가정하지 마라. 증명하라. 실제 데이터·실제 입력·실제 환경으로 검증한다."
series: "The Pragmatic Programmer"
seriesOrder: 34
tags: [pragmatic-programmer, debugging]
draft: false
---

## 이 팁의 메시지

> **Tip 34: Don't Assume It—Prove It.** Prove your assumptions in the actual environment—with real data and boundary conditions.

가정을 실제 환경에서 증명하라. 실제 데이터와 경계 조건으로.

## 가정의 함정

디버깅할 때 자주 이런 생각이 든다.

- "이 변수는 분명히 null이 아닐 거야."
- "이 분기는 절대 안 들어와."
- "이 호출은 항상 성공해."
- "이 리스트는 항상 비어 있지 않아."

이런 가정이 깨지는 자리가 바로 버그의 자리다. 문제는 가정이 깨졌다는 사실을 *모른다*는 것이다. 가정은 머릿속에만 있기 때문이다.

## 증명의 방법

가정을 증명하는 방법은 여러 가지다.

| 방법 | 설명 |
|------|------|
| 로그 | 실제 값을 출력해서 눈으로 확인한다 |
| 디버거 | 중단점을 걸고 변수 상태를 확인한다 |
| 테스트 | 가정을 검증하는 테스트를 작성한다 |
| assert | 코드에 가정을 명시해서 깨지면 즉시 실패하게 한다 |

"분명히 그럴 거야"라고 생각했다면, 그 자리에 로그를 찍어 보라. 생각과 다른 값이 나올 수 있다.

## 실제 데이터로

가짜 데이터로 테스트하면 가정의 함정을 놓칠 수 있다. 실제 운영 데이터(또는 그와 유사한 데이터)로 테스트해야 경계 조건이 드러난다.

예를 들어 "이름 필드는 항상 알파벳"이라는 가정이 있다고 하자. 가짜 데이터로는 확인이 안 되지만, 실제 데이터에는 한글, 이모지, 특수문자가 들어올 수 있다.

## 환경도 확인한다

개발 환경에서 잘 되던 코드가 운영 환경에서 안 되는 경우가 많다. 환경 변수, 파일 경로, 권한, 네트워크 설정 등이 다르기 때문이다. 가능하면 운영 환경과 유사한 환경에서 테스트한다.

## 정리

- 가정하지 말고 증명한다.
- 로그, 디버거, 테스트, assert로 검증한다.
- 실제 데이터와 경계 조건으로 테스트한다.
- 운영 환경과 유사한 환경에서 확인한다.
- "분명히"라는 생각이 들면 의심한다.

## 다음 장 예고

[Tip 35: Learn a Text Manipulation Language](/blog/programming/engineering/pragmatic-programmer/tip35)에서는 텍스트 조작 언어를 하나 능숙하게 익혀야 한다는 점을 다룬다.

## 관련 항목

- [Tip 33: "select" Isn't Broken](/blog/programming/engineering/pragmatic-programmer/tip33)
- [Tip 35: Learn a Text Manipulation Language](/blog/programming/engineering/pragmatic-programmer/tip35)
- [Tip 39: Use Assertions to Prevent the Impossible](/blog/programming/engineering/pragmatic-programmer/tip39)
