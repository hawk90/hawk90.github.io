---
title: "Metadata and schema (60 anti-patterns)"
category: metadata
item_count: 60
---
# Metadata and schema
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-M-01 — Schema Drift
- Category: Metadata and schema
- Original IDs: M-01
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 글마다 front matter 규칙이 다름

예:

```yaml
title:
date:
tags:
```

과거 글은 이 정도인데, 최근 글은:

```yaml
title:
description:
published:
updated:
series:
seriesOrder:
status:
topics:
```

까지 늘어난다.

### 문제

- fallback 코드가 계속 증가
- 어떤 필드가 필수인지 불명확
- 검색·시리즈·SEO 결과가 글마다 다름
- 오래된 글을 수정하기 어려움

### 개선

단일 schema를 정의하고 migration 경로를 둔다.

---
## AP-M-02 — Optional Field Explosion
- Category: Metadata and schema
- Original IDs: M-02
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 모든 metadata가 optional

### 증상

렌더링 코드가 다음처럼 된다.

```ts
if (post.data.description) ...
if (post.data.updated) ...
if (post.data.status) ...
if (post.data.series) ...
```

### 문제

실제 데이터 품질을 코드가 계속 보정하게 된다.

### 개선

핵심 필드는 필수로 두고, 특수한 필드만 optional로 둔다.

---
## AP-M-03 — Required Field Inflation
- Category: Metadata and schema
- Original IDs: M-03
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 반대로 모든 필드를 필수화

### 문제

짧은 Reference 글에도 audience, difficulty, lastVerified, series, prerequisites를 억지로 넣게 된다.

### 개선

콘텐츠 타입별 schema를 나눈다.

```text
Guide
Debug Note
Experiment
Reference
```

마다 필요한 필드가 다르다.

---
## AP-M-04 — One Schema for Every Content Type
- Category: Metadata and schema
- Original IDs: M-04
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 모든 글에 같은 metadata 구조 사용

### 문제

실험 글에는 환경·방법이 중요하고, 개념 글에는 선행 지식과 관련 개념이 중요하다.

### 개선

공통 필드와 타입별 확장 필드를 분리한다.

---
## AP-M-05 — Free-Text Enum
- Category: Metadata and schema
- Original IDs: M-05
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 상태·유형·난이도를 문자열로 자유 입력

```yaml
status: current
status: Current
status: active
status: up-to-date
```

### 문제

필터와 검색이 일관되게 동작하지 않는다.

### 개선

허용값을 enum으로 제한하고 alias를 migration에서 정리한다.

---
## AP-M-06 — Taxonomy Without Registry
- Category: Metadata and schema
- Original IDs: M-06
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### Topic과 Tag를 글마다 직접 생성

### 문제

- 오타
- 동의어
- 대소문자 차이
- 한글·영문 혼재
- 사용되지 않는 태그 증가

### 개선

중앙 taxonomy registry를 둔다.

---
## AP-M-07 — Series Metadata Duplication
- Category: Metadata and schema
- Original IDs: M-07
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 모든 글이 시리즈 이름과 설명을 반복 저장

### 문제

시리즈 이름 변경 시 여러 글을 수정해야 한다.

### 개선

시리즈 manifest에서 이름·설명·순서를 관리하고 글은 시리즈 ID만 참조한다.

---
## AP-M-08 — Derived Data Stored Manually
- Category: Metadata and schema
- Original IDs: M-08
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 읽기 시간·관련 글·이전/다음 글을 front matter에 직접 저장

### 문제

원본이 바뀌면 쉽게 stale 상태가 된다.

### 개선

파생 가능한 값은 빌드 시 계산한다.

---
## AP-M-09 — Generated Field Committed as Source
- Category: Metadata and schema
- Original IDs: M-09
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 자동 생성 description이나 keyword가 원본처럼 저장

### 문제

사람이 작성한 값과 자동 값의 경계가 사라진다.

### 개선

source metadata와 derived metadata를 분리한다.

---
## AP-M-10 — Hidden Defaults
- Category: Metadata and schema
- Original IDs: M-10
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 값이 없을 때 어떤 기본값이 적용되는지 모름

예:

```text
status 없음 → current?
difficulty 없음 → intermediate?
```

### 문제

오래된 글이 의도와 다르게 분류된다.

### 개선

기본값은 명시적으로 문서화하고, 가능한 경우 migration으로 실제 값을 채운다.

---
## AP-M-11 — Forever Backward Compatibility
- Category: Metadata and schema
- Original IDs: M-11
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 모든 과거 형식을 영원히 지원

### 증상

```ts
post.data.date ?? post.data.published ?? post.data.pubDate
```

### 문제

렌더링 코드가 데이터 역사 전체를 책임진다.

### 개선

한 번 migration하고 오래된 필드 지원을 제거한다.

---
## AP-M-12 — Big-Bang Migration
- Category: Metadata and schema
- Original IDs: M-12
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 수백 개 글을 한 번에 완벽히 바꾸려 함

### 문제

- 변경량이 지나치게 큼
- 검토 불가능
- 중간 상태가 없음
- 실패 시 되돌리기 어려움

### 개선

대표 글, 유입 상위 글, 현재 Topic 순으로 단계적으로 진행한다.

---
## AP-M-13 — Migration Without Dry Run
- Category: Metadata and schema
- Original IDs: M-13
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### migration 실행 즉시 파일 수정

### 문제

예상치 못한 대량 변경이 발생한다.

### 개선

```text
analyze
dry-run
report
apply
validate
```

단계를 분리한다.

---
## AP-M-14 — Migration Without Idempotency
- Category: Metadata and schema
- Original IDs: M-14
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 같은 migration을 두 번 실행하면 결과가 달라짐

### 문제

CI나 로컬에서 반복 실행하기 어렵다.

### 개선

migration은 여러 번 실행해도 동일 결과가 나오게 만든다.

---
## AP-M-15 — Migration Without Backup Boundary
- Category: Metadata and schema
- Original IDs: M-15
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 자동 수정 전에 변경 범위를 보존하지 않음

### 개선

Git branch 또는 명확한 commit boundary에서 실행하고 한 migration당 한 commit을 유지한다.

---
## AP-M-16 — Semantic Migration by Regex
- Category: Metadata and schema
- Original IDs: M-16
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 정규식만으로 Markdown 의미 구조 변경

### 문제

코드 블록, front matter, 링크, 수식 안의 문자열까지 잘못 수정할 수 있다.

### 개선

구조 변경은 parser 기반으로 처리하고 regex는 단순한 안전한 변경에만 사용한다.

---
## AP-M-17 — Path Migration Without Redirects
- Category: Metadata and schema
- Original IDs: M-17
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 파일과 URL을 이동했지만 redirect 없음

### 문제

외부 링크와 검색 유입이 깨진다.

### 개선

이전 slug map을 유지하고 최종 URL로 직접 redirect한다.

---
## AP-M-18 — Migration Without Validation
- Category: Metadata and schema
- Original IDs: M-18
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 수정 후 build만 성공하면 완료로 간주

### 문제

의미가 잘못됐지만 문법상 정상일 수 있다.

### 개선

- 스키마 검사
- 링크 검사
- diff 통계
- 샘플 렌더링
- 이전/이후 manifest 비교

를 수행한다.

---
## AP-M-19 — One Script per Symptom
- Category: Metadata and schema
- Original IDs: M-19
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 문제마다 새로운 스크립트 작성

```text
audit-links.py
fix-links.py
check-tags.py
check-series.py
check-dates.py
```

### 문제

공통 로직과 규칙이 분산된다.

### 개선

공통 parser·manifest·diagnostic framework 위에 rule을 추가한다.

---
## AP-M-20 — Every Script Parses Markdown Differently
- Category: Metadata and schema
- Original IDs: M-20
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### Node와 Python 도구가 서로 다른 parser 사용

### 문제

한 도구에서는 유효하고 다른 도구에서는 오류가 된다.

### 개선

공통 중간 manifest를 생성해 모든 도구가 소비하게 한다.

---
## AP-M-21 — Script as Undocumented Tribal Knowledge
- Category: Metadata and schema
- Original IDs: M-21
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 작성자만 실행 방법을 앎

### 증상

- 옵션 설명 없음
- 입력·출력 불명확
- 실패 코드 없음
- README에 이름만 존재

### 개선

각 명령에 `--help`, 목적, 예제, 실패 조건을 제공한다.

---
## AP-M-22 — Hidden Script Side Effects
- Category: Metadata and schema
- Original IDs: M-22
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### audit 명령인데 파일도 수정

### 문제

검사와 수정의 경계가 불명확하다.

### 개선

```text
audit:links
fix:links
```

처럼 읽기와 쓰기 명령을 분리한다.

---
## AP-M-23 — Auto-Fix Without Confidence
- Category: Metadata and schema
- Original IDs: M-23
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 불확실한 링크나 태그를 자동 수정

### 문제

기술적으로 유효하지만 의미상 틀린 연결이 생긴다.

### 개선

confidence threshold를 두고 애매한 경우 report만 생성한다.

---
## AP-M-24 — No Fixture Tests for Content Tools
- Category: Metadata and schema
- Original IDs: M-24
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 실제 전체 블로그로만 스크립트 검증

### 문제

작은 edge case를 재현하기 어렵다.

### 개선

테스트용 Markdown fixture를 둔다.

- 잘못된 front matter
- 코드 블록 안 링크
- 한글 slug
- 중복 시리즈 순서
- redirect alias

---
## AP-M-25 — Full Repository Scan for Every Command
- Category: Metadata and schema
- Original IDs: M-25
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 작은 검사도 모든 파일 탐색

### 문제

도구 사용이 느려지고 자주 실행하지 않게 된다.

### 개선

변경 파일 모드와 전체 모드를 분리한다.

---
## AP-M-26 — Tool Output as Unstructured Text
- Category: Metadata and schema
- Original IDs: M-26
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 결과가 터미널 문자열뿐

### 문제

CI annotation, dashboard, 자동 수정에 재사용하기 어렵다.

### 개선

사람용 출력과 JSON/SARIF 출력 옵션을 함께 제공한다.

---
## AP-M-27 — No Severity Model
- Category: Metadata and schema
- Original IDs: M-27
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 모든 문제를 동일하게 출력

### 개선

```text
error
warning
info
suggestion
```

으로 나누고 배포 차단 여부를 분리한다.

---
## AP-M-28 — Rule Without Rationale
- Category: Metadata and schema
- Original IDs: M-28
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### “description이 없습니다”만 출력

### 문제

왜 필요한지, 어떻게 고쳐야 하는지 알기 어렵다.

### 개선

진단 결과에 이유와 수정 예를 포함한다.

---
## AP-M-29 — Rule Explosion
- Category: Metadata and schema
- Original IDs: M-29
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 품질 규칙이 계속 늘어남

### 문제

글을 쓰기보다 lint를 만족시키는 작업이 된다.

### 개선

규칙마다 다음을 기록한다.

- 해결하는 실제 문제
- 오탐률
- 자동 수정 가능성
- 차단 여부
- 폐기 조건

---
## AP-M-30 — Linter as Editorial Authority
- Category: Metadata and schema
- Original IDs: M-30
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 기계 규칙이 글의 문체와 판단까지 지배

### 문제

모든 글이 같은 구조와 문장 리듬을 갖게 된다.

### 개선

정확성·일관성 규칙은 자동화하고, 설명 방식은 작성자의 판단을 남긴다.

---
## AP-M-31 — CI as the Only Reproducible Environment
- Category: Metadata and schema
- Original IDs: M-31
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 로컬에서는 전체 검증을 실행하기 어려움

### 문제

문제가 push 후에만 발견된다.

### 개선

CI와 같은 명령을 로컬에서도 실행할 수 있게 한다.

---
## AP-M-32 — Local and CI Command Divergence
- Category: Metadata and schema
- Original IDs: M-32
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 로컬 `npm run build`와 CI build가 다름

### 문제

로컬 성공 후 CI 실패가 반복된다.

### 개선

CI는 package script를 호출하고 별도 로직을 최소화한다.

---
## AP-M-33 — Hidden Environment Dependency
- Category: Metadata and schema
- Original IDs: M-33
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### CI에만 설치된 도구에 의존

예:

```text
LaTeX
Python package
system font
ImageMagick
```

### 개선

필수 의존성을 명시하고 bootstrap script 또는 container를 제공한다.

---
## AP-M-34 — Floating Tool Versions
- Category: Metadata and schema
- Original IDs: M-34
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### Node·Python·OS package 버전이 고정되지 않음

### 문제

어제 성공한 빌드가 오늘 실패할 수 있다.

### 개선

주요 런타임과 생성 도구 버전을 명시적으로 고정한다.

---
## AP-M-35 — CI Workflow Logic Duplication
- Category: Metadata and schema
- Original IDs: M-35
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 여러 workflow에 install·build·cache 설정 반복

### 문제

한 곳만 수정되어 동작이 달라진다.

### 개선

재사용 workflow 또는 composite action으로 공통화한다.

---
## AP-M-36 — Deploy on Every Branch Push
- Category: Metadata and schema
- Original IDs: M-36
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 불필요한 preview·artifact 생성

### 개선

브랜치와 변경 경로에 따라 실행 범위를 제한한다.

---
## AP-M-37 — No Path-Based Trigger
- Category: Metadata and schema
- Original IDs: M-37
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 문서 오탈자 수정에도 tooling 전체 테스트

### 개선

콘텐츠·UI·도구 변경에 따라 job을 나눈다.

단, 최종 main 배포에서는 통합 검사를 유지한다.

---
## AP-M-38 — CI Cache as a Mystery
- Category: Metadata and schema
- Original IDs: M-38
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 캐시가 왜 hit/miss 되는지 모름

### 문제

stale 결과나 낮은 효율을 방치한다.

### 개선

cache key와 대상 디렉터리를 문서화하고 hit ratio를 확인한다.

---
## AP-M-39 — Flaky Build Accepted as Normal
- Category: Metadata and schema
- Original IDs: M-39
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 가끔 메모리 부족이나 timeout이 발생

### 문제

재실행으로 넘기면 근본 원인이 누적된다.

### 개선

flaky 실패를 별도 issue로 추적하고 재시도는 보조 장치로만 사용한다.

---
## AP-M-40 — No Post-Deploy Verification
- Category: Metadata and schema
- Original IDs: M-40
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 배포 성공 메시지만 확인

### 개선

배포 후 대표 URL, 검색 인덱스, Sitemap, 주요 asset을 smoke test한다.

---
## AP-M-41 — Dependency Archaeology
- Category: Metadata and schema
- Original IDs: M-41
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 왜 설치했는지 모르는 패키지

### 문제

삭제하기 무서워 계속 남는다.

### 개선

각 주요 dependency의 목적을 기록한다.

---
## AP-M-42 — Feature Removed, Dependency Retained
- Category: Metadata and schema
- Original IDs: M-42
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### MDX나 편집 기능은 제거했지만 패키지는 남음

### 문제

설치·보안·업데이트 비용이 지속된다.

### 개선

기능 제거 checklist에 dependency, config, docs, tests 제거를 포함한다.

---
## AP-M-43 — Production and Tooling Dependencies Mixed
- Category: Metadata and schema
- Original IDs: M-43
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### editor-only·build-only 패키지가 모두 같은 범주

### 문제

의존성 역할을 파악하기 어렵다.

### 개선

runtime, build, editor, content-tools 역할을 분리한다.

---
## AP-M-44 — Dependency for a Trivial Function
- Category: Metadata and schema
- Original IDs: M-44
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 작은 slug 처리나 날짜 포맷 때문에 큰 패키지 설치

### 문제

업데이트와 공급망 표면이 커진다.

### 개선

패키지 도입 전 실제 절감되는 복잡성을 비교한다.

---
## AP-M-45 — Multiple Libraries for the Same Job
- Category: Metadata and schema
- Original IDs: M-45
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### Markdown parser나 날짜 라이브러리가 여러 개

### 문제

동작 차이와 번들·설치 비용이 증가한다.

### 개선

용도를 통합하거나 사용 범위를 명확히 분리한다.

---
## AP-M-46 — Unbounded Plugin Stack
- Category: Metadata and schema
- Original IDs: M-46
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### remark·rehype plugin이 계속 증가

### 문제

호환성·실행 순서·업그레이드 위험이 커진다.

### 개선

플러그인마다 필요성, 입력, 출력, 순서 의존성을 문서화한다.

---
## AP-M-47 — Major Upgrade by Habit
- Category: Metadata and schema
- Original IDs: M-47
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 기능상 필요 없이 최신 major로 즉시 이동

### 문제

콘텐츠 개선보다 migration 비용이 커진다.

### 개선

보안·지원 종료·명확한 이점이 있을 때 업그레이드한다.

---
## AP-M-48 — Frozen Dependencies Forever
- Category: Metadata and schema
- Original IDs: M-48
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 반대로 업데이트를 무기한 미룸

### 문제

나중에 한 번에 큰 migration이 필요해진다.

### 개선

정기적인 작은 업데이트와 major 업그레이드를 분리한다.

---
## AP-M-49 — Lockfile Without Reproducibility
- Category: Metadata and schema
- Original IDs: M-49
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### lockfile은 있지만 시스템 dependency가 고정되지 않음

### 개선

Node 외에 Python, LaTeX, font, image tools까지 포함한 환경 정의가 필요하다.

---
## AP-M-50 — Vulnerability Scanner as Upgrade Bot
- Category: Metadata and schema
- Original IDs: M-50
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 취약점 경고가 나오면 맥락 없이 모두 업데이트

### 문제

실제 사용하지 않는 경로의 경고 때문에 안정성을 해칠 수 있다.

### 개선

노출 여부와 실행 경로를 평가하고 제거·업데이트·완화 중 선택한다.

---
## AP-M-51 — README as Marketing Copy
- Category: Metadata and schema
- Original IDs: M-51
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 실제 상태보다 기능을 크게 설명

### 문제

구현과 문서가 어긋난다.

### 개선

현재 지원, 실험, 계획을 구분한다.

---
## AP-M-52 — Feature List Without Ownership
- Category: Metadata and schema
- Original IDs: M-52
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 기능은 나열되지만 어디서 구현되는지 모름

### 개선

핵심 기능에 source location과 책임 모듈을 연결한다.

---
## AP-M-53 — Stale Setup Guide
- Category: Metadata and schema
- Original IDs: M-53
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 설치 명령이 현재 버전과 맞지 않음

### 문제

새 환경에서 시작부터 실패한다.

### 개선

CI에서 setup 문서의 핵심 명령을 실제 실행해 검증할 수 있다.

---
## AP-M-54 — Architecture in Comments Only
- Category: Metadata and schema
- Original IDs: M-54
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 중요한 판단이 config 주석에만 남음

### 문제

파일을 바꾸거나 삭제하면 맥락이 사라진다.

### 개선

중요한 결정은 짧은 ADR로 남긴다.

---
## AP-M-55 — ADR Without Consequences
- Category: Metadata and schema
- Original IDs: M-55
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 결정만 기록

```text
Astro를 사용한다.
```

### 문제

왜 선택했고 무엇을 포기했는지 모른다.

### 개선

Context, Decision, Consequences를 기록한다.

---
## AP-M-56 — ADR as Immutable Law
- Category: Metadata and schema
- Original IDs: M-56
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 과거 결정을 절대 변경하지 않음

### 개선

결정 상태를 표시한다.

```text
accepted
superseded
deprecated
```

---
## AP-M-57 — Documentation Duplication
- Category: Metadata and schema
- Original IDs: M-57
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### README, Wiki, 코드 주석에 같은 설명 반복

### 문제

한 곳만 갱신되어 충돌한다.

### 개선

한 곳을 source of truth로 두고 다른 곳에서는 링크한다.

---
## AP-M-58 — No Operational Runbook
- Category: Metadata and schema
- Original IDs: M-58
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 배포 실패·검색 인덱스 오류·OG 실패 대응법 없음

### 개선

자주 발생하는 운영 문제의 진단과 복구 절차를 짧게 정리한다.

---
## AP-M-59 — No Content Authoring Guide
- Category: Metadata and schema
- Original IDs: M-59
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 글 작성 규칙이 암묵적

### 문제

미래의 본인도 예전 규칙을 잊는다.

### 개선

- 제목
- description
- 코드 블록 언어
- 이미지 경로
- 콘텐츠 타입
- 검증 정보

에 대한 최소 가이드를 둔다.

---
## AP-M-60 — Documentation Without Deletion
- Category: Metadata and schema
- Original IDs: M-60
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 제거된 기능 문서가 계속 남음

### 개선

기능 삭제 시 문서 검색과 정리를 checklist에 포함한다.

---
