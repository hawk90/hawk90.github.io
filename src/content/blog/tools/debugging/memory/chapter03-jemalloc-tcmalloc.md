---
title: "jemalloc·tcmalloc Profiling — 운영 allocator의 진단 기능"
slug: "tools/debugging/memory/chapter03-jemalloc-tcmalloc"
date: 2026-05-31T09:03:00
description: "표준 glibc malloc 대체 + 내장 profiler. pprof로 시각화."
tags: [memory, jemalloc, tcmalloc, malloc, pprof]
series: "Memory Diagnostics"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

glibc malloc, jemalloc, tcmalloc은 동시성·메모리 반환·계측에서 서로 다른 정책을 사용합니다. 어느 allocator가 더 빠르거나 메모리를 덜 쓰는지는 할당 크기 분포와 workload에 따라 달라집니다. 먼저 대표 부하에서 지연, RSS, allocator 통계를 비교하고, 프로파일링 기능은 해당 빌드 설정과 런타임 지원을 확인합니다.

:::tldr
`LD_PRELOAD=libjemalloc.so` → 프로세스 allocator 교체. `MALLOC_CONF`와 프로파일러 옵션은 사용 중인 jemalloc 빌드·버전에서 확인하고 `jeprof`로 분석.
:::

## 왜 대체 malloc인가

| | glibc ptmalloc | jemalloc | tcmalloc |
|---|----------------|----------|----------|
| Thread-local cache | tcache 지원 (설정·버전 영향) | 있음 (tcache) | 버전·구현별 차이 |
| Fragmentation | workload 의존 | workload 의존 | workload 의존 |
| Multi-thread 성능 | workload 의존 | workload 의존 | workload 의존 |
| Memory return to OS | tunable·상태 의존 | 설정·버전 의존 | 설정·버전 의존 |
| Profiler | 별도 도구 사용 | profiling 빌드에서 jeprof | gperftools 빌드의 heap profiler |
| 출처 | glibc | Facebook | Google |
| 라이센스 | LGPL | BSD | BSD |

일부 서버는 특정 allocator를 내장하거나 권장하지만, 제품마다 빌드 옵션과 버전이 다릅니다. 유명 서비스 사용 사례나 고정 절감 비율을 다른 애플리케이션의 성능 근거로 일반화하지 않습니다.

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
# lg_prof_sample=19은 약 2^19 바이트 규모를 기준으로 한 통계적 샘플링 설정입니다.
```

| Option | 의미 |
|--------|------|
| `prof` | profiling 활성화 |
| `prof_active` | 시작 시 active (false면 mallctl로 켜기) |
| `prof_prefix` | dump 파일 접두사 |
| `lg_prof_sample` | log2 기준 샘플링 간격 (빌드·설정에 따라 기본값 확인) |
| `prof_leak` | 종료 시 leak 자동 dump |
| `stats_print` | 종료 시 통계 출력 |
| `background_thread` | 백그라운드 reclaim 스레드 |
| `narenas` | arena 개수. 기본값은 jemalloc 버전·빌드와 CPU 설정에서 확인 |

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

예시 코드는 반환값 처리를 생략했습니다. 실제 앱에서는 `mallctl()` 오류를 검사하고, 해당 통계가 활성화된 jemalloc build인지 확인합니다.

`mallctl()`의 반환값을 확인합니다. signal handler에서 직접 호출하지 말고, handler가 안전한 flag를 설정한 뒤 일반 실행 흐름에서 dump를 수행합니다.

## gperftools TCMalloc

이 절의 `HEAPPROFILE`·`google-pprof` 예제는 gperftools의 TCMalloc heap profiler를 가리킵니다. Google의 별도 TCMalloc 프로젝트는 API와 도구가 다를 수 있으므로 두 구현을 같은 설치물로 취급하지 않습니다.

### 설치

```bash
# Fedora
$ sudo dnf install gperftools gperftools-devel

# Ubuntu
$ sudo apt install libgoogle-perftools-dev

# 빌드
$ git clone https://github.com/gperftools/gperftools.git
$ cd gperftools && ./autogen.sh && ./configure && make
```

### 활용

```bash
$ LD_PRELOAD=/path/to/full/libtcmalloc.so ./myprog

# 또는 컴파일 시
$ gcc myprog.c -ltcmalloc
```

### Heap profiler

```bash
$ HEAPPROFILE=/tmp/myprog.hprof \
  LD_PRELOAD=/path/to/full/libtcmalloc.so ./myprog
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

`google-pprof`는 gperftools profile을 분석합니다. jemalloc profile은 파일 형식과 `jeprof` 도구를 사용하므로 서로 교환 가능한 동일 인터페이스라고 단정하지 않습니다.

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
| 높은 allocation rate | 대표 workload에서 allocator 경합·latency·RSS를 비교 |
| 메모리 용량 또는 latency 제약 | 제한 조건을 고정하고 실제 allocator 빌드를 비교 |
| Redis, Cassandra, Rust 등 | 제품 버전·빌드에서 실제 allocator와 profile 지원 확인 |
| 이미 특정 allocator가 통합된 제품 | 제품 문서와 빌드 구성을 확인 |
| 운영 monitoring 통합 | application/runtime가 내보내는 profile format에 맞춰 도구 선택 |
| fragmentation 분석 | allocator별 제공 통계와 실제 RSS/매핑 변화를 함께 비교 |

결과는 workload와 배포 빌드에 따라 달라집니다. 동일 부하·동일 환경에서 계측한 뒤 선택합니다.

## Rust + jemalloc

Rust의 기본 global allocator 선택은 toolchain이 보장하지 않습니다. `System` allocator를 명시하면 Unix에서는 C `malloc` 기반이며, jemalloc을 쓰려면 지원 target의 global allocator를 명시합니다.

```rust
// Cargo.toml
[dependencies]
tikv-jemallocator = "0.7"

// main.rs
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;
```

`tikv-jemallocator`는 jemalloc binding crate입니다. profile 지원은 crate feature와 build 설정을 확인하고, 버전은 현재 crate 문서에서 선택합니다.

## Go — built-in pprof

Go는 *자체 GC + 자체 allocator*. malloc 교체 안 함. 대신 `runtime/pprof`가 내장.

```go
import _ "net/http/pprof"

go http.ListenAndServe(":6060", nil)

// 외부에서
$ go tool pprof http://localhost:6060/debug/pprof/heap
$ go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
```

`go tool pprof`는 Go의 heap/CPU profile을 분석합니다. 다른 언어가 같은 runtime allocator나 profile schema를 사용한다는 뜻은 아닙니다.

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
2. 메모리 사용 큼 + lock 경합 의심 → 대표 workload에서 대체 allocator를 비교 측정.
3. 누수 의심 → profiler 지원 빌드와 설정을 확인하고 제한된 진단 구간에서 수집.
4. 설정에 지정한 경로에서 profile dump를 확인.
5. 두 시점 diff로 *누수 위치 식별*.
6. 코드 수정 → 다시 dump 비교로 검증.

## 정리

- jemalloc, TCMalloc, glibc의 성능·단편화 특성은 workload와 빌드에 따라 달라지므로 같은 조건으로 측정합니다.
- LD_PRELOAD로 교체. 컴파일러 옵션도 가능.
- 내장 profiler → jeprof / pprof / google-pprof.
- 두 시점 dump diff로 누수 추적.
- Rust는 `tikv-jemallocator` crate.
- Go는 자체 allocator와 pprof profile 형식을 사용합니다.
- 프로파일링은 샘플링과 backtrace 비용이 있습니다. 상시 활성화 여부는 대표 부하에서 측정한 overhead와 샘플 편향을 보고 정합니다.

## 다음 장 예고

Ch 4 — glibc malloc 진단 인터페이스와 버전별 `libc_malloc_debug` 조건.

## 관련 항목

- [Ch 2: heaptrack](/blog/tools/debugging/memory/chapter02-heaptrack)
- [Ch 4: glibc mtrace / mcheck](/blog/tools/debugging/memory/chapter04-glibc-tools)
- [Sanitizers Ch 1: AddressSanitizer](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind Ch 1: Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- [jemalloc 공식](https://jemalloc.net/)
- [gperftools (tcmalloc)](https://github.com/gperftools/gperftools)
- [pprof](https://github.com/google/pprof)
- [jemalloc profiling use case](https://github.com/jemalloc/jemalloc/wiki/Use-Case%3A-Heap-Profiling)
- [gperftools heap profiler documentation](https://github.com/gperftools/gperftools/blob/master/docs/heapprofile.adoc)
- [Google TCMalloc overview](https://github.com/google/tcmalloc/blob/master/docs/overview.md)
