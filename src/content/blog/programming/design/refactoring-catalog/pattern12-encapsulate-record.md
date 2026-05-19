---
title: "Pattern 12: Encapsulate Record"
date: 2026-05-02T12:00:00
description: "Record를 class로 감싸 접근을 통제하고 미래 변화에 대비한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 12
tags: [refactoring, encapsulate-record, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> bare record(`{}`, dict, struct)가 광범위하게 노출되면 *나중에 derived 필드를 추가*하거나 *rename*하기 어렵다. class wrapper로 감싸 미래에 대비한다.

## 동기 (Motivation)

JavaScript의 `{}`, Python의 `dict`, C의 struct처럼 *공개 필드*를 가진 record는 처음엔 편하지만 다음 두 가지가 어려워진다.

1. **derived 필드 추가** — `firstName, lastName`에서 `fullName`을 추가하려면 모든 setter를 hook해야 함. record는 hook 점이 없다.
2. **rename / 형태 변경** — 외부가 직접 필드를 알면 변경 시 모든 사용처를 추적해야 함.

class로 감싸면 getter/setter를 통해 이런 변경이 *한 곳*에서 가능하다. 추가로:

- **invariant 강제** — 두 필드의 관계가 유지되어야 한다면 setter에서 검증.
- **computed 필드** — `fullName`은 두 필드의 *조합*. record에선 stale될 수 있지만 getter면 *항상 최신*.
- **immutability** — setter 없는 record로 만들 수도, 또는 *새 인스턴스 반환*.

### Record vs Class — 결정 기준

| 측면 | Bare record / dict | Class |
| --- | --- | --- |
| 단순함 | 가장 단순 | 더 많은 코드 |
| 외부 노출 | 위험 | 캡슐화 |
| 형태 변화 비용 | 모든 사용처 | 한 곳 |
| 메서드 추가 | 불가 | 자연스럽다 |
| JSON 직렬화 | 직접 | toJSON 필요 |
| 임시 데이터 | 좋음 | 과잉 |
| 도메인 모델 | 약함 | 자연스러움 |

*임시 transit data*는 record로, *오래 사는 도메인 객체*는 class로.

### 언제 적용하는가

- record가 *여러 모듈*에서 직접 접근된다.
- 필드 *형태가 바뀔 가능성* (외부 저장소 이동, schema 변화).
- *derived 필드*를 추가하려는데 record로는 어색.
- *invariant 검증*이 필요한데 setter hook이 없다.

(이전 이름: 일부 케이스는 *Replace Record with Data Class*로 분류됐다)

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 12 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern12-encapsulate-record.svg)

## 절차 (Mechanics)

1. record를 가진 변수에 [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable) 적용.
2. record 자체를 단순 class로 변환 (getter/setter 추가).
3. 모든 *직접 필드 접근*을 메서드 호출로 교체.
4. 클래스 안에서 *원본 record와 사본* 처리를 결정 (mutation 의도면 그대로, immutable이면 깊은 복사 반환).
5. 테스트.

## 예시 1 — 단순 record → class

```javascript
// Before
const organization = { name: "Acme Gooseberries", country: "GB" };

// 사용처 (여러 모듈)
result += `<h1>${organization.name}</h1>`;
organization.name = newName;
sendEmail(organization.country, organization.name);
```

```javascript
// After
class Organization {
  constructor(data) {
    this._name    = data.name;
    this._country = data.country;
  }
  get name()        { return this._name; }
  set name(arg)     { this._name = arg; }
  get country()     { return this._country; }
  set country(arg)  { this._country = arg; }
}

// 사용처는 무변
result += `<h1>${organization.name}</h1>`;
organization.name = newName;
```

`organization.name` 같은 syntax는 그대로 — getter가 *property*처럼 보임. 이후 `name` setter에 검증·로깅·notification 끼울 수 있다.

## 예시 2 — Derived field 추가

```javascript
// After (Ch 1 위에)
class Organization {
  // ... 위의 것 ...
  get isLocal()    { return this._country === "GB"; }
  get displayName(){ return `${this._name} (${this._country})`; }
}
```

stale 위험 없이 *항상 최신* derived. 외부는 `org.displayName`만 본다.

## 예시 3 — Invariant 검증

```javascript
class DateRange {
  constructor(start, end) {
    if (end < start) throw new Error("end must be >= start");
    this._start = start;
    this._end   = end;
  }
  get start() { return this._start; }
  get end()   { return this._end; }
  // setter 제공 시 invariant 다시 검증
  set start(arg) {
    if (this._end < arg) throw new Error("invariant violated");
    this._start = arg;
  }
}
```

bare record로는 `range.start = newStart; range.end = oldEnd;`가 invariant를 깨도 모른다. class는 *모든 진입점에서 검증*.

## 자주 보는 안티패턴

### 1. Anemic class
```javascript
class Organization {
  constructor(d) { this._name = d.name; this._country = d.country; }
  get name()    { return this._name; }
  set name(x)   { this._name = x; }
  get country() { return this._country; }
  set country(x){ this._country = x; }
}
```
getter/setter만 있으면 *record + 보일러플레이트*. 도메인 메서드·검증이 추가될 *여지*가 있을 때만.

### 2. JSON 직렬화 망각
```javascript
JSON.stringify(org);   // _name, _country로 나옴 (`_` prefix 노출)
```
`toJSON()` 정의 또는 직렬화 layer.

```javascript
toJSON() { return { name: this._name, country: this._country }; }
```

### 3. 외부 mutable 객체 그대로 받음
```javascript
constructor(data) {
  this._items = data.items;   // 외부가 data.items 변경 시 영향
}
```
deep copy 또는 immutable 강제.

### 4. equals 누락
```javascript
new Organization({name: "A"}) === new Organization({name: "A"});  // false
```
record는 *값 동등* 직관 — class는 reference 동등이 기본. `equals` 명시 필요 (Java records, Kotlin data class는 자동).

### 5. 모든 record를 class로
*수명이 짧은 transit data* (API 응답, 임시 dict)까지 class로 만들면 *불필요한 인프라*. record 그대로 두는 게 낫다.

## Modern variants

### Java records (Java 17+)

```java
public record Organization(String name, String country) {
    public Organization {
        if (name == null) throw new IllegalArgumentException();
    }
    public boolean isLocal() { return "GB".equals(country); }
}
```

자동 immutable, equals/hashCode/toString. 캡슐화 + record 단순성 동시.

### Kotlin data class

```kotlin
data class Organization(val name: String, val country: String) {
    val isLocal: Boolean get() = country == "GB"
    init { require(name.isNotBlank()) }
}
```

### TypeScript class (vs interface)
*구조 정의*만이면 interface, *메서드 + 검증*이면 class.

```typescript
class Organization {
  constructor(
    private _name: string,
    private _country: string,
  ) {
    if (!_name) throw new Error("name required");
  }
  get name() { return this._name; }
  get isLocal() { return this._country === "GB"; }
}
```

### Python dataclass + property

```python
@dataclass(frozen=True)
class Organization:
    name: str
    country: str

    @property
    def is_local(self) -> bool:
        return self.country == "GB"
```

### Rust struct
공개 필드 vs `pub` getter 선택. private + impl 패턴이 캡슐화.

```rust
pub struct Organization { name: String, country: String }

impl Organization {
    pub fn name(&self) -> &str { &self.name }
    pub fn is_local(&self) -> bool { self.country == "GB" }
}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Convert anonymous to class" |
| Rider | 수동 |
| VS Code | TypeScript에서 일부 자동화 |

대부분 수동 +  [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable) 기반.

## 성능 고려

JIT 환경(V8, HotSpot)에서 단순 getter/setter는 인라인. 오버헤드 0. record 자체가 *struct of arrays*로 최적화될 수 있는 환경(Java Valhalla, Rust)에선 더 효율.

## 관련 패턴

- **자매**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
- **컬렉션**: [Pattern 13: Encapsulate Collection](/blog/programming/design/refactoring-catalog/pattern13-encapsulate-collection)
- **단일 필드 승격**: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
- **메서드 흡수**: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
- **value object**: [Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
