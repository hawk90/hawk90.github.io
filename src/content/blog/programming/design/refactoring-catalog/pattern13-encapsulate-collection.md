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

다음 같은 코드는 위험하다.

```javascript
class Person {
  get courses() { return this._courses; }  // 내부 list 직접 반환
}

person.courses.push(newCourse);   // 외부가 마음대로 mutate
person.courses.length = 0;        // 더 위험
```

invariant(예: course 추가 시 학점 한도 검증)가 우회된다. *변경 통로*를 메서드로 단일화하면 모든 수정에 hook을 걸 수 있다.

## 절차 (Mechanics)

1. 아직 [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable) 안 됐다면 적용.
2. add/remove 메서드를 클래스에 추가.
3. 모든 외부 mutation을 add/remove 호출로 교체.
4. getter가 *복사본* 또는 *읽기 전용 view*를 반환하도록 변경.
5. 테스트.

## 예시 (Before → After)

```javascript
// Before
class Person {
  constructor(name) { this._name = name; this._courses = []; }
  get courses() { return this._courses; }
  set courses(arg) { this._courses = arg.slice(); }
}

const basicCourses = readBasicCourseNames(filename);
basicCourses.forEach(name => person.courses.push(new Course(name, false)));
```

```javascript
// After
class Person {
  constructor(name) { this._name = name; this._courses = []; }
  get courses()    { return this._courses.slice(); }    // 복사본
  addCourse(course) {
    if (this._courses.length >= 6) throw new Error("limit reached");
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

이제 학점 한도, 중복 방지, 로깅 같은 invariant가 한 곳에 모인다.

## 변형 — Immutable View 반환

```java
// Java
public List<Course> getCourses() {
    return Collections.unmodifiableList(this.courses);
}
```

```kotlin
// Kotlin
val courses: List<Course> get() = _courses.toList()
```

```python
# Python
@property
def courses(self) -> tuple[Course, ...]:
    return tuple(self._courses)
```

복사보다 효율적이지만 *깊은 mutation*은 여전히 방어 안 됨 (요소 자체가 mutable이면).

## 주의

- 깊은 mutation — collection element가 mutable 객체면 외부에서 element 내부를 바꿀 수 있음. element도 immutable로 또는 deep copy.
- 큰 collection 복사 비용 — 빈번 read면 view, 드문 mutation이면 copy.
- 외부가 *iteration 중 add*하면 ConcurrentModificationException. add는 *batch*로 또는 thread-safe collection.

## 관련 패턴

- 자매: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable), [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- Immutability: [Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
