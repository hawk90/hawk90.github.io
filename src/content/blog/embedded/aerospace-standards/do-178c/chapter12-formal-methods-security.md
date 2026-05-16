---
title: "Ch 12: Formal Methods (DO-333) & 보안 (DO-326A) — 시리즈 마무리"
date: 2025-09-25T13:00:00
description: "수학적 증명으로 verification 충족 — SPARK Ada, Frama-C, Astrée. 항공 보안 supplement. 시리즈 마무리·산업 전망."
tags: [do-178c, do-333, do-326a, formal-methods, spark-ada, frama-c, security]
series: "DO-178C"
seriesOrder: 12
draft: false
---

마지막 장 — DO-178C의 *두 큰 supplement*: **DO-333 (Formal Methods)** 와 **DO-326A (Airworthiness Security)**. *수학적 증명*과 *사이버 보안*이 *현대 항공 SW의 두 새로운 축*. 시리즈를 마무리하며 *전체 그림*과 *향후 5-10년 전망*까지.

## DO-333 — Formal Methods Supplement

### 출처

```
Full name : RTCA DO-333 — Formal Methods Supplement to DO-178C and DO-278A
발행      : 2011-12-13 (DO-178C와 함께)
페이지   : 약 100
```

DO-178C *함께 발행*. *Test 위주 verification의 대안* 또는 *보완*.

### 왜 Formal Methods?

```
전통 verification (Test):
  ✓ 직관적, 결과 명확
  ✗ Exhaustive 보장 어려움 — *모든 input case 검증 불가*
  ✗ Bug가 *test 안 한 input에서* 발견될 수 있음

Formal verification:
  ✓ Mathematically exhaustive — *모든 가능한 input 검증*
  ✓ Runtime error의 *부재를 증명*
  ✗ Steep learning curve
  ✗ Tool cost 높음
  ✗ Specification 작성 어려움
```

DO-333은 *test와 formal methods의 조합* 또는 *test 일부를 formal로 대체* 허용.

## Formal Methods 도구

### SPARK Ada (Adacore)

```
언어: SPARK (Ada subset + annotations)
사용: Eurocontrol ATM, Airbus FBW, Rolls-Royce engine FADEC

특징:
  - Ada에 *formal annotation* 추가
  - Theorem proving + abstract interpretation 결합
  - DO-178C TQL-1 인증

증명 가능:
  - Runtime error 부재 (overflow, divide by zero, out-of-bound)
  - Functional correctness (specification 일치)
  - Information flow
  - Termination
```

#### SPARK 예

```ada
package body Calculator with
  SPARK_Mode
is

   function Divide (A, B : Integer) return Integer with
      Pre  => B /= 0 and then
              (if A = Integer'First then B /= -1),
      Post => Divide'Result = A / B;

   function Divide (A, B : Integer) return Integer is
   begin
      return A / B;
   end Divide;

end Calculator;
```

- `Pre`: 호출 전 조건 (B ≠ 0, INT_MIN/-1 회피)
- `Post`: 호출 후 보장 (결과 = A/B)
- SPARK Tool이 *모든 input*에 대해 *Pre + 코드 → Post* 성립 *수학적 증명*

증명 실패 시 *반례 (counterexample) 제공*. 코드 수정.

### Frama-C + ACSL

```
언어: C + ACSL annotations (specification language)
사용: NASA, Airbus, Mitsubishi

특징:
  - 기존 C 코드에 *spec 추가* → formal verify
  - WP (Weakest Precondition) plugin
  - Value Analysis (abstract interpretation)
  - 오픈소스 (커뮤니티 + 상용 지원)
```

#### Frama-C 예

```c
/*@ requires \valid(arr) && \valid(arr + len - 1);
    requires len > 0;
    assigns arr[0..len-1];
    ensures \forall integer i; 0 <= i < len ==> arr[i] == 0;
*/
void zero_array(int *arr, size_t len) {
    for (size_t i = 0; i < len; i++) {
        /*@ loop invariant 0 <= i <= len;
            loop invariant \forall integer j; 0 <= j < i ==> arr[j] == 0;
            loop assigns i, arr[0..i-1];
            loop variant len - i;
        */
        arr[i] = 0;
    }
}
```

ACSL annotation:
- `requires`: 함수 호출 전 조건
- `assigns`: 함수가 수정하는 메모리
- `ensures`: 함수 후 조건
- `loop invariant`: 루프 invariant
- `loop variant`: termination 입증

Frama-C가 *모든 invariant 자동 증명*. 실패 시 spec 수정 또는 코드 수정.

### Astrée — Abstract Interpretation

8장에서 본 *Astrée*. Airbus, NASA, ESA.

```
특징:
  - C 코드 + 메모리 모델 + RTOS 모델
  - 모든 가능한 runtime error 검출
  - 100% sound (false negative 없음)
  - False positive 일부 (manual review)

증명:
  - Division by zero 부재
  - Integer overflow 부재
  - Array out-of-bounds 부재
  - Null pointer dereference 부재
  - Uninitialized memory read 부재
```

Astrée가 *Airbus A380 FBW의 마지막 verification 단계*. *수만 줄 C 코드의 runtime error 0 증명*.

### Coq, Isabelle/HOL — Theorem Provers

```
용도: 수학적 정리 증명
사용: NASA (PVS), Boeing (PVS), seL4 microkernel (Isabelle/HOL)

특징:
  - 가장 강력 (모든 수학적 정리 증명 가능)
  - Steep learning curve (수개월-년)
  - Manual proof 작성
  - Aerospace: 특수 알고리즘 (encryption, control law) 위주
```

대규모 시스템보다 *critical kernel*에 집중. seL4 microkernel = *전 세계에서 수학적으로 fully verified OS kernel*.

## DO-333 통합 방식

DO-178C의 obj를 *formal methods로 대체*:

```
=== DO-178C Obj → Formal Methods 매핑 (예) ===

Obj A-5-1 (Code ↔ LLR consistency)
  Traditional: Code review + test
  Formal:      Code의 spec이 LLR과 일치함을 prove

Obj A-5-4 (Code accuracy + consistency)
  Traditional: Test + static analysis
  Formal:      Runtime error 부재 증명 (Astrée)

Obj A-6-1/2 (HLR/LLR test coverage)
  Traditional: Test cases for all req
  Formal:      Spec coverage + proof

Obj A-7-5 (Structural coverage analysis)
  Traditional: MC/DC
  Formal:      모든 paths를 spec이 cover
```

### Formal 적용의 장점

- *Exhaustive*: test보다 *더 많은 case 보장*
- *Earlier detection*: design 단계부터 bug 검출
- *Test 일부 대체*: verification 비용 감소

### Formal 적용의 단점

- *Specification 작성 어려움*: spec 자체가 bug 가능
- *Tool 학습 곡선*: 6 months-2 years per engineer
- *Tool 비용*: $50k-200k per seat
- *Specialty 인력*: drilled formal methods engineer 부족

## DO-333 사례 — 항공

### Airbus A380 / A350 FBW

```
Stack:
  - SCADE Suite (model-based, formal semantics)
  - Astrée (runtime error proof)
  - 일부 모듈에 SPARK Ada

성과:
  - Runtime error 0 (Astrée 증명)
  - Test 50% 감소 (formal 대체)
  - Bug rate < 0.1 per KLoC (산업 표준 1-5)
```

### NASA Mars Mission

```
Stack:
  - PVS (theorem prover)
  - 일부 control law formal verification

사용:
  - Mars rover navigation algorithm
  - Trajectory optimization
  - Critical anomaly detection
```

### seL4 — Fully Verified Kernel

```
- 모든 8,700 LoC C 코드가 formal verified
- Isabelle/HOL로 functional correctness 증명
- 사용처: DARPA HACMS UAV, autonomous vehicle, secure mobile
- 비용: ~$30M, ~20 person-years
```

10년+ 노력. 그러나 *결과적으로 무결한 OS kernel*.

## DO-326A — Airworthiness Security

### 출처

```
Full name : RTCA DO-326A — Airworthiness Security Process Specification
발행      : 2014-08-11
관련       : DO-356A — Methods for Establishing Security Assurance
페이지   : 약 30 (메인) + 90 (DO-356A)
```

*항공기 사이버 보안*. *Hijacker가 SW를 통해 항공기 통제*하는 위협 모델.

### 왜 DO-326A?

```
역사:
  - 2003: Boeing 777 데이터 통신 표준화
  - 2013: Boeing 787 FBW 공격 가능성 공개 (보안 연구자 Hugo Teso)
  - 2014: DO-326A 첫 발행
  - 2016: DO-356 발행
  - 2018-2020: 모든 신규 항공기에 보안 인증 요구

위협:
  - In-flight entertainment에서 cockpit으로 침투
  - ACARS (Aircraft Communications) hijack
  - GPS spoofing
  - ATC datalink 변조
  - Wi-Fi → flight system 침투
```

### Security Risk Assessment

DO-326A는 *risk assessment process* 정의.

```
1. Threat Identification
   - Asset 식별 (SW, HW, data)
   - Threat 식별 (공격자 capability, intent)
   - Attack vector (Wi-Fi, USB, RF, supply chain)

2. Vulnerability Assessment
   - 알려진 weakness (CVE 매핑)
   - Defense 평가

3. Risk Analysis
   - Probability × Impact
   - Acceptable risk threshold

4. Mitigation
   - Architecture isolation (DMZ)
   - Cryptographic protection
   - Input validation
   - Monitoring
```

### Security Objectives

DO-178C와 유사한 *objective-based* approach.

```
Security obj 예 (단순화):
  S-1: Threat model 정의
  S-2: Vulnerabilities 식별
  S-3: Risk 분류
  S-4: Mitigation 적용
  S-5: Security verification (penetration test)
  S-6: Continuous monitoring
  S-7: Vulnerability response procedure
```

각 obj가 *evidence 요구*.

### DO-326A 적용 예

```
=== Stall Warning Software Security Assessment ===

Asset:
  - Stall warning SW (DAL A)
  - AoA sensor data
  - Cockpit aural warning audio

Threats:
  T-1: Attacker injects false AoA data via maintenance port
       → False stall warning → pilot incorrect action
       → Impact: Catastrophic

  T-2: Attacker disables stall warning via cockpit display SW
       → Real stall missed → loss of control
       → Impact: Catastrophic

  T-3: Attacker tampers with stall threshold parameters
       → Late warning → reduced recovery time
       → Impact: Hazardous

Vulnerabilities:
  V-1: Maintenance port (USB) accessible during ground service
       → Mitigation: Physical access control + authentication

  V-2: AoA sensor → SW interface has no authentication
       → Mitigation: Hardware-level signal validation (separate processor)

  V-3: Cockpit display SW shares partition with Stall Warning
       → Mitigation: ARINC 653 IMA partitioning (already)

Risk Analysis:
  T-1 × V-1: Probability LOW (physical access required)
             Impact CATASTROPHIC → Risk MEDIUM
             Mitigation: Implemented (physical lock + audit)

  T-2 × V-3: Probability VERY LOW (separate partition)
             Impact CATASTROPHIC → Risk LOW
             Mitigation: Validated (partition integrity test)

Penetration Test Results:
  - All attack vectors tested
  - 0 successful exploits
  - Test details: Pen-Test-2024-SW-001

Security Approval:
  Lead Security Engineer: J. Kim   2024-09-30
  Safety Manager:          T. Park  2024-10-01
  FAA Security Liaison:    M. Wilson 2024-10-15
```

### KAI / KARI 적용

```
KF-21 Boramae:
  - DO-326A 적용 (수출용 필수)
  - 자체 cyber team
  - Pen test 정기적

KOMPSAT 위성:
  - 위성 ↔ 지상 통신 암호화 (NIST, FIPS)
  - 명령 인증 (cryptographic signature)

누리호:
  - 발사 시퀀스의 보안 (악의 명령 차단)
  - 텔레메트리 무결성
```

군용기는 *추가 표준 (MIL-STD)* 적용. 일반 항공도 DO-326A *점점 의무화*.

## 시리즈 마무리 — 전체 그림

DO-178C 12장의 *전체 흐름*:

```
Ch 1   : 표준 개요 + 국내 적용
Ch 2   : DAL × 71 obj 매트릭스
Ch 3   : Planning Phase (5 plan + 3 standard)
Ch 4   : Software Requirements (HLR)
Ch 5   : Software Design (LLR + Architecture)
Ch 6   : Source Code Standards (MISRA + SCS)
Ch 7   : Integration · Build · EOC
Ch 8   : Verification (Review, Analysis, Test)
Ch 9   : Coverage (Statement, Decision, MC/DC)
Ch 10  : Configuration Management & SQA
Ch 11  : Tool Qualification (DO-330)
Ch 12  : Formal Methods (DO-333) + Security (DO-326A)
```

각 장이 *수십~수백 페이지의 실무*. *총 수십만 페이지의 산출물*.

## DO-178C가 만든 항공 산업의 가치

```
지난 30년 (DO-178A/B/C 적용 후):
  민간 항공 비행 시간:    500 million hours
  치명적 SW-관련 사고:    매우 적음 (사고당 1 in 100M flight hours)

  특히 *FBW가 표준화*된 1990년대 이후:
  - SW가 *전 비행 envelope* 통제
  - SW 결함이 *catastrophic 사고로 직접 연결*
  - DO-178 표준이 *없었다면* 100x 더 많은 사고 추정
```

DO-178C는 *수많은 인명을 살린* 표준.

## 향후 5-10년 전망

### 1. AI/ML 항공 적용

```
현재 도전:
  - AI/ML은 *non-deterministic*
  - 전통 DO-178C 적용 불가
  - 인증 framework 없음

진행 중:
  - EASA Concept Paper for ML Safety (2021)
  - FAA + EASA + RTCA의 ML 표준 개발
  - DO-XXX (가칭) for ML — 2026-2028 예정

적용 분야:
  - Synthetic Vision / EFVS
  - Auto-taxi
  - Traffic Avoidance
  - Pilot Decision Support
  - 자율 항공기 (Joby Aviation, Wisk)
```

### 2. UAM (Urban Air Mobility) / eVTOL

```
2024-2030 신규 인증:
  - Joby Aviation S4 (FAA Type Certificate 진행)
  - Wisk Aero
  - Archer Midnight
  - 한국: 한화시스템, 현대 Supernal

DO-178C 적용:
  - FCS: DAL A
  - 자율 navigation: DAL A
  - HMI: DAL B
  - 통신: DAL B

특이점:
  - 100% electric (battery management critical)
  - VTOL 비행 모드 전환
  - 분산 추진 (12+ motors)
```

### 3. 신규 표준 통합

```
2024-2030 예상 변화:
  - DO-178D (예정) — AI/ML 통합
  - DO-326B — 보안 강화
  - 자율 항공기 인증 framework
  - 우주 인증과 통합 (DO-178C ⇔ NASA NPR 7150 ⇔ ECSS)
```

### 4. Tool 진화

```
- AI-assisted code review (GitHub Copilot 항공 변형)
- LLM 기반 requirements analysis
- Formal methods 대중화 (학습 곡선 감소)
- Cloud-based verification farm
- Continuous certification (월별 incremental)
```

### 5. 한국 항공 산업

```
2024-2030 한국 항공:
  - KF-21 양산 (2026)
  - KAI 무인기 globalization
  - 한화 위성·발사체 확대
  - 신생 우주 회사 성장 (페리지, 이노스페이스)
  - 한국형 UAM (현대, 한화)

DO-178C 인력:
  - 2024 현재: ~수백 명 (KAI + Korean Air + LIG + 한화)
  - 2030 전망: ~수천 명 필요
  - 인력 양성 부족 — 큰 도전
```

## 학습 경로 — DO-178C 시작하는 사람에게

```
Phase 1: 개념 (1-3 months)
  - 이 시리즈 12장 정독
  - RTCA DO-178C 책 (필수 — $200)
  - FAA AC 20-115D 읽기

Phase 2: 도구 (3-6 months)
  - LDRA Testbed 또는 VectorCAST trial
  - Polyspace Bug Finder + Code Prover
  - DOORS 기본 사용

Phase 3: 적용 (6-12 months)
  - 작은 DAL D 프로젝트 참여
  - PSAC, SDP 같이 작성
  - SOI 1 review 옵저버

Phase 4: 심화 (1-3 years)
  - DAL B/A 프로젝트
  - Verification 또는 Certification 전문
  - SOI review 진행

Phase 5: 전문가 (5+ years)
  - 새 프로젝트 PSAC lead
  - FAA DER 자격 (미국)
  - 한국 KAA DER 자격
  - International consultant
```

## 다음 시리즈 추천

이 시리즈를 마쳤다면 다음 시리즈 추천:

```
1. JSF C++ (12 챕터)
   - F-35 코딩 표준 → DO-178C와 함께 사용

2. NASA JPL Power of 10 (1 챕터)
   - 단순함의 미학

3. ECSS-Q-ST-80C (10 챕터)
   - 유럽 우주 SW (KARI 적용)

4. AUTOSAR C++14
   - 자동차 C++ — DO-178C와 유사 정신

5. MISRA C
   - 항공·자동차 공통 코딩 표준

6. CERT C
   - 보안 코딩 (DO-326A와 연결)

7. 실전 책 추천:
   - "Developing Safety-Critical Software" by Leanna Rierson
   - "DO-178B: Software Considerations" by Various
   - "Safety-Critical Computer Systems" by Storey
```

## 자료 — 참고문헌

```
1. RTCA DO-178C — Software Considerations in Airborne Systems
   https://www.rtca.org/training/

2. FAA AC 20-115D — Airborne Software Acceptance Guidelines
   https://www.faa.gov/regulations_policies/advisory_circulars/

3. EASA CM-SWCEH-002 — Software Aspects of Certification
   https://www.easa.europa.eu/

4. RTCA DO-330 — Software Tool Qualification
5. RTCA DO-331 — Model-Based Development
6. RTCA DO-332 — Object-Oriented Technology
7. RTCA DO-333 — Formal Methods
8. RTCA DO-326A — Airworthiness Security
9. ARP 4754A — Civil Aircraft Systems Development
10. ARP 4761 — Safety Assessment Process
11. SAE AS9100 — Quality Management for Aerospace
12. RTCA DO-254 — Hardware (DO-178C의 HW 자매)
```

## 정리

- DO-333 Formal Methods가 *test의 exhaustive 대안 또는 보완*.
- SPARK Ada, Frama-C, Astrée가 주요 도구.
- Airbus A380/A350 FBW가 Astrée로 *runtime error 0 증명*.
- DO-326A는 *항공기 사이버 보안* — 2014부터 의무.
- KF-21, KOMPSAT, 누리호 모두 DO-326A 적용.
- 향후 5-10년: AI/ML 인증, UAM/eVTOL, 한국 인력 양성이 핵심.
- DO-178C는 *항공 SW의 ISO 26262*. *수많은 인명을 살린 표준*.
- 학습 경로: 개념(3mo) → 도구(6mo) → DAL D(6mo) → DAL B/A(2yr) → 전문가(5yr).

## DO-178C 시리즈를 마치며

이 시리즈가 *국내 항공 SW 엔지니어에게 도움*이 됐기를 바랍니다. KAI, Korean Air, LIG Nex1, KARI, 한화 — 한국 항공 산업이 *DO-178C 인증 자원*에서 *세계 수준*에 도달하려면 *조직적 인력 양성*이 필요합니다. 이 시리즈는 *그 출발점*입니다.

질문·피드백은 *블로그 댓글* 또는 *GitHub issue*로.

## 관련 항목

- [Ch 11 — Tool Qualification (DO-330)](/blog/embedded/aerospace-standards/do-178c/chapter11-tool-qualification-do330)
- [JSF C++ Ch 1 — F-35 코딩 표준](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [ECSS-Q-ST-80C Ch 1 — ESA 우주 SW](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter01-introduction)
- [MISRA C](/blog/embedded/car-standards/misra-c/chapter01-introduction)
- [Astrée — AbsInt](https://www.absint.com/astree/)
- [SPARK Ada — Adacore](https://www.adacore.com/sparkpro)
- [Frama-C](https://frama-c.com/)
- [seL4 Verified Kernel](https://sel4.systems/)
- [Leanna Rierson — Developing Safety-Critical Software](https://www.routledge.com/Developing-Safety-Critical-Software-A-Practical-Guide-for-Aviation-Software/Rierson/p/book/9781439813683)
