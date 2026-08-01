---
title: "Information architecture and knowledge graph (60 anti-patterns)"
category: information_architecture
item_count: 60
---
# Information architecture and knowledge graph
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-K-01 — Related Posts by Tag Count
- Category: Information architecture and knowledge graph
- Original IDs: K-01
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 공통 태그 수만으로 관련 글 추천

```text
A와 B가 `linux`, `pcie` 태그를 공유
→ 관련 글
```

### 문제

태그는 넓고 모호하다. 같은 `Linux` 태그를 가진 글도 학습 관계는 전혀 다를 수 있다.

### 개선

추천 신호에 우선순위를 둔다.

```text
명시적 선행·후속 관계
동일 Topic
동일 Series
본문 링크
콘텐츠 타입
공통 Tag
```

---
## AP-K-02 — Semantic Similarity Equals Relevance
- Category: Information architecture and knowledge graph
- Original IDs: K-02
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 임베딩 유사도가 높으면 관련 글이라고 판단

### 문제

문장이 비슷한 글은 찾지만, 독자가 다음에 읽어야 할 글을 찾는 것은 아니다.

예:

```text
PCIe BAR 개념 글
PCIe BAR 오류 로그 글
```

은 의미상 비슷하지만 역할은 다르다.

### 개선

유사도와 관계 유형을 분리한다.

```text
similar
prerequisite
next-step
example
counterexample
debug-case
reference
```

---
## AP-K-03 — Recommendation Without Purpose
- Category: Information architecture and knowledge graph
- Original IDs: K-03
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 왜 추천하는지 설명하지 않음

```text
관련 글
- MSI-X
- DMA
- NUMA
```

### 문제

독자는 무엇을 얻는지 알 수 없다.

### 개선

```text
다음 단계: MSI-X 설정 흐름
선행 개념: PCIe Configuration Space
실전 사례: BAR mmap 실패 분석
```

처럼 이유를 표시한다.

---
## AP-K-04 — Same Recommendation Everywhere
- Category: Information architecture and knowledge graph
- Original IDs: K-04
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 글 하단에 동일한 인기 글 노출

### 문제

개인화나 문맥이 없고, 학습 흐름이 끊긴다.

### 개선

페이지 역할에 따라 추천 목표를 다르게 둔다.

```text
Guide → 세부 Concept
Concept → 실험·디버깅
Debug Note → 원리 문서
Reference → 대표 Guide
```

---
## AP-K-05 — Popularity Bias
- Category: Information architecture and knowledge graph
- Original IDs: K-05
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 조회수 높은 글만 추천

### 문제

이미 인기 있는 글이 계속 더 노출되고, 희귀하지만 중요한 글은 묻힌다.

### 개선

편집자 우선순위와 구조적 중요도를 함께 반영한다.

---
## AP-K-06 — Recency Bias
- Category: Information architecture and knowledge graph
- Original IDs: K-06
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 최신 글을 관련 글보다 우선 추천

### 문제

새 글이라는 이유만으로 문맥과 무관한 글이 노출된다.

### 개선

최신성은 관련성이 충분할 때만 보조 가중치로 쓴다.

---
## AP-K-07 — Engagement Optimization
- Category: Information architecture and knowledge graph
- Original IDs: K-07
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 클릭률 높은 추천을 계속 강화

### 문제

자극적인 제목이나 쉬운 글만 상위에 남을 수 있다.

### 개선

클릭뿐 아니라 다음을 본다.

```text
학습 흐름
본문 체류
다음 이동
대표 Guide 도달
문제 해결 적합성
```

---
## AP-K-08 — Recommendation Echo Chamber
- Category: Information architecture and knowledge graph
- Original IDs: K-08
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 특정 Topic 안에서만 추천이 순환

```text
CXL → CXL → CXL → CXL
```

### 문제

인접 기술과의 연결성이 사라진다.

### 개선

일부 추천은 교차 Topic 관계를 의도적으로 포함한다.

```text
CXL memory
→ NUMA
→ Linux memory tiering
→ PCIe address translation
```

---
## AP-K-09 — Random Exploration Slot
- Category: Information architecture and knowledge graph
- Original IDs: K-09
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 다양성을 위해 임의 글을 추천

### 문제

학습 문맥과 전혀 맞지 않을 수 있다.

### 개선

랜덤 대신 편집된 “연결 주제” 슬롯을 사용한다.

---
## AP-K-10 — Too Many Recommendations
- Category: Information architecture and knowledge graph
- Original IDs: K-10
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 글 하단에 추천 글 10~20개

### 문제

선택지가 많아지면서 실제 클릭은 어려워진다.

### 개선

역할이 다른 3~5개 정도만 노출한다.

```text
선행 1
다음 1
관련 개념 1
실전 사례 1
상위 Hub 1
```

---
## AP-K-100 — Knowledge Graph Becomes the Product
- Category: Information architecture and knowledge graph
- Original IDs: K-100
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 그래프·추천 시스템 개발이 콘텐츠 연결보다 커짐

### 문제

정작 대표 Topic Hub와 핵심 내부 링크는 그대로다.

### 개선

다음 순서를 지킨다.

```text
수동으로 대표 글 20개 연결
Topic Hub 5개 구축
관계 유형 검증
자동 후보 생성
필요할 때 시각화
```

---
## AP-K-11 — One Generic Relation
- Category: Information architecture and knowledge graph
- Original IDs: K-11
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 연결을 `related` 하나로 표현

### 문제

학습 순서와 참조 관계를 구분할 수 없다.

### 개선

최소 관계 유형을 둔다.

```text
parent
prerequisite
next
explains
implements
uses
contrasts
supersedes
```

---
## AP-K-12 — Relation Type Explosion
- Category: Information architecture and knowledge graph
- Original IDs: K-12
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 관계 종류가 지나치게 많음

```text
loosely-related
somewhat-related
conceptually-precedes
implementation-example-of
```

### 문제

작성자가 일관되게 사용하기 어렵다.

### 개선

처음에는 5~8개 핵심 관계만 사용한다.

---
## AP-K-13 — Directionless Relationship
- Category: Information architecture and knowledge graph
- Original IDs: K-13
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### A와 B가 관련 있다는 것만 표시

### 문제

A가 B의 선행인지, B가 A의 구현인지 알 수 없다.

### 개선

관계 방향을 명시한다.

```text
Configuration Space
→ prerequisite of
BAR Allocation
```

---
## AP-K-14 — Symmetric Relation Assumption
- Category: Information architecture and knowledge graph
- Original IDs: K-14
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 관계를 양방향으로 처리

### 문제

`A is prerequisite of B`와 `B is prerequisite of A`는 같지 않다.

### 개선

대칭 관계와 비대칭 관계를 구분한다.

---
## AP-K-15 — Missing Inverse Relation
- Category: Information architecture and knowledge graph
- Original IDs: K-15
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 관계는 저장했지만 반대편에서 활용하지 않음

예:

```text
A prerequisite of B
```

는 있지만 B 페이지에 “선행 문서 A”가 표시되지 않는다.

### 개선

그래프 생성 시 inverse relation을 파생한다.

---
## AP-K-16 — Relation Stored in Multiple Places
- Category: Information architecture and knowledge graph
- Original IDs: K-16
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### front matter, 시리즈 manifest, 본문 링크에 같은 관계 반복 저장

### 문제

정보가 어긋난다.

### 개선

원본 관계와 파생 관계를 구분하고 source of truth를 하나로 둔다.

---
## AP-K-17 — Relation Inferred from Folder
- Category: Information architecture and knowledge graph
- Original IDs: K-17
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 파일 위치가 관계를 결정

```text
/cxl/linux/numa/
```

라고 해서 반드시 학습 순서나 상위 개념 관계가 정확한 것은 아니다.

### 개선

저장 경로와 지식 관계를 분리한다.

---
## AP-K-18 — Relation Inferred from Title
- Category: Information architecture and knowledge graph
- Original IDs: K-18
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 제목에 같은 단어가 있으니 연결

### 문제

단어 공유와 개념 관계를 혼동한다.

### 개선

자동화는 후보만 만들고 중요한 관계는 승인한다.

---
## AP-K-19 — Relation Without Evidence
- Category: Information architecture and knowledge graph
- Original IDs: K-19
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 왜 연결됐는지 기록 없음

### 개선

자동 생성 관계에는 근거를 남긴다.

```text
shared-topic
explicit-link
same-series
semantic-score
manual
```

---
## AP-K-20 — Stale Relation
- Category: Information architecture and knowledge graph
- Original IDs: K-20
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 글이 통합·폐기됐는데 관계는 남음

### 개선

상태 변경과 관계 정리를 같은 workflow에 포함한다.

---
## AP-K-21 — Linear Learning Path Assumption
- Category: Information architecture and knowledge graph
- Original IDs: K-21
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 독자가 같은 순서로 읽는다고 가정

### 문제

독자의 배경과 목적이 다르다.

### 개선

여러 경로를 제공한다.

```text
개념 중심
소스코드 중심
디버깅 중심
성능 중심
```

---
## AP-K-22 — One Start Point for Everyone
- Category: Information architecture and knowledge graph
- Original IDs: K-22
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 입문자가 하나의 긴 로드맵부터 시작해야 함

### 문제

경험자에게 불필요하고 초보자에게 과할 수 있다.

### 개선

선행 지식별 진입점을 제공한다.

---
## AP-K-23 — Path Without Goal
- Category: Information architecture and knowledge graph
- Original IDs: K-23
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 글 순서는 있지만 완주 후 무엇을 알게 되는지 없음

### 개선

각 경로에 학습 목표를 적는다.

---
## AP-K-24 — Path Without Exit
- Category: Information architecture and knowledge graph
- Original IDs: K-24
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 시리즈를 다 읽은 뒤 다음 단계가 없음

### 개선

상위 Topic이나 실전 프로젝트로 연결한다.

---
## AP-K-25 — Path Locked to Publication Order
- Category: Information architecture and knowledge graph
- Original IDs: K-25
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 작성한 순서가 학습 순서

### 문제

작성자는 발견 순서로 썼지만 독자는 개념 순서로 배워야 한다.

### 개선

발행 순서와 학습 순서를 분리한다.

---
## AP-K-26 — Prerequisite Chain Too Deep
- Category: Information architecture and knowledge graph
- Original IDs: K-26
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 한 글을 읽기 위해 10개 선행 글 요구

### 문제

진입 장벽이 너무 높다.

### 개선

필수 선행과 선택 선행을 구분하고, 짧은 요약을 제공한다.

---
## AP-K-27 — Circular Prerequisites
- Category: Information architecture and knowledge graph
- Original IDs: K-27
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### A를 이해하려면 B가 필요하고, B를 이해하려면 A가 필요

### 문제

학습 그래프가 닫힌다.

### 개선

기본 모델을 설명하는 독립 진입 문서를 둔다.

---
## AP-K-28 — Hidden Prerequisite
- Category: Information architecture and knowledge graph
- Original IDs: K-28
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 본문 중간에서 갑자기 고급 개념 등장

### 개선

글 상단에 선행 지식을 표시한다.

---
## AP-K-29 — Difficulty as Path
- Category: Information architecture and knowledge graph
- Original IDs: K-29
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 난이도 순으로만 콘텐츠를 연결

### 문제

난이도와 개념 의존성은 다르다.

### 개선

관계와 난이도를 별도 속성으로 관리한다.

---
## AP-K-30 — Completing the Path Becomes the Goal
- Category: Information architecture and knowledge graph
- Original IDs: K-30
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 학습 경로의 모든 글을 읽어야 한다고 느끼게 함

### 문제

문제 해결형 독자에게 부담이다.

### 개선

필수·선택·심화 문서를 구분한다.

---
## AP-K-31 — Backlink Dump
- Category: Information architecture and knowledge graph
- Original IDs: K-31
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 현재 글을 참조하는 모든 문서를 나열

### 문제

많은 글에서 수십 개 링크가 생긴다.

### 개선

의미 있는 backlink만 노출한다.

```text
이 글을 선행 지식으로 사용하는 Guide
이 글을 구현한 Source Walkthrough
이 글을 반박·보완한 글
```

---
## AP-K-32 — Backlink Without Relation
- Category: Information architecture and knowledge graph
- Original IDs: K-32
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### “이 글을 참조한 글”만 표시

### 문제

왜 참조했는지 모른다.

### 개선

참조 문맥이나 관계 유형을 표시한다.

---
## AP-K-33 — Self-Generated Backlink Noise
- Category: Information architecture and knowledge graph
- Original IDs: K-33
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 자동 생성된 관련 글 영역의 링크까지 backlink로 계산

### 문제

그래프가 인위적으로 밀집한다.

### 개선

본문 명시 링크와 자동 추천 링크를 구분한다.

---
## AP-K-34 — Navigation Links Counted as Knowledge Edges
- Category: Information architecture and knowledge graph
- Original IDs: K-34
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 헤더·푸터·태그 링크까지 지식 관계로 처리

### 문제

모든 페이지가 강하게 연결된 것처럼 보인다.

### 개선

UI 탐색 링크와 의미 관계 링크를 분리한다.

---
## AP-K-35 — Backlink as Popularity Score
- Category: Information architecture and knowledge graph
- Original IDs: K-35
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### backlink 수가 많으면 중요한 글이라고 판단

### 문제

공통 용어 글은 링크가 많고, 희귀 핵심 글은 적을 수 있다.

### 개선

관계 유형과 위치에 가중치를 둔다.

---
## AP-K-36 — Missing Backlink for Renamed Pages
- Category: Information architecture and knowledge graph
- Original IDs: K-36
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### slug 변경 후 링크는 redirect로 살아 있지만 그래프는 끊김

### 개선

canonical ID 기준으로 관계를 관리한다.

---
## AP-K-37 — Backlink Page Indexed as Thin Content
- Category: Information architecture and knowledge graph
- Original IDs: K-37
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### backlink 목록만 별도 URL로 생성

### 문제

내용이 거의 없는 페이지가 늘어난다.

### 개선

backlink는 문서 UI의 보조 정보로 제공한다.

---
## AP-K-38 — Topic Equals Tag
- Category: Information architecture and knowledge graph
- Original IDs: K-38
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### Topic Graph를 태그 공통도로 생성

### 문제

태그는 횡단 속성이라 지식 계층을 표현하지 못한다.

### 개선

Topic과 Tag를 분리한다.

---
## AP-K-39 — Topic Hierarchy as a Tree Only
- Category: Information architecture and knowledge graph
- Original IDs: K-39
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 주제가 하나의 부모만 가짐

### 문제

시스템 분야는 다중 관계가 많다.

예:

```text
DMA
→ PCIe
→ Memory
→ Driver
→ IOMMU
```

### 개선

탐색용 계층과 의미 그래프를 분리한다.

---
## AP-K-40 — Graph Without Canonical Nodes
- Category: Information architecture and knowledge graph
- Original IDs: K-40
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### `C++`, `cpp`, `cplusplus`가 별도 노드

### 문제

그래프가 분열된다.

### 개선

canonical ID와 alias를 사용한다.

---
## AP-K-41 — Node for Every Tag
- Category: Information architecture and knowledge graph
- Original IDs: K-41
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 1회성 태그까지 그래프 노드

### 문제

노드가 너무 많고 의미가 약해진다.

### 개선

핵심 Topic과 주요 Concept만 노드화한다.

---
## AP-K-42 — Article as Every Node
- Category: Information architecture and knowledge graph
- Original IDs: K-42
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 글을 같은 크기의 노드로 표시

### 문제

대표 Guide와 작은 Note의 차이가 사라진다.

### 개선

노드 유형과 중요도를 구분한다.

---
## AP-K-43 — Graph Density as Quality
- Category: Information architecture and knowledge graph
- Original IDs: K-43
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 연결이 많을수록 좋다고 판단

### 문제

의미 없는 링크가 많아질 수 있다.

### 개선

적은 수의 정확한 관계를 우선한다.

---
## AP-K-44 — Disconnected Node Panic
- Category: Information architecture and knowledge graph
- Original IDs: K-44
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 고립 노드가 있으면 무조건 연결

### 문제

독립적인 Reference나 역사 기록은 고립되어도 괜찮을 수 있다.

### 개선

고립이 문제인지 문서 역할에 따라 판단한다.

---
## AP-K-45 — Centrality as Editorial Importance
- Category: Information architecture and knowledge graph
- Original IDs: K-45
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 그래프 중심성이 높은 글을 대표 문서로 선정

### 문제

일반 개념 글이 구조상 중심이지만, 네 전문성을 대표하지 않을 수 있다.

### 개선

구조적 중요도와 편집자 중요도를 분리한다.

---
## AP-K-46 — Graph Generated Once
- Category: Information architecture and knowledge graph
- Original IDs: K-46
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 지식 그래프를 만든 뒤 갱신하지 않음

### 문제

새 글과 통합 결과가 반영되지 않는다.

### 개선

manifest에서 재생성 가능하게 한다.

---
## AP-K-47 — Graph Without State
- Category: Information architecture and knowledge graph
- Original IDs: K-47
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 폐기·구판·검토 필요 문서도 동일하게 표시

### 개선

노드 상태를 반영한다.

---
## AP-K-48 — Graph Without Edge Provenance
- Category: Information architecture and knowledge graph
- Original IDs: K-48
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 연결 근거를 알 수 없음

### 개선

수동, 본문 링크, 시리즈, 자동 유사도 등 provenance를 기록한다.

---
## AP-K-49 — Hairball Graph
- Category: Information architecture and knowledge graph
- Original IDs: K-49
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 노드와 연결을 한 화면에 표시

### 문제

아무것도 읽을 수 없다.

### 개선

Topic, 수준, 관계 유형별 필터를 제공하거나 기본 범위를 작게 유지한다.

---
## AP-K-50 — Force-Directed Layout as Structure
- Category: Information architecture and knowledge graph
- Original IDs: K-50
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 물리 시뮬레이션 배치를 실제 지식 구조로 해석

### 문제

노드 위치가 실행마다 달라지고 의미가 불분명하다.

### 개선

계층·경로·관계 유형에 맞는 레이아웃을 선택한다.

---
## AP-K-51 — Animation-Heavy Graph
- Category: Information architecture and knowledge graph
- Original IDs: K-51
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 노드가 계속 움직임

### 문제

읽기 어렵고 성능과 접근성이 나빠진다.

### 개선

초기 배치 후 고정하고 reduced motion을 지원한다.

---
## AP-K-52 — Zoom-Only Navigation
- Category: Information architecture and knowledge graph
- Original IDs: K-52
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 그래프에서 확대·축소만 가능

### 문제

키보드와 모바일 사용성이 나쁘다.

### 개선

검색, 목록, breadcrumb를 함께 제공한다.

---
## AP-K-53 — Color-Only Node Types
- Category: Information architecture and knowledge graph
- Original IDs: K-53
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### Topic·Guide·Debug를 색으로만 구분

### 개선

모양·라벨·범례를 함께 사용한다.

---
## AP-K-54 — Tiny Labels
- Category: Information architecture and knowledge graph
- Original IDs: K-54
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 노드가 많아 제목이 읽히지 않음

### 개선

상위 노드만 라벨을 표시하고 상세는 선택 시 보여준다.

---
## AP-K-55 — Graph Replaces Navigation
- Category: Information architecture and knowledge graph
- Original IDs: K-55
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 일반 메뉴와 Topic Hub 대신 그래프만 제공

### 문제

그래프는 탐색 보조이지 기본 정보 구조가 아니다.

### 개선

목록과 계층 탐색을 우선하고 그래프는 선택 기능으로 둔다.

---
## AP-K-56 — Graph Has No User Question
- Category: Information architecture and knowledge graph
- Original IDs: K-56
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 멋있어 보여서 추가

### 문제

독자가 무엇을 할 수 있는지 불명확하다.

### 개선

그래프의 목적을 하나로 제한한다.

```text
이 주제의 선행 개념 찾기
현재 글과 연결된 실전 사례 찾기
전체 학습 경로 보기
```

---
## AP-K-57 — Graph on Mobile by Default
- Category: Information architecture and knowledge graph
- Original IDs: K-57
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 작은 화면에서도 전체 그래프 렌더링

### 문제

조작과 성능이 모두 나쁘다.

### 개선

모바일에서는 목록형 관계 보기로 대체한다.

---
## AP-K-58 — Graph State Not Shareable
- Category: Information architecture and knowledge graph
- Original IDs: K-58
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 필터·선택 상태를 URL로 공유할 수 없음

### 개선

필요한 경우 선택된 Topic과 관계 필터를 URL 상태로 표현한다.

---
## AP-K-59 — Graph Requires Heavy Client Runtime
- Category: Information architecture and knowledge graph
- Original IDs: K-59
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 지식 관계를 보기 위해 큰 JS bundle 필요

### 문제

정적 사이트의 장점을 잃는다.

### 개선

기본 관계 목록은 정적 HTML로 제공하고 시각화는 지연 로드한다.

---
