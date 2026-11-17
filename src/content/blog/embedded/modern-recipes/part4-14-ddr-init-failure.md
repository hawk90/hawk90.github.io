---
title: "DDR 초기화 실패 진단 — Timing·Calibration·Walking Bit Test"
slug: "embedded/modern-recipes/part4-14-ddr-init-failure"
date: 2026-04-13T09:48:00
description: "DDR3/4 초기화 sequence. ZQ calibration, write leveling, walking bit test, JESD79 사양."
series: "Modern Embedded Recipes"
seriesOrder: 48
tags: [recipes, ddr, sdram, memory, calibration]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DDR init은 JEDEC 순서와 timing parameter를 맞추고, 그 결과를 메모리 테스트로 확인하는 작업입니다."**

## DDR 종류와 속도

이 글의 DDR3 수치는 모두 JEDEC 표준 JESD79-3F(2012-07) 본문에서 확인했습니다. 다른 세대는 그 세대의 부품 datasheet에 적힌 값입니다.

| 종류 | 출처 | data rate | 전원 |
|---|---|---|---|
| DDR3 | JESD79-3F | DDR3-800 ~ DDR3-2133 speed bin | VDD = VDDQ = 1.5 V ± 0.075 V |
| DDR4 | 8 Gb DDR4 부품 datasheet (D1028AN9CPGXN-U 등) | DDR4-3200 (22-22-22) | "JEDEC standard 1.2V", VDD = 1.2 V ± 0.06 V |
| LPDDR4/4X | Micron 오토모티브 MT53E datasheet | 4266 Mb/s(-046 등급) | VDD1/VDD2/VDDQ = 1.80/1.10/1.10 V, LPDDR4X는 VDDQ 0.60 V |

LPDDR의 LP는 low power를 뜻하고, DDR과는 다른 JEDEC 표준 계열(JESD209)입니다.

## JEDEC Init Sequence (DDR3)

JESD79-3F 3.3.1절 "Power-up Initialization Sequence"를 줄이면 이렇습니다.

1. 전원 인가 — RESET#을 LOW로 둔 채 VDD·VDDQ를 올림
2. 전원이 안정된 뒤 RESET# LOW를 최소 200µs 유지. CKE는 RESET#을 풀기 전에 LOW로 둠
3. RESET# 해제 후 500µs 기다린 다음 CKE = HIGH
4. tXPR 대기
5. MR2 program (CWL 등)
6. MR3 program (MPR)
7. MR1 program (DLL enable, output drive, Rtt_Nom)
8. MR0 program (CL, BL, DLL reset)
9. ZQCL — 초기 calibration
10. tDLLK와 tZQinit가 모두 지날 때까지 대기한 뒤 normal operation

실제로는 SoC의 DDR controller와 PHY가 이 순서를 실행하고, 펌웨어는 그 전에 timing 레지스터를 채웁니다. U-Boot v2024.04의 STM32MP1 driver(`drivers/ram/stm32mp1/stm32mp1_ddr.c`)는 주석으로 "DRAM init is done by PHY"라고 적습니다.

## 핵심 Timing Parameter (DDR3-1600K, 11-11-11)

| 파라미터 | 값 (ns) | 의미 |
|---|---|---|
| tCK | 1.25 | clock cycle |
| tRCD | 13.75 | row → column delay |
| tRP | 13.75 | precharge |
| tRAS | 35 | active → precharge minimum |
| tRC | 48.75 | tRAS + tRP |
| tRFC | 260 | refresh cycle (4Gb. 512Mb 90, 1Gb 110, 2Gb 160, 8Gb 350) |
| tREFI | 7800 | refresh interval (0 °C ≤ TCASE ≤ 85 °C) |
| CL | 11 cycle | CAS latency |

tRCD·tRP·tRC·tRAS는 JESD79-3F의 DDR3-1600K speed bin 표, tRFC·tREFI는 Table 61 "Refresh parameters by device density"의 값입니다. controller 레지스터에는 clock 수로 넣으므로 tCK로 나눠 올림합니다.

```c
ddr->tRCD = ceil(13.75 / 1.25);   // = 11 cycle
ddr->tRP  = ceil(13.75 / 1.25);   // = 11
ddr->tRC  = ceil(48.75 / 1.25);   // = 39
```

## ZQ Calibration

ZQ calibration은 DRAM의 ZQ 핀에 연결된 기준 저항 RZQ로 출력 드라이버와 ODT 임피던스를 맞추는 절차입니다. JESD79-3F의 DC 특성 표는 "RZQ = 240 Ω +/- 1%"를 전제로 하고, ZQCS에 대해서는 "ZQCS command is used to perform periodic calibrations to account for voltage and temperature variations"라고 적습니다.

| 명령 | 시점 |
|------|------|
| `ZQCL` | long calibration (초기화) |
| `ZQCS` | short calibration (운영 중 주기적으로) |

ZQCS 주기는 DDR controller 레지스터로 설정합니다.

## Write Leveling

JESD79-3F는 DDR3 module이 command·address·control·clock에 fly-by topology를 쓰고, 그래서 chip마다 CK와 DQS의 도착 시점이 어긋난다고 설명합니다(4.8절). write leveling은 그 어긋남을 controller가 재는 절차입니다.

1. MR1의 A7을 1로 써서 write leveling mode에 들어감
2. controller가 DQS를 toggle하면 DRAM은 "CK - CK#, sampled with the rising edge of DQS - DQS#"을 DQ로 돌려줌
3. controller는 "repeatedly delays DQS - DQS# until a transition from 0 to 1 is detected"
4. byte lane마다 반복하고, MR1 A7을 0으로 써서 빠져나옴

이 절차는 DDR controller·PHY가 실행하므로, 펌웨어는 결과 상태 bit와 lane별 delay 값을 레지스터에서 읽어 확인합니다.

## DQS Gate Training

STM32MP1의 U-Boot driver는 PHY에 초기화와 "Gate Training Evaluation"을 시킨 뒤 `PGSR`을 polling해, 완료(`IDONE`)나 오류 bit(`DTERR`, `DTIERR` 등) 중 하나가 서기를 기다립니다.

```c
/* U-Boot v2024.04 drivers/ram/stm32mp1/stm32mp1_ddr.c, ddrphy_idone_wait() (발췌) */
ret = readl_poll_timeout(&phy->pgsr, pgsr,
                         pgsr & (DDRPHYC_PGSR_IDONE |
                                 DDRPHYC_PGSR_DTERR |
                                 DDRPHYC_PGSR_DTIERR |
                                 DDRPHYC_PGSR_DFTERR |
                                 DDRPHYC_PGSR_RVERR |
                                 DDRPHYC_PGSR_RVEIRR),
                         1000000);
```

training 결과를 읽고 해석하는 과정은 [Bootloader 26장](/blog/embedded/bootloader/chapter26-ddr-training)이 i.MX8M의 실제 코드로 다룹니다.

## Walking Bit Test — Bring-up 시 첫 검증

data bus의 bit 하나하나가 따로 움직이는지 봅니다. 아래 테스트 함수들은 모두 `volatile` 포인터로 메모리를 다룹니다. 그 이유는 다음 절의 실험에 나옵니다.

```c
void walking_bit_test(volatile uint32_t *base, size_t words) {
    /* 1, 2, 4, 8, ... 한 비트만 켜기 */
    for (int bit = 0; bit < 32; bit++) {
        uint32_t pattern = 1U << bit;
        base[0] = pattern;
        if (base[0] != pattern) {
            printf("Bit %d failed: wrote 0x%x read 0x%x\n",
                   bit, pattern, base[0]);
        }
    }
}
```

`0x55555555`, `0xAAAAAAAA` 같은 교대 패턴도 함께 시험합니다.

## 주소 라인 검증 — Address Bus Test

이 글의 처음 판에는 다음 address test가 있었습니다.

```c
/* Address line short/open 검증 */
void address_test(volatile uint32_t *base, size_t words) {
    for (int i = 0; i < log2(words); i++) {
        uint32_t addr = 1U << i;
        base[addr] = addr;
    }
    /* Read back */
    for (int i = 0; i < log2(words); i++) {
        uint32_t addr = 1U << i;
        if (base[addr] != addr) {
            printf("Address bit %d failure\n", i);
        }
    }
}
```

address line 하나가 0에 붙으면 그 bit만 다른 두 주소가 같은 셀을 가리킵니다. 이를 보드 없이 재현하려고 host(macOS, Apple clang 21)에서 2 MiB 파일 하나를 연속된 두 가상 주소 구간에 `mmap`했습니다. 4 MiB(2^20 word)로 보이는 buffer에서 word index `1 << 19`가 index 0과 같은 셀이 되므로, address bit 19가 고장 난 칩과 같은 상황입니다. 위 함수는 이 고장을 **찾지 못했습니다**. `base[0]`을 쓰지도 읽지도 않기 때문에, 0번 셀과 겹친 `1 << 19`는 자기가 쓴 값을 그대로 읽어 통과합니다.

그래서 0번 셀을 기준값으로 두고, 다른 주소를 쓸 때마다 기준값이 바뀌었는지 보는 판으로 바꿨습니다.

```c
/* Address line short/open: base[0] is the reference cell */
void address_test_fixed(volatile uint32_t *base, size_t words) {
    const uint32_t ref = 0xAAAAAAAAu;
    base[0] = ref;
    for (size_t addr = 1; addr < words; addr <<= 1) {
        base[addr] = (uint32_t)addr;
        if (base[0] != ref) {
            printf("Address bit %u aliases address 0\n", __builtin_ctzl(addr));
            base[0] = ref;
        }
    }
    for (size_t addr = 1; addr < words; addr <<= 1) {
        if (base[addr] != (uint32_t)addr) {
            printf("Address bit %u read back 0x%08x\n", __builtin_ctzl(addr), (unsigned)base[addr]);
        }
    }
}
```

실험 프로그램입니다. `memtest.inc`는 이 절의 세 함수입니다.

```c
/* alias_host.c */
/* Simulate a stuck/shorted address line on the host: map one 2 MiB object twice,
   back to back, so word index (1 << 19) aliases word 0 (address bit 19 "shorted"). */
#include <stdio.h>
#include <stdint.h>
#include <stddef.h>
#include <math.h>
#include <sys/mman.h>
#include <unistd.h>
#include <fcntl.h>
#include "memtest.inc"   /* walking_bit_test(), address_test(), address_test_fixed() from this post */

int main(void) {
    const size_t half = 2u << 20;                       /* 2 MiB = 1 << 19 words */
    int fd = open("alias.bin", O_CREAT | O_RDWR | O_TRUNC, 0600);
    if (fd < 0 || ftruncate(fd, half) != 0) { perror("file"); return 1; }
    uint8_t *p = mmap(NULL, 2 * half, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }
    if (mmap(p + half, half, PROT_READ | PROT_WRITE, MAP_SHARED | MAP_FIXED, fd, 0) == MAP_FAILED) { perror("mmap2"); return 1; }
    volatile uint32_t *base = (volatile uint32_t *)p;
    size_t words = (2 * half) / 4;                      /* 1 << 20 words, looks like 4 MiB */
    printf("alias check: base[0]=1 -> base[1<<19]=%u\n", (base[0] = 1, base[1u << 19]));
    printf("walking_bit_test:\n"); walking_bit_test(base, words);
    printf("address_test (post):\n"); address_test(base, words);
    printf("address_test_fixed:\n"); address_test_fixed(base, words);
    printf("done\n");
    return 0;
}
```

```bash
clang -O2 -Wall -o alias_host alias_host.c -lm && ./alias_host
```

```text
alias check: base[0]=1 -> base[1<<19]=1
walking_bit_test:
address_test (post):
address_test_fixed:
Address bit 19 aliases address 0
Address bit 19 read back 0xaaaaaaaa
done
```

고친 판만 bit 19를 잡았습니다. 하나 더 확인한 것이 있습니다. 같은 함수를 `volatile` 없이(`uint32_t *base`) `-O2`로 빌드하면 고친 판도 아무것도 찾지 못했습니다. compiler는 `base[0]`과 `base[addr]`(addr ≠ 0)이 다른 객체라고 보고 `base[0] != ref` 비교를 상수로 접어 버립니다. `-O0`으로 빌드하면 다시 잡습니다. 메모리 테스트 코드는 대상 메모리를 반드시 `volatile`로 다룹니다. 같은 `volatile` 함수들을 별칭 없는 일반 메모리(`calloc`)에 돌리면 아무것도 출력하지 않았습니다.


## 실측 — 데이터 무결성

```c
/* 두 가지 패턴으로 전 영역 확인 */
void full_dram_test(volatile uint32_t *base, size_t mb, void (*error)(size_t)) {
    size_t words = mb * 1024 * 1024 / 4;
    
    /* Test 1: 0xFF / 0x00 alternating */
    for (size_t i = 0; i < words; i++) base[i] = (i & 1) ? 0xFFFFFFFF : 0;
    for (size_t i = 0; i < words; i++) {
        uint32_t expected = (i & 1) ? 0xFFFFFFFF : 0;
        if (base[i] != expected) error(i);
    }
    
    /* Test 2: address as data */
    for (size_t i = 0; i < words; i++) base[i] = i;
    for (size_t i = 0; i < words; i++) if (base[i] != i) error(i);
}
```

이미 있는 도구로는 Linux 사용자 공간의 memtester, 독립 부팅 이미지인 MemTest86, U-Boot의 `mtest` 명령이 있습니다. QEMU에서 U-Boot `mtest`를 돌린 결과는 [Bootloader 9장](/blog/embedded/bootloader/chapter09-dram-init)에 있습니다.

## 보드 디자인 — Length Matching

JESD79-3F 4.8절이 설명하듯 fly-by topology에서는 chip마다 CK와 DQS의 도착 시점이 다르고, write leveling이 그 차이를 잽니다. 보정할 수 있는 범위를 넘는 skew는 training으로 해결되지 않습니다. 허용 오차는 SoC 벤더의 DDR layout guide에 data rate별로 있으므로 그 문서의 값을 씁니다.

## 종단 — VTT·ODT

DDR3는 DRAM 안에 종단 저항을 두는 ODT(On-Die Termination)를 씁니다. 종단값과 출력 driver 세기는 MR1로 고르고, JESD79-3F MR1 표의 선택지는 RZQ의 분수입니다. RZQ = 240 Ω에서 RTT_Nom RZQ/4는 60 Ω, 출력 driver RZQ/7은 34 Ω입니다.

```c
mr1.ODT = ODT_60_OHM;       // RTT_Nom = RZQ/4 = 60 Ω
mr1.OUTPUT_DRIVE = DRV_34;   // Ron = RZQ/7 = 34 Ω
```

(이 두 줄은 MR1 필드를 이름으로 보인 의사 코드입니다.) 기준 전압은 JESD79-3F 초기화 절의 조건대로 "Vref tracks VDDQ/2"이고, 같은 곳은 전원 투입이 끝난 뒤 VTT를 0.95 V max로 제한합니다.

## DDR PHY와 Controller

| 블록 | 인접 연결 | 담당 기능 |
| --- | --- | --- |
| CPU | ↔ AXI | master 요청 |
| Memory Controller | AXI ↔ PHY | scheduling, refresh, arbiter |
| DDR PHY | controller ↔ DRAM | DLL lock, ZQ calibration, DRAM init, DQS training (STM32MP1 `PIR`의 DLLSRST·DLLLOCK·ZCAL·DRAMINIT·QSTRN bit) |
| DRAM chip | ↔ PHY | 실제 storage |

U-Boot v2024.04에서 i.MX 8M의 DDR 코드(`drivers/ddr/imx/imx8m/ddr_init.c`)는 `ddr_cfg_umctl2()`로 Synopsys uMCTL2 controller register를 쓰고, STM32MP1 driver(`drivers/ram/stm32mp1/stm32mp1_ddr.c`)는 controller와 별도의 PHY(`PIR`, `PGSR` register)를 다룹니다. Linux v6.12의 `drivers/edac/synopsys_edac.c`는 Zynq와 ZynqMP의 DDR controller를 함께 지원합니다. i.MX6의 U-Boot 코드(`arch/arm/mach-imx/mx6/ddr.c`)는 NXP의 MMDC register(`mmdc_p_regs`)를 씁니다.

## Eye Diagram 측정

eye diagram 측정 조건(probe, 장비 대역폭, 판정 기준)은 SoC 벤더의 layout·validation guide를 따릅니다.

## 자주 하는 실수

> ⚠️ Cold boot first read 안 동작

```c
init_ddr();
*((volatile uint32_t*)0x80000000) = 0xDEADBEEF;   // training 완료를 확인하지 않음
```

초기화 함수가 반환됐다고 바로 접근하지 않습니다. controller와 PHY가 초기화·training 완료를 알리는 status bit를 확인한 뒤 첫 접근을 합니다. 위 U-Boot STM32MP1 driver가 `PGSR`의 `IDONE`과 오류 bit를 함께 polling하는 것이 그 예입니다.

> ⚠️ Refresh interval 짧음

```c
tREFI = 1000 ns;   // ← 너무 짧음 → bandwidth 손실
tREFI = 7800 ns;   // ← 표준
```

JESD79-3F Table 61의 값은 "Average periodic refresh interval"이므로, 그보다 짧으면 refresh에 쓰는 시간만 늘고 길면 사양을 벗어납니다.

> ⚠️ Temperature 무시

JESD79-3F Table 61은 tREFI를 0 °C ≤ TCASE ≤ 85 °C에서 7.8 µs, 85 °C < TCASE ≤ 95 °C에서 3.9 µs로 정하고, 85 °C 초과 범위 지원 여부는 주에서 "Users should refer to the DRAM supplier data sheet"라고 넘깁니다. 보드가 85 °C를 넘을 수 있으면 refresh 주기를 절반으로 설정하고, 그 범위를 지원하는 부품인지 datasheet로 확인합니다.

## 정리

- DDR init은 **JEDEC sequence와 timing parameter**를 정확히 맞추는 작업입니다.
- **ZQ calibration, write leveling, DQS gate training**은 controller·PHY가 실행하고, 펌웨어는 완료·오류 bit를 확인합니다.
- **Walking bit(data bus)와 address bus 테스트**로 bring-up을 검증하되, address test는 0번 셀까지 확인하고 대상 메모리는 `volatile`로 다룹니다.
- 보드 length matching은 training이 보정할 수 있는 범위 안에 skew를 두는 일입니다.
- 85 °C를 넘는 환경에서는 refresh 주기를 절반(3.9 µs)으로 줄입니다(JESD79-3F Table 61).

다음 편은 **PWM 출력**입니다.

## 관련 항목

- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
- 더 깊이 — [Bootloader Internals: DDR Controller 프로그래밍과 PHY Training](/blog/embedded/bootloader/chapter09-dram-init)
- 더 깊이 — [Bootloader Internals: DDR training 깊이 — PHY·컨트롤러·보드 파라미터 검증](/blog/embedded/bootloader/chapter26-ddr-training)
- [BSP Development: DDR 매개변수 결정](/blog/embedded/bsp/chapter05-ddr-params)
