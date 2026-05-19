---
title: "Pattern 61: Replace Superclass with Delegate"
date: 2026-05-02T13:00:00
description: "Inheritance가 안 맞으면 — Superclass도 delegate로. 카탈로그 마무리."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 61
tags: [refactoring, delegation, composition, superclass, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Superclass가 *부분만 필요*하거나 *is-a 관계가 어색*하면, 상속 대신 *field로 보유*하고 필요한 method만 forward. *Catalog의 마무리* — "composition over inheritance"의 결정판.

## 동기 (Motivation)

[Replace Subclass with Delegate](/blog/programming/design/refactoring-catalog/pattern60-replace-subclass-with-delegate)가 *아래쪽 변형*이라면, 이는 *위쪽 변형*. 한 class가 *superclass의 일부 기능만 활용*하면 상속은 *과한 결합*.

가장 유명한 예: **Stack extends Vector** (Java 초기).

```java
// Java legacy
public class Stack<E> extends Vector<E> {
    public E push(E item) { addElement(item); return item; }
    public E pop() { return removeElementAt(size() - 1); }
    public E peek() { return elementAt(size() - 1); }
}
```

Stack이 Vector를 *상속*함으로써 `add(0, x)`, `set(i, x)` 같은 *Vector method 전부 노출*. 그런데 Stack 의미상 *LIFO만 허용*되어야 함 — 사용자가 `stack.add(0, x)` 호출하면 *invariant 위반*.

```java
// Better — composition
public class Stack<E> {
    private Vector<E> storage = new Vector<>();
    public E push(E item) { storage.addElement(item); return item; }
    public E pop() { return storage.removeElementAt(storage.size() - 1); }
    public E peek() { return storage.elementAt(storage.size() - 1); }
}
```

Stack이 *Vector를 포함*. *원하는 method만 노출*. Vector의 *부적절한 method가 외부에 안 보임*. 진정한 *캡슐화*.

### 상속이 어색한 신호

- subclass가 superclass의 *대부분 method를 안 씀*.
- subclass가 superclass의 *일부 method가 자기 의미와 안 맞음* (Liskov 위반).
- *is-a* 관계가 *부자연* ("Stack is a Vector"는 어색).

### 신호

- subclass가 *Liskov 위반*.
- superclass method가 *대부분 사용 안 됨*.
- *부분만 필요한* superclass.
- "이 superclass의 method 일부만 노출하고 싶다".

### 언제 적용하는가

- *상속 관계가 잘못된 모델링*.
- *부분 인터페이스만* 노출하고 싶음.
- *상속의 강한 결합* 부담.

### 언제 적용하지 않는가

- 진짜 *is-a*가 명확하고 *전체 superclass interface 활용*.
- *다형성*이 강력히 필요한 경우 — interface로 우회 가능하면 그쪽.

## 절차 (Mechanics)

1. *target class에 superclass field* 추가.
2. *모든 super.X() 호출*을 `this._delegate.X()`로 변경.
3. *각 inherited method를 `forward` method로* 명시.
4. `extends` 제거.
5. 컴파일·테스트.

## 예시 1 — 위 Stack 예 참고.

## 예시 2 — Scroll → ScrollList composition

```javascript
// Before
class CategoryItem {
  constructor(title) { this._title = title; }
  get title() { return this._title; }
}

class Scroll extends CategoryItem {
  constructor(title, dateLastCleaned) {
    super(title);
    this._lastCleaned = dateLastCleaned;
  }
  needsCleaning(targetDate) {
    const threshold = this.title.toLowerCase().includes("manuscript") ? 700 : 1500;
    return this.daysSinceLastCleaning(targetDate) > threshold;
  }
  daysSinceLastCleaning(targetDate) { /* */ }
}
```

Scroll은 *CategoryItem의 title은 사용*하지만 *일부 method는 unused*. 게다가 *cleaning은 다른 관심사*.

```javascript
// After
class Scroll {
  constructor(title, dateLastCleaned) {
    this._categoryItem = new CategoryItem(title);   // delegate
    this._lastCleaned = dateLastCleaned;
  }
  get title() { return this._categoryItem.title; }   // forward
  needsCleaning(targetDate) {
    const threshold = this.title.toLowerCase().includes("manuscript") ? 700 : 1500;
    return this.daysSinceLastCleaning(targetDate) > threshold;
  }
  daysSinceLastCleaning(targetDate) { /* */ }
}
```

Scroll이 *CategoryItem이 아닌* — *CategoryItem을 사용*. 진짜 의미 표현.

## 예시 3 — 다중 superclass 시뮬레이션

```javascript
// 단일 상속 언어에서 여러 capability 필요 시
class Person {
  constructor(name) {
    this._timer = new TimedBehavior();   // delegate 1
    this._auditor = new AuditingBehavior();   // delegate 2
    this._name = name;
  }
  start() { this._timer.start(); this._auditor.log("started"); }
  stop() { this._timer.stop(); this._auditor.log("stopped"); }
}
```

여러 행동을 *조합*. 단일 상속 한계 회피.

## 자주 보는 안티패턴

### 1. *모든 method forward*
delegate의 *전체 interface forward*면 *그냥 상속이 더 단순*. 부분만 forward하는 경우만.

### 2. *Polymorphism 잃음*
caller가 *Scroll을 CategoryItem polymorphic*하게 다뤘다면 — interface 명시 필요.

### 3. *Delegate 노출*
`scroll.categoryItem.title` — 외부가 delegate 직접 접근. *forward method*로만.

### 4. *Forward 잊음*
새 method 추가 시 *forward 누락*. *interface 강제*.

### 5. *Lifecycle 문제*
delegate가 *언제 생성/소멸*? `target = null`일 때 delegate도? 책임 명확화.

### 6. *Test 부담*
delegate mock 필요. DI 활용.

## Modern variants

### Interface + composition

```typescript
interface Titled { title: string; }

class Scroll implements Titled {
  constructor(public title: string, private lastCleaned: Date) {}
}
```

*interface로 capability 표현*, *composition으로 구현*.

### Rust — newtype + Deref

```rust
struct Stack<T>(Vec<T>);

impl<T> Stack<T> {
    fn push(&mut self, x: T) { self.0.push(x); }
    fn pop(&mut self) -> Option<T> { self.0.pop(); }
    // Vec의 나머지 method 노출 안 함
}
```

Rust는 *상속 없음* — 자연스러운 composition.

### Kotlin delegation

```kotlin
class Stack<E>(private val storage: MutableList<E> = mutableListOf()) {
    fun push(item: E) { storage.add(item) }
    fun pop(): E = storage.removeAt(storage.size - 1)
}

// 또는 by 키워드로 자동 forward
class Scroll(private val item: CategoryItem) : Titled by item
```

`by` 키워드 — 자동 delegation.

### TypeScript mixin

```typescript
type Constructor<T = {}> = new (...args: any[]) => T;

function Timed<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    start() { /* */ }
    stop() { /* */ }
  };
}

class Person extends Timed(class {}) { /* */ }
```

mixin으로 *부분 inheritance*.

## Catalog 마무리

이 패턴이 Fowler의 *Refactoring (2nd ed) 마지막 항목*. 카탈로그 전체의 본질:

> 코드를 *동작 변경 없이 구조 개선*. 작은 단계의 안전한 변환을 *반복*해 *복잡함을 길들임*.

61개 패턴을 *모두 외울 필요는 없다*. *문제 → 패턴 매칭* 능력이 자라며, 코드를 보면 *"여기는 Extract Function"* 같은 *반사적 인식*이 가능해진다.

다음 시리즈에서는 **TDD Patterns (Kent Beck)** — *테스트 우선* 관점에서의 패턴.

## 관련 패턴

- **자매**: [Pattern 60: Replace Subclass with Delegate](/blog/programming/design/refactoring-catalog/pattern60-replace-subclass-with-delegate)
- **격언**: "Favor composition over inheritance" (GoF)
- **다음 시리즈**: TDD Patterns (Beck)
- **유명한 사례**: Java `Stack extends Vector` (legacy 실수)
