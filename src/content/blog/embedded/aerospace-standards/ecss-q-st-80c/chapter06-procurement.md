---
title: "Ch 6: SW Procurement Assurance — COTS·OSS·Heritage 인수 절차"
date: 2026-05-18T07:00:00
description: "ECSS-Q-ST-80C — Supplier qualification, COTS evaluation, OSS adoption, Heritage SW reuse."
tags: [ecss, procurement, cots, oss, heritage, supplier]
series: "ECSS-Q-ST-80C"
seriesOrder: 6
draft: false
---

ECSS의 *고유 강조점* — *Procurement Assurance*. ESA mission이 *다국가 협력*과 *광범위 reuse*에 기반하므로 *외부 SW 인수*가 핵심. DO-178C의 *PDS (Previously Developed Software)*보다 *광범위*. *정확한 절차·문서는 ECSS-Q-ST-80C 원문 참조*.

## Procurement Assurance — 정의 (개략)

ECSS-Q-ST-80C는 *외부에서 들여온 SW도 우리 quality 요구사항 충족*을 정의. 정확한 wording은 원문.

## 외부 SW 종류

```
1. COTS (Commercial Off-the-Shelf)
   - RTOS (예: Wind River VxWorks)
   - Simulation, analysis tools
   - 상용 라이브러리

2. OSS (Open Source Software)
   - RTEMS
   - Linux Kernel
   - FreeRTOS, LWIP, eCos 등

3. Heritage SW
   - 이전 mission 산출물
   - 자체 reuse

4. Subcontracted SW
   - 다른 조직이 개발 (큰 mission에서 흔함)

5. Customer-Supplied SW
   - 운영자 (예: ESA)가 제공
   - Mission planning, calibration tool 등
```

각 종류마다 *다른 procurement procedure*.

## Build vs Buy vs Reuse — 일반 가이드

**Build (자체):**

- Mission-unique
- Innovation
- Long-term competitive advantage

**Buy (COTS):**

- 표준화된 기능
- Vendor expertise
- Mature product
- Cost-effective

**Reuse (Heritage / OSS):**

- 검증된 코드
- Schedule 압박
- 신규 risk 감소

ECSS는 *reuse 강력 권장*. *bigger missions*가 *smaller missions*의 reuse pool.

## Supplier Qualification — 일반 절차

```
1. Supplier Identification
   - Vendor list
   - Reference check
   - Financial stability

2. Initial Qualification
   - Capability assessment
   - SW process maturity (예: CMMI level)
   - 인증 (ISO 9001, AS9100, ECSS)
   - Reference project visit

3. Bid Evaluation
   - Technical proposal
   - ECSS 호환성
   - Schedule + cost
   - Risk assessment

4. Contract Award
   - SOW (Statement of Work)
   - Quality requirements (ECSS-Q-ST-80C)
   - Deliverables
   - Acceptance criteria

5. Ongoing Monitoring
   - 정기 audit
   - Progress review
   - Quality monitoring

6. Acceptance
   - Verification
   - Documentation review
   - 승인
```

### Supplier Audit Checklist — 일반 template

```
A. Organization
   - Quality department independent
   - Documented QMS
   - Trained personnel records
   - Configuration management infrastructure

B. Process Maturity
   - CMMI level (Criticality A에 적합한가)
   - ISO 9001, AS9100, ECSS 인증
   - Previous ECSS project 경험

C. Tool Infrastructure
   - Requirements tool
   - Static analysis tool (qualified)
   - Configuration management tool
   - Test automation framework

D. Project Capabilities
   - Similar mission 경험
   - Reference customers contactable
   - Project team 적정
   - Subject matter experts

E. Sample Project Review
   - Documentation completeness
   - Process compliance
   - Quality metrics
```

## SOW — Statement of Work

Contract의 *핵심 문서*. *what + how to deliver*. 일반 구조:

```
1. Scope
2. Applicable Standards (ECSS-Q-ST-80C, ECSS-E-ST-40C, MISRA C 등)
3. Deliverables (Documentation, Software, Support)
4. Quality Requirements (coverage, defect density, ISVV)
5. Schedule + Milestones (PSAC, PDR, CDR, QR, AR, Launch)
6. Acceptance Criteria
7. Intellectual Property
8. Penalty Clauses
9. Subcontractor flow-down 의무
10. Audit Rights
```

SOW가 *legally binding*. *vague terms 거부*. 모든 deliverable이 *측정 가능*.

## COTS — Evaluation

```
일반 evaluation 순서:

1. Need Assessment (Build vs Buy)
2. Market Survey
3. Technical Evaluation (functional, performance, interface, quality)
4. ECSS Compliance Assessment (heritage, certification, documentation, source access)
5. Risk Assessment (vendor lock-in, financial stability, lifecycle)
6. Trial / Proof of Concept
7. Procurement Decision
```

### COTS — RTOS 선택 일반 비교 (가상 예)

```
                          VxWorks  RTEMS  INTEGRITY  PikeOS
─────────────────────────────────────────────────────────
Functional fit              ?       ?        ?         ?
Performance                 ?       ?        ?         ?
Memory footprint            ?       ?        ?         ?
ECSS / DO-178C heritage     ?       ?        ?         ?
ESA-experience              ?       ?        ?         ?
Customization               ?       ?        ?         ?
Vendor support              ?       ?        ?         ?
Source code access          ?       ?        ?         ?
Long-term roadmap           ?       ?        ?         ?
Cost                        ?       ?        ?         ?
```

각 항목의 *실제 점수*는 *해당 시점·mission·vendor*마다 다르다. 위 표는 *evaluation framework*만 예시.

선택의 일반적 trade-off:
- *RTEMS / Linux*: OSS, source 접근, customization, *commercial support 별도*
- *VxWorks / INTEGRITY*: 상용 qualification kit, vendor support, *비용 + 일부 lock-in*

### COTS Risk Mitigation — 일반

```
주요 COTS 위험:

1. Vendor lock-in
   - Abstract API layer
   - Source code escrow

2. Vendor 폐업 / 단종
   - Source code 권리 (계약)
   - Multiple vendor evaluation
   - Internal expertise

3. End-of-life
   - Long-term support clause
   - Migration plan

4. Security vulnerabilities
   - Vendor disclosure 절차
   - 패치 timeline

5. Hidden defects
   - Heritage data 분석
   - Trial period
   - Extensive integration test

6. Documentation 부족
   - Contract에 의무화
   - Internal review
```

## OSS — Open Source Software

### OSS Adoption Process

```
1. License Compatibility Check
   - GPL: 사용 시 *전체 코드 open* 의무 (대부분 항공·국방 부적합)
   - LGPL: 라이브러리 link OK, 수정 시 open 의무
   - BSD / MIT / Apache: 사용 자유 (proprietary 가능)
   - Public Domain: 자유

2. Heritage Verification
3. Source Code Review (architecture, defect-prone areas, security audit)
4. Modification Strategy (as-is / fork / contribute back)
5. Support Strategy (community / paid / internal)
6. ECSS Compliance Approach (coding standard, coverage, static analysis)
7. Procurement Decision (SCMP 등록)
```

### OSS for Spaceflight — 일반 관찰

OSS의 우주 mission 적용은 *증가 추세*. 공개된 예:

- *RTEMS*가 다수 ESA mission에서 사용 (Galileo, Sentinel 일부 등)
- *Linux / RT 변형*이 일부 mission에서 실험적 사용 (Mars Helicopter Ingenuity 등)

각 mission의 *정확한 OSS 사용 범위*는 *공식 발표*만 인용.

### Linux의 우주 적용 — 일반 도전

**ECSS adoption challenges for Linux:**

- 30+ million LoC
- 다양한 license (GPL, LGPL, BSD 혼재)
- MISRA 부분 준수만
- Static analysis 도전적
- Real-time 보장 부족 (RT patch 필요)

**Mitigation:**

- 사용 subset 제한
- GPL impact 분석
- PREEMPT_RT 적용
- WCET 분석
- Security audit

*Critical*에는 여전히 *qualified RTOS* (VxWorks, RTEMS 등). *non-critical 또는 ground SW*에 Linux 적용 일반화.

## Heritage SW — ESA SAVOIR

ESA의 *Reference Software 체계* — Heritage SW의 *체계화*. 자세히는 [savoir.estec.esa.int](https://savoir.estec.esa.int/).

**SAVOIR (Space Avionics Open Interface Architecture):**

- ESA + 산업 협력
- OBSW (On-Board Software) 표준화
- Modular component
- Reuse-friendly

### SAVOIR Component 예 (공개)

**대표 영역:**

- OBC RTOS (RTEMS-based)
- AOCS Core
- TT&C (PUS 표준)
- FDIR framework
- Power Manager
- Star Tracker Interface
- GNSS Receiver Interface

각 component의 *정확한 reuse rate, mission 적용 list*는 SAVOIR 페이지 참조.

## Heritage SW Tracking — 일반 template

Heritage SW 관리의 일반적 *manifest 구조*:

```
=== Heritage SW Manifest (일반 template) ===

Reused from [previous mission name]:
  - Component A (reuse rate)
  - Component B (reuse rate)

External Heritage:
  - COTS X (vendor)
  - OSS Y (license)

Customization:
  Total LoC:               [숫자]
  Reused unchanged:        [숫자]
  Reused with modification:[숫자]
  New development:         [숫자]

Reuse benefits:
  - Cost saving (vs from scratch)
  - Schedule saving
  - Quality (heritage defect rate 일반적으로 낮음)
```

정확한 수치 비교는 *해당 조직 / mission*마다 다르다.

## Subcontractor Management

큰 mission은 *subcontract 흔함*. 관리 복잡.

```
Tier 1: Prime Contractor
Tier 2: Major Subcontractor (subsystem)
Tier 3: Component Supplier
Tier 4: Sub-component

각 tier가 *ECSS 의무 flow-down*. Contract에 의무 포함.
```

### Communication Flow

```
Quality requirements: 위 → 아래 flow-down
Issues: 아래 → 위 escalation
Audits: 위 → 아래 propagate
```

### Subcontract NCR Handling — 일반

```
1. Subcontractor finds NCR
2. Reports to upper tier (계약된 timeline 내)
3. Joint RCA if mission impact
4. Corrective action plan
5. Verification by upper tier
6. Closure (joint signatures)

If subcontractor refuses:
  Escalation procedure
  Ultimately: contract termination
```

## Acceptance — Acceptance Review (AR)

External SW의 *최종 인수* 절차:

```
1. Deliverable submission
2. Documentation Review
3. Software Verification (재실행, coverage, ISVV)
4. Integration Test (HIL 포함)
5. Acceptance Decision (Accept / Conditional / Reject)
6. Conditional Acceptance handling
7. Final Acceptance (Certificate, payment, operational support)
```

## Customer-Supplied SW (CFI)

운영자(정부 / 운영기관)가 제공하는 SW. *Calibration, mission planning* 등.

**일반 예:**

- Mission planning SW
- Calibration coefficient SW
- Atmosphere model
- Satellite tracking SW (지상국)

**CFI procurement:**

- 운영기관 제공
- 통합 책임 = 본 프로젝트
- Documentation = 운영기관 책임
- CFI도 verification 필요

## Common Procurement Findings — 일반

```
자주 발견되는 문제:

1. COTS license 명시 부족 (GPL 가능성 등)
2. Subcontractor가 ECSS 의무 일부 거부
3. Heritage SW의 modification log 누락
4. Vendor product 단종
5. CFI quality 정보 부족
6. Subcontractor NCR의 늦은 통보
```

각 문제에 대응하는 *clause / process*는 *조직 / contract* 별로 다르다.

## Procurement 비용 — 일반 관찰

Procurement는 *mission SW 비용의 큰 비중*. 구체 수치는 *조직 / mission / 시점*마다 다르므로 *공식 발표가 있는 경우만* 인용.

## 정리

- Procurement Assurance는 *외부 SW의 quality 보장*.
- 5 종류: COTS, OSS, Heritage, Subcontracted, Customer-Supplied.
- Supplier qualification → SOW → 정기 audit → Acceptance Review.
- COTS evaluation은 *기능 + heritage + ECSS 호환 + 위험*.
- OSS 채택 증가 — *license compliance* 핵심.
- Heritage SW가 *ECSS의 차별점*. ESA SAVOIR가 표준화.
- Subcontract는 *flow-down* 의무. 모든 tier에 ECSS 적용.
- 정확한 절차·deliverable은 *ECSS-Q-ST-80C 원문*.

## 다음 장 예고

7장은 *ISVV — Independent Software Verification & Validation*.

## 관련 항목

- [Ch 5 — Non-Conformance Control](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter05-non-conformance)
- [Ch 7 — ISVV](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter07-isvv)
- [DO-178C Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [Wind River VxWorks](https://www.windriver.com/products/vxworks)
- [RTEMS Project](https://www.rtems.org/)
- [ESA SAVOIR](https://savoir.estec.esa.int/)
