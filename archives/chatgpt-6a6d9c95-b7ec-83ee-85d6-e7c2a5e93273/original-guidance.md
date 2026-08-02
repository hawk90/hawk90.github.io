---
title: "원본 HTML 안티패턴 운영 지침 복원본"
source_html: "archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/page.html"
source_markdown: "archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md"
source_html_sha256: b1fed8c81821c2b668b71d507599f60816a59f313f1589e3b070f9f6bebd123c
source_markdown_sha256: 39ea2ac80c6f8fd01e17be5de4bacf806c83e4e71eed22e8530173d8621c5dae
generated_at: 2026-08-02T07:30:21.983Z
selected_sections: 437
preservation: "원본 HTML과 전체 대화는 변경하지 않음"
---

# 원본 HTML 안티패턴 운영 지침 복원본

> 이 문서는 원본 `page.html`과 `conversation.full.md`에서 실행·권장·검증 지침이 포함된 섹션을 추출한 파생본이다. 원문 손실을 막기 위해 각 항목의 본문은 편집하지 않고 그대로 보존한다.

## 검토 결론

- 안티패턴 카탈로그는 진단 목록이고, 이 문서는 원문에 있던 조치·검증 지침을 별도로 복원한 운영 레이어다.
- 자동화 가능한 것은 구조·형식·링크·빌드·보안 정책 검사로 한정한다. 사실성·기술적 의미·시각 품질·콘텐츠 문장은 사람 또는 LLM 검토 대상으로 남긴다.
- 원본 HTML은 손실 없는 보관본이다. Markdown은 LLM이 읽기 좋은 파생본이며, 불일치가 발생하면 HTML과 전체 대화를 우선한다.
- 각 항목을 실제 변경에 적용할 때는 `진단 → 근거 → 조치 → 검증 → 잔여 위험` 순서를 기록한다.

## 복원된 지침 색인

| 분류 | 섹션 수 |
| --- | ---: |
| 원칙·범위 | 41 |
| 실행·로드맵 | 71 |
| 검증·품질 | 89 |
| 자동화·운영 | 82 |
| 콘텐츠·정보구조 | 99 |
| 기타 | 55 |

## 원문 지침

### 원칙·범위

#### 1. Task 8. 실행 계획

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:1472; message: 11 (assistant); path: Task 8. 실행 계획 -->

마지막.

```
Week1

검색 개선

Week2

Series

Week3

Knowledge Map

Week4

Old Post Update

Week5

SEO

Week6

Navigation

...
```

---

## 내가 생각하는 가장 큰 문제

사실 애드센스보다 더 큰 문제가 하나 보여.

**네 글은 좋은데 "도서관"이 아니다.**

예를 들어

```
UEFI

PCIe

CXL

Bootloader

Compiler
```

글이 각각 존재하는 것과

```
System Programming

├── Computer Architecture

├── Firmware

├── Linux

├── C++

├── Compiler

├── CXL

├── PCIe

└── Bootloader
```

처럼 연결되는 것은 완전히 다른 사이트야.

후자가 되면 방문자는 한 글만 읽고 나가는 것이 아니라 자연스럽게 여러 글을 탐색하게 된다.

---

## 내가 추천하는 최종 프로젝트

이걸 하나의 프로젝트로 묶자.

> **Project Hawk Knowledge Architecture**

산출물은 다음 6개 문서다.

1. **Technical Blog Architecture Review**
2. **Technical Blog Anti-pattern Catalog (100~150개)**
3. **hawk90.github.io Site Audit**
4. **Knowledge Architecture Design**
5. **Google AdSense Low Value Content Improvement Plan**
6. **6개월 리팩토링 로드맵**

이렇게 진행하면 단순히 애드센스 대응에 그치지 않고, 블로그 자체를 장기적인 기술 지식베이스로 발전시키는 데 도움이 될 거라고 생각해.

## 12. user

어 하나씩 해볼까? 너무 좋은데 천천히 하나씩 해줘

## 13. assistant

좋아. **1번부터 시작해서, 한 번에 한 문서·한 단계만** 진행하자. 먼저 `hawk90.github.io`의 **Technical Blog Architecture Review**부터 실제 사이트 기준으로 잡겠다.

## 14. assistant

좋아. 그럼 **Task 1: Technical Blog Architecture Review**부터 시작하자. 다만 한 번에 전부 던지지 않고, 이것도 몇 단계로 나눌게.

## Task 1 진행 순서

1. **현재 상태와 블로그의 정체성**
2. 정보 구조와 탐색 구조
3. 콘텐츠 아키텍처
4. 기술 스택과 렌더링 구조
5. 성능·검색·SEO
6. 유지보수성과 확장성
7. 최종 진단 및 우선순위

오늘은 첫 번째인 **현재 상태와 블로그의 정체성**만 보자.

---

#### 2. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:3982; message: 22 (assistant); path: 2. 첫 번째 핵심 안티패턴 > 범용 테마가 원하는 것 > 권장 -->

지금 당장 저장소를 분리할 필요는 없다.

대신 원칙을 정해야 한다.

> hawk90.github.io에 실제로 필요한 기능이 먼저이며, 범용화는 두 번째다.

즉 기능을 추가할 때 다음 질문을 해야 한다.

1. 내 블로그에 실제로 필요한가?
2. 콘텐츠 접근성을 높이는가?
3. 글 작성 비용을 낮추는가?
4. 단순 구현보다 추상화가 정말 유리한가?
5. 다른 사용자를 위한 설정 기능을 지금 만들 필요가 있는가?

---

#### 3. 권장 원칙

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4053; message: 22 (assistant); path: 3. 두 번째 핵심 안티패턴 > 잃을 수 있는 것 > 권장 원칙 -->

`ClientRouter`는 유지해도 되지만:

- 페이지 전환이 없어도 모든 기능이 정상이어야 함
- JavaScript 실패 시 기본 링크 이동이 작동해야 함
- 외부 embed는 재초기화 경로를 명확히 관리
- 전환 효과는 `prefers-reduced-motion` 존중
- SEO·Analytics·AdSense보다 전환 효과를 우선하지 않음
- 전환 관련 전역 이벤트를 한 모듈에서 관리

즉:

> SPA는 progressive enhancement여야지 사이트의 전제 조건이면 안 된다.

---

#### 4. 15. 추천 목표 아키텍처

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4745; message: 22 (assistant); path: 15. 추천 목표 아키텍처 -->

```text
Markdown Content
        │
        ▼
Astro Content Collections
        │
        ├── Article rendering
        ├── Topic/Series graph
        ├── Search documents
        ├── RSS/Sitemap
        └── OG metadata
        │
        ▼
Static HTML
        │
        ├── Minimal navigation JS
        ├── Search loaded on demand
        ├── Giscus loaded on demand
        └── Optional view transitions
```

핵심 원칙은 다음과 같다.

```text
HTML이 제품
JavaScript는 보조 기능
Markdown이 원본
생성물은 재현 가능
검색은 지연 로드
테마보다 콘텐츠가 우선
```

---

#### 5. 내부 링크가 단순 관련 글 추천에 머묾

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5279; message: 25 (assistant); path: 8. 일곱 번째 핵심 안티패턴 > Internal Link Underuse > 내부 링크가 단순 관련 글 추천에 머묾 -->

Google은 내부 링크를 통해 페이지를 발견하고, 링크 문구를 통해 연결된 페이지의 의미를 이해한다. 또한 중요한 모든 페이지는 사이트 내 다른 페이지에서 최소 한 번 이상 링크되는 것이 좋다고 안내한다. citeturn117273search5turn117273search19

중요한 건 페이지 하단의 “관련 글” 카드만이 아니다.

가장 가치 있는 내부 링크는 **본문 문맥 속 링크**다.

나쁜 예:

```text
관련 글
- PCIe
- CXL
- Linux
```

좋은 예:

```text
HDM Decoder는 Host Physical Address 범위를 CXL 장치 메모리로
매핑한다. 전체 주소 매핑 과정은
[CXL HDM Decoder와 HPA 매핑 구조]에서 설명한다.
```

#### 6. 장기적인 권장 경계

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6240; message: 28 (assistant); path: 2. 두 번째 핵심 안티패턴 > 관리자 도구 > 장기적인 권장 경계 -->

```text
apps/
  blog/
  editor/

packages/
  theme/
  content-schema/
  search/
  ui/

content/
  posts/
  assets/
```

지금 당장 모노레포로 바꾸라는 뜻은 아니다. 다만 개념적으로라도 경계를 먼저 세워야 한다.

#### 7. 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6550; message: 28 (assistant); path: 6. 여섯 번째 핵심 안티패턴 > Build Stability by Increasing Heap > 추천 -->

빌드 예산을 정한다.

```text
로컬 증분 확인: 10초 이하
일반 production build: 5분 이하
최대 peak memory: 4GB 이하
release audit: 별도 수행
```

정확한 목표 수치는 환경에 따라 바뀔 수 있지만, 예산 없이 최적화하면 8GB가 12GB가 되는 식으로 흘러간다.

---

#### 8. 권장 경계

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6854; message: 28 (assistant); path: 11. 열한 번째 핵심 안티패턴 > Integration Lifecycle Entanglement > 권장 경계 -->

각 integration은 공통 계약을 가져야 한다.

```text
load()
dispose()
onPageChange()
fallback()
privacyRequirement()
```

Astro 페이지 전환 이벤트를 외부 통합마다 직접 구독하게 하지 말고, 한 곳에서 생명주기를 중계하는 편이 낫다.

```text
SiteLifecycle
  → analytics
  → comments
  → ads
  → newsletter
```

---

#### 9. SEC-30. Default Broad Workflow Permissions

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17936; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-30. Default Broad Workflow Permissions -->

### `GITHUB_TOKEN` 권한을 명시하지 않음

### 문제

workflow가 실제 필요한 범위보다 큰 권한을 받을 수 있다.

### 개선

workflow 또는 job 단위로 최소 권한을 지정한다.

```yaml
permissions:
  contents: read
```

배포 job만 필요한 write 권한을 별도로 준다.

---

#### 10. Task 2-10. Content Governance & Editorial Workflow Anti-patterns

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20752; message: 52 (assistant); path: Task 2-10. Content Governance & Editorial Workflow Anti-patterns -->

이번에는 **콘텐츠 기획, 집필, 검수, 업데이트, 통합, 폐기, 발행 주기**에서 반복되는 안티패턴을 다룬다.

기술 블로그가 커질수록 문제는 “글을 못 쓰는 것”이 아니라 다음으로 이동한다.

```text
무엇을 쓸 것인가
기존 글과 어떻게 구분할 것인가
언제 업데이트할 것인가
어떤 글을 대표 문서로 둘 것인가
무엇을 합치고 폐기할 것인가
```

---

## G-01. Topic Impulse Publishing

### 떠오른 주제를 바로 새 글로 작성

### 증상

- 콘텐츠 지도 확인 없이 새 파일 생성
- 기존 글과 중복 여부를 확인하지 않음
- 아이디어가 생긴 순서대로 게시
- 사이트의 핵심 분야와 무관한 글이 늘어남

### 문제

개별 글은 괜찮아도 전체 사이트의 방향이 흐려진다.

### 개선

새 글을 쓰기 전에 다음 네 가지를 확인한다.

```text
기존 글 보완인가
독립적인 검색 의도가 있는가
핵심 Topic에 속하는가
직접 경험이나 고유 분석이 있는가
```

---

## G-02. Backlog as a Graveyard

### 아이디어를 계속 쌓지만 우선순위가 없음

### 증상

- 초안 제목 수백 개
- 오래된 아이디어가 계속 남음
- 무엇부터 쓸지 결정하는 데 시간이 걸림
- 비슷한 아이디어가 중복 등록됨

### 개선

아이디어를 최소 네 상태로 분류한다.

```text
Next
Research
Merge into existing
Drop
```

---

## G-03. SEO Query Becomes Editorial Strategy

### 검색어가 보이면 바로 콘텐츠 계획에 추가

### 문제

사이트 정체성과 무관한 주제가 늘어나고, 비슷한 검색어별 글이 분열된다.

### 개선

검색어는 글 후보가 아니라 다음 중 하나의 신호로 해석한다.

```text
기존 글 제목 문제
기존 글 설명 부족
alias 부족
FAQ 필요
실제 콘텐츠 공백
```

---

## G-04. Trend Chasing

### 유행 기술을 빠르게 다루는 것이 우선

### 증상

- 최신 프레임워크 뉴스
- 발표 요약
- 릴리스 노트 재정리
- 일시적인 검색 유입 위주

### 문제

네 블로그의 강점인 저수준 시스템·실무 경험과 차별성이 약해질 수 있다.

### 개선

유행 주제라도 다음과 연결될 때 작성한다.

```text
기존 전문 분야
직접 실험
장기 참고 가치
고유한 해석
```

---

## G-05. Coverage Anxiety

### 모든 주제를 다뤄야 한다는 압박

### 문제

- 얕은 입문 글 증가
- 전문 분야의 깊이 약화
- 유지해야 할 문서 범위 폭증

### 개선

다루지 않을 영역도 명시적으로 정한다.

```text
핵심적으로 다룸
필요할 때만 다룸
다루지 않음
```

---

## G-06. Publication Cadence Fetish

### 정해진 주기에 맞추기 위해 글을 발행

### 증상

- 주 3회 발행이 목표
- 미완성 글도 일정 때문에 공개
- 기존 글 업데이트는 실적으로 보지 않음

### 문제

발행 빈도가 품질보다 우선된다.

### 개선

콘텐츠 성과를 다음처럼 함께 본다.

```text
신규 글
대표 글 업데이트
중복 통합
허브 개선
오래된 글 검증
```

---

## G-07. Draft Too Early

### 조사 메모 단계에서 공개 Draft 생성

### 문제

공개 저장소에서는 `draft: true`여도 내용 자체가 보일 수 있다.

### 개선

민감하거나 미완성인 연구 노트는 공개 저장소 밖에서 관리하고, 게시 가능한 수준이 된 뒤 옮긴다.

---

## G-08. Draft Forever

### 초안이 계속 쌓임

### 문제

- 관리 부담
- 비슷한 새 글이 다시 생성
- 연구 상태와 폐기 상태가 구분되지 않음

### 개선

초안마다 만료 시점을 둔다.

```text
30일 내 진행
기존 글에 병합
아이디어로 환원
삭제
```

---

## G-09. Research Without a Question

### 자료를 많이 모으지만 무엇을 밝힐지 없음

### 증상

- 공식 문서 링크 다수
- 소스코드 위치 다수
- 결론이 정해지지 않음
- 글이 자료 모음집이 됨

### 개선

조사 시작 전에 한 문장 질문을 쓴다.

```text
Linux는 CXL Type 3 메모리를 어떤 단계에서 NUMA 노드로 등록하는가?
```

---

## G-10. Research Scope Inflation

### 조사 중 연관 개념을 계속 추가

### 문제

한 글이 끝나지 않고 범위가 무한히 넓어진다.

### 개선

본문 범위와 별도 후속 글 후보를 분리한다.

```text
현재 글에서 답할 것
참고만 할 것
후속 글로 넘길 것
```

---

#### 11. 출처와 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20998; message: 52 (assistant); path: 출처와 검증 -->

## G-11. Source Collection Without Hierarchy

### 출처 신뢰도를 구분하지 않음

```text
공식 규격
공식 문서
소스코드
개인 블로그
커뮤니티 답변
AI 답변
```

이 모두 같은 수준으로 취급된다.

### 개선

근거 우선순위를 정한다.

```text
1. 실제 관찰·측정
2. 공식 사양
3. 공식 소스코드·문서
4. 신뢰할 수 있는 기술 자료
5. 커뮤니티 경험
6. 미검증 가설
```

---

## G-12. Citation as Decoration

### 참고 링크를 넣었으니 검증됐다고 생각

### 문제

출처가 실제 주장과 일치하지 않을 수 있다.

### 개선

각 핵심 주장에 대해 다음을 확인한다.

```text
출처가 직접 뒷받침하는가
버전이 일치하는가
문맥을 잘라내지 않았는가
현재도 유효한가
```

---

## G-13. Secondary Source Cascade

### 다른 블로그가 인용한 블로그를 다시 인용

### 문제

원래 출처와 실제 근거가 사라지고 오류가 반복된다.

### 개선

가능하면 사양·소스·공식 문서까지 거슬러 올라간다.

---

## G-14. Version-Mismatched Evidence

### 최신 글에 과거 버전의 자료를 근거로 사용

예:

```text
Linux 6.12 동작 설명
근거는 Linux 5.4 소스
```

### 문제

구조가 바뀌었을 가능성을 놓친다.

### 개선

근거의 버전을 본문 환경과 맞춘다.

---

## G-15. Source Code Snapshot Without Commit

### 소스 위치만 언급

```text
drivers/pci/probe.c에서 처리한다.
```

### 문제

향후 줄 번호와 동작이 바뀐다.

### 개선

가능하면 다음을 함께 기록한다.

```text
repository
tag 또는 commit
file
symbol
```

---

## G-16. Experiment After Conclusion

### 결론을 먼저 정하고 실험으로 확인하려 함

### 문제

원하는 결과만 선택하거나 반대 결과를 예외로 넘기기 쉽다.

### 개선

실험 전에 가설과 판정 기준을 적는다.

---

## G-17. Only Successful Evidence

### 결론을 지지하는 결과만 게시

### 문제

실패 조건과 경계가 보이지 않아 일반화가 과해진다.

### 개선

반대 결과, 실패한 조건, 재현되지 않은 경우도 기록한다.

---

## G-18. Unreproducible Private Evidence

### 회사 장비에서 확인했지만 공개할 수 없는 결과에 의존

### 문제

독자가 검증할 수 없고 회사 정보 노출 위험도 있다.

### 개선

- 공개 가능한 최소 환경으로 재현
- 구체 정보는 익명화
- 재현 불가능하면 관찰 범위를 명확히 표시

---

#### 12. 권장 경계

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:22113; message: 52 (assistant); path: AI 활용 > G-80. No AI Usage Boundary > 권장 경계 -->

#### 맡기기 좋은 작업

```text
문장 명료화
목차 후보
중복 탐지
반론 후보
체크리스트
태그 정규화 후보
```

#### 직접 검증할 작업

```text
사양 해석
코드 동작
벤치마크
보안 판단
법적 표현
실제 장애 원인
```

---

#### 13. 추천 표기 원칙

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24245; message: 54 (assistant); path: 추천 표기 원칙 -->

```text
고유 제품명·API·함수명은 원문 유지
첫 등장에 한국어와 영문 병기
이후에는 문맥에 맞는 대표 표기 사용
오류·로그·명령 출력은 원문 유지
사양의 MUST·SHOULD·MAY 강도 보존
제목은 한 언어 중심으로 간결하게 작성
```

#### 14. 관계 모델

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24515; message: 56 (assistant); path: 관계 모델 -->

## K-11. One Generic Relation

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

## K-12. Relation Type Explosion

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

## K-13. Directionless Relationship

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

## K-14. Symmetric Relation Assumption

### 모든 관계를 양방향으로 처리

### 문제

`A is prerequisite of B`와 `B is prerequisite of A`는 같지 않다.

### 개선

대칭 관계와 비대칭 관계를 구분한다.

---

## K-15. Missing Inverse Relation

### 관계는 저장했지만 반대편에서 활용하지 않음

예:

```text
A prerequisite of B
```

는 있지만 B 페이지에 “선행 문서 A”가 표시되지 않는다.

### 개선

그래프 생성 시 inverse relation을 파생한다.

---

## K-16. Relation Stored in Multiple Places

### front matter, 시리즈 manifest, 본문 링크에 같은 관계 반복 저장

### 문제

정보가 어긋난다.

### 개선

원본 관계와 파생 관계를 구분하고 source of truth를 하나로 둔다.

---

## K-17. Relation Inferred from Folder

### 파일 위치가 관계를 결정

```text
/cxl/linux/numa/
```

라고 해서 반드시 학습 순서나 상위 개념 관계가 정확한 것은 아니다.

### 개선

저장 경로와 지식 관계를 분리한다.

---

## K-18. Relation Inferred from Title

### 제목에 같은 단어가 있으니 연결

### 문제

단어 공유와 개념 관계를 혼동한다.

### 개선

자동화는 후보만 만들고 중요한 관계는 승인한다.

---

## K-19. Relation Without Evidence

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

## K-20. Stale Relation

### 글이 통합·폐기됐는데 관계는 남음

### 개선

상태 변경과 관계 정리를 같은 workflow에 포함한다.

---

#### 15. 자동화와 AI 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25248; message: 56 (assistant); path: 자동화와 AI 추천 -->

## K-61. AI Recommendation as Truth

### AI가 추천한 관련 글을 자동 게시

### 문제

문장 유사성은 높지만 기술 관계가 틀릴 수 있다.

### 개선

AI는 후보 생성에만 사용하고 중요한 추천은 승인한다.

---

## K-62. LLM Reads Only Titles

### 제목과 description만 보고 관계 추천

### 문제

실제 결론과 범위를 이해하지 못한다.

### 개선

소제목·핵심 요약·콘텐츠 타입을 함께 제공한다.

---

## K-63. LLM Reads Full Raw Article

### 전체 코드와 로그까지 모델에 전달

### 문제

비용·노이즈·개인정보 위험이 증가한다.

### 개선

정제된 문서 manifest와 요약을 사용한다.

---

## K-64. Embedding Model Lock-In

### 특정 벡터 모델의 결과를 영구 관계로 저장

### 문제

모델 변경 시 점수와 관계가 달라진다.

### 개선

자동 점수는 재생성 가능한 파생 데이터로 취급한다.

---

## K-65. Similarity Threshold by Guess

### 0.8 이상이면 관련 글 같은 임의 기준

### 문제

주제와 콘텐츠 유형마다 적절한 임계값이 다르다.

### 개선

대표 문서 쌍으로 평가 세트를 만든다.

---

## K-66. No Negative Examples

### 관련된 문서만 테스트

### 문제

유사하지만 추천하면 안 되는 문서를 구분하지 못한다.

### 개선

비관련·중복·경쟁 관계 예시도 평가한다.

---

## K-67. AI Generates Missing Links Everywhere

### 링크가 적은 글에 자동으로 많은 링크 삽입

### 문제

본문이 링크로 과밀해지고 의미가 약해진다.

### 개선

상위 몇 개 후보만 제시하고 문맥 적합성을 검토한다.

---

## K-68. Generated Link Text

### AI가 앵커 문구까지 자동 삽입

### 문제

문체와 의미가 어색하거나 링크 대상과 정확히 일치하지 않을 수 있다.

### 개선

링크 후보와 권장 문맥만 제시하고 최종 문장은 사람이 작성한다.

---

## K-69. Recommendation Feedback Loop

### 클릭이 많은 추천을 강화하면서 같은 글만 반복 노출

### 개선

다양성·구조적 중요도·새 문서 탐색을 별도 제약으로 둔다.

---

## K-70. Cold-Start Neglect

### 새 글은 클릭 데이터가 없어 추천되지 않음

### 개선

명시적 관계와 Topic 구조를 기본 신호로 사용한다.

---

## K-71. Model Upgrade Changes Site Structure

### 임베딩 모델 업데이트 후 추천과 그래프가 대폭 변경

### 문제

사이트 탐색이 불안정해진다.

### 개선

대표 관계는 수동 고정하고 자동 추천은 보조 슬롯에만 사용한다.

---

## K-72. No Recommendation Versioning

### 알고리즘 변경 전후를 비교할 수 없음

### 개선

추천 manifest에 생성 버전과 모델 정보를 기록한다.

---

#### 16. 추천 최소 복원력 기준선

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:28892; message: 60 (assistant); path: 추천 최소 복원력 기준선 -->

## 원본

```text
GitHub repository
+
별도 bare mirror
+
원본 이미지·다이어그램 source
```

## 배포

```text
최근 정상 static artifact
commit SHA
build tool version
간단한 smoke test
```

## URL

```text
안정적인 content ID
redirect manifest
canonical 정책
중요 anchor 보존
```

## 외부 서비스

```text
댓글·광고·분석 없이도 본문 정상
중요 댓글은 본문 반영
외부 이미지 hotlink 최소화
```

## 복구 문서

```text
저장소 복원
dependency 설치
production build
Pages 재설정
domain·HTTPS 확인
대표 URL 검증
```

#### 17. Task 2-15. Anti-pattern Detection, Prioritization & Remediation Anti-patterns

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:28967; message: 62 (assistant); path: Task 2-15. Anti-pattern Detection, Prioritization & Remediation Anti-patterns -->

지금까지는 개별 안티패턴을 분야별로 정리했다. 이번에는 한 단계 위에서 본다.

> 안티패턴을 많이 발견했다고 해서 개선이 잘되는 것은 아니다.

오히려 다음 문제가 생길 수 있다.

```text
안티패턴 목록 증가
→ 모든 것이 문제처럼 보임
→ 리팩토링 범위 폭발
→ 실제 개선은 시작하지 못함
```

이번 파트는 **안티패턴을 어떻게 발견하고, 평가하고, 실제 작업으로 바꿀 것인가**에 관한 안티패턴이다.

---

## D-01. Anti-pattern Collector

### 안티패턴 수집 자체가 목적

### 증상

- 목록은 계속 길어짐
- 새로운 이름을 만드는 데 집중
- 저장소에 실제 적용하지 않음
- 중복된 안티패턴이 여러 분야에 존재
- 개선 작업보다 문서 분류 시간이 더 큼

### 문제

안티패턴 카탈로그는 행동을 돕는 도구이지 결과물이 아니다.

### 개선

각 항목은 최소한 다음 중 하나로 연결돼야 한다.

```text
검사 규칙
수동 리뷰 질문
구체적인 개선 작업
폐기 결정
```

---

## D-02. Everything Is an Anti-pattern

### 모든 설계 선택을 문제로 해석

예:

```text
카드가 많다 → 안티패턴
카드가 적다 → 안티패턴
글이 길다 → 안티패턴
글이 짧다 → 안티패턴
```

### 문제

맥락과 목적이 사라진다.

### 개선

안티패턴은 기술이나 형태 자체가 아니라 다음 조건으로 정의해야 한다.

```text
특정 맥락에서
반복적으로 나타나며
비용이 이익보다 커지고
개선 가능한 구조적 원인이 있는 상태
```

---

## D-03. Pattern Without Context

### 발생 조건 없이 이름만 붙임

예:

```text
ClientRouter는 안티패턴이다.
Tailwind는 안티패턴이다.
긴 글은 안티패턴이다.
```

### 문제

같은 선택도 규모와 목적에 따라 결과가 다르다.

### 개선

각 판단에 다음을 포함한다.

```text
어떤 규모에서
어떤 콘텐츠 유형에서
어떤 증상이 있을 때
무슨 비용이 발생하는가
```

---

## D-04. Technology Blaming

### 구조 문제를 도구 탓으로 돌림

```text
빌드가 느리다 → Astro 문제
CSS가 복잡하다 → Tailwind 문제
콘텐츠가 얽힌다 → Markdown 문제
```

### 문제

실제 원인이 다음일 수 있다.

- 전체 corpus 재처리
- 과도한 생성물
- 콘텐츠 모델 부재
- 기능 경계 붕괴
- 운영 정책 부재

### 개선

도구 교체 전에 원인을 계층별로 나눈다.

```text
콘텐츠
데이터 모델
빌드 파이프라인
UI
도구
인프라
```

---

## D-05. Best-Practice Absolutism

### 일반적인 모범 사례를 무조건 적용

예:

```text
모든 dependency는 최신이어야 한다.
모든 페이지는 구조화 데이터를 가져야 한다.
모든 글은 2,000자 이상이어야 한다.
모든 UI는 컴포넌트화해야 한다.
```

### 문제

블로그의 실제 목적과 규모를 무시한다.

### 개선

모범 사례를 다음 질문으로 바꾼다.

> 현재 문제를 줄이는 데 실제로 도움이 되는가?

---

## D-06. Enterprise Solution Bias

### 개인 블로그 문제에 조직용 해결책 적용

예:

```text
콘텐츠 관계 관리
→ 그래프 데이터베이스

운영 지표
→ 데이터 웨어하우스

편집 흐름
→ 자체 CMS

검색
→ 벡터 검색 인프라
```

### 문제

구축·운영 비용이 문제 자체보다 커진다.

### 개선

단계적으로 확장한다.

```text
수동 규칙
→ 단순 manifest
→ 작은 스크립트
→ 반복 규모가 충분할 때 시스템화
```

---

## D-07. Novelty Bias

### 새로운 기술을 해결책으로 선호

### 증상

- 오래된 단순 방법은 지루하게 느껴짐
- 검색 개선에 LLM부터 고려
- 카드 정리에 디자인 시스템부터 구축
- 콘텐츠 통합보다 새 플랫폼 개발

### 개선

가장 단순한 해결책부터 시도한다.

```text
수동 큐레이션
명시적 metadata
정적 링크
작은 validation script
```

---

## D-08. Rewrite Reflex

### 문제가 많아 보이면 처음부터 다시 작성

### 문제

- 기존 URL과 콘텐츠 이력 손실
- 새로운 버그
- 완료까지 긴 시간
- 기존 문제를 새 구조에서 반복
- 실제 독자 가치는 늦게 개선

### 개선

재작성보다 경계 정리와 점진적 migration을 우선한다.

---

## D-09. Local Optimization

### 한 지표만 개선

예:

```text
검색 인덱스 크기 감소
→ 검색 품질 악화

빌드 시간 감소
→ 검증 누락

카드 정보 축소
→ 상태 확인 어려움
```

### 개선

주요 지표와 guardrail을 함께 둔다.

```text
Primary improvement
+
깨지면 안 되는 조건
```

---

## D-10. Symptom Suppression

### 원인 대신 표면 증상만 수정

예:

```text
태그가 너무 많음
→ 화면에서 일부 숨김

빌드 메모리 부족
→ heap 증가

중복 글
→ canonical만 추가

고아 글
→ 랜덤 관련 글 삽입
```

### 문제

구조적 문제는 그대로 남는다.

### 개선

증상, 직접 원인, 구조적 원인을 분리한다.

---

#### 18. 개선 후 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30296; message: 62 (assistant); path: 개선 후 검증 -->

## D-71. Done When Merged

### 코드가 main에 들어가면 완료

### 개선

실제 production에서 결과를 확인한다.

---

## D-72. Validate Only the Happy Path

### 대표 페이지 하나만 확인

### 개선

변경 영향이 큰 경계 사례를 포함한다.

---

## D-73. Measure Immediately

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

## D-74. No Before–After Samples

### 수치만 비교하고 실제 페이지를 보지 않음

### 개선

대표 페이지와 query를 전후 비교한다.

---

## D-75. Success Means No Regression

### 깨지지 않았으면 개선 성공

### 문제

실제 사용자 가치가 늘지 않았을 수 있다.

### 개선

목표한 행동이나 품질이 개선됐는지 확인한다.

---

## D-76. Metric Improved, Experience Worsened

### 지표 승리를 그대로 채택

예:

```text
광고 RPM 증가
하지만 본문 흐름 악화
```

### 개선

guardrail을 적용한다.

---

## D-77. No Long-Tail Validation

### 대표 글만 좋아지고 나머지 글이 깨짐

### 개선

전체 manifest 검사와 표본 페이지 검토를 함께 한다.

---

## D-78. No Cleanup After Success

### migration adapter, feature flag, 임시 스크립트가 남음

### 문제

성공한 개선이 새로운 부채를 만든다.

### 개선

완료 조건에 임시 구조 제거를 포함한다.

---

## D-79. No Documentation Update

### 구현은 바뀌었지만 작성 가이드와 README는 이전 규칙

### 개선

정책·도구·문서를 함께 갱신한다.

---

## D-80. No Reassessment

### 한 번 해결한 문제는 영구 해결됐다고 생각

### 개선

규모와 콘텐츠 구조가 바뀌면 다시 평가한다.

---

#### 19. 권장 title 예시

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31492; message: 64 (assistant); path: A-08. 홈 SEO metadata 정비 > 권장 title 예시 -->

```text
Hawk Systems Notes — C++, Firmware, CUDA, PCIe and CXL
```

또는:

```text
Hawk Systems Knowledge Base
```

사이트 이름 자체를 짧게 유지하고 description에서 범위를 설명해도 된다.

#### 20. 자동화 가능 범위

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33325; message: 68 (assistant); path: C-11. 가설을 사실로 바꾸는 자동 문체 수정 금지 > 자동화 가능 범위 -->

- 위험 문구 후보 표시
- diff에서 불확실성 표현 삭제 감지
- 단정형 문장 후보 제시

최종 판단은 사람이 한다.

---

#### 21. C-21. 대표 글 리뷰 체크리스트

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33653; message: 68 (assistant); path: C-21. 대표 글 리뷰 체크리스트 -->

## 공통

```text
[ ] 제목이 한 가지 질문을 약속한다
[ ] description이 제목을 반복하지 않는다
[ ] type, topic, status가 지정됐다
[ ] updated와 lastVerified가 구분됐다
[ ] 핵심 주장의 근거가 있다
[ ] 사실과 가설이 구분된다
[ ] 적용 범위와 한계가 있다
[ ] 다음 학습 경로가 있다
```

## Source Walkthrough 추가

```text
[ ] 저장소 버전·commit이 있다
[ ] file과 symbol이 있다
[ ] 호출 흐름이 명확하다
```

## Debug Note 추가

```text
[ ] 증상과 정상 기대값이 있다
[ ] 제외한 가설이 있다
[ ] 해결 후 검증이 있다
```

## Experiment 추가

```text
[ ] baseline이 있다
[ ] 반복 횟수가 있다
[ ] raw result 또는 표가 있다
[ ] 결과 일반화 한계가 있다
```

---

#### 22. C-22. 자동 검사와 사람 검토의 경계

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33695; message: 68 (assistant); path: C-22. 자동 검사와 사람 검토의 경계 -->

## 자동화할 것

```text
필수 metadata 존재
enum 유효성
날짜 형식
Topic ID 존재
relation 대상 존재
상태 불변조건
대표 글의 description 존재
lastVerified가 미래 날짜인지
```

## 자동화하지 않을 것

```text
기술 결론이 옳은가
가설이 충분히 조심스럽게 표현됐는가
대표 글로 적합한가
중복 글을 합쳐야 하는가
출처가 실제 주장을 충분히 뒷받침하는가
```

---

#### 23. 자동 검사 가능 범위

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34525; message: 70 (assistant); path: D-14. 내부 링크 anchor 개선 > 자동 검사 가능 범위 -->

다음 anchor를 후보로 경고한다.

```text
여기
링크
클릭
참고
자세히
```

하지만 문맥에 따라 정상일 수 있으므로 warning만 제공한다.

---

#### 24. F-04. Canonical URL 전수 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36773; message: 75 (assistant); path: F-04. Canonical URL 전수 검증 -->

### 검사할 문제

```text
모든 글이 홈 canonical을 가리킴
preview domain이 canonical
http와 https 혼재
trailing slash 정책 불일치
태그와 Topic Hub가 서로 canonical
구판이 무관한 대표 글 canonical
```

## 권장 원칙

일반적으로 독립적인 문서는 자기 URL을 canonical로 사용한다.

```html
<link
  rel="canonical"
  href="https://hawk90.github.io/topics/pcie-cxl/"
/>
```

실제 중복 콘텐츠만 대표 URL로 통합한다.

### 자동 검사

```text
canonical 존재
absolute HTTPS URL
production origin
자기 URL 또는 허용된 중복 대상
canonical target가 indexable
redirect chain 없음
```

### 완료 조건

- 모든 indexable 페이지에 canonical 존재
- canonical target가 200 응답
- preview 주소가 운영 canonical로 노출되지 않음
- Sitemap URL과 canonical URL이 일치

### 우선순위

```text
P0
```

---

#### 25. 권장 원칙

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36786; message: 75 (assistant); path: F-04. Canonical URL 전수 검증 > 권장 원칙 -->

일반적으로 독립적인 문서는 자기 URL을 canonical로 사용한다.

```html
<link
  rel="canonical"
  href="https://hawk90.github.io/topics/pcie-cxl/"
/>
```

실제 중복 콘텐츠만 대표 URL로 통합한다.

### 자동 검사

```text
canonical 존재
absolute HTTPS URL
production origin
자기 URL 또는 허용된 중복 대상
canonical target가 indexable
redirect chain 없음
```

### 완료 조건

- 모든 indexable 페이지에 canonical 존재
- canonical target가 200 응답
- preview 주소가 운영 canonical로 노출되지 않음
- Sitemap URL과 canonical URL이 일치

### 우선순위

```text
P0
```

---

#### 26. 권장 구성

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37220; message: 75 (assistant); path: F-12. About 페이지 개편 > 권장 구성 -->

```text
짧은 소개
전문 분야
실무·연구 경험의 범위
작성 원칙
오류 제보·연락 경로
```

#### 27. G-03. Workflow별 권한 전수 조사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38302; message: 77 (assistant); path: GitHub Actions 권한 > G-03. Workflow별 권한 전수 조사 -->

### 문제

`GITHUB_TOKEN` 기본 권한이나 기존 workflow 설정에 의존하면 실제 필요보다 넓은 권한이 부여될 수 있다.

### 감사표

| Workflow | 목적 | 필요 권한 | 현재 권한 | 수정 |
|---|---|---|---|---|
| validate | schema·link 검사 | contents: read |  |  |
| build | 정적 artifact 생성 | contents: read |  |  |
| deploy | Pages 배포 | pages/id-token write |  |  |
| audit | 외부 링크·dependency | contents: read |  |  |

### 기본 권장

```yaml
permissions:
  contents: read
```

배포 job만 필요한 권한을 명시적으로 추가한다.

### 피해야 할 것

```yaml
permissions: write-all
```

또는 workflow 최상위에 광범위한 write 권한을 주고 모든 job이 공유하는 구조.

### 완료 조건

- 모든 workflow에 `permissions` 명시
- validation·build는 읽기 권한만 사용
- deploy job만 배포 권한 보유
- 사용하지 않는 `issues`, `pull-requests`, `packages` 쓰기 권한 없음

### 우선순위

```text
P0
```

---

#### 28. Task 3-8. 테스트·회귀 검증·출시 체크리스트 백로그

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39716; message: 79 (assistant); path: Task 3-8. 테스트·회귀 검증·출시 체크리스트 백로그 -->

이번 단계의 목표는 지금까지 바꾼 구조가 다시 무너지지 않도록 **최소한의 자동 검증과 출시 절차**를 만드는 것이다.

핵심은 이것이다.

```text
모든 것을 테스트하는 것
≠
깨지면 큰 문제가 되는 계약을 보호하는 것
```

보호해야 할 핵심 계약은 다음이다.

```text
URL
콘텐츠 상태
검색 결과
Topic Hub 관계
Sitemap·canonical
최종 dist
모바일 읽기
배포 권한
```

---

#### 29. H-10. 최종 `dist` 구조 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40249; message: 79 (assistant); path: H-10. 최종 `dist` 구조 검사 -->

원본이 아니라 배포물을 검사한다.

## 기본 검사

```text
HTML 파일 수
예상하지 못한 확장자
숨김 파일
.env
backup 파일
source map
admin bundle
secret pattern
```

## 파일 크기 검사

```text
대형 HTML
대형 JS
대형 CSS
대형 이미지
검색 인덱스
```

예:

```text
WARNING:
`/posts/cuda-complete-guide/index.html` is 3.8 MB.
Largest contributors: code blocks, line-number markup.
```

## 완료 조건

- 민감 파일이 artifact에 없음
- 관리자 자산이 없음
- 예상 밖의 대형 파일이 보고됨
- 배포 파일 목록을 artifact로 보존 가능

## 우선순위

```text
P0
```

---

#### 30. Task 3-9. 전체 실행 로드맵과 스프린트 계획

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41725; message: 81 (assistant); path: Task 3-9. 전체 실행 로드맵과 스프린트 계획 -->

지금까지 A~H에서 만든 백로그를 실제 실행 순서로 압축한다.

목표는 한 번에 전체 사이트를 갈아엎는 것이 아니라 다음 순서로 위험을 줄이는 것이다.

```text
측정
→ 대표 콘텐츠 확정
→ 홈·Hub 개편
→ 검색·색인 정리
→ 빌드·보안 안정화
→ 회귀 테스트
→ AdSense 재신청
```

---

#### 31. 0. 실행 원칙

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41743; message: 81 (assistant); path: 0. 실행 원칙 -->

## 원칙 1. 콘텐츠 구조가 도구보다 먼저

다음 순서를 지킨다.

```text
대표 문서 선정
→ Topic 관계 확정
→ metadata 적용
→ UI 구현
→ 자동화
```

관계 기준도 없이 지식 그래프나 추천 시스템부터 만들지 않는다.

## 원칙 2. URL은 가장 늦게 변경

제목, 설명, Topic, UI는 비교적 쉽게 바꿀 수 있지만 URL 변경은 외부 링크와 검색 기록에 영향을 준다.

따라서:

```text
기존 URL 유지
→ canonical 문서 확정
→ 필요할 때만 redirect
```

순서로 진행한다.

## 원칙 3. 기계적 변경과 의미 변경 분리

예:

```text
Commit 1: type/status 필드 자동 추가
Commit 2: 대표 문서 상태 수동 검토
Commit 3: 본문 기술 내용 보완
```

한 commit에 섞지 않는다.

## 원칙 4. 현재 문제를 먼저 측정

다음은 추측으로 바로 최적화하지 않는다.

```text
검색 인덱스 크기
빌드 Peak RSS
코드 블록 수
색인 가능한 URL 수
얕은 태그 수
고아 문서 수
```

먼저 baseline을 만든다.

## 원칙 5. 재신청보다 실질적 개선 완료가 기준

AdSense 재신청일을 먼저 정하지 않는다.

아래 완료 조건을 충족한 뒤 재신청한다.

---

#### 32. Sprint 2 — 2주차: 대표 문서 선정과 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41995; message: 81 (assistant); path: 2주 계획: 기반과 대표 콘텐츠 > Sprint 2 — 2주차: 대표 문서 선정과 검증 -->

### 목표

사이트 전체를 대표할 문서 20개를 선정하고, 그중 5개를 바로 공개 가능한 상태로 만든다.

### 작업 1. 대표 문서 20개 선정

권장 배분:

| Topic | 목표 수 |
|---|---:|
| PCIe & CXL | 5 |
| Firmware & Bootloader | 4 |
| C++ | 4 |
| GPU & CUDA | 4 |
| Linux & Systems | 3 |

문서 수보다 역할 다양성이 중요하다.

```text
Guide
Concept
Source Walkthrough
Debug Note
Experiment
```

가 적절히 섞여야 한다.

### 작업 2. 대표 문서 감사표 작성

필드:

```text
문서 ID
Topic
Type
Status
현재 검색 의도
중복 후보
환경 필요
보완 작업
Featured 가능 여부
```

### 작업 3. 첫 5개 문서 보완

우선 조건:

```text
기술적으로 비교적 유효함
수정량이 작음
사이트 전문성을 보여줌
다른 문서의 시작점임
```

각 글에서 수행:

```text
제목
description
type/topic/status
환경·버전
사실·관찰·가설 구분
한계
상위 Hub
다음 문서
```

### 작업 4. 구판 노출 방지

명백한 구판은 우선:

```text
needs-review
historical
superseded
```

중 하나로 지정하고 Featured 후보에서 제외한다.

### 2주차 완료 조건

```text
[ ] 대표 문서 20개 감사표
[ ] 20개 모두 type/topic/status 지정
[ ] 최소 5개 current 검증
[ ] 첫 Featured 후보 4~5개 확정
[ ] 명백한 구판의 Featured 노출 차단
```

---

#### 33. Task 3-10. 첫 실행용 작업 티켓

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:42900; message: 83 (assistant); path: Task 3-10. 첫 실행용 작업 티켓 -->

이제 로드맵을 실제로 시작할 수 있도록 첫 번째 작업 묶음을 티켓 수준으로 줄인다.

이번 단계에서는 전체 12주 계획 중 **첫 1~2주에 착수할 작업만** 다룬다.

핵심 목표는 다음이다.

```text
현재 사이트를 대규모로 수정하지 않고
대표 콘텐츠와 정보 구조의 기준부터 확정한다.
```

---

#### 34. 커밋 분리 권장안

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43664; message: 83 (assistant); path: 커밋 분리 권장안 -->

## Commit 1

```text
docs: define site purpose and editorial model
```

포함:

```text
사이트 목적
상태 정의
타입 정의
Topic 원칙
```

## Commit 2

```text
feat(content): add topic, type and status schema
```

포함:

```text
enum
schema
validation
```

## Commit 3

```text
chore(content): classify representative article candidates
```

포함:

```text
대표 문서 감사표
큐레이션 config
```

## Commit 4~8

문서별로 분리하거나 Topic별로 묶는다.

```text
content(pcie): verify BAR sizing guide
content(cuda): revise pinned memory experiment
```

## Commit 9

```text
fix(content): exclude outdated articles from featured paths
```

---

#### 35. 원칙 2. 형식 검증과 의미 검증을 분리한다

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50203; message: 98 (assistant); path: 2. 설계 원칙 > 원칙 2. 형식 검증과 의미 검증을 분리한다 -->

### 형식 검증

문서 하나만 보고 판단할 수 있다.

```text
status 값이 올바른가
날짜 형식이 맞는가
title이 비어 있지 않은가
```

### 의미 검증

전체 문서 집합이 필요하다.

```text
ID가 중복되는가
relation 대상이 존재하는가
superseded cycle이 있는가
Featured 문서가 current인가
```

---

#### 36. 92. Article 품질 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62113; message: 106 (assistant); path: 92. Article 품질 검사 -->

자동화 가능한 항목:

```text
H1 중복
Description 누락
Status와 Notice 불일치
Canonical 누락
Heading Anchor 중복
깨진 내부 링크
이미지 Alt 누락
표 Header 누락 후보
코드 언어 오타
```

사람이 검토해야 하는 항목:

```text
결론이 근거를 초과하는가
가설이 사실처럼 표현됐는가
범위가 명확한가
그림이 실제 이해에 도움이 되는가
```

---

#### 37. 47. 발행 전 체크리스트

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63629; message: 108 (assistant); path: 47. 발행 전 체크리스트 -->

## 기술

```text
[ ] 핵심 결론을 다시 확인함
[ ] 환경과 버전을 기록함
[ ] 관찰·추론·가설을 구분함
[ ] 코드·로그·표의 단위를 확인함
[ ] 범위와 한계를 명시함
```

## 콘텐츠

```text
[ ] 제목과 실제 범위가 일치함
[ ] Description이 고유함
[ ] Heading 흐름이 자연스러움
[ ] 긴 코드와 로그를 필요한 부분만 남김
[ ] 대표 그림이나 예제가 실제 이해에 도움 됨
```

## 구조

```text
[ ] Topic·Type·Status 지정
[ ] Prerequisite 필요 여부 확인
[ ] Next Reading 지정
[ ] 기존 중복 글과 역할 구분
[ ] 구판 문서 연결 확인
```

## 운영

```text
[ ] 내부 링크 정상
[ ] 민감 정보 제거
[ ] 모바일 확인
[ ] Draft 해제
[ ] Published·Updated 날짜 확인
```

---

#### 38. 74. 추천 최종 런타임 경계

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:69057; message: 112 (assistant); path: 74. 추천 최종 런타임 경계 -->

```text
정적 HTML
├── Home
├── Topic Hub
├── Article
├── Archive
└── Policy Pages

소형 Client 기능
├── Search
├── Theme
├── Code Copy
└── Comments Loader

Build-only 기능
├── Content Validation
├── Search Index Generation
├── Sitemap·RSS
├── OG Generation
└── Audit Reports
```

이 정도면 충분하다.

---

#### 39. 96. 최신 CSS 기능의 Fallback 미검토

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73364; message: 116 (assistant); path: 96. 최신 CSS 기능의 Fallback 미검토 -->

다음 기능을 사용할 수 있다.

```text
subgrid
container queries
color-mix()
:has()
```

현재 지원 브라우저 범위에서 적절한지 확인한다.

기술 블로그 독자는 최신 브라우저 비율이 높을 수 있지만, 실제 Analytics 없이 단정하지 않는다.

Fallback이 없어도 콘텐츠 읽기가 가능한 Progressive Enhancement 구조가 이상적이다.

---

#### 40. 71. 반대로 매 변경에 모든 Visual Test 실행

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75529; message: 118 (assistant); path: 71. 반대로 매 변경에 모든 Visual Test 실행 -->

오탈자 수정 하나에도 전체 브라우저 Matrix와 Visual Test를 돌리면 비용이 과하다.

변경 범위 분류:

```text
콘텐츠 본문
Metadata
CSS
검색
Markdown Pipeline
Layout
```

에 따라 추가 Test Suite를 실행할 수 있다.

그러나 조건 로직이 너무 복잡해지면 단순히 핵심 Smoke는 항상 실행하는 편이 낫다.

---

#### 41. 지금 시점의 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:79601; message: 123 (assistant); path: 지금 시점의 추천 -->

범용 안티패턴 작업은 **90~95% 완료**로 보는 것이 적절하다.

계속 같은 방식으로 `다음`을 진행하면:

```text
상태
대표 문서
검색
링크
색인
Migration
```

이 이름만 바뀌어 다시 나올 가능성이 높다.

따라서 남은 범용 영역은 다음 세 개로 종료하는 것이 좋다.

```text
1. 보안·공급망
2. 저작권·라이선스
3. 백업·보존
```

그 뒤에는 전체 목록을 다음처럼 정리해야 한다.

```text
필수
권장
현재 불필요
과설계 위험
실제 저장소 확인 필요
```

즉, 이제부터 중요한 것은 **안티패턴을 더 늘리는 것보다 중복을 제거하고 실행 가능한 최종 백로그로 압축하는 것**이다.

## 124. user

어 어차피 내가 압축할꺼니깐 남은거 빠르게 설명없이 나열만 가능?

## 125. assistant

가능. **중복 가능성이 낮은 남은 영역만** 빠르게 나열하면 아래 정도다.

### 실행·로드맵

#### 42. 내가 추천하는 최종 프로젝트

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:1554; message: 11 (assistant); path: Task 8. 실행 계획 > 내가 추천하는 최종 프로젝트 -->

이걸 하나의 프로젝트로 묶자.

> **Project Hawk Knowledge Architecture**

산출물은 다음 6개 문서다.

1. **Technical Blog Architecture Review**
2. **Technical Blog Anti-pattern Catalog (100~150개)**
3. **hawk90.github.io Site Audit**
4. **Knowledge Architecture Design**
5. **Google AdSense Low Value Content Improvement Plan**
6. **6개월 리팩토링 로드맵**

이렇게 진행하면 단순히 애드센스 대응에 그치지 않고, 블로그 자체를 장기적인 기술 지식베이스로 발전시키는 데 도움이 될 거라고 생각해.

#### 43. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6618; message: 28 (assistant); path: 7. 일곱 번째 핵심 안티패턴 > Content Model Drift > 권장 -->

콘텐츠 스키마에 버전 개념을 넣는 것이 좋다.

```yaml
schemaVersion: 2
```

다만 모든 글에 직접 넣기보다 migration 도구가 현재 스키마를 보장하도록 해도 된다.

#### 44. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:7101; message: 28 (assistant); path: 16. 열여섯 번째 핵심 안티패턴 > Migration Avoidance > 권장 -->

Big Bang migration은 하지 않는다.

대신 우선순위를 둔다.

```text
Tier 1: 대표 글 20개
Tier 2: 검색 유입 상위 100개
Tier 3: 현재 주요 Topic
Tier 4: 나머지 장기 정리
```

그리고 글을 수정할 때 자동으로 최신 스키마로 올리는 **touch migration** 방식을 쓸 수 있다.

```text
글 수정
→ schema migration
→ link update
→ status update
```

---

#### 45. 21. 추천 리팩토링 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:7261; message: 28 (assistant); path: 21. 추천 리팩토링 순서 -->

## P0. 역할 선언

저장소 최상단에 한 문장을 정해야 한다.

```text
이 저장소의 1차 목적은 hawk90 기술 지식베이스 운영이다.
범용 테마 제공은 2차 목적이다.
```

이 판단이 없으면 이후 모든 설계가 흔들린다.

## P0. 빌드 프로파일링

- 전체 build 시간
- peak memory
- Shiki 처리 시간
- 검색 인덱스 생성 시간
- OG 생성 시간
- 출력 크기

를 기록한다.

## P1. 콘텐츠 도구 공통 코어

Node·Python 스크립트가 공유할 수 있는 콘텐츠 manifest를 빌드한다.

```json
{
  "id": "...",
  "slug": "...",
  "title": "...",
  "topics": [],
  "series": null,
  "links": [],
  "status": "current"
}
```

각 audit는 원본 Markdown을 제각각 다시 읽지 않고 manifest를 사용한다.

## P1. 콘텐츠 스키마 버전과 migration

기존 글 전체를 한 번에 손대지 않아도 된다. 자동 변환과 검증 경로를 마련한다.

## P1. README 현실화

현재 구현, 실험 기능, 계획 기능을 구분한다.

특히 코드 테마 수와 MDX 관련 설명은 실제 상태와 맞춰야 한다.

## P2. 관리자 기능 분리

공개 사이트의 static architecture를 깨지 않도록 별도 앱이나 별도 package로 둔다.

## P2. 기능 폐기 정책

사용하지 않는 코드 테마, Newsletter, Resume, editor 기능 등을 유지할 명확한 이유가 없다면 제거 후보로 둔다.

## P2. URL 안정화

신규 글부터 명시적 slug를 도입하고, 지식 분류는 topics로 분리한다.

---

#### 46. 9. 현실적인 첫 번째 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:8081; message: 30 (assistant); path: 9. 현실적인 첫 번째 실행 묶음 -->

처음에는 이 정도만 해도 충분하다.

## Sprint 1

### 홈

- 사이트 설명 수정
- 핵심 Topic 5개 노출
- Featured Guide 영역 추가

### 콘텐츠

- 대표 글 20개 선정
- 각 글에 상위 Topic 추가
- 각 글에 다음 읽을 글 추가
- 검증 환경이 필요한 글 표시

### 허브

- `PCIe & CXL`
- `Firmware & Bootloader`

두 개만 먼저 만든다.

### 정리

- 중복 가능 글 10개 검토
- 오래된 글 10개 상태 표시
- README와 실제 기능 불일치 수정

이 정도만 해도 사이트 인상이 크게 달라진다.

---

#### 47. 실행 환경 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:9913; message: 34 (assistant); path: Task 2-2. Content Architecture Anti-patterns > C-34. Environment Omission > 실행 환경 없음 -->

<!-- empty source section -->

#### 48. 테마가 JavaScript 실행 후 적용되어 화면이 번쩍임

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:12276; message: 38 (assistant); path: JavaScript and Rendering > P-43. Runtime Theme Initialization Flash > 테마가 JavaScript 실행 후 적용되어 화면이 번쩍임 -->

<!-- empty source section -->

#### 49. 실행 환경에 따라 한글·영문 정렬 순서가 달라짐

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:12718; message: 38 (assistant); path: Build Reliability > P-77. Locale-Dependent Sorting > 실행 환경에 따라 한글·영문 정렬 순서가 달라짐 -->

<!-- empty source section -->

#### 50. 페이지 전환·제목 morph·smooth scroll을 항상 실행

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:15571; message: 43 (assistant); path: 접근성 > U-81. Reduced Motion Ignored > 페이지 전환·제목 morph·smooth scroll을 항상 실행 -->

<!-- empty source section -->

#### 51. migration 실행 즉시 파일 수정

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16192; message: 45 (assistant); path: Migration > M-13. Migration Without Dry Run > migration 실행 즉시 파일 수정 -->

<!-- empty source section -->

#### 52. 같은 migration을 두 번 실행하면 결과가 달라짐

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16214; message: 45 (assistant); path: Migration > M-14. Migration Without Idempotency > 같은 migration을 두 번 실행하면 결과가 달라짐 -->

<!-- empty source section -->

#### 53. 작성자만 실행 방법을 앎

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16324; message: 45 (assistant); path: Scripts and Tooling > M-21. Script as Undocumented Tribal Knowledge > 작성자만 실행 방법을 앎 -->

<!-- empty source section -->

#### 54. 로컬에서는 전체 검증을 실행하기 어려움

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16489; message: 45 (assistant); path: CI/CD > M-31. CI as the Only Reproducible Environment > 로컬에서는 전체 검증을 실행하기 어려움 -->

<!-- empty source section -->

#### 55. fork PR 코드를 privileged context에서 checkout·실행

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18045; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-36. Unsafe `pull_request_target` > fork PR 코드를 privileged context에서 checkout·실행 -->

<!-- empty source section -->

#### 56. package의 `preinstall`·`postinstall` 실행을 무조건 허용

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18244; message: 48 (assistant); path: E. npm과 Dependency Supply Chain > SEC-47. Install Script Trust > package의 `preinstall`·`postinstall` 실행을 무조건 허용 -->

<!-- empty source section -->

#### 57. SEC-61. Editor Can Modify Workflow Files

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18438; message: 48 (assistant); path: F. OAuth와 관리자 편집기 > SEC-61. Editor Can Modify Workflow Files -->

### 콘텐츠 편집 token이 `.github/workflows`까지 수정 가능

### 문제

다음 CI 실행에서 코드 실행 권한으로 확대될 수 있다.

### 개선

콘텐츠 작성 권한과 workflow 관리 권한을 분리한다.

---

#### 58. 가끔 실패해도 재실행으로 해결

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20369; message: 50 (assistant); path: 빌드와 운영 관측 > O-79. CI Success Rate Ignored > 가끔 실패해도 재실행으로 해결 -->

<!-- empty source section -->

#### 59. T-12. Unit Test Internal Implementation

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26121; message: 58 (assistant); path: Hello > T-12. Unit Test Internal Implementation -->

### 내부 함수 호출 순서까지 검증

### 문제

리팩토링할 때 기능은 같아도 테스트가 깨진다.

### 개선

입력과 출력 계약을 검증한다.

---

#### 60. 내부 함수 호출 순서까지 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26123; message: 58 (assistant); path: Hello > T-12. Unit Test Internal Implementation > 내부 함수 호출 순서까지 검증 -->

<!-- empty source section -->

#### 61. lint와 unit test만 실행

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26192; message: 58 (assistant); path: 통합 테스트 > T-17. Production Build Never Tested in CI > lint와 unit test만 실행 -->

<!-- empty source section -->

#### 62. 그래프만 남고 raw result·환경·실행 script가 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:28384; message: 60 (assistant); path: 장기 기술 정확성 > R-66. Benchmark Without Preservation Data > 그래프만 남고 raw result·환경·실행 script가 없음 -->

<!-- empty source section -->

#### 63. 점수가 높은 항목은 무조건 실행

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:29886; message: 62 (assistant); path: 점수화 > D-43. Score Determines Decision Automatically > 점수가 높은 항목은 무조건 실행 -->

<!-- empty source section -->

#### 64. 자동화부터 만들고 규칙은 나중에 정함

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30174; message: 62 (assistant); path: 구현 과정 > D-61. Tool Before Policy > 자동화부터 만들고 규칙은 나중에 정함 -->

예:

```text
상태 migration script를 만듦
하지만 current와 historical 기준이 없음
```

#### 65. 같은 개선 스크립트를 재실행하면 계속 변경

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30234; message: 62 (assistant); path: 구현 과정 > D-65. No Idempotency > 같은 개선 스크립트를 재실행하면 계속 변경 -->

<!-- empty source section -->

#### 66. 첫 번째 실제 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31675; message: 64 (assistant); path: 첫 번째 실제 실행 묶음 -->

가장 작게 시작하면 다음 다섯 개면 된다.

```text
1. Hero 문구 교체
2. Core Topics 5개 추가
3. Featured Guides 4개 선정
4. Latest Posts를 하단으로 이동
5. 홈 title·description 수정
```

이 묶음만 완료해도 사이트는:

```text
최신 글 블로그
```

에서:

```text
전문 시스템 지식베이스
```

로 인식되는 방향으로 크게 이동한다.

다음은 **Task 3-2. Topic Hub와 대표 문서 백로그**다. `PCIe & CXL`, `Firmware & Bootloader` 두 Hub를 실제로 어떤 구성과 metadata로 만들고, 기존 글을 어떻게 배치할지 작업 단위로 정리하게 된다.

## 65. user

다음

## 66. assistant

#### 67. 두 번째 실제 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32729; message: 66 (assistant); path: 두 번째 실제 실행 묶음 -->

가장 현실적인 첫 배포 단위는 다음이다.

```text
1. Topic registry 생성
2. PCIe & CXL Hub 초안
3. Firmware & Bootloader Hub 초안
4. 각 Hub에 Start Here 3개 선정
5. Featured 문서 총 8개 선정
6. 홈 Core Topics에서 두 Hub 연결
```

이 단계에서는 모든 기존 글에 metadata를 넣지 않아도 된다.

먼저 대표 문서와 Hub만 연결한다.

> 전체 콘텐츠를 구조화한 뒤 Hub를 공개하는 것이 아니라, Hub를 먼저 만들고 핵심 글부터 점진적으로 편입하는 편이 현실적이다.

다음 단계는 **Task 3-3. 콘텐츠 신뢰성·상태·대표 글 보완 백로그**다. 대표 글 20개에 `type`, `status`, `updated`, `lastVerified`, 테스트 환경, 근거·관찰·가설 구분을 어떻게 적용할지 실제 작업 단위로 정리한다.

## 67. user

다음

## 68. assistant

#### 68. 세 번째 실제 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33872; message: 68 (assistant); path: 세 번째 실제 실행 묶음 -->

첫 배포 단위는 이 정도가 적절하다.

```text
1. 상태 5종과 콘텐츠 타입 6종 확정
2. 대표 글 20개 감사표 작성
3. 그중 5개에 최소 metadata 적용
4. 5개 글의 사실·가설·환경·한계 보완
5. 각 글에 상위 Topic과 다음 글 추가
6. 보완 완료 글만 홈 Featured에 등록
```

이 단계가 끝나면 홈과 Topic Hub에 노출되는 콘텐츠가 단순히 “잘 쓴 글”이 아니라 **현재 상태와 근거가 확인된 대표 문서**가 된다.

다음은 **Task 3-4. 검색·내부 링크·콘텐츠 관계 개선 백로그**다. 현재 검색 인덱스를 어떤 필드로 줄이고, 한글·영문 alias와 상태별 ranking을 어떻게 적용하며, 고아 문서와 관련 글을 실제 작업으로 정리할지 다룬다.

## 69. user

다음

## 70. assistant

#### 69. 권장 흐름

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34343; message: 70 (assistant); path: D-09. 검색 인덱스 지연 로딩 > 권장 흐름 -->

```text
페이지 로드
→ 검색 버튼 클릭
→ 검색 UI 표시
→ 인덱스 로드
→ query 실행
```

인덱스가 충분히 작으면 한 파일로 시작한다.

초기부터 Topic별 shard를 만들 필요는 없다.

#### 70. D-16. 관련 글 추천 재설계

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34576; message: 70 (assistant); path: D-16. 관련 글 추천 재설계 -->

기존 태그 기반 추천이 있다면 제거부터 하지 말고 우선순위를 바꾼다.

## 추천 신호 순서

```text
명시적 관계
동일 Series
동일 세부 Topic
본문 링크
동일 콘텐츠 타입
공통 Tag
```

## 추천 슬롯

```text
다음에 읽을 글
필요한 선행 개념
같은 문제의 실전 사례
```

각 슬롯 하나씩이면 충분하다.

## fallback

명시적 관계가 없으면:

```text
상위 Topic Hub
```

하나만 보여줘도 된다.

억지 관련 글 6개보다 낫다.

---

#### 71. 추천 신호 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34580; message: 70 (assistant); path: D-16. 관련 글 추천 재설계 > 추천 신호 순서 -->

```text
명시적 관계
동일 Series
동일 세부 Topic
본문 링크
동일 콘텐츠 타입
공통 Tag
```

#### 72. 네 번째 실제 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34925; message: 70 (assistant); path: 네 번째 실제 실행 묶음 -->

첫 배포에서는 다음만 처리하는 것이 좋다.

```text
1. 대표 검색어 20개 baseline 작성
2. 검색 레코드에서 전체 코드·로그 제거
3. Title·Alias·Topic·Heading 가중치 적용
4. C++, MSI-X, CXL 등 핵심 alias 30개 등록
5. 대표 글 20개에 parent·next·related 관계 추가
6. 고아 문서 상위 20개 리포트 생성
7. 구판 문서가 Featured·추천에 나오지 않게 처리
```

이 단계가 끝나면 검색은 단순 문자열 찾기에서 **대표 지식을 우선하는 탐색 기능**으로 바뀌고, 개별 글도 더 이상 읽고 끝나는 막다른 페이지가 아니게 된다.

## 71. user

다음

## 72. assistant

#### 73. 실행 조건

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35808; message: 72 (assistant); path: E-15. 다이어그램 파이프라인 격리 > 실행 조건 -->

```text
source hash 변경
generator version 변경
명시적 전체 재생성
```

#### 74. 명시적으로 실행

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36330; message: 72 (assistant); path: E-27. 로컬 Fast Path > 명시적으로 실행 -->

```text
npm run check
npm run build:release
npm run audit
```

#### 75. 실행 경로

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36474; message: 72 (assistant); path: Epic E 완료 기준 > 실행 경로 -->

```text
Fast validation
Release build
정기 audit
```

#### 76. 다섯 번째 실제 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36529; message: 72 (assistant); path: 다섯 번째 실제 실행 묶음 -->

첫 번째 배포 단위에서는 완전한 증분 빌드까지 갈 필요가 없다.

다음 순서가 현실적이다.

```text
1. 전체 빌드의 단계별 시간과 Peak RSS 기록
2. 코드 블록 언어·크기 통계 생성
3. build, build:release, audit 명령 분리
4. 공통 Content Manifest의 최소 버전 구현
5. 검색·Sitemap·RSS가 같은 Publication Policy 사용
6. CI 전체 Astro build를 한 번만 실행
7. 생성 artifact를 smoke test한 뒤 그대로 배포
8. 외부 링크 전체 검사는 정기 작업으로 이동
```

이 단계에서 메모리가 충분히 줄어들면 복잡한 캐시 시스템은 만들지 않아도 된다.

반대로 여전히 Shiki와 파생 자산 생성이 주 병목으로 확인될 때만 문서별 캐시와 증분 생성을 추가한다.

다음은 **Task 3-6. SEO·AdSense 재신청 준비 백로그**다. 색인 페이지 유형 정리, 중복·Thin Page 처리, About·Privacy·Editorial Policy, 대표 문서 보완, 광고 적용 전 검사와 재신청 완료 조건을 실제 작업 단위로 연결한다.

## 73. user

다음

## 74. assistant

이번에는 **Task 3-6. SEO·AdSense 재신청 준비 백로그**다. 색인 정리, 신뢰 페이지, 대표 글 보완, 광고 적용 전 검증 순서로 실제 작업 단위를 잡겠다.

## 75. assistant

이번 단계는 **AdSense 승인 보장 요령**이 아니라, 재신청 전에 사이트가 실제로 더 가치 있고 일관된 상태가 되었는지를 검증하는 백로그다.

:::writing{variant="document" id="68427"}

#### 77. 여섯 번째 실제 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38113; message: 75 (assistant); path: 여섯 번째 실제 실행 묶음 -->

재신청 전 실제 작업은 다음 순서가 가장 현실적이다.

```text
1. 최종 배포 URL 유형과 색인 상태 집계
2. Search·Admin·Draft·빈 Tag를 Sitemap에서 제거
3. 얕은 Tag와 중복 Series 페이지 정리
4. 대표 글 10개를 current 상태로 보완
5. PCIe & CXL, Firmware & Bootloader Hub 완성
6. About·Privacy·Editorial Policy 공개
7. canonical·title·description 전수 검사
8. 모바일·404·검색·Topic Hub smoke test
9. 광고 코드 없이 최종 사이트 검토
10. 변경 commit과 체크리스트를 기록한 뒤 재신청
```

#### 78. 일곱 번째 실제 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39689; message: 77 (assistant); path: 일곱 번째 실제 실행 묶음 -->

가장 현실적인 첫 배포 단위는 다음이다.

```text
1. Production dist에서 관리자 route와 OAuth 관련 코드 제거
2. 모든 workflow에 최소 permissions 명시
3. Build와 Deploy job 분리
4. 외부·공식 Action을 full SHA로 고정
5. Secret Inventory와 외부 Integration Inventory 작성
6. 검색 UI의 innerHTML·highlight 처리 검사
7. Markdown·로그·dist를 대상으로 secret scan 추가
8. 사내 hostname·개인 경로·내부 URL 노출 리포트 생성
9. Privacy Policy를 실제 AdSense·Analytics·Giscus 구성과 일치시킴
10. HTTPS·canonical·custom domain 상태를 최종 검증
```

이 작업이 끝나면 공개 사이트는 다시 단순한 정적 읽기 사이트가 되고, 빌드·배포 권한과 외부 서비스 위험이 콘텐츠 자체로부터 분리된다.

다음은 **Task 3-8. 테스트·회귀 검증·출시 체크리스트 백로그**다. 지금까지 A~G에서 바꾼 홈, Hub, metadata, 검색, 색인, 빌드, 보안이 다시 깨지지 않도록 최소 테스트 세트와 출시 순서를 정의한다.

## 78. user

다음

## 79. assistant

#### 79. Epic H. 테스트·회귀 검증·출시 관리

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39743; message: 79 (assistant); path: Epic H. 테스트·회귀 검증·출시 관리 -->

## H-01. 테스트 계층 확정

테스트를 네 계층으로 나눈다.

```text
1. Content validation
2. Build integration
3. Browser smoke test
4. Scheduled audit
```

## 1. Content validation

빠르고 결정적이어야 한다.

```text
schema
slug uniqueness
internal links
relations
publication policy
```

## 2. Build integration

실제 production 결과를 생성한다.

```text
Astro build
search index
Sitemap
RSS
generated assets
```

## 3. Browser smoke test

최종 `dist`를 브라우저에서 확인한다.

```text
홈
Topic Hub
대표 글
검색
404
모바일
```

## 4. Scheduled audit

외부 환경 때문에 느리거나 flaky할 수 있는 검사다.

```text
외부 링크
dependency 상태
콘텐츠 최신성
대형 이미지
중복 후보
```

## 완료 조건

- 각 검사가 어느 계층에 속하는지 명확함
- 느린 감사가 일반 글 수정을 막지 않음
- 배포 전에 반드시 필요한 검사가 별도 명령으로 실행됨

## 우선순위

```text
P0
```

---

#### 80. 여덟 번째 실제 실행 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41676; message: 79 (assistant); path: 여덟 번째 실제 실행 묶음 -->

처음부터 시각 회귀와 모든 브라우저 테스트까지 만들 필요는 없다.

첫 번째 안정화 배포에서는 다음만 구현한다.

```text
1. Content schema·slug·relation 검사
2. 내부 링크와 heading anchor 검사
3. Hub·Featured 상태 불변조건 검사
4. Search·Sitemap·RSS 공개 집합 일치 검사
5. Production build 1회
6. 최종 dist의 secret·admin·민감 파일 검사
7. 홈·Hub·대표 글·검색·404 HTTP smoke test
8. Golden query 20개 테스트
9. 모바일 viewport 가로 overflow 검사
10. Workflow permission·Action SHA lint
11. 테스트한 artifact를 그대로 배포
12. 운영 URL에서 대표 페이지 재검증
```

이 수준만으로도 지금까지 A~G에서 만든 핵심 구조의 대부분을 보호할 수 있다.

#### 81. 첫 실행 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:42878; message: 81 (assistant); path: 첫 실행 순서 -->

실제로 내일부터 시작한다면 다음 순서가 가장 좋다.

```text
1. 대표 문서 후보 20개 목록 작성
2. 상태·타입·Topic registry 확정
3. 대표 문서 5개 metadata와 내용 보완
4. PCIe & CXL Hub 초안
5. Firmware & Bootloader Hub 초안
6. 홈 Hero와 Featured 구조 변경
7. Sitemap·Tag·canonical 감사
```

이 일곱 단계가 완료되기 전에는 검색 엔진 고도화나 증분 빌드로 넘어가지 않는 편이 좋다.

## 82. user

다음

## 83. assistant

#### 82. Sprint 1 권장 실행 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43647; message: 83 (assistant); path: Sprint 1 권장 실행 순서 -->

```text
S1-01 사이트 목적
→ S1-02 상태
→ S1-03 타입
→ S1-04 Topic registry
→ S1-05 Schema
→ S1-06 Featured validation
→ S1-07 대표 문서 후보
→ S1-08 감사표
→ S1-09 첫 5개 보완
→ S1-10 구판 노출 차단
```

---

#### 83. 권장 역할 구성

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44279; message: 85 (assistant); path: 8. Featured Guides > 권장 역할 구성 -->

| 순서 | 역할 | 권장 문서 |
|---:|---|---|
| 1 | 전체 Guide | PCIe 장치 초기화 전체 흐름 |
| 2 | 핵심 Concept | BAR 크기 탐색과 주소 할당 |
| 3 | Source Walkthrough | Linux PCI enumeration |
| 4 | 핵심 Concept | MSI-X 설정 흐름 |
| 5 | CXL Guide | CXL 메모리 주소 변환 |
| 6 | 실전 Debug | FPGA BAR 접근 실패 분석 |

#### 84. 23. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44978; message: 85 (assistant); path: 23. 권장 커밋 순서 -->

```text
1. content: map PCIe and CXL articles to hub roles
2. content: verify PCIe and CXL start-here guides
3. feat(topic): add PCIe and CXL hub configuration
4. feat(topic): render shared topic hub sections
5. test(topic): validate curated hub documents
6. fix(topic): improve mobile PCIe and CXL navigation
```

기존 글의 본문 대량 수정과 Hub UI 구현을 같은 commit에 섞지 않는다.

---

#### 85. ① CPU는 전원을 켜면 무엇부터 실행하는가

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:45848; message: 90 (assistant); path: 9. 신규로 반드시 써야 하는 글 > ① CPU는 전원을 켜면 무엇부터 실행하는가 -->

이 글이

Hub의 얼굴이다.

---

#### 86. 58. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50050; message: 96 (assistant); path: 58. 권장 커밋 순서 -->

```text
1. refactor(domain): add normalized content model

2. refactor(content): build shared content manifest

3. feat(publication): centralize publication decisions

4. refactor(topic): move topic registry and curation

5. refactor(home): render featured content from domain queries

6. refactor(search): build index from content manifest

7. refactor(seo): align sitemap and RSS publication sets

8. test(domain): validate content, curation and publication rules

9. cleanup: remove duplicate content loaders
```

---

#### 87. 권장 선택

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51088; message: 98 (assistant); path: 21. 기본 타입을 `reference`로 두는 문제 > 권장 선택 -->

### Strict mode

대표 문서와 신규 문서는 type 필수.

기존 글은 별도 Legacy Adapter로 처리한다.

### Migration mode

```ts
type: ContentType | "unclassified";
topicId: string | "unclassified";
```

모든 migration이 끝나면 제거한다.

초기 프로젝트에서는 Migration mode가 현실적이다.

---

#### 88. 28. Topic 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51373; message: 98 (assistant); path: 28. Topic 검증 -->

```ts
export function validateTopicIds(
  documents: readonly ContentDocument[],
  validTopicIds: ReadonlySet<string>,
): ValidationIssue[] {
  return documents.flatMap(
    (document): ValidationIssue[] => {
      if (
        validTopicIds.has(
          document.topicId,
        )
      ) {
        return [];
      }

      return [{
        ruleId: "content/unknown-topic",
        severity:
          document.topicId ===
          "unclassified"
            ? "warning"
            : "error",
        documentId: document.id,
        sourcePath:
          document.sourcePath,
        field: "topic",
        message:
          `Unknown topic ID ` +
          `"${document.topicId}".`,
      }];
    },
  );
}
```

Migration 기간에는 `unclassified`를 warning으로 허용할 수 있다.

신규 문서에서는 error로 강화할 수 있다.

---

#### 89. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:54070; message: 98 (assistant); path: 권장 커밋 순서 -->

```text
1. feat(domain): define normalized content document model

2. refactor(content): normalize Astro entries into content documents

3. feat(content): build and validate shared content manifest

4. feat(publication): centralize document publication decisions

5. refactor(search): derive search documents from the manifest

6. refactor(seo): derive sitemap entries from publication policy

7. test(content): cover manifest and policy invariants
```

---

#### 90. Hawk90 블로그에 가장 추천하는 Hub

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:55197; message: 100 (assistant); path: Hawk90 블로그에 가장 추천하는 Hub -->

현재 기술 스택을 기준으로 하면 다음과 같이 구성하는 것이 가장 자연스럽다.

```text
Systems Programming
├── C++
├── Linux Kernel
├── Firmware & Bootloader
├── PCIe & CXL
├── GPU & CUDA
├── FPGA & XRT
├── Video Codec (AV1/H.264/HEVC)
├── Performance Engineering
├── Debugging
└── Computer Architecture
```

여기서 중요한 점은 **언어(C++)보다 문제 영역(PCIe, CUDA, Firmware)** 을 중심으로 허브를 만들고, C++은 여러 허브를 연결하는 기반 기술로 사용하는 것이다.

---

## 이번 태스크의 핵심 결론

`Topic Hub`는 **카테고리 페이지**가 아니다.

> 하나의 대학 강의 홈페이지처럼, "무엇을 어떤 순서로 배우면 되는지"를 안내하는 **학습 지도(Learning Map)** 여야 한다.

이 구조가 갖춰지면 방문자는 검색으로 들어와도 한 글만 읽고 떠나는 것이 아니라, **다음 글, 다음 개념, 다음 단계**로 자연스럽게 이동하게 된다. 이것은 체류 시간과 재방문율뿐 아니라, "콘텐츠 내용 없음"으로 평가받기 쉬운 단편적 블로그에서 **지식 베이스(Knowledge Base)** 로 인식되는 데에도 큰 도움이 된다.

## 101. user

다음

## 102. assistant

#### 91. 69. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57557; message: 102 (assistant); path: 69. 권장 커밋 순서 -->

```text
1. feat(search): define minimal search document model

2. refactor(search): derive searchable documents from content manifest

3. feat(search): add terminology and technical query normalization

4. feat(search): introduce weighted search adapter

5. test(search): add golden query regression set

6. feat(search-ui): lazy-load search dialog and index

7. fix(search-ui): render safe highlights and fallback states

8. perf(search): report index size and initialization cost
```

---

#### 92. 41. Series 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58819; message: 104 (assistant); path: 41. Series 검증 -->

```text
문서 ID 존재
문서 중복 없음
문서 Topic 일관성 또는 예외 설명
Archived 문서가 Active Series에 없음
Series 순서 cycle 없음
```

---

#### 93. 91. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60024; message: 104 (assistant); path: 91. 권장 커밋 순서 -->

```text
1. feat(relations): define document relation model

2. feat(relations): validate targets and relation invariants

3. feat(relations): build reverse prerequisite graph

4. feat(content): map representative documents to learning relations

5. feat(article): render prerequisite, next and example links

6. feat(audit): report orphan and dead-end documents

7. refactor(recommendations): prefer explicit relations over tags

8. fix(links): replace redirected internal URLs with canonical targets
```

---

#### 94. 100. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62322; message: 106 (assistant); path: 100. 권장 커밋 순서 -->

```text
1. feat(article): add structured article page view model

2. feat(article): redesign header with type, topic and status

3. feat(article): render status notices and prerequisites

4. feat(article): add summary, environment and evidence sections

5. refactor(code): distinguish source, command, output and error blocks

6. feat(article): render role-based next reading and examples

7. feat(article): add edit and error-report actions

8. fix(article): improve mobile code, tables and table of contents

9. test(article): add content-type canary pages and smoke checks
```

---

#### 95. 23. 실행 결과 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63084; message: 108 (assistant); path: 23. 실행 결과 검증 -->

작은 예제는 예상 출력을 함께 지정할 수 있다.

```yaml
example:
  command: ./build/vector_add
  expectedExitCode: 0
```

하지만 복잡한 CUDA·FPGA·Kernel 예제를 일반 CI에서 실행하려고 하지 않는다.

환경별 검증 수준을 구분한다.

```text
Syntax checked
Compiled
Executed
Hardware verified
```

---

#### 96. 95. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:64756; message: 108 (assistant); path: 95. 권장 커밋 순서 -->

```text
1. feat(content-tools): add type-aware article generator

2. feat(validation): enforce strict rules for new documents

3. feat(validation): add representative content quality gates

4. feat(content-tools): add article review command

5. feat(content-tools): support publish dry-run and date updates

6. feat(audit): report stale and high-priority review documents

7. feat(security): scan changed content for sensitive information

8. docs(editorial): document authoring and publication workflow
```

---

#### 97. 71. 권장 Topic 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:66587; message: 110 (assistant); path: 71. 권장 Topic 순서 -->

현재 사이트의 차별화와 경험을 기준으로:

```text
1. PCIe & CXL
2. Firmware & Bootloader
3. Linux & Systems
4. GPU & CUDA
5. C++
6. FPGA·XRT
7. Video Codec
8. 기타
```

다만 실제 글 수와 품질을 보고 조정한다.

---

#### 98. 99. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:67213; message: 110 (assistant); path: 99. 권장 커밋 순서 -->

```text
1. feat(migration): inventory legacy content and URLs

2. feat(migration): define migration tiers and actions

3. feat(migration): generate topic and type suggestions

4. content: classify first representative migration batch

5. feat(migration): apply reviewed metadata manifests

6. content(pcie): verify and promote representative guides

7. content(history): mark version-specific articles as historical

8. content(cleanup): merge duplicate and superseded articles

9. fix(links): update internal links to canonical destinations

10. feat(report): track migration and content health progress
```

---

#### 99. 권장 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:67391; message: 112 (assistant); path: Task 3-23. 의존성·기능 가지치기와 정적 사이트 복잡도 축소 > 1. 핵심 안티패턴: 정적 블로그를 애플리케이션처럼 운영 > 권장 구조 -->

```text
빌드 시:
콘텐츠 선택·정렬·관계 계산

브라우저:
검색 Dialog, 테마 전환처럼 실제 상호작용만 실행
```

---

#### 100. 80. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:69212; message: 112 (assistant); path: 80. 권장 커밋 순서 -->

```text
1. audit: inventory runtime features and dependencies

2. cleanup: remove unused dependencies and integrations

3. security: exclude admin tooling from production

4. perf: remove hydration from static content components

5. perf: lazy-load comments and optional integrations

6. refactor(markdown): remove duplicate parsing and plugins

7. cleanup: remove completed feature flags and legacy components

8. refactor(build): consolidate local and CI commands

9. report: compare build and bundle metrics after pruning
```

---

#### 101. 74. Deployment Smoke가 너무 늦게 실행

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:70867; message: 114 (assistant); path: 74. Deployment Smoke가 너무 늦게 실행 -->

배포가 끝난 뒤 수동으로 며칠 후 확인하면 장애가 오래 유지된다.

자동 Smoke는 배포 직후 실행하고 실패 시 Workflow를 실패 상태로 표시한다.

다만 이미 Production에 배포된 뒤이므로 자동 Rollback까지 무리하게 구현하기보다 즉시 알 수 있는 것이 우선이다.

---

#### 102. 99. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71358; message: 114 (assistant); path: 99. 권장 커밋 순서 -->

```text
1. ci: separate build and pages deployment jobs

2. ci: deploy the exact tested artifact

3. security: minimize workflow permissions

4. ci: cancel superseded page deployments

5. test(dist): validate production artifacts and sensitive files

6. test(browser): run smoke checks against the static dist

7. fix(urls): validate base paths, canonical and generated assets

8. feat(ops): expose deployed commit metadata

9. test(deploy): verify critical production URLs after deployment

10. docs(ops): document rollback and incident recovery
```

---

#### 103. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73833; message: 116 (assistant); path: 권장 커밋 순서 -->

```text
1. refactor(styles): separate tokens, prose and layout responsibilities

2. refactor(layout): introduce site, reading and wide containers

3. fix(prose): normalize heading and block spacing

4. fix(responsive): prevent code, tables and identifiers from breaking pages

5. refactor(cards): replace boolean-heavy cards with role-based variants

6. fix(theme): improve dark-mode surfaces and technical content contrast

7. fix(navigation): simplify mobile header and menu hierarchy

8. fix(a11y): restore focus, target size and reduced-motion behavior

9. test(visual): add representative content and viewport canaries
```

---

#### 104. 1. 모든 검증을 E2E 테스트로 해결

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73944; message: 118 (assistant); path: Task 3-26. 테스트 아키텍처·회귀 방지·품질 게이트 안티패턴 > 1. 모든 검증을 E2E 테스트로 해결 -->

가장 흔한 과잉 접근이다.

```text
페이지를 빌드한다
→ 브라우저를 연다
→ 메뉴를 클릭한다
→ 문서를 찾는다
→ 텍스트를 확인한다
```

브라우저 테스트는 실제 사용자 흐름을 검증할 수 있지만 다음 비용이 크다.

```text
실행 시간이 김
실패 원인 추적이 어려움
환경 영향이 큼
Fixture 준비가 복잡함
작은 변경에도 깨짐
```

예를 들어 중복 문서 ID를 브라우저 테스트에서 찾는 것은 너무 늦다.

중복 ID는 Domain Validation에서 즉시 실패해야 한다.

### 권장 계층

```text
순수 함수
→ Unit Test

콘텐츠 집합 규칙
→ Domain·Manifest Test

생성 파일 계약
→ Artifact Integration Test

페이지 구조
→ HTML Test

핵심 사용자 흐름
→ Browser Smoke Test

시각 변화
→ 선별 Visual Regression
```

---

#### 105. 67. 테스트 실행 명령이 너무 많음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75424; message: 118 (assistant); path: 67. 테스트 실행 명령이 너무 많음 -->

```text
test
test:unit
test:domain
test:content
test:integration
test:html
test:browser
test:visual
test:full
test:ci
```

가 생기면 어떤 명령을 실행해야 하는지 모른다.

권장 사용자 명령은 적게 둔다.

```text
npm run check
npm run test
npm run test:browser
npm run test:full
```

내부적으로 여러 Test Project를 호출할 수 있다.

---

#### 106. 69. 빠른 검증과 전체 검증 구분 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75476; message: 118 (assistant); path: 69. 빠른 검증과 전체 검증 구분 없음 -->

모든 Markdown·Browser·Visual Test가 매 저장마다 실행되면 개발 속도가 떨어진다.

권장 단계:

## 빠른 Local Check

```text
Typecheck
변경 파일 Lint
Unit Test
```

## PR Check

```text
전체 Domain
Content Validation
Production Build
HTML Integration
핵심 Browser Smoke
```

## 정기·Release

```text
전체 Browser Matrix
Visual
External Link
성능 Benchmark
Clean Build
```

---

#### 107. 81. 테스트 실패를 자동 재실행해 숨김

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75660; message: 118 (assistant); path: 81. 테스트 실패를 자동 재실행해 숨김 -->

모든 실패를 3회 Retry한 뒤 하나라도 통과하면 성공으로 처리하면 Flaky Test가 영구화된다.

Retry를 사용해도 첫 실패를 Report에 남기고 Flaky 빈도를 추적한다.

동일 테스트가 반복 Flaky하면 격리하거나 원인을 수정한다.

---

#### 108. 88. 배포 Workflow를 테스트하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75751; message: 118 (assistant); path: 88. 배포 Workflow를 테스트하지 않음 -->

GitHub Actions YAML 자체는 실행 전까지 오류를 발견하기 어렵다.

가능한 검증:

```text
Action Lint
Reusable local commands
Pull Request Build
Artifact 생성
```

Workflow 안의 Shell 로직을 최소화해 별도 테스트 부담을 줄인다.

---

#### 109. 89. `package.json` Script가 실제로 동작하는지 미검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75768; message: 118 (assistant); path: 89. `package.json` Script가 실제로 동작하는지 미검증 -->

문서에는:

```text
npm run content:check
```

가 있지만 Script 이름이 바뀌거나 깨질 수 있다.

CI에서 공개된 핵심 명령을 직접 실행한다.

README 예제까지 전부 자동 실행할 필요는 없지만 사용자-facing 명령은 보호한다.

---

#### 110. 103. 권장 커밋 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76161; message: 118 (assistant); path: 103. 권장 커밋 순서 -->

```text
1. test(domain): cover publication and relation invariants

2. test(fixtures): add realistic technical content edge cases

3. test(content): validate the complete content manifest

4. test(markdown): protect code, tables, headings and legacy syntax

5. test(artifacts): verify generated HTML, sitemap and RSS contracts

6. test(search): add golden query ranking regressions

7. test(browser): cover core navigation and search flows

8. test(browser): verify readable pages without JavaScript

9. test(visual): limit screenshots to representative risk canaries

10. ci: separate fast checks from full regression suites
```

---

#### 111. 권장 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76746; message: 121 (assistant); path: 11. 홈에서 최근 글만 보여줌 > 권장 순서 -->

```text
대표 전문 영역
대표 문서
Topic
최근 글
```

최근 글은 보조 영역이다.

---

#### 112. 95. 권장 실행 순서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:79059; message: 121 (assistant); path: 95. 권장 실행 순서 -->

```text
1. audit(seo): inventory every indexable page type

2. fix(indexing): noindex search, empty and duplicate listing pages

3. fix(sitemap): submit only canonical content destinations

4. content: strengthen the first ten representative technical articles

5. feat(topics): publish three complete technical topic hubs

6. refactor(home): lead with expertise and representative content

7. content: consolidate overlapping short technical notes

8. content: classify obsolete articles as historical or superseded

9. docs(site): clarify author expertise and privacy practices

10. audit(ads): verify ad eligibility by page type
```

---

### 검증·품질

#### 113. 권장 상태

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:3536; message: 19 (assistant); path: 15. 수정 이력이 콘텐츠에 반영되지 않는 문제 > Timeless Technical Article > 권장 상태 -->

```yaml
published: 2024-05-10
updated: 2026-07-20
last_verified: 2026-07-18
status: current
```

또는 문서 상단에:

```text
상태: 현재 유효
검증 환경: Linux 6.12 / CUDA 13.x
```

낡은 글은 삭제할 필요 없이 다음처럼 표시할 수 있다.

```text
Historical
Needs Review
Superseded
Current
```

---

#### 114. 정기 품질 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4166; message: 22 (assistant); path: 4. 세 번째 핵심 안티패턴 > Build-Time Feature Accumulation > 정기 품질 검사 -->

```text
중복 주제
콘텐츠 신선도
이미지 커버리지
상위 문서 변경 여부
```

모든 검사를 매번 돌리는 것보다 **빈도와 목적을 분리**하는 게 맞다.

---

#### 115. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4679; message: 22 (assistant); path: 12. 사용하지 않는 의존성 잔존 가능성 > Dependency Archaeology > 권장 -->

CI에 정적 dependency 검사만 믿기보다는 용도 문서를 남기는 게 낫다.

```text
Package             Purpose
@milkdown/kit       Admin Markdown editor
marked              Live preview renderer
@astrojs/mdx        현재 미사용, 제거 예정
```

특히 빌드 메모리가 이미 문제라면 의존성 정리는 의미가 있다.

---

#### 116. 13.6 품질 감사 자동화

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4718; message: 22 (assistant); path: 13. 현재 기술 스택에서 잘한 부분 > 13.6 품질 감사 자동화 -->

링크, 시리즈, 이미지, 콘텐츠 신선도, 문체, 중복 주제까지 별도 스크립트로 관리한다. 개인 블로그 수준을 넘어선 좋은 운영 체계다. citeturn130086view2

---

#### 117. 작성일·수정일·검증일이 혼동됨

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5677; message: 25 (assistant); path: 14. 열세 번째 핵심 안티패턴 > Date Ambiguity > 작성일·수정일·검증일이 혼동됨 -->

기술 글은 날짜 정보가 특히 중요하다.

현재 홈에서는 게시 날짜와 읽기 시간이 표시된다. citeturn682826view0

하지만 기술 문서에는 세 가지 날짜가 필요할 수 있다.

```text
Published
Updated
Last Verified
```

예:

```text
게시: 2024-01-10
수정: 2026-06-18
검증: Linux 6.12 기준, 2026-06-17
```

#### 118. 모든 품질 검사가 배포를 차단

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:11660; message: 38 (assistant); path: Task 2-4. Performance & Build Anti-patterns > P-04. Every Audit Is a Release Blocker > 모든 품질 검사가 배포를 차단 -->

<!-- empty source section -->

#### 119. 실제 전체 블로그로만 스크립트 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16374; message: 45 (assistant); path: Scripts and Tooling > M-24. No Fixture Tests for Content Tools > 실제 전체 블로그로만 스크립트 검증 -->

<!-- empty source section -->

#### 120. 문장만 수정하고 환경 검증일도 최신으로 변경

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17124; message: 45 (assistant); path: Content Operations > M-77. Update Without Revalidation > 문장만 수정하고 환경 검증일도 최신으로 변경 -->

<!-- empty source section -->

#### 121. M-80. No Content Retirement Workflow

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17167; message: 45 (assistant); path: Content Operations > M-80. No Content Retirement Workflow -->

### 폐기 상태만 있고 실제 처리 절차가 없음

### 개선

```text
identify
review
redirect or mark historical
update internal links
remove from hubs
retain or remove from sitemap
```

절차를 정한다.

---

#### 122. integrity hash는 있지만 교차 출처 검증 설정이 잘못됨

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17652; message: 48 (assistant); path: B. 외부 JavaScript > SEC-14. SRI Without `crossorigin` > integrity hash는 있지만 교차 출처 검증 설정이 잘못됨 -->

<!-- empty source section -->

#### 123. 링크의 `href`를 검증하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17805; message: 48 (assistant); path: C. XSS와 콘텐츠 렌더링 > SEC-23. Unsafe URL Scheme > 링크의 `href`를 검증하지 않음 -->

```text
javascript:
data:
file:
```

#### 124. SEC-35. Pull Request Workflow with Secrets

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18029; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-35. Pull Request Workflow with Secrets -->

### 외부 PR 콘텐츠를 secret이 있는 workflow에서 처리

### 문제

악성 PR이 build script나 package script를 변경해 secret을 탈취할 수 있다.

### 개선

외부 기여 검증과 권한 있는 배포를 분리한다.

---

#### 125. OAuth 요청과 callback의 연결을 검증하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18384; message: 48 (assistant); path: F. OAuth와 관리자 편집기 > SEC-57. Missing OAuth `state` > OAuth 요청과 callback의 연결을 검증하지 않음 -->

<!-- empty source section -->

#### 126. custom domain 변경 후 인증서·리다이렉트·canonical 미검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18677; message: 48 (assistant); path: H. 도메인·HTTPS·배포 > SEC-79. DNS Change Without Verification > custom domain 변경 후 인증서·리다이렉트·canonical 미검증 -->

<!-- empty source section -->

#### 127. CSP·redirect·admin 제한을 설정했지만 실제 검증 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18995; message: 48 (assistant); path: J. 보안 운영 > SEC-99. Security Controls Without Tests > CSP·redirect·admin 제한을 설정했지만 실제 검증 없음 -->

<!-- empty source section -->

#### 128. 추천 보안 기준선

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:19058; message: 48 (assistant); path: 추천 보안 기준선 -->

`hawk90.github.io`의 현실적인 기준선은 이 정도면 충분하다.

## 공개 사이트

```text
순수 static output
HTTPS 강제
raw HTML 최소화
CSP 적용 가능성 검토
외부 script 최소화
댓글·광고 지연 로드
민감 파일 artifact 검사
```

## GitHub Actions

```text
actions full SHA pin
permissions 최소화
build와 deploy job 분리
secret을 필요한 step에만 전달
외부 PR에서 위험한 generator 제한
dependency와 lockfile 별도 검토
```

GitHub는 full commit SHA 고정을 action을 immutable하게 사용하는 방법으로 안내하고 있다. citeturn392708search1

## 관리자 편집기

```text
가능하면 공개 블로그와 별도 앱
정적 bundle에 secret 금지
fine-grained token
콘텐츠 경로만 수정
workflow·config 수정 금지
authorization server-side 검증
commit conflict 검출
```

## 콘텐츠

```text
로그·스크린샷 redaction
실 token 금지
사내 hostname 일반화
공개 저장소에 비공개 draft 금지
외부 SVG·iframe 허용 목록
```

---

#### 129. O-18. URL Inspection as a Workflow

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:19480; message: 50 (assistant); path: Search Console > O-18. URL Inspection as a Workflow -->

### 페이지마다 수동 색인 요청

### 문제

구조적 문제를 수동 요청으로 가린다.

### 개선

내부 링크·Sitemap·canonical·콘텐츠 품질을 먼저 수정한다.

---

#### 130. 추천 최소 관측 체계

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20675; message: 50 (assistant); path: 추천 최소 관측 체계 -->

복잡한 분석 플랫폼은 필요 없다.

## Search Console

```text
대표 페이지의 검색어·노출·클릭
색인되지 않은 핵심 페이지
구판과 신판 경쟁
Topic별 유입 변화
```

## 사용자 탐색

```text
Topic Hub → 글 이동
글 → 다음 글 이동
검색 → 결과 클릭
검색 결과 없음
```

## 성능

```text
홈
대표 Guide
코드가 많은 글
검색 페이지
```

의 LCP·INP·CLS와 주요 자산 크기.

## 빌드

```text
총 시간
peak memory
Shiki 시간
검색 인덱스 크기
dist 크기
```

## 콘텐츠 운영

```text
대표 글 20개의 업데이트 상태
고아 문서
중복 후보
Needs Review 문서
깨진 내부 링크
```

#### 131. 참고 링크를 넣었으니 검증됐다고 생각

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:21032; message: 52 (assistant); path: 출처와 검증 > G-12. Citation as Decoration > 참고 링크를 넣었으니 검증됐다고 생각 -->

<!-- empty source section -->

#### 132. 직접 검증할 작업

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:22126; message: 52 (assistant); path: AI 활용 > G-80. No AI Usage Boundary > 권장 경계 > 직접 검증할 작업 -->

```text
사양 해석
코드 동작
벤치마크
보안 판단
법적 표현
실제 장애 원인
```

---

#### 133. 추천 최소 편집 흐름

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:22491; message: 52 (assistant); path: 추천 최소 편집 흐름 -->

새로운 복잡한 CMS 없이도 다음이면 충분하다.

## 1. 아이디어

```text
새 글
기존 글 보완
통합
보류
```

중 하나로 분류한다.

## 2. 조사

```text
핵심 질문
확인된 사실
관찰
가설
미확인 사항
```

을 분리한다.

## 3. 집필

콘텐츠 타입에 맞는 최소 구조를 사용한다.

## 4. 리뷰

```text
정확성
근거
환경·버전
한계
내부 중복
다음 경로
```

를 확인한다.

## 5. 발행

```text
Parent Topic
관련 링크
description
모바일
production build
```

을 검사한다.

## 6. 유지

```text
Current
Needs Review
Historical
Superseded
```

상태를 관리한다.

---

#### 134. 언어만 자연스럽게 다듬고 기술 용어 검증은 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:23146; message: 54 (assistant); path: 번역 콘텐츠 > L-29. Translation Without Technical Review > 언어만 자연스럽게 다듬고 기술 용어 검증은 없음 -->

<!-- empty source section -->

#### 135. 추천 품질을 체감으로만 판단

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25585; message: 56 (assistant); path: 품질과 평가 > K-85. Auto Recommendation Without Evaluation Set > 추천 품질을 체감으로만 판단 -->

<!-- empty source section -->

#### 136. Markdown은 사람이 읽는 문서이므로 자동 검증이 필요 없다고 생각

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25975; message: 58 (assistant); path: Task 2-13. Testing, Validation & Quality Assurance Anti-patterns > T-04. Content Is Not Code > Markdown은 사람이 읽는 문서이므로 자동 검증이 필요 없다고 생각 -->

<!-- empty source section -->

#### 137. custom remark·rehype plugin을 실제 Markdown 예제로 검증하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26051; message: 58 (assistant); path: 단위 테스트 > T-08. No Parser Fixture > custom remark·rehype plugin을 실제 Markdown 예제로 검증하지 않음 -->

<!-- empty source section -->

#### 138. Markdown부터 최종 HTML까지 한 번도 전체 검증하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26173; message: 58 (assistant); path: 통합 테스트 > T-16. No End-to-End Content Pipeline Test > Markdown부터 최종 HTML까지 한 번도 전체 검증하지 않음 -->

<!-- empty source section -->

#### 139. 검색 결과 없음, Topic 글 없음, 관련 글 없음 상태를 검증하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26278; message: 58 (assistant); path: 통합 테스트 > T-22. No Empty-State Test > 검색 결과 없음, Topic 글 없음, 관련 글 없음 상태를 검증하지 않음 -->

<!-- empty source section -->

#### 140. 링크 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26320; message: 58 (assistant); path: 링크 검증 -->

## T-26. HTTP Status Only Link Check

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

## T-27. Every External Link on Every Commit

### 매 commit마다 모든 외부 URL 요청

### 문제

- 느림
- rate limit
- 일시 장애
- CI 불안정

### 개선

내부 링크는 매번, 외부 링크는 정기적으로 검사한다.

---

## T-28. External Failure Blocks Publishing

### 외부 사이트 일시 장애가 배포를 차단

### 개선

외부 링크 실패는 기본적으로 warning으로 두고 반복 실패 시 검토한다.

---

## T-29. Redirect Considered Healthy Forever

### 301·302이면 정상 처리

### 문제

redirect chain이나 다른 도메인으로 변경됐을 수 있다.

### 개선

최종 URL과 redirect 횟수를 기록한다.

---

## T-30. Anchor Links Not Checked

### 페이지 URL은 존재하지만 `#specific-heading`이 사라짐

### 개선

내부 heading anchor까지 검증한다.

---

## T-31. Generated Heading Slug Assumption

### heading slug 규칙이 항상 같다고 가정

### 문제

한글, 특수문자, 중복 heading에서 달라질 수 있다.

### 개선

실제 parser가 생성한 heading ID를 manifest에 포함한다.

---

## T-32. Link Checker Parses Code Blocks

### 코드 예제 안 URL을 실제 링크로 검사

### 문제

가짜 domain이나 예제 URL 때문에 오탐이 발생한다.

### 개선

AST 문맥을 고려한다.

---

## T-33. Link Checker Ignores Reference Links

### Markdown reference-style 링크를 놓침

### 개선

정규식이 아니라 Markdown AST 기반으로 검사한다.

---

## T-34. Link Fixer Chooses Nearest Title

### 깨진 링크를 제목 유사도로 자동 수정

### 문제

의미가 다른 글로 연결될 수 있다.

### 개선

높은 확신이 없으면 후보만 제시한다.

---

## T-35. Redirect Hides Internal Link Debt

### 내부 링크가 모두 redirect를 거치지만 검사 통과

### 개선

내부 링크는 최종 canonical URL을 직접 가리키게 한다.

---

#### 141. 마우스로만 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26752; message: 58 (assistant); path: 접근성 테스트 > T-58. No Keyboard Test > 마우스로만 검증 -->

<!-- empty source section -->

#### 142. 메타데이터와 그래프 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26991; message: 58 (assistant); path: 메타데이터와 그래프 검증 -->

## T-76. Schema Valid, Relation Invalid

### 문서 ID 형식은 맞지만 대상 문서가 없음

### 개선

referential integrity를 검사한다.

---

## T-77. Self-Referential Relation

```yaml
related:
  - current-article
```

### 개선

자기 참조를 차단한다.

---

## T-78. Duplicate Relation

### 같은 글이 `next`, `related`, `prerequisite`에 중복

### 문제

UI에서 반복 노출될 수 있다.

### 개선

관계 우선순위와 중복 규칙을 검증한다.

---

## T-79. Invalid Inverse Relation

### A의 next가 B인데 B의 prerequisite가 전혀 다른 문서

### 개선

필요한 관계는 양방향 일관성을 검사한다.

---

## T-80. Circular Supersession

```text
A supersedes B
B supersedes A
```

### 개선

폐기 관계는 cycle이 없어야 한다.

---

## T-81. Series Order Collision

### 같은 시리즈에 order 3이 두 개

### 개선

build 전에 차단한다.

---

## T-82. Missing Series Member

### manifest에 문서는 있지만 실제 파일이 없음

### 개선

시리즈 manifest와 콘텐츠 집합을 대조한다.

---

## T-83. Topic Hub References Draft

### 공개 Hub에서 draft 글을 링크

### 개선

환경별 공개 가능 상태를 검증한다.

---

## T-84. Superseded Article Remains Featured

### 상태와 노출 metadata가 충돌

### 개선

상태 기반 불변조건을 둔다.

```text
superseded → featured 불가
draft → sitemap 불가
noindex → sitemap 불가
```

---

## T-85. Canonical Slug Collision

### 여러 글이 같은 canonical URL 생성

### 개선

전체 manifest에서 URL uniqueness를 검사한다.

---

#### 143. 생성 자산 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27109; message: 58 (assistant); path: 생성 자산 검증 -->

## T-86. Asset Exists Means Correct

### OG 파일이 존재하면 정상

### 문제

과거 제목이나 잘못된 폰트로 생성됐을 수 있다.

### 개선

source hash와 generator version을 비교한다.

---

## T-87. Image Reference Without Dimension Check

### 파일은 있지만 지나치게 큰 원본

### 개선

크기·해상도·포맷 예산을 검사한다.

---

## T-88. SVG Syntax Only Validation

### XML parser가 읽으면 정상

### 문제

텍스트가 잘리거나 viewBox가 잘못될 수 있다.

### 개선

대표 SVG는 실제 렌더링을 검증한다.

---

## T-89. OG Text Overflow Untested

### 긴 한글·영문 제목이 이미지 밖으로 벗어남

### 개선

긴 제목·특수문자·이모지 fixture를 둔다.

---

## T-90. Missing Font Fallback in Generator

### CI에서 한글 폰트가 없어 네모로 생성

### 개선

생성용 폰트를 명시적으로 포함하고 canary 결과를 검사한다.

---

## T-91. Search Manifest and Page Set Diverge

### 삭제한 글이 검색 인덱스에 남음

### 개선

최종 공개 page manifest와 검색 레코드 집합을 비교한다.

---

## T-92. RSS Contains Draft or Superseded Content

### 페이지 필터와 RSS 필터가 다름

### 개선

모든 출력이 공통 publication policy를 사용하게 한다.

---

## T-93. Sitemap Contains Redirect Targets Twice

### 이전 URL과 최종 URL이 모두 Sitemap에 존재

### 개선

canonical 공개 URL만 포함한다.

---

## T-94. OG Generation Failure Silently Falls Back

### 일부 글이 기본 이미지로 바뀌었지만 경고 없음

### 개선

대표 글이나 Featured 글의 OG 실패는 오류로 처리한다.

---

#### 144. 추천 최소 테스트 피라미드

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27318; message: 58 (assistant); path: 추천 최소 테스트 피라미드 -->

복잡하게 시작할 필요는 없다.

## 매 변경마다

```text
content schema
내부 링크
relation integrity
slug uniqueness
production build
```

## 주요 UI 변경 시

```text
홈
대표 장문 글
모바일
다크모드
검색 modal
```

의 visual·accessibility smoke test.

## 검색 변경 시

```text
대표 query 20개
상위 결과
한글·영문 alias
구판 제외
```

검증.

## 정기 전체 감사

```text
외부 링크
콘텐츠 신선도
중복 후보
이미지 크기
dist 크기
보안 dependency
```

#### 145. D-50. Risk Acceptance Without Reason

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:29992; message: 62 (assistant); path: 점수화 > D-50. Risk Acceptance Without Reason -->

### “일단 둔다”로 끝

### 개선

수용 이유와 재검토 조건을 짧게 기록한다.

---

#### 146. D-54. Refactor Without Acceptance Criteria

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30053; message: 62 (assistant); path: 개선 계획 > D-54. Refactor Without Acceptance Criteria -->

### “검색을 개선한다”

### 문제

언제 완료인지 알 수 없다.

### 개선 예:

```text
대표 검색어 20개에서
예상 문서가 상위 3개 안에 포함된다.
```

---

#### 147. D-55. Acceptance Criteria as Implementation Detail

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30070; message: 62 (assistant); path: 개선 계획 > D-55. Acceptance Criteria as Implementation Detail -->

```text
MiniSearch를 사용한다.
JSON을 세 파일로 나눈다.
```

### 문제

사용자 결과가 아니라 구현 방식을 완료 기준으로 삼는다.

### 개선

결과를 기준으로 작성한다.

---

#### 148. D-56. No Negative Acceptance Criteria

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30087; message: 62 (assistant); path: 개선 계획 > D-56. No Negative Acceptance Criteria -->

### 무엇을 개선할지만 정의

### 개선

깨지면 안 되는 것도 정한다.

```text
검색 품질 개선
단, 초기 JS와 index 크기는 기존 대비 20% 이상 증가하지 않는다.
```

---

#### 149. 권장 구성

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31442; message: 64 (assistant); path: A-07. 홈의 사이트 신뢰 신호 추가 > 권장 구성 -->

Featured 아래 또는 푸터 이전에 작은 섹션을 둔다.

```text
About this knowledge base

실제 시스템 개발·디버깅 경험과 공식 사양,
소스코드 및 실험 결과를 바탕으로 문서를 작성합니다.
버전 영향을 받는 글에는 테스트 환경과 검증 시점을 표시합니다.
```

그리고 두 링크만 제공한다.

```text
About the author
Editorial principles
```

#### 150. 권장 정책

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32852; message: 68 (assistant); path: C-02. 상태별 노출 정책 정의 > 권장 정책 -->

| 상태 | 일반 검색 | Topic Hub | Featured | Sitemap | 광고 |
|---|---|---|---|---|---|
| current | 정상 | 가능 | 가능 | 포함 | 가능 |
| needs-review | 정상 또는 감점 | 제한적 | 불가 | 포함 | 조건부 |
| historical | 상태 표시 | 별도 영역 | 불가 | 포함 가능 | 제한 |
| superseded | 신판 우선 | 제외 | 불가 | 상황별 | 비활성 권장 |
| archived | 기본 제외 | 제외 | 불가 | 대체로 제외 | 비활성 |

#### 151. 권장 운영

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32982; message: 68 (assistant); path: C-04. `updated`와 `lastVerified` 분리 > 권장 운영 -->

`lastVerified`는 자동으로 바꾸지 않는다.

명시적인 검증 작업에서만 변경한다.

#### 152. 2차: 강하지만 검증이 필요한 글 5개

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33625; message: 68 (assistant); path: C-20. 대표 글 보완 순서 > 2차: 강하지만 검증이 필요한 글 5개 -->

작업:

- 버전·환경 재확인
- 출처 정리
- 결론 강도 조정
- 상태 current 전환

#### 153. D-22. 내부 링크 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34756; message: 70 (assistant); path: D-22. 내부 링크 검증 -->

매 변경마다 검사할 것:

```text
없는 문서 ID
깨진 내부 URL
깨진 heading anchor
superseded 문서 추천
draft 문서 링크
redirect를 거치는 내부 링크
```

## 정기 검사

외부 링크는 매 commit마다 전체 검사하지 않는다.

내부 링크는 빠르고 결정적이므로 매번 검사한다.

---

#### 154. 권장 정책

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36664; message: 75 (assistant); path: F-02. Indexability Matrix 확정 > 권장 정책 -->

| 유형 | Index | Follow | Sitemap |
|---|---|---|---|
| Current Article | 예 | 예 | 포함 |
| Needs Review Article | 예 | 예 | 포함 |
| Historical Article | 선별 | 예 | 선별 |
| Superseded Article | 대체로 아니오 또는 신판 우선 | 예 | 대체로 제외 |
| Topic Hub | 예 | 예 | 포함 |
| 강한 Series Hub | 예 | 예 | 포함 |
| 얕은 Tag | 아니오 | 예 | 제외 |
| 내부 검색 결과 | 아니오 | 예 | 제외 |
| 관리자 페이지 | 아니오 | 아니오 | 제외 |
| Draft | 출력 제외 | 해당 없음 | 제외 |
| 404 | 아니오 | 상황별 | 제외 |

#### 155. 검사할 문제

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36775; message: 75 (assistant); path: F-04. Canonical URL 전수 검증 > 검사할 문제 -->

```text
모든 글이 홈 canonical을 가리킴
preview domain이 canonical
http와 https 혼재
trailing slash 정책 불일치
태그와 Topic Hub가 서로 canonical
구판이 무관한 대표 글 canonical
```

#### 156. F-19. 검색 색인 품질 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37539; message: 75 (assistant); path: F-19. 검색 색인 품질 검사 -->

### Search Console에서 확인할 대상

```text
대표 글 10개
Topic Hub 2개
홈
About
Privacy
Editorial Policy
```

### 확인 항목

```text
Google이 선택한 canonical
색인 여부
마지막 크롤링
모바일 렌더링
차단된 자원
중복 판단
```

### 주의

모든 페이지에 수동 색인 요청을 반복하는 방식은 구조적 해결책이 아니다.

먼저 다음을 고친다.

```text
내부 링크
Sitemap
canonical
콘텐츠 중복
페이지 품질
```

### 완료 조건

- 핵심 페이지가 내부 링크로 발견 가능
- Sitemap 제출 및 처리 확인
- 대표 페이지의 Google-selected canonical 확인
- 예상치 못한 중복 canonical 문제 없음

### 우선순위

```text
P0
```

---

#### 157. F-26. AdSense 재신청 전 최종 체크리스트

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37860; message: 75 (assistant); path: F-26. AdSense 재신청 전 최종 체크리스트 -->

## 콘텐츠

```text
[ ] 대표 문서 10개 이상 current
[ ] 실제 경험·분석·실험이 명확함
[ ] 중복 후보 20개 검토
[ ] 구판과 신판 관계 정리
[ ] Placeholder와 빈 페이지 없음
[ ] Topic Hub 2개 이상 완성
```

## 색인

```text
[ ] Sitemap에 canonical URL만 포함
[ ] Search·Admin·404·Draft 제외
[ ] 얕은 Tag 정책 적용
[ ] canonical 전수 검증
[ ] 대표 페이지의 Google-selected canonical 확인
```

## 신뢰

```text
[ ] About
[ ] Contact
[ ] Privacy Policy
[ ] Editorial Policy
[ ] 작성자 정보
[ ] 오류 제보 경로
```

## UX

```text
[ ] 모바일 대표 페이지 확인
[ ] 내부 검색 정상
[ ] 깨진 내부 링크 없음
[ ] 코드·표·다이어그램 정상
[ ] 광고 없는 상태에서 레이아웃 완성
```

## 기술

```text
[ ] HTTPS
[ ] robots와 noindex 충돌 없음
[ ] Sitemap 처리 확인
[ ] 404가 올바른 상태
[ ] 구조화 데이터 대표 페이지 검사
[ ] 배포 결과 smoke test
```

---

#### 158. 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38076; message: 75 (assistant); path: F-30. Epic F 완료 조건 > 검증 -->

```text
production dist smoke test
모바일 대표 페이지 검사
내부 링크·anchor 검사
Search Console 핵심 페이지 확인
```

---

#### 159. H-04. Internal Link 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39936; message: 79 (assistant); path: H-04. Internal Link 검사 -->

매 변경마다 검사한다.

## 검사 대상

```text
없는 내부 URL
없는 content ID
깨진 heading anchor
draft 문서 링크
archived 문서의 일반 추천
redirect를 거치는 내부 링크
```

## Anchor 검사

원본 heading 문자열이 아니라 실제 생성된 heading ID를 사용한다.

```text
Markdown
→ heading manifest
→ link target validation
```

예:

```markdown
[BAR 탐색](./pcie-bar/#size-probing)
```

검증 대상:

```text
해당 문서 존재
`size-probing` ID 존재
```

## Redirect debt

내부 링크가 redirect를 통과하면 warning으로 처리한다.

```text
WARNING:
`/old-pcie-bar/` redirects to `/pcie-bar-sizing/`.

Update the internal link to the canonical URL.
```

## 완료 조건

- 내부 링크는 매 commit 검사
- 코드 블록 안 URL은 검사 대상에서 제외
- Markdown reference link도 지원
- redirect target가 아니라 최종 canonical로 연결

## 우선순위

```text
P0
```

---

#### 160. Anchor 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39951; message: 79 (assistant); path: H-04. Internal Link 검사 > Anchor 검사 -->

원본 heading 문자열이 아니라 실제 생성된 heading ID를 사용한다.

```text
Markdown
→ heading manifest
→ link target validation
```

예:

```markdown
[BAR 탐색](./pcie-bar/#size-probing)
```

검증 대상:

```text
해당 문서 존재
`size-probing` ID 존재
```

#### 161. H-05. Relation Integrity 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40000; message: 79 (assistant); path: H-05. Relation Integrity 검사 -->

대표 문서와 Hub 관계가 깨지지 않게 한다.

## 검사 대상

```text
parent
prerequisites
next
related
supersedes
```

## 불변조건

```text
대상 문서 존재
자기 참조 없음
중복 relation 없음
supersedes cycle 없음
archived 문서를 next로 추천하지 않음
동일 글이 여러 UI slot에 중복되지 않음
```

## Cycle 검사

특히 다음 관계는 cycle이 없어야 한다.

```text
supersedes
next
필수 prerequisite
```

`related`는 양방향 또는 cycle이 있어도 괜찮다.

## 완료 조건

- 존재하지 않는 문서 ID 차단
- cycle 경로가 오류에 표시됨
- inverse relation이 필요한 경우 자동 파생 또는 검증
- 구판이 대표 경로에 들어오지 않음

## 우선순위

```text
P0
```

---

#### 162. H-12. SEO Metadata 회귀 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40357; message: 79 (assistant); path: H-12. SEO Metadata 회귀 검사 -->

모든 indexable 페이지에서 검사한다.

```text
title
description
canonical
robots
Open Graph
published
updated
author
```

## 불변조건

```text
title 비어 있지 않음
H1과 title이 완전히 무관하지 않음
description 존재
canonical은 HTTPS production URL
noindex URL은 Sitemap 제외
preview origin 없음
```

## 중복 감사

- title 완전 중복
- description 완전 중복
- canonical 중복
- 여러 페이지가 같은 OG URL 사용

일부 공통 정책 페이지는 예외가 있을 수 있지만, 일반 글은 고유해야 한다.

## 완료 조건

- 대표 페이지는 PR마다 검사
- 전체 중복 검사는 release 또는 정기 audit
- canonical target가 실제 페이지임
- 날짜가 미래로 설정되지 않음

## 우선순위

```text
P0
```

---

#### 163. H-13. 구조화 데이터 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40407; message: 79 (assistant); path: H-13. 구조화 데이터 검사 -->

대표 페이지 대상으로만 시작한다.

## 페이지

```text
홈
Topic Hub
Guide
Debug Note
About
```

## 검사

```text
유효 JSON-LD
페이지 내용과 일치
canonical 일치
author 일치
날짜 일치
Breadcrumb URL 일치
```

## 피해야 할 것

- 화면에 없는 review
- 가짜 rating
- 모든 글을 HowTo로 표시
- About 페이지를 Article로 표시
- `lastVerified`를 게시일처럼 사용

## 완료 조건

- JSON parse 오류 없음
- schema type이 페이지 역할과 일치
- 실제 화면에 없는 정보 없음
- 구조화 데이터 실패가 페이지 build를 깨뜨리지 않음

## 우선순위

```text
P1
```

---

#### 164. H-16. 접근성 자동 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40572; message: 79 (assistant); path: H-16. 접근성 자동 검사 -->

대표 페이지에 axe 계열 자동 검사를 적용할 수 있다.

## 대상

```text
홈
Topic Hub
대표 Guide
검색 modal
404
```

## 자동으로 잘 잡는 항목

```text
accessible name 누락
색 대비 일부
heading 구조 일부
form label
ARIA 오류
중복 ID
```

## 자동 검사로 충분하지 않은 항목

```text
링크 문구 품질
문서 논리 구조
다이어그램 설명
focus 이동의 자연스러움
```

## 완료 조건

- 심각한 자동 접근성 오류 0개
- warning은 의도와 이유를 검토
- suppression은 구체적인 요소에만 적용
- 라이트·다크 테마 중 최소 대표 페이지 검사

## 우선순위

```text
P1
```

---

#### 165. 자동 검사로 충분하지 않은 항목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40597; message: 79 (assistant); path: H-16. 접근성 자동 검사 > 자동 검사로 충분하지 않은 항목 -->

```text
링크 문구 품질
문서 논리 구조
다이어그램 설명
focus 이동의 자연스러움
```

#### 166. 권장 viewport

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40653; message: 79 (assistant); path: H-18. 모바일 Viewport Smoke Test > 권장 viewport -->

```text
360×800
390×844
태블릿 폭 768
```

모든 기기를 테스트할 필요는 없지만 작은 폭과 일반 모바일 폭은 필요하다.

#### 167. H-20. 코드 블록 회귀 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40763; message: 79 (assistant); path: H-20. 코드 블록 회귀 검사 -->

기술 블로그의 핵심 UI다.

## 시나리오

```text
짧은 코드
긴 코드
긴 한 줄
한글 주석
로그
명령과 출력
line highlight
파일명 표시
복사
```

## 검사

```text
강제 wrap 여부
가로 스크롤
복사 결과 원문 일치
복사 버튼 겹침
line number alignment
다크모드 대비
```

## 복사 결과

UI용 line number나 강조 markup이 clipboard에 들어가면 안 된다.

```text
화면:
1 int main() {

복사:
int main() {
```

## 완료 조건

- 코드 원문이 정확히 복사됨
- 모바일에서 첫 줄이 버튼에 가리지 않음
- 로그·출력이 불필요한 syntax grammar를 사용하지 않음
- 장문 코드 페이지 DOM 회귀 추적

## 우선순위

```text
P1
```

---

#### 168. H-21. 표와 다이어그램 회귀 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40819; message: 79 (assistant); path: H-21. 표와 다이어그램 회귀 검사 -->

## 표

```text
wide table
긴 identifier
많은 열
모바일
인쇄
```

검사:

```text
페이지 viewport 확장 없음
가로 스크롤 영역 명확
header cell 존재
caption 존재 여부
```

## 다이어그램

```text
SVG 렌더링
viewBox
text clipping
모바일 축소
alt·본문 설명
```

## 완료 조건

- 대표 표와 SVG를 canary로 지정
- 생성 성공뿐 아니라 실제 렌더링 확인
- 텍스트가 잘리지 않음
- 색만으로 관계를 구분하지 않음

## 우선순위

```text
P1
```

---

#### 169. H-22. 보안 회귀 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40865; message: 79 (assistant); path: H-22. 보안 회귀 검사 -->

매 release build에서 다음을 자동 검사한다.

```text
secret pattern
private key header
.env 파일
admin route
OAuth secret 문자열
unsafe innerHTML 위치
금지 iframe domain
workflow permissions
```

## Production artifact 검사

다음을 검색한다.

```text
client_secret
ghp_
Authorization:
BEGIN PRIVATE KEY
/admin
```

오탐을 줄이기 위해 예제 placeholder allowlist를 제한적으로 둔다.

## 완료 조건

- 실제 가능성이 높은 secret은 build 차단
- 민감 파일은 artifact 생성 단계에서 차단
- production 관리자 코드 존재 시 오류
- allowlist가 전체 디렉터리 단위가 아님

## 우선순위

```text
P0
```

---

#### 170. H-26. 광고 제외 페이지 회귀 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41038; message: 79 (assistant); path: H-26. 광고 제외 페이지 회귀 검사 -->

승인 후 광고를 적용할 경우 반드시 자동 검사한다.

## 광고가 없어야 하는 페이지

```text
404
Search
Admin
Draft
Privacy
Contact
Superseded
Archived
빈 Tag
```

## 검사 방법

최종 HTML에서 광고 script와 slot markup 존재 여부를 확인한다.

## Article 조건

```text
status=current
adsEligible=true
publisher content 존재
```

글자 수 하나만으로 판정하지 않는다.

## 완료 조건

- 광고 script가 global layout에 무조건 삽입되지 않음
- 제외 페이지에 광고 markup 0개
- 상태 변경 시 광고 eligibility가 자동 반영
- 광고 없는 상태에서도 레이아웃 완전

## 우선순위

```text
P1
```

---

#### 171. 권장 필드

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43241; message: 83 (assistant); path: Ticket S1-05. 최소 Front Matter Schema 추가 > 권장 필드 -->

```yaml
type: concept
topic: pcie-cxl
status: current
updated: 2026-08-01
```

실제 재검증을 했다면:

```yaml
lastVerified: 2026-08-01
```

환경이 중요하다면:

```yaml
testedWith:
  os: CentOS 7.9
  kernel: 3.10.0-1160
  hardware: AMD Alveo U250
  xrt: 2.13.466
```

#### 172. Ticket S1-06. Featured 불변조건 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43308; message: 83 (assistant); path: Ticket S1-06. Featured 불변조건 검사 -->

## 목적

구판이나 미검증 문서가 홈 대표 글로 노출되는 것을 막는다.

## 규칙

```text
Featured 문서는 반드시:
status=current
topic 존재
type 존재
description 존재
실제 URL 존재
```

## 예시 검사

```ts
function validateFeaturedArticle(article: Article): string[] {
  const errors: string[] = [];

  if (article.status !== "current") {
    errors.push("Featured article must have status=current.");
  }

  if (!article.topic) {
    errors.push("Featured article must define a primary topic.");
  }

  if (!article.type) {
    errors.push("Featured article must define a content type.");
  }

  if (!article.description?.trim()) {
    errors.push("Featured article must have a description.");
  }

  return errors;
}
```

## 완료 조건

```text
[ ] needs-review Featured 차단
[ ] historical Featured 차단
[ ] superseded Featured 차단
[ ] metadata 누락 시 명확한 오류
```

## 예상 작업량

```text
1~2시간
```

---

#### 173. 권장 표

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43448; message: 83 (assistant); path: Ticket S1-08. 대표 문서 감사표 작성 > 권장 표 -->

| ID | Topic | Type | Status | 고유 가치 | 중복 | 환경 필요 | 보완량 |
|---|---|---|---|---|---|---|---|
| pcie-bar-sizing | PCIe & CXL | Concept | Needs Review | 선행 개념 | 있음 | 예 | 중간 |
| cuda-pinned-memory | GPU & CUDA | Experiment | Current | 직접 측정 | 낮음 | 예 | 낮음 |

#### 174. 10. Schema에서 하지 말아야 할 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:48015; message: 96 (assistant); path: 10. Schema에서 하지 말아야 할 검증 -->

Zod schema는 단일 문서의 구조를 검증하기에 적합하다.

하지만 다음은 schema에서 처리하기 어렵거나 부적합하다.

```text
Topic ID가 registry에 존재하는가
relation 대상 문서가 존재하는가
slug가 전체 사이트에서 중복되는가
supersededBy가 자기 자신인가
Featured 문서가 current인가
prerequisite cycle이 있는가
```

이것은 전체 문서 집합이 필요한 semantic validation이다.

따라서 구분한다.

```text
Schema Validation
→ 문서 하나의 구조

Semantic Validation
→ 문서 집합 전체의 의미
```

---

#### 175. 형식 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50205; message: 98 (assistant); path: 2. 설계 원칙 > 원칙 2. 형식 검증과 의미 검증을 분리한다 > 형식 검증 -->

문서 하나만 보고 판단할 수 있다.

```text
status 값이 올바른가
날짜 형식이 맞는가
title이 비어 있지 않은가
```

#### 176. 의미 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50215; message: 98 (assistant); path: 2. 설계 원칙 > 원칙 2. 형식 검증과 의미 검증을 분리한다 > 의미 검증 -->

전체 문서 집합이 필요하다.

```text
ID가 중복되는가
relation 대상이 존재하는가
superseded cycle이 있는가
Featured 문서가 current인가
```

---

#### 177. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50427; message: 98 (assistant); path: 6. 날짜 모델 > 권장 -->

Domain에서는 날짜만 필요한 경우 `YYYY-MM-DD` 문자열을 사용하는 것도 괜찮다.

```ts
export type IsoDate = `${number}-${number}-${number}`;
```

하지만 TypeScript template literal만으로 실제 날짜 유효성은 보장되지 않는다.

초기에는 입력에서 `Date`로 검증한 뒤 정규화 모델에는 ISO 문자열로 저장하는 방식이 실용적이다.

```ts
export interface ContentDates {
  published: string;
  updated?: string;
  lastVerified?: string;
}
```

---

#### 178. 24. Manifest 전체 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51215; message: 98 (assistant); path: 24. Manifest 전체 검증 -->

```ts
export function validateContentDocuments(
  documents: readonly ContentDocument[],
): void {
  const issues: ValidationIssue[] = [];

  issues.push(
    ...validateUniqueIds(documents),
  );

  issues.push(
    ...validateUniqueUrls(documents),
  );

  issues.push(
    ...validateTopicIds(documents),
  );

  issues.push(
    ...validateRelationTargets(documents),
  );

  issues.push(
    ...validateSelfRelations(documents),
  );

  issues.push(
    ...validateSupersession(documents),
  );

  if (issues.some(isErrorIssue)) {
    throw new ContentValidationError(
      issues,
    );
  }
}
```

---

#### 179. 29. Relation 대상 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51416; message: 98 (assistant); path: 29. Relation 대상 검증 -->

```ts
export function collectRelationIds(
  document: ContentDocument,
): string[] {
  return [
    ...document.relations.prerequisites,
    ...document.relations.next,
    ...document.relations.related,
    ...(document.relations.supersededBy
      ? [
          document.relations
            .supersededBy,
        ]
      : []),
  ];
}
```

```ts
export function validateRelationTargets(
  documents: readonly ContentDocument[],
): ValidationIssue[] {
  const knownIds =
    new Set(
      documents.map(
        (document) => document.id,
      ),
    );

  const issues: ValidationIssue[] = [];

  for (const document of documents) {
    for (
      const targetId
      of collectRelationIds(document)
    ) {
      if (knownIds.has(targetId)) {
        continue;
      }

      issues.push({
        ruleId:
          "content/missing-relation-target",
        severity: "error",
        documentId: document.id,
        sourcePath:
          document.sourcePath,
        message:
          `Relation target ` +
          `"${targetId}" does not exist.`,
      });
    }
  }

  return issues;
}
```

---

#### 180. 30. 자기 참조 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51478; message: 98 (assistant); path: 30. 자기 참조 검증 -->

```ts
export function validateSelfRelations(
  documents: readonly ContentDocument[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const document of documents) {
    for (
      const targetId
      of collectRelationIds(document)
    ) {
      if (targetId !== document.id) {
        continue;
      }

      issues.push({
        ruleId:
          "content/self-relation",
        severity: "error",
        documentId: document.id,
        sourcePath:
          document.sourcePath,
        message:
          `Document "${document.id}" ` +
          `cannot reference itself.`,
      });
    }
  }

  return issues;
}
```

---

#### 181. 31. Superseded 상태 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51515; message: 98 (assistant); path: 31. Superseded 상태 검증 -->

```ts
export function validateSupersededDocument(
  document: ContentDocument,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (
    document.status === "superseded" &&
    !document.relations.supersededBy
  ) {
    issues.push({
      ruleId:
        "content/superseded-without-target",
      severity: "error",
      documentId: document.id,
      sourcePath:
        document.sourcePath,
      message:
        "A superseded document must " +
        "reference its replacement.",
    });
  }

  if (
    document.status !== "superseded" &&
    document.relations.supersededBy
  ) {
    issues.push({
      ruleId:
        "content/replacement-on-active-document",
      severity: "warning",
      documentId: document.id,
      sourcePath:
        document.sourcePath,
      message:
        "supersededBy is set, but " +
        `status is "${document.status}".`,
    });
  }

  return issues;
}
```

---

#### 182. 40. Top 3 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:56885; message: 102 (assistant); path: 40. Top 3 검사 -->

정확한 순위 1위를 지나치게 고정하면 작은 알고리즘 변경마다 테스트가 깨진다.

다음 수준으로 테스트한다.

```text
필수 결과 포함
대표 문서 Top 3
구판 제외
```

정말 중요한 검색어만 1위를 고정한다.

예:

```text
PCIe BAR
→ pcie-bar-sizing이 1위
```

---

#### 183. 41. 검색 결과의 상태 회귀 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:56908; message: 102 (assistant); path: 41. 검색 결과의 상태 회귀 검사 -->

```ts
it("does not show superseded documents", () => {
  const results =
    searchEngine.search(
      "PCIe BAR",
    );

  expect(
    results.some(
      (result) =>
        result.status ===
        "superseded",
    ),
  ).toBe(false);
});
```

---

#### 184. 48. 검색 실패 Fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57049; message: 102 (assistant); path: 48. 검색 실패 Fallback -->

다음 상황을 테스트한다.

```text
Index 404
JSON parse 오류
Version mismatch
네트워크 중단
브라우저 저장 공간 문제
```

사용자에게 내부 stack trace를 보여주지 않는다.

```text
검색 데이터를 불러오지 못했습니다.

Topic별 탐색
전체 글 목록
```

을 제공한다.

---

#### 185. 63. 보안 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57368; message: 102 (assistant); path: 63. 보안 검사 -->

검색 입력으로 다음을 테스트한다.

```text
<script>alert(1)</script>
"><img src=x onerror=alert(1)>
&
"
'
C++
```

결과 highlight와 결과 없음 메시지에서 안전하게 텍스트로 표시돼야 한다.

---

#### 186. 36. 상태 기반 추천 필터

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58718; message: 104 (assistant); path: 36. 상태 기반 추천 필터 -->

추천 후보에서 제외:

```text
Draft
Archived
Superseded
```

`Needs Review`와 `Historical`은 조건부다.

## Needs Review

일반 관련 글에는 가능하지만 대표 Next에는 부적합할 수 있다.

## Historical

정확한 과거 버전 문맥에서만 추천한다.

예:

```text
XRT 2.13 문서
→ 관련 Historical XRT 2.13 Debug Note
```

---

#### 187. 73. 추천 상태 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:59603; message: 104 (assistant); path: 73. 추천 상태 검증 -->

```ts
export function validateRecommendedStatuses(
  document: ContentDocument,
  manifest: ContentManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const nextId of document.relations.next) {
    const next = manifest.byId.get(nextId);

    if (!next) {
      continue;
    }

    if (
      next.status === "archived" ||
      next.status === "superseded"
    ) {
      issues.push({
        ruleId: "relations/invalid-next-status",
        severity: "error",
        documentId: document.id,
        message:
          `Next document "${nextId}" has status ` +
          `"${next.status}".`,
      });
    }
  }

  return issues;
}
```

---

#### 188. 96. 인쇄 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62209; message: 106 (assistant); path: 96. 인쇄 검사 -->

최소 한 개의 긴 Guide와 코드 문서를 Print Preview로 확인한다.

```text
코드가 잘리는가
표가 페이지 밖으로 나가는가
링크가 식별 가능한가
불필요한 Navigation이 남는가
```

---

#### 189. 16. 기술 검증 단계

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62922; message: 108 (assistant); path: 16. 기술 검증 단계 -->

문장을 다듬기 전에 핵심 주장을 검증한다.

각 핵심 주장에 대해 다음 중 무엇으로 뒷받침되는지 표시한다.

```text
Specification
Source Code
Direct Observation
Experiment
Paper
Reasoned Inference
```

---

#### 190. 19. 기술 검증 체크리스트

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62996; message: 108 (assistant); path: 19. 기술 검증 체크리스트 -->

```text
[ ] 핵심 결론이 한 문장으로 명확함
[ ] 사양과 구현을 구분함
[ ] 직접 관찰과 추론을 구분함
[ ] 환경과 버전이 기록됨
[ ] 재현되지 않은 내용을 일반화하지 않음
[ ] 코드·로그가 결론을 실제로 뒷받침함
[ ] 단위와 숫자가 일관됨
[ ] 최신 환경 확인 여부가 명확함
```

---

#### 191. 24. 코드 검증 수준 표시

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63107; message: 108 (assistant); path: 24. 코드 검증 수준 표시 -->

문서 내부 또는 metadata에 선택적으로 기록할 수 있다.

```yaml
codeVerification:
  level: compiled
  environment: Ubuntu 24.04, GCC 13
```

가능한 값:

```text
illustrative
syntax-checked
compiled
executed
hardware-verified
```

다만 모든 글에 새 metadata를 계속 추가하기보다, 중요한 예제에만 사용한다.

---

#### 192. 38. 문장 품질 자동 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63437; message: 108 (assistant); path: 38. 문장 품질 자동 검사 -->

단순한 품질 Warning을 만들 수 있다.

예:

```text
“매우 중요”
“다양한 장점”
“자세히 알아보겠습니다”
“완벽 정리”
“쉽게 설명”
```

이런 표현 자체를 금지하지 않는다.

다만 구체적 근거 없이 반복되는 문서를 수동 검토 후보로 만든다.

---

#### 193. 79. 세 가지 검증 프로파일

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:64346; message: 108 (assistant); path: 79. 세 가지 검증 프로파일 -->

```text
Legacy
New
Representative
```

## Legacy

기존 호환.

## New

신규 문서 기준.

## Representative

대표 노출 기준.

앞서 언급한 `strict`보다 실제 운영 의미가 명확하다.

---

#### 194. 92. Legacy Fallback Description

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:67041; message: 110 (assistant); path: 92. Legacy Fallback Description -->

자동 생성된 Description을 검색엔진에 무조건 사용하기보다 다음을 고려한다.

```text
기존 Description 있음
→ 사용

없음
→ 안전한 짧은 Excerpt 후보

후보 품질 낮음
→ 사이트 공통 설명보다 문서별 최소 문장 생성 검토
```

대표 문서만큼 강하게 검수하지 않더라도 빈 Description보다는 개선될 수 있다.

---

#### 195. 15. Dist 폴더를 검증하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:69739; message: 114 (assistant); path: 15. Dist 폴더를 검증하지 않음 -->

Source Code만 검사하고 최종 산출물을 보지 않으면 다음을 놓친다.

```text
관리자 JS 포함
Source Map 포함
Draft HTML 생성
잘못된 canonical
내부 경로 노출
깨진 자산 URL
Secret 문자열
```

`dist` 전용 검사를 둔다.

---

## Dist Validation 항목

```text
필수 파일 존재
대표 URL HTML 존재
Draft URL 없음
관리자 파일 없음
Secret 후보 없음
절대 로컬 경로 없음
Search Index JSON 유효
Sitemap URL 유효
404 페이지 존재
```

---

#### 196. 30. HTTPS 강제 상태를 검증하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:70073; message: 114 (assistant); path: 30. HTTPS 강제 상태를 검증하지 않음 -->

Custom Domain에서 HTTPS 인증서 발급·갱신 문제가 생길 수 있다.

확인:

```text
HTTP → HTTPS 이동
인증서 유효
Mixed Content 없음
Canonical HTTPS
외부 Image HTTP 없음
```

특히 오래된 글의 `http://` 이미지와 Script를 검사한다.

---

#### 197. 63. Cache Hit를 신뢰하고 검증 생략

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:70691; message: 114 (assistant); path: 63. Cache Hit를 신뢰하고 검증 생략 -->

캐시된 OG·Shiki·Search 결과도 현재 Schema와 Version에 맞는지 확인한다.

Cache Key에 포함:

```text
Content Hash
Generator Version
Schema Version
Relevant Config
```

파일이 존재한다는 이유만으로 그대로 사용하지 않는다.

---

#### 198. OPS-06. Base Path·URL 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71328; message: 114 (assistant); path: 98. 구현 티켓 > OPS-06. Base Path·URL 검사 -->

Production Origin과 대표 자산 URL을 검증한다.

#### 199. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:74192; message: 118 (assistant); path: 7. 거대한 만능 Fixture Factory > 권장 -->

작은 기본 Builder를 두되 중요한 조건은 테스트에서 명시한다.

```ts
const document =
  aCurrentConcept()
    .withId("pcie-bar")
    .withTopic("pcie-cxl")
    .build();
```

Builder 자체를 복잡한 DSL로 만들 필요는 없다.

---

#### 200. 14. 하나의 테스트에서 모든 상태를 검증

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:74370; message: 118 (assistant); path: 14. 하나의 테스트에서 모든 상태를 검증 -->

나쁜 예:

```ts
it("handles publication states", () => {
  // current
  // historical
  // superseded
  // archived
  // draft
  // future document
});
```

중간 Assertion이 실패하면 어떤 계약이 깨졌는지 파악하기 어렵다.

상태 Matrix를 사용하더라도 각 Case가 독립적인 테스트 이름으로 출력되게 한다.

---

#### 201. 권장 분류

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76398; message: 121 (assistant); path: 3. 모든 과거 메모를 검색 페이지로 유지 > 권장 분류 -->

### 독립 페이지

```text
하나의 검색 질문을 충분히 해결
직접 분석이나 경험 존재
독립적으로 이해 가능
```

### 통합 대상

```text
같은 주제의 짧은 메모 여러 개
서로 보완돼야 의미가 생김
```

### 공개하되 색인 제외

```text
과거 기록
개인 Reference
검색 결과로서 약함
```

### 제거·Archive

```text
내용이 거의 없음
깨진 링크만 존재
테스트성 글
```

---

### 자동화·운영

#### 202. 내가 가장 추천하는 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:2832; message: 16 (assistant); path: 내가 가장 추천하는 구조 -->

나는 **블로그가 아니라 '시스템 프로그래밍 백과사전'**으로 가야 한다고 생각한다.

예를 들면 홈이 이렇게 바뀌는 거다.

```
Computer Architecture
    Cache
    NUMA
    Memory
    CPU

System Programming
    Linux
    ELF
    Loader
    Scheduler

C++
    STL
    Template
    ABI
    Memory

Firmware
    BIOS
    UEFI
    Bootloader

PCIe
    Enumeration
    BAR
    MSI
    DMA

CXL
    Type1
    Type2
    Type3
```

그러면 글은 단순한 게시물이 아니라 **각 지식 노드의 설명**이 된다.

---

## 내가 하나 확신하는 것

여기까지 분석하면서 점점 드는 생각은, **애드센스의 "콘텐츠 가치 부족"이 반드시 글의 질이 낮아서라기보다 사이트가 '지식 체계'로 보이지 않기 때문일 가능성**도 충분히 있다는 점이다.

물론 Google이 구체적으로 어떤 이유로 판단했는지는 공개하지 않기 때문에 단정할 수는 없다. 하지만 현재처럼 전문적인 글이 이미 많이 있는 경우라면, **정보 구조를 개선해 기존 콘텐츠의 가치를 더 잘 드러내는 것**이 충분히 의미 있는 우선순위라고 본다.

다음에는 **Content Architecture(콘텐츠 설계)**로 넘어가서, "좋은 기술 글"과 "검색과 학습에 강한 기술 문서"의 차이를 더 깊게 분석해보자.

## 17. user

다음

## 18. assistant

이번에는 **Task 1-3. Content Architecture**로 갈게. 정보 구조가 “어디에 놓을지”라면, 콘텐츠 아키텍처는 **글 하나를 어떤 역할과 형태로 설계할지**에 대한 문제다.

## 19. assistant

#### 203. 권장 검색 문서 모델

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4376; message: 22 (assistant); path: 7. 여섯 번째 핵심 안티패턴 > Client-Side Full-Text Index > 권장 검색 문서 모델 -->

```json
{
  "title": "...",
  "description": "...",
  "headings": ["...", "..."],
  "keywords": ["...", "..."],
  "topics": ["cxl", "pcie"],
  "type": "debug-note",
  "body_excerpt": "...",
  "url": "..."
}
```

검색 가중치도 다르게 둔다.

```text
제목        10
명시적 키워드 8
소제목       5
설명         4
본문         1
코드         0 또는 별도
```

그리고 검색 인덱스를 분야별로 분할할 수도 있다.

```text
search-core.json
search-cpp.json
search-system.json
search-cuda.json
```

검색 모달을 열었을 때 필요한 인덱스만 불러오도록 하면 된다.

---

#### 204. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4622; message: 22 (assistant); path: 11. 열 번째 핵심 안티패턴 > Configuration Surface Expansion > 권장 -->

설정을 세 종류로 구분하자.

#### Site identity

```text
title
description
author
url
locale
```

#### Content behavior

```text
pagination
series
search
RSS
```

#### Optional integrations

```text
Giscus
Analytics
Newsletter
```

그리고 네 사이트에서 항상 사용하는 기능은 굳이 `enabled` 옵션으로 감싸지 않아도 된다.

범용 테마를 배포할 때만 configuration surface가 필요하다.

---

#### 205. 권장 검색 문서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5064; message: 25 (assistant); path: 4. 세 번째 핵심 안티패턴 > Search Index as a Dump > 권장 검색 문서 -->

```json
{
  "title": "U-Boot PCIe Enumeration",
  "description": "U-Boot가 PCIe 장치를 탐색하고 BAR를 할당하는 흐름",
  "topics": ["pcie", "u-boot", "bootloader"],
  "contentType": "source-walkthrough",
  "headings": [
    "Root Complex 초기화",
    "Configuration Space 스캔",
    "BAR 크기 탐색"
  ],
  "keywords": [
    "enumeration",
    "configuration space",
    "BAR sizing"
  ],
  "excerpt": "핵심 본문 일부",
  "url": "/..."
}
```

#### 206. 추천 링크 모델

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5317; message: 25 (assistant); path: 8. 일곱 번째 핵심 안티패턴 > Internal Link Underuse > 추천 링크 모델 -->

글마다 다음 링크를 둘 수 있다.

```text
Prerequisites
Parent Topic
Related Concepts
Next Step
Used In
```

예:

```text
Parent Topic: PCIe
Prerequisite: Configuration Space
Related: BAR Allocation
Next: Linux PCI Driver Binding
Used In: CXL Enumeration
```

이 구조는 사람에게도 좋고 검색엔진에게도 좋다.

---

#### 207. 추천 규칙

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5579; message: 25 (assistant); path: 12. 열한 번째 핵심 안티패턴 > Tag Vocabulary Drift > 추천 규칙 -->

```text
Topic:
글이 속한 핵심 지식 분야

Type:
글의 콘텐츠 역할

Tag:
여러 분야를 가로지르는 보조 특성
```

예:

```yaml
topics:
  - pcie
  - firmware

type: source-walkthrough

tags:
  - debugging
  - u-boot
```

---

#### 208. 추천 표시

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5706; message: 25 (assistant); path: 14. 열세 번째 핵심 안티패턴 > Date Ambiguity > 추천 표시 -->

```text
Updated July 2026
Verified with CUDA 13.0 / Linux 6.12
```

또는:

```text
Status: Historical
```

이렇게 하면 오래된 글이 무조건 낮은 가치로 보이지 않고, 오히려 기술 변화의 기록으로 활용될 수 있다.

Google 역시 기존 콘텐츠를 필요에 따라 업데이트하거나 더 이상 관련 없으면 정리하라고 권장한다. citeturn117273search5

---

#### 209. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6811; message: 28 (assistant); path: 10. 열 번째 핵심 안티패턴 > CSS Drift Under Utility Composition > 권장 -->

토큰을 명확하게 정의한다.

```text
spacing-content
spacing-section
radius-card
border-subtle
surface-elevated
text-muted
```

Tailwind utility를 계속 쓰되 의미 있는 조합은 component layer 또는 컴포넌트 내부 상수로 고정한다.

---

#### 210. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6958; message: 28 (assistant); path: 13. 열세 번째 핵심 안티패턴 > Dependency Residue > 권장 -->

의존성을 역할별로 나눈다.

```text
runtime dependencies
build dependencies
content tooling
editor-only dependencies
```

그리고 package마다 한 줄의 소유 목적을 기록한다.

---

#### 211. Audit Without Remediation Workflow

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6975; message: 28 (assistant); path: 14. 열네 번째 핵심 안티패턴 > Audit Without Remediation Workflow -->

### 문제를 발견하지만 수정 흐름이 없음

현재 audit 도구는 상당히 풍부하다. 그러나 감사 도구의 진짜 가치는 문제를 출력하는 것보다 **수정 우선순위와 흐름을 제공하는 것**에 있다.

예를 들어 다음 결과가 나왔다고 하자.

```text
깨진 내부 링크 172개
오래된 글 93개
이미지 없는 글 214개
중복 가능 주제 48개
```

그 자체로는 부담만 커진다.

### 필요한 구조

```text
severity
confidence
owner
suggested fix
automatic fixability
affected pages
priority score
```

예:

```text
ERROR
- 공개 링크 깨짐
- 빌드 차단

WARNING
- 오래된 버전
- 검토 필요

INFO
- 이미지 없음
- 선택 개선
```

### 반드시 피할 것

모든 audit 결과를 release blocker로 만드는 것.

그러면 결국 개발자가 audit를 끄거나 무시하게 된다.

---

#### 212. Documentation and Implementation Divergence

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:7127; message: 28 (assistant); path: 17. 열일곱 번째 핵심 안티패턴 > Documentation and Implementation Divergence -->

### README 설명과 실제 구현이 달라짐

현재 README는 8개의 코드 블록 테마를 런타임에 변경할 수 있다고 설명한다. 그러나 현재 `astro.config.mjs`의 Expressive Code 설정은 `github-dark`와 `github-light` 두 테마만 지정한다. citeturn214183view0turn214183view2

둘 중 어느 것이 실제 동작인지 추가 확인은 필요하다. 별도 CSS나 런타임 로직이 있을 수 있다. 하지만 적어도 외부 설명과 핵심 설정이 즉시 일치해 보이지 않는다는 점은 문서 드리프트 신호다.

또 README는 Markdown에서 Newsletter를 MDX로 import할 수 있다고 설명하지만, 현재 MDX integration은 제거되어 있고 `.mdx` 파일이 없다고 설정에 적혀 있다. citeturn214183view0turn214183view2

### 문제

- 새 기여자가 잘못된 기능을 기대함
- 사용자가 문서대로 따라 해도 동작하지 않음
- 제거된 기능이 여전히 공개 계약처럼 남음
- 테마 제품과 실제 개인 사이트 상태가 다름

### 개선

README를 두 개로 나누는 편이 좋다.

```text
README.md
- 현재 이 저장소의 실제 사용법

THEME.md
- 범용 테마로 사용할 때의 기능
```

또는 기능 표에 상태를 표시한다.

```text
Stable
Experimental
Planned
Removed
```

---

#### 213. 19.2 콘텐츠 감사 자동화

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:7220; message: 28 (assistant); path: 19. 현재 유지보수성에서 잘한 부분 > 19.2 콘텐츠 감사 자동화 -->

내부 링크, 시리즈, 이미지, 신선도, 문체, 중복을 자동 검사한다. citeturn214183view1

#### 214. P-14. Unknown Language Fallback to Heavy Parser

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:11869; message: 38 (assistant); path: Syntax Highlighting > P-14. Unknown Language Fallback to Heavy Parser -->

### 미등록 언어를 무거운 자동 감지로 처리

### 문제

오타 하나가 예측하지 못한 parser 비용을 만든다.

### 개선

알 수 없는 언어는 `text`로 fallback하고 감사에서 경고한다.

---

#### 215. P-48. No JavaScript Failure Fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:12338; message: 38 (assistant); path: JavaScript and Rendering > P-48. No JavaScript Failure Fallback -->

### JS가 실패하면 검색·메뉴·탐색이 동작하지 않음

### 개선

기본 링크와 정적 페이지 구조를 유지한다.

---

#### 216. M-35. CI Workflow Logic Duplication

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16548; message: 45 (assistant); path: CI/CD > M-35. CI Workflow Logic Duplication -->

### 여러 workflow에 install·build·cache 설정 반복

### 문제

한 곳만 수정되어 동작이 달라진다.

### 개선

재사용 workflow 또는 composite action으로 공통화한다.

---

#### 217. 여러 workflow에 install·build·cache 설정 반복

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16550; message: 45 (assistant); path: CI/CD > M-35. CI Workflow Logic Duplication > 여러 workflow에 install·build·cache 설정 반복 -->

<!-- empty source section -->

#### 218. AI나 자동화가 만든 Markdown은 안전하다고 가정

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17791; message: 48 (assistant); path: C. XSS와 콘텐츠 렌더링 > SEC-22. Trusting Generated Content > AI나 자동화가 만든 Markdown은 안전하다고 가정 -->

<!-- empty source section -->

#### 219. README가 편리해 보여 바로 workflow에 추가

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17918; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-29. Arbitrary Third-Party Action > README가 편리해 보여 바로 workflow에 추가 -->

<!-- empty source section -->

#### 220. workflow 전체에 secret을 환경변수로 설정

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17979; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-32. Secrets Available to Every Step > workflow 전체에 secret을 환경변수로 설정 -->

```yaml
env:
  TOKEN: ${{ secrets.TOKEN }}
```

#### 221. 외부 PR 콘텐츠를 secret이 있는 workflow에서 처리

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18031; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-35. Pull Request Workflow with Secrets > 외부 PR 콘텐츠를 secret이 있는 workflow에서 처리 -->

<!-- empty source section -->

#### 222. 임의 branch나 workflow_dispatch 입력으로 운영 배포

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18114; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-40. Deployment From Unreviewed Commit > 임의 branch나 workflow_dispatch 입력으로 운영 배포 -->

<!-- empty source section -->

#### 223. 콘텐츠 편집 token이 `.github/workflows`까지 수정 가능

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18440; message: 48 (assistant); path: F. OAuth와 관리자 편집기 > SEC-61. Editor Can Modify Workflow Files > 콘텐츠 편집 token이 `.github/workflows`까지 수정 가능 -->

<!-- empty source section -->

#### 224. 어떤 workflow와 dependency로 배포됐는지 모름

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18971; message: 48 (assistant); path: J. 보안 운영 > SEC-97. No Deployment Provenance > 어떤 workflow와 dependency로 배포됐는지 모름 -->

<!-- empty source section -->

#### 225. 본인 방문과 자동화 트래픽이 성과에 포함

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20511; message: 50 (assistant); path: 개인정보와 데이터 품질 > O-90. Author Traffic Pollution > 본인 방문과 자동화 트래픽이 성과에 포함 -->

<!-- empty source section -->

#### 226. 자동화가 metadata·링크를 예상보다 많이 변경

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:21643; message: 52 (assistant); path: 발행 > G-47. Publish Without Content Diff > 자동화가 metadata·링크를 예상보다 많이 변경 -->

<!-- empty source section -->

#### 227. L-81. Separate Translation Workflow Without Sync

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:23947; message: 54 (assistant); path: 다국어 사이트 운영 > L-81. Separate Translation Workflow Without Sync -->

### 번역본을 별도 파일로 관리하지만 연결 정보 없음

### 개선

source ID와 revision을 metadata로 관리한다.

---

#### 228. L-85. Missing Translation Fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:23995; message: 54 (assistant); path: 다국어 사이트 운영 > L-85. Missing Translation Fallback -->

### 해당 언어 번역이 없을 때 빈 페이지 또는 404

### 개선

원문 언어로 이동할 수 있음을 명확히 안내한다.

---

#### 229. 공통 태그 수만으로 관련 글 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24297; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-01. Related Posts by Tag Count > 공통 태그 수만으로 관련 글 추천 -->

```text
A와 B가 `linux`, `pcie` 태그를 공유
→ 관련 글
```

#### 230. K-89. Recommendation System Without Failure Fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25631; message: 56 (assistant); path: 품질과 평가 > K-89. Recommendation System Without Failure Fallback -->

### 추천 데이터 생성 실패 시 페이지 오류

### 개선

기본적으로 정적 상위 Topic 링크는 항상 제공한다.

---

#### 231. 추천 최소 관계 모델

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25810; message: 56 (assistant); path: 추천 최소 관계 모델 -->

처음부터 복잡하게 만들 필요는 없다.

```yaml
parent:
prerequisites:
next:
related:
supersedes:
```

이 정도면 충분하다.

예:

```yaml
parent: pcie
prerequisites:
  - pcie-configuration-space
next:
  - pcie-msi-x
related:
  - linux-pci-enumeration
supersedes: null
```

자동 추천은 이 명시 관계를 대체하지 않고 보조해야 한다.

#### 232. 원본 Markdown과 컴포넌트만 검사하고 최종 배포물을 보지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26308; message: 58 (assistant); path: 통합 테스트 > T-25. Test Against Source, Not Dist > 원본 Markdown과 컴포넌트만 검사하고 최종 배포물을 보지 않음 -->

<!-- empty source section -->

#### 233. CI 환경에 따라 fallback font가 달라짐

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26686; message: 58 (assistant); path: 시각 회귀 테스트 > T-53. Font Not Pinned > CI 환경에 따라 fallback font가 달라짐 -->

<!-- empty source section -->

#### 234. T-90. Missing Font Fallback in Generator

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27159; message: 58 (assistant); path: 생성 자산 검증 > T-90. Missing Font Fallback in Generator -->

### CI에서 한글 폰트가 없어 네모로 생성

### 개선

생성용 폰트를 명시적으로 포함하고 canary 결과를 검사한다.

---

#### 235. T-99. Workflow Permission Not Tested

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27267; message: 58 (assistant); path: 보안 테스트 > T-99. Workflow Permission Not Tested -->

### GitHub Actions의 기본 권한 변화에 의존

### 개선

workflow에서 `permissions`가 명시됐는지 lint한다.

---

#### 236. R-33. Custom Directive Without Fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27933; message: 60 (assistant); path: 포맷 이식성 > R-33. Custom Directive Without Fallback -->

### 전용 parser가 없으면 내용을 이해할 수 없음

### 개선

원문 자체가 최소한 읽을 수 있는 문법을 선택한다.

---

#### 237. 자동화가 수천 줄 formatting 변경까지 만듦

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30264; message: 62 (assistant); path: 구현 과정 > D-68. Generated Diff Overload > 자동화가 수천 줄 formatting 변경까지 만듦 -->

<!-- empty source section -->

#### 238. 추천 작업 상태

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30756; message: 62 (assistant); path: 추천 작업 상태 -->

```text
Observed
Confirmed
Accepted
Planned
In Progress
Resolved
Not Applicable
```

각 항목에는 한 줄의 증거만 연결한다.

예:

```yaml
id: A-01
name: Article Warehouse
status: confirmed
impact: high
scope: site-wide
evidence:
  - 홈페이지가 최신 글 중심
  - 대표 Topic Hub가 부족
nextAction:
  - PCIe & CXL Hub 초안 작성
```

이를 위한 별도 대시보드나 데이터베이스는 필요 없다.

---

#### 239. 권장 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31011; message: 64 (assistant); path: A-02. 홈 Hero 문구 재정의 > 권장 구조 -->

### Eyebrow

```text
Systems Engineering Knowledge Base
```

### 제목

```text
Low-level software, explained from code to hardware
```

또는 한국어 중심으로:

```text
코드에서 하드웨어까지 연결하는 시스템 기술 문서
```

### 설명

```text
C++, Linux, firmware, CUDA, PCIe와 CXL의 내부 동작,
성능 및 디버깅 과정을 실제 코드와 시스템 관점에서 정리합니다.
```

### 주요 버튼

```text
Start Here
Explore Topics
```

### 보조 버튼

```text
About Hawk
```

기존의 `Read the blog`는 목적이 너무 일반적이다. 홈 자체가 이미 블로그이기 때문에 어디로 이동하는지 명확하지 않다.

#### 240. 권장 Topic

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31162; message: 64 (assistant); path: A-04. Core Topics 영역 추가 > 권장 Topic -->

```text
C++
Systems Programming
Firmware & Bootloader
GPU & CUDA
PCIe
CXL
```

다만 초기에 실제 Hub가 준비되지 않았다면 `PCIe`와 `CXL`을 합쳐도 된다.

```text
PCIe & CXL
```

그러면 총 5개가 된다.

#### 241. 권장 description 예시

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31506; message: 64 (assistant); path: A-08. 홈 SEO metadata 정비 > 권장 description 예시 -->

```text
C++, Linux 시스템 프로그래밍, 펌웨어, CUDA,
PCIe와 CXL의 내부 동작과 디버깅을 다루는 기술 지식베이스입니다.
```

#### 242. 권장 URL

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31886; message: 66 (assistant); path: B-03. `PCIe & CXL` Hub 생성 > 권장 URL -->

```text
/topics/pcie-cxl/
```

신규 URL은 짧고 안정적으로 유지한다.

#### 243. 추천 역할 분배

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32012; message: 66 (assistant); path: B-06. `PCIe & CXL` 대표 글 선정 기준 > 추천 역할 분배 -->

```text
1개: 전체 Guide
2개: 핵심 Concept
1개: Source Walkthrough
1개: Debug Note
1개: Experiment
```

예를 들어 Featured가 6개라면:

```text
PCIe 장치 초기화 전체 흐름
BAR 크기 탐색
MSI-X 설정
Linux PCI enumeration source walkthrough
CXL HDM Decoder
PCIe mmap 실패 디버깅
```

---

#### 244. 권장 callout

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33280; message: 68 (assistant); path: C-10. 근거·관찰·추론 구분 > 권장 callout -->

```text
확인된 사실
관찰
가설
주의
```

네 가지 정도면 충분하다.

`specification`, `source`는 일반 인용으로 처리해도 된다.

---

#### 245. 권장 표기

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33437; message: 68 (assistant); path: C-14. 사양 기반 글에 revision 추가 > 권장 표기 -->

```text
PCI Express Base Specification Revision 5.0
CXL 3.0 Specification
UEFI Specification 2.10
```

정확한 section이 핵심 근거라면 함께 기록한다.

#### 246. 자동화할 것

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33697; message: 68 (assistant); path: C-22. 자동 검사와 사람 검토의 경계 > 자동화할 것 -->

```text
필수 metadata 존재
enum 유효성
날짜 형식
Topic ID 존재
relation 대상 존재
상태 불변조건
대표 글의 description 존재
lastVerified가 미래 날짜인지
```

#### 247. 자동화하지 않을 것

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33710; message: 68 (assistant); path: C-22. 자동 검사와 사람 검토의 경계 > 자동화하지 않을 것 -->

```text
기술 결론이 옳은가
가설이 충분히 조심스럽게 표현됐는가
대표 글로 적합한가
중복 글을 합쳐야 하는가
출처가 실제 주장을 충분히 뒷받침하는가
```

---

#### 248. 권장 정보

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34302; message: 70 (assistant); path: D-08. 검색 결과 UI 재설계 > 권장 정보 -->

```text
제목
Content Type
Topic
짧은 description 또는 일치한 heading
상태
수정일
```

예:

```text
PCIe BAR 크기 탐색과 주소 할당
Concept · PCIe & CXL · Current

BAR 레지스터에 all-ones를 기록해 크기를 탐색하는 과정과
32/64-bit MMIO 주소 할당을 설명합니다.
```

#### 249. D-10. 검색 실패 fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34375; message: 70 (assistant); path: D-10. 검색 실패 fallback -->

인덱스 로딩이나 JavaScript가 실패해도 사이트 탐색이 막히면 안 된다.

## fallback

```text
Core Topics
전체 글 목록
주요 시리즈
```

로 이동할 수 있게 한다.

검색 결과 없음 상태에서는:

```text
유사 alias
관련 Topic
철자 보정 후보
대표 Guide
```

를 제공한다.

예:

```text
“MSIX” 검색 결과가 없습니다.

MSI-X를 찾으셨나요?
- PCIe MSI-X 설정 흐름
- PCIe Interrupt 개요
```

---

#### 250. fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34379; message: 70 (assistant); path: D-10. 검색 실패 fallback > fallback -->

```text
Core Topics
전체 글 목록
주요 시리즈
```

로 이동할 수 있게 한다.

검색 결과 없음 상태에서는:

```text
유사 alias
관련 Topic
철자 보정 후보
대표 Guide
```

를 제공한다.

예:

```text
“MSIX” 검색 결과가 없습니다.

MSI-X를 찾으셨나요?
- PCIe MSI-X 설정 흐름
- PCIe Interrupt 개요
```

---

#### 251. fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34601; message: 70 (assistant); path: D-16. 관련 글 추천 재설계 > fallback -->

명시적 관계가 없으면:

```text
상위 Topic Hub
```

하나만 보여줘도 된다.

억지 관련 글 6개보다 낫다.

---

#### 252. 권장 함수

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35213; message: 72 (assistant); path: E-04. Publication Policy 중앙화 > 권장 함수 -->

```ts
interface PublicationDecision {
  render: boolean;
  index: boolean;
  includeInSearch: boolean;
  includeInSitemap: boolean;
  includeInRss: boolean;
  includeInHubLists: boolean;
}

function getPublicationDecision(
  entry: ContentManifestEntry,
  environment: "development" | "production"
): PublicationDecision
```

#### 253. 권장 role

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35413; message: 72 (assistant); path: E-08. 코드 블록 역할 분리 > 권장 role -->

```text
source
command
output
log
dump
text
```

Markdown metadata 예시:

````markdown
```bash role="command"
cmake --build build
```

```text role="output"
[100%] Built target analyzer
```

```text role="log"
pci 0000:01:00.0: BAR 0: assigned
```
````

#### 254. 권장 파이프라인

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35883; message: 72 (assistant); path: E-17. CI Job 분리 > 권장 파이프라인 -->

### Job 1: Fast validation

```text
install
schema
internal links
relations
typecheck
```

### Job 2: Build

```text
production build
search
RSS
Sitemap
required assets
```

### Job 3: Smoke test

```text
generated dist serve
대표 URL 확인
대표 asset 확인
검색 JSON parse
```

### Job 4: Deploy

```text
artifact 다운로드
GitHub Pages 배포만 수행
```

#### 255. E-26. 외부 링크 검사를 정기 작업으로 이동

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36273; message: 72 (assistant); path: E-26. 외부 링크 검사를 정기 작업으로 이동 -->

외부 URL은 일시 장애와 rate limit 때문에 CI를 불안정하게 만든다.

## 매 변경마다

```text
내부 링크
내부 anchor
문서 ID
redirect target
```

## 주간 또는 월간

```text
외부 링크
최종 redirect
HTTP 상태
반복 실패
```

## 결과 정책

```text
1회 실패 → 기록
연속 실패 → warning
핵심 출처 반복 실패 → 수동 검토
```

## 완료 조건

- 외부 네트워크 장애가 일반 배포를 막지 않음
- 반복 실패 링크는 추적됨
- 핵심 사양·소스 링크는 높은 우선순위로 표시됨

## 우선순위

```text
P1
```

---

#### 256. 권장 핵심 문장 방향

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37240; message: 75 (assistant); path: F-12. About 페이지 개편 > 권장 핵심 문장 방향 -->

```text
CUDA·FPGA 기반 영상 처리, 임베디드 펌웨어,
PCIe 장치와 시스템 소프트웨어 개발 경험을 바탕으로
코드·사양·실험 결과를 연결해 설명합니다.
```

#### 257. 권장 최소 구성

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37435; message: 75 (assistant); path: F-17. 구조화 데이터 최소 구현 > 권장 최소 구성 -->

### 홈

```text
WebSite
Person 또는 Organization는 실제 운영 형태에 맞게 선별
```

### 글

```text
BlogPosting 또는 Article
BreadcrumbList
```

Article 구조화 데이터는 Google이 제목·이미지·날짜·작성자 등 페이지 정보를 이해하는 데 도움을 줄 수 있다. citeturn733970search14

#### 258. 권장 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38191; message: 77 (assistant); path: Epic G. 보안·개인정보·공급망 정비 > G-01. 공개 사이트와 관리자 기능 경계 확정 > 권장 구조 -->

```text
Public site
- 정적 HTML·CSS·JS
- 공개 콘텐츠 읽기
- 검색
- 댓글·광고는 선택적 외부 기능

Admin tool
- 인증
- 콘텐츠 편집
- GitHub API 쓰기
- 별도 배포 또는 로컬 전용
```

#### 259. 기본 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38317; message: 77 (assistant); path: GitHub Actions 권한 > G-03. Workflow별 권한 전수 조사 > 기본 권장 -->

```yaml
permissions:
  contents: read
```

배포 job만 필요한 권한을 명시적으로 추가한다.

#### 260. 배포 후 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39385; message: 77 (assistant); path: 민감 정보 노출 > G-28. 민감 파일 Artifact Allowlist > 배포 후 검사 -->

```text
확장자 목록
숨김 파일
대형 예상 밖 파일
환경 파일명
source map
backup suffix
```

#### 261. 권장 Canary

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40720; message: 79 (assistant); path: H-19. Visual Canary 세트 > 권장 Canary -->

```text
홈
PCIe & CXL Hub
코드 블록이 가장 많은 글
표·다이어그램이 많은 글
검색 modal 열린 상태
```

추가로 다크모드 대표 글 1개를 포함할 수 있다.

#### 262. Hero 권장 방향

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:42191; message: 81 (assistant); path: 6주 계획: 사용자에게 보이는 구조 완성 > Sprint 4 — 4주차: 홈 개편 > Hero 권장 방향 -->

```text
코드에서 하드웨어까지 연결하는 시스템 기술 문서
```

설명:

```text
C++, Linux 시스템 프로그래밍, 펌웨어, CUDA,
PCIe와 CXL의 내부 동작과 디버깅을 정리합니다.
```

#### 263. 권장 배분

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43374; message: 83 (assistant); path: Ticket S1-07. 대표 문서 후보 20개 선정 > 권장 배분 -->

| Topic | 후보 수 |
|---|---:|
| PCIe & CXL | 5 |
| Firmware & Bootloader | 4 |
| C++ | 4 |
| GPU & CUDA | 4 |
| Linux & Systems | 3 |

정확히 맞출 필요는 없다.

#### 264. 권장 URL

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43822; message: 85 (assistant); path: 2. 페이지 기본 Metadata > 권장 URL -->

```text
/topics/pcie-cxl/
```

#### 265. 권장 제목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43940; message: 85 (assistant); path: 5. Start Here > 5.1 전체 구조 입문 > 권장 제목 -->

```text
PCIe 장치는 어떻게 발견되고 사용할 수 있게 되는가
```

#### 266. 권장 제목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43978; message: 85 (assistant); path: 5. Start Here > 5.2 BAR와 MMIO 핵심 Concept > 권장 제목 -->

```text
PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가
```

#### 267. 권장 흐름도

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44057; message: 85 (assistant); path: 6. System Flow > 권장 흐름도 -->

```text
Firmware
  ├─ Root Complex 초기화
  ├─ Bus·Device·Function 열거
  └─ 주소 공간 할당
            ↓
Linux PCI Core
  ├─ pci_dev 생성
  ├─ Resource 등록
  └─ Driver binding
            ↓
Device Driver
  ├─ BAR mapping
  ├─ MSI-X 설정
  ├─ DMA buffer 준비
  └─ Device initialization
            ↓
PCIe / CXL Device
  ├─ MMIO register
  ├─ DMA engine
  ├─ Device memory
  └─ HDM Decoder
```

초기에는 정적 HTML과 CSS로 구현하고, 무거운 그래프 라이브러리는 사용하지 않는다.

---

#### 268. 권장 대표 문서

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44110; message: 85 (assistant); path: 7. Core Concepts > 7.1 Enumeration & Configuration Space > 권장 대표 문서 -->

```text
PCIe Configuration Space에서 운영체제는 무엇을 읽는가
```

#### 269. 권장 다이어그램

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:45319; message: 90 (assistant); path: 4. System Flow > 권장 다이어그램 -->

```text
Power

↓

CPU Reset

↓

Boot ROM

↓

Bootloader

↓

Device Tree

↓

Linux Kernel

↓

Subsystem

↓

Driver

↓

Application
```

그리고

옆에는

```text
Memory

Clock

Interrupt

PCIe

DMA

Filesystem

Network
```

등이 어느 단계에서 준비되는지 표시한다.

---

#### 270. 권장 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:54341; message: 100 (assistant); path: 권장 구조 -->

예를 들어

PCIe Hub

```text
Hero

↓

Start Here

↓

Learning Path

↓

Core Guides

↓

Concepts

↓

Debugging

↓

Reference

↓

Historical

↓

Related Topics
```

---

#### 271. 57. Topic Hub 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57250; message: 102 (assistant); path: 57. Topic Hub 추천 -->

검색 결과 하단 또는 넓은 검색어에서 관련 Topic을 보여준다.

예:

```text
“DMA”와 관련된 Topic

PCIe & CXL
GPU & CUDA
Linux & Systems
```

Topic 관계는 자동 태그 빈도보다 Registry의 명시적 관계를 사용한다.

---

#### 272. SEA-10. 결과 없음·오류 Fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57551; message: 102 (assistant); path: 68. 실제 구현 티켓 > SEA-10. 결과 없음·오류 Fallback -->

Topic Hub와 전체 글 목록으로 연결.

---

#### 273. 32. Related Articles 자동 추천의 fallback

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58647; message: 104 (assistant); path: 32. Related Articles 자동 추천의 fallback -->

명시적 관계가 없는 일반 문서도 있을 수 있다.

이때 추천 우선순위:

```text
1. 명시적 relation
2. 같은 Series
3. 같은 세부 Topic
4. 본문 outbound link
5. 같은 Content Type
6. 공통 Tag
```

---

#### 274. 34. Fallback은 Topic Hub 하나로 충분할 수 있다

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58683; message: 104 (assistant); path: 34. Fallback은 Topic Hub 하나로 충분할 수 있다 -->

명시적 관계가 전혀 없다면:

```text
이 글이 속한 주제

Linux & Systems 전체 보기
```

하나만 보여줘도 된다.

무관한 추천 글보다 낫다.

---

#### 275. 35. 추천 알고리즘 점수

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58699; message: 104 (assistant); path: 35. 추천 알고리즘 점수 -->

Fallback 추천에만 사용한다.

```text
명시적 relation: 100
같은 Series: 80
본문에서 직접 링크: 60
같은 Topic: 40
같은 Type: 15
공통 Tag: 5
```

수치 자체보다 우선순위가 중요하다.

명시적 관계가 있으면 자동 추천보다 항상 앞선다.

---

#### 276. REL-09. 태그 기반 추천을 fallback으로 이동

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60014; message: 104 (assistant); path: 90. 실제 구현 티켓 > REL-09. 태그 기반 추천을 fallback으로 이동 -->

명시적 관계 우선.

#### 277. 14. 중복 콘텐츠 사전 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62863; message: 108 (assistant); path: 14. 중복 콘텐츠 사전 검사 -->

새 글을 작성하기 전에 기존 문서를 검색한다.

```bash
npm run content:similar -- \
  "PCIe BAR mmap"
```

후보 기준:

```text
제목 유사도
Alias
같은 Topic
같은 Symbol
같은 검색 의도
```

결과 예:

```text
Possible existing documents

1. pcie-bar-size-probing
   Type: concept
   Similarity: High

2. u250-bar-access
   Type: debug-note
   Similarity: Medium
```

---

#### 278. 40. Primary Topic 하나를 권장하는 이유

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:65949; message: 110 (assistant); path: 40. Primary Topic 하나를 권장하는 이유 -->

글이 여러 주제와 관련돼도 대표 상위 경로는 하나가 명확한 편이 좋다.

예:

```text
U-Boot에서 PCIe Root Complex 초기화
```

가능한 Topic:

```text
Firmware & Bootloader
PCIe & CXL
```

Primary Topic을:

```text
Firmware & Bootloader
```

로 두고 `PCIe & CXL`에서는 관련 Guide나 교차 링크로 노출할 수 있다.

---

#### 279. 20. 외부 링크 검사를 매 Build에서 수행

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:67940; message: 112 (assistant); path: 20. 외부 링크 검사를 매 Build에서 수행 -->

외부 링크는 네트워크 상태와 상대 서버 정책에 따라 불안정하다.

```text
403
429
Timeout
Bot 차단
지역 제한
```

따라서 PR마다 모든 외부 링크를 검사하면 Flaky CI가 된다.

권장:

```text
내부 링크
→ 모든 Build에서 Error

외부 링크
→ 정기 Audit에서 Warning
```

---

#### 280. 50. Image Missing Fallback 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:70480; message: 114 (assistant); path: 50. Image Missing Fallback 없음 -->

이미지가 404이면 다음이 남는다.

```text
빈 공간
깨진 아이콘
Caption만 존재
```

중요한 다이어그램은 Build에서 존재 여부를 검사한다.

외부 이미지는 네트워크 Audit 대상으로 둔다.

이미지 하나가 없어도 본문 텍스트만으로 핵심 설명을 이해할 수 있어야 한다.

---

#### 281. 선택 또는 Fallback 가능

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71233; message: 114 (assistant); path: 94. 필수와 선택 산출물 분류 > 선택 또는 Fallback 가능 -->

```text
문서별 OG 이미지
댓글
Analytics
광고
외부 링크 감사 결과
```

프로젝트 요구에 따라 RSS도 필수로 둘 수 있다.

---

#### 282. OPS-02. Workflow 권한 최소화

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71303; message: 114 (assistant); path: 98. 구현 티켓 > OPS-02. Workflow 권한 최소화 -->

Build와 Deploy Job별 권한을 명시한다.

#### 283. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76880; message: 121 (assistant); path: 15. 제목이 검색 키워드 나열 > 권장 -->

```text
PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가
```

핵심 용어가 자연스럽게 포함되고 질문이 분명하다.

---

### 콘텐츠·정보구조

#### 284. 47. Broken Link 검사 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:1068; message: 9 (assistant); path: 12. 운영 > 47. Broken Link 검사 없음 -->

예전 글 링크 깨짐.

---

#### 285. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4238; message: 22 (assistant); path: 5. 네 번째 핵심 안티패턴 > Content Processing Pipeline as a Compiler > 권장 -->

콘텐츠의 이식성을 세 단계로 관리하자.

#### Level 1: 순수 Markdown

대부분의 글.

#### Level 2: 표준 확장

- GFM
- 수식
- 일반 callout
- 코드 메타데이터

#### Level 3: Hawk 전용 확장

- 특별한 interactive demo
- custom diagram
- 특수 시리즈 UI

그리고 Level 3 사용은 최소화한다.

---

#### 286. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4444; message: 22 (assistant); path: 8. 일곱 번째 핵심 안티패턴 > Tailwind Convenience Becoming Semantic Loss > 권장 -->

Tailwind를 버릴 필요는 없다.

대신 다음 정도는 의미 기반 abstraction이 필요하다.

```text
article-shell
topic-card
series-card
metadata-row
content-status
technical-note
evidence-block
```

CSS class를 새로 만들라는 뜻만은 아니다. 컴포넌트 역할 자체를 명확히 하라는 뜻이다.

예:

```astro
<TopicCard />
<SeriesProgress />
<ContentStatus />
<TestedEnvironment />
<EvidenceBlock />
```

단, 컴포넌트도 지나치게 잘게 나누면 반대편 안티패턴이 발생한다. **실제로 반복되는 의미 단위만 추출**해야 한다.

---

#### 287. 권장 판단

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4563; message: 22 (assistant); path: 10. 아홉 번째 핵심 안티패턴 > Admin Capability Inside a Static Blog > 권장 판단 -->

관리자 편집기가 개인적으로 매우 유용하다면 별도 앱으로 분리하는 편이 좋다.

```text
hawk90.github.io
→ 순수 정적 공개 사이트

editor.hawk90.dev 또는 로컬 도구
→ 콘텐츠 작성과 GitHub commit
```

혹은 관리자 기능을 계속 같은 저장소에 두더라도 공개 사이트 빌드에서는 완전히 tree-shaking되고 route 자체가 생성되지 않도록 해야 한다.

> 공개 블로그와 콘텐츠 CMS는 같은 데이터는 공유해도 같은 런타임일 필요는 없다.

---

#### 288. 추천 가중치

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5098; message: 25 (assistant); path: 4. 세 번째 핵심 안티패턴 > Search Index as a Dump > 추천 가중치 -->

| 필드 | 가중치 |
|---|---:|
| 정확한 제목 | 10 |
| 명시적 키워드 | 8 |
| 토픽 | 7 |
| 소제목 | 5 |
| 설명 | 4 |
| 핵심 요약 | 3 |
| 일반 본문 | 1 |
| 코드·로그 | 0 또는 별도 검색 |

---

#### 289. 추천 구조화 데이터

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5640; message: 25 (assistant); path: 13. 열두 번째 핵심 안티패턴 > Structured Data Without Content Model > 추천 구조화 데이터 -->

#### 글 페이지

```text
BlogPosting 또는 TechArticle
```

#### 저자

```text
Person
```

#### 사이트

```text
WebSite
```

#### 탐색

```text
BreadcrumbList
```

`TechArticle`이 모든 검색 기능을 보장하는 것은 아니지만, 사이트의 의미 모델을 명확히 하는 데 도움이 된다.

#### 290. 추천 우선순위

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5846; message: 25 (assistant); path: 17. 열다섯 번째 핵심 안티패턴 > Heavy Article Tail > 추천 우선순위 -->

```text
1. 핵심 결론
2. 다음에 읽을 글
3. 상위 Topic Hub
4. 참고문헌
5. 댓글
```

공유 버튼, 뉴스레터, 저자 카드, 태그, 광고는 보조적이다.

#### 291. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6756; message: 28 (assistant); path: 9. 아홉 번째 핵심 안티패턴 > Component Proliferation by Page Variation > 권장 -->

데이터 모델과 표현 primitive를 공유한다.

```text
PostMetadata
PostTitle
PostDescription
TopicBadge
ContentStatus
```

그리고 실제 layout은 몇 개만 둔다.

```text
ArticleCard
CompactArticleRow
FeaturedGuide
```

---

#### 292. 태그 겹침만으로 관련 글 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:10911; message: 36 (assistant); path: Task 2-3. Information Architecture & Navigation Anti-patterns > I-28. Related Posts by Shared Tag Only > 태그 겹침만으로 관련 글 추천 -->

<!-- empty source section -->

#### 293. 임의 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:10934; message: 36 (assistant); path: Task 2-3. Information Architecture & Navigation Anti-patterns > I-29. Random Related Posts > 임의 추천 -->

<!-- empty source section -->

#### 294. 같은 글들만 서로 순환 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:10948; message: 36 (assistant); path: Task 2-3. Information Architecture & Navigation Anti-patterns > I-30. Circular Recommendation Trap > 같은 글들만 서로 순환 추천 -->

A가 B를 추천하고, B가 C를 추천하고, C가 다시 A를 추천한다.

#### 295. 실제 검색 결과에서 제목·설명이 어떻게 보일지 확인하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:21605; message: 52 (assistant); path: 발행 > G-44. Publish Without Search Preview Review > 실제 검색 결과에서 제목·설명이 어떻게 보일지 확인하지 않음 -->

<!-- empty source section -->

#### 296. 글을 쓰기 위해 에디터·추천 시스템부터 개발

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:22259; message: 52 (assistant); path: 운영 우선순위 > G-88. Tooling Work Disguised as Editorial Work > 글을 쓰기 위해 에디터·추천 시스템부터 개발 -->

<!-- empty source section -->

#### 297. 추천 최소 용어 관리 모델

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24226; message: 54 (assistant); path: 추천 최소 용어 관리 모델 -->

복잡한 번역 시스템까지는 필요 없다. 다음 정도면 충분하다.

```yaml
- id: cache-coherence
  en: cache coherence
  ko: 캐시 일관성
  aliases:
    - coherence
    - coherency
    - 코히어런시
  related:
    - memory-consistency
  note: CXL.cache와 CPU cache 문맥에서 사용
```

검색에서는 alias를 모두 사용하고, 화면에는 canonical 표기만 보여준다.

#### 298. 왜 추천하는지 설명하지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24358; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-03. Recommendation Without Purpose > 왜 추천하는지 설명하지 않음 -->

```text
관련 글
- MSI-X
- DMA
- NUMA
```

#### 299. 조회수 높은 글만 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24406; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-05. Popularity Bias > 조회수 높은 글만 추천 -->

<!-- empty source section -->

#### 300. 최신 글을 관련 글보다 우선 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24420; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-06. Recency Bias > 최신 글을 관련 글보다 우선 추천 -->

<!-- empty source section -->

#### 301. 클릭률 높은 추천을 계속 강화

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24434; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-07. Engagement Optimization > 클릭률 높은 추천을 계속 강화 -->

<!-- empty source section -->

#### 302. 특정 Topic 안에서만 추천이 순환

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24456; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-08. Recommendation Echo Chamber > 특정 Topic 안에서만 추천이 순환 -->

```text
CXL → CXL → CXL → CXL
```

#### 303. 다양성을 위해 임의 글을 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24481; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-09. Random Exploration Slot > 다양성을 위해 임의 글을 추천 -->

<!-- empty source section -->

#### 304. 글 하단에 추천 글 10~20개

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24495; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-10. Too Many Recommendations > 글 하단에 추천 글 10~20개 -->

<!-- empty source section -->

#### 305. AI가 추천한 관련 글을 자동 게시

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25252; message: 56 (assistant); path: 자동화와 AI 추천 > K-61. AI Recommendation as Truth > AI가 추천한 관련 글을 자동 게시 -->

<!-- empty source section -->

#### 306. 제목과 description만 보고 관계 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25266; message: 56 (assistant); path: 자동화와 AI 추천 > K-62. LLM Reads Only Titles > 제목과 description만 보고 관계 추천 -->

<!-- empty source section -->

#### 307. 클릭이 많은 추천을 강화하면서 같은 글만 반복 노출

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25364; message: 56 (assistant); path: 자동화와 AI 추천 > K-69. Recommendation Feedback Loop > 클릭이 많은 추천을 강화하면서 같은 글만 반복 노출 -->

<!-- empty source section -->

#### 308. 새 글은 클릭 데이터가 없어 추천되지 않음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25374; message: 56 (assistant); path: 자동화와 AI 추천 > K-70. Cold-Start Neglect > 새 글은 클릭 데이터가 없어 추천되지 않음 -->

<!-- empty source section -->

#### 309. 임베딩 모델 업데이트 후 추천과 그래프가 대폭 변경

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25384; message: 56 (assistant); path: 자동화와 AI 추천 > K-71. Model Upgrade Changes Site Structure > 임베딩 모델 업데이트 후 추천과 그래프가 대폭 변경 -->

<!-- empty source section -->

#### 310. 모든 관련 검색과 추천이 대표 Guide로만 감

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25424; message: 56 (assistant); path: Canonical Guide와 중복 > K-74. Canonical Guide Dominates Everything > 모든 관련 검색과 추천이 대표 Guide로만 감 -->

<!-- empty source section -->

#### 311. 사실상 같은 검색 의도의 글을 서로 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25438; message: 56 (assistant); path: Canonical Guide와 중복 > K-75. Duplicate Articles Linked as Related > 사실상 같은 검색 의도의 글을 서로 추천 -->

<!-- empty source section -->

#### 312. 하위 글이 대표 문서보다 검색·추천에서 강함

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25462; message: 56 (assistant); path: Canonical Guide와 중복 > K-77. Related Content Competes with Canonical > 하위 글이 대표 문서보다 검색·추천에서 강함 -->

<!-- empty source section -->

#### 313. 검색으로 들어온 사용자와 시리즈를 따라온 사용자에게 같은 추천

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25474; message: 56 (assistant); path: 사용자 문맥 > K-78. Same Recommendation for All Entry Points > 검색으로 들어온 사용자와 시리즈를 따라온 사용자에게 같은 추천 -->

<!-- empty source section -->

#### 314. 사용자별 추천 시스템을 구축

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25493; message: 56 (assistant); path: 사용자 문맥 > K-79. Personalization Before Need > 사용자별 추천 시스템을 구축 -->

<!-- empty source section -->

#### 315. 소비형 추천 문구 사용

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25535; message: 56 (assistant); path: 사용자 문맥 > K-82. “You May Also Like” Without Explanation > 소비형 추천 문구 사용 -->

<!-- empty source section -->

#### 316. 클릭률이 높으면 추천이 정확하다고 판단

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25557; message: 56 (assistant); path: 품질과 평가 > K-83. Click-Through Rate as Relevance > 클릭률이 높으면 추천이 정확하다고 판단 -->

<!-- empty source section -->

#### 317. 왜 특정 글이 추천되지 않는지 알 수 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25595; message: 56 (assistant); path: 품질과 평가 > K-86. No Explanation for Exclusion > 왜 특정 글이 추천되지 않는지 알 수 없음 -->

<!-- empty source section -->

#### 318. 추천 데이터 생성 실패 시 페이지 오류

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25633; message: 56 (assistant); path: 품질과 평가 > K-89. Recommendation System Without Failure Fallback > 추천 데이터 생성 실패 시 페이지 오류 -->

<!-- empty source section -->

#### 319. 결론보다 추천 카드가 더 크게 보임

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25643; message: 56 (assistant); path: 품질과 평가 > K-90. Recommendation UI Dominates Conclusion > 결론보다 추천 카드가 더 크게 보임 -->

<!-- empty source section -->

#### 320. 알고리즘 추천을 사람이 수정할 수 없음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25746; message: 56 (assistant); path: 운영 > K-98. No Editorial Override > 알고리즘 추천을 사람이 수정할 수 없음 -->

<!-- empty source section -->

#### 321. 그래프·추천 시스템 개발이 콘텐츠 연결보다 커짐

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25770; message: 56 (assistant); path: 운영 > K-100. Knowledge Graph Becomes the Product > 그래프·추천 시스템 개발이 콘텐츠 연결보다 커짐 -->

<!-- empty source section -->

#### 322. 추천 노출 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25839; message: 56 (assistant); path: 추천 노출 구조 -->

글 하단에는 최대 다음 정도가 적절하다.

```text
상위 주제
필요한 선행 개념
다음에 읽을 글
같은 문제의 실전 사례
```

`관련 글 8개`보다 역할이 분명한 3~4개 링크가 더 낫다.

#### 323. 코드 예제 안 URL을 실제 링크로 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26408; message: 58 (assistant); path: 링크 검증 > T-32. Link Checker Parses Code Blocks > 코드 예제 안 URL을 실제 링크로 검사 -->

<!-- empty source section -->

#### 324. 내부 링크가 모두 redirect를 거치지만 검사 통과

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26446; message: 58 (assistant); path: 링크 검증 > T-35. Redirect Hides Internal Link Debt > 내부 링크가 모두 redirect를 거치지만 검사 통과 -->

<!-- empty source section -->

#### 325. 데이터 모델 권장안

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31209; message: 64 (assistant); path: A-04. Core Topics 영역 추가 > 데이터 모델 권장안 -->

```ts
interface CoreTopic {
  id: string;
  title: string;
  description: string;
  href: string;
  featured?: boolean;
}
```

초기에는 단순 정적 배열이면 충분하다.

```ts
export const CORE_TOPICS = [
  {
    id: "cpp",
    title: "C++",
    description: "Modern C++, memory, performance and systems design.",
    href: "/topics/cpp/",
  },
];
```

CMS나 자동 생성 시스템을 만들 필요는 없다.

#### 326. 권장 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31562; message: 64 (assistant); path: A-09. 홈 컴포넌트 경계 단순화 > 권장 구조 -->

```text
HomeHero
CoreTopics
FeaturedGuides
LatestPosts
```

표현 primitive는 공유한다.

```text
ContentTitle
ContentDescription
TopicLabel
DocumentType
```

그러나 하나의 거대한 `PostCard`에 variant prop 15개를 넣는 것도 피한다.

#### 327. 권장 카드 수

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31582; message: 64 (assistant); path: A-09. 홈 컴포넌트 경계 단순화 > 권장 카드 수 -->

```text
FeaturedGuideCard
ArticleRow 또는 LatestArticleCard
TopicEntry
```

세 종류면 충분하다.

#### 328. 권장 URL

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32162; message: 66 (assistant); path: B-11. `Firmware & Bootloader` Hub 생성 > 권장 URL -->

```text
/topics/firmware-bootloader/
```

#### 329. 권장 검색 레코드

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33965; message: 70 (assistant); path: D-02. 검색 문서 모델 재설계 > 권장 검색 레코드 -->

```ts
interface SearchDocument {
  id: string;
  url: string;
  title: string;
  description: string;
  headings: string[];
  topic: string;
  type: string;
  status: string;
  aliases: string[];
  keywords: string[];
  excerpt?: string;
  updated?: string;
}
```

#### 330. 권장 우선순위

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34019; message: 70 (assistant); path: D-03. 검색 필드 가중치 정의 > 권장 우선순위 -->

```text
Title
> Alias·Symbol
> Topic
> Heading
> Description
> Keyword
> Excerpt
> Body summary
```

예시 가중치:

```text
title: 10
aliases: 9
symbols: 9
topic: 7
headings: 6
description: 5
keywords: 4
excerpt: 2
```

정확한 숫자보다 상대 우선순위가 중요하다.

#### 331. 추천 슬롯

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34591; message: 70 (assistant); path: D-16. 관련 글 추천 재설계 > 추천 슬롯 -->

```text
다음에 읽을 글
필요한 선행 개념
같은 문제의 실전 사례
```

각 슬롯 하나씩이면 충분하다.

#### 332. 정기 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34769; message: 70 (assistant); path: D-22. 내부 링크 검증 > 정기 검사 -->

외부 링크는 매 commit마다 전체 검사하지 않는다.

내부 링크는 빠르고 결정적이므로 매번 검사한다.

---

#### 333. 권장 흐름

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35329; message: 72 (assistant); path: E-06. AST 생명주기 제한 > 권장 흐름 -->

```text
문서 1개 읽기
→ 필요한 metadata 추출
→ 렌더 또는 중간 파일 생성
→ AST 해제
→ 다음 문서
```

일부 전역 분석에는 전체 문서 정보가 필요하지만, 이때도 전체 AST가 아니라 작은 manifest만 사용한다.

#### 334. 전체 검사가 필요한 작업

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35669; message: 72 (assistant); path: E-12. 변경 파일 인식 > 전체 검사가 필요한 작업 -->

```text
slug uniqueness
전체 relation integrity
redirect cycle
Sitemap 병합
검색 인덱스 최종 병합
```

#### 335. 문서별 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35858; message: 72 (assistant); path: E-16. 이미지 처리 정책 > 문서별 검사 -->

변경된 문서의 이미지에 대해서만:

```text
존재 여부
width·height
대형 파일
alt 후보
```

를 확인한다.

전체 미사용 이미지 감사는 정기 작업으로 돌린다.

#### 336. 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36197; message: 72 (assistant); path: E-24. 배포 결과 Smoke Test > 검사 -->

```text
HTTP 200 또는 예상 상태
title 존재
canonical 존재
H1 하나
주요 CSS·JS 로드
검색 JSON parse
대표 이미지 존재
내부 핵심 링크 유효
```

#### 337. 검사 대상

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36946; message: 75 (assistant); path: F-07. 빈 페이지와 Placeholder 제거 > 검사 대상 -->

```text
내용 준비 중
Coming Soon
검색 결과 없음
빈 Topic
빈 Tag
빈 Series
빈 통계 페이지
관리자 로그인
로딩 전용 화면
```

#### 338. 권장 처리

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36960; message: 75 (assistant); path: F-07. 빈 페이지와 Placeholder 제거 > 권장 처리 -->

| 상태 | 처리 |
|---|---|
| 작성 중 문서 | Production build 제외 |
| 미래 Topic | 실제 콘텐츠 준비 후 공개 |
| 검색 결과 없음 | noindex + 광고 제외 |
| 빈 태그 | 생성하지 않음 |
| 관리자 페이지 | Production에서 제거 또는 인증 |
| 삭제된 문서 | 적절한 404·410·redirect |

#### 339. 검사 대상

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37110; message: 75 (assistant); path: F-10. 일반적인 AI 문장 제거 > 검사 대상 -->

```text
이번 글에서는 자세히 알아보겠습니다
다양한 장점이 있습니다
매우 중요한 기술입니다
앞으로 더욱 중요해질 것입니다
결론적으로 효율적인 방법입니다
```

이런 표현이 무조건 잘못된 것은 아니지만, 구체적인 정보 없이 반복되면 문서 밀도를 낮춘다.

#### 340. 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37659; message: 75 (assistant); path: F-21. 모바일 콘텐츠 경험 감사 > 검사 -->

```text
본문 글자 크기
코드 가로 스크롤
표 overflow
광고 슬롯 예정 위치
고정 헤더
목차
다이어그램 확대
링크·버튼 터치 영역
CLS
```

### 완료 조건

- 본문을 가리는 고정 요소 없음
- 코드 복사 버튼이 코드를 덮지 않음
- 표와 코드가 viewport를 확장하지 않음
- Topic Hub 탐색이 한 열에서도 이해 가능
- 핵심 콘텐츠가 Hero 아래 너무 늦게 시작하지 않음

### 우선순위

```text
P0
```

---

#### 341. 동결 권장 영역

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37971; message: 75 (assistant); path: F-28. 재신청 후 변경 동결 범위 > 동결 권장 영역 -->

```text
canonical
URL
index 정책
홈 주요 구조
대표 문서 목록
광고 코드
```

#### 342. 자동 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38275; message: 77 (assistant); path: Epic G. 보안·개인정보·공급망 정비 > G-02. Production 빌드에서 관리자 코드 제거 > 자동 검사 -->

```bash
grep -R "/admin" dist/
grep -R "client_secret" dist/
grep -R "localStorage.*token" dist/
```

문자열 검색만으로 충분하지 않으므로 route manifest와 JavaScript bundle도 함께 확인한다.

#### 343. G-20. Privacy Policy와 실제 동작 일치 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38994; message: 77 (assistant); path: 외부 스크립트와 개인정보 > G-20. Privacy Policy와 실제 동작 일치 검사 -->

외부 Integration Inventory에서 Privacy Policy를 생성하는 것이 아니라, 사람이 실제 문장으로 정리한다.

### 검사 항목

```text
서비스 이름
수집 목적
쿠키·localStorage 사용
외부 전송
댓글의 GitHub 의존성
광고 설정
연락 방법
```

### 변경 트리거

다음 변경 시 Privacy Policy 검토:

```text
AdSense 추가·제거
Analytics 변경
Giscus 추가·제거
Newsletter 추가
검색어 수집 시작
외부 폰트 변경
```

### 완료 조건

- 정책에 사용하지 않는 서비스 없음
- 사용 중인 서비스 누락 없음
- 푸터 링크 정상
- 마지막 검토일 표시

### 우선순위

```text
P0
```

---

#### 344. 검사 항목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38998; message: 77 (assistant); path: 외부 스크립트와 개인정보 > G-20. Privacy Policy와 실제 동작 일치 검사 > 검사 항목 -->

```text
서비스 이름
수집 목적
쿠키·localStorage 사용
외부 전송
댓글의 GitHub 의존성
광고 설정
연락 방법
```

#### 345. 검사 패턴

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39269; message: 77 (assistant); path: 민감 정보 노출 > G-26. 콘텐츠 Secret Scan > 검사 패턴 -->

```text
GitHub token 형식
AWS·Cloud API key 형식
Private key header
Bearer token
password=
client_secret
Authorization:
```

#### 346. 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39442; message: 77 (assistant); path: 도메인과 HTTPS > G-30. HTTPS·Canonical·Domain 점검 > 검사 -->

```text
HTTP → HTTPS 전환
www/apex 일관성
GitHub Pages custom domain
canonical production origin
Sitemap origin
OG URL
```

#### 347. 검사 대상

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39940; message: 79 (assistant); path: H-04. Internal Link 검사 > 검사 대상 -->

```text
없는 내부 URL
없는 content ID
깨진 heading anchor
draft 문서 링크
archived 문서의 일반 추천
redirect를 거치는 내부 링크
```

#### 348. 검사 항목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40056; message: 79 (assistant); path: H-06. Topic Hub Validation > 검사 항목 -->

```text
고유 title
고유 description
Start Here 1~3개
Featured 3~6개
관련 Topic 최소 1개
모든 문서 current 또는 허용 상태
중복 article ID 없음
```

#### 349. 추가 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40112; message: 79 (assistant); path: H-07. Featured Content Validation > 추가 검사 -->

```text
Featured 4~6개
같은 Topic으로 과도하게 편중되지 않음
동일 검색 의도의 중복 문서 없음
```

Topic 다양성은 자동 오류보다 warning이 적절하다.

#### 350. H-08. Publication Set 일치 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40137; message: 79 (assistant); path: H-08. Publication Set 일치 검사 -->

다음 생성물이 서로 다른 문서 정책을 사용하면 안 된다.

```text
렌더링 페이지
검색 인덱스
Sitemap
RSS
Topic Hub 자동 목록
```

## 집합 검사

예:

```text
renderedCurrentArticles
searchCurrentArticles
sitemapCurrentArticles
```

를 비교한다.

## 허용되는 차이

```text
Historical:
렌더링·검색에는 포함
Sitemap은 선별

Archived:
직접 URL 유지
검색·RSS·Hub에서 제외
```

차이는 Publication Policy에 명시돼 있어야 한다.

## 자동 오류 예

```text
ERROR:
Draft document `private-xrt-note` exists in search-index.json.
```

```text
ERROR:
Noindex URL `/tags/misc/` is included in sitemap.xml.
```

## 완료 조건

- 공통 Publication Policy 사용
- 예외가 코드 여러 곳에 흩어지지 않음
- Draft·Search·Admin이 공개 목록에 없음
- 삭제 글의 stale 검색 레코드 없음

## 우선순위

```text
P0
```

---

#### 351. 파일 크기 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40266; message: 79 (assistant); path: H-10. 최종 `dist` 구조 검사 > 파일 크기 검사 -->

```text
대형 HTML
대형 JS
대형 CSS
대형 이미지
검색 인덱스
```

예:

```text
WARNING:
`/posts/cuda-complete-guide/index.html` is 3.8 MB.
Largest contributors: code blocks, line-number markup.
```

#### 352. 검사 항목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40323; message: 79 (assistant); path: H-11. Dist HTTP Smoke Test > 검사 항목 -->

```text
예상 HTTP status
title
meta description
canonical
H1 하나
주요 내비게이션
CSS·JS 로드
핵심 내부 링크
```

#### 353. Production artifact 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40880; message: 79 (assistant); path: H-22. 보안 회귀 검사 > Production artifact 검사 -->

다음을 검색한다.

```text
client_secret
ghp_
Authorization:
BEGIN PRIVATE KEY
/admin
```

오탐을 줄이기 위해 예제 placeholder allowlist를 제한적으로 둔다.

#### 354. 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41363; message: 79 (assistant); path: H-32. Production Verification > 검사 -->

```text
실제 production origin
canonical
최신 CSS·JS
검색 index version
대표 internal link
HTTPS
```

#### 355. 예시 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43325; message: 83 (assistant); path: Ticket S1-06. Featured 불변조건 검사 > 예시 검사 -->

```ts
function validateFeaturedArticle(article: Article): string[] {
  const errors: string[] = [];

  if (article.status !== "current") {
    errors.push("Featured article must have status=current.");
  }

  if (!article.topic) {
    errors.push("Featured article must define a primary topic.");
  }

  if (!article.type) {
    errors.push("Featured article must define a content type.");
  }

  if (!article.description?.trim()) {
    errors.push("Featured article must have a description.");
  }

  return errors;
}
```

#### 356. 권장 Warning

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44673; message: 85 (assistant); path: 14. Hub Validation 규칙 > 권장 Warning -->

```text
Start Here 세 문서가 모두 같은 Content Type
Featured가 한 세부 주제에 편중
Debug & Experiments가 비어 있음
대표 Concept에 연결 문서 없음
```

Warning만으로 초기 공개를 막지는 않는다.

#### 357. Ticket PCH-06. 모바일·링크 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44966; message: 85 (assistant); path: 22. 첫 구현 티켓 > Ticket PCH-06. 모바일·링크 검사 -->

```text
360px
키보드
Heading 계층
내부 링크
canonical
```

---

#### 358. 3. 권장 최상위 디렉터리 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:47572; message: 96 (assistant); path: 3. 권장 최상위 디렉터리 구조 -->

초기 권장안은 다음과 같다.

```text
src/
├── components/
├── content/
├── domain/
├── layouts/
├── pages/
├── styles/
├── lib/
└── config/

scripts/
├── content/
├── search/
├── audit/
├── assets/
└── release/

data/
├── topics/
├── curation/
├── terminology/
└── redirects/

tests/
├── fixtures/
├── content/
├── integration/
└── browser/

docs/
├── architecture/
├── editorial/
└── operations/
```

여기서 가장 중요한 구분은 다음 세 개다.

```text
src/content
src/domain
data
```

---

#### 359. 54. 권장 최소 구현

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:49849; message: 96 (assistant); path: 54. 권장 최소 구현 -->

처음에는 다음 파일만 있어도 충분하다.

```text
src/domain/
├── content-model.ts
├── content-schema.ts
├── manifest.ts
├── publication-policy.ts
├── topic-registry.ts
├── curation.ts
└── queries.ts
```

그리고:

```text
src/components/
├── home/
├── topic/
└── content/
```

파일을 수십 개로 쪼개는 것은 실제 코드가 커진 뒤에 해도 된다.

---

#### 360. 55. 최종 권장 디렉터리 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:49877; message: 96 (assistant); path: 55. 최종 권장 디렉터리 구조 -->

1차 완성형은 다음 정도가 적절하다.

```text
src/
├── components/
│   ├── content/
│   ├── home/
│   ├── navigation/
│   ├── search/
│   ├── topic/
│   └── primitives/
│
├── config/
│   ├── site.ts
│   ├── navigation.ts
│   └── integrations.ts
│
├── content/
│   ├── articles/
│   ├── pages/
│   └── config.ts
│
├── domain/
│   ├── content/
│   ├── publication/
│   ├── topics/
│   ├── curation/
│   ├── relations/
│   ├── search/
│   ├── seo/
│   └── view-models/
│
├── layouts/
│   ├── BaseLayout.astro
│   ├── ArticleLayout.astro
│   ├── TopicHubLayout.astro
│   └── StaticPageLayout.astro
│
├── pages/
│   ├── index.astro
│   ├── articles/
│   ├── topics/
│   ├── search.astro
│   └── 404.astro
│
├── lib/
│   ├── dates/
│   ├── urls/
│   └── browser/
│
└── styles/

scripts/
├── content/
├── search/
├── audit/
├── assets/
└── release/

data/
├── redirects/
├── terminology/
└── editorial/

tests/
├── fixtures/
├── content/
├── integration/
└── browser/

docs/
├── architecture/
├── editorial/
└── operations/
```

---

#### 361. 32. Supersession Cycle 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51563; message: 98 (assistant); path: 32. Supersession Cycle 검사 -->

예:

```text
A → B
B → C
C → A
```

는 허용하면 안 된다.

```ts
export function validateSupersessionCycles(
  manifest: ContentManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const document of manifest.documents) {
    const visited = new Set<string>();
    const path: string[] = [];

    let current:
      ContentDocument | undefined =
        document;

    while (
      current?.relations.supersededBy
    ) {
      if (visited.has(current.id)) {
        const cycleStart =
          path.indexOf(current.id);

        const cycle = [
          ...path.slice(cycleStart),
          current.id,
        ];

        issues.push({
          ruleId:
            "content/supersession-cycle",
          severity: "error",
          documentId: document.id,
          message:
            `Supersession cycle: ` +
            cycle.join(" -> "),
        });

        break;
      }

      visited.add(current.id);
      path.push(current.id);

      current = manifest.byId.get(
        current.relations.supersededBy,
      );
    }
  }

  return deduplicateIssues(issues);
}
```

문서마다 같은 cycle이 반복 보고될 수 있으므로 deduplication이 필요하다.

---

#### 362. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:53251; message: 98 (assistant); path: 72. Policy를 Config 데이터로 만들지 코드로 만들지 > 권장 -->

기본 정책은 TypeScript 코드로 둔다.

문서화용 정책 표를 별도로 생성하거나 README에 유지한다.

---

#### 363. 추천 모델

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:54771; message: 100 (assistant); path: 추천 모델 -->

```ts
interface LearningNode{

id:string;

title:string;

documentId:string;

children:string[];

}
```

---

#### 364. “어떻게” 질문

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:55782; message: 102 (assistant); path: 9. Content Type 기반 검색 의도 > “어떻게” 질문 -->

```text
MSI-X 등록 방법
CUDA Stream 사용 방법
```

권장:

```text
Guide
Debug Note
Reference
```

초기에는 복잡한 의도 분류기를 만들 필요가 없다.

다음 세 가지 정도만 구분해도 된다.

```text
Broad Topic
Exact Identifier
Exact Error
```

---

#### 365. 64. 접근성 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57385; message: 102 (assistant); path: 64. 접근성 검사 -->

```text
Dialog accessible name
검색 입력 label
결과 수 live region
현재 선택된 결과
키보드 이동
Focus 복귀
로딩 상태
오류 상태
```

검색 결과 수를 매 키 입력마다 지나치게 읽으면 스크린리더가 피로할 수 있다.

짧은 debounce 후 상태를 알린다.

---

#### 366. 3. 권장 관계 모델

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57692; message: 104 (assistant); path: 3. 권장 관계 모델 -->

최소 관계는 다음 다섯 개다.

```text
parentTopic
prerequisites
next
related
supersededBy
```

선택적으로 다음을 추가할 수 있다.

```text
series
appliedExamples
references
```

하지만 초기에는 다섯 개면 충분하다.

---

#### 367. 24. 타입 기반 관계 추천 규칙

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58377; message: 104 (assistant); path: 24. 타입 기반 관계 추천 규칙 -->

자동 확정은 아니지만 후보 생성에 사용할 수 있다.

## Guide

추천 관계:

```text
Prerequisite:
기초 Concept

Next:
심화 Guide 또는 Source Walkthrough

Related:
Debug Note·Experiment
```

---

## Concept

```text
Prerequisite:
더 기본 Concept

Next:
적용 Guide

Related:
Debug Note
```

---

## Debug Note

```text
Prerequisite:
원리 Concept

Next:
재발 방지 Guide 또는 더 깊은 Debug

Related:
비슷한 장애 사례
```

---

## Experiment

```text
Prerequisite:
측정 대상 Concept

Next:
최적화 Guide

Related:
다른 환경의 Experiment
```

---

## Source Walkthrough

```text
Prerequisite:
Architecture Guide

Next:
특정 Subsystem 분석

Related:
실제 Debug 사례
```

---

## Reference

```text
Prerequisite:
대체로 없음

Next:
Reference를 사용하는 Guide

Related:
같은 표준의 다른 Reference
```

---

#### 368. 33. 추천 슬롯

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58664; message: 104 (assistant); path: 33. 추천 슬롯 -->

일반적인 `관련 글 6개` 대신 역할 기반 슬롯을 사용한다.

```ts
export interface ArticleRecommendationSlots {
  prerequisite?: ContentDocument;
  next?: ContentDocument;
  appliedExample?: ContentDocument;
  topic?: TopicDefinition;
}
```

관계가 없으면 해당 슬롯을 비운다.

억지로 4개를 채우지 않는다.

---

#### 369. 3. 권장 전체 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60172; message: 106 (assistant); path: 3. 권장 전체 구조 -->

```text
Breadcrumb
Article Header
Status Notice
TL;DR
Prerequisites
Table of Contents
Article Body
Conclusion
Scope & Limitations
Tested Environment / Evidence
Article Relations
Revision History
Error Report / Edit Link
Comments
```

모든 문서에 모든 섹션을 강제하지는 않는다.

콘텐츠 타입과 상태에 따라 필요한 부분만 보여준다.

---

#### 370. 권장 방향

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71492; message: 116 (assistant); path: Task 3-25. CSS 아키텍처·반응형 레이아웃·기술 문서 시각 시스템 안티패턴 > 1. 가장 흔한 근본 문제: 페이지 단위로 디자인하기 > 권장 방향 -->

페이지가 아니라 **시각적 역할**을 먼저 정의한다.

```text
Page Container
Reading Column
Wide Content
Section Rhythm
Card Surface
Metadata
Technical Prose
```

페이지는 이 역할들을 조합한다.

---

#### 371. 84. 가로 방향 모바일 미검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73222; message: 116 (assistant); path: 84. 가로 방향 모바일 미검사 -->

모바일 가로 모드에서는 높이가 작아 Sticky Header와 Modal이 화면을 거의 차지할 수 있다.

검색 Dialog·Menu·TOC를 Landscape에서도 점검한다.

---

#### 372. 101. 권장 Visual Canary

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73452; message: 116 (assistant); path: 101. 권장 Visual Canary -->

```text
1. Home
2. Topic Hub
3. 긴 Concept
4. 코드가 많은 Source Walkthrough
5. 표·그래프 Experiment
6. Historical Article
7. Search Dialog
8. 404
```

각각 모든 Viewport를 검사할 필요는 없다.

변화 위험이 큰 조합을 고른다.

---

#### 373. 권장 계층

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73970; message: 118 (assistant); path: Task 3-26. 테스트 아키텍처·회귀 방지·품질 게이트 안티패턴 > 1. 모든 검증을 E2E 테스트로 해결 > 권장 계층 -->

```text
순수 함수
→ Unit Test

콘텐츠 집합 규칙
→ Domain·Manifest Test

생성 파일 계약
→ Artifact Integration Test

페이지 구조
→ HTML Test

핵심 사용자 흐름
→ Browser Smoke Test

시각 변화
→ 선별 Visual Regression
```

---

#### 374. 28. 빈 문자열과 공백 입력 미검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:74662; message: 118 (assistant); path: 28. 빈 문자열과 공백 입력 미검사 -->

다음은 서로 다를 수 있다.

```text
""
" "
"\n"
"　"
```

Metadata 정규화에서 모두 적절히 처리되는지 확인한다.

특히:

```text
description
alias
relation ID
heading text
```

에서 빈 값이 남지 않게 한다.

---

#### 375. 61. Bundle Size가 작아졌는지만 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75318; message: 118 (assistant); path: 61. Bundle Size가 작아졌는지만 검사 -->

전체 JS가 작아도 모든 페이지에 불필요하게 로드되면 문제다.

페이지 유형별로 측정한다.

```text
Home
Topic
Article
Search
```

Article에는 Search Runtime이 없고, Search를 열 때만 로드되는지 확인한다.

---

#### 376. 91. Structured Data JSON-LD를 문자열 포함으로만 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75815; message: 118 (assistant); path: 91. Structured Data JSON-LD를 문자열 포함으로만 검사 -->

JSON-LD를 Parse해 Schema의 필수 필드와 실제 표시 값의 일치를 검사한다.

```text
headline = H1
datePublished = metadata
canonical = mainEntityOfPage
```

검색엔진 Rich Result를 보장하지는 않지만 명백한 불일치는 막을 수 있다.

---

#### 377. 100. 추천 디렉터리

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76015; message: 118 (assistant); path: 100. 추천 디렉터리 -->

```text
tests/
├── fixtures/
│   ├── content/
│   ├── markdown/
│   ├── legacy/
│   └── invalid/
│
├── unit/
│   ├── publication-policy.test.ts
│   ├── normalization.test.ts
│   ├── relations.test.ts
│   └── urls.test.ts
│
├── content/
│   ├── manifest.test.ts
│   ├── representative.test.ts
│   └── warnings.test.ts
│
├── integration/
│   ├── markdown-render.test.ts
│   ├── generated-html.test.ts
│   ├── search-index.test.ts
│   ├── sitemap.test.ts
│   └── rss.test.ts
│
├── browser/
│   ├── smoke.spec.ts
│   ├── search.spec.ts
│   ├── navigation.spec.ts
│   └── no-javascript.spec.ts
│
└── visual/
    └── canaries.spec.ts
```

파일 수는 실제 규모에 맞춰 줄여도 된다.

---

#### 378. 권장 역할 분리

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76533; message: 121 (assistant); path: 5. 카테고리와 태그가 같은 목록을 생성 > 권장 역할 분리 -->

```text
Topic Hub
→ 색인 가능한 고유 학습 페이지

Tag
→ 세부 필터, 대체로 noindex

Category
→ Topic으로 통합하거나 제거
```

세 시스템을 모두 공개 SEO 페이지로 유지하지 않는다.

---

#### 379. 신판 발행 시 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:77579; message: 121 (assistant); path: 39. 내부 링크가 구판으로 계속 향함 > 신판 발행 시 검사 -->

```text
본문 내부 링크
Topic Hub
Featured
관련 글
검색 Alias
Sitemap
RSS
```

를 신판 중심으로 바꾼다.

---

#### 380. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:77807; message: 121 (assistant); path: 47. 문서 수를 늘리기 위해 키워드별 페이지 생성 > 권장 -->

```text
하나의 강한 Concept Guide
+
독립적인 Experiment
+
독립적인 Debug Note
```

문서 타입과 검색 목적이 다를 때만 분리한다.

---

#### 381. 92. 재신청 전 대표 URL 수동 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:78932; message: 121 (assistant); path: 92. 재신청 전 대표 URL 수동 검사 -->

자동 점수보다 직접 확인한다.

각 대표 URL에서 질문한다.

```text
이 페이지 하나만 검색 결과에서 봐도 가치가 있는가?
제목이 약속한 질문을 충분히 해결하는가?
직접 경험 또는 독창적 분석이 있는가?
현재 상태와 환경을 알 수 있는가?
다음 읽기 경로가 있는가?
광고가 없어도 완성된 페이지인가?
```

10~20개 대표 URL 모두 만족하도록 한다.

---

#### 382. 93. 재신청 전 약한 URL 수동 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:78951; message: 121 (assistant); path: 93. 재신청 전 약한 URL 수동 검사 -->

무작위로 다음을 연다.

```text
Tag 5개
Archive 3개
오래된 글 10개
짧은 글 10개
검색·404
```

심사자가 대표 글만 볼 것이라고 가정하지 않는다.

어느 경로로 들어가도:

```text
빈 화면
공사 중
광고 중심
내용 없는 목록
```

이 나오지 않게 한다.

---

### 기타

#### 383. 권장 도입부

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:3037; message: 19 (assistant); path: 3. 문서의 목적이 초반에 드러나지 않는 문제 > Delayed Value Proposition > 권장 도입부 -->

```markdown

#### 384. 권장 종료 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:3495; message: 19 (assistant); path: 14. 글의 종료 지점이 없는 문제 > Abrupt Ending > 권장 종료 구조 -->

```text
핵심 결론
적용 가능한 상황
적용하면 안 되는 상황
남은 한계
다음에 읽을 글
```

예:

```markdown

#### 385. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4318; message: 22 (assistant); path: 6. 다섯 번째 핵심 안티패턴 > 발생 가능한 비용 > 권장 -->

코드 블록을 역할별로 분리한다.

```text
source code → syntax highlighting
shell command → lightweight highlighting
log/output → plain text
register dump → plain monospace
diagram text → no Shiki
```

코드 블록 수가 많을수록 “모든 `<pre>`를 프로그래밍 언어로 처리”하는 관행이 큰 비용이 된다.

---

#### 386. 모든 생성·검사를 하나의 build에 묶음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:11621; message: 38 (assistant); path: Task 2-4. Performance & Build Anti-patterns > P-03. Build Pipeline Monolith > 모든 생성·검사를 하나의 build에 묶음 -->

```text
OG
Search
RSS
Sitemap
Links
Series
Images
Freshness
Style
```

를 한 명령에서 처리한다.

#### 387. typo 수정에도 전체 중복 분석·신선도 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:12480; message: 38 (assistant); path: GitHub Actions and CI > P-59. Heavy Audit on Every Commit > typo 수정에도 전체 중복 분석·신선도 검사 -->

<!-- empty source section -->

#### 388. 작은 검사도 모든 파일 탐색

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16394; message: 45 (assistant); path: Scripts and Tooling > M-25. Full Repository Scan for Every Command > 작은 검사도 모든 파일 탐색 -->

<!-- empty source section -->

#### 389. 문체 검사로 모든 문장을 같은 톤으로 만듦

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:21246; message: 52 (assistant); path: 집필 > G-24. Tone Uniformity by Automation > 문체 검사로 모든 문장을 같은 톤으로 만듦 -->

<!-- empty source section -->

#### 390. K-12. Relation Type Explosion

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24542; message: 56 (assistant); path: 관계 모델 > K-12. Relation Type Explosion -->

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

#### 391. 관계 종류가 지나치게 많음

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24544; message: 56 (assistant); path: 관계 모델 > K-12. Relation Type Explosion > 관계 종류가 지나치게 많음 -->

```text
loosely-related
somewhat-related
conceptually-precedes
implementation-example-of
```

#### 392. 첫 번째 결과만 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26517; message: 58 (assistant); path: 검색 품질 테스트 > T-40. Rank-One-Only Evaluation > 첫 번째 결과만 검사 -->

<!-- empty source section -->

#### 393. Chromium만 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26633; message: 58 (assistant); path: 시각 회귀 테스트 > T-49. Visual Test on One Browser > Chromium만 검사 -->

<!-- empty source section -->

#### 394. `aria-label` 존재 여부만 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26821; message: 58 (assistant); path: 접근성 테스트 > T-64. Screen Reader Label Snapshot > `aria-label` 존재 여부만 검사 -->

<!-- empty source section -->

#### 395. meta description 글자 수만 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26889; message: 58 (assistant); path: 콘텐츠 품질 테스트 > T-69. Description Length as Quality > meta description 글자 수만 검사 -->

<!-- empty source section -->

#### 396. 검사 결과를 바로 수정

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30201; message: 62 (assistant); path: 구현 과정 > D-63. Automatic Fix by Default > 검사 결과를 바로 수정 -->

<!-- empty source section -->

#### 397. 실험·디버깅 글 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32925; message: 68 (assistant); path: C-03. 최소 metadata schema 도입 > 필수와 선택 > 실험·디버깅 글 권장 -->

```text
lastVerified
testedWith
```

#### 398. 권장 방법

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34199; message: 70 (assistant); path: D-06. 오류 메시지 검색 지원 > 권장 방법 -->

본문에서 명시적으로 표시된 오류 블록만 추출한다.

```md
```text title="Error"
failed to load xclbin
```
```

또는 front matter:

```yaml
errorMessages:
  - failed to load xclbin
```

#### 399. 권장 명령

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35036; message: 72 (assistant); path: E-02. 빌드 명령 역할 분리 > 권장 명령 -->

```text
dev
check
build
build:release
audit
```

#### 400. 권장 구조

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35799; message: 72 (assistant); path: E-15. 다이어그램 파이프라인 격리 > 권장 구조 -->

```text
diagram source
→ 별도 generate command
→ optimized SVG
→ 일반 Astro build가 SVG 사용
```

#### 401. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35987; message: 72 (assistant); path: E-19. 동일 작업의 Job 간 중복 제거 > 권장 -->

```text
validation
+
한 번의 release build
+
artifact 기반 smoke test·deploy
```

필요한 경우 validation job는 작은 fixture 또는 manifest 검사만 수행한다.

#### 402. 검사 항목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36157; message: 72 (assistant); path: E-23. 대표 복잡도 페이지 Canary 선정 > 검사 항목 -->

```text
HTML 크기
DOM node 수
render 시간
모바일 스크롤
코드 가로 overflow
TOC 길이
```

#### 403. 자동 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36799; message: 75 (assistant); path: F-04. Canonical URL 전수 검증 > 권장 원칙 > 자동 검사 -->

```text
canonical 존재
absolute HTTPS URL
production origin
자기 URL 또는 허용된 중복 대상
canonical target가 indexable
redirect chain 없음
```

#### 404. 검사 대상

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37483; message: 75 (assistant); path: F-18. 제목과 Description 감사 > 검사 대상 -->

```text
제목 중복
설명 중복
너무 일반적인 제목
키워드 나열형 제목
자동 생성 첫 문장 description
빈 description
```

#### 405. 검사할 것

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37693; message: 75 (assistant); path: F-22. 광고 없는 상태에서 사이트 감사 > 검사할 것 -->

```text
광고 코드 없이 레이아웃 정상
빈 광고 슬롯 없음
Auto Ads 관련 이전 설정 없음
실험용 광고 placeholder 없음
```

#### 406. 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37842; message: 75 (assistant); path: F-25. 광고 슬롯 CLS 방지 > 검사 -->

```text
모바일 CLS
광고 로드 실패
광고 차단기 사용
느린 네트워크
화면 회전
```

#### 407. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38557; message: 77 (assistant); path: Secret과 환경변수 > G-08. Secret 전달 범위 축소 > 권장 -->

```yaml
- name: Perform required operation
  env:
    TOKEN: ${{ secrets.SOME_TOKEN }}
  run: ./scripts/required-operation.sh
```

필요한 한 step에만 전달한다.

#### 408. 권장 방식

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38923; message: 77 (assistant); path: 외부 스크립트와 개인정보 > G-18. 댓글 지연 로딩 > 권장 방식 -->

```text
댓글 영역이 viewport에 가까워짐
또는
사용자가 댓글 열기 선택
→ Giscus 로드
```

#### 409. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39138; message: 77 (assistant); path: CSP와 브라우저 보안 > G-23. `innerHTML`과 검색 Highlight 감사 > 권장 -->

텍스트는 `textContent`로 삽입하고, highlight는 DOM node를 나눠 만든다.

나쁜 예:

```ts
result.innerHTML = text.replace(query, `<mark>${query}</mark>`);
```

개선 방향:

```ts
function appendHighlightedText(
  container: HTMLElement,
  text: string,
  query: string,
): void {
  // Match ranges, then append Text and <mark> nodes.
}
```

#### 410. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39197; message: 77 (assistant); path: CSP와 브라우저 보안 > G-24. Raw HTML 허용 정책 > 권장 -->

Raw HTML 사용 위치를 먼저 집계하고, 기능별 컴포넌트나 directive로 대체한다.

```text
YouTube embed
callout
diagram
details
```

#### 411. 권장 방식

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39381; message: 77 (assistant); path: 민감 정보 노출 > G-28. 민감 파일 Artifact Allowlist > 권장 방식 -->

금지 목록만 두기보다 허용된 public 자산 경로를 명확히 한다.

#### 412. 검사 대상

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40004; message: 79 (assistant); path: H-05. Relation Integrity 검사 > 검사 대상 -->

```text
parent
prerequisites
next
related
supersedes
```

#### 413. Cycle 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40025; message: 79 (assistant); path: H-05. Relation Integrity 검사 > Cycle 검사 -->

특히 다음 관계는 cycle이 없어야 한다.

```text
supersedes
next
필수 prerequisite
```

`related`는 양방향 또는 cycle이 있어도 괜찮다.

#### 414. 집합 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40149; message: 79 (assistant); path: H-08. Publication Set 일치 검사 > 집합 검사 -->

예:

```text
renderedCurrentArticles
searchCurrentArticles
sitemapCurrentArticles
```

를 비교한다.

#### 415. 검사할 실패

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40223; message: 79 (assistant); path: H-09. Production Build 통합 테스트 > 검사할 실패 -->

```text
unknown syntax grammar
생성 asset 누락
잘못된 base path
JSON serialization 오류
duplicate route
Markdown transformation 오류
```

#### 416. 기본 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40253; message: 79 (assistant); path: H-10. 최종 `dist` 구조 검사 > 기본 검사 -->

```text
HTML 파일 수
예상하지 못한 확장자
숨김 파일
.env
backup 파일
source map
admin bundle
secret pattern
```

#### 417. 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40421; message: 79 (assistant); path: H-13. 구조화 데이터 검사 > 검사 -->

```text
유효 JSON-LD
페이지 내용과 일치
canonical 일치
author 일치
날짜 일치
Breadcrumb URL 일치
```

#### 418. 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40676; message: 79 (assistant); path: H-18. 모바일 Viewport Smoke Test > 검사 -->

```text
가로 페이지 overflow
코드 버튼 겹침
표 잘림
Hero 과대 점유
Header 높이
TOC overlay
긴 영문 identifier
touch target
```

#### 419. 자동 검사 가능 항목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40689; message: 79 (assistant); path: H-18. 모바일 Viewport Smoke Test > 자동 검사 가능 항목 -->

```javascript
document.documentElement.scrollWidth <= window.innerWidth
```

하지만 의도적인 코드·표 내부 가로 스크롤은 허용한다.

페이지 전체 viewport만 확장되지 않게 한다.

#### 420. 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40781; message: 79 (assistant); path: H-20. 코드 블록 회귀 검사 > 검사 -->

```text
강제 wrap 여부
가로 스크롤
복사 결과 원문 일치
복사 버튼 겹침
line number alignment
다크모드 대비
```

#### 421. 검사 방법

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41056; message: 79 (assistant); path: H-26. 광고 제외 페이지 회귀 검사 > 검사 방법 -->

최종 HTML에서 광고 script와 slot markup 존재 여부를 확인한다.

#### 422. 권장 제목

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44006; message: 85 (assistant); path: 5. Start Here > 5.3 CXL 메모리 전체 Guide > 권장 제목 -->

```text
CXL 메모리는 호스트 주소 공간에 어떻게 연결되는가
```

#### 423. 권장 하위 분류

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44332; message: 85 (assistant); path: 9. Debug & Experiments > 권장 하위 분류 -->

```text
BAR & MMIO Failures
Interrupt Limitations
DMA & VFIO
CXL Enumeration
```

---

#### 424. ① Linux Kernel은 어떻게 구성되어 있는가

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:46570; message: 92 (assistant); path: 9. 반드시 작성하면 좋은 대표 글 > ① Linux Kernel은 어떻게 구성되어 있는가 -->

사이트의 Linux 입문 Guide.

---

#### 425. 관계 배열은 `undefined`보다 빈 배열 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50674; message: 98 (assistant); path: 12. 선택 필드와 필수 필드의 경계 > 관계 배열은 `undefined`보다 빈 배열 권장 -->

```ts
relations: {
  prerequisites: [],
  next: [],
  related: [],
}
```

이렇게 하면 모든 Query가 null check를 반복하지 않는다.

---

#### 426. 26. 중복 ID 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51299; message: 98 (assistant); path: 26. 중복 ID 검사 -->

```ts
export function validateUniqueIds(
  documents: readonly ContentDocument[],
): ValidationIssue[] {
  const seen =
    new Map<string, ContentDocument>();

  const issues: ValidationIssue[] = [];

  for (const document of documents) {
    const previous =
      seen.get(document.id);

    if (!previous) {
      seen.set(document.id, document);
      continue;
    }

    issues.push({
      ruleId: "content/duplicate-id",
      severity: "error",
      documentId: document.id,
      sourcePath: document.sourcePath,
      message:
        `Duplicate content ID "${document.id}". ` +
        `Already used by ${previous.sourcePath}.`,
    });
  }

  return issues;
}
```

---

#### 427. 27. 중복 URL 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51336; message: 98 (assistant); path: 27. 중복 URL 검사 -->

```ts
export function validateUniqueUrls(
  documents: readonly ContentDocument[],
): ValidationIssue[] {
  const seen =
    new Map<string, ContentDocument>();

  const issues: ValidationIssue[] = [];

  for (const document of documents) {
    const previous =
      seen.get(document.url);

    if (!previous) {
      seen.set(document.url, document);
      continue;
    }

    issues.push({
      ruleId: "content/duplicate-url",
      severity: "error",
      documentId: document.id,
      sourcePath: document.sourcePath,
      message:
        `Duplicate URL "${document.url}". ` +
        `Also generated by ${previous.id}.`,
    });
  }

  return issues;
}
```

---

#### 428. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60397; message: 106 (assistant); path: 10. TL;DR 적용 기준 > 권장 -->

```text
Guide
Concept
Source Walkthrough
긴 Debug Note
```

#### 429. 권장 표시 조건

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60475; message: 106 (assistant); path: 13. Table of Contents > 권장 표시 조건 -->

```text
H2가 3개 이상
또는
본문이 충분히 긴 경우
```

짧은 글에 TOC를 넣으면 본문보다 탐색 UI가 커진다.

---

#### 430. 33. Heading만 읽기 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63310; message: 108 (assistant); path: 33. Heading만 읽기 검사 -->

본문을 접고 Heading만 읽어본다.

Heading이 다음과 같은 논리 흐름을 보여야 한다.

```text
문제
→ 동작 모델
→ 실제 흐름
→ 예외
→ 결론
```

다음처럼 보이면 개선이 필요하다.

```text
개요
상세
추가
기타
결론
```

---

#### 431. 34. 중복 문단 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63336; message: 108 (assistant); path: 34. 중복 문단 검사 -->

기술 글은 같은 개념을 서론, 본문, 결론에서 반복하기 쉽다.

각 반복은 역할이 달라야 한다.

```text
서론:
문제와 중요성

본문:
근거와 동작

결론:
실무 판단
```

동일 문장을 표현만 바꾸어 세 번 쓰지 않는다.

---

#### 432. 39. 자동 문장 검사를 Error로 만들지 않기

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63457; message: 108 (assistant); path: 39. 자동 문장 검사를 Error로 만들지 않기 -->

문장 스타일은 문맥 의존성이 높다.

따라서:

```text
ERROR
```

가 아니라:

```text
INFO 또는 WARNING
```

으로 사용한다.

사람이 최종 판단한다.

---

#### 433. 40. Dead Code 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:68379; message: 112 (assistant); path: 40. Dead Code 검사 -->

자동 도구로 다음 후보를 찾을 수 있다.

```text
사용되지 않는 Export
사용되지 않는 파일
사용되지 않는 Dependency
접근 불가능한 Page
사용하지 않는 CSS Selector
```

다만 Astro의 동적 import와 파일 기반 Routing 때문에 오탐이 있을 수 있다.

자동 삭제하지 않고 후보 Report로 사용한다.

---

#### 434. 권장 책임 분리

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71550; message: 116 (assistant); path: 2. 전역 CSS와 Scoped CSS의 책임이 불분명 > 권장 책임 분리 -->

```text
Global
→ Reset, Token, 기본 Document 설정

Layout
→ Page width, Grid, major regions

Component
→ 컴포넌트 내부 표현

Prose
→ Markdown 본문 요소

Utility
→ 소수의 반복적인 단일 목적
```

Markdown 본문 Typography를 일반 Component CSS와 섞지 않는다.

---

#### 435. 85. Browser Zoom 미검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73230; message: 116 (assistant); path: 85. Browser Zoom 미검사 -->

200% Zoom에서:

```text
Header 겹침
Navigation 잘림
TOC 고정
Modal 버튼 접근 불가
```

가 발생할 수 있다.

반응형 검사는 Pixel Width뿐 아니라 Zoom과 Text 확대도 포함한다.

---

#### 436. 100. Visual Regression이 Home만 검사

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73432; message: 116 (assistant); path: 100. Visual Regression이 Home만 검사 -->

Home은 카드와 Hero가 중심이다.

실제 CSS 문제는 다음에서 더 많이 발생한다.

```text
긴 Article
Code
Table
Historical Notice
Search Dialog
모바일 Menu
Print
```

대표 Canary 페이지를 선정한다.

---

#### 437. 권장

<!-- source: archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:77156; message: 121 (assistant); path: 24. 본문보다 광고가 먼저 보임 > 권장 -->

```text
제목
Description
핵심 내용 또는 TL;DR
본문
논리 단위 종료 후 광고 후보
```

광고를 넣기 위해 내용을 인위적으로 쪼개지 않는다.

---

