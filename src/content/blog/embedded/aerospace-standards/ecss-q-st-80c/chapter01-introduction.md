---
title: "Ch 1: ECSS-Q-ST-80C — 유럽 우주 SW 표준의 전체 그림"
date: 2025-10-05T02:00:00
description: "ESA + 유럽 우주 산업이 운영하는 ECSS 체계 — Q/E/M 분류와 SW Product Assurance 표준."
tags: [ecss, esa, european-space, software-quality, satellite]
series: "ECSS-Q-ST-80C"
seriesOrder: 1
draft: false
---

**ECSS** (European Cooperation for Space Standardization)는 *유럽우주국 (ESA), 유럽 우주 산업, 국가 우주청*이 공동 운영하는 *우주 시스템·SW 표준 체계*. *ECSS-Q-ST-80C*는 그중 *SW Product Assurance* 표준 — *위성·발사체·우주 탐사선 SW의 품질 보증 절차*를 정의한다.

미국이 DO-178C(항공), NASA NPR 7150(우주), MIL-STD-498(군)을 분리해 사용한다면, 유럽은 *ECSS 하나의 체계*로 *항공·우주·국방*을 통합. *공개·무료* 접근이 큰 특징.

## 출처

```
Full name : ECSS-Q-ST-80C Rev.1 — Space Product Assurance — Software Product Assurance
Issued    : 2014-02-15 (Rev.1)
조직      : ECSS (ESA + 유럽 산업 + 국가 우주청)
페이지   : 약 70
가격     : 무료 (ecss.nl 다운로드)
관련 표준 : ECSS-E-ST-40C (SW Engineering)
            ECSS-M-ST-80C (Risk Management)
            ECSS-Q-ST-30C (Dependability)
```

ECSS는 *수십 개 표준*의 모음. ECSS-Q-ST-80C는 그중 *SW Quality* 영역.

## ECSS 표준 체계 — 3대 분류

```
ECSS-M (Management)        — Project Management
   ├── M-ST-10C  Project Planning
   ├── M-ST-80C  Risk Management
   └── ...

ECSS-E (Engineering)       — System Engineering
   ├── E-ST-10C  System Engineering
   ├── E-ST-40C  Software Engineering  ← SW의 *기술* 측면
   ├── E-ST-50C  Communications
   ├── E-ST-60C  Control Engineering
   └── ...

ECSS-Q (Quality Assurance) — Product Assurance
   ├── Q-ST-10C  Product Assurance Management
   ├── Q-ST-20C  Quality Assurance
   ├── Q-ST-30C  Dependability
   ├── Q-ST-40C  Safety
   ├── Q-ST-60C  EEE Components
   ├── Q-ST-70C  Materials
   └── Q-ST-80C  Software Product Assurance  ← 이 시리즈
```

ECSS-Q-ST-80C는 *Q (품질) 가운데 SW 영역*. *짝꿍은 ECSS-E-ST-40C* (SW Engineering).

```
ECSS-Q-ST-80C : "좋은 SW를 만드는 *과정*을 보장" (Product Assurance)
ECSS-E-ST-40C : "SW를 *만드는 방법*" (Engineering)
```

두 표준이 *함께 사용*. ECSS-Q-ST-80C 단독 적용은 의미 없음.

## 적용 — 어디에 쓰는가

ESA mission 다수가 *ECSS 적용*:

```
ESA 미션 (대표 예):
  Sentinel (Copernicus 지구관측, 1~6)
  Galileo (글로벌 항법)
  BepiColombo (수성 탐사)
  Solar Orbiter
  JUICE (목성 탐사)
  Euclid (다크 매터 탐사)
  Ariane 5 / Ariane 6 (발사체)

ESA 협력 미션:
  James Webb Space Telescope (NASA + ESA)
  Cassini-Huygens (NASA + ESA + ASI)
```

유럽 우주 산업 (Airbus DS, Thales Alenia Space, OHB 등)도 *ECSS 적용*.

각 mission의 *상세 SW process / 적용 표준 list*는 *공식 발표 / mission 문서*에 따라 다르며, *비공개인 경우도 흔하다*.

## ECSS vs DO-178C vs ISO 26262

| | ECSS-Q-ST-80C | DO-178C | ISO 26262 |
|---|--------------|---------|-----------|
| 분야 | 우주 (위성·발사체) | 민간 항공 | 자동차 |
| 발행 | ECSS 2014 (Rev.1) | RTCA 2011 | ISO 2018 (2nd ed) |
| Criticality | A~D | DAL A~E | ASIL D~A + QM |
| Tool Qualification | 자체 (Annex Q) | DO-330 별도 표준 | Part 8 |
| 무료 공개 | 공개 / 무료 | 유료 | 유료 |

ECSS의 *무료 공개*가 큰 장점. 학생·연구자도 *직접 접근* 가능. 정확한 비교는 *각 표준 원문* 참조.

## Criticality Level — 4단계

ECSS는 SW의 *failure 결과*에 따라 *4단계*.

| Level | Failure Effect (일반 의미) |
|-------|---------------------------|
| **A** | Catastrophic — 미션 실패 또는 인명 손실 |
| **B** | Critical — 미션 주 목적 손실 |
| **C** | Major — 일부 기능 손실, 미션 진행 |
| **D** | Minor — 영향 미미 |

DO-178C의 DAL A~D와 *유사한 의미*. 정확한 정의·assignment 절차는 *ECSS-Q-ST-80C Annex F*.

### Criticality 결정 (개략)

```
1. 시스템 hazard analysis (ECSS-Q-ST-40C Safety)
2. SW의 contribution 분석
3. Severity 분류
4. SW Criticality 부여 (A~D)
5. PA Plan에 명시
```

## 핵심 활동 — 9 가지

ECSS-Q-ST-80C가 정의하는 *핵심 활동* (정확한 wording은 원문):

```
1. SW Product Assurance Management
2. SW Process Assurance
3. SW Product Properties Assurance
4. SW Reusable Components Assurance
5. SW Configuration Management
6. SW Non-Conformance Control
7. SW Procurement Assurance
8. SW Project Assurance
9. SW Verification and Validation (ISVV 포함)
```

DO-178C의 *5 process 그룹*과 *대응*하지만 *유럽 특유의 강조점*:
- **Reusable Components Assurance** — 유럽은 *legacy SW 재사용* 강조
- **Procurement Assurance** — 다국적 협력 발주 흔함
- **Independent V&V** — ESA가 *외부 검증 팀* 요구 강함

## ISVV — Independent Software Verification & Validation

ECSS의 특징. *개발 팀과 독립*된 V&V 팀.

```
ISVV의 일반 정신:
  - Requirements / Design / Code / Test 독립 review
  - 다른 도구, 다른 방법
  - Criticality A/B에서 외부 회사 일반 의무

조직:
  - 유럽에 ISVV 전문 회사 다수
  - 정확한 회사·인력은 Ch 7 참조
```

자세히는 Ch 7 (ISVV) 참고.

## 코딩 표준 — ECSS-E-ST-40C 안

ECSS-Q-ST-80C 자체는 *코딩 표준을 명시하지 않음*. *ECSS-E-ST-40C*가 *coding standard 작성 요구*.

```
ECSS-E-ST-40C
  - 프로젝트 차원의 *Coding Standard Document* 작성
  - *언어별 표준* 채택 가능
  - 자주 사용되는 외부 표준:
    - C       : MISRA C
    - C++     : MISRA C++ 또는 자체
    - Ada     : RavenSPARK
    - Python  : PEP 8 (지상 SW)
```

유럽 우주 SW에 *Ada* 사용도 활발 (Ariane 5 발사체, 위성 등). 자세히는 *각 표준 원문*.

## ECSS-E-ST-40C — V-model 단계 (개략)

```
1. SW Related System Requirements
2. SW Requirements Analysis (SRR)
3. SW Architectural Design (PDR)
4. SW Detailed Design (CDR)
5. SW Coding
6. SW Unit Testing
7. SW Integration Testing
8. SW Validation against SR
9. SW Delivery and Acceptance
10. SW Operations and Maintenance
11. SW Disposal
```

Waterfall + V-model의 결합. *각 단계에 review*. Agile 적용은 *부분적*. 자세히는 Ch 8.

## Tool Qualification — Annex Q

```
Tool 분류 (개략):
  Class 1: 도구 출력이 *최종 SW에 통합*
            → 가장 엄격
  Class 2: 도구가 *검증 결과를 제공*
            → 도구 실수가 검증 누락 가능
  Class 3: 도구가 *개발 보조*
            → 가벼운 검증
```

DO-178C의 *DO-330 TQL*과 유사 개념. 자세히는 Ch 9.

## 한국 우주와 ECSS — 일반 관계

한국 mission이 *유럽 협력 (Astrium / Airbus DS / Thales 등)*을 거치는 과정에서 *ECSS process에 노출*되어 왔다는 *일반적인 산업 관찰*은 자주 인용된다. 단:

- 각 한국 mission의 *공식 SW 표준이 ECSS인지 자체 표준인지*는 *KARI / 관련 기관 공식 발표가 없는 한 단정하지 않는다*.
- 기관·기업의 *내부 process / 사용 표준*은 *비공개*.

자세히는 Ch 10 (한국 적용)에서 *공개된 사실만* 정리.

## 학생·연구자에게

ECSS는 *무료 공개*. 모든 표준이 *PDF 다운로드 가능*.

```
https://ecss.nl/

주요 다운로드:
  ECSS-Q-ST-80C Rev.1   — 이 시리즈 정본
  ECSS-E-ST-40C         — Engineering 짝꿍
  ECSS-Q-ST-30C         — Dependability
  ECSS-M-ST-80C         — Risk Management
  ECSS-Q-ST-40C         — Safety
```

대학 연구실에서 *위성·발사체 SW 학습* 시 *ECSS 절차*를 *직접 따라가 보기* 가능.

## 시리즈 로드맵

이 시리즈는 ECSS-Q-ST-80C + 관련 표준을 *10장*에 정리:

1. **Ch 1 (지금)** — 표준 체계
2. **Ch 2** — SW Process Assurance
3. **Ch 3** — SW Product Properties Assurance
4. **Ch 4** — SW Configuration Management
5. **Ch 5** — SW Non-Conformance Control
6. **Ch 6** — SW Procurement Assurance
7. **Ch 7** — ISVV
8. **Ch 8** — ECSS-E-ST-40C
9. **Ch 9** — Tool Qualification (Annex Q)
10. **Ch 10** — 한국 우주 — 공개 사실 + 시리즈 마무리

## 정리

- ECSS-Q-ST-80C는 *유럽 우주 SW Product Assurance 표준*.
- ECSS-E-ST-40C가 *Engineering 짝꿍*. 함께 사용.
- *Criticality A~D* (DO-178C의 DAL과 유사).
- *9 핵심 활동*. ISVV가 차별점.
- 코딩 표준은 *자체 정의* — 보통 MISRA C/C++ + Ada.
- 무료 공개. 학생·연구자도 접근 가능.
- 한국 적용 / 기관 내부 정보는 *공식 발표만* 인용.

## 다음 장 예고

2장은 *SW Process Assurance* — 절차 보증.

## 관련 항목

- [DO-178C Ch 1 — 항공 SW 인증](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [JSF C++ Ch 1 — F-35 코딩 표준](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [MISRA C Ch 1](/blog/embedded/car-standards/misra-c/chapter01-introduction)
- [ECSS 공식 — ecss.nl](https://ecss.nl/)
- [ESA mission 페이지](https://www.esa.int/Enabling_Support/Space_Engineering_Technology)
- [KARI 공식](https://www.kari.re.kr/)
