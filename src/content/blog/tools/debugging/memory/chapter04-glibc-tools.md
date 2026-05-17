---
title: "Ch 4: glibc 자체 도구 — mtrace / mcheck / MALLOC_CHECK_"
date: 2025-09-07T04:00:00
description: "별 라이브러리 없이 glibc 만으로 메모리 디버깅. mtrace, mcheck, MALLOC_CHECK_."
tags: [memory, glibc, mtrace, mcheck, malloc-check]
series: "Memory Diagnostics"
seriesOrder: 4
draft: false
---

ASan·Valgrind·heaptrack을 못 쓰는 환경 (오래된 시스템, 빌드 도구 부재, 임베디드 등)에서 *glibc 자체*가 제공하는 도구들. 정밀도는 낮지만 *환경 변수 하나*로 켜고 끄는 단순함이 매력.

:::tldr
`MALLOC_CHECK_=3` → glibc malloc이 *간단한 corruption 검출*. `mtrace()` → 모든 alloc/free 로깅.
:::

## MALLOC_CHECK_

가장 단순. 환경 변수 한 줄로 *double-free·overflow*의 *기본 검사*.

```bash
$ MALLOC_CHECK_=3 ./myprog
malloc(): unaligned tcache chunk detected
Aborted
```

레벨:
- `MALLOC_CHECK_=0` — 비활성 (기본).
- `MALLOC_CHECK_=1` — 검출 시 stderr 출력.
- `MALLOC_CHECK_=2` — 검출 시 abort (core dump).
- `MALLOC_CHECK_=3` — 위 둘 다.

부하: *매우 작음* (10-20% 정도). 운영에 *상시 활성* 가능.

검출 가능한 것:
- Double-free
- 일부 buffer overflow (인접 chunk 메타 오염)
- 잘못된 포인터 free

검출 못 하는 것:
- 미세한 overflow (한 바이트)
- Use-after-free의 일부
- Leak

운영 환경의 *minimum safety net*.

## MALLOC_PERTURB_

새로 할당한 메모리·free된 메모리를 *특정 패턴*으로 채움 → 미초기화 사용 발견.

```bash
$ MALLOC_PERTURB_=0xAB ./myprog
```

- 새 malloc: `0xAB` 채움 → 미초기화 변수가 `0xAB`로.
- free: `~0xAB = 0x54` 채움 → use-after-free가 *눈에 띄는 garbage 값*.

```c
int *p = malloc(4);
printf("%x\n", *p);    // → abababab (미초기화)

free(p);
printf("%x\n", *p);    // → 54545454 (UAF)
```

`MALLOC_CHECK_`와 *함께* 활성화 권장.

## mtrace — 모든 alloc 로깅

```c
#include <mcheck.h>

int main() {
    mtrace();    // 시작
    // ... malloc/free 호출 ...
    muntrace();  // 종료
}
```

```bash
$ MALLOC_TRACE=/tmp/mtrace.log ./myprog
$ cat /tmp/mtrace.log
= Start
@ ./myprog:[0x40123a] + 0x556... 0x100
@ ./myprog:[0x40124a] + 0x557... 0x200
@ ./myprog:[0x40125a] - 0x556...
= End
```

기호:
- `+ <addr> <size>` — alloc
- `- <addr>` — free
- `< <addr>` — realloc 이전
- `> <addr> <size>` — realloc 이후

### 분석 — mtrace 명령

```bash
$ mtrace ./myprog /tmp/mtrace.log
- 0x00007f1234567890 Free 4 was never alloc'd
Memory not freed:
-----------------
   Address    Size     Caller
0x00005556789  0x100  at /home/me/myprog.c:42
0x00005557abc  0x200  at /home/me/myprog.c:60
```

해방 안 된 메모리 + 콜 사이트. *간단한 누수 검출*.

## mcheck

malloc 메타데이터의 *일관성 자동 검사*.

```c
#include <mcheck.h>

int main() {
    mcheck(NULL);    // 인자: NULL이면 abort, 함수 주면 콜백
    // ...
}
```

매 malloc/free 시 인접 chunk 헤더 검사. 매우 느림 (10-20x) — 디버그 빌드에만.

콜백 형식:
```c
void my_abort(enum mcheck_status status) {
    switch (status) {
    case MCHECK_FREE:  fprintf(stderr, "double free\n"); break;
    case MCHECK_HEAD:  fprintf(stderr, "header corruption\n"); break;
    case MCHECK_TAIL:  fprintf(stderr, "tail corruption\n"); break;
    }
}

mcheck(my_abort);
```

## mallinfo / mallinfo2 — 통계

```c
#include <malloc.h>

struct mallinfo2 mi = mallinfo2();
printf("Total allocated: %zu\n", mi.uordblks);
printf("Total free chunks: %zu\n", mi.fordblks);
printf("Total system bytes: %zu\n", mi.arena);
```

| 필드 | 의미 |
|------|------|
| `arena` | 총 heap 메모리 (brk + mmap) |
| `ordblks` | free chunk 개수 |
| `hblks` | mmap된 chunk 개수 |
| `hblkhd` | mmap 총 크기 |
| `uordblks` | 사용 중 메모리 |
| `fordblks` | free 메모리 |
| `keepcost` | 반환 가능한 *맨 뒤* 청크 |

서비스가 주기적으로 출력 → *RSS와 비교*.

```c
// 5초마다 dump
while (1) {
    struct mallinfo2 mi = mallinfo2();
    syslog(LOG_INFO, "heap: used=%zu free=%zu arena=%zu",
           mi.uordblks, mi.fordblks, mi.arena);
    sleep(5);
}
```

`mallinfo` (2 없는 옛 API)는 32-bit overflow. *수 GB 환경에선 mallinfo2 필수*.

## malloc_stats — 상세 통계

```c
malloc_stats();
```

```
Arena 0:
system bytes     =     135168
in use bytes     =      90112
Arena 1:
system bytes     =      69632
in use bytes     =      24576
Total (incl. mmap):
system bytes     =     204800
in use bytes     =     114688
max mmap regions =          5
max mmap bytes   =     262144
```

각 *arena*의 사용량. glibc는 *멀티 스레드 환경*에서 thread별 arena (보통 `8 × ncpus`).

## malloc_trim — OS에 반환

free된 *큰 chunk*도 OS에 자동 반환 안 됨 (fragmentation 우려). 명시적 반환:

```c
malloc_trim(0);    // 가능한 모든 영역 반환
```

장기 실행 서비스에서 *주기적 호출*로 RSS 감소. 다만 fragmentation에 따라 효과 미미.

```c
// 매 hour
while (1) {
    sleep(3600);
    malloc_trim(0);
}
```

## M_MMAP_THRESHOLD — 큰 alloc은 mmap으로

기본 128KB. 그 이상은 mmap → free 시 *즉시 OS 반환*.

```c
mallopt(M_MMAP_THRESHOLD, 64 * 1024);     // 64KB 이상 mmap
```

작게 하면 *RSS 감소* 하지만 alloc 속도 ↓ (mmap syscall 매번). 큰 alloc 많은 서비스에 유리.

## M_ARENA_MAX — Arena 수 제한

기본 `8 × ncpus`. 너무 많은 arena = *fragmentation* + *RSS 부풀어 보임*.

```bash
$ MALLOC_ARENA_MAX=2 ./myprog
```

또는:
```c
mallopt(M_ARENA_MAX, 2);
```

Java/Hadoop 환경에서 *RSS 감소 표준 trick*. 단일 스레드면 1.

## TCache — Thread Cache

glibc 2.26+의 thread-local cache. 각 스레드가 *작은 chunks*를 자체 cache. 더 빠르지만 *메모리 더 사용*.

```bash
$ GLIBC_TUNABLES="glibc.malloc.tcache_max=0" ./myprog   # 비활성
$ GLIBC_TUNABLES="glibc.malloc.tcache_count=128" ./myprog
```

## __malloc_hook (deprecated)

옛 방법으로 *malloc/free 가로채기*. C++에선 weak symbol override가 권장.

```c
// 함수 자체를 override
void *malloc(size_t size) {
    // 자체 로직
    static void *(*real_malloc)(size_t) = NULL;
    if (!real_malloc) real_malloc = dlsym(RTLD_NEXT, "malloc");
    void *p = real_malloc(size);
    fprintf(stderr, "malloc(%zu) = %p\n", size, p);
    return p;
}
```

heaptrack의 기본 메커니즘. 디버그 빌드의 *최소 누수 추적기*도 이렇게.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `MALLOC_CHECK_` 효과 없음 | secure execution mode (setuid). 보안상 무시 |
| `mtrace` 로그 안 만들어짐 | `MALLOC_TRACE` 환경 미설정 |
| mtrace 출력에 주소만 | 디버그 심볼 없음. `-g` 빌드 |
| `mcheck` 너무 느림 | 디버그 빌드에만 사용 |
| `mallinfo` overflow | 64-bit 환경에서 `mallinfo2` |
| `malloc_trim` 효과 없음 | fragmentation으로 인한 *non-trimable* |
| arena 너무 많음 | `MALLOC_ARENA_MAX` |

## 실전 흐름

```bash
# 1단계 — MALLOC_CHECK_으로 빠른 검사
$ MALLOC_CHECK_=3 ./myprog

# 2단계 — PERTURB로 UAF·미초기화 잡기
$ MALLOC_CHECK_=3 MALLOC_PERTURB_=0xAB ./myprog

# 3단계 — mtrace로 누수 위치
$ MALLOC_TRACE=/tmp/mt.log ./myprog
$ mtrace ./myprog /tmp/mt.log

# 4단계 — 안 잡히면 ASan/Valgrind/heaptrack
```

## 운영 — mallinfo2 모니터링

```c
// expose to Prometheus 등
double heap_used_bytes() {
    struct mallinfo2 mi = mallinfo2();
    return (double)mi.uordblks;
}
```

```bash
# 자체 dashboard
heap_used_bytes / total RSS 비율
heap_arena_bytes / 시간
```

큰 *gap*(RSS >> heap_used) 발견 시 fragmentation 의심 → arena 조정.

## 정리

- `MALLOC_CHECK_=3`이 *최소 안전망*.
- `MALLOC_PERTURB_`로 UAF·미초기화 가시화.
- `mtrace()`로 alloc/free 로깅 → mtrace 명령으로 분석.
- `mcheck()`로 메타 일관성 자동 검사 (느림).
- `mallinfo2()` + `malloc_stats()`로 통계.
- `malloc_trim(0)`으로 OS 반환.
- `MALLOC_ARENA_MAX`로 arena 제한 → RSS 감소.
- LD_PRELOAD malloc override로 *자체 도구* 작성 가능.

## 다음 장 예고

Ch 5 (마지막) — 운영 메모리 누수 진단. 장기 실행 서비스에 *상시 모니터링* 셋업.

## 관련 항목

- [Ch 3: jemalloc / tcmalloc](/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc)
- [Ch 5: 운영 누수 진단](/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis)
- [Sanitizers Ch 1: ASan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind Ch 1: Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- `man 3 malloc_hook`, `man 3 mtrace`, `man 3 mcheck`
- `man 1 mtrace`
- [glibc malloc tunables](https://www.gnu.org/software/libc/manual/html_node/Memory-Allocation-Tunables.html)
