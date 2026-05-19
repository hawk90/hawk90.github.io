---
title: "3-02: 컴파일 4단계"
date: 2026-05-13T00:00:00
description: "Preprocess·compile·assemble·link — `-E -S -c` 분해."
series: "Modern Embedded Recipes"
seriesOrder: 24
tags: [recipes, toolchain, compile]
draft: false
---

## 한 줄 요약

> **"`gcc main.c`는 사실 4개의 도구를 차례로 부른 것입니다."** preprocess → compile → assemble → link. 각 단계를 분리해 보면 디버깅이 훨씬 쉬워집니다.

## 어떤 상황에서 쓰나

- 매크로가 예상대로 펼쳐졌는지 확인하고 싶을 때
- 컴파일러가 만든 assembly를 보고 최적화 결과 확인
- Linker error의 단계별 원인 추적
- 빌드 시스템에서 단계별 캐싱 설계

## 핵심 개념

### 1) 4단계 — 도구별 역할

```text
main.c  ──[1]──→ main.i  ──[2]──→ main.s  ──[3]──→ main.o  ──[4]──→ app.elf
        cpp              cc1               as                ld
        (preprocess)     (compile)         (assemble)        (link)
```

| 단계 | 도구 | 입력 | 출력 |
| --- | --- | --- | --- |
| Preprocess | cpp | `.c` + 헤더 | `.i` (전개된 C 소스) |
| Compile | cc1 | `.i` | `.s` (assembly) |
| Assemble | as | `.s` | `.o` (object) |
| Link | ld | `.o` + library | `.elf` (실행) |

### 2) GCC 단계별 옵션

| 옵션 | 의미 |
| --- | --- |
| `-E` | preprocess만 (`.i` 출력) |
| `-S` | compile까지 (`.s` 출력) |
| `-c` | assemble까지 (`.o` 출력) |
| (none) | link까지 |

### 3) Preprocess — `.i`

매크로 확장, `#include` 삽입, 조건부 컴파일이 일어납니다.

```c
// main.c
#define LED_PIN 5
#include <stdint.h>

int main(void) {
    uint32_t pin = 1 << LED_PIN;
    return pin;
}
```

```bash
arm-none-eabi-gcc -E main.c -o main.i
```

`main.i`는 수백 줄의 전개 결과입니다. 마지막에 다음과 비슷한 코드:

```c
typedef unsigned int uint32_t;
# 4 "main.c"
int main(void) {
    uint32_t pin = 1 << 5;
    return pin;
}
```

매크로 디버깅 시 가장 빠른 도구입니다.

### 4) Compile — `.s`

`.i`를 architecture에 맞는 assembly로 변환합니다.

```bash
arm-none-eabi-gcc -S -mcpu=cortex-m4 -mthumb main.c -o main.s
```

```asm
main:
    movs    r0, #32         @ 1 << 5
    bx      lr
```

`-O2` 등 최적화 옵션의 효과를 직접 봅니다.

### 5) Assemble — `.o`

`.s`를 binary로 변환합니다. 아직 외부 symbol 참조는 unresolved입니다.

```bash
arm-none-eabi-as -mcpu=cortex-m4 -mthumb main.s -o main.o
arm-none-eabi-nm main.o
# 00000000 T main
```

`nm`으로 symbol을 확인합니다.

### 6) Link — `.elf`

여러 `.o`와 libraries를 합쳐 최종 실행 파일을 만듭니다. linker script가 메모리 배치를 결정합니다.

```bash
arm-none-eabi-ld -T linker.ld main.o startup.o -o app.elf
arm-none-eabi-objdump -h app.elf
# Sections:
# Idx Name          Size      VMA
#   0 .text         00000040  08000000
#   1 .data         00000008  20000000
#   2 .bss          00000020  20000008
```

## 코드 / 실제 사용 예

매크로 확장 결과를 보는 디버깅:

```bash
# 어떤 헤더에서 정의된 매크로인지 모를 때
arm-none-eabi-gcc -E -dM main.c | grep RCC_AHB1
# #define RCC_AHB1ENR_GPIOAEN  ((uint32_t)0x00000001)
# ...

# 특정 헤더 위치 확인
arm-none-eabi-gcc -E -H main.c 2>&1 | head
# . /usr/include/stdint.h
# .. /usr/include/sys/_stdint.h
```

최적화 결과 확인:

```bash
# -O0 vs -O2 비교
arm-none-eabi-gcc -S -O0 main.c -o main-O0.s
arm-none-eabi-gcc -S -O2 main.c -o main-O2.s
diff main-O0.s main-O2.s
```

특정 함수만 assembly로 보기:

```bash
arm-none-eabi-objdump -d main.o | grep -A 20 "<my_function>"
```

Inline 대상 결정 확인:

```bash
arm-none-eabi-gcc -O2 -fdump-tree-einline main.c
# main.c.157t.einline 파일이 생성됨
```

## 측정 / 비교

| 단계 | 시간 (간단한 main.c) | 출력 크기 |
| --- | --- | --- |
| Preprocess | 10 ms | 200 KB (.i, 전개된 헤더 포함) |
| Compile | 30 ms | 500 B (.s) |
| Assemble | 5 ms | 100 B (.o) |
| Link | 50 ms (libc 검색) | 2 KB (.elf) |

| 옵션 | 효과 |
| --- | --- |
| `-pipe` | 단계 간 임시 파일 안 만들고 파이프로 |
| `-fsyntax-only` | parse만 (출력 없음, 빠른 검증) |
| `-v` | 각 단계의 실제 호출 표시 |

## 자주 보는 함정

> ⚠️ Preprocess 결과 안 보고 매크로 디버깅

매크로 충돌, 우선순위 문제는 `.i` 파일을 직접 보면 즉시 해결됩니다.

> ⚠️ `-S` 출력에서 함수 사라짐

`-O2` 이상에서 inline된 함수는 별도 entry가 안 보입니다. 그 함수가 inline 된 호출자 코드를 봐야 합니다.

> ⚠️ Object file의 section을 모르고 size 분석

`size` 명령은 .text, .data, .bss만 보여줍니다. 진짜 분석은 `objdump -h`로 모든 section을 봐야 합니다.

> ⚠️ Link 단계의 search path 부족

`-L<path>` 없이 외부 library를 찾으면 linker가 default path만 봅니다. `-v` 옵션으로 실제 search path 확인.

> ⚠️ `-c` 빠뜨리고 여러 파일 빌드

`gcc a.c b.c -o app` 하면 link까지 진행해 `_start`나 startup 함수 없으면 error. `gcc -c a.c` `gcc -c b.c` 후 link.

## 정리

- 한 번의 `gcc main.c`는 사실 cpp, cc1, as, ld 4단계가 차례로 실행됩니다.
- `-E`, `-S`, `-c`로 단계별 중간 산출물을 만들 수 있습니다.
- `.i`로 매크로, `.s`로 최적화, `.o`로 symbol, `.elf`로 메모리 배치를 확인합니다.
- `-v`, `-dM`, `-H` 옵션으로 빌드 내부를 들여다봅니다.
- 단계 분리는 빌드 디버깅의 가장 강력한 도구입니다.

다음 편에서는 **ELF 파일 구조**를 다룹니다. `.elf`의 내부를 dissect 합니다.

## 관련 항목

- [3-01: 크로스 컴파일러](/blog/embedded/modern-recipes/part3-01-cross-compiler)
- [3-03: ELF 파일 구조](/blog/embedded/modern-recipes/part3-03-elf-format)
- [3-09: 컴파일러 최적화](/blog/embedded/modern-recipes/part3-09-compiler-optimization)
- 더 깊이 — [Embedded C++ for Real Systems: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags)
