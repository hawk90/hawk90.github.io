---
title: "Ch 6: SW Procurement Assurance — COTS·OSS·Heritage 인수 절차"
date: 2025-10-05T07:00:00
description: "ECSS-Q-ST-80C §5.7 — Supplier qualification, COTS evaluation, OSS adoption, Heritage SW reuse. KARI 외주 관리."
tags: [ecss, procurement, cots, oss, heritage, supplier, kari]
series: "ECSS-Q-ST-80C"
seriesOrder: 6
draft: false
---

ECSS의 *고유 강조점* — *Procurement Assurance*. ESA mission이 *다국가 협력*과 *광범위 reuse*에 기반하므로 *외부 SW 인수*가 핵심. DO-178C의 *PDS (Previously Developed Software)*보다 *훨씬 광범위*. 이 장은 *Supplier qualification, COTS/OSS 평가, Heritage SW 통합, KARI 외주 관리*까지.

## Procurement Assurance의 정의 — ECSS-Q-ST-80C §5.7

> **SW Procurement**: Activities to ensure that externally procured software components satisfy the project's quality requirements.

핵심: *외부에서 들여온 SW도 우리 기준 충족*.

## 외부 SW 종류

```
1. COTS (Commercial Off-the-Shelf)
   - Wind River VxWorks
   - Mathworks Simulink
   - LDRA Testbed
   - 상용 라이브러리

2. OSS (Open Source Software)
   - Linux Kernel
   - RTEMS
   - eCos
   - LWIP, FreeRTOS, etc.

3. Heritage SW
   - 이전 mission 산출물
   - 자체 회사 reuse

4. Subcontracted SW
   - 다른 회사가 개발
   - 큰 mission에서 흔함 (Airbus → KARI subcontract)

5. Customer-Supplied SW
   - 운영자 (ESA, KARI)가 제공
   - Mission planning, calibration tool 등
```

각 종류마다 *다른 procurement procedure*.

## ESA의 SW Procurement Philosophy

```
Build vs Buy 결정:

Build (자체 개발):
  - Mission-critical
  - Innovation 요구
  - Long-term competitive advantage
  - 다른 mission에 재사용 계획

Buy (COTS):
  - 표준화된 기능
  - Vendor가 better expertise
  - Mature product
  - Cost-effective

Reuse (Heritage / OSS):
  - 검증된 코드
  - Schedule 압박
  - 신규 risk 감소
```

ECSS는 *reuse 강력 권장*. *bigger missions*가 *smaller modules*의 reuse pool 형성.

## Supplier Qualification

### Qualification Process

```
1. Supplier Identification
   - 가능한 vendor list
   - Reference check (이전 customer)
   - Financial stability

2. Initial Qualification
   - Capability assessment
   - SW process maturity (CMMI level)
   - 인증 (ISO 9001, AS9100, ECSS)
   - Reference project visits

3. Bid Evaluation
   - Technical proposal
   - Compliance to ECSS
   - Schedule + cost
   - Risk assessment

4. Contract Award
   - SOW (Statement of Work)
   - Quality requirements (ECSS-Q-ST-80C)
   - Deliverables
   - Acceptance criteria

5. Ongoing Monitoring
   - Periodic audit
   - Progress review
   - Quality monitoring

6. Acceptance
   - Verification
   - Documentation review
   - Customer approval
```

### Supplier Audit Checklist

```
=== Supplier Audit — XYZ Aerospace Co. ===

Date:     2024-08-15
Project:  KOMPSAT-7A AOCS subcontract
Auditor:  김OO (KARI Quality)

A. Organization
   ☐ Quality department independent of engineering
   ☐ Documented quality management system
   ☐ Trained personnel records
   ☐ Configuration management infrastructure

B. Process Maturity
   ☐ CMMI level (target: ≥ 3 for Criticality A)
   ☐ ISO 9001 certified
   ☐ AS9100 certified (aerospace)
   ☐ Previous ECSS project experience

C. Tool Infrastructure
   ☐ Requirements tool (DOORS or equivalent)
   ☐ Static analysis tool (qualified)
   ☐ Configuration management tool
   ☐ Test automation framework

D. Project Capabilities
   ☐ Similar mission experience
   ☐ Reference customers contactable
   ☐ Project team composition adequate
   ☐ Subject matter experts available

E. Sample Project Review
   ☐ Documentation completeness
   ☐ Process compliance
   ☐ Quality metrics
   ☐ Customer satisfaction

Findings:
  Major M-1: AS9100 certificate expires 2024-12, renewal pending
             Action: Renewal status by 2024-11

  Minor m-1: 일부 engineer에 ECSS training 부족
             Action: Training plan within 30 days

Conclusion:
  Conditional Approval pending Major resolution.
  Next audit: After AS9100 renewal.

Approval:
  KARI Quality Lead:    김OO    2024-08-15
  KARI Procurement:     이OO    2024-08-20
```

이 *audit이 supplier selection*. 정기 *재감사*.

## SOW — Statement of Work

Contract의 *핵심 문서*. *what to deliver + how to deliver*.

```
=== SOW for AOCS Subcontract — KOMPSAT-7A ===

1. Scope
   Supplier shall develop, verify, and deliver the AOCS Software
   for KOMPSAT-7A satellite per the requirements in Annex A
   (Software Requirements Specification).

2. Applicable Standards
   - ECSS-Q-ST-80C Rev.1 (Software Product Assurance)
   - ECSS-E-ST-40C (Software Engineering)
   - KARI-K7A-QA-001 (KARI Project-specific QA)
   - MISRA C:2012 (coding standard)

3. Deliverables
   3.1 Documentation
       - PSAC (review 1, 2)
       - SDP, SVP, SCMP, SQAP
       - SRD, SDD, SCS
       - Test plans + procedures
       - Test results + coverage reports
       - Configuration index
       - SAS

   3.2 Software
       - Source code (Criticality A modules)
       - Executable object code
       - Build environment

   3.3 Support
       - Integration support at KARI facility
       - Training (KARI engineers)
       - Operational support (1 year post-launch)

4. Quality Requirements
   - Criticality A coverage: MC/DC 100%
   - Defect density: < 1.0 per KLoC
   - Independent V&V (외부)
   - KARI audit access at all times

5. Schedule + Milestones
   PSAC submission:           2025-Q1
   PDR:                        2025-Q2
   CDR:                        2025-Q4
   QR:                         2026-Q3
   AR (Acceptance):            2026-Q4
   Launch:                     2027-Q1
   Operational support end:    2028-Q1

6. Acceptance Criteria
   - All deliverables submitted
   - All KARI reviews passed
   - 0 critical/major NCRs open
   - In-orbit demonstration successful (post-launch)

7. Intellectual Property
   - Source code: KARI ownership
   - Tools: Vendor ownership
   - Documentation: Joint

8. Penalty Clauses
   - Schedule slip: defined per clause 8.1
   - Quality miss: defined per clause 8.2
   - Mission failure: per clause 8.3

9. Subcontractor's Subcontractors (Lower-tier)
   Supplier shall flow down ECSS requirements to all subcontractors.

10. Audit Rights
    KARI may audit supplier at any time with 7 days notice.
    Audit access includes facility, personnel, records, tools.
```

SOW가 *legally binding*. *vague terms 거부*. 모든 deliverable이 *측정 가능*.

## COTS — Commercial Off-the-Shelf

### COTS Evaluation Process

```
Step 1: Need Assessment
  - 어떤 기능 필요?
  - Build vs Buy 분석
  - Budget + schedule

Step 2: Market Survey
  - Available COTS products
  - Vendor reputation
  - Reference customers
  - 가격 비교

Step 3: Technical Evaluation
  - Functional requirements 충족
  - Performance benchmark
  - Interface compatibility
  - Quality (defect history, support)

Step 4: ECSS Compliance Assessment
  - Heritage (사용 사례)
  - Certification status
  - Documentation availability
  - Source code access (검토 가능?)

Step 5: Risk Assessment
  - Vendor lock-in
  - Long-term support
  - Vendor financial stability
  - Mission lifecycle (수십 년)

Step 6: Trial / Proof of Concept
  - 작은 prototype 통합
  - 실제 환경 test

Step 7: Procurement Decision
  - Approval chain
  - Contract negotiation
  - License terms
```

### COTS Evaluation Report — VxWorks RTOS 예

```
=== COTS Evaluation Report — RTOS for KOMPSAT-7A ===

Candidates Evaluated:
  1. Wind River VxWorks Cert 6.9
  2. RTEMS 5.1 (OSS)
  3. Green Hills INTEGRITY 11.7
  4. SYSGO PikeOS 5.1

Evaluation Criteria + Scoring (1-5):

                          VxWorks  RTEMS  INTEGRITY  PikeOS
─────────────────────────────────────────────────────────
Functional fit              5       4        5         4
Performance                 5       4        5         4
Memory footprint            4       5        3         4
ECSS / DO-178C heritage     5       3        5         4
ESA-experience              5       5        4         3
Customization              4       5        3         4
Vendor support              5       3        5         4
Source code access          2       5        2         3
Long-term roadmap           5       4        5         4
Cost                        2       5        2         3
TOTAL                      42      43      39        37

Selection:
  RTEMS chosen for budget reasons
  + ESA mission heritage
  + Source code modifiability
  - Less commercial support (mitigated by KARI internal expertise)

Conditional:
  - Annual contracted support from OAR (RTEMS maintainer)
  - KARI internal RTEMS expert team established

Risk Mitigation:
  - Vendor lock-in: OSS이라 escape route 있음
  - Support: Internal team + community + paid contract
  - Heritage: ESA missions 이미 사용 (Galileo, Sentinel)
```

OSS도 *상업적 결정* 가능. KARI는 RTEMS 적극 채택.

### COTS Risk Mitigation

```
주요 COTS 위험:

1. Vendor lock-in
   Mitigation:
     - Abstract API layer
     - 이론적 escape route
     - Source code escrow (deposit at neutral 3rd party)

2. Vendor 폐업
   Mitigation:
     - Source code 권리 확보 (계약)
     - Multiple vendors evaluated
     - Internal expertise

3. Vendor가 product 단종
   Mitigation:
     - End-of-life clause in contract
     - Long-term support clause (10+ years)

4. Security vulnerabilities
   Mitigation:
     - Vendor의 vulnerability disclosure 절차
     - 패치 timeline 의무

5. Hidden defects
   Mitigation:
     - Heritage data 분석
     - Trial period
     - Extensive integration test

6. Documentation incomplete
   Mitigation:
     - Vendor에 documentation 의무화 in contract
     - Internal review of vendor docs
```

## OSS — Open Source Software

OSS 채택이 *증가*. ESA, NASA, KARI 모두 OSS 적극 활용.

### OSS Adoption Process

```
1. License Compatibility Check
   - GPL: 사용 시 *전체 코드 open 의무* (대부분 항공·국방 부적합)
   - LGPL: 라이브러리 link OK, 수정 시 open 의무
   - BSD/MIT/Apache: 사용 자유 (proprietary 가능)
   - Public Domain: 자유

   ESA 권장: BSD-like license

2. Heritage Verification
   - Used in similar mission?
   - Bug history
   - Active community

3. Source Code Review
   - Architecture 분석
   - Defect-prone areas 식별
   - Security audit

4. Modification Strategy
   - Use as-is?
   - Fork + customize?
   - Contribute back upstream?

5. Support Strategy
   - Community support 충분?
   - Paid commercial support 필요?
   - Internal expertise build?

6. ECSS Compliance Approach
   - SCS 적용 (MISRA 등) — 가능한가?
   - Coverage analysis 가능한가?
   - Static analysis 결과 acceptable?

7. Procurement Decision
   - SCMP에 등록
   - License compliance 검증
```

### OSS Example — Linux Kernel for Spaceflight

NASA, ESA, KARI 모두 *Linux 사용 증가*.

```
=== Linux Kernel for Spaceflight (실험적) ===

Mission examples:
  Mars Helicopter (Ingenuity)  : Linux 기반
  ISS experiments              : Linux (Raspberry Pi level)
  Some small satellites        : Linux

Challenges for ECSS adoption:
  - 30+ million LoC (전체)
  - 다양한 license (GPL, LGPL, BSD 혼재)
  - MISRA 부분 준수만
  - Static analysis 도전적
  - Real-time 보장 부족 (RT patch 필요)

Mitigation:
  - 사용 subset 제한 (필요 driver만)
  - GPL impact 분석 (별도 process 분리)
  - PREEMPT_RT patch 적용
  - 전체 boot 시간 측정 + WCET 분석
  - Penetration test (security)

KARI Pico-satellite using Linux:
  Mission: STEP-Cube Lab-2 (2024)
  License compliance: GPL 코드 분리
  Validation: Limited to non-critical operations
```

ECSS에 Linux 적용은 *진행 중인 도전*. *비-critical operation*에 *선제적 적용*. *critical*은 여전히 *VxWorks/RTEMS*.

## Heritage SW — ESA SAVOIR

ESA의 *Reference Software* — Heritage SW의 *체계화*.

### SAVOIR — Space Avionics Open Interface Architecture

```
SAVOIR (~2010 시작):
  - ESA + 산업 협력
  - OBSW (On-Board Software) 표준화
  - Modular component
  - Reuse-friendly

Components:
  - SAVOIR-FAIRE: Functional Reference Architecture
  - SAVOIR-IMA: Integrated Modular Avionics
  - SAVOIR-FAIRE / Open Source: 일부 OSS

Reuse benefits:
  - 새 mission이 ~50% reuse 가능
  - 검증 시간 단축
  - 비용 절감
```

### SAVOIR Component Catalog

```
=== SAVOIR Component Examples ===

1. OBC RTOS (RTEMS-based)
   Heritage: 50+ missions
   Reuse rate: ~90%

2. AOCS Core
   Heritage: 30+ missions
   Reuse: requires customization for mission

3. TT&C (Telemetry & Telecommand)
   Standard: PUS (Packet Utilization Standard)
   Heritage: 모든 ESA mission

4. FDIR (Fault Detection, Isolation, Recovery)
   Generic framework
   Mission-specific fault definitions

5. Power Manager
   Standard battery + solar array management
   Heritage: 20+ missions

6. Star Tracker Interface
   Standard for major vendors (Jena-Optronik, Sodern)
   Plug-and-play

7. GNSS Receiver Interface
   Plug-and-play (Galileo, GPS, GLONASS, BeiDou)
```

KARI도 *SAVOIR component 일부 활용*. 단 *완전 채택은 어려움* (security, IP).

## Heritage SW Tracking

```
=== Heritage SW Manifest — KOMPSAT-7A ===

Reused from KOMPSAT-6:
  - AOCS Core Algorithm (80% reuse)
  - TT&C Encoder/Decoder (95% reuse)
  - Star Tracker Interface (100% reuse)
  - SAR Processor Pipeline (50% reuse)

Reused from KOMPSAT-3A:
  - Thermal Management (90% reuse)
  - Power Management (85% reuse)

Reused from KOMPSAT-3:
  - GPS Interface (100% reuse)

External Heritage:
  - VxWorks Cert 6.9 (Wind River)
  - SAVOIR FDIR template
  - CCSDS protocol stack (free)

Customization:
  Total LoC:               125,000
  Reused unchanged:         52,000 (42%)
  Reused with modification: 38,000 (30%)
  New development:          35,000 (28%)

Reuse benefits:
  Estimated cost saving:   $15M (vs from scratch)
  Schedule saving:         18 months
  Quality benefit:         heritage defect rate ~0.3 per KLoC
                          (new code average: 1.2 per KLoC)
```

Heritage가 *KARI의 경쟁력*. *수십 년 미션 데이터*가 신규 미션의 *risk 감소*.

## Subcontractor Management

큰 mission은 *subcontract 흔함*. 관리 복잡.

### Subcontractor Procurement Levels

```
Tier 1: Prime Contractor (e.g., KARI for KOMPSAT)
  Customer: 정부 (과기부, KAA)

Tier 2: Major Subcontractor
  AOCS subsystem (예: 한화시스템)
  Payload (예: KAIST)
  Ground segment (예: 컨텍)

Tier 3: Component Supplier
  Star tracker (Jena-Optronik)
  RTOS (Wind River)
  GPS receiver (vendor)

Tier 4: Sub-component
  Sensors, components

Each tier가 *ECSS 의무 flow down*. Contract에 의무 포함.
```

### Communication Flow

```
KARI (Tier 1)
   ↓ Contract + SOW
한화 (Tier 2)
   ↓ Contract + SOW
Jena-Optronik (Tier 3)

Quality requirements flow downward.
Issues escalate upward.
Audits propagate per ECSS.
```

### Subcontract NCR Handling

```
1. Subcontractor finds NCR
2. Reports to upper tier (within 7 days)
3. Joint RCA if mission impact
4. Corrective action plan
5. Verification by upper tier
6. Closure (joint signatures)

If subcontractor refuses to fix:
  Escalation procedure (contract clause)
  Ultimately: contract termination
```

KARI의 subcontract 경험은 *Airbus와의 KOMPSAT-3A 협력*에서 학습. *지금은 자체 prime contractor*.

## Acceptance — Acceptance Review (AR)

External SW (subcontract 결과)를 *최종 인수*.

```
AR 절차:

1. Deliverable submission
   - Supplier가 contract에 정의된 deliverable 제출

2. Documentation Review
   - 모든 산출물 review
   - 누락 항목 확인

3. Software Verification
   - KARI가 received SW의 test 재실행
   - Coverage 확인
   - Independent V&V

4. Integration Test
   - KARI의 다른 component와 통합 test
   - HIL 테스트

5. Acceptance Decision
   - Accept / Conditional Accept / Reject

6. Conditional Acceptance
   - Major issue 해결 후 재AR
   - Minor issue는 next release에

7. Final Acceptance
   - Acceptance Certificate
   - Payment release (penalty clause 적용 후)
   - Operational support 시작
```

## Customer-Supplied SW (Customer-Furnished Item, CFI)

운영자(정부)가 제공하는 SW. *Calibration, mission planning* 등.

```
KARI CFI 예 (KOMPSAT mission):
  - Mission planning SW (운영기관 제공)
  - Calibration coefficient SW
  - Atmosphere model
  - Satellite tracking SW (지상국)

CFI procurement:
  - 운영기관이 제공
  - KARI는 *integration 책임*만
  - Documentation는 운영기관 책임
```

## Procurement과 Mission Cost

```
KOMPSAT mission 추정 procurement 비용 분포:

Supplied / Procured:
  RTOS (VxWorks Cert):           $500k (license + support)
  Static analysis (Polyspace):    $200k
  Test framework:                 $150k
  HIL simulator (dSPACE):        $5M (대형 투자)
  Star Tracker:                  $1M per unit
  GPS receiver:                  $500k per unit

Internal / Heritage:
  Reused components: 자체 (cost 0, 단 적응 cost)
  Internal development: payroll

Subcontracted SW:
  AOCS development: ~$10M
  Payload SW: ~$8M
  Ground SW: ~$5M

Total mission SW cost: ~$50M (포함 internal effort)
```

Procurement이 *큰 비중*. *잘못된 procurement = mission 실패*.

## Common Procurement Findings

```
가장 흔한 finding:

1. "COTS license 명시 안 됨 — GPL 가능성"
   교훈: License 검증 의무화

2. "Subcontractor가 ECSS 의무 일부 거부"
   교훈: Contract에 명시 + 정기 audit

3. "Heritage SW의 modification log 누락"
   교훈: Heritage tracking template

4. "Vendor product가 발표 단종"
   교훈: Long-term roadmap + escrow

5. "Customer-supplied SW의 quality 알려지지 않음"
   교훈: CFI도 verification 필요

6. "Subcontractor의 NCR이 prime에 늦게 통보"
   교훈: SLA + escalation in contract
```

## KARI 외주 전략

```
KARI 2024 procurement strategy:

Make (자체):
  - Mission unique 알고리즘 (AOCS, SAR processing)
  - Mission-critical real-time control
  - Heritage 보유 기능

Buy (COTS):
  - RTOS (VxWorks 또는 RTEMS)
  - Static analysis (Polyspace 또는 QAC)
  - Test framework (LDRA / VectorCAST)
  - Standard components

Open Source:
  - Linux (지상 시스템)
  - Boost, Qt (지상 GUI)
  - RTEMS (검토 중)

Subcontract:
  - 큰 mission의 subsystem
  - Specialized expertise (예: SAR signal processing)
  - 한화, KAIST, 작은 회사

Heritage:
  - 이전 KOMPSAT의 모든 reuse-able
  - SAVOIR component 일부
  - 다른 ESA mission에서 학습
```

## 정리

- Procurement Assurance는 *외부 SW의 quality 보장*.
- 5 종류: COTS, OSS, Heritage, Subcontracted, Customer-Supplied.
- Supplier qualification → SOW → 정기 audit → Acceptance Review.
- COTS evaluation은 *기능 + heritage + ECSS 호환 + 위험*.
- OSS 채택 증가 — ESA, KARI 모두. *License compliance* 핵심.
- Heritage SW가 *ECSS의 차별점*. ESA SAVOIR가 표준화.
- Subcontract는 *flow-down* 의무. 모든 tier에 ECSS 적용.
- KARI는 *Heritage 강점*. KOMPSAT 시리즈의 reuse가 *경쟁력*.
- License + Vendor risk + Long-term support가 핵심 고려사항.

## 다음 장 예고

7장은 *ISVV — Independent Software Verification & Validation* — ECSS의 특징. 외부 검증 팀.

## 관련 항목

- [Ch 5 — Non-Conformance Control](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter05-non-conformance)
- [Ch 7 — ISVV](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter07-isvv)
- [DO-178C Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [Wind River VxWorks Cert](https://www.windriver.com/products/vxworks)
- [RTEMS Project](https://www.rtems.org/)
- [ESA SAVOIR](https://savoir.estec.esa.int/)
- [OAR RTEMS Support](https://www.oarcorp.com/)
