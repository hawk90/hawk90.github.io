---
title: "Pattern 49: Replace Function with Command"
date: 2026-06-03T01:00:00
description: "복잡한 함수를 객체로 — 분해·상태 보유·undo 가능."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 49
tags: [refactoring, command-object, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수가 *너무 길고 내부 상태가 많고 단계별 분해가 필요*하면, 함수를 *객체로 승격*해 분해 도구를 얻는다.

## 동기 (Motivation)

함수는 *최고의 추상화 단위*다. 그러나 한 함수가 *50줄+이고 local variable이 많고 단계별 helper로 분해하고 싶을 때*, 함수 안에서의 분해는 한계가 있다.

- helper 함수마다 *local variable 5-10개* 전달.
- 함수 본문이 nested로 깊어짐.
- 중간 결과 *재사용* 어려움.
- *undo/redo*가 필요한데 함수는 일회성.

함수를 *Command 객체*로 만들면:

- local variable이 *field*가 됨 — 모든 helper가 자유롭게 접근.
- 각 단계를 *private method*로 분해.
- 객체에 *상태 보유* — partial result, progress.
- *undo*는 별도 method (`execute` ↔ `undo`).

```javascript
// Before — long function
function calculateScore(candidate, medicalExam, scoringGuide) {
  let result = 0;
  let healthLevel = 0;
  let highMedicalRiskFlag = false;

  if (medicalExam.isSmoker) {
    healthLevel += 10;
    highMedicalRiskFlag = true;
  }

  let certificationGrade = "regular";
  if (scoringGuide.stateWithLowCertification(candidate.originState)) {
    certificationGrade = "low";
    result -= 5;
  }

  // ... more logic ...
  result -= Math.max(healthLevel - 5, 0);
  return result;
}
```

40줄 함수. local variable 셋 (`result`, `healthLevel`, `highMedicalRiskFlag`)이 *함수 곳곳에서 mutate*. 분해 어려움.

```javascript
// After — command object
class Scorer {
  constructor(candidate, medicalExam, scoringGuide) {
    this._candidate = candidate;
    this._medicalExam = medicalExam;
    this._scoringGuide = scoringGuide;
  }

  execute() {
    this._result = 0;
    this._healthLevel = 0;
    this._highMedicalRiskFlag = false;

    this._scoreSmoking();
    this._scoreCertification();
    this._scoreHealth();

    return this._result;
  }

  _scoreSmoking() {
    if (this._medicalExam.isSmoker) {
      this._healthLevel += 10;
      this._highMedicalRiskFlag = true;
    }
  }

  _scoreCertification() {
    let grade = "regular";
    if (this._scoringGuide.stateWithLowCertification(this._candidate.originState)) {
      grade = "low";
      this._result -= 5;
    }
  }

  _scoreHealth() {
    this._result -= Math.max(this._healthLevel - 5, 0);
  }
}

function calculateScore(candidate, medicalExam, scoringGuide) {
  return new Scorer(candidate, medicalExam, scoringGuide).execute();
}
```

각 단계가 *명명된 method*. local variable이 *field*로 — helper가 자유 접근. 새 단계 추가가 *method 추가*.

### 신호

- 함수가 *50줄+*.
- local variable이 *5개+*이고 함수 전체에서 *mutate*.
- 분해 시도 시 *helper에 parameter 폭증*.
- *undo*, *progress*, *queue*가 필요.

### 언제 적용하는가

- *복잡한 알고리즘* — 단계별 분해 절실.
- *undo/redo* 필요 (textEditor, design tool).
- *Command queue* — 명령을 *모아 실행*.
- *transaction-like* 의미 — *부분 commit*, *retry*.

### 언제 적용하지 않는가

- 함수가 *짧고 단순* — class overhead 과잉.
- *상태 없음* — pure function이 더 단순.

## 절차 (Mechanics)

1. **빈 class** 작성 — 함수 이름의 noun 버전 (`calculateScore` → `Scorer`).
2. **함수 본문**을 class method (`execute`)로 이동.
3. **매개변수**를 *constructor*로.
4. **local variable**을 *field*로.
5. **단계별로 private method 추출**.
6. 원본 함수는 *간단 wrapper*로.
7. 컴파일·테스트.

## 예시 1 — 위 Scorer 예 참고.

## 예시 2 — Undo 추가

```javascript
class TextEditCommand {
  constructor(document, position, text) {
    this._document = document;
    this._position = position;
    this._text = text;
    this._previousText = null;
  }

  execute() {
    this._previousText = this._document.getText(this._position, this._text.length);
    this._document.insert(this._position, this._text);
  }

  undo() {
    this._document.delete(this._position, this._text.length);
    this._document.insert(this._position, this._previousText);
  }
}

// 사용
const cmd = new TextEditCommand(doc, 10, "hello");
cmd.execute();
// ...
cmd.undo();
```

state(`_previousText`)를 객체가 *보유* — undo 가능. *Memento*와 결합 자연.

## 예시 3 — Command queue

```javascript
class CommandQueue {
  constructor() { this._queue = []; }
  enqueue(cmd) { this._queue.push(cmd); }
  executeAll() { this._queue.forEach(cmd => cmd.execute()); }
  rollback() { this._queue.reverse().forEach(cmd => cmd.undo()); }
}

const queue = new CommandQueue();
queue.enqueue(new TextEditCommand(doc, 10, "hello"));
queue.enqueue(new TextEditCommand(doc, 20, "world"));
queue.executeAll();
queue.rollback();   // 모두 undo
```

Command 객체를 *first-class*로 다룬다 — *시간 분리* (저장 + 나중 실행).

## 자주 보는 안티패턴

### 1. *모든 함수를 Command로*
짧은 함수까지 class화 → *boilerplate 폭증*. 진짜 복잡한 함수만.

### 2. *Command가 너무 많은 책임*
한 command가 *여러 알고리즘*. 분리.

### 3. *Undo 일관성 결여*
`execute`로 상태 변경했는데 `undo`가 *완전 역연산이 아님* — 부분 복원. 검증 필수.

### 4. *Field가 사실상 매개변수*
command 객체가 *상태 없는 wrapper*면 그냥 함수. command 진가는 *state 보유*.

### 5. *Execute 외 호출자에게 노출*
`_scoreSmoking()` 같은 private을 caller가 호출 → 캡슐화 위반.

### 6. *Concurrency 무시*
같은 command 객체를 *여러 thread*에서 `execute()` → race. *immutable 또는 thread-local*.

## Modern variants

### GoF Command 패턴

```
Command interface { execute(); undo(); }
ConcreteCommand1, ConcreteCommand2, ...
Invoker { commands[]; executeAll(); }
```

전통적 OOP 표현. *undo + queue + logging*에 자연.

### Functional command — closure

```javascript
function makeEditCommand(doc, pos, text) {
  let prevText;
  return {
    execute() { prevText = doc.getText(pos, text.length); doc.insert(pos, text); },
    undo() { doc.delete(pos, text.length); doc.insert(pos, prevText); }
  };
}
```

*closure로 state 보유* — class 없이도 같은 효과.

### Redux action + reducer

```javascript
// Action = command
{ type: "INSERT_TEXT", payload: { pos, text } }
// Reducer
function reducer(state, action) {
  switch (action.type) {
    case "INSERT_TEXT": return { ...state, text: insert(state.text, action.payload) };
    case "UNDO": return { ...state, text: state.history[state.history.length - 1] };
  }
}
```

*역사 보존 + replay*. immutability와 결합 강력.

### Event sourcing

```
Events log: [ Created, Modified, Modified, Cancelled ]
state = events.reduce(apply, initialState)
```

state를 *event command의 누적*으로 표현 — 모든 변경이 *first-class*.

### CQRS

Command vs Query separation을 *시스템 차원*으로 확장.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Extract Method" 반복 + 수동 class 만들기 |
| Rider | 같음 |
| Redux toolkit | action + reducer boilerplate 감소 |

## 성능 고려

객체 생성 overhead — 작은 함수는 불필요. *대형 알고리즘*에서는 *분해 가치*가 cost 압도.

*Command queue*는 *지연 실행* — latency 트레이드오프.

## 관련 패턴

- **역방향**: [Pattern 50: Replace Command with Function](/blog/programming/design/refactoring-catalog/pattern50-replace-command-with-function)
- **GoF**: Command, Memento (undo), Strategy
- **자매**: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
