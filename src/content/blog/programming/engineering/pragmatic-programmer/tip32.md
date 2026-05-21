---
title: "Tip 32: Read the Damn Error Message"
date: 2026-05-11T08:00:00
description: "에러 메시지를 정말로 읽어라. 가장 값진 정보가 가장 자주 무시된다."
series: "The Pragmatic Programmer"
seriesOrder: 32
tags: [pragmatic-programmer, debugging]
draft: false
---

## 이 팁의 메시지

> **Tip 32: Read the Damn Error Message.** Most exceptions tell both what failed and where it failed. If you're lucky you might even get parameter values.

에러 메시지를 정말로 읽어라. 대부분의 예외는 무엇이 실패했는지, 어디서 실패했는지 알려 준다. 운이 좋으면 파라미터 값까지 보인다.

## 가장 흔한 실수

개발자가 에러를 만나면 자주 다음과 같은 패턴을 보인다.

1. 에러 메시지가 뜬다.
2. 메시지를 제대로 읽지 않고 복사한다.
3. 스택오버플로에 붙여 넣는다.
4. 첫 번째 답을 따라 한다.
5. 안 된다.

문제는 2번이다. 에러 메시지를 *정말로 읽었다면* 검색이 필요 없는 경우가 많다. 메시지에 답이 들어 있기 때문이다.

## 에러 메시지의 구성

대부분의 에러 메시지는 다음 정보를 담고 있다.

| 구성 요소 | 설명 | 예 |
|-----------|------|-----|
| 에러 타입 | 예외의 종류 | `NullPointerException`, `TypeError` |
| 메시지 | 무엇이 잘못됐는지 | `"expected int, got str"` |
| 위치 | 파일과 줄 번호 | `File "app.py", line 42` |
| 스택 트레이스 | 호출 경로 | 호출 스택 전체 |

이 네 가지를 모두 무시하면 시간만 흐른다.

## 올바른 순서

에러를 만났을 때 다음 순서를 따른다.

1. **에러 메시지를 천천히 읽는다**: 단어 하나하나를 본다.
2. **스택 트레이스를 아래에서 위로 읽는다**: 가장 깊은 자리부터.
3. **자기 코드의 첫 줄을 찾는다**: 라이브러리 코드가 아닌 자기 코드.
4. **그 줄에서 무엇이 잘못됐는지 생각한다**: 변수 값, 타입, 조건.
5. **필요하면 검색한다**: 이제야 검색해도 된다.

순서 5에 도달하기 전에 해결되는 경우가 의외로 많다.

## 메시지가 모호할 때

가끔 에러 메시지가 도움이 안 되는 경우도 있다. 그러나 그때도 스택 트레이스는 있다. 위치를 알면 범위가 좁아진다. 범위가 좁아지면 로그나 디버거로 상태를 확인할 수 있다.

## 정리

- 에러 메시지는 가장 값진 정보다.
- 복사해서 검색하기 전에 먼저 읽어라.
- 에러 타입, 메시지, 위치, 스택 트레이스를 모두 본다.
- 자기 코드의 첫 줄을 찾는다.
- 검색은 마지막 수단이다.

## 다음 장 예고

[Tip 33: "select" Isn't Broken](/blog/programming/engineering/pragmatic-programmer/tip33)에서는 시스템이나 라이브러리를 의심하기 전에 자기 코드를 먼저 의심해야 한다는 점을 다룬다.

## 관련 항목

- [Tip 31: Failing Test Before Fixing Code](/blog/programming/engineering/pragmatic-programmer/tip31)
- [Tip 33: "select" Isn't Broken](/blog/programming/engineering/pragmatic-programmer/tip33)
