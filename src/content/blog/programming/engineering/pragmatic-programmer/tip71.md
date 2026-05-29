---
title: "Tip 71: Keep It Simple and Minimize Attack Surfaces"
date: 2026-05-11T23:00:00
description: "단순하게 유지하고 공격 표면을 최소화하라. 복잡성이 보안 취약점을 만든다."
series: "The Pragmatic Programmer"
seriesOrder: 71
tags: [pragmatic-programmer, security, design]
draft: true
---

## 이 팁의 메시지

> **Tip 71: Keep It Simple and Minimize Attack Surfaces.** Complex code creates a breeding ground for bugs and opportunities for attackers.

복잡한 코드는 버그와 공격 기회의 온상이다.

## 공격 표면이란

공격 표면(Attack Surface)은 공격자가 시스템에 침입할 수 있는 모든 지점이다.

| 공격 표면 | 예 |
|----------|-----|
| 입력 | 폼, API, 파일 업로드, URL 파라미터 |
| 인증 | 로그인, 세션, 토큰 |
| 권한 | 접근 제어, 역할 |
| 의존성 | 서드파티 라이브러리, 외부 서비스 |
| 인프라 | 열린 포트, 서비스, 설정 |

## 최소화 원칙

쓰지 않는 것은 제거한다.

```python
# 나쁨: 모든 것을 노출
@app.route('/api/users/<id>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def user_api(id):
    ...

# 좋음: 필요한 것만 노출
@app.route('/api/users/<id>', methods=['GET'])
def get_user(id):
    ...

@app.route('/api/users/<id>', methods=['PUT'])
@require_auth
def update_user(id):
    ...
```

DELETE가 필요 없다면 DELETE를 구현하지 않는다.

## 입력 검증

모든 입력을 신뢰하지 않는다.

```python
# 위험: 입력을 그대로 사용
def search(query):
    return db.execute(f"SELECT * FROM items WHERE name = '{query}'")

# 안전: 파라미터화
def search(query):
    return db.execute("SELECT * FROM items WHERE name = ?", [query])

# 더 안전: 검증 + 파라미터화
def search(query: str):
    if len(query) > 100:
        raise ValueError("Query too long")
    if not query.isalnum():
        raise ValueError("Invalid characters")
    return db.execute("SELECT * FROM items WHERE name = ?", [query])
```

## 최소 권한 원칙

필요한 최소 권한만 부여한다.

```python
# 나쁨: 관리자 권한으로 모든 것 실행
def create_report():
    with admin_connection() as db:
        data = db.query("SELECT * FROM sensitive_data")
        ...

# 좋음: 읽기 전용 권한으로 실행
def create_report():
    with readonly_connection() as db:
        data = db.query("SELECT * FROM report_view")
        ...
```

데이터베이스 사용자도 읽기 전용, 쓰기 가능 등으로 분리한다.

## 의존성 관리

의존성도 공격 표면이다.

**의존성 관리 체크리스트:**

- 사용하지 않는 의존성 제거
- 알려진 취약점 검사 (npm audit, safety)
- 정기적 업데이트
- 의존성 잠금 (lock file)
- 신뢰할 수 있는 소스만 사용

```bash
# Python 취약점 검사
pip install safety
safety check

# Node.js 취약점 검사
npm audit
```

## 에러 메시지

에러 메시지로 정보를 노출하지 않는다.

```python
# 위험: 내부 정보 노출
def login(email, password):
    user = find_user(email)
    if not user:
        raise AuthError("User not found: " + email)  # 계정 존재 여부 노출
    if not check_password(user, password):
        raise AuthError("Wrong password for: " + email)  # 비밀번호가 틀림 노출

# 안전: 일반적인 메시지
def login(email, password):
    user = find_user(email)
    if not user or not check_password(user, password):
        raise AuthError("Invalid credentials")  # 같은 메시지
```

## 기본값은 안전하게

기본 설정이 안전해야 한다.

```python
# 나쁨: 기본이 개방
class Server:
    def __init__(self, debug=True, allow_all_origins=True):
        ...

# 좋음: 기본이 제한
class Server:
    def __init__(self, debug=False, allowed_origins=None):
        self.debug = debug
        self.allowed_origins = allowed_origins or []
```

## 단순함이 보안

복잡한 코드는 버그를 숨긴다.

```python
# 복잡: 버그 숨기기 쉬움
def check_access(user, resource, action, context, metadata):
    if user.role == "admin" or (user.role == "manager" and resource.owner == user) or \
       (action == "read" and resource.public) or \
       (context.get("override") and metadata.get("temporary_access")):
        return True
    return False

# 단순: 이해하기 쉬움
def check_access(user, resource, action):
    if user.is_admin():
        return True
    if action == "read" and resource.is_public():
        return True
    if resource.is_owned_by(user):
        return True
    return False
```

## 정리

- 공격 표면을 최소화한다.
- 필요한 기능만 노출한다.
- 모든 입력을 검증한다.
- 최소 권한 원칙을 적용한다.
- 의존성을 관리한다.
- 에러 메시지로 정보를 노출하지 않는다.
- 단순한 코드가 안전한 코드다.

## 다음 장 예고

[Tip 72: Apply Security Patches Quickly](/blog/programming/engineering/pragmatic-programmer/tip72)에서는 보안 패치의 중요성을 다룬다.

## 관련 항목

- [Tip 70: Use Property-Based Tests to Validate Your Assumptions](/blog/programming/engineering/pragmatic-programmer/tip70)
- [Tip 72: Apply Security Patches Quickly](/blog/programming/engineering/pragmatic-programmer/tip72)
