---
title: "Ch 2: DO-178C 개요 — DAL·71 Objectives·12 Data Items"
date: 2026-05-18T02:00:00
description: "RTCA DO-178C 구조. DAL A-E, 71 objectives, 12 data items, supplements."
series: "Developing Safety-Critical Software"
seriesOrder: 2
tags: [avionics, do-178c, dal, objectives, supplements]
draft: true
---

## 한 줄 요약

> **"DO-178C = 5 plans + 71 objectives + 12 data items"** — DAL이 *증명 부담* 결정.

## DO-178C 역사

| 연도 | 버전 | 내용 |
|---|---|---|
| 1992 | DO-178A | initial |
| 2000 | DO-178B | 혁신, 24년간 표준 |
| 2011 | DO-178C | model-based·OOP·formal 추가 |
| 2025 (planned) | DO-178D | 개정 진행 |

- **발행**: RTCA (US) + EUROCAE ED-12C (EU)
- **적용**: FAA·EASA·CAA 모두

## 12 Section + Annex

- **Section 1**: Introduction
- **Section 2**: System aspects
- **Section 3**: Software life cycle
- **Section 4**: SW planning process
- **Section 5**: SW development process
- **Section 6**: SW verification process
- **Section 7**: SW config management
- **Section 8**: SW quality assurance
- **Section 9**: Certification liaison
- **Section 10**: Overview of aircraft·engine cert
- **Section 11**: SW life cycle data
- **Section 12**: Additional considerations
- **Annex A**: Objectives by DAL (10 tables)
- **Annex B**: Glossary

Annex A — *모든 objective의 DAL별 적용 여부* + *independence*.

## DAL — Design Assurance Level

| DAL | Failure Condition | Probability | Lives |
|---|---|---|---|
| A | Catastrophic | $10^{-9}/\text{hr}$ | Hull loss |
| B | Hazardous | $10^{-7}/\text{hr}$ | Serious injury |
| C | Major | $10^{-5}/\text{hr}$ | Significant |
| D | Minor | $10^{-3}/\text{hr}$ | Some |
| E | No Effect | no constraint | None |

ARP-4761 system safety assessment → SW에 DAL 할당.

## DAL → Objectives Count

| Level | Objectives | With independence | Without |
|---|---|---|---|
| A | 71 | 30 | 41 |
| B | 69 | 18 | — |
| C | 62 | 5 | — |
| D | 26 | 2 | — |
| E | 0 | — | — |

Level A → B → C → D → E — *부담 단계적 감소*.

## With Independence

"Independence" = 다른 사람 수행 보장.

- SW Author ≠ Verifier
- SW Author ≠ Reviewer
- Tool User ≠ Tool Qualifier
- SQA ≠ Developer

이유:

- Self-review bias 방지
- 외부 시각 강제
- 인증 신뢰도 ↑

Level A — 30 objectives with independence → *별도 IV&V team 필수*.

## 12 Data Items

**Plans (5)**:

1. PSAC (Plan for SW Aspects of Certification)
2. SDP (SW Development Plan)
3. SVP (SW Verification Plan)
4. SCMP (SW Configuration Management Plan)
5. SQAP (SW Quality Assurance Plan)

**Standards (3)**:

6. SW Requirements Standards
7. SW Design Standards
8. SW Code Standards

**Development Artifacts (4)**:

9. SW Requirements Data
10. Design Description
11. Source Code
12. Executable Object Code (EOC)

**+ Verification artifacts**:

- SW Verification Cases·Procedures
- SW Verification Results
- SW Life Cycle Environment Configuration Index (SECI)
- SW Configuration Index (SCI)
- Problem Reports
- SW Accomplishment Summary (SAS)

각 *data item* — 인증 audit object.

## SW Life-Cycle 5 Processes

1. **SW Planning Process** — 5 plans + 3 standards. Independent reviews.
2. **SW Development Process** — Requirements, Design, Coding, Integration. Output: Requirements, Design, Code, EOC.
3. **SW Verification Process** — Reviews·Analyses·Tests, Coverage analysis, Traceability.
4. **SW Configuration Management** — Versioning·Change control, Baseline establishment, Problem reports.
5. **SW Quality Assurance** — Audit·oversight, Independence, Records.

각 process — *별도 plan + standards*.

## Annex A — Tables 1-10

- **Table A-1**: Planning Process
- **Table A-2**: Development Process
- **Table A-3**: Verification of Requirements
- **Table A-4**: Verification of Design
- **Table A-5**: Verification of Code
- **Table A-6**: Testing
- **Table A-7**: Verification of V&V Process Results
- **Table A-8**: Configuration Management
- **Table A-9**: Quality Assurance
- **Table A-10**: Certification Liaison

각 table — *objectives + applicability per DAL + independence*.

## DO-178B vs DO-178C

**DO-178B** (2000):

- Foundation
- Coverage·traceability emphasis

**DO-178C** (2011) — 변경점:

- Model-Based Development (DO-331)
- Object-Oriented (DO-332)
- Formal Methods (DO-333)
- Tool Qualification revision (DO-330)
- Updated objectives
- Single-version artifact

거의 동등 — *implementation method* 새 옵션 추가.

DO-178B 호환 — *기존 인증된 SW가 DO-178C로 즉시 사용*.

## DO-178C Supplements

**DO-330 — Tool Qualification**:

- Replaces DO-178B Section 12.2
- TQL 1-5
- Tool developer obligations

**DO-331 — Model-Based Development**:

- MBD activity·objective
- Simulink·SCADE workflow

**DO-332 — Object-Oriented (C++·Java)**:

- Subset · 11 vulnerabilities
- Inheritance, exception, dispatch

**DO-333 — Formal Methods**:

- Replace test with formal proof
- Mathematical verification

각 supplement — *DO-178C 본문과 함께 사용*.

## Software Levels in Practice

**Aircraft level A·B examples**:

- Flight Control Computer
- Primary navigation
- Engine FADEC
- Brake control
- Stall warning

**Level C**:

- Cabin pressure
- In-flight entertainment (partial)
- Some flight management

**Level D**:

- Maintenance recording
- Reporting systems

**Level E**:

- Entertainment content
- Non-essential displays

System safety assessment에 *function별 DAL* 할당.

## Certification Flow

1. **PSAC** (Plan for SW Aspects of Cert) — FAA에 제출. Method·standard·plan 설명.
2. **SOI** (Stage of Involvement) reviews:
   - **SOI-1**: Planning review
   - **SOI-2**: Development review
   - **SOI-3**: Verification review
   - **SOI-4**: Final certification audit
3. **SAS** (Accomplishment Summary) — 마지막. All evidence·deviation 설명.
4. **Type Certificate** (또는 STC) 발급

수년 단위 process — *FAA·EASA inspector* 참여.

## Independent V&V

Independence levels:

- **Personal independence** — different person
- **Organizational independence** — different team·company

For high DAL — IV&V team 별도.

- **Level A·B**: 강력 권장
- **Level C**: 일부
- **Level D**: minimal

Korea (DAPA·KARI):

- 외부 IV&V 회사 (LIG·STA·KISA)
- 자체 IV&V team

DO-178C — *audit-able evidence* 필수. IV&V가 *audit-side trust*.

## Activity-Output Model

각 objective는 **Activity** (what is done) + **Output** (what is produced).

예 (Objective A-6.1):

- **Activity**: Executable Object Code (EOC) complies with high-level requirements
- **Output**: Test cases + procedures + results
- **Applicability**: A·B·C·D
- **Independence**: A·B

증명 = *Activity 수행 + Output 보존 + Review evidence*.

## Variability — Aircraft·LV·UAS

**Aircraft (B787·A350)**:

- Full DO-178C compliance
- FAA·EASA cert

**LV (SLS·Falcon 9)**:

- NPR 7150.2 + DO-178C principles
- NASA·FAA AST oversight

**UAS (drone)·UAM**:

- DO-178C subset (lower DAL)
- Smaller cert burden
- Future: Risk-based cert

**Military**:

- DO-178C 또는 MIL-STD-498
- Risk·tradeoff allowed

## Cost·Time

DO-178C Level A 기준:

- $50-150 per LOC
- Multiple years
- Multi-person team
- $5M-$200M+ per certified SW project

이유:

- 71 objectives 모두 수행
- 30 with independence
- Tool qualification (별도)
- Audit·rework

이 비용이 *항공 SW 진입 장벽*.

## Reduced-DAL Strategy

**Architectural mitigation** — Higher DAL function → 별도 partition. Lower DAL elsewhere.

**ARINC-653 partitioning** — Time + space isolation. 각 partition별 *별도 DAL* 가능.

| Function | DAL |
|---|---|
| Engine FADEC | DAL A |
| EFIS display | DAL B |
| ECAM warning | DAL C |
| Maintenance | DAL D |

System architecture로 *부담 줄임*.

## Tool Categories

**Development tool (TQL-5)** — Output가 EOC에 포함.

- Compiler·assembler·linker
- Model code generator (Simulink·SCADE)

**Verification tool (TQL-1 to 4)** — Verification activity 대체.

- Coverage analyzer (Cantata·LDRA)
- Static analyzer (Coverity·Klocwork·Polyspace)
- Test framework

Each tool qualified separately:

- Tool Qualification Plan (TQP)
- Tool Operational Requirements (TOR)
- Test cases·results

도구 자체 qualify — 다음 chapter 상세.

## DO-178C in Korea

**한국 적용**:

- 방사청 가이드 — *DO-178C 영향 + Korean adaptation*
- KARI guide — DO-178C principle + space-specific

**실무**:

- 영문 DO-178C 표준 그대로 사용
- Korean translation 일부 (industry-internal)

**교육**:

- RTCA 직접 구매 ($150 per copy)
- Industry training (Wind River·Green Hills·HighRely)
- 학회 (KSAS·KAST)

DO-178C 표준 원본 — *수십 명 group buy* 일반.

## 자주 하는 실수

> ⚠️ Level A = 무조건 가장 비싸

Level A·B 차이 = 12 objectives + 12 independence. 실 cost — *more nuanced*.

→ 정확한 estimate 필요.

> ⚠️ Independence 무시

Author가 verification 작성 → audit fail.

→ Team structure 명확.

> ⚠️ DO-178B·C 차이 무시

DO-178B 인증 SW + DO-178C 새 코드 → 검토 추가 필요.

→ 상황별.

> ⚠️ Supplement 다 적용

DO-331·DO-332·DO-333 모두 적용 — 항상은 아님.

→ *사용한 method*만.

## 정리

- DO-178C — **5 plans + 71 objectives + 12 data items**.
- **DAL A-E** — failure severity → 증명 부담.
- **Independence** — 30 objectives at Level A.
- 5 processes — Plan·Develop·Verify·CM·QA.
- **DO-178B → C** = MBD·OOP·Formal supplements 추가.
- **TQL 1-5** — tool qualification level.
- 한국 — 방사청·KARI standard, DO-178C 표준 직접 사용.

다음 편은 **Plans (PSAC·SDP·SVP·SCMP·SQAP)**.

## 관련 항목

- [Ch 1: Assurance Overview](/blog/embedded/avionics/developing-safety-critical/chapter01-assurance-overview)
- [Ch 3: Plans](/blog/embedded/avionics/developing-safety-critical/chapter03-plans)
