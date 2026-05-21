---
title: "Ch 1: Valgrind 개요 — Memcheck / Helgrind / DRD"
date: 2026-05-17T01:00:00
description: "Sanitizer 시대에도 Valgrind가 살아남은 이유, 세 핵심 도구의 역할, 도입 자리."
tags: [Valgrind, Memcheck, Helgrind, DRD, Debugging, C, C++]
series: "Valgrind"
seriesOrder: 1
draft: false
---

## Valgrind는 *어떤 도구인가*

Valgrind를 한 줄로 요약하면 *바이너리 위에서 가상 머신을 띄워 실행을 추적하는 도구*입니다.

**일반 실행:**

- 프로그램 → CPU → 결과

**Valgrind 실행:**

- 프로그램 → 디스어셈블 → IR(VEX) → 계측 → 가상 CPU → 결과
- ↑
- 여기서 메모리·동기화 관찰

핵심은 *재컴파일이 필요 없다*는 것입니다. 이미 만들어진 바이너리에 Valgrind만 붙이면 동작합니다.

```bash
$ ./myapp                       # 정상 실행
$ valgrind ./myapp              # Memcheck로 실행 (기본 도구)
$ valgrind --tool=helgrind ./myapp   # 다른 도구
```

이게 [Sanitizer](/blog/tools/debugging/sanitizers/chapter01-intro)와의 가장 큰 차이입니다. Sanitizer는 *컴파일 시점에 계측*되어 *재컴파일이 필수*입니다. Valgrind는 *런타임에 가로채는* 방식이라 *원본 바이너리 그대로* 분석합니다.

---

## *Sanitizer 시대*에 Valgrind가 살아남은 이유

Sanitizer가 더 빠르고 정확한데도 Valgrind가 사라지지 않는 이유는 *서로 닿는 영역이 다르기* 때문입니다.

| 자리 | Sanitizer | Valgrind |
|------|-----------|----------|
| 재컴파일 가능 | 우월 (2~3× 오버헤드) | 느림 (10~50×) |
| 재컴파일 불가능 | *동작 안 함* | *유일한 선택지* |
| 시스템 호출 추적 | 부분적 | *완전* |
| 외부 .so 라이브러리 내부 | 계측 안 됨 → 부분 검사 | *모든 코드 추적* |
| 컴파일러 의존 | GCC/Clang 필수 | *무관* (바이너리만 있으면) |
| 초기화 안 된 메모리 | MSan (Clang only) | *Memcheck 기본 동작* |
| 시스템·임베디드 | *제한적* | *광범위* |

요약: **Sanitizer를 일상에서 쓰고, Valgrind를 *닿지 못하는 자리*에서 씁니다**. 둘이 경쟁이 아니라 *보완*인 이유입니다.

대표적인 Valgrind만 가능한 자리:

- **상용 라이브러리·SDK** — 소스 없이 바이너리만 받은 경우. 재컴파일 자체가 불가능.
- **레거시 시스템** — 옛 GCC, 임베디드 cross compiler, 오래된 RHEL/CentOS.
- **시스템 호출 깊이 추적** — `read()`/`write()`/`mmap()` 같은 syscall 단위 동작을 정확히.
- ***초기화 안 된 메모리 사용*의 정확한 시작점** — Memcheck가 *바이트 단위 정의/미정의 상태*를 추적.

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
- *Uninitialized value 사용* (Valgrind만의 강점)
- Double free / mismatched free (`malloc`/`new[]`/`delete` 짝 오류)
- Overlapping memcpy

가장 자주 쓰는 도구입니다. *Valgrind = Memcheck*로 통하는 이유.

### Helgrind — *데이터 레이스 + 락 오용*

```bash
valgrind --tool=helgrind ./app
```

잡는 것:

- POSIX pthreads의 잘못된 사용 (락 해제 안 함, 이미 잠긴 락에 unlock)
- 데이터 레이스 (동기화 없이 동시 접근)
- 락 순서 위반 (deadlock potential)
- pthread cond signal/wait 패턴 오류

[TSan](/blog/tools/debugging/sanitizers/chapter04-tsan)과 비슷한 일을 합니다. TSan이 더 빠르지만, Helgrind는 *재컴파일 불가 바이너리*에 적용 가능.

### DRD — *Data Race Detector*

```bash
valgrind --tool=drd ./app
```

Helgrind와 *영역이 겹치지만 알고리즘이 다릅니다*. DRD는 *Lamport's vector clock*을 기반으로, Helgrind는 *happens-before + 락 추적*. 둘 중:

- **Helgrind**: 락 오용에 강함, false positive 적음.
- **DRD**: 메모리 사용량 적음, 큰 코드에 유리, 일부 데이터 레이스를 Helgrind보다 잘 잡음.

실무에서는 *Helgrind를 먼저 시도*하고, 그래도 안 잡히면 DRD로 확인하는 식.

---

## 도구별 *언제 무엇을*

| 상황 | 권장 도구 |
|------|----------|
| 일반 메모리 버그 (alloc/free/access) | **Memcheck** |
| 초기화 안 된 값 사용 의심 | **Memcheck** (Sanitizer로 못 잡음) |
| 멀티스레드 락 오용 | **Helgrind** |
| 데이터 레이스 추적 | **Helgrind** 또는 **DRD** |
| 락 순서 / deadlock 가능성 | **Helgrind** |
| 큰 코드 + 메모리 부족 | **DRD** (Helgrind보다 가벼움) |
| 캐시 미스 분석 | **Cachegrind** |
| 호출 그래프 + 프로파일 | **Callgrind** |
| 힙 메모리 추세 분석 | **Massif** |

이 시리즈는 위 표의 *위쪽 다섯 줄* — Memcheck + Helgrind + DRD에 집중합니다.

---

## 첫 사용 — Hello, Memcheck

```c
// leak.c
#include <stdlib.h>
#include <string.h>

int main() {
    char* buf = malloc(40);
    strcpy(buf, "hello");
    // free(buf) 빠뜨림
    return 0;
}
```

```bash
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
2. **`definitely lost`** — *진짜 누수*. 어디서도 못 가리키는 메모리. Sanitizer의 *Direct leak*과 동일.
3. **스택 트레이스** — `leak.c:5`까지 정확히 가리킴.
4. **`LEAK SUMMARY`** — 네 가지 누수 종류로 분류 (definitely / indirectly / possibly / still reachable).

`leak.c:5`가 *줄 번호*까지 정확합니다. 이게 `-g` 디버그 심볼 덕분.

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

```bash
brew install --HEAD valgrind   # macOS는 공식 지원이 약함
```

macOS는 Apple Silicon에서 *공식 지원이 사라졌습니다*. Intel Mac에서만 어느 정도 동작. *최근 macOS = Sanitizer 우선*이고, 깊은 Valgrind 분석은 Linux 환경에서 합니다.

### Windows

WSL이 정답입니다. *네이티브 Windows Valgrind는 없습니다*.

### 권장 버전

3.18.0+ — 최신 GCC·Clang의 디버그 심볼 형식 지원.

```bash
$ valgrind --version
valgrind-3.22.0
```

---

## 시리즈 로드맵

1. **Ch 1: 개요** (이 글)
2. **Ch 2: Memcheck 실전 사용** — 옵션, leak-check 단계, suppression
3. **Ch 3: Leak Report 읽기** — 4가지 누수 분류 해석, *재귀 트레이스*, 우선순위
4. **Ch 4: Helgrind / DRD** — 멀티스레드 분석 두 도구 비교, 락 오용 패턴
5. **Ch 5: Suppression과 실무 운용** — 외부 라이브러리 우회, CI 통합, Sanitizer와 분담

---

## 정리

- **Valgrind**는 *바이너리 가상 머신*. 재컴파일 없이 분석. 10~50× 느림.
- *Sanitizer와 보완 관계*. 닿지 못하는 자리(상용 SDK / 시스템 호출 / 외부 .so)에 씀.
- 세 핵심 도구: **Memcheck** (메모리 + 초기화), **Helgrind** (락 + race), **DRD** (race).
- macOS는 *공식 지원 약함*. Linux + WSL이 사실상 표준 환경.
- 권장 운영: 일상 = Sanitizer, *릴리스 전 점검* = Valgrind Memcheck.

## 다음 장 예고

[Ch 2: Memcheck 실전 사용](/blog/tools/debugging/valgrind/chapter02-memcheck)에서는 Memcheck의 모든 옵션과 *어디서 어떤 보고가 나는지*를 다룹니다. `--leak-check`, `--show-leak-kinds`, `--track-origins`, 그리고 *동작 비용 vs 정확도* 트레이드오프.

## 참고 자료

- [Valgrind Manual](https://valgrind.org/docs/manual/manual.html)
- [Memcheck User Manual](https://valgrind.org/docs/manual/mc-manual.html)
- [Valgrind QuickStart](https://valgrind.org/docs/manual/quick-start.html)

## 관련 시리즈

- [Sanitizers](/blog/tools/debugging/sanitizers/chapter01-intro) — Valgrind와 보완
- [GDB / LLDB](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — 인터랙티브 디버깅
