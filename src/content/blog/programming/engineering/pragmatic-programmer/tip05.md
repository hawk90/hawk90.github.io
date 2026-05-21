---
title: "Tip 5: Don't Live with Broken Windows"
date: 2026-05-11T05:00:00
description: "깨진 창문과 살지 마라 — 작은 부패가 큰 부패를 부른다. 즉시 고치거나 표시하라."
series: "The Pragmatic Programmer"
seriesOrder: 5
tags: [pragmatic-programmer, code-quality]
draft: false
---

## 이 팁의 메시지

> **Tip 5: Don't Live with Broken Windows.** Bad designs, wrong decisions, or poor code. Don't leave "broken windows" (bad designs, wrong decisions, or poor code) unrepaired.

이 책에서 가장 널리 알려진 메타포다. 도시 범죄학에서 빌려 온 **깨진 창문 이론**을 소프트웨어에 적용한다.

## 깨진 창문 이론

1980년대 뉴욕 지하철 범죄가 극심했던 시절, 범죄학자들은 흥미로운 실험을 했다. 빈 건물의 창문 하나를 깨뜨려 놓고 일주일 동안 방치하자, 곧 모든 창문이 깨졌다. 낙서가 생기고, 불법 투기가 이어지고, 결국 건물 전체가 황폐해졌다.

깨진 창문 하나는 "아무도 신경 쓰지 않는다"는 신호를 보낸다. 그 신호가 다음 파괴를 허락한다. 부패는 전염병처럼 퍼진다.

## 코드의 깨진 창문

소프트웨어도 똑같다. 더러운 함수 하나가 리뷰를 통과하면, 다음 PR에서도 같은 수준이 허용된다. "이미 이 파일은 이러니까"라는 핑계가 자연스럽게 나온다.

다음은 코드에서 흔히 보이는 깨진 창문이다.

- 죽은 코드 — 주석 처리된 채 남아 있는 로직
- 모호한 이름 — 의미를 알 수 없는 변수와 함수
- 깨진 테스트 — 무시되고 있는 빨간 불
- 컴파일러 경고 — 매번 뜨지만 아무도 고치지 않는 메시지
- 오래된 TODO — 1년째 "나중에 고치자"로 남은 주석

어느 하나라도 방치되면, 시스템 전체의 품질이 서서히 내려간다.

## 두 가지 선택지

깨진 창문을 발견했다면 선택지는 두 가지뿐이다.

1. **즉시 고친다** — 가능하다면 바로 고친다. 다음 PR에서 함께 고치는 것도 방법이다.
2. **명확히 표시한다** — 지금 고칠 수 없다면 이슈 티켓을 만들거나 TODO 주석에 마감일을 적어 둔다.

어떤 경우에도 **방치는 선택지가 아니다**. 방치도 결정이며, 그 결정은 다음 깨진 창문을 부른다.

## 보이스카우트 규칙과의 연결

책에서 자주 함께 언급되는 격언이 있다.

> "Leave the code better than you found it."

발견한 자리보다 더 깨끗하게 떠나라는 뜻이다. 파일을 열었을 때 작은 깨진 창문이 보이면 작업 김에 함께 고친다. 이 습관이 쌓이면 시스템 전체가 조금씩 나아진다.

## 정리

- **깨진 창문 이론**: 작은 부패가 큰 부패를 부른다.
- 코드에서 깨진 창문은 죽은 코드, 모호한 이름, 깨진 테스트, 무시된 경고, 오래된 TODO다.
- 발견 즉시 **고치거나 표시**한다. 방치는 선택지가 아니다.
- 보이스카우트 규칙과 짝을 이룬다.

## 다음 장 예고

[Tip 6: Be a Catalyst for Change](/blog/programming/engineering/pragmatic-programmer/tip06)에서는 변화를 이끌어내는 방법, 즉 "돌맹이 스프" 우화를 통해 작게 시작해 전체를 움직이는 전략을 다룬다.

## 관련 항목

- [Tip 4: Provide Options, Don't Make Lame Excuses](/blog/programming/engineering/pragmatic-programmer/tip04)
- [Tip 6: Be a Catalyst for Change](/blog/programming/engineering/pragmatic-programmer/tip06)
- [Clean Code Ch 1: Clean Code](/blog/programming/engineering/clean-code/chapter01-clean-code)
