---
title: "Ch 4: Rules 1~5 — 표준 준수, 미사용 코드, 주석, 문자집합, 식별자"
date: 2026-05-18T05:00:00
description: "환경(R1), 미사용·도달불가(R2), 주석(R3), 문자·키워드(R4), 식별자 고유성(R5) — Rule 본문의 첫 다섯 그룹."
tags: [misra, c, identifiers, unused-code, comments, ambiguity]
series: "MISRA C"
seriesOrder: 4
draft: false
---

이 장부터 MISRA Rule 본문에 들어간다. R1~R5는 "코드의 표면"에 해당하는 규칙들 — 어떤 C 환경을 가정하느냐, 죽은 코드가 있느냐, 식별자가 충돌하지 않느냐. 분석기가 *가장 잘 잡는* 영역이기도 하다.

## R1 — C 언어 환경

### Rule 1.1 (Required) — 컴파일러 한계 준수

표준은 *최소 구현 한계*만 보장한다. C99의 5.2.4.1에 정의된 한계는 다음과 같다.

```
- 함수 인자 최대 127개
- if/switch/while 중첩 최대 127단계
- 외부 식별자 최대 4095개
- 매크로 정의 최대 4095개
- 문자열 리터럴 길이 최대 4095자
```

상용 컴파일러는 보통 훨씬 너그럽지만 *최소 한계*를 넘는 코드는 portable하지 않다. 한 모듈에 인자 200개 함수가 있다면 다른 컴파일러로 옮길 때 깨질 수 있다.

```c
// 위반 가능 — 인자 130개
void Configure(int p1, int p2, /* ... */ int p130);

// Good — 구조체로 묶기
typedef struct {
    int control;
    int baudrate;
    /* ... */
} uart_config_t;
void Configure(const uart_config_t *cfg);
```

### Rule 1.2 (Advisory) — 언어 확장 금지

GCC `__attribute__`, Clang `__has_feature`, Microsoft `__declspec` 같은 확장은 *원칙적으로* 사용 금지. 사용해야 한다면 매크로로 격리.

```c
// 회피 — 코드 전반에 확장 노출
__attribute__((packed)) struct Frame { /* ... */ };
void __attribute__((interrupt)) ISR_Uart(void);

// Good — 매크로로 캡슐화
#if defined(__GNUC__)
#  define PACKED       __attribute__((packed))
#  define INTERRUPT    __attribute__((interrupt))
#else
#  define PACKED
#  define INTERRUPT
#endif

PACKED struct Frame { /* ... */ };
INTERRUPT void ISR_Uart(void);
```

### Rule 1.3 (Required) — 정의되지 않은 동작·미명시 동작이 없어야

UB·unspecified가 발생하면 위반이다. 다수의 더 구체적인 Rule이 이 큰 항목을 *세분화*한다(R10, R12, R13, R18 등).

## R2 — 미사용·도달 불가 코드

### Rule 2.1 (Required) — 도달 불가 코드 없음

```c
int Process(int x) {
    if (x > 0) {
        return 1;
    } else {
        return -1;
    }
    return 0;          // 위반 — 도달 불가
}

void Foo(void) {
    return;
    DoCleanup();        // 위반 — return 뒤
}
```

`switch`의 *fallthrough 마지막 default*에 `break`가 있으면 도달 불가지만 *방어적 코딩*으로 허용된다.

### Rule 2.2 (Required) — 죽은 코드 없음

실행되긴 하지만 *효과가 없는* 코드. 정적 분석기가 가장 흔히 잡는 위반 중 하나.

```c
int x = 0;
x = 5;
x = 10;           // 5 할당이 죽은 코드

a + b;            // 결과를 쓰지 않는 표현식 — 죽은 코드
```

`(void) a + b;`처럼 *명시적으로 캐스트*해도 위반이다.

### Rule 2.3, 2.4 (Advisory) — 미사용 타입·태그

`typedef`와 `struct tag`가 *어디서도 참조되지 않으면* 죽은 선언이다.

```c
// 위반 — TempType이 어디서도 사용되지 않음
typedef int TempType;

struct UnusedStruct { int x; };   // 어디서도 참조 안 됨
```

### Rule 2.5 (Advisory) — 미사용 매크로

`#define`해 놓고 안 쓰면 위반. 분석기는 *전체 빌드*를 봐야 결정한다.

```c
#define FOO_BAR 42       // 위반 — 어디서도 안 씀
```

매크로는 컴파일 단위 경계를 넘으므로 *system-level* 분석이 필요하다.

### Rule 2.6 (Advisory) — 미사용 label

```c
int Foo(void) {
    cleanup:                  // 위반 — 아래에서 goto cleanup 호출이 없음
    return 0;
}
```

### Rule 2.7 (Advisory) — 미사용 매개변수

```c
int Callback(int x, int unused) {     // unused 미사용 — 위반
    return x * 2;
}
```

회피 방법은 `(void)unused;` 또는 GCC `__attribute__((unused))`. C23부터는 매개변수 이름 생략(`int Callback(int x, int)`) 가능.

## R3 — 주석

### Rule 3.1 (Required) — `/* */` 안에 `/*` 금지

다음은 컴파일러마다 다르게 해석될 수 있다.

```c
/* outer /* inner */ rest of comment */    // 위반
```

표준 C는 *주석이 중첩되지 않는다*. 위 코드에서 `rest of comment */`가 코드로 해석되어 컴파일 에러가 난다. 위반이 *런타임 버그*로 이어지지는 않지만 *읽는 사람을 헷갈리게* 한다.

### Rule 3.2 (Required) — 줄 이어 붙임 `\`이 `//` 안에 없을 것

```c
// 이 주석은 다음 줄로 이어집니다 \
int x = 5;        // 위반 — x = 5가 주석으로 흡수됨
```

이건 실제로 발생하면 *코드가 실행되지 않는* 침묵하는 버그다. C99의 `//` 한 줄 주석이 *행 이어 붙임 처리 이전*에 끝나지 않기 때문.

## R4 — 문자집합과 어휘

### Rule 4.1 (Required) — Octal 이스케이프 시퀀스 모호성 회피

```c
char s[] = "\1234";    // \123 이후 '4'? 또는 \1234? 컴파일러 따름
```

명시적으로 `"\123" "4"`처럼 *문자열 연결*로 끊거나, 16진수 `"\x53""4"`를 쓴다.

### Rule 4.2 (Advisory) — Trigraph 사용 금지

C99까지 존재하던 trigraph(`??=` → `#`, `??(` → `[`, etc.)는 *너무 헷갈린다*. C23은 폐지했다.

```c
// 위반 — Trigraph
// What time is it????
```

마지막 `????`가 한국에서 만난 7-bit 문자집합의 잔재인데, GCC는 `-trigraphs` 옵션 없이는 무시한다.

### Rule 4.3 (Required) — Assembly는 격리

(D4.3과 같은 정신, 여기서는 Rule로 강제)

```c
// 회피
int Foo(void) {
    int x;
    __asm__("mov %0, #5" : "=r"(x));     // 일반 함수 안 inline asm
    return x;
}

// Good
static inline int cpu_read_register(void) {
    int x;
    __asm__("mov %0, #5" : "=r"(x));
    return x;
}
```

## R5 — 식별자

### Rule 5.1 (Required) — 외부 식별자 31자 이내 고유

C99는 외부 식별자(extern)는 *처음 31자만 의미 있다*고 정의한다.

```c
// 위반 — 31자 이상이 같으면 같은 식별자
extern int can_message_receive_timeout_handler_for_node_A;
extern int can_message_receive_timeout_handler_for_node_B;
```

위 두 식별자의 처음 31자는 `can_message_receive_timeout_h`로 같다. 일부 링커는 같은 심볼로 보고 *조용히 합친다*. 디버깅 악몽.

### Rule 5.2 (Required) — 같은 스코프 내 식별자 63자 이내 고유

내부 식별자도 같은 원칙. C99는 *63자*까지 보장한다.

### Rule 5.3 (Required) — 외부 스코프 식별자가 내부에 가려지지 않을 것

```c
int counter = 0;        // 글로벌

void Foo(void) {
    int counter = 5;    // 위반 — 글로벌 counter를 가림
    counter++;
}
```

쉬도잉(shadowing) 금지. GCC `-Wshadow`로도 같은 검사를 한다.

### Rule 5.4 (Required) — 매크로 이름은 다른 식별자와 충돌 금지

```c
#define BUFFER_SIZE 256
int BUFFER_SIZE = 512;       // 위반 — 매크로 이름과 충돌
```

매크로는 *전처리 단계*에서 토큰 치환되므로 변수 선언 직전에 `int 256 = 512;`로 변하는 모양이다.

### Rule 5.5 (Required) — 매크로 이름이 다른 매크로 이름과 충돌 금지

```c
#define MAX 100
#define max(a, b) ((a) > (b) ? (a) : (b))   // OK — case-sensitive

#define COLOR red
#define color blue            // 위반 — case 차이뿐인 매크로 이름 충돌

#define COLOR_RED   1
#define COLOR_RED   2         // 위반 — 같은 이름 재정의
```

### Rule 5.6, 5.7 (Required) — `typedef` 이름, `struct/union` 태그는 고유

```c
typedef int Counter;
typedef long Counter;         // 위반 — typedef 이름 중복

struct Item { int id; };
union  Item { int x; };       // 위반 — struct/union 같은 태그
```

### Rule 5.8 (Required) — 외부 link 식별자는 *전체 프로젝트*에서 고유

System-level 규칙. 다른 `.c` 파일에서 같은 이름의 외부 변수를 다르게 선언하면 위반.

```c
// foo.c
int Counter;       // tentative definition

// bar.c
int Counter;       // 위반 — 다른 컴파일 단위에서 같은 외부 이름
```

`static` 키워드를 붙이면 *internal linkage*가 되어 충돌하지 않는다.

### Rule 5.9 (Advisory) — 내부 link 식별자 이름도 고유

```c
// foo.c
static int counter = 0;

// bar.c
static int counter = 0;    // 위반 (Advisory) — 같은 이름의 internal 식별자
```

내부 식별자라도 *디버깅·검색·리뷰* 시 헷갈리므로 이름을 다르게 한다.

## 자주 위반되는 Rule

실제 프로젝트 통계에서 빈도 높은 위반은 다음.

| Rule | 위반 빈도 | 흔한 원인 |
|------|----------|----------|
| 2.4 (미사용 typedef) | 상위 | 라이브러리에서 가져온 후 안 씀 |
| 2.7 (미사용 매개변수) | 상위 | 콜백 시그니처에 인자 강제 |
| 5.3 (shadowing) | 중간 | 변수 이름 짧게 짓는 습관 |
| 5.5 (매크로 충돌) | 중간 | 헤더 include 순서 의존 |
| 5.8 (외부 이름 중복) | 낮음 | 큰 프로젝트 통합 시 |

## 정리

- R1은 *컴파일러·환경*에 대한 가정. 이식성을 위해 한계와 확장을 통제.
- R2는 *죽은 코드·미사용*. 분석기가 가장 잘 잡는 영역.
- R3는 *주석*. 중첩과 줄 이어 붙임에서 침묵 버그 위험.
- R4는 *문자집합·키워드*. Octal, trigraph, asm 격리.
- R5는 *식별자 고유성*. 31자/63자 한계, shadowing, 매크로 충돌.

## 다음 장 예고

5장은 R6~R10. 비트필드, 리터럴, 그리고 MISRA 2012의 핵심 도구인 **Essential Type Model**과 묵시적 변환 규칙을 본다.

## 관련 항목

- [Ch 3 — Directives](/blog/embedded/automotive/misra-c/chapter03-directives)
- [Ch 5 — Essential Type Model](/blog/embedded/automotive/misra-c/chapter05-expressions-types)
