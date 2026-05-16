---
title: "Ch 10: 정적 분석 도구, Compliance Matrix, 인증 보고서"
date: 2025-09-05T11:00:00
description: "PRQA·Polyspace·LDRA·Cppcheck·clang-tidy 비교, Compliance Matrix 작성, ISO 26262 심사 대응."
tags: [misra, c, tools, polyspace, ldra, certification, iso-26262, compliance]
series: "MISRA C"
seriesOrder: 10
draft: false
---

규칙을 이해하는 것과 *프로젝트에 적용*하는 것은 다른 문제다. 마지막 장은 도구 선택, Compliance Matrix 작성, 인증 심사 대응까지 실전 행정을 본다.

## 정적 분석기 비교

### 상용 도구

| 도구 | 회사 | 특징 |
|------|------|------|
| **PRQA QA-C** (현 Perforce Helix QAC) | Perforce | MISRA 인증 도구로 사실상 표준. 규칙별 deviation report 자동 생성. ASIL D 인증. |
| **Polyspace** (MathWorks) | MathWorks | *abstract interpretation* 기반. 런타임 에러까지 분석. MATLAB 통합. |
| **LDRA Testbed** | LDRA | 정적 분석 + 단위 테스트 + 코드 커버리지 통합. 항공·국방. |
| **Coverity** | Synopsys | 대규모 코드베이스에 강함. 깊은 path 분석. |
| **Klocwork** | Perforce | IDE 통합 우수. 점진적 분석. |

### 오픈소스·저비용 도구

| 도구 | 라이선스 | 한계 |
|------|---------|------|
| **Cppcheck** | GPL | MISRA add-on이 있지만 *공식 인증 아님*. 일부 규칙만. |
| **clang-tidy** | LLVM | `misc-*`, `bugprone-*` 검사가 MISRA 일부 커버. |
| **Sonarsource** | LGPL/Commercial | SonarQube가 무료, 추가 분석은 유료. |
| **GCC 자체** | GPL | `-Wall -Wextra -Wconversion`이 *상당수*의 단순 MISRA 위반 검출. |

### 도구 선택 가이드

- **ASIL D 인증 필수** — Helix QAC, Polyspace, LDRA 중. *Tool Qualification Kit* 함께 구입.
- **ASIL B 이하** — Cppcheck + clang-tidy + 코드 리뷰 조합도 *가능*. 단 deviation 보고서를 수동 작성.
- **PoC·교육** — Cppcheck + GCC strict 모드. 인증과 분리.

## Tool Qualification

ISO 26262 Part 8 Clause 11이 *도구 자격*을 요구한다. 도구가 *실수로 위반을 놓칠 수 있다*는 가능성을 고려해 *TCL(Tool Confidence Level)*을 평가한다.

```
TCL1: 도구 출력이 안전성에 영향 없음 (예: 빌드 시스템)
TCL2: 영향 있지만 다른 절차로 검증 (예: 코드 리뷰가 보완)
TCL3: 직접 안전성에 영향 (이 도구만으로 검증)

대부분의 MISRA 분석기는 TCL3 qualification 필요 — *벤더가 인증서 제공*.
```

Helix QAC, Polyspace, LDRA는 *Tool Qualification Kit*을 판다. 인증서 + 테스트 케이스 + 알려진 한계 문서 포함.

## Compliance Matrix

핵심 산출물. 각 MISRA 규칙에 대해 *프로젝트가 어떻게 충족했는지*를 표로 만든다.

```
| Rule | Category  | Tool      | Status      | Deviations | Notes              |
|------|-----------|-----------|-------------|------------|--------------------|
| 1.1  | Required  | Manual    | Compliant   | 0          | CCS doc REQ-001    |
| 1.2  | Advisory  | QAC       | Compliant   | 3          | GCC ext for ISR    |
| 1.3  | Required  | Polyspace | Compliant   | 0          |                    |
| 2.1  | Required  | QAC       | Compliant   | 0          |                    |
...
| 21.3 | Required  | QAC       | Deviation   | 5          | Permit POOL-001    |
| 21.6 | Required  | QAC       | Deviation   | 12         | Logging wrapper    |
```

각 deviation은 *별도 Deviation Record*와 연결돼 있어야 한다.

## Deviation Record 양식

```
=== Deviation Record DR-CAN-007 ===

Project       : Powertrain ECU v2.3
ASIL          : C
File          : drivers/can.c
Lines         : 142-145
Rule          : 17.7 (Required)
Permit        : N/A (case-by-case)

Code (snippet):
  /* MISRA 17.7 deviation — DR-CAN-007 */
  (void) send_message(&msg);

Reason for deviation:
  send_message()의 반환값은 호출자가 처리할 의무가 있는 것이
  의도된 설계이나, 이 호출 지점은 watchdog timer 기반 모니터링
  컨텍스트에서 호출되며 watchdog이 send 실패를 감지해 reset을
  유발한다. 반환값 검사를 추가하면 같은 에러를 두 번 처리하게
  된다.

Risk mitigation:
  - watchdog 타임아웃 5ms 검증 (TC-CAN-042).
  - send_message() 자체 단위 테스트 (TC-CAN-038 ~ 041).
  - 코드 리뷰 RV-2025-08-15 승인.

Approval:
  Module Owner : J. Smith     2025-08-15
  Safety Mgr   : K. Park      2025-08-16
```

이런 보고서가 *50~200 개* 누적되는 것이 일반적이다. 적정 수치는 *프로젝트 규모와 ASIL*에 따라 다르지만, *모듈 한 곳에 10+ 누적*되면 설계 재검토 신호.

## 일반적 deviation 패턴

산업에서 *흔히 승인*되는 deviation 패턴 몇 가지.

1. **Rule 21.3 (`malloc` 금지)** — 부팅 시점 일회성 정적 풀 초기화에서 허용.
2. **Rule 17.2 (재귀 금지)** — 트리·그래프 알고리즘, 상한 명시.
3. **Rule 11.4 (포인터↔정수 캐스트)** — MMIO 레지스터 접근.
4. **Rule 21.6 (stdio 금지)** — 디버그 빌드의 UART 로깅 wrapper.
5. **Rule 15.5 (단일 종료점)** — early return이 더 읽기 좋은 helper.

각 패턴마다 *Permit*을 미리 작성해 *반복 case에 한 번에 적용*할 수 있다.

## CI/CD 통합

```yaml
# .gitlab-ci.yml
misra_check:
  stage: analyze
  script:
    - qac.exe -prj project.prj -cfg misra2012.cfg
    - qac_report --format=json --output=misra_report.json
    - python3 scripts/check_deviations.py misra_report.json
  artifacts:
    paths:
      - misra_report.json
      - compliance_matrix.html
    reports:
      junit: misra_junit.xml
```

빌드가 *위반을 새로 도입하면 빨갛게* 되도록. 기존 deviation은 *허용 목록*에 등록.

## ISO 26262 심사 시 제출 자료

심사 시 다음을 제출한다.

1. **MISRA C Conformance Plan** — 어떤 판본·어떤 규칙·어떤 도구.
2. **Tool Qualification Report** — 사용 도구의 TCL과 인증서.
3. **Compliance Matrix** — 전체 규칙별 준수/위반 표.
4. **Deviation Records** — 모든 위반의 정당화 문서.
5. **Coding Standard Document** — 프로젝트의 추가 규칙(이름 규칙, 길이 한계 등).
6. **Code Review Records** — 도구가 잡지 못한 항목의 인간 리뷰 증거.

심사관은 *deviation의 합리성*과 *추적성*을 본다. "왜 이 위반을 허용했는가"에 대한 답이 *문서로* 있어야 한다.

## 시리즈 마무리 — MISRA를 마치며

MISRA C는 *완벽한 표준*은 아니다. Advisory 규칙은 종종 *생산성*과 충돌하고, *Undecidable* 규칙은 도구 false positive를 만든다. 그럼에도 채택되는 이유는 단순하다.

- *안전한 C 부분집합*에 대한 *업계 합의*가 있다.
- *인증 심사에서 받아들여진다*.
- *위반 패턴이 실제로 사고로 이어진다*는 30년의 데이터가 있다.

자동차 외 산업에서는 *완벽한 적용*보다 *적정 수준 도입*이 더 흔하다. 의료기기·산업 자동화·항공이 각각 자체 기준을 가지고 *MISRA를 참고 자료*로 쓴다.

## 다음 시리즈 추천

- **CERT C** — 보안 관점의 C 표준. MISRA와 *상호 보완*. 같은 디렉터리 안 시리즈.
- **AUTOSAR C++14** — C++ 임베디드 표준. 자율주행으로 인한 C++ 채택 가속.
- **Embedded C++ for Real Systems** — 본 블로그의 자체 C++ 시리즈.
- **Effective C++** — Scott Meyers의 C++ 모범 사례.

## 정리

- 도구 선택은 *ASIL 등급*과 *예산*에 따라. 인증 필요 시 Helix QAC / Polyspace / LDRA.
- Tool Qualification(TCL3)은 *벤더가 제공*하는 인증 키트로 충족.
- Compliance Matrix는 *모든 규칙*에 대한 상태 표. 심사 핵심 산출물.
- Deviation Record는 *위반마다* 작성. 정당화·완화·승인.
- CI/CD에 통합해 *새 위반 도입 차단*.
- ISO 26262 심사 시 *추적성과 문서*가 본 평가 대상.

## 관련 항목

- [Ch 9 — 메모리·표준 라이브러리](/blog/embedded/standards/misra-c/chapter09-memory-library)
- [CERT C Ch 1 — MISRA와의 차이](/blog/embedded/standards/cert-c/chapter01-intro-vs-misra)
- [AUTOSAR C++ Ch 1 — 도입 배경](/blog/embedded/standards/autosar-cpp/chapter01-intro)
- [Perforce Helix QAC 공식](https://www.perforce.com/products/helix-qac)
- [MathWorks Polyspace](https://www.mathworks.com/products/polyspace.html)
