---
title: "Ch 14: MISRA + CERT + AUTOSAR 동시 적용 — 통합 전략"
date: 2026-05-18T15:00:00
description: "세 표준이 같은 코드베이스에 동시에 적용될 때 — conflict 해결, 우선순위, 통합 Compliance Matrix, 도구 cross-mapping."
tags: [misra, cert-c, autosar, c, cpp, integration, cross-standard, governance]
series: "MISRA C"
seriesOrder: 14
draft: false
---

자동차·항공 펌웨어 프로젝트는 *MISRA C + CERT C + AUTOSAR C++14* 셋 다 적용되는 경우가 많다. 각 표준이 *다른 강조점*을 가지므로 *conflict*가 생긴다. 이 장은 *통합 전략*을 본다.

## 세 표준의 관계 — 한눈에

```
                   안전 (Safety)              보안 (Security)
                   ─────────────              ───────────────
C 코드 (C99~)     | MISRA C:2012             | CERT C
                  | (자동차·항공·의료)         | (CWE·CVE 기반)
                  |                          |
                  | 함께 적용 가능 — *상호 보완*
                  |
C++ 코드         | MISRA C++:2023           | CERT C++
(C++14~)         | (또는 AUTOSAR C++14)      |
                 |                          |
                 | AUTOSAR + MISRA C++:2008 = MISRA C++:2023 통합
```

자동차 C++ 프로젝트의 *일반적 stack*:

```
Layer                Standard
────────             ────────
SoC firmware (C)     MISRA C + CERT C
RTOS (C)             vendor Safety Manual + 외부 wrapper 통한 MISRA
Application (C++)    AUTOSAR C++14 + CERT C++ + (MISRA C++:2023 마이그레이션)
```

## 표준 비교 매트릭스

| 영역 | MISRA C | CERT C | AUTOSAR C++14 |
|------|---------|--------|---------------|
| 목적 | Safety (의도 안 한 사고) | Security (악의 공격) | Safety + 일부 Security |
| 기준 | C99/C11 부분집합 | C99/C11 부분집합 | C++14 부분집합 |
| 분류 | Mandatory/Required/Advisory | Rule/Recommendation + Priority | Required/Advisory/Document |
| Deviation | Permit + Record | 정량적 Risk Assessment | Permit + Record |
| 적용 | ISO 26262, IEC 62304, DO-178C | NIST, OWASP, CWE | ISO 26262 |
| 라이선스 | 유료 (£60-100) | 무료 (CC BY-SA) | 무료 |
| 도구 | QAC, Polyspace, LDRA | clang-tidy, Coverity | 위 모두 |

## 통합의 이유

**MISRA만 적용했을 때 놓치는 것**:

- *외부 입력의 보안 검증* — MISRA는 *공격자 모델*이 없음. `strcpy`의 buffer overflow는 잡지만 *공격 표면 일반*은 없음.
- *암호학적 무결성* — Heartbleed류 정보 누설.
- *Side channel* — timing attack.
- *POSIX 특정 보안 함정* — TOCTOU, signal handler 안전성 (CERT POS, SIG).

**CERT만 적용했을 때 놓치는 것**:

- *결정성·실시간 보장* — MISRA의 핵심 가치(`malloc` 금지 등).
- *컴파일러 확장 금지* — 이식성.
- *Essential Type Model* — 묵시 변환의 *모든 case*에 명시 캐스트.
- *정적 분석 자동 검증의 *Required* 등급* — CERT는 *Recommendation*도 많아 적용 강제력 약함.

**둘 다 적용하면**: *Safety + Security + 분석 자동화* 모두 충족.

## 명시적 매핑 — MISRA ↔ CERT 규칙

많은 규칙이 *완전히 같거나 매우 비슷*. 통합 시 한 번만 처리.

| MISRA | CERT | 메시지 |
|-------|------|--------|
| Rule 9.1 (Mandatory) | EXP33-C | 미초기화 변수 사용 |
| Rule 13.6 (Mandatory) | EXP44-C | sizeof 부작용 |
| Rule 17.2 | (Recommendation MSC34) | 재귀 회피 |
| Rule 17.4 (Mandatory) | (none — 표준 동작) | 모든 경로 return |
| Rule 17.7 | (none — `__attribute__`) | 반환값 무시 |
| Rule 18.1 | ARR30-C | 배열 범위 |
| Rule 18.6 | DCL30-C | 자동 변수 lifetime |
| Rule 21.3 | (안전 critical 외에는 추천 없음) | malloc 금지 |
| Rule 21.4 | (none) | setjmp 금지 |
| Rule 21.5 | SIG30-C, SIG31-C | signal handler |
| Rule 21.6 | (none) | stdio |
| Rule 21.7 | (none, ERR07 추천) | atoi 회피 |
| Rule 22.1 | FIO42-C | 파일 닫기 |
| Rule 22.2 (Mandatory) | MEM30-C | UAF |

비슷한 메시지지만 *severity가 다르다*. MISRA Mandatory > CERT Rule > CERT Recommendation.

## Conflict 1 — Recursive 함수

| | MISRA | CERT |
|---|-------|------|
| Rule | 17.2 — *직접/간접 재귀 금지* | MSC34-C — *재귀 회피* (Recommendation) |
| 강제도 | Required | Recommendation |
| 결정 | MISRA 따름 (더 엄격) | |

자동차에서는 *MISRA 엄격*. 일반 서버 코드는 *CERT 유연*.

## Conflict 2 — Goto

| | MISRA | CERT |
|---|-------|------|
| Rule | 15.1 (Advisory) — 회피 / 15.3 (Required) — forward만 | (특정 추천 없음) |
| 일반 관행 | cleanup 패턴은 deviation으로 허용 | goto cleanup 일반적 |
| 결정 | 프로젝트 정책 명시 | |

대부분 *goto cleanup* 허용 + *backward 금지*로 통합.

## Conflict 3 — Dynamic Memory

| | MISRA | CERT |
|---|-------|------|
| Rule | 21.3 — *malloc 금지* (Required) | MEM30~36 — *조심해서 사용* |
| 자동차 펌웨어 | malloc 금지 | malloc 안전하게 사용 |
| 일반 시스템 | (적용 안 함) | 사용 가능 |
| 결정 | 안전 critical은 MISRA, 일반 코드는 CERT | |

자동차·의료는 *MISRA*. 서버 코드는 *CERT*. *같은 회사의 다른 컴포넌트*가 다른 정책일 수 있다.

## Conflict 4 — Exceptions (C++)

| | AUTOSAR C++14 | CERT C++ |
|---|---------------|----------|
| 사용 | 허용 (회피 권장) | 안전하게 사용 |
| 임베디드 | `-fno-exceptions` 일반적 | 예외 사용 가능 |
| 결정 | 프로젝트 정책 — 보통 비활성화 | |

## 통합 정책 문서 — 예

**Cross-Standard Coding Policy — Powertrain ECU v3.0**

**1. 기본 표준:**

- C code — MISRA C:2012 Amendment 4 + CERT C 2nd Edition
- C++ code — AUTOSAR C++14 + CERT C++

**2. Conflict 해결 우선순위** — *안전 > 보안 > 성능 > 가독성*.

**3. 명시적 결정 사항:**

| 영역 | 정책 |
|------|------|
| A. Recursive functions | MISRA 17.2 우선 — 모든 재귀 금지. Exception — 컴파일 시간 결정 가능한 *depth bound*가 있는 경우만 deviation |
| B. Dynamic memory | MISRA 21.3 우선 — `malloc` 금지. Exception — 부팅 시 일회성 정적 풀 초기화 (Permit P-DYN-1). CERT MEM30~36은 *deviation 보고 시 동시 충족 입증* |
| C. Goto | MISRA 15.3 — forward만. MISRA 15.5 (Advisory) — 단일 종료점 권장 → cleanup 패턴 허용. CERT는 특정 입장 없음 |
| D. Exceptions (C++) | `-fno-exceptions` 빌드. AUTOSAR + CERT 모두 자동 적용 — try/catch 컴파일 불가 |
| E. Integer overflow | MISRA 1.3 (Mandatory) — UB 회피. CERT INT30/31/32 — checked arithmetic 권장. 둘 다 충족 — `__builtin_*_overflow` 또는 C23 `ckd_*` |
| F. String functions | MISRA Dir 4.11 — 인자 유효성 검증. CERT STR31, STR32 — null 종결 보장. 자체 wrapper `safe_strcpy` 사용 (둘 다 충족) |

**4. Cross-Standard Mapping** — `compliance_matrix.csv`에 *각 위반*이 *어느 표준의 어느 규칙*인지 매핑. 한 위반은 *여러 표준에 동시 위반*일 수 있음.

**5. Tool Configuration:**

| 도구 | 설정 |
|------|------|
| Helix QAC | MISRA + CERT 동시 검사 enabled |
| Polyspace | MISRA Rule + CERT mapping 활성화 |
| clang-tidy | `cert-*` checks (보완) |

이 문서가 *프로젝트 모든 결정의 root*. 심사관도 *제일 먼저 본다*.

## 통합 Compliance Matrix

```
| Issue ID | File          | Line | MISRA | CERT  | AUTOSAR | Status     | Deviation |
|----------|---------------|------|-------|-------|---------|------------|-----------|
| #4521    | can.c         | 142  | 17.7  | ERR33 | A8-4-2  | Compliant  | -         |
| #4522    | mmio.c        | 78   | 11.4  | INT36 | -       | Deviation  | DR-MMI-7  |
| #4523    | dsp.c         | 234  | 10.6  | -     | A5-2-5  | Compliant  | -         |
| #4524    | session.c     | 89   | 18.1  | ARR30 | -       | Deviation  | DR-SES-12 |
| ...      |               |      |       |       |         |            |           |
```

같은 위반이 *여러 표준 컬럼*에 매핑. *한 번에 처리*.

도구가 *통합 매핑*을 자동 생성:

```bash
qac.exe -prj proj.prj -enable-misra -enable-cert -enable-autosar \
        -output integrated_matrix.csv
```

## 도구 통합

### QAC + Polyspace 듀얼 분석

```bash
# 한 코드 베이스에서 두 도구 실행
qac.exe -prj proj.prj -output reports/qac
polyspace-bug-finder -sources-list sources.lst -results reports/polyspace

# 결과 통합
python3 scripts/integrate.py reports/qac reports/polyspace > integrated.csv
```

`integrate.py`가 *같은 위반을 한 row로 합침*. *어느 도구가 잡았는지*만 다른 컬럼.

```
Issue  File         Line  Rule  Detected_by
#4521  can.c        142   17.7  QAC,Polyspace
#4522  mmio.c       78    11.4  QAC
#4525  parser.c     312   -     Polyspace_INT_OVERFLOW
```

도구별 *고유 검출*은 *심사관에게 cross-check 증거*.

### clang-tidy 보완

```bash
# QAC + clang-tidy 동시
clang-tidy -checks='cert-*,misc-*,bugprone-*,cppcoreguidelines-*' \
           --warnings-as-errors='*' \
           sources.c
```

clang-tidy의 `cert-*`가 *QAC가 놓치는 일부 CERT 패턴* 보강.

### Cross-tool reporting (SonarQube)

```yaml
# SonarQube에 통합
sonar:
  stage: report
  script:
    - sonar-scanner \
        -Dsonar.projectKey=epb-ecu \
        -Dsonar.sources=src/ \
        -Dsonar.c.misra.reportPaths=reports/qac/sonarqube.json \
        -Dsonar.c.cert.reportPaths=reports/clang-tidy/sonarqube.json \
        -Dsonar.cpp.autosar.reportPaths=reports/qac/autosar.json
```

SonarQube가 *통합 대시보드*. *전체 코드 품질·보안 상태*를 한 곳에서.

## 통합 검출 — 흔한 패턴 (실전 코드)

### 패턴 1 — 입력 검증

```c
// 위반 모음 — 의도 안 한 거의 모든 표준 위반
size_t n = atoi(input);              // CERT INT04 + MISRA 21.7
char buf[n];                          // MISRA 18.8 (VLA) + CERT ARR32
strcpy(buf, input);                   // MISRA Dir 4.11 + CERT STR31 + STR32
return buf;                           // MISRA 18.6 + CERT DCL30
```

```c
// Good — 모든 표준 충족
char *end;
errno = 0;
long v = strtol(input, &end, 10);
if (errno != 0 || end == input || v < 1 || v > kMaxSize) {
    return -EINVAL;
}

char buf[kMaxBuf];                    // 고정 크기
if (snprintf(buf, sizeof(buf), "%ld", v) >= (int)sizeof(buf)) {
    return -EOVERFLOW;
}

return strdup(buf);                   // 또는 owner 반환
```

### 패턴 2 — 메모리 관리

```cpp
// 위반 다수
Foo *p = new Foo();                   // AUTOSAR A18-5-1
memset(p, 0, sizeof(*p));             // 안전하지만 더 좋은 방법
DoWork(p);
// delete 누락                        // CERT MEM31 + AUTOSAR A12 (소유권)
```

```cpp
// Good — 모든 표준 충족
auto p = std::make_unique<Foo>();     // AUTOSAR 권장 + CERT 권장
DoWork(p.get());
// 자동 destroy
```

### 패턴 3 — 동시성

```c
// 위반 다수
int counter = 0;                      // 비-atomic shared

void *Thread(void *arg) {
    counter++;                        // CERT CON32 + AUTOSAR A23-0-3
    pthread_mutex_lock(&m);
    if (cond) return NULL;            // CERT CON31 + 누수
    pthread_mutex_unlock(&m);
}
```

```c
// Good — 모든 표준 충족
atomic_int counter = 0;               // C11 atomic

void *Thread(void *arg) {
    atomic_fetch_add(&counter, 1);

    /* C++의 std::lock_guard 패턴을 C로 — goto cleanup */
    pthread_mutex_lock(&m);
    int rc = -1;
    if (!cond) {
        rc = DoWork();
    }
    pthread_mutex_unlock(&m);
    return (void *)(uintptr_t)rc;
}
```

## 인증 — 통합 적용 시

### ISO 26262 인증

ISO 26262 Part 6 Clause 5.4가 *코딩 가이드라인 요건*. *어느 표준을 적용*했는지 명시.

**ISO 26262 Coding Standard Statement** — EPB ECU v2.1, ASIL D.

**Standards Applied:**

- MISRA C:2012 Amendment 4 (Primary — Safety)
- CERT C 2nd Edition (Secondary — Security)

**Conflict Resolution** — 위 정책 문서 참고.

**Mapping:**

- 같은 위반이 두 표준 모두 위반인 경우 — 한 번 처리, 두 표준 모두 만족
- 한 표준만 위반인 경우 — 해당 표준 deviation 절차

Tool Coverage:
  - MISRA: Helix QAC 2024.2 (TCL3 qualified)
  - CERT: Polyspace Bug Finder (TCL3 qualified)
  - 보완: clang-tidy cert-* (TCL2)

Cross-Check Evidence:
  - artifacts/cross_check_2024-06-12.csv
```

### Boeing / Airbus DO-178C 인증

항공은 *MISRA C 또는 자체 변형* 사용. CERT는 *보안 보조 자료*.

### 의료 IEC 62304

자동차와 비슷. *MISRA C 권장* + *데이터 무결성*은 *CERT 활용*.

## 거버넌스 — 누가 결정하는가

복수 표준 적용은 *복수 stakeholder*.

| 결정 | 주체 |
|------|------|
| 어느 표준 적용 | Safety Manager (조직 차원) |
| Conflict 정책 | Safety + Security Team 합의 |
| Tool 선택 | Quality + DevOps Team |
| Deviation 승인 | Module Owner + Safety Manager |
| Compliance 검토 | Independent Reviewer |
| 외부 인증 | Notified Body (TÜV, UL 등) |

각 결정이 *문서화*. 인증 심사에서 *책임 추적*.

## 통합 vs 단일 — 비용

| 시나리오 | 도구 비용 | 분석 시간 | Engineering 시간 | 보안 사고 위험 |
|----------|----------|----------|-----------------|---------------|
| 단일 표준 (MISRA만) | $7-10K / 좌석 | baseline | baseline | baseline |
| 통합 (MISRA + CERT) | $10-15K / 좌석 | ~20% 증가 | ~10% 증가 | 대폭 감소 |

**ROI** — 보안 사고 1건 평균 $4M (IBM Cost of a Data Breach Report). 통합 비용 ~$10K / 년 / 좌석. → 거의 항상 ROI 양수.

자동차 회사는 *Recall 한 번에 수억 달러*. 통합 비용 *수 % 미만*.

## 일반적 함정

### 함정 1 — 표준 간 *terminology* 차이

| 표준 | 용어 | 의미 |
|------|------|------|
| MISRA / CERT | Rule | must follow |
| AUTOSAR | Required | MISRA의 Required와 같음 |
| AUTOSAR | Document | MISRA의 Advisory와 비슷 |
| MISRA / AUTOSAR | Deviation | 공식 위반 절차 |
| CERT | Suppression | 도구에서 무시 |

같은 단어가 *다른 의미*. 정책 문서에 *명확히 정의*.

### 함정 2 — 표준 *버전 불일치*

```
MISRA C:2012 Amendment 2 (2020)
MISRA C:2012 Amendment 3 (2022)
MISRA C:2012 Amendment 4 (2023)
```

*Amendment마다 새 규칙* 추가. 프로젝트 시작 시 *정확한 버전* 명시.

### 함정 3 — 외부 라이브러리 표준 차이

```
FreeRTOS    : 자체 Safety Manual (ISO 26262 호환)
Embedded TCP/IP stack : LWIP의 경우 MISRA 부분 충족
HAL libs    : 보통 *MISRA 충족 X*
```

외부 라이브러리는 *Permit-EXT*로 분리.

### 함정 4 — *Cross-team* 일관성

같은 회사의 *다른 팀*이 *다른 정책*. 통합 시 *중앙 거버넌스* 필요.

## 정리

- MISRA(안전) + CERT(보안) + AUTOSAR(C++ 안전) 동시 적용이 *현대 자동차 펌웨어*의 표준.
- 많은 규칙이 *명시적으로 매핑*. 한 번 처리, 통합 카운트.
- Conflict는 *프로젝트 정책 문서*에 명시. 안전 > 보안 > 성능 > 가독성 우선순위 일반적.
- 도구는 *듀얼 분석*(QAC + Polyspace 등). Cross-check 증거가 *심사 신뢰*.
- 통합 Compliance Matrix가 *심사 핵심 산출물*.
- 거버넌스 — Safety/Security Manager, Module Owner의 *명확한 책임*.
- 비용은 *수 % 추가*. 사고 비용 대비 *항상 ROI 양수*.

## 다음 장 예고

15장은 *실시간 분석 — WCET*. 정적 분석으로 *최악 실행 시간 보장*.

## 관련 항목

- [Ch 10 — 도구·인증](/blog/embedded/automotive/misra-c/chapter10-tools-certification)
- [Ch 13 — Helix QAC 깊이](/blog/embedded/automotive/misra-c/chapter13-helix-qac-deep)
- [CERT C Ch 1 — CERT란 / MISRA와 차이](/blog/embedded/automotive/cert-c/chapter01-intro-vs-misra)
- [AUTOSAR C++ Ch 10 — Tools, Cert](/blog/embedded/automotive/autosar-cpp/chapter10-tools-cert)
