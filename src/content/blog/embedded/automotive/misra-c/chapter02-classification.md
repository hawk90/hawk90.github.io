---
title: "Ch 2: 분류 체계 — Directive / Rule / Mandatory / Required / Advisory"
date: 2026-05-18T03:00:00
description: "MISRA의 4축 분류: 적용 대상(Directive/Rule), 강제도(Mandatory/Required/Advisory), 결정성(Decidable/Undecidable), Deviation 절차."
tags: [misra, c, classification, deviation, decidable, advisory]
series: "MISRA C"
seriesOrder: 2
draft: true
---

MISRA C:2012는 159개 항목을 4개 축으로 분류한다. 분류를 모르면 위반 리포트를 어떻게 처리해야 할지 판단할 수 없다.

| 축 | 값 | 의미 |
|---|---|---|
| **적용 대상** | Directive / Rule | 도구가 자동 검증할 수 있는가 |
| **강제도** | Mandatory / Required / Advisory | 위반 허용 여부 |
| **결정성** | Decidable / Undecidable | 정적 분석으로 100% 판정 가능한가 |
| **범위** | Single Translation Unit / System | 한 파일 안에서 vs 링크 후 |

## Directive vs Rule

### Directive — 도구가 보지 못하는 영역

Directive(지침)는 *프로세스·문서·환경*에 관한 요구다. 정적 분석기가 소스 한 줄을 보고 자동으로 판정할 수 없다.

| 번호 | 내용 |
|---|---|
| Dir 1.1 | 구현 정의 동작(implementation-defined behavior)은 모두 문서화돼야 한다. |
| Dir 2.1 | 소스 파일은 컴파일 시 어떤 위반도 일으키지 않아야 한다. |
| Dir 3.1 | 요구사항과 소스 코드 사이에 추적성이 있어야 한다. |
| Dir 4.6 | 기본 타입(`int`, `char`) 대신 폭이 명시된 타입(`int32_t`)을 사용한다. |
| Dir 4.10 | 헤더 파일에 include guard가 있어야 한다. |
| Dir 4.13 | 자원을 점유하는 함수는 짝을 맞춰 호출해야 한다(`open`/`close`). |

Dir 3.1("추적성")처럼 *프로젝트 관리 도구의 메타데이터*가 있어야 검증 가능한 항목도 있다. Dir 4.10("include guard")은 어찌 보면 자동 검사 가능 같지만 *모든 헤더*를 대상으로 일관된 정책을 요구하므로 Directive로 분류된다.

### Rule — 도구가 자동 판정

Rule(규칙)은 소스 텍스트만으로 판정 가능한 코드 차원의 제약이다. 정적 분석기는 거의 모든 Rule을 자동 검사한다.

| 번호 | 내용 |
|---|---|
| Rule 8.1 | 함수 선언에 타입이 명시돼야 한다(implicit int 금지). |
| Rule 10.1 | essential type이 부합하지 않는 피연산자에 연산을 적용하지 않는다. |
| Rule 14.4 | switch의 `case` 라벨은 정수 상수여야 한다. |
| Rule 17.2 | 재귀 함수는 직접/간접으로 자기 자신을 호출하지 않아야 한다. |
| Rule 21.3 | `malloc/calloc/realloc/free`는 사용하지 않는다. |

## Mandatory / Required / Advisory

강제도가 진짜 의미를 가지는 축이다. 인증·deviation 정책이 여기서 갈린다.

### Mandatory — 절대 위반 불가

위반하면 *어떤 정당화로도 통과시키지 않는다*. Deviation 신청 자체가 불가능하다.

```c
// Rule 9.1 (Mandatory): 자동 변수의 값은 사용 전 반드시 초기화
int x;
foo(x);        // 위반 — 정당화 불가, 코드 수정 필수

// Rule 13.6 (Mandatory): sizeof의 피연산자는 부작용이 없어야 한다
size_t n = sizeof(i++);   // 위반 — Mandatory
```

Mandatory는 *위반이 곧 정의되지 않은 동작 또는 표준 위반*인 경우에 부여된다. 2012판에 약 10개 정도뿐이다.

### Required — 원칙적으로 위반 불가, 정당화 시 deviation 가능

대부분의 Rule이 Required다. 위반하려면 **deviation 보고서**를 작성해 *왜 위반해야 하는지*, *대안은 무엇이었는지*, *위험을 어떻게 완화하는지*를 문서로 남기고 책임자가 서명한다.

```c
// Rule 21.3 (Required): 동적 메모리 사용 금지
void *p = malloc(1024);   // 위반

// Deviation 가능한 경우 — 예시 정당화
//   "이 모듈은 부팅 단계에서 한 번만 호출되며,
//    malloc 후 free 없이 정적 풀에 유지된다.
//    런타임 메모리 단편화 위험 없음. ASIL B 적용 가능."
```

Required 위반은 인증 보고서에 *모두 나열*돼야 한다. 한 모듈에 deviation이 수십 개 누적되면 ISO 26262 심사에서 빨간불이 켜진다.

### Advisory — 권고

위반해도 deviation 보고서가 필요하지 않다. 일반적으로 *좋은 관행이지만 예외도 흔한* 경우에 부여된다.

```c
// Rule 15.5 (Advisory): 함수는 단일 종료점을 가져야 한다
int Lookup(int key) {
    if (key < 0) return -1;   // Advisory 위반, 정당화 없이도 OK
    /* ... */
    return result;
}
```

프로젝트가 Advisory를 *자체적으로 Required로 격상*할 수도 있다. 이는 프로젝트의 *coding standard guide*에 명시한다.

## Decidable vs Undecidable

도구가 100% 정확히 판정할 수 있느냐의 문제다. *Halting Problem* 때문에 결정 불가능한 규칙이 존재한다.

### Decidable — 도구가 정확히 판정

문법적·구조적 검사가 충분하다.

```c
// Rule 4.1 (Decidable): octal 상수는 사용하지 않는다(0 자체는 제외)
int x = 017;   // 즉시 검출
```

### Undecidable — 도구가 정확히 판정 불가

런타임 값에 의존하는 규칙은 본질적으로 미결정이다.

```c
// Rule 18.1 (Undecidable): 포인터 산술이 배열 범위를 벗어나지 않을 것
void Process(int *p, size_t n) {
    for (size_t i = 0; i <= n; i++) {
        p[i] = 0;     // i == n에서 위반 — 도구가 항상 잡지 못함
    }
}
```

이때 도구는 *false positive*(실제로는 안전한데 경고)를 보이거나 *false negative*(위반인데 놓침)를 낼 수밖에 없다. Undecidable 규칙에서 검출되지 않은 위반은 *코드 리뷰와 테스트로 보완*해야 한다.

## Single Translation Unit vs System

### Single Translation Unit

한 `.c` 파일과 `#include`된 헤더만 보고 판정 가능. 분석기가 파일 단위로 돌면 충분.

### System

링크 단위 전체를 봐야 판정 가능. 예: 같은 외부 식별자가 여러 파일에서 *호환되지 않는 타입*으로 선언됐는지(Rule 8.4).

```c
// foo.c
extern int Counter;

// bar.c
extern long Counter;   // Rule 8.4 위반 — system-level
```

이런 규칙은 *전체 프로젝트 일괄 분석*이 필요하다. 분석기를 CI에 통합할 때 *증분 모드만으로는 잡히지 않는다*는 점이 함정이다.

## Deviation 절차

Required 규칙을 위반하려면 정해진 절차를 따른다.

### 1. Deviation Permit

조직 차원에서 "이 규칙은 다음 조건에서 위반을 허용한다"고 미리 정의한 문서. 예:

```
Permit-001
규칙: Rule 21.3 (동적 메모리 사용 금지)
허용 조건:
  - 부팅 시 한 번만 호출되는 초기화 함수 안
  - 할당된 메모리는 시스템 종료까지 해제되지 않음
  - 단편화 분석이 코드 리뷰에 포함됨
승인자: Safety Manager
유효 기간: 2026-12-31까지
```

### 2. Deviation Record

각 위반 인스턴스에 대해 작성하는 보고서.

```
위반 위치: drivers/can.c:142
규칙: Rule 17.7 (return 값을 무시하면 안 됨)
정당화: send_message()의 실패는 상위 레이어 watchdog이 감지한다.
       이 함수의 반환값을 검사하면 같은 에러를 두 번 처리하게 된다.
완화: watchdog 타임아웃 테스트 케이스 TC-CAN-042 추가.
승인: Module Owner, Safety Manager
연결된 Permit: 없음 (case-by-case)
```

### 3. 추적

Deviation은 *코드 안에도 표시*해 리뷰어가 즉시 찾을 수 있게 한다.

```c
/* MISRA 17.7 deviation — DR-CAN-007.
 * 반환값은 watchdog이 모니터링한다. */
(void) send_message(&msg);
```

이 주석 형식은 도구가 인식하는 *suppression 마커*가 되기도 한다. PC-lint Plus, Polyspace, Cppcheck 모두 자체 문법을 가진다.

## 분류표 — 한눈에

| 항목 | 적용 대상 | 강제도 | 결정성 | 범위 | Deviation |
|------|-----------|--------|--------|------|-----------|
| Dir 4.6 | Directive | Required | — | System | 가능 |
| Rule 9.1 | Rule | Mandatory | Undecidable | TU | **불가** |
| Rule 17.2 | Rule | Required | Decidable | System | 가능 |
| Rule 21.3 | Rule | Required | Decidable | TU | 가능 |
| Rule 15.5 | Rule | Advisory | Decidable | TU | 불필요 |

## 정리

- 4축 분류: Directive/Rule, Mandatory/Required/Advisory, Decidable/Undecidable, TU/System.
- Mandatory는 deviation 불가. Required는 정당화 시 가능. Advisory는 권고.
- Undecidable 규칙은 도구가 완벽히 잡지 못한다 — 리뷰·테스트가 보완해야 한다.
- System-level 규칙은 *전체 프로젝트 일괄 분석*이 필요하다.
- Deviation은 Permit(사전) + Record(인스턴스별) + 코드 주석 표시로 추적된다.

## 다음 장 예고

3장은 Directive D1~D4를 본다. 환경, 외부 코드 통합, 코드 표현, 언어 사용 — 도구로 잡히지 않는 *프로세스 차원의 규칙*이다.

## 관련 항목

- [Ch 1 — MISRA란 무엇이고 왜 생겼는가](/blog/embedded/automotive/misra-c/chapter01-introduction)
- [Ch 3 — Directives 깊게 보기](/blog/embedded/automotive/misra-c/chapter03-directives)
