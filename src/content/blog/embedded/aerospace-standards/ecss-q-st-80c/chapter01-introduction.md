---
title: "Ch 1: ECSS-Q-ST-80C — 유럽 우주 SW 표준의 전체 그림"
date: 2025-10-05T02:00:00
description: "ESA가 정의한 *European Cooperation for Space Standardization* — 위성·발사체·우주탐사 SW의 모표준. KARI·KOMPSAT·천리안·누리호 적용 사례."
tags: [ecss, esa, european-space, software-quality, kari, kompsat, nuri, satellite]
series: "ECSS-Q-ST-80C"
seriesOrder: 1
draft: false
---

**ECSS** (European Cooperation for Space Standardization)은 *유럽우주국(ESA), 유럽 우주 산업, 국가 우주청*이 공동 운영하는 *우주 시스템·SW 표준 체계*다. *ECSS-Q-ST-80C*는 그중 *SW Product Assurance* 표준 — *위성·발사체·우주 탐사선 SW의 품질 보증 절차*를 정의한다.

미국이 DO-178C(항공), NASA NPR 7150(우주), MIL-STD-498(군)을 분리해 사용한다면, 유럽은 *ECSS 하나의 체계*로 *항공·우주·국방*을 통합. 한국도 *KARI(한국항공우주연구원)*가 *ECSS를 부분 채택*해 *KOMPSAT 위성, 천리안, 누리호 발사체*에 적용.

## 출처

```
Full name : ECSS-Q-ST-80C Rev.1 — Space Product Assurance — Software Product Assurance
Issued    : 2014-02-15 (Rev.1)
조직      : ESA + 유럽 산업 (Airbus, Thales, OHB 등)
페이지   : 약 70
가격     : 무료 (ECSS website 다운로드)
관련 표준 : ECSS-E-ST-40C (SW Engineering — Engineering 측면)
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

ECSS-Q-ST-80C는 *Q(품질) 가운데 SW 영역*. *짝꿍은 ECSS-E-ST-40C* (SW 엔지니어링).

```
ECSS-Q-ST-80C : "어떻게 좋은 SW를 만들 *과정*을 보장하는가" (Product Assurance)
ECSS-E-ST-40C : "어떻게 SW를 *만드는가*" (Engineering)
```

두 표준이 *함께 사용*. ECSS-Q-ST-80C 단독 적용은 불가능.

## 적용 — 어디에 쓰는가

```
ESA 미션 (모든 미션)
  Sentinel (Copernicus 지구관측, 1~6)
  Galileo (글로벌 항법)
  BepiColombo (수성 탐사, 2018~)
  Solar Orbiter (2020~)
  JUICE (목성 탐사, 2023~)
  Euclid (다크 매터 탐사, 2023~)
  Ariane 6 (발사체, 2024 첫 비행)

ESA 협력 미션
  James Webb Space Telescope (NASA + ESA)
  Cassini-Huygens (NASA + ESA + ASI)

유럽 우주 산업
  Airbus Defence and Space (위성, 발사체)
  Thales Alenia Space
  OHB SE (위성 버스)
  Avio (Vega 발사체)
  ArianeGroup (Ariane 발사체)

비유럽 협력
  KARI (한국) — KOMPSAT, Chollian, 누리호
  JAXA (일본) — 일부 ESA 협력 미션
  Roscosmos (러시아) — Soyuz 등 (현재 제재로 협력 중단)
```

ECSS는 *유럽 우주 시장 진입의 필수 조건*. 한국 우주 산업이 *ESA와 협력*하려면 *ECSS 준수*가 전제.

## ISO 26262 / DO-178C vs ECSS — 비교

| | ECSS-Q-ST-80C | DO-178C | ISO 26262 |
|---|--------------|---------|-----------|
| 분야 | 우주 (위성·발사체) | 민간 항공 | 자동차 |
| 발행 | ECSS 2014 | RTCA 2011 | ISO 2018 |
| 등급 | Criticality A~D | DAL A~E | ASIL D~A + QM |
| 강제도 | "shall" / "should" | objectives 71개 | 단계별 V-model |
| 코딩 표준 | ECSS-E-ST-40C 안에서 *자체 정의* | 자체 정의 (MISRA C 흔함) | 자체 정의 (MISRA C/C++ 흔함) |
| Tool Qualification | 자체 (Annex Q) | DO-330 별도 표준 | Part 8 |
| 무료 | 무료 | 유료 (~$200) | 유료 (~$300) |
| 인증 주체 | ESA, Notified Body | FAA, EASA | TÜV, UL |

ECSS의 *무료 공개*가 큰 장점. 학생·연구자도 *직접 접근* 가능.

## Criticality Level — 4단계

ECSS는 SW의 *failure 결과*에 따라 *4단계*.

| Level | Failure Effect | 예 |
|-------|---------------|-----|
| **A** | Catastrophic — 미션 실패 또는 인명 손실 | 발사체 비행 제어, 우주 정거장 ECLSS |
| **B** | Critical — 미션 주 목적 손실 | 위성 자세 제어, 영상 센서 처리 |
| **C** | Major — 일부 기능 손실, 미션 진행 | 통신 redundancy, 보조 navigation |
| **D** | Minor — 영향 미미 | Telemetry 로깅, ground station GUI |

DO-178C의 DAL A~D와 *거의 동일 의미*. Level E (No Effect)에 해당하는 *완전 면제 등급은 없음*.

### Criticality 결정

ECSS-Q-ST-80C는 *Criticality assessment*를 *별도 절차*로 정의 (Annex F).

```
1. 시스템 hazard analysis (ECSS-Q-ST-40C 안전)
2. SW의 contribution 분석
3. Severity 분류 (Catastrophic ~ Marginal)
4. SW Criticality 부여 (A~D)
5. PA Plan에 명시
```

## 핵심 활동 — 9 가지

ECSS-Q-ST-80C는 *9개 핵심 활동*을 정의:

```
1. SW Product Assurance Management
   - SPA Plan 작성·관리
   - Stakeholder 협력

2. SW Process Assurance
   - 개발 절차 준수 검증
   - Audit·review

3. SW Product Properties Assurance
   - 코드 품질·메트릭
   - Testability·maintainability

4. SW Reusable Components Assurance
   - 외부 라이브러리·OS 검증
   - Heritage SW 사용

5. SW Configuration Management
   - 버전·branch·release 관리
   - Change control

6. SW Non-Conformance Control
   - 결함 등록·추적·종결

7. SW Procurement Assurance
   - 외부 SW 발주·인수 검증

8. SW Project Assurance
   - 전체 일정·예산·자원 추적

9. SW Verification and Validation
   - Independent V&V (ISVV)
   - Acceptance test
```

DO-178C의 *5 process 그룹*과 *대응*하지만 *유럽 특유의 강조점*:
- **Reusable Components Assurance** — 유럽은 *legacy SW 재사용* 강조.
- **Procurement Assurance** — 다국적 협력 발주 잦음.
- **Independent V&V** — ESA가 *외부 검증 팀* 요구 강함.

## ISVV — Independent Software Verification & Validation

ECSS의 특징. *개발 팀과 독립*된 V&V 팀.

```
ISVV 활동 (ECSS-Q-ST-80C §5.9 + Annex K)
  - Requirements 검증
  - Design 검증
  - Code static analysis
  - Test review (개발 팀이 만든 test를 검증)
  - Test execution (독립적으로 실행)
  - Coverage 분석
  - Anomaly 분석

조직:
  - 개발 회사: Airbus, Thales, OHB
  - ISVV 회사: SCISYS, Critical SW, OHB (제한적), 일부 전문 회사
  - 자금: ESA 또는 미션 운영 회사가 발주
```

Criticality A/B는 *ISVV 의무*. Criticality C는 *권장*. D는 *자체 V&V 충분*.

## 코딩 표준 — ECSS-E-ST-40C 안

ECSS-Q-ST-80C 자체는 *코딩 표준 명시 없음*. *ECSS-E-ST-40C가 Engineering 측면*에서 코딩 표준 요구.

```
ECSS-E-ST-40C §5.5.6.2 (Coding Standards)
  - 프로젝트 차원에서 *Coding Standard Document* 작성
  - *언어별 표준* 채택 가능
  - 자주 사용되는 외부 표준:
    - C       : MISRA C
    - C++     : MISRA C++ 또는 자체
    - Ada     : RavenSPARK
    - Python  : PEP 8 (지상 SW)
```

대부분의 ESA 미션이 *MISRA C + 추가 ECSS 규칙*. 유럽 우주 펌웨어는 *Ada도 광범위 사용* (Ariane 5 발사체, SPOT 위성 등).

## ECSS-E-ST-40C — SW Engineering의 11 단계

```
1. SW Related System Requirements
2. SW Requirements Analysis (SRR — System Requirement Review)
3. SW Architectural Design (PDR — Preliminary Design Review)
4. SW Detailed Design (CDR — Critical Design Review)
5. SW Coding
6. SW Unit Testing
7. SW Integration Testing
8. SW Validation against SR (Software Requirements)
9. SW Delivery and Acceptance
10. SW Operations and Maintenance
11. SW Disposal
```

Waterfall + V-model의 결합. *각 단계에 review*. Agile은 *공식 미지원*이지만 *부분적 적용 가능*.

## Tool Qualification — Annex Q

```
Tool 분류:
  Class 1: 도구 출력이 *최종 SW에 통합*
            → 가장 엄격한 qualification
  Class 2: 도구가 *검증 결과를 제공*
            → 도구 실수가 검증 누락 가능
  Class 3: 도구가 *개발 보조*
            → 가벼운 검증
```

DO-330의 TQL과 *유사 개념*.

```
컴파일러 (GCC, Diab, IAR)   : Class 1 — 가장 엄격
정적 분석기 (QAC, Polyspace) : Class 2
빌드 시스템, 버전 관리      : Class 3 (또는 면제)
```

## 국내 적용 — KARI 사례

### KOMPSAT 시리즈 (다목적실용위성)

```
KOMPSAT-1 (1999)   : 자체 표준 (ECSS 영향 적음)
KOMPSAT-2 (2006)   : ECSS 부분 채택 (Astrium 협력)
KOMPSAT-3 (2012)   : ECSS-E-ST-40C 본격 적용
KOMPSAT-3A (2015)  : ECSS 전체 채택
KOMPSAT-5 (2013)   : ECSS + ESA 협력 검증
KOMPSAT-6 (2025~)  : ECSS-Q-ST-80C + DO-178C 일부
KOMPSAT-7A (2030)  : MISRA C + ECSS
```

ESA·Airbus와의 *협력 경험*으로 KARI가 *ECSS 절차*를 내부화.

### 천리안 (GEO-KOMPSAT)

```
천리안 1 (2010)   : Astrium 주관 — ECSS 필수
천리안 2A/2B (2018/2020)  : Airbus + KARI — ECSS
천리안 3 (2030~)   : ECSS + 자체 표준
```

천리안은 *Astrium*(현재 Airbus DS)이 주관해 *ECSS가 표준*. KARI는 *kick-off부터 ECSS 절차*에 익숙해야 했다.

### 누리호 (KSLV-II)

```
KSLV-I 나로호 (2013)   : 러시아 협력 — RD-151 엔진 + 자체
KSLV-II 누리호 (2022)  : 100% 국내 + ECSS 일부 참고
KSLV-III (개발 중)     : ECSS 본격 적용 검토
```

발사체 SW는 *Criticality A의 극단*. 누리호는 *DO-178C와 ECSS 양쪽 참고*.

### 한화 우주

```
한화 에어로스페이스 위성 사업
   - 영국 OneWeb 참여 (~648 satellite)
   - 자체 위성 (큐브샛 → 대형)
   - ECSS 절차 부분 채택
```

### 신생 우주 회사

```
컨텍 (Contec, 지상국)         : ECSS 부분 참고
페리지에어로스페이스         : Blue Whale 1 발사체 — 자체 표준 + ECSS 일부
이노스페이스                  : 하이브리드 엔진 — 자체 표준
나라스페이스                  : 위성 — ECSS 절차 학습 중
```

KARI 외 *민간 우주 산업*도 *ECSS 점진 채택*. 정부 발사·인증 시 *ECSS 적용 권장*.

## 학생·연구자에게

ECSS는 *무료 공개*. 모든 표준이 *PDF로 다운로드 가능*.

```
https://ecss.nl/

주요 다운로드:
  ECSS-Q-ST-80C Rev.1   — 이 시리즈 정본
  ECSS-E-ST-40C         — Engineering 짝꿍
  ECSS-Q-ST-30C         — Dependability
  ECSS-M-ST-80C         — Risk Management
  ECSS-Q-ST-40C         — Safety
```

대학 연구실에서 *위성·발사체 SW 학습* 시 *ECSS 절차를 따라가 보기* 가능.

## 시리즈 로드맵

이 시리즈는 ECSS-Q-ST-80C + 관련 표준을 *10장*에 정리:

1. **Ch 1 (지금)** — 표준 체계, KARI 적용
2. **Ch 2** — SW Process Assurance (개발 절차 보증)
3. **Ch 3** — SW Product Properties Assurance (코드 품질·메트릭)
4. **Ch 4** — SW Configuration Management (CM)
5. **Ch 5** — SW Non-Conformance Control (결함 관리)
6. **Ch 6** — SW Procurement Assurance (외부 SW 인수)
7. **Ch 7** — ISVV — Independent Software Verification & Validation
8. **Ch 8** — ECSS-E-ST-40C — SW Engineering의 11 단계
9. **Ch 9** — Tool Qualification (Annex Q)
10. **Ch 10** — 한국 우주 산업 적용 사례 종합 (KARI, KAI, 한화, 신생)

## 정리

- ECSS-Q-ST-80C는 *유럽 우주 SW Product Assurance 표준*.
- ECSS-E-ST-40C가 *Engineering 짝꿍*. 함께 사용.
- *Criticality A~D* (DO-178C의 DAL과 유사).
- *9 핵심 활동*. ISVV가 특징.
- 코딩 표준은 *자체 정의* — 대부분 *MISRA C/C++* + Ada.
- 무료 공개. 학생·연구자도 접근 가능.
- 국내 적용: KARI (KOMPSAT, 천리안, 누리호), 한화, 신생 우주 회사.

## 다음 장 예고

2장은 SW Process Assurance — *개발 절차 보증의 4 단계*와 *Audit/Review 방법*.

## 관련 항목

- [DO-178C Ch 1 — 항공 SW 인증](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [JSF C++ Ch 1 — F-35 코딩 표준](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [MISRA C Ch 1](/blog/embedded/standards/misra-c/chapter01-introduction)
- [ECSS 공식 — ecss.nl](https://ecss.nl/)
- [ESA 미션 페이지](https://www.esa.int/Enabling_Support/Space_Engineering_Technology)
- [KARI 공식](https://www.kari.re.kr/)
