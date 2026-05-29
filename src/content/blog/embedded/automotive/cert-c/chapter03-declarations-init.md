---
title: "Ch 3: DCL — 선언, 초기화, 타입 정합성"
date: 2026-05-18T04:00:00
description: "const 정확성(DCL00), 식별자 가독성(DCL02), 자동 변수 lifetime(DCL30), 함수 호환 선언(DCL40)."
tags: [cert-c, declaration, initialization, const, lifetime, prototype]
series: "CERT C"
seriesOrder: 3
draft: true
---

DCL 카테고리는 *선언과 초기화*의 안전성을 다룬다. MISRA R8/R9와 겹치지만 *보안 관점*에 초점이 있다. 즉 *잘못된 선언이 만들 수 있는 취약점*에 무게를 둔다.

## DCL00-C — const 정확성

객체가 *수정되지 않을 것*이면 `const`를 붙여라. 컴파일러가 *의도하지 않은 수정*을 잡는다.

```c
// 회피
void Process(int *data, size_t n) {
    for (size_t i = 0; i < n; i++) {
        printf("%d ", data[i]);   // 읽기만, 그러나 const 누락
    }
}

// Good
void Process(const int *data, size_t n) {
    for (size_t i = 0; i < n; i++) {
        printf("%d ", data[i]);
        // data[i] = 0;   ← 컴파일 에러
    }
}
```

`const`는 *문서이자 검증*이다. API 사용자에게 "이 인자는 수정되지 않음"을 약속하고, 컴파일러가 이를 강제한다.

### const_cast 절대 금지

```c
const int *p = &x;
*(int *)p = 5;     // 위반 — const 제거 후 수정
                   // 실제로는 read-only 메모리일 수 있어 UB
```

C++의 `const_cast`도 같은 위반. *원본이 const로 정의됐다면* 수정은 모두 UB.

## DCL02-C — 식별자는 시각적으로 구별

`O`/`0`, `l`/`1`, `rn`/`m` — 폰트에 따라 헷갈리는 조합.

```c
// 회피
int O = 0;          // 대문자 오와 영
int l = 1;          // 소문자 엘과 일
char rn[10];        // m처럼 보임

// Good
int origin = 0;
int line = 1;
char received_name[10];
```

이건 *보안 영향*도 있다. 공격자가 *동음 식별자*로 코드 리뷰를 속이는 *typosquatting* 공격이 보고된 적이 있다.

## DCL03-C — static assertion 활용

컴파일 타임 조건을 *검사*해 가정 위반을 *빌드 단계*에서 잡는다.

```c
// C11 — _Static_assert
_Static_assert(sizeof(int) == 4, "int must be 32 bits");
_Static_assert(sizeof(struct Packet) == 16, "Packet layout changed");

// C23 / 매크로 — static_assert
#include <assert.h>
static_assert(CHAR_BIT == 8, "byte must be 8 bits");
```

런타임 `assert`는 *실행돼야* 발견된다. `_Static_assert`는 *컴파일이 안 되어* 즉시 발견.

흔한 사용처:

- 구조체 패킹 (네트워크·DMA 레이아웃 검증)
- 정수 폭 가정
- 배열 크기와 enum 항목 수 동기화
- ABI 호환성 검사

```c
enum Color { RED, GREEN, BLUE, COLOR_COUNT };
const char *kColorNames[] = { "red", "green", "blue" };
_Static_assert(sizeof(kColorNames) / sizeof(kColorNames[0]) == COLOR_COUNT,
               "color name array out of sync");
```

## DCL06-C — 매직 넘버 대신 *명명된 상수*

```c
// 회피
char buf[256];
if (count > 256) return -1;

// Good
#define BUF_SIZE 256
char buf[BUF_SIZE];
if (count > BUF_SIZE) return -1;

// 더 Good — typed
static const size_t kBufSize = 256;
```

`#define` 매크로보다 *`static const`*가 *타입 정보*를 가져 디버거에 보인다.

## DCL30-C — 자동 변수 lifetime을 초과해 사용 금지

```c
char *Bad(void) {
    char buf[100];
    sprintf(buf, "hello");
    return buf;     // 위반 — 자동 변수 주소 반환 (dangling)
}

const char *Good(void) {
    static const char buf[] = "hello";
    return buf;     // static — OK
}
```

스택 변수의 lifetime은 *함수 반환과 함께 끝난다*. 주소를 반환하거나 글로벌에 저장하면 dangling pointer.

`alloca`, VLA의 lifetime도 *블록 단위*. 함수 단위가 아니다.

```c
void Bad2(int n) {
    int *p;
    {
        int arr[n];
        p = arr;
    }
    p[0] = 5;       // 위반 — arr lifetime 끝남
}
```

## DCL31-C — 식별자는 사용 전 선언

```c
// 위반 (C89 모드) — implicit int
int main(void) {
    foo();           // foo 선언 없음
    return 0;
}
int foo(void) { /* ... */ }
```

C99에서 폐지됐지만 *오래된 컴파일러*나 *호환 모드*에서 침묵 처리 가능. 컴파일러 옵션으로 *명시적으로 금지*한다(`-Wimplicit-function-declaration -Werror`).

## DCL36-C — 외부 연결 식별자의 storage class 일관

```c
// foo.c
static int counter = 0;        // internal linkage

// bar.c
extern int counter;            // 위반 — 다른 컴파일 단위에서 extern 선언
                               // 링커는 못 찾거나, 같은 이름의 다른 변수 발견
```

`static`(internal)과 `extern`(external)을 같은 이름에 혼용하면 *조용히 잘못된 변수*를 참조할 위험.

## DCL37-C — 예약 식별자 사용 금지

```c
// 위반
#define __INTERNAL_FLAG 1     // __ — 예약
typedef int _Counter;          // _대문자 — 예약
int errno;                     // 표준 매크로/식별자 가림

// Good
#define MY_INTERNAL_FLAG 1
typedef int CounterT;
```

PRE07과 같은 메시지, *선언 관점*에서.

## DCL38-C — Flexible array member는 *정확한 syntax*로

```c
// 위반 — pre-C99 스타일
struct Buffer {
    size_t len;
    char data[1];           // 옛 트릭 — UB 위험
};

// Good — C99 FAM
struct Buffer {
    size_t len;
    char data[];
};
```

C99 FAM은 *컴파일러가 정확히 다루지만*, `data[1]` 또는 `data[0]` 트릭은 *기술적으로 UB*. 대부분의 컴파일러는 관대하게 처리하지만 *공격자가 정확한 조건을 만들면* 익스플로잇 경로가 된다.

## DCL40-C — 호환되지 않는 함수 선언 금지

```c
// foo.h
int Process(int x);

// bar.c
#include "foo.h"
long Process(int x);     // 위반 — 반환 타입 다름

// 또는 더 미묘하게
int Process(short x);    // 위반 — 인자 타입 다름 (promotion 후 같지만)
```

링커는 *이름만으로* 매칭하므로 *시그니처 불일치*를 못 잡는다. 호출 측은 한 시그니처, 정의 측은 다른 시그니처로 컴파일되어 *스택 레이아웃 불일치* — 익스플로잇 가능.

## DCL41-C — switch 라벨은 *최상위*에 둠

MISRA Rule 16.2와 같다. Duff's device 등 트릭 차단.

```c
// 위반 — Duff's device
switch (count % 8) {
    case 0: do { *to++ = *from++;
    case 7:      *to++ = *from++;
    case 6:      *to++ = *from++;
    /* ... */
    } while (--n > 0);
}
```

## 초기화 정책 — 종합

CERT가 *권장*하는 초기화 정책.

```c
// 1. 자동 변수는 즉시 초기화
int x = 0;
struct Config cfg = { .port = 8080, .timeout = 30 };

// 2. 배열은 designated initializer
int days[] = { [JAN]=31, [FEB]=28, [MAR]=31, /* ... */ };

// 3. 포인터는 NULL로
char *p = NULL;
FILE *fp = NULL;

// 4. 구조체 zero-init
struct Session s = { 0 };

// 5. memset로 초기화 시 padding까지
struct Session s;
memset(&s, 0, sizeof(s));
```

`{ 0 }`은 *구조체 zero-init*이지만 *padding byte*는 정의되지 않은 채 남는다. 구조체를 *직렬화*해 보낼 때는 `memset`이 더 안전.

## 자주 마주치는 취약점

| 규칙 | 흔한 결과 |
|------|---------|
| DCL30 (자동 변수 lifetime) | dangling pointer → use-after-free |
| DCL37 (예약 식별자) | 런타임 충돌, 분석기 오작동 |
| DCL40 (호환되지 않는 선언) | 스택 손상 → RCE 잠재 |
| DCL00 (const 정확성) | 의도 안 한 수정 → 권한 우회 |

## clang-tidy 검사

```bash
clang-tidy -checks='cert-dcl*,readability-const-*' source.c
```

`readability-const-cast`, `readability-non-const-parameter` 등 readability 검사가 DCL 영역을 강화.

## 정리

- *수정 안 되면 const*. 컴파일러가 의도하지 않은 수정을 잡는다.
- `_Static_assert`로 *구조체 크기·정수 폭* 같은 가정을 빌드 시점에 검증.
- 자동 변수의 *주소를 반환하거나 저장 금지* — dangling.
- 예약 식별자 패턴(`__foo`, `_Foo`) 회피.
- 같은 함수의 선언·정의는 *완전히 같은 시그니처*.

## 다음 장 예고

4장은 EXP — 표현식. sequence point, 평가 순서, sizeof, 비교 연산의 보안 함정.

## 관련 항목

- [Ch 2 — Preprocessor](/blog/embedded/automotive/cert-c/chapter02-preprocessor)
- [Ch 4 — Expressions](/blog/embedded/automotive/cert-c/chapter04-expressions)
