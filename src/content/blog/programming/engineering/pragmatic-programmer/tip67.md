---
title: "Tip 67: Build End-to-End, Not Top-Down or Bottom-Up"
date: 2026-05-11T19:00:00
description: "끝에서 끝까지 만들어라. 위에서 아래로, 아래에서 위로가 아니다."
series: "The Pragmatic Programmer"
seriesOrder: 67
tags: [pragmatic-programmer, development, agile]
draft: false
---

## 이 팁의 메시지

> **Tip 67: Build End-to-End, Not Top-Down or Bottom-Up.** Build small pieces of end-to-end functionality, learning about the problem as you go.

작은 조각의 끝에서 끝 기능을 만들어라. 진행하면서 문제를 배운다.

## 전통적 접근법의 문제

**Top-Down (위에서 아래로)**

```text
1. 전체 아키텍처 설계
2. 모든 모듈 인터페이스 정의
3. 각 모듈 구현 (위에서 아래로)
4. 마지막에 통합
```

문제: 마지막에 통합할 때 모든 문제가 터진다.

**Bottom-Up (아래에서 위로)**

```text
1. 기반 유틸리티 라이브러리 구현
2. 그 위에 서비스 레이어 구현
3. 그 위에 UI 구현
4. 마지막에 연결
```

문제: 필요 없는 기능을 미리 만들고, 실제 사용 시 맞지 않는다.

## End-to-End 접근법

작은 기능을 UI부터 데이터베이스까지 완전히 동작하게 만든다.

```text
기능 1: 사용자 로그인
- UI: 로그인 폼
- API: /login 엔드포인트
- 서비스: 인증 로직
- DB: 사용자 테이블

→ 이것이 완전히 동작한 후에 다음 기능으로
```

## 예: 온라인 상점

**전통적 접근**

```text
1달차: 데이터베이스 스키마 설계
2달차: 백엔드 API 전체 구현
3달차: 프론트엔드 구현
4달차: 통합 및 테스트
→ 4달 후에야 동작하는 것을 볼 수 있다
```

**End-to-End 접근**

```text
1주차: 상품 목록 보기 (UI → API → DB)
2주차: 상품 상세 보기 (UI → API → DB)
3주차: 장바구니 추가 (UI → API → DB)
4주차: 결제 (UI → API → 결제 시스템 → DB)
→ 매주 동작하는 기능을 볼 수 있다
```

## 트레이서 불릿

Hunt와 Thomas는 이 접근법을 "트레이서 불릿(Tracer Bullet)"이라고 부른다.

```python
# 첫 번째 트레이서: 최소한의 끝에서 끝 경로

# UI (최소)
@app.route('/products')
def product_list():
    products = get_products()
    return render_template('products.html', products=products)

# 서비스 (최소)
def get_products():
    return db.query("SELECT * FROM products LIMIT 10")

# DB (최소)
# products 테이블에 테스트 데이터 3개
```

동작하는 최소한의 경로를 먼저 만든다. 그 후에 확장한다.

## 장점

| 장점 | 설명 |
|------|------|
| 빠른 피드백 | 매주 동작하는 것을 본다 |
| 통합 문제 조기 발견 | 처음부터 통합한다 |
| 학습 | 실제 구현하면서 문제를 이해한다 |
| 유연성 | 요구사항 변경에 빠르게 대응한다 |
| 동기 부여 | 진행이 눈에 보인다 |

## Walking Skeleton

첫 번째 End-to-End 구현을 "Walking Skeleton"이라고도 한다.

```text
Walking Skeleton:
- 뼈대만 있고 살은 없다
- 그러나 걸을 수 있다
- 실제로 동작한다
```

```python
# Walking Skeleton 예
# 로그인 기능의 최소 구현

def login(email, password):
    user = db.find_user(email)
    if user and user.password == password:  # 아직 해싱 없음
        return {"token": "hardcoded-token"}  # 아직 JWT 없음
    return None
```

동작한다. 나중에 개선한다.

## 점진적 개선

Skeleton이 걷기 시작하면 살을 붙인다.

```python
# 1단계: 동작하게
def login(email, password):
    user = db.find_user(email)
    if user and user.password == password:
        return {"token": "hardcoded-token"}
    return None

# 2단계: 보안 추가
def login(email, password):
    user = db.find_user(email)
    if user and check_password_hash(user.password_hash, password):
        return {"token": generate_jwt(user.id)}
    return None

# 3단계: 에러 처리 추가
def login(email, password):
    user = db.find_user(email)
    if not user:
        raise AuthenticationError("User not found")
    if not check_password_hash(user.password_hash, password):
        raise AuthenticationError("Invalid password")
    return {"token": generate_jwt(user.id)}
```

## 정리

- Top-Down이나 Bottom-Up 대신 End-to-End로 만든다.
- 작은 기능을 UI부터 DB까지 완전히 동작하게 한다.
- 트레이서 불릿처럼 경로를 먼저 뚫는다.
- Walking Skeleton으로 시작해서 점진적으로 개선한다.
- 매번 동작하는 것을 확인한다.

## 다음 장 예고

[Tip 68: Design to Test](/blog/programming/engineering/pragmatic-programmer/tip68)에서는 테스트를 고려한 설계를 다룬다.

## 관련 항목

- [Tip 66: A Test Is the First User of Your Code](/blog/programming/engineering/pragmatic-programmer/tip66)
- [Tip 68: Design to Test](/blog/programming/engineering/pragmatic-programmer/tip68)
- [Tip 22: Use Tracer Bullets to Find the Target](/blog/programming/engineering/pragmatic-programmer/tip22)
