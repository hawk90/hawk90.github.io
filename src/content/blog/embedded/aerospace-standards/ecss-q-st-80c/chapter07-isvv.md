---
title: "Ch 7: ISVV — Independent Software Verification & Validation"
date: 2026-05-18T08:00:00
description: "ECSS의 특징 — 외부 독립 V&V 활동, 7 영역, 일반 적용 가이드."
tags: [ecss, isvv, verification, validation, independence, esa]
series: "ECSS-Q-ST-80C"
seriesOrder: 7
draft: true
---

ECSS의 *가장 특징적인 활동* — **ISVV (Independent Software Verification & Validation)**. *Criticality A/B에서 외부 독립 V&V 의무*. *유럽 우주 산업의 ISVV ecosystem*은 ESA mission 30+ 년 기간을 거치며 형성. *구체 절차·deliverable은 ECSS-Q-ST-80C 원문 참조*.

## ISVV의 정의 — 일반 원칙

ECSS-Q-ST-80C의 *Independent Software Verification and Validation*은 *개발 조직과 기술적·관리적·재정적으로 독립된 조직*이 수행하는 V&V 활동.

**3차원 독립:**

**1. Technical Independence**

- 별도 도구
- 별도 방법론
- 독립적 분석

**2. Managerial Independence**

- 별도 reporting chain
- 별도 조직
- 결정 권한 분리

**3. Financial Independence**

- 별도 funding
- 별도 budget
- 가능하면 별도 회사

DO-178C의 *Independence*는 *조직 내 다른 팀*도 가능. ECSS의 *ISVV*는 *별도 회사 권장*. 정확한 wording은 *ECSS-Q-ST-80C 원문*.

## Criticality와 ISVV 의무

| Criticality | ISVV |
|-------------|------|
| A | 외부 의무 (일반) |
| B | 강한 권장 |
| C | 프로젝트 결정 |
| D | 자체 가능 |

정확한 의무 사항은 *ECSS-Q-ST-80C tailoring guide* 참조.

## Internal V&V vs ISVV

**Internal V&V (개발 조직):**

- 같은 도구·환경·mindset
- Confirmation bias 위험
- 빠르고 저렴

**ISVV (외부 조직):**

- 다른 도구·방법
- Fresh perspective
- Confirmation bias 차단
- 비싸고 느림

ECSS는 *둘 다 권장*. ISVV는 *internal V&V를 대체하지 않음*. *추가 layer*.

## ISVV 활동 영역 — 7 가지

ECSS-Q-ST-80C의 ISVV 영역 (Annex K 참조):

**1. ISVV Planning**


**2. Requirements V&V**


**3. Design V&V**


**4. Code V&V**


**5. Test V&V**


**6. Process Audit**


**7. Anomaly Analysis**

각 영역의 *구체 절차·산출물*은 원문 *Annex K*.

## 1. ISVV Planning

Mission scope, contract, deliverable 정의:

**ISVV Plan의 일반 내용:**

- ISVV Provider 선정
- Scope (어느 module / 어느 phase)
- Out of scope
- Schedule
- Deliverable (V&V reports, anomaly reports, final report)
- Approval chain (PM, QM, Director, 일부 customer)

## 2. Requirements V&V

ISVV가 HLR / LLR을 독립 review:

| 축 | 점검 |
|----|------|
| A. Completeness | 모든 system req가 HLR에 derive? 누락된 functional / non-functional req? |
| B. Correctness | HLR이 system req를 정확히 표현? Algorithm 정확성? |
| C. Consistency | HLR 간 모순? LLR과 HLR 일관? |
| D. Verifiability | 각 HLR이 측정 가능? Test 또는 analysis 방법 명확? |
| E. Traceability | System req ↔ HLR ↔ LLR 100 %? |

**방법**

- Manual review (sample-based)
- Formal review (random selection)
- 도구 분석 (e.g., DOORS link analysis)
- Cross-check with similar missions

### Anomaly Report — 일반 구조

ISVV는 *anomaly*를 발견하면 *anomaly report*로 개발 조직에 전달:

**ISVV Anomaly Report — 일반 template**

| 필드 | 내용 |
|------|------|
| Subject | [영향 영역, 한 줄 요약] |
| Severity | Critical / Major / Minor / Observation |
| Found by | [ISVV engineer] |
| Date | YYYY-MM-DD |
| Description | 발견 사항 + 근거 |
| Comparison / Reference | 유사 사례 또는 best practice |
| Recommendation | 개선 방향 |
| Impact | Mission / Quality 영향 |
| Owner Response | 개발 조직의 응답 — accept / discuss / reject + justification |

ISVV의 *external perspective*가 *internal team이 놓친 ambiguity·gap*을 발견하는 일반적 패턴.

## 3. Design V&V

ISVV가 Architecture + LLR을 독립 검토:

| 축 | 점검 |
|----|------|
| A. Architecture Adequacy | HLR을 모두 cover? Modular decomposition 합리적? Interface 명확? |
| B. LLR Accuracy | HLR에서 정확히 derive? Algorithm correctness, numerical analysis |
| C. Resource Budget | Memory, timing, CPU — worst-case 분석 |
| D. Failure Mode Coverage | FMEA 완전? FDIR 적절? |

### 일반적 Stability Analysis 예

제어 algorithm에 대한 *독립 stability analysis*는 ISVV의 일반적 활동:

- *원래 설계의 gain margin / phase margin*을 independent toolchain (예: Matlab Robust Control Toolbox)으로 *재검증*
- 다양한 *parametric uncertainty* (sensor noise, actuator saturation 등) 하에서 *robust stability* 분석
- 결과가 spec 만족 여부 + 개선 권장

이런 *독립 분석*이 *internal team이 놓친 marginal case*를 찾는 일반적 가치 흐름.

## 4. Code V&V

ISVV가 source code를 독립 분석:

| 축 | 점검 |
|----|------|
| A. Manual Code Review | Critical 모듈 sample-based, algorithm 정확성, defensive programming, edge case handling |
| B. Static Analysis (다른 도구) | 개발 조직과 다른 tool, 다른 rule set, cross-comparison |
| C. Formal Methods (가능 시) | SPARK Ada 또는 Frama-C, critical algorithm formal proof |
| D. Compliance Check | MISRA + project-specific rule, ECSS-E-ST-40C compliance |

### Concurrency Bug 발견 — 일반 패턴

ISVV가 *concurrent programming expertise*를 가져와 *race condition*을 발견하는 일반적 case:

```
일반 패턴:

// shared state
int fault_count;

// task A (main)
if (fault_count >= THRESHOLD) {
    enter_safe_mode();
    fault_count = 0;
}

// task B (ISR or other thread)
fault_count++;
```

이런 코드가 *단일 thread test*에서는 통과하나 *concurrent execution*에서 race condition. ISVV가 *별도 angle*에서 review로 발견하는 경우가 흔하다. 해결: atomic 변수, compare-and-swap, mutex 등.

## 5. Test V&V

| 축 | 점검 |
|----|------|
| A. Test Plan Adequacy | 모든 HLR이 test에 cover? Test 깊이 충분? Robustness test 포함? |
| B. Test Execution (Independent) | 일부 test를 ISVV가 *직접 실행*, 다른 environment 또는 같은 environment 재실행 |
| C. Coverage Re-analysis | 다른 도구로 measure, cross-comparison |
| D. Anomaly Validation | 개발 조직이 보고한 anomaly가 *진짜 fixed*? Re-test 일부 sample |

### 일반적 Robustness Test 발견

ISVV가 *broader scenario*로 *re-test*하여 *원래 test가 cover 못 한 case*를 발견하는 일반적 패턴:

```
Original test: 단일 nominal scenario만
ISVV re-test:  parameter sweep (rate, condition, duration 등)
              random initial conditions (50+)
              extended duration

결과:
  Original PASS scenario는 ISVV에서도 PASS
  Off-nominal에서 FAIL (spec 한계 외 + spec ambiguity)

Finding:
  - Spec gap (max 범위 명시 부족)
  - Test gap (broader coverage 부족)
```

## 6. Process Audit (by ISVV)

| 축 | 점검 |
|----|------|
| A. Process Compliance | SDP, SVP, SCMP, SQAP 따랐나? Sample-based check |
| B. Process Maturity | 정의된 절차가 실제 수행? Tailoring 적절? |
| C. Documentation Adequacy | 산출물 완전? Cross-references 정확? |
| D. Records Adequacy | Audit trail 완전? Approval signatures 있음? |

ISVV의 process audit이 *SPA (Ch 2) 자체 audit과 다름* — external perspective + cross-mission comparison.

## 7. Anomaly Analysis (by ISVV)

ISVV가 *개발 조직의 NCR pattern을 cluster + 분석*:

**일반 분석 흐름:**

**1. NCR sample을 root cause로 cluster**


**2. Top cluster 식별 (예: floating point, concurrency, doc drift)**


**3. 유사 mission과 비교**


**4. Trend 평가 (이번 mission이 다른 mission 대비 어떤가)**


**5. Cluster 별 systemic recommendation**

ISVV가 *수많은 mission 경험*을 가져와 *single mission perspective*보다 광범위한 인사이트.

## Final ISVV Report

Mission 종료 직전 *Final ISVV Report*를 작성. *전체 평가 + recommendation*.

**Final ISVV Report — 일반 template**

**Executive Summary**

- ISVV activities 완료 status
- 총 anomaly 수 (severity별)
- Resolution status
- Recommendation (Accept / Conditional / Reject)

**Detailed Findings**

- Phase별 finding 정리
- 각 finding의 closure status

**Quality Assessment**

- Process Maturity
- Code Quality
- Test Coverage
- Documentation
- Anomaly Handling

**Key Strengths** / **Key Improvement Areas** (다음 mission용) / **Conclusion + Approval Signatures**

이 *Final Report*가 *Acceptance Review에 제출*. 인증의 *결정적 evidence* 중 하나.

## 유럽 ISVV Ecosystem — 공개 정보

ESA mission 30+ 년 동안 *유럽에 ISVV 전문 회사 다수 형성*. *공개된 회사 예*:

- **Critical Software** (Portugal) — Galileo, Sentinel 등 ESA mission 다수 [criticalsoftware.com](https://www.criticalsoftware.com/)
- **SCISYS** (UK, now part of CGI) — 항공·우주·국방 [cgi.com](https://www.cgi.com/uk/en-gb/space-services)
- **Solenix** (Germany / Switzerland) — Mission operations [solenix.ch](https://www.solenix.ch/)
- **RHEA Group** (Belgium / Italy) — ESA + EU programs

각 회사의 *정확한 규모, 인력, mission 참여 history*는 *회사 공식 페이지* 참조. 전체 유럽 ISVV 인력 규모는 *공식 통계가 공개되지 않음* — 추정 수치는 제시하지 않는다.

## ISVV 도입 — 작은 조직

**신생 / 작은 우주 조직의 ISVV 단계 — 일반 가이드**

| Phase | 단계 | 특징 |
|-------|------|------|
| 1 | 자체 internal V&V 성숙 | 작은 missions, low criticality, 자체 가능 |
| 2 | 외부 컨설턴트 활용 | Critical 부분만 외주, 작은 ISVV 회사 contract |
| 3 | Mature operation | Mission criticality 증가에 따라, 자체 + 외부 조합, multi-provider for cross-check |
| 4 | Full ECSS compliance | Large mission, Criticality A, 별도 회사 ISVV, 정기 audit |

각 단계 *정확한 비용·인력·일정*은 *조직 특성*에 따라 다르다.

## 정리

- ISVV = *Technical + Managerial + Financial 독립*. ECSS의 차별점.
- Criticality A/B는 *외부 회사 ISVV* 일반 의무. 정확한 의무는 *ECSS-Q-ST-80C tailoring 가이드*.
- 7 활동: Planning, Req V&V, Design V&V, Code V&V, Test V&V, Process Audit, Anomaly Analysis.
- 다른 도구·다른 방법론·다른 perspective로 *internal V&V가 놓친 것 발견*.
- 유럽에 ISVV 전문 회사 다수 (Critical Software, SCISYS/CGI, Solenix 등).
- Final ISVV Report가 *Acceptance Review의 결정적 evidence*.
- 정확한 절차·deliverable·승인 기준은 *ECSS-Q-ST-80C 원문* 직접 참조.

## 다음 장 예고

8장은 *ECSS-E-ST-40C — SW Engineering* — V-model의 기술적 측면.

## 관련 항목

- [Ch 6 — Procurement Assurance](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter06-procurement)
- [Ch 8 — ECSS-E-ST-40C](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter08-ecss-e-st-40c)
- [DO-178C Ch 8 — Verification](/blog/embedded/aerospace-standards/do-178c/chapter08-verification-rat)
- [Critical Software](https://www.criticalsoftware.com/)
- [CGI Space Services](https://www.cgi.com/uk/en-gb/space-services)
- [Solenix](https://www.solenix.ch/)
