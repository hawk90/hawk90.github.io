---
title: "Ch 6: Abstract Data Types"
date: 2026-05-19T06:00:00
description: "ADT — 객체지향의 수학적 기반, 명세와 구현의 분리."
series: "Object-Oriented Software Construction"
seriesOrder: 6
tags: [oop, meyer, adt, abstraction, specification]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 추상 데이터 타입(ADT)은 객체지향의 수학적 토대다. "무엇을 하는가"(명세)와 "어떻게 하는가"(구현)를 분리한다.

## ADT란 무엇인가

**추상 데이터 타입**(Abstract Data Type)은 데이터 타입을 **추상적으로** 정의하는 방법이다. 구현 세부사항을 숨기고 **연산과 그 속성**만 명시한다.

| 정의 방식 | 내용 |
|----------|------|
| 구체적 (구현 노출) | 스택 = 배열 + 인덱스; push는 인덱스 증가 후 저장, pop은 읽고 감소 |
| 추상적 (ADT) | 스택 = push, pop, top, is_empty 연산; push 후 top은 방금 넣은 값, push 후 pop하면 원래 상태 |

ADT는 **무엇**을 하는지만 말하고, **어떻게** 하는지는 말하지 않는다.

## ADT의 구성 요소

ADT는 네 부분으로 정의된다:

### 1. 타입 (Types)

새로 정의하는 타입과 사용하는 타입들:

ADT `STACK[G]`에서 새 타입은 `STACK`, 매개변수 타입은 `G`(요소 타입), 사용 타입은 `BOOLEAN`, `INTEGER`다.

### 2. 함수 (Functions)

타입에 대해 수행 가능한 연산들:

| 함수 | 시그니처 | 설명 |
|------|---------|------|
| `new` | `→ STACK[G]` | 생성자 |
| `push` | `STACK[G] × G → STACK[G]` | 요소 추가 |
| `pop` | `STACK[G] → STACK[G]` | 요소 제거 |
| `top` | `STACK[G] → G` | 최상위 조회 |
| `is_empty` | `STACK[G] → BOOLEAN` | 비었는가 |

함수는 입력 타입과 출력 타입의 **시그니처**로 정의된다.

### 3. 공리 (Axioms)

함수들 간의 관계를 정의하는 규칙:

모든 `x: G`, `s: STACK[G]`에 대해:

| 공리 | 의미 |
|------|------|
| A1: `top(push(s, x)) = x` | push 직후 top은 방금 push한 값 |
| A2: `pop(push(s, x)) = s` | push 후 pop하면 원래 스택으로 돌아감 |
| A3: `is_empty(new) = true` | 새 스택은 비어 있음 |
| A4: `is_empty(push(s, x)) = false` | push 후에는 비어 있지 않음 |

### 4. 사전조건 (Preconditions)

연산이 적용 가능한 조건:

| 연산 | 사전조건 | 의미 |
|------|---------|------|
| `pop(s)` | `not is_empty(s)` | 비어 있지 않은 스택에만 가능 |
| `top(s)` | `not is_empty(s)` | 비어 있지 않은 스택에만 가능 |

## 명세와 구현의 분리

ADT의 핵심 가치는 **명세(specification)**와 **구현(implementation)**의 분리다.

| 구분 | 내용 |
|------|------|
| 명세 (ADT) | `top(push(s, x)) = x` — 구현과 무관하게 참이어야 함 |
| 구현 A (배열) | `ArrayStack`: 배열 + count, `top`은 `data[count]` 반환 |
| 구현 B (연결 리스트) | `LinkedStack`: head 노드, `top`은 `head.value` 반환 |

두 구현 모두 같은 ADT를 충족한다.

**클라이언트 코드**는 ADT에만 의존:

```eiffel
do_something (s: STACK [INTEGER])
    -- s가 배열인지 연결 리스트인지 모름
    -- ADT 연산만 사용
    do
        s.push (42)
        print (s.top)  -- 42 출력
        s.pop
    end
```

구현이 바뀌어도 클라이언트 코드는 변경 불필요.

## ADT의 종류

### 생성자, 질의, 명령

함수는 역할에 따라 분류된다:

| 종류 | 역할 | 예 |
|------|------|-----|
| **생성자** | 새 인스턴스 생성 | `new`, `push` |
| **질의** | 상태 조회, 변경 없음 | `top`, `is_empty` |
| **명령** | 상태 변경 | `pop`, `clear` |

Eiffel에서 이를 **명령-질의 분리**(Command-Query Separation)로 강제한다:

```eiffel
-- 질의: 반환값 있음, 부작용 없음
top: G
is_empty: BOOLEAN

-- 명령: 반환값 없음, 상태 변경
push (x: G)
pop
```

### 부분 함수 vs 전체 함수

| 함수 종류 | 예시 | 정의역 |
|----------|------|--------|
| 전체 함수 | `is_empty` | 모든 스택 |
| 부분 함수 | `top` | 빈 스택 제외 (사전조건 필요) |

부분 함수는 **사전조건**으로 정의역을 제한한다.

## 충분한 공리

ADT가 **완전히 정의**되려면 공리가 충분해야 한다. 모든 질의의 결과가 공리로부터 유도 가능해야 한다.

**검증 예 1**: `top(push(push(new, 1), 2))`의 값은?
- `= top(push(s', 2))` where `s' = push(new, 1)`
- `= 2` by A1

**검증 예 2**: `is_empty(pop(push(new, 1)))`의 값은?
- `= is_empty(new)` by A2
- `= true` by A3

모든 질의가 유도 가능하므로 STACK ADT는 **충분한 공리**를 가진다.

## ADT와 클래스

클래스는 **ADT의 구현**이다:

| 구분 | ADT | 클래스 |
|------|-----|--------|
| 성격 | 수학적 명세 | 프로그래밍 언어 구현 |
| 구현 | 없음 | 실제 데이터 구조 + 메서드 코드 |

Eiffel에서 ADT 명세는 **단언(assertions)**으로 표현된다:

```eiffel
class STACK [G]
feature
    top: G
        require
            not is_empty  -- 사전조건
        ensure
            -- 결과는 마지막 push된 값
            -- (공리 A1에 해당)
        end

    push (x: G)
        ensure
            top = x        -- 공리 A1
            count = old count + 1
        end

    pop
        require
            not is_empty
        ensure
            count = old count - 1
        end

    is_empty: BOOLEAN
        do
            Result := (count = 0)
        ensure
            Result = (count = 0)
        end

invariant
    count >= 0
end
```

## ADT의 장점

### 추상화

복잡한 구현을 숨기고 본질만 노출:

| 클라이언트가 알아야 할 것 | 몰라도 되는 것 |
|------------------------|---------------|
| push하면 요소가 추가됨 | 내부가 배열인지 연결 리스트인지 |
| pop하면 최근 요소가 제거됨 | 메모리 할당 방식 |
| top은 최근 요소를 반환 | 최적화 기법 |

### 구현 독립성

구현을 바꿔도 클라이언트에 영향 없음:

| 구현 버전 | 특징 |
|----------|------|
| v1 배열 기반 | 고정 크기, 빠름 |
| v2 연결 리스트 | 동적 크기, 느림 |
| v3 배열 + 동적 확장 | 균형 |

ADT 명세가 같으면 구현을 교체할 수 있다.

### 정확성 검증

공리로 구현의 정확성을 검증:

```eiffel
s := new
s := push(s, 1)
s := push(s, 2)
assert top(s) = 2         -- by A1
s := pop(s)
assert top(s) = 1         -- by A1, A2
s := pop(s)
assert is_empty(s) = true -- by A3
```

### 문서화

ADT 자체가 정확한 문서:

STACK ADT 문서는 연산(`push`, `pop`, `top`, `is_empty`, `new`), 공리(A1-A4), 사전조건(`top`, `pop`은 비어 있지 않을 때만)으로 구성된다. 자연어 설명보다 정확하고 모호함이 없다.

## 실제 예: 리스트 ADT

```text
ADT: LIST [G]

타입:
  LIST [G], G, BOOLEAN, INTEGER

함수:
  new: → LIST [G]
  put_front: LIST [G] × G → LIST [G]
  put_rear: LIST [G] × G → LIST [G]
  front: LIST [G] → G
  rear: LIST [G] → G
  remove_front: LIST [G] → LIST [G]
  is_empty: LIST [G] → BOOLEAN
  count: LIST [G] → INTEGER

공리:
  A1: front(put_front(l, x)) = x
  A2: rear(put_rear(l, x)) = x
  A3: is_empty(new) = true
  A4: is_empty(put_front(l, x)) = false
  A5: count(new) = 0
  A6: count(put_front(l, x)) = count(l) + 1

사전조건:
  front(l): not is_empty(l)
  rear(l): not is_empty(l)
  remove_front(l): not is_empty(l)
```

## ADT에서 클래스로

Meyer의 핵심 주장: **클래스 = ADT의 부분 구현**

```text
ADT:
  완전한 수학적 명세
  구현 없음

클래스:
  ADT 명세의 일부 (인터페이스)
  + 구현
  + 추가 내부 기능
```

좋은 클래스 설계는 **ADT를 먼저 정의**하고 그다음 구현한다.

## 정리

- **ADT 정의**: 타입, 함수, 공리, 사전조건
- **명세 vs 구현**: ADT는 명세, 클래스는 구현
- **함수 분류**: 생성자, 질의, 명령
- **충분한 공리**: 모든 질의가 유도 가능해야
- **장점**: 추상화, 구현 독립성, 정확성 검증, 문서화
- **클래스 = ADT 구현**: OO의 수학적 기반

## 다음 장 예고

Chapter 7에서는 **클래스의 정적 구조**를 다룬다. ADT를 실제 프로그래밍 언어로 어떻게 표현하는가.

## 관련 항목

- [Ch 7: The Static Structure: Classes](/blog/programming/design/oosc/chapter07-the-static-structure-classes) — 클래스 구현
- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약으로 명세
- [Ch 8: The Run-Time Structure: Objects](/blog/programming/design/oosc/chapter08-the-run-time-structure-objects) — 런타임 객체
