---
title: "Measurement and observability (60 anti-patterns)"
category: observability
item_count: 60
---
# Measurement and observability
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-O-01 — Analytics Without a Question
- Category: Measurement and observability
- Original IDs: O-01
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 질문 없이 분석 도구부터 설치

### 증상

- 페이지뷰를 매일 확인
- 방문자 수는 알지만 무엇을 바꿀지 모름
- 이벤트는 많지만 의사결정에 쓰지 않음

### 개선

먼저 질문을 정한다.

```text
어떤 Topic Hub가 실제 탐색을 만든다?
검색 사용자는 원하는 글을 찾는가?
대표 글 20개가 내부 이동을 만드는가?
```

---
## AP-O-02 — Pageview as Success
- Category: Measurement and observability
- Original IDs: O-02
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 페이지뷰가 많으면 성공이라고 판단

### 문제

기술 글은 검색 결과에서 잠깐 열렸다 바로 닫혀도 페이지뷰가 발생한다.

### 함께 볼 지표

- 다음 내부 페이지 이동
- Topic Hub 이동
- 검색 후 결과 클릭
- 재방문
- 관련 글 선택
- 오류 제보
- 외부 코드·자료 링크 사용

---
## AP-O-03 — Traffic Without Intent
- Category: Measurement and observability
- Original IDs: O-03
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 모든 방문자를 같은 트래픽으로 봄

다음 방문은 의미가 다르다.

```text
정확한 오류 검색
개념 학습
시리즈 탐색
이력서·포트폴리오 확인
우연한 유입
```

### 개선

페이지 유형과 검색 의도를 분리해서 본다.

---
## AP-O-04 — Sitewide Average Trap
- Category: Measurement and observability
- Original IDs: O-04
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 사이트 전체 평균만 확인

예:

```text
평균 체류시간 2분
평균 이탈률 70%
```

### 문제

Reference 글과 장문 Guide를 같은 기준으로 평가할 수 없다.

### 개선

다음 단위로 나눈다.

```text
Content Type
Topic
길이
유입 채널
신규/재방문
모바일/데스크톱
```

---
## AP-O-05 — Bounce Rate Panic
- Category: Measurement and observability
- Original IDs: O-05
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 이탈률이 높으면 글이 나쁘다고 판단

특정 에러 해결 글은 한 페이지만 읽고 문제를 해결한 뒤 떠나는 것이 정상일 수 있다.

### 개선

페이지 목적에 맞는 성공 조건을 둔다.

```text
Debug Note:
정답을 빠르게 찾는 것

Guide:
다음 글이나 Topic Hub로 이동하는 것
```

---
## AP-O-06 — Time-on-Page as Understanding
- Category: Measurement and observability
- Original IDs: O-06
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 오래 머물면 잘 읽었다고 판단

### 문제

- 탭을 열어두었을 수 있음
- 이해가 어려워 오래 걸렸을 수 있음
- 코드 복사를 위해 방치했을 수 있음

### 개선

시간은 보조 지표로만 사용한다.

---
## AP-O-07 — Scroll Depth as Completion
- Category: Measurement and observability
- Original IDs: O-07
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 100% 스크롤을 완독으로 간주

### 문제

빠르게 끝까지 내렸을 수도 있고, TOC 링크로 이동했을 수도 있다.

### 개선

- 주요 섹션 도달
- 결론 노출
- 다음 글 클릭
- 코드 복사
- 허브 이동

등과 함께 본다.

---
## AP-O-08 — Event Everything
- Category: Measurement and observability
- Original IDs: O-08
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 모든 클릭을 이벤트로 수집

### 문제

- 데이터 비용 증가
- 개인정보 흐름 확대
- 분석이 복잡해짐
- 의미 없는 이벤트가 대부분

### 개선

실제 결정과 연결되는 이벤트만 남긴다.

---
## AP-O-09 — Event Naming Drift
- Category: Measurement and observability
- Original IDs: O-09
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 같은 행동을 여러 이름으로 기록

```text
search_click
search-result-click
click_search_result
```

### 문제

대시보드와 비교가 어려워진다.

### 개선

이벤트 taxonomy를 짧게 정의한다.

---
## AP-O-10 — Analytics Schema Without Versioning
- Category: Measurement and observability
- Original IDs: O-10
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 이벤트 구조를 바꾸지만 변경 시점을 기록하지 않음

### 문제

이전 데이터와 이후 데이터를 같은 기준으로 비교하게 된다.

### 개선

이벤트 버전 또는 배포 시점을 남긴다.

---
## AP-O-100 — Measurement as Product
- Category: Measurement and observability
- Original IDs: O-100
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 측정 체계 구축 자체가 목적

### 문제

블로그와 콘텐츠 개선보다 dashboard와 event 설계에 시간을 더 쓴다.

### 개선

측정은 다음 세 질문에만 답하면 충분하다.

```text
독자가 원하는 글을 찾는가?
대표 콘텐츠로 이어지는가?
사이트 변경이 실제로 나아졌는가?
```

---
## AP-O-11 — Impression Obsession
- Category: Measurement and observability
- Original IDs: O-11
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 노출 수 증가만 성공으로 판단

### 문제

관련성이 낮은 검색어에 많이 노출될 수도 있다.

### 함께 볼 것

```text
검색어 의도
평균 순위
클릭률
실제 페이지 만족도
내부 이동
```

---
## AP-O-12 — CTR Without Position Context
- Category: Measurement and observability
- Original IDs: O-12
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### CTR이 낮다고 제목을 즉시 변경

### 문제

평균 순위 20위의 CTR과 2위의 CTR은 비교할 수 없다.

### 개선

순위 구간과 검색어 의도를 함께 본다.

---
## AP-O-13 — Average Position Worship
- Category: Measurement and observability
- Original IDs: O-13
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 평균 순위 한 숫자에 집중

### 문제

서로 다른 검색어·국가·기기·페이지가 섞인다.

### 개선

핵심 검색어군과 대표 페이지 단위로 추적한다.

---
## AP-O-14 — Query Chasing
- Category: Measurement and observability
- Original IDs: O-14
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### Search Console에 새 검색어가 보이면 곧바로 새 글 작성

### 문제

비슷한 글이 계속 늘고 Topic Cannibalization이 발생한다.

### 개선

먼저 판단한다.

```text
기존 글 보완?
FAQ 추가?
소제목 추가?
새 독립 글?
```

---
## AP-O-15 — Zero-Click Misdiagnosis
- Category: Measurement and observability
- Original IDs: O-15
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 노출은 많은데 클릭이 적으면 무조건 실패

### 가능성

- 검색 결과에서 답이 이미 보임
- 제목이 검색 의도와 다름
- 순위가 낮음
- 다른 페이지가 더 대표적임

원인을 구분해야 한다.

---
## AP-O-16 — Index Coverage as a Score
- Category: Measurement and observability
- Original IDs: O-16
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 색인된 페이지 수가 많을수록 좋다고 생각

### 문제

얕은 태그·아카이브 페이지까지 색인될 수 있다.

### 개선

색인 수보다 **색인할 가치가 있는 페이지가 제대로 색인됐는가**를 본다.

---
## AP-O-17 — “Crawled, Not Indexed” Mass Fix
- Category: Measurement and observability
- Original IDs: O-17
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 해당 상태의 모든 페이지를 억지로 색인시키려 함

### 문제

일부 페이지는 실제로 색인 가치가 낮을 수 있다.

### 개선

다음으로 분류한다.

```text
핵심 글
중복 글
얕은 목록
구판
Draft/실험 페이지
```

---
## AP-O-18 — URL Inspection as a Workflow
- Category: Measurement and observability
- Original IDs: O-18
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 페이지마다 수동 색인 요청

### 문제

구조적 문제를 수동 요청으로 가린다.

### 개선

내부 링크·Sitemap·canonical·콘텐츠 품질을 먼저 수정한다.

---
## AP-O-19 — Search Console Without Change Log
- Category: Measurement and observability
- Original IDs: O-19
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 제목·구조·canonical 변경 후 기록 없음

### 문제

몇 주 뒤 지표 변화의 원인을 찾기 어렵다.

### 개선

SEO 변경 로그를 유지한다.

---
## AP-O-20 — Short Evaluation Window
- Category: Measurement and observability
- Original IDs: O-20
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 변경 후 며칠만 보고 성공·실패 판단

검색 반영에는 시간이 걸릴 수 있다.

### 개선

변경 규모에 따라 관찰 기간을 정하고 성급한 재변경을 피한다.

---
## AP-O-21 — Lab Data as Reality
- Category: Measurement and observability
- Original IDs: O-21
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### Lighthouse 결과만으로 실제 사용자 경험을 판단

### 문제

테스트 환경과 실제 기기·네트워크는 다르다.

### 개선

lab data와 field data를 함께 본다.

---
## AP-O-22 — Field Data Without Page Type
- Category: Measurement and observability
- Original IDs: O-22
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 사이트 전체 Core Web Vitals만 확인

### 문제

홈·일반 글·코드가 많은 글·검색 페이지의 병목이 다르다.

### 개선

페이지 유형별로 측정한다.

---
## AP-O-23 — Lighthouse 100 Theater
- Category: Measurement and observability
- Original IDs: O-23
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 100점이 아니면 실패

### 문제

사용자가 체감하지 못하는 미세 최적화에 시간을 쓴다.

### 개선

임계값을 넘은 뒤에는 콘텐츠와 탐색 문제를 우선한다.

---
## AP-O-24 — Synthetic Benchmark Drift
- Category: Measurement and observability
- Original IDs: O-24
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 테스트 환경이 계속 바뀜

### 문제

이전 결과와 비교할 수 없다.

### 개선

- 기기
- 네트워크
- 브라우저
- 페이지
- 캐시 상태

를 고정한다.

---
## AP-O-25 — Homepage-Only Performance
- Category: Measurement and observability
- Original IDs: O-25
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 홈만 측정

### 문제

실제 검색 유입은 긴 글 페이지로 들어올 가능성이 높다.

### 개선

대표 페이지 세트를 둔다.

```text
홈
일반 글
코드 많은 글
수식·다이어그램 글
검색
Topic Hub
```

---
## AP-O-26 — Best-Case Page Benchmark
- Category: Measurement and observability
- Original IDs: O-26
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 이미지와 코드가 거의 없는 가벼운 글만 테스트

### 개선

최악 또는 상위 95% 복잡도 페이지를 포함한다.

---
## AP-O-27 — No Performance Regression Baseline
- Category: Measurement and observability
- Original IDs: O-27
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 최적화 전 수치가 없음

### 문제

변경이 실제로 좋아졌는지 알 수 없다.

### 개선

배포별 주요 수치를 보존한다.

---
## AP-O-28 — Single Run Performance Test
- Category: Measurement and observability
- Original IDs: O-28
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 한 번의 Lighthouse 결과로 판단

### 문제

네트워크·CPU 노이즈가 크다.

### 개선

여러 번 측정하고 중앙값을 사용한다.

---
## AP-O-29 — Bundle Size Without Execution Cost
- Category: Measurement and observability
- Original IDs: O-29
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### JS 파일 크기만 확인

### 문제

작은 파일도 실행 비용이 클 수 있고, 큰 파일도 거의 실행되지 않을 수 있다.

### 개선

- 다운로드
- parse
- compile
- execution
- main-thread blocking

을 함께 본다.

---
## AP-O-30 — Performance Dashboard Without Ownership
- Category: Measurement and observability
- Original IDs: O-30
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 지표는 있지만 누가 어떤 조건에서 고칠지 없음

### 개선

예산 초과 시 대응 규칙을 정한다.

---
## AP-O-31 — Search Usage as Success
- Category: Measurement and observability
- Original IDs: O-31
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 검색 사용률이 높으면 검색이 좋다고 생각

### 반대 가능성

내비게이션이 나빠서 검색에 의존할 수도 있다.

### 개선

검색 사용률과 Topic 탐색 성공률을 함께 본다.

---
## AP-O-32 — No-Result Query Ignored
- Category: Measurement and observability
- Original IDs: O-32
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 결과 없는 검색어를 수집하지 않음

### 개선

개인정보를 최소화하면서 다음을 확인한다.

- 용어 alias 부족
- 한글·영문 차이
- 실제 콘텐츠 공백
- 오타

---
## AP-O-33 — Search Query Collection Without Privacy
- Category: Measurement and observability
- Original IDs: O-33
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 사용자가 입력한 전체 검색어를 외부 Analytics로 전송

### 문제

회사명·오류 메시지·내부 식별자가 들어갈 수 있다.

### 개선

가능하면 집계형으로 처리하거나 로컬 분석을 고려한다.

---
## AP-O-34 — Search Click Without Success Signal
- Category: Measurement and observability
- Original IDs: O-34
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 결과 클릭만 측정

### 문제

잘못 클릭했을 수도 있다.

### 개선

검색 후 다음 행동을 함께 본다.

```text
즉시 뒤로 가기
본문 체류
다음 내부 이동
검색 재시도
```

---
## AP-O-35 — Search Ranking Changed Without Evaluation Set
- Category: Measurement and observability
- Original IDs: O-35
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 알고리즘을 바꾸고 체감으로만 판단

### 개선

대표 검색어와 기대 결과 목록을 만든다.

예:

```text
"PCIe BAR"
"CXL NUMA"
"CUDA pinned memory"
"UEFI secure boot"
```

---
## AP-O-36 — Popular Query Bias
- Category: Measurement and observability
- Original IDs: O-36
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 많이 검색된 주제만 개선

### 문제

희귀하지만 중요한 전문 검색어가 무시된다.

### 개선

빈도와 중요도를 별도로 평가한다.

---
## AP-O-37 — Search Metrics Distorted by Author
- Category: Measurement and observability
- Original IDs: O-37
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 본인이 테스트한 검색이 사용자 데이터에 섞임

### 개선

개발·관리자 트래픽을 제외하거나 별도로 표시한다.

---
## AP-O-38 — Search Index Size Without Query Quality
- Category: Measurement and observability
- Original IDs: O-38
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 인덱스를 줄이는 것만 목표

### 문제

필요한 본문 정보까지 제거할 수 있다.

### 개선

크기와 검색 품질을 함께 평가한다.

---
## AP-O-39 — Search Quality by Anecdote
- Category: Measurement and observability
- Original IDs: O-39
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 검색 한두 번 잘 되면 충분하다고 판단

### 개선

정확도 평가 세트를 만든다.

```text
정확한 제목 검색
약어 검색
한글·영문 검색
오류 메시지 검색
상위 개념 검색
```

---
## AP-O-40 — Zero-Result Auto-Content Generation
- Category: Measurement and observability
- Original IDs: O-40
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 검색 결과가 없으면 자동으로 새 글 후보 생성

### 문제

노이즈·오타·민감 검색어를 콘텐츠 계획으로 오인할 수 있다.

### 개선

반복 빈도, 기존 글 보완 가능성, 사이트 정체성을 함께 판단한다.

---
## AP-O-41 — Every Article Needs Traffic
- Category: Measurement and observability
- Original IDs: O-41
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 모든 글이 높은 유입을 가져야 한다고 생각

### 문제

Reference·희귀 장애 기록은 트래픽이 적어도 가치가 높을 수 있다.

### 개선

콘텐츠 역할별 성공 기준을 둔다.

---
## AP-O-42 — Low Traffic Means Delete
- Category: Measurement and observability
- Original IDs: O-42
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 방문이 적은 글을 자동 삭제 후보로 분류

### 문제

- 신규 글
- 희귀한 전문 글
- 내부 선행 개념
- 포트폴리오 가치

를 놓칠 수 있다.

### 개선

트래픽 외에 구조적 중요성과 독창성을 본다.

---
## AP-O-43 — High Traffic Means Good
- Category: Measurement and observability
- Original IDs: O-43
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 많이 방문한 글을 무조건 대표 문서로 선정

### 문제

제목이 자극적이거나 넓은 검색어에 우연히 걸렸을 수 있다.

### 개선

정확성·전문성·내부 연결·전환을 함께 본다.

---
## AP-O-44 — Traffic-Only Featured Content
- Category: Measurement and observability
- Original IDs: O-44
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 홈 Featured가 인기순 자동 정렬

### 문제

사이트가 이미 잘되는 주제만 반복 강조한다.

### 개선

편집자 선정과 데이터를 함께 사용한다.

---
## AP-O-45 — No Content Cohort Analysis
- Category: Measurement and observability
- Original IDs: O-45
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 글을 모두 한 덩어리로 비교

### 개선

```text
발행 연도
콘텐츠 타입
Topic
업데이트 여부
직접 실험 포함 여부
```

로 묶어서 비교한다.

---
## AP-O-46 — New vs Updated Content Confusion
- Category: Measurement and observability
- Original IDs: O-46
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 신규 글과 기존 글 업데이트 효과를 구분하지 않음

### 개선

두 작업의 성과를 별도로 기록한다.

---
## AP-O-47 — No Internal Journey Analysis
- Category: Measurement and observability
- Original IDs: O-47
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 어떤 글을 읽고 다음 어디로 이동하는지 모름

### 개선

대표 학습 경로를 확인한다.

```text
Topic Hub
→ Guide
→ Concept
→ Debug Note
```

---
## AP-O-48 — Funnel Thinking for Every Reader
- Category: Measurement and observability
- Original IDs: O-48
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 블로그를 판매 전환 funnel처럼만 분석

### 문제

기술 지식 사이트의 목표는 학습·문제 해결·신뢰 형성일 수 있다.

### 개선

독자 목적에 맞는 journey를 정의한다.

---
## AP-O-49 — Completion Rate Without Content Type
- Category: Measurement and observability
- Original IDs: O-49
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 모든 글에 같은 완독 기준

### 개선

Reference는 빠른 정보 발견, Guide는 주요 섹션 소비처럼 다르게 본다.

---
## AP-O-50 — No Qualitative Feedback
- Category: Measurement and observability
- Original IDs: O-50
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 숫자만 보고 판단

### 문제

왜 어려웠는지, 무엇이 부족했는지 알 수 없다.

### 개선

- 댓글
- 오류 제보
- 짧은 피드백
- GitHub Issue
- 독자 인터뷰

를 제한적으로 활용한다.

---
## AP-O-51 — RPM as the Primary Product Metric
- Category: Measurement and observability
- Original IDs: O-51
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 광고 수익을 사이트 품질의 대표 지표로 사용

### 문제

광고가 잘 보이는 구조와 좋은 기술 문서 구조는 충돌할 수 있다.

### 개선

수익은 제약 조건 안에서 최적화한다.

---
## AP-O-52 — Revenue Without Page-Type Segmentation
- Category: Measurement and observability
- Original IDs: O-52
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 모든 페이지의 광고 성과를 합쳐 봄

### 문제

긴 Guide와 짧은 Reference의 광고 기회가 다르다.

### 개선

페이지 유형별 수익과 사용자 경험을 분리해서 본다.

---
## AP-O-53 — High Revenue, Poor Experience Ignored
- Category: Measurement and observability
- Original IDs: O-53
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 광고 수익이 늘면 CLS·이탈·읽기 방해를 무시

### 개선

다음을 같이 본다.

```text
RPM
CLS
페이지 체류
내부 이동
모바일 종료
광고 차단 증가
```

---
## AP-O-54 — Ad Click Optimization
- Category: Measurement and observability
- Original IDs: O-54
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 광고 클릭을 늘리는 배치 실험

### 문제

오인 클릭이나 콘텐츠 방해를 유도할 수 있다.

### 개선

광고는 콘텐츠와 명확히 구분하고 클릭이 아니라 장기적인 페이지 경험과 정책 준수를 우선한다.

---
## AP-O-55 — Auto Ads as a Black Box
- Category: Measurement and observability
- Original IDs: O-55
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 자동 광고가 어디에 들어가는지 모름

### 개선

페이지 유형별 실제 삽입 위치를 검토하고 제외 영역을 관리한다.

---
## AP-O-56 — Revenue Data Without Traffic Quality
- Category: Measurement and observability
- Original IDs: O-56
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 수익 증가가 검색 품질 개선 때문인지 광고 밀도 증가 때문인지 모름

### 개선

트래픽·광고 설정·페이지 구조 변경을 구분해서 기록한다.

---
## AP-O-57 — Ad Experiment Without Guardrails
- Category: Measurement and observability
- Original IDs: O-57
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 광고 개수와 위치를 자유롭게 실험

### 개선

다음 안전 기준을 둔다.

```text
본문 시작 전 광고 금지
코드-설명 사이 금지
절차 중간 금지
CLS 예산
모바일 고정 광고 제한
```

---
## AP-O-58 — Short-Term Revenue Winner
- Category: Measurement and observability
- Original IDs: O-58
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 며칠 수익이 높은 배치를 채택

### 문제

요일·트래픽 구성·광고 입찰 변동에 영향을 받는다.

### 개선

충분한 기간과 표본을 확보하고 사용자 경험 지표도 함께 본다.

---
## AP-O-59 — AdSense Rejection as Analytics Problem
- Category: Measurement and observability
- Original IDs: O-59
- Source messages: 95281689-fcc5-4aaa-a656-841196372a9d
- Merge status: canonical source
### Source material
### 승인 거절 원인을 지표 부족으로 해석

### 문제

실제 문제는 콘텐츠·신뢰·색인·정책일 수 있다.

### 개선

승인 전에는 수익 분석보다 사이트 품질 감사를 우선한다.

---
