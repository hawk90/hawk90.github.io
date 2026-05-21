---
title: "Tip 79: Use a Project Glossary"
date: 2026-05-12T07:00:00
description: "프로젝트 용어집을 사용하라. 같은 단어가 같은 의미를 가져야 소통이 된다."
series: "The Pragmatic Programmer"
seriesOrder: 79
tags: [pragmatic-programmer, communication, documentation]
draft: false
---

## 이 팁의 메시지

> **Tip 79: Use a Project Glossary.** Create and maintain a single source of all the specific terms and vocabulary for a project.

프로젝트의 모든 특정 용어와 어휘에 대한 단일 소스를 만들고 유지하라.

## 용어 혼란의 비용

같은 개념에 다른 단어를 쓰면 혼란이 생긴다.

```text
마케팅팀: "고객"
영업팀: "클라이언트"
개발팀: "사용자"
DB 스키마: "account"

→ 다 같은 것? 다른 것?
```

한 시간 회의에서 30분을 용어 정리에 쓰기도 한다.

## 용어집 예

```markdown
# 프로젝트 용어집

## 고객 (Customer)
- 정의: 우리 서비스에 가입한 개인 또는 기업
- 코드: `Customer` 클래스
- DB: `customers` 테이블
- 참고: "사용자(User)"와 구분. 사용자는 로그인하는 사람,
        고객은 결제하는 주체.

## 주문 (Order)
- 정의: 고객이 상품을 구매하기 위해 생성한 요청
- 코드: `Order` 클래스
- DB: `orders` 테이블
- 상태: 생성됨, 결제됨, 배송중, 완료, 취소
- 참고: "장바구니(Cart)"와 구분. 결제 전은 장바구니.

## SKU
- 정의: Stock Keeping Unit. 개별 상품을 식별하는 코드
- 예: "SHOE-RED-42" (빨간 신발 42사이즈)
- 코드: `Product.sku`
```

## 용어집의 이점

| 이점 | 설명 |
|------|------|
| 일관성 | 코드, 문서, 대화에서 같은 용어 |
| 온보딩 | 새 팀원이 빠르게 적응 |
| 소통 | 다른 팀과의 대화가 원활 |
| 코드 품질 | 변수/클래스 이름이 일관적 |
| 도메인 이해 | 비즈니스 개념 명확화 |

## 도메인 주도 설계

DDD에서는 이것을 "유비쿼터스 언어(Ubiquitous Language)"라고 부른다.

```python
# 좋음: 도메인 용어 사용
class Order:
    def place(self):  # 주문하다
        ...
    def cancel(self):  # 취소하다
        ...
    def ship(self):  # 배송하다
        ...

# 나쁨: 기술 용어만 사용
class OrderEntity:
    def create(self):
        ...
    def delete(self):
        ...
    def update_status(self):
        ...
```

코드가 비즈니스 언어를 반영한다.

## 용어집 관리

**위치**

**선택지:**

- 위키 페이지
- README 섹션
- 별도 문서 (GLOSSARY.md)
- Notion/Confluence 페이지
- 코드 주석 (/// <summary>)

접근하기 쉬운 곳에 둔다.

**갱신**

**새 용어가 나왔을 때:**


**1. 기존 용어와 같은 의미인가?**

- → 기존 용어 사용 권장

**2. 새로운 개념인가?**

- → 용어집에 추가

**3. 기존 용어의 의미가 변했나?**

- → 정의 수정, 변경 이유 기록

## 동음이의어 주의

같은 단어가 다른 의미일 수 있다.

```markdown
## 계정 (Account)

### 1. 사용자 계정 (User Account)
- 로그인 정보
- `users` 테이블

### 2. 회계 계정 (Financial Account)
- 수입/지출 분류
- `chart_of_accounts` 테이블

⚠️ 맥락에 따라 다른 것을 의미함
```

## 약어 정리

약어도 정의한다.

```markdown
## 약어

| 약어 | 전체 | 설명 |
|------|------|------|
| SKU | Stock Keeping Unit | 상품 식별 코드 |
| PO | Purchase Order | 발주서 |
| ETA | Estimated Time of Arrival | 도착 예정 시간 |
| AOV | Average Order Value | 평균 주문 금액 |
```

새 팀원이 "AOV가 낮다"는 문장을 이해할 수 있다.

## 코드와 용어집 연결

```python
class Customer:
    """
    고객 (Customer)

    우리 서비스에 가입한 개인 또는 기업.
    User와 구분: User는 로그인하는 사람, Customer는 결제 주체.

    See: 용어집 - 고객
    """
    pass
```

코드 문서가 용어집을 참조한다.

## 정리

- 프로젝트 용어집을 만들고 유지한다.
- 같은 개념에 같은 단어를 쓴다.
- 코드, 문서, 대화에서 일관된 용어를 쓴다.
- 동음이의어와 약어를 명확히 정의한다.
- 새 팀원 온보딩과 타 팀 소통이 쉬워진다.
- 용어가 바뀌면 용어집을 갱신한다.

## 다음 장 예고

[Tip 80: Don't Think Outside the Box—Find the Box](/blog/programming/engineering/pragmatic-programmer/tip80)에서는 진짜 제약을 찾아내는 방법을 다룬다.

## 관련 항목

- [Tip 78: Policy Is Metadata](/blog/programming/engineering/pragmatic-programmer/tip78)
- [Tip 73: Name Well; Rename When Needed](/blog/programming/engineering/pragmatic-programmer/tip73)
