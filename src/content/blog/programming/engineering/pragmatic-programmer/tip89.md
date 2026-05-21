---
title: "Tip 89: Test Early, Test Often, Test Automatically"
date: 2026-05-12T17:00:00
description: "일찍 테스트하고, 자주 테스트하고, 자동으로 테스트하라. 버그는 빨리 발견할수록 고치기 쉽다."
series: "The Pragmatic Programmer"
seriesOrder: 89
tags: [pragmatic-programmer, testing, automation]
draft: false
---

## 이 팁의 메시지

> **Tip 89: Test Early, Test Often, Test Automatically.** Tests that run with every build are much more effective than test plans that sit on a shelf.

매 빌드마다 실행되는 테스트가 선반 위의 테스트 계획보다 훨씬 효과적이다.

## 버그 발견 비용

버그는 늦게 발견할수록 비용이 크다.

```text
발견 시점별 비용 (상대값):

코딩 중:     1x
코드 리뷰:   5x
테스트:     10x
스테이징:   50x
프로덕션:  100x+
```

일찍 발견하면 수정도 쉽다. 맥락이 아직 머릿속에 있기 때문이다.

## 테스트 피라미드

```text
        △
       /  \
      / E2E \        느림, 비쌈
     /________\
    /          \
   / 통합 테스트 \    중간
  /______________\
 /                \
/    단위 테스트    \  빠름, 저렴
```

단위 테스트를 많이, E2E 테스트를 적게.

## 자동화의 가치

| 수동 테스트 | 자동 테스트 |
|-------------|-------------|
| 매번 시간 소요 | 한 번 작성, 계속 실행 |
| 사람이 실수 | 일관된 실행 |
| 일부만 테스트 | 전체 테스트 |
| 배포 전에만 | 매 커밋마다 |
| 결과가 주관적 | 결과가 명확 |

## 테스트 작성 시점

```text
TDD 방식:
1. 실패하는 테스트 작성
2. 테스트 통과하는 코드 작성
3. 리팩토링
4. 반복

코드 작성 후:
1. 기능 구현
2. 테스트 작성
3. 테스트 통과 확인
4. 엣지 케이스 테스트 추가
```

어느 방식이든 테스트 없는 코드보다 낫다.

## 테스트 종류

```text
단위 테스트:
- 함수, 클래스 단위
- 외부 의존성 모킹
- 빠른 실행 (밀리초)

def test_calculate_total():
    cart = Cart()
    cart.add_item("apple", 1000, 2)
    assert cart.total() == 2000


통합 테스트:
- 컴포넌트 간 상호작용
- 실제 의존성 사용 (DB, API)
- 중간 속도 (초)

def test_order_creates_payment():
    order = create_order(user, items)
    payment = PaymentService.get_for_order(order.id)
    assert payment.status == "pending"


E2E 테스트:
- 사용자 시나리오 전체
- 실제 환경과 유사
- 느린 실행 (분)

def test_user_checkout_flow():
    login(user)
    add_to_cart(item)
    checkout()
    assert order_exists(user.id)
```

## 테스트 실행 자동화

```yaml
# CI 파이프라인
test:
  steps:
    - run: pip install -r requirements.txt
    - run: pytest tests/unit/
    - run: pytest tests/integration/
    - run: pytest tests/e2e/ --slow
```

커밋할 때마다 자동 실행된다.

## 테스트 커버리지

```text
커버리지 가이드라인:
- 70-80%: 대부분의 프로젝트에 적정
- 90%+: 중요한 비즈니스 로직
- 100%: 현실적이지 않음

중요한 것:
- 커버리지 숫자보다 품질
- 중요한 경로 우선
- 엣지 케이스 포함
```

## 깨진 테스트 정책

```text
규칙:
- 깨진 테스트는 즉시 수정
- 수정 불가능하면 삭제
- "나중에 고칠게"는 안 됨
- CI가 실패하면 머지 금지
```

깨진 테스트가 쌓이면 테스트를 신뢰하지 않게 된다.

## 정리

- 버그는 일찍 발견할수록 비용이 적다.
- 테스트를 자동화하면 매 커밋마다 검증한다.
- 단위 테스트를 많이, E2E 테스트를 적게.
- 테스트 없는 코드보다 어떤 테스트든 낫다.
- 깨진 테스트는 즉시 수정한다.
- CI가 테스트를 자동 실행한다.

## 다음 장 예고

[Tip 90: Coding Ain't Done 'Til All the Tests Run](/blog/programming/engineering/pragmatic-programmer/tip90)에서는 테스트 통과가 완료의 기준임을 다룬다.

## 관련 항목

- [Tip 88: Use Version Control to Drive Builds, Tests, and Releases](/blog/programming/engineering/pragmatic-programmer/tip88)
- [Tip 66: A Test Is the First User of Your Code](/blog/programming/engineering/pragmatic-programmer/tip66)
