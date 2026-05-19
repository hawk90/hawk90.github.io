---
title: "Pattern 31: Rename Field"
date: 2026-05-02T07:00:00
description: "Field 이름을 더 정확하게 — 데이터 의미를 코드에 새긴다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 31
tags: [refactoring, rename-field, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> *Rename Variable*의 데이터 구조 버전. record/class field의 이름이 도메인을 잘못 표현하면, *읽는 모두*가 매번 추측해야 한다.

## 동기 (Motivation)

데이터 구조의 field 이름은 *해당 데이터의 정체성*이다. 함수의 이름보다 훨씬 더 자주 읽힌다 — 한 record가 수십 곳에서 접근되고, 그때마다 독자는 이름만 보고 의미를 추론한다. 이름이 모호하면 그 추론이 *틀린 채로 코드가 작성*된다.

이름을 바꿔야 할 신호.

- 약자 (`cust`, `nm`, `addr`, `dt`).
- 도메인이 변했다 (`status`가 *결제 상태*에서 *주문 상태*로 의미가 옮겨감).
- 단위가 숨어 있다 (`time` → `timeInSeconds`).
- 타입이 바뀌었다 (`active: boolean` → `active: ActivityLevel`이면 `isActive`가 잘못된 이름).
- 영어/한국어 혼용, 또는 약속된 명명 규칙 위반.

이름 변경의 *어려움*은 보통 *외부 노출* 정도에 비례한다. 클래스 내부 private field는 IDE 한 번이면 끝나지만, public field나 JSON serialization 키는 *데이터 마이그레이션*까지 동반한다.

### 신호 — 이름이 잘못됨

- 코드 리뷰에서 *이 필드 뭐예요?* 질문이 반복.
- 새 멤버가 *처음 보면 오해*함.
- field 사용 코드 중 *주석으로 의미 보충*이 많음.
- 같은 의미를 *다른 이름*으로 부르는 곳이 공존 (`userId` vs `accountId`).

### 언제 적용하는가

- 약자·모호한 이름이 *팀 공통의 이해* 부재.
- 도메인 모델 정리 후 *Ubiquitous Language*와 어긋남.
- 단위·타입이 *코드를 읽어야 알 수 있는* 상태.
- DB column이나 API 응답까지 *함께 마이그레이션 가능*한 상황.

## 절차 (Mechanics)

캡슐화 여부에 따라 두 갈래.

### A. 캡슐화되어 있다 (encapsulated)

field가 *getter/setter*로만 접근된다면.

1. **getter/setter 이름**을 IDE *Rename Symbol*로 변경 (`getName` → `getCustomerName`).
2. 내부 backing field도 함께 변경.
3. 컴파일·테스트.

이게 가장 간단한 케이스. *항상 getter/setter로 감싸 두는 이유*가 여기 있다.

### B. 캡슐화되어 있지 않다 (public field/record 키)

1. **외부 노출 작으면** — IDE Rename으로 모든 호출처 일괄.
2. **외부 노출 크면** ([Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)) 먼저 → A로 진행.
3. **DB/serialization 영향**: schema migration script, API 버전 정책, JSON 양쪽 키 동시 지원 후 점진적 제거.
4. 컴파일·테스트.

## 예시 1 — Class field 단순 rename

```javascript
// Before
class Organization {
  constructor(data) {
    this._name = data.name;
    this._country = data.country;
  }
  get name() { return this._name; }
  set name(arg) { this._name = arg; }
}
```

`name`이 모호 — *법인명*인지 *브랜드명*인지. domain이 분리되면서 `legalName`이 정확해졌다.

```javascript
// After
class Organization {
  constructor(data) {
    this._legalName = data.legalName ?? data.name;   // 점진적: 양쪽 키 허용
    this._country = data.country;
  }
  get legalName() { return this._legalName; }
  set legalName(arg) { this._legalName = arg; }
}
```

호출처를 모두 `legalName`으로 옮긴 뒤 `data.name` 호환 제거.

## 예시 2 — Record를 캡슐화 후 rename

```javascript
// Before — raw record
const organization = { name: "Acme Gooseberries", country: "GB" };
const orgs = loadOrgs();   // [{ name, country }, ...]
orgs.forEach(o => console.log(o.name));
```

raw record 직접 접근. 호출처가 많아 *직접 rename은 위험*.

```javascript
// After — 1단계: Encapsulate Record
class Organization {
  constructor(data) {
    this._name = data.name;
    this._country = data.country;
  }
  get name() { return this._name; }
  set name(arg) { this._name = arg; }
  get country() { return this._country; }
  set country(arg) { this._country = arg; }
}

// 호출처
const organization = new Organization({ name: "Acme", country: "GB" });
orgs.map(o => new Organization(o)).forEach(o => console.log(o.name));
```

```javascript
// After — 2단계: getter 이름 변경
class Organization {
  constructor(data) {
    this._title = data.title ?? data.name;   // 점진적 호환
  }
  get title() { return this._title; }
  set title(arg) { this._title = arg; }
}

// 호출처
orgs.forEach(o => console.log(o.title));
```

캡슐화가 이름 변경의 *블라스트 반경*을 줄였다.

## 예시 3 — DB column rename

field가 DB column과 1:1 매핑이면 schema 마이그레이션 동반.

```sql
-- Before
ALTER TABLE customers RENAME COLUMN nm TO name;
```

단순 rename은 *모든 deploy 인스턴스가 동시에 변경*되어야 안전. 점진적 마이그레이션:

```sql
-- Step 1: 새 column 추가 + trigger로 동기화
ALTER TABLE customers ADD COLUMN name VARCHAR(255);
UPDATE customers SET name = nm;
CREATE TRIGGER sync_nm_name BEFORE UPDATE ON customers
  FOR EACH ROW SET NEW.name = NEW.nm;

-- Step 2: 앱 코드가 name 사용으로 전환

-- Step 3: trigger 제거 + nm column 제거
DROP TRIGGER sync_nm_name;
ALTER TABLE customers DROP COLUMN nm;
```

3단계 deploy. *expand → migrate → contract* 패턴.

## 자주 보는 안티패턴

### 1. *Public field*를 IDE rename만 믿고 한 번에
외부 라이브러리/API 소비자가 *컴파일 안 됨*. 캡슐화 먼저.

### 2. JSON 키 *함께 바꾸지 않음*
class field만 바꾸면 *deserialize 실패*. 양쪽 키 한동안 호환.

### 3. *기존 이름 alias 영원히 유지*
"호환성 보존"으로 alias가 평생 남으면 *결국 둘 다 코드에 등장* — 새 사람이 어느 게 정답인지 모름. 마이그레이션 *끝낸다*는 deadline 설정.

### 4. DB column rename을 *single deploy*로
zero-downtime이 깨짐. expand → migrate → contract 3단계.

### 5. Reflection·string 기반 접근 *놓침*
`obj[fieldName]`, ORM mapping, serialization annotation은 IDE rename이 못 잡는다. grep 보조.

### 6. *논리적 의미*만 바꾸고 이름 안 바꿈
`status` 의미가 바뀌면 *이름도 함께* 바꿔야 옛 멘탈 모델이 사라진다.

## Modern variants

### TypeScript — Mapped type alias 호환

```typescript
type OldOrg = { name: string; country: string };
type NewOrg = { legalName: string; country: string };

function migrate(old: OldOrg): NewOrg {
  return { legalName: old.name, country: old.country };
}
```

타입으로 의도 명시.

### Java — `@JsonAlias`

```java
class Organization {
  @JsonAlias({"name", "legalName"})   // 양쪽 키 입력 허용
  @JsonProperty("legalName")          // 출력은 새 이름만
  private String legalName;
}
```

API 점진적 마이그레이션.

### Kotlin — data class `copy`

```kotlin
val v1 = Organization(name = "Acme")
val v2 = v1.copy(legalName = v1.name)
```

새 필드를 추가하고 점진적 마이그레이션.

### Rust — `#[serde(rename = "...")]`

```rust
#[derive(Serialize, Deserialize)]
struct Organization {
    #[serde(rename = "name", alias = "legalName")]
    legal_name: String,
}
```

JSON 호환 + Rust 내부는 새 이름.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ / WebStorm | Shift+F6 (Rename) — class field 안전 |
| VS Code (TypeScript) | F2 (Rename Symbol) |
| Rider (C#) | F2 |
| Rust Analyzer | Rename (F2) |
| `jq` / `sed` | JSON 파일 기존 키 일괄 변경 |

자동 도구는 *reflection·string 접근* 못 잡음. grep 보완 필수.

## 성능 고려

이름 변경 자체는 *컴파일 시간에 완전 사라짐*. 런타임 영향 0.

DB rename은 *대형 테이블에서 lock* 발생할 수 있음 — expand/contract로 분산.

## 관련 패턴

- **변수 버전**: [Pattern 7: Rename Variable](/blog/programming/design/refactoring-catalog/pattern07-rename-variable)
- **준비**: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- **함수 버전**: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)
