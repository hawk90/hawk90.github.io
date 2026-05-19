---
title: "Ch 21: Inheritance Case Study: Undo"
date: 2026-05-19T21:00:00
description: "상속 케이스 스터디: Undo — Command 패턴의 OO 구현."
series: "Object-Oriented Software Construction"
seriesOrder: 21
tags: [oop, meyer, undo, command-pattern, case-study]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> **Undo/Redo**는 **Command 패턴**으로 구현한다. 각 명령을 객체로 만들고, **history list**에 저장해서 되돌린다.

## 문제 상황

대부분의 인터랙티브 애플리케이션은 Undo 기능이 필요하다.

| 사용자 기대 | 설명 |
|-----------|------|
| 실수 복구 | 되돌릴 수 있음 |
| 다단계 Undo | 여러 단계 되돌리기 |
| Redo | 다시 실행 |
| 무제한(또는 합리적 제한) | 충분한 히스토리 |

| 애플리케이션 | 되돌리기 대상 |
|-------------|-------------|
| 텍스트 에디터 | 타이핑, 삭제, 붙여넣기 |
| 그래픽 에디터 | 도형 이동, 색상 변경 |
| 스프레드시트 | 셀 편집 |

### 단순한 접근의 한계

| 방식 | 문제 |
|------|------|
| **스냅샷 방식** | 각 동작 전에 전체 상태 저장 → 메모리 비용 막대, 큰 문서에서 비실용적 |
| **조건문 방식** | 동작별 분기 → 새 동작 추가마다 코드 수정, 유지보수 악몽 |

## Command 패턴의 핵심

### 명령을 객체로

| 단계 | 동작 |
|------|------|
| 1 | 각 사용자 동작을 객체로 캡슐화 |
| 2 | 동작 수행(execute)과 되돌리기(undo) 정의 |
| 3 | 수행된 명령을 history에 저장 |
| 4 | Undo 시 history에서 꺼내서 되돌리기 |

### COMMAND 추상 클래스

```eiffel
deferred class COMMAND
feature
    execute
        -- 명령 실행
        deferred
        end

    undo
        -- 명령 되돌리기
        deferred
        end

    redo
        -- 명령 재실행 (기본: execute와 동일)
        do
            execute
        end
end
```

## Undo 아키텍처

### HISTORY_LIST 클래스

```eiffel
class HISTORY_LIST
feature
    commands: ARRAYED_STACK [COMMAND]
    redo_stack: ARRAYED_STACK [COMMAND]

    make
        do
            create commands.make (100)
            create redo_stack.make (100)
        end

    record (cmd: COMMAND)
        -- 명령 기록
        do
            commands.put (cmd)
            redo_stack.wipe_out  -- Redo 스택 초기화
        end

    undo
        -- 마지막 명령 되돌리기
        require
            can_undo: not commands.is_empty
        local
            cmd: COMMAND
        do
            cmd := commands.item
            commands.remove
            cmd.undo
            redo_stack.put (cmd)
        end

    redo
        -- 마지막 Undo 재실행
        require
            can_redo: not redo_stack.is_empty
        local
            cmd: COMMAND
        do
            cmd := redo_stack.item
            redo_stack.remove
            cmd.redo
            commands.put (cmd)
        end

    can_undo: BOOLEAN
        do
            Result := not commands.is_empty
        end

    can_redo: BOOLEAN
        do
            Result := not redo_stack.is_empty
        end
end
```

### APPLICATION과 HISTORY 통합

```eiffel
class APPLICATION
feature
    history: HISTORY_LIST

    make
        do
            create history.make
        end

    execute_command (cmd: COMMAND)
        do
            cmd.execute
            history.record (cmd)
        end

    undo
        do
            if history.can_undo then
                history.undo
            end
        end

    redo
        do
            if history.can_redo then
                history.redo
            end
        end
end
```

## 구체 명령 클래스들

### 텍스트 에디터 예시

```eiffel
class LINE
feature
    text: STRING
    index: INTEGER

    make (t: STRING; i: INTEGER)
        do
            text := t.twin
            index := i
        end
end

class INSERTION
inherit
    COMMAND

feature
    line: LINE
    document: DOCUMENT

    make (doc: DOCUMENT; new_line: LINE)
        do
            document := doc
            line := new_line
        end

    execute
        do
            document.insert_line (line.index, line.text)
        end

    undo
        do
            document.delete_line (line.index)
        end
end

class DELETION
inherit
    COMMAND

feature
    line: LINE
    document: DOCUMENT

    make (doc: DOCUMENT; line_index: INTEGER)
        do
            document := doc
            -- 삭제 전에 내용 저장
            create line.make (document.line_at (line_index), line_index)
        end

    execute
        do
            document.delete_line (line.index)
        end

    undo
        do
            document.insert_line (line.index, line.text)
        end
end
```

### 그래픽 에디터 예시

```eiffel
class MOVE_FIGURE
inherit
    COMMAND

feature
    figure: FIGURE
    old_position: POINT
    new_position: POINT

    make (f: FIGURE; target: POINT)
        do
            figure := f
            old_position := f.position.twin
            new_position := target.twin
        end

    execute
        do
            figure.move_to (new_position)
        end

    undo
        do
            figure.move_to (old_position)
        end
end

class CHANGE_COLOR
inherit
    COMMAND

feature
    figure: FIGURE
    old_color: COLOR
    new_color: COLOR

    make (f: FIGURE; c: COLOR)
        do
            figure := f
            old_color := f.color.twin
            new_color := c.twin
        end

    execute
        do
            figure.set_color (new_color)
        end

    undo
        do
            figure.set_color (old_color)
        end
end
```

## 복합 명령

### COMPOSITE_COMMAND

여러 명령을 하나로 묶기:

```eiffel
class COMPOSITE_COMMAND
inherit
    COMMAND

feature
    children: ARRAYED_LIST [COMMAND]

    make
        do
            create children.make (10)
        end

    add (cmd: COMMAND)
        do
            children.extend (cmd)
        end

    execute
        do
            across children as c loop
                c.item.execute
            end
        end

    undo
        -- 역순으로 되돌리기
        do
            across children.new_cursor.reversed as c loop
                c.item.undo
            end
        end
end
```

### 복합 명령 사용 예

```eiffel
-- "텍스트 교체" = 삭제 + 삽입
replace_text (doc: DOCUMENT; line_index: INTEGER; new_text: STRING)
    local
        composite: COMPOSITE_COMMAND
        delete_cmd: DELETION
        insert_cmd: INSERTION
    do
        create composite.make

        create delete_cmd.make (doc, line_index)
        composite.add (delete_cmd)

        create insert_cmd.make (doc, create {LINE}.make (new_text, line_index))
        composite.add (insert_cmd)

        execute_command (composite)
    end
```

## 명령의 상태 저장

### Memento 통합

명령이 복잡한 상태를 되돌려야 할 때:

```eiffel
class COMPLEX_EDIT
inherit
    COMMAND

feature
    target: DOCUMENT
    before_state: DOCUMENT_MEMENTO
    after_state: DOCUMENT_MEMENTO

    make (doc: DOCUMENT)
        do
            target := doc
            before_state := doc.create_memento
        end

    execute
        do
            -- 복잡한 편집 수행
            perform_complex_edit
            after_state := target.create_memento
        end

    undo
        do
            target.restore_from_memento (before_state)
        end

    redo
        do
            target.restore_from_memento (after_state)
        end
end
```

### 효율적인 상태 저장

```eiffel
class EFFICIENT_COMMAND
inherit
    COMMAND

feature
    -- 전체 상태 대신 변경 사항만 저장
    delta: CHANGE_RECORD

    execute
        do
            -- 변경 전 delta 기록
            delta := compute_changes
            apply_changes
        end

    undo
        do
            -- delta를 역으로 적용
            apply_inverse_changes (delta)
        end
end
```

## Undo의 제약과 정책

### Undo 깊이 제한

```eiffel
class BOUNDED_HISTORY
feature
    max_size: INTEGER = 100
    commands: BOUNDED_STACK [COMMAND]

    make
        do
            create commands.make (max_size)
        end

    record (cmd: COMMAND)
        do
            if commands.count >= max_size then
                commands.remove_bottom  -- 가장 오래된 것 제거
            end
            commands.put (cmd)
        end
end
```

### 선택적 Undo

일부 명령은 Undo 불가:

```eiffel
class SAVE_FILE
inherit
    COMMAND

feature
    is_undoable: BOOLEAN = False

    execute
        do
            -- 파일 저장
            file.save
        end

    undo
        do
            -- 아무것도 안 함 (또는 예외)
        end
end

class HISTORY_LIST
feature
    record (cmd: COMMAND)
        do
            if cmd.is_undoable then
                commands.put (cmd)
            end
            redo_stack.wipe_out
        end
end
```

### 분기 히스토리

문제: A 실행 → B 실행 → Undo B → C 실행. 이때 B는 어디로?

| 방식 | 동작 | 결과 |
|------|------|------|
| **선형 히스토리** | B는 버려짐 | A → C |
| **트리 히스토리** | B도 보존 | A 아래 B와 C 분기 |

## 계약과 Undo

### Command의 계약

```eiffel
deferred class COMMAND
feature
    execute
        require
            can_execute: is_executable
        deferred
        ensure
            recorded: -- 실행 후 히스토리에 기록됨
        end

    undo
        require
            was_executed: is_executed
        deferred
        ensure
            state_restored: -- 실행 전 상태로 복원
        end

    is_executable: BOOLEAN
        deferred
        end

    is_executed: BOOLEAN

invariant
    undo_redo_inverse: -- undo 후 redo하면 원래 상태
end
```

### 역원성 보장

| 속성 | 수학적 표현 |
|------|-----------|
| execute 후 undo | `undo(execute(state)) = state` |
| undo 후 redo | `redo(undo(execute(state))) = execute(state)` |

## 실제 구현 패턴

### 지연 실행

```eiffel
class DEFERRED_COMMAND
inherit
    COMMAND

feature
    is_ready: BOOLEAN

    prepare
        -- 실행 준비 (사용자 입력 등)
        do
            -- 필요한 정보 수집
            is_ready := True
        end

    execute
        require
            ready: is_ready
        do
            -- 실행
        end
end
```

### 명령 큐

```eiffel
class COMMAND_PROCESSOR
feature
    queue: LINKED_QUEUE [COMMAND]

    make
        do
            create queue.make
        end

    add (cmd: COMMAND)
        do
            queue.extend (cmd)
        end

    process_all
        do
            from
            until
                queue.is_empty
            loop
                execute_and_record (queue.item)
                queue.remove
            end
        end

    execute_and_record (cmd: COMMAND)
        do
            cmd.execute
            history.record (cmd)
        end
end
```

### 트랜잭션 명령

```eiffel
class TRANSACTION_COMMAND
inherit
    COMPOSITE_COMMAND
        redefine
            execute, undo
        end

feature
    execute
        local
            i: INTEGER
        do
            from
                i := 1
            until
                i > children.count
            loop
                children.i_th (i).execute
                i := i + 1
            end
        rescue
            -- 실패 시 롤백
            rollback (i - 1)
        end

    rollback (up_to: INTEGER)
        local
            j: INTEGER
        do
            from
                j := up_to
            until
                j < 1
            loop
                children.i_th (j).undo
                j := j - 1
            end
        end
end
```

## 다른 패턴과의 연결

| 패턴 조합 | 용도 |
|----------|------|
| **Command + Memento** | 복잡한 상태 복원에 유용 |
| **Command + Prototype** | 명령 복제로 템플릿 생성, 반복 작업 |
| **Command + Composite** | 복합 명령(매크로), 여러 명령을 하나로 |
| **Command + Factory** | 사용자 입력에서 명령 객체 생성 |

## 자주 하는 실수

Undo/Redo 구현에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **상태 저장 불완전** | undo 후 원래 상태 복원 실패 → 데이터 손상 | execute 전 필요한 모든 정보 저장. delta 또는 memento 활용 |
| **복합 명령 역순 누락** | 여러 명령 undo 시 순서 잘못 → 불일치 | COMPOSITE_COMMAND의 undo는 역순. `reversed` 반복 |
| **히스토리 제한 없음** | 무한 히스토리 → 메모리 폭발 | BOUNDED_HISTORY로 최대 크기 제한. 오래된 것 제거 |
| **Redo 스택 관리 실수** | 새 명령 실행 후 Redo 가능 → 일관성 깨짐 | record 시 redo_stack.wipe_out 필수 |
| **Undo 불가 명령 혼란** | 저장, 출력 등도 Undo 대상 → 기대 불일치 | is_undoable 플래그. Undo 불가 명령은 히스토리에 안 넣음 |
| **execute/undo 비대칭** | undo가 execute의 정확한 역이 아님 → 상태 드리프트 | 역원성 테스트. `undo(execute(s)) = s` 검증 |
| **명령 객체 재사용** | 같은 명령 객체를 여러 번 execute → 상태 꼬임 | 명령 객체는 일회용. 필요하면 복제(Prototype) |

## 정리

- **Command 패턴**: 동작을 객체로 캡슐화
- **execute/undo**: 실행과 되돌리기 쌍
- **HISTORY_LIST**: 명령 스택 관리
- **COMPOSITE_COMMAND**: 여러 명령을 하나로
- **역원성**: undo(execute) = 원래 상태
- **제약**: Undo 불가 명령, 깊이 제한

## 다음 장 예고

Chapter 22에서는 **클래스를 찾는 방법**을 다룬다. 명사 추출, 책임 주도 설계, 도메인 분석.

## 관련 항목

- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속
- [Ch 20: Design Pattern: Multi-Panel](/blog/programming/design/oosc/chapter20-design-pattern-multi-panel) — 상태 패턴
- [Ch 24: Using Inheritance Well](/blog/programming/design/oosc/chapter24-using-inheritance-well) — 상속의 올바른 사용
