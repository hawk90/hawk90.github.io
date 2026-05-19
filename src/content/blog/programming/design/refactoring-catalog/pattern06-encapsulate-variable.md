---
title: "Pattern 6: Encapsulate Variable"
date: 2026-05-02T06:00:00
description: "데이터를 함수 뒤로 숨겨 모든 접근에 hook을 걸 수 있게 한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 6
tags: [refactoring, encapsulation, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 데이터는 어디서나 직접 접근될 수 있어 변경이 가장 어렵다. 함수 뒤로 숨기면 모든 접근에 hook을 걸 수 있다.

## 동기 (Motivation)

리팩터링의 본질은 *프로그램을 한 형태에서 다른 형태로 안전하게 이동*하는 것이다. 그러나 데이터는 함수보다 *훨씬 더 변경하기 어렵다*. 함수는 캡슐화로 일부 호출만 골라 마이그레이션할 수 있지만, 데이터는 *모든 직접 접근*을 한꺼번에 추적해야 한다.

데이터에 함수 한 단계를 *덮어두면* 갑자기 모든 read/write가 한 곳을 거치게 되고, 그 한 곳에서 다음과 같은 일이 가능해진다.

1. **검증** — setter에서 invariant 보장
2. **로깅** — 누가 언제 무엇으로 바꿨는지 추적
3. **lazy 초기화** — getter에서 처음 호출 시 계산
4. **change notification** — observer/listener 호출
5. **형태 마이그레이션** — 내부 자료구조를 바꿔도 외부는 모름
6. **immutable 강제** — setter 제거 또는 throw

(이전 이름: Self-Encapsulate Field)

### 항상 캡슐화하면 되는가

아니다. *변경 횟수가 적고 접근자가 한 모듈 내*에 있는 데이터는 캡슐화 비용이 가치를 넘는다. 캡슐화 대상은 *광범위하게 쓰이는*, *공개* 또는 *전역* 데이터.

### 언제 적용하는가

- 전역 변수 또는 광범위 객체에 직접 접근하는 코드가 많다.
- 데이터의 *형태*가 바뀔 가능성이 있다 (필드 추가, 자료구조 변경, 외부 저장소로 이동).
- 읽기·쓰기에 *검증, 로깅, 캐시*를 끼우고 싶다.
- 데이터를 *immutable*로 만들고 싶다.
- 함수가 데이터를 직접 만지는 것이 *도메인 의미*와 어긋난다 (예: `customer.name = "..."` 대신 `customer.rename("...")`).

## 절차 (Mechanics)

1. **변수에 대한 encapsulation 함수**(getter, setter)를 만든다.
2. 정적 검사로 모든 직접 접근을 찾는다.
3. 각 직접 접근을 함수 호출로 바꾼다 — *한 곳씩* 테스트.
4. 변수의 *가시성을 제한*한다 (`private`, 모듈 내부).
5. 테스트.
6. 변수가 record 또는 collection이면 추가 캡슐화 — [Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record), [Encapsulate Collection](/blog/programming/design/refactoring-catalog/pattern13-encapsulate-collection).

마이그레이션 중 함수와 직접 접근이 *공존*해도 OK — 한 번에 다 바꾸지 말고 한 호출처씩.

## 예시 1 — 모듈 전역 데이터

```javascript
// Before
let defaultOwner = { firstName: "Martin", lastName: "Fowler" };

// 사용처들
spaceship.owner = defaultOwner;
defaultOwner = { firstName: "Rebecca", lastName: "Parsons" };
console.log(defaultOwner.firstName);
```

`defaultOwner`가 *어디서든* read/write된다. 형태를 바꾸려면 모든 사용처 추적.

```javascript
// After — getter/setter로 감쌈
let defaultOwnerData = { firstName: "Martin", lastName: "Fowler" };

export function defaultOwner()       { return defaultOwnerData; }
export function setDefaultOwner(arg) { defaultOwnerData = arg; }

// 사용처
spaceship.owner = defaultOwner();
setDefaultOwner({ firstName: "Rebecca", lastName: "Parsons" });
console.log(defaultOwner().firstName);
```

이제 *내부 자료* `defaultOwnerData`는 모듈 안에만 살고, 외부는 함수만 본다. 다음 변화가 자유롭다:

- 검증 추가: `setDefaultOwner(arg) { if (!arg.firstName) throw...; defaultOwnerData = arg; }`
- 복사본 반환: `defaultOwner() { return Object.freeze({...defaultOwnerData}); }`
- 외부 저장소로 이동: `defaultOwner() { return db.query("SELECT ..."); }`

호출자는 모른다.

## 예시 2 — 객체의 setter에 검증 추가

```javascript
// Before
class Person {
  constructor(name) { this._name = name; }
  get name()    { return this._name; }
  set name(arg) { this._name = arg; }
}

person.name = "";   // 빈 이름 허용!
```

캡슐화는 이미 돼 있다 — 그러나 그 *덮개를 활용*하지 않고 있다.

```javascript
// After
class Person {
  constructor(name) { this.name = name; }  // 생성자도 setter 통과
  get name() { return this._name; }
  set name(arg) {
    if (!arg || arg.trim().length === 0)
      throw new Error("Name cannot be empty");
    this._name = arg;
  }
}

new Person("");      // throws
person.name = "  ";  // throws
```

검증을 *한 곳*에 모았다. 이제 어디서 이름을 설정하든 invariant가 지켜진다.

## 예시 3 — Lazy initialization

```javascript
// Before — 생성자에서 무거운 계산
class Report {
  constructor(records) {
    this._records = records;
    this._summary = this._buildSummary(records);   // expensive
  }
  get summary() { return this._summary; }
}
```

`summary`를 안 쓰면 비용 낭비.

```javascript
// After — getter에서 lazy
class Report {
  constructor(records) {
    this._records = records;
    this._summary = null;
  }
  get summary() {
    if (this._summary === null) this._summary = this._buildSummary(this._records);
    return this._summary;
  }
}
```

외부 호출자는 *항상 `report.summary`*만 부르면 된다. 캡슐화가 *전환*을 가능하게 했다.

## 자주 보는 안티패턴

### 1. 캡슐화 후 *내부 mutable 객체* 그대로 반환
```javascript
get options() { return this._options; }
report.options.locale = "fr";   // 외부가 mutation!
```
getter가 *복사본* 또는 *immutable view*를 반환해야 진짜 캡슐화.

### 2. setter만 만들고 검증 안 함
캡슐화의 가치 절반이 *검증·hook*인데 setter가 그저 *대입*만 하면 의미가 없다. 그 경우 *public field*와 차이가 없다.

### 3. *모든* 필드를 캡슐화
1990년대 Java식 *getter/setter 천국*. 모든 필드를 외부에 노출하면 캡슐화 자체가 무의미. 캡슐화의 진짜 가치는 *접근 제어* — 어떤 필드는 외부가 *몰라야* 한다.

### 4. 객체 안에서도 getter/setter 사용 강요
원전 Self-Encapsulate Field의 *극단*. 자기 객체 안에서 자기 필드를 *직접 접근하는 것*도 setter를 거치라는 주장이 있다. 보통은 과잉.

### 5. Lazy를 thread-unsafe하게
`if (this._x === null) this._x = compute();`는 멀티스레드에서 race. JVM/Go/Rust 같은 환경에선 `synchronized`, `OnceCell`, atomic 활용.

### 6. 캡슐화 후 *데드 코드* 방치
직접 접근을 한 곳씩 바꿀 때 *모두* 옮겼는지 확인 안 하면 옛 경로가 남는다. 컴파일러·linter로 *가시성 제한 후 컴파일 통과*가 보장.

## Modern variants

### TypeScript / JavaScript

```typescript
class User {
  #name: string;                    // private field (truly hidden)
  constructor(name: string) { this.#name = this._validate(name); }
  get name() { return this.#name; }
  set name(arg: string) { this.#name = this._validate(arg); }
  private _validate(s: string) { /* ... */ return s; }
}
```

ES2022 `#` private field로 *진짜 캡슐화*. 외부에서 reflection도 못 본다.

### Python `@property`

```python
class User:
    def __init__(self, name): self._name = name
    @property
    def name(self): return self._name
    @name.setter
    def name(self, arg):
        if not arg: raise ValueError("empty")
        self._name = arg
```

Pythonic하게 attribute처럼 보이지만 method.

### Java records (Java 17+)
record는 *immutable* + 자동 getter. setter가 없으니 자연스러운 캡슐화.

```java
public record Point(double x, double y) {
    public Point {
        if (Double.isNaN(x) || Double.isNaN(y)) throw new IllegalArgumentException();
    }
}
```

### Rust — pub/private + impl
Rust는 *모듈 단위* 가시성. struct 필드를 `pub`로 안 두면 외부 접근 불가, impl method로만 노출.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Encapsulate Fields" |
| VS Code | TypeScript "Convert to getter/setter" |
| Eclipse | Source → Generate Getters and Setters |
| Rider | "Encapsulate field" |

자동 도구가 *모든 호출처*를 함수 호출로 바꿔준다. 수동은 누락 위험.

## 성능 고려

JIT 환경 (V8, HotSpot)에서 단순 getter/setter는 *인라인*되어 오버헤드 0. JNI native 환경에선 함수 호출 비용이 있지만 보통 무시 가능.

## 관련 패턴

- **전체 객체**: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- **컬렉션**: [Pattern 13: Encapsulate Collection](/blog/programming/design/refactoring-catalog/pattern13-encapsulate-collection)
- **변수 이름 변경**: [Pattern 7: Rename Variable](/blog/programming/design/refactoring-catalog/pattern07-rename-variable)
- **derived 필드 → query**: [Pattern 32: Replace Derived Variable with Query](/blog/programming/design/refactoring-catalog/pattern32-replace-derived-variable-with-query)
- **setter 제거 (immutable)**: [Pattern 47: Remove Setting Method](/blog/programming/design/refactoring-catalog/pattern47-remove-setting-method)
