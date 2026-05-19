---
title: "Ch 1: CERT C란 무엇이고 MISRA와 어떻게 다른가"
date: 2026-05-18T02:00:00
description: "SEI CERT의 배경, 보안 중심 철학, MISRA와의 비교, Risk Assessment Framework."
tags: [cert-c, security, sei, cwe, risk-assessment]
series: "CERT C"
seriesOrder: 1
draft: false
---

CERT(Computer Emergency Response Team)는 1988년 Morris Worm 사건 이후 카네기멜런 SEI(Software Engineering Institute)가 미국방부 자금으로 설립한 보안 대응 조직이다. CERT C는 그 산물 중 하나 — *C 언어로 작성된 코드에서 보안 취약점을 만들지 않기 위한 표준*이다.

## CERT의 출발점 — 보안

MISRA는 *안전(safety)*에 초점을 둔다. 의도하지 않은 동작이 사람을 다치게 하는 것을 막는다. CERT는 *보안(security)*에 초점을 둔다. 의도된 공격이 시스템을 손상시키는 것을 막는다. 둘은 겹치지만 강조점이 다르다.

```
Safety (MISRA)          Security (CERT)
─────────────           ─────────────
의도하지 않은 동작        의도된 공격
하드웨어 오작동           원격 코드 실행
사람 부상·사망            데이터 유출·서비스 거부
ISO 26262, IEC 62304    OWASP, CWE, ISO 27001
```

같은 코드가 *둘 다*의 위반일 수 있다. 예컨대 *버퍼 오버플로*는 안전 사고(차량 잘못 동작)이자 보안 사고(공격자가 임의 코드 실행) 모두를 일으킨다. 그래서 *MISRA와 CERT는 상호 보완*으로 함께 적용되는 경우가 많다.

## CERT C의 구조

CERT C는 SEI 위키(`wiki.sei.cmu.edu/confluence/display/c`)에서 *무료로 공개*된다. 책 형태로도 출간돼 있다(2nd Edition, 2014).

규칙은 두 종류로 나뉜다.

| 종류 | 의미 | 위반의 결과 |
|------|------|------------|
| **Rule** | 반드시 따라야 하는 항목 | 보안 취약점 또는 UB 직결 |
| **Recommendation** | 권고 | 모범 사례, 위반해도 직접 사고는 아님 |

각 항목은 *XX. CCCNN-C* 형식의 ID를 가진다.

- *XX*: 카테고리 (PRE, DCL, EXP, INT, FLP, ARR, STR, MEM, FIO, ENV, SIG, ERR, API, CON, MSC, POS, WIN, MET)
- *CCC*: 일련번호
- *NN-C*: 언어(C)

예:

```
ARR30-C   포인터가 가리키는 객체의 경계를 벗어나지 마라
INT32-C   signed 정수 연산이 overflow하지 않게 하라
STR31-C   문자열 저장소에 null 종결을 위한 공간을 확보하라
MEM30-C   free된 메모리에 접근하지 마라
```

## Risk Assessment Framework

CERT의 가장 *유용한 기여*는 위반의 위험도를 *정량화*하는 프레임워크다. 각 규칙에 세 축의 점수가 매겨진다.

| 축 | 단계 | 의미 |
|---|---|---|
| **Severity** | Low / Medium / High | 위반의 결과가 얼마나 나쁜가 |
| **Likelihood** | Unlikely / Probable / Likely | 위반이 실제 취약점으로 이어질 확률 |
| **Remediation Cost** | Low / Medium / High | 고치는 비용 |

세 축을 곱해 *Priority(P1~P27)* 와 *Level(L1~L3)* 가 결정된다.

```
Priority = Severity × Likelihood × (4 - Remediation Cost)

P27 (3 × 3 × 3) = L1 — 최우선 수정
P1  (1 × 1 × 1) = L3 — 여유 있게
```

예시:

| 규칙 | Severity | Likelihood | Remediation | Priority | Level |
|------|---------|-----------|-------------|---------|-------|
| ARR30-C (배열 범위) | High | Likely | Medium | P18 | L1 |
| EXP30-C (sequence point) | Medium | Probable | Medium | P8 | L2 |
| MSC32-C (random seed) | Medium | Unlikely | Medium | P4 | L3 |

L1 규칙(P12~P27)부터 *반드시* 수정한다. L3(P1~P4)는 시간 여유에 따라.

## MISRA C vs CERT C — 핵심 차이

### 1. 강제도 모델

```
MISRA       Mandatory / Required / Advisory
CERT        Rule / Recommendation + Priority(L1~L3)
```

MISRA는 *준수냐 deviation이냐*의 이분법. CERT는 *위험도에 따른 우선순위*. 보안은 *완벽한 준수보다 자원 배분*이 현실적이라는 인식.

### 2. 적용 산업

```
MISRA       자동차·항공·의료·철도 (안전 중요)
CERT        모든 보안 민감 시스템 (서버·IoT·자동차 일부)
```

자동차 ECU 펌웨어는 *MISRA + CERT* 동시 적용이 일반적이다. 서버 사이드 C 코드(데이터베이스, OS 커널 모듈)는 *CERT만* 적용.

### 3. 라이선스·접근

```
MISRA       유료 PDF (£60~£100), 비공개 게시 금지
CERT        SEI 위키 무료, CC BY-SA 라이선스
```

CERT의 무료성은 채택 장벽을 크게 낮춘다. *OpenSSF*, *CWE*, *OWASP*와 자연스럽게 연결된다.

### 4. CWE와의 연결

CERT C의 각 규칙은 *CWE(Common Weakness Enumeration)* 항목에 명시적으로 매핑된다.

```
CERT     CWE                        OWASP
─────    ─────────────────          ─────
ARR30    CWE-119 (Buffer Overflow)  Top 10 — Memory Safety
STR32    CWE-126 (Buffer Over-read) Top 10 — Memory Safety
INT32    CWE-190 (Integer Overflow) Top 10 — Numeric Errors
MEM30    CWE-416 (Use After Free)   Top 10 — Memory Safety
```

NVD CVE 데이터베이스의 *대부분 C 취약점*이 CERT 규칙 위반 하나로 환원된다. 즉 CERT 준수는 *기존 알려진 취약점 패턴 차단*이다.

## 자주 마주치는 카테고리

CERT C의 18개 카테고리 중 임베디드·시스템 관련해서 자주 보이는 셋.

| 코드 | 카테고리 | 항목 수 |
|------|---------|--------|
| PRE | Preprocessor | 13 |
| DCL | Declarations and Initialization | 25 |
| EXP | Expressions | 47 |
| INT | Integers | 31 |
| FLP | Floating Point | 13 |
| ARR | Arrays | 41 |
| STR | Strings | 38 |
| MEM | Memory Management | 36 |
| FIO | File I/O | 47 |
| ENV | Environment | 6 |
| SIG | Signals | 7 |
| ERR | Error Handling | 8 |
| API | Application Programming Interface | 9 |
| CON | Concurrency | 41 |
| MSC | Miscellaneous | 24 |
| POS | POSIX | 54 |
| WIN | Windows | 4 |

본 시리즈는 임베디드·보안 관점에서 가장 관련 깊은 카테고리를 다음 9장에 걸쳐 다룬다.

## 도구 — CERT 검사 지원

| 도구 | CERT 지원 수준 |
|------|---------------|
| Helix QAC | MISRA와 함께 CERT 검사 가능 |
| Polyspace Bug Finder | CERT 전용 검사 모듈 |
| Coverity | CERT mapping 내장 |
| Klocwork | CERT C/C++ 분류 |
| Fortify SCA | 보안 중심, CERT mapping |
| **clang-tidy** | `cert-*` 검사군 무료 제공 |
| **Cppcheck** | `--addon=cert.py` (제한적) |

`clang-tidy`만으로도 *상당수* CERT 규칙을 검출할 수 있다. 무료·CI 통합 쉬움.

```bash
clang-tidy -checks='cert-*' source.c
```

## 시리즈 로드맵

1. **Ch 1 (지금)** — CERT 단체, 철학, MISRA와의 비교, Risk Assessment.
2. **Ch 2** — Preprocessor 규칙(PRE): 매크로, include, 조건부.
3. **Ch 3** — Declarations & Initialization (DCL): 선언 정합성, 초기화.
4. **Ch 4** — Expressions (EXP): sequence point, 평가 순서, sizeof.
5. **Ch 5** — Integers (INT): overflow, wraparound, 부호 변환.
6. **Ch 6** — Floating Point (FLP): NaN, 비교, 변환.
7. **Ch 7** — Arrays & Strings (ARR, STR): 경계, null 종결.
8. **Ch 8** — Memory Management (MEM): alloc/free, 누수, double free.
9. **Ch 9** — I/O, 환경, 시그널 (FIO, ENV, SIG).
10. **Ch 10** — POSIX & Concurrency (POS, CON): 동기화, race condition.

## 정리

- CERT C는 *보안 중심*. MISRA는 *안전 중심*. 함께 적용한다.
- 18 카테고리, 약 300개 규칙·권고.
- Severity × Likelihood × (4 - Remediation Cost) = Priority. L1 우선.
- CWE·CVE에 직접 매핑되어 *기존 취약점 패턴*을 차단.
- 무료 공개(SEI 위키). 도구 지원도 풍부 — clang-tidy `cert-*`로 시작 가능.

## 다음 장 예고

2장은 Preprocessor 카테고리. 매크로 정의·사용, `#include` 정책, 조건부 컴파일에서의 보안 함정을 본다.

## 관련 항목

- [MISRA C Ch 1 — MISRA란](/blog/embedded/automotive/misra-c/chapter01-introduction)
- [SEI CERT C Wiki](https://wiki.sei.cmu.edu/confluence/display/c)
- [CWE 공식](https://cwe.mitre.org/)
- [OWASP Top 10](https://owasp.org/Top10/)
