---
title: "ARM TrustZone-M 기초 — Secure/Non-Secure·NSC·MPC"
slug: "embedded/modern-recipes/part2-09-trustzone-m"
date: 2026-04-11T09:21:00
description: "Cortex-M33의 Secure/Non-Secure 분리·SAU/IDAU·NSC."
series: "Modern Embedded Recipes"
seriesOrder: 21
tags: [recipes, arm, trustzone]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"TrustZone-M은 하나의 코어에 Secure와 Non-secure 실행 상태를 두고, 주소마다 SAU와 IDAU가 정한 보안 속성으로 경계를 긋습니다."** Non-secure 코드는 NSC 영역의 `SG` 명령으로만 Secure에 들어갈 수 있고, 그 밖의 시도는 SecureFault가 됩니다.

## 어떤 상황에서 쓰나

- 펌웨어 무결성 검증과 secure boot
- 키 저장과 암호 연산 격리
- 보안 인증 칩(예: 결제, 의료) 설계
- IoT 디바이스의 보안 요구 대응

이 글의 규칙은 Armv8-M Architecture Reference Manual(DDI 0553 B.z, 이하 Armv8-M ARM), Cortex-M33 TRM(문서 100230), 그리고 QEMU `mps2-an505` 보드의 원본인 Arm AN505(DAI 0505B)와 SSE-200 TRM(문서 101104)에서 옮겼습니다. 코드는 arm-none-eabi-gcc 16.2.0, GNU ld 2.47, CMSIS 5.9.0 `core_cm33.h`로 빌드해 QEMU 11.1.3 `mps2-an505`(Cortex-M33)에서 실제로 Secure·Non-secure 두 이미지를 돌린 결과입니다.

## 핵심 개념

### 1) Secure / Non-secure 상태

TrustZone-M은 같은 코어가 Secure state와 Non-secure state 중 하나로 실행됩니다. 건물에 비유하면 같은 엘리베이터를 쓰지만, 금고층 버튼은 경비실(SG가 있는 NSC 입구)을 거쳐야만 눌리는 구조입니다. 보통 Secure 쪽에는 secure boot, 키, 암호 연산을 두고 Non-secure 쪽에는 응용 코드를 둡니다.

Security Extension이 있으면 코어는 항상 Secure state로 reset됩니다(Cortex-M33 TRM). 그래서 Non-secure 이미지를 시작시키는 것도 Secure 코드의 일입니다.

### 2) Memory 분류 — Secure / NS / NSC

| 속성 | 의미 |
|------|------|
| S (Secure) | Non-secure 상태에서 접근하면 SecureFault |
| NS (Non-secure) | 양쪽 상태에서 접근 가능 |
| NSC (Non-secure Callable) | Secure 메모리 중 Non-secure가 `SG`로 진입할 수 있는 영역 |

NSC 영역은 Secure 코드가 들어 있는 곳이지만, Non-secure 코드가 그 안의 `SG` 명령으로 분기할 때만 Secure state로 전환됩니다. NSC가 아닌 Secure 주소로 분기하면 Armv8-M ARM의 SFSR.INVEP("Invalid entry point")가 켜집니다. 아래 실행에서 그대로 보입니다.

### 3) SAU / IDAU — 누가 어디를 정하나

- **IDAU (Implementation Defined Attribution Unit)** — 칩이 하드웨어로 정합니다. SSE-200 TRM Table 2-5의 IDAU는 0x0000_0000~0x0FFF_FFFF를 Non-secure, 0x1000_0000~0x1FFF_FFFF를 Secure(NSCCFG[0]이 1이면 NSC 가능)로 정합니다. 즉 같은 SRAM이 Non-secure alias와 Secure alias 두 주소로 보입니다(AN505 Table 3-2).
- **SAU (Security Attribution Unit)** — Secure 소프트웨어가 region을 설정합니다.

둘을 합치는 규칙은 Armv8-M ARM의 RMGXN입니다. "The attribution information from the SAU is used unless the IDAU specifies attributes with a higher security, in which case the IDAU attributes override the SAU attributes." 곧 두 결과 중 더 엄격한 쪽이 이깁니다. SAU를 켜지 않으면(SAU_CTRL.ENABLE = 0, ALLNS = 0) 모든 주소가 Secure입니다.

AN505 같은 SSE-200 계열은 여기에 하나가 더 붙습니다. 메모리 앞에 MPC(Memory Protection Controller)가 있고, SSE-200 TRM의 BLK_LUT 설명대로 블록마다 "0 indicates Secure, 1 indicates Non-secure"를 따로 설정합니다. SAU가 NS라고 해도 MPC 블록이 Secure로 남아 있으면 Non-secure 접근은 막힙니다. 아래 예제를 처음 짤 때 MPC 블록을 NS로 바꾸는 코드가 틀려(아래 BLK_IDX 설명) 블록이 Secure로 남았고, 그 상태에서 Secure 코드가 Non-secure vector table을 읽은 값은 0이었습니다.

### 4) Secure Gateway — NSC

Non-secure 코드가 Secure 함수를 부르려면 NSC 영역의 `SG` 명령을 거쳐야 합니다. GCC에서는 함수에 `cmse_nonsecure_entry`를 달고 `-mcmse`로 컴파일합니다.

```c
static const int secret_key = 7;
/* entry function: the veneer with SG goes to .gnu.sgstubs (NSC) */
__attribute__((cmse_nonsecure_entry))
int secure_compute(int x) {
    return x * 2 + secret_key;
}
```

링크할 때 GNU ld의 `--cmse-implib --out-implib=secure_lib.o`가 SG veneer를 `.gnu.sgstubs` 출력 section에 만들고, Non-secure 쪽이 링크할 import library를 씁니다(ld 매뉴얼 ARM 절). 빌드 결과를 디스어셈블하면 veneer와 본체가 나뉘어 있습니다.

```text
100f0000 <secure_compute>:
100f0000:	e97f e97f 	sg
100f0004:	f710 b8de 	b.w	100001c4 <__acle_se_secure_compute>
100001c4 <__acle_se_secure_compute>:
100001c4:	0040      	lsls	r0, r0, #1
100001c6:	3007      	adds	r0, #7
100001c8:	4671      	mov	r1, lr
100001ca:	4672      	mov	r2, lr
100001cc:	4673      	mov	r3, lr
100001ce:	46f4      	mov	ip, lr
100001d0:	f38e 8c00 	msr	CPSR_fs, lr
100001d4:	4774      	bxns	lr
```

`sg`가 있는 veneer(0x100F0000)만 NSC 영역에 있고, 본체는 일반 Secure 코드 영역에 있습니다. 본체의 끝을 보면 컴파일러가 반환값 `r0`을 뺀 `r1`~`r3`·`ip`를 LR 값으로 덮고 `msr`로 flag를 지운 뒤 `bxns`로 돌아갑니다. Secure 계산의 중간값이 레지스터에 남아 Non-secure로 새지 않게 하는 처리입니다. import library에는 `100f0000 A secure_compute` 하나만 들어 있어, Non-secure 이미지는 이 주소만 압니다.

### 5) Banked register와 IRQ

Armv8-M ARM은 SP를 Secure·Non-secure 두 벌(`MSP_S`/`MSP_NS`, `PSP_S`/`PSP_NS`)로 두고, SCB·SysTick·NVIC·MPU 같은 System Control Space도 Non-secure 사본을 따로 가집니다. CMSIS 5.9.0 `core_cm33.h`는 Secure 코드가 Non-secure 사본에 접근하도록 `SCS_BASE_NS`(0xE002E000) 아래에 `SCB_NS`·`NVIC_NS`·`MPU_NS`를 정의합니다. 아래 예제의 `SCB_NS->VTOR`, `__TZ_set_MSP_NS()`가 그 경로입니다.

우선순위는 AIRCR.PRIS(bit 14)로 조정합니다. Armv8-M ARM의 정의는 0이면 "Priority ranges of Secure and Non-secure exceptions are identical", 1이면 "Non-secure exceptions are de-prioritized"이고, 이 bit는 Non-secure 상태에서 RAZ/WI입니다.

## 코드 / 실제 사용 예

### QEMU `mps2-an505`의 메모리 배치

AN505의 두 SSRAM을 반으로 나눠 Secure와 Non-secure에 줬습니다. 주소는 AN505 Table 3-2·3-4의 alias에서 골랐습니다.

| 용도 | 주소 | SAU | MPC 블록 |
| --- | --- | --- | --- |
| Secure 코드 | 0x10000000~0x100EFFFF (SSRAM1 Secure alias) | 기본(Secure) | Secure |
| NSC veneer | 0x100F0000~0x100FFFFF | region 2, NSC | Secure |
| Secure RAM | 0x38000000~0x380FFFFF (SSRAM2 Secure alias) | 기본(Secure) | Secure |
| Non-secure 코드 | 0x00100000~0x001FFFFF (SSRAM1 NS alias) | region 0, NS | NS |
| Non-secure RAM | 0x28100000~0x281FFFFF (SSRAM2 NS alias) | region 1, NS | NS |

### Secure 쪽: SAU·MPC 설정과 Non-secure 시작

```c
#include <arm_cmse.h>
#include "an505.h"   /* IRQn_Type + __SAUREGION_PRESENT 1 etc., includes core_cm33.h */
#define MPC_SSRAM1 0x58007000UL   /* AN505 3.4.1 */
#define MPC_SSRAM2 0x58008000UL   /* AN505 3.4.2 */
#define NSCCFG     (*(volatile uint32_t *)0x50080014UL)   /* SSE-200 Table 3-35: bit0 CODENSC */
#define REG(b, o)  (*(volatile uint32_t *)((b) + (o)))

/* mark [off, off+len) of an MPC-gated memory Non-secure (LUT bit = 1, SSE-200 TRM).
   off and len must be multiples of 32 blocks. A full-word BLK_LUT access auto-increments BLK_IDX. */
static void mpc_set_ns(uint32_t mpc, uint32_t off, uint32_t len) {
    uint32_t blk = 1u << ((REG(mpc, 0x14) & 0xF) + 5);          /* BLK_CFG */
    REG(mpc, 0x18) = off / blk / 32;                              /* BLK_IDX */
    for (uint32_t w = 0; w < len / blk / 32; w++)
        REG(mpc, 0x1C) = 0xFFFFFFFFu;                             /* BLK_LUT, then IDX++ */
}

static void setup_sau(void) {
    SAU->RNR = 0; SAU->RBAR = 0x00100000; SAU->RLAR = (0x001FFFE0) | SAU_RLAR_ENABLE_Msk;               /* NS code */
    SAU->RNR = 1; SAU->RBAR = 0x28100000; SAU->RLAR = (0x281FFFE0) | SAU_RLAR_ENABLE_Msk;               /* NS RAM  */
    SAU->RNR = 2; SAU->RBAR = 0x100F0000; SAU->RLAR = (0x100FFFE0) | SAU_RLAR_NSC_Msk | SAU_RLAR_ENABLE_Msk; /* NSC */
    SAU->CTRL = SAU_CTRL_ENABLE_Msk;
    __DSB(); __ISB();
}

int main(void) {
    mpc_set_ns(MPC_SSRAM1, 0x00100000, 0x00100000);
    mpc_set_ns(MPC_SSRAM2, 0x00100000, 0x00100000);
    NSCCFG = 1;                                                   /* CODENSC: 0x1000_0000.. may be NSC */
    setup_sau();
    SCB->SHCSR |= SCB_SHCSR_SECUREFAULTENA_Msk;

    const uint32_t *ns_vec = (const uint32_t *)0x00100000;
    SCB_NS->VTOR = 0x00100000;
    __TZ_set_MSP_NS(ns_vec[0]);
    typedef void (*ns_func_t)(void) __attribute__((cmse_nonsecure_call));
    ns_func_t ns_reset = (ns_func_t)cmse_nsfptr_create(ns_vec[1]);
    ns_reset();
    return 1;
}
```

Non-secure reset handler 주소는 vector table의 *두 번째 word에 든 값*(`ns_vec[1]`)입니다. 주소 `0x00100000 + 4`를 그대로 함수 포인터로 쓰면 vector table 데이터를 코드로 실행합니다. 그 전에 `SCB_NS->VTOR`와 `MSP_NS`를 설정하고, `cmse_nsfptr_create()`로 bit 0을 지운 포인터를 `cmse_nonsecure_call`로 부르면 컴파일러가 `BLXNS`로 Non-secure에 들어갑니다. SAU 경계 주소는 32 byte 단위라 RLAR에는 마지막 32 byte 블록의 시작 주소를 씁니다.

`MPC_SSRAM1`의 block 크기는 이 모델에서 1 KB(`BLK_CFG` 읽은 값)였습니다. SSE-200 TRM은 BLK_LUT를 word 단위로 읽거나 쓰면 BLK_IDX가 자동으로 1 증가한다고 적습니다. 처음에는 block마다 LUT를 읽고 bit를 더해 다시 쓰다가, 읽기에서 index가 넘어가 엉뚱한 word에 써서 Non-secure 영역이 열리지 않았습니다. 그 빌드에서는 `NS vec[0]`·`NS vec[1]`이 모두 0으로 읽혔고, 0번지로 점프한 Non-secure 진입이 SFSR 0x49(INVEP·AUVIOL·SFARVALID)로 끝났습니다.

### Non-secure 쪽: Secure 함수 호출

```c
#include <stdint.h>
void puts_(const char *); void puthex(const char *, uint32_t);
extern int secure_compute(int x);     /* from the Secure import library */
int main(void) {
    int result = secure_compute(10);  /* BL to the veneer in NSC, SG switches to Secure */
    puthex("NS: secure_compute(10) = ", (uint32_t)result);
    puts_("NS: reading Secure RAM 0x38000000 ...\n");
    volatile uint32_t v = *(volatile uint32_t *)0x38000000;
    (void)v;
    return 0;
}
```

### 빌드와 실행

`puts_`·`puthex`와 startup·semihosting 하네스는 [2-03](/blog/embedded/modern-recipes/part2-03-arm-registers)의 "QEMU에서 직접 돌려 보기"와 같고, vector table 7번 자리에 `SecureFault_Handler`를 넣었습니다. `.gnu.sgstubs`의 주소는 `--section-start`로 고정했습니다. linker script에서 `> S_NSC`로만 배치했을 때 GNU ld 2.47은 "no address assigned to the veneers output section .gnu.sgstubs"로 링크를 멈췄습니다.

```bash
F="-mcpu=cortex-m33 -mthumb -mfloat-abi=soft -ffreestanding -O1 -g -I. -ICMSIS_5/CMSIS/Core/Include -nostdlib"
# Secure image + import library for the NS side
arm-none-eabi-gcc $F -mcmse -T s.ld \
    -Wl,--cmse-implib,--out-implib=secure_lib.o,--section-start=.gnu.sgstubs=0x100F0000 \
    harness/startup.c harness/semi.c secure.c -lgcc -o secure.elf
# Non-secure image linked against the import library
arm-none-eabi-gcc $F -T ns.ld harness/startup.c harness/semi.c nonsecure.c secure_lib.o -o nonsecure.elf

qemu-system-arm -M mps2-an505 -nographic -monitor none -serial none \
  -semihosting-config enable=on,target=native,userspace=on \
  -kernel secure.elf -device loader,file=nonsecure.elf
```

`cmse_nonsecure_call`은 libgcc의 `__gnu_cmse_nonsecure_call`을 부르므로 `-nostdlib`일 때 `-lgcc`가 필요합니다. 빼면 "undefined reference to `__gnu_cmse_nonsecure_call'"이 납니다.

```text
SAU_TYPE.SREGION = 0x00000008
MPU_TYPE (S).DREGION = 0x00000008
MPU_TYPE (NS).DREGION = 0x00000008
SSRAM1 MPC block size = 0x00000400
cmse_TT(secure_compute).S = 0x00000001
NS vec[0] (MSP_NS) = 0x28200000
NS vec[1] (Reset)  = 0x001000C3
S: jumping to NS reset
NS: secure_compute(10) = 0x0000001B
NS: reading Secure RAM 0x38000000 ...
SecureFault SFSR = 0x00000008
  SFAR = 0x00000000
```

Non-secure 코드가 veneer를 거쳐 `10 * 2 + 7 = 27`(0x1B)을 받았고, Secure RAM을 읽는 순간 SecureFault가 SFSR.AUVIOL(bit 3)로 났습니다. Armv8-M ARM RBFFR은 data access의 SAU/IDAU 위반에서 SFAR를 기록하라고 하지만, 이 QEMU 모델은 SFSR.SFARVALID(bit 6)를 켜지 않았고 SFAR도 0입니다. 실제 칩에서는 SFAR가 0x38000000이어야 하므로, 에뮬레이터 결과로 fault 주소 처리 코드를 검증하지는 않습니다.

## 측정 / 비교

이번 실행에서 확인한 region 수와 Cortex-M33 TRM의 구성 범위입니다.

| 항목 | QEMU `mps2-an505` 읽은 값 | Cortex-M33 TRM 구성 범위 |
| --- | --- | --- |
| SAU region (`SAU_TYPE`) | 8 | 0, 4, 8 |
| Secure MPU region (`MPU_TYPE`) | 8 | 0, 4, 8, 12, 16 |
| Non-secure MPU region (`MPU_NS->TYPE`) | 8 | 0, 4, 8, 12, 16 |

SG 진입·`BXNS` 복귀의 cycle 수는 QEMU로 잴 수 없고, 이번에 연 M33 TRM에서 그 값을 찾지 못해 싣지 않았습니다.

## 자주 보는 함정

> ⚠️ Non-secure에서 Secure 주소 직접 접근

위 실행처럼 SecureFault(SFSR.AUVIOL)가 납니다. BusFault가 아닙니다. `SHCSR.SECUREFAULTENA`를 켜지 않으면 HardFault로 올라가고, vector table의 SecureFault 자리(7번)가 비어 있으면 handler를 찾지 못합니다. 처음 실행에서 하네스의 7번 entry가 0이라 SecureFault 뒤에 INVSTATE UsageFault와 HardFault가 이어졌습니다.

> ⚠️ SAU와 IDAU, 그리고 MPC를 따로 봄

SAU를 NS로 열어도 IDAU가 더 엄격하면 IDAU가 이기고(RMGXN), SSE-200 계열은 MPC 블록까지 NS로 바꿔야 접근이 통과합니다. 세 단계 중 하나만 Secure여도 Non-secure 접근은 막힙니다.

> ⚠️ SG veneer를 우회한 진입

`cmse_nonsecure_entry` 함수의 본체(`__acle_se_secure_compute`, 0x100001C4)를 Non-secure에서 직접 부르게 바꾼 빌드를 돌리면 다음과 같이 됩니다.

```text
NS: calling the Secure body directly, bypassing the SG veneer
SecureFault SFSR = 0x00000001
  SFAR = 0x00000000
```

SFSR.INVEP(bit 0)입니다. Secure 진입점은 NSC 영역의 `SG` 명령뿐입니다. 진입 함수를 `cmse_nonsecure_entry` 없이 만들거나 `-mcmse` 없이 컴파일하면 veneer가 생기지 않아 Non-secure에서 부를 길이 없습니다.

> ⚠️ 반환 레지스터에 Secure 값이 남음

`cmse_nonsecure_entry` 함수는 위 디스어셈블처럼 컴파일러가 반환 전에 레지스터와 flag를 덮어씁니다. 반대로 손으로 쓴 어셈블리 진입점은 이 처리를 직접 해야 합니다.

> ⚠️ AIRCR.PRIS를 확인하지 않음

PRIS = 0이면 Secure와 Non-secure 예외가 같은 우선순위 범위를 씁니다. Non-secure 예외가 Secure 예외를 선점하지 못하게 하려면 PRIS = 1로 Non-secure 예외의 우선순위를 낮춥니다. 이 bit는 Secure 상태에서만 쓸 수 있습니다.

## 정리

- Security Extension이 있는 Cortex-M33은 Secure로 reset되고, Secure 코드가 SAU·(SSE-200이면) MPC·`VTOR_NS`·`MSP_NS`를 설정한 뒤 `BLXNS`로 Non-secure를 시작합니다.
- 주소의 보안 속성은 SAU와 IDAU 중 더 엄격한 쪽이고, AN505에서는 MPC 블록도 맞춰야 합니다.
- Non-secure → Secure 호출은 NSC 영역의 `SG` veneer로만 가능하며, GCC `-mcmse` + `cmse_nonsecure_entry` + ld `--cmse-implib`가 veneer와 import library를 만듭니다.
- Non-secure의 Secure 접근은 SecureFault(AUVIOL), veneer 우회는 SecureFault(INVEP)로 나타납니다.

다음 편에서는 **Memory Barrier 실전**을 다룹니다. DMB, DSB, ISB의 정확한 사용 시점입니다.

## 관련 항목

- [2-03: ARM 레지스터 구조](/blog/embedded/modern-recipes/part2-03-arm-registers)
- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- [2-10: Memory Barrier 실전](/blog/embedded/modern-recipes/part2-10-memory-barrier)
- 더 깊이 — [Practical RTOS Internals: Secure RTOS](/blog/embedded/rtos/practical-internals/00-preface)
