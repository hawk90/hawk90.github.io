---
title: "Pattern 13: Encapsulate Collection"
date: 2026-06-01T13:00:00
description: "Collection을 method 뒤로 — 변경 통로를 단일화한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 13
tags: [refactoring, encapsulate-collection, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Collection을 *직접 노출*하면 외부가 자유롭게 mutate해 invariant가 깨진다. add/remove 메서드만 외부에 주고 collection 자체는 숨긴다.

## 동기 (Motivation)

다음 코드는 위험하다.

```javascript
class Person {
  get courses() { return this._courses; }  // 내부 list 직접 반환
}

person.courses.push(newCourse);   // 외부가 마음대로 mutate
person.courses.length = 0;        // 더 위험 — 전체 삭제
person.courses[0] = bogus;        // 또는 슬쩍 교체
```

invariant(예: course 추가 시 학점 한도 검증)가 *모든 우회 경로*에서 깨진다. *변경 통로*를 메서드로 단일화하면 모든 수정에 hook을 걸 수 있다.

### Encapsulate Variable과의 차이

[Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)은 *변수 자체*를 함수 뒤로. 그러나 collection은 *getter를 거쳐도* mutation이 가능하다 — `getCourses()`가 *내부 list*를 반환하면 외부가 그 list를 직접 변경.

따라서 collection 캡슐화는 *추가 단계*가 필요:

1. add/remove 메서드 제공
2. getter는 *복사본* 또는 *immutable view* 반환

### 언제 적용하는가

- 객체가 *collection 필드*를 가진다 (`List<Course>`, `Map<K,V>`).
- 외부가 그 collection을 직접 mutate하는 코드가 보인다.
- collection mutation에 *invariant* 또는 *부수효과* (notify, log, validation)가 필요하다.
- thread safety 또는 transactional 변경이 중요하다.

## 절차 (Mechanics)

1. 아직 [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable) 안 됐다면 적용.
2. **add/remove 메서드**를 클래스에 추가 (`addCourse`, `removeCourse`).
3. 모든 외부 mutation을 add/remove 호출로 교체 (한 곳씩).
4. getter가 *복사본* 또는 *읽기 전용 view*를 반환하도록 변경.
5. 컴파일·테스트.

## 예시 1 — 기본 패턴

```javascript
// Before
class Person {
  constructor(name) {
    this._name = name;
    this._courses = [];
  }
  get courses()  { return this._courses; }
  set courses(arg) { this._courses = arg.slice(); }
}

const basicCourses = readBasicCourseNames(filename);
basicCourses.forEach(name => person.courses.push(new Course(name, false)));
```

```javascript
// After
class Person {
  constructor(name) {
    this._name = name;
    this._courses = [];
  }

  get courses() { return this._courses.slice(); }   // 복사본

  addCourse(course) {
    if (this._courses.length >= 6) throw new Error("course limit reached");
    if (this._courses.includes(course)) throw new Error("duplicate");
    this._courses.push(course);
  }

  removeCourse(course, fnIfAbsent = () => { throw new Error("not found"); }) {
    const idx = this._courses.indexOf(course);
    if (idx === -1) fnIfAbsent();
    else this._courses.splice(idx, 1);
  }
}

basicCourses.forEach(name => person.addCourse(new Course(name, false)));
```

이제 학점 한도, 중복 방지가 *한 곳에 모임*. 모든 진입점이 같은 invariant.

## 예시 2 — Immutable view (효율적)

```java
// Java
public class Person {
    private final List<Course> courses = new ArrayList<>();

    public List<Course> getCourses() {
        return Collections.unmodifiableList(courses);   // 복사 X, view만
    }

    public void addCourse(Course c) {
        if (courses.size() >= 6) throw new IllegalStateException();
        courses.add(c);
    }
}
```

```kotlin
// Kotlin
class Person {
    private val _courses = mutableListOf<Course>()
    val courses: List<Course> get() = _courses        // 인터페이스가 readonly
    fun addCourse(c: Course) { _courses += c }
}
```

```python
# Python
class Person:
    def __init__(self):
        self._courses: list[Course] = []

    @property
    def courses(self) -> tuple[Course, ...]:
        return tuple(self._courses)                   # immutable tuple
```

복사보다 효율적이지만 *깊은 mutation*은 여전히 방어 안 됨 (요소가 mutable이면 요소 자체는 바꿀 수 있다).

## 예시 3 — Notification + transaction

```javascript
class Document {
  constructor() {
    this._sections = [];
    this._listeners = [];
  }

  addSection(section) {
    this._sections.push(section);
    this._notify({ type: "added", section });
  }

  removeSection(section) {
    const idx = this._sections.indexOf(section);
    if (idx === -1) return;
    this._sections.splice(idx, 1);
    this._notify({ type: "removed", section });
  }

  // batch — listener 한 번만 호출
  reorderSections(comparator) {
    this._sections.sort(comparator);
    this._notify({ type: "reordered" });
  }

  _notify(ev) { for (const l of this._listeners) l(ev); }
}
```

bare list로는 *변경 감지*가 불가능. 캡슐화로 *observable*이 자연스러워진다.

## 자주 보는 안티패턴

### 1. 깊은 mutation 방어 누락
```javascript
const courses = person.courses;   // 복사본
courses[0].grade = "X";           // element 자체 mutation
// person._courses[0].grade도 변경됨!
```
element가 mutable 객체면 *element도 immutable*로 또는 *deep copy*.

### 2. Iteration 중 mutation
```java
for (Course c : person.getCourses()) {
    if (c.isExpired()) person.removeCourse(c);   // ConcurrentModificationException
}
```
*복사본 iteration* 또는 *batch remove* 또는 thread-safe collection.

### 3. 큰 collection 매번 복사
10000개 element를 매 `getCourses()` 호출마다 복사 — *성능 폭발*. *immutable view* 사용.

### 4. *Lazy 누락*
```javascript
get courses() { return this._courses.map(c => c.clone()); }
```
collection 요소가 immutable이면 element 복사 불필요. 측정 후 결정.

### 5. add 메서드만 만들고 *remove 누락*
양방향 변경이 필요한데 *remove 안 만들면* 외부가 우회. 짝으로 함께.

### 6. Setter 그대로 둠
```javascript
set courses(arg) { this._courses = arg; }   // 외부가 전체 교체 가능!
```
setter 제거 또는 검증 추가.

## Modern variants

### Immutable.js / Immer (JS)

```javascript
import { List } from "immutable";

class Person {
  constructor() { this._courses = List(); }
  addCourse(c) { return new Person(this._courses.push(c)); }   // 새 인스턴스
  get courses() { return this._courses; }
}
```

*새 인스턴스 반환*으로 share-state 문제 자체 제거.

### Java records + Collection
record는 *얕은 immutable*. Collection field는 별도 처리.

```java
public record Course(String name, int credits) {}

public record Curriculum(List<Course> courses) {
    public Curriculum {
        courses = List.copyOf(courses);   // immutable copy
    }
}
```

### Rust — ownership + `&mut`
Rust는 *컴파일러가 강제*. `&mut` borrow가 한 번만, 다른 reference와 동시 불가.

```rust
struct Person { courses: Vec<Course> }

impl Person {
    fn courses(&self) -> &[Course] { &self.courses }   // immutable borrow
    fn add_course(&mut self, c: Course) { self.courses.push(c); }
}
```

빌림 검사기가 *외부 mutation*을 컴파일 타임 차단.

### Read/Write 분리 인터페이스 (CQRS-lite)

```typescript
interface ReadOnlyCourses { courses(): readonly Course[]; }
interface MutableCourses extends ReadOnlyCourses {
  addCourse(c: Course): void;
  removeCourse(c: Course): void;
}

class Person implements MutableCourses { /* ... */ }
function display(p: ReadOnlyCourses) { /* 변경 못함, type 강제 */ }
```

## 도구 / IDE

수동. *Encapsulate Field*가 *collection*에는 부족.

## 성능 고려

- **복사본 반환**: O(n) 매 호출. 작은 collection이면 OK.
- **Immutable view**: O(1) 그러나 element 내부 mutation 방어 안 됨.
- **Persistent data structure** (Immutable.js, Clojure): O(log n) update, 구조적 공유로 효율.
- 측정 — 보통 가독성·안전성이 우선.

## 관련 패턴

- **자매**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable), [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- **Immutability 전환**: [Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
- **setter 제거**: [Pattern 47: Remove Setting Method](/blog/programming/design/refactoring-catalog/pattern47-remove-setting-method)
