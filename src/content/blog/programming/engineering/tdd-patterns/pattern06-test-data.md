---
title: "Pattern 6: Test Data"
date: 2026-05-10T06:00:00
description: "테스트에 어떤 데이터를 쓸지 — 의도가 드러나는 값."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 6
tags: [tdd, beck, test-data]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트 데이터는 그 테스트의 의도를 드러내는 값으로. magic number와 과도한 fixture를 피한다.

## 동기

테스트에 어떤 값을 쓸지는 사소해 보이지만 중요하다. 잘못된 데이터 선택은:

- 의도를 숨김.
- 유지보수 어려움.
- 버그를 놓침.

좋은 테스트 데이터는:

- 검증 대상을 드러냄.
- 경계 조건 잡음.
- 읽는 사람이 "왜 이 값인가"를 앎.

### 신호

- 테스트에 `42`, `"abc"`, `123` 같은 맥락 없는 magic value.
- 같은 값이 여러 테스트에 우연히 등장.
- 테스트 데이터가 production 같지 않음 (`"test"`만).
- 데이터가 너무 많아 핵심이 묻힘.

### 데이터 선택 전략

| 종류 | 용도 |
| --- | --- |
| **Representative** | 일반 케이스 대표 |
| **Boundary** | 경계 (0, max, max-1, max+1) |
| **Special** | null, 빈 collection, NaN |
| **Realistic** | production과 비슷 |

## 절차

1. **검증 대상**을 식별. 어떤 동작을 테스트?
2. 대표 + 경계 + 특수 케이스 분리.
3. 각 케이스에 의도가 드러나는 값 선택.
4. 최소 fixture만 setup.
5. magic number 발견 시 변수명 + 계산식으로 의도 표현.

## 예시 1 — Magic number 제거

```python
# Bad
def test_double():
    result = double(42)
    assert result == 84
```

`42`가 왜? 모름.

```python
# Good — 변수명
def test_double():
    input_value = 5
    result = double(input_value)
    assert result == input_value * 2
```

또는:

```python
def test_double_positive_number():
    positive_number = 7
    result = double(positive_number)
    assert result == 14
```

값에 이름 + 계산. 읽는 사람이 왜를 안다.

## 예시 2 — 경계값 케이스

```python
def test_age_validation():
    assert not is_adult(17)   # 경계 직전
    assert is_adult(18)       # 경계
    assert is_adult(19)       # 경계 직후

def test_max_login_attempts():
    assert allow_login(2)     # 미만
    assert allow_login(3)     # 경계
    assert not allow_login(4) # 초과
```

경계 *직전/직후*가 버그의 단골 위치.

## 예시 3 — Realistic data

```python
# Bad
def test_parse_email():
    email = "a@b.c"   # 비현실적
    assert parse_email(email).local == "a"

# Good
def test_parse_email():
    email = "alice.kim+tag@subdomain.example.com"   # 실제
    parsed = parse_email(email)
    assert parsed.local == "alice.kim+tag"
    assert parsed.domain == "subdomain.example.com"
```

production-like data가 숨은 edge case 발견.

## 자주 보는 안티패턴

### 1. 과도한 fixture

필요 없는 field까지 setup → 노이즈. Assert First로 최소 추출.

### 2. 동일 값 우연한 사용

```python
def test_double(): assert double(42) == 84
def test_triple(): assert triple(42) == 126   # 같은 42 — 왜?
```
각 테스트 의도에 맞는 값.

### 3. Random data

```python
def test_x():
    val = random.randint(0, 100)
    assert process(val) == val * 2
```
flaky test 위험. property-based로 명시적으로.

### 4. Production data 직접 사용

실제 DB row를 복사해서 fixture로 → 민감 정보 누출, 결합. 익명화.

### 5. Date now() 사용

```python
def test_x():
    assert is_recent(datetime.now())
```
실행 시점에 따라 결과 다름 — 고정 시간 주입.

### 6. 너무 작아서 의미 모호

```python
assert add(1, 1) == 2   # commutative? identity? sum?
```
의도를 값으로 표현.

## Modern variants

### Builder pattern

```python
class UserBuilder:
    def __init__(self):
        self._name = "Test User"
        self._email = "test@example.com"
    def with_name(self, name): self._name = name; return self
    def with_email(self, email): self._email = email; return self
    def build(self): return User(self._name, self._email)

# 사용
user = UserBuilder().with_name("Alice").build()
```

복잡한 객체를 fluent하게.

### Object Mother

```python
class UserMother:
    @staticmethod
    def alice(): return User("Alice", "alice@example.com")
    @staticmethod
    def admin(): return User("Admin", "admin@example.com", role="admin")

user = UserMother.alice()
```

자주 쓰는 fixture를 factory function.

### Test data factory

```python
import factory
class UserFactory(factory.Factory):
    class Meta: model = User
    name = factory.Faker("name")
    email = factory.Faker("email")

user = UserFactory.create()
```

Django factory_boy, FactoryBot (Ruby) — fake 라이브러리 통합.

### Property-based

```python
@given(st.integers(min_value=0, max_value=100))
def test_double_positive(n):
    assert double(n) >= n
```

값 선택을 strategy에 위임.

### Anonymous test value pattern

```python
def test_x():
    irrelevant_id = "ANY_ID"
    expected = "result for ANY_ID"
    assert process(irrelevant_id) == expected
```

값이 무관임을 명시.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| factory_boy (Python) | object factory |
| FactoryBot (Ruby) | object factory |
| Faker | realistic fake data 생성 |
| AutoFixture (.NET) | 자동 객체 생성 |
| Bogus (.NET) | fake data |
| @faker-js/faker | JS faker |
| Hypothesis | property-based, 자동 데이터 |

## 성능 고려

- 대량 fixture 생성은 setup 시간 증가. 지연 생성 (lazy) 활용.
- Factory는 일반적 fixture보다 빠를 수도 (필요한 field만).
- DB seed test는 truncate + reload 비용.

## 관련 패턴

- [Pattern 7: Evident Data](/blog/programming/engineering/tdd-patterns/pattern07-evident-data) — 계산식으로 의도 표현
- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — fresh fixture 설정
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — 필요한 데이터 역산
- [Pattern 29: External Fixture](/blog/programming/engineering/tdd-patterns/pattern29-external-fixture) — 외부 자원 fixture
