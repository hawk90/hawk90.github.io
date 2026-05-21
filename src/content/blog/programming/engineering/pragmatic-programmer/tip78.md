---
title: "Tip 78: Policy Is Metadata"
date: 2026-05-12T06:00:00
description: "정책은 메타데이터다. 비즈니스 규칙을 코드가 아닌 설정으로 분리한다."
series: "The Pragmatic Programmer"
seriesOrder: 78
tags: [pragmatic-programmer, design, configuration]
draft: false
---

## 이 팁의 메시지

> **Tip 78: Policy Is Metadata.** Keep policies flexible and out of the code.

정책을 유연하게 유지하고 코드 밖에 둔다.

## 정책이란

비즈니스 규칙, 임계값, 제한, 동작 방식을 정책이라고 한다.

```python
# 정책이 코드에 박힌 예
def calculate_shipping(order):
    if order.total >= 50000:  # 정책: 5만원 이상 무료배송
        return 0
    return 3000  # 정책: 기본 배송비 3000원
```

마케팅팀이 "무료배송 기준을 3만원으로 낮추자"고 하면 코드를 수정하고 배포해야 한다.

## 메타데이터로 분리

```yaml
# config/shipping_policy.yaml
shipping:
  free_threshold: 50000
  default_fee: 3000
```

```python
def calculate_shipping(order, policy):
    if order.total >= policy["shipping"]["free_threshold"]:
        return 0
    return policy["shipping"]["default_fee"]
```

이제 YAML 파일만 바꾸면 된다. 코드 변경, 재배포 없이.

## 분리해야 할 것들

| 정책 유형 | 예 |
|----------|-----|
| 금액/수량 | 무료배송 기준, 최대 주문 수량 |
| 기간 | 할인 기간, 유효 기간 |
| 비율 | 할인율, 수수료율 |
| 제한 | 일일 한도, 최대 사용자 |
| 조건 | 자격 조건, 승인 규칙 |
| 메시지 | 에러 메시지, 알림 텍스트 |

## 규칙 엔진

복잡한 정책은 규칙 엔진으로 관리한다.

```yaml
# 할인 규칙
discount_rules:
  - name: "신규 회원 할인"
    condition:
      user.is_new: true
    action:
      discount_percent: 10

  - name: "VIP 할인"
    condition:
      user.tier: "vip"
    action:
      discount_percent: 20

  - name: "대량 구매 할인"
    condition:
      order.quantity: ">= 10"
    action:
      discount_percent: 15
```

```python
def apply_discounts(order, user, rules):
    for rule in rules:
        if matches(rule["condition"], order, user):
            apply(rule["action"], order)
```

비개발자도 규칙을 추가할 수 있다.

## 기능 플래그

기능의 on/off도 메타데이터다.

```yaml
features:
  new_checkout: true
  dark_mode: false
  beta_dashboard: true
```

```python
def show_checkout():
    if features["new_checkout"]:
        return new_checkout_flow()
    return old_checkout_flow()
```

배포 없이 기능을 켜고 끌 수 있다.

## 계층적 설정

환경별로 다른 정책을 적용한다.

```yaml
# base.yaml
shipping:
  free_threshold: 50000

# production.yaml
shipping:
  free_threshold: 50000

# staging.yaml
shipping:
  free_threshold: 10000  # 테스트를 위해 낮게

# development.yaml
shipping:
  free_threshold: 0  # 개발 중에는 항상 무료
```

## 버전 관리

정책도 버전 관리한다.

커밋 메시지에 "할인율 10% → 15% 변경", "무료배송 기준 5만원 → 3만원", "VIP 조건 변경" 같이 남기면 언제, 누가, 왜 바꿨는지 추적할 수 있다.

## 검증

정책 파일도 검증한다.

```python
def validate_policy(policy):
    assert policy["shipping"]["free_threshold"] >= 0
    assert policy["shipping"]["default_fee"] >= 0
    assert policy["discount"]["max_percent"] <= 100
```

잘못된 설정이 프로덕션에 들어가지 않게 한다.

## 주의점

모든 것을 메타데이터로 빼면 안 된다.

**메타데이터로 빼야 할 것:**

- 자주 바뀌는 비즈니스 규칙
- 환경별로 다른 값
- 비개발자가 조정해야 하는 것

**코드로 남겨야 할 것:**

- 핵심 알고리즘
- 보안 규칙
- 데이터 구조

## 정리

- 비즈니스 정책을 코드에 하드코딩하지 않는다.
- 설정 파일, 환경 변수, 데이터베이스로 분리한다.
- 복잡한 규칙은 규칙 엔진을 고려한다.
- 기능 플래그로 배포 없이 기능을 제어한다.
- 정책 파일도 버전 관리하고 검증한다.
- 무엇을 분리할지 신중하게 판단한다.

## 다음 장 예고

[Tip 79: Use a Project Glossary](/blog/programming/engineering/pragmatic-programmer/tip79)에서는 프로젝트 용어집의 중요성을 다룬다.

## 관련 항목

- [Tip 77: Work with a User to Think Like a User](/blog/programming/engineering/pragmatic-programmer/tip77)
- [Tip 54: Parameterize Your App Using External Configuration](/blog/programming/engineering/pragmatic-programmer/tip54)
