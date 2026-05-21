---
title: "Ch 9: Tool Qualification (Annex Q) — ECSS의 도구 자격"
date: 2026-05-18T10:00:00
description: "ECSS Tool Class 1/2/3, Vendor qualification kit, ESA approved tool catalog. DO-330과 비교."
tags: [ecss, tool-qualification, annex-q, compiler, static-analysis, polyspace]
series: "ECSS-Q-ST-80C"
seriesOrder: 9
draft: false
---

DO-330의 ECSS 대응. *ECSS-Q-ST-80C Annex Q*가 *도구 자격*을 정의한다. DO-330만큼 *세분화되지 않지만* *3 class* 분류 + *qualification 절차*. 이 장은 *Tool Class 분류, qualification 절차, ESA approved tool, KARI tool stack*까지.

## Annex Q의 위치

**ECSS-Q-ST-80C 본문**: §5.1 – §5.9, 9 core activities.

**Annex A – K** — 형식 정의·예제:

| Annex | 내용 |
|-------|------|
| F | Criticality assessment |
| G | NCR template |
| K | ISVV (이전 장) |
| Q | **Tool Qualification** ← 이 장 |

Annex Q가 *Tool Qualification 전체*. 약 20 페이지.

## Tool의 정의

> **Tool**: Computer program or function used in support of the software life cycle.

**도구 범주:**

- Development tools: compilers, code generators
- Verification tools: static analyzers, test frameworks
- Configuration tools: build, version control
- Documentation tools: doc generators
- Project management: scheduling, tracking

각 도구의 *qualification 정도*가 다름.

## Tool Class — 3 단계

ECSS Annex Q가 *3 class*:

| Class | 영향 | 예시 |
|-------|------|------|
| **Class 1 (가장 엄격)** | Tool output이 *최종 SW에 직접 포함*. Error가 *직접 final product 영향*. | Compiler (object code 생성), Linker, Code generator (Simulink → C), Assembler |
| **Class 2 (중간)** | Tool이 *verification 결과 제공*. Error가 *검증 누락 가능*. | Static analyzer (MISRA checker), Test execution framework, Coverage analyzer, Performance profiler |
| **Class 3 (가장 가벼움)** | Tool이 *개발 보조*. Error가 *불편 야기*하지만 *직접 product 영향 적음*. | IDE, Editor, Diff tool, Documentation generator, Version control (Git, ClearCase) |

DO-330의 TQL-1~5와 *유사 개념*. ECSS가 *더 단순*.

## Class별 Qualification Effort

| Class | Qualification 수준 | 활동 | Effort |
|-------|--------------------|------|--------|
| 1 | Full qualification | Tool requirements 정의 (TOR-like), Tool design verification, Tool testing (Validation Suite), Coverage analysis, Independent V&V (optional) | 6 – 18 months |
| 2 | Moderate qualification | Tool operational requirements, Validation testing, Acceptance criteria | 1 – 6 months |
| 3 | Light qualification | Tool 사용 limits 식별, User documentation 확인, Acceptance procedure | < 1 month |

대부분 비용이 Class 1 (compiler 등). Class 3 (IDE)는 minimal.

## Qualification Process (Annex Q §3)

**1. Tool Identification**

- Tool 이름, version, vendor
- Project에서의 사용

**2. Class Determination**

- 위 3 class 중 어디?
- 정당화

**3. Tool Operational Requirements**

- 도구가 해야 하는 일
- 기능, 성능

**4. Tool Acceptance Procedure**

- 어떻게 정상 동작 검증?
- Test method
- Acceptance criteria

**5. Tool Validation**

- Acceptance procedure 실행
- Results 분석
- Anomaly handling

**6. Tool Operational Limits**

- 알려진 한계
- Workaround

**7. Tool Configuration Management**

- Version control
- Update procedure
- Change impact

**8. Tool Qualification Records**

- 모든 활동 기록
- Sign-off

DO-330만큼 *체계적이지 않음*. *간단함이 장점*.

## Vendor Qualification Kit

ESA 도구는 *vendor kit 제공*. *프로젝트 부담 감소*.

```
=== Vendor Qualification Kit Components ===

1. Tool Specification (vendor side)
2. Validation Test Suite
3. Test Results (vendor 환경)
4. Known Limitations Document
5. Bug List (severity 분류)
6. Configuration Management
7. Support Policy
8. Reference Customers
9. Heritage Data (사용 사례)
```

### Example — Polyspace Vendor Kit

```
Polyspace Bug Finder / Code Prover (MathWorks)
  - ESA approved (multiple missions)
  - Vendor Qualification Kit:
    - Full validation suite (10,000+ test cases)
    - Reference results for each test
    - Known limitations (~200 documented)
    - Heritage: Galileo, Sentinel, BepiColombo

Project usage:
  - Vendor kit 실행 in project env
  - Results vs reference 비교
  - Limitations 검토
  - Project-specific Acceptance procedure 작성
  
Effort: ~2-4 weeks (vs full self-qualification: 6 months)
```

Vendor kit이 *80% 효과 절감*. ESA-mature tool 선택이 *프로젝트 시작 결정*.

## Class별 Tool Examples — ESA Approved

### Class 1 — Code Generation / Compilation

**SCADE Suite (Ansys, formerly Esterel)** — Model → C/C++/Ada 코드 자동 생성, Formal semantics (Lustre 기반), ESA·Airbus 표준. Qualification: Class 1 / DO-330 TQL-1.

**GNAT Pro (Adacore)** — Ada compiler, ECSS Class 1 qualified. Ariane launcher, ESA satellites. \$50 k – 100 k per seat with qualification.

**Wind River Diab Compiler** — C/C++ for embedded, Class 1 qualified. VxWorks 가족.

**Green Hills C Compiler** — C99, Class 1 qualified, 항공·우주 광범위.

**GCC (Open Source)** — 일반 GCC는 *not qualified*. 변형:

- ESA-funded GNAT GPL (Ada)
- Adacore GNAT Pro (paid + qualified)
- 일부 CCRT 인증 GCC (Boeing 등 자체)

ESA missions은 *qualified compiler 의무*. *일반 GCC 부적합*.

### Class 2 — Verification Tools

**Static Analyzers:**

- Polyspace Bug Finder + Code Prover (MathWorks) Class 2, ESA approved

- Astrée (AbsInt) Class 2, runtime error 부재 증명 Airbus FBW, Boeing 787 사용

- LDRA Testbed Class 2, MISRA + coverage DO-178C + ECSS 양쪽

- Helix QAC (Perforce) Class 2, MISRA 강함

**Test Frameworks:**

- VectorCAST (Vector) Class 2, MC/DC strong

- Cantata (LDRA / QA Systems) Class 2, 항공 적합

- RTRT (IBM Rational, legacy)

**Coverage Tools:**

- VectorCAST/Cover
- LDRA Testbed
- Custom (gcov + lcov for open source, Class 3)

### Class 3 — Development Support

**IDEs:**

- VS Code (open source, Class 3)
- CLion (JetBrains, Class 3)
- Eclipse CDT (open source)

**Version Control:**

- Git (Class 3, qualification 단순)
- ClearCase (Class 3)
- Subversion (Class 3)

**Project Management:**

- Jira (Class 3)
- Confluence (Class 3)
- DOORS (Class 2-3, depending on use)

**Build Systems:**

- CMake (Class 3, output verified)
- Make
- Ninja

Class 3 도구는 *gentle qualification*. 보통 *vendor 정보 + 사용 기록*으로 충분.

## Qualification Procedure 예 — Polyspace

**Polyspace Bug Finder Qualification — 일반 template**

**1. Tool Identification**

- Name: MATLAB Polyspace Bug Finder R2024a
- Vendor: MathWorks Inc.
- Class: Class 2 (Verification tool)

**2. Tool Operational Requirements (TOR)**

| ID | Requirement |
|----|-------------|
| TOR-001 | Tool shall detect all runtime errors per CWE list (Annex A) |
| TOR-002 | Tool shall report MISRA C:2012 Mandatory violations |
| TOR-003 | Tool shall output XML format compatible with XYZ analyzer |
| TOR-004 | Tool shall process 100 KLoC within 4 hours on standard config |
| TOR-005 | Tool shall correctly identify pre/post conditions per ACSL annotations |

**3. Class 2 Justification**

- Tool output is verification result (not directly in SW)
- Tool error could miss real defect
- Used for SW Verification Process (E-ST-40C Phase 6 – 8)

**4. Vendor Qualification Material**

- Polyspace Tool Qualification Plan v2024a
- Polyspace Test Suite v2024a (5,000+ test cases)
- Vendor Test Results (all pass)
- Known limitations: KL-2024-027 (false positive in macro context)

**5. Project Validation**

- Vendor test suite를 *프로젝트 environment*에서 실행
- Results compared with reference
- Diff analysis 결과 일치 확인
- Limitations confirmed applicable

**6. Project-Specific Validation**

- 알려진 known defects (이전 mission 또는 sample) re-analyze
- True positive / false negative 분석
- 허용 가능한 false positive rate 확인

**7. Operational Limits**

| ID | 한계 | Mitigation |
|----|------|-----------|
| LIMIT-001 | Macros > 10 nested levels may produce false negatives | Manual review |
| LIMIT-002 | Tool does not analyze inline assembly | Separate review for asm blocks |
| LIMIT-003 | Tool requires GCC-compatible code (some compilers fail) | Project uses GCC-compatible |

**8. Configuration Management**

- Polyspace R2024a installed in CI environment
- Configuration: `PROJECT-CI-POLYSPACE-{version}`
- License: 5 floating

**9. Records**

- Qualification record: [unique ID]
- Approver: Quality Manager
- Date
- Re-qualification: After every major tool upgrade

**결론**: Polyspace qualified as Class 2 for project use.

이 *qualification record*가 *프로젝트 evidence*. 심사 시 제출.

## ESA Approved Tool Catalog

ESA가 *internal tool catalog* 운영. *mission 간 reuse*.

**ESA Tool Catalog (partial):**

**Compilers (Class 1):**

- GNAT Pro Ada (Adacore)
- Green Hills C/C++ (Green Hills Software)
- Wind River Diab (Wind River)
- LLVM/Clang (research, qualification 진행 중)

**Code Generators (Class 1):**

- SCADE Suite (Ansys)
- Simulink Embedded Coder (MathWorks)
- dSPACE TargetLink

**Static Analyzers (Class 2):**

- Astrée (AbsInt)
- Polyspace (MathWorks)
- Frama-C (CEA, OSS)
- LDRA Testbed

**Test Frameworks (Class 2):**

- VectorCAST
- LDRA TBrun
- Cantata
- RTRT

**Modeling (Class 2-3):**

- Enterprise Architect (Sparx Systems)
- Cameo Systems Modeler (Dassault)
- Capella (OSS, Eclipse)
- SCADE Architect

**Requirements (Class 3):**

- IBM DOORS / DOORS NG
- Siemens Polarion
- Jama Connect

**Configuration Management (Class 3):**

- IBM ClearCase
- Git
- Subversion

ESA mission이 *이 catalog 기반*. 새 tool 도입은 *qualification 추가*.

## Tool Update — Change Management

Tool 변경은 *재qualification 필요* 가능.

| 변경 단계 | 요구 작업 | 비용 |
|-----------|-----------|------|
| Patch version (2024.2.1 → 2024.2.2) | 일반적으로 *재qualification 불필요*. Vendor bug fix list 검토, project 영향 분석, SECI 업데이트 | 작음 |
| Minor version (2024.2 → 2024.3) | Vendor test suite 재실행, project 검증 일부 sample, qualification record 업데이트 | 중간 |
| Major version (2024 → 2025) | 거의 full re-qualification, TOR 검토 (변경 가능성), 새 vendor kit | 큼 |
| Vendor 변경 (Tool A → Tool B) | 새 tool 처음부터 qualification | 6 – 12 months |
| 언어 변경 (예: C → C++) | 새 tool 필요, full qualification | 매우 큼 |

이 *비용* 때문에 *toolchain freeze*가 표준. *5-10년 같은 도구*.

## Open Source Tool — ECSS Qualification

OSS도 ECSS 사용 가능. *Class 2-3에서 흔함*.

### OSS Qualification Approach

**1. License Check**

- GPL: 사용 제한적 (final product에 OSS code 포함 의무)
- LGPL: 가능 (link로만 사용)
- BSD/MIT/Apache: 가장 자유
- Public Domain: 자유

**2. Heritage Check**

- 다른 missions에서 사용?
- Community 활성?

**3. Vendor Support**

- 상용 support 가능?
- 자체 maintenance 가능?

**4. Qualification Plan**

- 자체 작성 (vendor 없으므로)
- 더 큰 effort

**5. Long-term Sustainability**

- Project 발사 후 10-30년 사용
- OSS 프로젝트가 유지?
- Fork 가능성?

### OSS Example — RTEMS RTOS

**RTEMS for Spaceflight**

- License: GPL with linking exception (OSS-friendly for products)
- Heritage: 100+ ESA missions
- Community: OAR (commercial support available)
- Long-term: 30+ years history

**RTEMS 채택 시 trade-off**

| Pros | Cons |
|------|------|
| Source code access | 자체 qualification effort 큼 |
| No vendor lock-in | 일부 enterprise features 부재 |
| Lower license cost | |
| 자체 expertise 개발 가능 | |

각 조직의 실제 결정은 *mission characteristics + budget*에 따라 다릅니다.

### Frama-C — OSS Formal Methods

**Frama-C (CEA, OSS):**

- GPL license (research only) + LGPL plugins
- ECSS 적용 가능
- 단 GPL 부분은 *코드에 들어가지 않음* (verification tool)

**ECSS use:**

- Class 2 verification tool
- Formal methods + abstract interpretation
- Astrée의 OSS 대안

**일반 evaluation:**

- Heritage: ESA가 일부 mission 사용
- Cost: Free
- Effort: 자체 qualification 수개월 ~ 1년

## Custom (Self-Developed) Tools

프로젝트 자체 도구도 qualification 필요.

**Custom tool examples in ECSS:**

- Build script
- Test result aggregator
- Coverage report generator
- DOORS export script
- Telemetry analyzer

**Each custom tool:**

- 1. Tool operational requirements
- 2. Implementation
- 3. Self-testing
- 4. Documentation
- 5. Qualification record (lighter than commercial)

**Class:**

- Most custom tools: Class 3
- Some: Class 2 (custom static analyzer 등)
- Rare: Class 1 (custom code generator)

### Custom Tool 비용

```
Class 3 custom tool: ~1 person-month
Class 2 custom tool: ~3-6 person-months
Class 1 custom tool: ~12+ person-months (DO-178C DAL A level)
```

자체 도구가 *비용 폭주 원인*. *가능하면 vendor 도구 사용*.

## ECSS vs DO-330 — 비교

```
                     ECSS Annex Q          DO-330
─────────────────────────────────────────────────
Levels               3 (Class 1/2/3)        5 (TQL-1/2/3/4/5)
Granularity          Coarse                  Fine
Vendor kit           일반적                  필수 (DAL A)
Custom tool          Lighter process         Heavy (TQL-1: DAL A 동등)
Independent V&V      Optional               필수 일부 (TQL-1/2)
Documentation        Lighter                Heavier
Cost                 Lower                  Higher
```

ECSS가 *더 간단·저렴*. DO-330이 *더 엄격·비싸지만 신뢰성 보장*.

ECSS qualification은 *일반적인 우주 mission 표준*. *미국 export 또는 협력 mission*에는 *DO-330 추가* 또는 *대응 qualification*이 필요할 수 있다.

## 일반 Tool Stack — Class별 예

**Compilers (Class 1):**

- GCC / Clang (project-qualified)
- GNAT Pro Ada
- Wind River Diab
- Green Hills C/C++

**Code Generation (Class 1):**

- Simulink + Embedded Coder
- SCADE Suite
- dSPACE TargetLink

**Static Analysis (Class 2):**

- Polyspace Bug Finder + Code Prover
- Helix QAC
- Astrée (AbsInt)
- Frama-C (OSS)
- clang-tidy (CI)

**Test Framework (Class 2):**

- VectorCAST
- LDRA Testbed
- Google Test (host-side)
- Custom HIL framework

**Requirements (Class 3):**

- DOORS / Polarion / Jama

**Modeling (Class 3):**

- MagicDraw / Cameo
- Simulink

**Version Control (Class 3):**

- Git (GitLab / GitHub)
- ClearCase (legacy)

**CI/CD (Class 3):**

- Jenkins
- GitLab CI

**Document (Class 3):**

- Confluence
- LaTeX
- Sphinx (DAC)

각 조직의 실제 tool 선택은 *budget / heritage / customer 요구*에 따라 다르다.

## Tool Qualification Maturity Model

| Level | 이름 | 특징 |
|-------|------|------|
| 1 | Ad-hoc | Tool selection 비공식, qualification 일관성 없음, documentation 부족 |
| 2 | Project-based | 각 project가 자체 qualification, vendor kit 사용, 기본 documentation |
| 3 | Organization-wide | 조직 차원 tool catalog, 표준 qualification process, cross-project reuse |
| 4 | Industry-standard | 산업 차원 (ESA catalog), inter-mission reuse, 공유 qualification material |
| 5 | Optimized | Continuous improvement, tool ecosystem mature, self-sustaining |

ESA는 *industry-standard* level. 신생 우주 회사는 *project-based* 또는 *transition* 단계가 일반적.

## Tool Qualification Cost — 일반

Tool qualification은 *큰 비용 항목*. 대략적 trade-off:

- Vendor kit 사용 시 self-qualification보다 *훨씬 저렴*
- License 비용은 *vendor / seat / mission*에 따라 변동
- Cross-mission amortize가 *전체 비용 절감*에 핵심

각 vendor의 정확한 가격은 *vendor 직접 문의*. 공개된 정확한 가격은 *대부분 vendor 페이지에 없음*.

## 정리

- ECSS Annex Q가 *Tool Qualification*. DO-330의 ECSS 대응.
- 3 class: Class 1 (compiler, code gen) / Class 2 (analyzer, test) / Class 3 (IDE, VCS).
- Vendor kit이 *qualification effort 80% 절감*.
- ESA approved tool catalog가 *cross-mission reuse* 가능.
- Tool change는 *재qualification* — patch 가벼움, major 무거움.
- OSS 사용 가능 — license + heritage + sustainability 검토.
- Custom tool도 qualification 필요 — *비용 폭주 위험*.
- ECSS가 DO-330보다 *간단·저렴*. 단 *덜 엄격*.
- 일반 tool stack: Polyspace, VectorCAST, LDRA, GitLab, Jenkins 등.
- 정확한 qualification 절차·deliverable은 *ECSS-Q-ST-80C Annex Q 원문*.

## 다음 장 예고

10장 (마지막): *한국 우주 — 공개 사실 + 시리즈 마무리*.

## 관련 항목

- [Ch 8 — ECSS-E-ST-40C](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter08-ecss-e-st-40c)
- [Ch 10 — 한국 우주 산업 적용](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter10-korea-application)
- [DO-178C Ch 11 — Tool Qualification (DO-330)](/blog/embedded/aerospace-standards/do-178c/chapter11-tool-qualification-do330)
- [Polyspace](https://www.mathworks.com/products/polyspace.html)
- [Adacore GNAT Pro](https://www.adacore.com/gnatpro)
- [RTEMS](https://www.rtems.org/)
- [Frama-C](https://frama-c.com/)
