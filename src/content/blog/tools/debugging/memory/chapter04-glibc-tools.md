---
title: "glibc 메모리 도구 — mtrace·mcheck·MALLOC_CHECK_"
slug: "tools/debugging/memory/chapter04-glibc-tools"
date: 2026-05-31T09:04:00
description: "glibc 버전별 debug-library 조건과 mtrace·mcheck·malloc 통계 기능의 진단 범위."
tags: [memory, glibc, mtrace, mcheck, malloc-check]
series: "Memory Diagnostics"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

glibc의 malloc 진단 기능은 버전과 설치된 debug library에 따라 사용할 수 있는 방식이 다릅니다. 특히 glibc 2.34 이후 `MALLOC_CHECK_`·`mtrace`·`mcheck` 기능은 기본 libc에서 비활성화되어 있으므로, 해당 시스템의 `libc_malloc_debug` 지원과 로딩 방법을 먼저 확인합니다.

:::tldr
지원되는 glibc에서 debug library를 preload한 뒤 `MALLOC_CHECK_`로 단순 heap 오류 검사를 켤 수 있습니다. `mtrace()`는 alloc/free 추적이며 정상 운영에는 켜 두지 않습니다.
:::

## MALLOC_CHECK_

지원되는 glibc에서 debug library를 preload하고 환경 변수로 *일부 heap 오류 검사*를 켭니다.

```bash
$ LD_PRELOAD=libc_malloc_debug.so MALLOC_CHECK_=3 ./myprog
```

`MALLOC_CHECK_`의 숫자를 1/2/3으로 나눠 서로 다른 출력·중단 동작이라고 해석하지 않습니다. 현재 glibc 매뉴얼은 0이 아닌 4 미만 값을 검사 모드 선택으로 설명하며, 검출 시 프로세스가 종료될 수 있습니다. preload하지 않으면 설정이 효과가 없을 수 있습니다.

이 검사는 일반 allocator보다 비효율적일 수 있고, 프로세스 동작을 바꿉니다. 오버헤드는 직접 측정하고 재현/진단 세션에서 제한적으로 사용합니다.

검사는 단순 heap corruption 일부를 탐지하도록 설계됐지만 모든 오류를 잡지 않으며, 메모리 안전성 도구나 leak detector를 대체하지 않습니다.

## MALLOC_PERTURB_

새로 할당한 메모리·free된 메모리를 *특정 패턴*으로 채움 → 미초기화 사용 발견.

```bash
$ MALLOC_PERTURB_=0xAB ./myprog
```

- 할당·해제 메모리는 설정값에 따라 패턴으로 채워질 수 있어 미초기화 읽기나 해제 후 접근을 드러내는 데 도움을 줍니다. 정확한 바이트 패턴은 glibc 구현과 설정을 확인해야 하며, 이 기법은 UAF를 안전하게 검출하거나 재현을 보장하지 않습니다.

패턴을 읽는 코드는 초기화되지 않은 메모리를 읽거나 해제 후 메모리에 접근하는 undefined behavior가 될 수 있습니다. 오류를 재현하려고 그런 코드를 실행하지 말고 sanitizer 등 안전한 진단 도구를 사용합니다.

## mtrace — malloc/free 추적 기록

```c
#include <mcheck.h>

int main() {
    mtrace();    // 시작
    // ... malloc/free 호출 ...
    muntrace();  // 종료
}
```

실행 시 `LD_PRELOAD=libc_malloc_debug.so`와 `MALLOC_TRACE`를 함께 설정합니다. 다음은 추적 파일 형식을 설명하는 축약 예시이며 주소와 호출자 표기는 실행마다 달라집니다.

```text
= Start
@ ./myprog:[caller] + <address> <size>
@ ./myprog:[caller] - <address>
= End
```

glibc 2.34 이상에서는 `mtrace()`도 debug library가 필요합니다. `MALLOC_TRACE`는 추적 파일을 가리키며, 이 모드는 할당 호출을 기록해 비용이 있으므로 민감한 서비스에서 상시 켜지 않습니다.

기호:
- `+ <addr> <size>` — alloc
- `- <addr>` — free
- `< <addr>` — realloc 이전
- `> <addr> <size>` — realloc 이후

### 분석 — mtrace 명령

```bash
$ mtrace ./myprog /tmp/mtrace.log
```

결과는 버전과 실행에 따라 달라지며 다음 형식은 축약 예시입니다.

```text
- 0x00007f1234567890 Free 4 was never alloc'd
Memory not freed:
-----------------
   Address    Size     Caller
0x00005556789  0x100  at /home/me/myprog.c:42
0x00005557abc  0x200  at /home/me/myprog.c:60
```

추적 시점에 남은 allocation과 호출 지점을 찾는 데 씁니다. 프로세스 종료 시 해제되지 않았다는 사실만으로 논리적 누수를 확정하지 않습니다.

## mcheck

malloc 메타데이터의 *일관성 검사*입니다. `mcheck()`는 첫 malloc 호출 전에 활성화해야 합니다. debug library/링크 조건을 확인하고 진단 빌드에서만 사용합니다.

```c
#include <mcheck.h>

int main() {
    mcheck(NULL);    // 인자: NULL이면 abort, 함수 주면 콜백
    // ...
}
```

`mcheck()`는 할당 블록 경계의 일부 손상을 검사합니다. 매 할당/해제마다 모든 메모리 경계를 검사하는 도구로 이해하면 안 됩니다.

콜백 형식:
```c
void my_abort(enum mcheck_status status) {
    switch (status) {
    case MCHECK_FREE:  fprintf(stderr, "double free\n"); break;
    case MCHECK_HEAD:  fprintf(stderr, "header corruption\n"); break;
    case MCHECK_TAIL:  fprintf(stderr, "tail corruption\n"); break;
    case MCHECK_DISABLED: fprintf(stderr, "mcheck was enabled too late\n"); break;
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
| `arena` | non-mmap arena가 시스템에서 받은 메모리 |
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

```text
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

각 *arena*의 사용량입니다. arena 수는 glibc 버전, CPU 수, tunable과 workload의 영향을 받으므로 스레드마다 하나이거나 고정된 `8 × ncpus`라고 단정하지 않습니다.

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

기본 임계값은 보통 128 KiB에서 출발하지만 glibc가 allocation 패턴에 맞춰 동적으로 조정할 수 있습니다. mmap으로 할당된 블록은 free 시 unmap 대상이 되지만, 임계값만 조정해 전체 RSS 감소를 보장할 수는 없습니다.

```c
mallopt(M_MMAP_THRESHOLD, 64 * 1024);     // 64KB 이상 mmap
```

작게 하면 *RSS 감소* 하지만 alloc 속도 ↓ (mmap syscall 매번). 큰 alloc 많은 서비스에 유리.

## M_ARENA_MAX — Arena 수 제한

기본 arena 한도는 시스템 CPU 수와 glibc 버전/설정의 영향을 받습니다. arena 수를 줄이면 lock 경합과 메모리 사용 양쪽이 달라질 수 있으므로 측정 없이 고정값을 적용하지 않습니다.

```bash
$ MALLOC_ARENA_MAX=2 ./myprog
```

또는:
```c
mallopt(M_ARENA_MAX, 2);
```

arena 수 제한은 lock contention과 메모리 보유량을 함께 바꿉니다. 특정 Java/Hadoop 값이나 단일 스레드 최적값을 보편 규칙으로 쓰지 말고 workload에서 검증합니다.

## TCache — Thread Cache

glibc 2.26+의 thread-local cache. 각 스레드가 *작은 chunks*를 자체 cache. 더 빠르지만 *메모리 더 사용*.

```bash
$ GLIBC_TUNABLES="glibc.malloc.tcache_max=0" ./myprog   # 비활성
$ GLIBC_TUNABLES="glibc.malloc.tcache_count=128" ./myprog
```

## `__malloc_hook`과 allocator interposition

`__malloc_hook` 계열은 glibc 2.34에서 제거된 호환 심볼이며 새 추적기의 구현 예제로 권장하지 않습니다. `LD_PRELOAD`로 allocator를 가로채는 코드는 재진입·스레드 안전·로더 초기화 문제를 직접 다뤄야 하므로, 직접 구현 대신 heaptrack 등 유지되는 도구를 사용합니다.

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
$ LD_PRELOAD=libc_malloc_debug.so MALLOC_CHECK_=3 ./myprog

# 2단계 — PERTURB로 UAF·미초기화 잡기
$ LD_PRELOAD=libc_malloc_debug.so MALLOC_CHECK_=3 MALLOC_PERTURB_=0xAB ./myprog

# 3단계 — mtrace로 누수 위치
$ LD_PRELOAD=libc_malloc_debug.so MALLOC_TRACE=/tmp/mt.log ./myprog
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

- `MALLOC_CHECK_`는 버전·debug-library 조건을 확인할 진단 기능이며 일반적인 안전망으로 간주하지 않습니다.
- `MALLOC_PERTURB_`로 UAF·미초기화 가시화.
- `mtrace()`로 alloc/free 로깅 → mtrace 명령으로 분석.
- `mcheck()`로 메타 일관성 자동 검사 (느림).
- `mallinfo2()` + `malloc_stats()`로 통계.
- `malloc_trim(0)`으로 OS 반환.
- `MALLOC_ARENA_MAX`로 arena 제한 → RSS 감소.
- `__malloc_hook` 기반 코드는 현재 glibc용 신규 계측 방식으로 권장하지 않습니다.

## 다음 장 예고

Ch 5 — 운영 메모리 누수 진단. 장기 실행 서비스에서 관찰 지표와 표본 수집을 조합합니다.

## 관련 항목

- [Ch 3: jemalloc / tcmalloc](/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc)
- [Ch 5: 운영 누수 진단](/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis)
- [Sanitizers Ch 1: ASan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind Ch 1: Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- `man 3 malloc_hook`, `man 3 mtrace`, `man 3 mcheck`
- `man 1 mtrace`
- [glibc malloc tunables](https://www.gnu.org/software/libc/manual/html_node/Memory-Allocation-Tunables.html)
- [glibc malloc debugging and tracing](https://sourceware.org/glibc/manual/latest/html_node/Heap-Consistency-Checking.html)
- [glibc memory tracing](https://sourceware.org/glibc/manual/latest/html_node/Tracing-malloc.html)
