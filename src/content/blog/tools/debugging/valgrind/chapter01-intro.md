---
title: "Valgrind 도구 개요 — Memcheck·Helgrind·DRD 비교"
slug: "tools/debugging/valgrind/chapter01-intro"
date: 2026-05-28T09:01:00
description: "Sanitizer 시대에도 Valgrind가 살아남은 이유, 세 핵심 도구의 역할, 도입 자리."
tags: [Valgrind, Memcheck, Helgrind, DRD, Debugging, C, cpp]
series: "Valgrind"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

## Valgrind는 *어떤 도구인가*

Valgrind를 한 줄로 요약하면 *바이너리를 가상 CPU 위에서 다시 실행하며 관찰하는 도구*입니다.

일반 실행에서는 프로그램의 기계어가 CPU에서 바로 돕니다. Valgrind 아래에서는 [매뉴얼 2.1절](https://valgrind.org/docs/manual/manual-core.html#manual-core.whatdoes)이 설명하듯 Valgrind 코어가 *프로그램이 시작되기 전에* 제어권을 가져가고, 코드가 처음 실행될 때마다 그 블록을 도구에 넘깁니다. 블록은 VEX라는 IR로 옮겨지고(헤더 `libvex_ir.h`의 표현으로 "architecture-neutral intermediate representation"), 도구가 여기에 검사 코드를 끼워 넣은 뒤 다시 기계어로 번역해 실행합니다. 메모리·동기화를 관찰하는 지점이 바로 이 계측 코드입니다.

핵심은 *재컴파일이 필요 없다*는 것입니다. 2.1절은 "재컴파일·재링크·수정 없이 기존 실행 파일에 바로 동작한다"고 적고, 같은 이유로 C 라이브러리를 비롯한 동적 라이브러리 코드까지 모두 검사 대상이 된다고 덧붙입니다. 반대로 이미 실행 중인 프로세스에 붙일 수는 없습니다. [FAQ 5.4](https://valgrind.org/docs/manual/faq.html#faq.attach)는 메모리 배치부터 다른 환경을 만들어야 해서 "처음부터 완전한 제어권이 필요하다"고 답합니다.

```bash
$ ./myapp                       # 정상 실행
$ valgrind ./myapp              # Memcheck로 실행 (기본 도구)
$ valgrind --tool=helgrind ./myapp   # 다른 도구
```

이게 [Sanitizer](/blog/tools/debugging/sanitizers/chapter01-intro)와의 가장 큰 차이입니다. Sanitizer는 *컴파일 시점에 계측*되어 *재컴파일이 필수*입니다. Valgrind는 *런타임에 번역하며 계측*하는 방식이라 *원본 바이너리 그대로* 분석합니다.

이 시리즈의 실행 결과는 모두 다음 환경에서 직접 돌린 것입니다. Valgrind는 Apple Silicon macOS를 지원하지 않으므로(아래 "설치" 절) Mac 위에 Linux 게스트를 띄웠습니다.

| 항목 | 값 |
| --- | --- |
| Valgrind | 3.24.0 (Debian 패키지 `1:3.24.0-3`) |
| 게스트 OS | Debian 13, Linux 6.12.116 arm64, glibc 2.41 |
| 컴파일러 | GCC 14.2.0 |
| 가상화 | QEMU 11.1.3, `-accel hvf -cpu host`, vCPU 4개, RAM 4 GiB |
| 호스트 | Apple M2 Pro (macOS) |

---

## *Sanitizer 시대*에 Valgrind가 살아남은 이유

두 도구는 준비 방식부터 다릅니다. 아래 표의 각 칸은 이 글에서 돌린 실행이나 공식 문서로 확인한 내용입니다.

| 조건 | Sanitizer | Valgrind |
| --- | --- | --- |
| 검사 준비 | `-fsanitize=...`로 다시 빌드해야 합니다. | 기존 실행 파일을 그대로 `valgrind` 아래에서 실행합니다(매뉴얼 2.1). |
| 초기화되지 않은 값 | MSan은 Clang 전용입니다. GCC 14.2.0에 `-fsanitize=memory`를 주면 `unrecognized argument`로 거부됩니다. | Memcheck가 기본으로 검사합니다. GCC 빌드에서도 동작합니다. |
| 외부 라이브러리 | 계측하지 않은 라이브러리 안쪽은 보지 못합니다. | libc를 포함한 모든 동적 라이브러리 코드를 같은 방식으로 검사합니다(매뉴얼 2.1). |
| 스택·전역 배열 경계 | ASan이 `stack-buffer-overflow`로 잡습니다(Ch 2의 실행). | Memcheck는 검사하지 않습니다([FAQ 4.6](https://valgrind.org/docs/manual/faq.html#faq.overruns)). |
| 비용 | 이 시리즈에서는 측정하지 않았습니다. | 아래 "도구별 비용" 절의 측정을 봅니다. |

그래서 Valgrind를 꺼내는 자리는 분명합니다. 소스 없이 받은 SDK의 `.so`, 다시 빌드하기 어려운 의존성, GCC로만 빌드되는 코드에서 미초기화 값을 봐야 할 때입니다. 시스템 호출에 넘기는 버퍼 검사도 Memcheck의 고유 항목입니다. Ch 2에서 `fwrite`로 미초기화 버퍼를 쓰면 `Syscall param write(buf) points to uninitialised byte(s)`가 glibc 내부 스택과 함께 보고되는 것을 확인합니다.

---

## Valgrind의 세 도구

Valgrind는 *플러그인 가능한 분석 프레임워크*입니다. 같은 가상 CPU 위에 *다른 도구*가 끼어들어 *서로 다른 관점*으로 코드를 봅니다. 공항 보안 검색대에 비유하면 컨베이어(코어)는 하나이고, 그 위에 X선 검사기·폭발물 탐지기·무게 측정기(도구) 중 하나를 골라 올리는 구조입니다.

```bash
valgrind --tool=memcheck ./app    # 기본 (생략 가능)
valgrind --tool=helgrind ./app
valgrind --tool=drd ./app
valgrind --tool=callgrind ./app
valgrind --tool=cachegrind ./app
valgrind --tool=massif ./app
```

도구는 한 번에 하나만 돕니다. `--tool=helgrind --tool=drd`처럼 두 번 주면 에러 없이 마지막 값이 이겨서, 3.24.0에서는 `drd, a thread error detector` 배너가 뜨고 DRD만 실행됐습니다.

이 시리즈는 *주요 세 가지*인 Memcheck / Helgrind / DRD를 다룹니다. 나머지 셋은 버그 탐지가 아니라 프로파일러입니다. 아래에서 짧게 실제 출력을 보고 넘어갑니다.

### Memcheck — *기본 도구*

```bash
valgrind ./app
# 또는 명시적으로
valgrind --tool=memcheck ./app
```

[Memcheck 매뉴얼 4.1절](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.overview)이 열거하는 검사 대상은 다음과 같습니다.

- 힙 블록 경계 침범, 스택 꼭대기 너머 접근, 해제된 메모리 접근
- 초기화되지 않은 값과 거기서 파생된 값의 사용
- 이중 해제, `malloc`/`new`/`new[]`와 `free`/`delete`/`delete[]`의 짝 불일치
- `memcpy` 계열 함수의 src·dst 겹침
- 할당 함수에 넘긴 음수 같은 수상한 크기, `realloc(p, 0)`, 2의 거듭제곱이 아닌 정렬값
- 메모리 누수

가장 자주 쓰는 도구입니다. 옵션 없이 `valgrind`만 치면 이 도구가 돌기 때문에 *Valgrind = Memcheck*로 통합니다.

### Helgrind — *데이터 레이스 + 락 오용*

```bash
valgrind --tool=helgrind ./app
```

[Helgrind 매뉴얼 7.2~7.4절](https://valgrind.org/docs/manual/hg-manual.html)이 다루는 검사는 세 묶음입니다.

- POSIX pthreads API 오용 (소유하지 않은 mutex unlock, 다른 mutex로 같은 condition variable 대기 등)
- 잠금 순서 불일치 (deadlock 가능성)
- 데이터 레이스 (happens-before 관계로 순서가 정해지지 않은 두 접근)

[TSan](/blog/tools/debugging/sanitizers/chapter04-tsan)과 겹치는 영역입니다. TSan은 재컴파일이 필요하고, Helgrind는 *재컴파일할 수 없는 바이너리*에도 적용됩니다.

### DRD — *Data Race Detector*

```bash
valgrind --tool=drd ./app
```

DRD도 happens-before 기반 레이스 탐지기입니다([DRD 매뉴얼 8.1.4절](https://valgrind.org/docs/manual/drd-manual.html#drd-manual.data-race-detection)). 두 도구의 검사 항목은 겹치지만 같지 않습니다. Helgrind는 잠금 순서 그래프를 검사하고, DRD는 그 검사가 없는 대신 `--exclusive-threshold`·`--shared-threshold`로 락을 오래 잡는 *경합*을 보고합니다(8.2.3절). Ch 4에서 같은 잠금 순서 역전 프로그램을 돌리면 Helgrind는 `lock order ... violated`를 보고하고 DRD는 `0 errors`로 끝납니다.

메모리 비용은 아래 측정에서 DRD 쪽이 작았습니다. DRD 매뉴얼 8.2.12절은 기본 옵션에서 네이티브 대비 1.1~3.6배 메모리, 단일 스레드 네이티브 대비 20~50배 느림을 제시합니다.

---

## 도구별 비용

"Valgrind는 느리다"는 말은 맞지만 도구마다 배율이 다릅니다. 매뉴얼은 Memcheck를 "네이티브보다 10~50배 느림", 계측이 전혀 없는 Nulgrind(`--tool=none`)를 "약 4배"로 적습니다([2.1절](https://valgrind.org/docs/manual/manual-core.html#manual-core.whatdoes)). [QuickStart](https://valgrind.org/docs/manual/quick-start.html)는 Memcheck를 "20~30배"로 적습니다.

같은 환경에서 직접 재 봤습니다. `work.c`는 `unsigned` 200만 개를 `qsort`로 정렬하고 20번 훑은 뒤, 32바이트 문자열 1만 개를 할당·해제하는 단일 스레드 프로그램입니다(`gcc -g -O1`). 각 도구마다 네이티브 실행과 도구 실행을 바로 이어서 7번 돌리고, 쌍마다 구한 배율의 중앙값을 적었습니다.

| 도구 (옵션) | 실행 시간 배율 (중앙값) | 7회 범위 | 최대 RSS 배율 |
| --- | ---: | ---: | ---: |
| Nulgrind (`--tool=none`) | 3.7× | 3.0–4.0× | 3.0× |
| Massif | 4.5× | 3.5–7.0× | 3.1× |
| Memcheck | 13.1× | 12.0–16.6× | 4.7× |
| DRD | 16.8× | 13.1–37.7× | 3.6× |
| Cachegrind (`--cache-sim=yes`) | 19.8× | 17.9–22.7× | 3.0× |
| Helgrind | 19.8× | 10.2–24.3× | 6.3× |
| Memcheck `--track-origins=yes` | 20.8× | 18.9–32.7× | 11.1× |
| Callgrind | 32.3× | 31.7–49.4× | 7.0× |

여기서 두 가지를 읽을 수 있습니다. 첫째, 배율은 도구 선택에 크게 좌우됩니다. Massif는 Nulgrind와 비슷한 수준이고, Callgrind는 Memcheck보다도 2.5배쯤 무겁습니다. 둘째, `--track-origins=yes`는 Memcheck를 더 느리게 만들고 메모리를 크게 늘립니다. 매뉴얼은 이 옵션이 "Memcheck 속도를 절반으로 줄이고 메모리를 최소 100MB 늘린다"고 적습니다([4.3절](https://valgrind.org/docs/manual/mc-manual.html#opt.track-origins)). 이 측정에서는 속도가 1.6배 느려졌고, 최대 RSS는 77,628 KB에서 181,460 KB로 약 101 MiB 늘었습니다.

Nulgrind 3.7×는 매뉴얼의 "약 4배"와, Memcheck 13.1×는 "10~50배"와 맞습니다. 네이티브 프로그램 자체의 RSS가 16 MB 남짓으로 작아서 RSS 배율은 Valgrind 자체의 고정 비용이 크게 섞인 값입니다.

> ⚠️ 측정 조건: 게스트는 QEMU HVF 가속이라 명령이 하드웨어에서 직접 돌지만, 측정 시각에 호스트 M2 Pro(12코어)에서 다른 빌드 작업이 돌고 있었습니다(측정 전후 load average 18~74). 그래서 절대 초 대신 쌍별 배율만 적었고, 범위 칸처럼 반복마다 흔들림이 있습니다. 표의 값은 `work.c` 한 프로그램에서 나온 것입니다.

---

## 도구별 *언제 무엇을*

| 상황 | 권장 도구 |
|------|----------|
| 일반 메모리 버그 (alloc/free/access) | **Memcheck** |
| 초기화 안 된 값 사용 의심 | **Memcheck** (GCC 빌드), Clang 빌드라면 **MSan**도 가능 |
| 멀티스레드 락 오용 | **Helgrind** 또는 **DRD** |
| 데이터 레이스 추적 | **Helgrind** 또는 **DRD** |
| 락 순서 / deadlock 가능성 | **Helgrind** (DRD에는 잠금 순서 검사가 없음) |
| 락을 오래 잡는 경합 | **DRD** (`--exclusive-threshold`) |
| 레이스 검사 중 메모리가 빠듯함 | 위 측정에서 RSS가 더 작았던 **DRD** |
| 캐시 미스 분석 | **Cachegrind** |
| 호출 그래프 + 프로파일 | **Callgrind** |
| 힙 메모리 추세 분석 | **Massif** |

이 시리즈는 위 표의 앞쪽 여섯 줄, 곧 Memcheck + Helgrind + DRD에 집중합니다. 프로파일러 세 개는 실제 출력 한 토막씩만 보고 넘어갑니다.

### Cachegrind 한 토막

512×512 `double` 행렬 곱을 `i-j-k` 순서와 `i-k-j` 순서로 한 번씩 돌렸습니다. 안쪽 루프가 `b[k][j]`를 열 방향으로 건너뛰는 `i-j-k`는 매번 다른 캐시 라인을 건드립니다.

```text
$ valgrind --tool=cachegrind --cache-sim=yes ./matrix        # i-j-k
--3264-- Warning: Cannot auto-detect cache config, using defaults.
...
==3264== D refs:        269,261,894  (268,461,836 rd   + 800,058 wr)
==3264== D1  misses:    134,873,938  (134,545,829 rd   + 328,109 wr)
==3264== D1  miss rate:        50.1% (       50.1%     +    41.0%  )
$ valgrind --tool=cachegrind --cache-sim=yes ./matrix x      # i-k-j
==3265== D refs:          403,479,623  (268,723,981 rd   + 134,755,642 wr)
==3265== D1  misses:       16,910,167  ( 16,844,197 rd   +      65,970 wr)
==3265== D1  miss rate:           4.2% (        6.3%     +         0.0%  )
```

루프 순서만 바꿔 D1 미스가 1억 3,487만 건에서 1,691만 건으로 줄었습니다. 첫 경고는 arm64 게스트에서 캐시 구성을 자동으로 읽지 못했다는 뜻입니다. `-v`로 보면 I1·D1 16 KiB 4-way, LL 256 KiB 8-way라는 기본값으로 시뮬레이션했으므로, 실제 M2 Pro 캐시 크기와는 다릅니다. 절대값보다 두 버전의 비교로 읽어야 합니다.

### Callgrind 한 토막

`work.c`를 원소 20만 개로 돌리고 `callgrind_annotate`로 함수별 명령 수를 봤습니다.

```text
$ valgrind --tool=callgrind --callgrind-out-file=cl.out ./work 200000
$ callgrind_annotate cl.out
...
44,992,562 (43.91%)  ./stdlib/./stdlib/qsort.c:msort_with_tmp.part.0'2 [/usr/lib/aarch64-linux-gnu/libc.so.6]
20,000,127 (19.52%)  work.c:main'2 [/root/src/work]
19,635,342 (19.16%)  work.c:cmp [/root/src/work]
```

glibc 2.41의 `qsort`가 내부에서 병합 정렬(`msort_with_tmp`)을 쓰고, 비교 함수 `cmp`가 전체 명령의 19%를 차지한다는 것을 소스 수정 없이 알 수 있습니다.

### Massif 한 토막

4 KiB 캐시 블록 256개를 쌓은 상태에서 1 MiB 임시 버퍼를 네 번 할당·해제하는 `heap.c`입니다.

```text
$ valgrind --tool=massif --massif-out-file=ms.out ./heap
$ ms_print ms.out
...
 64        208,572        2,099,208        2,097,152         2,056            0
99.90% (2,097,152B) (heap allocation functions) malloc/new/new[], --alloc-fns, etc.
->49.95% (1,048,576B) 0x10887F: make_cache (heap.c:4)
| ->49.95% (1,048,576B) 0x1088DF: main (heap.c:8)
|
->49.95% (1,048,576B) 0x1088AF: make_temp (heap.c:5)
  ->49.95% (1,048,576B) 0x1088F7: main (heap.c:9)
```

정점(64번 스냅샷)에서 힙 2 MiB의 절반은 캐시, 절반은 임시 버퍼였다는 내역이 호출 위치별로 나옵니다.

---

## 첫 사용 — Hello, Memcheck

일부러 해제하지 않는 40바이트 할당 하나로 Memcheck 보고서의 뼈대를 봅니다. 인자를 주면 `free` 경로로 갑니다.

```c title="leak.c"
// leak.c
#include <stdlib.h>
#include <string.h>

int main(int argc, char** argv) {
    (void)argv;
    char* buf = malloc(40);
    if (!buf) return 1;
    strcpy(buf, "hello");
    if (argc > 1) free(buf);
    // 인자가 없으면 의도적으로 해제하지 않는 진단 입력
    return 0;
}
```

위 환경에서 실제로 돌린 출력입니다.

```text
$ gcc -g leak.c -o leak
$ valgrind --leak-check=full ./leak
==749== Memcheck, a memory error detector
==749== Copyright (C) 2002-2024, and GNU GPL'd, by Julian Seward et al.
==749== Using Valgrind-3.24.0 and LibVEX; rerun with -h for copyright info
==749== Command: ./leak
==749==
==749==
==749== HEAP SUMMARY:
==749==     in use at exit: 40 bytes in 1 blocks
==749==   total heap usage: 1 allocs, 0 frees, 40 bytes allocated
==749==
==749== 40 bytes in 1 blocks are definitely lost in loss record 1 of 1
==749==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==749==    by 0x1087FF: main (leak.c:7)
==749==
==749== LEAK SUMMARY:
==749==    definitely lost: 40 bytes in 1 blocks
==749==    indirectly lost: 0 bytes in 0 blocks
==749==      possibly lost: 0 bytes in 0 blocks
==749==    still reachable: 0 bytes in 0 blocks
==749==         suppressed: 0 bytes in 0 blocks
==749==
==749== For lists of detected and suppressed errors, rerun with: -s
==749== ERROR SUMMARY: 1 errors from 1 contexts (suppressed: 0 from 0)
$ echo $?
0
```

핵심 줄들입니다.

1. **`==749==`** 접두사는 Valgrind의 프로세스 ID입니다. 프로그램 자신의 출력과 섞여도 구분할 수 있습니다.
2. **`HEAP SUMMARY`**는 종료 시 살아 있는 할당의 요약입니다.
3. **`definitely lost`**는 어디서도 가리키지 않는 블록, 곧 *진짜 누수*입니다.
4. **스택 트레이스**는 `malloc`을 부른 `main (leak.c:7)`, 곧 `char* buf = malloc(40);` 줄을 정확히 가리킵니다. `-g`를 빼면 `main (in /root/src/leak)`처럼 파일 이름만 남습니다(Ch 2).
5. **`LEAK SUMMARY`**는 누수를 네 종류로 분류합니다(Ch 3).
6. **종료 코드 0**에 주의합니다. 누수를 찾아도 Valgrind는 기본으로 프로그램의 종료 코드를 그대로 돌려줍니다. CI에서 실패로 만들려면 `--error-exitcode`가 필요합니다(Ch 2).

`./leak free`로 돌리면 `All heap blocks were freed -- no leaks are possible`과 `ERROR SUMMARY: 0 errors`가 나옵니다.

---

## 설치

### Linux (Debian/Ubuntu)

```bash
sudo apt install valgrind
```

Debian 13 arm64에서는 이 명령으로 `1:3.24.0-3`이 설치됐습니다. Debian의 `/usr/bin/valgrind`는 셸 스크립트로, `LD_LIBRARY_PATH`에 `/usr/lib/debug`를 더하고 `GLIBCXX_FORCE_NEW=1`을 설정한 뒤 실제 바이너리 `valgrind.bin`을 실행합니다. 패키지는 `libc6-dbg`(glibc 분리 디버그 심볼)에 의존하므로 함께 설치됩니다. 이 의존은 장식이 아닙니다. `/usr/lib/debug`를 잠시 치우고 돌리면 Memcheck가 시작조차 하지 못합니다.

```text
valgrind:  Fatal error at startup: a function redirection
valgrind:  which is mandatory for this platform-tool combination
valgrind:  cannot be set up.  Details of the redirection are:
valgrind:
valgrind:  A must-be-redirected function
valgrind:  whose name matches the pattern:      strlen
valgrind:  in an object with soname matching:   ld-linux-aarch64.so.1
...
valgrind:    On Debian, Ubuntu:                 libc6-dbg
```

Ch 2의 `fileops.c:1182`처럼 glibc 내부 프레임에 소스 줄까지 보이는 것도 이 패키지 덕분입니다.

### Linux (Fedora/RHEL)

```bash
sudo dnf install valgrind
```

### macOS

3.24.0 소스 배포의 README가 열거하는 지원 플랫폼은 `X86/macOS`와 `AMD64/macOS`뿐이고, `ARM64`는 Linux와 FreeBSD에만 있습니다. 그래서 Apple Silicon Mac에서는 이 글처럼 arm64 Linux VM을 띄우고 그 안에서 실행합니다. 분석할 바이너리도 그 Linux에서 빌드합니다.

### Windows

같은 README의 지원 목록에 Windows는 없습니다. WSL이나 Linux VM 안의 Linux 환경에서 씁니다.

### 버전 확인

```bash
valgrind --version
```

이 시리즈의 모든 출력은 `valgrind-3.24.0`에서 나왔습니다. 버전마다 메시지 형식이 조금씩 다르기 때문에(예: 3.24.0의 `Mismatched new/delete size value` 보고, Ch 2) 블로그·Stack Overflow의 출력과 비교할 때는 버전부터 맞춥니다.

---

## 시리즈 로드맵

1. **Ch 1: 개요** (이 글)
2. **Ch 2: Memcheck 실전 사용** — 옵션, leak-check 단계, 종료 코드, 디버그 정보
3. **Ch 3: Leak Report 읽기** — 4가지 누수 분류 해석, *재귀 트레이스*, 우선순위
4. **Ch 4: Helgrind / DRD** — 멀티스레드 분석 두 도구 비교, 락 오용 패턴
5. **Ch 5: Suppression과 실무 운용** — 외부 라이브러리 우회, CI 통합, Sanitizer와 분담

---

## 정리

- **Valgrind**는 프로그램이 시작되기 전에 제어권을 잡고 코드를 VEX IR로 번역·계측하므로 재컴파일 없이 libc까지 검사합니다.
- 실행 중인 프로세스에는 붙일 수 없습니다(FAQ 5.4).
- *Sanitizer와 보완 관계*입니다. 소스 없는 `.so`, GCC 빌드의 미초기화 값, 시스템 호출 버퍼는 Valgrind 쪽이고, 스택·전역 배열 경계는 ASan 쪽입니다.
- 세 핵심 도구는 **Memcheck**(메모리 + 초기화), **Helgrind**(pthread 오용 + 잠금 순서 + race), **DRD**(race + 락 경합)입니다.
- 비용은 도구마다 다릅니다. 이 글의 측정에서는 Callgrind가 가장 무거웠고 Massif가 가장 가벼웠습니다.
- 공식 지원 플랫폼에 Apple Silicon macOS와 Windows는 없습니다. Linux VM에서 돌립니다.
- 권장 운영: 일상 = Sanitizer, *릴리스 전 점검* = Valgrind Memcheck.

## 다음 장 예고

[Ch 2: Memcheck 실전 사용](/blog/tools/debugging/valgrind/chapter02-memcheck)에서는 Memcheck의 핵심 옵션과 *어디서 어떤 보고가 나는지*를 다룹니다. `--leak-check`, `--show-leak-kinds`, `--track-origins`, 그리고 CI에서 꼭 필요한 `--error-exitcode`까지 실제 출력으로 확인합니다.

## 참고 자료

- [Valgrind Manual](https://valgrind.org/docs/manual/manual.html) — 이 글은 3.24.0 패키지에 들어 있는 HTML 매뉴얼과 대조했습니다
- [2.1 What Valgrind does with your program](https://valgrind.org/docs/manual/manual-core.html#manual-core.whatdoes)
- [Memcheck User Manual](https://valgrind.org/docs/manual/mc-manual.html)
- [DRD User Manual](https://valgrind.org/docs/manual/drd-manual.html)
- [Valgrind FAQ](https://valgrind.org/docs/manual/faq.html)
- [Valgrind QuickStart](https://valgrind.org/docs/manual/quick-start.html)

## 관련 항목

- [Ch 2: Valgrind Memcheck 실전](/blog/tools/debugging/valgrind/chapter02-memcheck) — 다음 글. Memcheck 옵션과 워크플로
- [Sanitizer 종류 비교 — ASan·UBSan·LSan·TSan·MSan](/blog/tools/debugging/sanitizers/chapter01-intro) — 재컴파일 기반 도구 쪽의 전체 지도. Memcheck ↔ ASan·MSan 대응 관계
- [GDB vs LLDB 분석](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — 탐지한 버그를 실제로 들여다볼 때 붙이는 디버거
- [Valgrind Manual](https://valgrind.org/docs/manual/manual.html) — 도구별 공식 매뉴얼 목차
