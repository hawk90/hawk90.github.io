---
title: "Ch 18: Global Objects and Constants"
date: 2026-05-19T18:00:00
description: "전역 객체와 상수 — once 함수, 공유 객체, 상수 정의."
series: "Object-Oriented Software Construction"
seriesOrder: 18
tags: [oop, meyer, global, constants, once-functions, shared-objects]
draft: true
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> **Once 함수**는 전역 객체와 상수를 OO 방식으로 우아하게 구현한다. 전역 상태의 필요성과 캡슐화를 동시에 만족시킨다.

## 전역 상태의 필요성

순수 OO에서도 **공유 상태**가 필요한 경우가 있다.

| 공유가 필요한 경우 | 예 |
|------------------|-----|
| 시스템 전체 설정 | configuration |
| 로깅 시스템 | Logger |
| 데이터베이스 연결 | Connection pool |
| 수학 상수 | Pi, E |
| 에러 메시지 테이블 | Error messages |
| 공유 캐시 | Cache |

### 전역 변수의 문제

| 문제 | 설명 |
|------|------|
| 추적 어려움 | 누가 수정했는지 알기 힘듦 |
| 테스트 어려움 | 의존성 주입 불가 |
| 이름 충돌 | 전역 네임스페이스 오염 |
| 캡슐화 위반 | 직접 접근 허용 |
| 동기화 문제 | 병렬 처리 시 경쟁 조건 |

Meyer의 해결책: **Once 함수**

## Once 함수 심화

### 기본 문법

```eiffel
class MATH_CONSTANTS
feature
    pi: REAL
        once
            Result := 3.14159265358979
        end

    e: REAL
        once
            Result := 2.71828182845905
        end
end
```

### Once의 의미론

| 단계 | 동작 |
|------|------|
| 1 | 첫 호출 시 본문 실행 |
| 2 | 결과를 캐시에 저장 |
| 3 | 이후 호출은 캐시된 결과 반환 |
| 4 | 프로그램 수명 동안 유지 |

| 구분 | 키워드 | 동작 |
|------|--------|------|
| 일반 함수 | `do ... end` | 매 호출마다 실행 |
| Once 함수 | `once ... end` | 첫 호출만 실행 |

### Once의 실행 모델

```eiffel
class COUNTER_DEMO
feature
    shared_counter: INTEGER
        local
            i: INTEGER
        once
            -- 이 코드는 프로그램에서 단 한 번 실행
            from i := 1 until i > 1000000 loop
                Result := Result + 1
                i := i + 1
            end
        end
end
```

```eiffel
local
    c1, c2: COUNTER_DEMO
do
    create c1
    create c2

    print (c1.shared_counter)  -- 1000000 (계산 실행)
    print (c2.shared_counter)  -- 1000000 (캐시 반환, 즉시)
    print (c1.shared_counter)  -- 1000000 (캐시 반환, 즉시)
end
```

## 싱글톤 패턴

### Once로 구현하는 싱글톤

```eiffel
class APPLICATION
feature
    shared_instance: APPLICATION
        once
            create Result.make
        end

    make
        do
            -- 초기화
        end
end
```

### 싱글톤 사용

```eiffel
class CLIENT
feature
    do_something
        do
            Application_instance.shared_instance.process
            -- 또는 상속받아 사용
        end
end

class APPLICATION_USER
inherit
    APPLICATION
        export
            {NONE} all
        end

feature
    use_app
        do
            shared_instance.process
        end
end
```

### 싱글톤 vs 전역 접근자

```eiffel
-- 패턴 1: 인스턴스 자체가 once
class DATABASE_CONNECTION
feature
    instance: DATABASE_CONNECTION
        once
            create Result.make ("localhost", 5432)
        end

feature {NONE}
    make (host: STRING; port: INTEGER)
        do
            -- 연결 설정
        end
end

-- 패턴 2: 별도 접근자 클래스
class SHARED_OBJECTS
feature
    database: DATABASE_CONNECTION
        once
            create Result.make ("localhost", 5432)
        end

    logger: LOGGER
        once
            create Result.make ("app.log")
        end

    config: CONFIGURATION
        once
            create Result.load ("config.ini")
        end
end
```

## 상수 정의

### 기본 상수

```eiffel
class CONSTANTS
feature
    -- 정수 상수
    max_items: INTEGER = 100
    default_size: INTEGER = 50

    -- 실수 상수
    tax_rate: REAL = 0.1
    pi: REAL = 3.14159

    -- 문자열 상수 (once 사용)
    app_name: STRING
        once
            Result := "Gumiho Forest"
        end

    version: STRING
        once
            Result := "1.0.0"
        end
end
```

### 상수 vs Once 함수

| 구분 | 리터럴 상수 (`= 값`) | Once 함수 |
|------|---------------------|----------|
| **적용 타입** | 기본 타입만 | 모든 타입 |
| **지원 타입** | INTEGER, REAL, BOOLEAN, CHARACTER | STRING, 객체 등 |
| **값 결정 시점** | 컴파일 타임 | 런타임(첫 호출 시) |

### Unique 값

```eiffel
class ERROR_CODES
feature
    error_none: INTEGER = 0
    error_file_not_found: INTEGER = unique  -- 자동 할당 1
    error_permission_denied: INTEGER = unique  -- 자동 할당 2
    error_network: INTEGER = unique  -- 자동 할당 3
end
```

`unique`의 의미:

| 특성 | 설명 |
|------|------|
| 고유값 | 컴파일러가 자동 할당 |
| 클래스 범위 | 같은 클래스 내 unique끼리 다른 값 |
| 간편함 | 명시적 값 지정 불필요 |
| 용도 | 열거형과 유사한 효과 |

## 공유 객체 패턴

### 공유 데이터 구조

```eiffel
class ERROR_MESSAGES
feature
    messages: HASH_TABLE [STRING, INTEGER]
        once
            create Result.make (100)
            Result.put ("File not found", error_file_not_found)
            Result.put ("Permission denied", error_permission_denied)
            Result.put ("Network error", error_network)
            Result.put ("Invalid input", error_invalid_input)
        end

    get_message (code: INTEGER): STRING
        do
            if messages.has (code) then
                Result := messages.item (code)
            else
                Result := "Unknown error"
            end
        end
end
```

### 설정 객체

```eiffel
class CONFIGURATION
feature
    settings: CONFIGURATION_DATA
        once
            create Result.load_from_file ("config.ini")
        end

    database_host: STRING
        do
            Result := settings.get_string ("database.host")
        end

    database_port: INTEGER
        do
            Result := settings.get_integer ("database.port")
        end

    debug_mode: BOOLEAN
        do
            Result := settings.get_boolean ("debug.enabled")
        end
end
```

### 캐시 객체

```eiffel
class USER_CACHE
feature
    cache: HASH_TABLE [USER, INTEGER]
        once
            create Result.make (1000)
        end

    get_user (id: INTEGER): USER
        do
            if cache.has (id) then
                Result := cache.item (id)
            else
                Result := load_user_from_database (id)
                cache.put (Result, id)
            end
        end

    invalidate (id: INTEGER)
        do
            cache.remove (id)
        end

    clear_all
        do
            cache.wipe_out
        end
end
```

## Once의 범위

### 프로세스 전역 Once

```eiffel
feature
    global_counter: INTEGER
        once
            Result := compute_expensive_value
        end
```

기본 `once`는 **프로세스 전역**이다. 모든 스레드가 같은 값을 공유한다.

### 스레드별 Once

```eiffel
feature
    thread_local_buffer: STRING
        once ("THREAD")
            create Result.make (1000)
        end
```

`once ("THREAD")`의 특성:

| 특성 | 설명 |
|------|------|
| 인스턴스 | 각 스레드마다 별도 |
| 저장소 | 스레드 로컬 |
| 동기화 | 불필요 |

### 객체별 Once

```eiffel
feature
    object_specific_cache: HASH_TABLE [STRING, STRING]
        once ("OBJECT")
            create Result.make (50)
        end
```

`once ("OBJECT")`의 특성:

| 특성 | 설명 |
|------|------|
| 인스턴스 | 각 객체마다 별도 |
| 유사점 | 일반 속성과 비슷하지만 지연 초기화 |
| 장점 | 메모리 효율적(사용 시에만 생성) |

### Once 범위 요약

| 범위 | 키워드 | 공유 수준 |
|------|--------|----------|
| 프로세스 | `once` | 전체 프로그램 |
| 스레드 | `once ("THREAD")` | 각 스레드 |
| 객체 | `once ("OBJECT")` | 각 인스턴스 |

## Once와 상속

### 상속된 Once

```eiffel
class PARENT
feature
    shared_value: INTEGER
        once
            Result := 42
        end
end

class CHILD
inherit
    PARENT
end
```

```eiffel
local
    p: PARENT
    c: CHILD
do
    create p
    create c
    print (p.shared_value)  -- 42 (첫 호출)
    print (c.shared_value)  -- 42 (같은 캐시)
end
```

상속해도 **같은 once 함수**를 공유한다.

### Once 재정의

```eiffel
class PARENT
feature
    message: STRING
        once
            Result := "Parent message"
        end
end

class CHILD
inherit
    PARENT
        redefine
            message
        end

feature
    message: STRING
        once
            Result := "Child message"
        end
end
```

```eiffel
local
    p: PARENT
    c: CHILD
do
    create p
    create c
    print (p.message)  -- "Parent message" (PARENT의 once)
    print (c.message)  -- "Child message" (CHILD의 once, 별도 캐시)
end
```

재정의하면 **별도의 once 캐시**가 된다.

## 설계 패턴과 Once

### 서비스 로케이터

```eiffel
class SERVICES
feature
    logger: LOGGER
        once
            create Result.make
        end

    database: DATABASE
        once
            create Result.connect ("localhost")
        end

    cache: CACHE_SERVICE
        once
            create Result.make (1000)
        end

    mailer: EMAIL_SERVICE
        once
            create Result.make (smtp_config)
        end
end
```

### 레지스트리 패턴

```eiffel
class OBJECT_REGISTRY
feature
    registry: HASH_TABLE [ANY, STRING]
        once
            create Result.make (100)
        end

    register (name: STRING; obj: ANY)
        do
            registry.force (obj, name)
        end

    lookup (name: STRING): ANY
        do
            Result := registry.item (name)
        end

    has (name: STRING): BOOLEAN
        do
            Result := registry.has (name)
        end
end
```

### 팩토리 캐시

```eiffel
class SHAPE_FACTORY
feature
    prototypes: HASH_TABLE [SHAPE, STRING]
        once
            create Result.make (10)
            Result.put (create {RECTANGLE}.make_default, "rectangle")
            Result.put (create {CIRCLE}.make_default, "circle")
            Result.put (create {TRIANGLE}.make_default, "triangle")
        end

    create_shape (type: STRING): SHAPE
        do
            if prototypes.has (type) then
                Result := prototypes.item (type).twin
            end
        end
end
```

## Once의 주의점

### 부작용 주의

```eiffel
-- 나쁜 예: once에서 외부 상태 변경
feature
    bad_once: INTEGER
        local
            f: FILE
        once
            create f.make_open_write ("log.txt")
            f.put_string ("Initialized")
            f.close
            Result := 42
        end
```

| 구분 | 내용 |
|------|------|
| **문제** | 첫 호출 시점 예측 어려움, 타이밍 비결정적, 테스트 어려움 |
| **권장** | once는 순수 함수처럼 사용, 부작용은 별도 초기화 루틴에서 |

### 순환 의존성 주의

```eiffel
class A
feature
    shared_b: B
        once
            create Result.make
        end
end

class B
feature
    shared_a: A
        once
            create Result.make
        end

    make
        do
            -- shared_a 접근하면?
            shared_a.do_something  -- 무한 재귀 위험!
        end
end
```

해결책:

| 방법 | 설명 |
|------|------|
| 의존성 그래프 | once 간 관계 명확히 파악 |
| 초기화 순서 | 명시적 설계 |
| 지연 초기화 | 순환 끊기 |

### 테스트 어려움

```eiffel
-- 문제: once가 테스트 간 상태 공유
class MY_TEST
feature
    test_feature
        do
            -- shared_instance가 이전 테스트의 상태를 가짐
            Shared.shared_instance.reset  -- 리셋 필요
        end
end
```

해결책:

| 방법 | 설명 |
|------|------|
| reset 피처 | once 객체에 리셋 기능 제공 |
| 의존성 주입 | 테스트 시 mock으로 대체 |
| 프로세스 분리 | 테스트 프레임워크에서 격리 |

## 자주 하는 실수

전역 객체와 상수 사용 시 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **once에서 부작용** | 파일 쓰기, 로그 등 → 호출 시점 예측 불가, 테스트 어려움 | once는 순수 초기화만. 부작용은 별도 루틴 |
| **순환 의존 once** | A.once가 B.once를 호출, B.once가 A.once 호출 → 무한 재귀 | 의존성 그래프 분석. 순환 끊기 |
| **테스트 간 상태 공유** | once 값이 테스트 간 유지 → 테스트 격리 실패 | reset 피처 제공 또는 의존성 주입 |
| **싱글톤 남용** | 모든 것을 once로 → 결합도 상승, 테스트 불가 | 꼭 필요한 경우만. 의존성 주입 선호 |
| **once 범위 혼동** | 스레드별 once가 필요한데 기본 once 사용 → 경쟁 조건 | `once ("THREAD")` 또는 `once ("OBJECT")` 명시 |
| **리터럴 상수에 참조 타입** | `name: STRING = "value"` 시도 → 컴파일 오류 | 참조 타입은 once 함수로. `once Result := "value"` |
| **상속 시 once 공유 혼란** | 부모 once가 자식에서 의도와 다르게 동작 | 재정의하면 별도 캐시. 공유 원하면 재정의 안 함 |

## 정리

- **Once 함수**: 첫 호출만 실행, 결과 캐시
- **싱글톤**: once로 전역 인스턴스 구현
- **상수**: 기본 타입은 `= 값`, 참조 타입은 once
- **Unique**: 컴파일러가 고유 정수값 할당
- **범위**: 프로세스, 스레드, 객체별 선택 가능
- **주의점**: 부작용, 순환 의존성, 테스트 어려움

## 다음 장 예고

Chapter 19에서는 **메서드론**을 다룬다. 객체지향 분석과 설계의 프로세스, 클래스 발견 방법.

## 관련 항목

- [Ch 13: Supporting Mechanisms](/blog/programming/design/oosc/chapter13-supporting-mechanisms) — once 기초
- [Ch 7: The Static Structure: Classes](/blog/programming/design/oosc/chapter07-the-static-structure-classes) — 클래스와 피처
- [Ch 9: Memory Management](/blog/programming/design/oosc/chapter09-memory-management) — 객체 생명주기
