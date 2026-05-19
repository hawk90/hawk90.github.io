---
title: "Ch 32: Some O-O Techniques for Graphical Interactive Applications"
date: 2026-05-19T08:00:00
description: "GUI를 위한 OO 기법 — 이벤트 루프, MVC의 대안."
series: "Object-Oriented Software Construction"
seriesOrder: 32
tags: [oop, meyer, gui, graphics, event-loop, interactive]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> GUI 애플리케이션은 **이벤트 기반**이다. 객체지향은 **상태 패턴**, **커맨드 패턴**, **Observer**로 복잡한 대화형 시스템을 구조화한다.

## GUI의 특성

### GUI vs 배치 프로그램

| 특성 | 배치 프로그램 | GUI 프로그램 |
|------|-------------|-------------|
| 흐름 | 입력 → 처리 → 출력 | 사용자 이벤트 대기 → 반응 |
| 제어 주체 | 프로그램이 제어 | 사용자가 제어 |
| 실행 순서 | 순차적 | 비결정적 |

**제어의 역전**: 프로그램이 사용자를 호출하는 것이 아니라 사용자가 프로그램을 호출.

### 이벤트 기반 프로그래밍

| 이벤트 종류 | 예 |
|-----------|-----|
| 마우스 | 클릭, 이동, 드래그 |
| 키보드 | 키 누름, 키 뗌 |
| 윈도우 | 크기 변경, 포커스 |
| 타이머 | 주기적 이벤트 |
| 네트워크 | 데이터 도착 |

```eiffel
-- 이벤트 루프
loop
    event := wait_for_event
    dispatch (event)
end
```

## 이벤트 처리

### 콜백 방식

```eiffel
-- 전통적 콜백 방식

class BUTTON
feature
    on_click: PROCEDURE [TUPLE]
        -- 클릭 시 호출할 프로시저

    set_on_click (handler: PROCEDURE [TUPLE])
        do
            on_click := handler
        end

    click
        -- 클릭 이벤트 발생
        do
            if on_click /= Void then
                on_click.call ([])
            end
        end
end

-- 사용
button.set_on_click (agent handle_button_click)

handle_button_click
    do
        -- 버튼 클릭 처리
    end
```

### 에이전트 기반 이벤트

```eiffel
-- Eiffel의 에이전트 활용

class APPLICATION
feature
    setup_ui
        local
            button: BUTTON
        do
            create button.make ("Click Me")

            -- 에이전트로 이벤트 핸들러 연결
            button.click_actions.extend (agent on_button_clicked)
            button.click_actions.extend (agent log_click ("Button1"))
        end

    on_button_clicked
        do
            status_label.set_text ("Button clicked!")
        end

    log_click (button_name: STRING)
        do
            logger.log ("Clicked: " + button_name)
        end
end
```

### 이벤트 객체

```eiffel
class MOUSE_EVENT
feature
    x, y: INTEGER
        -- 마우스 위치

    button: INTEGER
        -- 눌린 버튼 (1=왼쪽, 2=오른쪽, 3=중간)

    modifiers: INTEGER
        -- Shift, Ctrl, Alt 상태

    is_shift_pressed: BOOLEAN
        do
            Result := modifiers.bit_and (Shift_mask) /= 0
        end

    is_ctrl_pressed: BOOLEAN
        do
            Result := modifiers.bit_and (Ctrl_mask) /= 0
        end
end

class WIDGET
feature
    on_mouse_down (event: MOUSE_EVENT)
        do
            if event.is_ctrl_pressed then
                -- Ctrl+클릭 처리
            else
                -- 일반 클릭 처리
            end
        end
end
```

## Observer 패턴

### 모델-뷰 분리

**문제**: 데이터(모델)가 변경될 때 여러 화면(뷰)이 업데이트되어야 한다.

| 해결: Observer 패턴 |
|-------------------|
| 모델이 뷰를 직접 알지 않음 |
| 변경을 통지만 함 |

### Observer 구현

```eiffel
deferred class OBSERVABLE
feature
    observers: LIST [OBSERVER]

    attach (o: OBSERVER)
        do
            observers.extend (o)
        end

    detach (o: OBSERVER)
        do
            observers.prune (o)
        end

    notify
        do
            across observers as o loop
                o.item.update (Current)
            end
        end
end

deferred class OBSERVER
feature
    update (subject: OBSERVABLE)
        deferred
        end
end

-- 모델
class TEMPERATURE_MODEL
inherit
    OBSERVABLE

feature
    temperature: REAL

    set_temperature (t: REAL)
        do
            temperature := t
            notify  -- 모든 관찰자에게 통지
        end
end

-- 뷰
class TEMPERATURE_DISPLAY
inherit
    OBSERVER

feature
    update (subject: OBSERVABLE)
        do
            if attached {TEMPERATURE_MODEL} subject as model then
                display_label.set_text (model.temperature.out + "°C")
            end
        end
end

class TEMPERATURE_GRAPH
inherit
    OBSERVER

feature
    update (subject: OBSERVABLE)
        do
            if attached {TEMPERATURE_MODEL} subject as model then
                add_data_point (model.temperature)
                redraw
            end
        end
end
```

## 상태 패턴

### GUI에서의 상태

**문제**: 같은 이벤트가 상태에 따라 다르게 동작.

| 그래픽 에디터 예 | 클릭 동작 |
|---------------|---------|
| 선택 모드 | 객체 선택 |
| 그리기 모드 | 점 찍기 |
| 이동 모드 | 객체 이동 시작 |

**해결**: 상태 패턴으로 모드별 동작 분리.

### 상태 패턴 구현

```eiffel
deferred class EDITOR_STATE
feature
    editor: GRAPHICS_EDITOR

    set_editor (e: GRAPHICS_EDITOR)
        do
            editor := e
        end

    on_mouse_down (event: MOUSE_EVENT)
        deferred
        end

    on_mouse_move (event: MOUSE_EVENT)
        deferred
        end

    on_mouse_up (event: MOUSE_EVENT)
        deferred
        end
end

class SELECTION_STATE
inherit
    EDITOR_STATE

feature
    on_mouse_down (event: MOUSE_EVENT)
        do
            -- 클릭 위치의 객체 선택
            editor.select_object_at (event.x, event.y)
        end

    on_mouse_move (event: MOUSE_EVENT)
        do
            -- 선택 영역 업데이트 (드래그 선택)
            if editor.is_dragging then
                editor.update_selection_rect (event.x, event.y)
            end
        end
end

class DRAWING_STATE
inherit
    EDITOR_STATE

feature
    on_mouse_down (event: MOUSE_EVENT)
        do
            -- 새 도형 시작
            editor.start_shape (event.x, event.y)
        end

    on_mouse_move (event: MOUSE_EVENT)
        do
            -- 도형 미리보기
            if editor.is_drawing then
                editor.preview_shape (event.x, event.y)
            end
        end

    on_mouse_up (event: MOUSE_EVENT)
        do
            -- 도형 완성
            editor.finish_shape (event.x, event.y)
        end
end

class GRAPHICS_EDITOR
feature
    current_state: EDITOR_STATE

    set_state (new_state: EDITOR_STATE)
        do
            current_state := new_state
            new_state.set_editor (Current)
        end

    on_mouse_down (event: MOUSE_EVENT)
        do
            current_state.on_mouse_down (event)
        end

    -- 상태 전환
    enter_selection_mode
        do
            set_state (create {SELECTION_STATE})
            status_bar.set_text ("Selection Mode")
        end

    enter_drawing_mode
        do
            set_state (create {DRAWING_STATE})
            status_bar.set_text ("Drawing Mode")
        end
end
```

## 커맨드 패턴과 Undo

### GUI에서의 Undo

| 대화형 애플리케이션의 필수 기능 |
|-----------------------------|
| 실행 취소 (Undo) |
| 다시 실행 (Redo) |
| 작업 히스토리 |

| 커맨드 패턴 |
|-----------|
| 각 사용자 동작을 객체로 캡슐화 |
| 실행과 취소를 쌍으로 정의 |

### 그래픽 에디터 커맨드

```eiffel
deferred class EDITOR_COMMAND
inherit
    COMMAND

feature
    editor: GRAPHICS_EDITOR

    make (e: GRAPHICS_EDITOR)
        do
            editor := e
        end
end

class MOVE_SHAPE_COMMAND
inherit
    EDITOR_COMMAND

feature
    shape: SHAPE
    old_position: POINT
    new_position: POINT

    make_move (e: GRAPHICS_EDITOR; s: SHAPE; target: POINT)
        do
            make (e)
            shape := s
            old_position := s.position.twin
            new_position := target.twin
        end

    execute
        do
            shape.move_to (new_position)
            editor.refresh
        end

    undo
        do
            shape.move_to (old_position)
            editor.refresh
        end
end

class CHANGE_COLOR_COMMAND
inherit
    EDITOR_COMMAND

feature
    shape: SHAPE
    old_color, new_color: COLOR

    make_color (e: GRAPHICS_EDITOR; s: SHAPE; c: COLOR)
        do
            make (e)
            shape := s
            old_color := s.color.twin
            new_color := c.twin
        end

    execute
        do
            shape.set_color (new_color)
            editor.refresh
        end

    undo
        do
            shape.set_color (old_color)
            editor.refresh
        end
end
```

## 위젯 계층

### 컴포지트 패턴

```eiffel
deferred class WIDGET
feature
    parent: detachable CONTAINER
    x, y: INTEGER
    width, height: INTEGER

    draw
        deferred
        end

    handle_event (event: EVENT)
        deferred
        end
end

class BUTTON
inherit
    WIDGET

feature
    label: STRING

    draw
        do
            canvas.draw_rectangle (x, y, width, height)
            canvas.draw_text (x + 5, y + 5, label)
        end
end

class CONTAINER
inherit
    WIDGET

feature
    children: LIST [WIDGET]

    add (child: WIDGET)
        do
            children.extend (child)
            child.parent := Current
        end

    draw
        do
            -- 자신 그리기
            canvas.draw_rectangle (x, y, width, height)

            -- 자식들 그리기
            across children as c loop
                c.item.draw
            end
        end

    handle_event (event: EVENT)
        local
            child: WIDGET
        do
            -- 이벤트를 적절한 자식에게 전달
            child := find_child_at (event.x, event.y)
            if child /= Void then
                child.handle_event (event)
            end
        end
end

class WINDOW
inherit
    CONTAINER

feature
    title: STRING

    draw
        do
            -- 타이틀 바 그리기
            canvas.draw_title_bar (x, y, width, title)
            -- 내용 영역
            Precursor  -- CONTAINER.draw
        end
end
```

### 레이아웃 관리

```eiffel
deferred class LAYOUT_MANAGER
feature
    layout (container: CONTAINER)
        deferred
        end
end

class HORIZONTAL_LAYOUT
inherit
    LAYOUT_MANAGER

feature
    spacing: INTEGER

    layout (container: CONTAINER)
        local
            current_x: INTEGER
        do
            current_x := container.x + padding

            across container.children as child loop
                child.item.set_position (current_x, container.y + padding)
                current_x := current_x + child.item.width + spacing
            end
        end
end

class VERTICAL_LAYOUT
inherit
    LAYOUT_MANAGER

feature
    spacing: INTEGER

    layout (container: CONTAINER)
        local
            current_y: INTEGER
        do
            current_y := container.y + padding

            across container.children as child loop
                child.item.set_position (container.x + padding, current_y)
                current_y := current_y + child.item.height + spacing
            end
        end
end
```

## 데이터 바인딩

### 양방향 바인딩

```eiffel
class DATA_BINDING [G]
feature
    source: OBSERVABLE_VALUE [G]
    target: BINDABLE_WIDGET [G]

    make (s: OBSERVABLE_VALUE [G]; t: BINDABLE_WIDGET [G])
        do
            source := s
            target := t

            -- 소스 → 타겟
            source.change_actions.extend (agent on_source_changed)

            -- 타겟 → 소스
            target.input_actions.extend (agent on_target_changed)

            -- 초기 동기화
            target.set_value (source.value)
        end

    on_source_changed
        do
            target.set_value (source.value)
        end

    on_target_changed
        do
            source.set_value (target.get_value)
        end
end

-- 사용
class FORM
feature
    model: PERSON
    name_field: TEXT_FIELD

    setup
        local
            binding: DATA_BINDING [STRING]
        do
            create binding.make (model.observable_name, name_field)
            -- 이제 모델과 필드가 자동 동기화
        end
end
```

## 비동기 GUI

### UI 스레드와 작업 스레드

**문제**: 긴 작업 중 UI가 멈춤 (이벤트 처리 못함).

| 해결 |
|------|
| 긴 작업은 별도 스레드 |
| UI 업데이트는 UI 스레드에서 |

**규칙**: UI 위젯은 UI 스레드에서만 수정.

### 비동기 작업

```eiffel
class ASYNC_TASK
feature
    run_async (task: PROCEDURE; on_complete: PROCEDURE)
        -- 백그라운드에서 task 실행
        -- 완료 후 UI 스레드에서 on_complete 호출
        do
            worker_thread.execute (
                agent execute_and_callback (task, on_complete)
            )
        end

    execute_and_callback (task, callback: PROCEDURE)
        do
            task.call ([])

            -- UI 스레드로 콜백 예약
            ui_thread.invoke_later (callback)
        end
end

-- 사용
class DOWNLOADER
feature
    download_file (url: STRING)
        do
            progress_bar.show
            status.set_text ("Downloading...")

            async.run_async (
                agent do_download (url),
                agent on_download_complete
            )
        end

    do_download (url: STRING)
        -- 백그라운드에서 실행
        do
            -- 파일 다운로드
        end

    on_download_complete
        -- UI 스레드에서 실행
        do
            progress_bar.hide
            status.set_text ("Download complete!")
        end
end
```

## 설계 원칙

### 모델-뷰 분리 원칙

| 원칙 |
|------|
| 비즈니스 로직(모델)과 표현(뷰) 분리 |
| 모델은 GUI에 무관 |
| 여러 뷰가 같은 모델 공유 가능 |
| 테스트 용이 |

| MVC 대안들 |
|-----------|
| MVP (Model-View-Presenter) |
| MVVM (Model-View-ViewModel) |
| MVI (Model-View-Intent) |

**핵심은 분리**: 어느 패턴이든 모델은 순수하게.

### 이벤트 핸들러 단순화

| 규칙 | 설명 |
|------|------|
| 핸들러는 짧게 | 긴 로직은 별도 메서드로 |
| 핸들러에서 직접 모델 수정 피함 | 커맨드로 캡슐화 |
| 복잡한 조건은 상태 패턴으로 | — |
| 비동기 작업은 분리 | — |

## 자주 하는 실수

GUI 프로그래밍에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **모델과 뷰 결합** | 비즈니스 로직이 UI 코드에 섞임 → 테스트 어려움, 재사용 불가 | 모델-뷰 분리. Observer 패턴, 모델은 GUI에 무관 |
| **이벤트 핸들러에 긴 로직** | 핸들러 안에 복잡한 처리 → 스파게티 코드, 유지보수 악몽 | 핸들러는 짧게. 커맨드로 캡슐화, 별도 메서드로 분리 |
| **UI 스레드에서 긴 작업** | 파일 I/O, 네트워크 호출 → UI 멈춤, 응답 없음 | 비동기 처리. 작업 스레드 분리, UI 업데이트는 UI 스레드에서 |
| **상태 조건문 폭발** | if-else/switch로 모드 처리 → 조건 중첩, 새 모드 추가 어려움 | 상태 패턴. 모드별 클래스 분리, 동작 위임 |
| **Undo 미구현** | 커맨드 없이 직접 수정 → 실행 취소 불가, 사용자 불편 | 커맨드 패턴. execute/undo 쌍, 히스토리 관리 |
| **Observer 해제 누락** | 뷰 소멸 시 detach 안 함 → 메모리 누수, 좀비 콜백 | 생명주기 관리. 뷰 소멸 시 반드시 detach |
| **레이아웃 하드코딩** | 절대 좌표로 위젯 배치 → 해상도/크기 변경 시 깨짐 | 레이아웃 매니저. 상대적 배치, 자동 조정 |

## 정리

- **이벤트 기반**: 사용자 이벤트 대기와 반응
- **Observer**: 모델 변경을 뷰에 통지
- **상태 패턴**: 모드별 동작 분리
- **커맨드 패턴**: Undo/Redo 지원
- **컴포지트**: 위젯 계층 구조
- **모델-뷰 분리**: 비즈니스 로직과 표현 분리

## 다음 장 예고

Chapter 33에서는 **Ada에서의 OO 프로그래밍**을 다룬다. Ada의 패키지와 태그 타입, OO 기능 활용.

## 관련 항목

- [Ch 20: Design Pattern: Multi-Panel](/blog/programming/design/oosc/chapter20-design-pattern-multi-panel) — 상태 패턴
- [Ch 21: Inheritance Case Study: Undo](/blog/programming/design/oosc/chapter21-inheritance-case-study-undo) — 커맨드 패턴
- [Ch 30: Concurrency](/blog/programming/design/oosc/chapter30-concurrency-distribution-client-server) — 동시성
