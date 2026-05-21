---
title: "Ch 24: SPL · TPL 깊이 — 최소 단계의 해부"
date: 2026-05-19T24:00:00
description: "SPL과 TPL의 정확한 역할, SRAM 안에 들어가는 코드 구조, DDR이 없는 환경에서 어떻게 동작하는가."
series: "Bootloader Internals"
seriesOrder: 24
tags: [embedded, bootloader, spl, tpl, u-boot]
draft: false
---

## 한 줄 요약

> **"SPL은 *DDR이 없는 세계*에서 *DDR이 있는 세계*로 가는 다리입니다."** — 수십 KB의 SRAM 안에서만 동작하며, 클럭과 DDR을 깨운 뒤 다음 단계를 적재하고 점프합니다. SRAM조차 부족하면 그 앞에 한 단계가 더 붙어 *TPL*이 됩니다.

BootROM은 *우리가 짠 코드가 처음으로 실행되는 지점*까지만 책임집니다. 그 다음 줄부터는 우리의 코드입니다. 그러나 그 지점에서는 *DDR이 아직 동작하지 않고*, *대부분의 페리페럴이 잠들어 있고*, *32~256 KB의 on-chip SRAM*만이 가용 메모리입니다. SPL(Secondary Program Loader)은 이 *바늘구멍 같은 환경*에서 동작하며, U-Boot Proper 또는 BL2를 DDR에 펼쳐 놓고 점프하는 일을 합니다.

## SPL이 풀어야 하는 문제

SPL의 제약을 한 줄로 요약하면 *"DDR 없이, SRAM만으로, 다음 단계를 적재하라"*입니다. 이 한 줄이 세 가지 강한 제약을 만듭니다.

첫째, *코드 크기*가 SRAM에 들어가야 합니다. SoC마다 다르지만 보통 32 KB ~ 256 KB이고, 그 안에 SPL의 `.text` + `.rodata` + `.data` + `.bss` + 스택이 *모두* 들어가야 합니다. 코드를 lean하게 짜는 것이 *선택이 아니라 강제*입니다.

둘째, *동적 메모리 할당이 사실상 불가능*합니다. malloc heap을 둘 자리가 없습니다. SPL은 *고정 크기 스택*과 *정적 변수*만으로 동작합니다. linked list, vector 같은 dynamic data structure는 거의 쓰지 않고, 필요한 경우 *사전에 할당된 static pool*을 활용합니다.

셋째, *재진입·복구가 없습니다*. SPL이 죽으면 *전원을 다시 인가*해야 합니다. exception handler를 통해 reset하는 fallback은 가능하지만, 보통 *조용히 행*이 됩니다. 디버깅은 UART 로그가 유일한 단서입니다.

다음은 대표 SoC들의 SRAM 가용 크기입니다.

| SoC | On-chip SRAM | SPL 최대 크기 | 비고 |
|-----|--------------|---------------|------|
| TI AM335x (BeagleBone) | 128 KB | ~109 KB | stack + heap 제외 |
| NXP i.MX 8M Plus | 256 KB | ~200 KB | TF-A BL2가 SPL 위치 |
| Allwinner H3 | 32 KB | ~28 KB | TPL을 보통 같이 씀 |
| Rockchip RK3399 | 32 KB | ~30 KB | TPL + SPL 분리 강제 |
| Xilinx ZynqMP | 256 KB | ~200 KB | BootROM이 직접 BL2 적재 |

SRAM이 작을수록 SPL을 *얇게* 유지하는 압력이 커지고, 임계점을 넘으면 TPL이 등장합니다.

## SPL의 5가지 역할

SPL이 BootROM에서 점프 받은 후 U-Boot Proper로 넘기기까지 *해야 할 일*은 다섯 가지로 정리됩니다.

**1. 클럭과 PLL 초기화.** BootROM이 켜둔 클럭은 *최소 동작 클럭*입니다. SoC를 정상 속도로 끌어올리려면 PLL을 lock하고 각 페리페럴 클럭 게이트를 열어야 합니다. DDR controller는 *특정 클럭 영역*에서만 동작하므로 *DDR init 직전에* 클럭이 안정화되어 있어야 합니다.

**2. DDR controller 초기화.** SPL의 *가장 큰 단일 작업*입니다. PHY training, ZQ calibration, write/read leveling을 진행하고, refresh interval과 timing parameter를 controller 레지스터에 쓰는 *수십에서 수백 줄*의 코드입니다. vendor가 제공한 training parameter table을 그대로 옮기는 경우가 대부분이지만, 보드 특성에 따라 *부분 재training*이 필요한 경우도 있습니다.

**3. 저수준 페리페럴 초기화.** UART(로그), MMC controller(다음 단계 적재 경로), 그리고 필요하면 watchdog kick. *반드시 필요한 것만*입니다. ethernet·USB는 U-Boot Proper로 넘기는 게 정석입니다.

**4. 다음 단계 적재.** 부트 미디어(MMC, NAND, SPI flash, USB)에서 U-Boot Proper 또는 TF-A BL2 + BL31을 읽어 DDR에 펼칩니다. FIT image를 쓰면 *한 번에 여러 이미지*를 적재할 수 있습니다.

**5. 점프.** DDR에 펼쳐 놓은 다음 단계의 *진입 주소*로 점프합니다. ARMv8 SoC라면 EL3에서 TF-A BL31로, 그 뒤에 EL2의 U-Boot Proper로 chain됩니다.

## TPL — 한 단계 더 작아져야 할 때

SoC의 SRAM이 *너무 작아 SPL이 들어가지 못하는* 경우가 있습니다. Allwinner H3의 32 KB나 Rockchip RK3399의 32 KB가 대표적입니다. SPL 안에 *DDR controller driver* + *MMC driver* + *FIT image parser*까지 들어가면 32 KB로는 불충분합니다.

이때 *부트 단계를 한 번 더 쪼개* TPL(Tertiary Program Loader)을 둡니다. TPL은 *극단적으로 작은 코드*로 동작합니다.

```text
[BootROM]
   │
   ▼ (TPL을 SRAM에 적재)
[TPL — 8 ~ 32 KB]
   - 클럭, PLL 초기화
   - DDR 초기화만 수행
   - SRAM에 적재된 SPL로 점프
   │
   ▼
[SPL — DDR 위에서 동작]
   - 페리페럴 초기화
   - MMC에서 U-Boot Proper 적재
   │
   ▼
[U-Boot Proper]
```

Rockchip RK3399의 부트 흐름이 정확히 이 구조입니다. `idbloader.img` 안에 *TPL*과 *SPL*이 함께 묶여 있고, BootROM이 두 단계를 차례로 적재합니다.

TPL이 *DDR 초기화만* 책임지면 코드가 *수 KB*로 줄어듭니다. SPL은 그 뒤에 *DDR에서 동작*하므로 코드 크기 제약이 사라지고, MMC·FAT·FIT 같은 *큰 driver를 자유롭게* 포함할 수 있습니다.

세 단계의 책임을 한눈에 비교하면 다음과 같습니다.

| 단계 | 동작 위치 | 크기 | 책임 |
|------|-----------|------|------|
| **TPL** | SRAM | 8 ~ 32 KB | 클럭 + DDR init만 |
| **SPL** | SRAM 또는 DDR | 32 ~ 200 KB | 페리페럴 init + next stage load |
| **U-Boot Proper** | DDR | 500 KB ~ 1 MB | 환경 변수, 명령 인터프리터, 커널 적재 |

대부분의 SoC는 *SPL 한 단계로 충분*합니다. TPL이 필요한 경우는 *32 KB 이하의 극소형 SRAM*을 가진 보드에 한정됩니다.

## SPL config 트리

SPL의 코드 크기를 SRAM에 맞추는 일은 *Kconfig 옵션을 끄고 켜는 일*입니다. U-Boot은 SPL용 옵션을 `CONFIG_SPL_*` 접두사로 일관되게 둡니다.

`defconfig` 또는 `make menuconfig`의 SPL 섹션에서 다음과 같은 옵션을 만나게 됩니다.

```text
CONFIG_SPL=y
CONFIG_SPL_FRAMEWORK=y
CONFIG_SPL_LIBCOMMON_SUPPORT=y
CONFIG_SPL_LIBGENERIC_SUPPORT=y
CONFIG_SPL_SERIAL=y
CONFIG_SPL_DM=y
CONFIG_SPL_DM_SEQ_ALIAS=y
CONFIG_SPL_OF_CONTROL=y
CONFIG_SPL_OF_PLATDATA=y
CONFIG_SPL_MMC=y
CONFIG_SPL_FAT_SUPPORT=y
CONFIG_SPL_LOAD_FIT=y
CONFIG_SPL_TEXT_BASE=0x00910000
CONFIG_SPL_MAX_SIZE=0x32000
CONFIG_SPL_STACK=0x00920000
CONFIG_SPL_BSS_START_ADDR=0x00910000
CONFIG_SPL_BSS_MAX_SIZE=0x2000
```

각 옵션의 의미는 다음 표와 같습니다.

| 옵션 | 의미 | 끄면 |
|------|------|------|
| `SPL_FRAMEWORK` | SPL 공통 framework 활성화 | SPL이 동작 안 함 |
| `SPL_LIBCOMMON_SUPPORT` | `printf`, `puts` 등 공통 함수 포함 | UART 로그 불가 |
| `SPL_LIBGENERIC_SUPPORT` | `memcpy`, `strcmp` 등 generic 함수 | 다수 driver가 빌드 실패 |
| `SPL_SERIAL` | UART driver | 로그 출력 불가 |
| `SPL_DM` | Driver Model 활성화 | 모든 driver를 hard-coded init |
| `SPL_OF_CONTROL` | device tree 기반 driver bind | DT 미사용 시 disable |
| `SPL_OF_PLATDATA` | DT를 *C 구조체로 컴파일 타임 변환* | 런타임 DT parser 제거로 크기 절감 |
| `SPL_MMC` | MMC driver | MMC boot 불가 |
| `SPL_FAT_SUPPORT` | FAT 파일 시스템 read | raw MMC offset만 사용 가능 |
| `SPL_LOAD_FIT` | FIT image parser | legacy uImage만 사용 |
| `SPL_TEXT_BASE` | SPL `.text` 시작 주소 (SRAM 안) | 링크 시 오류 |
| `SPL_MAX_SIZE` | SPL binary 최대 허용 크기 | 빌드 시 SRAM overflow 체크 |

`SPL_OF_PLATDATA`는 *크기 절감의 핵심*입니다. 일반 device tree blob과 런타임 parser를 포함하는 대신, `dtoc` 도구가 DT를 *C 구조체*로 변환해 SPL에 컴파일해 넣습니다. parser 코드와 DTB가 빠져 *수 KB ~ 십수 KB*가 줄어듭니다.

## SPL 메모리 layout

SPL이 SRAM에 어떻게 배치되는지는 linker script로 결정됩니다. `arch/arm/cpu/armv8/u-boot-spl.lds`가 기본 골격입니다.

![SPL SRAM Layout — i.MX 8M, 192 KB](/images/blog/bootloader/diagrams/ch24-spl-sram-layout.svg)

linker script 핵심 부분을 발췌하면 다음과 같습니다.

```text
SECTIONS
{
    . = CONFIG_SPL_TEXT_BASE;

    .text : {
        *(.vectors)
        arch/arm/cpu/armv8/start.o (.text*)
        *(.text*)
    }

    .rodata : { *(SORT_BY_ALIGNMENT(SORT_BY_NAME(.rodata*))) }
    .data   : { *(.data*) }

    . = ALIGN(8);
    __image_copy_end = .;

    .bss : {
        . = ALIGN(8);
        __bss_start = .;
        *(.bss*)
        __bss_end = .;
    }

    /DISCARD/ : { *(.dynstr*) *(.dynamic*) *(.plt*) }
}
```

`.text` + `.rodata` + `.data`까지가 *binary로 묶이는 부분*이고, `.bss`는 *런타임에 0으로 채워지는 영역*입니다. SPL binary 파일은 `__image_copy_end`까지만 포함하며, BootROM이 그만큼만 SRAM에 적재합니다. `.bss`는 SPL이 진입 직후 *직접 0으로 채웁니다*.

linker script의 한계는 *모든 섹션이 같은 region에 들어가야 한다*는 것입니다. `.text`를 ROM에, `.data`를 RAM에 두는 식의 분할은 SPL에서는 거의 불가능합니다. BootROM이 *연속된 한 덩어리*만 적재하기 때문입니다.

## next stage 적재 — 4가지 패턴

SPL이 U-Boot Proper(또는 TF-A BL2)를 어떻게 읽어 오는가는 부트 미디어와 이미지 형식의 조합으로 결정됩니다.

**1. Raw MMC offset.** 가장 단순합니다. eMMC 또는 SD의 *고정 sector*에서 *고정 크기*만큼 읽어 *고정 주소*에 펼칩니다.

```c
/* 단순화한 raw MMC load 흐름 */
struct spl_image_info spl_image;

spl_image.entry_point = CONFIG_SYS_TEXT_BASE;       /* 0x40200000 */
spl_image.load_addr   = CONFIG_SYS_TEXT_BASE;
spl_image.size        = 0x100000;                    /* 1 MB */

mmc_read_blocks(mmc,
    (void *)spl_image.load_addr,
    CONFIG_SYS_MMCSD_RAW_MODE_U_BOOT_SECTOR,         /* sector 0x300 */
    spl_image.size / 512);

jump_to_image_no_args(&spl_image);
```

파일 시스템 parser가 필요 없어 *코드가 가장 작습니다*. 단점은 이미지 갱신 시 *sector 위치를 정확히* 맞춰야 한다는 것입니다.

**2. FAT 파일.** SD 카드의 첫 partition에 FAT 파일 시스템을 두고, `u-boot.bin` 같은 파일명으로 적재합니다. 개발 단계에서 *PC에서 파일을 갈아끼우기* 좋습니다.

```c
struct spl_image_info spl_image;

ret = spl_load_image_fat(spl_image, bootdev,
                         CONFIG_SYS_MMCSD_FS_BOOT_PARTITION,
                         CONFIG_SPL_FS_LOAD_PAYLOAD_NAME);   /* "u-boot.bin" */
if (ret) {
    puts("FAT load failed\n");
    hang();
}
```

`SPL_FAT_SUPPORT`가 *수 KB*를 추가하므로 양산 단계에서는 raw offset으로 전환하는 경우가 많습니다.

**3. FIT image (multi-image).** Flattened Image Tree는 *여러 binary*를 하나의 파일에 묶어 *signature와 hash로 검증*할 수 있게 합니다. ARMv8 secure boot 흐름에서 사실상 표준입니다.

```c
struct spl_image_info spl_image = { 0 };

ret = spl_load_simple_fit(&spl_image, &info,
                          fit_offset_in_storage,
                          NULL);
if (ret) {
    printf("FIT parse failed: %d\n", ret);
    hang();
}

/* spl_image.entry_point에 BL31, BL33이 따로 적재됨 */
```

FIT의 이점은 *한 번의 read*로 BL31 + BL33 + DTB + kernel을 모두 가져온다는 것, 그리고 *각 이미지에 hash·signature*를 붙여 검증할 수 있다는 것입니다. 단점은 `SPL_LOAD_FIT` + `SPL_FIT_SIGNATURE`가 *십수 KB*를 추가한다는 점입니다.

**4. eMMC boot partition.** eMMC의 boot1·boot2 hardware partition에 raw로 쓰는 방법. user partition을 *Linux 파일 시스템*으로 깨끗하게 두면서 부트 이미지를 *별도 영역*에 둘 수 있습니다. 양산 보드에서 자주 사용됩니다.

다음은 *적재 후 점프*의 핵심 구조체입니다.

```c
struct spl_image_info {
    const char *name;
    u8          os;             /* IH_OS_U_BOOT / IH_OS_LINUX / IH_OS_ARM_TF */
    uintptr_t   load_addr;      /* 펼쳐 놓을 DDR 주소 */
    uintptr_t   entry_point;    /* 점프 대상 */
    void       *fdt_addr;       /* device tree blob 주소 */
    u32         size;           /* 펼친 후 크기 */
    u32         flags;
    void       *arg;            /* OS 진입 시 인자 (보통 DTB 주소) */
};
```

`os` 필드가 *다음 단계의 종류*를 결정하며, `IH_OS_LINUX`로 설정하면 Falcon mode가 됩니다.

## Falcon mode와의 관계

Falcon mode는 *SPL이 U-Boot Proper를 건너뛰고 Linux kernel을 직접 적재*하는 옵션입니다. 부트 시간이 *수백 ms ~ 1초* 단축됩니다.

```text
일반:    SPL → U-Boot Proper → Linux
Falcon: SPL ──────────────────→ Linux
```

SPL이 *spl_image.os = IH_OS_LINUX*로 채우면 자연스럽게 Linux 진입 ABI에 맞춰 점프합니다. 다만 SPL은 *환경 변수, 명령 인터프리터, console interaction*을 모두 가지지 않으므로, kernel command line과 DTB는 *컴파일 타임 또는 사전 저장된 형태*로 결정됩니다.

Falcon mode가 추가로 요구하는 것은 다음과 같습니다.

- `CONFIG_SPL_OS_BOOT=y` 활성화.
- 별도 storage 영역에 *준비된 args*(DTB + bootargs)를 저장.
- `u-boot.bin`이 fallback 경로로 따로 존재 (Falcon이 실패할 때).
- 양산 검증 — Falcon이 실패하면 *복구 경로*가 동작해야 함.

자세한 흐름은 [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)에서 다룹니다.

## SPL 디버깅

SPL이 동작하기 전에는 *DDR이 없고 console이 없습니다*. 즉 일반적인 `printf` 디버깅이 *불가능한 구간*이 존재합니다. 이 구간을 다루는 방법은 두 가지입니다.

첫째, *UART early init*을 가능한 한 *진입 직후*로 끌어올립니다. UART는 DDR 없이 동작하며 *수십 줄의 코드*로 켤 수 있습니다. SPL의 `board_init_f` 진입 *첫 줄*에서 UART를 켜면 그 뒤로 `printf`가 가능합니다.

```c
/* 단순화한 UART early init — i.MX 계열 */
void board_early_init_f(void)
{
    /* UART clock gate on */
    writel(CCM_CCGR_ON, CCM_BASE + UART_CLK_OFFSET);

    /* Pinmux — UART_TX / UART_RX */
    writel(MUX_MODE_ALT0, IOMUX_BASE + UART_TX_PAD);
    writel(MUX_MODE_ALT0, IOMUX_BASE + UART_RX_PAD);

    /* UART controller — 115200 8N1 */
    writel(UART_CR1_UARTEN, UART_BASE + UART_CR1);
    writel(BAUD_DIV_115200, UART_BASE + UART_FBRD);
    writel(LINE_8N1,       UART_BASE + UART_LCR);

    /* 첫 글자 — sanity check */
    writel('S', UART_BASE + UART_DR);
}
```

이 함수가 *진입 첫 줄*에서 호출되면 *S*가 출력됩니다. 보드에서 *S 한 글자가 나오면 진입까지는 성공*이라는 신호가 됩니다. 그 뒤에 *DDR init 직전·직후*로 다른 글자를 출력하면 어느 단계에서 행이 되는지 *문자 한 글자*로 판별할 수 있습니다.

둘째, *bootstage marker*입니다. U-Boot의 bootstage 모듈은 *각 단계의 timestamp*를 SRAM의 정해진 위치에 기록합니다.

```c
bootstage_mark_name(BOOTSTAGE_ID_START_SPL, "SPL");
clock_init();
bootstage_mark_name(BOOTSTAGE_ID_SPL_CLOCK, "clock");
dram_init();
bootstage_mark_name(BOOTSTAGE_ID_SPL_DRAM, "dram");
preloader_console_init();
bootstage_mark_name(BOOTSTAGE_ID_SPL_CONSOLE, "console");
```

DDR이 동작한 뒤 U-Boot Proper가 *bootstage report*를 출력하면 각 단계에 걸린 시간을 *마이크로초 단위*로 확인할 수 있습니다.

JTAG가 가능한 보드라면 *SPL 진입 시점*에 breakpoint를 걸어 *레지스터·메모리*를 직접 들여다보는 것이 가장 강력합니다. 그러나 양산 보드는 JTAG가 봉인되는 경우가 많아 *UART 한 글자 디버깅*이 현실적입니다.

## 흔한 실수

**1. SPL size overflow.** `CONFIG_SPL_MAX_SIZE`를 넘어가면 빌드 시 *경고*가 나지만, BootROM이 *잘라서* 적재하는 경우가 있습니다. 잘려나간 부분에 `.rodata` string이 있었다면 *행*이 됩니다.

대응: `make spl/u-boot-spl.map`을 열어 큰 함수·큰 string을 찾아 *불필요한 driver를 비활성화*합니다. `SPL_OF_PLATDATA`를 켜면 *DTB parser 십수 KB*가 빠집니다.

**2. DM driver 누락.** Driver Model이 활성화된 SPL에서 *uclass driver*만 켜고 *concrete driver*를 안 켜면 런타임에 `device not found` 행. `CONFIG_SPL_MMC=y`만 켜면 안 되고 `CONFIG_SPL_MMC_SDHCI=y` 같은 *concrete driver*도 함께 켜야 합니다.

**3. 잘못된 device tree blob.** SPL이 `u-boot-spl.dtb`를 적재하는지 *full device tree*를 적재하는지를 혼동하면 빌드는 되지만 SPL이 *자기 DT가 아닌 것*을 parse해 행. `SPL_OF_PLATDATA`를 쓰면 이 함정을 *컴파일 타임에* 피할 수 있습니다.

**4. SPL_TEXT_BASE 정렬.** BootROM이 적재하는 위치와 `SPL_TEXT_BASE`가 *바이트 단위로* 일치해야 합니다. 1 byte라도 어긋나면 첫 instruction이 *잘못된 위치*에서 시작해 *Undefined Instruction* exception이 발생합니다.

**5. BSS 초기화 누락.** linker script에서 `__bss_start`, `__bss_end`를 정의했더라도 *진입 코드가 그 영역을 0으로 채우지 않으면* SRAM의 *난수*가 전역 변수로 보입니다. ARMv8 `start.S`는 BSS clear를 *기본 제공*하지만, 보드 custom init이 더 앞에 끼면 *그 사이의 함수*가 초기화 안 된 전역을 보게 됩니다.

**6. SRAM 끝과 스택 충돌.** SPL stack을 *SRAM의 가장 위*에 두는 관행이 있는데, BSS가 자라면서 *스택 base와 충돌*하는 경우가 있습니다. `SPL_STACK`이 `SPL_BSS_START_ADDR + SPL_BSS_MAX_SIZE` 위에 있어야 합니다. map 파일로 *bss 끝 주소*를 확인하는 게 안전합니다.

## 정리

- SPL은 *DDR 없는 SRAM 환경*에서 동작하며, 클럭·DDR·페리페럴을 초기화하고 다음 단계를 적재해 점프합니다.
- SoC SRAM은 32 KB ~ 256 KB로, 이 안에 `.text` + `.rodata` + `.data` + `.bss` + stack이 *모두* 들어가야 합니다.
- SPL의 5가지 역할은 *클럭/PLL init*, *DDR init*, *저수준 페리페럴 init*, *next stage load*, *점프*입니다.
- SRAM이 너무 작은 SoC(Rockchip RK3399, Allwinner H3 등)는 *TPL → SPL → U-Boot Proper*의 3단계로 분리합니다.
- `CONFIG_SPL_*` 옵션으로 코드 크기를 조절하며, `SPL_OF_PLATDATA`가 *DTB parser*를 빼서 큰 크기 절감을 제공합니다.
- linker script는 `SPL_TEXT_BASE`에서 시작해 `.text` → `.rodata` → `.data` → `.bss` → stack의 연속 layout을 만듭니다.
- next stage 적재는 *raw MMC offset*, *FAT 파일*, *FIT image*, *eMMC boot partition* 4가지 패턴이 표준입니다.
- Falcon mode는 *SPL이 U-Boot Proper를 건너뛰고 Linux를 직접 부트*하는 옵션으로, 양산에서 부트 시간을 1초 이상 줄입니다.
- DDR 없는 구간의 디버깅은 *UART early init + 한 글자 출력*이 가장 현실적입니다. JTAG가 가능하면 breakpoint가 강력합니다.
- 흔한 실수는 *SPL size overflow*, *DM concrete driver 누락*, *잘못된 DTB*, *TEXT_BASE 정렬 오류*, *BSS clear 누락*, *stack-BSS 충돌* 6가지입니다.

## 다음 장 예고

다음 편은 **Ch 25: ARM TF-A 통합**. SPL이 BL2 자리에서 동작하거나, 별도의 TF-A BL2가 SPL과 함께 묶이는 두 가지 패턴과, BL31 secure monitor가 U-Boot Proper(BL33) 앞에서 어떤 자리를 차지하는지 정리합니다.


## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem) — SPL이 BootROM과 U-Boot Proper 사이의 어느 자리에 있는지
- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages) — SPL·BL2·BL31·BL33의 책임 분리
- [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode) — SPL이 Linux를 직접 부트하는 양산 옵션
- [Ch 23: BootROM과 boot mode strap](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — SPL을 SRAM에 적재하는 단계
- [Ch 25: ARM TF-A 통합](/blog/embedded/bootloader/chapter25-tf-a) — SPL과 BL31의 관계
- [Ch 26: DDR training 깊이](/blog/embedded/bootloader/chapter26-ddr-training) — SPL의 가장 큰 단일 작업
- [원문 — U-Boot SPL documentation](https://docs.u-boot.org/en/latest/develop/spl.html)
