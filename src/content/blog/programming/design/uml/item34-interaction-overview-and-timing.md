---
title: "UML 34: 상호작용 개요 + 타이밍 다이어그램 — 흐름과 시간 축의 두 시각"
date: 2026-05-03T05:00:00
description: "여러 시퀀스를 활동 흐름으로 묶는 'Interaction Overview', 라이프라인 상태를 시간 축으로 펴는 'Timing'. UML 2.0 신규 두 다이어그램을 한 편에."
tags: [UML, Interaction Overview, Timing Diagram, Interaction]
series: "UML 2.5.1"
seriesOrder: 34
draft: true
---

## 한 줄 요약

> **"상호작용 + 흐름 = Interaction Overview, 상호작용 + 시간 = Timing"** — 시퀀스·커뮤니케이션과 같이 *상호작용 4종*에 속하는 두 보조 다이어그램.

## 어떤 문제를 푸는가

상호작용 다이어그램 4종 중 시퀀스(18편)와 커뮤니케이션(33편)이 가장 많이 쓰입니다. 나머지 두 개:

- **Interaction Overview Diagram** — 여러 시퀀스를 *activity*처럼 흐름으로 묶고 싶을 때.
- **Timing Diagram** — 라이프라인의 *상태가 시간에 따라 어떻게 변하는지* 보고 싶을 때 (특히 임베디드·통신 프로토콜).

두 다이어그램 모두 UML 2.0에서 신규로 추가됐고, 비중은 작지만 *적합한 자리*에선 대체불가입니다.

---

## Part 1 — Interaction Overview Diagram

### 한눈에 보는 구조

![Interaction Overview](/images/blog/uml/diagrams/item34-interaction-overview.svg)

활동 다이어그램의 **노드** 자리에 시퀀스 다이어그램이 들어간 형태:

- 시작/종료 노드, 분기·병합, fork·join은 활동 다이어그램과 같음
- 각 활동 노드 위치에 **interaction occurrence**(`ref` 프레임)이 들어가 다른 시퀀스를 참조
- 또는 그 자리에 **inline sequence fragment**

### 언제 쓰나

- 큰 유스케이스의 *전체 흐름*은 활동으로, 각 단계의 *상세*는 시퀀스로 보고 싶을 때.
- 시퀀스 한 장에 다 그리기 너무 큰 시나리오를 *여러 시퀀스 + 흐름*으로 분해할 때.

### 예 — 주문 처리

![Order processing as an interaction overview with ref frames and a decision](/images/blog/uml/diagrams/item34-order-overview.svg)

각 `ref: XXX` 박스는 *다른 시퀀스 다이어그램*을 가리킵니다. 큰 흐름 + 디테일이 자연스럽게 분리.

### 시퀀스의 `ref` 프레임과의 관계

시퀀스 다이어그램 안에서도 `ref` 프레임으로 다른 시퀀스를 참조할 수 있습니다(18편). Interaction Overview는 그 `ref`들을 *시간 축이 아닌 흐름 그래프*에 배치하는 표기. **시퀀스 안 `ref` ≈ Interaction Overview의 노드**입니다.

### 자주 하는 실수

> ⚠️ 활동 다이어그램과 혼동

활동 다이어그램은 행동(action)을 노드로, Interaction Overview는 **상호작용**을 노드로 합니다. 노드 안에 시퀀스가 들어가면 후자.

> ⚠️ 작은 시나리오에 사용

시퀀스 한 장에 충분히 그릴 수 있는 흐름이면 그냥 시퀀스를 씁니다. Interaction Overview는 *분기·반복으로 묶인 5개 이상 시퀀스*가 모일 때 가치.

---

## Part 2 — Timing Diagram

### 한눈에 보는 구조

![Timing diagram — protocol handshake](/images/blog/uml/diagrams/item34-timing.svg)

전기·통신·임베디드 *타이밍 챠트*와 같은 표기:

- 가로축 — **시간**
- 세로축 — 라이프라인(객체)별 **상태** 또는 값
- 메시지는 라이프라인 사이를 잇는 화살표 (시간 위치 명시)

### 표기 두 가지

| 종류 | 특징 |
| --- | --- |
| **상태 줄 변형**(state-line) | 한 라이프라인의 상태가 *층층 막대*로 — Idle/Busy/Idle … |
| **값 줄**(value-line) | 한 라이프라인의 *값*이 시간에 따라 변동 — 32 → 64 → 128 … |

### 언제 쓰나

- **임베디드** — GPIO·인터럽트의 상태 시퀀스
- **통신 프로토콜** — TCP 핸드셰이크, I2C 비트 시퀀스
- **하드웨어·SoC** — 시계 신호와 데이터 라인의 위상 관계
- **실시간 시스템** — 데드라인·지연 시간 시각화

### 예 — TCP 3-way handshake

![TCP 3-way handshake as a timing diagram](/images/blog/uml/diagrams/item34-tcp-timing.svg)

각 라이프라인의 *상태가 언제 바뀌는가*를 한 눈에. 시퀀스 다이어그램은 *메시지 순서*는 잘 보여주지만 *상태 머신과의 결합*은 약합니다 — 타이밍 다이어그램이 그 결합을 그리는 자리.

### 시간 제약

가로축 위 시간 라벨로 정밀 표시:

```text
{t1 - t0 <= 100ms}    ← 응답시간 제약
{t2 - t1 = 50ms}      ← 정확 간격
```

24편(시간과 공간)의 시간 제약 표기와 같은 어휘.

### 자주 하는 실수

> ⚠️ 시퀀스로 충분한 시나리오에 사용

상태 전환이 *고정 시간*에 묶이지 않으면 시퀀스로 충분합니다. **시간이 critical**한 시나리오에서만 타이밍.

> ⚠️ 라이프라인 너무 많이

3-5개 정도가 한계. 더 많으면 *그룹별로 다이어그램 분할*.

> ⚠️ 시간 축 단위 누락

`ms·µs·cycle` 등 *단위*가 없으면 정밀한 의미가 사라집니다.

---

## 상호작용 4종 — 한 줄 요약

| 다이어그램 | 강조 | 언제 |
| --- | --- | --- |
| **시퀀스** | 시간 축 메시지 순서 | 기본 |
| **커뮤니케이션** | 객체 공간 배치 + 번호 | 링크 응집을 보고 싶을 때 |
| **Interaction Overview** | 여러 시퀀스의 *흐름 합성* | 큰 시나리오 분해 |
| **타이밍** | 시간 축 + 상태 변화 | 임베디드·프로토콜·실시간 |

UML 2.5.1 메타모델에서 넷 다 `Interaction`의 시각적 변형 — 같은 정보를 다른 카메라 앵글로 본 것.

## 정리

- **Interaction Overview** = 활동의 흐름 + 노드 자리에 시퀀스. 큰 시나리오의 *흐름*을 묶는다.
- **Timing** = 가로 시간 축 + 라이프라인의 상태/값. 임베디드·프로토콜·실시간의 *시간 critical* 시나리오에.
- 둘 다 UML 2.0 신규, 비중은 작지만 *적합한 자리*에선 대체불가.
- 상호작용 4종(시퀀스·커뮤니케이션·Interaction Overview·타이밍)은 모두 `Interaction` 메타클래스의 시각적 변형.

다음 편(마지막)은 **시스템과 모델** — 시리즈 마무리.

## 관련 항목

- [UML 18: 시퀀스 다이어그램](/blog/programming/design/uml/item18-sequence-diagrams)
- [UML 19: 활동 다이어그램](/blog/programming/design/uml/item19-activity-diagrams)
- [UML 21: 상태 머신](/blog/programming/design/uml/item21-state-machines)
- [UML 24: 시간과 공간](/blog/programming/design/uml/item24-time-and-space)
- [UML 33: 커뮤니케이션 다이어그램](/blog/programming/design/uml/item33-communication-diagrams)
