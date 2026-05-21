---
title: "Ch 20: Design Pattern: Multi-Panel Interactive Systems"
date: 2026-05-19T20:00:00
description: "다중 패널 인터랙티브 시스템 — 상태 전이와 이벤트 처리."
series: "Object-Oriented Software Construction"
seriesOrder: 20
tags: [oop, meyer, design-pattern, interactive, state-machine]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> **다중 패널 시스템**은 사용자 인터랙션을 **상태 기계**로 모델링한다. 각 상태는 **패널**이고, 전이는 **사용자 동작**이다.

## 문제 상황

인터랙티브 시스템의 전형적인 구조:

| 특징 | 설명 |
|------|------|
| 여러 화면 | 패널, 다이얼로그 |
| 화면 전환 | 사용자 입력에 따라 |
| 작업 수행 | 각 화면에서 특정 작업 |

| 예시 | 흐름 |
|------|------|
| ATM | 카드 삽입 → PIN 입력 → 메뉴 선택 → 거래 → 완료 |
| 웹 위저드 | 정보 입력 → 확인 → 결제 → 완료 |
| 설치 프로그램 | 환영 → 라이선스 → 경로 선택 → 설치 → 완료 |

### 전통적 접근의 문제

**단순한 접근 (spaghetti):**

- case current_screen of

**SCREEN_LOGIN:**

- if button_ok then
- validate_login
- if valid then
- current_screen := SCREEN_MENU
- else
- show_error
- end
- elsif button_cancel then
- current_screen := SCREEN_EXIT
- end

**SCREEN_MENU:**

- if button_withdraw then
- current_screen := SCREEN_WITHDRAW
- elsif button_deposit then
- current_screen := SCREEN_DEPOSIT
- ...
- ...
- end

**문제:**

- 거대한 조건문
- 상태와 전이가 얽힘
- 확장 어려움
- 테스트 어려움

## 상태 기계 모델

### 유한 상태 기계 (FSM)

| 구성 요소 | 설명 |
|----------|------|
| **상태(State)** | 시스템이 있을 수 있는 상황 |
| **전이(Transition)** | 상태 간 이동 |
| **이벤트(Event)** | 전이를 촉발하는 것 |
| **동작(Action)** | 전이 시 수행하는 것 |

ATM 예:

| 요소 | 내용 |
|------|------|
| 상태 | 대기, PIN입력, 메뉴, 출금, 입금, 완료 |
| 전이 | 카드삽입 → 대기에서 PIN입력으로 |
| 이벤트 | 카드 삽입, 버튼 누름, 타임아웃 |
| 동작 | 화면 표시, 데이터 검증, 거래 처리 |

### OO로 상태 기계 구현

```eiffel
deferred class STATE
feature
    name: STRING
        deferred
        end

    handle_event (event: EVENT): STATE
        -- 이벤트 처리 후 다음 상태 반환
        deferred
        end

    enter
        -- 상태 진입 시 수행
        do
            -- 기본: 아무것도 안 함
        end

    exit
        -- 상태 이탈 시 수행
        do
            -- 기본: 아무것도 안 함
        end

    display
        -- 화면 표시
        deferred
        end
end
```

## 패널 설계

### APPLICATION 클래스

```eiffel
class APPLICATION
feature
    current_state: STATE
    states: HASH_TABLE [STATE, STRING]

    make
        do
            create states.make (10)
            setup_states
            current_state := initial_state
        end

    run
        local
            event: EVENT
            next_state: STATE
        do
            from
            until
                is_terminated
            loop
                current_state.display
                event := read_event
                next_state := current_state.handle_event (event)
                if next_state /= current_state then
                    current_state.exit
                    current_state := next_state
                    current_state.enter
                end
            end
        end

    setup_states
        deferred
        end

    initial_state: STATE
        deferred
        end

    is_terminated: BOOLEAN
end
```

### 구체 상태 클래스

```eiffel
class LOGIN_STATE
inherit
    STATE

feature
    name: STRING = "Login"

    handle_event (event: EVENT): STATE
        do
            if attached {BUTTON_EVENT} event as btn then
                if btn.name ~ "OK" then
                    if validate_credentials then
                        Result := menu_state
                    else
                        show_error ("Invalid credentials")
                        Result := Current  -- 같은 상태 유지
                    end
                elseif btn.name ~ "Cancel" then
                    Result := exit_state
                else
                    Result := Current
                end
            else
                Result := Current
            end
        end

    display
        do
            clear_screen
            show_label ("Enter PIN:")
            show_input_field ("pin")
            show_button ("OK")
            show_button ("Cancel")
        end

    enter
        do
            reset_pin_field
        end
end

class MENU_STATE
inherit
    STATE

feature
    name: STRING = "Menu"

    handle_event (event: EVENT): STATE
        do
            if attached {BUTTON_EVENT} event as btn then
                if btn.name ~ "Withdraw" then
                    Result := withdraw_state
                elseif btn.name ~ "Deposit" then
                    Result := deposit_state
                elseif btn.name ~ "Balance" then
                    Result := balance_state
                elseif btn.name ~ "Exit" then
                    Result := exit_state
                else
                    Result := Current
                end
            else
                Result := Current
            end
        end

    display
        do
            clear_screen
            show_label ("Select transaction:")
            show_button ("Withdraw")
            show_button ("Deposit")
            show_button ("Balance")
            show_button ("Exit")
        end
end
```

## 전이 테이블

### 선언적 전이 정의

```eiffel
class TRANSITION_TABLE
feature
    transitions: HASH_TABLE [STATE, TUPLE [STATE, EVENT]]

    add_transition (from_state: STATE; event: EVENT; to_state: STATE)
        do
            transitions.put (to_state, [from_state, event])
        end

    next_state (current: STATE; event: EVENT): STATE
        do
            if transitions.has ([current, event]) then
                Result := transitions.item ([current, event])
            else
                Result := current  -- 기본: 상태 유지
            end
        end
end
```

### 전이 테이블 기반 APPLICATION

```eiffel
class TABLE_DRIVEN_APPLICATION
feature
    transitions: TRANSITION_TABLE

    setup_transitions
        do
            create transitions.make

            -- Login 상태에서의 전이
            transitions.add_transition (login_state, ok_event, menu_state)
            transitions.add_transition (login_state, cancel_event, exit_state)

            -- Menu 상태에서의 전이
            transitions.add_transition (menu_state, withdraw_event, withdraw_state)
            transitions.add_transition (menu_state, deposit_event, deposit_state)
            transitions.add_transition (menu_state, balance_event, balance_state)
            transitions.add_transition (menu_state, exit_event, exit_state)

            -- Withdraw 상태에서의 전이
            transitions.add_transition (withdraw_state, confirm_event, menu_state)
            transitions.add_transition (withdraw_state, cancel_event, menu_state)

            -- ...
        end

    run
        local
            event: EVENT
            next_state: STATE
        do
            from
            until
                is_terminated
            loop
                current_state.display
                event := read_event
                next_state := transitions.next_state (current_state, event)

                if next_state /= current_state then
                    execute_transition (current_state, event, next_state)
                    current_state := next_state
                end
            end
        end
end
```

## 상태별 동작

### 진입/이탈 동작

```eiffel
class WITHDRAW_STATE
inherit
    STATE

feature
    name: STRING = "Withdraw"

    enter
        do
            -- 출금 화면 진입 시
            reset_amount_field
            load_account_balance
            start_timeout_timer (30)  -- 30초 타임아웃
        end

    exit
        do
            -- 출금 화면 이탈 시
            cancel_timeout_timer
            clear_sensitive_data
        end

    handle_event (event: EVENT): STATE
        do
            if attached {AMOUNT_EVENT} event as amt then
                if amt.value <= account_balance then
                    process_withdrawal (amt.value)
                    Result := success_state
                else
                    show_error ("Insufficient funds")
                    Result := Current
                end
            elseif attached {CANCEL_EVENT} event then
                Result := menu_state
            elseif attached {TIMEOUT_EVENT} event then
                Result := exit_state  -- 타임아웃 시 종료
            else
                Result := Current
            end
        end
end
```

### 전이 동작

```eiffel
class APPLICATION
feature
    execute_transition (from_state, to_state: STATE; event: EVENT)
        do
            -- 이탈 동작
            from_state.exit

            -- 전이 동작 (상태 쌍에 특정)
            execute_transition_action (from_state, event, to_state)

            -- 진입 동작
            to_state.enter
        end

    execute_transition_action (from_state: STATE; event: EVENT; to_state: STATE)
        do
            -- 특정 전이에 대한 동작
            if from_state = withdraw_state and to_state = success_state then
                print_receipt
                update_transaction_log
            end
        end
end
```

## 계층적 상태

### 상위 상태와 하위 상태

상태 계층 구조:

| 상위 상태 | 하위 상태 |
|----------|----------|
| TRANSACTION | WITHDRAW, DEPOSIT, TRANSFER |

| 동작 유형 | 내용 |
|----------|------|
| **공통 동작** | TRANSACTION 진입(거래 시작), 이탈(거래 종료), 타임아웃 처리 |
| **개별 동작** | WITHDRAW(출금 로직), DEPOSIT(입금 로직) |

### 계층적 상태 구현

```eiffel
class TRANSACTION_STATE
inherit
    STATE

feature
    name: STRING = "Transaction"

    handle_event (event: EVENT): STATE
        do
            -- 공통 이벤트 처리
            if attached {TIMEOUT_EVENT} event then
                Result := exit_state
            elseif attached {CANCEL_EVENT} event then
                Result := menu_state
            else
                -- 하위 상태에 위임
                Result := handle_specific_event (event)
            end
        end

    handle_specific_event (event: EVENT): STATE
        deferred
        end

    enter
        do
            start_transaction
            start_timeout_timer (60)
        end

    exit
        do
            cancel_timeout_timer
            end_transaction
        end
end

class WITHDRAW_STATE
inherit
    TRANSACTION_STATE
        redefine
            name
        end

feature
    name: STRING = "Withdraw"

    handle_specific_event (event: EVENT): STATE
        do
            if attached {AMOUNT_EVENT} event as amt then
                process_withdrawal (amt.value)
                Result := success_state
            else
                Result := Current
            end
        end

    display
        do
            show_label ("Enter amount to withdraw:")
            show_keypad
            show_button ("Confirm")
            show_button ("Cancel")
        end
end
```

## 이벤트 처리

### 이벤트 클래스 계층

```eiffel
deferred class EVENT
feature
    timestamp: DATE_TIME
    source: STRING
end

class BUTTON_EVENT
inherit
    EVENT

feature
    name: STRING
        -- 버튼 이름

    make (button_name: STRING)
        do
            name := button_name
            timestamp := create {DATE_TIME}.make_now
        end
end

class INPUT_EVENT
inherit
    EVENT

feature
    field_name: STRING
    value: STRING

    make (field: STRING; val: STRING)
        do
            field_name := field
            value := val
            timestamp := create {DATE_TIME}.make_now
        end
end

class TIMEOUT_EVENT
inherit
    EVENT

feature
    make
        do
            timestamp := create {DATE_TIME}.make_now
            source := "timer"
        end
end
```

### 이벤트 큐

```eiffel
class EVENT_QUEUE
feature
    queue: LINKED_QUEUE [EVENT]

    make
        do
            create queue.make
        end

    enqueue (event: EVENT)
        do
            queue.extend (event)
        end

    dequeue: EVENT
        require
            not_empty: not is_empty
        do
            Result := queue.item
            queue.remove
        end

    is_empty: BOOLEAN
        do
            Result := queue.is_empty
        end

    wait_for_event: EVENT
        -- 이벤트가 올 때까지 블로킹
        do
            from
            until
                not is_empty
            loop
                wait (100)  -- 100ms 대기
            end
            Result := dequeue
        end
end
```

## 패널 간 데이터 전달

### 컨텍스트 객체

```eiffel
class SESSION_CONTEXT
feature
    user: USER
    account: ACCOUNT
    current_transaction: TRANSACTION

    data: HASH_TABLE [ANY, STRING]

    make
        do
            create data.make (20)
        end

    put (key: STRING; value: ANY)
        do
            data.force (value, key)
        end

    get (key: STRING): detachable ANY
        do
            Result := data.item (key)
        end

    get_string (key: STRING): STRING
        do
            if attached {STRING} get (key) as s then
                Result := s
            else
                Result := ""
            end
        end

    get_integer (key: STRING): INTEGER
        do
            if attached {INTEGER_REF} get (key) as i then
                Result := i.item
            else
                Result := 0
            end
        end
end
```

### 상태에서 컨텍스트 사용

```eiffel
class WITHDRAW_STATE
inherit
    STATE

feature
    context: SESSION_CONTEXT

    handle_event (event: EVENT): STATE
        do
            if attached {AMOUNT_EVENT} event as amt then
                context.put ("withdraw_amount", amt.value)
                Result := confirm_state
            else
                Result := Current
            end
        end
end

class CONFIRM_STATE
inherit
    STATE

feature
    context: SESSION_CONTEXT

    display
        do
            clear_screen
            show_label ("Confirm withdrawal of $" +
                        context.get_integer ("withdraw_amount").out)
            show_button ("Confirm")
            show_button ("Cancel")
        end

    handle_event (event: EVENT): STATE
        do
            if attached {BUTTON_EVENT} event as btn then
                if btn.name ~ "Confirm" then
                    process_withdrawal (context.get_integer ("withdraw_amount"))
                    Result := success_state
                else
                    Result := menu_state
                end
            else
                Result := Current
            end
        end
end
```

## 테스트 전략

### 상태 기계 테스트

```eiffel
class ATM_TESTS
feature
    test_login_success
        local
            app: ATM_APPLICATION
            result_state: STATE
        do
            app := create_test_app_at_login

            -- 올바른 PIN 입력
            result_state := app.current_state.handle_event (
                create {INPUT_EVENT}.make ("pin", "1234")
            )
            result_state := result_state.handle_event (
                create {BUTTON_EVENT}.make ("OK")
            )

            assert ("After valid login, should be at menu",
                    result_state.name ~ "Menu")
        end

    test_login_failure
        local
            app: ATM_APPLICATION
            result_state: STATE
        do
            app := create_test_app_at_login

            -- 잘못된 PIN 입력
            result_state := app.current_state.handle_event (
                create {INPUT_EVENT}.make ("pin", "0000")
            )
            result_state := result_state.handle_event (
                create {BUTTON_EVENT}.make ("OK")
            )

            assert ("After invalid login, should stay at login",
                    result_state.name ~ "Login")
        end

    test_withdraw_flow
        local
            app: ATM_APPLICATION
        do
            app := create_test_app_at_menu

            -- 출금 선택
            app.process_event (create {BUTTON_EVENT}.make ("Withdraw"))
            assert ("Should be at withdraw", app.current_state.name ~ "Withdraw")

            -- 금액 입력
            app.process_event (create {AMOUNT_EVENT}.make (100))
            assert ("Should be at confirm", app.current_state.name ~ "Confirm")

            -- 확인
            app.process_event (create {BUTTON_EVENT}.make ("Confirm"))
            assert ("Should be at success", app.current_state.name ~ "Success")
        end
end
```

## 자주 하는 실수

상태 기계 기반 인터랙티브 시스템에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **스파게티 조건문** | 거대한 `case` 문으로 상태 관리 → 확장 어려움 | STATE 클래스 계층 도입. 각 상태를 객체로 |
| **enter/exit 누락** | 상태 진입/이탈 시 초기화·정리 안 함 → 버그 | enter, exit 메서드 정의. 리소스 관리 명시 |
| **전이 동작 분산** | 전이 로직이 여러 곳에 흩어짐 → 일관성 깨짐 | 전이 테이블 또는 execute_transition 한 곳에서 관리 |
| **이벤트 타입 혼란** | 이벤트 종류 구분 없이 처리 → 잘못된 전이 | EVENT 클래스 계층. `attached` 패턴으로 타입별 처리 |
| **상태 간 강결합** | 상태가 다른 상태를 직접 참조 → 수정 파급 | APPLICATION이 상태 전환 관리. 상태는 다음 상태 이름만 반환 |
| **타임아웃 미처리** | 타임아웃 이벤트 없음 → 사용자 방치 시 시스템 정지 | TIMEOUT_EVENT 정의. 각 상태에서 타임아웃 처리 |
| **컨텍스트 무관리** | 상태 간 데이터 전달에 전역 변수 사용 → 상태 오염 | SESSION_CONTEXT 객체로 데이터 관리. 명시적 전달 |

## 정리

- **상태 기계 모델**: 화면 = 상태, 사용자 동작 = 전이
- **STATE 클래스**: 각 화면을 클래스로 표현
- **전이 테이블**: 선언적 상태 전이 정의
- **계층적 상태**: 공통 동작의 재사용
- **이벤트 큐**: 비동기 이벤트 처리
- **컨텍스트**: 상태 간 데이터 전달
- **테스트**: 상태별, 전이별 테스트

## 다음 장 예고

Chapter 21에서는 **Undo 케이스 스터디**를 다룬다. Command 패턴의 OO 구현, 상속을 활용한 undo/redo 시스템.

## 관련 항목

- [Ch 21: Inheritance Case Study: Undo](/blog/programming/design/oosc/chapter21-inheritance-case-study-undo) — Command 패턴
- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속
- [Ch 32: OO Techniques for GUI](/blog/programming/design/oosc/chapter32-oo-techniques-for-gui) — GUI 기법
