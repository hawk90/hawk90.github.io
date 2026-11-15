---
title: "heaptrack 분석 — 가벼운 heap profiler 활용"
slug: "tools/debugging/memory/chapter02-heaptrack"
date: 2026-05-31T09:02:00
description: "Linux 프로세스의 heap allocation stack을 추적해 hotspot과 종료 시 남은 allocation을 조사하는 방법."
tags: [memory, heaptrack, profiler, kde]
series: "Memory Diagnostics"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

Valgrind Memcheck/Massif는 계측 방식과 workload에 따라 실행 시간·메모리 사용량이 크게 달라집니다. **heaptrack**은 동적 Linux 프로그램의 allocator 호출과 콜스택을 기록하며, 할당 지점 분석에 유용합니다. 풀 allocator처럼 일반 할당 함수를 우회하는 코드는 별도 계측 없이는 놓칠 수 있고, 오버헤드도 프로그램과 기록량에 따라 측정해야 합니다.

:::tldr
`heaptrack ./myprog` → 추적 파일 생성 → GUI 또는 CLI에서 분석. 추적 범위와 비용은 allocator·프로그램·실행 시간에 따라 달라집니다.
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
heaptrack writes a generated trace file; the current project README shows `.gz`, while the suffix depends on build compression support.
starting application, this might take some time...
[프로그램 실행, 실행 비용은 workload와 trace 설정에 따라 달라짐]
[종료 시]
heaptrack stats:
        allocations:            123456
        leaked allocations:     78
        temporary allocations:  4567
```

종료 시 generated trace file을 만듭니다. 현재 README의 기본 예시는 `.gz`이며 빌드에 따라 압축 형식이 달라질 수 있습니다. 분석:

```bash
$ heaptrack_print <generated-trace-file> | less
```

또는 GUI:

```bash
$ heaptrack --analyze <generated-trace-file>
```

## heaptrack_print 출력

다음은 보고서에서 볼 수 있는 항목을 설명하기 위한 축약 예시입니다. 실제 문구와 순서는 heaptrack 버전에 따라 달라집니다.

```text
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
| **LEAKED** | 종료 시점에 남아 있는 allocation. 해제되지 않았다는 사실만으로 논리적 누수가 확정되지는 않음 |

## GUI — heaptrack_gui

훨씬 사용성 좋음:

- **Summary** — 전체 통계
- **Bottom-Up** — leaf 함수부터 (콜스택 reverse)
- **Top-Down** — main부터 트리
- **Caller / Callee** — 함수 단위 인-아웃
- **Consumed** — 시간에 따른 allocation cost 그래프. RSS/cgroup 사용량과 같지는 않음
- **Allocations** — 시간별 alloc rate
- **Temporary Allocations** — 시간별 temp rate
- **Size Histogram** — alloc 크기 분포 (Power-of-2 bins)
- **Flame Graph** — 콜스택 시각화

GUI는 시간에 따른 allocation cost와 stack hotspot을 시각화합니다. 이 기능을 Massif 전체나 실제 RSS/cgroup 사용량과 동등하다고 보지 않습니다.

## Massif vs heaptrack

| | Massif | heaptrack |
|---|--------|-----------|
| 실행 비용 | workload와 옵션에 따라 큼 | workload와 기록량에 따라 달라짐 |
| 출력 | text + ms_print | text + GUI |
| 정확도 | Valgrind 시뮬레이션 | LD_PRELOAD malloc 래퍼 |
| 메모리 그래프 | 시각 | 시각 |
| 콜스택 정확성 | 매우 정확 | 좋음 (libunwind) |
| 운영 환경 | 보통 별도 재현 환경에서 사용 | 영향 측정과 짧은 제한 세션을 전제로 검토 |
| pthread | 정확 | 정확 |
| CPU 부하 | 매우 큼 | 적음 |

heaptrack이 *대체*는 아니지만 *일상 사용엔* 더 실용적. Massif는 *최후의 정밀 분석*.

## attach 모드 — 실행 중 프로세스

```bash
$ heaptrack --pid 12345
```

이미 실행 중인 프로세스에 동적 주입으로 attach합니다. 공식 heaptrack 안내는 이 방식을 unstable로 표시하며, attach와 분리 과정에서 대상 프로세스가 crash할 수 있다고 경고합니다. 운영 프로세스에는 사전 재현과 복구 계획 없이 사용하지 말고, 가능하면 시작 시점부터 실행해 기록합니다.

운영 서비스의 *몇 분 샘플*에 매우 유용. 종료 시 자동 분리 + 파일 저장.

## 분석 한 예 — 누수 진단

상황: 서비스 RSS가 1시간에 100MB씩 증가.

```bash
$ heaptrack ./server &
SERVER_PID=$!
$ sleep 600                     # 10분
$ kill -SIGINT $SERVER_PID
$ heaptrack --analyze <generated-trace-file>
```

GUI의 time graph와 allocation stack을 함께 봅니다. 이 그래프는 allocation trace 관점이므로 RSS 증가의 원인이 곧바로 해당 stack이라는 뜻은 아닙니다.

종료 시 남은 allocation의 stack에 `Cache::add`가 보여도, 캐시의 의도된 수명인지와 반복 workload 뒤에도 증가하는지를 확인한 후 누수로 판단합니다.

## --record-only 모드

프로그램 실행 중 데이터를 기록하고 분석을 자동 실행하지 않는 모드입니다. 분석은 나중에 `heaptrack --analyze <trace>`로 별도 수행합니다.

```bash
$ heaptrack --record-only ./myprog
```

이 옵션은 PID attach 전용이 아닙니다. 심볼/SDK가 없는 장치에서 원시 기록과 별도 해석을 선택하려면 `--raw`와 `--interpret` 흐름을 사용합니다.

## 환경 — LD_PRELOAD 메커니즘

heaptrack은 동적 로더의 interception으로 지원되는 allocator 함수 호출을 추적합니다. 매 호출마다:

1. 원본 malloc 호출.
2. libunwind로 콜스택 추출.
3. *압축된 trace*에 기록.

종료 시 trace 파일을 finalize합니다. 현재 기본 README 예시는 gzip을 보여 주며, 일부 빌드는 zstd를 선택합니다. trace 크기는 allocation 수와 기록 길이에 따라 달라집니다.

## 정적 링크된 바이너리

LD_PRELOAD는 동적 링크용입니다. 동적 allocator 호출을 가로채는 표준 흐름은 정적 링크 바이너리에 적용되지 않습니다.

표준 LD_PRELOAD 방식은 정적 링크 바이너리에 적용되지 않습니다. 동적 빌드로 다시 만들거나, 지원되는 allocator/API에 명시적 계측을 추가합니다. `--export-dynamic`만 추가한다고 정적 바이너리를 추적할 수 있는 것은 아닙니다.

## valgrind 호환?

heaptrack은 *valgrind 도구가 아님*. valgrind 위에서 안 돌아감 (둘 다 malloc 가로채기).

## 두 실행 비교

패치 전후를 비교할 때는 같은 바이너리 설정·입력 workload로 각각 trace를 만들고, 해당 버전의 `heaptrack_print --help`에 나온 diff 기능이 있는지 먼저 확인합니다. CLI 옵션이 다른 버전도 있으므로, 지원 여부를 확인하지 않은 명령을 CI 자동 검출 단계에 복사하지 않습니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `error: ptrace` | YAMA `kernel.yama.ptrace_scope`. 0으로 |
| 콜스택 `<unknown>` | 디버그 심볼 없음. `-g` 빌드 또는 별 debuginfo |
| 출력 너무 큼 | 짧은 시간만 측정하고 trace 크기/압축 설정을 확인 |
| `Could not find heaptrack_preload.so` | `LD_LIBRARY_PATH` 환경 |
| GUI 안 보임 | Qt 의존성. `heaptrack-gui` 별도 패키지 |
| 분석 시간 너무 김 | 파일 너무 큼. 더 짧게 측정 |

## Massif와의 결합 흐름

1. **heaptrack**으로 일상 모니터링 (가벼움).
2. 의심되는 영역 발견 시 **valgrind massif**로 정밀 분석.
3. 누수 위치 확정되면 **ASan**으로 정확한 줄 (재현 가능 시).

도구 선택은 *부담·정확도·재현성*의 트레이드오프.

## 정리

- heaptrack과 Massif의 속도 배수는 workload와 옵션에 따라 달라 고정 수치로 비교하지 않습니다.
- LD_PRELOAD malloc 래퍼 + libunwind 콜스택.
- 종료 시 zstd 압축 trace.
- GUI의 시간 그래프는 allocation trace 관점이며 RSS나 cgroup 사용량과 같지 않습니다.
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
- [heaptrack 공식 README](https://github.com/KDE/heaptrack/blob/master/README.md)
- [KDE blog — heaptrack intro](https://milian.cc/heaptrack/)
