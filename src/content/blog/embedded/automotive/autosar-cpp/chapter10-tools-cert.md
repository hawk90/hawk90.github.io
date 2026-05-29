---
title: "Ch 10: 도구, 인증, MISRA C++:2023 마이그레이션"
date: 2026-05-18T11:00:00
description: "AUTOSAR 분석기 비교, Compliance Matrix, ISO 26262 인증, MISRA C++:2023 통합 후계, High Integrity C++."
tags: [autosar, cpp, tools, certification, misra-cpp-2023, polyspace, helix-qac]
series: "AUTOSAR C++14"
seriesOrder: 10
draft: true
---

마지막 장. 도구 선택, Compliance Matrix, ISO 26262 심사, *MISRA C++:2023 통합 후계*까지 마무리한다.

## 정적 분석기 비교

### 상용 도구

| 도구 | 회사 | AUTOSAR 지원 |
|------|------|-------------|
| **Helix QAC** (구 PRQA) | Perforce | 공식 채택, ISO 26262 qualification |
| **Polyspace Bug Finder + Code Prover** | MathWorks | AUTOSAR 패키지, abstract interpretation |
| **Coverity** | Synopsys | AUTOSAR 매핑, deep path 분석 |
| **Klocwork** | Perforce | IDE 통합, AUTOSAR 분류 |
| **Axivion Suite** | Axivion | AUTOSAR + MISRA 통합, 자동차 특화 |
| **Parasoft C/C++test** | Parasoft | AUTOSAR + 단위 테스트 통합 |

### 오픈소스·저비용

| 도구 | 라이선스 | AUTOSAR 커버리지 |
|------|---------|----------------|
| **clang-tidy** | LLVM | `cppcoreguidelines-*`, `bugprone-*`, `cert-*`, `modernize-*` 검사군이 AUTOSAR의 *상당수* 커버 |
| **Cppcheck** | GPL | C++ 검사 일부, AUTOSAR 직접 매핑 없음 |
| **clang-static-analyzer** | LLVM | path-sensitive 분석 |

### clang-tidy로 시작하기

```bash
clang-tidy -checks='cppcoreguidelines-*,bugprone-*,cert-*,modernize-*,readability-*' \
           -warnings-as-errors='*' \
           source.cpp -- -std=c++14
```

각 검사군의 AUTOSAR 매핑:

| clang-tidy 검사군 | AUTOSAR 영역 |
|-------------------|-------------|
| `cppcoreguidelines-*` | RAII, ownership, const correctness |
| `bugprone-*` | 흔한 버그 패턴 |
| `cert-*` | CERT C/C++ 직접 매핑 |
| `modernize-*` | C++14 modern 기능 사용 권장 |
| `readability-*` | 식별자, 형식, 가독성 |
| `performance-*` | 불필요한 복사, move 누락 |

ASIL D 인증을 *지향하지 않는* 프로젝트라면 clang-tidy + 코드 리뷰 + ASan + TSan만으로도 *상당히 안전*.

## Tool Qualification

ISO 26262 Part 8 Clause 11이 *Tool Qualification*을 요구. *Tool Confidence Level (TCL)*:

```
TCL1: 도구 출력이 안전성에 영향 없음 — 빌드 시스템 등
TCL2: 영향 있지만 다른 절차로 검증 — 코드 리뷰가 보완
TCL3: 직접 안전성에 영향 — 도구만으로 검증
```

AUTOSAR 검사는 *TCL3 qualification 필요*. Helix QAC, Polyspace, LDRA는 *Tool Qualification Kit* 판매(인증서 + 테스트 케이스 + 알려진 한계).

## Compliance Matrix

핵심 산출물. AUTOSAR C++14의 340+ 규칙에 대한 *프로젝트 상태*.

```
| Rule    | Category   | Tool     | Status     | Deviations | Notes              |
|---------|------------|----------|------------|------------|--------------------|
| A0-1-1  | Required   | Polyspace| Compliant  | 2          | dev_builds         |
| A0-1-2  | Required   | Manual   | Compliant  | 0          |                    |
| A5-2-2  | Required   | QAC      | Compliant  | 0          |                    |
| A5-2-3  | Required   | QAC      | Deviation  | 3          | C-API integration  |
| A12-0-1 | Required   | Polyspace| Compliant  | 0          |                    |
| A18-5-1 | Required   | QAC      | Deviation  | 12         | RTOS allocator     |
| A21-1-1 | Required   | Coverity | Compliant  | 0          |                    |
| ...     |            |          |            |            |                    |
```

각 deviation은 *별도 Deviation Record*에 정당화.

## Deviation Record 예

```
=== DR-ADAS-042 ===

Project       : ADAS Perception ECU v3.1
ASIL          : D
File          : modules/lidar_driver.cpp
Lines         : 78-85
Rule          : A18-5-1 (new/delete 직접 사용 회피)

Code:
  // AUTOSAR A18-5-1 deviation — DR-ADAS-042
  void *ptr = ::operator new(buffer_size, std::nothrow);
  if (!ptr) return -ENOMEM;

Reason for deviation:
  LiDAR DMA 버퍼는 4KB 정렬 + Non-cacheable 메모리 영역에서 할당돼야 한다.
  std::make_unique는 기본 allocator만 사용해 이 요구를 충족할 수 없다.

Mitigation:
  - 할당된 버퍼는 lidar_driver 객체의 lifetime과 일치 (RAII wrapper).
  - 버퍼 누수 단위 테스트 TC-LIDAR-031.
  - 정렬 검증 TC-LIDAR-032.

Approval:
  Module Owner   : K. Lee     2025-08-20
  Safety Manager : J. Park    2025-08-21
```

## ISO 26262 심사 시 제출

1. **AUTOSAR C++14 Conformance Plan** — 버전, 도구, 적용 ASIL.
2. **Tool Qualification Reports** — TCL3 인증서.
3. **Compliance Matrix** — 모든 규칙 상태.
4. **Deviation Records** — 위반의 정당화.
5. **Project Coding Standard** — 추가 규칙(이름 규칙, 길이 등).
6. **Code Review Records** — 도구 미검출 사항의 인간 리뷰.
7. **Test Reports** — 단위·통합 테스트 + sanitizer.

## CI/CD 통합

```yaml
# .gitlab-ci.yml
autosar_check:
  stage: analyze
  script:
    - polyspace-bug-finder -prj project.psprj -results-dir results
    - polyspace-report-generator results -o compliance.html
  artifacts:
    paths:
      - compliance.html
      - results/
    reports:
      junit: autosar_junit.xml

  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

매 PR마다 *새 위반 검출*하고 *기존 deviation은 허용 목록*.

## MISRA C++:2023 — 통합 후계

2023년 발표된 **MISRA C++:2023**은 *AUTOSAR C++14 + MISRA C++:2008*을 통합한 *새 표준*이다.

| 비교 | AUTOSAR C++14 (2017) | MISRA C++:2023 |
|------|---------------------|-----------------|
| 기반 표준 | C++14 | C++17 (옵션 C++20) |
| 규칙 수 | 340+ | ~180 (재구조화) |
| 분류 | Required/Advisory | Mandatory/Required/Advisory |
| Concept | 없음 | 일부 통합 |

AUTOSAR 컨소시엄도 *MISRA C++:2023을 공식 후계*로 인정. 다만 *기존 프로젝트*는 AUTOSAR C++14를 *유지*하는 경우가 많다.

### 마이그레이션 전략

```
Phase 1 (~6개월)
  - AUTOSAR C++14에서 MISRA C++:2023으로 매핑 표 작성
  - 도구 측 매핑 지원 확인 (Helix QAC, Polyspace 등)

Phase 2 (~6개월)
  - 새 프로젝트는 MISRA C++:2023 채택
  - 기존 프로젝트는 *듀얼 적용* (두 표준 모두)

Phase 3 (~12개월)
  - 기존 프로젝트도 MISRA C++:2023으로 이전
  - 차이 항목 deviation 처리
```

## 시리즈 마무리 — AUTOSAR C++를 마치며

AUTOSAR C++14는 *modern C++의 안전한 부분집합*을 정의했다. 그 가치는:

- **RAII로 자원 관리 자동화** — C의 goto cleanup 패턴 대체.
- **Type safety** — `enum class`, `static_cast`, smart pointer.
- **Compile-time 검증** — `constexpr`, `static_assert`, type traits.
- **Move semantics** — 비-복사 자원 이전.

동시에 한계도 명확:

- **예외 사용 논쟁** — 안전 critical에서 *-fno-exceptions* 일반적.
- **RTTI 비용** — `dynamic_cast`, `typeid` 회피.
- **동적 메모리** — 정적 allocator 필요.
- **Template metaprogramming** — 인증 가능 범위 제약.

## 다음 추천 시리즈

- **MISRA C++:2023** — AUTOSAR의 통합 후계. 본격 채택 시작.
- **High Integrity C++ (HIC++)** — PRQA가 정리한 *통합 C++ 표준*. AUTOSAR보다 가벼움.
- **Embedded C++ for Real Systems** — 본 블로그의 패턴 중심 시리즈.
- **The C++ Programming Language** (Bjarne Stroustrup) — 언어 자체.
- **Effective Modern C++** (Scott Meyers) — modern C++ 모범 사례.

## 정리

- 상용 도구는 *Helix QAC, Polyspace, Coverity, Klocwork, Axivion*. TCL3 qualification 필수.
- 오픈소스는 *clang-tidy*가 가장 유용 — `cppcoreguidelines-*`, `cert-*` 등.
- Compliance Matrix + Deviation Record로 *추적성 확보*.
- ISO 26262 심사는 *추적성과 정당화*가 본 평가 대상.
- MISRA C++:2023이 *AUTOSAR + MISRA C++:2008* 통합 후계.
- 임베디드 modern C++의 핵심은 *RAII + constexpr + smart pointer*.

## 관련 항목

- [Ch 9 — Concurrency, Memory](/blog/embedded/automotive/autosar-cpp/chapter09-concurrency-memory)
- [MISRA C Ch 10 — 도구·인증](/blog/embedded/automotive/misra-c/chapter10-tools-certification)
- [CERT C Ch 10 — POSIX, Concurrency](/blog/embedded/automotive/cert-c/chapter10-posix-concurrency)
- [AUTOSAR 공식](https://www.autosar.org/)
- [MISRA C++:2023 공식](https://misra.org.uk/misra-c-plus-plus-2023/)
- [Helix QAC](https://www.perforce.com/products/helix-qac)
