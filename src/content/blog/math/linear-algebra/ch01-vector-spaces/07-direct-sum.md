---
title: "1.7 부분공간(subspace)의 합·직합(direct sum)과 차원 정리(dimension formula)"
date: 2026-05-15T06:57:40
description: "1장의 마지막 절. 두 부분공간(subspace)이 만났을 때 무슨 일이 벌어지는가, 그리고 그 만남의 차원(dimension)은 어떻게 결정되는가."
tags: ["Linear Algebra", "Mathematics", "Hoffman & Kunze"]
series: "Linear Algebra"
seriesOrder: 107
draft: false
---

1장의 마지막 절. 두 부분공간(subspace)이 만났을 때 무슨 일이 벌어지는가, 그리고 그 만남의 차원(dimension)은 어떻게 결정되는가.

---

§1.2 에서 합 $U + W$ 와 교집합 $U \cap W$ 가 부분공간이라는 사실을 보았다. 그것들의 *차원*은 어떻게 관련될까? 두 부분공간이 전혀 겹치지 않는다면? 일부분만 겹친다면? 거의 다 겹친다면?

답이 놀랄 만큼 깔끔하다.
$$ \dim(U+W) + \dim(U \cap W) = \dim U + \dim W. $$

겹친 부분이 두 번 세어진 만큼을 한 번 빼주면 합과 합집합 사이의 차원이 정확히 균형을 이룬다. 이것이 **차원 정리(dimension formula)** 다. 포함-배제 원리(inclusion-exclusion)의 차원 버전이다. 유한집합에 대한 원리
$$ |U \cup W| + |U \cap W| = |U| + |W| $$
와 모양이 정확히 같다 — 합집합 $\cup$ 자리에 합공간 $+$, 원소 수 자리에 차원이 들어갈 뿐이다. 부분공간끼리는 합집합이 부분공간이 못 되므로 (§1.2.4) 그 자리에 합공간을 대신 둔다.

![포함-배제 원리와 차원 정리의 대응](/images/blog/linear-algebra/ch01/fig-01-07-inclusion-exclusion.svg)

*그림 1.7.4. 유한집합의 포함-배제 원리(위)와 차원 정리(아래)는 같은 모양 — $\cup$ 자리에 $+$, 원소 수 자리에 차원이 들어간다.*

차원 정리는 *부분공간 격자에서의 포함-배제 원리*인 셈이다. 이런 동형성은 격자 이론(lattice theory)의 한 단면이다.

가장 깔끔한 경우는 두 부분공간이 *전혀 겹치지 않을* 때다. $U \cap W = \{0\}$ 이면 차원이 단순히 더해진다. 이런 깨끗한 합을 **직합(direct sum)** 이라 부르고 $V = U \oplus W$ 라 적는다. 직합은 단지 표기 약속이 아니라 *모든 벡터가 두 조각으로 유일하게 분해된다*는 강력한 성질을 품고 있다. 이 분해가 §6 정사영, §7 표준형의 직합 분해, §8 이차형식의 분해까지 끝없이 등장한다.

---

## §1.7.1 직합(direct sum) — 겹침 없는 합

> **📐 정의 1.7.1 (직합, $k=2$).** 부분공간 $U, W \subseteq V$ 가 $U \cap W = \{0\}$ 을 만족하면 합 $U+W$ 를 $U \oplus W$ 로 쓰고 *직합(direct sum)*이라 한다.
>
> 부분공간 $U_1, \dots, U_k$ 의 합으로 일반화하려면 다음 동치 조건 중 하나를 요구한다.

두 부분공간이 영벡터 외에는 겹치지 않으면 직합이고, 모든 벡터가 유일한 두 조각으로 쪼개진다.

> **📐 명제 1.7.2 (직합의 동치 조건).** 부분공간 $U_1, \dots, U_k$ 에 대해 다음 셋은 동치이다.
> 1. $U_1 + \cdots + U_k$ 의 모든 원소가 $u_1 + \cdots + u_k$ ($u_i \in U_i$) 로 *유일하게* 표현된다.
> 2. $u_1 + \cdots + u_k = 0$ ($u_i \in U_i$) 이라면 모든 $u_i = 0$.
> 3. 각 $i$ 에 대해 $U_i \cap \bigl(\sum_{l \neq i} U_l\bigr) = \{0\}$.

**증명.**

**(1) ⇔ (2)** (1) 에서 영벡터(zero vector)의 두 표현 — 자명한 $0 = 0 + \cdots + 0$ 과 가정한 $u_1 + \cdots + u_k = 0$ — 이 모두 같아야 하므로 (2) 가 따라온다. 역방향: 두 표현 $\sum u_i = \sum u'_i$ 가 있으면 $\sum (u_i - u'_i) = 0$ 이고, $u_i - u'_i \in U_i$ 이므로 (2) 에서 $u_i = u'_i$.

**(2) ⇔ (3)** (3) 의 부정 = 어떤 $i$ 에서 $U_i \cap \sum_{l \neq i} U_l$ 안에 $0$ 이 아닌 $u_i$ 가 있음. 그러면 $u_i = -\sum_{l \neq i} u_l$ 으로 비자명한 (2) 의 위반 결합을 만들 수 있고, 역방향도 마찬가지. ∎

$k = 2$ 일 때는 (3) 이 $U_1 \cap U_2 = \{0\}$ 한 줄로 줄어든다. 이 단순한 형태가 우리가 가장 자주 만나는 경우다.

![직합 V = U ⊕ W](/images/blog/linear-algebra/ch01/fig-01-02-direct-sum.svg)

*그림 1.7.3. $V = U \oplus W$ 의 기하 ($\mathbb{R}^2 =$ 직선 $U$ $\oplus$ 직선 $W$). 모든 벡터가 $U$ 성분과 $W$ 성분으로 *오직 한 가지 방식*으로 분해된다.*

---

## §1.7.2 차원 정리(dimension formula)

직합이 아닐 때는 어떻게 되는가? 두 부분공간이 일부 겹친다면 그 *겹침의 양*이 차원 합에 어떻게 반영되는가? 이 질문에 답하는 것이 차원 정리(dimension formula)다.

증명에는 두 가지 방식이 있다. 기저를 직접 손으로 만드는 구성적 증명과, 짧은 정확열(short exact sequence)을 이용한 우아한 한 줄 증명. 첫째는 손에 잡히는 그림이 있고, 둘째는 §2 이후의 언어를 빌리지만 단숨에 결론에 도달한다. 첫 증명을 본문에서, 둘째는 절 끝 메모에서 다룬다.

> **📐 정리 1.7.4 (차원 정리(dimension formula), dimension formula).** $V$ 가 유한차원이고 $U, W \subseteq V$ 가 부분공간(subspace)이라 하자. 그러면
> $$ \dim(U+W) + \dim(U\cap W) = \dim U + \dim W. $$

**증명 A (기저(basis)를 직접 만드는 구성적 증명).**

*전략:* $U \cap W$ 의 기저(basis)를 양쪽으로 확장해 $U+W$ 의 기저(basis)를 만든다.

*1단계 — 기저(basis) 잡기.* $U \cap W$ 의 기저(basis) $\{\gamma_1, \dots, \gamma_p\}$ 를 하나 잡는다. 이를 $U$ 쪽으로 확장해
$$ \{\gamma_1, \dots, \gamma_p,\ \alpha_1, \dots, \alpha_q\} \quad (U \text{의 기저(basis)}) $$
를 얻는다 (확장 정리 1.5.6). 마찬가지로 $W$ 쪽으로 확장해
$$ \{\gamma_1, \dots, \gamma_p,\ \beta_1, \dots, \beta_r\} \quad (W \text{의 기저(basis)}) $$
를 얻는다. 따라서 $\dim(U \cap W) = p$, $\dim U = p+q$, $\dim W = p+r$.

*2단계 — 후보 기저(basis).* 다음 집합을 $U+W$ 의 기저(basis) 후보로 두자.
$$ \mathcal{C} := \{\gamma_1, \dots, \gamma_p,\ \alpha_1, \dots, \alpha_q,\ \beta_1, \dots, \beta_r\} \quad (\text{원소 수 } p+q+r). $$

*3단계 — 생성성.* $u + w \in U + W$ 일 때, $u$ 는 $\gamma$ 들과 $\alpha$ 들의 결합으로 적히고, $w$ 는 $\gamma$ 들과 $\beta$ 들의 결합으로 적힌다. 둘을 더하면 $\mathcal{C}$ 의 결합이 된다.

*4단계 — 일차독립(linearly independent).* $\mathcal{C}$ 의 일차결합(linear combination)이 영벡터(zero vector)라 하자.
$$ \sum c_i \gamma_i + \sum d_j \alpha_j + \sum e_k \beta_k = 0. \quad (\dagger) $$

좌변의 $\alpha$ 항을 한쪽으로 옮기면
$$ \sum d_j \alpha_j = -\sum c_i \gamma_i - \sum e_k \beta_k. $$
- 좌변은 $\alpha$ 들의 결합 → $U$ 의 원소.
- 우변은 $\gamma$ 와 $\beta$ 의 결합 → $W$ 의 원소.
- 두 변이 같으니 양쪽 모두 $U \cap W$ 에 들어간다.

곧 $\sum d_j \alpha_j \in U \cap W$ 이고, $U \cap W$ 의 기저(basis)는 $\{\gamma_i\}$ 라 $\sum d_j \alpha_j$ 가 $\{\gamma_i\}$ 의 결합으로도 적힌다. 그런데 $\{\gamma_i, \alpha_j\}$ 가 $U$ 의 기저(basis)(독립)이므로 $\alpha_j$ 의 계수는 모두 $0$:
$$ d_1 = \cdots = d_q = 0. $$

이를 $(\dagger)$ 에 대입하면 $\sum c_i \gamma_i + \sum e_k \beta_k = 0$. $\{\gamma_i, \beta_k\}$ 가 $W$ 의 기저(basis)(독립)이므로 모든 $c_i = e_k = 0$.

따라서 $\mathcal{C}$ 는 일차독립(linearly independent).

*5단계 — 결론.* $\mathcal{C}$ 가 $U+W$ 의 기저(basis)이고 원소가 $p+q+r$ 개. 그러므로
$$ \dim(U+W) = p+q+r = (p+q) + (p+r) - p = \dim U + \dim W - \dim(U \cap W). \quad \blacksquare $$

![차원 정리 도식](/images/blog/linear-algebra/ch01/fig-01-06-dimension-formula.svg)

*그림 1.7.5. 차원 정리(dimension formula)의 직관 — $U$ 와 $W$ 의 기저(basis)가 $U \cap W$ 의 기저(basis)를 공통으로 포함하므로, $U+W$ 의 기저(basis)를 만들 때 그 부분이 *두 번 세어진다*. 한 번 빼야 한다.*

---

## §1.7.3 따름정리와 함정

> **📐 따름정리 1.7.6 (직합의 차원).** $V = U \oplus W$ 이면 $\dim V = \dim U + \dim W$.

**증명.** $U \cap W = \{0\}$ 이라 $\dim(U \cap W) = 0$ 이고 차원 정리에서 곧장. ∎

직합인 경우엔 차원이 단순히 더해진다. 이 단순함이 §6 정사영, §7 표준형 분해 등에서 끝없이 쓰인다.

**예 1.7.7.** $V = \mathbb{R}^3$, $U =$ x-y 평면, $W =$ y-z 평면. $\dim U = \dim W = 2$, $U \cap W =$ y-축이라 $\dim 1$, $U + W = \mathbb{R}^3$ 이라 $\dim 3$. 검증 — $3 + 1 = 2 + 2$. ✓

두 평면이 일부만 겹치는 상황이다. 차원이 $2 + 2 = 4$ 가 아니라 $3$ 이 되는 이유는 겹친 y-축 차원 $1$ 만큼 빠지기 때문이다. 차원 정리가 정확히 이 "빠지는 양"을 일반화한다.

---

## 자기점검

1. $V = U \oplus W$ 라는 명제를 차원(dimension)만으로 검증하려면 무엇을 더 확인해야 하는가?
2. 차원 정리(dimension formula)의 좌·우변이 비음수가 되는 이유를 직관적으로 설명하라.
3. $U + W = V$ 이고 $\dim U + \dim W = \dim V$ 이면 $V = U \oplus W$ 인가?

답은 [`self-check.md`](./self-check.md) §1.7 에 있다.

---

## 메모

**증명 B (몫공간 단편, 짧은 정확열).** §2 이후의 언어를 빌리는 한 줄 증명을 미리 적어 둔다.

먼저 새 용어 두 개. *짧은 정확열(short exact sequence)*이란 $0 \to A \to B \to C \to 0$ 꼴의 세 사상 연쇄로, 첫 사상은 단사, 마지막 사상은 전사, 중간에서는 *앞 사상의 상*과 *뒷 사상의 핵*이 정확히 일치하는 구조다. 차원에 대해서는 *덧셈이 균형을 이룬다* — $\dim B = \dim A + \dim C$. (자세한 의미는 §2 에서.)

이제 짧은 정확열
$$ 0 \to U \cap W \xrightarrow{\Delta} U \oplus W \xrightarrow{\sigma} U + W \to 0,\quad \Delta(x) = (x, -x),\ \sigma(u, w) = u+w $$
을 보자. *몫공간 동형정리*에 의해 차원이 가법적으로 합쳐진다 — $\dim(U \oplus W) = \dim(U \cap W) + \dim(U+W)$. 한편 직합의 정의에서 $\dim(U \oplus W) = \dim U + \dim W$. 두 식을 비교하면 결론.

*증명 A 는 기저를 직접 구성하는 손맛이 있고, 증명 B 는 동형정리의 따름정리로 단숨에 끝난다. 다만 B 는 §2 이후의 언어 (선형사상, 핵·상, 몫공간) 가 있어야 깔끔하다.*

**셋 이상의 직합(direct sum) — 가설을 빼면.** 여러 부분공간(subspace)의 직합(direct sum) 정의에서 "쌍별 교집합이 $\{0\}$" 만으로는 부족하다. $\mathbb{R}^2$ 위의 서로 다른 세 직선 $L_1, L_2, L_3$ 를 보자. 어느 두 직선의 교집합도 $\{0\}$ 이지만, $L_1 + L_2 + L_3 = \mathbb{R}^2$ 의 한 원소를 분해하는 방법은 유일하지 않다 — $L_1$ 위의 점 하나가 $L_2$ 위의 점과 $L_3$ 위의 점의 합으로도 표현되어 버린다. 그래서 직합(direct sum) 정의는 "쌍별" 보다 강한 명제 1.7.2 의 (3) 으로 가야 한다.

![세 직선의 반례 — 쌍별 교집합 {0} 만으로는 부족](/images/blog/linear-algebra/ch01/fig-01-12-three-lines-not-direct-sum.svg)

*그림 1.7.8. $L_1, L_2, L_3 \subset \mathbb{R}^2$ 는 모두 원점에서만 만나지만, 점 $P=(2,2)$ 의 분해가 *둘 이상* 존재한다. "쌍별 교집합이 자명" 만으로는 직합이 보장되지 않는 결정적 반례.*

---

## 🌉 응용으로 가는 다리

이 절의 도구들 — 부분공간(subspace), 직합(direct sum), 차원 정리(dimension formula) — 가 다른 분야에서 *어떻게 쓰이는지* 한 단락씩 짚어 두자.

### 머신러닝 — PCA 와 부분공간 분해

데이터 $x_1, \dots, x_N \in \mathbb{R}^d$ 가 주어졌다고 하자. 주성분분석(PCA)이 하는 일은 한 줄로 정리된다 — *분산을 가장 잘 설명하는 $k$-차원 부분공간(subspace) $W \subseteq \mathbb{R}^d$ 를 찾는다*.

이 부분공간이 결정되면 자동으로 직합(direct sum) 분해 $\mathbb{R}^d = W \oplus W^\perp$ 가 따라온다. 데이터의 *주요 정보*는 $W$ 성분이, *노이즈·잔차*는 $W^\perp$ 성분이 가진다. 우리가 §1.7 에서 다룬 직합(direct sum) 의 *유일 분해* 성질이 정확히 이 데이터 압축의 수학적 근거다 — 차원 정리에서 $\dim W + \dim W^\perp = d$ 가 보장한다. (직교성은 §6 에서.)

### 양자역학 — 큐비트 직합 분해

큐비트(qubit)는 $\mathbb{C}$-벡터공간(vector space) $\mathbb{C}^2$ 의 단위벡터로 표현된다. 표준기저 $\{|0\rangle, |1\rangle\}$ 가 두 1차원 부분공간 $\mathbb{C}|0\rangle \oplus \mathbb{C}|1\rangle = \mathbb{C}^2$ 으로 *직합 분해*된다.

임의의 큐비트 상태 $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$ 의 *유일한 분해*가 직합(direct sum) 의 유일성에서 곧장 따라온다. 측정 시 두 결과의 확률 $|\alpha|^2, |\beta|^2$ 가 정확히 이 두 부분공간(subspace) 으로의 *정사영* 의 노름 제곱이다. $n$-큐비트 시스템 $\mathbb{C}^{2^n}$ 도 $2^n$ 개 1차원 부분공간의 직합으로 같은 식으로 분해된다.

### 그래픽스 — 동차좌표가 어파인을 선형으로 만든다

$\mathbb{R}^3$ 의 회전·스케일은 선형사상이지만, *병진(translation)* $x \mapsto x + b$ 는 영벡터를 영벡터로 보내지 않으므로 선형사상이 *아니다*. 그래서 $\mathbb{R}^3$ 의 이런 변환을 행렬곱 하나로 표현할 수 없다.

해결책은 한 차원을 더 보태는 것이다. $\mathbb{R}^3$ 의 점을 $\mathbb{R}^4$ 의 부분공간(subspace) $\{(x, y, z, 1)\}$ 위로 *임베딩*한다 (이것은 부분공간이 아니라 *아핀 부분공간*임에 주의 — §1.2.1 메모 참조). 그러면 병진이 $\mathbb{R}^4$ 위에서 $4 \times 4$ 행렬곱으로 표현된다. 이를 *동차좌표*(homogeneous coordinates)라 하고, 모든 컴퓨터 그래픽스 파이프라인의 토대다.

### 수치해석 — FEM 의 유한차원 근사

$[0, 1]$ 위에서 정의된 미분방정식 $-u''(x) = f(x)$ 를 푼다 하자. 해 $u$ 는 무한차원 함수공간 $C^2[0,1]$ 의 원소다. 컴퓨터로는 직접 다룰 수 없다.

유한요소법(FEM)의 핵심 아이디어는 유한차원 부분공간(subspace) 을 잡는 것이다. 구간을 $0 = x_0 < x_1 < \cdots < x_n = 1$ 로 쪼개고, 각 점에서 *삼각형 모양 hat function* $\phi_i$ 를 정의한다. 이 $\{\phi_1, \dots, \phi_{n-1}\}$ 이 한 $(n-1)$-차원 부분공간 $V_h$ 의 기저(basis)가 된다.

원래 무한차원 문제의 해를 $V_h$ 안의 *근사해* $u_h = \sum c_i \phi_i$ 로 대신 찾는다. 미지수가 $n-1$ 개의 계수 $c_i$ 로 줄었으므로, 결국 $(n-1) \times (n-1)$ 선형연립방정식을 푸는 일이 된다. 이때 $V_h$ 의 차원(dimension)이 곧 *근사 정확도*를 좌우하고, $n \to \infty$ 일 때 $u_h \to u$ 가 (적절한 노름에서) 보장된다.

---

## 📜 역사 메모

- **1844** — H. Grassmann, *Die lineale Ausdehnungslehre*. 차원(dimension)·일차독립(linearly independent) 개념의 출발.
- **1888** — G. Peano. 오늘날과 같은 의미의 *벡터공간(vector space)*을 처음으로 공리화.
- **1913** — E. Steinitz. 교환 정리(exchange theorem). 차원(dimension)이 잘 정의된다는 사실이 명확해졌다.
- **1932** — S. Banach. 무한차원 노름공간(*Banach 공간*) — 함수해석학의 출발점.
- 한국 수학계의 표준 술어는 1980년대 이후의 한국어 수학 교과서를 거치며 자리 잡았다.

---

## 📋 교재 대조표

| 본 절 | Hoffman & Kunze | Shilov |
|---|---|---|
| §1.7.1 직합(direct sum) | (1장에서는 다루지 않음 — §6.6, p.209) | §2.4 **2.45–2.46**, p.45–46 |
| §1.7.2 차원 정리(dimension formula) | §2.3 **Theorem 6**, p.46–47 | §2.4 **2.47b**, p.47–48; 따름정리 **2.47c**, p.48 |

---

## 1장을 마치며

이로써 1장이 끝난다. 우리가 한 일을 한 줄로 요약하면 이렇다.

> *평면 위 화살표가 만족하는 두 연산을 추상화해 벡터공간(vector space)을 정의하고, 그 안의 기본 도구 (부분공간(subspace), 생성, 일차독립(linearly independent), 기저(basis), 차원(dimension), 좌표(coordinate), 직합(direct sum), 차원 정리(dimension formula)) 를 차례로 갖췄다.*

이 도구들은 그 자체로도 의미 있지만, 진짜 위력은 다음 장에서 드러난다.

§2 에서 우리는 *두 벡터공간(vector space) 사이의 사상* — 선형사상 — 을 도입한다. 그리고 그 순간 이 장의 모든 도구가 자연스럽게 살아 움직이기 시작한다. 핵과 상이라는 *두 부분공간(subspace)*, 차원(dimension)에 대한 등식 (rank-nullity 정리), 그리고 가역 선형사상 전체가 이루는 군 — $\mathrm{GL}(V)$ — 의 첫 등장.

1장이 *풍경*이라면 §2 는 그 풍경 위에서 일어나는 *움직임*이다. 그 움직임을 통제하는 군 구조가 사실 이 책의 끝까지 우리를 따라온다.

---

> ← 이전 절 [§1.6 좌표(coordinate)](./1.6-coordinate.md)
> 이 장 인덱스 → [README](./README.md)
> 다음 장 → §2 선형사상 (예정)
