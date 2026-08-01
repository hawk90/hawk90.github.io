---
title: "Quality and testing (60 anti-patterns)"
category: quality
item_count: 60
---
# Quality and testing
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-T-01 — Build Success Equals Correctness
- Category: Quality and testing
- Original IDs: T-01
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 빌드가 성공하면 사이트가 정상이라고 판단

Astro build가 성공했다는 것은 대체로 다음만 의미한다.

- 문법 오류가 없음
- import가 해결됨
- 정적 페이지 생성에 성공함

하지만 다음은 보장하지 않는다.

- 내부 링크가 올바른 문서를 가리킴
- 이미지가 실제로 표시됨
- 검색 결과가 적절함
- 글 내용이 정확함
- 모바일 레이아웃이 정상임
- OG 이미지가 최신임

### 개선

빌드 이후 별도의 의미 검증이 필요하다.

---
## AP-T-02 — Type Safety as Content Safety
- Category: Quality and testing
- Original IDs: T-02
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### TypeScript schema를 통과하면 콘텐츠도 올바르다고 판단

예:

```yaml
status: current
type: guide
```

값은 유효하지만 실제로 오래된 글일 수 있다.

### 문제

타입 시스템은 형식은 검증하지만 의미는 검증하지 못한다.

### 개선

형식 검증과 의미 검증을 분리한다.

```text
Schema validation
Semantic validation
Editorial review
```

---
## AP-T-03 — Test Only the Framework
- Category: Quality and testing
- Original IDs: T-03
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### Astro 컴포넌트와 utility 함수만 테스트

### 문제

실제 장애는 콘텐츠와 생성 파이프라인에서 더 많이 발생할 수 있다.

예:

- 잘못된 front matter
- 존재하지 않는 관련 글 ID
- 중복 series order
- 오래된 generated asset
- 검색 alias 누락

### 개선

콘텐츠 자체를 테스트 대상으로 취급한다.

---
## AP-T-04 — Content Is Not Code
- Category: Quality and testing
- Original IDs: T-04
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### Markdown은 사람이 읽는 문서이므로 자동 검증이 필요 없다고 생각

### 문제

수백 개 문서는 사실상 대형 데이터셋이다.

다음 오류는 자동화 없이 찾기 어렵다.

- 동일 slug
- 중복 제목
- 깨진 anchor
- 잘못된 날짜
- 존재하지 않는 이미지
- 폐기된 글 추천

### 개선

콘텐츠도 schema, lint, graph validation 대상으로 관리한다.

---
## AP-T-05 — Test Every Detail
- Category: Quality and testing
- Original IDs: T-05
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 모든 문장과 HTML을 snapshot으로 고정

### 문제

작은 문구 변경에도 대량 실패가 발생한다.

### 개선

변하지 않아야 하는 계약만 테스트한다.

```text
URL
문서 구조
metadata
핵심 relation
검색 레코드
생성 자산 존재
```

---
## AP-T-06 — Utility-Only Unit Tests
- Category: Quality and testing
- Original IDs: T-06
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### slug 함수, 날짜 함수만 단위 테스트

### 문제

실제 사이트 위험은 여러 단계가 결합된 곳에서 발생한다.

### 개선

콘텐츠 하나가 최종 페이지가 되는 흐름을 테스트한다.

---
## AP-T-07 — Mock Everything
- Category: Quality and testing
- Original IDs: T-07
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 파일 시스템과 Markdown parser를 모두 mock

### 문제

실제 front matter, encoding, 경로 문제를 놓친다.

### 개선

작은 fixture 디렉터리를 실제로 읽는 테스트를 포함한다.

---
## AP-T-08 — No Parser Fixture
- Category: Quality and testing
- Original IDs: T-08
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### custom remark·rehype plugin을 실제 Markdown 예제로 검증하지 않음

### 개선

다음 fixture를 둔다.

```text
callout
수식
코드 metadata
한글 heading
중첩 목록
이미지
raw HTML
```

---
## AP-T-09 — Happy-Path Fixture Only
- Category: Quality and testing
- Original IDs: T-09
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 정상 Markdown만 테스트

### 개선

의도적으로 잘못된 fixture도 필요하다.

```text
중복 front matter
잘못된 날짜
없는 language grammar
깨진 directive
중복 heading
```

---
## AP-T-10 — Fixture Does Not Resemble Real Content
- Category: Quality and testing
- Original IDs: T-10
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 테스트 문서가 지나치게 단순

```markdown
## AP-T-100 — Testing System Becomes the Product
- Category: Quality and testing
- Original IDs: T-100
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 테스트·fixture·dashboard가 실제 블로그보다 커짐

### 문제

모든 edge case를 자동화하려다 콘텐츠 개선이 멈춘다.

### 개선

위험과 빈도를 기준으로 테스트한다.

```text
깨지면 큰 문제인가
자주 발생하는가
자동화 비용이 낮은가
사람이 놓치기 쉬운가
```

---
## AP-T-11 — Fixture Copy of Production Article
- Category: Quality and testing
- Original IDs: T-11
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 실제 글 전체를 테스트 fixture로 복사

### 문제

원본과 fixture가 따로 관리되어 불일치한다.

### 개선

특정 동작을 재현하는 최소 사례를 만든다.

---
## AP-T-12 — Unit Test Internal Implementation
- Category: Quality and testing
- Original IDs: T-12
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 내부 함수 호출 순서까지 검증

### 문제

리팩토링할 때 기능은 같아도 테스트가 깨진다.

### 개선

입력과 출력 계약을 검증한다.

---
## AP-T-13 — Generated HTML String Equality
- Category: Quality and testing
- Original IDs: T-13
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 전체 HTML 문자열을 정확히 비교

### 문제

attribute 순서나 공백 변경에도 실패한다.

### 개선

DOM 구조와 중요한 요소를 선택적으로 검사한다.

---
## AP-T-14 — Locale-Dependent Test
- Category: Quality and testing
- Original IDs: T-14
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 개발 환경 언어에 따라 날짜·정렬 결과가 달라짐

### 개선

테스트 locale과 timezone을 고정한다.

---
## AP-T-15 — Time-Dependent Test
- Category: Quality and testing
- Original IDs: T-15
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 현재 날짜에 따라 오래된 글 판정이 달라짐

### 개선

clock을 주입하거나 기준일을 명시한다.

---
## AP-T-16 — No End-to-End Content Pipeline Test
- Category: Quality and testing
- Original IDs: T-16
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### Markdown부터 최종 HTML까지 한 번도 전체 검증하지 않음

### 개선

대표 fixture에 대해 다음 흐름을 실행한다.

```text
Markdown
→ schema
→ remark/rehype
→ HTML
→ search record
→ graph relation
```

---
## AP-T-17 — Production Build Never Tested in CI
- Category: Quality and testing
- Original IDs: T-17
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### lint와 unit test만 실행

### 문제

실제 정적 생성 단계의 오류를 놓친다.

### 개선

main merge 전 최소 한 번 production build를 실행한다.

---
## AP-T-18 — Full Build Only Test
- Category: Quality and testing
- Original IDs: T-18
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 반대로 모든 테스트가 전체 사이트 build에 의존

### 문제

느리고 실패 원인을 찾기 어렵다.

### 개선

```text
빠른 schema 검사
fixture 통합 테스트
전체 production build
```

를 분리한다.

---
## AP-T-19 — No Generated Output Inspection
- Category: Quality and testing
- Original IDs: T-19
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### dist 생성 후 존재 여부만 확인

### 개선

대표 페이지의 최종 HTML에서 다음을 검사한다.

- title
- canonical
- description
- H1
- breadcrumb
- status
- 관련 링크

---
## AP-T-20 — One Representative Page
- Category: Quality and testing
- Original IDs: T-20
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 홈 한 페이지만 통합 테스트

### 개선

최소 페이지 유형별 사례가 필요하다.

```text
홈
일반 글
시리즈 글
Topic Hub
404
검색
오래된 글
```

---
## AP-T-21 — No Large-Article Test
- Category: Quality and testing
- Original IDs: T-21
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 작은 글만 테스트

### 문제

긴 TOC, 많은 코드 블록, 거대한 표에서 생기는 문제를 놓친다.

### 개선

상위 복잡도 글 하나를 canary로 정한다.

---
## AP-T-22 — No Empty-State Test
- Category: Quality and testing
- Original IDs: T-22
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 검색 결과 없음, Topic 글 없음, 관련 글 없음 상태를 검증하지 않음

### 문제

빈 카드, 깨진 heading, 잘못된 광고 영역이 나타날 수 있다.

---
## AP-T-23 — No Error-State Test
- Category: Quality and testing
- Original IDs: T-23
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 이미지 실패, 댓글 실패, 검색 인덱스 실패 상황을 확인하지 않음

### 개선

외부 integration 실패가 본문을 깨뜨리지 않는지 테스트한다.

---
## AP-T-24 — Preview and Production Divergence
- Category: Quality and testing
- Original IDs: T-24
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### preview에서는 정상인데 GitHub Pages base path에서 깨짐

### 개선

실제 production base URL과 asset path 조건을 테스트한다.

---
## AP-T-25 — Test Against Source, Not Dist
- Category: Quality and testing
- Original IDs: T-25
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 원본 Markdown과 컴포넌트만 검사하고 최종 배포물을 보지 않음

### 문제

생성 과정에서 생긴 URL·asset·HTML 오류를 놓친다.

### 개선

일부 테스트는 반드시 `dist`를 대상으로 한다.

---
## AP-T-26 — HTTP Status Only Link Check
- Category: Quality and testing
- Original IDs: T-26
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 200이면 정상 링크라고 판단

### 문제

- 다른 내용으로 redirect
- 로그인 페이지
- soft 404
- 원래 출처와 다른 문서

일 수 있다.

### 개선

핵심 출처는 제목이나 canonical까지 선택적으로 확인한다.

---
## AP-T-27 — Every External Link on Every Commit
- Category: Quality and testing
- Original IDs: T-27
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 매 commit마다 모든 외부 URL 요청

### 문제

- 느림
- rate limit
- 일시 장애
- CI 불안정

### 개선

내부 링크는 매번, 외부 링크는 정기적으로 검사한다.

---
## AP-T-28 — External Failure Blocks Publishing
- Category: Quality and testing
- Original IDs: T-28
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 외부 사이트 일시 장애가 배포를 차단

### 개선

외부 링크 실패는 기본적으로 warning으로 두고 반복 실패 시 검토한다.

---
## AP-T-29 — Redirect Considered Healthy Forever
- Category: Quality and testing
- Original IDs: T-29
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 301·302이면 정상 처리

### 문제

redirect chain이나 다른 도메인으로 변경됐을 수 있다.

### 개선

최종 URL과 redirect 횟수를 기록한다.

---
## AP-T-30 — Anchor Links Not Checked
- Category: Quality and testing
- Original IDs: T-30
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 페이지 URL은 존재하지만 `#specific-heading`이 사라짐

### 개선

내부 heading anchor까지 검증한다.

---
## AP-T-31 — Generated Heading Slug Assumption
- Category: Quality and testing
- Original IDs: T-31
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### heading slug 규칙이 항상 같다고 가정

### 문제

한글, 특수문자, 중복 heading에서 달라질 수 있다.

### 개선

실제 parser가 생성한 heading ID를 manifest에 포함한다.

---
## AP-T-32 — Link Checker Parses Code Blocks
- Category: Quality and testing
- Original IDs: T-32
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 코드 예제 안 URL을 실제 링크로 검사

### 문제

가짜 domain이나 예제 URL 때문에 오탐이 발생한다.

### 개선

AST 문맥을 고려한다.

---
## AP-T-33 — Link Checker Ignores Reference Links
- Category: Quality and testing
- Original IDs: T-33
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### Markdown reference-style 링크를 놓침

### 개선

정규식이 아니라 Markdown AST 기반으로 검사한다.

---
## AP-T-34 — Link Fixer Chooses Nearest Title
- Category: Quality and testing
- Original IDs: T-34
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 깨진 링크를 제목 유사도로 자동 수정

### 문제

의미가 다른 글로 연결될 수 있다.

### 개선

높은 확신이 없으면 후보만 제시한다.

---
## AP-T-35 — Redirect Hides Internal Link Debt
- Category: Quality and testing
- Original IDs: T-35
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 내부 링크가 모두 redirect를 거치지만 검사 통과

### 개선

내부 링크는 최종 canonical URL을 직접 가리키게 한다.

---
## AP-T-36 — Search Works Means Search Is Good
- Category: Quality and testing
- Original IDs: T-36
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 결과가 나오기만 하면 완료

### 문제

정확한 결과가 상위에 오는지는 별개다.

### 개선

대표 query set을 유지한다.

---
## AP-T-37 — No Golden Query Set
- Category: Quality and testing
- Original IDs: T-37
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 검색 품질을 반복 비교할 기준 없음

### 개선 예:

```text
PCIe BAR
CXL HDM decoder
CUDA pinned memory
UEFI secure boot
MSI-X interrupt
```

각 query에 기대 상위 결과를 지정한다.

---
## AP-T-38 — Only Exact Query Tests
- Category: Quality and testing
- Original IDs: T-38
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 제목과 동일한 검색어만 테스트

### 개선

다음을 포함한다.

- 약어
- 한글·영문
- 오타
- 오류 메시지
- 상위 개념
- identifier

---
## AP-T-39 — No Negative Search Cases
- Category: Quality and testing
- Original IDs: T-39
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 결과가 없어야 하는 query를 테스트하지 않음

### 문제

무관한 글이 항상 상위에 나오는 문제를 놓친다.

---
## AP-T-40 — Rank-One-Only Evaluation
- Category: Quality and testing
- Original IDs: T-40
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 첫 번째 결과만 검사

### 문제

전체 상위 결과 품질과 중복을 놓친다.

### 개선

상위 3~5개 결과를 평가한다.

---
## AP-T-41 — Search Snapshot by Score
- Category: Quality and testing
- Original IDs: T-41
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 내부 점수 숫자를 그대로 snapshot

### 문제

알고리즘 미세 변경에 테스트가 자주 깨진다.

### 개선

정확한 점수보다 상대 순서와 포함 여부를 본다.

---
## AP-T-42 — Search Test Ignores Content Status
- Category: Quality and testing
- Original IDs: T-42
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 폐기 글이 상위 결과여도 통과

### 개선

`superseded`, `historical` 상태의 ranking 규칙을 검증한다.

---
## AP-T-43 — Search Test Ignores Canonical Guide
- Category: Quality and testing
- Original IDs: T-43
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 대표 Guide가 일반 단편 글 아래 있어도 문제로 보지 않음

### 개선

넓은 주제 검색에서는 Hub·Guide가 적절히 노출되는지 검사한다.

---
## AP-T-44 — Search Test Dataset Too Small
- Category: Quality and testing
- Original IDs: T-44
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 문서 5개로 검색 알고리즘 테스트

### 문제

실제 수백 개 글에서 나타나는 충돌을 재현하지 못한다.

### 개선

실제 manifest의 축약 샘플이나 production index를 사용한 정기 테스트를 둔다.

---
## AP-T-45 — Search Quality Tested Only Manually
- Category: Quality and testing
- Original IDs: T-45
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 체감으로 검색 확인

### 개선

자동 평가와 수동 점검을 병행한다.

---
## AP-T-46 — Screenshot Every Page
- Category: Quality and testing
- Original IDs: T-46
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 모든 페이지 전체 화면을 저장

### 문제

저장 공간·시간·오탐이 과도하다.

### 개선

대표 페이지 유형과 핵심 viewport만 선택한다.

---
## AP-T-47 — No Visual Regression Test
- Category: Quality and testing
- Original IDs: T-47
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### CSS 변경 후 사람이 몇 페이지 보는 것으로 끝

### 문제

오래된 글, 긴 표, 특수 코드 블록에서 깨짐을 놓친다.

### 개선

canary 페이지를 선정한다.

---
## AP-T-48 — Pixel-Perfect Failure
- Category: Quality and testing
- Original IDs: T-48
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 1px 차이에도 실패

### 문제

폰트 렌더링과 OS 차이로 flaky해진다.

### 개선

허용 임계치와 안정된 실행 환경을 사용한다.

---
## AP-T-49 — Visual Test on One Browser
- Category: Quality and testing
- Original IDs: T-49
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### Chromium만 검사

### 문제

Safari의 font·sticky·overflow 차이를 놓칠 수 있다.

### 개선

전체 브라우저 matrix는 과할 수 있지만, 주요 변경은 최소한 Chromium과 WebKit을 확인한다.

---
## AP-T-50 — Desktop-Only Screenshot
- Category: Quality and testing
- Original IDs: T-50
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 모바일 회귀가 검출되지 않음

### 개선

대표 모바일 폭을 포함한다.

---
## AP-T-51 — Screenshot Without Interaction
- Category: Quality and testing
- Original IDs: T-51
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 초기 화면만 캡처

### 놓치는 것

- 검색 modal
- 모바일 메뉴
- 코드 wrap
- 이미지 확대
- 다크모드
- TOC active state

### 개선

핵심 상호작용 상태를 몇 개만 선택한다.

---
## AP-T-52 — Dynamic Content in Screenshot
- Category: Quality and testing
- Original IDs: T-52
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 댓글·광고·시간 정보 때문에 매번 diff 발생

### 개선

외부 동적 영역을 mock하거나 visual test에서 제외한다.

---
## AP-T-53 — Font Not Pinned
- Category: Quality and testing
- Original IDs: T-53
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### CI 환경에 따라 fallback font가 달라짐

### 문제

대량 시각 diff가 발생한다.

### 개선

테스트 환경의 폰트와 렌더링 조건을 고정한다.

---
## AP-T-54 — Dark Mode Untested
- Category: Quality and testing
- Original IDs: T-54
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 라이트모드만 회귀 테스트

### 개선

대표 글 한두 개는 두 테마를 모두 검사한다.

---
## AP-T-55 — Generated Diagram Untested
- Category: Quality and testing
- Original IDs: T-55
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### TikZ·SVG 결과가 깨져도 build는 성공

### 개선

대표 다이어그램의 렌더링 결과를 visual canary로 둔다.

---
## AP-T-56 — Automated Accessibility Equals Accessible
- Category: Quality and testing
- Original IDs: T-56
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### axe나 Lighthouse 통과로 완료

### 문제

자동 도구는 다음을 완전히 검증하지 못한다.

- heading 의미
- 링크 문구 품질
- 키보드 흐름
- 다이어그램 설명
- 논리적인 focus 이동

### 개선

자동 검사와 짧은 수동 검사를 함께 한다.

---
## AP-T-57 — Accessibility Test on Homepage Only
- Category: Quality and testing
- Original IDs: T-57
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 글 페이지의 코드·표·TOC 문제를 놓침

### 개선

대표 장문 글과 검색 modal을 포함한다.

---
## AP-T-58 — No Keyboard Test
- Category: Quality and testing
- Original IDs: T-58
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 마우스로만 검증

### 개선

최소 흐름을 테스트한다.

```text
skip link
검색 열기
검색 결과 선택
modal 닫기
본문 링크
코드 복사
```

---
## AP-T-59 — Focus Visible Test Missing
- Category: Quality and testing
- Original IDs: T-59
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### Tab 이동은 되지만 현재 위치가 안 보임

### 개선

자동화만으로 부족하면 실제 브라우저에서 확인한다.

---
