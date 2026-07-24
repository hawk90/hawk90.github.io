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

> **Publish 전 강제 검증**: `./scripts/detect-ascii-diagrams.sh` — 박스 다이어그램·bar chart 자동 탐지. *위반 발견 시 빌드 OK여도 publish 금지*. 디렉토리 트리(`├──`·`└──`)만 허용 예외.

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

**검증 — Publish 전 필수**

| 검사 | 명령 | 통과 기준 |
|------|------|----------|
| ASCII 박스 다이어그램 | `./scripts/detect-ascii-diagrams.sh` | 출력 "No ASCII box diagram violations found." |
| TikZ 텍스트 겹침 (strict) | `python3 scripts/detect-text-overlap.py --series <name>` | `olap` 열 = 0 |
| TikZ 텍스트 근접 (heuristic) | `./scripts/detect-tikz-overlap.sh` | warning 0건 |
| 코드 블록 내 한국어 산문 | `./scripts/detect-prose-in-code.sh` | 위반 없음 |
| Hallucination 후보 | `./scripts/audit-suspect-claims.sh` | 출력된 candidate를 사람이 review |
| Known-fact 화이트리스트 | `./scripts/verify-known-facts.sh` | `data/known-facts.yaml` 등재된 것만 통과 |
| **통합 gate** | `./scripts/audit-publish-gate.sh` | 위 6가지를 한 번에. `--strict`로 hallucination·whitelist도 차단 |
| **Git hook (자동)** | `lefthook install` 한 번 실행 → 매 commit/push 자동 trigger | 위반 시 commit/push 거부 |

*Publish 전 통합 gate 통과 필수*. 빌드가 OK여도 *위반이 있으면 publish 금지*. lefthook이 설치되면 *commit 시 자동*으로 staged .md 파일에 gate가 적용됩니다 (`git commit --no-verify`로 우회 가능, 단 책임 본인).

`audit-suspect-claims.sh`는 CLAUDE.md §10 "Hallucination 방지" 7 카테고리를 *자동 grep*. *후보 = hallucination 아님*. 각 위치를 *사람이 review*해 진위 확인 후 qualify·수정.

7 카테고리: `future-sku`, `spec-num`, `kernel-api`, `company-impl`, `codename`, `yaml-schema`, `spec-year`. 특정 카테고리만 검사하려면 `--category <name>`.

`verify-known-facts.sh`는 *whitelist 기반*: 글에 등장하는 spec 번호·제품 SKU·표준 이름이 `data/known-facts.yaml`에 *등재된 것만 통과*. 새 fact 발견 시 *공식 출처를 comment로* 등재.

`audit-fact-density.sh`는 *universal*: *모든 챕터*에서 *구체적 주장*(단위 있는 수치·버전·연도·표준·SKU·회사+제품) 빈도를 측정해 *fact-heavy 챕터*를 자동 ranking. *카테고리 무관·targeting 없음*. *Threshold 초과 챕터는 publish 전 수동 review 우선순위*. 7 카테고리 grep과 달리 *어떤 주제의 글이든 적용 가능*합니다.

### 표

비교·요약·매핑에는 표를 적극 활용. 산문 3문단보다 표 1개가 읽기 좋은 경우가 많습니다.

```markdown
| 종류 | 스타일 | 예 |
|------|--------|-----|
| 타입 | PascalCase | MyClass |
| 변수 | snake_case | my_var |
```

