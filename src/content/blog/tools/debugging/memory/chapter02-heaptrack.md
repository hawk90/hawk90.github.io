---
title: "heaptrack 분석 — 가벼운 heap profiler 활용"
date: 2026-05-31T09:02:00
description: "Valgrind보다 빠른 heap profiler. KDE 출신, 운영 환경에도 적용 가능."
tags: [memory, heaptrack, profiler, kde]
series: "Memory Diagnostics"
seriesOrder: 2
draft: false
---

Valgrind Memcheck/Massif는 정확하지만 *20-100배 느림* — 운영 환경에 부적합. **heaptrack**은 *2-3배 느림*에 *모든 heap allocation*을 콜스택과 함께 기록. KDE 프로젝트 출신이지만 *어떤 Linux 프로그램*에도 적용.

:::tldr
`heaptrack ./myprog` → 모든 malloc/free 추적 + 콜스택 → GUI 또는 CLI로 분석. Massif의 80% 기능을 *훨씬 빠르게*.
:::

## 설치

```bash
# Fedora
$ sudo dnf install heaptrack heaptrack-gui

# Ubuntu / Debian
$ sudo apt install heaptrack heaptrack-gui

# Arch
$ sudo pacman -S heaptrack
```

```bash
$ heaptrack --version
heaptrack 1.5.0
```

## 기본 사용

```bash
$ heaptrack ./myprog arg1 arg2
heaptrack output will be written to "heaptrack.myprog.12345.zst"
starting application, this might take some time...
[프로그램 실행, 평소 2-3배 시간]
[종료 시]
heaptrack stats:
        allocations:            123456
        leaked allocations:     78
        temporary allocations:  4567
```

종료 시 `heaptrack.myprog.<pid>.zst` 생성 (zstd 압축). 분석:

```bash
$ heaptrack_print heaptrack.myprog.12345.zst | less
```

또는 GUI:

```bash
$ heaptrack_gui heaptrack.myprog.12345.zst
```

## heaptrack_print 출력

```
MOST CALLED FUNCTIONS
1234567 calls to:
    operator new(unsigned long)
       in /usr/lib/libstdc++.so.6
    std::__cxx11::basic_string<...>::_M_mutate
       in /usr/lib/libstdc++.so.6
    parse_request
       at server.cpp:42
    handle_connection
       at server.cpp:88

MOST ALLOCATIONS (cumulative)
800000 allocations, 256.0 MB peak, 192.0 MB leaked from:
    operator new(unsigned long)
       in /usr/lib/libstdc++.so.6
    Cache::add
       at cache.cpp:23
    Server::process
       at server.cpp:200

MOST TEMPORARY ALLOCATIONS  # alloc + free 짧은 시간 내
12345 temporary allocations from:
    std::string::operator+ allocation
       ...

LEAKED ALLOCATIONS
Leak: 192.0 MB from 80000 allocations at:
    operator new(unsigned long)
       in /usr/lib/libstdc++.so.6
    Cache::add
       at cache.cpp:23
```

핵심 정보:

| 섹션 | 의미 |
|------|------|
| **MOST CALLED** | alloc 횟수 많은 콜스택 — *hot path* |
| **MOST ALLOCATIONS** | 누적 alloc 크기 — *총 부담* |
| **MOST TEMPORARY** | alloc + free 짧은 시간 — *최적화 대상* |
| **LEAKED** | 종료 시 안 free된 — *진짜 누수* |

## GUI — heaptrack_gui

훨씬 사용성 좋음:

- **Summary** — 전체 통계
- **Bottom-Up** — leaf 함수부터 (콜스택 reverse)
- **Top-Down** — main부터 트리
- **Caller / Callee** — 함수 단위 인-아웃
- **Consumed** — *시간별 memory 그래프* (Massif와 동등)
- **Allocations** — 시간별 alloc rate
- **Temporary Allocations** — 시간별 temp rate
- **Size Histogram** — alloc 크기 분포 (Power-of-2 bins)
- **Flame Graph** — 콜스택 시각화

특히 **Consumed 탭**이 Massif의 *core feature*를 그대로. 시간 진행에 따른 *메모리 사용 곡선* + 어느 콜스택이 *얼마나 차지*.

## Massif vs heaptrack

| | Massif | heaptrack |
|---|--------|-----------|
| 속도 | 20-50x 느림 | 2-3x 느림 |
| 출력 | text + ms_print | text + GUI |
| 정확도 | Valgrind 시뮬레이션 | LD_PRELOAD malloc 래퍼 |
| 메모리 그래프 | 시각 | 시각 |
| 콜스택 정확성 | 매우 정확 | 좋음 (libunwind) |
| 운영 환경 | 부적합 | 적합 (느림 감수) |
| pthread | 정확 | 정확 |
| CPU 부하 | 매우 큼 | 적음 |

heaptrack이 *대체*는 아니지만 *일상 사용엔* 더 실용적. Massif는 *최후의 정밀 분석*.

## attach 모드 — 실행 중 프로세스

```bash
$ heaptrack --pid 12345
```

이미 실행 중인 프로세스에 attach. `ltrace`처럼 ptrace 활용.

운영 서비스의 *몇 분 샘플*에 매우 유용. 종료 시 자동 분리 + 파일 저장.

## 분석 한 예 — 누수 진단

상황: 서비스 RSS가 1시간에 100MB씩 증가.

```bash
$ heaptrack ./server &
SERVER_PID=$!
$ sleep 600                     # 10분
$ kill -SIGINT $SERVER_PID
$ heaptrack_gui heaptrack.server.*.zst
```

GUI의 **Consumed** 탭에서 *시간 진행 메모리 그래프*. 우상향 라인 + 우클릭 → "Show callers"로 *어디서 alloc*되는지.

LEAKED 섹션에 `Cache::add at cache.cpp:23` — 해당 줄을 검토하면 `_store[key] = value`로 무한 누적.

## --record-only 모드

라이브러리만 attach.

```bash
$ heaptrack --record-only ./myprog
```

GUI 없이 *trace만* 빠르게. 데이터센터에서 자동 수집 → 후처리.

## 환경 변수 옵션

```bash
$ HEAPTRACK_DEBUG=1 heaptrack ./myprog          # 디버그 출력
$ HEAPTRACK_BACKTRACES_THREADS=1 heaptrack ...  # 스레드별 분리
```

## 환경 — LD_PRELOAD 메커니즘

heaptrack은 `libheaptrack_preload.so`를 LD_PRELOAD해 malloc/free/realloc/calloc/free 등을 *래핑*. 매 호출마다:

1. 원본 malloc 호출.
2. libunwind로 콜스택 추출.
3. *압축된 trace*에 기록.

종료 시 trace 파일 finalize. 압축이 *zstd* — 매우 작음 (수 GB heap activity → 수 MB).

## 정적 링크된 바이너리

LD_PRELOAD는 동적 링크에만. 정적은 *불가*.

```bash
$ heaptrack ./static_prog
ERROR: cannot attach
```

해법: *동적 빌드*로 재컴파일, 또는 *부분 동적* (`-Wl,--export-dynamic` + `dlopen`).

## valgrind 호환?

heaptrack은 *valgrind 도구가 아님*. valgrind 위에서 안 돌아감 (둘 다 malloc 가로채기).

## 영향 분석 — heaptrack_compare

두 trace 비교 (예: 패치 전/후).

```bash
$ heaptrack ./prog_before
$ heaptrack ./prog_after
$ heaptrack_print heaptrack.prog_after.*.zst -d heaptrack.prog_before.*.zst
[diff 출력 — 어디서 더 많이/적게 alloc]
```

CI에서 *메모리 회귀 자동 검출*에 활용.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `error: ptrace` | YAMA `kernel.yama.ptrace_scope`. 0으로 |
| 콜스택 `<unknown>` | 디버그 심볼 없음. `-g` 빌드 또는 별 debuginfo |
| 출력 너무 큼 | 짧은 시간만 측정, 또는 `--filter` |
| `Could not find heaptrack_preload.so` | `LD_LIBRARY_PATH` 환경 |
| GUI 안 보임 | Qt 의존성. `heaptrack-gui` 별도 패키지 |
| 분석 시간 너무 김 | 파일 너무 큼. 더 짧게 측정 |

## Massif와의 결합 흐름

1. **heaptrack**으로 일상 모니터링 (가벼움).
2. 의심되는 영역 발견 시 **valgrind massif**로 정밀 분석.
3. 누수 위치 확정되면 **ASan**으로 정확한 줄 (재현 가능 시).

도구 선택은 *부담·정확도·재현성*의 트레이드오프.

## 정리

- heaptrack = Massif보다 *10-20배 빠른* heap profiler.
- LD_PRELOAD malloc 래퍼 + libunwind 콜스택.
- 종료 시 zstd 압축 trace.
- GUI의 *Consumed* 탭이 시간별 메모리 그래프.
- LEAKED / MOST CALLED / TEMPORARY로 세 가지 분석.
- attach 모드로 실행 중 프로세스에.
- 정적 바이너리엔 적용 불가.
- valgrind와 보완 — 일상 heaptrack, 정밀 Massif.

## 다음 장 예고

Ch 3 — jemalloc / tcmalloc profiling. 표준 malloc 대체 + 내장 profiler.

## 관련 항목

- [Ch 1: 메모리 회계](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [Ch 3: jemalloc / tcmalloc profiling](/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc)
- [Valgrind Ch 5: Massif](/blog/tools/debugging/valgrind/chapter05-suppressions)
- [Sanitizers Ch 3: LSan](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks)
- [heaptrack GitHub](https://github.com/KDE/heaptrack)
- [KDE blog — heaptrack intro](https://milian.cc/heaptrack/)
