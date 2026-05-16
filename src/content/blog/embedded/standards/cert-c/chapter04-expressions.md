---
title: "Ch 4: EXP — 표현식, 평가 순서, sizeof, 비교"
date: 2025-09-10T05:00:00
description: "Sequence point(EXP30), 미초기화 사용(EXP33), NULL deref(EXP34), 인자 일치(EXP37) — C 표현식의 함정."
tags: [cert-c, expression, sequence-point, sizeof, null-deref]
series: "CERT C"
seriesOrder: 4
draft: false
---

C의 표현식은 *평가 순서를 표준이 거의 지정하지 않는다*. 같은 변수를 여러 번 수정하거나 부작용이 있는 함수를 호출하면 결과가 *컴파일러·최적화 레벨에 따라 다르다*. EXP 카테고리는 이를 다룬다.

## EXP30-C — 같은 sequence point 내에서 객체 두 번 수정 금지

C의 *sequence point*는 부작용이 *반영되는 경계*다. 사이에서 같은 객체를 여러 번 수정하면 UB.

```c
// 위반 — UB
int i = 0;
i = i++;             // i++의 부작용과 i 할당이 한 sequence point 안

int a[10], i = 5;
a[i] = i++;          // i의 사용·수정 순서 미정

int x = ++i + ++i;   // i 두 번 수정
```

C11에서 *unsequenced* / *indeterminately sequenced* 용어로 정밀화됐지만 *결과는 동일* — *코드가 의미를 가지지 않는다*.

```c
// Good
i++;
i = i;               // 무의미하지만 well-defined

i++; a[i-1] = i-1;
```

## EXP32-C — `volatile`은 *제거하면 안 됨*

```c
volatile uint32_t *reg = (uint32_t *)0x40020000;
uint32_t *p = (uint32_t *)reg;   // 위반 — volatile 제거
*p = 5;                          // 컴파일러가 *합법적으로* 최적화 제거 가능
```

`volatile`은 *모든 접근이 일어나야 한다*는 약속. 제거하면 컴파일러가 *연속 접근을 캐시*하거나 *재정렬*해 MMIO·인터럽트 통신을 깨뜨린다.

## EXP33-C — 미초기화 변수 사용 금지

```c
int x;
if (cond) x = 5;
return x + 1;        // 위반 — cond false면 x 미초기화
```

이는 *정보 누설* 취약점도 된다. 스택의 *이전 함수가 남긴 데이터*가 노출될 수 있다.

```c
// 클래식 정보 누설 예
struct Reply {
    int code;
    char message[64];
};

void HandleRequest(int sock) {
    struct Reply r;
    r.code = 200;
    // r.message 미초기화 — 스택의 비밀이 그대로 전송됨
    send(sock, &r, sizeof(r), 0);
}

// Good
struct Reply r = { 0 };       // zero-init
// 또는 memset(&r, 0, sizeof(r));
```

## EXP34-C — NULL 포인터 dereference 금지

```c
char *p = malloc(100);
strcpy(p, "hello");      // 위반 — malloc 실패 시 NULL

// Good
char *p = malloc(100);
if (p == NULL) {
    return -ENOMEM;
}
strcpy(p, "hello");
```

NULL deref는 *대부분 SIGSEGV*로 즉시 발견되지만, *공격자가 가상 메모리 매핑*을 조작할 수 있는 환경에서는 *NULL 페이지를 매핑*해 *임의 코드 실행*까지 갈 수 있다. Linux KSPP가 막은 *Null deref kernel exploit* 패밀리.

## EXP35-C — return값을 받은 객체에 즉시 접근 금지

```c
// 위반 — strtok 반환 후 즉시 다른 strtok 호출
char *p = strtok(s, " ");
char *q = strtok(NULL, ",");
// p가 가리키는 곳이 q와 어떻게 관계? UB

// 더 미묘
struct timeval *getTV(void);
printf("%ld\n", getTV()->tv_sec);   // 반환된 임시 객체 접근 — lifetime UB
```

## EXP36-C — 정렬되지 않은 포인터 변환 금지

```c
char buf[100];
uint32_t *p = (uint32_t *)&buf[1];   // 위반 — 1 byte offset, 4 byte align 깨짐
*p = 5;                              // ARM·MIPS 등에서 SIGBUS
```

x86은 *unaligned access를 관대하게* 처리하지만 ARM/PowerPC/MIPS는 trap. 코드를 *이식 가능*하게 하려면 정렬 보장.

```c
// Good — memcpy
uint32_t v;
memcpy(&v, &buf[1], sizeof(v));
```

## EXP37-C — 함수 호출 인자가 prototype과 일치

```c
extern int Process(double x);

int main(void) {
    Process(5);          // 위반? 사실 5 → 5.0 묵시 변환되어 OK
    Process((char *)0);  // 위반 — 포인터를 double로 못 변환
}
```

K&R 스타일 함수(prototype 없음)에서는 이런 검사 자체가 *안 일어난다*. 모든 함수에 prototype 강제.

## EXP40-C — const 객체 수정 금지

DCL00과 같은 메시지, *표현식 관점*에서.

```c
const int x = 5;
*(int *)&x = 10;         // 위반 — UB
```

## EXP42-C — 구조체를 `memcmp`로 비교 금지

```c
struct S { int a; char c; int b; };
struct S s1, s2;
// ... 초기화 ...

if (memcmp(&s1, &s2, sizeof(s1)) == 0) { /* ... */ }   // 위반
```

문제: 구조체에 *padding byte*가 들어가는데 그 내용은 *정의되지 않음*. 두 구조체의 멤버 값이 같아도 *padding이 다르면* `memcmp`가 false를 반환한다.

```c
// Good — 멤버별 비교
bool S_equal(const struct S *x, const struct S *y) {
    return x->a == y->a && x->c == y->c && x->b == y->b;
}
```

이는 *정보 누설*의 경로이기도 하다. 구조체를 직렬화하면 padding으로 *과거 스택의 비밀*이 함께 흘러나간다.

## EXP43-C — `restrict` 포인터의 메모리는 *겹치면 안 됨*

```c
void memcpy(void *restrict dst, const void *restrict src, size_t n);

char buf[100];
memcpy(buf, buf + 1, 50);   // 위반 — 영역 겹침, UB
```

`restrict`는 *컴파일러에게 alias 없음을 약속*하는 키워드. 위반하면 컴파일러가 *최적화로 잘못된 코드*를 생성한다.

겹치는 복사는 `memmove`.

## EXP44-C — `sizeof`, `_Alignof`, `_Generic`의 피연산자에 부작용 금지

```c
size_t n = sizeof(i++);     // 위반 — 부작용
```

`sizeof`는 *컴파일 시점에 평가*되므로 *부작용이 실행되지 않는다*. 의도와 다르게 동작.

VLA에 대한 sizeof는 *런타임 평가*가 되지만 그래도 부작용은 위반.

```c
size_t n = sizeof(int[i++]);    // 위반 — 런타임 평가지만 정책상 금지
```

## EXP45-C — selection statement에서 *할당과 비교* 혼동 금지

```c
// 위반 — = vs == 오타?
if (x = 5) { /* ... */ }       // 항상 true, x를 5로 수정

// 의도가 할당이면 명시
if ((x = compute()) != 0) { /* ... */ }
```

GCC `-Wparentheses`가 같은 검사. 의도적 할당이면 *추가 괄호*로 의도 표시.

## EXP46-C — 논리 연산의 *비-boolean* 피연산자 회피

```c
int x = 5, y = 3;
if (x & y) { /* ... */ }       // 위반 — 비트 AND를 boolean으로?
if (x && y) { /* ... */ }      // OK — 논리 AND

uint32_t flags = 0x01;
if (flags & FLAG_VALID) { /* ... */ }    // OK — 비트 검사가 의도
```

`&`/`&&`, `|`/`||`을 헷갈리지 마라. 둘 다 *컴파일 통과*하지만 의미 완전히 다르다.

## EXP47-C — *cancel point*가 있는 호출은 thread cancellation 안전 코드 안

(POSIX 스레드 관련, 임베디드 RTOS에서는 적용 적음.)

## Sequence Point 정리 (C99 §5.1.2.3)

C99까지 sequence point가 발생하는 곳:

1. 함수 호출 직전 (인자 평가 후, 함수 body 직전)
2. `&&`, `||`, `?:`, `,` 연산자의 좌측 평가 후
3. 완전한 표현식 끝 (`;`, `if (...)`, `while (...)` 의 조건 끝)
4. 라이브러리 함수 반환 직전·직후

C11은 *sequenced before / unsequenced / indeterminately sequenced* 개념으로 재정의했지만 *효과는 동일*.

## 자주 마주치는 취약점

| 규칙 | 흔한 결과 |
|------|---------|
| EXP30 (sequence point) | 컴파일러별 다른 동작 — 디버그 빌드와 릴리스 다름 |
| EXP33 (미초기화) | 정보 누설 |
| EXP34 (NULL deref) | DoS, 가끔 RCE |
| EXP42 (memcmp on struct) | padding 누설, false negative |

## 정리

- 한 sequence point 안에서 객체 *한 번만 수정*.
- `volatile` 절대 제거 금지.
- 미초기화 변수는 *값을 가질 뿐 아니라 보안 위험*.
- 구조체 비교는 *멤버별*. `memcmp` 금지.
- `sizeof` 피연산자에 부작용 금지 — 평가되지 않음.
- `if (x = 5)` 같은 *할당-비교 혼동* 회피.

## 다음 장 예고

5장은 INT — 정수. signed overflow, wraparound, 부호 변환, MISRA의 essential type model이 다루지 못한 보안 함정.

## 관련 항목

- [Ch 3 — Declarations](/blog/embedded/standards/cert-c/chapter03-declarations-init)
- [Ch 5 — Integers](/blog/embedded/standards/cert-c/chapter05-integers)
