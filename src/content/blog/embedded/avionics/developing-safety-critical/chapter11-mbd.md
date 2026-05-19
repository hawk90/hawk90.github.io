---
title: "Ch 11: Model-Based Development (DO-331)"
date: 2026-05-18T11:00:00
description: "DO-331 — Simulink·SCADE 모델 기반 개발의 DO-178C 통합."
series: "Developing Safety-Critical Software"
seriesOrder: 11
tags: [avionics, do-178c, do-331, mbd, simulink, scade]
draft: true
---

## 한 줄 요약

> **"Model = requirement 또는 design"** — autocode + tool qualification이 핵심.

## DO-331 — Model-Based Development Supplement

**DO-331 (2011, RTCA)** — Model-Based Development and Verification Supplement.

**목적** — Model-driven approach의 DO-178C 통합.

**Model 정의** — Graphical 또는 textual specification. Behavior·structure 표현. 보통 autocode 가능.

**대표 model**:

- Simulink (MathWorks) — 신호 흐름
- Stateflow — state machine
- SCADE Suite (ANSYS) — synchronous data flow
- Esterel — synchronous
- UML·SysML (보통 architecture)

Model — *코드 위 layer*. Autocode 가능성.

## Model의 두 역할

1. **Specification Model** (= Requirements) — HLR·LLR을 model로 표현.
   - Simulink block diagram = LLR
   - Stateflow chart = state machine LLR
   - SCADE node = function spec
2. **Design Model** (= Design) — Architecture·detailed design.
   - UML class diagram
   - Simulink subsystem hierarchy

Specification + Design 둘 다 model 가능.

각 위치별 *verification 요구 차이*.

## Simulink + Embedded Coder

**Simulink (MathWorks)**:

- Graphical signal flow
- Block library (math·signal·control)
- Stateflow — state machine integration
- Simulink Test — verification

**Embedded Coder**:

- Simulink model → C/C++ code
- Optimization·integer·fixed-point
- Target-specific (ARM·Renesas·NXP)

**DO-178C qualified** — Embedded Coder + DO Qualification Kit, TQL-1 (Level A) 가능.

**사용처** — Boeing 787, Airbus A350, F-35 자동차·항공. 자동차 — ISO 26262 ASIL D.

MathWorks 통합 — *de facto* MBD platform.

## SCADE Suite

**SCADE Suite (ANSYS)** — Synchronous data flow language (Esterel 기반). 형식 의미론 (formal semantics). Lustre 언어 기반.

**SCADE 인증**:

- KCG (Knowledge Compiler·Generator) — qualified C code
- DO-178C Level A TQL-1
- IEC 61508·61511·ISO 26262

**유럽 강세**:

- Airbus A380·A350·A220
- Eurocopter·Eurofighter
- Train (ALSTOM, Siemens)
- Korea Aerospace KFX·KAI 일부

**SCADE vs Simulink**:

- **SCADE** — formal verification 강
- **Simulink** — wider community·ecosystem

SCADE 특징 — *formal semantics + 인증 친화*.

## Simulink 예 — 간단한 모델

```text
[Constant: ref] → [Sum: +] → [PID Controller] → [Plant] → [Scope]
                    [-]
                     ↑
                  [Sensor noise]

Subsystem: PID Controller
  Inputs: error
  Outputs: command
  
  Internal:
    Kp gain → ×
    Integrator
    Derivative
    Sum → output

→ Embedded Coder → control.c
```

Graphical → C code. 인증 — autocoded code가 *traceable*.

## Model Coverage

Model coverage 종류:

- **Decision Coverage at model level** — 각 conditional block의 true·false
- **Condition Coverage** — 각 boolean operand의 T·F
- **MCDC at model level** — Level A 요구
- **Lookup Table coverage** — 각 table entry 사용
- **Saturation coverage** — 상한·하한 도달

Model coverage = *generated code* coverage 대체 가능? — *조건부*.

## Code Coverage vs Model Coverage

**DO-331 입장** — Model coverage가 code coverage 대체 가능. 단 조건:

1. Autocode가 *qualified* tool 사용
2. Code가 model behavior와 *equivalent*
3. Optimization·target-specific 변경 분석

**Level A 시**:

- Object code coverage 별도 필요
- Compiler·optimization 영향

**실제** — Model coverage + spot-check code coverage + Object code coverage (Level A).

Model coverage *최우선*. Code·object coverage *보조*.

## Tool Qualification — Autocoder

**Embedded Coder qualification (DO-330)** — Tool Type 1 (code generator) + Level A → TQL-1.

**DO Qualification Kit (MathWorks)**:

- Tool Operational Requirements
- Tool verification artifacts
- User manual updates
- Specific configuration
- License (수십만 달러)

**SCADE KCG**:

- Tool Type 1
- Qualified to TQL-1
- Kit includes verification evidence

**사용자 책임**:

- Tool 사용 *configuration* 준수
- Tool output sanity check
- Tool version freeze

Autocoder 사용 시 *qualification 비용 + freeze* 책임.

## MBD의 장점

- **직관적 설계** — Block diagram = 제어 엔지니어 친화.
- **Simulation** — Code 실행 전 *동작 검증*. PIL (Processor-in-the-loop), SIL, HIL.
- **자동 코드 생성** — Manual coding error ↓. Coding standard 자동 적용.
- **Traceability** — Block ↔ requirement ↔ generated line. Auto-trace tool 지원.
- **Reuse** — Subsystem library 재사용.
- **Verification at model level** — 빠른 iteration. Refactor·optimize 쉬움.

특히 *control law·DSP* 영역에서 강력.

## MBD의 단점

- **Tool lock-in** — Simulink license 의존, Vendor 의존.
- **학습 곡선** — Stateflow·Embedded Coder 깊은 학습.
- **Generated code 비최적** — Hand-written 대비 *코드 크기·속도* 부족 가능.
- **Tool qualification 비용** — TQL-1 kit: 수십만 달러.
- **회사 IP — model 형식** — Tool migration 어려움.
- **비-control 영역에 부적합** — Application code (UI·comm·logging): manual coding.

MBD = *control·signal* 영역에 집중. 비-control은 *traditional coding*.

## Hybrid Approach

대규모 LV·항공기 SW.

- **Control law (95%)** — Simulink/SCADE. Autocode → C. Model coverage·simulation.
- **Application code** — Hand-written C/C++. Traditional DO-178C.
- **RTOS·driver** — COTS (VxWorks·INTEGRITY etc.).

**Integration** — Autocoded + hand-coded + RTOS = full SW. All — DO-178C evidence.

예 — F-35:

- Control law — autocode
- Mission system — C++ manual
- RTOS — INTEGRITY-178

Hybrid = *standard practice*. 100% MBD 또는 100% manual은 드뭄.

## MBD Verification Workflow

1. **Model 작성** (Simulink·SCADE)
2. **Model coverage·simulation** — Test harness in Simulink, Coverage analysis, Simulation result vs expected
3. **Code generation** (Embedded Coder·KCG) — Qualified tool, Configuration documented
4. **SIL (Software-in-the-loop)** — Generated code on host. Model behavior와 동일성 verify.
5. **PIL (Processor-in-the-loop)** — Generated code on target. Timing·integer accuracy verify.
6. **HIL (Hardware-in-the-loop)** — Real hardware (FCC, sensor sim, actuator)
7. **Flight test** — Real flight (LV·aircraft)

각 단계 — *evidence + 산출물*.

## SCADE 예 — Synchronous

SCADE node (간단):

```text
node altitude_filter(meas: real, dt: real) returns (est: real)
let
  delta = meas - prev_est;
  est = prev_est + 0.1 * delta;
  prev_est = pre est;
tel
```

Generated C:

```c
void altitude_filter(real_t meas, real_t dt,
                     real_t *est) {
  static real_t prev_est = 0.0;
  real_t delta = meas - prev_est;
  *est = prev_est + 0.1f * delta;
  prev_est = *est;
}
```

장점 — Formal semantics: model = code 등가성 proof.

SCADE — *formal equivalence*. 인증 audit 친화.

## MBD in Korean Aerospace

**KARI** — KSLV-II: *Simulink heavy*. Control law·navigation autocode. Hand-written application.

**한화에어로스페이스·KAI** — KFX (KF-21): MBD heavy. Simulink + Embedded Coder. 자동차 분야 — AUTOSAR + Simulink.

**LIG넥스원** — Missile guidance: Simulink autocode.

**TAS·LIG·한화** — SCADE 도입 검토 (Airbus 관련).

한국 — *Simulink + autocode* 일반. SCADE 도입 진행.

## DO-331 Compliance Approach

기본 DO-178C 산출물 + 다음을 추가한다.

**Model Description**:

- Model semantics 정의
- Configuration·tool version

**Model Verification**:

- Model coverage
- Simulation result

**Model Traceability**:

- HLR ↔ model block ↔ generated code

**Autocoder Qualification**:

- DO-330 TQL-1 kit
- Configuration usage

**Code Conformance**:

- Generated code review
- Object code coverage (Level A)

DO-331 = *DO-178C에 model layer 추가*.

## 자주 하는 실수

> ⚠️ Model coverage 100% — Code 검증 skip

"Simulink coverage 100% → 충분" → Code coverage·object coverage 미실시 → Level A audit fail.

→ Model + Code + Object 모두.

> ⚠️ Autocode tool unqualified

Embedded Coder 사용 — TQL kit 미구매 → Tool 신뢰성 증명 부재.

→ DO Qualification Kit 또는 self-qual.

> ⚠️ Configuration 자유 변경

Embedded Coder configuration (최적화 level, integer arithmetic, target) — Mid-project 변경 → Generated code 변화 → Re-qual·re-verify.

→ Configuration *freeze + version control*.

> ⚠️ Manual code 섞임

Generated code에 *수동 수정* → Model ↔ code 불일치 → Trace 깨짐.

→ Generated code 수정 금지. Model 변경 후 re-generate.

## 정리

- DO-331 — Model-Based Development supplement.
- **Simulink** + Embedded Coder, **SCADE** Suite — de facto.
- Model 역할 — *specification or design*.
- Model coverage — code coverage *대체 가능* (조건부).
- Autocoder — *DO-330 qualified* (TQL-1).
- Hybrid — MBD (control) + manual (application) + RTOS.
- 한국 — *Simulink heavy*, SCADE 도입 검토.

다음 편은 **Object-Oriented in Avionics (DO-332)**.

## 관련 항목

- [Ch 10: Reusable Software](/blog/embedded/avionics/developing-safety-critical/chapter10-reusable-software)
- [Ch 12: Object-Oriented](/blog/embedded/avionics/developing-safety-critical/chapter12-oop)
