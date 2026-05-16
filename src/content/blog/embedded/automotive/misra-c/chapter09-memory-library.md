---
title: "Ch 9: Rules 21~22 — 표준 라이브러리, 동적 메모리, 자원"
date: 2025-09-05T10:00:00
description: "stdlib·string·signal·setjmp 금지(R21), 파일·자원 lifetime(R22), 정적 풀 패턴 — 임베디드 안전성의 마지막 방어선."
tags: [misra, c, stdlib, malloc, signal, setjmp, resource]
series: "MISRA C"
seriesOrder: 9
draft: false
---

표준 C 라이브러리의 *상당수*는 임베디드 안전 시스템에 부적합하다. 동적 메모리, 시그널, 비결정적 시간 — MISRA R21/R22는 이를 차단한다.

## R21 — 표준 라이브러리 제한

### Rule 21.1 (Required) — 예약 식별자 금지

C 표준이 *구현용*으로 예약한 이름.

```c
#define __MY_MACRO    // 위반 — 두 밑줄로 시작
#define _Stuff        // 위반 — 밑줄 + 대문자
extern int errno;     // 일부 환경에서 매크로 — 충돌
```

### Rule 21.2 (Required) — 표준 함수·매크로 재선언 금지

```c
extern int printf(int x);     // 위반 — printf 재선언
#define memcpy my_memcpy       // 위반 — 표준 매크로 가림
```

### Rule 21.3 (Required) — `malloc`, `calloc`, `realloc`, `free` 금지

가장 *유명한* MISRA 규칙. 임베디드 안전 시스템이 heap을 쓰지 않는 이유:

1. **단편화** — 장기간 운영하면 가용 공간은 있는데 할당 실패.
2. **비결정적 시간** — `malloc`이 *언제 끝날지* 모름. 실시간 보장 불가.
3. **메모리 누수** — 한 번이라도 빠지면 누적되어 시스템 다운.
4. **분석 곤란** — *최악 메모리 사용량* 결정 불가.

대안:

```c
// 정적 풀
#define POOL_SIZE 32
static can_msg_t g_pool[POOL_SIZE];
static uint8_t g_free[POOL_SIZE / 8];   // bitmap

can_msg_t *pool_alloc(void) {
    for (size_t i = 0; i < POOL_SIZE; i++) {
        size_t byte = i / 8, bit = i % 8;
        if (!(g_free[byte] & (1u << bit))) {
            g_free[byte] |= (1u << bit);
            return &g_pool[i];
        }
    }
    return NULL;
}
```

풀은 *컴파일 타임에 결정된 크기*. 런타임 단편화 없음. 최악 사용량은 풀 크기 자체.

### Rule 21.4 (Required) — `<setjmp.h>` 금지

```c
#include <setjmp.h>            // 위반
jmp_buf env;
setjmp(env);
longjmp(env, 1);
```

`setjmp`/`longjmp`는 *비국소 점프*다. 호출 스택을 *짚어 거슬러 올라가는* 동작이라 분석이 거의 불가능. 자원 해제·destructor 호출이 모두 건너뛰어진다.

### Rule 21.5 (Required) — `<signal.h>` 금지

```c
#include <signal.h>            // 위반
signal(SIGINT, handler);
raise(SIGSEGV);
```

시그널 핸들러는 *비동기*로 호출되어 *모든 데이터 일관성*을 깨뜨릴 수 있다. POSIX 환경에서도 *async-signal-safe* 함수 목록이 작다. 임베디드 안전 시스템은 시그널을 *써서는 안 된다*.

RTOS의 인터럽트는 *다른 메커니즘*(ISR 등록 API)이므로 R21.5 위반이 아니다.

### Rule 21.6 (Required) — `<stdio.h>` 입출력 금지

```c
#include <stdio.h>             // 위반
printf("hello\n");
FILE *fp = fopen(...);
```

`stdio`는 *heap 사용, 버퍼링, 비결정적 시간* 셋 다 가진다. 임베디드 로깅은 *별도 wrapper*(고정 포맷, 링 버퍼, DMA UART)를 만든다.

### Rule 21.7 (Required) — `<stdlib.h>`의 `atoi`, `atol`, `atof`, `atoll` 금지

오버플로 시 *undefined behavior*. 대신 `strtol` 계열을 *errno 검사와 함께* 쓴다.

```c
// 위반
int x = atoi(input);

// Good
char *endptr;
errno = 0;
long v = strtol(input, &endptr, 10);
if (errno != 0 || endptr == input || v < INT_MIN || v > INT_MAX) {
    return -1;   // 변환 실패
}
int x = (int)v;
```

`strtol`은 *오버플로 시 errno=ERANGE*. *변환 멈춘 위치*는 endptr.

### Rule 21.8 (Required) — `system`, `abort`, `exit`, `getenv` 금지

```c
system("ls");            // 위반 — shell 실행
exit(1);                 // 위반 — 정상 종료 절차 건너뜀
abort();                 // 위반 — atexit 핸들러 건너뜀
getenv("PATH");          // 위반 — 호스팅 환경 가정
```

임베디드 펌웨어에 `system`이 있을 일이 없지만, *PC 시뮬레이션 코드*가 섞여 들어오면 잡혀야 한다.

### Rule 21.9 (Required) — `bsearch`, `qsort` 금지

비결정적 시간 + 비교 함수 콜백의 *부작용 위험*.

```c
// 위반
qsort(arr, n, sizeof(int), cmp);
```

대안: *결정적 정렬* 또는 *고정 알고리즘 wrapper*.

### Rule 21.10 (Required) — `<time.h>` 날짜·시간 금지

`time`, `localtime`, `strftime` 등. RTC 접근은 *플랫폼 wrapper*로.

### Rule 21.11~21.21 — 기타 헤더

`<tgmath.h>`, `<wchar.h>`, `<wctype.h>`, C11의 `<threads.h>`, `<stdatomic.h>` 등 추가 헤더에 대한 제한.

### Rule 21.21 (Required) — `<stdatomic.h>` 사용 제한

C11 atomics는 *plain한 사용은 허용*되지만 *atomic compound assignment*는 부분 제한.

## R22 — 자원 lifetime

### Rule 22.1 (Required) — 자원은 *반드시 해제*

```c
// 위반 — 에러 경로에 fclose 누락
int Process(const char *path) {
    FILE *fp = fopen(path, "r");
    if (fp == NULL) return -1;
    if (do_read(fp) < 0) {
        return -1;          // 위반
    }
    fclose(fp);
    return 0;
}

// Good — single exit
int Process(const char *path) {
    int rc = -1;
    FILE *fp = fopen(path, "r");
    if (fp == NULL) return -1;
    if (do_read(fp) < 0) goto cleanup;
    rc = 0;
cleanup:
    fclose(fp);
    return rc;
}
```

### Rule 22.2 (Mandatory) — 자유 메모리에 access 금지

```c
// 위반
int *p = malloc(100);
free(p);
*p = 5;                  // use-after-free
```

`free` 후 *null로 설정*하는 패턴이 권장된다.

```c
free(p);
p = NULL;
*p = 5;                  // NULL deref — 정의된 사고 (즉시 crash)
```

### Rule 22.3 (Required) — 같은 파일을 여러 모드로 동시 open 금지

```c
FILE *r = fopen("data", "r");
FILE *w = fopen("data", "w");        // 위반 — 같은 파일 동시 r/w
```

### Rule 22.4 (Mandatory) — 읽기 전용 스트림에 write 금지

```c
FILE *fp = fopen("data", "r");
fputs("hello", fp);            // 위반 — UB
```

### Rule 22.5 (Mandatory) — pointer to FILE을 *dereference 금지*

`FILE *`는 *opaque* 타입. 내부에 접근하면 UB.

### Rule 22.6~22.10 — errno와 thread

C11 thread 관련은 임베디드에서 거의 사용되지 않아 *deviation*도 흔하지 않다.

## 정적 풀 패턴 — 실전

```c
/* generic_pool.h */
#define DEFINE_POOL(TYPE, NAME, SIZE)                          \
    static TYPE NAME##_storage[SIZE];                          \
    static uint8_t NAME##_used[(SIZE + 7) / 8];                \
    static TYPE *NAME##_alloc(void) {                          \
        for (size_t i = 0; i < (SIZE); i++) {                  \
            if (!(NAME##_used[i/8] & (1u << (i%8)))) {         \
                NAME##_used[i/8] |= (1u << (i%8));             \
                return &NAME##_storage[i];                     \
            }                                                  \
        }                                                      \
        return NULL;                                           \
    }                                                          \
    static void NAME##_free(TYPE *p) {                         \
        size_t i = (size_t)(p - NAME##_storage);               \
        if (i < (SIZE)) NAME##_used[i/8] &= ~(1u << (i%8));    \
    }

/* 사용 */
DEFINE_POOL(can_msg_t, can_msg, 32)
DEFINE_POOL(uart_buf_t, uart_buf, 16)
```

매크로 자체가 Dir 4.9(함수형 매크로 회피)와 충돌하므로 *deviation Permit*에 포함시키는 것이 일반적이다.

## 안전 문자열 함수 wrapper

```c
// 위반 — 표준 strncpy는 null 종결 보장 X
strncpy(dst, src, n);

// Good — 명시적 null 종결
size_t safe_strcpy(char *dst, size_t dst_sz, const char *src) {
    if (dst_sz == 0) return 0;
    size_t i;
    for (i = 0; i + 1 < dst_sz && src[i] != '\0'; i++) {
        dst[i] = src[i];
    }
    dst[i] = '\0';
    return i;
}
```

C11 Annex K의 `strcpy_s`도 있지만 *컴파일러 지원이 들쭉날쭉*이라 MISRA는 추천하지 않는다.

## 자주 위반되는 항목

| Rule | 위반 빈도 | 흔한 원인 |
|------|----------|----------|
| 21.3 | 매우 높음 | malloc 무의식적 사용 |
| 21.6 | 매우 높음 | printf 디버깅 |
| 21.7 | 높음 | atoi 편의 |
| 22.1 | 중간 | 에러 경로 누락 |

## 정리

- R21은 *표준 라이브러리의 위험 함수*를 광범위하게 금지한다.
- 핵심 셋: 21.3(malloc), 21.4(setjmp), 21.5(signal), 21.6(stdio).
- 동적 메모리 대안은 *정적 풀, 슬랩, 슬랩 + bitmap*.
- 문자열은 *직접 wrapper*가 표준 함수보다 안전.
- R22는 *자원 lifetime* — open/close, alloc/free의 짝맞춤.

## 다음 장 예고

10장은 마무리 — 정적 분석 도구, Compliance Matrix, 인증 보고서, ISO 26262 매핑. 실전 적용의 *행정 절차* 차원.

## 관련 항목

- [Ch 8 — 함수](/blog/embedded/automotive/misra-c/chapter08-functions)
- [Ch 10 — 도구·인증](/blog/embedded/automotive/misra-c/chapter10-tools-certification)
- [CERT C Ch 8 — Memory](/blog/embedded/automotive/cert-c/chapter08-memory)
