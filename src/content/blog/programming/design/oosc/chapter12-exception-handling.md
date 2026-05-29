---
title: "Ch 12: When the Contract is Broken: Exception Handling"
date: 2026-05-19T12:00:00
description: "예외 처리 — 계약 위반 시 대응, 재시도와 조직적 패닉."
series: "Object-Oriented Software Construction"
seriesOrder: 12
tags: [oop, meyer, exceptions, error-handling, retry]
draft: true
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 예외는 **계약 위반**에서 발생한다. 대응 전략은 두 가지: **재시도**(retry)하거나 **조직적 패닉**(organized panic)으로 실패를 전파한다.

## 예외란 무엇인가

Meyer의 정의: 예외는 **루틴이 계약을 이행하지 못하는 상황**이다.

정상 실행에서는 사전조건 충족 → 루틴 실행 → 사후조건 충족 → 성공 순서로 진행된다. 예외는 루틴 실행 중 문제가 발생해 사후조건을 보장할 수 없을 때 발생한다.

### 예외의 원인

| 원인 | 예 |
|------|-----|
| **하드웨어 실패** | 메모리 부족, 디스크 오류 |
| **외부 시스템 오류** | 네트워크 끊김, 파일 없음 |
| **사전조건 위반** | 잘못된 인자 |
| **사후조건 위반** | 구현 버그 |
| **불변식 위반** | 객체 상태 손상 |
| **명시적 발생** | 프로그래머가 raise |

## Eiffel의 예외 처리

### rescue 절

```eiffel
class FILE_HANDLER
feature
    read_file (name: STRING): STRING
        local
            file: FILE
            retried: BOOLEAN
        do
            if not retried then
                create file.make_open_read (name)
                Result := file.read_all
                file.close
            else
                Result := ""  -- 기본값 반환
            end
        rescue
            retried := True
            retry
        end
end
```

### rescue의 역할

![rescue 흐름](/images/blog/oosc/diagrams/ch12-rescue-flow.svg)

do 블록 실행 중 예외가 발생하면 rescue 블록이 실행된다. rescue에서 `retry`를 호출하면 do 블록을 처음부터 다시 시도한다. `retry` 없이 rescue가 끝나면 예외가 호출자에게 전파된다.

## 재시도(Retry) 전략

예외 상황을 복구하고 다시 시도:

```eiffel
class NETWORK_CLIENT
feature
    max_retries: INTEGER = 3

    send_request (data: STRING): RESPONSE
        local
            attempt: INTEGER
        do
            attempt := attempt + 1
            -- 네트워크 요청 시도
            Result := do_send (data)
        rescue
            if attempt < max_retries then
                -- 잠시 대기 후 재시도
                wait (1000 * attempt)  -- 점진적 대기
                retry
            end
            -- max_retries 초과: 예외 전파
        end
end
```

### 재시도가 적절한 경우

| 적절한 경우 | 부적절한 경우 |
|-------------|---------------|
| 일시적 오류 (네트워크 끊김, 리소스 부족) | 논리적 오류 (사전조건 위반) |
| 대안 전략 사용 가능 | 영구적 실패 (파일이 존재하지 않음) |
| 복구 가능한 상태 | 무한 루프 위험 |

### 대안 전략 패턴

```eiffel
class DATA_LOADER
feature
    load_data: DATA
        local
            tried_primary: BOOLEAN
            tried_backup: BOOLEAN
        do
            if not tried_primary then
                Result := load_from_primary
            elseif not tried_backup then
                Result := load_from_backup
            else
                Result := load_default_data
            end
        rescue
            if not tried_primary then
                tried_primary := True
                retry
            elseif not tried_backup then
                tried_backup := True
                retry
            end
            -- 모든 대안 실패: 예외 전파
        end
end
```

## 조직적 패닉(Organized Panic)

재시도가 불가능하면 **깔끔하게 실패**한다:

```eiffel
class ACCOUNT
feature
    transfer (amount: INTEGER; target: ACCOUNT)
        local
            original_balance: INTEGER
        do
            original_balance := balance
            withdraw (amount)
            target.deposit (amount)
        rescue
            -- 상태 복원
            balance := original_balance
            -- 예외 전파 (retry 없음)
        end
end
```

### 조직적 패닉의 원칙

| 원칙 | 동작 |
|------|------|
| **불변식 복원** | 객체를 안정된 상태로 되돌려 일관성 보장 |
| **리소스 정리** | 열린 파일 닫기, 락 해제, 메모리 해제 |
| **예외 전파** | 호출자에게 실패 알림, 상위에서 처리 결정 |

```eiffel
class TRANSACTION
feature
    execute
        local
            resources_acquired: BOOLEAN
        do
            acquire_resources
            resources_acquired := True
            do_work
            commit
        rescue
            if resources_acquired then
                release_resources
            end
            rollback
            -- retry 없음: 예외 전파
        end
end
```

## 예외 클래스 계층

![예외 클래스 계층](/images/blog/oosc/diagrams/ch12-exception-hierarchy.svg)

EXCEPTION을 루트로 PRECONDITION_VIOLATION, POSTCONDITION_VIOLATION, INVARIANT_VIOLATION 등 계약 위반 예외와 HARDWARE_EXCEPTION(NO_MORE_MEMORY, FLOATING_POINT_ERROR), DEVELOPER_EXCEPTION(사용자 정의) 등이 있다.

### 예외 정보 얻기

```eiffel
class ERROR_HANDLER
feature
    risky_operation
        local
            exc: EXCEPTION_MANAGER
        do
            -- 위험한 작업
        rescue
            exc := exception_manager
            log_error (exc.exception_trace)

            if attached {PRECONDITION_VIOLATION} exc.last_exception then
                -- 사전조건 위반 처리
            elseif attached {NO_MORE_MEMORY} exc.last_exception then
                -- 메모리 부족 처리
            end
        end
end
```

## 예외 발생시키기

명시적으로 예외를 발생:

```eiffel
class USER_SERVICE
feature
    get_user (id: INTEGER): USER
        local
            exc: DEVELOPER_EXCEPTION
        do
            Result := database.find_user (id)
            if Result = Void then
                create exc.make_with_tag_and_trace (
                    "USER_NOT_FOUND",
                    "User with id " + id.out + " not found"
                )
                exc.raise
            end
        end
end
```

## 계약 위반 vs 예외

| 구분 | 사전조건 위반 | 예외 |
|------|---------------|------|
| **원인** | 클라이언트 버그 | 외부 요인 또는 예측 불가 상황 |
| **처리** | 클라이언트 코드 수정 필요 | rescue로 처리 가능 |
| **성격** | 프로그래밍 오류 | 프로그램 로직의 일부 |

```eiffel
-- 사전조건: 클라이언트 책임
withdraw (amount: INTEGER)
    require
        positive: amount > 0
        sufficient: amount <= balance
    do
        balance := balance - amount
    end

-- 예외: 외부 요인
read_file (name: STRING): STRING
    -- 사전조건으로 "파일이 존재해야 함"을 넣으면?
    -- → 클라이언트가 매번 존재 여부 확인해야
    -- → 비현실적

    -- 대신 예외로 처리
    do
        -- 파일 읽기 시도
    rescue
        -- 파일 없음 예외 처리
    end
```

## 예외 처리 철학

### 하지 말아야 할 것

```eiffel
-- 나쁜 예: 모든 예외 삼키기
dangerous_operation
    do
        risky_code
    rescue
        -- 아무것도 안 함
        retry  -- 무한 루프!
    end

-- 나쁜 예: 예외를 흐름 제어로 사용
find_item (key: STRING): ITEM
    do
        Result := table.item (key)  -- 없으면 예외 발생
    rescue
        -- 없는 것을 예외로 처리
        create Result.make_default
        retry
    end
```

### 해야 할 것

```eiffel
-- 좋은 예: 예외는 진짜 예외 상황에만
find_item (key: STRING): detachable ITEM
    do
        if table.has (key) then
            Result := table.item (key)
        else
            Result := Void  -- 정상적인 "없음" 표현
        end
    end

-- 좋은 예: 복구 또는 전파
process_file (name: STRING)
    local
        file: FILE
        tried: BOOLEAN
    do
        if not tried then
            create file.make_open_read (name)
            process (file)
            file.close
        else
            log ("File processing failed: " + name)
            notify_admin
        end
    rescue
        if file /= Void and then file.is_open then
            file.close
        end
        if not tried then
            tried := True
            retry
        end
        -- 두 번째 실패: 전파
    end
```

## 예외와 단언

| 모드 | 단언 위반 시 |
|------|-------------|
| **개발 모드** (assertion all) | 사전/사후/불변식 위반 → 해당 예외 발생 |
| **배포 모드** (assertion no) | 단언 검사 안 함 → 정의되지 않은 동작 가능 |

Meyer의 조언: **단언은 버그 검출 도구**다. 사전조건 위반은 클라이언트 버그이므로 수정해야지, rescue로 "처리"하면 안 된다. **예외는 런타임 이벤트**로, 외부 요인에 대한 대응이며 rescue로 처리할 수 있다.

## 체계적인 예외 처리

### 레이어별 처리

| 레이어 | 처리 전략 |
|--------|-----------|
| **UI 레이어** | 사용자에게 메시지 표시, 재시도 옵션 제공 |
| **비즈니스 레이어** | 트랜잭션 롤백, 상태 복원, 로깅 |
| **데이터 레이어** | 연결 재시도, 대체 데이터 소스, 캐시 활용 |

### 예외 처리 정책

```eiffel
class APPLICATION
feature
    run
        do
            main_loop
        rescue
            handle_unhandled_exception
            -- 마지막 방어선
        end

    handle_unhandled_exception
        do
            log_fatal_error
            save_recovery_state
            notify_user
            graceful_shutdown
        end
end
```

## 자주 하는 실수

예외 처리에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **예외 삼키기** | `rescue` 블록이 비어 있거나 로그만 → 문제 숨김 | 복구하거나 전파. 아무것도 안 하면 버그 은폐 |
| **무한 retry** | 조건 없이 `retry` → 무한 루프 | 재시도 횟수 제한. `attempt < max_retries` 검사 |
| **예외로 흐름 제어** | `find_item`에서 없으면 예외 → 정상 케이스에 예외 사용 | 예외는 예외적 상황에만. 없으면 Void 반환 또는 `has` 먼저 검사 |
| **리소스 정리 누락** | rescue에서 파일/락/연결 해제 안 함 → 리소스 누수 | 조직적 패닉. 열린 것 닫고, 획득한 것 해제 |
| **사전조건 위반을 예외로 처리** | `require` 위반에 rescue 시도 → 클라이언트 버그 은폐 | 사전조건 위반은 클라이언트 코드 수정. 예외로 "처리" 금지 |
| **불변식 미복원** | rescue 후 객체가 비정상 상태 → 이후 연쇄 오류 | 불변식 복원 후 전파. `balance := original_balance` |
| **예외 타입 무시** | 모든 예외를 동일하게 처리 → 원인 파악 불가 | 예외 타입별 대응. `attached {NO_MORE_MEMORY}` 패턴 매칭 |

## 정리

- **예외 = 계약 이행 실패**: 루틴이 사후조건을 만족시키지 못함
- **rescue 절**: 예외 발생 시 실행
- **retry**: 루틴 처음부터 재시도
- **조직적 패닉**: 상태 복원 후 예외 전파
- **재시도 vs 전파**: 복구 가능하면 retry, 아니면 전파
- **단언 위반 ≠ 일반 예외**: 단언 위반은 버그, 예외는 런타임 이벤트
- **예외는 예외적으로**: 흐름 제어로 사용하지 않음

## 다음 장 예고

Chapter 13에서는 **지원 메커니즘**을 다룬다. 상수, 한번만 실행되는 루틴(once), 디버깅 지원 등.

## 관련 항목

- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
- [Ch 1: Software Quality](/blog/programming/design/oosc/chapter01-software-quality) — 견고성
- [Ch 16: Inheritance and Assertions](/blog/programming/design/oosc/chapter16-inheritance-and-assertions) — 상속과 계약
