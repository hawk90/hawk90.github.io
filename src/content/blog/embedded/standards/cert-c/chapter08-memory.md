---
title: "Ch 8: MEM — malloc/free, double free, use-after-free, 누수"
date: 2025-09-10T09:00:00
description: "MEM30~36 — heap exploitation의 모든 단골 패턴과 차단 방법. ASan, mimalloc, hardened malloc."
tags: [cert-c, memory, malloc, double-free, use-after-free, asan, cwe-416]
series: "CERT C"
seriesOrder: 8
draft: false
---

heap 메모리 관리 버그는 *exploit의 최대 단골*이다. *Heap Feng Shui*, *Use-After-Free*, *Double Free*, *Heap Spray* 모두 같은 카테고리의 변종이다. MEM 카테고리는 이 패밀리 전체를 다룬다.

## MEM30-C — free된 메모리 *접근 금지*(Use-After-Free)

```c
char *p = malloc(100);
free(p);
*p = 'A';            // 위반 — UAF
strcpy(p, "abc");    // 위반 — UAF
```

`free` 후 `p`는 *dangling pointer*. 그 메모리는 *다른 객체에 재할당*될 수 있고, *접근하면 임의 데이터 읽기/쓰기*가 된다.

대응:

```c
free(p);
p = NULL;            // free 후 NULL로 — 다음 접근이 즉시 crash
```

NULL deref는 *즉시 SIGSEGV*로 명확한 사고. UAF는 *조용히 동작하다가 나중에 깨지는* 사고. 즉시 발견되는 NULL deref가 낫다.

GCC 13+ / Clang는 `attribute_clean`으로 *블록 끝에 자동 NULL set*도 가능. 함수 wrapper로:

```c
#define FREE_AND_NULL(p) do { free(p); (p) = NULL; } while (0)
```

## MEM31-C — heap 메모리는 *정확히 한 번* free (Double Free)

```c
char *p = malloc(100);
free(p);
free(p);             // 위반 — double free
```

`free`가 *내부 heap 메타데이터를 손상*시킬 수 있다. 공격자가 heap allocator의 *free list*를 조작해 *임의 주소에 쓰기*까지 가능(*House of Force*, *unlink* 공격).

```c
// 클래식 더블 free 패턴
int Process(void) {
    char *p = malloc(100);
    if (Setup(p) < 0) {
        free(p);
        return -1;       // OK
    }
    // ... 더 많은 작업 ...
    free(p);
    return 0;
}

void Cleanup(void) {
    if (g_state == ERROR) {
        free(p);          // 위반 — 이미 위에서 free됨
    }
}
```

원인: *오너십 정책 부재*. *누가 free하느냐*가 명확하지 않으면 여러 곳에서 시도.

```c
// Good — 소유권 명확
typedef struct {
    char *data;
    size_t len;
} buffer_t;

void buffer_init(buffer_t *b, size_t n) {
    b->data = malloc(n);
    b->len = n;
}

void buffer_destroy(buffer_t *b) {
    free(b->data);
    b->data = NULL;
    b->len = 0;
}
```

## MEM34-C — 동적 할당된 메모리만 free

```c
char buf[100];
free(buf);           // 위반 — 스택 변수에 free

char *p = "hello";
free(p);             // 위반 — 문자열 리터럴 (read-only segment)

char *q = malloc(100);
char *r = q + 10;
free(r);             // 위반 — malloc 반환값이 아님
```

allocator는 *자기가 준 포인터만* free 가능. 다른 것은 *heap 구조 손상*.

## MEM35-C — 충분한 크기 할당

```c
size_t n = strlen(input);
char *buf = malloc(n);              // 위반 — null 종결 공간 누락
strcpy(buf, input);

// Good
char *buf = malloc(n + 1);
```

문자열은 `+1`, 구조체 + 배열은 *sizeof(struct) + size_of_array* 등.

## MEM36-C — `realloc`의 *정렬 보존*

```c
struct alignas(16) Big { /* ... */ } *p = aligned_alloc(16, sizeof(*p));
struct Big *q = realloc(p, sizeof(*p) * 2);   // 위반? — realloc 정렬 보장 X
```

표준 `realloc`은 *기본 정렬(보통 `_Alignof(max_align_t)`)*만 보장. 더 큰 정렬은 보장 안 됨. SIMD 벡터·DMA 버퍼는 직접 처리.

## MEM33-C — Flexible array member alloc

C99 FAM은 `sizeof(struct)` *외에* 배열 공간을 추가로.

```c
struct Buffer {
    size_t len;
    char data[];
};

// 위반
struct Buffer *b = malloc(sizeof(struct Buffer));   // data 공간 0

// Good
struct Buffer *b = malloc(sizeof(struct Buffer) + 100);
b->len = 100;
```

## MEM07-C — `calloc` overflow 검사 (Recommendation)

`calloc(nmemb, size)`는 *표준이 overflow 검사 보장* (C11부터 명시).

```c
// 권장
void *p = calloc(nmemb, size);
if (p == NULL) {
    // overflow 또는 OOM
}
```

vs `malloc(nmemb * size)`는 *직접 overflow*. INT 카테고리의 곱셈 함정.

## MEM10-C — Allocator pointer 유효성 검사

```c
void *p = malloc(n);
if (p == NULL) {
    return -ENOMEM;
}
```

*항상* 검사. 임베디드는 OOM이 흔하다.

## MEM11-C — `realloc` 반환값 *별도 변수에 받기*

```c
// 위반
p = realloc(p, n);
if (p == NULL) { /* 원본 p 잃었음 */ }

// Good
void *tmp = realloc(p, n);
if (tmp == NULL) {
    // 원본 p는 여전히 유효 — 정리 후 에러 반환
    free(p);
    return -ENOMEM;
}
p = tmp;
```

`realloc`이 *실패하면 원본은 유지*된다. 같은 변수에 직접 할당하면 *실패 시 원본을 잃고* 누수.

## MEM12-C — 메모리 종류별 *적절한 함수 사용*

```c
char *p = malloc(100);
delete p;            // 위반 — C++ new와 짝
char *q = new char[100];
free(q);             // 위반 — C malloc과 짝
```

C와 C++ 혼용 코드에서 흔히. *언어별 alloc/free* 짝맞춤.

## Use-After-Free의 실전 패턴

```c
// 패턴 1 — 콜백 등록 후 free
void on_event(struct Event *e) {
    do_work(e);
}

struct Event *e = malloc(sizeof(*e));
register_callback(on_event, e);
// ... 시간 흐름 ...
free(e);
// 콜백이 다시 호출되면 UAF
```

```c
// 패턴 2 — 컨테이너에서 객체 제거 후 사용
list_remove(list, item);
free(item);
// 다른 곳에 item 참조가 남아 있으면 UAF
```

```c
// 패턴 3 — 에러 경로
char *buf = malloc(n);
if (init(buf) < 0) {
    free(buf);
    log_error("init failed: %p", buf);   // 위반 — free 후 buf 사용
    return -1;
}
```

대응: *오너십 추적 명확화*, *RAII-style cleanup*, *reference counting*.

## 누수(Memory Leak) — MEM31의 다른 측면

```c
char *p = malloc(100);
if (cond) return -1;     // 위반 — 누수
free(p);
return 0;
```

각 *에러 경로*에서 free 호출. *goto cleanup* 패턴이 가장 깔끔.

```c
int Process(void) {
    char *p = NULL;
    int rc = -1;

    p = malloc(100);
    if (p == NULL) goto cleanup;

    if (cond) goto cleanup;
    if (more_work(p) < 0) goto cleanup;

    rc = 0;
cleanup:
    free(p);
    return rc;
}
```

## 임베디드 — 동적 메모리 회피

MISRA Rule 21.3은 *malloc 완전 금지*다. CERT는 *조심해서 사용*이다. 임베디드는 *MISRA 입장 채택*이 일반적.

대안:

- **정적 풀** — 컴파일 타임 결정 크기.
- **arena allocator** — 한 시점에 한꺼번에 reset.
- **slab allocator** — 같은 크기 객체 효율적.

```c
// arena 예
typedef struct {
    char *base;
    size_t size;
    size_t used;
} arena_t;

void *arena_alloc(arena_t *a, size_t n) {
    if (a->used + n > a->size) return NULL;
    void *p = a->base + a->used;
    a->used += (n + 7) & ~7;     // 8 byte align
    return p;
}

void arena_reset(arena_t *a) {
    a->used = 0;     // 한꺼번에 무효화
}
```

## 도구 — UAF·Double Free 검출

| 도구 | 기능 |
|------|------|
| **AddressSanitizer (ASan)** | UAF, double free, heap overflow, leak 모두 검출 |
| **Valgrind Memcheck** | UAF, leak, uninitialized read |
| **MemorySanitizer (MSan)** | 미초기화 메모리 사용 |
| **mimalloc / hardened_malloc** | 운영용 hardening allocator |

```bash
gcc -fsanitize=address -g source.c -o app
./app
# UAF 발생 시 즉시 detail 출력
```

ASan은 *런타임 검사*이므로 *테스트 단계*에서. 운영 빌드는 *hardened allocator*.

## CVE 사례

```
2014 — Heartbleed (CVE-2014-0160)
       OpenSSL malloc 영역 OOB read → 비밀 노출

2018 — Chrome Use-After-Free (CVE-2018-6056)
       Background tab의 dangling reference → RCE

2021 — Linux Sequence File UAF (CVE-2021-0920)
       Garbage collection race → kernel UAF → LPE
```

heap 버그는 *Tier 1 취약점*. *exploit가 검출 회피까지* 가능해 *최고 위험도*.

## 정리

- `free` 후 *NULL set* — UAF를 NULL deref로 변환해 즉시 발견.
- 소유권 정책 명확 — *누가 free하느냐* 한 곳만.
- `realloc` 반환은 *별도 변수*에 받아 실패 시 원본 보존.
- `calloc`은 *overflow 검사 보장* — 곱셈 결과 크기에 우선.
- 에러 경로에서 *cleanup* — goto 또는 명시 cleanup.
- 임베디드는 *정적 풀, arena, slab*으로 heap 회피.
- ASan/Valgrind로 *테스트 단계 검출*. 운영은 hardened allocator.

## 다음 장 예고

9장은 FIO, ENV, SIG — 파일 입출력, 환경 변수, 시그널의 보안. TOCTOU race, 권한 상승, signal handler 안전성.

## 관련 항목

- [Ch 7 — Arrays & Strings](/blog/embedded/standards/cert-c/chapter07-arrays-strings)
- [Ch 9 — I/O, ENV, Signals](/blog/embedded/standards/cert-c/chapter09-io-env-signals)
- [CWE-416 Use After Free](https://cwe.mitre.org/data/definitions/416.html)
- [CWE-415 Double Free](https://cwe.mitre.org/data/definitions/415.html)
