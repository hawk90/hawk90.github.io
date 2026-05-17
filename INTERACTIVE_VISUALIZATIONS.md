# Interactive Visualizations 설계

> Astro 블로그의 *시각화 도구 일관성*과 *코드 실행 + 알고리즘 시각화* 표준.
> 첫 적용 대상: `programming/algorithms/data-structures-and-algorithms` (DSA).

---

## 목적과 일관성 원칙

CLAUDE.md의 다이어그램 규칙은 *정적 시각*까지 다룬다. 이 문서는 그 위에 *인터랙티브* 영역까지 확장하며, **블로그 전체가 아닌 카테고리 단위 일관성**을 원칙으로 한다.

### 카테고리 단위 일관성

블로그 전체에 *하나의 시각 언어*를 강제하면 — 수학·알고리즘·시스템 도형의 *각자 최적 도구*를 못 쓰게 된다. 반대로 글마다 다른 도구를 섞으면 — 한 카테고리 안에서 미감이 튀어 학습에 방해.

**합의점** — *카테고리(또는 sub-category) 단위로 한 도구만 쓴다.*

- DSA 안에 들어가면 모든 그림이 *Svelte + D3* (인터랙티브)
- 수학 카테고리 — *TikZ + PGFPlots* (책급 정적). 인터랙티브는 예외 한정.
- 시스템·임베디드 안에서는 *TikZ* (정적)
- 카테고리 *경계*에서만 시각 언어가 바뀌고, *경계 안*에서는 통일

크로스링크가 있어도 *읽는 사람이 카테고리 경계를 인지*하면 자연스럽다 (책의 챕터별 스타일과 같음).

### 도구별 책임 영역

| 도구 | 책임 카테고리 | 결과 형태 |
|------|--------------|----------|
| **TikZ (+ PGFPlots) → SVG** | math 전부 + 시스템·임베디드·미디어·표준·아키텍처 (사실상 *전부*). sequence/state 포함. | 책급 정적 SVG, `_design*.tex` 통일 |
| **Svelte + D3 + Canvas** | DSA·일부 ML compiler·일부 GNC | Astro island, step trace, 학습용 |
| **Three.js** (보류) | 3D 궤적 (GNC 6-DoF, spacecraft) | 도입 시점 추후 결정 |
| ~~Mermaid~~ | (도입 안 함 — sequence/state도 `_design-sequence.tex`·`_design-state.tex`로) | — |
| ~~Manim → MP4~~ | (도입 안 함 — 정적 책급은 PGFPlots가 우수, 영상은 블로그 성격에 안 맞음) | — |

각 카테고리는 *한 도구를 default*로 정하고, 그 안에서는 그것만 쓴다.

### 왜 math = TikZ + PGFPlots

수학 그림은 *책급 퀄리티*가 기준이다. PRML·Bishop·Strang 등 학술서의 그림이 PGFPlots 산출이고, LaTeX 폰트로 모든 텍스트·수식이 렌더되어 *KaTeX 본문 inline 수식과 완벽히 일관*. 벡터 SVG라 zoom 무한대 깨끗.

빌드 토대는 *이미 있음* — `scripts/build-diagrams.sh`의 xelatex/pdflatex 파이프라인에 `\usepackage{pgfplots}` 한 줄만 추가하면 됨.

- 함수 plot, contour, 3D surface, vector field, slope field — PGFPlots
- 행렬 변환, 벡터 도형, 격자, 좌표 — TikZ
- 둘 결합 — `\begin{axis}` 안에서 TikZ 노드·화살표 자유 사용

**Manim의 한계** — *동적*에서 좋지만 *정적 한 컷*은 책급에 못 미친다. 영상이 무겁고 *능동적 읽기*를 방해. 블로그는 텍스트·코드·그림 중심이지 영상 채널이 아니다.

### 설치·인프라 현황 (2026-05-17)

- ✅ **TeX Live 2023** (MacTeX) — `xelatex`, `pdflatex` 사용 가능
- ✅ **pgfplots.sty** + **pgfplotstable.sty** 기본 포함

**디자인 토큰 — `public/images/blog/_design*.tex`**

| 파일 | 용도 | 비고 |
|------|------|------|
| `_design.tex` | UML·트리·그래프 등 *일반* (default) | 강화됨 — `prp/tealn/warn/ok/neut` 노드, `comp/realize/msgsync/msgasync/flow/focus/selfloop` 엣지, `note/badge/panel`, Sm/Lg variants |
| `_design-math.tex` | math 함수 plot·벡터 — *TikZ + PGFPlots* | book-notes 팔레트(VECA/B/C/D/E/F + INK/MUTE) 통일. `mathaxis`·`fn1-6`·`pts`·`iterstep` |
| `_design-sequence.tex` | sequence diagram | `actor/lifeline/activation/msglabel/frame/seqnote` |
| `_design-state.tex` | state machine / FSM | `stateBox/initial/final/choice/junction/forkbar/trans/composite` |

전부 *backward compatible* (기존 270+ 다이어그램 스타일 유지).

빌드 — `_` prefix 파일은 build script가 자동 skip, 일반 .tex만 컴파일.

**math 다이어그램 작성 템플릿**

```latex
\documentclass[border=10pt,tikz]{standalone}
\usepackage{tikz}
\usepackage{pgfplots}
\usepackage{amsmath,amssymb}
\usetikzlibrary{positioning,arrows.meta,shapes,calc}
\begin{document}
\input{../_design-math.tex}        % 상대 경로 조정
\begin{tikzpicture}[math]
  \begin{axis}[mathaxis, xlabel={$x$}, ylabel={$f(x)$}]
    \addplot[fn1] {x^2 - 2};       % 함수 곡선
    \addplot[fn4d, domain=...] {...};  % 점선 보조 곡선
  \end{axis}
\end{tikzpicture}
\end{document}
```

저장 위치: `public/images/blog/<series>/diagrams/<name>.tex`.
빌드: `npm run diagrams` (증분) / `npm run diagrams:force` (전체).

### 디자인 토큰 공유

도구는 카테고리별로 다르더라도, *색·폰트·노드 모양* 같은 디자인 토큰은 공유해 *경계 전환의 충격*을 줄인다.

```
public/images/blog/_design.tex   ← TikZ용 (existing)
src/styles/diagram-tokens.css    ← Svelte/D3용 (신규)
src/lib/diagram-tokens.ts        ← JS에서 import (신규)
```

같은 RGB·같은 spacing·같은 폰트 가족을 *세 곳에서 mirror*. TikZ로 그린 BST와 Svelte로 그린 BST가 *나란히 놓여도 색·폰트가 같음*.

PGFPlots는 *같은 LaTeX 파이프라인*이라 TikZ와 디자인 토큰 자동 공유. Svelte/D3는 위 세 곳(`_design.tex`·`diagram-tokens.css`·`diagram-tokens.ts`)을 mirror해 정렬.

### 다루는 범위

- Binary search tree·heap·graph 등 *자료구조 step trace*
- 정렬·shortest path·DP 등 *알고리즘 진행 시각화*
- 사용자가 *입력을 바꾸거나 코드를 편집*해 즉시 결과 확인
- 디자인 토큰 정의·공유 패턴

### 다루지 않는 범위

- 수학 *책급 정적 그림* (TikZ + PGFPlots → SVG)
- 시스템·캐시·메모리 *정적* 도형 (TikZ → SVG)
- sequence diagram·state machine (TikZ — `_design-sequence.tex` / `_design-state.tex`)
- 비디오 형태 시각화 (블로그 성격에 맞지 않음, 도입 안 함)
- Mermaid (전혀 사용 안 함, 모든 다이어그램은 pre-built SVG)

---

## 스택

| 레이어 | 도구 | 역할 |
|--------|------|------|
| 코드 표시 | `astro-expressive-code` (이미 사용) | 라인 번호·하이라이트·복사 |
| 코드 편집 | `codemirror` 6 + `@codemirror/lang-javascript` (선택) | 사용자 편집 모드 |
| 실행 환경 | TypeScript native (또는 Pyodide if Python) | 알고리즘을 *generator*로 |
| 시각화 | Svelte/React + D3 또는 Canvas | step별 상태 렌더링 |
| 컨테이너 | Astro island (`client:visible`) | 해당 컴포넌트만 hydrate |

**선택 기준** — Svelte 권장. 이유 — 가벼움(런타임 ~2 KB), reactive 시그니처가 step-by-step viz에 자연스러움. React 선호하면 같은 패턴 적용.

---

## 핵심 패턴 — 알고리즘을 generator로

알고리즘 자체를 *step을 yield하는 generator*로 작성한다. 시각화 컴포넌트는 `next()`로 한 step씩 진행하며 SVG를 갱신.

```typescript
// src/algorithms/bst-insert.ts
export type BstStep =
  | { type: 'start'; root: Node | null; key: number; line: number }
  | { type: 'compare'; current: Node; key: number; line: number }
  | { type: 'go-left'; current: Node; line: number }
  | { type: 'go-right'; current: Node; line: number }
  | { type: 'create'; key: number; parent: Node | null; line: number }
  | { type: 'done'; root: Node; line: number };

export function* bstInsert(
  root: Node | null,
  key: number,
): Generator<BstStep, Node, void> {
  yield { type: 'start', root, key, line: 1 };
  if (!root) {
    yield { type: 'create', key, parent: null, line: 3 };
    return { value: key, left: null, right: null };
  }
  yield { type: 'compare', current: root, key, line: 6 };
  if (key < root.value) {
    yield { type: 'go-left', current: root, line: 7 };
    root.left = yield* bstInsert(root.left, key);
  } else {
    yield { type: 'go-right', current: root, line: 10 };
    root.right = yield* bstInsert(root.right, key);
  }
  yield { type: 'done', root, line: 13 };
  return root;
}
```

**왜 generator인가**

- 알고리즘과 시각화의 *결합도 zero* — production 코드와 같은 함수를 viz에 재사용
- `line` 필드가 *코드 라인 ↔ viz 동기화*의 단서
- step별 *데이터 스냅샷*이 자연스러움 (yield 시점 = checkpoint)
- 사용자가 코드 편집하면 *그 generator 자체가 다시 정의*됨

---

## 컴포넌트 API

### `<AlgorithmPlayer />`

재사용 가능한 컨테이너. 알고리즘별 viz는 슬롯으로 주입.

```svelte
<!-- src/components/algorithm/AlgorithmPlayer.svelte -->
<script lang="ts">
  export let title: string;
  export let codeSrc: string;          // expressive-code로 표시할 소스
  export let algorithm: () => Generator;  // generator factory
  export let visualizer: ComponentType;   // viz Svelte 컴포넌트
  export let initialInput: any;
</script>
```

레이아웃:

```
┌─ 제목 ──────────────────────────┐
│  [코드 영역]    [시각화 영역]    │
│  (expressive-   (visualizer       │
│   code)          렌더)            │
│                                  │
│  현재 step의 line이 강조          │
├─ 컨트롤 ─────────────────────────┤
│  ▶ Play  ⏸ Pause  ⏭ Step  ⏮ Reset│
│  속도: ●━━━━━━━○ 1x              │
│  입력: [____] [Run]               │
└─────────────────────────────────┘
```

### Viz 컴포넌트

알고리즘마다 별도. step 객체를 받아 SVG/Canvas 갱신.

```svelte
<!-- src/components/algorithm/visualizers/BstViz.svelte -->
<script lang="ts">
  import type { BstStep, Node } from '../../../algorithms/bst-insert';
  export let step: BstStep;
  export let tree: Node | null;
  // D3 layout으로 트리 좌표 계산 → SVG 렌더
</script>

<svg width="600" height="400">
  {#each layoutNodes(tree) as node}
    <circle
      cx={node.x} cy={node.y} r="20"
      class:active={isActive(node, step)}
    />
    <text x={node.x} y={node.y}>{node.value}</text>
  {/each}
</svg>
```

---

## 파일 레이아웃

```
src/
├── algorithms/                          # generator 알고리즘
│   ├── bst-insert.ts
│   ├── heap-bubble-up.ts
│   ├── dijkstra.ts
│   └── quicksort.ts
├── components/algorithm/
│   ├── AlgorithmPlayer.svelte           # 재사용 컨테이너
│   └── visualizers/                     # 알고리즘별 viz
│       ├── BstViz.svelte
│       ├── HeapViz.svelte
│       ├── GraphViz.svelte
│       └── ArrayViz.svelte              # 정렬 등
└── content/blog/programming/algorithms/data-structures-and-algorithms/
    └── item13-binary-search-tree.md     # <AlgorithmPlayer .../> 임베드
```

MDX에서 사용:

```mdx
import AlgorithmPlayer from '~/components/algorithm/AlgorithmPlayer.svelte';
import { bstInsert } from '~/algorithms/bst-insert';
import BstViz from '~/components/algorithm/visualizers/BstViz.svelte';

<AlgorithmPlayer
  client:visible
  title="BST Insert"
  codeSrc="/algorithms/bst-insert.ts"
  algorithm={bstInsert}
  visualizer={BstViz}
  initialInput={{ keys: [5, 3, 8, 1, 4, 7, 9] }}
/>
```

`.md`는 `.mdx`로 변환 필요 (이미 `mdx` integration 활성). 또는 `.md` 안에서 컴포넌트 임베드 패턴 정립.

---

## 설치 단계

1. **Svelte integration**

```bash
npx astro add svelte
```

`astro.config.mjs`의 `integrations`에 `svelte()` 추가.

2. **의존성**

```bash
npm install d3 @types/d3
# 코드 편집 모드를 쓸 경우
npm install codemirror @codemirror/lang-javascript @codemirror/view @codemirror/state
```

3. **디렉터리 생성**

```bash
mkdir -p src/algorithms src/components/algorithm/visualizers
```

4. **첫 PoC** — BST insert
   - `src/algorithms/bst-insert.ts` (generator)
   - `src/components/algorithm/AlgorithmPlayer.svelte`
   - `src/components/algorithm/visualizers/BstViz.svelte`
   - `item13-binary-search-tree.md`에 임베드

5. **빌드 확인**

```bash
npm run build
```

`client:visible` directive로 *DSA 페이지 방문 시에만* hydrate 되므로 다른 페이지 성능 영향 없음.

---

## 새 알고리즘 추가 절차

1. `src/algorithms/<algo>.ts` — generator 작성. step 타입 정의.
2. `src/components/algorithm/visualizers/<AlgoViz>.svelte` — 시각화. 기존 viz 재사용 가능하면 그쪽으로 (예: 정렬은 `ArrayViz` 공통).
3. 해당 블로그 글에서 `<AlgorithmPlayer />` 한 줄 임베드.
4. (선택) 사용자가 *입력을 자유롭게* 바꿀 수 있게 `initialInput` 변경 UI 추가.

---

## 적용 우선순위 — DSA 시리즈

DSA의 39개 item 중 *애니메이션이 가장 가치 있는* 것들:

| Item | 알고리즘 | viz 형태 |
|------|---------|---------|
| 10 | 이진 트리 순회 (in/pre/post-order) | BstViz |
| 13 | BST 삽입·삭제 | BstViz |
| 14 | Selection tree·Forest·Set | TreeViz |
| 15 | 그래프 BFS/DFS | GraphViz |
| 16 | MST (Kruskal·Prim) | GraphViz |
| 17 | Shortest path (Dijkstra) | GraphViz |
| 19 | Simple sort | ArrayViz |
| 20 | Efficient sort (quick·merge·heap) | ArrayViz |
| 26 | AVL Tree 회전 | BstViz |
| 27 | Red-Black Tree | BstViz |
| 30 | Skip List | LinkedViz |
| 31 | Disjoint Set | TreeViz |
| 34 | DP patterns | TableViz |
| 35 | Backtracking | TreeViz |

4가지 viz(`BstViz`, `GraphViz`, `ArrayViz`, `TableViz`)만 만들면 14개 item에 적용 가능. 초기 투자 → 큰 재사용.

---

## 다른 영역 확장

DSA에서 검증된 패턴은 그대로 다음 영역에 옮길 수 있다. 결국 *8개의 재사용 가능한 viz 컴포넌트*로 전 블로그의 인터랙티브 수요를 거의 다 덮을 수 있다.

### viz 컴포넌트 카탈로그

| 컴포넌트 | 형태 | 1차 적용 |
|----------|------|---------|
| **TreeViz** | 트리 노드 강조 | DSA(BST/AVL/RB/heap/trie/disjoint set), 백트래킹, expression tree |
| **GraphViz** | 노드·엣지·강조 | DSA(BFS/DFS/MST/Dijkstra), ML compiler graph, NN graph, RTOS task graph |
| **ArrayViz** | 배열 셀 강조·교환 | DSA 정렬, 해시 collision, 양자화 분포, 패킷 bit 셀 |
| **TableViz** | 2D 격자 셀 강조 | DSA DP, attention heatmap, 캐시 grid, MMU page table, systolic PE |
| **PlotViz** | 함수 그래프 + 점/벡터 갱신 | 수치해석 iter, Kalman 1D, PID 응답, FFT 결과, 양자화 분포 |
| **TransformViz** | 행렬 = 평면 변환 | 선형대수(eigen/SVD), Kalman 2D, 좌표 frame, TVC angle |
| **DiffViz** | before/after IR / 그래프 | MLIR pass, XLA fusion, ONNX 최적화 |
| **TimelineViz** | 가로 막대 + 시간 진행 | CPU pipeline, MIL-STD-1553·CCSDS·CAN, lock 획득, 동시성 |

3D 궤적 / 우주 시뮬레이션은 별도 viewer 필요 (Three.js·Cesium) — 위 8개에서 제외.

### 영역별 어떤 viz를 어디에

#### `math/numerical` (Numerical Recipes)

- Newton-Raphson·이분법·secant — **PlotViz** (함수 곡선 + 수렴 점)
- FFT butterfly — **TreeViz** 또는 dedicated FFT
- Gaussian elimination·LU — **TableViz** (행 연산별 행렬 상태)
- Jacobi / Gauss-Seidel — **PlotViz** (수렴) + **ArrayViz** (해)
- Runge-Kutta — **PlotViz** (slope field + 적분 곡선)
- Monte Carlo π — **PlotViz** (점 산포)

#### `math/linear-algebra`

- 행렬 = 평면 변환 — **TransformViz** (3Blue1Brown 스타일)
- Gaussian elimination — **TableViz**
- Power method (eigenvector iter) — **TransformViz** (벡터가 고유공간으로 회전)
- SVD geometric view — **TransformViz** (orthogonal → diagonal → orthogonal)
- Projection·Gram-Schmidt — **TransformViz**

#### `math/set-theory`

- 거의 정적. Venn diagram 등 → **TreeViz** 정도.

#### `embedded/avionics/gnc/`

- Kalman filter 1D — **PlotViz** (true·measured·estimated + covariance band)
- Kalman filter 2D/3D — **TransformViz** (covariance ellipse)
- PID step response — **PlotViz**
- TVC angle — **TransformViz**
- Coordinate frame (ECI/ECEF/body) — **TransformViz**
- 6-DoF 궤적 — *3D viewer 별도* (위 8개 제외)

#### `embedded/avionics/cdh/`

- CCSDS packet 구조 — **ArrayViz** (bit 셀 진행)
- MIL-STD-1553 transaction — **TimelineViz** (BC/RT/transfer phases)
- Telemetry queue — **TimelineViz** + **ArrayViz**

#### `embedded/avionics/architecture/`

- 비행 컴퓨터 boot sequence — **TimelineViz**
- FDIR fault tree — **TreeViz** + **GraphViz**
- Redundancy voting — **TableViz**

#### `ml/compilers/` (MLIR·XLA·Triton·TVM)

- IR pass before/after — **DiffViz**
- Operator fusion — **GraphViz** (노드 병합 step)
- Layout transformation — **TableViz** (텐서 reshape)
- Auto-tuning search — **PlotViz** (search history) + **TableViz** (config matrix)

#### `ml/inference/` (TensorRT·ONNX RT·Core ML)

- Engine layer 실행 — **GraphViz** + **TimelineViz**
- Quantization fp32→int8 — **PlotViz** (분포 + scale) + **ArrayViz** (텐서)
- Memory pool — **ArrayViz** (블록별 색)

#### `ml/accelerators/`

- Systolic array — **TableViz** (PE 격자·데이터 흐름)
- NPU dataflow — **GraphViz** + **TableViz** (tile mapping)
- Sparsity 패턴 — **TableViz**

#### `systems/architecture`

- CPU pipeline (5단계) — **TimelineViz**
- Cache hit/miss — **TableViz** (cache line grid)
- Branch prediction (BHT/BTB) — **TableViz**
- Out-of-order — **TimelineViz**
- TLB — **TableViz**

#### `systems/linux-kernel-internals`

- Scheduler runqueue — **GraphViz**(task) + **TimelineViz**
- Page table walk — **TreeViz** (radix tree) 또는 **TableViz**
- TCP state — **GraphViz**(state) + **TimelineViz**(packet)
- Process state transitions — **GraphViz**

#### `parallel/parallel-principles`

- Lock 경합 — **TimelineViz** (threads as lanes)
- CAS retry — **TimelineViz** + **ArrayViz**
- Producer-consumer — **ArrayViz** (queue) + **TimelineViz**
- Barrier — **TimelineViz** (도달·해제 phase)

#### `embedded/protocols`

- CAN bus arbitration — **TimelineViz** (bit-level dominant/recessive)
- SPI clock + MOSI/MISO — **TimelineViz**
- I2C start/stop/ack — **TimelineViz**
- UART frame — **ArrayViz** (bit 셀) + **TimelineViz**

#### `media/av1`

- Bitstream token parsing — **ArrayViz** (bit 셀 진행)
- Block partitioning — **TableViz** (frame → superblock → partition)
- Entropy coding state — **PlotViz** (확률) + **ArrayViz**

#### `tools/debugging`

- GDB stack frame walk — **TreeViz**(call) + **ArrayViz**(stack)
- AddressSanitizer 검출 — **ArrayViz** (heap 색)
- Coredump 분석 — **TreeViz** (call stack)

### 구현 우선순위 (재사용성 기준)

| 우선순위 | 컴포넌트 | 영향 받는 영역 수 |
|----------|----------|------------------|
| 1 | TreeViz | DSA, 백트래킹, FDIR, page table, call stack |
| 2 | GraphViz | DSA, ML compiler, 커널, FDIR, NPU dataflow |
| 3 | ArrayViz | DSA, 양자화, 패킷, queue, stack, heap |
| 4 | TableViz | DSA DP, 캐시, MMU, systolic, layout, fault matrix |
| 5 | PlotViz | numerical, Kalman, 양자화 분포, FFT, search history |
| 6 | TransformViz | linear-algebra, GNC (Kalman 2D, frame, TVC) |
| 7 | TimelineViz | pipeline, 프로토콜, 동시성, OoO, packet |
| 8 | DiffViz | ML compiler IR pass |

PoC는 1·2·3에 집중 (DSA 적용). 4~6은 numerical / GNC 시리즈 양산 시. 7~8은 시스템 / ML 컴파일러 단계에서.

---

## 카테고리 × default 도구 매핑

각 카테고리는 *한 default 도구*. 그 카테고리의 글은 모두 같은 도구로 그린다.

| 카테고리 | default 도구 | 비고 |
|----------|------------|------|
| `programming/algorithms` | **Svelte + D3** | DSA 인터랙티브 |
| `programming/cpp` | TikZ | 패턴·UML |
| `programming/design` | TikZ | UML 다이어그램 |
| `programming/standards` | TikZ | 클래스·flow |
| `programming/testing` | TikZ + (optional Svelte) | 단순 flow는 TikZ |
| `math/numerical` | **TikZ + PGFPlots** (잠정 — *재고려 중*) | Newton/FFT/Gaussian elim 등 iteration 시각화에 인터랙티브 가치 존재. 책급 정적 vs 학습용 인터랙티브 사이 결정 보류 |
| `math/linear-algebra` | **TikZ + PGFPlots** | 책급. matrix transform·eigen·SVD geometric view |
| `math/set-theory` | TikZ | 거의 정적 |
| `embedded/avionics/architecture` | TikZ | 구성도·블록 |
| `embedded/avionics/flight-software` | TikZ | RTOS·partition |
| `embedded/avionics/cdh` | TikZ + (TimelineViz 일부) | 패킷·bus 시각화는 Svelte |
| `embedded/avionics/assurance` | TikZ | 인증 흐름 |
| `embedded/avionics/gnc` (계획) | **Svelte + D3** | Kalman·PID step trace |
| `embedded/bootloader` | TikZ | 부트 흐름 |
| `embedded/buildroot` | TikZ | 디렉터리·빌드 |
| `embedded/bsp` | TikZ | DT·HW |
| `embedded/hardware` (PCIe/DDR/NVMe) | TikZ | 패킷·메모리 |
| `embedded/protocols` | TikZ + (TimelineViz 일부) | CAN/SPI/I2C 비트 흐름 |
| `embedded/automotive` (MISRA/CERT/AUTOSAR) | TikZ | |
| `embedded/aerospace-standards` (DO-178C 등) | TikZ | |
| `embedded/industrial`·`yocto`·`wireless` | TikZ | |
| `ml/accelerators` | TikZ | systolic·dataflow 정적 |
| `ml/compilers` | TikZ + **Svelte (DiffViz)** | IR pass 비교는 인터랙티브 |
| `ml/inference` | TikZ | |
| `ml/tinyml`·`systems`·`drivers` | TikZ | |
| `systems/architecture` | TikZ + (TimelineViz 일부) | pipeline은 인터랙티브 가능 |
| `systems/linux-kernel-internals` | TikZ + (Svelte 일부) | |
| `systems/networking`·`distributed`·`sre` | TikZ | |
| `parallel/*` | TikZ + (TimelineViz 일부) | lock·race는 인터랙티브 |
| `media/av1` | TikZ | bitstream 정적 |
| `tools/*` | TikZ | |
| `writing/*`·`philosophy/*`·`science/*`·`design/*` | TikZ (있을 때) | |

### 결정 요약

- **TikZ가 default** — 거의 모든 카테고리. `_design.tex`로 통일.
- **Svelte + D3는 *제한된 카테고리*에서만** — DSA / 일부 ML / 일부 시스템·동시성. 디자인 토큰 공유.
- **Manim 도입 안 함** — 비디오는 블로그 성격과 어긋나고, 정적 책급은 PGFPlots가 우수.
- **Mermaid 사용 안 함** — sequence/state도 TikZ 템플릿(`_design-sequence.tex`·`_design-state.tex`)으로. 모든 다이어그램이 *pre-built SVG*.
- **Three.js는 보류** — 6-DoF가 글에 등장하는 시점에 재결정.

이렇게 두면 *한 카테고리 안에서는 미감이 통일*되고, 카테고리 *경계*에서만 의도된 시각 언어 전환이 일어난다.

---

## 참조

- Astro Islands — https://docs.astro.build/en/concepts/islands/
- Astro Svelte integration — https://docs.astro.build/en/guides/integrations-guide/svelte/
- D3.js — https://d3js.org/
- VisuAlgo (참고 디자인) — https://visualgo.net/
- Algorithm Visualizer — https://algorithm-visualizer.org/
- Python Tutor (참고) — https://pythontutor.com/

---

## 결정 미정 (작업 시 채울 것)

- [ ] Svelte vs React — Svelte 권장이지만 합의 필요
- [ ] 코드 편집 모드 *포함*할지 (CodeMirror 무게 ~50KB minified)
- [ ] step 속도 컨트롤 단위 (200ms / 500ms / 1s)
- [ ] 모바일 viewport에서의 *세로 레이아웃* 전환점
- [ ] 다크 모드 viz 스타일
