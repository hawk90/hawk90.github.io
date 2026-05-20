# 블로그 글쓰기 가이드라인

이 저장소(`hawk90.github.io`)에 글을 쓰거나 다듬을 때 따르는 규칙입니다. 한국어 톤, 구조, 코드 예시, frontmatter 등 모든 결정을 한 자리에 모았습니다.

---

## 1. 두 가지 톤

블로그에 두 톤이 공존합니다. 글의 성격에 따라 골라 씁니다.

### Tone A — `~합니다` 친근체 (기본)

대부분의 시리즈가 이 톤입니다. GoF Design Patterns, Embedded C++, On Writing Well 등.

특징:
- `~합니다` 종결
- 독자를 옆에 두고 설명하는 어조 — "**일부는 맞고, 일부는 틀립니다.**"
- 가끔 독자 호명 — "들어본 적 있으신가요?"
- "**한 줄 요약**", "**어떤 문제를 푸는가**", "**언제 쓰면 좋은가**" 같은 Q&A 형식 헤더
- 핵심을 굵은 글씨로
- 콜아웃(`> ⚠️`, `> **메모**`) 가끔
- 예: "두 평행 계층이 핵심입니다."

### Tone B — `~다` 평어 (기술 레퍼런스)

EMC++(Effective Modern C++) 같은 *항목식 기술 레퍼런스*에 씁니다.

특징:
- `~다` 종결 (평서문)
- 차분한 기술 문서체, 호명 없음
- "Modern C++의 거의 모든 핵심 기능이 **템플릿 타입 추론** 위에 서 있다."
- 단호하고 짧은 문장 위주
- 굵은 글씨는 핵심 용어에만

### 어느 톤을 쓸지

| 글 성격 | 톤 |
|---------|-----|
| 시리즈 개요 / 입문 / 동기 부여 | A |
| 알고리즘·패턴·시스템 설명 | A |
| Item-by-item 레퍼런스 (Effective ~ 책 따라가는 류) | B |
| 책 요약(book-review) | A 또는 B (시리즈 톤 따름) |
| 코딩 표준(MISRA/Google C++ 등) | B (가독성 우선이라면 A도 OK) |

**한 시리즈 안에서는 한 톤만.** 시리즈 첫 글의 톤을 정하면 끝까지 유지합니다.

---

## 2. 한국어 산문 규칙

번역체로 빠지지 않게 다음을 지킵니다.

### 해야 할 것

- **완성 문장으로 끝낸다.** 명사로 끊지 않습니다.
  - O: "이 결정의 이유는 호환성 비용이다."
  - X: "이 결정의 이유 — 호환성 비용."

- **단락은 두세 문장 이상.** 한 줄짜리 단락이 줄줄이 이어지면 호흡이 끊깁니다.

- **연결어로 흐름을 만든다.** "다만", "반대로", "그래서", "이때", "이렇게 되면".

- **표·코드 블록으로 구조화한다.** 정보가 많을 때 산문 대신 표로.

### 하지 말 것

- **Em-dash(`—`) 체인 금지.** 한 문장에 두 번 이상의 `—`는 거의 항상 번역체입니다.
  - X: "Google C++ Style Guide — Google 사내에서 — 수렴된 규칙. 처음엔 — 사내 문서."
  - O: "Google C++ Style Guide는 Google 사내에서 십수 년에 걸쳐 수렴된 규칙이다. 처음에는 사내 문서로 출발했다."

- **fragment 문장 금지.** 명사 뒤에 마침표만 찍는 것.
  - X: "거대 코드베이스의 일관성 우선."
  - O: "거대 코드베이스에서는 일관성이 우선이다."

- **"~것이다"의 남발 금지.** 가능하면 동사로 끝내거나 명사 + ~다로.
  - X: "그 이유는 호환성 비용이라는 것이다."
  - O: "그 이유는 호환성 비용이다."

- **"당신"·"여러분" 호명 남발 금지.** 친근체에서도 자제. 필요할 때만.

### 외래어 표기

- 영어 약어·고유명사는 원어 그대로: `unique_ptr`, `noexcept`, `Abseil`, `Status`.
- 일반 외래어는 한국어 표기: 인터페이스, 컴파일러, 라이브러리, 매크로.
- 코드 식별자는 항상 백틱: `std::vector`, `RETURN_IF_ERROR`.

---

## 3. 글 구조

### 시리즈 글의 표준 흐름

```
H1 (frontmatter title)
└ 도입 1~2문단 — 이 글이 무엇을 다루는지, 왜 필요한지

## 본 섹션들 (보통 3~6개)
  ├ 도입 1문단 — 이 절이 다루는 것
  ├ 본문 (코드/표/산문 조합)
  └ 작은 예시 또는 정리

## 작은 예시 — 전체 적용 (선택)
   현실적인 코드 한 장으로 묶기

## 정리
   - 불릿 5~8개 — 한 글의 핵심을 한눈에

## 다음 장 예고
   다음 글이 무엇을 다룰지 1~2문장

## 관련 항목
   - 이전/다음 글 링크
   - 다른 시리즈와의 교차 링크
   - 원문 링크 (책 요약일 때)
```

### Tone A 시리즈의 추가 패턴

다음 헤더를 자주 씁니다.

- `## 한 줄 요약`
- `## 어떤 문제를 푸는가`
- `## 언제 쓰면 좋은가`
- `## 언제 쓰면 안 되나`
- `## 한눈에 보는 구조`

### 헤더 깊이

`H1`은 frontmatter `title`이 자동으로 들어가므로 본문에서는 `##`(H2)부터 시작합니다. `####`(H4)까지가 보통 한계입니다.

---

## 4. Frontmatter

### 필수 필드

```yaml
---
title: "Ch 1: Header Files"             # 시리즈면 "Ch N:" 또는 "Item N:" 접두사
date: 2025-05-13T10:00:00               # 시리즈는 같은 날짜 + 시간으로 정렬
description: "한 문장으로 글의 요점 — 검색·SEO용"
series: "Series Name"                    # 시리즈에 속하면 필수
seriesOrder: 1                           # 시리즈 안 순서
tags: [tag1, tag2, tag3]                 # 5개 이하 권장
draft: false                             # true면 빌드에서 제외
---
```

### Book-review 시리즈의 추가 필드

```yaml
type: book-review
bookTitle: "Working Effectively with Legacy Code"
bookAuthor: "Michael Feathers"
```

### draft 플래그

- 작성 중이거나 확신이 안 서면 `draft: true`.
- 사용자가 "발행해" / "draft 풀어"라고 한 글만 `draft: false`.
- 모르겠으면 `draft: true`가 안전.

---

## 5. 코드 예시

### 풍부하게

규칙 하나에 *최소 한 번*의 코드 예시. 회피/권장 패턴이 있으면 **before/after 쌍**으로 보여 줍니다.

```cpp
// 회피
void GetUser(int id, User* out_user);
User u;
GetUser(42, &u);

// Good
User GetUser(int id);
User u = GetUser(42);
```

주석 라벨은 일관되게 — `// Good` / `// 회피` / `// Bad` / `// OK`.

### 현실적인 예

가능하면 실제 코드베이스에서 나올 법한 시그니처와 이름. `Foo`/`Bar`보다 `OrderProcessor`/`UserTable`.

```cpp
// 추상적 (회피)
class A { void Method(B* b); };

// 구체적 (Good)
class OrderProcessor {
    absl::Status Process(const Order& order);
};
```

### 언어와 syntax highlight

**모든 코드 블록에 언어 태그 필수**. expressive-code가 적절히 처리하도록 — 빈 ` ``` `는 *지양*.

| 내용 | 언어 태그 |
|------|----------|
| C++ | ` ```cpp ` |
| C | ` ```c ` |
| Python | ` ```python ` |
| Rust | ` ```rust ` |
| Go | ` ```go ` |
| JavaScript / TypeScript | ` ```js ` / ` ```ts ` |
| Bash 명령 (실행) | ` ```bash ` |
| 셸 세션 (`$` 프롬프트 + 출력 섞임) | ` ```text ` |
| 디렉토리 트리·ASCII 구조 | ` ```text ` |
| 컴파일러·툴 출력·로그·에러 메시지 | ` ```text ` |
| 의사 코드 (어느 언어도 아닌 알고리즘 설명) | ` ```text ` |
| Makefile | ` ```makefile ` |
| CMake | ` ```cmake ` |
| YAML / JSON / TOML / INI | ` ```yaml ` / ` ```json ` / ` ```toml ` / ` ```ini ` |
| HTML / CSS | ` ```html ` / ` ```css ` |
| SQL | ` ```sql ` |

**`shell` 태그는 피한다** — `bash`/`text` 둘 중에 선택. `shell`은 expressive-code가 *프롬프트·키워드*를 과하게 강조해 트리·출력이 어색해진다.

**코드 블록은 "기계가 읽는 것" 전용**. *한국어 산문·설명문은 코드 블록에 넣지 않는다*. 그 외는 거의 다 OK.

| 허용 | 금지 |
|------|------|
| 소스 코드 (언어 태그 필수) | 한국어 산문·정의·설명 |
| `bash` 명령·셸 세션 | "특징:" 같은 항목 나열만 (불릿으로 빼라) |
| 컴파일러·툴 출력·로그·에러 메시지 | 비교·매핑 — 표로 |
| 디렉토리 트리 | ASCII 박스 다이어그램 — TikZ로 |
| pseudocode (알고리즘) | |
| UML·문법 표기 sample (`- balance : Money = 0 {readOnly}`) | |
| 설정 파일 (YAML·JSON·TOML·Makefile·CMake) | |

판단 기준: "이 블록 안 내용을 *한국어로 풀어 읽으면 자연스러운가*?" *그렇다면 산문이고, 본문으로 빼야 한다.* "기계가 파싱하는 형식이거나 출력이라면" 코드 블록 OK.

### 코드 길이

본문 흐름을 끊지 않도록 한 블록 30줄 이내가 보통. 더 길면 절을 나누거나 "작은 예시" 섹션으로 모읍니다.

---

## 6. 시각 자료

### 형식 선택 기준

다이어그램은 *내용 성격*에 맞춰 도구를 고릅니다.

| 도구 | 적합한 경우 | 적합하지 않은 경우 |
|------|-------------|-------------------|
| **TikZ** (→ SVG) | *모든* 다이어그램 — 메모리 레이아웃, 캐시 라인, bar chart, 격자, 수학 도형, flowchart, timeline, sequence, state machine, UML | — |
| **TikZ + PGFPlots** | math 함수 plot, 벡터 도형, 적분, FFT, 통계 — *책급 정적* | 인터랙티브 |
| **마크다운 표** | 비교 / 매핑 / 카탈로그 | 공간 관계가 의미 있는 그림 |
| **마크다운 리스트** | 제목 + 항목식 정보 | 흐름 / 의존성 |
| **코드 블록** | 코드 / 트레이스 / 디렉토리 트리 / 출력·로그 / ASCII가 곧 의미 (*항상 언어 태그 — `text` 또는 명시 언어*) | 진짜 시각 다이어그램, 산문 |
| **KaTeX** (`$$ ... $$`) | 수학 수식 | 그림 |

#### 결정 규칙

1. **시각 정보인가?** (공간 배치·관계·흐름·계층·상태 전이 — state machine, sequence, architecture, dataflow, class/component diagram, layout, pyramid, network topology, timeline 등) → **TikZ가 최우선**.
2. **순수 데이터·카탈로그인가?** (symbol → meaning 매핑, 비교 매트릭스, 메트릭 값, 단계 *목록* 자체) → 표/리스트.
3. **수식?** → KaTeX.

> **ASCII art → TikZ 우선**: ASCII 박스 다이어그램(`┌──┐`)을 마주치면 *기본 변환 대상은 TikZ*. 표는 시각 정보가 없을 때만 fallback. 모호하면 TikZ로 간다.
> **Mermaid 사용 안 함**: sequence/state는 `_design-sequence.tex` / `_design-state.tex`로. graph·flowchart는 `_design.tex`로. 모든 다이어그램이 *pre-built SVG*로 통일.

### 다이어그램 파일 배치

- **TikZ**: `public/images/blog/<series>/diagrams/<name>.tex` + 빌드된 `.svg`
- 빌드: `npm run diagrams` (증분) / `npm run diagrams:force` (전체) / `npm run diagrams:watch` (감시)
- 내부적으로 `scripts/build-diagrams.sh` 실행 — xelatex/pdflatex → PDF → pdftocairo SVG

```markdown
![구조 설명](/images/blog/gof/diagrams/item01-abstract-factory.svg)
```

디자인 토큰:

- `_design.tex` — 일반 (UML·트리·그래프·flowchart)
- `_design-math.tex` — math (PGFPlots, book-notes 팔레트)
- `_design-sequence.tex` — sequence diagram
- `_design-state.tex` — state machine / FSM

### TikZ 작성 기준 (가독성 보장)

가독성 떨어지는 다이어그램의 대부분은 좌표·라벨 충돌 때문입니다. 새 `.tex`를 만들 때 다음 규칙을 따릅니다.

**프리앰블·스타일**

- 모든 .tex는 `\input{../../_design.tex}` (상대 경로 조정)로 공통 프리앰블을 불러온다.
- `\begin{tikzpicture}[blog]`로 `blog` 스타일 적용. 폰트·줄간격 통일.
- 색상은 **`text=color`** / **`draw=color`** / **`fill=color`**로 명시. `\node[..., conbord]` 같이 색상명을 옵션으로 쓰면 무시되거나 silent fail.

**멀티라인 노드**

- 노드 안 줄바꿈은 `\\` 대신 **`\\[2pt]`**. 디폴트 줄간격은 글리프 ascender/descender와 겹쳐 텍스트가 윗줄·아랫줄과 충돌한다.
- 긴 텍스트는 `text width=3cm, align=center`로 자동 줄바꿈. 수동 `\\`보다 안전.

**좌표·라벨 위치**

- 고정 좌표 `\node at (x, y) {긴 한글 라벨...}`을 쓸 때 라벨 폭을 미리 계산. 인접 노드 영역에 침범하지 않게 한다.
- 표·격자 다이어그램의 행별 주석은 표 우측 *끝 + 1cm* 이상에 둔다.
- 좌표 투영 연산자 순서: `(A.south west |- 0, -1.5)` — `|-`는 *첫 인자의 x* + *둘째 인자의 y*. y가 두 번째 좌표.
- 회전 라벨 (`rotate=90`)은 anchor가 헷갈리고 충돌 잡기 어렵다. 가능하면 일반 라벨을 위/아래에 배치.

**박스 간격**

- 같은 행의 두 박스: *중심 간 거리 ≥ 박스 폭 + 0.5cm*.
- 트리 다이어그램에서 좌우 분기가 있으면 *level 1 sibling distance ≥ 양쪽 자식 폭 합 + 여유*.

**검증**

- 작성·수정 후: `python3 scripts/detect-text-overlap.py --series <name>` 로 충돌 확인.
- 출력의 `olap` 열이 0이면 strict overlap 없음. `touch` 열은 0.5pt 미만 근접(시각 거슬릴 수 있음).
- 휴리스틱 빠른 점검: `scripts/detect-tikz-overlap.sh`.

### 표

비교·요약·매핑에는 표를 적극 활용. 산문 3문단보다 표 1개가 읽기 좋은 경우가 많습니다.

```markdown
| 종류 | 스타일 | 예 |
|------|--------|-----|
| 타입 | PascalCase | MyClass |
| 변수 | snake_case | my_var |
```

---

## 7. 교차 링크

### 같은 시리즈 안

이전/다음 + 직접 관련 항목.

```markdown
## 관련 항목

- [Ch 2: Header Files](/blog/embedded/standards/google-cpp/chapter02-header-files)
- [Ch 4: Classes](/blog/embedded/standards/google-cpp/chapter04-classes)
```

### 다른 시리즈로

개념이 겹치는 글을 1~2개 골라 링크. 너무 많으면 노이즈.

```markdown
- [Refactoring Ch 6: Extract Function](/blog/programming/design/refactoring/ch06) — sprout의 일반화
- [Clean Architecture Ch 11: DIP](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle)
```

링크 뒤에 짧은 설명(`— ...`)이 있으면 클릭 결정에 도움이 됩니다.

### 원문 / 외부

책 요약이나 가이드 정리는 원문 링크를 꼭 둡니다.

```markdown
- [원문 — Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
```

---

## 8. 카테고리

`src/consts/categories.ts`에 정의된 상위/하위 카테고리에 맞게 디렉터리를 정합니다.

```
programming/cpp        — C/C++ 언어
programming/design     — 디자인 패턴, 아키텍처
programming/algorithms — 자료구조, 알고리즘
programming/engineering — 소프트웨어 공학 (TDD, Legacy, Refactoring)
programming/git        — Git

systems                — OS, 커널, 시스템 프로그래밍
embedded               — RTOS, MCU, 트러블슈팅
embedded/standards     — MISRA, CERT, AUTOSAR, Google C++

parallel               — 병렬·동시성
math                   — 선형대수, 집합론
writing                — 영문/한국어/학술 글쓰기
thinking               — 디자인·철학
code-review            — 코드 리뷰
tools                  — Vim, tmux, CLI, 디버거
media                  — 영상·오디오 코덱
media/av1              — AV1
```

새 시리즈를 만들 때 적합한 자리가 없으면 `categories.ts`에 카테고리를 추가합니다.

---

## 9. 시리즈 양산 워크플로

긴 시리즈(20+편)는 다음 순서로 진행합니다.

1. **스텁 생성** — 모든 챕터의 frontmatter + 빈 본문(또는 outline). `draft: true`.
2. **개요 + 1편 파일럿** — 시리즈 개요(00-overview)와 1편을 완성도 있게.
3. **사용자 확인** — 톤·구조·예시 깊이가 맞는지 검토.
4. **양산** — 2편부터 끝까지. 5~6편씩 묶어 커밋.
5. **마무리** — 마지막 글에 시리즈 요약 + 다음 추천 시리즈.

각 단계가 끝날 때마다 `npm run build`로 빌드 검증.

---

## 10. 흔한 실수

다음은 자주 발생하는 실수 모음. 작성·리뷰 시 체크리스트로 활용하세요.

### 톤 관련

- [ ] 한 글 안에서 `~합니다`와 `~다`를 섞지 않았는가?
- [ ] em-dash 체인이 한 문장에 두 번 이상 들어가지 않았는가?
- [ ] 명사로 끝나는 fragment 문장이 줄줄이 이어지지 않는가?

### 구조

- [ ] H2부터 시작했는가? (H1은 frontmatter)
- [ ] "정리", "다음 장 예고", "관련 항목" 섹션이 있는가?
- [ ] 코드 예시가 규칙마다 최소 한 개씩 있는가?

### 코드 블록

- [ ] *모든* 코드 블록에 언어 태그를 붙였는가? (빈 ` ``` ` 금지)
- [ ] `shell` 대신 `bash`(실행) / `text`(트리·출력·의사코드)를 썼는가?
- [ ] 한국어 산문을 코드 블록에 *넣지 않았는가*? (산문은 markdown, 비교는 표)

### Frontmatter

- [ ] `draft`가 의도대로 설정되어 있는가?
- [ ] `series`/`seriesOrder`가 시리즈 안에서 충돌하지 않는가?
- [ ] `description`이 검색에 의미 있는 한 문장인가?

### 링크

- [ ] 내부 링크가 절대 경로(`/blog/...`)인가? 상대 경로 아닌가?
- [ ] 다음/이전 글 링크가 양방향으로 일관된가?

### 시각 자료

- [ ] ASCII 박스 다이어그램(`┌──┐`)을 결과물에 남기지 않았는가?
- [ ] **Mermaid 블록**(` ```mermaid `)을 *전혀* 쓰지 않았는가? (sequence는 `_design-sequence.tex`, state는 `_design-state.tex`, 나머지는 `_design.tex`로)
- [ ] 표·리스트로 충분한 정보를 *불필요한 그림*으로 그리지 않았는가?
- [ ] *한 챕터에 이미지가 0개*인데 추상 개념(channel·STM·NDRange·HAMT 등)이 있다면 보강 검토했는가? (§11 접근성)

### 접근성 (§11 신규)

- [ ] H2 절마다 *동기 단락*(왜 이게 문제인가)이 형식 정의 *앞*에 있는가?
- [ ] 일상 비유가 *챕터당 최소 3개* 있는가? (lock=화장실 문, channel=컨베이어, mailbox=사서함 등)
- [ ] *실 시스템 사례*가 1-2개 인용됐는가? (Redis·Kafka·WhatsApp·NVIDIA 등)
- [ ] 코드 블록 *직전 한 문장*이 *이 코드의 의도*를 말해 주는가?
- [ ] 책 시리즈라면 *책 출간 후 신기술*을 새 챕터로 끌어들이지 않았는가?

### TikZ

- [ ] `\input{../../_design.tex}` + `\begin{tikzpicture}[blog]`를 썼는가?
- [ ] 멀티라인 노드의 `\\`가 `\\[2pt]`로 명시 간격을 가졌는가?
- [ ] 색상을 `text=color` / `draw=color` 형태로 명시했는가? (옵션 자리에 색상명만 쓰면 무시)
- [ ] `(A.south west |- 0, -1.5)` 형태로 y가 두 번째에 들어갔는가?
- [ ] `python3 scripts/detect-text-overlap.py --series <X>`로 `olap` 0 확인했는가?

### Frontmatter 중복 키

- 빌드 실패의 흔한 원인 — `draft: false`와 `draft: true`가 한 frontmatter에 모두 있는 경우. YAML이 거부합니다. 한 키는 한 번만.

---

## 11. 접근성 — 직관·비유·사례

기술 깊이가 깊을수록 *직관 설명*이 필요합니다. 책 listings·정형 증명만 늘어놓으면 *전문가용 reference*가 되어 일반 독자가 따라오지 못합니다. 본문이 *형식 정의로 시작*하면 거의 항상 보강 대상입니다.

### 절마다 들어가야 할 4가지

1. **동기 단락 (Why)** — H2 절을 시작하기 전 *3-4 문장*. *이 문제가 왜 풀려야 하는가*. 형식 정의보다 *앞*에 놓습니다.
2. **일상 비유** — 추상 개념을 *물리 세계*로 mapping. 한 챕터에 *최소 3개* 비유.
   - lock → 화장실 문 / 회의실 예약
   - channel → 컨베이어 벨트 / 사물함
   - actor mailbox → 우체국 사서함
   - STM transaction → 은행 송금 (둘 다 성공 or 둘 다 취소)
   - consensus → 위원회 만장일치
   - GPU SIMT → 수천 명 고등학생이 똑같은 문제 풂
   - HAMT 구조 공유 → 가계도 (새 가지 생겨도 다른 가계는 그대로)
3. **실 시스템 사례** — 비유로 *왜 중요*했으면, 사례로 *어디서 쓰는지*. *최소 1-2 사례*.
   - Redis lock-free ops, Kafka producer thread pool
   - WhatsApp Erlang (9명이 100M 동시 접속), Discord Elixir
   - Bitcoin GPU 채굴, NVIDIA CUDA 딥러닝
   - Twitter Lambda 시작 사례, Netflix Mantis
4. **코드 직전 한 문장** — 코드 블록 *바로 위*에 *이 코드가 무엇을 시연하는지* 1-2 문장.

### 형식 → 직관 순서

책 listings·정형 증명을 *그대로 옮기지* 않습니다. 다음 순서로 재배치합니다.

1. *직관 단락* (왜 이게 문제인가)
2. *비유* (일상으로 매핑)
3. *간단한 예* (가장 작은 case)
4. *형식 정의* (책의 정의)
5. *전체 코드/증명* (책의 listing/proof)
6. *시스템 사례* (실무 적용)

이 순서를 거꾸로(*형식 먼저*) 가는 글은 *전문가만* 읽습니다.

### 책 범위 안에서

Book-review 시리즈는 *책 챕터 1:1*로 매핑이 원칙입니다. 다음을 *지킵니다*.

- **책 출간 후 신기술 추가 금지** — 책이 *Hadoop·Storm*을 다룬다면 Spark·Flink는 *책 wrap-up에서만* 짧게 언급, 별도 챕터 *금지*.
- **외부 모델·라이브러리 추가 금지** — Paul Butcher의 7CM은 *Java·Clojure·Elixir·OpenCL* 중심이라 Go/async/Rust는 *별도 챕터로 추가하지 않습니다*.
- **깊이는 책 listings**로 — 책에 있는 Listing 1.1, 1.2 같은 코드 예제를 *충분히 풀이*. 책 밖 코드는 자제.
- **확장은 책 범위 내** — 챕터가 얇으면 *책의 Day 1/Day 2/Day 3 + Wrap-Up*을 복원하는 방식으로 보강. 책 outline 외 새 절 추가 자제.

### 검증 신호

다음 상황이 보이면 *접근성 부족* 신호입니다.

- **한 챕터에 *이미지 0개*** — 추상 개념(channel·STM·NDRange 같은)이 있는데 시각화 0개.
- **연속 H2 절이 *모두 형식 정의*로 시작** — 직관 단락이 없음.
- **`text` 블록에 ASCII 다이어그램** (`┌──┐`, `→`, `▶`) — *반드시 TikZ로 교체*.
- **`text` 블록에 *한국어 산문*이 들어가 있음** — 본문으로 빼내야 함.
- **코드 블록 *직전 문장*이 없음** — `## 예` 헤더 직후 바로 코드.
- ***시스템 사례 0개*** — 한 챕터에 실 사례 인용이 없으면 reader가 "*그래서 쓸 데가 있나*"라고 묻게 됨.

## 12. 동기화된 콘텐츠

다음은 다른 저장소에서 동기화되는 콘텐츠입니다. **직접 편집하지 마세요.**

- `src/content/blog/math/linear-algebra/**` — `../book-notes/`에서 `npm run sync:book-notes`로 동기화.

원본을 수정하고 동기화 스크립트를 다시 돌리는 방식으로 작업합니다.

---

## 13. 작업 원칙 (사용자가 자주 강조한 것)

- **드래프트 우선.** 글을 한 번에 완성으로 보지 않습니다. 사용자가 "발행" 또는 "draft 풀어"라고 하기 전까지 모두 draft.
- **반복 수정 허용.** 한 시리즈 안에서도 톤·예시·구조를 사용자가 피드백하면 즉시 반영.
- **사용자가 직접 결정하는 것** — 톤 전환, 발행 여부, 시리즈 추가/제거, 카테고리 변경.
- **AI가 결정하는 것** — 코드 예시 선택, 단락 흐름, 절 분할, 표 사용 여부.
- **overview 글 만들지 않기.** 새 시리즈를 만들 때 별도의 *overview / preface / 00-* 글을 추가하지 않습니다. 시리즈 첫 글이 도입을 겸하면 충분합니다.

  예외(이 네 시리즈만 1편짜리 overview 허용):
  - Embedded C++ for Real Systems
  - Modern Embedded Recipes
  - Embedded Performance Engineering
  - Practical RTOS Internals
