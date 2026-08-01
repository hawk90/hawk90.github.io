---
title: "ChatGPT - 기술 포트폴리오 안티패턴"
source: "archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/page.html"
archived_at: 2026-08-01T07:38:34.968Z
---

# ChatGPT - 기술 포트폴리오 안티패턴

## 1. user

hawk90.github.com 기술 스택 보고 저번처럼 보편적인 안티패턴 확인 해줄수 있어? github에 코드도 있긴해

## 2. user

Original custom instructions no longer available

## 3. assistant

사이트와 GitHub 저장소를 함께 보면서, 특정 버그보다는 **기술 스택·아키텍처·운영 관점의 보편적 안티패턴**으로 정리해볼게요. 저장소가 여러 개면 대표 프로젝트 중심으로 공통 패턴도 묶겠습니다.

## 4. assistant

가능해. `hawk90.github.com`이 아니라 **`hawk90.github.io`와 GitHub 계정 `github.com/hawk90`** 기준으로 보면 돼.

현재 공개 프로필에는 10개 저장소가 있고, 대표적으로 다음 축이 보여. citeturn742560view0

- **Rust 프레임워크:** `revue`
- **CUDA/C++ 학습 및 예제:** `CUDA_code`, `The-CPP-Programming-Language`
- **C 시스템 코드:** `cicflow`
- **프런트엔드·문서 도구:** Slidev 테마
- **기술 블로그:** `hawk90.github.io`

이번에는 특정 코드의 `unwrap()`이나 함수 길이를 지적하는 리뷰보다는, **hawk90 전체 기술 포트폴리오에서 반복될 가능성이 있는 보편적 안티패턴**을 뽑는 방식이 적합해 보여.

## 우선 눈에 띄는 핵심 위험

### 1. 프로젝트가 아니라 “기술 박람회”가 되는 문제

`revue`만 봐도 CSS 엔진, reactive signal, layout, 100개 이상의 widget, animation, worker pool, hot reload, devtools, profiler, snapshot test, plugin, CLI, macro, tree-sitter까지 포함하고 있어. citeturn742560view2

개별 기능은 매력적이지만 전체적으로는 다음 위험이 있어.

> 핵심 문제를 해결하기 전에 프레임워크가 웹 프런트엔드 생태계 전체를 재구현한다.

안티패턴으로 표현하면:

- **Framework-as-a-Feature-Checklist**
- **One-Person Platform Engineering**
- **Premature Ecosystem Construction**
- **Horizontal Expansion Before Vertical Completion**
- **Feature Count as Product Maturity**

특히 `100+ widgets`는 장점인 동시에 경고 신호야. citeturn742560view2  
실사용자가 중요하게 보는 건 위젯 개수보다 다음이거든.

- 입력과 포커스가 깨지지 않는가
- resize, Unicode, IME, mouse가 일관적인가
- async 작업 중 UI가 멈추지 않는가
- 큰 테이블과 로그를 안정적으로 처리하는가
- API가 버전업에도 유지되는가

즉 **breadth가 depth를 가리는 구조**가 가장 먼저 검사할 대상이야.

---

### 2. 기술 선택의 목적보다 “내가 만들 수 있는 것”이 앞서는 문제

전체 저장소를 보면 Rust, C++, CUDA, C, Slidev, 블로그 생성기까지 기술적 범위가 넓어.

이 자체는 강점이지만 포트폴리오 관점에서는 다음처럼 보일 수 있어.

> 어려운 기반 기술은 많이 만들었지만, 어떤 사용자의 어떤 문제를 해결했는지는 흐릿하다.

대표적인 안티패턴:

- **Technology-First Product Design**
- **Architecture Without a Customer**
- **Infrastructure Before Application**
- **Portfolio Fragmentation**
- **Capability Demonstration Without Outcome**

예를 들어 `revue`의 설명은 “Vue처럼 TUI를 만든다”는 기술적 메시지는 명확하지만, **누가 왜 Ratatui·Cursive·Textual 대신 사용해야 하는가**는 상대적으로 약해. 현재 README도 기능 비교가 중심이다. citeturn742560view2

---

### 3. 직접 구현 범위가 지나치게 넓어지는 NIH

Revue에는 자체 reactive runtime, CSS parser·style system, layout, widget tree, animation, worker pool, plugin, macro, CLI, tree-sitter 문법까지 존재해. 저장소 구조에도 별도 CLI, macro crate, theme builder, tree-sitter parser가 확인된다. citeturn742560view2

여기서는 단순히 “외부 라이브러리를 써라”가 아니라 다음 경계를 검사해야 해.

- 이 기능이 Revue의 **차별화 핵심**인가
- 아니면 유지보수만 늘리는 **기반시설**인가
- 표준이나 기존 생태계와의 호환성이 중요한 부분인가
- 직접 구현 때문에 프로젝트가 다른 문제를 해결하지 못하고 있는가

안티패턴 후보:

- **Not-Invented-Here by Default**
- **Owning Every Layer**
- **Dependency Avoidance at Any Cost**
- **Custom Runtime Proliferation**
- **Parser Inside Every Project**
- **Framework Within a Framework**

특히 CSS를 지원한다면서 자체 CSS의 작은 부분집합을 만들면, 시간이 지나면서 사용자가 “CSS처럼 보이지만 CSS가 아닌 언어”를 학습해야 하는 문제가 생겨.

---

### 4. 웹 UI 모델을 TUI에 그대로 이식하는 문제

Revue의 방향은 Vue 스타일 signal, effect, CSS, flex/grid, hover, animation이야. citeturn742560view2

그러나 TUI는 브라우저와 제약이 다르기 때문에 단순 복제는 위험해.

- terminal cell은 픽셀이 아님
- Unicode 폭이 균일하지 않음
- hover가 항상 존재하지 않음
- terminal capability가 다름
- frame budget과 draw cost가 민감함
- 접근성 모델이 DOM과 다름
- 입력 처리가 terminal emulator마다 다름

따라서 다음 안티패턴을 확인해야 해.

- **Web Metaphor Leakage**
- **Browser Architecture Without a Browser**
- **CSS Semantics Without CSS Compatibility**
- **Reactive Everything**
- **DOM Thinking in a Cell Grid**
- **Animation Without Terminal Capability Negotiation**

이건 기술 선택이 틀렸다는 뜻은 아니야. 다만 **웹의 개발 경험은 가져오되, 웹의 런타임 복잡성까지 가져오면 안 된다**는 의미야.

---

### 5. 반응형 상태의 숨은 비용

Signal/Computed/Effect 구조는 사용성은 좋지만 프레임워크 내부에서는 다음 문제가 발생하기 쉬워.

- effect 의존성의 암시적 연결
- update 순서 의존성
- cascading invalidation
- 필요 이상의 redraw
- signal clone과 내부 `Rc`/`Arc`
- 이벤트 중 재진입
- effect가 effect를 변경하는 순환
- 구독 해제 누락
- 테스트에서 전역 reactive context 오염

안티패턴:

- **Invisible Dependency Graph**
- **Effect as Business Logic**
- **Reactive State Everywhere**
- **Whole-Tree Invalidations**
- **Subscription Lifetime Ambiguity**
- **Runtime Borrow Checking by Interior Mutability**
- **Clone-to-Satisfy-the-Borrow-Checker**

이 부분은 실제 코드에서 `Rc<RefCell<_>>`, `Arc<Mutex<_>>`, signal cloning, effect 등록 및 dispose 경로를 보면 구체적으로 확인할 수 있어.

---

### 6. retained UI와 builder DSL의 메모리·할당 비용

README 예제처럼 매 render마다 `vstack()`, `Text::new(format!(...))`, `.child()` 체인을 생성한다면, API는 retained처럼 보이면서 내부적으로는 매 프레임 UI 트리를 다시 구성할 가능성이 있어. citeturn742560view2

확인해야 할 부분은:

- 매 프레임 heap allocation 수
- `String` 및 style clone 수
- widget trait object 사용
- tree diff가 실제로 존재하는지
- 모든 widget을 다시 layout하는지
- text shaping과 wrapping cache가 있는지
- off-screen widget도 계산하는지

안티패턴 후보:

- **Retained API, Immediate Cost**
- **Allocation-Driven Rendering**
- **Builder Chain Allocation Storm**
- **Virtual DOM Without Measured Benefit**
- **Clone-Based Component Composition**
- **Full Layout on Every Keystroke**
- **Formatting in the Render Loop**

---

### 7. 거대한 public API 표면

100개 이상의 위젯과 다양한 subsystem을 제공하면 public API가 매우 빠르게 커져. citeturn742560view2

그 결과:

- 내부 구조를 바꾸기 어려움
- 사용자 코드가 세부 타입에 결합됨
- feature 간 조합 테스트가 폭발함
- 문서와 실제 동작이 어긋남
- semantic versioning을 지키기 어려움
- 이름만 다른 유사 widget이 증가함

안티패턴:

- **Public API Surface Explosion**
- **Widget-per-Variation**
- **Convenience API Accumulation**
- **Re-export Everything Prelude**
- **Stability Promise Before Architecture Stability**
- **SemVer Paralysis**

`STABILITY.md`가 별도로 있다는 것은 안정성을 의식하고 있다는 좋은 신호지만, 동시에 이미 API 안정성 관리가 핵심 과제라는 의미이기도 해. citeturn742560view2

---

### 8. 문서의 완성도와 구현 완성도가 혼동되는 문제

현재 저장소는 README, 튜토리얼, 가이드, 아키텍처, 성능, 접근성, 비교표까지 문서 구성이 매우 풍부해. citeturn742560view2

하지만 대형 개인 프로젝트에서는 흔히 다음 현상이 생겨.

> 설명된 시스템이 실제로 검증된 시스템보다 훨씬 앞서간다.

확인할 안티패턴:

- **Documentation-Led Illusion of Maturity**
- **README-Driven Development**
- **Feature Exists Because a Guide Exists**
- **Example-Only Correctness**
- **Happy-Path Documentation**
- **Comparison Table Overconfidence

## 5. user

누가 지금 저장소 알아보라고 했어? github.io 페이지에 대해서 안티패턴 만들어 달라고 한건데

## 6. assistant

맞아. 내가 범위를 잘못 잡았어. **GitHub 저장소가 아니라 `hawk90.github.io` 사이트 자체의 기술 스택·구조·운영 안티패턴**을 봐야 했어. 지금부터는 블로그/사이트 기준으로만 보겠다.

## 7. assistant

맞아. 내가 완전히 잘못 이해했어.

네 요청은 **`hawk90.github.io` 기술 블로그 자체**를 보고,

- 현재 사용한 정적 사이트 기술 스택
- 정보 구조와 콘텐츠 구조
- 프런트엔드 구성
- 빌드·배포·검색·SEO
- 장기 유지보수
- 블로그 운영 방식

에서 발생할 수 있는 **보편적인 안티패턴 목록**을 만들어 달라는 거였어. GitHub의 다른 프로젝트나 `revue` 저장소 분석은 이번 범위가 아니야.

현재 페이지에서 확인되는 방향도 `Hawk .dev`, `Systems Notes`, 최근 글 카드, 태그와 읽기 시간 중심의 개발자 블로그 구조다. 따라서 다음처럼 정리하는 게 맞아. citeturn407567view0

## 분석 범위

### 1. 기술 스택 안티패턴
예를 들면:

- 정적 블로그에 과도한 클라이언트 JavaScript
- React hydration이 필요 없는 영역까지 전부 hydration
- Astro·Next.js·MDX·Tailwind·검색 엔진을 무리하게 중첩
- 블로그인데 앱 수준의 상태관리 도입
- 테마 구성요소가 콘텐츠 모델을 지배
- 빌드 시점 플러그인 의존성 폭증
- 최신 프레임워크 기능을 쓰기 위한 잦은 마이그레이션
- GitHub Pages의 제약을 애플리케이션 코드로 우회

### 2. 콘텐츠 아키텍처 안티패턴

- 카테고리와 태그가 사실상 같은 역할
- 시리즈·카테고리·태그·컬렉션이 중복
- URL이 글의 분류 체계에 과도하게 결합
- front matter가 거대한 데이터베이스 스키마가 됨
- 글마다 제각각인 metadata
- 동일 주제가 여러 시리즈에 분산
- 기술 분야가 넓어 블로그 정체성이 흐려짐
- 연속 글은 많지만 진입점과 학습 경로가 없음

현재 홈에서 Bootloader, UEFI, CXL 관련 글이 비슷한 날짜에 연속적으로 노출되는데, 이 경우 개별 글 수는 많아 보여도 방문자 입장에서는 **어디서부터 읽어야 하는지** 알기 어려워질 수 있어. citeturn407567view0

### 3. UI·UX 안티패턴

- 홈 화면이 단순 최신 글 나열에 머묾
- 글 제목·요약·태그가 지나치게 길어 카드 스캔이 어려움
- 모든 글의 시각적 우선순위가 동일
- 전문 분야별 진입점 부재
- 모바일에서 긴 기술 제목이 카드 대부분을 점유
- 글 목록은 풍부하지만 탐색은 시간순에 의존
- 검색이 있지만 필터링은 약한 구조
- 다크모드가 디자인의 핵심처럼 과대평가됨
- 애니메이션과 장식이 읽기 흐름을 방해
- 태그 배지가 지나치게 많아 시각적 노이즈가 됨

### 4. 성능 안티패턴

- 정적 사이트인데 초기 JavaScript 번들이 큼
- syntax highlighting을 런타임에 수행
- 모든 코드 블록 언어를 번들에 포함
- 검색 인덱스 전체를 최초 로딩
- 글 목록 전체를 DOM에 렌더링
- 폰트 종류와 굵기가 지나치게 많음
- 홈의 decorative image가 LCP를 차지
- 이미지 크기와 포맷 최적화 부재
- Mermaid·MathJax·댓글 시스템을 모든 페이지에 로드
- SPA 전환을 위해 오히려 정적 페이지보다 복잡해짐

### 5. SEO·검색 안티패턴

- 제목이 지나치게 길어 검색결과에서 잘림
- 한글·영문 키워드를 모두 넣으려다 제목이 부자연스러움
- 각 글의 description이 본문 첫 문장 복사
- 시리즈 글끼리 검색 의도를 잠식
- 유사한 CXL·Bootloader 글이 keyword cannibalization을 일으킴
- 태그 페이지가 얕은 중복 페이지로 색인
- canonical URL 관리 누락
- 오래된 글의 수정일과 작성일 혼동
- 코드 중심 글에 구조화 데이터가 없음
- 기술적으로 깊지만 독자가 검색할 표현과 제목이 다름

### 6. 유지보수 안티패턴

- 테마 fork 후 upstream 업데이트 불가
- 디자인 토큰 없이 CSS 값을 직접 반복
- 컴포넌트 수는 많지만 공통 인터페이스가 없음
- Markdown 안에 HTML·JSX가 과다하게 섞임
- 콘텐츠가 특정 프레임워크 문법에 종속
- 빌드 도구 교체 시 모든 글을 수정해야 함
- 플러그인 버전 충돌을 lockfile로만 억제
- GitHub Actions workflow가 배포·검증·콘텐츠 생성을 모두 담당
- 깨진 링크 검사가 없음
- 오래된 기술 글의 상태 표시가 없음

## 이 사이트에서 특히 중요하게 볼 부분

이 블로그는 일반적인 일상 블로그가 아니라 **C++, 임베디드, 부트로더, CXL, 시스템 프로그래밍 지식을 축적하는 기술 아카이브**에 가까워. 홈에서도 그런 정체성을 명시하고 있다. citeturn407567view0

따라서 가장 위험한 안티패턴은 예쁜 UI 부족이 아니라 다음 세 가지야.

1. **많은 글이 있지만 지식 체계가 없는 것**
2. **콘텐츠보다 사이트 프레임워크가 복잡해지는 것**
3. **검색 유입용 개별 글은 많지만 대표 저작물이 없는 것**

즉 이번 분석은 “Astro가 나쁜가, React가 나쁜가” 수준이 아니라,

> 지금 구조가 500개 글에서 1,000개, 2,000개로 늘어났을 때도 기술 지식베이스로 유지되는가

를 중심으로 해야 해.

다음 답변에서는 `hawk90.github.io`만 기준으로 **기술 스택·아키텍처·UI/UX·콘텐츠·SEO·성능·운영 안티패턴을 150~200개 정도의 체크리스트 형태**로 정리하겠다. GitHub 코드는 사이트 구현을 확인하는 보조 자료로만 사용하고, 다른 프로젝트는 섞지 않을게.

## 8. user

ㅇㅇ

## 9. assistant

좋아. 이런 식으로 **"특정 구현"이 아니라 "기술 스택 자체에서 발생하는 안티패턴"** 위주로 정리해볼게. `hawk90.github.io`처럼 **Astro + Markdown + GitHub Pages + 기술 블로그** 계열에서 흔히 발생하는 것들이다.

---

# 1. Architecture

## 1. Static Site인데 SPA처럼 만듦

- React가 대부분 차지
- Hydration 과다
- Client Component 남발
- 페이지보다 App이 됨

---

## 2. Layer가 너무 많음

예)

```
Markdown
↓

MDX
↓

Remark

↓

Rehype

↓

Astro

↓

Vite

↓

Rollup

↓

GitHub Pages
```

중간 Plugin이 계속 늘어남.

---

## 3. Plugin Hell

```
remark-x
remark-y
remark-z
rehype-a
rehype-b
rehype-c
```

하나 버전 올리면 전부 깨짐.

---

## 4. Theme가 Core보다 큼

테마 수정하려고

```
100줄 수정
```

했는데

```
1000줄 override
```

되는 상황.

---

## 5. Framework Lock-in

Astro 전용 문법

```
<Component />
Astro.props
```

이 너무 많으면

다른 SSG로 못 감.

---

## 6. Content와 Rendering이 분리 안됨

Markdown 안에

```
<Component />

<ClientOnly>

<script>
```

가득.

Markdown이 Markdown이 아님.

---

## 7. Routing과 Category가 결합

```
/cpp/basic
/cpp/advanced
```

나중에

```
compiler
```

카테고리 추가하면 URL 전부 수정.

---

# 2. Build

## 8. Full Build Only

글 하나 수정해도

```
1000 페이지

전부 rebuild
```

---

## 9. Build Time Explosion

글 500개

↓

이미지

↓

검색 인덱스

↓

RSS

↓

Sitemap

↓

Tag Page

↓

Series Page

↓

TOC

↓

Feed

↓

OpenGraph

↓

Syntax Highlight

↓

20분 빌드

---

## 10. Cache 미사용

Github Action

매번

```
npm install
```

---

## 11. Incremental Build 없음

조금 수정

↓

전체 Build

---

# 3. Markdown

## 12. Front Matter Explosion

```
title

description

date

updated

draft

toc

series

author

image

icon

tags

category

difficulty

readingTime

language

...
```

Metadata가 글보다 많아짐.

---

## 13. Markdown에서 Programming

Markdown 안에

```
if

loop

component

jsx

script

```

---

## 14. HTML 남발

Markdown인데

```
<div>

<table>

<span>

```

가 대부분.

---

## 15. Custom Syntax

```
::warning

:::note

[[tabs]]

{{demo}}
```

너무 많아짐.

다른 Markdown Editor 못 씀.

---

# 4. Search

## 16. Search Index가 거대

글 1000개

↓

JSON 20MB

↓

첫 로딩 느림

---

## 17. Client Search Only

브라우저가

전부 Index 다운.

---

## 18. Search Ranking 없음

검색

```
boot
```

↓

관련 없는 글 먼저.

---

# 5. Images

## 19. 원본 PNG 그대로

5MB 이미지

↓

그대로 배포.

---

## 20. Lazy Loading 없음

홈에서

100장

전부 다운로드.

---

## 21. Responsive Image 없음

Desktop 이미지

↓

Mobile도 동일.

---

# 6. Syntax Highlight

## 22. 모든 언어 포함

```
cpp

rust

go

python

c

java

...

```

전부 Bundle.

---

## 23. Runtime Highlight

브라우저가 Highlight 수행.

---

## 24. Theme 중복

Dark

Light

둘 다 Bundle.

---

# 7. CSS

## 25. Utility Class 폭발

```
mt-2

mt-3

mt-4

...

```

의미 없음.

---

## 26. CSS Variable 없음

색상

Spacing

Radius

전부 하드코딩.

---

## 27. Component Style 중복

Card마다

```
padding

border

shadow
```

복붙.

---

# 8. SEO

## 28. 같은 Title 패턴

```
Part1

Part2

Part3

Part4

```

검색에서 구분 안됨.

---

## 29. Description 자동 생성

본문 첫 줄 복사.

---

## 30. Heading 구조 깨짐

```
H1

↓

H3

↓

H5
```

---

## 31. Canonical 없음

중복 색인.

---

# 9. Navigation

## 32. Category Explosion

```
C++

Modern C++

C++20

CPP

```

전부 따로.

---

## 33. Tag Explosion

태그

400개.

---

## 34. Series가 Category 역할

Series

Category

Tag

역할 중복.

---

# 10. Knowledge Base

이건 네 블로그에서 가장 중요.

## 35. 글은 많은데 연결이 없음

예)

```
Bootloader

UEFI

BIOS

PCIe

```

각각 따로.

---

## 36. Beginner Entry 없음

처음 오는 사람은

무엇부터 읽어야 하는지 모름.

---

## 37. Learning Path 없음

```
Part1

↓

Part2

↓

Part3
```

자동 연결 안됨.

---

## 38. 중복 설명

PCIe 설명

20개 글.

---

## 39. 용어 Dictionary 없음

CXL

PCIe

NUMA

Cache Coherency

매번 설명.

---

## 40. Reference Graph 없음

글끼리 참조 없음.

---

# 11. Performance

## 41. 모든 JS 초기 로드

안 쓰는 기능도 포함.

---

## 42. Bundle Split 안됨

홈도

글 페이지도

동일 JS.

---

## 43. Font 과다

```
Pretendard

JetBrains

Inter

Noto

```

전부 사용.

---

## 44. Icon Library 전체 포함

아이콘 하나 쓰는데

2000개 Bundle.

---

## 45. Analytics 과다

GA

GTM

Adsense

Hotjar

Clarity

전부.

---

# 12. 운영

## 46. Draft 관리 안됨

Draft도 Build.

---

## 47. Broken Link 검사 없음

예전 글 링크 깨짐.

---

## 48. 오래된 글 표시 없음

2022 글

↓

최신처럼 보임.

---

## 49. Version 정보 없음

Rust 1.60 기준인지

1.90 기준인지 모름.

---

## 50. Evergreen 전략 없음

계속 수정해야 하는 글과

역사적인 글 구분 없음.

---

# 내가 추가하고 싶은 안티패턴 (기술 블로그에서 가장 흔하지만 잘 안 다루는 것)

### 51. **Article-Oriented Architecture**
글 하나하나는 좋지만, 지식 체계는 없음.

### 52. **Framework-Centric Design**
콘텐츠보다 프레임워크가 더 중요해짐.

### 53. **Demo-Driven Components**
실사용보다 데모를 위한 컴포넌트가 많음.

### 54. **Theme Coupling**
콘텐츠가 특정 테마 구조에 종속됨.

### 55. **Navigation Debt**
글은 늘어나는데 탐색 구조는 그대로라 찾기 어려워짐.

### 56. **Content Fragmentation**
비슷한 주제가 너무 많은 짧은 글로 분산되어 독자가 전체 맥락을 잡기 어려움.

### 57. **Technology Chasing**
Astro → Next → SvelteKit → 새 프레임워크로 계속 갈아타느라 콘텐츠보다 인프라 유지에 시간을 더 쓰게 됨.

### 58. **Presentation Over Knowledge**
애니메이션, 디자인, 인터랙션은 화려하지만 실제 기술 콘텐츠의 품질 향상에는 기여하지 않음.

### 59. **Documentation Without Information Architecture**
문서는 많지만 목차, 관계, 난이도, 학습 순서가 설계되어 있지 않음.

### 60. **Knowledge Island**
각 글이 독립적인 섬처럼 존재해, 하나를 읽고 다음에 무엇을 봐야 할지 자연스럽게 이어지지 않음.

---

이 정도만 해도 일반적인 블로그 체크리스트를 넘어서 **아키텍처 리뷰 수준**이 된다. 만약 네 블로그를 장기적으로 1,000~2,000개의 시스템 프로그래밍 문서가 있는 지식베이스로 키울 생각이라면, 여기서 더 나아가 **100~150개의 'Technical Blog Architecture Anti-patterns'**를 만들어 거의 디자인 패턴 카탈로그처럼 정리해볼 수도 있다.

## 10. user

그래도 될꺼 같은데? 아마 이부분이 구글 에드센스에서 지적한 컨텐츠 내용 없음을 보완할수도 있으니깐 일단 태스크를 분리해서 너가 하려던거 하고 그거랑 내용 확인해서 컨텐츠 내용 없음 보완 계획하면 되지 않을까?

## 11. assistant

나도 그 방향이 맞다고 생각해.

다만 **"안티패턴 시리즈를 쓰면 애드센스가 붙는다"**는 식으로 접근하면 안 되고, **사이트 자체의 품질을 높이는 과정에서 결과적으로 '콘텐츠 부족' 문제를 완화할 수 있다**는 관점이 좋아.

내가 추천하는 건 **태스크를 완전히 분리**하는 거야.

---

# Task 1. Technical Blog Architecture Review

이건 **블로그를 제품(Product)** 으로 보는 작업.

목표

> "hawk90.github.io를 장기적으로 운영 가능한 기술 지식베이스로 만든다."

여기서는

- 기술스택
- Astro
- Markdown
- Build
- Search
- SEO
- UI
- Navigation
- Knowledge Base
- Performance

같은 걸 리뷰한다.

산출물은

```
Blog Architecture Review.md
```

같은 문서.

여기에

- 장점
- 문제
- 안티패턴
- 개선안

까지 작성.

이건 거의 Software Architecture Review 수준.

---

# Task 2. Technical Blog Anti-pattern Catalog

이건 내가 하려고 했던 거.

예를 들면

```
100 Technical Blog Anti-patterns
```

또는

```
150 Static Site Anti-patterns
```

처럼.

카테고리

```
Architecture

Performance

Markdown

SEO

Search

Content

UI

DX

GitHub Pages

Astro

CI/CD

Accessibility
```

이런 식.

이건 개발자들도 좋아할 만한 콘텐츠가 된다.

---

# Task 3. 실제 사이트 적용

Task2에서 나온 것들을

실제 hawk90.github.io에 대입.

예)

```
❌ Theme Lock-in

현재

⭐⭐

이유

...

개선

...
```

처럼.

즉

```
Anti-pattern

↓

현재 사이트 분석

↓

수정
```

---

# Task 4. Content Audit

이게 애드센스와 가장 관계가 깊어.

글 하나하나를 보는 게 아니라

사이트 전체를 본다.

예)

```
Bootloader

UEFI

PCIe

CXL

Compiler

Rust

Linux

```

각 분야

```
글 개수

평균 길이

중복도

깊이

Series

검색 유입

```

분석.

---

# Task 5. Knowledge Graph

이게 가장 중요.

지금 블로그는

```
글

↓

글

↓

글

↓

글
```

이 느낌이다.

그런데

애드센스든

사용자든

원하는 건

```
C++

├── Memory

├── STL

├── ABI

├── Template

└── Allocator

Linux

├── Scheduler

├── MM

├── IRQ

└── VFS
```

처럼

**지식 트리**

이다.

---

# Task 6. Content Quality Audit

이건 구글이 가장 좋아하는 부분.

예)

모든 글에 대해

```
깊이

독창성

이미지

예제

참고문헌

실험

벤치마크

결론

다음글

```

점수.

---

# Task 7. Adsense 관점 Audit

이건 따로.

Google이 말하는

```
Low Value Content
```

가

실제로 무엇인지

사이트에서 찾아낸다.

예)

```
중복 글

너무 짧은 글

AI 느낌

카테고리 없음

작성자 신뢰 부족

시리즈 없음

About 부족

```

같은 것.

---

# Task 8. 실행 계획

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

# 1. 현재 상태와 블로그의 정체성

## 1.1 현재 사이트가 전달하는 첫인상

홈페이지는 현재 다음 메시지를 전면에 내세우고 있어.

> “Software Engineer who loves C++, Modern C++, and sharing knowledge through writing.”

그리고 사이트에는 `Systems Notes`라는 보조 문구가 있다. 홈의 최근 글은 UEFI Secure Boot, CXL 메모리 토폴로지, CXL 초기화, U-Boot PCIe Enumeration, CXL 장애 분석 등 매우 깊은 시스템 주제가 차지한다. citeturn646525view0

그런데 여기에는 약간의 정체성 충돌이 있어.

### 표면적인 정체성

- C++ 개발자
- Modern C++ 글을 쓰는 개발자
- 개인 개발 블로그

### 실제 콘텐츠가 보여주는 정체성

- 시스템 소프트웨어 지식베이스
- 임베디드·펌웨어·부트로더 아카이브
- PCIe·CXL·메모리 시스템 전문 자료
- 디버깅과 성능 분석 자료
- 고급 개발자를 위한 레퍼런스

즉, **홈의 자기소개보다 실제 콘텐츠가 훨씬 전문적이고 범위도 넓다.**

이것은 콘텐츠가 부족해서 생기는 문제가 아니라, 오히려 **콘텐츠의 가치를 사이트가 제대로 설명하지 못하는 문제**에 가깝다.

---

# 2. 첫 번째 핵심 안티패턴

## Identity–Content Mismatch  
### 사이트 정체성과 실제 콘텐츠의 불일치

홈은 일반적인 C++ 개발자 블로그처럼 소개하지만 실제 글은 상당수가 시스템 프로그래밍과 저수준 컴퓨팅에 집중되어 있다.

이 경우 신규 방문자는 사이트를 보고 다음처럼 판단할 수 있어.

> “C++ 관련 개인 블로그인가 보다.”

하지만 실제로 들어가 보면:

- UEFI
- CXL
- PCIe
- 메모리 토폴로지
- 부트로더
- 장애 분석
- 시스템 디버깅

같은 고급 자료가 나온다.

콘텐츠의 깊이를 잘못 전달하는 셈이다.

### 문제점

- 전문성이 첫 화면에서 드러나지 않는다.
- 사이트가 어떤 독자를 위한 곳인지 불명확하다.
- 검색으로 들어온 사용자가 다른 글까지 탐색할 이유를 찾기 어렵다.
- Google도 사이트 전체의 주제적 일관성을 해석하기 어려울 수 있다.
- 좋은 글이 있어도 개별 글의 집합처럼 보인다.

### 개선 방향

사이트의 핵심 설명을 다음처럼 바꿀 수 있다.

> C++, Systems Programming, Embedded Software, and Computer Architecture

또는 한국어로:

> C++, 시스템 프로그래밍, 임베디드와 컴퓨터 구조를 다루는 기술 지식베이스

중요한 것은 문구 자체보다 **사이트를 개인 일기형 블로그가 아니라 전문 지식 아카이브로 명시하는 것**이다.

---

# 3. 두 번째 핵심 안티패턴

## Latest-Post-Driven Identity  
### 최근 글이 사이트 전체 정체성을 결정함

현재 홈의 주요 콘텐츠는 최근 글 목록이다. 최근 글들이 모두 Bootloader와 CXL 중심이기 때문에 처음 방문한 사람은 사이트 전체가 CXL 블로그라고 오해할 수도 있다. citeturn646525view0

반대로 다음 달에 CUDA 글을 20개 연속 작성하면 CUDA 블로그처럼 보일 것이다.

즉:

```text
사이트 정체성
    =
최근에 작성한 주제
```

가 된다.

이 구조는 글 수가 많아질수록 위험하다.

### 문제점

- 오래된 대표 글이 홈에서 사라진다.
- 분야별 전문성이 숨겨진다.
- 작성 시점에 따라 사이트 인상이 계속 바뀐다.
- 방문자가 전체 콘텐츠 범위를 알 수 없다.
- 검색 유입 후 사이트 내부 탐색이 약해진다.

### 개선 방향

홈은 최신 글보다 먼저 다음을 보여줘야 한다.

```text
Systems Programming
C++ and Performance
Embedded and Firmware
Computer Architecture
GPU and CUDA
Debugging and Observability
```

그리고 각 분야에 대해:

- 대표 가이드
- 입문 글
- 심화 글
- 최근 업데이트

를 보여주는 편이 맞다.

최신 글은 사이트의 한 섹션이어야지, 사이트 정체성 전체가 되면 안 된다.

---

# 4. 세 번째 핵심 안티패턴

## Article Warehouse  
### 글 저장소는 있지만 지식 구조가 없음

홈에서 확인되는 글들은 각각 주제와 내용이 상당히 구체적이다.

예를 들어:

- UEFI Secure Boot 인증서 만료
- DDR와 CXL.mem 메모리 토폴로지
- UEFI의 CXL 초기화
- U-Boot PCIe Enumeration
- CXL Fabric 장애 추적
- CXL Device Core Dump

등이다. citeturn646525view0

문제는 이런 글들이 사이트 차원에서 어떻게 연결되는지가 처음 방문자에게 보이지 않는다는 것이다.

현재 방식은 대략 다음과 같다.

```text
글 A
글 B
글 C
글 D
글 E
```

지식베이스라면 다음처럼 보여야 한다.

```text
CXL
├── Architecture
├── Enumeration
├── Memory Topology
├── Firmware Initialization
├── Fabric Management
└── Failure Analysis
```

현재 글의 깊이는 이미 지식베이스 수준인데, 표현 방식은 일반 블로그 수준에 머물러 있다.

### 이 부분이 AdSense와 연결되는 이유

Google이 사이트를 평가할 때 단순 글자 수만 보는 것은 아니다. 사용자가 사이트 안에서 의미 있는 정보를 찾을 수 있는지, 개별 페이지가 사이트의 전체 목적과 연결되는지도 중요하다.

글이 많아도 다음처럼 보이면 가치가 낮게 평가될 가능성이 있다.

- 유사한 글이 날짜순으로 반복됨
- 글 간 관계가 없음
- 대표 페이지가 없음
- 주제별 허브가 없음
- 사이트의 전문 영역이 불명확함
- 비슷한 제목의 글이 연속적으로 생성됨

따라서 네 경우에는 **콘텐츠를 무작정 더 쓰는 것보다 기존 글을 구조화하는 것이 먼저**일 수 있다.

---

# 5. 네 번째 핵심 안티패턴

## Expertise Without Evidence Architecture  
### 전문성은 있지만 증명 구조가 약함

콘텐츠 제목만 보면 상당히 전문적이다. 하지만 독자가 사이트에 처음 들어왔을 때 다음 정보가 즉시 드러나는지는 별개의 문제다.

- 작성자의 실제 전문 분야
- 어떤 경험을 바탕으로 작성했는지
- 글에서 직접 검증한 부분과 조사한 부분
- 사용한 환경과 버전
- 참고한 규격과 문서
- 글의 최신성
- 다른 관련 글과의 관계

예를 들어 CXL이나 UEFI 글이라면 본문에 다음 요소가 있으면 신뢰도가 크게 높아진다.

```text
Tested environment
Relevant specification
Source code reference
Observed result
Limitations
Last verified date
```

이것은 단순히 About 페이지를 길게 쓰는 문제가 아니다.

**전문성을 콘텐츠 구조로 증명해야 한다.**

---

# 6. 다섯 번째 핵심 안티패턴

## Personal Brand Under-Specification  
### 개인 브랜드 설명이 실제 역량보다 약함

`Hi, I'm Hawk`와 C++ 중심 소개는 깔끔하지만, 네 실제 콘텐츠 자산과 비교하면 지나치게 일반적이다. citeturn646525view0

현재 문구는 수많은 개발 블로그에 적용할 수 있다.

반면 네 블로그의 차별점은 꽤 명확하다.

- 저수준 시스템을 깊게 설명함
- C++와 하드웨어 경계를 함께 다룸
- 부트 과정부터 런타임 장애까지 이어서 다룸
- 임베디드·PCIe·CXL·CUDA를 연결할 수 있음
- 단순 사용법이 아니라 내부 동작을 설명함

따라서 브랜드 메시지도 이런 방향이어야 한다.

### 예시

> Software Engineer exploring the boundary between software and hardware.

또는:

> Deep technical notes on C++, firmware, computer architecture, and heterogeneous systems.

한국어로는:

> 소프트웨어와 하드웨어의 경계를 탐구하는 시스템 엔지니어의 기술 기록

이런 표현이 현재 콘텐츠와 더 맞는다.

---

# 7. 현재 단계의 진단

현재 사이트는 **콘텐츠가 없는 사이트라기보다 콘텐츠 가치가 제대로 구조화되지 않은 사이트**에 가깝다.

내가 보는 현재 상태는 이렇다.

| 항목 | 진단 |
|---|---|
| 콘텐츠 양 | 충분하거나 많음 |
| 콘텐츠 난이도 | 높음 |
| 전문성 | 높음 |
| 첫 화면 전달력 | 보통 이하 |
| 주제 구조 | 약함 |
| 대표 콘텐츠 노출 | 약함 |
| 학습 경로 | 거의 보이지 않음 |
| 개인 브랜드 명확성 | 다소 약함 |
| 지식베이스 성격 | 잠재력은 높으나 표현되지 않음 |

## 첫 번째 결론

지금 당장 글을 더 늘리는 것보다 먼저 해결해야 할 문제는:

> **“이 사이트가 누구를 위해 무엇을 제공하는 사이트인가?”를 홈과 정보 구조에서 분명히 만드는 것**

이다.

그리고 이 작업은 애드센스 대응 이전에 사이트의 근본적인 방향을 잡는 작업이기도 하다.

다음 단계에서는 **정보 구조와 탐색 구조**만 따로 분석하겠다. 여기서 카테고리·태그·시리즈·검색·학습 경로가 어떻게 겹치고 있는지 살펴보면 된다.

## 15. user

다음

## 16. assistant

좋아. 그럼 이번에는 **Task 1-2. Information Architecture (정보 구조)**를 보자.

이 부분이 내가 보기에는 **애드센스보다 더 중요한 문제**다.

왜냐하면 Google은 결국

> "이 사이트가 사용자가 원하는 정보를 쉽게 찾을 수 있는가?"

를 계속 평가하기 때문이다.

---

# Task 1-2. Information Architecture Review

> "좋은 글"과
>
> "좋은 지식 사이트"는 다르다.

대부분 기술 블로그는

```
좋은 글
+
좋은 글
+
좋은 글
```

이다.

하지만 Wikipedia나 cppreference는

```
지식 구조

↓

문서

↓

세부 문서

↓

관련 문서
```

이다.

이 차이가 엄청 크다.

---

# 현재 구조

내가 느낀 구조는 거의

```
Home

↓

Latest Posts

↓

Post
```

이다.

즉

```
시간순
```

으로 사이트가 구성된다.

---

# 안티패턴 1

## Chronological Architecture

시간순 사이트

```
2026

↓

2025

↓

2024
```

이게 블로그는 맞는데

Knowledge Base는 아니다.

---

예를 들어

PCIe를 배우고 싶은 사람이 왔다.

원하는 것은

```
PCIe

↓

Basic

↓

BAR

↓

MSI

↓

DMA

↓

ATS

↓

IOMMU
```

인데

현재는

```
2026

↓

PCIe

↓

CUDA

↓

UEFI

↓

CXL

↓

Linux

↓

...
```

---

문제는

PCIe 글이

3년 동안

50개가 생기면

찾을 수가 없다.

---

### 개선

시간축

↓

주제축

으로 변경.

---

# 안티패턴 2

## Flat Knowledge

모든 글이 같은 Level

예)

```
UEFI

CXL

PCIe

Rust

CUDA

Modern C++

```

전부 같은 Level.

---

실제로는

```
Computer Architecture

    PCIe

        BAR

        DMA

        MSI

Firmware

    UEFI

        Boot

        Secure Boot

        DXE

CXL

    Type1

    Type2

    Type3

```

이 되어야 한다.

---

즉

Hierarchy가 없다.

---

# 안티패턴 3

## Missing Topic Hub

이게 제일 크다.

예를 들어

CXL 글이

30개 있다.

그런데

```
/cxl
```

이라는

대표 페이지가 없다.

그러면

Google도

사람도

```
CXL 전문가
```

라는 걸 이해하기 어렵다.

---

Hub는

예)

```
CXL

Introduction

Memory

Device

Fabric

Linux

Debug

Spec

추천순

입문순

```

이런 페이지다.

---

이게 없다.

---

# 안티패턴 4

## No Learning Path

입문자가

```
PCIe
```

검색해서 들어왔다.

다 읽었다.

그 다음

어디로 가야 하는지

모른다.

---

좋은 사이트는

```
다음 추천

↓

MSI

↓

DMA

↓

ATS

↓

IOMMU
```

자동으로 이어진다.

---

현재는

```
최근 글
```

로 끝.

---

# 안티패턴 5

## Orphan Article

고아 문서.

즉

```
검색

↓

글

↓

끝
```

이다.

---

좋은 사이트는

```
글

↓

관련 글

↓

시리즈

↓

상위 개념

↓

하위 개념

↓

FAQ

```

계속 이어진다.

---

# 안티패턴 6

## Bidirectional Link 없음

예)

```
PCIe

↓

MSI
```

만 있다.

반대로

```
MSI

↓

PCIe
```

는 없다.

---

Knowledge Graph는

양방향이다.

---

# 안티패턴 7

## Category as Folder

카테고리가

그냥

```
폴더
```

이다.

사람은

```
C++

↓

Memory

↓

Allocator

↓

Pool

↓

NUMA
```

이런

지식 체계를 원한다.

---

# 안티패턴 8

## Tag Explosion

태그가

```
100개
```

넘으면

거의 의미 없다.

---

태그는

검색 보조

이지

Navigation이 아니다.

---

# 안티패턴 9

## Duplicate Navigation

```
Category

Series

Tag
```

전부

같은 역할.

---

예)

```
CXL

Tag

Series

Category

```

전부 존재.

---

사용자는

뭐가 뭔지 모른다.

---

# 안티패턴 10

## Infinite Latest Posts

홈이

```
최근글

최근글

최근글

최근글

```

계속.

---

좋은 사이트는

```
Featured

↓

Popular

↓

Series

↓

Latest

```

순.

---

# 안티패턴 11

## Hidden Evergreen

몇 년 동안 쓴

최고 글

↓

아무도 못 찾음.

---

시간이 지나면

뒤로 밀림.

---

이게 엄청 흔하다.

---

# 안티패턴 12

## Search Dependency

찾으려면

검색해야 한다.

---

좋은 구조는

검색 없이도

찾을 수 있다.

---

# 안티패턴 13

## Article-first Design

사이트가

```
글
```

중심.

---

좋은 사이트는

```
Topic

↓

Guide

↓

Article

↓

Reference

```

이다.

---

# 안티패턴 14

## Missing Canonical Guide

예)

```
CXL

```

글이

40개.

---

그런데

대표 Guide가 없다.

---

Google도

```
대표 문서
```

를 좋아한다.

---

# 안티패턴 15

## Knowledge Duplication

PCIe 설명을

```
20개 글
```

에서 반복.

---

좋은 구조는

```
PCIe Guide

↓

링크
```

이다.

---

# 안티패턴 16

## No Difficulty Layer

현재는

```
초급

중급

고급
```

구분이 없다.

---

예)

```
⭐⭐☆☆☆

입문

```

이런 표시.

---

# 안티패턴 17

## Missing Audience

이 글이

```
Kernel

FW

Driver

Embedded

```

누구 대상인지 모른다.

---

# 안티패턴 18

## Reference without Context

규격 이야기.

---

그런데

```
왜 필요한지
```

없다.

---

# 안티패턴 19

## Context Reset

글마다

PCIe 설명

다시.

---

지식 연결이 없다.

---

# 안티패턴 20

## Knowledge Island

이게

가장 큰 문제.

```
CUDA

PCIe

Linux

CXL

Compiler

```

전부

섬.

---

그런데 실제로는

```
Compiler

↓

Binary

↓

ELF

↓

Loader

↓

Kernel

↓

PCIe

↓

DMA

↓

NUMA

↓

CXL

```

전부 연결된다.

---

# 내가 가장 추천하는 구조

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

## 17. assistant

이번에는 **Task 1-3. Content Architecture**로 갈게. 정보 구조가 “어디에 놓을지”라면, 콘텐츠 아키텍처는 **글 하나를 어떤 역할과 형태로 설계할지**에 대한 문제다.

## 18. assistant

# Task 1-3. Content Architecture Review

앞 단계에서 본 정보 구조가 **“글을 어디에 배치할 것인가”**였다면, 콘텐츠 아키텍처는 다음 문제를 다룬다.

> 글 하나가 사이트 안에서 어떤 역할을 맡고, 어떤 형식으로 작성되며, 다른 문서와 어떻게 연결되는가?

네 블로그는 글의 주제 수준은 상당히 깊다. 문제는 각각의 글이 **튜토리얼인지, 개념 설명인지, 실험 기록인지, 장애 분석인지, 레퍼런스인지** 명확하게 구분되지 않으면 독자와 검색엔진 모두 글의 가치를 빠르게 이해하기 어렵다는 점이다.

---

## 1. 모든 콘텐츠를 동일한 “포스트”로 취급하는 문제

### Post Homogeneity

현재 일반적인 블로그 구조에서는 모든 콘텐츠가 결국 같은 `post` 타입으로 들어간다.

```text
제목
날짜
태그
본문
```

하지만 실제 기술 콘텐츠는 성격이 다르다.

- 개념 설명
- 단계별 튜토리얼
- 문제 해결 기록
- 실험 및 벤치마크
- 소스코드 분석
- 규격 해설
- 학습 노트
- 의견과 설계 제안
- 치트시트
- 프로젝트 회고

이들을 모두 같은 템플릿으로 보여주면 독자는 글을 열기 전까지 무엇을 얻게 될지 알기 어렵다.

### 개선

최소한 콘텐츠 역할을 나누는 게 좋다.

| 유형 | 목적 |
|---|---|
| Guide | 주제를 체계적으로 학습 |
| Concept | 하나의 개념을 깊게 설명 |
| Tutorial | 결과를 재현하도록 안내 |
| Debug Note | 증상부터 원인까지 추적 |
| Experiment | 가설과 측정 결과 제시 |
| Reference | 빠르게 다시 찾아보는 자료 |
| Opinion | 설계 판단과 견해 제시 |
| Project Note | 구현 과정과 의사결정 기록 |

이 구분은 URL까지 나눌 필요는 없다. Front matter에 다음 정도만 추가해도 된다.

```yaml
content_type: debug-note
```

중요한 건 메타데이터가 아니라, **유형마다 문서 구조를 달리하는 것**이다.

---

# 2. 제목이 주제를 말하지만 문제를 말하지 않는 현상

## Topic-Only Title

기술 블로그에서 흔히 볼 수 있는 제목은 다음과 같다.

```text
CXL Memory Topology
UEFI Secure Boot
PCIe Enumeration
CUDA Stream
```

이 제목들은 주제를 알려주지만, 독자가 무엇을 얻는지는 알려주지 않는다.

보다 강한 제목은 다음 요소 중 하나를 포함한다.

- 해결할 문제
- 설명할 메커니즘
- 비교할 대상
- 관찰한 현상
- 독자가 얻을 결과

예를 들어:

```text
CXL 메모리는 Linux NUMA 노드에 어떻게 나타나는가
UEFI Secure Boot에서 인증서 만료가 부팅을 막는 과정
U-Boot가 PCIe 장치를 열거하지 못할 때 확인할 순서
CUDA Stream을 늘려도 성능이 오르지 않는 이유
```

첫 번째 방식은 분류에 유리하지만, 두 번째 방식은 검색 의도와 독자의 기대를 더 정확하게 맞춘다.

### 안티패턴

- **Specification-Like Title**
- **Keyword Stack Title**
- **Part Number Without Meaning**
- **Title Written for the Author**
- **Acronym-First Naming**

제목에 전문 용어가 많은 것은 문제가 아니다. 다만 **전문 용어만으로 제목을 구성하면 검색 결과에서 글의 차별점이 사라진다.**

---

# 3. 문서의 목적이 초반에 드러나지 않는 문제

## Delayed Value Proposition

기술 글이 다음처럼 시작하기 쉽다.

```text
CXL은 Compute Express Link의 약자로...
PCI Express는 고속 직렬 인터페이스로...
CUDA Stream은 비동기 작업을...
```

틀린 설명은 아니지만, 이미 해당 키워드를 검색해 들어온 독자에게는 정보 가치가 낮다.

글의 첫 부분에서는 다음 네 가지가 빠르게 드러나야 한다.

```text
이 글이 다루는 문제
왜 이 문제가 중요한가
어디까지 설명하는가
읽고 나면 무엇을 알게 되는가
```

예를 들어 장애 분석 글이라면:

```text
이 글은 U-Boot에서 PCIe 장치가 검색되지 않는 문제를
링크 트레이닝, ECAM 접근, BAR 할당 순서로 나누어 분석한다.
```

이 한 문장이 있으면 독자와 검색엔진 모두 문서의 목적을 이해하기 쉬워진다.

### 권장 도입부

```markdown
## 이 글에서 다루는 것

- 관찰된 문제
- 핵심 원인
- 분석 범위
- 최종적으로 확인할 수 있는 것
```

모든 글에 같은 문구를 강제할 필요는 없지만, **초반 10~15% 안에는 목적이 분명해야 한다.**

---

# 4. 배경 설명이 매 글마다 반복되는 문제

## Repeated Context Boilerplate

CXL 글마다 PCIe를 다시 설명하고, PCIe 글마다 BAR와 Enumeration을 다시 설명하고, CUDA 글마다 GPU 실행 모델을 다시 설명하면 개별 글은 독립적으로 읽기 편해진다.

하지만 누적되면 다음 문제가 생긴다.

- 유사 문장이 여러 글에 반복됨
- 핵심 내용까지 도달하는 시간이 길어짐
- 업데이트 시 여러 글을 동시에 수정해야 함
- 검색엔진이 문서 간 차이를 파악하기 어려워짐
- 작성자 자신의 분석보다 일반 설명 비중이 커짐

### 해결 방향

배경 설명을 완전히 없애는 게 아니라 세 단계로 분리한다.

```text
한 문단 요약
→ 상세 개념 문서 링크
→ 현재 글에서 필요한 차이점만 설명
```

예:

```markdown
PCIe Enumeration은 버스·장치·기능을 탐색하고 BAR 자원을
할당하는 과정이다. 전체 과정은 [PCIe Enumeration 가이드]를 참고한다.

이 글에서는 그중 U-Boot가 Root Port 아래 장치를 찾지 못하는
단계만 분석한다.
```

이 방식은 중복을 줄이면서도 글의 독립성을 유지한다.

---

# 5. 설명과 사실, 경험과 추론이 구분되지 않는 문제

## Evidence Blending

기술 글에서는 다음 네 가지가 자주 섞인다.

- 사양에 명시된 사실
- 공식 문서의 설명
- 실제 장비에서 관찰한 결과
- 작성자의 추론이나 가설

예를 들어:

```text
이 현상은 컨트롤러가 초기화되지 않았기 때문이다.
```

라고만 쓰면 독자는 이것이 규격에 있는 내용인지, 로그로 확인한 사실인지, 경험적 추정인지 알 수 없다.

### 개선

문장과 섹션 수준에서 근거의 종류를 분리한다.

```text
Specification
Observation
Interpretation
Hypothesis
Conclusion
```

예:

```markdown
### 관찰

LTSSM 상태가 Recovery에서 반복되었다.

### 해석

링크가 L0에 도달하지 못했으므로 Configuration Space 접근 이전의
문제로 볼 수 있다.

### 가설

보드의 RefClk 또는 PERST# 해제 순서가 원인일 가능성이 높다.
```

이 구조는 글의 신뢰성을 크게 높인다.

---

# 6. 결과만 있고 재현 조건이 없는 문제

## Non-Reproducible Technical Content

다음과 같은 글은 정보는 있어도 재사용하기 어렵다.

```text
이렇게 설정했더니 동작했다.
성능이 빨라졌다.
장치가 인식되었다.
```

기술 콘텐츠에서 중요한 것은 결과보다 조건이다.

### 필요한 최소 환경 정보

- 하드웨어
- 운영체제와 커널
- 컴파일러 또는 SDK 버전
- 주요 라이브러리 버전
- 사용한 명령
- 설정값
- 테스트 입력
- 기대 결과와 실제 결과

예:

```yaml
tested_on:
  board: Alveo U250
  os: CentOS 7.9
  kernel: 3.10.0-1160
  xrt: 2.13.466
  platform: xilinx_u250_gen3x16_xdma_2_1
```

모든 글에 이렇게 상세한 정보가 필요한 건 아니지만, 실험·설치·디버깅 글에는 매우 중요하다.

### 안티패턴

- **Works-on-My-Machine Article**
- **Versionless Tutorial**
- **Result Without Setup**
- **Benchmark Without Workload**
- **Command Without Expected Output**

---

# 7. 실험 글에 가설과 기준선이 없는 문제

## Measurement Without Experiment Design

성능이나 시스템 동작을 다루는 글에서는 단순 측정값만으로는 가치가 부족하다.

```text
처리 시간: 12ms
대역폭: 8GB/s
```

독자는 이것이 좋은지 나쁜지 판단할 수 없다.

필요한 구성은 다음과 같다.

```text
질문
가설
환경
Baseline
변경 변수
고정 변수
측정 방법
결과
해석
한계
```

예를 들어 CUDA 최적화 글이라면:

```text
질문:
Pinned Memory가 pageable memory보다 얼마나 빠른가?

Baseline:
동일한 크기의 pageable memory memcpy

변수:
버퍼 크기만 변경

고정:
GPU, PCIe 링크, CUDA 버전, 반복 횟수

한계:
첫 실행 초기화 비용 제외
```

이런 글은 단순 학습 노트보다 **독창적인 기술 콘텐츠**로 평가받기 쉽다.

---

# 8. 장애 해결 글이 “정답 기록”으로 끝나는 문제

## Fix-Only Debugging Note

디버깅 글이 다음처럼 끝나는 경우가 많다.

```text
커널 옵션을 변경하니 해결되었다.
서비스를 재시작하니 정상 동작했다.
```

하지만 진짜 가치 있는 디버깅 문서는 해결책보다 **판단 과정**을 담는다.

### 좋은 장애 분석 구조

```text
증상
정상 상태의 기대값
문제 범위 축소
수집한 로그
제외한 가설
확인된 원인
해결 방법
재발 방지
```

특히 `제외한 가설`이 중요하다.

독자는 최종 정답보다 다음을 배우고 싶어 한다.

> 어떤 증거 때문에 다른 가능성을 버렸는가?

### 안티패턴

- **Solution Without Diagnosis**
- **Magic Command Fix**
- **Log Dump Without Interpretation**
- **Postmortem Without Prevention**
- **Successful Path Only**

---

# 9. 코드가 설명을 대신하는 문제

## Code-as-Explanation

코드 블록이 길수록 글이 깊어 보일 수 있지만, 실제로는 반대일 때가 많다.

```cpp
// 150줄 코드
```

뒤에:

```text
위 코드와 같이 구현한다.
```

라고 끝나면 독자는 중요한 설계 판단을 알아내기 위해 직접 코드를 분석해야 한다.

### 좋은 코드 설명

코드 자체보다 다음을 설명해야 한다.

- 왜 이 구조를 선택했는가
- 대안은 무엇이었는가
- 어떤 불변조건을 유지하는가
- 실패할 수 있는 경로는 무엇인가
- 성능 비용은 어디서 발생하는가
- 어떤 부분이 예시를 위한 단순화인가

### 코드 블록 역할 분리

```text
Minimal Example
Core Logic
Production Consideration
Failure Path
Complete Source
```

전체 코드는 GitHub에 두고, 본문에는 설명에 필요한 부분만 남기는 게 좋다.

---

# 10. 다이어그램이 장식으로 사용되는 문제

## Decorative Diagram

시스템 분야에서는 그림이 특히 중요하지만, 단순히 구조를 예쁘게 보여주는 그림만으로는 부족하다.

좋은 다이어그램은 최소 하나를 설명해야 한다.

- 데이터 흐름
- 제어 흐름
- 시간 순서
- 상태 변화
- 주소 공간
- 계층 관계
- 소유권
- 장애 전파

예를 들어 PCIe Enumeration은 박스 그림보다 순서도가 더 유용하다.

```text
Root Complex
→ Bus Scan
→ Configuration Space Read
→ BAR Size Probe
→ Address Assignment
→ Driver Binding
```

반대로 CXL 메모리 토폴로지는 계층도나 주소 맵이 더 적합하다.

### 안티패턴

- **Diagram Without Question**
- **Architecture Box Wallpaper**
- **Screenshot Instead of Explanation**
- **Unlabeled Arrow**
- **Visual Not Updated With Text**

---

# 11. 글의 깊이와 길이를 동일하게 보는 문제

## Length-as-Depth

긴 글이라고 깊은 글은 아니다.

다음과 같은 글은 길어도 가치가 낮을 수 있다.

- 사양 내용을 순서대로 재서술
- 일반적인 개념 설명 반복
- 코드 전체를 그대로 붙임
- 로그 전체를 붙임
- 제목과 관계없는 배경 설명 확대
- 결론 없이 여러 자료를 모음

반면 짧은 글도 다음이 있으면 가치가 높다.

- 명확한 문제
- 독창적인 관찰
- 재현 가능한 실험
- 정확한 결론
- 다른 자료에서 찾기 어려운 정보

애드센스 대응을 위해 글자 수를 늘리는 것은 위험하다.

> 콘텐츠 가치는 분량이 아니라 정보 밀도와 독창성에서 나온다.

---

# 12. 하나의 글이 너무 많은 역할을 맡는 문제

## Mega-Article

예를 들어 한 글에서:

- CXL 개요
- 프로토콜
- 장치 유형
- Linux 드라이버
- 메모리 할당
- 장애 분석
- 성능 측정

을 모두 설명하면 대표 가이드처럼 보이지만 유지보수가 어려워진다.

### Mega-Article의 문제

- 특정 정보를 다시 찾기 어렵다.
- 일부만 오래되어도 전체 문서가 낡아 보인다.
- 검색 의도가 너무 넓어진다.
- 수정 범위가 커진다.
- 초보자와 전문가를 동시에 만족시키기 어렵다.

### 반대 안티패턴도 있음

## Fragmentation by Default

한 개념을 지나치게 잘게 나누는 것 역시 문제다.

```text
CXL이란?
CXL.io란?
CXL.cache란?
CXL.mem이란?
CXL Type 1이란?
```

각 글이 몇 문단뿐이라면 독자는 계속 페이지를 이동해야 한다.

### 적절한 구조

```text
대표 Guide
├── 핵심 개념을 하나의 흐름으로 설명
├── 세부 문서 링크
└── 장애·실험·레퍼런스는 별도 문서
```

즉:

> 개념은 적당히 묶고, 독립적인 문제와 실험은 분리한다.

---

# 13. 시리즈가 작성 순서에만 의존하는 문제

## Serial Publication Trap

시리즈가 다음처럼 구성되기 쉽다.

```text
Part 1
Part 2
Part 3
Part 4
```

작성자는 순서를 알지만 검색으로 Part 3에 들어온 독자는 전체 구조를 모른다.

### 문제

- 각 제목만으로 내용을 알 수 없음
- 중간 글에서 시작하기 어려움
- 하나의 글이 삭제되거나 합쳐지면 번호가 깨짐
- 새로운 글을 중간에 넣기 어려움
- 검색 결과에서 서로 구분되지 않음

### 개선

번호보다 의미 있는 제목이 먼저 와야 한다.

```text
CXL 메모리 시스템 1 — Host Physical Address가 장치까지 매핑되는 과정
CXL 메모리 시스템 2 — Linux NUMA 노드와 Memory Tier
CXL 메모리 시스템 3 — Decoder 설정과 장애 진단
```

그리고 각 글에 시리즈 전체 목차를 둔다.

---

# 14. 글의 종료 지점이 없는 문제

## Abrupt Ending

기술 글이 코드나 설명 직후 바로 끝나는 경우가 많다.

좋은 결말은 단순 요약만 하는 게 아니다.

### 권장 종료 구조

```text
핵심 결론
적용 가능한 상황
적용하면 안 되는 상황
남은 한계
다음에 읽을 글
```

예:

```markdown
## 결론

이번 문제는 BAR 할당 실패가 아니라 링크가 L0에 도달하지 못한 것이
원인이었다. 따라서 Configuration Space나 드라이버를 보기 전에
LTSSM과 PERST# 순서를 먼저 확인해야 한다.

이 진단은 실제 링크가 형성되지 않는 경우에만 적용된다.
링크가 정상이고 장치만 보이지 않는다면 Enumeration 경로를 점검해야 한다.
```

이렇게 끝나야 글의 지식 단위가 완성된다.

---

# 15. 수정 이력이 콘텐츠에 반영되지 않는 문제

## Timeless Technical Article

기술 글에는 작성일만 있고 다음 정보가 없는 경우가 많다.

- 마지막 검증일
- 대상 버전
- 이후 변경 사항
- 현재도 유효한지
- 대체 문서가 있는지

특히 CUDA, Linux Kernel, Rust, C++, CXL 툴체인처럼 변화가 빠른 분야에서는 중요한 문제다.

### 권장 상태

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

# 16. 출처가 글 끝에만 몰려 있는 문제

## Citation Dump

글 마지막에 참고 링크 20개를 나열해도, 어떤 문장을 어느 자료가 뒷받침하는지는 알기 어렵다.

기술 문서에서는 다음을 구분하는 게 좋다.

- 규격 근거
- 공식 구현 문서
- 소스코드
- 실험 데이터
- 추가 읽을거리

### 개선 예시

```markdown
CXL HDM Decoder는 Host Physical Address 범위를 장치 메모리로
매핑한다. [CXL Specification, §X.Y]

Linux에서는 해당 decoder 구성이 `drivers/cxl/core/hdm.c`에서
처리된다.
```

그리고 마지막에는 참고문헌을 정리한다.

단, 글이 외부 문서를 재서술하는 수준에 머물면 안 된다. 출처는 근거이고, 콘텐츠의 핵심 가치는 **작성자의 설명·검증·연결·해석**이어야 한다.

---

# 17. 독창성이 “새로운 사실 발견”으로만 이해되는 문제

## Novelty Misconception

기술 글에서 독창적이라는 것이 반드시 새로운 알고리즘이나 발견을 의미하지는 않는다.

다음도 충분한 독창성이 된다.

- 여러 사양의 관계를 하나의 흐름으로 설명
- 실제 로그와 사양을 연결
- 실패 사례를 단계별로 분석
- 잘못 알려진 설명을 검증
- 동일 조건에서 여러 구현을 비교
- 복잡한 코드를 구조적으로 재해석
- 재현 가능한 실험 환경 제공
- 실무 의사결정의 기준 제시

네 블로그가 애드센스의 낮은 가치 콘텐츠 문제를 보완하려면, 일반적인 개념 설명을 더 길게 만드는 것보다 이런 **고유한 경험과 해석의 비율을 높이는 것**이 훨씬 중요하다.

---

# 18. AI 생성 문체와 쉽게 구분되지 않는 문제

## Generic Technical Prose

요즘 기술 글에서 특히 위험한 형태다.

```text
~는 매우 중요합니다.
다양한 분야에서 활용됩니다.
장점은 성능과 확장성입니다.
이번 글에서는 자세히 알아보겠습니다.
```

이런 문장은 틀리지 않지만 정보가 거의 없다. 많은 AI 생성 문서가 이 패턴을 반복한다.

### 개선

추상적인 평가 대신 구체적 사실과 판단을 쓴다.

나쁜 예:

```text
CXL은 높은 성능과 확장성을 제공한다.
```

좋은 예:

```text
CXL.mem은 호스트가 장치 메모리를 load/store 대상으로 접근하게 한다.
하지만 지연시간이 DRAM과 동일해지는 것은 아니며, NUMA 배치와
메모리 계층 정책이 성능을 크게 좌우한다.
```

### 제거 대상 문장

- “매우 중요합니다.”
- “다양하게 활용됩니다.”
- “큰 도움이 됩니다.”
- “효율적으로 처리할 수 있습니다.”
- “필수적인 기술입니다.”

구체적인 근거가 바로 뒤따르지 않는다면 대부분 삭제해도 된다.

---

# 19. 콘텐츠 모델 제안

네 블로그에는 다음 7개 콘텐츠 타입이면 충분해 보인다.

## 1. Guide

주제 전체의 지도 역할.

```text
예: PCIe 완전 가이드
```

구조:

```text
대상 독자
선행 지식
전체 개념 지도
학습 순서
세부 문서
```

## 2. Concept

하나의 메커니즘을 깊게 설명.

```text
예: PCIe BAR 크기 탐색은 왜 all-ones write를 사용하는가
```

구조:

```text
문제
핵심 모델
동작 과정
예제
오해
관련 개념
```

## 3. Debug Note

실제 장애 분석.

```text
예: U250 장치에서 PCIe 링크는 보이지만 XRT 장치가 나타나지 않는 문제
```

구조:

```text
환경
증상
가설
증거
원인
해결
재발 방지
```

## 4. Experiment

측정과 검증.

```text
예: CUDA pinned memory와 pageable memory 전송 비교
```

구조:

```text
질문
가설
환경
방법
결과
해석
한계
```

## 5. Source Walkthrough

코드 흐름 분석.

```text
예: Linux PCIe enumeration 코드 흐름
```

구조:

```text
진입점
호출 그래프
핵심 구조체
상태 변화
오류 경로
```

## 6. Reference

빠르게 찾는 자료.

```text
예: PCIe Configuration Space 필드 치트시트
```

구조:

```text
표
명령
필드
주의사항
관련 가이드
```

## 7. Engineering Note

설계 판단과 학습 기록.

```text
예: 임베디드 C++에서 RTTI를 제한해야 하는 실제 이유
```

구조:

```text
상황
선택지
트레이드오프
결정
적용 범위
```

---

# 20. 최소 공통 문서 구조

모든 글을 똑같이 만들 필요는 없지만 최소한 다음 항목은 공통으로 관리하는 게 좋다.

```yaml
title:
description:
content_type:
topics:
audience:
difficulty:
published:
updated:
last_verified:
status:
series:
prerequisites:
related:
```

다만 이전에 언급한 **Front Matter Explosion**을 피해야 한다.

실제 필수값은 다음 정도로 줄일 수 있다.

```yaml
title:
description:
type:
topics:
published:
updated:
```

나머지는 필요한 글에만 쓴다.

---

# 이번 단계의 핵심 진단

네 콘텐츠에서 가장 우려되는 것은 “글이 없다”가 아니다.

> **깊은 기술 자료와 일반 학습 노트가 동일한 포스트 형식 안에 들어가면서, 각 글의 고유 가치가 평준화되는 것**

이다.

현재 글이 500개 이상이라면 모든 글을 한 번에 고칠 필요는 없다. 우선 상위 20~30개 핵심 글만 다음 기준으로 재구성하면 된다.

1. 콘텐츠 유형 지정
2. 독자와 목적 명시
3. 환경과 버전 명시
4. 관찰·근거·해석 구분
5. 관련 허브와 다음 글 연결
6. 오래된 정보 상태 표시
7. 일반 설명보다 고유한 경험과 분석 강화

이 작업이 완료되면 사이트는 단순히 글이 많은 개인 블로그가 아니라, **검증된 시스템 엔지니어링 문서를 축적하는 전문 사이트**로 보이기 시작한다.

다음 단계는 **Task 1-4. 기술 스택과 렌더링 구조**다. 여기서는 Astro·Markdown·클라이언트 JavaScript·검색·스타일·컴포넌트 구성이 콘텐츠 규모에 비해 적절한지 보겠다.

## 19. assistant

이번에는 **Task 1-4. 기술 스택과 렌더링 구조**다. 이번 단계는 추상론이 아니라 `hawk90.github.io`의 실제 페이지 구성과 정적 사이트 구조를 기준으로 보겠다.

## 20. assistant

# Task 1-4. 기술 스택과 렌더링 구조 리뷰

이번에는 실제 저장소 기준으로 본다.

현재 핵심 스택은 다음이다.

```text
Astro 6
Tailwind CSS 4
Markdown
Expressive Code
KaTeX
Satori + Resvg
Giscus
GitHub Pages
ClientRouter
클라이언트 JSON 전문 검색
```

저장소 설명상 이 프로젝트는 단순 개인 블로그가 아니라 **장문의 기술 글을 위한 Astro 블로그 테마**까지 목표로 한다. 시리즈, 런타임 코드 테마 변경, 수식, TikZ 다이어그램, SPA식 페이지 전환, 자동 OG 이미지, 전문 검색, 인쇄 스타일 등을 포함한다. citeturn130086view1

결론부터 말하면:

> **기술 스택 선택 자체는 상당히 적절하다.**  
> 문제는 블로그가 성장하면서 “콘텐츠 사이트”와 “블로그 플랫폼 개발”이 하나의 저장소 안에서 경쟁하기 시작했다는 점이다.

---

# 1. 전체적인 판단

## 현재 스택의 장점

Astro를 선택한 것은 네 블로그 성격에 잘 맞는다.

- 대부분 정적 콘텐츠
- Markdown 중심
- GitHub Pages 배포
- 서버 운영 불필요
- HTML 사전 생성 가능
- JavaScript를 필요한 곳에만 적용 가능
- 코드 블록과 수식 지원
- RSS와 Sitemap 생성 가능

실제로 현재 설정은 `output: 'static'`이고, GitHub Pages에 맞춘 정적 출력이다. HTML 압축과 stylesheet 자동 인라인도 활성화되어 있다. citeturn130086view3

따라서 내가 처음에 일반론으로 말했던:

- React 전체 hydration
- SPA 전용 애플리케이션 구조
- 서버 렌더링 과잉
- 거대한 상태관리

같은 문제는 현재 핵심 위험이 아니다.

오히려 현재 구조는 꽤 절제되어 있다.

---

# 2. 첫 번째 핵심 안티패턴

## Theme Product and Personal Blog Convergence  
### 테마 제품과 개인 블로그가 하나로 합쳐짐

저장소 README는 현재 프로젝트를 다음처럼 소개한다.

> “A premium Astro blog theme focused on long-form technical writing.”

즉 저장소가 동시에 두 가지 역할을 한다.

```text
hawk90의 실제 기술 블로그
+
재사용 가능한 범용 Astro 블로그 테마
```

이 두 목표는 처음에는 잘 맞지만 시간이 지나면 충돌할 수 있다. citeturn130086view1

## 개인 블로그가 원하는 것

- 네 콘텐츠에 최적화된 정보 구조
- C++, CUDA, PCIe, CXL 특화 기능
- 빠른 글 작성
- 단순한 운영
- 기존 글 마이그레이션
- 애드센스와 검색 최적화

## 범용 테마가 원하는 것

- 모든 사용자에게 적용 가능한 설정
- Newsletter provider 추상화
- 여러 Analytics 공급자
- 범용 About·Resume 데이터
- 여러 테마
- 플러그인 가능한 기능
- 상용 재사용 가능성
- 확장 가능한 API 계약

이 둘을 계속 같은 코드베이스에서 해결하면 다음 현상이 발생한다.

- 블로그 기능 하나를 추가할 때도 범용 설정화를 고민함
- 네게 필요 없는 기능도 유지함
- 단순 수정이 테마 API 변경이 됨
- 콘텐츠 개선보다 테마 완성도에 시간을 씀
- 개인 블로그에서 사용하지 않는 조합까지 고려함

### 현재 나타나는 신호

README에는 Newsletter provider, Analytics, Comments, About, Resume, branding, navigation 등을 각각 `define*` helper로 추상화한 구조가 소개되어 있다. citeturn130086view1

런타임에는 identity function이라 비용은 거의 없지만, 설계 관점에서는 다음 방향으로 가고 있다.

```text
콘텐츠 사이트
→ 설정 가능한 테마
→ 블로그 프레임워크
```

### 권장

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

# 3. 두 번째 핵심 안티패턴

## Static Site with SPA Ambition  
### 정적 사이트에 SPA 경험을 과도하게 결합

README에는 `ClientRouter`를 사용한 SPA식 페이지 전환과 제목 morphing이 주요 기능으로 소개된다. citeturn130086view1

이 기능 자체가 잘못된 것은 아니다. 하지만 기술 블로그에서 SPA 전환은 **핵심 가치가 아니라 부가 기능**이다.

## 얻는 것

- 페이지 이동이 부드러움
- 전체 새로고침 감소
- 전환 애니메이션
- 앱 같은 느낌
- 오디오나 일부 UI 상태 유지 가능

## 잃을 수 있는 것

- 페이지별 스크립트 초기화 복잡성
- 전환 후 이벤트 중복 등록
- 애드센스 재처리 문제
- 분석 도구 pageview 누락 가능성
- Giscus와 외부 embed 재초기화
- 스크롤 복원 문제
- 브라우저 기본 탐색과 다른 동작
- 메모리 누수 가능성
- 단순 HTML 사이트보다 디버깅이 어려워짐

기술 블로그의 핵심 요구사항은 다음이다.

```text
페이지가 빠르게 열린다
글이 잘 읽힌다
URL로 직접 접근된다
뒤로 가기가 정상이다
검색엔진이 이해한다
```

SPA 느낌은 그다음이다.

### 안티패턴 발생 조건

다음과 같은 코드가 늘어나면 경고 신호다.

```javascript
document.addEventListener('astro:page-load', ...)
document.addEventListener('astro:before-swap', ...)
document.addEventListener('astro:after-swap', ...)
```

각 컴포넌트가 페이지 전환 생명주기를 별도로 관리하기 시작하면, 정적 블로그에 작은 SPA 프레임워크가 생긴다.

### 권장 원칙

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

# 4. 세 번째 핵심 안티패턴

## Build-Time Feature Accumulation  
### 빌드 파이프라인에 기능이 계속 누적됨

현재 빌드 전에는 자동 OG 이미지 생성이 실행된다.

```json
"prebuild": "node scripts/build-og.mjs --prune"
```

그리고 별도 파이프라인으로 다음 기능이 존재한다.

- OG 이미지 생성
- TikZ → SVG 변환
- 책 노트 동기화
- 내부 링크 감사
- 시리즈 무결성 검사
- 이미지 커버리지 검사
- 오래된 콘텐츠 검사
- 문체 일관성 검사
- 중복 주제 검사

이는 매우 훌륭한 운영 자동화다. `package.json`에 실제 감사 명령들이 잘 정리되어 있다. citeturn130086view2

다만 장기적으로는 다음 안티패턴이 생길 수 있다.

```text
글 하나 수정
→ 전체 콘텐츠 읽기
→ 전체 OG 검사
→ 모든 Markdown 변환
→ 모든 코드 블록 하이라이트
→ 모든 검색 인덱스 생성
→ 모든 Sitemap 생성
→ 모든 콘텐츠 감사
```

### 이미 보이는 확장 신호

현재 Astro build에는 최대 8GB Node heap 설정이 들어가 있다.

```text
--max-old-space-size=8192
```

또한 설정 주석에는 약 44,000개의 코드 블록 때문에 기본 Shiki 언어 전체 로드가 heap을 압박한다고 적혀 있다. 그래서 실제 사용하는 언어만 명시적으로 제한했다. citeturn130086view2turn130086view3

이건 중요한 신호다.

> 현재 블로그는 이미 평범한 개인 블로그 규모를 벗어났다.

44,000개 코드 블록이면 빌드 성능 문제는 프레임워크 선택보다 **콘텐츠 처리량 문제**다.

### 안티패턴

- **Full Corpus Processing by Default**
- **Every Build Is a Release Build**
- **Prebuild Monolith**
- **Generated Asset Coupling**
- **Content Scale Hidden Behind More Heap**
- **Build Success by Memory Expansion**

8GB heap은 현실적인 대응이지만 근본 해결책은 아니다.

### 개선 방향

빌드 명령을 역할별로 나누는 것이 좋다.

```text
npm run build:fast
npm run build:content
npm run build:release
npm run audit
npm run og:changed
```

예를 들면:

### 로컬 빠른 빌드

```text
Astro build
변경된 글만 OG 생성
전체 audit 생략
```

### 배포 빌드

```text
Astro build
변경된 OG 생성
링크 검사
시리즈 검사
```

### 정기 품질 검사

```text
중복 주제
콘텐츠 신선도
이미지 커버리지
상위 문서 변경 여부
```

모든 검사를 매번 돌리는 것보다 **빈도와 목적을 분리**하는 게 맞다.

---

# 5. 네 번째 핵심 안티패턴

## Content Processing Pipeline as a Compiler  
### Markdown 파이프라인이 자체 언어처럼 성장함

현재 Markdown 처리에는 다음이 들어간다.

```text
remark-math
remark-directive
custom remark-callouts
rehype-slug
rehype-autolink-headings
rehype-katex
custom rehype-image-lazy
Expressive Code
```

설정 자체는 과도하다고 할 정도는 아니다. 기술 블로그에 필요한 기능들이다. citeturn130086view3

하지만 여기에는 장기적인 위험이 있다.

```text
Markdown
+
Directive 문법
+
Callout 문법
+
수식
+
자동 heading
+
코드 메타데이터
+
다이어그램 빌드 규칙
+
MDX 가능성
```

이들이 계속 늘면 콘텐츠가 일반 Markdown이 아니라 **Hawk Blog 전용 문서 언어**가 된다.

### 현재는 좋은 점도 있음

저장소에는 `.mdx` 파일이 없기 때문에 MDX integration을 제거했다고 설정에 명시되어 있다. 파서와 빌드 메모리를 아끼기 위한 좋은 판단이다. citeturn130086view3

그런데 `package.json`에는 아직 `@astrojs/mdx`와 `@milkdown/kit`, `marked`가 dependency로 남아 있다. citeturn130086view2

일부는 관리자 편집기나 별도 기능에서 사용할 가능성이 있지만, 실제 사용 여부를 검토할 가치가 있다.

### 경고 신호

- Markdown에서 특정 Astro component를 직접 import
- Callout 종류가 계속 증가
- 글에서 CSS class를 직접 사용
- custom directive마다 전용 renderer 추가
- 다이어그램 경로가 저장소 구조에 강하게 종속
- 다른 Markdown 도구에서 글이 읽히지 않음

### 권장

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

# 6. 다섯 번째 핵심 안티패턴

## Syntax Highlighting as a Build Bottleneck  
### 코드 하이라이팅이 콘텐츠 규모를 지배함

Expressive Code와 Shiki 선택은 기술 블로그에 적합하다.

현재 사용 언어도 실제 기술 스택에 맞춰 제한되어 있다.

- C/C++
- CUDA
- Rust
- Assembly
- CMake
- Makefile
- Verilog
- DTS
- TCL
- Python
- JavaScript
- GLSL 등

기본 약 200개 언어를 모두 불러오지 않고 실제 쓰는 언어만 지정한 것은 정확한 최적화다. citeturn130086view3

하지만 코드 블록이 약 44,000개라면 언어 수 최적화만으로는 한계가 있다.

## 발생 가능한 비용

- 모든 코드 블록에 대해 파싱
- 토큰화
- 테마별 색상 계산
- HTML 생성
- line number 처리
- meta 처리
- 두 개 테마 출력
- 대량 HTML 증가

현재 설정은 GitHub dark/light 두 테마를 생성한다. citeturn130086view3

README에는 과거 또는 기능 설명상 8개 런타임 테마 전환을 강조하지만, 실제 config는 두 개로 제한되어 있다. 이는 오히려 좋은 축소로 보인다. citeturn130086view1turn130086view3

### 핵심 질문

44,000개 코드 블록 중 정말 모두 syntax highlighting이 필요한가?

예를 들어 다음은 `text` 또는 단순 `<pre>`로 충분할 수 있다.

- 로그
- 디렉터리 구조
- 의사코드
- 명령 결과
- 레지스터 덤프
- 설정 출력
- 간단한 한두 줄 명령

### 권장

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

# 7. 여섯 번째 핵심 안티패턴

## Client-Side Full-Text Index  
### 전체 검색 인덱스를 클라이언트에 전달함

README는 검색 기능을 다음과 같이 설명한다.

```text
full-text JSON index
+
keyboard navigation modal
```

이는 서버가 없는 GitHub Pages에서 구현하기 좋은 방식이다. citeturn130086view1

하지만 글이 500개 이상이고 본문 길이가 길다면 검색 JSON은 빠르게 커질 수 있다.

### 발생 가능한 문제

- 첫 검색 시 큰 JSON 다운로드
- 모바일 메모리 사용 증가
- JSON 파싱으로 UI 일시 정지
- 전체 본문 복사로 배포 용량 증가
- 한국어 tokenization 품질 부족
- 전문 용어 검색 랭킹 부정확
- 코드 블록과 본문이 검색 노이즈를 생성
- 검색 결과 snippet 품질 저하

### 흔한 잘못된 방식

```json
{
  "title": "...",
  "description": "...",
  "content": "글 전체 HTML 또는 전체 텍스트"
}
```

글 전체를 무조건 인덱스에 넣으면 검색 정확도가 오히려 떨어질 수 있다.

예를 들어 모든 CXL 글에 공통 배경 설명이 들어 있으면, `PCIe` 검색 시 거의 모든 CXL 글이 결과에 나온다.

### 권장 검색 문서 모델

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

# 8. 일곱 번째 핵심 안티패턴

## Tailwind Convenience Becoming Semantic Loss  
### Tailwind 편의성이 사이트 의미 구조를 약화함

Tailwind 4 자체는 문제가 아니다. Astro와 결합하기도 편하고, 작은 개인 사이트에서는 생산성이 높다. 현재는 Vite plugin 방식으로 연결되어 있다. citeturn130086view2turn130086view3

문제는 블로그가 성장하면서 컴포넌트 템플릿이 다음처럼 변하는 경우다.

```html
<div class="flex items-center gap-2 rounded-lg border px-4 py-3 ...">
```

이런 스타일이 여러 컴포넌트에 반복되면:

- 디자인 규칙이 class 조합으로 분산됨
- Article, Guide, Series 간 시각 체계가 불분명
- 같은 역할인데 미세하게 다른 카드가 계속 생김
- 전역 리디자인이 어려워짐
- 콘텐츠 의미보다 화면 모양 중심으로 설계됨

### 안티패턴

- **Utility String as Component API**
- **Copy-Paste Design Tokens**
- **Semantic Role Hidden in Classes**
- **Card Variant Proliferation**
- **Responsive Behavior by Local Guessing**

### 권장

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

# 9. 여덟 번째 핵심 안티패턴

## Generated Asset Sprawl  
### 파생 자산이 원본 콘텐츠만큼 중요해짐

현재 사이트에는 다음 파생 자산이 있다.

- OG 이미지
- TikZ 변환 SVG
- 검색 인덱스
- Sitemap
- RSS
- 코드 하이라이트 결과
- 시리즈 목록
- 읽기 시간
- 태그·아카이브 페이지

개별적으로는 모두 유용하다.

문제는 시간이 지나면서 원본 Markdown보다 **파생 자산의 생성 규칙과 캐시 무효화**가 더 복잡해질 수 있다는 점이다.

### 대표적인 장애

- 글 제목은 바뀌었는데 OG 이미지는 이전 제목
- 다이어그램 소스는 변경됐는데 SVG가 갱신되지 않음
- 삭제한 글이 검색 인덱스에 남음
- 시리즈 순서가 변경됐는데 prev/next가 오래됨
- 이미지 파일은 지웠지만 HTML이 참조
- 배포 브랜치에 오래된 생성물이 남음

### 현재 좋은 점

OG 생성 스크립트에 `--prune` 옵션이 있고, 이미지·링크·시리즈 감사 스크립트도 따로 존재한다. 이는 이미 이 문제를 인지하고 있는 설계다. citeturn130086view2

### 개선 원칙

파생 자산은 반드시 다음 중 하나여야 한다.

```text
빌드 때 항상 재생성
또는
입력 fingerprint 기반 증분 생성
```

수동으로 “생성해두고 잊는” 방식은 피해야 한다.

그리고 가능하면 파생 파일은 Git에서 관리하지 않는 편이 단순하다. GitHub Pages 배포 과정에서 생성할 수 있다면 더욱 그렇다.

---

# 10. 아홉 번째 핵심 안티패턴

## Admin Capability Inside a Static Blog  
### 정적 블로그 안에 관리 애플리케이션을 넣음

`astro.config.mjs`에는 GitHub OAuth 지원을 위해 Vercel 또는 Netlify adapter를 붙이고 `hybrid` 출력으로 전환하는 설명이 있다. Sitemap에서는 `/admin` 페이지를 제외한다. citeturn130086view3

이는 저장소 안에 관리 또는 편집 기능이 있거나 계획되어 있음을 의미한다.

또한 dependency에는 Milkdown과 marked가 있다. citeturn130086view2

여기서 큰 아키텍처 분기점이 생긴다.

```text
정적 콘텐츠 사이트
+
브라우저 Markdown 편집기
+
GitHub 인증
+
저장 API
```

이들을 한 앱으로 만들면 더 이상 단순 GitHub Pages 블로그가 아니다.

### 왜 위험한가

- Static과 Hybrid 두 배포 모델을 동시에 지원
- PAT와 OAuth 두 인증 경로
- 비밀키 관리
- 편집기 상태관리
- GitHub API 오류 처리
- commit conflict
- rate limit
- preview와 실제 빌드 결과 차이
- 보안 표면 증가

### 권장 판단

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

# 11. 열 번째 핵심 안티패턴

## Configuration Surface Expansion  
### 설정 파일이 작은 CMS가 됨

현재 설정은 `defineSite`, `defineBranding`, `defineNav`, `defineSocial`, `defineComments`, `defineAnalytics`, `defineNewsletter` 등으로 나뉜다. citeturn130086view1

타입 안정성과 자동완성을 제공하므로 코드 품질 측면에서는 좋다.

그러나 설정 가능한 것이 계속 늘면 다음처럼 된다.

```text
Site
Branding
Navigation
Social
Comments
Analytics
Newsletter
About
Resume
Themes
Search
Series
SEO
OG
i18n
Admin
```

이 정도면 사실상 자체 CMS configuration schema다.

### 안티패턴 발생 기준

- 한 기능을 바꾸려면 여러 `define*` 설정 수정
- config 간 유효 조합이 많아짐
- enabled flag가 계속 생김
- 설정은 가능하지만 실제 테스트되지 않은 조합 증가
- 블로그에 항상 쓰는 기능도 optional abstraction으로 감쌈
- config 타입이 실제 UI 컴포넌트 구조를 노출

### 권장

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

# 12. 사용하지 않는 의존성 잔존 가능성

현재 config는 MDX integration을 제거했다고 명시하지만, package dependency에는 `@astrojs/mdx`가 남아 있다. citeturn130086view2turn130086view3

이것이 반드시 미사용이라는 뜻은 아니다. 스크립트나 편집기에서 동적으로 사용할 수도 있다.

그러나 이런 상태는 다음 안티패턴의 시작이다.

## Dependency Archaeology

> 왜 설치했는지 아무도 확신하지 못하지만 삭제하기 무서운 의존성.

검토할 후보:

- `@astrojs/mdx`
- `@milkdown/kit`
- `marked`
- `satori-html`
- 기타 관리자 페이지 전용 패키지

### 권장

CI에 정적 dependency 검사만 믿기보다는 용도 문서를 남기는 게 낫다.

```text
Package             Purpose
@milkdown/kit       Admin Markdown editor
marked              Live preview renderer
@astrojs/mdx        현재 미사용, 제거 예정
```

특히 빌드 메모리가 이미 문제라면 의존성 정리는 의미가 있다.

---

# 13. 현재 기술 스택에서 잘한 부분

안티패턴만 보면 구조가 나빠 보일 수 있는데, 실제로 잘한 부분이 많다.

## 13.1 정적 출력 유지

GitHub Pages에 맞게 `output: 'static'`을 유지하고 있다. citeturn130086view3

## 13.2 MDX 불필요 시 제거

실제 `.mdx`가 없다는 근거로 integration을 제거했다. citeturn130086view3

## 13.3 Shiki 언어 제한

실제 사용하는 언어만 로드해 빌드 메모리를 줄였다. citeturn130086view3

## 13.4 Prefetch 절제

모든 링크를 적극적으로 prefetch하지 않고 hover 전략을 사용한다. 콘텐츠가 많은 페이지에서 초기 부하를 줄이기 위한 적절한 선택이다. citeturn130086view3

## 13.5 Rehype 이미지 lazy 처리

이미지 lazy loading을 빌드 파이프라인에서 일관되게 적용한다. citeturn130086view3

## 13.6 품질 감사 자동화

링크, 시리즈, 이미지, 콘텐츠 신선도, 문체, 중복 주제까지 별도 스크립트로 관리한다. 개인 블로그 수준을 넘어선 좋은 운영 체계다. citeturn130086view2

---

# 14. 현재 기술 스택의 실제 위험 순위

| 순위 | 위험 | 수준 |
|---:|---|---|
| 1 | 대규모 콘텐츠로 인한 전체 빌드 비용 | 높음 |
| 2 | 블로그와 범용 테마 개발의 목표 충돌 | 높음 |
| 3 | 검색 인덱스의 용량·정확도 문제 | 중간~높음 |
| 4 | SPA 전환 생명주기 복잡성 | 중간 |
| 5 | 관리자 앱과 정적 사이트의 결합 | 중간 |
| 6 | 파생 자산 생성 파이프라인 확장 | 중간 |
| 7 | 전용 Markdown 문법 증가 | 중간 |
| 8 | Tailwind 스타일 의미 분산 | 낮음~중간 |
| 9 | 설정 표면 확대 | 낮음~중간 |
| 10 | 프레임워크 자체 선택 오류 | 낮음 |

여기서 중요한 건 **Astro를 버려야 하는 상황은 전혀 아니라는 것**이다.

오히려 Astro는 계속 유지하는 게 맞다.

---

# 15. 추천 목표 아키텍처

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

# 16. 이번 단계의 결론

현재 기술 스택은 **rich하지만 불합리하게 과한 스택은 아니다.**

네가 처음 걱정했던:

> “이게 rich하면서 nice한 architecture인가?”

에 대한 답은 다음이다.

> **기반 선택은 좋고, 개별 최적화도 상당히 잘되어 있다.**  
> 다만 프로젝트가 블로그에서 범용 퍼블리싱 플랫폼으로 확장되면서 아키텍처의 중심이 콘텐츠에서 프레임워크로 이동할 위험이 있다.

따라서 처음부터 다시 짠다고 해도 나는 여전히 다음 조합을 추천한다.

```text
Astro
Markdown
Tailwind 또는 단순 CSS
Expressive Code
KaTeX
GitHub Pages
작은 클라이언트 검색
```

바꿔야 할 것은 기술 스택이 아니라 **기능의 경계와 우선순위**다.

가장 먼저 할 일은:

1. 블로그 기능과 테마 제품 기능 구분
2. 빠른 빌드와 release build 분리
3. 검색 인덱스 크기와 구조 측정
4. 관리자 기능의 런타임 분리 검토
5. ClientRouter 의존 기능 목록화
6. 미사용 dependency 정리
7. 전용 Markdown 확장 사용 범위 제한

다음은 **Task 1-5. 성능·검색·SEO 구조 리뷰**다. 여기서는 실제 페이지 다운로드 구조, 검색 인덱스, JavaScript 의존성, 메타데이터, Sitemap, 내부 링크와 애드센스 관점까지 연결해서 보게 된다.

## 21. assistant

이번에는 **Task 1-5. 성능·검색·SEO 구조 리뷰**로 넘어간다. 이번 단계부터는 애드센스의 “콘텐츠 가치 부족” 문제와 직접 연결해 보겠다.

## 22. assistant

# Task 1-5. 성능·검색·SEO 구조 리뷰

이번 단계에서는 세 가지를 함께 본다.

1. 페이지가 실제로 얼마나 효율적으로 전달되는가  
2. 사용자가 원하는 글을 얼마나 쉽게 찾는가  
3. Google이 사이트와 개별 글의 가치를 얼마나 쉽게 이해할 수 있는가  

먼저 중요한 전제를 하나 잡자.

> **성능·검색·SEO는 서로 분리된 문제가 아니다.**

페이지가 빨라도 원하는 글을 못 찾으면 의미가 없다.  
검색 노출이 잘돼도 글 사이의 연결이 끊겨 있으면 한 페이지만 읽고 나간다.  
SEO 메타데이터가 완벽해도 콘텐츠가 비슷한 제목과 반복 설명으로 구성되면 사이트 가치는 약하게 보일 수 있다.

Google도 유용하고 독창적인 콘텐츠, 명확한 구조, 적절한 내부 링크, 좋은 페이지 경험을 함께 강조한다. 특히 콘텐츠를 새롭게 재해석하거나 직접 경험을 제공하고, 독자가 원하는 정보를 쉽게 찾도록 구성하는 것이 중요하다고 설명한다. citeturn117273search5turn117273search7turn117273search9

---

# 1. 먼저 실제 홈페이지에서 보이는 것

현재 홈의 핵심 구조는 다음처럼 읽힌다.

```text
Systems Notes

Hi, I'm Hawk
Software Engineer who loves C++, Modern C++, and sharing knowledge through writing.

Read the blog
About the author

최근 글
```

그리고 최근 글에는 UEFI Secure Boot, CXL 메모리 토폴로지, UEFI CXL 초기화, U-Boot PCIe Enumeration, CXL 장애 분석 같은 상당히 전문적인 글이 연속적으로 노출된다. citeturn682826view0

이 구조 자체는 깔끔하다. 하지만 SEO와 사용자 탐색 관점에서는 홈이 너무 많은 역할을 최근 글에 맡긴다.

현재 홈이 Google과 방문자에게 강하게 전달하는 정보는 대략 다음이다.

```text
개인 개발자
+
C++ 관심
+
최근에는 Bootloader와 CXL 글을 많이 씀
```

반면 실제 사이트의 장기적인 자산은 훨씬 넓을 가능성이 높다.

- C++
- CUDA
- Linux
- 임베디드
- 펌웨어
- PCIe
- CXL
- 컴퓨터 구조
- 디버깅
- 성능 최적화

따라서 지금 SEO의 핵심 문제는 단순 키워드 부족이 아니라:

> **사이트 전체의 전문 영역이 홈과 내부 링크 구조에서 충분히 표현되지 않는 것**

이다.

---

# 2. 첫 번째 핵심 안티패턴

## Homepage Semantic Underfitting  
### 홈이 사이트의 실제 의미를 충분히 담지 못함

현재 홈의 메인 자기소개는 C++ 중심이다. 하지만 최근 글은 CXL, UEFI, Bootloader, NUMA, PCIe 중심이다. citeturn682826view0

이 경우 Google이나 처음 방문한 사용자는 사이트의 전체 범위를 다음 중 하나로 좁게 오해할 수 있다.

- C++ 개인 블로그
- 최근 CXL 글을 쓰는 개인 블로그
- 임베디드 학습 기록
- 여러 주제가 섞인 개발 블로그

실제로는 더 강한 메시지가 가능하다.

```text
Systems Programming Knowledge Base
C++, Firmware, Computer Architecture, CUDA, PCIe and CXL
```

### 왜 중요한가

사이트 전체의 전문성을 이해하려면 다음 신호가 반복적으로 필요하다.

- 홈의 주제 설명
- 상단 내비게이션
- 주제 허브
- 글 내부 링크
- About
- 저자 소개
- 대표 가이드
- 구조화된 제목과 설명

현재는 개별 글 제목이 전문성을 보여주지만, 사이트 차원에서 이를 하나로 묶는 설명이 약하다.

### 개선안

홈 상단을 다음 세 층으로 구성하는 게 좋다.

```text
1. 사이트 정체성
2. 핵심 전문 분야
3. 대표 학습 경로
```

예:

```text
Systems Programming Notes

Deep technical guides on C++, firmware, Linux,
computer architecture, CUDA, PCIe and CXL.

Explore by topic:
C++ / Firmware / Linux / GPU / PCIe / CXL
```

이렇게 하면 홈이 단순 소개 페이지가 아니라 **사이트 전체의 의미적 중심점**이 된다.

---

# 3. 두 번째 핵심 안티패턴

## Recent-Post SEO Bias  
### 최근 글이 사이트의 검색 정체성을 과도하게 지배함

현재 홈에서 노출되는 최근 글 상당수가 Bootloader와 CXL 계열이다. citeturn682826view0

이건 해당 주제의 집중도를 보여주는 장점도 있다. 하지만 다른 중요한 주제가 홈에서 사라지면 사이트 전체 주제가 최근 작성 패턴에 따라 계속 바뀐다.

예를 들어 이번 달에 CXL 글이 많으면:

```text
사이트 ≈ CXL 블로그
```

다음 달에 CUDA 글이 많으면:

```text
사이트 ≈ CUDA 블로그
```

가 된다.

### 문제

- 오래된 핵심 글이 홈에서 계속 밀림
- 대표 주제 페이지로 링크가 집중되지 않음
- 내부 링크 권한이 최신 글에만 몰림
- 사이트의 장기 전문성을 해석하기 어려움
- 사용자가 한 분야를 체계적으로 탐색하기 어려움

### 개선안

홈을 네 구역으로 나누는 게 좋다.

```text
Start Here
Core Topics
Featured Guides
Latest Posts
```

#### Start Here

처음 온 독자를 위한 대표 진입점.

#### Core Topics

```text
C++
Systems Programming
Firmware
GPU & CUDA
PCIe
CXL
```

#### Featured Guides

오래됐어도 가치가 큰 대표 문서.

#### Latest Posts

현재처럼 최신 글을 보여주되 하단으로 이동.

이렇게 하면 홈이 시간순 피드와 지식 허브 역할을 동시에 할 수 있다.

---

# 4. 세 번째 핵심 안티패턴

## Search Index as a Dump  
### 검색 인덱스를 본문 저장소처럼 사용함

GitHub Pages 기반 정적 사이트에서는 클라이언트 검색이 현실적인 선택이다. 하지만 글 수가 많고 본문이 길다면, 검색 인덱스에 모든 텍스트를 넣는 방식은 오래 버티기 어렵다.

특히 기술 블로그에는 다음 노이즈가 많다.

- 코드 블록
- 로그
- 터미널 출력
- 반복되는 배경 설명
- 공통 면책 문구
- 시리즈 목차
- 참고문헌
- 긴 레지스터 덤프
- 표와 데이터

이 모든 것을 동일한 가중치로 검색하면 정확도가 떨어진다.

예를 들어 `PCIe`를 검색했을 때:

- PCIe 개념 가이드
- UEFI 글
- CXL 글
- XRT 글
- DMA 글
- 단순히 배경에서 PCIe를 언급한 글

이 모두 비슷하게 노출될 수 있다.

### 권장 검색 문서

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

### 제외하거나 낮게 가중할 것

```text
코드 전체
로그 전체
참고문헌
공통 템플릿 문구
시리즈 공통 목차
댓글
```

### 추천 가중치

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

# 5. 네 번째 핵심 안티패턴

## Search Without Intent  
### 검색어 일치만 있고 사용자 목적을 구분하지 못함

기술 검색은 같은 키워드라도 목적이 다르다.

예를 들어 `PCIe BAR`를 검색하는 사용자는 다음 중 하나를 원할 수 있다.

```text
BAR 개념이 궁금함
BAR 크기 탐색 알고리즘이 궁금함
Linux에서 BAR를 보는 방법이 궁금함
BAR mmap 오류를 해결하려 함
FPGA BAR 설계를 하려 함
```

단순 본문 일치 검색은 이들을 구분하지 못한다.

### 개선안

검색 결과에 콘텐츠 타입을 함께 표시한다.

```text
[Concept] PCIe BAR는 무엇인가
[Guide] PCIe 주소 공간과 BAR 완전 가이드
[Debug Note] BAR mmap 실패 원인 분석
[Reference] lspci BAR 확인 명령
[Source Walkthrough] Linux PCI BAR 할당 코드
```

이렇게 하면 사용자가 제목만 보는 것보다 훨씬 빠르게 원하는 결과를 선택할 수 있다.

### 추가 필터

검색 모달에 복잡한 UI를 만들 필요는 없지만 다음 정도는 가치가 있다.

```text
All
Guide
Debug
Reference
Experiment
```

그리고 주제 필터:

```text
C++
Linux
Firmware
CUDA
PCIe
CXL
```

검색 기능은 단순 키워드 검색에서 **지식 탐색기**로 진화할 수 있다.

---

# 6. 다섯 번째 핵심 안티패턴

## SEO Title Overloading  
### 제목에 너무 많은 개념을 넣음

현재 홈에 노출된 제목들은 정보량이 많다.

예를 들면 다음과 같은 구조다.

```text
UEFI Secure Boot 인증서 만료
— 2011→2023 CA 롤오버와 PQC 대비
```

또는:

```text
부트 시 메모리 토폴로지 결정
— DDR + CXL.mem 통합 인식
```

이런 제목은 전문 독자에게 매우 매력적이다. 실제로 무엇을 다루는지도 분명하다. citeturn682826view0

다만 모든 글이 계속 이런 방식으로 길어지면 다음 문제가 생길 수 있다.

- 검색 결과에서 제목 후반부 잘림
- 모바일 카드에서 제목이 지나치게 길어짐
- 제목에 핵심 키워드가 너무 많이 경쟁
- 시리즈 글끼리 제목 패턴이 유사해짐
- 제목과 설명이 같은 정보를 반복

### 올바른 방향

제목은 하나의 핵심 질문이나 메커니즘에 집중하고, 나머지는 description으로 넘긴다.

현재:

```text
EFI·UEFI에서 CXL 초기화
— CEDT 생성과 HDM Decoder 사전 설정
```

개선 예:

```text
UEFI는 CXL 장치를 어떻게 초기화하는가
```

설명:

```text
EDK II의 CEDT 생성, HDM Decoder 설정과
운영체제 handoff 과정을 분석한다.
```

현재 제목도 나쁘지 않다. 다만 **모든 관련 키워드를 제목에 다 넣지 않아도 된다.**

---

# 7. 여섯 번째 핵심 안티패턴

## Description as Subtitle Duplication  
### 메타 설명이 제목을 반복함

홈의 카드 설명은 비교적 구체적이고 좋다.

예를 들어 U-Boot 글은 Root Complex 초기화, Config Space scan, BAR sizing, resource 할당, CXL DVSEC 인식까지 설명한다고 명시한다. citeturn682826view0

이건 긍정적이다.

하지만 글이 많아지면 description이 다음처럼 되기 쉽다.

```text
제목:
U-Boot PCIe Enumeration 흐름 분석

설명:
U-Boot PCIe Enumeration 흐름을 분석합니다.
```

이건 거의 정보가 없다.

### 좋은 description의 역할

제목이 **무엇**을 다루는지 말한다면, 설명은 다음을 말해야 한다.

```text
어떤 범위인지
어떤 관점인지
어떤 결과를 얻는지
```

예:

```text
Root Complex 초기화부터 Configuration Space 스캔,
BAR 크기 탐색과 리소스 할당까지 U-Boot 소스 흐름을 추적한다.
```

현재 일부 카드 설명은 이미 이 방향에 가깝다. 이를 모든 핵심 글에 일관되게 적용하면 된다. citeturn682826view0

---

# 8. 일곱 번째 핵심 안티패턴

## Internal Link Underuse  
### 내부 링크가 단순 관련 글 추천에 머묾

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

### 내부 링크가 담당해야 하는 관계

```text
상위 개념
하위 개념
선행 지식
다음 단계
반대 사례
실험 결과
소스 분석
장애 사례
```

### 추천 링크 모델

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

# 9. 여덟 번째 핵심 안티패턴

## Orphaned High-Value Content  
### 오래된 핵심 글이 내부 링크를 잃음

글이 500개 이상이면 반드시 생기는 문제다.

과거에 잘 쓴 글이:

- 홈에서 밀림
- 최신 시리즈에서 링크되지 않음
- 태그 페이지 깊숙이 있음
- 검색으로만 발견됨
- 새로운 글이 같은 설명을 다시 작성함

이런 상태가 된다.

### 문제

글 자체의 품질이 높아도 사이트 구조상 중요도가 낮아 보인다.

### 해결

월별 또는 분기별로 다음을 계산해야 한다.

```text
Inbound internal links
Outbound internal links
Search impressions
Last updated
Content status
Topic hub inclusion
```

핵심 문서인데 내부 링크가 0~1개라면 구조적으로 고아 문서다.

### 우선 복구 대상

- 검색 유입이 있었던 글
- 내용이 여전히 유효한 글
- 여러 글의 선행 개념이 되는 글
- 직접 경험이나 실험이 담긴 글
- 경쟁 사이트에서 찾기 어려운 글
- 대표 포트폴리오로 활용할 글

---

# 10. 아홉 번째 핵심 안티패턴

## Topic Cannibalization  
### 비슷한 글들이 서로 검색 의도를 잠식함

현재 최근 글만 봐도 CXL과 Bootloader라는 큰 주제 안에서 여러 세부 글이 가까운 날짜에 연속적으로 생성되어 있다. citeturn682826view0

이 자체는 전문 시리즈로서 좋다.

하지만 다음과 같은 글이 다수 생기면 서로 경쟁할 수 있다.

```text
CXL 초기화
CXL 장치 초기화
UEFI CXL 초기화
Linux CXL 초기화
CXL 부팅 초기화 과정
```

검색엔진 입장에서는 어떤 글이 대표인지 불명확해진다.

### 해결 방식

주제마다 검색 의도를 명시적으로 나눈다.

```text
대표 Guide
→ 전체 흐름

Concept
→ 특정 메커니즘

Source Walkthrough
→ 구현 코드

Debug Note
→ 문제 해결

Reference
→ 명령과 필드
```

예:

```text
Guide:
CXL 시스템 초기화 전체 흐름

Concept:
HDM Decoder 초기화 원리

Source Walkthrough:
EDK II의 CEDT 생성 코드

Debug Note:
Linux에서 CXL 메모리가 NUMA 노드로 나타나지 않는 원인
```

이렇게 하면 비슷한 키워드가 들어가도 각 문서의 검색 의도가 달라진다.

---

# 11. 열 번째 핵심 안티패턴

## Series Page as Thin Content  
### 시리즈 페이지가 제목 목록만 제공함

시리즈나 태그 페이지가 단순히 글 목록만 보여주면 사용자에게 제공하는 고유 가치가 작다.

예:

```text
CXL Series

- 글 1
- 글 2
- 글 3
- 글 4
```

이건 탐색에는 도움이 되지만 독립적인 콘텐츠 가치는 낮다.

### 좋은 시리즈 허브

```text
CXL Memory Systems

이 시리즈가 다루는 문제
대상 독자
필요한 선행 지식
전체 시스템 지도
추천 읽기 순서
각 글의 역할
현재 완성도
```

예:

```text
1. CXL 프로토콜 개요
2. PCIe Enumeration과 DVSEC
3. HDM Decoder
4. Linux CXL Core
5. NUMA와 Memory Tiering
6. 장애 분석
```

각 항목에는 한두 문장의 설명이 필요하다.

### 애드센스 관점

태그와 시리즈 페이지가 얕은 목록 페이지로 대량 생성되면, 사이트 전체에 내용이 적은 페이지가 많아질 수 있다.

모든 목록 페이지를 색인할 필요는 없다.

#### 색인 가치가 높은 페이지

- 내용이 충분한 Topic Hub
- 설명이 있는 Series Hub
- 대표 Guide
- 큐레이션된 카테고리

#### 색인 가치가 낮은 페이지

- 글이 1~2개뿐인 태그
- 거의 동일한 태그 페이지
- 날짜별 아카이브
- 단순 페이지네이션
- 중복 필터 결과

필요하면 이런 페이지는 `noindex, follow`를 고려할 수 있다. 단, 실제 검색 트래픽과 Search Console 데이터를 확인한 뒤 적용해야 한다.

---

# 12. 열한 번째 핵심 안티패턴

## Tag Vocabulary Drift  
### 태그 이름이 시간이 지나면서 분열됨

기술 블로그에서 흔한 사례다.

```text
cpp
c++
modern-c++
cplusplus
cxx
```

또는:

```text
embedded
firmware
bsp
bootloader
u-boot
uefi
```

이들은 모두 필요할 수도 있지만 분류 원칙이 없으면 태그가 계속 증가한다.

### 태그 역할을 제한해야 함

태그는 계층 구조가 아니다.

태그는 다음처럼 **횡단 속성**에 적합하다.

```text
performance
debugging
postmortem
tutorial
benchmark
linux
hardware
```

반면 핵심 주제는 Topic이나 Category로 관리하는 편이 좋다.

```text
C++
CUDA
PCIe
CXL
Firmware
Linux Kernel
```

### 추천 규칙

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

# 13. 열두 번째 핵심 안티패턴

## Structured Data Without Content Model  
### 구조화 데이터만 넣고 실제 문서 구조는 그대로임

SEO 개선 과정에서 흔히 생기는 오해다.

```text
Article JSON-LD 추가
Breadcrumb JSON-LD 추가
Person JSON-LD 추가
```

이것들은 도움이 될 수 있다.

하지만 실제 콘텐츠 구조가 불명확하면 JSON-LD만 추가해도 근본 문제가 해결되지 않는다.

### 먼저 필요한 것

- 한 페이지에 명확한 H1
- 작성자 정보
- 게시일과 수정일
- 대표 이미지
- 설명
- 주제
- Breadcrumb
- 관련 글
- 페이지 유형
- 최신성 상태

그다음 이를 구조화 데이터로 표현한다.

### 추천 구조화 데이터

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

### 주의

구조화 데이터에는 화면에 보이지 않는 내용을 과장해서 넣으면 안 된다.

---

# 14. 열세 번째 핵심 안티패턴

## Date Ambiguity  
### 작성일·수정일·검증일이 혼동됨

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

### 왜 중요한가

오래된 글도 여전히 정확할 수 있다.  
최근에 수정됐어도 실제 환경에서 다시 검증되지 않았을 수 있다.

이 둘은 다르다.

### 추천 표시

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

# 15. 열네 번째 핵심 안티패턴

## Core Web Vitals Score Chasing  
### 점수 자체를 제품 목표로 삼음

Google이 현재 권장하는 Core Web Vitals 목표는 대략 다음과 같다.

- LCP: 2.5초 이내
- INP: 200ms 미만
- CLS: 0.1 미만 citeturn117273search1

하지만 Google도 좋은 점수만으로 상위 노출이 보장되는 것은 아니며, 완벽한 점수를 얻기 위한 과도한 최적화가 항상 최선은 아니라고 설명한다. citeturn117273search3

### 잘못된 접근

```text
Lighthouse 100이 아니면 실패
```

### 올바른 접근

```text
실제 사용자가 글을 불편 없이 읽는가
```

네 사이트에서는 다음 항목이 더 중요하다.

- 긴 기술 글의 첫 화면이 빠르게 뜨는가
- 코드 블록 때문에 레이아웃이 흔들리지 않는가
- 수식이 늦게 로딩되며 줄바꿈을 바꾸지 않는가
- 글꼴 교체로 CLS가 생기지 않는가
- 검색 모달을 열 때 멈추지 않는가
- 페이지 전환 후 스크롤과 TOC가 정상인가
- 모바일에서 긴 코드가 본문 폭을 깨지 않는가
- 광고가 코드·표·다이어그램 사이에 끼지 않는가

---

# 16. 성능에서 특히 측정해야 할 것

내가 현재 공개 페이지와 저장소 구조만 보고 확정할 수 없는 부분이 있다.

실제 다음 수치는 Lighthouse, PageSpeed Insights, Chrome DevTools, Search Console로 측정해야 한다.

```text
초기 HTML 크기
CSS 크기
초기 JavaScript 크기
검색 인덱스 크기
폰트 다운로드 크기
LCP 자원
CLS 원인
INP 병목
페이지별 이미지 크기
Giscus 로딩 비용
AdSense 삽입 후 변화
```

따라서 이번 리뷰에서 “느리다”고 단정하는 것은 부정확하다.

대신 구조상 반드시 측정해야 하는 후보를 정할 수 있다.

## 페이지 유형별 측정

### 홈

- Hero 이미지
- 최신 글 카드
- 폰트
- ClientRouter

### 일반 글

- 코드 블록 0개
- 코드 블록 10개
- 코드 블록 100개 이상
- 수식 포함
- 다이어그램 포함

### 검색

- 검색 버튼 클릭부터 입력 가능 시점
- 인덱스 다운로드 크기
- JSON parse 시간
- 첫 결과 표시 시간

### 댓글 포함 글

- Giscus 로딩 전후
- CLS
- 네트워크 요청 증가

---

# 17. 열다섯 번째 핵심 안티패턴

## Heavy Article Tail  
### 글 하단에 기능이 계속 쌓임

기술 글 하단에는 흔히 다음 기능이 붙는다.

```text
관련 글
시리즈 탐색
이전/다음
저자 소개
공유 버튼
댓글
뉴스레터
광고
태그
수정 이력
참고문헌
```

각각은 유용하지만 모두 붙이면 글의 끝이 무거워진다.

### 독자 관점

본문을 다 읽었는데 이후에 무엇을 해야 하는지 너무 많은 선택지가 생긴다.

### 추천 우선순위

```text
1. 핵심 결론
2. 다음에 읽을 글
3. 상위 Topic Hub
4. 참고문헌
5. 댓글
```

공유 버튼, 뉴스레터, 저자 카드, 태그, 광고는 보조적이다.

### 애드센스 주의

Google은 광고가 콘텐츠를 방해하거나 독자가 주요 내용을 읽기 어렵게 만들지 않도록 권장한다. citeturn117273search5turn117273search3

특히 네 글은 코드와 다이어그램이 많을 가능성이 있으므로 자동 광고가 다음 사이에 들어가면 읽기 흐름을 심하게 깨뜨릴 수 있다.

- 코드 블록과 설명
- 로그와 분석
- 그림과 캡션
- 실험 결과 표와 해석
- 단계별 절차 중간

자동 광고를 쓰더라도 핵심 기술 문서에서는 수동 배치 또는 제한된 광고 위치가 더 적합할 수 있다.

---

# 18. 열여섯 번째 핵심 안티패턴

## AdSense-Driven Page Inflation  
### 승인을 위해 얕은 페이지를 더 많이 생성함

애드센스가 “콘텐츠 가치 부족”을 지적했다고 해서 다음 방식으로 대응하면 오히려 악화될 수 있다.

```text
짧은 글을 더 많이 씀
비슷한 키워드별로 글을 분리
일반 개념 설명을 대량 생성
AI로 글 수를 빠르게 늘림
모든 태그 페이지를 색인
FAQ 페이지를 자동 생성
```

Google은 검색 변형마다 별도 콘텐츠를 대량 생성하는 것이 품질을 높이지 않으며, 일반적이고 쉽게 재생산 가능한 콘텐츠보다 직접 경험과 독특한 관점이 있는 콘텐츠를 강조한다. citeturn117273search9turn117273search17

네 사이트에서 더 가치 있는 대응은 다음이다.

```text
기존의 좋은 글을 대표 문서로 승격
실제 로그와 실험 추가
환경과 버전 추가
실패 사례 추가
관련 글 연결
짧은 중복 글 통합
주제 허브 작성
```

즉, 페이지 수보다 **고유 정보 밀도와 구조**가 중요하다.

---

# 19. 애드센스 “콘텐츠 가치 부족”과 현재 사이트의 연결

Google이 개별 사이트의 거절 이유를 세부적으로 공개하지 않기 때문에, 정확한 원인을 외부에서 단정할 수는 없다.

하지만 현재 구조를 기준으로 보면 다음 가능성을 우선 확인해야 한다.

## 가능성 A. 글 수 부족

가능성은 낮아 보인다.

이미 글 수와 주제 범위가 상당히 많다면, 단순 수량 문제가 아닐 가능성이 크다.

## 가능성 B. 얕은 글 또는 중복 글의 비율

가능성이 있다.

특히 3분 읽기 글처럼 짧은 글이 많고, 유사한 주제가 여러 글로 나뉘었다면 사이트 전체적으로 얕게 보일 수 있다. 홈에도 3분 읽기 콘텐츠가 확인된다. 다만 짧다고 무조건 낮은 가치인 것은 아니다. citeturn682826view0

## 가능성 C. 사이트 목적 불명확

가능성이 높다.

홈은 일반적인 C++ 개발자 소개인데 실제 콘텐츠는 시스템·펌웨어·CXL 중심이다. 사이트의 전문 영역이 명확하게 하나의 구조로 묶이지 않는다. citeturn682826view0

## 가능성 D. 기존 자료 재서술 비중

확인 필요.

사양, 공식 문서, 다른 블로그 내용을 요약한 글의 비중이 높고 직접 경험·검증·해석이 적으면 낮은 가치로 판단될 여지가 있다.

## 가능성 E. 얕은 태그·시리즈·아카이브 페이지

확인 필요.

목록형 페이지가 다량 색인되면 사이트의 평균적인 콘텐츠 밀도가 낮아질 수 있다.

## 가능성 F. 필수 신뢰 페이지 부족

확인 필요.

- About
- Contact
- Privacy Policy
- 사이트 목적
- 작성자 전문성
- 콘텐츠 작성 원칙
- 수정 정책

홈에는 About 링크가 존재한다. 그러나 실제 About 페이지의 내용과 개인정보 처리방침·연락 수단 구성은 별도 감사가 필요하다. citeturn682826view0

## 가능성 G. 콘텐츠가 지나치게 AI 문체처럼 보임

확인 필요.

특정 기간에 유사한 구조와 제목의 글이 짧은 간격으로 대량 게시되었다면, 자동 생성 또는 대량 생산 인상을 줄 수 있다. 현재 홈에는 2026년 6월 18~19일에 CXL·Bootloader 글이 연속적으로 게시된 모습이 보인다. 이것만으로 AI 생성이라고 판단할 수는 없지만, 직접 경험과 검증 흔적을 더 명확하게 보여줄 필요가 있다. citeturn682826view0

---

# 20. 가장 중요한 개선 우선순위

## P0. 측정부터 할 것

다음 숫자를 먼저 확보해야 한다.

```text
Search Console 색인 페이지 수
발견됨-현재 색인되지 않음
크롤링됨-현재 색인되지 않음
페이지별 노출과 클릭
상위 검색어
Core Web Vitals
검색 인덱스 파일 크기
태그·시리즈·아카이브 페이지 수
고아 문서 수
글별 내부 링크 수
```

측정 없이 SEO를 수정하면 추측에 의존하게 된다.

---

## P1. 홈을 Topic 중심으로 개편

현재:

```text
Hero
Latest Posts
```

개선:

```text
Hero
Core Topics
Start Here
Featured Guides
Latest Posts
```

---

## P1. 대표 Topic Hub 5개 작성

처음부터 모든 분야를 만들 필요는 없다.

```text
C++
Systems Programming
Firmware & Bootloader
GPU & CUDA
PCIe & CXL
```

각 허브에는 최소 다음이 있어야 한다.

```text
분야 설명
대상 독자
선행 지식
추천 학습 순서
대표 글
디버깅 글
레퍼런스
```

---

## P1. 핵심 글 20개 내부 링크 재설계

각 글에:

```text
상위 주제
선행 글
관련 개념
다음 글
```

을 추가한다.

---

## P1. 짧고 유사한 글 통합 후보 찾기

기준:

```text
읽기 시간 1~3분
유사 제목
본문 중복
같은 검색 의도
독립적인 실험이나 경험 없음
```

짧은 글이라고 무조건 합치지는 않는다. 독립적인 문제 해결 가치가 있으면 유지한다.

---

## P2. 검색 인덱스 최적화

- 코드·로그 제외
- 제목·소제목 가중치 강화
- 콘텐츠 타입 추가
- topic 필터 추가
- 인덱스 크기 측정
- 검색 모달 열 때 지연 로드

---

## P2. 콘텐츠 상태 표시

```text
Current
Updated
Needs Review
Historical
Superseded
```

---

## P2. 신뢰 구조 강화

- 작성자 경력과 전문 분야
- 실제 검증 환경
- 직접 실험 여부
- 참고 사양
- 수정일
- 오류 제보 방법
- 개인정보 처리방침
- 연락 수단

---

# 21. 이번 단계의 최종 진단

현재 사이트의 문제를 단순하게 말하면:

> **SEO가 약해서 콘텐츠 가치가 낮아 보이는 것이 아니라, 콘텐츠의 실제 전문성과 구조가 검색·탐색 계층에 충분히 반영되지 않았다.**

성능 측면에서는 Astro 정적 출력이라는 기반이 좋다. 현재 확인된 정보만으로 사이트가 느리다고 단정할 근거는 없다.

검색 측면에서는 글이 많을수록 단순 전문 검색만으로 한계가 생긴다. 콘텐츠 타입, 주제, 학습 단계가 함께 검색돼야 한다.

SEO 측면에서는 제목과 설명은 상당히 구체적인 편이지만, 홈·Topic Hub·내부 링크가 사이트 전체 전문성을 하나로 묶어주지 못한다.

애드센스 관점에서는 새 글을 더 많이 만드는 것보다 다음이 먼저다.

```text
기존 콘텐츠 통합
대표 문서 선정
주제 허브 구축
직접 경험 강화
얕은 색인 페이지 정리
저자·검증 정보 강화
```

이 작업이 끝나면 Google뿐 아니라 실제 독자도 이 사이트를 단순한 개발 블로그가 아니라 **전문적인 시스템 엔지니어링 지식베이스**로 인식하기 쉬워진다.

## 23. assistant

이번에는 **Task 1-6. 유지보수성과 확장성 리뷰**다. 핵심은 “지금 잘 돌아가는가”보다 **글 1,000개·기능 2배가 되었을 때도 관리 가능한가**를 보는 것이다.

## 24. assistant

# Task 1-6. 유지보수성과 확장성 리뷰

이번 질문은 단순하다.

> 현재 구조가 글 1,000개, 코드 블록 10만 개, 기능 2배가 되어도 유지될 수 있는가?

현재 저장소는 이미 일반적인 개인 블로그 수준을 넘어섰다. 약 984개 커밋이 있고, 장문 기술 문서·시리즈·수식·다이어그램·검색·OG 이미지·댓글·관리 기능까지 하나의 프로젝트에서 다룬다. 설정에는 약 44,000개 코드 블록을 고려한 메모리 최적화도 들어가 있다. citeturn214183view0turn214183view2

결론부터 말하면:

> 현재 구조는 꽤 체계적이지만, 규모가 커질수록 **콘텐츠 유지보수 비용보다 플랫폼 유지보수 비용이 더 빨리 증가할 위험**이 있다.

---

## 1. 첫 번째 핵심 안티패턴

## Blog Becoming an Internal Platform  
### 블로그가 내부 플랫폼으로 변함

현재 저장소는 다음 역할을 동시에 담당한다.

```text
콘텐츠 저장소
정적 사이트 생성기
범용 블로그 테마
검색 시스템
OG 이미지 생성기
다이어그램 빌드 시스템
콘텐츠 감사 도구
관리자 편집기
배포 파이프라인
```

README도 이 프로젝트를 개인 사이트가 아니라 “장문의 기술 글을 위한 프리미엄 Astro 테마”로 소개한다. 시리즈, 8개 코드 테마, 수식, TikZ, SPA 전환, 검색, 인쇄, 접근성까지 범용 기능으로 설명한다. citeturn214183view0

처음에는 하나의 저장소가 편하다. 하지만 장기적으로 다음 문제가 생긴다.

- 글을 쓰려다 테마 코드를 수정하게 됨
- 사이트 개선이 곧 프레임워크 개선이 됨
- 개인 요구와 범용 요구가 충돌함
- 기능 하나마다 설정과 문서가 늘어남
- 사용하지 않는 기능도 호환성을 위해 유지함
- 콘텐츠 리팩토링보다 플랫폼 정리가 더 어려워짐

### 판단 기준

새 기능이 생길 때 다음을 구분해야 한다.

```text
콘텐츠 기능인가?
사이트 기능인가?
테마 기능인가?
운영 도구인가?
관리자 기능인가?
```

이 구분 없이 모두 `src`, `scripts`, `config`에 계속 추가하면 경계가 무너진다.

---

# 2. 두 번째 핵심 안티패턴

## Repository Boundary Collapse  
### 저장소 경계가 제품 경계를 반영하지 못함

현재 구조에서 특히 충돌 가능성이 높은 부분은 다음 세 가지다.

```text
공개 블로그
범용 테마
콘텐츠 관리 도구
```

이들은 같은 콘텐츠를 공유할 수 있지만 생명주기가 다르다.

## 공개 블로그

- 안정성 우선
- 정적 출력
- 최소 JavaScript
- 빠른 배포
- SEO 중심

## 범용 테마

- 설정 가능성 우선
- 여러 사용 사례 지원
- API 안정성
- 문서와 버전 관리
- 회귀 테스트 필요

## 관리자 도구

- 인증
- 편집 상태
- GitHub API
- 저장 실패 처리
- 충돌 해결
- 보안 관리

현재 `astro.config.mjs`에는 GitHub OAuth를 위해 Vercel이나 Netlify adapter를 추가하고 `hybrid` 출력으로 바꾸는 경로가 주석으로 남아 있다. 공개 사이트는 `static`, 관리자 기능은 `hybrid`가 필요할 수 있다는 뜻이다. citeturn214183view2

### 장기적인 권장 경계

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

### 최소 분리안

```text
hawk90.github.io
- 실제 블로그
- 실제 콘텐츠
- 실제 배포

hawk-blog-theme
- 재사용 가능한 테마

hawk-blog-tools
- audit, OG, diagrams, migration
```

개인 블로그가 우선이라면 테마 분리를 미루고, 관리자 기능만 별도 앱으로 빼는 것도 합리적이다.

---

# 3. 세 번째 핵심 안티패턴

## Configuration as Architecture  
### 설정 파일이 아키텍처를 대신함

현재 README는 거의 모든 설정이 `src/consts/config.ts`에 있고, `defineSite`, `defineBranding`, `defineNav`, `defineComments`, `defineAnalytics`, `defineNewsletter` 같은 helper를 통해 관리된다고 설명한다. 런타임 비용은 거의 없고 타입 자동완성을 제공한다는 점은 좋다. citeturn214183view0

그러나 설정 항목이 계속 늘어나면 다음처럼 된다.

```text
defineSite
defineBranding
defineNav
defineSocial
defineComments
defineAnalytics
defineNewsletter
defineSearch
defineSeries
defineTheme
defineAdmin
defineResume
defineAbout
defineAds
defineSEO
```

이 상태에서는 설정이 단순 값 모음이 아니라 **작은 애플리케이션 프레임워크의 공개 API**가 된다.

### 문제

- 설정 조합 수가 폭증
- 실제 사용하지 않는 조합도 존재
- `enabled: false`가 계속 늘어남
- 컴포넌트가 설정 스키마에 종속
- 설정 변경이 여러 화면에 영향을 줌
- 어느 설정이 필수인지 불명확
- 개인 사이트인데 범용 제품 수준의 호환성을 고민함

### 개선 원칙

설정을 세 층으로 제한하는 게 좋다.

```text
1. Identity
2. Content behavior
3. External integrations
```

예:

```ts
site = {
  title,
  description,
  author,
  url,
  locale,
};

content = {
  pagination,
  search,
  series,
};

integrations = {
  analytics,
  comments,
  newsletter,
};
```

나머지는 코드의 고정 정책으로 두는 편이 단순할 수 있다.

> 모든 것을 설정 가능하게 만드는 것은 유연성이 아니라 책임 회피가 될 수 있다.

---

# 4. 네 번째 핵심 안티패턴

## Script Ecosystem Without Ownership  
### 운영 스크립트가 별도 시스템으로 성장함

현재 `package.json`에는 다음과 같은 관리 명령이 있다.

- OG 생성과 정리
- TikZ 다이어그램 빌드
- 책 노트 동기화
- 게시 전 품질 게이트
- 외부 자료 신선도 검사
- 내부 링크 검사와 자동 수정
- 시리즈 무결성 검사
- 이미지 커버리지
- 로드맵 낡음 검사
- 문체 낡음 검사
- 문체 일관성
- 중복 주제 검사 citeturn214183view1

이건 매우 좋은 자동화다. 하지만 관리 도구가 많아지면 또 하나의 제품이 된다.

```text
scripts/
  build-og.mjs
  audit-internal-links.py
  resolve-internal-links.py
  audit-series-integrity.py
  audit-tone-consistency.py
  ...
```

### 장기 위험

- Node, Python, Bash가 혼재
- 공통 Markdown 파싱 로직 중복
- 경로와 front matter 규칙 중복
- 한 스크립트의 수정이 다른 스크립트와 불일치
- 로컬과 CI 환경 차이
- 자동 수정 스크립트가 예상치 못한 대량 변경 생성
- 스크립트의 성공 기준이 문서화되지 않음
- 어떤 감사가 차단형인지 경고형인지 불분명

### 대표적인 안티패턴

- **One Script, One Parser**
- **Path Convention Duplication**
- **Audit Rule Drift**
- **Automation Without Test Fixtures**
- **Fixer Without Dry Run**
- **CI as the Only Documentation**

### 개선 방향

공통 코어를 만들 필요가 있다.

```text
content-tools/
  parser
  schema
  link-graph
  diagnostics
  reporters
  commands
```

각 명령은 동일한 콘텐츠 모델을 사용해야 한다.

```text
parse once
→ build content graph
→ run rules
→ emit reports
```

현재처럼 각 Python·Node 스크립트가 Markdown을 다시 읽고 별도로 해석하면 규칙이 어긋날 가능성이 높다.

---

# 5. 다섯 번째 핵심 안티패턴

## Multi-Language Tooling Tax  
### 운영 도구 언어가 늘어남

현재 빌드와 감사 체계에는 최소한 다음 언어가 사용된다.

```text
JavaScript / MJS
Python
Bash
TypeScript
Astro
```

각 언어를 쓴 이유는 이해된다.

- Astro와 OG: JavaScript
- 콘텐츠 분석: Python
- 다이어그램: Bash
- 타입과 UI: TypeScript

문제는 규모가 커지면 실행 환경이 복잡해진다는 것이다.

### 발생 가능한 문제

- Node만 설치하면 빌드가 안 됨
- Python 버전 차이
- Bash가 Windows에서 동작하지 않음
- Python package dependency가 숨겨짐
- 스크립트별 인코딩 처리 차이
- YAML parser 동작 차이
- 날짜 파싱 차이
- glob 규칙 차이

### 반드시 통일할 필요는 없음

모든 스크립트를 TypeScript로 다시 쓰는 것도 비용이다.

대신 다음을 명확히 해야 한다.

```text
지원 운영체제
필수 런타임 버전
외부 명령
설치 방법
입력과 출력
실패 코드
```

예:

```text
Node 22.12+
Python 3.12+
Bash 5+
LaTeX/TikZ optional
```

README에는 Node 요구 버전은 명확히 적혀 있지만, Python과 Bash 기반 감사·다이어그램 도구의 전체 요구사항은 더 분명히 관리할 필요가 있다. citeturn214183view0turn214183view1

---

# 6. 여섯 번째 핵심 안티패턴

## Build Stability by Increasing Heap  
### 메모리를 늘려 빌드 안정성을 유지함

현재 production build는 Node heap을 기본 8GB로 설정한다.

```text
NODE_OPTIONS=--max-old-space-size=8192
```

그리고 설정 주석에는 약 44,000개의 코드 블록으로 인해 Shiki 기본 언어 전체를 불러오면 heap이 압박된다고 적혀 있다. 실제 사용하는 언어만 제한한 것은 좋은 최적화다. citeturn214183view1turn214183view2

그러나 메모리를 늘려 빌드를 통과시키는 방식은 규모 확장에 한계가 있다.

```text
현재 44,000개
→ 8GB

향후 80,000개
→ 12GB?

향후 100,000개
→ 16GB?
```

### 위험

- GitHub Actions runner 메모리 한계
- 로컬 노트북에서 빌드 어려움
- CI 실패가 불규칙해짐
- garbage collection 시간 증가
- 작은 수정도 전체 corpus 처리
- 프레임워크 업그레이드 시 메모리 사용 변화

### 필요한 지표

빌드 시간을 한 숫자로만 보면 부족하다.

```text
총 빌드 시간
peak RSS
Markdown parse 시간
Shiki 시간
OG 시간
검색 인덱스 시간
페이지 생성 시간
출력 HTML 크기
```

### 추천

빌드 예산을 정한다.

```text
로컬 증분 확인: 10초 이하
일반 production build: 5분 이하
최대 peak memory: 4GB 이하
release audit: 별도 수행
```

정확한 목표 수치는 환경에 따라 바뀔 수 있지만, 예산 없이 최적화하면 8GB가 12GB가 되는 식으로 흘러간다.

---

# 7. 일곱 번째 핵심 안티패턴

## Content Model Drift  
### 오래된 글마다 front matter 규칙이 달라짐

글이 수백 개 이상이면 콘텐츠 스키마가 반드시 변한다.

초기 글:

```yaml
title:
date:
tags:
```

최근 글:

```yaml
title:
description:
date:
updated:
series:
seriesOrder:
image:
draft:
```

앞으로는 다음이 추가될 수 있다.

```yaml
type:
topics:
difficulty:
status:
lastVerified:
prerequisites:
related:
```

### 문제

- 일부 글에는 description 없음
- 날짜 타입이 문자열과 Date 혼재
- 태그 대소문자 불일치
- 시리즈 이름 오타
- 순서 중복
- 이미지 경로 규칙 혼재
- 과거 글을 읽을 때 fallback 코드 증가
- 모든 컴포넌트가 optional field 처리

README의 기본 포스트 예시는 제목·날짜·설명·태그·시리즈·시리즈 순서를 사용한다. 폴더 구조가 URL 구조가 되는 방식도 명시되어 있다. citeturn214183view0

### 권장

콘텐츠 스키마에 버전 개념을 넣는 것이 좋다.

```yaml
schemaVersion: 2
```

다만 모든 글에 직접 넣기보다 migration 도구가 현재 스키마를 보장하도록 해도 된다.

### 최소 필요 사항

- 단일 schema 정의
- migration script
- deprecated field 목록
- fallback 종료 일정
- 콘텐츠 validation
- 일괄 수정 dry-run

중요한 원칙은 다음이다.

> 오래된 데이터를 영원히 호환하는 것보다 한 번 마이그레이션하고 코드를 단순하게 유지하는 편이 낫다.

---

# 8. 여덟 번째 핵심 안티패턴

## URL as Content Taxonomy  
### 폴더 구조가 URL과 지식 분류를 동시에 담당함

현재 README는 `src/content/blog/` 아래의 폴더 구조가 URL 구조가 된다고 설명한다. citeturn214183view0

이 방식은 이해하기 쉽다.

```text
src/content/blog/cpp/memory/allocator.md
→ /cpp/memory/allocator/
```

하지만 시간이 지나면 문제가 생긴다.

예를 들어 글 하나가 다음 주제에 모두 속할 수 있다.

```text
C++
Linux
NUMA
Performance
Memory
```

폴더는 하나만 선택할 수 있다.

### 문제

- 지식 분류 변경이 URL 변경으로 이어짐
- 글 이동 시 외부 링크가 깨짐
- 어떤 폴더가 상위 주제인지 논쟁
- 주제가 교차하는 글을 배치하기 어려움
- 폴더가 카테고리와 URL과 저장 위치를 모두 담당
- 리팩토링 비용이 너무 커짐

### 개선 방향

URL과 저장 위치를 분리하는 게 좋다.

```yaml
slug: pcie-bar-sizing
topics:
  - pcie
  - firmware
```

실제 파일은 작성 편의에 따라 둘 수 있다.

```text
content/posts/2026/pcie-bar-sizing.md
```

URL은 안정적으로 유지한다.

```text
/posts/pcie-bar-sizing/
```

다만 현재 URL이 이미 많이 색인됐다면 대규모 변경은 위험하다. 앞으로 신규 글부터 slug를 명시하고, 기존 글은 유지하는 점진적 방식이 적합하다.

---

# 9. 아홉 번째 핵심 안티패턴

## Component Proliferation by Page Variation  
### 페이지 변형마다 컴포넌트가 증가함

블로그 기능이 늘면 다음이 생기기 쉽다.

```text
PostCard
FeaturedPostCard
CompactPostCard
SeriesPostCard
SearchPostCard
RelatedPostCard
TopicPostCard
LatestPostCard
```

처음에는 디자인 요구가 다르지만 점점 중복이 생긴다.

### 문제

- metadata 표시 규칙 불일치
- 어떤 카드에는 수정일, 다른 카드에는 작성일
- 태그 표시 개수 다름
- 접근성 label 다름
- 제목 줄 수 다름
- 수정 시 여러 컴포넌트 변경
- UI가 미묘하게 불일치

### 반대편 안티패턴

모든 것을 하나의 거대한 컴포넌트로 만들면 다음이 된다.

```astro
<PostCard
  featured
  compact
  horizontal
  showTags
  showDescription
  showSeries
  showReadingTime
  ...
/>
```

이것도 관리하기 어렵다.

### 권장

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

# 10. 열 번째 핵심 안티패턴

## CSS Drift Under Utility Composition  
### Tailwind 조합이 디자인 시스템을 분산시킴

Tailwind는 빠르지만 규모가 커지면 다음 조합이 파일마다 복제될 수 있다.

```text
rounded-xl border bg-surface p-5 shadow-sm
```

조금씩 다른 카드가 쌓이면:

```text
p-4
p-5
p-6

rounded-lg
rounded-xl
rounded-2xl
```

로 분열된다.

### 장기 문제

- 디자인 변경이 검색·치환 작업이 됨
- 모바일 breakpoint가 컴포넌트마다 다름
- 다크 모드 규칙이 분산
- 글 본문과 일반 UI spacing이 섞임
- CSS payload보다 사람의 인지 비용이 커짐

### 권장

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

# 11. 열한 번째 핵심 안티패턴

## Integration Lifecycle Entanglement  
### 외부 기능의 생명주기가 사이트에 침투함

현재 또는 계획상 외부 통합은 다음을 포함한다.

- Giscus
- Analytics
- Newsletter
- AdSense
- GitHub OAuth
- GitHub API

각 서비스는 로딩 방식과 실패 방식이 다르다.

### 발생 가능한 문제

- ClientRouter 전환 후 Giscus 중복 생성
- Analytics pageview 누락
- 광고 재삽입
- Newsletter iframe이 CLS 발생
- OAuth 설정 때문에 static output 포기
- 외부 서비스 장애가 페이지 렌더링에 영향
- CSP 정책이 복잡해짐

### 권장 경계

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

# 12. 열두 번째 핵심 안티패턴

## Optional Feature Permanence  
### 실험 기능이 영구 유지 대상이 됨

개인 프로젝트에서는 기능을 빠르게 실험할 수 있다.

- Zen mode
- 코드 테마 전환
- 제목 morph
- 관리자 편집기
- Newsletter
- Resume
- 인쇄 모드

문제는 한 번 공개된 기능을 삭제하기 어려워진다는 점이다.

### 발생하는 일

- 사용자는 거의 없지만 코드 유지
- 삭제하면 회귀처럼 느껴짐
- 설정과 문서가 남음
- dependency가 제거되지 않음
- 테스트 범위 증가
- 핵심 기능 개선 시간이 줄어듦

### 기능 유지 기준

기능마다 다음을 기록하면 좋다.

```text
목적
실사용 여부
운영 비용
의존성
삭제 조건
```

예:

```text
기능: 런타임 코드 테마 변경
목적: 독자 취향
실사용 측정: 없음
비용: CSS/HTML 증가
삭제 조건: 3개월 사용률 1% 미만
```

개인 블로그라 꼭 분석 이벤트를 모두 수집할 필요는 없다. 다만 적어도 “왜 유지하는가”는 설명할 수 있어야 한다.

---

# 13. 열세 번째 핵심 안티패턴

## Dependency Residue  
### 제거한 기능의 의존성이 남음

`astro.config.mjs`에는 저장소에 `.mdx` 파일이 하나도 없어서 MDX integration을 제거했다고 명시되어 있다. 그런데 `package.json`에는 `@astrojs/mdx`가 dependency로 남아 있다. citeturn214183view1turn214183view2

반드시 미사용이라는 뜻은 아니다. 다른 도구가 참조할 수 있다. 하지만 이런 불일치는 의존성 잔존 여부를 감사해야 한다는 신호다.

다른 검토 후보도 있다.

```text
@milkdown/kit
marked
@astrojs/mdx
satori-html
```

관리자 편집기나 OG 생성에서 필요할 수 있지만 용도가 외부에서 즉시 드러나지는 않는다.

### 문제

- 취약점 업데이트 범위 증가
- lockfile 규모 증가
- 설치 시간 증가
- 빌드와 무관한 패키지까지 production dependency
- 삭제 가능 여부 판단이 어려움

### 권장

의존성을 역할별로 나눈다.

```text
runtime dependencies
build dependencies
content tooling
editor-only dependencies
```

그리고 package마다 한 줄의 소유 목적을 기록한다.

---

# 14. 열네 번째 핵심 안티패턴

## Audit Without Remediation Workflow  
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

# 15. 열다섯 번째 핵심 안티패턴

## No Content Deprecation Strategy  
### 글은 추가되지만 사라지지 않음

기술 블로그는 시간이 지나면 정보가 낡는다.

하지만 일반적인 운영은 다음과 같다.

```text
새 글 작성
새 글 작성
새 글 작성
```

기존 글은 거의 그대로 남는다.

### 결과

- 오래된 명령
- 사라진 API
- 버전이 다른 글끼리 충돌
- 같은 주제의 구판과 신판 공존
- 사용자가 어느 글을 믿어야 할지 모름
- Google이 대표 문서를 판단하기 어려움

### 필요한 상태 모델

```text
draft
current
needs-review
historical
superseded
archived
```

### 예

```yaml
status: superseded
supersededBy: /posts/new-cuda-stream-guide/
```

기존 URL은 유지하되 상단에 명확히 표시한다.

```text
이 문서는 CUDA 11.8 기준의 이전 자료입니다.
현재 가이드는 여기에서 확인하세요.
```

삭제보다 연결된 폐기가 중요하다.

---

# 16. 열여섯 번째 핵심 안티패턴

## Migration Avoidance  
### 기존 글이 많다는 이유로 구조 개선을 미룸

500개 이상의 글이 있으면 다음 생각이 들기 쉽다.

> 전부 고치기 어렵기 때문에 현재 구조를 유지하자.

이 방식은 단기적으로 편하지만, 새로운 기능마다 오래된 형식 호환 코드가 늘어난다.

```text
if old date
if no description
if legacy category
if old image path
if old series format
```

### 권장

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

# 17. 열일곱 번째 핵심 안티패턴

## Documentation and Implementation Divergence  
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

# 18. 열여덟 번째 핵심 안티패턴

## No Architectural Decision Record  
### 중요한 판단의 이유가 코드 주석에만 남음

현재 config에는 좋은 설명이 많이 있다.

- MDX를 제거한 이유
- Shiki 언어를 제한한 이유
- prefetch를 hover로 제한한 이유
- static과 hybrid 출력 차이 citeturn214183view2

이런 주석은 훌륭하다. 하지만 아키텍처 결정이 주석에만 있으면 나중에 맥락이 사라질 수 있다.

### ADR 후보

```text
ADR-001 Astro static output 유지
ADR-002 MDX를 기본 콘텐츠에서 제외
ADR-003 ClientRouter는 progressive enhancement로 사용
ADR-004 검색은 client-side index로 제공
ADR-005 관리자 편집기는 별도 런타임으로 분리
ADR-006 폴더 구조와 URL 결합 정책
```

ADR은 길 필요 없다.

```markdown
# Decision

순수 Markdown을 기본으로 한다.

# Context

글이 많아 MDX parser와 component coupling 비용이 큼.

# Consequences

일반 글의 이식성 향상.
Interactive component 사용 제한.
```

네가 이미 설계 이유를 많이 생각하는 타입이기 때문에 ADR이 특히 잘 맞는다.

---

# 19. 현재 유지보수성에서 잘한 부분

지금 구조가 나쁘다는 뜻은 아니다. 오히려 다음은 매우 좋다.

## 19.1 요구 Node 버전 명시

Node `>=22.12.0`을 명시하고 `.nvmrc`를 제공한다. citeturn214183view0turn214183view1

## 19.2 콘텐츠 감사 자동화

내부 링크, 시리즈, 이미지, 신선도, 문체, 중복을 자동 검사한다. citeturn214183view1

## 19.3 빌드 병목을 코드 주석으로 기록

44,000개 코드 블록과 Shiki 메모리 문제를 명시하고 언어를 제한했다. citeturn214183view2

## 19.4 순수 Markdown 우선

실제 사용하지 않는 MDX integration을 제거했다. citeturn214183view2

## 19.5 파생 자산 정리 기능

OG 생성에 `--prune`이 있고 별도 강제 생성 명령도 있다. citeturn214183view1

## 19.6 설정에 타입 계약 사용

`define*` helper가 런타임 비용 없이 타입 안정성과 자동완성을 제공한다. citeturn214183view0

즉, 현재는 무질서한 코드베이스라기보다 **좋은 자동화가 빠르게 늘어나면서 다음 단계의 구조화가 필요한 시점**이다.

---

# 20. 유지보수 위험 우선순위

| 순위 | 위험 | 수준 |
|---:|---|---|
| 1 | 콘텐츠 사이트와 범용 테마 목표 충돌 | 높음 |
| 2 | 전체 corpus 빌드의 메모리·시간 증가 | 높음 |
| 3 | 운영 스크립트별 콘텐츠 해석 중복 | 높음 |
| 4 | 콘텐츠 스키마 드리프트 | 중간~높음 |
| 5 | URL과 폴더·분류 체계 결합 | 중간~높음 |
| 6 | README와 실제 구현 드리프트 | 중간 |
| 7 | 관리자 기능과 정적 사이트 결합 | 중간 |
| 8 | 외부 통합 생명주기 복잡성 | 중간 |
| 9 | 사용하지 않는 기능과 의존성 잔존 | 중간 |
| 10 | Tailwind·컴포넌트 변형 확산 | 낮음~중간 |

---

# 21. 추천 리팩토링 순서

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

# 22. 이번 단계의 최종 진단

현재 `hawk90.github.io`는 유지보수가 엉망인 프로젝트가 아니다.

오히려:

- 타입 기반 설정
- 자동 감사
- 메모리 최적화
- 순수 Markdown
- 파생 자산 관리

등을 보면 상당히 체계적이다.

다만 지금은 **잘 만든 개인 블로그가 내부 퍼블리싱 플랫폼으로 넘어가는 경계**에 있다.

가장 큰 위험은 코드 품질이 아니라 이것이다.

> 블로그를 개선하려다가 블로그 프레임워크를 계속 개발하게 되는 것.

따라서 다음 단계의 핵심은 새 기술을 추가하는 게 아니다.

```text
역할 경계
콘텐츠 스키마
빌드 예산
도구 공통화
기능 폐기
문서 현실화
```

이 여섯 가지를 잡는 것이다.

다음은 Task 1의 마지막인 **1-7. 종합 진단과 개선 우선순위**다. 지금까지 본 정체성·정보 구조·콘텐츠·기술 스택·성능·유지보수 문제를 한 장의 구조로 합치고, 무엇부터 고쳐야 하는지 결정하게 된다.

## 25. assistant

# Task 1-7. 종합 진단과 개선 우선순위

지금까지 본 내용을 한 문장으로 요약하면 이렇다.

> `hawk90.github.io`는 콘텐츠가 부족한 블로그가 아니라, 이미 축적된 전문 콘텐츠의 가치가 정보 구조·콘텐츠 모델·사이트 아키텍처에서 충분히 드러나지 않는 블로그다.

즉 문제의 중심은 **글의 개수**가 아니다.

```text
콘텐츠는 많음
전문성도 높음
자동화도 잘되어 있음

하지만

사이트 정체성
지식 구조
대표 문서
글 간 관계
콘텐츠 역할
운영 우선순위

가 명확하지 않음
```

---

# 1. 현재 사이트의 성숙도

현재 블로그를 일반적인 성숙도 단계로 나누면 다음과 같다.

## 1단계: 개인 기록

```text
글을 작성한다
날짜순으로 보여준다
```

## 2단계: 전문 기술 블로그

```text
주제가 일관된다
검색 유입이 발생한다
전문성을 보여준다
```

## 3단계: 기술 지식베이스

```text
주제별 체계가 있다
대표 문서가 있다
글 간 연결이 있다
학습 순서가 있다
```

## 4단계: 퍼블리싱 플랫폼

```text
테마
검색
콘텐츠 감사
OG 생성
관리 도구
다이어그램 빌드
자동화
```

현재 `hawk90.github.io`는 이상하게도:

```text
콘텐츠 측면에서는 2~3단계
플랫폼 측면에서는 4단계
```

에 가깝다.

즉 **사이트 기반시설은 상당히 발전했는데, 콘텐츠를 지식 체계로 보여주는 층은 상대적으로 덜 발전했다.**

이 불균형이 현재 가장 중요한 진단이다.

---

# 2. 가장 큰 구조적 문제

## Platform Ahead of Knowledge Architecture

### 플랫폼이 지식 구조보다 앞서감

현재 사이트는 다음을 이미 갖추고 있거나 중요하게 다룬다.

- 정적 빌드
- 코드 하이라이팅
- 검색
- OG 이미지
- 시리즈
- 댓글
- 수식
- 다이어그램
- 페이지 전환
- 콘텐츠 감사
- 관리자 기능 가능성

그런데 사용자가 실제로 가장 필요로 하는 다음 구조는 상대적으로 약하다.

```text
어디서 시작해야 하는가
이 글의 상위 개념은 무엇인가
이 글 다음에 무엇을 읽어야 하는가
이 분야의 대표 문서는 무엇인가
이 글은 튜토리얼인가, 레퍼런스인가
현재도 유효한 정보인가
```

이 때문에 플랫폼은 풍부하지만 방문자 입장에서는 여전히 **많은 글이 있는 블로그**로 보일 수 있다.

### 우선순위 원칙

앞으로 한동안은 다음처럼 판단해야 한다.

```text
새로운 사이트 기능 추가
<
기존 콘텐츠의 구조화
```

예를 들어 새로운 애니메이션, 코드 테마, 관리자 기능보다 다음 작업이 우선이다.

- Topic Hub
- Start Here
- 대표 Guide
- 관련 글 연결
- 글 유형 표시
- 검증 환경 표시
- 오래된 글 상태 표시

---

# 3. 핵심 안티패턴 10개

지금까지 분석한 내용을 압축하면 다음 10개가 핵심이다.

## 1. Identity–Content Mismatch

홈의 자기소개와 실제 콘텐츠의 깊이·범위가 다르다.

```text
표현:
C++를 좋아하는 개발자 블로그

실제:
C++, CUDA, Firmware, Linux, PCIe, CXL,
컴퓨터 구조와 디버깅을 다루는 전문 기술 아카이브
```

---

## 2. Chronological Architecture

사이트가 지식 구조보다 작성 날짜에 따라 조직된다.

```text
Latest Posts
→ 개별 글
→ 끝
```

---

## 3. Article Warehouse

좋은 글은 많지만 각 글이 하나의 지식 체계로 묶이지 않는다.

```text
글 + 글 + 글
```

이지,

```text
Topic
→ Guide
→ Concept
→ Experiment
→ Debug Note
```

가 아니다.

---

## 4. Post Homogeneity

모든 콘텐츠가 동일한 포스트 형식으로 처리된다.

- 개념 설명
- 튜토리얼
- 디버깅 기록
- 실험
- 소스 분석
- 레퍼런스

가 제목·날짜·태그·본문이라는 같은 모델에 들어간다.

---

## 5. Expertise Without Evidence Architecture

전문 지식은 있지만 다음이 일관되게 구조화되지 않는다.

- 테스트 환경
- 버전
- 관찰 결과
- 공식 근거
- 작성자의 해석
- 한계
- 마지막 검증일

---

## 6. Theme Product and Personal Blog Convergence

개인 블로그와 범용 Astro 테마가 같은 방향으로 성장한다.

그 결과 콘텐츠보다 플랫폼 기능이 우선될 위험이 있다.

---

## 7. Full Corpus Processing

글 하나를 고쳐도 전체 콘텐츠와 코드 블록을 다시 처리하는 구조가 커진다.

메모리를 더 늘려 해결하는 방식은 장기적으로 한계가 있다.

---

## 8. Content Model Drift

오래된 글과 새로운 글의 metadata·시리즈·태그·설명 규칙이 점점 달라진다.

---

## 9. Search Index as a Dump

검색을 위해 본문 전체를 그대로 인덱싱하면 코드·로그·반복 설명이 노이즈가 된다.

검색은 존재하지만 지식 탐색 도구는 아니다.

---

## 10. AdSense-Driven Page Inflation

“콘텐츠 가치 부족”을 글 수 부족으로 해석해 비슷하고 짧은 글을 더 생성할 위험이 있다.

실제로 필요한 것은 페이지 증가보다 기존 콘텐츠의 구조·독창성·신뢰성 강화다.

---

# 4. 현재 사이트의 강점

진단이 부정적으로만 보여서는 안 된다. 현재 구조에는 확실한 강점이 있다.

## 콘텐츠 측면

- 시스템 분야의 고급 주제를 많이 다룸
- 흔하지 않은 CXL·PCIe·Firmware 자료가 있음
- 저수준 소프트웨어와 하드웨어를 함께 다룰 수 있음
- C++, CUDA, 임베디드까지 연결되는 범위가 넓음
- 일반적인 입문 블로그보다 전문성이 높음

## 기술 측면

- Astro 정적 출력은 콘텐츠 사이트에 적합
- Markdown 중심으로 이식성이 비교적 좋음
- 불필요한 MDX 사용을 줄임
- Shiki 언어 범위를 실제 사용 언어로 제한
- 내부 링크와 시리즈 감사 도구가 존재
- OG·이미지·신선도·중복 검사 자동화가 있음
- GitHub Pages를 사용해 운영 비용이 낮음

## 운영 측면

- 문제를 자동화로 해결하려는 습관이 있음
- 설계 판단이 코드 주석에 남아 있음
- 빌드 병목을 이미 인지하고 있음
- 단순 글 작성보다 품질 관리까지 고려하고 있음

따라서 필요한 것은 전면 재작성이나 기술 스택 교체가 아니다.

> 이미 좋은 기반 위에서 중심축을 플랫폼에서 지식 구조로 옮기는 작업이 필요하다.

---

# 5. 목표 사이트 모델

최종적으로는 다음 구조가 가장 적합하다.

```text
Hawk Systems Knowledge Base

├── Start Here
│   ├── Systems Programming Roadmap
│   ├── C++ Roadmap
│   └── Firmware Roadmap
│
├── Topics
│   ├── C++
│   ├── Linux & Systems
│   ├── Firmware & Bootloader
│   ├── GPU & CUDA
│   ├── PCIe
│   └── CXL
│
├── Content Types
│   ├── Guides
│   ├── Concepts
│   ├── Debug Notes
│   ├── Experiments
│   ├── Source Walkthroughs
│   └── References
│
├── Featured Guides
│
└── Latest Posts
```

최신 글은 없어지는 것이 아니라 가장 아래 층으로 내려간다.

사이트의 중심은:

```text
최신성
```

이 아니라:

```text
주제와 학습 가치
```

가 된다.

---

# 6. 개선 우선순위

모든 문제를 한 번에 고치면 프로젝트가 또 커진다. 따라서 우선순위를 엄격하게 나누는 게 좋다.

---

## P0. 방향 결정

가장 먼저 해야 한다.

### 1. 저장소 목적 선언

```text
hawk90.github.io의 1차 목적은
개인 기술 지식베이스 운영이다.

범용 블로그 테마 개발은 2차 목적이다.
```

이 한 문장이 이후 기능 판단 기준이 된다.

### 2. 핵심 독자 정의

추천 독자는 다음 정도다.

```text
중급 이상의 C++·시스템·임베디드 개발자
저수준 소프트웨어와 하드웨어 경계를 공부하는 개발자
실제 장애 분석과 내부 동작을 찾는 엔지니어
```

모든 초보자를 대상으로 할 필요는 없다.

### 3. 핵심 분야 제한

홈에서 보여줄 핵심 분야를 5~6개로 제한한다.

```text
C++
Systems Programming
Firmware & Bootloader
GPU & CUDA
PCIe
CXL
```

태그는 많아도 되지만 최상위 주제는 적어야 한다.

---

## P1. 사용자에게 바로 보이는 구조 개선

### 1. 홈 개편

현재:

```text
Hero
Latest Posts
```

목표:

```text
Hero
Core Topics
Start Here
Featured Guides
Latest Posts
```

### 2. Topic Hub 5개 생성

초기에 추천하는 허브는 다음이다.

```text
C++
Systems Programming
Firmware & Bootloader
GPU & CUDA
PCIe & CXL
```

처음부터 PCIe와 CXL을 분리하지 않고 한 허브로 시작해도 된다.

### 3. 대표 문서 20개 선정

기준:

- 직접 경험이 들어감
- 검색 가치가 있음
- 내용이 여전히 유효함
- 다른 글의 기반이 됨
- 네 전문성을 잘 보여줌

이 20개가 사이트의 중심 문서가 된다.

### 4. 내부 링크 재설계

대표 문서마다 다음을 추가한다.

```text
상위 Topic
선행 지식
관련 개념
다음 글
```

---

## P1. 콘텐츠 가치 강화

### 1. 콘텐츠 타입 지정

최소 다음 6개면 충분하다.

```text
Guide
Concept
Debug Note
Experiment
Source Walkthrough
Reference
```

### 2. 핵심 글 구조 보완

대표 글부터 다음을 확인한다.

- 글의 목적
- 대상 독자
- 테스트 환경
- 버전
- 관찰
- 근거
- 해석
- 한계
- 결론
- 관련 글

### 3. 신뢰 정보 추가

특히 기술 변화가 빠른 글에는 다음을 표시한다.

```text
Published
Updated
Last Verified
Status
Tested Environment
```

### 4. 짧고 중복된 글 통합

다음 조건을 동시에 만족하는 글을 우선 검토한다.

- 동일한 검색 의도
- 배경 설명 중복
- 고유 실험이나 경험 없음
- 각각 너무 짧음
- 서로 강하게 의존

---

## P2. 기술 구조 개선

### 1. 빌드 프로파일링

측정할 항목:

```text
전체 빌드 시간
peak memory
Markdown 처리
Shiki 처리
검색 인덱스 생성
OG 생성
최종 출력 크기
```

### 2. 빠른 빌드와 배포 빌드 분리

```text
dev/fast
release
audit
```

를 분리한다.

### 3. 검색 인덱스 재설계

전체 본문 복사 대신:

- title
- description
- headings
- topics
- type
- keywords
- 핵심 excerpt

를 사용한다.

코드와 로그는 기본 검색에서 제외하거나 낮은 가중치를 준다.

### 4. 콘텐츠 manifest

모든 감사 스크립트가 각자 Markdown을 해석하지 않고, 공통 manifest를 사용하게 한다.

```json
{
  "slug": "...",
  "title": "...",
  "topics": [],
  "type": "...",
  "status": "...",
  "links": []
}
```

---

## P2. 유지보수 구조

### 1. 콘텐츠 스키마 정리

현재 필요한 최소 스키마:

```yaml
title:
description:
published:
updated:
type:
topics:
status:
```

모든 필드를 필수로 만들지는 않는다.

### 2. 오래된 글 상태 모델

```text
current
needs-review
historical
superseded
archived
```

### 3. 문서와 구현 일치

README에서:

- 현재 기능
- 실험 기능
- 계획 기능
- 제거된 기능

을 구분한다.

### 4. 관리자 기능 경계

공개 블로그의 static 구조를 깨는 관리자·OAuth 기능은 별도 앱 또는 명확히 분리된 package로 관리한다.

---

## P3. 나중에 해도 되는 것

다음은 우선순위가 낮다.

- 프레임워크 교체
- Astro 제거
- Tailwind 제거
- 전면적인 URL 변경
- 전체 글 metadata 일괄 수정
- 모든 페이지 디자인 재작성
- 검색엔진 서버 구축
- 복잡한 지식 그래프 시각화
- 모든 콘텐츠를 MDX로 변환
- 별도 CMS 구축

이런 작업은 흥미롭지만 현재 핵심 문제를 직접 해결하지 않는다.

---

# 7. 하지 말아야 할 것

이번 개선 과정에서 특히 피해야 할 행동이다.

## 1. 새 프레임워크로 다시 작성

Astro가 현재 문제의 원인이 아니다.

Next.js, SvelteKit, Nuxt 등으로 바꿔도 정보 구조 문제는 그대로 남는다.

## 2. 500개 글 전체를 한 번에 수정

범위가 너무 커져서 끝나지 않을 가능성이 높다.

대표 글 20개부터 시작해야 한다.

## 3. 안티패턴마다 기능을 개발

예:

```text
고아 문서가 있다
→ 자동 추천 AI 개발

태그가 많다
→ 태그 관리 시스템 개발

검색이 약하다
→ 벡터 데이터베이스 구축
```

기능보다 수동 큐레이션이 먼저다.

## 4. 애드센스 승인을 위해 글을 대량 생성

유사한 설명형 글을 늘리면 오히려 사이트의 평균 정보 밀도가 낮아질 수 있다.

## 5. 모든 페이지에 광고 배치

기술 문서는 코드·표·다이어그램의 흐름이 중요하다. 자동 광고가 설명 중간에 들어가면 페이지 경험이 나빠질 수 있다.

## 6. 모든 태그 페이지를 색인

설명이 없는 얕은 목록 페이지는 사이트 가치 강화에 큰 도움이 되지 않는다.

---

# 8. 애드센스와의 연결

애드센스의 “콘텐츠 가치 부족”이 정확히 어떤 내부 기준 때문인지는 외부에서 단정할 수 없다.

다만 현재 사이트에서는 다음 가설이 합리적이다.

```text
콘텐츠가 실제로 없음
```

보다는:

```text
기존 콘텐츠의 고유 가치와 전문성이
사이트 구조에서 충분히 드러나지 않음
```

가능성이 더 커 보인다.

따라서 애드센스 대응도 다음 순서가 맞다.

```text
1. 대표 주제 명확화
2. Topic Hub 생성
3. 핵심 글의 고유 경험 강화
4. 중복·얕은 콘텐츠 정리
5. 내부 링크 강화
6. 저자·검증·수정 정보 강화
7. 얕은 색인 페이지 정리
8. 재신청
```

광고 승인은 결과이고, 사이트 품질 개선이 원인이다.

---

# 9. 현실적인 첫 번째 실행 묶음

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

# 10. Task 1의 최종 결론

Technical Blog Architecture Review의 최종 평가는 다음과 같다.

| 영역 | 평가 | 핵심 문제 |
|---|---|---|
| 콘텐츠 전문성 | 높음 | 가치 표현이 약함 |
| 콘텐츠 양 | 매우 많음 | 구조화 부족 |
| 사이트 정체성 | 보통 | 실제 주제보다 좁게 표현 |
| 정보 구조 | 약함 | 시간순 중심 |
| 콘텐츠 모델 | 보통 이하 | 모든 글이 동일한 포스트 |
| 기술 스택 | 좋음 | 교체 필요 없음 |
| 성능 기반 | 좋음 | 콘텐츠 규모 증가가 위험 |
| 검색 | 기능은 있음 | 의미·의도 기반 탐색 부족 |
| SEO | 개별 글은 구체적 | 사이트 전체 주제 구조 약함 |
| 유지보수 자동화 | 높음 | 스크립트와 플랫폼 경계 확장 |
| 장기 확장성 | 보통 | 플랫폼 복잡성이 빠르게 증가 |
| 애드센스 준비도 | 개선 필요 | 고유 가치와 신뢰 구조 강화 필요 |

최종적으로는 이렇게 정리할 수 있다.

> 기술적으로는 다시 만들 필요가 없다.  
> 콘텐츠도 무작정 더 만들 필요가 없다.  
> 지금 필요한 것은 이미 가진 지식을 분류하고, 연결하고, 대표화하는 일이다.

이것으로 **Task 1: Technical Blog Architecture Review**는 마무리다.

다음 Task는 **Technical Blog Anti-pattern Catalog**다. 여기서는 지금까지의 사이트 진단과 분리해서, Astro·정적 사이트·기술 블로그·지식베이스에서 발생하는 안티패턴을 카탈로그 형식으로 하나씩 정리하게 된다.

## 26. assistant

# Task 2-1. Technical Blog Anti-pattern Catalog  
## Architecture 분야

이제부터는 `hawk90.github.io`에만 한정하지 않고, **Astro·Markdown·GitHub Pages 기반의 대형 기술 블로그와 지식베이스에서 반복적으로 발생하는 보편적 안티패턴**을 카탈로그 형태로 정리하자.

각 항목은 다음 형식으로 간다.

```text
이름
증상
왜 문제인가
발생 조건
개선 방향
hawk90 적용 포인트
```

이번에는 Architecture 분야 20개만 다룬다.

---

## A-01. Article Warehouse

### 글 창고

사이트가 다음처럼 구성된다.

```text
글
글
글
글
글
```

각 글의 품질은 나쁘지 않지만, 사이트 전체에서 어떤 지식 체계를 이루는지는 보이지 않는다.

### 증상

- 홈은 최신 글 목록 중심
- 카테고리는 단순 분류
- 글 사이의 선행·후속 관계가 없음
- 대표 가이드가 없음
- 특정 주제를 배우려면 검색해야 함
- 오래된 핵심 글이 묻힘

### 왜 문제인가

글이 늘어날수록 사이트의 가치는 증가해야 하는데, 실제로는 탐색 비용이 더 빠르게 증가한다.

```text
콘텐츠 증가
→ 선택지 증가
→ 탐색 난도 증가
→ 좋은 글 발견률 감소
```

### 발생 조건

- 100개 이상의 글
- 여러 전문 분야를 동시에 다룸
- 시리즈보다 단편 글이 많음
- 최근 글 중심 홈
- 내부 링크를 수동으로 거의 넣지 않음

### 개선 방향

```text
Topic
├── Guide
├── Concept
├── Experiment
├── Debug Note
└── Reference
```

글을 단순 게시물이 아니라 주제 아래의 역할 있는 문서로 배치한다.

### hawk90 적용

C++, CUDA, Firmware, PCIe, CXL 글을 단순 목록이 아니라 주제 허브 아래에 배치해야 한다.

---

## A-02. Chronological Architecture

### 시간순 아키텍처

게시 날짜가 사이트의 가장 중요한 구조가 된다.

```text
2026년 글
2025년 글
2024년 글
```

### 증상

- 최신 글은 잘 보임
- 과거의 대표 글은 점점 뒤로 밀림
- 연속 학습이 어려움
- 글 작성 시점과 지식 순서가 일치하지 않음
- 검색 유입 없이는 오래된 글을 찾기 어려움

### 왜 문제인가

기술 지식은 시간순으로 배우지 않는다.

PCIe를 공부하는 사람은 최신 PCIe 글보다 다음 순서를 원한다.

```text
Configuration Space
→ Enumeration
→ BAR
→ MSI/MSI-X
→ DMA
→ IOMMU
```

### 개선 방향

시간축은 보조 탐색으로 남기고, 주제축을 중심에 둔다.

```text
Primary navigation: Topic
Secondary navigation: Series
Tertiary navigation: Date
```

### hawk90 적용

홈에서 최신 글은 하단으로 내리고 `Start Here`, `Core Topics`, `Featured Guides`를 먼저 둔다.

---

## A-03. Flat Knowledge Model

### 평면 지식 모델

모든 주제가 동일한 깊이에 놓인다.

```text
C++
Linux
CUDA
PCIe
BAR
MSI
CXL
NUMA
```

### 증상

- 상위 개념과 하위 개념이 구분되지 않음
- 태그가 계층 구조를 대신함
- 주제마다 같은 크기의 메뉴 항목이 생김
- 세부 개념이 최상위 탐색에 노출됨

### 왜 문제인가

독자는 개념의 위치를 파악하지 못한다.

예를 들어 `BAR`가 PCIe의 하위 개념이라는 사실이 구조에서 드러나지 않는다.

### 개선 방향

```text
PCIe
├── Architecture
├── Configuration Space
├── Enumeration
├── BAR
├── Interrupt
│   ├── INTx
│   ├── MSI
│   └── MSI-X
└── DMA
```

### 주의

폴더 구조를 깊게 만들라는 뜻은 아니다. URL과 지식 계층은 분리할 수 있다.

---

## A-04. Missing Topic Hub

### 주제 허브 부재

특정 주제의 글은 많지만 그 주제를 대표하는 페이지가 없다.

### 증상

- `CXL` 태그 페이지는 있음
- CXL 글 목록도 있음
- 하지만 CXL 전체를 설명하는 시작 페이지는 없음
- 어떤 글부터 읽어야 하는지 모름
- 분야 전체의 범위가 보이지 않음

### 왜 문제인가

개별 글은 검색어 하나에 답하지만, 허브는 다음 질문에 답한다.

> 이 분야 전체를 어떻게 이해해야 하는가?

### 좋은 허브 구성

```text
주제 소개
대상 독자
선행 지식
전체 구조도
추천 학습 순서
대표 가이드
실험 글
디버깅 글
레퍼런스
```

### hawk90 적용

우선 다음 두 개부터 만드는 것이 효과적이다.

```text
Firmware & Bootloader
PCIe & CXL
```

---

## A-05. Article-First Design

### 글 우선 설계

새로운 정보를 작성할 때 항상 새 글부터 만든다.

```text
새로운 내용 발견
→ 새 Markdown 파일 생성
```

### 증상

- 기존 대표 글을 확장하지 않음
- 비슷한 주제의 짧은 글이 누적됨
- 하나의 개념이 여러 글에 분산됨
- 동일한 서론을 반복함
- 글 수가 곧 생산성처럼 느껴짐

### 왜 문제인가

모든 지식 단위가 독립적인 페이지일 필요는 없다.

작은 정보가 기존 가이드의 한 절로 들어가는 편이 더 유용할 수도 있다.

### 작성 전 판단

```text
새 글인가?
기존 글의 보강인가?
FAQ 항목인가?
Reference 표의 추가인가?
Debug 사례인가?
```

### hawk90 적용

CXL·PCIe·CUDA처럼 비슷한 설명이 반복되는 분야는 새 글을 추가하기 전에 기존 허브나 대표 가이드에 포함할 수 있는지 확인한다.

---

## A-06. Mega-Article Architecture

### 거대 문서 중심 구조

한 주제의 모든 내용을 하나의 글에 넣는다.

```text
PCIe 완전 정복
- 역사
- PHY
- Protocol
- Enumeration
- BAR
- MSI-X
- DMA
- Linux
- Debugging
```

### 증상

- 글이 지나치게 길어짐
- 부분 업데이트가 어려움
- 검색 의도가 여러 개 섞임
- 독자가 필요한 부분을 찾기 어려움
- 한 섹션이 낡으면 전체 글이 낡아 보임

### 왜 문제인가

대표 가이드와 백과사전 전체를 혼동한다.

대표 가이드는 모든 세부 내용을 담는 문서가 아니라, 전체 구조와 세부 문서로 가는 길을 제공하는 문서여야 한다.

### 개선 방향

```text
PCIe Guide
├── 전체 흐름
├── 핵심 개념 요약
└── 세부 문서 링크
```

세부 내용은 별도 Concept, Debug Note, Reference로 분리한다.

---

## A-07. Fragmentation by Default

### 기본적으로 너무 잘게 나누기

Mega-Article의 반대편 안티패턴이다.

```text
PCIe란?
BAR란?
BAR0란?
BAR1이란?
BAR 크기란?
BAR 크기 계산이란?
```

### 증상

- 1~3분짜리 글이 지나치게 많음
- 한 주제를 읽기 위해 여러 페이지 이동
- 각 글의 서론이 반복됨
- 검색 의도가 거의 같은 글이 여러 개 존재
- 페이지당 고유 정보가 적음

### 왜 문제인가

페이지 수는 늘지만 정보 밀도는 낮아진다.

검색엔진 입장에서도 어떤 페이지가 대표인지 판단하기 어렵다.

### 분리 기준

다음 중 하나가 있을 때 별도 글로 분리한다.

- 독립적인 검색 의도
- 별도의 실험
- 별도의 장애 사례
- 다른 독자층
- 충분한 설명과 예제
- 독립적으로 다시 찾을 가치

---

## A-08. Framework-Centric Architecture

### 프레임워크 중심 아키텍처

콘텐츠 사이트인데 설계 판단이 콘텐츠보다 프레임워크 기능을 중심으로 이루어진다.

### 증상

- 새로운 Astro 기능을 사용할 이유를 찾음
- 페이지마다 컴포넌트화
- 단순한 Markdown으로 충분한데 MDX 사용
- 콘텐츠보다 transition, island, hydration 설계에 집중
- 사이트 개선이 프레임워크 업그레이드와 동일시됨

### 왜 문제인가

프레임워크는 독자에게 보이지 않는다.

독자가 원하는 것은:

```text
빠른 페이지
정확한 내용
좋은 탐색
읽기 편한 글
```

이지 Astro 기능 활용률이 아니다.

### 개선 원칙

```text
Content requirement
→ 최소 기술 선택
```

이 순서를 지킨다.

---

## A-09. Theme Product Convergence

### 개인 사이트와 범용 테마의 융합

하나의 코드베이스가 실제 블로그와 범용 테마를 동시에 담당한다.

### 증상

- 모든 기능에 `enabled` 옵션이 생김
- 사용하지 않는 Newsletter provider도 지원
- 여러 Analytics 공급자를 추상화
- 실제 블로그에 필요 없는 기능을 유지
- 개인적인 UI 변경도 범용 API로 설계

### 왜 문제인가

두 제품의 목표가 다르기 때문이다.

```text
개인 블로그:
빠른 개선, 명확한 취향

범용 테마:
설정 가능성, 호환성, 문서화
```

### 개선 방향

최소한 우선순위를 명시한다.

```text
1차 목적: Hawk 기술 지식베이스
2차 목적: 범용 테마
```

범용화는 실제로 두 번 이상 반복된 요구에만 적용한다.

---

## A-10. Configuration-Driven Everything

### 모든 것을 설정으로 해결

```ts
showAuthor: true
showReadingTime: true
showTags: true
showSeries: true
enableZenMode: true
enableTransition: true
```

### 증상

- 설정 파일이 거대한 CMS가 됨
- optional field가 계속 늘어남
- 테스트해야 할 조합이 폭발함
- 컴포넌트가 설정 조건문으로 가득 참
- 실제로는 한 조합만 사용함

### 왜 문제인가

유연성이 무료가 아니기 때문이다.

설정 하나가 추가되면:

- 타입
- 기본값
- UI 분기
- 테스트
- 문서
- 호환성

이 함께 증가한다.

### 개선 원칙

설정은 다음 세 범주로 제한한다.

```text
Site identity
Content behavior
External integration
```

고정해도 되는 디자인 판단은 코드 정책으로 둔다.

---

## A-11. Static Site with SPA Ambition

### 정적 사이트의 SPA화

정적 블로그에 앱 같은 전환과 상태 유지 기능을 계속 추가한다.

### 증상

- 페이지 이동마다 lifecycle event 관리
- `astro:page-load` 구독 증가
- 외부 스크립트 재초기화
- 뒤로 가기와 스크롤 복원 오류
- 분석 pageview 누락
- 광고와 댓글 중복 로딩

### 왜 문제인가

기본 링크 이동이라면 브라우저가 무료로 처리할 문제를 애플리케이션 코드가 다시 책임진다.

### 개선 원칙

```text
정적 HTML만으로 정상 동작
+
SPA 전환은 점진적 향상
```

전환 기능이 제거돼도 사이트 기능이 깨지면 안 된다.

---

## A-12. Hydration Without Interaction

### 상호작용 없는 Hydration

화면에 보이는 컴포넌트라는 이유만으로 클라이언트 JavaScript를 로드한다.

### 증상

- 정적인 카드도 React/Svelte island
- 날짜 표시를 위해 hydration
- 읽기 시간 표시를 런타임 계산
- 단순 테마 클래스 적용에 framework component 사용
- 첫 로딩 JS 증가

### 왜 문제인가

정적 사이트의 가장 큰 장점을 스스로 없앤다.

### 판단 기준

클라이언트 코드가 필요한 경우는 대략 다음이다.

- 사용자 입력
- 상태 변경
- 브라우저 API
- 지연 로딩 검색
- 댓글
- 테마 전환

그 외는 빌드 시 HTML로 생성한다.

---

## A-13. Content and Rendering Coupling

### 콘텐츠와 렌더링 결합

Markdown 안에 사이트 구현 세부사항이 들어간다.

```mdx
<CustomCard variant="dark" padding="large">
```

### 증상

- 글이 특정 컴포넌트에 의존
- 테마 변경 시 글 전체 수정
- GitHub Markdown에서 읽히지 않음
- 다른 SSG로 이동하기 어려움
- 콘텐츠 작성자가 UI 구현을 알아야 함

### 왜 문제인가

콘텐츠의 수명은 프레임워크보다 길다.

Astro 테마는 바뀔 수 있지만 PCIe 설명 자체는 유지돼야 한다.

### 개선 방향

일반 콘텐츠는 순수 Markdown을 유지한다.

특별한 기능은 제한된 표준 확장으로 제공한다.

```text
Markdown
GFM
Math
Callout
Code metadata
```

사이트 전용 컴포넌트는 정말 필요한 글에만 사용한다.

---

## A-14. Custom Markdown Language

### 자체 Markdown 언어화

Directive, shortcode, component, 특수 문법이 계속 늘어난다.

```text
:::warning
::tabs
[[diagram]]
{{benchmark}}
@status
```

### 증상

- 일반 Markdown parser가 처리하지 못함
- 문법 문서가 별도로 필요
- 작성 중 오류가 빌드 때만 발견됨
- migration이 어려움
- 플러그인 유지보수가 필요

### 왜 문제인가

블로그가 Markdown을 사용하는 것이 아니라 자체 문서 언어를 개발하게 된다.

### 개선 원칙

확장은 다음 조건을 만족할 때만 추가한다.

1. 여러 글에서 반복됨  
2. 순수 Markdown으로 표현하기 어렵다  
3. 장기적으로 유지할 가치가 있다  
4. fallback 표현이 존재한다  

---

## A-15. URL–Taxonomy Coupling

### URL과 분류 체계 결합

파일 위치, 카테고리, URL이 하나로 묶인다.

```text
/content/cpp/memory/allocator.md
→ /cpp/memory/allocator/
```

### 증상

- 카테고리 변경이 URL 변경이 됨
- 글이 여러 주제에 걸치면 위치를 정하기 어려움
- 폴더 이동 시 외부 링크가 깨짐
- 정보 구조 개선을 미루게 됨

### 왜 문제인가

URL은 안정적이어야 하지만 분류 체계는 계속 변하기 때문이다.

### 개선 방향

```yaml
slug: allocator-design
topics:
  - cpp
  - memory
  - performance
```

URL과 taxonomy를 분리한다.

기존 URL은 redirect 또는 canonical로 보호한다.

---

## A-16. Navigation as a File Browser

### 탐색 메뉴가 폴더 브라우저가 됨

저장소의 콘텐츠 폴더를 그대로 내비게이션으로 노출한다.

### 증상

- 작성자 관점의 디렉터리명이 메뉴가 됨
- 너무 많은 계층
- 사용자가 이해하기 어려운 약어
- 저장 편의와 탐색 편의가 혼동됨

### 왜 문제인가

파일 구조는 유지보수자를 위한 것이고, 내비게이션은 독자를 위한 것이다.

둘의 최적 구조는 다르다.

### 개선 방향

저장 구조:

```text
content/posts/2026/...
```

탐색 구조:

```text
Firmware
PCIe
CXL
CUDA
```

처럼 독립적으로 관리한다.

---

## A-17. Search as Primary Navigation

### 검색 의존 탐색

콘텐츠를 찾으려면 검색어를 정확히 알아야 한다.

### 증상

- 메뉴는 단순함
- 카테고리는 너무 큼
- 결국 검색창만 사용
- 입문자는 검색할 용어 자체를 모름

### 왜 문제인가

검색은 알고 있는 것을 찾는 도구다.

학습자는 무엇을 모르는지 모르는 상태이므로 구조적 탐색이 필요하다.

### 개선 방향

```text
Browse by Topic
Browse by Content Type
Start Here
Learning Path
Search
```

검색은 이 구조를 보완해야 한다.

---

## A-18. Integration Entanglement

### 외부 통합 얽힘

Analytics, Giscus, AdSense, Newsletter, OAuth가 페이지 생명주기에 직접 침투한다.

### 증상

- 각 컴포넌트가 page transition 이벤트를 구독
- 외부 스크립트 로딩 방식이 제각각
- 실패 시 전체 UI가 영향받음
- 개인정보 정책이 복잡해짐
- 기능 제거가 어려움

### 왜 문제인가

외부 서비스는 사이트보다 수명이 짧고 자주 변경된다.

### 개선 방향

외부 통합을 adapter처럼 다룬다.

```text
load
dispose
onNavigation
fallback
consent
```

핵심 콘텐츠 렌더링과 분리한다.

---

## A-19. Generated Asset Dependency

### 파생 자산 종속

OG 이미지, 검색 인덱스, SVG, RSS, Sitemap 같은 생성물이 원본과 동기화되지 않으면 사이트가 깨진다.

### 증상

- 제목과 OG 이미지 불일치
- 삭제한 글이 검색에 남음
- 다이어그램 소스와 SVG 불일치
- 오래된 RSS 데이터
- 수동 생성 명령이 필요

### 왜 문제인가

파생 자산이 많을수록 캐시 무효화 문제가 커진다.

### 개선 원칙

모든 파생 자산은 다음 중 하나여야 한다.

```text
항상 재생성 가능
또는
입력 hash 기반 증분 생성
```

수동 관리되는 생성 파일은 피한다.

---

## A-20. Internal Platform Before User Value

### 사용자 가치보다 내부 플랫폼을 먼저 만듦

문제가 보이면 곧바로 시스템을 개발한다.

```text
태그 문제
→ 태그 관리 도구

내부 링크 문제
→ AI 추천 엔진

검색 문제
→ 벡터 데이터베이스

글 수정 문제
→ 자체 CMS
```

### 증상

- 도구는 많아지지만 사용자 경험 변화는 적음
- 관리 시스템 구축에 시간이 오래 걸림
- 실제 콘텐츠 큐레이션은 미뤄짐
- 개인 블로그에 조직용 플랫폼이 생김

### 왜 문제인가

자동화는 반복 작업이 충분히 확인된 후에 해야 한다.

처음부터 시스템화하면 잘못된 프로세스를 빠르게 반복하게 된다.

### 개선 순서

```text
수동으로 10개 처리
→ 반복 패턴 확인
→ 간단한 스크립트
→ 충분히 커지면 시스템화
```

### hawk90 적용

AI 지식 그래프나 복잡한 추천 기능보다 먼저 대표 글 20개를 수동으로 선정하고 연결하는 것이 우선이다.

---

# Architecture 분야 요약

20개를 다시 묶으면 다섯 축으로 나뉜다.

## 지식 구조 문제

- Article Warehouse
- Chronological Architecture
- Flat Knowledge Model
- Missing Topic Hub
- Article-First Design
- Mega-Article
- Fragmentation

## 기술 중심 문제

- Framework-Centric Architecture
- Static Site with SPA Ambition
- Hydration Without Interaction
- Custom Markdown Language

## 제품 경계 문제

- Theme Product Convergence
- Configuration-Driven Everything
- Internal Platform Before User Value

## 콘텐츠 결합 문제

- Content and Rendering Coupling
- URL–Taxonomy Coupling
- Navigation as a File Browser
- Search as Primary Navigation

## 운영 경계 문제

- Integration Entanglement
- Generated Asset Dependency

---

# hawk90에서 우선 확인할 Architecture 5개

현재 가장 먼저 볼 것은 이 다섯 개다.

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Article Warehouse | 기존 글의 가치가 연결되지 않음 |
| 2 | Missing Topic Hub | 전문 분야의 대표 진입점 부재 |
| 3 | Theme Product Convergence | 블로그보다 테마 개발이 커질 위험 |
| 4 | Chronological Architecture | 최근 글이 사이트 정체성을 지배 |
| 5 | Internal Platform Before User Value | 자동화보다 콘텐츠 구조가 뒤처짐 |

이번은 **Architecture 안티패턴 20개**까지다.

다음 단계는 **Task 2-2. Content Architecture Anti-patterns**로, 글의 제목·서론·구조·근거·실험·디버깅·AI 문체·중복 문제를 카탈로그 형태로 정리하면 된다.

## 27. assistant

# Task 2-2. Content Architecture Anti-patterns  
## 글의 구조·근거·독창성 분야

이번에는 사이트 구조가 아니라 **글 하나의 내부 구조**에서 반복되는 보편적 안티패턴을 본다.

---

## C-01. Topic-Only Title

### 주제명만 있는 제목

예:

```text
PCIe BAR
CUDA Stream
UEFI Secure Boot
CXL Memory
```

### 증상

- 제목은 주제를 말하지만 문제를 말하지 않음
- 비슷한 글과 차별화되지 않음
- 독자가 얻을 결과를 예측하기 어려움
- 검색 결과에서 제목이 평범하게 보임

### 왜 문제인가

기술 독자는 주제 자체보다 다음을 찾는다.

```text
어떻게 동작하는가
왜 실패하는가
무엇이 다른가
어떻게 확인하는가
```

### 개선 방향

```text
PCIe BAR 크기는 어떻게 결정되는가
CUDA Stream을 늘려도 성능이 오르지 않는 이유
UEFI Secure Boot 인증서 만료가 부팅을 막는 과정
```

### hawk90 적용

기존 제목의 전문 용어는 유지하되, 핵심 질문이나 메커니즘을 제목에 드러내는 것이 좋다.

---

## C-02. Keyword Stack Title

### 키워드 나열형 제목

예:

```text
CXL UEFI ACPI CEDT HDM Decoder Linux NUMA
```

### 증상

- 제목에 가능한 키워드를 모두 넣음
- 제목이 길고 읽기 어려움
- 모바일에서 여러 줄을 차지함
- 제목과 description의 역할이 중복됨

### 왜 문제인가

검색어를 많이 넣는다고 검색 의도가 명확해지는 것은 아니다.

오히려 글의 중심이 무엇인지 흐려진다.

### 개선 방향

제목은 한 가지 질문에 집중한다.

```text
UEFI는 CXL 메모리를 운영체제에 어떻게 전달하는가
```

나머지 키워드는 설명과 소제목에 배치한다.

---

## C-03. Part-Number Naming

### 의미 없는 Part 번호

```text
CXL Part 1
CXL Part 2
CXL Part 3
```

### 증상

- 각 글의 내용을 제목만 보고 알 수 없음
- 중간 글부터 읽기 어려움
- 글을 삽입하거나 통합하면 번호가 깨짐
- 검색 결과에서 서로 구분되지 않음

### 개선 방향

```text
CXL 메모리 시스템 1 — 주소 변환 흐름
CXL 메모리 시스템 2 — HDM Decoder 구성
CXL 메모리 시스템 3 — Linux NUMA 노드 등록
```

번호는 보조 정보로만 사용한다.

---

## C-04. Delayed Value Proposition

### 글의 목적이 늦게 나옴

글이 일반적인 배경 설명으로 오래 시작된다.

```text
PCI Express는 고속 직렬 인터페이스입니다.
오늘날 다양한 장치에서 사용됩니다.
```

### 증상

- 독자가 왜 이 글을 읽어야 하는지 늦게 알게 됨
- 핵심 문제까지 도달하는 데 시간이 걸림
- 비슷한 서론이 여러 글에서 반복됨

### 개선 방향

처음부터 범위를 밝힌다.

```text
이 글은 U-Boot에서 PCIe 장치가 검색되지 않는 문제를
링크 상태, Config Space 접근, BAR 할당 순서로 나누어 분석한다.
```

---

## C-05. Dictionary Opening

### 사전식 도입부

모든 글이 정의로 시작한다.

```text
CXL은 Compute Express Link의 약자이다.
CUDA는 NVIDIA가 만든 병렬 컴퓨팅 플랫폼이다.
```

### 왜 문제인가

검색해서 들어온 독자는 이미 최소한의 용어를 알고 있을 가능성이 높다.

고급 글에서 매번 정의부터 시작하면 정보 밀도가 낮아진다.

### 개선 방향

한 문장으로 필요한 정의만 제공하고 바로 문제로 들어간다.

```text
CXL.mem은 호스트가 장치 메모리를 load/store 대상으로 접근하게 한다.
이 글에서는 그 주소가 Linux NUMA 노드로 등록되는 과정을 추적한다.
```

---

## C-06. Generic Importance Claim

### 근거 없는 중요성 강조

```text
이 기술은 매우 중요합니다.
다양한 분야에서 널리 사용됩니다.
개발자라면 반드시 알아야 합니다.
```

### 증상

- 구체적인 이유가 없음
- AI 생성 문체처럼 보임
- 문장은 길지만 정보가 없음

### 개선 방향

중요하다고 말하지 말고 영향을 설명한다.

```text
BAR 크기 탐색이 잘못되면 펌웨어가 장치에 주소 공간을 할당하지 못하고,
운영체제에서도 해당 장치를 정상적으로 사용할 수 없다.
```

---

## C-07. Background Inflation

### 배경 설명 팽창

핵심 주제보다 선행 개념 설명이 더 길다.

### 증상

- CUDA Stream 글인데 GPU 구조 설명이 절반
- CXL 장애 글인데 PCIe 역사부터 설명
- 임베디드 C++ 글인데 객체지향 개요부터 시작

### 왜 문제인가

검색 의도에 대한 답이 늦어지고, 다른 글과 중복이 커진다.

### 개선 방향

```text
최소 배경 설명
→ 상세 개념 문서 링크
→ 현재 글의 고유 내용
```

---

## C-08. Repeated Context Boilerplate

### 동일 배경 반복

여러 글에 같은 설명이 반복된다.

```text
PCIe Configuration Space란...
CXL Type 3 장치는...
CUDA Stream은...
```

### 문제

- 중복 콘텐츠 증가
- 여러 글을 동시에 수정해야 함
- 글의 고유 정보 비율이 낮아짐
- 검색엔진이 문서 차이를 판단하기 어려움

### 개선 방향

대표 Concept 문서를 만들고, 다른 글에서는 짧게 요약한 뒤 링크한다.

---

## C-09. Scope Creep Article

### 쓰면서 범위가 계속 확장됨

처음에는 BAR를 설명하다가:

```text
BAR
→ Enumeration
→ DMA
→ IOMMU
→ Driver
→ NUMA
```

까지 간다.

### 증상

- 제목과 본문 범위가 다름
- 결론이 여러 개 생김
- 일부 독자에게 불필요한 부분이 많음
- 수정하기 어려움

### 개선 방향

글 시작에 포함 범위와 제외 범위를 적는다.

```text
다룸:
BAR 크기 탐색과 주소 할당

다루지 않음:
DMA 매핑과 IOMMU
```

---

## C-10. One Article, Multiple Audiences

### 여러 독자층을 동시에 만족시키려 함

한 글이 초보자와 커널 개발자 모두를 대상으로 한다.

### 증상

- 초보 설명과 소스코드 분석이 뒤섞임
- 전문가는 서론을 건너뜀
- 입문자는 후반을 이해하지 못함
- 글 길이가 계속 늘어남

### 개선 방향

대상 독자를 명확히 한다.

```text
대상:
PCIe 기본 개념을 알고 U-Boot 소스를 추적하려는 개발자
```

필요하면 입문 Guide와 Source Walkthrough를 분리한다.

---

## C-11. Undefined Reader Prerequisite

### 선행 지식이 정의되지 않음

글은 고급인데 필요한 지식이 무엇인지 알 수 없다.

### 문제

독자가 중간에서 갑자기 막힌다.

### 개선 방향

```text
선행 지식:
- PCIe Configuration Space
- BAR 기본 구조
- U-Boot driver model
```

너무 많은 선행 지식이 필요하다면 해당 글이 허브나 가이드에 연결돼야 한다.

---

## C-12. Post Homogeneity

### 모든 글이 같은 구조

모든 글이 다음 형태다.

```text
소개
설명
코드
결론
```

### 왜 문제인가

디버깅 글, 실험 글, 개념 글은 필요한 구조가 다르다.

### 개선 방향

콘텐츠 타입별 구조를 사용한다.

```text
Concept:
문제 → 모델 → 동작 → 오해

Debug:
증상 → 가설 → 증거 → 원인 → 해결

Experiment:
가설 → 방법 → 결과 → 해석 → 한계
```

---

## C-13. Tutorial Without Outcome

### 튜토리얼의 결과가 불명확함

```text
다음 명령을 실행합니다.
설정 파일을 수정합니다.
```

하지만 완료 후 무엇이 보여야 하는지 없다.

### 개선 방향

각 단계에 기대 결과를 적는다.

```text
이 명령이 성공하면 `lspci`에 장치가 표시되고,
Kernel log에는 BAR 할당 결과가 출력된다.
```

---

## C-14. Command Dump

### 명령어만 나열

```bash
cmake ..
make
sudo make install
```

### 증상

- 각 명령의 목적이 없음
- 실패 시 어디를 봐야 하는지 없음
- 환경 차이를 고려하지 않음
- 복사해서 실행하는 것 외에는 배울 것이 적음

### 개선 방향

```text
명령의 목적
필요한 전제
예상 출력
실패할 때 확인할 항목
```

을 함께 제공한다.

---

## C-15. Magic Fix

### 이유 없는 해결 명령

```bash
sudo systemctl restart ...
```

“이렇게 하니 해결됐다”로 끝난다.

### 왜 문제인가

다른 환경에 적용할 수 없고, 재발했을 때 대응할 수 없다.

### 개선 방향

```text
왜 이 명령이 효과가 있었는가
어떤 상태를 초기화했는가
어떤 상황에서는 효과가 없는가
```

를 설명한다.

---

## C-16. Fix-Only Debugging Note

### 해결책만 있고 진단 과정이 없음

### 증상

- 최종 원인만 제시
- 중간 가설이 없음
- 왜 다른 원인을 제외했는지 모름
- 로그가 단순 첨부됨

### 좋은 구조

```text
증상
정상 기대값
가능한 원인
수집한 증거
제외한 가설
확정 원인
해결
재발 방지
```

---

## C-17. Log Dump Without Interpretation

### 로그 붙여넣기

긴 커널 로그나 빌드 로그를 그대로 붙인다.

### 문제

독자가 중요한 줄을 직접 찾아야 한다.

### 개선 방향

```text
전체 로그는 접거나 외부 파일로 제공
핵심 줄만 본문에 인용
각 줄의 의미 설명
정상 로그와 비교
```

---

## C-18. Screenshot as Evidence

### 스크린샷만으로 결과 증명

터미널 화면이나 그래프 이미지가 있지만 원본 값이 없다.

### 문제

- 검색 불가
- 복사 불가
- 해상도가 낮으면 읽기 어려움
- 접근성 부족
- 결과 재분석 불가

### 개선 방향

스크린샷은 보조로 사용하고 텍스트·표·CSV·명령 출력을 함께 제공한다.

---

## C-19. Evidence Blending

### 사실·관찰·추론이 섞임

```text
이 문제는 DDR 컨트롤러가 초기화되지 않았기 때문이다.
```

이 문장이 규격 근거인지, 실제 관찰인지, 추측인지 불명확하다.

### 개선 방향

```text
Specification
Observation
Interpretation
Hypothesis
Conclusion
```

을 구분한다.

---

## C-20. Unmarked Hypothesis

### 가설을 사실처럼 표현

### 문제

기술 글의 신뢰성을 크게 떨어뜨린다.

### 개선 방향

표현을 명확히 한다.

```text
확인됨:
LTSSM이 Recovery에서 반복됨

추정:
RefClk 안정화 이전에 PERST#가 해제됐을 가능성

미확인:
보드 측 전원 시퀀스
```

---

## C-21. Citation Dump

### 참고문헌을 끝에 몰아넣음

링크는 많지만 어느 문장을 뒷받침하는지 알 수 없다.

### 개선 방향

핵심 주장 근처에 근거를 배치하고, 마지막에는 전체 참고자료를 분류한다.

```text
Specification
Official Documentation
Source Code
Further Reading
```

---

## C-22. Specification Paraphrase

### 규격 재서술이 콘텐츠의 대부분

### 증상

- 사양 문서 순서와 글 순서가 거의 같음
- 작성자의 해석이 적음
- 실제 예제나 로그가 없음
- 외부 문서를 짧게 번역한 수준

### 왜 문제인가

독창성과 실무 가치가 낮아 보일 수 있다.

### 개선 방향

규격 자체보다 다음을 추가한다.

```text
실제 구현에서 어떻게 보이는가
어떤 부분이 자주 오해되는가
로그나 레지스터에서 어떻게 확인하는가
다른 규격과 어떻게 연결되는가
```

---

## C-23. Documentation Summary Article

### 공식 문서 요약만 있는 글

### 문제

원문보다 짧지만 더 정확하거나 더 유용하지 않으면 가치가 약하다.

### 개선 방향

요약에 최소 하나의 고유 가치를 추가한다.

- 실행 가능한 예제
- 비교표
- 실패 사례
- 버전 차이
- 실제 장비 결과
- 구조도
- 의사결정 기준

---

## C-24. Code-as-Explanation

### 코드가 설명을 대신함

긴 코드 블록 뒤에:

```text
위와 같이 구현하면 된다.
```

로 끝난다.

### 문제

독자가 핵심 설계 판단을 직접 찾아야 한다.

### 개선 방향

코드보다 다음을 설명한다.

```text
왜 이 구조인가
불변조건은 무엇인가
오류 경로는 무엇인가
대안은 무엇인가
성능 비용은 어디에 있는가
```

---

## C-25. Full Source Embedding

### 전체 소스코드를 본문에 넣음

### 문제

- 글이 너무 길어짐
- 핵심 코드가 묻힘
- 수정 시 본문과 저장소가 불일치
- 빌드·하이라이팅 비용 증가

### 개선 방향

본문에는 핵심 부분만 넣고, 전체 코드는 별도 저장소나 파일 링크로 제공한다.

---

## C-26. Example Without Production Boundary

### 예제 코드와 실사용 코드의 경계가 없음

간단한 예제를 보여주면서 예외 처리·동시성·자원 해제·보안 고려가 빠져 있다.

### 문제

독자가 예제를 그대로 production에 적용할 수 있다.

### 개선 방향

```text
예제를 위해 생략한 것
실제 적용 시 필요한 것
적용하면 안 되는 조건
```

을 명시한다.

---

## C-27. Benchmark Without Baseline

### 비교 기준 없는 성능 수치

```text
8.4 GB/s
12 ms
```

### 왜 문제인가

좋은 결과인지 판단할 수 없다.

### 개선 방향

```text
Baseline
변경 사항
동일 조건
반복 횟수
분산
하드웨어 한계
```

를 제공한다.

---

## C-28. Benchmark Without Workload

### 측정 대상이 불명확함

“CUDA 최적화 후 30% 향상”이라고 하지만 입력 크기와 연산 특성이 없다.

### 개선 방향

- 데이터 크기
- 메모리 패턴
- 연산량
- warm-up
- 반복 횟수
- GPU·드라이버·CUDA 버전

을 명시한다.

---

## C-29. Single-Run Benchmark

### 한 번 측정한 값 사용

### 문제

초기화 비용, 캐시, 시스템 노이즈에 크게 영향을 받는다.

### 개선 방향

여러 번 반복하고 대표값과 변동을 함께 제시한다.

```text
median
min/max
표준편차 또는 percentile
```

---

## C-30. Benchmark Graph Without Raw Data

### 그래프만 있고 수치가 없음

### 문제

정확한 비교와 재분석이 어렵다.

### 개선 방향

그래프와 함께 표 또는 원본 데이터를 제공한다.

---

## C-31. Experiment Without Hypothesis

### 측정은 했지만 질문이 없음

여러 조건을 테스트했지만 무엇을 확인하려는지 불명확하다.

### 개선 방향

```text
질문
가설
변수
고정 조건
측정 방법
결과
해석
```

순서로 작성한다.

---

## C-32. Correlation as Causation

### 동시에 변한 것을 원인으로 단정

예:

```text
컴파일 옵션을 바꾸니 빨라졌으므로 vectorization 때문이다.
```

실제로 다른 최적화가 영향을 줬을 수 있다.

### 개선 방향

가능하면 단일 변수만 바꾸고, assembly·profiler·counter로 원인을 확인한다.

---

## C-33. Success-Path-Only Tutorial

### 정상 경로만 설명

### 증상

- 실패했을 때 확인 방법 없음
- 권한·버전·경로 차이를 다루지 않음
- 독자는 조금만 다르면 막힘

### 개선 방향

최소한 자주 발생하는 실패 3개와 진단법을 포함한다.

---

## C-34. Environment Omission

### 실행 환경 없음

### 문제

동작 여부를 재현할 수 없다.

### 필요한 최소 정보

```text
OS
Kernel
Compiler
Library/SDK
Hardware
Major configuration
```

모든 글에 전부 필요하지는 않지만 튜토리얼·실험·디버깅 글에는 중요하다.

---

## C-35. Versionless Technical Article

### 버전 정보 없음

```text
CUDA에서 이렇게 한다
Linux에서 지원한다
Rust에서는 불가능하다
```

### 왜 문제인가

기술은 계속 바뀐다.

### 개선 방향

```text
CUDA 11.8 기준
Linux 6.12에서 확인
Rust 1.8x 이후
```

처럼 범위를 밝힌다.

---

## C-36. Timeless Article Illusion

### 오래된 글이 현재 자료처럼 보임

### 증상

- 작성일만 있음
- 수정 여부 없음
- 현재도 유효한지 알 수 없음
- 대체 글이 있어도 연결되지 않음

### 개선 방향

```text
Current
Needs Review
Historical
Superseded
```

상태를 표시한다.

---

## C-37. Silent Update

### 내용을 크게 바꿨지만 수정 이력이 없음

### 문제

예전에 읽은 독자가 무엇이 달라졌는지 모른다.

### 개선 방향

핵심 문서에는 간단한 변경 기록을 둔다.

```text
2026-07: Linux 6.12 동작 기준 추가
2026-05: CXL decoder 설명 수정
```

---

## C-38. Unsupported Universal Claim

### 제한된 경험을 일반 법칙처럼 표현

```text
U250에서는 인터럽트를 사용할 수 없다.
C++는 펌웨어에 적합하지 않다.
```

### 개선 방향

관찰 범위를 명확히 한다.

```text
XRT 2.13.466과 해당 U250 플랫폼에서는
사용자 공간 ISR callback 경로를 확인하지 못했다.
```

---

## C-39. Missing Limitation Section

### 글의 적용 한계가 없음

### 문제

독자가 다른 상황에도 결론을 일반화한다.

### 개선 방향

```text
이 결과는 x86 host와 PCIe Gen3 환경에 한정된다.
IOMMU disabled 환경은 측정하지 않았다.
```

---

## C-40. Missing Counterexample

### 결론을 반박할 사례를 다루지 않음

### 왜 문제인가

기술적 판단이 너무 단순해진다.

### 개선 방향

```text
일반적으로 A가 유리하지만,
작은 입력에서는 초기화 비용 때문에 B가 더 빠를 수 있다.
```

---

## C-41. Trade-off Omission

### 장점만 설명

예:

```text
Pinned memory는 빠르다.
```

하지만:

- 할당 비용
- OS 메모리 압박
- 사용량 제한
- 작은 전송에서 이득 부족

이 빠져 있다.

### 개선 방향

모든 설계 선택에 다음을 포함한다.

```text
장점
비용
적용 조건
비적용 조건
```

---

## C-42. One Correct Architecture

### 하나의 설계를 정답처럼 제시

### 문제

시스템 설계는 제약에 따라 답이 달라진다.

### 개선 방향

```text
낮은 지연 우선
처리량 우선
메모리 제한
펌웨어 제약
유지보수 우선
```

별로 선택지를 비교한다.

---

## C-43. No Decision Criteria

### 선택지는 나열하지만 선택 기준이 없음

```text
A도 가능하고 B도 가능하다.
```

### 개선 방향

```text
A를 선택할 조건
B를 선택할 조건
경계 조건
```

을 명시한다.

---

## C-44. Diagram Without Purpose

### 보기 좋은 그림만 있음

### 증상

- 상자와 화살표는 많음
- 무엇을 설명하는지 불명확
- 본문과 연결되지 않음
- 모든 화살표 의미가 같음

### 개선 방향

다이어그램마다 하나의 질문을 답하게 한다.

```text
데이터가 어디로 이동하는가
제어권이 언제 바뀌는가
주소가 어떻게 변환되는가
장애가 어디서 전파되는가
```

---

## C-45. Unlabeled Arrow Diagram

### 화살표 의미가 없음

화살표가 호출, 데이터, 의존성, 소유권 중 무엇인지 알 수 없다.

### 개선 방향

범례나 라벨을 사용한다.

```text
call
data
interrupt
ownership
configuration
```

---

## C-46. Screenshot-Heavy Explanation

### 도구 화면 캡처가 설명 대부분

### 문제

- 버전 변경에 약함
- 검색할 수 없음
- 접근성 부족
- 핵심 개념보다 UI 위치에 종속됨

### 개선 방향

스크린샷은 위치 확인에만 쓰고, 원리와 명령을 텍스트로 설명한다.

---

## C-47. Uncaptioned Figure

### 그림 설명이 없음

### 문제

그림만 따로 보았을 때 의미를 알 수 없다.

### 개선 방향

캡션에서 그림이 보여주는 결론을 설명한다.

```text
Figure 3. HDM Decoder가 HPA 범위를 장치 DPA로 매핑하는 과정.
```

---

## C-48. Abrupt Ending

### 설명이나 코드 직후 글이 끝남

### 문제

독자가 무엇을 기억해야 하는지 모른다.

### 개선 방향

마지막에 다음을 정리한다.

```text
핵심 결론
적용 조건
한계
다음 글
```

---

## C-49. Summary Repetition

### 결론이 본문 복사

본문 소제목을 다시 나열할 뿐 새로운 판단이 없다.

### 개선 방향

결론에서는 다음 질문에 답한다.

```text
그래서 무엇이 중요한가
무엇을 먼저 확인해야 하는가
어떤 선택을 해야 하는가
```

---

## C-50. No Next Action

### 읽은 뒤 무엇을 해야 하는지 없음

### 개선 방향

글 유형에 따라 다음 행동을 제안한다.

```text
다음 개념 읽기
명령 실행
측정 재현
대표 Guide로 돌아가기
관련 장애 사례 확인
```

---

# Content Architecture 분야 핵심 묶음

## 제목과 도입

- Topic-Only Title
- Keyword Stack Title
- Part-Number Naming
- Delayed Value Proposition
- Dictionary Opening
- Generic Importance Claim

## 범위와 독자

- Background Inflation
- Repeated Context Boilerplate
- Scope Creep
- Multiple Audiences
- Undefined Prerequisite

## 튜토리얼과 디버깅

- Command Dump
- Magic Fix
- Fix-Only Debugging
- Log Dump
- Success-Path-Only Tutorial

## 근거와 신뢰성

- Evidence Blending
- Unmarked Hypothesis
- Citation Dump
- Specification Paraphrase
- Unsupported Universal Claim

## 코드와 실험

- Code-as-Explanation
- Full Source Embedding
- Benchmark Without Baseline
- Single-Run Benchmark
- Experiment Without Hypothesis

## 유지와 정확성

- Environment Omission
- Versionless Article
- Timeless Article Illusion
- Silent Update
- Missing Limitation

## 전달 방식

- Diagram Without Purpose
- Screenshot-Heavy Explanation
- Abrupt Ending
- Summary Repetition
- No Next Action

---

# hawk90에서 우선 확인할 8개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Specification Paraphrase | 규격·고급 주제 글의 독창성 검증 필요 |
| 2 | Repeated Context Boilerplate | 연관된 시스템 글이 많아 중복 가능성 큼 |
| 3 | Evidence Blending | 실측·규격·추론 구분이 전문성에 중요 |
| 4 | Versionless Technical Article | CUDA·Linux·CXL은 버전 영향이 큼 |
| 5 | Fix-Only Debugging Note | 실무 경험을 차별화된 콘텐츠로 바꿀 수 있음 |
| 6 | Benchmark Without Baseline | 성능 글의 신뢰성과 재현성 문제 |
| 7 | Topic-Only Title | 검색 결과에서 글의 고유 가치가 약해짐 |
| 8 | Abrupt Ending | 다음 글과 Topic Hub 연결 기회를 잃음 |

다음은 **Task 2-3. Information Architecture & Navigation Anti-patterns**로 이어가면 된다. 여기서는 카테고리·태그·시리즈·검색·내부 링크·Breadcrumb·고아 문서 문제를 더 세밀하게 카탈로그화한다.

## 28. assistant

# Task 2-3. Information Architecture & Navigation Anti-patterns

이번에는 **카테고리, 태그, 시리즈, 검색, 내부 링크, Breadcrumb, 고아 문서**처럼 사용자가 사이트 안에서 지식을 찾고 이동하는 구조만 다룬다.

---

## I-01. Category Explosion

### 카테고리 폭발

카테고리가 너무 세분화된다.

```text
C++
Modern C++
C++20
C++23
Templates
STL
Memory
Performance
```

### 문제

- 어디에 넣어야 할지 애매함
- 같은 글이 여러 카테고리에 걸침
- 카테고리별 글 수가 너무 적어짐
- 탐색보다 분류 유지 비용이 커짐

### 개선

최상위 카테고리는 5~8개 정도로 제한한다.

세부 주제는 Topic 또는 Tag로 처리한다.

---

## I-02. Category Overlap

### 카테고리 역할 중복

```text
Firmware
Embedded
BSP
Bootloader
Low-Level
```

이들이 실제로는 상당 부분 겹친다.

### 문제

사용자가 어느 메뉴를 눌러야 할지 모른다.

### 개선

각 분류 축의 역할을 명확히 한다.

```text
Category = 큰 지식 분야
Topic = 세부 기술 주제
Tag = 횡단 특성
Type = 문서 역할
```

---

## I-03. Category as Storage Location

### 저장 폴더를 카테고리로 사용

작성 편의를 위한 폴더가 사용자 탐색 구조가 된다.

### 문제

저장 구조와 독자 구조의 목적이 다르다.

### 개선

파일 위치와 사이트 분류를 분리한다.

---

## I-04. Category as Identity

### 하나의 글이 한 카테고리만 가져야 한다고 가정

예를 들어:

```text
CXL + Linux + NUMA + Firmware
```

글을 하나의 폴더에만 넣어야 한다.

### 문제

시스템 분야는 주제가 본질적으로 교차한다.

### 개선

대표 Category 하나와 복수 Topic을 허용한다.

---

## I-05. Empty Category

### 글이 거의 없는 카테고리

카테고리는 존재하지만 글이 1~2개뿐이다.

### 문제

- 얕은 목록 페이지 생성
- 탐색 가치가 거의 없음
- 사이트가 미완성처럼 보임

### 개선

최소 글 수나 대표 설명이 생기기 전까지 공개 카테고리로 승격하지 않는다.

---

## I-06. Tag Explosion

### 태그 폭발

태그가 수백 개로 늘어난다.

### 증상

- 글마다 새로운 태그 생성
- 1회성 태그 증가
- 대소문자와 표기 불일치
- 유사 태그 중복

### 개선

태그 생성 규칙을 둔다.

```text
최소 3개 이상 글에서 재사용
표준 표기 사용
대체 태그와 동의어 관리
```

---

## I-07. Synonym Tag Drift

### 동의어 태그 분열

```text
cpp
c++
cplusplus
modern-cpp
cxx
```

### 문제

같은 콘텐츠가 여러 태그 페이지로 분산된다.

### 개선

Canonical tag dictionary를 둔다.

```text
canonical: cpp
aliases:
  - c++
  - cplusplus
  - cxx
```

---

## I-08. Version-as-Tag Abuse

### 모든 버전을 태그로 만듦

```text
cuda-11
cuda-11.8
cuda-12
cuda-12.4
cuda-13
```

### 문제

태그 체계가 버전 번호로 오염된다.

### 개선

버전은 metadata나 tested environment로 관리하고, 정말 탐색 가치가 있을 때만 태그화한다.

---

## I-09. Tag as Category

### 태그가 사실상 카테고리 역할

`CXL`, `CUDA`, `Linux`처럼 핵심 분야를 단순 태그로만 관리한다.

### 문제

- 설명 없는 목록만 제공
- 학습 순서 없음
- 대표 문서 없음

### 개선

핵심 분야는 Topic Hub로 승격한다.

---

## I-10. Tag Cloud Navigation

### 태그 클라우드에 탐색을 맡김

태그 크기와 빈도로 사이트 구조를 보여준다.

### 문제

많이 쓴 주제가 중요한 주제처럼 보일 뿐, 지식 구조는 전달되지 않는다.

### 개선

태그 클라우드는 보조 탐색으로만 사용한다.

---

## I-11. Series as Folder

### 시리즈가 단순 글 묶음

시리즈 페이지가 다음과 같다.

```text
Part 1
Part 2
Part 3
```

### 문제

전체 학습 목표와 각 글의 역할이 보이지 않는다.

### 개선

시리즈 허브에 다음을 추가한다.

```text
학습 목표
선행 지식
전체 지도
각 글 설명
완독 후 다음 단계
```

---

## I-12. Series Order Fragility

### 수동 순서 번호 의존

```yaml
seriesOrder: 1
seriesOrder: 2
seriesOrder: 3
```

### 문제

- 순서 중복
- 중간 삽입 어려움
- 글 삭제 시 공백
- 여러 작성자가 수정할 때 충돌

### 개선

검증 스크립트를 두고, 필요하면 명시적 시리즈 manifest에서 순서를 관리한다.

---

## I-13. Series Without Entry Point

### 시리즈 시작점 부재

검색으로 Part 4에 들어왔는데 시리즈 전체를 이해하기 어렵다.

### 개선

모든 시리즈 글 상단에 다음을 표시한다.

```text
이 글은 전체 7편 중 4편
이전 글
다음 글
시리즈 전체 보기
```

---

## I-14. Series Without Exit

### 시리즈를 다 읽고도 다음 경로가 없음

### 개선

마지막 글에서 상위 Topic Hub와 다음 심화 시리즈를 연결한다.

---

## I-15. Series and Topic Duplication

### 시리즈와 Topic이 같은 역할

예:

```text
Topic: CXL
Series: CXL
Tag: CXL
Category: CXL
```

### 문제

네 개의 목록 페이지가 거의 동일해진다.

### 개선

역할을 분리한다.

```text
Topic = 분야 전체
Series = 순서가 있는 학습 묶음
Tag = 횡단 속성
```

---

## I-16. Archive-First Navigation

### 연도·월별 아카이브가 주요 탐색

```text
2026년 7월
2026년 6월
2026년 5월
```

### 문제

독자는 작성 시점보다 주제를 찾는다.

### 개선

아카이브는 보조 메뉴나 푸터 수준으로 내린다.

---

## I-17. Pagination as Discovery

### 페이지네이션이 콘텐츠 발견 수단

사용자가 1페이지부터 37페이지까지 넘겨야 오래된 글을 찾는다.

### 문제

좋은 과거 글이 사실상 사라진다.

### 개선

대표 글, Topic Hub, 검색, 시리즈를 통해 직접 접근하게 한다.

---

## I-18. Infinite Scroll Archive

### 무한 스크롤 글 목록

### 문제

- URL 상태가 불안정
- 뒤로 가기 경험이 나쁨
- 원하는 위치 재방문 어려움
- Footer 접근 어려움
- 오래된 글 탐색이 피곤함

### 개선

기술 지식 사이트에는 명시적 페이지네이션이나 Topic 탐색이 더 적합하다.

---

## I-19. Latest-Only Homepage

### 홈이 최신 글만 보여줌

### 문제

사이트의 핵심 자산이 최신성에 묻힌다.

### 개선

홈 우선순위를 다음처럼 둔다.

```text
Start Here
Core Topics
Featured Guides
Recently Updated
Latest Posts
```

---

## I-20. Popularity-Only Homepage

### 인기 글만 노출

### 문제

과거에 우연히 유입된 글이 계속 상위에 남고, 새롭고 중요한 글은 묻힌다.

### 개선

편집자 선정과 데이터 기반 추천을 섞는다.

---

## I-21. No Start Here

### 신규 방문자를 위한 시작점 없음

### 문제

글이 많을수록 첫 진입이 더 어렵다.

### 개선

다음과 같은 페이지를 만든다.

```text
시스템 프로그래밍 처음 시작하기
C++ 성능 최적화 학습 경로
Firmware와 Bootloader 로드맵
```

---

## I-22. Start Here Overload

### 시작 페이지가 너무 방대함

모든 분야를 한 페이지에 넣는다.

### 문제

시작 페이지 자체가 또 하나의 거대 문서가 된다.

### 개선

전체 Start Here는 작은 지도 역할만 하고, 분야별 로드맵으로 연결한다.

---

## I-23. Missing Breadcrumb

### 상위 구조 표시 없음

글 상단에 제목과 날짜만 있다.

### 문제

독자는 현재 글이 사이트 어디에 속하는지 모른다.

### 개선

```text
Home > Firmware > PCIe > Enumeration
```

같은 Breadcrumb을 제공한다.

---

## I-24. Fake Breadcrumb

### 폴더 경로를 그대로 Breadcrumb으로 표시

```text
Home > Blog > 2026 > 07 > Notes > PCIe
```

### 문제

저장 위치는 보여주지만 지식 구조는 보여주지 못한다.

### 개선

독자 관점의 Topic 계층을 사용한다.

---

## I-25. Breadcrumb Without Links

### Breadcrumb이 텍스트 장식

상위 항목을 눌러 이동할 수 없다.

### 개선

모든 중간 노드를 실제 허브 페이지에 연결한다.

---

## I-26. Orphan Article

### 들어오는 내부 링크가 없는 글

검색이나 직접 URL로만 발견된다.

### 문제

- 사이트 구조상 중요도가 없음
- 대표 문서와 연결되지 않음
- 검색엔진 발견과 평가가 약해질 수 있음

### 개선

각 글은 최소 하나 이상의 상위 Hub나 관련 글에서 연결되게 한다.

---

## I-27. Dead-End Article

### 나가는 링크가 없는 글

글을 읽고 나면 다음 행동이 없다.

### 개선

최소 하나를 제공한다.

```text
상위 주제로 돌아가기
다음 글
관련 개념
실습 글
```

---

## I-28. Related Posts by Shared Tag Only

### 태그 겹침만으로 관련 글 추천

### 문제

`Linux` 태그 하나가 겹친다는 이유로 전혀 다른 글이 추천될 수 있다.

### 개선

추천 관계에 가중치를 둔다.

```text
동일 Topic
선행·후속 관계
동일 Series
동일 Content Type
본문 명시 링크
공통 Tag
```

---

## I-29. Random Related Posts

### 임의 추천

### 문제

방문자의 학습 흐름과 무관하다.

### 개선

랜덤은 보조 기능으로만 사용하고, 핵심 추천은 의미 관계로 구성한다.

---

## I-30. Circular Recommendation Trap

### 같은 글들만 서로 순환 추천

A가 B를 추천하고, B가 C를 추천하고, C가 다시 A를 추천한다.

### 문제

사용자가 한 작은 묶음 밖으로 나가지 못한다.

### 개선

상위 Topic, 인접 분야, 다음 난이도로 연결을 확장한다.

---

## I-31. Internal Link as “Click Here”

### 의미 없는 앵커 텍스트

```text
자세한 내용은 여기를 참고하세요.
```

### 문제

링크 목적을 알기 어렵고 접근성과 SEO 모두 약하다.

### 개선

```text
PCIe BAR 크기 탐색 과정에서 자세히 설명한다.
```

처럼 링크 대상의 의미를 앵커에 넣는다.

---

## I-32. Excessive Inline Linking

### 거의 모든 용어에 링크

### 문제

본문이 파란 링크로 가득 차 읽기 흐름이 깨진다.

### 개선

한 개념은 문맥상 가장 중요한 첫 등장이나 실제 선행 설명이 필요할 때만 링크한다.

---

## I-33. Link Without Context

### 링크는 있지만 왜 읽어야 하는지 없음

```text
관련 글: MSI-X
```

### 개선

```text
BAR 할당 이후 인터럽트 경로까지 추적하려면 MSI-X 설정 글을 이어서 읽는다.
```

---

## I-34. Link Rot Inside the Site

### 내부 URL 변경으로 링크 깨짐

### 원인

- 폴더 이동
- slug 변경
- 카테고리 개편
- 글 통합

### 개선

- 안정적인 slug
- redirect map
- CI broken link 검사
- 글 통합 시 이전 URL 유지

---

## I-35. External-Link-Only Context

### 핵심 선행 설명을 외부 링크에 의존

### 문제

외부 문서가 사라지거나 내용이 바뀌면 글 자체가 이해되지 않는다.

### 개선

현재 글에 필요한 최소 설명은 제공하고, 외부 링크는 추가 근거로 사용한다.

---

## I-36. Search as Exact Match

### 정확한 문자열만 찾는 검색

`MSI-X`와 `MSIX`, `C++`와 `cpp`가 별개로 처리된다.

### 개선

- alias dictionary
- 대소문자 정규화
- 하이픈·기호 정규화
- 동의어 확장

---

## I-37. Acronym Search Failure

### 약어와 풀네임 연결 실패

```text
IOMMU
Input Output Memory Management Unit
```

가 서로 연결되지 않는다.

### 개선

검색 문서에 명시적 alias를 둔다.

---

## I-38. Korean-English Search Split

### 한글과 영문 검색 결과 분리

```text
메모리 일관성
cache coherence
```

가 같은 주제인데 별개로 처리된다.

### 개선

Topic metadata에 한글·영문 alias를 함께 관리한다.

---

## I-39. Search Result Without Context

### 결과에 제목만 표시

### 문제

비슷한 제목 중 무엇을 선택해야 할지 모른다.

### 개선

다음을 함께 표시한다.

```text
Content Type
Topic
Description
Matched heading
Updated date
```

---

## I-40. Search Result Without Match Highlight

### 어디에서 검색어가 일치했는지 안 보임

### 개선

제목, 소제목, 설명 중 매칭된 위치를 짧게 강조한다.

---

## I-41. Search Ranking by Frequency

### 키워드가 많이 등장한 글을 상위 노출

### 문제

긴 글이나 코드 덤프가 과도하게 유리하다.

### 개선

필드별 가중치를 둔다.

```text
Title > Keyword > Topic > Heading > Description > Body
```

---

## I-42. Code Noise in Search

### 코드와 로그가 검색 결과를 오염

### 문제

함수명이나 에러 문자열이 반복된 글이 과도하게 상위 노출된다.

### 개선

기본 검색에서는 코드와 로그를 제외하거나 별도 검색 모드로 분리한다.

---

## I-43. Full Index Eager Loading

### 검색하지 않아도 전체 인덱스 다운로드

### 문제

초기 로딩과 모바일 메모리 비용이 증가한다.

### 개선

검색 UI를 열 때 지연 로드하거나 Topic별로 분할한다.

---

## I-44. Search Without Filters

### 모든 문서가 한 목록에 섞임

### 개선

최소 필터를 제공한다.

```text
All
Guide
Debug
Experiment
Reference
```

과도하게 복잡한 필터 UI는 피한다.

---

## I-45. Filter Explosion

### 검색 필터가 너무 많음

```text
연도
난이도
언어
플랫폼
버전
작성자
유형
상태
```

### 문제

검색보다 필터 설정이 더 복잡해진다.

### 개선

실제로 선택에 영향을 주는 2~3개 축만 노출한다.

---

## I-46. No Zero-Result Recovery

### 검색 결과가 없으면 끝

### 개선

- 유사 검색어
- alias
- Topic 추천
- 철자 교정
- 관련 Guide

를 제공한다.

---

## I-47. Search Hides Canonical Guides

### 일반 글이 대표 Guide보다 위에 노출

### 문제

사용자는 단편 글부터 들어가 전체 구조를 놓친다.

### 개선

대표 Guide와 Topic Hub에 ranking boost를 준다.

---

## I-48. Topic Hub as Article List

### Topic Hub가 글 목록뿐

### 문제

일반 태그 페이지와 다를 바가 없다.

### 개선

Hub가 직접 다음 정보를 제공해야 한다.

```text
주제 정의
전체 구조
학습 순서
대표 문서
하위 주제
최근 변경
```

---

## I-49. Topic Hub as Mega-Article

### Hub에 모든 설명을 넣음

### 문제

Hub와 세부 문서 역할이 섞인다.

### 개선

Hub는 지도와 큐레이션 중심으로 유지한다.

---

## I-50. Stale Topic Hub

### 새 글이 허브에 반영되지 않음

### 문제

허브보다 최신 글 목록이 더 정확해진다.

### 개선

자동 후보 추천과 수동 큐레이션을 결합한다.

---

## I-51. Missing Cross-Topic Links

### 분야별로 고립

```text
CUDA
PCIe
NUMA
CXL
Linux
```

각 Topic 안에서는 연결되지만 서로 연결되지 않는다.

### 문제

네 블로그의 가장 큰 차별점인 **기술 간 연결성**이 사라진다.

### 개선

다음과 같은 교차 경로를 만든다.

```text
CUDA Memory Transfer
→ PCIe Bandwidth
→ NUMA Placement
→ CXL Memory Tier
```

---

## I-52. Knowledge Graph Without Editorial Judgment

### 자동 링크 그래프를 그대로 사용

키워드 공통도만으로 관계를 만든다.

### 문제

기술적으로는 연결되지만 학습적으로는 의미 없는 관계가 많아진다.

### 개선

자동화는 후보를 만들고, 대표 관계는 사람이 승인한다.

---

## I-53. Backlink Overload

### 모든 역링크를 표시

문서가 참조된 모든 페이지를 하단에 노출한다.

### 문제

수십 개 링크가 생겨 정보 가치가 떨어진다.

### 개선

상위 의미 관계만 노출하고 전체 역링크는 별도 패널에서 제공한다.

---

## I-54. No Content Status in Navigation

### 오래된 글과 최신 글이 똑같이 보임

### 개선

목록과 검색 결과에서 상태를 표시한다.

```text
Current
Historical
Needs Review
Superseded
```

---

## I-55. No Difficulty Signal

### 난이도 구분 없음

### 문제

초보자가 고급 소스 분석 글에 바로 진입할 수 있다.

### 개선

너무 세밀한 점수 대신:

```text
Intro
Intermediate
Advanced
```

정도로만 표시한다.

---

## I-56. Difficulty as Absolute Truth

### 난이도를 고정된 객관값처럼 사용

### 문제

독자의 배경에 따라 난이도는 달라진다.

### 개선

난이도와 함께 선행 지식을 표시한다.

---

## I-57. Audience-Free Navigation

### 대상 독자 구분이 없음

### 개선

필요한 곳에 다음 역할을 표시한다.

```text
Firmware Engineer
Kernel Developer
CUDA Beginner
Performance Engineer
```

모든 페이지에 강제할 필요는 없다.

---

## I-58. Mobile Navigation Collapse

### 데스크톱 구조를 모바일 메뉴에 그대로 넣음

### 문제

- 메뉴가 너무 깊음
- 접기 항목이 많음
- 현재 위치가 보이지 않음

### 개선

모바일에서는 핵심 Topic과 검색만 우선 제공한다.

---

## I-59. Sidebar Overload

### 긴 글에서 사이드바에 너무 많은 정보

```text
TOC
Series
Related
Ads
Author
Tags
```

### 문제

본문 집중을 방해하고 좁은 화면에서 복잡하다.

### 개선

현재 글에 가장 필요한 하나나 둘만 고정한다.

---

## I-60. TOC as Heading Dump

### 모든 H2·H3·H4를 목차에 표시

### 문제

목차가 본문만큼 길어진다.

### 개선

기본은 H2·핵심 H3만 표시하고 세부 항목은 접는다.

---

# Information Architecture 분야 핵심 묶음

## 분류 체계

- Category Explosion
- Category Overlap
- Tag Explosion
- Synonym Tag Drift
- Series and Topic Duplication

## 진입과 탐색

- Latest-Only Homepage
- No Start Here
- Missing Breadcrumb
- Archive-First Navigation
- Pagination as Discovery

## 링크 구조

- Orphan Article
- Dead-End Article
- Related Posts by Shared Tag Only
- Internal Link as “Click Here”
- Link Rot Inside the Site

## 검색

- Search as Exact Match
- Korean-English Search Split
- Search Ranking by Frequency
- Code Noise in Search
- Search Without Filters

## 지식베이스

- Topic Hub as Article List
- Stale Topic Hub
- Missing Cross-Topic Links
- Knowledge Graph Without Editorial Judgment
- No Content Status in Navigation

---

# hawk90에서 우선 확인할 10개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Latest-Only Homepage | 최신 글이 사이트 전체 정체성을 지배 |
| 2 | Missing Topic Hub | 전문 분야의 대표 진입점이 약함 |
| 3 | Orphan Article | 과거 핵심 글이 묻힐 가능성 큼 |
| 4 | Series and Topic Duplication | Tag·Series·Category 역할 중복 가능 |
| 5 | Search Ranking by Frequency | 긴 코드·로그 글이 유리할 수 있음 |
| 6 | Korean-English Search Split | 한글 설명과 영문 기술 용어가 혼재 |
| 7 | Related Posts by Shared Tag Only | 시스템 분야에서 관계 정확도가 낮음 |
| 8 | Missing Cross-Topic Links | 네 콘텐츠의 가장 큰 차별점이 연결성 |
| 9 | No Content Status in Navigation | 오래된 기술 문서의 신뢰 판단 어려움 |
| 10 | TOC as Heading Dump | 장문 기술 문서에서 실제 사용성 저하 |

다음은 **Task 2-4. Performance & Build Anti-patterns**다. Astro 빌드, Shiki, Markdown 처리, 검색 인덱스, 이미지, 폰트, 클라이언트 JavaScript, GitHub Actions와 대규모 콘텐츠 처리 문제를 카탈로그화하면 된다.

## 29. assistant

# Task 2-4. Performance & Build Anti-patterns

이번에는 **Astro 빌드, Markdown 처리, Shiki, 검색 인덱스, 이미지, 폰트, 클라이언트 JavaScript, GitHub Actions**에서 반복되는 안티패턴을 정리한다.

---

## P-01. Full Corpus Rebuild

### 글 하나를 수정해도 전체 사이트 재생성

### 증상

- 작은 오탈자 수정에도 모든 Markdown 처리
- 모든 코드 블록 재하이라이팅
- 전체 검색 인덱스 재생성
- 모든 OG 이미지 검사
- 전체 Sitemap·RSS 재생성

### 왜 문제인가

콘텐츠가 적을 때는 단순하지만, 수백 개 글과 수만 개 코드 블록에서는 로컬 개발과 CI 모두 느려진다.

### 개선 방향

```text
개발 빌드
배포 빌드
정기 감사
```

를 분리한다.

---

## P-02. Heap Expansion as Optimization

### 빌드 실패를 메모리 증가로 해결

```text
--max-old-space-size=8192
```

### 증상

- 메모리 부족 때마다 heap 상향
- CI runner 사양에 의존
- GC 시간이 계속 증가
- 근본 병목은 측정하지 않음

### 왜 문제인가

메모리 증가는 임시 안전망이지 확장 전략이 아니다.

### 개선 방향

- peak RSS 측정
- 단계별 메모리 사용 측정
- 대형 객체 생명주기 단축
- 콘텐츠 chunk 처리
- 불필요한 AST 유지 제거

---

## P-03. Build Pipeline Monolith

### 모든 생성·검사를 하나의 build에 묶음

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

### 문제

- 실패 원인 파악이 어려움
- 빠른 로컬 확인이 불가능
- 경고성 감사도 배포를 막음
- 작은 수정도 전체 파이프라인 실행

### 개선

```text
build:fast
build:release
audit:content
audit:links
generate:assets
```

로 역할을 분리한다.

---

## P-04. Every Audit Is a Release Blocker

### 모든 품질 검사가 배포를 차단

### 문제

이미지 없음, 오래된 글, 문체 문제까지 모두 오류로 취급하면 결국 검사 자체를 끄게 된다.

### 개선

```text
ERROR
WARNING
INFO
```

등급을 나눈다.

배포 차단은 깨진 링크, 스키마 오류, 생성 실패처럼 명확한 문제로 제한한다.

---

## P-05. Parse the Same Content Repeatedly

### 도구마다 Markdown을 다시 읽음

링크 감사, 시리즈 검사, 검색 생성, 중복 검사, 신선도 검사가 각각 파일을 파싱한다.

### 문제

- I/O와 파싱 비용 중복
- parser 설정 불일치
- front matter 해석 차이
- 규칙 간 결과 충돌

### 개선

한 번 파싱한 공통 content manifest를 모든 도구가 사용한다.

---

## P-06. AST Retention Explosion

### 모든 문서 AST를 빌드 끝까지 보관

### 문제

대형 콘텐츠에서 메모리를 급격히 소비한다.

### 개선

- 문서 단위 처리
- 필요한 metadata만 추출
- 처리 후 AST 해제
- 전역 배열에 전체 tree 저장 금지

---

## P-07. Build-Time Everything

### 모든 작업을 빌드 시점에 수행

### 증상

- 읽기 시간 계산
- OG 생성
- 링크 그래프
- 검색 인덱스
- 중복 분석
- 이미지 분석
- 모든 변환

### 문제

배포 빌드가 너무 많은 책임을 가진다.

### 개선

변경 빈도에 따라 나눈다.

```text
매 빌드
변경 파일만
주간 배치
수동 감사
```

---

## P-08. No Build Budget

### 빌드 시간·메모리 목표가 없음

### 문제

느려져도 “원래 콘텐츠가 많아서”라고 받아들이게 된다.

### 개선

예산을 정한다.

```text
로컬 빠른 검증: 10초 이내
배포 빌드: 5분 이내
peak memory: 4GB 이하
```

환경에 맞게 수치는 조정하되 추세를 기록한다.

---

## P-09. No Build Regression Tracking

### 빌드가 느려져도 언제부터인지 모름

### 개선

CI에서 다음을 기록한다.

- 총 시간
- 페이지 수
- 코드 블록 수
- peak memory
- 출력 크기
- 검색 인덱스 크기

변화율이 임계치를 넘으면 경고한다.

---

## P-10. Content Count as the Only Scale Metric

### 글 개수만 규모로 봄

### 문제

성능 비용은 글 수보다 다음에 더 크게 좌우될 수 있다.

- 코드 블록 수
- 코드 길이
- 수식 수
- 이미지 수
- 다이어그램 수
- heading 수
- 생성 페이지 수

### 개선

콘텐츠 complexity metric을 별도로 관리한다.

---

# Syntax Highlighting

## P-11. Highlight Everything

### 모든 `<pre>`를 syntax highlighting

로그, 출력, 디렉터리 구조, 레지스터 덤프까지 Shiki로 처리한다.

### 문제

불필요한 토큰화와 HTML 증가가 발생한다.

### 개선

```text
source code
shell command
plain output
log
dump
```

역할을 구분한다.

---

## P-12. Load Every Language Grammar

### 사용하지 않는 언어까지 모두 로드

### 문제

초기화 시간과 메모리 사용량이 증가한다.

### 개선

실제 사용하는 언어만 allowlist로 관리한다.

새 언어가 필요할 때 명시적으로 추가한다.

---

## P-13. Grammar Alias Duplication

### 같은 언어가 여러 alias로 중복 로드

```text
cpp
c++
cxx
cplusplus
```

### 개선

canonical language id를 정하고 alias는 입력 정규화로 처리한다.

---

## P-14. Unknown Language Fallback to Heavy Parser

### 미등록 언어를 무거운 자동 감지로 처리

### 문제

오타 하나가 예측하지 못한 parser 비용을 만든다.

### 개선

알 수 없는 언어는 `text`로 fallback하고 감사에서 경고한다.

---

## P-15. Dual-Theme HTML Duplication

### 다크·라이트 테마 토큰을 모두 HTML에 포함

### 문제

코드 블록이 많으면 출력 HTML이 크게 증가한다.

### 개선

현재 방식의 실제 출력 크기를 측정하고, 필요하면 CSS variable 기반 또는 단일 기본 테마를 검토한다.

---

## P-16. Runtime Highlighting

### 브라우저에서 코드 하이라이팅

### 문제

- 긴 글에서 main thread 점유
- 첫 렌더 후 layout 변화
- 모바일 성능 저하
- JavaScript 의존

### 개선

기술 블로그는 기본적으로 빌드 타임 highlighting이 적합하다.

---

## P-17. Line-Level Feature Everywhere

### 모든 코드 블록에 line number·copy·wrap·mark 기능 적용

### 문제

작은 코드 블록에도 DOM과 CSS가 과도해진다.

### 개선

기능을 코드 블록 길이와 metadata에 따라 선택한다.

---

## P-18. Full Source in Article

### 긴 전체 소스를 본문에 포함

### 성능 문제

- 하이라이팅 시간 증가
- HTML 용량 증가
- DOM 노드 증가
- 검색 인덱스 오염

### 개선

본문은 핵심 부분만, 전체 코드는 별도 파일로 제공한다.

---

# Search

## P-19. Full Body Search Index

### 모든 본문 텍스트를 검색 JSON에 포함

### 문제

- 인덱스 크기 폭증
- 코드·로그 노이즈
- 파싱 시간 증가
- 모바일 메모리 증가

### 개선

제목, 설명, 소제목, 키워드, 핵심 excerpt 중심으로 구성한다.

---

## P-20. Eager Search Index Loading

### 검색을 사용하지 않아도 인덱스를 다운로드

### 개선

검색 모달을 열 때 지연 로드한다.

---

## P-21. Single Giant Search Index

### 모든 분야를 하나의 거대한 파일로 제공

### 개선

필요하면 Topic이나 콘텐츠 타입별 shard로 나눈다.

```text
search-core.json
search-cpp.json
search-systems.json
```

---

## P-22. Search Index Includes HTML

### 렌더링된 HTML 전체 저장

### 문제

태그 제거와 entity 처리 비용이 크고 불필요한 UI 텍스트가 섞인다.

### 개선

렌더링 전의 정제된 검색 문서를 생성한다.

---

## P-23. Search Snippet Generated at Runtime

### 브라우저에서 전체 본문을 탐색해 snippet 생성

### 문제

검색할 때마다 문자열 처리 비용이 크다.

### 개선

빌드 시 heading별 짧은 excerpt를 준비한다.

---

## P-24. Search Ranking on Main Thread

### 큰 인덱스의 ranking을 UI thread에서 동기 처리

### 문제

입력 중 끊김이 발생한다.

### 개선

- 작은 인덱스 유지
- debounce
- 필요하면 Web Worker 사용
- 결과 개수 제한

---

## P-25. Index Invalidated by Any Change

### 글 하나 수정해도 전체 검색 인덱스 재생성

### 개선

문서별 검색 레코드를 생성하고 마지막 병합만 수행하는 증분 방식을 고려한다.

---

# Images and Generated Assets

## P-26. Original PNG Everywhere

### 고해상도 PNG를 그대로 배포

### 문제

기술 다이어그램과 스크린샷이 많으면 페이지 용량이 커진다.

### 개선

- 사진: AVIF/WebP
- 선형 다이어그램: SVG
- 스크린샷: WebP/PNG 선택
- 원본 크기 제한

---

## P-27. SVG Without Optimization

### 생성된 SVG에 편집기 metadata와 불필요한 path가 남음

### 개선

SVGO 계열 최적화를 적용하되 수식·텍스트가 깨지지 않는지 확인한다.

---

## P-28. Rasterized Technical Diagram

### 벡터로 가능한 구조도를 PNG로 저장

### 문제

- 확대 시 흐림
- 다크모드 대응 어려움
- 텍스트 검색 불가
- 파일 크기 증가

### 개선

가능하면 SVG를 사용한다.

---

## P-29. No Intrinsic Image Dimensions

### `width`와 `height` 없이 이미지 삽입

### 문제

이미지 로딩 중 CLS가 발생한다.

### 개선

빌드 시 실제 크기를 추출해 속성을 넣는다.

---

## P-30. Lazy Loading the LCP Image

### 첫 화면 핵심 이미지까지 lazy load

### 문제

LCP가 늦어진다.

### 개선

첫 화면 대표 이미지는 eager 또는 preload하고, 아래 이미지만 lazy 처리한다.

---

## P-31. Eager Loading Every Image

### 홈 카드 이미지와 본문 이미지를 모두 즉시 로드

### 개선

viewport 아래 자산은 lazy load한다.

---

## P-32. One Image Size for Every Viewport

### 모바일과 데스크톱에 동일한 대형 이미지

### 개선

`srcset`과 `sizes`를 제공한다.

---

## P-33. Generated Asset Staleness

### 제목 변경 후 OG 이미지가 갱신되지 않음

### 개선

입력 hash를 기준으로 파생 자산을 재생성한다.

---

## P-34. Generated Assets Committed Indefinitely

### 파생 파일을 Git에 계속 축적

### 문제

- 저장소 비대화
- merge conflict
- stale 파일 잔존
- 원본과 생성물 혼동

### 개선

배포에서 재생성 가능하면 Git 추적을 피한다.

---

## P-35. Prune by Filename Only

### 파생 자산 정리를 파일명 규칙에만 의존

### 문제

slug 변경, alias, redirect에서 잘못 삭제할 수 있다.

### 개선

현재 content manifest를 기준으로 유효 자산 목록을 만든다.

---

## P-36. Diagram Toolchain in Critical Path

### TikZ·LaTeX 같은 무거운 도구가 모든 배포 빌드에 포함

### 문제

환경 설치가 복잡하고 작은 글 수정도 다이어그램 도구에 의존한다.

### 개선

변경된 다이어그램만 생성하고 결과를 캐시한다.

---

# JavaScript and Rendering

## P-37. JavaScript for Static Metadata

### 날짜·읽기 시간·태그 표시를 클라이언트에서 계산

### 개선

빌드 시 HTML로 생성한다.

---

## P-38. Global Bundle for Page-Specific Features

### 검색, 댓글, 수식, 관리자 기능 JS가 모든 페이지에 포함

### 개선

페이지 유형별로 나누고 필요할 때만 로드한다.

---

## P-39. ClientRouter Tax on Every Page

### 부드러운 전환을 위해 모든 페이지가 라우터 비용 부담

### 문제

기능 자체보다 lifecycle 복잡성이 커질 수 있다.

### 개선

실제 사용자 가치와 성능을 측정하고 progressive enhancement로 유지한다.

---

## P-40. Duplicate Event Registration After Navigation

### 페이지 전환 때 이벤트가 계속 중복 등록

### 증상

- 클릭 한 번에 여러 번 실행
- 메모리 증가
- 검색 모달 중복
- 댓글 재생성

### 개선

명시적 dispose와 단일 lifecycle manager를 둔다.

---

## P-41. Third-Party Script Eager Loading

### Giscus·Analytics·AdSense·Newsletter를 즉시 로드

### 문제

초기 네트워크와 main thread를 점유한다.

### 개선

- 댓글: viewport 근처에서 로드
- 뉴스레터: 사용자 상호작용 후
- 광고: 콘텐츠 안정성 고려
- 분석: 최소 구성

---

## P-42. All Icons in One Library

### 아이콘 몇 개를 위해 전체 라이브러리 번들

### 개선

정적 SVG 또는 tree-shakable import를 사용한다.

---

## P-43. Runtime Theme Initialization Flash

### 테마가 JavaScript 실행 후 적용되어 화면이 번쩍임

### 개선

초기 HTML 전에 작은 inline script로 저장된 테마를 적용하거나 CSS media query를 기본으로 사용한다.

---

## P-44. Font Loading Cascade

### 여러 폰트와 weight가 순차 로딩

### 문제

- 텍스트 교체
- CLS
- 네트워크 증가

### 개선

본문·코드 폰트를 최소화하고 실제 사용하는 weight만 제공한다.

---

## P-45. Local Font Without Subsetting

### 한글·영문 전체 glyph를 큰 파일로 제공

### 개선

필요한 문자 범위를 분할하거나 시스템 폰트 fallback을 적극 활용한다.

---

## P-46. Preload Everything

### 모든 폰트·이미지·스크립트를 preload

### 문제

브라우저 우선순위를 오히려 망친다.

### 개선

LCP와 핵심 폰트처럼 정말 중요한 자원만 preload한다.

---

## P-47. Prefetch Every Link

### 글 목록의 모든 링크를 미리 요청

### 문제

콘텐츠가 많은 홈·태그 페이지에서 네트워크 낭비가 크다.

### 개선

hover·viewport·intent 기반으로 제한한다.

---

## P-48. No JavaScript Failure Fallback

### JS가 실패하면 검색·메뉴·탐색이 동작하지 않음

### 개선

기본 링크와 정적 페이지 구조를 유지한다.

---

# CSS and DOM

## P-49. Utility Class Duplication

### 같은 긴 Tailwind 조합이 여러 파일에 반복

### 문제

빌드 성능보다 유지보수성과 일관성 비용이 커진다.

### 개선

반복되는 의미 단위를 컴포넌트나 semantic class로 추출한다.

---

## P-50. DOM Inflation by Decorative Wrappers

### 스타일을 위해 중첩 `<div>`가 많음

### 문제

장문 글과 많은 카드에서 DOM 크기가 커진다.

### 개선

의미 없는 wrapper를 줄이고 CSS layout을 단순화한다.

---

## P-51. Heading Anchor DOM Bloat

### 모든 heading에 복잡한 anchor wrapper와 icon 추가

### 개선

필요한 최소 markup만 사용하고 hover 시 시각화한다.

---

## P-52. Table Wrapper Everywhere

### 모든 표에 복잡한 스크롤·복사·caption UI

### 문제

간단한 표에도 많은 DOM과 JS가 추가된다.

### 개선

큰 표나 overflow 가능성이 있는 표에만 강화 기능을 쓴다.

---

## P-53. Permanent Offscreen UI

### 검색 모달·메뉴·패널을 항상 DOM에 유지

### 개선

필요할 때 렌더링하거나 최소 markup으로 유지한다.

---

# GitHub Actions and CI

## P-54. Cold Install Every Build

### 매번 dependency를 처음부터 설치

### 개선

package manager cache와 lockfile 기반 캐시를 사용한다.

---

## P-55. Cache Without Correct Key

### 캐시 key가 너무 넓거나 좁음

### 문제

- 잘못된 artifact 재사용
- 매번 cache miss
- dependency 변경 미반영

### 개선

lockfile, Node 버전, 주요 config hash를 key에 포함한다.

---

## P-56. Cache Generated Output Blindly

### content 변경을 고려하지 않고 build output 캐시

### 문제

오래된 페이지나 OG 이미지가 배포될 수 있다.

### 개선

입력 fingerprint를 명확히 한다.

---

## P-57. Duplicate Work Across Jobs

### build, test, deploy job가 각각 전체 콘텐츠 처리

### 개선

한 번 생성한 artifact를 후속 job에서 재사용한다.

---

## P-58. Matrix Build Without Value

### 여러 Node·OS 조합에서 전체 블로그 빌드

### 문제

범용 테마가 아니라 실제 개인 사이트라면 과도할 수 있다.

### 개선

실제 지원 환경만 테스트한다.

---

## P-59. Heavy Audit on Every Commit

### typo 수정에도 전체 중복 분석·신선도 검사

### 개선

변경 파일 기반 감사와 정기 전체 감사를 분리한다.

---

## P-60. No Changed-File Awareness

### 변경 범위를 전혀 활용하지 않음

### 개선

다음은 변경된 문서 중심으로 처리할 수 있다.

- OG 이미지
- 링크 검사
- 이미지 검사
- front matter validation
- 관련 글 후보

---

## P-61. Build Artifact Recompression

### 각 단계에서 같은 파일을 반복 압축·해제

### 개선

artifact 전달 방식을 단순화하고 압축 횟수를 줄인다.

---

## P-62. Deploy Before Smoke Test

### 생성된 정적 결과를 확인하지 않고 바로 배포

### 개선

최소한 다음을 검사한다.

- 홈 200
- 대표 글 200
- Sitemap 존재
- 검색 인덱스 파싱
- 주요 asset 존재
- 내부 링크 샘플

---

## P-63. No Preview Deployment

### 운영 배포 전 실제 결과 확인 불가

### 개선

큰 구조 변경에는 preview 환경이나 artifact 확인 단계를 둔다.

---

## P-64. CI Logs as Profiling

### 단순 시작·종료 시간만 보고 병목 추정

### 개선

빌드 내부 단계별 timing을 별도 출력한다.

---

# Runtime Page Performance

## P-65. Heavy Homepage

### 홈에 너무 많은 카드·이미지·통계·애니메이션

### 문제

가장 많이 방문하는 페이지가 가장 무거워진다.

### 개선

홈은 핵심 Topic과 대표 글 중심으로 제한한다.

---

## P-66. Render Every Archive Item

### 수백 개 글을 한 페이지 DOM에 출력

### 개선

페이지네이션이나 정적 분할을 사용한다.

---

## P-67. Huge In-Page TOC

### 긴 글의 모든 heading을 한 번에 렌더링

### 문제

목차 자체가 복잡하고 모바일에서 부담스럽다.

### 개선

H2 중심, 필요한 H3만 포함한다.

---

## P-68. Sticky Everything

### 헤더·TOC·공유·광고가 모두 sticky

### 문제

화면 공간을 줄이고 scroll 성능을 악화시킨다.

### 개선

한 화면에 하나의 주요 sticky 요소만 둔다.

---

## P-69. Code Block Width Breakout

### 긴 코드가 viewport를 넓혀 전체 레이아웃을 흔듦

### 개선

코드 컨테이너의 overflow를 명확히 관리하고 모바일에서 wrap 정책을 구분한다.

---

## P-70. Math Layout Shift

### KaTeX 스타일이나 폰트가 늦게 적용되어 수식 크기가 바뀜

### 개선

필수 CSS를 초기 렌더에 포함하고 수식 영역 크기 변화를 줄인다.

---

## P-71. Comments in Critical Rendering Path

### 댓글 영역이 본문 초기 렌더를 지연

### 개선

본문과 독립적으로 지연 로드한다.

---

## P-72. Ads Before Content Stability

### 광고가 자리 예약 없이 삽입

### 문제

CLS와 읽기 흐름 저하.

### 개선

광고 슬롯 크기를 예약하고 기술 문서의 논리적 경계를 침범하지 않게 한다.

---

## P-73. Analytics Overcollection

### 여러 분석 도구를 동시에 사용

### 문제

성능·개인정보·운영 복잡성이 증가한다.

### 개선

실제 의사결정에 사용하는 지표만 수집한다.

---

## P-74. Performance Score Theater

### Lighthouse 100 자체가 목표

### 문제

실사용 문제보다 점수 최적화에 집중한다.

### 개선

다음 사용자 행동을 측정한다.

- 글이 빠르게 보이는가
- 검색이 즉시 반응하는가
- 코드 스크롤이 부드러운가
- 페이지 이동 후 상태가 정상인가

---

# Build Reliability

## P-75. Non-Deterministic Build

### 같은 입력인데 결과가 달라짐

### 원인

- 현재 시각 사용
- 랜덤 OG 배치
- 외부 API 의존
- 정렬되지 않은 파일 순회
- 로컬 환경별 폰트 차이

### 개선

빌드 입력을 고정하고 정렬과 locale을 명시한다.

---

## P-76. Network-Dependent Build

### 배포 중 외부 문서나 이미지 다운로드

### 문제

외부 장애가 블로그 배포를 막는다.

### 개선

필요한 자산은 사전에 관리하거나 실패 시 명확한 fallback을 둔다.

---

## P-77. Locale-Dependent Sorting

### 실행 환경에 따라 한글·영문 정렬 순서가 달라짐

### 개선

정렬 locale과 비교 함수를 명시한다.

---

## P-78. Timezone-Dependent Dates

### CI timezone에 따라 게시일이 달라짐

### 개선

날짜 파싱과 출력 timezone을 고정한다.

---

## P-79. Silent Partial Generation

### 일부 OG·SVG 생성이 실패해도 빌드는 성공

### 문제

배포 후 깨진 자산이 발견된다.

### 개선

필수 자산 실패는 명시적으로 오류 처리하고, 선택 자산은 warning으로 남긴다.

---

## P-80. Output Growth Without Alarm

### 정적 결과물이 계속 커지지만 감시하지 않음

### 개선

다음을 기록한다.

```text
전체 dist 크기
HTML 크기
검색 인덱스
이미지
JS
CSS
```

급격한 증가를 경고한다.

---

# hawk90에서 우선 확인할 12개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Full Corpus Rebuild | 콘텐츠와 코드 블록 규모가 이미 큼 |
| 2 | Heap Expansion as Optimization | 8GB heap은 병목 신호 |
| 3 | Parse the Same Content Repeatedly | 감사 스크립트가 많아 중복 가능성 큼 |
| 4 | Highlight Everything | 44,000개 코드 블록에서 영향이 큼 |
| 5 | Full Body Search Index | 검색 파일 크기와 정확도 모두 위험 |
| 6 | Build Pipeline Monolith | 로컬 개발과 배포 책임 분리 필요 |
| 7 | No Build Regression Tracking | 규모 증가 추세를 놓치기 쉬움 |
| 8 | Diagram Toolchain in Critical Path | TikZ 등 외부 도구가 배포 안정성에 영향 |
| 9 | Third-Party Script Eager Loading | Giscus·AdSense 도입 후 성능 저하 가능 |
| 10 | Generated Asset Staleness | OG·SVG·검색 인덱스 동기화 중요 |
| 11 | Heavy Audit on Every Commit | 품질 도구가 개발 속도를 저해할 수 있음 |
| 12 | Output Growth Without Alarm | 정적 사이트라도 배포 크기가 계속 증가 가능 |

# 이번 단계의 핵심 결론

성능 문제의 중심은 Astro 자체가 아니다.

> **콘텐츠 규모와 파생 처리량이 커졌는데, 빌드 모델은 여전히 작은 블로그처럼 전체 재처리를 기본으로 하는 것**

이 가장 큰 위험이다.

따라서 우선순위는 프레임워크 교체가 아니라 다음이다.

```text
측정
처리 단계 분리
공통 manifest
증분 생성
Shiki 범위 축소
검색 인덱스 정제
CI 작업 중복 제거
```

다음은 **Task 2-5. SEO & AdSense Anti-patterns**다. 여기서는 색인, canonical, thin page, 중복 콘텐츠, AI 문체, 저자 신뢰, 정책 페이지, 광고 배치와 “콘텐츠 가치 부족” 대응을 카탈로그 형태로 정리하면 된다.

## 30. assistant

이번에는 **Task 2-5. SEO & AdSense Anti-patterns**다. 이번 파트는 변동 가능성이 있는 영역이라 Google 공식 문서 기준으로 정리하겠다.

## 31. assistant

# Task 2-5. SEO & AdSense Anti-patterns

이번에는 다음 네 영역을 함께 다룬다.

```text
검색 노출
색인 구조
콘텐츠 신뢰성과 독창성
광고 승인·배치
```

먼저 구분해야 할 것이 있다.

> **Google Search의 순위 평가와 AdSense의 사이트 승인·광고 정책은 같은 시스템이 아니다.**

다만 두 영역 모두 사용자가 실제로 이용할 만한 콘텐츠, 명확한 사이트 구조, 독창적인 정보, 안정적인 페이지 경험을 중시한다. Google Search는 검색 순위 조작보다 사람을 위해 만든 유용하고 신뢰할 수 있는 콘텐츠를 권장한다. AdSense 정책은 게시자 콘텐츠가 없거나 가치가 낮은 화면에 Google 광고를 게재하는 것을 허용하지 않는다. citeturn453314search0turn453314search20

또한 AdSense의 **“Low value content”는 공개된 단일 점수나 정확한 체크리스트가 아니다.** 따라서 특정 항목 하나만 고치면 반드시 승인된다고 단정하면 안 된다.

---

# A. 콘텐츠 가치와 독창성

## S-01. Search-First Content

### 검색엔진을 먼저 생각한 콘텐츠

```text
사람이 실제로 궁금해하는 문제
<
검색량이 높은 키워드
```

### 증상

- 검색어마다 별도 글 생성
- 제목이 키워드 조합처럼 보임
- 글의 목적보다 검색 순위가 우선
- 실제 경험 없이 검색 결과를 재조합
- 독자가 읽고도 충분한 답을 얻지 못함

### 문제

Google은 검색 순위를 조작하기 위한 콘텐츠보다, 기존 또는 의도한 독자에게 실질적으로 도움이 되는 사람 중심 콘텐츠를 권장한다. citeturn453314search0turn453314search26

### 개선

```text
실제 질문
→ 직접 분석
→ 근거
→ 재현 가능한 결과
→ 검색 표현 최적화
```

순서로 접근한다.

---

## S-02. Content Quantity Fallacy

### 글 수가 많으면 가치가 높다고 생각

### 증상

- 매일 글 발행 자체가 목표
- 짧은 글을 계속 분리
- 기존 글 갱신보다 신규 글 작성
- 글 수를 AdSense 승인 조건처럼 취급

### 문제

사이트에 글이 많아도 각각의 고유 정보가 적거나 탐색 가치가 낮으면 콘텐츠 가치가 자동으로 높아지지 않는다.

### 개선

다음을 더 중요하게 본다.

```text
고유한 정보
직접 경험
문제 해결력
정확성
완결성
관련 글 연결
```

---

## S-03. Word-Count Padding

### 글자 수를 늘리기 위한 문장

```text
이 기술은 매우 중요합니다.
다양한 환경에서 활용됩니다.
앞으로도 중요성이 커질 것입니다.
```

### 문제

분량은 늘지만 독자가 얻는 정보는 늘지 않는다.

### 개선

추상적인 중요성 대신 구체적인 영향을 쓴다.

```text
BAR 주소가 잘못 할당되면 운영체제가 장치의 MMIO 영역에 접근할 수 없다.
```

---

## S-04. Generic AI Prose

### 어디에나 적용되는 AI형 문체

### 증상

- “자세히 알아보겠습니다”
- “다양한 장점이 있습니다”
- 모든 글의 문장 구조가 비슷함
- 구체적인 환경·실패·판단이 없음

Google은 생성형 AI 사용 자체보다 결과물의 정확성·품질·관련성을 강조하며, 자동 생성된 제목·설명·대체 텍스트 같은 메타데이터도 동일하게 품질 관리해야 한다고 안내한다. citeturn453314search19turn453314search32

### 개선

- 실제 로그
- 사용한 버전
- 실패한 접근
- 직접 내린 판단
- 적용 한계

를 글 안에 포함한다.

---

## S-05. AI Rewrite Without Added Value

### 기존 자료를 AI로 다시 표현

### 증상

- 공식 문서 순서를 그대로 따름
- 표현만 달라짐
- 실험이나 예제가 없음
- 출처 원문보다 정보가 적음

### 개선

최소한 다음 중 하나를 추가한다.

```text
실제 장비 검증
코드 흐름 분석
버전 차이
잘못 알려진 내용 검증
실패 사례
비교 실험
의사결정 기준
```

---

## S-06. Specification Translation Site

### 사양서 번역이 사이트의 대부분

### 문제

번역 자체가 유용할 수는 있지만, 사이트 전체가 원문 재서술에 머물면 작성자의 독창적인 가치가 약해진다.

### 개선

```text
사양 내용
+
실제 구현
+
로그에서 확인하는 방법
+
자주 발생하는 오해
+
작성자의 검증 결과
```

로 확장한다.

---

## S-07. Aggregation Without Synthesis

### 여러 자료를 모았지만 통합하지 않음

### 증상

- 링크와 인용문은 많음
- 자료마다 주장하는 내용을 나열
- 최종 판단이나 구조화가 없음

### 개선

자료를 수집한 뒤 다음을 제공한다.

```text
공통점
차이점
충돌하는 부분
실제 적용 판단
남은 불확실성
```

---

## S-08. Experience-Free Expertise

### 전문적인 표현은 있지만 직접 경험이 없음

### 증상

- 깊은 용어 사용
- 실제 환경 정보 없음
- 관찰 로그 없음
- 실험 결과 없음
- 실패와 한계가 없음

### 개선

직접 경험이 있는 글은 이를 명확히 표시한다.

```text
Tested
Observed
Measured
Implemented
Debugged
```

조사형 글은 조사형 글이라고 구분한다.

---

## S-09. Authority by Bio Only

### About 페이지로만 전문성을 증명

### 문제

긴 경력 소개가 있어도 개별 글의 근거가 약하면 신뢰가 완성되지 않는다.

### 개선

전문성은 각 문서에서도 보여야 한다.

- 검증 환경
- 참고 규격
- 코드 위치
- 측정 방법
- 수정일
- 적용 범위

---

## S-10. No Editorial Purpose

### 사이트가 무엇을 제공하는지 불명확

### 증상

- C++, 역사, 일상, 뉴스, 제품 리뷰가 모두 섞임
- 홈의 설명이 포괄적
- 독자층이 불명확
- 어떤 글이 핵심인지 알 수 없음

### 개선

```text
누구에게
어떤 문제를
어떤 방식으로 설명하는 사이트인가
```

를 한두 문장으로 정한다.

---

# B. Thin Content와 페이지 품질

## S-11. Thin Article

### 독립 페이지로서 정보량이 부족한 글

### 증상

- 정의 한두 문단
- 코드 한 개
- 결론 없음
- 다른 글과 합칠 수 있음
- 검색 결과에서 기대한 답을 충분히 제공하지 못함

### 주의

짧다고 무조건 Thin Content는 아니다.

짧아도 다음이 명확하면 가치가 있을 수 있다.

- 특정 오류의 정확한 해결법
- 희귀한 레지스터 정보
- 재현 가능한 작은 실험
- 빠른 Reference

---

## S-12. Thin Tag Page

### 제목과 글 목록만 있는 태그 페이지

```text
Tag: PCIe

- 글 A
- 글 B
```

### 문제

태그 페이지가 수백 개 생성되면 사이트에 고유 설명이 거의 없는 목록형 URL이 많이 생긴다.

### 개선

- 중요한 태그는 Topic Hub로 승격
- 글이 적은 태그 페이지는 색인 필요성 검토
- 태그 설명과 대표 글 추가
- 동의어 태그 통합

---

## S-13. Thin Series Page

### 시리즈 제목과 목차만 있음

### 개선

시리즈 페이지에 다음을 추가한다.

```text
학습 목표
대상 독자
선행 지식
전체 구조
각 글의 역할
완독 후 다음 단계
```

---

## S-14. Thin Category Page

### 범주 설명 없이 카드만 나열

### 개선

카테고리 페이지가 직접 답해야 한다.

> 이 분야가 무엇이고, 어디서 시작하며, 어떤 순서로 읽어야 하는가?

---

## S-15. Empty Search Page Indexing

### 검색 결과 페이지가 색인됨

### 문제

검색어별로 내용이 거의 없는 URL이 대량 생성될 수 있다.

### 개선

내부 검색 결과 페이지는 일반적으로 검색 색인 대상으로 만들 필요가 적다.

---

## S-16. Filter Combination Indexing

### 필터 조합마다 URL과 색인 페이지 생성

```text
?topic=cpp&type=guide&year=2026
```

### 문제

유사한 목록 URL이 대량 발생한다.

### 개선

대표 Topic·Series 페이지를 제외한 임의 필터 조합은 색인 전략을 별도로 관리한다.

---

## S-17. Pagination Duplication

### 페이지네이션 URL이 거의 동일한 문맥을 가짐

### 문제

각 페이지가 단순 글 카드 나열뿐이라면 독립적인 검색 유입 가치가 낮다.

### 개선

페이지네이션은 탐색 기능으로 유지하되 대표 허브의 고유 설명과 경쟁하지 않게 한다.

---

## S-18. Placeholder Page Exposure

### 작성 중 페이지가 공개됨

```text
내용 준비 중
추후 업데이트 예정
```

AdSense 정책은 게시자 콘텐츠가 없거나 가치가 낮은 화면, 공사 중인 화면에 광고를 게재하지 못하도록 한다. citeturn453314search20

### 개선

- Draft로 유지
- 완성 후 공개
- 필요한 경우 광고 비활성화
- 검색 색인 제외

---

## S-19. Tool Page Without Publisher Content

### 계산기·검색·도구만 있고 설명이 없음

### 문제

도구 자체가 유용하더라도 사용법·제약·해석 없이 입력창과 결과만 제공하면 게시자 콘텐츠가 부족해 보일 수 있다.

### 개선

- 도구 목적
- 입력 의미
- 결과 해석
- 한계
- 예제
- 관련 기술 설명

을 함께 제공한다.

---

## S-20. Image Gallery Without Explanation

### 이미지나 다이어그램만 나열

### 개선

각 이미지가 무엇을 보여주며 어떤 결론을 뒷받침하는지 설명한다.

---

# C. 중복 콘텐츠와 Canonical

## S-21. Duplicate URL Variants

### 동일 페이지가 여러 URL로 접근됨

```text
/post
/post/
/post/index.html
```

### 문제

검색엔진이 대표 URL을 직접 선택해야 하고 링크 신호가 분산될 수 있다.

Google은 중복되거나 매우 유사한 페이지가 있을 때 canonical URL을 지정하는 방법을 제공한다. citeturn453314search2turn453314search8

### 개선

- 일관된 trailing slash 정책
- 내부 링크 통일
- Sitemap에 canonical URL만 포함
- 필요하면 redirect
- self-referencing canonical

---

## S-22. Canonical to the Homepage

### 모든 페이지 canonical이 홈을 가리킴

### 문제

개별 글이 홈과 동일한 콘텐츠가 아니므로 잘못된 canonical 신호가 된다.

### 개선

개별 글은 일반적으로 자기 URL을 canonical로 사용한다. 실제 중복 페이지일 때만 대표 페이지를 지정한다.

---

## S-23. Canonical to a Non-Equivalent Page

### 유사 주제라는 이유로 다른 글을 canonical 지정

```text
CUDA Stream 글
→ CUDA 전체 가이드 canonical
```

### 문제

Canonical은 단순 관련 페이지를 묶는 기능이 아니다. 대표 페이지에는 중복 페이지 내용의 상당 부분이 포함돼야 한다. citeturn453314search15

### 개선

글을 통합했다면 이전 페이지를 redirect하거나, 실제로 거의 동일한 경우에만 canonical을 사용한다.

---

## S-24. Canonical and Noindex Conflict

### canonical과 noindex를 무계획하게 함께 사용

### 문제

대표 페이지 선택과 색인 차단이라는 서로 다른 신호가 섞인다.

Google은 canonical URL이 `noindex` 상태인지 확인하라고 안내한다. citeturn453314search15

### 개선

목적을 구분한다.

```text
중복 통합 → canonical 또는 redirect
검색 제외 → noindex
```

---

## S-25. Canonical Blocked by robots.txt

### 크롤러가 canonical을 확인할 수 없음

### 문제

robots.txt로 막으면 페이지 안의 canonical 요소를 읽지 못할 수 있다.

### 개선

색인을 막으려면 크롤링 가능 상태에서 `noindex`를 사용해야 한다. Google은 `noindex` 태그로 색인을 차단하는 방법을 별도로 안내한다. citeturn453314search36

---

## S-26. Duplicate Excerpts

### 여러 글이 같은 서론과 description 사용

### 문제

각 페이지가 어떤 고유 질문에 답하는지 구분하기 어려워진다.

### 개선

각 문서의 차별적인 범위와 결과를 description에 작성한다.

---

## S-27. Topic Cannibalization

### 같은 검색 의도를 여러 글이 경쟁

```text
PCIe BAR란
PCIe BAR 설명
PCIe BAR 완벽 정리
PCIe BAR 개념
```

### 개선

- 대표 Concept 하나
- Guide
- Debug Note
- Reference

처럼 역할별 검색 의도를 구분한다.

---

## S-28. Old and New Article Competition

### 구판과 신판이 동시에 검색됨

### 개선

```text
구판 상단에 대체 문서 안내
상태를 superseded로 표시
내부 링크를 신판으로 전환
필요하면 redirect 또는 canonical 검토
```

---

## S-29. Copying Content Across Series

### 시리즈마다 동일한 선행 설명 반복

### 개선

대표 Concept 문서로 분리하고 시리즈 글에서는 필요한 만큼만 요약한다.

---

## S-30. Multi-Language Duplication Without hreflang

### 한글·영문판 관계가 표시되지 않음

### 문제

번역 페이지가 독립적인 중복처럼 해석될 가능성이 있고 사용자가 적절한 언어 페이지를 찾기 어렵다.

### 개선

완전한 번역 페이지를 운영한다면 각 언어 URL·canonical·언어 연결 정책을 일관되게 관리한다.

---

# D. 색인과 크롤링

## S-31. Sitemap as a Dump

### 공개 URL을 전부 Sitemap에 넣음

### 포함되기 쉬운 것

- 태그 1개짜리 페이지
- 검색 페이지
- 관리자 페이지
- Draft
- redirect URL
- 중복 필터 페이지

### 개선

Sitemap에는 검색에 노출할 가치가 있는 canonical URL만 넣는다.

---

## S-32. Noindex but Included in Sitemap

### 색인 제외 페이지가 Sitemap에 존재

### 문제

한쪽에서는 색인을 요청하고 다른 쪽에서는 막는 모순된 운영이 된다.

### 개선

Sitemap과 index 정책을 같은 manifest에서 생성한다.

---

## S-33. Draft Leakage

### Draft가 정적 결과물이나 Sitemap에 포함

### 개선

빌드 단계에서 Draft를 완전히 제외하고 CI에서 검증한다.

---

## S-34. Missing Canonical in Generated Pages

### 글에는 canonical이 있지만 Topic·Series에는 없음

### 개선

검색 대상이 되는 모든 페이지 유형에 canonical 정책을 정의한다.

---

## S-35. Soft 404 Article

### URL은 200이지만 실질 콘텐츠가 없음

예:

```text
글을 찾을 수 없습니다.
이 콘텐츠는 이동했습니다.
```

### 개선

삭제된 페이지는 적절한 상태 코드나 관련 페이지 redirect를 사용한다.

---

## S-36. Redirect Chain

### URL 변경이 누적됨

```text
A → B → C → D
```

### 문제

크롤링과 사용자 이동이 불필요하게 길어진다.

### 개선

오래된 모든 URL을 최종 URL로 직접 연결한다.

---

## S-37. Internal Links to Redirects

### 사이트 내부 링크가 이전 주소를 계속 가리킴

### 개선

redirect는 외부 링크 보존용으로 사용하고 내부 링크는 최종 canonical URL로 수정한다.

---

## S-38. Uncrawlable Navigation

### JavaScript 클릭 이벤트로만 페이지 이동

Google Search Essentials는 검색엔진이 페이지를 발견할 수 있도록 크롤링 가능한 링크를 만들 것을 권장한다. citeturn453314search26

### 개선

기본 `<a href>`를 유지하고 JavaScript 전환은 보조 기능으로 사용한다.

---

## S-39. Orphan Canonical Content

### canonical 페이지지만 내부 링크가 없음

### 문제

Sitemap에만 존재하고 사이트 구조상 중요성이 드러나지 않는다.

### 개선

대표 허브, 시리즈 또는 관련 글에서 연결한다.

---

## S-40. Indexing Everything by Default

### 공개된 모든 URL은 검색돼야 한다고 생각

### 문제

검색 결과 페이지, 얕은 태그, 실험적 페이지, 관리자 화면 등은 색인 가치가 낮을 수 있다.

### 개선

페이지 유형별로 명시적 정책을 둔다.

```text
index
noindex
draft
redirect
removed
```

---

# E. 제목·설명·구조화 데이터

## S-41. Title Template Duplication

### 모든 제목이 같은 접미사를 반복

```text
PCIe BAR | Hawk Blog | Systems Notes
```

사이트 이름이 너무 길면 실제 문서 제목이 검색 결과에서 잘릴 수 있다.

### 개선

고유 제목을 우선하고 브랜드 접미사는 짧게 유지한다.

---

## S-42. Keyword-Stuffed Title

### 제목에 관련 키워드를 전부 삽입

Google Search Essentials는 사용자가 검색할 표현을 제목·주요 heading·링크 문구 등 눈에 띄는 위치에 자연스럽게 사용할 것을 권장하지만, 이는 나열식 과잉 삽입을 의미하지 않는다. citeturn453314search26

### 개선

한 페이지당 하나의 주요 질문이나 결과에 집중한다.

---

## S-43. Duplicate Meta Description

### 여러 페이지가 같은 설명 사용

### 개선

각 페이지에서 독자가 얻는 고유 결과를 설명한다.

---

## S-44. Automated First-Sentence Description

### 본문 첫 문장을 그대로 meta description으로 사용

### 문제

첫 문장이 배경 설명이면 검색 결과에서 가치가 드러나지 않는다.

### 개선

수동 description을 핵심 글부터 작성하고, fallback도 목적·범위 중심으로 생성한다.

---

## S-45. Empty Description

### description 누락

Google이 본문에서 snippet을 만들 수 있지만, 중요한 대표 글은 직접 설명을 작성하는 편이 사이트의 의도를 통제하기 쉽다.

---

## S-46. Multiple H1

### 레이아웃 제목과 글 제목이 모두 H1

### 개선

페이지의 주 제목을 하나로 명확히 하고 나머지는 적절한 heading level을 사용한다.

---

## S-47. Heading for Styling

### 글자 크기를 위해 heading 사용

```text
H2 다음 H5
```

### 문제

문서 구조와 목차가 왜곡된다.

### 개선

스타일은 CSS로 처리하고 heading은 의미 순서를 따른다.

---

## S-48. Structured Data Decoration

### JSON-LD만 넣으면 SEO가 해결된다고 생각

Google의 구조화 데이터 가이드라인은 markup이 해당 페이지에 실제로 표시되고 설명되는 콘텐츠와 일치해야 한다고 요구한다. citeturn453314search37

### 개선

먼저 화면의 콘텐츠 모델을 정리한 뒤 구조화 데이터로 표현한다.

---

## S-49. Fabricated Structured Data

### 화면에 없는 평가·저자·날짜를 markup에 추가

### 문제

구조화 데이터가 실제 콘텐츠를 정확하게 표현하지 않는다.

### 개선

화면에서 확인할 수 있는 정보만 사용한다.

---

## S-50. One Schema Type Everywhere

### 모든 페이지를 `Article`로 표시

### 문제

홈, Topic Hub, 저자 페이지, 검색 페이지의 역할이 다르다.

### 개선

페이지 성격에 맞게 최소한으로 사용한다.

```text
WebSite
Person
BlogPosting 또는 TechArticle
BreadcrumbList
```

---

# F. 신뢰성과 운영 정보

## S-51. Anonymous Expert Content

### 고급 기술 글인데 작성자 정보가 없음

### 개선

- 작성자 이름
- 전문 분야
- About 링크
- 수정·문의 방법

을 제공한다.

---

## S-52. Inflated Author Claim

### 경력이나 권위를 과장

### 문제

실제 근거와 어긋나면 신뢰를 떨어뜨린다.

### 개선

구체적인 경험 범위를 사실대로 설명한다.

```text
CUDA와 FPGA 기반 영상 처리 경험
PCIe·CXL 펌웨어 및 드라이버 연구
```

처럼 확인 가능한 범위를 쓴다.

---

## S-53. No Contact Path

### 오류를 발견해도 제보할 방법이 없음

### 개선

- GitHub Issue
- 이메일
- 댓글
- 수정 제안 링크

중 하나를 명확히 제공한다.

---

## S-54. Missing Privacy Policy

### 분석·댓글·광고를 사용하지만 개인정보 안내가 없음

### 개선

사이트에서 실제 사용하는 서비스에 맞는 개인정보 처리방침을 제공한다.

특히 Analytics, AdSense, Giscus, 쿠키·로컬 스토리지 사용 여부를 실제 구현과 일치시켜야 한다.

---

## S-55. Template Privacy Policy

### 다른 사이트 정책을 복사

### 문제

실제로 사용하지 않는 서비스가 적혀 있거나 사용 중인 서비스가 누락된다.

### 개선

현재 사이트의 데이터 흐름을 기준으로 작성한다.

---

## S-56. Missing Content Update Policy

### 글이 언제·왜 수정되는지 불명확

### 개선

간단한 원칙을 공개할 수 있다.

```text
중대한 기술 오류는 즉시 수정
버전 변화는 검증 후 업데이트
역사적 글은 삭제보다 상태 표시
```

---

## S-57. No Correction History

### 오류가 수정돼도 아무 표시 없음

### 개선

중요한 변경은 짧은 수정 기록을 제공한다.

---

## S-58. Broken About Page

### About은 있지만 일반적인 자기소개만 있음

### 개선

About 페이지는 사이트와 콘텐츠를 이해하도록 해야 한다.

- 어떤 주제를 다루는가
- 어떤 경험을 기반으로 하는가
- 글을 어떻게 검증하는가
- 독자가 무엇을 기대할 수 있는가

---

## S-59. Missing Ownership Signal

### 사이트 운영 주체가 보이지 않음

### 개선

푸터·About·저자 페이지에서 일관된 이름과 사이트 정체성을 사용한다.

---

## S-60. Unclear Affiliate or Sponsorship Disclosure

### 광고·제휴·협찬 여부가 불명확

### 개선

경제적 관계가 있는 글에서는 명확히 공개한다.

---

# G. 광고 배치와 사용자 경험

## S-61. Ads on Non-Content Pages

### 콘텐츠가 없는 화면에도 광고

예:

- 404
- 검색 결과 없음
- 관리자 화면
- 로그인 화면
- 빈 태그 페이지
- 로딩 화면

AdSense 정책은 게시자 콘텐츠가 없거나 가치가 낮은 화면, 탐색·알림 목적 화면 등에 광고를 게재하지 못하도록 한다. citeturn453314search20

### 개선

페이지 유형별 광고 활성화 정책을 둔다.

---

## S-62. Ads Before Primary Content

### 본문보다 광고가 먼저 보임

### 문제

사용자가 원하는 정보를 찾기 어렵다.

Google의 광고 배치 모범 사례는 광고를 사용자가 관심 있어 하는 콘텐츠 근처에 두되, 사용자가 찾는 콘텐츠를 쉽게 발견할 수 있게 하라고 권장한다. citeturn453314search45

### 개선

첫 화면에서 문서 제목·목적·핵심 내용이 광고보다 우선하게 한다.

---

## S-63. Ads Between Explanation and Evidence

### 설명과 코드·표 사이에 광고

```text
이 결과가 발생한 이유는
[광고]
다음 로그에서 볼 수 있다.
```

### 문제

기술 문서의 논리적 흐름이 끊긴다.

### 개선

광고는 다음처럼 내용 경계가 명확한 위치에 둔다.

- 주요 장이 끝난 뒤
- 본문 종료 후
- 관련 글 이전
- 큰 섹션 사이

---

## S-64. Ads Inside Code Walkthrough

### 코드 설명 중간에 광고 삽입

### 문제

코드와 설명의 대응 관계가 깨진다.

### 개선

코드 블록, 캡션, 설명을 하나의 보호된 콘텐츠 단위로 취급한다.

---

## S-65. Ads Inside Step-by-Step Procedure

### 단계 중간에 광고

```text
1단계
2단계
광고
3단계
```

### 문제

작업 순서를 놓치기 쉽다.

### 개선

전체 절차가 끝난 뒤 배치한다.

---

## S-66. Auto Ads Without Exclusion Zones

### 자동 광고가 모든 본문 위치에 삽입될 수 있음

Auto Ads는 사이트를 분석해 광고 위치를 자동 선택하며, 광고 형식과 개수 등을 설정에서 조정할 수 있다. citeturn453314search24turn453314search30

### 개선

기술 글에서는 다음 영역을 광고 제외 대상으로 고려한다.

- 코드와 해설
- 표와 해석
- 다이어그램과 캡션
- 단계별 튜토리얼
- 경고·안전 안내
- 결론 직전

---

## S-67. Maximum Ad Density

### 가능한 모든 위치에 광고

### 문제

수익 최적화가 콘텐츠 소비를 방해한다.

### 개선

페이지 길이만으로 광고 수를 결정하지 말고 문서 구조와 실제 읽기 경험을 기준으로 한다.

---

## S-68. Ad-Shaped Navigation

### 메뉴·다운로드 버튼과 광고가 비슷함

### 문제

사용자가 광고를 콘텐츠 탐색 요소로 오인할 수 있다.

### 개선

광고와 사이트 UI의 시각적 역할을 명확히 구분한다.

---

## S-69. Accidental Click Layout

### 광고가 버튼·코드 복사·페이지 이동 요소에 붙어 있음

### 문제

의도하지 않은 클릭을 유도할 수 있다.

Google 광고 배치 정책은 광고의 부정확한 클릭 유도나 사용자 행동을 방해하는 배치를 제한한다. citeturn453314search5

### 개선

광고 주변에 충분한 공간을 두고 상호작용 요소와 분리한다.

---

## S-70. Ad-Induced CLS

### 광고가 늦게 삽입되며 본문을 밀어냄

### 개선

- 광고 슬롯 크기 예약
- layout shift 측정
- 모바일별 크기 검증
- 코드·표 위치 변화 방지

---

## S-71. Sticky Ad Competition

### 헤더·TOC·광고가 모두 고정

### 문제

본문 화면이 좁아지고 특히 모바일에서 읽기가 어렵다.

### 개선

고정 요소의 총 화면 점유율을 제한한다.

---

## S-72. Auto-Refreshing Ads

### 사용자 요청 없이 광고를 주기적으로 새로고침

AdSense 광고 배치 정책은 사용자가 요청하지 않은 자동 새로고침이나 자동 이동 방식의 광고 게재를 허용하지 않는다. citeturn453314search5

---

## S-73. Ads on Draft or Preview

### 개발·미리보기 페이지에 실제 광고 코드

### 개선

Production canonical 페이지에만 광고가 활성화되도록 환경을 분리한다.

---

## S-74. Ads on Superseded Content

### 폐기된 문서에도 같은 광고 밀도

### 문제

사용자가 잘못된 정보를 읽는 동안 광고만 노출될 수 있다.

### 개선

대체 문서로 강하게 안내하고, 내용 가치가 거의 없다면 광고를 비활성화한다.

---

## S-75. Monetization Before Page Quality

### 승인과 광고 삽입을 먼저 처리

### 개선 순서

```text
콘텐츠 구조
신뢰 페이지
색인 정리
모바일 경험
내부 링크
성능
광고 신청
광고 배치
```

---

# hawk90에서 특히 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Specification Translation Site | 규격·공식 문서 기반 글의 고유 가치 확인 필요 |
| 2 | AI Rewrite Without Added Value | 짧은 기간에 다량 생성된 글의 경험·근거 강화 필요 |
| 3 | Thin Tag Page | 태그가 많으면 얕은 색인 URL이 대량 발생 |
| 4 | Thin Series Page | 시리즈를 단순 목록이 아닌 학습 허브로 바꿔야 함 |
| 5 | Topic Cannibalization | CXL·PCIe·Bootloader 유사 글끼리 경쟁 가능 |
| 6 | Old and New Article Competition | 글이 많아 구판·신판이 공존할 가능성이 큼 |
| 7 | Duplicate Meta Description | 대량 콘텐츠에서 자동 설명 중복 가능 |
| 8 | Indexing Everything by Default | 태그·검색·관리·빈 페이지 색인 감사 필요 |
| 9 | Orphan Canonical Content | 좋은 과거 글의 내부 링크 부족 가능 |
| 10 | Experience-Free Expertise | 실제 업무·실험 기반 흔적이 차별화 핵심 |
| 11 | Broken About Page | 일반 자기소개보다 전문 분야와 작성 원칙 필요 |
| 12 | Missing Privacy Policy | AdSense·Analytics·Giscus 사용 시 중요 |
| 13 | Ads Between Explanation and Evidence | 기술 문서의 논리 흐름을 가장 크게 훼손 |
| 14 | Auto Ads Without Exclusion Zones | 코드·표·다이어그램 사이 광고 방지 필요 |
| 15 | Ad-Induced CLS | 긴 기술 글의 읽기 경험과 성능에 영향 |

---

# AdSense “콘텐츠 가치 부족” 대응 순서

## 1단계: 색인 대상 감사

다음 URL 수를 집계한다.

```text
일반 글
Topic
Series
Tag
Archive
Pagination
Search
Admin
Draft
Redirect
404
```

그리고 각 유형을 다음처럼 분류한다.

```text
Index
Noindex
Exclude from build
Redirect
```

---

## 2단계: 대표 글 20개 가치 강화

각 글에 다음을 보완한다.

```text
작성 목적
직접 경험
테스트 환경
근거와 출처
작성자의 해석
적용 한계
관련 글
수정·검증일
```

---

## 3단계: 중복 콘텐츠 정리

- 유사 제목
- 같은 검색 의도
- 동일한 서론
- 구판과 신판
- 너무 짧게 분리된 시리즈

를 통합하거나 역할을 구분한다.

---

## 4단계: 허브 페이지 강화

단순 카드 목록 대신:

```text
분야 설명
학습 지도
대표 Guide
Debug Note
Experiment
Reference
```

를 제공한다.

---

## 5단계: 신뢰 페이지 점검

최소한 다음은 실제 내용과 일치해야 한다.

```text
About
Contact
Privacy Policy
작성·검증 원칙
오류 제보 경로
```

---

## 6단계: 광고 없는 상태로 품질 확인

승인 전에는 광고 위치보다 다음을 먼저 확인한다.

- 모바일에서 쉽게 읽히는가
- 검색과 내비게이션이 정상인가
- 빈 페이지가 없는가
- 깨진 링크가 없는가
- 핵심 페이지가 색인 가능한가
- Draft가 노출되지 않는가

---

# 이번 단계의 핵심 결론

`hawk90.github.io`에서 AdSense 대응을 위해 가장 피해야 할 오해는 이것이다.

> “콘텐츠 가치 부족이니 새 글을 더 많이 써야 한다.”

실제로는 다음이 더 중요할 가능성이 크다.

```text
기존 글의 고유 가치 증명
중복·구판 정리
얕은 목록 페이지 관리
대표 Topic Hub 구축
작성자와 검증 정보 강화
색인 대상 명확화
```

특히 네 사이트는 이미 글의 양이 부족한 단계가 아니다. 따라서 신규 글 100개를 추가하는 것보다 **핵심 글 20개와 대표 허브 5개를 강하게 만드는 작업**이 사이트 인식과 실제 독자 경험에 더 큰 영향을 줄 가능성이 높다.

## 32. assistant

# Task 2-6. UI/UX & Accessibility Anti-patterns

이번에는 **기술 블로그를 읽고 탐색하는 실제 사용자 경험**을 다룬다.

범위는 다음이다.

```text
읽기 흐름
코드·표·다이어그램
모바일
목차와 내비게이션
색상과 타이포그래피
접근성
상호작용
장문 기술 문서 UX
```

---

## U-01. Design Before Reading

### 읽기보다 디자인이 앞섬

홈과 글 페이지의 시각적 인상이 강하지만, 본문을 읽는 데 직접 도움이 되지 않는다.

### 증상

- 큰 Hero
- 배경 애니메이션
- 그라데이션
- glass effect
- 과도한 shadow
- 콘텐츠보다 UI 장식이 먼저 보임

### 문제

기술 블로그의 핵심 작업은 감상이 아니라 **정확한 정보를 읽고 다시 찾는 것**이다.

### 개선

장식 요소는 다음 질문을 통과해야 한다.

> 독자가 글의 위치·구조·중요도를 이해하는 데 기여하는가?

그렇지 않으면 줄인다.

---

## U-02. Portfolio–Knowledge Base Confusion

### 포트폴리오와 지식베이스 UI 혼합

홈은 개인 포트폴리오처럼 구성되고, 내부는 기술 백과사전처럼 구성된다.

### 증상

- 홈은 자기소개와 경력 중심
- 글 페이지는 문서 사이트
- 내비게이션 목적이 페이지마다 달라짐
- 방문자가 사이트의 주목적을 헷갈림

### 개선

홈에서도 지식베이스 정체성을 우선한다.

```text
사이트 목적
핵심 분야
시작 경로
대표 문서
작성자
```

순서가 적합하다.

---

## U-03. Hero Dominance

### Hero 영역이 첫 화면을 독점

### 문제

첫 화면에서 실제 콘텐츠와 전문 분야가 보이지 않는다.

### 개선

Hero를 짧게 유지하고 첫 화면 안에 최소한 하나를 보여준다.

- 핵심 Topic
- Start Here
- Featured Guide
- 최근 업데이트

---

## U-04. Latest Card Wall

### 카드가 계속 반복되는 홈

```text
카드
카드
카드
카드
```

### 문제

글의 중요도와 역할이 모두 같아 보인다.

### 개선

다음처럼 표현을 구분한다.

```text
Featured Guide
Topic Entry
Recently Updated
Latest Article
```

모든 콘텐츠를 동일한 카드 컴포넌트로 표현하지 않는다.

---

## U-05. Card Metadata Overload

### 카드에 정보가 너무 많음

- 제목
- 설명
- 태그 5개
- 날짜
- 수정일
- 읽기 시간
- 난이도
- 시리즈
- 콘텐츠 유형
- 상태

### 문제

사용자는 실제 제목을 찾기 어려워진다.

### 개선

목록 문맥에 필요한 정보만 표시한다.

#### 홈

```text
제목
짧은 설명
Topic
```

#### 검색 결과

```text
제목
콘텐츠 유형
일치한 문맥
수정일
```

#### 시리즈

```text
순서
제목
학습 역할
```

---

## U-06. Badge Confetti

### 배지가 화면을 뒤덮음

```text
C++
Advanced
Updated
Guide
Linux
Performance
12 min
```

### 문제

모든 정보가 강조되므로 실제로는 아무것도 강조되지 않는다.

### 개선

한 카드에서 시각적 배지는 최대 1~2종류만 사용한다. 나머지는 일반 텍스트로 처리한다.

---

## U-07. Everything Is a Card

### 모든 요소를 카드로 만듦

- 글
- Topic
- 저자
- 통계
- 시리즈
- 태그
- 공지

### 문제

정보 계층이 평평해진다.

### 개선

카드는 독립적인 선택 단위에만 사용한다.

단순 정보와 연속 목록은 선, 여백, 타이포그래피만으로도 충분하다.

---

## U-08. Visual Hierarchy Flattening

### 모든 제목과 블록이 비슷하게 강조됨

### 증상

- H2와 카드 제목이 비슷함
- callout과 일반 본문 차이가 약함
- 중요한 결론이 다른 문단과 같음

### 개선

각 수준의 역할을 명확히 한다.

```text
페이지 제목
주요 장
하위 절
본문
보조 metadata
```

크기뿐 아니라 여백과 위치로 계층을 표현한다.

---

# 타이포그래피와 읽기

## U-09. Full-Width Prose

### 본문이 화면 전체 폭을 사용

### 문제

긴 문장을 읽을 때 시선 이동이 커지고 다음 줄로 복귀하기 어렵다.

### 개선

본문 폭은 적절하게 제한하고, 코드·표·다이어그램만 필요할 때 넓게 확장한다.

---

## U-10. Over-Narrow Technical Prose

### 본문 폭이 지나치게 좁음

일반 산문에는 괜찮지만 긴 용어와 inline code가 많은 기술 글에서는 줄바꿈이 과도해진다.

### 문제

```text
std::hardware_destructive_
interference_size
```

같은 표현이 빈번하게 깨진다.

### 개선

기술 문서에서는 일반 에세이보다 약간 넓은 본문 폭을 허용한다.

---

## U-11. Tiny Body Text

### 데스크톱 화면 기준으로 본문 글자가 작음

### 문제

장문 글의 피로가 빠르게 증가한다.

### 개선

본문은 시각적 밀도보다 장시간 독서를 기준으로 설정한다.

---

## U-12. Oversized Heading Cascade

### 제목이 지나치게 큼

H1·H2가 본문 흐름을 반복적으로 끊는다.

### 문제

긴 기술 글에서 화면 대부분이 heading으로 채워진다.

### 개선

문서 페이지의 heading은 마케팅 페이지보다 절제한다.

---

## U-13. Weak Paragraph Separation

### 문단 구분이 약함

긴 기술 설명이 거대한 텍스트 덩어리로 보인다.

### 개선

- 문단 길이 제한
- 적절한 행간
- 섹션 여백
- 핵심 문장 분리

를 사용한다.

---

## U-14. Excessive Paragraph Fragmentation

### 모든 문장을 별도 문단으로 작성

### 증상

```text
이것은 문제다.

왜냐하면 그렇다.

따라서 바꿔야 한다.
```

### 문제

모바일 메시지 같은 리듬이 되어 논리적 연결이 약해진다.

### 개선

같은 논리 단위는 하나의 문단으로 묶는다.

---

## U-15. Decorative Font for Technical Content

### 장식적인 폰트를 본문이나 제목에 사용

### 문제

약어·숫자·코드가 많은 기술 문서에서 판독성이 떨어진다.

### 개선

브랜드 폰트는 Hero나 로고에 제한하고, 본문은 중립적이고 안정적인 글꼴을 사용한다.

---

## U-16. Too Many Font Families

### 본문·제목·코드·UI에 모두 다른 폰트

### 문제

시각적 통일성과 로딩 성능이 모두 나빠진다.

### 개선

```text
본문/UI 폰트 1개
코드 폰트 1개
```

정도로 제한한다.

---

## U-17. Weight Inflation

### 다양한 굵기를 너무 많이 사용

```text
300, 400, 500, 600, 700, 800
```

### 문제

폰트 로딩과 시각적 일관성이 나빠진다.

### 개선

실제로 의미가 다른 2~3단계만 사용한다.

---

## U-18. Inline Code Noise

### 모든 기술 용어를 inline code로 표시

```text
`PCIe`, `Linux`, `CXL`, `driver`, `memory`
```

### 문제

문장 전체가 회색 박스처럼 보이고 읽는 리듬이 깨진다.

### 개선

inline code는 다음에 사용한다.

- 실제 identifier
- 명령
- 경로
- literal
- 타입·함수명

일반 기술명은 보통 텍스트로 쓴다.

---

## U-19. Low-Contrast Metadata

### 날짜·태그·설명이 너무 연함

### 문제

디자인상 세련돼 보이지만 실제로 읽기 어렵다.

### 개선

보조 정보라도 접근 가능한 대비를 유지한다.

---

## U-20. Pure Black Dark Mode

### 완전한 검정 배경과 강한 흰색 본문

### 문제

긴 글에서 눈부심과 대비 피로가 커질 수 있다.

### 개선

다크모드에서도 배경·본문·보조 텍스트 사이에 단계적인 톤을 사용한다.

---

# 코드 블록

## U-21. Code Block as a Black Box

### 코드 블록이 본문에서 지나치게 강한 시각 요소

### 문제

코드가 설명보다 더 중요해 보이며 긴 글의 흐름을 분절한다.

### 개선

코드 블록의 배경·테두리·제목을 절제하고, 핵심 부분만 포함한다.

---

## U-22. Always-On Line Numbers

### 한두 줄 코드에도 줄 번호 표시

### 문제

시각적 노이즈와 DOM이 증가한다.

### 개선

긴 코드 또는 본문에서 특정 줄을 참조할 때만 사용한다.

---

## U-23. Unclear Code Language

### 코드 블록의 언어·파일명이 보이지 않음

### 문제

C와 C++, shell 입력과 출력, 의사코드를 구분하기 어렵다.

### 개선

필요한 경우 다음을 표시한다.

```text
driver.cpp
C++
```

단순 코드에는 과한 헤더를 붙이지 않는다.

---

## U-24. Copy Button Everywhere

### 한 줄 출력이나 로그에도 복사 버튼

### 문제

버튼이 반복되고 실제 코드 내용보다 UI가 더 눈에 띈다.

### 개선

사용자가 실제로 실행하거나 재사용할 코드에만 제공한다.

---

## U-25. Copy Button Covers Code

### 모바일에서 복사 버튼이 첫 줄 코드를 가림

### 개선

버튼 공간을 미리 확보하거나 코드 헤더 영역에 배치한다.

---

## U-26. Horizontal Scroll Ambiguity

### 코드 블록이 가로 스크롤 가능하지만 표시가 없음

### 문제

오른쪽에 더 많은 코드가 있다는 사실을 모른다.

### 개선

스크롤 가능성을 자연스럽게 드러내고, 모바일에서 scrollbar가 완전히 숨지 않도록 한다.

---

## U-27. Forced Code Wrapping

### 긴 코드를 자동 줄바꿈

### 문제

- indentation 파괴
- 로그 행 분리
- 문자열 의미 혼동
- 복사 시 원문과 달라 보임

### 개선

기본은 가로 스크롤로 두고, 독자가 선택적으로 wrap을 켤 수 있게 한다.

---

## U-28. No Wrap Option

### 모바일에서 긴 코드가 계속 가로 스크롤만 요구됨

### 개선

코드 성격에 따라 wrap 토글을 제공할 수 있다.

- 소스코드: nowrap
- 로그·출력: wrap 선택 가능

---

## U-29. Syntax Color Overload

### 토큰마다 강한 색 사용

### 문제

코드 구조보다 색상이 먼저 보이며 다크·라이트 테마 간 의미가 달라진다.

### 개선

적은 수의 명확한 색상과 충분한 대비를 사용한다.

---

## U-30. Theme Switching as a Primary Feature

### 코드 테마 선택지가 너무 많음

### 문제

대부분의 독자는 글을 읽기 위해 왔으며, 테마 선택은 부차적인 기능이다.

### 개선

안정적인 light/dark 기본 테마를 제공하고 선택지는 최소화한다.

---

## U-31. Highlighted Lines Without Explanation

### 일부 줄을 강조하지만 이유가 없음

### 개선

본문에서 해당 줄이 왜 중요한지 명시적으로 설명한다.

---

## U-32. Long Code Without Navigation

### 수백 줄 코드가 하나의 블록

### 개선

- 핵심 구간 분할
- 생략 표시
- 함수별 설명
- 전체 소스 링크

를 사용한다.

---

## U-33. Code and Explanation Distance

### 코드와 설명이 멀리 떨어짐

### 문제

독자가 앞뒤로 계속 스크롤해야 한다.

### 개선

코드 일부 바로 아래에 설명을 배치하고, 큰 결론은 블록 뒤에 정리한다.

---

# 표와 다이어그램

## U-34. Desktop-Only Table

### 넓은 표가 모바일 레이아웃을 깨뜨림

### 개선

다음 중 상황에 맞는 방식을 사용한다.

- 가로 스크롤
- 핵심 열 우선
- 카드형 변환
- 표 분할
- 요약표와 상세표 분리

---

## U-35. Hidden Horizontal Table Scroll

### 표의 오른쪽 열이 잘렸지만 스크롤 가능 여부가 보이지 않음

### 개선

스크롤 영역의 경계를 분명하게 표현한다.

---

## U-36. Table as Paragraph Replacement

### 모든 비교를 표로 작성

### 문제

복잡한 인과관계와 예외가 셀 안에 갇힌다.

### 개선

표는 비교와 조회에 사용하고, 해석은 표 아래 문장으로 제공한다.

---

## U-37. Giant Comparison Table

### 열과 행이 너무 많아 비교가 불가능

### 개선

- 핵심 기준 표
- 상세 기준 표
- 결론

으로 나눈다.

---

## U-38. Unresponsive Diagram

### 큰 SVG나 PNG가 모바일에서 축소되어 읽을 수 없음

### 개선

- 확대 기능
- 영역별 분리
- 모바일용 대체 도식
- 텍스트 설명

을 제공한다.

---

## U-39. Zoom Without Pan Clarity

### 이미지는 확대되지만 이동 방법이 불명확

### 개선

일관된 확대·이동 동작과 닫기 방법을 제공한다.

---

## U-40. Color-Only Diagram Semantics

### 선이나 상태를 색상만으로 구분

### 문제

색각 이상과 흑백 출력에서 의미가 사라진다.

### 개선

색상과 함께 다음을 사용한다.

- 선 종류
- 아이콘
- 라벨
- 패턴
- 모양

---

## U-41. Diagram–Text Mismatch

### 그림 명칭과 본문 용어가 다름

### 문제

같은 컴포넌트인지 독자가 다시 해석해야 한다.

### 개선

용어·색·약어를 글 전체에서 일관되게 사용한다.

---

## U-42. Screenshot Text Too Small

### 데스크톱 전체 화면 캡처를 본문 폭으로 축소

### 문제

로그와 UI 글자가 읽히지 않는다.

### 개선

필요 영역을 crop하고 핵심 부분을 별도 확대한다.

---

## U-43. Diagram Without Accessible Alternative

### 그림에 중요한 정보가 있지만 대체 설명 없음

### 개선

alt에 모든 내용을 억지로 넣기보다 본문에서 그림의 구조와 핵심 결론을 설명한다.

---

# 목차와 장문 문서

## U-44. TOC as a Mirror

### 모든 heading을 그대로 복제한 목차

### 문제

목차가 너무 길고 현재 구조를 이해하는 데 도움이 되지 않는다.

### 개선

핵심 H2와 중요한 H3만 표시한다.

---

## U-45. Sticky TOC Without Current Context

### 목차는 고정되어 있지만 현재 섹션 표시가 약함

### 개선

현재 위치를 명확하게 표시하고, 너무 빠르게 highlight가 흔들리지 않게 한다.

---

## U-46. Aggressive Scroll Spy

### 작은 스크롤에도 active heading이 계속 변경

### 문제

목차가 깜박이며 주의를 빼앗는다.

### 개선

일정한 관찰 영역과 안정적인 전환 기준을 사용한다.

---

## U-47. TOC Covers Content

### 작은 화면에서 TOC 패널이 본문을 가림

### 개선

모바일에서는 별도 drawer나 접힌 요약으로 제공한다.

---

## U-48. No Reading Progress Context

### 긴 글에서 현재 어느 정도 읽었는지 알 수 없음

### 개선

단순 진행률보다 다음 정보가 더 유용할 수 있다.

```text
현재 섹션
전체 주요 섹션
다음 섹션
```

진행 바는 보조적으로 사용한다.

---

## U-49. Misleading Reading Time

### 코드·표·다이어그램이 많은 글에 일반 글자 수 공식 적용

### 문제

“8분”이라고 표시됐지만 실제로는 30분이 걸릴 수 있다.

### 개선

읽기 시간을 절대값처럼 강조하지 않거나, 기술 콘텐츠 특성에 맞게 조정한다.

---

## U-50. Zen Mode Hides Necessary Context

### 집중 모드가 Breadcrumb·시리즈·상태까지 제거

### 문제

본문에 집중할 수 있지만 글의 위치와 신뢰 정보가 사라진다.

### 개선

집중 모드는 장식과 보조 UI만 숨기고 중요한 문서 metadata는 유지한다.

---

## U-51. No Section Permalink

### 특정 부분을 공유하기 어려움

### 개선

heading anchor를 제공하되 아이콘이 항상 시끄럽게 보이지 않도록 한다.

---

## U-52. Anchor Scroll Under Header

### heading 링크로 이동하면 고정 헤더 아래에 제목이 가려짐

### 개선

`scroll-margin-top` 등으로 여유를 둔다.

---

## U-53. Back-to-Top as a Substitute

### 긴 글 탐색을 “맨 위로” 버튼 하나로 해결

### 문제

사용자는 상단이 아니라 상위 장이나 Topic Hub로 이동하고 싶을 수 있다.

### 개선

목차, 섹션 이동, 다음 글 링크를 함께 제공한다.

---

# 모바일 UX

## U-54. Desktop Shrunk to Mobile

### 데스크톱 레이아웃을 단순 축소

### 문제

- 카드가 너무 길어짐
- metadata 줄바꿈
- 코드 버튼 겹침
- 표·TOC 불편
- sticky 요소 과밀

### 개선

모바일에서는 정보 우선순위를 다시 정한다.

---

## U-55. Mobile Header Overload

### 로고·검색·테마·메뉴·프로필을 모두 표시

### 문제

본문 시작 전에 헤더가 많은 공간을 차지한다.

### 개선

모바일 헤더에는 핵심 동작 2~3개만 남긴다.

---

## U-56. Tiny Touch Targets

### heading anchor·복사·메뉴 버튼이 작음

### 문제

정확한 터치가 어렵다.

### 개선

시각적 아이콘은 작아도 실제 클릭 영역은 충분히 확보한다.

---

## U-57. Hover-Only Interaction

### hover 해야만 설명·링크·버튼이 보임

### 문제

터치 기기와 키보드 사용자는 기능을 발견하지 못한다.

### 개선

hover는 추가 피드백으로만 사용하고 기능 자체는 항상 접근 가능하게 한다.

---

## U-58. Swipe Conflict

### 이미지 확대·코드 스크롤·페이지 내비게이션이 모두 swipe 사용

### 문제

사용자 의도와 다른 동작이 발생한다.

### 개선

수평 제스처의 역할을 제한한다.

---

## U-59. Sticky Footer or Ad on Small Screen

### 작은 화면 하단을 고정 UI가 계속 차지

### 문제

본문 가시 영역이 크게 줄어든다.

### 개선

닫을 수 있게 하고 화면 점유율을 엄격히 제한한다.

---

## U-60. Mobile Search Modal as Desktop Dialog

### 작은 화면에서 중앙 modal 사용

### 문제

키보드가 올라오면 결과 영역이 거의 사라진다.

### 개선

모바일에서는 전체 화면 검색 화면이 더 적합할 수 있다.

---

# 상호작용과 상태

## U-61. Interaction Without Feedback

### 버튼을 눌러도 상태 변화가 불명확

예:

- 코드 복사
- 검색 로딩
- 테마 변경
- 댓글 로딩

### 개선

짧고 명확한 상태 피드백을 제공한다.

---

## U-62. Toast Spam

### 작은 행동마다 toast 표시

### 문제

읽기 흐름을 방해한다.

### 개선

복사 성공처럼 일시적 행동은 버튼 상태 변화만으로 충분할 수 있다.

---

## U-63. Animation as Confirmation

### 애니메이션이 유일한 상태 표시

### 문제

모션을 줄인 사용자나 화면 낭독기에는 전달되지 않는다.

### 개선

텍스트·ARIA 상태와 함께 사용한다.

---

## U-64. Page Transition Disorientation

### 이동은 부드럽지만 새 페이지가 시작됐다는 인지가 약함

### 문제

제목 morph나 화면 유지 때문에 현재 위치를 놓칠 수 있다.

### 개선

페이지 제목·focus·scroll 위치를 명확히 갱신한다.

---

## U-65. Broken Back Navigation

### SPA 전환 후 뒤로 가기 위치가 이상함

### 문제

장문 글과 검색 결과 사이를 오갈 때 큰 불편을 만든다.

### 개선

검색 상태와 스크롤 복원을 검증한다.

---

## U-66. Modal Focus Escape

### 검색 modal이 열렸는데 Tab이 뒤 페이지로 이동

### 개선

focus trap, 초기 focus, Escape 종료, 종료 후 focus 복귀를 지원한다.

---

## U-67. Escape Key Inconsistency

### 어떤 modal은 Escape로 닫히고 다른 것은 안 닫힘

### 개선

사이트 전체 상호작용 규칙을 일관되게 만든다.

---

## U-68. Hidden State Persistence

### 검색어·필터·테마가 예상치 못하게 유지됨

### 문제

사용자는 왜 이전 상태가 나타나는지 이해하지 못한다.

### 개선

유지할 상태와 페이지 이동 시 초기화할 상태를 명시적으로 구분한다.

---

## U-69. No Loading Strategy

### 검색·댓글·대형 이미지가 로드되는 동안 빈 공간

### 개선

필요한 곳에만 skeleton이나 간단한 상태 문구를 사용한다.

---

## U-70. Skeleton for Instant Content

### 거의 즉시 뜨는 정적 콘텐츠에도 skeleton

### 문제

오히려 화면 깜박임과 복잡성이 증가한다.

### 개선

실제 지연이 있는 콘텐츠에만 사용한다.

---

# 접근성

## U-71. Div-Based Links

### 클릭 가능한 카드가 `<div>` 이벤트로 구현

### 문제

- 키보드 접근 불가
- 새 탭 열기 불가
- 링크 의미 전달 불가

### 개선

실제 이동은 `<a href>`를 사용한다.

---

## U-72. Button–Link Confusion

### 이동 동작을 버튼으로, 상태 동작을 링크로 구현

### 개선

```text
페이지 이동 → link
현재 페이지 상태 변경 → button
```

원칙을 지킨다.

---

## U-73. Missing Focus Indicator

### 키보드로 이동해도 현재 요소가 보이지 않음

### 개선

브랜드 디자인과 어울리는 명확한 focus style을 제공한다.

---

## U-74. Focus Style Removed for Aesthetics

### `outline: none`만 사용

### 문제

키보드 사용자가 현재 위치를 알 수 없다.

### 개선

기본 outline을 제거한다면 더 나은 대체 표시를 반드시 제공한다.

---

## U-75. Incorrect Heading Hierarchy

### 시각적 크기 때문에 heading level을 선택

### 문제

화면 낭독기와 문서 구조가 왜곡된다.

### 개선

논리적 계층을 기준으로 heading을 사용하고 스타일은 CSS로 제어한다.

---

## U-76. Skipped Heading Levels

```text
H1 → H3 → H5
```

### 문제

문서 구조를 탐색하기 어렵다.

### 개선

필요한 의미 구조를 순차적으로 설계한다.

---

## U-77. Empty Link Label

### 아이콘만 있는 링크에 accessible name 없음

예:

- GitHub 아이콘
- heading link
- 공유 버튼

### 개선

`aria-label` 또는 가시 텍스트를 제공한다.

---

## U-78. Redundant ARIA

### native HTML로 해결할 수 있는데 ARIA를 과도하게 사용

### 문제

잘못된 role과 상태가 오히려 접근성을 해친다.

### 개선

먼저 semantic HTML을 사용하고 부족한 부분만 ARIA로 보완한다.

---

## U-79. Dark Mode Contrast Failure

### 라이트모드는 괜찮지만 다크모드의 링크·코드·보조 텍스트 대비가 낮음

### 개선

두 테마를 각각 독립적으로 검사한다.

---

## U-80. Color-Only Link Identification

### 본문 링크가 색상 차이만 있음

### 문제

색 구분이 어려운 사용자가 링크를 인지하기 어렵다.

### 개선

밑줄이나 다른 비색상 단서를 함께 사용한다.

---

## U-81. Reduced Motion Ignored

### 페이지 전환·제목 morph·smooth scroll을 항상 실행

### 개선

`prefers-reduced-motion`을 존중한다.

---

## U-82. Auto-Focus Surprise

### 페이지 이동 후 검색창이나 다른 UI에 자동 focus

### 문제

화면 낭독기와 키보드 사용 흐름을 방해한다.

### 개선

사용자가 명시적으로 기능을 열었을 때만 focus를 이동한다.

---

## U-83. Keyboard-Inaccessible Code Controls

### 복사·wrap·확대 버튼이 키보드로 접근되지 않음

### 개선

실제 button 요소와 명확한 label을 사용한다.

---

## U-84. No Skip Link

### 매 페이지마다 긴 헤더·사이드바를 지나야 본문에 도달

### 개선

“본문으로 건너뛰기” 링크를 제공한다.

---

## U-85. Language Not Declared

### 문서 언어가 HTML에 지정되지 않음

### 문제

화면 낭독기의 발음과 자동 번역이 부정확해진다.

### 개선

페이지의 주요 언어를 정확히 지정한다.

---

## U-86. Mixed-Language Pronunciation Failure

### 한글 글에 영문 약어가 많지만 읽기 지원이 부족

### 개선

필요한 경우 약어의 풀네임을 첫 등장에 제공한다. 모든 용어에 별도 언어 속성을 붙이는 과도한 작업은 피한다.

---

## U-87. Alt Text as Filename

```text
image-2026-07-19.png
```

### 문제

이미지의 의미를 설명하지 못한다.

### 개선

이미지의 목적에 맞게 작성한다.

장식 이미지는 빈 alt를 사용한다.

---

## U-88. Alt Text as Full Diagram Dump

### 복잡한 다이어그램 전체를 alt 한 문장에 억지로 넣음

### 문제

지나치게 길고 이해하기 어렵다.

### 개선

alt에는 그림의 목적을 간단히 쓰고, 상세 구조는 본문에서 설명한다.

---

## U-89. Inaccessible Tables

### header cell과 scope가 없는 표

### 문제

행과 열의 관계를 이해하기 어렵다.

### 개선

semantic table markup과 명확한 caption을 사용한다.

---

## U-90. Visual Order–DOM Order Mismatch

### CSS grid로 화면 순서를 바꿨지만 DOM 순서는 다름

### 문제

키보드·화면 낭독기 순서와 시각적 순서가 일치하지 않는다.

### 개선

DOM 자체를 의미 있는 순서로 작성한다.

---

# 콘텐츠 신뢰 UX

## U-91. Hidden Publication Status

### 오래된 글인지 최신 글인지 바로 알 수 없음

### 개선

글 상단에서 다음을 명확히 보여준다.

```text
Last updated
Last verified
Current / Historical / Superseded
```

---

## U-92. Metadata Wall Before Content

### 본문 전에 metadata가 너무 많이 나옴

```text
작성자
날짜
수정일
검증일
태그
시리즈
난이도
읽기 시간
환경
상태
```

### 문제

실제 글이 늦게 시작된다.

### 개선

핵심 metadata만 상단에 두고 상세 환경은 접거나 별도 섹션으로 둔다.

---

## U-93. Warning Banner Fatigue

### 모든 글에 여러 배너가 있음

- 오래된 글
- AI 사용
- 광고 안내
- 쿠키
- 시리즈
- 검증 환경

### 문제

중요한 경고도 무시하게 된다.

### 개선

상태 정보를 하나의 compact document status 영역으로 합친다.

---

## U-94. Citation Link Clutter

### 문장마다 긴 외부 링크 아이콘이 붙음

### 개선

인용 표시는 절제하고 참고문헌 접근은 명확하게 유지한다.

---

## U-95. External Link Surprise

### 외부 링크가 새 탭으로 열리는지, PDF인지 구분되지 않음

### 개선

특수한 경우에만 파일 형식이나 외부 이동을 표시한다. 모든 외부 링크에 아이콘을 붙여 시끄럽게 만들 필요는 없다.

---

## U-96. No Error Reporting Path

### 기술 오류를 발견해도 제보 방법이 본문 가까이에 없음

### 개선

글 하단에 작은 수정 제안 링크를 둔다.

```text
오류 제보
GitHub에서 수정 제안
```

---

## U-97. Comment Section as Support Desk

### 모든 질문을 댓글로 받지만 검색·정리되지 않음

### 문제

중요한 정정과 추가 설명이 댓글에 묻힌다.

### 개선

반복되는 질문은 본문이나 FAQ로 승격한다.

---

## U-98. Comment Dominance

### 댓글 UI가 관련 글과 결론보다 먼저 나옴

### 개선

본문 결론과 다음 학습 경로를 먼저 보여주고 댓글은 그 이후에 둔다.

---

# 인쇄와 공유

## U-99. Print as Screenshot

### 브라우저 화면을 그대로 인쇄

### 문제

헤더·광고·버튼·사이드바가 함께 출력된다.

### 개선

인쇄 스타일에서 다음을 제거한다.

- 내비게이션
- 댓글
- 광고
- 상호작용 버튼
- sticky UI

그리고 URL·제목·작성일·본문을 유지한다.

---

## U-100. Printed Code Clipping

### 긴 코드가 인쇄 페이지 밖으로 잘림

### 개선

인쇄 시 wrap 정책과 글꼴 크기를 별도로 관리한다.

---

## U-101. Dark Background Printing

### 다크모드 상태가 인쇄에도 반영

### 개선

인쇄는 밝은 배경과 높은 대비를 기본으로 한다.

---

## U-102. Shared Link Without Section Context

### 특정 heading URL을 공유해도 페이지에서 위치가 명확하지 않음

### 개선

anchor 이동 후 heading에 일시적인 focus 또는 highlight를 줄 수 있다. 과도한 애니메이션은 피한다.

---

## U-103. Social Share Button Wall

### 여러 SNS 버튼이 글마다 반복

### 문제

기술 독자에게 가치가 낮고 외부 스크립트가 늘어날 수 있다.

### 개선

기본은 링크 복사 하나로 충분하다.

---

# hawk90에서 먼저 확인할 UI/UX 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Latest Card Wall | 홈이 글 목록 중심이면 정보 계층이 약해짐 |
| 2 | Card Metadata Overload | 글 유형·상태 추가 시 카드가 복잡해질 위험 |
| 3 | Full-Width 또는 Over-Narrow Prose | 장문·코드 중심 글의 핵심 읽기 품질 |
| 4 | Inline Code Noise | 기술 용어가 많은 글에서 시각적 피로 가능 |
| 5 | TOC as a Mirror | 긴 기술 글에서 목차가 과도해질 가능성 |
| 6 | Mobile Navigation Collapse | Topic·검색·시리즈가 늘면 모바일 복잡성 증가 |
| 7 | Code and Explanation Distance | 코드 분석 글의 이해도에 직접 영향 |
| 8 | Forced Code Wrapping | C++·CUDA·로그 가독성 훼손 가능 |
| 9 | Desktop-Only Table | 비교표와 레지스터 표가 모바일에서 취약 |
| 10 | Unresponsive Diagram | CXL·PCIe 구조도가 작은 화면에서 읽기 어려움 |
| 11 | Page Transition Disorientation | ClientRouter 사용 시 focus·scroll 검증 필요 |
| 12 | Missing Focus Indicator | 검색·modal·코드 버튼 접근성 핵심 |
| 13 | Reduced Motion Ignored | morph·transition 기능이 있는 사이트에서 중요 |
| 14 | Metadata Wall Before Content | 상태·유형·검증 정보 추가 시 발생 가능 |
| 15 | Comment Dominance | 지식 탐색보다 댓글이 먼저 보이지 않도록 해야 함 |

# 이번 단계의 핵심 결론

기술 블로그 UX의 가장 흔한 오해는 이것이다.

> 기능이 많고 예쁘면 사용자 경험이 좋아진다.

실제로는 다음이 더 중요하다.

```text
읽기 폭
글자 크기
정보 계층
코드와 설명의 거리
모바일 표·다이어그램
목차의 단순성
현재 위치
다음 학습 경로
키보드 접근
문서 상태
```

`hawk90.github.io`처럼 콘텐츠가 많고 기술 밀도가 높은 사이트는 화려한 블로그보다는 **읽기 좋은 기술 문서 도구**에 가까워야 한다.

다음은 **Task 2-7. Maintainability, Tooling & Content Operations Anti-patterns**다. 콘텐츠 스키마, 자동화 스크립트, migration, dependency, CI, 생성 자산, 문서 드리프트, 운영 규칙을 카탈로그화하면 된다.

## 33. assistant

# Task 2-7. Maintainability, Tooling & Content Operations Anti-patterns

이번에는 **콘텐츠 스키마, 자동화 스크립트, migration, dependency, CI, 생성 자산, 문서 드리프트, 운영 규칙**을 다룬다.

---

## M-01. Schema Drift

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

## M-02. Optional Field Explosion

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

## M-03. Required Field Inflation

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

## M-04. One Schema for Every Content Type

### 모든 글에 같은 metadata 구조 사용

### 문제

실험 글에는 환경·방법이 중요하고, 개념 글에는 선행 지식과 관련 개념이 중요하다.

### 개선

공통 필드와 타입별 확장 필드를 분리한다.

---

## M-05. Free-Text Enum

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

## M-06. Taxonomy Without Registry

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

## M-07. Series Metadata Duplication

### 모든 글이 시리즈 이름과 설명을 반복 저장

### 문제

시리즈 이름 변경 시 여러 글을 수정해야 한다.

### 개선

시리즈 manifest에서 이름·설명·순서를 관리하고 글은 시리즈 ID만 참조한다.

---

## M-08. Derived Data Stored Manually

### 읽기 시간·관련 글·이전/다음 글을 front matter에 직접 저장

### 문제

원본이 바뀌면 쉽게 stale 상태가 된다.

### 개선

파생 가능한 값은 빌드 시 계산한다.

---

## M-09. Generated Field Committed as Source

### 자동 생성 description이나 keyword가 원본처럼 저장

### 문제

사람이 작성한 값과 자동 값의 경계가 사라진다.

### 개선

source metadata와 derived metadata를 분리한다.

---

## M-10. Hidden Defaults

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

# Migration

## M-11. Forever Backward Compatibility

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

## M-12. Big-Bang Migration

### 수백 개 글을 한 번에 완벽히 바꾸려 함

### 문제

- 변경량이 지나치게 큼
- 검토 불가능
- 중간 상태가 없음
- 실패 시 되돌리기 어려움

### 개선

대표 글, 유입 상위 글, 현재 Topic 순으로 단계적으로 진행한다.

---

## M-13. Migration Without Dry Run

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

## M-14. Migration Without Idempotency

### 같은 migration을 두 번 실행하면 결과가 달라짐

### 문제

CI나 로컬에서 반복 실행하기 어렵다.

### 개선

migration은 여러 번 실행해도 동일 결과가 나오게 만든다.

---

## M-15. Migration Without Backup Boundary

### 자동 수정 전에 변경 범위를 보존하지 않음

### 개선

Git branch 또는 명확한 commit boundary에서 실행하고 한 migration당 한 commit을 유지한다.

---

## M-16. Semantic Migration by Regex

### 정규식만으로 Markdown 의미 구조 변경

### 문제

코드 블록, front matter, 링크, 수식 안의 문자열까지 잘못 수정할 수 있다.

### 개선

구조 변경은 parser 기반으로 처리하고 regex는 단순한 안전한 변경에만 사용한다.

---

## M-17. Path Migration Without Redirects

### 파일과 URL을 이동했지만 redirect 없음

### 문제

외부 링크와 검색 유입이 깨진다.

### 개선

이전 slug map을 유지하고 최종 URL로 직접 redirect한다.

---

## M-18. Migration Without Validation

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

# Scripts and Tooling

## M-19. One Script per Symptom

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

## M-20. Every Script Parses Markdown Differently

### Node와 Python 도구가 서로 다른 parser 사용

### 문제

한 도구에서는 유효하고 다른 도구에서는 오류가 된다.

### 개선

공통 중간 manifest를 생성해 모든 도구가 소비하게 한다.

---

## M-21. Script as Undocumented Tribal Knowledge

### 작성자만 실행 방법을 앎

### 증상

- 옵션 설명 없음
- 입력·출력 불명확
- 실패 코드 없음
- README에 이름만 존재

### 개선

각 명령에 `--help`, 목적, 예제, 실패 조건을 제공한다.

---

## M-22. Hidden Script Side Effects

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

## M-23. Auto-Fix Without Confidence

### 불확실한 링크나 태그를 자동 수정

### 문제

기술적으로 유효하지만 의미상 틀린 연결이 생긴다.

### 개선

confidence threshold를 두고 애매한 경우 report만 생성한다.

---

## M-24. No Fixture Tests for Content Tools

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

## M-25. Full Repository Scan for Every Command

### 작은 검사도 모든 파일 탐색

### 문제

도구 사용이 느려지고 자주 실행하지 않게 된다.

### 개선

변경 파일 모드와 전체 모드를 분리한다.

---

## M-26. Tool Output as Unstructured Text

### 결과가 터미널 문자열뿐

### 문제

CI annotation, dashboard, 자동 수정에 재사용하기 어렵다.

### 개선

사람용 출력과 JSON/SARIF 출력 옵션을 함께 제공한다.

---

## M-27. No Severity Model

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

## M-28. Rule Without Rationale

### “description이 없습니다”만 출력

### 문제

왜 필요한지, 어떻게 고쳐야 하는지 알기 어렵다.

### 개선

진단 결과에 이유와 수정 예를 포함한다.

---

## M-29. Rule Explosion

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

## M-30. Linter as Editorial Authority

### 기계 규칙이 글의 문체와 판단까지 지배

### 문제

모든 글이 같은 구조와 문장 리듬을 갖게 된다.

### 개선

정확성·일관성 규칙은 자동화하고, 설명 방식은 작성자의 판단을 남긴다.

---

# CI/CD

## M-31. CI as the Only Reproducible Environment

### 로컬에서는 전체 검증을 실행하기 어려움

### 문제

문제가 push 후에만 발견된다.

### 개선

CI와 같은 명령을 로컬에서도 실행할 수 있게 한다.

---

## M-32. Local and CI Command Divergence

### 로컬 `npm run build`와 CI build가 다름

### 문제

로컬 성공 후 CI 실패가 반복된다.

### 개선

CI는 package script를 호출하고 별도 로직을 최소화한다.

---

## M-33. Hidden Environment Dependency

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

## M-34. Floating Tool Versions

### Node·Python·OS package 버전이 고정되지 않음

### 문제

어제 성공한 빌드가 오늘 실패할 수 있다.

### 개선

주요 런타임과 생성 도구 버전을 명시적으로 고정한다.

---

## M-35. CI Workflow Logic Duplication

### 여러 workflow에 install·build·cache 설정 반복

### 문제

한 곳만 수정되어 동작이 달라진다.

### 개선

재사용 workflow 또는 composite action으로 공통화한다.

---

## M-36. Deploy on Every Branch Push

### 불필요한 preview·artifact 생성

### 개선

브랜치와 변경 경로에 따라 실행 범위를 제한한다.

---

## M-37. No Path-Based Trigger

### 문서 오탈자 수정에도 tooling 전체 테스트

### 개선

콘텐츠·UI·도구 변경에 따라 job을 나눈다.

단, 최종 main 배포에서는 통합 검사를 유지한다.

---

## M-38. CI Cache as a Mystery

### 캐시가 왜 hit/miss 되는지 모름

### 문제

stale 결과나 낮은 효율을 방치한다.

### 개선

cache key와 대상 디렉터리를 문서화하고 hit ratio를 확인한다.

---

## M-39. Flaky Build Accepted as Normal

### 가끔 메모리 부족이나 timeout이 발생

### 문제

재실행으로 넘기면 근본 원인이 누적된다.

### 개선

flaky 실패를 별도 issue로 추적하고 재시도는 보조 장치로만 사용한다.

---

## M-40. No Post-Deploy Verification

### 배포 성공 메시지만 확인

### 개선

배포 후 대표 URL, 검색 인덱스, Sitemap, 주요 asset을 smoke test한다.

---

# Dependencies

## M-41. Dependency Archaeology

### 왜 설치했는지 모르는 패키지

### 문제

삭제하기 무서워 계속 남는다.

### 개선

각 주요 dependency의 목적을 기록한다.

---

## M-42. Feature Removed, Dependency Retained

### MDX나 편집 기능은 제거했지만 패키지는 남음

### 문제

설치·보안·업데이트 비용이 지속된다.

### 개선

기능 제거 checklist에 dependency, config, docs, tests 제거를 포함한다.

---

## M-43. Production and Tooling Dependencies Mixed

### editor-only·build-only 패키지가 모두 같은 범주

### 문제

의존성 역할을 파악하기 어렵다.

### 개선

runtime, build, editor, content-tools 역할을 분리한다.

---

## M-44. Dependency for a Trivial Function

### 작은 slug 처리나 날짜 포맷 때문에 큰 패키지 설치

### 문제

업데이트와 공급망 표면이 커진다.

### 개선

패키지 도입 전 실제 절감되는 복잡성을 비교한다.

---

## M-45. Multiple Libraries for the Same Job

### Markdown parser나 날짜 라이브러리가 여러 개

### 문제

동작 차이와 번들·설치 비용이 증가한다.

### 개선

용도를 통합하거나 사용 범위를 명확히 분리한다.

---

## M-46. Unbounded Plugin Stack

### remark·rehype plugin이 계속 증가

### 문제

호환성·실행 순서·업그레이드 위험이 커진다.

### 개선

플러그인마다 필요성, 입력, 출력, 순서 의존성을 문서화한다.

---

## M-47. Major Upgrade by Habit

### 기능상 필요 없이 최신 major로 즉시 이동

### 문제

콘텐츠 개선보다 migration 비용이 커진다.

### 개선

보안·지원 종료·명확한 이점이 있을 때 업그레이드한다.

---

## M-48. Frozen Dependencies Forever

### 반대로 업데이트를 무기한 미룸

### 문제

나중에 한 번에 큰 migration이 필요해진다.

### 개선

정기적인 작은 업데이트와 major 업그레이드를 분리한다.

---

## M-49. Lockfile Without Reproducibility

### lockfile은 있지만 시스템 dependency가 고정되지 않음

### 개선

Node 외에 Python, LaTeX, font, image tools까지 포함한 환경 정의가 필요하다.

---

## M-50. Vulnerability Scanner as Upgrade Bot

### 취약점 경고가 나오면 맥락 없이 모두 업데이트

### 문제

실제 사용하지 않는 경로의 경고 때문에 안정성을 해칠 수 있다.

### 개선

노출 여부와 실행 경로를 평가하고 제거·업데이트·완화 중 선택한다.

---

# Documentation Drift

## M-51. README as Marketing Copy

### 실제 상태보다 기능을 크게 설명

### 문제

구현과 문서가 어긋난다.

### 개선

현재 지원, 실험, 계획을 구분한다.

---

## M-52. Feature List Without Ownership

### 기능은 나열되지만 어디서 구현되는지 모름

### 개선

핵심 기능에 source location과 책임 모듈을 연결한다.

---

## M-53. Stale Setup Guide

### 설치 명령이 현재 버전과 맞지 않음

### 문제

새 환경에서 시작부터 실패한다.

### 개선

CI에서 setup 문서의 핵심 명령을 실제 실행해 검증할 수 있다.

---

## M-54. Architecture in Comments Only

### 중요한 판단이 config 주석에만 남음

### 문제

파일을 바꾸거나 삭제하면 맥락이 사라진다.

### 개선

중요한 결정은 짧은 ADR로 남긴다.

---

## M-55. ADR Without Consequences

### 결정만 기록

```text
Astro를 사용한다.
```

### 문제

왜 선택했고 무엇을 포기했는지 모른다.

### 개선

Context, Decision, Consequences를 기록한다.

---

## M-56. ADR as Immutable Law

### 과거 결정을 절대 변경하지 않음

### 개선

결정 상태를 표시한다.

```text
accepted
superseded
deprecated
```

---

## M-57. Documentation Duplication

### README, Wiki, 코드 주석에 같은 설명 반복

### 문제

한 곳만 갱신되어 충돌한다.

### 개선

한 곳을 source of truth로 두고 다른 곳에서는 링크한다.

---

## M-58. No Operational Runbook

### 배포 실패·검색 인덱스 오류·OG 실패 대응법 없음

### 개선

자주 발생하는 운영 문제의 진단과 복구 절차를 짧게 정리한다.

---

## M-59. No Content Authoring Guide

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

## M-60. Documentation Without Deletion

### 제거된 기능 문서가 계속 남음

### 개선

기능 삭제 시 문서 검색과 정리를 checklist에 포함한다.

---

# Generated Assets

## M-61. Source–Artifact Ambiguity

### 어떤 파일이 원본이고 생성물인지 불명확

### 문제

생성된 SVG나 OG 이미지를 직접 수정하게 된다.

### 개선

디렉터리와 파일 헤더로 source와 generated를 구분한다.

---

## M-62. Generated File Modified Manually

### 생성물을 직접 수정해 임시 해결

### 문제

다음 빌드에서 덮어씌워진다.

### 개선

원본 또는 generator를 수정한다.

---

## M-63. Artifact Naming by Display Title

### 제목 변경 시 파일명도 변경

### 문제

불필요한 삭제·생성과 링크 변화가 발생한다.

### 개선

안정적인 content ID나 slug를 사용한다.

---

## M-64. No Artifact Manifest

### 어떤 글이 어떤 OG·SVG·검색 레코드를 생성했는지 모름

### 개선

입력과 출력 관계를 manifest로 관리한다.

---

## M-65. Stale Artifact Preservation

### 원본 글이 삭제돼도 생성물이 남음

### 개선

manifest 기준 prune을 사용한다.

---

## M-66. Over-Aggressive Prune

### 현재 build에서 참조되지 않는다는 이유로 공유 자산 삭제

### 개선

공유 자산과 문서 전용 자산을 구분한다.

---

## M-67. Generator Version Not Recorded

### 어떤 버전으로 OG·SVG를 만들었는지 모름

### 문제

결과 차이를 추적하기 어렵다.

### 개선

manifest나 build metadata에 generator version을 기록한다.

---

## M-68. Non-Deterministic Asset Generation

### 폰트·시스템·random 값에 따라 이미지 결과가 달라짐

### 개선

폰트와 locale, seed, tool version을 고정한다.

---

## M-69. Generated Asset Review Blind Spot

### 코드 diff에는 이미지 결과가 보이지 않음

### 개선

큰 시각 변경에는 preview artifact나 screenshot diff를 제공한다.

---

## M-70. Asset Pipeline Owns Publishing

### 이미지 생성 실패 때문에 텍스트 수정도 배포 불가

### 개선

필수 자산과 선택 자산을 구분하고 fallback을 제공한다.

---

# Content Operations

## M-71. Publish-and-Forget

### 글을 발행한 뒤 다시 보지 않음

### 문제

오래된 정보와 깨진 링크가 누적된다.

### 개선

업데이트·검증·폐기 주기를 운영 프로세스에 포함한다.

---

## M-72. Date-Based Review Only

### 오래된 글이면 모두 검토 대상으로 지정

### 문제

안정적인 개념 글까지 불필요하게 검토한다.

### 개선

변화 가능성에 따라 주기를 다르게 둔다.

```text
specification
toolchain
API
benchmark
historical note
```

---

## M-73. No Content Ownership

### 어느 주제를 우선 관리할지 기준이 없음

개인 블로그에서도 주제가 많으면 사실상 같은 문제가 생긴다.

### 개선

핵심 Topic별 대표 허브와 유지 우선순위를 둔다.

---

## M-74. New Content Before Existing Debt

### 기존 글 정리보다 새 글 작성이 항상 우선

### 문제

사이트 전체 품질은 개선되지 않는다.

### 개선

콘텐츠 작업 시간을 예를 들어 다음처럼 나눈다.

```text
신규 50%
업데이트 30%
통합·폐기 20%
```

비율은 조정할 수 있다.

---

## M-75. No Merge Policy for Similar Articles

### 비슷한 글을 언제 합칠지 기준이 없음

### 개선

다음을 동시에 만족하면 통합 후보로 본다.

- 동일 검색 의도
- 설명 중복
- 독립 실험 없음
- 내부 링크 관계가 약함

---

## M-76. Deletion Aversion

### 작성한 글을 절대 삭제하거나 통합하지 않음

### 문제

구판·중복·낮은 품질 글이 계속 남는다.

### 개선

redirect와 superseded 상태를 활용해 지식을 보존하면서 구조는 정리한다.

---

## M-77. Update Without Revalidation

### 문장만 수정하고 환경 검증일도 최신으로 변경

### 문제

실제로 테스트하지 않았는데 최신 글처럼 보인다.

### 개선

`updated`와 `lastVerified`를 분리한다.

---

## M-78. Bulk AI Refresh

### 오래된 글 전체를 AI로 일괄 재작성

### 문제

- 고유 경험 손실
- 문체 획일화
- 새로운 오류
- 사실 검증 부족

### 개선

AI는 후보와 구조 개선에 사용하고, 핵심 기술 주장과 경험은 직접 검증한다.

---

## M-79. Editorial Template Lock-In

### 모든 글이 같은 템플릿을 강제

### 문제

글 유형과 주제 특성이 사라진다.

### 개선

콘텐츠 타입별 최소 구조만 제공하고 설명 방식은 유연하게 둔다.

---

## M-80. No Content Retirement Workflow

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

# Release and Change Management

## M-81. Content and Platform Changes Mixed

### 한 commit에서 글 50개와 UI 구조를 동시에 변경

### 문제

검토와 rollback이 어렵다.

### 개선

콘텐츠 migration, 플랫폼 변경, 디자인 변경을 가능한 한 분리한다.

---

## M-82. Giant Refactor Commit

### 수천 파일 변경을 한 commit으로 처리

### 문제

의미 있는 diff 검토가 불가능하다.

### 개선

기계적 변경과 수동 의미 변경을 별도 commit으로 나눈다.

---

## M-83. Formatting Noise in Semantic Change

### 내용 수정과 formatter 전체 적용이 섞임

### 개선

formatting-only commit을 먼저 분리한다.

---

## M-84. No Rollback Plan

### 배포 후 문제 발생 시 이전 사이트로 돌아가기 어려움

### 개선

배포 artifact 또는 이전 commit 기반 rollback 절차를 유지한다.

---

## M-85. Preview Not Representative

### preview에서는 Analytics·광고·base URL·asset 경로가 다름

### 문제

운영에서만 발생하는 오류를 놓친다.

### 개선

운영과 최대한 유사한 preview 설정을 사용한다.

---

## M-86. Feature Flag Cemetery

### 오래된 실험 flag가 계속 남음

```text
enableNewSearch
useNewCard
legacySeries
```

### 문제

코드 경로가 증가하고 실제 사용 상태를 모른다.

### 개선

flag에 만료일과 제거 조건을 둔다.

---

## M-87. Permanent Compatibility Layer

### 구형 URL·schema·컴포넌트 adapter가 계속 남음

### 개선

호환 계층마다 종료 조건을 정하고 migration 완료 후 제거한다.

---

## M-88. Release Notes Without User Impact

### 내부 파일 변경만 설명

### 개선

다음처럼 사용자와 운영 관점으로 작성한다.

```text
검색 결과 정확도 개선
기존 CXL 글 URL 유지
모바일 코드 블록 스크롤 수정
```

---

## M-89. No Baseline Before Refactor

### 구조를 바꿨지만 개선 여부를 비교할 수 없음

### 개선

리팩토링 전 다음을 기록한다.

- build time
- memory
- index size
- broken links
- Lighthouse
- 주요 페이지 screenshot

---

## M-90. Completion Defined as Code Merge

### 기능 구현이 끝나면 완료

### 문제

문서, migration, 운영 검증, 기존 콘텐츠 적용이 빠진다.

### 개선

완료 조건에 다음을 포함한다.

```text
code
tests
docs
migration
content adoption
production validation
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Schema Drift | 글 수가 많아 과거·현재 metadata 차이 가능성이 큼 |
| 2 | Every Script Parses Markdown Differently | 감사·생성 도구가 많아 규칙 불일치 위험 |
| 3 | Forever Backward Compatibility | 오래된 형식을 코드에서 계속 지원할 가능성 |
| 4 | One Script per Symptom | 자동화가 별도 내부 플랫폼으로 성장할 수 있음 |
| 5 | No Fixture Tests for Content Tools | 대량 자동 수정의 신뢰성 확보 필요 |
| 6 | Auto-Fix Without Confidence | 내부 링크 자동 수정 시 의미 오류 가능 |
| 7 | Required Field Inflation | 콘텐츠 구조 개선 중 front matter 폭발 위험 |
| 8 | Dependency Archaeology | MDX·editor·generator 관련 잔존 의존성 점검 |
| 9 | README as Marketing Copy | 설명 기능과 실제 구현 상태 차이 가능 |
| 10 | Source–Artifact Ambiguity | OG·SVG·검색 인덱스 등 생성물 관리 중요 |
| 11 | Publish-and-Forget | 수백 개 기술 글의 최신성 유지 문제 |
| 12 | Update Without Revalidation | 수정일과 실제 검증일을 구분해야 함 |
| 13 | New Content Before Existing Debt | 애드센스 대응에서 신규 글보다 기존 구조 개선 우선 |
| 14 | Content and Platform Changes Mixed | 대규모 개편 시 검토·rollback 어려움 |
| 15 | No Baseline Before Refactor | 개선 효과를 판단하려면 현재 수치가 필요 |

# 이번 단계의 핵심 결론

유지보수 문제의 본질은 스크립트 수나 dependency 수 자체가 아니다.

> **콘텐츠를 해석하는 규칙이 여러 곳으로 분산되고, 과거 형식과 파생 자산을 계속 호환하면서 시스템의 책임이 늘어나는 것**

이 핵심 위험이다.

가장 좋은 방향은 다음이다.

```text
단일 콘텐츠 schema
단일 content manifest
공통 진단 모델
단계적 migration
명확한 source/artifact 경계
업데이트·폐기 정책
측정 가능한 완료 조건
```

다음은 **Task 2-8. Security, Privacy & Supply-Chain Anti-patterns**로 이어갈 수 있다. GitHub Pages 자체는 단순하지만 AdSense·Analytics·Giscus·OAuth·관리자 편집기·외부 스크립트·CI secret·dependency가 추가되면서 생기는 문제를 정리하는 단계다.

## 34. assistant

이번에는 **Task 2-8. Security, Privacy & Supply-Chain Anti-patterns**다. GitHub Pages 자체보다 Giscus·Analytics·AdSense·OAuth·CI secrets·외부 스크립트와 dependency 경계를 중심으로 보겠다.

## 35. assistant

# Task 2-8. Security, Privacy & Supply-Chain Anti-patterns

정적 블로그는 서버와 데이터베이스가 없기 때문에 비교적 안전하다. 그러나 다음 기능이 붙는 순간 공격 표면이 다시 커진다.

```text
GitHub Actions
npm dependencies
외부 JavaScript
Giscus
Analytics
AdSense
OAuth
관리자 편집기
GitHub API
사용자 입력
```

특히 외부 JavaScript는 페이지 문맥에서 실행되므로 분석·광고·댓글 스크립트도 사이트의 신뢰 경계 안에 들어온다. CSP와 SRI는 이런 위험을 줄이는 방어 계층으로 사용할 수 있다. citeturn392708search3turn392708search8turn392708search12

---

# A. 정적 사이트에 대한 잘못된 보안 가정

## SEC-01. Static Means Secure

### 정적 사이트이므로 보안 검토가 필요 없다고 생각

정적 HTML만 배포하더라도 다음은 여전히 존재한다.

- 외부 JavaScript
- 공급망 공격
- XSS
- 악성 링크
- DNS·도메인 설정
- GitHub Actions 권한
- 노출된 secret
- 관리자 도구
- 개인정보 수집

### 개선

정적 사이트의 장점은 공격 표면이 **작다**는 것이지, 공격 표면이 **없다**는 뜻은 아니다.

---

## SEC-02. No Backend, No Sensitive Data

### 서버가 없으니 민감한 정보가 없다고 생각

저장소와 빌드 환경에는 다음이 있을 수 있다.

```text
Analytics ID
AdSense 설정
GitHub token
OAuth secret
배포 token
개인 이메일
초안 문서
비공개 이미지
```

공개해도 되는 식별자와 절대 공개하면 안 되는 secret을 구분해야 한다.

---

## SEC-03. Public Repository as a Secret Store

### 나중에 사용할 설정값을 저장소에 먼저 기록

```env
GITHUB_CLIENT_SECRET=...
```

### 문제

한 번 Git history에 들어간 secret은 파일만 삭제해도 안전해지지 않는다.

### 개선

노출된 secret은 삭제가 아니라 **폐기·재발급**해야 한다.

---

## SEC-04. Security by Obscurity

### `/admin` 주소를 메뉴에서 숨기면 안전하다고 생각

### 문제

공개 정적 자산, Sitemap, JavaScript bundle, 저장소 코드에서 경로를 발견할 수 있다.

### 개선

관리자 기능은 주소 은닉이 아니라 인증·권한 검증으로 보호한다.

---

## SEC-05. Development Feature in Production

### 실험용 관리자·미리보기 기능이 운영 빌드에 포함

### 문제

UI에서 보이지 않아도 코드와 endpoint가 남을 수 있다.

### 개선

공개 사이트 빌드에서는 기능을 숨기는 것이 아니라 **아예 포함하지 않는 것**이 좋다.

---

# B. 외부 JavaScript

## SEC-06. Trust Every Third-Party Script

### 유명 서비스의 JavaScript는 무조건 안전하다고 가정

예:

- Analytics
- AdSense
- 댓글
- Newsletter
- 공유 버튼
- 검색 서비스

외부 스크립트는 공급자가 침해되거나 전달 경로가 변조되면 사이트 방문자에게 영향을 줄 수 있다. OWASP도 제3자 JavaScript를 별도의 공급망 위험으로 다룬다. citeturn392708search12turn392708search25

### 개선

외부 스크립트마다 다음을 기록한다.

```text
왜 필요한가
어떤 데이터를 읽는가
어떤 도메인과 통신하는가
제거하면 무엇이 깨지는가
지연 로드할 수 있는가
```

---

## SEC-07. Third-Party Script Accumulation

### 기능 하나마다 외부 스크립트 추가

```text
Analytics
AdSense
Giscus
Newsletter
Social share
Heatmap
Error tracking
```

### 문제

각 서비스의 위험은 작아도 전체 공격 표면과 개인정보 흐름은 누적된다.

### 개선

한 서비스가 실제 의사결정이나 사용자 가치에 기여하지 않는다면 제거한다.

---

## SEC-08. Third-Party Script in Critical Path

### 외부 서비스가 실패하면 본문도 표시되지 않음

### 개선

```text
본문 렌더링
↓
외부 기능 지연 로딩
```

순서를 유지한다.

외부 스크립트 실패는 댓글·광고·분석 기능에만 영향을 줘야 한다.

---

## SEC-09. No Content Security Policy

### 브라우저가 어디서든 스크립트와 자원을 불러올 수 있음

CSP는 허용된 스크립트·스타일·이미지·프레임 출처를 제한하는 방어 계층이다. XSS와 비인가 외부 자원 로딩 위험을 줄일 수 있다. citeturn392708search18turn392708search34turn392708search43

### 개선 예시 방향

```text
default-src 'self'
script-src 'self' 필요한 외부 도메인
img-src 'self' data: 필요한 이미지 도메인
frame-src Giscus 등 명시적 도메인
```

AdSense나 Analytics를 사용하면 허용 목록이 복잡해질 수 있으므로 실제 네트워크 요청을 기준으로 설계해야 한다.

---

## SEC-10. CSP Added After Everything

### 외부 기능을 모두 붙인 뒤 마지막에 CSP 추가

### 문제

이미 inline script, 동적 style, 여러 외부 도메인에 의존해 엄격한 CSP를 적용하기 어려워진다.

### 개선

새 integration을 추가할 때 CSP 영향도 함께 검토한다.

---

## SEC-11. CSP with `unsafe-inline` Everywhere

### CSP는 있지만 대부분 허용

```text
script-src 'self' 'unsafe-inline' 'unsafe-eval' *
```

### 문제

정책이 존재하지만 실질적인 보호 효과가 작다.

### 개선

가능하면 nonce나 hash 기반 script 정책을 사용하고, `unsafe-eval`이 필요한 의존성을 줄인다.

---

## SEC-12. CSP Report Ignored

### CSP 위반 리포트가 많아도 방치

### 문제

실제 공격, 잘못된 설정, 브라우저 확장 노이즈를 구분하지 못한다.

### 개선

처음에는 report-only 정책으로 관찰하고, 필요한 출처만 정제한 뒤 강제 정책으로 전환한다.

---

## SEC-13. No Subresource Integrity

### CDN script를 URL만 믿고 로드

SRI는 내려받은 자원의 cryptographic hash가 기대값과 일치하는지 브라우저가 확인하게 한다. CDN 자원이 예기치 않게 변경되는 위험을 줄이는 데 사용된다. citeturn392708search8turn392708search22

### 주의

AdSense처럼 공급자가 동적으로 변경하는 스크립트는 SRI 적용이 현실적으로 어려울 수 있다. 고정 버전의 정적 CDN 자원에 더 적합하다.

---

## SEC-14. SRI Without `crossorigin`

### integrity hash는 있지만 교차 출처 검증 설정이 잘못됨

### 문제

브라우저가 자원을 의도대로 검증하거나 로드하지 못할 수 있다.

### 개선

외부 정적 자원에 SRI를 적용할 때 CORS 조건을 함께 검토한다.

---

## SEC-15. Script Version Floating

### 외부 CDN에서 최신 버전을 자동 사용

```html
<script src=".../library/latest.js">
```

### 문제

검토하지 않은 변경이 즉시 운영에 들어온다.

### 개선

고정된 version이나 immutable URL을 사용한다.

---

## SEC-16. Same-Origin Proxy as Automatic Trust

### 외부 script를 자체 도메인으로 proxy하면 안전하다고 생각

### 문제

출처만 바뀔 뿐 코드 자체의 신뢰 문제는 남는다.

### 개선

version, integrity, 검토, 업데이트 절차가 함께 필요하다.

---

# C. XSS와 콘텐츠 렌더링

## SEC-17. Markdown Is Trusted HTML

### Markdown 콘텐츠는 작성자가 썼으니 항상 안전하다고 가정

현재는 혼자 작성하더라도 향후 다음 경로가 생길 수 있다.

- 관리자 편집기
- 외부 기여
- 자동 import
- AI 생성 초안
- RSS·책 노트 동기화
- GitHub issue 기반 콘텐츠

### 문제

raw HTML이나 scriptable attribute가 렌더링될 수 있다.

### 개선

Markdown pipeline에서 raw HTML 허용 정책을 명확히 한다.

---

## SEC-18. Raw HTML Everywhere

### Markdown 표현이 불편할 때 직접 HTML 삽입

```html
<div onclick="...">
<iframe ...>
<script ...>
```

### 문제

콘텐츠와 실행 코드 경계가 무너지고 sanitization이 어려워진다.

### 개선

필요한 embed는 허용된 컴포넌트나 directive로 제한한다.

---

## SEC-19. Unsafe HTML Injection

### 검색 결과나 제목을 `innerHTML`로 삽입

```javascript
results.innerHTML = userControlledText;
```

XSS는 악성 콘텐츠가 페이지 문맥에서 실행되게 만들 수 있는 심각한 취약점이다. citeturn392708search29

### 개선

기본은 `textContent`와 안전한 DOM API를 사용한다. 정말 HTML이 필요하면 검증된 sanitizer와 명확한 허용 목록을 쓴다.

---

## SEC-20. Search Highlight via String Replacement

### 검색어를 HTML 문자열에 직접 치환

```javascript
text.replace(query, `<mark>${query}</mark>`)
```

### 문제

검색 입력이 markup으로 해석될 수 있다.

### 개선

텍스트 노드를 분리해 `<mark>` 요소를 DOM API로 만든다.

---

## SEC-21. Unescaped Front Matter

### 제목·description·태그를 HTML attribute에 그대로 삽입

### 문제

문자열이 attribute 문맥을 탈출할 수 있다.

### 개선

Astro의 기본 escaping을 우회하지 말고, 직접 HTML 문자열을 조립하지 않는다.

---

## SEC-22. Trusting Generated Content

### AI나 자동화가 만든 Markdown은 안전하다고 가정

### 문제

의도하지 않은 HTML, 외부 iframe, 추적 링크, 위험한 protocol이 들어갈 수 있다.

### 개선

생성 주체와 관계없이 동일한 content validation을 적용한다.

---

## SEC-23. Unsafe URL Scheme

### 링크의 `href`를 검증하지 않음

```text
javascript:
data:
file:
```

### 개선

콘텐츠 링크에서 허용할 protocol을 제한한다.

일반적으로:

```text
https
http
mailto
내부 상대 경로
```

정도로 관리할 수 있다.

---

## SEC-24. Unrestricted Iframe Embedding

### 어떤 URL이든 iframe으로 삽입 가능

### 문제

피싱 화면, 추적, 권한 요청, clickjacking 관련 위험이 늘어난다.

### 개선

- 허용 도메인 목록
- `sandbox`
- 필요한 최소 `allow`
- 명확한 제목
- 지연 로딩

을 사용한다.

OWASP는 제3자 콘텐츠 격리에 iframe sandbox와 CSP를 방어 수단으로 제안한다. citeturn392708search12

---

## SEC-25. Overpowered Iframe Sandbox

### sandbox를 쓰지만 모든 권한을 다시 허용

```html
sandbox="allow-scripts allow-same-origin allow-forms allow-popups ..."
```

### 문제

sandbox 효과가 크게 약해진다.

### 개선

기능에 필요한 최소 권한만 허용한다.

---

## SEC-26. Untrusted SVG as Image

### 외부 SVG를 일반 이미지처럼 신뢰

SVG는 단순 그림 파일이 아니라 스크립트·외부 참조와 상호작용 요소를 포함할 수 있다.

### 개선

외부 SVG를 inline HTML로 삽입하지 말고, 필요하다면 sanitize하거나 빌드 과정에서 안전한 형태로 변환한다.

---

## SEC-27. Generated SVG Injection

### TikZ·다이어그램 생성 결과를 무조건 inline

### 문제

생성 도구나 입력 경로가 변하면 예상치 못한 markup이 들어갈 수 있다.

### 개선

생성물도 허용 요소·attribute 검사를 거친다.

---

# D. GitHub Actions 공급망

## SEC-28. Actions Pinned by Mutable Tag

```yaml
uses: actions/checkout@v4
```

태그는 편리하지만 변경 가능한 참조다. GitHub는 action을 immutable하게 사용하려면 full-length commit SHA로 고정하는 것을 권장한다. citeturn392708search1turn392708search11

### 개선

```yaml
uses: actions/checkout@<full-commit-sha>
```

그리고 사람이 이해할 수 있도록 옆에 버전 주석을 둔다.

---

## SEC-29. Arbitrary Third-Party Action

### README가 편리해 보여 바로 workflow에 추가

### 문제

Action은 저장소 코드·토큰·artifact에 접근할 수 있다.

GitHub도 action source가 secret과 repository 데이터를 어떻게 처리하는지 검토할 것을 권장한다. citeturn392708search1

### 개선

- 공식 action 우선
- 소스와 유지보수 상태 검토
- full SHA pin
- 최소 권한
- 대체 가능한 간단한 shell 명령과 비교

---

## SEC-30. Default Broad Workflow Permissions

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

## SEC-31. Write Token in Build Job

### Markdown build와 배포가 같은 고권한 job

### 문제

빌드 dependency나 script가 침해되면 write token까지 접근할 가능성이 커진다.

### 개선

```text
untrusted build
→ artifact
→ minimal deploy job
```

으로 권한 경계를 나눈다.

---

## SEC-32. Secrets Available to Every Step

### workflow 전체에 secret을 환경변수로 설정

```yaml
env:
  TOKEN: ${{ secrets.TOKEN }}
```

### 문제

필요하지 않은 action과 script도 secret을 볼 수 있다.

### 개선

실제로 사용하는 단일 step에만 전달한다.

---

## SEC-33. Secret Printed Through Debug Logging

### troubleshooting을 위해 환경 전체 출력

```bash
env
set -x
```

### 문제

secret masking이 모든 변형과 가공된 문자열을 완벽히 막는다고 가정하면 위험하다.

### 개선

민감한 환경에서는 전체 environment와 command tracing을 출력하지 않는다.

---

## SEC-34. Secret in Build Artifact

### 환경변수를 정적 HTML이나 JavaScript에 삽입

### 문제

정적 사이트에 포함된 값은 결국 모든 방문자가 볼 수 있다.

### 개선

브라우저에서 필요한 값은 public identifier로 취급한다. 비밀이 필요한 기능은 정적 사이트에 직접 넣을 수 없다.

---

## SEC-35. Pull Request Workflow with Secrets

### 외부 PR 콘텐츠를 secret이 있는 workflow에서 처리

### 문제

악성 PR이 build script나 package script를 변경해 secret을 탈취할 수 있다.

### 개선

외부 기여 검증과 권한 있는 배포를 분리한다.

---

## SEC-36. Unsafe `pull_request_target`

### fork PR 코드를 privileged context에서 checkout·실행

### 문제

기여자의 코드를 저장소 권한과 함께 실행할 수 있다.

### 개선

`pull_request_target`은 metadata 처리처럼 명확히 안전한 작업으로 제한한다.

---

## SEC-37. Branch Name Injection

### PR 제목·브랜치·commit message를 shell 명령에 직접 삽입

```bash
echo "${{ github.event.pull_request.title }}"
```

사용 위치에 따라 shell injection 위험이 생길 수 있다.

### 개선

환경변수로 전달하고 shell quoting을 엄격히 한다. 가능하면 GitHub context 값을 명령 코드로 직접 조립하지 않는다.

---

## SEC-38. Untrusted Markdown Executed During Build

### 글 속 directive가 shell command나 파일 경로를 생성

예:

```text
TikZ input
diagram command
include path
```

### 문제

외부 PR의 콘텐츠가 build host에서 명령 실행이나 임의 파일 접근으로 이어질 수 있다.

### 개선

- command argument allowlist
- 작업 디렉터리 격리
- shell 문자열 조립 금지
- 외부 PR에서는 위험한 generator 비활성화

---

## SEC-39. Build Tool with Repository Write Access

### formatter나 migration script가 CI에서 원본 저장소를 직접 수정·push

### 문제

오류나 침해 시 대량 변경을 자동 반영할 수 있다.

### 개선

자동 수정은 PR을 생성하고 사람이 검토하게 한다.

---

## SEC-40. Deployment From Unreviewed Commit

### 임의 branch나 workflow_dispatch 입력으로 운영 배포

### 개선

보호된 branch와 검토된 artifact만 배포한다.

---

# E. npm과 Dependency Supply Chain

## SEC-41. Blind Dependency Installation

### 패키지 이름과 다운로드 수만 보고 설치

npm 생태계의 dependency는 취약점과 공급망 위험을 포함할 수 있으므로 검토와 관리가 필요하다. citeturn392708search39turn392708search44

### 개선

새 dependency마다 다음을 확인한다.

```text
유지보수 상태
소유자 변경
release 빈도
transitive dependency
install script
필요 권한
대체 가능성
```

---

## SEC-42. Dependency for Minor Convenience

### 몇 줄이면 되는 기능에 대형 패키지 추가

### 문제

직접 코드 수는 줄지만 공급망과 업데이트 책임은 늘어난다.

### 개선

패키지 도입 비용을 다음으로 평가한다.

```text
코드 절감
보안 표면
dependency tree
업데이트 빈도
브라우저 bundle
빌드 영향
```

---

## SEC-43. Transitive Dependency Blindness

### 직접 설치한 패키지만 검토

### 문제

실제 의존성 대부분은 하위 패키지일 수 있다.

### 개선

lockfile 변화와 dependency tree 크기를 함께 검토한다.

---

## SEC-44. Automatic Major Update Merge

### Dependabot PR이 테스트만 통과하면 자동 merge

### 문제

API 변경 외에도 빌드 결과·HTML·보안 정책·추적 동작이 달라질 수 있다.

### 개선

패키지 역할에 따라 정책을 나눈다.

```text
patch: 자동화 가능
minor: 검토
major: 수동 검증
security: 노출도 평가 후 우선 처리
```

Dependabot은 업데이트 자동화를 지원하지만, 자동화 범위와 승인 정책은 별도로 설계해야 한다. citeturn392708search17

---

## SEC-45. Vulnerability Count Theater

### `npm audit` 숫자 0만 목표

### 문제

빌드 시에만 사용하는 패키지와 실제 브라우저에 전달되는 코드의 위험이 다르다.

### 개선

```text
실행 가능성
노출 경로
영향도
사용 버전
완화 수단
```

을 평가한다.

---

## SEC-46. Ignoring Build-Time Compromise

### 브라우저 bundle에 포함되지 않으니 build dependency는 안전하다고 생각

### 문제

빌드 도구는 원본 콘텐츠, secret, output HTML을 변경할 수 있다.

### 개선

build dependency도 production supply chain으로 취급한다.

---

## SEC-47. Install Script Trust

### package의 `preinstall`·`postinstall` 실행을 무조건 허용

### 문제

설치 과정에서 임의 코드가 실행될 수 있다.

### 개선

새 package의 lifecycle script를 확인하고 필요하지 않은 실행 권한을 줄인다.

---

## SEC-48. Lockfile Bypass

### CI에서 lockfile과 다른 최신 dependency 설치

### 개선

재현 가능한 설치 명령을 사용하고 lockfile 변경은 코드처럼 검토한다.

---

## SEC-49. Lockfile Change Hidden in Large PR

### 콘텐츠 대량 수정과 dependency update가 섞임

### 문제

공급망 변화 검토가 묻힌다.

### 개선

dependency 변경은 별도 PR이나 commit으로 분리한다.

---

## SEC-50. Abandoned Dependency Retention

### 더 이상 유지되지 않는 plugin을 계속 사용

### 문제

새로운 Astro·Node 환경에서 호환성뿐 아니라 보안 패치도 기대하기 어렵다.

### 개선

핵심 plugin마다 유지보수 상태와 제거 대안을 기록한다.

---

# F. OAuth와 관리자 편집기

## SEC-51. OAuth Secret in Static Client

### GitHub OAuth client secret을 Astro 정적 bundle에 포함

### 문제

브라우저에 전달된 secret은 secret이 아니다.

### 개선

OAuth code exchange에 secret이 필요한 구조라면 신뢰할 수 있는 server-side component가 필요하다.

---

## SEC-52. Personal Access Token in Browser Storage

### GitHub PAT를 `localStorage`에 저장

### 문제

동일 origin의 XSS나 악성 script가 읽을 수 있다.

### 개선

개인용 로컬 도구로 범위를 제한하거나, 짧은 수명의 token과 안전한 backend session 구조를 사용한다.

---

## SEC-53. Long-Lived Broad PAT

### 저장소 전체를 수정할 수 있는 장기 token 사용

### 개선

- fine-grained token
- 특정 저장소
- 필요한 권한만
- 짧은 만료
- 주기적 회전

을 적용한다.

---

## SEC-54. OAuth Scope Inflation

### 미래 기능을 위해 넓은 scope 요청

### 문제

사용자와 저장소에 대한 불필요한 접근 권한을 가진다.

### 개선

현재 기능에 필요한 최소 scope만 요청한다.

---

## SEC-55. Authentication Without Authorization

### 로그인했으면 누구나 글 수정 가능

### 문제

사용자 신원 확인과 권한 확인은 다른 문제다.

### 개선

허용 사용자·조직·저장소·branch를 별도로 검증한다.

---

## SEC-56. Client-Side Authorization Only

### UI에서 관리자 메뉴를 숨기는 것으로 권한 처리

### 문제

API 요청은 직접 호출할 수 있다.

### 개선

권한이 필요한 모든 write operation은 신뢰 경계에서 다시 검증한다.

---

## SEC-57. Missing OAuth `state`

### OAuth 요청과 callback의 연결을 검증하지 않음

### 문제

로그인 CSRF나 callback 혼동 위험이 생긴다.

### 개선

예측 불가능한 state 값을 생성하고 callback에서 검증한다.

---

## SEC-58. Redirect URI Wildcard

### 여러 환경 지원을 위해 넓은 callback URL 허용

### 문제

token이나 authorization code가 예상치 못한 위치로 전달될 수 있다.

### 개선

정확한 redirect URI를 환경별로 등록한다.

---

## SEC-59. Token in URL

### access token을 query string에 전달

### 문제

browser history, referrer, 로그에 남을 수 있다.

### 개선

URL에 secret이나 token을 넣지 않는다.

---

## SEC-60. Editor Can Commit Anywhere

### 관리자 편집기가 임의 경로에 파일 저장

### 문제

workflow·config·script까지 수정할 수 있다.

### 개선

콘텐츠 전용 디렉터리와 허용 파일 확장자를 제한한다.

---

## SEC-61. Editor Can Modify Workflow Files

### 콘텐츠 편집 token이 `.github/workflows`까지 수정 가능

### 문제

다음 CI 실행에서 코드 실행 권한으로 확대될 수 있다.

### 개선

콘텐츠 작성 권한과 workflow 관리 권한을 분리한다.

---

## SEC-62. Unsanitized Commit Message

### 사용자 입력을 commit message나 API payload에 그대로 사용

### 개선

길이·문자·형식을 제한하고 로그 인젝션이나 제어문자를 제거한다.

---

## SEC-63. No Conflict Detection

### 편집기가 최신 commit 확인 없이 덮어씀

### 문제

보안 취약점은 아니더라도 콘텐츠 무결성과 감사 가능성이 떨어진다.

### 개선

base commit SHA를 확인하고 conflict 시 명시적으로 중단한다.

---

# G. 개인정보와 추적

## SEC-64. Analytics Without Data Inventory

### Analytics를 켰지만 어떤 데이터가 수집되는지 모름

### 개선

최소한 다음을 정리한다.

```text
수집 이벤트
쿠키 사용
IP 처리
보존 기간
외부 이전
사용 목적
```

---

## SEC-65. Privacy Policy by Template

### 서비스 이름만 바꾼 정책 복사

### 문제

실제 Giscus·AdSense·Analytics 구성과 일치하지 않을 수 있다.

### 개선

실제 network와 storage 동작을 기준으로 작성한다.

---

## SEC-66. Privacy Policy Drift

### 서비스는 추가·제거했지만 정책은 그대로

### 개선

외부 integration 변경을 개인정보 처리방침 검토 조건으로 만든다.

---

## SEC-67. Consent Banner Theater

### 실제 제어 없이 “동의” 버튼만 제공

### 문제

버튼을 누르기 전에도 모든 추적 script가 로드될 수 있다.

### 개선

동의가 필요한 환경과 서비스라면 실제 script loading과 연결한다.

---

## SEC-68. Consent for Everything

### 필수 기능까지 모두 쿠키 동의 대상으로 표시

### 문제

사용자에게 불필요한 선택 부담을 준다.

### 개선

필수 저장, 기능 저장, 분석, 광고를 구분한다.

---

## SEC-69. Local Storage Without Disclosure

### 테마·검색 기록·읽기 상태를 저장하지만 안내 없음

### 개선

민감하지 않은 설정이라도 무엇을 왜 저장하는지 문서화한다.

---

## SEC-70. Persistent Search History

### 검색어를 무기한 브라우저나 서버에 저장

### 문제

기술 검색어에도 회사명·오류 로그·내부 식별자가 포함될 수 있다.

### 개선

필요하지 않다면 저장하지 않고, 저장하더라도 사용자 제어와 짧은 보존을 적용한다.

---

## SEC-71. Full URL Analytics Leakage

### query·fragment를 포함한 URL 전체를 analytics로 전송

### 문제

검색어, 내부 식별자, 임시 token 같은 정보가 섞일 수 있다.

### 개선

수집 전에 URL을 정규화하고 민감한 parameter를 제거한다.

---

## SEC-72. Error Logging with Page Content

### 검색 입력이나 편집 중 문서를 오류 리포트에 첨부

### 개선

기본적으로 최소한의 기술 정보만 수집하고 콘텐츠 본문은 제외한다.

---

## SEC-73. Giscus as a First-Party Comment Store

### 댓글 데이터가 완전히 사이트 내부에서 관리된다고 생각

Giscus는 GitHub Discussions와 GitHub 계정에 의존하는 외부 integration이다.

### 개선

댓글을 쓰면 외부 서비스로 이동한다는 사실과 관련 정책을 명확히 보여준다.

---

## SEC-74. Loading Comments Before User Intent

### 댓글을 읽지 않는 사용자에게도 즉시 외부 요청

### 개선

댓글 영역에 도달하거나 사용자가 열었을 때 로드하는 방식을 고려한다.

---

## SEC-75. Advertising Identifier Assumptions

### AdSense를 단순 이미지 광고처럼 생각

### 문제

광고 ecosystem은 쿠키·식별자·동의·지역별 규제와 연결될 수 있다.

### 개선

광고 도입 시 Google의 최신 정책과 사용 지역의 요구사항을 별도로 확인한다.

---

# H. 도메인·HTTPS·배포

## SEC-76. HTTPS Optional

### HTTP 접속도 그대로 허용

GitHub Pages는 HTTPS 강제를 지원하며, HTTPS는 전송 중 가로채기와 변조 위험을 줄인다. citeturn392708search37

### 개선

`Enforce HTTPS`를 활성화하고 내부 링크와 canonical도 HTTPS로 통일한다.

---

## SEC-77. Mixed Content

### HTTPS 페이지에서 HTTP 이미지·script 로드

### 문제

브라우저 차단이나 콘텐츠 변조 위험이 생긴다.

### 개선

모든 외부 자원을 HTTPS로 사용하거나 자체 호스팅한다.

---

## SEC-78. Dangling Custom Domain

### GitHub Pages 설정을 제거했지만 DNS는 남음

### 문제

도메인 소유권과 hosting 연결이 어긋나면 takeover 위험을 검토해야 한다.

### 개선

사이트 이전·삭제 시 DNS와 Pages 설정을 함께 정리한다.

---

## SEC-79. DNS Change Without Verification

### custom domain 변경 후 인증서·리다이렉트·canonical 미검증

### 개선

다음을 함께 확인한다.

```text
HTTPS certificate
www/apex redirect
canonical URL
Sitemap
GitHub Pages domain verification
```

---

## SEC-80. Preview Domain Indexed

### preview·staging 사이트가 검색에 노출

### 문제

중복 콘텐츠와 운영 전 콘텐츠 노출이 발생한다.

### 개선

preview 환경은 인증하거나 `noindex`를 적용하고 Sitemap에서 제외한다.

---

## SEC-81. Source Map Exposure Without Need

### production JavaScript source map을 공개

### 문제

비밀이 직접 들어가면 안 되지만, 내부 코드 구조와 개발 경로를 불필요하게 노출할 수 있다.

### 개선

실제 오류 분석에 필요한지 판단하고 공개 여부를 결정한다.

---

## SEC-82. Backup Files in Public Output

### 다음 파일이 `dist`에 포함

```text
.env
*.bak
draft.md
source.psd
private.json
```

### 개선

배포 artifact allowlist 또는 민감 파일 검사를 둔다.

---

# I. 콘텐츠와 개인정보 노출

## SEC-83. Internal Log Publication

### 기술 설명을 위해 회사 로그를 그대로 게시

### 노출 가능 정보

- 내부 hostname
- IP
- 사용자 이름
- 경로
- repository URL
- 고객명
- device serial
- token
- 이메일

### 개선

로그는 게시 전 구조적으로 redact한다.

---

## SEC-84. Screenshot Metadata Leakage

### 터미널이나 브라우저 전체 화면 캡처

### 문제

탭 제목·북마크·경로·이메일·알림이 노출될 수 있다.

### 개선

필요 영역만 crop하고 게시 전 별도 검토한다.

---

## SEC-85. Image EXIF Leakage

### 사진 원본의 위치·기기 metadata 유지

### 개선

게시 파이프라인에서 불필요한 metadata를 제거한다.

---

## SEC-86. Repository URL Leakage

### 비공개 GitLab·Jira·사내 도메인을 그대로 표시

### 문제

직접 접근되지 않더라도 조직 구조와 기술 환경을 노출한다.

### 개선

콘텐츠 가치에 필요하지 않으면 일반화한다.

---

## SEC-87. Personal Path Leakage

```text
/Users/sangduk/...
/home/hawk/...
```

### 문제

사용자 계정명과 개발 환경이 드러난다.

### 개선

예제 경로로 치환한다.

---

## SEC-88. Real Token in Tutorial

### 설명을 위해 실제 API key 형식 사용

### 문제

샘플과 실 secret을 구분하기 어렵고 자동 scanner에 탐지될 수 있다.

### 개선

명백한 placeholder를 사용한다.

```text
YOUR_GITHUB_TOKEN
example.invalid
```

---

## SEC-89. Secret Redaction by Partial Mask

```text
ghp_abcd********
```

### 문제

token prefix와 길이, 일부 값이 재사용·식별에 도움이 될 수 있다.

### 개선

secret 전체를 placeholder로 교체한다.

---

## SEC-90. Private Draft in Git History

### 공개되지 않게 `draft: true`만 설정

### 문제

공개 repository에는 원본 Markdown이 그대로 보인다.

### 개선

비공개 내용은 공개 저장소에 commit하지 않는다. Draft flag는 사이트 출력 제어이지 접근 통제가 아니다.

---

# J. 보안 운영

## SEC-91. No Security Update Routine

### 취약점 알림이 올 때만 대응

### 개선

정기적으로 다음을 확인한다.

```text
dependency alerts
GitHub Actions versions
외부 integrations
CSP violations
노출된 secrets
도메인 설정
```

---

## SEC-92. Alert Fatigue

### 모든 dependency 경고를 같은 우선순위로 처리

### 개선

```text
브라우저 runtime
빌드 실행
개발 전용
도달 불가능 경로
```

별로 분류한다.

---

## SEC-93. Security Scanner as Proof of Safety

### scanner가 통과했으니 안전하다고 판단

### 문제

권한 설계, 개인정보 흐름, 잘못된 OAuth 구조 같은 문제는 단순 dependency scan으로 잡히지 않는다.

### 개선

자동 검사와 threat modeling을 함께 사용한다.

---

## SEC-94. No Integration Inventory

### 어떤 외부 도메인과 서비스가 연결됐는지 모름

### 개선

```text
Service
Purpose
Loaded on
Data sent
Credentials
Owner
Removal procedure
```

형태의 간단한 목록을 둔다.

---

## SEC-95. No Secret Rotation Plan

### token이 노출됐을 때 무엇을 바꿔야 하는지 모름

### 개선

secret별 위치·권한·회전·폐기 절차를 기록한다.

---

## SEC-96. Incident Means Site Defacement Only

### 화면이 변조돼야 침해라고 생각

실제로는 다음도 incident다.

- 악성 script 삽입
- 광고 계정 오용
- Analytics 데이터 변조
- OAuth token 노출
- content repository 변경
- DNS 변경
- secret 유출

### 개선

탐지·차단·복구 범위를 넓게 정의한다.

---

## SEC-97. No Deployment Provenance

### 어떤 workflow와 dependency로 배포됐는지 모름

### 개선

배포 artifact에 commit SHA, build 시각, 주요 tool version을 기록한다.

---

## SEC-98. Manual Emergency Edit

### 운영 장애 때 생성된 HTML을 직접 수정

### 문제

원본과 운영 상태가 달라지고 다음 배포에서 되돌아간다.

### 개선

항상 원본 저장소에서 수정하고 긴급 rollback 절차를 마련한다.

---

## SEC-99. Security Controls Without Tests

### CSP·redirect·admin 제한을 설정했지만 실제 검증 없음

### 개선

배포 후 자동 검사를 둔다.

```text
HTTPS 강제
security headers
admin route 노출
source map
민감 파일
외부 script 출처
```

---

## SEC-100. Maximum Security Complexity

### 개인 블로그에 기업용 보안 플랫폼 구축

### 문제

보안 설정이 복잡해져 업데이트가 멈추거나 잘못된 정책을 방치하게 된다.

### 개선

위험에 비례한 단순한 방어가 더 적합하다.

```text
공개 사이트는 순수 정적
관리 기능 분리
외부 script 최소화
workflow 최소 권한
secret 없음
dependency 고정
HTTPS 강제
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | OAuth Secret in Static Client | 관리자 기능을 붙일 경우 구조적으로 가장 위험 |
| 2 | Editor Can Modify Workflow Files | 콘텐츠 권한이 코드 실행 권한으로 확대될 수 있음 |
| 3 | Actions Pinned by Mutable Tag | CI 공급망의 기본 점검 항목 |
| 4 | Default Broad Workflow Permissions | build와 deploy 권한 분리 필요 |
| 5 | Write Token in Build Job | 대형 dependency·generator 실행과 고권한 token 분리 |
| 6 | Third-Party Script Accumulation | Giscus·Analytics·AdSense가 누적될 가능성 |
| 7 | No Content Security Policy | 외부 script와 iframe 제어 기반 필요 |
| 8 | Markdown Is Trusted HTML | 자동 import·관리자 편집기 도입 시 중요 |
| 9 | Search Highlight via String Replacement | 클라이언트 검색 구현에서 흔한 XSS 경로 |
| 10 | Untrusted Markdown Executed During Build | TikZ·다이어그램 generator가 있는 구조 |
| 11 | Dependency Archaeology | 실제 용도를 모르는 editor·MDX package 점검 |
| 12 | Privacy Policy Drift | 광고·댓글·분석 기능과 정책 일치 필요 |
| 13 | Internal Log Publication | 기술 글에서 사내 환경 정보 노출 가능성 큼 |
| 14 | Private Draft in Git History | 공개 저장소에서는 Draft도 공개 자료 |
| 15 | Maximum Security Complexity | 블로그보다 보안 플랫폼 개발로 번지지 않게 제한 |

---

# 추천 보안 기준선

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

# 이번 단계의 핵심 결론

정적 블로그의 가장 강한 보안 전략은 기능을 많이 붙인 뒤 복잡한 방어를 추가하는 것이 아니다.

> **공개 사이트는 가능한 한 정적으로 유지하고, 신뢰가 필요한 관리자·OAuth·쓰기 기능을 별도 경계로 분리하는 것**이 가장 효과적이다.

특히 네 사이트에서 위험이 커질 수 있는 지점은 Astro나 Markdown 자체보다 다음이다.

```text
GitHub Actions
외부 JavaScript
콘텐츠 generator
관리자 편집기
GitHub OAuth
공개 저장소의 로그와 초안
```

OWASP도 제3자 JavaScript 제한, CSP 같은 브라우저 방어 기능, dependency 관리가 공격 표면 축소에 중요하다고 안내한다. citeturn392708search34turn392708search39turn392708search44

다음 단계는 **Task 2-9. Observability, Analytics & Experimentation Anti-patterns**다. 방문자 분석, Search Console, Core Web Vitals, 로그, A/B 테스트, AdSense 지표와 블로그 운영 의사결정에서 발생하는 안티패턴을 정리하게 된다.

## 36. assistant

# Task 2-9. Observability, Analytics & Experimentation Anti-patterns

이번에는 다음을 다룬다.

```text
Search Console
Analytics
Core Web Vitals
AdSense 지표
검색 로그
빌드 지표
A/B 테스트
콘텐츠 운영 의사결정
```

핵심 원칙은 하나다.

> 측정은 많이 하는 것이 아니라, 실제 결정을 더 잘 내리게 해야 한다.

---

## O-01. Analytics Without a Question

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

## O-02. Pageview as Success

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

## O-03. Traffic Without Intent

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

## O-04. Sitewide Average Trap

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

## O-05. Bounce Rate Panic

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

## O-06. Time-on-Page as Understanding

### 오래 머물면 잘 읽었다고 판단

### 문제

- 탭을 열어두었을 수 있음
- 이해가 어려워 오래 걸렸을 수 있음
- 코드 복사를 위해 방치했을 수 있음

### 개선

시간은 보조 지표로만 사용한다.

---

## O-07. Scroll Depth as Completion

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

## O-08. Event Everything

### 모든 클릭을 이벤트로 수집

### 문제

- 데이터 비용 증가
- 개인정보 흐름 확대
- 분석이 복잡해짐
- 의미 없는 이벤트가 대부분

### 개선

실제 결정과 연결되는 이벤트만 남긴다.

---

## O-09. Event Naming Drift

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

## O-10. Analytics Schema Without Versioning

### 이벤트 구조를 바꾸지만 변경 시점을 기록하지 않음

### 문제

이전 데이터와 이후 데이터를 같은 기준으로 비교하게 된다.

### 개선

이벤트 버전 또는 배포 시점을 남긴다.

---

# Search Console

## O-11. Impression Obsession

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

## O-12. CTR Without Position Context

### CTR이 낮다고 제목을 즉시 변경

### 문제

평균 순위 20위의 CTR과 2위의 CTR은 비교할 수 없다.

### 개선

순위 구간과 검색어 의도를 함께 본다.

---

## O-13. Average Position Worship

### 평균 순위 한 숫자에 집중

### 문제

서로 다른 검색어·국가·기기·페이지가 섞인다.

### 개선

핵심 검색어군과 대표 페이지 단위로 추적한다.

---

## O-14. Query Chasing

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

## O-15. Zero-Click Misdiagnosis

### 노출은 많은데 클릭이 적으면 무조건 실패

### 가능성

- 검색 결과에서 답이 이미 보임
- 제목이 검색 의도와 다름
- 순위가 낮음
- 다른 페이지가 더 대표적임

원인을 구분해야 한다.

---

## O-16. Index Coverage as a Score

### 색인된 페이지 수가 많을수록 좋다고 생각

### 문제

얕은 태그·아카이브 페이지까지 색인될 수 있다.

### 개선

색인 수보다 **색인할 가치가 있는 페이지가 제대로 색인됐는가**를 본다.

---

## O-17. “Crawled, Not Indexed” Mass Fix

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

## O-18. URL Inspection as a Workflow

### 페이지마다 수동 색인 요청

### 문제

구조적 문제를 수동 요청으로 가린다.

### 개선

내부 링크·Sitemap·canonical·콘텐츠 품질을 먼저 수정한다.

---

## O-19. Search Console Without Change Log

### 제목·구조·canonical 변경 후 기록 없음

### 문제

몇 주 뒤 지표 변화의 원인을 찾기 어렵다.

### 개선

SEO 변경 로그를 유지한다.

---

## O-20. Short Evaluation Window

### 변경 후 며칠만 보고 성공·실패 판단

검색 반영에는 시간이 걸릴 수 있다.

### 개선

변경 규모에 따라 관찰 기간을 정하고 성급한 재변경을 피한다.

---

# Core Web Vitals와 성능

## O-21. Lab Data as Reality

### Lighthouse 결과만으로 실제 사용자 경험을 판단

### 문제

테스트 환경과 실제 기기·네트워크는 다르다.

### 개선

lab data와 field data를 함께 본다.

---

## O-22. Field Data Without Page Type

### 사이트 전체 Core Web Vitals만 확인

### 문제

홈·일반 글·코드가 많은 글·검색 페이지의 병목이 다르다.

### 개선

페이지 유형별로 측정한다.

---

## O-23. Lighthouse 100 Theater

### 100점이 아니면 실패

### 문제

사용자가 체감하지 못하는 미세 최적화에 시간을 쓴다.

### 개선

임계값을 넘은 뒤에는 콘텐츠와 탐색 문제를 우선한다.

---

## O-24. Synthetic Benchmark Drift

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

## O-25. Homepage-Only Performance

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

## O-26. Best-Case Page Benchmark

### 이미지와 코드가 거의 없는 가벼운 글만 테스트

### 개선

최악 또는 상위 95% 복잡도 페이지를 포함한다.

---

## O-27. No Performance Regression Baseline

### 최적화 전 수치가 없음

### 문제

변경이 실제로 좋아졌는지 알 수 없다.

### 개선

배포별 주요 수치를 보존한다.

---

## O-28. Single Run Performance Test

### 한 번의 Lighthouse 결과로 판단

### 문제

네트워크·CPU 노이즈가 크다.

### 개선

여러 번 측정하고 중앙값을 사용한다.

---

## O-29. Bundle Size Without Execution Cost

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

## O-30. Performance Dashboard Without Ownership

### 지표는 있지만 누가 어떤 조건에서 고칠지 없음

### 개선

예산 초과 시 대응 규칙을 정한다.

---

# 내부 검색 관측

## O-31. Search Usage as Success

### 검색 사용률이 높으면 검색이 좋다고 생각

### 반대 가능성

내비게이션이 나빠서 검색에 의존할 수도 있다.

### 개선

검색 사용률과 Topic 탐색 성공률을 함께 본다.

---

## O-32. No-Result Query Ignored

### 결과 없는 검색어를 수집하지 않음

### 개선

개인정보를 최소화하면서 다음을 확인한다.

- 용어 alias 부족
- 한글·영문 차이
- 실제 콘텐츠 공백
- 오타

---

## O-33. Search Query Collection Without Privacy

### 사용자가 입력한 전체 검색어를 외부 Analytics로 전송

### 문제

회사명·오류 메시지·내부 식별자가 들어갈 수 있다.

### 개선

가능하면 집계형으로 처리하거나 로컬 분석을 고려한다.

---

## O-34. Search Click Without Success Signal

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

## O-35. Search Ranking Changed Without Evaluation Set

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

## O-36. Popular Query Bias

### 많이 검색된 주제만 개선

### 문제

희귀하지만 중요한 전문 검색어가 무시된다.

### 개선

빈도와 중요도를 별도로 평가한다.

---

## O-37. Search Metrics Distorted by Author

### 본인이 테스트한 검색이 사용자 데이터에 섞임

### 개선

개발·관리자 트래픽을 제외하거나 별도로 표시한다.

---

## O-38. Search Index Size Without Query Quality

### 인덱스를 줄이는 것만 목표

### 문제

필요한 본문 정보까지 제거할 수 있다.

### 개선

크기와 검색 품질을 함께 평가한다.

---

## O-39. Search Quality by Anecdote

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

## O-40. Zero-Result Auto-Content Generation

### 검색 결과가 없으면 자동으로 새 글 후보 생성

### 문제

노이즈·오타·민감 검색어를 콘텐츠 계획으로 오인할 수 있다.

### 개선

반복 빈도, 기존 글 보완 가능성, 사이트 정체성을 함께 판단한다.

---

# 콘텐츠 성과

## O-41. Every Article Needs Traffic

### 모든 글이 높은 유입을 가져야 한다고 생각

### 문제

Reference·희귀 장애 기록은 트래픽이 적어도 가치가 높을 수 있다.

### 개선

콘텐츠 역할별 성공 기준을 둔다.

---

## O-42. Low Traffic Means Delete

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

## O-43. High Traffic Means Good

### 많이 방문한 글을 무조건 대표 문서로 선정

### 문제

제목이 자극적이거나 넓은 검색어에 우연히 걸렸을 수 있다.

### 개선

정확성·전문성·내부 연결·전환을 함께 본다.

---

## O-44. Traffic-Only Featured Content

### 홈 Featured가 인기순 자동 정렬

### 문제

사이트가 이미 잘되는 주제만 반복 강조한다.

### 개선

편집자 선정과 데이터를 함께 사용한다.

---

## O-45. No Content Cohort Analysis

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

## O-46. New vs Updated Content Confusion

### 신규 글과 기존 글 업데이트 효과를 구분하지 않음

### 개선

두 작업의 성과를 별도로 기록한다.

---

## O-47. No Internal Journey Analysis

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

## O-48. Funnel Thinking for Every Reader

### 블로그를 판매 전환 funnel처럼만 분석

### 문제

기술 지식 사이트의 목표는 학습·문제 해결·신뢰 형성일 수 있다.

### 개선

독자 목적에 맞는 journey를 정의한다.

---

## O-49. Completion Rate Without Content Type

### 모든 글에 같은 완독 기준

### 개선

Reference는 빠른 정보 발견, Guide는 주요 섹션 소비처럼 다르게 본다.

---

## O-50. No Qualitative Feedback

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

# AdSense 측정

## O-51. RPM as the Primary Product Metric

### 광고 수익을 사이트 품질의 대표 지표로 사용

### 문제

광고가 잘 보이는 구조와 좋은 기술 문서 구조는 충돌할 수 있다.

### 개선

수익은 제약 조건 안에서 최적화한다.

---

## O-52. Revenue Without Page-Type Segmentation

### 모든 페이지의 광고 성과를 합쳐 봄

### 문제

긴 Guide와 짧은 Reference의 광고 기회가 다르다.

### 개선

페이지 유형별 수익과 사용자 경험을 분리해서 본다.

---

## O-53. High Revenue, Poor Experience Ignored

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

## O-54. Ad Click Optimization

### 광고 클릭을 늘리는 배치 실험

### 문제

오인 클릭이나 콘텐츠 방해를 유도할 수 있다.

### 개선

광고는 콘텐츠와 명확히 구분하고 클릭이 아니라 장기적인 페이지 경험과 정책 준수를 우선한다.

---

## O-55. Auto Ads as a Black Box

### 자동 광고가 어디에 들어가는지 모름

### 개선

페이지 유형별 실제 삽입 위치를 검토하고 제외 영역을 관리한다.

---

## O-56. Revenue Data Without Traffic Quality

### 수익 증가가 검색 품질 개선 때문인지 광고 밀도 증가 때문인지 모름

### 개선

트래픽·광고 설정·페이지 구조 변경을 구분해서 기록한다.

---

## O-57. Ad Experiment Without Guardrails

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

## O-58. Short-Term Revenue Winner

### 며칠 수익이 높은 배치를 채택

### 문제

요일·트래픽 구성·광고 입찰 변동에 영향을 받는다.

### 개선

충분한 기간과 표본을 확보하고 사용자 경험 지표도 함께 본다.

---

## O-59. AdSense Rejection as Analytics Problem

### 승인 거절 원인을 지표 부족으로 해석

### 문제

실제 문제는 콘텐츠·신뢰·색인·정책일 수 있다.

### 개선

승인 전에는 수익 분석보다 사이트 품질 감사를 우선한다.

---

## O-60. Revenue Attribution to a Single Change

### 허브 페이지 추가 후 수익이 늘었다고 즉시 인과 추론

### 문제

검색 순위, 계절성, 광고 시장 등 다른 변수가 많다.

### 개선

변경 로그와 충분한 관찰 기간을 사용한다.

---

# 실험과 A/B 테스트

## O-61. A/B Test Before Enough Traffic

### 방문자가 적은데 실험부터 시행

### 문제

통계적으로 의미 있는 결과가 나오기 어렵다.

### 개선

저트래픽 사이트에서는 명확한 UX 원칙과 정성 평가가 더 효율적이다.

---

## O-62. Testing Cosmetic Details First

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

## O-63. Multiple Variables in One Experiment

### 홈 구조·제목·광고·색상을 동시에 변경

### 문제

어떤 변화가 결과를 만들었는지 알 수 없다.

### 개선

한 실험에서 핵심 가설 하나만 다룬다.

---

## O-64. No Experiment Hypothesis

### “이게 더 좋아 보인다” 수준

### 개선 예

```text
Topic Hub를 최신 글보다 먼저 노출하면,
신규 방문자의 두 번째 페이지 이동률이 증가할 것이다.
```

---

## O-65. No Primary Metric

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

## O-66. Metric Shopping

### 원하는 결론이 나올 때까지 유리한 지표 선택

### 개선

실험 전에 판단 기준을 기록한다.

---

## O-67. Stopping When It Looks Good

### 중간에 좋은 결과가 나오면 종료

### 문제

초기 변동을 승리로 오인할 수 있다.

### 개선

사전에 기간이나 표본 기준을 정한다.

---

## O-68. Experiment Contamination

### 본인 테스트·봇·개발 트래픽이 실험에 포함

### 개선

가능한 범위에서 제외한다.

---

## O-69. No Segment Analysis

### 전체 평균만 보고 결론

### 문제

모바일에서는 좋아지고 데스크톱에서는 나빠질 수 있다.

### 개선

중요 세그먼트를 사전에 정한다.

---

## O-70. Segment Fishing

### 결과가 나올 때까지 세그먼트를 계속 쪼갬

### 개선

주요 세그먼트만 미리 정의한다.

---

## O-71. Novelty Effect Ignored

### 새 디자인 직후의 반응을 장기 효과로 판단

### 개선

초기와 안정화 기간을 구분한다.

---

## O-72. A/B Test Adds Permanent Complexity

### 실험 코드가 끝난 뒤에도 flag와 분기가 남음

### 개선

승자 결정 후 실험 코드와 이벤트를 제거한다.

---

## O-73. Feature Flag Cemetery

### 과거 실험 flag가 계속 남음

### 개선

flag마다 만료일과 소유 목적을 둔다.

---

## O-74. Experiment Without Accessibility Check

### 클릭률만 개선되면 채택

### 문제

키보드·스크린리더·모션 민감 사용자에게 나빠질 수 있다.

### 개선

접근성은 실험 대상이 아니라 기본 guardrail로 둔다.

---

## O-75. Dark Pattern Experimentation

### 더 많은 클릭을 위해 혼동을 실험

### 문제

광고·뉴스레터·내비게이션 오인 클릭을 유도할 수 있다.

### 개선

사용자 의도가 명확한 실험만 수행한다.

---

# 빌드와 운영 관측

## O-76. Build Time Without Stage Breakdown

### 총 빌드 시간만 기록

### 문제

Shiki, OG, 검색, Markdown 중 어디가 병목인지 모른다.

### 개선

단계별 시간을 측정한다.

---

## O-77. Memory Peak Without Context

### peak RSS 숫자만 확인

### 개선

페이지 수·코드 블록 수·변경량과 함께 기록한다.

---

## O-78. No Artifact Size Tracking

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

## O-79. CI Success Rate Ignored

### 가끔 실패해도 재실행으로 해결

### 문제

flaky build가 정상화된다.

### 개선

실패율과 원인을 추적한다.

---

## O-80. Mean Build Time Only

### 평균만 확인

### 문제

간헐적인 매우 느린 빌드를 숨길 수 있다.

### 개선

median과 p95를 함께 본다.

---

## O-81. No Changed-File Correlation

### 어떤 변경이 빌드 비용을 늘렸는지 모름

### 개선

변경된 글 수·코드 블록·이미지 수와 빌드 시간을 함께 기록한다.

---

## O-82. Tooling Metrics Without Action Threshold

### 수치는 쌓이지만 경고 기준이 없음

### 개선

예:

```text
검색 인덱스 +20% → 검토
build p95 5분 초과 → 이슈
HTML 총량 +15% → diff 확인
```

---

## O-83. Dashboard Graveyard

### 대시보드는 만들었지만 보지 않음

### 개선

정기적으로 확인할 핵심 화면 하나만 유지한다.

---

## O-84. Manual Spreadsheet Metrics

### 지표를 수동 복사

### 문제

지속성이 낮고 오류가 발생한다.

### 개선

가능한 범위에서 자동 수집하되, 복잡한 플랫폼을 새로 만들지는 않는다.

---

## O-85. Observability Platform Before Need

### 개인 블로그에 Grafana·데이터 웨어하우스 구축

### 문제

사이트보다 관측 시스템 유지가 더 커진다.

### 개선

Search Console, 간단한 Analytics, CI artifact 정도로 시작한다.

---

# 개인정보와 데이터 품질

## O-86. Collect Now, Decide Later

### 나중에 쓸 수 있으니 모든 데이터를 저장

### 문제

개인정보 위험과 분석 복잡성이 증가한다.

### 개선

명확한 목적이 없는 데이터는 수집하지 않는다.

---

## O-87. No Data Retention Policy

### 이벤트를 무기한 보존

### 개선

실제 비교에 필요한 기간만 유지한다.

---

## O-88. Raw Query Logging

### 내부 검색어 원문 전체 저장

### 문제

민감한 오류·회사명·내부 정보가 포함될 수 있다.

### 개선

집계·정규화·익명화 가능성을 검토한다.

---

## O-89. Full IP Dependence

### 사용자 구분을 위해 IP에 과도하게 의존

### 개선

필요 최소한의 집계 방식으로 제한한다.

---

## O-90. Author Traffic Pollution

### 본인 방문과 자동화 트래픽이 성과에 포함

### 개선

개발자·봇·preview 트래픽을 가능한 범위에서 제외한다.

---

## O-91. Bot Traffic as Popularity

### 크롤러 방문을 인기 글로 오인

### 개선

사람과 bot traffic을 분리한다.

---

## O-92. Duplicate Pageview After Client Navigation

### ClientRouter 전환에서 pageview가 중복 기록

### 문제

페이지별 트래픽이 과대 계산된다.

### 개선

초기 load와 client navigation tracking을 명확히 분리한다.

---

## O-93. Missing Pageview After Client Navigation

### 반대로 SPA 전환이 Analytics에 기록되지 않음

### 개선

페이지 생명주기를 중앙화하고 테스트한다.

---

## O-94. URL Fragment Cardinality

### heading anchor마다 별도 페이지처럼 수집

### 문제

같은 글이 수많은 경로로 분할된다.

### 개선

분석 URL에서는 fragment를 제거하거나 별도 section event로 처리한다.

---

## O-95. Query Parameter Cardinality

### 검색·필터 parameter 조합이 페이지 차원을 폭증

### 개선

canonical page path와 interaction event를 분리한다.

---

# 의사결정과 조직화

## O-96. Metrics Without Editorial Judgment

### 숫자가 콘텐츠 우선순위를 자동 결정

### 문제

희귀하지만 중요한 전문 글을 제거하게 될 수 있다.

### 개선

데이터는 후보를 제시하고 최종 판단은 콘텐츠 가치와 전략을 포함한다.

---

## O-97. Editorial Judgment Without Metrics

### 반대로 감으로만 결정

### 개선

대표 글 선정, 허브 개선, 검색 품질은 최소한의 데이터를 참고한다.

---

## O-98. No Decision Log

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

## O-99. Constant Optimization

### 매주 구조와 제목을 변경

### 문제

지표가 안정화되기 전에 다시 바뀐다.

### 개선

명확한 개선 주기와 관찰 기간을 둔다.

---

## O-100. Measurement as Product

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

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Analytics Without a Question | 지표 설치보다 개선 질문이 먼저 |
| 2 | Pageview as Success | 기술 글의 문제 해결 가치를 반영하지 못함 |
| 3 | Sitewide Average Trap | Guide·Debug·Reference 성격이 다름 |
| 4 | Query Chasing | 검색어마다 신규 글을 만들면 중복 증가 |
| 5 | Index Coverage as a Score | 얕은 페이지까지 색인하려는 위험 |
| 6 | Homepage-Only Performance | 실제 유입은 장문 글일 가능성이 큼 |
| 7 | Search Usage as Success | 내비게이션 실패 때문에 검색이 늘 수도 있음 |
| 8 | No-Result Query Ignored | alias와 콘텐츠 공백을 찾는 데 유용 |
| 9 | Search Query Collection Without Privacy | 내부 오류·회사명이 포함될 가능성 |
| 10 | Every Article Needs Traffic | 희귀 시스템 글의 장기 가치 보존 필요 |
| 11 | High Traffic Means Good | 대표 글은 전문성과 구조도 봐야 함 |
| 12 | RPM as Primary Product Metric | 광고가 문서 품질을 지배하지 않게 해야 함 |
| 13 | A/B Test Before Enough Traffic | 저트래픽에서는 정성 평가가 더 효율적 |
| 14 | Build Time Without Stage Breakdown | 8GB heap·대량 코드 블록 병목 분석 필요 |
| 15 | Measurement as Product | 블로그보다 관측 플랫폼이 커지는 것을 방지 |

# 추천 최소 관측 체계

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

# 이번 단계의 핵심 결론

분석에서 가장 흔한 실수는 이것이다.

> 측정 가능한 것을 중요한 것으로 착각하는 것.

페이지뷰, 체류시간, RPM은 쉽게 측정되지만 네 블로그의 핵심 가치는 다음에 가깝다.

```text
희귀한 기술 문제를 정확히 설명함
여러 시스템 개념을 연결함
실제 로그와 경험을 남김
다음 학습 경로를 제공함
오래된 지식을 신뢰 가능하게 관리함
```

따라서 관측 체계도 이 가치를 강화하는 수준에서 멈춰야 한다.

## 37. assistant

# Task 2-10. Content Governance & Editorial Workflow Anti-patterns

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

# 출처와 검증

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

# 집필

## G-19. Outline as a Table of Contents Only

### 소제목만 나열하고 논리 구조는 없음

```text
소개
원리
코드
결과
결론
```

### 개선

각 절이 답할 질문을 적는다.

```text
무슨 증상인가
어디까지 정상인가
어떤 가설을 제외했는가
최종 원인은 무엇인가
```

---

## G-20. Introduction Written First and Never Revised

### 초기 예상 범위로 서론을 작성한 뒤 그대로 둠

### 문제

본문이 바뀌었는데 서론은 다른 글을 약속할 수 있다.

### 개선

본문이 완성된 뒤 제목·description·서론을 다시 작성한다.

---

## G-21. Conclusion Written from Memory

### 본문을 다시 검토하지 않고 결론 작성

### 문제

실제 증거보다 강한 주장을 할 수 있다.

### 개선

결론의 각 문장이 본문의 증거와 대응하는지 확인한다.

---

## G-22. Section-by-Section Isolation

### 각 절은 좋지만 서로 논리적으로 이어지지 않음

### 증상

- 절마다 새로운 시작
- 앞 절의 결과가 다음 절에서 사용되지 않음
- 글이 여러 노트의 결합처럼 보임

### 개선

절의 시작과 끝에 인과관계를 만든다.

```text
앞 절에서 확인한 A 때문에 이제 B를 검사한다.
```

---

## G-23. Writing Around Missing Evidence

### 확인하지 못한 부분을 일반 설명으로 채움

### 문제

글이 길지만 핵심 원인이나 결과는 불명확해진다.

### 개선

확인하지 못했다면 그대로 한계로 표시한다.

---

## G-24. Tone Uniformity by Automation

### 문체 검사로 모든 문장을 같은 톤으로 만듦

### 문제

디버깅 기록, 레퍼런스, 에세이가 모두 같은 리듬이 된다.

### 개선

금지할 저정보 문장은 관리하되 콘텐츠 유형별 문체 차이는 허용한다.

---

## G-25. Excessive Personal Narrative

### 기술 문제보다 경험담이 더 길어짐

### 문제

검색 독자가 핵심 내용을 찾기 어렵다.

### 개선

개인 경험은 다음에 기여할 때 사용한다.

```text
문제 발생 맥락
판단 변화
실패 원인
실무적 교훈
```

---

## G-26. No Personal Context at All

### 반대로 실제 경험을 완전히 제거

### 문제

공식 문서 요약처럼 보이고 고유 가치가 약해진다.

### 개선

필요한 범위에서 실제 환경과 판단 과정을 포함한다.

---

## G-27. Emotional Certainty

### 답답함이나 확신이 기술적 단정으로 이어짐

예:

```text
이 설계는 완전히 잘못됐다.
```

### 개선

감정과 기술 판단을 분리하고 조건을 명확히 쓴다.

---

## G-28. Unreviewed Terminology

### 한 글 안에서 용어가 바뀜

```text
device memory
CXL memory
expander memory
far memory
```

### 문제

같은 대상을 말하는지 구분하기 어렵다.

### 개선

첫 등장에 용어 관계를 정의하고 이후 표기를 통일한다.

---

## G-29. Acronym Saturation

### 약어가 지나치게 많음

### 개선

- 첫 등장에 풀네임
- 문맥상 필요 없는 약어 제거
- 용어표는 긴 시리즈에만 제공

---

## G-30. Translation Residue

### 영문 문장을 직역한 어색한 표현

### 문제

전문 용어는 정확하지만 문장의 인과관계가 불명확해질 수 있다.

### 개선

원문 구조보다 한국어 독자의 이해 순서에 맞춰 재구성한다.

---

# 리뷰

## G-31. Proofreading Equals Review

### 맞춤법만 확인하면 리뷰 완료

### 실제 기술 리뷰 항목

```text
사실 정확성
논리 흐름
재현 가능성
버전 일치
출처 대응
적용 한계
내부 중복
```

---

## G-32. Self-Review Immediately After Writing

### 작성 직후 바로 검수

### 문제

내용을 이미 알고 있어 누락을 보지 못한다.

### 개선

가능하면 시간을 두고 다시 읽거나 관점별 검사를 분리한다.

---

## G-33. Review Without Reader Simulation

### 작성자의 지식으로만 읽음

### 개선

다음 독자 관점으로 각각 확인한다.

```text
검색으로 중간 글에 들어온 사람
기본 개념만 아는 사람
실제 문제를 해결하려는 사람
빠른 레퍼런스를 찾는 사람
```

---

## G-34. Review Against Style, Not Purpose

### 템플릿 준수만 확인

### 문제

글이 실제 질문에 답하는지는 놓친다.

### 개선

리뷰의 첫 질문은 이것이어야 한다.

> 이 글은 제목이 약속한 문제를 충분히 해결하는가?

---

## G-35. Technical Claim Without Verification Marker

### 어떤 문장을 확인해야 하는지 리뷰어가 모름

### 개선

초안에서 임시 marker를 사용할 수 있다.

```text
[VERIFY]
[SOURCE]
[MEASURE]
[UNKNOWN]
```

발행 전 모두 제거하거나 한계로 전환한다.

---

## G-36. Review Checklist Inflation

### 체크 항목이 너무 많아 형식적으로 처리

### 개선

필수·권장·특수 유형으로 나눈다.

#### 모든 글 필수

```text
목적
정확성
출처
결론
링크
```

#### 실험 글 추가

```text
환경
baseline
반복
한계
```

---

## G-37. No Regression Review

### 기존 대표 글을 수정하면서 핵심 내용이 사라지는지 확인하지 않음

### 개선

대규모 수정 전후로:

- 주요 결론
- 환경
- 코드
- 내부 링크
- 검색 의도

를 비교한다.

---

## G-38. Link Check as Content Review

### 링크가 모두 살아 있으면 품질이 괜찮다고 판단

### 문제

링크는 유효하지만 실제 주장을 뒷받침하지 않을 수 있다.

### 개선

대표 글의 핵심 출처는 의미 수준으로 검토한다.

---

## G-39. AI Review as Final Authority

### AI가 “문제가 없다”고 하면 발행

### 문제

전문 사양·코드·실험 결과를 잘못 검증할 수 있다.

### 개선

AI는 다음에 활용한다.

```text
누락 후보
문장 불명확성
중복
반론 후보
체크리스트
```

핵심 기술 판단은 원자료와 실행 결과로 확인한다.

---

## G-40. No Adversarial Review

### 결론을 반박하려는 검토가 없음

### 개선

발행 전 다음을 질문한다.

```text
어떤 조건에서 틀리는가
다른 원인이 가능한가
결과를 재현하지 못할 경우는
독자가 오해할 표현은
```

---

# 발행

## G-41. Publish Without a Canonical Role

### 이 글이 사이트에서 어떤 역할인지 정하지 않음

### 문제

발행 후 어디에 연결할지 모른다.

### 개선

발행 전에 하나를 지정한다.

```text
대표 Guide
Concept
Debug Note
Experiment
Reference
Supporting Note
```

---

## G-42. Publish Without Parent Topic

### 상위 주제가 없는 글

### 문제

발행 즉시 고아 문서가 된다.

### 개선

적어도 한 개의 Topic Hub에 연결한다.

---

## G-43. Publish Without Internal Links

### 글을 공개한 뒤 관련 글 연결을 나중으로 미룸

### 문제

대부분 영원히 추가되지 않는다.

### 개선

발행 조건에 다음을 포함한다.

```text
상위 Hub 링크
선행 글 링크
후속 또는 관련 글 링크
```

---

## G-44. Publish Without Search Preview Review

### 실제 검색 결과에서 제목·설명이 어떻게 보일지 확인하지 않음

### 개선

모바일 너비와 일반 검색 snippet 길이에서 제목과 description을 검토한다.

---

## G-45. Publish Without Mobile Review

### 데스크톱만 확인

### 문제

표·코드·다이어그램·목차가 모바일에서 깨질 수 있다.

### 개선

대표 모바일 폭에서 최소 smoke review를 한다.

---

## G-46. Publish Without Production Build

### dev server에서만 확인

### 문제

정적 경로, base URL, generated assets, Sitemap 문제를 놓친다.

### 개선

발행 전 production build 결과를 확인한다.

---

## G-47. Publish Without Content Diff

### 자동화가 metadata·링크를 예상보다 많이 변경

### 개선

발행 전 파일 diff와 생성 manifest diff를 검토한다.

---

## G-48. Publication Date Manipulation

### 업데이트한 글을 새 글처럼 보이게 작성일 변경

### 문제

독자와 검색엔진이 문서 역사를 잘못 이해할 수 있다.

### 개선

게시일은 유지하고 수정일을 별도로 관리한다.

---

## G-49. Bulk Publication Burst

### 짧은 기간에 유사 글을 대량 발행

### 문제

- 독자가 소화하기 어려움
- 홈이 한 주제로 도배
- 자동 생성 인상을 줄 수 있음
- 각 글의 연결·검수가 약해질 수 있음

### 개선

시리즈 허브를 먼저 만들고, 각 글이 완결됐을 때 순차적으로 발행한다.

---

## G-50. Announcement Without Discovery Integration

### 새 글을 SNS에 공유하지만 사이트 내부 구조에는 반영하지 않음

### 개선

외부 홍보보다 Hub, Featured, 내부 링크에 먼저 반영한다.

---

# 업데이트

## G-51. Update Trigger Is Only Age

### 오래됐다는 이유만으로 수정

### 문제

안정적인 개념 문서에 불필요한 작업이 발생한다.

### 개선

업데이트 신호를 다양화한다.

```text
버전 변경
깨진 명령
검색 의도 변화
오류 제보
대표 글 승격
새 실험 결과
```

---

## G-52. Update Means Rewrite

### 기존 글을 전면 재작성

### 문제

고유한 역사와 기존 링크 문맥이 사라질 수 있다.

### 개선

오류 수정, 보강, 구조 개편, 구판 대체를 구분한다.

---

## G-53. Cosmetic Update as Freshness

### 문장이나 날짜만 바꾸고 최신 글처럼 표시

### 문제

실제 기술 검증이 없는데 신선도 신호만 바뀐다.

### 개선

`updated`와 `lastVerified`를 분리한다.

---

## G-54. Update Without Change Summary

### 무엇이 달라졌는지 알 수 없음

### 개선

대표 글은 짧은 변경 내용을 표시한다.

---

## G-55. Update Breaks Incoming Search Intent

### 유입이 많던 내용을 삭제하고 다른 주제로 바꿈

### 문제

같은 URL이 전혀 다른 질문에 답하게 된다.

### 개선

검색 의도가 크게 달라지면 새 글을 만들고 기존 글에서 연결한다.

---

## G-56. New Version Replaces Historical Evidence

### 최신 버전 설명으로 과거 동작을 모두 덮어씀

### 문제

오래된 환경을 유지하는 독자와 기술 변천 기록에 불리하다.

### 개선

구판을 Historical로 유지하거나 버전별 차이를 별도 절로 보존한다.

---

## G-57. New Findings Not Propagated

### 대표 글은 수정했지만 관련 글은 이전 설명 유지

### 문제

사이트 내부에 서로 충돌하는 주장이 생긴다.

### 개선

콘텐츠 그래프에서 영향을 받는 글 후보를 찾는다.

---

## G-58. Update Only High-Traffic Pages

### 인기 없는 글은 계속 방치

### 문제

핵심 선행 개념이나 희귀 장애 글의 오류가 남는다.

### 개선

트래픽과 구조적 중요성을 함께 본다.

---

## G-59. Update Without Rechecking Links

### 본문을 바꾸면서 관련 링크 의미가 달라짐

### 개선

수정한 절 주변의 내부·외부 링크를 다시 검토한다.

---

## G-60. Perpetual Needs Review

### `needs-review` 상태만 늘어남

### 문제

상태가 경고가 아니라 무시되는 기본값이 된다.

### 개선

상태별 처리 기한과 우선순위를 둔다.

---

# 통합과 폐기

## G-61. Merge by Length Alone

### 짧은 글은 무조건 합침

### 문제

짧지만 독립적인 오류 해결·Reference 가치를 잃을 수 있다.

### 개선

길이가 아니라 검색 의도와 고유 정보로 판단한다.

---

## G-62. Merge Without Information Mapping

### 두 글을 단순 복사·붙여넣기

### 문제

중복 설명과 충돌하는 결론이 남는다.

### 개선

통합 전에 다음을 표로 정리한다.

```text
공통 내용
고유 내용
충돌 내용
유지할 URL
redirect 대상
```

---

## G-63. Delete Without Replacement Analysis

### 낮은 트래픽이라는 이유로 삭제

### 문제

외부 링크, 선행 개념, 검색 유입이 끊길 수 있다.

### 개선

삭제 전:

- inbound link
- external backlink
- 검색 유입
- 상위 Hub 의존성
- 대체 문서

를 확인한다.

---

## G-64. Redirect Everything to Homepage

### 삭제 글을 홈으로 전환

### 문제

사용자가 기대한 정보와 전혀 다른 페이지로 이동한다.

### 개선

가장 가까운 대체 문서로 redirect하고 없으면 명확한 404가 낫다.

---

## G-65. Superseded but Still Featured

### 폐기된 글이 홈·검색·허브에 계속 대표로 노출

### 개선

상태 변경 시 다음을 함께 갱신한다.

```text
Featured
Hub
Internal links
Search boost
Sitemap
```

---

## G-66. Historical Content Hidden

### 오래됐다는 이유로 가치 있는 기록을 완전히 숨김

### 문제

버전별 동작과 시스템 변화 기록을 잃는다.

### 개선

Historical 상태로 유지하되 최신 문서와 명확히 연결한다.

---

## G-67. No Tombstone Page

### 중요한 글을 삭제하고 URL만 사라짐

### 개선

외부 참조가 많은 문서는 짧은 대체 안내 페이지를 유지할 수 있다.

---

## G-68. Duplicate Content Kept for Sentiment

### 애착 때문에 유사 글을 모두 유지

### 문제

사이트 구조와 검색 의도가 계속 분열된다.

### 개선

원문은 Git history에 남아 있으므로 공개 사이트에서는 최선의 문서 구조를 우선한다.

---

## G-69. Content Retirement Without Link Cleanup

### redirect는 있지만 내부 링크는 모두 구주소

### 개선

내부 링크는 최종 문서로 직접 수정한다.

---

## G-70. No Retirement Record

### 왜 글을 합치거나 폐기했는지 모름

### 개선

간단한 콘텐츠 결정 로그를 남긴다.

---

# AI 활용

## G-71. AI Topic Factory

### AI로 주제 목록을 대량 생성

### 문제

사이트 정체성, 기존 중복, 직접 경험을 고려하지 않은 아이디어가 늘어난다.

### 개선

AI는 기존 Topic 지도 안의 공백을 찾는 데 사용한다.

---

## G-72. AI Outline Determines the Argument

### AI가 만든 목차를 그대로 사용

### 문제

일반적인 서론–장점–단점–결론 구조가 반복된다.

### 개선

먼저 핵심 질문과 실제 증거를 정한 뒤 AI로 누락을 검토한다.

---

## G-73. AI Fills Unknowns

### 확인하지 못한 기술 내용을 AI 문장으로 연결

### 문제

그럴듯한 허위 내용이 들어갈 수 있다.

### 개선

모르는 부분은 `[UNKNOWN]`으로 남기고 원자료나 실험으로 확인한다.

---

## G-74. AI Citation Hallucination

### AI가 제시한 문서·절 번호를 그대로 사용

### 개선

모든 인용은 실제 원문에서 확인한다.

---

## G-75. AI Makes Every Article Complete

### 짧은 메모에도 서론·배경·결론을 자동 추가

### 문제

정보량은 같지만 분량과 일반 문장이 증가한다.

### 개선

Reference나 짧은 Debug Note는 짧고 직접적으로 유지한다.

---

## G-76. AI Removes Authorial Uncertainty

### “가능성이 있다”를 확정 표현으로 바꿈

### 문제

가설과 관찰의 경계가 사라진다.

### 개선

불확실성 표시는 기술적 정확성의 일부로 보존한다.

---

## G-77. AI Normalizes Specialized Terminology

### 정확한 도메인 표현을 일반어로 바꿈

### 문제

읽기 쉬워지지만 기술적 의미가 달라질 수 있다.

### 개선

용어 정확성을 우선하고 필요한 경우 별도 설명을 붙인다.

---

## G-78. AI Rewrite Erases Failure History

### 실패 과정과 시행착오를 깔끔한 성공 서사로 재작성

### 문제

실무적 고유 가치가 사라진다.

### 개선

실패한 가설과 판단 과정은 의도적으로 유지한다.

---

## G-79. AI Review Confirms Existing Bias

### 원하는 결론을 담은 초안을 AI에게 검토 요청

### 문제

AI가 대체로 초안의 프레임 안에서 답한다.

### 개선

반대 입장 검토를 별도로 요청하고 원자료로 판단한다.

---

## G-80. No AI Usage Boundary

### 어떤 작업을 AI에게 맡길지 기준 없음

### 권장 경계

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

# 운영 우선순위

## G-81. New Article Bias

### 새 글만 성과로 인정

### 개선

콘텐츠 운영 결과를 다음처럼 함께 관리한다.

```text
신규
업데이트
통합
폐기
허브
내부 링크
검증
```

---

## G-82. Visible Work Bias

### 홈 디자인이나 새 글처럼 눈에 보이는 작업만 우선

### 문제

스키마·redirect·상태 정리 같은 기반 작업이 계속 미뤄진다.

### 개선

독자에게 직접 보이지 않더라도 장기 가치가 큰 작업에 시간을 배정한다.

---

## G-83. Easy Fix Queue Dominance

### 간단한 오탈자와 metadata만 계속 처리

### 문제

대표 문서 재구성처럼 어려운 작업이 미뤄진다.

### 개선

작은 작업과 큰 작업을 별도 queue로 관리한다.

---

## G-84. Everything Is P0

### 모든 문제가 긴급

### 개선

콘텐츠 위험을 다음처럼 나눈다.

```text
P0: 잘못된 기술 정보·보안·깨진 핵심 경로
P1: 대표 글·허브·중복
P2: 일반 최신성·UX
P3: 미관·선택 기능
```

---

## G-85. No Editorial Roadmap

### 기술 로드맵은 있지만 콘텐츠 로드맵 없음

### 개선

분기별로 다음을 정한다.

```text
강화할 Topic
대표 Guide
통합 대상
검증 대상
새 실험
```

---

## G-86. Roadmap as a Promise

### 공개 로드맵의 모든 글을 작성해야 한다고 느낌

### 문제

우선순위가 바뀌어도 계획을 유지하게 된다.

### 개선

로드맵은 방향이지 계약이 아니며 정기적으로 폐기·통합한다.

---

## G-87. No Capacity for Maintenance

### 작성 시간 전부 신규 글에 사용

### 개선

예를 들어 다음처럼 명시적으로 배분한다.

```text
신규 40%
업데이트 30%
구조화 20%
도구·운영 10%
```

정확한 비율보다 유지보수 시간을 확보하는 것이 중요하다.

---

## G-88. Tooling Work Disguised as Editorial Work

### 글을 쓰기 위해 에디터·추천 시스템부터 개발

### 문제

콘텐츠 개선이 시작되지 않는다.

### 개선

수동 작업에서 실제 병목이 반복되는지 먼저 확인한다.

---

## G-89. No Stop Condition

### 대표 글 개선을 무한히 계속

### 문제

한 글에 과도한 시간을 쓰고 다른 구조 문제를 놓친다.

### 개선

완료 조건을 정한다.

```text
목적 명확
근거 확인
환경 표시
내부 링크
모바일 확인
상태 지정
```

---

## G-90. Perfection Blocks Publication

### 모든 내용을 완벽히 확인할 때까지 발행하지 않음

### 문제

유용한 검증 결과도 오래 비공개 상태로 남는다.

### 개선

불확실성과 한계를 명시하고 현재 확인한 범위까지 발행할 수 있다.

---

# 품질 모델

## G-91. Single Quality Score

### 모든 글을 하나의 점수로 평가

### 문제

Reference와 Guide가 같은 기준으로 비교된다.

### 개선

품질을 여러 축으로 본다.

```text
정확성
독창성
재현성
완결성
탐색 연결
최신성
```

---

## G-92. Checklist Completion Equals Quality

### 항목을 모두 채우면 좋은 글

### 문제

형식은 완벽하지만 핵심 통찰이 없을 수 있다.

### 개선

체크리스트는 최소 품질 보장용이며 콘텐츠 가치는 별도 판단한다.

---

## G-93. Readability Over Accuracy

### 쉽게 쓰기 위해 중요한 조건을 제거

### 개선

조건을 삭제하지 말고 계층적으로 설명한다.

```text
핵심 요약
정확한 상세
예외와 한계
```

---

## G-94. Accuracy Over Usability

### 모든 조건과 예외를 본문 첫 부분에 넣음

### 문제

정확하지만 읽기 어려운 사양서가 된다.

### 개선

기본 모델을 먼저 설명하고 세부 예외를 별도 절로 분리한다.

---

## G-95. Originality Means Never Explaining Basics

### 독창성을 위해 배경 설명을 완전히 제거

### 문제

글이 독립적으로 이해되지 않는다.

### 개선

필요한 최소 배경은 제공하되, 일반 설명이 핵심 콘텐츠를 압도하지 않게 한다.

---

## G-96. Evergreen as a Requirement

### 모든 글이 영구적으로 유효해야 한다고 생각

### 문제

릴리스 분석, 장애 기록, 역사적 문서도 가치가 있다.

### 개선

Evergreen, Versioned, Historical 콘텐츠를 구분한다.

---

## G-97. Every Article Must Be Comprehensive

### 모든 글이 완전한 교과서여야 함

### 문제

짧고 정확한 Reference와 Debug Note의 장점을 잃는다.

### 개선

콘텐츠 타입별 충분함의 기준을 다르게 둔다.

---

## G-98. Every Article Must Be Searchable Alone

### 내부 문맥 없이도 모든 글이 완전히 독립적이어야 함

### 문제

배경 설명 중복이 증가한다.

### 개선

최소 독립성을 유지하면서 Hub·선행 문서 연결을 활용한다.

---

## G-99. No Editorial Principles

### 개별 판단이 매번 달라짐

### 개선

짧은 원칙을 정한다.

```text
직접 확인한 것을 우선한다
가설은 가설로 표시한다
중복 글보다 대표 문서를 강화한다
버전과 환경을 숨기지 않는다
모르는 것은 모른다고 쓴다
```

---

## G-100. Editorial System Becomes the Product

### 콘텐츠 운영 체계 자체를 계속 설계

### 문제

가이드, 점수표, 자동화, 대시보드는 완성되지만 실제 핵심 글은 개선되지 않는다.

### 개선

운영 체계는 다음 세 작업을 빠르게 만들면 충분하다.

```text
좋은 글을 발행
기존 글을 신뢰 가능하게 유지
필요 없는 글을 정리
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Topic Impulse Publishing | 주제 범위가 넓어 콘텐츠 분산 가능성이 큼 |
| 2 | SEO Query Becomes Editorial Strategy | 애드센스 대응 중 검색어별 글 증가 위험 |
| 3 | Bulk Publication Burst | 비슷한 시스템 글의 연속 발행이 자동 생성 인상을 줄 수 있음 |
| 4 | Research Without a Question | 규격·소스 조사 글이 자료 모음으로 변할 수 있음 |
| 5 | Source Collection Without Hierarchy | 사양·소스·커뮤니티 근거를 구분해야 함 |
| 6 | Introduction Written First and Never Revised | 실제 본문과 제목·description 불일치 가능 |
| 7 | Proofreading Equals Review | 고급 기술 글은 사실·버전·재현성 검토가 핵심 |
| 8 | AI Review as Final Authority | CXL·PCIe·CUDA 세부 동작 검증에는 한계 |
| 9 | Publish Without Parent Topic | 새 글이 즉시 고아 문서가 되는 것을 방지 |
| 10 | Cosmetic Update as Freshness | 애드센스 대응 중 형식적 업데이트 방지 |
| 11 | New Findings Not Propagated | 여러 연관 글 사이 기술적 충돌 방지 |
| 12 | Merge by Length Alone | 짧지만 희귀한 Debug·Reference 글 보존 필요 |
| 13 | Bulk AI Refresh | 기존 고유 경험과 문체 손실 위험 |
| 14 | New Article Bias | 신규 작성보다 기존 대표 글 강화가 현재 우선 |
| 15 | Editorial System Becomes the Product | 블로그보다 관리 시스템이 커지는 것을 방지 |

# 추천 최소 편집 흐름

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

# 이번 단계의 핵심 결론

기술 블로그 운영에서 가장 위험한 패턴은 글을 적게 쓰는 것이 아니다.

> **새 글을 계속 추가하면서 기존 지식의 관계·정확성·대표성을 관리하지 않는 것**이 더 큰 문제다.

현재 `hawk90.github.io`에는 신규 생산보다 다음 편집 작업의 수익률이 더 높을 가능성이 크다.

```text
대표 글 선정
유사 글 통합
실제 경험 강화
출처 계층화
Topic Hub 연결
수정일과 검증일 분리
구판 상태 표시
```

다음 단계는 **Task 2-11. Internationalization, Localization & Technical Terminology Anti-patterns**로 이어갈 수 있다. 한글·영문 기술 용어, 번역 글, URL, 검색 alias, 코드·수식·표기 일관성 문제를 정리하는 단계다.

## 38. assistant

# Task 2-11. Internationalization, Localization & Technical Terminology Anti-patterns

이번에는 **한글·영문 기술 용어, 번역, URL, 검색 alias, 코드·수식·표기 일관성**을 다룬다.

`hawk90.github.io`처럼 한국어 설명 안에 C++, CUDA, PCIe, CXL, Linux, UEFI 같은 영문 기술 용어가 많이 섞이는 블로그에서는 이 영역이 검색·가독성·정확성에 직접 영향을 준다.

---

## L-01. Korean–English Term Drift

### 같은 개념을 여러 방식으로 표기

```text
메모리 일관성
캐시 일관성
cache coherence
coherency
```

### 문제

- 검색 결과가 분산됨
- 독자가 같은 개념인지 헷갈림
- 글마다 용어가 달라짐

### 개선

대표 표기를 정한다.

```text
첫 등장:
캐시 일관성(cache coherence)

이후:
캐시 일관성
```

---

## L-02. Acronym-Only Writing

### 약어만 사용

```text
RC가 ECAM을 통해 BDF를 스캔하고 BAR를 할당한다.
```

### 문제

전문 독자라도 문맥이 바뀌면 읽기 어렵다.

### 개선

첫 등장에 풀네임을 제공한다.

```text
Root Complex(RC)
Enhanced Configuration Access Mechanism(ECAM)
Bus/Device/Function(BDF)
```

---

## L-03. Full Name Every Time

### 반대로 매번 풀네임 반복

### 문제

문장이 지나치게 길고 기술 글의 밀도가 떨어진다.

### 개선

첫 등장 이후 약어를 사용한다.

---

## L-04. Inconsistent Acronym Expansion

### 글마다 약어 풀이가 다름

예:

```text
DMA = Direct Memory Access
DMA = Direct Memory Access Engine
```

### 문제

개념과 구현체가 혼동된다.

### 개선

용어집 또는 중앙 terminology registry를 둔다.

---

## L-05. Translation by Sound

### 의미보다 발음대로 옮김

```text
코히어런시
이뉴머레이션
프로비저닝
```

### 문제

한글 독자에게도 의미가 직관적이지 않고 검색어가 분산된다.

### 개선

일반적으로 통용되는 번역이 있으면 번역어를 우선하고 영문을 병기한다.

```text
열거(enumeration)
일관성(coherence)
프로비저닝(provisioning)
```

단, 업계에서 영문 음역이 더 널리 쓰이면 무리하게 번역하지 않는다.

---

## L-06. Translation by Dictionary

### 문맥 없이 사전 뜻을 적용

예:

```text
memory ordering → 메모리 정렬
```

실제로는 문맥상 `메모리 순서` 또는 `메모리 순서 보장`에 가깝다.

### 개선

도메인 문맥을 기준으로 번역한다.

---

## L-07. Over-Translation

### 고유 기술명을 억지로 번역

```text
Root Complex → 뿌리 복합체
```

### 문제

검색성과 정확성이 모두 떨어진다.

### 개선

고유 명칭은 원어를 유지하고 필요한 경우 의미만 설명한다.

---

## L-08. Under-Translation

### 모든 설명을 영문 용어로만 작성

```text
The device performs enumeration and resource allocation.
```

### 문제

한국어 본문 안에서 읽기 흐름이 끊긴다.

### 개선

핵심 용어는 영문을 유지하되 문장 구조는 자연스러운 한국어로 작성한다.

---

## L-09. Half-Translated Phrase

### 한글과 영문이 어색하게 섞임

```text
이 단계에서 resource allocation을 수행한다.
```

### 개선

둘 중 하나로 정리한다.

```text
이 단계에서 리소스를 할당한다.
```

또는 정확한 용어가 중요하면:

```text
이 단계에서 리소스 할당(resource allocation)을 수행한다.
```

---

## L-10. English Noun Chain in Korean

### 영문 명사를 연속해서 붙임

```text
CXL Host Memory Device Decoder Configuration Flow
```

### 문제

한국어 독자가 문법 관계를 파악하기 어렵다.

### 개선

관계를 풀어 쓴다.

```text
CXL 호스트가 메모리 장치의 HDM Decoder를 설정하는 과정
```

---

# 검색과 alias

## L-11. No Search Alias

### 표기가 다르면 검색되지 않음

```text
MSI-X
MSIX
MSI X
```

### 개선

검색 alias를 관리한다.

```yaml
canonical: msi-x
aliases:
  - msix
  - msi x
```

---

## L-12. Korean–English Search Split

### 한글과 영문 검색이 별개

```text
주소 변환
address translation
```

### 개선

Topic metadata에 양쪽 표현을 함께 둔다.

---

## L-13. Transliteration Search Failure

### 음역어와 원어가 연결되지 않음

```text
코히어런시
coherency
coherence
```

### 개선

검색 정규화에서 동의어를 연결한다.

---

## L-14. Symbol Search Failure

### 특수문자 때문에 검색 실패

```text
C++
C#
MSI-X
x86-64
```

### 문제

검색 tokenizer가 `+`, `#`, `-`를 제거할 수 있다.

### 개선

기술 토큰을 위한 별도 정규화 규칙을 둔다.

---

## L-15. Case-Sensitive Technical Search

### 대소문자가 다르면 검색되지 않음

```text
CUDA
cuda
Cuda
```

### 개선

검색은 대소문자를 정규화하되 화면 표기는 canonical form을 유지한다.

---

## L-16. Version Search Ambiguity

### 버전 검색이 일반 숫자와 섞임

```text
C++20
CUDA 12.4
Linux 6.12
```

### 개선

버전 정보를 별도 metadata로 색인한다.

---

## L-17. Alias Explosion

### 모든 표기 변형을 수동 등록

### 문제

alias registry가 과도하게 커지고 중복된다.

### 개선

다음을 분리한다.

```text
규칙 기반 정규화
명시적 기술 동의어
오타 보정
```

---

## L-18. Search Alias Changes Display Text

### 검색 정규화를 위해 원문까지 변환

### 문제

표준 표기와 코드 identifier가 훼손된다.

### 개선

검색용 normalized field와 화면 표시값을 분리한다.

---

# URL과 slug

## L-19. Korean Slug Everywhere

### 모든 URL을 한글로 생성

### 장점

- 제목과 직관적으로 대응

### 문제

- URL 인코딩 시 길어짐
- 공유할 때 읽기 어려움
- 일부 도구에서 처리 불편
- 제목 변경 시 slug 변경 유혹

### 개선

안정적이고 짧은 slug 정책을 정한다.

```text
/pcie-bar-sizing/
/cxl-hdm-decoder/
```

---

## L-20. English Slug Without Meaning

### 영문 slug가 지나치게 축약됨

```text
/cxl-init-2/
/mem-topo-v3/
```

### 문제

시간이 지나면 의미를 알기 어렵다.

### 개선

짧지만 검색 의도가 드러나는 slug를 사용한다.

---

## L-21. Translated Slug Drift

### 제목 번역이 바뀔 때 URL도 변경

### 문제

외부 링크와 색인이 깨진다.

### 개선

slug는 최초 확정 후 안정적으로 유지한다.

---

## L-22. Mixed Slug Policy

```text
/cpp-memory/
/리눅스-스케줄러/
/2026/cxl-init/
```

### 문제

URL 체계가 일관되지 않는다.

### 개선

신규 글부터 하나의 정책을 적용한다. 기존 URL은 무리하게 일괄 변경하지 않는다.

---

## L-23. Acronym-Only Slug

```text
/ats-pri-pasid/
```

### 문제

전문가에게는 명확하지만 일반 검색·공유에서는 의미가 약하다.

### 개선

필요하면 핵심 의미를 추가한다.

```text
/pcie-ats-pri-pasid-address-translation/
```

다만 너무 길게 만들지는 않는다.

---

## L-24. Locale Prefix Without Multilingual Content

```text
/ko/
/en/
```

를 도입했지만 실제로 한 언어만 운영한다.

### 문제

경로만 복잡해진다.

### 개선

실제 다국어 운영 계획이 있을 때만 locale prefix를 도입한다.

---

## L-25. Duplicate Language URLs

### 동일 콘텐츠를 `/ko/post`와 `/post`에서 모두 제공

### 문제

중복 URL이 생긴다.

### 개선

locale별 canonical과 redirect 정책을 명확히 한다.

---

# 번역 콘텐츠

## L-26. Translation as Duplicate Publication

### 한국어 글을 그대로 영어로 기계 번역해 발행

### 문제

- 오류 가능성
- 문체 부자연스러움
- 유지보수 두 배
- 원문 업데이트가 번역에 반영되지 않음

### 개선

실제로 영어 독자가 읽을 가치가 높은 대표 글부터 선별한다.

---

## L-27. Asymmetric Translation

### 한국어판과 영어판 내용이 크게 다름

### 문제

번역 관계인지 별도 문서인지 불명확하다.

### 개선

다음 중 하나를 명확히 한다.

```text
완전 번역
요약 번역
영문 독자를 위한 별도 재작성
```

---

## L-28. Translation Lag

### 원문은 수정됐지만 번역은 오래된 상태

### 개선

번역 metadata에 source revision을 기록한다.

```yaml
translatedFrom:
sourceUpdatedAt:
translationStatus:
```

---

## L-29. Translation Without Technical Review

### 언어만 자연스럽게 다듬고 기술 용어 검증은 없음

### 문제

전문 용어와 인과관계가 틀릴 수 있다.

### 개선

번역 후 기술적 의미를 원문과 대조한다.

---

## L-30. Machine Translation of Code Comments

### 코드 주석까지 자동 번역

### 문제

identifier·API 이름·용어가 변형될 수 있다.

### 개선

코드는 원문을 유지하고 필요하면 코드 아래에서 설명한다.

---

## L-31. Translated Error Messages

### 실제 오류 메시지를 한글로 번역

### 문제

독자가 원문 오류를 검색할 수 없다.

### 개선

원문을 먼저 제시하고 한국어 설명을 덧붙인다.

```text
"device not found"

장치를 찾지 못했다는 의미다.
```

---

## L-32. Translated Command Output

### 터미널 출력을 번역

### 문제

실제 환경과 비교할 수 없다.

### 개선

출력은 원문 그대로 유지하고 해석만 번역한다.

---

## L-33. Translation Without `hreflang`

### 실제 번역 페이지가 있지만 관계 표시 없음

### 문제

적절한 언어 페이지 선택과 중복 관리가 어려워진다.

### 개선

언어별 URL 관계와 canonical 정책을 일관되게 관리한다.

---

## L-34. Canonical All Translations to One Language

### 영어판을 한국어판 canonical로 지정

### 문제

실제 번역 페이지가 독립적인 언어 콘텐츠라면 색인 신호가 잘못될 수 있다.

### 개선

각 언어 페이지는 일반적으로 자기 canonical을 갖고 상호 언어 연결을 둔다.

---

## L-35. Partial Translation Presented as Complete

### 일부 절만 번역됐지만 완전한 번역처럼 보임

### 개선

번역 상태를 표시한다.

```text
전체 번역
요약본
번역 진행 중
```

---

# 기술 용어 관리

## L-36. No Terminology Registry

### 용어 결정이 글마다 달라짐

### 개선

작은 glossary 또는 YAML registry를 둔다.

```yaml
canonical: cache coherence
ko: 캐시 일관성
aliases:
  - coherence
  - coherency
notes: CXL 문맥에서는 protocol 명칭을 원문 유지
```

---

## L-37. Glossary as a Dictionary Dump

### 용어집이 단순 단어 목록

### 문제

실제 문맥과 관계가 보이지 않는다.

### 개선

각 용어에 다음을 포함한다.

```text
짧은 정의
상위 개념
관련 용어
대표 글
주의할 오해
```

---

## L-38. Glossary Duplicates Articles

### 개념 글 전체를 용어집에 복사

### 개선

용어집은 짧은 설명과 대표 Concept 링크만 제공한다.

---

## L-39. Terminology Change Without Migration

### 표준 용어를 바꿨지만 과거 글은 그대로

### 문제

검색과 내부 일관성이 깨진다.

### 개선

- 화면 표기 migration
- alias 유지
- redirect가 필요한 URL 확인
- 변경 기록

을 함께 처리한다.

---

## L-40. One Korean Translation per English Term

### 모든 문맥에서 동일 번역 사용

예:

```text
context → 문맥
context → 실행 컨텍스트
context → GPU context
```

### 문제

도메인에 따라 뜻이 달라진다.

### 개선

용어를 문맥별로 정의한다.

---

## L-41. Same Korean Word for Distinct Terms

예:

```text
consistency
coherence
```

를 모두 `일관성`으로 번역.

### 문제

기술적 차이가 사라진다.

### 개선

필요하면 영문을 병기하고 개념 차이를 설명한다.

---

## L-42. Coherence–Consistency Collapse

### 캐시 일관성과 데이터 일관성을 같은 표현으로 처리

### 문제

메모리 모델과 분산 시스템 의미가 뒤섞인다.

### 개선

도메인별 canonical translation을 정한다.

---

## L-43. Ordering–Order Confusion

### `memory ordering`, `execution order`, `byte order`를 비슷하게 번역

### 개선

```text
memory ordering → 메모리 순서 보장
execution order → 실행 순서
byte order → 바이트 순서
```

처럼 문맥을 구분한다.

---

## L-44. Translation Hides Specification Terms

### 사양에 있는 정확한 이름을 번역만 제공

### 문제

원문 문서에서 해당 용어를 찾기 어렵다.

### 개선

사양 용어는 첫 등장에 원문을 병기한다.

---

## L-45. Vendor Terminology Normalization

### 업체 고유 명칭을 일반 용어로 바꿈

### 문제

문서·도구에서 정확한 이름을 찾기 어려워진다.

### 개선

제품명·API·레지스터 이름은 원문을 유지한다.

---

# 코드와 식별자

## L-46. Translating Identifiers

### 함수명·구조체명 의미를 본문에서 번역 이름으로만 표현

### 문제

소스 검색이 어렵다.

### 개선

identifier는 원문을 유지한다.

```text
`pci_bus_read_config_dword()` 함수는...
```

---

## L-47. Identifier Formatting Drift

### 같은 identifier를 일반 텍스트와 inline code로 혼용

### 개선

함수·타입·매크로·파일 경로는 일관되게 inline code로 표시한다.

---

## L-48. Code Comments Language Switching

### 한 코드 블록 안에서 한글·영문 주석이 무작위로 섞임

### 문제

공유성과 가독성이 떨어질 수 있다.

### 개선

예제의 대상 독자에 맞춰 한 언어를 기본으로 하고 필요한 용어만 병기한다.

---

## L-49. Korean Identifier Examples

### 실제 코드에 한글 변수명을 사용

### 문제

가능은 하지만 독자가 일반 코드베이스에 적용하기 어렵고 일부 도구 호환성 문제가 생길 수 있다.

### 개선

코드는 업계 관행에 맞는 영문 identifier를 사용하고 설명은 한국어로 한다.

---

## L-50. Translated File Names

### 실제 파일명을 한국어로 바꿔 설명

### 문제

저장소에서 찾을 수 없다.

### 개선

실제 파일명은 원문 그대로 표시한다.

---

## L-51. Error Code Localization

### 오류 코드 이름까지 번역

```text
-ENOMEM → 메모리 없음 오류
```

설명은 가능하지만 실제 코드 표기를 숨기면 안 된다.

### 개선

```text
`-ENOMEM`은 메모리 할당 실패를 의미한다.
```

---

## L-52. Case Normalization of Identifiers

### 문장 스타일에 맞춰 API 대소문자를 바꿈

```text
CMake → Cmake
GitHub → Github
```

### 개선

공식 표기를 유지한다.

---

# 제목과 메타데이터

## L-53. Bilingual Title Overload

```text
PCIe BAR 크기 탐색(Size Probing)과 주소 할당(Address Allocation) 완전 정리
```

### 문제

제목이 너무 길어진다.

### 개선

제목은 주 언어 중심으로 쓰고 영문 용어는 description이나 본문 첫 등장에 둔다.

---

## L-54. English Title, Korean Body

### 제목은 검색을 위해 영어, 본문은 한국어

### 문제

독자 기대와 실제 언어가 다를 수 있다.

### 개선

주요 독자 언어에 맞춘 제목을 사용하고 영문 키워드는 자연스럽게 포함한다.

---

## L-55. Korean Title Without Searchable English Term

```text
주소 공간 할당 과정
```

### 문제

`PCIe BAR allocation`을 찾는 사용자가 글을 발견하기 어렵다.

### 개선

핵심 고유 용어는 제목이나 description에 포함한다.

```text
PCIe BAR 주소 공간은 어떻게 할당되는가
```

---

## L-56. Meta Description Language Mismatch

### 한국어 페이지의 description이 영어

### 문제

검색 결과 경험이 불일치한다.

### 개선

페이지 주 언어와 meta description 언어를 맞춘다.

---

## L-57. Mixed-Language Open Graph

### OG 제목·설명·이미지의 언어가 서로 다름

### 개선

페이지 locale에 따라 생성물을 일관되게 만든다.

---

## L-58. Locale-Free Dates

### 날짜가 언어와 무관한 형식으로 제각각 표시

```text
08/01/2026
2026.08.01
August 1, 2026
```

### 개선

페이지 언어와 지역 관례에 맞는 표시를 사용하되 machine-readable date는 표준 형식으로 유지한다.

---

## L-59. Localized Slug and Canonical Mismatch

### 화면 언어는 한국어인데 canonical이 다른 locale URL을 가리킴

### 개선

locale별 canonical 정책을 자동 검증한다.

---

# 문장과 문체

## L-60. Subject Omission Ambiguity

### 한국어에서 주어를 계속 생략

기술 글에서는 `호스트`, `장치`, `드라이버`, `펌웨어` 중 누가 동작하는지 모호해질 수 있다.

### 개선

행위 주체가 바뀔 때는 명시한다.

---

## L-61. Pronoun Ambiguity

```text
이것이 이를 초기화한다.
```

### 문제

어떤 객체를 의미하는지 불분명하다.

### 개선

기술 대상의 이름을 반복하는 편이 더 낫다.

---

## L-62. Passive Voice Import

### 영문 수동태를 그대로 옮김

```text
이 값은 펌웨어에 의해 설정된다.
```

### 개선

행위 주체가 중요하면 능동형으로 쓴다.

```text
펌웨어가 이 값을 설정한다.
```

---

## L-63. Nominalization Overload

### 명사형 표현이 연속됨

```text
설정 수행을 통한 초기화 진행
```

### 개선

동사 중심으로 쓴다.

```text
설정을 적용해 장치를 초기화한다.
```

---

## L-64. English Sentence Order in Korean

### 긴 수식어를 앞에 계속 배치

### 문제

문장 끝까지 가야 핵심 동사를 알 수 있다.

### 개선

긴 기술 문장은 두 문장으로 나누고 결론을 앞에 둔다.

---

## L-65. Connector Overuse

```text
따라서, 또한, 반면에, 이에 따라
```

가 매 문단 반복.

### 문제

AI형 문체처럼 보이고 문장이 기계적이다.

### 개선

논리 관계가 실제로 필요한 곳에서만 사용한다.

---

## L-66. False Friend Translation

예:

```text
eventually → 결과적으로
```

문맥상 `마침내` 또는 `결국`일 수 있다.

### 개선

기술 문맥과 시간 관계를 확인한다.

---

## L-67. Modal Verb Loss

### `may`, `can`, `must`의 강도가 번역에서 사라짐

### 문제

가능성·허용·필수 조건이 모두 단정으로 바뀐다.

### 개선

```text
may → 가능성이 있다 / 허용될 수 있다
must → 반드시 해야 한다
should → 권장한다
```

처럼 강도를 보존한다.

---

## L-68. Specification Normative Language Collapse

### `MUST`, `SHOULD`, `MAY`를 모두 같은 어조로 번역

### 문제

규격 요구 수준이 사라진다.

### 개선

규격의 normative keyword를 명확히 구분한다.

---

## L-69. Untranslated Idiom

### 영문 표현을 그대로 옮겨 의미가 이상함

```text
hot path를 뜨겁게 만든다
```

### 개선

업계 관용어인지, 설명이 필요한 표현인지 구분한다.

---

## L-70. Korean Explanation Becomes More Ambiguous Than English

### 번역 과정에서 정확한 원문보다 설명이 모호해짐

### 개선

정확성이 중요한 문장은 원문 용어와 한국어 해석을 함께 둔다.

---

# 표와 다이어그램

## L-71. Diagram Labels in Mixed Languages

### 한 그림 안에 한국어와 영문 라벨이 무질서하게 섞임

### 개선

한 언어를 기본으로 하고 고유 명칭만 원문 유지한다.

---

## L-72. Diagram Translation Diverges from Text

### 본문은 `호스트 물리 주소`, 그림은 `HPA`, 표는 `Host PA`

### 문제

같은 개념인지 다시 해석해야 한다.

### 개선

첫 등장에 대응 관계를 정의하고 이후 일관되게 사용한다.

---

## L-73. Table Header Translation Drift

### 같은 필드명이 표마다 다르게 번역

### 개선

레지스터·프로토콜 필드는 공식 원문을 유지하고 한국어 설명을 별도 열에 둔다.

---

## L-74. Translated Register Names

### 사양의 레지스터 이름을 한국어로만 표시

### 문제

데이터시트에서 검색하기 어렵다.

### 개선

```text
Host Bridge Control Register
호스트 브리지 제어 레지스터
```

처럼 원문을 유지한다.

---

## L-75. Unit Localization Error

### 소수점·천 단위·단위 표기가 섞임

```text
1,5 GB/s
1.5GBps
1.5 GB/sec
```

### 개선

사이트 전체 단위 표기 규칙을 정한다.

---

## L-76. Binary–Decimal Unit Collapse

### GB와 GiB를 혼용

### 문제

성능과 메모리 용량 비교에서 오차가 생긴다.

### 개선

측정 기준에 따라 정확한 단위를 사용한다.

---

## L-77. Full-Width Character in Code Context

### 한국어 입력기의 전각 기호가 코드나 명령에 들어감

### 문제

복사 실행 시 오류가 발생한다.

### 개선

코드·명령 블록은 ASCII 기호를 검증한다.

---

# 다국어 사이트 운영

## L-78. Translate Everything Strategy

### 모든 글을 두 언어로 운영하려 함

### 문제

유지보수 비용이 거의 두 배가 된다.

### 개선

대표 Evergreen 글과 국제적 검색 가치가 큰 글부터 선별한다.

---

## L-79. No Translation Priority

### 어떤 글을 영어로 옮길지 기준 없음

### 개선 기준

```text
고유 실험
국제적 희소성
Evergreen 가치
검색 수요
포트폴리오 가치
```

---

## L-80. Translation Before Source Stabilization

### 원문이 계속 바뀌는 상태에서 번역

### 문제

번역 업데이트가 반복된다.

### 개선

대표 구조와 기술 검증이 안정된 뒤 번역한다.

---

## L-81. Separate Translation Workflow Without Sync

### 번역본을 별도 파일로 관리하지만 연결 정보 없음

### 개선

source ID와 revision을 metadata로 관리한다.

---

## L-82. Automatic Translation Publication

### 생성 후 검토 없이 바로 공개

### 문제

기술적 오류와 어색한 문장이 그대로 노출된다.

### 개선

Draft → 언어 검토 → 기술 검토 → 공개 순서를 둔다.

---

## L-83. One Locale Sitemap

### 여러 언어 페이지를 운영하지만 Sitemap이 구분되지 않음

### 개선

언어별 URL 관계와 sitemap 구성을 일관되게 관리한다.

---

## L-84. Language Switch Loses Context

### 언어를 바꾸면 홈으로 이동

### 문제

같은 글의 번역본을 찾기 어렵다.

### 개선

동일 콘텐츠 ID의 다른 언어 버전으로 이동한다.

---

## L-85. Missing Translation Fallback

### 해당 언어 번역이 없을 때 빈 페이지 또는 404

### 개선

원문 언어로 이동할 수 있음을 명확히 안내한다.

---

## L-86. Automatic Locale Detection Override

### 브라우저 언어에 따라 강제로 다른 페이지로 이동

### 문제

사용자가 원하는 언어를 선택하기 어렵고 검색 크롤링도 복잡해질 수 있다.

### 개선

자동 감지는 제안 수준으로 사용하고 사용자의 선택을 존중한다.

---

## L-87. Locale Stored Forever

### 한 번 선택한 언어가 예상치 못하게 계속 강제됨

### 개선

언어 선택 상태를 명확히 보여주고 쉽게 변경할 수 있게 한다.

---

# 코드 검색성과 검색엔진

## L-88. Translated Function in Heading

```text
장치 검색 함수 분석
```

### 문제

실제 함수명이 제목에 없어 검색성이 떨어진다.

### 개선

```text
`pci_scan_child_bus()`는 장치를 어떻게 열거하는가
```

---

## L-89. Error Message Omitted from Title and Heading

### 실제 오류 문자열은 본문 깊숙이만 존재

### 문제

정확한 오류 검색으로 유입되기 어렵다.

### 개선

핵심 오류 메시지는 제목 또는 주요 heading에 자연스럽게 포함한다.

---

## L-90. Searchable English Terms Hidden in Images

### 다이어그램에만 영문 키워드 존재

### 문제

본문 검색과 검색엔진이 개념을 충분히 이해하지 못한다.

### 개선

중요한 라벨과 용어를 본문에서도 설명한다.

---

## L-91. Code Symbol Tokenization Failure

### `std::vector`, `cudaMemcpyAsync`, `pci_dev`가 일반 단어로 분해

### 개선

기술 identifier 전용 검색 필드를 둔다.

---

## L-92. Punctuation-Normalized Wrongly

### `A/B`, `C/C++`, `MSI/MSI-X`에서 의미 있는 기호 제거

### 개선

도메인별 tokenizer 규칙을 테스트한다.

---

# 국제 독자와 접근성

## L-93. English Summary Without Substance

### 영어 요약이 일반 문장 몇 줄뿐

### 문제

영문 독자가 실제 내용을 알 수 없다.

### 개선

요약을 제공한다면 핵심 문제·결론·환경을 담는다.

---

## L-94. Mixed Language Screen Reader Issue

### 페이지 언어는 한국어인데 긴 영문 인용과 설명을 구분하지 않음

### 개선

긴 영문 문장이나 별도 인용에는 적절한 언어 정보를 제공할 수 있다. 다만 모든 약어에 과도하게 적용하지 않는다.

---

## L-95. Translation Hides Cultural Context

### 국내 환경·제품·기관을 영문 독자가 안다고 가정

### 개선

필요한 최소 맥락을 추가한다.

---

## L-96. Local Assumptions in Global Guide

### 시간대, 경로, 키보드, 운영체제 설정을 한국 환경 기준으로만 설명

### 개선

지역에 영향을 받는 설정은 명확히 표시한다.

---

## L-97. Locale-Specific Screenshot

### 한글 UI 스크린샷만 제공하지만 영문 명칭으로 설명

### 문제

메뉴를 찾기 어렵다.

### 개선

화면 텍스트와 본문 명칭의 대응을 알려준다.

---

## L-98. Date Ambiguity Across Locales

```text
08/01/2026
```

### 문제

8월 1일인지 1월 8일인지 모호하다.

### 개선

모호하지 않은 날짜 형식을 사용한다.

```text
2026-08-01
2026년 8월 1일
```

---

## L-99. Locale Changes Technical Meaning

### 소수점, 정규식, shell locale 차이를 무시

### 문제

명령 출력과 파싱 결과가 달라질 수 있다.

### 개선

재현성이 중요한 실험에서는 locale 설정을 명시한다.

---

## L-100. Localization System Becomes the Product

### 다국어 기능 개발이 콘텐츠보다 커짐

### 문제

번역 관리 UI, 자동 sync, locale routing을 만들다가 실제 대표 글 번역은 진행되지 않는다.

### 개선

대표 글 5~10개를 수동으로 번역해 실제 필요와 비용을 먼저 확인한다.

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Korean–English Term Drift | 시스템 용어가 많아 글 간 표기 분열 가능성이 큼 |
| 2 | No Search Alias | 한글·영문·약어 검색 연결이 핵심 |
| 3 | Symbol Search Failure | C++, MSI-X, x86-64 같은 토큰이 많음 |
| 4 | Translation Hides Specification Terms | 사양·소스에서 원문 용어를 다시 찾아야 함 |
| 5 | Same Korean Word for Distinct Terms | coherence·consistency 등 의미 구분 중요 |
| 6 | Modal Verb Loss | 사양의 MUST·SHOULD·MAY 정확성이 중요 |
| 7 | Bilingual Title Overload | 제목이 이미 길고 전문 용어가 많음 |
| 8 | Korean Title Without Searchable English Term | 영문 기술 키워드 유입을 놓칠 수 있음 |
| 9 | Code Symbol Tokenization Failure | 함수·타입 중심 검색 품질에 직접 영향 |
| 10 | Error Message Omitted from Heading | 희귀 오류 검색 유입에 중요 |
| 11 | Mixed Slug Policy | 오래된 글과 신규 글의 URL 규칙이 다를 가능성 |
| 12 | Terminology Change Without Migration | 수백 개 글의 검색·일관성 유지 필요 |
| 13 | Translated Error Messages | 실제 오류 검색 가능성을 보존해야 함 |
| 14 | Translate Everything Strategy | 글 수가 많아 전면 번역은 유지 불가능 |
| 15 | Localization System Becomes the Product | 번역 플랫폼보다 핵심 글 선별이 먼저 |

# 추천 최소 용어 관리 모델

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

# 추천 표기 원칙

```text
고유 제품명·API·함수명은 원문 유지
첫 등장에 한국어와 영문 병기
이후에는 문맥에 맞는 대표 표기 사용
오류·로그·명령 출력은 원문 유지
사양의 MUST·SHOULD·MAY 강도 보존
제목은 한 언어 중심으로 간결하게 작성
```

# 이번 단계의 핵심 결론

한글 기술 블로그에서 영문 용어를 많이 쓰는 것 자체는 문제가 아니다.

문제는 다음이다.

> 같은 개념이 글마다 다른 이름으로 나타나고, 검색·제목·본문·다이어그램에서 서로 연결되지 않는 것.

따라서 목표는 모든 용어를 번역하는 것이 아니라:

```text
표준 표기
검색 alias
원문 추적 가능성
문맥별 의미 구분
일관된 제목과 metadata
```

를 유지하는 것이다.

다음은 **Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns**로 이어갈 수 있다. 자동 관련 글, 추천 알고리즘, backlink, 선행·후속 관계, 지식 그래프 시각화에서 발생하는 안티패턴을 정리하는 단계다.

## 39. assistant

# Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns

이번에는 **관련 글 추천, 자동 추천 알고리즘, backlink, 선행·후속 관계, Topic Graph, 지식 그래프 시각화**를 다룬다.

핵심은 이거다.

> 연결이 많다고 좋은 지식 구조가 되는 것은 아니다.  
> 중요한 것은 **왜 연결되는지**가 분명한가이다.

---

## K-01. Related Posts by Tag Count

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

## K-02. Semantic Similarity Equals Relevance

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

## K-03. Recommendation Without Purpose

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

## K-04. Same Recommendation Everywhere

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

## K-05. Popularity Bias

### 조회수 높은 글만 추천

### 문제

이미 인기 있는 글이 계속 더 노출되고, 희귀하지만 중요한 글은 묻힌다.

### 개선

편집자 우선순위와 구조적 중요도를 함께 반영한다.

---

## K-06. Recency Bias

### 최신 글을 관련 글보다 우선 추천

### 문제

새 글이라는 이유만으로 문맥과 무관한 글이 노출된다.

### 개선

최신성은 관련성이 충분할 때만 보조 가중치로 쓴다.

---

## K-07. Engagement Optimization

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

## K-08. Recommendation Echo Chamber

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

## K-09. Random Exploration Slot

### 다양성을 위해 임의 글을 추천

### 문제

학습 문맥과 전혀 맞지 않을 수 있다.

### 개선

랜덤 대신 편집된 “연결 주제” 슬롯을 사용한다.

---

## K-10. Too Many Recommendations

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

# 관계 모델

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

# 선행·후속 학습 경로

## K-21. Linear Learning Path Assumption

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

## K-22. One Start Point for Everyone

### 입문자가 하나의 긴 로드맵부터 시작해야 함

### 문제

경험자에게 불필요하고 초보자에게 과할 수 있다.

### 개선

선행 지식별 진입점을 제공한다.

---

## K-23. Path Without Goal

### 글 순서는 있지만 완주 후 무엇을 알게 되는지 없음

### 개선

각 경로에 학습 목표를 적는다.

---

## K-24. Path Without Exit

### 시리즈를 다 읽은 뒤 다음 단계가 없음

### 개선

상위 Topic이나 실전 프로젝트로 연결한다.

---

## K-25. Path Locked to Publication Order

### 작성한 순서가 학습 순서

### 문제

작성자는 발견 순서로 썼지만 독자는 개념 순서로 배워야 한다.

### 개선

발행 순서와 학습 순서를 분리한다.

---

## K-26. Prerequisite Chain Too Deep

### 한 글을 읽기 위해 10개 선행 글 요구

### 문제

진입 장벽이 너무 높다.

### 개선

필수 선행과 선택 선행을 구분하고, 짧은 요약을 제공한다.

---

## K-27. Circular Prerequisites

### A를 이해하려면 B가 필요하고, B를 이해하려면 A가 필요

### 문제

학습 그래프가 닫힌다.

### 개선

기본 모델을 설명하는 독립 진입 문서를 둔다.

---

## K-28. Hidden Prerequisite

### 본문 중간에서 갑자기 고급 개념 등장

### 개선

글 상단에 선행 지식을 표시한다.

---

## K-29. Difficulty as Path

### 난이도 순으로만 콘텐츠를 연결

### 문제

난이도와 개념 의존성은 다르다.

### 개선

관계와 난이도를 별도 속성으로 관리한다.

---

## K-30. Completing the Path Becomes the Goal

### 학습 경로의 모든 글을 읽어야 한다고 느끼게 함

### 문제

문제 해결형 독자에게 부담이다.

### 개선

필수·선택·심화 문서를 구분한다.

---

# Backlink

## K-31. Backlink Dump

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

## K-32. Backlink Without Relation

### “이 글을 참조한 글”만 표시

### 문제

왜 참조했는지 모른다.

### 개선

참조 문맥이나 관계 유형을 표시한다.

---

## K-33. Self-Generated Backlink Noise

### 자동 생성된 관련 글 영역의 링크까지 backlink로 계산

### 문제

그래프가 인위적으로 밀집한다.

### 개선

본문 명시 링크와 자동 추천 링크를 구분한다.

---

## K-34. Navigation Links Counted as Knowledge Edges

### 헤더·푸터·태그 링크까지 지식 관계로 처리

### 문제

모든 페이지가 강하게 연결된 것처럼 보인다.

### 개선

UI 탐색 링크와 의미 관계 링크를 분리한다.

---

## K-35. Backlink as Popularity Score

### backlink 수가 많으면 중요한 글이라고 판단

### 문제

공통 용어 글은 링크가 많고, 희귀 핵심 글은 적을 수 있다.

### 개선

관계 유형과 위치에 가중치를 둔다.

---

## K-36. Missing Backlink for Renamed Pages

### slug 변경 후 링크는 redirect로 살아 있지만 그래프는 끊김

### 개선

canonical ID 기준으로 관계를 관리한다.

---

## K-37. Backlink Page Indexed as Thin Content

### backlink 목록만 별도 URL로 생성

### 문제

내용이 거의 없는 페이지가 늘어난다.

### 개선

backlink는 문서 UI의 보조 정보로 제공한다.

---

# Topic Graph

## K-38. Topic Equals Tag

### Topic Graph를 태그 공통도로 생성

### 문제

태그는 횡단 속성이라 지식 계층을 표현하지 못한다.

### 개선

Topic과 Tag를 분리한다.

---

## K-39. Topic Hierarchy as a Tree Only

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

## K-40. Graph Without Canonical Nodes

### `C++`, `cpp`, `cplusplus`가 별도 노드

### 문제

그래프가 분열된다.

### 개선

canonical ID와 alias를 사용한다.

---

## K-41. Node for Every Tag

### 1회성 태그까지 그래프 노드

### 문제

노드가 너무 많고 의미가 약해진다.

### 개선

핵심 Topic과 주요 Concept만 노드화한다.

---

## K-42. Article as Every Node

### 모든 글을 같은 크기의 노드로 표시

### 문제

대표 Guide와 작은 Note의 차이가 사라진다.

### 개선

노드 유형과 중요도를 구분한다.

---

## K-43. Graph Density as Quality

### 연결이 많을수록 좋다고 판단

### 문제

의미 없는 링크가 많아질 수 있다.

### 개선

적은 수의 정확한 관계를 우선한다.

---

## K-44. Disconnected Node Panic

### 고립 노드가 있으면 무조건 연결

### 문제

독립적인 Reference나 역사 기록은 고립되어도 괜찮을 수 있다.

### 개선

고립이 문제인지 문서 역할에 따라 판단한다.

---

## K-45. Centrality as Editorial Importance

### 그래프 중심성이 높은 글을 대표 문서로 선정

### 문제

일반 개념 글이 구조상 중심이지만, 네 전문성을 대표하지 않을 수 있다.

### 개선

구조적 중요도와 편집자 중요도를 분리한다.

---

## K-46. Graph Generated Once

### 지식 그래프를 만든 뒤 갱신하지 않음

### 문제

새 글과 통합 결과가 반영되지 않는다.

### 개선

manifest에서 재생성 가능하게 한다.

---

## K-47. Graph Without State

### 폐기·구판·검토 필요 문서도 동일하게 표시

### 개선

노드 상태를 반영한다.

---

## K-48. Graph Without Edge Provenance

### 연결 근거를 알 수 없음

### 개선

수동, 본문 링크, 시리즈, 자동 유사도 등 provenance를 기록한다.

---

# 시각화

## K-49. Hairball Graph

### 모든 노드와 연결을 한 화면에 표시

### 문제

아무것도 읽을 수 없다.

### 개선

Topic, 수준, 관계 유형별 필터를 제공하거나 기본 범위를 작게 유지한다.

---

## K-50. Force-Directed Layout as Structure

### 물리 시뮬레이션 배치를 실제 지식 구조로 해석

### 문제

노드 위치가 실행마다 달라지고 의미가 불분명하다.

### 개선

계층·경로·관계 유형에 맞는 레이아웃을 선택한다.

---

## K-51. Animation-Heavy Graph

### 노드가 계속 움직임

### 문제

읽기 어렵고 성능과 접근성이 나빠진다.

### 개선

초기 배치 후 고정하고 reduced motion을 지원한다.

---

## K-52. Zoom-Only Navigation

### 그래프에서 확대·축소만 가능

### 문제

키보드와 모바일 사용성이 나쁘다.

### 개선

검색, 목록, breadcrumb를 함께 제공한다.

---

## K-53. Color-Only Node Types

### Topic·Guide·Debug를 색으로만 구분

### 개선

모양·라벨·범례를 함께 사용한다.

---

## K-54. Tiny Labels

### 노드가 많아 제목이 읽히지 않음

### 개선

상위 노드만 라벨을 표시하고 상세는 선택 시 보여준다.

---

## K-55. Graph Replaces Navigation

### 일반 메뉴와 Topic Hub 대신 그래프만 제공

### 문제

그래프는 탐색 보조이지 기본 정보 구조가 아니다.

### 개선

목록과 계층 탐색을 우선하고 그래프는 선택 기능으로 둔다.

---

## K-56. Graph Has No User Question

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

## K-57. Graph on Mobile by Default

### 작은 화면에서도 전체 그래프 렌더링

### 문제

조작과 성능이 모두 나쁘다.

### 개선

모바일에서는 목록형 관계 보기로 대체한다.

---

## K-58. Graph State Not Shareable

### 필터·선택 상태를 URL로 공유할 수 없음

### 개선

필요한 경우 선택된 Topic과 관계 필터를 URL 상태로 표현한다.

---

## K-59. Graph Requires Heavy Client Runtime

### 지식 관계를 보기 위해 큰 JS bundle 필요

### 문제

정적 사이트의 장점을 잃는다.

### 개선

기본 관계 목록은 정적 HTML로 제공하고 시각화는 지연 로드한다.

---

## K-60. Graph Analytics Becomes a Product

### 노드 클릭·경로·중앙성을 분석하는 플랫폼까지 개발

### 문제

실제 콘텐츠 연결 작업보다 도구가 커진다.

### 개선

먼저 수동 Topic Hub와 관계 링크의 효과를 확인한다.

---

# 자동화와 AI 추천

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

# Canonical Guide와 중복

## K-73. No Canonical Node

### 같은 주제의 대표 글이 없음

### 문제

추천 알고리즘이 여러 유사 글을 동등하게 노출한다.

### 개선

Topic마다 대표 Guide·Concept를 지정한다.

---

## K-74. Canonical Guide Dominates Everything

### 모든 관련 검색과 추천이 대표 Guide로만 감

### 문제

구체적인 Debug Note나 Reference가 묻힌다.

### 개선

사용자 의도에 따라 대표 문서와 세부 문서를 구분한다.

---

## K-75. Duplicate Articles Linked as Related

### 사실상 같은 검색 의도의 글을 서로 추천

### 문제

중복을 유지하고 사용자 이동만 늘린다.

### 개선

통합 또는 역할 분리를 먼저 검토한다.

---

## K-76. Superseded Article Recommended

### 구판이 관련 글에 계속 등장

### 개선

상태를 추천 점수와 필터에 반영한다.

---

## K-77. Related Content Competes with Canonical

### 하위 글이 대표 문서보다 검색·추천에서 강함

### 개선

상위 Guide를 구조적 진입점으로 boost하되, 정확한 문제 검색에는 하위 글을 우선한다.

---

# 사용자 문맥

## K-78. Same Recommendation for All Entry Points

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

## K-79. Personalization Before Need

### 사용자별 추천 시스템을 구축

### 문제

트래픽이 적고 콘텐츠 관계가 명확한 기술 블로그에서는 과도하다.

### 개선

문맥 기반 정적 추천이 먼저다.

---

## K-80. Persistent Reading Profile

### 사용자의 읽은 Topic과 검색 기록을 장기간 저장

### 문제

개인정보와 운영 복잡성이 증가한다.

### 개선

필요하다면 브라우저 로컬 상태로 최소화하고 명확한 제어를 제공한다.

---

## K-81. Resume Reading Without Consent

### 읽기 위치를 자동 저장·복원

### 문제

공용 기기나 예상치 못한 상태 유지가 불편할 수 있다.

### 개선

선택 기능으로 제공한다.

---

## K-82. “You May Also Like” Without Explanation

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

# 품질과 평가

## K-83. Click-Through Rate as Relevance

### 클릭률이 높으면 추천이 정확하다고 판단

### 문제

제목의 매력과 실제 관련성을 구분하지 못한다.

### 개선

클릭 후 즉시 이탈·다음 탐색도 함께 본다.

---

## K-84. Manual Curation Without Review

### 한 번 정한 관련 글을 영구 유지

### 문제

새 글·통합·구판 상태가 반영되지 않는다.

### 개선

대표 글 업데이트 시 관계도 검토한다.

---

## K-85. Auto Recommendation Without Evaluation Set

### 추천 품질을 체감으로만 판단

### 개선

대표 문서마다 기대 관계를 소규모로 정의한다.

---

## K-86. No Explanation for Exclusion

### 왜 특정 글이 추천되지 않는지 알 수 없음

### 문제

알고리즘 디버깅이 어렵다.

### 개선

후보 점수와 제외 사유를 개발용 report에 남긴다.

---

## K-87. Recommendation Metrics Without Editorial Value

### 클릭은 적지만 반드시 필요한 선행 글을 제거

### 개선

일부 관계는 성과 지표와 무관하게 편집 원칙으로 유지한다.

---

## K-88. Graph Completeness as Quality

### 모든 글에 관계를 채우는 것이 목표

### 문제

억지 연결이 늘어난다.

### 개선

관계가 없는 것이 더 정직한 문서도 허용한다.

---

## K-89. Recommendation System Without Failure Fallback

### 추천 데이터 생성 실패 시 페이지 오류

### 개선

기본적으로 정적 상위 Topic 링크는 항상 제공한다.

---

## K-90. Recommendation UI Dominates Conclusion

### 결론보다 추천 카드가 더 크게 보임

### 문제

글의 핵심 판단이 약해진다.

### 개선

본문 결론을 먼저 완성하고 추천은 보조 영역으로 둔다.

---

# 운영

## K-91. Relationship Editing Requires Code Change

### 관련 글을 바꾸려면 컴포넌트 코드 수정

### 개선

콘텐츠 metadata나 manifest에서 관리한다.

---

## K-92. Relationship Stored Only in Front Matter

### 모든 관계를 글 파일 상단에 직접 입력

### 문제

관계가 많아지면 front matter가 폭발한다.

### 개선

핵심 명시 관계만 front matter에 두고 나머지는 별도 graph manifest나 파생 데이터로 관리한다.

---

## K-93. Central Graph File Merge Conflicts

### 모든 관계를 하나의 거대한 YAML에 저장

### 문제

수정 충돌과 가독성 문제가 생긴다.

### 개선

Topic별 파일 또는 문서 ID 기준 분할을 고려한다.

---

## K-94. Graph Schema Without Validation

### 잘못된 node ID와 순환 관계가 그대로 들어감

### 개선

- 존재하지 않는 문서
- 금지된 순환
- 상태 불일치
- 중복 edge

를 검증한다.

---

## K-95. Relation Migration Forgotten

### 글 통합 시 링크만 수정하고 graph edge는 방치

### 개선

콘텐츠 migration에 관계 migration을 포함한다.

---

## K-96. Manual and Automatic Relations Mixed

### 어떤 관계가 사람이 지정했고 자동 생성됐는지 모름

### 개선

provenance를 저장한다.

---

## K-97. Automatic Relations Committed as Source

### 임베딩 결과를 원본 metadata처럼 Git에 저장

### 문제

모델과 threshold 변경이 대규모 diff를 만든다.

### 개선

자동 관계는 빌드 산출물로 취급한다.

---

## K-98. No Editorial Override

### 알고리즘 추천을 사람이 수정할 수 없음

### 개선

include, exclude, pin 기능을 제공한다.

---

## K-99. Override Cemetery

### 과거 알고리즘 문제를 override로 계속 덮음

### 문제

예외 규칙이 누적된다.

### 개선

override가 많아지면 추천 모델이나 taxonomy를 수정한다.

---

## K-100. Knowledge Graph Becomes the Product

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

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Related Posts by Tag Count | 기술 주제 관계를 정확히 표현하기 어려움 |
| 2 | Recommendation Without Purpose | 단순 관련 글보다 학습 역할이 중요 |
| 3 | One Generic Relation | 선행·후속·실전·구판 관계를 구분해야 함 |
| 4 | Missing Inverse Relation | 선행 글과 사용 글을 양쪽에서 보여줄 필요 |
| 5 | Path Locked to Publication Order | 작성 순서와 학습 순서가 다를 가능성 큼 |
| 6 | Circular Prerequisites | 시스템 개념이 서로 참조하며 진입점이 사라질 수 있음 |
| 7 | Missing Cross-Topic Recommendations | CUDA·PCIe·NUMA·CXL 연결이 차별화 요소 |
| 8 | Backlink Dump | 글 수가 많아지면 역링크 노이즈가 큼 |
| 9 | Topic Equals Tag | 태그 목록과 지식 구조를 분리해야 함 |
| 10 | Hairball Graph | 전체 시각화는 빠르게 읽을 수 없게 됨 |
| 11 | Graph Replaces Navigation | Topic Hub와 일반 탐색이 우선 |
| 12 | AI Recommendation as Truth | 기술 관계 오류를 자동 게시하면 신뢰 저하 |
| 13 | Duplicate Articles Linked as Related | 추천보다 통합이 우선인 글이 있을 수 있음 |
| 14 | Superseded Article Recommended | 구판 상태를 추천에 반영해야 함 |
| 15 | Knowledge Graph Becomes the Product | 도구 개발보다 수동 연결 검증이 먼저 |

# 추천 최소 관계 모델

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

# 추천 노출 구조

글 하단에는 최대 다음 정도가 적절하다.

```text
상위 주제
필요한 선행 개념
다음에 읽을 글
같은 문제의 실전 사례
```

`관련 글 8개`보다 역할이 분명한 3~4개 링크가 더 낫다.

# 이번 단계의 핵심 결론

좋은 추천 시스템의 목적은 클릭을 늘리는 것이 아니다.

> 독자가 현재 글의 위치를 이해하고, 다음에 필요한 지식으로 자연스럽게 이동하도록 돕는 것.

따라서 `hawk90.github.io`에서는 벡터 검색이나 화려한 그래프보다 먼저 다음이 필요하다.

```text
대표 Topic
Canonical Guide
명시적 선행 관계
다음 단계
구판 대체 관계
교차 Topic 연결
```

이 구조가 수동으로 안정된 뒤에 자동 추천과 그래프 시각화를 붙이는 것이 맞다.

## 40. assistant

# Task 2-13. Testing, Validation & Quality Assurance Anti-patterns

이번에는 **정적 사이트 테스트, 콘텐츠 검증, 시각 회귀, 접근성 검사, 링크 검사, 검색 품질, 생성 자산 검증**을 다룬다.

기술 블로그의 테스트는 일반 웹앱과 조금 다르다.

```text
코드가 실행되는가
+
콘텐츠가 정확히 연결되는가
+
생성 결과가 읽을 수 있는가
+
오래된 글이 잘못 노출되지 않는가
```

를 함께 확인해야 한다.

---

## T-01. Build Success Equals Correctness

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

## T-02. Type Safety as Content Safety

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

## T-03. Test Only the Framework

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

## T-04. Content Is Not Code

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

## T-05. Test Every Detail

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

# 단위 테스트

## T-06. Utility-Only Unit Tests

### slug 함수, 날짜 함수만 단위 테스트

### 문제

실제 사이트 위험은 여러 단계가 결합된 곳에서 발생한다.

### 개선

콘텐츠 하나가 최종 페이지가 되는 흐름을 테스트한다.

---

## T-07. Mock Everything

### 파일 시스템과 Markdown parser를 모두 mock

### 문제

실제 front matter, encoding, 경로 문제를 놓친다.

### 개선

작은 fixture 디렉터리를 실제로 읽는 테스트를 포함한다.

---

## T-08. No Parser Fixture

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

## T-09. Happy-Path Fixture Only

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

## T-10. Fixture Does Not Resemble Real Content

### 테스트 문서가 지나치게 단순

```markdown
# Hello

Test
```

### 문제

실제 100개 코드 블록, 수식, 표, 한글·영문 혼합 글의 문제를 잡지 못한다.

### 개선

대표적인 복잡도 fixture를 별도로 둔다.

---

## T-11. Fixture Copy of Production Article

### 실제 글 전체를 테스트 fixture로 복사

### 문제

원본과 fixture가 따로 관리되어 불일치한다.

### 개선

특정 동작을 재현하는 최소 사례를 만든다.

---

## T-12. Unit Test Internal Implementation

### 내부 함수 호출 순서까지 검증

### 문제

리팩토링할 때 기능은 같아도 테스트가 깨진다.

### 개선

입력과 출력 계약을 검증한다.

---

## T-13. Generated HTML String Equality

### 전체 HTML 문자열을 정확히 비교

### 문제

attribute 순서나 공백 변경에도 실패한다.

### 개선

DOM 구조와 중요한 요소를 선택적으로 검사한다.

---

## T-14. Locale-Dependent Test

### 개발 환경 언어에 따라 날짜·정렬 결과가 달라짐

### 개선

테스트 locale과 timezone을 고정한다.

---

## T-15. Time-Dependent Test

### 현재 날짜에 따라 오래된 글 판정이 달라짐

### 개선

clock을 주입하거나 기준일을 명시한다.

---

# 통합 테스트

## T-16. No End-to-End Content Pipeline Test

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

## T-17. Production Build Never Tested in CI

### lint와 unit test만 실행

### 문제

실제 정적 생성 단계의 오류를 놓친다.

### 개선

main merge 전 최소 한 번 production build를 실행한다.

---

## T-18. Full Build Only Test

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

## T-19. No Generated Output Inspection

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

## T-20. One Representative Page

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

## T-21. No Large-Article Test

### 작은 글만 테스트

### 문제

긴 TOC, 많은 코드 블록, 거대한 표에서 생기는 문제를 놓친다.

### 개선

상위 복잡도 글 하나를 canary로 정한다.

---

## T-22. No Empty-State Test

### 검색 결과 없음, Topic 글 없음, 관련 글 없음 상태를 검증하지 않음

### 문제

빈 카드, 깨진 heading, 잘못된 광고 영역이 나타날 수 있다.

---

## T-23. No Error-State Test

### 이미지 실패, 댓글 실패, 검색 인덱스 실패 상황을 확인하지 않음

### 개선

외부 integration 실패가 본문을 깨뜨리지 않는지 테스트한다.

---

## T-24. Preview and Production Divergence

### preview에서는 정상인데 GitHub Pages base path에서 깨짐

### 개선

실제 production base URL과 asset path 조건을 테스트한다.

---

## T-25. Test Against Source, Not Dist

### 원본 Markdown과 컴포넌트만 검사하고 최종 배포물을 보지 않음

### 문제

생성 과정에서 생긴 URL·asset·HTML 오류를 놓친다.

### 개선

일부 테스트는 반드시 `dist`를 대상으로 한다.

---

# 링크 검증

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

# 검색 품질 테스트

## T-36. Search Works Means Search Is Good

### 결과가 나오기만 하면 완료

### 문제

정확한 결과가 상위에 오는지는 별개다.

### 개선

대표 query set을 유지한다.

---

## T-37. No Golden Query Set

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

## T-38. Only Exact Query Tests

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

## T-39. No Negative Search Cases

### 결과가 없어야 하는 query를 테스트하지 않음

### 문제

무관한 글이 항상 상위에 나오는 문제를 놓친다.

---

## T-40. Rank-One-Only Evaluation

### 첫 번째 결과만 검사

### 문제

전체 상위 결과 품질과 중복을 놓친다.

### 개선

상위 3~5개 결과를 평가한다.

---

## T-41. Search Snapshot by Score

### 내부 점수 숫자를 그대로 snapshot

### 문제

알고리즘 미세 변경에 테스트가 자주 깨진다.

### 개선

정확한 점수보다 상대 순서와 포함 여부를 본다.

---

## T-42. Search Test Ignores Content Status

### 폐기 글이 상위 결과여도 통과

### 개선

`superseded`, `historical` 상태의 ranking 규칙을 검증한다.

---

## T-43. Search Test Ignores Canonical Guide

### 대표 Guide가 일반 단편 글 아래 있어도 문제로 보지 않음

### 개선

넓은 주제 검색에서는 Hub·Guide가 적절히 노출되는지 검사한다.

---

## T-44. Search Test Dataset Too Small

### 문서 5개로 검색 알고리즘 테스트

### 문제

실제 수백 개 글에서 나타나는 충돌을 재현하지 못한다.

### 개선

실제 manifest의 축약 샘플이나 production index를 사용한 정기 테스트를 둔다.

---

## T-45. Search Quality Tested Only Manually

### 체감으로 검색 확인

### 개선

자동 평가와 수동 점검을 병행한다.

---

# 시각 회귀 테스트

## T-46. Screenshot Every Page

### 모든 페이지 전체 화면을 저장

### 문제

저장 공간·시간·오탐이 과도하다.

### 개선

대표 페이지 유형과 핵심 viewport만 선택한다.

---

## T-47. No Visual Regression Test

### CSS 변경 후 사람이 몇 페이지 보는 것으로 끝

### 문제

오래된 글, 긴 표, 특수 코드 블록에서 깨짐을 놓친다.

### 개선

canary 페이지를 선정한다.

---

## T-48. Pixel-Perfect Failure

### 1px 차이에도 실패

### 문제

폰트 렌더링과 OS 차이로 flaky해진다.

### 개선

허용 임계치와 안정된 실행 환경을 사용한다.

---

## T-49. Visual Test on One Browser

### Chromium만 검사

### 문제

Safari의 font·sticky·overflow 차이를 놓칠 수 있다.

### 개선

전체 브라우저 matrix는 과할 수 있지만, 주요 변경은 최소한 Chromium과 WebKit을 확인한다.

---

## T-50. Desktop-Only Screenshot

### 모바일 회귀가 검출되지 않음

### 개선

대표 모바일 폭을 포함한다.

---

## T-51. Screenshot Without Interaction

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

## T-52. Dynamic Content in Screenshot

### 댓글·광고·시간 정보 때문에 매번 diff 발생

### 개선

외부 동적 영역을 mock하거나 visual test에서 제외한다.

---

## T-53. Font Not Pinned

### CI 환경에 따라 fallback font가 달라짐

### 문제

대량 시각 diff가 발생한다.

### 개선

테스트 환경의 폰트와 렌더링 조건을 고정한다.

---

## T-54. Dark Mode Untested

### 라이트모드만 회귀 테스트

### 개선

대표 글 한두 개는 두 테마를 모두 검사한다.

---

## T-55. Generated Diagram Untested

### TikZ·SVG 결과가 깨져도 build는 성공

### 개선

대표 다이어그램의 렌더링 결과를 visual canary로 둔다.

---

# 접근성 테스트

## T-56. Automated Accessibility Equals Accessible

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

## T-57. Accessibility Test on Homepage Only

### 글 페이지의 코드·표·TOC 문제를 놓침

### 개선

대표 장문 글과 검색 modal을 포함한다.

---

## T-58. No Keyboard Test

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

## T-59. Focus Visible Test Missing

### Tab 이동은 되지만 현재 위치가 안 보임

### 개선

자동화만으로 부족하면 실제 브라우저에서 확인한다.

---

## T-60. Focus Order Follows DOM Accidentally

### CSS layout 변경 후 focus 순서가 이상해짐

### 개선

모바일 메뉴·카드 grid·sidebar에서 순서를 검증한다.

---

## T-61. Modal Escape Not Tested

### 검색 modal에서 focus가 뒤 페이지로 빠짐

### 개선

open, initial focus, trap, Escape, focus restore를 테스트한다.

---

## T-62. Reduced Motion Untested

### 모션 설정 사용자가 페이지 전환을 그대로 경험

### 개선

`prefers-reduced-motion` 조건을 자동 또는 수동 검증한다.

---

## T-63. High Contrast Untested

### 색 대비 수치만 통과하지만 상태 구분이 사라짐

### 개선

링크, badge, current TOC, warning을 실제로 확인한다.

---

## T-64. Screen Reader Label Snapshot

### `aria-label` 존재 여부만 검사

### 문제

문구가 실제 행동과 맞는지 모른다.

### 개선

대표 상호작용의 accessible name을 의미 수준으로 검토한다.

---

## T-65. Semantic HTML Replaced by ARIA Tests

### role이 있으니 올바른 구조라고 판단

### 개선

native element 사용 여부를 우선 검사한다.

---

# 콘텐츠 품질 테스트

## T-66. Grammar Linter as Technical Validator

### 맞춤법이 맞으면 좋은 글

### 문제

기술적 오류와 논리적 비약은 잡지 못한다.

### 개선

문체 검사와 기술 검증을 분리한다.

---

## T-67. Minimum Word Count Rule

### 1,000자 미만이면 실패

### 문제

짧고 유용한 Reference와 Debug Note를 불필요하게 늘리게 된다.

### 개선

콘텐츠 타입별 최소 완결성을 평가한다.

---

## T-68. Required Section Checklist Everywhere

### 모든 글에 서론·장점·단점·결론 강제

### 문제

콘텐츠가 획일화된다.

### 개선

유형별 필수 요소만 검사한다.

---

## T-69. Description Length as Quality

### meta description 글자 수만 검사

### 문제

길이는 적절하지만 제목을 반복할 수 있다.

### 개선

제목과 description 중복도, 고유 정보 포함 여부를 함께 본다.

---

## T-70. Duplicate Detector by Text Similarity Alone

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

## T-71. AI Detector as Quality Gate

### AI 작성 가능성이 높으면 발행 차단

### 문제

탐지 정확성이 낮고 실제 품질과 직접 연결되지 않는다.

### 개선

근거·독창성·환경·검증 흔적을 평가한다.

---

## T-72. Citation Count as Trust Score

### 출처가 많을수록 좋은 글

### 문제

자료 나열형 글이 유리해진다.

### 개선

핵심 주장과 출처의 대응을 본다.

---

## T-73. Environment Section Presence Only

### 환경 항목이 존재하면 재현 가능하다고 판단

### 문제

값이 부정확하거나 핵심 설정이 빠질 수 있다.

### 개선

실험 유형별 필요한 환경 필드를 검증한다.

---

## T-74. Updated Date Automatically Means Verified

### 파일 수정 시 `lastVerified`도 자동 갱신

### 문제

실제 테스트 없이 최신 상태가 된다.

### 개선

검증일은 명시적 사람 행동으로만 바뀌게 한다.

---

## T-75. Broken Claim Detection by Keyword

### “항상”, “절대” 같은 단어만 경고

### 문제

문맥에 따라 정상일 수 있고, 더 미묘한 과장 표현은 놓친다.

### 개선

자동화는 후보를 표시하고 최종 판단은 사람에게 맡긴다.

---

# 메타데이터와 그래프 검증

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

# 생성 자산 검증

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

# 보안 테스트

## T-95. Dependency Scan Only Security Test

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

## T-96. No Secret Scan in Content

### 코드만 secret scan

### 문제

Markdown 코드 블록과 로그에도 실제 token이 들어갈 수 있다.

### 개선

콘텐츠 파일과 이미지 metadata까지 범위를 검토한다.

---

## T-97. CSP Header Presence Only

### CSP가 있으면 통과

### 문제

`unsafe-inline *`처럼 사실상 무의미할 수 있다.

### 개선

금지 directive와 허용 source 목록을 검사한다.

---

## T-98. Admin Route Hidden Test

### 메뉴에 없으면 안전

### 개선

production artifact에 admin 코드와 route가 실제로 없는지 검사한다.

---

## T-99. Workflow Permission Not Tested

### GitHub Actions의 기본 권한 변화에 의존

### 개선

workflow에서 `permissions`가 명시됐는지 lint한다.

---

## T-100. Testing System Becomes the Product

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

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Build Success Equals Correctness | 생성 성공과 콘텐츠 품질은 다름 |
| 2 | Content Is Not Code | 수백 개 Markdown은 사실상 데이터베이스 |
| 3 | No End-to-End Content Pipeline Test | schema부터 검색·관계까지 연결 검증 필요 |
| 4 | Every External Link on Every Commit | 감사 시스템이 CI를 불안정하게 만들 수 있음 |
| 5 | Anchor Links Not Checked | 장문 글 heading 변경 시 깨짐 가능 |
| 6 | No Golden Query Set | 검색 인덱스 개선 효과를 비교하기 어려움 |
| 7 | Search Test Ignores Content Status | 구판 노출 방지 필요 |
| 8 | No Visual Regression Test | 카드·코드·표·다이어그램 UI 변경이 많음 |
| 9 | Desktop-Only Screenshot | 모바일 코드·표 문제가 핵심 |
| 10 | Automated Accessibility Equals Accessible | 검색 modal과 ClientRouter는 수동 확인 필요 |
| 11 | Minimum Word Count Rule | 애드센스 대응 중 글 부풀리기 방지 |
| 12 | Updated Date Automatically Means Verified | 기술 문서 신뢰도에 직접 영향 |
| 13 | Superseded Article Remains Featured | 콘텐츠 상태와 노출 정책 검증 필요 |
| 14 | Search Manifest and Page Set Diverge | 삭제·Draft 글 검색 노출 방지 |
| 15 | Testing System Becomes the Product | 개인 블로그에 과도한 QA 플랫폼 방지 |

# 추천 최소 테스트 피라미드

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

# 이번 단계의 핵심 결론

기술 블로그 테스트의 목표는 모든 변화를 막는 것이 아니다.

> **깨지면 사용자가 지식을 잘못 이해하거나, 중요한 문서를 찾지 못하거나, 운영자가 대량 오류를 놓치는 부분을 우선 보호하는 것**이다.

따라서 가장 가치 있는 테스트 대상은 컴포넌트 내부 구현보다 다음이다.

```text
콘텐츠 schema
URL
내부 링크
검색 순위
문서 상태
생성 자산
모바일 읽기
접근성
```

다음 단계는 **Task 2-14. Resilience, Backup, Portability & Long-Term Preservation Anti-patterns**로 이어가면 된다. GitHub·Astro·외부 서비스 장애, 콘텐츠 백업, URL 보존, 포맷 이식성, 장기 아카이빙 문제를 다루는 단계다.

## 41. assistant

# Task 2-14. Resilience, Backup, Portability & Long-Term Preservation Anti-patterns

이번에는 **GitHub·Astro·외부 서비스 장애, 콘텐츠 백업, URL 보존, 포맷 이식성, 장기 아카이빙**을 다룬다.

핵심은 이거다.

> 지금 배포되는가보다, **5년 뒤에도 읽히고 복구되고 옮겨질 수 있는가**가 더 중요하다.

---

## R-01. Git Is the Backup

### Git 저장소가 있으니 백업이 끝났다고 생각

### 문제

Git은 변경 이력 관리에는 강하지만 다음을 모두 보장하지는 않는다.

- 계정 탈취 대응
- 저장소 삭제
- 조직 정책 변경
- LFS 객체 보존
- 외부 생성 자산 보존
- GitHub Discussions 댓글 보존
- 배포 설정 복구
- 도메인 설정 복구

### 개선

```text
원본 콘텐츠
저장소 metadata
생성 자산
배포 설정
도메인 설정
외부 서비스 데이터
```

를 별도 자산으로 보고 백업한다.

---

## R-02. Single Remote Dependency

### GitHub 한 곳에만 원격 저장소 존재

### 문제

계정·서비스·정책 문제 발생 시 즉시 대체하기 어렵다.

### 개선

읽기 전용 mirror를 하나 더 둔다.

```text
GitHub
+
로컬 bare repository
또는
다른 Git hosting mirror
```

---

## R-03. Local Clone as Backup

### 개발 PC의 clone을 백업으로 간주

### 문제

clone은 다음 이유로 완전한 백업이 아닐 수 있다.

- 일부 branch·tag 미수신
- shallow clone
- LFS 미다운로드
- untracked 파일 누락
- 같은 디스크 장애
- 자동 검증 없음

### 개선

정기적인 bare mirror와 복구 테스트를 사용한다.

---

## R-04. Backup Without Restore Test

### 백업은 만들지만 실제 복구를 해보지 않음

### 문제

손상·누락·권한 문제를 장애 시점에 처음 발견한다.

### 개선

분기별 또는 반기별로 임시 디렉터리에서 다음을 수행한다.

```text
clone or restore
dependency install
production build
대표 페이지 확인
```

---

## R-05. Backup Without Inventory

### 무엇을 백업하는지 목록이 없음

### 문제

Markdown만 보존하고 다음을 잃을 수 있다.

- 이미지 원본
- redirect map
- taxonomy registry
- OG source
- GitHub Actions
- domain configuration
- analytics export

### 개선

복구에 필요한 자산 목록을 문서화한다.

---

## R-06. Repository Backup Without Secrets Recovery Plan

### 저장소는 복구했지만 배포 credentials가 없음

### 문제

운영 복구가 지연된다.

### 개선

secret 값 자체를 문서에 저장하지 않고:

```text
secret 이름
용도
발급 위치
권한
회전 방법
복구 담당 절차
```

를 기록한다.

---

## R-07. Backup Includes Live Secrets

### 편의를 위해 `.env`와 token까지 통째로 백업

### 문제

백업 매체가 새로운 secret 유출 경로가 된다.

### 개선

콘텐츠 백업과 credential 관리 체계를 분리한다.

---

## R-08. Generated Site as the Only Backup

### `dist/` 결과만 보존

### 문제

최종 HTML은 남지만 다음을 잃는다.

- 원본 Markdown
- metadata
- 시리즈 관계
- 검색 source
- 다이어그램 원본
- 수정 가능한 구조

### 개선

생성 결과는 보조 스냅샷이고 원본을 대체하지 않는다.

---

## R-09. Source Only, No Rendered Snapshot

### 원본만 있으면 언제든 재생성 가능하다고 생각

### 문제

미래에 다음이 사라질 수 있다.

- 특정 Node 버전
- 오래된 package
- font
- LaTeX 환경
- Expressive Code 동작
- 외부 CDN 자산

### 개선

중요한 릴리스는 렌더링된 정적 artifact도 함께 보존한다.

---

## R-10. Same Failure Domain Backup

### 원본과 백업이 같은 계정·클라우드·기기에 있음

### 문제

계정 정지, 랜섬웨어, 디스크 장애가 동시에 영향을 준다.

### 개선

최소 하나는 다른 failure domain에 둔다.

---

# 배포 복구

## R-11. Deployment Is Rebuilt Manually

### 장애가 나면 기억에 의존해 다시 설정

### 문제

- Pages 설정
- custom domain
- HTTPS
- workflow permissions
- branch 설정

을 놓치기 쉽다.

### 개선

배포 절차와 설정을 가능한 한 코드와 runbook으로 남긴다.

---

## R-12. No Known-Good Artifact

### 최신 main만 배포 가능

### 문제

새 빌드 도구가 깨졌을 때 이전 사이트로 즉시 되돌릴 수 없다.

### 개선

최근 정상 배포 artifact와 commit SHA를 보존한다.

---

## R-13. Rollback Means Revert Everything

### 콘텐츠 오타와 플랫폼 장애를 같은 방식으로 rollback

### 문제

불필요한 변경까지 되돌릴 수 있다.

### 개선

다음을 구분한다.

```text
콘텐츠 rollback
플랫폼 rollback
배포 artifact rollback
DNS rollback
```

---

## R-14. Rollback Untested

### 이론상 이전 commit으로 돌아갈 수 있음

### 문제

현재 dependency와 workflow가 과거 commit을 더 이상 빌드하지 못할 수 있다.

### 개선

기존 artifact를 재사용할 수 있는 배포 경로를 둔다.

---

## R-15. Deploy From Mutable Environment

### 로컬 PC에서 수동으로 build 후 배포

### 문제

환경 차이와 재현성 부족이 생긴다.

### 개선

가능하면 고정된 CI 환경에서 배포 artifact를 생성한다.

---

## R-16. No Post-Restore Validation

### 사이트가 열리면 복구 성공

### 문제

다음이 조용히 깨질 수 있다.

- 검색
- Sitemap
- canonical
- OG 이미지
- 댓글
- 내부 링크

### 개선

복구 smoke test 목록을 둔다.

---

## R-17. Domain Recovery Ignored

### 저장소 복구만 준비

### 문제

도메인 등록자 계정, DNS, 인증서 문제가 더 큰 장애가 될 수 있다.

### 개선

도메인 소유권·등록자·DNS 레코드·만료일 복구 절차를 관리한다.

---

## R-18. Automatic Renewal Assumption

### 도메인이 자동 갱신되니 신경 쓰지 않음

### 문제

결제 수단 만료·계정 잠금·이메일 접근 상실로 실패할 수 있다.

### 개선

만료 알림과 대체 연락 경로를 둔다.

---

## R-19. DNS Records Undocumented

### 현재 DNS 설정을 대시보드에서만 확인 가능

### 개선

민감하지 않은 DNS 구조를 문서나 export로 보존한다.

---

## R-20. No Emergency Static Host

### GitHub Pages 장애 시 대체 배포 경로 없음

### 개선

`dist/`만 있으면 다른 정적 호스팅에 올릴 수 있도록 host-specific coupling을 줄인다.

---

# 외부 서비스 회복력

## R-21. Comments as Permanent Knowledge

### 중요한 정정·답변을 Giscus 댓글에만 남김

### 문제

댓글 서비스가 사라지거나 연결이 깨지면 지식도 사라진다.

### 개선

중요한 정정과 반복 질문은 본문으로 승격한다.

---

## R-22. Analytics as Historical Archive

### Analytics 서비스가 모든 방문 기록을 영구 보존한다고 가정

### 문제

보존 기간·계정 변경·서비스 종료로 데이터가 사라질 수 있다.

### 개선

정말 필요한 장기 지표만 정기적으로 집계해 별도 보존한다.

---

## R-23. External Image Hotlinking

### 외부 이미지 URL을 직접 사용

### 문제

- 원본 삭제
- URL 변경
- 접근 차단
- 추적
- 이미지 내용 교체

가능성이 있다.

### 개선

라이선스가 허용되고 장기 가치가 있는 자산은 자체 관리한다.

---

## R-24. External Script as Required Functionality

### 검색·내비게이션이 외부 CDN 장애에 의존

### 개선

핵심 기능은 자체 정적 자산으로 제공하고 외부 script는 보조 기능으로 제한한다.

---

## R-25. External Font Dependency

### 폰트 CDN 장애 시 레이아웃이 크게 깨짐

### 개선

합리적인 시스템 폰트 fallback과 크기 호환성을 확보한다.

---

## R-26. Newsletter Provider Lock-In

### 구독자 목록과 폼이 특정 서비스에만 존재

### 문제

서비스 변경 시 구독자 이전과 동의 증빙이 어려울 수 있다.

### 개선

필요한 데이터 export 가능성과 이전 절차를 확인한다.

---

## R-27. Search Service Lock-In

### 외부 검색 API 없이는 콘텐츠를 찾을 수 없음

### 개선

최소한의 정적 Topic·검색 fallback을 유지한다.

---

## R-28. Social Platform as Discovery Backbone

### 외부 SNS 게시물 없이는 과거 글 발견이 어려움

### 문제

플랫폼 정책과 계정 상태에 영향을 받는다.

### 개선

사이트 내부 허브와 RSS를 주요 발견 경로로 유지한다.

---

## R-29. AdSense Script Failure Breaks Layout

### 광고가 로드되지 않으면 큰 빈 공간이나 오류 발생

### 개선

광고는 실패해도 문서 레이아웃과 탐색이 정상이어야 한다.

---

## R-30. OAuth Provider as Admin Availability

### GitHub OAuth가 장애면 콘텐츠 작성도 불가능

### 개선

로컬 Git 기반 작성 경로를 항상 유지한다.

---

# 포맷 이식성

## R-31. Framework-Specific Content

### Markdown에 Astro 전용 컴포넌트가 다수 포함

### 문제

다른 정적 사이트 생성기로 이동하기 어렵다.

### 개선

일반 글은 표준 Markdown과 제한된 확장으로 유지한다.

---

## R-32. MDX Component Lock-In

### 문서 의미가 특정 UI 컴포넌트에 의존

```mdx
<BenchmarkResult />
<InteractiveDiagram />
```

### 문제

컴포넌트 없이는 콘텐츠가 불완전해진다.

### 개선

핵심 정보는 Markdown에도 남기고 컴포넌트는 향상 기능으로 사용한다.

---

## R-33. Custom Directive Without Fallback

### 전용 parser가 없으면 내용을 이해할 수 없음

### 개선

원문 자체가 최소한 읽을 수 있는 문법을 선택한다.

---

## R-34. HTML Embedded for Layout

### 표·열·카드를 만들기 위해 복잡한 HTML 사용

### 문제

다른 renderer와 EPUB·PDF 변환에서 깨지기 쉽다.

### 개선

의미 구조와 화면 배치를 분리한다.

---

## R-35. CSS Class in Content

```html
<div class="grid-cols-3 dark:bg-zinc-900">
```

### 문제

테마와 Tailwind 버전에 강하게 결합된다.

### 개선

콘텐츠에는 의미 역할만 남기고 스타일은 renderer에서 처리한다.

---

## R-36. File Path as Public Identity

### 글 ID가 물리적 경로와 동일

### 문제

콘텐츠 이동이 public identity 변경이 된다.

### 개선

안정적인 content ID와 slug를 분리한다.

---

## R-37. Front Matter Parser Lock-In

### 특정 YAML extension이나 custom type에 의존

### 문제

다른 도구에서 해석이 달라진다.

### 개선

단순하고 널리 지원되는 scalar·array·object를 사용한다.

---

## R-38. Date Stored in Ambiguous Format

```yaml
date: 08/01/26
```

### 문제

도구와 locale에 따라 다르게 해석된다.

### 개선

ISO 8601 형식을 사용한다.

---

## R-39. Implicit Metadata Derived From Filename

### 날짜·순서·언어를 파일명 규칙만으로 추론

### 문제

파일 이동과 이름 변경이 의미 변경으로 이어진다.

### 개선

중요한 의미는 metadata에 명시하고 파일명은 저장 편의로 사용한다.

---

## R-40. Binary Source Format

### 다이어그램 원본이 독점 binary 파일뿐

### 문제

향후 도구 없이 수정하기 어렵다.

### 개선

가능하면 텍스트 기반 원본을 함께 보존한다.

---

# 미디어와 다이어그램 보존

## R-41. Only Generated Diagram Kept

### SVG 결과만 있고 원본 source 없음

### 문제

수정과 재생성이 어렵다.

### 개선

```text
diagram source
generator version
generated output
```

관계를 보존한다.

---

## R-42. Only Source Diagram Kept

### 생성 결과는 매번 도구로 만들어야 함

### 문제

도구가 사라지면 과거 사이트를 재현하지 못한다.

### 개선

중요한 release에는 결과물도 함께 보존한다.

---

## R-43. Unversioned Diagram Toolchain

### 어떤 TikZ·Graphviz 버전을 사용했는지 모름

### 문제

미래에 레이아웃과 폰트가 달라질 수 있다.

### 개선

generator version을 manifest에 기록한다.

---

## R-44. External Asset by Mutable URL

### `latest`, raw branch URL 같은 변경 가능한 주소 사용

### 문제

과거 글의 이미지나 코드가 미래에 달라질 수 있다.

### 개선

고정된 commit·release·자체 snapshot을 사용한다.

---

## R-45. Screenshot Without Source Context

### 화면 캡처만 있고 재현 명령과 버전 없음

### 문제

나중에 무엇을 보여주는지 판단하기 어렵다.

### 개선

캡션 또는 metadata에 환경과 출처를 남긴다.

---

## R-46. Lossy Re-encoding Loop

### 이미지 최적화 과정이 반복되며 품질 저하

### 개선

원본과 배포용 파생 파일을 분리한다.

---

## R-47. No Original Image Preservation

### WebP 변환 후 원본 삭제

### 문제

다른 크기·형식으로 다시 만들 때 품질이 떨어진다.

### 개선

중요 자산의 무손실 또는 고품질 원본을 별도 보존한다.

---

## R-48. Font-Dependent SVG

### 특정 시스템 폰트가 없으면 라벨 위치가 깨짐

### 개선

폰트 라이선스를 고려해 경로 변환 또는 안전한 fallback 전략을 선택한다.

---

## R-49. Diagram Text as Paths Only

### 모든 글자를 path로 변환

### 장점

렌더링 일관성.

### 단점

- 검색 불가
- 접근성 저하
- 수정 어려움
- 파일 크기 증가

### 개선

장기 보존과 접근성 요구를 고려해 선택한다.

---

## R-50. Media Without Checksums

### 백업된 자산이 손상됐는지 알 수 없음

### 개선

중요 archive에는 manifest와 checksum을 사용할 수 있다.

---

# URL 영속성

## R-51. URL Changes With Every Taxonomy Refactor

### Category를 바꿀 때 URL도 바뀜

### 문제

외부 링크와 검색 유입이 지속적으로 깨진다.

### 개선

URL은 콘텐츠 정체성을, taxonomy는 탐색을 담당하게 분리한다.

---

## R-52. Date-Based URL Lock-In

```text
/2026/08/01/post/
```

### 문제

수정·통합 후에도 오래된 날짜 구조가 남고 URL이 불필요하게 길다.

### 개선

날짜가 콘텐츠 의미에 중요하지 않다면 안정적인 slug 중심 URL을 고려한다.

기존 URL은 유지한다.

---

## R-53. Title-Derived Slug Mutation

### 제목을 개선할 때 slug도 바꿈

### 개선

제목과 URL 수명주기를 분리한다.

---

## R-54. No Redirect Registry

### redirect가 config 여러 곳에 흩어짐

### 문제

중복·cycle·chain을 관리하기 어렵다.

### 개선

단일 redirect manifest를 둔다.

---

## R-55. Redirect Chain Accumulation

```text
old-a → old-b → new-c
```

### 개선

모든 이전 URL을 최종 URL로 직접 연결한다.

---

## R-56. Redirect Provider Lock-In

### 특정 hosting 설정에만 redirect가 존재

### 문제

호스팅 이전 시 URL 보존이 깨진다.

### 개선

host-neutral redirect manifest에서 각 플랫폼 설정을 생성한다.

---

## R-57. Canonical Depends on Runtime Host

### preview 환경이나 custom domain 변경 시 canonical이 잘못됨

### 개선

production canonical origin을 명시적으로 관리한다.

---

## R-58. Anchor Instability

### heading 문구 변경 때 section URL이 깨짐

### 개선

중요한 장에는 안정적인 explicit ID를 고려한다.

모든 heading을 수동 ID로 만들 필요는 없다.

---

## R-59. Duplicate Anchor Renumbering

### 앞쪽에 같은 heading을 추가하면 기존 `-2`, `-3` anchor가 변경

### 개선

외부 참조가 많은 주요 절은 명시적 anchor를 둔다.

---

## R-60. Deleted URL Forgotten

### 글을 삭제하고 redirect·410·대체 안내 없이 방치

### 개선

삭제 결정마다 URL 처리 정책을 함께 기록한다.

---

# 장기 기술 정확성

## R-61. Current State Overwrites History

### 최신 동작으로 글을 수정하며 과거 동작을 모두 제거

### 문제

이전 시스템을 유지하는 독자와 기술 변천 기록이 사라진다.

### 개선

버전 차이를 보존하거나 과거 문서를 Historical로 유지한다.

---

## R-62. Historical Article Looks Current

### 오래된 환경을 다룬 글이 상태 표시 없이 남음

### 개선

대상 버전과 현재 상태를 명확히 표시한다.

---

## R-63. Link to Latest Documentation

### 항상 최신 문서 URL만 연결

### 문제

과거 버전 글의 근거가 미래에 달라질 수 있다.

### 개선

가능하면 versioned documentation이나 snapshot을 사용한다.

---

## R-64. Source Link to Main Branch

### 소스코드 분석 글이 `main` branch를 참조

### 문제

미래에 코드가 바뀌면 글과 링크가 불일치한다.

### 개선

tag 또는 commit permalink를 사용한다.

---

## R-65. Spec Reference Without Revision

### “CXL Specification에 따르면”만 기록

### 문제

개정판마다 내용과 절 번호가 달라질 수 있다.

### 개선

사양 이름·revision·가능하면 section을 기록한다.

---

## R-66. Benchmark Without Preservation Data

### 그래프만 남고 raw result·환경·실행 script가 없음

### 문제

나중에 결과를 재해석하거나 재현할 수 없다.

### 개선

중요 실험은 다음을 보존한다.

```text
source
build options
environment
raw measurements
analysis script
```

---

## R-67. Environment Captured as Free Text Only

### “Ubuntu에서 테스트” 정도만 기록

### 문제

미래에 재현하기 어렵다.

### 개선

구조화된 핵심 환경 metadata와 설명을 함께 사용한다.

---

## R-68. Tool Version Lost

### profiler·compiler·SDK 버전 없음

### 문제

결과 차이의 원인을 추적할 수 없다.

### 개선

실험·디버깅 글에는 주요 도구 버전을 남긴다.

---

## R-69. Reproduction Requires Defunct Hardware

### 특정 장비에서만 재현 가능하지만 대체 설명이 없음

### 개선

- 관찰 결과
- 핵심 register/log
- 일반화 가능한 원리
- 대체 가능한 시뮬레이션

을 남긴다.

---

## R-70. External Evidence Disappears

### 근거가 사라진 forum·issue 링크뿐

### 개선

저작권을 침해하지 않는 범위에서 핵심 사실과 문맥을 자체 설명하고 링크는 출처로 사용한다.

---

# 플랫폼 이전

## R-71. No Export Path

### 현재 Astro 프로젝트에서 콘텐츠를 꺼내는 방법이 없음

### 개선

콘텐츠 manifest를 다음처럼 표준 형식으로 생성할 수 있게 한다.

```text
JSON
Markdown directory
RSS/Atom
static HTML
```

---

## R-72. Export Loses Relationships

### Markdown만 복사하면 시리즈·Topic·redirect 관계가 사라짐

### 개선

taxonomy와 graph manifest도 export 대상에 포함한다.

---

## R-73. Export Depends on Building the Whole Site

### export를 위해 현재 toolchain 전체가 필요

### 문제

프로젝트가 깨진 뒤에는 내보내기조차 어려워진다.

### 개선

가벼운 독립 export script를 유지한다.

---

## R-74. Content IDs Not Stable

### 새로운 시스템으로 옮기면 문서 identity가 바뀜

### 문제

댓글·redirect·관계·번역 연결이 깨진다.

### 개선

framework와 무관한 안정적 content ID를 둔다.

---

## R-75. Search Data Is Non-Portable

### 특정 검색 library 전용 index만 존재

### 개선

정제된 검색 document manifest를 원본으로 두고 library index는 파생한다.

---

## R-76. Theme Contains Business Logic

### publication status·canonical·관계 계산이 UI component에 묶임

### 문제

테마를 바꾸면 콘텐츠 규칙도 다시 구현해야 한다.

### 개선

콘텐츠 정책을 독립 모듈 또는 manifest 단계에 둔다.

---

## R-77. Build Scripts Assume Repository Name

### 경로와 URL이 `hawk90.github.io`에 하드코딩

### 문제

fork·mirror·새 domain 이전이 어렵다.

### 개선

site identity와 path를 config에서 주입한다.

---

## R-78. GitHub Pages Assumptions Everywhere

### base path·404·redirect·deployment branch 규칙이 코드 곳곳에 존재

### 개선

hosting adapter와 핵심 사이트 로직을 분리한다.

---

## R-79. No Alternative Render Test

### 콘텐츠가 현재 Astro에서만 읽히는지 확인

### 개선

대표 Markdown을 GitHub renderer나 일반 parser에서도 정기적으로 확인할 수 있다.

---

## R-80. Migration Rewrite Temptation

### 플랫폼 이전 시 콘텐츠와 URL까지 전면 재작성

### 문제

여러 위험이 한 번에 겹친다.

### 개선

```text
1. 동일 콘텐츠·동일 URL로 이전
2. 안정화
3. 정보 구조 개선
```

순서를 권장한다.

---

# 아카이빙

## R-81. Live Site Is the Archive

### 운영 사이트가 과거 상태도 보존한다고 생각

### 문제

업데이트와 삭제로 과거 맥락이 사라진다.

### 개선

중요한 시점의 정적 snapshot을 별도 보존한다.

---

## R-82. Archive Without Discovery

### snapshot은 있지만 어디 있는지 모름

### 개선

릴리스 tag나 archive manifest로 시점과 위치를 기록한다.

---

## R-83. Archive Every Build

### 모든 commit의 전체 정적 사이트를 영구 보존

### 문제

저장 비용과 관리 노이즈가 커진다.

### 개선

다음 시점만 선택할 수 있다.

```text
주요 리디자인
대규모 migration 전
연간 snapshot
중요 콘텐츠 release
```

---

## R-84. Archive Without Checksums

### 파일이 장기간 손상됐는지 확인 불가

### 개선

중요 snapshot에 checksum manifest를 둔다.

---

## R-85. Archive Uses Proprietary Container Only

### 특정 backup 제품 없이는 복원 불가

### 개선

일반 tar·zip·Git bundle·정적 파일처럼 널리 읽을 수 있는 포맷을 병행한다.

---

## R-86. No Offline Readability

### 모든 CSS·font·script가 외부에 있어 snapshot이 독립적으로 열리지 않음

### 개선

장기 보존 snapshot은 필요한 핵심 자산을 자체 포함한다.

---

## R-87. Archive Excludes Redirect History

### 최종 글만 보존하고 이전 URL 관계를 잃음

### 개선

redirect manifest도 archive에 포함한다.

---

## R-88. Archive Excludes Comments and Corrections

### 본문 snapshot은 있지만 중요한 정정은 외부 댓글에만 있음

### 개선

핵심 정정은 본문 변경 이력에 반영한다.

---

## R-89. No Human-Readable Manifest

### 파일은 많지만 어떤 snapshot인지 모름

### 개선

```text
site version
commit SHA
build date
tool versions
content count
known limitations
```

을 기록한다.

---

## R-90. Preservation System Becomes the Product

### 완벽한 디지털 보존 플랫폼을 구축

### 문제

개인 블로그 운영 비용을 초과한다.

### 개선

현실적인 보존 단위를 선택한다.

```text
Git mirror
연간 static snapshot
원본 이미지
redirect manifest
복구 문서
```

---

# 장애 대응

## R-91. No Failure Classification

### 모든 장애를 “사이트 안 됨”으로 처리

### 개선

```text
Build failure
Deploy failure
DNS failure
Content corruption
External integration failure
Account compromise
```

로 구분한다.

---

## R-92. No Recovery Priority

### 모든 기능을 동시에 복구하려 함

### 개선 순서

```text
1. 핵심 정적 본문
2. URL·HTTPS
3. 검색·Sitemap
4. 이미지
5. 댓글·광고·분석
```

---

## R-93. Comments Delay Site Recovery

### Giscus 복구까지 사이트 공개를 미룸

### 개선

외부 기능 없이도 핵심 사이트를 먼저 복구한다.

---

## R-94. Analytics Required for Deployment

### 분석 script 설정 오류가 build를 막음

### 개선

분석·광고는 선택적 integration으로 취급한다.

---

## R-95. Recovery Changes Canonical URLs

### 임시 호스트에서 복구하면서 해당 URL을 canonical로 출력

### 문제

검색 신호가 임시 domain으로 이동할 수 있다.

### 개선

임시 복구 환경과 production canonical 정책을 분리한다.

---

## R-96. Emergency Host Indexed

### 임시 복구 사이트가 검색에 노출

### 개선

필요하면 `noindex`하고 원래 domain 복구 후 종료한다.

---

## R-97. Incident Fix Without Root Cause

### 재배포해 정상화되면 종료

### 문제

같은 장애가 반복된다.

### 개선

짧은 incident note를 남긴다.

```text
원인
영향
복구
재발 방지
```

---

## R-98. No Account Recovery Preparation

### GitHub·도메인·이메일 계정 복구 경로가 없음

### 개선

복구 이메일, 2FA backup code, 보안키 등 계정 복구 수단을 안전하게 관리한다.

---

## R-99. Single Maintainer Knowledge

### 모든 복구 절차가 기억 속에만 있음

개인 사이트라도 몇 년 뒤의 본인은 사실상 다른 운영자다.

### 개선

짧은 운영·복구 문서를 남긴다.

---

## R-100. Resilience Work Prevents Publishing

### 장애 대비를 완벽히 하느라 콘텐츠 작업이 멈춤

### 개선

최소 기준선에서 멈춘다.

```text
두 번째 Git mirror
정기 static snapshot
redirect manifest
복구 가능한 build 환경
핵심 runbook
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Git Is the Backup | GitHub 한 곳만으로는 전체 운영 복구가 안 됨 |
| 2 | Backup Without Restore Test | 실제 build·배포 가능 여부가 중요 |
| 3 | Source Only, No Rendered Snapshot | 현재 복잡한 toolchain을 미래에 재현하지 못할 수 있음 |
| 4 | No Known-Good Artifact | Astro·Node·Shiki 업그레이드 실패 시 즉시 rollback 필요 |
| 5 | Comments as Permanent Knowledge | Giscus의 중요한 정정은 본문으로 승격해야 함 |
| 6 | Framework-Specific Content | 순수 Markdown 이식성을 계속 지켜야 함 |
| 7 | File Path as Public Identity | 분류 개편과 URL 변경을 분리해야 함 |
| 8 | Only Generated Diagram Kept | TikZ·SVG 원본과 결과를 함께 관리해야 함 |
| 9 | URL Changes With Taxonomy Refactor | 기존 검색 유입과 외부 링크 보존 핵심 |
| 10 | Source Link to Main Branch | 소스 분석 글은 commit permalink가 필요 |
| 11 | Spec Reference Without Revision | CXL·PCIe·UEFI 문서의 장기 정확성에 중요 |
| 12 | Search Data Is Non-Portable | 검색 라이브러리보다 검색 document manifest가 원본이어야 함 |
| 13 | GitHub Pages Assumptions Everywhere | 향후 다른 정적 host로 이전 가능해야 함 |
| 14 | No Account Recovery Preparation | GitHub·도메인 계정 상실이 가장 큰 단일 장애가 될 수 있음 |
| 15 | Preservation System Becomes the Product | 실제 콘텐츠보다 백업 플랫폼이 커지지 않게 제한 |

# 추천 최소 복원력 기준선

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

# 이번 단계의 핵심 결론

장기 보존에서 가장 중요한 것은 모든 기술을 영구히 유지하는 것이 아니다.

> **콘텐츠 원본, 문서 정체성, URL 관계, 생성 결과를 서로 분리해 보존하는 것**이 핵심이다.

`hawk90.github.io`에 적합한 방향은 거대한 백업 시스템이 아니라 다음이다.

```text
순수 Markdown 우선
안정적인 content ID와 URL
Git mirror
연간 정적 snapshot
원본 다이어그램 보존
재현 가능한 build metadata
외부 서비스 없는 fallback
```

이 정도만 갖춰도 프레임워크·호스팅·외부 서비스가 바뀌더라도 기술 지식 자산은 오래 유지할 수 있다.

## 42. assistant

# Task 2-15. Anti-pattern Detection, Prioritization & Remediation Anti-patterns

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

# 탐지 방식

## D-11. Detection by Intuition Only

### 눈으로 보고 느낌으로 판단

### 문제

- 규모를 과대·과소평가
- 최근 본 문제에 편향
- 반복 측정 불가
- 개선 전후 비교 불가

### 개선

정성 판단과 간단한 수치를 함께 사용한다.

```text
글 수
고아 문서 수
검색 인덱스 크기
build peak memory
중복 Topic 후보
색인 페이지 유형
```

---

## D-12. Metrics-Only Detection

### 수치가 임계치를 넘으면 무조건 문제

예:

```text
3분 글 → Thin Content
내부 링크 2개 → 고아에 가까움
코드 블록 100개 → 과도함
```

### 문제

콘텐츠 역할과 고유 가치를 놓친다.

### 개선

수치는 검토 후보를 찾는 데 사용하고 최종 판단은 문맥을 본다.

---

## D-13. Threshold by Guess

### 근거 없이 임계값 설정

```text
태그는 최대 50개
글은 최소 1,500자
검색 인덱스는 1MB 이하
```

### 개선

현재 baseline과 사용자 환경을 기준으로 정한다.

---

## D-14. Single Snapshot Diagnosis

### 한 시점의 상태만 보고 결론

### 문제

증가 추세와 일시적 현상을 구분하지 못한다.

### 개선

다음을 함께 본다.

```text
현재값
변화 추세
최근 구조 변경
예상 성장률
```

---

## D-15. Repository-Only Diagnosis

### 코드와 파일만 보고 사이트 전체를 판단

### 놓칠 수 있는 것

- 실제 렌더링
- 모바일 사용성
- Search Console 상태
- 페이지 속도
- 검색 정확도
- 사용자 이동

### 개선

최소한 네 층을 함께 본다.

```text
저장소
빌드 결과
실제 사이트
운영 데이터
```

---

## D-16. Production-Only Diagnosis

### 공개 화면만 보고 내부 원인을 추정

### 문제

같은 UI 증상도 여러 구현 원인이 있을 수 있다.

### 개선

실제 config, content schema, build script와 함께 분석한다.

---

## D-17. Sample Bias

### 최근 글 몇 개만 보고 전체 콘텐츠 판단

### 문제

최근 CXL 글의 특성이 과거 C++·CUDA 글과 다를 수 있다.

### 개선

표본을 콘텐츠 유형과 연도별로 나눈다.

```text
최근 글
오래된 글
대표 글
짧은 글
장문 글
실험 글
디버깅 글
```

---

## D-18. Worst-Case Generalization

### 가장 나쁜 글 하나로 전체 사이트를 평가

### 개선

단일 오류와 반복 패턴을 구분한다.

---

## D-19. Average Hides Tail Risk

### 평균값만 봄

예:

```text
평균 빌드 시간
평균 이미지 크기
평균 코드 블록 수
```

### 문제

몇 개의 극단적인 글이 실제 병목일 수 있다.

### 개선

median, p95, 최대값과 상위 문제 문서를 함께 본다.

---

## D-20. Detection Without Reproduction

### 문제라고 말하지만 실제로 재현하지 않음

예:

```text
ClientRouter가 Analytics를 깨뜨릴 수 있다.
검색이 모바일을 멈추게 할 수 있다.
```

### 문제

가능성과 실제 문제를 혼동한다.

### 개선

다음 상태를 구분한다.

```text
확인된 문제
높은 위험
잠재적 위험
일반적 주의사항
```

---

# 분류와 명명

## D-21. Duplicate Anti-pattern Names

### 같은 현상을 여러 이름으로 기록

예:

```text
Article Warehouse
Content Warehouse
Post Archive Problem
Flat Content Collection
```

### 문제

카탈로그가 커지지만 실제 범주는 늘지 않는다.

### 개선

canonical ID와 alias를 둔다.

---

## D-22. One Anti-pattern Covers Everything

### 너무 넓은 항목

```text
Poor Architecture
Bad SEO
Bad UX
```

### 문제

실행 가능한 개선으로 연결되지 않는다.

### 개선

하나의 항목은 하나의 관찰 가능한 구조와 주된 결과를 다룬다.

---

## D-23. Micro-pattern Explosion

### 지나치게 세분화

예:

```text
복사 버튼이 로그에 있음
복사 버튼이 1줄 코드에 있음
복사 버튼이 모바일에서 겹침
```

### 문제

관리할 항목 수가 불필요하게 늘어난다.

### 개선

공통 원인을 가진 항목은 하나의 상위 패턴과 변형으로 묶는다.

---

## D-24. Clever Name, Unclear Meaning

### 재미있는 이름이지만 이해가 어려움

### 개선

이름 아래에 즉시 설명 가능한 한국어 정의를 둔다.

---

## D-25. Name Implies Moral Failure

### 설계 선택을 무능이나 게으름처럼 표현

### 문제

방어적인 반응을 만들고 실제 맥락을 놓친다.

### 개선

비난보다 발생 조건과 비용을 설명한다.

---

## D-26. Classification by Technology Only

```text
Astro 안티패턴
Tailwind 안티패턴
Markdown 안티패턴
```

### 문제

같은 구조 문제가 여러 도구에서 반복된다.

### 개선

문제 축으로 분류한다.

```text
콘텐츠 모델
탐색
빌드
운영
보안
유지보수
```

---

## D-27. Classification Without Cross-References

### 한 항목이 다른 문제와 연결되지 않음

예:

```text
Article Warehouse
→ Orphan Content
→ Search Dependency
→ Thin Tag Pages
```

### 개선

원인과 후속 결과 관계를 표시한다.

---

## D-28. Taxonomy Becomes Hierarchy Debate

### 어느 분류에 넣을지를 오래 고민

### 문제

실제 개선이 지연된다.

### 개선

주 분류 하나와 관련 분류 몇 개면 충분하다.

---

## D-29. Severity Embedded in Name

```text
Critical Tag Explosion
Fatal SPA Blog
```

### 문제

상황별 위험도를 유연하게 평가하기 어렵다.

### 개선

이름과 현재 저장소의 severity를 분리한다.

---

## D-30. Catalog Without Versioning

### 안티패턴 정의가 바뀌어도 기록 없음

### 개선

카탈로그도 다음을 관리할 수 있다.

```text
active
merged
renamed
deprecated
```

복잡한 버전 시스템까지는 필요 없다.

---

# 우선순위

## D-31. Severity-Only Prioritization

### 가장 심각한 문제부터 처리

### 문제

심각하지만 비용이 매우 큰 문제만 남아 실제 진척이 없을 수 있다.

### 개선

최소 네 축으로 평가한다.

```text
영향도
발생 범위
개선 비용
확신도
```

---

## D-32. Easy-Win-Only Prioritization

### 쉬운 문제만 계속 해결

### 증상

- metadata 누락 수정
- 사소한 CSS 정리
- dependency 몇 개 삭제

하지만 Topic Hub와 콘텐츠 통합은 미룸.

### 개선

쉬운 작업과 구조적 작업을 함께 배치한다.

---

## D-33. User Impact Ignored

### 코드가 지저분하다는 이유로 우선 처리

### 문제

독자에게 거의 보이지 않는 정리 작업이 핵심 UX보다 앞설 수 있다.

### 개선

다음 순서로 본다.

```text
정확성·신뢰
발견 가능성
읽기 경험
운영 안정성
내부 코드 미관
```

---

## D-34. Maintenance Cost Ignored

### 사용자에게 보이는 기능만 우선

### 문제

빌드 불안정이나 migration 부채가 나중에 모든 개선을 막을 수 있다.

### 개선

사용자 영향과 미래 작업 차단 위험을 함께 본다.

---

## D-35. Frequency Ignored

### 드물게 발생하는 큰 문제에만 집중

### 문제

매번 글을 쓸 때 발생하는 작은 마찰이 더 큰 총비용을 만들 수 있다.

### 개선

```text
영향 × 빈도
```

를 함께 평가한다.

---

## D-36. Blast Radius Ignored

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

## D-37. Confidence Ignored

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

## D-38. Reversibility Ignored

### 되돌리기 어려운 변경을 쉽게 시행

예:

- URL 전체 변경
- 콘텐츠 전면 migration
- 글 대량 삭제
- taxonomy 전환

### 개선

되돌리기 어려울수록 더 강한 검증과 단계적 rollout을 요구한다.

---

## D-39. Dependency Order Ignored

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

## D-40. Priority Churn

### 새 문제가 보일 때마다 우선순위 변경

### 문제

진행 중 작업이 계속 중단된다.

### 개선

한 sprint 동안은 긴급 오류가 아닌 이상 우선순위를 고정한다.

---

# 점수화

## D-41. False Precision Score

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

## D-42. One Composite Score

### 모든 요소를 하나의 숫자로 합침

### 문제

왜 높은 점수인지 알기 어렵다.

### 개선

영향도·비용·확신도를 별도로 보여준다.

---

## D-43. Score Determines Decision Automatically

### 점수가 높은 항목은 무조건 실행

### 문제

전략적 방향과 작업 의존성을 놓친다.

### 개선

점수는 토론 순서를 돕는 도구로 사용한다.

---

## D-44. Gaming the Score

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

## D-45. Score Without Baseline

### 현재 상태를 모른 채 목표 점수 설정

### 개선

먼저 현재 분포를 확인한다.

---

## D-46. Static Score Forever

### 한번 평가한 위험도를 갱신하지 않음

### 문제

구조 변경으로 해결됐거나 더 심각해졌을 수 있다.

### 개선

주요 리팩토링 이후 재평가한다.

---

## D-47. Sitewide Score Hides Distribution

### 사이트 전체 SEO 품질 72점

### 문제

대표 글은 좋고 태그 페이지는 나쁜 식의 차이를 숨긴다.

### 개선

페이지 유형과 Topic별 분포를 본다.

---

## D-48. Scoring Every Article

### 모든 글을 복잡한 품질 점수로 평가

### 문제

운영 비용이 과도해진다.

### 개선

대표 글과 개선 후보부터 적용한다.

---

## D-49. No “Do Nothing” Option

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

## D-50. Risk Acceptance Without Reason

### “일단 둔다”로 끝

### 개선

수용 이유와 재검토 조건을 짧게 기록한다.

---

# 개선 계획

## D-51. Anti-pattern to Mega-Project

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

## D-52. No Smallest Safe Change

### 최종 구조만 설계

### 문제

중간에 사용자 가치를 전달하지 못한다.

### 개선

각 작업에 최소 배포 단위를 둔다.

---

## D-53. Refactor Without Baseline

### 개선 전 상태를 기록하지 않음

### 문제

효과를 판단할 수 없다.

### 개선

작업 유형에 맞는 baseline을 남긴다.

---

## D-54. Refactor Without Acceptance Criteria

### “검색을 개선한다”

### 문제

언제 완료인지 알 수 없다.

### 개선 예:

```text
대표 검색어 20개에서
예상 문서가 상위 3개 안에 포함된다.
```

---

## D-55. Acceptance Criteria as Implementation Detail

```text
MiniSearch를 사용한다.
JSON을 세 파일로 나눈다.
```

### 문제

사용자 결과가 아니라 구현 방식을 완료 기준으로 삼는다.

### 개선

결과를 기준으로 작성한다.

---

## D-56. No Negative Acceptance Criteria

### 무엇을 개선할지만 정의

### 개선

깨지면 안 되는 것도 정한다.

```text
검색 품질 개선
단, 초기 JS와 index 크기는 기존 대비 20% 이상 증가하지 않는다.
```

---

## D-57. Big-Bang Rollout

### 홈·검색·taxonomy·URL을 한 번에 변경

### 문제

원인 분석과 rollback이 어려워진다.

### 개선

순차적으로 배포한다.

---

## D-58. Migration and Redesign Combined

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

## D-59. No Pilot Scope

### 처음부터 모든 글에 적용

### 개선

대표 Topic이나 20개 글로 pilot을 진행한다.

---

## D-60. Pilot That Avoids Hard Cases

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

# 구현 과정

## D-61. Tool Before Policy

### 자동화부터 만들고 규칙은 나중에 정함

예:

```text
상태 migration script를 만듦
하지만 current와 historical 기준이 없음
```

### 개선

사람이 적용 가능한 정책을 먼저 정한다.

---

## D-62. Policy Without Examples

### 원칙은 있지만 판단하기 어려움

### 개선

좋은 사례, 나쁜 사례, 경계 사례를 함께 둔다.

---

## D-63. Automatic Fix by Default

### 검사 결과를 바로 수정

### 문제

의미적 오류가 대량 발생할 수 있다.

### 개선

기본은 report와 dry-run으로 둔다.

---

## D-64. Manual Everything

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

## D-65. No Idempotency

### 같은 개선 스크립트를 재실행하면 계속 변경

### 개선

migration과 fixer는 반복 실행 안정성을 가져야 한다.

---

## D-66. No Partial Failure Strategy

### 500개 중 한 파일 오류로 전체 작업 실패 또는 반대로 무시

### 개선

실패 파일을 명확히 보고하고 안전한 파일만 처리할지 정책을 정한다.

---

## D-67. Hidden Mutation

### audit 명령이 파일을 바꿈

### 개선

검사와 수정 명령을 분리한다.

---

## D-68. Generated Diff Overload

### 자동화가 수천 줄 formatting 변경까지 만듦

### 문제

의미 변경 검토가 어렵다.

### 개선

formatter와 semantic migration을 분리한다.

---

## D-69. No Review Sampling

### 대량 자동 변경을 전체 눈으로 보거나 전혀 보지 않음

### 개선

위험 유형별 표본을 검토한다.

---

## D-70. No Rollback Boundary

### 여러 종류의 개선을 한 commit에 적용

### 개선

작업 유형별 commit과 branch 경계를 둔다.

---

# 개선 후 검증

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

# 안티패턴 관리 운영

## D-81. Backlog Without States

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

## D-82. Backlog Without Evidence

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

## D-83. One Issue per Anti-pattern

### 카탈로그 항목마다 GitHub Issue 생성

### 문제

실제 같은 원인을 가진 이슈가 폭발한다.

### 개선

개선 프로젝트나 원인 단위로 묶는다.

---

## D-84. One Mega-Issue for Everything

### 반대로 모든 개선을 하나의 Issue에 넣음

### 문제

진척과 완료 기준이 불명확하다.

### 개선

사용자 가치 단위의 작업으로 분리한다.

---

## D-85. No Owner Because Personal Project

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

## D-86. Deadline for Every Debt

### 모든 구조 문제에 기한 설정

### 문제

불필요한 압박과 우선순위 왜곡이 생긴다.

### 개선

긴급 문제와 기회 개선을 구분한다.

---

## D-87. No Expiration for Experiments

### 임시 개선과 feature flag가 영구화

### 개선

실험 종료 조건과 제거 날짜를 둔다.

---

## D-88. Closed Means Gone

### Issue를 닫았으므로 문제도 사라졌다고 생각

### 개선

검증 결과와 남은 제한을 기록한다.

---

## D-89. Reopening as Failure

### 문제가 재발하면 이전 개선이 실패했다고 생각

### 문제

규모 증가로 새 임계점을 넘었을 수 있다.

### 개선

재발 원인을 기존 해결의 한계와 분리한다.

---

## D-90. Governance System Becomes the Product

### 안티패턴 관리용 대시보드·스키마·도구 구축

### 문제

실제 사이트 개선보다 관리 시스템이 커진다.

### 개선

Markdown 문서와 단순 Issue label 정도로 시작한다.

---

# 심리적·의사결정 안티패턴

## D-91. Shame-Driven Refactoring

### 과거 코드를 부끄러워서 전면 수정

### 문제

실제 사용자 영향보다 자기 평가가 우선된다.

### 개선

현재 목적과 비용을 기준으로 판단한다.

---

## D-92. Sunk-Cost Preservation

### 이미 만든 기능이라 제거하지 못함

예:

- 관리자 편집기
- 여러 코드 테마
- 복잡한 페이지 전환
- 사용되지 않는 설정

### 개선

과거 비용이 아니라 미래 가치와 유지 비용을 본다.

---

## D-93. Perfectionism as Architecture

### 모든 예외를 미리 처리

### 문제

실제 요구보다 복잡한 설계가 생긴다.

### 개선

현재 반복되는 요구만 지원한다.

---

## D-94. Fear of Breaking Old Content

### 과거 글 때문에 구조를 전혀 개선하지 못함

### 개선

migration, redirect, status 표시로 위험을 관리한다.

---

## D-95. Fear of Deletion

### 모든 글과 기능을 보존

### 문제

공개 구조가 계속 복잡해진다.

### 개선

Git history가 존재하므로 공개 사이트에는 현재 최선의 형태만 남길 수 있다.

---

## D-96. Architecture as Identity

### 특정 기술 선택을 자신의 역량과 동일시

예:

```text
Astro를 버리면 설계가 실패한 것 같다.
직접 만든 테마를 줄이면 후퇴 같다.
```

### 개선

기술은 현재 목적을 위한 수단으로 본다.

---

## D-97. Complexity as Professionalism

### 복잡한 구조가 더 전문적이라고 생각

### 문제

개인 기술 블로그에 불필요한 계층과 도구가 늘어난다.

### 개선

독자가 느끼는 전문성은 정확성과 설명에서 나온다.

---

## D-98. Endless Analysis

### 충분한 분석 뒤에도 계속 새 항목을 찾음

### 문제

실행이 계속 미뤄진다.

### 개선

분석 종료 조건을 둔다.

```text
핵심 위험이 확인됨
우선순위가 정해짐
첫 작업이 명확함
```

---

## D-99. Action Without Reflection

### 반대로 목록을 보자마자 수정

### 문제

관련 구조와 부작용을 놓친다.

### 개선

작은 계획과 baseline은 필요하다.

---

## D-100. Anti-pattern Catalog Becomes the Product

### 카탈로그 완성도가 실제 사이트보다 중요해짐

### 문제

안티패턴 1,000개를 정리해도 사이트는 그대로일 수 있다.

### 개선

카탈로그의 성공 기준을 이렇게 정의한다.

```text
사용자가 더 쉽게 글을 찾는다.
대표 콘텐츠가 명확해진다.
기술 문서의 신뢰도가 높아진다.
운영 비용이 줄어든다.
```

---

# 실용적인 평가 모델

안티패턴 하나를 실제 작업으로 옮길 때는 이 정도면 충분하다.

| 항목 | 질문 |
|---|---|
| 증거 | 실제로 어디에서 발생하는가? |
| 영향 | 독자·검색·운영에 어떤 문제가 생기는가? |
| 범위 | 몇 개 페이지 또는 기능에 영향을 주는가? |
| 확신도 | 확인됐는가, 가능성만 있는가? |
| 비용 | 수정하는 데 어느 정도 작업이 필요한가? |
| 가역성 | 잘못됐을 때 쉽게 되돌릴 수 있는가? |
| 의존성 | 먼저 해야 할 작업이 있는가? |

점수는 정밀할 필요가 없다.

```text
영향: 낮음 / 중간 / 높음
범위: 일부 / 다수 / 전체
비용: 작음 / 중간 / 큼
확신: 가능 / 유력 / 확인
```

---

# 추천 작업 상태

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

# hawk90에서 먼저 실제 작업으로 바꿀 10개

지금까지 나온 수백 개 항목 중 우선순위는 이 정도로 줄일 수 있다.

| 우선순위 | 문제 | 첫 작업 |
|---:|---|---|
| 1 | Article Warehouse | 대표 글 20개 선정 |
| 2 | Missing Topic Hub | PCIe & CXL Hub 작성 |
| 3 | Identity–Content Mismatch | 홈의 사이트 설명 수정 |
| 4 | Chronological Architecture | Core Topics와 Featured Guides 추가 |
| 5 | Evidence Blending | 대표 글에 관찰·근거·추론 구분 |
| 6 | Versionless Content | 핵심 글의 환경·검증일 추가 |
| 7 | Topic Cannibalization | 유사 글 10개 역할 분석 |
| 8 | Search Index as a Dump | 검색 인덱스 크기와 필드 측정 |
| 9 | Full Corpus Build | 빌드 단계별 시간·메모리 측정 |
| 10 | Theme–Blog Convergence | 저장소의 1차 목적 한 문장 선언 |

여기서도 처음에는 **1~4번만 실행해도 충분하다.**

---

# Task 2 최종 결론

지금까지 Architecture부터 콘텐츠, 검색, 성능, SEO, UX, 운영, 보안, 관측, 편집, 다국어, 추천, 테스트, 보존까지 카탈로그화했다.

하지만 핵심은 수백 개 안티패턴이 아니다.

`hawk90.github.io`의 중심 문제는 다음 다섯 개로 압축된다.

```text
1. 좋은 글이 많지만 대표 지식 구조가 약함
2. 최신 글이 사이트 전체 정체성을 지배함
3. 콘텐츠보다 퍼블리싱 플랫폼이 빠르게 복잡해짐
4. 실제 경험·검증·문서 상태가 구조화되지 않음
5. 신규 글 작성이 기존 지식의 통합보다 앞섬
```

따라서 해결도 다섯 개다.

```text
Topic Hub
대표 글
명시적 관계
검증 정보
기능 경계
```

이것으로 **Task 2: Technical Blog Anti-pattern Catalog**는 마무리할 수 있다.

다음 단계는 카탈로그를 더 늘리는 것이 아니라 **Task 3. 실제 `hawk90.github.io` 개선 백로그 작성**이다. 지금까지의 일반 안티패턴을 실제 저장소 작업 단위로 바꾸고, `P0/P1/P2`, 예상 효과, 수정 위치, 완료 조건까지 정리하는 단계다.

## 43. assistant

# Task 3-1. 실제 개선 백로그 설계

이제부터는 안티패턴 카탈로그를 더 늘리지 않고, 실제 `hawk90.github.io` 개선 작업으로 바꾼다.

이번 단계의 목표는 다음이다.

```text
문제
→ 작업
→ 수정 위치
→ 완료 조건
→ 기대 효과
```

우선 전체 백로그를 다섯 묶음으로 나눈다.

```text
A. 사이트 정체성과 홈
B. Topic Hub와 대표 글
C. 콘텐츠 신뢰성과 상태
D. 검색·빌드·운영
E. AdSense 재신청 준비
```

이번에는 가장 우선순위가 높은 **Epic A: 사이트 정체성과 홈 개편**부터 시작한다.

---

# Epic A. 사이트 정체성과 홈 개편

## 목표

현재 홈이 전달하는 메시지를:

```text
C++를 좋아하고 글을 쓰는 개발자의 최신 글 블로그
```

에서 다음으로 바꾼다.

```text
C++, 시스템 소프트웨어, 펌웨어, CUDA,
PCIe와 CXL을 다루는 기술 지식베이스
```

홈의 목적도 최신 글 나열에서 다음으로 바꾼다.

```text
사이트 정체성 전달
→ 핵심 주제 탐색
→ 대표 문서 진입
→ 최근 활동 확인
```

---

# A-01. 저장소의 1차 목적 선언

## 문제

현재 사이트는 다음 세 정체성이 동시에 섞여 있다.

```text
개인 기술 블로그
시스템 지식베이스
범용 Astro 테마
```

이 상태에서는 기능을 추가할 때 판단 기준이 흔들린다.

예를 들어 새로운 기능을 검토할 때:

```text
내 블로그 독자에게 필요한가?
범용 테마 사용자에게 필요한가?
관리자인 나에게 필요한가?
```

가 섞인다.

## 작업

README와 내부 설계 문서에 저장소의 우선순위를 선언한다.

권장 문구:

```text
This repository primarily powers Hawk's systems engineering
knowledge base.

Reusable theme features are secondary and should not increase
the complexity of the production site without a demonstrated need.
```

한국어 내부 원칙은 다음 정도면 된다.

```text
이 저장소의 1차 목적은 Hawk 기술 지식베이스 운영이다.
범용 테마 기능은 실제 사이트 요구를 해치지 않는 범위에서만 유지한다.
```

## 수정 후보 위치

```text
README.md
docs/architecture.md
또는
docs/adr/001-site-purpose.md
```

## 완료 조건

- 저장소 목적이 한 문장으로 명시됨
- 개인 사이트와 범용 테마의 우선순위가 구분됨
- 신규 기능 판단 기준이 세 가지 이하로 정리됨

## 기능 판단 기준

```text
독자의 콘텐츠 발견을 개선하는가
기술 문서의 신뢰성을 높이는가
운영 비용을 실제로 줄이는가
```

셋 중 하나에도 해당하지 않으면 우선 보류한다.

## 기대 효과

- 관리자 기능과 테마 기능의 무분별한 확장 억제
- 프레임워크 재작성 충동 감소
- 콘텐츠 구조 작업에 우선순위 집중
- 기능 삭제 판단이 쉬워짐

## 우선순위

```text
P0
```

## 예상 작업량

```text
매우 작음
```

---

# A-02. 홈 Hero 문구 재정의

## 문제

현재 Hero가 C++ 중심의 개인 소개라면 실제 콘텐츠 범위를 충분히 표현하지 못한다.

최근 글은 CXL, UEFI, Bootloader, PCIe처럼 더 넓고 깊은 시스템 주제를 다룬다. 따라서 Hero와 실제 콘텐츠가 불일치한다.

## 작업

Hero를 다음 세 요소로 구성한다.

```text
정체성
핵심 분야
독자 가치
```

## 권장 구조

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

## 수정 후보 위치

```text
src/pages/index.astro
src/components/home/Hero.astro
src/consts/config.ts
```

## 완료 조건

- C++ 외에 시스템·펌웨어·CUDA·PCIe/CXL 범위가 드러남
- 사이트가 누구를 위한 것인지 한 문단 안에 나타남
- 첫 번째 CTA가 최신 글 목록이 아니라 시작 경로로 연결됨
- 모바일 첫 화면에서도 핵심 Topic 일부가 보임

## 기대 효과

- 사이트 정체성 명확화
- AdSense 심사 시 사이트 목적 전달 강화
- 신규 방문자가 전문 분야를 빠르게 이해
- 포트폴리오와 기술 지식베이스 역할 정렬

## 우선순위

```text
P0
```

---

# A-03. 홈 정보 구조 변경

## 현재 가능 구조

```text
Hero
Latest Posts
```

## 목표 구조

```text
Hero
Start Here
Core Topics
Featured Guides
Recently Updated
Latest Posts
```

다만 처음부터 모든 구역을 구현하면 홈이 다시 무거워질 수 있다.

첫 번째 배포에서는 다음 네 구역으로 제한한다.

```text
Hero
Core Topics
Featured Guides
Latest Posts
```

`Start Here`와 `Recently Updated`는 실제 콘텐츠 큐레이션이 준비된 뒤 추가한다.

## 왜 이 순서인가

### Core Topics

사이트 전체 전문 영역을 설명한다.

### Featured Guides

최신 글과 무관하게 가장 가치 있는 문서를 노출한다.

### Latest Posts

현재 활동성과 최신 콘텐츠를 보여준다.

즉:

```text
정체성
→ 분야
→ 대표 가치
→ 최신 활동
```

순서가 된다.

## 완료 조건

- 최신 글 목록이 홈의 첫 번째 주요 콘텐츠가 아님
- Featured와 Latest가 시각적으로 구분됨
- 핵심 분야가 최신 게시 주제에 따라 바뀌지 않음
- 각 구역의 목적이 중복되지 않음

## 우선순위

```text
P0
```

---

# A-04. Core Topics 영역 추가

## 목표

홈에서 사이트의 핵심 분야를 최대 6개로 보여준다.

## 권장 Topic

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

## 카드에 포함할 정보

```text
Topic 이름
한 문장 설명
대표 문서 수 또는 핵심 범위
Hub 링크
```

예:

```text
Firmware & Bootloader

UEFI, U-Boot, BSP와 하드웨어 초기화 흐름을
소스코드와 실제 부팅 과정 중심으로 설명합니다.
```

## 피해야 할 내용

- 태그를 5개 이상 나열
- 글 수를 과도하게 강조
- 모든 Topic에 다른 그림과 애니메이션
- 아직 없는 기능을 표현
- 최신 글 3개씩 중첩 표시

Topic 카드는 지도이지 미니 아카이브가 아니다.

## 데이터 모델 권장안

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

## 완료 조건

- Topic이 5~6개 이내
- 각각 명확히 다른 독자 목적을 가짐
- 모든 Topic 링크가 유효한 페이지로 연결됨
- 빈 Hub나 글 목록뿐인 페이지로 연결되지 않음

## 우선순위

```text
P0
```

## 선행 조건

```text
최소 2개의 Topic Hub 초안
나머지는 기존 카테고리 또는 임시 큐레이션 페이지 가능
```

---

# A-05. Featured Guides 영역 추가

## 문제

현재 구조에서는 오래됐지만 중요한 문서가 최신 글에 밀린다.

## 목표

사이트의 전문성을 대표하는 문서를 홈에 고정적으로 노출한다.

## 첫 Featured 수

```text
4~6개
```

너무 많으면 Latest Posts와 차이가 사라진다.

## 선정 기준

Featured 문서는 다음 중 최소 세 가지를 만족해야 한다.

```text
직접 경험 또는 분석이 들어감
현재도 기술적으로 유효함
다른 글의 기반이 됨
검색 가치가 있음
네 전문성을 잘 보여줌
해당 Topic Hub의 대표 진입점임
```

## 제외 기준

```text
최근에 썼다는 이유만으로 선정
짧은 소식성 글
구판
검증 상태 불명확
다른 대표 글과 검색 의도 중복
```

## 카드 정보

```text
콘텐츠 타입
제목
한 문장 설명
Topic
```

날짜와 태그는 필수 아니다.

Featured는 최신성이 아니라 가치가 핵심이기 때문이다.

## 데이터 모델

초기에는 front matter에 `featured: true`를 모든 글에 넣지 않는 편이 낫다.

왜냐하면:

- Featured는 글의 본질적 속성이 아니라 홈 편집 상태
- 시간이 지나며 바뀜
- 여러 페이지에서 다른 Featured 기준이 생길 수 있음

따라서 별도 큐레이션 파일이 적합하다.

```ts
export const FEATURED_GUIDES = [
  "pcie-bar-sizing",
  "cxl-hdm-decoder",
  "cuda-memory-transfer",
];
```

또는:

```yaml
featured:
  - id: pcie-bar-sizing
    reason: canonical-guide
  - id: cxl-hdm-decoder
    reason: signature-content
```

## 완료 조건

- Featured가 4~6개로 제한됨
- 각 문서의 상태가 `current`
- description이 제목 반복이 아님
- 최소 3개 이상의 핵심 Topic을 대표
- 클릭 시 단편 글보다 대표 Guide 또는 강한 Concept로 연결

## 우선순위

```text
P0
```

---

# A-06. Latest Posts 역할 축소

## 목표

Latest Posts를 제거하지 않고 역할을 명확히 제한한다.

Latest는 다음 질문에만 답해야 한다.

> 최근에 무엇이 새로 올라왔는가?

사이트의 핵심 문서나 학습 순서를 Latest가 책임지면 안 된다.

## 개선안

```text
최신 글 6개
더 보기 링크
```

정도로 제한한다.

기존에 10개 이상 표시한다면 홈의 대부분을 다시 시간순 피드가 차지할 수 있다.

## 카드 정보

```text
제목
짧은 설명 또는 Topic
게시일
```

Featured와 다르게 날짜를 강조해도 된다.

## 추가 고려

같은 주제의 글이 연속 발행되면 홈이 한 분야로 도배될 수 있다.

예:

```text
CXL
CXL
CXL
CXL
CXL
```

이 경우 선택지는 두 가지다.

### 그대로 노출

실제 최근 활동을 정확히 보여준다.

### Topic 다양성 제한

한 Topic에서 최대 2~3개만 노출한다.

초기에는 알고리즘을 만들지 말고 그대로 노출하는 편이 낫다. 다만 연속 시리즈는 하나의 시리즈 카드로 묶는 방식을 나중에 검토할 수 있다.

## 완료 조건

- Latest가 Featured보다 아래에 위치
- 표시 글 수가 제한됨
- 최신 글 전체 보기는 별도 아카이브로 연결
- Latest 카드가 Featured 카드와 시각적으로 구분됨

## 우선순위

```text
P1
```

---

# A-07. 홈의 사이트 신뢰 신호 추가

## 문제

전문 콘텐츠가 있어도 홈에서 작성자의 경험과 작성 원칙이 잘 보이지 않으면 일반적인 자동 생성 블로그처럼 보일 수 있다.

## 목표

과도한 자기소개 없이 신뢰 근거를 짧게 제공한다.

## 권장 구성

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

## 피해야 할 것

- 경력 전체를 홈에 나열
- 과장된 권위 표현
- 회사명과 프로젝트를 과도하게 공개
- E-E-A-T를 의식한 부자연스러운 문구
- “전문가가 작성했습니다” 같은 자기 선언

신뢰는 선언보다 구체적인 작성 원칙으로 보여주는 것이 낫다.

## 완료 조건

- 작성자와 사이트 운영 주체가 드러남
- 문서 검증 방식이 한두 문장으로 설명됨
- About·작성 원칙 페이지로 이동 가능
- 홈 분량을 과도하게 늘리지 않음

## 우선순위

```text
P1
```

---

# A-08. 홈 SEO metadata 정비

## 목표

홈의 title과 description이 실제 주제를 반영하게 한다.

## 권장 title 예시

```text
Hawk Systems Notes — C++, Firmware, CUDA, PCIe and CXL
```

또는:

```text
Hawk Systems Knowledge Base
```

사이트 이름 자체를 짧게 유지하고 description에서 범위를 설명해도 된다.

## 권장 description 예시

```text
C++, Linux 시스템 프로그래밍, 펌웨어, CUDA,
PCIe와 CXL의 내부 동작과 디버깅을 다루는 기술 지식베이스입니다.
```

## 문제 가능성

모든 키워드를 title에 넣으면 제목이 길어진다.

따라서 추천은:

```text
Title:
Hawk Systems Knowledge Base

Description:
C++, Linux, firmware, CUDA, PCIe와 CXL의 내부 동작,
성능 및 디버깅을 다루는 기술 문서 모음.
```

이다.

## 완료 조건

- 홈 title이 일반적인 개인 블로그 문구가 아님
- description이 실제 핵심 Topic과 일치
- 제목과 설명이 같은 말을 반복하지 않음
- OG title과 description도 동일한 정체성을 유지
- canonical이 production 홈을 가리킴

## 우선순위

```text
P0
```

---

# A-09. 홈 컴포넌트 경계 단순화

## 위험

홈을 개편하면서 다음처럼 컴포넌트가 급증할 수 있다.

```text
TopicCard
FeaturedGuideCard
LatestPostCard
StartHereCard
UpdatedPostCard
```

그리고 내부적으로 비슷한 metadata 표시가 반복된다.

## 권장 구조

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

## 권장 카드 수

```text
FeaturedGuideCard
ArticleRow 또는 LatestArticleCard
TopicEntry
```

세 종류면 충분하다.

## 완료 조건

- 카드 컴포넌트 변형이 3개 이하
- metadata formatting이 공통화됨
- 날짜·Topic·상태 표시 규칙이 중복되지 않음
- 홈 전용 기능이 범용 테마 설정으로 과도하게 노출되지 않음

## 우선순위

```text
P1
```

---

# A-10. 홈 개편의 완료 기준

단순히 “예뻐졌다”가 완료 기준이면 안 된다.

## 구조 완료 조건

```text
Hero
Core Topics
Featured Guides
Latest Posts
```

네 구역이 명확히 구분된다.

## 콘텐츠 완료 조건

```text
Core Topic 5개
Featured Guide 4~6개
Latest Post 6개 이하
```

가 실제 콘텐츠로 채워진다.

## UX 완료 조건

- 모바일 첫 화면에서 사이트 주제 또는 첫 Topic 일부가 보임
- Topic 링크가 모두 키보드로 접근 가능
- Featured와 Latest를 시각적으로 구분 가능
- 카드 전체가 올바른 `<a>` 링크로 작동
- hover 없이도 의미가 전달됨

## 성능 완료 조건

- 홈 초기 JavaScript가 기존보다 크게 증가하지 않음
- 모든 콘텐츠가 build-time HTML로 생성됨
- Topic과 Featured를 위해 별도 클라이언트 hydration을 추가하지 않음
- 이미지 추가 시 width·height가 존재
- 새 대형 폰트나 아이콘 라이브러리를 추가하지 않음

## SEO 완료 조건

- H1 하나
- 명확한 title·description
- 핵심 Topic이 실제 텍스트로 표시됨
- Featured Guide가 crawlable link
- 구조화 데이터가 있다면 화면 내용과 일치

---

# Epic A 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 예상 효과 |
|---|---|---:|---:|---:|
| A-01 | 저장소 목적 선언 | P0 | 낮음 | 중간 |
| A-02 | Hero 문구 재정의 | P0 | 낮음 | 높음 |
| A-03 | 홈 정보 구조 변경 | P0 | 중간 | 매우 높음 |
| A-04 | Core Topics 추가 | P0 | 중간 | 매우 높음 |
| A-05 | Featured Guides 추가 | P0 | 중간 | 매우 높음 |
| A-06 | Latest 역할 축소 | P1 | 낮음 | 중간 |
| A-07 | 신뢰 신호 추가 | P1 | 낮음 | 중간 |
| A-08 | 홈 SEO metadata 정비 | P0 | 낮음 | 높음 |
| A-09 | 컴포넌트 경계 단순화 | P1 | 중간 | 중간 |
| A-10 | 완료 조건·회귀 검사 | P0 | 낮음 | 높음 |

---

# 첫 번째 실제 실행 묶음

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

## 44. assistant

# Task 3-2. Topic Hub와 대표 문서 백로그

이번 단계에서는 `PCIe & CXL`, `Firmware & Bootloader` 두 Hub를 먼저 만든다.

목표는 단순한 글 목록이 아니다.

```text
주제 설명
→ 어디서 시작할지
→ 어떤 순서로 읽을지
→ 대표 문서가 무엇인지
→ 실전 사례가 어디 있는지
```

를 한 페이지에서 보여주는 것이다.

---

# Epic B. Topic Hub와 대표 문서

## B-01. Topic Hub의 역할 정의

Topic Hub는 다음 세 가지를 동시에 담당해야 한다.

```text
1. 분야 소개
2. 학습 지도
3. 대표 콘텐츠 큐레이션
```

반대로 다음 역할은 맡기지 않는다.

```text
모든 글 자동 나열
태그 페이지 대체
백과사전 전체 설명
전체 검색 기능
복잡한 지식 그래프
```

좋은 Topic Hub는 장문 튜토리얼도 아니고 단순 아카이브도 아니다.

> 해당 분야의 지도와 출발점이다.

---

# B-02. 공통 Hub 페이지 구조

두 Hub 모두 같은 기본 뼈대를 사용한다.

```text
Hero
Topic Overview
Start Here
Concept Map
Featured Guides
Debug & Experiments
Reference
Related Topics
Recently Updated
```

초기 버전에서는 아래 정도로 줄여도 충분하다.

```text
Hero
Start Here
Core Concepts
Featured Guides
Debug & Experiments
Related Topics
```

---

## Hero

포함할 정보:

```text
Topic 이름
한 문장 정의
이 Hub가 다루는 범위
대상 독자
```

예:

```text
PCIe & CXL

PCIe 장치 발견, BAR, 인터럽트, DMA부터
CXL 메모리 주소 변환과 Linux 노출 과정까지
호스트와 장치 사이의 시스템 흐름을 설명합니다.
```

---

## Start Here

대표 진입 문서 3개 이내로 제한한다.

```text
처음 시작
구조 이해
실전 진입
```

예:

```text
처음 시작:
PCIe 장치는 어떻게 발견되고 초기화되는가

구조 이해:
BAR, MSI-X와 DMA의 전체 흐름

실전 진입:
Linux에서 PCIe 장치를 추적하는 방법
```

---

## Core Concepts

하위 개념을 단순 태그가 아니라 의미 묶음으로 보여준다.

```text
Enumeration
BAR & MMIO
Interrupt
DMA & IOMMU
CXL Memory
Linux Integration
```

각 개념은 다음을 가진다.

```text
이름
짧은 설명
대표 문서
```

---

## Featured Guides

주제 전체를 이해하는 데 가장 중요한 문서 4~6개.

---

## Debug & Experiments

실제 장애·실험·로그 분석 글을 따로 묶는다.

이 영역이 `hawk90.github.io`의 차별화 포인트다.

---

## Related Topics

다른 Hub와의 교차 관계를 보여준다.

예:

```text
PCIe & CXL
→ Linux & Systems
→ Firmware & Bootloader
→ GPU & CUDA
```

---

# B-03. `PCIe & CXL` Hub 생성

## 권장 URL

```text
/topics/pcie-cxl/
```

신규 URL은 짧고 안정적으로 유지한다.

## 페이지 제목

```text
PCIe & CXL
```

## 설명

```text
PCIe 장치의 열거, BAR, MSI-X, DMA와 IOMMU,
CXL 메모리 주소 변환과 운영체제 통합 과정을 다룹니다.
```

---

# B-04. `PCIe & CXL` 하위 구조

추천 구조는 다음이다.

```text
PCIe & CXL
├── PCIe Architecture
├── Enumeration & Configuration Space
├── BAR & MMIO
├── Interrupt
├── DMA & IOMMU
├── CXL Architecture
├── CXL Memory Mapping
└── Linux Integration
```

너무 많은 하위 Topic을 독립 페이지로 만들 필요는 없다.

초기에는 Hub 내부 섹션으로만 사용한다.

---

# B-05. `PCIe & CXL` Start Here

첫 진입 문서는 3개면 충분하다.

## 1. PCIe 전체 흐름

가칭:

```text
PCIe 장치는 어떻게 발견되고 사용할 수 있게 되는가
```

다룰 내용:

```text
Link up
Configuration Space
Enumeration
BAR probing
Address allocation
Driver binding
Interrupt
DMA
```

이 문서는 세부 설명보다 전체 흐름과 관련 문서 연결이 목적이다.

## 2. BAR 대표 문서

가칭:

```text
PCIe BAR 크기 탐색과 주소 할당 과정
```

다룰 내용:

```text
BAR register
Size probing
32/64-bit BAR
MMIO address assignment
Host access
```

## 3. CXL 메모리 대표 문서

가칭:

```text
CXL 메모리는 호스트 주소 공간에 어떻게 연결되는가
```

다룰 내용:

```text
HPA
DPA
HDM Decoder
Firmware tables
Linux NUMA
```

---

# B-06. `PCIe & CXL` 대표 글 선정 기준

대표 글은 조회수보다 구조적 역할로 선정한다.

## 필수 조건

다음 중 최소 세 가지:

```text
전체 흐름을 설명함
다른 글의 선행 문서임
직접 분석·실험이 있음
현재 환경에서 유효함
다른 사이트에서 찾기 어려운 정보가 있음
```

## 추천 역할 분배

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

# B-07. `PCIe & CXL` 문서 역할 분류

기존 글을 다음으로 나눈다.

```text
Guide
Concept
Debug Note
Experiment
Source Walkthrough
Reference
```

예:

| 주제 | 권장 유형 |
|---|---|
| Configuration Space 개념 | Concept |
| BAR size probing | Concept |
| Linux PCI enumeration 추적 | Source Walkthrough |
| U250 BAR mmap 실패 | Debug Note |
| MSI-X latency 측정 | Experiment |
| PCI capability ID 표 | Reference |

같은 주제라도 역할이 다르면 공존할 수 있다.

반대로 역할도 같고 검색 의도도 같다면 통합 후보가 된다.

---

# B-08. `PCIe & CXL` 기존 글 배치 작업

각 기존 글에 다음만 우선 지정한다.

```yaml
topic: pcie-cxl
type: concept
status: current
```

처음부터 관계 metadata를 모두 넣지 않는다.

1차 작업에서는 다음 세 필드만 있어도 충분하다.

```text
parent topic
content type
status
```

2차 작업에서 대표 글에만 추가한다.

```yaml
prerequisites:
next:
related:
```

---

# B-09. `PCIe & CXL` 중복 후보 분석

다음 유형을 찾아야 한다.

## 개념 중복

```text
PCIe BAR란
BAR 크기 계산
BAR 크기 탐색
BAR 주소 할당
```

서로 독립적인 검색 의도가 있는지 확인한다.

권장 결과:

```text
대표 Concept:
BAR 크기 탐색과 주소 할당

보조 Debug:
BAR가 0으로 보이는 이유

Reference:
BAR bit layout
```

## CXL 구조 중복

```text
CXL memory
HDM Decoder
HPA to DPA
Linux NUMA
```

모두 하나의 거대 글로 합칠 필요는 없다.

대신 대표 Guide를 상위에 두고 세부 문서를 연결한다.

---

# B-10. `PCIe & CXL` Hub 완료 조건

```text
Hub 설명 존재
Start Here 3개 이하
Core Concepts 6~8개
Featured 4~6개
Debug 또는 Experiment 3개 이상
관련 Topic 2개 이상
모든 링크 유효
```

추가 완료 조건:

- 단순 최신순 목록이 아님
- 구판 글을 Featured로 노출하지 않음
- 같은 글이 여러 섹션에 과도하게 반복되지 않음
- 모바일에서도 처음 두 섹션이 쉽게 읽힘
- JS 없이 전체 탐색 가능

---

# B-11. `Firmware & Bootloader` Hub 생성

## 권장 URL

```text
/topics/firmware-bootloader/
```

## 페이지 제목

```text
Firmware & Bootloader
```

## 설명

```text
보드 초기화, UEFI, U-Boot, BSP, 장치 발견과
운영체제로 제어권이 넘어가는 부팅 흐름을 다룹니다.
```

---

# B-12. `Firmware & Bootloader` 하위 구조

```text
Firmware & Bootloader
├── Boot Flow
├── UEFI
├── U-Boot
├── BSP
├── Device Initialization
├── Memory & MMIO
├── Secure Boot
└── Handoff to OS
```

하위 구조는 다음처럼도 묶을 수 있다.

```text
Boot Architecture
Hardware Initialization
Bootloader Internals
Security
OS Handoff
```

초기에는 5개 정도가 더 관리하기 쉽다.

---

# B-13. `Firmware & Bootloader` Start Here

## 1. 전체 부팅 흐름

가칭:

```text
전원이 켜진 뒤 운영체제가 시작되기까지
```

다룰 내용:

```text
Reset vector
ROM
First-stage boot
DRAM initialization
Device initialization
Bootloader
Kernel handoff
```

## 2. U-Boot 구조

가칭:

```text
U-Boot는 보드를 어떻게 초기화하는가
```

다룰 내용:

```text
SPL
Driver model
Device tree
PCIe initialization
Environment
Boot command
```

## 3. UEFI 구조

가칭:

```text
UEFI는 하드웨어와 운영체제 사이에서 무엇을 하는가
```

다룰 내용:

```text
SEC
PEI
DXE
BDS
Runtime services
ACPI handoff
```

---

# B-14. `Firmware & Bootloader` Featured 역할

추천 분배:

```text
1개: 전체 Boot Guide
1개: U-Boot Source Walkthrough
1개: UEFI Architecture
1개: BSP/Board Initialization
1개: Secure Boot
1개: 실제 부팅 장애 Debug Note
```

이 Hub에서는 실무 기반 Debug Note가 특히 중요하다.

예:

```text
DRAM 초기화 실패
PCIe 장치 미탐지
Device tree mismatch
Boot device 탐색 실패
Secure Boot 인증 실패
```

---

# B-15. Firmware와 PCIe Hub의 경계

PCIe 초기화 글은 두 Hub에 걸칠 수 있다.

이때 중복 저장하거나 복사하지 않는다.

## 기준

글의 중심 질문이 무엇인지 본다.

### PCIe Hub 중심

```text
BAR는 어떻게 할당되는가
MSI-X는 어떻게 설정되는가
```

### Firmware Hub 중심

```text
U-Boot는 PCIe controller를 어떤 순서로 초기화하는가
UEFI DXE에서 PCI bus를 어떻게 열거하는가
```

하나를 parent로 지정하고 다른 Hub에서는 교차 링크로 노출한다.

```yaml
parent: firmware-bootloader
relatedTopics:
  - pcie-cxl
```

초기 schema에 `relatedTopics`가 없다면 Hub 큐레이션 파일에서만 연결해도 된다.

---

# B-16. Topic registry 생성

Topic 이름을 글마다 자유 문자열로 넣으면 표기 드리프트가 발생한다.

따라서 작은 registry를 둔다.

```ts
export const TOPICS = {
  pcieCxl: {
    id: "pcie-cxl",
    title: "PCIe & CXL",
    href: "/topics/pcie-cxl/",
  },
  firmwareBootloader: {
    id: "firmware-bootloader",
    title: "Firmware & Bootloader",
    href: "/topics/firmware-bootloader/",
  },
} as const;
```

또는 YAML:

```yaml
topics:
  - id: pcie-cxl
    title: PCIe & CXL
    description: ...
  - id: firmware-bootloader
    title: Firmware & Bootloader
    description: ...
```

## 완료 조건

- Topic ID는 영문 slug
- 화면 표시명은 별도
- alias와 title이 분리
- URL이 registry 한 곳에만 정의
- 글에서는 Topic ID만 사용

---

# B-17. Hub 큐레이션과 자동 목록 분리

Hub의 모든 콘텐츠를 수동으로 적으면 최신 글 반영이 어렵다.

반대로 전부 자동 생성하면 태그 페이지와 같아진다.

따라서 두 영역을 분리한다.

## 수동 큐레이션

```text
Start Here
Featured Guides
Core Concepts
```

## 자동 생성 가능

```text
Recently Updated
All Articles
Debug Notes
Experiments
```

이 방식이 균형이 좋다.

---

# B-18. Hub용 데이터 모델

초기 권장 모델:

```ts
interface TopicHubConfig {
  id: string;
  title: string;
  description: string;
  startHere: string[];
  featured: string[];
  sections: {
    title: string;
    description?: string;
    articles: string[];
  }[];
  relatedTopics: string[];
}
```

예:

```ts
export const PCIE_CXL_HUB = {
  id: "pcie-cxl",
  title: "PCIe & CXL",
  description: "...",
  startHere: [
    "pcie-device-initialization",
    "pcie-bar-sizing",
    "cxl-memory-address-mapping",
  ],
  featured: [
    "linux-pci-enumeration",
    "pcie-msix",
    "cxl-hdm-decoder",
  ],
};
```

복잡한 CMS는 필요 없다.

---

# B-19. 대표 문서 20개 선정

두 Hub를 만들면서 전체 사이트의 대표 문서 20개를 선정한다.

추천 배분:

```text
PCIe & CXL: 5개
Firmware & Bootloader: 5개
C++: 4개
GPU & CUDA: 3개
Linux & Systems: 3개
```

정확히 균등할 필요는 없다.

선정 시 다음을 기록한다.

```text
문서 ID
대표 Topic
문서 유형
현재 상태
왜 대표인가
보완이 필요한가
```

예:

| 문서 | Topic | 유형 | 상태 | 선정 이유 |
|---|---|---|---|---|
| PCIe BAR size probing | PCIe & CXL | Concept | Current | 다수 글의 선행 개념 |
| Linux PCI enumeration | PCIe & CXL | Source Walkthrough | Needs Review | 고유 소스 분석 |
| U-Boot driver model | Firmware | Guide | Current | Bootloader 핵심 구조 |

---

# B-20. 대표 문서 보완 우선순위

대표 문서라고 바로 홈에 노출하면 안 된다.

다음 순서로 검사한다.

```text
1. 기술적으로 현재도 유효한가
2. 제목과 description이 명확한가
3. 환경과 버전이 필요한가
4. 관련 글과 다음 경로가 있는가
5. 중복 문서와 역할이 겹치지 않는가
6. 모바일에서 코드·표가 정상인가
```

상태가 `needs-review`라면 보완 후 Featured로 올린다.

---

# B-21. 대표 문서 최소 metadata

대표 문서부터 다음을 갖춘다.

```yaml
type: guide
topic: pcie-cxl
status: current
updated: 2026-08-01
```

실제로 검증했다면:

```yaml
lastVerified: 2026-08-01
```

하지만 단순 문장 수정만 했다면 `lastVerified`를 바꾸지 않는다.

---

# B-22. 대표 문서 상단 UI

대표 글 상단에는 정보가 너무 많아지지 않도록 다음만 우선 표시한다.

```text
Content Type
Primary Topic
Status
Updated
```

환경 정보가 중요한 글은 별도 compact 영역:

```text
Tested on
Linux 6.x
GCC 13
U250 / XRT 2.13
```

모든 글에 같은 환경 필드를 강제하지 않는다.

---

# B-23. 대표 문서 하단 UI

추천 구조:

```text
상위 Topic
필요한 선행 개념
다음에 읽을 글
관련 실전 사례
```

예:

```text
상위 주제
PCIe & CXL

선행 개념
PCIe Configuration Space

다음 단계
MSI-X 설정 흐름

실전 사례
U250 BAR mmap 실패 분석
```

`관련 글 8개` 같은 단순 카드 목록보다 역할 기반 링크가 낫다.

---

# B-24. Hub와 태그 페이지 관계

기존 태그 페이지를 모두 제거할 필요는 없다.

## Topic Hub

```text
편집된 구조
설명
학습 순서
대표 글
```

## Tag page

```text
해당 태그를 가진 글의 전체 목록
```

중요한 주제는 Topic Hub가 canonical 탐색 페이지가 되고, 태그 페이지는 보조 목록으로 남긴다.

SEO 관점에서 둘이 거의 같은 내용이라면 태그 페이지 색인 필요성을 검토한다.

---

# B-25. Hub 페이지 컴포넌트 구조

권장:

```text
TopicHero
StartHereList
TopicSection
FeaturedGuideList
RelatedTopicLinks
```

피해야 할 구조:

```text
PCIeHubPage
CXLHubPage
FirmwareHubPage
UbootHubPage
```

각 Hub마다 별도 페이지 컴포넌트를 복제하지 않는다.

공통 템플릿과 데이터 config로 구성한다.

---

# B-26. Hub의 접근성과 모바일

## 모바일

- 2열·3열 카드 강제 금지
- Start Here 순서를 명확히 표시
- 긴 설명은 2~3줄 이내
- 섹션이 너무 많으면 접지 말고 우선순위를 줄임

## 접근성

- Topic 카드 전체를 올바른 링크로 구현
- 섹션 제목 계층 유지
- 순서가 있는 학습 경로는 `<ol>`
- 단순 관련 목록은 `<ul>`
- 색만으로 유형 구분하지 않음

---

# B-27. Hub 성능 기준

Topic Hub는 정적 페이지여야 한다.

```text
클라이언트 hydration 없음
검색 인덱스 전체 로드 없음
무거운 그래프 없음
외부 API 호출 없음
```

글 목록과 metadata는 build time에 생성한다.

이미지 없이도 충분히 좋은 Hub를 만들 수 있다.

---

# B-28. Epic B 완료 기준

## 구조

```text
PCIe & CXL Hub 1개
Firmware & Bootloader Hub 1개
공통 Topic Hub 템플릿
Topic registry
```

## 콘텐츠

```text
각 Hub Start Here 3개 이하
각 Hub Featured 4~6개
대표 문서 전체 20개 선정
```

## 연결

```text
홈 Core Topics에서 Hub 연결
대표 문서에서 Hub backlink
Hub에서 관련 Topic 연결
```

## 품질

```text
구판 Featured 없음
깨진 링크 없음
모바일 레이아웃 확인
모든 Hub에 고유 description 존재
```

---

# Epic B 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| B-01 | Hub 역할·공통 구조 정의 | P0 | 낮음 | 높음 |
| B-03 | PCIe & CXL Hub 생성 | P0 | 중간 | 매우 높음 |
| B-05 | PCIe & CXL Start Here | P0 | 중간 | 매우 높음 |
| B-09 | PCIe/CXL 중복 후보 분석 | P1 | 중간 | 높음 |
| B-11 | Firmware & Bootloader Hub 생성 | P0 | 중간 | 매우 높음 |
| B-13 | Firmware Start Here | P0 | 중간 | 높음 |
| B-16 | Topic registry | P0 | 낮음 | 높음 |
| B-17 | 수동·자동 큐레이션 분리 | P1 | 중간 | 높음 |
| B-19 | 대표 문서 20개 선정 | P0 | 중간 | 매우 높음 |
| B-21 | 대표 문서 최소 metadata | P1 | 중간 | 높음 |
| B-23 | 역할 기반 다음 글 UI | P1 | 중간 | 높음 |
| B-25 | 공통 Hub 템플릿 | P1 | 중간 | 중간 |

---

# 두 번째 실제 실행 묶음

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

## 45. assistant

# Task 3-3. 콘텐츠 신뢰성·상태·대표 글 보완 백로그

이번 단계에서는 대표 문서 20개를 단순히 “좋은 글”로 선정하는 데서 끝내지 않고, **지금도 믿고 읽을 수 있는 문서**로 만드는 작업을 정의한다.

핵심 목표는 다음이다.

```text
이 글은 무엇을 다루는가
어떤 환경에서 확인했는가
무엇이 사실이고 무엇이 추론인가
현재도 유효한가
다음에는 무엇을 읽어야 하는가
```

---

# Epic C. 콘텐츠 신뢰성·상태·대표 문서 보완

## C-01. 콘텐츠 상태 모델 확정

모든 글을 무조건 `current`와 `old`로만 나누면 부족하다.

추천 상태는 다섯 개다.

```text
current
needs-review
historical
superseded
archived
```

## 상태 정의

### `current`

현재도 유효하며 대표 문서나 일반 탐색에서 적극적으로 노출해도 되는 글.

### `needs-review`

내용 일부가 낡았을 가능성이 있거나 환경·출처·결론을 다시 확인해야 하는 글.

### `historical`

특정 과거 버전이나 당시 환경을 설명하는 데 가치가 있는 글.

예:

```text
Linux 5.x 기준 동작
CUDA 11.8 기준 실험
XRT 2.13.466 환경의 U250 문제
```

### `superseded`

더 나은 신판이나 통합 문서가 존재하는 글.

### `archived`

사이트 구조상 적극적으로 노출하지 않지만 기록 보존 목적은 있는 글.

---

## 피해야 할 상태

```text
active
legacy
deprecated
old
obsolete
outdated
```

이런 표현은 기준이 모호하거나 서로 겹치기 쉽다.

## 완료 조건

- 상태 종류가 5개 이하
- 각 상태의 노출·검색·추천 규칙이 정의됨
- 상태 변경 기준이 문서화됨
- `updated`와 `lastVerified`가 상태와 분리됨

## 우선순위

```text
P0
```

---

# C-02. 상태별 노출 정책 정의

상태만 저장하고 UI·검색·Sitemap에서 똑같이 처리하면 의미가 없다.

## 권장 정책

| 상태 | 일반 검색 | Topic Hub | Featured | Sitemap | 광고 |
|---|---|---|---|---|---|
| current | 정상 | 가능 | 가능 | 포함 | 가능 |
| needs-review | 정상 또는 감점 | 제한적 | 불가 | 포함 | 조건부 |
| historical | 상태 표시 | 별도 영역 | 불가 | 포함 가능 | 제한 |
| superseded | 신판 우선 | 제외 | 불가 | 상황별 | 비활성 권장 |
| archived | 기본 제외 | 제외 | 불가 | 대체로 제외 | 비활성 |

## 핵심 불변조건

```text
superseded → featured 불가
archived → home 노출 불가
needs-review → 대표 Guide 불가
draft → sitemap 불가
```

## 완료 조건

- 검색 ranking에 상태가 반영됨
- Hub와 Featured가 같은 상태 정책을 사용함
- 상태 규칙이 여러 컴포넌트에 중복 구현되지 않음

## 우선순위

```text
P0
```

---

# C-03. 최소 metadata schema 도입

처음부터 모든 글에 거대한 front matter를 요구하면 실패한다.

대표 문서 20개부터 다음 필드만 우선 적용한다.

```yaml
type: guide
topic: pcie-cxl
status: current
updated: 2026-08-01
```

검증이 실제로 수행됐다면:

```yaml
lastVerified: 2026-08-01
```

필요한 글에는:

```yaml
testedWith:
  os: Ubuntu 24.04
  kernel: 6.8
  hardware: AMD Alveo U250
  sdk: XRT 2.13.466
```

## 필수와 선택

### 대표 글 필수

```text
type
topic
status
updated
```

### 실험·디버깅 글 권장

```text
lastVerified
testedWith
```

### 모든 글에 강제하지 않을 것

```text
difficulty
audience
readingTime
keywords
prerequisites
related
```

이런 값은 후속 단계에서 실제 필요가 확인되면 추가한다.

---

# C-04. `updated`와 `lastVerified` 분리

이 둘은 반드시 다르게 취급해야 한다.

## `updated`

문서 내용이 수정된 날짜.

다음도 포함될 수 있다.

- 문장 정리
- 링크 수정
- 오탈자 수정
- 구조 개편
- 예제 추가

## `lastVerified`

기술적 주장이나 절차를 실제 환경에서 다시 확인한 날짜.

다음이 필요하다.

- 명령 재실행
- 코드 또는 사양 재확인
- 결과 재측정
- 대상 버전 확인

## 안티패턴

```text
문장 하나 수정
→ updated 변경
→ lastVerified도 자동 변경
```

## 권장 운영

`lastVerified`는 자동으로 바꾸지 않는다.

명시적인 검증 작업에서만 변경한다.

## 완료 조건

- 두 날짜가 UI에서 다른 의미로 표시됨
- 일반 수정으로 검증일이 갱신되지 않음
- 검증되지 않은 글이 최신처럼 보이지 않음

---

# C-05. 콘텐츠 타입 확정

초기 타입은 여섯 개면 충분하다.

```text
guide
concept
debug-note
experiment
source-walkthrough
reference
```

## 타입별 목적

### Guide

주제 전체 흐름과 학습 경로 제공.

### Concept

하나의 개념이나 메커니즘을 깊게 설명.

### Debug Note

실제 증상·가설·증거·원인·해결 기록.

### Experiment

가설·방법·결과·해석·한계 중심.

### Source Walkthrough

특정 저장소·파일·함수의 실행 흐름 분석.

### Reference

빠르게 다시 찾기 위한 표·명령·레지스터·API 정리.

## 피해야 할 타입

```text
article
post
tutorial
note
```

너무 포괄적이거나 다른 타입과 겹친다.

## 완료 조건

- 대표 글 20개가 모두 한 타입으로 분류됨
- 같은 검색 의도의 글이 타입만 다르게 위장되지 않음
- 타입별 상단 UI와 리뷰 기준이 다름

---

# C-06. 타입별 최소 품질 기준

모든 타입에 같은 템플릿을 강제하지 않는다.

## Guide

```text
대상과 범위
전체 구조
학습 순서
대표 하위 문서
결론 또는 다음 단계
```

## Concept

```text
핵심 질문
정확한 모델
동작 과정
오해하기 쉬운 부분
적용 범위
```

## Debug Note

```text
증상
정상 기대값
가설
수집한 증거
제외한 원인
확정 원인
해결
재발 방지
```

## Experiment

```text
질문
가설
환경
방법
baseline
결과
해석
한계
```

## Source Walkthrough

```text
대상 버전
진입점
호출 흐름
핵심 자료구조
중요 분기
최종 결과
```

## Reference

```text
범위
정확한 표기
빠른 조회 구조
출처
버전
```

---

# C-07. 대표 문서 20개 감사표 생성

대표 글마다 다음을 한 행으로 관리한다.

| 문서 ID | Topic | Type | Status | 환경 필요 | 중복 후보 | 보완 수준 |
|---|---|---|---|---|---|---|
| pcie-bar-sizing | PCIe & CXL | Concept | Current | 예 | 있음 | 중간 |
| linux-pci-enumeration | PCIe & CXL | Source Walkthrough | Needs Review | 예 | 없음 | 높음 |
| uboot-driver-model | Firmware | Guide | Current | 부분 | 있음 | 낮음 |

## 보완 수준

```text
낮음
중간
높음
통합 검토
```

## 목적

- 모든 글을 동시에 수정하지 않음
- 어떤 글이 바로 Featured 가능한지 판단
- 중복과 검증 부채를 동시에 확인
- 작업량 예측

## 우선순위

```text
P0
```

---

# C-08. 대표 문서의 상단 신뢰 블록

상단에 metadata를 모두 펼치면 본문 진입이 늦어진다.

권장 구조는 한 줄 또는 작은 패널이다.

```text
Concept · PCIe & CXL · Current
Updated 2026-08-01 · Verified 2026-07-20
```

환경이 중요한 문서는 별도 접이식 또는 짧은 행으로 둔다.

```text
Tested with: Linux 6.8 · GCC 13 · Alveo U250 · XRT 2.13.466
```

## 표시 우선순위

```text
상태
타입
Topic
업데이트
검증일
환경
```

단, 모든 값을 같은 시각적 무게로 강조하지 않는다.

## 피해야 할 것

- 배지 6개 이상
- 강한 경고색 남용
- 환경 전체를 거대한 표로 표시
- `current`를 과도하게 홍보
- 수정일과 검증일을 하나로 합침

---

# C-09. 상태 배너 설계

`current` 글에는 별도 배너가 필요 없다.

경고가 필요한 상태만 표시한다.

## `needs-review`

```text
이 문서는 일부 환경이나 버전 정보를 다시 확인할 필요가 있습니다.
중요한 적용 전 원문 자료와 현재 버전을 함께 확인하세요.
```

## `historical`

```text
이 문서는 당시 환경을 기록한 자료입니다.
현재 버전에서는 동작이나 설정이 달라질 수 있습니다.
```

## `superseded`

```text
이 문서는 새 문서로 대체되었습니다.
현재 가이드: [신규 문서 제목]
```

## `archived`

```text
보존용 문서입니다. 일반 학습 경로에서는 사용하지 않습니다.
```

## 완료 조건

- 상태별 메시지가 한 문장으로 명확함
- 대체 문서가 있으면 직접 링크
- 배너가 본문보다 더 강하지 않음
- 검색 결과에도 상태가 최소한 표시됨

---

# C-10. 근거·관찰·추론 구분

대표 기술 글에서 가장 중요한 개선 중 하나다.

## 구분 모델

```text
Specification
Source Code
Observation
Interpretation
Hypothesis
Conclusion
```

모든 글에 이 제목을 강제할 필요는 없다.

다만 문장 수준에서 구분이 보여야 한다.

## 예시

### 나쁜 표현

```text
DDR 컨트롤러가 초기화되지 않아 BAR 접근이 실패했다.
```

### 개선된 표현

```text
관찰 결과 BAR 영역을 mmap한 뒤에도 유효한 데이터가 반환되지 않았다.

보드 문서와 초기화 순서를 고려하면 DDR 컨트롤러가 아직 활성화되지 않았을
가능성이 있다. 다만 해당 상태 레지스터를 직접 확인하지 못했으므로
현재 단계에서는 가설로 남긴다.
```

## 권장 callout

```text
확인된 사실
관찰
가설
주의
```

네 가지 정도면 충분하다.

`specification`, `source`는 일반 인용으로 처리해도 된다.

---

# C-11. 가설을 사실로 바꾸는 자동 문체 수정 금지

문장 정리나 AI 교정 과정에서 다음 변화가 자주 발생한다.

```text
가능성이 있다
→ 원인이다

확인하지 못했다
→ 확인됐다

이 환경에서는
→ 일반적으로
```

이를 막아야 한다.

## 리뷰 규칙

다음 표현이 변경되면 검토 대상으로 잡는다.

```text
가능성
추정
관찰
미확인
환경에 따라
현재 버전에서
```

## 자동화 가능 범위

- 위험 문구 후보 표시
- diff에서 불확실성 표현 삭제 감지
- 단정형 문장 후보 제시

최종 판단은 사람이 한다.

---

# C-12. 테스트 환경 템플릿

환경을 자유 서술만 하면 글마다 형식이 달라진다.

하지만 모든 필드를 고정하면 과도하다.

## 공통 후보 필드

```yaml
testedWith:
  os:
  kernel:
  compiler:
  hardware:
  sdk:
  toolchain:
```

값이 없는 필드는 생략한다.

## 분야별 예시

### CUDA

```yaml
testedWith:
  os: Windows 11
  gpu: GTX 1070
  driver: 522.06
  cuda: 11.8
  compiler: MSVC 2019
```

### FPGA/XRT

```yaml
testedWith:
  os: CentOS 7.9
  kernel: 3.10.0-1160
  hardware: AMD Alveo U250
  xrt: 2.13.466
  vivado: 2021.2
```

### Linux source analysis

```yaml
testedWith:
  kernelSource: Linux 6.12
  architecture: x86_64
```

## 주의

환경 metadata는 상세 실험 기록을 대체하지 않는다.

복잡한 설정은 본문에 설명한다.

---

# C-13. 소스코드 분석 글에 commit 기준 추가

`main`이나 최신 branch를 기준으로 분석하면 시간이 지나며 글이 틀어질 수 있다.

## 최소 표기

```text
Repository
Tag 또는 commit
File
Symbol
```

예:

```text
Linux kernel v6.12
drivers/pci/probe.c
pci_scan_child_bus()
```

가능하면 permalink를 사용한다.

## 완료 조건

- 대표 Source Walkthrough의 대상 버전이 명시됨
- 파일 경로와 symbol이 확인 가능
- 줄 번호보다 symbol 중심으로 설명
- 최신 코드와 달라질 가능성을 표시

---

# C-14. 사양 기반 글에 revision 추가

다음 표현은 불충분하다.

```text
PCIe Specification에 따르면
CXL Specification에서는
UEFI 표준에 따르면
```

## 권장 표기

```text
PCI Express Base Specification Revision 5.0
CXL 3.0 Specification
UEFI Specification 2.10
```

정확한 section이 핵심 근거라면 함께 기록한다.

## 주의

사양서의 긴 문장을 그대로 복사하기보다 다음을 설명한다.

```text
해당 요구사항이 실제 구현에 어떤 의미인지
로그나 레지스터에서 어떻게 확인하는지
어떤 예외가 있는지
```

---

# C-15. 디버깅 글의 실패 과정 복원

기존 Debug Note가 해결책만 남아 있다면 고유 가치가 약하다.

대표 디버깅 글에는 다음을 복원한다.

```text
처음 관찰한 증상
정상이라면 보여야 할 값
처음 세운 가설
실패한 접근
결정적인 로그 또는 측정
최종 원인
해결 후 검증
```

## 예시

```text
가설 1: BAR 매핑 주소가 잘못됐다
→ lspci와 resource 파일을 비교해 제외

가설 2: IOMMU가 주소를 변환했다
→ passthrough 설정과 dmesg를 확인해 가능성 낮음

가설 3: 장치 내부 DDR이 초기화되지 않았다
→ 초기화 순서를 변경한 뒤 유효 데이터 확인
```

이런 과정이 공식 문서 요약과 다른 실전 가치다.

---

# C-16. 실험 글의 baseline과 반복 보완

성능 결과를 단일 숫자로 제시하지 않는다.

## 최소 항목

```text
Baseline
변경점
입력 크기
warm-up
반복 횟수
대표값
변동 범위
환경
```

## 결과 표 예시

| 조건 | Median | Min | Max | 반복 |
|---|---:|---:|---:|---:|
| Pageable | 12.8 ms | 12.4 | 13.5 | 50 |
| Pinned | 7.1 ms | 6.9 | 7.5 | 50 |

## 결론 예시

```text
이 환경과 전송 크기에서는 pinned memory가 약 44% 빠르다.
다만 작은 전송에서는 할당 비용 때문에 같은 이점이 나타나지 않을 수 있다.
```

---

# C-17. 대표 글의 범위와 한계 추가

모든 대표 글에 장문의 `Limitations` 섹션이 필요하지는 않다.

다만 최소한 다음은 명확해야 한다.

```text
어떤 버전인가
어떤 환경인가
무엇을 확인하지 않았는가
어디까지 일반화할 수 있는가
```

## 짧은 형태

```text
범위: Linux 6.12의 x86 PCI 초기화 흐름을 기준으로 한다.
ARM host와 firmware-first 구성은 별도로 확인하지 않았다.
```

---

# C-18. 대표 글 결론 재작성

좋은 결론은 본문 소제목을 반복하지 않는다.

다음 세 질문에 답한다.

```text
무엇이 핵심인가
실무에서는 무엇부터 확인해야 하는가
어떤 조건에서는 결론이 달라지는가
```

## 예시

```text
BAR 문제를 볼 때는 드라이버 코드보다 먼저 장치가 보고한 BAR 크기,
firmware의 주소 할당, 운영체제 resource 등록을 순서대로 확인해야 한다.

장치가 정상적으로 열거됐더라도 내부 메모리 컨트롤러 초기화가 끝나지 않았다면
BAR 접근 결과는 여전히 유효하지 않을 수 있다.
```

---

# C-19. 대표 글의 하단 관계 추가

대표 글 20개에만 우선 적용한다.

```yaml
prerequisites:
  - pcie-configuration-space
next:
  - pcie-msix
related:
  - linux-pci-enumeration
```

## 노출 우선순위

```text
상위 Topic
필수 선행 1~2개
다음 단계 1개
실전 사례 1개
```

너무 많은 링크를 넣지 않는다.

## 완료 조건

- 대표 글에 dead end가 없음
- 같은 글이 여러 슬롯에 반복되지 않음
- `superseded` 글이 추천되지 않음
- 링크 이유가 UI에 표시됨

---

# C-20. 대표 글 보완 순서

20개를 동시에 작업하지 않는다.

## 1차: 바로 Featured 가능한 글 5개

```text
상태가 current
내용이 비교적 완성됨
중복이 적음
보완량이 낮음
```

작업:

- metadata
- 제목·description
- 신뢰 블록
- Topic 연결
- 다음 글

## 2차: 강하지만 검증이 필요한 글 5개

작업:

- 버전·환경 재확인
- 출처 정리
- 결론 강도 조정
- 상태 current 전환

## 3차: 중복·구판과 엮인 글 5개

작업:

- 통합 여부 판단
- canonical role 결정
- redirect 또는 superseded 처리

## 4차: 실험·디버깅 대표 글 5개

작업:

- raw evidence
- 실패 가설
- baseline
- 한계 보강

---

# C-21. 대표 글 리뷰 체크리스트

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

# C-22. 자동 검사와 사람 검토의 경계

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

# C-23. `needs-review` 큐 운영

상태만 붙이고 방치하면 안 된다.

## 우선순위 계산

```text
대표 글 여부
검색 유입
기술 변화 가능성
오류 위험
상위 Hub 의존도
```

## 처리 상태

```text
queued
reviewing
verified
historical
superseded
```

별도 시스템이 아니라 간단한 Markdown 표나 GitHub Issue로 충분하다.

## 완료 조건

- `needs-review` 문서에 다음 행동이 있음
- 대표 문서는 기한 없이 방치하지 않음
- 검토 후 반드시 다른 상태로 전환됨

---

# C-24. 구판 문서 처리

구판을 무조건 삭제하지 않는다.

## Historical로 둘 조건

- 과거 버전 유지 사용자에게 유용
- 기술 변화 기록 가치가 있음
- 다른 자료에서 참조함
- 당시 장애 해결 과정이 고유함

## Superseded로 둘 조건

- 같은 검색 의도의 신판이 있음
- 기존 글보다 명확하고 완전한 문서가 있음
- 두 글을 동시에 유지하면 혼동됨

## Redirect를 고려할 조건

- 기존 글의 고유 가치가 거의 없음
- 신판이 내용을 완전히 포함
- 외부 링크가 새 글로 가도 문맥이 자연스러움

---

# C-25. 대표 글 보완과 AdSense 연결

AdSense 승인을 위한 형식적 작업으로 접근하면 안 된다.

대표 글 보완이 실질적으로 강화하는 것은 다음이다.

```text
작성자 경험
검증 가능한 환경
독창적인 분석
문서의 현재 상태
명확한 근거
관련 지식 구조
```

이는 단순히 글자 수를 늘리는 것보다 훨씬 직접적으로 콘텐츠 가치를 보여준다.

## 피해야 할 작업

```text
모든 글에 장문의 서론 추가
일반적인 장점·단점 문단 생성
불필요한 FAQ 대량 추가
문장만 AI로 길게 재작성
검증하지 않고 수정일만 갱신
```

---

# Epic C 완료 기준

## 대표 문서

```text
20개 선정 완료
20개 type/topic/status 지정
최소 10개 current
Featured 가능 문서 8개 이상
```

## 신뢰 정보

```text
환경이 필요한 글에 testedWith
실제 검증한 글에 lastVerified
사양 기반 글에 revision
소스 분석 글에 tag 또는 commit
```

## 내용

```text
사실·관찰·가설 구분
범위와 한계
역할 기반 다음 링크
중복·구판 상태 정리
```

## 시스템

```text
상태별 노출 정책
schema validation
relation validation
updated와 lastVerified 분리
```

---

# Epic C 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| C-01 | 상태 모델 확정 | P0 | 낮음 | 매우 높음 |
| C-02 | 상태별 노출 정책 | P0 | 중간 | 매우 높음 |
| C-03 | 최소 metadata schema | P0 | 중간 | 높음 |
| C-04 | updated/verified 분리 | P0 | 낮음 | 높음 |
| C-05 | 콘텐츠 타입 확정 | P0 | 낮음 | 높음 |
| C-07 | 대표 글 감사표 | P0 | 중간 | 매우 높음 |
| C-08 | 상단 신뢰 블록 | P1 | 중간 | 높음 |
| C-10 | 근거·관찰·추론 구분 | P0 | 높음 | 매우 높음 |
| C-12 | 환경 템플릿 | P1 | 낮음 | 높음 |
| C-13 | 소스 commit 기준 | P1 | 중간 | 높음 |
| C-14 | 사양 revision | P1 | 중간 | 높음 |
| C-15 | 디버깅 과정 복원 | P1 | 높음 | 매우 높음 |
| C-19 | 역할 기반 관계 | P1 | 중간 | 높음 |
| C-23 | Needs Review 큐 | P1 | 낮음 | 중간 |
| C-24 | 구판 처리 | P1 | 중간 | 높음 |

---

# 세 번째 실제 실행 묶음

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

## 46. assistant

# Task 3-4. 검색·내부 링크·콘텐츠 관계 개선 백로그

이번 단계에서는 검색과 관련 글을 “기능”이 아니라 **지식 발견 구조**로 다시 정의한다.

핵심 목표는 다음이다.

```text
정확한 글 찾기
→ 대표 문서 우선
→ 구판·중복 억제
→ 다음 학습 경로 제공
```

---

# Epic D. 검색·내부 링크·콘텐츠 관계

## D-01. 현재 검색 구조 측정

개선 전에 현재 검색 인덱스와 결과 품질을 먼저 측정한다.

## 확인 항목

```text
검색 인덱스 파일 크기
문서 레코드 수
본문 전체 포함 여부
코드·로그 포함 여부
브라우저 초기 로드 여부
검색 소요 시간
```

추가로 대표 검색어 20개를 직접 확인한다.

예:

```text
PCIe BAR
CXL HDM Decoder
CUDA pinned memory
U-Boot driver model
MSI-X interrupt
Linux PCI enumeration
```

## 기록할 결과

| 검색어 | 기대 1순위 | 실제 1순위 | 기대 문서 Top 3 포함 | 문제 |
|---|---|---|---|---|
| PCIe BAR | BAR 대표 Concept | 짧은 과거 글 | 아니오 | 중복·빈도 편향 |
| CXL HDM Decoder | 대표 Guide | 관련 없는 CXL 글 | 예 | 순위 낮음 |

## 완료 조건

- 인덱스 크기와 초기 로드 방식이 확인됨
- 대표 검색어 20개의 baseline이 있음
- 검색 결과 문제를 최소 세 유형으로 분류함

## 우선순위

```text
P0
```

---

# D-02. 검색 문서 모델 재설계

전체 렌더링 본문이나 HTML을 그대로 인덱싱하지 않는다.

## 권장 검색 레코드

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

## 기본적으로 제외할 것

```text
전체 코드 블록
전체 로그
내비게이션 문구
댓글
광고
푸터
반복되는 시리즈 안내
```

## 별도 필드로 고려할 것

함수명과 오류 메시지 검색은 기술 블로그에서 가치가 있으므로 완전히 버리지 않는다.

```ts
symbols: string[];
errorMessages: string[];
```

이 값은 본문 전체 대신 빌드 시 선택적으로 추출한다.

## 완료 조건

- 검색 레코드와 렌더링 HTML이 분리됨
- 코드·로그가 일반 검색 점수를 지배하지 않음
- 함수명·오류 문자열은 필요한 범위에서 검색 가능

---

# D-03. 검색 필드 가중치 정의

단어 출현 횟수만으로 순위를 계산하면 긴 글과 로그 덤프가 유리해진다.

## 권장 우선순위

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

## 상태 가중치

```text
current: 1.0
needs-review: 0.75
historical: 0.55
superseded: 검색 결과 하단 또는 기본 제외
archived: 기본 제외
```

## 타입 가중치

넓은 주제 검색에서는:

```text
Topic Hub
Guide
Concept
```

를 우선한다.

정확한 오류 메시지나 함수명 검색에서는:

```text
Debug Note
Source Walkthrough
Reference
```

가 우선할 수 있다.

즉 타입은 고정된 절대 점수가 아니라 검색 의도에 따라 보조적으로 사용한다.

---

# D-04. 한글·영문·기호 alias registry

검색 alias는 글마다 무작정 입력하지 않고 중앙 registry를 우선 사용한다.

예:

```yaml
- id: pcie-bar
  canonical: PCIe BAR
  aliases:
    - base address register
    - 베이스 주소 레지스터
    - bar register

- id: msi-x
  canonical: MSI-X
  aliases:
    - msix
    - msi x

- id: cache-coherence
  canonical: cache coherence
  aliases:
    - 캐시 일관성
    - coherence
    - coherency
    - 코히어런시
```

## 규칙 기반 정규화

다음은 개별 alias 등록보다 공통 규칙으로 처리한다.

```text
대소문자
공백과 하이픈
복수 공백
Unicode normalization
```

## 명시적 alias가 필요한 것

```text
C++ ↔ cpp ↔ cxx
MSI-X ↔ MSIX
IOMMU ↔ Input-Output Memory Management Unit
주소 변환 ↔ address translation
```

## 완료 조건

- C++, CXL, MSI-X 같은 기호 용어 검색 가능
- 한글과 영문 검색이 같은 대표 문서로 연결
- alias가 화면 제목을 변경하지 않음
- 잘못된 동의어가 자동 확장되지 않음

---

# D-05. 기술 식별자 검색 지원

네 사이트에서는 일반 키워드보다 다음 검색이 중요할 수 있다.

```text
cudaMemcpyAsync
pci_scan_child_bus
container_of
xclLoadXclBin
-ENOMEM
LTSSM
```

## 구현 원칙

- inline code와 코드 블록에서 식별자 후보 추출
- 모든 토큰을 저장하지 않고 빈도·길이·형태 필터 적용
- 표준 라이브러리와 핵심 함수명은 허용
- 단일 문자와 일반 예약어는 제외

## 후보 규칙

```text
snake_case
camelCase
PascalCase
namespace::symbol
UPPER_CASE_MACRO
negative error code
```

## 주의

44,000개 코드 블록 전체의 모든 token을 인덱싱하면 다시 인덱스가 비대해진다.

대표 symbol만 추출하거나 front matter에 명시하는 방식을 혼합한다.

```yaml
symbols:
  - pci_scan_child_bus
  - pci_bus_add_devices
```

---

# D-06. 오류 메시지 검색 지원

Debug Note의 강점은 정확한 오류 문자열 검색이다.

예:

```text
device not found
failed to load xclbin
no space for BAR
unknown code model
```

## 권장 방법

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

## 피해야 할 것

모든 로그 줄을 인덱싱하는 것.

## 완료 조건

- 대표 오류 메시지로 해당 Debug Note 검색 가능
- 일반 단어 검색에서 로그 문서가 과도하게 상위 노출되지 않음

---

# D-07. 대표 검색어 Golden Set 생성

초기에는 20개 정도면 충분하다.

## 분류

### 정확한 개념

```text
PCIe BAR
CXL HDM Decoder
CUDA stream
```

### 한글 표현

```text
캐시 일관성
주소 변환
부트로더 초기화
```

### Identifier

```text
container_of
pci_scan_child_bus
cudaMemcpyAsync
```

### 오류 메시지

```text
failed to load xclbin
BAR mmap failed
```

### 상위 주제

```text
PCIe
Firmware
CUDA
```

## 기대 결과 정의

정확한 점수를 고정하지 않고:

```text
필수 포함 문서
상위 3개 기대 문서
노출되면 안 되는 구판
```

을 지정한다.

예:

```yaml
query: PCIe BAR
mustInclude:
  - pcie-bar-sizing
topThreePreferred:
  - pcie-device-initialization
exclude:
  - old-pcie-bar-note
```

---

# D-08. 검색 결과 UI 재설계

검색 결과에는 제목만 보여주지 않는다.

## 권장 정보

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

## 상태 표시

- `current`: 별도 강한 배지 불필요
- `needs-review`: 작은 경고
- `historical`: 버전 문맥 표시
- `superseded`: 기본 검색에서 제외하거나 신판 아래에 표시

## 피해야 할 것

- 태그 5개 이상
- 긴 본문 snippet
- 일치하지 않은 일반 서론
- 읽기 시간과 모든 metadata 노출

---

# D-09. 검색 인덱스 지연 로딩

검색 기능을 사용하지 않는 방문자에게 전체 인덱스를 내려주지 않는다.

## 권장 흐름

```text
페이지 로드
→ 검색 버튼 클릭
→ 검색 UI 표시
→ 인덱스 로드
→ query 실행
```

인덱스가 충분히 작으면 한 파일로 시작한다.

초기부터 Topic별 shard를 만들 필요는 없다.

## 분할 기준

다음 조건이 실제로 발생할 때만 분할한다.

```text
압축 후 인덱스가 과도하게 큼
모바일에서 파싱 지연
검색 입력 중 main thread block
```

## 완료 조건

- 검색을 열지 않으면 인덱스 요청이 발생하지 않음
- 첫 검색 이후에는 재사용
- 로딩 실패 시 Topic 탐색 링크 제공

---

# D-10. 검색 실패 fallback

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

# D-11. 고아 문서 정의

모든 내부 링크가 없는 글을 무조건 문제로 보지 않는다.

## 실질적인 고아 문서

다음을 모두 만족하는 글:

```text
공개 상태
일반 검색 대상
상위 Topic 없음
들어오는 의미 링크 없음
시리즈 소속 없음
```

태그 목록이나 아카이브 링크만 있는 경우도 구조상 고아에 가깝다.

## 예외

- 독립 Reference
- Historical 기록
- 의도적인 standalone landing page

예외도 가능하지만 이유를 기록한다.

---

# D-12. 고아 문서 감사 리포트

리포트 필드:

```text
문서 ID
제목
상태
Topic
inbound 의미 링크 수
outbound 의미 링크 수
시리즈
추천 조치
```

추천 조치:

```text
Topic Hub에 연결
대표 Concept에서 연결
시리즈에 편입
다른 글과 통합
Historical 처리
그대로 유지
```

## 우선순위

먼저 다음 문서를 처리한다.

```text
current
검색 유입 있음
고유 내용 있음
상위 Topic 없음
```

---

# D-13. 의미 링크와 UI 링크 분리

모든 `<a>`를 지식 관계로 계산하면 헤더·푸터·카드 링크 때문에 그래프가 왜곡된다.

## 의미 링크

```text
본문에서 설명 목적으로 연결
선행 문서
다음 문서
상위 Topic
대체 문서
```

## UI 링크

```text
헤더
푸터
태그 목록
아카이브
페이지네이션
```

콘텐츠 manifest에서는 의미 링크만 별도로 추출한다.

---

# D-14. 내부 링크 anchor 개선

다음 표현은 피한다.

```text
여기
자세히 보기
관련 글
참고
```

## 개선 예

```text
PCIe BAR 크기 탐색 과정에서 자세히 설명한다.
Linux의 PCI enumeration 호출 흐름을 이어서 확인한다.
```

## 자동 검사 가능 범위

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

# D-15. 대표 문서의 역할 기반 관계

대표 문서 20개부터 다음 관계를 수동으로 지정한다.

```yaml
parent: pcie-cxl
prerequisites:
  - pcie-configuration-space
next:
  - pcie-msix
related:
  - linux-pci-enumeration
supersedes:
```

## 노출 규칙

### 글 상단

필요한 경우 선행 지식 1~2개.

### 글 하단

```text
상위 Topic
다음 단계
실전 사례
```

### 검색 결과

대표 Guide와 대체 문서 관계만 순위에 반영.

---

# D-16. 관련 글 추천 재설계

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

# D-17. 구판과 신판 관계 처리

`superseded` 글은 단순히 검색에서 숨기는 것으로 끝내지 않는다.

## 구판 페이지

```text
대체 문서 안내
왜 대체됐는지
과거 버전에서만 유효한 내용
```

## 신판 페이지

필요하면:

```text
이전 버전 문서
```

를 Historical 자료로 연결한다.

## 검색

정확한 과거 버전 검색에서는 구판을 보여줄 수 있다.

예:

```text
XRT 2.13 U250 interrupt
```

하지만 일반 검색에서는 신판이 우선이다.

---

# D-18. Topic Cannibalization 리포트

유사 글을 텍스트 유사도만으로 판단하지 않는다.

## 후보 생성 신호

```text
제목 유사도
동일 Topic
동일 주요 heading
공통 alias
비슷한 description
```

## 사람 검토 항목

```text
검색 의도가 같은가
문서 타입이 다른가
고유 실험이 있는가
버전이 다른가
하나가 다른 글을 완전히 포함하는가
```

## 결과

```text
유지
역할 구분
통합
Historical
Superseded
```

---

# D-19. Topic Hub와 검색 역할 분리

검색은 정확한 질문을 가진 독자를 돕는다.

Topic Hub는 무엇을 읽어야 할지 모르는 독자를 돕는다.

따라서 검색 결과 페이지에서 넓은 검색어에는 Hub를 적절히 노출한다.

예:

```text
PCIe
```

검색 결과:

```text
1. PCIe & CXL Topic Hub
2. PCIe 장치 초기화 전체 Guide
3. PCIe Configuration Space
```

반면 정확한 검색어:

```text
PCIe BAR size probing
```

에서는 Concept 글이 1순위여야 한다.

---

# D-20. 최근 검색·인기 검색 기능 보류

다음 기능은 초기 개선에 필요하지 않다.

```text
인기 검색어
최근 검색 기록
개인화 추천
자동 완성 서버
벡터 검색
LLM 검색 답변
```

이들은 개인정보·복잡성·운영 비용을 늘린다.

먼저 정적 lexical 검색과 명시적 alias를 제대로 만든다.

---

# D-21. 검색 분석 최소화

검색 품질 개선을 위해 모든 원문 query를 장기 수집할 필요는 없다.

## 최소 관측

```text
검색 결과 없음 횟수
선택된 결과 순위
검색 후 재검색 여부
```

가능하면 원문 검색어는 로컬 집계 또는 짧은 보존을 고려한다.

특히 오류 로그와 회사 내부 식별자가 검색창에 들어갈 수 있다는 점을 고려한다.

---

# D-22. 내부 링크 검증

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

# D-23. 검색 manifest와 공개 페이지 집합 일치

다음 집합은 공통 publication policy에서 생성해야 한다.

```text
공개 페이지
검색 인덱스
Sitemap
RSS
Topic Hub 자동 목록
```

## 불변조건

```text
draft → 어디에도 없음
archived → 일반 검색 기본 제외
superseded → Sitemap 정책에 따라 제한
공개하지 않은 페이지 → 검색 레코드 없음
```

이 규칙이 각 generator에 따로 구현되면 드리프트가 발생한다.

---

# D-24. 검색 성능 예산

초기 권장 목표는 절대 수치보다 현재 대비 회귀 방지다.

## 기록할 것

```text
압축 전·후 인덱스 크기
인덱스 fetch 시간
파싱 시간
첫 검색 응답
후속 검색 응답
모바일 메모리
```

## 완료 기준 예시

```text
검색 미사용 시 인덱스 다운로드 없음
첫 검색 입력 후 UI가 장시간 멈추지 않음
대표 query 20개 품질 개선
기존 대비 인덱스 크기 급증 없음
```

---

# D-25. 검색·관계 테스트

## 매 검색 변경 시

```text
Golden query 20개
한글·영문 alias
기호 포함 용어
identifier
오류 메시지
구판 제외
```

## 관계 변경 시

```text
대상 문서 존재
자기 참조 없음
중복 슬롯 없음
superseded 추천 없음
inverse 관계 일관성
```

## UI 변경 시

```text
모바일 검색
키보드 탐색
Escape 종료
focus 복원
결과 없음
인덱스 로드 실패
```

---

# Epic D 완료 기준

## 검색

```text
정제된 SearchDocument schema
대표 query 20개 baseline과 기대 결과
한글·영문·기호 alias
상태 기반 ranking
지연 로딩
```

## 내부 링크

```text
고아 문서 리포트
대표 글 역할 기반 관계
깨진 anchor 검사
redirect 내부 링크 정리
```

## 중복

```text
유사 글 10개 검토
대표 canonical role 지정
구판 상태 반영
```

## 품질

```text
검색 결과에 type/topic/status 표시
대표 Guide가 넓은 검색어에서 우선
정확한 오류·symbol 검색 가능
```

---

# Epic D 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| D-01 | 현재 검색 baseline | P0 | 낮음 | 높음 |
| D-02 | 검색 문서 모델 | P0 | 중간 | 매우 높음 |
| D-03 | 필드·상태 가중치 | P0 | 중간 | 높음 |
| D-04 | alias registry | P0 | 중간 | 매우 높음 |
| D-05 | 식별자 검색 | P1 | 중간 | 높음 |
| D-06 | 오류 메시지 검색 | P1 | 중간 | 높음 |
| D-07 | Golden query set | P0 | 낮음 | 매우 높음 |
| D-08 | 검색 결과 UI | P1 | 중간 | 높음 |
| D-09 | 인덱스 지연 로딩 | P1 | 중간 | 중간 |
| D-11 | 고아 문서 정의 | P0 | 낮음 | 높음 |
| D-12 | 고아 문서 리포트 | P1 | 중간 | 높음 |
| D-15 | 역할 기반 관계 | P0 | 중간 | 매우 높음 |
| D-16 | 관련 글 재설계 | P1 | 중간 | 높음 |
| D-18 | Cannibalization 리포트 | P1 | 중간 | 높음 |
| D-23 | 공개 manifest 통합 | P0 | 높음 | 매우 높음 |

---

# 네 번째 실제 실행 묶음

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

## 47. assistant

# Task 3-5. 빌드 성능·콘텐츠 파이프라인 개선 백로그

이번 단계에서는 Astro 자체를 교체하지 않고, **현재 콘텐츠 규모에서 반복되는 전체 재처리와 메모리 사용을 줄이는 방향**으로 정리한다.

핵심 목표는 다음이다.

```text
현재 상태 측정
→ 병목 단계 분리
→ 콘텐츠를 한 번만 해석
→ 파생 작업 증분화
→ 로컬·CI 실행 경로 분리
```

---

# Epic E. 빌드 성능과 콘텐츠 파이프라인

## E-01. 빌드 단계별 기준선 측정

현재는 전체 빌드가 느리거나 heap을 많이 사용하더라도 어느 단계가 원인인지 분명하지 않을 수 있다.

전체 시간만 기록해서는 다음을 구분할 수 없다.

```text
Markdown 파싱
Shiki 하이라이팅
검색 인덱스
OG 이미지
SVG·다이어그램
링크 검사
Astro 페이지 생성
```

## 작업

각 주요 단계의 시작·종료 시간과 처리량을 기록한다.

```text
단계 이름
처리 문서 수
처리 코드 블록 수
소요 시간
메모리 변화
생성 파일 크기
```

## 예시 출력

```text
[content] 532 documents parsed in 4.2s
[highlight] 8,412 code blocks processed in 31.8s
[search] 532 records generated in 2.1s
[og] 12 assets regenerated in 6.3s
[astro] 711 pages rendered in 18.4s
```

## 메모리 측정

최소한 다음을 기록한다.

```text
시작 RSS
단계 종료 RSS
Peak RSS
Node heap used
```

정밀 profiler를 처음부터 만들 필요는 없다. `process.memoryUsage()`와 CI 시간 기록만으로도 1차 병목을 찾을 수 있다.

## 완료 조건

- 전체 빌드 시간이 단계별로 나뉨
- 가장 느린 상위 3개 단계가 확인됨
- Peak memory가 어느 단계에서 증가하는지 확인됨
- 문서 수와 코드 블록 수가 함께 기록됨

## 우선순위

```text
P0
```

---

# E-02. 빌드 명령 역할 분리

하나의 `build` 명령이 모든 감사와 생성 작업을 실행하면 로컬 반복 속도가 지나치게 느려진다.

## 권장 명령

```text
dev
check
build
build:release
audit
```

## 역할

### `dev`

```text
로컬 개발 서버
변경 콘텐츠 중심
무거운 전체 감사 제외
```

### `check`

```text
TypeScript
콘텐츠 schema
내부 링크
relation integrity
slug uniqueness
```

### `build`

```text
일반 production 정적 빌드
필수 생성 작업
```

### `build:release`

```text
production build
검색 인덱스
Sitemap
RSS
필수 OG
배포 smoke test
```

### `audit`

```text
전체 외부 링크
중복 후보
오래된 문서
대형 이미지
전체 콘텐츠 품질 리포트
```

## 핵심 원칙

```text
정확성을 위해 반드시 필요한 검사
≠
매번 실행해야 하는 검사
```

## 완료 조건

- 오탈자 수정에 전체 외부 링크 검사가 실행되지 않음
- 로컬에서도 CI와 동일한 필수 검사 실행 가능
- `build`와 `audit`의 실패 의미가 구분됨
- 배포에 필요한 작업은 `build:release` 한 명령으로 재현 가능

## 우선순위

```text
P0
```

---

# E-03. 공통 Content Manifest 생성

현재 가장 큰 구조적 개선 후보다.

검색 생성기, 링크 검사기, Topic Hub, RSS, Sitemap이 각각 Markdown을 읽고 있다면 같은 콘텐츠를 여러 번 파싱하게 된다.

## 목표 구조

```text
Markdown files
      ↓
Content Manifest
      ↓
Pages / Search / RSS / Sitemap / Graph / Audits
```

## Manifest 예시

```ts
interface ContentManifestEntry {
  id: string;
  sourcePath: string;
  slug: string;
  url: string;

  title: string;
  description: string;
  published: string;
  updated?: string;
  lastVerified?: string;

  topic?: string;
  type?: string;
  status: string;

  headings: {
    id: string;
    text: string;
    depth: number;
  }[];

  internalLinks: string[];
  symbols: string[];
  errorMessages: string[];

  contentHash: string;
}
```

## Manifest에 넣지 않을 것

```text
전체 Markdown AST
전체 syntax token
전체 렌더링 HTML
모든 코드 블록 원문
전체 이미지 binary
```

공통 데이터는 유지하되 대형 중간 객체는 빌드 끝까지 보관하지 않는다.

## 완료 조건

- 콘텐츠 파싱 진입점이 한 곳으로 통합됨
- 검색·Sitemap·RSS가 동일한 공개 정책을 사용함
- 문서마다 안정적인 `contentHash`가 생성됨
- AST는 필요한 단계 이후 해제됨

## 우선순위

```text
P0
```

## 예상 난도

```text
높음
```

하지만 이후의 검색·링크·증분 빌드를 모두 단순화하기 때문에 수익률이 크다.

---

# E-04. Publication Policy 중앙화

현재 각 생성기가 다음을 각각 판단하면 안 된다.

```text
이 글은 공개하는가?
검색에 넣는가?
Sitemap에 넣는가?
RSS에 넣는가?
Hub에 노출하는가?
```

## 권장 함수

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

## 예시 정책

```text
draft
→ production render 제외

current
→ 모든 일반 출력 포함

needs-review
→ render/search/sitemap 포함, Featured 제외

historical
→ render/search 포함, ranking 감점

superseded
→ render 가능, 일반 추천·Featured 제외

archived
→ 직접 URL만 유지하거나 일반 목록 제외
```

## 완료 조건

- 검색과 Sitemap의 문서 집합이 충돌하지 않음
- Draft가 어느 생성물에도 새지 않음
- 상태 정책 변경이 한 곳에서 가능
- 각 컴포넌트가 상태 분기 로직을 다시 구현하지 않음

## 우선순위

```text
P0
```

---

# E-05. Markdown 다중 파싱 제거

## 탐지 방법

코드베이스에서 다음 패턴을 찾는다.

```text
glob Markdown
gray-matter parse
remark parse
getCollection 반복 호출
본문 문자열 재처리
```

도구마다 별도로 파일을 순회하고 있다면 공통 manifest로 이동한다.

## 허용되는 예외

실제 렌더링용 AST와 검색용 metadata 추출은 요구가 다를 수 있다.

그러나 최소한:

```text
front matter
URL
상태
Topic
heading
링크
hash
```

는 한 번만 추출한다.

## 완료 조건

- 동일 문서의 metadata 파싱 횟수가 한 빌드에서 최소화됨
- 링크 검사기가 Markdown 파일을 다시 읽지 않음
- Topic Hub가 별도로 front matter를 재해석하지 않음

## 우선순위

```text
P0
```

---

# E-06. AST 생명주기 제한

모든 글의 AST를 배열에 저장하면 콘텐츠가 증가할수록 Peak RSS가 커진다.

## 나쁜 흐름

```text
전체 문서 읽기
→ 전체 AST 보관
→ 모든 transformation
→ 모든 출력 완료 후 해제
```

## 권장 흐름

```text
문서 1개 읽기
→ 필요한 metadata 추출
→ 렌더 또는 중간 파일 생성
→ AST 해제
→ 다음 문서
```

일부 전역 분석에는 전체 문서 정보가 필요하지만, 이때도 전체 AST가 아니라 작은 manifest만 사용한다.

## 완료 조건

- 전역 배열에 Markdown AST나 syntax token이 없음
- 문서 처리 후 참조가 제거됨
- Peak RSS가 문서 수에 거의 선형으로 증가하지 않음
- heap 확대 없이 빌드가 가능한지 재검토됨

## 우선순위

```text
P0
```

---

# E-07. Shiki 처리량 측정

코드 블록이 많은 기술 블로그에서는 syntax highlighting이 가장 큰 병목일 가능성이 있다.

## 먼저 측정할 것

```text
전체 코드 블록 수
언어별 코드 블록 수
평균 코드 길이
상위 20개 대형 코드 블록
하이라이팅 총 시간
생성 HTML 크기
```

## 언어 분포 예시

```text
cpp: 3,200
c: 1,850
bash: 1,100
text: 980
python: 430
rust: 310
unknown: 74
```

이 자료가 있어야 어떤 grammar를 실제로 유지할지 판단할 수 있다.

## 완료 조건

- 사용 언어 분포가 확인됨
- `text`, 로그, 출력이 코드 하이라이팅 대상과 구분됨
- 상위 대형 코드 블록이 식별됨
- Shiki가 전체 빌드에서 차지하는 비율이 측정됨

## 우선순위

```text
P0
```

---

# E-08. 코드 블록 역할 분리

현재 모든 fenced block이 코드로 취급된다면 다음도 syntax highlighting을 받을 수 있다.

```text
터미널 출력
커널 로그
디렉터리 구조
레지스터 덤프
ASCII 다이어그램
설정 결과
```

## 권장 role

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

## 처리 정책

| 역할 | Highlight | 검색 symbol 추출 | 기본 wrap |
|---|---|---|---|
| source | 예 | 예 | 아니오 |
| command | 예 | 제한적 | 아니오 |
| output | 아니오 또는 최소 | 아니오 | 선택 |
| log | 아니오 또는 최소 | 오류만 | 선택 |
| dump | 아니오 | 아니오 | 아니오 |
| text | 아니오 | 아니오 | 예 |

## 완료 조건

- 로그와 출력이 무거운 grammar를 사용하지 않음
- 검색 인덱스에 전체 로그가 들어가지 않음
- UI에서 명령과 출력이 구분됨
- 기존 콘텐츠는 기본값으로 계속 렌더링 가능

## 우선순위

```text
P1
```

---

# E-09. Shiki 언어 Allowlist

사용하지 않는 언어 grammar까지 모두 로드할 필요가 없다.

## 작업

실제 언어 통계를 기준으로 allowlist를 만든다.

```ts
const SUPPORTED_LANGUAGES = [
  "c",
  "cpp",
  "bash",
  "python",
  "rust",
  "toml",
  "yaml",
  "json",
  "cmake",
  "asm",
  "text",
] as const;
```

## Alias 정규화

```text
c++ → cpp
cxx → cpp
shell → bash
sh → bash
plaintext → text
console → text 또는 shell-session
```

## 미등록 언어

무거운 자동 감지 대신 `text`로 fallback하고 warning을 남긴다.

```text
Unknown code language "cuu" in post X; rendered as text.
```

## 완료 조건

- grammar 로드 목록이 명시적
- alias가 한 곳에서 관리됨
- 오타가 빌드 메모리를 예측 불가능하게 늘리지 않음
- 사용하지 않는 grammar가 제거됨

## 우선순위

```text
P1
```

---

# E-10. 코드 하이라이팅 캐시

동일한 코드와 동일한 테마·옵션이면 결과도 동일하다.

## Cache key

```text
hash(
  code
  + canonicalLanguage
  + themeVersion
  + pluginOptions
)
```

## 저장 대상

```text
highlighted HTML
또는
필요한 token 결과
```

## 주의

캐시는 정확한 무효화 정책 없이 도입하면 stale 결과를 만든다.

다음이 바뀌면 무효화해야 한다.

```text
Shiki 버전
테마
코드 옵션
line highlighting metadata
renderer version
```

## 적용 우선순위

1차 개선에서 캐시를 바로 구현하지 않아도 된다.

먼저:

```text
로그 highlighting 제거
grammar 축소
대형 전체 소스 분리
```

를 적용한다.

그 이후에도 Shiki가 주 병목이면 캐시를 추가한다.

## 완료 조건

- cache key에 renderer version 포함
- cache miss/hit 수가 측정됨
- 캐시 삭제 후에도 전체 재생성 가능
- 캐시가 Git 원본으로 취급되지 않음

## 우선순위

```text
P2
```

---

# E-11. 대형 코드 블록 감사

하이라이팅 비용과 페이지 DOM을 동시에 줄이는 작업이다.

## 리포트

```text
문서
heading
language
line count
character count
generated HTML size
```

## 검토 기준

다음은 분리 후보다.

```text
200줄 이상
설명 없이 전체 파일 삽입
본문에서 일부만 참조
동일 코드가 여러 글에 중복
```

## 개선 방법

```text
핵심 부분만 본문에 포함
생략부 명시
전체 소스는 GitHub permalink
함수 단위로 분할
```

## 주의

길다고 무조건 제거하지 않는다. Source Walkthrough에서 전체 문맥이 필요한 경우도 있다.

## 완료 조건

- 상위 20개 대형 코드 블록 검토
- 불필요한 전체 파일 삽입 축소
- 본문 코드와 외부 전체 소스 역할 구분
- 검색 인덱스와 DOM 크기 감소 확인

## 우선순위

```text
P1
```

---

# E-12. 변경 파일 인식

모든 작업을 완전 증분화하기 전에, 최소한 변경 범위를 인식하도록 한다.

## 변경 입력

```text
Git diff
content hash
generator config hash
```

## 변경 파일 기반으로 처리 가능한 작업

```text
front matter validation
OG 이미지
이미지 경로 검사
문서별 검색 레코드
내부 outgoing link 검사
다이어그램 생성
```

## 전체 검사가 필요한 작업

```text
slug uniqueness
전체 relation integrity
redirect cycle
Sitemap 병합
검색 인덱스 최종 병합
```

## 완료 조건

- 변경 문서 목록을 한 번 계산해 여러 단계가 공유
- 문서별 작업과 전역 작업이 구분됨
- main release에서는 필요한 전체 불변조건을 계속 검사

## 우선순위

```text
P1
```

---

# E-13. 문서별 파생 레코드 생성

검색 인덱스 전체를 매번 처음부터 만드는 대신 문서별 레코드를 생성할 수 있다.

```text
.cache/search/<content-id>.json
```

## 재생성 조건

```text
contentHash 변경
search schema 변경
alias registry 변경
extractor version 변경
```

마지막에는 공개 가능한 레코드만 병합한다.

```text
문서별 레코드
→ publication filter
→ search-index.json
```

## 장점

- 글 하나 수정 시 추출 비용 감소
- 삭제 문서 식별 가능
- 검색 생성 문제를 문서 단위로 디버깅 가능

## 주의

최종 병합 자체는 전체 문서 집합을 확인해야 한다.

## 우선순위

```text
P1
```

---

# E-14. OG 이미지 증분 생성

모든 글의 OG 이미지를 매번 다시 만들 필요는 없다.

## 입력 hash

```text
문서 제목
부제목
Topic
작성자
템플릿 버전
폰트 버전
생성기 버전
```

이미지 파일의 존재만으로 재사용하지 말고 입력 hash를 비교한다.

## Manifest 예시

```json
{
  "pcie-bar-sizing": {
    "inputHash": "abc123",
    "output": "pcie-bar-sizing.png",
    "generatorVersion": "2"
  }
}
```

## 필수와 선택 구분

### 필수 OG

```text
홈
Topic Hub
Featured Guide
```

### 선택 OG

일반 글은 생성 실패 시 기본 공유 이미지를 사용할 수 있다.

## 완료 조건

- 변경된 문서만 OG 재생성
- 제목 변경이 반드시 자산 갱신으로 이어짐
- 삭제 글의 전용 OG가 정리됨
- 생성 실패가 조용히 무시되지 않음

## 우선순위

```text
P1
```

---

# E-15. 다이어그램 파이프라인 격리

TikZ·LaTeX·Graphviz 같은 도구를 모든 production build의 필수 경로에 두면 환경 재현성이 낮아진다.

## 권장 구조

```text
diagram source
→ 별도 generate command
→ optimized SVG
→ 일반 Astro build가 SVG 사용
```

## 실행 조건

```text
source hash 변경
generator version 변경
명시적 전체 재생성
```

## PR 정책

외부 기여가 가능하다면 위험한 generator를 고권한 배포 job에서 직접 실행하지 않는다.

## 완료 조건

- 일반 텍스트 수정은 LaTeX 설치 없이 빌드 가능
- 변경된 다이어그램만 재생성
- source와 output 관계가 manifest에 존재
- 생성 결과가 없을 때 오류 또는 명확한 fallback

## 우선순위

```text
P1
```

---

# E-16. 이미지 처리 정책

모든 이미지를 매번 다시 최적화하지 않는다.

## 원본과 파생물

```text
assets/source/
assets/generated/
```

또는 논리적으로라도 구분한다.

## 입력 hash

```text
원본 파일 hash
출력 크기
format
quality
transformer version
```

## 문서별 검사

변경된 문서의 이미지에 대해서만:

```text
존재 여부
width·height
대형 파일
alt 후보
```

를 확인한다.

전체 미사용 이미지 감사는 정기 작업으로 돌린다.

## 우선순위

```text
P1
```

---

# E-17. CI Job 분리

## 권장 파이프라인

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

## 핵심 보안·성능 효과

- build job는 `contents: read`
- deploy job만 최소 write 권한
- build를 여러 job에서 반복하지 않음
- 생성 artifact를 재사용

## 완료 조건

- 배포 job가 dependency build를 다시 실행하지 않음
- 테스트한 artifact와 배포 artifact가 동일
- deploy 권한이 build script에 노출되지 않음
- 실패 단계가 명확히 구분됨

## 우선순위

```text
P0
```

---

# E-18. Dependency 설치 캐시

캐시부터 최적화하기 전에 lockfile 기반 재현성을 먼저 확보한다.

## Cache key 후보

```text
OS
Node major
package manager version
lockfile hash
```

## 캐시 대상

package manager가 권장하는 다운로드 캐시를 우선한다.

`node_modules` 전체 캐시는 환경 차이로 문제를 만들 수 있으므로 도구 권장 방식에 따른다.

## 완료 조건

- lockfile 변경 시 캐시 무효화
- Node 버전 변경 시 캐시 분리
- cache hit 여부가 CI 로그에 나타남
- 캐시를 지워도 정상 빌드 가능

## 우선순위

```text
P1
```

---

# E-19. 동일 작업의 Job 간 중복 제거

다음 구조는 피한다.

```text
test job: install + full build
build job: install + full build
deploy job: install + full build
```

## 권장

```text
validation
+
한 번의 release build
+
artifact 기반 smoke test·deploy
```

필요한 경우 validation job는 작은 fixture 또는 manifest 검사만 수행한다.

## 완료 조건

- 전체 Astro build는 파이프라인에서 한 번
- 검색 인덱스도 한 번 생성
- OG와 다이어그램이 여러 job에서 반복 생성되지 않음

## 우선순위

```text
P0
```

---

# E-20. 메모리 증설을 완료 조건으로 삼지 않기

현재 `--max-old-space-size=8192` 같은 설정이 있다면 즉시 제거할 필요는 없다.

먼저 안전망으로 유지하면서 원인을 줄인다.

## 개선 순서

```text
1. 단계별 측정
2. AST retention 제거
3. Markdown 다중 파싱 제거
4. Shiki 범위 축소
5. 파생 작업 증분화
6. 그 후 heap 설정 재평가
```

## 완료 기준

다음 중 하나가 되어야 한다.

```text
8GB 설정 없이 안정적 빌드
또는
큰 heap이 필요한 정확한 이유가 문서화됨
```

## 피해야 할 판단

```text
빌드 성공
→ 메모리 문제 해결
```

GC 시간이 길어지고 CI 사양 의존성이 커졌다면 해결된 것이 아니다.

---

# E-21. 빌드 예산 설정

현재 기준선을 측정한 다음 현실적인 예산을 정한다.

## 예산 항목

```text
Fast validation 시간
Release build 시간
Peak RSS
검색 인덱스 압축 크기
전체 JS
대표 글 HTML 크기
dist 총량
```

## 예시

수치는 측정 후 정해야 하지만 형태는 다음과 같다.

```text
Fast validation: 30초 이내
Release build p95: 현재 기준 +10% 이내
Peak RSS: 4GB 이하
Search index gzip: 500KB 이하
Homepage JS: 기존 대비 증가 없음
```

## 중요

임의의 이상적인 수치를 먼저 정하지 않는다.

```text
현재 baseline
→ 허용 회귀율
→ 점진적 목표
```

순서로 정한다.

## 우선순위

```text
P1
```

---

# E-22. 빌드 회귀 리포트

각 release build에 다음을 artifact로 남긴다.

```json
{
  "commit": "abc123",
  "documents": 532,
  "pages": 711,
  "codeBlocks": 8412,
  "durationMs": 62800,
  "peakRssMb": 3410,
  "searchIndexBytes": 412880,
  "distBytes": 184220000
}
```

## 비교 규칙

```text
빌드 시간 +20%
Peak RSS +20%
검색 인덱스 +20%
JS +15%
```

같은 변화가 발생하면 경고한다.

처음부터 배포를 차단하지 말고 추세를 관찰한 뒤 기준을 강화한다.

## 완료 조건

- 최근 build와 이전 build 비교 가능
- 콘텐츠 증가와 성능 회귀를 구분 가능
- 급격한 변화가 로그에서 바로 보임

## 우선순위

```text
P1
```

---

# E-23. 대표 복잡도 페이지 Canary 선정

전체 평균만으로는 극단적으로 무거운 글 문제를 찾기 어렵다.

## Canary 후보

```text
코드 블록이 가장 많은 글
표가 가장 넓은 글
다이어그램이 가장 많은 글
수식이 많은 글
일반 대표 Guide
```

## 검사 항목

```text
HTML 크기
DOM node 수
render 시간
모바일 스크롤
코드 가로 overflow
TOC 길이
```

## 완료 조건

- 3~5개 canary 페이지 고정
- 주요 UI·빌드 변경에서 반복 검증
- 가장 깨끗한 글만 테스트하지 않음

## 우선순위

```text
P1
```

---

# E-24. 배포 결과 Smoke Test

빌드 성공 뒤 실제 `dist`를 로컬 서버로 열어 검사한다.

## 최소 URL

```text
/
대표 Guide
PCIe & CXL Hub
Firmware & Bootloader Hub
검색 페이지
404
```

## 검사

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

## 완료 조건

- source가 아니라 최종 `dist` 검사
- GitHub Pages의 실제 base path 조건 반영
- 배포 전 자동 실행
- 외부 광고·댓글 실패는 본문 성공에 영향 없음

## 우선순위

```text
P0
```

---

# E-25. 실패 등급 분리

모든 감사가 release blocker가 되면 결국 검사를 끄게 된다.

## Error

```text
schema 불일치
중복 URL
없는 내부 문서
필수 asset 누락
검색 JSON 생성 실패
production build 실패
```

## Warning

```text
description 누락
대형 코드 블록
오래된 외부 링크
needs-review 장기 방치
대형 이미지
```

## Info

```text
새로운 alias 후보
중복 가능성
Hub 편입 후보
읽기 환경 보완 제안
```

## 완료 조건

- 각 rule의 severity가 명시됨
- Warning만으로 배포가 막히지 않음
- 중요한 오류가 수백 개 warning에 묻히지 않음

## 우선순위

```text
P0
```

---

# E-26. 외부 링크 검사를 정기 작업으로 이동

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

# E-27. 로컬 Fast Path

콘텐츠 한 문장을 수정할 때 전체 검색·OG·외부 감사를 기다리면 작업 흐름이 나빠진다.

## 로컬 기본 흐름

```text
Astro dev
변경 문서 schema
변경 문서 링크
필요한 렌더링만
```

## 명시적으로 실행

```text
npm run check
npm run build:release
npm run audit
```

## 완료 조건

- 일반 글 편집이 무거운 파이프라인을 자동 실행하지 않음
- push 전 필수 검사는 한 명령으로 수행 가능
- release 결과와 로컬 빠른 경로의 역할 차이가 문서화됨

## 우선순위

```text
P1
```

---

# E-28. 빌드 환경 고정

재현성 없는 빌드는 성능 측정도 신뢰할 수 없다.

## 고정할 것

```text
Node 버전
package manager 버전
lockfile
Python 버전
다이어그램 도구 버전
locale
timezone
```

## 특히 날짜

게시일과 Sitemap 날짜가 CI timezone에 따라 달라지지 않게 한다.

```text
Asia/Seoul로 표시할 것
UTC로 저장할 것
```

중 하나를 명확히 결정한다.

## 완료 조건

- 로컬과 CI의 주요 버전이 일치
- 빌드 결과가 실행 locale에 따라 달라지지 않음
- 같은 commit에서 불필요한 생성 diff가 발생하지 않음

## 우선순위

```text
P0
```

---

# E-29. 생성물 Source of Truth 명확화

## Source

```text
Markdown
Topic registry
Hub config
alias registry
diagram source
redirect manifest
```

## Derived

```text
검색 인덱스
Sitemap
RSS
OG 이미지
optimized SVG
content graph
```

Derived data는 언제든 재생성 가능해야 한다.

## 완료 조건

- 생성 파일을 수동 수정하지 않음
- 생성물에 generator version과 input hash 존재
- source와 artifact 디렉터리가 구분됨
- stale artifact를 manifest 기준으로 정리 가능

## 우선순위

```text
P0
```

---

# E-30. 성능 최적화 종료 조건

최적화가 끝없이 이어지면 안 된다.

이번 Epic은 다음이 충족되면 1차 완료로 본다.

```text
병목 단계가 측정된다
공통 manifest가 존재한다
중복 Markdown 파싱이 줄었다
Shiki 범위가 정리됐다
빌드·감사 명령이 분리됐다
검색·OG·다이어그램이 변경 기반으로 동작한다
CI에서 build가 한 번만 실행된다
Peak RSS와 시간 회귀를 확인할 수 있다
```

Lighthouse 100이나 모든 작업의 완전 증분화는 완료 조건이 아니다.

---

# Epic E 완료 기준

## 측정

```text
단계별 시간
Peak RSS
문서·코드 블록 수
인덱스·dist 크기
```

## 구조

```text
공통 Content Manifest
중앙 Publication Policy
source와 derived 경계
```

## 실행 경로

```text
Fast validation
Release build
정기 audit
```

## 증분 처리

```text
검색 레코드
OG
다이어그램
이미지 검사
```

## CI

```text
Build 1회
Artifact 재사용
Smoke test
권한 분리
```

---

# Epic E 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| E-01 | 단계별 기준선 측정 | P0 | 낮음 | 매우 높음 |
| E-02 | 빌드 명령 분리 | P0 | 낮음 | 높음 |
| E-03 | 공통 Content Manifest | P0 | 높음 | 매우 높음 |
| E-04 | Publication Policy 중앙화 | P0 | 중간 | 매우 높음 |
| E-05 | Markdown 다중 파싱 제거 | P0 | 중간 | 매우 높음 |
| E-06 | AST 생명주기 제한 | P0 | 중간 | 매우 높음 |
| E-07 | Shiki 처리량 측정 | P0 | 낮음 | 높음 |
| E-08 | 코드 블록 역할 분리 | P1 | 중간 | 높음 |
| E-09 | 언어 Allowlist | P1 | 낮음 | 중간 |
| E-11 | 대형 코드 블록 감사 | P1 | 중간 | 높음 |
| E-12 | 변경 파일 인식 | P1 | 중간 | 높음 |
| E-13 | 문서별 검색 레코드 | P1 | 중간 | 높음 |
| E-14 | OG 증분 생성 | P1 | 중간 | 중간 |
| E-15 | 다이어그램 격리 | P1 | 중간 | 높음 |
| E-17 | CI Job 분리 | P0 | 중간 | 매우 높음 |
| E-19 | Job 중복 제거 | P0 | 낮음 | 높음 |
| E-21 | 빌드 예산 | P1 | 낮음 | 높음 |
| E-24 | Dist Smoke Test | P0 | 중간 | 매우 높음 |
| E-25 | 실패 등급 분리 | P0 | 낮음 | 높음 |
| E-28 | 환경 고정 | P0 | 중간 | 높음 |

---

# 다섯 번째 실제 실행 묶음

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

## 48. assistant

이번에는 **Task 3-6. SEO·AdSense 재신청 준비 백로그**다. 색인 정리, 신뢰 페이지, 대표 글 보완, 광고 적용 전 검증 순서로 실제 작업 단위를 잡겠다.

## 49. assistant

이번 단계는 **AdSense 승인 보장 요령**이 아니라, 재신청 전에 사이트가 실제로 더 가치 있고 일관된 상태가 되었는지를 검증하는 백로그다.

:::writing{variant="document" id="68427"}
# Task 3-6. SEO·AdSense 재신청 준비 백로그

이번 단계의 목표는 다음과 같다.

```text
색인 대상 정리
→ 얕은·중복 페이지 축소
→ 대표 콘텐츠 강화
→ 작성자와 운영 신뢰 정보 정비
→ 실제 배포 상태 검증
→ 재신청
```

먼저 전제부터 명확히 해야 한다.

> AdSense의 “가치가 낮은 콘텐츠”는 공개된 단일 점수나 확정 체크리스트가 아니다.

따라서 글 개수, 글자 수, 방문자 수처럼 특정 수치 하나를 맞췄다고 승인을 보장할 수 없다. Google Publisher Policies는 게시자 콘텐츠가 없거나 가치가 낮은 화면, 공사 중인 화면, 알림이나 탐색만을 목적으로 하는 화면 등에 Google 광고를 게재하지 못하도록 규정한다. Google Search 역시 검색 순위 조작보다 사람에게 유용하고 신뢰할 수 있는 콘텐츠 제작을 권장한다. citeturn733970search18turn733970search15

---

# Epic F. SEO·AdSense 재신청 준비

## F-01. 현재 공개 URL 유형 전수 조사

### 문제

일반 글이 많더라도 다음 페이지가 함께 공개되고 색인된다면 사이트 전체 인상이 약해질 수 있다.

```text
빈 태그 페이지
글이 1개뿐인 카테고리
검색 결과 페이지
페이지네이션
Draft나 Placeholder
관리 기능
구판·중복 문서
단순 날짜 아카이브
```

### 작업

최종 배포 결과의 모든 URL을 유형별로 집계한다.

| 페이지 유형 | URL 수 | 색인 대상 | Sitemap | 광고 대상 |
|---|---:|---|---|---|
| Article |  | 예 | 예 | 조건부 |
| Topic Hub |  | 예 | 예 | 조건부 |
| Series Hub |  | 선별 | 선별 | 조건부 |
| Tag |  | 선별 | 선별 | 대체로 제외 |
| Archive |  | 선별 | 선별 | 제외 권장 |
| Search |  | 아니오 | 아니오 | 제외 |
| Admin |  | 아니오 | 아니오 | 제외 |
| Draft |  | 공개 제외 | 아니오 | 제외 |
| Superseded |  | 상황별 | 상황별 | 제외 권장 |
| 404 | 1 | 아니오 | 아니오 | 제외 |

### 구현 방법

공통 Content Manifest 외에 최종 생성 페이지 manifest를 만든다.

```ts
interface GeneratedPage {
  url: string;
  pageType:
    | "article"
    | "topic"
    | "series"
    | "tag"
    | "archive"
    | "search"
    | "admin"
    | "error";
  indexable: boolean;
  canonical: string;
  includeInSitemap: boolean;
  adsEligible: boolean;
}
```

### 완료 조건

- 최종 배포 URL 총수가 확인됨
- 페이지 유형별 색인 정책이 존재함
- 검색·관리·빈 결과 페이지가 Sitemap에 포함되지 않음
- 광고 가능 여부가 페이지 유형에 따라 결정됨

### 우선순위

```text
P0
```

---

# F-02. Indexability Matrix 확정

각 페이지가 단순히 공개되었다는 이유로 자동 색인되면 안 된다.

## 권장 정책

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

## 중요한 구분

```text
중복 페이지 통합
→ canonical 또는 redirect

검색 결과에서 제외
→ noindex

외부 접근 자체 차단
→ 인증 또는 빌드 제외
```

Canonical과 `noindex`를 같은 의미로 사용해서는 안 된다. Google은 canonical을 중복 URL 중 대표 URL을 제안하는 방법으로 설명하며, Sitemap에는 선호하는 canonical URL을 포함하도록 안내한다. 다만 최종 canonical 선택은 Google이 할 수 있다. citeturn733970search35turn733970search41turn733970search27

### 완료 조건

- 모든 page type에 index 정책이 정의됨
- `noindex` URL이 Sitemap에 없음
- canonical이 실제로 동등하지 않은 다른 문서를 가리키지 않음
- 공개 제외 페이지는 robots 설정이 아니라 빌드에서 제외됨

### 우선순위

```text
P0
```

---

# F-03. Sitemap을 공개 가치 목록으로 정리

### 문제

Sitemap을 모든 생성 URL의 덤프로 사용하면 사이트가 중요하게 여기는 URL을 구분하기 어렵다.

### 작업

Sitemap에는 다음을 중심으로 넣는다.

```text
Current Article
선별된 Historical Article
Topic Hub
강한 Series Hub
About
Editorial Policy
Privacy Policy
```

다음은 제외한다.

```text
Draft
Search
Admin
404
임의 Filter
얕은 Tag
Redirect URL
Superseded 구주소
```

Google은 Sitemap을 검색엔진에 URL을 알리고 처리 상태를 확인하는 수단으로 안내하며, Sitemap에 포함된 URL은 선호 canonical 후보로 활용될 수 있다고 설명한다. citeturn733970search34turn733970search41

### 추가 작업

Sitemap의 `lastmod`는 실제 의미 있는 콘텐츠 변경일을 사용한다.

```text
빌드한 날짜
≠
콘텐츠를 수정한 날짜
```

모든 URL의 `lastmod`가 배포 때마다 현재 날짜로 변경되는 구조는 피한다.

### 완료 조건

- Sitemap URL과 indexable page 집합이 일치
- redirect URL이 없음
- Draft와 검색 페이지가 없음
- `lastmod`가 실제 콘텐츠 수정에 대응
- Search Console에서 처리 오류를 확인할 수 있음

### 우선순위

```text
P0
```

---

# F-04. Canonical URL 전수 검증

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

# F-05. 얕은 태그 페이지 정리

### 문제

태그가 많으면 다음과 같은 페이지가 대량 생성된다.

```text
제목
글 1개
짧은 카드
```

이 페이지는 사용자에게 별도 탐색 가치를 거의 제공하지 못한다.

### 작업 분류

#### 핵심 태그

다음 조건을 만족하면 Topic Hub나 강한 보조 허브로 승격한다.

```text
글이 충분히 있음
사이트 핵심 전문 분야임
고유한 설명과 큐레이션이 가능함
```

#### 일반 태그

글 목록 탐색 기능으로 유지하되 색인 필요성을 검토한다.

#### 1회성 태그

통합·alias·삭제 후보로 처리한다.

### 1차 기준 예시

```text
1~2개 글
→ 기본 noindex 후보

3~5개 글
→ 실제 탐색 가치 수동 확인

6개 이상
→ 설명·대표 글을 추가하거나 Topic 승격 검토
```

이는 Google의 공식 숫자 기준이 아니라 사이트 운영을 위한 내부 검토 기준이다.

### 완료 조건

- 1회성 태그 수가 집계됨
- 동의어 태그가 통합됨
- 핵심 태그와 단순 필터 태그가 구분됨
- 얕은 태그 페이지가 Sitemap에서 제거됨
- 중요한 주제는 Topic Hub로 연결됨

### 우선순위

```text
P0
```

---

# F-06. 얕은 Series 페이지 강화

### 문제

시리즈 페이지가 다음처럼 되어 있다면 일반 목록과 차이가 없다.

```text
시리즈 제목
Part 1
Part 2
Part 3
```

### 보완 요소

```text
시리즈 목표
대상 독자
선행 지식
전체 진행 순서
각 편의 역할
완독 후 다음 단계
```

### 색인 기준

다음이 있는 시리즈만 독립적인 indexable page로 유지한다.

```text
명확한 학습 목표
3편 이상 또는 충분한 독립 구조
고유한 설명
순서가 실제 의미를 가짐
```

단순히 같은 태그의 글을 묶은 페이지라면 태그나 Topic과 역할이 중복될 수 있다.

### 완료 조건

- 모든 indexable Series Hub에 고유한 소개가 있음
- 각 편이 무엇을 설명하는지 표시됨
- 미완성·빈 시리즈는 색인되지 않음
- Series와 Topic의 역할이 중복되지 않음

### 우선순위

```text
P1
```

---

# F-07. 빈 페이지와 Placeholder 제거

Google Publisher Policies는 게시자 콘텐츠가 없거나 낮은 가치의 화면, 공사 중인 화면 등에 Google 광고를 게재하지 못하도록 한다. citeturn733970search18

### 검사 대상

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

### 권장 처리

| 상태 | 처리 |
|---|---|
| 작성 중 문서 | Production build 제외 |
| 미래 Topic | 실제 콘텐츠 준비 후 공개 |
| 검색 결과 없음 | noindex + 광고 제외 |
| 빈 태그 | 생성하지 않음 |
| 관리자 페이지 | Production에서 제거 또는 인증 |
| 삭제된 문서 | 적절한 404·410·redirect |

### 완료 조건

- `dist`에서 Placeholder 문구 검색 결과 0건
- 빈 목록 페이지 생성 없음
- 검색 결과 없음 화면에 광고 코드 없음
- 관리자 화면이 일반 사이트 탐색에 노출되지 않음

### 우선순위

```text
P0
```

---

# F-08. 콘텐츠 중복·Cannibalization 1차 정리

### 대상

우선 유사 제목과 같은 검색 의도를 가진 상위 20개 묶음만 분석한다.

예:

```text
PCIe BAR란
PCIe BAR 설명
BAR 크기 구하기
PCIe BAR 주소 할당
```

### 판단 결과

```text
통합
역할 구분
버전 분리
Historical
Superseded
유지
```

### 통합 기준

다음을 대부분 만족하면 통합 가능성이 높다.

```text
같은 검색 질문
동일 설명 반복
별도 실험 없음
버전 차이 없음
각 글이 독립적으로 완결되지 않음
```

### 역할 구분 예

```text
Guide:
PCIe 장치 초기화 전체 흐름

Concept:
BAR 크기 탐색과 주소 할당

Debug Note:
BAR가 0으로 보이는 원인

Reference:
BAR 레지스터 비트 구조
```

### 완료 조건

- 중복 후보 20개 묶음 분석
- 최소 5개 묶음에 통합 또는 역할 지정
- 구판에 대체 문서 링크 추가
- 내부 링크가 최종 대표 문서를 가리킴
- redirect chain 없이 최종 URL로 연결

### 우선순위

```text
P0
```

---

# F-09. 대표 문서 10개 완성

기존 Epic C의 대표 문서 20개 중 최소 10개를 재신청 전에 `current` 상태로 완성한다.

## 각 문서 필수 항목

```text
명확한 제목과 description
콘텐츠 타입
Primary Topic
현재 상태
수정일
필요한 경우 검증일
환경·버전
근거와 출처
작성자의 분석
적용 범위와 한계
다음 학습 경로
```

## 콘텐츠 가치 강화 항목

다음 중 최소 하나가 분명히 보여야 한다.

```text
직접 구현
직접 측정
실제 장애 분석
공식 사양과 코드 연결
잘못된 가설을 제외한 과정
버전별 차이
의사결정 기준
```

Google Search의 사람 중심 콘텐츠 가이드는 콘텐츠가 기존 또는 의도한 독자에게 유용한지, 직접적인 경험과 깊이를 보여주는지, 독자가 목표 달성에 충분한 도움을 받는지 평가하도록 권장한다. citeturn733970search15

### 완료 조건

- 대표 문서 10개가 `current`
- `needs-review` 문서가 Featured에 없음
- 문서마다 독창적인 경험·분석 요소가 있음
- 단순 공식 문서 번역에 머물지 않음
- 모바일에서 코드·표·다이어그램이 정상

### 우선순위

```text
P0
```

---

# F-10. 일반적인 AI 문장 제거

### 검사 대상

```text
이번 글에서는 자세히 알아보겠습니다
다양한 장점이 있습니다
매우 중요한 기술입니다
앞으로 더욱 중요해질 것입니다
결론적으로 효율적인 방법입니다
```

이런 표현이 무조건 잘못된 것은 아니지만, 구체적인 정보 없이 반복되면 문서 밀도를 낮춘다.

### 치환 원칙

```text
추상적인 중요성
→ 실제 영향을 설명

일반적인 장점
→ 측정된 결과나 사용 조건

포괄적 결론
→ 확인된 범위와 한계
```

### 예시

#### 이전

```text
Pinned memory는 성능 향상에 매우 중요한 기술입니다.
```

#### 개선

```text
이 테스트에서는 pageable memory보다 pinned memory의
1GB H2D 전송 시간이 중앙값 기준 약 44% 짧았다.
다만 작은 전송에서는 할당 비용이 이득을 상쇄할 수 있다.
```

### 완료 조건

- 대표 문서의 일반적 서론과 결론 재검토
- 핵심 주장에 환경·원인·결과 중 하나 이상 포함
- AI 문장 탐지 점수 같은 불확실한 지표를 품질 기준으로 사용하지 않음
- 글자 수를 늘리기 위한 보충 문단 없음

### 우선순위

```text
P1
```

---

# F-11. 홈과 Topic Hub 완성

AdSense 재신청 전에 최소한 다음 구조가 실제로 배포돼 있어야 한다.

```text
홈
├── 사이트 목적
├── Core Topics
├── Featured Guides
└── Latest Posts

Topic Hub
├── 주제 설명
├── Start Here
├── Core Concepts
├── Featured Guides
└── Debug & Experiments
```

### 최소 완료 범위

```text
PCIe & CXL Hub
Firmware & Bootloader Hub
대표 글 8개 이상 연결
```

### 완료 조건

- 홈이 최신 글 목록으로만 구성되지 않음
- 핵심 주제와 대표 문서가 첫 방문에서 확인됨
- Hub가 단순 카드 자동 목록이 아님
- 모든 Featured 문서가 `current`

### 우선순위

```text
P0
```

---

# F-12. About 페이지 개편

### About 페이지가 답해야 할 질문

```text
누가 운영하는가
어떤 주제를 다루는가
어떤 경험을 바탕으로 쓰는가
어떻게 검증하는가
어떻게 오류를 제보하는가
```

### 권장 구성

```text
짧은 소개
전문 분야
실무·연구 경험의 범위
작성 원칙
오류 제보·연락 경로
```

### 피해야 할 것

```text
과도한 자기 홍보
입증할 수 없는 전문가 표현
회사 내부 정보 노출
이력서 전체 복사
SEO 키워드 나열
```

### 권장 핵심 문장 방향

```text
CUDA·FPGA 기반 영상 처리, 임베디드 펌웨어,
PCIe 장치와 시스템 소프트웨어 개발 경험을 바탕으로
코드·사양·실험 결과를 연결해 설명합니다.
```

### 완료 조건

- 운영자 이름 또는 일관된 작성자 정체성 표시
- 실제 경험 범위가 구체적이고 과장되지 않음
- GitHub 또는 오류 제보 경로 존재
- 홈과 글의 작성자 정보가 About으로 연결

### 우선순위

```text
P0
```

---

# F-13. Editorial Policy 페이지 작성

### 목적

“SEO를 위한 정책 페이지”가 아니라 실제 문서 품질 관리 방식을 공개한다.

### 포함할 내용

```text
출처 우선순위
사실·관찰·가설 구분
수정일과 검증일 차이
버전이 오래된 문서 처리
AI 사용 범위
오류 수정 방법
```

### 간단한 원칙 예시

```text
직접 확인한 결과를 우선합니다.
확인하지 못한 내용은 가설로 표시합니다.
버전 영향을 받는 글에는 환경과 검증 시점을 기록합니다.
중대한 오류는 수정 기록과 함께 바로잡습니다.
AI는 구조와 문장 개선에 활용하지만 핵심 기술 주장은
사양·소스코드·실험 결과로 확인합니다.
```

### 완료 조건

- 실제 운영 방식과 일치
- 형식적인 선언에 머물지 않음
- 대표 문서의 상태 모델을 설명
- 오류 제보 링크 제공

### 우선순위

```text
P1
```

---

# F-14. Contact와 오류 제보 경로 정비

### 가능한 경로

```text
GitHub Issue
이메일
Giscus 댓글
문서별 Edit 링크
```

모두 제공할 필요는 없다.

권장 최소 조합:

```text
일반 연락: 이메일 또는 GitHub 프로필
문서 오류: GitHub Issue
```

### 글 하단 UI

```text
이 문서에서 오류를 발견했나요?
GitHub에서 수정 제안 또는 오류를 제보할 수 있습니다.
```

### 완료 조건

- 연락 경로가 실제로 작동
- 이메일 주소를 이미지나 난해한 방식으로 숨기지 않음
- 오류 제보 시 문서 URL이나 ID가 자동 포함
- 중요한 댓글 정정은 본문으로 반영

### 우선순위

```text
P1
```

---

# F-15. Privacy Policy 작성·현행화

AdSense의 필수 콘텐츠 안내는 개인정보 처리방침에 Google을 포함한 제3자 광고 제공자의 쿠키 사용과 맞춤형 광고 거부 방법 등에 관한 정보를 포함하도록 안내한다. 실제 사용 중인 광고·분석·댓글 서비스에 맞춰 작성해야 한다. citeturn733970search4

## 실제 데이터 흐름 먼저 조사

```text
AdSense
Analytics
Giscus
Local Storage
검색어 수집
외부 폰트
Newsletter
```

## Privacy Policy에 포함할 후보

```text
운영자와 연락 방법
수집하는 정보
수집 목적
쿠키·로컬 스토리지
Google 광고와 제3자 제공자
Analytics
Giscus와 GitHub Discussions
외부 링크
보존과 삭제
정책 변경일
```

Google의 Privacy & messaging 기능은 GDPR이나 미국 주별 개인정보 규정 등에 대응하는 동의·거부 메시지를 구성할 수 있도록 제공된다. 실제 적용 의무는 방문 지역과 데이터 처리 방식에 따라 달라지므로 단순 배너 복사보다는 사용 중인 서비스와 지역을 기준으로 설정해야 한다. citeturn733970search11turn733970search22

### 피해야 할 것

- 다른 블로그 정책 복사
- 사용하지 않는 서비스 나열
- 사용하는 서비스 누락
- 광고 도입 전후 정책 불일치
- 실제 동의 제어 없이 버튼만 있는 배너

### 완료 조건

- 현재 네트워크 요청과 정책 내용이 일치
- Privacy 링크가 푸터에 항상 존재
- 광고·분석 서비스 변경 시 정책 검토 절차 존재
- 마지막 변경일 표시

### 우선순위

```text
P0
```

---

# F-16. Terms·Disclaimer의 과잉 생성 방지

About, Contact, Privacy는 실제 역할이 명확하다.

반면 다음 페이지는 필요성 없이 형식적으로 만들지 않는다.

```text
Terms of Service
Medical Disclaimer
Financial Disclaimer
Affiliate Disclaimer
Cookie Policy 별도 페이지
```

사이트가 해당 서비스를 제공하거나 관련 내용을 다루지 않는다면 빈 법률 템플릿은 오히려 실제 운영과 불일치할 수 있다.

### 원칙

```text
실제 처리와 책임 관계가 있을 때 작성
단순히 승인에 도움이 될 것 같아서 만들지 않음
```

제휴 링크나 협찬이 생긴다면 해당 관계를 글과 정책에서 명확히 공개한다.

---

# F-17. 구조화 데이터 최소 구현

구조화 데이터는 콘텐츠 품질의 대체 수단이 아니다. Google은 구조화 데이터가 페이지에 실제로 표시되는 콘텐츠를 정확히 표현해야 하며, 기술적으로 유효하더라도 품질 가이드라인을 충족하지 않으면 검색 기능에 표시되지 않을 수 있다고 안내한다. citeturn733970search21turn733970search2

## 권장 최소 구성

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

## 실제 값과 연결

```text
headline ← 문서 title
description ← 문서 description
datePublished ← published
dateModified ← updated
author ← 실제 작성자
mainEntityOfPage ← canonical
```

`lastVerified`를 `dateModified`로 자동 대체하지 않는다.

### 완료 조건

- 화면에 없는 평가·리뷰·전문가 정보를 넣지 않음
- canonical·날짜·작성자가 실제 페이지와 일치
- Rich Results Test로 대표 페이지 검사
- schema 실패가 일반 본문 렌더를 막지 않음

### 우선순위

```text
P1
```

---

# F-18. 제목과 Description 감사

### 검사 대상

```text
제목 중복
설명 중복
너무 일반적인 제목
키워드 나열형 제목
자동 생성 첫 문장 description
빈 description
```

## 대표 문서 제목 원칙

```text
한 글에 하나의 핵심 질문
주요 기술 고유명 포함
불필요한 ‘완벽 정리’ 표현 자제
```

### 예시

#### 이전

```text
PCIe 완벽 정리 총정리 개념 원리 BAR MMIO
```

#### 개선

```text
PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가
```

## Description 원칙

```text
무엇을 설명하는가
어떤 범위인가
독자가 무엇을 얻는가
```

### 완료 조건

- 대표 20개 제목·description 수동 검토
- 전체 사이트 중복 title 없음
- description 완전 동일 중복 없음
- 페이지 언어와 description 언어 일치

### 우선순위

```text
P0
```

---

# F-19. 검색 색인 품질 검사

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

# F-20. 404와 삭제 URL 정비

### 좋은 404 페이지

```text
페이지를 찾을 수 없다는 명확한 안내
검색
Core Topics
홈
대표 Guide
```

### 피해야 할 것

```text
200 상태로 “페이지 없음” 표시
광고 삽입
수십 개 추천 카드
자동으로 홈 redirect
```

### 삭제 글 처리

```text
대체 문서 있음
→ 가장 가까운 문서로 redirect

대체 문서 없음
→ 정상적인 404 또는 적절한 제거 응답

외부 참조가 많은 중요 문서
→ 짧은 대체 안내 페이지 검토
```

### 완료 조건

- 존재하지 않는 URL이 200으로 응답하지 않음
- 404에 광고 없음
- 삭제 URL을 무조건 홈으로 redirect하지 않음
- redirect chain 없음

### 우선순위

```text
P1
```

---

# F-21. 모바일 콘텐츠 경험 감사

재신청 전 실제 모바일 화면을 대표 페이지 기준으로 검사한다.

## 페이지

```text
홈
Topic Hub
일반 Guide
코드가 많은 글
표가 많은 글
검색
About
Privacy
404
```

## 검사

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

# F-22. 광고 없는 상태에서 사이트 감사

승인 준비 중에는 광고 배치 최적화보다 콘텐츠와 페이지 품질을 먼저 확인한다.

### 검사할 것

```text
광고 코드 없이 레이아웃 정상
빈 광고 슬롯 없음
Auto Ads 관련 이전 설정 없음
실험용 광고 placeholder 없음
```

### 이유

광고가 없는 상태에서도 페이지가 완결돼야 한다.

AdSense는 게시자 콘텐츠가 없는 화면에 광고를 허용하지 않으며, 광고 배치 모범 사례에서도 사용자가 원하는 콘텐츠를 쉽게 찾을 수 있는 경험을 강조한다. citeturn733970search18turn733970search23

### 완료 조건

- 모든 페이지가 광고 없이 자연스럽게 읽힘
- 광고 공간을 전제로 한 큰 빈 영역 없음
- 검색·404·관리 페이지에 광고 코드 없음

### 우선순위

```text
P0
```

---

# F-23. 광고 가능 페이지 정책 작성

승인 이후를 대비하되 실제 광고는 승인 후 적용한다.

## 광고 가능 후보

```text
Current Article
충분한 설명이 있는 Topic Hub
완성된 Guide
```

## 광고 제외

```text
홈 Hero 근처
Search
404
Admin
Draft
빈 Tag
얕은 Archive
Superseded
Archived
개인정보·연락 페이지
```

## 조건부 제외

```text
매우 짧은 Reference
Historical
Needs Review
도구 전용 페이지
```

### 코드 예

```ts
function isAdsEligible(page: GeneratedPage): boolean {
  if (!page.indexable) return false;

  return (
    page.pageType === "article" &&
    page.status === "current" &&
    page.hasSubstantialPublisherContent
  );
}
```

`hasSubstantialPublisherContent`를 글자 수 하나로 자동 판정하지 않는다.

### 완료 조건

- 광고 코드가 전체 Layout에 무조건 삽입되지 않음
- 페이지 유형과 상태 기반 조건 존재
- 404·검색·관리 페이지 광고 차단 테스트 존재

### 우선순위

```text
P1
```

---

# F-24. 광고 제외 영역 설계

Google의 광고 배치 정책은 광고를 콘텐츠나 내비게이션으로 오인하게 만들거나, 우발적인 클릭을 유도하거나, 광고에 부자연스러운 주의를 끄는 배치를 제한한다. citeturn733970search5

## 기술 문서 보호 영역

```text
제목과 첫 문단
코드와 해당 코드 설명 사이
표와 표 해석 사이
다이어그램과 캡션 사이
단계별 절차 중간
경고·주의 블록 주변
결론 직전
```

## 상대적으로 안전한 후보

```text
큰 장이 끝난 뒤
본문 종료 뒤
관련 글 이전
긴 문서의 독립된 섹션 경계
```

### 완료 조건

- 코드·표·절차를 하나의 보호 단위로 취급
- 광고 주변에 버튼·복사·다음 글 링크가 밀착되지 않음
- 광고 제목처럼 보이는 heading 없음
- 자동 광고 적용 시 실제 삽입 위치 검토

### 우선순위

```text
P1
```

---

# F-25. 광고 슬롯 CLS 방지

### 작업

광고 슬롯을 적용할 경우 예상 크기를 확보한다.

```css
.ad-slot {
  min-height: var(--reserved-ad-height);
}
```

다만 실제 광고가 없는 상태에서 지나치게 큰 빈 공간이 남지 않도록 로드 상태와 실패 상태를 구분한다.

### 검사

```text
모바일 CLS
광고 로드 실패
광고 차단기 사용
느린 네트워크
화면 회전
```

### 완료 조건

- 광고 로드 시 본문 위치가 크게 이동하지 않음
- 실패 시 불필요한 큰 빈 공간 제거
- 코드·표 위치가 이동하지 않음

---

# F-26. AdSense 재신청 전 최종 체크리스트

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

# F-27. 재신청 판단 기준

다음 조건이 충족되기 전에 날짜만 기다렸다가 다시 신청하지 않는다.

```text
이전 신청 이후 실질적 변경이 있음
대표 콘텐츠의 가치가 강화됨
색인 페이지 집합이 정리됨
사이트 목적과 전문 분야가 명확해짐
신뢰·개인정보 페이지가 실제 운영과 일치함
```

## 실질적 변경 예

```text
홈 정보 구조 개편
Topic Hub 2개 공개
대표 글 10개 재검증
얕은 태그 noindex 또는 통합
중복 문서 통합
About·Privacy·Editorial Policy 개편
```

## 실질적이지 않은 변경

```text
문장 일부 교정
글 2~3개 추가
테마 색상 변경
메뉴명 변경
날짜만 최신화
광고 코드 재삽입
```

### 중요한 점

재신청 기준을 충족해도 승인 결과를 보장할 수는 없다.

목표는 심사 시스템을 속이는 것이 아니라:

```text
독자가 사이트의 전문성을 이해하고
대표 문서를 찾으며
각 문서의 근거와 현재 상태를 판단할 수 있게 만드는 것
```

이다.

---

# F-28. 재신청 후 변경 동결 범위

재신청 직후 사이트 전체 구조를 다시 크게 변경하면 상태 관찰이 어려워진다.

## 동결 권장 영역

```text
canonical
URL
index 정책
홈 주요 구조
대표 문서 목록
광고 코드
```

## 계속 가능한 작업

```text
오탈자 수정
깨진 링크 수정
사실 오류 수정
작은 모바일 버그 수정
```

### 완료 조건

- 재신청 시점의 commit SHA 기록
- 변경 내용 요약 보존
- 구조적 변경은 결과 확인 전 제한
- 긴급 오류는 즉시 수정 가능

---

# F-29. Search Console 변경 로그

간단한 Markdown 파일이면 충분하다.

```markdown
## 2026-08-01

- 홈을 Topic-first 구조로 변경
- PCIe & CXL Hub 추가
- 얕은 태그 43개 noindex
- 대표 글 10개 검증
- Sitemap에서 검색·아카이브 URL 제거
```

## 이후 관찰할 것

```text
핵심 페이지 색인
canonical 변경
노출 검색어
대표 Hub 유입
중복 페이지 상태
```

검색 지표는 변경 직후가 아니라 충분한 관찰 기간 후 해석한다.

---

# F-30. Epic F 완료 조건

## 사이트 구조

```text
홈이 사이트 목적과 핵심 Topic을 설명
Topic Hub 최소 2개
Featured Guide 최소 8개
Latest Posts가 보조 역할
```

## 콘텐츠

```text
대표 글 20개 선정
최소 10개 current
중복·구판 후보 20개 검토
빈·Placeholder 페이지 없음
```

## 색인

```text
페이지 유형별 index 정책
Sitemap과 canonical 일치
얕은 Tag 정리
Search·Admin·404 제외
```

## 신뢰

```text
About
Contact
Privacy
Editorial Policy
작성자·오류 제보 연결
```

## 광고 준비

```text
광고 없는 완성된 레이아웃
광고 가능 페이지 정책
광고 제외 영역
CLS 방지 계획
```

## 검증

```text
production dist smoke test
모바일 대표 페이지 검사
내부 링크·anchor 검사
Search Console 핵심 페이지 확인
```

---

# Epic F 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| F-01 | 공개 URL 전수 조사 | P0 | 중간 | 매우 높음 |
| F-02 | Indexability Matrix | P0 | 낮음 | 매우 높음 |
| F-03 | Sitemap 정리 | P0 | 중간 | 높음 |
| F-04 | Canonical 검증 | P0 | 중간 | 매우 높음 |
| F-05 | 얕은 Tag 정리 | P0 | 중간 | 매우 높음 |
| F-06 | Series Hub 강화 | P1 | 중간 | 높음 |
| F-07 | 빈·Placeholder 제거 | P0 | 낮음 | 매우 높음 |
| F-08 | 중복·Cannibalization 정리 | P0 | 높음 | 매우 높음 |
| F-09 | 대표 문서 10개 완성 | P0 | 높음 | 매우 높음 |
| F-11 | 홈·Topic Hub 완성 | P0 | 중간 | 매우 높음 |
| F-12 | About 개편 | P0 | 낮음 | 높음 |
| F-13 | Editorial Policy | P1 | 낮음 | 높음 |
| F-15 | Privacy Policy | P0 | 중간 | 매우 높음 |
| F-18 | 제목·Description 감사 | P0 | 중간 | 높음 |
| F-19 | Search Console 검사 | P0 | 중간 | 높음 |
| F-21 | 모바일 감사 | P0 | 중간 | 매우 높음 |
| F-22 | 광고 없는 상태 감사 | P0 | 낮음 | 높음 |
| F-23 | 광고 가능 페이지 정책 | P1 | 중간 | 높음 |
| F-26 | 최종 체크리스트 | P0 | 낮음 | 매우 높음 |

---

# 여섯 번째 실제 실행 묶음

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

# 이번 단계의 핵심 결론

`hawk90.github.io`의 AdSense 대응에서 가장 피해야 할 접근은 다음이다.

```text
글자 수 늘리기
AI로 모든 글 재작성
신규 글 대량 발행
법률 페이지 템플릿 복사
광고 배치부터 최적화
```

현재 필요한 것은 콘텐츠 양의 증가보다 다음이다.

```text
색인할 가치가 있는 URL만 남기기
대표 기술 문서의 독창성과 검증 흔적 강화
좋은 글을 Topic Hub로 연결하기
운영자와 작성 원칙을 명확히 보여주기
빈·중복·구판 페이지가 사이트 인상을 지배하지 않게 하기
```

재신청의 직접 목표는 “Google에 좋은 사이트처럼 보이기”가 아니다.

> 실제 독자가 이 사이트의 전문 분야를 이해하고, 대표 문서를 발견하고, 기술적 주장의 근거와 현재 유효성을 판단할 수 있는 상태를 만드는 것이 목표다.
:::

다음 단계는 **Task 3-7. 보안·개인정보·GitHub Actions 정비 백로그**다. 공개 사이트와 관리자 기능 분리, workflow 최소 권한, action SHA 고정, 외부 스크립트 목록, CSP와 민감 정보 검사를 실제 작업 단위로 정리한다.

## 50. assistant

# Task 3-7. 보안·개인정보·GitHub Actions 정비 백로그

이번 단계의 목표는 정적 블로그에 필요한 수준까지만 보안을 강화하는 것이다.

```text
공개 사이트는 단순하게
관리 기능은 별도 경계로
외부 스크립트는 최소화
CI 권한은 필요한 만큼만
민감 정보는 배포 전에 차단
```

핵심 원칙은 다음이다.

> 정적 사이트의 가장 좋은 보안 설계는 복잡한 방어 시스템이 아니라, 쓰기 권한과 비밀 정보가 공개 빌드 경로에 들어오지 않게 만드는 것이다.

---

# Epic G. 보안·개인정보·공급망 정비

## G-01. 공개 사이트와 관리자 기능 경계 확정

### 문제

블로그 저장소 안에 관리자 편집기, GitHub OAuth, 저장소 쓰기 기능까지 함께 들어가면 정적 사이트의 단순한 신뢰 경계가 무너진다.

### 권장 구조

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

### 우선 선택안

개인 블로그라면 관리자 편집기의 기본 경로는 다음이 가장 안전하다.

```text
로컬 Git 편집
→ commit
→ pull request 또는 main push
→ CI 검증
→ 정적 배포
```

브라우저 기반 관리 기능이 반드시 필요하지 않다면 제거하거나 별도 프로젝트로 분리한다.

### 완료 조건

- 운영 정적 번들에 OAuth secret이 없음
- 공개 사이트가 저장소 쓰기 권한을 요구하지 않음
- `/admin` 주소를 숨기는 방식에 의존하지 않음
- 관리자 기능의 유지 또는 제거 이유가 문서화됨

### 우선순위

```text
P0
```

---

## G-02. Production 빌드에서 관리자 코드 제거

### 문제

메뉴에서 링크만 숨겨도 route, JavaScript, API 설정이 최종 `dist`에 남을 수 있다.

### 작업

Production artifact에서 다음을 검사한다.

```text
/admin
OAuth client 설정
GitHub write API 호출
편집기 컴포넌트
저장소 선택 UI
token 저장 코드
```

### 구현 원칙

나쁜 방식:

```ts
if (isAdmin) {
  showAdminMenu();
}
```

운영 번들에는 관리자 코드가 그대로 포함된다.

더 나은 방식:

```text
별도 앱
또는
production build에서 route·module 자체 제외
```

### 자동 검사

```bash
grep -R "/admin" dist/
grep -R "client_secret" dist/
grep -R "localStorage.*token" dist/
```

문자열 검색만으로 충분하지 않으므로 route manifest와 JavaScript bundle도 함께 확인한다.

### 완료 조건

- Production route에 관리자 페이지 없음
- 관리자 전용 module이 client bundle에 없음
- 관리자 환경변수가 공개 JavaScript에 포함되지 않음
- 관리자 기능 없이 일반 사이트 build가 가능

### 우선순위

```text
P0
```

---

# GitHub Actions 권한

## G-03. Workflow별 권한 전수 조사

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

## G-04. Build와 Deploy 권한 분리

### 목표 구조

```text
Unprivileged build job
→ immutable artifact
→ privileged deploy job
```

### Build job

```yaml
permissions:
  contents: read
```

여기에서 수행:

```text
dependency install
content validation
Astro build
검색·RSS·Sitemap 생성
smoke test
```

### Deploy job

필요한 artifact만 다운로드한 뒤 Pages에 올린다.

여기에서는 다음을 하지 않는다.

```text
npm install
postinstall 실행
Markdown generator 실행
외부 PR 코드 실행
```

### 이유

빌드 dependency나 콘텐츠 generator가 침해되어도 배포 write 권한과 직접 결합되지 않게 한다.

### 완료 조건

- 테스트한 artifact와 배포 artifact가 동일
- deploy job가 저장소 코드를 다시 빌드하지 않음
- build job에 write token 없음
- artifact 출처 commit을 추적 가능

### 우선순위

```text
P0
```

---

## G-05. Action 참조 고정

### 문제

다음과 같은 major tag는 관리에는 편리하지만 변경 가능한 참조다.

```yaml
uses: actions/checkout@v4
```

### 강화안

중요한 배포 workflow는 full commit SHA에 고정한다.

```yaml
uses: actions/checkout@<full-commit-sha> # v4.x
```

### 적용 우선순위

```text
공식 배포 action
artifact upload/download
외부 제3자 action
보안·secret 관련 action
```

### 운영 비용

SHA 고정은 업데이트가 자동으로 따라오지 않으므로 Dependabot이나 정기 점검이 필요하다.

따라서 단순 shell 명령으로 쉽게 대체할 수 있는 소규모 제3자 action은 제거하는 편이 나을 수 있다.

### 완료 조건

- 제3자 action은 모두 full SHA 고정
- 공식 핵심 action도 가능하면 SHA 고정
- SHA 옆에 이해 가능한 버전 주석 존재
- 업데이트 절차가 문서화됨

### 우선순위

```text
P0
```

---

## G-06. 제3자 Action 최소화

### 감사 질문

각 action에 대해 다음을 확인한다.

```text
무슨 기능을 하는가
공식 action인가
shell 명령으로 대체 가능한가
저장소·token·artifact 중 무엇에 접근하는가
유지보수되고 있는가
```

### 제거 우선 후보

```text
간단한 파일 복사 action
단순 문자열 치환 action
작은 JSON 생성 action
관리되지 않는 link checker action
```

복잡한 action 하나를 설치하는 것보다 저장소 내부의 짧고 검토 가능한 script가 안전할 수 있다.

### 완료 조건

- 모든 제3자 action의 목적이 명확
- 대체 가능한 불필요 action 제거
- 유지보수 중단 action 없음
- action source 변경을 dependency 변경처럼 검토

### 우선순위

```text
P1
```

---

# Secret과 환경변수

## G-07. Secret Inventory 작성

### 목록 형식

| Secret | 용도 | 사용 Workflow | 권한 | 만료·회전 | 공개 가능 여부 |
|---|---|---|---|---|---|
| Pages token | 자동 제공 | deploy | 최소 | 자동 | 비공개 |
| OAuth secret | 관리자 기능 | 분리 대상 | 저장소 제한 | 회전 | 절대 비공개 |
| Analytics ID | 브라우저 설정 | site | 없음 | 해당 없음 | 공개 식별자 |

### 중요한 구분

브라우저에 포함되는 값은 비밀로 취급할 수 없다.

예:

```text
Google Analytics measurement ID
AdSense publisher ID
Giscus repository mapping
```

이들은 공개 식별자다.

반면 다음은 절대 client bundle에 들어가면 안 된다.

```text
OAuth client secret
Personal Access Token
GitHub App private key
배포용 장기 token
```

### 완료 조건

- 저장소에서 사용하는 모든 secret 목록 존재
- 각 secret의 최소 권한과 사용 step 확인
- 공개 식별자와 secret이 구분됨
- 사용되지 않는 secret 삭제

### 우선순위

```text
P0
```

---

## G-08. Secret 전달 범위 축소

### 나쁜 방식

```yaml
env:
  TOKEN: ${{ secrets.SOME_TOKEN }}
```

workflow 전체가 접근한다.

### 권장

```yaml
- name: Perform required operation
  env:
    TOKEN: ${{ secrets.SOME_TOKEN }}
  run: ./scripts/required-operation.sh
```

필요한 한 step에만 전달한다.

### 추가 원칙

- secret을 command-line argument에 직접 넣지 않음
- `env`, `printenv`, `set -x` 금지
- secret이 포함된 파일을 artifact로 업로드하지 않음
- build output에 환경변수 덤프를 포함하지 않음

### 완료 조건

- Secret이 job 전체에 설정되지 않음
- 사용하지 않는 step은 secret 접근 불가
- debug logging에서 환경 전체 출력 없음
- artifact 내부 secret scan 통과

### 우선순위

```text
P0
```

---

## G-09. 노출된 Secret 대응 절차

### 원칙

Git에서 문자열을 삭제하는 것만으로 해결되지 않는다.

노출 시 순서:

```text
1. Secret 폐기
2. 새 credential 발급
3. 권한 축소
4. 사용 위치 교체
5. 로그·artifact·history 범위 조사
6. 필요하면 history 정리
7. 원인과 재발 방지 기록
```

### 피해야 할 것

```text
앞 네 글자만 남기고 마스킹
파일 삭제 후 같은 token 계속 사용
Private repo였다는 이유로 무시
```

### 완료 조건

- Incident runbook에 secret 노출 절차 존재
- credential 회전 위치를 찾을 수 있음
- 실제 token 대신 명백한 placeholder를 문서에 사용

### 우선순위

```text
P1
```

---

# Pull Request 보안

## G-10. 외부 PR과 배포 흐름 분리

현재 외부 기여를 받지 않더라도 workflow는 안전한 기본 구조로 두는 편이 좋다.

### PR validation

```text
읽기 권한
secret 없음
배포 없음
위험한 generator 제한
```

### Main 배포

```text
보호된 branch
검토된 commit
별도 deploy job
```

### 완료 조건

- Fork PR에서 secret이 전달되지 않음
- PR workflow가 production deploy를 실행하지 않음
- PR이 workflow나 package script를 바꿔도 write token에 접근하지 못함
- 승인되지 않은 artifact가 운영에 배포되지 않음

### 우선순위

```text
P1
```

---

## G-11. `pull_request_target` 제한

### 위험

`pull_request_target`은 대상 저장소 문맥에서 동작하므로 외부 PR 코드를 checkout하고 실행하면 위험할 수 있다.

### 허용 가능한 역할

```text
label 부여
PR metadata 검사
안전한 댓글 작성
```

### 금지할 역할

```text
PR branch checkout 후 npm install
PR의 build script 실행
외부 콘텐츠 generator 실행
secret을 사용하는 테스트
```

### 완료 조건

- 불필요한 `pull_request_target` 없음
- 사용한다면 PR 코드를 실행하지 않음
- 목적과 권한이 주석으로 설명됨

### 우선순위

```text
P1
```

---

# Dependency 공급망

## G-12. Dependency 역할 분류

모든 dependency를 다음으로 분류한다.

```text
runtime
build
content-tool
development
optional integration
```

### 감사표

| Package | 역할 | Browser 전달 | Install Script | 유지 상태 | 대체 가능 |
|---|---|---:|---:|---|---|
| Astro | build | 일부 | 확인 | 활발 | 낮음 |
| Shiki | build | 아니오 | 확인 | 활발 | 중간 |
| 특정 plugin | content-tool | 아니오 | 확인 | 불명 | 높음 |

### 완료 조건

- 용도를 모르는 dependency 없음
- 제거된 기능의 잔존 package 없음
- 동일 목적의 library 중복 확인
- browser runtime dependency와 build dependency를 구분

### 우선순위

```text
P0
```

---

## G-13. Install Script 감사

### 확인 대상

```text
preinstall
install
postinstall
prepare
```

설치 시 임의 코드가 실행될 수 있으므로 새 package 도입 시 lifecycle script를 확인한다.

### 작업

```bash
npm query ':attr(scripts, [postinstall])'
```

실제 package manager에 맞는 명령이나 lockfile 분석 도구를 사용한다.

### 정책

- 꼭 필요한 native build는 허용
- 이유를 모르는 postinstall은 검토
- 단순 도구인데 외부 binary 다운로드 시 경계 강화
- CI에서 불필요한 script를 비활성화할 수 있는지 검토

### 완료 조건

- Install script를 가진 direct dependency 목록 확보
- 외부 binary 다운로드 package 파악
- 불필요하거나 관리되지 않는 package 제거

### 우선순위

```text
P1
```

---

## G-14. Lockfile 변경 분리

Dependency 변경과 대량 콘텐츠 수정이 같은 PR에 섞이면 공급망 diff가 묻힌다.

### 원칙

```text
dependency update
platform migration
content bulk edit
```

을 가능한 한 별도 commit이나 PR로 나눈다.

### 완료 조건

- Lockfile 대량 변경이 콘텐츠 수정에 섞이지 않음
- 새 transitive dependency 수를 확인할 수 있음
- major update는 별도 검증 기록 존재

### 우선순위

```text
P1
```

---

## G-15. 취약점 알림 우선순위화

`npm audit` 숫자 0을 목표로 삼지 않는다.

### 분류

```text
브라우저에서 실행되는가
빌드 시 임의 코드를 실행하는가
개발 환경에만 있는가
실제 취약 경로가 도달 가능한가
업데이트로 회귀 위험이 큰가
```

### 결과 상태

```text
update
remove
mitigate
accept temporarily
not applicable
```

### 완료 조건

- Critical·High 경고의 실제 노출 경로 평가
- 단순 숫자 숨기기를 위해 무리한 major update를 하지 않음
- 수용한 위험에는 이유와 재검토 조건 존재

### 우선순위

```text
P1
```

---

# 외부 스크립트와 개인정보

## G-16. 외부 Integration Inventory

### 목록

| Service | 목적 | 로드 페이지 | 전송 데이터 | 쿠키·저장소 | 제거 시 영향 |
|---|---|---|---|---|---|
| AdSense | 광고 | 조건부 article | 광고 관련 | 가능 | 광고만 제거 |
| Analytics | 통계 | 선별 | page event | 설정에 따라 | 통계만 제거 |
| Giscus | 댓글 | article 하단 | GitHub interaction | 외부 | 댓글만 제거 |
| 외부 폰트 | 표현 | 전체 | IP/request | 캐시 | fallback |

### 완료 조건

- 외부 요청 도메인 목록 확보
- 각 서비스의 목적과 데이터 흐름 확인
- 사용하지 않는 외부 script 제거
- Privacy Policy와 실제 integration이 일치

### 우선순위

```text
P0
```

---

## G-17. 핵심 콘텐츠와 외부 Script 분리

### 원칙

외부 script가 실패하더라도 다음은 정상이어야 한다.

```text
본문
내비게이션
Topic Hub
내부 검색 fallback
관련 글
```

### 로딩 우선순위

```text
HTML과 핵심 CSS
→ 사이트 자체 기능
→ 댓글
→ 분석
→ 광고
```

### 완료 조건

- AdSense 실패 시 본문 정상
- Giscus 실패 시 댓글 영역만 영향
- Analytics 차단 시 페이지 이동 정상
- 외부 폰트 실패 시 읽을 수 있는 fallback

### 우선순위

```text
P0
```

---

## G-18. 댓글 지연 로딩

### 현재 위험

댓글을 읽지 않는 사용자에게도 GitHub/Giscus 관련 요청이 즉시 발생할 수 있다.

### 권장 방식

```text
댓글 영역이 viewport에 가까워짐
또는
사용자가 댓글 열기 선택
→ Giscus 로드
```

### UX

초기 상태:

```text
댓글 보기
댓글은 GitHub Discussions를 통해 제공됩니다.
```

### 완료 조건

- 초기 화면에서 Giscus 요청 없음
- 댓글 로딩 실패가 본문에 영향 없음
- 외부 서비스 사용 사실 표시
- 중요한 정정은 댓글에만 남기지 않음

### 우선순위

```text
P1
```

---

## G-19. 분석 이벤트 최소화

### 수집 대상 후보

```text
페이지 조회
Topic Hub → 글 이동
검색 결과 선택
검색 결과 없음
```

### 기본 제외

```text
전체 검색어 원문 장기 저장
코드 내용
편집 중 문서
사용자 IP 기반 장기 식별
모든 클릭 이벤트
```

특히 검색창에는 회사명, 내부 오류 로그, 사내 hostname이 입력될 수 있다.

### 완료 조건

- 각 이벤트가 실제 의사결정 질문과 연결됨
- 수집하지 않는 데이터가 정의됨
- Query parameter와 fragment가 analytics page path를 폭증시키지 않음
- 개발자와 bot 트래픽을 가능한 범위에서 분리

### 우선순위

```text
P1
```

---

## G-20. Privacy Policy와 실제 동작 일치 검사

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

# CSP와 브라우저 보안

## G-21. CSP 적용 가능성 조사

GitHub Pages 환경에서 header 제어가 제한될 수 있으므로 배포 방식에 맞는 현실적인 적용안을 확인한다.

### 먼저 할 일

현재 페이지가 사용하는 출처를 수집한다.

```text
script-src
style-src
img-src
font-src
connect-src
frame-src
```

### 초기 목표

완벽한 CSP보다 외부 출처 인벤토리를 정확히 만드는 것이 먼저다.

예상 정책 방향:

```text
default-src 'self'
img-src 'self' data: 필요한 이미지 도메인
font-src 'self' 필요한 폰트 도메인
frame-src Giscus 관련 도메인
connect-src Analytics·광고·댓글의 필요한 도메인
```

### 주의

AdSense는 여러 동적 출처를 사용할 수 있어 CSP가 복잡해질 수 있다. 광고를 위해 광범위한 wildcard를 추가하면 정책 효과가 크게 줄어들 수 있다.

### 완료 조건

- 현재 외부 출처 목록 존재
- 불필요한 출처 제거
- CSP 적용 가능·불가능 범위 문서화
- 무의미한 `*`, `unsafe-eval` 중심 정책을 도입하지 않음

### 우선순위

```text
P1
```

---

## G-22. Inline Script 최소화

테마 초기화처럼 초기 렌더 전에 필요한 작은 script는 있을 수 있다.

하지만 다음이 늘어나면 CSP 적용과 유지보수가 어려워진다.

```text
inline event handler
동적 HTML 문자열
페이지마다 별도 inline script
```

### 개선

```text
onclick 속성 제거
명시적 event listener 사용
공통 client module로 이동
서버·빌드 타임 HTML 우선
```

### 완료 조건

- `onclick`, `onload` 같은 inline handler 없음
- `innerHTML` 사용 위치 전수 확인
- 필수 inline script가 소수이며 이유가 명확
- 동적 script 문자열 생성 없음

### 우선순위

```text
P1
```

---

## G-23. `innerHTML`과 검색 Highlight 감사

### 위험 위치

```text
검색 결과 snippet
검색어 highlight
Markdown 외부 import
댓글 fallback
사용자 입력 메시지
```

### 권장

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

### 완료 조건

- 사용자 입력이 HTML 문자열로 직접 삽입되지 않음
- Markdown raw HTML 정책 명확
- 검색 query에 `<`, `"`, `&` 등을 넣어도 script 실행이나 DOM 파손 없음

### 우선순위

```text
P0
```

---

## G-24. Raw HTML 허용 정책

### 선택지

#### 완전 금지

가장 단순하지만 기존 콘텐츠 호환성 문제가 있을 수 있다.

#### 제한 허용

필요한 태그와 attribute만 허용한다.

```text
표준 텍스트 요소
details/summary
제한된 iframe directive
안전한 class 없는 구조
```

#### 신뢰 콘텐츠로 전면 허용

현재 혼자 쓰더라도 미래의 import·AI 초안·외부 기여에서 위험이 커진다.

### 권장

Raw HTML 사용 위치를 먼저 집계하고, 기능별 컴포넌트나 directive로 대체한다.

```text
YouTube embed
callout
diagram
details
```

### 완료 조건

- Raw HTML 사용 문서 수 확인
- Script·inline event attribute 차단
- iframe은 허용 도메인·sandbox 정책 적용
- 자동 import 콘텐츠도 같은 validation 통과

### 우선순위

```text
P1
```

---

## G-25. Iframe 허용 목록

### 허용 후보

```text
Giscus
YouTube
공식 문서의 제한된 embed
```

### 각 integration에 정의할 것

```text
도메인
sandbox
allow
referrerpolicy
loading
title
```

### 피해야 할 것

Markdown에서 임의 URL을 iframe으로 넣는 범용 기능.

### 완료 조건

- 허용되지 않은 iframe domain build warning 또는 error
- iframe마다 accessible title 존재
- 필요한 최소 권한만 허용
- 모바일 크기와 로딩 실패 fallback 존재

### 우선순위

```text
P1
```

---

# 민감 정보 노출

## G-26. 콘텐츠 Secret Scan

기술 글의 코드 블록과 로그에도 secret이 들어갈 수 있다.

### 검사 패턴

```text
GitHub token 형식
AWS·Cloud API key 형식
Private key header
Bearer token
password=
client_secret
Authorization:
```

### 주의

예제 placeholder도 scanner에 걸릴 수 있으므로 다음처럼 명백히 가짜 값을 사용한다.

```text
YOUR_GITHUB_TOKEN
EXAMPLE_API_KEY
example.invalid
```

### 결과 정책

```text
실제 가능성이 높은 secret → build error
불명확한 토큰형 문자열 → warning + 수동 확인
```

### 완료 조건

- Markdown과 source code 모두 scan
- 생성된 `dist`도 scan
- Allowlist가 구체적이고 제한적
- 실제 token이 발견되면 즉시 회전 절차 실행

### 우선순위

```text
P0
```

---

## G-27. 로그와 스크린샷 Redaction Checklist

### 로그에서 제거할 후보

```text
사내 hostname
사설·공인 IP
사용자 이름
절대 경로
고객명
Jira·GitLab 내부 URL
device serial
이메일
token
```

### 스크린샷에서 확인할 후보

```text
브라우저 탭
북마크
알림
터미널 prompt
홈 디렉터리
파일 목록
회사명
```

### 게시 전 처리

```text
필요 영역 crop
식별자 일반화
실 token 전체 교체
EXIF metadata 제거
```

### 완료 조건

- 콘텐츠 작성 가이드에 redaction checklist 존재
- 대표 기술 글 스크린샷 재검토
- 내부 hostname과 개인 경로 검색 리포트 존재
- 새 이미지에서 EXIF 제거 여부 확인

### 우선순위

```text
P0
```

---

## G-28. 민감 파일 Artifact Allowlist

### 위험

`public/`이나 copy script 설정 오류로 다음이 배포될 수 있다.

```text
.env
*.bak
draft.md
private.json
source archive
원본 PSD
debug log
```

### 권장 방식

금지 목록만 두기보다 허용된 public 자산 경로를 명확히 한다.

### 배포 후 검사

```text
확장자 목록
숨김 파일
대형 예상 밖 파일
환경 파일명
source map
backup suffix
```

### 완료 조건

- `dist`의 금지 파일 검사
- `.env`, private key, backup 파일 없음
- 예상하지 못한 확장자 경고
- 배포 artifact 파일 목록 보존

### 우선순위

```text
P0
```

---

## G-29. Source Map 공개 정책

### 판단 기준

```text
실제 오류 분석에 필요한가
브라우저 JS가 얼마나 복잡한가
오류 추적 도구를 사용하는가
내부 경로·주석 노출이 불필요한가
```

Source map 자체가 secret은 아니지만 공개 필요가 없다면 production에서 제외한다.

### 완료 조건

- 공개 여부가 의도적으로 결정됨
- source map 내부에 secret이 없는지 별도 검사
- 관리 코드가 source map을 통해 드러나지 않음

### 우선순위

```text
P2
```

---

# 도메인과 HTTPS

## G-30. HTTPS·Canonical·Domain 점검

### 검사

```text
HTTP → HTTPS 전환
www/apex 일관성
GitHub Pages custom domain
canonical production origin
Sitemap origin
OG URL
```

### 완료 조건

- 모든 내부 absolute URL이 HTTPS
- HTTP 접근은 HTTPS로 이동
- 한 개의 production origin 사용
- 인증서 오류 없음
- preview URL이 canonical이나 Sitemap에 들어가지 않음

### 우선순위

```text
P0
```

---

## G-31. Domain Takeover 방지 운영

Custom domain을 변경하거나 사이트를 이전할 때 DNS와 Pages 설정을 함께 관리한다.

### 문서화

```text
도메인 등록자
DNS provider
GitHub Pages 연결 방식
검증 상태
만료일
이전·삭제 절차
```

### 완료 조건

- 사용하지 않는 DNS record 없음
- GitHub Pages domain verification 확인
- 저장소 이동·삭제 시 DNS 정리 절차 존재
- 도메인 자동 갱신과 복구 연락 경로 확인

### 우선순위

```text
P1
```

---

# 보안 운영

## G-32. 최소 보안 Runbook

최소한 다음 사건을 다룬다.

```text
Secret 노출
악성 dependency 의심
사이트 변조
GitHub 계정 침해
Domain·DNS 변경
잘못된 광고·외부 script 삽입
```

### 각 Runbook 구조

```text
탐지
즉시 차단
credential 회전
정상 artifact rollback
영향 범위 확인
재발 방지
```

### 완료 조건

- 저장소 안에 짧은 보안 runbook 존재
- 최근 정상 artifact 위치 확인 가능
- 계정 복구·2FA 수단 안전하게 관리
- 연락·지원 경로 기록

### 우선순위

```text
P1
```

---

## G-33. 정기 보안 감사 범위

### 매 변경마다

```text
content secret scan
dist 민감 파일 검사
workflow permission lint
내부 HTML/XSS 관련 테스트
```

### 월간 또는 dependency 변경 시

```text
dependency 취약점
install script
외부 integration 목록
Action SHA 업데이트
```

### 분기별

```text
도메인·HTTPS
계정 복구
사용하지 않는 secret
Privacy Policy 일치
```

### 완료 조건

- 빠른 검사와 정기 검사가 분리
- 외부 네트워크 감사가 일반 배포를 불안정하게 하지 않음
- 반복 결과가 issue 또는 report로 남음

### 우선순위

```text
P1
```

---

## G-34. 보안 수준의 종료 조건

이 Epic에서 다음까지 만들 필요는 없다.

```text
SIEM
상시 SOC
복잡한 WAF
자체 OAuth 서버
그래프 기반 공급망 플랫폼
```

### 1차 완료 기준

```text
공개 사이트에 secret·쓰기 권한 없음
관리 코드 production 제외
workflow 최소 권한
build·deploy 분리
action SHA 고정
외부 script 인벤토리
민감 콘텐츠·artifact scan
Privacy Policy 일치
HTTPS와 domain 정상
```

이 상태면 개인 정적 기술 블로그에 필요한 현실적인 기준선을 갖춘 것이다.

---

# Epic G 완료 기준

## 공개 사이트

```text
순수 정적 읽기 사이트
관리자 route·코드 없음
외부 서비스 실패와 본문 분리
raw HTML·iframe 정책
XSS 위험 위치 정리
```

## CI

```text
workflow permissions 명시
build와 deploy 분리
action SHA 고정
secret 최소 전달
fork PR에서 secret 없음
```

## 공급망

```text
dependency 역할 목록
install script 감사
lockfile 변경 분리
취약점 위험 기반 대응
```

## 개인정보

```text
외부 integration inventory
Privacy Policy 일치
댓글·광고·분석 데이터 흐름 파악
검색 이벤트 최소화
```

## 콘텐츠

```text
secret scan
로그·스크린샷 redaction
민감 파일 artifact 검사
production source map 정책
```

---

# Epic G 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| G-01 | 공개·관리 경계 확정 | P0 | 중간 | 매우 높음 |
| G-02 | Production 관리자 코드 제거 | P0 | 중간 | 매우 높음 |
| G-03 | Workflow 권한 조사 | P0 | 낮음 | 매우 높음 |
| G-04 | Build·Deploy 분리 | P0 | 중간 | 매우 높음 |
| G-05 | Action SHA 고정 | P0 | 중간 | 높음 |
| G-06 | 제3자 Action 최소화 | P1 | 중간 | 높음 |
| G-07 | Secret Inventory | P0 | 낮음 | 매우 높음 |
| G-08 | Secret 전달 축소 | P0 | 낮음 | 높음 |
| G-12 | Dependency 역할 분류 | P0 | 중간 | 높음 |
| G-16 | 외부 Integration Inventory | P0 | 낮음 | 매우 높음 |
| G-17 | 외부 Script 실패 격리 | P0 | 중간 | 높음 |
| G-20 | Privacy Policy 일치 | P0 | 중간 | 매우 높음 |
| G-23 | `innerHTML`·검색 Highlight 감사 | P0 | 중간 | 매우 높음 |
| G-26 | 콘텐츠 Secret Scan | P0 | 중간 | 매우 높음 |
| G-27 | 로그·스크린샷 Redaction | P0 | 중간 | 매우 높음 |
| G-28 | Artifact 민감 파일 검사 | P0 | 낮음 | 높음 |
| G-30 | HTTPS·Domain 점검 | P0 | 낮음 | 매우 높음 |
| G-32 | 보안 Runbook | P1 | 낮음 | 높음 |

---

# 일곱 번째 실제 실행 묶음

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

## 51. assistant

# Task 3-8. 테스트·회귀 검증·출시 체크리스트 백로그

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

# Epic H. 테스트·회귀 검증·출시 관리

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

# H-02. 빠른 Content Validation 명령

권장 명령:

```bash
npm run check:content
```

포함할 검사:

```text
front matter schema
content ID
slug uniqueness
Topic ID 존재
type·status enum
날짜 형식
필수 description
relation 대상 존재
자기 참조
상태 불변조건
```

## 상태 불변조건 예

```text
superseded → featured 불가
archived → home 노출 불가
draft → Sitemap 불가
noindex → Sitemap 불가
featured → status=current
```

## 오류 출력 예

```text
ERROR [content/status-featured]
src/content/posts/old-pcie-bar.md

A superseded document cannot be featured.
Suggested action: remove it from featured config or set a valid current replacement.
```

## 완료 조건

- 파일명과 문제 위치가 표시됨
- 오류 이유와 수정 방향이 나옴
- JSON 또는 SARIF 출력 가능성 검토
- 로컬과 CI가 같은 명령을 사용

## 우선순위

```text
P0
```

---

# H-03. Content Fixture 세트 생성

실제 전체 콘텐츠만으로 parser와 schema를 테스트하면 edge case를 재현하기 어렵다.

## 최소 fixture

```text
valid-guide.md
valid-debug-note.md
historical-post.md
invalid-status.md
missing-topic.md
duplicate-slug.md
broken-relation.md
korean-heading.md
long-code-block.md
raw-html.md
```

## fixture의 목적

각 파일은 하나 또는 소수의 동작만 재현한다.

예:

```yaml
---
title: Duplicate URL
slug: pcie-bar
status: current
type: concept
topic: pcie-cxl
---
```

다른 fixture와 동일 slug를 사용해 충돌을 검증한다.

## 피해야 할 것

- 실제 게시글 전체 복사
- fixture 자체가 수백 줄
- 여러 오류를 한 파일에 몰아넣기
- production 문서 변경에 따라 fixture도 계속 수정

## 완료 조건

- 주요 콘텐츠 타입 fixture 존재
- 실패해야 하는 fixture와 예상 오류 정의
- 한글·영문·특수문자 사례 포함
- parser 변경 시 빠르게 실행 가능

## 우선순위

```text
P1
```

---

# H-04. Internal Link 검사

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

# H-05. Relation Integrity 검사

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

# H-06. Topic Hub Validation

각 Hub가 단순 빈 껍데기로 공개되지 않게 한다.

## 검사 항목

```text
고유 title
고유 description
Start Here 1~3개
Featured 3~6개
관련 Topic 최소 1개
모든 문서 current 또는 허용 상태
중복 article ID 없음
```

## 예외 처리

초기 구축 중인 Hub는 production에서 숨기거나 `noindex`할 수 있다.

하지만 공개 Hub라면 완성 기준을 적용한다.

## 완료 조건

- 빈 Hub 생성 없음
- Start Here가 발행순으로 자동 결정되지 않음
- Featured에 `needs-review`나 `superseded` 없음
- Hub 링크가 모두 실제 문서로 연결

## 우선순위

```text
P0
```

---

# H-07. Featured Content Validation

홈의 Featured는 사이트 대표 문서이므로 일반 글보다 강한 기준을 적용한다.

## 필수 조건

```text
status=current
description 존재
Primary Topic 존재
type 지정
canonical URL 존재
상위 Hub 연결
```

환경이나 버전이 중요한 글은:

```text
lastVerified 또는 명시적인 historical scope
```

가 필요하다.

## 추가 검사

```text
Featured 4~6개
같은 Topic으로 과도하게 편중되지 않음
동일 검색 의도의 중복 문서 없음
```

Topic 다양성은 자동 오류보다 warning이 적절하다.

## 완료 조건

- Featured 설정 오류가 build 전에 차단됨
- 구판이 홈에 노출되지 않음
- 모든 Featured 링크가 200 응답
- Featured 카드 metadata 누락 없음

## 우선순위

```text
P0
```

---

# H-08. Publication Set 일치 검사

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

# H-09. Production Build 통합 테스트

권장 명령:

```bash
npm run build:release
```

반드시 다음을 실제로 생성한다.

```text
HTML
CSS·JS
검색 인덱스
Sitemap
RSS
필수 OG
Topic Hub
404
```

## 검사할 실패

```text
unknown syntax grammar
생성 asset 누락
잘못된 base path
JSON serialization 오류
duplicate route
Markdown transformation 오류
```

## 완료 조건

- main merge 전 production build 실행
- build가 최종 배포 설정을 사용
- dev server 성공만으로 배포하지 않음
- build artifact가 이후 smoke test와 deploy에 재사용됨

## 우선순위

```text
P0
```

---

# H-10. 최종 `dist` 구조 검사

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

# H-11. Dist HTTP Smoke Test

생성된 `dist`를 실제 HTTP 서버로 제공하고 검사한다.

```bash
npm run preview:dist
npm run test:smoke
```

## 최소 URL

```text
/
PCIe & CXL Hub
Firmware & Bootloader Hub
대표 Guide 2개
Historical 문서 1개
검색
About
Privacy
Editorial Policy
존재하지 않는 URL
```

## 검사 항목

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

## 404

존재하지 않는 URL은 404 동작을 확인한다.

GitHub Pages의 실제 404 제공 특성도 고려해 테스트 환경과 운영 환경 차이를 문서화한다.

## 완료 조건

- 대표 URL 모두 정상
- 404가 soft 404 형태로 200 응답하지 않음
- 자산 경로가 production base에서 정상
- 외부 댓글·광고 실패와 무관하게 본문 표시

## 우선순위

```text
P0
```

---

# H-12. SEO Metadata 회귀 검사

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

# H-13. 구조화 데이터 검사

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

# H-14. 검색 Golden Query 테스트

Task 3-4에서 만든 대표 검색어를 자동 테스트한다.

## 최소 query 수

```text
20개
```

구성:

```text
상위 주제
정확한 개념
한글 alias
영문 alias
기호 용어
identifier
오류 메시지
```

## 테스트 형식

```yaml
- query: PCIe BAR
  mustInclude:
    - pcie-bar-sizing
  preferredTopThree:
    - pcie-device-initialization
  exclude:
    - old-pcie-bar-note
```

## 판정

정확한 내부 점수를 고정하지 않는다.

검사할 것은 다음이다.

```text
필수 문서 포함
선호 문서 상위 3개
구판 제외
무관한 문서 과다 노출 없음
```

## 완료 조건

- 검색 알고리즘 변경 시 자동 실행
- 한글·영문 alias 모두 테스트
- 기호 제거로 C++·MSI-X가 깨지지 않음
- `superseded` 문서가 일반 검색 상위에 없음

## 우선순위

```text
P0
```

---

# H-15. 검색 UI 브라우저 테스트

검색 알고리즘만 맞아도 UI가 깨질 수 있다.

## 동작 시나리오

```text
검색 버튼 클릭
인덱스 로딩
검색어 입력
결과 선택
Escape로 닫기
focus 복원
결과 없음
인덱스 로드 실패
```

## 키보드

```text
Tab
Shift+Tab
Enter
Arrow keys를 지원한다면 해당 동작
Escape
```

## 보안 입력

다음 검색어를 넣어도 DOM이 깨지거나 실행되지 않아야 한다.

```text
<script>alert(1)</script>
"><img src=x onerror=alert(1)>
C++
MSI-X
&
```

## 완료 조건

- 검색 modal focus trap 정상
- 닫은 후 원래 버튼으로 focus 복귀
- highlight가 안전한 DOM API로 생성
- 모바일 키보드에서 결과 영역 사용 가능
- 검색 실패 fallback 존재

## 우선순위

```text
P0
```

---

# H-16. 접근성 자동 검사

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

# H-17. 수동 키보드 Smoke Checklist

자동화가 놓치는 핵심 흐름만 짧게 확인한다.

```text
[ ] Skip link로 본문 이동
[ ] Header 메뉴 접근
[ ] 검색 열기·닫기
[ ] 검색 결과 선택
[ ] Topic Hub Start Here 순서 탐색
[ ] 코드 복사 버튼 접근
[ ] Heading permalink 접근
[ ] 댓글 열기 기능 접근
```

## 완료 조건

- 마우스 없이 핵심 탐색 가능
- focus indicator가 모든 인터랙션에서 보임
- modal 뒤쪽으로 focus가 빠지지 않음
- 카드가 실제 `<a>` 또는 `<button>`으로 구현됨

## 우선순위

```text
P1
```

---

# H-18. 모바일 Viewport Smoke Test

## 권장 viewport

```text
360×800
390×844
태블릿 폭 768
```

모든 기기를 테스트할 필요는 없지만 작은 폭과 일반 모바일 폭은 필요하다.

## 페이지 유형

```text
홈
Topic Hub
긴 Guide
코드 많은 글
표 많은 글
검색
Privacy
404
```

## 검사

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

## 자동 검사 가능 항목

```javascript
document.documentElement.scrollWidth <= window.innerWidth
```

하지만 의도적인 코드·표 내부 가로 스크롤은 허용한다.

페이지 전체 viewport만 확장되지 않게 한다.

## 완료 조건

- 페이지 전체 가로 스크롤 없음
- 코드·표는 자체 스크롤 영역 사용
- Core Topics와 Featured가 한 열에서도 이해 가능
- 검색 modal이 화면과 키보드에 가리지 않음

## 우선순위

```text
P0
```

---

# H-19. Visual Canary 세트

모든 페이지 screenshot을 보존하지 않는다.

대표적인 문제 페이지 5개 정도만 선정한다.

## 권장 Canary

```text
홈
PCIe & CXL Hub
코드 블록이 가장 많은 글
표·다이어그램이 많은 글
검색 modal 열린 상태
```

추가로 다크모드 대표 글 1개를 포함할 수 있다.

## Screenshot 상태

```text
Desktop light
Mobile light
대표 페이지 dark
```

## 안정화 조건

- 외부 광고·댓글 mock 또는 제외
- 날짜·현재 시간 고정
- font 고정
- animation 비활성화
- 동일 브라우저 환경

## 완료 조건

- 주요 CSS 변경에서 실행
- 작은 렌더링 차이에 과민하지 않은 threshold 사용
- 결과 diff를 사람이 볼 수 있음
- 실패 시 무조건 snapshot 갱신하지 않음

## 우선순위

```text
P1
```

---

# H-20. 코드 블록 회귀 검사

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

# H-21. 표와 다이어그램 회귀 검사

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

# H-22. 보안 회귀 검사

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

# H-23. GitHub Actions Lint

검사할 내용:

```text
permissions 명시
write-all 금지
Action full SHA
사용하지 않는 secret
pull_request_target 위험 패턴
deploy job 권한 분리
```

## 오류 예

```text
ERROR:
Third-party action `vendor/action@v2` is not pinned to a full commit SHA.
```

```text
ERROR:
Build job requests `contents: write`.
Expected: `contents: read`.
```

## 완료 조건

- workflow 변경 PR에서 자동 실행
- 제3자 action mutable tag 차단
- deploy 외 job의 불필요 write 권한 차단
- 위험한 `pull_request_target` 사용 감지

## 우선순위

```text
P0
```

---

# H-24. 성능 회귀 기준

Task 3-5에서 만든 build metrics를 비교한다.

## 추적 지표

```text
release build duration
Peak RSS
검색 인덱스 크기
홈 JavaScript
대표 Guide HTML
dist 총량
```

## 초기 정책

먼저 warning으로 시작한다.

```text
Build time +20%
Peak RSS +20%
Search index +20%
Homepage JS +15%
Canary HTML +20%
```

## 주의

콘텐츠가 실제로 많이 늘어난 경우와 구조적 회귀를 구분한다.

따라서 함께 기록한다.

```text
문서 수
코드 블록 수
이미지 수
변경 파일 수
```

## 완료 조건

- 이전 release와 비교 가능
- 갑작스러운 증가가 PR에서 보임
- 초기에 warning으로 운영
- 충분한 baseline 뒤 blocker 범위 검토

## 우선순위

```text
P1
```

---

# H-25. 외부 Integration 실패 테스트

댓글·Analytics·AdSense·외부 폰트를 차단한 상태에서 페이지를 연다.

## 기대 결과

```text
본문 정상
내비게이션 정상
내부 검색 또는 fallback 정상
레이아웃 유지
오류가 사용자에게 과도하게 노출되지 않음
```

## 테스트 방법

브라우저에서 관련 domain 요청을 block하거나 test 환경에서 script URL을 실패시키는 방식으로 확인한다.

## 완료 조건

- Giscus 실패가 본문을 깨뜨리지 않음
- 광고 실패 시 큰 빈 공간이 남지 않음
- Analytics 차단 시 navigation 정상
- 외부 폰트 차단 시 읽을 수 있는 fallback

## 우선순위

```text
P1
```

---

# H-26. 광고 제외 페이지 회귀 검사

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

# H-27. 출시 전 수동 대표 문서 리뷰

자동화로 기술 정확성을 판정할 수 없다.

대표 문서 10개에 대해 마지막 수동 리뷰를 진행한다.

## 공통

```text
[ ] 제목이 실제 질문과 일치
[ ] description이 고유함
[ ] 핵심 결론에 근거가 있음
[ ] 관찰과 가설이 구분됨
[ ] 버전·환경이 필요하면 표시됨
[ ] 적용 범위와 한계가 있음
[ ] 구판 링크가 최신 문서를 방해하지 않음
[ ] 다음 학습 경로가 있음
```

## Source Walkthrough

```text
[ ] commit 또는 tag
[ ] file과 symbol
[ ] 현재 소스와 차이 가능성
```

## Experiment

```text
[ ] baseline
[ ] 반복 횟수
[ ] 결과 단위
[ ] 일반화 한계
```

## Debug Note

```text
[ ] 증상
[ ] 정상 기대값
[ ] 제외한 가설
[ ] 해결 후 검증
```

## 완료 조건

- 대표 글 10개 리뷰 완료 기록
- 리뷰 중 발견한 중대한 오류 수정
- 검증하지 못한 글은 `current`로 강제하지 않음
- Featured 목록과 리뷰 결과 일치

## 우선순위

```text
P0
```

---

# H-28. 단계적 출시 전략

홈, Hub, metadata, 검색, 색인, 빌드를 모두 한 번에 배포하면 원인 추적이 어렵다.

## Release 1: 콘텐츠 기반

```text
상태·타입 schema
대표 글 metadata
Topic registry
```

사용자 화면 변화는 최소화한다.

## Release 2: 탐색 구조

```text
홈 개편
Topic Hub
Featured Guides
역할 기반 다음 글
```

## Release 3: 검색·색인

```text
SearchDocument
alias
상태 ranking
Sitemap
canonical
tag 정책
```

## Release 4: 파이프라인

```text
Content Manifest
Publication Policy
CI build 1회
smoke test
```

## Release 5: 신뢰·정책

```text
About
Privacy
Editorial Policy
보안·외부 integration 정리
```

실제로는 일부를 합칠 수 있지만, 데이터 구조와 UI·SEO 대규모 변경을 한 번에 섞지 않는 것이 중요하다.

## 완료 조건

- 각 release가 독립적으로 rollback 가능
- migration과 redesign이 분리됨
- 각 단계에 완료 조건과 smoke test 존재
- URL 변경은 별도 검토

## 우선순위

```text
P0
```

---

# H-29. Release Branch와 Commit 경계

## 분리할 변경

```text
기계적 front matter migration
수동 콘텐츠 수정
UI redesign
검색 알고리즘
dependency update
workflow 변경
```

각 항목을 가능한 한 별도 commit으로 둔다.

## 예시

```text
1. chore(content): add status and type fields
2. content(pcie): verify five canonical guides
3. feat(home): add core topics and featured guides
4. feat(search): add alias-aware search documents
5. ci: split build and deploy jobs
```

## 피해야 할 것

```text
홈 개편 + dependency major upgrade + 글 500개 formatter 적용
```

## 완료 조건

- 의미 변경과 formatting noise 분리
- rollback 단위가 명확
- lockfile 변경이 콘텐츠 diff에 묻히지 않음
- 대량 migration 결과를 별도 검토 가능

## 우선순위

```text
P1
```

---

# H-30. 데이터 Migration Dry Run

Front matter나 URL을 대량 수정할 때 적용한다.

## 흐름

```text
analyze
→ dry-run
→ report
→ sample review
→ apply
→ full validation
```

## 리포트

```text
수정 파일 수
추가·변경 필드
해석 실패 파일
중복 URL
예상 redirect
```

## Idempotency

같은 migration을 두 번 실행해도 두 번째에는 변경이 없어야 한다.

## 완료 조건

- Dry run 없이 원본 수정 금지
- 실패 파일 목록 명확
- 기계적 변경과 수동 판단 분리
- 적용 후 전체 manifest 비교
- migration 전후 commit 경계 존재

## 우선순위

```text
P0
```

---

# H-31. Rollback 계획

## 콘텐츠 rollback

문서 수정 commit을 되돌린다.

## UI rollback

기존 홈·검색 컴포넌트를 다시 활성화한다.

## 배포 rollback

이전 정상 artifact를 재배포한다.

## URL rollback

URL을 원복하기보다 redirect 정책을 유지하면서 이전 UI나 콘텐츠를 복구하는 것이 안전할 수 있다.

## 준비할 것

```text
최근 정상 artifact
commit SHA
배포 명령
domain·canonical 확인 절차
```

## 완료 조건

- 이전 artifact 재배포 가능
- rollback에 새 dependency install이 필요하지 않음
- 복구 후 대표 URL smoke test 존재
- rollback이 canonical URL을 임시 domain으로 바꾸지 않음

## 우선순위

```text
P1
```

---

# H-32. Production Verification

배포 완료 메시지로 끝내지 않는다.

## 즉시 확인

```text
홈
Topic Hub 2개
대표 글 2개
검색
Sitemap
RSS
404
```

## 검사

```text
실제 production origin
canonical
최신 CSS·JS
검색 index version
대표 internal link
HTTPS
```

## 외부 서비스

댓글·Analytics·AdSense는 나중에 확인해도 되지만, 오류가 핵심 콘텐츠에 영향을 주지 않아야 한다.

## 완료 조건

- 실제 운영 URL에서 smoke test
- 배포 commit SHA 확인
- Sitemap과 검색 인덱스가 새 버전인지 확인
- 예상치 못한 캐시·구버전 asset 없음

## 우선순위

```text
P0
```

---

# H-33. 출시 후 관찰 기간

기술 오류와 검색 효과는 관찰 시점이 다르다.

## 즉시 확인

```text
build
links
UI
검색 기능
404
canonical
```

## 며칠 내 확인

```text
Search Console crawling
Sitemap 처리
Google-selected canonical
Core Web Vitals 초기 이상
```

## 장기 확인

```text
검색 유입
Topic Hub 이동
대표 문서 노출
AdSense 결과
```

검색 지표를 하루 이틀 만에 평가하지 않는다.

## 완료 조건

- 즉시 기술 검증과 장기 관측을 분리
- 변경 로그와 commit 기록 존재
- 관찰 기간 중 불필요한 구조 재변경 제한

## 우선순위

```text
P1
```

---

# H-34. 실패 Severity 정책

## Blocker

```text
production build 실패
중복 URL
깨진 핵심 내부 링크
Draft 노출
secret 탐지
Sitemap·canonical 충돌
관리 코드 production 포함
검색 JSON 파손
```

## Warning

```text
대형 코드 블록
description 부족
오래된 외부 링크
Needs Review 장기 방치
성능 예산 증가
Topic 다양성 부족
```

## Info

```text
alias 후보
통합 후보
Hub 편입 후보
환경 정보 보완 제안
```

## 완료 조건

- Warning 폭증이 blocker를 가리지 않음
- 각 rule의 배포 차단 여부가 명확
- 오탐이 많은 rule은 warning 이하
- rule마다 rationale과 수정 예시 존재

## 우선순위

```text
P0
```

---

# H-35. CI 파이프라인 최종안

권장 흐름:

```text
Pull Request
├── Content Validation
├── Typecheck
├── Workflow Security Lint
└── 필요한 경우 Preview Build

Main
├── Content Validation
├── Production Build
├── Dist Validation
├── Browser Smoke
├── Security Scan
├── Artifact Upload
└── Deploy

Scheduled
├── External Link Audit
├── Dependency Audit
├── Content Freshness
└── Asset Audit
```

## 핵심 제약

```text
Astro full build는 한 번
Deploy job에서 재빌드하지 않음
외부 네트워크 검사는 일반 배포와 분리
```

## 완료 조건

- 테스트한 artifact를 그대로 배포
- build와 deploy 권한 분리
- 실패 위치가 명확
- scheduled audit 실패가 일반 콘텐츠 배포를 무조건 차단하지 않음

## 우선순위

```text
P0
```

---

# H-36. 테스트 유지비 제한

다음 신호가 보이면 테스트 체계가 과도해지고 있는 것이다.

```text
사소한 문장 수정에 수십 snapshot 갱신
fixture가 실제 콘텐츠보다 복잡
flaky visual test 재실행이 일상화
대부분의 warning이 항상 무시됨
테스트 때문에 dependency가 크게 증가
```

## 유지 원칙

```text
빈번하고 치명적인 문제 자동화
드물고 의미적인 문제는 수동 리뷰
불안정한 외부 조건은 정기 audit
```

## 삭제 후보

- 실제 버그를 잡지 못하는 snapshot
- 항상 suppression되는 lint
- 구현 세부사항만 고정하는 unit test
- 운영하지 않는 브라우저 전체 matrix

## 완료 조건

- 테스트마다 보호하는 계약이 설명 가능
- 6개월간 가치가 없었던 검사는 제거 검토
- 테스트 코드가 콘텐츠 파이프라인보다 커지지 않음

## 우선순위

```text
P1
```

---

# Epic H 완료 기준

## 콘텐츠

```text
schema
상태 불변조건
slug uniqueness
내부 링크
relation integrity
Hub·Featured validation
```

## 생성물

```text
production build
publication set 일치
Sitemap·RSS·Search
dist 민감 파일 검사
```

## 브라우저

```text
대표 URL smoke
검색 modal
모바일
키보드
404
외부 script 실패
```

## SEO

```text
title·description
canonical
robots
구조화 데이터
Sitemap
```

## 보안

```text
secret scan
admin code 제외
workflow permissions
Action SHA
광고 제외 페이지
```

## 출시

```text
단계적 배포
dry-run migration
rollback
production verification
변경 로그
```

---

# Epic H 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| H-01 | 테스트 계층 확정 | P0 | 낮음 | 높음 |
| H-02 | Content Validation | P0 | 중간 | 매우 높음 |
| H-04 | Internal Link 검사 | P0 | 중간 | 매우 높음 |
| H-05 | Relation Integrity | P0 | 중간 | 매우 높음 |
| H-06 | Hub Validation | P0 | 낮음 | 높음 |
| H-07 | Featured Validation | P0 | 낮음 | 높음 |
| H-08 | Publication Set 일치 | P0 | 중간 | 매우 높음 |
| H-09 | Production Build Test | P0 | 낮음 | 매우 높음 |
| H-10 | Dist 구조 검사 | P0 | 중간 | 높음 |
| H-11 | HTTP Smoke Test | P0 | 중간 | 매우 높음 |
| H-12 | SEO Metadata 검사 | P0 | 중간 | 매우 높음 |
| H-14 | 검색 Golden Query | P0 | 중간 | 매우 높음 |
| H-15 | 검색 UI 테스트 | P0 | 중간 | 매우 높음 |
| H-18 | 모바일 Smoke | P0 | 중간 | 매우 높음 |
| H-22 | 보안 회귀 검사 | P0 | 중간 | 매우 높음 |
| H-23 | Workflow Security Lint | P0 | 낮음 | 매우 높음 |
| H-27 | 대표 문서 수동 리뷰 | P0 | 높음 | 매우 높음 |
| H-28 | 단계적 출시 | P0 | 중간 | 매우 높음 |
| H-30 | Migration Dry Run | P0 | 중간 | 매우 높음 |
| H-32 | Production Verification | P0 | 낮음 | 매우 높음 |
| H-35 | CI 최종안 | P0 | 중간 | 매우 높음 |

---

# 여덟 번째 실제 실행 묶음

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

# 이번 단계의 핵심 결론

테스트의 목표는 리팩토링을 어렵게 만드는 것이 아니다.

> 콘텐츠 정체성, 대표 문서, URL, 검색, 색인, 배포 결과가 조용히 다시 무너지는 것을 막는 것이 목표다.

`hawk90.github.io`에서 가장 가치가 높은 테스트는 작은 UI 컴포넌트의 내부 구현보다 다음을 보호하는 테스트다.

```text
대표 문서가 current인가
Hub 링크가 실제 문서인가
구판이 검색·Featured에 나타나지 않는가
Sitemap과 canonical이 일치하는가
검색이 올바른 글을 찾는가
최종 dist에 민감한 파일이 없는가
모바일에서 기술 문서를 읽을 수 있는가
```

다음 단계는 **Task 3-9. 전체 실행 로드맵과 스프린트 계획**이다. 지금까지 A~H의 백로그를 2주·6주·12주 단위로 압축하고, 의존성·우선순위·완료 기준을 실제 실행 순서로 묶는 단계다.

## 52. assistant

# Task 3-9. 전체 실행 로드맵과 스프린트 계획

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

# 0. 실행 원칙

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

# Phase 0. 시작 기준선

기간보다 먼저 수행해야 하는 준비 단계다.

## 작업

```text
현재 production commit 기록
전체 URL manifest 생성
빌드 시간과 Peak RSS 측정
검색 인덱스 크기 측정
대표 검색어 20개 결과 기록
태그·시리즈·문서 수 집계
현재 Search Console 상태 기록
```

## 산출물

```text
reports/baseline-site.json
reports/baseline-search.md
reports/baseline-content.md
reports/baseline-build.json
```

반드시 이 경로를 사용할 필요는 없다. 핵심은 전후 비교 가능한 결과를 남기는 것이다.

## 완료 조건

- 현재 상태를 재현할 commit SHA가 있음
- 성능과 콘텐츠 구조의 최소 수치가 있음
- 개선 전 검색 결과 예시가 있음
- 대표 페이지 screenshot 또는 확인 기록이 있음

---

# 2주 계획: 기반과 대표 콘텐츠

첫 2주의 목표는 UI를 크게 바꾸는 것이 아니다.

> 사이트가 무엇을 대표하고 어떤 글을 신뢰할 것인지 결정한다.

---

## Sprint 1 — 1주차: 정책과 데이터 구조

### 목표

A~H 전체 작업이 의존하는 최소 규칙을 확정한다.

### 작업 1. 저장소 목적 선언

관련 항목:

```text
A-01
```

결과:

```text
이 저장소의 1차 목적은 Hawk 기술 지식베이스 운영이다.
범용 테마 기능은 실제 콘텐츠 운영 요구보다 우선하지 않는다.
```

### 작업 2. 콘텐츠 상태와 타입 확정

관련 항목:

```text
C-01
C-02
C-05
```

상태:

```text
current
needs-review
historical
superseded
archived
```

타입:

```text
guide
concept
debug-note
experiment
source-walkthrough
reference
```

### 작업 3. Topic registry 생성

초기 Topic:

```text
cpp
linux-systems
firmware-bootloader
gpu-cuda
pcie-cxl
```

필요하면 FPGA를 별도 Topic으로 둘 수 있지만, 초기 구조에서는 Firmware나 PCIe 관련 하위 주제로 두고 실제 문서 분포를 본다.

### 작업 4. Publication Policy 작성

관련 항목:

```text
E-04
H-08
```

각 상태가 다음에 포함되는지 정의한다.

```text
render
search
sitemap
rss
hub
featured
ads
```

### 작업 5. 최소 schema 정의

대표 문서부터 적용할 필드:

```yaml
type:
topic:
status:
updated:
lastVerified:
```

선택:

```yaml
testedWith:
prerequisites:
next:
related:
supersedes:
```

### 작업 6. 기본 validation 구현

관련 항목:

```text
H-02
H-05
```

우선 검사:

```text
enum
Topic 존재
날짜 형식
문서 ID
relation target
featured 상태
```

### 1주차 완료 조건

```text
[ ] 저장소 목적 선언
[ ] 상태 5종 정의
[ ] 타입 6종 정의
[ ] Topic registry 5개
[ ] Publication Policy 문서화
[ ] 최소 schema 적용 가능
[ ] 기본 content validation 실행
```

---

## Sprint 2 — 2주차: 대표 문서 선정과 검증

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

# 6주 계획: 사용자에게 보이는 구조 완성

6주차까지의 목표는 다음이다.

> 사용자가 홈에 들어와 사이트의 전문 분야를 이해하고, Topic Hub를 통해 대표 글로 이동할 수 있다.

---

## Sprint 3 — 3주차: Topic Hub 2개

### 목표

두 개의 강한 Topic Hub를 공개한다.

```text
PCIe & CXL
Firmware & Bootloader
```

### 작업

관련 항목:

```text
B-03
B-05
B-11
B-13
B-17
B-25
```

각 Hub 구성:

```text
Topic 소개
Start Here 3개 이하
Core Concepts
Featured Guides 4개 전후
Debug & Experiments
Related Topics
```

### 수동 큐레이션

```text
Start Here
Featured
Core Concepts
```

### 자동 생성 가능

```text
Recently Updated
All Articles
Debug Notes
Experiments
```

### 완료 조건

```text
[ ] Hub 2개 production 공개
[ ] 각각 고유 description
[ ] 각각 Start Here 3개 이하
[ ] 각각 Featured 3~5개
[ ] 모든 Featured current
[ ] 홈에서 접근 가능
[ ] JS 없이 탐색 가능
```

---

## Sprint 4 — 4주차: 홈 개편

### 목표

홈을 시간순 피드에서 지식베이스 진입점으로 바꾼다.

### 구조

```text
Hero
Core Topics
Featured Guides
Latest Posts
Trust/Author summary
```

### 관련 작업

```text
A-02
A-03
A-04
A-05
A-06
A-07
A-08
```

### Hero 권장 방향

```text
코드에서 하드웨어까지 연결하는 시스템 기술 문서
```

설명:

```text
C++, Linux 시스템 프로그래밍, 펌웨어, CUDA,
PCIe와 CXL의 내부 동작과 디버깅을 정리합니다.
```

### 홈 Featured

초기 4~6개.

조건:

```text
status=current
대표 Topic 존재
description 존재
Hub 연결
```

### 완료 조건

```text
[ ] 최신 글이 첫 핵심 영역이 아님
[ ] Core Topics 5개
[ ] Featured 4~6개
[ ] Latest 6개 이하
[ ] 모바일 첫 화면에서 사이트 정체성 확인 가능
[ ] hydration 추가 없이 정적 HTML
```

---

## Sprint 5 — 5주차: 검색과 내부 관계

### 목표

검색이 긴 글의 단어 빈도가 아니라 대표 문서를 우선하도록 바꾼다.

### 관련 작업

```text
D-01
D-02
D-03
D-04
D-07
D-15
D-16
```

### 우선 구현

```text
SearchDocument schema
전체 코드·로그 제외
title/alias/topic/heading 가중치
상태 기반 ranking
핵심 alias 30개
Golden query 20개
```

### 관계

대표 문서 20개에만 우선 적용:

```yaml
parent:
prerequisites:
next:
related:
```

### 고아 문서

전체 정리 대신 상위 20개 후보를 리포트한다.

### 완료 조건

```text
[ ] Golden query 20개 테스트
[ ] 대표 문서가 넓은 검색에서 우선
[ ] C++, MSI-X, container_of 검색 가능
[ ] superseded 기본 상위 노출 없음
[ ] 대표 문서가 dead end가 아님
[ ] 검색 인덱스 현재 대비 급증 없음
```

---

## Sprint 6 — 6주차: 색인과 신뢰 페이지

### 목표

검색엔진과 방문자에게 어떤 페이지가 핵심인지 명확히 한다.

### 관련 작업

```text
F-01
F-02
F-03
F-04
F-05
F-07
F-12
F-13
F-15
F-18
```

### 작업

```text
URL 유형 전수 조사
Indexability Matrix
Sitemap 정리
canonical 검증
얕은 Tag 정책
빈 페이지 제거
About
Privacy
Editorial Policy
제목·description 감사
```

### 최소 페이지

```text
About
Privacy Policy
Editorial Policy
Contact 또는 오류 제보 경로
```

### 태그 처리

먼저 다음만 한다.

```text
빈 태그 생성 중단
1~2개 문서 태그 noindex 검토
동의어 통합
핵심 태그를 Topic Hub로 연결
```

전 태그 시스템을 한 번에 재작성하지 않는다.

### 6주차 완료 조건

```text
[ ] URL 유형별 색인 정책
[ ] Sitemap에 canonical URL만 존재
[ ] Search/Admin/Draft/404 제외
[ ] 빈 Tag·Series 없음
[ ] About·Privacy·Editorial Policy 공개
[ ] 대표 20개 제목·description 감사
[ ] 내부 링크로 핵심 페이지 발견 가능
```

---

# 12주 계획: 운영 안정화와 재신청

7~12주차는 도구와 운영 안정화 단계다.

이 단계 이전에도 사이트는 이미 사용자에게 개선된 상태여야 한다.

---

## Sprint 7 — 7주차: 빌드 기준선과 명령 분리

### 관련 작업

```text
E-01
E-02
E-07
E-21
E-28
```

### 수행

```text
단계별 build 시간
Peak RSS
문서 수
코드 블록 수
언어 분포
검색 인덱스 크기
dist 크기
```

명령 분리:

```text
check
build
build:release
audit
```

### 완료 조건

```text
[ ] 상위 병목 3개 확인
[ ] 코드 블록 언어·크기 통계
[ ] 외부 링크 audit 분리
[ ] 로컬 Fast Path 존재
[ ] Node·패키지 관리자·locale 고정
```

---

## Sprint 8 — 8주차: Content Manifest와 Publication Policy 통합

### 관련 작업

```text
E-03
E-04
E-05
E-06
D-23
H-08
```

### 목표

```text
Markdown
→ Content Manifest
→ Pages/Search/Sitemap/RSS/Hub
```

### 최소 Manifest

```text
id
sourcePath
url
title
description
published
updated
lastVerified
topic
type
status
headings
internalLinks
contentHash
```

### 완료 조건

```text
[ ] metadata 다중 파싱 감소
[ ] Search·Sitemap·RSS가 같은 정책 사용
[ ] Draft 유출 불가
[ ] AST를 전체 corpus 동안 보존하지 않음
[ ] 공개 페이지 집합 비교 테스트
```

---

## Sprint 9 — 9주차: CI와 보안 기준선

### 관련 작업

```text
E-17
E-19
G-01
G-02
G-03
G-04
G-05
G-07
G-08
```

### CI 구조

```text
Validate
→ Build once
→ Dist test
→ Artifact
→ Deploy
```

### 보안

```text
관리 route production 제외
workflow permissions 명시
build와 deploy 분리
Action SHA 고정
secret inventory
step 단위 secret 전달
```

### 완료 조건

```text
[ ] full build 1회
[ ] 테스트한 artifact 그대로 배포
[ ] build job read-only
[ ] deploy job 최소 권한
[ ] production에 관리자 코드 없음
[ ] 모든 action 참조 정책 적용
```

---

## Sprint 10 — 10주차: Dist·브라우저 회귀 테스트

### 관련 작업

```text
H-09
H-10
H-11
H-12
H-14
H-15
H-18
H-22
H-23
```

### 최소 자동 테스트

```text
production build
dist 민감 파일 검사
대표 URL HTTP smoke
SEO metadata
Golden query 20개
검색 modal
모바일 overflow
secret scan
workflow lint
```

### 페이지

```text
홈
Topic Hub 2개
대표 Guide 2개
Historical 1개
검색
About
Privacy
404
```

### 완료 조건

```text
[ ] 운영과 같은 base path 테스트
[ ] 404 확인
[ ] canonical·Sitemap 일치
[ ] 검색 XSS 입력 안전
[ ] 모바일 전체 페이지 가로 overflow 없음
[ ] admin·secret artifact 없음
```

---

## Sprint 11 — 11주차: 대표 문서 10개 최종 완성

### 목표

대표 문서 20개 중 최소 10개를 재신청 가능한 품질로 완료한다.

### 리뷰

```text
기술 정확성
환경·버전
사실·추론
출처
한계
다음 경로
모바일
```

### 중복 처리

상위 중복 후보 20개 묶음 중 최소 5개를 실제로 처리한다.

```text
통합
역할 분리
Historical
Superseded
```

### 완료 조건

```text
[ ] current 대표 문서 10개 이상
[ ] Featured 8개 이상
[ ] Needs Review Featured 없음
[ ] 중복 후보 5개 이상 처리
[ ] 구판 대체 링크
[ ] 대표 글 수동 리뷰 기록
```

---

## Sprint 12 — 12주차: 최종 감사와 재신청

### 최종 감사

```text
광고 없는 레이아웃
모바일
색인 정책
Sitemap
canonical
About
Privacy
Editorial
내부 링크
검색
production dist
HTTPS
```

### AdSense 재신청 전 조건

```text
[ ] 이전 신청 이후 실질적 변경 존재
[ ] 홈 Topic-first 구조
[ ] Topic Hub 2개
[ ] current 대표 문서 10개
[ ] 색인 가능 URL 정리
[ ] 빈·Placeholder 페이지 없음
[ ] Privacy가 실제 서비스와 일치
[ ] 광고 제외 페이지 정책 준비
[ ] 운영 commit SHA 기록
```

### 재신청 후 동결

결과를 기다리는 동안 다음을 크게 바꾸지 않는다.

```text
URL
canonical
index 정책
홈 핵심 구조
Featured 목록
광고 코드
```

오류 수정과 작은 UX 수정은 계속할 수 있다.

---

# 작업 의존성 지도

## 핵심 경로

```text
상태·타입 정의
    ↓
대표 문서 선정
    ↓
Topic registry
    ↓
Topic Hub
    ↓
홈 Featured
    ↓
검색 ranking
    ↓
Sitemap·canonical
    ↓
회귀 테스트
    ↓
AdSense 재신청
```

## 병렬 진행 가능한 작업

### 트랙 A: 콘텐츠

```text
대표 문서 검증
중복 통합
About·Editorial 작성
```

### 트랙 B: 플랫폼

```text
Manifest
Publication Policy
검색
CI
```

### 트랙 C: 운영

```text
Search Console
Privacy
보안 inventory
모바일 감사
```

혼자 진행한다면 실제로는 한 번에 한 트랙만 집중하는 것이 낫다.

---

# P0 전체 목록

12주 계획에서 반드시 끝낼 P0만 다시 줄이면 다음이다.

## 콘텐츠·구조

```text
상태·타입 모델
대표 문서 20개
대표 문서 10개 current
Topic Hub 2개
홈 Topic-first 개편
```

## 검색·색인

```text
Golden query 20개
SearchDocument 정제
alias 30개
Sitemap 정리
canonical 검증
얕은·빈 페이지 제거
```

## 신뢰

```text
About
Privacy
Editorial Policy
오류 제보
```

## 빌드·보안

```text
Content Manifest
Publication Policy
build 1회
build/deploy 권한 분리
production 관리자 코드 제거
secret·dist scan
```

## 테스트

```text
schema
internal links
relations
publication set
HTTP smoke
모바일 overflow
검색 UI
workflow lint
```

---

# P1로 미뤄도 되는 작업

다음은 유용하지만 재신청과 1차 구조 개선의 핵심은 아니다.

```text
OG 완전 증분 생성
Shiki cache
지식 그래프 시각화
개인화 추천
다국어 사이트
전체 문서 relation
모든 글 lastVerified
전체 visual regression
검색 shard
A/B 테스트
고급 Analytics
```

---

# 이번 계획에서 하지 않을 것

범위가 커지는 것을 막기 위해 명시적으로 제외한다.

```text
Astro 전면 재작성
새 CMS 구축
관리자 웹 앱 강화
LLM 기반 검색
벡터 데이터베이스
모든 글 AI 재작성
모든 과거 URL 변경
모든 태그를 Topic으로 승격
모든 문서에 복잡한 metadata 강제
```

---

# 주간 작업량이 부족할 때 축소 순서

시간이 부족하면 다음 순서로 범위를 줄인다.

## 반드시 유지

```text
대표 문서
Topic Hub
홈 구조
색인 정리
About·Privacy
```

## 그다음 유지

```text
검색 baseline
canonical
Sitemap
내부 링크 검사
```

## 나중으로 이동

```text
Content Manifest 고도화
증분 빌드
Visual regression
CSP
OG 자동화
```

즉, 콘텐츠와 정보 구조를 플랫폼 최적화보다 먼저 유지한다.

---

# 2주·6주·12주 목표 요약

| 시점 | 목표 | 사용자에게 보이는 변화 |
|---|---|---|
| 2주 | 정책·대표 문서 기반 | 대표 문서 후보의 품질 향상 |
| 6주 | 홈·Hub·검색·색인 | 사이트가 지식베이스처럼 탐색됨 |
| 12주 | 빌드·보안·테스트·재신청 | 운영 안정성과 심사 준비 완성 |

---

# 최종 완료 정의

이 프로젝트는 다음 상태가 되면 1차 완료다.

```text
홈에서 전문 분야를 즉시 이해할 수 있다.
Topic Hub에서 어디서 시작할지 알 수 있다.
대표 문서의 상태와 근거를 판단할 수 있다.
검색이 구판보다 대표 문서를 먼저 찾는다.
빈·중복·얕은 페이지가 사이트 구조를 지배하지 않는다.
Sitemap과 canonical이 일관된다.
공개 사이트에 관리자 권한과 secret이 없다.
테스트한 production artifact가 그대로 배포된다.
```

# 첫 실행 순서

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

## 53. assistant

# Task 3-10. 첫 실행용 작업 티켓

이제 로드맵을 실제로 시작할 수 있도록 첫 번째 작업 묶음을 티켓 수준으로 줄인다.

이번 단계에서는 전체 12주 계획 중 **첫 1~2주에 착수할 작업만** 다룬다.

핵심 목표는 다음이다.

```text
현재 사이트를 대규모로 수정하지 않고
대표 콘텐츠와 정보 구조의 기준부터 확정한다.
```

---

# Sprint 1 목표

이번 Sprint에서 사용자 화면을 크게 바꿀 필요는 없다.

먼저 다음 기반을 만든다.

```text
사이트 목적
콘텐츠 상태
콘텐츠 타입
핵심 Topic
대표 문서 후보
최소 검증 규칙
```

---

# Ticket S1-01. 사이트 목적 선언

## 목적

기능·테마·콘텐츠 작업의 우선순위 기준을 고정한다.

## 추가할 문구

```text
이 저장소의 1차 목적은 Hawk의 시스템 엔지니어링
기술 지식베이스를 운영하는 것이다.

범용 테마 기능과 관리 도구는 실제 독자의 콘텐츠 탐색,
기술 문서의 신뢰성 또는 운영 비용 절감에 기여할 때만 유지한다.
```

## 수정 위치 후보

```text
README.md
docs/architecture.md
docs/editorial-principles.md
```

처음에는 README 한 곳이면 충분하다.

## 완료 조건

```text
[ ] 저장소의 1차 목적이 한 문장으로 정의됨
[ ] 개인 블로그와 범용 테마의 우선순위가 구분됨
[ ] 신규 기능 판단 질문 3개가 기록됨
```

## 기능 판단 질문

```text
독자가 필요한 글을 더 쉽게 찾는가?
기술 문서의 신뢰성을 높이는가?
반복되는 운영 비용을 실제로 줄이는가?
```

셋 모두 아니라면 보류한다.

## 예상 작업량

```text
30분 이하
```

---

# Ticket S1-02. 콘텐츠 상태 enum 정의

## 목적

오래된 글과 대표 글을 같은 방식으로 노출하지 않게 한다.

## 상태

```ts
export const CONTENT_STATUS = [
  "current",
  "needs-review",
  "historical",
  "superseded",
  "archived",
] as const;

export type ContentStatus =
  (typeof CONTENT_STATUS)[number];
```

## 의미

```text
current
현재도 유효하며 적극적으로 노출할 수 있음

needs-review
내용이나 환경을 다시 확인해야 함

historical
특정 과거 버전이나 당시 기록으로 가치가 있음

superseded
더 나은 신판 또는 통합 문서가 존재함

archived
보존하지만 일반 탐색에서는 제외함
```

## 기본값

기존 모든 글을 자동으로 `current`로 지정하면 안 된다.

초기 migration에서는 다음 중 하나를 선택한다.

### 안전한 방법

```text
기존 글의 기본 상태는 needs-review
대표 문서만 수동으로 current 전환
```

### 호환성 중심 방법

```text
상태가 없는 기존 글은 legacy-default로 처리
UI에서는 일반 글처럼 표시
Featured와 Hub에는 명시적으로 current인 글만 허용
```

두 번째 방식이 기존 사이트를 덜 깨뜨린다.

## 완료 조건

```text
[ ] 상태 enum 구현
[ ] 각 상태 정의 문서화
[ ] Featured는 current만 허용
[ ] 상태 없는 기존 글의 처리 규칙 확정
```

## 예상 작업량

```text
1~2시간
```

---

# Ticket S1-03. 콘텐츠 타입 enum 정의

## 목적

모든 글을 동일한 일반 게시물로 취급하지 않게 한다.

## 타입

```ts
export const CONTENT_TYPES = [
  "guide",
  "concept",
  "debug-note",
  "experiment",
  "source-walkthrough",
  "reference",
] as const;

export type ContentType =
  (typeof CONTENT_TYPES)[number];
```

## 타입 판단 질문

### Guide

```text
전체 흐름과 학습 경로를 설명하는가?
```

### Concept

```text
특정 원리나 메커니즘 하나를 설명하는가?
```

### Debug Note

```text
실제 증상과 원인 추적 과정이 중심인가?
```

### Experiment

```text
가설·환경·방법·결과가 중심인가?
```

### Source Walkthrough

```text
특정 소스코드의 호출·자료구조 흐름이 중심인가?
```

### Reference

```text
빠르게 다시 찾기 위한 표·명령·필드 정리인가?
```

## 피해야 할 기본 타입

```text
article
post
note
```

이들은 너무 넓어서 구조 개선에 거의 도움이 되지 않는다.

## 완료 조건

```text
[ ] 타입 enum 구현
[ ] 타입별 한 문장 정의
[ ] 대표 글 분류에 실제 적용 가능
[ ] 모든 기존 글에 즉시 강제하지 않음
```

## 예상 작업량

```text
1시간
```

---

# Ticket S1-04. Topic Registry 생성

## 목적

글마다 자유 문자열로 Topic을 작성해 표기가 분열되는 것을 막는다.

## 초기 Topic

```ts
export const TOPICS = {
  cpp: {
    id: "cpp",
    title: "C++",
    href: "/topics/cpp/",
  },

  linuxSystems: {
    id: "linux-systems",
    title: "Linux & Systems",
    href: "/topics/linux-systems/",
  },

  firmwareBootloader: {
    id: "firmware-bootloader",
    title: "Firmware & Bootloader",
    href: "/topics/firmware-bootloader/",
  },

  gpuCuda: {
    id: "gpu-cuda",
    title: "GPU & CUDA",
    href: "/topics/gpu-cuda/",
  },

  pcieCxl: {
    id: "pcie-cxl",
    title: "PCIe & CXL",
    href: "/topics/pcie-cxl/",
  },
} as const;
```

## FPGA 처리

초기에는 별도 최상위 Topic으로 바로 만들지 않아도 된다.

다음 문서 분포를 먼저 본다.

```text
FPGA architecture
FPGA firmware
PCIe FPGA device
Vitis/XRT
영상 코덱 가속기
```

FPGA가 독립된 학습 경로를 충분히 가진다면 후속 Topic으로 분리한다.

## Registry 원칙

```text
ID는 안정적인 영문 slug
표시 제목은 별도
URL도 registry에서 관리
글 front matter에는 ID만 사용
```

## 완료 조건

```text
[ ] 초기 Topic 5개
[ ] ID·표시명·URL 분리
[ ] 잘못된 Topic ID validation 가능
[ ] Topic 이름을 글마다 직접 입력하지 않음
```

## 예상 작업량

```text
1~2시간
```

---

# Ticket S1-05. 최소 Front Matter Schema 추가

## 목적

대표 문서부터 구조화된 정보를 적용한다.

## 권장 필드

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

## 필수 적용 범위

초기에는 다음에만 강제한다.

```text
홈 Featured 문서
Topic Hub Start Here 문서
대표 문서 20개
```

나머지 기존 글에는 즉시 강제하지 않는다.

## 중요한 규칙

```text
updated
문서 내용이 수정된 날짜

lastVerified
기술 내용을 실제로 다시 확인한 날짜
```

둘을 자동으로 같이 변경하지 않는다.

## 완료 조건

```text
[ ] type/topic/status schema 존재
[ ] 날짜는 ISO 형식
[ ] lastVerified는 선택 필드
[ ] 대표 문서에서만 우선 강제
[ ] 기존 콘텐츠 build 호환성 유지
```

## 예상 작업량

```text
2~4시간
```

---

# Ticket S1-06. Featured 불변조건 검사

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

# Ticket S1-07. 대표 문서 후보 20개 선정

## 목적

전체 사이트에서 우선 보완하고 연결할 핵심 문서를 정한다.

## 권장 배분

| Topic | 후보 수 |
|---|---:|
| PCIe & CXL | 5 |
| Firmware & Bootloader | 4 |
| C++ | 4 |
| GPU & CUDA | 4 |
| Linux & Systems | 3 |

정확히 맞출 필요는 없다.

## 선정 기준

각 후보는 다음 중 최소 세 가지를 만족해야 한다.

```text
직접 경험이나 실험이 있음
다른 글의 선행 개념임
현재도 검색 가치가 있음
사이트 전문성을 잘 보여줌
다른 자료에서 보기 어려운 분석이 있음
향후 Topic Hub의 진입점이 될 수 있음
```

## 제외 후보

```text
최근에 썼다는 이유만으로 선정
일반 공식 문서 요약
검증 상태를 판단하기 어려움
동일 검색 의도의 더 강한 글이 있음
지나치게 개인적인 메모
```

## 결과 파일 예

```yaml
representativeArticles:
  - id: pcie-bar-sizing
    topic: pcie-cxl
    expectedType: concept
    currentStatus: needs-review
    reason: 여러 PCIe 글의 선행 개념
    remediation: 환경·소스 버전 보완

  - id: cuda-pinned-memory
    topic: gpu-cuda
    expectedType: experiment
    currentStatus: current
    reason: 직접 실험과 측정 포함
    remediation: baseline 표 보완
```

## 완료 조건

```text
[ ] 후보 20개
[ ] 각 문서의 선정 이유
[ ] 예상 type/topic
[ ] 현재 상태
[ ] 필요한 보완 작업
```

## 예상 작업량

```text
2~4시간
```

---

# Ticket S1-08. 대표 문서 감사표 작성

## 권장 표

| ID | Topic | Type | Status | 고유 가치 | 중복 | 환경 필요 | 보완량 |
|---|---|---|---|---|---|---|---|
| pcie-bar-sizing | PCIe & CXL | Concept | Needs Review | 선행 개념 | 있음 | 예 | 중간 |
| cuda-pinned-memory | GPU & CUDA | Experiment | Current | 직접 측정 | 낮음 | 예 | 낮음 |

## 보완량

```text
낮음
metadata와 링크 정도

중간
환경·결론·구조 보완

높음
재검증·실험·출처 보강

통합 검토
다른 글과 검색 의도 중복
```

## Featured 후보 표시

```text
Ready
Needs Minor Work
Needs Verification
Not Suitable
```

## 완료 조건

```text
[ ] 20개 전체 감사
[ ] 바로 Featured 가능한 문서 확인
[ ] 중복 후보 확인
[ ] 높은 보완 비용 문서를 초기 작업에서 제외
```

## 예상 작업량

```text
3~5시간
```

---

# Ticket S1-09. 첫 대표 문서 5개 보완

## 목적

홈과 Topic Hub에서 실제로 사용할 수 있는 문서를 확보한다.

## 선택 조건

```text
보완량이 낮거나 중간
서로 다른 Topic을 대표
구판 가능성이 낮음
실제 경험이나 분석이 있음
```

## 각 문서 작업

### 1. 제목

한 가지 질문에 집중한다.

### 2. Description

제목을 반복하지 않고 범위와 결과를 설명한다.

### 3. Metadata

```yaml
type:
topic:
status:
updated:
lastVerified:
```

### 4. 환경·버전

필요한 글만 추가한다.

### 5. 근거 구분

```text
확인된 사실
직접 관찰
해석
가설
```

### 6. 한계

확인하지 않은 조건을 명시한다.

### 7. 다음 경로

```text
상위 Topic
필요한 선행 글
다음에 읽을 글
관련 실전 사례
```

## 완료 조건

```text
[ ] 5개 모두 status=current
[ ] 기술적으로 다시 읽고 확인
[ ] description 고유
[ ] Topic과 Type 지정
[ ] 범위·한계 표시
[ ] 다음 문서 연결
```

## 예상 작업량

문서당:

```text
1~3시간
```

전체:

```text
5~15시간
```

---

# Ticket S1-10. 명백한 구판 노출 차단

## 목적

전체 구판 정리를 기다리지 않고 눈에 띄는 잘못된 노출부터 막는다.

## 먼저 찾을 것

```text
오래된 CUDA·Linux·프레임워크 버전
이미 대체 글이 있는 글
깨진 명령이나 설정을 포함한 글
홈·검색에서 상위에 노출되는 과거 메모
```

## 처리

### 과거 환경 자체가 가치 있음

```yaml
status: historical
```

### 재검토가 필요함

```yaml
status: needs-review
```

### 신판이 존재함

```yaml
status: superseded
supersededBy: new-document-id
```

## 1차 노출 정책

```text
Featured 제외
Topic Start Here 제외
관련 글 추천 제외
일반 검색 ranking 감점
```

## 완료 조건

```text
[ ] 명백한 구판 최소 10개 확인
[ ] 상태 지정
[ ] Featured·Start Here 노출 차단
[ ] 신판이 있으면 직접 링크
```

## 예상 작업량

```text
2~4시간
```

---

# Sprint 1 권장 실행 순서

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

# 커밋 분리 권장안

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

# 첫 Sprint에서 만들지 않을 것

```text
홈 전체 redesign
Topic Hub 공통 컴포넌트
검색 알고리즘 교체
지식 그래프
증분 빌드
전체 metadata migration
모든 구판 검증
```

먼저 정책과 대표 문서가 실제로 동작하는지 확인한다.

---

# Sprint 1 완료 정의

다음 상태가 되면 첫 Sprint는 완료다.

```text
사이트가 무엇을 위한 저장소인지 명확하다.
글의 상태와 역할을 표현할 수 있다.
핵심 Topic 5개가 고정됐다.
대표 문서 후보 20개가 선정됐다.
그중 5개가 검증된 current 문서다.
구판이 Featured 경로에 들어올 수 없다.
```

---

# Sprint 2 진입 조건

다음 조건을 충족한 뒤 Topic Hub와 홈 개편으로 넘어간다.

```text
[ ] 대표 문서 5개 current
[ ] PCIe & CXL 대표 후보 최소 3개
[ ] Firmware & Bootloader 대표 후보 최소 3개
[ ] Topic registry 안정화
[ ] Featured validation 작동
[ ] 기존 콘텐츠 build가 깨지지 않음
```

다음 단계는 **Task 3-11. PCIe & CXL Hub 실제 콘텐츠 설계안**이다. Hub에 들어갈 소개 문구, Start Here, Core Concepts, Featured, Debug & Experiments 섹션을 실제 카피와 데이터 구조 수준으로 작성한다.

## 54. assistant

# Task 3-11. `PCIe & CXL` Hub 실제 콘텐츠 설계안

이번 단계에서는 `PCIe & CXL` Topic Hub를 실제 페이지로 구현할 수 있는 수준까지 구체화한다.

다만 현재 대화에서는 `hawk90.github.io`의 전체 글 목록과 정확한 URL을 직접 확인한 상태가 아니므로, 아래 문서 ID와 제목은 **역할 기준 설계안**이다. 실제 구현할 때 기존 글과 매핑해야 한다.

핵심 목표는 다음이다.

```text
PCIe와 CXL 글을 한곳에 모으는 것
≠
독자가 현재 위치와 다음 학습 단계를 이해하게 하는 것
```

---

# 1. Hub의 독자와 핵심 질문

## 주요 독자

```text
PCIe 드라이버를 처음 다루는 개발자
FPGA·가속기 장치를 Host에서 제어하는 개발자
BAR·MSI-X·DMA 문제를 디버깅하는 개발자
CXL 메모리 구조를 Linux까지 연결해 이해하려는 개발자
Firmware와 OS의 장치 초기화 경계를 알고 싶은 개발자
```

## Hub가 답해야 할 질문

```text
PCIe 장치는 어떻게 발견되는가?
BAR는 어떻게 크기가 결정되고 주소를 할당받는가?
Host는 BAR와 DMA를 통해 장치에 어떻게 접근하는가?
MSI와 MSI-X는 어떤 흐름으로 전달되는가?
IOMMU는 DMA 주소를 어떻게 바꾸는가?
CXL은 PCIe 위에 무엇을 추가하는가?
CXL 메모리는 HPA에서 DPA까지 어떻게 연결되는가?
Firmware와 Linux는 이 장치를 어떻게 넘겨받는가?
```

---

# 2. 페이지 기본 Metadata

## 권장 URL

```text
/topics/pcie-cxl/
```

## `<title>`

```text
PCIe & CXL — 장치 초기화, BAR, DMA와 메모리 주소 변환
```

너무 길다면:

```text
PCIe & CXL | Hawk Systems Knowledge Base
```

## Meta description

```text
PCIe 장치 열거와 Configuration Space, BAR·MMIO, MSI-X, DMA·IOMMU부터 CXL HDM Decoder와 Linux 메모리 통합까지 시스템 흐름 중심으로 설명합니다.
```

## Topic registry

```ts
{
  id: "pcie-cxl",
  title: "PCIe & CXL",
  shortTitle: "PCIe & CXL",
  description:
    "PCIe 장치 초기화와 데이터 이동부터 CXL 메모리 주소 변환과 운영체제 통합까지 다룹니다.",
  href: "/topics/pcie-cxl/",
}
```

---

# 3. 페이지 전체 정보 구조

초기 버전은 다음 정도면 충분하다.

```text
Topic Hero
Start Here
System Flow
Core Concepts
Featured Guides
Debug & Experiments
Related Topics
All PCIe & CXL Articles
```

`Recently Updated`는 문서 수가 충분하고 업데이트 정책이 안정된 뒤 추가한다.

---

# 4. Topic Hero

## Eyebrow

```text
SYSTEM INTERCONNECTS
```

영어 Eyebrow가 사이트 전체 문체와 맞지 않으면 생략해도 된다.

## H1

```text
PCIe & CXL
```

## 소개 문구

```text
PCIe 장치가 발견되고 주소와 인터럽트를 할당받는 과정부터, DMA를 통해 데이터를 이동하고 CXL 메모리가 호스트 주소 공간에 연결되는 과정까지 정리합니다.

단순한 규격 요약보다 Firmware, Linux 커널, Device Driver와 실제 하드웨어가 만나는 경계를 중심으로 설명합니다.
```

## 보조 정보

```text
Configuration Space · BAR & MMIO · MSI-X · DMA & IOMMU · CXL Memory
```

이를 태그 배지처럼 지나치게 강조하지 않고 일반 텍스트나 짧은 목록으로 표시한다.

## CTA

```text
처음부터 시작하기
핵심 개념 보기
디버깅 사례 보기
```

실제 앵커:

```text
#start-here
#core-concepts
#debug-experiments
```

---

# 5. Start Here

이 영역은 정확히 3개 문서로 제한한다.

## 5.1 전체 구조 입문

### 역할

PCIe 장치가 사용 가능해지는 전체 순서를 설명하는 대표 Guide.

### 권장 제목

```text
PCIe 장치는 어떻게 발견되고 사용할 수 있게 되는가
```

### 카드 설명

```text
Link 초기화부터 Configuration Space 탐색, BAR 주소 할당, Driver binding, 인터럽트와 DMA 준비까지 전체 흐름을 먼저 살펴봅니다.
```

### 기대 콘텐츠 타입

```yaml
type: guide
topic: pcie-cxl
status: current
```

### 포함해야 할 흐름

```text
Power-on·Reset
→ Link Training
→ Enumeration
→ Configuration Space
→ BAR Size Probing
→ Resource Allocation
→ Driver Binding
→ MSI-X
→ DMA
```

---

## 5.2 BAR와 MMIO 핵심 Concept

### 권장 제목

```text
PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가
```

### 카드 설명

```text
BAR 레지스터의 비트 구조, all-ones 기반 크기 탐색, 32·64비트 BAR와 Host MMIO 주소 할당 과정을 설명합니다.
```

### 역할

대부분의 PCIe 제어·디버깅 글이 의존하는 선행 Concept.

### 연결할 후속 글

```text
Linux PCI resource 등록
Userspace BAR mmap
장치 내부 메모리 초기화
```

---

## 5.3 CXL 메모리 전체 Guide

### 권장 제목

```text
CXL 메모리는 호스트 주소 공간에 어떻게 연결되는가
```

### 카드 설명

```text
호스트 물리 주소에서 HDM Decoder와 장치 물리 주소를 거쳐 실제 CXL 메모리에 도달하는 과정을 Firmware와 Linux 관점에서 연결합니다.
```

### 포함할 흐름

```text
HPA
→ Host Bridge Decoder
→ Switch Decoder
→ Endpoint HDM Decoder
→ DPA
→ Device Media
```

그리고:

```text
Firmware Tables
→ Linux CXL Driver
→ Region
→ Memory Device
→ NUMA·Memory Tier
```

---

# 6. System Flow

이 Hub의 차별점으로, 카드 목록보다 먼저 **전체 시스템 흐름**을 보여준다.

## 섹션 제목

```text
Host에서 장치와 메모리까지
```

## 설명

```text
PCIe와 CXL 문제는 하나의 레지스터나 드라이버 함수만 봐서는 이해하기 어렵습니다. 아래 흐름은 Firmware, 운영체제, Driver와 장치가 어떤 순서로 연결되는지를 보여줍니다.
```

## 권장 흐름도

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

# 7. Core Concepts

Core Concepts는 6개가 적당하다.

---

## 7.1 Enumeration & Configuration Space

### 설명

```text
Root Complex와 운영체제가 Bus·Device·Function을 탐색하고, Vendor ID와 Capability를 읽어 장치의 기능을 파악하는 과정입니다.
```

### 대표 글 후보

```text
PCIe Configuration Space 구조
Linux PCI enumeration 호출 흐름
ECAM과 Legacy Configuration Access
Capability List와 Extended Capability
```

### 권장 대표 문서

```text
PCIe Configuration Space에서 운영체제는 무엇을 읽는가
```

### 하위 키워드

```text
BDF
ECAM
Vendor ID
Device ID
Class Code
Capabilities
```

---

## 7.2 BAR & MMIO

### 설명

```text
장치가 요구하는 MMIO 공간의 크기를 파악하고, Firmware와 운영체제가 Host 주소 공간을 배치한 뒤 Driver가 이를 매핑하는 과정입니다.
```

### 대표 글 후보

```text
BAR Size Probing
32-bit와 64-bit BAR
Prefetchable BAR
Linux resource 구조
Userspace mmap
```

### 디버깅 질문

```text
BAR가 0으로 보이는 이유는?
lspci에는 보이는데 mmap이 실패하는 이유는?
BAR 접근은 되는데 유효한 값이 나오지 않는 이유는?
```

---

## 7.3 Interrupts

### 설명

```text
Legacy INTx에서 MSI와 MSI-X로 이어지는 인터럽트 전달 방식과 Vector Table, Linux IRQ 등록 흐름을 다룹니다.
```

### 대표 글 후보

```text
MSI와 MSI-X 차이
MSI-X Table과 PBA
Linux pci_alloc_irq_vectors()
FPGA 장치의 MSI-X 설계
Interrupt가 지원되지 않을 때의 polling
```

### 중요한 경계

```text
장치가 MSI-X capability를 제공하는 것
≠
특정 Runtime API가 사용자 콜백을 제공하는 것
```

---

## 7.4 DMA & IOMMU

### 설명

```text
장치가 Host 메모리를 읽고 쓰기 위해 사용하는 DMA 주소와, IOMMU가 CPU 주소와 Device-visible 주소 사이를 변환하는 방식을 설명합니다.
```

### 대표 글 후보

```text
Physical Address와 DMA Address
Coherent와 Streaming DMA
IOMMU Mapping
Scatter-Gather
64-bit DMA Address
Alignment와 Cache Coherency
```

### 실전 연결

```text
FPGA H2D·D2H
Queue Descriptor
NVMe-style SQ·CQ
VFIO Passthrough
```

---

## 7.5 CXL Address Translation

### 설명

```text
CXL.mem 요청이 Host Physical Address에서 장치의 Device Physical Address로 변환되는 Decoder 계층을 다룹니다.
```

### 대표 글 후보

```text
HDM Decoder
HPA와 DPA
Interleave
CXL Region
Switch Decoder
Type 3 Memory Device
```

### 핵심 오해

```text
PCIe BAR에 매핑된 공간
≠
CXL.mem으로 접근하는 장치 메모리 전체
```

이 구분은 별도 Callout으로 강조할 가치가 있다.

---

## 7.6 Firmware & Linux Integration

### 설명

```text
Firmware가 구성한 PCIe·CXL 토폴로지와 주소 정보를 ACPI 등의 인터페이스로 운영체제에 전달하고, Linux가 이를 Device와 Memory Resource로 등록하는 과정입니다.
```

### 대표 글 후보

```text
ACPI MCFG
ACPI CEDT
UEFI PCI Bus Driver
Linux PCI Core
Linux CXL Subsystem
NUMA Node
Memory Tiering
```

### 관련 Topic

```text
Firmware & Bootloader
Linux & Systems
```

---

# 8. Featured Guides

초기 Featured는 4~6개로 제한한다.

## 권장 역할 구성

| 순서 | 역할 | 권장 문서 |
|---:|---|---|
| 1 | 전체 Guide | PCIe 장치 초기화 전체 흐름 |
| 2 | 핵심 Concept | BAR 크기 탐색과 주소 할당 |
| 3 | Source Walkthrough | Linux PCI enumeration |
| 4 | 핵심 Concept | MSI-X 설정 흐름 |
| 5 | CXL Guide | CXL 메모리 주소 변환 |
| 6 | 실전 Debug | FPGA BAR 접근 실패 분석 |

## Featured 카드에 표시할 것

```text
Content Type
제목
한 문장 설명
주요 범위
```

예:

```text
SOURCE WALKTHROUGH

Linux는 PCIe 장치를 어떤 함수 흐름으로 열거하는가

PCI bus scan에서 pci_dev 생성과 resource 등록까지 Linux PCI Core의 핵심 호출 흐름을 추적합니다.
```

## 표시하지 않아도 되는 것

```text
태그 전체
조회 수
읽기 시간
댓글 수
```

Featured의 목적은 인기 경쟁이 아니라 대표성이다.

---

# 9. Debug & Experiments

이 영역은 단순한 하위 목록이 아니라 `hawk90.github.io`만의 실전성을 보여줘야 한다.

## 섹션 소개

```text
규격상 가능한 것과 실제 하드웨어·Runtime에서 사용할 수 있는 것은 다를 수 있습니다. 장치 초기화, BAR 접근, 인터럽트와 DMA 문제를 실제 로그와 실험 과정으로 정리합니다.
```

## 권장 하위 분류

```text
BAR & MMIO Failures
Interrupt Limitations
DMA & VFIO
CXL Enumeration
```

---

## 9.1 BAR & MMIO Failures

### 사례 후보

```text
BAR는 보이지만 유효한 데이터가 나오지 않는 경우
장치 내부 DDR 초기화 전에 BAR를 접근한 경우
64-bit BAR 주소 계산 오류
Userspace mmap 실패
Firmware와 Linux resource 불일치
```

### 카드 설명 예

```text
BAR 매핑은 성공했지만 장치 내부 메모리 컨트롤러가 활성화되지 않아 유효한 값을 읽지 못한 사례를 분석합니다.
```

단, 확인되지 않은 원인은 가설로 명확히 표시한다.

---

## 9.2 Interrupt Limitations

### 사례 후보

```text
XRT 환경에서 사용자 ISR callback을 사용할 수 없는 경우
MSI-X capability는 있으나 Runtime API가 노출하지 않는 경우
Polling·epoll 대안 검토
DONE과 ERROR vector 분리
```

### 대표 질문

```text
하드웨어 인터럽트 지원과 사용자 공간 API 지원은 왜 다른가?
```

---

## 9.3 DMA & VFIO

### 사례 후보

```text
QEMU VFIO PCIe Passthrough
BAR mmap과 DMA의 차이
IOMMU ON·OFF
Guest Physical Address와 IOVA
DMA Descriptor 계약
```

### 대표 실험

```text
QEMU Fake Device로 BAR·MSI-X·DMA 계약 검증하기
```

이 문서는 미래 대표 Experiment 후보가 될 수 있다.

---

## 9.4 CXL Enumeration

### 사례 후보

```text
CXL Type 3 장치가 Linux에서 보이지 않는 경우
HDM Decoder가 구성되지 않은 경우
Region 생성 실패
NUMA node로 노출되지 않는 경우
```

실제 CXL 장비 실험이 없다면 일반 문제 해결법을 실제 경험처럼 작성하지 않는다. 소스 분석과 예상 디버깅 절차를 명확히 구분한다.

---

# 10. Recommended Learning Paths

독자의 목적별로 3개 경로를 제공한다.

---

## 경로 A. PCIe Driver 입문

```text
PCIe 장치 전체 초기화 흐름
→ Configuration Space
→ BAR & MMIO
→ MSI-X
→ DMA API
```

### 설명

```text
Linux Driver에서 장치를 발견하고 레지스터를 매핑한 뒤 인터럽트와 DMA를 준비하려는 독자를 위한 순서입니다.
```

---

## 경로 B. FPGA·가속기 제어

```text
BAR와 Device Register
→ DMA Descriptor
→ MSI-X
→ VFIO·Passthrough
→ Queue Architecture
```

### 설명

```text
FPGA 또는 가속기 IP를 Host Software와 연결하고, Queue·DMA·Interrupt 계약을 설계하려는 독자를 위한 경로입니다.
```

---

## 경로 C. CXL 메모리

```text
PCIe Enumeration
→ CXL Component Model
→ HDM Decoder
→ CXL Region
→ Linux Memory·NUMA
```

### 설명

```text
CXL Type 3 장치가 호스트의 메모리 자원으로 노출되는 전체 과정을 이해하려는 독자를 위한 순서입니다.
```

---

# 11. Related Topics

## Firmware & Bootloader

```text
Root Complex 초기화, UEFI PCI Bus Driver, ACPI Table과 운영체제 handoff를 더 깊게 다룹니다.
```

## Linux & Systems

```text
PCI Core, IRQ, DMA API, IOMMU, NUMA와 Memory Management를 운영체제 내부 구조로 연결합니다.
```

## GPU & CUDA

```text
PCIe 전송 비용, Pinned Memory, Unified Memory와 GPU DMA 동작을 성능 관점에서 다룹니다.
```

## FPGA

향후 독립 Hub가 생기면:

```text
Vitis·XRT, FPGA BAR, DMA IP와 Host Runtime 통합을 다룹니다.
```

초기에는 별도 Hub가 없으면 `Firmware & Bootloader` 또는 관련 글 묶음으로 연결한다.

---

# 12. All Articles

이 영역은 자동 생성해도 된다.

## 기본 필터

```text
topic === "pcie-cxl"
status !== "archived"
status !== "superseded"
```

Historical은 별도 그룹으로 분리한다.

## 그룹

```text
Guides & Concepts
Source Walkthroughs
Debug Notes
Experiments
References
Historical
```

## 정렬

### 일반 그룹

```text
수동 우선순위
→ updated 내림차순
```

### Historical

```text
대상 버전 또는 게시일 내림차순
```

단순 전체 최신순 하나로 섞지 않는다.

---

# 13. Hub Config 데이터 구조

초기에는 TypeScript config 정도면 충분하다.

```ts
interface TopicHubConfig {
  id: string;
  title: string;
  description: string;

  startHere: string[];
  featured: string[];

  concepts: Array<{
    id: string;
    title: string;
    description: string;
    representativeArticle?: string;
    articles?: string[];
  }>;

  learningPaths: Array<{
    id: string;
    title: string;
    description: string;
    articles: string[];
  }>;

  debugSections: Array<{
    id: string;
    title: string;
    description: string;
    articles: string[];
  }>;

  relatedTopics: string[];
}
```

예시:

```ts
export const PCIE_CXL_HUB: TopicHubConfig = {
  id: "pcie-cxl",
  title: "PCIe & CXL",
  description:
    "PCIe 장치 초기화와 데이터 이동부터 CXL 메모리 주소 변환과 Linux 통합까지 다룹니다.",

  startHere: [
    "pcie-device-initialization",
    "pcie-bar-sizing",
    "cxl-memory-address-translation",
  ],

  featured: [
    "pcie-device-initialization",
    "pcie-bar-sizing",
    "linux-pci-enumeration",
    "pcie-msix",
    "cxl-memory-address-translation",
  ],

  concepts: [
    {
      id: "enumeration",
      title: "Enumeration & Configuration Space",
      description:
        "BDF 탐색과 Configuration Space를 통해 운영체제가 장치를 발견하는 과정입니다.",
      representativeArticle: "pcie-configuration-space",
    },
  ],

  learningPaths: [
    {
      id: "driver",
      title: "PCIe Driver 입문",
      description:
        "장치 발견부터 MMIO, 인터럽트와 DMA까지 Driver 개발 순서로 살펴봅니다.",
      articles: [
        "pcie-device-initialization",
        "pcie-configuration-space",
        "pcie-bar-sizing",
        "pcie-msix",
        "linux-dma-api",
      ],
    },
  ],

  debugSections: [],
  relatedTopics: [
    "firmware-bootloader",
    "linux-systems",
    "gpu-cuda",
  ],
};
```

실제 존재하지 않는 ID를 그대로 사용하지 말고 기존 글 ID와 대응시킨다.

---

# 14. Hub Validation 규칙

## 필수 규칙

```text
Hub title 존재
description 존재
Start Here 1~3개
Featured 3~6개
모든 문서 ID 존재
모든 Featured status=current
중복 ID 없음
관련 Topic 최소 1개
```

## 권장 Warning

```text
Start Here 세 문서가 모두 같은 Content Type
Featured가 한 세부 주제에 편중
Debug & Experiments가 비어 있음
대표 Concept에 연결 문서 없음
```

Warning만으로 초기 공개를 막지는 않는다.

## 예시 오류

```text
ERROR [hub/featured-status]

Topic: pcie-cxl
Article: old-xrt-interrupt-note
Status: historical

Historical documents cannot be featured.
```

---

# 15. 컴포넌트 구조

권장 구조:

```text
TopicHubLayout
├── TopicHero
├── StartHereList
├── SystemFlow
├── ConceptGrid
├── FeaturedGuideList
├── LearningPathList
├── DebugSection
├── RelatedTopicList
└── ArticleArchive
```

## 피해야 할 것

```text
PCIeHubCard
CXLHubCard
BARHubCard
MSIXHubCard
```

각 Topic 전용 컴포넌트를 계속 추가하지 않는다.

## 카드 유형

3개 정도면 충분하다.

```text
StartHereCard
ContentCard
ConceptEntry
```

Learning Path는 카드보다 순서 있는 목록이 더 적합하다.

---

# 16. 모바일 구조

모바일에서는 섹션 순서를 다음처럼 유지한다.

```text
Hero
Start Here
System Flow 요약
Core Concepts
Featured
Learning Paths
Debug
Related Topics
All Articles
```

## 모바일 규칙

```text
Start Here 한 열
Concept 한 열
Featured 한 열
System Flow는 세로 흐름
긴 영어 identifier 줄바꿈
목차는 별도 drawer보다 페이지 내 앵커 우선
```

그래프를 축소해 억지로 보여주기보다 세로 단계 목록으로 전환한다.

---

# 17. 접근성

## Heading

```text
H1: PCIe & CXL
H2: Start Here
H2: System Flow
H2: Core Concepts
H3: BAR & MMIO
```

계층을 카드 디자인 때문에 건너뛰지 않는다.

## Learning Path

순서가 중요하므로 `<ol>`을 사용한다.

## Core Concepts

순서가 중요하지 않으므로 `<ul>` 또는 의미 있는 section 구조를 사용한다.

## System Flow

SVG만으로 정보를 제공하지 않고 같은 내용을 텍스트로도 제공한다.

## 카드 링크

중첩 링크를 피하고 카드 전체를 하나의 명확한 링크로 구성한다.

---

# 18. SEO와 색인

## Hub 색인 조건

다음이 실제로 준비된 뒤 indexable로 공개한다.

```text
고유한 소개
Start Here
Featured
Core Concept 설명
실제 연결 문서
```

글 목록만 존재하는 초기 페이지라면 공개를 늦추거나 임시 `noindex`를 적용한다.

## Canonical

```text
https://hawk90.github.io/topics/pcie-cxl/
```

실제 운영 도메인에 맞춘다.

## 구조화 데이터

초기에는 `CollectionPage` 또는 일반 `WebPage`를 고려할 수 있다.

화면에 없는 강의 과정이나 교육 인증 정보를 구조화 데이터에 넣지 않는다.

---

# 19. 기존 글 매핑 작업표

실제 구현 전 다음 표를 작성한다.

| 기존 문서 | 현재 URL | 역할 | 상태 | Hub 섹션 | 조치 |
|---|---|---|---|---|---|
| 문서 A | `/.../` | Concept | Current | BAR & MMIO | Featured 후보 |
| 문서 B | `/.../` | Debug Note | Needs Review | BAR Failures | 환경 보완 |
| 문서 C | `/.../` | Reference | Historical | Historical | 상태 배너 |
| 문서 D | `/.../` | 중복 후보 | Superseded | 제외 | 신판 연결 |

## 조치 값

```text
그대로 사용
제목·description 보완
환경 검증
다른 글과 통합
Historical
Superseded
신규 대표 Guide 필요
```

---

# 20. 신규로 작성할 가능성이 높은 문서

기존 글을 매핑했을 때 다음 역할이 비어 있다면 신규 작성한다.

## 최우선

```text
PCIe 장치 전체 초기화 흐름 Guide
```

개별 BAR·MSI-X·DMA 글을 연결하는 상위 문서가 없다면 가장 먼저 필요하다.

## 두 번째

```text
CXL 메모리 주소 변환 전체 Guide
```

HDM Decoder, Region, Linux NUMA 글이 분리돼 있다면 상위 지도가 필요하다.

## 세 번째

```text
PCIe·CXL 용어와 주소 공간 Reference
```

다음 용어를 짧게 비교한다.

```text
CPU Virtual Address
Host Physical Address
Bus Address
DMA Address
IOVA
BAR Address
Device Physical Address
```

이 글은 여러 문서의 반복 설명을 줄이는 기반 Reference가 된다.

---

# 21. Hub 초기 공개 최소 조건

전체 문서가 완벽하지 않아도 다음이 충족되면 공개 가능하다.

```text
Start Here 3개
Featured 4개
Core Concepts 6개
Debug 사례 2개 이상
Learning Path 2개 이상
Related Topics 2개 이상
```

다만 모든 Featured는 `current`여야 한다.

---

# 22. 첫 구현 티켓

## Ticket PCH-01. 기존 글 매핑

```text
PCIe·CXL 관련 기존 문서 전수 목록
Primary role 지정
상태 지정
Hub section 지정
중복 후보 표시
```

## Ticket PCH-02. Start Here 확정

```text
전체 Guide
BAR Concept
CXL Memory Guide
```

각 문서가 없다면 신규 작성 여부 결정.

## Ticket PCH-03. Hub Config 작성

```text
Topic metadata
Start Here
Featured
Concepts
Learning Paths
Debug Sections
Related Topics
```

## Ticket PCH-04. 공통 Hub Layout 적용

정적 HTML로 먼저 구현한다.

## Ticket PCH-05. Validation 추가

```text
문서 존재
Featured current
중복 없음
Start Here 최대 3개
```

## Ticket PCH-06. 모바일·링크 검사

```text
360px
키보드
Heading 계층
내부 링크
canonical
```

---

# 23. 권장 커밋 순서

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

# 24. 완료 기준

`PCIe & CXL` Hub는 다음 상태면 1차 완료다.

```text
독자가 PCIe와 CXL의 전체 범위를 이해할 수 있다.
처음 읽을 문서 세 개가 명확하다.
BAR·Interrupt·DMA·CXL Memory 개념으로 이동할 수 있다.
대표 Guide와 실전 Debug Note가 구분된다.
Firmware·Linux·CUDA Topic과의 관계가 보인다.
구판과 미검증 문서가 Featured에 없다.
모바일과 JavaScript 비활성 상태에서도 탐색 가능하다.
```

# 이번 단계의 핵심 결론

이 Hub에서 가장 중요한 콘텐츠는 글을 가장 많이 모은 목록이 아니다.

```text
PCIe 장치가 초기화되는 전체 흐름
BAR와 DMA가 Host Software에 연결되는 과정
CXL 메모리가 주소 공간에 통합되는 과정
실제 하드웨어에서 규격과 Runtime 지원이 달라지는 사례
```

이 네 축이 명확하면 `PCIe & CXL` Hub는 단순 아카이브가 아니라 사이트의 대표 지식 지도 역할을 하게 된다.

## 55. user

너 하다가 말았는데 혹시 세션이 길어져서 그럼?

## 56. assistant

응, 세션이 길어져서라기보다는 **네가 “다음”을 연속해서 요청한 흐름에서 내가 다음 단계 제목을 명시하지 않고 Task 3-11에서 한 번 멈춘 것**에 가깝다. 컨텍스트는 이어지고 있고, 지금까지 내용도 유지되고 있어.

다음 순서는 원래:

**Task 3-12. Firmware & Bootloader Hub 실제 콘텐츠 설계안**

이었다. 이어서 천천히 진행하면 된다.

## 57. assistant

# Task 3-12. `Firmware & Bootloader` Hub 실제 콘텐츠 설계안

이번 Hub는 개인적으로 **`hawk90.github.io`에서 가장 차별화될 가능성이 큰 영역**이다.

이유는 단순하다.

CUDA나 C++ 글은 인터넷에 많다.

하지만

```text
Boot ROM
↓

BL1
↓

BL2
↓

TF-A / U-Boot
↓

Linux Kernel
↓

Driver
↓

Application
```

까지 **하나의 흐름으로 설명하는 사이트는 생각보다 거의 없다.**

---

# 1. Hub의 목표

이 Hub의 목표는 Bootloader를 설명하는 것이 아니다.

목표는

> **Firmware가 운영체제로 어떻게 이어지는가**

를 설명하는 것이다.

---

## 독자의 질문

이 Hub는 아래 질문을 해결해야 한다.

```text
CPU는 전원이 들어오면 무엇부터 실행하는가?

Boot ROM은 어디까지 하는가?

Bootloader는 왜 여러 단계인가?

DTB는 누가 만드는가?

커널은 언제 실행되는가?

Driver는 언제 Probe되는가?

Firmware와 Driver의 경계는 어디인가?

FPGA Bitstream은 언제 로드하는가?

PCIe Root Complex는 누가 초기화하는가?

Secure Boot는 어디서 시작하는가?
```

---

# 2. Hero

## H1

```text
Firmware & Bootloader
```

---

## 설명

```text
CPU가 전원을 켠 순간부터 운영체제가 Driver를 실행하기까지의
전체 Firmware 흐름을 설명합니다.

Boot ROM, Bootloader, Device Tree,
Linux Kernel 초기화와 Driver Probe,
그리고 FPGA와 PCIe 장치 초기화까지
하나의 시스템 관점으로 연결합니다.
```

---

# Hero 아래

대표 키워드

```text
Boot ROM

BL1

BL2

TF-A

U-Boot

Device Tree

Linux Boot

Driver Probe
```

---

# 3. Start Here

여기도 3개만 둔다.

---

## ① Firmware 전체 흐름

가장 중요한 글.

제목 예시

```text
CPU는 전원을 켜면 무엇부터 실행하는가
```

설명

```text
Boot ROM부터 Linux userspace까지
전체 Boot Sequence를 설명합니다.
```

이 글 하나가

Hub의 중심이 된다.

---

### 포함해야 하는 그림

```text
Power On

↓

Reset

↓

Boot ROM

↓

BL1

↓

BL2

↓

TF-A

↓

U-Boot

↓

Device Tree

↓

Linux Kernel

↓

init

↓

systemd

↓

Application
```

---

## ② Device Tree

두 번째 글

```text
Device Tree는 왜 필요한가
```

내용

```text
Memory

GPIO

Clock

Interrupt

Reserved Memory

PCIe

FPGA

를 Kernel에 전달하는 과정
```

---

## ③ Driver Probe

세 번째

```text
Linux Driver는 언제 Probe되는가
```

내용

```text
Platform Device

PCI Device

OF Matching

Driver Registration

Probe

Remove
```

---

# 4. System Flow

이 Hub도

"글 목록"

보다

"흐름"

이 중요하다.

---

## 권장 다이어그램

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

# 5. Core Concepts

여기는

6개 정도면 충분하다.

---

# ① Boot ROM

설명

```text
CPU 내부에 존재하는 변경 불가능한 코드.

최초 Boot Device를 찾고
다음 Boot Stage를 실행한다.
```

대표 글

```text
Boot ROM은 실제로 무엇을 하는가
```

---

### 하위 키워드

```text
Reset Vector

Boot Device

eMMC

QSPI

UART Download

USB Boot
```

---

# ② Multi-stage Boot

설명

```text
왜 Bootloader는

BL1

BL2

BL31

U-Boot

처럼 나뉘는가.
```

대표 글

```text
Bootloader가 여러 단계인 이유
```

---

하위

```text
Trusted Firmware

SPL

TPL

DDR Init

Clock Init

Secure Monitor
```

---

# ③ Device Tree

설명

```text
Kernel이

하드웨어를

Firmware로부터

전달받는 방법.
```

대표 글

```text
Device Tree 내부 구조
```

---

하위

```text
compatible

interrupts

reg

memory

reserved-memory

chosen
```

---

# ④ Linux Boot

설명

```text
start_kernel()

↓

initcall

↓

Subsystem

↓

Driver Probe
```

대표 글

```text
Linux Kernel은 어떻게 시작되는가
```

---

하위

```text
start_kernel

rest_init

kernel_init

initcall

late_initcall
```

---

# ⑤ Driver Initialization

설명

```text
Platform Driver

PCI Driver

I2C

SPI

USB

Probe 흐름
```

대표 글

```text
Linux Driver Probe 과정
```

---

# ⑥ Firmware & Hardware

이게

이 사이트만의 강점이다.

설명

```text
Firmware가

Clock

Reset

PLL

Power

PCIe

FPGA

DDR

등을 언제 초기화하는지
```

대표 글

```text
Firmware와 Hardware 초기화 경계
```

---

# 6. Learning Paths

---

## Firmware Beginner

```text
Boot ROM

↓

Bootloader

↓

Device Tree

↓

Kernel

↓

Driver
```

---

## Embedded Linux

```text
Device Tree

↓

Kernel Init

↓

Platform Driver

↓

Interrupt

↓

DMA
```

---

## FPGA Firmware

이건

너 사이트의 핵심이다.

```text
Bootloader

↓

FPGA Bitstream

↓

PCIe Init

↓

BAR

↓

Driver

↓

Application
```

---

# 7. Debug & Experiments

이 Hub는

Debug 글이 많을수록 좋다.

---

## Boot Failures

예

```text
Kernel panic

No init found

Wrong DTB

DDR Init 실패

Clock Init 실패
```

---

## Driver Probe

예

```text
probe() 호출 안됨

compatible 불일치

IRQ 등록 실패

DMA Init 실패
```

---

## Device Tree

예

```text
Reserved Memory 충돌

interrupt-parent 오류

reg 범위 오류

Clock 누락
```

---

## FPGA

여기가 차별점.

예

```text
Bitstream Load 실패

PCIe Link Down

BAR 접근 실패

Interrupt 없음

DMA Timeout
```

---

# 8. Related Topics

Firmware는

혼자 존재하지 않는다.

---

## PCIe & CXL

```text
Firmware가 PCIe Root Complex를 초기화한 뒤

Linux PCI Core가 이어받는다.
```

---

## Linux & Systems

```text
Kernel 내부 구조

Interrupt

Memory

Scheduler
```

---

## C++

```text
Firmware 코드 구조

HAL

Driver

Template 기반 Register Access
```

---

## GPU & CUDA

```text
Jetson

Boot

Device Tree

Memory
```

---

# 9. 신규로 반드시 써야 하는 글

개인적으로

이 Hub에서는

아래 5개가 가장 중요하다.

---

## ① CPU는 전원을 켜면 무엇부터 실행하는가

이 글이

Hub의 얼굴이다.

---

## ② Bootloader는 왜 여러 단계인가

생각보다

국내에 좋은 글이 거의 없다.

---

## ③ Device Tree는 왜 필요한가

Embedded 입문자들이

가장 어려워한다.

---

## ④ Linux Driver Probe 과정

엄청 검색량이 많다.

---

## ⑤ Firmware와 Driver의 경계

이건

너만의 경험을 많이 넣을 수 있다.

---

# 10. 이 Hub에서 가장 큰 차별점

대부분의 블로그는

```text
U-Boot

만 설명하거나

Device Tree

만 설명한다.
```

너는

반대로

전체를 연결해야 한다.

```text
Power

↓

Boot ROM

↓

Bootloader

↓

Device Tree

↓

Linux

↓

Driver

↓

Application
```

이 흐름이 사이트 전체에서 계속 반복되면,

사용자는 **"이 블로그는 시스템 전체를 설명해 주는 곳"**이라는 인상을 받게 된다.

---

# 11. hawk90.github.io에 특히 어울리는 확장

네 경력을 보면 이 Hub에는 일반적인 임베디드 내용보다 **실제 시스템 개발 경험**을 녹이는 것이 훨씬 강점이 된다.

예를 들어 "System Walkthrough"라는 하위 시리즈를 둘 수 있다.

```text
Power On → Linux Shell까지 코드 따라가기
Jetson Orin Nano Boot 분석
RK3399 Boot Flow 분석
AMD Alveo U250 초기화 흐름
PCIe FPGA 카드가 Linux Driver에 연결되기까지
```

이런 콘텐츠는 단순 API 설명보다 훨씬 차별화되고, `PCIe & CXL` Hub와도 자연스럽게 연결된다.

---

## 이 Hub를 한 문장으로 정의하면

> **"Firmware와 운영체제 사이의 모든 경계를 하나의 실행 흐름으로 설명하는 Hub."**

---

### 다음 단계

다음은 **Task 3-13. Linux & Systems Hub 실제 콘텐츠 설계안**이다.

이 Hub는 단순한 리눅스 사용법이 아니라, **커널 내부 구조·메모리·프로세스·인터럽트·파일시스템·동기화·네트워크를 시스템 관점에서 연결하는 대표 Hub**를 설계하는 단계다.

## 58. assistant

# Task 3-13. `Linux & Systems` Hub 실제 콘텐츠 설계안

이 Hub는 단순한 **Linux 사용법**을 모으는 공간이 아니다.

목표는 **운영체제가 하드웨어와 애플리케이션 사이에서 어떤 역할을 수행하는지**를 시스템 관점으로 설명하는 것이다.

개인적으로 이 Hub는 `PCIe & CXL`, `Firmware & Bootloader`와 함께 사이트의 **3대 핵심 Hub**가 되어야 한다.

---

# 1. Hub의 목표

이 Hub가 답해야 하는 질문은 다음과 같다.

```text
프로세스는 어떻게 생성되는가?

메모리는 어떻게 관리되는가?

Virtual Memory는 왜 필요한가?

Interrupt는 어떻게 처리되는가?

Scheduler는 왜 존재하는가?

System Call은 어떻게 Kernel로 들어가는가?

Driver는 Kernel 내부에서 어떻게 동작하는가?

Lock은 언제 필요한가?

NUMA는 무엇인가?

Linux Kernel은 어떤 계층으로 구성되는가?
```

---

# 2. Hero

## H1

```text
Linux & Systems
```

## 설명

```text
Linux Kernel 내부 구조와 운영체제가 하드웨어를 관리하는 방식을 설명합니다.

프로세스, 메모리, 인터럽트, 스케줄러, 파일시스템, Driver와 System Call을 하나의 시스템 관점으로 연결합니다.
```

---

# 3. Start Here

역시 3개만 둔다.

---

## ① Linux Kernel 전체 구조

권장 제목

```text
Linux Kernel은 어떻게 구성되어 있는가
```

포함 내용

```text
User Space

↓

System Call

↓

VFS

↓

Memory

↓

Scheduler

↓

Interrupt

↓

Driver

↓

Hardware
```

---

## ② Virtual Memory

권장 제목

```text
Virtual Memory는 왜 필요한가
```

포함

```text
Page

MMU

TLB

Page Table

Demand Paging

Swap
```

---

## ③ Interrupt

권장 제목

```text
Linux Interrupt 처리 과정
```

포함

```text
IRQ

SoftIRQ

Tasklet

Workqueue

Threaded IRQ
```

---

# 4. System Flow

이 Hub의 핵심 그림이다.

```text
Application

↓

glibc

↓

System Call

↓

Kernel

↓

Subsystem

↓

Driver

↓

Interrupt

↓

Hardware
```

그리고

반대 방향도 보여준다.

```text
Hardware

↓

Interrupt

↓

Driver

↓

Wakeup

↓

Scheduler

↓

Application
```

---

# 5. Core Concepts

---

## ① Process & Thread

설명

```text
Linux에서 Task는 어떻게 생성되고 관리되는가.
```

대표 글

```text
fork()와 clone()의 차이
```

하위

```text
task_struct

PID

Thread Group

clone()

execve()
```

---

## ② Virtual Memory

설명

```text
CPU Virtual Address가 Physical Memory에 연결되는 과정.
```

대표 글

```text
Page Table 내부 구조
```

하위

```text
MMU

TLB

Huge Page

NUMA

Swap
```

---

## ③ Scheduler

설명

```text
CPU 시간을 어떤 기준으로 분배하는가.
```

대표 글

```text
Completely Fair Scheduler(CFS) 이해하기
```

하위

```text
Run Queue

vruntime

Context Switch

CPU Affinity
```

---

## ④ Interrupt & Synchronization

설명

```text
Interrupt가 발생했을 때 Kernel은 어떻게 반응하는가.
```

대표 글

```text
Hard IRQ와 SoftIRQ 차이
```

하위

```text
IRQ

SoftIRQ

Spinlock

Mutex

RCU

Atomic
```

---

## ⑤ Filesystem & VFS

설명

```text
모든 파일시스템을 Linux가 공통 인터페이스로 다루는 구조.
```

대표 글

```text
VFS는 왜 존재하는가
```

하위

```text
inode

dentry

page cache

ext4

tmpfs
```

---

## ⑥ Driver Framework

설명

```text
Kernel Driver가 Device와 연결되는 과정.
```

대표 글

```text
Linux Driver Model
```

하위

```text
Platform Driver

PCI Driver

I2C

SPI

USB

probe()
```

---

# 6. Learning Paths

---

## Kernel Beginner

```text
Kernel 구조

↓

System Call

↓

Memory

↓

Scheduler

↓

Driver
```

---

## Driver Developer

```text
Device Model

↓

Interrupt

↓

DMA

↓

Synchronization

↓

Debugging
```

---

## Performance Engineer

```text
Cache

↓

NUMA

↓

Scheduler

↓

Memory

↓

Perf
```

---

# 7. Debug & Experiments

이 Hub는 실험 글이 많을수록 가치가 올라간다.

---

## Memory

예

```text
OOM

Memory Leak

Fragmentation

Huge Page
```

---

## Scheduler

예

```text
Latency

CPU Starvation

Affinity

Preemption
```

---

## Driver

예

```text
probe() 실패

DMA Mapping 실패

IRQ 등록 실패
```

---

## Kernel Debugging

예

```text
Oops

Kernel Panic

Lockdep

KASAN

ftrace
```

---

# 8. Related Topics

---

## Firmware & Bootloader

```text
Kernel이 시작되기 전까지의 초기화 과정을 다룹니다.
```

---

## PCIe & CXL

```text
PCI Core, DMA API, IOMMU와 Device Driver를 연결합니다.
```

---

## C++

```text
Kernel Coding Style과 Modern C++의 차이를 비교합니다.
```

---

## GPU & CUDA

```text
Pinned Memory, NUMA, Scheduler와 GPU 실행 환경을 연결합니다.
```

---

# 9. 반드시 작성하면 좋은 대표 글

이 Hub에서는 다음 글들이 핵심이다.

### ① Linux Kernel은 어떻게 구성되어 있는가

사이트의 Linux 입문 Guide.

---

### ② Virtual Memory는 왜 필요한가

가장 많이 인용될 가능성이 높은 글.

---

### ③ Linux Driver Model

Platform Driver, PCI Driver, Device Tree를 모두 연결.

---

### ④ Interrupt 처리 과정

Hard IRQ → SoftIRQ → Workqueue.

---

### ⑤ Scheduler 내부 구조

CFS를 중심으로 설명.

---

### ⑥ Linux Memory Management

Buddy Allocator, Slab, Page Cache를 연결.

---

### ⑦ System Call 내부 흐름

Application → glibc → syscall → kernel.

---

# 10. 차별화 포인트

인터넷에는 Linux 명령어 글은 많다.

하지만 네 사이트에서는 **명령어보다 내부 구조**를 중심으로 가져가는 것이 훨씬 강하다.

예를 들어:

```text
❌ "top 명령어 사용법"

⭕ "top에서 보이는 CPU 사용률은 Scheduler 내부에서 어떻게 계산되는가?"
```

또는

```text
❌ "ps 명령어"

⭕ "ps가 /proc을 통해 task_struct 정보를 읽는 과정"
```

---

# 11. 다른 Hub와의 연결

이 Hub는 다른 Hub의 중심 연결점이 된다.

```text
Firmware & Bootloader
        │
        ▼
Linux & Systems
   ├── Process
   ├── Memory
   ├── Interrupt
   ├── Driver
   └── Filesystem
        │
        ▼
PCIe & CXL
        │
        ▼
GPU & CUDA
```

즉, **운영체제가 가운데 허브** 역할을 한다.

---

# 12. 신규 시리즈 제안

이 Hub에는 "Kernel Internals" 시리즈를 만들면 좋다.

예시:

```text
Kernel Internals #1
start_kernel()부터 init까지

Kernel Internals #2
task_struct 분석

Kernel Internals #3
Page Table Walk

Kernel Internals #4
CFS Scheduler

Kernel Internals #5
IRQ Subsystem

Kernel Internals #6
SLAB Allocator

Kernel Internals #7
VFS

Kernel Internals #8
PCI Core
```

이런 연재는 검색 유입뿐 아니라 **사이트의 정체성**을 만드는 데도 도움이 된다.

---

# 13. hawk90.github.io에 특히 맞는 확장

네가 자주 다루는 주제를 보면 이 Hub에서 일반적인 리눅스 설명보다 **"커널 내부 + 실제 하드웨어"**를 연결하는 글이 강점이 된다.

예를 들어:

```text
Linux PCI Core 코드 따라가기
DMA API와 IOMMU 내부 동작
Interrupt가 Userspace Event까지 전달되는 과정
VFIO의 주소 변환 구조
NUMA와 GPU Memory 성능
```

이런 글은 `PCIe & CXL`, `Firmware & Bootloader`, `GPU & CUDA` Hub를 자연스럽게 이어주는 연결 고리가 된다.

---

# 14. 앞으로의 Hub 구성

지금까지 설계한 Hub는 다음과 같다.

```text
✓ PCIe & CXL
✓ Firmware & Bootloader
✓ Linux & Systems
```

남은 핵심 Hub는:

```text
GPU & CUDA
C++
Video Codec (AV1/H.264/HEVC/VVC)
FPGA & Hardware Acceleration
Debugging & Reverse Engineering (선택)
```

---

## 개인적인 우선순위

현재 네 기술 블로그의 강점을 고려하면 다음 순서가 가장 자연스럽다.

1. **PCIe & CXL**
2. **Firmware & Bootloader**
3. **Linux & Systems**
4. **GPU & CUDA**
5. **C++**
6. **Video Codec**
7. **FPGA & Hardware Acceleration**

이 순서는 각 Hub가 독립적이면서도 서로 선행 지식을 공유하도록 설계되어 있어서, 독자가 하나의 Hub에서 다른 Hub로 자연스럽게 이동할 수 있는 구조를 만들기 쉽다.

다음 단계는 **Task 3-14. GPU & CUDA Hub 실제 콘텐츠 설계안**이다. 이 Hub는 CUDA API 사용법이 아니라 **GPU 아키텍처, 메모리 계층, 실행 모델, 성능 최적화, 프로파일링을 시스템 관점에서 연결하는 구조**를 설계하게 된다.

## 59. user

이 태스크는 넘어가도 될꺼같아 다음 태스크로 가되 앞선 설명만큼

## 60. assistant

좋아. 이제부터는 Hub 하나하나를 상세 설계하는 것보다 **사이트 전체를 완성하는 데 더 중요한 태스크**로 넘어가는 게 맞다.

앞의 Hub 설계는 패턴이 거의 동일하므로 GPU, C++, AV1도 같은 원칙을 적용하면 된다.

---

# Task 3-14. 콘텐츠 품질 시스템 (Editorial System)

개인적으로 **A~H를 통틀어 가장 중요한 태스크**다.

왜냐하면 AdSense도, Google 검색도, 독자도 결국 보는 건 **페이지 하나의 품질**이기 때문이다.

사이트가 아무리 예뻐도 글이 엉망이면 끝이다.

---

# 문제

지금 대부분의 기술 블로그는

```text
좋은 글

↓

좋은 글

↓

짧은 메모

↓

실험 로그

↓

링크 모음

↓

예전 버전

↓

반쯤 작성
```

이렇게 뒤섞인다.

결국 시간이 지나면

```text
"이 글 믿어도 되나?"
```

가 된다.

---

# 목표

모든 글이

```text
현재 상태

신뢰도

대상 독자

난이도

범위
```

를 스스로 설명하도록 만든다.

---

# 1. 문서 레벨(Level)

이걸 반드시 넣는 걸 추천한다.

예를 들어

```yaml
level: beginner
```

또는

```yaml
level: intermediate
```

또는

```yaml
level: advanced
```

---

## Beginner

예

```text
Virtual Memory란?

PCIe BAR란?

DMA란?
```

---

## Intermediate

예

```text
PCIe Enumeration

Linux DMA API

Page Table Walk
```

---

## Advanced

예

```text
CXL HDM Decoder

RCU

Kernel Scheduler

NUMA Balancing
```

---

### 장점

검색 결과에서도

```text
Advanced
```

배지를 줄 수 있다.

---

# 2. Confidence

이건 꽤 차별화된다.

```yaml
confidence: high
```

---

예

```text
high

↓

직접 구현

직접 디버깅

규격 확인
```

---

```text
medium

↓

논문

커널 코드

소스 분석
```

---

```text
low

↓

추측

가설

실험 예정
```

---

이걸 쓰면

독자가

```text
"이건 작성자의 추론이구나"
```

를 알 수 있다.

---

# 3. Evidence

추천.

```yaml
evidence:
```

예

```yaml
evidence:
  - Intel PCIe Spec
  - Linux Kernel 6.12
  - 직접 실험
```

---

그러면

문서 마지막에

```text
Verified With
```

섹션이 생긴다.

---

# 4. Environment

엄청 중요.

예

```yaml
testedWith:

kernel:

compiler:

hardware:
```

예

```yaml
testedWith:
  os: Ubuntu 24.04
  kernel: 6.12
  compiler: GCC14
```

---

# 5. Version Scope

많은 블로그가 이걸 안 한다.

예

```yaml
appliesTo:
```

```yaml
Linux 6.x

PCIe Gen4

CUDA 12.x
```

---

반대로

```yaml
notAppliesTo:
```

도 좋다.

예

```yaml
CUDA 8

Linux 3.x
```

---

# 6. Prerequisites

이건

Hub하고 연결된다.

```yaml
prerequisites:
```

예

```yaml
Virtual Memory

Page Table

TLB
```

---

# 7. Next Reading

```yaml
next:
```

예

```yaml
Huge Page

NUMA

Buddy Allocator
```

---

그러면

글 끝이

막히지 않는다.

---

# 8. Common Mistakes

개인적으로 강력 추천.

예

```text
자주 하는 오해
```

예

```text
BAR는 메모리다.

(X)
```

```text
BAR는

MMIO Window다.
```

---

이런 섹션은

검색 유입도 좋다.

---

# 9. FAQ

예

```text
왜 BAR가 0으로 읽히나요?

왜 DMA가 실패하나요?

왜 Probe가 안 되나요?
```

---

FAQ는

SEO에도 도움이 된다.

---

# 10. TL;DR

맨 위

```text
3줄 요약
```

예

```text
BAR는 장치 메모리가 아니다.

Host MMIO Window다.

크기는 Enumeration 과정에서 결정된다.
```

---

# 11. 그림 정책

이건 꼭 만든다.

예

```text
모든 Guide

↓

최소 1개 다이어그램

모든 Concept

↓

최소 1개 그림

Debug

↓

로그 + 그림
```

---

# 12. 코드 정책

코드가 너무 길면

```text
생략
```

하지 말고

```text
핵심 부분

↓

GitHub 링크
```

---

# 13. 실험 정책

Experiment는

무조건

```text
환경

방법

결과

한계
```

4개가 있어야 한다.

---

# 14. 문서 마지막

추천.

```text
이 문서에서 배운 것

↓

다음 추천

↓

관련 문서

↓

검증 환경

↓

변경 이력
```

---

# 15. 변경 이력(Change Log)

엄청 좋다.

예

```text
2026-08

Kernel 6.12 반영

2026-07

예제 수정
```

---

# 16. 품질 점수(Quality Score)

이건 내부용이다.

예를 들어

| 항목 | 점수 |
|------|------:|
| Description | 5 |
| Diagram | 10 |
| Example | 10 |
| Environment | 10 |
| Evidence | 10 |
| FAQ | 5 |
| Next Reading | 5 |
| Metadata | 10 |
| Links | 10 |
| Mobile | 5 |
| 최신성 | 10 |
| 총점 | 100 |

---

### 예

```text
92점

↓

Featured 가능
```

```text
73점

↓

Needs Review
```

```text
48점

↓

Hidden
```

---

# 이 태스크의 가장 중요한 산출물

이 작업이 끝나면 **"좋은 글이란 무엇인가?"**를 사람의 감이 아니라 규칙으로 정의할 수 있어야 한다.

예를 들어:

```text
좋은 글 =
현재 환경이 명시되어 있다.
↓

근거가 있다.
↓

독자가 어디서 시작해야 하는지 안다.
↓

다음에 무엇을 읽을지 안다.
↓

오래된 내용이면 명확히 표시된다.
↓

대표 문서로 추천할 수 있다.
```

---

## 개인적으로 추가하고 싶은 것 하나

네 블로그의 강점은 **직접 구현·디버깅 경험**이다.

그래서 `Confidence`보다 한 단계 더 나아가 **Knowledge Source**를 두는 것을 추천한다.

```yaml
knowledgeSource:
  - implementation
  - debugging
  - specification
  - source-code
  - benchmark
  - paper
```

예를 들어:

- `implementation` : 직접 구현하며 얻은 지식
- `debugging` : 실제 장애를 분석하며 얻은 지식
- `specification` : 규격서 기반
- `source-code` : Linux Kernel, LLVM 등 코드 분석
- `benchmark` : 성능 측정 결과
- `paper` : 논문 기반

이 정보가 쌓이면 `hawk90.github.io`는 단순한 기술 블로그가 아니라 **"이 지식이 어디에서 왔는지"까지 설명하는 엔지니어링 지식베이스**가 된다.

---

다음 태스크부터는 **콘텐츠가 아니라 구현**으로 들어간다.

**Task 3-15. Astro 프로젝트 디렉터리 구조와 코드 아키텍처 재설계**에서는 지금까지 정의한 Topic, Hub, Metadata, Editorial System을 실제 코드 구조에 어떻게 녹일지 설계하게 된다. 이 부분은 프로젝트 유지보수성과 성능에 직접적인 영향을 주는 핵심 단계다.

## 61. assistant

# Task 3-15. Astro 프로젝트 디렉터리 구조와 코드 아키텍처 재설계

이번 단계부터는 지금까지 정의한 다음 요소를 실제 코드 구조로 옮긴다.

```text
Topic
Topic Hub
Content Type
Content Status
Editorial Metadata
Search Document
Publication Policy
Validation
Generated Artifact
```

목표는 단순히 폴더를 예쁘게 정리하는 것이 아니다.

> 콘텐츠 정책, 빌드 파이프라인, UI 표현이 서로 직접 얽히지 않게 만드는 것이 핵심이다.

---

# 1. 현재 구조에서 발생하기 쉬운 문제

Astro 기술 블로그가 성장하면 대체로 다음 흐름을 겪는다.

```text
작은 블로그
→ Markdown 몇 개
→ 공통 Layout
→ 검색 추가
→ 태그 추가
→ 시리즈 추가
→ 자동 OG 추가
→ 관리자 도구 추가
→ 콘텐츠 규칙 증가
```

그러다 보면 `src/` 안에서 다음이 뒤섞인다.

```text
페이지 렌더링
콘텐츠 읽기
검색 인덱스 생성
태그 계산
날짜 포맷
상태 판단
Featured 선정
SEO metadata
광고 노출 조건
```

대표적인 증상은 다음과 같다.

```text
한 문서의 공개 여부를 여러 컴포넌트가 따로 판단한다.

검색 생성기와 Sitemap 생성기가 각각 Markdown을 읽는다.

Topic Hub가 태그를 기반으로 독자적으로 글을 다시 수집한다.

홈 Featured와 글의 front matter가 서로 다른 기준을 사용한다.

UI 컴포넌트가 콘텐츠 정책까지 결정한다.
```

이 상태에서는 작은 정책 변경도 여러 파일에 퍼진다.

예를 들어:

```text
superseded 문서는 검색에서 제외한다.
```

라는 규칙 하나를 바꾸려면 다음을 모두 수정하게 된다.

```text
검색
홈
Topic Hub
관련 글
RSS
Sitemap
광고 조건
```

이것이 가장 먼저 없애야 할 구조다.

---

# 2. 목표 아키텍처

권장 흐름은 다음과 같다.

```text
Raw Content
    ↓
Content Schema
    ↓
Content Manifest
    ↓
Publication Policy
    ↓
Curated Domain Data
    ↓
Page View Models
    ↓
Astro Components
```

파생 산출물은 옆으로 나간다.

```text
Content Manifest
    ├── Search Documents
    ├── Sitemap
    ├── RSS
    ├── Internal Link Graph
    ├── Audit Reports
    └── Generated Assets
```

핵심 원칙은 다음이다.

```text
Markdown은 원본이다.

Manifest는 정제된 콘텐츠 데이터다.

Policy는 공개 여부와 노출 규칙을 결정한다.

Hub Config는 편집자의 큐레이션이다.

View Model은 UI가 필요한 형태다.

Component는 표현만 담당한다.
```

---

# 3. 권장 최상위 디렉터리 구조

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

# 4. `src/content`: 원본 문서 저장소

Astro Content Collections를 유지한다면 이 영역은 원본 Markdown·MDX를 담는다.

```text
src/content/
├── articles/
├── pages/
└── config.ts
```

## `articles/`

기술 문서 본문.

```text
src/content/articles/
├── pcie/
├── firmware/
├── linux/
├── cuda/
├── cpp/
└── archive/
```

다만 폴더가 public URL이나 Topic의 source of truth가 되어서는 안 된다.

예를 들어:

```text
src/content/articles/pcie/bar-sizing.md
```

가 있다고 해서 자동으로:

```text
topic = pcie-cxl
url = /pcie/bar-sizing/
```

가 되는 구조는 피한다.

파일 경로는 저장 편의를 위한 것이다.

문서의 정체성은 metadata가 담당한다.

```yaml
id: pcie-bar-sizing
slug: pcie-bar-sizing
topic: pcie-cxl
```

---

## `pages/`

About, Privacy, Editorial Policy처럼 일반 기술 문서와 성격이 다른 정적 페이지.

```text
src/content/pages/
├── about.md
├── privacy.md
├── editorial-policy.md
└── contact.md
```

이를 일반 Article Collection에 넣지 않는 이유는 다음과 같다.

```text
검색 ranking이 다름
RSS 포함 여부가 다름
Content Type 모델이 다름
광고 정책이 다름
날짜와 검증 상태가 다름
```

---

# 5. 폴더 계층을 깊게 만들지 말아야 하는 이유

다음과 같은 구조는 처음에는 정돈돼 보인다.

```text
articles/
└── systems/
    └── hardware/
        └── pcie/
            └── bar/
                └── size-probing.md
```

하지만 시간이 지나면 글이 여러 영역에 걸친다.

예:

```text
U-Boot에서 PCIe Root Complex를 초기화하는 과정
```

이 글은 다음 모두와 관련된다.

```text
Firmware
PCIe
Linux Handoff
Driver
```

파일은 한 곳에만 놓을 수 있지만 지식 관계는 여러 방향이다.

따라서 권장 깊이는 1~2단계 정도다.

```text
articles/
├── pcie/
├── firmware/
├── linux/
└── cuda/
```

정확한 지식 구조는 Topic registry와 relation이 담당한다.

---

# 6. `src/domain`: 사이트의 핵심 규칙

가장 중요한 디렉터리다.

```text
src/domain/
├── content/
├── publication/
├── topics/
├── curation/
├── relations/
├── search/
└── seo/
```

이 영역은 Astro UI에 종속되지 않는 순수 TypeScript 중심으로 구성한다.

---

# 7. `domain/content`

```text
src/domain/content/
├── content-types.ts
├── content-status.ts
├── content-model.ts
├── content-schema.ts
├── manifest.ts
├── normalize.ts
└── queries.ts
```

---

## `content-types.ts`

```ts
export const CONTENT_TYPES = [
  "guide",
  "concept",
  "debug-note",
  "experiment",
  "source-walkthrough",
  "reference",
] as const;

export type ContentType =
  (typeof CONTENT_TYPES)[number];
```

---

## `content-status.ts`

```ts
export const CONTENT_STATUSES = [
  "current",
  "needs-review",
  "historical",
  "superseded",
  "archived",
] as const;

export type ContentStatus =
  (typeof CONTENT_STATUSES)[number];
```

상태별 UI 문자열은 별도 mapping으로 둔다.

```ts
export const CONTENT_STATUS_LABELS: Record<
  ContentStatus,
  string
> = {
  current: "Current",
  "needs-review": "Needs Review",
  historical: "Historical",
  superseded: "Superseded",
  archived: "Archived",
};
```

다만 UI 텍스트까지 Domain에 넣을지는 사이트 다국어 정책에 따라 결정할 수 있다.

---

## `content-model.ts`

원본 Content Entry와 정제된 Domain Model을 분리한다.

```ts
export interface ContentDocument {
  id: string;
  slug: string;
  url: string;

  title: string;
  description: string;

  type: ContentType;
  status: ContentStatus;
  topicId: string;

  publishedAt: Date;
  updatedAt?: Date;
  lastVerifiedAt?: Date;

  headings: ContentHeading[];
  links: ContentLink[];

  prerequisites: string[];
  next: string[];
  related: string[];

  testedWith?: TestedEnvironment;
  supersededBy?: string;

  sourcePath: string;
  contentHash: string;
}
```

환경 모델은 너무 고정하지 않는다.

```ts
export interface TestedEnvironment {
  os?: string;
  kernel?: string;
  compiler?: string;
  hardware?: string;
  sdk?: string;
  toolchain?: string;
  notes?: string[];
}
```

CUDA 글에는 GPU와 CUDA 필드가 필요할 수 있고, Linux 분석 글에는 kernel source version만 필요할 수 있다.

처음부터 모든 도메인별 필드를 interface에 넣으면 모델이 커진다.

따라서 두 가지 선택지가 있다.

### 선택안 A: 공통 필드 + notes

단순하고 초기 운영에 적합하다.

### 선택안 B: 분야별 discriminated union

콘텐츠가 충분히 많아질 때 고려한다.

```ts
type TestedEnvironment =
  | CudaEnvironment
  | LinuxEnvironment
  | FpgaEnvironment;
```

초기에는 A가 낫다.

---

# 8. Raw Entry를 Domain Model로 직접 사용하지 않기

Astro의 `CollectionEntry<"articles">`를 사이트 전체에 직접 넘기면 Astro Content API에 강하게 결합된다.

나쁜 예:

```ts
function buildSearchDocument(
  entry: CollectionEntry<"articles">,
) {
  // Astro schema details everywhere
}
```

권장:

```ts
function normalizeContentEntry(
  entry: CollectionEntry<"articles">,
): ContentDocument {
  // Astro-specific conversion lives here.
}
```

그 이후 검색, Hub, Sitemap은 `ContentDocument`만 사용한다.

```ts
function buildSearchDocument(
  document: ContentDocument,
): SearchDocument {
  // Framework-independent
}
```

장점:

```text
Astro schema 변경 영향 축소
검색 테스트 용이
향후 다른 renderer로 이전 가능
fixture 작성 용이
```

---

# 9. `content-schema.ts`

Astro Content Collection schema는 형식 검증을 담당한다.

예시:

```ts
import { z } from "astro:content";

export const articleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),

  slug: z.string().min(1).optional(),

  type: z.enum([
    "guide",
    "concept",
    "debug-note",
    "experiment",
    "source-walkthrough",
    "reference",
  ]),

  topic: z.string().min(1),

  status: z
    .enum([
      "current",
      "needs-review",
      "historical",
      "superseded",
      "archived",
    ])
    .default("needs-review"),

  published: z.coerce.date(),
  updated: z.coerce.date().optional(),
  lastVerified: z.coerce.date().optional(),

  prerequisites: z.array(z.string()).default([]),
  next: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),

  supersededBy: z.string().optional(),

  testedWith: z
    .object({
      os: z.string().optional(),
      kernel: z.string().optional(),
      compiler: z.string().optional(),
      hardware: z.string().optional(),
      sdk: z.string().optional(),
      toolchain: z.string().optional(),
      notes: z.array(z.string()).optional(),
    })
    .optional(),
});
```

---

# 10. Schema에서 하지 말아야 할 검증

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

# 11. `manifest.ts`

Content Manifest는 모든 공개 파이프라인이 공유하는 정제된 데이터다.

```ts
export interface ContentManifest {
  documents: ContentDocument[];
  byId: ReadonlyMap<string, ContentDocument>;
  byUrl: ReadonlyMap<string, ContentDocument>;
}
```

생성 함수:

```ts
export async function createContentManifest():
  Promise<ContentManifest> {
  const entries = await getCollection("articles");

  const documents = entries.map(normalizeContentEntry);

  validateUniqueIds(documents);
  validateUniqueUrls(documents);
  validateTopicReferences(documents);
  validateRelations(documents);

  return {
    documents,
    byId: new Map(
      documents.map((document) => [
        document.id,
        document,
      ]),
    ),
    byUrl: new Map(
      documents.map((document) => [
        document.url,
        document,
      ]),
    ),
  };
}
```

---

# 12. Manifest를 거대한 Singleton으로 만들지 않기

다음 구조는 편하지만 테스트와 빌드 흐름을 흐리게 한다.

```ts
export const manifest =
  await createContentManifest();
```

모든 module import 시 자동 실행되면 다음 문제가 생긴다.

```text
예상하지 않은 파일 I/O
테스트 import만으로 전체 콘텐츠 로드
순환 import
빌드 단계 중복 실행
개발 서버 HMR 문제
```

권장:

```ts
const manifest = await getContentManifest();
```

단, 내부 cache를 명시적으로 사용할 수 있다.

```ts
let cachedManifest:
  ContentManifest | undefined;

export async function getContentManifest() {
  if (!cachedManifest) {
    cachedManifest =
      await createContentManifest();
  }

  return cachedManifest;
}
```

테스트에서는 cache reset API를 둘 수 있다.

---

# 13. `domain/publication`

```text
src/domain/publication/
├── policy.ts
├── decision.ts
└── filters.ts
```

---

## `decision.ts`

```ts
export interface PublicationDecision {
  render: boolean;
  index: boolean;
  includeInSearch: boolean;
  includeInSitemap: boolean;
  includeInRss: boolean;
  includeInTopicLists: boolean;
  canBeFeatured: boolean;
  adsEligible: boolean;
}
```

---

## `policy.ts`

```ts
export function getPublicationDecision(
  document: ContentDocument,
  environment: "development" | "production",
): PublicationDecision {
  if (document.status === "archived") {
    return {
      render: true,
      index: false,
      includeInSearch: false,
      includeInSitemap: false,
      includeInRss: false,
      includeInTopicLists: false,
      canBeFeatured: false,
      adsEligible: false,
    };
  }

  if (document.status === "superseded") {
    return {
      render: true,
      index: false,
      includeInSearch: false,
      includeInSitemap: false,
      includeInRss: false,
      includeInTopicLists: false,
      canBeFeatured: false,
      adsEligible: false,
    };
  }

  if (document.status === "historical") {
    return {
      render: true,
      index: true,
      includeInSearch: true,
      includeInSitemap: true,
      includeInRss: false,
      includeInTopicLists: true,
      canBeFeatured: false,
      adsEligible: false,
    };
  }

  if (document.status === "needs-review") {
    return {
      render: true,
      index: true,
      includeInSearch: true,
      includeInSitemap: true,
      includeInRss: true,
      includeInTopicLists: true,
      canBeFeatured: false,
      adsEligible: false,
    };
  }

  return {
    render: true,
    index: true,
    includeInSearch: true,
    includeInSitemap: true,
    includeInRss: true,
    includeInTopicLists: true,
    canBeFeatured: true,
    adsEligible: true,
  };
}
```

정확한 정책은 운영 결정에 따라 바꿀 수 있다.

핵심은 정책이 한 곳에 있다는 것이다.

---

# 14. Boolean 필드가 너무 많아지는 문제

위 `PublicationDecision`은 명확하지만 시간이 지나면 boolean이 늘어날 수 있다.

```text
includeInHome
includeInArchive
includeInRecommendations
includeInAnalytics
```

이를 모두 추가하면 정책 객체가 폭발한다.

따라서 다음 원칙을 둔다.

## Source-level 정책

정말 다른 공개 계약만 결정한다.

```text
render
index
search
sitemap
rss
featured
ads
```

## UI-specific 필터

홈, 최근 글, 특정 카드 여부는 별도 query가 담당한다.

예:

```ts
getLatestArticles(manifest, {
  limit: 6,
  statuses: ["current", "needs-review"],
});
```

Publication Policy가 모든 UI 결정을 담당하게 하지 않는다.

---

# 15. `domain/topics`

```text
src/domain/topics/
├── topic-model.ts
├── topic-registry.ts
├── topic-queries.ts
└── topic-validation.ts
```

---

## `topic-model.ts`

```ts
export interface TopicDefinition {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  href: string;
  order: number;
  aliases?: string[];
}
```

---

## `topic-registry.ts`

```ts
export const TOPICS = [
  {
    id: "cpp",
    title: "C++",
    description:
      "Modern C++, memory, performance and systems design.",
    href: "/topics/cpp/",
    order: 10,
  },
  {
    id: "linux-systems",
    title: "Linux & Systems",
    description:
      "Kernel internals, memory, interrupts and drivers.",
    href: "/topics/linux-systems/",
    order: 20,
  },
  {
    id: "firmware-bootloader",
    title: "Firmware & Bootloader",
    description:
      "Boot flow, hardware initialization and OS handoff.",
    href: "/topics/firmware-bootloader/",
    order: 30,
  },
  {
    id: "gpu-cuda",
    title: "GPU & CUDA",
    description:
      "GPU architecture, CUDA execution and performance.",
    href: "/topics/gpu-cuda/",
    order: 40,
  },
  {
    id: "pcie-cxl",
    title: "PCIe & CXL",
    description:
      "Device initialization, DMA and memory interconnects.",
    href: "/topics/pcie-cxl/",
    order: 50,
  },
] as const satisfies readonly TopicDefinition[];
```

---

# 16. `data/topics`와 `src/domain/topics` 중 어디에 둘까?

두 선택지가 있다.

## TypeScript Registry

```text
src/domain/topics/topic-registry.ts
```

장점:

```text
타입 안정성
IDE 자동 완성
validation 쉬움
```

단점:

```text
비개발자 편집 불편
콘텐츠 데이터와 코드가 섞일 수 있음
```

## YAML·JSON Registry

```text
data/topics/topics.yaml
```

장점:

```text
콘텐츠처럼 편집
코드 변경 없이 수정
```

단점:

```text
runtime validation 필요
타입 생성 필요
```

현재 개인 프로젝트에서는 TypeScript가 간단하다.

Topic 수가 많아지고 콘텐츠 편집 흐름과 통합할 때 YAML로 옮겨도 된다.

---

# 17. `domain/curation`

Featured와 Start Here를 관리한다.

```text
src/domain/curation/
├── home-curation.ts
├── hub-curation.ts
├── curation-model.ts
└── curation-validation.ts
```

---

## 왜 front matter의 `featured: true`가 좋지 않은가

Featured는 문서의 영구 속성이 아니다.

```text
홈 Featured
Topic Hub Featured
특정 캠페인 Featured
```

의 기준이 다를 수 있다.

문서 안에:

```yaml
featured: true
```

만 두면 어느 화면에서 Featured인지 불명확하다.

권장:

```ts
export const HOME_FEATURED_ARTICLE_IDS = [
  "pcie-bar-sizing",
  "linux-pci-enumeration",
  "cuda-pinned-memory",
  "uboot-driver-model",
] as const;
```

---

## Hub curation

```ts
export interface TopicHubCuration {
  topicId: string;
  startHere: string[];
  featured: string[];
  sections: TopicHubSection[];
  relatedTopics: string[];
}
```

---

# 18. 수동 큐레이션과 자동 목록 경계

수동:

```text
Start Here
Featured
Learning Path
Core Concept 대표 문서
```

자동:

```text
All Articles
Recently Updated
Debug Notes
Experiments
```

좋지 않은 구조:

```ts
const startHere = documents
  .filter((document) =>
    document.topicId === topicId
  )
  .sort(byNewest)
  .slice(0, 3);
```

Start Here가 최신 글이 되어버린다.

---

# 19. `domain/relations`

```text
src/domain/relations/
├── relation-model.ts
├── relation-graph.ts
├── relation-validation.ts
└── relation-queries.ts
```

---

## 관계 모델

```ts
export interface DocumentRelations {
  parentTopicId: string;
  prerequisites: string[];
  next: string[];
  related: string[];
  supersededBy?: string;
}
```

그래프 데이터베이스는 필요 없다.

Map과 Set이면 충분하다.

```ts
export interface RelationGraph {
  prerequisitesByDocument:
    ReadonlyMap<string, ReadonlySet<string>>;

  dependentsByDocument:
    ReadonlyMap<string, ReadonlySet<string>>;

  relatedByDocument:
    ReadonlyMap<string, ReadonlySet<string>>;
}
```

---

# 20. Relation Query 예시

```ts
export function getPrerequisites(
  documentId: string,
  graph: RelationGraph,
  manifest: ContentManifest,
): ContentDocument[] {
  const ids =
    graph.prerequisitesByDocument
      .get(documentId) ?? new Set();

  return [...ids]
    .map((id) => manifest.byId.get(id))
    .filter(isDefined);
}
```

UI가 front matter 배열을 직접 해석하지 않게 한다.

---

# 21. `domain/search`

```text
src/domain/search/
├── search-model.ts
├── search-document.ts
├── search-normalize.ts
├── search-ranking.ts
├── aliases.ts
└── search-index.ts
```

---

## Search Model

```ts
export interface SearchDocument {
  id: string;
  url: string;

  title: string;
  description: string;

  headings: string[];
  aliases: string[];
  symbols: string[];
  errorMessages: string[];

  topicId: string;
  type: ContentType;
  status: ContentStatus;

  updatedAt?: string;
}
```

본문 전체 HTML은 포함하지 않는다.

---

## 검색 생성기

```ts
export function toSearchDocument(
  document: ContentDocument,
  aliases: readonly string[],
): SearchDocument {
  return {
    id: document.id,
    url: document.url,
    title: document.title,
    description: document.description,
    headings:
      document.headings.map(
        (heading) => heading.text,
      ),
    aliases: [...aliases],
    symbols: [],
    errorMessages: [],
    topicId: document.topicId,
    type: document.type,
    status: document.status,
    updatedAt:
      document.updatedAt?.toISOString(),
  };
}
```

---

# 22. `domain/seo`

```text
src/domain/seo/
├── metadata.ts
├── canonical.ts
├── structured-data.ts
└── robots.ts
```

---

## SEO Model

```ts
export interface PageSeo {
  title: string;
  description: string;
  canonicalUrl: string;
  index: boolean;
  follow: boolean;
  openGraph: OpenGraphData;
  structuredData?: unknown[];
}
```

Page component가 직접 title을 조합하지 않는다.

```ts
const seo = buildArticleSeo(document, decision);
```

---

# 23. `src/config`

전역 운영 설정.

```text
src/config/
├── site.ts
├── navigation.ts
├── integrations.ts
└── build.ts
```

---

## `site.ts`

```ts
export const SITE = {
  name: "Hawk Systems Knowledge Base",
  origin: "https://hawk90.github.io",
  author: {
    name: "윤상덕",
    profileUrl: "...",
  },
  locale: "ko-KR",
  timezone: "Asia/Seoul",
} as const;
```

---

## `integrations.ts`

```ts
export const INTEGRATIONS = {
  adsense: {
    enabled: false,
    publisherId: undefined,
  },

  analytics: {
    enabled: true,
  },

  giscus: {
    enabled: true,
  },
} as const;
```

다만 secret은 넣지 않는다.

브라우저에 노출 가능한 공개 설정만 둔다.

---

# 24. `src/lib`는 무엇을 넣는가

`lib`는 잡동사니 폴더가 되기 쉽다.

다음처럼 범위를 제한한다.

```text
src/lib/
├── dates/
├── urls/
├── collections/
└── browser/
```

예:

```text
날짜 표시
URL join
배열 정렬
DOM focus utility
```

콘텐츠 정책은 `lib`에 넣지 않는다.

나쁜 예:

```text
src/lib/utils.ts
```

안에 다음이 모두 들어가는 구조:

```text
날짜
태그
검색
Featured
광고
URL
Markdown
```

가능하면 `utils.ts` 자체를 만들지 않는다.

---

# 25. `src/components` 구조

권장:

```text
src/components/
├── content/
├── topic/
├── home/
├── navigation/
├── search/
├── seo/
└── primitives/
```

---

## `components/content`

```text
ArticleHeader.astro
ArticleMetadata.astro
StatusNotice.astro
TestedEnvironment.astro
ArticleRelations.astro
CodeBlock.astro
```

---

## `components/topic`

```text
TopicHero.astro
StartHereList.astro
TopicSection.astro
LearningPath.astro
RelatedTopics.astro
```

---

## `components/home`

```text
HomeHero.astro
CoreTopics.astro
FeaturedGuides.astro
LatestArticles.astro
TrustSummary.astro
```

---

## `components/primitives`

```text
Badge.astro
Card.astro
SectionHeading.astro
LinkList.astro
```

`Card` 하나가 모든 페이지 카드 variant를 다 처리하게 만들지 않는다.

---

# 26. Component가 판단하지 말아야 할 것

나쁜 예:

```astro
---
const shouldShow =
  article.status !== "archived" &&
  article.status !== "superseded" &&
  article.topic === currentTopic;
---
```

Component가 publication policy와 domain query를 수행한다.

권장:

```astro
---
interface Props {
  article: ArticleCardViewModel;
}

const { article } = Astro.props;
---
```

이미 표시 가능한 View Model만 받는다.

---

# 27. View Model 계층

Domain Model을 UI에 그대로 넘길 수도 있지만, UI 복잡도가 늘면 View Model이 유용하다.

```text
src/domain/view-models/
├── article-card.ts
├── article-page.ts
├── topic-hub.ts
└── search-result.ts
```

예:

```ts
export interface ArticleCardViewModel {
  id: string;
  href: string;
  title: string;
  description: string;
  typeLabel: string;
  topicLabel: string;
  statusLabel?: string;
  updatedLabel?: string;
}
```

생성:

```ts
export function toArticleCardViewModel(
  document: ContentDocument,
  topic: TopicDefinition,
): ArticleCardViewModel {
  return {
    id: document.id,
    href: document.url,
    title: document.title,
    description: document.description,
    typeLabel:
      getContentTypeLabel(document.type),
    topicLabel: topic.title,
    statusLabel:
      document.status === "current"
        ? undefined
        : getStatusLabel(document.status),
    updatedLabel:
      document.updatedAt
        ? formatDate(document.updatedAt)
        : undefined,
  };
}
```

---

# 28. View Model을 무조건 만들 필요는 없다

다음처럼 단순한 컴포넌트에는 Domain Model을 직접 전달해도 된다.

```text
StatusNotice
TestedEnvironment
```

View Model은 다음 상황에서 사용한다.

```text
여러 Domain 객체 결합
날짜·라벨 포맷 필요
노출 조건 복잡
컴포넌트가 Domain 세부사항을 알아서는 안 됨
```

모든 컴포넌트마다 별도 View Model을 만들면 보일러플레이트가 늘어난다.

---

# 29. `src/pages`는 얇게 유지

권장:

```text
src/pages/
├── index.astro
├── articles/
│   └── [...slug].astro
├── topics/
│   └── [topic].astro
├── search.astro
├── about.astro
├── privacy.astro
└── 404.astro
```

페이지 역할:

```text
데이터 query 호출
View Model 생성
Layout 선택
Component 조합
```

페이지에서 하지 않을 것:

```text
전체 문서 relation 계산
검색 인덱스 생성
Publication Policy 구현
Topic registry 정의
복잡한 metadata validation
```

---

# 30. Article Page 예시

```astro
---
import ArticleLayout from "@/layouts/ArticleLayout.astro";
import { getContentManifest } from "@/domain/content/manifest";
import { getPublicationDecision } from "@/domain/publication/policy";
import { buildArticlePageModel } from "@/domain/view-models/article-page";

export async function getStaticPaths() {
  const manifest = await getContentManifest();

  return manifest.documents
    .filter((document) =>
      getPublicationDecision(
        document,
        "production",
      ).render
    )
    .map((document) => ({
      params: {
        slug: document.slug,
      },
      props: {
        documentId: document.id,
      },
    }));
}

const { documentId } = Astro.props;

const manifest = await getContentManifest();
const document = manifest.byId.get(documentId);

if (!document) {
  throw new Error(
    `Document not found: ${documentId}`,
  );
}

const pageModel =
  buildArticlePageModel(
    document,
    manifest,
  );
---

<ArticleLayout page={pageModel} />
```

---

# 31. Topic Page 예시

```astro
---
import TopicHubLayout from "@/layouts/TopicHubLayout.astro";
import { TOPICS } from "@/domain/topics/topic-registry";
import { getTopicHubModel } from "@/domain/view-models/topic-hub";

export function getStaticPaths() {
  return TOPICS.map((topic) => ({
    params: {
      topic: topic.id,
    },
    props: {
      topicId: topic.id,
    },
  }));
}

const { topicId } = Astro.props;
const page = await getTopicHubModel(topicId);
---

<TopicHubLayout page={page} />
```

Topic별 별도 `.astro` 파일을 복제하지 않는다.

---

# 32. Layout 구조

```text
src/layouts/
├── BaseLayout.astro
├── ArticleLayout.astro
├── TopicHubLayout.astro
└── StaticPageLayout.astro
```

---

## BaseLayout

담당:

```text
HTML document
공통 Head
Header
Footer
전역 CSS
기본 script
```

담당하지 않을 것:

```text
광고 무조건 삽입
Article metadata 결정
Topic 데이터 수집
검색 인덱스 preload
```

---

## ArticleLayout

담당:

```text
Article Header
Status Notice
TOC
본문
Environment
Relations
오류 제보
```

---

## TopicHubLayout

담당:

```text
Topic Hero
Start Here
Featured
Sections
Learning Paths
Related Topics
```

---

# 33. 광고 로직 위치

광고 조건을 `BaseLayout`에 넣으면 모든 페이지에 퍼진다.

권장 흐름:

```text
Publication Decision
→ Article Page Model
→ Article Layout
→ Ad Slot Component
```

예:

```ts
export interface ArticlePageViewModel {
  // ...
  adsEligible: boolean;
}
```

Layout:

```astro
{page.adsEligible && (
  <ArticleAdSlot position="after-section" />
)}
```

광고 삽입 위치는 본문 AST 처리와 연결될 수 있으므로 초기에는 본문 후단 정도로 제한하는 것이 안전하다.

---

# 34. `scripts/` 구조

빌드 외 작업을 Astro 페이지 코드에 넣지 않는다.

```text
scripts/
├── content/
│   ├── build-manifest.ts
│   ├── validate-content.ts
│   ├── migrate-frontmatter.ts
│   └── report-orphans.ts
│
├── search/
│   ├── build-search-index.ts
│   └── test-golden-queries.ts
│
├── audit/
│   ├── audit-external-links.ts
│   ├── audit-assets.ts
│   ├── scan-secrets.ts
│   └── audit-metadata.ts
│
├── assets/
│   ├── generate-og.ts
│   └── generate-diagrams.ts
│
└── release/
    ├── validate-dist.ts
    └── smoke-test.ts
```

---

# 35. Script가 Domain Code를 재사용하도록 만들기

나쁜 구조:

```text
Astro 페이지용 content loader
검색 script용 별도 parser
Sitemap용 별도 front matter parser
```

권장:

```ts
import {
  getContentManifest,
} from "../../src/domain/content/manifest";
```

Script도 동일한 Manifest와 Policy를 사용한다.

단, `astro:content`가 일반 Node script에서 직접 동작하지 않는다면 다음 두 경로를 고려한다.

### 경로 A

Astro build 내부 integration으로 manifest 생성.

### 경로 B

Framework-neutral parser를 Domain에 두고 Astro Content Collection과 script가 함께 사용.

현재 프로젝트 구조에 맞춰 선택해야 한다.

---

# 36. 빌드 산출물 디렉터리

```text
.generated/
├── manifest/
├── search/
├── og/
├── diagrams/
└── reports/
```

또는 `.cache/`와 `public/generated/`를 구분한다.

## `.cache/`

재생성 가능한 중간 결과.

```text
문서별 검색 레코드
Shiki 캐시
hash metadata
```

## `public/generated/`

배포되는 생성 결과.

```text
OG 이미지
SVG
검색 JSON
```

## `reports/`

사람이 검토할 감사 결과.

```text
고아 문서
중복 후보
대형 코드 블록
깨진 외부 링크
```

---

# 37. Generated 파일을 Git에 넣을지

항목마다 다르다.

## Git에 넣기 좋은 것

```text
Hub curation
Topic registry
redirect manifest
editorial report 중 사람이 관리하는 감사표
```

## 빌드 시 생성하는 것

```text
검색 인덱스
Sitemap
RSS
relation graph
build metrics
```

## 상황에 따라 저장

```text
OG 이미지
다이어그램 SVG
```

재현 비용이 높거나 외부 도구가 필요하면 결과물도 Git에 둘 수 있다.

다만 source와 generated를 명확히 구분한다.

---

# 38. Import Alias

상대 경로가 깊어지는 것을 막기 위해 alias를 사용한다.

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@domain/*": ["src/domain/*"],
      "@components/*": ["src/components/*"],
      "@config/*": ["src/config/*"]
    }
  }
}
```

그러나 alias를 지나치게 많이 만들 필요는 없다.

```text
@content
@topic
@search
@view
@shared
@common
```

처럼 유사 alias가 폭발하면 오히려 혼란스럽다.

`@/` 하나만 사용해도 충분할 수 있다.

---

# 39. Barrel Export 주의

다음처럼 모든 것을 `index.ts`에서 재수출하면 import는 짧아진다.

```ts
export * from "./content-model";
export * from "./manifest";
export * from "./queries";
```

하지만 대규모 barrel은 다음 문제를 만든다.

```text
순환 dependency
실제 source 추적 어려움
불필요한 module load
동일 이름 충돌
```

권장:

- 작은 bounded context 내부에서만 사용
- Domain 전체를 하나의 index에서 재수출하지 않음
- 핵심 import는 원본 파일을 명시

---

# 40. 의존성 방향

가장 중요한 규칙이다.

```text
Components
    ↓
View Models
    ↓
Domain Queries
    ↓
Domain Models
```

그리고:

```text
Scripts
    ↓
Domain
```

금지 방향:

```text
Domain
→ Astro Component

Domain
→ Browser DOM

Content Model
→ Layout

Publication Policy
→ Search UI
```

Domain은 UI를 몰라야 한다.

---

# 41. 의존성 규칙 예시

```text
src/domain
- src/components import 금지
- src/layouts import 금지
- browser API 사용 금지

src/components
- scripts import 금지
- content file 직접 glob 금지

src/pages
- raw Markdown 직접 parse 금지

scripts
- components import 금지
```

이 규칙은 ESLint boundary plugin 없이도 초기에는 리뷰 원칙으로 운영할 수 있다.

문제가 반복되면 자동 lint를 추가한다.

---

# 42. 상태 전역 Store를 만들지 않기

Astro 정적 사이트에서는 다음 상태가 대부분 빌드 타임 데이터다.

```text
Topic
Featured
Content Status
Relations
Search Metadata
```

이를 Nanostores, Redux, Zustand 같은 client store에 넣을 이유가 없다.

Client state가 필요한 것은 제한적이다.

```text
검색 modal open
테마 선택
코드 복사 상태
모바일 메뉴
```

Content Domain은 정적 HTML로 렌더링한다.

---

# 43. Astro Island 경계

Hydration이 필요한 컴포넌트만 Island로 만든다.

## Hydration 필요 가능

```text
검색 modal
테마 전환
댓글 로드 버튼
이미지 확대
```

## Hydration 불필요

```text
Topic Card
Featured Guide
Status Notice
Article Relations
Learning Path
Metadata
```

나쁜 예:

```astro
<FeaturedGuides client:load />
```

정적 목록인데도 client runtime을 추가한다.

---

# 44. 검색 Island

검색은 별도 경계로 격리한다.

```text
SearchButton.astro
SearchDialog.ts
SearchIndexLoader.ts
SearchEngine.ts
```

흐름:

```text
검색 버튼 클릭
→ Dialog module 로드
→ Search index fetch
→ Search engine 초기화
```

초기 페이지 로드에서는 검색 인덱스를 받지 않는다.

---

# 45. 콘텐츠 쿼리 API

페이지마다 배열 filter를 반복하지 않도록 query를 제공한다.

```text
src/domain/content/queries.ts
```

예:

```ts
export function getLatestDocuments(
  manifest: ContentManifest,
  limit: number,
): ContentDocument[] {
  return manifest.documents
    .filter((document) =>
      getPublicationDecision(
        document,
        "production",
      ).includeInTopicLists
    )
    .sort(compareByUpdatedDesc)
    .slice(0, limit);
}
```

```ts
export function getDocumentsByTopic(
  manifest: ContentManifest,
  topicId: string,
): ContentDocument[] {
  return manifest.documents.filter(
    (document) =>
      document.topicId === topicId &&
      getPublicationDecision(
        document,
        "production",
      ).includeInTopicLists
  );
}
```

---

# 46. Query 함수 폭발 방지

다음처럼 UI마다 query를 하나씩 만들면 함수가 폭발한다.

```text
getHomeLatestArticles
getSidebarLatestArticles
getFooterLatestArticles
```

권장:

```ts
queryDocuments(manifest, {
  topics: ["pcie-cxl"],
  statuses: ["current"],
  types: ["guide", "concept"],
  sort: "updated-desc",
  limit: 6,
});
```

하지만 모든 것을 하나의 거대한 options query로 만들면 타입과 의미가 약해진다.

균형:

```text
범용 queryDocuments
+
의미가 중요한 전용 query
```

예:

```text
getFeaturedDocuments
getTopicStartHere
getSupersededReplacement
```

---

# 47. 에러 처리

콘텐츠 오류를 조용히 무시하지 않는다.

나쁜 예:

```ts
const document =
  manifest.byId.get(id);

if (!document) {
  return null;
}
```

Featured나 Start Here ID가 잘못됐는데 카드만 사라진다.

권장:

```ts
export function requireDocument(
  manifest: ContentManifest,
  id: string,
): ContentDocument {
  const document = manifest.byId.get(id);

  if (!document) {
    throw new Error(
      `Required document does not exist: ${id}`,
    );
  }

  return document;
}
```

선택적 related 링크에는 null 허용이 가능하지만, 수동 큐레이션은 build error가 적절하다.

---

# 48. 테스트 구조

```text
tests/
├── fixtures/
│   ├── valid/
│   └── invalid/
│
├── content/
│   ├── schema.test.ts
│   ├── manifest.test.ts
│   ├── publication-policy.test.ts
│   ├── relations.test.ts
│   └── curation.test.ts
│
├── integration/
│   ├── search-index.test.ts
│   ├── sitemap.test.ts
│   └── generated-pages.test.ts
│
└── browser/
    ├── smoke.spec.ts
    ├── search.spec.ts
    └── mobile.spec.ts
```

---

# 49. Publication Policy 테스트 예

```ts
describe("publication policy", () => {
  it("does not allow superseded documents to be featured", () => {
    const document =
      createDocumentFixture({
        status: "superseded",
      });

    const decision =
      getPublicationDecision(
        document,
        "production",
      );

    expect(
      decision.canBeFeatured,
    ).toBe(false);
  });

  it("keeps historical documents readable but excludes them from RSS", () => {
    const document =
      createDocumentFixture({
        status: "historical",
      });

    const decision =
      getPublicationDecision(
        document,
        "production",
      );

    expect(decision.render).toBe(true);
    expect(
      decision.includeInRss,
    ).toBe(false);
  });
});
```

---

# 50. Migration 순서

현재 구조에서 위 구조로 한 번에 옮기지 않는다.

## 1단계

```text
Content Type
Content Status
Topic Registry
```

만 추가한다.

기존 UI는 그대로 둔다.

## 2단계

Manifest와 Publication Policy를 도입한다.

검색·Sitemap 중 하나만 먼저 연결한다.

## 3단계

홈 Featured와 Topic Hub를 Domain Query로 전환한다.

## 4단계

관련 글·검색·RSS·Sitemap을 동일 Manifest에 통합한다.

## 5단계

기존 중복 helper와 parser를 제거한다.

---

# 51. Strangler Pattern 적용

기존 구조를 유지하면서 새 경로를 조금씩 확장한다.

```text
기존 Post 데이터
     │
     ├── 기존 페이지
     │
     └── normalize()
           ↓
       새 Domain Model
           ↓
       새 Hub와 Search
```

처음부터 모든 기존 컴포넌트를 교체하지 않는다.

새 Home과 Hub부터 새 Domain을 사용하고, 기존 Article Page는 이후 전환할 수 있다.

---

# 52. 삭제 대상 후보

새 구조가 안정되면 다음을 찾는다.

```text
중복 Markdown parser
태그별 front matter loader
검색 전용 content loader
Sitemap 전용 loader
컴포넌트 내부 status 조건
Home 전용 featured flag
거대한 utils.ts
사용하지 않는 admin route
중복 date formatter
```

삭제는 새 구조가 동일 기능을 제공하는 것이 확인된 뒤 한다.

---

# 53. 피해야 할 과잉 아키텍처

이번 설계를 그대로 과도하게 구현하면 또 다른 문제가 된다.

다음은 필요 없다.

```text
Repository Pattern
Service Layer
Use Case Class
Dependency Injection Container
Event Bus
Graph Database
CQRS
Domain Event
Microfrontend
```

개인 정적 블로그다.

필요한 핵심 경계는 세 개뿐이다.

```text
Content Domain
Presentation
Build Tools
```

---

# 54. 권장 최소 구현

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

# 55. 최종 권장 디렉터리 구조

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

# 56. 아키텍처 불변조건

이 프로젝트에서 지켜야 할 핵심 규칙을 줄이면 다음이다.

```text
1. 콘텐츠 공개 정책은 한 곳에 있다.

2. Topic과 Featured는 자유 문자열이 아니다.

3. UI 컴포넌트는 Markdown을 직접 검색하지 않는다.

4. 검색·RSS·Sitemap은 같은 Manifest를 사용한다.

5. Component는 콘텐츠 상태를 독자적으로 판단하지 않는다.

6. 수동 큐레이션과 자동 목록은 분리한다.

7. 정적 데이터 때문에 Client Store를 만들지 않는다.

8. Astro framework type은 Domain 경계에서 변환한다.

9. Generated 데이터는 원본과 구분한다.

10. 페이지는 얇고 Domain Query를 조합한다.
```

---

# 57. 첫 실제 구현 티켓

## ARC-01. Domain 기본 모델 생성

```text
ContentType
ContentStatus
ContentDocument
TopicDefinition
PublicationDecision
```

## ARC-02. Astro Entry Normalizer 생성

```text
CollectionEntry
→ ContentDocument
```

## ARC-03. Content Manifest 생성

```text
byId
byUrl
documents
```

## ARC-04. Publication Policy 중앙화

```text
render
index
search
sitemap
rss
featured
ads
```

## ARC-05. Topic Registry 이동

현재 흩어진 카테고리·Topic 상수를 한 곳으로 통합한다.

## ARC-06. Home Featured Curation 이동

front matter나 컴포넌트 내부 배열을 Domain Curation으로 이동한다.

## ARC-07. Topic Hub Query 작성

```text
Start Here
Featured
자동 Article 목록
```

## ARC-08. Search Generator를 Manifest 기반으로 변경

전체 Markdown을 다시 파싱하지 않게 한다.

## ARC-09. Sitemap과 RSS를 Publication Policy에 연결

## ARC-10. 기존 중복 loader 삭제

---

# 58. 권장 커밋 순서

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

# 59. 완료 기준

이 태스크는 폴더를 모두 옮겼다고 완료되는 것이 아니다.

다음이 충족돼야 한다.

```text
Content Status 규칙을 한 파일에서 변경할 수 있다.

Featured 문서 ID가 잘못되면 build가 실패한다.

검색과 Sitemap이 같은 공개 문서 집합을 사용한다.

Topic Hub가 Markdown 파일을 직접 다시 읽지 않는다.

페이지 컴포넌트가 status별 조건문을 반복하지 않는다.

관리자·검색·광고 기능이 콘텐츠 Domain과 분리된다.

Astro를 교체하더라도 Domain Model과 Policy를 상당 부분 재사용할 수 있다.
```

# 이번 단계의 핵심 결론

좋은 디렉터리 구조의 목적은 파일을 찾기 쉽게 만드는 데만 있지 않다.

> 같은 정책이 여러 위치에 복제되지 않게 하고, 콘텐츠의 의미와 화면 표현을 분리하는 것이 진짜 목적이다.

`hawk90.github.io`에 필요한 것은 복잡한 엔터프라이즈 아키텍처가 아니다.

```text
정규화된 Content Model
하나의 Manifest
하나의 Publication Policy
명시적인 Topic·Curation
얇은 Astro Page
표현 중심 Component
```

이 여섯 가지면 충분하다.

다음 단계는 **Task 3-16. Content Manifest와 Publication Policy 실제 TypeScript 설계**다. 이번 아키텍처에서 가장 중요한 두 요소를 실제 인터페이스, 생성 흐름, validation, query와 테스트 코드 수준으로 더 구체화하는 단계다.

## 62. assistant

# Task 3-16. Content Manifest와 Publication Policy 실제 TypeScript 설계

이번 단계는 앞서 만든 아키텍처에서 가장 핵심적인 두 요소를 실제 코드 수준으로 구체화한다.

```text
Content Manifest
+
Publication Policy
```

이 둘이 안정되면 다음 기능들이 같은 기준으로 움직일 수 있다.

```text
홈
Topic Hub
검색
관련 글
RSS
Sitemap
SEO
광고
검증
```

반대로 이 둘이 불명확하면 각 기능이 콘텐츠를 제각각 해석하게 된다.

---

# 1. 이번 설계의 목표

Content Manifest는 단순한 글 목록이 아니다.

> 원본 Markdown을 사이트 전체가 사용할 수 있는 일관된 콘텐츠 모델로 정규화한 결과다.

Publication Policy는 단순한 `published: true` 조건이 아니다.

> 문서 상태와 페이지 목적에 따라 어디에 노출할지를 결정하는 중앙 정책이다.

전체 흐름은 다음과 같다.

```text
Astro Content Entry
        ↓
구조 검증
        ↓
정규화
        ↓
ContentDocument
        ↓
전체 집합 검증
        ↓
ContentManifest
        ↓
Publication Policy
        ↓
검색·Sitemap·RSS·Hub·Featured
```

---

# 2. 설계 원칙

## 원칙 1. 원본과 정규화 모델을 분리한다

Astro의 raw entry를 사이트 전체에 전달하지 않는다.

```ts
CollectionEntry<"articles">
```

는 Astro에 종속된 입력 모델이다.

사이트 내부에서는 다음 모델을 사용한다.

```ts
ContentDocument
```

---

## 원칙 2. 형식 검증과 의미 검증을 분리한다

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

## 원칙 3. Publication Policy는 사실만 결정한다

정책은 다음을 결정한다.

```text
렌더링할 것인가
검색엔진 색인을 허용할 것인가
검색 인덱스에 넣을 것인가
Sitemap에 넣을 것인가
RSS에 넣을 것인가
Featured가 될 수 있는가
광고 대상이 될 수 있는가
```

다음은 정책에서 결정하지 않는다.

```text
홈 카드 몇 번째인가
어떤 색으로 표시할 것인가
최근 글 6개에 들어가는가
카드가 2열인가 3열인가
```

이런 것은 Query와 UI의 역할이다.

---

## 원칙 4. 모든 파생 시스템이 같은 Manifest를 사용한다

다음이 각각 Markdown을 다시 읽으면 안 된다.

```text
검색 생성기
Sitemap
RSS
Topic Hub
고아 문서 검사
관련 글
```

---

# 3. 디렉터리 구조

최소 구조는 다음 정도면 충분하다.

```text
src/domain/content/
├── content-type.ts
├── content-status.ts
├── content-model.ts
├── normalize-content.ts
├── content-manifest.ts
├── content-validation.ts
└── content-queries.ts

src/domain/publication/
├── publication-model.ts
├── publication-policy.ts
└── publication-filters.ts
```

초기에는 파일 수를 더 줄여도 된다.

```text
content-model.ts
content-manifest.ts
publication-policy.ts
```

핵심은 경계이지 파일 개수가 아니다.

---

# 4. Content Type 모델

```ts
export const CONTENT_TYPES = [
  "guide",
  "concept",
  "debug-note",
  "experiment",
  "source-walkthrough",
  "reference",
] as const;

export type ContentType =
  (typeof CONTENT_TYPES)[number];
```

## 타입별 의미

```ts
export const CONTENT_TYPE_LABELS: Record<
  ContentType,
  string
> = {
  guide: "Guide",
  concept: "Concept",
  "debug-note": "Debug Note",
  experiment: "Experiment",
  "source-walkthrough": "Source Walkthrough",
  reference: "Reference",
};
```

이 label mapping은 UI 계층으로 옮겨도 된다.

Domain에서 필요한 것은 enum 자체다.

---

# 5. Content Status 모델

```ts
export const CONTENT_STATUSES = [
  "current",
  "needs-review",
  "historical",
  "superseded",
  "archived",
] as const;

export type ContentStatus =
  (typeof CONTENT_STATUSES)[number];
```

## 상태의 의미

### `current`

현재도 대표 경로에서 적극적으로 노출할 수 있다.

### `needs-review`

내용 일부가 오래됐거나 검증이 필요하다.

### `historical`

과거 버전·환경을 설명하는 기록으로 유효하다.

### `superseded`

더 좋은 신판이나 통합 문서가 존재한다.

### `archived`

보존하지만 일반 탐색에서는 제외한다.

---

# 6. 날짜 모델

JavaScript `Date`를 Domain 전체에 사용할지 ISO 문자열을 사용할지 결정해야 한다.

## 선택안 A. Domain에서 `Date`

```ts
publishedAt: Date;
updatedAt?: Date;
lastVerifiedAt?: Date;
```

### 장점

```text
정렬과 비교가 편함
날짜 연산이 쉬움
잘못된 날짜를 초기에 제거 가능
```

### 단점

```text
직렬화할 때 변환 필요
timezone 실수가 생길 수 있음
```

## 선택안 B. ISO 날짜 문자열

```ts
publishedAt: string;
```

### 장점

```text
JSON 직렬화가 단순
Manifest 저장이 쉬움
날짜 의미가 명확
```

### 단점

```text
매번 parse 필요
정렬 규칙이 코드에 반복될 수 있음
```

## 권장

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

# 7. Tested Environment 모델

모든 분야를 하나의 거대한 고정 구조로 만들지 않는다.

```ts
export interface TestedEnvironment {
  os?: string;
  kernel?: string;
  architecture?: string;

  compiler?: string;
  toolchain?: string;

  hardware?: string;
  sdk?: string;
  runtime?: string;

  notes?: readonly string[];
}
```

예:

```yaml
testedWith:
  os: CentOS 7.9
  kernel: 3.10.0-1160
  architecture: x86_64
  hardware: AMD Alveo U250
  sdk: XRT 2.13.466
  toolchain: Vivado 2021.2
```

CUDA 글:

```yaml
testedWith:
  os: Windows 11
  architecture: x86_64
  hardware: NVIDIA GTX 1070
  sdk: CUDA 11.8
  compiler: MSVC 2019
```

## 피해야 할 구조

```ts
interface TestedEnvironment {
  cudaVersion?: string;
  xrtVersion?: string;
  vivadoVersion?: string;
  linuxVersion?: string;
  rustVersion?: string;
  nodeVersion?: string;
  ...
}
```

새 기술이 추가될 때마다 Domain 모델이 비대해진다.

---

# 8. Heading 모델

검색과 anchor 검증에 사용한다.

```ts
export interface ContentHeading {
  id: string;
  text: string;
  depth: 2 | 3 | 4 | 5 | 6;
}
```

H1은 일반적으로 문서 title에서 생성하므로 본문 heading manifest에는 H2 이하만 포함해도 된다.

예:

```ts
const headings: ContentHeading[] = [
  {
    id: "bar-size-probing",
    text: "BAR 크기 탐색",
    depth: 2,
  },
];
```

---

# 9. Link 모델

내부 링크와 외부 링크를 구분한다.

```ts
export type ContentLink =
  | InternalContentLink
  | ExternalContentLink;

export interface InternalContentLink {
  kind: "internal";
  href: string;
  targetDocumentId?: string;
  anchor?: string;
  text?: string;
}

export interface ExternalContentLink {
  kind: "external";
  href: string;
  text?: string;
}
```

## 왜 `targetDocumentId`가 선택인가

원본 Markdown에는 URL만 있을 수 있다.

```md
[BAR 설명](/articles/pcie-bar-sizing/)
```

Manifest 생성 시 URL을 문서 ID로 해석할 수 있다.

하지만:

- 정적 페이지
- 이미지
- Topic Hub
- 아직 redirect를 거치는 링크

는 article ID로 해석되지 않을 수 있다.

---

# 10. 관계 모델

```ts
export interface ContentRelations {
  prerequisites: readonly string[];
  next: readonly string[];
  related: readonly string[];
  supersededBy?: string;
}
```

상위 Topic은 이미 `topicId`로 있으므로 `parent` relation에 중복 저장하지 않아도 된다.

## 왜 `next`가 배열인가

대부분 하나일 수 있지만 학습 경로가 여러 갈래일 수 있다.

```text
PCIe BAR
→ Linux mmap
→ Firmware resource allocation
```

다만 UI에서는 최대 1~2개만 노출하는 정책을 둘 수 있다.

---

# 11. ContentDocument 전체 모델

```ts
export interface ContentDocument {
  id: string;

  sourcePath: string;
  slug: string;
  url: string;

  title: string;
  description: string;

  type: ContentType;
  status: ContentStatus;
  topicId: string;

  publishedAt: string;
  updatedAt?: string;
  lastVerifiedAt?: string;

  testedWith?: TestedEnvironment;

  headings: readonly ContentHeading[];
  links: readonly ContentLink[];

  relations: ContentRelations;

  aliases: readonly string[];
  symbols: readonly string[];
  errorMessages: readonly string[];

  contentHash: string;
}
```

---

# 12. 선택 필드와 필수 필드의 경계

## 대표 문서 필수

```text
id
title
description
type
status
topicId
publishedAt
```

## 기존 글 호환을 위해 선택 가능

```text
lastVerifiedAt
testedWith
aliases
symbols
errorMessages
relations
```

## 관계 배열은 `undefined`보다 빈 배열 권장

```ts
relations: {
  prerequisites: [],
  next: [],
  related: [],
}
```

이렇게 하면 모든 Query가 null check를 반복하지 않는다.

---

# 13. Raw Front Matter 모델

Astro schema를 통과한 원본 데이터는 아직 Domain 모델이 아니다.

예:

```ts
export interface RawArticleData {
  id: string;
  slug?: string;

  title: string;
  description: string;

  type?: ContentType;
  status?: ContentStatus;
  topic?: string;

  published: Date;
  updated?: Date;
  lastVerified?: Date;

  testedWith?: TestedEnvironment;

  prerequisites?: string[];
  next?: string[];
  related?: string[];
  supersededBy?: string;

  aliases?: string[];
  symbols?: string[];
  errorMessages?: string[];
}
```

기존 콘텐츠 호환 기간에는 `type`, `status`, `topic`이 optional일 수 있다.

하지만 대표 문서에는 별도 semantic validation으로 강제한다.

---

# 14. 기존 글의 기본값 정책

모든 기존 글에 `current`를 자동 부여하면 위험하다.

권장 과도기 정책:

```ts
function resolveStatus(
  rawStatus: ContentStatus | undefined,
): ContentStatus {
  return rawStatus ?? "needs-review";
}
```

문제는 이렇게 하면 기존 수백 개 글에 경고 배너가 표시될 수 있다는 점이다.

따라서 내부 상태와 화면 노출을 분리할 수 있다.

```ts
export interface ContentDocument {
  status: ContentStatus;
  statusWasExplicit: boolean;
}
```

예:

```ts
status: "needs-review",
statusWasExplicit: false,
```

UI에서는 과도기 동안 명시적으로 상태를 지정한 글에만 배너를 보여줄 수 있다.

하지만 Featured와 Start Here에서는 반드시 명시적 `current`를 요구한다.

```text
Legacy 문서의 일반 노출은 유지
대표 노출은 명시적 검증 필요
```

---

# 15. ID 정책

ID는 URL이나 파일명보다 안정적인 문서 정체성이다.

## 좋은 ID

```text
pcie-bar-sizing
linux-pci-enumeration
cuda-pinned-memory
```

## 피해야 할 ID

```text
post-183
2026-08-01-pcie-bar
src-content-pcie-bar-md
```

날짜와 물리 경로는 바뀔 수 있다.

## ID 불변 원칙

제목이나 URL이 바뀌어도 ID는 유지한다.

```text
ID: pcie-bar-sizing
Old URL: /posts/pcie-bar/
New URL: /articles/pcie-bar-sizing/
```

관계와 큐레이션은 계속 같은 ID를 사용한다.

---

# 16. URL 생성

URL 생성 규칙을 한 곳에 둔다.

```ts
export function buildArticleUrl(
  slug: string,
): string {
  return `/articles/${slug}/`;
}
```

기존 URL 체계를 유지해야 한다면 원본 front matter에서 URL을 받거나 redirect registry와 연동한다.

```ts
function resolveArticleUrl(
  raw: RawArticleData,
  sourcePath: string,
): string {
  const slug =
    raw.slug ?? deriveSlugFromSource(sourcePath);

  return buildArticleUrl(slug);
}
```

## 주의

새 Domain 구조를 도입하면서 기존 URL을 한꺼번에 변경하지 않는다.

Manifest는 현재 URL을 정확히 표현해야 한다.

---

# 17. ISO 날짜 정규화

```ts
export function toIsoDate(
  value: Date | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid date value.");
  }

  return value.toISOString().slice(0, 10);
}
```

시간까지 필요한 경우 별도 함수를 사용한다.

게시 날짜가 한국 시간 기준인지 UTC 기준인지 정책을 문서화한다.

일반 기술 문서라면 날짜 단위만으로 충분한 경우가 많다.

---

# 18. 배열 정규화

alias와 relation에 중복이 들어갈 수 있다.

```ts
export function normalizeStringList(
  values: readonly string[] | undefined,
): string[] {
  if (!values) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}
```

대소문자 정규화는 필드별로 다르게 해야 한다.

문서 ID:

```text
lowercase 권장
```

Symbol:

```text
대소문자 보존
```

Alias:

```text
화면 원문은 보존
검색용 정규화는 별도
```

---

# 19. Content Hash

증분 생성과 변경 감지에 사용한다.

Hash 입력 후보:

```text
원본 본문
정규화된 front matter
parser version
extractor version
```

```ts
export interface ContentHashInput {
  sourceText: string;
  normalizedMetadata: unknown;
  extractorVersion: string;
}
```

```ts
import { createHash } from "node:crypto";

export function createContentHash(
  input: ContentHashInput,
): string {
  return createHash("sha256")
    .update(input.sourceText)
    .update(
      JSON.stringify(input.normalizedMetadata),
    )
    .update(input.extractorVersion)
    .digest("hex");
}
```

## 주의

객체 property 순서가 불안정하면 hash가 불필요하게 바뀔 수 있다.

정규화된 stable serialization을 사용하거나 metadata 객체 생성 순서를 고정한다.

---

# 20. Entry 정규화 함수

```ts
interface NormalizeArticleInput {
  sourcePath: string;
  rawData: RawArticleData;
  sourceText: string;
  headings: ContentHeading[];
  links: ContentLink[];
}

export function normalizeArticle(
  input: NormalizeArticleInput,
): ContentDocument {
  const {
    sourcePath,
    rawData,
    sourceText,
    headings,
    links,
  } = input;

  const slug =
    rawData.slug ??
    deriveSlugFromSource(sourcePath);

  const status =
    rawData.status ?? "needs-review";

  const type =
    rawData.type ?? "reference";

  const topicId =
    rawData.topic ?? "unclassified";

  const normalizedMetadata = {
    id: rawData.id,
    slug,
    title: rawData.title.trim(),
    description:
      rawData.description.trim(),
    type,
    status,
    topicId,
    publishedAt:
      toIsoDate(rawData.published),
    updatedAt:
      toIsoDate(rawData.updated),
    lastVerifiedAt:
      toIsoDate(rawData.lastVerified),
  };

  return {
    id: rawData.id.trim(),
    sourcePath,
    slug,
    url: buildArticleUrl(slug),

    title: normalizedMetadata.title,
    description:
      normalizedMetadata.description,

    type,
    status,
    topicId,

    publishedAt:
      normalizedMetadata.publishedAt!,
    updatedAt:
      normalizedMetadata.updatedAt,
    lastVerifiedAt:
      normalizedMetadata.lastVerifiedAt,

    testedWith: rawData.testedWith,

    headings,
    links,

    relations: {
      prerequisites:
        normalizeStringList(
          rawData.prerequisites,
        ),
      next:
        normalizeStringList(rawData.next),
      related:
        normalizeStringList(
          rawData.related,
        ),
      supersededBy:
        rawData.supersededBy?.trim(),
    },

    aliases:
      normalizeStringList(rawData.aliases),
    symbols:
      normalizeStringList(rawData.symbols),
    errorMessages:
      normalizeStringList(
        rawData.errorMessages,
      ),

    contentHash:
      createContentHash({
        sourceText,
        normalizedMetadata,
        extractorVersion: "1",
      }),
  };
}
```

---

# 21. 기본 타입을 `reference`로 두는 문제

위 예시에서는 기존 글의 type이 없을 때 `reference`를 사용했다.

하지만 이것도 의미 왜곡이다.

더 좋은 방법은 과도기 전용 타입을 두는 것이다.

```ts
type LegacyContentType =
  | ContentType
  | "unclassified";
```

하지만 장기 Domain 모델에 `unclassified`를 남기고 싶지 않을 수 있다.

## 권장 선택

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

# 22. ContentManifest 모델

```ts
export interface ContentManifest {
  documents: readonly ContentDocument[];

  byId: ReadonlyMap<
    string,
    ContentDocument
  >;

  byUrl: ReadonlyMap<
    string,
    ContentDocument
  >;

  byTopic: ReadonlyMap<
    string,
    readonly ContentDocument[]
  >;
}
```

추가 index가 필요하면 만들 수 있다.

```text
byStatus
byType
```

하지만 처음부터 모든 조합을 Map으로 만들 필요는 없다.

문서가 수백 개 수준이라면 배열 filter도 충분히 빠르다.

---

# 23. Manifest 생성

```ts
export function createContentManifest(
  documents: readonly ContentDocument[],
): ContentManifest {
  validateContentDocuments(documents);

  const byId =
    new Map<string, ContentDocument>();

  const byUrl =
    new Map<string, ContentDocument>();

  const byTopicMutable =
    new Map<string, ContentDocument[]>();

  for (const document of documents) {
    byId.set(document.id, document);
    byUrl.set(document.url, document);

    const topicDocuments =
      byTopicMutable.get(document.topicId) ??
      [];

    topicDocuments.push(document);
    byTopicMutable.set(
      document.topicId,
      topicDocuments,
    );
  }

  const byTopic =
    new Map<
      string,
      readonly ContentDocument[]
    >();

  for (
    const [topicId, topicDocuments]
    of byTopicMutable
  ) {
    byTopic.set(
      topicId,
      Object.freeze(
        [...topicDocuments],
      ),
    );
  }

  return Object.freeze({
    documents:
      Object.freeze([...documents]),
    byId,
    byUrl,
    byTopic,
  });
}
```

## 불변성

`ReadonlyMap`은 타입 수준에서만 readonly이고 실제 runtime Map은 수정 가능하다.

완전한 runtime 불변성이 필요하다면 wrapper를 만들 수 있지만 개인 블로그에서는 과도할 수 있다.

규칙으로 Manifest를 수정하지 않도록 유지해도 충분하다.

---

# 24. Manifest 전체 검증

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

# 25. Validation Issue 모델

문자열만 반환하면 자동화와 출력이 어려워진다.

```ts
export type ValidationSeverity =
  | "error"
  | "warning"
  | "info";

export interface ValidationIssue {
  ruleId: string;
  severity: ValidationSeverity;

  message: string;

  documentId?: string;
  sourcePath?: string;
  field?: string;

  suggestion?: string;
}
```

예:

```ts
{
  ruleId: "content/duplicate-id",
  severity: "error",
  message:
    "Duplicate content ID: pcie-bar-sizing",
  documentId: "pcie-bar-sizing",
  sourcePath:
    "src/content/articles/pcie/bar.md",
  suggestion:
    "Assign a unique stable content ID.",
}
```

---

# 26. 중복 ID 검사

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

# 27. 중복 URL 검사

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

# 28. Topic 검증

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

# 29. Relation 대상 검증

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

# 30. 자기 참조 검증

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

# 31. Superseded 상태 검증

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

# 32. Supersession Cycle 검사

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

# 33. Prerequisite Cycle

Prerequisite cycle은 무조건 오류일 수도 있고, 기술 개념상 상호 이해가 필요한 경우도 있다.

그러나 “필수 선행” 관계라면 cycle은 학습 경로를 막는다.

```text
A를 이해하려면 B 필요
B를 이해하려면 A 필요
```

따라서 cycle을 error 또는 warning으로 둔다.

초기에는 warning이 현실적이다.

```ts
severity: "warning"
```

대표 Guide의 Start Here 경로에서는 error로 강화할 수 있다.

---

# 34. Publication Decision 모델

```ts
export interface PublicationDecision {
  render: boolean;

  index: boolean;
  follow: boolean;

  includeInSearch: boolean;
  includeInSitemap: boolean;
  includeInRss: boolean;
  includeInTopicLists: boolean;

  canBeFeatured: boolean;
  adsEligible: boolean;

  searchRankMultiplier: number;
}
```

`searchRankMultiplier`까지 Policy에 넣을지 Search Domain에 둘지는 선택이다.

상태와 검색 노출의 기본 관계이므로 Publication에 둘 수도 있다.

하지만 검색 알고리즘과 결합되는 것이 싫다면 Search Domain에서 상태별 가중치를 정의한다.

---

# 35. 환경 모델

```ts
export type BuildEnvironment =
  | "development"
  | "preview"
  | "production";
```

Preview와 Production의 차이가 있을 수 있다.

예:

```text
Preview에서는 draft 렌더링
Production에서는 draft 제외
```

현재 모델에 draft 상태가 없다면 raw front matter에 `draft: boolean`을 별도로 둘 수 있다.

---

# 36. Draft와 Content Status 관계

Draft는 상태 모델에 넣지 않는 편이 낫다.

이유:

```text
draft는 발행 흐름 상태
current/historical은 공개 후 의미 상태
```

서로 축이 다르다.

따라서:

```ts
export interface ContentDocument {
  draft: boolean;
  status: ContentStatus;
}
```

예:

```yaml
draft: true
status: needs-review
```

Production에서 렌더되지 않는다.

검토가 끝난 뒤:

```yaml
draft: false
status: current
```

---

# 37. Publication Policy 기본 구현

```ts
export function getPublicationDecision(
  document: ContentDocument,
  environment: BuildEnvironment,
): PublicationDecision {
  if (document.draft) {
    return getDraftDecision(environment);
  }

  switch (document.status) {
    case "current":
      return currentDecision();

    case "needs-review":
      return needsReviewDecision();

    case "historical":
      return historicalDecision();

    case "superseded":
      return supersededDecision();

    case "archived":
      return archivedDecision();

    default:
      return assertNever(document.status);
  }
}
```

---

# 38. Current 정책

```ts
function currentDecision():
  PublicationDecision {
  return {
    render: true,

    index: true,
    follow: true,

    includeInSearch: true,
    includeInSitemap: true,
    includeInRss: true,
    includeInTopicLists: true,

    canBeFeatured: true,
    adsEligible: true,

    searchRankMultiplier: 1,
  };
}
```

---

# 39. Needs Review 정책

```ts
function needsReviewDecision():
  PublicationDecision {
  return {
    render: true,

    index: true,
    follow: true,

    includeInSearch: true,
    includeInSitemap: true,
    includeInRss: false,
    includeInTopicLists: true,

    canBeFeatured: false,
    adsEligible: false,

    searchRankMultiplier: 0.75,
  };
}
```

## RSS 제외 여부

`needs-review` 글도 신규 발행 글일 수 있으므로 무조건 RSS 제외가 맞지 않을 수 있다.

상태와 발행 시점의 의미를 분리하려면 다음처럼 할 수 있다.

```text
기존 글이 오래돼 needs-review
신규 글이 검토 중
```

신규 글은 draft로 관리하는 편이 낫다.

따라서 공개 `needs-review`는 RSS에서 제외하는 것이 일관적일 수 있다.

---

# 40. Historical 정책

```ts
function historicalDecision():
  PublicationDecision {
  return {
    render: true,

    index: true,
    follow: true,

    includeInSearch: true,
    includeInSitemap: true,
    includeInRss: false,
    includeInTopicLists: true,

    canBeFeatured: false,
    adsEligible: false,

    searchRankMultiplier: 0.55,
  };
}
```

Historical도 Topic Hub의 별도 “Historical” 영역에는 나타날 수 있다.

`includeInTopicLists` 하나로는 일반 목록과 Historical 영역을 구분하기 어렵다.

이 경우 Query가 status를 보고 그룹을 나눈다.

---

# 41. Superseded 정책

두 가지 선택지가 있다.

## 선택안 A. `noindex`

```ts
function supersededDecision():
  PublicationDecision {
  return {
    render: true,

    index: false,
    follow: true,

    includeInSearch: false,
    includeInSitemap: false,
    includeInRss: false,
    includeInTopicLists: false,

    canBeFeatured: false,
    adsEligible: false,

    searchRankMultiplier: 0,
  };
}
```

장점:

```text
구판이 검색 결과에서 경쟁하지 않음
신판으로 이동 유도
```

## 선택안 B. Historical 검색 의도에 대응

과거 버전 검색 유입이 중요한 글은 index를 유지할 수 있다.

```text
CUDA 11.8 설치
XRT 2.13 U250
Linux 3.10 driver
```

이 경우 상태를 `historical`로 두는 편이 더 정확하다.

즉:

```text
완전히 대체됨 → superseded
과거 버전에 독립 가치 → historical
```

---

# 42. Archived 정책

```ts
function archivedDecision():
  PublicationDecision {
  return {
    render: true,

    index: false,
    follow: false,

    includeInSearch: false,
    includeInSitemap: false,
    includeInRss: false,
    includeInTopicLists: false,

    canBeFeatured: false,
    adsEligible: false,

    searchRankMultiplier: 0,
  };
}
```

## Render를 유지하는 이유

기존 외부 링크와 기록 보존을 위해 직접 URL 접근은 가능하게 할 수 있다.

완전히 삭제할 문서는 별도 deletion·redirect 정책으로 처리한다.

---

# 43. Draft 정책

```ts
function getDraftDecision(
  environment: BuildEnvironment,
): PublicationDecision {
  if (environment === "production") {
    return {
      render: false,

      index: false,
      follow: false,

      includeInSearch: false,
      includeInSitemap: false,
      includeInRss: false,
      includeInTopicLists: false,

      canBeFeatured: false,
      adsEligible: false,

      searchRankMultiplier: 0,
    };
  }

  return {
    render: true,

    index: false,
    follow: false,

    includeInSearch: false,
    includeInSitemap: false,
    includeInRss: false,
    includeInTopicLists: false,

    canBeFeatured: false,
    adsEligible: false,

    searchRankMultiplier: 0,
  };
}
```

Preview에서는 렌더되지만 검색·Sitemap에는 들어가지 않는다.

---

# 44. Publication Policy의 조건 추가

상태 외에도 다음 조건이 필요할 수 있다.

```text
미래 발행 날짜
비공개 플래그
언어
법적 제거
```

정책을 switch 하나로 계속 키우기보다 단계형으로 구성할 수 있다.

```ts
export function getPublicationDecision(
  document: ContentDocument,
  environment: BuildEnvironment,
): PublicationDecision {
  const base =
    getStatusDecision(
      document.status,
    );

  return applyPublicationOverrides(
    base,
    document,
    environment,
  );
}
```

---

# 45. 미래 발행 문서

```ts
function applyScheduledPublication(
  decision: PublicationDecision,
  document: ContentDocument,
  now: Date,
): PublicationDecision {
  const publishedAt =
    new Date(document.publishedAt);

  if (publishedAt <= now) {
    return decision;
  }

  return {
    ...decision,

    render: false,
    index: false,

    includeInSearch: false,
    includeInSitemap: false,
    includeInRss: false,
    includeInTopicLists: false,

    canBeFeatured: false,
    adsEligible: false,
  };
}
```

테스트 가능성을 위해 `new Date()`를 함수 내부에서 직접 호출하지 않고 `now`를 주입한다.

---

# 46. Policy Context

```ts
export interface PublicationContext {
  environment: BuildEnvironment;
  now: Date;
}
```

```ts
export function getPublicationDecision(
  document: ContentDocument,
  context: PublicationContext,
): PublicationDecision
```

이 구조는 날짜 기반 테스트를 안정적으로 만든다.

---

# 47. Policy Override 순서

권장 순서:

```text
Draft
→ 미래 발행
→ 법적·강제 비공개
→ Content Status
→ 페이지별 추가 판단
```

예:

```ts
export function getPublicationDecision(
  document: ContentDocument,
  context: PublicationContext,
): PublicationDecision {
  if (document.draft) {
    return getDraftDecision(
      context.environment,
    );
  }

  if (
    isFutureDocument(
      document,
      context.now,
    )
  ) {
    return hiddenDecision();
  }

  return getStatusDecision(
    document.status,
  );
}
```

---

# 48. Publication Filter 함수

각 소비자가 boolean을 직접 확인하지 않도록 helper를 둘 수 있다.

```ts
export function isRenderable(
  document: ContentDocument,
  context: PublicationContext,
): boolean {
  return getPublicationDecision(
    document,
    context,
  ).render;
}
```

```ts
export function isSearchable(
  document: ContentDocument,
  context: PublicationContext,
): boolean {
  return getPublicationDecision(
    document,
    context,
  ).includeInSearch;
}
```

하지만 helper가 너무 많아지면 단순 property 접근을 감싼 함수만 늘어난다.

권장:

- 반복이 많은 핵심 필터만 제공
- 한 번 decision을 계산해 여러 곳에서 재사용

---

# 49. Decision 반복 계산 방지

문서마다 여러 generator가 Policy를 반복 호출해도 비용은 거의 없다.

하지만 일관성과 편의를 위해 Published Document 모델을 만들 수도 있다.

```ts
export interface EvaluatedDocument {
  document: ContentDocument;
  publication: PublicationDecision;
}
```

```ts
export function evaluateManifest(
  manifest: ContentManifest,
  context: PublicationContext,
): readonly EvaluatedDocument[] {
  return manifest.documents.map(
    (document) => ({
      document,
      publication:
        getPublicationDecision(
          document,
          context,
        ),
    }),
  );
}
```

검색·Sitemap·RSS가 같은 evaluated 결과를 공유한다.

---

# 50. Evaluated Manifest

```ts
export interface EvaluatedManifest {
  entries: readonly EvaluatedDocument[];

  byId: ReadonlyMap<
    string,
    EvaluatedDocument
  >;
}
```

하지만 `ContentManifest`와 `EvaluatedManifest`를 모두 전역으로 관리하면 복잡해질 수 있다.

초기에는 build context에서 한 번 만들어 전달하면 충분하다.

---

# 51. Query 기본 모델

```ts
export interface ContentQuery {
  topicIds?: readonly string[];
  types?: readonly ContentType[];
  statuses?: readonly ContentStatus[];

  includeDrafts?: boolean;

  sort?:
    | "published-desc"
    | "updated-desc"
    | "title-asc";

  limit?: number;
}
```

---

# 52. 범용 Query 구현

```ts
export function queryDocuments(
  manifest: ContentManifest,
  context: PublicationContext,
  query: ContentQuery = {},
): ContentDocument[] {
  let results =
    manifest.documents.filter(
      (document) => {
        const decision =
          getPublicationDecision(
            document,
            context,
          );

        if (!decision.render) {
          return false;
        }

        if (
          query.topicIds &&
          !query.topicIds.includes(
            document.topicId,
          )
        ) {
          return false;
        }

        if (
          query.types &&
          !query.types.includes(
            document.type,
          )
        ) {
          return false;
        }

        if (
          query.statuses &&
          !query.statuses.includes(
            document.status,
          )
        ) {
          return false;
        }

        return true;
      },
    );

  results = sortDocuments(
    results,
    query.sort ??
      "published-desc",
  );

  if (query.limit !== undefined) {
    results = results.slice(
      0,
      query.limit,
    );
  }

  return results;
}
```

---

# 53. 범용 Query의 한계

이 함수만 사용하면 중요한 의미가 호출부에 흩어진다.

```ts
queryDocuments(manifest, context, {
  topicIds: ["pcie-cxl"],
  statuses: ["current"],
  types: ["guide", "concept"],
  limit: 3,
});
```

이것이 Start Here인지 일반 목록인지 알기 어렵다.

따라서 큐레이션은 전용 함수가 적합하다.

```ts
getTopicStartHere(
  "pcie-cxl",
  manifest,
  curation,
)
```

범용 Query는 자동 목록에 사용한다.

```text
최근 글
Topic 전체 글
Debug Note 목록
Historical 목록
```

---

# 54. Featured Query

```ts
export function getFeaturedDocuments(
  ids: readonly string[],
  manifest: ContentManifest,
  context: PublicationContext,
): ContentDocument[] {
  return ids.map((id) => {
    const document =
      manifest.byId.get(id);

    if (!document) {
      throw new Error(
        `Featured document not found: ${id}`,
      );
    }

    const decision =
      getPublicationDecision(
        document,
        context,
      );

    if (!decision.canBeFeatured) {
      throw new Error(
        `Document "${id}" cannot be featured ` +
        `because its status is ` +
        `"${document.status}".`,
      );
    }

    return document;
  });
}
```

수동 큐레이션 오류는 조용히 필터링하지 않고 build를 실패시키는 것이 맞다.

---

# 55. Topic 목록 Query

```ts
export function getTopicDocuments(
  topicId: string,
  manifest: ContentManifest,
  context: PublicationContext,
): ContentDocument[] {
  return (
    manifest.byTopic.get(topicId) ??
    []
  )
    .filter((document) =>
      getPublicationDecision(
        document,
        context,
      ).includeInTopicLists
    )
    .sort(compareUpdatedDesc);
}
```

Historical은 별도 함수로 분리할 수 있다.

```ts
export function getHistoricalTopicDocuments(...)
```

---

# 56. Search Document 생성

```ts
export interface SearchDocument {
  id: string;
  url: string;

  title: string;
  description: string;

  headings: readonly string[];
  aliases: readonly string[];
  symbols: readonly string[];
  errorMessages: readonly string[];

  topicId: string;
  type: ContentType;
  status: ContentStatus;

  rankMultiplier: number;
}
```

```ts
export function buildSearchDocuments(
  manifest: ContentManifest,
  context: PublicationContext,
): SearchDocument[] {
  return manifest.documents.flatMap(
    (document) => {
      const decision =
        getPublicationDecision(
          document,
          context,
        );

      if (
        !decision.includeInSearch
      ) {
        return [];
      }

      return [{
        id: document.id,
        url: document.url,

        title: document.title,
        description:
          document.description,

        headings:
          document.headings.map(
            (heading) =>
              heading.text,
          ),

        aliases: document.aliases,
        symbols: document.symbols,
        errorMessages:
          document.errorMessages,

        topicId: document.topicId,
        type: document.type,
        status: document.status,

        rankMultiplier:
          decision
            .searchRankMultiplier,
      }];
    },
  );
}
```

---

# 57. Sitemap 생성

```ts
export interface SitemapEntry {
  url: string;
  lastModified?: string;
}
```

```ts
export function buildSitemapEntries(
  manifest: ContentManifest,
  context: PublicationContext,
): SitemapEntry[] {
  return manifest.documents.flatMap(
    (document) => {
      const decision =
        getPublicationDecision(
          document,
          context,
        );

      if (
        !decision.includeInSitemap
      ) {
        return [];
      }

      return [{
        url: document.url,
        lastModified:
          document.updatedAt ??
          document.publishedAt,
      }];
    },
  );
}
```

## 주의

Sitemap URL은 production origin이 필요할 수 있다.

Domain에서는 relative URL을 유지하고, Sitemap adapter에서 origin을 붙이는 편이 좋다.

---

# 58. RSS 생성

```ts
export function getRssDocuments(
  manifest: ContentManifest,
  context: PublicationContext,
): ContentDocument[] {
  return manifest.documents
    .filter((document) =>
      getPublicationDecision(
        document,
        context,
      ).includeInRss
    )
    .sort(comparePublishedDesc);
}
```

RSS와 최근 글은 같지 않을 수 있다.

예:

```text
최근 글 목록에는 needs-review 허용
RSS에는 current만 포함
```

정책을 분리할 수 있지만 이유가 명확해야 한다.

---

# 59. 페이지 Static Paths

```ts
export function getRenderableDocuments(
  manifest: ContentManifest,
  context: PublicationContext,
): ContentDocument[] {
  return manifest.documents.filter(
    (document) =>
      getPublicationDecision(
        document,
        context,
      ).render
  );
}
```

Astro:

```astro
---
export async function getStaticPaths() {
  const manifest =
    await getContentManifest();

  const context = {
    environment: "production",
    now: new Date(),
  } as const;

  return getRenderableDocuments(
    manifest,
    context,
  ).map((document) => ({
    params: {
      slug: document.slug,
    },
    props: {
      documentId: document.id,
    },
  }));
}
---
```

---

# 60. SEO Robots 생성

```ts
export interface RobotsDirective {
  index: boolean;
  follow: boolean;
}
```

```ts
export function buildRobotsDirective(
  document: ContentDocument,
  context: PublicationContext,
): RobotsDirective {
  const decision =
    getPublicationDecision(
      document,
      context,
    );

  return {
    index: decision.index,
    follow: decision.follow,
  };
}
```

HTML:

```html
<meta
  name="robots"
  content="noindex,follow"
/>
```

---

# 61. Status UI는 Policy와 다르다

Publication Policy가 `index=false`라고 해서 자동으로 경고 배너 문구를 결정하면 안 된다.

별도 UI 모델:

```ts
export interface StatusPresentation {
  showNotice: boolean;
  tone:
    | "neutral"
    | "warning"
    | "historical";

  title?: string;
  message?: string;
}
```

예:

```ts
export function getStatusPresentation(
  document: ContentDocument,
): StatusPresentation {
  switch (document.status) {
    case "current":
      return {
        showNotice: false,
        tone: "neutral",
      };

    case "needs-review":
      return {
        showNotice: true,
        tone: "warning",
        title: "검토가 필요한 문서",
        message:
          "일부 환경이나 버전 정보가 " +
          "현재와 다를 수 있습니다.",
      };

    case "historical":
      return {
        showNotice: true,
        tone: "historical",
        title: "과거 환경을 다루는 문서",
        message:
          "이 문서는 특정 시점의 " +
          "환경과 동작을 기록합니다.",
      };

    case "superseded":
      return {
        showNotice: true,
        tone: "warning",
        title: "새 문서로 대체됨",
        message:
          "현재 내용은 대체 문서를 " +
          "먼저 확인하세요.",
      };

    case "archived":
      return {
        showNotice: true,
        tone: "neutral",
        title: "보존 문서",
        message:
          "일반 학습 경로에서는 " +
          "사용하지 않는 기록입니다.",
      };
  }
}
```

---

# 62. Policy 테스트

## Current

```ts
it("allows current documents everywhere", () => {
  const document =
    createDocumentFixture({
      status: "current",
    });

  const decision =
    getPublicationDecision(
      document,
      testContext,
    );

  expect(decision.render).toBe(true);
  expect(decision.index).toBe(true);
  expect(
    decision.includeInSearch,
  ).toBe(true);
  expect(
    decision.canBeFeatured,
  ).toBe(true);
});
```

---

## Needs Review

```ts
it("does not allow needs-review documents to be featured", () => {
  const document =
    createDocumentFixture({
      status: "needs-review",
    });

  const decision =
    getPublicationDecision(
      document,
      testContext,
    );

  expect(
    decision.canBeFeatured,
  ).toBe(false);

  expect(
    decision.adsEligible,
  ).toBe(false);
});
```

---

## Historical

```ts
it("keeps historical documents searchable but not featured", () => {
  const document =
    createDocumentFixture({
      status: "historical",
    });

  const decision =
    getPublicationDecision(
      document,
      testContext,
    );

  expect(
    decision.includeInSearch,
  ).toBe(true);

  expect(
    decision.searchRankMultiplier,
  ).toBeLessThan(1);

  expect(
    decision.canBeFeatured,
  ).toBe(false);
});
```

---

## Superseded

```ts
it("keeps superseded pages readable but removes them from discovery surfaces", () => {
  const document =
    createDocumentFixture({
      status: "superseded",
      relations: {
        prerequisites: [],
        next: [],
        related: [],
        supersededBy:
          "replacement-document",
      },
    });

  const decision =
    getPublicationDecision(
      document,
      testContext,
    );

  expect(decision.render).toBe(true);
  expect(decision.index).toBe(false);

  expect(
    decision.includeInSearch,
  ).toBe(false);

  expect(
    decision.includeInSitemap,
  ).toBe(false);
});
```

---

# 63. 미래 날짜 테스트

```ts
it("does not publish scheduled future documents", () => {
  const document =
    createDocumentFixture({
      publishedAt: "2026-08-20",
    });

  const decision =
    getPublicationDecision(
      document,
      {
        environment: "production",
        now: new Date(
          "2026-08-01T00:00:00Z",
        ),
      },
    );

  expect(decision.render).toBe(false);
  expect(
    decision.includeInSearch,
  ).toBe(false);
});
```

---

# 64. Manifest 테스트

## 중복 ID

```ts
it("rejects duplicate document IDs", () => {
  const documents = [
    createDocumentFixture({
      id: "duplicate",
    }),
    createDocumentFixture({
      id: "duplicate",
      slug: "other",
    }),
  ];

  expect(() =>
    createContentManifest(documents)
  ).toThrow(
    /Duplicate content ID/,
  );
});
```

---

## Relation target

```ts
it("rejects missing relation targets", () => {
  const documents = [
    createDocumentFixture({
      id: "article-a",
      relations: {
        prerequisites: [
          "missing-article",
        ],
        next: [],
        related: [],
      },
    }),
  ];

  expect(() =>
    createContentManifest(documents)
  ).toThrow(
    /does not exist/,
  );
});
```

---

# 65. Featured 테스트

```ts
it("rejects a historical document in home featured curation", () => {
  const document =
    createDocumentFixture({
      id: "old-guide",
      status: "historical",
    });

  const manifest =
    createContentManifest([
      document,
    ]);

  expect(() =>
    getFeaturedDocuments(
      ["old-guide"],
      manifest,
      testContext,
    )
  ).toThrow(
    /cannot be featured/,
  );
});
```

---

# 66. Publication Set 일치 테스트

검색과 Sitemap의 문서 집합을 비교할 때 반드시 같아야 하는 것은 아니다.

Historical 정책 때문에 차이가 있을 수 있다.

대신 각 집합이 Policy 결과와 일치하는지 검사한다.

```ts
it("builds search documents from publication decisions", () => {
  const manifest =
    createContentManifest(
      fixtureDocuments,
    );

  const expectedIds =
    manifest.documents
      .filter(
        (document) =>
          getPublicationDecision(
            document,
            testContext,
          ).includeInSearch
      )
      .map(
        (document) => document.id,
      )
      .sort();

  const actualIds =
    buildSearchDocuments(
      manifest,
      testContext,
    )
      .map((document) => document.id)
      .sort();

  expect(actualIds).toEqual(
    expectedIds,
  );
});
```

Sitemap와 RSS도 같은 방식으로 검사한다.

---

# 67. 오류 보고 형식

여러 오류가 있을 때 첫 오류에서 즉시 throw하면 전체 수정이 느려진다.

모든 Issue를 모은 뒤 출력한다.

```text
Content validation failed with 4 errors and 3 warnings.

ERROR content/duplicate-url
  Document: pcie-bar-old
  Source: src/content/articles/pcie/bar-old.md
  URL: /articles/pcie-bar-sizing/

ERROR content/missing-relation-target
  Document: linux-pci-enumeration
  Field: prerequisites
  Missing target: pcie-configuration-space

WARNING content/unclassified-topic
  Document: old-cuda-note
```

CI에서는 오류가 있으면 exit code 1.

Warning은 report만 남긴다.

---

# 68. ContentValidationError

```ts
export class ContentValidationError
  extends Error {
  readonly issues:
    readonly ValidationIssue[];

  constructor(
    issues:
      readonly ValidationIssue[],
  ) {
    super(
      formatValidationIssues(issues),
    );

    this.name =
      "ContentValidationError";

    this.issues = issues;
  }
}
```

---

# 69. Warning 정책

초기 migration에서 warning이 너무 많으면 아무도 보지 않는다.

따라서 Warning도 운영해야 한다.

## 초기 Warning

```text
unclassified topic
missing type
lastVerified 없음
대형 코드 블록
```

## Error

```text
중복 ID
중복 URL
없는 relation
Featured 비current
Draft Sitemap 유출
superseded target 없음
```

## 점진 강화

대표 문서에 대해서는 다음을 Error로 강화한다.

```text
type 없음
topic 없음
description 없음
상태 미명시
```

일반 Legacy 문서에는 Warning을 유지한다.

---

# 70. Validation Profile

```ts
export type ValidationProfile =
  | "legacy"
  | "representative"
  | "strict";
```

## Legacy

기존 콘텐츠 호환.

```text
필수 구조 오류만 차단
```

## Representative

대표 문서·Featured 기준.

```text
type/topic/status/description 필수
```

## Strict

신규 콘텐츠 기준.

```text
모든 metadata와 관계 정책 강제
```

문서별 profile을 metadata에 넣기보다 큐레이션 집합과 경로에 따라 적용한다.

---

# 71. 대표 문서 validation

```ts
export function validateRepresentativeDocument(
  document: ContentDocument,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (
    document.status !== "current"
  ) {
    issues.push({
      ruleId:
        "representative/not-current",
      severity: "error",
      documentId: document.id,
      message:
        "Representative documents " +
        "must have status=current.",
    });
  }

  if (
    document.topicId ===
    "unclassified"
  ) {
    issues.push({
      ruleId:
        "representative/missing-topic",
      severity: "error",
      documentId: document.id,
      message:
        "Representative documents " +
        "must have a primary topic.",
    });
  }

  if (
    !document.description.trim()
  ) {
    issues.push({
      ruleId:
        "representative/missing-description",
      severity: "error",
      documentId: document.id,
      message:
        "Representative documents " +
        "must have a description.",
    });
  }

  return issues;
}
```

---

# 72. Policy를 Config 데이터로 만들지 코드로 만들지

다음처럼 YAML로 만들 수 있다.

```yaml
current:
  index: true
  sitemap: true
  featured: true
```

장점:

```text
설정 수정이 쉬움
정책 표가 명확함
```

단점:

```text
미래 날짜, draft 등 조건 분기 표현 어려움
잘못된 조합 방지 어려움
타입과 테스트가 약해짐
```

## 권장

기본 정책은 TypeScript 코드로 둔다.

문서화용 정책 표를 별도로 생성하거나 README에 유지한다.

---

# 73. Policy Matrix 문서

| 상태 | Render | Index | Search | Sitemap | RSS | Featured | Ads |
|---|---:|---:|---:|---:|---:|---:|---:|
| Current | O | O | O | O | O | O | 조건부 |
| Needs Review | O | O | O | O | X | X | X |
| Historical | O | O | O | O | X | X | X |
| Superseded | O | X | X | X | X | X | X |
| Archived | O | X | X | X | X | X | X |
| Draft | Preview만 | X | X | X | X | X | X |

이 표와 코드가 어긋나지 않게 테스트할 수 있다.

---

# 74. Policy Snapshot을 피해야 하는 이유

전체 decision 객체를 snapshot으로 고정하면 정책 하나를 바꿀 때 많은 snapshot이 깨질 수 있다.

중요한 계약만 명시적으로 테스트한다.

```ts
expect(decision.canBeFeatured)
  .toBe(false);
```

```ts
expect(decision.index)
  .toBe(true);
```

정책 전체 변경을 검토하려면 matrix test를 사용한다.

---

# 75. Matrix Test

```ts
const cases = [
  {
    status: "current",
    expected: {
      index: true,
      featured: true,
    },
  },
  {
    status: "historical",
    expected: {
      index: true,
      featured: false,
    },
  },
  {
    status: "superseded",
    expected: {
      index: false,
      featured: false,
    },
  },
] as const;

it.each(cases)(
  "applies publication policy for $status",
  ({ status, expected }) => {
    const document =
      createDocumentFixture({
        status,
      });

    const decision =
      getPublicationDecision(
        document,
        testContext,
      );

    expect(decision.index)
      .toBe(expected.index);

    expect(
      decision.canBeFeatured,
    ).toBe(expected.featured);
  },
);
```

---

# 76. Manifest Cache

Astro build 과정에서 Manifest를 여러 번 요청할 수 있다.

```ts
let manifestPromise:
  Promise<ContentManifest> | undefined;

export function getContentManifest():
  Promise<ContentManifest> {
  if (!manifestPromise) {
    manifestPromise =
      loadAndCreateManifest();
  }

  return manifestPromise;
}
```

## Promise를 cache하는 이유

동시에 여러 호출이 들어오면 Manifest를 중복 생성하지 않는다.

```text
Page static paths
Sitemap
RSS
Search
```

가 동시에 요청해도 한 번만 실행된다.

---

# 77. Cache Reset

테스트와 개발 HMR에서 필요할 수 있다.

```ts
export function resetContentManifestCache():
  void {
  manifestPromise = undefined;
}
```

Production 코드에서 무분별하게 호출하지 않는다.

---

# 78. Manifest 직렬화

빌드 디버깅과 다른 script에서 사용할 수 있도록 JSON으로 저장할 수 있다.

```ts
export interface SerializedContentDocument {
  id: string;
  url: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  topicId: string;
  contentHash: string;
}
```

전체 내부 정보를 모두 공개 artifact에 넣지 않는다.

## 내부 Manifest

```text
sourcePath
전체 links
relation
```

## 공개 Search JSON

```text
검색에 필요한 필드만
```

---

# 79. Manifest를 브라우저에 그대로 보내지 않기

Content Manifest는 build-time Domain 데이터다.

브라우저로 전달하면 다음 문제가 생긴다.

```text
불필요한 크기
source path 노출
관리용 상태 노출
관계 데이터 과다
```

검색에는 별도 최소 Search Document를 사용한다.

---

# 80. Content Manifest 생성 단계

권장 처리 순서:

```text
1. Content Collection 읽기
2. Front Matter schema 검증
3. Markdown parsing
4. Heading·link·symbol 추출
5. Domain normalize
6. 문서별 validation
7. 전체 집합 validation
8. Manifest index 생성
9. Curation validation
10. 파생 산출물 생성
```

---

# 81. 전체 AST 보존 금지

Manifest에는 AST를 넣지 않는다.

```text
Markdown AST
Shiki token
렌더링 HTML
```

은 문서 렌더링 단계에서만 사용한다.

Manifest는 작고 직렬화 가능한 metadata 중심으로 유지한다.

---

# 82. Markdown Render와 Manifest 추출

Astro Content Collection이 이미 Markdown을 처리한다면 heading과 body를 얻는 방법을 현재 framework 흐름에 맞춰야 한다.

핵심은 다음이다.

```text
Manifest를 만들기 위해
모든 문서를 다시 별도 remark parse하지 않는다.
```

Astro가 제공하는 heading·render 결과를 재사용하거나, 공통 remark plugin에서 metadata를 수집한다.

---

# 83. Metadata Collector Plugin

공통 remark plugin을 만든다면 다음을 수집할 수 있다.

```text
heading
internal link
external link
code language
symbol 후보
error block
```

Plugin 결과를 front matter에 다시 쓰지 않고 build metadata로 전달한다.

단, plugin이 global mutable array에 데이터를 쌓는 구조는 HMR과 병렬 처리에서 위험하다.

문서별 결과를 반환하는 구조가 낫다.

---

# 84. 문서별 Parse Result

```ts
export interface ContentParseResult {
  headings: ContentHeading[];
  links: ContentLink[];

  codeBlocks: {
    language: string;
    role?: string;
    lineCount: number;
  }[];

  symbols: string[];
  errorMessages: string[];
}
```

이 결과 중 Manifest에 필요한 것만 넣는다.

대형 code 원문은 저장하지 않는다.

---

# 85. 오류 메시지 추출

모든 로그 줄을 추출하면 검색 노이즈가 커진다.

권장:

```text
role="error"
title="Error"
front matter errorMessages
```

처럼 명시된 영역만 추출한다.

예:

````md
```text role="error"
failed to load xclbin
```
````

---

# 86. Symbol 추출

자동 추출은 후보만 만든다.

```text
snake_case
camelCase
namespace::symbol
UPPER_CASE_MACRO
```

너무 일반적인 symbol은 제외한다.

```text
main
size
data
value
```

대표 문서에는 front matter에서 명시적으로 보완할 수 있다.

```yaml
symbols:
  - pci_scan_child_bus
  - pci_bus_add_devices
```

---

# 87. Manifest Version

Schema와 extractor가 변경되면 생성 캐시를 무효화해야 한다.

```ts
export const CONTENT_MANIFEST_VERSION =
  "1";
```

Hash 입력에 포함한다.

```ts
createContentHash({
  sourceText,
  normalizedMetadata,
  extractorVersion:
    CONTENT_MANIFEST_VERSION,
});
```

---

# 88. Publication Policy Version

정책 변경 자체는 Content Hash를 바꿀 필요가 없다.

하지만 Search·Sitemap 파생 산출물은 다시 생성해야 한다.

```ts
export const PUBLICATION_POLICY_VERSION =
  "1";
```

파생 artifact hash에 포함한다.

```text
contentHash
+
publicationPolicyVersion
+
generatorVersion
```

---

# 89. Build Report

Manifest 생성 후 다음을 출력한다.

```text
Content Manifest
- Documents: 532
- Current: 84
- Needs Review: 341
- Historical: 65
- Superseded: 28
- Archived: 14
- Unclassified Topics: 93
- Relations: 214
- Searchable: 476
- Sitemap: 472
- Featured Eligible: 84
```

이 수치는 migration 진행 상태를 보여준다.

---

# 90. 초기 도입 시 예상 문제

## 문제 1. 기존 글 대부분이 `needs-review`

정상이다.

대표 글부터 `current`로 승격한다.

## 문제 2. Topic 미분류가 많음

처음부터 전체 분류하지 않는다.

대표 글과 검색 유입 글부터 처리한다.

## 문제 3. Relation 대상이 없는 문서가 많음

기존 front matter relation이 있다면 정리한다.

relation을 아직 사용하지 않는 일반 글에는 빈 배열을 둔다.

## 문제 4. URL 중복

기존 slug 생성 규칙과 신규 URL 규칙이 충돌할 수 있다.

URL migration보다 현재 URL 보존이 우선이다.

---

# 91. 점진적 도입 모드

```ts
export interface ManifestBuildOptions {
  migrationMode: boolean;
  failOnWarnings: boolean;
}
```

## Migration Mode

```text
unclassified topic → warning
missing explicit status → warning
missing type → warning
```

## Strict Mode

```text
신규 문서 type/topic/status 누락 → error
대표 문서 누락 → error
```

Production 전체를 strict로 바꾸는 것은 migration이 끝난 뒤다.

---

# 92. 신규 문서 강제 규칙

기존 글은 Legacy 허용, 신규 글은 strict를 적용하려면 기준이 필요하다.

가능한 방법:

```text
특정 날짜 이후 작성
특정 디렉터리
Git diff 신규 파일
```

가장 안정적인 것은 Git diff 기반 CI다.

```text
새로 추가된 Markdown
→ strict schema 적용
```

기존 글 수정 시에는 대표 문서 여부에 따라 적용한다.

---

# 93. Manifest와 Git Diff

변경 문서 검사:

```text
변경 Markdown 파일
→ 해당 문서 normalize
→ strict validation
→ 전체 Manifest 불변조건 검증
```

전체 Manifest는 slug·relation 무결성 때문에 여전히 확인한다.

하지만 무거운 본문 처리만 변경 문서 중심으로 줄일 수 있다.

---

# 94. 삭제 문서 처리

문서가 삭제되면 다음을 함께 검사한다.

```text
다른 relation이 참조하는가
Featured에 남아 있는가
Hub Start Here에 남아 있는가
redirect가 필요한가
검색 캐시가 남아 있는가
```

단순 파일 삭제만으로 끝내지 않는다.

---

# 95. Redirect Registry 연결

```ts
export interface RedirectEntry {
  from: string;
  to: string;
  reason:
    | "renamed"
    | "merged"
    | "superseded"
    | "moved";
}
```

Manifest validation에서:

```text
redirect target가 존재하는가
redirect source가 현재 canonical URL과 충돌하는가
cycle이 있는가
```

를 검사한다.

---

# 96. 삭제와 Superseded의 차이

## Superseded

구판 페이지를 유지하며 새 글을 안내한다.

```text
과거 문맥 가치 있음
```

## Redirect

기존 페이지의 독립 가치가 거의 없다.

```text
신판이 완전히 대체
```

## 404·제거

대체할 콘텐츠가 없고 보존 가치도 없다.

---

# 97. Article Page Model 생성

```ts
export interface ArticlePageModel {
  document: ContentDocument;

  publication:
    PublicationDecision;

  statusPresentation:
    StatusPresentation;

  replacement?:
    ContentDocument;

  prerequisites:
    ContentDocument[];

  next:
    ContentDocument[];

  related:
    ContentDocument[];
}
```

생성:

```ts
export function buildArticlePageModel(
  document: ContentDocument,
  manifest: ContentManifest,
  context: PublicationContext,
): ArticlePageModel {
  const publication =
    getPublicationDecision(
      document,
      context,
    );

  return {
    document,
    publication,

    statusPresentation:
      getStatusPresentation(
        document,
      ),

    replacement:
      document.relations.supersededBy
        ? manifest.byId.get(
            document.relations
              .supersededBy,
          )
        : undefined,

    prerequisites:
      requireDocuments(
        document.relations
          .prerequisites,
        manifest,
      ),

    next:
      requireDocuments(
        document.relations.next,
        manifest,
      ),

    related:
      requireDocuments(
        document.relations.related,
        manifest,
      ),
  };
}
```

---

# 98. `requireDocuments`

```ts
export function requireDocuments(
  ids: readonly string[],
  manifest: ContentManifest,
): ContentDocument[] {
  return ids.map((id) => {
    const document =
      manifest.byId.get(id);

    if (!document) {
      throw new Error(
        `Required content document ` +
        `"${id}" was not found.`,
      );
    }

    return document;
  });
}
```

Manifest validation이 먼저 실행됐다면 여기서 실패할 가능성은 낮다.

그래도 조용히 무시하지 않는다.

---

# 99. Related 문서 상태 필터

relation 대상이 존재하더라도 Archived나 Superseded를 UI에서 추천하면 안 된다.

```ts
export function getVisibleRelatedDocuments(
  ids: readonly string[],
  manifest: ContentManifest,
  context: PublicationContext,
): ContentDocument[] {
  return requireDocuments(
    ids,
    manifest,
  ).filter((document) =>
    getPublicationDecision(
      document,
      context,
    ).includeInTopicLists
  );
}
```

그러나 수동 relation에 Archived가 들어간 것은 데이터 오류일 수 있다.

대표 문서 relation에서는 warning 또는 error로 검증한다.

---

# 100. 이번 단계의 최소 구현 범위

처음부터 모든 코드를 만들 필요는 없다.

1차 구현은 다음이면 충분하다.

```text
ContentDocument
ContentManifest
normalizeArticle()
validateUniqueIds()
validateUniqueUrls()
validateRelationTargets()
PublicationDecision
getPublicationDecision()
getFeaturedDocuments()
buildSearchDocuments()
buildSitemapEntries()
기본 Policy 테스트
```

그 이후:

```text
Cycle 검사
Redirect
Evaluated Manifest
증분 Cache
Validation Profile
```

를 추가한다.

---

# 첫 실제 구현 티켓

## CPM-01. Content Domain 타입

```text
ContentType
ContentStatus
ContentDocument
ContentRelations
TestedEnvironment
```

## CPM-02. Raw Entry Normalizer

```text
Astro entry
→ ContentDocument
```

## CPM-03. Content Manifest

```text
documents
byId
byUrl
byTopic
```

## CPM-04. 필수 Validation

```text
중복 ID
중복 URL
잘못된 Topic
없는 relation
자기 참조
```

## CPM-05. Publication Policy

```text
current
needs-review
historical
superseded
archived
draft
```

## CPM-06. Featured Validation

```text
current만 허용
```

## CPM-07. Search·Sitemap Adapter

동일 Policy 결과를 사용한다.

## CPM-08. 테스트

```text
상태 Matrix
중복 ID
없는 relation
Featured historical 차단
Draft production 제외
```

---

# 권장 커밋 순서

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

# 완료 기준

이 태스크는 다음이 가능해지면 완료다.

```text
한 문서의 상태를 바꾸면
검색·Sitemap·RSS·Featured 정책이 일관되게 바뀐다.

존재하지 않는 문서를 Featured나 relation에 넣으면
build가 명확하게 실패한다.

검색 생성기와 Sitemap 생성기가
Markdown을 별도로 다시 읽지 않는다.

기존 문서는 Migration Mode로 유지하고
대표 문서와 신규 문서는 Strict하게 검증할 수 있다.

Content Manifest를 브라우저에 그대로 노출하지 않고
각 기능에 필요한 최소 파생 데이터만 생성한다.
```

# 이번 단계의 핵심 결론

Content Manifest는 새로운 데이터베이스가 아니다.

> 흩어진 Markdown metadata를 한 번 정규화해서 사이트 전체가 동일한 문서 정의를 사용하도록 만드는 빌드 타임 모델이다.

Publication Policy도 복잡한 권한 시스템이 아니다.

> 문서 상태 하나가 검색·Sitemap·Featured마다 다른 의미로 해석되지 않게 하는 중앙 규칙이다.

이 두 구조만 안정적으로 만들어도 현재 블로그에서 발생할 가능성이 큰 중복 파싱, 상태 불일치, 구판 노출, 검색·Sitemap 드리프트를 상당 부분 제거할 수 있다.

## 63. assistant

# Task 3-17. Topic Hub 정보 구조(IA)와 Learning Path 설계

이번 태스크는 `hawk90.github.io`에서 가장 중요한 부분이다.

앞에서 우리는 다음을 만들었다.

```text
Content Model
Publication Policy
Manifest
```

이번에는 그것을 **사람이 배우는 구조**로 바꾼다.

---

# 왜 Topic Hub가 중요한가

대부분 기술 블로그는 이런 구조다.

```text
Home
 ↓
최근 글

태그

카테고리

검색
```

문제는 방문자가

> "PCIe를 처음부터 배우고 싶다"

라고 생각했을 때이다.

보통은

```text
BAR
Enumeration
DMA
MSI
MSI-X
ACS
ATS
IOMMU
```

글이 전부 흩어져 있다.

결국

> 무엇부터 읽어야 하지?

가 된다.

---

반대로 좋은 Knowledge Base는

```text
PCIe

Start Here

↓

학습 순서

↓

필수 개념

↓

심화

↓

Debug

↓

Reference
```

가 나온다.

즉

Topic Hub는

> "글 목록"

이 아니라

> "커리큘럼"

이다.

---

# 일반적인 안티패턴

## 1. 태그 페이지

```text
PCIe

[PCIe BAR]

[DMA]

[MSI]

[Link Training]

[ATS]

[ACS]

...
```

끝.

이건 검색 결과와 다를 게 없다.

---

## 2. 날짜순

```text
2026

BAR

2025

MSI

2024

Enumeration
```

배우는 사람은 연도에 관심이 없다.

---

## 3. 인기순

```text
조회수

1 BAR

2 DMA

3 MSI
```

초보자가

DMA부터 읽으면 이해 못 한다.

---

## 4. 모든 글 나열

```text
PCIe

글 84개
```

스크롤만 길어진다.

---

# 좋은 Topic Hub

좋은 Hub는

```text
무엇을

↓

왜

↓

언제

↓

어떤 순서로

↓

얼마나 깊게

```

를 알려준다.

---

# 권장 구조

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

# Hero

맨 위.

```text
PCIe

Peripheral Component Interconnect Express

고성능 장치 연결 인터페이스

58 Articles

Updated 2026-08

Current Guides 22
```

여기서는

방문자가

> 여기가 어떤 공간인지

3초 안에 이해해야 한다.

---

# Hero에서 넣으면 좋은 것

```text
대표 이미지

설명

문서 개수

최종 업데이트

난이도

관련 Topic
```

---

# Start Here

가장 중요하다.

절대로 자동 생성하지 않는다.

예를 들어

```text
Start Here

① PCIe란?

↓

② Configuration Space

↓

③ BAR

↓

④ Enumeration

↓

⑤ MSI

↓

⑥ DMA

```

이건 사람이 만든 커리큘럼이다.

---

자동 생성하면

```text
최신 글

↓

ATS

↓

ACS

↓

SR-IOV
```

이럴 수도 있다.

---

# Learning Path

Start Here보다 조금 더 길다.

예

```text
Beginner

Intermediate

Advanced

Expert
```

---

Beginner

```text
PCIe란

Configuration

BAR

Enumeration
```

---

Intermediate

```text
DMA

Interrupt

MSI

MSI-X
```

---

Advanced

```text
ATS

ACS

AER

Hotplug
```

---

Expert

```text
Linux PCI Core

Firmware Resource Allocation

Root Complex

CXL
```

---

이게 훨씬 배우기 쉽다.

---

# Concept Section

Guide랑 다르다.

Guide

```text
어떻게 한다
```

Concept

```text
왜 그렇다
```

예

```text
왜 BAR probing은
0xffffffff를 쓰는가
```

---

# Debug Section

이건 굉장히 중요하다.

예를 들어

```text
Device Not Found

BAR size incorrect

MSI not working

Enumeration failed
```

실무자는

Debug 글을 훨씬 많이 찾는다.

---

# Experiment Section

예

```text
실험

BAR size 변경

DMA benchmark

MSI latency
```

---

# Reference Section

Reference는

검색용이다.

예

```text
PCIe Register

Capability

Config Offset

Header Format
```

---

# Historical Section

오래된 글.

예

```text
Linux 3.10

XRT 2.13

CentOS7

Kernel 4.x
```

이런 건

Current랑 섞지 않는다.

---

# Related Topics

예

PCIe

↓

```text
Firmware

Linux

CXL

DMA

IOMMU
```

---

이게

Topic Graph다.

---

# Learning Path는 그래프다

많은 블로그는

```text
1

2

3

4

5
```

직선이다.

실제로는

```text
BAR

↓

DMA

↓

Linux

↓

Driver
```

하지만

```text
BAR

↓

Firmware

↓

Driver
```

도 있다.

---

즉

```text
Tree

혹은

Graph
```

다.

---

# 추천 모델

```ts
interface LearningNode{

id:string;

title:string;

documentId:string;

children:string[];

}
```

---

# Start Here와 Learning Path 차이

Start Here

```text
5개

대표 입문
```

Learning Path

```text
전체 과정
```

---

# Hub Section

추천

```text
Start Here

↓

Learning Path

↓

Guides

↓

Concepts

↓

Debug

↓

Experiments

↓

Reference

↓

Historical
```

---

# 자동 분류 기준

Guide

↓

type=guide

Concept

↓

type=concept

Debug

↓

type=debug-note

Experiment

↓

experiment

Reference

↓

reference

---

즉

Content Type을 그대로 활용한다.

---

# Hub에서 Status 활용

Current

맨 위

Historical

맨 아래

Archived

숨김

Superseded

숨김

---

# Hub Metadata

```ts
interface TopicHub{

topic:TopicDefinition;

startHere:string[];

featured:string[];

learningPath:LearningPath;

}
```

---

# Featured와 Start Here

다르다.

Featured

```text
좋은 글
```

Start Here

```text
처음 읽을 글
```

예

가장 좋은 글이

가장 쉬운 글은 아니다.

---

# Topic Difficulty

추천

```text
Beginner

Intermediate

Advanced

Expert
```

Content metadata에 넣어도 된다.

```yaml
difficulty: beginner
```

---

그러면

Learning Path를 만들기 쉽다.

---

# Related Topics는 수동

자동으로

```text
같은 태그
```

하면

품질이 낮다.

예

PCIe

↓

```text
C++

Rust
```

이 나올 수도 있다.

---

사람이

```text
PCIe

↓

Firmware

↓

Linux

↓

CXL
```

를 지정하는 것이 좋다.

---

# Hub Hero KPI

보여주면 좋은 것

```text
Current Guides

Articles

Debug Notes

Reference

Last Updated
```

---

# Search와 Hub 차이

Search

↓

찾기

Hub

↓

배우기

---

Search는

```text
PCIe BAR
```

를 찾는다.

Hub는

```text
PCIe를 공부
```

를 돕는다.

---

# Breadcrumb

추천

```text
Home

↓

Systems

↓

PCIe
```

---

# Topic Summary

Hub 상단에

```text
이 Topic에서 배우는 것

누가 읽으면 좋은지

선행지식

예상 시간
```

도 좋다.

---

# 예상 학습 시간

예

```text
Start Here

40분

Learning Path

8시간
```

방문자가 부담을 가늠할 수 있다.

---

# Topic Badge

예

```text
Maintained

Verified

Actively Updated
```

도 신뢰도를 높인다.

---

# Hub 품질 지표

좋은 Hub는

```text
첫 클릭 후

두 번째 글까지

도달률
```

이 높다.

즉

한 글만 읽고 나가는 것이 아니라

계속 이어서 읽게 만든다.

---

# Topic Hub Checklist

완료 기준은

```text
□ Hero 존재

□ Start Here 존재

□ Learning Path 존재

□ Type별 Section 존재

□ Historical 분리

□ Related Topic 존재

□ Beginner도 이해 가능

□ Search 없이도 학습 가능

□ 다음 글이 항상 존재

□ "무엇부터 읽지?"가 사라짐
```

---

# Hawk90 블로그에 가장 추천하는 Hub

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

## 64. assistant

# Task 3-18. 검색 아키텍처와 지식 발견 UX 설계

앞에서 Topic Hub는 **배우는 경로**를 만들었다.

이번 태스크는 사용자가 이미 찾고 싶은 것이 있을 때, 정확한 대표 문서에 도달하도록 검색 구조를 설계하는 단계다.

핵심 구분은 다음이다.

```text
Topic Hub
→ 무엇부터 배울지 모르는 사용자

Search
→ 무엇을 찾는지는 알고 있는 사용자
```

검색은 단순히 본문에서 문자열이 많이 등장하는 글을 찾는 기능이 아니다.

> 같은 주제의 짧은 메모, 오래된 글, 로그 덤프보다 현재의 대표 문서를 먼저 보여주는 지식 탐색 시스템이어야 한다.

---

# 1. 현재 기술 블로그 검색에서 흔한 문제

## 1. 전체 HTML 인덱싱

다음 내용을 모두 검색 인덱스에 넣는다.

```text
본문
코드
로그
메뉴
푸터
댓글
태그
관련 글
```

그러면 긴 글과 로그가 많은 글이 유리해진다.

예를 들어 `BAR`를 검색했을 때:

```text
BAR 대표 개념 글
```

보다 `BAR`가 수백 번 출력된 디버깅 로그가 먼저 나올 수 있다.

---

## 2. 단어 빈도만으로 정렬

검색어가 많이 등장할수록 높은 순위가 된다.

하지만 다음 두 문서는 가치가 다르다.

```text
문서 A
제목: PCIe BAR 크기는 어떻게 결정되는가
본문에서 BAR 30회

문서 B
제목: U250 디버깅 로그
로그에서 BAR 180회
```

사용자가 `PCIe BAR`를 검색했다면 A가 먼저 나와야 한다.

---

## 3. 최신 글 우선

검색 결과를 게시일 순으로 정렬하면 신규 단편 메모가 오래된 대표 Guide보다 위로 올라온다.

```text
최신성
≠
대표성
```

---

## 4. 구판과 신판이 함께 경쟁

예:

```text
CUDA 9 설치
CUDA 11.8 설치
CUDA 12 설치
```

일반적으로 `CUDA 설치`라고 검색했는데 구판이 상위에 나오면 혼란스럽다.

반대로 `CUDA 9 설치`처럼 정확한 버전을 검색했다면 과거 글도 보여야 한다.

---

## 5. 기호가 사라짐

검색 정규화 과정에서 기호를 모두 제거하면 다음 용어가 깨진다.

```text
C++
MSI-X
H.264
CXL.io
std::vector
namespace::symbol
```

`C++`가 `C`로 변하거나 `MSI-X`가 `MSIX`와 연결되지 않을 수 있다.

---

## 6. 한글과 영어가 분리

다음 검색어가 같은 결과를 가리켜야 한다.

```text
캐시 일관성
cache coherence
cache coherency
코히어런시
```

그러나 단순 문자열 검색에서는 서로 다른 단어다.

---

## 7. 검색 결과가 제목뿐

제목만 보면 문서의 역할을 판단하기 어렵다.

```text
PCIe BAR
```

라는 제목이:

```text
Guide인지
Concept인지
Debug Note인지
Historical인지
```

알 수 없다.

---

# 2. 검색의 목표

검색 결과는 다음 질문에 답해야 한다.

```text
이 문서는 내가 찾는 주제를 다루는가?

대표 설명인가, 실전 디버깅인가?

현재도 유효한가?

어떤 Topic에 속하는가?

내가 입력한 단어가 어디에서 일치했는가?
```

---

# 3. 검색 대상 문서 모델

전체 `ContentDocument`를 브라우저로 보내지 않는다.

검색에 필요한 최소 데이터만 파생한다.

```ts
export interface SearchDocument {
  id: string;
  url: string;

  title: string;
  description: string;

  headings: readonly string[];
  aliases: readonly string[];
  keywords: readonly string[];

  symbols: readonly string[];
  errorMessages: readonly string[];

  topicId: string;
  type: ContentType;
  status: ContentStatus;

  publishedAt: string;
  updatedAt?: string;

  rankMultiplier: number;
}
```

---

# 4. 기본적으로 인덱싱할 필드

## 제목

가장 높은 가중치다.

```text
PCIe BAR 크기는 어떻게 탐색되는가
```

사용자 의도와 직접 연결된다.

---

## 별칭

예:

```yaml
aliases:
  - PCI BAR
  - Base Address Register
  - 베이스 주소 레지스터
```

제목에 없는 표현으로도 찾을 수 있다.

---

## Symbol

예:

```yaml
symbols:
  - pci_scan_child_bus
  - pci_bus_add_devices
  - pci_iomap
```

소스코드 분석 글을 함수명으로 찾게 한다.

---

## Topic

예:

```text
PCIe & CXL
Firmware & Bootloader
```

상위 주제 검색에서 대표 글을 찾는 데 사용한다.

---

## Heading

본문 전체보다 의미 밀도가 높다.

```text
BAR Size Probing
64-bit BAR
Linux Resource Allocation
```

---

## Description

문서 범위와 목적을 나타낸다.

---

## Keyword

작성자가 검색 연결을 위해 명시한 제한된 키워드다.

기존 태그 전체를 무조건 검색 키워드로 사용하지 않는다.

---

## Error Message

Debug Note에서 명시적으로 등록된 오류 문자열만 사용한다.

```yaml
errorMessages:
  - failed to load xclbin
  - no space for BAR
```

---

# 5. 기본적으로 제외할 내용

```text
전체 코드 블록
전체 터미널 로그
본문 전체 HTML
댓글
내비게이션
푸터
관련 글 제목
광고 문구
```

본문 전체를 완전히 배제하면 세부 검색 품질이 낮을 수 있다.

필요하다면 정제된 짧은 본문 요약을 추가한다.

```ts
excerpt?: string;
```

하지만 처음부터 전체 본문 인덱싱으로 돌아가지 않는다.

---

# 6. 검색 가중치

권장 상대 우선순위는 다음과 같다.

```text
Title
>
Exact Alias
>
Symbol
>
Topic
>
Heading
>
Description
>
Keyword
>
Excerpt
>
Error Message
```

오류 메시지는 일반 검색에서는 낮지만 정확히 일치하면 높은 점수를 줄 수 있다.

---

## 예시

```ts
export const SEARCH_FIELD_WEIGHTS = {
  title: 12,
  aliases: 10,
  symbols: 10,
  topic: 7,
  headings: 6,
  description: 5,
  keywords: 4,
  excerpt: 2,
  errorMessages: 2,
} as const;
```

숫자 자체보다 상대 관계가 중요하다.

---

# 7. Exact Match 보너스

단순 가중치만으로는 부족하다.

다음 순위를 추가한다.

```text
제목 완전 일치
>
Alias 완전 일치
>
제목 Prefix 일치
>
단어 전체 일치
>
부분 문자열
>
Fuzzy Match
```

예:

```text
검색어: PCIe BAR
```

결과:

```text
1. PCIe BAR 크기는 어떻게 탐색되는가
2. PCIe 장치 초기화 전체 흐름
3. BAR mmap 실패 디버깅
```

가 되어야 한다.

---

# 8. Status 기반 순위 조정

Publication Policy와 검색 순위는 연결돼야 한다.

## Current

```text
1.0
```

정상 순위.

## Needs Review

```text
0.75
```

검색에는 나오지만 대표 문서보다 낮춘다.

## Historical

```text
0.50~0.60
```

정확한 버전 검색이 아니라면 낮게 표시한다.

## Superseded

기본 검색에서 제외한다.

## Archived

제외한다.

---

## 예외: 정확한 과거 버전 검색

검색어가 다음과 같다면:

```text
XRT 2.13 U250
CUDA 11.8 GTX 1070
Linux 3.10 PCI driver
```

Historical 문서가 높은 순위를 가질 수 있다.

즉, Status multiplier는 절대적인 최종 순위가 아니다.

```text
정확한 버전 일치
+
Historical 문맥
```

이면 보너스를 줄 수 있다.

---

# 9. Content Type 기반 검색 의도

검색어 성격에 따라 선호 타입이 달라질 수 있다.

## 넓은 주제

```text
PCIe
CUDA
Linux Kernel
```

권장 우선순위:

```text
Topic Hub
Guide
Concept
Source Walkthrough
Debug Note
Reference
```

---

## 정확한 함수명

```text
pci_scan_child_bus
container_of
cudaMemcpyAsync
```

권장 우선순위:

```text
Source Walkthrough
Reference
Concept
Guide
```

---

## 오류 문자열

```text
failed to load xclbin
BAR mmap failed
```

권장 우선순위:

```text
Debug Note
Experiment
Reference
```

---

## “왜” 질문

```text
BAR에 all ones를 쓰는 이유
Bootloader가 여러 단계인 이유
```

권장:

```text
Concept
Guide
```

---

## “어떻게” 질문

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

# 10. Alias Registry

문서마다 alias를 자유롭게 쓰면 같은 용어가 반복된다.

따라서 중앙 용어 registry를 둔다.

```text
data/terminology/
└── aliases.ts
```

예:

```ts
export interface TerminologyEntry {
  id: string;
  canonical: string;
  aliases: readonly string[];
  topicIds?: readonly string[];
}
```

```ts
export const TERMINOLOGY = [
  {
    id: "pcie-bar",
    canonical: "PCIe BAR",
    aliases: [
      "PCI BAR",
      "Base Address Register",
      "베이스 주소 레지스터",
      "BAR register",
    ],
    topicIds: ["pcie-cxl"],
  },

  {
    id: "msi-x",
    canonical: "MSI-X",
    aliases: [
      "MSIX",
      "MSI X",
      "Message Signaled Interrupts X",
    ],
    topicIds: ["pcie-cxl"],
  },

  {
    id: "cache-coherence",
    canonical: "Cache Coherence",
    aliases: [
      "cache coherency",
      "캐시 일관성",
      "코히어런시",
    ],
  },
] as const satisfies readonly TerminologyEntry[];
```

---

# 11. 중앙 Alias와 문서 Alias 경계

## 중앙 Alias

기술 용어 자체의 동의어다.

```text
MSI-X ↔ MSIX
C++ ↔ cpp ↔ cxx
IOMMU ↔ Input Output Memory Management Unit
```

## 문서 Alias

특정 글을 찾기 위한 제목 변형이다.

```yaml
aliases:
  - PCIe BAR Size Calculation
  - BAR 크기 계산
```

중앙 Registry는 여러 문서에 공유된다.

문서 Alias는 해당 문서에만 적용한다.

---

# 12. 검색 정규화

```ts
export function normalizeSearchText(
  value: string,
): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/\s+/g, " ")
    .trim();
}
```

하지만 모든 기호를 제거하면 안 된다.

---

## 보존해야 할 기호

```text
+
-
.
:
_
#
/
```

다음 기술 식별자 때문이다.

```text
C++
MSI-X
H.264
CXL.io
std::vector
foo_bar
C#
H2D/D2H
```

---

## 보조 정규화 형태

검색어 하나에 여러 normalized form을 만들 수 있다.

예:

```text
MSI-X
```

에서:

```text
msi-x
msix
msi x
```

를 생성한다.

```ts
export interface NormalizedQuery {
  original: string;
  primary: string;
  compact: string;
  tokens: readonly string[];
}
```

```ts
export function normalizeQuery(
  query: string,
): NormalizedQuery {
  const primary =
    normalizeSearchText(query);

  return {
    original: query,
    primary,
    compact:
      primary.replace(/[\s_-]+/g, ""),
    tokens:
      tokenizeTechnicalQuery(primary),
  };
}
```

---

# 13. Technical Tokenizer

일반 자연어 tokenizer는 기술 용어를 잘못 자를 수 있다.

예:

```text
std::vector
cudaMemcpyAsync
pci_scan_child_bus
CXL.mem
```

권장 token 후보:

```text
한글 단어
영문·숫자 조합
snake_case
camelCase
namespace::symbol
dot notation
hyphenated identifier
```

초기에는 정교한 형태소 분석기보다 단순 규칙 기반이 낫다.

```ts
const TECHNICAL_TOKEN_PATTERN =
  /[가-힣]+|[A-Za-z0-9_:+.#/-]+/g;
```

이후 Golden Query 결과를 보고 조정한다.

---

# 14. Stop Word 처리 주의

일반 검색에서는 다음 단어를 제거한다.

```text
the
a
is
어떻게
무엇
왜
```

그러나 기술 블로그에서 질문 문맥은 검색 의도에 도움이 될 수 있다.

```text
왜 BAR는 0xffffffff를 쓰는가
```

여기서 `왜`는 Concept 의도를 나타낸다.

따라서 단순히 모두 제거하기보다:

```text
검색 매칭에서는 가중치 낮음
검색 의도 분석에는 사용
```

할 수 있다.

초기에는 stop word 최적화 자체를 하지 않아도 된다.

---

# 15. Search Index 생성 흐름

```text
Content Manifest
        ↓
Publication Policy
        ↓
검색 가능 문서 필터
        ↓
중앙 Alias 적용
        ↓
문서 Alias 적용
        ↓
SearchDocument 생성
        ↓
검색 Library Index 생성
        ↓
JSON Artifact 출력
```

---

# 16. 검색 라이브러리와 Domain 분리

MiniSearch, FlexSearch, Fuse.js 등의 라이브러리를 쓰더라도 Domain 모델이 라이브러리 타입에 종속되면 안 된다.

```ts
export interface SearchIndexAdapter {
  search(
    query: string,
    options?: SearchOptions,
  ): readonly SearchHit[];
}
```

```ts
export interface SearchHit {
  documentId: string;
  score: number;
  matchedFields: readonly string[];
  matchedTerms: readonly string[];
}
```

실제 라이브러리는 Adapter 내부에 둔다.

```text
src/search/adapters/
├── minisearch-adapter.ts
└── search-adapter.ts
```

검색 라이브러리를 교체해도 `SearchDocument`와 UI는 유지할 수 있다.

---

# 17. 검색 인덱스 Artifact 구조

## 단일 파일

```text
/search-index.json
```

장점:

```text
구현 단순
요청 1회
캐시 용이
```

초기에는 단일 파일을 권장한다.

---

## 분할 파일

```text
/search/
├── metadata.json
├── pcie-cxl.json
├── linux-systems.json
└── gpu-cuda.json
```

다음 문제가 실제 발생할 때만 고려한다.

```text
압축 인덱스가 지나치게 큼
파싱으로 UI 멈춤
모바일 메모리 문제
```

처음부터 shard를 만들면 다음 문제가 생긴다.

```text
어느 Topic shard를 받을지 결정 필요
전역 검색에서 여러 요청
캐시와 버전 관리 복잡
```

---

# 18. 검색 인덱스 지연 로딩

페이지를 방문한 모든 사용자에게 검색 인덱스를 내려주지 않는다.

```text
초기 페이지
→ 검색 버튼만 렌더

사용자 클릭
→ 검색 모듈 로드

검색 Dialog 열림
→ Search Index Fetch

Fetch 완료
→ 입력 및 결과
```

---

## Astro 경계

```text
SearchButton.astro
SearchDialog.ts
SearchIndexLoader.ts
SearchEngine.ts
```

`SearchButton`은 가벼운 정적 HTML이다.

Dialog와 검색 엔진은 사용자 행동 후 로드한다.

---

# 19. Search Index Loader

```ts
export interface SearchIndexPayload {
  version: string;
  generatedAt: string;
  documents: readonly SearchDocument[];
  indexData: unknown;
}
```

```ts
let searchIndexPromise:
  Promise<SearchIndexPayload> | undefined;

export function loadSearchIndex():
  Promise<SearchIndexPayload> {
  if (!searchIndexPromise) {
    searchIndexPromise =
      fetch("/search-index.json")
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to load search index: ` +
              `${response.status}`,
            );
          }

          return response.json();
        });
  }

  return searchIndexPromise;
}
```

Promise를 캐시해 Dialog를 다시 열 때 재요청하지 않는다.

---

# 20. 검색 인덱스 버전

```ts
export const SEARCH_INDEX_VERSION = "1";
```

다음 변경 시 버전을 올린다.

```text
SearchDocument schema
검색 library
tokenizer
alias 적용 방식
ranking logic
```

UI가 예상하지 못한 index version을 받으면 안전하게 오류를 표시한다.

---

# 21. 검색 결과 View Model

Domain 결과를 그대로 표시하지 않는다.

```ts
export interface SearchResultViewModel {
  id: string;
  href: string;

  title: string;
  description: string;

  topicLabel: string;
  typeLabel: string;
  statusLabel?: string;

  matchedContext?: string;
  matchedField:
    | "title"
    | "alias"
    | "heading"
    | "symbol"
    | "error"
    | "description";

  updatedLabel?: string;
}
```

---

# 22. 검색 결과 카드

권장 표시:

```text
[CONCEPT] [PCIe & CXL]

PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가

BAR에 all-ones를 기록해 크기를 탐색하는 과정과
32·64-bit MMIO 주소 할당을 설명합니다.

제목에서 일치: PCIe BAR
```

---

## Source Walkthrough 예

```text
[SOURCE WALKTHROUGH] [Linux & Systems]

Linux는 PCIe 장치를 어떤 함수 흐름으로 열거하는가

일치한 Symbol:
pci_scan_child_bus()
```

---

## Historical 예

```text
[HISTORICAL · XRT 2.13]

Alveo U250에서 XRT Interrupt API를 검토한 기록

이 문서는 CentOS 7.9와 XRT 2.13.466 환경을 다룹니다.
```

---

# 23. Current 상태 표시

`Current`는 기본값이므로 모든 결과에 배지를 붙일 필요가 없다.

표시가 필요한 상태만 강조한다.

```text
Needs Review
Historical
```

`Superseded`는 일반 결과에서 제외한다.

---

# 24. 일치 문맥 생성

검색어와 무관한 첫 문장을 snippet으로 보여주면 도움이 적다.

우선순위:

```text
일치 Heading
>
일치 Alias
>
일치 Symbol
>
일치 Error Message
>
Description
```

본문 전체를 브라우저에 보내지 않으므로 자유로운 문맥 추출은 제한된다.

대신 매칭된 구조화 필드를 표시한다.

예:

```text
일치한 항목: BAR Size Probing
```

이는 길고 불안정한 본문 snippet보다 명확할 수 있다.

---

# 25. 안전한 Highlight

나쁜 구현:

```ts
element.innerHTML =
  text.replace(
    query,
    `<mark>${query}</mark>`,
  );
```

사용자 입력이 HTML로 삽입될 수 있다.

권장:

```ts
export function appendHighlightedText(
  container: HTMLElement,
  text: string,
  ranges: readonly MatchRange[],
): void {
  let cursor = 0;

  for (const range of ranges) {
    container.append(
      document.createTextNode(
        text.slice(
          cursor,
          range.start,
        ),
      ),
    );

    const mark =
      document.createElement("mark");

    mark.textContent =
      text.slice(
        range.start,
        range.end,
      );

    container.append(mark);

    cursor = range.end;
  }

  container.append(
    document.createTextNode(
      text.slice(cursor),
    ),
  );
}
```

---

# 26. 검색 Dialog UX

## 필수 동작

```text
검색 버튼 클릭
Dialog 열림
검색 입력에 Focus
입력
결과 갱신
키보드로 이동
Enter로 선택
Escape로 닫기
원래 버튼으로 Focus 복귀
```

---

## Dialog 초기 상태

검색 인덱스가 아직 로드되지 않았을 때:

```text
검색 준비 중…
```

로딩이 길다면 spinner만 보여주지 말고:

```text
Topic별로 둘러보기
```

fallback 링크를 제공한다.

---

## 빈 검색어

다음 중 하나를 보여줄 수 있다.

```text
Core Topics
Featured Guides
최근 검색은 저장하지 않음
```

인기 검색어 기능은 실제 데이터와 운영 필요가 없으면 추가하지 않는다.

---

# 27. 키보드 탐색

추천:

```text
Arrow Down
다음 결과

Arrow Up
이전 결과

Enter
선택

Escape
닫기

Tab
Dialog의 인터랙션 이동
```

Arrow Key를 구현하지 않는다면 Tab과 Enter만으로도 접근 가능해야 한다.

---

# 28. Focus 관리

Dialog를 열 때:

```text
현재 활성 요소 저장
→ 입력창 Focus
```

닫을 때:

```text
기존 검색 버튼 Focus 복원
```

Dialog 바깥 콘텐츠에 focus가 이동하지 않도록 한다.

브라우저의 native `<dialog>`를 사용한다면 동작과 지원 범위를 확인한다.

---

# 29. 모바일 검색

모바일에서는 화면 전체 Dialog가 적합할 수 있다.

```text
상단:
뒤로/닫기 + 검색 입력

본문:
결과 목록
```

주의할 점:

```text
모바일 키보드가 결과를 가리지 않음
입력창이 고정 Header 아래 숨지 않음
결과 전체 카드가 지나치게 높지 않음
닫기 버튼이 명확함
```

---

# 30. 검색 결과 수 제한

처음부터 결과 100개를 보여주지 않는다.

권장:

```text
초기 10개
더 보기 또는 최대 30개
```

검색어가 넓으면 Topic Hub를 먼저 제안한다.

예:

```text
검색어: CUDA
```

```text
먼저 둘러보기
GPU & CUDA Topic Hub

검색 결과
1. CUDA 실행 모델
2. CUDA Memory Hierarchy
...
```

---

# 31. Broad Topic 검색

Topic title 또는 alias와 정확히 일치하면 Hub를 특별한 결과로 보여준다.

```ts
export interface TopicSearchResult {
  kind: "topic";
  topicId: string;
  href: string;
  title: string;
  description: string;
}
```

문서 결과와 구분한다.

```text
TOPIC

PCIe & CXL

PCIe 장치 초기화, BAR, MSI-X, DMA와
CXL 메모리 주소 변환을 학습 순서로 살펴봅니다.
```

---

# 32. 검색 결과 없음

단순히:

```text
검색 결과가 없습니다.
```

로 끝내지 않는다.

권장 구조:

```text
“MSIX” 검색 결과를 찾지 못했습니다.

찾으신 용어가 MSI-X인가요?

관련 Topic
PCIe & CXL

전체 글 보기
```

Alias registry에 유사 후보가 있으면 제안한다.

---

# 33. 철자 보정

처음부터 복잡한 spell checker를 만들 필요는 없다.

다음 정도면 충분하다.

```text
Alias compact form 비교
Levenshtein distance 제한
Topic·Canonical 용어에만 적용
```

예:

```text
MSIX → MSI-X
Continer_of → container_of
```

일반 본문 단어 전체에 fuzzy correction을 적용하면 무관한 제안이 많아질 수 있다.

---

# 34. Search Suggestions

자동 완성을 구현한다면 전체 문서 제목보다 다음을 우선한다.

```text
Topic
Canonical terminology
문서 제목
Symbol
```

예:

```text
pc
```

에서:

```text
PCIe
PCIe BAR
PCIe Configuration Space
pci_scan_child_bus
```

---

# 35. 검색 History를 저장할 것인가

기본적으로 필요하지 않다.

Local Storage에 저장하면:

```text
개인정보 고려
삭제 UI
잘못 입력한 내부 식별자 보존
```

문제가 생긴다.

개인 기술 블로그에서는 검색 history 없이도 충분하다.

---

# 36. 검색 Analytics

검색 품질 개선을 위해 필요한 최소 이벤트만 고려한다.

```text
검색 실행
결과 없음
선택한 결과 순위
재검색 여부
```

그러나 전체 원문 query를 외부 Analytics로 전송하면 주의가 필요하다.

사용자가 다음을 입력할 수 있다.

```text
회사 hostname
사내 오류 로그
고객 식별자
내부 함수명
```

권장 선택:

```text
검색어 원문 미수집
또는
로컬 집계
또는
짧은 기간·명시적 정책
```

---

# 37. Golden Query Set

검색 구현보다 먼저 대표 검색어를 만든다.

최소 20개.

---

## Broad Topic

```text
PCIe
CXL
CUDA
Linux Kernel
Firmware
C++
```

---

## Exact Concept

```text
PCIe BAR
CXL HDM Decoder
CUDA pinned memory
Linux softirq
U-Boot driver model
```

---

## Korean Alias

```text
캐시 일관성
주소 변환
가상 메모리
부트로더 초기화
공유 메모리 뱅크 충돌
```

---

## Symbol

```text
container_of
pci_scan_child_bus
cudaMemcpyAsync
std::vector
xclLoadXclBin
```

---

## Error

```text
failed to load xclbin
BAR mmap failed
probe not called
```

---

# 38. Golden Query 기대값

```yaml
- query: PCIe BAR

  mustInclude:
    - pcie-bar-sizing

  preferredTopThree:
    - pcie-device-initialization
    - linux-pci-resource

  exclude:
    - old-pcie-bar-note
```

---

## Historical query

```yaml
- query: XRT 2.13 U250 interrupt

  mustInclude:
    - xrt-2-13-u250-interrupt

  allowHistorical: true
```

---

## Symbol query

```yaml
- query: pci_scan_child_bus

  mustInclude:
    - linux-pci-enumeration

  expectedMatchedField:
    - symbol
```

---

# 39. 검색 테스트

```ts
describe("golden queries", () => {
  it.each(GOLDEN_QUERIES)(
    "$query",
    ({ query, mustInclude }) => {
      const results =
        searchEngine.search(query);

      const resultIds =
        results.map(
          (result) =>
            result.documentId,
        );

      for (const id of mustInclude) {
        expect(resultIds)
          .toContain(id);
      }
    },
  );
});
```

---

# 40. Top 3 검사

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

# 41. 검색 결과의 상태 회귀 검사

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

# 42. 기호 검색 테스트

```ts
const symbolQueries = [
  "C++",
  "MSI-X",
  "H.264",
  "std::vector",
  "CXL.io",
] as const;
```

정규화 과정에서 문자가 사라지지 않는지 검사한다.

---

# 43. 한글 검색 테스트

한글 substring 처리와 Unicode normalization을 확인한다.

```text
뱅크 충돌
bank conflict
shared memory bank conflict
```

가 같은 대표 CUDA 글로 연결되는지 확인한다.

한국어 형태소 분석기를 처음부터 넣기보다 명시적 alias로 보완하는 편이 예측 가능하다.

---

# 44. Search Index 크기 측정

기록할 값:

```text
SearchDocument 수
압축 전 JSON 크기
gzip·brotli 크기
파싱 시간
검색 엔진 초기화 시간
첫 Query 시간
후속 Query 시간
```

---

## Build Report 예

```text
Search Index

Documents: 486
Topics: 5
Aliases: 142
Symbols: 326
Error Messages: 37

Raw JSON: 1.8 MB
Gzip: 348 KB

Parse: 31 ms
Initialize: 54 ms
First query: 8 ms
```

실제 수치는 측정 후 기준을 잡는다.

---

# 45. 검색 성능 예산

처음부터 절대 목표를 정하기보다 baseline 대비 회귀를 관리한다.

예:

```text
압축 크기 +20% 경고
초기화 시간 +20% 경고
대표 모바일 환경 200ms 이상 block 경고
```

검색을 열지 않은 사용자는 인덱스를 받지 않아야 한다.

---

# 46. Index Cache

파일명에 content hash를 넣을 수 있다.

```text
/search/search-index.abcd1234.json
```

장점:

```text
장기 캐시
새 배포에서 안전한 갱신
```

페이지에는 manifest 파일 또는 빌드 상수를 통해 URL을 전달한다.

---

# 47. 인덱스 생성물 정리

문서 삭제 후 문서별 캐시가 남을 수 있다.

```text
.cache/search/<document-id>.json
```

최종 build에서 현재 Manifest ID와 비교해 stale cache를 제거한다.

최종 공개 인덱스는 매번 현재 검색 가능 문서만 병합한다.

---

# 48. 검색 실패 Fallback

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

# 49. JavaScript 비활성 상태

검색 자체는 JavaScript가 필요할 수 있다.

하지만 사이트 전체 탐색이 검색에만 의존하면 안 된다.

JavaScript 없이도 다음은 가능해야 한다.

```text
Core Topics
Topic Hub
전체 글 아카이브
대표 Guide
```

---

# 50. 검색 결과와 SEO

내부 검색 결과 페이지는 일반적으로 색인하지 않는다.

```html
<meta
  name="robots"
  content="noindex,follow"
/>
```

Sitemap에서 제외한다.

URL query별 검색 결과를 정적 페이지로 생성하지 않는다.

```text
/search?q=pcie
```

가 무수한 색인 페이지로 만들어지지 않게 한다.

---

# 51. 검색 결과 URL

Dialog 기반 검색은 URL을 변경하지 않아도 된다.

하지만 공유 가능한 검색 상태를 원한다면:

```text
/search/?q=pcie
```

를 사용할 수 있다.

이 경우에도 `noindex`다.

브라우저 뒤로 가기와 검색 닫기 동작을 테스트해야 한다.

초기에는 공유 검색 URL 없이 Dialog만 운영하는 편이 단순하다.

---

# 52. Search Component 구조

```text
src/components/search/
├── SearchButton.astro
├── SearchDialog.ts
├── SearchInput.ts
├── SearchResults.ts
├── SearchResultItem.ts
└── SearchStatus.ts
```

너무 작은 컴포넌트로 나누지 않아도 된다.

초기에는:

```text
SearchButton.astro
SearchDialog.ts
SearchEngine.ts
```

정도면 충분하다.

---

# 53. Search Domain 구조

```text
src/domain/search/
├── search-document.ts
├── build-search-documents.ts
├── normalize-query.ts
├── terminology.ts
├── search-engine.ts
└── search-ranking.ts
```

브라우저 UI와 분리한다.

---

# 54. Search Engine Interface

```ts
export interface SearchOptions {
  limit?: number;
  topicId?: string;
  type?: ContentType;
}

export interface SearchResult {
  documentId: string;
  score: number;
  matchedFields:
    readonly SearchMatchedField[];
  matchedTerms:
    readonly string[];
}

export interface SearchEngine {
  search(
    query: string,
    options?: SearchOptions,
  ): readonly SearchResult[];
}
```

---

# 55. Filter UI

검색 결과에 필터를 많이 추가하면 복잡해진다.

초기에는 필요 없다.

결과가 많을 때만 다음 두 개를 고려한다.

```text
Topic
Content Type
```

Status 필터는 사용자에게 맡기기보다 기본 ranking과 상태 표시로 처리한다.

---

# 56. 검색 페이지가 관리자 도구가 되는 안티패턴

다음 기능을 계속 추가할 수 있다.

```text
Advanced Query Syntax
Regex
Date Range
Status
Language
Sort
Exact Mode
```

기술 블로그 일반 독자에게는 과도하다.

복잡한 검색은 내부 Editorial Audit 도구로 분리한다.

공개 검색은 다음에 집중한다.

```text
빠른 입력
정확한 대표 결과
키보드 접근
한글·영문·Symbol 지원
```

---

# 57. Topic Hub 추천

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

# 58. 검색에서 다음 학습 경로로 연결

사용자가 검색으로 특정 글에 들어왔을 때 Article Page의 관계 UI가 이어받는다.

```text
Search
→ Concept
→ Prerequisite
→ Next
→ Topic Hub
```

검색 결과 카드 자체에 관련 글을 많이 붙이지 않는다.

검색은 진입점을 찾고, 문서 내부 관계는 학습을 이어준다.

---

# 59. 검색 품질 보고서

빌드 시 다음을 생성할 수 있다.

```text
reports/search-quality.md
```

포함:

```text
Golden Query 통과율
결과 없음 Query
Alias 미사용 항목
구판 상위 노출
동일 제목 문서
검색 인덱스 크기
```

---

# 60. Zero-result Query 운영

검색 분석을 수집한다면 결과 없음 Query를 주기적으로 검토한다.

결과 없음의 원인은 세 가지다.

```text
콘텐츠가 없음
Alias가 없음
검색 알고리즘이 못 찾음
```

각각 대응이 다르다.

예:

```text
“코히어런시”
→ Cache Coherence 글은 있음
→ Alias 추가

“CXL.cache snoop filter”
→ 관련 글 없음
→ 신규 콘텐츠 후보

“pci_scan_child_bus”
→ 글에 함수명이 있으나 index에 없음
→ Symbol 추출 보완
```

---

# 61. 검색어로 콘텐츠를 무조건 만들지 않기

결과 없음 Query가 있다고 매번 글을 만들면 검색 수요 중심으로 사이트 정체성이 흔들릴 수 있다.

판단 기준:

```text
핵심 Topic과 관련 있는가
직접 경험 또는 분석을 제공할 수 있는가
기존 글에 보완하는 것이 나은가
단순 Alias 문제인가
```

---

# 62. 검색과 AdSense

검색 결과 페이지는 게시자 콘텐츠보다 탐색 UI 중심이므로 광고 대상에서 제외하는 것이 안전하다.

```text
Search Page
→ noindex
→ adsEligible=false
```

검색 Dialog에도 광고를 넣지 않는다.

---

# 63. 보안 검사

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

# 64. 접근성 검사

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

# 65. Debounce

문서 수가 수백 개라면 검색 자체가 빠를 수 있다.

그래도 키 입력마다 비싼 렌더링이 발생하지 않도록:

```text
50~150ms
```

정도의 debounce를 고려한다.

너무 긴 debounce는 반응성이 떨어진다.

측정 후 결정한다.

---

# 66. 결과 DOM 재사용

검색할 때마다 전체 Dialog DOM을 새로 생성하면 깜박임이 생길 수 있다.

하지만 처음부터 Virtual List를 만들 필요는 없다.

결과를 10~20개로 제한하면 일반 DOM 업데이트로 충분하다.

---

# 67. 검색 설계의 최소 구현

처음부터 모든 기능을 구현하지 않는다.

1차 범위:

```text
SearchDocument 최소화
Publication Policy 필터
Title·Alias·Topic·Heading 가중치
핵심 Alias 30개
Golden Query 20개
지연 로딩
검색 결과에 Topic·Type·Status 표시
안전한 Highlight
결과 없음 Fallback
```

후속:

```text
Symbol 추출
Error Message 검색
철자 보정
Topic 필터
Index 분할
검색 Analytics
```

---

# 68. 실제 구현 티켓

## SEA-01. SearchDocument 모델 생성

```text
제목
설명
Heading
Alias
Topic
Type
Status
```

---

## SEA-02. Manifest 기반 검색 문서 생성

Publication Policy의 `includeInSearch`를 사용한다.

---

## SEA-03. Terminology Alias Registry 생성

우선 핵심 용어 30개.

예:

```text
C++
MSI-X
PCIe BAR
IOMMU
Device Tree
SoftIRQ
Pinned Memory
Bank Conflict
```

---

## SEA-04. Query 정규화 구현

```text
Unicode
대소문자
공백
하이픈
기호 보존
```

---

## SEA-05. 검색 Adapter 구현

검색 라이브러리와 Domain 분리.

---

## SEA-06. Golden Query 테스트

20개 검색어와 기대 결과.

---

## SEA-07. Search Dialog 지연 로딩

검색 버튼 클릭 전 index 미요청.

---

## SEA-08. 검색 결과 View Model

```text
Topic
Type
상태
일치 필드
```

---

## SEA-09. 안전한 Highlight

`innerHTML` 없이 구현.

---

## SEA-10. 결과 없음·오류 Fallback

Topic Hub와 전체 글 목록으로 연결.

---

# 69. 권장 커밋 순서

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

# 70. 완료 기준

이 태스크는 검색창이 생겼다고 완료되는 것이 아니다.

다음이 충족돼야 한다.

```text
PCIe를 검색하면 Topic Hub와 대표 Guide가 먼저 나온다.

PCIe BAR를 검색하면 BAR 대표 Concept가 상위에 나온다.

pci_scan_child_bus를 검색하면 Linux 소스 분석 글을 찾는다.

캐시 일관성과 cache coherence가 같은 대표 글로 연결된다.

일반 검색에서 구판과 superseded 글이 대표 글을 밀어내지 않는다.

정확한 과거 버전 검색에서는 Historical 글을 찾을 수 있다.

검색을 사용하지 않으면 인덱스를 다운로드하지 않는다.

사용자 입력이 HTML로 실행되지 않는다.

검색 실패 시 Topic Hub로 계속 탐색할 수 있다.
```

# 이번 단계의 핵심 결론

기술 블로그 검색의 품질은 Fuzzy Search 알고리즘이 얼마나 복잡한지로 결정되지 않는다.

> 어떤 문서를 검색 대상으로 삼고, 어떤 필드에 의미를 부여하며, 대표 문서와 구판의 우선순위를 어떻게 정하는지가 더 중요하다.

`hawk90.github.io`에서는 다음 네 가지가 핵심이다.

```text
대표 문서 우선
기술 식별자 지원
한글·영문 Alias
상태 기반 검색 순위
```

이 네 가지가 제대로 동작하면 단순한 문자열 검색만으로도 일반 블로그 검색보다 훨씬 강한 지식 탐색 경험을 만들 수 있다.

## 65. assistant

# Task 3-19. 내부 링크·관련 글·지식 관계 그래프 설계

앞에서는 검색을 통해 **원하는 글을 찾는 구조**를 만들었다.

이번 태스크는 사용자가 글 하나를 읽은 뒤:

```text
어디에서 왔는지
무엇을 먼저 알아야 하는지
다음에는 무엇을 읽어야 하는지
같은 문제의 실전 사례가 무엇인지
```

를 알 수 있게 만드는 단계다.

핵심은 단순한 `관련 글 6개`가 아니다.

> 문서 사이의 관계에 의미를 부여해, 개별 글을 하나의 학습 구조로 연결하는 것이다.

---

# 1. 현재 기술 블로그의 일반적인 관련 글 문제

대부분 관련 글은 다음 방식으로 생성된다.

```text
같은 태그
+
같은 카테고리
+
최신 글
```

예를 들어 `PCIe BAR` 문서 아래에 다음이 나올 수 있다.

```text
PCIe 6.0 동향
CXL 3.0 소개
U250 설치 방법
Rust PCIe 라이브러리
```

모두 PCIe 태그를 공유하지만, 독자가 BAR 글을 읽은 뒤 실제로 필요한 문서는 아닐 수 있다.

---

# 2. 관련성의 종류를 구분해야 한다

다음 관계는 전부 의미가 다르다.

```text
상위 주제
선행 지식
다음 학습 단계
같은 문제의 실전 사례
대체 문서
같은 시리즈
참고 자료
```

이를 모두 `related` 하나에 넣으면 UI와 추천 품질이 무너진다.

---

# 3. 권장 관계 모델

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

# 4. 관계별 의미

## `parentTopic`

이 글이 속한 대표 Topic Hub.

예:

```yaml
topic: pcie-cxl
```

UI:

```text
상위 주제
PCIe & CXL
```

---

## `prerequisites`

현재 글을 이해하기 전에 알아야 하는 문서.

예:

```yaml
prerequisites:
  - pcie-configuration-space
  - memory-mapped-io
```

UI:

```text
먼저 읽으면 좋은 글
1. PCIe Configuration Space
2. Memory-Mapped I/O
```

---

## `next`

현재 글을 읽은 뒤 이어지는 학습 단계.

예:

```yaml
next:
  - linux-pci-resource
  - pcie-msix
```

UI:

```text
다음 단계
1. Linux는 PCIe Resource를 어떻게 등록하는가
2. MSI-X는 어떻게 설정되는가
```

---

## `related`

직접적인 선행·후행 관계는 아니지만 주제 이해에 도움이 되는 문서.

예:

```yaml
related:
  - u250-bar-mmap-debug
  - vfio-pcie-passthrough
```

UI:

```text
관련 실전 사례
```

단순 `관련 글`보다 관계 이유를 설명하는 편이 낫다.

---

## `supersededBy`

현재 글을 대체하는 신판.

```yaml
status: superseded
supersededBy: modern-pcie-bar-guide
```

UI:

```text
이 문서는 새 글로 대체되었습니다.

현재 문서:
PCIe BAR 크기 탐색과 주소 할당
```

---

# 5. 관계 모델 TypeScript

```ts
export interface ContentRelations {
  prerequisites: readonly string[];
  next: readonly string[];
  related: readonly string[];
  supersededBy?: string;
}
```

문서 모델:

```ts
export interface ContentDocument {
  id: string;
  topicId: string;
  relations: ContentRelations;
}
```

---

# 6. 빈 배열을 기본값으로 사용

다음처럼 optional 배열을 많이 사용하면 Query마다 분기가 생긴다.

```ts
prerequisites?: string[];
next?: string[];
related?: string[];
```

권장:

```ts
relations: {
  prerequisites: [],
  next: [],
  related: [],
}
```

정규화 단계에서 빈 배열로 만든다.

---

# 7. 문서 ID 기반 관계

관계는 URL이 아니라 안정적인 문서 ID를 사용한다.

나쁜 예:

```yaml
next:
  - /posts/pcie-msix/
```

권장:

```yaml
next:
  - pcie-msix
```

이유:

```text
URL 변경 가능
slug 변경 가능
폴더 이동 가능
canonical 통합 가능
```

문서 ID는 유지할 수 있다.

---

# 8. 관계를 자동 추론할 수 있는가

일부 후보는 자동 생성할 수 있다.

```text
본문 링크
같은 Topic
같은 Series
제목 유사도
같은 Symbol
```

하지만 최종 관계를 자동 확정하는 것은 위험하다.

예:

```text
PCIe BAR
```

와:

```text
BAR에서 맥주 주문하기
```

가 같은 문자열을 공유하는 극단적 문제도 있지만, 기술 문서 안에서도 더 현실적인 문제가 있다.

```text
DMA API
GPU DMA
PCIe DMA Engine
```

관련은 있지만 선행 관계는 아니다.

따라서:

```text
자동화
→ 관계 후보 생성

사람
→ 관계 의미 확정
```

구조가 적합하다.

---

# 9. 관계 그래프는 데이터베이스가 필요하지 않다

문서 수가 수백 개라면 `Map`과 `Set`이면 충분하다.

```ts
export interface RelationGraph {
  prerequisitesByDocument:
    ReadonlyMap<string, ReadonlySet<string>>;

  dependentsByDocument:
    ReadonlyMap<string, ReadonlySet<string>>;

  nextByDocument:
    ReadonlyMap<string, ReadonlySet<string>>;

  relatedByDocument:
    ReadonlyMap<string, ReadonlySet<string>>;
}
```

---

# 10. 역방향 관계

문서 A가 B를 prerequisite로 가진다면:

```text
A → prerequisite → B
```

B 입장에서는:

```text
B → prerequisiteOf → A
```

가 된다.

원본 front matter에 양쪽을 모두 저장하면 drift가 발생한다.

나쁜 예:

```yaml
# A
prerequisites:
  - B

# B
dependents:
  - A
```

A만 수정하고 B를 잊을 수 있다.

권장:

```text
정방향 관계만 저장
→ Manifest에서 역방향 관계 자동 생성
```

---

# 11. 관계 그래프 생성

```ts
export function buildRelationGraph(
  manifest: ContentManifest,
): RelationGraph {
  const prerequisitesByDocument =
    new Map<string, Set<string>>();

  const dependentsByDocument =
    new Map<string, Set<string>>();

  const nextByDocument =
    new Map<string, Set<string>>();

  const relatedByDocument =
    new Map<string, Set<string>>();

  for (const document of manifest.documents) {
    prerequisitesByDocument.set(
      document.id,
      new Set(document.relations.prerequisites),
    );

    nextByDocument.set(
      document.id,
      new Set(document.relations.next),
    );

    relatedByDocument.set(
      document.id,
      new Set(document.relations.related),
    );

    for (const prerequisiteId of document.relations.prerequisites) {
      const dependents =
        dependentsByDocument.get(prerequisiteId) ??
        new Set<string>();

      dependents.add(document.id);

      dependentsByDocument.set(
        prerequisiteId,
        dependents,
      );
    }
  }

  return {
    prerequisitesByDocument,
    dependentsByDocument,
    nextByDocument,
    relatedByDocument,
  };
}
```

---

# 12. `next`와 `prerequisite`는 같은 관계인가

다음처럼 생각할 수 있다.

```text
A.next = B
```

라면:

```text
B.prerequisite = A
```

일 것 같다.

하지만 항상 그렇지는 않다.

예:

```text
PCIe BAR
→ 다음 추천: VFIO BAR mmap
```

VFIO 글을 읽기 위해 BAR가 필요하긴 하지만, VFIO 글에는 다른 선행 개념도 필요할 수 있다.

반대로:

```text
B.prerequisites = A
```

라고 해서 A의 대표적인 다음 글이 반드시 B는 아니다.

따라서 두 관계를 자동으로 완전히 동일시하지 않는다.

다만 일관성 후보를 warning으로 제안할 수 있다.

---

# 13. `related`는 대칭인가

```text
A related B
```

이면:

```text
B related A
```

로 볼 수 있다.

하지만 UI에서 반드시 양쪽에 노출할 필요는 없다.

예:

```text
BAR Concept
→ 관련 사례: U250 BAR 문제
```

U250 Debug Note에서 BAR Concept은 `prerequisite`로 표시하는 편이 더 적합할 수 있다.

따라서 `related`의 역관계는 자동 생성하지 않고, 감사 리포트에서 후보만 제안하는 편이 낫다.

---

# 14. 관계 불변조건

다음은 반드시 검증한다.

```text
대상 문서가 존재한다
자기 자신을 참조하지 않는다
같은 배열에 중복 ID가 없다
supersededBy 대상이 존재한다
superseded cycle이 없다
Archived 문서를 next로 추천하지 않는다
Featured 문서가 Superseded 문서를 추천하지 않는다
```

---

# 15. Prerequisite cycle

다음 구조:

```text
A를 읽으려면 B 필요
B를 읽으려면 C 필요
C를 읽으려면 A 필요
```

는 학습 경로로는 문제가 있다.

```text
A → B → C → A
```

초기에는 warning으로 보고한다.

대표 Learning Path나 Start Here에 포함된 문서라면 error로 강화한다.

---

# 16. Next cycle

다음 관계도 문제가 될 수 있다.

```text
A.next = B
B.next = C
C.next = A
```

하지만 `next`가 하나의 고정된 강의 순서가 아니라 여러 추천 경로라면 cycle이 반드시 오류는 아니다.

권장 정책:

```text
Learning Path 내부 next cycle
→ Error

일반 문서 next cycle
→ Warning
```

---

# 17. 관계 Validation Issue 예

```text
ERROR relations/missing-target

Document:
linux-pci-enumeration

Field:
prerequisites

Missing document:
pcie-configuration-space
```

```text
WARNING relations/prerequisite-cycle

Cycle:
virtual-memory
→ page-table
→ mmu
→ virtual-memory
```

---

# 18. 관계를 모든 기존 글에 강제하지 않는다

문서 수가 많다면 전부 관계를 설정하려다 실패하기 쉽다.

우선순위:

```text
대표 문서 20개
Topic Hub Start Here
Featured Guide
검색 유입 상위 글
고아 문서 상위 후보
```

나머지는 상위 Topic 링크만 있어도 된다.

---

# 19. 문서 하단 정보 구조

모든 관계를 카드 8개로 늘어놓지 않는다.

권장 순서:

```text
이 글의 위치
↓
먼저 읽을 글
↓
다음 단계
↓
관련 실전 사례
```

---

## 예시

```text
PCIe & CXL

현재 문서
PCIe BAR 크기는 어떻게 탐색되는가

먼저 읽을 글
PCIe Configuration Space 구조

다음 단계
Linux는 BAR Resource를 어떻게 등록하는가

실전 사례
Alveo U250에서 BAR mmap이 실패한 이유
```

---

# 20. Breadcrumb와 관계 UI 차이

Breadcrumb:

```text
Home
→ PCIe & CXL
→ PCIe BAR
```

현재 정보 계층을 보여준다.

관계 UI:

```text
선행
다음
실전 사례
```

학습 관계를 보여준다.

둘은 역할이 다르므로 하나로 합치지 않는다.

---

# 21. 상단 Prerequisite 표시

고급 문서에서는 본문 전에 선행 지식을 알려주는 것이 좋다.

예:

```text
이 글을 읽기 전에

· PCIe Configuration Space
· Memory-Mapped I/O
```

모든 문서에 큰 박스를 만들 필요는 없다.

Prerequisite가 있는 문서에만 작게 표시한다.

---

# 22. 문서 하단 Next

가장 중요한 관계다.

본문을 다 읽은 사용자가 다음 행동을 선택할 수 있게 한다.

권장 최대:

```text
1~2개
```

다음 글이 6개면 선택 피로가 생긴다.

---

# 23. 관련 실전 사례

Concept 문서에는 Debug Note를 연결하는 것이 강력하다.

예:

```text
Concept
PCIe BAR Size Probing

관련 실전 사례
BAR mapping은 성공했지만 유효한 값이 나오지 않은 사례
```

반대로 Debug Note에는 Concept를 prerequisite로 연결한다.

```text
Debug Note
U250 BAR mmap 실패

먼저 읽을 글
PCIe BAR와 MMIO
```

이 구조가 이론과 경험을 연결한다.

---

# 24. 타입 기반 관계 추천 규칙

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

# 25. 관계 후보 생성 리포트

예:

```text
Document:
pcie-bar-sizing

Detected outbound links:
- pcie-configuration-space
- linux-pci-resource
- u250-bar-debug

Suggested relations:
- prerequisite: pcie-configuration-space
- next: linux-pci-resource
- related: u250-bar-debug
```

최종 front matter 수정은 사람이 한다.

---

# 26. 본문 링크에서 관계 후보 추출

본문 문맥으로 후보를 구분할 수 있다.

예:

```text
먼저 PCIe Configuration Space를 이해해야 한다.
```

→ prerequisite 후보

```text
다음 글에서는 MSI-X를 설명한다.
```

→ next 후보

```text
실제 실패 사례는 U250 BAR 분석을 참고한다.
```

→ related 후보

초기에는 자연어 분석까지 자동화하지 않아도 된다.

링크 주변 문구를 감사 리포트에 보여주는 것만으로도 수동 분류가 쉬워진다.

---

# 27. 고아 문서의 정확한 정의

들어오는 링크가 없다고 모두 고아는 아니다.

실질적 고아 문서는 다음을 만족한다.

```text
공개 상태
검색 대상
상위 Topic이 없음 또는 Hub에서 노출되지 않음
의미 있는 inbound relation 없음
Series에 없음
Featured 아님
```

태그 페이지에서만 링크되는 글은 구조적으로는 고아에 가깝다.

---

# 28. 의미 링크와 UI 링크 구분

모든 `<a>`를 inbound link로 계산하면 다음이 포함된다.

```text
Header
Footer
Archive
Tag
Pagination
Latest Posts
```

이 링크는 지식 관계가 아니다.

따라서 Manifest에서 다음을 구분한다.

```ts
export interface InternalContentLink {
  href: string;
  targetDocumentId?: string;
  semantic: boolean;
}
```

또는 추출 단계에서 본문과 큐레이션 링크만 의미 링크로 본다.

---

# 29. 고아 문서 리포트

```ts
export interface OrphanDocumentReport {
  documentId: string;
  title: string;
  status: ContentStatus;
  topicId: string;

  inboundSemanticLinks: number;
  outboundSemanticLinks: number;

  includedInTopicHub: boolean;
  includedInSeries: boolean;

  recommendation:
    | "link-from-topic-hub"
    | "link-from-canonical-guide"
    | "merge"
    | "historical"
    | "archive"
    | "keep-standalone";
}
```

---

# 30. 고아 문서 처리 우선순위

먼저 다음을 처리한다.

```text
status=current
+
검색 유입 있음
+
고유 콘텐츠 있음
+
상위 Hub 연결 없음
```

이 글은 연결만 추가해도 가치가 크게 올라간다.

---

# 31. 고아 문서 처리 방법

## Topic Hub에 연결

핵심 주제에 속하지만 Hub 목록에서 빠진 경우.

## 대표 Guide에서 링크

세부 개념이거나 보조 설명인 경우.

## Series 편입

실제 순차 흐름이 있는 경우.

## 다른 글과 통합

검색 의도와 내용이 중복되는 경우.

## Historical 처리

과거 환경 기록으로만 의미가 있는 경우.

## Archive

보존 가치도 낮고 일반 탐색에 필요하지 않은 경우.

---

# 32. Related Articles 자동 추천의 fallback

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

# 33. 추천 슬롯

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

# 34. Fallback은 Topic Hub 하나로 충분할 수 있다

명시적 관계가 전혀 없다면:

```text
이 글이 속한 주제

Linux & Systems 전체 보기
```

하나만 보여줘도 된다.

무관한 추천 글보다 낫다.

---

# 35. 추천 알고리즘 점수

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

# 36. 상태 기반 추천 필터

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

# 37. 버전 문맥 일치

다음 추천은 위험하다.

```text
CUDA 11.8 Guide
→ CUDA 13 API 변경 글
```

주제는 같지만 문맥이 다르다.

향후 `appliesTo`나 `testedWith`를 이용해 버전 차이를 감점할 수 있다.

초기에는 수동 관계에서 버전을 확인한다.

---

# 38. Series 모델

모든 연관 문서를 Series로 만들지 않는다.

Series는 다음 조건이 필요하다.

```text
순서가 중요하다
같은 학습 목표를 가진다
여러 편을 읽어야 완결된다
```

예:

```text
Linux PCI Core 코드 따라가기 #1~#5
```

---

# 39. Series 모델 TypeScript

```ts
export interface SeriesDefinition {
  id: string;
  title: string;
  description: string;

  topicId: string;

  documentIds: readonly string[];

  status:
    | "active"
    | "complete"
    | "paused"
    | "archived";
}
```

---

# 40. Series와 `next` 중복

Series 순서가 있다면 `next`를 매 문서마다 반복 입력할 필요가 없다.

```text
Series documentIds
→ 이전·다음 자동 파생
```

문서에 별도 `next`가 있으면 Series 외 추가 추천으로 사용할 수 있다.

---

# 41. Series 검증

```text
문서 ID 존재
문서 중복 없음
문서 Topic 일관성 또는 예외 설명
Archived 문서가 Active Series에 없음
Series 순서 cycle 없음
```

---

# 42. Learning Path와 Series 차이

## Series

같은 연재물.

```text
Kernel Internals #1~#8
```

## Learning Path

여러 종류의 문서를 조합한 학습 경로.

```text
Guide
→ Concept
→ Source Walkthrough
→ Debug Note
```

Learning Path는 다른 Series의 글도 포함할 수 있다.

---

# 43. Learning Path 모델

```ts
export interface LearningPathDefinition {
  id: string;
  title: string;
  description: string;

  topicId: string;

  levels: readonly LearningPathLevel[];
}
```

```ts
export interface LearningPathLevel {
  id: string;
  title: string;
  documentIds: readonly string[];
}
```

예:

```ts
export const PCIE_DRIVER_PATH = {
  id: "pcie-driver",
  title: "PCIe Driver 입문",
  description:
    "장치 발견부터 BAR, MSI-X와 DMA까지 순서대로 학습합니다.",
  topicId: "pcie-cxl",

  levels: [
    {
      id: "foundation",
      title: "기초",
      documentIds: [
        "pcie-overview",
        "pcie-configuration-space",
        "pcie-bar-sizing",
      ],
    },
    {
      id: "driver",
      title: "드라이버",
      documentIds: [
        "linux-pci-enumeration",
        "pcie-msix",
        "linux-dma-api",
      ],
    },
  ],
} as const;
```

---

# 44. Learning Path 내 중복 문서

같은 문서가 여러 Level에 나타나면 대체로 오류다.

다만 하나의 핵심 Reference를 여러 단계에서 다시 참고하도록 할 수 있다.

초기 정책:

```text
동일 Learning Path 내 중복
→ Warning

Start Here 중복
→ Error
```

---

# 45. 관계 그래프 시각화

초기 공개 사이트에는 필요하지 않다.

문서 간 그래프를 화면에 보여주면 멋있지만:

```text
모바일 가독성
접근성
복잡성
레이아웃 안정성
```

문제가 생긴다.

먼저 텍스트 기반 관계 UI를 완성한다.

그래프는 내부 Editorial 도구로 사용할 가치가 더 크다.

---

# 46. 내부 그래프 활용

관리용으로는 다음을 찾을 수 있다.

```text
Inbound link 0
Outbound link 0
과도한 Hub 문서
한 문서로 집중되는 관계
Prerequisite cycle
Superseded chain
```

---

# 47. 문서 연결 밀도

모든 글이 많은 링크를 가져야 하는 것은 아니다.

권장 최소:

```text
상위 Topic 1개
다음 또는 관련 문서 1개
```

대표 문서는:

```text
Prerequisite 0~2
Next 1~2
Applied Example 0~2
```

정도가 적절하다.

---

# 48. 과도한 내부 링크 안티패턴

SEO를 의식해 모든 키워드에 내부 링크를 붙이면 본문이 산만해진다.

예:

```text
PCIe에서 BAR는 DMA와 MSI-X를 사용하는 Linux Driver의…
```

모든 단어에 링크가 걸리면 읽기 어렵다.

원칙:

```text
첫 번째 의미 있는 언급
실제로 선행 설명이 필요한 곳
문맥상 다음 행동이 자연스러운 곳
```

에만 링크한다.

---

# 49. Anchor Text 품질

피해야 할 표현:

```text
여기
자세히 보기
관련 글
참고
링크
```

권장:

```text
PCIe BAR 크기 탐색 과정을 먼저 확인한다.
Linux PCI enumeration 호출 흐름으로 이어진다.
```

링크 문구만 읽어도 대상이 명확해야 한다.

---

# 50. 자동 Anchor 감사

다음 anchor를 warning 후보로 잡을 수 있다.

```text
여기
클릭
자세히
참고
링크
```

하지만 문맥에 따라 정상일 수 있으므로 build error로 만들지 않는다.

---

# 51. 내부 링크가 Redirect를 거치지 않게 한다

기존 글 URL을 변경했을 때 내부 링크가 구주소를 계속 가리킬 수 있다.

외부 사용자는 Redirect로 이동해도 되지만, 내부 링크는 최종 canonical을 직접 가리켜야 한다.

감사:

```text
internal URL
→ redirect registry 확인
→ 최종 target로 수정 제안
```

---

# 52. Heading Anchor 관계

문서 전체가 아니라 특정 소제목으로 연결할 수 있다.

예:

```text
PCIe BAR 문서의 64-bit BAR 섹션
```

```yaml
relatedSections:
  - documentId: pcie-bar-sizing
    anchor: 64-bit-bar
```

하지만 초기 관계 모델에 section 단위까지 넣으면 복잡해진다.

본문 링크에서만 세부 anchor를 사용하고, relation metadata는 문서 단위로 유지하는 편이 낫다.

---

# 53. 관계 기반 Article Page Model

```ts
export interface ArticleRelationViewModel {
  topic: {
    title: string;
    href: string;
  };

  prerequisites: readonly RelationItemViewModel[];
  next: readonly RelationItemViewModel[];
  examples: readonly RelationItemViewModel[];

  replacement?: RelationItemViewModel;
}
```

```ts
export interface RelationItemViewModel {
  id: string;
  href: string;
  title: string;
  description?: string;
  typeLabel: string;
  statusLabel?: string;
}
```

---

# 54. UI 컴포넌트

```text
ArticleRelations.astro
├── TopicBacklink
├── PrerequisiteList
├── NextReading
├── AppliedExamples
└── ReplacementNotice
```

각 문서에 없는 영역은 렌더하지 않는다.

---

# 55. 관계 UI에서 카드 남용 방지

다음과 같이 6개의 큰 카드가 연속되면 본문보다 하단이 무거워진다.

권장:

```text
Next
→ 큰 강조 카드 1개

Prerequisites
→ 작은 텍스트 링크

Examples
→ 작은 목록 1~2개
```

시각적 우선순위를 다르게 한다.

---

# 56. 모바일 관계 UI

모바일에서는:

```text
상위 Topic
먼저 읽을 글
다음 글
실전 사례
```

를 한 열로 표시한다.

가로 carousel을 기본으로 사용하지 않는다.

다음 글이 한 개라면 카드 전체가 명확한 링크가 된다.

---

# 57. 관련 글과 광고 위치

문서 하단 광고가 있다면 관계 UI와 광고가 섞이지 않게 해야 한다.

권장 순서:

```text
본문 종료
→ 필요하면 광고
→ 핵심 요약
→ 다음 읽을 글
→ 오류 제보
```

또는:

```text
본문 종료
→ 다음 글
→ 광고
→ 일반 관련 목록
```

핵심은 광고가 Next 카드처럼 보이지 않게 하는 것이다.

---

# 58. 관계와 검색 Ranking

대표 Guide가 많은 문서의 prerequisite이거나 inbound 의미 링크를 많이 받는다면 검색 가중치에 약한 신호로 사용할 수 있다.

예:

```text
Canonical authority score
```

하지만 단순 inbound 수만 사용하면 오래된 허브 글이 과도하게 올라갈 수 있다.

권장:

```text
명시적 Featured·Start Here
>
Title·Alias 일치
>
Content Status
>
약한 Relation Authority
```

관계는 보조 신호만 사용한다.

---

# 59. 관계와 Sitemap Priority

Sitemap의 `priority`와 `changefreq`는 현대 검색엔진에서 큰 의미가 없거나 무시될 수 있으므로, 관계 그래프 점수를 Sitemap priority에 반영하는 복잡한 시스템은 만들 필요가 없다.

중요한 것은:

```text
canonical URL
정확한 lastmod
indexable 문서만 포함
```

이다.

---

# 60. 관계와 콘텐츠 통합 판단

두 글이 서로 강하게 링크된다고 반드시 합쳐야 하는 것은 아니다.

통합 후보 조건:

```text
검색 의도 동일
문서 타입 동일
내용 반복
각자 독립적인 실험 없음
버전 차이 없음
```

관계만으로 통합하지 않는다.

---

# 61. Superseded chain 축약

다음 구조:

```text
A → B → C
```

에서 A가 열렸을 때 B가 아니라 최종 C로 안내할 수 있다.

```ts
export function resolveCurrentReplacement(
  document: ContentDocument,
  manifest: ContentManifest,
): ContentDocument | undefined {
  const visited = new Set<string>();
  let current = document;

  while (current.relations.supersededBy) {
    if (visited.has(current.id)) {
      throw new Error(
        `Supersession cycle detected from ${document.id}`,
      );
    }

    visited.add(current.id);

    const replacement =
      manifest.byId.get(
        current.relations.supersededBy,
      );

    if (!replacement) {
      throw new Error(
        `Replacement document not found: ` +
        current.relations.supersededBy,
      );
    }

    current = replacement;
  }

  return current.id === document.id
    ? undefined
    : current;
}
```

---

# 62. 내부 링크 Manifest

문서별 링크를 저장한다.

```ts
export interface DocumentLinkManifest {
  documentId: string;

  outboundDocumentIds: readonly string[];

  inboundDocumentIds: readonly string[];

  brokenLinks: readonly string[];
  redirectedLinks: readonly string[];
}
```

본문 링크와 relation metadata를 함께 분석한다.

---

# 63. Link Graph 생성

```ts
export interface LinkGraph {
  outbound:
    ReadonlyMap<string, ReadonlySet<string>>;

  inbound:
    ReadonlyMap<string, ReadonlySet<string>>;
}
```

생성 시 다음은 제외한다.

```text
자기 페이지 heading link
이미지
외부 링크
Header·Footer
```

---

# 64. 링크 그래프와 관계 그래프 차이

## Link Graph

실제 HTML·Markdown에서 연결된 구조.

## Relation Graph

작성자가 의미를 부여한 구조.

예:

```text
본문에서 링크는 했지만 단순 참고
→ Link Graph만 존재

prerequisite로 지정
→ Relation Graph 존재
```

둘을 합치지 않는다.

---

# 65. Link와 Relation 불일치 감사

## Relation은 있지만 본문 링크 없음

항상 문제는 아니다. 하단 UI에서 자동 링크된다.

## 본문에서 강하게 연결하지만 Relation 없음

관계 후보가 될 수 있다.

예:

```text
“이 글을 읽기 전에 X를 이해해야 한다”
```

본문 링크는 있는데 prerequisites에는 없음.

감사 리포트에서 보여준다.

---

# 66. 대표 문서 관계 감사표

| 문서 | Topic | Prerequisite | Next | Example | Inbound |
|---|---|---:|---:|---:|---:|
| PCIe BAR | PCIe | 1 | 2 | 1 | 9 |
| MSI-X | PCIe | 2 | 1 | 2 | 5 |
| U250 BAR Debug | PCIe | 1 | 0 | 2 | 2 |

이 표로 다음을 찾는다.

```text
대표 글인데 inbound가 없음
Next가 없는 막다른 문서
Prerequisite가 지나치게 많음
한 문서에 모든 링크가 집중
```

---

# 67. Next가 없는 문서

모든 문서에 반드시 다음 글이 있어야 하는 것은 아니다.

예:

```text
Reference
Historical
Series 마지막 편
```

이런 글은 Topic Hub로 돌아가는 링크만 있어도 된다.

하지만 Current Guide·Concept가 막다른 문서라면 검토한다.

---

# 68. 관계 품질 규칙

대표 문서 기준:

```text
Prerequisite 0~2
Next 1~2
Related Example 0~2
Topic 1
```

다음은 warning:

```text
Prerequisite 5개 이상
Next 5개 이상
Related 8개 이상
```

관계가 많을수록 좋은 것이 아니다.

---

# 69. 관계 Source of Truth

## 문서 자체가 관리하기 좋은 것

```text
prerequisites
next
related
supersededBy
```

## 중앙 Curation이 관리하기 좋은 것

```text
Home Featured
Topic Start Here
Learning Path
Series 순서
```

모든 관계를 중앙 파일에 넣으면 글과 연결 정보가 멀어진다.

모든 큐레이션을 front matter에 넣으면 화면별 의미가 섞인다.

---

# 70. Front Matter 예시

```yaml
---
id: pcie-bar-sizing
title: PCIe BAR 크기는 어떻게 탐색되는가
topic: pcie-cxl
type: concept
status: current

prerequisites:
  - pcie-configuration-space

next:
  - linux-pci-resource
  - pcie-msix

related:
  - u250-bar-mmap-debug
---
```

---

# 71. Debug Note 예시

```yaml
---
id: u250-bar-mmap-debug
title: Alveo U250 BAR mmap 실패 분석
topic: pcie-cxl
type: debug-note
status: current

prerequisites:
  - pcie-bar-sizing
  - linux-pci-resource

next:
  - vfio-pcie-passthrough

related:
  - fpga-ddr-initialization
---
```

---

# 72. 관계 Validation 코드

```ts
export function validateRelationTargets(
  manifest: ContentManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const document of manifest.documents) {
    const relationEntries = [
      ...document.relations.prerequisites.map(
        (targetId) => ({
          kind: "prerequisite",
          targetId,
        }),
      ),

      ...document.relations.next.map(
        (targetId) => ({
          kind: "next",
          targetId,
        }),
      ),

      ...document.relations.related.map(
        (targetId) => ({
          kind: "related",
          targetId,
        }),
      ),
    ];

    for (const relation of relationEntries) {
      if (relation.targetId === document.id) {
        issues.push({
          ruleId: "relations/self-reference",
          severity: "error",
          documentId: document.id,
          message:
            `${relation.kind} cannot reference the same document.`,
        });

        continue;
      }

      if (!manifest.byId.has(relation.targetId)) {
        issues.push({
          ruleId: "relations/missing-target",
          severity: "error",
          documentId: document.id,
          message:
            `${relation.kind} target ` +
            `"${relation.targetId}" does not exist.`,
        });
      }
    }
  }

  return issues;
}
```

---

# 73. 추천 상태 검증

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

# 74. 관계 Graph 테스트

```ts
it("creates reverse prerequisite links", () => {
  const manifest =
    createContentManifest([
      createDocumentFixture({
        id: "foundation",
      }),

      createDocumentFixture({
        id: "advanced",
        relations: {
          prerequisites: ["foundation"],
          next: [],
          related: [],
        },
      }),
    ]);

  const graph =
    buildRelationGraph(manifest);

  expect(
    graph.dependentsByDocument
      .get("foundation"),
  ).toContain("advanced");
});
```

---

# 75. 고아 문서 테스트

```ts
it("reports public documents with no semantic inbound path", () => {
  const report =
    findOrphanDocuments(
      manifest,
      relationGraph,
      topicCuration,
    );

  expect(
    report.map(
      (item) => item.documentId,
    ),
  ).toContain("isolated-document");
});
```

---

# 76. 관계 데이터 Migration

기존 글에 관련 글 목록이나 `series`가 있다면 바로 새 모델로 자동 변환하지 않는다.

먼저 감사한다.

```text
relatedPosts
seeAlso
nextPost
previousPost
series
tags
본문 링크
```

각 필드의 실제 의미가 다를 수 있다.

---

# 77. Migration 단계

## 1단계

기존 관련 글 데이터를 읽되 UI는 유지한다.

## 2단계

대표 문서 20개에 새 relation metadata 적용.

## 3단계

새 `ArticleRelations` UI를 대표 글에 적용.

## 4단계

기존 태그 기반 관련 글은 fallback으로 이동.

## 5단계

새 관계 품질이 충분하면 기존 관련 글 컴포넌트 제거.

---

# 78. Strangler 방식

```text
명시적 relation 존재
→ 새 역할 기반 UI

명시적 relation 없음
→ 기존 추천 또는 Topic Hub fallback
```

한 번에 모든 글을 migration하지 않는다.

---

# 79. 관계 수동 작업 우선순위

1. 홈 Featured 문서
2. Topic Start Here
3. 대표 Guide
4. 검색 유입 상위 글
5. Debug Note
6. 고아 Current 문서
7. Historical
8. Archive

---

# 80. 대표 20개 관계 매핑 작업

각 문서마다 다음만 결정한다.

```text
상위 Topic
선행 문서 최대 2개
다음 문서 최대 2개
실전 사례 최대 2개
```

20개라면 최대 약 100개 이내 관계로 시작할 수 있다.

사이트 전체를 연결하는 데 충분한 기반이다.

---

# 81. 관계 감사 주기

## 매 변경

```text
없는 대상
자기 참조
잘못된 상태
cycle
```

## 주간 또는 월간

```text
고아 문서
dead end
과도한 관계
redirect 내부 링크
```

## 분기별

```text
대표 Learning Path 재검토
구판 대체 관계
Topic 간 연결
```

---

# 82. 내부 링크 Analytics

사용자가 실제로 다음 글을 클릭하는지 볼 수 있다.

최소 이벤트:

```text
relation_type
source_document
target_document
```

예:

```text
next
pcie-bar-sizing
linux-pci-resource
```

다만 모든 사용자를 추적할 필요는 없다.

Analytics를 사용한다면 Privacy Policy와 데이터 최소화 원칙을 유지한다.

---

# 83. 관계 성과 지표

단순 Page View보다 다음이 의미 있다.

```text
Article → Next 클릭률
Article → Topic Hub 이동률
두 번째 문서 도달률
Learning Path 진행률
```

초기에는 지표를 수집하지 않아도 된다.

구조가 실제로 사용 가능한지가 먼저다.

---

# 84. 내부 링크와 AdSense

내부 탐색 링크와 광고가 혼동되지 않게 한다.

피해야 할 구조:

```text
다음 글
[광고]
관련 글
```

광고가 다음 콘텐츠 카드처럼 보일 수 있다.

광고 영역은 명확히 구분하고, 주요 Next 링크와 시각적으로 다른 형태를 사용한다.

---

# 85. 관계 UI 접근성

```text
섹션 Heading 사용
순서가 있는 Next는 ol
일반 관련 목록은 ul
카드 전체가 명확한 a 링크
상태를 색만으로 표시하지 않음
```

---

# 86. JavaScript 불필요

관계 UI는 빌드 타임 HTML이다.

다음 기능에 client hydration을 추가하지 않는다.

```text
Prerequisite
Next
Related
Topic Backlink
```

Graph animation이나 carousel을 넣지 않아도 된다.

---

# 87. SEO와 내부 링크

내부 링크는 검색엔진이 사이트 구조와 중요 문서를 이해하는 데 도움을 줄 수 있지만, 목적은 검색엔진 조작이 아니다.

좋은 내부 링크는:

```text
독자가 필요한 설명으로 이동
명확한 anchor
대표 문서를 중심으로 연결
구판 대신 current 문서를 사용
```

한다.

---

# 88. 링크 수보다 문맥

한 페이지에 내부 링크 100개를 넣는 것보다:

```text
필요한 선행 1개
다음 단계 1개
실전 사례 1개
```

가 더 유용하다.

Topic Hub와 전체 아카이브가 전체 목록 역할을 맡는다.

---

# 89. 이번 태스크의 최소 구현

1차 구현:

```text
ContentRelations 모델
관계 대상 Validation
역방향 prerequisite graph
대표 문서 20개 관계 지정
ArticleRelations UI
Topic Hub fallback
고아 문서 리포트
```

후속:

```text
Learning Path
Series 자동 이전·다음
관계 후보 생성
관계 기반 검색 보조 점수
내부 링크 Analytics
그래프 시각화
```

---

# 90. 실제 구현 티켓

## REL-01. 관계 Domain 모델

```text
prerequisites
next
related
supersededBy
```

## REL-02. 관계 정규화

빈 배열·중복 제거·ID trim.

## REL-03. Relation Validation

```text
없는 문서
자기 참조
중복
잘못된 상태
```

## REL-04. 역방향 Graph 생성

```text
prerequisiteOf
inbound relation
```

## REL-05. Article Relation View Model

```text
Topic
Prerequisite
Next
Example
Replacement
```

## REL-06. ArticleRelations UI

정적 HTML·모바일 한 열.

## REL-07. 대표 문서 20개 매핑

문서당 관계 2~5개.

## REL-08. 고아 문서 리포트

Current 우선.

## REL-09. 태그 기반 추천을 fallback으로 이동

명시적 관계 우선.

## REL-10. 내부 Redirect Link 감사

구주소 내부 링크 정리.

---

# 91. 권장 커밋 순서

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

# 92. 완료 기준

이 태스크는 관련 글 카드가 생겼다고 완료되는 것이 아니다.

다음이 가능해야 한다.

```text
대표 글을 읽기 전에 필요한 선행 개념을 알 수 있다.

글을 다 읽은 뒤 다음 단계가 명확하다.

Concept와 실제 Debug 사례가 연결된다.

구판은 신판으로 직접 안내된다.

대표 문서가 태그 목록 외에도 의미 있는 inbound link를 가진다.

고아 Current 문서를 식별하고 처리할 수 있다.

태그가 같다는 이유만으로 무관한 글을 추천하지 않는다.

문서 삭제·이름 변경 시 관계 오류가 build에서 발견된다.
```

# 이번 단계의 핵심 결론

내부 링크는 검색엔진을 위한 링크 수 늘리기가 아니다.

> 독자가 하나의 문서에서 다음 이해 단계로 이동하도록 만드는 학습 인터페이스다.

`hawk90.github.io`에서는 다음 관계가 특히 중요하다.

```text
원리 Concept
→ Linux·Firmware Source Walkthrough
→ 실제 FPGA·CUDA·PCIe Debug Note
```

이 연결이 잘 만들어지면 일반적인 개념 정리 블로그와 달리:

```text
왜 그런가
→ 코드에서는 어떻게 동작하는가
→ 실제 장비에서는 어떻게 실패하는가
```

까지 하나의 경로로 이어지는 기술 지식베이스가 된다.

## 66. assistant

# Task 3-20. Article Page 정보 구조와 기술 문서 읽기 UX 설계

앞에서는 문서 사이의 관계를 설계했다.

이번 태스크는 개별 글 페이지가 다음 역할을 제대로 수행하도록 만드는 단계다.

```text
검색·Hub에서 들어온 독자에게
→ 이 글이 무엇을 설명하는지 알려주고
→ 현재도 믿을 수 있는지 보여주고
→ 긴 기술 내용을 읽기 쉽게 만들고
→ 다음 문서로 연결한다
```

핵심은 단순히 Markdown을 예쁘게 렌더링하는 것이 아니다.

> 기술 문서의 범위·근거·환경·본문 구조·코드·결론·다음 행동을 하나의 읽기 흐름으로 설계해야 한다.

---

# 1. 일반적인 기술 블로그 글 페이지의 문제

많은 기술 블로그는 다음 구조다.

```text
제목
날짜
태그
본문
관련 글
댓글
```

겉보기에는 충분하지만 기술 문서로서는 중요한 정보가 빠져 있다.

```text
이 글은 누구를 위한 것인가?
어떤 버전을 기준으로 하는가?
직접 실험한 내용인가?
추정인가 확정된 사실인가?
먼저 알아야 하는 개념은 무엇인가?
결론은 어디까지 일반화할 수 있는가?
```

독자는 본문을 상당 부분 읽은 뒤에야 자신에게 필요한 글인지 판단하게 된다.

---

# 2. Article Page의 목표

좋은 기술 문서 페이지는 첫 화면에서 다음을 알려줘야 한다.

```text
무엇을 다루는가
어떤 종류의 문서인가
어떤 환경과 버전인가
현재 상태는 무엇인가
어떤 선행 지식이 필요한가
```

본문을 다 읽은 뒤에는 다음이 남아야 한다.

```text
핵심 결론
적용 범위
확인하지 못한 부분
다음에 읽을 문서
오류를 제보할 방법
```

---

# 3. 권장 전체 구조

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

# 4. Breadcrumb

예:

```text
Home
→ PCIe & CXL
→ PCIe BAR 크기는 어떻게 탐색되는가
```

## 역할

```text
현재 위치 표시
상위 Topic으로 돌아가기
검색엔진과 접근성에 계층 제공
```

## 피해야 할 것

파일 시스템 구조를 그대로 표시하는 것.

```text
Home
→ Posts
→ 2024
→ Hardware
→ PCIe
→ BAR
```

독자는 저장소 경로가 아니라 지식 구조를 이해해야 한다.

---

# 5. Article Header

권장 순서:

```text
Content Type · Topic
제목
Description
작성자·게시일·수정일
상태·검증일
```

예:

```text
CONCEPT · PCIe & CXL

PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가

BAR 레지스터의 크기 탐색부터 Firmware와 Linux의 MMIO
주소 할당 과정까지 설명합니다.

윤상덕 · 2025-11-04 작성 · 2026-07-29 수정
마지막 검증: 2026-07-20
```

---

# 6. Metadata 우선순위

모든 metadata를 같은 크기의 Badge로 나열하지 않는다.

## 높은 우선순위

```text
문서 타입
Topic
상태
검증 시점
```

## 중간 우선순위

```text
작성일
수정일
환경
난이도
```

## 낮은 우선순위

```text
읽기 시간
태그
문서 ID
단어 수
```

읽기 시간을 보여주더라도 기술 문서는 코드와 실험 때문에 일반적인 분당 단어 계산이 부정확할 수 있다.

필수 정보는 아니다.

---

# 7. Content Type 표시

문서 타입은 독자가 기대할 읽기 방식을 결정한다.

```text
GUIDE
전체 흐름과 실행 순서를 설명

CONCEPT
원리와 메커니즘을 설명

DEBUG NOTE
실제 증상과 원인 추적 기록

EXPERIMENT
가설·방법·결과 중심

SOURCE WALKTHROUGH
특정 소스코드 흐름 분석

REFERENCE
빠르게 다시 찾기 위한 자료
```

현재 모든 글이 같은 `POST`로 보이는 것보다 문서 역할이 명확해진다.

---

# 8. Status Notice

`current` 문서에는 큰 상태 배너를 표시하지 않는다.

경고가 필요한 문서만 보여준다.

## Needs Review

```text
검토가 필요한 문서

이 문서의 일부 환경이나 버전 정보가 현재와 다를 수 있습니다.
중요한 적용 전 현재 사양과 구현을 함께 확인하세요.
```

## Historical

```text
과거 환경을 다루는 문서

이 문서는 Linux 3.10과 XRT 2.13.466 환경을 기준으로 작성되었습니다.
현재 버전에서는 설정과 동작이 달라질 수 있습니다.
```

## Superseded

```text
새 문서로 대체되었습니다

이 글은 기록 목적으로 유지합니다.
현재 문서: PCIe BAR 크기 탐색과 Linux Resource 등록
```

## Archived

```text
보존 문서

일반 학습 경로에서는 사용하지 않는 기록입니다.
```

---

# 9. TL;DR

긴 Guide·Concept·Source Walkthrough에는 유용하다.

권장 형식:

```text
핵심 요약

1. BAR는 장치 메모리 자체가 아니라 Host 주소 공간의 MMIO Window다.
2. 장치는 BAR를 통해 필요한 공간 크기를 보고한다.
3. Firmware나 OS가 실제 주소를 할당하고 Driver가 이를 매핑한다.
```

## 피해야 할 것

본문을 읽지 않아도 될 정도로 모든 내용을 요약하는 것.

TL;DR의 목적은 다음이다.

```text
이 글이 내가 찾는 글인지 빠르게 판단
본문에서 기억해야 할 중심 모델 제공
```

---

# 10. TL;DR 적용 기준

## 권장

```text
Guide
Concept
Source Walkthrough
긴 Debug Note
```

## 선택

```text
Experiment
```

## 대체로 불필요

```text
짧은 Reference
짧은 Debug 기록
```

모든 글에 억지로 3줄 요약을 생성하지 않는다.

---

# 11. Prerequisites

고급 글은 본문 전에 선행 개념을 알려준다.

예:

```text
먼저 알아두면 좋은 내용

· PCIe Configuration Space
· Memory-Mapped I/O
```

## 표시 기준

```text
필수 선행 지식이 실제로 있을 때만
최대 2~3개
```

5개 이상이라면 현재 문서가 너무 많은 개념을 한 번에 요구하거나, 상위 Guide가 필요한 신호일 수 있다.

---

# 12. 대상 독자와 범위

모든 글에 장문의 “대상 독자”를 붙일 필요는 없다.

다만 복잡한 Guide에는 짧게 표시하면 좋다.

```text
이 글은 Linux PCI Driver를 처음 구현하거나,
FPGA 장치의 BAR 문제를 분석하는 개발자를 대상으로 합니다.
```

범위:

```text
PCI Express Base Specification의 BAR 동작과
Linux의 Resource 등록 흐름을 중심으로 설명합니다.

PCIe Endpoint 내부 주소 변환 구현은 다루지 않습니다.
```

이 정보가 있으면 독자가 기대 범위를 빠르게 판단할 수 있다.

---

# 13. Table of Contents

긴 기술 문서에서는 필수에 가깝다.

## 권장 표시 조건

```text
H2가 3개 이상
또는
본문이 충분히 긴 경우
```

짧은 글에 TOC를 넣으면 본문보다 탐색 UI가 커진다.

---

# 14. TOC 구조

```text
이 글의 내용

1. BAR의 역할
2. 크기 탐색
3. 32-bit와 64-bit BAR
4. Firmware 주소 할당
5. Linux Resource 등록
6. 흔한 오해
7. 결론
```

H2 중심으로 표시하고 H3는 현재 섹션 하위로 제한한다.

모든 H4·H5를 펼치면 지나치게 길어진다.

---

# 15. Desktop TOC

가능한 형태:

```text
본문 왼쪽 또는 오른쪽 Sticky TOC
```

주의:

```text
너무 넓은 Sidebar
본문 폭 축소
긴 Heading 잘림
Header와 겹침
```

본문이 코드 중심이라면 충분한 가로 폭이 더 중요할 수 있다.

`max-width`를 과도하게 줄이지 않는다.

---

# 16. Mobile TOC

모바일에서 고정 Sidebar는 적합하지 않다.

추천:

```text
본문 상단 접이식 목차
```

또는 단순한 페이지 내 목록.

```text
이 글의 내용 펼치기
```

별도 JavaScript Drawer보다 `<details>` 기반 정적 구조가 충분할 수 있다.

---

# 17. Active Heading 표시

스크롤 위치에 따라 현재 Heading을 강조하는 기능은 유용하지만 필수는 아니다.

이를 위해 전체 글에 무거운 client hydration을 붙이지 않는다.

가능한 경우 작은 `IntersectionObserver` 스크립트로 격리한다.

첫 구현에서는 정적 TOC만으로 충분하다.

---

# 18. 본문 폭

기술 문서에서는 일반 에세이보다 넓은 폭이 필요하다.

## 일반 설명 문단

```text
65~80 characters 정도의 읽기 폭
```

## 코드와 표

본문 컨테이너 안에서 더 넓은 영역을 사용할 수 있다.

예:

```text
일반 문단: 760px
Wide code/table: 최대 1100px
```

하지만 문단이 전체 화면 폭까지 늘어나면 읽기 어렵다.

---

# 19. 본문 Heading 정책

## H1

페이지 제목 하나.

Markdown 본문에서 H1을 다시 사용하지 않는다.

## H2

주요 논리 단계.

## H3

H2 안의 세부 구조.

## H4 이상

가능하면 최소화한다.

Heading이 지나치게 깊으면 글 구조가 복잡하거나 여러 글로 분리할 필요가 있을 수 있다.

---

# 20. Heading 품질

좋은 Heading:

```text
BAR 크기는 어떻게 탐색되는가
Linux는 탐색 결과를 어디에 저장하는가
64-bit BAR는 두 Register를 어떻게 사용하는가
```

약한 Heading:

```text
개요
내용
추가 설명
기타
정리
```

Heading만 읽어도 글의 논리 흐름이 보여야 한다.

---

# 21. 문단 구조

기술 문서는 문단이 지나치게 짧아도, 지나치게 길어도 읽기 어렵다.

피해야 할 형태:

```text
한 문장.

다음 문장.

다음 문장.
```

또는 15줄짜리 한 문단.

권장:

```text
하나의 주장
→ 이유
→ 예시 또는 증거
```

단위로 묶는다.

---

# 22. 사실·관찰·추론 Callout

권장 Callout은 네 가지면 충분하다.

```text
확인된 사실
직접 관찰
가설
주의
```

## 확인된 사실

사양이나 소스코드로 확인한 내용.

## 직접 관찰

실제 환경에서 본 로그·측정 결과.

## 가설

아직 결정적인 증거가 없는 해석.

## 주의

버전·환경 차이 또는 위험한 적용 조건.

---

# 23. Callout 예

```text
관찰

BAR2를 mmap하는 작업 자체는 성공했지만,
읽은 값은 모두 0xffffffff였다.
```

```text
가설

장치 내부 DDR Controller가 아직 초기화되지 않아
유효한 데이터가 노출되지 않았을 가능성이 있다.

해당 상태 Register를 직접 확인하지 못했으므로
확정된 원인으로 보지는 않는다.
```

이런 구분은 문서 신뢰도를 크게 높인다.

---

# 24. Callout 안티패턴

```text
TIP
NOTE
IMPORTANT
WARNING
DANGER
INFO
SUCCESS
QUESTION
```

종류가 너무 많으면 독자가 의미를 외워야 한다.

시각적 스타일도 복잡해진다.

실제 Editorial 의미가 있는 소수 유형만 유지한다.

---

# 25. 코드 블록 역할

모든 fenced block을 같은 코드로 보지 않는다.

```text
Source Code
Command
Output
Log
Error
Register Dump
Plain Text
```

예:

````markdown
```bash role="command"
lspci -vv -s 01:00.0
```

```text role="output"
01:00.0 Processing accelerators: ...
```
````

명령과 결과가 구분되면 독자가 복사해야 할 부분을 명확히 안다.

---

# 26. 코드 블록 Header

필요한 정보:

```text
언어
파일명
역할
복사 버튼
```

예:

```text
C++ · driver/pci_device.cpp                   Copy
```

모든 코드에 파일명을 강제하지 않는다.

실제 파일 일부를 인용할 때만 사용한다.

---

# 27. 코드 복사

복사 결과에는 다음이 포함되면 안 된다.

```text
Line Number
Diff Marker
Highlight Wrapper
Prompt Symbol
```

예:

화면:

```text
$ cmake --build build
```

복사 결과:

```text
cmake --build build
```

터미널 Prompt를 복사할지 여부는 명령 Role 정책에 따라 결정한다.

---

# 28. 긴 코드 블록

200~300줄 전체 파일을 본문에 넣는 경우를 감사한다.

본문에는:

```text
문제를 설명하는 핵심 부분
```

만 보여주고 전체 소스는 GitHub Permalink로 연결한다.

예:

```text
아래 코드는 IRQ Vector 할당과 등록 부분만 발췌했습니다.
전체 구현은 commit abc123의 pci_device.cpp에서 확인할 수 있습니다.
```

---

# 29. 코드 생략 표현

무작정:

```cpp
// ...
```

만 쓰면 무엇이 생략됐는지 알기 어렵다.

권장:

```cpp
// Error handling omitted for clarity.
// Descriptor initialization continues here.
```

또는:

```cpp
// Remaining queue entries are initialized identically.
```

생략 이유와 범위를 설명한다.

---

# 30. 코드 Highlight

Highlight는 설명 대상 줄에만 사용한다.

한 코드 블록에서 절반 이상을 강조하면 의미가 없다.

권장:

```text
주요 변경 1~5줄
```

나머지는 문맥이다.

---

# 31. Diff 코드

변경 전·후를 설명할 때 두 전체 코드 블록보다 Diff가 유용할 수 있다.

```diff
- frame.refreshFrameFlags = REFRESH_NONE;
+ frame.refreshFrameFlags = REFRESH_SLOT0_ONLY;
```

단, Diff만으로 전체 문맥을 이해하기 어려우면 수정된 전체 함수도 함께 제공한다.

---

# 32. 로그 블록

로그 전체를 붙이지 않는다.

다음 구조를 권장한다.

```text
핵심 로그
→ 각 줄의 의미
→ 전후 문맥이 필요하면 접기 또는 외부 파일
```

예:

```text
pci 0000:01:00.0: BAR 0: no space for [mem size 0x10000000 64bit pref]
```

설명:

```text
운영체제가 256MB 크기의 64-bit Prefetchable MMIO Window를
배치할 수 있는 주소 공간을 찾지 못했다는 의미다.
```

---

# 33. 오류 메시지 표시

검색 인덱싱 대상 오류는 명시적으로 표시한다.

````markdown
```text role="error"
failed to load xclbin
```
````

UI에서도 일반 출력과 구분한다.

하지만 지나치게 강한 빨간색 배경으로 본문 흐름을 압도하지 않는다.

---

# 34. 표

기술 문서에서 표는 비교·Reference에 유용하다.

예:

| 상태 | Render | Search | Sitemap | Featured |
|---|---:|---:|---:|---:|
| Current | O | O | O | O |
| Historical | O | O | 선별 | X |

## 표에 필요한 것

```text
Header Cell
필요한 경우 Caption
단위
정렬
모바일 Overflow
```

---

# 35. 표 안티패턴

```text
문단을 억지로 표로 바꿈
한 셀에 긴 설명 여러 문단
열 10개 이상
모바일에서 화면 전체 확장
```

비교가 목적이 아니라면 일반 목록이나 소제목이 더 낫다.

---

# 36. 모바일 표

페이지 전체가 가로로 스크롤되지 않게 한다.

```text
Table wrapper만 가로 스크롤
```

가능하면 핵심 열을 앞쪽에 배치한다.

열이 너무 많다면:

```text
표를 두 개로 분리
또는
Definition List로 전환
```

한다.

---

# 37. 다이어그램

좋은 다이어그램은 본문을 장식하지 않고 구조를 설명한다.

예:

```text
CPU
→ Root Complex
→ PCIe Switch
→ Endpoint
```

또는:

```text
Virtual Address
→ Page Table
→ Physical Address
→ IOMMU
→ IOVA
→ Device DMA
```

---

# 38. 다이어그램 필수 요소

```text
Caption
본문 설명
방향성
용어 일관성
모바일 대체 표현
```

SVG만 보고 이해해야 하는 구조를 만들지 않는다.

본문에서도 같은 흐름을 텍스트로 설명한다.

---

# 39. 색에만 의존하지 않기

```text
빨간 선 = DMA
파란 선 = MMIO
```

만으로 관계를 구분하면 접근성이 낮다.

다음도 함께 사용한다.

```text
Label
Line Style
Arrow
Pattern
```

---

# 40. 이미지 확대

복잡한 다이어그램은 확대 기능이 유용할 수 있다.

하지만 모든 이미지에 Lightbox JavaScript를 붙이지 않는다.

대상:

```text
복잡한 시스템 다이어그램
레지스터 구조
성능 그래프
```

간단한 아이콘이나 장식 이미지는 제외한다.

---

# 41. 수식

수식이 많은 사이트가 아니라면 MathJax·KaTeX를 전역 로드하지 않는다.

수식이 있는 페이지에서만 빌드 타임 렌더링하거나 필요한 자산만 로드한다.

간단한 식은 일반 HTML로도 충분하다.

```text
size = ~(BAR & mask) + 1
```

---

# 42. 각 Content Type의 본문 구조

문서 타입마다 기본 골격이 다르다.

---

## Guide

```text
목표
전체 흐름
단계별 설명
실제 적용
주의점
결론
다음 단계
```

---

## Concept

```text
핵심 질문
정확한 모델
동작 과정
흔한 오해
적용 범위
결론
```

---

## Debug Note

```text
증상
정상 기대값
환경
가설
수집한 증거
실패한 접근
확정 원인
해결
재발 방지
```

---

## Experiment

```text
질문
가설
환경
방법
Baseline
결과
해석
한계
재현 방법
```

---

## Source Walkthrough

```text
대상 Repository·Version
진입점
호출 흐름
핵심 자료구조
중요 분기
최종 결과
현재 버전과 차이
```

---

## Reference

```text
범위
빠른 조회표
필드·명령·API
예제
출처
버전
```

---

# 43. 본문 템플릿을 강제하지 않기

타입별 골격은 리뷰 기준이지 모든 글에 같은 Heading을 자동 삽입하는 템플릿이 아니다.

예를 들어 Concept 문서마다:

```text
개요
정의
장점
단점
결론
FAQ
```

를 강제로 넣으면 AI 생성 문서처럼 획일화될 수 있다.

구조는 내용에 맞게 조정한다.

---

# 44. 결론

기술 문서의 결론은 본문 Heading을 반복하는 요약이 아니다.

다음에 답해야 한다.

```text
핵심 메커니즘은 무엇인가
실무에서 무엇부터 확인해야 하는가
어떤 조건에서는 결론이 달라지는가
```

예:

```text
BAR 문제를 분석할 때는 Driver의 mmap 코드보다 먼저
장치가 보고한 BAR 크기와 Firmware·OS의 Resource 할당을 확인해야 한다.

주소 매핑이 성공했더라도 장치 내부 Controller 초기화가 끝나지 않았다면
읽은 값은 유효하지 않을 수 있다.
```

---

# 45. Scope & Limitations

실험·디버깅·소스 분석 글에서는 특히 중요하다.

예:

```text
범위와 한계

· CentOS 7.9, Linux 3.10.0-1160 환경에서 확인했습니다.
· AMD Alveo U250과 XRT 2.13.466을 사용했습니다.
· 최신 XRT에서 동일한 동작은 확인하지 않았습니다.
· 장치 내부 DDR 상태 Register는 직접 확인하지 못했습니다.
```

이 섹션은 작성자의 신뢰도를 낮추는 것이 아니라 오히려 높인다.

---

# 46. Tested Environment

문서 하단 또는 상단 Metadata 아래에 표시한다.

```text
검증 환경

OS          CentOS 7.9
Kernel      3.10.0-1160
Hardware    AMD Alveo U250
Runtime     XRT 2.13.466
Toolchain   Vivado 2021.2
```

짧은 환경은 한 줄로 표시할 수 있다.

```text
Tested with Linux 6.8 · GCC 13 · x86_64
```

---

# 47. Evidence

근거를 단순 참고 링크 목록으로만 두지 않는다.

권장 분류:

```text
Specification
Source Code
Direct Experiment
Benchmark
Paper
```

예:

```text
근거

· PCI Express Base Specification Revision 5.0
· Linux v6.12 drivers/pci/probe.c
· AMD Alveo U250, XRT 2.13.466 직접 실험
```

---

# 48. 출처 표시

본문의 핵심 주장 바로 근처에 출처를 연결한다.

문서 끝에 링크 20개만 모아두면 어떤 주장을 뒷받침하는지 알기 어렵다.

다만 모든 문장에 각주를 붙여 읽기 흐름을 깨뜨릴 필요는 없다.

핵심 주장, 사양 요구사항, 측정 결과 중심으로 연결한다.

---

# 49. Source Walkthrough의 기준 정보

상단 또는 본문 첫 부분에 다음을 표시한다.

```text
Repository: Linux Kernel
Version: v6.12
File: drivers/pci/probe.c
Entry Symbol: pci_scan_child_bus()
```

Line Number만 의존하지 않는다.

코드가 변경되면 줄 번호는 쉽게 달라진다.

`commit`, `tag`, `file`, `symbol`을 중심으로 한다.

---

# 50. Experiment 결과

그래프만 보여주지 않는다.

반드시 다음을 함께 제공한다.

```text
측정 단위
Baseline
반복 횟수
대표값
변동 범위
환경
```

예:

| Memory Type | Median | Min | Max | Runs |
|---|---:|---:|---:|---:|
| Pageable | 12.8 ms | 12.4 | 13.5 | 50 |
| Pinned | 7.1 ms | 6.9 | 7.5 | 50 |

결론:

```text
이 환경과 1GB 전송에서는 pinned memory가 중앙값 기준 약 44% 빨랐다.
작은 전송에서는 할당 비용 때문에 같은 차이가 나타나지 않을 수 있다.
```

---

# 51. 그래프

차트에는 다음이 있어야 한다.

```text
축 이름
단위
범례
환경
표본 수
오차 또는 범위
```

0에서 시작하지 않는 축을 사용할 경우 오해가 없게 표시한다.

장식적인 3D 차트는 사용하지 않는다.

---

# 52. 변경 이력

모든 오탈자 수정까지 기록할 필요는 없다.

기술적 의미가 바뀐 변경만 표시한다.

예:

```text
변경 이력

2026-07-29
Linux v6.12 호출 흐름으로 소스 분석을 갱신했습니다.

2026-05-12
64-bit BAR 계산 예제의 Mask 오류를 수정했습니다.
```

Git history가 있으므로 상세 diff를 본문에 모두 복제하지 않는다.

---

# 53. `updated`와 Change Log

`updated`는 마지막 문서 수정일이다.

Change Log는 중요한 의미 변경을 기록한다.

다음은 Change Log에 넣지 않아도 된다.

```text
오탈자 수정
문장 표현 개선
공백 정리
링크 형식 수정
```

---

# 54. 오류 제보

글 하단에 짧은 경로를 제공한다.

```text
이 문서에서 기술적 오류를 발견했나요?

GitHub Issue로 제보
문서 수정 제안
```

Issue 링크에 다음을 미리 포함할 수 있다.

```text
문서 ID
문서 URL
제목
```

---

# 55. Edit Link

저장소의 실제 Markdown 파일로 연결한다.

```text
GitHub에서 이 문서 수정 제안
```

Source Path를 공개 URL로 직접 노출할 필요는 없지만, build-time에 Repository edit URL을 생성할 수 있다.

---

# 56. 댓글

댓글은 기술 문서의 핵심 수정 경로가 아니다.

중요한 정정이 댓글에만 남아 있으면 안 된다.

```text
댓글에서 오류 발견
→ 본문 수정
→ 필요하면 변경 이력 기록
```

댓글은 지연 로딩하고, 사용자가 요청하지 않으면 외부 스크립트를 로드하지 않는다.

---

# 57. Article Relations 위치

본문 직후에 다음을 보여준다.

```text
상위 Topic
먼저 읽을 글
다음 단계
관련 실전 사례
```

문서의 끝이 댓글이나 광고로 끝나지 않게 한다.

독자의 다음 행동이 콘텐츠 탐색이어야 한다.

---

# 58. Article Footer 우선순위

권장:

```text
Conclusion
Scope & Limitations
Evidence / Environment
Next Reading
Error Report
Comments
```

광고가 있다면 이 흐름을 끊지 않게 별도 위치를 정한다.

---

# 59. 광고 배치

기술 설명의 논리 단위를 끊지 않는다.

피해야 할 위치:

```text
코드와 설명 사이
표와 해석 사이
다이어그램과 캡션 사이
단계 2와 단계 3 사이
경고 Callout 안
```

상대적으로 나은 위치:

```text
큰 장이 끝난 뒤
본문 전체 종료 뒤
관련 글 이전 또는 이후
```

승인 전에는 광고 없이 페이지가 완결돼야 한다.

---

# 60. Print Style

기술 문서는 인쇄·PDF 저장 수요가 있을 수 있다.

최소 Print CSS:

```text
Header·Footer Navigation 숨김
검색 버튼 숨김
댓글·광고 숨김
링크 URL 선택적으로 표시
본문 폭 전체 활용
코드 잘림 방지
배경색 단순화
```

다만 전체 PDF 생성 기능을 별도로 만들 필요는 없다.

브라우저 Print가 정상 동작하면 충분할 수 있다.

---

# 61. Dark Mode

코드·표·Callout에서 대비를 별도로 확인한다.

특히:

```text
주석
Line Number
Inline Code
링크
Warning
선택된 TOC
```

가 흐려지기 쉽다.

다크모드 스크린샷만 보고 판단하지 말고 실제 긴 글을 읽어본다.

---

# 62. Inline Code

Inline Code가 문장 중 지나치게 강하게 보이지 않게 한다.

예:

```text
`pci_scan_child_bus()`는 하위 Bus를 순회한다.
```

배경과 테두리를 과도하게 사용하면 문장 전체가 조각나 보인다.

---

# 63. 긴 Identifier

다음은 모바일 폭을 깨뜨릴 수 있다.

```text
pci_alloc_irq_vectors_affinity()
std::hardware_destructive_interference_size
xilinx_u250_gen3x16_xdma_2_1_202010_1
```

Inline Code에 적절한 `overflow-wrap`이나 가로 스크롤 정책을 적용한다.

식별자 중간을 임의의 하이픈으로 변경하지 않는다.

---

# 64. 링크

외부 링크와 내부 링크를 아이콘으로 과도하게 구분하지 않는다.

새 탭을 무조건 열지 않는다.

외부 문서나 사양 링크도 사용자가 브라우저 동작을 선택할 수 있게 일반 링크로 두는 것이 기본이다.

다운로드나 다른 형식은 명확히 표시한다.

---

# 65. Footnote

사양과 논문 인용이 많다면 Footnote를 사용할 수 있다.

하지만 본문에 중요한 근거를 모두 Footnote로 숨기지는 않는다.

Footnote는 보조 설명이나 세부 출처에 적합하다.

---

# 66. Definition List

용어 설명에는 표보다 `<dl>`이 적합할 수 있다.

예:

```text
HPA
Host Physical Address. CPU와 Host Bridge가 사용하는 주소.

DPA
Device Physical Address. CXL 장치 내부 Media를 가리키는 주소.
```

두 열 표보다 모바일에서 읽기 좋다.

---

# 67. FAQ

FAQ는 실제 반복 질문이 있을 때만 추가한다.

예:

```text
BAR는 장치 메모리인가요?
왜 BAR에 0xffffffff를 기록하나요?
BAR 주소는 누가 할당하나요?
```

모든 글에 자동 FAQ를 생성하지 않는다.

본문에서 이미 충분히 설명했다면 중복일 수 있다.

---

# 68. Common Mistakes

기술 문서에서 유용한 섹션이다.

예:

```text
자주 하는 오해

BAR Register 값이 장치 내부 메모리 주소다.
→ 아니다. Host에서 할당된 MMIO Base Address를 나타낸다.

BAR mmap 성공은 장치 초기화 완료를 의미한다.
→ 아니다. 내부 Controller 상태는 별도로 확인해야 한다.
```

Concept와 Debug Note를 연결하는 좋은 장치다.

---

# 69. 독자 질문 기반 Heading

기술 문서가 더 읽기 쉬워진다.

```text
왜 이 단계가 필요한가?
어디에서 주소가 변환되는가?
어떤 로그를 먼저 확인해야 하는가?
```

하지만 모든 Heading을 질문으로 만들 필요는 없다.

내용에 가장 자연스러운 형식을 사용한다.

---

# 70. Article Page View Model

```ts
export interface ArticlePageViewModel {
  seo: PageSeo;

  breadcrumb: readonly BreadcrumbItem[];

  header: ArticleHeaderViewModel;

  statusNotice?: StatusNoticeViewModel;
  summary?: readonly string[];

  prerequisites:
    readonly RelationItemViewModel[];

  tableOfContents:
    readonly TocItemViewModel[];

  testedEnvironment?:
    TestedEnvironmentViewModel;

  evidence:
    readonly EvidenceItemViewModel[];

  relations:
    ArticleRelationViewModel;

  revisions:
    readonly RevisionViewModel[];

  editUrl?: string;
  issueUrl?: string;

  commentsEnabled: boolean;
  adsEligible: boolean;
}
```

Markdown 렌더링 본문 자체는 별도 Slot이나 Rendered Content로 전달한다.

---

# 71. Header View Model

```ts
export interface ArticleHeaderViewModel {
  typeLabel: string;

  topic: {
    title: string;
    href: string;
  };

  title: string;
  description: string;

  author: {
    name: string;
    href?: string;
  };

  publishedLabel: string;
  updatedLabel?: string;
  verifiedLabel?: string;

  difficultyLabel?: string;
}
```

컴포넌트가 날짜와 상태를 직접 계산하지 않는다.

---

# 72. Layout 컴포넌트

```text
ArticleLayout.astro
├── Breadcrumbs
├── ArticleHeader
├── StatusNotice
├── ArticleSummary
├── PrerequisiteNotice
├── ArticleToc
├── ArticleBody
├── TestedEnvironment
├── EvidenceList
├── RevisionHistory
├── ArticleRelations
├── ArticleFeedback
└── CommentsLoader
```

모든 하위 컴포넌트를 반드시 별도 파일로 분리할 필요는 없다.

반복되거나 독립적으로 복잡한 것만 분리한다.

---

# 73. Article Layout가 하지 말아야 할 것

```text
Manifest 조회
Relation 계산
Publication Policy 평가
날짜 형식 결정
Topic Registry 검색
광고 Eligibility 판단
```

이미 완성된 `ArticlePageViewModel`을 받아 표현한다.

---

# 74. Type별 Layout Variant

완전히 별도 Layout을 여섯 개 만들 필요는 없다.

공통 Article Layout 안에서 타입별 선택 섹션을 사용한다.

예:

```text
Experiment
→ Environment와 Results 강조

Debug Note
→ Symptom·Cause·Resolution Navigation 강조

Reference
→ TOC와 빠른 조회표 강조
```

구조가 크게 다를 때만 별도 템플릿을 고려한다.

---

# 75. Reading Progress

긴 글에 진행 표시를 넣을 수 있지만 필수는 아니다.

문제:

```text
고정 Header 복잡성
스크롤 성능
본문 외 Footer까지 포함한 부정확한 진행률
```

TOC와 Heading 구조가 잘 되어 있다면 진행 바 없이도 충분하다.

---

# 76. Copy Heading Link

Heading에 Permalink 기능을 제공할 수 있다.

권장 동작:

```text
Heading Focus 또는 Hover
→ 작은 링크 버튼 표시
→ 클릭하면 URL 복사 또는 해당 Anchor 이동
```

모바일에서는 버튼이 Heading을 가리지 않게 한다.

링크 아이콘만 있고 accessible name이 없는 상태를 피한다.

---

# 77. Heading ID 안정성

Heading 문구를 수정하면 자동 생성 Anchor가 바뀔 수 있다.

외부 링크가 많은 중요 Heading은 명시적 ID를 고려한다.

```markdown
## BAR 크기 탐색 {#bar-size-probing}
```

모든 Heading에 수동 ID를 강제할 필요는 없다.

대표 Reference·Guide의 자주 인용되는 섹션부터 적용한다.

---

# 78. 페이지 성능

Article Page에서 client JavaScript가 필요한 기능은 제한적이다.

```text
검색
테마 전환
댓글
선택적 TOC active state
이미지 확대
코드 복사
```

다음은 정적 HTML이어야 한다.

```text
본문
Metadata
Status
Relations
TOC 목록
Environment
Evidence
```

---

# 79. 코드 복사 JS

페이지 전체 Framework hydration 대신 작은 vanilla script로 처리할 수 있다.

```text
[data-copy-code]
```

버튼만 이벤트 위임으로 처리한다.

코드 블록마다 별도 Component runtime을 만들지 않는다.

---

# 80. 외부 Script 실패

다음이 차단돼도 Article Page는 읽을 수 있어야 한다.

```text
Giscus
Analytics
AdSense
외부 Font
```

Comments와 광고는 본문 이후에 격리한다.

---

# 81. Structured Data

Article 또는 BlogPosting을 실제 표시 정보와 일치시킨다.

```text
headline
description
datePublished
dateModified
author
mainEntityOfPage
image
```

`lastVerified`는 별도 사용자 표시 정보이며 `dateModified`를 대체하지 않는다.

Debug Note를 자동으로 `HowTo`로 표시하지 않는다.

---

# 82. Article SEO Title

본문 H1과 완전히 동일할 수도 있지만 사이트 이름을 추가할 수 있다.

예:

```text
PCIe BAR 크기는 어떻게 탐색되는가 | Hawk Systems
```

모든 제목 뒤에 Topic·태그·키워드를 반복하지 않는다.

```text
PCIe BAR 완벽정리 BAR SIZE PCI BAR MMIO 주소 계산
```

같은 제목은 피한다.

---

# 83. Description

좋은 Description:

```text
PCIe 장치가 BAR를 통해 필요한 MMIO 크기를 보고하고,
Firmware와 Linux가 실제 주소를 배치하는 과정을 설명합니다.
```

약한 Description:

```text
이번 글에서는 PCIe BAR에 대해 자세히 알아보겠습니다.
```

---

# 84. Canonical

일반 문서는 자기 URL을 Canonical로 사용한다.

Superseded 문서의 처리 방식은 정책에 따라:

```text
noindex + 신판 링크
```

또는 실제로 내용이 완전히 동일하다면 신판 Canonical을 고려할 수 있다.

Canonical을 단순 Redirect 대용으로 사용하지 않는다.

---

# 85. 404가 된 Relation

Manifest Validation에서 차단해야 한다.

Article Page에서 relation이 없다고 단순히 카드 하나를 숨기면 데이터 오류가 조용히 남는다.

수동 큐레이션과 relation 대상은 build error가 적절하다.

---

# 86. Mobile Article Header

모바일에서는 Metadata가 제목보다 앞서 너무 많은 공간을 차지하지 않게 한다.

권장:

```text
Type · Topic
제목
Description
작성·수정 정보
필요한 상태
```

배지 5~6개를 첫 화면에 늘어놓지 않는다.

---

# 87. Mobile Code Block

검사:

```text
복사 버튼이 첫 줄을 덮지 않음
가로 스크롤 가능
페이지 전체 폭 확장 없음
긴 파일명이 Overflow 처리
Line Number가 내용 폭을 지나치게 줄이지 않음
```

작은 화면에서는 Line Number를 숨기는 것도 고려할 수 있다.

---

# 88. Mobile TOC

본문을 시작하기 전에 화면 한두 개를 목차가 차지하지 않게 한다.

기본 접힘 상태를 고려한다.

```text
이 글의 내용 7개 섹션
```

을 누르면 펼쳐진다.

---

# 89. 접근성

필수 검사:

```text
H1 하나
Heading 순서
Skip Link
코드 복사 버튼 accessible name
TOC nav label
Callout 의미가 색만으로 전달되지 않음
표 Header
이미지 alt
Focus 표시
```

---

# 90. 이미지 Alt

다이어그램의 모든 노드를 Alt에 복사하지 않는다.

짧은 목적 설명:

```text
Host Physical Address가 HDM Decoder를 거쳐 Device Physical Address로 변환되는 흐름
```

세부 내용은 본문이나 Figure Caption에서 설명한다.

장식 이미지는 빈 Alt를 사용한다.

---

# 91. Figure와 Caption

```html
<figure>
  <img ... />
  <figcaption>
    PCIe BAR 탐색과 Host MMIO 주소 할당 흐름
  </figcaption>
</figure>
```

Caption은 이미지 파일명이나 `Figure 1`만 표시하지 않고 내용의 의미를 설명한다.

---

# 92. Article 품질 검사

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

# 93. Type별 자동 Warning

## Debug Note

```text
Symptom에 해당하는 Heading 없음
Environment 없음
Resolution·Conclusion 없음
```

## Experiment

```text
Environment 없음
Baseline 없음
Result 표나 수치 없음
Limitations 없음
```

## Source Walkthrough

```text
Repository Version 없음
File·Symbol 없음
```

## Guide

```text
Next Reading 없음
```

Heading 이름을 정확히 강제하지 않고 metadata와 구조 후보를 Warning으로 제시한다.

---

# 94. Article Canary 페이지

대표적으로 다음 페이지를 정해 매 UI 변경에서 확인한다.

```text
일반 Concept
긴 Guide
코드가 많은 Source Walkthrough
로그가 많은 Debug Note
표와 그래프가 있는 Experiment
Historical 문서
```

깨끗하고 짧은 글 하나만 테스트하면 실제 문제를 놓친다.

---

# 95. Article Page Visual Regression

선별된 Canary만 사용한다.

```text
Desktop Light
Desktop Dark
Mobile Light
```

외부 댓글과 광고는 Screenshot에서 비활성화하거나 Mock한다.

Font와 날짜를 고정한다.

---

# 96. 인쇄 검사

최소 한 개의 긴 Guide와 코드 문서를 Print Preview로 확인한다.

```text
코드가 잘리는가
표가 페이지 밖으로 나가는가
링크가 식별 가능한가
불필요한 Navigation이 남는가
```

---

# 97. Article Page Migration

기존 Layout을 한 번에 교체하지 않는다.

## 1단계

Header에 Type·Topic·Status를 추가한다.

## 2단계

대표 문서 5개에 TL;DR·Environment·Relation UI 적용.

## 3단계

TOC·Code Block 역할 개선.

## 4단계

대표 문서 20개로 확대.

## 5단계

기존 일반 글에 공통 Layout 적용.

---

# 98. Strangler 방식

```text
새 Metadata가 있는 문서
→ 개선된 Article Header·Relations

Legacy 문서
→ 기존 Header + 최소 공통 Layout
```

기존 글 전체에 Metadata를 채울 때까지 개선을 미루지 않는다.

---

# 99. 실제 구현 티켓

## ART-01. Article Page View Model

```text
Header
Status
Summary
Environment
Evidence
Relations
Revision
```

## ART-02. Article Header 개편

Type·Topic·Description·날짜 우선순위 정리.

## ART-03. Status Notice

Needs Review·Historical·Superseded·Archived.

## ART-04. TL;DR 지원

대표 Guide·Concept에 선택적으로 적용.

## ART-05. Prerequisite Notice

최대 2~3개.

## ART-06. TOC 정리

H2·H3, 모바일 `<details>`.

## ART-07. Code Block Role

Source·Command·Output·Log·Error.

## ART-08. Scope·Environment·Evidence

대표 문서부터 적용.

## ART-09. Article Relations

Topic·Prerequisite·Next·Example.

## ART-10. Error Report·Edit Link

문서 ID와 URL 자동 포함.

## ART-11. Mobile Article Audit

Code·Table·TOC·Heading.

## ART-12. Type별 Quality Warning

Debug·Experiment·Source Walkthrough.

---

# 100. 권장 커밋 순서

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

# 101. 완료 기준

이 태스크는 Article Layout이 예뻐졌다고 완료되는 것이 아니다.

다음이 가능해야 한다.

```text
독자가 첫 화면에서 문서의 목적과 상태를 판단할 수 있다.

Historical·Needs Review 문서가 Current처럼 보이지 않는다.

긴 Guide에서 전체 구조와 현재 위치를 파악할 수 있다.

명령·출력·로그·오류가 서로 구분된다.

실험 결과가 환경·Baseline·한계와 함께 표시된다.

Source Walkthrough의 대상 Version과 Symbol을 확인할 수 있다.

본문을 다 읽은 뒤 다음 문서가 명확하다.

기술적 오류를 쉽게 제보하거나 수정 제안할 수 있다.

모바일에서 코드·표·다이어그램 때문에 페이지 전체가 깨지지 않는다.
```

# 이번 단계의 핵심 결론

좋은 기술 문서 페이지는 글의 본문만 잘 보이게 하는 Layout이 아니다.

> 독자가 문서의 신뢰 범위와 읽는 순서를 이해하고, 코드와 증거를 검토하며, 다음 학습 단계로 이동하게 만드는 인터페이스다.

`hawk90.github.io`에서는 특히 다음 흐름이 중요하다.

```text
문서의 역할과 상태
→ 핵심 모델
→ 코드·사양·관찰
→ 범위와 한계
→ 다음 개념 또는 실전 사례
```

이 흐름이 모든 대표 문서에 일관되게 적용되면 개별 게시물 모음이 아니라 실제 엔지니어링 문서 체계로 보이기 시작한다.

## 67. assistant

# Task 3-21. 콘텐츠 작성·검수·발행 워크플로 설계

앞에서는 좋은 Article Page가 어떤 구조를 가져야 하는지 정리했다.

이번 태스크는 그 구조를 **실제로 계속 유지할 수 있는 작성 프로세스**로 바꾸는 단계다.

핵심 문제는 이것이다.

```text
좋은 문서 템플릿이 존재한다
≠
새 문서가 계속 좋은 품질로 작성된다
```

규칙만 많고 작성 과정이 불편하면 결국 다음 상태로 돌아간다.

```text
일단 메모 작성
→ metadata 생략
→ 검증 환경 누락
→ 관련 글 나중에 추가
→ 그대로 발행
→ 몇 년 뒤 신뢰도 불명
```

따라서 필요한 것은 거대한 CMS가 아니라:

> 초안, 기술 검증, 편집 검수, 발행, 사후 갱신을 반복 가능한 경로로 만드는 것이다.

---

# 1. 전체 문서 생명주기

권장 흐름은 다음과 같다.

```text
Idea
→ Draft
→ Technical Review
→ Editorial Review
→ Ready
→ Published
→ Maintained
→ Historical / Superseded / Archived
```

하지만 이 상태를 모두 front matter enum으로 만들 필요는 없다.

문서에 필요한 축은 크게 두 개다.

```text
발행 상태
+
콘텐츠 유효 상태
```

---

# 2. 발행 상태와 콘텐츠 상태 분리

## 발행 상태

```text
draft: true
draft: false
```

정도면 충분하다.

## 콘텐츠 상태

```text
current
needs-review
historical
superseded
archived
```

예를 들어:

```yaml
draft: true
status: needs-review
```

는 아직 공개하지 않은 검토 중 문서다.

```yaml
draft: false
status: current
```

는 현재 대표 경로에 노출 가능한 문서다.

```yaml
draft: false
status: historical
```

는 공개하되 과거 환경임을 명확히 표시하는 문서다.

---

# 3. 작성 흐름을 너무 세분화하지 않기

다음처럼 상태를 지나치게 늘리지 않는다.

```text
idea
outline
writing
editing
technical-review
copy-review
seo-review
approved
scheduled
published
monitoring
```

개인 블로그에서 이 정도 워크플로는 운영되지 않을 가능성이 높다.

실제 필요한 체크포인트는 다음 네 단계다.

```text
1. 초안
2. 기술 검증
3. 편집 검수
4. 발행
```

---

# 4. 문서 생성 명령

새 Markdown 파일을 직접 복사해 만드는 방식보다 간단한 생성 명령을 추천한다.

```bash
npm run content:new
```

또는:

```bash
npm run content:new -- \
  --type debug-note \
  --topic pcie-cxl \
  --title "Alveo U250 BAR mmap 실패 분석"
```

---

# 5. 생성기가 해야 할 일

```text
안정적인 ID 후보 생성
파일명 생성
기본 front matter 작성
문서 타입별 최소 골격 삽입
중복 ID·slug 검사
초안 상태 설정
```

예:

```yaml
---
id: alveo-u250-bar-mmap-debug
title: Alveo U250 BAR mmap 실패 분석
description: ""
type: debug-note
topic: pcie-cxl
status: needs-review
draft: true

published:
updated:
lastVerified:

prerequisites: []
next: []
related: []
aliases: []
symbols: []
errorMessages: []
---
```

---

# 6. 기본값에서 중요한 것

생성 직후:

```yaml
draft: true
status: needs-review
```

로 둔다.

다음처럼 만들지 않는다.

```yaml
draft: false
status: current
```

문서를 생성했다는 이유만으로 검증 완료 상태가 되면 안 된다.

---

# 7. ID 생성 정책

제목에서 ID를 자동 생성할 수 있다.

```text
Alveo U250 BAR mmap 실패 분석
→ alveo-u250-bar-mmap-debug
```

하지만 제목을 나중에 수정하더라도 ID는 유지한다.

ID는 문서 생성 시점에 한 번 결정하고, 이후 변경을 최소화한다.

---

# 8. 한국어 제목과 ID

한글 제목 전체를 로마자 변환하는 방식은 예측하기 어렵다.

피해야 할 예:

```text
pcie-bareul-eoddeohge...
```

권장:

```text
영문 기술 고유명
+
문서 핵심 역할
```

예:

```text
pcie-bar-size-probing
linux-driver-probe-flow
cuda-bank-conflict
```

사용자가 직접 수정할 수 있는 생성 후보를 제공한다.

---

# 9. 문서 타입별 템플릿

하나의 범용 템플릿만 제공하면 모든 글이 같은 모양이 되거나 필요한 정보가 빠진다.

타입별로 **최소 골격만** 제공한다.

---

## Guide 템플릿

```markdown
## 이 글에서 다루는 것

## 전체 흐름

## 단계별 설명

## 실제 적용

## 주의할 점

## 핵심 정리
```

---

## Concept 템플릿

```markdown
## 핵심 질문

## 정확한 동작 모델

## 동작 과정

## 자주 하는 오해

## 적용 범위

## 핵심 정리
```

---

## Debug Note 템플릿

```markdown
## 증상

## 정상적으로 기대한 동작

## 환경

## 초기 가설

## 수집한 증거

## 실패한 접근

## 원인

## 해결

## 재발 방지
```

---

## Experiment 템플릿

```markdown
## 질문

## 가설

## 실험 환경

## 방법

## Baseline

## 결과

## 해석

## 한계

## 재현 방법
```

---

## Source Walkthrough 템플릿

```markdown
## 분석 대상

## 진입점

## 전체 호출 흐름

## 핵심 자료구조

## 중요한 분기

## 최종 결과

## 버전 차이와 한계
```

---

## Reference 템플릿

```markdown
## 범위

## 빠른 조회

## 필드 또는 API

## 예제

## 버전과 출처
```

---

# 10. 템플릿은 작성 가이드이지 강제 결과가 아니다

생성된 Heading을 모두 채워야만 발행 가능하도록 만들면 형식적인 문단이 생길 수 있다.

예를 들어 짧은 Concept 문서에는 `실제 적용`이나 `FAQ`가 필요하지 않을 수 있다.

따라서:

```text
템플릿
→ 작성 시작점

Validation
→ 핵심 정보 누락 탐지
```

로 사용한다.

---

# 11. 초안 단계

초안에서는 다음만 명확하면 된다.

```text
핵심 질문
대상 독자
문서 타입
Primary Topic
무엇을 새롭게 제공하는가
```

초안 단계부터 문장 완성도와 SEO를 고민하면 기술 내용 검증이 늦어질 수 있다.

---

# 12. 초안 상단 메모

공개되지 않는 Editorial 영역을 둘 수 있다.

```yaml
editorial:
  intent: >
    PCIe BAR mmap 성공과 장치 내부 초기화 완료가
    다른 문제라는 것을 실제 U250 사례로 설명한다.
  openQuestions:
    - DDR controller wake-up 상태를 직접 확인할 수 있는가?
    - 최신 XRT에서도 동일한가?
```

다만 front matter가 지나치게 커질 수 있다.

더 단순하게 Markdown 주석을 사용할 수 있다.

```markdown
<!--
Editorial notes:
- BAR 접근 성공과 내부 DDR 유효성 분리
- XRT 2.13.466에서만 확인
- 최신 XRT 미검증
-->
```

Production HTML에 포함되지 않게 확인한다.

---

# 13. 초안에서 먼저 답할 질문

```text
이 문서는 왜 별도 글이어야 하는가?
기존 글에 추가하는 편이 낫지 않은가?
직접 경험·실험·분석 중 무엇을 제공하는가?
한 문장으로 결론을 설명할 수 있는가?
```

이 질문에 답하기 어렵다면 아직 주제가 너무 넓거나 목적이 불명확할 수 있다.

---

# 14. 중복 콘텐츠 사전 검사

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

# 15. 중복 후보에 대한 결정

```text
기존 문서 보완
새 문서 작성
기존 문서 분리
기존 문서와 통합 예정
Historical 버전 문서
```

새 글을 만들었다면 기존 글과 역할 차이를 metadata나 문서 첫 부분에서 분명히 한다.

예:

```text
기존 Concept:
BAR가 어떻게 동작하는가

신규 Debug Note:
U250에서 BAR mapping 이후 값이 유효하지 않았던 이유
```

---

# 16. 기술 검증 단계

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

# 17. 주장 단위 검수

예:

> XRT는 U250에서 사용자 ISR callback을 지원하지 않는다.

이 문장은 강하다.

검수 질문:

```text
어떤 XRT 버전인가?
어떤 API를 확인했는가?
공식 문서에서 미지원이라고 명시했는가?
단지 사용법을 찾지 못한 것인가?
다른 OS에서는 가능한가?
```

더 정확한 표현:

```text
CentOS 7.9와 XRT 2.13.466 환경에서,
사용자 애플리케이션이 직접 ISR callback을 등록할 수 있는
공개 API를 확인하지 못했다.
```

---

# 18. 사실과 결론 사이 단계

권장 구조:

```text
관찰
→ 해석
→ 결론
→ 한계
```

예:

```text
관찰:
BAR2 mmap은 성공했지만 모든 값이 0xffffffff였다.

해석:
주소 매핑 자체보다 장치 내부 Controller 상태 문제일 가능성이 있다.

결론:
mmap 성공만으로 장치 내부 메모리가 준비됐다고 판단하면 안 된다.

한계:
DDR Controller의 실제 상태 Register는 확인하지 못했다.
```

---

# 19. 기술 검증 체크리스트

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

# 20. 코드 검수

코드가 컴파일 가능한지 확인한다.

최소한 대표 문서 코드에 대해:

```text
문법 오류
누락된 include
변수명 불일치
설명과 코드 동작 불일치
위험한 UB
반환값 처리
```

를 검사한다.

---

# 21. 코드 Snippet 테스트

가능하다면 문서 코드 블록을 추출해 테스트할 수 있다.

예:

````markdown
```cpp test="compile"
#include <cstddef>

constexpr std::size_t alignUp(
    std::size_t value,
    std::size_t alignment)
{
    return (value + alignment - 1)
        & ~(alignment - 1);
}
```
````

빌드 시:

```text
role/source
+
test=compile
```

인 코드만 임시 파일로 추출해 컴파일한다.

---

# 22. 모든 코드 블록을 컴파일하지 않기

다음은 컴파일 대상이 아닐 수 있다.

```text
일부 함수만 발췌
Pseudo Code
Kernel 내부 Context 의존
문법 설명용 잘못된 예
Diff
```

따라서 명시적으로 테스트 대상으로 표시한다.

```text
test="compile"
test="run"
test="none"
```

---

# 23. 실행 결과 검증

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

# 24. 코드 검증 수준 표시

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

# 25. 로그 Redaction 검수

발행 전 다음을 검사한다.

```text
사내 hostname
IP 주소
사용자명
홈 디렉터리
이메일
내부 GitLab·Jira URL
고객명
장치 Serial
Token
절대 경로
```

예:

```text
/home/sangdeok/project
```

대신:

```text
/home/user/project
```

로 일반화한다.

---

# 26. 스크린샷 검수

```text
브라우저 탭
알림
터미널 Prompt
회사명
파일 경로
북마크
메신저
다른 모니터 정보
EXIF
```

필요한 영역만 Crop한다.

단순 Blur는 확대나 이미지 처리로 일부 정보가 남을 수 있으므로, 민감 텍스트는 완전히 덮거나 안전한 이미지로 다시 만든다.

---

# 27. 외부 자료 저작권 검수

다음은 그대로 복사하지 않는다.

```text
공식 문서 전체 표
유료 Specification 대량 캡처
책의 그림
강의 슬라이드
다른 블로그의 다이어그램
```

대신:

```text
직접 다시 그린 설명도
필요한 범위의 짧은 인용
원문 링크
자신의 분석
```

을 사용한다.

---

# 28. 편집 검수 단계

기술 검증이 끝난 뒤 문서 전달력을 검토한다.

```text
제목
Description
첫 문단
Heading 흐름
중복 설명
코드와 설명 순서
결론
다음 읽기
```

---

# 29. 제목 검수

좋은 제목은 하나의 질문이나 약속을 한다.

좋은 예:

```text
PCIe BAR 크기는 어떻게 탐색되는가
Linux Driver의 probe()는 언제 호출되는가
Pinned Memory는 언제 실제로 빨라지는가
```

약한 예:

```text
PCIe BAR 정리
Linux Driver 알아보기
CUDA Memory 완벽 정리
```

---

# 30. 제목이 지나치게 좁은 경우

문서가 전체 초기화 흐름을 다루는데 제목이:

```text
pci_scan_child_bus 함수 분석
```

이면 범위를 축소해 보이게 한다.

반대로 함수 하나만 다루는데:

```text
Linux PCIe 완벽 가이드
```

라고 하면 기대를 과장한다.

제목과 실제 범위를 일치시킨다.

---

# 31. Description 검수

Description은 다음을 포함한다.

```text
대상
범위
얻을 수 있는 결과
```

예:

```text
PCIe Endpoint가 BAR를 통해 필요한 MMIO 크기를 보고하고,
Firmware와 Linux가 해당 주소 공간을 배치하는 과정을 설명합니다.
```

---

# 32. 첫 문단 검수

첫 문단에서 배경 역사를 길게 시작하지 않는다.

약한 시작:

```text
컴퓨터 기술은 빠르게 발전해 왔으며,
PCIe는 현대 컴퓨터에서 매우 중요한 기술입니다.
```

권장:

```text
PCIe Driver가 BAR를 사용하려면 먼저 장치가 요구하는
MMIO 공간의 크기와 운영체제가 할당한 실제 주소를 구분해야 한다.
이 두 값을 혼동하면 mmap은 성공해도 잘못된 영역을 접근할 수 있다.
```

---

# 33. Heading만 읽기 검사

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

# 34. 중복 문단 검사

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

# 35. 코드와 설명 순서

일반적으로 다음 순서가 읽기 쉽다.

```text
코드가 해결하려는 문제
→ 핵심 코드
→ 코드의 중요한 줄 설명
→ 실행 결과
```

설명 없이 긴 코드부터 보여주면 독자가 무엇을 봐야 하는지 모른다.

---

# 36. 문서 언어 일관성

한국어 문서에서 기술 용어는 다음 원칙이 실용적이다.

```text
첫 등장:
한글 설명 + 영문 원어

이후:
널리 쓰이는 표기 사용
```

예:

```text
메모리 매핑 입출력(Memory-Mapped I/O, MMIO)
```

이후 `MMIO` 사용.

모든 용어를 억지로 번역하지 않는다.

```text
Probe
Descriptor
Queue
Fence
```

처럼 개발자가 실제로 사용하는 표현은 설명 후 그대로 쓸 수 있다.

---

# 37. 표기 Registry

중앙 Terminology Registry를 문서 편집에도 활용한다.

예:

```text
MSI-X
```

를 공식 표기로 사용하고:

```text
MSIX
MSI X
```

는 검색 Alias로만 유지한다.

표기 drift 예:

```text
DeviceTree
Device Tree
device-tree
DT
```

문맥에 맞는 대표 표기를 정한다.

---

# 38. 문장 품질 자동 검사

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

# 39. 자동 문장 검사를 Error로 만들지 않기

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

# 40. 문서 품질 점수의 한계

앞서 품질 점수 개념을 제안했지만, 점수 자체를 목표로 삼으면 체크리스트 채우기 문서가 될 수 있다.

예:

```text
FAQ +5
다이어그램 +10
```

때문에 필요 없는 FAQ와 그림을 추가할 수 있다.

따라서 권장 방식은 점수보다 **게이트와 신호**다.

---

# 41. 필수 Gate

대표 문서가 되려면 반드시 충족해야 한다.

```text
status=current
description 존재
topic·type 존재
환경이 필요한 글이면 환경 표시
핵심 주장에 근거 존재
범위와 한계 표시
다음 읽기 존재
```

---

# 42. 품질 신호

있으면 좋지만 모든 글에 강제하지 않는다.

```text
다이어그램
FAQ
Common Mistakes
실행 가능한 예제
성능 그래프
변경 이력
```

---

# 43. 품질 리포트

점수 하나 대신 항목별 상태를 보여준다.

```text
Document: pcie-bar-sizing

Required
✓ Type
✓ Topic
✓ Current Status
✓ Description
✓ Evidence
✓ Scope
✓ Next Reading

Recommended
✓ Diagram
– Experiment
✓ Common Mistakes
– Revision History

Warnings
- Last verified 14 months ago
```

이 형태가 실제 개선 방향을 더 잘 보여준다.

---

# 44. 문서 검수 명령

```bash
npm run content:review -- pcie-bar-sizing
```

출력:

```text
Article Review
──────────────

ID: pcie-bar-sizing
Type: concept
Topic: pcie-cxl
Status: current

Errors: 0
Warnings: 2

WARNING
No explicit lastVerified date.

WARNING
Two internal links pass through redirects.
```

---

# 45. 대표 문서 검수 명령

```bash
npm run content:review:representative
```

대상:

```text
Home Featured
Topic Start Here
Topic Featured
대표 문서 목록
```

이 집합은 일반 문서보다 강하게 검사한다.

---

# 46. Git 변경 기반 검수

매번 500개 문서를 모두 수동 검토할 필요는 없다.

```bash
npm run content:review:changed
```

Git diff에서 변경된 Markdown을 찾고:

```text
schema
internal links
type별 구조
secret
redaction 후보
```

를 검사한다.

전체 Manifest 무결성은 별도로 항상 확인한다.

---

# 47. 발행 전 체크리스트

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

# 48. `draft: false` 전환 조건

최소 다음을 충족해야 한다.

```text
Schema 통과
내부 링크 통과
Secret Scan 통과
대표 환경 정보 확인
Description 작성
상위 Topic 연결
```

`current` 승격은 더 강한 조건을 요구한다.

---

# 49. `current` 승격 조건

```text
기술적으로 다시 읽고 확인함
중대한 미확인 가설이 사실처럼 남아 있지 않음
환경·버전 범위가 명확함
대표 경로에서 추천해도 됨
구판 대체 여부를 확인함
```

검증하지 못한 문서를 발행해야 한다면:

```yaml
status: needs-review
```

를 유지한다.

---

# 50. 발행 날짜와 수정 날짜

## `published`

최초 공개 날짜.

내용을 대폭 수정해도 유지한다.

## `updated`

의미 있는 본문 수정 날짜.

단순 빌드나 형식 수정으로 자동 변경하지 않는다.

## `lastVerified`

기술 내용을 다시 확인한 날짜.

문장을 수정했다고 자동 갱신하지 않는다.

---

# 51. Git 날짜 자동 사용의 문제

파일 commit 날짜를 `updated`로 사용하면 다음 변경도 문서 수정으로 보인다.

```text
Formatter
파일 이동
Front matter migration
대량 링크 치환
```

따라서 사용자에게 표시할 의미 있는 날짜는 metadata로 관리한다.

Git 날짜는 보조 정보나 감사에 사용할 수 있다.

---

# 52. 발행 명령

단순 workflow를 만들 수 있다.

```bash
npm run content:publish -- pcie-bar-sizing
```

수행:

```text
문서 존재 확인
draft=true 확인
필수 validation
published 비어 있으면 오늘 날짜 설정
updated 설정 여부 확인
draft=false 변경
```

하지만 자동으로 `status=current`로 바꾸지는 않는다.

사용자가 명시해야 한다.

```bash
npm run content:publish -- \
  pcie-bar-sizing \
  --status current
```

---

# 53. 발행 스크립트의 안전장치

자동 수정 전에 dry-run을 제공한다.

```bash
npm run content:publish -- \
  pcie-bar-sizing \
  --status current \
  --dry-run
```

출력:

```text
Planned changes

draft: true → false
status: needs-review → current
published: undefined → 2026-08-01
updated: undefined → 2026-08-01
```

---

# 54. 자동 발행을 과도하게 만들지 않기

다음은 필요 없다.

```text
승인 버튼
다단계 CMS Workflow
Reviewer Role
예약 발행 Dashboard
Slack Approval
```

개인 저장소에서는 Git diff와 CI만으로 충분하다.

---

# 55. Pull Request 템플릿

문서 변경 전용 체크리스트를 둘 수 있다.

```markdown
## Content change

- [ ] 신규 문서
- [ ] 기술 내용 수정
- [ ] 상태 변경
- [ ] URL 변경
- [ ] 관계 변경

## Verification

- [ ] Environment documented
- [ ] Claims verified
- [ ] Internal links checked
- [ ] Sensitive data removed
- [ ] Mobile article reviewed
```

혼자 작업하더라도 검수 기록이 남는다.

---

# 56. PR이 항상 필요한가

개인 블로그에서 오탈자 하나마다 PR을 만들 필요는 없다.

권장:

## PR 또는 별도 Branch

```text
대표 문서 대규모 개편
URL 변경
Schema 변경
빌드 파이프라인 변경
대량 Migration
```

## 직접 작은 Commit 가능

```text
오탈자
깨진 링크
작은 문장 수정
단순 metadata 보완
```

---

# 57. 커밋 단위

좋은 예:

```text
content(pcie): verify BAR size probing guide
```

```text
content(cuda): add bank-conflict benchmark limits
```

```text
fix(content): correct BAR mask calculation
```

피해야 할 예:

```text
blog update
content fixes
misc
```

---

# 58. 기술적 오류 수정

중대한 오류를 수정할 때 다음을 고려한다.

```text
본문 수정
updated 날짜
필요하면 lastVerified
변경 이력
관련 문서 영향
검색 Alias·Description 영향
```

예:

```text
BAR size 계산식 오류
```

는 다른 글에도 복사됐을 가능성이 있으므로 저장소 전체를 검색한다.

---

# 59. 정정 정책

작은 오류:

```text
본문 수정
updated 변경
```

중요한 기술 오류:

```text
본문 수정
updated
변경 이력
필요하면 공지 Callout
```

결론 자체가 뒤집힌 경우:

```text
명확한 정정
기존 결론이 왜 잘못됐는지 설명
관련 문서 재검토
```

조용히 내용을 바꾸어 기존 독자가 혼란스럽게 만들지 않는다.

---

# 60. 오래된 문서 검토

날짜만으로 자동 `needs-review`로 바꾸지는 않는다.

기술마다 변동성이 다르다.

```text
C++ 언어 기본 원리
→ 비교적 안정적

CUDA Toolkit 설치
→ 변동 큼

Linux Kernel Source Walkthrough
→ 버전 영향 큼

PCIe BAR 기본 구조
→ 비교적 안정적

특정 XRT Runtime API
→ 변동 큼
```

---

# 61. Freshness Policy

Topic·Type별 검토 주기를 둘 수 있다.

```ts
export interface FreshnessPolicy {
  topicId?: string;
  type?: ContentType;
  reviewAfterMonths: number;
}
```

예:

```text
Tool 설치 Guide: 6개월
Source Walkthrough: 12개월
Debug Note: 18개월
Stable Concept: 36개월
```

이는 자동 상태 변경이 아니라 검토 후보 생성에 사용한다.

---

# 62. Freshness Report

```text
Needs verification

1. xrt-u250-interrupt
   Last verified: 2024-11-02
   Policy: 12 months
   Overdue: 9 months

2. cuda-colab-setup
   Last verified: 2025-07-10
   Policy: 6 months
```

---

# 63. 검토 결과

문서를 다시 확인한 뒤 선택한다.

```text
Current 유지 + lastVerified 갱신
Needs Review
Historical
Superseded
Archived
```

날짜만 갱신하지 않는다.

실제로 내용을 확인한 경우에만 `lastVerified`를 변경한다.

---

# 64. Needs Review 큐

```text
reports/content-review-queue.md
```

우선순위:

```text
Featured
Start Here
검색 유입 상위
중요한 오류 가능성
변동성이 큰 기술
일반 문서
```

모든 오래된 글을 같은 순서로 검토하지 않는다.

---

# 65. 검토 예산

매주 모든 글을 갱신하는 것은 불가능하다.

현실적인 루틴:

```text
주 1개 대표 문서 재검증
월 1개 Topic Hub 정비
월 5개 Needs Review 분류
분기 1회 구판·고아 문서 감사
```

이 정도만 지속해도 품질이 점진적으로 올라간다.

---

# 66. 문서 삭제보다 상태 변경 우선

오래됐다고 바로 삭제하면 다음을 잃을 수 있다.

```text
외부 링크
과거 환경 검색 유입
문제 해결 기록
기술 변화 과정
```

선택:

```text
Historical
Superseded
Archived
Redirect
삭제
```

중 가장 의미에 맞는 방식을 사용한다.

---

# 67. AI 사용 위치

AI는 다음 작업에 유용하다.

```text
초안 구조 제안
문장 정리
중복 문단 탐지
Heading 후보
체크리스트 누락 확인
Alias 후보
문서 관계 후보
```

---

# 68. AI에 맡기면 위험한 작업

검증 없이 다음을 맡기지 않는다.

```text
기술 사실 확정
실험 결과 생성
환경 정보 추정
존재하지 않는 출처 생성
최신 API 상태 판단
실제 장애 원인 확정
```

AI가 작성한 기술 주장은 반드시 원자료나 실험으로 확인한다.

---

# 69. AI 작성 흔적을 숨기는 것이 목표가 아니다

중요한 것은 AI를 사용했는지가 아니라:

```text
사실이 맞는가
직접 경험이 정확히 표현됐는가
근거가 있는가
불확실성이 표시됐는가
```

이다.

Editorial Policy에 AI 활용 범위를 간단히 공개할 수 있다.

---

# 70. AI 초안의 위험 패턴

```text
과도한 일반론
같은 결론 반복
존재하지 않는 API
버전 혼합
그럴듯한 원인 단정
불필요한 FAQ
형식적인 장단점
```

특히 기술 문서에서는 “일반적으로”, “보통”, “대부분” 같은 단어 뒤의 근거를 확인한다.

---

# 71. AI 검수 프롬프트보다 문서 규칙이 먼저

복잡한 프롬프트 하나로 품질을 보장하려 하지 않는다.

```text
Content Type
Status
Evidence
Environment
Scope
Relations
```

가 구조적으로 존재하면 AI 출력도 검수하기 쉬워진다.

---

# 72. 문서 변경 Diff 검수

대량 AI 편집에서 가장 중요한 것은 Diff 범위다.

피해야 할 것:

```text
기술 내용 수정
+
전체 문체 재작성
+
Heading 변경
+
Formatting
```

을 한 번에 적용하는 것.

권장:

```text
1. 구조 수정
2. 기술 오류 수정
3. 문장 다듬기
4. Formatting
```

을 분리한다.

---

# 73. 대량 문서 변환

다음 작업은 script로 처리할 수 있다.

```text
status 필드 추가
type 필드 추가
Topic ID 변환
날짜 형식 변경
Tag Alias 통합
```

하지만 script가 의미를 추정하지 않게 한다.

예:

```text
제목에 CUDA가 있음
→ 무조건 gpu-cuda Topic
```

은 오분류 가능성이 있다.

---

# 74. Migration 결과 분류

```text
확정 변환
수동 검토 필요
변환 불가
```

예:

```text
기존 category=CUDA
→ gpu-cuda 확정 가능

기존 category=Development
→ 수동 검토 필요
```

---

# 75. 편집 작업과 플랫폼 작업 분리

다음 변경을 하나의 PR에 묶지 않는다.

```text
Schema 변경
+
Article Layout 개편
+
글 200개 metadata 수정
```

권장:

```text
1. Schema는 optional로 추가
2. 대표 문서 적용
3. UI가 새 metadata 지원
4. 대량 Migration
5. Strict 규칙 강화
```

---

# 76. 신규 문서 Strict Gate

신규 문서는 처음부터 높은 기준을 적용한다.

필수:

```text
id
title
description
type
topic
status
draft
published
```

발행 시:

```text
내부 링크
환경·범위 검토
관계
Secret Scan
모바일
```

기존 Legacy 문서 때문에 신규 문서 기준까지 낮추지 않는다.

---

# 77. 기존 문서 Legacy Gate

기존 글은 최소 구조 오류만 차단한다.

```text
중복 URL
깨진 Markdown
비밀 정보
Draft 유출
```

나머지는 Warning과 검토 Queue로 관리한다.

---

# 78. Representative Gate

홈과 Topic Hub에서 대표로 노출되는 문서는 가장 엄격해야 한다.

```text
status=current
description
type·topic
기술 검증
환경 필요 여부 판단
근거
다음 읽기
모바일 검토
```

---

# 79. 세 가지 검증 프로파일

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

# 80. Validation Profile 결정

```ts
export function resolveValidationProfile(
  document: ContentDocument,
  context: ValidationContext,
): ValidationProfile {
  if (
    context.representativeDocumentIds
      .has(document.id)
  ) {
    return "representative";
  }

  if (
    context.newDocumentIds
      .has(document.id)
  ) {
    return "new";
  }

  return "legacy";
}
```

문서 front matter에 profile을 직접 넣지 않는다.

---

# 81. 문서 생성부터 발행까지 명령 예

```bash
npm run content:new -- \
  --type concept \
  --topic pcie-cxl \
  --title "PCIe BAR 크기는 어떻게 탐색되는가"
```

작성 후:

```bash
npm run content:review -- pcie-bar-size-probing
```

발행 Dry Run:

```bash
npm run content:publish -- \
  pcie-bar-size-probing \
  --status current \
  --dry-run
```

최종 발행:

```bash
npm run content:publish -- \
  pcie-bar-size-probing \
  --status current
```

---

# 82. 작성자 경험을 줄이는 것

작성할 때 매번 긴 front matter를 직접 입력하지 않도록 한다.

자동 생성 가능:

```text
ID
slug
draft
빈 relation 배열
기본 날짜 형식
문서 템플릿
```

사람이 판단해야 하는 것:

```text
Description
Type
Topic
Status
환경
관계
```

---

# 83. Front Matter가 지나치게 길어지는 문제

다음 정보가 모두 metadata로 들어가면 본문보다 길어질 수 있다.

```text
difficulty
confidence
evidence
appliesTo
notAppliesTo
knowledgeSource
audience
codeVerification
revisionHistory
```

초기에는 핵심만 구조화한다.

```text
type
topic
status
dates
testedWith
relations
aliases·symbols
```

나머지는 본문 섹션으로 표현한다.

---

# 84. 구조화 여부 판단 기준

Metadata로 둘 정보:

```text
검색·필터·검증·UI에서 반복 사용
```

본문으로 둘 정보:

```text
문서별 설명이 필요
문맥 의존적
자유 형식이 더 적합
```

예:

```text
testedWith
→ metadata가 유용

범위와 한계
→ 본문이 적합
```

---

# 85. Editorial Dashboard가 필요한가

초기에는 필요 없다.

Markdown Report와 CLI면 충분하다.

```text
Current 문서 수
Needs Review
검토 기한 초과
고아 문서
Description 누락
대표 문서 오류
```

를 정적 Report로 만든다.

---

# 86. Editorial Report 예

```text
Content Health

Total documents: 532
Current: 84
Needs Review: 341
Historical: 65
Superseded: 28
Archived: 14

Representative documents
Ready: 12
Warnings: 6
Blocked: 2

Top review priorities
1. linux-pci-enumeration
2. xrt-u250-interrupt
3. cuda-pinned-memory
```

---

# 87. Report는 공개 사이트와 분리

Editorial Report에는 다음이 포함될 수 있다.

```text
Source Path
미완성 문서
내부 검토 메모
오류 후보
```

따라서 `public/`이나 최종 `dist`에 넣지 않는다.

CI Artifact나 로컬 `reports/`에만 둔다.

---

# 88. 문서 품질 회귀

대표 문서가 나중에 `current`에서 `needs-review`로 바뀌었는데 Featured 설정에 남을 수 있다.

이를 CI에서 차단한다.

문서의 관계 대상이 삭제되거나 상태가 변경돼도 마찬가지다.

편집 워크플로와 Manifest Validation이 연결돼야 한다.

---

# 89. 발행 후 Smoke Test

신규 문서나 대규모 수정 후 다음을 확인한다.

```text
운영 URL
Title·Description
Canonical
Status Notice
TOC
코드
표
모바일
다음 읽기
```

자동 HTTP 테스트와 짧은 수동 확인을 함께 사용한다.

---

# 90. 발행 후 바로 할 일

```text
검색 결과에서 문서 확인
Topic Hub 포함 확인
Sitemap 정책 확인
관련 문서 링크 확인
```

Search Console 수동 색인 요청은 핵심 대표 문서 정도에서 필요할 때 사용하고, 모든 글마다 반복하는 운영 방식으로 삼지 않는다.

---

# 91. 운영 루틴

## 문서 작성 시

```text
content:new
→ 작성
→ content:review
→ publish
```

## 주간

```text
대표 문서 1개 검증
깨진 내부 링크 확인
Needs Review 우선 문서 확인
```

## 월간

```text
Topic Hub 1개 검토
고아 문서 확인
중복 후보 확인
검색 Golden Query 검토
```

## 분기

```text
Historical·Superseded 정리
외부 링크 감사
Editorial Policy와 실제 운영 비교
```

---

# 92. 하지 않을 것

```text
모든 문서에 복잡한 승인 단계
모든 코드 블록 자동 실행
모든 오래된 글 자동 비공개
AI 점수로 자동 발행
품질 점수만으로 Featured 지정
대규모 CMS 구축
```

---

# 93. 최소 구현 범위

1차 구현은 다음이면 충분하다.

```text
문서 타입별 생성기
draft 기본값
변경 문서 validation
대표 문서 validation
content:review 명령
content:publish dry-run
Freshness report
문서 발행 체크리스트
```

후속:

```text
Code Snippet compile
중복 문서 후보
AI-assisted relation suggestions
Editorial Dashboard
예약 발행
```

---

# 94. 실제 구현 티켓

## EWF-01. Content Generator

```text
type
topic
title
ID·slug
draft
템플릿
```

## EWF-02. 신규 문서 Strict Validation

필수 metadata와 링크 검사.

## EWF-03. Representative Validation

Featured·Start Here·대표 문서 강한 Gate.

## EWF-04. Content Review CLI

문서 하나의 오류와 Warning 출력.

## EWF-05. Changed Document Review

Git diff 기반 검사.

## EWF-06. Publish Dry Run

날짜·draft·status 변경 미리보기.

## EWF-07. Freshness Policy

Topic·Type별 재검토 후보.

## EWF-08. Review Queue Report

Featured와 검색 유입 문서 우선.

## EWF-09. Redaction Scan

로그·스크린샷·본문의 민감 정보 후보.

## EWF-10. Pull Request Checklist

기술·편집·운영 검수.

---

# 95. 권장 커밋 순서

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

# 96. 완료 기준

이 태스크는 문서 템플릿 파일이 생겼다고 완료되는 것이 아니다.

다음이 가능해야 한다.

```text
신규 글이 기본적으로 Draft와 Needs Review 상태로 생성된다.

문서 타입에 맞는 최소 골격에서 작성을 시작할 수 있다.

발행 전에 기술·편집·민감 정보 검사를 실행할 수 있다.

대표 문서는 일반 문서보다 높은 기준을 통과해야 한다.

published·updated·lastVerified가 서로 다른 의미로 관리된다.

오래된 문서는 날짜만으로 자동 폐기되지 않고 검토 Queue에 들어간다.

중요한 기술 오류를 수정했을 때 변경 이력을 남길 수 있다.

전체 과정이 복잡한 CMS 없이 Git과 CLI 안에서 수행된다.
```

# 이번 단계의 핵심 결론

좋은 기술 콘텐츠 시스템은 글을 작성하기 어렵게 만드는 검문소가 아니다.

> 작성자가 핵심 질문, 근거, 환경, 범위와 다음 읽기를 빠뜨리지 않도록 돕고, 검증되지 않은 문서가 대표 콘텐츠처럼 노출되는 것을 막는 안전장치다.

`hawk90.github.io`에 가장 적합한 흐름은 다음 정도다.

```text
간단한 문서 생성
→ 기술 검증
→ 편집 검수
→ 자동 Validation
→ 명시적 발행
→ 주기적 재검토
```

이 흐름이 자리 잡으면 기존 글을 한 번 정리하고 끝나는 것이 아니라, 앞으로 추가되는 글도 같은 품질 체계 안에서 계속 성장할 수 있다.

## 68. assistant

# Task 3-22. 기존 500여 개 글의 점진적 마이그레이션 전략

앞에서는 앞으로 작성할 문서의 작성·검수·발행 흐름을 설계했다.

하지만 `hawk90.github.io`의 현실적인 핵심 문제는 신규 글보다 **이미 쌓여 있는 수백 개의 기존 글**이다.

새로운 Schema와 Topic Hub를 만들어도 기존 글을 한꺼번에 고치려 하면 프로젝트가 멈출 가능성이 높다.

이번 태스크의 목표는 다음이다.

> 기존 콘텐츠를 전면 재작성하지 않고, 사이트를 계속 운영하면서 가치 있는 글부터 새로운 지식베이스 구조로 옮긴다.

---

# 1. 가장 위험한 접근

## 모든 글에 Metadata 일괄 추가

예:

```text
500개 글 전부에:

type
topic
status
description
lastVerified
relations

추가
```

자동으로 필드를 넣는 것 자체는 가능하다.

하지만 의미 있는 값까지 자동으로 결정하면 문제가 생긴다.

```text
제목에 CUDA 포함
→ gpu-cuda

오래된 글
→ historical

짧은 글
→ reference

최근 수정
→ current
```

이 분류는 상당수 틀릴 수 있다.

특히 다음은 기계적으로 판단하기 어렵다.

```text
현재도 유효한 오래된 Concept
최근 작성됐지만 검증되지 않은 글
짧지만 강한 Reference
길지만 중복된 일반론
특정 버전에서만 유효한 Debug Note
```

---

## 전체 본문 AI 재작성

다음 접근도 피해야 한다.

```text
모든 글을 AI로:
문체 통일
Heading 추가
FAQ 추가
요약 추가
Description 생성
```

문제는 단순한 문체가 아니다.

```text
기술적 오류가 새로 들어갈 수 있음
직접 경험과 AI 추론이 섞임
글마다 있던 개성이 사라짐
기존 URL 전체가 대규모로 변경됨
Diff 검토가 불가능해짐
```

AdSense를 위해 글의 분량과 형식만 늘리는 결과가 될 수도 있다.

---

## 전체 URL 재설계

폴더와 Topic을 정리하면서 URL도 함께 바꾸고 싶어질 수 있다.

예:

```text
/posts/2021/pcie-bar/
→ /topics/pcie-cxl/concepts/bar-sizing/
```

정보 구조상 보기 좋지만 외부 링크, 검색 기록, 북마크, 기존 공유 링크가 깨질 위험이 있다.

따라서 기본 원칙은:

```text
지식 구조는 바꾸되
기존 URL은 우선 유지한다.
```

이다.

---

# 2. 마이그레이션의 목표

모든 글을 최신 대표 문서로 만드는 것이 목표가 아니다.

각 기존 문서에 적절한 역할을 부여하는 것이 목표다.

```text
대표 문서로 승격
현재 일반 문서로 유지
검토 필요
Historical로 보존
신판으로 대체
다른 문서에 통합
Archive
```

즉, 기존 글을 전부 고치는 것이 아니라:

> 어떤 글을 투자해서 살리고, 어떤 글을 기록으로 보존하고, 어떤 글을 대표 경로에서 제거할지 결정한다.

---

# 3. 마이그레이션의 네 계층

기존 콘텐츠를 네 단계로 나눈다.

```text
Tier 1: Representative
Tier 2: Valuable
Tier 3: Legacy
Tier 4: Remove or Merge
```

---

## Tier 1. Representative

사이트의 전문성을 대표할 문서.

초기 목표:

```text
20개 선정
10개 완성
```

조건:

```text
직접 경험·실험·소스 분석이 있음
현재도 검색 가치가 높음
Topic Hub의 진입점이 될 수 있음
다른 글의 선행 개념임
보완 비용 대비 가치가 높음
```

처리:

```text
type/topic/status 명시
Description 재작성
기술 재검증
환경·범위 추가
관계 설정
모바일 검토
Featured·Start Here 후보
```

---

## Tier 2. Valuable

대표 문서까지는 아니지만 독립적인 가치가 있는 글.

예:

```text
특정 오류 해결 기록
함수 하나의 코드 분석
짧은 실험 결과
명령·레지스터 Reference
과거 환경의 희귀한 해결법
```

처리:

```text
최소 Metadata
상위 Topic 연결
상태 명시
필요하면 Historical
대표 문서에서 관련 사례로 연결
```

모든 Tier 2 문서를 대규모로 다시 쓰지는 않는다.

---

## Tier 3. Legacy

현재 품질 기준은 부족하지만 즉시 삭제할 이유도 없는 글.

예:

```text
짧은 학습 메모
일반적인 공식 문서 요약
맥락이 부족한 코드 조각
오래된 설치 기록
검증 상태를 알 수 없는 글
```

처리:

```text
기본 노출 유지
대표 경로에서는 제외
필요하면 needs-review
Sitemap·검색 정책 선별
향후 검토 Queue
```

Legacy 문서 때문에 전체 마이그레이션이 막히지 않게 한다.

---

## Tier 4. Remove or Merge

독립 페이지로 유지할 가치가 낮은 글.

예:

```text
내용이 거의 없는 Placeholder
동일 검색 의도의 중복 글
신판에 완전히 흡수된 글
링크 모음만 있는 페이지
제목과 한두 문장뿐인 메모
테스트용 게시물
```

처리:

```text
통합
Redirect
Superseded
Archive
삭제
```

---

# 4. 첫 번째 작업은 수정이 아니라 Inventory

본문을 고치기 전에 전체 콘텐츠 목록을 생성한다.

권장 산출물:

```text
reports/content-inventory.csv
reports/content-inventory.json
```

---

## Inventory 필드

| 필드 | 의미 |
|---|---|
| ID | 안정적인 문서 식별자 |
| Source Path | 원본 파일 |
| URL | 현재 공개 URL |
| Title | 제목 |
| Published | 최초 발행일 |
| Updated | 명시된 수정일 |
| Category | 기존 카테고리 |
| Tags | 기존 태그 |
| Word Count | 대략적 본문 길이 |
| Code Blocks | 코드 블록 수 |
| Images | 이미지 수 |
| Internal Links | 내부 본문 링크 |
| External Links | 외부 링크 |
| Current Status | 기존 상태 또는 미분류 |
| Suggested Topic | 자동 후보 |
| Suggested Type | 자동 후보 |
| Migration Tier | 수동 결정 |
| Action | 유지·보완·통합 등 |

---

# 5. 자동으로 추출할 수 있는 정보

```text
파일 경로
현재 URL
제목
날짜
기존 카테고리·태그
본문 길이
Heading 수
코드 블록 수
내부·외부 링크 수
이미지 수
깨진 Front Matter
```

이 정보는 판단 자료다.

그 자체로 품질을 결정하지 않는다.

---

# 6. 자동 후보로만 사용할 정보

다음은 자동으로 후보를 만들 수 있지만 최종 결정은 사람이 한다.

```text
Primary Topic 후보
Content Type 후보
중복 문서 후보
Historical 후보
Representative 후보
Archive 후보
```

---

## Topic 후보

예:

```text
기존 카테고리: CUDA
→ gpu-cuda 확률 높음

기존 카테고리: Linux
→ linux-systems 또는 firmware-bootloader

기존 태그: PCIe, XRT, FPGA
→ pcie-cxl 또는 firmware-bootloader
```

하나의 글이 여러 영역에 걸칠 수 있으므로 단순 키워드 개수만으로 확정하지 않는다.

---

## Type 후보

예:

```text
제목에 “오류”, “실패”, “해결”
+
로그 블록 많음
→ debug-note 후보

Benchmark 표와 숫자 존재
→ experiment 후보

특정 함수·파일·Repository 링크
→ source-walkthrough 후보

명령과 표 중심
→ reference 후보
```

최종 타입은 글의 핵심 목적을 보고 결정한다.

---

# 7. Inventory 생성 코드 모델

```ts
export interface LegacyContentInventoryItem {
  id?: string;
  sourcePath: string;
  url: string;

  title: string;
  publishedAt?: string;
  updatedAt?: string;

  existingCategories: readonly string[];
  existingTags: readonly string[];

  wordCount: number;
  headingCount: number;
  codeBlockCount: number;
  imageCount: number;

  internalLinkCount: number;
  externalLinkCount: number;

  suggestedTopicIds: readonly Suggestion<string>[];
  suggestedTypes: readonly Suggestion<ContentType>[];

  migrationTier?: MigrationTier;
  migrationAction?: MigrationAction;
}
```

```ts
export interface Suggestion<T> {
  value: T;
  confidence:
    | "high"
    | "medium"
    | "low";

  reasons: readonly string[];
}
```

---

# 8. Confidence를 결과가 아니라 후보 근거로 사용

예:

```json
{
  "value": "pcie-cxl",
  "confidence": "high",
  "reasons": [
    "Existing category is PCIe",
    "Title contains BAR",
    "Body contains lspci and pci_resource"
  ]
}
```

이렇게 하면 사용자가 왜 해당 Topic이 제안됐는지 판단할 수 있다.

단순히:

```text
Topic: PCIe
Confidence: 92%
```

만 보여주는 것보다 낫다.

---

# 9. 마이그레이션 Action 모델

```ts
export const MIGRATION_ACTIONS = [
  "promote",
  "revise",
  "keep",
  "mark-historical",
  "mark-needs-review",
  "supersede",
  "merge",
  "archive",
  "delete",
] as const;

export type MigrationAction =
  (typeof MIGRATION_ACTIONS)[number];
```

---

# 10. Action별 의미

## `promote`

대표 문서 수준으로 보완한다.

## `revise`

독립 가치는 있으나 일부 내용과 구조를 보완한다.

## `keep`

현재 형태를 대체로 유지한다.

최소 Metadata와 Topic만 추가할 수 있다.

## `mark-historical`

과거 환경 문서로 명확히 보존한다.

## `mark-needs-review`

공개는 유지하지만 현재 유효성을 다시 확인해야 한다.

## `supersede`

신판이 존재하며 구판 페이지에 대체 안내를 제공한다.

## `merge`

다른 문서에 내용을 흡수한다.

## `archive`

직접 URL 접근만 유지하고 일반 탐색에서 제외한다.

## `delete`

보존할 이유가 없고 대체 문서도 없는 경우.

---

# 11. 처리 우선순위

전체 문서를 날짜순이나 파일순으로 처리하지 않는다.

권장 우선순위:

```text
1. 홈 Featured 후보
2. Topic Hub Start Here 후보
3. 검색 유입 상위 문서
4. 현재 내부 링크가 많이 들어오는 문서
5. 기술적으로 잘못될 위험이 큰 문서
6. 고아 Current 문서
7. 중복 후보
8. 일반 Legacy
```

---

# 12. 검색 유입 데이터가 없다면

다음 신호로 대체한다.

```text
GitHub에서 자주 링크한 글
다른 글에서 inbound link가 많은 글
직접 기억하기에 대표성이 높은 글
코드·실험이 포함된 글
특정 기술 질문에 자주 다시 찾는 글
```

페이지 조회 수만으로 대표 문서를 정하지 않는다.

높은 조회 수가 다음 때문일 수도 있다.

```text
오래된 설치 오류
우연한 키워드
짧은 답변
검색엔진의 일시적 노출
```

---

# 13. 첫 마이그레이션 Batch

처음에는 20개 이하가 적절하다.

권장 구성:

```text
대표 후보 10개
구판·Historical 후보 5개
중복·통합 후보 5개
```

이 Batch에서 Schema와 워크플로가 현실적으로 작동하는지 확인한다.

---

# 14. Batch 1의 목표

```text
모든 콘텐츠를 정리하는 것
```

이 아니라:

```text
새 모델로 실제 글을 옮길 때
어떤 예외와 운영 문제가 발생하는지 발견하는 것
```

이다.

첫 Batch 이후 Schema가 수정될 가능성이 높다.

따라서 처음부터 500개 문서에 새 필드를 적용하지 않는다.

---

# 15. Batch 단위 작업 흐름

```text
Inventory에서 대상 선택
→ Dry-run 분류
→ 사람 검토
→ Metadata 적용
→ 본문 보완
→ 관계 연결
→ Validation
→ Preview
→ Commit
```

---

# 16. Metadata Migration과 본문 수정 분리

한 문서라도 가능하면 두 단계로 나눈다.

## 1단계

```text
ID
Topic
Type
Status
Description
Relations
```

추가.

## 2단계

```text
기술 내용 재검증
구조 재작성
환경 추가
그림·표 개선
```

Metadata 적용과 본문 의미 변경을 분리하면 Diff 검토가 쉬워진다.

---

# 17. 기계적 Migration Commit

예:

```text
chore(content): add IDs and migration metadata to PCIe articles
```

포함:

```text
ID
Topic 후보
Type
기본 Status
```

본문은 수정하지 않는다.

---

# 18. 의미 변경 Commit

예:

```text
content(pcie): verify BAR sizing and Linux resource flow
```

포함:

```text
본문 수정
환경
결론
범위
근거
```

---

# 19. URL 보존 전략

새 `slug` 필드를 도입하더라도 기존 URL을 기본값으로 유지한다.

```yaml
id: pcie-bar-sizing
slug: existing-url-slug
```

문서 ID와 URL을 분리한다.

```text
ID는 새 지식 구조의 안정적인 정체성
URL은 기존 외부 계약
```

---

# 20. URL을 변경해야 하는 경우

다음 조건을 대부분 만족할 때만 고려한다.

```text
기존 URL이 심각하게 잘못됨
새 문서와 충돌함
의미 없는 자동 날짜·숫자 경로임
문서가 다른 글과 통합됨
Redirect를 안정적으로 제공할 수 있음
```

단순히 새 URL이 더 예뻐 보인다는 이유로 변경하지 않는다.

---

# 21. GitHub Pages Redirect 현실성

GitHub Pages는 서버 측 301 설정이 자유롭지 않을 수 있다.

사용 중인 정적 사이트 도구와 Redirect 방법을 확인해야 한다.

가능한 방법:

```text
정적 Redirect HTML
jekyll-redirect-from 계열
Cloudflare 등 앞단 사용
Custom 404 기반 Client Redirect
```

Client-side Redirect는 검색과 UX에서 제약이 있으므로, URL 변경을 최소화하는 것이 더 안전하다.

---

# 22. URL Alias Registry

```ts
export interface LegacyUrlEntry {
  from: string;
  documentId: string;
  action:
    | "preserve"
    | "redirect"
    | "gone";
}
```

예:

```ts
export const LEGACY_URLS = [
  {
    from: "/posts/pcie-bar/",
    documentId: "pcie-bar-sizing",
    action: "preserve",
  },
] as const;
```

URL 마이그레이션을 문서 관계와 분리해 관리한다.

---

# 23. 중복 문서 탐지

완전한 자동 중복 판정은 어렵다.

대신 후보를 만든다.

신호:

```text
제목 유사도
같은 Topic
같은 Alias
Heading 중복
본문 텍스트 유사도
같은 코드 블록
동일한 외부 출처
```

---

# 24. 검색 의도 기반 중복

텍스트 유사도가 낮아도 같은 질문을 다룰 수 있다.

예:

```text
PCIe BAR란?
BAR 주소는 어떻게 할당되나?
PCIe BAR 크기 계산
```

세 글이 서로 다른 문장을 사용해도 검색 의도는 크게 겹칠 수 있다.

따라서 중복 후보 검토표에 다음을 포함한다.

```text
Primary Question
Content Type
Version Scope
Unique Evidence
```

---

# 25. 중복 검토표

| 문서 | 핵심 질문 | 타입 | 고유 근거 | 권장 처리 |
|---|---|---|---|---|
| BAR란 | BAR 기본 개념 | Concept | 낮음 | 통합 |
| BAR 크기 계산 | 크기 탐색 | Concept | 코드 예제 | 대표 유지 |
| Linux BAR 할당 | OS Resource | Source Walkthrough | 커널 코드 | 분리 유지 |

이렇게 보면 제목이 유사하더라도 역할이 다름을 판단할 수 있다.

---

# 26. 통합 기준

통합하는 편이 좋은 경우:

```text
같은 질문
같은 대상 독자
같은 버전
내용 반복
독립된 실험·코드 분석 없음
각 문서가 단독으로 불완전
```

---

# 27. 분리 유지 기준

```text
문서 타입이 다름
검색 의도가 다름
버전 문맥이 다름
독립 실험이 있음
소스 분석과 개념 설명이 구분됨
초보·고급 대상이 명확히 다름
```

예:

```text
Concept:
PCIe BAR의 동작 원리

Source Walkthrough:
Linux가 PCI Resource를 등록하는 코드 흐름

Debug Note:
U250에서 BAR 접근이 실패한 사례
```

세 문서는 서로 연결하되 통합하지 않는다.

---

# 28. 통합 절차

```text
대표 문서 결정
→ 고유 내용 추출
→ 대표 문서에 흡수
→ 출처·변경 이력 정리
→ 구문서 Superseded 또는 Redirect
→ 내부 링크 최종 URL로 수정
```

단순히 두 Markdown을 이어 붙이지 않는다.

중복 설명을 제거하고 하나의 논리 흐름으로 다시 편집한다.

---

# 29. 통합 후 구문서 처리

## 검색 가치가 없는 구문서

Redirect가 가능하면 대표 문서로 이동.

## 과거 문맥 가치가 있음

`superseded` 상태로 페이지를 유지하고 신판을 안내한다.

## 독립 가치가 사라졌지만 Redirect 불가

짧은 대체 안내 페이지를 유지할 수 있다.

---

# 30. Historical 판정

다음 조건이면 Historical이 적합하다.

```text
특정 버전·제품·시점에 의미가 있음
현재와 다른 동작 자체가 가치 있음
과거 장애 해결 기록으로 희귀함
신판으로 단순 대체하기 어려움
```

예:

```text
CentOS 7.9 + XRT 2.13.466 + U250
Linux 3.10 Kernel Driver
CUDA 11.8 + GTX 1070
```

---

# 31. Historical 문서 보완

전체를 최신화하지 않는다.

대신 다음만 명확히 한다.

```text
대상 환경
대상 버전
현재와 다를 수 있다는 안내
관련 Current 문서
작성 당시의 관찰 범위
```

이것만으로도 과거 글의 신뢰성과 उपयोग성이 올라간다.

---

# 32. Needs Review 판정

다음 경우:

```text
현재도 유효할 가능성이 있지만 확인하지 못함
외부 링크나 API가 오래됨
코드가 컴파일되는지 불명
결론 일부가 과도하게 일반화됨
버전 범위가 없음
```

Historical인지 Current인지 아직 판단할 수 없을 때 임시로 사용한다.

---

# 33. Archive 판정

```text
검색 의도가 불명확
독립 페이지 가치가 낮음
관련 문서에서도 참조되지 않음
정보가 불완전함
복구 비용이 가치보다 큼
```

Archive는 실패나 삭제가 아니다.

일반 탐색 경로에서 제외해 전체 사이트 품질을 높이는 조치다.

---

# 34. Delete 판정

삭제는 가장 마지막 선택이다.

적합한 경우:

```text
테스트용 게시물
내용이 사실상 없음
민감 정보 위험
잘못된 내용이며 보존 가치 없음
스팸성 자동 생성
```

삭제 전:

```text
외부 링크 가능성
내부 relation
검색 캐시
Sitemap
Redirect 필요
```

를 확인한다.

---

# 35. Tag Migration

기존 태그를 모두 새 Topic으로 변환하지 않는다.

Topic은 사이트 상위 학습 영역이고, Tag는 세부 검색·필터 정보다.

예:

```text
Topic:
pcie-cxl

Tags:
bar
msi-x
dma
u250
```

다음처럼 태그 하나마다 Topic을 만들지 않는다.

```text
BAR Topic
MSI Topic
DMA Topic
U250 Topic
```

---

# 36. 태그 정규화

동의어를 통합한다.

```text
CPlusPlus
cpp
C++
cxx
```

대표:

```text
cpp
```

표시명:

```text
C++
```

---

# 37. 태그 Alias Registry

```ts
export interface TagAlias {
  canonicalId: string;
  aliases: readonly string[];
}
```

```ts
{
  canonicalId: "cpp",
  aliases: [
    "c++",
    "cplusplus",
    "cxx"
  ]
}
```

---

# 38. 태그 자동 치환의 위험

본문의 `C++` 문자열까지 `cpp`로 바꾸면 안 된다.

치환 대상은 Front Matter의 Tag ID다.

표시 텍스트와 검색 Alias는 별도로 유지한다.

---

# 39. 카테고리 Migration

기존 카테고리가 다음처럼 넓을 수 있다.

```text
Development
Programming
Linux
Hardware
Study
```

새 Topic에 일대일 대응하지 않을 수 있다.

처리:

```text
고신뢰 매핑
→ 자동

모호한 카테고리
→ Suggested Topic 후보

다중 주제
→ Primary Topic 수동 선택
```

---

# 40. Primary Topic 하나를 권장하는 이유

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

# 41. 다중 Topic Metadata를 피해야 하는 이유

```yaml
topics:
  - firmware
  - pcie
  - linux
  - fpga
```

를 허용하면 거의 모든 글이 여러 Topic에 들어가면서 Hub가 중복 목록이 된다.

초기에는:

```yaml
topic: firmware-bootloader
```

하나를 사용하고, Tags·Relations·Learning Path로 교차 연결한다.

---

# 42. Description Migration

기존 글에 Description이 없다면 자동 후보를 만들 수 있다.

후보 생성 우선순위:

```text
기존 description
명시적 excerpt
첫 의미 있는 문단
AI 보조 후보
```

하지만 대표 문서는 사람이 직접 검수한다.

---

# 43. 첫 문단을 Description으로 자동 사용하지 않는 이유

첫 문단이 다음처럼 시작할 수 있다.

```text
오랜만에 블로그를 작성한다.
오늘은 회사에서 겪은 문제를 적어보려고 한다.
```

검색 Description으로는 약하다.

또 Markdown 문법, 링크, 코드가 포함될 수 있다.

---

# 44. 자동 Description 후보

```ts
export interface DescriptionSuggestion {
  text: string;
  source:
    | "existing"
    | "excerpt"
    | "first-paragraph"
    | "generated";

  requiresReview: boolean;
}
```

대표 문서에서는 `requiresReview=false` 상태가 되기 전 Featured로 사용할 수 없게 한다.

---

# 45. ID Migration

기존 글에 안정적인 ID가 없다면 생성해야 한다.

우선순위:

```text
기존 slug 기반 ID
→ 의미 있는 영문 기술어로 수동 보완
```

초기 기계적 ID 예:

```text
legacy-pcie-bar-2021
```

도 가능하지만 relation에서 오래 사용할 문서는 의미 있는 ID로 정리하는 편이 낫다.

---

# 46. ID 변경 Registry

초기 Migration 중 ID가 바뀔 수 있다.

```ts
export interface ContentIdAlias {
  oldId: string;
  newId: string;
}
```

하지만 공개 URL이 아니라 내부 relation용이라면 가능한 한 첫 선정 때 안정적으로 결정한다.

---

# 47. Source Path 이동

폴더 구조를 정리하고 싶어도 URL과 본문 Migration과 동시에 하지 않는다.

권장:

```text
1. Metadata와 Domain 도입
2. Manifest 안정화
3. Source Path 정리
```

Source Path 이동은 Git history 추적을 어렵게 할 수 있다.

본문 수정과 같은 Commit에 섞지 않는다.

---

# 48. 파일 이동 Commit

```text
chore(content): reorganize article source directories
```

이 Commit에서는 내용과 Metadata를 바꾸지 않는다.

가능하면 Git이 rename으로 인식할 수 있게 한다.

---

# 49. Markdown 문법 Migration

다음 변경도 별도 단계로 둔다.

```text
Custom HTML Callout
→ Markdown Directive

직접 iframe
→ Embed Component

낡은 code fence 속성
→ 새 role metadata
```

본문 기술 내용 변경과 섞지 않는다.

---

# 50. Raw HTML 감사

기존 글의 Raw HTML 사용을 먼저 분류한다.

```text
표현용 div
Callout
iframe
script
style
깨진 Markdown 우회
```

대체 가능한 것은 공통 Component·Directive로 옮긴다.

`script`, inline event handler는 우선 제거한다.

---

# 51. 이미지 Migration

기존 이미지에 대해 수집한다.

```text
파일 경로
실제 사용 문서
크기
형식
Alt 존재
외부 Hotlink
중복 Hash
```

---

# 52. 이미지 처리 우선순위

```text
깨진 이미지
민감 정보 위험
외부 Hotlink
초대형 이미지
Alt 누락
중복 이미지
```

모든 이미지를 한꺼번에 WebP·AVIF로 변환하지 않는다.

대표 문서 이미지부터 최적화한다.

---

# 53. 외부 이미지 Hotlink

다른 사이트 URL을 그대로 사용하는 경우:

```text
원본 삭제
CORS·차단
속도
개인정보 요청
저작권
```

문제가 있다.

사용 권한이 있고 보존이 필요한 이미지는 로컬로 이전한다.

공식 문서 그림을 무단으로 복제하지 않는다.

---

# 54. 코드 블록 Migration

기존 코드 블록의 언어 이름을 정규화한다.

예:

```text
c++
CXX
cpp
```

→ `cpp`

```text
shell
sh
console
bash
```

은 역할에 따라 구분한다.

```text
bash
→ 명령 또는 Script

text role=output
→ 실행 결과
```

---

# 55. 미지원 Syntax Grammar

기존 글에 잘못된 언어명이 있으면 Build 실패나 평문 처리 문제가 생길 수 있다.

감사 리포트:

```text
Unknown code languages

c++: 23
console-session: 12
make: 8
verilog-system: 4
```

각 언어를:

```text
정상 Alias로 변환
Plain Text로 처리
Custom Grammar 추가
```

중 선택한다.

---

# 56. 긴 코드 블록 후보

예:

```text
200줄 이상
```

또는:

```text
문서 HTML의 큰 비중 차지
```

를 Warning으로 표시한다.

수동 판단:

```text
핵심 부분만 유지
외부 GitHub Permalink
접기
Reference 문서로 분리
그대로 유지
```

---

# 57. 링크 Migration

내부 링크를 세 종류로 분류한다.

```text
현재 Canonical URL
Redirect URL
깨진 URL
```

목표:

```text
내부 링크는 항상 현재 Canonical을 직접 가리킴
```

외부 링크는 정기 감사 대상으로 분리한다.

---

# 58. 상대 경로와 절대 경로

Source Path 이동 시 상대 링크가 깨질 수 있다.

가능하다면 콘텐츠 내부 링크는 사이트 Root 기준 URL이나 문서 ID 기반 Helper를 고려한다.

예:

```markdown
[PCIe BAR](/articles/pcie-bar-sizing/)
```

그러나 URL 변경 가능성이 있으므로 build-time Content Link Directive도 고려할 수 있다.

```markdown
{% content-link id="pcie-bar-sizing" %}
```

다만 Custom Syntax가 편집 경험을 악화시킬 수 있으므로 초기에는 일반 URL + Validation이 더 단순하다.

---

# 59. Markdown 링크를 ID로 직접 쓰는 안티패턴

```markdown
[PCIe BAR](content:pcie-bar-sizing)
```

같은 Custom Protocol은 편리할 수 있지만:

```text
일반 Markdown 호환성 저하
GitHub Preview에서 동작하지 않음
Editor 지원 필요
```

문제가 있다.

관계 Metadata는 ID를 사용하고 본문 링크는 일반 URL을 유지하는 절충이 좋다.

---

# 60. 날짜 Migration

기존 날짜 포맷을 정규화한다.

```text
2026.08.01
2026/08/01
Aug 1 2026
```

→

```text
2026-08-01
```

하지만 Git Commit 날짜를 자동으로 `updated`에 넣지 않는다.

---

# 61. Published 날짜가 없는 글

가능한 근거:

```text
기존 Front Matter
파일명 날짜
Git 최초 Commit
기존 URL
```

우선순위:

```text
기존 명시값
→ 파일명
→ Git 최초 추가 시점
→ 수동 확인
```

Git history가 대량 이동·Import를 거쳤다면 실제 발행일과 다를 수 있다.

불확실한 경우 날짜를 만들어내지 않고 Migration Note에 기록한다.

---

# 62. `lastVerified` 자동 생성 금지

기존 글을 오늘 읽지 않았는데 Migration Script 실행일을 `lastVerified`로 넣으면 안 된다.

```text
Metadata를 변경한 날짜
≠
기술 내용을 검증한 날짜
```

미검증이면 비워둔다.

---

# 63. Status 자동 배정의 안전한 기본값

기존 문서에 Status가 없다면:

```text
내부 Domain:
needs-review 또는 legacy-unclassified
```

로 처리한다.

하지만 UI에 모든 글마다 큰 경고를 보여주지는 않는다.

대표 노출만 제한하고 일반 Legacy UI는 점진적으로 적용한다.

---

# 64. Migration 전용 Flag

과도기에는 다음 필드를 내부 모델에 둘 수 있다.

```ts
export interface MigrationMetadata {
  migrated: boolean;
  reviewed: boolean;
}
```

하지만 장기 공개 Front Matter에 남기지 않는 편이 좋다.

대신 중앙 Migration Inventory에서 관리할 수 있다.

```yaml
pcie-bar-sizing:
  tier: representative
  reviewed: true
  action: promote
```

---

# 65. 중앙 Migration Registry

```ts
export interface MigrationRecord {
  documentId: string;
  tier: MigrationTier;
  action: MigrationAction;
  reviewed: boolean;
  notes?: readonly string[];
}
```

장점:

```text
마이그레이션 진행률 확인
문서 Front Matter 오염 방지
작업 우선순위 관리
```

Migration이 끝나면 Registry를 줄이거나 삭제할 수 있다.

---

# 66. Migration 상태를 영구 Domain에 넣지 않기

다음은 일시적인 프로젝트 상태다.

```text
migrated
reviewed
batch
owner
priority
```

콘텐츠 의미가 아니다.

따라서 Article Front Matter보다 프로젝트 데이터 파일이나 이슈 트래커가 적합하다.

---

# 67. Migration Report

```text
Legacy Migration

Total: 532

Inventoried: 532
Classified: 83
Metadata Migrated: 45
Technically Reviewed: 12

Representative
- Ready: 8
- In Review: 7
- Blocked: 5

Actions
- Promote: 20
- Revise: 63
- Keep: 271
- Historical: 74
- Merge: 31
- Archive: 58
- Delete: 15
```

숫자는 진행 상황을 보여주기 위한 것이지 목표 달성을 위한 점수가 아니다.

---

# 68. Batch 크기

권장:

```text
5~20개 문서
```

문서 유형과 수정량에 따라 조정한다.

## 큰 본문 수정

```text
5개 내외
```

## Metadata만 추가

```text
20~50개
```

대량 자동 Migration이라도 Sample 검토 후 진행한다.

---

# 69. Batch 단위 Rollback

각 Batch는 독립 Commit 또는 PR로 만든다.

예:

```text
Batch 1: PCIe 대표 글
Batch 2: CUDA 대표 글
Batch 3: Historical XRT 글
Batch 4: 얕은 태그 페이지
```

문제 발생 시 특정 Batch만 되돌릴 수 있다.

---

# 70. Topic별 마이그레이션의 장점

```text
같은 기술 문맥에서 분류 가능
중복 글 발견 쉬움
Hub를 동시에 완성 가능
관계 설정 쉬움
용어 표기 통일 가능
```

파일 날짜순보다 Topic별 처리가 낫다.

---

# 71. 권장 Topic 순서

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

# 72. Topic Batch 내부 순서

예: PCIe & CXL

```text
전체 Guide
→ 핵심 Concept
→ Source Walkthrough
→ Debug Note
→ Experiment
→ Reference
→ Historical
→ 중복·Archive
```

먼저 대표 구조를 만든 뒤 나머지 글을 그 구조에 연결한다.

---

# 73. 대표 Guide가 없는 Topic

기존 세부 글만 많고 상위 Guide가 없을 수 있다.

예:

```text
BAR
MSI-X
DMA
VFIO
```

는 있지만 PCIe 전체 흐름 글이 없음.

이 경우 Migration 전에 신규 Guide 하나를 만드는 것이 나을 수 있다.

```text
상위 Guide
→ 기존 세부 글 연결
```

그 뒤 세부 문서의 역할을 판단하기 쉬워진다.

---

# 74. Migration 중 신규 글 생성 기준

다음 역할이 비어 있을 때만 우선 작성한다.

```text
Topic 전체 Guide
핵심 선행 Concept
여러 기존 글을 연결하는 Reference
Current 대체 문서
```

기존 글을 정리하다가 떠오른 모든 주제를 신규 작성하지 않는다.

Migration 범위가 끝없이 늘어날 수 있다.

---

# 75. Migration 중 Scope Creep

자주 발생하는 흐름:

```text
글 하나 수정
→ 코드 예제 개선 필요
→ 새 라이브러리 개발
→ 새 Diagram 시스템
→ 새 검색 기능
→ Migration 중단
```

각 문제를 다음으로 분류한다.

```text
이번 Batch 필수
후속 Platform Task
신규 콘텐츠 후보
보류
```

---

# 76. Blocked 문서

대표 후보지만 재검증할 환경이 없는 경우가 있다.

예:

```text
특정 FPGA 보드 없음
오래된 CUDA 버전 없음
회사 내부 장비 의존
```

선택:

```text
Historical로 명확히 유지
Needs Review
공식 소스 기반으로 범위 축소
대표 후보에서 제외
```

검증하지 못한 상태로 Current를 부여하지 않는다.

---

# 77. 회사 내부 경험 정리

실무 경험이 강점이지만 다음은 제거·일반화해야 한다.

```text
회사명
내부 프로젝트명
Hostname
Repository URL
고객명
미공개 설계
계약 정보
내부 성능 수치
```

기술적 패턴만 남긴다.

예:

```text
사내 FPGA 서버 bm09
```

대신:

```text
CentOS 7.9 기반 FPGA Build Host
```

처럼 일반화한다.

---

# 78. Confidentiality Review 상태

외부 공개 위험이 있는 문서는 별도 Migration Flag로 둘 수 있다.

```text
needs-redaction
requires-manual-review
safe
```

이는 공개 Content Status가 아니라 Migration Registry 상태다.

---

# 79. 민감 정보 발견 시

단순히 새 문서에서 삭제하는 것만으로 끝나지 않는다.

Git history, 공개 배포물, 검색엔진 Cache에 남았을 수 있다.

Credential이었다면 즉시 폐기·회전한다.

내부 정보라면 공개 범위와 대응 필요성을 판단한다.

---

# 80. Migration Validation Profile

```ts
export type MigrationValidationProfile =
  | "inventory"
  | "metadata"
  | "representative"
  | "removal";
```

## Inventory

읽기·분석만 하고 원본 변경 없음.

## Metadata

ID·Topic·Type·Status·Description 검사.

## Representative

기술 검증·관계·환경까지 강하게 검사.

## Removal

Redirect·relation·내부 링크·Sitemap 잔존 검사.

---

# 81. Dry-run Migration Script

```bash
npm run content:migrate -- \
  --topic pcie-cxl \
  --batch batch-01 \
  --dry-run
```

출력:

```text
Planned changes

15 documents selected

IDs added: 12
Topics assigned: 15
Types assigned: 14
Needs manual type review: 1
Status changes:
- current: 3
- needs-review: 8
- historical: 4

No files were modified.
```

---

# 82. 자동 적용 가능한 변경

```text
날짜 형식 정규화
빈 relation 배열 추가
고신뢰 Tag Alias 변환
ID Format 정리
Known code language Alias
```

---

# 83. 자동 적용하면 안 되는 변경

```text
Current 판정
Historical 판정
Primary Topic이 모호한 글
Content Type이 불명확한 글
중복 글 통합
본문 기술 내용 수정
Description 최종 확정
```

---

# 84. Migration Manifest

```yaml
batch: pcie-01

documents:
  - source: src/content/posts/pcie-bar.md
    id: pcie-bar-sizing
    topic: pcie-cxl
    type: concept
    status: needs-review
    action: promote

  - source: src/content/posts/u250-bar.md
    id: u250-bar-debug
    topic: pcie-cxl
    type: debug-note
    status: historical
    action: revise
```

이 파일을 사람 검토 후 Script가 적용하게 할 수 있다.

---

# 85. Manifest 기반 Migration 장점

```text
자동 추측과 실제 적용을 분리
변경 계획을 Diff로 검토
Batch 재현 가능
실패 시 수정 후 재실행
```

Script가 파일을 직접 분석하고 즉시 수정하는 방식보다 안전하다.

---

# 86. Idempotency

같은 Migration을 두 번 실행했을 때 두 번째 실행은 변경이 없어야 한다.

```text
First run:
15 files changed

Second run:
0 files changed
```

날짜를 매번 현재 날짜로 바꾸는 Script는 Idempotent하지 않다.

---

# 87. Migration Script 테스트

Fixture:

```text
Legacy front matter
Missing ID
Old category
Tag aliases
Different date formats
Unknown code language
```

검사:

```text
Dry-run 결과
실제 적용 결과
두 번째 실행 무변경
문서 본문 미변경
```

---

# 88. Migration 완료 조건

문서 하나의 Migration 완료는 Tier에 따라 다르다.

## Representative

```text
Metadata
기술 검증
Article UX
관계
검색
Hub
모바일
```

## Valuable

```text
ID
Topic
Type
Status
Description
상위 연결
```

## Legacy

```text
URL 안정성
Draft 유출 없음
민감 정보 없음
기본 렌더 정상
```

## Remove or Merge

```text
최종 대상
내부 링크
Redirect 또는 상태
검색·Sitemap 제거
```

---

# 89. 전체 마이그레이션 완료를 기다리지 않기

다음 상태면 새로운 홈과 Hub를 공개할 수 있다.

```text
대표 문서 10개 Current
Hub 2개 완성
Featured 8개
Legacy 문서는 기존 화면으로 정상 렌더
Draft·Placeholder 노출 차단
```

수백 개 글이 아직 Legacy여도 사용자 경험은 크게 개선된다.

---

# 90. 새 구조와 Legacy 공존

```text
새 Metadata가 있는 글
→ 새로운 Article Header·Status·Relations

Legacy 글
→ 기존 Header 또는 최소 호환 Header
```

공통 Base Layout과 보안·SEO 최소 규칙은 모두 적용한다.

---

# 91. Legacy Adapter

```ts
export function adaptLegacyEntry(
  entry: LegacyArticleEntry,
): ContentDocument {
  return {
    id: deriveLegacyId(entry),
    title: entry.title,
    description:
      entry.description ??
      createFallbackDescription(entry),

    type: "unclassified",
    status: "needs-review",
    topicId: "unclassified",

    // ...
  };
}
```

하지만 `unclassified` 문서를 Featured·Start Here에 넣을 수 없게 한다.

---

# 92. Legacy Fallback Description

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

# 93. Legacy UI

과도한 `Needs Review` 경고를 모든 기존 문서 상단에 표시하지 않는다.

선택:

```text
상태가 명시된 문서만 Notice 표시
Legacy 문서는 작은 “Legacy article” 정보만 표시
또는 아무 배너 없이 대표 경로에서만 제외
```

기술적으로 위험한 문서는 수동으로 `needs-review`를 명시해 경고를 표시한다.

---

# 94. 마이그레이션 성과 지표

좋은 지표:

```text
대표 Current 문서 수
Hub에 연결된 문서 수
고아 Current 문서 감소
Superseded·Historical 분류 수
중복 URL·깨진 링크 감소
```

약한 지표:

```text
Metadata가 추가된 파일 수
수정된 글자 수
Front Matter 줄 수
```

양적 변환보다 실제 탐색·신뢰 개선이 중요하다.

---

# 95. 주간 Migration 루틴

현실적인 예:

```text
월요일:
Batch 후보 5개 선정

화요일:
Inventory·분류

수요일:
대표 1개 기술 검증

목요일:
나머지 Metadata와 관계

금요일:
Preview·Commit·Report 갱신
```

매주 5개만 처리해도 3개월이면 약 60개를 의미 있게 정리할 수 있다.

---

# 96. 월간 목표

```text
대표 문서 2~4개 검증
Topic Hub 1개 개선
Historical 5개 분류
중복 묶음 1~2개 처리
고아 문서 5개 연결
```

전체 500개를 빠르게 표시만 바꾸는 것보다 효과가 크다.

---

# 97. Migration 종료 조건

전체 문서가 모두 `current`가 되는 것이 종료 조건이 아니다.

다음이면 1차 종료다.

```text
대표 문서와 Hub가 완성됨
중요 검색 경로에 Legacy 구판이 방해하지 않음
빈·중복·Placeholder가 정리됨
나머지 Legacy 문서가 안전하게 렌더됨
새 문서는 새 Workflow로 작성됨
정기 Review Queue가 작동함
```

---

# 98. 실제 구현 티켓

## MIG-01. 전체 Content Inventory

URL·날짜·태그·코드·링크·이미지 집계.

## MIG-02. Migration Tier와 Action 모델

```text
Representative
Valuable
Legacy
Remove or Merge
```

## MIG-03. Topic·Type 제안 리포트

근거와 Confidence 포함.

## MIG-04. 대표 문서 20개 수동 분류

기술 가치와 보완량 기록.

## MIG-05. Batch Manifest 형식

적용 전 변경 계획 검토.

## MIG-06. Dry-run Migration Script

실제 파일 수정 없이 Diff 예상 출력.

## MIG-07. Metadata-only Migration

본문을 변경하지 않고 ID·Topic·Type·Status 적용.

## MIG-08. Historical·Superseded 처리

환경·대체 문서 안내.

## MIG-09. 중복 콘텐츠 후보 리포트

검색 의도와 고유 근거 비교.

## MIG-10. Internal Link·Redirect 정리

내부 링크는 최종 Canonical로 수정.

## MIG-11. Legacy Adapter

미마이그레이션 문서의 Build 호환 유지.

## MIG-12. Migration Progress Report

대표성·연결성·상태 분류 중심.

---

# 99. 권장 커밋 순서

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

# 100. 첫 번째 실제 Batch

가장 추천하는 시작 단위는 다음이다.

```text
PCIe & CXL 관련 문서 15개
```

구성:

```text
대표 Guide 후보 3개
Concept 후보 4개
Debug Note 3개
Source Walkthrough 2개
Historical 후보 2개
중복 후보 1개 묶음
```

실행:

```text
1. 기존 URL 전부 고정
2. ID·Topic·Type 후보 작성
3. Status 수동 결정
4. 대표 3개만 기술 재검증
5. Debug Note를 Concept에 연결
6. Historical 환경 명시
7. Hub의 Start Here와 Featured에 연결
8. 검색 Golden Query에 PCIe 검색어 추가
```

이 Batch가 완료되면 나머지 Topic에도 같은 방법을 반복할 수 있다.

---

# 완료 기준

이 태스크는 모든 기존 Markdown에 새 필드가 생겼다고 완료되는 것이 아니다.

다음이 가능해야 한다.

```text
기존 콘텐츠 전체의 현재 상태와 URL을 파악할 수 있다.

대표·일반·Legacy·정리 대상 문서를 구분할 수 있다.

자동화는 후보를 제시하고 의미 판단은 사람이 수행한다.

대표 문서부터 새로운 Article·Hub·Search 구조로 이전된다.

미마이그레이션 문서도 기존 URL에서 안전하게 동작한다.

Historical과 Superseded가 Current 문서와 경쟁하지 않는다.

대량 변경을 Batch 단위로 검토하고 되돌릴 수 있다.

새로운 콘텐츠가 추가될수록 Legacy 부채가 다시 늘어나지 않는다.
```

# 이번 단계의 핵심 결론

수백 개의 기존 글을 한 번에 완벽하게 정리하려는 계획은 성공하기 어렵다.

가장 현실적인 방식은 다음이다.

```text
전체 Inventory
→ 대표 문서 우선
→ Topic별 작은 Batch
→ Metadata와 본문 분리
→ 기존 URL 보존
→ Historical·Superseded 적극 활용
→ Legacy Adapter로 공존
```

즉, 마이그레이션의 목표는 모든 과거 글을 새 글처럼 만드는 것이 아니다.

> 좋은 글을 대표 경로로 끌어올리고, 과거 글에는 정확한 역할을 부여하며, 약한 콘텐츠가 사이트 전체의 인상을 결정하지 못하게 만드는 것이다.

## 69. user

근데 너 지금 중복 안티패턴 만들고 있어 그런거 제외하고 다음

## 70. assistant

맞아. 최근 몇 태스크가 **Manifest·상태·관계·마이그레이션을 표현만 바꿔 반복**하고 있었다. 그 축은 여기서 종료하고, 이후에는 앞서 다루지 않은 영역만 진행하겠다.

# Task 3-23. 의존성·기능 가지치기와 정적 사이트 복잡도 축소

이번 태스크의 핵심은 새 기능을 추가하는 것이 아니라, `hawk90.github.io`에서 **콘텐츠 제공과 직접 관련 없는 기술적 복잡도**를 제거하는 것이다.

개인 블로그가 오래 운영되면 대체로 다음 기능이 쌓인다.

```text
검색
관리자 화면
에디터
인증
댓글
Analytics
AdSense
OG 이미지 생성
RSS
Sitemap
다이어그램
코드 Highlight
테마 전환
PWA
오프라인 캐시
```

각 기능은 개별적으로 타당해 보여도 합쳐지면 블로그가 사실상 작은 SaaS처럼 변한다.

문제는 방문자가 원하는 것은 대부분 이것뿐이라는 점이다.

```text
글을 찾는다
→ 글을 읽는다
→ 관련 글로 이동한다
```

---

## 1. 핵심 안티패턴: 정적 블로그를 애플리케이션처럼 운영

Astro의 장점은 콘텐츠 대부분을 정적 HTML로 만들 수 있다는 것이다.

그런데 다음 구조가 생기면 이 장점을 잃는다.

```text
페이지 진입
→ JavaScript 실행
→ 상태 Store 초기화
→ API 호출
→ 글 목록 구성
→ 검색 Index 로드
→ UI 렌더링
```

정적 사이트에서 이미 빌드 시 알 수 있는 데이터를 브라우저에서 다시 조립하고 있다.

### 대표 증상

```text
홈의 글 목록이 JavaScript 없이는 나타나지 않음
Topic 목록을 Client에서 filter
관련 글을 브라우저에서 계산
모든 페이지에 검색 Index preload
전역 상태 Store에 콘텐츠 Metadata 보관
```

### 권장 구조

```text
빌드 시:
콘텐츠 선택·정렬·관계 계산

브라우저:
검색 Dialog, 테마 전환처럼 실제 상호작용만 실행
```

---

# 2. 기능을 네 등급으로 분류

모든 기존 기능을 다음 네 가지로 분류한다.

## A. Core

사이트가 존재하는 이유와 직접 연결된다.

```text
Article rendering
Topic navigation
내부 링크
검색
코드 표시
SEO 기본 Metadata
Sitemap
RSS
```

## B. Supporting

핵심 경험을 보조하지만 실패해도 글은 읽혀야 한다.

```text
댓글
Analytics
AdSense
OG 이미지
테마 전환
이미지 확대
```

## C. Editorial

작성자에게만 필요한 기능이다.

```text
콘텐츠 검증
링크 검사
Migration script
품질 Report
문서 생성기
```

## D. Questionable

실제 사용 가치가 불명확한 기능이다.

```text
관리자 웹 UI
브라우저 내 Markdown 편집
공개 Dashboard
과도한 검색 필터
PWA
오프라인 전체 글 Cache
실시간 통계
```

핵심 문제는 C와 D가 공개 사이트 번들에 섞이는 것이다.

---

# 3. 공개 사이트와 편집 도구의 물리적 분리

좋은 경계:

```text
src/
→ 공개 사이트

scripts/
→ 로컬·CI 편집 도구

reports/
→ 내부 감사 결과
```

피해야 할 구조:

```text
src/pages/admin/
src/components/editor/
src/stores/content-admin.ts
src/api/save-post.ts
```

정적 Git 기반 블로그에서 관리자 화면이 꼭 필요한지 먼저 의심해야 한다.

---

# 4. 관리자 UI 안티패턴

개인 블로그에 관리자 페이지를 만들면 다음 요구가 연쇄적으로 따라온다.

```text
로그인
권한
Session
CSRF
Content API
저장 실패 처리
이미지 업로드
Preview
Revision
배포 Trigger
Secret 관리
```

처음에는 “Markdown을 편하게 수정하려고” 시작했는데, 블로그보다 관리 도구 유지 비용이 커진다.

GitHub 저장소와 IDE를 이미 사용한다면 대부분 다음이면 충분하다.

```text
Markdown
Git
Preview server
CLI validator
GitHub Actions
```

관리자 UI가 실제로 매주 사용되지 않는다면 삭제 후보가 맞다.

---

# 5. 범용 테마 기능 유지 안티패턴

프로젝트가 개인 사이트인데도 범용 테마처럼 다음 옵션을 계속 유지할 수 있다.

```text
작성자 여러 명
다국어
레이아웃 Variant 여러 개
카드 Style 여러 개
배포 대상 여러 개
CMS Adapter 여러 개
댓글 Provider 여러 개
Analytics Provider 여러 개
```

실제로 사용하는 조합이 하나라면 옵션은 유연성이 아니라 유지보수 부채다.

예:

```ts
type CommentProvider =
  | "giscus"
  | "disqus"
  | "utterances"
  | "none";
```

실제로 Giscus만 사용한다면:

```ts
const COMMENTS_ENABLED = true;
```

혹은 Giscus 컴포넌트 하나면 충분하다.

---

# 6. Feature Flag 남용

다음과 같은 Flag가 쌓이기 쉽다.

```text
enableNewSearch
enableLegacySearch
enableTopicV2
enableOldHome
enableAdminBeta
enableOgV3
```

Feature Flag는 전환 기간에는 유용하다.

하지만 개인 정적 사이트에서 영구적으로 남으면 가능한 실행 경로가 폭발한다.

```text
2개 Flag → 4개 조합
5개 Flag → 32개 조합
10개 Flag → 1,024개 조합
```

모든 조합을 실제로 테스트하지도 않는다.

### 규칙

각 Flag에는 제거 조건이 있어야 한다.

```ts
interface TemporaryFeatureFlag {
  enabled: boolean;
  removeAfter: string;
  replacementIssue: string;
}
```

개인 프로젝트라면 더 간단히:

```text
전환 완료
→ 구 구현 삭제
→ Flag 삭제
```

가 낫다.

---

# 7. Compatibility Layer의 영구화

Migration 중에는 Legacy Adapter가 필요할 수 있다.

문제는 이것이 영원히 남는 경우다.

```text
Legacy Post
→ Adapter A
→ Adapter B
→ New Content Model
→ View Model
```

세대가 추가될 때마다 변환 계층이 늘어난다.

### 위험 신호

```text
legacyTitle
legacySlug
oldCategory
newCategory
normalizedCategory
```

가 동시에 존재한다.

### 해결

변환 경계는 하나만 유지한다.

```text
Legacy Raw Entry
→ Current Domain Model
```

내부 Domain에 Legacy 필드를 전파하지 않는다.

---

# 8. 의존성 하나당 유지비를 계산하지 않는 안티패턴

패키지를 추가할 때 보통 설치 순간의 편리함만 본다.

하지만 실제 비용은 다음과 같다.

```text
업데이트
보안 경고
Breaking Change
번들 크기
빌드 시간
Node 호환성
설정 파일
타입 충돌
```

예를 들어 20줄로 해결 가능한 기능에 50KB 라이브러리를 넣을 수 있다.

무조건 직접 구현하라는 뜻은 아니다.

판단 기준은:

```text
직접 구현의 복잡도
vs
외부 의존성의 장기 운영 비용
```

이다.

---

# 9. 의존성 평가표

각 주요 패키지를 다음 기준으로 평가한다.

| 기준 | 질문 |
|---|---|
| 실제 사용 | 현재 Production에서 사용되는가 |
| 대체 가능 | 플랫폼 기본 기능으로 대체 가능한가 |
| 번들 영향 | Client JavaScript에 들어가는가 |
| 빌드 영향 | 모든 문서를 처리하는가 |
| 유지 상태 | 현재도 관리되는가 |
| 종속성 | 하위 패키지를 많이 끌고 오는가 |
| 제거 비용 | 제거했을 때 기능 손실이 큰가 |

---

# 10. 제거 후보 우선순위

## 가장 먼저 확인

```text
사용되지 않는 직접 Dependency
사용되지 않는 Astro Integration
과거 Migration용 패키지
중복 기능 라이브러리
Client Bundle에 들어가는 Node용 라이브러리
```

## 그다음

```text
한두 함수만 사용하는 대형 Utility Library
과도한 Markdown Plugin
중복 Syntax Highlighter
중복 날짜 Library
중복 Search Engine
```

---

# 11. `dependencies`와 `devDependencies` 혼합

정적 빌드에서만 사용하는 패키지가 `dependencies`에 들어가 있을 수 있다.

예:

```text
Markdown parser
OG generator
Link checker
Test runner
Migration CLI
```

Runtime 배포가 없는 GitHub Pages라면 구분이 기능적으로 덜 중요해 보일 수 있지만, 의존성 목적을 이해하는 데는 여전히 중요하다.

또한 브라우저 코드가 Build-only 패키지를 import하는 실수를 발견하기 쉬워진다.

---

# 12. 중복 Utility 라이브러리

대표 사례:

```text
date-fns + dayjs
lodash + 자체 collection helper
Fuse.js + MiniSearch
Prism + Shiki
marked + remark
```

각 라이브러리가 실제로 다른 역할을 하는지 확인한다.

예를 들어 Astro가 이미 Markdown pipeline을 제공하는데 별도 parser가 검색·감사용으로 또 존재하면 콘텐츠를 여러 번 처리하게 된다.

---

# 13. Markdown Plugin 과적재

Remark·Rehype Plugin은 편리하지만 문서마다 실행된다.

다음 Plugin이 연쇄적으로 붙을 수 있다.

```text
GFM
Heading slug
Autolink
TOC
Footnote
Math
Mermaid
Callout
Code title
Code line number
External link
Image optimization
Reading time
```

글 하나에는 가벼워 보여도 500개 문서에서는 누적 비용이 커진다.

### 검토 질문

```text
모든 문서에 필요한가?
특정 문서에서만 쓰는가?
Plugin끼리 AST를 반복 순회하는가?
같은 기능을 두 Plugin이 처리하는가?
```

---

# 14. 모든 페이지에 Math·Mermaid 지원

수식이나 Mermaid를 사용하는 글이 극소수인데 전역 Pipeline과 자산을 추가하면 낭비다.

권장:

```text
해당 문법이 있는 문서만 감지
→ 필요한 변환 실행
```

또는 작성 시 SVG로 생성해 정적 자산으로 저장한다.

특히 Mermaid Client Runtime을 모든 Article에 넣지 않는다.

---

# 15. Syntax Highlighting 과잉

기술 블로그에서 Shiki 같은 빌드 타임 Highlight는 유용하다.

하지만 다음 기능이 모두 필요한지는 별개다.

```text
두 가지 테마 Token 동시 생성
Line Number
Diff
Focus Line
Word Highlight
파일명
복사
언어 Badge
```

각 기능이 HTML 노드 수와 CSS를 늘린다.

대표 문서에서 실제로 사용하는 기능만 유지한다.

---

# 16. 두 테마용 중복 Token

Light·Dark Mode를 위해 코드 HTML에 양쪽 테마의 색상 정보를 모두 넣으면 HTML이 커질 수 있다.

예:

```html
<span style="--shiki-light:#...;--shiki-dark:#...">
```

코드가 많은 글에서는 반복 비용이 상당하다.

가능한 선택:

```text
CSS Variable 기반
단일 코드 테마
문서별 측정 후 현재 방식 유지
```

무조건 단일 테마로 바꿀 필요는 없지만, 생성 HTML 크기를 측정해야 한다.

---

# 17. 코드 Line Number DOM 폭증

각 코드 줄을 별도 `<span>`으로 감싸면 긴 코드 문서의 DOM이 커진다.

```text
500줄 코드
×
여러 Token span
×
Line wrapper
```

코드가 많은 문서에서 렌더링·검색·복사 비용이 증가한다.

### 대안

```text
Line Number가 정말 필요한 코드에만 활성화
CSS counter 사용 검토
짧은 코드에는 비활성화
```

---

# 18. OG 이미지 전부 재생성

모든 Build에서 500개 글의 OG 이미지를 다시 만들면 비용이 크다.

안티패턴:

```text
본문 한 문장 수정
→ OG 500장 재생성
```

권장 Cache Key:

```text
title
description
topic
template version
font version
```

이 값이 바뀐 문서만 생성한다.

OG 생성 실패가 모든 문서의 본문 Build를 막아야 하는지도 따로 판단한다.

---

# 19. 본문과 무관한 Build 단계 결합

다음 구조는 실패 전파 범위가 너무 넓다.

```text
Article Build
→ 외부 링크 검사
→ OG 생성
→ Analytics Report
→ Screenshot
→ 배포
```

외부 사이트 하나가 일시적으로 응답하지 않아도 글 수정 배포가 실패한다.

분리:

```text
필수 Build
선택적 Asset Build
Scheduled Audit
```

---

# 20. 외부 링크 검사를 매 Build에서 수행

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

# 21. GitHub API·외부 API 빌드 의존

빌드 시 다음 데이터를 API로 가져오는 구조는 재현성을 낮춘다.

```text
GitHub Star
최근 Commit
Profile 정보
Contribution
외부 RSS
```

API가 실패하거나 Rate Limit에 걸리면 배포가 막힌다.

공개 페이지에 꼭 필요하지 않은 실시간 데이터는 제거하거나 주기적으로 캐시된 파일을 생성한다.

---

# 22. Runtime 환경변수 과잉

정적 사이트인데도 많은 환경변수가 필요한 경우 아키텍처가 과도해졌을 가능성이 있다.

```text
PUBLIC_API_URL
ADMIN_API_URL
CMS_TOKEN
SEARCH_API_URL
AUTH_CLIENT_ID
SESSION_SECRET
```

일반적인 GitHub Pages 기술 블로그에 이 정도 Runtime 설정은 필요하지 않다.

공개 설정과 Secret도 명확히 분리한다.

---

# 23. PWA 안티패턴

PWA는 매력적으로 보이지만 기술 블로그에 반드시 필요한 것은 아니다.

추가되는 복잡도:

```text
Service Worker
Cache version
오래된 HTML
오래된 Search Index
Offline fallback
배포 후 Cache invalidation
```

특히 문서를 수정했는데 사용자가 오래된 Service Worker Cache를 계속 보는 문제가 생긴다.

실제 오프라인 요구가 확인되지 않았다면 제거 후보가 될 수 있다.

---

# 24. 전체 사이트 오프라인 Cache

500개 문서와 이미지를 미리 Cache하는 것은 특히 피한다.

```text
초기 네트워크 비용
저장 공간
캐시 갱신
모바일 데이터
```

가 커진다.

브라우저 기본 HTTP Cache만으로 충분할 가능성이 높다.

---

# 25. Client-side Router 도입

정적 Article 사이트에 SPA Router를 넣으면 다음 문제가 생길 수 있다.

```text
스크롤 복원
Anchor 이동
브라우저 뒤로 가기
외부 Script 재실행
페이지별 Metadata
접근성 Focus
```

Astro의 페이지 전환 기능을 사용하더라도 댓글·광고·코드 복사·Analytics와의 상호작용을 검증해야 한다.

단순 전체 페이지 탐색이 안정적이라면 SPA화가 반드시 개선은 아니다.

---

# 26. View Transition 장식화

페이지 전환 애니메이션이 멋있더라도:

```text
긴 Article
Anchor 링크
검색 결과 이동
뒤로 가기
Reduced Motion
```

에서 불편을 만들 수 있다.

애니메이션이 콘텐츠 탐색보다 우선하면 안 된다.

`prefers-reduced-motion`을 존중하고, 기능적 가치가 약하면 제거한다.

---

# 27. 테마 전환 과잉 설계

Dark Mode 하나를 위해 다음이 들어갈 수 있다.

```text
전역 Store
초기 Hydration
Cookie
Local Storage
System Sync
Cross-tab Sync
Transition
Server Hint
```

정적 사이트에서는 작은 Inline Script로 Flash를 막고 Local Storage 또는 System Preference를 읽는 정도면 충분할 수 있다.

테마를 애플리케이션 상태처럼 관리하지 않는다.

---

# 28. Analytics Provider 다중화

다음이 동시에 설치될 수 있다.

```text
Google Analytics
Search Console
Cloudflare Analytics
GitHub Pages 통계
Custom events
AdSense metrics
```

각 Script가 성능과 개인정보 부담을 추가한다.

측정 목적을 먼저 정의한다.

```text
검색 유입
상위 문서
내부 다음 글 이동
```

이 세 가지에 필요한 최소 도구만 유지한다.

---

# 29. Vanity Metric 수집

다음 지표는 흥미롭지만 실제 콘텐츠 개선으로 연결되지 않을 수 있다.

```text
실시간 방문자
지역별 색상 지도
초 단위 체류 시간
스크롤 10% 단위
마우스 이동
```

콘텐츠 개선에 필요한 신호는 더 단순할 수 있다.

```text
어떤 문서가 유입되는가
어떤 검색어에서 노출되는가
어떤 Hub에서 다음 글로 이동하는가
```

---

# 30. 댓글의 전역 로드

모든 Article Page 진입과 동시에 Giscus를 로드하면 댓글을 보지 않는 사용자도 외부 Script와 iframe을 받는다.

권장:

```text
댓글 보기 버튼
→ 사용자 요청
→ Giscus 로드
```

또는 화면 근처에 도달했을 때 지연 로드한다.

외부 서비스가 차단돼도 본문 Layout이 무너지지 않아야 한다.

---

# 31. 광고 컴포넌트와 콘텐츠 컴포넌트 결합

다음 구조는 유지보수가 어렵다.

```astro
<ArticleSection>
  콘텐츠
  조건에 따라 광고
</ArticleSection>
```

콘텐츠 컴포넌트가 광고 정책까지 알게 된다.

광고는 Layout 수준의 제한된 슬롯에서만 처리한다.

```text
Article Body
→ 광고 가능 지점
→ Article Relations
```

---

# 32. 소셜 공유 버튼 과잉

여러 플랫폼 공유 Script를 붙이면 외부 요청과 추적이 늘어난다.

```text
Facebook
X
LinkedIn
Reddit
Kakao
Naver
```

실제 사용이 적다면 Web Share API 또는 URL 복사 버튼 하나면 충분하다.

```text
공유
→ 지원 브라우저: navigator.share()
→ 나머지: 링크 복사
```

---

# 33. 아이콘 라이브러리 전체 Import

아이콘 몇 개를 위해 대형 패키지나 전체 Font Icon을 로드할 수 있다.

권장:

```text
사용하는 SVG만 Import
또는
소형 Icon Component
```

각 아이콘이 실제 의미를 갖는지도 확인한다.

텍스트만으로 명확한 버튼에 아이콘을 억지로 추가하지 않는다.

---

# 34. Web Font 과잉

다음 구성이 흔하다.

```text
본문 Font
Heading Font
Code Font
한글 Font
영문 Font
Variable Font
여러 Weight
```

한글 Web Font는 파일이 커질 수 있다.

검토:

```text
실제로 사용하는 Weight
System Font 대체 가능성
Subset
font-display
Code Font 필요성
```

폰트가 차단돼도 Layout과 가독성이 유지돼야 한다.

---

# 35. CSS Framework와 자체 디자인 시스템 중복

Tailwind, UnoCSS 또는 다른 Utility Framework를 사용하면서 자체 Token·Component CSS도 대규모로 유지할 수 있다.

문제는 같은 스타일을 두 방식으로 표현하는 것이다.

```text
Utility class
+
Component scoped CSS
+
Global utility
+
Inline style
```

한 컴포넌트 안에서 스타일 Source가 너무 많아진다.

현재 방식을 유지하더라도 기준을 정한다.

```text
Layout·spacing → Utility
복잡한 콘텐츠 Typography → CSS
Theme Token → CSS variables
```

---

# 36. 범용 `Card` 컴포넌트

다음 Props가 늘어나면 잘못된 추상화다.

```ts
<Card
  variant="featured"
  horizontal
  compact
  bordered
  interactive
  showTopic
  showDate
  showStatus
  imagePosition="left"
/>
```

하나의 Card가 모든 화면을 처리하면서 내부 조건문이 폭발한다.

대신 역할 중심 컴포넌트를 둔다.

```text
FeaturedGuideCard
ArticleListItem
TopicCard
```

공통 시각 Primitive만 공유한다.

---

# 37. Props Boolean 폭발

다음 형태도 위험하다.

```ts
interface Props {
  showTitle?: boolean;
  showDescription?: boolean;
  showTopic?: boolean;
  showDate?: boolean;
  showReadingTime?: boolean;
  showStatus?: boolean;
}
```

실제 허용되지 않는 조합까지 생긴다.

View Model이나 명확한 Variant로 조합을 제한한다.

---

# 38. 슬롯 과잉 컴포넌트

아무 구조나 넣을 수 있는 범용 Layout 컴포넌트는 재사용성이 높아 보이지만, 페이지 일관성을 잃는다.

```text
header slot
meta slot
before slot
main slot
aside slot
after slot
footer slot
actions slot
```

필요한 구조가 명확한 Article Layout이라면 명시적인 Props와 일부 Slot만 유지한다.

---

# 39. 삭제되지 않는 구 구현

리팩터링 후에도 다음이 남을 수 있다.

```text
OldArticleCard
ArticleCardV2
NewArticleCard
ArticleCardFinal
```

사용되지 않는 코드가 Typecheck와 Dependency를 계속 유지하게 한다.

새 구현 전환이 완료되면 구 구현과 관련 CSS·테스트·Flag를 함께 삭제한다.

---

# 40. Dead Code 검사

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

# 41. CSS 잔존 부채

컴포넌트를 삭제했지만 전역 CSS가 남을 수 있다.

```text
.old-card
.legacy-post-grid
.admin-toolbar
.search-v1
```

전역 CSS는 사용 위치 추적이 어렵다.

새 구조로 이동하면서 Legacy Selector를 Batch 단위로 제거한다.

---

# 42. Build Script 중복

`package.json`에 비슷한 명령이 쌓일 수 있다.

```text
build
build:prod
build:production
build:full
build:all
release
deploy-build
```

실제 차이가 불명확하면 사람과 CI가 서로 다른 경로를 실행한다.

권장 핵심 명령:

```text
check
build
audit
test:smoke
deploy
```

---

# 43. Shell·Node·Package Script 중복

같은 작업이 다음 세 곳에 구현될 수 있다.

```text
package.json
scripts/build.sh
scripts/build.ts
GitHub Actions YAML
```

GitHub Actions에서는 로직을 직접 길게 쓰지 않고 저장소 명령을 호출한다.

```yaml
- run: npm run check
- run: npm run build
```

로컬과 CI가 같은 경로를 사용해야 한다.

---

# 44. CI Matrix 과잉

개인 사이트에서 다음 전체를 테스트할 필요는 없을 수 있다.

```text
Node 18, 20, 22
Ubuntu, macOS, Windows
npm, pnpm, yarn
Chrome, Firefox, Safari
```

실제 배포 환경 하나를 중심으로 고정한다.

추가 Matrix는 실제 호환성을 제공하는 라이브러리일 때 의미가 크다.

---

# 45. Renovate·Dependabot 자동 PR 폭증

자동 업데이트는 유용하지만 작은 의존성까지 매일 PR이 생기면 중요한 콘텐츠 변경이 묻힌다.

권장:

```text
업데이트 그룹화
주간 실행
Major 별도
보안 업데이트 우선
Astro 생태계 묶음
```

자동 Merge는 테스트 신뢰도가 충분할 때만 사용한다.

---

# 46. Lockfile과 생성물 Noise

콘텐츠 한 줄 수정에 Lockfile이나 대량 생성 파일이 함께 바뀌면 Diff가 오염된다.

```text
콘텐츠 Commit
→ Markdown만

의존성 Commit
→ package.json + lockfile

생성물 Commit
→ 명확한 이유가 있을 때
```

로 분리한다.

---

# 47. 너무 많은 자체 CLI

앞서 여러 `content:*` 명령을 설계했지만 실제로 전부 구현하면 CLI 자체가 프로젝트가 될 수 있다.

다음 정도만 먼저 유지한다.

```text
content:check
content:new
content:audit
```

`publish`, `review`, `migrate`, `similar`, `freshness`를 모두 별도 CLI로 만들기 전에 실제 반복 사용 여부를 확인한다.

필요하면 하나의 CLI에 Subcommand로 묶는다.

```bash
npm run content -- check
npm run content -- new
npm run content -- audit
```

---

# 48. 내부 도구의 제품화

로컬 스크립트가 점점 다음 기능을 갖출 수 있다.

```text
TUI
Web Dashboard
DB
상태 저장
필터
그래프
인증
```

블로그 콘텐츠를 개선하기보다 도구 자체를 만드는 데 시간이 사용된다.

개인적으로 호크가 특히 조심해야 할 부분이다.

정리와 시스템 설계 능력이 강해서 **콘텐츠 개선보다 콘텐츠 관리 플랫폼을 더 정교하게 만드는 방향**으로 빠질 가능성이 있다.

내부 도구의 종료 기준을 정한다.

```text
한 번 실행
명확한 Report
파일 직접 수정은 Dry-run 후
```

이 정도면 충분하다.

---

# 49. 추상화 조기 도입

Topic Hub가 두 개뿐인데 모든 가능한 Hub Variant를 지원하는 Framework를 먼저 만들 수 있다.

```text
Section Plugin
Dynamic Renderer
Schema-driven UI
Block Registry
```

실제 Hub 두 개를 먼저 구현하고 중복이 확인된 부분만 추출한다.

```text
첫 번째 구현
→ 두 번째 구현
→ 실제 공통점 확인
→ 추상화
```

순서가 맞다.

---

# 50. 설정 중심 아키텍처의 한계

모든 UI를 거대한 JSON·YAML로 정의하면 코드 수정 없이 화면을 바꿀 수 있어 보인다.

```yaml
sections:
  - type: hero
  - type: grid
  - type: carousel
  - type: articles
```

하지만 결국 자체 CMS와 렌더러를 만든 셈이다.

컴파일 타임 타입 안정성과 IDE 탐색도 약해진다.

페이지 종류가 소수라면 TypeScript와 Astro 컴포넌트가 더 단순하다.

---

# 51. Plugin Architecture 불필요

개인 사이트에서 다음은 필요하지 않다.

```text
Content Plugin API
Widget Registry
Theme Extension Hook
Runtime Module Loader
```

실제로 제3자가 기능을 추가하지 않는다.

Plugin Architecture는 가능성을 위해 현재 복잡도를 지불하는 구조다.

---

# 52. Monorepo 전환 유혹

사이트, 콘텐츠 도구, 공통 UI를 분리한다며:

```text
apps/site
packages/content
packages/ui
packages/search
packages/config
```

로 만들 수 있다.

재사용 대상이 실제로 하나뿐이라면 Monorepo는 다음을 추가한다.

```text
Workspace 설정
Package build
Version 경계
Import 경계
Task runner
```

현재는 단일 Astro 프로젝트 안의 디렉터리 경계로 충분하다.

---

# 53. 별도 Backend 검색

수백 개 기술 글 검색에 Elasticsearch·Typesense·Meilisearch 같은 별도 서버를 붙이는 것은 과도할 가능성이 높다.

추가 비용:

```text
Hosting
Index 동기화
API 장애
Secret
CORS
비용
```

정적 Search Index로 품질과 크기를 먼저 측정한다.

실제 한계를 확인한 뒤에만 서버 검색을 검토한다.

---

# 54. 데이터베이스 도입

콘텐츠가 Git의 Markdown에 있는데 관계·상태를 별도 DB에도 저장하면 Source of Truth가 두 개가 된다.

```text
Markdown
+
Database
```

동기화 실패가 생긴다.

관계와 상태는 빌드 타임 파일로 충분하다.

---

# 55. AI 기능 공개 사이트 삽입

“내 글에 질문하기” 같은 AI Chat을 넣으면 흥미로워 보이지만 다음이 필요하다.

```text
Embedding
Vector DB
API 비용
Prompt Injection 대응
잘못된 답변
출처 표시
개인정보
Rate Limit
```

현재 문제인 콘텐츠 내용과 탐색 품질을 해결하기 전에 AI 인터페이스를 추가하면 본질을 흐릴 수 있다.

먼저 검색·Hub·대표 문서를 완성한다.

---

# 56. 기능 제거 결정표

각 기능에 다음을 답한다.

| 질문 | 판단 |
|---|---|
| 독자가 실제로 사용하는가 | 아니면 제거 후보 |
| 콘텐츠가 없어도 기능 자체로 가치가 있는가 | 대체로 아니어야 함 |
| 실패하면 본문이 깨지는가 | 결합 해제 필요 |
| JavaScript가 반드시 필요한가 | 아니면 정적화 |
| 외부 서비스가 필요한가 | 실패 격리 |
| 최근 3개월 수정·사용했는가 | 아니면 재검토 |
| 더 단순한 브라우저 기능이 있는가 | 있으면 대체 |

---

# 57. 삭제보다 먼저 계측할 기능

사용 여부가 불명확하지만 비용이 큰 기능:

```text
댓글
검색 필터
테마 전환
소셜 공유
PWA
읽기 진행률
```

짧은 기간 사용 데이터를 보고 유지 여부를 정할 수 있다.

다만 사용량 측정을 위해 또 복잡한 Analytics를 추가하지 않는다.

---

# 58. 삭제해도 콘텐츠는 유지되는가

가장 좋은 제거 테스트다.

```text
이 기능을 제거해도
사용자가 글을 찾고 읽고 이동할 수 있는가?
```

그렇다면 핵심 기능이 아닐 가능성이 높다.

---

# 59. Dependency Budget

새 의존성을 추가하기 위한 간단한 조건을 둔다.

```text
직접 구현 시 오류 위험이 큰가?
프로젝트 핵심 기능인가?
유지보수가 활발한가?
Client Bundle에 미치는 영향은?
기존 의존성으로 해결할 수 없는가?
```

README에 장문의 절차까지 적을 필요는 없지만 PR 검토 기준으로 사용한다.

---

# 60. Client JavaScript Budget

페이지 유형별로 구분한다.

## 홈·Topic Hub

기본적으로:

```text
검색 Trigger
테마 전환
```

정도만 필요하다.

## Article

```text
코드 복사
댓글 지연 로드
선택적 이미지 확대
```

## Search

검색 기능 자체의 JavaScript 허용.

모든 페이지에 전체 Search Runtime을 로드하지 않는다.

---

# 61. JavaScript 사용 감사

최종 HTML에서 페이지별 Script를 조사한다.

```text
어떤 Script가 로드되는가
압축 크기
어떤 컴포넌트가 원인인가
실제 상호작용이 있는가
```

Astro Island Directive를 검색한다.

```text
client:load
client:idle
client:visible
client:only
```

각 사용에 이유가 있어야 한다.

---

# 62. `client:load` 남용

초기 화면에 즉시 필요하지 않은 컴포넌트까지 `client:load`하면 JavaScript가 한꺼번에 실행된다.

선택:

```text
검색 Dialog → 클릭 후 동적 import
댓글 → client:visible 또는 사용자 요청
이미지 확대 → 필요 페이지에서만
```

정적 카드·목록에는 Client Directive를 사용하지 않는다.

---

# 63. JSON 직렬화 과잉

Astro Page에서 큰 객체를 Client 컴포넌트 Props로 넘기면 HTML에 데이터가 직렬화될 수 있다.

```text
ContentDocument 전체
Relation 전체
본문 Metadata 전체
```

브라우저에 필요한 최소 View Model만 넘긴다.

---

# 64. Hydration Mismatch 위험

날짜, 랜덤값, 브라우저 환경에 따라 Server와 Client 출력이 다르면 mismatch가 생긴다.

정적 사이트에서는 날짜 문자열도 빌드 시 생성해 표시한다.

Client에서 다시 포맷하지 않는다.

---

# 65. 환경 분기 산재

다음 조건이 여러 컴포넌트에 반복될 수 있다.

```ts
if (import.meta.env.PROD)
```

광고·Analytics·댓글·Debug UI의 환경 분기를 각각 처리하면 Preview와 Production 동작이 달라진다.

Integration config 한 곳에서 활성 상태를 결정한다.

---

# 66. Debug 코드 Production 포함

```text
Content Manifest viewer
Search score viewer
Layout grid
Debug metadata
```

는 개발에 유용하지만 Production 번들에 들어가면 안 된다.

빌드 조건으로 숨기는 것만 아니라, 가능하면 Production import graph에서 제외한다.

---

# 67. Source Map 공개

Client JavaScript Source Map이 공개 배포물에 필요한지 확인한다.

개인 블로그에서는 Debug 편의와 파일 노출 사이를 판단한다.

Secret은 Source Map에 없어야 하지만, 내부 파일 구조나 주석이 노출될 수 있다.

---

# 68. 현재 구조 보존 편향

오래 만들었다는 이유로 기능을 유지하면 안 된다.

```text
구현하는 데 오래 걸림
≠
지금도 가치 있음
```

삭제는 실패가 아니라 프로젝트 범위를 사이트 목적에 맞추는 작업이다.

---

# 69. 삭제 작업도 별도 Epic으로 관리

무작정 여러 기능을 지우지 않는다.

## 1단계: Inventory

```text
Dependency
Astro Integration
Client Island
External Script
Admin Route
Build Script
```

## 2단계: 사용 위치 확인

## 3단계: 대체·삭제 결정

## 4단계: 기능별 작은 Commit

## 5단계: Build·Smoke·Bundle 비교

---

# 70. 삭제 전 Baseline

측정:

```text
Production Build 시간
Peak RSS
홈 JavaScript
Article JavaScript
대표 HTML 크기
Dependency 수
CI 시간
```

삭제 후 동일하게 비교한다.

“깔끔해졌다”가 아니라 실제 효과를 확인한다.

---

# 71. 정리 우선순위

가장 먼저:

```text
Production에 포함된 Admin 기능
미사용 Dependency
중복 Parser·Highlighter
모든 페이지에 로드되는 외부 Script
불필요한 Client Island
```

그다음:

```text
Legacy 컴포넌트
Feature Flag
중복 CSS
복잡한 Build Script
과도한 Plugin
```

나중:

```text
작은 Utility
디렉터리 이름
미세한 추상화
```

---

# 72. 유지해야 할 복잡도

모든 복잡도가 나쁜 것은 아니다.

다음은 명확한 가치를 가진다.

```text
Content Schema
Publication Policy
내부 링크 검증
Search Index
Topic Curation
접근성
보안 검사
```

이들은 콘텐츠 신뢰와 탐색을 직접 보호한다.

제거 대상은 목적 없는 복잡도이지, 모든 구조가 아니다.

---

# 73. 과도한 미니멀리즘도 안티패턴

반대로 모든 기능을 삭제하고 Markdown만 남기는 것도 답은 아니다.

다음은 사이트 규모상 필요하다.

```text
정확한 검색
Topic Hub
대표 문서
상태 표시
내부 관계
SEO 기본 구조
```

판단 기준은 단순함 그 자체가 아니라:

```text
독자 가치 대비 운영 비용
```

이다.

---

# 74. 추천 최종 런타임 경계

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

# 75. 프로젝트가 가져야 할 직접 의존성 범주

정확한 패키지 이름이 아니라 역할 기준으로 보면:

```text
Astro
필요한 Markdown 처리
Syntax Highlight
Search
테스트
Lint·Format
이미지·OG 생성이 실제 필요하면 해당 도구
```

그 외에는 실제 사용 이유를 검토한다.

---

# 76. 제거 후 금지해야 할 재발 패턴

```text
“나중에 쓸 수도 있으니”
“범용성을 위해”
“관리 화면이 있으면 편할 것 같아서”
“요즘 다 PWA를 하니까”
“AI를 붙이면 좋아 보이니까”
```

새 기능은 실제 독자 또는 작성 workflow의 구체적인 문제에서 출발해야 한다.

---

# 77. Architecture Decision Record

큰 기능의 유지·삭제 이유만 짧게 남길 수 있다.

예:

```text
ADR-003: 공개 Admin UI를 제거한다

결정:
콘텐츠 편집은 Git과 IDE를 사용한다.

이유:
인증·저장 API·Secret 관리 비용이
개인 정적 블로그의 편집 편익보다 크다.
```

모든 사소한 결정을 ADR로 만들 필요는 없다.

---

# 78. 이번 태스크의 최소 구현

```text
기능·Dependency Inventory
공개와 Build-only 기능 분류
미사용 Dependency 제거
Admin Route Production 제거
정적 목록의 Hydration 제거
외부 Script 지연 로드
중복 Markdown 처리 제거
Feature Flag 정리
Build Script 단순화
전후 성능 비교
```

---

# 79. 실제 구현 티켓

## PRN-01. 기능 Inventory

```text
Core
Supporting
Editorial
Questionable
```

으로 분류한다.

## PRN-02. Dependency Inventory

사용 위치와 Bundle·Build 영향을 기록한다.

## PRN-03. Admin Surface 제거 또는 격리

Production Route와 번들에서 제외한다.

## PRN-04. Client Island Audit

불필요한 `client:*`를 제거한다.

## PRN-05. External Script Lazy Loading

댓글·광고·Analytics 실패를 격리한다.

## PRN-06. Markdown Pipeline Audit

중복 Parser와 불필요한 Plugin을 찾는다.

## PRN-07. Feature Flag Cleanup

전환 완료 Flag와 구 구현을 함께 삭제한다.

## PRN-08. Build Command 통합

로컬과 CI가 같은 명령을 사용한다.

## PRN-09. Dead Code·CSS 후보 Report

자동 삭제 없이 검토 목록 생성.

## PRN-10. 전후 Metrics 비교

```text
Build time
Peak RSS
JavaScript
HTML
Dependency count
```

---

# 80. 권장 커밋 순서

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

# 완료 기준

이 태스크는 `package.json`의 줄 수가 줄었다고 완료되는 것이 아니다.

다음 상태가 되어야 한다.

```text
JavaScript가 없어도 홈·Hub·Article을 탐색할 수 있다.

공개 사이트에 관리자·편집 기능이 포함되지 않는다.

댓글·광고·Analytics 실패가 본문을 깨뜨리지 않는다.

같은 콘텐츠를 여러 Parser가 반복 처리하지 않는다.

사용하지 않는 Feature Flag와 구 구현이 남아 있지 않다.

검색을 사용하지 않는 방문자는 검색 Index를 받지 않는다.

콘텐츠 작성 도구가 공개 Runtime과 분리돼 있다.

기능 제거 전후의 Build·Bundle 개선을 수치로 확인할 수 있다.
```

# 핵심 결론

`hawk90.github.io`에서 가장 위험한 기술적 안티패턴 중 하나는 **블로그를 잘 만들려다가 블로그 플랫폼을 만드는 것**이다.

```text
좋은 콘텐츠
+
명확한 탐색
+
작은 정적 Runtime
+
필요한 Build Tool
```

이면 충분하다.

새 기능이 생길 때마다 다음 질문을 먼저 해야 한다.

> 이 기능이 독자가 더 좋은 기술 내용을 찾고 이해하도록 돕는가, 아니면 내가 또 하나의 시스템을 만들고 싶어서 추가하는가?

## 71. assistant

# Task 3-24. 배포 안정성·장애 격리·복구 가능성 안티패턴

이번에는 콘텐츠 구조, 검색, 마이그레이션, 의존성 정리와 겹치지 않는 **운영 안정성**을 본다.

정적 사이트는 서버가 없으니 장애가 적어 보이지만, 실제로는 다음 요소가 동시에 맞아야 한다.

```text
Markdown
→ Astro Build
→ 생성 자산
→ GitHub Actions
→ GitHub Pages 배포
→ CDN Cache
→ Custom Domain·HTTPS
→ 외부 댓글·광고·분석
```

이 중 하나만 잘못돼도 전체 사이트가 깨지거나, 이전 버전으로 되돌아가기 어려워질 수 있다.

핵심 목표는 다음이다.

> 빌드가 성공했다는 사실보다, 검증한 산출물을 안전하게 배포하고 문제가 생기면 빠르게 이전 정상 버전으로 복구할 수 있어야 한다.

---

## 1. Build 성공을 배포 성공으로 착각

다음은 서로 다른 상태다.

```text
TypeScript 통과
Astro Build 성공
dist 검증 성공
GitHub Pages 업로드 성공
실제 운영 URL 정상
```

`astro build`가 성공했다고 다음이 보장되지는 않는다.

```text
잘못된 base path
404 자산
빈 검색 Index
잘못된 canonical
누락된 CSS
잘못된 GitHub Pages 경로
```

따라서 배포 파이프라인은 최소한 세 단계로 나눈다.

```text
Build
→ Dist Validation
→ Deploy
```

---

# 2. Build와 Deploy에서 서로 다른 산출물을 생성

위험한 구조:

```text
Job A
→ Build
→ Test

Job B
→ 다시 Checkout
→ 다시 Install
→ 다시 Build
→ Deploy
```

테스트한 산출물과 실제 배포한 산출물이 다르다.

두 번째 Build에서 다음이 달라질 수 있다.

```text
Dependency Resolution
환경변수
현재 시간
외부 API 응답
생성 파일 순서
캐시 상태
```

권장:

```text
Build once
→ dist Artifact 저장
→ 같은 Artifact 검증
→ 같은 Artifact 배포
```

---

## 불변조건

```text
검증한 bytes
=
배포한 bytes
```

가 되어야 한다.

---

# 3. 배포 Job에 Build 권한과 로직까지 집중

다음처럼 하나의 Job이 모든 것을 수행할 수 있다.

```text
Checkout
Install
Build
Test
Secret 접근
Pages 배포
Release 작성
```

문제는 배포 권한이 필요한 Job에서 임의 코드와 의존성 설치까지 실행된다는 점이다.

더 안전한 경계:

```text
Build Job
- Repository read
- Secret 최소화
- dist Artifact 생성

Deploy Job
- Artifact 다운로드
- Pages 배포만 수행
- 필요한 배포 권한만 부여
```

Deploy Job에서 `npm install`이나 콘텐츠 Script를 다시 실행하지 않는다.

---

# 4. GitHub Actions 권한을 기본값에 의존

Workflow에 명시적인 권한이 없으면 Repository 설정이나 GitHub 기본 정책 변화에 영향을 받을 수 있다.

예:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

각 Job에 정말 필요한 권한만 준다.

Build Job:

```yaml
permissions:
  contents: read
```

Deploy Job:

```yaml
permissions:
  pages: write
  id-token: write
```

모든 Job에 다음을 주지 않는다.

```text
contents: write
actions: write
pull-requests: write
```

---

# 5. 배포 Branch를 직접 수정

예전 GitHub Pages 구성에서는 Build 결과를 `gh-pages` Branch에 강제로 Push하는 방식이 흔했다.

문제가 될 수 있는 부분:

```text
Branch History 오염
동시 배포 충돌
Force Push
Bot Token 권한
Source와 Generated 파일 혼재
```

현재 GitHub Pages 공식 Artifact 배포 방식이 프로젝트에 적합하다면, 별도 Branch를 직접 조작하는 방식보다 명시적인 Pages Artifact 배포가 단순하다.

다만 현재 저장소 설정이 기존 Branch 방식을 사용한다면 한 번에 바꾸지 말고 Preview와 Rollback 경로를 먼저 확인한다.

---

# 6. 기본 Branch Push마다 즉시 배포

모든 작은 Commit이 바로 Production에 배포되면 다음 문제가 생긴다.

```text
중간 Migration 상태 공개
콘텐츠와 코드 순서 불일치
깨진 Hub Config 노출
대량 자동 수정 즉시 반영
```

개인 블로그라면 무거운 승인 절차는 필요 없지만, 최소한 다음 Gate는 거친다.

```text
Check
Build
Dist Validation
Smoke Test
→ Deploy
```

대규모 변경은 Pull Request Preview 또는 별도 Branch Build에서 먼저 확인한다.

---

# 7. 동시 배포 경쟁

짧은 시간에 여러 Commit을 Push하면 이전 Workflow가 늦게 끝나 최신 배포를 덮어쓸 수 있다.

예:

```text
Commit A Build 시작
Commit B Build 시작
Commit B 먼저 배포
Commit A 나중에 배포
→ 운영 사이트가 A로 되돌아감
```

GitHub Actions의 `concurrency`를 사용한다.

```yaml
concurrency:
  group: pages
  cancel-in-progress: true
```

단, 취소된 Build의 Artifact가 Deploy Job에 남지 않는지 확인한다.

---

# 8. 배포 환경 이름이 없음

GitHub Environment를 사용하면 Production 배포 상태와 URL을 명시적으로 관리할 수 있다.

```yaml
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
```

이점:

```text
어떤 Commit이 현재 배포됐는지 추적
배포 상태 확인
필요한 경우 보호 규칙 적용
```

개인 사이트에 복잡한 승인자는 필요 없지만 배포 이력 자체는 유용하다.

---

# 9. 운영 Commit을 확인할 방법이 없음

사이트가 이상할 때 가장 먼저 알아야 하는 것은:

```text
지금 어떤 Commit이 배포돼 있는가?
```

이다.

방법:

```text
Build metadata JSON
HTML meta
Footer의 숨김 가능한 Version 정보
Deployment 기록
```

예:

```json
{
  "commit": "abc1234",
  "builtAt": "2026-08-01T06:00:00Z",
  "manifestVersion": "3",
  "searchIndexVersion": "2"
}
```

이를 공개 UI에 크게 표시할 필요는 없지만 장애 분석에 사용할 수 있어야 한다.

---

# 10. Build 시간에 현재 시각을 콘텐츠 의미로 사용

다음 값은 Build마다 바뀐다.

```text
new Date()
```

이를 다음에 사용하면 모든 페이지가 매 Build마다 달라질 수 있다.

```text
updated 날짜
Copyright 문구
Freshness 상태
검색 정렬
Sitemap lastmod
```

특히 Sitemap `lastmod`를 Build 시각으로 설정하면 실제로 수정되지 않은 500개 URL이 매 배포마다 갱신된 것처럼 보인다.

권장:

```text
문서 lastmod
= updated
  또는 published

Build timestamp
= 운영 진단용 별도 값
```

---

# 11. 재현 불가능한 Build

같은 Commit을 다시 Build했는데 결과가 달라질 수 있는 원인:

```text
고정되지 않은 Node 버전
Lockfile 무시
외부 API
현재 시간
랜덤 ID
파일 순서
OS Locale
Timezone
```

최소한 다음을 고정한다.

```text
Node Version
Package Manager Version
Lockfile
Locale
Timezone
```

예:

```text
TZ=Asia/Seoul
LANG=ko_KR.UTF-8
```

또는 날짜 생성은 명시적인 UTC·ISO 규칙을 사용한다.

---

# 12. `npm install` 사용으로 Lockfile Drift 허용

CI에서는 일반적으로 Lockfile을 엄격히 사용하는 명령이 적합하다.

```text
npm ci
pnpm install --frozen-lockfile
```

Lockfile과 `package.json`이 불일치하면 CI가 조용히 새 Dependency Tree를 만들지 않고 실패하도록 한다.

콘텐츠 변경 PR에서 의존성 해석이 바뀌는 일을 막을 수 있다.

---

# 13. Node·Astro 업데이트와 콘텐츠 변경을 함께 배포

예:

```text
Astro Major Update
Markdown Plugin 변경
대표 문서 30개 수정
홈 개편
```

을 한 번에 배포하면 문제가 생겼을 때 원인을 찾기 어렵다.

권장 분리:

```text
Platform Upgrade
→ Canary Build
→ Deploy 확인

Content Change
→ 별도 Commit
```

특히 Markdown Renderer 업데이트는 수백 개 글의 HTML을 바꿀 수 있다.

---

# 14. Canary 문서 없이 Markdown Pipeline 업데이트

Remark·Rehype·Shiki·Astro를 업데이트했을 때 다음 페이지가 동시에 영향을 받는다.

```text
표
Footnote
Code Fence
Raw HTML
Callout
Heading Anchor
수식
이미지
```

대표 Canary 문서 세트를 둔다.

```text
긴 코드 문서
복잡한 표 문서
Raw HTML Legacy 문서
한글 Heading 문서
다이어그램 문서
Historical 문서
```

업데이트 전후 Build와 Screenshot을 비교한다.

---

# 15. Dist 폴더를 검증하지 않음

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

# 16. Source Scan만 수행

Secret이 Source에는 없어도 Build 과정에서 삽입될 수 있다.

예:

```text
환경변수
외부 생성 Script
잘못된 PUBLIC_ 변수
Debug Metadata
```

따라서:

```text
Source Secret Scan
+
Dist Secret Scan
```

둘 다 필요하다.

---

# 17. 환경변수 이름만 보고 공개 여부 판단

Astro는 공개 Client 변수에 특정 Prefix 규칙을 사용한다.

`PUBLIC_` 계열에는 브라우저에 노출돼도 되는 값만 넣는다.

피해야 할 예:

```text
PUBLIC_GITHUB_TOKEN
PUBLIC_ADMIN_SECRET
PUBLIC_ANALYTICS_WRITE_KEY
```

이름에 `PUBLIC`이 붙었다고 안전해지는 것이 아니라 실제 HTML·JavaScript에 포함될 가능성이 있다는 의미다.

---

# 18. 배포 Artifact에 Source 전체 포함

Pages Artifact에는 일반적으로 최종 정적 결과만 포함해야 한다.

포함되면 안 되는 후보:

```text
src/
scripts/
reports/
.env
Git metadata
Migration Manifest
내부 감사 파일
```

업로드 경로를 명확히 `dist/`로 제한한다.

---

# 19. Preview 전용 페이지가 Production에 남음

예:

```text
/content-debug/
/manifest-viewer/
/search-score/
/component-gallery/
/draft-preview/
```

Production Route가 생성됐지만 Navigation에서만 숨겨져 있을 수 있다.

숨김은 보호가 아니다.

Production Build에서는 Route 자체가 생성되지 않거나 반드시 접근 불가능해야 한다.

---

# 20. Draft를 CSS로만 숨김

다음은 위험하다.

```text
Draft HTML 생성
→ 목록에서 숨김
→ robots noindex
```

URL을 아는 사람은 접근할 수 있고 Sitemap 외 경로로 발견될 수 있다.

Production에서는 Draft 페이지 HTML 자체를 생성하지 않는 것이 맞다.

---

# 21. `robots.txt`를 접근 제어로 사용

`Disallow`는 검색엔진 크롤링 지침이지 보안 기능이 아니다.

```text
관리자 페이지
초안
민감 Report
```

를 `robots.txt`로 숨길 수 없다.

공개 Artifact에 포함하지 않는 것이 해결책이다.

---

# 22. 404 페이지가 정상 200 응답으로 동작

정적 Hosting에서는 존재하지 않는 URL이 사용자 정의 404 페이지를 보여주더라도 응답 상태 처리가 플랫폼에 따라 달라질 수 있다.

검사해야 할 것:

```text
없는 URL에서 실제 404인가
GitHub Pages 기본 404와 Custom 404가 충돌하지 않는가
Base Path에서 404 자산이 로드되는가
```

404 페이지 내부 링크는 절대 경로나 올바른 Base URL을 사용한다.

---

# 23. 404에서 자동 검색·자동 이동

없는 URL을 분석해 비슷한 페이지로 자동 Redirect하면 편리해 보이지만 잘못된 문서로 이동할 수 있다.

예:

```text
/pcie-bar-old
→ 문자열이 비슷한 /bar-chart-css
```

권장:

```text
요청한 경로 표시
홈
Topic Hub
검색 버튼
대표 문서
```

를 제공한다.

명확한 과거 URL만 Redirect Registry로 처리한다.

---

# 24. Redirect Chain

다음 구조:

```text
A → B → C → D
```

는 느리고 관리가 어렵다.

모든 Redirect Source가 최종 Canonical을 직접 가리키게 한다.

```text
A → D
B → D
C → D
```

Migration Script에서 Redirect Chain과 Cycle을 검증한다.

---

# 25. Redirect와 Canonical 불일치

예:

```text
Old URL → New URL로 이동
New URL canonical → Old URL
```

검색엔진과 사용자 모두 혼란스럽다.

불변조건:

```text
Redirect Target
=
Canonical URL
=
Sitemap URL
=
내부 링크 대상
```

---

# 26. GitHub Pages Base Path 안티패턴

사용자 사이트:

```text
https://hawk90.github.io/
```

와 프로젝트 사이트:

```text
https://hawk90.github.io/project-name/
```

는 Base Path 처리가 다르다.

개발 환경에서는 `/`에서 잘 동작하지만 프로젝트 경로 배포에서 다음이 깨질 수 있다.

```text
CSS
JavaScript
이미지
Search Index
RSS
Sitemap
Font
```

현재 사이트 유형과 Custom Domain 사용 여부를 기준으로 Astro `site`와 `base`를 명확히 설정한다.

---

# 27. 문자열로 URL 조립

나쁜 예:

```ts
const href = base + "/search-index.json";
```

슬래시 중복·누락과 Subpath 문제가 생긴다.

공통 URL Helper 또는 Astro의 Base URL 처리 방식을 사용한다.

대표 URL 테스트를 다음 환경에서 수행한다.

```text
Local Root
Preview Base Path
Production Origin
```

---

# 28. 절대 URL과 상대 URL 혼용

페이지 내부 자산은 상대·Base-aware URL이 적합할 수 있고, 다음은 절대 URL이 필요하다.

```text
Canonical
Open Graph URL
Sitemap
RSS
Structured Data
```

용도별 URL 생성기를 분리한다.

```ts
buildInternalPath()
buildAbsoluteUrl()
```

모든 위치에서 `SITE.origin + path`를 반복하지 않는다.

---

# 29. Custom Domain 설정 Drift

Custom Domain을 사용한다면 다음이 일치해야 한다.

```text
Astro site
CNAME
GitHub Pages 설정
Canonical
Sitemap
RSS
Open Graph
```

Custom Domain을 바꾸고 `CNAME`만 수정하면 이전 `github.io` 주소가 canonical로 남을 수 있다.

---

# 30. HTTPS 강제 상태를 검증하지 않음

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

# 31. Mixed Content

HTTPS 페이지에서 HTTP 자산을 요청하면 브라우저가 차단할 수 있다.

대상:

```text
이미지
iframe
Script
CSS
Font
Video
```

외부 HTTP 이미지는 로컬 안전 자산으로 옮기거나 HTTPS Source가 있는지 확인한다.

---

# 32. 외부 서비스 장애가 Layout을 밀어냄

댓글·광고·Embed가 로드 실패했을 때 다음 문제가 생길 수 있다.

```text
빈 거대한 영역
무한 Spinner
Layout Shift
본문 뒤 영역 접근 불가
JavaScript 오류로 다른 기능 중단
```

각 Integration을 독립된 경계로 둔다.

```text
본문
→ 완료

댓글 Loader
→ 실패해도 짧은 오류 표시

광고
→ 실패하면 슬롯 축소
```

---

# 33. 외부 Script 하나의 오류가 전체 Bundle을 중단

공통 초기화 Script 안에서 다음을 연속 실행하면:

```ts
initTheme();
initSearch();
initAnalytics();
initComments();
initAds();
```

`initAnalytics()` 오류로 이후 기능이 실행되지 않을 수 있다.

핵심 UI와 외부 Integration을 분리하고 개별 오류 경계를 둔다.

```ts
safeInitialize("analytics", initAnalytics);
```

다만 오류를 무조건 삼키지 말고 개발 환경에서는 명확히 보고한다.

---

# 34. 무한 Loading 상태

Search Index나 댓글을 가져오면서 실패 처리가 없으면 사용자는 계속 기다리게 된다.

각 비동기 상태는 최소 네 가지를 가진다.

```text
Idle
Loading
Success
Failure
```

Failure에서는 재시도나 대체 탐색 경로를 제공한다.

---

# 35. Search Index와 HTML 버전 불일치

새 HTML은 배포됐지만 CDN·Service Worker가 과거 Search Index를 제공할 수 있다.

그 결과:

```text
검색 결과에 삭제된 URL
신규 글 검색 불가
SearchDocument Schema 오류
```

해결:

```text
Content-hashed Search Index 파일
HTML이 정확한 Hash URL 참조
Schema Version 검사
```

예:

```text
/search/index.4e91ac.json
```

---

# 36. 생성 자산을 고정 파일명으로 덮어쓰기

```text
search-index.json
main.js
og/default.png
```

를 장기 캐시하면서 같은 URL로 덮어쓰면 오래된 파일이 남을 수 있다.

변경되는 자산은 Content Hash 파일명을 사용한다.

고정 URL이 필요한 파일:

```text
robots.txt
sitemap-index.xml
rss.xml
```

은 적절히 짧은 캐시나 재검증 정책이 필요하다.

GitHub Pages의 세밀한 Cache-Control 제어에는 한계가 있을 수 있으므로 파일명 Versioning이 더 안정적이다.

---

# 37. HTML 장기 캐시 가정

정적 자산은 Hash 파일명으로 장기 캐시할 수 있지만 HTML은 새 배포를 가리키므로 오래 캐시되면 안 된다.

GitHub Pages·CDN 정책을 임의로 가정하지 말고 실제 응답 Header를 확인한다.

Custom CDN을 사용한다면:

```text
HTML
→ 짧은 Cache 또는 Revalidate

Hashed Asset
→ 장기 Immutable
```

원칙을 적용한다.

---

# 38. Service Worker가 있다면 이중 Cache

브라우저 HTTP Cache와 Service Worker Cache가 동시에 존재하면 장애 분석이 어려워진다.

```text
CDN은 최신
브라우저 Cache는 최신
Service Worker는 과거
```

같은 상황이 생긴다.

PWA가 핵심 요구가 아니라면 제거가 가장 단순한 해결책이다.

유지한다면 Cache Version과 정리 정책을 테스트한다.

---

# 39. 배포 후 Smoke Test가 없음

Deploy Job 성공은 실제 URL이 정상이라는 뜻이 아니다.

배포 후 최소한 다음을 확인한다.

```text
홈 200
대표 Article 200
Topic Hub 200
Search Index 200
CSS·JS 대표 자산 200
404 동작
Sitemap 200
RSS 200
```

GitHub Pages 반영 지연이 있을 수 있으므로 무한 재시도가 아니라 제한된 Retry 정책을 둔다.

---

# 40. Smoke Test가 본문 문자열 하나만 확인

예:

```text
Home contains "Hawk"
```

만 검사하면 CSS가 깨져도 통과한다.

권장 검사:

```text
HTTP Status
Content-Type
필수 Title
Canonical
Main element
대표 자산 Link
Draft 문자열 부재
```

브라우저 테스트에서는 대표 페이지의 Console Error도 확인한다.

---

# 41. 운영 URL이 아닌 Preview URL만 테스트

로컬 Preview는 GitHub Pages의 Base Path·Header·404 동작을 완전히 재현하지 못할 수 있다.

다음 계층을 구분한다.

```text
Local Dist Server
→ HTML·자산 기본 검증

Preview Deployment
→ Base·Routing 검증

Production Smoke
→ 실제 Domain·HTTPS·CDN 검증
```

모든 Commit마다 Production을 상세 테스트할 필요는 없지만 배포 직후 핵심 Smoke는 가치가 있다.

---

# 42. Browser Console Error 무시

화면이 보인다고 정상은 아니다.

다음 오류가 숨을 수 있다.

```text
Search Index Parse
Analytics Block
Giscus Origin
Missing Source Map
Hydration Mismatch
Image 404
```

Canary 페이지에서 브라우저 Console의 예상하지 않은 Error를 실패로 처리한다.

광고 차단기 등 환경 의존 오류는 Allowlist를 신중히 관리한다.

---

# 43. Rollback 절차가 없음

문제가 생겼을 때 다음을 즉시 답할 수 있어야 한다.

```text
직전 정상 Commit은 무엇인가?
직전 Artifact를 다시 배포할 수 있는가?
Revert Commit이 필요한가?
Workflow 재실행만으로 되는가?
```

개인 사이트에서는 복잡한 Blue-Green 배포는 필요 없지만 최소 Rollback Runbook은 있어야 한다.

---

# 44. 새 Commit으로만 복구

장애 상황에서 급하게 코드를 수정해 새 Commit을 만들면 새로운 오류가 추가될 수 있다.

더 안전한 우선순위:

```text
1. 직전 정상 Artifact 재배포
2. 문제 Commit Revert
3. 원인 수정 후 재배포
```

GitHub Pages Artifact 보존 기간과 재배포 가능 여부를 확인해 실제 절차를 정한다.

---

# 45. Deployment Tag

정상 Production 기준을 Tag로 남길 수 있다.

```text
deploy-2026-08-01
```

매 Commit마다 Tag를 만들 필요는 없다.

대규모 개편이나 AdSense 재신청 직전처럼 기준점을 남길 필요가 있을 때 유용하다.

더 단순하게 GitHub Deployment 기록과 Commit SHA만 유지해도 된다.

---

# 46. Emergency Disable 기능이 없음

외부 Integration이 문제를 일으킬 때 전체 코드를 수정하지 않고 끌 수 있으면 유용하다.

예:

```text
AdSense
Comments
Analytics
Broken Embed
```

하지만 Feature Flag를 무한히 유지하지 않는다.

통합 설정 한 곳에서:

```ts
export const INTEGRATIONS = {
  ads: false,
  comments: true,
  analytics: true,
};
```

정도로 관리한다.

콘텐츠·Home V1/V2 같은 장기 Feature Flag와는 다르다.

---

# 47. 광고 Script 실패 시 본문 렌더 차단

광고 Script를 `<head>`의 Blocking 형태로 넣거나, 초기 JavaScript가 광고 초기화를 기다리면 읽기 경험이 외부 광고 서비스에 종속된다.

광고는 다음 특성을 가져야 한다.

```text
비동기
본문 독립
실패 허용
Layout Shift 제한
```

승인 전에는 광고 Script 자체가 없어도 사이트가 완전해야 한다.

---

# 48. Third-party Embed의 무제한 사용

YouTube, CodePen, GitHub Gist, Slideshare 등의 Embed가 많으면 각 서비스 장애와 개인정보 요청에 영향을 받는다.

권장:

```text
정적 Preview
→ 사용자가 클릭
→ 실제 Embed 로드
```

또는 핵심 코드·이미지는 로컬 콘텐츠로 제공하고 외부 자료는 보조 링크로 둔다.

---

# 49. GitHub Gist를 핵심 코드 원본으로 사용

Gist가 삭제되거나 접근이 제한되면 글의 핵심 내용이 사라진다.

핵심 예제는 본문이나 동일 Repository에 보존한다.

Gist·외부 Repository는 전체 실행 코드나 추가 자료용으로 사용한다.

---

# 50. Image Missing Fallback 없음

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

# 51. 이미지 크기 미지정

`width`와 `height`가 없으면 로드 후 Layout Shift가 발생한다.

Astro Image Pipeline이나 명시적인 크기를 사용한다.

Responsive 이미지에서도 Aspect Ratio를 확보한다.

---

# 52. OG 이미지 실패로 전체 배포 중단

OG 생성은 중요하지만 본문 제공보다 우선하지 않는다.

선택지는 두 가지다.

```text
대표 문서 OG 실패
→ Build Error

일반 Legacy 문서 OG 실패
→ 기본 OG 사용 + Warning
```

모든 문서의 개별 OG 이미지가 필수인지 먼저 판단한다.

---

# 53. 기본 OG가 없음

특정 문서 OG 생성이 실패했을 때 이미지 자체가 누락되지 않도록 사이트 공통 기본 이미지를 둔다.

단, 공통 이미지가 정상인데 문서 Metadata는 특정 문서 이미지를 계속 가리키는 상태를 방지한다.

생성 성공 여부에 따라 최종 SEO View Model을 결정한다.

---

# 54. Sitemap 하나가 지나치게 커짐

현재 500여 개 글은 Sitemap 한도의 큰 문제가 아닐 가능성이 높다.

문제는 크기보다 품질이다.

```text
Draft
Search
Tag 조합
Pagination
Admin
Superseded
```

같은 불필요한 URL이 포함되는 것이 더 위험하다.

Sitemap 분할은 실제 한계가 발생할 때만 고려한다.

---

# 55. RSS 생성 실패를 Build 전체 실패로 볼 것인가

RSS가 사이트 핵심 기능이라면 실패를 차단하는 것이 맞다.

하지만 Legacy 문서 하나의 잘못된 날짜 때문에 전체 사이트를 배포하지 못하는 상황도 고려해야 한다.

정책:

```text
RSS 대상 Current 문서 오류
→ Error

RSS에서 제외되는 Legacy 문서 오류
→ Warning 또는 해당 문서 제외
```

단, 조용히 콘텐츠를 누락시키지 말고 Report에 남긴다.

---

# 56. RSS에 전체 HTML 무제한 포함

대형 코드·이미지·외부 Embed까지 RSS에 넣으면 Feed가 커지고 Reader 호환 문제가 생긴다.

선택:

```text
Description + 링크
정제된 본문 일부
전체 본문
```

콘텐츠 성격에 맞게 결정하되, 생성 실패와 용량을 측정한다.

---

# 57. `lastmod` 미래 날짜

Timezone이나 잘못된 Metadata 때문에 Sitemap의 수정일이 미래가 될 수 있다.

검사:

```text
published <= now
updated >= published
lastVerified는 미래가 아님
```

예약 발행 문서는 Production Sitemap과 페이지에서 제외한다.

---

# 58. 배포 환경의 Locale에 따른 정렬 변화

문서 제목 정렬에 `localeCompare()`를 기본 환경 그대로 사용하면 로컬 macOS와 CI Linux에서 결과가 달라질 수 있다.

예:

```ts
a.title.localeCompare(b.title, "ko-KR");
```

처럼 Locale을 명시하고, 동일 날짜의 Tie-breaker도 고정한다.

```text
updated desc
→ title ko-KR asc
→ id asc
```

---

# 59. 파일 시스템 순서를 신뢰

`glob()` 결과나 Directory Entry 순서는 환경마다 다를 수 있다.

최종 목록, Sitemap, RSS, Search Index는 명시적으로 정렬한다.

그렇지 않으면 내용이 같아도 생성 파일 Diff가 계속 발생한다.

---

# 60. JSON 직렬화 순서 불안정

Map·Object 생성 순서가 달라지면 Search Index와 Manifest Hash가 매 Build마다 바뀔 수 있다.

안정적인 정렬을 적용한다.

```text
Document by ID
Alias 정렬
Relation 정렬
Object key 안정화
```

수동 큐레이션 순서처럼 의미 있는 배열은 정렬하지 않는다.

---

# 61. 무결성 없는 생성 파일

Search Index·Manifest 파일이 부분적으로 생성됐는데 Build가 중단되면 이전 파일과 새 파일이 섞일 수 있다.

생성 패턴:

```text
Temporary Directory에 전체 생성
→ Validation
→ 최종 Directory로 교체
```

로컬 증분 Build에서도 부분 파일을 최종 결과처럼 사용하지 않는다.

---

# 62. Stale Generated Asset

문서가 삭제돼도 이전 OG 이미지나 검색 조각이 남을 수 있다.

Build 전 무조건 전체 Generated Directory를 삭제하면 느릴 수 있고, 삭제하지 않으면 Stale 파일이 남는다.

권장:

```text
현재 Manifest가 요구하는 Asset 집합 계산
→ 사용되지 않는 생성 파일 제거
```

또는 최종 `dist`는 깨끗한 디렉터리에서 항상 새로 생성한다.

Cache와 최종 Artifact를 구분한다.

---

# 63. Cache Hit를 신뢰하고 검증 생략

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

# 64. CI Cache가 원인을 숨김

캐시가 있을 때만 성공하고 깨끗한 환경에서는 실패할 수 있다.

정기적으로 또는 Release 전에 Clean Build를 수행한다.

```text
Dependency Cache 없음
Generated Cache 없음
```

에서도 정상 Build가 가능해야 한다.

---

# 65. Local 전용 파일에 의존

개발자 PC에는 있지만 Git에 없는 파일:

```text
Font
Image
Generated JSON
.env
Local package link
```

때문에 CI가 실패할 수 있다.

Build 입력을 명시한다.

단, 라이선스나 보안상 저장소에 넣으면 안 되는 파일에 의존하는 설계 자체를 재검토한다.

---

# 66. 대소문자 파일명 문제

macOS의 기본 파일 시스템에서는 다음이 같은 파일처럼 보일 수 있다.

```text
PcieBar.png
pciebar.png
```

Linux CI에서는 다르다.

내부 링크와 자산 경로의 대소문자를 정확히 검사한다.

가능하면 파일명 규칙을 소문자·하이픈으로 통일한다.

---

# 67. Unicode 파일명 정규화

한글·특수문자 파일명은 macOS와 Linux에서 Unicode 정규화 방식 차이가 날 수 있다.

본문 제목은 한글이어도 자산과 Source 파일명은 안정적인 영문 Slug를 권장한다.

기존 파일은 무리하게 일괄 변경하지 말고 문제 후보부터 정리한다.

---

# 68. 너무 긴 경로

깊은 Topic 폴더와 긴 제목 기반 파일명을 조합하면 OS·도구 한계에 가까워질 수 있다.

```text
src/content/articles/firmware/bootloader/...매우 긴 파일명.md
```

Source Path는 짧고 안정적으로 유지한다.

지식 구조는 Metadata가 담당한다.

---

# 69. Case-sensitive Route 충돌

다음 URL이 동시에 존재하면 환경에 따라 혼란이 생긴다.

```text
/CUDA/
/cuda/
```

URL Slug를 소문자로 정규화하고 중복 검증한다.

과거 대문자 URL은 Redirect 후보로 관리한다.

---

# 70. 끝 슬래시 정책 불일치

```text
/articles/pcie-bar
/articles/pcie-bar/
```

가 혼재하면 Canonical·내부 링크·Analytics가 분리될 수 있다.

Astro의 `trailingSlash` 정책을 결정하고 다음에 일관되게 적용한다.

```text
내부 링크
Canonical
Sitemap
Redirect
Smoke Test
```

---

# 71. URL Encoding 문제

한글·공백·`+`, `#`, `%`가 포함된 과거 Slug는 브라우저와 Build 도구에서 다르게 처리될 수 있다.

특히 `C++`를 URL에 그대로 쓰면 `+` 해석 문제가 생길 수 있다.

표시명:

```text
C++
```

Slug:

```text
cpp
```

처럼 분리한다.

---

# 72. 앵커 링크 회귀

Heading 문구를 바꾸면 자동 생성 ID가 달라져 외부 Deep Link가 깨진다.

대표 문서에서 중요한 Anchor는 안정적인 명시 ID를 사용한다.

기존 Heading Anchor가 변경될 때 이전 Anchor Alias를 지원할지, 변경 이력에서 안내할지 정책을 정한다.

---

# 73. Heading ID 중복

한 문서에 동일 Heading이 여러 번 있으면 자동 ID가 다음처럼 생성될 수 있다.

```text
#example
#example-1
```

Plugin 변경 후 규칙이 달라지면 Anchor가 깨질 수 있다.

중복 Heading을 Warning으로 보고 더 구체적인 제목을 권장한다.

---

# 74. Deployment Smoke가 너무 늦게 실행

배포가 끝난 뒤 수동으로 며칠 후 확인하면 장애가 오래 유지된다.

자동 Smoke는 배포 직후 실행하고 실패 시 Workflow를 실패 상태로 표시한다.

다만 이미 Production에 배포된 뒤이므로 자동 Rollback까지 무리하게 구현하기보다 즉시 알 수 있는 것이 우선이다.

---

# 75. 장애 알림이 없음

개인 블로그에 24시간 Pager는 과도하지만 배포 실패를 알아야 한다.

최소:

```text
GitHub Actions 실패 알림
GitHub 이메일·모바일 알림
```

이면 충분하다.

별도 외부 Uptime Monitoring은 사이트 중요도와 필요를 보고 선택한다.

---

# 76. Uptime만 감시

홈이 200이라고 전체 사이트가 정상인 것은 아니다.

좀 더 의미 있는 Synthetic Check 후보:

```text
홈
대표 Article
대표 Topic Hub
Search Index
Sitemap
```

매시간 감시는 과도할 수 있다.

배포 직후와 하루 1회 정도로도 충분할 수 있다.

---

# 77. 외부 의존성 Health를 사이트 Health로 간주

Giscus나 Analytics가 실패했다고 사이트 전체가 Down은 아니다.

Health를 구분한다.

```text
Core Content Health
Supporting Integration Health
```

핵심 콘텐츠가 정상이라면 지원 기능 장애는 Degraded 상태다.

---

# 78. 에러 페이지에 외부 Integration 로드

404나 오류 안내 페이지에서도 광고·댓글·무거운 Analytics를 모두 로드할 필요가 없다.

404는 가볍고 독립적이어야 한다.

```text
사이트 설명
검색
Topic
홈
```

정도면 충분하다.

---

# 79. 잘못된 배포를 검색엔진이 즉시 수집

Sitemap이 깨진 URL이나 Placeholder를 포함하면 짧은 장애도 검색엔진에 반영될 수 있다.

Deploy 전 Sitemap을 Dist 기준으로 검사한다.

```text
모든 Sitemap URL에 실제 HTML 존재
Canonical과 일치
noindex 페이지 없음
```

---

# 80. Canonical이 `localhost`나 Preview Domain

`SITE.origin` 설정이 빠지면 다음이 생성될 수 있다.

```text
http://localhost:4321/...
preview-branch.example/...
```

Production Build에서는 Canonical Origin Allowlist를 검증한다.

```text
https://hawk90.github.io
또는 실제 Custom Domain
```

이외 Origin이면 Build Error 처리한다.

---

# 81. Open Graph URL과 Canonical 차이

OG URL·이미지 URL은 절대 URL이어야 하고 Canonical과 같은 Production Origin을 사용해야 한다.

Preview Build에서는 검색엔진에 노출되지 않도록 `noindex`를 유지한다.

Preview URL을 Social Metadata의 영구 URL로 저장하지 않는다.

---

# 82. Preview가 색인 가능

Branch Preview나 임시 Deployment가 공개되고 `index,follow`라면 본 Production과 중복될 수 있다.

Preview 환경:

```text
robots noindex
Sitemap 비활성
RSS 비활성 또는 Preview 전용
광고 비활성
```

로 둔다.

---

# 83. Production과 Preview 환경 분기를 본문에서 처리

각 Page가:

```ts
if (isPreview) ...
```

를 반복하지 않는다.

Build Environment와 Publication Context를 중앙에서 만들어 전달한다.

```text
Production
Preview
Development
```

환경별 계약을 명시한다.

---

# 84. Production 전용 오류가 로컬에서 재현되지 않음

예:

```text
Base Path
Minification
Environment Variable
Case-sensitive Path
CSP
GitHub Pages 404
```

때문이다.

로컬에서 `astro dev`만 사용하지 말고 Production Build 후 Static Server로 `dist`를 확인한다.

```bash
npm run build
npm run preview:dist
```

---

# 85. Preview Server가 Source를 대신 렌더

`astro preview`와 실제 `dist` Serving의 차이를 이해해야 한다.

정적 Output이라면 가능하면 최종 파일을 단순 HTTP Server로도 확인한다.

목표는 개발 서버가 아니라 실제 Artifact를 테스트하는 것이다.

---

# 86. 브라우저 자동 테스트가 개발 서버에만 연결

Playwright·Cypress가 `astro dev`만 테스트하면 Production Minification과 Static Route 문제를 놓친다.

CI에서는:

```text
Production Build
→ dist Server
→ Browser Smoke
```

순서를 사용한다.

---

# 87. Flaky Browser Test를 무조건 Retry

실패를 모두 Retry로 감추면 실제 Race Condition이 남는다.

Retry는 브라우저·네트워크의 제한된 불안정성에만 사용한다.

고정 `sleep(3000)`보다:

```text
특정 요소
특정 응답
특정 상태
```

를 기다린다.

---

# 88. Screenshot 테스트가 광고·날짜에 영향

외부 광고, 댓글, 현재 날짜가 Snapshot을 계속 바꿀 수 있다.

Visual Test에서는:

```text
광고 비활성
댓글 Mock
날짜 고정
Animation 비활성
Font 고정
```

한다.

Visual Regression은 주요 Canary에만 적용한다.

---

# 89. Snapshot을 정상 기준으로 맹신

기존 화면에 이미 문제가 있어도 Snapshot은 통과한다.

Snapshot은 변화 감지 도구다.

```text
정확성 판단
≠
변화 감지
```

초기 Baseline을 사람이 검토하고 승인해야 한다.

---

# 90. 장애 Runbook이 코드보다 복잡

개인 사이트 Runbook은 짧아야 한다.

예:

```text
1. GitHub Deployment에서 현재 Commit 확인
2. Home·대표 Article·Search Index 확인
3. 직전 정상 Commit 식별
4. Revert 또는 정상 Artifact 재배포
5. Custom Domain·Pages 상태 확인
6. 원인 수정은 복구 후 진행
```

별도 운영 플랫폼을 만들 필요는 없다.

---

# 91. 장애 시 원인 후보 순서

권장 조사 순서:

```text
1. 최근 Deployment Commit
2. GitHub Actions 실패
3. Pages Deployment 상태
4. Custom Domain·HTTPS
5. 대표 자산 404
6. Search·댓글 등 지원 기능
```

처음부터 브라우저 캐시나 DNS의 복잡한 가설로 가지 않는다.

---

# 92. Content-only 장애와 Platform 장애 구분

## Content 장애

```text
잘못된 기술 내용
깨진 Markdown
잘못된 링크
```

## Platform 장애

```text
CSS 없음
전체 404
Build 실패
Search Index Schema 오류
```

대응이 다르다.

Content 오류는 특정 문서 Revert로 해결할 수 있지만 Platform 오류는 전체 Deployment Rollback이 더 적합할 수 있다.

---

# 93. 부분 장애 격리

예:

```text
Search Index 생성 실패
```

일 때 선택지는 두 가지다.

## 검색이 배포 필수라면

Build 실패.

## 검색 없는 사이트도 탐색 가능하다면

이전 정상 Search Index 유지 또는 검색 기능 비활성화 후 콘텐츠 배포.

하지만 이전 인덱스와 신규 HTML 불일치가 생길 수 있다.

초기에는 Search Index 생성 실패를 Build Error로 두는 편이 단순하고 안전하다.

외부 댓글·Analytics는 실패 허용이 맞다.

---

# 94. 필수와 선택 산출물 분류

## 필수

```text
HTML
CSS
핵심 JavaScript
Sitemap
Search Index
필수 이미지
```

## 선택 또는 Fallback 가능

```text
문서별 OG 이미지
댓글
Analytics
광고
외부 링크 감사 결과
```

프로젝트 요구에 따라 RSS도 필수로 둘 수 있다.

---

# 95. Error Budget 개념의 과잉 적용

SRE식 복잡한 Error Budget을 개인 블로그에 도입할 필요는 없다.

대신 간단한 운영 기준이면 충분하다.

```text
Production Build 실패 0
대표 URL 404 0
Draft 노출 0
깨진 내부 링크 0
외부 서비스 장애는 본문 영향 0
```

---

# 96. 배포 전 최종 Gate

```text
[ ] Clean install 가능
[ ] Production build 성공
[ ] Dist 민감 정보 검사
[ ] Draft·Admin artifact 없음
[ ] Sitemap·Canonical 일치
[ ] 대표 URL Browser smoke
[ ] Search Index query smoke
[ ] Base path 확인
[ ] 운영 Commit SHA 기록
```

---

# 97. 배포 후 확인

```text
[ ] Production Home 응답
[ ] 대표 Article 응답
[ ] Topic Hub 응답
[ ] CSS·검색 Index 응답
[ ] Custom Domain HTTPS
[ ] 404
[ ] 현재 Deployment Commit
```

모든 배포에서 100개 URL을 수동 확인하지 않는다.

대표 Canary를 고정한다.

---

# 98. 구현 티켓

## OPS-01. Build Once, Deploy Same Artifact

Build와 Deploy를 분리하고 Artifact를 전달한다.

## OPS-02. Workflow 권한 최소화

Build와 Deploy Job별 권한을 명시한다.

## OPS-03. Concurrency 적용

오래된 배포가 최신 배포를 덮어쓰지 못하게 한다.

## OPS-04. Dist Validation

```text
Draft
Admin
Secret
Canonical
Sitemap
필수 파일
```

검사.

## OPS-05. Production Metadata

Commit SHA·Build Version을 기록한다.

## OPS-06. Base Path·URL 검사

Production Origin과 대표 자산 URL을 검증한다.

## OPS-07. Production Artifact Browser Smoke

개발 서버가 아니라 `dist`를 테스트한다.

## OPS-08. Post-deploy Smoke

실제 운영 Domain의 핵심 URL을 확인한다.

## OPS-09. Hashed Generated Assets

Search Index와 변경 자산의 Cache 불일치를 방지한다.

## OPS-10. Redirect Validation

Chain·Cycle·Canonical 불일치를 검사한다.

## OPS-11. External Integration 격리

댓글·광고·Analytics 실패가 본문에 영향을 주지 않게 한다.

## OPS-12. Rollback Runbook

직전 정상 Commit으로 복구하는 절차를 문서화한다.

---

# 99. 권장 커밋 순서

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

# 100. 완료 기준

이 태스크는 GitHub Actions에 단계가 늘었다고 완료되는 것이 아니다.

다음 상태여야 한다.

```text
테스트한 산출물과 배포한 산출물이 동일하다.

오래된 Workflow가 최신 사이트를 덮어쓰지 못한다.

Draft·Admin·내부 Report가 Production에 포함되지 않는다.

로컬 개발 서버가 아니라 최종 dist를 검증한다.

Production Origin·Base Path·Canonical이 일관된다.

Search Index와 HTML의 Cache Version이 맞는다.

댓글·광고·Analytics 장애가 본문을 깨뜨리지 않는다.

현재 배포된 Commit을 확인할 수 있다.

문제가 발생하면 직전 정상 버전으로 되돌리는 절차가 명확하다.
```

# 핵심 결론

정적 사이트의 장점은 장애가 아예 없다는 것이 아니다.

> 배포 결과가 하나의 불변 Artifact이고, 외부 기능이 핵심 콘텐츠와 분리되며, 문제가 생기면 이전 정상 상태로 쉽게 돌아갈 수 있다는 데 있다.

`hawk90.github.io`의 운영 경계는 다음처럼 단순해야 한다.

```text
재현 가능한 Build
→ 최종 Artifact 검증
→ 동일 Artifact 배포
→ 운영 Smoke
→ 빠른 Rollback
```

이 다섯 단계가 안정적이면 사이트 구조를 크게 개선하는 과정에서도 Production을 안전하게 유지할 수 있다.

## 72. assistant

# Task 3-25. CSS 아키텍처·반응형 레이아웃·기술 문서 시각 시스템 안티패턴

이번에는 앞에서 다룬 콘텐츠 구조, 검색, 배포, 의존성 문제와 겹치지 않도록 **화면을 구성하는 CSS와 레이아웃 자체**만 본다.

기술 블로그에서 디자인 문제는 단순히 “예쁘지 않다”로 끝나지 않는다.

```text
긴 제목
긴 코드
넓은 표
복잡한 다이어그램
한글과 영문 혼용
다양한 문서 타입
모바일 화면
다크 모드
```

를 동시에 처리해야 하기 때문이다.

핵심 목표는 다음이다.

> 페이지마다 예외 CSS를 덧붙이지 않고, 기술 콘텐츠가 어떤 형태로 들어와도 읽기 폭·간격·코드·표·이미지·내비게이션이 안정적으로 유지되는 시각 시스템을 만든다.

---

## 1. 가장 흔한 근본 문제: 페이지 단위로 디자인하기

처음에는 홈을 디자인한다.

그다음 Article을 디자인한다.

그다음 Topic Hub를 디자인한다.

그러다 보면 각 페이지가 서로 다른 규칙을 갖는다.

```text
홈 카드 간격: 24px
Topic 카드 간격: 20px
Article 관련 글: 18px
검색 결과: 16px
```

각각 나쁜 값은 아니다.

문제는 동일한 정보 구조인데도 매번 새로운 spacing과 typography가 만들어진다는 것이다.

결과적으로:

```text
페이지마다 미묘하게 다른 카드
제목 크기 불일치
Border Radius 종류 증가
색상 Token 중복
반응형 Breakpoint 불일치
```

가 발생한다.

### 권장 방향

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

# 2. 전역 CSS와 Scoped CSS의 책임이 불분명

Astro에서는 다음이 쉽게 섞인다.

```text
global.css
Layout scoped style
Component scoped style
Utility class
Inline style
Markdown-generated class
```

동일한 요소가 여러 층에서 제어될 수 있다.

예:

```css
/* global.css */
article h2 {
  margin-top: 3rem;
}
```

```css
/* ArticleLayout.astro */
.prose h2 {
  margin-top: 2.5rem;
}
```

```css
/* 특정 문서 Component */
h2 {
  margin-top: 2rem;
}
```

어떤 규칙이 적용되는지 추적하기 어려워진다.

### 권장 책임 분리

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

# 3. 거대한 `global.css`

다음처럼 한 파일이 계속 커질 수 있다.

```text
Reset
Header
Footer
Article
Card
Search
Code
Table
Dark Mode
Mobile
Print
Admin
Legacy
```

수천 줄짜리 전역 CSS는 Selector 영향 범위를 판단하기 어렵다.

권장 구조 예:

```text
src/styles/
├── tokens.css
├── reset.css
├── base.css
├── typography.css
├── prose.css
├── utilities.css
└── print.css
```

페이지·컴포넌트별 스타일은 해당 컴포넌트에 둔다.

단, 파일을 50개로 잘게 나누는 것도 목적이 아니다.

구분 기준은 **변경 이유가 같은가**이다.

---

# 4. 디자인 Token 없이 Raw Value 반복

다음 값이 파일마다 반복될 수 있다.

```css
color: #e5e7eb;
border-color: #ddd;
background: #111827;
border-radius: 8px;
padding: 24px;
```

색상 하나를 변경할 때 저장소 전체를 찾아야 한다.

권장:

```css
:root {
  --color-text-primary: ...;
  --color-text-secondary: ...;
  --color-surface: ...;
  --color-surface-raised: ...;
  --color-border: ...;
  --color-accent: ...;

  --radius-sm: ...;
  --radius-md: ...;

  --space-1: ...;
  --space-2: ...;
  --space-3: ...;
}
```

하지만 Token을 지나치게 세분화하지 않는다.

```text
--home-featured-card-title-color
--topic-card-title-color
--related-card-title-color
```

처럼 특정 화면 이름이 들어가면 재사용 Token이 아니라 CSS 변수를 통한 간접 하드코딩일 뿐이다.

---

# 5. 숫자 Token을 너무 많이 생성

다음처럼 모든 숫자를 Token으로 만들 필요는 없다.

```css
--space-13: 3.25rem;
--space-14: 3.5rem;
--space-15: 3.75rem;
```

결국 개발자는 이름과 실제 크기를 모두 외워야 한다.

권장 spacing scale은 제한적으로 둔다.

예:

```text
4
8
12
16
24
32
48
64
```

정확한 숫자보다 **반복되는 리듬**이 중요하다.

---

# 6. Semantic Token과 Primitive Token 혼동

Primitive:

```css
--gray-100
--gray-800
--blue-500
```

Semantic:

```css
--text-primary
--surface-muted
--border-subtle
--link
```

컴포넌트가 `--gray-700`을 직접 사용하면 다크 모드에서 의미가 깨질 수 있다.

권장:

```text
Palette
→ Semantic Token
→ Component
```

Component는 가능한 한 의미 Token을 사용한다.

---

# 7. Light Mode 기준으로만 Token 설계

Light Mode에서:

```text
배경
카드
Border
Code
Callout
```

가 명확해도 다크 모드에서 모두 비슷한 검은색으로 합쳐질 수 있다.

대표적인 문제:

```text
본문 배경과 카드 배경 구분 불가
Border가 보이지 않음
Inline Code가 과도하게 밝음
Muted Text가 너무 흐림
Link와 일반 텍스트 구분 약함
```

다크 모드는 단순히 색상 반전이 아니다.

Surface 계층을 별도로 점검해야 한다.

```text
Canvas
Surface
Raised Surface
Inset Surface
Code Surface
```

---

# 8. Dark Mode를 별도 CSS 복제품으로 관리

나쁜 구조:

```css
.card { ... }
.article { ... }
.code { ... }

.dark .card { ... }
.dark .article { ... }
.dark .code { ... }
```

Light와 Dark 규칙이 병렬로 커지며 누락이 생긴다.

권장:

```css
:root {
  --surface: ...;
  --text: ...;
}

[data-theme="dark"] {
  --surface: ...;
  --text: ...;
}
```

컴포넌트 구조 CSS는 공통으로 유지하고, 주로 Token만 교체한다.

---

# 9. 다크 모드에서 색상 의미가 뒤바뀜

예를 들어 Warning이 Light에서는 노란색이지만 Dark에서는 너무 밝거나 갈색으로 보일 수 있다.

상태는 색 하나로 표현하지 않는다.

```text
아이콘
제목
Border
배경
텍스트
```

의 조합으로 의미를 전달한다.

`Historical`, `Needs Review`, `Error`, `Observation`이 모두 유사한 주황색 상자로 보이지 않게 한다.

---

# 10. 한 페이지에 Container 규칙이 여러 개

예:

```css
.header-inner {
  max-width: 1200px;
}

.main {
  max-width: 1100px;
}

.footer-inner {
  max-width: 1280px;
}

.article {
  max-width: 760px;
}
```

각각 이유가 있을 수 있지만 시각적 축이 맞지 않으면 페이지가 좌우로 흔들려 보인다.

권장 Container 역할:

```text
Site Container
→ Header, Footer, Hub

Reading Column
→ 일반 문단

Wide Content
→ 표, 코드, 다이어그램
```

이 세 가지 정도로 명확히 구분한다.

---

# 11. Article 전체 폭을 좁게 고정

일반 문장은 좁은 폭이 읽기 좋다.

하지만 기술 글은 다음 때문에 더 넓은 영역이 필요하다.

```text
긴 함수명
코드
표
성능 그래프
시스템 구조도
```

Article 전체를 `720px`로 고정하면 코드와 표가 항상 가로 스크롤된다.

반대로 전체를 `1100px`로 두면 문장이 지나치게 길어진다.

권장 구조:

```text
Article Shell: 넓음
Reading Content: 중간 폭
Wide Element: Shell까지 확장
```

개념 예:

```css
.article-shell {
  max-width: var(--page-wide);
}

.prose > :not(.wide) {
  max-width: var(--reading-width);
  margin-inline: auto;
}

.prose > .wide {
  width: 100%;
}
```

실제 Markdown에서 Wide 요소를 어떻게 식별할지는 현재 렌더링 구조에 맞춰 결정한다.

---

# 12. `ch` 단위만 맹신

```css
max-width: 70ch;
```

는 영문 본문에 유용하지만 한글과 코드에서는 실제 읽기 폭이 다르다.

한글, 영문, Inline Code가 혼합된 사이트에서는 시각적으로 확인해야 한다.

```text
한국어 장문
영문 기술 문단
한글 + 긴 Identifier
목록
```

을 Canary로 테스트한다.

---

# 13. 고정 Pixel 기반 Typography

예:

```css
h1 {
  font-size: 48px;
}
```

모바일에서 별도 Override가 계속 필요해진다.

반대로 모든 크기를 `vw`로 만들면 큰 화면에서 과도하게 커진다.

권장:

```css
font-size: clamp(min, preferred, max);
```

예:

```text
Article H1
Section H2
Home Hero
Topic Title
```

처럼 큰 Text에 제한적으로 사용한다.

본문 글자 크기까지 지나치게 유동적으로 만들 필요는 없다.

---

# 14. Heading 단계와 시각적 크기가 뒤섞임

H2보다 Card H3가 더 크게 보이거나, Sidebar 제목이 본문 H2보다 강하면 페이지 계층이 혼란스럽다.

HTML Heading Level은 문서 구조이고, 시각적 크기는 역할에 따라 다를 수 있다.

하지만 차이가 너무 크면 안 된다.

예:

```text
Article H1
Article H2
Article H3
Section eyebrow
Card title
Metadata
```

각 역할의 시각적 계층을 정의한다.

---

# 15. 모든 제목을 굵고 크게 표현

기술 사이트에서 다음이 모두 Bold 700이면 시각적 차이가 사라진다.

```text
H1
H2
H3
Card Title
Button
Badge
Navigation
```

Weight만이 아니라 다음을 조합한다.

```text
크기
행간
색상
공백
Border
위치
```

긴 한국어 제목은 지나치게 굵으면 답답해 보일 수 있다.

---

# 16. Heading 위·아래 간격이 동일

H2는 이전 섹션과 충분히 분리되어야 하고, 바로 뒤 문단과는 더 가깝게 느껴져야 한다.

즉:

```text
Heading 위 간격
>
Heading 아래 간격
```

이 일반적으로 자연스럽다.

모든 요소에 `margin: 24px 0`을 적용하면 문서 구조가 평평해진다.

---

# 17. Markdown 요소별 Margin이 누적

예:

```css
h2 { margin-bottom: 1rem; }
p { margin-block: 1rem; }
ul { margin-block: 1rem; }
```

인접 Margin과 Layout 방식에 따라 예상보다 큰 공백이 생긴다.

`prose`에서 일관된 vertical rhythm을 설계한다.

예:

```text
Block 간 기본 간격
Section 전환 간격
List 내부 간격
Code와 설명 간격
Figure와 Caption 간격
```

을 구분한다.

---

# 18. `* + *` 규칙 남용

```css
.prose > * + * {
  margin-top: 1.5rem;
}
```

는 단순하지만 다음 조합에서 세밀한 제어가 어렵다.

```text
Heading 다음 문단
Figure 다음 Caption
List 다음 List
Code 다음 설명
Callout 다음 Heading
```

기본 Rhythm에는 사용할 수 있지만 의미 있는 인접 조합을 Override해야 한다.

---

# 19. 본문 Line Height를 지나치게 높임

한글 본문은 적당히 넓은 행간이 좋지만 너무 크면 문단 연결성이 약해진다.

특히 Inline Code가 섞일 때 줄 높이가 불규칙해질 수 있다.

검사 대상:

```text
일반 문단
Bold가 많은 문단
Inline Code가 많은 문단
목록
인용문
```

숫자 하나를 모든 요소에 적용하지 않는다.

---

# 20. 한국어 Word Break 처리 오류

다음 CSS가 사이트 전체에 적용될 수 있다.

```css
word-break: break-all;
```

영문 식별자와 URL이 아무 위치에서나 잘리고, 한국어도 읽기 흐름이 나빠질 수 있다.

반대로 `white-space: nowrap`이 Metadata나 Badge에 남으면 모바일 폭을 깨뜨린다.

권장 요소별 정책:

```text
일반 한국어 본문
→ 자연스러운 줄바꿈

긴 URL·Identifier
→ overflow-wrap

코드 블록
→ 가로 스크롤

Badge
→ 필요한 경우 줄바꿈 또는 축약
```

---

# 21. 긴 영어 단어 때문에 페이지 전체 Overflow

대표 사례:

```text
xilinx_u250_gen3x16_xdma_2_1_202010_1
std::hardware_destructive_interference_size
```

Inline Code나 링크가 Container를 밀어내지 않도록 한다.

하지만 코드 식별자 중간이 무작위로 잘려 읽기 어렵지 않은지도 확인한다.

선택:

```text
overflow-wrap: anywhere
word-break: break-word
가로 스크롤
```

을 요소 역할에 맞게 사용한다.

---

# 22. 코드 블록의 이중 스크롤

다음 구조에서 발생할 수 있다.

```text
Article Container Scroll
→ Code Wrapper Scroll
→ Inner pre Scroll
```

사용자가 두 스크롤 영역을 만나게 된다.

가로 스크롤은 한 요소에서만 담당한다.

```text
Code Frame
→ Header 고정
→ pre가 overflow-x 담당
```

또는 Wrapper 하나가 전체를 담당한다.

---

# 23. 코드 블록이 모바일 Viewport보다 넓어짐

`min-width`, Line Number, Copy Button, 파일명이 합쳐져 Code Frame이 화면 밖으로 나갈 수 있다.

검사:

```text
320px
360px
긴 파일명
긴 첫 줄
Line Number 활성
Copy 버튼
```

Copy Button은 코드 텍스트 위를 가리지 않게 한다.

---

# 24. 코드 가로 스크롤이 보이지 않음

Scrollbar를 완전히 숨기면 사용자가 더 많은 코드가 오른쪽에 있다는 사실을 모를 수 있다.

특히 Trackpad가 없는 환경에서는 문제다.

Scrollbar를 지나치게 미화하거나 제거하지 않는다.

필요하다면 Code Frame 가장자리의 시각적 Fade를 사용할 수 있지만 접근성과 복잡도를 검토한다.

---

# 25. 코드 Font Size를 너무 작게 설정

긴 코드를 한 화면에 많이 보여주기 위해 12px 이하로 줄이면 읽기 어렵다.

코드가 넓다면 글자를 줄이는 것보다 가로 스크롤이나 핵심 발췌가 낫다.

모바일에서 본문은 16px인데 코드가 11px인 구조를 피한다.

---

# 26. Inline Code가 문장 높이를 깨뜨림

Inline Code에 과도한 Padding과 Border를 적용하면 행간이 튄다.

```text
`pci_scan_child_bus()`
```

가 작은 버튼처럼 보여서는 안 된다.

Inline Code는 일반 텍스트와 구분되되 문장 흐름 안에 있어야 한다.

---

# 27. 표에 무조건 `display: block`

모바일 Overflow를 해결하려고 모든 `table`에:

```css
display: block;
overflow-x: auto;
```

를 적용하면 Table Layout이나 접근성에 예기치 않은 영향을 줄 수 있다.

Wrapper를 사용하는 편이 명확하다.

```html
<div class="table-scroll">
  <table>...</table>
</div>
```

Markdown Pipeline에서 자동 Wrapper를 생성할 수 있다.

---

# 28. 표의 최소 폭이 없음

표가 좁은 화면에 억지로 압축되면 셀 내용이 한 글자씩 줄바꿈된다.

적절한 `min-width`를 제공해 Wrapper 안에서 가로 스크롤하도록 한다.

다만 모든 표에 같은 최소 폭을 주지 않는다.

```text
2열 비교표
5열 성능표
레지스터 표
```

는 필요한 폭이 다르다.

---

# 29. 숫자 열 정렬이 불안정

성능·크기·날짜·주소 값은 오른쪽 정렬 또는 숫자 정렬을 고려한다.

예:

| 항목 | 시간 |
|---|---:|
| A | 7.1 ms |
| B | 12.8 ms |

주소·코드 값은 Monospace가 읽기 쉬울 수 있다.

하지만 모든 Table Cell을 Monospace로 만들지는 않는다.

---

# 30. Sticky Header가 Anchor를 가림

TOC나 외부 링크로 Heading Anchor에 이동했는데 고정 Header 뒤에 제목이 숨을 수 있다.

다음 속성을 고려한다.

```css
scroll-margin-top: ...;
```

대상:

```text
H2
H3
Footnote
Named Anchor
```

Header 높이를 여러 CSS 파일에서 각각 하드코딩하지 않는다.

---

# 31. Sticky 요소가 너무 많음

기술 Article에 다음이 모두 고정될 수 있다.

```text
Header
TOC
Reading Progress
Share Bar
Back to Top
Cookie Banner
Ad
```

화면이 좁아지고 서로 겹친다.

Sticky 요소는 핵심 하나 또는 두 개로 제한한다.

모바일에서는 대부분 일반 흐름으로 돌린다.

---

# 32. Sticky TOC가 Footer까지 내려감

TOC의 높이가 Viewport보다 길거나 Footer와 겹칠 수 있다.

검사:

```text
긴 TOC
작은 Laptop Height
브라우저 Zoom 200%
```

TOC 내부에 또 스크롤을 만들면 사용성이 나빠질 수 있다.

긴 TOC는 Heading Depth를 줄이거나 접는 방향을 검토한다.

---

# 33. Sidebar가 본문 폭을 지속적으로 침식

Desktop에서 TOC와 Related Sidebar를 동시에 두면 본문이 좁아질 수 있다.

기술 문서는 Code 폭이 중요하므로:

```text
TOC
본문
Related
```

3열 구조를 무조건 유지하지 않는다.

관련 문서는 본문 하단으로 보내고, Desktop에는 TOC 하나만 두는 편이 안정적이다.

---

# 34. Breakpoint를 기기 이름으로 설계

```text
mobile
tablet
laptop
desktop
```

기준으로 고정하면 콘텐츠가 실제로 깨지는 지점과 맞지 않을 수 있다.

Breakpoint는 다음을 기준으로 정한다.

```text
Navigation이 더 이상 들어가지 않는 지점
2열 Card가 지나치게 좁아지는 지점
TOC를 둘 공간이 없는 지점
Code와 본문이 함께 유지되지 않는 지점
```

즉, 기기가 아니라 Layout의 필요에 따라 정한다.

---

# 35. Breakpoint가 파일마다 다름

```text
768px
780px
800px
820px
```

가 여러 Component에 흩어지면 같은 화면에서 일부는 모바일, 일부는 데스크톱 상태가 된다.

CSS Custom Media 지원 여부나 공통 Token 관리 방식을 검토한다.

단, Breakpoint 이름을 10개 만들 필요는 없다.

---

# 36. 너무 많은 반응형 단계

```text
xs
sm
md
lg
xl
2xl
3xl
```

모든 컴포넌트가 단계별 Override를 가지면 복잡해진다.

대부분의 블로그 Layout은 다음 정도로 충분하다.

```text
좁은 화면
중간 화면
넓은 화면
```

Component가 자연스러운 Grid와 `minmax()`로 대응하면 Media Query 자체를 줄일 수 있다.

---

# 37. Grid Column 수를 고정

```css
grid-template-columns: repeat(3, 1fr);
```

을 화면 폭별로 반복 Override할 수 있다.

Card 최소 폭이 명확하다면:

```css
repeat(auto-fit, minmax(...))
```

을 사용할 수 있다.

하지만 Featured Card처럼 정확한 순서와 크기가 중요한 영역에서는 자동 Grid가 예기치 않은 빈 공간을 만들 수 있다.

자동 Layout과 명시 Layout을 역할에 따라 선택한다.

---

# 38. 카드 높이를 억지로 동일하게 맞춤

Grid를 정돈하려고 다음을 사용할 수 있다.

```text
Description 2줄 제한
Title 2줄 제한
고정 높이
```

하지만 긴 한국어 제목이나 기술 식별자가 잘리면서 의미가 손실될 수 있다.

Featured 카드에서는 제목과 설명을 충분히 보여주는 것이 우선이다.

일반 Archive 목록에서는 짧은 Description Clamp가 가능하다.

카드 역할마다 정책이 달라야 한다.

---

# 39. `line-clamp` 남용

검색 결과, Featured, Related 모두 2줄로 자르면:

```text
어떤 글인지 판단할 정보 부족
비슷한 제목 구분 불가
모바일에서 더 심함
```

이 발생한다.

Clamp를 사용한다면 전체 카드 링크에서 Title은 가급적 완전하게 표시하고 Description만 제한하는 편이 낫다.

---

# 40. 전체 카드 클릭과 내부 링크 충돌

카드 전체를 클릭 가능하게 만들면서 Topic 링크, Tag 링크, 상태 링크를 내부에 추가하면 중첩 Link 문제가 생긴다.

```html
<a class="card">
  <a class="topic">PCIe</a>
</a>
```

는 유효하지 않다.

카드 전체 링크를 하나로 만들거나, 제목 링크와 Metadata 링크를 분리한다.

JavaScript Click Handler로 `<div>` 전체를 링크처럼 만드는 것도 키보드 접근성 문제를 만든다.

---

# 41. Hover에만 정보를 표시

예:

```text
Card 설명
Heading Permalink
버튼 이름
Code action
```

이 Hover에서만 보이면 Touch와 Keyboard 사용자는 접근하기 어렵다.

Hover는 보조 강조일 뿐, 핵심 정보와 기능은 항상 접근 가능해야 한다.

---

# 42. Hover에서 Layout이 움직임

Border를 추가하거나 Font Weight를 바꾸면서 Card 크기가 변할 수 있다.

```text
Grid 흔들림
텍스트 재배치
```

가 생긴다.

Hover 전에도 Border 공간을 확보하거나 Transform·색상처럼 Layout에 영향을 적게 주는 속성을 사용한다.

---

# 43. 과도한 Transform Hover

모든 Card가 위로 떠오르고 그림자가 커지면 기술 문서보다 상업적 Landing Page처럼 보일 수 있다.

```css
transform: translateY(-6px);
```

가 많으면 화면이 산만하다.

클릭 가능성은 다음으로도 충분히 전달할 수 있다.

```text
명확한 링크
Border 변화
배경 변화
제목 색상
```

---

# 44. 카드마다 그림자

Card, Header, Search, Code, Callout, Button 모두 Shadow를 가지면 계층이 무너진다.

Surface 구분을 다음으로 먼저 해결한다.

```text
공백
Border
Background
```

Shadow는 실제로 떠 있는 Overlay나 강조 Surface에 제한한다.

---

# 45. Border Radius 과다

모든 요소가 둥글면:

```text
카드
버튼
코드
표
이미지
Callout
Badge
Input
```

시각적 차이가 사라진다.

기술 문서에서는 Code·Table·Figure가 내용 구조를 보여줘야 하므로 Radius를 역할에 맞게 제한한다.

---

# 46. Badge 남용

다음 정보를 전부 Badge로 만들 수 있다.

```text
Topic
Type
Status
Difficulty
Date
Reading Time
Language
Version
```

첫 화면이 라벨 모음처럼 보인다.

Badge는 짧고 중요한 분류 정보에만 사용한다.

나머지는 일반 Metadata Text로 표현한다.

---

# 47. 색상 Badge로만 상태 구분

예:

```text
Current = 초록
Historical = 파랑
Needs Review = 노랑
```

색각 차이, 다크 모드, 저대비 환경에서 의미가 사라질 수 있다.

텍스트 자체가 명확해야 한다.

```text
Historical
Needs Review
```

를 표시하고 색상은 보조 신호로 사용한다.

---

# 48. 버튼과 링크 시각 언어가 동일

모든 링크를 둥근 버튼으로 만들면 글 안의 탐색과 행동의 차이가 사라진다.

구분:

```text
텍스트 링크
→ 문서 이동

Button
→ Dialog 열기, 복사, 댓글 로드

Primary CTA
→ 매우 제한적인 핵심 행동
```

Article 내부 다음 읽기는 링크 카드일 수 있지만 일반 버튼처럼 보여야 할 필요는 없다.

---

# 49. Link Underline 제거

본문 링크가 색상만 다르면 일반 텍스트와 구분하기 어려울 수 있다.

특히 다크 모드와 방문한 링크에서 문제가 생긴다.

본문 링크는 Underline 또는 명확한 비색상 신호를 유지한다.

Navigation·Card Title 등 문맥상 Link임이 명확한 영역은 별도 스타일이 가능하다.

---

# 50. 방문한 링크 상태를 완전히 제거

기술 문서를 여러 개 탐색할 때 이미 읽은 문서를 구분하는 것이 유용할 수 있다.

하지만 브랜드 색상과 충돌하거나 카드 전체가 이상해질 수 있다.

본문 링크·Archive 목록에서 제한적으로 `:visited`를 지원할 수 있다.

개인정보상 방문 기록을 JavaScript로 별도 저장할 필요는 없다.

---

# 51. Focus Style 제거

```css
outline: none;
```

를 공통 Button·Link에 적용하면 키보드 사용자가 위치를 알 수 없다.

Focus 디자인은 Hover와 별도로 명확해야 한다.

```text
검색 버튼
모바일 메뉴
카드 링크
TOC
코드 복사
```

를 키보드로 순회해 확인한다.

---

# 52. Focus Ring이 잘림

부모 요소의:

```css
overflow: hidden;
```

때문에 Focus Outline이 잘릴 수 있다.

특히 Radius Card 전체 링크에서 흔하다.

Outline offset, 내부 Focus Ring, Overflow 정책을 함께 점검한다.

---

# 53. `overflow: hidden`의 무분별한 사용

Card Radius를 맞추거나 Layout Shift를 막기 위해 사용하다가 다음이 잘릴 수 있다.

```text
Focus Ring
Dropdown
Tooltip
Long Code
Badge
```

각 요소에서 왜 Overflow를 숨기는지 명확해야 한다.

---

# 54. Z-index 경쟁

다음 숫자가 계속 증가한다.

```text
Header 10
TOC 20
Dropdown 100
Search 1000
Tooltip 9999
```

새 UI가 생길 때마다 더 큰 숫자를 사용한다.

권장 Layer 역할:

```text
Base
Sticky
Dropdown
Modal
Toast
```

정도로 제한한다.

CSS Stacking Context가 Transform·Opacity로 새로 생기는 문제도 확인한다.

---

# 55. Search Dialog가 Header 아래 숨음

Modal z-index가 높아도 부모 Stacking Context 안에 갇힐 수 있다.

Dialog를 DOM 구조상 적절한 상위 위치에 두거나 Native `<dialog>`를 검토한다.

Modal Background와 Scroll Lock도 Component 단위로 검증한다.

---

# 56. Modal Scroll과 Body Scroll 동시 발생

검색 Dialog를 열었는데 배경 페이지도 스크롤되거나, 닫았을 때 스크롤 위치가 초기화될 수 있다.

검사:

```text
Desktop scrollbar
iOS Safari
모바일 키보드
긴 검색 결과
```

하지만 검색 Dialog 하나 때문에 대형 Scroll Lock Library를 추가하지 않는다.

---

# 57. Header 높이가 페이지마다 달라짐

Home에서는 Hero Header, Article에서는 Compact Header 등 Variant가 많아지면 Anchor offset과 Layout 계산이 복잡해진다.

공통 Site Header 높이를 유지하거나, 페이지별 Header가 다르다면 Sticky 여부와 Scroll Margin을 명시적으로 분리한다.

---

# 58. 모바일 Header에 기능 과밀

작은 화면에 다음을 모두 넣으려 할 수 있다.

```text
Logo
Topic
Search
Theme
GitHub
Language
Menu
Profile
```

결국 Icon만 남고 의미를 알기 어렵다.

모바일에서는:

```text
브랜드
검색
메뉴
```

정도로 우선순위를 줄이고 나머지는 Menu 내부로 이동한다.

---

# 59. Hamburger Menu에 핵심 탐색을 숨김

모든 Topic과 검색을 Menu에 숨기면 사용자는 사이트 구조를 알기 어렵다.

검색은 Header에서 직접 접근 가능하게 두고, Home에는 Core Topic을 본문에 명확히 보여준다.

모바일 Menu가 유일한 정보 구조가 되지 않게 한다.

---

# 60. Footer를 링크 창고로 사용

Footer에 다음을 모두 넣을 수 있다.

```text
모든 Topic
모든 Tag
최근 글
인기 글
GitHub
RSS
법적 문서
프로필
도구
```

페이지 끝이 다시 거대한 Sitemap이 된다.

Footer는 다음 정도면 충분하다.

```text
사이트 설명
핵심 Topic 일부
About·Privacy
GitHub·RSS
```

전체 탐색은 Topic Hub와 Archive가 맡는다.

---

# 61. Home Hero가 화면 대부분을 차지

큰 슬로건과 장식 그래픽 때문에 첫 화면에 콘텐츠가 보이지 않을 수 있다.

기술 지식베이스의 Home에서는 사용자가 빠르게 다음을 봐야 한다.

```text
무슨 사이트인지
어떤 Topic이 있는지
어디서 시작하는지
```

Hero는 정체성을 전달하되 Core Topics와 Featured를 지나치게 아래로 밀지 않는다.

---

# 62. Hero 문구와 시각 요소가 콘텐츠보다 강함

화려한 Gradient, Animation, 3D 배경이 기술 문서의 신뢰감과 충돌할 수 있다.

개인 브랜드를 보여주는 것은 좋지만:

```text
콘텐츠
>
장식
```

의 우선순위를 유지한다.

Animation은 Reduced Motion을 지원하고, 텍스트 대비를 해치지 않아야 한다.

---

# 63. Gradient Text 남용

Heading을 Gradient Text로 만들면 다크 모드와 저대비 환경에서 일부 글자가 흐려질 수 있다.

또 Text Selection과 Print에서 문제가 생길 수 있다.

브랜드 강조 한 곳에 제한적으로 사용하고 기술 문서 제목에는 일반적인 고대비 Text가 낫다.

---

# 64. 배경 Pattern이 Code 가독성을 방해

Grid, Noise, Glow가 Article Body 뒤까지 이어지면 긴 글 읽기가 피로하다.

장식 배경은 Hero나 Section 경계에서 끝내고 Reading Area는 안정적인 Surface를 유지한다.

---

# 65. Article마다 다른 시각 템플릿

Debug Note는 빨간 테마, Experiment는 보라 테마처럼 문서 타입별 색을 과도하게 바꾸면 사이트가 여러 제품처럼 보일 수 있다.

타입은 Header Label과 일부 Accent로 구분하고 기본 Reading Experience는 동일하게 유지한다.

---

# 66. Content Type별 색상을 영구 의미로 사용

타입이 늘거나 색이 부족해지면 의미 체계가 깨진다.

```text
Guide
Concept
Debug
Experiment
Source
Reference
Historical
Status
```

타입과 상태가 모두 색상을 요구하면 충돌한다.

권장:

```text
Type
→ Text Label 중심

Status
→ 상태 Notice와 보조 색상

Interaction
→ Accent Color
```

---

# 67. Callout 유형마다 완전히 다른 디자인

Observation, Hypothesis, Warning, Fact가 각기 다른 Icon·색·배경·Border를 가지면 본문이 산만하다.

공통 Callout 구조를 유지한다.

```text
Label
Title 선택
Body
```

차이는 최소한의 Accent와 Label로 표현한다.

---

# 68. Blockquote와 Callout 혼동

일반 인용문과 작성자 Note가 같은 스타일이면 출처가 있는 인용인지 설명 상자인지 알기 어렵다.

```text
Blockquote
→ 다른 사람의 발언·문서 인용

Callout
→ 문서 내 의미적 주의·관찰
```

시각과 HTML 의미를 구분한다.

---

# 69. 인용문에 출처가 없음

긴 인용문이 장식처럼 사용될 수 있다.

기술 문서에서는 인용 대상과 출처를 명확히 표시한다.

단순 강조 문장을 Blockquote로 사용하지 않는다.

---

# 70. 이미지가 본문 폭을 무조건 100% 차지

작은 Register Diagram이나 Screenshot도 전체 폭으로 확대하면 흐릿하고 과도하게 커진다.

이미지 종류에 따라:

```text
Inline Figure
Standard Figure
Wide Figure
Full Bleed
```

역할을 구분할 수 있다.

하지만 문서 작성자가 임의의 Pixel Width를 매번 지정하게 만들지 않는다.

---

# 71. 고해상도 이미지를 CSS로만 축소

4000px Screenshot을 700px로 표시하면 네트워크 비용은 그대로다.

대표 문서 이미지에서는 적절한 크기와 Responsive Source를 생성한다.

단, 확대가 필요한 Diagram은 원본 접근 경로를 유지한다.

---

# 72. 이미지와 Caption 간격 불일치

Caption이 일반 문단처럼 멀리 떨어지거나 이미지와 붙어 있지 않으면 관계가 불명확하다.

`figure` 단위로 Layout을 관리한다.

Caption은 본문보다 작고 Muted하되 충분한 대비를 유지한다.

---

# 73. Screenshot에 Radius와 Shadow를 무조건 적용

UI Screenshot은 Card처럼 보일 수 있지만 Register Diagram·Terminal Capture에도 같은 스타일을 적용하면 문서 내용과 장식 경계가 혼란스럽다.

이미지 유형별로 공통 최소 Frame만 사용한다.

---

# 74. SVG가 다크 모드에서 사라짐

SVG 내부에 검은색 선과 흰 배경이 하드코딩돼 있으면 다크 모드에서 선이 보이지 않거나 밝은 직사각형이 튄다.

선택:

```text
SVG 자체에 명확한 배경 포함
CSS Variable 기반 SVG
Light·Dark 자산 분리
```

복잡도를 보고 결정한다.

다이어그램은 테마와 상관없이 읽히는 독립 배경을 갖는 것도 좋은 방법이다.

---

# 75. SVG 내부 Text가 너무 작음

Desktop에서는 보이지만 모바일에서 축소되면 읽을 수 없다.

Diagram을 처음부터 모바일까지 한 장에 담으려 하지 않는다.

```text
Desktop Diagram
+
본문의 순서 목록
```

또는 Diagram을 여러 단계로 분리한다.

---

# 76. Print CSS 부재로 검은 배경 출력

다크 모드 상태에서 Print하면 Background와 흰 글자가 그대로 나올 수 있다.

Print에서는 일반적으로:

```text
밝은 배경
어두운 글자
Navigation 제거
Code Border 유지
링크 식별
```

정도로 단순화한다.

---

# 77. Print에서 URL을 모든 링크 뒤에 표시

기술 문서의 내부 링크가 많으면 출력물이 URL로 가득 찰 수 있다.

외부 Reference만 URL을 표시하거나, Footnote 방식으로 제한하는 선택을 검토한다.

---

# 78. 시스템 Font와 Web Font Metrics 차이

Web Font 로드 전후에 제목 줄바꿈과 Card 높이가 달라질 수 있다.

```text
CLS
Navigation 이동
Hero 높이 변화
```

가 생긴다.

대체 Font의 Metrics가 크게 다르지 않은지 확인하고, Font가 꼭 필요한지 판단한다.

---

# 79. 너무 많은 Font Weight 다운로드

실제 CSS는:

```text
400
500
600
700
```

을 사용하지만 Font 파일은 더 많은 Weight와 Italic까지 받을 수 있다.

사용하는 Weight만 포함하거나 Variable Font의 실제 크기 이점을 측정한다.

한글 Font는 특히 영향이 크다.

---

# 80. Code Font가 없는 경우 Layout 붕괴

Custom Code Font가 실패해도 System Monospace로 안정적으로 대체되어야 한다.

긴 식별자와 Line Height가 크게 변하지 않는 fallback stack을 사용한다.

---

# 81. CSS Reset이 Markdown 의미를 제거

전역 Reset이:

```css
ul {
  list-style: none;
}
```

```css
button {
  background: none;
}
```

를 적용한 뒤 Prose에서 복구를 잊을 수 있다.

Navigation List와 Article List는 요구가 다르다.

Reset은 최소화하고 Component에서 명시적으로 스타일링한다.

---

# 82. `all: unset` 남용

Button이나 Input을 초기화할 때 Browser 기본 접근성·Cursor·Focus 스타일이 사라질 수 있다.

필요한 속성만 Reset하고 상호작용 요소의 기본 동작을 보존한다.

---

# 83. `height: 100vh` 모바일 문제

모바일 브라우저 주소창 때문에 Hero·Dialog 높이가 잘릴 수 있다.

새 Viewport 단위:

```text
dvh
svh
lvh
```

의 지원과 fallback을 검토한다.

하지만 전체 페이지 Section을 굳이 화면 높이에 맞출 필요가 있는지 먼저 판단한다.

---

# 84. 가로 방향 모바일 미검사

모바일 가로 모드에서는 높이가 작아 Sticky Header와 Modal이 화면을 거의 차지할 수 있다.

검색 Dialog·Menu·TOC를 Landscape에서도 점검한다.

---

# 85. Browser Zoom 미검사

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

# 86. 글자 확대 시 고정 높이 요소 잘림

```css
height: 40px;
```

인 Badge·Button·Navigation이 Text 확대에서 잘릴 수 있다.

가능하면 `min-height`와 Padding 기반으로 구성한다.

---

# 87. Icon-only 버튼에 Tooltip만 의존

Search, Theme, Copy, Menu가 Icon만 있고 Tooltip은 Hover에서만 나오면 모바일·스크린리더 사용자는 의미를 알기 어렵다.

Accessible Name을 제공하고, 핵심 기능은 모바일에서 Text Label을 고려한다.

---

# 88. 너무 작은 Click Target

Code Copy, Heading Link, TOC item의 Click 영역이 Icon 크기와 같으면 사용하기 어렵다.

보이는 Icon보다 충분한 Interactive Padding을 제공한다.

다만 작은 Icon Button이 Heading을 가리지 않게 한다.

---

# 89. `cursor: pointer`를 모든 카드에 적용하지만 링크가 아님

클릭 가능해 보이지만 일부 영역만 Link이거나 JavaScript가 없으면 작동하지 않을 수 있다.

실제 `<a>` 또는 `<button>`을 사용하고 해당 Interactive Element에만 Pointer를 적용한다.

---

# 90. Animation Duration이 제각각

Menu, Search, Card, Theme가 모두 다른 속도로 움직이면 일관성이 없다.

소수의 Motion Token을 사용한다.

```text
Fast
Normal
Slow
```

긴 Article Site에서는 Animation 자체를 제한한다.

---

# 91. Reduced Motion 미지원

다음 효과가 있다면:

```text
Page transition
Smooth scroll
Card transform
Accordion animation
Loading spinner
```

`prefers-reduced-motion`을 고려한다.

Anchor 이동의 `scroll-behavior: smooth`도 사용자 설정에 따라 비활성화할 수 있다.

---

# 92. Skeleton Loader 남용

정적 사이트의 Card와 Article은 즉시 HTML로 제공할 수 있다.

정적 콘텐츠에 Skeleton을 보여주는 것은 오히려 Client Rendering이 개입됐다는 신호일 수 있다.

Skeleton은 실제로 늦게 로드되는 검색 결과·댓글 정도에만 필요할 수 있다.

---

# 93. Layout Shift를 Animation으로 숨김

Font, Image, Ad 영역이 로드되며 움직이는 문제를 Fade-in으로 가리는 것은 해결이 아니다.

원인을 제거한다.

```text
이미지 크기 예약
Font 전략
광고 Slot 정책
비동기 Component 공간
```

---

# 94. 광고 공간을 무조건 크게 예약

Layout Shift를 막으려고 승인이 안 된 상태에서도 큰 빈 광고 영역을 유지하면 콘텐츠가 끊긴다.

광고 활성 상태와 예상 형식에 따라 Slot을 관리한다.

광고가 없거나 로드 실패하면 과도한 빈 공간을 남기지 않는다.

---

# 95. Container Query를 이유 없이 도입

Container Query는 유용하지만 Media Query로 충분한 단순 Card에 무조건 적용하면 CSS 디버깅이 복잡해진다.

실제로 Component가 다양한 부모 폭에서 재사용되는 경우에 사용한다.

페이지 전체 반응형은 기존 Media Query가 더 명확할 수 있다.

---

# 96. 최신 CSS 기능의 Fallback 미검토

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

# 97. CSS Selector Specificity 경쟁

```css
.article .content .prose h2.title
```

처럼 Selector가 깊어지면 Override를 위해 더 강한 Selector가 필요하다.

권장:

```text
낮은 Specificity
명확한 Component Root
Token
Cascade Layer
```

를 검토한다.

`!important`가 늘기 시작하면 Cascade 설계를 점검한다.

---

# 98. `!important`를 Utility와 Component에서 경쟁적으로 사용

Tailwind의 `!` Modifier, Inline Style, Global `!important`가 섞이면 Theme와 Responsive Override가 어려워진다.

`!important`는 Accessibility Override나 외부 Embed 격리처럼 제한적인 목적에 사용한다.

---

# 99. CSS Cascade Layer를 도입하고 순서를 이해하지 못함

`@layer`는 유용하지만:

```text
reset
base
components
utilities
overrides
```

순서를 명확히 하지 않으면 Scoped CSS와 Utility 간 우선순위가 예상과 다를 수 있다.

도입한다면 CSS Architecture 문서에 Layer 책임을 짧게 기록한다.

---

# 100. Visual Regression이 Home만 검사

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

# 101. 권장 Visual Canary

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

# 102. 디자인 검수에서 Lorem Ipsum 사용

가짜 짧은 영문 텍스트로 Card와 Header를 테스트하면 실제 한국어 기술 제목에서 깨진다.

Canary 데이터는 실제와 유사해야 한다.

```text
긴 한국어 제목
C++ 기호
영문 함수명
Version 문자열
긴 Description
```

을 포함한다.

---

# 103. 극단값 테스트 부재

다음 콘텐츠를 Fixture로 만든다.

```text
제목 1줄
제목 4줄
Description 없음
Description 매우 김
Tag 0개
긴 Inline Code
표 10열
Heading 20개
```

UI가 평균 문서만 처리하도록 설계되지 않게 한다.

---

# 104. 모든 예외를 CSS로 수용

콘텐츠가 비정상적으로 긴 경우 CSS로 무조건 숨기거나 축소하기보다 콘텐츠 규칙으로 잡아야 할 수 있다.

예:

```text
제목 180자
Tag 30개
Prerequisite 10개
```

는 Layout 문제이기도 하지만 Editorial Validation 문제다.

```text
CSS
→ 정상 범위의 다양성 처리

Validation
→ 비정상 범위 방지
```

로 책임을 나눈다.

---

# 105. CSS Architecture 문서가 구현과 분리

장문의 디자인 시스템 문서를 만들고 실제 CSS는 계속 예외가 생길 수 있다.

문서에는 핵심 계약만 남긴다.

```text
Container 3종
Spacing Scale
Typography 역할
Surface Token
Breakpoint
Prose 책임
```

나머지는 실제 Component와 Story·Canary가 Source of Truth가 된다.

---

# 106. 공개 Component Gallery 안티패턴

디자인 검수를 위해 `/components` 페이지를 만들었다가 Production에 공개될 수 있다.

Component Gallery가 필요하면:

```text
개발 전용 Route
별도 Story 도구
Screenshot Fixture
```

로 관리하고 Production Artifact에서 제외한다.

---

# 107. Storybook 도입이 과한 경우

컴포넌트 수가 적고 대부분 Astro 정적 컴포넌트라면 Storybook 설정·Build·Dependency가 실제 가치보다 클 수 있다.

Canary Route와 Visual Test로 충분할 수 있다.

실제로 여러 상태와 재사용 Component가 많아질 때 검토한다.

---

# 108. 시각 완성도를 위해 Semantic HTML을 희생

예:

```text
표를 Grid div로 구현
링크를 div onclick으로 구현
Heading 대신 styled span 사용
```

CSS 편의를 위해 HTML 의미를 잃으면 접근성·SEO·유지보수가 나빠진다.

먼저 적절한 HTML을 선택하고 CSS가 이를 표현하게 한다.

---

# 109. DOM 순서와 시각 순서 불일치

CSS Grid `order`로 Desktop에서 Sidebar와 본문 순서를 바꾸면 스크린리더·키보드 순서가 시각과 다를 수 있다.

DOM 자체를 논리적인 읽기 순서로 구성한다.

```text
Main Content
→ Related
→ Aside
```

시각적 위치 변경이 필요하다면 접근 순서를 함께 검토한다.

---

# 110. 모바일에서 콘텐츠 순서를 단순히 반전

Desktop 2열을 모바일 1열로 바꿀 때 장식 Image가 제목보다 먼저 오는 등 정보 우선순위가 잘못될 수 있다.

DOM 순서를 Mobile 기준의 핵심 읽기 흐름에 맞추는 편이 안전하다.

---

# 111. CSS로 중요 콘텐츠 숨김

모바일에서 공간을 줄이기 위해:

```css
display: none;
```

으로 Description, Status, Prerequisite를 숨기면 핵심 정보가 사라질 수 있다.

장식이나 중복 Metadata만 숨긴다.

핵심 콘텐츠는 축약하거나 다른 위치로 재배치한다.

---

# 112. 데스크톱과 모바일의 정보가 다름

반응형은 같은 정보를 다른 구조로 표현하는 것이 이상적이다.

Desktop에만 Learning Path가 있고 Mobile에서는 사라지는 식의 차이를 피한다.

---

# 113. 다크 모드에서 이미지 밝기 자동 감소

```css
img {
  filter: brightness(.8);
}
```

를 전체 이미지에 적용하면 성능 그래프와 코드 Screenshot의 색상이 왜곡된다.

장식 사진에는 가능하지만 기술 Figure에는 적용하지 않는다.

---

# 114. CSS Filter로 Diagram 색상을 변환

Invert Filter로 Light Diagram을 Dark에 맞추면 Brand 색, Error 색, Screenshot이 왜곡된다.

기술적 의미가 있는 색을 자동 변환하지 않는다.

---

# 115. 코드 색상 대비를 테마만 믿음

Shiki·Prism Theme가 유명하다고 모든 Token이 충분한 대비를 가지는 것은 아니다.

특히:

```text
Comment
Punctuation
Line Highlight
Diff Removed
Diff Added
```

를 실제 Light·Dark 배경에서 확인한다.

---

# 116. 선택 영역 스타일 부재 또는 저대비

사용자가 코드를 복사하거나 문장을 선택할 때 Selection 색이 텍스트를 가릴 수 있다.

Light·Dark 모두에서 `::selection` 대비를 확인한다.

---

# 117. Error·Success 색을 코드 Diff와 혼동

Callout의 초록·빨강과 Diff의 추가·삭제 색이 같은 강도로 사용되면 페이지가 지나치게 자극적이다.

큰 Surface에서는 채도를 낮추고, Text와 작은 Indicator에서 명확히 표현한다.

---

# 118. Mobile Safe Area 무시

전체 화면 Search·Menu에서 iPhone Safe Area 때문에 닫기 버튼이나 입력창이 가려질 수 있다.

```text
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

을 필요한 Full-screen Overlay에만 고려한다.

일반 페이지에 과도하게 적용하지 않는다.

---

# 119. Back-to-top 버튼 남용

긴 글에는 유용할 수 있지만 Sticky UI를 하나 더 추가한다.

TOC, Home Link, 브라우저 기본 기능으로 충분한지 먼저 본다.

추가한다면 충분히 스크롤한 뒤에만 나타나고, 본문·광고를 가리지 않게 한다.

---

# 120. CSS 개선 순서를 미적 취향으로 정함

우선순위는 다음이 낫다.

```text
1. 가독성
2. Overflow·Layout 안정성
3. 접근성
4. 반응형 정보 구조
5. 일관성
6. 장식
```

Gradient·Shadow보다 Code와 Table이 먼저다.

---

# 실제 구현 티켓

## VIS-01. CSS Responsibility Audit

```text
Global
Layout
Component
Prose
Utility
```

책임과 중복 규칙을 조사한다.

## VIS-02. Core Design Tokens 정리

```text
Text
Surface
Border
Accent
Spacing
Radius
Typography
```

만 우선 정의한다.

## VIS-03. Container System

```text
Site
Reading
Wide
```

세 가지 폭 규칙을 정리한다.

## VIS-04. Prose Vertical Rhythm

Heading·문단·목록·코드·표·Figure 간격을 일관화한다.

## VIS-05. Technical Overflow Audit

```text
긴 Identifier
Code
Table
Diagram
URL
```

의 모바일 Overflow를 검사한다.

## VIS-06. Heading·Anchor Offset

Sticky Header와 Deep Link 충돌을 제거한다.

## VIS-07. Card Role 분리

범용 Boolean Card를 역할 중심 컴포넌트로 정리한다.

## VIS-08. Badge·Status Density 감소

첫 화면 Metadata를 우선순위에 맞게 단순화한다.

## VIS-09. Dark Mode Surface Audit

본문·카드·코드·Callout·표의 대비와 계층을 확인한다.

## VIS-10. Responsive Navigation Audit

모바일 Header와 Menu에서 핵심 기능을 재정렬한다.

## VIS-11. Accessibility Interaction Audit

```text
Focus
Target size
Hover-only
Zoom
Reduced Motion
```

을 점검한다.

## VIS-12. Visual Canary 구성

실제 기술 콘텐츠 극단값을 포함한 대표 페이지를 고정한다.

---

# 권장 커밋 순서

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

# 완료 기준

이 태스크는 색상과 간격이 예뻐졌다고 완료되는 것이 아니다.

다음 상태여야 한다.

```text
긴 한글 제목과 영문 식별자가 Layout을 깨뜨리지 않는다.

일반 문단은 읽기 좋은 폭을 유지하면서 코드와 표는 충분한 공간을 쓴다.

모바일에서 페이지 전체가 가로 스크롤되지 않는다.

Header·TOC·Anchor 이동이 서로 충돌하지 않는다.

Card와 Metadata가 화면마다 다른 규칙으로 증식하지 않는다.

Light·Dark Mode에서 코드·표·Callout의 의미와 대비가 유지된다.

Keyboard Focus와 Touch Target이 명확하다.

200% Zoom과 실제 기술 콘텐츠 극단값에서도 핵심 정보가 사라지지 않는다.

시각적 장식보다 콘텐츠 계층과 읽기 흐름이 우선한다.
```

# 핵심 결론

기술 블로그의 CSS는 일반 마케팅 사이트보다 더 강한 콘텐츠 내구성이 필요하다.

```text
긴 텍스트
긴 코드
넓은 표
깊은 Heading
복잡한 Figure
```

가 들어와도 매번 예외를 추가하지 않고 견뎌야 한다.

따라서 좋은 시각 구조는:

```text
소수의 Container
일관된 Vertical Rhythm
제한된 Token
명확한 Prose 규칙
역할 중심 Component
콘텐츠 기반 Breakpoint
```

로 만들어진다.

디자인 시스템의 목적은 모든 화면을 똑같이 보이게 하는 것이 아니다.

> 새로운 글과 새로운 기술 형식이 추가돼도 레이아웃이 무너지지 않게 만드는 것이다.

## 73. assistant

# Task 3-26. 테스트 아키텍처·회귀 방지·품질 게이트 안티패턴

이번에는 앞에서 이미 다룬 콘텐츠 모델, CSS, 배포, 검색, 링크 검증은 반복하지 않고, **그 기능들이 나중에 다시 깨지지 않도록 테스트를 어떻게 구성할지**만 본다.

`hawk90.github.io`처럼 콘텐츠와 코드가 함께 커지는 사이트에서는 테스트 대상이 일반 애플리케이션과 다르다.

```text
TypeScript 로직
Astro 페이지
Markdown 변환
생성된 HTML
검색 데이터
브라우저 동작
실제 콘텐츠의 극단값
```

을 모두 다뤄야 한다.

핵심 목표는 테스트를 많이 만드는 것이 아니다.

> 오류가 발생한 계층과 가장 가까운 테스트에서 빠르고 명확하게 발견되도록 만드는 것이다.

---

## 1. 모든 검증을 E2E 테스트로 해결

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

# 2. 테스트 피라미드를 숫자로만 적용

일반적인 조언은 다음과 같다.

```text
Unit 많이
Integration 중간
E2E 적게
```

하지만 기술 콘텐츠 사이트에서는 단순 비율보다 **계약의 위치**가 중요하다.

예를 들어:

```text
Markdown Plugin이 Heading ID를 잘못 생성
```

하는 문제는 작은 Unit Test만으로 발견하기 어렵고, 브라우저까지 갈 필요도 없다.

실제 Markdown Fixture를 렌더링하는 Integration Test가 적합하다.

따라서 테스트 유형을 개수 목표로 운영하지 않는다.

```text
Unit 80%
E2E 10%
```

같은 숫자는 품질을 보장하지 않는다.

---

# 3. 소스 코드만 테스트하고 최종 HTML을 확인하지 않음

다음 코드가 정상이어도:

```ts
buildCanonicalUrl(document)
```

Astro Layout에서 잘못된 값을 전달하면 실제 HTML은 틀릴 수 있다.

따라서 중요한 페이지 계약은 최종 생성 HTML에서 확인해야 한다.

예:

```text
H1 정확히 하나
canonical 정확히 하나
robots metadata
Article main 영역
Heading anchor
내부 자산 경로
```

이는 브라우저 없이 HTML Parser로 빠르게 검사할 수 있다.

---

# 4. HTML을 정규식으로 테스트

나쁜 예:

```ts
expect(html).toMatch(
  /<meta name="description".*>/
);
```

HTML 속성 순서, 공백, 줄바꿈이 바뀌면 깨진다.

반대로 잘못된 위치의 문자열도 통과할 수 있다.

권장:

```text
HTML Parser
DOM Query
Semantic Selector
```

를 사용한다.

개념 예:

```ts
const document =
  parseHtml(generatedHtml);

const canonical =
  document.querySelector(
    'link[rel="canonical"]',
  );

expect(canonical).not.toBeNull();
```

---

# 5. 모든 실제 문서를 Unit Test Fixture로 사용

실제 콘텐츠 500개를 매 Unit Test에서 로드하면 테스트가 느리고 서로 영향을 준다.

```text
Publication Policy Test
→ 실제 Markdown 전체 로드

Relation Function Test
→ 실제 사이트 Manifest 생성
```

이 구조에서는 작은 함수 테스트도 전체 사이트 상태에 의존한다.

권장:

```text
작은 인공 Fixture
→ 함수와 규칙 테스트

실제 전체 콘텐츠
→ 별도의 Content Integration Test
```

---

# 6. Fixture가 현실과 지나치게 다름

반대로 Fixture가 너무 단순할 수도 있다.

```ts
{
  id: "a",
  title: "test"
}
```

만 사용하면 실제 문제를 놓친다.

실제 사이트에는 다음이 있다.

```text
한글 제목
C++
MSI-X
긴 Description
Historical 상태
빈 관계
여러 Heading
긴 Symbol
```

따라서 Fixture를 두 계층으로 나눈다.

## Minimal Fixture

특정 규칙만 확인.

## Representative Fixture

실제 기술 문서 형태를 재현.

---

# 7. 거대한 만능 Fixture Factory

다음 함수가 계속 커질 수 있다.

```ts
createDocumentFixture({
  id,
  slug,
  title,
  topic,
  type,
  status,
  draft,
  dates,
  relations,
  headings,
  links,
  environment,
  ...
})
```

모든 테스트가 같은 Factory의 기본값에 의존하면 Domain 모델 변경 시 수백 개 테스트가 함께 깨진다.

또 기본값이 테스트 의미를 숨긴다.

```ts
createDocumentFixture({
  status: "historical",
});
```

이 문서가 어떤 Topic과 날짜를 가졌는지 알기 어렵다.

### 권장

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

# 8. 테스트 데이터가 Production 모델을 그대로 복제

테스트 폴더에 별도 인터페이스를 만들어 Production 모델과 거의 동일한 구조를 유지할 수 있다.

```ts
interface TestContentDocument {
  ...
}
```

그러면 모델 변경 시 Production과 Test 모델이 따로 drift한다.

테스트는 실제 타입을 사용하고, 생성 Helper만 제공하는 편이 낫다.

---

# 9. Snapshot Test 남용

다음 전체를 Snapshot으로 저장할 수 있다.

```text
Content Manifest
Search Index
전체 Article HTML
Topic Hub HTML
```

처음에는 편하지만 작은 변경마다 수천 줄 Diff가 발생한다.

개발자는 내용을 확인하지 않고 Snapshot을 갱신하게 된다.

```text
실패
→ 무슨 차이인지 안 봄
→ update snapshot
```

### Snapshot이 적합한 것

```text
작고 안정적인 구조
정렬된 Policy Matrix
짧은 Structured Data
의도적으로 검토 가능한 출력
```

### 적합하지 않은 것

```text
전체 사이트 HTML
전체 검색 Index
500개 문서 Manifest
날짜와 Hash가 포함된 출력
```

---

# 10. Golden File과 Snapshot을 같은 방식으로 취급

Golden Query나 생성 XML처럼 사람이 의도적으로 검토하는 기준 파일은 가치가 있다.

하지만 자동 Snapshot 갱신과 다르다.

## Snapshot

테스트 도구가 자동 관리하는 출력 비교.

## Golden File

중요한 계약을 사람이 선택하고 검토한 기대 결과.

예:

```text
검색어: PCIe BAR
상위 결과: pcie-bar-sizing
```

Golden File은 자동으로 무조건 갱신하지 않는다.

---

# 11. 구현 세부사항을 테스트

예:

```ts
expect(
  internalMap.size
).toBe(5);
```

실제 계약이 아니라 현재 구현 방식을 고정한다.

Map을 배열이나 다른 Index로 바꾸면 기능이 동일해도 테스트가 실패한다.

권장:

```text
입력
→ 공개 함수 호출
→ 관찰 가능한 결과
```

를 테스트한다.

예:

```ts
expect(
  manifest.byId.get("pcie-bar")
).toEqual(document);
```

이것도 내부 구조 계약이 공개 API라면 괜찮지만, 함수 내부 임시 Map까지 검사하지 않는다.

---

# 12. Private 함수마다 Unit Test 작성

작은 Helper 하나하나를 직접 테스트하면 리팩터링 비용이 커진다.

```text
normalizeTokenInternal()
sortAliasInternal()
createTemporaryMap()
```

이 함수들은 공개 동작 테스트를 통해 간접적으로 검증할 수 있다.

직접 테스트할 가치가 있는 것은:

```text
복잡한 알고리즘
경계 조건이 많은 순수 함수
독립적인 공개 계약
```

이다.

---

# 13. 테스트가 코드 중복을 허용하지 않음

Production과 Test에 일부 유사 코드가 있다고 무조건 Helper로 추출하면 테스트 읽기가 어려워질 수 있다.

예:

```ts
const current =
  createDocumentFixture({
    id: "current",
    status: "current",
  });
```

정도는 반복돼도 테스트 의도가 명확하다.

테스트 코드는 완벽한 DRY보다 가독성이 우선일 수 있다.

---

# 14. 하나의 테스트에서 모든 상태를 검증

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

# 15. 반대로 Boolean 하나마다 테스트를 분리

다음처럼 지나치게 쪼갤 수 있다.

```text
Current renders
Current indexes
Current searchable
Current appears in sitemap
Current supports ads
```

정책 하나의 일관된 결과를 이해하기 어렵고 테스트 수만 늘어난다.

권장 단위:

```text
하나의 상태가 주요 공개 계약을 어떻게 결정하는가
```

를 한 Case 안에서 명확히 검사한다.

---

# 16. 테스트 이름이 구현 이름만 반복

약한 이름:

```text
test getPublicationDecision
test manifest
test search
```

좋은 이름:

```text
superseded 문서는 직접 접근은 가능하지만
검색과 Sitemap에서는 제외한다
```

테스트 이름만 읽어도 정책 문서 역할을 하게 한다.

---

# 17. 실패 메시지가 의미 없음

예:

```text
Expected true, received false
```

만 나오면 어떤 문서와 규칙이 문제인지 알기 어렵다.

콘텐츠 검증 테스트에서는 다음을 포함한다.

```text
문서 ID
Source Path
규칙 ID
실제 상태
기대 정책
```

단, 각 테스트에 장문의 수동 오류 메시지를 반복하기보다 Validator 자체가 좋은 Issue를 반환하도록 한다.

---

# 18. Validation에서 첫 오류만 반환

500개 문서 중 첫 오류 하나에서 테스트가 중단되면 수정 반복이 느려진다.

```text
수정
→ 재실행
→ 다음 오류
→ 수정
```

콘텐츠 전체 검증에서는 모든 Issue를 수집하고 한 번에 출력한다.

반면 순수 함수 Unit Test는 첫 Assertion 실패로 끝나도 괜찮다.

---

# 19. Warning이 테스트 결과에 묻힘

CI는 통과하지만 Warning 300개가 로그 중간에 묻힐 수 있다.

결국 Warning은 무시된다.

권장:

```text
Error
→ Test 실패

Warning
→ 요약 Report
→ 신규 Warning 증가 시 검사
```

기존 부채가 많다면 전체 Warning 수를 0으로 만들기 전까지 Baseline을 둘 수 있다.

```text
현재 137개
→ 138개가 되면 실패
→ 136개는 통과
```

하지만 이 Baseline이 영구 면죄부가 되지 않게 감소 계획을 둔다.

---

# 20. 경고 개수만 비교

Warning 1개가 사라지고 다른 위험한 Warning 1개가 생겨도 총 개수는 같다.

가능하면 Rule ID와 Document ID 기준으로 Baseline을 관리한다.

```text
content/missing-description: old-post-1
content/unclassified-topic: old-post-2
```

새로운 조합이 추가되면 감지한다.

---

# 21. 테스트에서 현재 날짜 직접 사용

```ts
const now = new Date();
```

를 사용하면 자정, Timezone, 시간이 흐름에 따라 테스트가 깨질 수 있다.

특히:

```text
미래 발행
Freshness
Copyright
검토 기한
```

에 영향이 크다.

시간은 명시적으로 주입한다.

```ts
const context = {
  now: new Date(
    "2026-08-01T00:00:00Z",
  ),
};
```

---

# 22. 테스트 Timezone이 로컬 환경에 의존

macOS에서는 통과하지만 CI UTC에서 날짜가 하루 바뀔 수 있다.

다음 중 하나를 선택한다.

```text
날짜 전용 모델은 YYYY-MM-DD 문자열
명시적 UTC 처리
테스트 환경 TZ 고정
```

표시용 한국 시간 변환은 별도 테스트에서 검증한다.

---

# 23. 랜덤 데이터 사용

Property-based Test 외에 일반 테스트에서 무작위 ID·날짜를 사용하면 실패 재현이 어렵다.

```ts
Math.random()
crypto.randomUUID()
```

를 Fixture 기본값에 넣지 않는다.

필요하면 고정 Seed를 사용한다.

---

# 24. Property-based Test를 유행처럼 도입

URL 정규화, 관계 Cycle, Query 정렬 같은 영역에는 유용할 수 있다.

하지만 Article Page와 Editorial 규칙 전체를 무작위 데이터로 검증하려 하면 의미 있는 실패 사례를 이해하기 어렵다.

적합한 대상:

```text
정규화 함수의 Idempotency
URL 조합
정렬의 안정성
Cycle Detection
중복 제거
```

---

# 25. Idempotency를 테스트하지 않음

콘텐츠 변환 도구와 Migration Script는 같은 입력에 반복 실행해도 결과가 바뀌지 않아야 한다.

```text
첫 실행
→ Metadata 정규화

두 번째 실행
→ 변경 없음
```

테스트:

```ts
const once = migrate(source);
const twice = migrate(once);

expect(twice).toBe(once);
```

문자열 Formatting 차이까지 포함해 확인한다.

---

# 26. 정렬 Tie-breaker 테스트 부재

날짜가 같은 문서가 여러 개면 환경이나 Map 삽입 순서에 따라 순위가 달라질 수 있다.

테스트 데이터에 같은 날짜를 의도적으로 넣는다.

```text
updated 동일
title 동일 가능
ID 다름
```

최종 Tie-breaker까지 안정적인지 검사한다.

---

# 27. Unicode·기호 경계값이 없음

다음 입력은 반드시 테스트한다.

```text
C++
C#
MSI-X
H.264
CXL.io
std::vector
한글 제목
한글 + 영문
NFC·NFD Unicode
```

단순 영문 `hello world`만으로 검색·Slug·Anchor를 테스트하면 실제 사이트 문제를 놓친다.

---

# 28. 빈 문자열과 공백 입력 미검사

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

# 29. 정상 경로만 테스트

예를 들어 Manifest 생성이 성공하는지만 검사하고 다음을 놓칠 수 있다.

```text
중복 ID
중복 URL
없는 관계
자기 참조
잘못된 Topic
Superseded Cycle
```

Validator 테스트는 Error Case가 핵심이다.

각 Rule에 최소 하나의 실패 Fixture가 있어야 한다.

---

# 30. 오류가 난다는 사실만 테스트

```ts
expect(() =>
  createManifest(documents)
).toThrow();
```

만 검사하면 엉뚱한 오류로 실패해도 통과한다.

최소한 Rule ID나 핵심 메시지를 검사한다.

```ts
expect(error.issues).toContainEqual(
  expect.objectContaining({
    ruleId: "content/duplicate-id",
  }),
);
```

---

# 31. 에러 메시지 전체 문자열 고정

반대로 전체 Multi-line 문자열을 완전히 비교하면 문구 개선만으로 테스트가 깨진다.

구조화된 Issue를 검사하고, Formatter는 작은 별도 Golden Test로 두는 편이 낫다.

---

# 32. Search 테스트가 결과 존재만 확인

```ts
expect(results.length)
  .toBeGreaterThan(0);
```

는 검색 품질을 보장하지 않는다.

중요한 것은:

```text
대표 문서가 상위에 있는가
구판이 앞서지 않는가
Symbol 검색이 정확한가
한글 Alias가 연결되는가
```

이다.

Golden Query 테스트는 Top-N과 제외 문서를 확인한다.

---

# 33. 검색 순위를 정확한 숫자로 고정

```ts
expect(score)
  .toBe(17.4291);
```

검색 라이브러리 업데이트나 작은 가중치 조정마다 깨진다.

계약은 상대 순위로 테스트한다.

```text
대표 문서가 Historical보다 위
제목 일치가 본문 일치보다 위
정확한 Symbol 결과가 Top 3
```

---

# 34. 검색 라이브러리 자체를 테스트

MiniSearch나 Fuse의 기본 동작을 다시 검증할 필요는 없다.

테스트할 것은 사이트가 구성한 다음 부분이다.

```text
SearchDocument 필드
가중치
Alias
Publication Filter
Result Mapping
```

외부 라이브러리 내부 Fuzzy 알고리즘을 복제해 테스트하지 않는다.

---

# 35. Markdown Parser 라이브러리를 다시 테스트

GFM 표가 기본적으로 렌더되는지 라이브러리 수준까지 검사하기보다, 현재 설정에서 필요한 대표 Markdown Fixture가 올바른 HTML을 만드는지 확인한다.

즉:

```text
라이브러리 기능
```

이 아니라:

```text
현재 Pipeline 계약
```

을 테스트한다.

---

# 36. Markdown Fixture가 한 파일뿐

하나의 거대한 Fixture에 다음을 모두 넣으면 실패 원인을 찾기 어렵다.

```text
표
코드
Callout
Footnote
Raw HTML
이미지
Anchor
```

권장:

```text
markdown/code-block.md
markdown/table.md
markdown/headings.md
markdown/callout.md
markdown/legacy-html.md
```

작은 기능 Fixture와 복합 Canary Fixture를 함께 둔다.

---

# 37. 실제 Legacy 문법을 테스트하지 않음

새 문법만 테스트하면 기존 500개 글이 Renderer 업데이트에서 깨질 수 있다.

대표 Legacy 패턴을 Fixture로 보존한다.

```text
기존 Raw HTML
옛 Code Fence 언어명
과거 Image Path
오래된 Front Matter
```

Legacy 지원을 제거할 때 해당 Fixture와 테스트도 함께 삭제한다.

---

# 38. Fixture가 Production 콘텐츠와 자동 동기화

실제 글 하나를 Fixture로 직접 참조하면 글을 편집할 때 테스트 의미도 바뀐다.

Canary 문서가 필요하다면:

```text
Production 글을 읽는 Smoke Test
```

와:

```text
고정 테스트 Fixture
```

를 구분한다.

고정 Fixture는 특정 문제를 재현하는 최소 입력으로 유지한다.

---

# 39. 회귀 버그를 테스트로 남기지 않음

과거에 발생한 문제:

```text
C++ 검색 불가
Anchor가 Header에 가림
대문자 이미지 경로 CI 실패
Draft 페이지 생성
```

를 수정했다면 작은 회귀 테스트를 추가한다.

버그 수정 Commit에 테스트가 없으면 같은 종류의 문제가 돌아올 가능성이 높다.

---

# 40. 모든 버그에 E2E 회귀 테스트 추가

반대로 문제와 가장 가까운 계층을 선택해야 한다.

예:

```text
C++ 검색 정규화 문제
→ Query Normalizer Unit Test

Draft HTML 생성 문제
→ Dist Artifact Test

모바일 Search Focus 문제
→ Browser Test
```

---

# 41. Browser Test가 CSS Selector 구조에 결합

나쁜 예:

```ts
page.locator(
  ".header > div:nth-child(2) > button"
);
```

DOM 구조를 조금만 바꿔도 깨진다.

권장 Selector:

```text
Role
Accessible Name
Label
Stable Test ID가 정말 필요한 곳
```

예:

```ts
page.getByRole(
  "button",
  { name: "검색" },
);
```

접근 가능한 Selector를 사용하면 Accessibility 검증도 함께 된다.

---

# 42. 모든 요소에 `data-testid` 추가

Role과 Text로 찾을 수 있는데도 Test ID를 붙이면 테스트가 사용자 경험과 분리된다.

`data-testid`는 다음 상황에 제한한다.

```text
시각적으로 동일한 반복 요소
텍스트가 번역될 수 있음
실제 접근 가능한 이름이 없는 비표시 구조
```

접근 가능한 이름이 없는 버튼을 Test ID로 해결하지 말고 버튼 자체를 먼저 고친다.

---

# 43. Browser Test에서 고정 시간 대기

```ts
await page.waitForTimeout(3000);
```

는 느리고 불안정하다.

다음을 기다린다.

```text
Dialog visible
Search result count
Network response
Loading 상태 종료
```

---

# 44. 검색 타이핑마다 네트워크를 기대

Search Index가 캐시되거나 Inline될 수 있는데 테스트가 특정 요청 횟수에 의존하면 구현 변경을 어렵게 한다.

사용자 계약:

```text
검색 Dialog 열림
검색어 입력
올바른 결과 표시
```

를 중심으로 테스트한다.

별도 Performance Test에서만 인덱스 지연 로딩 여부를 확인한다.

---

# 45. Browser Test 간 상태 공유

첫 테스트가 Search Index를 Cache하고 두 번째 테스트가 그 상태를 이용하면 순서에 따라 결과가 달라진다.

각 테스트는 독립적인 Browser Context를 사용한다.

Local Storage·Theme·Service Worker 상태도 명시적으로 초기화한다.

---

# 46. 테스트가 Production Analytics를 호출

브라우저 테스트가 실제 GA, Giscus, 광고를 로드하면:

```text
데이터 오염
외부 장애
느린 실행
개인정보 요청
```

이 생긴다.

테스트 환경에서는 외부 Integration을 비활성화하거나 Mock한다.

중요한 것은 Integration이 없어도 Layout이 정상인지다.

---

# 47. Mock이 실제 계약과 너무 다름

외부 댓글 Mock이 빈 `<div>` 하나만 반환하면 실제 iframe의 크기와 지연 로딩 문제를 놓친다.

필요한 경우:

```text
성공
지연
실패
큰 콘텐츠
```

상태를 재현하는 작은 Mock을 사용한다.

---

# 48. 네트워크 실패 테스트 부재

Search Index, 댓글, Embed가 실패하는 상태를 최소한 한 번은 검증한다.

사용자는 다음을 봐야 한다.

```text
무한 Spinner가 아님
오류 메시지
재시도 또는 대체 경로
본문은 정상
```

---

# 49. JavaScript 비활성 테스트 없음

Astro 정적 사이트의 핵심 장점은 JavaScript 없이도 콘텐츠를 읽고 탐색할 수 있다는 것이다.

최소 Smoke Test:

```text
JavaScript 비활성
→ 홈 콘텐츠 표시
→ Topic 링크 이동
→ Article 본문 표시
→ Breadcrumb 이동
```

검색 Dialog·댓글 등만 사용할 수 없어도 된다.

---

# 50. 브라우저 하나만 테스트

모든 Browser Matrix를 돌릴 필요는 없지만, Chromium 하나만으로는 다음을 놓칠 수 있다.

```text
Safari의 dialog·viewport
Firefox의 CSS·focus
WebKit의 모바일 스크롤
```

권장:

## 매 변경

```text
Chromium 핵심 Smoke
```

## 주요 Layout·검색 변경

```text
Chromium + WebKit
```

## 정기 또는 Release 전

```text
Firefox 포함
```

실제 CI 비용에 맞춰 조정한다.

---

# 51. Viewport를 `desktop`, `mobile` 두 개만 사용

기술 문서의 문제는 중간 폭에서 자주 발생한다.

```text
TOC가 들어가기에는 좁음
모바일 Menu로 바뀌기에는 넓음
카드 3열이 깨짐
```

대표 Viewport:

```text
좁은 모바일
넓은 모바일
작은 노트북
넓은 데스크톱
```

중 실제 Breakpoint 경계 하나를 반드시 포함한다.

---

# 52. 반응형 테스트가 Screenshot만 비교

Screenshot은 시각 변화는 찾지만 다음 계약을 정확히 검증하지 못할 수 있다.

```text
페이지 전체 가로 Overflow
Focus 가능 여부
Heading이 Header 뒤에 숨음
Click target
```

DOM·Layout Assertion을 일부 추가한다.

예:

```ts
const hasHorizontalOverflow =
  await page.evaluate(
    () =>
      document.documentElement
        .scrollWidth >
      document.documentElement
        .clientWidth,
  );

expect(hasHorizontalOverflow)
  .toBe(false);
```

---

# 53. 모든 페이지에 “가로 Overflow 없음” 강제

코드 블록이나 표 내부에는 의도적인 가로 스크롤이 있을 수 있다.

검증 대상은:

```text
문서 전체 Root
```

이다.

내부 Code·Table Wrapper는 Overflow가 허용된다.

테스트가 의도적 스크롤까지 오류로 잡지 않게 한다.

---

# 54. Visual Snapshot 범위가 너무 큼

전체 페이지 Full-page Screenshot은 긴 Article에서 작은 내용 변경에도 거대한 Diff를 만든다.

선택:

```text
Header 영역
대표 Code Block
표
Status Notice
Search Dialog
```

처럼 위험 영역을 부분 Capture한다.

전체 페이지 Snapshot은 핵심 Canary에 제한한다.

---

# 55. Visual Snapshot 허용 오차를 크게 설정

Diff를 줄이려고 Threshold를 높이면 실제 작은 Layout 회귀도 놓친다.

먼저 변동 원인을 제거한다.

```text
Font
Animation
현재 날짜
외부 iframe
Scrollbar
```

그 후 낮은 허용 오차를 사용한다.

---

# 56. Font가 CI에서 다름

로컬과 CI Font가 다르면 줄바꿈과 Screenshot이 달라진다.

Visual Test 환경에서는:

```text
사용 Font 명시
Font 로드 완료 대기
Fallback 차이 최소화
```

가 필요하다.

사용자에게 Font 파일을 공유할 필요는 없지만 테스트 컨테이너 안에서 일관된 자산을 사용한다.

---

# 57. 접근성 테스트를 자동 도구 하나에 맡김

Axe 같은 도구는 유용하지만 다음을 완전히 판단하지 못한다.

```text
Heading 내용이 논리적인가
링크 문구가 유용한가
Focus 순서가 자연스러운가
Dialog 복귀가 적절한가
Alt가 실제 이미지를 설명하는가
```

자동 검사와 수동 키보드 검토를 함께 사용한다.

---

# 58. 접근성 오류를 전부 무시 처리

Legacy 페이지에 오류가 많다고 Rule 전체를 비활성화하면 새 페이지에서도 같은 문제가 생긴다.

가능하면:

```text
특정 Legacy Fixture
특정 Known Issue
```

에만 제한적인 예외를 둔다.

신규·대표 페이지에는 엄격한 기준을 적용한다.

---

# 59. 성능 테스트를 Lighthouse 점수 하나로 판단

Lighthouse 100을 목표로 하면 실제 사용성과 무관한 미세 최적화에 빠질 수 있다.

성능 계약을 직접 정의한다.

```text
검색을 열기 전 Index 미요청
Article에서 불필요한 Hydration 없음
LCP 후보 이미지 크기 지정
전체 페이지 JS 예산
CLS 제한
```

점수는 참고 지표다.

---

# 60. 성능 테스트가 매 CI에서 너무 불안정

공유 CI 환경의 시간 측정은 변동이 크다.

다음은 안정적으로 검사할 수 있다.

```text
파일 크기
요청 수
Script 포함 여부
HTML 노드 수
Search Index 압축 크기
```

실제 시간 기반 측정은 정기 Benchmark나 전용 환경에서 수행한다.

---

# 61. Bundle Size가 작아졌는지만 검사

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

# 62. HTML 크기 회귀 무시

코드 Highlight Token, Structured Data, 직렬화된 Props 때문에 HTML이 커질 수 있다.

대표 문서 HTML 크기를 Baseline으로 관리한다.

특히:

```text
코드가 많은 Source Walkthrough
표가 많은 Reference
```

를 따로 본다.

---

# 63. Threshold를 절대값 하나로만 설정

모든 문서가 같은 크기일 수 없다.

권장:

```text
페이지 유형별 절대 상한
+
Baseline 대비 증가율 경고
```

예:

```text
Article JS 50KB 이하
대표 HTML +20% 증가 시 경고
```

정확한 숫자는 현재 측정 후 정한다.

---

# 64. 테스트 Coverage 수치를 목표로 삼음

라인 Coverage 90%를 채우기 위해 중요하지 않은 Getter와 Mapping을 테스트할 수 있다.

반대로 Markdown Plugin·배포 Artifact 같은 중요한 영역은 코드 Coverage에 잘 나타나지 않는다.

중요한 것은:

```text
핵심 불변조건이 테스트됐는가
과거 회귀가 재발하지 않는가
실제 사용자 경로가 보호되는가
```

이다.

Coverage는 미검사 영역을 찾는 보조 도구다.

---

# 65. Branch Coverage를 무조건 끌어올림

Publication Policy 같은 분기 로직에는 의미가 있다.

하지만 단순 UI Label Mapping까지 모든 Default 분기를 테스트하는 것은 가치가 낮을 수 있다.

위험 기반으로 적용한다.

---

# 66. Mutation Test를 전 프로젝트에 적용

Mutation Testing은 Policy·Validator처럼 작은 순수 Domain에 유용할 수 있다.

하지만 Astro Build와 Browser Test 전체에 적용하면 비용이 과도하다.

후보:

```text
Publication Policy
URL 정규화
Cycle Detection
Search Ranking 핵심 규칙
```

정도로 제한한다.

---

# 67. 테스트 실행 명령이 너무 많음

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

# 68. 로컬과 CI 명령이 다름

로컬:

```text
npm test
```

CI:

```text
npx vitest run ...
node scripts/check...
astro check...
```

로직이 YAML에 직접 들어가면 로컬 재현이 어렵다.

CI는 저장소 명령만 호출한다.

---

# 69. 빠른 검증과 전체 검증 구분 없음

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

# 70. 변경 영향 기반 테스트를 과도하게 신뢰

Markdown 하나만 바뀌었다고 해당 페이지 테스트만 실행하면 다음 영향을 놓칠 수 있다.

```text
Home Featured
Topic Hub
Search Index
RSS
Sitemap
Related Graph
```

변경 파일 기반 최적화를 하더라도 전체 Manifest 불변조건과 주요 파생 Artifact는 검사해야 한다.

---

# 71. 반대로 매 변경에 모든 Visual Test 실행

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

# 72. Test Sharding을 너무 일찍 도입

현재 Browser Test가 몇 분 수준인데 Shard·Merge Report·병렬 Worker를 복잡하게 구성할 필요는 없다.

실제 CI 병목을 측정한 뒤 도입한다.

---

# 73. 병렬 테스트가 공유 파일을 수정

다음 테스트가 같은 디렉터리를 사용하면 충돌할 수 있다.

```text
Migration Script Test
Search Index Generation Test
OG Generation Test
```

각 테스트는 고유한 임시 디렉터리를 사용한다.

Production `.generated/`를 테스트가 직접 수정하지 않는다.

---

# 74. 테스트가 저장소 파일을 실수로 수정

Formatter·Migration·Publish Script 테스트는 실제 콘텐츠 파일을 대상으로 실행하면 안 된다.

Fixture를 임시 작업 디렉터리로 복사한 뒤 수행한다.

테스트 종료 후 변경된 Git 상태가 없는지도 CI에서 확인할 수 있다.

```text
git diff --exit-code
```

단, 의도적으로 생성 파일을 추적하는 Workflow와 충돌하지 않게 한다.

---

# 75. 임시 파일 정리 실패

테스트 실패 후 임시 디렉터리가 남으면 다음 테스트에 영향을 줄 수 있다.

OS Temporary Directory와 Test Framework Lifecycle을 사용한다.

실패 분석을 위해 보존할 필요가 있다면 CI Artifact로 업로드하고 작업 디렉터리는 정리한다.

---

# 76. 테스트용 Secret 사용

공개 사이트 테스트에 실제 Analytics·GitHub Token을 사용할 이유가 거의 없다.

필요한 API가 있다면 최소 권한의 전용 Test Credential을 사용한다.

가능하면 외부 API 자체를 Mock하거나 Build 입력으로 고정한다.

---

# 77. Fork PR에서 Secret 의존 테스트

외부 기여나 Dependabot PR에서는 Secret이 제공되지 않을 수 있다.

Core Build와 Test가 Secret 없이 동작해야 한다.

Secret이 필요한 선택적 검사는 별도 조건으로 격리한다.

---

# 78. 테스트 결과 Report가 너무 많음

JUnit, HTML, JSON, Coverage, Trace, Screenshot, Video를 항상 업로드하면 CI Artifact가 커진다.

권장:

```text
성공
→ 최소 요약

실패
→ Trace·Screenshot·관련 Report
```

Visual Baseline은 저장소 정책에 맞게 관리한다.

---

# 79. Browser Video를 모든 성공 테스트에 저장

저장 공간과 업로드 시간이 커진다.

Video·Trace는:

```text
retain-on-failure
```

정도로 운영하는 편이 적절하다.

---

# 80. 실패 Screenshot에 민감 정보 포함

공개 저장소의 CI Artifact에도 화면 내용이 남을 수 있다.

Test Fixture는 민감 정보가 없어야 하며, 실제 Production 페이지를 촬영할 때 공개 가능한 내용만 포함되는지 확인한다.

---

# 81. 테스트 실패를 자동 재실행해 숨김

모든 실패를 3회 Retry한 뒤 하나라도 통과하면 성공으로 처리하면 Flaky Test가 영구화된다.

Retry를 사용해도 첫 실패를 Report에 남기고 Flaky 빈도를 추적한다.

동일 테스트가 반복 Flaky하면 격리하거나 원인을 수정한다.

---

# 82. Flaky Test를 무기한 Skip

```ts
test.skip("search dialog");
```

가 장기간 남을 수 있다.

Skip에는 이유와 제거 조건을 남긴다.

```text
Issue
만료 시점
대체 검증
```

단순 TODO 주석만 남기지 않는다.

---

# 83. 테스트 순서에 의존

전체 Suite에서는 통과하지만 단독 실행에서 실패한다면 상태 공유 가능성이 높다.

다음을 점검한다.

```text
Global Cache
Manifest Singleton
Environment Variable
Local Storage
Mock 복구
Temporary File
```

각 테스트 후 상태를 초기화한다.

---

# 84. Manifest Cache Reset 누락

테스트 A에서 만든 Manifest가 테스트 B에 남을 수 있다.

Production Cache API가 있다면 테스트 전후 Reset을 제공한다.

더 좋은 방법은 순수 Manifest 생성 함수를 직접 테스트하고, Cache Wrapper 테스트는 소수로 제한하는 것이다.

---

# 85. Environment Variable 복구 누락

테스트에서:

```ts
process.env.NODE_ENV = "production";
```

을 바꾸고 복구하지 않으면 이후 테스트가 달라진다.

Framework의 Environment Stub 기능을 사용하거나 `afterEach`에서 복구한다.

---

# 86. Global Mock 남용

`Date`, `fetch`, File System 전체를 Global Mock하면 다른 테스트의 실제 동작을 가린다.

Dependency를 함수 인자로 주입하거나 작은 Adapter 경계에서 Mock한다.

---

# 87. File System 전체 Mock

콘텐츠 도구는 실제 Path, Case Sensitivity, Encoding 문제를 다뤄야 한다.

모든 File System을 Memory Mock으로 대체하면 실제 문제를 놓친다.

작은 임시 디렉터리를 사용하는 Integration Test가 더 가치 있을 수 있다.

---

# 88. 배포 Workflow를 테스트하지 않음

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

# 89. `package.json` Script가 실제로 동작하는지 미검증

문서에는:

```text
npm run content:check
```

가 있지만 Script 이름이 바뀌거나 깨질 수 있다.

CI에서 공개된 핵심 명령을 직접 실행한다.

README 예제까지 전부 자동 실행할 필요는 없지만 사용자-facing 명령은 보호한다.

---

# 90. 404·RSS·Sitemap만 별도 취급하지 않음

페이지가 아닌 Artifact도 테스트 대상이다.

## 404

```text
필수 탐색 링크
외부 Script 최소
Base Path
```

## RSS

```text
XML 유효
날짜
대표 항목
Draft 제외
```

## Sitemap

```text
XML 유효
Canonical과 일치
noindex 제외
```

---

# 91. Structured Data JSON-LD를 문자열 포함으로만 검사

JSON-LD를 Parse해 Schema의 필수 필드와 실제 표시 값의 일치를 검사한다.

```text
headline = H1
datePublished = metadata
canonical = mainEntityOfPage
```

검색엔진 Rich Result를 보장하지는 않지만 명백한 불일치는 막을 수 있다.

---

# 92. SEO 테스트가 모든 문구를 고정

Title 문구 전체를 정확히 고정하면 Editorial 개선이 어려워진다.

중요 계약:

```text
빈 Title 아님
Site Name 중복 없음
Canonical Origin 정상
Description 존재
```

을 검사하고, 대표 페이지 몇 개만 Golden SEO 값을 둘 수 있다.

---

# 93. 콘텐츠 진실성을 자동 테스트하려 함

테스트가 다음을 자동으로 보장할 수는 없다.

```text
기술 설명이 사실인가
실험 해석이 타당한가
가설이 올바른가
```

자동화는 다음을 도울 수 있다.

```text
환경 정보 존재
근거 링크 존재
가설 Callout 사용
코드 컴파일
숫자 형식
```

최종 기술 검토는 사람이 해야 한다.

---

# 94. 문서 길이를 품질 테스트로 사용

```text
1,000단어 미만이면 실패
Heading 5개 미만이면 실패
```

같은 규칙은 억지로 내용을 늘리게 한다.

짧은 Reference나 정확한 Debug Note는 가치가 높을 수 있다.

길이는 Review 후보 신호일 수 있지만 품질 Gate가 되어서는 안 된다.

---

# 95. 이미지 개수를 품질 Gate로 사용

```text
모든 대표 글은 이미지 1개 이상
```

을 강제하면 의미 없는 장식 그림이 생길 수 있다.

다이어그램이 실제 이해에 필요한 문서만 Editorial Review에서 판단한다.

자동 테스트는 이미지가 존재할 때 경로와 Alt를 검사하는 정도가 적절하다.

---

# 96. 테스트 자체의 유지비를 측정하지 않음

다음 신호가 나타나면 테스트 구조를 정리해야 한다.

```text
사소한 UI 변경에 수십 개 실패
실패 원인 파악에 오래 걸림
Snapshot을 습관적으로 갱신
Flaky Retry 증가
전체 Suite가 지나치게 느림
```

테스트는 안전망이어야지 변경을 막는 두 번째 애플리케이션이 되어서는 안 된다.

---

# 97. Test 삭제를 금기시

기능이 제거되거나 계약이 바뀌면 오래된 테스트도 삭제해야 한다.

```text
Legacy Search 제거
→ Legacy Search Test 삭제

Admin Route 제거
→ Admin Browser Test 삭제
```

사용되지 않는 기능을 테스트만 유지해 되살리지 않는다.

---

# 98. 테스트 실패 우선순위가 없음

CI에서 50개 실패가 동시에 나오면 핵심 원인이 하나일 수 있다.

권장 실행 순서:

```text
Type·Schema
→ Domain
→ Content Validation
→ Build
→ HTML
→ Browser
→ Visual
```

초기 단계가 실패하면 뒤의 비싼 테스트를 실행하지 않아도 된다.

---

# 99. 핵심 테스트 스위트 제안

## ① Domain Unit

```text
Publication Policy
정규화
URL
관계 Cycle
정렬
```

## ② Content Integration

```text
실제 전체 Manifest
중복
관계
대표 문서 Gate
```

## ③ Markdown Pipeline

```text
코드
표
Heading
Legacy HTML
Callout
```

## ④ Artifact Contract

```text
HTML
RSS
Sitemap
Search Index
404
```

## ⑤ Browser Smoke

```text
Home
Topic
Article
Search
Mobile Navigation
JavaScript 비활성
```

## ⑥ Visual Canary

```text
긴 Article
Code
Table
Historical
Search Dialog
```

---

# 100. 추천 디렉터리

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

# 101. 최소 필수 테스트

처음부터 거대한 Suite를 만들지 않는다.

## Unit

```text
상태별 Publication Policy
중복 ID
없는 관계
정렬 안정성
기술 검색어 정규화
```

## Integration

```text
실제 전체 콘텐츠 Build
대표 HTML의 H1·Canonical
검색 Golden Query
Sitemap과 실제 HTML 일치
Draft Artifact 없음
```

## Browser

```text
홈 → Topic → Article
검색 → 대표 문서
모바일 메뉴
JavaScript 없이 Article 읽기
```

이 정도부터 시작하면 된다.

---

# 102. 구현 티켓

## TST-01. 테스트 계층 분리

Unit·Content·Artifact·Browser의 책임을 명확히 한다.

## TST-02. 실제 기술 문자열 Fixture

```text
C++
MSI-X
std::vector
한글 제목
긴 식별자
```

를 추가한다.

## TST-03. Domain Policy Matrix

상태별 핵심 계약을 검증한다.

## TST-04. Invalid Content Fixture

```text
중복 ID
잘못된 Topic
없는 Relation
Cycle
```

을 고정한다.

## TST-05. Markdown Pipeline Fixture

Code·Table·Heading·Legacy 문법을 검증한다.

## TST-06. Generated HTML Contract

H1·Canonical·Robots·Main 구조를 검사한다.

## TST-07. Golden Search Queries

대표 검색어의 Top-N 회귀를 막는다.

## TST-08. Dist Artifact Test

Draft·Admin·민감 경로가 없는지 검사한다.

## TST-09. Browser Core Flow

Home·Hub·Article·Search를 접근 가능한 Selector로 검증한다.

## TST-10. JavaScript Disabled Smoke

핵심 정적 탐색을 보호한다.

## TST-11. Visual Canary 축소

전체 페이지가 아니라 위험 영역 중심으로 관리한다.

## TST-12. Warning Baseline

기존 Warning은 추적하되 신규 부채 증가를 차단한다.

---

# 103. 권장 커밋 순서

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

# 완료 기준

이 태스크는 테스트 개수나 Coverage가 늘었다고 완료되는 것이 아니다.

다음 상태가 되어야 한다.

```text
중복 ID 같은 데이터 오류는 브라우저 테스트 전에 발견된다.

Markdown Renderer 변경이 기존 코드·표·Anchor를 깨뜨리면 감지된다.

실제 생성 HTML의 Canonical과 H1 계약을 검사한다.

검색 결과가 존재하는지만 아니라 대표 문서 순위를 보호한다.

C++, MSI-X, 한글 같은 실제 기술 문자열이 테스트된다.

Draft와 내부 도구가 배포 Artifact에 들어가면 실패한다.

JavaScript 없이도 핵심 콘텐츠 탐색이 가능함을 확인한다.

Visual Test는 작은 문구 변경이 아니라 실제 Layout 회귀에 집중한다.

테스트 실패가 어떤 계층과 규칙의 문제인지 빠르게 알 수 있다.

전체 Suite가 느려져도 빠른 Local Check는 유지된다.
```

# 핵심 결론

`hawk90.github.io`에서 좋은 테스트 구조는 모든 것을 브라우저로 검증하거나 모든 출력을 Snapshot으로 저장하는 것이 아니다.

```text
Domain 규칙
→ 작은 빠른 테스트

실제 콘텐츠 집합
→ Manifest 검증

Markdown과 생성 파일
→ Integration 계약

사용자 핵심 흐름
→ 소수의 Browser Test

시각적 위험 영역
→ 선별된 Canary
```

이렇게 오류를 가장 가까운 계층에서 잡아야 한다.

> 테스트의 목적은 리팩터링을 막는 것이 아니라, 콘텐츠와 UI를 자유롭게 바꾸면서도 사이트의 핵심 계약은 깨지지 않는다는 확신을 주는 것이다.

## 74. assistant

이번에는 앞선 구조·테스트와 겹치지 않고, 처음 문제였던 **AdSense의 ‘콘텐츠 없음/가치 낮음’과 검색 색인 품질**만 따로 보겠다. 공식 Google 기준과 실제 페이지 구조를 연결해 안티패턴으로 정리한다.

## 75. assistant

# Task 3-27. AdSense ‘콘텐츠 없음·가치 낮음’과 검색 색인 품질 안티패턴

이번에는 기능이나 아키텍처를 추가하는 이야기가 아니다.

`hawk90.github.io`의 직접적인 문제였던 다음 평가를 다룬다.

```text
Valuable inventory:
No content

또는

Low-value content
Insufficient content
```

여기서 가장 먼저 버려야 할 생각은 다음이다.

```text
글이 500개다
→ 콘텐츠가 충분하다
→ AdSense가 잘못 판단했다
```

Google은 페이지 수만 보는 것이 아니다.

공식 안내에서는 AdSense 승인 문제의 대표 원인으로 **콘텐츠 부족, 콘텐츠 품질, 사이트 탐색 문제** 등을 들고 있으며, 광고가 표시되는 화면에는 게시자 콘텐츠가 존재하고 사용자에게 가치가 있어야 한다고 설명한다. Google Search 역시 검색엔진을 위해 만든 대량 콘텐츠보다 사람에게 만족스러운 경험을 제공하는 독창적이고 신뢰할 수 있는 콘텐츠를 강조한다. citeturn517910search1turn517910search3turn517910search4

핵심은 다음이다.

> 저장소에 글이 얼마나 많은지가 아니라, Google과 방문자가 실제로 접근하는 URL들이 각각 독립적인 콘텐츠 페이지로 보이는지가 중요하다.

---

# 1. 가장 큰 안티패턴: 사이트 전체 평균으로 생각하기

작성자는 사이트를 다음처럼 본다.

```text
기술 글 500개
긴 글 다수
코드와 실험 포함
10년 이상 축적
```

하지만 크롤러와 방문자는 URL 단위로 본다.

```text
홈
카테고리
태그
검색
페이지네이션
게시물
빈 목록
오래된 메모
```

예를 들어 색인 가능한 URL이 700개인데 다음과 같다면:

```text
가치 높은 글       80
일반 글           200
짧은 메모         250
태그·목록·페이지   170
```

사이트 전체가 강한 기술 지식베이스보다 **얕은 URL이 많이 생성되는 블로그**로 보일 수 있다.

## 핵심 전환

```text
글 개수
```

를 세는 대신:

```text
색인 가능한 URL 중
독립적인 검색 가치를 가진 URL의 비율
```

을 봐야 한다.

---

# 2. Markdown 파일 수와 색인 가치 혼동

Markdown 파일이 존재한다고 독립 페이지로서 가치가 있는 것은 아니다.

다음 문서는 개인 메모로는 충분하지만 공개 검색 결과로서는 약할 수 있다.

```text
제목: template hpp에서만 구현 가능?

본문:
템플릿은 컴파일 시점에 구현을 확인해야 하므로
보통 헤더에 구현한다.
```

이 정보가 틀렸다는 뜻은 아니다.

문제는 검색 사용자가 이 URL에 들어왔을 때 얻는 것이:

```text
질문의 정확한 조건
예외
명시적 인스턴스화
분리 구현 방법
빌드 영향
실제 예제
```

없이 한두 문장으로 끝날 수 있다는 것이다.

## 해결 선택지

```text
독립 Guide로 확장
기존 C++ Template Guide에 통합
짧은 Q&A 모음으로 통합
noindex Reference로 유지
Archive
```

독립 URL을 유지하는 것만이 콘텐츠 보존 방법은 아니다.

---

# 3. 모든 과거 메모를 검색 페이지로 유지

블로그는 개인 지식 저장소로 시작했을 가능성이 높다.

이때 다음이 모두 하나의 게시물로 만들어진다.

```text
명령 한 줄
에러 로그 한 줄
링크 저장
강의 중 짧은 메모
용어 정의
질문과 짧은 답
```

개인 기록 관점에서는 유용하다.

하지만 검색엔진 관점에서 각각이 별도의 검색 결과가 되어야 하는지는 다른 문제다.

## 권장 분류

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

# 4. 태그 페이지를 콘텐츠 페이지로 착각

다음 페이지가 색인될 수 있다.

```text
/tag/cpp/
/tag/cuda/
/tag/linux/
/tag/debug/
/tag/study/
```

페이지 내용:

```text
C++ 태그

글 32개

[글 카드]
[글 카드]
[글 카드]
```

이 페이지는 탐색에는 도움을 줄 수 있다.

하지만 고유한 설명이나 큐레이션 없이 목록만 보여준다면 검색 결과 페이지와 큰 차이가 없다.

AdSense 정책은 광고가 표시되는 화면이 단순 탐색이나 행동 목적의 화면이거나 게시자 콘텐츠가 부족한 화면이어서는 안 된다고 안내한다. citeturn517910search1

## 위험한 조합

```text
태그 페이지 색인 허용
+
광고 표시
+
고유 설명 없음
+
글 카드만 존재
```

## 선택지

### 중요한 태그

Topic Hub로 승격한다.

```text
PCIe & CXL
CUDA
Linux Kernel
Firmware
```

고유 설명과 학습 경로를 제공한다.

### 세부 태그

탐색에는 유지하되:

```text
noindex,follow
광고 제외
Sitemap 제외
```

를 고려한다.

### 사용되지 않는 태그

제거하거나 상위 태그에 합친다.

---

# 5. 카테고리와 태그가 같은 목록을 생성

예:

```text
/category/cuda/
/tag/cuda/
/topics/gpu-cuda/
```

세 URL이 거의 같은 글을 보여줄 수 있다.

이 경우:

```text
서로 경쟁
Canonical 판단 혼란
내부 링크 분산
얕은 목록 페이지 증가
```

가 발생한다.

Google은 중복·유사 URL이 있을 경우 대표 Canonical을 선택하며, 사이트가 선호 URL을 명확하게 제시하고 내부 링크와 Sitemap에서도 Canonical URL을 일관되게 사용하는 것을 권장한다. citeturn517910search5turn517910search14

## 권장 역할 분리

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

# 6. 페이지네이션이 얕은 색인 URL을 생성

예:

```text
/page/2/
/page/3/
/page/17/

/tag/cpp/page/4/
```

페이지마다 글 카드 몇 개 외에는 고유 내용이 없다.

페이지네이션이 사용자 탐색에 필요할 수는 있다.

그러나 다음을 명확히 해야 한다.

```text
색인이 필요한가?
Sitemap에 들어가야 하는가?
광고가 있어야 하는가?
Canonical이 자기 자신인가?
```

## 보편적 안전 방향

페이지네이션 목록은:

```text
crawl 가능한 글 링크 유지
광고 최소화 또는 제외
Sitemap 제외 검토
고유 검색 랜딩 페이지로 기대하지 않음
```

검색엔진이 글을 발견하도록 내부 링크는 유지하되, 목록 URL 자체를 핵심 검색 콘텐츠로 만들지는 않는다.

---

# 7. 검색 결과 페이지에 광고 표시

```text
/search?q=pcie
```

페이지의 본질은 사용자의 입력에 따라 결과를 나열하는 것이다.

게시자가 작성한 독립 콘텐츠라기보다 탐색 도구에 가깝다.

따라서 공개 검색 페이지는 일반적으로:

```text
noindex,follow
Sitemap 제외
광고 제외
```

가 적합하다.

검색 결과가 없을 때:

```text
검색 결과 없음
+
광고
```

만 보이는 상황은 특히 피해야 한다.

---

# 8. 빈 태그·카테고리 URL이 200으로 남음

다음 상황이 발생할 수 있다.

```text
Tag는 Registry에 존재
문서는 모두 Archive
목록은 0개
페이지는 200
```

화면:

```text
CXL.cache

등록된 글이 없습니다.
```

이 페이지에 광고나 공통 Footer 콘텐츠만 있다면 사실상 콘텐츠 없는 화면이다.

## 규칙

```text
공개 글 0개
→ 페이지 생성하지 않음
또는 404

공개 글 1개
→ 태그 페이지가 필요한지 재검토
```

빈 화면을 정상 콘텐츠 URL로 유지하지 않는다.

---

# 9. ‘준비 중’ 페이지를 공개

예:

```text
PCIe Learning Path

콘텐츠를 준비 중입니다.
```

또는:

```text
Coming Soon
```

AdSense는 공사 중인 화면이나 콘텐츠가 부족한 화면에 광고를 허용하지 않는다고 명시한다. citeturn517910search1

## 해결

```text
완성될 때까지 Route 생성하지 않음
Draft로 유지
기존 Topic으로 Redirect
```

사이트가 커 보이게 하려고 빈 Hub를 미리 공개하지 않는다.

---

# 10. 홈이 콘텐츠보다 인터페이스 중심

홈에 다음만 강하게 보일 수 있다.

```text
큰 Hero
검색창
버튼
애니메이션
GitHub 링크
태그 Cloud
광고
```

실제 기술 콘텐츠는 아래쪽에 작게 위치한다.

이 경우 홈이 게시자 콘텐츠보다 탐색·브랜딩 UI 중심 화면으로 보일 수 있다.

## 홈 첫 화면에서 보여야 할 것

```text
사이트가 다루는 전문 영역
대표 Guide
실제 기술 경험
주요 Topic
작성자의 전문성 근거
```

예:

```text
FPGA·PCIe·CUDA·Linux 시스템 개발 기록

대표 분석
- PCIe BAR와 Linux Resource 할당
- CUDA Memory 성능 실험
- U250 XRT 장애 분석
```

단순히 “안녕하세요, 호크입니다”로 끝내지 않는다.

---

# 11. 홈에서 최근 글만 보여줌

최근 글 순서는 콘텐츠 품질과 관계가 없다.

최근 게시물이 다음과 같을 수 있다.

```text
짧은 Git 명령
일상 메모
단답형 C++ 질문
오래된 설치 오류
```

방문자와 심사 시스템이 홈에서 처음 보는 콘텐츠가 이것이면 사이트의 강점을 알기 어렵다.

## 권장 순서

```text
대표 전문 영역
대표 문서
Topic
최근 글
```

최근 글은 보조 영역이다.

---

# 12. Archive가 사이트의 핵심 진입점

연도별 Archive:

```text
2026
2025
2024
...
```

는 기존 독자나 작성자에게는 편할 수 있다.

하지만 신규 방문자에게는:

```text
무엇을 다루는 사이트인지
어떤 글이 대표인지
무엇부터 읽어야 하는지
```

를 알려주지 못한다.

Archive는 보조 탐색이다.

```text
Topic Hub
>
대표 Guide
>
검색
>
연도별 Archive
```

순서가 적절하다.

---

# 13. 제목만 있고 설명이 없는 글 목록

카드:

```text
PCIe BAR
2023-05-21
```

이 정보만으로 사용자는 다음을 알 수 없다.

```text
개념 설명인가?
디버깅 기록인가?
Linux 코드 분석인가?
현재도 유효한가?
```

목록 페이지의 카드가 너무 얇으면 목록 전체도 가치가 낮아 보일 수 있다.

## 카드 최소 정보

```text
명확한 제목
한두 문장의 고유 Description
Topic 또는 문서 타입
필요하면 Historical 상태
```

태그 10개와 읽기 시간보다 설명이 중요하다.

---

# 14. 모든 Description이 동일한 문구

예:

```text
이 글에서는 PCIe BAR에 대해 알아봅니다.
```

```text
이 글에서는 CUDA Stream에 대해 알아봅니다.
```

```text
이 글에서는 Linux Kernel에 대해 알아봅니다.
```

형식적으로 Description은 존재하지만 실제 구분 정보가 거의 없다.

## 좋은 Description

다음 질문에 답해야 한다.

```text
무엇을 설명하는가?
어떤 범위인가?
어떤 결과를 얻는가?
```

예:

```text
PCIe Endpoint가 BAR를 통해 필요한 MMIO 크기를 보고하고,
Firmware와 Linux가 실제 주소 공간을 배치하는 과정을 설명합니다.
```

---

# 15. 제목이 검색 키워드 나열

예:

```text
PCIe BAR BAR Size MMIO Linux Driver 완벽 정리
```

이 방식은 사람에게 자연스럽지 않고 콘텐츠 범위도 불명확하다.

Google Search Essentials는 사용자가 콘텐츠를 찾을 때 쓸 표현을 제목과 주요 Heading 같은 눈에 띄는 위치에 사용하는 것을 권장하지만, 이는 키워드를 반복하라는 뜻이 아니다. citeturn517910search10

## 권장

```text
PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가
```

핵심 용어가 자연스럽게 포함되고 질문이 분명하다.

---

# 16. ‘완벽 정리’ 제목과 불완전한 본문

```text
CUDA 완벽 정리
C++ 완벽 가이드
Linux Kernel 총정리
```

라고 했지만 본문이 일부 개념만 다룬다면 사용자 기대를 충족하지 못한다.

Google의 사람 중심 콘텐츠 안내는 사용자가 콘텐츠를 읽은 뒤 목표를 달성했다고 느끼는지, 만족스러운 경험을 얻는지를 점검하도록 권장한다. citeturn517910search3turn517910search11

## 제목은 실제 범위만 약속한다

```text
CUDA Shared Memory의 Bank Conflict가 발생하는 이유
```

범위가 좁아도 정확한 글이 더 강하다.

---

# 17. AI로 짧은 글을 일괄 확장

AdSense 대응을 위해 다음을 할 수 있다.

```text
기존 300자 글
→ AI로 2,000자 확장
→ FAQ 5개 추가
→ 장단점 추가
→ 결론 추가
```

글자 수는 늘지만 독창적인 정보는 늘지 않을 수 있다.

Google은 생성 방식 자체보다 콘텐츠가 독창적이고 유용하며 사람을 위해 작성됐는지를 중시한다고 설명한다. 검색 순위를 조작하려는 목적으로 대량 자동 생성된 콘텐츠는 문제가 될 수 있다. citeturn517910search16turn517910search22

## 올바른 확장

```text
직접 경험 추가
실제 코드 추가
실패한 접근 추가
환경과 버전 추가
출처와 근거 추가
기존 글과 역할 정리
```

## 잘못된 확장

```text
일반론
반복
사전식 정의
형식적인 FAQ
근거 없는 장단점
```

---

# 18. 공식 문서를 한국어로 다시 쓰기만 함

예:

```text
CUDA Programming Guide 번역 요약
Linux Documentation 요약
cppreference 요약
```

번역과 정리는 학습에 도움이 될 수 있다.

하지만 사이트 전체가 원문을 축약한 수준이라면 독창적 가치가 약할 수 있다.

## 차별화 요소

```text
어떤 부분이 실제로 헷갈렸는가
소스코드에서는 어떻게 구현되는가
실제 장비에서 어떤 결과가 나왔는가
공식 문서의 범위를 어디까지 검증했는가
흔한 오해가 무엇인가
```

호크의 강점은 단순 번역이 아니라 다음이다.

```text
사양
→ 코드
→ 장비
→ 장애
```

이 연결을 콘텐츠에 명시적으로 드러내야 한다.

---

# 19. 다른 글을 요약한 링크 모음

본문:

```text
좋은 CUDA 글 모음

- NVIDIA Blog
- Stack Overflow
- Medium
- GitHub
```

링크 큐레이션 자체가 가치가 없지는 않다.

하지만 왜 선택했는지, 어떤 순서로 읽는지, 어떤 한계가 있는지 없으면 독립 콘텐츠로 약하다.

## 가치 있는 큐레이션

```text
대상 독자
추천 순서
자료별 강점
버전
중복·차이
작성자의 사용 경험
```

이 있어야 한다.

---

# 20. 코드만 있고 설명이 없음

페이지:

```cpp
template <typename T>
void foo(T value) {
    ...
}
```

그 아래 설명이 거의 없다.

코드는 게시자 콘텐츠이지만, 검색 사용자가 다음을 이해할 수 있어야 한다.

```text
무슨 문제를 해결하는가
왜 이 구조인가
어떤 제약이 있는가
어떻게 실행하는가
결과는 무엇인가
```

GitHub 저장소 Raw Code와 블로그 문서의 차이는 설명과 판단이다.

---

# 21. 로그 덤프를 콘텐츠로 간주

```text
dmesg 전체 2,000줄
lspci 전체 출력
빌드 로그 전체
```

가 본문의 대부분을 차지할 수 있다.

검색어는 많이 포함되지만 사람이 해결책을 찾기 어렵다.

## 좋은 Debug Note

```text
증상
정상 기대값
핵심 로그 3~10줄
각 줄의 의미
가설
검증
원인
해결
한계
```

전체 로그는 별도 첨부나 접힌 영역으로 제공한다.

---

# 22. 질문만 있고 답이 약함

제목:

```text
왜 shared memory는 빠른가?
```

본문:

```text
Shared memory는 on-chip memory이므로 global memory보다 빠르다.
```

맞는 말이지만 사용자의 실제 질문은 더 깊을 수 있다.

```text
Latency인가 Bandwidth인가?
Bank는 어떻게 구성되는가?
Register와 비교하면?
동기화 비용은?
어떤 경우 느려지는가?
```

독립 페이지라면 제목이 약속한 질문의 실질적인 범위를 해결해야 한다.

---

# 23. 서론이 길고 핵심 답변이 늦음

```text
컴퓨터 산업은 빠르게 발전해 왔습니다.
GPU는 인공지능 시대에 중요한 역할을 합니다.
이번 글에서는...
```

이런 일반론이 화면을 채우면 방문자는 답을 찾기 전에 이탈할 수 있다.

## 기술 문서 첫 문단

```text
문제
핵심 답
범위
```

를 빠르게 제공한다.

예:

```text
CUDA에서 shared memory가 빠른 이유는 단순히 on-chip이기 때문만은 아니다.
Warp의 접근이 Bank에 충돌 없이 분산될 때 높은 병렬 Bandwidth를 얻을 수 있기 때문이다.
```

---

# 24. 본문보다 광고가 먼저 보임

첫 화면에:

```text
제목
광고
광고
본문 시작
```

이 나타나면 콘텐츠보다 수익화가 우선인 인상을 줄 수 있다.

AdSense 승인 이전에는 특히:

```text
광고 없는 상태에서도
페이지가 완성된 기술 문서로 보여야 함
```

이 중요하다.

## 권장

```text
제목
Description
핵심 내용 또는 TL;DR
본문
논리 단위 종료 후 광고 후보
```

광고를 넣기 위해 내용을 인위적으로 쪼개지 않는다.

---

# 25. 광고 수를 늘리기 위해 페이지 분할

하나의 글을:

```text
PCIe BAR 1편
PCIe BAR 2편
PCIe BAR 3편
PCIe BAR 4편
```

으로 불필요하게 나누면 각 페이지가 얕아질 수 있다.

## 분할이 적합한 경우

```text
검색 의도가 다름
각 편이 독립된 결론을 가짐
문서 타입이 다름
코드·실험 범위가 분리됨
```

## 분할이 부적합한 경우

```text
단순히 글이 김
광고 노출 증가
페이지뷰 증가
```

---

# 26. 이미지·영상만 있는 페이지

화면에:

```text
YouTube Embed
짧은 설명 한 줄
```

만 있거나, Screenshot 여러 장과 Caption만 있을 수 있다.

AdSense 공식 안내는 텍스트가 너무 적거나 사이트가 공사 중인 것으로 판단되는 경우 콘텐츠 부족 문제가 생길 수 있다고 설명한다. citeturn517910search4

기술 영상 페이지라면 다음을 함께 제공한다.

```text
영상에서 다루는 문제
핵심 내용
타임스탬프
코드
결론
관련 글
```

영상 자체가 본문을 완전히 대체하지 않게 한다.

---

# 27. 도구 페이지에 설명이 없음

향후 계산기나 Analyzer Demo를 추가할 수 있다.

예:

```text
BAR Size Calculator
```

입력창과 버튼만 있고 설명이 없다면 행동 목적 화면에 가깝다.

## 도구 페이지에 필요한 콘텐츠

```text
도구가 해결하는 문제
입력값 의미
계산 원리
예제
제한
관련 기술 설명
```

도구 자체가 유용해도 광고를 둘 페이지라면 게시자 설명 콘텐츠가 충분히 존재해야 한다.

---

# 28. 404와 오류 화면에 광고

404는 게시자가 작성한 일반 콘텐츠 페이지가 아니다.

```text
페이지를 찾을 수 없습니다
광고
```

구조는 피한다.

광고 제외 대상:

```text
404
검색
빈 목록
Login·Admin
오류 페이지
Redirect 페이지
```

광고 대상은 독립 콘텐츠가 있는 실제 Article과 충분히 작성된 Hub 중심으로 제한한다.

---

# 29. Privacy·About 페이지가 형식적

About:

```text
안녕하세요. 개발 블로그입니다.
```

Privacy:

```text
개인정보를 중요하게 생각합니다.
```

로 끝날 수 있다.

이 페이지들이 기술 콘텐츠를 대신하지는 않지만 사이트 신뢰도와 운영 투명성을 보여준다.

## About에 유용한 정보

```text
작성자의 기술 배경
사이트가 다루는 범위
직접 경험과 학습 기록의 구분
오류 정정 방식
연락·GitHub
```

## Privacy에 유용한 정보

```text
Analytics
AdSense
Cookies
댓글 서비스
외부 Embed
데이터 보존
```

실제로 사용하지 않는 서비스를 복사한 정책 문구로 넣지 않는다.

---

# 30. 저자 정보가 불분명

기술 주장이 많은 사이트인데 누가 작성했는지, 어떤 경험에 기반했는지 알 수 없을 수 있다.

Google의 사람 중심 콘텐츠 자체 점검 항목은 콘텐츠가 신뢰할 만한 방식으로 정보를 제시하는지, 명확한 출처와 전문성의 근거가 있는지 확인하도록 권장한다. citeturn517910search3

## 호크에게 적합한 작성자 설명

```text
CUDA·MPI 성능 최적화
임베디드·FPGA Firmware
PCIe·XRT 장치 통합
비디오 코덱 개발·분석
```

단순 경력 나열보다 각 Topic과 연결한다.

---

# 31. 실제 경험과 학습 정리를 구분하지 않음

모든 글이 같은 어조로 쓰이면 독자는 다음을 구분하기 어렵다.

```text
직접 구현
직접 실험
회사에서 본 문제
공식 문서 학습
추론
AI 보조 정리
```

## 신뢰도 강화 표기

```text
직접 확인
소스코드 분석
공식 사양 기반
실험 결과
가설
학습 정리
```

이 구분은 E-E-A-T라는 용어를 페이지마다 표시하자는 뜻이 아니다.

독자가 주장의 근거를 판단할 수 있게 하자는 것이다.

---

# 32. 오래된 문서가 현재 문서처럼 보임

예:

```text
CUDA 설치 방법
```

본문 환경:

```text
CUDA 8
Ubuntu 16.04
GCC 5
```

상단에는 날짜와 상태 안내가 없다.

사용자는 현재 방법으로 오해할 수 있다.

## 최소 보완

```text
Historical
대상 환경
현재 문서 링크
마지막 검증
```

과거 글 자체는 가치가 있을 수 있다.

문제는 현재 정보처럼 제시되는 것이다.

---

# 33. 구판과 신판이 모두 검색·Sitemap에서 경쟁

```text
CUDA 설치
CUDA 설치 최신
CUDA 설치 다시 정리
CUDA 설치 2024
```

가 모두 색인 가능하고 서로 연결되지 않을 수 있다.

Google은 Sitemap에 URL을 넣는 것이 색인을 보장하지는 않지만, 사이트가 중요하다고 생각하는 Canonical URL을 전달하는 수단으로 Sitemap을 사용할 수 있다고 안내한다. citeturn517910search5turn517910search38

## 원칙

```text
대표 신판
→ Sitemap
→ 내부 링크 중심
→ 검색 우선

구판
→ Historical 또는 Superseded
→ Sitemap 제외 검토
→ 신판 안내
```

---

# 34. Sitemap에 모든 생성 URL 포함

자동 Sitemap Plugin이 다음을 모두 넣을 수 있다.

```text
Article
Tag
Category
Archive
Pagination
Search
404
Admin
Draft Preview
```

Sitemap은 사이트가 중요하다고 생각하는 URL을 알리는 수단이다. 모든 생성 Route를 무조건 제출하는 목록으로 사용하지 않는다. citeturn517910search38turn517910search5

## Sitemap 포함 후보

```text
Current Article
가치 있는 Historical Article
고유 Topic Hub
About
필요한 Policy Page
```

## 제외 후보

```text
Search
빈 Tag
Pagination
Draft
Superseded
Archive된 글
Admin
404
```

---

# 35. Sitemap에 넣으면 색인된다고 생각

Sitemap은 URL 발견을 돕지만 크롤링이나 색인을 보장하지 않는다. citeturn517910search38

따라서:

```text
Sitemap 제출
→ 콘텐츠 품질 해결
```

이 아니다.

Sitemap은 이미 가치가 있고 색인되길 원하는 URL을 정리해서 전달하는 도구다.

---

# 36. `noindex`와 `robots.txt` 혼동

색인하지 않을 페이지를 `robots.txt`에서 차단하면 검색엔진이 페이지의 `noindex`를 확인하지 못할 수 있다.

Google은 페이지 색인을 차단하려면 페이지에 `noindex`를 넣고, 크롤러가 해당 페이지에 접근할 수 있어야 한다고 설명한다. citeturn517910search26

## 역할

```text
robots.txt
→ 크롤링 제어

noindex
→ 검색 결과 색인 제외
```

Tag·Search 페이지를 색인에서 제외하려면 단순 `Disallow`만으로 해결하지 않는다.

---

# 37. Canonical로 저품질 페이지를 숨기려 함

짧은 글 A가 있지만 삭제하기 싫어서 관련 글 B를 Canonical로 지정할 수 있다.

그러나 콘텐츠가 실질적으로 다른데 Canonical만 B로 보내는 것은 적절하지 않다.

## 선택

```text
내용 통합
Redirect
Superseded 안내
noindex
Archive
```

Canonical은 유사·중복 URL의 대표를 지정하는 신호이지, 약한 페이지를 유지하면서 평가만 다른 페이지에 넘기는 장치가 아니다.

---

# 38. 모든 Tag 페이지 Canonical을 홈으로 설정

이 방식은:

```text
/tag/cpp/
→ canonical /
```

처럼 쓸 수 있다.

하지만 홈과 Tag 페이지는 같은 콘텐츠가 아니다.

더 적절한 선택은:

```text
Tag 페이지 자기 Canonical + noindex
또는 Route 제거
```

이다.

Canonical과 `noindex`의 목적을 구분한다.

---

# 39. 내부 링크가 구판으로 계속 향함

신판을 만들었지만 기존 글 30개가 계속 구판 URL을 링크하면:

```text
내부 권위 분산
사용자 구판 진입
Canonical 신호 혼란
```

이 생긴다.

Google은 내부 링크에서 선호하는 Canonical URL을 일관되게 사용하도록 권장한다. citeturn517910search5

## 신판 발행 시 검사

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

# 40. 글끼리 연결되지 않음

검색엔진이 Sitemap으로 URL을 발견할 수 있어도, 사이트 내부에서 의미 있는 경로가 없는 문서는 중요도와 문맥을 전달하기 어렵다.

Google Search Essentials는 링크가 크롤링 가능해야 하며, 페이지 사이 링크를 통해 다른 콘텐츠를 발견할 수 있어야 한다고 안내한다. citeturn517910search10

## 대표 글은 최소한 다음에서 연결

```text
Topic Hub
관련 Concept
다음 읽기
홈 Featured 또는 Archive
```

태그 목록에서만 접근되는 문서를 줄인다.

---

# 41. Anchor Text가 전부 ‘여기’

```text
자세한 내용은 여기를 참고하세요.
```

페이지 관계와 대상 주제를 전달하지 못한다.

권장:

```text
Linux의 PCI Resource 등록 흐름을 먼저 확인한다.
```

이 문구는 사람과 검색엔진 모두 대상 문맥을 이해하기 쉽다.

---

# 42. 사이트의 주제가 지나치게 넓어 보임

홈이나 Navigation에 다음이 모두 동등하게 보일 수 있다.

```text
CUDA
PCIe
C++
Linux
게임
일상
역사
IELTS
오토바이
```

개인 블로그이므로 여러 관심사를 다룰 수 있다.

그러나 AdSense 재심사와 기술 브랜드 강화가 목적이라면 핵심 전문 영역이 먼저 보여야 한다.

## 선택지

```text
기술 콘텐츠를 메인 사이트 중심으로
비기술 글은 별도 Section
Navigation에서 우선순위 하향
noindex가 필요한 개인 메모 분류
```

모든 주제를 삭제할 필요는 없지만 사이트의 중심이 명확해야 한다.

---

# 43. 서로 무관한 글이 최근 글에서 섞임

방문자가 PCIe 글을 읽고 홈으로 돌아왔을 때:

```text
역사 이야기
개인 메모
CUDA
일상
```

이 섞여 있으면 전문 지식 흐름이 끊긴다.

## 기술 사이트 홈

```text
대표 Topic
최근 기술 글
최근 갱신된 Guide
실전 Debug Note
```

를 중심으로 구성한다.

개인 글은 별도 Archive나 Profile 영역에서 접근시킬 수 있다.

---

# 44. 콘텐츠를 카테고리가 아닌 기술 스택 이름으로만 분류

```text
C++
Rust
Python
Linux
```

만 있으면 사용자가 해결하려는 문제와 맞지 않을 수 있다.

예:

```text
PCIe Driver를 이해
```

하려면:

```text
C
Linux
Firmware
Hardware
```

글이 여러 카테고리에 흩어진다.

따라서 검색 가치가 높은 랜딩 페이지는 언어보다 문제 영역 중심이 좋다.

```text
PCIe & CXL
GPU & CUDA
Firmware & Boot
Linux Internals
Performance Engineering
```

---

# 45. Topic Hub를 글 목록으로만 만듦

이전 태스크와 겹치지 않게 AdSense 관점에서만 말하면:

```text
Topic 제목
+
글 카드 30개
```

만 있는 Hub는 고유 콘텐츠가 약하다.

## 색인 가치가 있는 Hub

```text
Topic의 범위
누구를 위한 것인지
학습 순서
대표 문서 선정 이유
세부 영역 설명
현재·Historical 분리
```

즉 Hub 자체가 편집된 콘텐츠여야 한다.

---

# 46. 모든 Hub를 같은 문구로 자동 생성

예:

```text
CUDA에 관한 글을 모았습니다.
```

```text
PCIe에 관한 글을 모았습니다.
```

```text
C++에 관한 글을 모았습니다.
```

형식상 고유 문장이지만 정보 가치는 거의 없다.

## 수동 작성할 핵심 Hub

```text
이 분야에서 무엇을 다루는지
사이트가 특히 강한 부분
초보자의 시작점
실무자의 Debug 진입점
```

전체 태그에 설명을 생성하기보다 핵심 Topic 5~8개만 제대로 만든다.

---

# 47. 문서 수를 늘리기 위해 키워드별 페이지 생성

예:

```text
CUDA shared memory란
CUDA shared memory 장점
CUDA shared memory 단점
CUDA shared memory 사용법
CUDA shared memory 성능
```

각각의 내용이 겹치면 검색 의도만 쪼갠 페이지가 된다.

Google의 스팸 정책은 검색 순위 조작을 목적으로 대량의 저가치 페이지를 생성하는 행위를 문제로 본다. citeturn517910search22

## 권장

```text
하나의 강한 Concept Guide
+
독립적인 Experiment
+
독립적인 Debug Note
```

문서 타입과 검색 목적이 다를 때만 분리한다.

---

# 48. FAQ를 별도 얕은 페이지로 분리

```text
BAR는 무엇인가요?
BAR는 누가 할당하나요?
BAR는 메모리인가요?
```

각 질문을 짧은 페이지로 만들기보다 하나의 Concept에서 다루는 편이 강할 수 있다.

FAQ는 본문에서 실제 독자 오해를 해결하는 보조 구조다.

페이지 수 증가 도구가 아니다.

---

# 49. 자동 생성 Glossary 페이지 폭증

기술 용어마다:

```text
/terms/bar/
/terms/dma/
/terms/irq/
/terms/msi/
```

를 생성할 수 있다.

정의 한두 줄뿐이면 얕은 페이지가 대량으로 생긴다.

## 대안

```text
Topic별 Glossary 한 페이지
Article 내부 Definition
검색 Alias Registry
Reference 문서에 통합
```

독립 Glossary URL은 충분한 설명과 관계가 있을 때만 만든다.

---

# 50. 코드 Symbol마다 페이지 생성

향후 소스 분석 시스템에서:

```text
/function/pci_scan_child_bus/
/function/pci_bus_add_devices/
```

처럼 자동 문서를 생성할 수 있다.

단순 Signature와 호출 위치만 있는 페이지가 수천 개 생기면 사이트의 콘텐츠 품질을 희석할 수 있다.

## 공개 색인 조건

```text
사람이 작성한 설명
호출 흐름
핵심 분기
관련 자료구조
버전
실제 의미
```

자동 Symbol Index는 내부 검색 기능이나 noindex Reference로 두는 편이 안전하다.

---

# 51. GitHub README를 그대로 페이지로 복제

Repository README와 블로그 글이 거의 같은 내용인데 둘 다 검색되는 경우가 있다.

완전히 같은 콘텐츠를 여러 URL에서 유지하기보다 역할을 나눈다.

```text
README
→ 설치·사용법

Blog Article
→ 설계 이유·실험·트레이드오프
```

같은 본문을 복사하지 않는다.

---

# 52. 번역 페이지의 Canonical·언어 관계가 불명확

한국어와 영어 글을 만들 때 단순 자동 번역본이 거의 같은 구조로 존재할 수 있다.

Google은 다국어 페이지에서 언어별 Canonical과 `hreflang` 관계를 올바르게 지정하는 것을 안내한다. citeturn517910search5

하지만 현재 영어 콘텐츠가 소수라면 복잡한 다국어 구조를 먼저 만들 필요는 없다.

```text
한국어를 대표로 완성
영어는 실제 수요와 품질이 있을 때
```

진행한다.

---

# 53. 날짜만 최신으로 바꿔 새 콘텐츠처럼 만듦

본문을 기술적으로 검증하지 않고:

```text
updated: 2026-08-01
```

만 바꿀 수 있다.

이것은 독자에게 최신성 신호를 잘못 준다.

## 날짜 역할

```text
published
→ 최초 공개

updated
→ 의미 있는 수정

lastVerified
→ 기술적 재검증
```

AdSense 재심사를 위해 날짜만 새로 만드는 방식은 피한다.

---

# 54. 오래된 글 제목에 `[2026 최신]`만 추가

실제 환경과 명령은 과거 버전인데 제목만 바꾸면 더 위험하다.

```text
2026 최신 CUDA 설치
```

라고 하려면:

```text
2026년 현재 지원 버전 확인
실제 설치 재검증
변경점 정리
환경 명시
```

가 필요하다.

확인하지 못했으면 Historical로 두는 편이 낫다.

---

# 55. 콘텐츠 품질을 글자 수로 판단

```text
2,000자 이상
Heading 5개
이미지 2개
```

를 통과하면 좋은 콘텐츠라고 생각할 수 있다.

공식 Google 안내는 고정된 선호 단어 수가 있다는 믿음을 경고하며, 사람에게 유용하고 만족스러운 경험인지 평가하도록 권장한다. citeturn517910search3

## 평가 질문

```text
질문을 해결했는가?
독창적인 정보가 있는가?
근거가 있는가?
범위가 명확한가?
다른 페이지보다 나은 이유가 있는가?
```

500자 Reference도 강할 수 있고, 5,000자 일반론도 약할 수 있다.

---

# 56. 내용 없는 글을 이미지로 채움

AdSense 대응을 위해:

```text
대표 이미지
다이어그램
스크린샷
배너
```

를 추가할 수 있다.

그러나 그림이 본문 설명을 대신하지 못한다.

다이어그램은 다음을 실제로 설명해야 한다.

```text
데이터 흐름
주소 변환
호출 순서
실험 결과
```

장식용 AI 이미지가 기술 콘텐츠의 독창적 분석을 만들지는 않는다.

---

# 57. 모든 글에 동일한 AI 대표 이미지

기술 글마다 비슷한 추상 회로 이미지가 들어가면:

```text
본문과 관계 약함
페이지 구분 약함
콘텐츠보다 템플릿 느낌
```

이 강해진다.

대표 이미지는 필수가 아니다.

기술 사이트에서 더 가치 있는 시각 요소는:

```text
직접 만든 아키텍처도
실제 측정 그래프
핵심 코드 흐름
장비·환경 Diagram
```

이다.

---

# 58. 저자 경험이 글 밖에만 존재

호크는 실제로 다음 경험이 있다.

```text
U250
XRT
PCIe BAR
VM Passthrough
CUDA 최적화
AV1 Hardware Encoder
```

그런데 글이 공식 문서 요약 어조로만 쓰이면 이 차별점이 보이지 않는다.

## 본문에 드러낼 것

```text
어떤 환경에서 확인했는가
무엇이 예상과 달랐는가
어떤 접근이 실패했는가
어떤 결론은 확인하지 못했는가
```

이 부분이 일반적인 AI·요약 콘텐츠와의 가장 큰 차이다.

---

# 59. 실패 사례를 삭제하고 성공 절차만 남김

깔끔한 Guide를 만들려고 실패 과정과 한계를 제거할 수 있다.

하지만 기술 콘텐츠의 독창성은 종종 다음에 있다.

```text
왜 첫 접근이 실패했는가
어떤 로그가 결정적이었는가
어떤 가설을 버렸는가
```

전체 시행착오를 장황하게 남길 필요는 없지만, 핵심 판단 과정은 보존한다.

---

# 60. 회사 내부 경험을 그대로 공개하거나 전부 제거

두 극단 모두 문제다.

## 그대로 공개

```text
기밀
내부 Host
고객 정보
비공개 설계
```

위험.

## 전부 제거

실제 경험이 사라지고 일반론만 남음.

## 적절한 방식

```text
민감 식별자는 일반화
기술적 조건은 유지
직접 관찰과 판단은 보존
```

예:

```text
사내 bm09 서버
```

대신:

```text
CentOS 7.9 기반 FPGA Build Host
```

로 표현한다.

---

# 61. 사이트의 콘텐츠 품질을 한 번에 고치려 함

AdSense 재신청 전:

```text
500개 전부 수정
```

은 비현실적이다.

더 효과적인 접근은 **색인 표면 축소와 대표 콘텐츠 강화**다.

## 1단계

```text
빈·얕은 목록 noindex
검색·Pagination 광고 제외
Draft·Placeholder 제거
```

## 2단계

```text
대표 기술 문서 10~20개 강화
핵심 Topic Hub 3~5개 작성
About·Privacy 정리
```

## 3단계

```text
중복·구판 정리
내부 링크를 대표 글 중심으로 변경
Sitemap 정리
```

## 4단계

```text
Search Console에서 색인 상태 확인
운영 사이트 직접 검토
재신청
```

---

# 62. 콘텐츠 개선과 색인 정리를 동시에 하지 않음

대표 글을 아무리 강화해도 수백 개의 얕은 URL이 계속 색인 대상으로 남으면 사이트 전체 인상이 크게 바뀌지 않을 수 있다.

반대로 약한 글을 전부 `noindex`했지만 대표 글이 부족하면 콘텐츠 양이 너무 적어 보일 수 있다.

따라서 두 축이 함께 가야 한다.

```text
강한 URL 강화
+
약한 URL 색인 표면 축소
```

---

# 63. 모든 약한 글을 즉시 삭제

약한 검색 페이지라고 해서 기록 가치가 없는 것은 아니다.

선택지가 있다.

```text
통합
noindex
Historical
Archive
Superseded
삭제
```

특히 희귀한 과거 환경의 Debug Note는 짧아도 가치가 있을 수 있다.

길이보다 고유성과 검색 의도를 본다.

---

# 64. 모든 오래된 글을 `noindex`

오래됐다는 사실만으로 가치가 낮은 것은 아니다.

다음은 오래돼도 안정적일 수 있다.

```text
container_of 원리
PCIe BAR 기본 구조
C++ Template 명시적 인스턴스화
Shared Memory Bank 기본
```

반면 최근 글도 얕을 수 있다.

판단 기준:

```text
현재 유효성
고유성
검색 질문 해결
환경 명확성
대체 문서 존재
```

---

# 65. AdSense 재신청을 너무 빨리 반복

문구 몇 개와 메뉴만 바꾼 뒤 즉시 재신청하면 실질적으로 사이트의 평가 대상이 달라지지 않았을 수 있다.

재신청 전에 최소한 다음 변화를 확인한다.

```text
대표 콘텐츠가 실제 운영 URL에 반영
Sitemap이 정리됨
불필요한 색인 URL 제거
탐색 구조가 명확
About·Privacy가 실제 구성과 일치
빈·준비 중 페이지 없음
```

승인이 보장되는 기준은 공개되어 있지 않으므로, 단순 체크리스트 통과가 승인을 의미한다고 말할 수는 없다. Google도 프로그램 기준에 따라 신청을 거절할 수 있음을 명시한다. citeturn517910search8turn517910search41

---

# 66. Search Console 색인 수만 목표로 함

```text
색인 500개 달성
```

이 목표는 오히려 약한 페이지까지 색인시키게 할 수 있다.

더 나은 목표:

```text
대표 URL이 색인됨
중복 URL이 감소
구판 대신 신판이 선택됨
제외한 Tag·Search가 색인되지 않음
```

색인 수보다 색인된 URL의 품질과 의도가 중요하다.

---

# 67. 모든 ‘Crawled, currently not indexed’를 오류로 봄

검색엔진이 모든 URL을 색인할 의무는 없다.

Sitemap도 색인을 보장하지 않는다. citeturn517910search38

해당 URL을 보고 판단한다.

```text
색인될 가치가 충분한가?
다른 문서와 중복되는가?
내용이 너무 짧은가?
대표 URL이 따로 있는가?
내부 링크가 있는가?
```

색인되지 않은 모든 페이지를 억지로 늘리지 않는다.

---

# 68. 색인 요청을 대량으로 반복

Search Console에서 매번 수동 색인 요청을 한다고 콘텐츠 가치가 해결되는 것은 아니다.

우선:

```text
내부 링크
Sitemap
Canonical
페이지 품질
```

을 정리한다.

수동 요청은 중요한 신규·개편 대표 문서 확인에 제한적으로 사용할 수 있다.

---

# 69. RSS·Archive 링크만으로 크롤링을 기대

대표 문서는 실제 Topic Hub와 본문 관계에서 링크되어야 한다.

```text
RSS에 존재
Archive 18페이지에 존재
```

만으로는 신규 방문자에게도 발견하기 어렵다.

```text
홈
Topic Hub
관련 Concept
```

에서 의미 있게 연결한다.

---

# 70. 광고 승인 후 약한 페이지에 자동 광고 전면 적용

승인 후 Auto Ads를 켜면 다음에도 광고가 삽입될 수 있다.

```text
짧은 Reference
Tag
Search
Historical 안내
404와 유사한 화면
```

페이지 유형별 광고 적격성을 다시 판단해야 한다.

## 광고 허용 후보

```text
충분한 독립 Article
고유 설명이 풍부한 Topic Hub
```

## 광고 제외 후보

```text
검색
Tag 목록
Archive
짧은 Redirect 안내
404
Admin
Draft
빈 결과
```

승인은 모든 URL이 광고에 적합하다는 뜻이 아니다.

---

# 71. 광고 위치가 콘텐츠 의미를 왜곡

예:

```text
가설
[광고]
결론
```

```text
코드
[광고]
코드 설명
```

문서의 논리 단위를 끊는다.

광고 슬롯은:

```text
큰 장의 종료
본문 종료
관계 UI와 명확히 구분된 위치
```

에 제한한다.

---

# 72. 승인만 목표로 사이트 정체성을 바꿈

AdSense에 맞춘다며:

```text
검색량 높은 일반 키워드
제품 추천
AI 뉴스
생활 정보
```

를 추가하면 호크의 기술 전문성이 희석된다.

Google의 사람 중심 콘텐츠 안내는 기존 또는 의도된 독자층이 있는지, 사이트가 주된 목적과 초점을 갖는지를 자문하도록 권장한다. citeturn517910search3

`hawk90.github.io`의 강한 중심은 다음이다.

```text
Systems
Firmware
PCIe
CUDA
Performance
Video
```

광고 승인을 위해 이 중심을 버리지 않는다.

---

# 73. 트래픽이 높은 주제를 전문성 없이 추가

예:

```text
ChatGPT 사용법
AI 부업
추천 노트북
```

같은 주제를 검색량만 보고 추가하면 다른 사이트와 차별성이 없다.

새 주제가 들어올 조건:

```text
기존 경험과 연결
직접 실험 가능
현재 독자와 연결
사이트 중심을 강화
```

예를 들어 AI를 다룬다면:

```text
AI 코딩 도구의 C++ 코드 분석 차이
CUDA 코드 생성 검증
펌웨어에서 AI 도구를 안전하게 쓰는 방법
```

처럼 호크의 전문 영역과 연결하는 편이 낫다.

---

# 74. 주제별 깊이가 보이지 않음

글이 많아도 한눈에 보면:

```text
각 Topic에 1~2개씩 흩어짐
```

처럼 보일 수 있다.

실제로는 CUDA·PCIe 글이 많아도 Tag와 날짜에 분산돼 있기 때문이다.

## 깊이를 보이게 하는 방법

```text
Topic Hub
대표 Guide
Concept
Source Walkthrough
Debug Note
Experiment
```

를 하나의 묶음으로 보여준다.

새 글을 더 쓰지 않아도 기존 깊이가 드러날 수 있다.

---

# 75. 작성자의 독창적 자산이 숨겨짐

다음은 강한 콘텐츠 자산이다.

```text
직접 만든 Diagram
Benchmark 데이터
재현 코드
실패 로그
소스코드 호출 흐름
환경 Matrix
```

그런데 현재 글이 텍스트만 있고 이 자산이 GitHub 저장소나 개인 메모에만 있을 수 있다.

대표 문서에는 적어도 하나의 독창적 증거를 드러낸다.

```text
측정
코드
Diagram
관찰
소스 분석
```

모든 글에 억지로 넣는 것은 아니지만, 대표 글은 분명한 차별점이 있어야 한다.

---

# 76. 기술 주장에 출처가 없음

특히 다음 주장은 출처 또는 범위가 필요하다.

```text
사양 요구사항
API 지원 여부
성능 수치
버전별 변경
하드웨어 동작
```

출처가 없으면 독자가 사실과 개인 추론을 구분하기 어렵다.

Google의 사람 중심 콘텐츠 안내도 명확한 출처와 전문성의 근거를 신뢰 신호로 점검하도록 한다. citeturn517910search3

## 출처 유형

```text
공식 사양
공식 문서
소스코드 Tag·Commit
직접 실험
논문
```

검색 결과 상위 블로그를 다시 인용하는 것보다 원자료가 낫다.

---

# 77. 외부 링크가 많으면 신뢰도가 높다고 생각

출처 30개가 있어도 본문이 그것을 단순 요약한 수준이면 독창적 가치가 약하다.

외부 링크의 목적은:

```text
주장 근거
추가 읽기
원문 확인
```

이다.

링크 수가 품질 점수는 아니다.

---

# 78. 같은 문장을 여러 글에 반복

모든 글의 서론과 결론에 다음이 반복될 수 있다.

```text
성능 최적화는 매우 중요합니다.
기본 원리를 이해하는 것이 중요합니다.
실제 환경에 따라 결과가 달라질 수 있습니다.
```

이런 공통 문구가 페이지의 상당 부분을 차지하면 실질적인 고유 콘텐츠 비율이 낮아진다.

## 공통 문구 최소화

```text
Site Header
작성자 소개
긴 Disclaimer
Newsletter
관련 글 설명
```

보다 문서 고유 본문이 중심이 되게 한다.

---

# 79. 긴 Disclaimer가 본문보다 큼

모든 글에:

```text
이 글은 개인 의견이며...
환경에 따라 다르며...
책임을 지지 않으며...
```

가 길게 반복될 수 있다.

필요한 범위·한계는 문서별로 구체적으로 작성한다.

공통 법적 문구는 Policy 페이지로 분리하고 본문에서는 짧게 연결한다.

---

# 80. Comments를 본문 콘텐츠로 기대

댓글이 많아지면 페이지가 풍부해 보일 수 있지만 댓글은 게시자 본문의 품질을 대신하지 않는다.

중요한 정정과 추가 설명은:

```text
본문에 반영
updated 변경
필요하면 변경 이력
```

한다.

댓글에만 해결책이 남아 있으면 검색 방문자는 본문에서 잘못된 내용을 먼저 읽는다.

---

# 81. 콘텐츠 건강 상태를 Page View로만 판단

조회 수가 낮다고 가치 없는 글은 아니다.

예:

```text
특정 U250 XRT 문제
희귀 Linux 3.10 장애
AV1 Hardware Encoder 분석
```

은 독자가 적어도 독창성이 높다.

평가 축:

```text
검색 수요
독창성
전문성
다른 글의 기반
보완 비용
```

을 함께 본다.

---

# 82. 대표 문서를 조회 수로만 선정

조회 수가 높은 글이:

```text
간단한 설치 오류
우연히 노출된 단답
```

일 수 있다.

홈 Featured에는 다음을 우선한다.

```text
사이트 전문성을 보여줌
내용이 충분함
현재 상태가 명확함
다른 글로 연결됨
직접 경험 또는 분석 존재
```

---

# 83. 기술적으로 강하지만 읽기 어려운 글을 그대로 대표로 사용

독창적인 코드 분석이 있어도:

```text
서론 없음
환경 없음
로그부터 시작
결론 없음
```

이면 신규 독자가 가치를 판단하기 어렵다.

대표 문서는 새로운 내용을 더 많이 쓰기보다 기존 자료를 다음 흐름으로 편집할 필요가 있다.

```text
문제
핵심 결론
근거
범위
다음 글
```

---

# 84. 모든 글을 대표 문서 수준으로 고치려 함

대표 문서와 일반 Reference의 요구 수준은 달라도 된다.

## 대표 문서

```text
깊이
구조
근거
관계
환경
```

## 일반 Reference

```text
정확성
명확성
독립 검색 가치
상위 Topic 연결
```

사이트 전체를 동일한 장문 템플릿으로 만들 필요는 없다.

---

# 85. 저가치 판정을 단일 원인으로 찾으려 함

```text
글이 짧아서인가?
About이 없어서인가?
방문자가 적어서인가?
디자인 때문인가?
```

Google의 승인 거절은 항상 정확한 페이지별 원인을 제공하지 않을 수 있다. 공식 안내도 여러 콘텐츠·탐색·정책 요인을 함께 검토하도록 안내한다. citeturn517910search4turn517910search8

따라서 하나의 마법 같은 수정이 아니라 전체 색인 표면과 대표 콘텐츠를 개선해야 한다.

---

# 86. ‘콘텐츠 없음’을 문자 그대로 해석

페이지에 텍스트가 있으니 콘텐츠 없음이 아니라고 생각할 수 있다.

하지만 실질적으로는 다음 의미에 가까울 수 있다.

```text
광고를 둘 만큼 충분한 게시자 콘텐츠가 없음
독립적인 사용자 가치가 부족함
목록·탐색 화면임
공사 중 또는 빈 화면임
```

즉 HTML에 문자가 존재하는지의 문제가 아니다.

---

# 87. 광고 심사와 검색 순위를 동일하게 생각

두 시스템은 관련된 품질 원칙을 공유할 수 있지만 동일한 판정 시스템은 아니다.

```text
검색 색인됨
≠
AdSense 승인

검색 유입 있음
≠
모든 페이지 광고 적합
```

Google AdSense는 별도의 프로그램 정책과 승인 기준을 적용하며 신청을 거절할 권리를 명시한다. citeturn517910search8turn517910search41

따라서:

```text
검색 결과에 나오니 AdSense도 승인돼야 한다
```

라고 볼 수 없다.

---

# 88. 승인 후 품질 관리를 중단

승인만 받고 다음이 다시 늘면:

```text
짧은 메모
빈 Tag
자동 생성 페이지
구판
```

사이트 품질이 다시 떨어진다.

신규 문서부터 다음 질문을 적용한다.

```text
독립 URL이 필요한가?
기존 글에 통합하는 편이 나은가?
검색 사용자의 질문을 해결하는가?
직접 경험이나 고유 분석이 있는가?
```

---

# 89. 실제 우선순위: 삭제보다 노출 제어

첫 작업에서 500개 글을 삭제하지 않는다.

## 즉시 할 것

```text
빈·준비 중 페이지 제거
Search·Tag·Pagination 광고 제외
약한 목록 페이지 Sitemap 제외
Draft Production 제외
```

## 다음

```text
대표 글 10~20개 강화
핵심 Hub 3~5개 작성
홈을 대표 콘텐츠 중심으로 재구성
```

## 이후

```text
짧은 메모 통합
구판 분류
중복 정리
```

---

# 90. Hawk90에 맞는 대표 콘텐츠 묶음

첫 AdSense 개선 Batch는 다음 정도가 적합하다.

## PCIe·FPGA

```text
PCIe BAR 크기 탐색과 주소 할당
Linux PCI Enumeration 흐름
U250 BAR mmap 실패 분석
VFIO Passthrough에서 BAR 접근
XRT와 독립 Runtime 구조
```

## CUDA·성능

```text
Shared Memory Bank Conflict
Pinned·Unified Memory 비교
CUDA Stream 비동기 Pipeline
Nsight Compute 메모리 지표
Kernel Fusion 전략
```

## C++·Firmware

```text
Firmware에서 Zero-cost Abstraction
RTTI·Heap 없는 C++ 설계
Template 명시적 인스턴스화
BSP 테스트 Framework 설계
```

이 글들이 서로 연결되면 사이트의 전문성이 명확하게 보인다.

---

# 91. 실제 색인 표면 분류표

| 페이지 유형 | Index | Sitemap | 광고 |
|---|---:|---:|---:|
| Current 대표 Article | O | O | O |
| Current 일반 Article | O | O | 조건부 |
| 충분한 Topic Hub | O | O | 조건부 |
| Historical Article | 선별 | 선별 | 대체로 X |
| Needs Review | 선별 | 선별 | X |
| Superseded | X | X | X |
| Tag 목록 | 대체로 X | X | X |
| Category 중복 목록 | X 또는 제거 | X | X |
| Search | X | X | X |
| Pagination | 대체로 X | X | X |
| Archive | 선별 | 대체로 X | X |
| 404 | X | X | X |
| Draft·Preview | 생성 안 함 | X | X |

이 표는 절대적인 Google 규칙이 아니라 `hawk90.github.io`에 적합한 운영 정책 제안이다.

---

# 92. 재신청 전 대표 URL 수동 검사

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

# 93. 재신청 전 약한 URL 수동 검사

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

# 94. 1차 개선 범위

## ADS-01. Indexable URL Inventory

다음 유형별 URL 수를 집계한다.

```text
Article
Tag
Category
Pagination
Archive
Search
Hub
Draft
```

## ADS-02. Thin Surface Audit

```text
본문 글자 수
고유 Description
목록 비율
광고 적격성
색인 상태
```

를 후보 신호로 사용한다.

글자 수만으로 자동 판정하지 않는다.

## ADS-03. Non-content Page Policy

```text
Search
404
Tag
Pagination
Empty State
```

의 `noindex`, Sitemap, 광고 정책을 확정한다.

## ADS-04. Representative Content Set

대표 기술 문서 10~20개를 선정한다.

## ADS-05. Home Content Rebalance

최근 글보다 대표 Topic과 Guide를 우선한다.

## ADS-06. Core Topic Hub 3~5개

고유 설명과 학습 경로를 작성한다.

## ADS-07. Short-note Consolidation

같은 검색 의도의 짧은 메모를 통합한다.

## ADS-08. Historical·Superseded Cleanup

구판이 Current와 경쟁하지 않게 한다.

## ADS-09. About·Privacy 정비

실제 저자 경험과 사용 서비스를 정확히 설명한다.

## ADS-10. Sitemap·Canonical Audit

색인되길 원하는 대표 URL만 일관되게 전달한다.

## ADS-11. Ad Eligibility Map

페이지 유형별 광고 허용 여부를 중앙 정책으로 둔다.

## ADS-12. Manual Review Checklist

재신청 전 대표·무작위 URL을 실제 브라우저에서 확인한다.

---

# 95. 권장 실행 순서

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

# 96. 가장 먼저 하지 말아야 할 일

```text
500개 글 AI 확장
모든 글에 FAQ 추가
모든 글 날짜 최신화
모든 Tag에 설명 자동 생성
글자 수 기준으로 일괄 삭제
Sitemap에 모든 URL 추가
AdSense 재신청 반복
```

이 방식은 내용의 본질보다 형식을 건드린다.

---

# 97. 가장 먼저 해야 할 일

```text
색인되는 URL 종류 파악
빈·목록·검색 페이지 정리
대표 기술 문서 선정
기존 경험과 증거를 대표 글에 드러냄
홈과 Hub에서 대표 글을 연결
구판과 짧은 메모가 대표 글과 경쟁하지 않게 함
```

새 글을 수십 개 쓰기 전에 이미 가진 콘텐츠의 강점을 보이게 하는 작업이 우선이다.

---

# 완료 기준

이 태스크는 AdSense가 승인됐다고만 완료되는 것이 아니다.

다음 상태가 되어야 한다.

```text
색인 가능한 URL 대부분이 독립적인 검색 가치를 가진다.

Tag·Search·Pagination이 Article과 같은 광고 정책을 사용하지 않는다.

홈에서 사이트의 전문 영역과 대표 문서를 즉시 알 수 있다.

대표 글에는 직접 경험·코드·실험·소스 분석 중 하나가 분명히 존재한다.

짧은 메모가 같은 검색 의도의 여러 페이지로 분산되지 않는다.

과거 문서는 환경과 상태가 명확하다.

구판·중복 URL보다 현재 Canonical 문서가 내부 링크와 Sitemap의 중심이 된다.

광고가 없어도 모든 광고 대상 페이지가 완성된 콘텐츠 페이지로 보인다.

About과 Privacy가 실제 작성자와 사이트 운영 방식을 정확히 설명한다.

재신청 전에 대표 URL과 무작위 Legacy URL을 사람이 직접 검토할 수 있다.
```

# 핵심 결론

`hawk90.github.io`의 문제는 **실제 기술 내용이 없어서**라기보다 다음일 가능성이 더 크다.

```text
강한 기술 콘텐츠가
수백 개의 짧은 메모·목록·구판·날짜순 구조 속에 묻혀 있음
```

따라서 해결은 콘텐츠를 무작정 더 만드는 것이 아니다.

```text
강한 콘텐츠를 대표 경로로 올리고
약한 URL의 색인·광고 노출을 줄이고
직접 경험과 근거를 문서 안에서 보이게 하는 것
```

이다.

Google의 공식 방향도 페이지 수나 특정 글자 수보다 **사람에게 유용하고 신뢰할 수 있으며 만족스러운 콘텐츠**, 그리고 명확하게 탐색·발견할 수 있는 사이트를 강조한다. citeturn517910search3turn517910search10turn517910search15

## 76. user

거의 다한거 같은데 뭐뭐 남음? 그리고 지금 중복되는 패턴이있어

## 77. assistant

맞아. **거의 다 끝났고**, 최근에는 같은 핵심 문제를 다른 이름으로 반복한 부분이 분명히 있다.

특히 아래 묶음은 사실상 중복이다.

```text
Content Model
Publication Policy
상태 관리
대표 문서
Topic Hub
관계 그래프
기존 글 마이그레이션
AdSense 저가치 URL 정리
```

표현은 달라도 결국 공통 질문은 이것이었다.

> 어떤 글을 공개·색인·추천하고, 어떤 글을 구판·보관·통합할 것인가?

검색·내부 링크·Article UX 역시 일부가 `Topic Hub와 대표 문서 연결`이라는 동일한 해결책을 반복했다.

---

# 지금까지 다룬 큰 영역

## 1. 콘텐츠 구조

```text
Content Type
Topic
Status
Manifest
Publication Policy
대표 문서
Historical·Superseded
```

충분히 다뤘다.

---

## 2. 정보 구조와 탐색

```text
Home
Topic Hub
Learning Path
Search
내부 링크
Related
Breadcrumb
Archive
```

충분히 다뤘다.

---

## 3. 개별 기술 문서 품질

```text
Article Header
TL;DR
환경
근거
가설·관찰 구분
코드·로그·표
결론
한계
다음 읽기
```

충분히 다뤘다.

---

## 4. 콘텐츠 운영

```text
신규 문서 작성
검수
발행
Freshness
기존 500개 글 Migration
중복 통합
```

이 역시 충분히 다뤘다.

---

## 5. 프런트엔드 아키텍처

```text
정적 HTML 우선
Hydration 최소화
의존성 정리
CSS 구조
반응형
다크 모드
Component 복잡도
```

충분히 다뤘다.

---

## 6. 품질과 운영 안정성

```text
Unit·Integration·Browser Test
배포 Artifact
GitHub Pages
Rollback
Dist Validation
External Script 격리
```

충분히 다뤘다.

---

## 7. SEO·AdSense

```text
얕은 URL
Tag·Search·Pagination
Sitemap
Canonical
noindex
대표 콘텐츠
광고 적격 페이지
```

이번 마지막 태스크로 거의 마무리됐다.

---

# 실제로 반복된 항목

## 대표 문서 우선

다음 태스크에서 반복됐다.

```text
Topic Hub
검색 Ranking
내부 링크
Article Page
작성 Workflow
Migration
AdSense
```

결론은 모두 같다.

```text
대표 문서를 선정하고
홈·Hub·검색·링크에서 우선 노출한다.
```

한 번의 통합 규칙으로 끝낼 수 있다.

---

## Historical·Superseded

다음에서 반복됐다.

```text
Publication Policy
검색
내부 관계
Article Header
Migration
AdSense·Sitemap
```

이것도 정책표 하나면 충분하다.

---

## 기존 글 500개 정리

다음 내용이 여러 번 나왔다.

```text
Inventory
대표 글 선정
작은 Batch
Metadata 적용
구판 분류
중복 통합
URL 유지
```

추가 설명은 이제 거의 필요 없다.

---

## 검색·내부 링크·Learning Path

각각 다른 기능이지만 계속 다음 결론으로 모였다.

```text
사용자를 대표 문서로 보내고
다음 문서로 이동시킨다.
```

이후에는 세부 구현을 실제 저장소에서 검토하지 않는 이상 일반론만 반복될 가능성이 높다.

---

## AdSense와 콘텐츠 품질

앞서 말한:

```text
대표 문서
얕은 글 통합
빈 목록 제거
Topic Hub 강화
Historical 분리
```

가 그대로 다시 등장했다.

AdSense만의 신규 내용은 사실 다음 정도였다.

```text
검색·Tag·Pagination 광고 제외
얕은 URL noindex
Sitemap 표면 축소
광고 대상 페이지 제한
```

나머지는 기존 콘텐츠 아키텍처와 겹친다.

---

# 아직 안 다뤘거나 독립적으로 남은 영역

실제로 남은 것은 많지 않다.

## 1. 보안·공개 정보·공급망 보안

일부 Secret과 내부 정보 이야기는 했지만, 하나의 독립 영역으로는 아직 정리하지 않았다.

다룰 수 있는 내용:

```text
GitHub Actions 공급망
Action SHA 고정
Dependency confusion
악성 Markdown·MDX
Raw HTML·iframe
CSP
외부 Script
GitHub Token 권한
Dependabot 보안
게시물 속 민감 정보
```

다만 개인 정적 블로그 기준으로 30~50개 정도면 충분하며, 100개짜리 장문으로 만들 필요는 없다.

---

## 2. 콘텐츠 라이선스·저작권·인용 정책

부분적으로만 언급했다.

독립적으로 남은 내용:

```text
코드 Snippet 라이선스
Linux Kernel·LLVM 코드 인용
Specification 캡처
책·강의 자료
외부 다이어그램
이미지 라이선스
AI 생성 이미지
Repository License와 글 License 분리
인용 길이
출처 표기
```

실제 기술 블로그에는 꽤 중요한 별도 영역이다.

---

## 3. Backup·보존·데이터 복구

배포 Rollback은 다뤘지만 **장기 보존**은 별개다.

```text
Repository 손실
GitHub 계정 문제
이미지·LFS
외부 Gist
Domain 만료
댓글 데이터
Analytics 의존
정적 Export
오프사이트 Backup
```

다만 Git 저장소 기반이라 범위는 작다.

---

## 4. RSS·구독·배포 채널 전략

RSS 생성 안정성은 언급했지만 콘텐츠 배포 전략은 거의 다루지 않았다.

```text
RSS 전체 본문 vs 요약
Topic별 Feed
Newsletter
GitHub Release
SNS 자동 게시
중복 게시
Canonical
독자 재방문
```

그러나 현재 AdSense와 사이트 구조 개선 우선순위보다 낮다.

---

## 5. 실제 측정과 개선 루프

Analytics 도구의 과잉은 말했지만, 어떤 지표로 사이트를 개선할지는 완전히 정리하지 않았다.

```text
검색 유입 Landing
두 번째 글 도달률
Topic Hub 이동
Zero-result 검색
대표 글 이탈
구판 진입
광고 페이지별 성과
```

다만 Analytics 태스크는 또 검색·Hub·내부 링크와 겹치기 쉽다.

실제로 데이터를 연결해 분석할 때만 가치가 크다.

---

## 6. 국제화·영문 콘텐츠

영어 비중과 `hreflang`을 짧게 언급했지만 독립적으로 다루지 않았다.

```text
한영 URL
번역 콘텐츠
Canonical
용어 표기
코드와 설명 언어
자동 번역
영문 독자 대상
```

현재 영어 콘텐츠를 본격적으로 늘릴 계획이 없다면 생략해도 된다.

---

## 7. 실제 코드베이스 기준 감사

이게 가장 중요한 남은 작업이다.

지금까지는 거의 전부 **보편적인 안티패턴 카탈로그**였다.

아직 하지 않은 것은:

```text
실제 hawk90.github.io Repository
package.json
Astro Config
Directory
Content Schema
Markdown Pipeline
CSS
GitHub Actions
생성 URL
실제 페이지
```

를 보고 다음을 구분하는 일이다.

```text
실제로 존재하는 문제
잠재적 문제
현재는 해당 없음
이미 잘하고 있는 부분
```

일반론은 이제 충분해서, 다음 단계부터는 실제 코드 없이 계속하면 중복 가능성이 매우 높다.

---

# 남은 태스크를 굳이 순서로 정하면

```text
3-28 보안·공급망·공개 정보
3-29 저작권·라이선스·인용
3-30 백업·장기 보존
```

이 세 개 정도가 독립성이 있다.

아래 항목은 필요할 때만 하면 된다.

```text
RSS·배포 채널
Analytics 개선 루프
다국어
```

그리고 그다음은 더 이상 범용 안티패턴을 늘리지 않고:

```text
실제 저장소 감사
→ 발견된 문제만 티켓화
```

로 넘어가는 것이 맞다.

---

# 지금 시점의 추천

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

## 78. user

어 어차피 내가 압축할꺼니깐 남은거 빠르게 설명없이 나열만 가능?

## 79. assistant

가능. **중복 가능성이 낮은 남은 영역만** 빠르게 나열하면 아래 정도다.

# 3-28. 보안·공급망·공개 정보 안티패턴

1. GitHub Actions를 Tag로만 참조  
2. 외부 Action Commit SHA 미고정  
3. Workflow 권한 과다  
4. `pull_request_target`에서 외부 코드 실행  
5. Fork PR에 Secret 노출  
6. 배포 Token 장기 사용  
7. `GITHUB_TOKEN` Write 권한 남용  
8. `PUBLIC_` 환경변수에 Secret 저장  
9. `.env` 파일 Commit  
10. Build 로그에 Secret 출력  
11. Dist에 환경변수 포함  
12. Source Map에 내부 정보 노출  
13. 내부 Hostname·IP 공개  
14. 사내 GitLab·Jira URL 공개  
15. 사용자명·홈 디렉터리 노출  
16. 장비 Serial·MAC 주소 노출  
17. 고객명·프로젝트명 노출  
18. 스크린샷 Redaction 미흡  
19. 이미지 EXIF 미제거  
20. Git History에 삭제된 Secret 잔존  
21. 유출 Credential 미회전  
22. Dependabot 경고 방치  
23. Lockfile 없이 Dependency 설치  
24. Package Version 범위를 과도하게 넓힘  
25. Typosquatting Package 설치  
26. Dependency Confusion 위험  
27. 설치 Script를 가진 패키지 무검토  
28. 사용하지 않는 Dependency 방치  
29. Raw HTML 무제한 허용  
30. MDX에서 임의 JavaScript 실행  
31. Markdown 내 `<script>` 허용  
32. Inline Event Handler 허용  
33. 사용자 입력을 `innerHTML`로 출력  
34. 검색 Highlight XSS  
35. URL Query를 Escape 없이 출력  
36. 외부 iframe Origin 제한 없음  
37. `sandbox` 없는 iframe  
38. 외부 Script 무제한 추가  
39. Subresource Integrity 미사용  
40. CSP 부재 또는 지나치게 느슨함  
41. `unsafe-inline` 상시 허용  
42. `unsafe-eval` 허용  
43. `target="_blank"`에 `noopener` 누락  
44. Open Redirect  
45. Redirect Registry에 외부 URL 허용  
46. `javascript:` URL 허용  
47. Data URL 무제한 허용  
48. SVG 내부 Script 미검사  
49. 업로드 파일 확장자만 신뢰  
50. 보안 검사를 Source에만 적용  
51. Generated Artifact 보안 검사 누락  
52. 관리자·Preview Route 공개  
53. `robots.txt`를 보안 기능으로 사용  
54. Error Page에 Stack Trace 노출  
55. Build Metadata에 내부 경로 노출  
56. Analytics로 검색 원문 전송  
57. 댓글·Embed 개인정보 고지 누락  
58. 보안 헤더 미검토  
59. Domain 탈취 방지 미흡  
60. 사용하지 않는 DNS Record 방치  

# 3-29. 저작권·라이선스·인용 안티패턴

1. 사이트 전체 License 부재  
2. 글과 코드 License를 동일하게 취급  
3. Repository License와 콘텐츠 License 혼동  
4. 외부 코드 Snippet License 미확인  
5. Linux Kernel 코드를 무표기 복사  
6. BSD·MIT 코드 Attribution 누락  
7. GPL 코드와 자체 코드 혼합 설명 부족  
8. Stack Overflow 코드 License 무시  
9. GitHub Gist 코드 무단 복사  
10. 공식 문서 전체 문단 복제  
11. 사양서 대량 인용  
12. 유료 Specification Screenshot 게시  
13. 책의 표·그림 무단 사용  
14. 강의 Slide 캡처 무단 게시  
15. 논문 Figure 무단 복제  
16. 다른 블로그 Diagram 재사용  
17. 출처 링크만 있으면 복제 가능하다고 판단  
18. 번역하면 새로운 저작물이라고 판단  
19. 번역문에 원문 출처 누락  
20. README 전체 복제  
21. Release Note 전체 복제  
22. API 문서 전체 표 복제  
23. 짧은 인용과 본문 복제 구분 없음  
24. 인용부호 없이 원문 사용  
25. 인용 범위가 분석보다 큼  
26. 출처를 글 끝에만 모음  
27. 어떤 주장에 대한 출처인지 불명확  
28. 2차 출처만 인용  
29. 검색 상위 블로그를 원자료처럼 사용  
30. 오래된 출처 Version 미표시  
31. Source Code Commit·Tag 미고정  
32. Line Number만 인용  
33. 이미지 License Metadata 미보존  
34. Unsplash·Wikimedia 조건 미확인  
35. Google 이미지 검색 결과 직접 사용  
36. 회사 내부 Screenshot 공개  
37. 제품 Logo를 공식 제휴처럼 사용  
38. 상표와 저작권 혼동  
39. AI 생성 이미지 권리 범위 미검토  
40. AI가 만든 유사 캐릭터·브랜드 이미지 사용  
41. AI 생성 코드 출처 검증 없음  
42. AI가 만든 가짜 인용·출처 게시  
43. 직접 만든 Diagram의 원자료 미표기  
44. 데이터셋 License 미표시  
45. Benchmark Dataset 재배포 조건 무시  
46. 영상 Screenshot의 권리 미검토  
47. YouTube Thumbnail 무단 재사용  
48. 음악·영상 Embed와 재배포 혼동  
49. 외부 Font License 미확인  
50. Icon Package Attribution 누락  
51. 코드 Font 파일 재배포  
52. 제3자 Asset를 Repository에 무단 포함  
53. 제거 요청 대응 절차 없음  
54. DMCA 연락 경로 없음  
55. 과거 게시물의 License 변경 영향 무시  
56. 공동 작성자 Attribution 누락  
57. 회사 업무 결과물의 소유권 미확인  
58. 퇴사 후 내부 자료 공개 가능하다고 판단  
59. 공개 Repository면 자유 이용 가능하다고 판단  
60. Citation과 Permission을 동일하게 판단  

# 3-30. 백업·장기 보존·복구 안티패턴

1. GitHub를 유일한 백업으로 사용  
2. 로컬 Clone 하나만 보유  
3. Repository 삭제 복구 계획 없음  
4. GitHub 계정 정지 대비 없음  
5. 2단계 인증 복구 코드 미보관  
6. Domain 등록 계정 복구 수단 없음  
7. Domain 자동 갱신 미설정  
8. 결제수단 만료 방치  
9. DNS 설정 백업 없음  
10. Custom Domain 이전 절차 없음  
11. CNAME 기록 미보존  
12. 정적 `dist` Snapshot 미보관  
13. Release 기준점 없음  
14. 대규모 Migration 전 Tag 없음  
15. 대량 Rewrite 전 Branch·Backup 없음  
16. Force Push로 History 손실  
17. Git LFS 객체 별도 백업 없음  
18. LFS Quota 초과 대비 없음  
19. 외부 이미지 Hotlink 의존  
20. Gist를 핵심 콘텐츠 저장소로 사용  
21. 외부 CDN Asset 원본 미보관  
22. 댓글 데이터를 콘텐츠처럼 의존  
23. Giscus Repository 삭제 대비 없음  
24. Analytics 데이터를 유일한 기록으로 사용  
25. Search Console 데이터 Export 없음  
26. AdSense 설정 변경 기록 없음  
27. 생성 Diagram 원본 미보관  
28. SVG 원본 없이 PNG만 보관  
29. Benchmark Raw Data 미보관  
30. 코드 예제 실행 환경 기록 없음  
31. Container·Toolchain Version 미기록  
32. 글에서 참조한 Commit 삭제  
33. Branch 이름만 인용  
34. Git Submodule 원격 삭제 대비 없음  
35. Package Registry 삭제 대비 없음  
36. Build가 인터넷 연결에 의존  
37. 외부 API 없이는 과거 Commit Build 불가  
38. Node Version 미고정  
39. Lockfile 미보존  
40. Deprecated Build Tool 의존  
41. 오래된 OS에서만 Build 가능  
42. Build 절차 문서 없음  
43. 신규 장비에서 재현 불가  
44. Generated 파일과 Source 구분 불명확  
45. Backup 파일을 같은 Repository에 저장  
46. 암호화 없는 개인정보 Backup  
47. Backup 복구 테스트 없음  
48. Backup은 있지만 위치를 모름  
49. Backup 보존 기간 없음  
50. 중복 Backup이 모두 같은 Cloud에 존재  
51. Repository Mirror 없음  
52. Git Bundle·Archive 생성 없음  
53. 이미지 Hash·무결성 검사 없음  
54. 삭제된 문서 Redirect 목록 백업 없음  
55. URL Registry 손실  
56. 콘텐츠 ID 변경 기록 손실  
57. Migration Manifest 즉시 삭제  
58. 복구 Runbook 없음  
59. 복구 우선순위 없음  
60. 실제 복원 연습 없이 백업 완료로 판단  

# 선택적으로 남은 소규모 영역

## RSS·구독

1. RSS에 Draft 포함  
2. 구판이 최신 항목을 밀어냄  
3. Feed ID 불안정  
4. URL 변경 시 중복 항목 생성  
5. 날짜 정렬 불안정  
6. 전체 코드·로그를 Feed에 포함  
7. 상대 URL이 Feed에서 깨짐  
8. 이미지 절대 URL 누락  
9. Topic별 Feed 과다 생성  
10. Feed Discovery Link 누락  
11. RSS와 Sitemap 정책 불일치  
12. Newsletter와 RSS 내용 중복 관리  
13. SNS 자동 게시가 잘린 코드 포함  
14. SNS 제목만 자동 게시  
15. 외부 플랫폼에 전체 본문 중복 게시  
16. Canonical 없는 재게시  
17. 구독 해지·개인정보 정책 누락  
18. 외부 Newsletter 서비스에 과도한 데이터 제공  
19. Feed 생성 실패 무시  
20. Feed Validator 미사용  

## Analytics·개선 루프

1. Page View만 수집  
2. Bot Traffic 미분리  
3. 작성자 방문 포함  
4. 검색어 원문 수집  
5. 내부 Hostname·오류 문자열 수집  
6. 이벤트 이름 난립  
7. 이벤트 Schema Version 없음  
8. 같은 행동을 여러 Analytics에 전송  
9. Consent 전에 Tracking  
10. 광고 차단 사용자를 오류로 판단  
11. 평균 체류 시간만 해석  
12. Bounce를 저품질로 단정  
13. 조회 수로 Featured 결정  
14. Zero-result 검색 방치  
15. 구판 Landing Page 방치  
16. Topic Hub 이동률 미확인  
17. 내부 링크 Click을 과도하게 추적  
18. Dashboard 제작에 과투자  
19. 데이터 보존 기간 없음  
20. 개선 가설 없이 지표 수집  

## 다국어·영문 콘텐츠

1. 자동 번역을 즉시 공개  
2. 한국어·영어 Canonical 충돌  
3. `hreflang` 상호 참조 누락  
4. 언어별 URL 규칙 불일치  
5. 번역본만 최신화  
6. 원문만 최신화  
7. 코드 주석 언어 혼재  
8. 기술 용어 번역 불일치  
9. 영어 문서의 한국어 Metadata  
10. 언어 자동 Redirect  
11. IP 기반 언어 강제  
12. 동일 URL에서 언어를 JavaScript로 교체  
13. 번역 품질 검수 없음  
14. 번역본의 직접 경험 표현 왜곡  
15. 검색 Alias와 번역 용어 혼동  
16. 영어 글 수가 적은데 전체 다국어 Framework 도입  
17. 모든 글 번역을 목표로 설정  
18. 영문 독자 검색 의도 미분석  
19. 날짜·단위·표기 Locale 혼용  
20. RSS·Sitemap 언어 관계 누락  

여기까지가 **기존 목록과 비교적 겹치지 않는 남은 범용 영역 전부**라고 보면 된다.
