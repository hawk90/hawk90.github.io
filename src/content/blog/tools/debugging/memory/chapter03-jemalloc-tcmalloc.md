---
title: "jemalloc·tcmalloc Profiling — 운영 allocator의 진단 기능"
slug: "tools/debugging/memory/chapter03-jemalloc-tcmalloc"
date: 2026-05-31T09:03:00
description: "jemalloc 5.3.0의 stats_print·heap profile·mallctl과 gperftools 2.10 TCMalloc의 HEAPPROFILE·MALLOCSTATS를 같은 누수 프로그램에 적용하고, Debian 패키지에서 profiling이 꺼져 있다는 함정까지 확인합니다."
tags: [memory, jemalloc, tcmalloc, malloc, pprof]
series: "Memory Diagnostics"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

[Ch 2](/blog/tools/debugging/memory/chapter02-heaptrack)의 heaptrack은 프로그램 밖에서 할당 함수를 가로채는 도구였습니다. jemalloc과 gperftools TCMalloc은 접근이 다릅니다. allocator 자체가 통계와 heap profile을 만드는 기능을 갖고 있어서, allocator를 바꾸는 것만으로 진단 데이터가 생깁니다. 그 대신 기능이 빌드 옵션에 묶여 있어, 같은 이름의 패키지라도 빌드에 따라 profiling이 아예 없을 수 있습니다.

이 장에서는 Ch 2의 누수 프로그램 `server`(짝수 id의 `Session`만 해제)를 두 allocator로 돌려 봅니다. 환경은 앞 장들과 같은 Debian 12.15 arm64 VM이고, 패키지는 `libjemalloc2` 5.3.0-1과 `libgoogle-perftools4` 2.10-1입니다.

:::tldr
Debian 12의 `libjemalloc2`는 `config.prof: false`로 빌드돼 `MALLOC_CONF=prof:true`가 "Invalid conf pair"로 무시됩니다. heap profile이 필요하면 `--enable-prof`로 직접 빌드합니다. gperftools는 `libtcmalloc.so.4`(minimal이 아닌 쪽)에 `HEAPPROFILE`만 주면 바로 profile이 나옵니다.
:::

## 세 allocator를 나누는 것

어느 allocator가 빠르냐는 질문에는 답이 없습니다. 할당 크기 분포와 스레드 수에 따라 순위가 바뀌기 때문입니다. 진단 관점에서 나누면 차이가 분명해집니다.

| | glibc malloc (2.36) | jemalloc 5.3.0 | gperftools TCMalloc 2.10 |
|---|----------------|----------|----------|
| 교체 방법 | 기본 | `LD_PRELOAD` 또는 `-ljemalloc` | `LD_PRELOAD` 또는 `-ltcmalloc` |
| 종료 시 통계 | `malloc_stats()` 호출 ([Ch 4](/blog/tools/debugging/memory/chapter04-glibc-tools)) | `MALLOC_CONF=stats_print:true` | `MALLOCSTATS=1` |
| heap profile | 없음 | `--enable-prof` 빌드에서 `opt.prof` | full 라이브러리의 `HEAPPROFILE` |
| 분석 도구 | — | `jeprof` | `google-pprof`(Debian 이름) |
| 라이선스 | LGPL | BSD 2조항 (`COPYING`) | BSD 3조항 (`COPYING`) |

jemalloc 매뉴얼(`doc/jemalloc.xml.in`, 5.3.0)은 profile 출력이 gperftools의 pprof를 기반으로 한 `jeprof` 명령과 호환된다고 적습니다. 그래서 두 도구의 옵션(`--text`, `--base`, `--pdf`)이 거의 같습니다.

## jemalloc — 통계부터

jemalloc은 `LD_PRELOAD`로 기존 바이너리에 그대로 끼울 수 있습니다. 첫 단계는 종료 시 통계를 켜서 이 빌드가 무엇을 지원하는지 보는 것입니다.

```text
$ MALLOC_CONF=stats_print:true LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libjemalloc.so.2 ./server 20000
___ Begin jemalloc statistics ___
Version: "5.3.0-0-g54eaed1d8b56b1aa528be3bdd1877e59c56fa90c"
Build-time option settings
  config.cache_oblivious: true
  config.debug: false
  config.fill: true
  config.lazy_lock: false
  config.malloc_conf: ""
  config.opt_safety_checks: false
  config.prof: false
  config.prof_libgcc: false
  config.prof_libunwind: false
  config.stats: true
  ...
Run-time option settings
  ...
  opt.narenas: 16
  ...
  opt.background_thread: false (background_thread: false)
  opt.dirty_decay_ms: 10000 (arenas.dirty_decay_ms: 10000)
  opt.muzzy_decay_ms: 0 (arenas.muzzy_decay_ms: 0)
  ...
  opt.tcache: true
  opt.tcache_max: 32768
  ...
Arenas: 17
...
Allocated: 41280192, active: 41943040, metadata: 2230304 (n_thp 0), resident: 44105728, mapped: 48234496, retained: 1048576
```

`Build-time option settings`가 가장 중요한 부분입니다. 이 Debian 빌드는 `config.stats: true`라 통계는 나오지만 `config.prof: false`라 heap profile은 만들 수 없습니다. 실제로 profile을 켜 보면 jemalloc이 거부합니다.

```text
$ MALLOC_CONF=prof:true LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libjemalloc.so.2 ./server 100
<jemalloc>: Invalid conf pair: prof:true
handled 100
```

프로그램은 아무 일 없이 계속 돌아가므로, 이 한 줄을 놓치면 "profile 파일이 왜 안 생기지"에서 한참 헤매게 됩니다.

나머지 숫자도 읽을 만합니다. `opt.narenas: 16`은 vCPU 4개의 네 배입니다. 매뉴얼은 `opt.narenas`의 기본값을 CPU 수의 네 배(CPU가 하나면 1)로 적습니다. `Allocated` 41,280,192는 프로그램이 잡고 있는 바이트, `resident` 44,105,728은 jemalloc이 RAM에 올려 둔 바이트입니다. 둘의 차이가 allocator가 들고 있는 여유분과 메타데이터입니다. `Allocated` 값은 Ch 2에서 heaptrack이 같은 입력(2만 요청)으로 잰 힙 최고치 41.23M와도 맞습니다.

## jemalloc heap profile — --enable-prof 빌드

profile을 쓰려면 profiling을 켠 jemalloc이 필요합니다. 같은 5.3.0 소스를 `./autogen.sh --enable-prof --prefix=/opt/jemalloc-prof`로 빌드했습니다. configure 요약에 `prof : 1`이 찍히면 됩니다.

profile 관련 옵션은 매뉴얼(5.3.0)에서 이렇게 정의됩니다.

| 옵션 | 매뉴얼의 정의 |
|------|---------------|
| `prof` | profiling을 켬. `--enable-prof` 빌드에서만 의미가 있음 |
| `prof_active` | profiling을 켠 채로 시작하되 `prof.active` mallctl로 켜고 끔. 기본값 켜짐 |
| `prof_prefix` | dump 파일 접두사. 기본값 `jeprof`. 빈 문자열이면 자동 dump 없음 |
| `lg_prof_sample` | 할당 바이트 기준 평균 샘플 간격(log2). 기본값 2^19 B = 512 KiB |
| `lg_prof_interval` | 할당 바이트 기준 평균 dump 간격(log2). 기본값 -1(끔). 파일 `<prefix>.<pid>.<seq>.i<iseq>.heap` |
| `prof_final` | `atexit()`로 종료 시 `<prefix>.<pid>.<seq>.f.heap`을 씀. 기본값 꺼짐 |
| `prof_leak` | 샘플링으로 찾은 누수를 종료 시 보고. `prof_final`과 함께일 때만 동작 |

`lg_prof_sample`이 19라는 것은 512 KiB마다 꼬박꼬박 기록한다는 뜻이 아니라, 평균 512 KiB 할당마다 하나를 표본으로 뽑는다는 뜻입니다. 은행 창구에서 손님 100명 중 한 명꼴로 설문을 받는 것과 같아서, 작고 드문 할당은 profile에 안 잡힐 수 있고 큰 흐름은 잘 잡힙니다. 그래서 profile의 바이트 수는 추정치입니다.

`server`를 20만 요청으로 돌리며 16 MiB(2^24) 할당마다 dump하고 종료 때 최종 dump를 남겼습니다.

```text
$ MALLOC_CONF=prof:true,prof_final:true,lg_prof_interval:24,prof_prefix:/root/prof/jeprof \
    LD_PRELOAD=/opt/jemalloc-prof/lib/libjemalloc.so.2 ./server 200000
handled 200000
$ ls prof/
jeprof.6302.0.i0.heap
jeprof.6302.1.i1.heap
...
jeprof.6302.48.i48.heap
jeprof.6302.49.f.heap
```

중간 dump 49개(`i0`~`i48`)와 최종 dump 하나(`f`)가 생겼습니다. profile 파일 첫 줄 `heap_v2/524288`에서 샘플 간격 512 KiB가 다시 보입니다.

## jeprof로 읽기

`jeprof --text`는 함수별 메모리를 보여 줍니다. 그런데 기본 정렬(그 함수가 직접 잡은 양 기준, flat)로 보면 이상한 결과가 나옵니다.

```text
$ jeprof --text ./server prof/jeprof.6302.49.f.heap
Using local file ./server.
Using local file prof/jeprof.6302.49.f.heap.
Total: 401.6 MB
   401.6 100.0% 100.0%    401.6 100.0% prof_backtrace_impl
     0.0   0.0% 100.0%    401.1  99.9% __libc_start_call_main
     0.0   0.0% 100.0%    401.1  99.9% __libc_start_main_impl
     ...
     0.0   0.0% 100.0%    401.1  99.9% handle_connection
     ...
```

모든 메모리가 jemalloc 내부 함수 `prof_backtrace_impl`에 몰렸습니다. `jeprof`(`bin/jeprof.in`, 5.3.0)는 `malloc`·`calloc` 같은 할당 함수 이름을 목록으로 갖고 있다가 스택에서 지우는데, 이 빌드의 스택 꼭대기에 있는 `je_malloc_default`·`prof_backtrace_impl` 같은 내부 이름은 그 목록에 없어 남습니다. 이럴 때는 `--cum`으로 누적 기준 정렬을 하고, 두 시점의 차이를 봅니다.

```text
$ jeprof --text --cum --base=prof/jeprof.6302.0.i0.heap ./server prof/jeprof.6302.49.f.heap
Using local file ./server.
Using local file prof/jeprof.6302.49.f.heap.
Total: 390.0 MB
     0.0   0.0%   0.0%    390.0 100.0% __libc_start_call_main
     ...
     0.0   0.0%   0.0%    390.0 100.0% handle_connection
     ...
     0.0   0.0%   0.0%    390.0 100.0% main
     0.0   0.0%   0.0%    390.0 100.0% open_session
```

`--base`는 첫 dump를 빼고 그 뒤에 늘어난 몫만 보여 주므로, 시작할 때 한 번 잡고 끝까지 쓰는 메모리가 사라지고 시간이 갈수록 쌓인 것만 남습니다. 남은 390.0 MB는 `open_session`으로 이어집니다. 실제 누수는 홀수 id 10만 개 × 4096 B = 409,600,000 B, 즉 390.6 MiB이고, jeprof의 MB는 MiB 단위라 샘플링 추정치가 실제와 거의 맞습니다.

`--collapsed`는 flame graph 도구가 읽는 한 줄 스택 형식을 냅니다.

```text
$ jeprof --collapsed ./server prof/jeprof.6302.49.f.heap | head -1
_start<0000000000000d80>;__libc_start_main_impl;__libc_start_call_main;main<00000000000012bc>;handle_connection(int)<0000000000001238>;open_session(int)<000000000000111c>;...;prof_backtrace_impl<0000000000081320> 420544605
```

이 줄을 `flamegraph.pl`에 넣으면 그림이 됩니다. 그래프 출력 옵션 `--pdf`·`--web`도 `jeprof.in`의 옵션 목록에 있지만, graphviz가 있어야 그려집니다.

## mallctl — 코드 안에서 통계 읽고 dump하기

외부 환경 변수 대신 프로그램이 직접 jemalloc에 묻고 시킬 수도 있습니다. 통로는 `mallctl()`입니다. 아래 코드는 `stats.allocated`를 읽고, 64 KiB 블록 1000개를 잡은 뒤 다시 읽고, `prof.dump`로 profile을 씁니다.

```c
/* je_ctl.c: read stats.allocated and request a profile dump via mallctl() */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <jemalloc/jemalloc.h>

static size_t read_allocated(void) {
    uint64_t epoch = 1;
    size_t sz = sizeof(epoch);
    mallctl("epoch", &epoch, &sz, &epoch, sz);       /* refresh cached stats */
    size_t allocated = 0;
    sz = sizeof(allocated);
    int err = mallctl("stats.allocated", &allocated, &sz, NULL, 0);
    if (err) fprintf(stderr, "stats.allocated: error %d\n", err);
    return allocated;
}

int main(void) {
    printf("before: %zu\n", read_allocated());
    static void *volatile keep[1000];
    for (int i = 0; i < 1000; i++) keep[i] = malloc(64 * 1024);  /* keep 1000 x 64 KiB live */
    printf("after:  %zu\n", read_allocated());
    int err = mallctl("prof.dump", NULL, NULL, NULL, 0);
    printf("prof.dump: %d\n", err);
    return 0;
}
```

`epoch`에 값을 쓰는 줄이 중요합니다. jemalloc의 `stats.*` 값은 캐시된 사본이라, `epoch`를 갱신해야 새 값으로 바뀝니다. Debian 라이브러리와 prof 빌드에 각각 링크해 돌렸습니다.

```text
$ gcc -O1 -o je_ctl je_ctl.c -ljemalloc && ./je_ctl      # Debian libjemalloc2
before: 147456
after:  65687552
prof.dump: 2

$ MALLOC_CONF=prof:true ../je_ctl_prof                    # --enable-prof 빌드
before: 116384
after:  65656896
prof.dump: 0
$ ls *.m*.heap
jeprof.7120.0.m0.heap
```

`stats.allocated`는 두 빌드 모두 65,536,000 B(64 KiB × 1000 = 62.5 MiB) 남짓 늘었습니다. `prof.dump`는 Debian 빌드에서 2(`ENOENT`, 그런 이름의 mallctl이 없음)를 돌려주고, prof 빌드에서는 0과 함께 `<prefix>.<pid>.<seq>.m<mseq>.heap` 파일을 만들었습니다. 그래서 `mallctl()`의 반환값은 반드시 검사합니다. 검사하지 않으면 Debian 빌드에서 dump가 조용히 실패합니다.

처음 이 코드를 `keep` 배열 없이 `malloc()` 결과를 버리는 식으로 썼을 때는 `after`가 212,992로 거의 늘지 않았습니다. GCC가 `-O1`에서 쓰이지 않는 `malloc()` 호출을 지웠기 때문입니다. 테스트 프로그램의 할당이 정말 일어나는지는 결과로 확인해야 합니다.

`prof.dump`를 signal handler 안에서 부르면 안 됩니다. dump는 파일을 쓰고 메모리를 할당하는데, handler가 끼어든 순간 jemalloc이 락을 잡고 있었다면 교착이 생깁니다. handler는 플래그만 세우고 dump는 일반 실행 흐름에서 합니다([Ch 5](/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis)에 예제가 있습니다).

## gperftools TCMalloc — HEAPPROFILE

gperftools의 heap profiler는 더 간단합니다. `docs/heapprofile.html`(2.10)에 따르면 `HEAPPROFILE`에 파일 접두사를 주면 켜지고, heap profiler는 tcmalloc과 떨어져서는 쓸 수 없습니다. Debian에서는 이 점이 패키지 구성으로 드러납니다. full 라이브러리 `libtcmalloc.so.4`에는 profiler가 있고, `libtcmalloc_minimal.so.4`에는 없습니다. minimal에 `HEAPPROFILE`을 주고 돌렸더니 파일이 하나도 생기지 않았습니다.

dump 주기를 정하는 환경 변수와 기본값은 다음과 같습니다.

| 환경 변수 | 기본값 (heapprofile.html) | 의미 |
|-----------|---------------------------|------|
| `HEAP_PROFILE_ALLOCATION_INTERVAL` | 1073741824 (1 GB) | 누적 할당이 이만큼 늘 때마다 dump |
| `HEAP_PROFILE_INUSE_INTERVAL` | 104857600 (100 MB) | 사용량 최고치가 이만큼 오를 때마다 dump |
| `HEAP_PROFILE_TIME_INTERVAL` | 0 | 지정한 초마다 dump |
| `HEAPPROFILESIGNAL` | 꺼짐 | 지정한 시그널을 받으면 dump |
| `HEAP_PROFILE_MMAP` | false | `mmap`·`mremap`·`sbrk`도 profile |

같은 `server`를 100 MB 할당마다 dump하도록 돌렸습니다.

```text
$ HEAPPROFILE=/root/hprof/server HEAP_PROFILE_ALLOCATION_INTERVAL=104857600 \
    LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libtcmalloc.so.4 ./server 200000
Starting tracking the heap
Dumping heap profile to /root/hprof/server.0001.heap (100 MB allocated cumulatively, 49 MB currently in use)
Dumping heap profile to /root/hprof/server.0002.heap (200 MB allocated cumulatively, 98 MB currently in use)
...
Dumping heap profile to /root/hprof/server.0007.heap (700 MB allocated cumulatively, 343 MB currently in use)
Dumping heap profile to /root/hprof/server.0008.heap (Exiting, 390 MB in use)
handled 200000
```

dump 메시지만 봐도 누수가 보입니다. 누적 할당이 100 MB 늘 때마다 사용 중 메모리가 49 MB씩 따라 늘었습니다. 할당의 절반이 돌아오지 않는다는 뜻이고, 짝수만 해제하는 버그와 정확히 맞습니다.

```text
$ google-pprof --text ./server hprof/server.0008.heap
Using local file ./server.
Using local file hprof/server.0008.heap.
Total: 390.6 MB
   390.6 100.0% 100.0%    390.6 100.0% open_session
     0.0   0.0% 100.0%      0.0   0.0% __GI__IO_file_doallocate
     ...
```

이번에는 flat 정렬 첫 줄에 바로 `open_session`이 나왔습니다. gperftools heap profiler가 스택을 기록할 때 tcmalloc 자신의 프레임을 넣지 않기 때문입니다. `server.0008.heap` 원본에서 204,800,000 B짜리 레코드의 첫 주소 `0xaaaae67a1134`는 이미 `/root/server`의 코드 매핑(`aaaae67a0000-aaaae67a2000`) 안에 있습니다. jemalloc profile은 스택 꼭대기에 `prof_backtrace_impl` 같은 내부 프레임이 남아 있어 차이가 납니다. `--base`로 첫 dump를 빼면 0001 이후에 쌓인 341.5 MB가 `open_session`에 남습니다.

```text
$ google-pprof --text --base=hprof/server.0001.heap ./server hprof/server.0008.heap
...
Total: 341.3 MB
   341.5 100.1% 100.1%    341.5 100.1% open_session
...
```

함수 이름 대신 `0x0000aaab...` 주소만 찍힌 줄도 출력에 섞여 있었습니다. 심볼을 찾지 못한 프레임입니다. 테스트 대상은 `-g`로 빌드했지만, 이런 줄은 `-g` 유무와 별개로 생길 수 있으니 상위 항목만 읽습니다.

heapprofile.html은 profiler를 링크한 바이너리를 운영 시스템에 설치하는 것을 권하지 않는다고 적습니다. 환경 변수만 설정하면 누구나 profiler를 켤 수 있기 때문입니다. 또 profiler는 setuid 프로그램에서는 보안상 파일을 쓰지 않습니다.

## TCMalloc 통계 — MALLOCSTATS

`src/tcmalloc.cc`(2.10, 1157행)는 종료 시 `MALLOCSTATS` 환경 변수를 읽어 통계를 출력합니다.

```text
$ MALLOCSTATS=1 LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libtcmalloc.so.4 ./server 20000
------------------------------------------------
MALLOC:       41054536 (   39.2 MiB) Bytes in use by application
MALLOC: +       565248 (    0.5 MiB) Bytes in page heap freelist
MALLOC: +        42920 (    0.0 MiB) Bytes in central cache freelist
MALLOC: +       150528 (    0.1 MiB) Bytes in transfer cache freelist
MALLOC: +       129808 (    0.1 MiB) Bytes in thread cache freelists
MALLOC: +      2621440 (    2.5 MiB) Bytes in malloc metadata
MALLOC:   ------------
MALLOC: =     44564480 (   42.5 MiB) Actual memory used (physical + swap)
MALLOC: +            0 (    0.0 MiB) Bytes released to OS (aka unmapped)
...
MALLOC:              2              Thread heaps in use
MALLOC:           8192              Tcmalloc page size
------------------------------------------------
Call ReleaseFreeMemory() to release freelist memory to the OS (via madvise()).
```

이 표는 "프로그램이 쓰는 양"과 "allocator가 잡고 있는 양"을 층별로 나눠 줍니다. 창고에 비유하면 손님에게 내준 상자(`in use by application`)와 선반에 쌓아 둔 빈 상자(각 freelist), 장부(metadata)를 따로 세는 셈입니다. RSS는 크지만 `in use by application`이 작다면 누수보다 allocator 보유분을 먼저 의심합니다. 이 실행에서는 39.2 MiB가 실제 사용이고 나머지 3.3 MiB가 보유분과 메타데이터입니다.

## Rust에서 jemalloc 쓰기

Rust 표준 라이브러리 문서(`std::alloc`, 1.83.0)는 기본 전역 allocator가 "unspecified"라고 적고, cdylib·staticlib 같은 라이브러리는 `System`을 쓴다고 보장합니다. jemalloc을 쓰려면 `#[global_allocator]`로 직접 지정합니다.

```toml
# Cargo.toml
[dependencies]
tikv-jemallocator = "0.7"
```

```rust
// main.rs
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;
```

crates.io 기준 `tikv-jemallocator`의 최신 안정판은 0.7.0(2026-05-25)입니다. heap profile을 쓰려면 crate의 `profiling` feature(내부적으로 `tikv-jemalloc-sys/profiling`)를 켜야 합니다. 기본 feature는 `background_threads_runtime_support`뿐이라, 위 설정 그대로는 Debian 패키지처럼 profiling 없는 jemalloc이 들어갑니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `<jemalloc>: Invalid conf pair: prof:true` | `config.prof: false` 빌드. Debian 12 `libjemalloc2`가 이 경우 |
| `prof.dump`가 2를 돌려줌 | 같은 원인. mallctl 이름이 없음(`ENOENT`) |
| `stats.allocated`가 변하지 않음 | `epoch`를 갱신하지 않음 |
| jeprof flat 정렬 1위가 `prof_backtrace_impl` | 내부 프레임이 skip 목록에 없음. `--cum`·`--base`로 봄 |
| `HEAPPROFILE`을 줬는데 파일이 없음 | `libtcmalloc_minimal`을 씀. full `libtcmalloc`이 필요 |
| `jeprof`가 없음 | Debian에서는 `libjemalloc-dev` 패키지에 들어 있음 |
| `google-pprof`가 없음 | Debian에서는 `google-perftools` 패키지 |
| 테스트 할당이 통계에 안 잡힘 | 컴파일러가 결과를 쓰지 않는 `malloc()`을 지움 |

## 정리

- allocator 내장 진단은 빌드 옵션에 묶여 있습니다. `stats_print`의 `Build-time option settings`로 먼저 확인합니다.
- Debian 12 `libjemalloc2` 5.3.0은 `config.prof: false`라 heap profile이 없습니다. `--enable-prof` 빌드가 필요합니다.
- jemalloc profile은 평균 512 KiB 할당마다 표본을 뽑는 추정치이고, `--base`로 두 시점을 빼면 누수가 남습니다.
- `mallctl()`로 통계를 읽을 때는 `epoch`를 갱신하고, 반환값을 검사합니다.
- gperftools는 full `libtcmalloc`에 `HEAPPROFILE`만 주면 profile이 나오고, dump 메시지의 "currently in use" 추세만으로도 누수가 보입니다.
- `MALLOCSTATS=1`은 앱 사용량과 allocator 보유분을 나눠 보여 줍니다.
- Rust의 `tikv-jemallocator`는 `profiling` feature를 켜야 profile을 쓸 수 있습니다.

## 다음 장 예고

Ch 4에서는 allocator를 바꾸지 않고 glibc malloc 자체의 진단 기능을 씁니다. glibc 2.34부터 `mtrace`·`mcheck`·`MALLOC_CHECK_`가 `libc_malloc_debug.so`로 옮겨 간 사정과 `malloc_info`·`malloc_stats`를 실제 출력으로 봅니다.

## 관련 항목

- [Ch 2: heaptrack](/blog/tools/debugging/memory/chapter02-heaptrack)
- [Ch 4: glibc mtrace / mcheck](/blog/tools/debugging/memory/chapter04-glibc-tools)
- [Sanitizers Ch 2: ASan·UBSan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind Ch 2: Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- [jemalloc 공식](https://jemalloc.net/)
- [jemalloc 5.3.0 매뉴얼 원본 `doc/jemalloc.xml.in`](https://github.com/jemalloc/jemalloc/blob/5.3.0/doc/jemalloc.xml.in)
- [jemalloc profiling use case](https://github.com/jemalloc/jemalloc/wiki/Use-Case%3A-Heap-Profiling)
- [gperftools 2.10 heap profiler 문서](https://github.com/gperftools/gperftools/blob/gperftools-2.10/docs/heapprofile.html)
- [gperftools (tcmalloc)](https://github.com/gperftools/gperftools)
- [pprof](https://github.com/google/pprof)
- [Rust 1.83.0 `std::alloc`](https://doc.rust-lang.org/1.83.0/std/alloc/index.html)
- [tikv-jemallocator](https://crates.io/crates/tikv-jemallocator)
