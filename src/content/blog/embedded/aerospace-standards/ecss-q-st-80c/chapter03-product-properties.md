---
title: "Ch 3: SW Product Properties Assurance — 코드 quality metric"
date: 2026-05-18T04:00:00
description: "ECSS-Q-ST-80C §5.3 — Code metrics, maintainability, testability, reliability. SonarQube/Understand 활용."
tags: [ecss, product-properties, metrics, maintainability, testability, sonarqube]
series: "ECSS-Q-ST-80C"
seriesOrder: 3
draft: true
---

ECSS-Q-ST-80C의 *제품 측면* 품질 보증. *코드 자체의 quality*를 *정량 측정*한다. DO-178C가 *process*에 집중한다면 ECSS는 *process + product 양쪽 동등*. 이 장은 *각 quality property의 측정·해석·개선*까지.

## Product Properties — 7가지

ECSS-Q-ST-80C §5.3.2.2가 정의:

**1. Maintainability    — 유지보수 용이성**


**2. Reliability         — 신뢰성**


**3. Safety              — 안전성**


**4. Security            — 보안성**


**5. Software Reuse      — 재사용성**


**6. Software Portability — 이식성**


**7. Software Suitability — 적합성**

각 property가 *측정 가능한 metric*으로 평가.

## 1. Maintainability

### 정의

> 유지보수자가 *코드를 수정·확장·디버깅*할 수 있는 용이성.

### Metrics

| # | Metric | 설명 | Target |
|---|--------|------|--------|
| 1 | Cyclomatic Complexity | 함수의 의사결정 path 수 (도구 — pmccabe, Lizard, SonarQube) | < 10 per function |
| 2 | Coupling | Ca(afferent), Ce(efferent), Instability `I = Ce / (Ca + Ce)` | I < 0.5 for core modules |
| 3 | Cohesion (LCOM) | 클래스의 method 간 데이터 공유 정도 (Low cohesion = bad, 분할 권장) | LCOM < 0.5 |
| 4 | Lines of Code per function | Long function = harder to maintain | < 60 LSLOC (주석 제외) |
| 5 | Comment Density | 주석 라인 수 / 총 라인 수. 너무 적으면 doc 부족, 너무 많으면 잘못된 주석 가능 | 15–25% |
| 6 | Nesting Depth | 깊은 nesting = 복잡 | < 4 |
| 7 | Function Parameter Count | 많으면 구조체로 묶기 | < 7 |
| 8 | Halstead Volume / Difficulty / Effort | `V = N × log2(n)`, `D = (n1/2) × (N2/n2)`, `E = D × V` | 함수마다 Effort < 100,000 |
| 9 | Maintainability Index (MI) | Halstead + Cyclomatic + LoC 결합. `MI = 171 − 5.2 × ln(V) − 0.23 × Cyclomatic − 16.2 × ln(LoC)` | > 65 (good), > 85 (excellent) |

### 측정 도구

| 도구 | 특징 |
|------|------|
| Lizard (오픈소스) | Cyclomatic, NLOC, parameter count — 빠름, 가벼움, Python tool |
| Understand (Scientific Toolworks) | 종합 metric (Halstead, MI, Coupling) — 시각화, 항공·자동차 광범위 사용 |
| SonarQube | Web-based dashboard — 모든 metric 통합, trend tracking, OSS + Commercial |
| Helix QAC (8장 참조) | MISRA + metrics |
| CodeScene | Hotspot analysis (git history 기반), knowledge map |

### Maintainability Report — 일반 template

**Maintainability Report (일반 template):**

**Module info** — file name, LoC, function count.

**Metrics 보고:**

- Cyclomatic Complexity per function (min/max/avg, target)
- Coupling (Ca / Ce / Instability)
- LoC per function (min/max/avg, target)
- Comment Density (target 15–25%)
- Nesting Depth (target < 4)
- Parameter Count (target < 7)
- Halstead (Volume / Difficulty / Effort)
- Maintainability Index distribution

**Findings** (severity별 — Major / Minor / Observation) — 각 finding에 Owner + Due + Action.

각 metric의 *target value*는 *프로젝트 / 조직 / criticality 기반*으로 결정.

## 2. Reliability

### 정의

> 명세된 조건에서 *결함 없이 동작*하는 능력.

### Metrics

**1. Defect Density**

- = Defects per KLoC (1000 LoC)
- Industry average: 1-5
- Excellent: < 0.5
- Critical SW: < 0.1

**2. MTBF (Mean Time Between Failures)**

- = Total operating time / Number of failures
- Mission target: depends

**3. MTTF (Mean Time To Failure)**

- = Average time before first failure
- Aerospace: > 10^9 hours (target)

**4. Defect Removal Efficiency (DRE)**

- = Defects found in development / Total defects (dev + post-release)
- Target: > 95% (Critical A SW)

**5. Test Effectiveness**

- = Defects found by test / Total defects
- Target: > 80%

**6. Code Coverage (from Ch 9 of DO-178C)**

- Statement, Branch, MC/DC

### Reliability 예측 — Software Reliability Growth Models

| 모델 | 식 | 비고 |
|------|-----|------|
| Goel-Okumoto | $\lambda(t) = \alpha \beta \exp(-\beta t)$ | $\alpha$ = total defects, $\beta$ = decay rate |
| Musa Basic Execution Time | $\lambda(t) = \lambda_0 \exp(-\lambda_0/v_0 \cdot t)$ | — |
| Jelinski-Moranda | $\lambda(t) = \phi (N - i)$ | — |

이 모델로 *future defect 예측* + *mission 신뢰성 추정*.

```python
# Goel-Okumoto 예
import numpy as np
from scipy.optimize import curve_fit

# Historical defect data (cumulative defects vs time)
time_weeks = [1, 2, 3, ..., 50]
defects_cumulative = [3, 7, 12, ..., 87]

# Fit model
def goel_okumoto(t, alpha, beta):
    return alpha * (1 - np.exp(-beta * t))

popt, _ = curve_fit(goel_okumoto, time_weeks, defects_cumulative)
alpha, beta = popt

# 예측
print(f"Total defects estimated: {alpha:.0f}")
print(f"Defects remaining at week 50: {alpha - 87:.0f}")
print(f"MTBF projection (mission start): {1 / (alpha*beta*np.exp(-beta*60)):.0f} hours")
```

## 3. Safety

8장에서 깊게. *해당 모듈의 safety failure 영향*.

### Metrics

**1. Failure Mode Coverage**

- FMEA에서 식별된 *모든 failure mode*가 *test됨*
- Target: 100% Criticality A

**2. Hazard Mitigation Coverage**

- 모든 hazard가 *적절한 mitigation*
- Target: 100%

**3. Recovery Time**

- Fault detection → safe state 시간
- Target: < 100ms (FCS)

**4. Graceful Degradation Levels**

- Failure 시 시스템이 *몇 단계*로 degrade
- Target: 다층 fallback

### FMEA (Failure Mode and Effects Analysis)

```
=== FMEA for AOCS Module ===

Function: Attitude Control

| Failure Mode          | Cause             | Effect              | Detection      | Mitigation         | RPN |
|-----------------------|-------------------|---------------------|----------------|--------------------|-----|
| Quaternion overflow   | Math overflow     | Wrong attitude     | Self-test     | Saturate + log     | 12  |
| Sensor data corruption| Bit flip          | Wrong attitude     | CRC check     | Reject + retry     | 8   |
| Timing miss           | Task overrun      | Loss of control    | Watchdog      | Reset to safe mode | 16  |
| Control loop divergent| Bad gain          | Spin              | Telemetry     | Cmd to safe mode   | 20  |
| Software hang         | Infinite loop     | Loss of control    | Watchdog      | Reset              | 18  |

RPN = Severity × Probability × Detectability
Target: RPN < 25 (Critical A)
```

각 failure mode가 *test case + mitigation*. *완전한 risk coverage*.

## 4. Security

### Metrics

**1. Vulnerability Count**

- 알려진 CVE 매핑
- Target: 0 unmitigated High/Critical

**2. Penetration Test Coverage**

- Threat model의 각 attack vector test
- Target: 100%

**3. Encryption Coverage**

- 모든 sensitive data가 encrypted
- Target: 100%

**4. Authentication Coverage**

- 모든 interface가 authenticated
- Target: 100%

**5. Input Validation Coverage**

- 모든 external input validated
- Target: 100%

### Tool

**Static Application Security Testing (SAST):**

- Helix QAC + CERT C/C++
- Fortify
- Checkmarx
- SonarQube Security

**Dynamic Application Security Testing (DAST):**

- Penetration test
- Fuzzing

**Software Composition Analysis (SCA):**

- 외부 라이브러리 CVE 검사
- Snyk, Black Duck, OWASP Dependency Check

## 5. Software Reuse

### Metrics

**1. Reuse Rate**

- = Reused LoC / Total LoC
- Target: 30-50% for mature org

**2. Reuse Effectiveness**

- = Effort saved by reuse / Total effort
- Target: 20-40%

**3. Heritage SW Track Record**

- = Number of successful reuses
- 기록 많을수록 신뢰

### Heritage SW — ESA 강조

ESA는 *heritage SW*를 강조. 검증된 코드 재사용.

```
=== ESA Heritage SW Catalog ===

Component: SAVOIR Reference Software (SAVOIR-FAIRE)
  Use cases: 50+ ESA missions
  Heritage: A-level reuse approved
  Modules: AOCS, OBSW, FDIR

Component: ERC32 / LEON RTEMS
  Use cases: 100+ ESA missions
  Heritage: Long-track-record

Component: ESA Galileo OBSW base
  Use cases: 30 Galileo satellites
  Heritage: Operational data 10+ years
```

Heritage SW 사용 시:
- *수년의 검증 데이터 활용*
- 새 ECSS-Q-ST-80C process *부분 생략 가능*
- 단 *integration validation 의무*

## 6. Software Portability

### 정의

> 다른 환경(OS, CPU, compiler)으로 *옮길 수 있는 용이성*.

### Metrics

**1. Platform Dependency Count**

- 특정 platform API 호출 수
- Target: 별도 HAL layer로 격리

**2. Compiler-specific Constructs**

- #pragma 사용 수
- 컴파일러 extension 사용
- Target: 매크로로 격리

**3. Endianness Dependencies**

- Byte order 가정 코드
- Target: 명시적 변환 함수

**4. Word Size Dependencies**

- int vs int32_t 사용 비율
- Target: 모두 폭 명시 타입

**5. Floating Point Format Dependencies**

- IEEE 754 가정
- 일부 임베디드는 다름

### Portability 적용

**Portability Audit — OBC Software**

Target migration — *ARM Cortex-M7 → RISC-V* (예정 2026).

**Findings:**

- 92% code portable (`stdint.h`, `stdbool.h` 사용)
- 5% portability barrier (assembler intrinsics in HAL)
- 3% portability barrier (compiler-specific attributes)

**Action:**

- HAL layer 강화
- Compiler attributes를 `PORTABLE_ATTR` 매크로로 wrapping
- Endianness 가정 코드 검토

Estimated migration effort — *3 person-months* (vs from scratch — 24 months).

## 7. Software Suitability

### 정의

> 요구사항 충족도. *Functional + Non-functional*.

### Metrics

**1. Requirement Coverage**

- = 구현된 req / 총 req
- Target: 100%

**2. Test-to-Requirement Ratio**

- = Test cases / Requirements
- Target: 2-5 (적절 수준)

**3. Performance Achievement**

- WCET vs budget
- Memory vs budget
- Throughput vs target

**4. User Satisfaction**

- Customer feedback
- Pilot survey (항공)
- Mission operator survey (우주)

## Tool Integration — SonarQube

대부분의 metric을 *통합 dashboard*로.

### SonarQube 설정

```yaml
# sonar-project.properties
sonar.projectKey=kompsat6-fms
sonar.projectName=Mission-FMS
sonar.projectVersion=2.0.0

sonar.sources=src/
sonar.tests=tests/

sonar.cfamily.compile-commands=build/compile_commands.json

# Quality gates
sonar.qualitygate.wait=true

# Metrics targets
sonar.coverage.minimum=85
sonar.cyclomatic_complexity.maximum=10
sonar.lines.maximum_per_function=60
sonar.duplicated_lines_density.maximum=5

# Rules (MISRA + custom)
sonar.profile=ECSS-Quality
```

### Quality Gates — 일반 template

```
=== Quality Gate (일반 template) ===

  Bugs:                      0 (none allowed for Criticality A)
  Vulnerabilities:           0
  Security Hotspots:         0
  Code Smells:               < N
  Test Coverage:             > X%
  Duplicated Lines:          < Y%
  Maintainability Rating:    A (1-5 scale)
  Reliability Rating:        A
  Security Rating:           A
  Cyclomatic Complexity max: per project
  Function Length max:       per project

If any fail: Quality Gate fails
Build pipeline: blocked from production deployment
```

매 commit이 *quality gate 통과*해야. 자동화된 quality control.

## CodeScene — Hotspot Analysis

Git history 기반 *복잡도 + 변경 빈도* 결합.

```
=== Hotspots (일반 예) ===

Top N Hotspots (변경 빈번 + 복잡도 높음):

1. module_A
   Complexity: N (avg)
   Changes (last 6mo): N
   Authors: N
   → Hotspot risk: HIGH/MEDIUM/LOW
   → Action: Refactoring / Test 강화 등

(이하 동일 패턴)
```

*잦은 변경 + 복잡*한 코드가 *defect 가능성 높음*. 우선 개선 대상.

## ECSS vs DO-178C 비교 — Product Properties

**DO-178C:**

- Code quality는 *SCS (Software Code Standards)* 안에서
- 주로 *qualitative* (e.g., "code shall be maintainable")
- Metric 의무 없음 (프로젝트가 자체 설정)

**ECSS:**

- Product Properties Assurance 별도 활동
- *Quantitative metric* 의무
- Industry-wide benchmarking

ECSS가 *more measurable*. 비교·개선 가능.

## 정리

- ECSS는 *7개 product property* 측정·관리.
- Maintainability: cyclomatic, coupling, LoC, MI 등.
- Reliability: defect density, MTBF, reliability growth model.
- Safety: FMEA, hazard coverage, recovery time.
- Security: vulnerability count, pen test coverage, SAST/DAST.
- Reuse: heritage SW 강조 — ESA SAVOIR-FAIRE 등.
- Portability: HAL layer, compiler abstraction.
- Suitability: requirement coverage, performance.
- Tool: SonarQube가 통합 dashboard. CodeScene hotspot.
- 정확한 metric target은 *프로젝트 / 조직 / criticality* 기반으로 결정.

## 다음 장 예고

4장은 *SW Configuration Management* — SCM Plan, baseline 관리, change control workflow.

## 관련 항목

- [Ch 2 — Process Assurance](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter02-process-assurance)
- [Ch 4 — Configuration Management](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter04-configuration-management)
- [DO-178C Ch 6 — Source Code Standards](/blog/embedded/aerospace-standards/do-178c/chapter06-source-code-standards)
- [SonarQube](https://www.sonarsource.com/products/sonarqube/)
- [Scientific Toolworks Understand](https://www.scitools.com/)
- [CodeScene](https://codescene.com/)
