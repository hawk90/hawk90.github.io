---
title: "1장 연습문제 (Exercises)"
date: 2026-05-09T14:20:36
description: "집합 에 통상의 덧셈·스칼라곱을 부여한다. 가 -벡터공간인가? 이유와 함께 답하라."
tags: ["Linear Algebra", "Mathematics", "Hoffman & Kunze"]
series: "Linear Algebra"
seriesOrder: 191
draft: false
draft: true
---

> Hoffman & Kunze, Shilov, 그리고 자체 출제. 풀이는 본문의 정의·정리 번호로 참조한다. 별표 (★) 는 약간 까다롭거나 일반화 가치가 있는 문제.

---

## §1.1 체와 벡터공간

### 문제 1.1.1 (Hoffman §2.1, Ex. 5)

집합 $V = \{(x_1,x_2) \in \mathbb{R}^2 : x_1 \geq 0\}$ 에 통상의 덧셈·스칼라곱을 부여한다. $V$ 가 $\mathbb{R}$-벡터공간인가? 이유와 함께 답하라.

**풀이.** 부분공간 판정법 (정리 1.2.2) 을 그대로 적용하자. $V \subseteq \mathbb{R}^2$ 가 부분공간인지 묻는 것과 같다.
- $0=(0,0) \in V$. ✓
- 덧셈 닫힘: $x_1, y_1 \geq 0 \Rightarrow x_1 + y_1 \geq 0$. ✓
- **스칼라 닫힘 실패**: $(1,0) \in V$ 이지만 $(-1)\cdot(1,0)=(-1,0) \notin V$. ✗

따라서 $V$ 는 벡터공간이 **아니다**. ∎

---

### 문제 1.1.2 (Hoffman §2.1, Ex. 6 변형)

$V = \mathbb{R}^2$ 에 *비표준 연산*을
$$ (x_1, x_2) \boxplus (y_1, y_2) := (x_1+y_1+1,\ x_2+y_2),\qquad c \boxdot (x_1, x_2) := (c x_1 + c - 1,\ c x_2) $$
로 정의한다. $V$ 가 이 연산으로 $\mathbb{R}$-벡터공간을 이루는가?

**풀이 스케치.** 먼저 "영벡터" 후보를 찾자. $(x_1,x_2) \boxplus (e_1,e_2) = (x_1,x_2)$ 가 모든 $(x_1,x_2)$ 에서 성립하려면 $e_1 = -1, e_2 = 0$. 즉 $0_V = (-1, 0)$.

이제 모든 공리를 새 영벡터에 맞춰 검사해야 한다. 사실 $\phi : \mathbb{R}^2 \to \mathbb{R}^2,\ (x_1,x_2) \mapsto (x_1+1, x_2)$ 가 *비표준 연산을 가진 $V$* 와 *표준 $\mathbb{R}^2$* 사이의 동형사상(isomorphism) 이다. 따라서 $V$ 는 벡터공간. ✓

> **메모.** "영벡터를 잘못 둔 표준 공간" 의 좋은 예. 공리는 만족하지만 같은 공간 위에 동형이 여럿 있을 수 있다는 점을 보여 준다.

---

### 문제 1.1.3 (Shilov §2.1)

체 $F$ 위의 벡터공간 $V$ 에서 $c\alpha = c\beta$ ($c \neq 0$) 이면 $\alpha = \beta$ 임을 공리만 써서 증명하라.

**풀이.** $c\alpha - c\beta = 0$. 분배법칙 (V7) 에서 $c(\alpha - \beta) = 0$. $c \neq 0$ 이라 $c$ 는 가역이고, 명제 1.1.3 (4) 에서 $\alpha - \beta = 0$, 즉 $\alpha = \beta$. ∎

---

## §1.2 부분공간

### 문제 1.2.1 (Hoffman §2.2, Ex. 1)

다음 가운데 $\mathbb{R}^3$ 의 부분공간은?
1. $\{(x,y,z) : x = 3y\}$
2. $\{(x,y,z) : x \in \mathbb{Z}\}$
3. $\{(x,y,z) : x+y+z \geq 0\}$
4. $\{(x,y,z) : x = y^2\}$

**풀이.**
1. **부분공간** ✓ — 영벡터 포함, 합·스칼라곱 닫힘 모두 직접 확인.
2. **아님** — $(1,0,0)\in W$ 이지만 $\frac{1}{2}\cdot(1,0,0) = (\frac{1}{2},0,0) \notin W$.
3. **아님** — $(1,0,0)\in W$ 이지만 $-1 \cdot (1,0,0) = (-1,0,0) \notin W$.
4. **아님** — $(1,1,0), (4,2,0) \in W$ 인데 합 $(5,3,0)$ 은 $5 \neq 9$.

---

### 문제 1.2.2 (★)

$V$ 의 두 부분공간 $U, W$ 가 있다고 하자. $U \cup W$ 가 부분공간이 될 *필요충분조건*을 구하라.

**풀이.** 답은 "$U \subseteq W$ 또는 $W \subseteq U$".

(⇐) 한쪽이 다른 쪽을 포함하면 $U \cup W$ 는 큰 쪽 자체이므로 자동으로 부분공간.

(⇒) 대우(contrapositive)로 보이자. $U \not\subseteq W$ 이고 $W \not\subseteq U$ 라 하자. 그러면 $u \in U \setminus W$, $w \in W \setminus U$ 가 각각 존재한다. $U\cup W$ 가 부분공간이라면 $u+w \in U\cup W$ 여야 한다. $u+w \in U$ 라 두면 $w = (u+w) - u \in U$ 가 되어 모순. $u+w \in W$ 라 두어도 마찬가지. 따라서 $U\cup W$ 는 부분공간이 아니다. ∎

---

## §1.3 일차결합과 생성

### 문제 1.3.1

$V = \mathbb{R}^3$, $S = \{(1,2,1),(1,3,2),(0,1,1)\}$ 일 때 $\operatorname{span}(S)$ 를 만족할 일차방정식 형태로 표현하라.

**풀이.** $S$ 의 벡터들을 행으로 모은 행렬에 행축약을 적용한다.
$$ \begin{pmatrix} 1 & 2 & 1 \\ 1 & 3 & 2 \\ 0 & 1 & 1 \end{pmatrix} \xrightarrow{R_2 - R_1} \begin{pmatrix} 1 & 2 & 1 \\ 0 & 1 & 1 \\ 0 & 1 & 1 \end{pmatrix} \xrightarrow{R_3 - R_2} \begin{pmatrix} 1 & 2 & 1 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \end{pmatrix}. $$

랭크(rank) 2. $\operatorname{span}(S)$ 는 2차원 부분공간(평면).

법선벡터(normal vector, 영여공간) 찾기: $(1,2,1)\cdot(a,b,c) = 0,\ (1,3,2)\cdot(a,b,c) = 0$ 에서 $a + 2b + c = 0,\ a + 3b + 2c = 0$. 두 식을 빼면 $b + c = 0$, 곧 $b = -c$. 첫 식에서 $a = c$. 법선이 $(1,-1,1)$.

따라서 $\operatorname{span}(S) = \{(x,y,z) : x - y + z = 0\}$.

검증: $(1,2,1)$ 은 $1-2+1=0$ ✓, $(1,3,2)$ 는 $1-3+2=0$ ✓, $(0,1,1)$ 은 $0-1+1=0$ ✓.

---

## §1.4 일차독립

### 문제 1.4.1 (Shilov §2.2)

$\{\alpha_1,\alpha_2,\alpha_3\}$ 이 일차독립이라 하자. $\{\alpha_1+\alpha_2, \alpha_2+\alpha_3, \alpha_3+\alpha_1\}$ 이 일차독립일 필요충분조건은?

**풀이.** 표수가 $2$ 가 아닌 체에서 독립이다.

$$ c_1(\alpha_1+\alpha_2) + c_2(\alpha_2+\alpha_3) + c_3(\alpha_3+\alpha_1) = (c_1+c_3)\alpha_1 + (c_1+c_2)\alpha_2 + (c_2+c_3)\alpha_3 = 0. $$

$\{\alpha_i\}$ 가 독립이라 모든 계수가 $0$ 이어야 한다.
$$ c_1+c_3 = c_1+c_2 = c_2+c_3 = 0. $$

세 식을 더하면 $2(c_1+c_2+c_3) = 0$.
- $\mathrm{char}\,F \neq 2$: $c_1+c_2+c_3 = 0$ 이고 각 식에서 빼면 $c_1=c_2=c_3=0$. **독립**.
- $\mathrm{char}\,F = 2$: $c_1=c_2=c_3=1$ 이 비자명한 해 (각 식이 $1+1=0$ 으로 통과). **종속**.

---

### 문제 1.4.2 (Hoffman §2.3, Ex. 4)

$V = F[x]$ 에서 $\{1, x-1, (x-1)^2, \dots, (x-1)^n\}$ 이 일차독립임을 보여라.

**풀이.** 차수(degree)를 비교. $\sum_{i=0}^{n} c_i (x-1)^i = 0$ 이라 하자.

이 다항식의 최고차항(leading term) 계수는 $c_n$ ($(x-1)^n$ 만이 차수 $n$ 항을 갖고 그 최고차 계수가 $1$). 영다항식이 되려면 $c_n = 0$. 그러면 $\sum_{i=0}^{n-1} c_i(x-1)^i = 0$. 같은 절차로 $c_{n-1}=0$, ..., 최종적으로 $c_0=0$. ∎

> **메모.** 이것이 *테일러 기저*(Taylor basis). 점 $1$ 에서의 테일러 전개가 가능해진다.

---

## §1.5 기저와 차원

### 문제 1.5.1 (Hoffman §2.3, Ex. 9)

$V$ 가 $n$-차원이라 하자. 일차독립인 $n$ 개 벡터 $\{\alpha_1,\dots,\alpha_n\}$ 은 $V$ 의 기저임을 보여라.

**풀이.** 생성성을 보이면 끝.

임의의 $v\in V$ 를 잡자. $\{\alpha_1,\dots,\alpha_n,v\}$ 는 $n+1$ 개 벡터고, $\dim V=n$ 이므로 종속 (따름정리 1.5.4 와 Steinitz 정리에서 $k\leq m$).

종속이라 비자명 결합 $c_0 v + c_1\alpha_1+\cdots+c_n\alpha_n = 0$ 이 있다.
- $c_0 = 0$ 이면 $\{\alpha_i\}$ 의 비자명 결합이 $0$ 이 되어 독립성에 모순. 따라서 $c_0 \neq 0$.
- 그렇다면 $v = -c_0^{-1}\sum c_i \alpha_i \in \operatorname{span}\{\alpha_1,\dots,\alpha_n\}$.

따라서 $\operatorname{span}\{\alpha_1,\dots,\alpha_n\} = V$. ∎

---

### 문제 1.5.2 (★)

$V$ 가 $n$-차원 $F$-벡터공간이라 하자. $V$ 의 부분공간의 *수*는 $F$ 가 무한체이면 무한이고, 유한체 $\mathbb{F}_q$ 일 때는 다음 가우스 이항계수(Gaussian binomial coefficient)의 합으로 주어짐을 보여라.
$$ \#\{W \subseteq V : W \text{는 부분공간}\} = \sum_{k=0}^{n} \binom{n}{k}_q $$
여기서 $\binom{n}{k}_q$ 는 $V$ 의 $k$-차원 부분공간 개수.

**풀이 스케치.** $k$-차원 부분공간 개수는 (순서가 있는 일차독립 $k$-튜플 수) ÷ (한 부분공간의 기저 수).
- 분자: $(q^n-1)(q^n-q)\cdots(q^n-q^{k-1})$.
- 분모: $(q^k-1)(q^k-q)\cdots(q^k-q^{k-1})$.

비율이 정확히 가우스 이항계수.

> **응용.** 부호이론·조합론에서 자주 등장. §10 군 작용에서 다시 만난다 — $\mathrm{GL}_n(\mathbb{F}_q)$ 가 부분공간 격자에 작용한다.

---

### 문제 1.5.3

$\dim V = n$ 이고 $W$ 가 $V$ 의 부분공간이라 하자. $\dim W \leq \dim V$ 이고 등호는 $W = V$ 일 때만 성립함을 보여라.

**풀이.** $W$ 의 기저 $\{\alpha_1,\dots,\alpha_k\}$ 는 $V$ 안에서도 일차독립이라 Steinitz 정리에서 $k \leq n$.

등호 $k = n$ 일 때 $\{\alpha_1,\dots,\alpha_n\}$ 은 $V$ 안의 $n$ 개 일차독립 — 문제 1.5.1 에서 $V$ 의 기저. 따라서 $\operatorname{span}\{\alpha_1,\dots,\alpha_n\} = V$, 즉 $W = V$. ∎

---

## §1.6 좌표

### 문제 1.6.1

$V = F[x]_{\leq 3}$, $\mathcal{B} = (1, x, x^2, x^3)$ 일 때 $p(x) = (x-1)^3$ 의 좌표 $[p]_{\mathcal{B}}$ 를 구하라.

**풀이.** $(x-1)^3 = x^3 - 3x^2 + 3x - 1$ 이므로
$$ [p]_{\mathcal{B}} = (-1, 3, -3, 1)^T. $$

**보너스.** 같은 $p$ 를 $\mathcal{B}' = (1, x-1, (x-1)^2, (x-1)^3)$ 좌표로 보면, $p = 0\cdot 1 + 0\cdot(x-1) + 0\cdot(x-1)^2 + 1\cdot(x-1)^3$ 이라 $[p]_{\mathcal{B}'} = (0,0,0,1)^T$. 같은 다항식의 두 좌표가 완전히 다르다 — 기저 의존성을 보여 주는 생생한 예.

---

## §1.7 합·교집합·직합

### 문제 1.7.1 (Hoffman §3.6 변형)

$V = \mathbb{R}^4$, $U = \operatorname{span}\{(1,1,0,0),(0,0,1,1)\}$, $W = \operatorname{span}\{(1,0,1,0),(0,1,0,1)\}$. $\dim(U+W),\ \dim(U\cap W)$ 와 $U\cap W$ 의 기저를 구하라.

**풀이.** $U+W$ 의 차원: 네 생성벡터를 행으로 둔 행렬에 행축약.
$$ \begin{pmatrix} 1 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \\ 1 & 0 & 1 & 0 \\ 0 & 1 & 0 & 1 \end{pmatrix} \xrightarrow{R_3 - R_1} \begin{pmatrix} 1 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \\ 0 & -1 & 1 & 0 \\ 0 & 1 & 0 & 1 \end{pmatrix} \xrightarrow{R_4 + R_3} \begin{pmatrix} 1 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \\ 0 & -1 & 1 & 0 \\ 0 & 0 & 1 & 1 \end{pmatrix} \xrightarrow{R_4 - R_2} \begin{pmatrix} 1 & 1 & 0 & 0 \\ 0 & 0 & 1 & 1 \\ 0 & -1 & 1 & 0 \\ 0 & 0 & 0 & 0 \end{pmatrix}. $$

비영행 3개 ⇒ $\dim(U+W) = 3$.

차원 정리에서 $\dim(U\cap W) = \dim U + \dim W - \dim(U+W) = 2+2-3 = 1$.

$U\cap W$ 의 원소 찾기: $a(1,1,0,0)+b(0,0,1,1) = c(1,0,1,0)+d(0,1,0,1)$ 에서 $a=c,\ a=d,\ b=c,\ b=d$, 곧 $a=b=c=d$. 따라서 $U \cap W = \operatorname{span}\{(1,1,1,1)\}$.

**기저:** $\{(1,1,1,1)\}$. 차원 $1$. ✓

---

### 문제 1.7.2 (★)

벡터공간 $V$ 의 부분공간 $U_1, U_2, U_3$ 가운데 다음이 성립하지 *않는* 예를 찾아라.
$$ U_1 \cap (U_2 + U_3) = (U_1 \cap U_2) + (U_1 \cap U_3). $$

**풀이.** 부분공간 격자(lattice) 는 분배법칙을 만족하지 않는다 — modular lattice 이지만 distributive lattice 는 아님.

반례: $V = \mathbb{R}^2$, $U_1 = \operatorname{span}\{(1,1)\}$, $U_2 = \operatorname{span}\{(1,0)\}$, $U_3 = \operatorname{span}\{(0,1)\}$.

좌변: $U_2 + U_3 = \mathbb{R}^2$ 이라 $U_1 \cap \mathbb{R}^2 = U_1$ — 1차원.

우변: $U_1 \cap U_2 = \{0\}$, $U_1 \cap U_3 = \{0\}$ 이라 합도 $\{0\}$ — 0차원.

$U_1 \neq \{0\}$ 이므로 두 변은 같지 않다. ∎

> **메모.** 이는 부분공간 격자가 *modular* 이지만 *distributive* 는 아니라는 사실의 표현. §10 군 시점에서 다시 등장.

---

## 추가 문제 (자체 출제)

### 문제 X.1

$V$ 가 $\mathbb{R}$-벡터공간이고 $\dim V = n$ 이라 하자. $V$ 가 $\mathbb{C}$-벡터공간 구조를 가질 수 있을 필요충분조건은 $n$ 이 짝수임을 보여라.

**힌트.** ($\Leftarrow$) $V \cong \mathbb{R}^{2k}$ 라면 $\mathbb{C}^k$ 와 동일시. ($\Rightarrow$) $\mathbb{C}$-벡터공간으로 차원이 $k$ 라면 $\{e_1, ie_1, \dots, e_k, ie_k\}$ 가 $\mathbb{R}$-기저.

### 문제 X.2 (★)

$V$ 가 무한차원 $F$-벡터공간이면 $\dim V = \dim(V \oplus V)$ 임을 보여라. 즉 자기 자신과 동형인 진성 부분공간으로 직합 분해될 수 있다.

**힌트.** Hamel 기저 $B$ 를 같은 기수의 두 부분으로 분할.

---

## 다음 단계

[`summary.md`](./summary.md) 의 한 페이지 요약 카드로 1장을 압축한다.
