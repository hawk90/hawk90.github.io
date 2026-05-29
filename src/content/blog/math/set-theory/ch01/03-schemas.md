---
title: "1.3 조심스레 자르기"
date: 2026-05-15T15:51:52
description: "수학에서 집합을 정의하는 가장 자연스러운 방식은 조건 이다."
tags: ["Set Theory", "Mathematics", "Enderton"]
series: "Set Theory"
seriesOrder: 103
draft: true
---

## 우리가 진짜로 하고 싶은 일

수학에서 *집합을 정의하는* 가장 자연스러운 방식은 *조건* 이다.

> "소수 (prime) 들의 집합"
> "$x^2 < 5$ 인 실수들"
> "차수가 2 이하인 다항식들"

Naive 집합론 시절엔 그냥 적기만 하면 됐다.
$$\{\,x \mid \varphi(x)\,\}$$

— 그리고 정확히 이게 Russell paradox 를 낳았다.

이제 우리는 *조심스럽게* 같은 일을 해야 한다.
경계 한 줄만 그으면 된다.

> *우주 전체*에서 골라내지 마라.
> *이미 있는 집합 안에서만* 골라내라.

이 한 줄이 ZFC 의 네 번째 약속 — **분리 (Separation)** — 다.

---

## 분리 도식 (Schema of Separation)

각 1차 형식 (formula) $\varphi(x)$ 마다 한 공리:

$$\forall A\,\exists B\,\forall x\,\bigl(x\in B \leftrightarrow x\in A \land \varphi(x)\bigr)$$

→ $B = \{x \in A \mid \varphi(x)\}$.

### 작은 변화, 큰 차이

| Naive | ZFC (Separation) |
|---|---|
| $\{x \mid \varphi(x)\}$ | $\{x \in A \mid \varphi(x)\}$ |
| 우주 전체에서 | *기존 집합 $A$* 안에서만 |

추가된 건 단 한 글자 — `$x \in A$` — 뿐이지만, 이게 Russell 을 정확히 차단한다.

### Russell 이 어떻게 막히나

$\varphi(x) := (x \notin x)$ 로 두고, 임의의 집합 $A$ 에 분리를 적용해 보자.

$$R_A := \{\,x \in A \mid x \notin x\,\}$$

그리고 묻는다. *$R_A \in R_A$ 인가?*

- 만약 $R_A \in R_A$ 라면 정의에 의해 $R_A \notin R_A$ — 모순.
- 따라서 $R_A \notin R_A$.
- 그렇다면 정의에 의해 *$R_A \notin A$* 여야 한다 — *$A$ 안의 원소만이 후보였으므로*.

결론: $R_A$ 는 *$A$ 의 바깥에* 있다. 모순이 아니다.

![Russell paradox 차단](/images/blog/set-theory/ch01/russell-blocked.svg)

이 결론이 의미하는 바: *모든 집합을 담는 집합* 은 존재할 수 없다.
어떤 $A$ 를 가져와도 그것보다 *바깥에* 사는 집합 $R_A$ 가 항상 만들어진다.

> 💡 **단어 하나의 차이**:
> "조건으로 *모은다*" → 무에서 만든다 → 위험.
> "이미 있는 집합에서 *고른다*" → 솎아낸다 → 안전.

---

## 도식 (Schema) 라는 말의 뜻

분리 공리는 *공리 하나* 가 아니라 *공리들의 무한한 패턴* 이다.

각 형식 $\varphi$ 마다 한 공리. $\varphi$ 가 무한히 많으니 공리도 무한히 많다.

왜 그래야 하나? 1차 논리 (first-order logic) 에선 *"임의의 형식 $\varphi$ 에 대해"* 같은 양화가 직접 표현되지 않는다.
"형식 $\varphi$" 는 *논리 바깥의 메타 수준* 에 있어서, 공리로 적으려면 매번 한 형식씩 적어야 한다.
그것을 한 번에 묶는 *틀* 이 *공리 도식*.

---

## 더 강한 자매 — 치환 (Replacement)

분리만으로 부족한 자리가 있다.

분리는 항상 *$A$ 의 부분집합* 을 만든다 — 결과의 크기는 $|A|$ 이하.
하지만 우리가 가끔 원하는 건 *$A$ 만큼 많은* 원소를, $A$ 와 *전혀 무관한 자리에* 모으는 일이다.

예: "각 자연수 $n$ 에 대응하는 어떤 큰 순서수 $\omega + n$ 들의 집합" — 결과가 $\omega$ 보다 훨씬 큰 자리에 있다.

이걸 가능하게 하는 게 **치환 도식**.

$$\forall A\,\Bigl(\,(\forall x\in A\,\exists! y\,\varphi(x,y)) \rightarrow \exists B\,\forall y\,(y\in B \leftrightarrow \exists x\in A\,\varphi(x,y))\,\Bigr)$$

말로 풀면:

> 집합 $A$ 의 각 원소에 *함수처럼* 어떤 값이 유일하게 대응되면, 그 값들을 모은 *상 (image) 집합* $B$ 가 존재한다.

### 분리 vs 치환 — 체와 운반

![Separation vs Replacement](/images/blog/set-theory/ch01/separation-replacement.svg)

비유로 정리하면:

- **분리** = *체* (sieve).
  알맹이는 그대로, 통과한 것만 남긴다. 결과는 *원래 집합의 일부*.

- **치환** = *상자 옮기기* (transport).
  각 원소에 새 짐을 매겨 다른 자리로 보낸다. 결과는 *완전히 새로운 자리*.

### 왜 치환이 진짜로 더 강한가

치환만 있으면 분리는 *공짜로 따라온다*.
($\varphi(x, y) := (x = y \land \psi(x))$ 같이 두면 치환의 상이 정확히 분리의 결과.)

반대는 안 된다. 분리만으론 $A$ 바깥의 자리에 못 닿는다.

> 📖 **참고**: 이 차이가 **Z** (Zermelo, 1908) 와 **ZF** (Zermelo–Fraenkel, 1922) 의 본질.
> Z 에는 분리만 있었고, Fraenkel 이 치환을 추가하면서 큰 순서수 구성이 가능해졌다.

---

## 여기까지

여섯 약속이 모였다. 이제 *기존 집합으로부터 새 집합을 안전하게 만드는* 거의 모든 방법을 갖췄다.

그런데 아직 *어디에도* 다음과 같은 보장이 없다.

> "*무한 집합* 이 존재한다."

지금까지의 공리들은 *유한 집합만으로* 모두 만족 가능한 모델을 갖는다. 무한은 *공짜로 따라오지 않는다*.

다음 장면 — **무한 공리** — 가 그 점프를 명시적으로 보장한다.

→ [1.4 유한의 끝에서](04-infinity.md)

← [1.2 더 큰 집합을 짓는 법](02-construction.md)
