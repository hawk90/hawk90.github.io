---
title: "1.2 더 큰 집합을 짓는 법"
date: 2026-05-09T15:51:06
description: "짝 공리로는 두 개씩만 묶을 수 있다."
tags: ["Set Theory", "Mathematics", "Enderton"]
series: "Set Theory"
seriesOrder: 102
draft: false
draft: true
---

## 어디서 막히나

짝 공리로는 *두 개씩만* 묶을 수 있다.

$$\{a, b\}, \quad \{\{a, b\}, c\}, \quad \{\{\{a, b\}, c\}, d\}, \ldots$$

세 개를 한꺼번에 모으려고 하면 *둘을 묶고, 그것에 또 하나를 묶는* 식으로만 가능. 임의의 *집합족* 을 한 번에 다루는 건 안 된다.

여기서 두 도구가 필요해진다. 같은 "더 큰 집합 만들기" 라도 방향이 정반대다.

- **합집합 (Union)** — 옆으로 *풀어 헤친다*.
- **멱집합 (Power Set)** — 위로 *쌓아 올린다*.

---

## 옆으로 — 합집합 (Union)

> 집합족 $\mathcal{F}$ 가 주어지면, 그 안의 *어느 집합* 에라도 들어 있는 모든 원소를 한자리에 모은 집합 $\bigcup\mathcal{F}$ 가 존재한다.

$$\forall \mathcal{F}\,\exists U\,\forall x\,\bigl(x\in U \leftrightarrow \exists A\in\mathcal{F}\,(x\in A)\bigr)$$

### 한 겹 벗긴다

핵심은 *층을 줄인다* 는 것이다.
$\mathcal{F}$ 의 원소는 *집합* 이고, 그 집합의 *원소* 까지 한 단계 내려와서 모두 모은다.

$$\bigcup \{\{1,2\},\, \{2,3\},\, \{4\}\} = \{1, 2, 3, 4\}$$

![Union 평탄화](/images/blog/set-theory/ch01/union-flatten.svg)

> 💡 두 단계 깊이의 구조 → 한 단계로. *바깥 껍질을 벗긴다* 는 비유가 잘 맞는다.

### 짝 공리와 합치면 — 익숙한 $A \cup B$

흔히 보는 *두 집합의 합집합* 은 사실 두 단계 조합이다.

$$A \cup B \;:=\; \bigcup \{A, B\}$$

먼저 짝 공리로 $\{A, B\}$ 를 만들고, 합집합 공리로 그 한 겹을 푼다.
$\{1,2\} \cup \{2,3\} = \{1,2,3\}$ — 같은 결과.

---

## 위로 — 멱집합 (Power Set)

> 집합 $A$ 의 *모든 부분집합* 을 원소로 갖는 집합 $\mathcal{P}(A)$ 가 존재한다.

$$\forall A\,\exists P\,\forall X\,(X\in P \leftrightarrow X\subseteq A)$$

### 차원이 바뀐다

$A$ 의 원소가 $n$ 개면 $\mathcal{P}(A)$ 의 원소는 $2^n$ 개. *지수적 (exponential)* 폭발.

$$A = \{1, 2, 3\} \quad\Rightarrow\quad \mathcal{P}(A) \text{ has } 2^3 = 8 \text{ elements}$$

부분집합들을 *포함 관계* 로 줄세우면 정육면체 같은 격자가 그려진다.

![Power set 격자](/images/blog/set-theory/ch01/power-lattice.svg)

### 무한에서도 *진짜로 더 크다*

가장 큰 사건은 무한에서 일어난다. **Cantor 의 정리**:

$$|A| < |\mathcal{P}(A)| \quad (\text{임의의 } A)$$

$A$ 가 무한이라도, $\mathcal{P}(A)$ 는 *그보다 더 큰* 무한.
즉 무한에도 *위계* 가 있고, 멱집합이 그 위계를 한 칸씩 끌어 올리는 *사다리* 다.

이 사실 한 줄이 집합론의 풍경을 결정한다.
- $|\mathbb{N}| < |\mathcal{P}(\mathbb{N})|$ → 자연수의 모임보다 큰 무한 존재.
- $|\mathcal{P}(\mathbb{N})| = |\mathbb{R}|$ → 실수의 비가산성 (uncountability) 도 같은 자리.

> 📝 Cantor 의 *대각선 논법 (diagonal argument)* 이 정확히 이걸 보인다 — Ch 5 에서 자세히.

---

## 두 도구의 대비

| | 합집합 | 멱집합 |
|---|---|---|
| 무엇을 모으나 | 집합족의 *원소들* | 집합의 *부분집합들* |
| 방향 | 한 단계 *내려간다* | 한 단계 *올라간다* |
| 크기 변화 | 같은 차원 안에서 | 지수적 폭발 |
| 무한과의 관계 | 같은 무한 안에서 작동 | *더 큰* 무한으로 건너뛴다 |

같은 "키우는 일" 도 *어느 방향* 인지에 따라 결과가 다르다.
합집합은 *살을 옆으로*, 멱집합은 *키를 위로* 키운다.

---

## 여전히 부족한 것

이제 *기존 집합으로부터 새 집합을 짓는* 길이 두 개 열렸다.
하지만 우리가 자주 하고 싶어 하는 일 한 가지가 아직 안 된다.

**"$x^2 < 5$ 인 실수들의 집합"** 처럼 *조건으로* 잘라내는 것.

이걸 *naive* 하게 허용하면 Russell paradox 가 부활한다.
다음 장면에서 안전한 자르기 — *분리* 와 *치환* 도식 — 을 도입한다.

→ [1.3 조심스레 자르기](03-schemas.md)

← [1.1 첫 약속들](01-basic.md)
