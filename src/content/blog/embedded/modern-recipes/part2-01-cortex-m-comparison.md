---
title: "ARM Cortex-M 시리즈 비교 — M0·M3·M4·M7·M33·M55 분석"
slug: "embedded/modern-recipes/part2-01-cortex-m-comparison"
date: 2026-04-11T09:13:00
description: "M0/M0+/M3/M4/M7/M33/M55/M85 — 어느 코어를 언제 쓰나."
series: "Modern Embedded Recipes"
seriesOrder: 13
tags: [recipes, arm, cortex-m]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Cortex-M 코어 선택은 ISA 세대, DSP·FPU·Helium 유무, MPU·TrustZone 옵션의 조합입니다."** 같은 C 코드도 `-mcpu` 하나로 `mla`·`smlabb`·`vmlava.s16`처럼 다른 명령으로 컴파일됩니다.

## 어떤 상황에서 쓰나

새 프로젝트의 칩 선택 단계에서 Cortex-M 패밀리 중 어느 코어가 적절한지 결정해야 할 때가 있습니다. 같은 Cortex-M이라도 코어마다 아키텍처 버전, 명령어 확장, FPU, MPU, TrustZone 지원이 다릅니다. 이 글의 표는 Arm이 공개한 *Arm Cortex-M Processor Comparison Table*(문서 102787, version 3.0)과 각 코어의 TRM에서 옮겼고, 컴파일 결과는 이 글을 쓰면서 직접 돌린 출력입니다.

## 핵심 개념

### 1) Cortex-M 패밀리 한눈에

아래 표는 Arm Comparison Table의 행을 그대로 옮긴 것입니다. "옵션"은 칩 벤더가 구현할지 고르는 항목이라, 같은 코어라도 실제 칩에는 없을 수 있습니다.

| 코어 | 아키텍처 | TrustZone | DSP | FPU | Helium | MPU 최대 region | CoreMark/MHz |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | Armv6-M | X | X | X | X | 0 | 2.33 |
| M0+ | Armv6-M | X | X | X | X | 8 | 2.46 |
| M1 | Armv6-M | X | X | X | X | 0 | 1.83 |
| M23 | Armv8-M Baseline | 옵션 | X | X | X | 16 | 2.64 |
| M3 | Armv7-M | X | X | X | X | 8 | 3.45 |
| M4 | Armv7-M | X | O | SP (옵션) | X | 8 | 3.54 |
| M33 | Armv8-M Mainline | 옵션 | 옵션 | SP (옵션) | X | 16 | 4.10 |
| M35P | Armv8-M Mainline | 옵션 | 옵션 | SP (옵션) | X | 16 | 4.10 |
| M52 | Armv8.1-M Mainline | 옵션 | O | HP/SP/DP (옵션) | Single-beat (옵션) | 16 | 4.30 |
| M55 | Armv8.1-M Mainline | 옵션 | O | HP/SP/DP (옵션) | Dual-beat (옵션) | 16 | 4.40 |
| M7 | Armv7-M | X | O | SP/DP (옵션) | X | 16 | 5.29 |
| M85 | Armv8.1-M Mainline | O | O | HP/SP/DP (옵션) | Dual-beat (옵션) | 16 | 6.28 |

같은 표에서 cache 행도 눈여겨볼 만합니다. M0~M33에는 instruction·data cache가 없고, M35P는 2~16 kB instruction cache, M52·M55·M7·M85는 0~64 kB instruction·data cache와 0~16 MB TCM을 구성할 수 있습니다. 외부 인터럽트 최대 개수는 M0/M0+/M1이 32, M3/M4/M7/M23이 240, M33·M35P·M52·M55·M85가 480입니다.

> **메모** — Comparison Table의 M4 아키텍처 칸은 "Armv7-M"이지만, GCC는 `-mcpu=cortex-m4`·`-mcpu=cortex-m7`에서 `__ARM_ARCH_7EM__`을 정의합니다(아래 3절 출력). DSP 확장이 들어간 Armv7-M을 Armv7E-M이라고 부릅니다.

### 2) 파이프라인 — 문서가 밝힌 것만

파이프라인 깊이는 Arm이 모든 코어에 같은 형식으로 공개하지 않습니다. 이 글에서 1차 자료로 확인한 것은 다음과 같습니다.

| 코어 | 문서의 기술 | 출처 |
| --- | --- | --- |
| M0+ | 2-stage | Cortex-M0+ Processor Datasheet (102835) |
| M23 | "low gate count, two-stage" | Cortex-M23 TRM r2p0, 2.1 |
| M3 | 분기 시 pipeline refill 1~3 cycle (`P`) | Cortex-M3 TRM r2p0, Table 3-1 범례 |
| M55 | "in-order four-stage integer pipeline" | Cortex-M55 TRM r1p1 |
| M7 | "in-order issue, super-scalar pipeline with dynamic branch prediction" | Cortex-M7 TRM r1p2, 1.1.1 |

M4 TRM의 "three stage pipeline"은 *FPU*의 pipeline을 설명하는 항목이라 정수 pipeline 깊이로 옮기면 안 됩니다. M0·M3·M4·M33·M85의 정수 pipeline 단수는 이번에 연 문서에서 찾지 못해 표에 넣지 않았습니다.

### 3) DSP / SIMD / Helium

DSP 확장은 32-bit 레지스터 하나를 16-bit 둘이나 8-bit 넷으로 쪼개 쓰는 명령입니다. Cortex-M4 TRM Table 3-2는 `SMLAD`를 "dual 16-bit signed multiply with single 32-bit accumulator", `QADD8`을 "quad 8-bit saturating add"로 설명합니다. Helium(MVE)은 Armv8.1-M의 128-bit 벡터 확장이고, Cortex-M55 TRM은 "Eight 128-bit vector registers, Q0-Q7"을 명시합니다.

컴파일러가 어떤 확장을 쓸 수 있다고 판단하는지는 predefined macro로 바로 보입니다. 아래는 arm-none-eabi-gcc 16.2.0에서 `-dM -E`로 뽑은 값입니다.

```bash
for cpu in cortex-m0plus cortex-m3 cortex-m4 cortex-m7 cortex-m33 cortex-m55 cortex-m85; do
  printf "%-14s " $cpu
  arm-none-eabi-gcc -mthumb -mcpu=$cpu -dM -E - </dev/null \
    | grep -E '__ARM_FEATURE_DSP |__ARM_FEATURE_MVE |__ARM_FP |__ARM_ARCH_[0-9A-Z_]+ ' \
    | awk '{printf "%s=%s ", $2,$3}'; echo
done
```

```text
cortex-m0plus  __ARM_ARCH_6M__=1 __ARM_ARCH_PROFILE=77 __ARM_ARCH_ISA_THUMB=1
cortex-m3      __ARM_ARCH_7M__=1 __ARM_ARCH_PROFILE=77 __ARM_ARCH_ISA_THUMB=2 __ARM_ARCH_EXT_IDIV__=1
cortex-m4      __ARM_ARCH_7EM__=1 __ARM_ARCH_PROFILE=77 __ARM_ARCH_ISA_THUMB=2 __ARM_FEATURE_DSP=1 __ARM_ARCH_EXT_IDIV__=1
cortex-m7      __ARM_ARCH_7EM__=1 __ARM_ARCH_PROFILE=77 __ARM_ARCH_ISA_THUMB=2 __ARM_FEATURE_DSP=1 __ARM_ARCH_EXT_IDIV__=1
cortex-m33     __ARM_ARCH_PROFILE=77 __ARM_ARCH_ISA_THUMB=2 __ARM_FEATURE_DSP=1 __ARM_ARCH_EXT_IDIV__=1 __ARM_ARCH_8M_MAIN__=1
cortex-m55     __ARM_ARCH_PROFILE=77 __ARM_ARCH_ISA_THUMB=2 __ARM_FEATURE_DSP=1 __ARM_ARCH_EXT_IDIV__=1 __ARM_ARCH_8M_MAIN__=1
cortex-m85     __ARM_ARCH_PROFILE=77 __ARM_ARCH_ISA_THUMB=2 __ARM_FEATURE_DSP=1 __ARM_ARCH_EXT_IDIV__=1 __ARM_ARCH_8M_MAIN__=1
```

`-mcpu`만 주면 DSP(`__ARM_FEATURE_DSP=1`)는 켜지지만 `__ARM_FP`와 `__ARM_FEATURE_MVE`는 정의되지 않습니다. arm-none-eabi-gcc의 기본 float ABI가 `soft`이기 때문입니다. `-mfloat-abi=hard`를 붙이면 `-mfpu` 없이도 코어에 맞는 FPU가 선택됩니다.

```text
### -mfloat-abi=hard (no -mfpu)
cortex-m4    __ARM_FP=4
cortex-m7    __ARM_FP=14
cortex-m33   __ARM_FP=4
cortex-m55   __ARM_FP=14 __ARM_FEATURE_MVE=3
cortex-m85   __ARM_FP=14 __ARM_FEATURE_MVE=3
### cortex-m55 -mfloat-abi=soft   (출력 없음: FP·MVE 미정의)
### cortex-m55 -mfloat-abi=softfp __ARM_FP=14 __ARM_FEATURE_MVE=3
```

ACLE 명세의 "Hardware floating point" 절에서 `__ARM_FP`는 비트 집합이고 0x02=half, 0x04=single, 0x08=double입니다. 그래서 4는 single만, 14(0x0E)는 half·single·double을 뜻합니다. M55에서 `-mfloat-abi=soft`를 쓰면 MVE 매크로까지 사라지므로, Helium을 쓰려면 `softfp`나 `hard`가 필요합니다.

### 4) FPU 옵션

| 코어 | FPU (Comparison Table) | 아키텍처 이름 (TRM) |
| --- | --- | --- |
| M0 / M0+ / M1 / M23 / M3 | 없음 | — |
| M4 | SP (옵션) | FPv4-SP (M4 TRM) |
| M33 / M35P | SP (옵션) | FPv5 (M33 TRM) |
| M7 | SP, DP (옵션) | FPv5, double-precision 명령은 옵션 (M7 TRM) |
| M52 / M55 / M85 | HP, SP, DP (옵션) | — |

double precision을 하드웨어로 처리하는 코어는 M7·M52·M55·M85입니다. FPU가 없는 코어에서 `float` 연산은 컴파일러 런타임의 소프트웨어 루틴으로 처리됩니다.

### 5) Security — TrustZone-M

Comparison Table에서 TrustZone for Armv8-M은 M23·M33·M35P·M52·M55가 옵션, M85는 "Yes"입니다. Armv7-M과 Armv6-M 코어(M0·M0+·M1·M3·M4·M7)에는 없습니다. Cortex-M33 TRM은 "Security Extension이 구현되면 processor는 항상 Secure state로 reset된다"고 적고 있습니다. 자세한 분할 방법은 [2-09 TrustZone-M](/blog/embedded/modern-recipes/part2-09-trustzone-m)에서 다룹니다.

## 코드 / 실제 사용 예

FIR의 안쪽 루프는 16-bit 곱셈 누적입니다. 같은 C 함수를 코어만 바꿔 컴파일하면 어떤 명령이 나오는지 비교해 봅니다.

```c
#include <stdint.h>
/* 16-bit dot product: the inner loop of a q15 FIR */
int32_t dot_q15(const int16_t *a, const int16_t *b, int n) {
    int32_t acc = 0;
    for (int i = 0; i < n; i++) acc += a[i] * b[i];
    return acc;
}
```

Homebrew의 arm-none-eabi-gcc 16.2.0에는 newlib가 없어 `-ffreestanding`으로 GCC 자체 `stdint.h`를 쓰게 했습니다.

```bash
for cpu in cortex-m0plus cortex-m3 cortex-m4 cortex-m55; do
  arm-none-eabi-gcc -ffreestanding -O2 -mthumb -mcpu=$cpu -S dot.c -o dot-$cpu.s
done
arm-none-eabi-gcc -ffreestanding -O3 -mthumb -mcpu=cortex-m55 -mfloat-abi=hard -S dot.c -o dot-m55-hard.s
clang --target=arm-none-eabi -mcpu=cortex-m55 -mfloat-abi=hard -ffreestanding -O2 -S dot.c -o dot-clang-m55.s
```

루프 본체의 곱셈 명령만 뽑으면 다음과 같습니다.

```text
cortex-m0plus (gcc -O2)        muls     r2, r1
cortex-m3     (gcc -O2)        mla      r0, lr, ip, r0
cortex-m4     (gcc -O2)        smlabb   r0, lr, ip, r0
cortex-m55    (gcc -O2)        smlabb   r0, ip, r2, r0 / le lr, .L3
cortex-m55    (gcc -O3, hard)  smlabb   r0, ip, r2, r0 / dls lr, lr / le lr, .L3
cortex-m55    (clang 23.1.5)   dlstp.16 lr, r2
                               vldrh.u16 q0, [r0], #16
                               vldrh.u16 q1, [r1], #16
                               vmlava.s16 r12, q1, q0
                               letp     lr, .LBB0_2
```

M0+는 곱셈 후 별도 덧셈, M3는 곱셈-누적 `mla`, M4는 DSP 확장의 16-bit 곱셈-누적 `smlabb`를 씁니다. M55에서 GCC 16.2.0은 `-O3 -mfloat-abi=hard`에서도 이 reduction을 벡터화하지 않고 Armv8.1-M의 low-overhead loop(`dls`/`le`)만 썼습니다. 같은 코드를 clang 23.1.5로 컴파일하면 tail-predicated loop(`dlstp.16`/`letp`)와 `vmlava.s16`으로 한 번에 16-bit 8개를 곱해 누적합니다. GCC 11 release notes가 MVE "initial auto-vectorization"이라고 적은 대로, 자동 벡터화 범위는 컴파일러마다 다릅니다.

손으로 DSP 명령을 고정하고 싶으면 ACLE intrinsic을 씁니다. `-mcpu=cortex-m4`만으로 `smlad`가 나오고, M3에서는 `int16x2_t` 타입 자체가 정의되지 않아 컴파일 에러가 납니다.

```c
#include <arm_acle.h>
#include <stdint.h>
/* two 16x16 MACs in one instruction */
int32_t mac2(int16x2_t a, int16x2_t b, int32_t acc) { return __smlad(a, b, acc); }
```

```text
$ arm-none-eabi-gcc -ffreestanding -O2 -mthumb -mcpu=cortex-m4 -c acle.c && arm-none-eabi-objdump -d acle.o | grep smlad
   0:	fb20 2001 	smlad	r0, r0, r1, r2
$ arm-none-eabi-gcc -ffreestanding -O2 -mthumb -mcpu=cortex-m3 -c acle.c
acle.c:4:14: error: unknown type name 'int16x2_t'; did you mean 'int16_t'?
```

실무에서는 CMSIS-DSP의 `arm_fir_q15`를 쓰는 편이 낫습니다. 다만 "코어를 자동으로 감지"하는 것은 아니고, *컴파일 시점*에 `arm_math_types.h`가 `__ARM_FEATURE_DSP`면 `ARM_MATH_DSP`를, `__ARM_FEATURE_MVE`면 `ARM_MATH_MVEI`를 정의하고, `arm_fir_q15.c`는 `#if defined(ARM_MATH_MVEI)`로 Helium 구현을 고릅니다. `arm_fir_init_q15`의 문서는 `numTaps`가 "even and greater than or equal to 4"여야 하고, `pState` 길이는 `numTaps+blockSize-1`(`ARM_MATH_LOOPUNROLL` 정의 시 `numTaps+blockSize`)이라고 적습니다.

```c
#include "arm_math.h"

#define NUM_TAPS   64
#define BLOCK_SIZE 256

static const q15_t coef[NUM_TAPS] = { 0x0400 /* ... 64 coefficients ... */ };
static q15_t state[NUM_TAPS + BLOCK_SIZE];   /* numTaps + blockSize */
static arm_fir_instance_q15 S;

void fir_init(void) {
    /* numTaps must be even and >= 4 */
    (void)arm_fir_init_q15(&S, NUM_TAPS, coef, state, BLOCK_SIZE);
}

void fir_run(const q15_t *x, q15_t *y) {
    arm_fir_q15(&S, x, y, BLOCK_SIZE);   /* blockSize samples per call */
}
```

CMSIS-DSP(commit `5a28089`)와 CMSIS_6(commit `69b5aa3`)를 받아 위 코드와 `arm_fir_q15.c`를 M4·M55로 컴파일했습니다. newlib가 없어서 `string.h`·`math.h`는 함수 선언만 담은 shim 디렉터리(`-Ishim`)로 대신했습니다.

```bash
INC="-Ishim -ICMSIS-DSP/Include -ICMSIS-DSP/PrivateInclude -ICMSIS_6/CMSIS/Core/Include"
arm-none-eabi-gcc -ffreestanding -O2 -mthumb -mcpu=cortex-m4  -mfloat-abi=hard $INC \
  -c CMSIS-DSP/Source/FilteringFunctions/arm_fir_q15.c -o fir-m4.o
arm-none-eabi-gcc -ffreestanding -O2 -mthumb -mcpu=cortex-m55 -mfloat-abi=hard $INC \
  -c CMSIS-DSP/Source/FilteringFunctions/arm_fir_q15.c -o fir-m55.o
arm-none-eabi-objdump -d fir-m55.o | awk -F'\t' '{print $3}' | awk 'NF{print $1}' | grep -E '^(sml|vmla)' | sort | uniq -c
```

```text
cortex-m4  (기본)                    2 smlalbb
cortex-m4  (-DARM_MATH_LOOPUNROLL)   2 smlalbb, 6 smlald, 6 smlaldx
cortex-m55                          24 vmlalva.s16
```

같은 소스가 M4에서는 DSP의 dual-MAC `smlald`로, M55에서는 MVE의 `vmlalva.s16`으로 빌드됩니다. 반대로 M55용으로 빌드하면서 `-mfloat-abi=soft`를 쓰면 `__ARM_FEATURE_MVE`가 정의되지 않아 Helium 경로가 통째로 빠집니다.

## 측정 / 비교

성능의 공식 비교값은 1절 표의 CoreMark/MHz(Arm Comparison Table, "See individual Cortex-M product pages")입니다. M0+ 2.46 대비 M4 3.54, M7 5.29, M85 6.28로, 같은 클럭에서 M85가 M0+의 약 2.6배입니다. 이 값은 MHz당 정수 성능이라 DSP·Helium의 이득은 반영하지 않습니다.

실제 칩 없이 코어별 동작을 확인하려면 QEMU의 MPS2/MPS3 FPGA image 모델이 출발점입니다. QEMU 11.1.3의 `qemu-system-arm -M help`에서 Cortex-M 계열만 추리면 다음과 같습니다.

| 코어 | QEMU machine |
| --- | --- |
| M0 | `microbit` (BBC micro:bit) |
| M3 | `mps2-an385`, `lm3s6965evb`, `stm32vldiscovery`, `netduino2` |
| M4 | `mps2-an386`, `netduinoplus2`, `olimex-stm32-h405`, `b-l475e-iot01a` |
| M7 | `mps2-an500` |
| M33 | `mps2-an505`, `mps2-an521`(dual), `mps3-an524`(dual), `musca-a`, `musca-b1` |
| M55 | `mps3-an547` |

QEMU는 cycle-accurate가 아니므로 명령 선택과 기능 확인에만 쓰고, 클럭당 성능은 실제 보드에서 잽니다.

## 자주 보는 함정

> ⚠️ M7 선택 후 cache 설정 누락

Cortex-M7 TRM 4.1.3은 L1 cache가 구현돼 있으면 enable 전에 반드시 invalidate해야 하고, 그러지 않으면 UNPREDICTABLE이라고 적습니다. 5장도 "After reset, you must invalidate each cache before enabling it"이라고 반복합니다. CMSIS의 `SCB_EnableICache()`·`SCB_EnableDCache()`가 invalidate 후 enable 순서를 따릅니다.

> ⚠️ DSP와 FPU 플래그를 혼동

`-mcpu=cortex-m4`만으로 DSP 명령은 나옵니다(3절의 `__ARM_FEATURE_DSP=1`, `smlad` 출력). FPU를 쓰려면 `-mfloat-abi=hard` 또는 `softfp`가 필요하고, `-mfpu`는 생략해도 GCC 16.2.0이 코어에 맞는 FPU를 고릅니다. `-mfloat-abi=hard`로 빌드한 객체를 기본(`soft`) 객체와 섞으면 링크 단계에서 막히므로 라이브러리도 같은 ABI로 맞춥니다.

```text
$ arm-none-eabi-gcc -nostdlib -mthumb -mcpu=cortex-m4 ms.o fh.o -o x.elf
arm-none-eabi-ld: error: fh.o uses VFP register arguments, x.elf does not
arm-none-eabi-ld: failed to merge target specific data of file fh.o
```

> ⚠️ Helium을 지원하지 않는 컴파일러·옵션

GCC 10 release notes는 Armv8.1-M Mainline(`-march=armv8.1-m.main`)과 MVE ACLE intrinsic(`arm_mve.h`, `+mve`/`+mve.fp`) 지원을 처음 추가했고, MVE auto-vectorization은 GCC 11 release notes에 "initial"로 들어갔습니다. 그 이전 GCC는 `-mcpu=cortex-m55`를 모릅니다. 최신 GCC라도 3절처럼 `-mfloat-abi=soft`면 MVE가 꺼집니다.

> ⚠️ TrustZone 코어에서 secure 분할을 미룸

M33/M55에 Security Extension이 구현돼 있으면 reset 직후 Secure state에서 시작합니다(M33 TRM). Non-secure로 넘기는 코드를 쓰지 않으면 애플리케이션 전체가 Secure에서 돌고, 그러면 TrustZone으로 얻으려던 격리가 없습니다.

> ⚠️ MPU region 수를 코어 이름으로 짐작

Comparison Table 기준 MPU 최대 region은 M0·M1이 0, M0+·M3·M4가 8, M23·M33 이후와 M7이 16입니다. M0+도 M3와 같은 최대 8 region을 가질 수 있지만 Cortex-M0+ TRM의 구성 표는 MPU를 "Not present or 8-region"으로 적으므로, 칩의 `MPU_TYPE.DREGION`을 읽어 실제 개수를 확인합니다.

## 정리

- 코어 간 차이는 Arm Comparison Table(102787)에 정리돼 있고, 실제 칩에는 그중 벤더가 고른 옵션만 들어갑니다.
- `-mcpu`만으로 DSP는 켜지지만 FPU와 Helium은 `-mfloat-abi=hard`/`softfp`가 있어야 켜집니다.
- 같은 dot product가 M3 `mla`, M4 `smlabb`, M55(clang) `vmlava.s16`으로 컴파일됩니다. GCC 16.2.0은 이 루프를 MVE로 벡터화하지 않았습니다.
- CMSIS-DSP는 컴파일 시점 매크로로 DSP/Helium 구현을 고르므로 빌드 플래그가 곧 성능입니다.
- M7은 cache를 invalidate 후 enable해야 하고, TrustZone 코어는 Secure state로 시작합니다.

다음 편에서는 **Cortex-A 시리즈 비교**를 다룹니다. 임베디드 Linux용 application 코어입니다.

## 관련 항목

- [1-12: LVDS / 차동 신호 일반](/blog/embedded/modern-recipes/part1-12-lvds-differential)
- [2-02: Cortex-A 시리즈 비교](/blog/embedded/modern-recipes/part2-02-cortex-a-comparison)
- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- 더 깊이 — [Embedded C++ for Real Systems: 코어별 최적화](/blog/embedded/embedded-cpp/00-preface)
