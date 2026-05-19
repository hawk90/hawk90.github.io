---
title: "Ch 2: 데이터 모델과 질의 언어"
date: 2026-05-12T02:00:00
description: "데이터를 어떻게 표현할 것인가 — Relational, Document, Graph. 각 모델의 강점과 한계."
tags: [DDIA, DataModel, Relational, Document, Graph]
series: "Designing Data-Intensive Applications"
seriesOrder: 2
draft: true
---

## 이 챕터의 메시지

데이터 모델은 가장 중요한 디자인 결정 중 하나다. **데이터를 어떻게 생각할 것인가**가 결정된다.

Kleppmann의 핵심 통찰 — *데이터 모델은 추상화의 계층 구조*다.

```text
계층 4:  사용자가 보는 데이터 모델     (이력서, 친구 그래프, 채팅 ...)
계층 3:  애플리케이션 데이터 모델       (객체, 클래스, 도메인 모델)
계층 2:  데이터베이스 데이터 모델       (테이블 / 문서 / 그래프)
계층 1:  바이트 표현                    (디스크 / 메모리 / 네트워크)
```

각 계층이 *아래 계층을 추상화*한다. 그래서 한 계층의 결정이 다른 계층의 가능성을 제약한다. 데이터베이스 모델을 *어떻게* 고르느냐가 *애플리케이션 코드의 모양*을 정한다.

세 가지 큰 모델.

1. **Relational** — 테이블과 관계 (1970년대~)
2. **Document** — JSON 형식의 중첩 (NoSQL 시대)
3. **Graph** — 노드와 에지

그리고 이 셋과 다른 축으로 *질의 언어*의 차이가 있다 — declarative vs imperative, SQL vs MapReduce vs Cypher.

## Relational Model — 표준의 자리

Codd가 1970년에 제안. 30년간 표준이었다.

```sql
CREATE TABLE users (id INT, name VARCHAR);
CREATE TABLE orders (id INT, user_id INT, amount DECIMAL);

SELECT users.name, SUM(orders.amount)
FROM users JOIN orders ON users.id = orders.user_id
GROUP BY users.id;
```

**강점**:
- 잘 정의된 수학 기반 (관계 대수)
- 강력한 query language (SQL)
- 트랜잭션, 무결성, 정규화
- 수십 년의 최적화와 도구
- ACID 보장으로 *동시성*과 *부분 실패*를 캡슐화

**한계**:
- Impedance mismatch — 객체와 테이블의 불일치
- 스키마 변경 비용
- 중첩 데이터에 부적합

### 역사적 맥락

Relational 모델이 *이긴* 이유는 *추상화*에 있다.

```text
1960s: Hierarchical DB (IMS)
        - 트리 구조, 부모-자식 관계 hard-coded
        - 새 관계가 생기면 *전체 구조 재설계*
1970s: Network DB (CODASYL)
        - DAG 구조, 포인터 따라가는 navigation
        - 코드가 데이터 위치에 강하게 결합
1970:  Codd의 relational model 제안
        - 관계를 *수학적 집합*으로 추상화
        - 질의가 *물리적 저장*과 독립
1980s~: Relational의 광범위한 채택 (Oracle, DB2, ...)
```

**Codd의 통찰**: *애플리케이션이 데이터의 물리적 표현을 알 필요가 없다*. 질의는 *무엇을 원하는지*만 적고, *어떻게 가져오는지*는 DB가 결정한다. 이게 SQL의 *declarative* 본질이다.

### 객체-관계 임피던스 mismatch

OOP가 1990년대 주류가 되면서 객체와 테이블의 *불일치*가 문제로 떠올랐다.

```text
객체 모델:                          관계형 모델:
class User {                       users 테이블:
  String name;                       id, name, email
  List<Order> orders;
  Address address;                 orders 테이블:
}                                    id, user_id, amount

                                   addresses 테이블:
                                     id, user_id, street, city
```

한 객체가 *여러 테이블*에 흩어진다. ORM(Object-Relational Mapping) — Hibernate, ActiveRecord, SQLAlchemy — 이 이 mismatch를 가린다. 그러나 *완전히 가리지는 못한다* — N+1 query 문제, lazy loading 함정, 캐시 무효화 등.

### One-to-many — 이력서의 예

Kleppmann이 책에서 자세히 든 예. 이력서를 *어떻게 모델링*할 것인가?

```text
이력서:
  Bill McDermott
  ├─ regions
  │  ├─ Greater Boston Area
  │  └─ ...
  ├─ positions (3개)
  │  ├─ President, SAP America (1998-2002)
  │  ├─ CEO, Siebel Systems (2002-)
  │  └─ ...
  └─ education (2개)
     ├─ Pace University (BS)
     └─ Northwestern (MBA)
```

이력서는 *한 사람 → 여러 직장 / 여러 학교*. 전형적인 *one-to-many*.

**Relational 모델링**:

```sql
users:    id, name, region
positions: id, user_id, company, title, start, end
education: id, user_id, school, degree, start, end
```

한 사용자에 대한 정보를 가져오려면 *3개의 join*. 또는 3번의 query.

**Document 모델링** (MongoDB):

```json
{
  "id": 251,
  "name": "Bill McDermott",
  "region": "Greater Boston Area",
  "positions": [
    {"company": "SAP", "title": "President", "start": 1998},
    {"company": "Siebel", "title": "CEO", "start": 2002}
  ],
  "education": [
    {"school": "Pace University", "degree": "BS"},
    {"school": "Northwestern", "degree": "MBA"}
  ]
}
```

한 query, 한 문서. *모든 정보가 한 곳에*. one-to-many에 자연스러운 fit.

**Locality의 이점**: 사용자 프로필 페이지는 *한 사용자의 모든 정보를 한 번에* 보여 준다. document model에서는 *한 disk read*로 끝난다. relational에서는 *여러 페이지*를 읽고 join한다.

## Document Model — NoSQL의 부상

2000년대 NoSQL 운동. MongoDB, Couchbase, DynamoDB.

```json
{
  "id": "123",
  "name": "Alice",
  "orders": [
    {"id": "o1", "amount": 100},
    {"id": "o2", "amount": 200}
  ]
}
```

**강점**:
- Impedance mismatch 해소 (객체 그대로)
- 스키마 유연성 (schema-on-read)
- Locality — 관련 데이터가 한 문서
- 한 번의 query로 전체 가져옴

**한계**:
- Join 어려움 (또는 불가)
- 정규화 어려움 → 중복
- 깊이 중첩되면 갱신 비용 큼
- *Many-to-many* 관계를 깔끔히 표현 못 함

### Schema-on-Write vs Schema-on-Read

용어 정리.

**Schema-on-Write** (Relational)
: 쓰기 시 스키마 *강제*. 칼럼 타입, NULL 허용, FK 등이 *DB에서* 검증된다.

**Schema-on-Read** (Document)
: 쓰기 시 *아무 형식이나* 허용. 읽는 *애플리케이션 코드*가 데이터 형식을 해석한다.

```text
Schema-on-Write:
  스키마 변경 → ALTER TABLE → 다운타임 / 락
Schema-on-Read:
  스키마 변경 → 코드에서 "필드 없으면 기본값" 처리 → 무중단
```

장단점이 명확하다. *유연성 vs 안전성*. 데이터 형식이 *자주 변하는 초기 단계*에는 schema-on-read가 유리하고, 데이터 형식이 *안정된 단계*에는 schema-on-write가 유리하다.

## Many-to-Many — Relational의 강점

이력서의 *학교*를 보자. 한 학교는 *여러 사람*에 의해 다닌다. 한 사람은 *여러 학교*에 다닌다. 이게 **many-to-many** 관계.

```text
사람       학교
Alice  ┐  ┌  MIT
Bob    ┼──┤  Stanford
Carol  ┘  └  Pace
```

**Document로 표현하면** — 각 사람 문서가 학교 이름을 *문자열*로 저장. 학교 이름이 바뀌면 *모든 사람 문서*를 갱신해야 한다.

```json
{
  "name": "Alice",
  "education": [{"school": "MIT"}]
}
{
  "name": "Bob",
  "education": [{"school": "MIT"}]   // 중복
}
```

**Relational로 표현하면** — 학교를 *별도 테이블*에. 사람은 *FK*로 참조.

```sql
schools: id, name, region
people:  id, name
people_education: person_id, school_id, degree

-- 학교 이름 변경
UPDATE schools SET name = 'MIT (Cambridge)' WHERE id = 1;
-- 모든 사람의 데이터가 한 번에 갱신됨
```

이게 **normalization**의 효과. 한 사실(학교 이름)을 *한 곳*에만 저장. *consistency*가 자동.

Many-to-many가 늘어날수록 *relational의 우위*가 커진다. 친구 관계, 추천, 태그, 카테고리 — 현실의 대부분이 many-to-many다.

> Document model은 *원래 anti-relational*로 출발했지만, MongoDB가 `$lookup`을 추가하면서 *relational에 가까워졌다*. 결국 *순수한 document*는 *제한된 도메인*에서만 쓸모 있다.

## "Document vs Relational" — 결론 없음

Kleppmann의 입장 — **상황 의존**.

**Document가 적합**:
- 자연스럽게 트리/계층 구조
- 데이터를 한 번에 가져오는 패턴
- 스키마가 유연해야
- one-to-many가 지배적

**Relational이 적합**:
- 객체 사이 다중 관계 (many-to-many)
- Join이 많음
- 강한 일관성 요구
- 분석 쿼리

대부분의 현대 DB가 양쪽 기능 모두 제공.

- PostgreSQL — JSONB 칼럼 (document 기능)
- MongoDB — `$lookup` (join 기능)
- CockroachDB / TiDB — relational + 수평 확장

## Query Language — Declarative vs Imperative

**Imperative** (절차적):

```javascript
const result = []
for (const user of users) {
  if (user.country === 'KR') {
    result.push(user)
  }
}
```

어떻게 할지를 명시. *순서*, *제어 흐름*, *변수 갱신*을 모두 코드에 적는다.

**Declarative**:

```sql
SELECT * FROM users WHERE country = 'KR';
```

무엇을 원하는지를 명시. **어떻게**는 DB가 결정.

Declarative의 장점:
- DB가 최적화 가능 (인덱스 사용, 쿼리 재작성)
- 병렬 실행 가능
- 코드가 짧다
- 구현이 바뀌어도 query는 그대로

### MapReduce — declarative와 imperative 사이

Google이 2004년 발표. 분산 환경의 *함수형 프로그래밍*.

```javascript
db.observations.mapReduce(
  function map() {                                // 매 문서마다 호출
    var year  = this.observationTimestamp.getFullYear();
    var month = this.observationTimestamp.getMonth() + 1;
    emit(year + "-" + month, this.numAnimals);
  },
  function reduce(key, values) {                   // 같은 key별로 호출
    return Array.sum(values);
  },
  {
    query: { family: "Sharks" },
    out: "monthlySharkReport"
  }
);
```

- `map` — 각 문서에 적용. 임의의 JavaScript.
- `reduce` — 같은 key의 값들을 합침.

*Imperative한 map/reduce 함수*를 *declarative한 framework*가 *병렬 분산 실행*한다. 둘의 hybrid.

**왜 SQL 대신 MapReduce를?**

- 임의의 코드 가능 (정규식, 외부 호출, 복잡한 로직)
- 분산 환경에 자연스러움
- 그러나 *작성 / 디버깅이 어렵다*
- 그래서 후에 *SQL on Hadoop* (Hive)이 등장

## Graph Data Model

객체들 사이의 관계가 복잡할 때.

```text
Alice ──knows── Bob
  │
  loves
  │
  └── Cooking ──ingredient── Garlic
                   │
                   used_in
                   │
                   └── Pizza
```

**Vertex** (Node) — entity.
**Edge** — relationship.

소셜 네트워크, 추천 시스템, 사기 탐지, 지식 그래프, 의존성 그래프 등.

### Property Graph

```text
(Alice {age: 30}) -[KNOWS {since: 2020}]-> (Bob {age: 35})
```

vertex와 edge 모두 속성을 가진다. Neo4j, JanusGraph 등이 이 모델.

특징:
- *임의의 두 노드*가 임의의 종류의 관계를 가질 수 있다.
- *관계 자체*가 속성을 가진다 (날짜, 가중치, 라벨).
- *그래프 traversal*이 query의 기본 단위.

### Triple Store

```text
(Alice, knows, Bob)
(Bob, born_in, Seoul)
(Seoul, located_in, Korea)
```

매 사실이 (subject, predicate, object) 트리플. RDF, SPARQL.

**Semantic Web** 운동의 산물. Wikipedia의 Wikidata, DBpedia, 의료 온톨로지(SNOMED), 약물 상호작용 DB 등이 트리플 스토어 기반.

SPARQL 예:

```text
SELECT ?personName
WHERE {
  ?person :knows ?friend .
  ?friend :bornIn :Seoul .
  ?person :name ?personName .
}
```

"서울에서 태어난 친구를 가진 사람의 이름"을 묻는다. 자연어에 가까운 그래프 패턴 매칭.

## 왜 Graph가 강력한가

관계가 1차 시민. Join 없이 자연스럽게.

```sql
-- Relational: "Alice의 친구의 친구"
SELECT u3.* FROM users u1
JOIN friendships f1 ON u1.id = f1.user_id
JOIN users u2 ON f1.friend_id = u2.id
JOIN friendships f2 ON u2.id = f2.user_id
JOIN users u3 ON f2.friend_id = u3.id
WHERE u1.name = 'Alice';
```

```text
// Graph (Cypher)
MATCH (a:User {name: 'Alice'})-[:KNOWS]->(b)-[:KNOWS]->(c)
RETURN c
```

훨씬 간결. 깊이 5, 10인 query도 자연스럽게 표현.

```text
// 6단계 분리 (Six degrees of Kevin Bacon)
MATCH path = (kevin:Actor {name: 'Kevin Bacon'})-[:ACTED_IN|KNOWS*1..6]-(target:Actor {name: 'Alice'})
RETURN length(path)
```

같은 query를 SQL로 쓰면 *6중 join* — 거의 작성 불가능. 그래프 DB는 *path 패턴*을 first-class로 지원하므로 깊은 탐색이 단순한 문법.

### Graph traversal의 비용

Neo4j 같은 native graph DB는 *index-free adjacency*를 구현한다 — 한 노드에서 인접 노드로 가는 비용이 *상수 시간*. relational join은 *index lookup* 비용 (보통 log N).

```text
6단계 깊이 traversal, 평균 차수 30:
  Native graph:   30^6 ≈ 7억 노드 검사, 캐시 친화적
  Relational JOIN: 6번의 self-join, optimizer가 어려워함
```

소셜 네트워크 같은 *깊은 traversal* 워크로드에서 native graph DB가 압도적으로 빠르다.

### 그래프 모델의 두 큰 가지

| 모델 | 노드/엣지 | 질의 언어 | 대표 시스템 |
|---|---|---|---|
| Property Graph | 둘 다 속성 가짐 | Cypher, Gremlin | Neo4j, JanusGraph |
| Triple Store | 트리플(s, p, o) | SPARQL | Apache Jena, Stardog |

Property graph가 *애플리케이션 개발자에게 친숙*하고, triple store가 *오픈 데이터 / Semantic Web* 영역에서 강하다.

## Wide-Column — 또 다른 가족

위 세 모델 외에 *wide-column store*가 있다 — Cassandra, HBase, ScyllaDB, Bigtable.

```text
Row Key:          column families:
"user:123"   →   { profile: {name, age}, activity: {login_count, last_seen} }
"user:456"   →   { profile: {name, age, region}, activity: {...} }
```

특징:
- *Row key*에 의한 *sparse* 테이블
- 칼럼 패밀리(column family) 단위로 *물리적 저장 분리*
- *유연한 칼럼*: 행마다 다른 칼럼 집합 가능
- *수평 확장*과 *쓰기 throughput*에 강함

용도:
- 시계열 데이터 (IoT, 로그, 메트릭)
- 추천 시스템의 사용자-아이템 행렬
- 카탈로그 (제품, 매물)

엄밀히는 *relational + document의 중간*이라기보다 *독자적인 모델*에 가깝다. 데이터 모델로 분류할 때 *relational*도 *document*도 *graph*도 아닌 *네 번째 family*로 보는 시각이 있다.

## 모델의 진화

- **1970s** — Relational의 등장 (Codd)
- **1980s-90s** — Object DB 시도 (실패)
- **2000s** — XML DB, Google Bigtable
- **2010s** — NoSQL (Document, Key-Value, Wide-column, Graph)
- **2020s** — Multi-model DB, NewSQL (CockroachDB, Spanner)

흥미로운 패턴 — **기존 모델이 사라지지 않고, 새 모델과 공존**.

```text
2025년의 시스템:
  Primary OLTP:    PostgreSQL (relational + JSONB)
  Catalog:         MongoDB (document)
  Session / Cache: Redis (key-value)
  Social Graph:    Neo4j (graph)
  Time Series:     Cassandra / ScyllaDB (wide-column)
  Search:          Elasticsearch (inverted index)
  Analytics:       BigQuery / ClickHouse (column-oriented)
  Event Log:       Kafka (append-only log)
```

*polyglot persistence* — 각 도메인에 *맞는 도구*를 쓰는 것이 표준이 되었다.

## Datomic — 시간을 일급 시민으로

언급할 가치가 있는 다른 모델: **Datomic** (Rich Hickey).

데이터를 *불변의 사실 시퀀스*로 본다.

```text
[entity, attribute, value, transaction, op]

[#101, :user/name,  "Alice",    #t-001, true]    # 추가
[#101, :user/email, "a@x.com",  #t-001, true]
[#101, :user/email, "a@y.com",  #t-002, true]    # 변경
[#101, :user/email, "a@x.com",  #t-002, false]   # 이전 값 삭제
```

모든 변경이 *append*. 과거의 상태를 그대로 *질의 가능*. *시점 t에서 Alice의 email은?* 같은 질문에 답할 수 있다.

**용도** — 감사 로그, 의료 기록, 금융 거래 — *역사가 곧 데이터*인 도메인.

## 정리

- **데이터 모델** — 가장 중요한 디자인 결정
- **추상화 계층** — 사용자 모델 → 애플리케이션 → DB → 바이트
- **Relational** — 잘 정의된 수학, SQL, 30년 표준, many-to-many에 강함
- **Document** — JSON, impedance mismatch 해소, one-to-many 친화, locality
- **Graph** — 관계가 1차 시민, 깊은 탐색 자연스러움 (property / triple)
- **Wide-column** — Cassandra/Bigtable 계열, 시계열·sparse 데이터
- **객체-관계 mismatch** — ORM이 가려도 완전히 해결 못 함
- **Schema-on-write vs schema-on-read** — 안전성 vs 유연성
- 어느 모델이 "옳다"가 없다 — **상황에 맞는 도구**
- **Declarative query**가 일반적으로 imperative보다 우수
- **MapReduce** — declarative와 imperative의 hybrid
- 모던 DB는 **multi-model** — 양쪽 기능 모두
- **Polyglot persistence** — 도메인마다 다른 DB

## 다음 장 예고

다음 장은 **Storage and Retrieval** — DB가 내부적으로 데이터를 어떻게 저장하고 검색하는가. LSM tree, B-tree, column store.

## 관련 항목

- [Ch 1: Reliability / Scalability / Maintainability](/blog/parallel/designing-data-intensive-applications/chapter01-reliable-scalable-maintainable)
- [DDD 시리즈](/blog/programming/design/domain-driven-design/chapter01-crunching-knowledge/) — 모델링의 깊은 측면
- *A Relational Model of Data for Large Shared Data Banks* — Codd, 1970 (relational의 원전)
- *Bigtable: A Distributed Storage System* — Google, 2006 (wide-column의 원전)
- *Dynamo: Amazon's Highly Available Key-value Store* — 2007 (NoSQL의 원전 중 하나)
