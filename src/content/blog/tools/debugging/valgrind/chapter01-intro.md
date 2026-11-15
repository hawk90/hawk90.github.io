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

Valgrind를 한 줄로 요약하면 *바이너리 위에서 가상 머신을 띄워 실행을 추적하는 도구*입니다.

**일반 실행:**

- 프로그램 → CPU → 결과

**Valgrind 실행:**

- 프로그램 → 디스어셈블 → IR(VEX) → 계측 → 가상 CPU → 결과
- ↑
- 여기서 메모리·동기화 관찰

핵심은 *재컴파일이 필요 없다*는 것입니다. 지원되는 OS·아키텍처·명령어의 바이너리를 Valgrind 아래에서 처음부터 실행합니다. 이미 실행 중인 임의의 프로세스에 attach하는 방식과는 다릅니다.

```bash
$ ./myapp                       # 정상 실행
$ valgrind ./myapp              # Memcheck로 실행 (기본 도구)
$ valgrind --tool=helgrind ./myapp   # 다른 도구
```

이게 [Sanitizer](/blog/tools/debugging/sanitizers/chapter01-intro)와의 가장 큰 차이입니다. Sanitizer는 *컴파일 시점에 계측*되어 *재컴파일이 필수*입니다. Valgrind는 *런타임에 가로채는* 방식이라 *원본 바이너리 그대로* 분석합니다.

---

## *Sanitizer 시대*에 Valgrind가 살아남은 이유

도구마다 검사 방식과 필요한 준비가 다릅니다. 하나가 항상 더 정확하거나 다른 하나만 특정 오류를 검출한다고 단정하지 않습니다.

| 조건 | Sanitizer | Valgrind |
| --- | --- | --- |
| 검사 준비 | 대상 코드·종속 코드의 계측 범위를 확인합니다. | 지원되는 바이너리를 분석 환경 아래에서 실행합니다. |
| 초기화되지 않은 값 | MSan 등 해당 검사를 선택합니다. | Memcheck가 값의 정의 상태와 사용을 검사합니다. |
| 외부 라이브러리 | 비계측 코드에 탐지 공백이 생길 수 있습니다. | 재계측 없이 분석하지만 OS·명령어·동기화 모델의 제한이 있습니다. |
| 비용 | 검사·입력별로 측정합니다. | 도구·입력별로 측정합니다. |

소스 없는 SDK의 지원 바이너리나 다른 계측 빌드를 준비하기 어려운 경우에 Valgrind를 검토합니다. 시스템 호출에 넘기는 버퍼를 검사하는 기능은 모든 syscall을 완전하게 추적한다는 뜻이 아닙니다. 단순 호출 흐름 추적은 해당 OS의 syscall 추적 도구와 구분합니다.

---

## Valgrind의 세 도구

Valgrind는 *플러그인 가능한 분석 프레임워크*입니다. 동일한 가상 CPU 위에 *다른 도구*들이 끼어들어 *서로 다른 관점*으로 코드를 봅니다.

```bash
valgrind --tool=memcheck ./app    # 기본 (생략 가능)
valgrind --tool=helgrind ./app
valgrind --tool=drd ./app
valgrind --tool=callgrind ./app
valgrind --tool=cachegrind ./app
valgrind --tool=massif ./app
```

이 시리즈는 *주요 세 가지* — Memcheck / Helgrind / DRD를 다룹니다. 나머지는 *특정 용도*에만 등장합니다 (Cachegrind = 캐시 시뮬레이션, Callgrind = 호출 그래프, Massif = 힙 프로파일러).

### Memcheck — *기본 도구*

```bash
valgrind ./app
# 또는 명시적으로
valgrind --tool=memcheck ./app
```

잡는 것:

- 메모리 누수 (alloc 후 free 안 함)
- Invalid read/write (해제된 메모리 접근, 경계 침범)
- *Uninitialized value 사용* (MSan과도 검사 목적이 겹칩니다.)
- Double free / mismatched free (`malloc`/`new[]`/`delete` 짝 오류)
- Overlapping memcpy

가장 자주 쓰는 도구입니다. *Valgrind = Memcheck*로 통하는 이유.

### Helgrind — *데이터 레이스 + 락 오용*

```bash
valgrind --tool=helgrind ./app
```

잡는 것:

- POSIX pthreads의 잘못된 사용 (소유하지 않은 mutex unlock 등)
- 데이터 레이스 (동기화 없이 동시 접근)
- 락 순서 위반 (deadlock potential)
- pthread cond signal/wait 패턴 오류

[TSan](/blog/tools/debugging/sanitizers/chapter04-tsan)과 비슷한 일을 합니다. TSan이 더 빠르지만, Helgrind는 *재컴파일 불가 바이너리*에 적용 가능.

### DRD — *Data Race Detector*

```bash
valgrind --tool=drd ./app
```

Helgrind와 DRD는 POSIX 동기화와 데이터 접근을 관찰하는 동적 분석 도구입니다. Helgrind는 happens-before 기반 레이스 검사와 잠금 순서 검사 등을 제공하고, DRD도 happens-before 관계를 이용하며 잠금 보유 시간의 경합 진단 옵션이 있습니다. 어느 쪽이 항상 더 적은 메모리를 쓰거나 더 정확하다는 순위를 이 글의 측정 없이 제시하지 않습니다.

---

## 도구별 *언제 무엇을*

| 상황 | 권장 도구 |
|------|----------|
| 일반 메모리 버그 (alloc/free/access) | **Memcheck** |
| 초기화 안 된 값 사용 의심 | **Memcheck** 또는 지원 환경의 **MSan** |
| 멀티스레드 락 오용 | **Helgrind** |
| 데이터 레이스 추적 | **Helgrind** 또는 **DRD** |
| 락 순서 / deadlock 가능성 | **Helgrind** |
| 큰 코드 + 메모리 부족 | 실제 입력으로 두 도구의 메모리 비용을 비교합니다. |
| 캐시 미스 분석 | **Cachegrind** |
| 호출 그래프 + 프로파일 | **Callgrind** |
| 힙 메모리 추세 분석 | **Massif** |

이 시리즈는 위 표의 *위쪽 다섯 줄* — Memcheck + Helgrind + DRD에 집중합니다.

---

## 첫 사용 — Hello, Memcheck

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

다음 로그는 Linux 보고 형식 예시이며 이번 macOS 환경에서 수집한 실측 결과가 아닙니다.

```text
$ gcc -g leak.c -o leak
$ valgrind --leak-check=full ./leak
==12345== Memcheck, a memory error detector
==12345== Copyright (C) 2002-2022, and GNU GPL'd, by Julian Seward et al.
==12345== Using Valgrind-3.18.1 and LibVEX
==12345== Command: ./leak
==12345==
==12345==
==12345== HEAP SUMMARY:
==12345==     in use at exit: 40 bytes in 1 blocks
==12345==   total heap usage: 1 allocs, 0 frees, 40 bytes allocated
==12345==
==12345== 40 bytes in 1 blocks are definitely lost in loss record 1 of 1
==12345==    at 0x483977F: malloc (in /usr/lib/valgrind/vgpreload_memcheck-amd64-linux.so)
==12345==    by 0x10918A: main (leak.c:5)
==12345==
==12345== LEAK SUMMARY:
==12345==    definitely lost: 40 bytes in 1 blocks
==12345==    indirectly lost: 0 bytes in 0 blocks
==12345==      possibly lost: 0 bytes in 0 blocks
==12345==    still reachable: 0 bytes in 0 blocks
==12345==         suppressed: 0 bytes in 0 blocks
```

핵심 줄들:

1. **`HEAP SUMMARY`** — 종료 시 살아 있는 할당 요약.
2. **`definitely lost`** — *진짜 누수*. 어디서도 못 가리키는 메모리. LSan의 direct leak과 목적은 비슷하지만 루트·휴리스틱·보고 기준까지 동일하지는 않습니다.
3. **스택 트레이스** — `leak.c:5`까지 정확히 가리킴.
4. **`LEAK SUMMARY`** — 네 가지 누수 종류로 분류 (definitely / indirectly / possibly / still reachable).

파일·줄 번호를 읽으려면 -g와 지원되는 디버그 형식이 필요합니다. 위 예시의 고정 줄 번호가 현재 파일의 실행 결과를 증명하지는 않습니다.

---

## 설치

### Linux (Debian/Ubuntu)

```bash
sudo apt install valgrind
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install valgrind
```

### macOS

[공식 지원 플랫폼](https://valgrind.org/info/platforms.html)은 Darwin의 일부 Intel OS 버전을 열거하지만 Apple Silicon/macOS는 열거하지 않습니다. Apple Silicon 지원이 있었다가 사라졌다고 설명하지 않습니다. 현재 Mac에서 brew --HEAD 설치가 동작한다고 보장하지 않으며, 분석할 바이너리를 지원되는 Linux 환경에서 준비하는 방식을 검토합니다.

### Windows

네이티브 Windows를 공식 지원 대상으로 가정하지 않습니다. WSL이나 Linux VM을 쓸 때도 해당 커널·아키텍처·배포판과 도구의 지원 여부를 확인합니다.

### 버전과 검증 범위

```bash
valgrind --version
```

사용 중인 버전과 대상 바이너리의 디버그 형식·명령어 지원을 함께 기록합니다. 특정 최소 버전 하나로 최신 컴파일러 전체 지원을 보장하지 않습니다. 이번 환경에는 Valgrind가 없어 leak.c의 컴파일과 free 분기 정상 실행만 확인하며, 실제 Memcheck 보고는 Linux 검증 대기입니다.

---

## 시리즈 로드맵

1. **Ch 1: 개요** (이 글)
2. **Ch 2: Memcheck 실전 사용** — 옵션, leak-check 단계, suppression
3. **Ch 3: Leak Report 읽기** — 4가지 누수 분류 해석, *재귀 트레이스*, 우선순위
4. **Ch 4: Helgrind / DRD** — 멀티스레드 분석 두 도구 비교, 락 오용 패턴
5. **Ch 5: Suppression과 실무 운용** — 외부 라이브러리 우회, CI 통합, Sanitizer와 분담

---

## 정리

- **Valgrind**는 지원 바이너리를 동적으로 분석하며 도구·입력별 비용을 확인합니다.
- *Sanitizer와 보완 관계*. 닿지 못하는 자리(상용 SDK / 시스템 호출 / 외부 .so)에 씀.
- 세 핵심 도구: **Memcheck** (메모리 + 초기화), **Helgrind** (락 + race), **DRD** (race).
- OS·CPU·명령어·디버그 형식 지원을 확인합니다. 이 환경의 Apple Silicon/macOS 실행은 미지원 범위입니다.
- 권장 운영: 일상 = Sanitizer, *릴리스 전 점검* = Valgrind Memcheck.

## 다음 장 예고

[Ch 2: Memcheck 실전 사용](/blog/tools/debugging/valgrind/chapter02-memcheck)에서는 Memcheck의 모든 옵션과 *어디서 어떤 보고가 나는지*를 다룹니다. `--leak-check`, `--show-leak-kinds`, `--track-origins`, 그리고 *동작 비용 vs 정확도* 트레이드오프.

## 참고 자료

- [Valgrind Manual](https://valgrind.org/docs/manual/manual.html)
- [Memcheck User Manual](https://valgrind.org/docs/manual/mc-manual.html)
- [Valgrind QuickStart](https://valgrind.org/docs/manual/quick-start.html)

## 관련 항목

- [Ch 2: Valgrind Memcheck 실전](/blog/tools/debugging/valgrind/chapter02-memcheck) — 다음 글. Memcheck 옵션과 워크플로
- [Sanitizer 종류 비교 — ASan·UBSan·LSan·TSan·MSan](/blog/tools/debugging/sanitizers/chapter01-intro) — 재컴파일 기반 도구 쪽의 전체 지도. Memcheck ↔ ASan·MSan 대응 관계
- [GDB vs LLDB 분석](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — 탐지한 버그를 실제로 들여다볼 때 붙이는 디버거
- [Valgrind Manual](https://valgrind.org/docs/manual/manual.html) — 도구별 공식 매뉴얼 목차
