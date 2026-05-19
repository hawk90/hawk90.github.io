---
title: "Ch 11: Tool Qualification — DO-330 완전 가이드"
date: 2026-05-18T12:00:00
description: "TQL-1~5 결정, Tool Operational Requirements (TOR), Tool Qualification Plan (TQP), Vendor Qualification Kit, 자체 도구 qualification."
tags: [do-178c, do-330, tool-qualification, tql, tor, tqp, vendor]
series: "DO-178C"
seriesOrder: 11
draft: false
---

DO-178C가 *코드의 품질*을 보장한다면, **DO-330**은 *그 코드를 만든 도구의 품질*을 보장한다. 컴파일러가 *잘못된 코드*를 생성하면? 정적 분석기가 *위반을 놓치면*? 그 영향이 *직접 항공기에 도달*. 이 장은 *DO-330 전체*를 본다.

## DO-330의 위치

```
RTCA DO-178C (2011) — Main standard
  + RTCA DO-330 (2011) — Tool Qualification Considerations
  + RTCA DO-331       — Model-Based Development (이전 장)
  + RTCA DO-333       — Formal Methods (다음 장)
  + RTCA DO-326A      — Airworthiness Security (다음 장)
```

DO-178B 시절에는 *tool qualification이 §12.2 한 절*에 압축. DO-178C에서 *별도 표준 DO-330*으로 *140 페이지로 확장*. 도구 영향 *증가*를 반영.

## Tool Use Class — 2 종류

DO-330은 도구를 *Use에 따라* 분류.

```
Tool Class      Description                           Examples
─────────────────────────────────────────────────
TC-1 (사용):    도구 출력이 *직접 EOC에 포함*       Compiler, code generator
                또는 verification에 의존              Linker, automated test tool

TC-2 (검증):    도구가 *verification 결과 제공*      Static analyzer, MC/DC tool
                도구 실수가 *verification miss*     Test framework, simulator

TC-3 (개발):    도구가 *개발 보조*                   IDE, formatter, debugger
                도구 실수 영향 *작음*                 Diff tool, profiler
```

대부분의 항공 도구가 *TC-1 또는 TC-2*.

## Tool Qualification Level (TQL) — 5 단계

도구의 *qualification 엄격도*. *Tool Use Class*와 *Software Level (DAL)* 결합.

```
                         DAL A    DAL B    DAL C    DAL D
─────────────────────────────────────────────────────
TC-1 (사용)              TQL-1    TQL-2    TQL-3    TQL-4
TC-2 (검증, 개발 보조)    TQL-4    TQL-4    TQL-5    TQL-5
TC-3 (개발 보조)          TQL-5    TQL-5    TQL-5    TQL-5
```

**TQL-1**가 *가장 엄격*. **TQL-5**가 *가장 가벼움*. DAL A의 *compiler* = *TQL-1* (가장 비싼 qualification).

### TQL별 의무 비교

```
TQL-1: Tool 자체에 DO-178C DAL A와 동등한 모든 obj 적용
        - Tool requirements, design, code, test 모두
        - Coverage 100% MC/DC
        - Independence

TQL-2: TQL-1 minus 일부 design obj
        - HLR + LLR + Coverage, 약간 완화

TQL-3: TQL-2 minus more
        - HLR 위주, LLR 부분 면제

TQL-4: 가벼운 qualification
        - Tool requirements 정의
        - Tool 사용법 검증
        - Test로 충분
        - Code 자체 검증 안 함

TQL-5: 가장 가벼움
        - 사용 환경 정의
        - 알려진 한계 문서화
        - 가벼운 test
```

## 도구별 Qualification — 일반 적용

```
Compiler (GCC/Diab/IAR for aerospace):
  TQL-1 (DAL A) or TQL-2 (DAL B)
  Vendor Qualification Kit 일반

Static Analyzer (Helix QAC, Polyspace):
  TQL-4 (DAL A) or TQL-5 (DAL B/C/D)
  Vendor Qualification Kit

Coverage Tool (VectorCAST, LDRA):
  TQL-4 (DAL A) or TQL-5 (DAL B/C)
  Vendor Qualification Kit

Model-Based Code Generator (Simulink Embedded Coder):
  TQL-1 (DAL A) or TQL-2 (DAL B)
  Vendor Qualification Kit

Linker (GNU ld):
  TQL-1 (DAL A) — 자체 qualification 어려움
  대안: Linker output 검증 (memory map review)

Debugger (GDB):
  TQL-5 — 가벼움
  사용 한계 문서화로 충분
```

각 도구의 *정확한 qualification 비용*은 *vendor / 프로젝트 / 시점*마다 다르다. 공개된 정확한 가격은 *대부분 vendor 페이지에 없으므로 vendor 직접 문의*.

## TOR — Tool Operational Requirements

DO-330의 핵심 문서. *도구가 무엇을 하는지* 정의.

### TOR 구조

```
1. Tool Identification
   - Vendor, version, build
   - License, support

2. Tool Use in Project
   - 어떤 lifecycle 단계에서
   - 어떤 입력/출력
   - 어떤 obj 만족에 기여

3. Tool Operational Environment
   - OS, hardware
   - Dependencies
   - Installation procedure

4. Tool Operational Requirements
   - 각 도구 기능에 대한 *expected behavior*
   - Functional, performance, reliability
   - Anomaly detection

5. Tool Qualification Considerations
   - TQL 결정 근거
   - DAL과 연결
   - Tool Use Class

6. Tool Operational Limits
   - 알려진 한계
   - Bug 또는 unsupported 기능

7. Operational Procedures
   - 설정 방법
   - 사용 방법
   - 결과 해석
```

### TOR 작성 예 — Helix QAC

```
=== TOR-FMS-QAC-2024-001 ===

1. Tool Identification
   Name:           Perforce Helix QAC
   Version:        2024.2 (build 20240412)
   Vendor:         Perforce Software, Inc.
   License:        Floating, 50 seats

2. Tool Use in Project
   Lifecycle phase: Verification of Source Code
   Inputs:         C source files (*.c, *.h)
                   Project configuration (.prj)
                   Rule configuration (.rcc)
                   Suppression list (.scl)

   Outputs:        Compliance report (HTML)
                   JUnit XML for CI integration
                   Compliance matrix CSV

   Obj satisfied:  A-5-2 (Code ↔ Standard compliance)
                   Partially A-5-4 (Code accurate + consistent)

3. Tool Operational Environment
   OS:             Ubuntu 22.04 LTS (production CI)
                   Windows 11 (developer workstations)
   RAM:            ≥ 16 GB
   Disk:           ≥ 50 GB free
   Dependencies:   Java OpenJDK 17 LTS

   Installation:   Per Vendor manual QAC-2024-INSTALL.pdf

4. Tool Operational Requirements

   TOR-001: Tool shall correctly detect all MISRA C:2012
            Amendment 4 Mandatory rule violations.

   TOR-002: Tool shall correctly detect all MISRA C:2012
            Amendment 4 Required rule violations except those
            explicitly listed in TOR §6.

   TOR-003: Tool shall measure McCabe Cyclomatic Complexity
            per ISO/IEC 9899:1999.

   TOR-004: Tool shall produce JUnit XML output compatible
            with GitLab CI parsing.

   ...

5. TQL Determination
   Project DAL:    B (FMS Stall Warning)
   Tool Use Class: TC-2 (verification tool, finding violations)
   TQL:            TQL-4

6. Tool Operational Limits (알려진 한계)
   LIMIT-001: Tool may produce false positives for MISRA Rule 11.5
              when void* is cast in macro context.
              Mitigation: Manual review of all such warnings.

   LIMIT-002: Tool does not analyze inline assembly.
              Mitigation: Separate review for asm() blocks.

   LIMIT-003: Tool deviates from MISRA Rule 21.21 enforcement
              in specific atomic patterns.
              Reference: Vendor Bug Report QAC-2023-487.
              Mitigation: Manual review per code review checklist.

7. Operational Procedures
   See QAC-FMS-OPS-PROC-2024-001 (separate document).
   Includes:
   - Setup procedure
   - Daily build integration
   - Result interpretation guide
   - Bug reporting procedure
```

이 TOR 작성에 *수주~수개월*. 도구별로 별도 TOR.

## TQP — Tool Qualification Plan

TOR가 *what*이라면, TQP는 *how to qualify*. 절차서.

### TQP 구조 (DO-330 §8)

```
1. Identification
2. TQL Determination
   - DAL × Tool Class
3. Qualification Activities
   - 어떤 obj 어떻게 충족
4. Qualification Schedule
5. Roles + Responsibilities
6. Standards
7. Tool Operational Requirements (TOR 참조)
8. Tool Qualification Data Items
   - 산출물 목록
9. Tool Operational Environment Configuration
10. Audit + Independence
11. Communications
```

### TQP 적용 예

```
=== TQP-FMS-2024-Helix-QAC ===

1. Tool: Helix QAC 2024.2 (per TOR-FMS-QAC-2024-001)

2. TQL: TQL-4 (DAL B, TC-2)

3. Qualification Activities

   TQL-4 obj (DO-330 Annex A):

   T-1 Tool Operational Requirements
       Activity: TOR 작성 (TOR-FMS-QAC-2024-001)
       Output:   TOR document
       Approval: 2024-04-10

   T-2 Tool Operational Environment
       Activity: 환경 정의 + 검증
       Output:   QAC-FMS-ENV-2024-001
       Approval: 2024-04-15

   T-3 Tool Operational Procedures
       Activity: 설치, 사용, 해석 절차서
       Output:   QAC-FMS-OPS-PROC-2024-001
       Approval: 2024-04-20

   T-4 Tool Operational Verification
       Activity: Tool이 TOR 충족 확인
       Method:   Validation Suite execution
       Output:   QAC-FMS-VAL-RES-2024-001
       Approval: 2024-05-15

   T-7 Tool Quality Assurance
       Activity: SQA가 절차 준수 확인
       Output:   SQA report
       Approval: 2024-05-20

   T-8 Tool Accomplishment Summary
       Activity: 모든 활동 요약
       Output:   QAC-FMS-TAS-2024-001
       Approval: 2024-05-30

4. Schedule
   2024-04-10:  TOR approved
   2024-04-15:  Environment defined
   2024-04-20:  Operational procedures
   2024-05-15:  Validation Suite execution
   2024-05-20:  SQA review
   2024-05-30:  TAS (Tool Accomplishment Summary)
   2024-06-01:  Ready for use in DO-178C project

5. Roles
   Tool Qualification Lead:  John Park
   Independent Verifier:     Sarah Kim
   SQA:                       Tom Lee
   FAA DER liaison:           Jim Wilson
```

## Vendor Qualification Kit

대부분의 항공 도구가 *vendor Qualification Kit* 제공. *프로젝트 노력 감소*.

### Helix QAC Qualification Kit 예

Perforce가 제공:

```
=== Helix QAC 2024.2 — Qualification Support Package ===

Contents:
1. Tool Operational Requirements (TOR) — template
2. Tool Operational Environment — checklist
3. Tool Validation Suite (TVS)
   - 1000+ test cases covering MISRA rules
   - Expected outputs
   - Pass/fail criteria
4. Vendor Tool Accomplishment Summary
5. Known limitations document
6. TQL evidence — TQL-1 through TQL-5
7. Sample TQP for various DAL levels
8. Vendor SQA records
9. Bug list with severity classification

Project적용:
1. Vendor TOR을 *project-specific*으로 수정
2. TVS 실행 (자동)
3. 결과가 expected와 일치 확인
4. Project Tool Accomplishment Summary 작성
5. FAA submission

Vendor kit 사용이 full self-qualification 대비 *효과 큼* (정확한 절감은 도구·프로젝트마다 다름).
```

Vendor kit *없는 도구*는 *자체 qualification* — *극히 비쌈*. 그래서 *qualified tool* 선택이 *프로젝트 시작 결정*.

## Validation Suite (TVS) — 핵심

Tool이 *TOR을 정확히 구현*하는지 *직접 test*. *수백~수천 test cases*.

### MISRA Tool Validation — 일반 흐름

```bash
# TVS 실행 (일반)
tvs-runner --suite misra2012-validation \
           --tool {vendor-tool-version} \
           --output validation_results.json

# 결과 (일반 구조)
=== Tool Validation Results ===
Total Tests:        [수]
PASS:               [수]
FAIL:               [수, 모두 TOR LIMIT으로 문서화 필요]
NOT APPLICABLE:     [수]

Failures (예시):
  - False negative cases — manual review로 mitigation
  - Edge case discrepancy — TOR LIMIT으로 문서화
  - Minor metric off-by-one — documented limit

Overall: ACCEPTABLE if all failures 문서화 + mitigation
```

이 *결과가 TAS의 핵심 증거*. FAA가 *모든 failure를 review*.

## TAS — Tool Accomplishment Summary

각 qualified tool에 대해 *TAS*. *DO-178C의 SAS와 유사*.

```
=== TAS-FMS-Helix-QAC-2024 ===

1. Tool: Helix QAC 2024.2

2. TQL: TQL-4 (DAL B, TC-2)

3. DO-330 Obj Compliance

   T-1 Tool Operational Requirements    ✓ COMPLIANT
       Evidence: TOR-FMS-QAC-2024-001
       Approval: 2024-04-10

   T-2 Tool Operational Environment      ✓ COMPLIANT
       Evidence: QAC-FMS-ENV-2024-001

   T-3 Tool Operational Procedures       ✓ COMPLIANT
       Evidence: QAC-FMS-OPS-PROC-2024-001

   T-4 Tool Operational Verification     ✓ COMPLIANT
       Method: Validation Suite execution
       Result: 1238/1247 PASS
       Failures: All documented in TOR limits
       Evidence: QAC-FMS-VAL-RES-2024-001

   T-5 Through T-9 (TQL-1/2/3 specific) — NOT APPLICABLE for TQL-4

   T-7 Tool Quality Assurance            ✓ COMPLIANT
       Evidence: SQA-QAC-2024-001

   T-8 Tool Accomplishment Summary       ✓ THIS DOCUMENT

4. Tool Configuration
   Production install version: 2024.2 build 20240412
   Installation hash: SHA-256 abc...
   Project config: qac/fms.prj (version 2.0.0, SHA-256 def...)

5. Open Issues
   None.

6. Conclusion
   Helix QAC 2024.2 is qualified at TQL-4 for use in FMS v2.0.0.
   All DO-330 TQL-4 obj satisfied.
   Tool may be used to satisfy DO-178C obj A-5-2.

Approvals:
   Tool Qualification Lead:    John Park    2024-05-30
   Independent Verifier:       Sarah Kim    2024-05-30
   SQA:                         Tom Lee      2024-06-01
   Certification Liaison:      Jim Wilson    2024-06-05
```

## 자체 도구 (Custom Tool) Qualification

Vendor 도구 외 *프로젝트 자체 도구*도 qualification 필요.

```
대표 자체 도구:
  - Build automation script
  - Custom code generator (Simulink 후처리)
  - Test result aggregator
  - Coverage report generator
  - Custom static analyzer
```

자체 도구는 *vendor kit 없음* → *전체 qualification 자체 수행*.

### 자체 도구 Qualification — 일반 effort

```
TQL-5 자체 도구:    가벼움 (operational env + 한계 문서)
TQL-4 자체 도구:    중간 (TOR + validation suite + TAS)
TQL-2 자체 도구:    무거움 (DO-178C와 유사한 process)
TQL-1 자체 도구:    가장 무거움 (DAL A와 동등)
```

정확한 effort는 *도구 크기·복잡도*에 따라 다르다. 자체 도구가 *비용 폭주 원인*인 경우가 많아 *가능하면 vendor 도구 사용*.

### 자체 도구 예 — Coverage Aggregator

```python
# coverage_aggregator.py — 자체 도구
# Combines VectorCAST + LDRA outputs into unified report

# Tool Class: TC-3 (개발 보조)
# DAL: B
# TQL: TQL-5

# Operational Requirements:
#   OR-001: 도구는 VectorCAST XML과 LDRA XML 파일을 입력으로 받는다.
#   OR-002: 도구는 각 LLR에 대한 line coverage를 합산한다.
#   OR-003: 출력은 HTML과 JSON 형식 모두.
#   OR-004: LLR ID 패턴 매칭은 DOORS 정규식 표준 따른다.
#   OR-005: 처리 시간 < 60초 for 100 MB input.

# Validation:
#   - Synthetic input pair에 대한 expected output 계산
#   - 모든 pair에서 expected = actual 검증

# TAS:
#   - Tool 코드: small Python script
#   - Test suite + Documentation
#   - Effort: 수 person-month 정도
```

가벼운 자체 도구라도 *수개월의 qualification 부담*이 일반적.

## Open Source Tool — 항공 사용

```
GCC (compiler)
  - 자체 qualification 어려움
  - 가능: FAA AC 00-69 (open source qualification guidance)
  - 또는: Adacore GNAT Pro (qualified GCC fork — $$$)
  - 또는: Green Hills MULTI (qualified C compiler — $$$)

Linux Kernel (RTOS dependency)
  - 자체 qualification 매우 어려움
  - 또는: 별도 qualified RTOS (Wind River VxWorks, Green Hills INTEGRITY)

gcov / lcov (coverage)
  - TQL-5로 가능
  - 단, MC/DC 미지원
  - DAL B 이상에서 부족

clang-tidy (static analysis)
  - TQL-5 가능
  - 단, MISRA 일부만 지원
  - 보조 용도

Git (CM)
  - TQL-5
  - 일반적 인정
```

오픈소스 도구는 *작은 프로젝트* 또는 *DAL D*에 적합. *DAL A/B*는 *상용 qualified tool 권장*.

## Tool 변경 관리

Tool 변경 = *큰 사건*. 새 qualification 필요.

```
Tool 변경 시 처리:

1. Patch version (예: 2024.2.1)
   - 일반적으로 *재qualification 불필요*
   - 단, vendor가 *bug fix list* 제공
   - 영향 분석 후 SECI 업데이트

2. Minor version (2024.2 → 2024.3)
   - Regression testing
   - Vendor TVS 재실행
   - TAS 업데이트

3. Major version (2024 → 2025)
   - 새 TOR 작성 (variations 있을 수 있음)
   - Full re-qualification
   - 새 TAS

4. Vendor 변경 (QAC → Polyspace)
   - 새 도구 qualification 처음부터
   - 6-12 months effort

5. Compiler version 변경
   - Source가 같아도 *EOC 다름*
   - 전체 verification 재실행
   - 가장 비싼 변경
```

이런 *비용* 때문에 *toolchain freeze*가 항공 표준. *5-10년 같은 도구 유지*.

## 도구 qualification — 일반 규모

DAL A system은 일반적으로 *10여 개 이상의 qualified tool*을 다룬다 (compiler, linker, assembler, static analyzer, test framework, coverage tool, CM, RTOS, 자체 도구 등). 전체 qualification effort는 *프로그램 규모에 비례*하며 *큰 비중*을 차지한다. 정확한 person-year / 비용 수치는 *프로그램별 비공개* 또는 *추정*인 경우가 많다.

## Tool Qualification 함정

```
1. Vendor 변경 = 큰 비용
   교훈: 가능한 *vendor lock-in* 수용

2. Vendor가 *qualification kit* 갱신 늦음
   2024 vendor 2024.2 release, but qualification kit 2025 발행
   교훈: Vendor의 *qualification roadmap* 확인 후 도입

3. Open source 자체 qualification 폭주
   GCC qualification = years of effort
   교훈: *vendor가 qualified 한 fork* 또는 *비싸도 상용*

4. Toolchain version mismatch
   Vendor's qualified version vs prod version 다름
   교훈: SECI 정확히 + version pinning

5. TQL underestimation
   처음 TQL-5라 했는데 audit에서 TQL-3 요구
   교훈: 시작 단계 *FAA DER과 commit*

6. Custom tool 폭주
   "그냥 작은 script"가 *결국 qualification 필요*
   교훈: Custom 자제, vendor 도구 활용
```

## 정리

- DO-330은 *도구의 정확성*을 보장하는 *DO-178C supplement*.
- Tool Class TC-1/2/3 × DAL = TQL-1~5.
- TQL-1이 가장 엄격 (DAL A의 compiler), TQL-5가 가장 가벼움.
- TOR (Tool Operational Requirements) = *도구가 해야 하는 것*.
- TQP (Tool Qualification Plan) = *어떻게 qualify*.
- Vendor Qualification Kit이 *80% 효과 절감*. 가능하면 사용.
- 자체 도구도 qualification 필요 — *수개월~수년*.
- Toolchain *freeze* (수년)이 항공 표준. 변경은 *비용 폭주*.
- Open source는 *작은 프로젝트, DAL D*에 적합.
- Tool qualification이 *전체 인증 비용의 큰 비중*.
- 정확한 obj·deliverable·승인 절차는 *DO-330 원문* 참조.

## 다음 장 예고

12장 (마지막): *Formal Methods (DO-333) + Security (DO-326A) + 시리즈 마무리*.

## 관련 항목

- [Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [Ch 12 — Formal Methods + Security](/blog/embedded/aerospace-standards/do-178c/chapter12-formal-methods-security)
- [Perforce Helix QAC Qualification](https://www.perforce.com/products/helix-qac)
- [LDRA Qualification Suite](https://ldra.com/qualification-aerospace/)
- [VectorCAST Qualification Kit](https://www.vector.com/int/en/products/products-a-z/software/vectorcast/)
- [RTCA DO-330](https://www.rtca.org/)
