---
title: "Ch 11: ISO 26262 ASIL D 인증 심사 — 실전 워크스루"
date: 2025-09-05T12:00:00
description: "가상의 EPB(Electric Parking Brake) ECU 프로젝트를 ASIL D 인증까지. Compliance Matrix, Deviation Records, Tool Qualification, 심사관 질문 시뮬레이션."
tags: [misra, c, iso-26262, asil-d, audit, certification, deviation, helix-qac]
series: "MISRA C"
seriesOrder: 11
draft: false
---

10장이 인증의 *행정 절차*를 개관했다면, 이 장은 *실전 시나리오*를 본다. 가상의 *Electric Parking Brake (EPB) ECU* 프로젝트가 ISO 26262 ASIL D 인증을 받는 과정을 처음부터 끝까지 따라간다. 모든 문서, 도구 설정, 심사관 질문, deviation 정당화를 *실제 형식*으로 살핀다.

## 프로젝트 컨텍스트 — EPB ECU

| 항목 | 값 |
|------|-----|
| 차종 | C 세그먼트 sedan |
| ECU 역할 | 주차 브레이크 제어, 경사로 발진 보조 |
| ASIL 등급 | D (가장 엄격) |
| 코드 규모 | C 약 85,000 LoC, 추가 24,000 LoC 외부 (HAL, FreeRTOS) |
| 컴파일러 | GCC 12.2 for ARM Cortex-M7 |
| RTOS | FreeRTOS 10.5 (자체 Safety Manual 적용) |
| 통신 | CAN-FD, LIN |
| 인증 기관 | TÜV SÜD (가상) |
| 일정 | 사전 평가 6주, 본 심사 4주 |

## Phase 1 — 안전 컨셉 (Safety Concept)

ISO 26262 Part 3는 *Hazard Analysis and Risk Assessment (HARA)*를 요구한다. 코딩 표준 적용은 그 결과로서의 *기술 안전 요구사항*에 따라 정해진다.

```
TSR-EPB-001: 시스템은 운전자 의도와 무관하게 100ms 이상 브레이크를 작동시키지 않는다.
  ASIL: D
  관련 SW 요구사항: SR-EPB-014, SR-EPB-015, SR-EPB-016
  코딩 표준: MISRA C:2012 (Mandatory + Required 100%)
  공차: ±10ms (제어 루프 주기)
```

이 한 줄이 *모든 deviation 정책*의 근거가 된다. 100ms 보장이 흔들리는 deviation은 *어떤 정당화도 통과시키지 않는다*.

## Phase 2 — Coding Standard Document

프로젝트 시작 시 *Coding Standard*를 정한다. MISRA C:2012를 *기본*으로 하고 *프로젝트 추가 규칙*을 명시.

```
=== EPB-CS-001: Coding Standard ===

1. Base Standard
   - MISRA C:2012 Amendment 2 (2020)
   - 모든 Mandatory: 100% 준수, deviation 불허
   - 모든 Required: 사전 승인 Permit 또는 case-by-case deviation
   - Advisory: 프로젝트 정책에 따라 Required로 격상 (아래 참고)

2. Advisory → Required 격상 항목
   - Rule 5.9   (internal linkage 식별자 고유)
   - Rule 8.7   (가능하면 internal linkage)
   - Rule 11.5  (void * → 객체 포인터 명시 캐스트)
   - Rule 15.4  (한 루프에 다수 break/return)
   - Rule 15.5  (단일 종료점)
   - Rule 18.5  (다단계 포인터 — 단 char**는 main argv 한정 허용)

3. Additional Project Rules
   PR-001: 모든 함수 매개변수 ≤ 7
   PR-002: 한 함수 줄 수 ≤ 80
   PR-003: McCabe 복잡도 ≤ 10
   PR-004: 중첩 깊이 ≤ 4
   PR-005: 모든 함수에 @requirement 주석 필수
   PR-006: 모든 외부 식별자에 모듈 prefix (epb_, can_, lin_)
   PR-007: 명명 — snake_case (함수, 변수), UPPER_CASE (상수, 매크로)
   PR-008: 모든 헤더 self-contained
   PR-009: 모든 .c 파일에 대응 .h (단 main.c 제외)
   PR-010: 인터럽트 핸들러 줄 수 ≤ 30

4. 면제 영역 (Permit-EXT)
   - third_party/FreeRTOS/    (Permit-EXT-001: FreeRTOS Safety Manual 준수)
   - third_party/ST_HAL/      (Permit-EXT-002: ST CMSIS 적용)
   - 모든 면제 코드는 wrapper를 통해서만 호출

5. 도구
   - Static Analysis: Helix QAC 2024.2 (TCL3 qualified)
   - Coverage: VectorCAST 2023 (TCL3)
   - Unit Test: Google Test + FFF mocking (host 환경)
   - HIL: ETAS LABCAR
```

이 문서가 *모든 후속 결정의 root*. 심사관이 가장 먼저 본다.

## Phase 3 — Tool Qualification Package

ISO 26262 Part 8 Clause 11. Helix QAC의 TCL3 qualification 패키지 구성:

```
=== Tool Qualification Package — QAC-TQ-2024-1 ===

Tool Information
  Name: Perforce Helix QAC
  Version: 2024.2 (build 12345)
  Vendor: Perforce Software, Inc.
  Vendor TCL Statement: 첨부 (Helix-QAC-TCL3-Cert-2024.pdf)

Tool Use Case (TU)
  TU-1: MISRA C:2012 Rule 본문 검증
  TU-2: 사이클로마틱 복잡도 측정
  TU-3: 코드 메트릭 (LoC, 인자 수, 중첩 깊이)

Tool Confidence Analysis
  Tool Error Likelihood: TI1 (낮음 — 광범위한 검증·시장 검증)
  Tool Error Detection: TD1 (높음 — 다른 도구·리뷰가 동일 결과 검증)
  → Tool Confidence Level: TCL1

  하지만 ASIL D 적용으로 *보수적 분류*: TCL3 처리.
  ASIL D 요구: Qualification Method = "Validation of the software tool"
  → Validation Suite 적용 (아래)

Validation Suite Execution
  - Vendor 제공 Test Suite v2024.2: 모두 PASS
  - 프로젝트 자체 cross-check (Polyspace로 동일 코드 분석): 검출 차이 분석 첨부
  - 알려진 한계: Helix-QAC-Known-Limitations-2024.2.pdf 첨부

Approval
  Project Manager:  W. Kim   2024-04-12
  Safety Manager:   J. Park  2024-04-15
  Quality Manager:  S. Lee   2024-04-15
```

심사관은 *vendor cert*만으로 만족하지 않는다. *프로젝트 환경*에서 실제로 *알려진 위반을 검출*하는지 cross-check 증거를 요구한다.

## Phase 4 — Compliance Matrix (발췌)

전체 159 항목 중 일부를 보여준다. 형식이 핵심.

```
| ID    | Cat | Severity | Status     | Permits | Devs | Tool      | Cross-Check |
|-------|-----|----------|------------|---------|------|-----------|-------------|
| D1.1  | Req | -        | Compliant  | -       | 0    | Manual    | CCS-EPB-001 |
| D2.1  | Req | -        | Compliant  | -       | 0    | QAC       | CI:job:misra|
| D3.1  | Req | -        | Compliant  | -       | 0    | Manual    | Polarion    |
| D4.1  | Req | -        | Compliant  | P-DIV-1 | 8    | QAC + Rev | TC-DIV-*    |
| D4.6  | Adv | -        | Compliant  | -       | 0    | QAC       | -           |
| D4.7  | Req | -        | Compliant  | -       | 0    | QAC + GCC | -           |
| D4.10 | Req | -        | Compliant  | -       | 0    | QAC       | -           |
| D4.12 | Req | -        | Compliant  | -       | 0    | QAC + grep| -           |
| 1.3   | Req | Critical | Compliant  | -       | 0    | Polyspace | -           |
| 2.1   | Req | -        | Compliant  | -       | 0    | QAC       | -           |
| 2.2   | Req | -        | Compliant  | -       | 0    | QAC       | -           |
| 5.1   | Req | Critical | Compliant  | -       | 0    | QAC       | -           |
| 8.4   | Req | Critical | Compliant  | -       | 0    | QAC       | System scan |
| 9.1   | Man | Critical | Compliant  | -       | 0    | QAC + Pol | -           |
| 10.1  | Req | Critical | Compliant  | -       | 0    | QAC       | -           |
| 10.3  | Req | Critical | Compliant  | -       | 0    | QAC       | -           |
| 10.6  | Req | Major    | Compliant  | P-MTH-1 | 47   | QAC       | TC-MTH-*    |
| 11.4  | Adv | -        | Deviation  | P-MMI-1 | 12   | QAC + Rev | -           |
| 13.6  | Man | Critical | Compliant  | -       | 0    | QAC       | -           |
| 14.4  | Req | Major    | Compliant  | -       | 0    | QAC       | -           |
| 15.5  | Adv*| -        | Deviation  | -       | 2    | QAC + Rev | RV-EPB-78   |
| 16.3  | Req | Major    | Compliant  | -       | 0    | QAC       | -           |
| 17.2  | Req | Critical | Compliant  | -       | 0    | QAC       | -           |
| 17.7  | Req | Major    | Compliant  | -       | 0    | QAC       | -           |
| 18.1  | Req | Critical | Compliant  | -       | 0    | Polyspace | -           |
| 18.4  | Adv*| -        | Compliant  | -       | 0    | QAC       | -           |
| 18.8  | Req | Critical | Compliant  | -       | 0    | QAC       | -           |
| 21.3  | Req | Critical | Deviation  | P-DYN-1 | 3    | QAC + Rev | TC-INIT-*   |
| 21.6  | Req | Major    | Deviation  | P-LOG-1 | 18   | QAC + Rev | -           |
```

(`Adv*` = Advisory를 프로젝트 정책으로 Required로 격상.)

심사관의 첫 질문: "전체 Deviation 합계는 몇 개인가?"

답: "Permit 기반 88건 + case-by-case 2건 = 90건. 전체 항목 대비 0.57%. ASIL D 평균 1~2%."

## Phase 5 — Permit 문서 (Permit-DIV-1 예)

자주 발생하는 deviation은 *Permit*으로 사전 승인.

```
=== Permit P-DIV-1 ===

Title: 0 나눗셈 Dir 4.1 deviation — 보장된 nonzero divisor

Rule(s): Dir 4.1 (Required) — Runtime failure 회피

Description:
  다음 조건을 모두 만족하면 0 나눗셈 검사를 생략할 수 있다.

  1. Divisor가 컴파일 시 결정된 상수이며 0이 아닌 경우
  2. Divisor가 함수 시그니처상 `[1, MAX]` 범위 명시
  3. 호출 측 코드 리뷰에서 nonzero 보장 확인됨
  4. 모든 호출 경로에 정적 분석 결과 첨부 (QAC report)

Justification:
  실시간 제어 루프에서 *모든 나눗셈*에 conditional 검사 삽입 시
  worst-case 실행 시간이 5~8% 증가. 100ms 보장(TSR-EPB-001) 마진
  잠식. 검사를 *입력 경계*에서 한 번만 수행하는 패턴이 더 안전.

Risk Mitigation:
  - 입력 단계의 단위 테스트 100% 커버리지 (TC-MATH-001~042)
  - 정적 분석으로 divisor 가능 범위 추적
  - HIL에서 경계값 fuzzing (TC-HIL-MATH-001)

Approval:
  Module Owner    : H. Choi  2024-04-22
  Safety Manager  : J. Park  2024-04-23
  Safety Reviewer : T. Yoon  2024-04-23

Valid Period: 2025-12-31 (프로젝트 종료까지)

Coding Marker:
  /* MISRA Dir 4.1 deviation under P-DIV-1
   * divisor verified nonzero by [reason]. Ref: DR-DIV-NNN */
```

이 Permit이 있으면 *그 조건을 만족하는 deviation*은 개별 보고서 없이 *코드 안 마커 + 한 줄 정당화*로 충분.

## Phase 6 — Deviation Record (DR-MMI-007 예)

Permit으로 처리되지 않는 case는 *개별 보고서*.

```
=== Deviation Record DR-MMI-007 ===

Project       : EPB ECU v2.1
ASIL          : D
File          : src/drivers/mmio.c
Lines         : 78-82
Function      : mmio_init_dma_controller()
Rule          : 11.4 (Advisory, 프로젝트 정책으로 Required 격상)
Permit        : P-MMI-1

Code (snippet):
  // MISRA 11.4 deviation under P-MMI-1
  // DMA controller base register at fixed address per RM0410 Rev 5
  volatile uint32_t *dma_base = (volatile uint32_t *)0x40020000U;

Reason for deviation:
  STM32F767 DMA1 Controller는 *고정 MMIO 주소* 0x40020000에 매핑된다.
  포인터-정수 변환 없이는 *주소를 코드에 표현할 방법이 없다*.

Alternative Considered:
  - Vendor HAL 사용: HAL은 MISRA 면제 영역 (Permit-EXT-002)이며,
    더 큰 wrapper API 추가는 본 함수의 *단순성*을 해친다.
  - Linker symbol 정의: __dma_base를 .ld 파일에서. 분석 도구와
    호환되지 않아 채택 X.

Risk Mitigation:
  - 주소는 STM32F767 Reference Manual의 *고정 사양*.
  - 단위 테스트 TC-MMIO-014: register read/write 검증.
  - 정적 분석 결과 첨부: pointer overflow 없음.
  - 함수 5줄 — 인지 부담 최소.

Verification Evidence:
  - QAC Report: artifacts/qac/mmio_c_2024-06-12.html
  - Unit Test: tests/test_mmio.cpp:42
  - HIL Test: tests/hil/dma_init_test.cpp:18
  - Review: RV-EPB-204 (2024-06-13)

Approval:
  Module Owner   : K. Lee   2024-06-14
  Safety Manager : J. Park  2024-06-14
```

심사 시 *각 deviation에 대한 질문*에 답할 준비가 되어야. 잘 만든 보고서는 *모든 질문에 미리 답*해 둔다.

## Phase 7 — 심사관 질문 시뮬레이션

가장 흔한 *어려운 질문*과 모범 답변 정리.

### Q1. "Rule 10.6의 deviation이 47개. 너무 많지 않나?"

> Rule 10.6은 *묵시적 정수 확장*도 명시 캐스트를 요구한다. 우리 프로젝트는 *센서 데이터를 신호 처리*하는 코드가 많아 `uint16_t × uint16_t → uint32_t` 같은 *의도된 확장*이 빈번하다. 모든 곳에 캐스트를 박는 것은 *가독성 손해*가 크다.
>
> 그래서 Permit P-MTH-1을 만들어 *signal processing 모듈* 한정으로 deviation을 일괄 허용했다. 47개는 모두 그 모듈 안의 호출이며, 같은 패턴이 반복된다(중심 패턴 3종).
>
> 위험은 *signal processing 모듈 단위 테스트*가 *모든 입력 범위에서 결과를 검증*해 커버한다. TC-DSP-001~056 참고.

### Q2. "FreeRTOS는 MISRA 위반이 많을 텐데, 어떻게 처리했나?"

> FreeRTOS는 *third_party/* 디렉터리에 분리하고 Permit-EXT-001로 전체 면제했다. 단, 우리 코드가 FreeRTOS API를 호출할 때는 *반드시 wrapper*를 통해서만 한다.
>
> 예컨대 `xTaskCreate()`를 직접 호출하지 않고, `epb_rtos_create_task()`라는 자체 wrapper를 사용한다. Wrapper는 MISRA 준수 + 인자 검증 + 에러 처리를 포함한다.
>
> 또한 FreeRTOS v10.5의 *Safety Manual*은 FreeRTOS 자체의 ISO 26262 ASIL D 적합성을 제공한다. 이를 통합 검증으로 사용한다.

### Q3. "Mandatory Rule 9.1을 어떻게 100% 검증했나?"

> Rule 9.1은 *자동 변수 미초기화 사용*. Mandatory라 0건이어야 한다.
>
> 1차 검증: GCC `-Wuninitialized` + `-Wmaybe-uninitialized` + `-Werror`. 빌드가 통과한다는 것 자체가 검증.
>
> 2차 검증: Helix QAC 정적 분석. 모든 변수의 *모든 경로*에서 정의 후 사용 추적.
>
> 3차 검증: Polyspace Code Prover로 *abstract interpretation* 기반 검증. Path-sensitive 분석이 GCC/QAC가 놓친 경로를 찾는다.
>
> 결과: 3개 도구 모두 *0 위반*. Mandatory 100% 충족.

### Q4. "21.3 (malloc 금지)에 deviation 3건. 어디서?"

> 부팅 초기 1회만 호출되는 정적 메모리 풀 초기화 코드 3곳이다. 모두 Permit P-DYN-1로 처리.
>
> ```c
> // MISRA 21.3 deviation under P-DYN-1
> g_can_msg_pool = malloc(CAN_POOL_SIZE * sizeof(can_msg_t));
> if (g_can_msg_pool == NULL) emergency_halt();
> // 이후 *free 호출 없음*. 시스템 종료까지 유지.
> ```
>
> 검증:
> - **단편화 분석**: malloc 호출이 부팅 단계 *3회 + free 0회*. 단편화 발생 불가.
> - **OOM 분석**: 총 할당 24KB. 가용 메모리 256KB. 마진 90%.
> - **테스트 TC-INIT-DYN-001**: malloc 실패 시뮬레이션 → `emergency_halt()` 진입 확인.

### Q5. "코드 커버리지는?"

> ISO 26262 Part 6 ASIL D 요구사항:
> - **Statement coverage**: ≥ 100%
> - **Branch coverage**: ≥ 100%
> - **MC/DC (Modified Condition/Decision Coverage)**: ≥ 100%
>
> 측정: VectorCAST. 결과:
> - Statement: 100% (예외 처리·error path 포함)
> - Branch: 100%
> - MC/DC: 99.8% (3개 미달 — 분석 첨부, 모두 *defensive coding* 으로 정당화)

### Q6. "Polarion에서 요구사항 추적성 100% 보였는데, 코드 → 테스트 역방향은?"

> 양방향 추적이 필수다. *요구사항 → 코드*는 코드의 `@requirement` 주석으로, *코드 → 테스트*는 테스트의 `@implements` 태그로 구현.
>
> Polarion에서 *traceability matrix*를 자동 생성. 결과:
> - Total Requirements: 487
> - With Code Implementation: 487 (100%)
> - With Test Coverage: 486 (99.8% — SR-CAN-019 누락, 분석 첨부)

SR-CAN-019는 *CAN bus-off recovery*인데, *HIL 환경에서만 검증 가능*. HIL 테스트 TC-HIL-CAN-019에 추적이 누락된 사실이 발견됐다. 즉시 *Polarion 업데이트* + *Change Request CR-2024-89*로 처리 약속.

## Phase 8 — Finding과 대응

심사 중 발견된 *경미한 finding* 3건:

### Finding-001 (Minor): Header guard 일관성

> 일부 헤더가 `EPB_<MODULE>_<FILE>_H` 패턴, 일부는 `_<FILE>_H_` 패턴.

대응: 30분 안에 일괄 수정 + 빌드 검증 + commit. Finding 즉시 해소.

### Finding-002 (Minor): Coding Standard에 명시되지 않은 Rule 5.4 deviation 1건

> `mmio_dma_buf` 와 `MMIO_DMA_BUF` 매크로 충돌.

대응: 코드 수정으로 매크로 이름 변경(`MMIO_DMA_BUFFER`). Deviation 자체를 제거. 1시간 안에 처리.

### Finding-003 (Recommendation): MC/DC 미달 3건

> 모두 *defensive return code check* (`if (rc != 0) return rc;` 패턴). 첫 인자가 NULL이면 함수 자체가 호출되지 않는 wrapper 설계라 *NULL 경로가 실행되지 않음*.

대응: Recommendation은 *수정 의무 없음*. 하지만 *주석 보강*으로 의도 명시:

```c
/* defensive: rc는 항상 0 (caller_wrapper가 NULL 차단).
 * MC/DC false branch 도달 불가 — by design. */
if (rc != 0) {
    log_error(...);    // 이 경로는 추가 안전망
    return rc;
}
```

## Phase 9 — 최종 결과

```
=== ISO 26262 ASIL D 인증 결과 ===

Project: EPB ECU v2.1
Auditor: TÜV SÜD
Audit ID: TSA-2024-EPB-001
Duration: 사전 평가 6주 + 본 심사 4주

Result: PASS — Conditional Recommendation accepted

Conditions:
  - Finding-003 (Recommendation) follow-up: 3개월 내 보강 review 자료 제출

Certificate Validity: 2025-08-01 ~ 2030-07-31 (5 years)
Renewal Audit: 2030-04 시작 예정

Audit Findings Summary:
  - Major Findings: 0
  - Minor Findings: 2 (closed during audit)
  - Recommendations: 1 (accepted)

MISRA C:2012 Compliance:
  - Mandatory: 100%
  - Required: 99.43% (Permit-based deviation 88)
  - Advisory (project-elevated): 99.96% (case-by-case 2)
```

## 시사점 — 인증을 위한 *준비물*

1. ***Coding Standard* 문서가 가장 중요**. *어디까지 적용할 것인가*를 명확히 정의해야 모든 후속 결정의 근거가 된다.
2. **Permit 기반 정책**이 *case-by-case 보고서*보다 *심사 효율*이 훨씬 좋다. 자주 발생하는 패턴은 Permit으로 일괄 처리.
3. **외부 코드(HAL, RTOS) 격리**가 핵심. *wrapper layer*로 MISRA 적합 코드와 분리.
4. **Cross-check 도구**가 *심사관 신뢰*를 만든다. QAC만 쓰지 말고 Polyspace로 *동일 코드를 다른 도구가 분석*한 결과 비교.
5. **Polarion(또는 DOORS) 트레이서빌리티**가 *없으면 심사 통과 불가*. 코딩 시점부터 `@requirement` 주석 박는 습관.
6. **HIL 테스트 + 단위 테스트 + 정적 분석** 3축 검증. *어느 하나도 빠지면 안 된다*.
7. **Tool Qualification Kit**는 *vendor 인증*만으로 부족 — *프로젝트 환경 cross-check 증거*가 함께.

## 정리

- ISO 26262 ASIL D는 *MISRA C 100% Mandatory + 99%+ Required* 충족이 일반적.
- Compliance Matrix는 *모든 159 항목*에 대한 상태 표. 심사 시작 자료.
- Permit으로 *반복 deviation 패턴*을 일괄 처리. 보고서 부담 감소.
- 외부 코드(RTOS, HAL)는 *별도 디렉터리 + wrapper* 격리.
- Tool Qualification은 vendor cert + *프로젝트 자체 validation 증거* 함께.
- 양방향 트레이서빌리티: 요구사항 ↔ 코드 ↔ 테스트.
- 심사 *Finding*은 *즉시 해소 가능한 수준*이어야 — 사전 평가가 본 평가다.

## 다음 장 예고

12장은 Essential Type Model 심화 — 모든 8개 essential type의 변환 매트릭스 + 자주 위반되는 패턴 50선.

## 관련 항목

- [Ch 10 — 도구·인증](/blog/embedded/automotive/misra-c/chapter10-tools-certification)
- [Ch 12 — Essential Type Model 심화](/blog/embedded/automotive/misra-c/chapter12-essential-type-deep-dive)
- [ISO 26262 Part 6 — Product development at the software level](https://www.iso.org/standard/68388.html)
- [FreeRTOS Safety Manual](https://www.freertos.org/Documentation/RTOS_book.html)
