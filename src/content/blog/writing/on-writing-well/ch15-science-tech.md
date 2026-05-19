---
title: "Chapter 15: Science and Technology"
date: 2026-05-14T15:00:00
description: "과학과 기술 글의 비밀 — A에서 B, B에서 C로 차근차근. 비유의 활용과 전문 용어의 정의."
series: "On Writing Well"
seriesOrder: 15
tags: [writing, nonfiction, zinsser, science, technology]
type: book-review
bookTitle: "On Writing Well"
bookAuthor: "William Zinsser"
draft: false
---

과학과 기술 글은 어렵습니다. *추상*과 *전문 용어*가 가득합니다. 일반 독자에게 *quantum entanglement*, *gradient descent*, *CRISPR*를 설명하는 일은 쉽지 않습니다.

그러나 Zinsser는 단호하게 말합니다.

> 핵심 원칙은 *한 단계씩(step by step)*입니다.

A에서 B로, B에서 C로. 점프하지 않습니다. 이 한 줄이 모든 과학 글의 방법론입니다.

## Logical Chain — 논리의 사슬

좋은 과학 글의 구조는 *사슬*입니다.

1. 기본 개념 (모두가 알 만한)
2. 그 위에 새 개념 (기본에서 한 걸음)
3. 그 위에 또 새 개념 (조금 더 깊이)
4. ...

각 단계가 *이전 단계*를 전제로 합니다. 점프하면 독자가 떨어집니다.

### 점프의 함정

| 구분 | 예문 |
|------|------|
| 회피 (점프) | "Quantum entanglement requires understanding tensor products of Hilbert spaces ..." |
| 선호 (단계적) | "First, imagine two coins. If you flip them, each is heads or tails independently. Now imagine two quantum coins where flipping one instantly affects the other — even when they are miles apart. This is quantum entanglement." |

같은 개념이지만 두 글은 완전히 다릅니다. 첫 글은 *이미 양자역학을 아는 사람*에게만 통합니다. 두 번째는 *누구나* 따라옵니다.

### 단계의 *크기*

| 단계 크기 | 결과 |
|----------|------|
| 큰 단계 | 독자 일부 떨어짐 |
| 작은 단계 | 모두 따라옴 |
| 너무 작은 단계 | 지루함 |

균형이 필요합니다. 자기 분야의 *모범 과학 작가*가 보통 *적절한 단계 크기*의 모델입니다.

## 비유 (Analogy) — 추상을 구체로

과학 글의 가장 강력한 도구는 *비유*입니다.

- "DNA는 책의 페이지처럼 정보를 담는다."
- "원자는 태양계처럼 핵 주위에 전자가 돈다."
- "메모리는 책상처럼 — 자주 쓰는 것은 가까이, 잘 안 쓰는 것은 멀리."
- "네트워크 패킷은 우편 봉투처럼 주소가 적혀 있다."
- "바이러스의 mutation은 복사기의 오타처럼 점차 누적된다."

좋은 비유는 *독자가 이미 아는 것*에서 출발합니다. 모르는 것을 *아는 것으로* 풀어내는 작업입니다.

### 비유의 한계도 명시

비유는 *완벽한 일치*가 아닙니다. 한계도 명시해야 합니다.

- "DNA는 책의 페이지와 같이 정보를 담는다. 단, 책과 달리 DNA는 *복사*되고 *자기 자신을 읽으면서* 변할 수 있다."
- "원자는 태양계처럼 — 다만 양자역학적 효과 때문에 *경로*가 고정되지 않는다."

이런 *단, 다만*이 비유를 *느슨하게 사용하는* 정직함입니다.

### 흔한 좋은 비유 — 예시

**컴퓨터 과학**:
- CPU = 요리사
- RAM = 도마
- Disk = 냉장고
- Cache = 카운터 위 자주 쓰는 그릇

**생명과학**:
- 세포 = 작은 도시
- DNA = 청사진
- 단백질 = 일꾼
- mRNA = 명령서

**물리학**:
- 시공간 = 천 (general relativity)
- 에너지 = 화폐
- entropy = 흩어짐

자기 분야에 *통하는 비유 한두 개*를 정리해 두면 글이 즉시 명료해집니다.

## 전문 용어 (Jargon)

전문 용어를 *정확히 정의*한 뒤 사용합니다.

### 정의의 형식

**첫 등장**:
> "Compile (the process of translating source code into machine code) is the first step ..."

**이후**:
> "Compile" — 정의 후 자유롭게 사용

### 정의가 없을 때

| 구분 | 예문 |
|------|------|
| 회피 | "The compiler optimizes the AST before code generation." (AST, code generation — 일반 독자에 불명) |
| 선호 | "The compiler first turns the program into a tree structure (called an AST), then optimizes it before producing the final machine code." (개념을 풀어 설명) |

### 약어의 함정

자기 분야 약어를 무심코 쓰면 외부 독자가 떨어집니다.

| 구분 | 예문 |
|------|------|
| 회피 | "PCR amplifies the target sequence." |
| 선호 | "PCR — polymerase chain reaction — amplifies the target sequence by repeatedly copying it." |

처음 등장할 때 *풀어 쓰고*, 이후 약어를 사용합니다.

## 사람 잊지 마세요 — Who

과학·기술 글에서 종종 *사람이 사라집니다*. 추상적 *현상*과 *결과*만 남습니다.

| 구분 | 예문 |
|------|------|
| 회피 (사람 없음) | "The phenomenon was discovered in 1995." |
| 회피 (사람 없음) | "The model was developed to predict ..." |
| 선호 (사람 있음) | "In 1995, a researcher named Alice Chen noticed an unusual pattern." |
| 선호 (사람 있음) | "To predict X, Brown and his team built a model ..." |

사람이 들어가면 *추상이 구체*로 바뀝니다. 독자가 *발견의 순간*에 함께합니다.

### 발견의 *과정* 그리기

> "Chen was reviewing data from a routine experiment when she spotted an anomaly. She had seen similar patterns before, but always dismissed them as noise. This time, she ran the experiment again — and the pattern returned."

같은 *발견*도 *과정*을 그리면 살아납니다.

## 모범 작가들

과학 글의 거장들. 이들의 책을 한 권씩 읽으면 자기 글이 발전합니다.

### Carl Sagan — *Cosmos*

천문학을 *시*에 가깝게 썼습니다. *We are made of star-stuff* 같은 문장이 과학을 *인간의 의미*와 연결합니다.

### Stephen Jay Gould — 진화생물학

수백 편의 에세이. 한 작은 사례에서 *진화의 큰 그림*으로 확장하는 솜씨가 일품입니다.

### Oliver Sacks — *The Man Who Mistook His Wife for a Hat*

신경학의 *환자 이야기*. 의학과 문학을 결합했습니다. 사례 연구가 *문학*이 될 수 있음을 보였습니다.

### Richard Feynman — *Surely You're Joking, Mr. Feynman!*, *The Feynman Lectures*

물리학의 가장 명료한 설명. 복잡한 개념을 *일상의 비유*로 풀었습니다.

### Atul Gawande — *Complications*, *Being Mortal*

의학을 *인간의 이야기*로. 외과 의사가 글을 쓴다는 것의 가능성.

### Mary Roach — *Stiff*, *Packing for Mars*

과학을 *유머와 호기심*으로. 죽음, 우주 식사 같은 주제를 가볍게 다루지만 깊이가 있습니다.

이들의 공통점:
- 인간적 voice
- 구체적 사례
- 단계적 설명
- 큰 그림과 작은 디테일의 결합

## 한국의 과학 작가

- 정재승 — *과학콘서트*
- 최재천 — *최재천의 인간과 동물*
- 김상욱 — *떨림과 울림*
- 이정모 — *공생, 생명은 어떻게 진화했는가*

한국어로도 좋은 과학 글의 모델이 있습니다.

## 자기 점검

- 각 단계가 *이전 단계*를 전제로 하는가?
- 점프가 없는가? (독자가 따라올 수 있는가)
- 추상적 개념에 *비유*가 있는가?
- 비유의 한계가 명시되었는가?
- 전문 용어가 *처음 등장 시* 정의되었는가?
- 사람과 발견 과정이 그려졌는가?
- 자기 분야의 모범 작가에서 배운 패턴이 있는가?

## 정리

- 과학 / 기술 글은 *단계적*
- *비유*로 추상을 구체로 — 한계도 명시
- 전문 용어는 *정의 후 사용*
- 사람을 잊지 말 것 — *누가 발견 / 누가 영향*
- Carl Sagan, Oliver Sacks, Feynman, Gawande 등 모범
- 한국 과학 작가도 좋은 모델

## 다음 장 예고

다음 장은 **Business Writing**입니다. 비즈니스 글의 가식적 관습과 그 비용을 다룹니다.

## 관련 항목

- [Chapter 14: Writing About Yourself](/blog/writing/on-writing-well/ch14-yourself)
- [Chapter 16: Business Writing](/blog/writing/on-writing-well/ch16-business)
- [Chapter 3: Clutter](/blog/writing/on-writing-well/ch03-clutter) — jargon의 일반론
