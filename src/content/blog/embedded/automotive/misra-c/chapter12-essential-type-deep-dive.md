---
title: "Ch 12: Essential Type Model 심화 — 변환 매트릭스와 컴파일러 코드 생성"
date: 2026-05-18T13:00:00
description: "Essential type 8개의 *모든 변환 조합*과 결과. promotion, conversion rank, GCC/Clang assembly 비교. 자주 위반되는 패턴 50개."
tags: [misra, c, essential-type, conversion, promotion, assembly, rank]
series: "MISRA C"
seriesOrder: 12
draft: true
---

5장에서 Essential Type Model의 *개념*을 봤다. 이 장은 *모든 변환 조합의 실제 동작*을 본다. C 표준의 *integer promotion*과 *usual arithmetic conversion* 규칙이 어떻게 *컴파일러의 assembly 출력*을 결정하는지, MISRA가 왜 *명시적 캐스트*를 요구하는지 *증거와 함께* 본다.

## C 타입 변환의 3단계

C 표준은 모든 산술 변환을 *3단계*로 정의한다.

**1. Integer Promotion      — 작은 정수를 int로**


**2. Usual Arithmetic Conv  — 양쪽 피연산자를 같은 타입으로**


**3. Conversion (Assignment) — 결과를 대상 타입으로**

각 단계마다 *침묵 변환*이 일어난다. MISRA Essential Type Model은 이 *모든 침묵 변환*에 *명시 의도*를 요구.

## Integer Promotion — 작은 타입의 운명

### 규칙 (C99 §6.3.1.1)

`int`보다 *rank가 낮은* 정수 타입(`_Bool`, `char`, `short`)이 *표현식에 등장하면* 다음 변환이 일어난다.

**if int can represent all values of original type:**

- promote to int

**else:**

- promote to unsigned int

거의 모든 환경에서 `char`, `short`는 `int`로 변환된다.

### 실제 예 — 컴파일러 출력

```c
// source.c
uint16_t Multiply16(uint16_t a, uint16_t b) {
    return a * b;
}
```

GCC `-O2 -m32` (32비트 환경):

```asm
Multiply16:
    movzwl    8(%esp), %eax       ; a를 zero-extend로 32비트 eax에 (uint16 → int)
    movzwl    4(%esp), %edx       ; b → edx
    imul      %edx, %eax          ; 32비트 곱셈
    ret                           ; 반환 시 하위 16비트만 의미
```

`a * b`는 *내부적으로 32비트 곱셈*이 일어난다. *uint16 × uint16 → int*. 결과가 `int`라는 게 문제다 — *signed overflow는 UB*.

```c
// 위반 가능
uint16_t a = 0xFFFF;
uint16_t b = 0xFFFF;
uint16_t r = a * b;    // a*b = 0xFFFE0001
                       // int에 들어가지만 UB는 아님 (int가 32비트면 0xFFFE0001 < INT_MAX)
                       // 16비트 int 환경이면 UB
```

16비트 int 환경에서는 *0xFFFE0001*이 *signed int에 들어가지 못함* — 정의되지 않은 동작.

### MISRA의 대응 (Rule 10.7)

```c
// Good — uint32_t로 명시
uint32_t r = (uint32_t)a * (uint32_t)b;
```

assembly:

```asm
Multiply16_safe:
    movzwl    8(%esp), %eax
    movzwl    4(%esp), %edx
    imul      %edx, %eax          ; 같은 명령어
    ret
```

생성 코드는 *동일*. 하지만 *컴파일러는 unsigned 곱셈을 명시*했음을 안다 — overflow가 well-defined wrap.

## Usual Arithmetic Conversion — 양쪽을 같은 타입으로

### 규칙 (C99 §6.3.1.8)

이항 산술 연산에서 양쪽 피연산자가 *다른 타입*이면:

**1. 둘 중 long double 있으면 → 양쪽 long double**


**2. 둘 중 double 있으면      → 양쪽 double**


**3. 둘 중 float 있으면       → 양쪽 float**


**4. 정수 promotion 적용**


**5. 같은 타입이면 → 변환 없음**


**6. 둘 다 signed 또는 둘 다 unsigned면 → rank 큰 쪽으로**


**7. unsigned의 rank ≥ signed의 rank면 → unsigned로**


**8. signed가 unsigned 값 모두를 표현할 수 있으면 → signed로**


**9. 그 외 → signed의 unsigned 버전으로**

규칙 9가 *함정의 원천*이다.

### 함정 예 — Rule 10.4 위반

```c
int32_t  s = -1;
uint32_t u =  1;

if (s < u) {
    // 직관: -1 < 1 → true
}
```

C 표준이 처리하는 순서:
1. `s` rank == `u` rank (둘 다 32비트)
2. 둘 다 signed 또는 둘 다 unsigned? — 아님
3. unsigned의 rank ≥ signed의 rank? — 같음, true
4. → unsigned로 변환
5. `s` 가 `(uint32_t)-1` = `0xFFFFFFFF`로 변환
6. `0xFFFFFFFF < 1` → **false**

직관과 반대. 코드는 `else` 분기로 간다.

GCC `-Wsign-compare` 활성화 시 경고. MISRA가 자동 검출.

### 함정 예 — int / unsigned int

```c
int      a = -100;
unsigned int b = 50;
int result = a / b;

// 직관: -100 / 50 = -2
// 실제: a → (uint32)0xFFFFFF9C, 0xFFFFFF9C / 50 = 0x051EB851 / int = 85,899,287
```

이게 *컴파일러가 자동으로 처리하는 코드*. MISRA Rule 10.4가 이런 패턴을 *모두 위반*으로 표시.

```c
// Good — 같은 타입으로 명시
int      a = -100;
unsigned int b = 50;
int result;
if (a < 0) {
    result = -((int)((unsigned int)(-a) / b));
} else {
    result = (int)((unsigned int)a / b);
}
```

## Conversion Rank — 정확한 순위

C99 §6.3.1.1이 정의하는 *integer conversion rank*:

**1. _Bool                    (rank 0, 가장 낮음)**


**2. signed char, unsigned char, char**


**3. short, unsigned short**


**4. int, unsigned int**


**5. long, unsigned long**


**6. long long, unsigned long long**


**7. extended integer types (구현 정의)**

같은 size의 signed와 unsigned는 *같은 rank*. 위 규칙 6~9가 이 동률을 깬다.

### 실용적 정리

| 두 피연산자 | 결과 타입 |
|------------|----------|
| `int8_t + int8_t` | `int` (promotion) |
| `int16_t + int16_t` | `int` (promotion) |
| `int32_t + int32_t` | `int32_t` (no promotion if int == int32) |
| `int + unsigned int` | `unsigned int` (signed 손실) |
| `int32_t + uint16_t` | `int32_t` (uint16 promotes, int32 wins) |
| `int + long` | `long` |
| `long + unsigned int` | 환경 의존 (long > 32비트면 long, 32비트면 unsigned long) |
| `int + float` | `float` |
| `double + float` | `double` |

## Essential Type Matrix — 모든 변환

MISRA가 정의하는 8개 essential type 사이의 *허용된 변환*을 표로 본다.

### 묵시적 변환 (Rule 10.3) — 더 좁은 타입으로 *금지*

```
From / To  | bool | char | enum | sgn  | unsgn| float| pointer
-----------|------|------|------|------|------|------|--------
boolean    |  -   | NO   | NO   | NO   | NO   | NO   | NO
character  | NO   |  -   | NO   | NO   | NO   | NO   | NO
enum<T>    | NO   | NO   |  -   | NO   | NO   | NO   | NO
signed     | NO   | NO   | NO   | OK*  | NO   | NO   | NO
unsigned   | NO   | NO   | NO   | NO   | OK*  | NO   | NO
float      | NO   | NO   | NO   | NO   | NO   | OK*  | NO
pointer    | NO   | NO   | NO   | NO   | NO   | NO   | OK**

OK*  : 같은 essential type 내에서 *더 넓은* 타입으로만 OK
OK** : 호환되는 pointer 타입만
```

MISRA가 *기본 C보다 훨씬 엄격*. C는 거의 모든 변환을 묵시 허용하지만 MISRA는 *명시 캐스트* 요구.

### 명시적 캐스트 (Rule 10.5) — 호환되는 essential type만

```
From / To  | bool | char | enum | sgn  | unsgn| float| pointer
-----------|------|------|------|------|------|------|--------
boolean    |  -   | NO   | NO   | OK   | OK   | OK   | NO
character  | NO   |  -   | NO   | OK   | OK   | NO   | NO
enum<T>    | NO   | NO   |  -   | OK   | OK   | NO   | NO
signed     | OK   | OK   | OK   |  -   | OK   | OK   | NO***
unsigned   | OK   | OK   | OK   | OK   |  -   | OK   | NO***
float      | NO   | NO   | NO   | OK   | OK   |  -   | NO
pointer    | NO   | NO   | NO   | NO***| NO***| NO   |  -

NO*** : Advisory만 — Rule 11.4 (pointer ↔ integer는 권장하지 않지만 deviation 가능)
```

## 자주 위반되는 패턴 50선

### A. 비교 연산

```c
// 1. signed vs unsigned
int s = -1;
unsigned u = 1;
if (s < u) { }              // Rule 10.4 위반

// 2. char를 boolean으로
char c = 'a';
if (c) { }                  // Rule 14.4 위반

// 3. enum vs int
enum Color { RED, GREEN };
if (RED == 0) { }            // Rule 10.4 위반 — enum vs signed

// 4. 포인터를 boolean으로
char *p = malloc(10);
if (p) { }                  // Rule 14.4 위반

// 5. NULL을 0으로
char *p = 0;                 // Rule 11.9 위반
```

### B. 산술

```c
// 6. char + int
char c = 'a';
char d = c + 1;             // Rule 10.2 위반

// 7. uint8 + uint8 (promotion 후 좁은 타입)
uint8_t a = 100, b = 200;
uint8_t r = a + b;          // Rule 10.7 — promotion 후 좁은 타입

// 8. signed wraparound
int x = INT_MAX;
int y = x + 1;              // Rule 1.3 (UB)

// 9. 0 나누기
int z = x / 0;              // Dir 4.1

// 10. INT_MIN / -1
int z = INT_MIN / -1;       // Rule 1.3 (UB)
```

### C. 시프트

```c
// 11. signed 좌시프트
int x = -1;
int y = x << 1;             // Rule 1.3 (UB)

// 12. shift count >= width
uint32_t x = 1;
uint32_t y = x << 32;       // Rule 1.3 (UB)

// 13. shift count 음수
uint32_t y = x << -1;       // Rule 1.3 (UB)
```

### D. 타입 캐스트

```c
// 14. C-style cast (C에서는 OK, 그러나 의도 불명확)
double d = 3.14;
int i = (int)d;             // OK (Rule 10.5와 호환)

// 15. 호환되지 않는 포인터 캐스트
int *p = (int *)"hello";    // Rule 11.3 위반

// 16. 함수 포인터 ↔ 객체 포인터
int (*fn)(int) = &Foo;
void *p = (void *)fn;       // Rule 11.1 위반

// 17. const 제거
const int x = 5;
int *p = (int *)&x;          // Rule 11.8 위반

// 18. 정수 ↔ 포인터
int *p = (int *)42;          // Rule 11.4 위반 (Advisory)

// 19. enum과 int 혼용
enum Color c = (enum Color)42;   // 정의되지 않은 enum 값
```

### E. 표현식

```c
// 20. sizeof 부작용
size_t n = sizeof(i++);     // Rule 13.6 위반 (Mandatory)

// 21. 같은 변수 두 번 수정
int i = 0;
int x = i++ + i++;          // Rule 13.3 위반

// 22. 평가 순서 의존
int x = Foo() + Bar();      // Rule 13.5 — bool 표현식 외 부작용

// 23. 비트 연산을 boolean으로
int x = 5, y = 3;
if (x & y) { }              // Rule 10.1 위반 — bit op as boolean

// 24. comma 연산자 남용
int x = (a, b, c);          // Rule 12.3 위반

// 25. ternary 결과 타입 일치 안 함
int x = cond ? 1 : 2.0;     // Rule 10.x
```

### F. 함수

```c
// 26. 가변 인자
void Log(const char *fmt, ...);    // Rule 17.1 위반

// 27. 재귀
int Factorial(int n) { return n <= 1 ? 1 : n * Factorial(n-1); }
                                   // Rule 17.2 위반

// 28. prototype 없는 호출
Foo(5);
int Foo(int x) { ... }              // Rule 17.3 위반

// 29. void 함수 결과 사용
extern void DoWork(void);
int x = DoWork();                   // 컴파일 에러

// 30. 반환값 무시
fopen("f", "r");                    // Rule 17.7 위반
```

### G. 메모리·포인터

```c
// 31. malloc 사용
char *p = malloc(100);              // Rule 21.3 위반

// 32. VLA
void Foo(int n) { int arr[n]; }    // Rule 18.8 위반

// 33. 자동 변수 주소 반환
int *Bad() { int x = 5; return &x; }  // Rule 18.6 위반

// 34. one-past-end dereference
int arr[10];
int x = *(arr + 10);                // Rule 18.1 (UB)

// 35. 다른 배열 포인터 비교
int a[10], b[10];
if (&a[0] < &b[0]) { }             // Rule 18.3 (UB)
```

### H. 식별자·스코프

```c
// 36. 외부 식별자 31자+ 충돌
extern int can_message_receive_timeout_handler_for_node_A;
extern int can_message_receive_timeout_handler_for_node_B;
                                    // Rule 5.1 위반

// 37. shadowing
int x;
void Foo() { int x = 5; }           // Rule 5.3 위반

// 38. 매크로 vs 변수 이름 충돌
#define SIZE 100
int SIZE;                            // Rule 5.4 위반

// 39. 미사용 식별자
typedef int Unused;                  // Rule 2.4

// 40. 예약 식별자
#define __MY_MACRO 1                 // Dir 4.5/Rule 21.1 위반
```

### I. 흐름

```c
// 41. fallthrough 누락
switch (x) {
    case 1: DoA();
    case 2: DoB(); break;            // Rule 16.3 위반
}

// 42. default 누락
switch (x) {
    case 1: break;                   // Rule 16.4 위반
}

// 43. else 누락
if (x > 0) { ... }
else if (x < 0) { ... }              // Rule 15.7 위반

// 44. 중괄호 누락
if (cond) DoA();                     // Rule 15.6 위반

// 45. goto backward
loop: DoWork(); goto loop;          // Rule 15.3 위반
```

### J. Comment·Identifier

```c
// 46. octal literal
int x = 017;                         // Rule 7.1 위반

// 47. 다중 줄 comment 안의 //
/* outer // inner */                // 다소 모호하지만 일반적으로 OK

// 48. trigraph
// What time????                     // Rule 4.2 위반 (해석 따름)

// 49. shadow + naming
struct foo { int x; };
int foo;                            // 일부 환경 충돌

// 50. mixed-case 매크로
#define color red                    // 관례 위반 (대문자 권장)
```

## 컴파일러별 처리 — GCC vs Clang vs ARMCC

### Promotion 처리 차이

```c
uint16_t a = 0xFFFF, b = 0xFFFF;
return a + b;
```

**GCC 12 -O2 (x86_64)**

```asm
movzwl  %di, %edi        ; uint16 → int
movzwl  %si, %esi
add     %esi, %edi
mov     %edi, %eax       ; 결과는 int
ret                       ; 호출자가 받을 때 의미 결정
```

**Clang 17 -O2**

```asm
movzwl  %di, %eax
movzwl  %si, %ecx
add     %ecx, %eax
ret
```

**ARMCC (Cortex-M7)**

```asm
UXTH    r0, r0           ; uint16 zero-extend
UXTH    r1, r1
ADD     r0, r0, r1       ; 32비트 덧셈
BX      lr               ; 반환
```

세 컴파일러 모두 *promotion 적용*. 결과적으로 *32비트 산술이 수행*된다는 사실이 *명시적으로 보이지 않으나 실제로 일어난다*.

### Implementation-Defined 동작 차이

```c
char c = 0xFF;
if (c < 0) { /* signed char */ }
```

**GCC (x86)**: char는 *signed* 기본. `c = -1`, 조건 *true*.

**GCC (ARM)**: char는 *unsigned* 기본. `c = 255`, 조건 *false*.

**ARMCC**: signed (옵션으로 변경 가능)

**MSVC**: signed 기본.

같은 코드가 *다른 결과*. MISRA Dir 1.1이 *각 컴파일러 동작 문서화* 요구하는 이유.

`-fsigned-char` 또는 `-funsigned-char`로 *프로젝트 차원에 고정* 권장.

## Promotion의 *예측 불가능*한 경우

```c
uint32_t Multiply(uint32_t a, uint32_t b) {
    return a * b;            // OK
}

uint64_t WidenMul(uint32_t a, uint32_t b) {
    return a * b;            // 위반? — promotion이 uint32에서 멈춤
}

uint64_t Better(uint32_t a, uint32_t b) {
    return (uint64_t)a * (uint64_t)b;    // Good
}
```

`WidenMul`는 *uint32 곱셈*이 *uint32 wrap*. 결과를 *uint64에 저장하지만 이미 잘림*. MISRA Rule 10.7 위반.

## Bit-field의 함정

```c
struct Flags {
    unsigned int valid : 3;
};

struct Flags f;
f.valid = 7;          // OK — 3비트로 표현 가능
f.valid = 8;          // implementation-defined — 모듈러로 0이 될 수도

int x = f.valid + 1;
// f.valid는 unsigned int : 3 이므로 promotion에서 *int*로 변환 (signed!)
// 따라서 산술은 signed
```

Bit-field promotion은 *특수* — 일반 정수 promotion 규칙과 비슷하지만 *비트 폭* 기반.

```c
struct { unsigned int b : 4; } f = { 15 };
auto x = f.b + 1;             // x의 타입은? signed int (promotion에서)
```

GCC `__typeof__(f.b + 1)`로 확인: `int`. *unsigned가 사라진다*.

## 정리 — Essential Type Model의 *왜*

1. **C 표준의 침묵 변환은 너무 관대**. 의도하지 않은 부호·폭 변환이 자주 발생.
2. **Integer promotion이 *작은 타입 보호*를 약화**. `uint16 × uint16`이 `int` 곱셈으로 변환되어 *signed overflow 가능*.
3. **Usual arithmetic conversion이 *signed → unsigned로 손실*** 시킬 수 있음. `if (s < u)`가 직관과 반대.
4. **MISRA Essential Type Model이 *모든 비-trivial 변환에 명시 캐스트* 요구**. 의도를 *컴파일러와 분석기와 인간 리뷰어*에게 동시에 전달.
5. **컴파일러별 implementation-defined 동작**(특히 `char`의 signedness)이 *이식성*을 깬다. Dir 1.1 문서화.

## 실전 — 안전한 산술 보일러플레이트

```c
// Helper macros
#define SAFE_CAST(type, val)        ((type)(val))
#define SAFE_ADD(type, a, b, r)     __builtin_add_overflow((a), (b), (r))
#define SAFE_MUL(type, a, b, r)     __builtin_mul_overflow((a), (b), (r))
#define SAFE_SHIFT_L(type, v, n)    ((n) < sizeof(type)*8 ? (type)((v) << (n)) : 0)

// Usage
uint32_t a = SAFE_CAST(uint32_t, src1);
uint32_t b = SAFE_CAST(uint32_t, src2);
uint32_t result;
if (SAFE_MUL(uint32_t, a, b, &result)) {
    // overflow
    return -EOVERFLOW;
}
```

MISRA + CERT 모두 *built-in overflow detection* 권장. 보일러플레이트 매크로로 정착.

## 다음 장 예고

13장은 정적 분석 도구 *설정 깊이* — Helix QAC 프로젝트 setup, custom suppression, CI/CD 통합.

## 관련 항목

- [Ch 5 — Essential Type Model](/blog/embedded/automotive/misra-c/chapter05-expressions-types)
- [Ch 11 — ISO 26262 audit walkthrough](/blog/embedded/automotive/misra-c/chapter11-iso26262-audit-walkthrough)
- [CERT C Ch 5 — Integers](/blog/embedded/automotive/cert-c/chapter05-integers)
- [CERT C Ch 11 — Integer CVE](/blog/embedded/automotive/cert-c/chapter11-integer-cve-deep-dive)
