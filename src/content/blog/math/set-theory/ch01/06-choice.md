---
title: "1.6 마지막 약속"
date: 2026-05-11T10:00:00
description: "ZF 까지 오는 길에서 우리는 늘 구체적 규칙 으로 집합을 만들었다."
tags: ["Set Theory", "Mathematics", "Enderton"]
series: "Set Theory"
seriesOrder: 106
draft: false
---

## 마지막 한 자리

ZF 까지 오는 길에서 우리는 늘 *구체적 규칙* 으로 집합을 만들었다.

- 분리: "조건 $\varphi(x)$ 를 만족하는 $x$ 들"
- 치환: "함수 $\varphi(x, y)$ 가 보내는 $y$ 들"

규칙이 명확하면, 어떤 집합이 만들어지는지도 명확하다.

그런데 다음과 같은 상황을 생각해 보자.

> 무한히 많은 비공 집합 $A_1, A_2, A_3, \ldots$ 이 있다.
> 각 $A_i$ 에서 *하나씩* 골라낸 새 집합 $C$ 를 만들 수 있는가?

유한이라면 *한 번에 하나씩 고르면* 끝이다 (귀납).
하지만 무한, 게다가 *각 집합의 원소를 구별할 명시적 규칙이 없다* 면?

지금까지의 어느 공리로도 이 *동시 무한 선택* 을 보장할 수 없다.

이 결락을 메우는 마지막 약속이 **선택 공리 (Axiom of Choice, AC)**.

---

## 진술

서로소 (pairwise disjoint) 인 비공 집합족 $\mathcal{F}$ 가 주어지면:

$$\exists C\,\forall A \in \mathcal{F}\,\,|C \cap A| = 1$$

> *각 집합에서 정확히 하나씩만* 골라낸 *선택 집합 (choice set)* $C$ 가 존재한다.

![선택 함수](/images/blog/set-theory/ch01/choice-function.svg)

---

## 무엇이 어려운가

### Russell 의 비유 — 양말과 신발

> *무한히 많은 켤레의 신발* 에서 한 짝씩 고르려 한다.
> "왼쪽 신발만 고른다." → 명시적 규칙. AC 없이 OK.

> *무한히 많은 켤레의 양말* 에서 한 짝씩 고르려 한다.
> 좌·우 구분이 없고, 어떤 양말이 어떤 양말과 다른지 *구별할 규칙* 이 없다.
> "골라야 한다" 는 직관은 강하지만, *어떻게* 고를지 말할 수 없다.
> → AC 가 *그럼에도 고를 수 있다* 고 약속한다.

이 *비구성성 (non-constructiveness)* 이 AC 의 본질.
선택 함수의 *존재* 는 보장하지만, *구체적인 선택* 은 주지 않는다.

---

## 한 약속, 여러 얼굴

AC 는 *동치인 여러 진술* 로 표현된다. 분야마다 가장 편한 얼굴이 다르다.

### 1. 선택 함수

비공 집합족 $\mathcal{F}$ 에 대해 함수 $f: \mathcal{F} \to \bigcup\mathcal{F}$ 로
*$f(A) \in A$* 가 항상 성립하는 것이 존재.

### 2. 곱이 비지 않음

$$\prod_{i\in I} A_i \neq \emptyset \quad (\text{모든 } A_i \neq \emptyset)$$

직곱 (Cartesian product) 의 원소 = 선택 함수. 이름만 다르다.

### 3. Zorn 보조정리 (Zorn's Lemma)

부분순서 $(P, \leq)$ 의 *모든 사슬 (chain) 이 상계 (upper bound) 를 가지면*, $P$ 에 *극대원 (maximal element)* 이 있다.

> 📝 대수에서 가장 자주 쓰는 형태.
> "*모든 벡터 공간이 기저를 가진다*", "*모든 가환환이 극대 이데알을 가진다*" — 모두 Zorn 으로 증명.

### 4. 정렬 정리 (Well-Ordering Theorem, Zermelo)

*모든 집합은 정렬 (well-ordered) 가능하다.*
즉 어떤 순서 $\leq$ 를 줘서 *모든 비공 부분집합이 최소원을 가지도록* 만들 수 있다.

> 💡 가장 충격적인 형태.
> "*$\mathbb{R}$ 도 정렬할 수 있다*" — 보통의 $\leq$ 와는 *전혀 무관한* 어떤 순서가 존재.

이 셋 (AC ↔ Zorn ↔ Well-Ordering) 의 동치성은 ZF 에서 증명된다.

![AC 동치 삼각](/images/blog/set-theory/ch01/ac-equivalents.svg)

---

## 비구성성과 그 결과

AC 는 *선택 함수의 존재* 만 약속한다. *어떻게* 고르는지는 침묵.

이 비구성성이 *직관에 반하는 결과* 들의 원천이다.

### Banach–Tarski paradox

3차원 공 (ball) 을 유한 조각으로 나눠 회전·평행이동만으로 *원본과 같은 공 두 개* 로 재조립할 수 있다.

> 📝 "조각" 들이 측정 불가능 (non-measurable) 한 집합. 일상의 부피 직관이 무너지는 게 아니라, *측도 (measure) 가 모든 집합에 정의되지 않을 뿐* 임을 보여 준다.

### Vitali set

$\mathbb{R}$ 에 *Lebesgue 측도가 정의되지 않는* 부분집합이 존재.

이런 결과들 때문에 AC 를 *완전히 거부* 하는 학파도 있다 (구성주의).
하지만 주류 수학은 AC 를 *받아들이는* 쪽으로 자리 잡았다.

---

## 약한 사촌들

> 📖 가산 선택 ($\mathrm{AC}_\omega$) — $\mathcal{F}$ 가 가산일 때만.
> 종속 선택 (DC) — 귀납적으로 한 단계씩 선택. 해석학에서 흔히 쓰는 "수열을 골라낸다" 수준.
> Boolean prime ideal 정리 (BPI) — 위상수학·논리에서 자주.

> 강도: $\text{AC} \Rightarrow \text{DC} \Rightarrow \mathrm{AC}_\omega \Rightarrow \text{BPI}$ (대략).

> 📝 "AC 없이 어디까지 갈 수 있는가" — 자체가 큰 연구 분야 (Solovay 모델, Feferman–Lévy 등).

---

## 왜 결국 받아들이나

1. **편의** — AC 없이 증명을 다시 쓰면 매우 번거롭거나 *불가능*.
2. **자연스러움** — "임의의 집합족에서 하나씩 고를 수 있다" 는 *수학자의 직관* 과 통한다.
3. **일관성** — Gödel (1938): ZF 가 일관이면 ZFC 도 일관 (constructible universe $L$).
4. **독립성** — Cohen (1963): ZF 가 일관이면 ZF + ¬AC 도 일관 (forcing).

마지막 두 사실을 합치면: **AC 는 ZF 에서 증명도 반증도 안 된다**.
결국 *공리로 채택할지* 의 문제.

수학자 대부분은 *채택* 을 선택했다 — *AC 가 없으면 너무 많은 익숙한 정리가 사라지기 때문*.

> 📝 같은 의미에서 *연속체 가설 (CH)* 도 ZFC 에서 독립.
> AC 와 CH — ZFC 가 *답을 못 주는* 가장 중요한 두 명제.
> Ch 9·10 (Constructible Universe, Forcing) 에서 다시 만난다.

---

## ZFC 가 완성됐다

- 1–9: ZF — 거의 모든 수학을 담는 골격.
- 10: AC — 마지막 한 조각.

10개의 약속 (도식까지 풀면 무한히 많은) 으로, 우리는 *모든 수학을 담을 수 있는 우주* 를 갖게 됐다.

다음 절에서 지나온 길을 한눈에 정리하자.

→ [1.7 지금 우리가 가진 것](07-summary.md)

← [1.5 우주에는 바닥이 있다](05-foundation.md)
