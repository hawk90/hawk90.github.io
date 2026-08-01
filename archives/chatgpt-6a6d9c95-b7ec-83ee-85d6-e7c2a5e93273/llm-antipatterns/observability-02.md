---
title: "Measurement and observability (40 anti-patterns)"
category: observability
item_count: 40
---
# Measurement and observability
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-O-60 — Revenue Attribution to a Single Change
- Category: Measurement and observability
- Original IDs: O-60
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 허브 페이지 추가 후 수익이 늘었다고 즉시 인과 추론

### 문제

검색 순위, 계절성, 광고 시장 등 다른 변수가 많다.

### 개선

변경 로그와 충분한 관찰 기간을 사용한다.

---
## AP-O-61 — A/B Test Before Enough Traffic
- Category: Measurement and observability
- Original IDs: O-61
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 방문자가 적은데 실험부터 시행

### 문제

통계적으로 의미 있는 결과가 나오기 어렵다.

### 개선

저트래픽 사이트에서는 명확한 UX 원칙과 정성 평가가 더 효율적이다.

---
## AP-O-62 — Testing Cosmetic Details First
- Category: Measurement and observability
- Original IDs: O-62
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 버튼 색, 그림자, radius를 먼저 실험

### 문제

더 큰 구조적 문제를 놓친다.

### 우선 실험 대상

```text
홈의 Topic 구조
대표 글 노출
검색 결과 문맥
관련 글 관계
광고 위치
```

---
## AP-O-63 — Multiple Variables in One Experiment
- Category: Measurement and observability
- Original IDs: O-63
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 홈 구조·제목·광고·색상을 동시에 변경

### 문제

어떤 변화가 결과를 만들었는지 알 수 없다.

### 개선

한 실험에서 핵심 가설 하나만 다룬다.

---
## AP-O-64 — No Experiment Hypothesis
- Category: Measurement and observability
- Original IDs: O-64
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### “이게 더 좋아 보인다” 수준

### 개선 예

```text
Topic Hub를 최신 글보다 먼저 노출하면,
신규 방문자의 두 번째 페이지 이동률이 증가할 것이다.
```

---
## AP-O-65 — No Primary Metric
- Category: Measurement and observability
- Original IDs: O-65
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 여러 지표 중 어떤 것을 기준으로 결정할지 없음

### 개선

주요 지표 하나와 안전 지표를 정한다.

```text
Primary:
내부 페이지 이동률

Guardrails:
LCP, CLS, 검색 종료율
```

---
## AP-O-66 — Metric Shopping
- Category: Measurement and observability
- Original IDs: O-66
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 원하는 결론이 나올 때까지 유리한 지표 선택

### 개선

실험 전에 판단 기준을 기록한다.

---
## AP-O-67 — Stopping When It Looks Good
- Category: Measurement and observability
- Original IDs: O-67
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 중간에 좋은 결과가 나오면 종료

### 문제

초기 변동을 승리로 오인할 수 있다.

### 개선

사전에 기간이나 표본 기준을 정한다.

---
## AP-O-68 — Experiment Contamination
- Category: Measurement and observability
- Original IDs: O-68
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 본인 테스트·봇·개발 트래픽이 실험에 포함

### 개선

가능한 범위에서 제외한다.

---
## AP-O-69 — No Segment Analysis
- Category: Measurement and observability
- Original IDs: O-69
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 전체 평균만 보고 결론

### 문제

모바일에서는 좋아지고 데스크톱에서는 나빠질 수 있다.

### 개선

중요 세그먼트를 사전에 정한다.

---
## AP-O-70 — Segment Fishing
- Category: Measurement and observability
- Original IDs: O-70
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 결과가 나올 때까지 세그먼트를 계속 쪼갬

### 개선

주요 세그먼트만 미리 정의한다.

---
## AP-O-71 — Novelty Effect Ignored
- Category: Measurement and observability
- Original IDs: O-71
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 새 디자인 직후의 반응을 장기 효과로 판단

### 개선

초기와 안정화 기간을 구분한다.

---
## AP-O-72 — A/B Test Adds Permanent Complexity
- Category: Measurement and observability
- Original IDs: O-72
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 실험 코드가 끝난 뒤에도 flag와 분기가 남음

### 개선

승자 결정 후 실험 코드와 이벤트를 제거한다.

---
## AP-O-73 — Feature Flag Cemetery
- Category: Measurement and observability
- Original IDs: O-73
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 과거 실험 flag가 계속 남음

### 개선

flag마다 만료일과 소유 목적을 둔다.

---
## AP-O-74 — Experiment Without Accessibility Check
- Category: Measurement and observability
- Original IDs: O-74
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 클릭률만 개선되면 채택

### 문제

키보드·스크린리더·모션 민감 사용자에게 나빠질 수 있다.

### 개선

접근성은 실험 대상이 아니라 기본 guardrail로 둔다.

---
## AP-O-75 — Dark Pattern Experimentation
- Category: Measurement and observability
- Original IDs: O-75
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 더 많은 클릭을 위해 혼동을 실험

### 문제

광고·뉴스레터·내비게이션 오인 클릭을 유도할 수 있다.

### 개선

사용자 의도가 명확한 실험만 수행한다.

---
## AP-O-76 — Build Time Without Stage Breakdown
- Category: Measurement and observability
- Original IDs: O-76
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 총 빌드 시간만 기록

### 문제

Shiki, OG, 검색, Markdown 중 어디가 병목인지 모른다.

### 개선

단계별 시간을 측정한다.

---
## AP-O-77 — Memory Peak Without Context
- Category: Measurement and observability
- Original IDs: O-77
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### peak RSS 숫자만 확인

### 개선

페이지 수·코드 블록 수·변경량과 함께 기록한다.

---
## AP-O-78 — No Artifact Size Tracking
- Category: Measurement and observability
- Original IDs: O-78
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### dist가 커져도 알 수 없음

### 개선

다음을 분리한다.

```text
HTML
JS
CSS
Images
Search Index
OG Assets
```

---
## AP-O-79 — CI Success Rate Ignored
- Category: Measurement and observability
- Original IDs: O-79
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 가끔 실패해도 재실행으로 해결

### 문제

flaky build가 정상화된다.

### 개선

실패율과 원인을 추적한다.

---
## AP-O-80 — Mean Build Time Only
- Category: Measurement and observability
- Original IDs: O-80
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 평균만 확인

### 문제

간헐적인 매우 느린 빌드를 숨길 수 있다.

### 개선

median과 p95를 함께 본다.

---
## AP-O-81 — No Changed-File Correlation
- Category: Measurement and observability
- Original IDs: O-81
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 어떤 변경이 빌드 비용을 늘렸는지 모름

### 개선

변경된 글 수·코드 블록·이미지 수와 빌드 시간을 함께 기록한다.

---
## AP-O-82 — Tooling Metrics Without Action Threshold
- Category: Measurement and observability
- Original IDs: O-82
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 수치는 쌓이지만 경고 기준이 없음

### 개선

예:

```text
검색 인덱스 +20% → 검토
build p95 5분 초과 → 이슈
HTML 총량 +15% → diff 확인
```

---
## AP-O-83 — Dashboard Graveyard
- Category: Measurement and observability
- Original IDs: O-83
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 대시보드는 만들었지만 보지 않음

### 개선

정기적으로 확인할 핵심 화면 하나만 유지한다.

---
## AP-O-84 — Manual Spreadsheet Metrics
- Category: Measurement and observability
- Original IDs: O-84
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 지표를 수동 복사

### 문제

지속성이 낮고 오류가 발생한다.

### 개선

가능한 범위에서 자동 수집하되, 복잡한 플랫폼을 새로 만들지는 않는다.

---
## AP-O-85 — Observability Platform Before Need
- Category: Measurement and observability
- Original IDs: O-85
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 개인 블로그에 Grafana·데이터 웨어하우스 구축

### 문제

사이트보다 관측 시스템 유지가 더 커진다.

### 개선

Search Console, 간단한 Analytics, CI artifact 정도로 시작한다.

---
## AP-O-86 — Collect Now, Decide Later
- Category: Measurement and observability
- Original IDs: O-86
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 나중에 쓸 수 있으니 모든 데이터를 저장

### 문제

개인정보 위험과 분석 복잡성이 증가한다.

### 개선

명확한 목적이 없는 데이터는 수집하지 않는다.

---
## AP-O-87 — No Data Retention Policy
- Category: Measurement and observability
- Original IDs: O-87
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 이벤트를 무기한 보존

### 개선

실제 비교에 필요한 기간만 유지한다.

---
## AP-O-88 — Raw Query Logging
- Category: Measurement and observability
- Original IDs: O-88
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 내부 검색어 원문 전체 저장

### 문제

민감한 오류·회사명·내부 정보가 포함될 수 있다.

### 개선

집계·정규화·익명화 가능성을 검토한다.

---
## AP-O-89 — Full IP Dependence
- Category: Measurement and observability
- Original IDs: O-89
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 사용자 구분을 위해 IP에 과도하게 의존

### 개선

필요 최소한의 집계 방식으로 제한한다.

---
## AP-O-90 — Author Traffic Pollution
- Category: Measurement and observability
- Original IDs: O-90
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 본인 방문과 자동화 트래픽이 성과에 포함

### 개선

개발자·봇·preview 트래픽을 가능한 범위에서 제외한다.

---
## AP-O-91 — Bot Traffic as Popularity
- Category: Measurement and observability
- Original IDs: O-91
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 크롤러 방문을 인기 글로 오인

### 개선

사람과 bot traffic을 분리한다.

---
## AP-O-92 — Duplicate Pageview After Client Navigation
- Category: Measurement and observability
- Original IDs: O-92
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### ClientRouter 전환에서 pageview가 중복 기록

### 문제

페이지별 트래픽이 과대 계산된다.

### 개선

초기 load와 client navigation tracking을 명확히 분리한다.

---
## AP-O-93 — Missing Pageview After Client Navigation
- Category: Measurement and observability
- Original IDs: O-93
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 반대로 SPA 전환이 Analytics에 기록되지 않음

### 개선

페이지 생명주기를 중앙화하고 테스트한다.

---
## AP-O-94 — URL Fragment Cardinality
- Category: Measurement and observability
- Original IDs: O-94
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### heading anchor마다 별도 페이지처럼 수집

### 문제

같은 글이 수많은 경로로 분할된다.

### 개선

분석 URL에서는 fragment를 제거하거나 별도 section event로 처리한다.

---
## AP-O-95 — Query Parameter Cardinality
- Category: Measurement and observability
- Original IDs: O-95
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 검색·필터 parameter 조합이 페이지 차원을 폭증

### 개선

canonical page path와 interaction event를 분리한다.

---
## AP-O-96 — Metrics Without Editorial Judgment
- Category: Measurement and observability
- Original IDs: O-96
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 숫자가 콘텐츠 우선순위를 자동 결정

### 문제

희귀하지만 중요한 전문 글을 제거하게 될 수 있다.

### 개선

데이터는 후보를 제시하고 최종 판단은 콘텐츠 가치와 전략을 포함한다.

---
## AP-O-97 — Editorial Judgment Without Metrics
- Category: Measurement and observability
- Original IDs: O-97
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 반대로 감으로만 결정

### 개선

대표 글 선정, 허브 개선, 검색 품질은 최소한의 데이터를 참고한다.

---
## AP-O-98 — No Decision Log
- Category: Measurement and observability
- Original IDs: O-98
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 왜 홈 구조를 바꿨는지 기록 없음

### 개선

작은 변경 로그를 남긴다.

```text
가설
변경
관찰 기간
결과
후속 결정
```

---
## AP-O-99 — Constant Optimization
- Category: Measurement and observability
- Original IDs: O-99
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 매주 구조와 제목을 변경

### 문제

지표가 안정화되기 전에 다시 바뀐다.

### 개선

명확한 개선 주기와 관찰 기간을 둔다.

---
