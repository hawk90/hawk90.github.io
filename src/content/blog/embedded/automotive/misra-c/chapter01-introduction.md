---
title: "Ch 1: MISRA란 무엇이고 왜 생겼는가"
date: 2025-09-05T02:00:00
description: "MISRA 단체의 배경, 자동차 산업의 요구, 1998/2004/2012 세 판의 진화, ISO 26262와의 관계."
tags: [misra, c, safety, iso-26262, automotive, standards]
series: "MISRA C"
seriesOrder: 1
draft: false
---

MISRA(Motor Industry Software Reliability Association)는 1990년대 초 영국 자동차 산업이 만든 컨소시엄이다. 자동차에 ECU가 늘면서 *C로 작성된 펌웨어가 차량 안전을 좌우*하기 시작했고, 누구든 따라 쓸 수 있는 "안전한 C 부분집합"이 필요해졌다. 그 결과물이 1998년의 **MISRA C:1998**이다.

## 왜 표준 C가 아니라 부분집합인가

C 언어 표준(ISO/IEC 9899)은 *동작*을 정의하지만 *안전*을 보장하지는 않는다. 더 정확히는 C 표준 안에 세 종류의 회색지대가 있다.

| 분류 | 의미 | 예 |
|------|------|-----|
| Undefined behavior | 컴파일러가 무엇을 해도 됨 | signed overflow, NULL deref, 배열 범위 초과 |
| Unspecified behavior | 여러 선택지 중 하나, 문서화 불요 | 함수 인자 평가 순서 |
| Implementation-defined | 구현마다 다르지만 문서화 필요 | `int`의 비트 폭, 우측 시프트의 부호 처리 |

펌웨어가 한 차량에서 동작했다고 다른 ECU에서도 같은 결과가 나오는 것은 아니다. C는 *이식성*을 보장하지 않는다. MISRA는 이 회색지대를 "쓰지 마라"고 잘라내서 *결정 가능한 C 부분집합*을 만든다.

```c
// 표준 C로는 합법, MISRA로는 위반
int a = INT_MAX;
int b = a + 1;                  // undefined behavior (R1.3)

unsigned int u = 0xFFFF;
int s = (int) u;                // implementation-defined (R10.3)

char *p = NULL;
*p = 0;                         // undefined behavior (R1.3, R18.x)
```

## 1998 → 2004 → 2012의 진화

세 판 모두 *같은 철학*을 유지하지만 강조점과 모델이 다르다.

| 판 | 발행 | 규칙 수 | 특징 |
|----|------|---------|------|
| MISRA C:1998 | 1998 | 127 | 첫 발행. Required/Advisory만. 자동차 한정. |
| MISRA C:2004 | 2004 | 141 | 항공·의료로 확장. 규칙 재분류. |
| MISRA C:2012 | 2012 | 143 + Directive 16 | **Essential Type Model** 도입. C99 지원. Mandatory 신설. Amendment 1/2/3/4로 C11·C18 흡수. |

현장에서는 거의 모두 **2012판 + 최신 Amendment**를 쓴다. 이 시리즈도 2012판을 기준으로 한다. 두 가지 큰 차이를 짚자면.

- **Rule vs Directive**. 2012판은 *분석기가 자동으로 검증 가능한 규칙*(Rule)과 *프로세스·문서에 의존하는 지침*(Directive)을 분리했다. 1998/2004에서는 모두 "Rule"이라 불렀다.
- **Essential Type Model**. C의 타입 시스템을 8개 essential type(boolean, character, signed, unsigned, enum, float, complex, pointer)으로 재모델링한다. *묵시적 변환* 판단의 근거가 된다.

## ISO 26262 / IEC 61508과의 관계

MISRA는 그 자체로 "인증"을 주지 않는다. 인증은 **안전 표준(safety standard)** 이 준다.

```
IEC 61508 (1998)          ┐
   │ (functional safety의 모표준)
   ├── ISO 26262 (자동차, 2011/2018)
   ├── DO-178C (항공, 2011)
   ├── IEC 62304 (의료 SW, 2006)
   └── EN 50128 (철도, 2011)
```

이 안전 표준들은 모두 "*코딩 가이드라인을 따라야 한다*"고만 명시하고, 구체적인 가이드라인은 산업이 자율적으로 정한다. 자동차 분야에서 사실상 표준이 된 것이 MISRA C(C 코드)와 MISRA C++/AUTOSAR C++(C++ 코드)이다.

예컨대 ISO 26262 Part 6 (소프트웨어 개발)의 Table 1은 "사용 가능한 언어 부분집합"을 *highly recommended* 또는 *recommended* 로 요구한다. MISRA C 적용은 이 요건을 충족하는 가장 흔한 방법이다.

## ASIL과 규칙 강도

ISO 26262는 위험도에 따라 **ASIL A < B < C < D**(D가 최고 수준)로 등급을 매긴다. 각 ASIL은 MISRA 규칙 준수의 *엄격도*에 영향을 미친다.

- ASIL A/B — MISRA 위반에 비교적 관대(deviation 가능).
- ASIL C/D — Mandatory 위반 불허, Required 위반은 강력한 정당화·문서화·툴 증거 필요.

브레이크 ECU(ASIL D)와 인포테인먼트(ASIL A)에 같은 *수준*으로 적용하지 않는다. *어디까지 deviation을 허용할 것인지*가 프로젝트마다 달라진다.

## MISRA C를 쓰는 산업

자동차 외에도 폭넓게 채택된다.

- **자동차** — Bosch, Continental, ZF, Toyota, Tesla 등 사실상 모든 Tier-1.
- **항공우주** — DO-178C 보조 자료. AUTOSAR Adaptive 부근 EV/UAM 코드.
- **의료기기** — IEC 62304 SW 보조. 인공심박조율기, 인공호흡기 펌웨어.
- **철도** — EN 50128 코딩 표준 후보. 신호 제어 SW.
- **산업 자동화** — IEC 61508 일반 안전. 발전소·플랜트 PLC 펌웨어.

## 시리즈 로드맵

이 시리즈는 MISRA C:2012(+ Amendment 4)를 정본으로 다음 순서로 정리한다.

1. **Ch 1 (지금)** — 단체·동기·진화·안전 표준과의 관계.
2. **Ch 2** — 분류 체계: Directive vs Rule, Mandatory/Required/Advisory, Decidable/Undecidable, Deviation 절차.
3. **Ch 3** — Directives D1-D4: 컴파일 환경, 외부 코드, 코드 표현, 언어 사용.
4. **Ch 4** — 구문·형식 Rules: 표준 준수, 사용·미사용, 주석, 식별자(R1-R5).
5. **Ch 5** — 표현식·타입 Rules: Essential Type Model, 변환 규칙(R6-R10).
6. **Ch 6** — 포인터·배열: 포인터 변환, 함수 포인터, 가변 길이 배열(R11, R18).
7. **Ch 7** — 제어흐름: for/while/switch/goto(R14-R16).
8. **Ch 8** — 함수: 가변인자, 재귀, 리턴, 매개변수(R17).
9. **Ch 9** — 표준 라이브러리·동적 메모리: malloc, signal, setjmp(R21-R22).
10. **Ch 10** — 정적 분석 도구, 인증 보고서, 실전 적용.

## 정리

- MISRA C는 C 표준의 회색지대를 잘라 *결정 가능한 부분집합*을 만든다.
- 1998 → 2004 → 2012 + Amendment로 진화. 현재 2012가 사실상 표준.
- MISRA 자체는 인증이 아니다 — ISO 26262 / IEC 62304 같은 *안전 표준* 안에서 코딩 가이드라인 요건을 채워 주는 도구다.
- ASIL 등급이 높을수록 deviation 허용 폭이 좁아진다.
- 자동차를 넘어 의료·항공·철도·산업 자동화까지 적용된다.

## 다음 장 예고

2장에서는 Directive와 Rule의 차이, Mandatory/Required/Advisory 분류, deviation 절차를 본다. 규칙 본문에 들어가기 전 *분류 체계*를 정확히 이해해야 다음 장부터 혼동이 없다.

## 관련 항목

- [CERT C Ch 1 — MISRA와의 차이](/blog/embedded/automotive/cert-c/chapter01-intro-vs-misra)
- [AUTOSAR C++ Ch 1](/blog/embedded/automotive/autosar-cpp/chapter01-intro)
- [ISO 26262 Part 6 — Product development at the software level](https://www.iso.org/standard/68388.html)
- [MISRA 공식 — misra.org.uk](https://misra.org.uk/)
