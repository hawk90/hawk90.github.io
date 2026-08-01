---
title: "Quality and testing (40 anti-patterns)"
category: quality
item_count: 40
---
# Quality and testing
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-T-60 — Focus Order Follows DOM Accidentally
- Category: Quality and testing
- Original IDs: T-60
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### CSS layout 변경 후 focus 순서가 이상해짐

### 개선

모바일 메뉴·카드 grid·sidebar에서 순서를 검증한다.

---
## AP-T-61 — Modal Escape Not Tested
- Category: Quality and testing
- Original IDs: T-61
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 검색 modal에서 focus가 뒤 페이지로 빠짐

### 개선

open, initial focus, trap, Escape, focus restore를 테스트한다.

---
## AP-T-62 — Reduced Motion Untested
- Category: Quality and testing
- Original IDs: T-62
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 모션 설정 사용자가 페이지 전환을 그대로 경험

### 개선

`prefers-reduced-motion` 조건을 자동 또는 수동 검증한다.

---
## AP-T-63 — High Contrast Untested
- Category: Quality and testing
- Original IDs: T-63
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 색 대비 수치만 통과하지만 상태 구분이 사라짐

### 개선

링크, badge, current TOC, warning을 실제로 확인한다.

---
## AP-T-64 — Screen Reader Label Snapshot
- Category: Quality and testing
- Original IDs: T-64
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### `aria-label` 존재 여부만 검사

### 문제

문구가 실제 행동과 맞는지 모른다.

### 개선

대표 상호작용의 accessible name을 의미 수준으로 검토한다.

---
## AP-T-65 — Semantic HTML Replaced by ARIA Tests
- Category: Quality and testing
- Original IDs: T-65
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### role이 있으니 올바른 구조라고 판단

### 개선

native element 사용 여부를 우선 검사한다.

---
## AP-T-66 — Grammar Linter as Technical Validator
- Category: Quality and testing
- Original IDs: T-66
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 맞춤법이 맞으면 좋은 글

### 문제

기술적 오류와 논리적 비약은 잡지 못한다.

### 개선

문체 검사와 기술 검증을 분리한다.

---
## AP-T-67 — Minimum Word Count Rule
- Category: Quality and testing
- Original IDs: T-67
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 1,000자 미만이면 실패

### 문제

짧고 유용한 Reference와 Debug Note를 불필요하게 늘리게 된다.

### 개선

콘텐츠 타입별 최소 완결성을 평가한다.

---
## AP-T-68 — Required Section Checklist Everywhere
- Category: Quality and testing
- Original IDs: T-68
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 모든 글에 서론·장점·단점·결론 강제

### 문제

콘텐츠가 획일화된다.

### 개선

유형별 필수 요소만 검사한다.

---
## AP-T-69 — Description Length as Quality
- Category: Quality and testing
- Original IDs: T-69
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### meta description 글자 수만 검사

### 문제

길이는 적절하지만 제목을 반복할 수 있다.

### 개선

제목과 description 중복도, 고유 정보 포함 여부를 함께 본다.

---
## AP-T-70 — Duplicate Detector by Text Similarity Alone
- Category: Quality and testing
- Original IDs: T-70
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 유사 문장이 많으면 중복 글 판정

### 문제

공통 용어와 코드 때문에 오탐이 많다.

### 개선

- 제목
- 검색 의도
- section 구조
- 고유 실험
- canonical role

을 함께 본다.

---
## AP-T-71 — AI Detector as Quality Gate
- Category: Quality and testing
- Original IDs: T-71
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### AI 작성 가능성이 높으면 발행 차단

### 문제

탐지 정확성이 낮고 실제 품질과 직접 연결되지 않는다.

### 개선

근거·독창성·환경·검증 흔적을 평가한다.

---
## AP-T-72 — Citation Count as Trust Score
- Category: Quality and testing
- Original IDs: T-72
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 출처가 많을수록 좋은 글

### 문제

자료 나열형 글이 유리해진다.

### 개선

핵심 주장과 출처의 대응을 본다.

---
## AP-T-73 — Environment Section Presence Only
- Category: Quality and testing
- Original IDs: T-73
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 환경 항목이 존재하면 재현 가능하다고 판단

### 문제

값이 부정확하거나 핵심 설정이 빠질 수 있다.

### 개선

실험 유형별 필요한 환경 필드를 검증한다.

---
## AP-T-74 — Updated Date Automatically Means Verified
- Category: Quality and testing
- Original IDs: T-74
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 파일 수정 시 `lastVerified`도 자동 갱신

### 문제

실제 테스트 없이 최신 상태가 된다.

### 개선

검증일은 명시적 사람 행동으로만 바뀌게 한다.

---
## AP-T-75 — Broken Claim Detection by Keyword
- Category: Quality and testing
- Original IDs: T-75
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### “항상”, “절대” 같은 단어만 경고

### 문제

문맥에 따라 정상일 수 있고, 더 미묘한 과장 표현은 놓친다.

### 개선

자동화는 후보를 표시하고 최종 판단은 사람에게 맡긴다.

---
## AP-T-76 — Schema Valid, Relation Invalid
- Category: Quality and testing
- Original IDs: T-76
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 문서 ID 형식은 맞지만 대상 문서가 없음

### 개선

referential integrity를 검사한다.

---
## AP-T-77 — Self-Referential Relation
- Category: Quality and testing
- Original IDs: T-77
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
```yaml
related:
  - current-article
```

### 개선

자기 참조를 차단한다.

---
## AP-T-78 — Duplicate Relation
- Category: Quality and testing
- Original IDs: T-78
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 같은 글이 `next`, `related`, `prerequisite`에 중복

### 문제

UI에서 반복 노출될 수 있다.

### 개선

관계 우선순위와 중복 규칙을 검증한다.

---
## AP-T-79 — Invalid Inverse Relation
- Category: Quality and testing
- Original IDs: T-79
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### A의 next가 B인데 B의 prerequisite가 전혀 다른 문서

### 개선

필요한 관계는 양방향 일관성을 검사한다.

---
## AP-T-80 — Circular Supersession
- Category: Quality and testing
- Original IDs: T-80
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
```text
A supersedes B
B supersedes A
```

### 개선

폐기 관계는 cycle이 없어야 한다.

---
## AP-T-81 — Series Order Collision
- Category: Quality and testing
- Original IDs: T-81
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 같은 시리즈에 order 3이 두 개

### 개선

build 전에 차단한다.

---
## AP-T-82 — Missing Series Member
- Category: Quality and testing
- Original IDs: T-82
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### manifest에 문서는 있지만 실제 파일이 없음

### 개선

시리즈 manifest와 콘텐츠 집합을 대조한다.

---
## AP-T-83 — Topic Hub References Draft
- Category: Quality and testing
- Original IDs: T-83
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 공개 Hub에서 draft 글을 링크

### 개선

환경별 공개 가능 상태를 검증한다.

---
## AP-T-84 — Superseded Article Remains Featured
- Category: Quality and testing
- Original IDs: T-84
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 상태와 노출 metadata가 충돌

### 개선

상태 기반 불변조건을 둔다.

```text
superseded → featured 불가
draft → sitemap 불가
noindex → sitemap 불가
```

---
## AP-T-85 — Canonical Slug Collision
- Category: Quality and testing
- Original IDs: T-85
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 여러 글이 같은 canonical URL 생성

### 개선

전체 manifest에서 URL uniqueness를 검사한다.

---
## AP-T-86 — Asset Exists Means Correct
- Category: Quality and testing
- Original IDs: T-86
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### OG 파일이 존재하면 정상

### 문제

과거 제목이나 잘못된 폰트로 생성됐을 수 있다.

### 개선

source hash와 generator version을 비교한다.

---
## AP-T-87 — Image Reference Without Dimension Check
- Category: Quality and testing
- Original IDs: T-87
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 파일은 있지만 지나치게 큰 원본

### 개선

크기·해상도·포맷 예산을 검사한다.

---
## AP-T-88 — SVG Syntax Only Validation
- Category: Quality and testing
- Original IDs: T-88
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### XML parser가 읽으면 정상

### 문제

텍스트가 잘리거나 viewBox가 잘못될 수 있다.

### 개선

대표 SVG는 실제 렌더링을 검증한다.

---
## AP-T-89 — OG Text Overflow Untested
- Category: Quality and testing
- Original IDs: T-89
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 긴 한글·영문 제목이 이미지 밖으로 벗어남

### 개선

긴 제목·특수문자·이모지 fixture를 둔다.

---
## AP-T-90 — Missing Font Fallback in Generator
- Category: Quality and testing
- Original IDs: T-90
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### CI에서 한글 폰트가 없어 네모로 생성

### 개선

생성용 폰트를 명시적으로 포함하고 canary 결과를 검사한다.

---
## AP-T-91 — Search Manifest and Page Set Diverge
- Category: Quality and testing
- Original IDs: T-91
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 삭제한 글이 검색 인덱스에 남음

### 개선

최종 공개 page manifest와 검색 레코드 집합을 비교한다.

---
## AP-T-92 — RSS Contains Draft or Superseded Content
- Category: Quality and testing
- Original IDs: T-92
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 페이지 필터와 RSS 필터가 다름

### 개선

모든 출력이 공통 publication policy를 사용하게 한다.

---
## AP-T-93 — Sitemap Contains Redirect Targets Twice
- Category: Quality and testing
- Original IDs: T-93
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 이전 URL과 최종 URL이 모두 Sitemap에 존재

### 개선

canonical 공개 URL만 포함한다.

---
## AP-T-94 — OG Generation Failure Silently Falls Back
- Category: Quality and testing
- Original IDs: T-94
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 일부 글이 기본 이미지로 바뀌었지만 경고 없음

### 개선

대표 글이나 Featured 글의 OG 실패는 오류로 처리한다.

---
## AP-T-95 — Dependency Scan Only Security Test
- Category: Quality and testing
- Original IDs: T-95
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 취약점 스캔만 수행

### 놓치는 것

- 잘못된 CSP
- secret 노출
- unsafe HTML
- workflow 권한
- 민감 파일 배포

### 개선

정적 사이트에 맞는 보안 검사를 추가한다.

---
## AP-T-96 — No Secret Scan in Content
- Category: Quality and testing
- Original IDs: T-96
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 코드만 secret scan

### 문제

Markdown 코드 블록과 로그에도 실제 token이 들어갈 수 있다.

### 개선

콘텐츠 파일과 이미지 metadata까지 범위를 검토한다.

---
## AP-T-97 — CSP Header Presence Only
- Category: Quality and testing
- Original IDs: T-97
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### CSP가 있으면 통과

### 문제

`unsafe-inline *`처럼 사실상 무의미할 수 있다.

### 개선

금지 directive와 허용 source 목록을 검사한다.

---
## AP-T-98 — Admin Route Hidden Test
- Category: Quality and testing
- Original IDs: T-98
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### 메뉴에 없으면 안전

### 개선

production artifact에 admin 코드와 route가 실제로 없는지 검사한다.

---
## AP-T-99 — Workflow Permission Not Tested
- Category: Quality and testing
- Original IDs: T-99
- Source messages: 6b50b77f-95eb-4b63-ac9b-f126f6312eb4
- Merge status: canonical source
### Source material
### GitHub Actions의 기본 권한 변화에 의존

### 개선

workflow에서 `permissions`가 명시됐는지 lint한다.

---
