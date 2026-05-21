---
title: "Tip 73: Name Well; Rename When Needed"
date: 2026-05-12T01:00:00
description: "이름을 잘 짓고, 필요하면 바꿔라. 이름은 의도를 드러내야 한다."
series: "The Pragmatic Programmer"
seriesOrder: 73
tags: [pragmatic-programmer, naming, code-quality]
draft: false
---

## 이 팁의 메시지

> **Tip 73: Name Well; Rename When Needed.** Name to express your intent to readers, and rename as soon as that intent shifts.

읽는 사람에게 의도를 표현하도록 이름을 짓고, 의도가 바뀌면 즉시 이름을 바꿔라.

## 이름의 중요성

코드는 쓰는 것보다 읽는 것이 더 많다. 이름이 좋으면 코드가 설명서가 된다.

```python
# 나쁜 이름
def calc(a, b, t):
    if t == 1:
        return a + b
    elif t == 2:
        return a - b

# 좋은 이름
def calculate(left: float, right: float, operation: str) -> float:
    if operation == "add":
        return left + right
    elif operation == "subtract":
        return left - right
```

좋은 이름은 코드를 읽는 시간을 줄인다.

## 이름 짓기 원칙

**의도를 드러낸다**

```python
# 나쁨: 무엇인지 모름
d = 7

# 좋음: 의도가 명확
days_until_deadline = 7
```

**맥락을 포함한다**

```python
# 나쁨: 맥락 없음
def get_data():
    ...

# 좋음: 무슨 데이터인지 명확
def get_user_profile():
    ...
```

**일관성을 유지한다**

```python
# 나쁨: 같은 개념에 다른 이름
user = fetch_user(id)
customer = get_customer(id)
client = load_client(id)

# 좋음: 일관된 명명
user = get_user(id)
admin = get_admin(id)
customer = get_customer(id)
```

## 이름 바꾸기

요구사항이 바뀌면 이름도 바꾼다.

```python
# 처음: 사용자 ID로 찾기
def get_user_by_id(user_id):
    ...

# 나중: 이메일로도 찾을 수 있게 됨
# 이름이 더 이상 정확하지 않음
def get_user_by_id(user_id):  # 실제로는 ID나 이메일로 찾음
    ...

# 리네이밍
def find_user(identifier):  # ID, 이메일, 둘 다 가능
    ...
```

## IDE 지원 활용

현대 IDE는 안전한 리네이밍을 지원한다.

```text
VS Code: F2 또는 우클릭 → Rename Symbol
IntelliJ/PyCharm: Shift+F6
Vim (with LSP): :lua vim.lsp.buf.rename()
```

전체 프로젝트에서 참조를 모두 바꿔준다.

## 나쁜 이름의 신호

| 신호 | 예 |
|------|-----|
| 한 글자 | `a`, `b`, `x` (루프 인덱스 제외) |
| 축약 | `usr`, `cnt`, `val` |
| 번호 | `data1`, `data2` |
| 타입만 | `string`, `list`, `dict` |
| 너무 일반적 | `process`, `handle`, `do` |
| 거짓말 | `userList`가 실제로는 Set |

## 좋은 이름의 특징

| 특징 | 예 |
|------|-----|
| 발음 가능 | `generationTimestamp` vs `genymdhms` |
| 검색 가능 | `MAX_STUDENTS` vs `7` |
| 도메인 용어 | `invoice`, `subscription` |
| 의도 표현 | `isEligibleForDiscount` |
| 적절한 길이 | 범위에 비례 (넓으면 길게, 좁으면 짧게) |

## 범위와 길이

```python
# 좁은 범위: 짧은 이름 OK
for i in range(10):
    print(items[i])

# 넓은 범위: 긴 이름 필요
class UserAccountManager:
    def calculate_monthly_subscription_fee(self, user):
        ...
```

지역 변수는 짧아도 된다. 전역이나 클래스 멤버는 길어도 명확해야 한다.

## 부울 변수

질문처럼 읽혀야 한다.

```python
# 나쁨
flag = True
status = True

# 좋음
is_active = True
has_permission = True
can_edit = True
should_retry = True
```

`is_`, `has_`, `can_`, `should_` 접두사가 의도를 명확히 한다.

## 함수 이름

동사로 시작한다.

```python
# 나쁨
def user_validation(user):
    ...

# 좋음
def validate_user(user):
    ...

# 반환 값을 암시
def calculate_total(items):  # 숫자 반환
    ...

def find_user(email):  # User 또는 None 반환
    ...

def list_orders(user):  # 리스트 반환
    ...
```

## 정리

- 이름은 의도를 드러낸다.
- 맥락과 일관성을 고려한다.
- 의미가 바뀌면 즉시 이름을 바꾼다.
- IDE의 리네이밍 기능을 활용한다.
- 범위가 넓을수록 이름을 명확하게 한다.
- 부울은 질문처럼, 함수는 동사로 시작한다.

## 다음 장 예고

[Tip 74: No One Knows Exactly What They Want](/blog/programming/engineering/pragmatic-programmer/tip74)에서는 요구사항의 불확실성을 다룬다.

## 관련 항목

- [Tip 72: Apply Security Patches Quickly](/blog/programming/engineering/pragmatic-programmer/tip72)
- [Tip 64: Refactor Early, Refactor Often](/blog/programming/engineering/pragmatic-programmer/tip64)
