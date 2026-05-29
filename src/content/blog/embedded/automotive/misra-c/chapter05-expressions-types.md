---
title: "Ch 5: Rules 6~10 — Essential Type Model과 묵시적 변환"
date: 2026-05-18T06:00:00
description: "비트필드(R6), 선언(R8), 초기화(R9), Essential Type Model(R10) — MISRA 2012의 타입 안전성 모델."
tags: [misra, c, essential-type, conversion, signed, unsigned, bitfield]
series: "MISRA C"
seriesOrder: 5
draft: true
---

MISRA C:2012의 가장 큰 기여는 **Essential Type Model**이다. C의 묵시적 변환은 너무 관대해 *부호 손실, 폭 손실, 의미 손상*이 무성하게 발생한다. MISRA는 타입을 8개 범주로 재정의해 *어떤 변환이 안전한지*를 명시한다.

## Essential Type — 8개 범주

| Essential Type | C 타입 예 |
|---|---|
| boolean | `_Bool`, `bool`(C99 stdbool) |
| character | `char`(plain) |
| enum<T> | `enum tag { ... }` (각 enum이 별개 타입) |
| signed | `signed char`, `short`, `int`, `long`, `long long` |
| unsigned | `unsigned char/short/int/long/long long` |
| float | `float`, `double`, `long double` |
| complex | `_Complex` |
| pointer | `T *` |

핵심은 두 가지다.

1. **`char` 자체는 character지 정수가 아니다**. `signed char`나 `unsigned char`가 따로 분리된다.
2. **각 `enum`은 별개 타입**. `enum Color`와 `enum Direction`은 서로 호환되지 않는다.

## R6 — 비트필드

### Rule 6.1 (Required) — 비트필드는 `unsigned int` 또는 `_Bool`만

```c
// 회피 — int는 부호 처리가 구현 정의
struct Flags {
    int valid : 1;       // 위반 — 값이 -1인가 1인가?
};

// Good
struct Flags {
    unsigned int valid : 1;
    _Bool ready : 1;
};
```

### Rule 6.2 (Required) — 1비트 비트필드를 signed로 선언 금지

1비트 signed 필드는 *부호 비트만 가지고 데이터 비트가 없는* 모순적 상태가 된다.

## R7 — 리터럴과 상수

### Rule 7.1 (Required) — 8진수 리터럴 금지 (`0`은 예외)

```c
int x = 017;    // 위반 — 8진수
int x = 15;     // OK
int x = 0;      // OK (특수)
int x = 0xF;    // OK — 16진수는 명시적
```

`017`은 *15*인데 코드를 빠르게 읽다 보면 *17*로 착각하기 쉽다. 권한 비트(`0644`)에서나 의식적으로 쓰지, 일반 코드에서는 사고를 부른다.

### Rule 7.2 (Required) — 정수 리터럴의 부호·폭을 명시

```c
// 회피 — 폭과 부호가 컴파일러에 맡겨짐
int x = 0xFFFF;            // 16비트 int면 -1, 32비트 int면 65535
int y = 1 << 31;           // signed overflow

// Good — 명시적 suffix
unsigned int x = 0xFFFFu;
uint32_t y = 1u << 31;
```

C의 정수 리터럴 타입 결정은 *너무 복잡한 promotion 규칙*을 따른다. suffix(`u`, `l`, `ll`)로 의도를 못 박는다.

### Rule 7.3 (Advisory) — `l`(소문자 엘) 접미사 회피

```c
long x = 100l;    // 위반 — 1과 헷갈림
long x = 100L;    // Good
```

### Rule 7.4 (Required) — 문자열 리터럴은 `const char *`로만

```c
char *s = "hello";        // 위반 — 비-const로 받음, 수정 시 UB
const char *s = "hello";  // Good
```

GCC `-Wwrite-strings`가 같은 검사.

## R8 — 선언과 정의

### Rule 8.1 (Required) — implicit `int` 금지

C99부터 폐지된 *implicit int*. K&R 시대에는 `count;` 같은 선언이 `int count;`로 해석됐지만 현대 컴파일러는 에러.

### Rule 8.2 (Required) — 함수 선언에 매개변수 타입 명시

```c
// 위반 — K&R 스타일
int Foo(a, b)
    int a; int b;
{
    return a + b;
}

// 위반 — empty parameter list (실제로는 unspecified)
int Foo();

// Good — explicit
int Foo(int a, int b);
int Bar(void);          // 인자 없음
```

`int Foo()`는 C89에서 *임의의 인자를 받을 수 있다*고 해석된다(K&R 호환). `void`를 명시해야 *0개 인자*가 된다.

### Rule 8.3 (Required) — 같은 함수의 모든 선언이 호환 타입

```c
// foo.h
int Process(int x);

// foo.c
long Process(int x) { /* ... */ }    // 위반 — 반환 타입 불일치
```

### Rule 8.4 (Required) — 외부 link 객체·함수에 *컴파일 단위 가시* 선언

```c
// foo.c
int counter = 0;       // 정의

// foo.h (없으면 위반)
extern int counter;
```

다른 컴파일 단위에서 쓰려면 *헤더*에 `extern` 선언이 있어야 한다. 이 선언이 같은 컴파일 단위(`foo.c`)에서도 *보이도록* include한다.

### Rule 8.5 (Required) — 외부 객체·함수는 *한 파일에서만* 선언

같은 `extern` 선언을 여러 헤더에 분산하면 *불일치*가 발생할 수 있다. 한 헤더에만 둔다.

### Rule 8.6 (Required) — 외부 link 식별자는 정확히 한 번 정의

```c
// foo.c
int counter = 0;

// bar.c
int counter = 10;   // 위반 — multiple definition
```

링커는 보통 에러를 내지만 *tentative definition*(GCC 기본)에서 침묵으로 합쳐질 수도 있다.

### Rule 8.7 (Advisory) — 한 파일에서만 쓰이는 외부 식별자는 internal로

다른 파일이 안 쓰면 `static`을 붙여 *internal linkage*로.

```c
// 회피 — 외부에 노출됐지만 다른 파일이 안 씀
int helper(int x);

// Good
static int helper(int x);
```

### Rule 8.8 (Required) — `static` 함수는 선언에 `static` 명시

```c
// 위반 — 정의에만 static
static int Helper(int x);
       int Helper(int x) { /* ... */ }   // static 누락

// Good
static int Helper(int x);
static int Helper(int x) { /* ... */ }
```

### Rule 8.9 (Advisory) — 외부 객체는 *가능한 블록 스코프 안에서* 정의

쓰는 곳에 가까이 두라.

### Rule 8.10 (Required) — `inline` 함수는 `static`이거나 정의가 단일

C99의 inline 의미론은 복잡하다. *external inline* 함수는 한 정의만 있어야 한다.

### Rule 8.11~8.14 — 배열, function pointer 등 추가 형식 규칙

세부 규칙. 흔히 위반되지 않으므로 도구 검출에 맡긴다.

## R9 — 초기화

### Rule 9.1 (Mandatory) — 자동 변수는 사용 전 초기화

이 책에서 가장 강력한 규칙 중 하나. *Mandatory* — deviation 불가.

```c
int x;
int y = x + 1;       // 위반 — x 미초기화

int x;
if (cond) x = 5;
y = x;               // 위반 — cond false일 때 미초기화 경로
```

GCC `-Wuninitialized`, Clang `-Wsometimes-uninitialized`가 같은 검사를 한다. 다만 *런타임 경로*까지 추적하는 도구(Polyspace, Coverity)는 더 정확하다.

### Rule 9.2 (Required) — 중괄호 초기화 일관성

```c
int arr[3][2] = {1, 2, 3, 4, 5, 6};        // 위반 — 평면
int arr[3][2] = {{1,2}, {3,4}, {5,6}};     // Good
```

### Rule 9.3 (Required) — `[...]`와 같은 designated initializer 분명히

C99 designator는 안전. *순차*에서 *명시적*으로 바뀌면 일관성 깨질 수 있음.

### Rule 9.4 (Required) — 같은 원소를 두 번 초기화 금지

```c
int arr[3] = {[0]=1, [1]=2, [0]=3};   // 위반 — [0] 두 번
```

### Rule 9.5 (Required) — flexible array는 한 객체로만

C99의 *flexible array member*는 동적 할당과 함께 쓰일 때만 안전.

## R10 — Essential Type Model

R10은 MISRA의 *핵심*이다. 묵시적·명시적 변환을 *essential type 사이의 변환*으로 본다.

### Rule 10.1 (Required) — 부적합한 essential type에 연산 금지

```c
// 회피
int x = 5;
_Bool b = 1;
int y = x + b;    // 위반 — signed + boolean
_Bool c = b * 2;  // 위반 — boolean * signed

// Good
int y = x + (int)b;   // 명시적 변환 + 의도 표시
```

연산자별로 허용되는 essential type 조합이 표로 정의돼 있다. `+`, `-`, `*`, `/`은 signed/unsigned/float만. `&&`, `||`은 boolean만. `<<`, `>>`은 unsigned만.

### Rule 10.2 (Required) — 표현식의 essential type이 일관

```c
char c = 'a';
char d = c + 1;       // 위반 — character + signed → 일관 X

unsigned char b = 5;
unsigned char c = b + 1u;   // OK
```

`'a' + 1`은 *문자에 정수를 더하는* 의도라 character 타입이 적절하지 않다. 묵시 변환으로 동작은 하지만 *MISRA는 명시적 의도를 요구*한다.

### Rule 10.3 (Required) — 묵시적 변환이 *좁은 타입으로* 금지

```c
uint32_t x = 1000000;
uint16_t y = x;        // 위반 — 32→16, 잘림 가능

int32_t a = -1;
uint32_t b = a;        // 위반 — signed→unsigned, 값 의미 변화
```

명시적 캐스트로 *의도*를 표시.

```c
uint16_t y = (uint16_t)x;     // OK — 의도적 절단
```

### Rule 10.4 (Required) — 산술 연산의 양쪽이 같은 essential type

```c
uint16_t a = 100;
uint32_t b = 1000;
uint32_t c = a + b;    // 위반 — uint16 + uint32

uint32_t c = (uint32_t)a + b;   // Good
```

C의 *integer promotion*이 묵시적으로 처리하지만 MISRA는 *명시*를 요구한다.

### Rule 10.5 (Advisory) — 캐스트는 호환되는 essential type 사이만

```c
_Bool b = 1;
int x = (int)b;       // OK — boolean → signed
char c = (char)b;     // 위반 — boolean → character

enum Color col = RED;
int x = (int)col;     // OK — enum → signed (사실은 underlying type)
```

### Rule 10.6 (Required) — 더 *넓은* 타입에 할당할 때도 명시

```c
uint16_t a = 100;
uint32_t b = a;       // 위반 — 묵시적 확장도 명시 요구

uint32_t b = (uint32_t)a;   // Good
```

이 규칙이 가장 *번거롭다*. 모든 정수 할당에 캐스트를 박아야 한다. 일부 프로젝트는 Advisory로 격하해 운용한다.

### Rule 10.7 (Required) — 묵시적 변환 후 더 좁은 타입으로 *역변환* 금지

복잡한 promotion 규칙이 *내부에서 일어났다가 되돌아오는* 경우 검출.

```c
uint16_t a = 0xFFFF;
uint16_t b = a + 1;       // 위반 — a+1 은 int(promotion), 다시 uint16
                          // 16비트 환경에서 의도와 다르게 동작 가능

uint16_t b = (uint16_t)(a + 1);   // 명시
```

### Rule 10.8 (Required) — 복합 표현식 결과의 cast는 그 표현식 타입과 호환

### Essential Type Model — 한눈 표

| 연산자 | 허용 타입 |
|---|---|
| `+`, `-`, `*`, `/`, `%` | signed, unsigned, float |
| `<<`, `>>` | unsigned (피연산자 양쪽) |
| `&`, `\|`, `^`, `~` | unsigned, enum |
| `&&`, `\|\|`, `!` | boolean |
| `==`, `!=` | 같은 essential type |
| `<`, `>`, `<=`, `>=` | signed, unsigned, character, float, enum (양쪽 같은 분류) |

MISRA 문서의 부록 표에 *공식 매트릭스*가 있다. 도구가 이를 그대로 검사한다.

## 흔한 위반 예 — 종합

```c
// 위반 폭탄 — MISRA 관점에서 거의 모든 줄이 의심됨
int main(void) {
    char a = 'A';
    int b = 1;
    int c = a + b;                  // R10.2 — character + signed
    if (a) { /* ... */ }            // R10.1 — character as boolean

    unsigned int x = 100;
    int y = -1;
    if (x > y) { /* ... */ }        // R10.4 — unsigned vs signed
    int z = x;                      // R10.3 — implicit narrowing

    return 0;
}
```

## 정리

- Essential Type Model은 C 타입을 8개로 재분류해 *변환의 안전성*을 따진다.
- `char`는 character지 signed/unsigned가 아니다. 정수 연산에 쓰지 마라.
- 각 `enum`은 별개 타입. 비교·연산에 다른 enum과 섞지 마라.
- 묵시적 변환은 *좁은 → 넓은*도 명시(R10.6) 요구. 가장 번거로우나 *침묵 버그를 차단*하는 핵심.
- Rule 9.1(미초기화 자동 변수)은 Mandatory — 절대 위반 불가.

## 다음 장 예고

6장은 R11과 R18 — 포인터 변환과 배열·포인터 산술이다. `void *`, 함수 포인터, NULL, 가변 길이 배열까지.

## 관련 항목

- [Ch 4 — R1~R5 구문·식별자](/blog/embedded/automotive/misra-c/chapter04-syntax-format)
- [Ch 6 — 포인터·배열](/blog/embedded/automotive/misra-c/chapter06-pointers-arrays)
