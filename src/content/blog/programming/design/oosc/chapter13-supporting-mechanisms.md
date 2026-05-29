---
title: "Ch 13: Supporting Mechanisms"
date: 2026-05-19T13:00:00
description: "지원 메커니즘 — 외부 루틴, 인라인, 디버깅, 문서화."
series: "Object-Oriented Software Construction"
seriesOrder: 13
tags: [oop, meyer, debugging, documentation, external]
draft: true
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 핵심 OO 메커니즘 외에도 실용적인 **지원 메커니즘**이 필요하다. 외부 루틴, once 함수, 디버깅 명령어, 자동 문서화 등.

## 외부 루틴(External Routines)

다른 언어로 작성된 코드 호출:

```eiffel
class MATH_FUNCTIONS
feature
    sqrt (x: REAL): REAL
        -- 제곱근 (C 라이브러리 사용)
        external
            "C"
        alias
            "sqrt"
        end

    sin (x: REAL): REAL
        external
            "C"
        alias
            "sin"
        end
end
```

### 외부 루틴의 용도

| 용도 | 예 |
|------|-----|
| **시스템 호출** | 파일 I/O, 네트워크 |
| **기존 라이브러리** | C 수학 라이브러리, OS API |
| **성능 최적화** | 어셈블리 루틴 |
| **하드웨어 접근** | 디바이스 드라이버 |

### 외부 루틴과 계약

```eiffel
class FILE_SYSTEM
feature
    open_file (name: STRING): INTEGER
        -- 파일 열기, 핸들 반환
        require
            name_not_empty: not name.is_empty
        external
            "C"
        alias
            "fopen"
        ensure
            valid_handle: Result >= 0 or Result = -1
        end
end
```

외부 루틴도 **계약을 명시**할 수 있다. 단, 외부 코드가 사후조건을 보장해야 한다.

## Once 함수

**한 번만 실행**되는 루틴. 결과가 캐시된다:

```eiffel
class DATABASE
feature
    connection: DATABASE_CONNECTION
        -- 싱글톤 연결
        once
            create Result.make ("localhost", 5432)
            Result.connect
        end
end
```

### Once 함수의 동작

| 호출 | 동작 |
|------|------|
| **첫 번째** | 루틴 실행 → DATABASE_CONNECTION 생성 → 결과 캐시 |
| **두 번째 이후** | 캐시된 결과 즉시 반환, 생성 코드 실행 안 함 |

### 전역 객체 패턴

```eiffel
class LOGGER
feature
    instance: LOGGER
        -- 전역 로거 인스턴스
        once
            create Result.make
        end

    log (message: STRING)
        do
            instance.write (message)
        end
end
```

`once`는 **싱글톤**과 **전역 객체**를 우아하게 구현한다.

### 문자열 once

```eiffel
class ERROR_MESSAGES
feature
    invalid_input: STRING
        once
            Result := "Invalid input provided"
        end

    file_not_found: STRING
        once
            Result := "File not found"
        end
end
```

문자열 상수를 `once`로 정의하면 메모리 효율적이다.

## 디버깅 지원

### check 명령어

```eiffel
process_data (data: LIST [INTEGER])
    local
        sum: INTEGER
    do
        across data as item loop
            sum := sum + item.item
        end

        check
            sum_positive: sum >= 0
            -- 이 시점에서 sum은 0 이상이어야 함
        end

        continue_processing (sum)
    end
```

`check`는 **중간 단언**이다. 코드 중간에 조건 검사.

### debug 명령어

```eiffel
feature
    complex_algorithm
        do
            step_one
            debug ("algorithm")
                print ("After step one: " + state.out)
            end

            step_two
            debug ("algorithm", "verbose")
                print ("After step two: " + detailed_state.out)
            end
        end
end
```

`debug` 블록은 **컴파일 설정**에 따라 포함되거나 제외된다. `--debug-key=algorithm` 옵션을 주면 "algorithm" 키의 블록이 포함된다.

### 디버깅 수준

| 단계 | assertion | debug | 효과 |
|------|-----------|-------|------|
| **개발 중** | all | algorithm, verbose | 모든 검사, 모든 디버그 출력 |
| **테스트 중** | require | 없음 | 사전조건만, 디버그 출력 없음 |
| **배포** | no | 없음 | 최대 성능 |

## 자동 문서화

### Short Form 생성

Eiffel 도구는 클래스에서 **인터페이스 문서**를 자동 추출한다:

```eiffel
-- 원본 클래스
class STACK [G]
feature
    push (x: G)
        require
            not_full: not is_full
        do
            count := count + 1
            data[count] := x
        ensure
            pushed: top = x
            count_increased: count = old count + 1
        end
end
```

```eiffel
-- 자동 생성된 Short Form
class interface STACK [G]
feature
    push (x: G)
        require
            not_full: not is_full
        ensure
            pushed: top = x
            count_increased: count = old count + 1
end
```

구현(`do` 블록)은 숨기고 **계약만 노출**.

### 헤더 주석

```eiffel
class ACCOUNT
    -- 은행 계좌를 표현
    -- 잔고, 입출금, 이체 기능 제공

feature -- 접근
    balance: INTEGER
        -- 현재 잔고

feature -- 상태 변경
    deposit (amount: INTEGER)
        -- amount만큼 입금
        require
            positive: amount > 0
        ensure
            increased: balance = old balance + amount
        end
end
```

주석은 `--`로 시작하며, 문서 생성 시 포함된다.

### Flat Form

상속 관계를 펼친 전체 뷰다.

| 형태 | 내용 |
|------|------|
| **Short Form** | 현재 클래스만, 구현 제외 |
| **Flat Form** | 상속받은 피처까지 모두 포함 |
| **Flat-Short Form** | Flat + 구현 제외 |

## 기타 지원 메커니즘

### 인라인 확장

```eiffel
frozen inline_add (a, b: INTEGER): INTEGER
    do
        Result := a + b
    end
```

작은 루틴은 **인라인 확장**하여 호출 오버헤드 제거.

### 오브솔레트(Obsolete)

```eiffel
old_method (x: INTEGER)
    obsolete
        "Use new_method instead [2024-01-15]"
    do
        new_method (x)
    end
```

더 이상 사용하지 않을 피처에 경고 표시.

### 전처리 지시

```eiffel
note
    description: "Account management class"
    author: "Kim"
    date: "$Date$"
    revision: "$Revision$"
```

클래스 메타데이터.

## 자주 하는 실수

지원 메커니즘 사용 시 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **외부 루틴 계약 누락** | C 함수 호출 후 결과 검증 안 함 → 예기치 않은 동작 | require/ensure로 계약 명시. 외부 코드도 계약 일부 |
| **once 함수 상태 의존** | once 함수가 변하는 전역 상태에 의존 → 예측 불가 결과 | once는 순수 초기화용. 상태 의존 제거 |
| **싱글톤 남용** | 모든 것을 once로 전역화 → 테스트 어려움, 결합도 상승 | 꼭 필요한 경우만 once. 의존성 주입 고려 |
| **debug 블록 과다** | 코드 곳곳에 debug → 가독성 저하, 배포 시 혼란 | 체계적 로깅 시스템 사용. debug는 일시적 디버깅용 |
| **check 위치 오류** | check가 너무 많거나 엉뚱한 곳에 → 성능 저하, 의미 없음 | 핵심 가정 지점에만. 불변식은 invariant로 |
| **문서 주석 부실** | 헤더 주석 없이 코드만 → Short Form이 의미 없음 | 각 피처에 `-- 설명` 주석. 계약이 문서 |
| **obsolete 무시** | 경고 나와도 계속 사용 → 미래 버전에서 제거 시 장애 | obsolete 경고 해결. 새 API로 마이그레이션 |

## 정리

- **외부 루틴**: 다른 언어 코드 호출
- **once 함수**: 한 번만 실행, 결과 캐시
- **check**: 중간 단언
- **debug**: 조건부 디버그 코드
- **Short Form**: 자동 인터페이스 문서
- **obsolete**: 사용 중단 경고

## 다음 장 예고

Chapter 14에서는 **상속**을 다룬다. OO의 핵심 메커니즘, 확장, 재정의, 다형성.

## 관련 항목

- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속
- [Ch 18: Global Objects and Constants](/blog/programming/design/oosc/chapter18-global-objects-and-constants) — 전역 객체
