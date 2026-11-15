---
title: "SPL·TPL 내부 해부 — 가장 작은 부트 단계의 동작 추적"
slug: "embedded/bootloader/chapter24-spl-deep"
date: 2026-05-19T09:24:00
description: "i.MX8M Mini SPL을 U-Boot v2024.04로 직접 빌드해 TCM·OCRAM·DDR 배치, SPL_MAX_SIZE 링커 검사, fdtgrep으로 줄어든 DTB, FIT에서 BL31로 넘어가는 경로를 실측과 소스로 따라갑니다."
series: "Bootloader Internals"
seriesOrder: 24
tags: [embedded, bootloader, spl, tpl, u-boot]
draft: false
topics: ["embedded"]
---

[Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)에서 i.MX8M Mini(이하 i.MX8MM) BootROM은 SD 카드 33 KiB 지점의 IVT를 읽고, entry `0x7E1000`으로 점프했습니다. 그 주소에서 시작하는 프로그램이 **SPL**입니다. SPL은 DDR이 없는 상태에서 칩 안 메모리 몇백 KiB만으로 DDR을 깨우고, 다음 단계 이미지를 읽어 넘겨야 합니다. 그래서 U-Boot 전체에서 공간 제약이 가장 빡빡한 단계입니다.

이 장도 i.MX8MM 하나를 끝까지 따라갑니다. U-Boot v2024.04 `imx8mm_evk_defconfig`를 macOS의 `aarch64-elf-gcc` 16.2.0으로 직접 빌드했고, 크기·주소·노드 수는 모두 그 빌드에서 읽은 값입니다. DDR training 펌웨어와 TF-A `bl31.bin`이 없어서(`BINMAN_ALLOW_MISSING=1`) 실제 보드에서 부팅되는 이미지는 아닙니다. SPL 자체는 그 blob과 무관하게 정상적으로 링크됩니다.

## 한 줄 요약

i.MX8MM SPL은 TCM(`0x7E1000`)에서 실행되고, BSS와 스택은 OCRAM, 큰 malloc은 DDR 초기화 뒤 DDR에 둡니다. 코드가 `CONFIG_SPL_MAX_SIZE`를 넘으면 링커가 빌드를 멈추고, SPL용 DTB는 `bootph-*` 표시가 있는 노드만 남겨 241개에서 42개로 줄어듭니다. 마지막으로 FIT의 loadable인 BL31로 점프합니다.

## xPL 단계 — 어느 보드가 무엇을 쓰나

부트 단계가 여러 개인 이유는 로켓의 다단 분리와 같습니다. 첫 단은 작고 단순해야 발사대(ROM이 허락한 SRAM)에 올라가고, 그다음 단이 더 큰 짐을 나릅니다. U-Boot는 이 단계를 `doc/develop/spl.rst`에서 이렇게 정의합니다.

| 단계 | v2024.04 문서의 정의 |
|------|------------------|
| TPL | "Very early init, as tiny as possible. This loads SPL (or VPL if enabled)." |
| VPL | A/B verified boot일 때 SPL 바이너리를 고르는 단계. "Implementation of the VPL logic is work-in-progress. For now it just boots into SPL." |
| SPL | "Sets up SDRAM and loads U-Boot proper. It may also load other firmware components." |
| U-Boot | 명령줄과 부트 로직을 가진 U-Boot proper |

문서는 "TPL, VPL, SPL are optional"이고 "While many boards use SPL, less use TPL"이라고 적습니다. i.MX8MM EVK 빌드의 `.config`에는 `CONFIG_TPL`과 `CONFIG_VPL`이 없고, `CONFIG_SPL_FRAMEWORK=y`만 있습니다. 즉 이 보드의 체인은 ROM → SPL → TF-A BL31 → U-Boot proper입니다. 같은 문서가 SPL의 다음 단계로 "BL31 of ARM Trusted Firmware which invokes main U-Boot as BL33", EDK II, Linux, RISC-V OpenSBI를 나열하는데, i.MX8MM은 그중 BL31 경로를 씁니다.

![위쪽은 U-Boot boot phase 흐름(Boot ROM, 선택적 TPL·VPL, SPL, SPL이 적재하는 다섯 가지 다음 단계), 아래쪽은 i.MX8MM SPL 빌드에서 측정한 TCM·OCRAM·DDR 메모리 배치](/images/blog/bootloader/diagrams/ch24-spl-sram-layout.svg)

## SPL이 사는 곳 — TCM, OCRAM, DDR

SPL의 메모리 사정은 이사 첫날과 비슷합니다. 큰 집(DDR)은 아직 열쇠가 없어서, 짐은 현관(TCM)에 두고 잠은 작은 방(OCRAM)에서 잡니다. 큰 집 문을 여는 것(DDR training)이 SPL의 첫 번째 큰일입니다.

그림 아래쪽이 빌드에서 읽은 실제 배치입니다. 각 값의 출처를 표로 정리합니다.

| 영역 | 주소 | 크기 | 출처 |
|------|------|------|------|
| SPL 코드·데이터 | `0x7E1000`~`0x804410` | 144,400 B | `CONFIG_SPL_TEXT_BASE`, `nm`의 `_image_binary_end` |
| SPL DTB | `0x804410`~ | 8,199 B | `spl/u-boot-spl.dtb` |
| BSS | `0x910000`~`0x9101C8` | 456 B | `CONFIG_SPL_BSS_START_ADDR`, `__bss_start`/`__bss_end` |
| 초기 스택 꼭대기 | `0x920000` | — | `CONFIG_SPL_STACK`, `_main`의 `ldr x0` 리터럴 |
| early malloc | `0x930000`~ | 64 KiB | `CFG_MALLOC_F_ADDR`(`include/configs/imx8mm_evk.h:27`), `CONFIG_SPL_SYS_MALLOC_F_LEN=0x10000` |
| 전체 malloc | `0x42200000`~ | 512 KiB | `CONFIG_SPL_CUSTOM_SYS_MALLOC_ADDR`, `CONFIG_SPL_SYS_MALLOC_SIZE=0x80000` |

`0x7E1000`은 U-Boot i.MX8M MMU 맵(`arch/arm/mach-imx/imx8m/soc.c:135`)의 `TCM` 영역(0x7C0000부터 0x80000바이트) 안이고, `0x900000`부터는 같은 맵의 `OCRAM`입니다. U-Boot는 OCRAM 앞쪽 64 KiB를 ROM 몫으로 봅니다. `soc.c:1590`의 SError 처리 코드는 스택 포인터가 `0x900000`~`0x910000` 사이면 "stack is still in ROM reserved OCRAM"으로 판단합니다. SPL BSS는 그 바로 뒤인 `0x910000`에서 시작합니다.

초기 스택은 디스어셈블로 확인했습니다. `arch/arm/lib/crt0_64.S`의 `_main`이 첫 명령에서 스택 주소를 리터럴로 읽습니다.

```text
00000000007f8b10 <_main>:
  7f8b10:	58000300 	ldr	x0, 7f8b70 <clear_loop+0x18>
  7f8b14:	927cec1f 	and	sp, x0, #0xfffffffffffffff0
  7f8b18:	910003e0 	mov	x0, sp
  7f8b1c:	97ffa74d 	bl	7e2850 <board_init_f_alloc_reserve>
```

`0x7f8b70`의 8바이트는 `00009200 00000000`, 즉 `0x920000`입니다. 그 아래로 `board_init_f_alloc_reserve()`(`common/init/board_init.c:78`)가 `global_data`(이 빌드에서 `GD_SIZE` 448바이트)를 잡고, 스택은 그 밑으로 자랍니다. 이 함수는 `CFG_MALLOC_F_ADDR`가 정의돼 있으면 early malloc을 스택 쪽에 잡지 않습니다(81행 `#ifndef`). 대신 `spl_common_init()`(`common/spl/spl.c:463`)이 `gd->malloc_base = CFG_MALLOC_F_ADDR`로 `0x930000`을 씁니다.

> ⚠️ 이 숫자를 얻기까지 한 번 틀렸습니다. 처음에 `make imx8mm_evk_defconfig`를 `CROSS_COMPILE` 없이 실행했더니 macOS의 clang 전처리기가 defconfig의 `# CONFIG_SPL_SHARES_INIT_SP_ADDR is not set` 줄 앞에 공백을 넣었습니다. Kconfig는 `unexpected data` 경고만 내고 그 줄을 무시했고, 스택이 DDR 주소인 `0x401FFE50`으로 잡혔습니다. DDR 초기화 전에 쓰는 스택이 DDR에 있으면 부팅이 되지 않습니다. defconfig 단계에서도 `CROSS_COMPILE`을 주고 다시 빌드하자 `CONFIG_SPL_STACK=0x920000`이 살아났습니다. SPL 메모리 배치를 볼 때는 빌드 로그의 Kconfig 경고부터 확인하세요.

## board_init_f — DDR을 깨우는 순서

i.MX8MM EVK의 SPL 진입 함수는 보드 파일에 있습니다. `board/freescale/imx8mm_evk/spl.c:106`의 `board_init_f()`가 하는 일을 순서대로 보면, SPL이 왜 이 순서여야 하는지가 드러납니다.

```c
void board_init_f(ulong dummy)
{
	arch_cpu_init();
	init_uart_clk(1);
	timer_init();
	/* Clear the BSS. */
	memset(__bss_start, 0, __bss_end - __bss_start);
	ret = spl_early_init();
	...
	preloader_console_init();
	enable_tzc380();
	power_init_board();
	/* DDR initialization */
	spl_dram_init();
	board_init_r(NULL, 0);
}
```

BSS를 직접 `memset`으로 지우는 줄이 눈에 띕니다. `crt0_64.S`에도 `board_init_f()`가 돌아온 뒤 BSS를 지우는 `clear_loop`가 있습니다(SPL에서는 143~168행 경로). 그런데 이 보드의 `board_init_f()`는 마지막 줄에서 `board_init_r()`을 직접 부르고 돌아오지 않으므로 그 루프까지 가지 않습니다. 그래서 보드 파일이 C 코드 초반에 BSS를 지웁니다. `spl_early_init()`이 driver model을 띄우고, `preloader_console_init()`이 콘솔을 엽니다. 이 함수(`common/spl/spl.c:836`)가 찍는 첫 줄이 `U-Boot SPL 2024.04 (날짜 - 시각)` 형식의 배너입니다. 그다음 `power_init_board()`가 PMIC(PCA9450)를 I2C로 설정하고, 그 뒤에야 `spl_dram_init()`이 `ddr_init(&dram_timing)`을 부릅니다. DDR에 전원이 들어가야 training을 할 수 있으므로, PMIC가 DDR보다 먼저입니다.

`board_init_r()`로 넘어간 뒤에는 `common/spl/spl.c:685`에서 `mem_malloc_init()`으로 DDR의 `0x42200000`에 전체 malloc을 열고 `GD_FLG_FULL_MALLOC_INIT`을 세웁니다. 그림의 "DDR 초기화 뒤 전환"이 이 지점입니다.

## 크기 제한은 링커가 지킨다

SRAM이 작으니 SPL이 조금만 커져도 넘칩니다. 다행히 넘치면 빌드가 실패합니다. `arch/arm/cpu/armv8/u-boot-spl.lds`는 메모리 영역을 이렇게 선언합니다.

```text
MEMORY { .sram : ORIGIN = IMAGE_TEXT_BASE,
		LENGTH = IMAGE_MAX_SIZE }
MEMORY { .sdram : ORIGIN = CONFIG_SPL_BSS_START_ADDR,
		LENGTH = CONFIG_SPL_BSS_MAX_SIZE }
```

`IMAGE_MAX_SIZE`는 `scripts/Makefile.spl:199`가 `CONFIG_SPL_MAX_SIZE`(이 보드에서 `0x27000`)로 넘깁니다. `.text`부터 `__u_boot_list`까지는 `.sram`에, BSS는 `.sdram`이라는 이름의 영역에 들어갑니다. 이름은 sdram이지만 이 보드에서는 OCRAM `0x910000`입니다.

실제로 넘치면 어떻게 되는지 보려고 `CONFIG_SPL_MAX_SIZE`만 `0x20000`으로 줄여 다시 링크했습니다.

```text
aarch64-elf-ld: u-boot-spl section `.data' will not fit in region `.sram'
aarch64-elf-ld: region `.sram' overflowed by 13328 bytes
collect2: error: ld returned 1 exit status
```

13,328은 SPL 코드·데이터 144,400바이트에서 `0x20000`(131,072)을 뺀 값과 정확히 같습니다. 원래 설정 `0x27000`(159,744)과 비교하면 코드·데이터에 15,344바이트가 남아 있습니다. 다만 이 검사는 링커가 보는 ELF 섹션만 셉니다. 빌드 끝에 붙는 DTB 8,199바이트는 `.sram` 영역 밖이라 이 검사에 들어가지 않고, 최종 바이너리 크기를 보는 `CONFIG_SPL_SIZE_LIMIT`은 이 보드에서 `0x0`(검사 안 함)입니다. 드라이버를 추가해 DTB가 커질 때는 링커가 경고하지 않으므로 `spl/u-boot-spl.bin` 크기를 직접 봐야 합니다.

`nm --size-sort`로 본 큰 덩어리는 USB 쪽입니다. `ehci_hcd`, `usb_uclass`, `g_dnl`, `ehci_mx6`이 각각 10~12 KiB입니다. i.MX8MM SPL은 USB SDP(Serial Download Protocol, `CONFIG_SPL_USB_SDP_SUPPORT=y`)로 PC에서 이미지를 받는 복구 경로를 갖고 있어서 이 코드가 들어갑니다. SPL이 넘칠 때 가장 먼저 검토할 후보가 이런 *부팅 경로 하나를 위한* 기능입니다.

## SPL용 DTB — 241개 노드에서 42개로

SPL에 전체 device tree를 넣으면 크기도 문제지만, driver model이 노드마다 드라이버를 bind하느라 시간과 malloc을 씁니다. 여행 가방을 쌀 때 옷장 전체가 아니라 첫날 입을 옷만 넣는 것처럼, SPL에는 부팅에 필요한 노드만 넣습니다.

`doc/develop/spl.rst`는 빌드 중 fdtgrep이 `spl/u-boot-spl.dtb`를 만들 때 필수 노드(`/aliases`, `/chosen`, `/config`)와 `bootph-all` 또는 `bootph-pre-ram` 속성이 있는 노드만 남긴다고 설명합니다. 그리고 `CONFIG_OF_SPL_REMOVE_PROPS`의 속성(이 빌드에서 `"interrupt-parent interrupts"`)과 `bootph-*` 속성 자체도 지웁니다. 같은 문서는 2023년에 `u-boot,dm-*` 태그가 `bootph-*`로 바뀌었다고 적습니다.

i.MX8MM EVK에서 이 표시는 U-Boot 전용 `.dtsi`에 있습니다. `arch/arm/dts/imx8mm-evk-u-boot.dtsi`의 일부입니다.

```text
&aips4 {
	bootph-pre-ram;
};

&pinctrl_uart2 {
	bootph-pre-ram;
};

&pinctrl_usdhc2 {
	bootph-pre-ram;
};
```

빌드 결과를 in-tree `dtc`로 디컴파일해 `{`로 끝나는 줄(노드 수)을 세면 다음과 같습니다.

| 파일 | 크기 | 노드 수 |
|------|------|--------|
| `arch/arm/dts/imx8mm-evk.dtb` (U-Boot proper용) | 41,168 B | 241 |
| `spl/u-boot-spl.dtb` | 8,199 B | 42 |

남은 42개 노드는 SPL이 하는 일과 정확히 겹칩니다. GPIO 컨트롤러 5개, watchdog, pinctrl과 그룹(`uart2grp`, `usdhc2grp`, `i2c1grp`, ...), 클록 컨트롤러, `serial@30890000`(UART2 콘솔), CAAM(`crypto@30900000`과 job ring 3개), `i2c@30a20000` 아래의 `pmic@4b`, `mmc@30b40000`~`mmc@30b60000`, USB입니다. 디스플레이, 오디오, PCIe 노드는 없습니다. 실제로 링크된 드라이버도 40개(`_u_boot_list_2_driver_2_*` 심볼 수)로, `fsl_esdhc`, `i2c_mxc`, `pmic_pca9450`, `serial_mxc`, `imx8mm_clk`, `caam_jr` 같은 이름이 DTB 노드와 짝을 이룹니다.

새 장치를 SPL에서 써야 하는데 `uclass_get_device`가 `-ENODEV`를 돌려준다면, 먼저 `spl/u-boot-spl.dtb`에 그 노드가 있는지 확인합니다. 노드가 없으면 `-u-boot.dtsi`에 `bootph-pre-ram`을 붙일 차례이고, 노드는 있는데 드라이버가 없으면 `CONFIG_SPL_*` 옵션 쪽 문제입니다. 위 `board_init_f()`가 `clock-controller@30380000`을 이름으로 찾다가 실패하면 "Failed to find clock node. Check device tree"를 찍고 멈추는 것도 같은 맥락입니다.

## 다음 단계 적재 — FIT에서 BL31로

DDR이 살아나면 SPL은 다음 이미지를 찾습니다. 보드의 `spl_board_boot_device()`(`board/freescale/imx8mm_evk/spl.c:34`)가 ROM이 알려 준 부팅 장치를 SPL 장치 번호로 바꿉니다. `SD2_BOOT`/`MMC2_BOOT`는 `BOOT_DEVICE_MMC1`, `SD3_BOOT`/`MMC3_BOOT`는 `BOOT_DEVICE_MMC2`, `USB_BOOT`는 `BOOT_DEVICE_BOARD`가 됩니다. `boot_from_devices()`는 장치마다 `Trying to boot from %s`를 찍고(`common/spl/spl.c:627`), MMC raw 모드에서 섹터 `0x300`(`CONFIG_SYS_MMCSD_RAW_MODE_U_BOOT_SECTOR`)을 읽습니다.

거기 있는 `u-boot.itb`를 빌드 디렉터리의 `mkimage -l`로 열면 FIT 구조가 보입니다.

```text
FIT description: Configuration to load ATF before U-Boot
 Image 0 (uboot)
  Description:  U-Boot (64-bit)
  Type:         Standalone Program
  Data Size:    672720 Bytes = 656.95 KiB = 0.64 MiB
  Architecture: AArch64
  Load Address: 0x40200000
  Entry Point:  unavailable
 Image 1 (atf)
  Description:  ARM Trusted Firmware
  Type:         Firmware
  Data Size:    0 Bytes = 0.00 KiB = 0.00 MiB
  Load Address: 0x00920000
```

`atf`의 `Data Size`가 0인 것은 `bl31.bin` 없이 빌드했기 때문입니다. 여기서 볼 것은 `uboot` 이미지의 `Entry Point: unavailable`입니다. `arch/arm/dts/imx8mm-u-boot.dtsi`는 configuration을 `firmware = "uboot"`, `loadables = "atf"`로 정하고, `uboot` 노드에는 `load`만 주고 `entry`는 주지 않습니다. `atf` 노드에는 `entry = <0x920000>`이 있습니다.

그러면 SPL은 어디로 점프할까요? `common/spl/spl_fit.c:823-828`이 답입니다.

```c
		/*
		 * If the "firmware" image did not provide an entry point,
		 * use the first valid entry point from the loadables.
		 */
		if (spl_image->entry_point == FDT_ERROR &&
		    image_info.entry_point != FDT_ERROR)
			spl_image->entry_point = image_info.entry_point;
```

firmware인 U-Boot에 entry가 없으니 첫 loadable인 BL31의 `0x920000`이 점프 주소가 됩니다. i.MX의 `jump_to_image_no_args()`(`arch/arm/mach-imx/spl.c:279`)는 `SPL_FIT_FOUND` 플래그가 있으면 그 주소를 그대로 호출합니다. TF-A 쪽도 같은 주소를 씁니다. upstream TF-A v2.15의 `plat/imx/imx8m/imx8mm/include/platform_def.h`는 BL2를 쓰지 않는 구성에서 `BL31_BASE`를 `0x920000`, 비보안 U-Boot 주소 `PLAT_NS_IMAGE_OFFSET`을 `0x40200000`으로 정합니다. 그래서 BL31은 OCRAM `0x920000`에서 시작하고, 일을 마치면 BL33인 U-Boot proper(`0x40200000`)로 넘어갑니다. U-Boot 보드 문서가 안내하는 것은 NXP의 `imx-atf` 브랜치이므로, 실제 제품에서는 그 트리의 값을 확인합니다. 앞의 메모리 표에서 BL31 적재 주소가 SPL 초기 스택 꼭대기와 같은 `0x920000`인 것도 이 흐름 때문에 가능합니다. 스택은 `0x920000` 아래로 자라고, BL31은 위로 놓이며, SPL이 BL31로 점프하는 순간 SPL 스택은 더 필요 없습니다.

`CONFIG_SPL_ATF`가 꺼져 있는데도 BL31로 가는 점이 흥미롭습니다. 범용 경로(`spl.c:763`)는 이미지 `os`가 `IH_OS_ARM_TRUSTED_FIRMWARE`일 때 `spl_invoke_atf()`로 BL31에 인자를 넘기지만, 이 보드의 FIT는 `atf`에 `os`를 주지 않아서(`OS: Unknown OS`) 그 경로를 타지 않습니다. 대신 entry 주소 규칙만으로 BL31에 도착합니다. 같은 "SPL → BL31" 그림이라도 실제 코드 경로는 FIT 내용에 따라 갈리므로, `mkimage -l`과 `spl_fit.c`를 함께 봅니다.

## 실기 없이 확인한 것과 못 한 것

이 장의 숫자는 빌드 산출물(`.config`, ELF, `nm`, `objdump`, `mkimage -l`, binman map, 디컴파일한 DTB)과 링커 실패 재현에서 나왔습니다. 실제 i.MX8MM 보드에서 SPL을 실행하지 않았으므로 콘솔 출력은 소스의 문자열 형식으로만 인용했고, DDR training 결과나 부팅 시간은 다루지 않았습니다. QEMU에는 i.MX8MM 머신이 없어서 이전 장처럼 에뮬레이터로 대신 돌릴 수도 없습니다.

## 정리

- v2024.04 문서에서 TPL·VPL·SPL은 모두 선택이고, i.MX8MM EVK는 SPL만 쓰며 ROM → SPL → BL31 → U-Boot proper로 이어집니다.
- SPL 코드는 TCM `0x7E1000`, BSS(456 B)는 OCRAM `0x910000`, 초기 스택은 `0x920000`, early malloc은 `0x930000`, 전체 malloc은 DDR `0x42200000`에 있습니다.
- `CONFIG_SPL_MAX_SIZE`는 링커 `MEMORY` 영역으로 강제되어, `0x20000`으로 줄이면 "overflowed by 13328 bytes"로 실패합니다. 뒤에 붙는 DTB는 이 검사에 들어가지 않습니다.
- fdtgrep은 `bootph-pre-ram`/`bootph-all` 노드만 남겨 DTB를 241개 노드·41,168 B에서 42개 노드·8,199 B로 줄입니다.
- `board_init_f()`는 BSS 클리어 → driver model → 콘솔 → PMIC → DDR 순서로 진행합니다.
- FIT의 U-Boot 이미지에 entry가 없으면 첫 loadable(BL31)의 entry가 점프 주소가 됩니다(`spl_fit.c:826`).
- defconfig를 cross 전처리기 없이 처리하면 `# ... is not set` 줄이 무시될 수 있으니 Kconfig 경고를 확인합니다.

## 다음 장 예고

다음 편은 **Ch 25: ARM TF-A 통합**입니다. 이 장의 끝에서 SPL이 점프한 `0x920000`의 BL31이 무엇을 하고, 어떻게 U-Boot proper를 BL33으로 불러내는지 TF-A 소스로 이어서 봅니다.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages) — 단계 분리의 전체 그림
- [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode) — SPL이 U-Boot proper를 건너뛰고 커널로 가는 경로
- [Ch 23: BootROM·eFuse·OTP](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — SPL을 올려 주는 ROM 단계와 IVT
- [Ch 25: ARM TF-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee) — SPL 다음의 BL31
- [U-Boot v2024.04 — doc/develop/spl.rst](https://github.com/u-boot/u-boot/blob/v2024.04/doc/develop/spl.rst) — xPL 단계와 fdtgrep 설명 원문
