---
title: "Ch 9: Tool Qualification (DO-330)"
date: 2026-05-18T09:00:00
description: "DO-330 — 도구를 신뢰할 수 있는지의 표준. TQL-1~5의 의미."
series: "Developing Safety-Critical Software"
seriesOrder: 9
tags: [avionics, do-178c, do-330, tool-qualification]
draft: true
---

## 한 줄 요약

> **"Tool도 qualify"** — 도구 오류는 사용자 SW에 *silent* 영향.

## 왜 Tool Qualification 인가

**DO-178C verification rigor** — 모든 단계에 tool이 개입한다.

- Source code → static analysis (tool)
- Test → unit test framework (tool)
- Coverage → coverage tool (tool)
- Compiler → object code (tool)

**Tool bug** → SW에 silent 영향 → 인증 evidence 신뢰성 ↓.

DO-330 — *Software Tool Qualification Considerations*. Tool도 *certification 객체*.

도구 신뢰성 = SW 신뢰성. DO-330 (2011, RTCA).

## TQL — Tool Qualification Level

- **TQL-1** (가장 엄격) — Code 직접 생성 (예: code generator from model) + SW DAL A → Tool 자체가 *DAL A 수준 검증*.
- **TQL-2** — Code generator + DAL B, 또는 critical verification tool + DAL A.
- **TQL-3** — Critical verification tool + DAL B, 또는 less critical + DAL A.
- **TQL-4** — Less critical verification + DAL B·C.
- **TQL-5** (가장 약함) — 단순 verification helper. 예: coverage measurement (output 직접 확인 가능).

Tool 종류·DAL에 따라 TQL 등급.

## DO-330 Tool Type

**Type 1 — Development tool** — Tool output이 직접 SW로 들어감. 예: code generator, model compiler. → Tool error → SW error.

**Type 2 — Verification tool** — SW를 검증하지만 output은 SW가 아님. → Tool error → undetected SW defect.

- **2a**: Critical verification (예: coverage)
- **2b**: Non-critical (예: simple analyzer)

**Type 3 — Process tool** — Build·CM·schedule. 영향 적음. → Tool qualification 보통 불필요.

Type + DAL → TQL 결정.

## TQL Determination Matrix

TQL 결정 (DO-330 Table T-0):

| Tool Use / DAL | TQL |
|---|---|
| Type 1 + Level A | TQL-1 |
| Type 1 + Level B | TQL-2 |
| Type 1 + Level C | TQL-3 |
| Type 1 + Level D | TQL-4 |
| Type 2 + Level A | TQL-4 또는 5 |
| Type 2 + Level B | TQL-5 |

Code generator + DAL A — *가장 엄격* TQL-1.

## Tool Operational Requirements (TOR)

**TOR (Tool Operational Requirements)** — 사용자가 *tool에 기대하는 동작*.

예 — Coverage tool TOR:

1. Statement coverage 측정
2. Decision coverage 측정
3. MC/DC coverage 측정
4. Object code coverage 측정 (Level A)
5. Source line별 report
6. Function별 summary
7. Re-instrumentation 지원
8. CI 통합 가능

TOR — 사용자(SW team)가 작성. Tool vendor가 *충족 evidence* 제공.

TOR은 *사용자 책임*. Tool 매뉴얼이 아닌 *사용자 요구*.

## Tool Operational Configuration

Tool 사용 환경:

- OS·version (Linux Ubuntu 22.04)
- Tool version (Polyspace R2024a)
- Plugin·extension
- Configuration file
- Hardware (CPU·RAM)
- License·dongle

환경 차이 → tool 동작 차이 가능. TOR 충족 — *특정 configuration* 한정.

각 *configuration* 별 qualification.

## Tool Qualification Artifacts

DO-330 요구 산출물 (TQL-1 기준).

**Tool Plan** — PSAC equivalent for tool.

**Tool Lifecycle Data**:

- Tool requirements
- Tool design
- Tool source code (vendor 제공)
- Tool test
- Tool review·analysis
- Tool configuration management
- Tool QA

**Tool Accomplishment Summary** — Tool SAS equivalent.

**Letter of Authorization (LoA)** — FAA·EASA → tool vendor or user. Tool 사용 허가.

TQL-1 — *full DO-178C-style* lifecycle.

## TQL-5 — 단순 사례

TQL-5 (가장 약함) 요구.

**Tool Plan (간단)**:

- Tool name·version
- Purpose
- TOR (use case)
- Configuration

**Tool Verification** — TOR 충족 verification. 보통 *user 자체 test*.

**Tool QA** — Audit trail.

→ 며칠~주 단위 부담.

대비 TQL-1 — 수개월~년 단위.

## Tool Qualification Approaches

1. **Vendor-qualified tool** (de facto) — Vendor가 qualification kit 제공. 고객이 *configuration·use case* 검증만.
   - Polyspace + qualification kit (TQL-1~3)
   - Vector CAST qualified
   - LDRA qualified
   - SCADE qualified
2. **Self-qualified tool** — 고객이 직접 qualification. 복잡·고비용.
3. **Qualification 회피** — Tool output을 *manual review*. "tool error catch". 예 — Compiler: Object code review (manual), Source vs object 일치 verify.
4. **Output verification approach** — Tool output을 다른 방법으로 cross-check. 예 — Coverage: Tool 측정 + manual spot check.

대부분 — *vendor-qualified* + 약간 *output review*.

## Compiler Qualification Question

Compiler — Tool Type 1 (object code generates). TQL-1 (Level A) 필요한가?

**실제** — GCC·LLVM·Green Hills·DDC-I 등 *full qualification* 거의 없음.

**대안**:

1. Object code review (Level A 요구)
2. Multiple compiler comparison
3. Compiler bug list 추적
4. Source·object trace

**또는** — Qualified compiler 구입:

- DDC-I SCORE C/C++
- LDRA TBcompliance
- Green Hills MULTI (자체 qual)

Compiler — *grey area*. Object review가 일반적.

## Open Source Tool 사례

**Open source tool qualification** 대상:

- GCC, LLVM
- cppcheck
- lcov·gcov
- cmake·make

**도전**:

- Vendor 없음
- QA process 불명
- Configuration management 어려움

**방법**:

1. Self-qualification (전체 DO-330)
2. Output verification approach
3. Multiple tools cross-check
4. AdaCore·Embedded Wizard 같은 *qualified GCC fork* 구입

오픈소스 — *commercial fork* + qualification kit.

## Tool Versioning

**Tool version 변경 → re-qualification**:

- **Minor patch** — 보통 re-test 충분
- **Major version** — full re-qualification

**Project 동안** — 보통 *single version* lock. Mid-project upgrade — 매우 보수적.

예 — Project start: Polyspace R2024a → Project end (3년 후): 여전히 R2024a.

Tool *version freeze*. 예측성·재현성 우선.

## DO-330의 Tool 분류 예

```text
실제 도구 분류:

Polyspace Bug Finder:
  Verification tool (Type 2)
  Critical (semantic analysis)
  + Level A SW → TQL-4
  
Vector CAST:
  Verification tool (Type 2)
  + Level A SW → TQL-4·5
  
LDRA Testbed:
  Verification + analysis
  + Level A → TQL-4·5
  
Simulink Coder (code generator):
  Development tool (Type 1)
  + Level A → TQL-1
  → 가장 엄격 qualification 필요
  
SCADE Suite (model + code gen):
  Type 1 + Level A → TQL-1
  
GCC:
  Type 1 (compiler)
  + Level A → TQL-1 (이론)
  실제 — object review 대체
```

## Korean Tool Practice

```text
방사청 SW 신뢰성시험:
  - 도구 사용 명시 (test plan)
  - Qualification status 일부 요구
  - 한국 KISA·한국전자통신연구원(ETRI) 표준
  
KARI:
  - Open source (GCC·gdb·LDRA limited)
  - 자체 verification
  
한화·LIG:
  - 자동차 분야 — AUTOSAR + qualified tool
  - 항공·방산 — DO-178C-style qualification 도입 중
```

한국 — *qualification 인식 확산*. 비용 부담은 큼.

## Tool Qualification Cost

```text
Cost estimate:

TQL-1 (compiler·code gen):
  Vendor qualified kit — $100K~500K
  Self-qualify — $1M+
  
TQL-2~3:
  Vendor kit — $50K~200K
  Self — $500K+
  
TQL-4~5:
  Vendor kit — $10K~50K
  Self — $100K~

Project total tool QC:
  Level A — $500K~2M
  Level B·C — $100K~500K
  Level D — minimal
```

Tool QC — *SW project 예산의 5~15%*.

## 자주 하는 실수

> ⚠️ Tool "qualified"라고만 명시, *configuration* 미명시

```text
"Polyspace qualified"
→ TQL-? Version-? Config-?
```

→ 구체적 *configuration + qualification scope*.

> ⚠️ Tool output 무비판 수용

```text
Tool report → "100% pass" → 종료
→ TOR 미충족 분야 있을 수 있음
```

→ *Output sample manual review*.

> ⚠️ Project mid에 Tool 변경

```text
Polyspace R2022a → R2024a (mid-project)
→ Re-qualification 필요
→ Schedule slip
```

→ Project start에 *tool freeze*.

> ⚠️ Open source tool qualification 무시

```text
"GCC는 표준이니 qualification 불필요"
→ 인증 시 *증명 책임 user에*
```

→ Output verification 또는 *qualified fork*.

## 정리

- DO-330 — *Tool Qualification* 표준.
- **TQL-1~5** — tool type + SW DAL 조합.
- TOR — *사용자 책임*, qualification — *vendor 도움*.
- Compiler·code generator — *가장 엄격* TQL.
- Vendor-qualified kit — *de facto* 방법.
- Tool version *freeze* — project 전 기간.
- 한국 — *qualification 인식 확산*.

다음 편은 **Reusable Software**.

## 관련 항목

- [Ch 8: Coverage](/blog/embedded/avionics/developing-safety-critical/chapter08-coverage)
- [Ch 10: Reusable Software](/blog/embedded/avionics/developing-safety-critical/chapter10-reusable-software)
