---
title: "Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper"
date: 2026-05-09T04:00:00
description: "ARM64와 RISC-V의 다단 부트 — BL1·BL2·BL31·BL33, SPL·TPL·U-Boot Proper의 책임 분할."
series: "Bootloader Internals"
seriesOrder: 4
tags: [embedded, bootloader, u-boot, tf-a, spl]
draft: false
---

## 한 줄 요약

> **"부트는 *작은 단계가 큰 다음 단계를 RAM에 적재*하는 *수직 인계*의 연쇄입니다."** — 각 단계는 *전 단계가 검증한 코드*만 실행하고, *다음 단계에 control을 넘긴 뒤* 사라지거나 메모리에 남습니다.

"부트로더는 단일 binary"라는 인식은 *너무 단순화*된 표현입니다. 요즘 ARMv8-A 보드의 부트 체인은 *5단계가 기본*입니다. BootROM, BL1, BL2(또는 SPL), BL31, BL33(U-Boot Proper). 각 단계가 *왜 따로 있어야* 하는지, *어떤 권한 수준*에서 동작하는지, *메모리는 어디*에서 동작하는지를 정리합니다.

## 왜 한 binary로 못 하나

가장 단순한 질문에서 시작합니다. "BootROM이 *바로 커널을 적재*하면 안 되나?"

세 가지 이유로 못 합니다.

### 1. BootROM은 너무 작다

SoC mask ROM은 *수십 KB*입니다. 그 안에 DDR controller driver, MMC driver, ethernet driver, FIT image parser를 다 못 넣습니다.

### 2. BootROM은 *수정 불가*다

기판 출고 후 *영원히 그대로*입니다. boot 로직이 바뀌면 어떻게 할까요. 그래서 BootROM은 *최소한*만 하고, *수정 가능한 다음 단계*를 적재하는 일에 집중합니다.

### 3. 권한 수준이 다르다

ARMv8-A는 *부트가 진행됨에 따라* EL3 → EL3 → EL3 → (EL2 → EL1)로 *권한 수준이 내려갑니다*. 한 binary로 *모든 권한 수준*을 다루기는 깨끗하지 않습니다.

이 세 가지 때문에 *부트는 다단*입니다.

## ARMv8-A의 다섯 단계

ARM Trusted Firmware의 *공식 단계 이름*은 다음과 같습니다.

![ARMv8-A 부트 단계 — BL1 → BL2 → BL31 → BL33 → Linux와 EL 권한](/images/blog/bootloader/diagrams/chapter04-armv8-boot-stages.svg)

각 BL은 *별도 binary*입니다. *별도 프로젝트*에서 빌드합니다.

| 단계 | 빌드 프로젝트 | 보통의 크기 |
|------|-------------|------------|
| BL1 | TF-A | 수 KB ~ 수십 KB |
| BL2 | TF-A | 수십 KB ~ 백 KB |
| BL31 | TF-A | 약 100 KB |
| BL32 | OP-TEE | 수 MB |
| BL33 | U-Boot | 약 1 MB |

> 더 깊이 — [ARM 아키 관점에서의 같은 주제](/blog/systems/arm/baremetal-boot/chapter05-tfa-4stage)

## U-Boot의 SPL/TPL 모델

U-Boot은 *자체 다단 모델*인 SPL/TPL을 가집니다. TF-A를 안 쓰는 ARMv7-A에서는 *이 모델 단독*으로 동작합니다.

```text
[BootROM]
   │
   ▼
[TPL]   - Tertiary Program Loader (선택)
        - 매우 작은 SRAM(예: 12KB)에서 동작
        - SPL을 적재
   │
   ▼
[SPL]   - Secondary Program Loader
        - DDR이 없는 SRAM에서 동작
        - DDR init, U-Boot Proper 적재
   │
   ▼
[U-Boot Proper]
        - DDR에서 동작
        - 명령 인터프리터
        - 커널 적재
   │
   ▼
[Linux Kernel]
```

TPL이 *왜 필요한가*. 일부 SoC는 *내부 SRAM이 매우 작고*(예: ROC-RK3399 보드의 일부 RK3399 SRAM은 *32KB 이하*), SPL이 거기 안 들어갑니다. *더 작은 TPL*이 *조금 큰 SPL*을 메모리에 풀어 놓고 점프합니다. 마치 SPL이 U-Boot Proper를 풀어 놓는 것과 *같은 구조*입니다.

대부분의 ARMv8-A 보드는 *TPL이 불필요*하고 *SPL → U-Boot Proper*로 충분합니다.

## SPL과 BL2가 한 자리

ARMv8-A 보드에서 *SPL과 BL2 중 하나*가 *DDR initialization 책임*을 집니다. 둘 다 *같은 자리*입니다. 보드마다 둘 중 하나를 선택합니다.

```text
[모델 A — SPL 사용]
BootROM → SPL → BL31 → U-Boot Proper → Linux
         ↑
         DDR init, BL31 적재

[모델 B — BL2 사용]
BootROM → BL1 → BL2 → BL31 → U-Boot Proper → Linux
              ↑
              DDR init, BL31 적재
```

i.MX 8M, Rockchip RK3399는 *모델 A*입니다. 일부 ARM server SKU는 *모델 B*입니다. NXP가 SPL을 선호하는 이유는 *U-Boot의 driver model을 그대로 재사용*할 수 있어서입니다.

## 권한 수준(Exception Level)의 변화

ARMv8-A는 *네 개의 권한 수준*을 가집니다.

```text
EL3 — secure monitor (가장 높음)
EL2 — hypervisor
EL1 — kernel
EL0 — user space (가장 낮음)
```

추가로 *secure / non-secure* 구분이 EL0/EL1/EL2에 *직교*로 존재합니다.

![TrustZone EL3 splits secure and non-secure worlds](/images/blog/bootloader/diagrams/ch04-trustzone-el-split.svg)

부트 진행에 따라 권한 수준이 *내려가는* 흐름입니다.

| 단계 | EL | World |
|------|-----|-------|
| BL1 | EL3 | Secure |
| BL2 | EL3 또는 EL1-S | Secure |
| BL31 | EL3 | Secure (runtime) |
| BL32 (OP-TEE) | EL1-S | Secure |
| BL33 (U-Boot) | EL2 | Non-secure |
| Linux Kernel | EL2 → EL1 | Non-secure |

EL3 → EL2 *권한 강하*는 BL31이 합니다. ERET 명령으로 *target EL과 PC*를 설정한 뒤 점프합니다.

## 각 단계의 메모리 모델

부트 단계별로 *어디서 동작*하고 *어디에 다음 단계를 적재*하는지가 중요합니다.

### BL1

- 실행 위치: secure SRAM 또는 boot ROM 안
- 메모리 모델: MMU off, cache off
- 다음 단계 적재: secure SRAM의 *BL2 영역*

### BL2

- 실행 위치: secure SRAM
- 메모리 모델: MMU on (secure 매핑), cache on (선택)
- DDR initialization 이후: *DDR 사용 가능*
- 다음 단계 적재: BL31 → *secure DDR*, BL32 → *secure DDR*, BL33 → *non-secure DDR*

### SPL (BL2 위치 사용 시)

- 실행 위치: SoC SRAM (예: i.MX 8M Plus는 0x920000)
- 메모리 모델: MMU off, cache off
- DDR initialization 책임
- 다음 단계 적재: BL31 → *secure DDR*, U-Boot Proper → *non-secure DDR*

### BL31

- 실행 위치: secure DDR
- 메모리 모델: MMU on, cache on
- *부팅 후에도 살아있음* (PSCI/SMC 핸들러)
- ERET로 BL33으로 점프

### BL33 (U-Boot Proper)

- 실행 위치: non-secure DDR (예: 0x40200000)
- 메모리 모델: MMU off (cache on), EL2
- driver model 활성화, 모든 driver probe

```text
i.MX 8M Plus의 메모리 맵:
0x00000000 - 0x00100000   boot ROM
0x00910000 - 0x00940000   OCRAM (SPL 적재 위치)
0x40000000 - 0xC0000000   DDR (2GB)
  0x40000000 - 0x40200000  TF-A BL31 (보호 영역)
  0x40200000 - 0x41000000  U-Boot Proper
  0x40480000 -             Linux kernel 적재 위치
  0x43000000 -             DTB 적재 위치
```

## SPL의 핵심 코드 흐름

SPL이 *어떻게 다음 단계를 적재하는지* 봅니다. U-Boot 소스의 `common/spl/spl.c`가 시작점입니다.

```c
/* common/spl/spl.c (간략화) */

void board_init_r(gd_t *dummy1, ulong dummy2)
{
    struct spl_image_info spl_image;
    int ret;

    /* 1. 기본 초기화 */
    spl_set_bd();
    mem_malloc_init(...);

    /* 2. 부트 미디어 결정 */
    boot_device = spl_boot_device();

    /* 3. 부트 미디어별 로더 호출 */
    switch (boot_device) {
    case BOOT_DEVICE_MMC1:
        ret = spl_mmc_load_image(&spl_image, ...);
        break;
    case BOOT_DEVICE_NAND:
        ret = spl_nand_load_image(&spl_image, ...);
        break;
    case BOOT_DEVICE_NOR:
        ret = spl_nor_load_image(&spl_image, ...);
        break;
    /* ... */
    }

    /* 4. 다음 단계로 점프 */
    spl_board_prepare_for_boot();
    jump_to_image(&spl_image);
}
```

`spl_image`는 *적재된 이미지의 정보*입니다.

```c
/* include/spl.h */
struct spl_image_info {
    const char *name;
    u8 os;                    /* IH_OS_U_BOOT, IH_OS_LINUX 등 */
    uintptr_t load_addr;      /* 적재된 주소 */
    uintptr_t entry_point;    /* 점프할 주소 */
    void *fdt_addr;           /* DTB 위치 */
    u32 size;
    u32 flags;
    void *arg;
};
```

ARMv8-A에서는 *BL31에 먼저 점프*하고, BL31이 *다시 BL33으로*점프합니다.

```c
/* arch/arm/lib/spl_atf.c */

void __noreturn spl_invoke_atf(struct spl_image_info *spl_image)
{
    uintptr_t bl33_entry = spl_image->entry_point;
    struct bl_params *bl_params;

    bl_params = bl2_plat_get_bl_image_load_info();

    /* BL31에 BL33 정보 전달 + BL31 진입점 호출 */
    bl31_entry(bl_params->head->image_info,
               bl33_entry, ...);

    /* 도달하지 않음 */
}
```

## FIT image — 한 파일에 모두

SPL이 *BL31 binary, BL33 binary, DTB*를 *각각* 적재할 수도 있고, *FIT image에서 한 번에* 적재할 수도 있습니다. FIT image는 [Ch 15](/blog/embedded/bootloader/chapter15-fit-image)에서 다룹니다.

```text
u-boot.itb (FIT image)
├── images
│   ├── atf-1     ← BL31
│   ├── uboot     ← BL33 (U-Boot Proper)
│   └── fdt-1     ← DTB
└── configurations
    └── conf-1 (default)
        - firmware: atf-1
        - loadables: uboot
        - fdt: fdt-1
```

SPL은 `u-boot.itb` 하나를 부트 미디어에서 읽어, *images 안의 각 binary를 적재 위치로* 풀어 놓습니다.

```text
=> mkimage -f u-boot.its u-boot.itb
=> mkimage -l u-boot.itb
FIT description: Configuration to load ATF + U-Boot
Created:         Mon May 19 09:00:00 2026
 Image 0 (atf-1)
  Description:  ARM Trusted Firmware
  Type:         Firmware
  Load Address: 0x40000000
  Entry Point:  0x40000000
 Image 1 (uboot)
  Description:  U-Boot
  Type:         Standalone Program
  Load Address: 0x40200000
  Entry Point:  0x40200000
 Image 2 (fdt-1)
  Description:  imx8mp-evk
  Type:         Flat Device Tree
```

## RISC-V의 다단 부트

RISC-V는 *OpenSBI*가 ARMv8-A의 TF-A 자리를 차지합니다.

```text
[BootROM]
   │
   ▼
[U-Boot SPL]   - M-mode
               - DDR init, OpenSBI 적재
   │
   ▼
[OpenSBI]      - M-mode firmware
               - SBI 핸들러, MTIME interrupt
               - U-Boot Proper로 점프 (S-mode)
   │
   ▼
[U-Boot Proper] - S-mode
                 - 부트 정책
   │
   ▼
[Linux Kernel]  - S-mode
```

ARMv8-A의 EL이 M-mode/S-mode/U-mode로 *간략화*된 형태입니다. SBI call이 SMC call에 대응됩니다.

## 단계 간 인계 — 어떻게 정보를 넘기나

각 단계 사이에 *주소, DTB, 부트 인자*를 넘겨야 합니다. ARMv8-A 표준은 *x0 ~ x3*에 정보를 넣어 넘깁니다.

```text
SPL → BL31 인계:
x0 = BL31 진입점
x1 = BL32 정보 (선택)
x2 = BL33 진입점
x3 = BL33 DTB 주소

BL31 → BL33 인계:
x0 = DTB physical address
x1 = 0
x2 = 0
x3 = 0
(MMU off, cache off)

BL33 → Linux 인계:
x0 = DTB physical address
x1 = 0
x2 = 0
x3 = 0
(MMU off, D-cache off)
```

x0가 *모든 단계에서 DTB*를 가리킵니다. 이 *일관된 ABI*가 부트 체인을 단순하게 합니다.

## 부트 로그로 보는 단계

i.MX 8M Plus EVK의 부트 로그입니다. 각 줄이 *어느 단계 출력*인지 표시했습니다.

```text
U-Boot SPL 2024.04 (May 19 2026 - 09:00:00 +0000)    ← SPL 시작
SPL: PMIC voltage init done
DDRINFO: start DRAM init                              ← SPL이 DDR init
DDRINFO: DRAM rate 4000MTS
DDRINFO: ddrphy calibration done
DDRINFO: ddrmix config done
Normal Boot
Trying to boot from MMC2                              ← SPL이 FIT image 적재 시도
NOTICE:  BL31: v2.10                                  ← BL31 (TF-A) 시작
NOTICE:  BL31: Built : 09:00:00, May 19 2026


U-Boot 2024.04 (May 19 2026 - 09:00:00 +0000)        ← U-Boot Proper (BL33) 시작

CPU:   Freescale i.MX8MP[8] rev1.1 1600 MHz
CPU:   Industrial temperature grade (-40C to 105C) at 47C
Reset cause: POR
Model: NXP i.MX 8M Plus EVK
DRAM:  2 GiB
Core:  92 devices, 22 uclasses, devicetree: separate
WDT:   Started watchdog@30280000 with servicing every 1000ms (60s timeout)
MMC:   FSL_SDHC: 0, FSL_SDHC: 2
Loading Environment from MMC... OK
In:    serial@30890000
Out:   serial@30890000
Err:   serial@30890000
Net:   eth0: ethernet@30be0000
Hit any key to stop autoboot:  0
=>
```

`U-Boot SPL`은 SPL, `NOTICE: BL31`은 TF-A, `U-Boot 2024.04`(앞에 SPL 없음)은 BL33.

## 자주 하는 실수

### *어느 단계가* 부팅하는지 헷갈림

"U-Boot이 부팅 안 된다"고 할 때 *SPL인지, U-Boot Proper인지, BL31인지* 분리해서 봐야 합니다. 시리얼에 *어디까지 출력*됐는지로 판단합니다.

### BL31 binary가 *제 위치에* 없음

`u-boot.itb`(FIT image)를 만들 때 `its` 파일에 BL31의 *load address*가 잘못 적혔으면 *DDR의 보호 영역 밖*에 적재됩니다. BL31 점프 후 *바로 hang*입니다.

### `CONFIG_SPL_TEXT_BASE`와 *실제 SRAM 주소* 불일치

defconfig의 `CONFIG_SPL_TEXT_BASE`는 *BootROM이 SPL을 적재할 SRAM 주소*입니다. SoC 데이터시트와 다르면 *SPL이 시작도 못 합니다*.

### x0에 DTB *가상 주소*를 넘김

BL33 또는 Linux 진입 시 x0는 *반드시 physical address*입니다. MMU가 off이므로 *가상 주소가 의미 없습니다*. SPL이 booti 직전에 MMU를 *반드시 끄도록* 합니다.

### SPL의 *console init 누락*

SPL이 `preloader_console_init()`을 호출하기 전에 *어딘가에서 hang*하면 *시리얼에 아무것도 안 나옵니다*. 보드 코드 첫 줄에 *DEBUG_UART로 'A'를 강제 송출*해 path를 검증합니다.

## 정리

- 부트는 *작은 단계가 큰 다음 단계를 RAM에 적재*하는 *수직 인계*의 연쇄입니다.
- ARMv8-A의 표준은 *BootROM → BL1 → BL2 → BL31 → BL33*입니다. U-Boot의 SPL/TPL 모델은 *BL2 자리를 SPL*이 대신할 수 있습니다.
- 각 단계는 *별도 binary*이고 *별도 프로젝트*에서 빌드됩니다. TF-A는 BL1·BL2·BL31, U-Boot은 SPL·BL33을 만듭니다.
- 권한 수준은 부트 진행에 따라 *내려갑니다*. BL1~BL31은 *EL3 secure*, BL33은 *EL2 non-secure*, Linux는 *EL2 → EL1*.
- BL31은 *runtime firmware*입니다. 부팅 후에도 *메모리에 살아 있고* PSCI/SMC 호출에 응답합니다.
- 단계 간 인계는 *x0에 DTB physical address*가 일관된 ABI입니다.
- FIT image는 BL31·BL33·DTB를 *한 파일에 묶어* SPL이 한 번에 적재하게 합니다.
- 부트 로그의 *prefix*(`U-Boot SPL`, `NOTICE: BL31`, `U-Boot`)로 *어느 단계가 출력 중*인지 식별합니다.

## 다음 편

[Ch 5: Falcon Mode — SPL이 커널을 직접 부팅](/blog/embedded/bootloader/chapter05-falcon-mode)에서는 *U-Boot Proper를 건너뛰는* 양산 옵션을 다룹니다. sub-second boot이 필요한 시스템에서 *SPL이 직접 커널을 부트*하는 흐름을 봅니다.

## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)
- [Ch 2: U-Boot의 위치](/blog/embedded/bootloader/chapter02-u-boot-position)
- [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)
- [Ch 8: board_init_f vs board_init_r](/blog/embedded/bootloader/chapter08-board-init)
- [Ch 15: FIT Image](/blog/embedded/bootloader/chapter15-fit-image)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [BSP Ch 7: TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — TF-A firmware design](https://trustedfirmware-a.readthedocs.io/en/latest/design/firmware-design.html)
