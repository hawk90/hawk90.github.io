---
title: "1.5 우주에는 바닥이 있다"
date: 2026-05-09T15:53:15
description: "지금까지의 일곱 공리는 모두 한 가지 형태였다."
tags: ["Set Theory", "Mathematics", "Enderton"]
series: "Set Theory"
seriesOrder: 105
draft: true
---

## 결이 다른 약속

지금까지의 일곱 공리는 모두 한 가지 형태였다.

> "*어떤 집합이 존재한다.*"

여덟 번째 약속 — 정칙성 (Foundation, 또는 Regularity) — 은 결이 다르다.
**존재가 아니라 *모양* 을 통제한다.**

새 집합을 만들지 않는다. 대신 *어떤 모양의 집합이 가능한지* 를 제한한다.
그래서 다른 공리들과 성격이 가장 다르다.

---

## 진술

$$\forall A\,\bigl(\,A \neq \emptyset \rightarrow \exists x \in A\,(x \cap A = \emptyset)\,\bigr)$$

말로 풀면:

> 공집합이 아닌 어떤 집합 $A$ 를 가져와도, 그 안에는 *$A$ 와 원소를 공유하지 않는* 원소가 적어도 하나 있다.
> 그런 원소를 $\in$**-극소원소** 라 부른다.

직관: $A$ 의 원소들끼리 $\in$-관계로 이리저리 엮여 있을 수 있다.
하지만 그 엮임을 따라 *위로 올라가다* 보면 반드시 *끝* 에 닿는다.
누군가는 더 이상 $A$ 와 엮여 있지 않다.

---

## 무엇이 따라오나

### 자기 자신을 원소로 가질 수 없다

$$A \notin A$$

증명 한 줄: $A \in A$ 라 가정하고 $\{A\}$ 를 보자.
$\{A\}$ 의 유일한 원소는 $A$, 그리고 $A \cap \{A\} = \{A\}$ ($A \in A$ 가정에 의해 $A$ 가 $A$ 에 들어 있고, $A$ 가 $\{A\}$ 의 유일 원소이므로).
그러면 $\{A\}$ 에 $\in$-극소원소가 없다 — 정칙성 위반.

따라서 $A \in A$ 같은 *자기 참조* 는 ZFC 에서 불가능.

### 끝없이 내려가는 사슬도 없다

$$\nexists\,(x_0 \ni x_1 \ni x_2 \ni \cdots)$$

집합을 따라 *원소의 원소의 원소...* 하고 내려가면 **반드시 유한 단계에서 멈춘다**.
끝은 어디인가? 결국 $\emptyset$ 같은 더 이상 원소를 갖지 않는 자리.

![∈-내림 무한열 금지](/images/blog/set-theory/ch01/epsilon-chain-forbidden.svg)

> 📝 이 사실이 *초한귀납 (transfinite induction)* 과 *$\in$-귀납* 의 토대.
> 끝이 보장되어야 귀납이 작동한다.

---

## Foundation 이 그리는 풍경 — 누적 위계 V

집합의 우주가 어떻게 *생겼는지* 그릴 수 있다.

$$V_0 := \emptyset$$
$$V_{\alpha+1} := \mathcal{P}(V_\alpha) \quad (\text{한 단계 위로})$$
$$V_\lambda := \bigcup_{\beta < \lambda} V_\beta \quad (\lambda\ \text{는 극한 순서수})$$
$$V := \bigcup_\alpha V_\alpha$$

매 단계마다 멱집합으로 *지수적으로* 부풀어 오른다.

![누적 위계 콘](/images/blog/set-theory/ch01/cumulative-hierarchy.svg)

이 위계 (cumulative hierarchy) 가 ZFC 의 *우주* — 모든 집합이 어딘가 한 단계 $V_\alpha$ 에 살고 있다.
**그것을 보장하는 것이 Foundation** 이다.

> 📖 사실 ZF 에서 정칙성 ↔ "모든 집합은 어떤 $V_\alpha$ 에 속한다" 가 *동치* 다.
> 즉 Foundation 은 결국 *집합의 우주가 깔끔한 위계를 갖는다* 는 약속.

---

## 다른 가능성도 있었다

흥미로운 사실 하나: 정칙성은 *수학적 필연* 이 아니다.

> 📖 **AFA (Anti-Foundation Axiom)**: Aczel (1988).
> Foundation 을 부정하고 *반정초 공리* 를 채택한 집합론도 일관 (consistent).
> 거기선 $\Omega = \{\Omega\}$ 같은 *비위계 (non-well-founded)* 집합이 합법.

AFA 는 컴퓨터 과학·과정 의미론 (process semantics)·언어학 등에서 쓰인다.
표준 ZFC 가 정칙성을 채택한 건 *깔끔함과 메타이론의 단순성* 때문이지, 다른 길이 막혀서가 아니다.

> 📝 일상 수학은 *위계 안에서* 끝난다.
> Foundation 을 빼도 거의 흔들리지 않는다.
> 차이가 크게 나는 곳은 *집합의 우주를 메타이론적으로 다루는* 자리 — 모델, 절대성, forcing.

---

## 한 줄로

> **Foundation = "집합의 세계엔 바닥이 있다."**
> 어디서 시작하든 $\in$ 을 따라 내려가면 반드시 $\emptyset$ 에 닿는다.
> 그 위에서 모든 집합이 *층층이* 쌓인다.

---

## 여기까지 — ZF 가 완성됐다

여덟 약속 (Extensionality, Empty, Pairing, Union, Power Set, Separation, Infinity, Replacement, Foundation — 도식 둘 포함하면 *공리는 무한히 많지만*) 이 모이면 **ZF (Zermelo–Fraenkel)** 가 완성된다.

ZF 는 거의 모든 일상 수학을 담는 골격이다.

남은 한 가지 — 가장 *논쟁적* 이고, 가장 *유용* 하고, 가장 자주 따로 거론되는 약속.

→ [1.6 마지막 약속 — 선택](06-choice.md)

← [1.4 유한의 끝에서](04-infinity.md)
