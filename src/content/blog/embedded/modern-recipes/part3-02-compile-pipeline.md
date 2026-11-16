---
title: "C 컴파일 4단계 — Preprocess·Compile·Assemble·Link 추적"
slug: "embedded/modern-recipes/part3-02-compile-pipeline"
date: 2026-04-12T09:24:00
description: "Preprocess·compile·assemble·link — `-E -S -c` 분해."
series: "Modern Embedded Recipes"
seriesOrder: 24
tags: [recipes, toolchain, compile]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"`gcc main.c`는 사실 여러 도구를 차례로 부른 것입니다."** preprocess → compile → assemble → link. `-v`를 붙이면 driver가 `cc1`과 `as`를 실제로 어떤 인자로 부르는지 보이고, 각 단계를 분리해 보면 문제가 어느 단계에서 생겼는지 바로 좁혀집니다.

## 어떤 상황에서 쓰나

- 매크로가 예상대로 펼쳐졌는지 확인하고 싶을 때
- 컴파일러가 만든 assembly를 보고 최적화 결과 확인
- Linker error의 단계별 원인 추적
- 빌드 시스템에서 단계별 캐싱 설계

이 글의 출력은 모두 Debian 13 arm64 guest에서 Debian 패키지 `gcc-arm-none-eabi` 14.2.rel1-1(GCC 14.2.1)과 newlib 4.5.0으로 돌린 결과입니다. 공통 옵션은 `-mcpu=cortex-m4 -mthumb`입니다.

## 핵심 개념

### 1) 4단계 — 도구별 역할

| 단계 | 도구 | 입력 | 출력 |
| --- | --- | --- | --- |
| Preprocess | `cc1 -E` (`cpp`) | `.c` + 헤더 | `.i` (전개된 C 소스) |
| Compile | `cc1` | `.c`/`.i` | `.s` (assembly) |
| Assemble | `as` | `.s` | `.o` (object) |
| Link | `collect2` → `ld` | `.o` + library | `.elf` (실행) |

GCC driver에 `-v`를 주면 이 호출이 그대로 찍힙니다. `-c`까지만 실행했을 때의 두 줄입니다.

```text
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -v -c main.c -o /dev/null
 /usr/lib/gcc/arm-none-eabi/14.2.1/cc1 -quiet -v -imultilib thumb/v7e-m/nofp -D__USES_INITFINI__ main.c -quiet -dumpbase main.c -dumpbase-ext .c -mcpu=cortex-m4 -mthumb -mfloat-abi=soft -mlibarch=armv7e-m -march=armv7e-m -O2 -version -o /tmp/ccSaHebW.s
 /usr/lib/gcc/arm-none-eabi/14.2.1/../../../arm-none-eabi/bin/as -v -march=armv7e-m -mfloat-abi=soft -meabi=5 -o /dev/null /tmp/ccSaHebW.s
```

link까지 가는 빌드에 `-v`를 주면 마지막 줄은 `/usr/lib/gcc/arm-none-eabi/14.2.1/collect2 -plugin ...`로, driver가 `ld`를 `collect2`를 통해 부르는 것이 보입니다. 이 GCC는 preprocess와 compile을 `cc1` 한 번으로 처리하고 `.s`를 `/tmp`의 임시 파일로 넘깁니다. driver가 `-mcpu=cortex-m4`에서 `-march=armv7e-m`, 기본 `-mfloat-abi=soft`, multilib `thumb/v7e-m/nofp`를 스스로 붙인 것도 보입니다.

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
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -E main.c -o main.i
```

`main.i`는 76줄이었고, 끝부분은 다음과 같습니다. `LED_PIN`이 `5`로 바뀌어 있습니다.

```c
# 4 "main.c"
int main(void) {
    uint32_t pin = 1 << 5;
    return pin;
}
```

같은 파일 안의 `uint32_t` 정의는 `typedef long unsigned int uint32_t;`였습니다. 32-bit ARM에서 `long`도 32-bit라 크기는 같지만, `unsigned int`와는 다른 타입이라, `-Wall`(`-Wformat`)을 켜면 `uint32_t`를 `%u`로 찍는 줄에서 "format '%u' expects argument of type 'unsigned int', but argument 2 has type 'uint32_t' {aka 'long unsigned int'}" 경고가 납니다. 매크로가 어떻게 펼쳐졌는지는 `.i`를 보는 것이 가장 빠릅니다.

### 4) Compile — `.s`

`.i`를 architecture에 맞는 assembly로 변환합니다. 최적화 옵션에 따라 결과가 크게 다릅니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -S main.c -o main-O0.s
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -S main.c -o main-O2.s
```

```text
@ -O0 (기본)                         @ -O2
main:                                main:
	push	{r7}                         	movs	r0, #32
	sub	sp, sp, #12                  	bx	lr
	add	r7, sp, #0
	movs	r3, #32
	str	r3, [r7, #4]
	ldr	r3, [r7, #4]
	mov	r0, r3
	adds	r7, r7, #12
	mov	sp, r7
	pop	{r7}
	bx	lr
```

`-O0`은 지역 변수 `pin`을 stack에 저장했다가 다시 읽고, `-O2`는 상수 32를 바로 반환합니다.

### 5) Assemble — `.o`

`.s`를 기계어 object로 변환합니다. 이 단계에서는 다른 파일에 정의된 symbol이 아직 unresolved(`U`)로 남습니다.

```text
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -c main.c -o main.o && arm-none-eabi-nm main.o
00000000 T main
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -c startup.c -o startup.o && arm-none-eabi-nm startup.o
00000000 T Reset_Handler
         U _estack
00000000 D counter
         U main
00000000 B scratch
00000000 D vectors
```

`startup.c`는 `main`과 linker script의 `_estack`을 참조만 하므로 둘 다 `U`입니다. `T`는 code, `D`는 초기화된 data, `B`는 bss입니다.

### 6) Link — `.elf`

여러 `.o`와 library를 합쳐 최종 실행 파일을 만듭니다. linker script가 메모리 배치를 결정합니다. 아래 linker script는 FLASH를 0x08000000, RAM을 0x20000000에 두고 `.data`를 RAM에서 실행하되 FLASH에 적재(`AT > FLASH`)합니다.

```text
MEMORY { FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 1M
         RAM  (rwx) : ORIGIN = 0x20000000, LENGTH = 128K }
ENTRY(Reset_Handler)
SECTIONS {
  .isr_vector : { KEEP(*(.isr_vector)) } > FLASH
  .text : { *(.text*) *(.rodata*) } > FLASH
  .data : { *(.data*) } > RAM AT > FLASH
  .bss  : { *(.bss*) *(COMMON) } > RAM
  _estack = ORIGIN(RAM) + LENGTH(RAM);
}
```

```text
$ arm-none-eabi-ld -T linker.ld main.o startup.o -o app.elf
$ arm-none-eabi-objdump -h app.elf
Idx Name          Size      VMA       LMA       File off  Algn
  0 .isr_vector   00000008  08000000  08000000  00010000  2**2
  1 .text         0000001c  08000008  08000008  00010008  2**2
  2 .data         00000004  20000000  08000024  00020000  2**2
  3 .bss          00000020  20000004  08000028  00020004  2**2
  4 .comment      00000026  00000000  00000000  00020004  2**0
  5 .ARM.attributes 0000002e  00000000  00000000  0002002a  2**0
```

`.data`의 VMA(실행 주소)는 RAM의 0x20000000이고 LMA(적재 주소)는 FLASH의 0x08000024입니다. startup 코드가 부팅 때 LMA에서 VMA로 복사해야 하는 이유가 이 두 열의 차이입니다([3-06](/blog/embedded/modern-recipes/part3-06-startup-code)).

## 코드 / 실제 사용 예

매크로가 어디서 왔는지 모를 때는 `-dM`으로 정의된 매크로를 모두 뽑아 grep합니다.

```text
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -E -dM main.c | grep -E "UINT32_MAX|__ARM_ARCH_7EM__"
#define __UINT32_MAX__ 0xffffffffUL
#define UINT32_MAX __UINT32_MAX__
#define __ARM_ARCH_7EM__ 1
```

어떤 헤더가 실제로 include됐는지는 `-H`가 stderr로 보여 줍니다. 이 toolchain에서는 GCC 자체의 `stdint.h`가 쓰였습니다.

```text
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -E -H main.c -o /dev/null
. /usr/lib/gcc/arm-none-eabi/14.2.1/include/stdint.h
```

특정 함수만 assembly로 보기:

```bash
arm-none-eabi-objdump -d main.o | grep -A 20 "<my_function>"
```

Inline 결정은 GIMPLE dump로 확인합니다. dump 파일 이름의 번호는 pass 순서라 GCC 버전마다 다르며, 이 GCC 14.2.1에서는 `.032t.einline`이었습니다.

```text
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -c -fdump-tree-einline ../main.c -o m.o && ls
m.c.032t.einline
m.o
```

## 측정 / 비교

단계별 시간은 이 정도 크기의 파일에서 의미 있는 차이가 나지 않아 재지 않았습니다. 대신 단계를 들여다보는 옵션을 정리합니다.

| 옵션 | 효과 |
| --- | --- |
| `-pipe` | 단계 사이를 임시 파일 대신 pipe로 연결 |
| `-fsyntax-only` | 문법·타입 검사만 하고 출력 파일을 만들지 않음 |
| `-v` | 각 단계의 실제 호출 표시 (위 1절) |
| `-save-temps` | `.i`·`.s`를 지우지 않고 남김 (`-o m.o`로 주면 `m.i`·`m.s`·`m.o`가 생김) |

## 자주 보는 함정

> ⚠️ Preprocess 결과 안 보고 매크로 디버깅

매크로 충돌이나 우선순위 문제는 `.i` 파일에서 펼쳐진 식을 직접 보면 원인이 드러납니다. 위 `uint32_t`가 `long unsigned int`로 정의된 것처럼, 타입 문제도 `.i`에서 확인됩니다.

> ⚠️ `-S` 출력에서 함수 사라짐

`-O2`에서 모든 호출이 inline되고 주소가 쓰이지 않은 `static` 함수는 별도 label이 남지 않습니다. `static int sq(int x)`를 `g()`에서 한 번 부르는 파일을 `-S`로 컴파일하면 label은 `f:`와 `g:`뿐이었습니다. 그 함수가 inline된 호출자 코드를 보거나, `-fdump-tree-einline`으로 inline 결정을 확인합니다.

> ⚠️ `size` 결과만 보고 크기 분석

`arm-none-eabi-size`의 기본(Berkeley) 형식은 section을 text·data·bss 세 묶음으로 합칩니다. 위 `app.elf`는 `text 28, data 12, bss 32`로 나왔는데, `objdump -h`를 보면 data 12는 `.data` 4 byte와 `.isr_vector` 8 byte의 합입니다. `.isr_vector`가 `CONTENTS, ALLOC, LOAD, DATA` 속성이라 data로 셌기 때문입니다. section별 크기는 `size -A`나 `objdump -h`로 봅니다.

```text
$ arm-none-eabi-size -A app.elf
section           size        addr
.isr_vector          8   134217728
.text               28   134217736
.data                4   536870912
.bss                32   536870916
```

> ⚠️ Link 단계의 search path 부족

`-L<path>` 없이 외부 library를 찾으면 linker는 기본 경로만 봅니다. `-v`로 실제 호출을 보면 `collect2`·`ld`에 넘어간 `-L` 목록이 나옵니다.

> ⚠️ `-c` 빠뜨리고 일부 파일만 빌드

`main`이 없는 파일들을 `-c` 없이 묶으면 driver가 newlib의 `crt0`까지 링크하려다 실패합니다.

```text
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 a.c b.c -o app2
.../libgloss/arm/crt0.S:546:(.text+0x4c): undefined reference to `main'
.../newlib/libc/stdlib/exit.c:65:(.text+0x14): undefined reference to `_exit'
```

object만 필요하면 `-c`로 각각 컴파일하고, link는 linker script와 startup을 갖춘 뒤 따로 합니다.

## 정리

- `gcc main.c` 한 번은 `cc1`(preprocess+compile), `as`, `collect2`/`ld`를 차례로 부르고, `-v`로 실제 인자를 볼 수 있습니다.
- `-E`, `-S`, `-c`로 단계별 중간 산출물을 만들 수 있습니다.
- `.i`로 매크로와 타입, `.s`로 최적화, `.o`의 `nm`으로 symbol, `.elf`의 `objdump -h`로 VMA·LMA 배치를 확인합니다.
- `size`의 세 묶음은 section 단위 분석을 대신하지 못합니다.

다음 편에서는 **ELF 파일 구조**를 다룹니다. `.elf`의 내부를 dissect 합니다.

## 관련 항목

- [3-01: 크로스 컴파일러](/blog/embedded/modern-recipes/part3-01-cross-compiler)
- [3-03: ELF 파일 구조](/blog/embedded/modern-recipes/part3-03-elf-format)
- [3-09: 컴파일러 최적화](/blog/embedded/modern-recipes/part3-09-compiler-optimization)
- 더 깊이 — [Embedded C++ for Real Systems: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags)
