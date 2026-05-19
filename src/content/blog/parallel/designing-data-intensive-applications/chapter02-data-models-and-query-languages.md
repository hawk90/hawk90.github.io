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

세 가지 큰 모델.

1. **Relational** — 테이블과 관계 (1970년대~)
2. **Document** — JSON 형식의 중첩 (NoSQL 시대)
3. **Graph** — 노드와 에지

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

**한계**:
- Impedance mismatch — 객체와 테이블의 불일치
- 스키마 변경 비용
- 중첩 데이터에 부적합

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
- 스키마 유연성
- Locality — 관련 데이터가 한 문서
- 한 번의 query로 전체 가져옴

**한계**:
- Join 어려움 (또는 불가)
- 정규화 어려움 → 중복
- 깊이 중첩되면 갱신 비용 큼

## "Document vs Relational" — 결론 없음

Kleppmann의 입장 — **상황 의존**.

**Document가 적합**:
- 자연스럽게 트리/계층 구조
- 데이터를 한 번에 가져오는 패턴
- 스키마가 유연해야

**Relational이 적합**:
- 객체 사이 다중 관계
- Join이 많음
- 강한 일관성 요구
- 분석 쿼리

대부분의 현대 DB가 양쪽 기능 모두 제공.

- PostgreSQL — JSONB 칼럼 (document 기능)
- MongoDB — `$lookup` (join 기능)

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

어떻게 할지를 명시.

**Declarative**:

```sql
SELECT * FROM users WHERE country = 'KR';
```

무엇을 원하는지를 명시. **어떻게**는 DB가 결정.

Declarative의 장점:
- DB가 최적화 가능 (인덱스 사용, 쿼리 재작성)
- 병렬 실행 가능
- 코드가 짧다

## Graph Data Model

객체들 사이의 관계가 복잡할 때.

```
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

소셜 네트워크, 추천 시스템, 사기 탐지 등.

### Property Graph

```
(Alice {age: 30}) -[KNOWS {since: 2020}]-> (Bob {age: 35})
```

vertex와 edge 모두 속성을 가진다. Neo4j, JanusGraph 등이 이 모델.

### Triple Store

```
(Alice, knows, Bob)
(Bob, born_in, Seoul)
```

매 사실이 (subject, predicate, object) 트리플. RDF, SPARQL.

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

```cypher
// Graph (Cypher)
MATCH (a:User {name: 'Alice'})-[:KNOWS]->(b)-[:KNOWS]->(c)
RETURN c
```

훨씬 간결. 깊이 5, 10인 query도 자연스럽게 표현.

## 모델의 진화

- **1970s** — Relational의 등장 (Codd)
- **1980s-90s** — Object DB 시도 (실패)
- **2000s** — XML DB
- **2010s** — NoSQL (Document, Key-Value, Graph)
- **2020s** — Multi-model DB (모든 모델 지원)

흥미로운 패턴 — **기존 모델이 사라지지 않고, 새 모델과 공존**.

## 정리

- **데이터 모델** — 가장 중요한 디자인 결정
- **Relational** — 잘 정의된 수학, SQL, 30년 표준
- **Document** — JSON, impedance mismatch 해소, 트리 친화
- **Graph** — 관계가 1차 시민, 깊은 탐색 자연스러움
- 어느 모델이 "옳다"가 없다 — **상황에 맞는 도구**
- **Declarative query**가 일반적으로 imperative보다 우수
- 모던 DB는 **multi-model** — 양쪽 기능 모두

## 다음 장 예고

다음 장은 **Storage and Retrieval** — DB가 내부적으로 데이터를 어떻게 저장하고 검색하는가.

## 관련 항목

- [Ch 1: Reliability / Scalability / Maintainability](/blog/parallel/designing-data-intensive-applications/chapter01-reliable-scalable-maintainable)
- [DDD 시리즈](/blog/programming/design/domain-driven-design/chapter01-crunching-knowledge/) — 모델링의 깊은 측면
