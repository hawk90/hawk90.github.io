---
title: "Ch 31: Object Persistence and Databases"
date: 2026-05-19T07:00:00
description: "객체 영속성과 데이터베이스 — OODBMS, O/R 매핑."
series: "Object-Oriented Software Construction"
seriesOrder: 31
tags: [oop, meyer, persistence, database, oodbms, orm]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 객체는 메모리에서 살다가 죽지만, **영속 객체**는 프로그램 실행 사이에도 살아남는다. OODBMS와 O/R 매핑은 객체 세계와 저장 세계를 연결한다.

## 영속성의 필요성

### 왜 영속성인가

| 프로그램 종료 시 |
|----------------|
| 메모리의 모든 객체 소멸 |
| 사용자 데이터 손실 |
| 다음 실행 시 처음부터 |

| 영속성이 필요한 경우 |
|-------------------|
| 사용자 데이터 저장 |
| 시스템 상태 보존 |
| 데이터 공유 |
| 감사 추적 |

### 영속성의 형태

| 형태 | 특징 |
|------|------|
| 파일 기반 | 직접 파일 I/O, 직렬화 — 간단하지만 한계 있음 |
| 관계형 데이터베이스 (RDBMS) | 테이블/행/열, SQL — 임피던스 불일치 문제 |
| 객체 데이터베이스 (OODBMS) | 객체를 직접 저장, 탐색 기반 접근 — OO와 자연스러운 통합 |
| 객체-관계 매핑 (ORM) | 객체와 테이블 간 변환 — 두 세계의 장점 결합 시도 |

## 임피던스 불일치

### 문제 정의

| 객체 세계 | 관계형 세계 |
|---------|-----------|
| 정체성 (Identity) | 테이블과 행 |
| 캡슐화 | 정규화 |
| 상속 | 외래 키 |
| 다형성 | 집합 기반 연산 |
| 참조에 의한 탐색 | 조인 |

**임피던스 불일치**: 이 두 패러다임 사이의 개념적 간극.

### 불일치 유형

| 불일치 유형 | 객체 | 관계형 |
|-----------|------|-------|
| 구조적 | 상속, 컬렉션, 연관 | 테이블?, 외래 키? |
| 탐색 | `a.b.c.d` (참조 탐색) | 조인, 조인, 조인 |
| 정체성 | 메모리 주소 | 기본 키 |
| 데이터 타입 | 복잡한 타입, 컬렉션 | 기본 타입, NULL |

## OODBMS

### 객체 데이터베이스란

| OODBMS 특징 |
|------------|
| 객체를 직접 저장 |
| 객체 정체성 유지 |
| 참조로 탐색 |
| 상속 지원 |
| 메서드 저장 가능 |

| 장점 | 단점 |
|------|------|
| 임피던스 불일치 없음 | 표준화 부족 |
| 복잡한 객체 자연스럽게 저장 | 리포팅/애드혹 쿼리 어려움 |
| 탐색 성능 우수 | 시장 점유율 낮음 |

### 영속 루트와 도달성

**영속 루트 (Persistent Root)**: 데이터베이스 진입점. 루트에서 도달 가능한 객체만 영속.

```text
root: COMPANY
  → employees: LIST [EMPLOYEE]
    → employee_1.department
    → employee_2.department
  → departments: LIST [DEPARTMENT]
```

| 도달 가능성 기반 영속 |
|--------------------|
| 루트에서 참조를 따라 도달 가능하면 영속 |
| 도달 불가능하면 가비지 컬렉션 |

### 투명한 영속성

```eiffel
-- 이상적인 영속성: 투명함

class APPLICATION
feature
    db: OBJECT_DATABASE

    run
        local
            company: COMPANY
        do
            -- 데이터베이스에서 가져오기
            company := db.root

            -- 평범하게 사용
            company.hire (create {EMPLOYEE}.make ("Kim"))
            company.departments.first.assign (new_employee)

            -- 커밋하면 변경사항 자동 저장
            db.commit
        end
end

-- 특별한 영속성 코드 없음
-- 일반 객체처럼 사용
-- 데이터베이스가 변경 추적
```

## 직렬화

### 객체 직렬화

| 용어 | 정의 |
|------|------|
| 직렬화 (Serialization) | 객체 그래프를 바이트 스트림으로 변환 |
| 역직렬화 (Deserialization) | 바이트 스트림을 객체 그래프로 복원 |

| 용도 |
|------|
| 파일 저장 |
| 네트워크 전송 |
| 캐싱 |

### 직렬화 구현

```eiffel
class STORABLE
feature
    store (file: RAW_FILE)
        -- 객체를 파일에 저장
        require
            file_open: file.is_open_write
        do
            file.put_storable (Current)
        end

    retrieved (file: RAW_FILE): like Current
        -- 파일에서 객체 복원
        require
            file_open: file.is_open_read
        do
            Result := file.retrieved
        ensure
            same_type: Result.generating_type = generating_type
        end
end

-- 사용
class GAME_STATE
inherit
    STORABLE

feature
    player: PLAYER
    level: INTEGER
    score: INTEGER

    save_game (filename: STRING)
        local
            file: RAW_FILE
        do
            create file.make_open_write (filename)
            store (file)
            file.close
        end

    load_game (filename: STRING)
        local
            file: RAW_FILE
        do
            create file.make_open_read (filename)
            if attached {GAME_STATE} retrieved (file) as loaded then
                player := loaded.player
                level := loaded.level
                score := loaded.score
            end
            file.close
        end
end
```

### 순환 참조 처리

**문제**: A → B → C → A (순환)

| 해결책: 객체 ID 기반 직렬화 |
|--------------------------|
| 1. 각 객체에 고유 ID 부여 |
| 2. 참조를 ID로 대체 |
| 3. 역직렬화 시 ID로 객체 복원 |

```text
Object 1: PERSON {name: "Kim", friend: @2}
Object 2: PERSON {name: "Lee", friend: @1}
```

## O/R 매핑

### ORM이란

**Object-Relational Mapping**: 객체와 관계형 테이블 간 자동 변환.

| 기능 |
|------|
| 클래스 → 테이블 매핑 |
| 객체 → 행 매핑 |
| 관계 → 외래 키/조인 테이블 매핑 |
| 쿼리 → SQL 변환 |

### 매핑 전략

**상속 매핑 전략**:

| 전략 | 설명 | 장점 | 단점 |
|------|------|------|------|
| 단일 테이블 (Single Table) | 모든 클래스를 한 테이블에 | 단순, 빠른 쿼리 | NULL 많음, 공간 낭비 |
| 클래스별 테이블 (Table per Class) | 각 구체 클래스에 테이블 | 정규화, 효율적 저장 | 다형적 쿼리 시 UNION |
| 서브클래스별 테이블 (Table per Subclass) | 공통 테이블 + 하위 클래스 테이블 | 정규화, 확장 용이 | 조인 필요 |

### 예: 클래스와 테이블 매핑

```eiffel
-- 객체 모델
class EMPLOYEE
feature
    id: INTEGER
    name: STRING
    department: DEPARTMENT
    salary: REAL
end

class DEPARTMENT
feature
    id: INTEGER
    name: STRING
    employees: LIST [EMPLOYEE]
end

-- 관계형 스키마
-- DEPARTMENT (id INT PRIMARY KEY, name VARCHAR)
-- EMPLOYEE (id INT PRIMARY KEY, name VARCHAR,
--           department_id INT FOREIGN KEY, salary REAL)
```

### 지연 로딩

**문제**: COMPANY → 1000개 DEPARTMENT → 각각 100명 EMPLOYEE. 전부 로드하면 100,000 객체.

| 해결책: 지연 로딩 (Lazy Loading) |
|------------------------------|
| 필요할 때만 로드 |
| 프록시 객체 사용 |
| 실제 접근 시 데이터베이스 조회 |

```eiffel
class EMPLOYEE_PROXY
inherit
    EMPLOYEE
        redefine
            department
        end

feature
    department: DEPARTMENT
        do
            if internal_department = Void then
                -- 이 시점에 데이터베이스 조회
                internal_department := database.load_department (department_id)
            end
            Result := internal_department
        end

feature {NONE}
    internal_department: detachable DEPARTMENT
    department_id: INTEGER
end
```

## 트랜잭션

### 트랜잭션 속성

| ACID | 의미 |
|------|------|
| Atomicity (원자성) | 전부 성공 또는 전부 실패 |
| Consistency (일관성) | 트랜잭션 전후 제약 조건 만족 |
| Isolation (격리성) | 동시 트랜잭션 간 간섭 없음 |
| Durability (지속성) | 커밋된 데이터는 영구 보존 |

### 객체 트랜잭션

```eiffel
class DATABASE_TRANSACTION
feature
    begin
        -- 트랜잭션 시작
        do
            is_active := True
            -- 스냅샷 생성 또는 로그 시작
        end

    commit
        -- 변경 확정
        require
            active: is_active
        do
            -- 변경사항 영구 저장
            is_active := False
        end

    rollback
        -- 변경 취소
        require
            active: is_active
        do
            -- 이전 상태로 복원
            is_active := False
        end

    is_active: BOOLEAN
end

-- 사용
db.begin_transaction
if operation_successful then
    db.commit
else
    db.rollback
end
```

### 낙관적 vs 비관적 잠금

| 잠금 방식 | 동작 | 특징 |
|---------|------|------|
| 비관적 (Pessimistic) | 데이터 접근 전에 잠금 | 충돌 방지, 동시성 저하 |
| 낙관적 (Optimistic) | 잠금 없이 작업, 커밋 시 충돌 검사 | 충돌 시 재시도, 동시성 높음 |

| 버전 기반 낙관적 잠금 |
|--------------------|
| 각 레코드에 버전 번호 |
| 수정 시 버전 확인 |
| 버전 불일치면 충돌 |

## 쿼리

### 객체 쿼리

```eiffel
-- 컬렉션 필터링 (메모리 내)
local
    high_earners: LIST [EMPLOYEE]
do
    high_earners := employees.filter (
        agent (e: EMPLOYEE): BOOLEAN
            do
                Result := e.salary > 100000
            end
    )
end

-- 데이터베이스 쿼리
local
    query: DATABASE_QUERY
    results: LIST [EMPLOYEE]
do
    create query.make ("EMPLOYEE")
    query.add_condition ("salary", ">", 100000)
    results := database.execute_query (query)
end
```

### 객체 쿼리 언어

| OQL vs SQL |
|------------|

```sql
-- OQL (Object Query Language)
SELECT e
FROM employees e
WHERE e.salary > 100000
  AND e.department.name = "Engineering"

-- SQL
SELECT e.*
FROM EMPLOYEE e
JOIN DEPARTMENT d ON e.department_id = d.id
WHERE e.salary > 100000
  AND d.name = 'Engineering'
```

| OQL 장점 |
|---------|
| 객체 탐색 자연스러움 |
| 타입 안전 |
| 메서드 호출 가능 |

## 설계 고려사항

### 영속성 계층 분리

| 계층 | 역할 |
|------|------|
| 도메인 객체 | 순수 비즈니스 로직 |
| 리포지토리 | 데이터 접근 추상화 |
| 영속성 계층 | 실제 저장 메커니즘 |

| 장점 |
|------|
| 도메인이 영속성에 무관 |
| 테스트 용이 |
| 저장소 교체 가능 |

### 리포지토리 패턴

```eiffel
deferred class REPOSITORY [G]
feature
    find_by_id (id: INTEGER): detachable G
        deferred
        end

    find_all: LIST [G]
        deferred
        end

    save (item: G)
        deferred
        end

    delete (item: G)
        deferred
        end
end

class EMPLOYEE_REPOSITORY
inherit
    REPOSITORY [EMPLOYEE]

feature
    find_by_id (id: INTEGER): detachable EMPLOYEE
        do
            -- 데이터베이스 조회
        end

    find_by_department (dept: DEPARTMENT): LIST [EMPLOYEE]
        -- 도메인 특화 쿼리
        do
            -- 조회
        end
end
```

### 도메인 객체 순수성

```eiffel
-- 좋은 예: 순수 도메인 객체
class EMPLOYEE
feature
    name: STRING
    salary: REAL
    department: DEPARTMENT

    raise_salary (amount: REAL)
        require
            positive: amount > 0
        do
            salary := salary + amount
        ensure
            increased: salary = old salary + amount
        end
end
-- 영속성 관련 코드 없음

-- 나쁜 예: 영속성 침투
class EMPLOYEE
feature
    name: STRING
    salary: REAL
    database_id: INTEGER  -- 영속성 노출!

    save
        do
            Database.save_employee (Current)  -- 의존성!
        end
end
```

## 정리

- **임피던스 불일치**: 객체와 관계형 패러다임 간 개념적 간극
- **OODBMS**: 객체를 직접 저장, 투명한 영속성
- **직렬화**: 객체를 바이트 스트림으로 변환
- **ORM**: 객체-테이블 매핑, 지연 로딩
- **트랜잭션**: ACID, 낙관적/비관적 잠금
- **리포지토리 패턴**: 영속성 계층 분리

## 다음 장 예고

Chapter 32에서는 **GUI를 위한 OO 기법**을 다룬다. 이벤트 루프, MVC의 대안, 대화형 애플리케이션 설계.

## 관련 항목

- [Ch 6: Abstract Data Types](/blog/programming/design/oosc/chapter06-abstract-data-types) — ADT
- [Ch 25: Useful Techniques](/blog/programming/design/oosc/chapter25-useful-techniques) — 복제와 동등성
- [Ch 30: Concurrency](/blog/programming/design/oosc/chapter30-concurrency-distribution-client-server) — 동시성
