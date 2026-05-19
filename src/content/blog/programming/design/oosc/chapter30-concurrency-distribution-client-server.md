---
title: "Ch 30: Concurrency, Distribution, Client-Server and the Internet"
date: 2026-05-19T06:00:00
description: "동시성과 분산 — OO에서의 동시성, SCOOP 모델."
series: "Object-Oriented Software Construction"
seriesOrder: 30
tags: [oop, meyer, concurrency, distribution, scoop, client-server]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 객체지향에서 동시성은 **객체 단위**로 생각한다. SCOOP(Simple Concurrent Object-Oriented Programming)은 **계약**을 활용해 동시성을 안전하게 다룬다.

## 동시성의 필요성

### 왜 동시성인가

| 동시성이 필요한 이유 | 설명 |
|-------------------|------|
| 성능 | 멀티코어 활용 |
| 반응성 | UI가 멈추지 않음 |
| 자연스러운 모델링 | 독립 엔티티를 있는 그대로 표현 |
| 분산 | 네트워크 통신 |

| 현실 |
|------|
| CPU 클럭 속도 정체 |
| 코어 수는 증가 |
| 분산 시스템 보편화 |
| 비동기 통신 필수 |

### 동시성의 어려움

| 전통적 동시성 문제 | 설명 |
|------------------|------|
| 경쟁 조건 (Race Condition) | 여러 스레드가 같은 데이터 수정 |
| 교착 상태 (Deadlock) | 서로 상대방의 잠금 대기 |
| 기아 상태 (Starvation) | 특정 스레드가 영원히 실행 못함 |
| 비결정성 (Non-determinism) | 같은 입력에 다른 결과 |

| 결과 |
|------|
| 재현 어려운 버그 |
| 디버깅 악몽 |
| 테스트 불완전 |

## 전통적 동시성 모델

### 스레드와 잠금

| 전통적 접근 | 역할 |
|-----------|------|
| 스레드 (Thread) | 실행 단위 |
| 잠금 (Lock/Mutex) | 배타적 접근 |
| 세마포어 | 자원 개수 관리 |
| 조건 변수 | 대기와 신호 |

| 문제 |
|------|
| 저수준, 오류 발생 쉬움 |
| 잠금 순서 관리 어려움 |
| 합성 가능성 낮음 |

### 잠금의 문제

```text
-- 의사 코드

class BANK_ACCOUNT
    balance: INTEGER
    lock: MUTEX

    withdraw (amount: INTEGER)
        lock.acquire
        if balance >= amount then
            balance := balance - amount
        end
        lock.release
end

-- 문제: 두 계좌 간 이체는?

transfer (from, to: BANK_ACCOUNT; amount: INTEGER)
    from.lock.acquire  -- 1
    to.lock.acquire    -- 2
    -- 이체
    from.lock.release
    to.lock.release

-- 동시에 반대 방향 이체 시:
-- 스레드 A: from.lock → to.lock 대기
-- 스레드 B: to.lock → from.lock 대기
-- → 교착 상태!
```

## SCOOP 모델

### SCOOP이란

**SCOOP** = Simple Concurrent Object-Oriented Programming

| 핵심 아이디어 |
|-------------|
| 객체는 프로세서에 속함 |
| 프로세서 = 실행 단위 (스레드 추상화) |
| 계약이 동기화를 처리 |
| 분리된 객체에 대한 호출은 비동기 |

| 특징 |
|------|
| 객체 단위 동시성 |
| 암묵적 잠금 |
| 계약 기반 대기 |
| 데이터 경쟁 없음 |

### separate 키워드

```eiffel
class WORKER
feature
    data: separate SHARED_DATA
        -- 다른 프로세서에 있을 수 있는 객체

    process (d: separate SHARED_DATA)
        -- d는 분리된 객체
        -- 이 메서드 실행 중 d에 대한 배타적 접근
        do
            d.modify
            d.compute
        end
end
```

### 분리된 객체 호출 규칙

| separate 객체 호출 규칙 | 동작 |
|----------------------|------|
| 분리된 인자가 있는 피처 호출 시 | 해당 객체의 프로세서에 대한 잠금 획득 |
| 피처 실행 완료까지 | 잠금 유지 |
| 여러 분리된 인자 | 데드락 없는 순서로 잠금 |
| 전조건으로 대기 | 조건 만족까지 대기 |

### 계약과 동시성

```eiffel
class BUFFER [G]
feature
    count: INTEGER
    capacity: INTEGER

    put (item: G)
        require
            not_full: count < capacity
        do
            -- 추가
            count := count + 1
        ensure
            added: count = old count + 1
        end

    get: G
        require
            not_empty: count > 0
        do
            -- 가져오기
            count := count - 1
        ensure
            removed: count = old count - 1
        end
end

-- 분리된 버퍼 사용
class PRODUCER
feature
    produce (buffer: separate BUFFER [INTEGER])
        require
            -- 전조건이 대기 조건이 됨!
            not_full: buffer.count < buffer.capacity
        do
            buffer.put (random_item)
        end
end

-- buffer.count < capacity가 될 때까지 자동 대기
-- 명시적 wait/notify 불필요!
```

## SCOOP의 장점

### 데이터 경쟁 방지

| 접근 | 동작 | 결과 |
|------|------|------|
| 전통적 | 스레드 1: `x.value := 10`, 스레드 2: `y := x.value` | x가 공유되면 경쟁 조건 |
| SCOOP | x가 separate면 호출 시 잠금 | 데이터 경쟁 불가능, 컴파일러가 보장 |

### 합성 가능성

```eiffel
-- 두 버퍼 간 이동
transfer (from, to: separate BUFFER [G]; count: INTEGER)
    require
        -- 두 조건이 모두 만족할 때까지 대기
        from_has_enough: from.count >= count
        to_has_space: to.count + count <= to.capacity
    local
        item: G
        i: INTEGER
    do
        from
            i := 1
        until
            i > count
        loop
            item := from.get
            to.put (item)
            i := i + 1
        end
    end

-- 데드락 걱정 없음!
-- 잠금 순서를 SCOOP 런타임이 관리
```

### 명확한 의미론

| 호출 유형 | 예시 | 동작 |
|---------|------|------|
| 비분리 객체 | `x.method` | 동기, 즉시 실행 |
| 분리된 객체 (커맨드) | `x.command` | 비동기, 큐에 추가 |
| 분리된 객체 (쿼리) | `y := x.query` | 결과 대기 |

**wait by necessity**: 결과가 필요할 때만 대기하여 최대 병렬성 달성.

## 분산 시스템

### 객체 기반 분산

| 분산 아키텍처 특징 |
|------------------|
| 객체가 여러 머신에 분산 |
| 위치 투명성 (Location Transparency) |
| 원격 객체도 로컬처럼 호출 |

| SCOOP 확장 |
|-----------|
| separate = 다른 머신일 수 있음 |
| 네트워크 세부사항 숨김 |
| 동일한 프로그래밍 모델 |

### 클라이언트-서버

```eiffel
-- 서버
class SERVER
feature
    serve (client: separate CLIENT; request: REQUEST): RESPONSE
        require
            valid_request: request.is_valid
        do
            -- 요청 처리
            Result := process (request)
        ensure
            valid_response: Result.is_valid
        end
end

-- 클라이언트
class CLIENT
feature
    server: separate SERVER

    make_request
        local
            response: RESPONSE
        do
            response := server.serve (Current, create_request)
            handle_response (response)
        end
end
```

### 오류 처리

| 분산 환경의 추가 문제 |
|--------------------|
| 네트워크 실패 |
| 부분 실패 |
| 타임아웃 |

| SCOOP 접근 |
|-----------|
| 예외로 처리 |
| 트랜잭션 시맨틱 가능 |
| 보상 동작 정의 |

## 생산자-소비자 패턴

### SCOOP으로 구현

```eiffel
class PRODUCER
feature
    buffer: separate BOUNDED_BUFFER [PRODUCT]

    produce
        do
            from
            until
                should_stop
            loop
                put_product (buffer)
            end
        end

    put_product (buf: separate BOUNDED_BUFFER [PRODUCT])
        require
            -- 버퍼에 공간이 있을 때까지 대기
            space_available: buf.count < buf.capacity
        do
            buf.put (create_product)
        end
end

class CONSUMER
feature
    buffer: separate BOUNDED_BUFFER [PRODUCT]

    consume
        do
            from
            until
                should_stop
            loop
                take_product (buffer)
            end
        end

    take_product (buf: separate BOUNDED_BUFFER [PRODUCT])
        require
            -- 버퍼에 제품이 있을 때까지 대기
            product_available: buf.count > 0
        do
            process (buf.get)
        end
end
```

### 전통적 구현과 비교

| 접근 | 코드 스타일 |
|------|-----------|
| 전통적 (Java) | `synchronized` + `wait()`/`notifyAll()` 명시적 호출 |
| SCOOP | `require` 전조건이 대기 조건 역할 |

```java
// 전통적 (Java 스타일)
synchronized (buffer) {
    while (buffer.isFull()) {
        buffer.wait();
    }
    buffer.put(product);
    buffer.notifyAll();
}
```

```eiffel
-- SCOOP
put_product (buf: separate BUFFER)
    require
        not_full: buf.count < buf.capacity
    do
        buf.put (create_product)
    end
```

| SCOOP 장점 |
|-----------|
| wait/notify 없음 |
| 계약이 대기 조건 |
| 더 선언적 |
| 오류 적음 |

## 철학자 식사 문제

### SCOOP 해결책

```eiffel
class PHILOSOPHER
feature
    left_fork, right_fork: separate FORK

    make (l, r: separate FORK)
        do
            left_fork := l
            right_fork := r
        end

    dine
        do
            from
            until
                should_stop
            loop
                think
                eat (left_fork, right_fork)
            end
        end

    eat (l, r: separate FORK)
        -- 두 포크 모두 사용 가능할 때 실행
        -- SCOOP이 데드락 없는 순서로 잠금
        require
            l_available: l.is_available
            r_available: r.is_available
        do
            l.pick_up
            r.pick_up
            -- 식사
            l.put_down
            r.put_down
        end
end

-- 다섯 철학자 시작
across 1 |..| 5 as i loop
    launch_philosopher (philosophers.item (i))
end

-- SCOOP 런타임이 데드락 방지
-- 명시적 잠금 순서 지정 불필요
```

## 동시성 설계 지침

### 객체 단위 사고

| 지침 |
|------|
| 공유 데이터는 객체로 캡슐화 |
| 동시 접근되는 객체는 separate |
| 불변 객체는 공유 안전 |
| 가변 상태 최소화 |

| 설계 패턴 | 용도 |
|---------|------|
| 모니터 객체 | 동기화된 접근 |
| 액터 | 메시지 기반 통신 |
| 풀 | 자원 관리 |

### 계약 설계

| 동시성 계약 | 의미 |
|-----------|------|
| 전조건 = 대기 조건 | 호출자가 기다릴 조건 명시 |
| 후조건 = 보장 | 실행 후 상태 보장 |
| 불변식 = 일관성 | 항상 유지되는 속성 |

| 주의사항 |
|---------|
| 분리된 객체의 상태는 변할 수 있음 |
| 쿼리 결과는 즉시 변할 수 있음 |
| "stale read" 주의 |

### 성능 고려

| SCOOP 성능 특성 |
|----------------|
| 잠금 오버헤드 있음 |
| 대기 시간 발생 |
| 메시지 전달 비용 |

| 최적화 방법 |
|-----------|
| 공유 최소화 |
| 배치 처리 |
| 불변 객체 활용 |
| 로컬 객체 선호 |

## 정리

- **SCOOP**: 객체 단위 동시성, separate 키워드
- **계약 기반 대기**: 전조건이 대기 조건
- **데드락 방지**: 런타임이 잠금 순서 관리
- **합성 가능**: 여러 객체 안전하게 조합
- **분산 투명성**: 원격 객체도 같은 모델
- **선언적**: wait/notify 대신 계약

## 다음 장 예고

Chapter 31에서는 **객체 영속성과 데이터베이스**를 다룬다. OODBMS, O/R 매핑, 영속 객체.

## 관련 항목

- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
- [Ch 12: When the Contract is Broken](/blog/programming/design/oosc/chapter12-when-the-contract-is-broken) — 예외
- [Ch 28: The Software Construction Process](/blog/programming/design/oosc/chapter28-the-software-construction-process) — 프로세스
