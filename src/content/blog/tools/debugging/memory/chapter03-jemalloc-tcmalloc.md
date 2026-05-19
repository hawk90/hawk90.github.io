---
title: "Ch 3: jemalloc / tcmalloc Profiling"
date: 2026-05-17T03:00:00
description: "표준 glibc malloc 대체 + 내장 profiler. pprof로 시각화."
tags: [memory, jemalloc, tcmalloc, malloc, pprof]
series: "Memory Diagnostics"
seriesOrder: 3
draft: false
---

glibc의 ptmalloc은 *멀티스레드 환경*에서 lock 경합·heap fragmentation으로 *수십 % 메모리 낭비*가 흔합니다. **jemalloc** (Facebook/Mozilla)과 **tcmalloc** (Google)이 *더 효율적인 대체*이자 *내장 profiler*까지 제공.

:::tldr
`LD_PRELOAD=libjemalloc.so` → 더 적은 메모리 + heap profiling. `MALLOC_CONF`로 옵션, `jeprof`로 분석.
:::

## 왜 대체 malloc인가

| | glibc ptmalloc | jemalloc | tcmalloc |
|---|----------------|----------|----------|
| Thread-local cache | (없음, arena 분리) | 있음 (TCache) | 있음 (TLS) |
| Fragmentation | 보통 | 적음 | 적음 |
| Multi-thread 성능 | 보통 | 빠름 | 매우 빠름 |
| Memory return to OS | 보수적 | 적극 (madvise MADV_DONTNEED) | 적극 |
| Profiler 내장 | 없음 | jeprof | pprof |
| 출처 | glibc | Facebook | Google |
| 라이센스 | LGPL | BSD | BSD |

큰 서버 (Redis, Cassandra, Elasticsearch 등) 대부분이 jemalloc 사용. *동일 코드인데 메모리 30-50% 감소* 사례 많음.

## jemalloc

### 설치

```bash
# Fedora
$ sudo dnf install jemalloc jemalloc-devel

# Ubuntu
$ sudo apt install libjemalloc2 libjemalloc-dev

# 빌드 (옵션 customize)
$ git clone https://github.com/jemalloc/jemalloc.git
$ cd jemalloc
$ ./autogen.sh --enable-prof --enable-stats
$ make && sudo make install
```

`--enable-prof`가 *필수* (profiling 기능). 배포판 패키지는 보통 *이미 활성*.

### 활용 — LD_PRELOAD

```bash
$ LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2 ./myprog
[프로그램은 평소대로, malloc만 교체]
```

또는 컴파일 시:
```bash
$ gcc myprog.c -ljemalloc
```

### MALLOC_CONF — 설정

```bash
# 통계 활성화
$ MALLOC_CONF="stats_print:true" LD_PRELOAD=... ./myprog
[종료 시 상세 통계]

# Profiling 활성화
$ MALLOC_CONF="prof:true,prof_active:true,prof_prefix:jeprof.out" \
    LD_PRELOAD=... ./myprog
[jeprof.out.<pid>.<n>.heap 파일들 생성]

# 더 많은 옵션
$ MALLOC_CONF="prof:true,lg_prof_sample:19,prof_active:true" \
    LD_PRELOAD=... ./myprog
# lg_prof_sample=19 → 2^19 = 512KB마다 샘플
```

| Option | 의미 |
|--------|------|
| `prof` | profiling 활성화 |
| `prof_active` | 시작 시 active (false면 mallctl로 켜기) |
| `prof_prefix` | dump 파일 접두사 |
| `lg_prof_sample` | log2 샘플 주기 (기본 19 = 512KB) |
| `prof_leak` | 종료 시 leak 자동 dump |
| `stats_print` | 종료 시 통계 출력 |
| `background_thread` | 백그라운드 reclaim 스레드 |
| `narenas` | arena 개수 (기본 4 × CPU) |

### jeprof — 분석

```bash
$ jeprof --show_bytes --pdf ./myprog jeprof.out.12345.0.heap > heap.pdf
$ jeprof --text ./myprog jeprof.out.12345.0.heap | head
Total: 134.5 MB
70.0  52.0%  52.0%  70.0  52.0% Cache::add cache.cpp:23
30.0  22.3%  74.3%  30.0  22.3% std::vector::reserve vector.h:281
20.0  14.9%  89.1%  20.0  14.9% Logger::format logger.cpp:50
...
```

`pprof` 명령과 같은 인터페이스 (Google에서 pprof를 분리해 *언어/도구별*로 재구현).

### 시각화

```bash
# Web UI
$ jeprof --web ./myprog jeprof.out.12345.0.heap
[브라우저에 콜그래프]

# Flame graph
$ jeprof --collapsed ./myprog jeprof.out.12345.0.heap > out.collapsed
$ flamegraph.pl out.collapsed > flame.svg
```

### 두 시점 비교

```bash
$ jeprof --text --base=jeprof.out.12345.0.heap \
    ./myprog jeprof.out.12345.20.heap
[20번째와 0번째의 차이 — 무엇이 누수]
```

운영에서 *주기적 dump* + diff로 누수 추적.

### 런타임 mallctl

코드에서 동적 제어:

```c
#include <jemalloc/jemalloc.h>

// 통계 dump
mallctl("prof.dump", NULL, NULL, NULL, 0);

// active toggle
bool active = true;
mallctl("prof.active", NULL, NULL, &active, sizeof(active));

// 통계 읽기
size_t allocated;
size_t sz = sizeof(allocated);
mallctl("stats.allocated", &allocated, &sz, NULL, 0);
printf("allocated: %zu bytes\n", allocated);
```

SIGUSR signal handler로 *외부에서 dump 트리거* 패턴.

## tcmalloc

Google의 thread-caching malloc.

### 설치

```bash
# Fedora
$ sudo dnf install gperftools gperftools-devel

# Ubuntu
$ sudo apt install libtcmalloc-minimal4 libgoogle-perftools-dev

# 빌드
$ git clone https://github.com/gperftools/gperftools.git
$ cd gperftools && ./autogen.sh && ./configure && make
```

### 활용

```bash
$ LD_PRELOAD=/usr/lib/libtcmalloc.so.4 ./myprog

# 또는 컴파일 시
$ gcc myprog.c -ltcmalloc
```

### Heap profiler

```bash
$ HEAPPROFILE=/tmp/myprog.hprof \
  LD_PRELOAD=/usr/lib/libtcmalloc.so ./myprog
[/tmp/myprog.hprof.0001.heap 등 생성]
```

기본: *1GB alloc마다* dump. 옵션:
- `HEAP_PROFILE_ALLOCATION_INTERVAL=104857600` (100MB)
- `HEAP_PROFILE_TIME_INTERVAL=60` (60초)

### pprof 분석

```bash
$ google-pprof --text ./myprog /tmp/myprog.hprof.0001.heap
$ google-pprof --pdf ./myprog /tmp/myprog.hprof.0001.heap > heap.pdf
$ google-pprof --web ./myprog /tmp/myprog.hprof.0001.heap
```

google-pprof = jeprof의 *원본*. 같은 인터페이스.

### CPU profiler — bonus

tcmalloc은 *CPU profiler*도.

```bash
$ CPUPROFILE=/tmp/myprog.prof LD_PRELOAD=... ./myprog
$ google-pprof --pdf ./myprog /tmp/myprog.prof > cpu.pdf
```

별 도구 (perf, py-spy) 가능. 통합 환경 원할 때 tcmalloc.

## jemalloc vs tcmalloc 선택

| 상황 | 권장 |
|------|------|
| 큰 RAM (10GB+), high alloc rate | jemalloc |
| 작은 RAM, latency 민감 | tcmalloc |
| Redis, Cassandra, Rust | jemalloc (이미 통합) |
| Chrome, Bazel, Go-internal | tcmalloc |
| 운영 monitoring 통합 | tcmalloc (pprof Go ecosystem) |
| 깊은 fragmentation 분석 | jemalloc (stats_print 풍부) |

대부분의 경우 *둘 중 무엇이든* glibc보다 나음. 측정해 선택.

## Rust + jemalloc

Rust는 *기본 system allocator*(glibc/musl). jemalloc 선호 시:

```rust
// Cargo.toml
[dependencies]
tikv-jemallocator = "0.5"

// main.rs
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;
```

`tikv-jemallocator`가 가장 많이 쓰이는 crate (TiDB/PingCAP 출신). profiling crate `jemalloc_pprof`도.

## Go — built-in pprof

Go는 *자체 GC + 자체 allocator*. malloc 교체 안 함. 대신 `runtime/pprof`가 내장.

```go
import _ "net/http/pprof"

go http.ListenAndServe(":6060", nil)

// 외부에서
$ go tool pprof http://localhost:6060/debug/pprof/heap
$ go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
```

같은 pprof 도구. Google 안에선 *모든 언어가 pprof*.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `prof:true` 효과 없음 | 빌드 시 `--enable-prof` 빠짐 |
| jeprof not found | 별 패키지. `libjemalloc-dev` |
| pprof not found | `gperftools-devel` 또는 `go-pprof` |
| Symbol 없음 | binary가 stripped. `-g` 빌드 |
| 출력 파일 안 만들어짐 | `prof_prefix` 디렉터리 쓰기 권한 |
| Fragmentation 여전 | `narenas`/`background_thread` 옵션 조정 |
| Rust 빌드에 적용 안 됨 | 기본 allocator 명시 안 함 |

## 운영 환경 흐름

1. *glibc malloc*으로 시작 (기본).
2. 메모리 사용 큼 + lock 경합 의심 → **jemalloc 교체**.
3. 누수 의심 → `MALLOC_CONF="prof:true"`로 *상시 활성*.
4. 주기적으로 `jeprof.out.*` dump.
5. 두 시점 diff로 *누수 위치 식별*.
6. 코드 수정 → 다시 dump 비교로 검증.

## 정리

- jemalloc/tcmalloc이 glibc보다 *멀티스레드 효율적*.
- LD_PRELOAD로 교체. 컴파일러 옵션도 가능.
- 내장 profiler → jeprof / pprof / google-pprof.
- 두 시점 dump diff로 누수 추적.
- Rust는 `tikv-jemallocator` crate.
- Go는 자체 pprof.
- 운영에 *상시 활성* 가능한 정도의 부하.

## 다음 장 예고

Ch 4 — glibc 자체 도구: mtrace, mcheck, MALLOC_CHECK_. 별 라이브러리 없이 *glibc만으로* 디버깅.

## 관련 항목

- [Ch 2: heaptrack](/blog/tools/debugging/memory/chapter02-heaptrack)
- [Ch 4: glibc mtrace / mcheck](/blog/tools/debugging/memory/chapter04-glibc-tools)
- [Sanitizers Ch 1: AddressSanitizer](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind Ch 1: Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- [jemalloc 공식](https://jemalloc.net/)
- [gperftools (tcmalloc)](https://github.com/gperftools/gperftools)
- [pprof](https://github.com/google/pprof)
