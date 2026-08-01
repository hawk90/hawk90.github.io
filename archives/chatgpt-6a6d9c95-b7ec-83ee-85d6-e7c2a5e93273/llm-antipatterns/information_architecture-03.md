---
title: "Information architecture and knowledge graph (40 anti-patterns)"
category: information_architecture
item_count: 40
---
# Information architecture and knowledge graph
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-K-60 — Graph Analytics Becomes a Product
- Category: Information architecture and knowledge graph
- Original IDs: K-60
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 노드 클릭·경로·중앙성을 분석하는 플랫폼까지 개발

### 문제

실제 콘텐츠 연결 작업보다 도구가 커진다.

### 개선

먼저 수동 Topic Hub와 관계 링크의 효과를 확인한다.

---
## AP-K-61 — AI Recommendation as Truth
- Category: Information architecture and knowledge graph
- Original IDs: K-61
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### AI가 추천한 관련 글을 자동 게시

### 문제

문장 유사성은 높지만 기술 관계가 틀릴 수 있다.

### 개선

AI는 후보 생성에만 사용하고 중요한 추천은 승인한다.

---
## AP-K-62 — LLM Reads Only Titles
- Category: Information architecture and knowledge graph
- Original IDs: K-62
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 제목과 description만 보고 관계 추천

### 문제

실제 결론과 범위를 이해하지 못한다.

### 개선

소제목·핵심 요약·콘텐츠 타입을 함께 제공한다.

---
## AP-K-63 — LLM Reads Full Raw Article
- Category: Information architecture and knowledge graph
- Original IDs: K-63
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 전체 코드와 로그까지 모델에 전달

### 문제

비용·노이즈·개인정보 위험이 증가한다.

### 개선

정제된 문서 manifest와 요약을 사용한다.

---
## AP-K-64 — Embedding Model Lock-In
- Category: Information architecture and knowledge graph
- Original IDs: K-64
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 특정 벡터 모델의 결과를 영구 관계로 저장

### 문제

모델 변경 시 점수와 관계가 달라진다.

### 개선

자동 점수는 재생성 가능한 파생 데이터로 취급한다.

---
## AP-K-65 — Similarity Threshold by Guess
- Category: Information architecture and knowledge graph
- Original IDs: K-65
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 0.8 이상이면 관련 글 같은 임의 기준

### 문제

주제와 콘텐츠 유형마다 적절한 임계값이 다르다.

### 개선

대표 문서 쌍으로 평가 세트를 만든다.

---
## AP-K-66 — No Negative Examples
- Category: Information architecture and knowledge graph
- Original IDs: K-66
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 관련된 문서만 테스트

### 문제

유사하지만 추천하면 안 되는 문서를 구분하지 못한다.

### 개선

비관련·중복·경쟁 관계 예시도 평가한다.

---
## AP-K-67 — AI Generates Missing Links Everywhere
- Category: Information architecture and knowledge graph
- Original IDs: K-67
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 링크가 적은 글에 자동으로 많은 링크 삽입

### 문제

본문이 링크로 과밀해지고 의미가 약해진다.

### 개선

상위 몇 개 후보만 제시하고 문맥 적합성을 검토한다.

---
## AP-K-68 — Generated Link Text
- Category: Information architecture and knowledge graph
- Original IDs: K-68
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### AI가 앵커 문구까지 자동 삽입

### 문제

문체와 의미가 어색하거나 링크 대상과 정확히 일치하지 않을 수 있다.

### 개선

링크 후보와 권장 문맥만 제시하고 최종 문장은 사람이 작성한다.

---
## AP-K-69 — Recommendation Feedback Loop
- Category: Information architecture and knowledge graph
- Original IDs: K-69
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 클릭이 많은 추천을 강화하면서 같은 글만 반복 노출

### 개선

다양성·구조적 중요도·새 문서 탐색을 별도 제약으로 둔다.

---
## AP-K-70 — Cold-Start Neglect
- Category: Information architecture and knowledge graph
- Original IDs: K-70
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 새 글은 클릭 데이터가 없어 추천되지 않음

### 개선

명시적 관계와 Topic 구조를 기본 신호로 사용한다.

---
## AP-K-71 — Model Upgrade Changes Site Structure
- Category: Information architecture and knowledge graph
- Original IDs: K-71
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 임베딩 모델 업데이트 후 추천과 그래프가 대폭 변경

### 문제

사이트 탐색이 불안정해진다.

### 개선

대표 관계는 수동 고정하고 자동 추천은 보조 슬롯에만 사용한다.

---
## AP-K-72 — No Recommendation Versioning
- Category: Information architecture and knowledge graph
- Original IDs: K-72
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 알고리즘 변경 전후를 비교할 수 없음

### 개선

추천 manifest에 생성 버전과 모델 정보를 기록한다.

---
## AP-K-73 — No Canonical Node
- Category: Information architecture and knowledge graph
- Original IDs: K-73
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 같은 주제의 대표 글이 없음

### 문제

추천 알고리즘이 여러 유사 글을 동등하게 노출한다.

### 개선

Topic마다 대표 Guide·Concept를 지정한다.

---
## AP-K-74 — Canonical Guide Dominates Everything
- Category: Information architecture and knowledge graph
- Original IDs: K-74
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 관련 검색과 추천이 대표 Guide로만 감

### 문제

구체적인 Debug Note나 Reference가 묻힌다.

### 개선

사용자 의도에 따라 대표 문서와 세부 문서를 구분한다.

---
## AP-K-75 — Duplicate Articles Linked as Related
- Category: Information architecture and knowledge graph
- Original IDs: K-75
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 사실상 같은 검색 의도의 글을 서로 추천

### 문제

중복을 유지하고 사용자 이동만 늘린다.

### 개선

통합 또는 역할 분리를 먼저 검토한다.

---
## AP-K-76 — Superseded Article Recommended
- Category: Information architecture and knowledge graph
- Original IDs: K-76
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 구판이 관련 글에 계속 등장

### 개선

상태를 추천 점수와 필터에 반영한다.

---
## AP-K-77 — Related Content Competes with Canonical
- Category: Information architecture and knowledge graph
- Original IDs: K-77
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 하위 글이 대표 문서보다 검색·추천에서 강함

### 개선

상위 Guide를 구조적 진입점으로 boost하되, 정확한 문제 검색에는 하위 글을 우선한다.

---
## AP-K-78 — Same Recommendation for All Entry Points
- Category: Information architecture and knowledge graph
- Original IDs: K-78
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 검색으로 들어온 사용자와 시리즈를 따라온 사용자에게 같은 추천

### 문제

사용자 목적이 다르다.

### 개선

진입 문맥을 과도하게 추적하지 않더라도 페이지 내 위치에 따라 추천을 구분한다.

```text
상단: 선행 지식
하단: 다음 단계
```

---
## AP-K-79 — Personalization Before Need
- Category: Information architecture and knowledge graph
- Original IDs: K-79
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 사용자별 추천 시스템을 구축

### 문제

트래픽이 적고 콘텐츠 관계가 명확한 기술 블로그에서는 과도하다.

### 개선

문맥 기반 정적 추천이 먼저다.

---
## AP-K-80 — Persistent Reading Profile
- Category: Information architecture and knowledge graph
- Original IDs: K-80
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 사용자의 읽은 Topic과 검색 기록을 장기간 저장

### 문제

개인정보와 운영 복잡성이 증가한다.

### 개선

필요하다면 브라우저 로컬 상태로 최소화하고 명확한 제어를 제공한다.

---
## AP-K-81 — Resume Reading Without Consent
- Category: Information architecture and knowledge graph
- Original IDs: K-81
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 읽기 위치를 자동 저장·복원

### 문제

공용 기기나 예상치 못한 상태 유지가 불편할 수 있다.

### 개선

선택 기능으로 제공한다.

---
## AP-K-82 — “You May Also Like” Without Explanation
- Category: Information architecture and knowledge graph
- Original IDs: K-82
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 소비형 추천 문구 사용

### 문제

지식 문서의 학습 맥락이 약해진다.

### 개선

```text
다음에 읽을 글
필요한 선행 개념
같은 문제의 실전 사례
```

처럼 목적 중심 문구를 쓴다.

---
## AP-K-83 — Click-Through Rate as Relevance
- Category: Information architecture and knowledge graph
- Original IDs: K-83
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 클릭률이 높으면 추천이 정확하다고 판단

### 문제

제목의 매력과 실제 관련성을 구분하지 못한다.

### 개선

클릭 후 즉시 이탈·다음 탐색도 함께 본다.

---
## AP-K-84 — Manual Curation Without Review
- Category: Information architecture and knowledge graph
- Original IDs: K-84
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 한 번 정한 관련 글을 영구 유지

### 문제

새 글·통합·구판 상태가 반영되지 않는다.

### 개선

대표 글 업데이트 시 관계도 검토한다.

---
## AP-K-85 — Auto Recommendation Without Evaluation Set
- Category: Information architecture and knowledge graph
- Original IDs: K-85
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 추천 품질을 체감으로만 판단

### 개선

대표 문서마다 기대 관계를 소규모로 정의한다.

---
## AP-K-86 — No Explanation for Exclusion
- Category: Information architecture and knowledge graph
- Original IDs: K-86
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 왜 특정 글이 추천되지 않는지 알 수 없음

### 문제

알고리즘 디버깅이 어렵다.

### 개선

후보 점수와 제외 사유를 개발용 report에 남긴다.

---
## AP-K-87 — Recommendation Metrics Without Editorial Value
- Category: Information architecture and knowledge graph
- Original IDs: K-87
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 클릭은 적지만 반드시 필요한 선행 글을 제거

### 개선

일부 관계는 성과 지표와 무관하게 편집 원칙으로 유지한다.

---
## AP-K-88 — Graph Completeness as Quality
- Category: Information architecture and knowledge graph
- Original IDs: K-88
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 글에 관계를 채우는 것이 목표

### 문제

억지 연결이 늘어난다.

### 개선

관계가 없는 것이 더 정직한 문서도 허용한다.

---
## AP-K-89 — Recommendation System Without Failure Fallback
- Category: Information architecture and knowledge graph
- Original IDs: K-89
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 추천 데이터 생성 실패 시 페이지 오류

### 개선

기본적으로 정적 상위 Topic 링크는 항상 제공한다.

---
## AP-K-90 — Recommendation UI Dominates Conclusion
- Category: Information architecture and knowledge graph
- Original IDs: K-90
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 결론보다 추천 카드가 더 크게 보임

### 문제

글의 핵심 판단이 약해진다.

### 개선

본문 결론을 먼저 완성하고 추천은 보조 영역으로 둔다.

---
## AP-K-91 — Relationship Editing Requires Code Change
- Category: Information architecture and knowledge graph
- Original IDs: K-91
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 관련 글을 바꾸려면 컴포넌트 코드 수정

### 개선

콘텐츠 metadata나 manifest에서 관리한다.

---
## AP-K-92 — Relationship Stored Only in Front Matter
- Category: Information architecture and knowledge graph
- Original IDs: K-92
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 관계를 글 파일 상단에 직접 입력

### 문제

관계가 많아지면 front matter가 폭발한다.

### 개선

핵심 명시 관계만 front matter에 두고 나머지는 별도 graph manifest나 파생 데이터로 관리한다.

---
## AP-K-93 — Central Graph File Merge Conflicts
- Category: Information architecture and knowledge graph
- Original IDs: K-93
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 모든 관계를 하나의 거대한 YAML에 저장

### 문제

수정 충돌과 가독성 문제가 생긴다.

### 개선

Topic별 파일 또는 문서 ID 기준 분할을 고려한다.

---
## AP-K-94 — Graph Schema Without Validation
- Category: Information architecture and knowledge graph
- Original IDs: K-94
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 잘못된 node ID와 순환 관계가 그대로 들어감

### 개선

- 존재하지 않는 문서
- 금지된 순환
- 상태 불일치
- 중복 edge

를 검증한다.

---
## AP-K-95 — Relation Migration Forgotten
- Category: Information architecture and knowledge graph
- Original IDs: K-95
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 글 통합 시 링크만 수정하고 graph edge는 방치

### 개선

콘텐츠 migration에 관계 migration을 포함한다.

---
## AP-K-96 — Manual and Automatic Relations Mixed
- Category: Information architecture and knowledge graph
- Original IDs: K-96
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 어떤 관계가 사람이 지정했고 자동 생성됐는지 모름

### 개선

provenance를 저장한다.

---
## AP-K-97 — Automatic Relations Committed as Source
- Category: Information architecture and knowledge graph
- Original IDs: K-97
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 임베딩 결과를 원본 metadata처럼 Git에 저장

### 문제

모델과 threshold 변경이 대규모 diff를 만든다.

### 개선

자동 관계는 빌드 산출물로 취급한다.

---
## AP-K-98 — No Editorial Override
- Category: Information architecture and knowledge graph
- Original IDs: K-98
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 알고리즘 추천을 사람이 수정할 수 없음

### 개선

include, exclude, pin 기능을 제공한다.

---
## AP-K-99 — Override Cemetery
- Category: Information architecture and knowledge graph
- Original IDs: K-99
- Source messages: 2ad6b12b-39f6-4074-91f7-c9390693b4da
- Merge status: canonical source
### Source material
### 과거 알고리즘 문제를 override로 계속 덮음

### 문제

예외 규칙이 누적된다.

### 개선

override가 많아지면 추천 모델이나 taxonomy를 수정한다.

---
