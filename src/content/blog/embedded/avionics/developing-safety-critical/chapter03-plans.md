---
title: "Ch 3: 5 Plans — PSAC·SDP·SVP·SCMP·SQAP"
date: 2026-05-18T03:00:00
description: "DO-178C 시작점. PSAC FAA 제출 약속. SDP·SVP·SCMP·SQAP 상세 구조."
series: "Developing Safety-Critical Software"
seriesOrder: 3
tags: [avionics, do-178c, psac, sdp, plans]
draft: true
---

## 한 줄 요약

> **"5 plans = 인증의 출발점"** — PSAC가 FAA에 *약속*, 나머지 4개가 *내부 process*.

## 5 Plans 역할

**PSAC** (Plan for SW Aspects of Certification):

- FAA·EASA에 *외부 제출*
- "이렇게 인증하겠다" 약속

**SDP** (SW Development Plan):

- 내부 개발 process
- Lifecycle·milestone·deliverables

**SVP** (SW Verification Plan):

- Verification 전략
- Review·analysis·test

**SCMP** (SW Configuration Management Plan):

- Version·change control
- Baseline·release

**SQAP** (SW Quality Assurance Plan):

- QA 활동·independence
- Audit·records

PSAC는 *외부 약속*, 나머지는 *내부 실행*.

## PSAC — Plan for SW Aspects of Certification

**목적**:

- Certification Authority (FAA·EASA·DAPA) 제출
- Project 시작 시 (또는 SOI-1 review에서)
- "어떻게 DO-178C 준수할 것인가" 설명

**PSAC content**:

1. System overview
2. SW overview
3. Certification considerations
4. SW lifecycle (V·Waterfall·Agile)
5. SW lifecycle data
6. Schedule
7. Additional considerations
8. Independence
9. Method·tool 활용

FAA·EASA inspector — *PSAC 기반으로 audit*. 위반 시 *조치 또는 deviation 명시*.

## PSAC 작성 단계

1. **Pre-PSAC meeting** (FAA·EASA과) — Project intro, Tentative DAL allocation
2. **PSAC v0.1** (initial draft)
3. **PSAC v1.0** (SOI-1 review)
4. Updates throughout project
5. Final PSAC + SAS (Accomplishment Summary)

Project lifecycle 동안 *PSAC living document*.

## SDP — Software Development Plan

**SDP content**:

1. Development standards (SRS·SDS·SCS)
2. Coding language·toolchain
3. Lifecycle model
4. Development team structure
5. Activities·milestones
6. Inputs·outputs per phase
7. Reviews·transitions
8. Traceability strategy

**Phases** — Requirements → Architecture → Detailed Design → Coding → Integration.

각 phase별 *entry/exit criteria 명시*.

엔지니어가 *실제 참조*하는 plan. Coding 표준·tool·process.

## SVP — Software Verification Plan

**SVP content**:

1. Verification activities·methods
2. Verification environment
3. Tool list + qualification status
4. Coverage requirements (DAL별)
5. Traceability strategy
6. Robustness test requirements
7. Reviews·analyses methods
8. Test categories (req-based·robustness·structural)

**Coverage targets per DAL**:

- **Level A** — Statement coverage + Decision coverage + MC/DC (Modified Condition·Decision)
- **Level B** — Statement + Decision
- **Level C** — Statement
- **Level D** — none (req-based only)

QA·verification engineer가 참조. 자세한 coverage는 *Ch 8*.

## SCMP — Configuration Management Plan

**SCMP content**:

1. CM activities (identify·control·status·audit)
2. Versioning scheme
3. Baseline definition
4. Change control board (CCB)
5. Problem reporting (PR)
6. Tool list (Git·SVN·Jira·DOORS)
7. Backup·archive
8. Release management

**Configuration Items (CI)**:

- Plans (PSAC·SDP·SVP·SCMP·SQAP)
- Standards
- Requirements
- Architecture·design
- Source code
- Test cases·procedures
- Test results
- Tool versions
- Reports

모든 *artifact 추적*. Git만으로 부족 — *PR·CCB·audit trail*.

## SQAP — Quality Assurance Plan

**SQAP content**:

1. QA activities
2. Independence
3. Audit schedule
4. Reviews·assessments
5. Process compliance
6. Records
7. Authority (deviation·non-compliance 처리)
8. QA team structure

**QA activities**:

- In-process audit
- Document review
- Transition checkpoint
- Tool usage check
- Compliance assessment
- Final certification audit

QA — *external watchdog*. 개발 team과 *분리*.

## Plan 간 관계

**PSAC** = umbrella (FAA에 약속).

- **SDP** = 개발 process
- **SVP** = verification process
- **SCMP** = configuration process
- **SQAP** = QA process

**Standards (3)**:

- SRS (Requirements Standards)
- SDS (Design Standards)
- SCS (Code Standards)

All plans → standards 참조.

## Sample SDP Structure

1. **Introduction** — Purpose, Scope, Definitions·acronyms
2. **Software Overview** — SW description, Functions, Hardware platform
3. **Software Development Lifecycle** — Lifecycle model (V·iterative), Phases·activities, Entry·exit criteria per phase, Transition criteria
4. **Development Activities** — SW Requirements, SW Architecture, SW Design, SW Coding, SW Integration
5. **Development Environment** — Methods (waterfall·agile), Languages (C·C++·Ada), Tools (qualified·non-qualified), Standards (SRS·SDS·SCS)
6. **Schedule·Milestones**
7. **Team Structure**
8. **Deliverables**
9. **Transition Criteria**

50-100 pages typical.

## Independence in Plans

PSAC·SDP·SVP·SCMP·SQAP 모두:

- Plan author ≠ reviewer
- Plan reviewer ≠ approver

**Audit trail**:

- Author signoff
- Reviewer signoff
- QA signoff
- PM signoff
- + Date·version

각 *signature* — 인증 audit 증거.

## Plan Standards

**SRS (Requirements Standards)**:

- Notation·format
- Naming convention
- Verifiability criteria
- Traceability format

**SDS (Design Standards)**:

- Architecture notation
- Module structure
- Interface definition
- Naming convention

**SCS (Code Standards)**:

- Language subset (MISRA C·CERT C·JSF C++)
- Naming
- Commenting
- Error handling

Standards = *concrete rules*. Plans는 *strategy*.

## Living Document

Plans는 *project 동안 update*:

- DAL 변경
- Tool 추가·제거
- Schedule slip
- Method 변경

각 update — *FAA notification* + *re-review*.

PSAC v1.0 → v1.1 → v2.0 → ... → final.

## SOI Reviews — Plan 검토

**SOI-1 (Planning Review)**:

- PSAC·SDP·SVP·SCMP·SQAP review
- Plan adequacy 확인
- Initial baseline

**SOI-2 (Development Review)**:

- Requirements·design 진행 상태
- Plan 준수 확인

**SOI-3 (Verification Review)**:

- Verification results
- Coverage achieved
- Plan 완료 상태

**SOI-4 (Final Certification)**:

- SAS 검토
- All evidence
- Certification 발급

각 SOI = 수개월 간격 *milestone*. FAA·EASA inspector 참여.

## Plan in Practice — Example

F-35 SW Plan example (declassified portion):

| Plan | Pages |
|---|---|
| PSAC | 200+ |
| SDP | 300+ |
| SVP | 400+ |
| SCMP | 150+ |
| SQAP | 100+ |

Total — 1000+ pages plans + Standards + Requirements + Design + Code + Tests + Reports + Audit records.

거대 — *수년 작업*.

## Korean Plan — 방사청

방사청 SW 신뢰성시험:

- SDP equivalent (개발 계획서)
- SCMP equivalent (형상관리 계획서)
- Test plan
- IV&V plan

한국어로 작성 (영문 corresponding 필요한 경우 있음). 방사청 또는 IV&V 회사가 audit.

DO-178C와 유사한 구조 — *한국 적응*.

## Tool Mention in Plans

**SDP에 명시**:

- Compiler: gcc 11.3.0 (tool data XYZ)
- Linker: ld.bfd 2.38
- Build: CMake 3.22

**SVP에 명시**:

- Coverage: LDRA TBrun (TQL-3 qualified)
- Static analysis: Polyspace (TQL-2)
- Test framework: Vector CAST (TQL-1)

각 tool — qualification status·version·purpose.

각 tool — *PSAC·SVP에 명시 + qualification data*.

## Plan Approval

**PSAC approval**:

- Internal: PM·QA·System Engineering
- External: FAA·EASA·DAPA

**Other plans** — Internal only (PSAC가 reference).

**Sign-off** — PM, QA, SW Lead, IV&V Lead, etc.

## 자주 하는 실수

> ⚠️ Plan 작성 후 *읽지 않음*

```text
"Plan 완료, 이제 개발 시작"
→ team이 plan 따르지 않음
→ Audit 시 *plan vs actual* mismatch → fail
```

→ *kick-off에서 team 교육*.

> ⚠️ Plan 너무 generic

```text
"이 SW는 DO-178C 준수합니다"
→ 구체성 부족
→ Inspector "어떻게?" → reject
```

→ 명확한 *method·tool·activity*.

> ⚠️ Update 안 함

```text
Project 변경 → plan 그대로
→ Plan과 reality mismatch
```

→ Living document.

> ⚠️ Independence 가짜

```text
같은 사람이 *2 hat* (Author + Reviewer)
→ Audit fail
```

→ 명확한 team separation.

## 정리

- **5 plans** — PSAC (외부) + SDP·SVP·SCMP·SQAP (내부).
- **3 standards** — SRS·SDS·SCS.
- PSAC = FAA·EASA 약속, SAS가 마지막.
- **SOI-1·2·3·4** = milestone reviews.
- Plans는 *living document* — update.
- Korea — 방사청·KARI 표준 *DO-178C와 유사 구조*.
- 1000+ pages typical — *수년 작업*.

다음 편은 **Requirements**.

## 관련 항목

- [Ch 2: DO-178C Overview](/blog/embedded/avionics/developing-safety-critical/chapter02-do-178c-overview)
- [Ch 4: Requirements](/blog/embedded/avionics/developing-safety-critical/chapter04-requirements)
