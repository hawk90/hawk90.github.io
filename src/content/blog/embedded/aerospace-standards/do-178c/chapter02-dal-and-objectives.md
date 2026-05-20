---
title: "Ch 2: DAL과 71 Objectives — 등급별 의무사항 완전 해부"
date: 2026-05-18T03:00:00
description: "DAL A부터 E까지 등급 결정 원리, 71개 objectives의 의미·output·independence 요구를 모두 정리. Annex A 표 line-by-line."
tags: [do-178c, dal, objectives, independence, control-category, annex-a]
series: "DO-178C"
seriesOrder: 2
draft: false
---

DO-178C의 *Annex A — Objectives*는 144페이지 표준의 핵심. 5개 *DAL 등급*과 *71개 objectives*가 *한 표*에 정리돼 있다. 인증 심사는 *이 표를 그대로 따라간다*. 이 장은 *모든 71 objective*를 *DAL별 적용*과 함께 본다.

## DAL 결정 — Functional Hazard Assessment

DAL은 *코드 자체*가 아니라 *시스템 안전 분석 결과*로 정해진다. 항공기 차원의 *Functional Hazard Assessment (FHA)*가 *각 SW 기능*에 *failure effect*를 부여하고, 그것이 DAL이 된다.

### Failure Effect → DAL 매핑

```
Catastrophic       → DAL A
  - 항공기 비행 불능, 다수 사망 (정상 비행 조건)
  - 항공기 비행 불능, 다수 사망 (단일 failure로)
  - 예: FBW (Fly-by-wire) 비행 제어

Hazardous          → DAL B
  - 운영 한계 큰 감소, 안전 마진 손실
  - 승무원 stress 증가, 부상 가능성
  - 예: Autopilot, primary navigation

Major              → DAL C
  - 운영 한계 감소, 절차 증가
  - 가벼운 부상 가능성
  - 예: FMS, secondary navigation, EICAS

Minor              → DAL D
  - 운영 capacity 약간 감소
  - 불편, 부상 없음
  - 예: 일부 통신 redundancy, 데이터 로깅

No Effect          → DAL E (DO-178C 면제)
  - 운영·안전·승무원에 영향 없음
  - 예: 좌석 entertainment, 비행 후 분석 SW
```

### 실전 — A320 FBW

```
시스템: Airbus A320 Flight Control System
  Primary computer  : ELAC (Elevator and Aileron Computer)
  Secondary         : SEC (Spoiler and Elevator Computer)
  Backup            : FAC (Flight Augmentation Computer)
  Backup of backup  : Mechanical pitch trim wheel

각 컴퓨터의 SW DAL:
  ELAC SW           : DAL A (Catastrophic if both ELACs fail)
  SEC SW            : DAL A (Catastrophic redundancy loss)
  FAC SW            : DAL A (last electronic backup)
  Display SW (PFD)  : DAL B (Hazardous if crew unaware of state)
  FMS               : DAL C (Major — secondary navigation backup)
  Cabin SW          : DAL E (No effect on flight)
```

같은 항공기에 *DAL A부터 E까지 다 있다*. 각 SW가 *별도 인증 packet*.

### Multiple Computer Architecture로 등급 낮추기

```
원래 시스템: DAL A 요구
  Single computer with critical function

Redundancy 추가:
  3 computers, 2-out-of-3 voting
  Each computer SW: DAL B (낮춤)
  Voting logic: DAL A (작은 부분만)

비용:
  DAL A 단일 = 1× 인증 비용 (코드 100%)
  DAL B 3× redundancy = 3 × DAL B 비용 (DAL A 대비 ~70% × 3 = 210%)
  → 단일 DAL A가 비용·복잡도 낮음 *대부분의 경우*
  → 시스템 설계로 DAL 낮추는 것은 *DAL A 인증 자원 부족 시*에만
```

## 71 Objectives — 5 그룹 구조

```
A-1 Software Planning Process              7 obj
A-2 Software Development Process           15 obj
A-3 Verification of Outputs (Requirements) 15 obj
A-4 Verification of Outputs (Design)       14 obj
A-5 Verification of Outputs (Code)         18 obj
A-6 Testing of Outputs                      9 obj
A-7 Verification of Verification Process    9 obj
A-8 Software Configuration Management       6 obj
A-9 Software Quality Assurance              5 obj
A-10 Certification Liaison                  3 obj
─────────────────────────────────────────────
Total                                     101 obj (논리적 분류)
DAL A 적용                                  71 obj (의무)
```

(논리적으로 101 항목이지만 *DAL A에 필수인 71 obj*가 인증의 본질.)

### Independence 요구

각 objective는 *독립성(Independence) 요구*가 다르다:

```
"Independence" 의미:
  - 작업하는 사람 ≠ 검증하는 사람
  - 작업하는 조직 ≠ 검증하는 조직 (DAL A 일부)

DAL별 Independence 의무 (대표 분포):
  DAL A : ~30 obj 에 Independence 의무
  DAL B : ~15 obj
  DAL C : ~5 obj
  DAL D : 거의 없음
```

## A-1 — Software Planning Process (7 obj)

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | SW development and integral processes 정의 | ✓+I | ✓ | ✓ | ✓ |
| 2 | Lifecycle 전환 기준 정의 | ✓ | ✓ | ✓ | - |
| 3 | SW lifecycle 환경 정의 | ✓ | ✓ | ✓ | - |
| 4 | 추가 considerations (alternative methods) 정의 | ✓ | ✓ | - | - |
| 5 | SW Plans 작성 | ✓+I | ✓ | ✓ | ✓ |
| 6 | SW Plan과 표준 일관성 | ✓+I | ✓ | - | - |
| 7 | SW lifecycle 환경 적합성 | ✓+I | ✓ | - | - |

`✓` = 의무, `I` = Independence 추가 의무, `-` = 면제.

### Objective A-1-5 깊이 보기

> "Software Plans are developed."

**Required Plans** (DAL A):
- PSAC — Plan for Software Aspects of Certification
- SDP — Software Development Plan
- SVP — Software Verification Plan
- SCMP — Software Configuration Management Plan
- SQAP — Software Quality Assurance Plan

**Required Standards** (Plan 안에 포함):
- SRS — Software Requirements Standards
- SDS — Software Design Standards
- SCS — Software Code Standards

**Output**: 위 8개 문서 모두.

**Control Category**: CC1 (Configuration Item with full Change Control + Traceability).

심사관 첫 review (SOI 1)에서 *이 문서들 검토*.

## A-2 — Software Development Process (15 obj)

15 obj가 *4 sub-process*로 나뉜다:

```
A-2-1~5  : SW Requirements Process
A-2-6~10 : SW Design Process
A-2-11~14: SW Coding Process
A-2-15   : SW Integration Process
```

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | HLR(High-Level Req) 개발 | ✓ | ✓ | ✓ | ✓ |
| 2 | Derived HLR이 system process에 전달 | ✓ | ✓ | ✓ | - |
| 3 | SW Architecture 개발 | ✓ | ✓ | ✓ | - |
| 4 | LLR(Low-Level Req) 개발 | ✓ | ✓ | ✓ | - |
| 5 | Derived LLR이 system process에 전달 | ✓ | ✓ | - | - |
| 6 | Source Code 개발 | ✓ | ✓ | ✓ | ✓ |
| 7 | Executable Object Code 생성 | ✓ | ✓ | ✓ | ✓ |
| 8 | SW가 target hardware에 통합 | ✓ | ✓ | ✓ | ✓ |
| ... | (계속) | | | | |

### Objective A-2-1 — HLR 개발

> "High-Level Requirements are developed."

**Inputs**: System Requirements (system process로부터)

**Outputs**: SRD (Software Requirements Data)

**SRD의 7 attribute** (Section 11.9):
1. Functional / performance requirements
2. Safety / reliability requirements (system process로부터 derived)
3. Time / memory budgets
4. HW / SW interface requirements
5. Failure detection / fault tolerance
6. Partitioning requirements
7. SW이 system function의 일부로서의 *입력 → 출력 매핑*

각 HLR은 *unique identifier*. DOORS의 경우 *HLR-001*, *HLR-002* 식.

### Objective A-2-4 — LLR 개발

> "Low-Level Requirements are developed."

LLR은 *HLR을 구현하기 위한* 더 세부적 요구사항. 디자인 결정 포함.

```
HLR-014: "Brake control SW shall apply braking force when commanded
          by the pilot brake pedal."

→ LLR (derived):
   LLR-014.1: "Brake module shall sample pedal position every 10ms."
   LLR-014.2: "Pedal position 0-100% shall map to brake pressure 0-2000psi."
   LLR-014.3: "If pedal position > 95% for 100ms, anti-lock mode shall engage."
   LLR-014.4: "Brake actuator command shall be sent via CAN bus message 0x142
              with cycle time 10ms ±1ms."
```

LLR-CODE 트레이서빌리티가 *필수*. 모든 LLR이 *어느 source code 함수에서 구현되는지* 명시.

## A-3 — Verification of Outputs of SW Requirements Process (15 obj)

이 부분이 *DAL A에서 가장 두꺼움*. 모든 HLR이 다음을 충족하는지 검증.

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | HLR이 system requirements와 *일치* | ✓+I | ✓+I | ✓ | ✓ |
| 2 | HLR이 *정확하고 일관적* | ✓+I | ✓+I | ✓ | - |
| 3 | HLR이 *target computer와 호환* | ✓ | ✓ | ✓ | - |
| 4 | HLR이 *검증 가능* (verifiable) | ✓+I | ✓+I | ✓ | - |
| 5 | HLR이 *Standard와 일치* | ✓ | ✓ | ✓ | - |
| 6 | HLR이 *추적 가능* (to system req) | ✓+I | ✓+I | ✓ | ✓ |
| 7 | 알고리즘이 *정확* | ✓+I | ✓+I | ✓ | - |

### "Verifiable" — Objective A-3-4

> "High-Level Requirements are verifiable."

요구사항이 *측정 가능한 방법으로 표현*돼야:

```
나쁜 HLR (verifiable X):
  "시스템 응답은 빠르다."
  "사용자 인터페이스는 직관적이다."
  "메모리 사용은 효율적이다."

좋은 HLR:
  "시스템은 입력 후 50ms 이내에 응답한다."
  "사용자가 emergency 기능에 도달하는 데 최대 3 click이 필요하다."
  "최대 메모리 사용은 RAM 64KB, ROM 256KB이다."
```

심사관이 *모든 HLR을 measurable check*. *qualitative 표현은 거부*.

### Independence (I) — DAL A 핵심

DAL A의 A-3-1, A-3-2, A-3-4, A-3-6, A-3-7은 *모두 Independence*. 의미:

```
A-3-1: HLR 검증 (system req와 일치 확인)
  - 작성자: Requirements Engineer
  - 검증자: ≠ 작성자, 가능하면 ≠ 같은 조직
```

*중견 회사*는 *팀 차원 독립*은 가능하지만 *조직 차원 독립*은 어려운 경우가 흔하다. 따라서 *외부 ISVV 발주*가 *공통 전략*. 각 조직의 실제 ISVV provider 관계는 *공식 발표가 없는 한 단정하지 않는다*.

## A-4 — Verification of Outputs of SW Design Process (14 obj)

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | LLR이 HLR과 *일치* | ✓+I | ✓+I | ✓ | - |
| 2 | LLR이 *정확하고 일관적* | ✓+I | ✓+I | ✓ | - |
| 3 | LLR이 *target computer와 호환* | ✓ | ✓ | ✓ | - |
| 4 | LLR이 *검증 가능* | ✓+I | ✓+I | ✓ | - |
| 5 | LLR이 *Standard와 일치* | ✓ | ✓ | ✓ | - |
| 6 | LLR이 *추적 가능* (to HLR) | ✓+I | ✓+I | ✓ | - |
| 7 | 알고리즘이 *정확* | ✓+I | ✓+I | ✓ | - |
| 8 | Architecture가 *HLR과 일치* | ✓+I | ✓+I | ✓ | - |
| 9 | Architecture가 *일관적* | ✓ | ✓ | ✓ | - |
| 10 | Architecture가 *호환* (target) | ✓ | ✓ | ✓ | - |
| 11 | Architecture가 *검증 가능* | ✓ | ✓ | - | - |
| 12 | Architecture가 *Standard와 일치* | ✓ | ✓ | - | - |
| 13 | SW partitioning *integrity 보장* | ✓ | ✓ | ✓ | - |

### Objective A-4-13 — Partitioning

> "Software partitioning integrity is confirmed."

Memory / time / I/O partitioning이 *고장 격리*에 사용. *ARINC 653*(IMA — Integrated Modular Avionics)이 표준.

```
A380 / 787 / A350 : ARINC 653 IMA
  Partition A : FMS (DAL C)
  Partition B : Display Manager (DAL B)
  Partition C : I/O Manager (DAL A)
  Partition D : Diagnostic (DAL E)

각 partition이 *시간 budget*과 *memory region*을 *강제로 분리*. 한 partition의
crash가 *다른 partition에 영향 없음*.
```

Partitioning이 *수많은 DAL의 SW를 한 컴퓨터에 통합*하면서 *각 SW는 자체 DAL만 인증*하면 되게 한다. 비용 절감의 큰 동인.

## A-5 — Verification of Outputs of Coding & Integration (18 obj)

가장 큰 그룹. 18 obj가 *3 sub-process*로 나뉜다.

```
A-5-1~5  : Code Verification (코드가 LLR을 구현하는가)
A-5-6    : Integration Verification (모듈이 통합되는가)
A-5-7~9  : Test Verification (테스트가 충분한가)
```

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | Source Code가 LLR과 *일치* | ✓+I | ✓+I | ✓ | - |
| 2 | Source Code가 *Standard와 일치* | ✓ | ✓ | ✓ | - |
| 3 | Source Code가 *추적 가능* (to LLR) | ✓+I | ✓+I | ✓ | - |
| 4 | Source Code가 *정확하고 일관적* | ✓+I | ✓+I | ✓ | - |
| 5 | 모든 source가 *통합되고 컴파일됨* | ✓ | ✓ | ✓ | ✓ |
| 6 | Executable Object Code(EOC)가 *integration 사양과 일치* | ✓+I | ✓+I | ✓ | ✓ |
| 7 | Coverage of HLR (test) | ✓+I | ✓+I | ✓ | ✓ |
| 8 | Coverage of LLR (test) | ✓+I | ✓+I | ✓ | - |
| 9 | Structural coverage analysis (MC/DC for DAL A) | ✓+I | ✓+I | ✓ | - |

### Objective A-5-9 — Structural Coverage

> "Structural coverage analysis results."

```
DAL  Required Coverage
─────────────────────
A    Statement + Decision + MC/DC + Data/Control Coupling
B    Statement + Decision + Data/Control Coupling
C    Statement
D    - (구조적 coverage 면제)
```

DAL A의 *MC/DC 100%*가 *가장 큰 비용 동인*. 5장(코드 표준)과 9장(coverage)에서 깊이 본다.

## A-6 — Testing of Outputs (9 obj)

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | Test cases가 HLR과 일치 | ✓ | ✓ | ✓ | ✓ |
| 2 | Test cases가 LLR과 일치 | ✓ | ✓ | ✓ | - |
| 3 | Test procedure가 *정확* | ✓ | ✓ | ✓ | - |
| 4 | Test results가 *문제 없음* | ✓ | ✓ | ✓ | ✓ |
| 5 | Test가 *target hardware에서 실행* | ✓ | ✓ | ✓ | ✓ |
| ... | | | | | |

### Test Levels

```
Hardware-Software Integration Test (Highest)
  - 실제 target에서
  - 모든 인터페이스 검증
  - 보통 HIL (Hardware-In-the-Loop) lab

Software Integration Test
  - 통합된 SW (단위 X)
  - Host 또는 target

Low-Level (Software Unit) Test
  - 각 함수·모듈
  - Host 또는 target
  - MC/DC 측정 source
```

각 level에 *별도 test cases + results*. *모두 SVR (Software Verification Results)*에 기록.

## A-7 — Verification of Verification Process (9 obj)

*검증을 검증*. "Verification가 충분히 되었나?" 메타 검증.

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | Test procedure가 *정확* | ✓+I | ✓+I | ✓ | - |
| 2 | Test results가 *정확하고 불일치 설명됨* | ✓+I | ✓+I | ✓ | - |
| 3 | HLR coverage 달성 | ✓+I | ✓+I | ✓ | ✓ |
| 4 | LLR coverage 달성 | ✓+I | ✓+I | ✓ | - |
| 5 | Structural coverage 달성 | ✓+I | ✓+I | ✓ | - |
| 6 | Structural coverage가 *target에서 검증* | ✓+I | ✓+I | - | - |
| 7 | Test가 *robustness 포함* (boundary, invalid input) | ✓+I | ✓+I | ✓ | - |
| 8 | Verification process가 *완전* | ✓+I | ✓+I | ✓ | - |
| 9 | Data/Control Coupling 분석 | ✓+I | ✓+I | ✓ | - |

### Objective A-7-7 — Robustness Testing

> "Test cases include robustness testing."

정상 case 외에 *비정상 입력에서 시스템이 graceful하게 동작*하는지.

```
정상 Test    : 0~100 사이 input
Boundary    : 0, 100 입력
Invalid     : -1, 101 입력
Extreme     : INT_MIN, INT_MAX, NaN, ∞ 입력
Concurrent  : 동시 입력
```

DAL A는 *모든 경계와 invalid에서 graceful degradation* 입증.

## A-8 — Software Configuration Management (6 obj)

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | Configuration item *식별* | ✓ | ✓ | ✓ | ✓ |
| 2 | Baseline + Traceability | ✓ | ✓ | ✓ | ✓ |
| 3 | Problem reports + change control + 추적 | ✓ | ✓ | ✓ | ✓ |
| 4 | Configuration Management *환경 구축* | ✓ | ✓ | ✓ | ✓ |
| 5 | SECI 작성 (SW Environment Configuration Index) | ✓ | ✓ | ✓ | ✓ |
| 6 | SCI 작성 (SW Configuration Index) | ✓ | ✓ | ✓ | ✓ |

CM은 *모든 DAL에 의무*. 작은 D 시스템도 *기본 CM*은 필수.

### Problem Report (PR) Workflow

```
Found by    : Tester / Reviewer / Field user
Category    : Critical / Major / Minor
Status      : Open / Analyzing / Fixed / Verified / Closed
Disposition : Fix / Defer / Document / No action

각 PR에:
  - Description (어떻게 발견했나)
  - Root cause analysis
  - Corrective action
  - Verification of fix
  - Affected: requirements, design, code, tests
  - Approval signatures
```

심사관이 *모든 open PR*을 review. *closed without proper analysis*가 가장 흔한 finding.

## A-9 — Software Quality Assurance (5 obj)

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | Plans·Standards가 *적용·확인* | ✓+I | ✓+I | ✓+I | ✓+I |
| 2 | SW lifecycle process가 *적용·확인* | ✓+I | ✓+I | ✓+I | ✓+I |
| 3 | Transition criteria가 *충족* | ✓+I | ✓+I | ✓+I | - |
| 4 | SAS (Software Accomplishment Summary) 작성 | ✓+I | ✓+I | ✓+I | ✓+I |
| 5 | SQA 활동이 *기록* | ✓+I | ✓+I | ✓+I | ✓+I |

**SQA는 모든 DAL에 Independence 의무**. 다른 영역과 차별점. *Quality 조직이 개발 조직과 독립*해야.

### SAS — Software Accomplishment Summary

심사 핵심 문서. *모든 활동의 요약*:

```
1. SW Identification
2. System Overview
3. SW Overview
4. Certification Considerations
5. SW Lifecycle Process
6. SW Lifecycle Data (모든 산출물 목록)
7. Verification Process Outputs
8. SW Configuration Management
9. SW Quality Assurance
10. Compliance Summary (Annex A의 모든 71 obj 충족 표)
```

심사관에게 *최종 제출*. 보통 *200~1000 페이지*. *수개월에 걸쳐 작성*.

## A-10 — Certification Liaison (3 obj)

| Obj | Description | DAL A | B | C | D |
|-----|-------------|-------|---|---|---|
| 1 | Certification authority와 *communication* | ✓ | ✓ | ✓ | ✓ |
| 2 | Compliance evidence가 *제출* | ✓ | ✓ | ✓ | ✓ |
| 3 | SAS가 *제출* | ✓ | ✓ | ✓ | ✓ |

가장 작은 그룹이지만 *외부 stakeholder와의 관계*. FAA DER (Designated Engineering Representative) 또는 EASA *PCM (Principal Certification Manager)*과 *정기 미팅*.

## Output Categories — CC1 vs CC2

각 산출물은 *control category 1 또는 2*.

```
CC1 (Control Category 1):
  - Full change control
  - Full traceability
  - Configuration identification
  - Independent review
  - 예: SRD, SDD, Source Code, Test Cases

CC2 (Control Category 2):
  - 변경 추적
  - 부분 traceability
  - 예: Test results (특정 test 실행 결과), 분석 보고서
```

DAL A에서는 *거의 모든 산출물이 CC1*. DAL D는 *대부분 CC2*.

## DAL A vs DAL D — 실제 비교

같은 system을 *DAL A vs DAL D*로 개발하면:

```
                       DAL A           DAL D
─────────────────────────────────────────────
Objectives             71              26
HLR detail             정밀            중간
LLR                    의무            거의 면제
Architecture           의무            면제
SCS (Code Standard)    엄격 (MISRA C)  완화
MC/DC                  100% 의무       면제
Test                   3 levels        Unit + Integration
Independence           ~30 obj         거의 0
Tool Qualification     TQL-1           면제
PSAC 페이지            ~50             ~10
SDP/SVP 페이지         각 ~100         각 ~30
SAS 페이지             ~500            ~50
인증 기간              2-4 year        3-6 month
코드 라인당 비용       $50-200         $5-20
```

DAL A 인증이 *DAL D의 10배+ 비용*.

## 등급 격하 (Downgrade) 전략

DAL A 시스템을 *redundancy*로 DAL B 둘로 만들면 *비용 감소*하는가?

```
Option 1: 단일 DAL A
  코드 50KLoC × $100/LoC = $5,000,000
  인증 기간: 3 year

Option 2: 2× DAL B redundancy (2-of-2 dissimilar)
  각 시스템 50KLoC
  DAL B 비용: $60/LoC (DAL A의 ~60%)
  2 × 50KLoC × $60 = $6,000,000
  + dissimilarity 추가 비용
  = $7,500,000
  인증 기간: 2 year × 2 (병행) = 2.5 year

Option 3: 3× DAL C (2-out-of-3 voting)
  3 × 50KLoC × $35 = $5,250,000
  + voting logic DAL A: ~$200,000
  = $5,450,000
  인증 기간: 1.5 year × 3 병행 = 2 year
```

**Option 3가 비용·기간 모두 작음**. 그래서 *현대 FBW (Boeing 787, A350)가 multiple redundancy*. Triple 또는 quadruple redundancy.

## 추가 Considerations — DAL 결정의 함정

### 1. Common-mode failure

3× redundancy도 *같은 SW 결함*은 *동시에 fail*. 그래서 *dissimilar* design 필요.

```
A320 FBW:
  Channel 1: AMD-based PowerPC + Ada
  Channel 2: Intel-based PowerPC + C
  Channel 3: Motorola 68040 + Assembly subset
```

*다른 컴파일러, 다른 CPU, 다른 코드*. 같은 입력에 같은 출력이어야 *3개 모두 정상*. *공동 모드 결함 차단*.

### 2. CCA — Common Cause Analysis

```
PRA (Particular Risks Analysis)
  - 화재, lightning, bird strike, ...
  - 특정 위협이 모든 redundancy를 동시에 파괴 가능?

ZSA (Zonal Safety Analysis)
  - 같은 zone에 모든 redundancy가 있으면 cabin fire가 다 죽임

CMA (Common Mode Analysis)
  - 같은 SW, 같은 chip, 같은 부품 사용 시 공통 결함 위험
```

이 분석이 *DAL 결정에 영향*. 충분히 *separated*하지 않으면 *DAL 등급 상승* 가능.

## DAL × Independence Matrix — 전체

각 71 obj에 대해 DAL별 *✓/✓+I/-*를 결정. *DO-178C Annex A*가 *32 페이지 표*. 일부 발췌:

```
                                  DAL
Obj                              A  B  C  D
─────────────────────────────────────────
A-1-1  Process 정의              ✓+I ✓  ✓  ✓
A-1-5  Plans 작성                ✓+I ✓  ✓  ✓
A-1-7  Lifecycle 환경 적합성     ✓+I ✓  -  -

A-2-1  HLR 개발                  ✓  ✓  ✓  ✓
A-2-4  LLR 개발                  ✓  ✓  ✓  -

A-3-1  HLR ↔ system req          ✓+I ✓+I ✓  ✓
A-3-2  HLR 정확·일관             ✓+I ✓+I ✓  -
A-3-3  HLR ↔ target              ✓  ✓  ✓  -
A-3-4  HLR verifiable            ✓+I ✓+I ✓  -
A-3-5  HLR ↔ standard            ✓  ✓  ✓  -
A-3-6  HLR 추적성                ✓+I ✓+I ✓  ✓
A-3-7  HLR 알고리즘 정확         ✓+I ✓+I ✓  -

(같은 패턴이 A-4, A-5, ... 으로)
```

전체 71 obj 분포:

| DAL | 의무 obj | Independence 필요 |
|---|---|---|
| A | 71 | ~30 |
| B | 69 | ~15 |
| C | 62 | ~5 |
| D | 26 | ~5 |

## 정리

- DAL A~E 5등급. *Functional Hazard Assessment*로 결정.
- 71 obj (DAL A 기준). 5 그룹: Planning, Development, Verification (Req/Design/Code/Test), Verification of Verification, CM, SQA, Certification Liaison.
- **Independence (I)**가 DAL A의 핵심. *작성자 ≠ 검증자*, 일부는 *조직 차원 독립*.
- DAL A의 *MC/DC 100%*가 가장 큰 비용 동인.
- DAL D는 *26 obj만 의무* — DAL A의 ~37%.
- Redundancy로 DAL 등급 격하 가능 — *Triple Redundancy = 3 × DAL C*.
- Common-mode failure 회피를 위해 *dissimilar design*.
- 모든 산출물에 *Control Category (CC1/CC2)*.

## 다음 장 예고

3장은 *Planning Phase* — PSAC, SDP, SVP, SCMP, SQAP 5 plan의 작성 가이드와 FAA SOI 1 review 대응.

## 관련 항목

- [Ch 1 — DO-178C 개요](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [Ch 3 — Planning Phase](/blog/embedded/aerospace-standards/do-178c/chapter03-planning-phase)
- [Ch 9 — Coverage Analysis (MC/DC)](/blog/embedded/aerospace-standards/do-178c/chapter09-coverage-mcdc)
- [ARINC 653 IMA](https://www.arinc.com/)
- [FAA Order 8110.49 — Software Approval Guidelines](https://www.faa.gov/regulations_policies/orders_notices/index.cfm/go/document.information/documentid/1019438)
