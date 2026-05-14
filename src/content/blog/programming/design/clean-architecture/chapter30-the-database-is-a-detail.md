---
title: "Ch 30: 데이터베이스는 세부 사항이다"
date: 2025-06-02T06:00:00
description: "데이터베이스는 비즈니스 규칙의 일부가 아니다. 단지 데이터를 보관하는 메커니즘일 뿐 — 그게 MySQL이든 Mongo든 파일이든."
tags: [Architecture, Database, Detail]
series: "Clean Architecture"
seriesOrder: 30
draft: true
---

## 이 챕터의 메시지

Martin이 책에서 가장 자주, 가장 강하게 반복하는 주장 중 하나.

> **데이터베이스는 세부 사항이다.**

이 메시지가 충격적인 이유는 — 대부분의 시스템에서 DB가 중심처럼 다뤄지기 때문이다. ERD를 먼저 그리고, DB 스키마를 정하고, 그 위에 코드를 쌓는다.

Martin의 입장은 정반대다 — **DB는 마지막에 결정한다**. 그것도 가능하면 결정 안 한다.

## 데이터 vs 데이터베이스

핵심은 두 개념의 분리다.

- **데이터(data)** — 비즈니스에 본질적. 고객 정보, 주문, 거래 내역. 이건 시스템의 일부.
- **데이터베이스(database)** — 그 데이터를 **저장하는 메커니즘**. 디테일.

비즈니스에는 데이터가 본질적이다. 그러나 그 데이터가 **어디에 어떻게 저장되는가**는 본질이 아니다.

```
데이터: "고객 이름 = '홍길동'"        ← 본질
저장 방법: MySQL table에 row로 저장   ← 디테일
```

다른 저장 방법을 골라도 데이터는 같다.

## 관계형 모델은 왜 표준이 되었나

Edgar Codd가 1970년대에 관계형 모델을 발명했다. 당시는 디스크 시대 — 데이터를 디스크에 저장해야 했고, 디스크 접근은 매우 느렸다.

관계형 모델은 다음을 가능하게 했다.

- 디스크 효율적 저장 (정규화)
- SQL로 빠른 쿼리
- 트랜잭션
- ACID

당시의 하드웨어 제약을 만족시키는 데 최적이었다. 그래서 표준이 됐다.

문제는 — **그 하드웨어 제약이 더 이상 같지 않다**는 것이다.

## 디스크의 종말

현대 하드웨어는 1970년대와 다르다.

- **SSD** — 디스크 접근 비용 100배 이상 감소
- **메모리** — TB 단위 RAM이 가능
- **분산** — 디스크 풀이 거대해짐
- **클라우드** — 저장이 거의 무한

이런 환경에서는 관계형 모델의 디스크 효율성이 덜 중요해진다. 다른 트레이드오프가 매력적이 된다.

- **NoSQL** — 스키마 유연성
- **인메모리** — 속도
- **분산** — 확장성
- **이벤트 소싱** — 감사 가능성

DB 선택은 **현대의 트레이드오프**에서 정해야 한다.

## DB 결정의 연기

17장에서 본 FitNesse 사례를 다시 떠올린다 — Martin은 DB 결정을 5년 연기했다. 그동안 인메모리 / 파일 / Git 등 다양한 저장소가 등장했고, 결국 DB가 필요하지 않게 됐다.

이게 좋은 아키텍처의 가능성이다. **DB가 정말 필요한지조차 미루어 결정**할 수 있다.

## Gateway로 격리

DB를 디테일로 다루려면 인터페이스로 격리한다.

```java
// 비즈니스 로직 측 (안쪽)
interface UserRepository {
  User findById(String id);
  void save(User u);
  List<User> findActive();
}

// 디테일 측 (바깥쪽)
class MySqlUserRepository implements UserRepository { ... }
class MongoUserRepository implements UserRepository { ... }
class InMemoryUserRepository implements UserRepository { ... }
```

비즈니스 로직은 `UserRepository`만 안다. 어떤 DB가 들어왔는지 모른다.

DB를 바꾸려면 새 Repository 구현 하나만 추가하면 된다. 비즈니스 로직은 안 바뀐다.

## ORM에 대한 입장

Martin은 ORM에 회의적이다.

> "ORMs aren't really 'object-relational mappers' because objects are not the same as data structures."

ORM은 보통 데이터베이스 row를 객체로 변환한다. 그러나 그 "객체"는 사실 **데이터 구조**다 — 필드와 게터/세터만 있는. 진짜 객체(행동 + 데이터)가 아니다.

이게 문제인 이유 — ORM이 비즈니스 객체에 ORM-specific annotation을 부여한다 (`@Entity`, `@Column`, ...). 그 결과 비즈니스 객체가 ORM에 의존한다. ORM이 디테일에서 정책으로 침투.

Martin의 권장 — ORM의 데이터 구조와 진짜 비즈니스 Entity를 **분리**한다.

```java
// ORM data structure (Adapter 층)
@Entity
class UserRecord {
  @Id String id;
  @Column String name;
  // ...
}

// Business Entity (Use Cases / Entities 층)
class User {
  String id;
  String name;
  
  public void activate() { /* 비즈니스 규칙 */ }
}

// Adapter가 매핑
class UserMapper {
  User toEntity(UserRecord r) { ... }
  UserRecord toRecord(User u) { ... }
}
```

비즈니스 Entity는 ORM annotation 없이 순수.

## 정리

- **데이터베이스는 세부 사항** — 비즈니스 본질이 아닌 저장 메커니즘
- 데이터(본질) vs 데이터베이스(디테일) 구분
- 관계형 모델은 디스크 시대의 트레이드오프 — 현대엔 다른 옵션 풍부
- **DB 결정은 가능한 한 연기**
- Repository / Gateway 인터페이스로 격리
- ORM data structure는 비즈니스 Entity와 **별도**로

## 다음 장 예고

다음 장은 "웹도 디테일이다". 마찬가지 메시지.

## 관련 항목

- [Ch 17: 경계](/blog/programming/design/clean-architecture/chapter17-boundaries-drawing-lines) — FitNesse 사례
- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture)
- [Ch 20: 비즈니스 규칙](/blog/programming/design/clean-architecture/chapter20-business-rules) — Entity의 본질
