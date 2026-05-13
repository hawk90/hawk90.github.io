---
title: "1장 요약 카드"
date: 2026-05-09T14:13:21
description: "순서 기저(ordered basis) 을 고정하면 $$"
tags: ["Linear Algebra", "Mathematics", "Hoffman & Kunze"]
series: "Linear Algebra"
seriesOrder: 193
draft: false
draft: true
---

> **시험·복습 직전 1분 회상용.** 정확한 증명·정의는 [README](./README.md) 의 절별 파일 참조.

---

## 한 줄 요약

> 벡터공간은 더하기와 스칼라곱을 가진 구조. 부분공간·생성·일차독립·기저·차원·좌표가 모두 *공리에서* 따라 나온다.

---

## 핵심 정의 5

| # | 한국어 | 영문 | 한 줄 정의 |
|---|---|---|---|
| D1 | 벡터공간 | vector space | 체 $F$ 위에서 8공리 (V1)–(V8) 를 모두 만족하는 $(V, +, \cdot)$ |
| D2 | 부분공간 | subspace | 영벡터를 품고 덧셈·스칼라곱에 닫힘 |
| D3 | 일차독립 | linearly independent | $\sum c_i\alpha_i = 0 \Rightarrow$ 모든 $c_i = 0$ |
| D4 | 기저 | basis | 일차독립 + 생성 |
| D5 | 차원 | dimension | 어떤 기저든 그 원소 수 (모든 기저가 같다) |

---

## 핵심 정리 3

| 정리 | 영문 | 진술 (한 줄) |
|---|---|---|
| **Steinitz 교환 정리** | exchange theorem | 일차독립 $k$-집합으로 생성 $m$-집합의 $k$ 자리를 교체할 수 있다. 따라서 $k \leq m$. |
| **차원의 well-defined** | dimension is well-defined | 같은 공간의 모든 기저는 원소 수가 같다 (Steinitz 정리를 양쪽으로 적용). |
| **차원 정리** | dimension formula | $\dim(U+W) + \dim(U\cap W) = \dim U + \dim W$. |

---

## 좌표사상 (coordinate map)

순서 기저(ordered basis) $\mathcal{B}=(\alpha_1,\dots,\alpha_n)$ 을 고정하면
$$ \Phi_{\mathcal{B}} : V \xrightarrow{\sim} F^n,\quad v \mapsto (c_1,\dots,c_n)^T \quad (v = \sum c_i\alpha_i). $$

이 동형(isomorphism)은 **자연스럽지 않다 (not canonical)** — 기저 선택에 따라 달라진다.

---

## 직합 (direct sum)

$V = U \oplus W$ 의 동치 조건:
1. $V$ 의 모든 원소가 $u+w$ ($u\in U,\ w\in W$) 로 *유일하게* 표현된다.
2. $V = U+W$ 이면서 $U\cap W = \{0\}$.

따름정리: $\dim(U\oplus W) = \dim U + \dim W$.

---

## 새 용어 한 표 (glossary)

| 한국어 | 영문 | 한 줄 풀이 |
|---|---|---|
| 가환군 | abelian group | 결합·교환 법칙, 항등원, 역원을 갖춘 한 연산 |
| 표수 | characteristic | $1$ 을 몇 번 더해 영이 되는가 ($0$ 또는 소수) |
| 보편 성질 | universal property | "이 대상이 만족하는 가장 단순한 외부 조건" |
| 격자 | lattice | 두 원소의 만남(meet)·이음(join)을 항상 가지는 부분순서 |
| 동형사상 | isomorphism | 구조를 보존하는 일대일 대응 |
| 자연(canonical) | canonical | 임의 선택 없이 정해진다 (vs. 기저 의존) |
| 짧은 정확열 | short exact sequence | $0 \to A \to B \to C \to 0$, 차원 가법성 |
| Hamel 기저 | Hamel basis | 무한차원에서의 *유한* 일차결합 기저 |

---

## 자주 쓰는 차원

| 공간 | 기저 | $\dim$ |
|---|---|---|
| $F^n$ | 표준기저 $\{e_i\}$ | $n$ |
| $M_{m\times n}(F)$ | $\{E_{ij}\}$ | $mn$ |
| $F[x]_{\leq n}$ | $\{1,x,\dots,x^n\}$ | $n+1$ |
| $F[x]$ | $\{1,x,x^2,\dots\}$ | $\aleph_0$ |
| $\mathbb{C}$ as $\mathbb{R}$-vs | $\{1, i\}$ | $2$ |
| $\mathbb{C}$ as $\mathbb{C}$-vs | $\{1\}$ | $1$ |

---

## 빈출 함정

| 흔한 오해 | 정정 |
|---|---|
| 원점을 지나지 않는 평면도 부분공간이다 | ✗ — 영벡터가 빠진다 (그건 *아핀* 부분공간) |
| 부분공간의 합집합도 부분공간이다 | ✗ — 한쪽이 다른 쪽을 포함할 때만 ✓ |
| 기저는 그저 생성집합이다 | ✗ — 일차독립까지 갖춰야 한다 |
| $\dim V = n$ 이면 $n$ 개 벡터가 곧 기저다 | ✗ — *일차독립이거나 생성하는* $n$ 개여야 |
| 쌍별 $U_i \cap U_j = \{0\}$ 이면 직합이다 | ✗ — 셋 이상에서는 더 강한 조건 필요 |
| 차원은 항상 자연수다 | △ — 무한차원은 기수 (Hamel 기저, Zorn 필요) |

---

## 표기 규약

- 벡터: $\alpha, \beta$ — 스칼라: $c, d, \lambda$
- 영벡터: $0$ (스칼라 $0$ 과는 문맥으로 구분)
- 핵·상: $\ker T,\ \operatorname{Im} T$
- 직합·합·교집합: $\oplus,\ +,\ \cap$
- 좌표벡터: $[v]_{\mathcal{B}}$

---

## 다음 장 예고 (§2)

- "벡터공간 사이의 사상이 보존해야 할 것은 무엇인가" → **선형사상** (linear map)
- 좌표 동형 $V \cong F^n$ 이 **행렬** (matrix) 로 응축된다.
- 가역 선형사상 전체가 **$\mathrm{GL}(V)$** — 첫 군 (group) 등장 💡

---

## 자기점검 — 30초 안에 답할 수 있는가?

1. 부분공간의 세 조건은?
2. Steinitz 정리의 두 결론은?
3. 차원 정리의 식은?
4. 직합의 동치 조건 두 가지는?
5. $\dim_{\mathbb{R}} \mathbb{C}$ 와 $\dim_{\mathbb{C}} \mathbb{C}$ 의 차이는?

답이 즉시 떠오르지 않으면 → [`self-check.md`](./self-check.md) 또는 해당 절 파일.
