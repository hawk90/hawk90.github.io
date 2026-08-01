---
title: "Catalog and review methodology (60 anti-patterns)"
category: methodology
item_count: 60
---
# Catalog and review methodology
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-D-35 — Frequency Ignored
- Category: Catalog and review methodology
- Original IDs: D-35
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 드물게 발생하는 큰 문제에만 집중

### 문제

매번 글을 쓸 때 발생하는 작은 마찰이 더 큰 총비용을 만들 수 있다.

### 개선

```text
영향 × 빈도
```

를 함께 평가한다.

---
## AP-D-36 — Blast Radius Ignored
- Category: Catalog and review methodology
- Original IDs: D-36
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 한 파일 문제와 전체 사이트 문제를 같은 우선순위로 봄

### 개선

영향 범위를 구분한다.

```text
한 글
한 Topic
한 페이지 유형
전체 사이트
배포 전체
```

---
## AP-D-37 — Confidence Ignored
- Category: Catalog and review methodology
- Original IDs: D-37
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 추측성 문제와 확인된 문제를 동일하게 처리

### 개선

확신도를 표시한다.

```text
confirmed
probable
possible
unknown
```

---
## AP-D-38 — Reversibility Ignored
- Category: Catalog and review methodology
- Original IDs: D-38
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 되돌리기 어려운 변경을 쉽게 시행

예:

- URL 전체 변경
- 콘텐츠 전면 migration
- 글 대량 삭제
- taxonomy 전환

### 개선

되돌리기 어려울수록 더 강한 검증과 단계적 rollout을 요구한다.

---
## AP-D-39 — Dependency Order Ignored
- Category: Catalog and review methodology
- Original IDs: D-39
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 선행 작업 없이 후속 기능부터 구현

예:

```text
지식 그래프 시각화
전에
canonical Topic과 relation schema가 없음
```

### 개선

작업 의존성을 먼저 정한다.

---
## AP-D-40 — Priority Churn
- Category: Catalog and review methodology
- Original IDs: D-40
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 새 문제가 보일 때마다 우선순위 변경

### 문제

진행 중 작업이 계속 중단된다.

### 개선

한 sprint 동안은 긴급 오류가 아닌 이상 우선순위를 고정한다.

---
## AP-D-41 — False Precision Score
- Category: Catalog and review methodology
- Original IDs: D-41
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 정교해 보이는 점수

```text
위험 점수 8.73
SEO 영향 6.42
```

### 문제

주관적 판단을 객관적 수치처럼 보이게 한다.

### 개선

3~5단계 정도의 거친 등급이면 충분하다.

---
## AP-D-42 — One Composite Score
- Category: Catalog and review methodology
- Original IDs: D-42
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 모든 요소를 하나의 숫자로 합침

### 문제

왜 높은 점수인지 알기 어렵다.

### 개선

영향도·비용·확신도를 별도로 보여준다.

---
## AP-D-43 — Score Determines Decision Automatically
- Category: Catalog and review methodology
- Original IDs: D-43
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 점수가 높은 항목은 무조건 실행

### 문제

전략적 방향과 작업 의존성을 놓친다.

### 개선

점수는 토론 순서를 돕는 도구로 사용한다.

---
## AP-D-44 — Gaming the Score
- Category: Catalog and review methodology
- Original IDs: D-44
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 측정 가능한 항목만 개선

예:

- 내부 링크 개수 증가
- description 채우기
- 글자 수 늘리기

### 문제

실제 정보 가치가 개선되지 않을 수 있다.

### 개선

수치와 샘플 수동 검토를 함께 둔다.

---
## AP-D-45 — Score Without Baseline
- Category: Catalog and review methodology
- Original IDs: D-45
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 현재 상태를 모른 채 목표 점수 설정

### 개선

먼저 현재 분포를 확인한다.

---
## AP-D-46 — Static Score Forever
- Category: Catalog and review methodology
- Original IDs: D-46
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 한번 평가한 위험도를 갱신하지 않음

### 문제

구조 변경으로 해결됐거나 더 심각해졌을 수 있다.

### 개선

주요 리팩토링 이후 재평가한다.

---
## AP-D-47 — Sitewide Score Hides Distribution
- Category: Catalog and review methodology
- Original IDs: D-47
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 사이트 전체 SEO 품질 72점

### 문제

대표 글은 좋고 태그 페이지는 나쁜 식의 차이를 숨긴다.

### 개선

페이지 유형과 Topic별 분포를 본다.

---
## AP-D-48 — Scoring Every Article
- Category: Catalog and review methodology
- Original IDs: D-48
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 모든 글을 복잡한 품질 점수로 평가

### 문제

운영 비용이 과도해진다.

### 개선

대표 글과 개선 후보부터 적용한다.

---
## AP-D-49 — No “Do Nothing” Option
- Category: Catalog and review methodology
- Original IDs: D-49
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 발견한 문제는 반드시 수정

### 문제

수정 비용이 이익보다 큰 항목도 있다.

### 개선

결정 상태를 둔다.

```text
fix
monitor
accept
defer
not applicable
```

---
## AP-D-50 — Risk Acceptance Without Reason
- Category: Catalog and review methodology
- Original IDs: D-50
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### “일단 둔다”로 끝

### 개선

수용 이유와 재검토 조건을 짧게 기록한다.

---
## AP-D-51 — Anti-pattern to Mega-Project
- Category: Catalog and review methodology
- Original IDs: D-51
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 하나의 문제를 큰 프로젝트로 확대

예:

```text
관련 글이 부정확함
→ 지식 그래프 플랫폼 개발
```

### 개선

가장 작은 유효 개선부터 적용한다.

```text
대표 글 20개의 관련 링크 수동 수정
```

---
## AP-D-52 — No Smallest Safe Change
- Category: Catalog and review methodology
- Original IDs: D-52
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 최종 구조만 설계

### 문제

중간에 사용자 가치를 전달하지 못한다.

### 개선

각 작업에 최소 배포 단위를 둔다.

---
## AP-D-53 — Refactor Without Baseline
- Category: Catalog and review methodology
- Original IDs: D-53
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 개선 전 상태를 기록하지 않음

### 문제

효과를 판단할 수 없다.

### 개선

작업 유형에 맞는 baseline을 남긴다.

---
## AP-D-54 — Refactor Without Acceptance Criteria
- Category: Catalog and review methodology
- Original IDs: D-54
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### “검색을 개선한다”

### 문제

언제 완료인지 알 수 없다.

### 개선 예:

```text
대표 검색어 20개에서
예상 문서가 상위 3개 안에 포함된다.
```

---
## AP-D-55 — Acceptance Criteria as Implementation Detail
- Category: Catalog and review methodology
- Original IDs: D-55
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
```text
MiniSearch를 사용한다.
JSON을 세 파일로 나눈다.
```

### 문제

사용자 결과가 아니라 구현 방식을 완료 기준으로 삼는다.

### 개선

결과를 기준으로 작성한다.

---
## AP-D-56 — No Negative Acceptance Criteria
- Category: Catalog and review methodology
- Original IDs: D-56
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 무엇을 개선할지만 정의

### 개선

깨지면 안 되는 것도 정한다.

```text
검색 품질 개선
단, 초기 JS와 index 크기는 기존 대비 20% 이상 증가하지 않는다.
```

---
## AP-D-57 — Big-Bang Rollout
- Category: Catalog and review methodology
- Original IDs: D-57
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 홈·검색·taxonomy·URL을 한 번에 변경

### 문제

원인 분석과 rollback이 어려워진다.

### 개선

순차적으로 배포한다.

---
## AP-D-58 — Migration and Redesign Combined
- Category: Catalog and review methodology
- Original IDs: D-58
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 콘텐츠 schema 변경과 UI redesign을 동시에 진행

### 문제

데이터 오류와 표현 오류를 구분하기 어렵다.

### 개선

```text
schema
→ migration
→ 검증
→ UI 적용
```

순서를 사용한다.

---
## AP-D-59 — No Pilot Scope
- Category: Catalog and review methodology
- Original IDs: D-59
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 처음부터 모든 글에 적용

### 개선

대표 Topic이나 20개 글로 pilot을 진행한다.

---
## AP-D-60 — Pilot That Avoids Hard Cases
- Category: Catalog and review methodology
- Original IDs: D-60
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 가장 깨끗한 글만 선택

### 문제

실제 migration 위험을 파악하지 못한다.

### 개선

다음을 섞는다.

```text
신규 글
오래된 글
긴 글
짧은 글
시리즈 글
특수 문법 글
```

---
## AP-D-61 — Tool Before Policy
- Category: Catalog and review methodology
- Original IDs: D-61
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 자동화부터 만들고 규칙은 나중에 정함

예:

```text
상태 migration script를 만듦
하지만 current와 historical 기준이 없음
```

### 개선

사람이 적용 가능한 정책을 먼저 정한다.

---
## AP-D-62 — Policy Without Examples
- Category: Catalog and review methodology
- Original IDs: D-62
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 원칙은 있지만 판단하기 어려움

### 개선

좋은 사례, 나쁜 사례, 경계 사례를 함께 둔다.

---
## AP-D-63 — Automatic Fix by Default
- Category: Catalog and review methodology
- Original IDs: D-63
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 검사 결과를 바로 수정

### 문제

의미적 오류가 대량 발생할 수 있다.

### 개선

기본은 report와 dry-run으로 둔다.

---
## AP-D-64 — Manual Everything
- Category: Catalog and review methodology
- Original IDs: D-64
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 안전을 이유로 모든 파일을 직접 수정

### 문제

반복적이고 실수가 발생한다.

### 개선

기계적 변환과 의미 판단을 분리한다.

```text
기계적 변환 → 자동화
의미 선택 → 사람
```

---
## AP-D-65 — No Idempotency
- Category: Catalog and review methodology
- Original IDs: D-65
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 같은 개선 스크립트를 재실행하면 계속 변경

### 개선

migration과 fixer는 반복 실행 안정성을 가져야 한다.

---
## AP-D-66 — No Partial Failure Strategy
- Category: Catalog and review methodology
- Original IDs: D-66
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 500개 중 한 파일 오류로 전체 작업 실패 또는 반대로 무시

### 개선

실패 파일을 명확히 보고하고 안전한 파일만 처리할지 정책을 정한다.

---
## AP-D-67 — Hidden Mutation
- Category: Catalog and review methodology
- Original IDs: D-67
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### audit 명령이 파일을 바꿈

### 개선

검사와 수정 명령을 분리한다.

---
## AP-D-68 — Generated Diff Overload
- Category: Catalog and review methodology
- Original IDs: D-68
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 자동화가 수천 줄 formatting 변경까지 만듦

### 문제

의미 변경 검토가 어렵다.

### 개선

formatter와 semantic migration을 분리한다.

---
## AP-D-69 — No Review Sampling
- Category: Catalog and review methodology
- Original IDs: D-69
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 대량 자동 변경을 전체 눈으로 보거나 전혀 보지 않음

### 개선

위험 유형별 표본을 검토한다.

---
## AP-D-70 — No Rollback Boundary
- Category: Catalog and review methodology
- Original IDs: D-70
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 여러 종류의 개선을 한 commit에 적용

### 개선

작업 유형별 commit과 branch 경계를 둔다.

---
## AP-D-71 — Done When Merged
- Category: Catalog and review methodology
- Original IDs: D-71
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 코드가 main에 들어가면 완료

### 개선

실제 production에서 결과를 확인한다.

---
## AP-D-72 — Validate Only the Happy Path
- Category: Catalog and review methodology
- Original IDs: D-72
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 대표 페이지 하나만 확인

### 개선

변경 영향이 큰 경계 사례를 포함한다.

---
## AP-D-73 — Measure Immediately
- Category: Catalog and review methodology
- Original IDs: D-73
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 배포 직후 SEO·사용자 지표 판단

### 문제

검색 반영과 사용자 행동에 시간이 필요하다.

### 개선

기술 검증과 장기 효과 검증을 분리한다.

```text
즉시:
빌드·UI·링크

후속:
검색·사용자 이동·성능 추세
```

---
## AP-D-74 — No Before–After Samples
- Category: Catalog and review methodology
- Original IDs: D-74
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 수치만 비교하고 실제 페이지를 보지 않음

### 개선

대표 페이지와 query를 전후 비교한다.

---
## AP-D-75 — Success Means No Regression
- Category: Catalog and review methodology
- Original IDs: D-75
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 깨지지 않았으면 개선 성공

### 문제

실제 사용자 가치가 늘지 않았을 수 있다.

### 개선

목표한 행동이나 품질이 개선됐는지 확인한다.

---
## AP-D-76 — Metric Improved, Experience Worsened
- Category: Catalog and review methodology
- Original IDs: D-76
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 지표 승리를 그대로 채택

예:

```text
광고 RPM 증가
하지만 본문 흐름 악화
```

### 개선

guardrail을 적용한다.

---
## AP-D-77 — No Long-Tail Validation
- Category: Catalog and review methodology
- Original IDs: D-77
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 대표 글만 좋아지고 나머지 글이 깨짐

### 개선

전체 manifest 검사와 표본 페이지 검토를 함께 한다.

---
## AP-D-78 — No Cleanup After Success
- Category: Catalog and review methodology
- Original IDs: D-78
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### migration adapter, feature flag, 임시 스크립트가 남음

### 문제

성공한 개선이 새로운 부채를 만든다.

### 개선

완료 조건에 임시 구조 제거를 포함한다.

---
## AP-D-79 — No Documentation Update
- Category: Catalog and review methodology
- Original IDs: D-79
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 구현은 바뀌었지만 작성 가이드와 README는 이전 규칙

### 개선

정책·도구·문서를 함께 갱신한다.

---
## AP-D-80 — No Reassessment
- Category: Catalog and review methodology
- Original IDs: D-80
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 한 번 해결한 문제는 영구 해결됐다고 생각

### 개선

규모와 콘텐츠 구조가 바뀌면 다시 평가한다.

---
## AP-D-81 — Backlog Without States
- Category: Catalog and review methodology
- Original IDs: D-81
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 안티패턴 목록에 발견 항목만 계속 추가

### 개선

상태를 둔다.

```text
observed
confirmed
planned
in-progress
resolved
accepted
not-applicable
```

---
## AP-D-82 — Backlog Without Evidence
- Category: Catalog and review methodology
- Original IDs: D-82
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 문제 이름만 기록

### 개선

다음을 연결한다.

```text
증거 페이지
관련 수치
발생 범위
재현 방법
```

---
## AP-D-83 — One Issue per Anti-pattern
- Category: Catalog and review methodology
- Original IDs: D-83
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 카탈로그 항목마다 GitHub Issue 생성

### 문제

실제 같은 원인을 가진 이슈가 폭발한다.

### 개선

개선 프로젝트나 원인 단위로 묶는다.

---
## AP-D-84 — One Mega-Issue for Everything
- Category: Catalog and review methodology
- Original IDs: D-84
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 반대로 모든 개선을 하나의 Issue에 넣음

### 문제

진척과 완료 기준이 불명확하다.

### 개선

사용자 가치 단위의 작업으로 분리한다.

---
## AP-D-85 — No Owner Because Personal Project
- Category: Catalog and review methodology
- Original IDs: D-85
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 개인 프로젝트이므로 담당 개념이 없음

### 문제

미래의 본인이 어떤 맥락에서 다시 봐야 하는지 모른다.

### 개선

담당자 대신 다음을 기록한다.

```text
다음 행동
재검토 시점
관련 영역
```

---
## AP-D-86 — Deadline for Every Debt
- Category: Catalog and review methodology
- Original IDs: D-86
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 모든 구조 문제에 기한 설정

### 문제

불필요한 압박과 우선순위 왜곡이 생긴다.

### 개선

긴급 문제와 기회 개선을 구분한다.

---
## AP-D-87 — No Expiration for Experiments
- Category: Catalog and review methodology
- Original IDs: D-87
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 임시 개선과 feature flag가 영구화

### 개선

실험 종료 조건과 제거 날짜를 둔다.

---
## AP-D-88 — Closed Means Gone
- Category: Catalog and review methodology
- Original IDs: D-88
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### Issue를 닫았으므로 문제도 사라졌다고 생각

### 개선

검증 결과와 남은 제한을 기록한다.

---
## AP-D-89 — Reopening as Failure
- Category: Catalog and review methodology
- Original IDs: D-89
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 문제가 재발하면 이전 개선이 실패했다고 생각

### 문제

규모 증가로 새 임계점을 넘었을 수 있다.

### 개선

재발 원인을 기존 해결의 한계와 분리한다.

---
## AP-D-90 — Governance System Becomes the Product
- Category: Catalog and review methodology
- Original IDs: D-90
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 안티패턴 관리용 대시보드·스키마·도구 구축

### 문제

실제 사이트 개선보다 관리 시스템이 커진다.

### 개선

Markdown 문서와 단순 Issue label 정도로 시작한다.

---
## AP-D-91 — Shame-Driven Refactoring
- Category: Catalog and review methodology
- Original IDs: D-91
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 과거 코드를 부끄러워서 전면 수정

### 문제

실제 사용자 영향보다 자기 평가가 우선된다.

### 개선

현재 목적과 비용을 기준으로 판단한다.

---
## AP-D-92 — Sunk-Cost Preservation
- Category: Catalog and review methodology
- Original IDs: D-92
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 이미 만든 기능이라 제거하지 못함

예:

- 관리자 편집기
- 여러 코드 테마
- 복잡한 페이지 전환
- 사용되지 않는 설정

### 개선

과거 비용이 아니라 미래 가치와 유지 비용을 본다.

---
## AP-D-93 — Perfectionism as Architecture
- Category: Catalog and review methodology
- Original IDs: D-93
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 모든 예외를 미리 처리

### 문제

실제 요구보다 복잡한 설계가 생긴다.

### 개선

현재 반복되는 요구만 지원한다.

---
## AP-D-94 — Fear of Breaking Old Content
- Category: Catalog and review methodology
- Original IDs: D-94
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 과거 글 때문에 구조를 전혀 개선하지 못함

### 개선

migration, redirect, status 표시로 위험을 관리한다.

---
