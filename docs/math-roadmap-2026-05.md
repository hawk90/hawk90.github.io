# Math Roadmap — 2026-05-13

`/Users/hawk/Drive/01_Book/list.txt`에서 수학 관련 ~40권 추출 후 분야별 정리 + 블로그 시리즈 제안.

## 현재 블로그 시리즈 (`/blog/math/`)

- `how-to-solve-it` — Polya 1권
- `linear-algebra` — ch01 (vector-spaces) 시작
- `set-theory` — ch01 시작

→ **확장 폭 큼**. 보유 책 기준으로 7-8 영역 가능.

---

## 보유 도서 — 분야별 인벤토리

### 1. Pre-University / 기초 (1)
- **Basic Mathematics** — Serge Lang
  - 위상: 학부 진입 전 정비
  - 사용: *별도 시리즈는 비추*, 다른 시리즈에서 인용

### 2. Logic / Set Theory (2)
- **Introduction to Logic and to the Methodology of the Deductive Sciences** — Tarski
- **A Book of Set Theory** — Pinter (?)
- 현재 시리즈 `set-theory` 1권을 어느 책 기반으로 갈지 결정 필요

### 3. Linear Algebra (5권 — 레이어드)
| 책 | 레벨 | 위상 |
| --- | --- | --- |
| Lay — *Linear Algebra and Its Applications, 4th* | 입문 | 학부 1학년 |
| Strang — *Linear Algebra and Its Applications* (가능성) | 입문~중급 | 직관·시각 |
| Lang — *Linear Algebra* | 중급 | 컴팩트, 추상 |
| Hoffman — *Linear Algebra* | 중급~상급 | 정통 |
| Shilov — *Linear Algebra* | 상급 | 러시아 학파, 행렬식 깊이 |
| **Coding the Matrix** | 응용 | 계산 중심 |
| **The Matrix Cookbook** | 참고 | 공식 카탈로그 |

→ **현재 `linear-algebra` 시리즈** = Lay 기반으로 가닥 잡고, Hoffman/Shilov는 *Beyond Lay* 보강 챕터로

### 4. Calculus / Analysis (5권)
| 책 | 위상 |
| --- | --- |
| **Spivak — Calculus** | 학부 미적분, 증명 중심 |
| **Spivak — Calculus on Manifolds** | 다변수 / 미분형식 |
| **Rudin — Principles of Mathematical Analysis** ("Baby Rudin") | 실해석학 정전 |
| **Introduction to Analysis** | 해석학 입문 |
| **The Way of Analysis** | 해석학 입문 — 친화 톤 |

→ 시리즈화 후보: **"Calculus & Analysis Trail"** — Spivak Calculus → Spivak Manifolds → Baby Rudin 3단계

### 5. Probability / Statistics (10권)
| 책 | 영역 |
| --- | --- |
| Bertsekas — *Introduction to Probability, 2nd* | 학부 확률 입문 |
| Ross — *Introduction to Probability Models, 10th* | 응용 모델 / 마르코프 |
| Grinstead & Snell — *Introduction to Probability* | **무료**, 직관 중심 |
| Feller Vol 1 | 이산 확률 정전 |
| Feller Vol 2 | 연속 확률 정전 |
| Kolmogorov — *Foundations of the Theory of Probability* | 공리적 토대 |
| Jaynes — *Probability Theory: The Logic of Science* | 베이즈 철학 |
| Wasserman — *All of Statistics* | 통계 학부 압축 |
| Wasserman — *All of Nonparametric Statistics* | 비모수 통계 |
| Fundamentals of Probability, with Stochastic Processes | 확률+스토캐스틱 |
| Probability and Statistics for Engineers and Scientists | 공학 응용 |

→ 시리즈화 후보: **"Probability Foundations"** — Grinstead/Bertsekas(입문) → Ross(응용) → Jaynes(베이즈 철학)

### 6. Information Theory (2)
- **Elements of Information Theory** — Cover & Thomas (정전)
- **Information Theory, Inference, and Learning Algorithms** — MacKay (무료, ML 다리)

### 7. Topology (1)
- **Topology** — Munkres (가능성)

### 8. Graph Theory / Discrete Math (2)
- **Introduction to Graph Theory**
- **Mathematics for Computer Science** — MIT 6.042

### 9. Optimization (1)
- **Convex Optimization** — Boyd & Vandenberghe (무료, 정전)

### 10. Geometry (1)
- **Euclidean and Non-Euclidean Geometries**

### 11. Mathematics for ML (4)
- **Mathematics for Machine Learning** — Deisenroth et al (무료)
- **Concentration of Measure for the Analysis of Randomized Algorithms**
- **Generalized Principal Component Analysis**
- **Nonlinear Dimensionality Reduction**

### 12. Numerical / Applied (3)
- **Numerical Recipes — The Art of Scientific Computing**
- **Numerical Recipes in Fortran 90**
- **Optimal State Estimation** (칼만 필터 등)

### 13. Polya (Polya 3부작 — 이미 1권 시리즈 있음)
- *How to Solve It* (1권, 1945) — **이미 시리즈화 진행**
- **Induction and Analogy in Mathematics** (2권, 1954)
- **Patterns of Plausible Inference** (3권, 1954)

→ 시리즈 확장: 현재 `how-to-solve-it`을 **"Polya Trilogy"** 시리즈로 흡수·확장

### 14. 특수 주제 (3)
- **Optimal Transport, old and new** — Villani
- **A Probabilistic Theory of Pattern Recognition** — Devroye/Györfi/Lugosi
- **Probabilistic Reasoning in Intelligent Systems** — Pearl

### 15. 백과 (2)
- **The Princeton Companion to Mathematics**
- **The Princeton Companion to Applied Mathematics**
- 시리즈 X — *참고 사전*으로

---

## 제안 — 블로그 수학 시리즈 재구성

현재 3개 → **8개 시리즈** 확장 (모두 책 기반).

| # | 시리즈 명 | 기둥 책 | 보강 책 | 글 수 |
| --- | --- | --- | --- | --- |
| 1 | **how-to-solve-it** *(현재)* → **Polya Trilogy** | How to Solve It | Induction & Analogy + Plausible Inference | 30+ |
| 2 | **linear-algebra** *(현재, Lay 기반)* | Lay | Hoffman, Shilov, Lang 핵심 정리 | 40+ |
| 3 | **set-theory** *(현재)* | A Book of Set Theory | Tarski (Logic) | 20+ |
| 4 | **🆕 calculus-analysis** | Spivak Calculus | Spivak Manifolds → Baby Rudin | 40+ |
| 5 | **🆕 probability** | Bertsekas | Grinstead & Snell, Ross | 30+ |
| 6 | **🆕 information-theory** | Cover & Thomas | MacKay | 20+ |
| 7 | **🆕 convex-optimization** | Boyd & Vandenberghe | — | 20+ |
| 8 | **🆕 math-for-ml** | Mathematics for ML (Deisenroth) | Matrix Cookbook, Concentration of Measure | 20+ |

### 시리즈 *되지 않을* 책 (참고로만)
- Numerical Recipes (코드 카탈로그)
- Princeton Companion (백과)
- Optimal Transport, Pattern Recognition Theory (특수, 단편 글 가능)
- Basic Mathematics (Lang) — 다른 시리즈 진입 전 인용 정도

---

## 시리즈 우선순위

### Phase 1 (현재 진행 + 자연 확장)
1. **linear-algebra** — 이미 시작, Lay 정주행 후 Hoffman/Shilov 보강
2. **set-theory** — 이미 시작, 1권 완주
3. **how-to-solve-it → Polya Trilogy** — 2·3권 합류

### Phase 2 (수요·시너지 큰 영역)
4. **calculus-analysis** — Spivak Calculus부터. ML/통계 시리즈 사전 지식
5. **probability** — Grinstead & Snell (무료, 짧고 직관적)로 시작

### Phase 3 (응용/연구)
6. **math-for-ml** — Phase 2 후
7. **information-theory** — MacKay (무료)로 시작
8. **convex-optimization** — Boyd 강의 영상 풍부

---

## 책 간 의존성 그래프 (Phase 2 이후 진입 순서)

```
Basic Math (Lang) ──→ Linear Algebra (Lay) ──→ Spivak Calculus
                                │
                                ↓
                        Spivak Manifolds ──→ Baby Rudin
                                ↓
            ┌───────────────────┼───────────────────┐
            ↓                   ↓                   ↓
    Probability             Convex Opt         Info Theory
    (Bertsekas)             (Boyd)             (Cover & Thomas)
            ↓                   ↓                   ↓
            └────→  Mathematics for ML  ←─────────┘
                            ↓
                    Pattern Recognition Theory
                    Generalized PCA
                    Optimal Transport
```

---

## 운영 노트

- **번역 / 한국어**: 모든 시리즈 본문 한국어. 책 출처가 영어라도 *블로그 글*은 한국어로 정리
- **수식**: KaTeX는 이미 설정됨 (`rehype-katex`)
- **시각화**: 그래프·도형은 TikZ → PDF → PNG/SVG 파이프라인 (기존 패턴 활용)
- **외부 자료**:
  - Grinstead & Snell PDF: https://math.dartmouth.edu/~prob/prob/prob.pdf
  - Mathematics for ML: https://mml-book.com
  - MacKay: https://www.inference.org.uk/mackay/itila/
  - Boyd Convex: https://web.stanford.edu/~boyd/cvxbook/

- **시리즈 폴더 컨벤션** (`linear-algebra` 따라):
  ```
  src/content/blog/math/
    ├── how-to-solve-it/
    ├── linear-algebra/
    │   ├── ch01-vector-spaces/
    │   └── ch02-.../
    ├── set-theory/
    │   └── ch01/
    ├── 🆕 calculus-analysis/
    ├── 🆕 probability/
    └── 🆕 ...
  ```

---

## 메모

- 이 문서는 *스냅샷*. 실제 시리즈 확장 시 `blog-content-roadmap.md` Math 섹션과 머지
- 책 보유 ≠ 시리즈화 약속 — 우선순위·시간 고려
- 책별 *주요 챕터*만 다루는 경량 시리즈(10글 이내)도 옵션
- Polya 2·3권은 *분량 적당*해서 우선 후보 (트릴로지 완성 동기)

*작성: 2026-05-13*
