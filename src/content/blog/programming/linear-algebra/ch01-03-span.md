---
title: "1.3 일차결합(linear combination)과 생성"
date: 2026-05-11T10:00:00
description: "§1.2 에서 부분공간(subspace)을 정의했다. 그러나 정의만으로는 부족하다. 부분공간을 손으로 짓는 방법도 있어야 한다 — 그래야 마음먹은 부분공간을 자유롭게 만들고 다룰 수 있다."
tags: ["Linear Algebra", "Mathematics", "Hoffman & Kunze"]
series: "Linear Algebra"
seriesOrder: 103
draft: true
---

§1.2 에서 부분공간(subspace)을 정의했다. 그러나 정의만으로는 부족하다. 부분공간을 *손으로 짓는* 방법도 있어야 한다 — 그래야 마음먹은 부분공간을 자유롭게 만들고 다룰 수 있다.

방법은 단순하다. 벡터 몇 개를 던져 놓고, 더하기와 스칼라곱이 닫히도록 *최소한으로* 늘리면 된다. 이렇게 손으로 만든 부분공간을 **생성공간(span)**이라 부른다.

이 절에서 정립되는 *일차결합(linear combination)* 과 *생성공간(span)* — 두 개념이 §1.4 ~ §1.7 의 모든 작업의 근본 도구가 된다. §1.5 의 기저(basis)도, §1.7 의 차원 정리(dimension formula)도 이 둘 위에서 굴러간다.

---

## §1.3.1 일차결합(linear combination)

§1.0 워밍업의 4번 문제로 돌아가 보자. $(3, 1)$ 과 $(1, 2)$ 두 벡터로 평면 위 모든 점에 닿을 수 있느냐는 질문이었다. 답은 *그렇다* 였고, 그 모든 점이 사실은 두 벡터의 일종의 *결합*으로 표현된다는 사실도 봤다 —
$$ \{ a \cdot (3,1) + b \cdot (1,2) : a, b \in \mathbb{R} \} = \mathbb{R}^2. $$

이 결합 표현을 일반화한다.

> **📐 정의 1.3.1 (일차결합).** $\alpha_1, \dots, \alpha_k \in V$ 와 스칼라 $c_1, \dots, c_k \in F$ 가 있을 때
> $$ c_1 \alpha_1 + c_2 \alpha_2 + \cdots + c_k \alpha_k $$
> 꼴의 벡터를 $\alpha_1, \dots, \alpha_k$ 의 *일차결합(linear combination)*이라 한다.

정의는 단순하지만 한 가지 제한이 깔려 있다. 합이 *유한*이라는 것. 무한히 많은 항을 더하는 무한 합은 여기서 다루지 않는다. 무한 합은 수렴 개념을 요구하고, 수렴은 거리·노름 같은 추가 구조가 있어야 정의되기 때문이다. 1장은 그런 추가 구조 없이 *순수 대수적 무대*에서 일이 일어나도록 한다. 무한합은 §6 이후의 내적공간(inner product space) 또는 함수해석학에서 다룬다.

---

## §1.3.2 생성공간(span) — 가장 작은 부분공간

이제 일차결합이라는 도구로 부분공간을 짓는다.

> **📐 정의 1.3.2 (생성공간).** $S \subseteq V$ 의 *생성공간(span)*을
> $$ \operatorname{span}(S) := \{c_1 \alpha_1 + \cdots + c_k \alpha_k : k \geq 0,\ \alpha_i \in S,\ c_i \in F\} $$
> 으로 정의한다. $S = \emptyset$ 일 때는 빈 합 관례에 따라 $\operatorname{span}(\emptyset) = \{0\}$. $\operatorname{span}(S) = V$ 이면 "$S$ 가 $V$ 를 *생성한다*"고 말한다.

$\operatorname{span}(S)$ 는 $S$ 의 벡터들로 만들 수 있는 *모든 일차결합*을 모은 집합 — $S$ 에서 출발해 닿을 수 있는 영역 전체다.

손으로 만져 보자. $S = \{(3,1), (1,2)\}$ 이면 §1.0 에서 본 것처럼 $\operatorname{span}(S) = \mathbb{R}^2$. 한편 $S = \{(3,1)\}$ 이면 $\operatorname{span}(S)$ 는 원점과 $(3,1)$ 을 잇는 직선뿐이다. $S$ 에 어떤 벡터를 추가하느냐에 따라 $\operatorname{span}$ 의 크기가 점점 커진다.

![span 점진 — 1벡터→직선, 2벡터→평면, 3벡터→공간](/images/blog/linear-algebra/ch01/fig-01-13-span-progression.svg)

*그림 1.3.3a. 독립 벡터 한 개씩 더할 때마다 생성공간(span)의 차원이 1씩 늘어난다. (단, 의존 벡터를 더하면 차원은 그대로다.)*

![두 벡터의 생성공간](/images/blog/linear-algebra/ch01/fig-01-04-span-two-vectors.svg)

*그림 1.3.3. $\alpha,\beta$ 가 평행하지 않으면 $\operatorname{span}\{\alpha,\beta\}$ 는 평면 전체. 격자점은 정수 계수 결합의 예.*

---

이렇게 *손으로 만든 부분공간*에 대해 가장 중요한 한 가지 사실이 있다. 이 사실이 1장 후반의 모든 작업을 떠받친다.

> **📐 정리 1.3.4 (생성공간(span)의 보편 성질).** $\operatorname{span}(S)$ 는 $S$ 를 품는 *가장 작은* 부분공간(subspace)이다. 즉:
> 1. $\operatorname{span}(S)$ 는 부분공간이다.
> 2. $S \subseteq W \subseteq V$ 인 부분공간 $W$ 가 있으면 $\operatorname{span}(S) \subseteq W$.

증명은 두 갈래로 나뉜다. (1) 은 *판정법*을 직접 적용하는 일이고, (2) 는 *닫힘성에서 곧장* 따라온다.

**증명.**

**(1)** 부분공간 판정법(subspace test)을 적용한다.
- 영벡터: $S \neq \emptyset$ 이면 어떤 $\alpha \in S$ 를 잡아 $0 \cdot \alpha = 0$. $S = \emptyset$ 이면 정의대로 $\{0\}$.
- 덧셈 닫힘: 두 일차결합(linear combination)의 합도 일차결합 (계수를 적당히 합치면 됨).
- 스칼라곱 닫힘: 일차결합의 스칼라배도 일차결합 (모든 계수에 그 스칼라를 곱함).

**(2)** $W$ 가 부분공간이면 닫힘성에 의해 $S$ 의 어떤 일차결합도 $W$ 를 벗어나지 않는다. 따라서 $\operatorname{span}(S) \subseteq W$. ∎

---

이 정리에 *보편 성질(universal property)*이라는 이름을 붙인 데에는 이유가 있다. 어떤 대상을 *그것이 만족하는 가장 단순한 외부 조건*으로 특징짓는 방식인데, 정리 1.3.4 의 (2) 가 정확히 그렇다 — "$S$ 를 품는 어떤 부분공간이든 자동으로 $\operatorname{span}(S)$ 도 품는다" 라는 *외부에서의 최소성*만으로 $\operatorname{span}(S)$ 가 결정된다. 같은 패턴이 §2 의 핵·상, §6 의 정사영, 추후 텐서곱·몫공간 정의에서도 반복된다.

이 보편 성질 덕분에 "$\operatorname{span}(S)$ 가 무엇인가" 라는 질문에 두 가지 답이 가능해진다.

- *외연적* 답: 모든 일차결합을 모은 집합 (정의 그 자체).
- *내재적* 답: $S$ 를 품는 가장 작은 부분공간 (보편 성질).

같은 대상을 두 시점에서 보는 셈이다. 때에 따라 한쪽이 다른 쪽보다 다루기 쉽다.

또 다른 표현으로도 적을 수 있다.
$$ \operatorname{span}(S) = \bigcap \{W : W \text{는 부분공간},\ S \subseteq W\}. $$

곧 *$S$ 를 품는 모든 부분공간들의 교집합*. (어떤 것의 교집합은 부분공간이라는 명제 1.2.8 (1) 에서 곧장 따라온다.) 세 가지 시점이 모두 같은 대상을 가리킨다.

---

손에 익히는 데 도움이 될 작은 예 두 개로 절을 마무리한다.

**예.** $V = F^3$, $S = \{(1,0,0),(0,1,0)\}$ 이면 $\operatorname{span}(S) = \{(x,y,0)\}$ — 즉 $z=0$ 평면.

**예.** $F[x]_{\leq n}$ 은 $\{1, x, x^2, \dots, x^n\}$ 으로 생성된다. 차수 $\leq n$ 인 임의의 다항식이 이들의 일차결합(linear combination)으로 적힌다.

---

## 자기점검

1. $\operatorname{span}(S \cup T) = \operatorname{span}(S) + \operatorname{span}(T)$ 가 성립하는가? 증명하거나 반례를 들어라.
2. $\operatorname{span}(\emptyset) = \{0\}$ 이라 두는 이유를 빈 합 관례로 설명하라.
3. $\operatorname{span}(S)$ 가 부분공간(subspace)이라는 사실의 증명에서 $S$ 의 유한·무한이 영향을 주는가?

답은 [`self-check.md`](./self-check.md) §1.3 에 있다.

---

## 📋 교재 대조표

| 본 절 | Hoffman & Kunze | Shilov |
|---|---|---|
| §1.3.1 일차결합(linear combination) | §2.1 Definition, p.31 | §2.2 **2.21**, p.36 |
| §1.3.2 생성공간(span) | §2.2 **Thm 3**, p.37 | §2.5 **Lemma 2.53**, pp.49–50 |

---

> ← 이전 절 [§1.2 부분공간(subspace)](./1.2-subspace.md)
> 다음 절 → [§1.4 일차독립(linearly independent)과 일차종속(linearly dependent)](./1.4-independence.md)
