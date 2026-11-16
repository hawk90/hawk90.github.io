---
title: "U-Boot Falcon Mode — SPL이 U-Boot Proper 없이 커널 직접 부팅"
slug: "embedded/bootloader/chapter05-falcon-mode"
date: 2026-05-09T09:05:00
description: "U-Boot Falcon Mode의 SPL 기반 직접 부팅, 보드별 설정, 사전 생성 인자, 설정과 보드별 저장 방식을 설명합니다."
series: "Bootloader Internals"
seriesOrder: 5
tags: [embedded, bootloader, u-boot, falcon, boot-time]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

Falcon Mode는 SPL이 U-Boot Proper를 건너뛰고 커널을 직접 시작하는 U-Boot 기능입니다. 켜는 것은 `CONFIG_SPL_OS_BOOT` 한 줄이지만, 그것만으로는 아무 일도 일어나지 않습니다. i.MX 8M Mini에 켜 보면 SPL이 4,368바이트 커지고 "Please implement spl_start_uboot() for your board"라는 문자열이 들어갈 뿐, 매번 U-Boot로 갑니다. 실제로 커널로 가려면 보드의 분기 함수, 매체별 적재 설정, 그리고 U-Boot Proper가 미리 만들어 둔 "인자 DTB"가 필요합니다. 이 장은 그 세 가지를 v2024.04 소스와 빌드, 그리고 QEMU에서 bootm 하위 명령으로 재현한 인자 DTB로 확인합니다.

## 흐름

```text
일반:   BootROM → SPL → (BL31) → U-Boot Proper → bootm/booti → Linux
Falcon: BootROM → SPL → (BL31) → Linux
```

U-Boot Proper가 하던 일 중 커널에 꼭 필요한 것은 DTB를 고치는 일입니다. `/chosen/bootargs`를 넣고, 메모리 노드를 맞추고, 시드 값을 채웁니다. Falcon은 이 결과를 부팅할 때마다 만들지 않습니다. 한 번 U-Boot Proper에서 만들어 매체에 저장해 두고, SPL은 그것을 읽기만 합니다.

## 설정 — Kconfig에 적힌 것

v2024.04 `common/spl/Kconfig`의 정의입니다.

| 설정 | 정의 | 뜻 |
| --- | --- | --- |
| `SPL_OS_BOOT` | `bool "Activate Falcon Mode"`, `depends on !TI_SECURE_DEVICE` | SPL이 U-Boot 이외의 이미지로 갈 수 있게 함 |
| `SPL_PAYLOAD_ARGS_ADDR` | `depends on SPL_OS_BOOT \|\| SPL_LOAD_FIT_OPENSBI_OS_BOOT`, OMAP만 기본값 0x88000000 | 인자 이미지를 올릴 RAM 주소 |
| `SPL_FALCON_BOOT_MMCSD` | `depends on SPL_OS_BOOT && SPL_MMC`, `select SPL_LOAD_BLOCK`, `select SPL_SYS_MMCSD_RAW_MODE` | MMC/SD에서 커널을 raw로 읽음 |
| `SYS_MMCSD_RAW_MODE_KERNEL_SECTOR` | `depends on SPL_FALCON_BOOT_MMCSD` | 커널 이미지 시작 섹터 |
| `SYS_MMCSD_RAW_MODE_ARGS_SECTOR` / `_SECTORS` | 같음. `_SECTORS`는 `&& SYS_MMCSD_RAW_MODE_ARGS_SECTOR != 0x0`도 요구 | 인자 이미지 위치와 길이(섹터) |
| `CMD_SPL` | `depends on SPL` | U-Boot Proper의 `spl export` 명령 |

v2024.04에서 `CONFIG_SPL_OS_BOOT=y`인 defconfig는 38개입니다. TI AM335x·AM43xx·AM57xx·OMAP 계열과 i.MX6·i.MX28 보드가 대부분이고, 업스트림 `imx8mm_evk`와 QEMU 구성은 여기에 없습니다.

## 분기는 보드가 정한다 — spl_start_uboot()

U-Boot v2024.04 `doc/develop/falcon.rst`는 보드가 `spl_start_uboot()`를 구현하도록 요구하고, 이 함수가 "returns "0" if SPL should start the kernel, "1" if U-Boot"라고 정합니다. 보드가 구현하지 않으면 `common/spl/spl.c`의 weak 기본 구현이 불립니다.

```c
#if CONFIG_IS_ENABLED(OS_BOOT)
__weak int spl_start_uboot(void)
{
	puts(SPL_TPL_PROMPT
	     "Please implement spl_start_uboot() for your board\n");
	puts(SPL_TPL_PROMPT "Direct Linux boot not active!\n");
	return 1;
}
```

보드 코드는 보통 GPIO 스위치, 시리얼 입력, 환경 변수 같은 조건으로 0과 1을 고릅니다. 1을 돌려줄 수 있는 길이 곧 복구 경로입니다. Falcon 이미지가 망가졌을 때 U-Boot 셸로 돌아올 방법을 이 함수가 결정합니다.

## i.MX 8M Mini에 켜 보기

업스트림 `imx8mm_evk`는 Falcon을 지원하지 않습니다. 빌드에 무엇이 붙는지 보려고 기존 빌드의 `.config`에 옵션을 더해 두 번 빌드했습니다(DDR 펌웨어·BL31 없이 `BINMAN_ALLOW_MISSING=1`, 부팅 불가 이미지).

| 빌드 | 추가 설정 | `spl/u-boot-spl.bin` | text | 한계 0x27000까지 |
| --- | --- | ---: | ---: | ---: |
| 기준 | — | 152,599 | 115,537 | 7,145 |
| A | `SPL_OS_BOOT=y`, `SPL_PAYLOAD_ARGS_ADDR=0x43000000` | 156,967 | 119,919 | 2,777 |
| B | A + `SPL_FALCON_BOOT_MMCSD=y`, 커널 섹터 0x1000, 인자 섹터 0x800, 0x80개 | 157,127 | 120,079 | 2,617 |

(크기 단위 바이트. 섹터 값과 0x43000000은 빌드를 위해 정한 예시 값)

두 빌드 모두 링크는 됐습니다. SPL 여유가 7 KiB에서 2.6 KiB로 줄었으니, 이 보드에서 Falcon에 서명 검증까지 더하면 한계를 넘을 수 있습니다. 이 빌드는 LTO(`CONFIG_LTO=y`)라서 오브젝트별 크기는 비교할 수 없었습니다. 대신 빌드 A의 SPL 바이너리에 들어간 문자열이 동작을 그대로 보여 줍니다.

```text
$ strings b-falcon/spl/u-boot-spl.bin | grep -E "implement spl_start_uboot|Direct Linux boot"
SPL: Please implement spl_start_uboot() for your board
SPL: Direct Linux boot not active!
```

`board/freescale/imx8mm_evk/`와 `arch/arm/mach-imx/`에 `spl_start_uboot()`가 없어서 weak 구현이 링크됐습니다. 이 SPL은 부팅할 때마다 이 두 줄을 찍고 U-Boot로 갑니다. 옵션을 켰다고 Falcon이 되는 것이 아닙니다.

## MMC에서 SPL이 실제로 읽는 것

빌드 B에서 쓰이는 `common/spl/spl_mmc.c`의 raw 경로입니다.

```c
	case MMCSD_MODE_RAW:
		debug("spl: mmc boot mode: raw\n");

		if (!spl_start_uboot()) {
			err = mmc_load_image_raw_os(spl_image, bootdev, mmc);
			if (!err)
				return err;
		}
```

`spl_start_uboot()`가 0일 때만 `mmc_load_image_raw_os()`로 갑니다. 그 함수는 두 번 읽습니다.

```c
	count = blk_dread(mmc_get_blk_desc(mmc),
		CONFIG_SYS_MMCSD_RAW_MODE_ARGS_SECTOR,
		CONFIG_SYS_MMCSD_RAW_MODE_ARGS_SECTORS,
		(void *)CONFIG_SPL_PAYLOAD_ARGS_ADDR);
	...
	ret = mmc_load_image_raw_sector(spl_image, bootdev, mmc,
		CONFIG_SYS_MMCSD_RAW_MODE_KERNEL_SECTOR);
	if (ret)
		return ret;

	if (spl_image->os != IH_OS_LINUX && spl_image->os != IH_OS_TEE) {
		puts("Expected image is not found. Trying to start U-Boot\n");
		return -ENOENT;
	}
```

(오류 처리 일부 생략)

인자 이미지를 고정 섹터에서 고정 길이만큼 RAM으로 복사하고, 커널 섹터의 이미지 헤더를 읽어 OS가 Linux(또는 TEE)인지 봅니다. 아니면 U-Boot로 돌아갑니다. 이것이 매체 쪽 fallback입니다. `SPL_FALCON_BOOT_MMCSD`가 꺼져 있으면 같은 함수가 `-ENOSYS`만 돌려주므로, 빌드 A는 분기 함수를 구현했더라도 MMC에서는 커널을 읽지 못합니다.

## 인자 DTB를 만드는 법 — spl export fdt

인자 이미지는 U-Boot Proper의 `spl export fdt`로 만듭니다. v2024.04 `cmd/spl.c`를 보면 이 명령은 새 기능이 아니라 bootm 하위 명령을 차례로 부르는 래퍼입니다.

```c
	[SPL_EXPORT_FDT] = (const char * []) {
#ifdef CONFIG_OF_LIBFDT
		"start",
		"loados",
	#ifdef CONFIG_SYS_BOOT_RAMDISK_HIGH
		"ramdisk",
	#endif
		"fdt",
		"cmdline",
		"bdt",
		"prep",
#endif
		NULL,
	},
```

`go`가 없습니다. 커널로 점프하기 직전까지 bootm을 진행한 뒤, 고쳐진 DTB의 주소와 크기를 `fdtargsaddr`·`fdtargslen` 환경 변수에 남기고 멈춥니다. `CMD_SPL`은 `depends on SPL`이라 SPL이 없는 `qemu_arm64`에서는 켤 수 없습니다. 그래서 같은 하위 명령을 QEMU U-Boot에서 직접 실행했습니다. 이 빌드는 `CONFIG_SYS_BOOT_RAMDISK_HIGH=y`라 `spl export fdt`라면 `ramdisk`도 부르지만, initrd가 없으므로 그 단계는 뺐습니다. 커널은 Debian 6.12 arm64 `Image`이고, QEMU `virt`의 DTB(`dumpdtb`로 받아 `dtc`로 7,785바이트로 정리)와 함께 `mkimage -f auto`로 FIT를 만들어 0x44000000에 올렸습니다.

```text
=> setenv bootargs console=ttyAMA0 root=/dev/mmcblk0p2 falcon=yes
=> bootm start 0x44000000
## Loading kernel from FIT Image at 44000000 ...
   Using 'conf-1' configuration
...
   Booting using the fdt blob at 0x463ea990
=> bootm loados
   Loading Kernel Image to 40400000
=> bootm fdt
   Loading Device Tree to 000000007d58d000, end 000000007d591e68 ... OK
Working FDT set to 7d58d000
=> bootm cmdline
subcommand failed (err=-1)
=> bootm bdt
subcommand failed (err=-1)
=> bootm prep
   Loading Device Tree to 000000007d585000, end 000000007d58ce68 ... OK
Working FDT set to 7d585000
=> fdt print /chosen
chosen {
	u-boot,bootconf = "conf-1";
	u-boot,version = "2024.04";
	bootargs = "console=ttyAMA0 root=/dev/mmcblk0p2 falcon=yes";
	stdout-path = "/pl011@9000000";
	rng-seed = <0xe1b7cb3c 0x6e895de5 0xc46432e4 0x359aff6c 0x842f3edd 0x1d12d431 0xc2b5aa44 0x2b2cc7e8>;
	kaslr-seed = <0x12f5e98c 0x077b7936>;
};
```

(`bootm start`의 FIT 상세 출력 생략)

`prep`까지 끝난 DTB의 `/chosen`에 `bootargs`가 들어갔습니다. 이 DTB가 Falcon의 인자 이미지가 됩니다. 볼 것이 세 가지 있습니다.

- **`cmdline`·`bdt`는 ARM에서 실패한다.** `arch/arm/lib/bootm.c`의 `do_bootm_linux()`는 `/* No need for those on ARM */` 주석과 함께 두 상태에 -1을 돌려줍니다. `cmd/spl.c`의 `call_bootm()`은 하위 명령을 모두 실행한 뒤 마지막(`prep`)의 반환값만 검사하므로, ARM에서 `spl export fdt`는 중간 실패와 상관없이 성공합니다.
- **`rng-seed`·`kaslr-seed`가 고정된다.** 이 두 속성은 U-Boot가 넣은 것이 아니라, QEMU가 생성해 `dumpdtb`로 받은 원본 DTB에 이미 있던 값입니다(`dtc`로 원본을 열어 같은 값을 확인). U-Boot의 `fdt_chosen()`(`boot/fdt_support.c`)은 `CONFIG_BOARD_RNG_SEED`일 때만 `rng-seed`를 씁니다. 어느 쪽이든 인자 DTB에 들어간 시드는 그대로 저장됩니다. Falcon 경로에서 SPL이 하는 `spl_fixup_fdt()`(`common/spl/spl.c`)는 `fdt_shrink_to_minimum()`과 `arch_fixup_fdt()`(ARM은 메모리 뱅크·PSCI 노드 등)뿐이고 시드를 새로 넣지 않습니다. 그러면 Falcon으로 부팅할 때마다 같은 KASLR 시드와 RNG 초기 시드가 커널에 갑니다. 인자 DTB를 만들 때 두 속성을 지우거나 SPL에서 다시 채우는 방법을 따로 정해야 합니다.
- **DTB가 RAM 위쪽으로 두 번 옮겨졌다.** `fdt`와 `prep`이 각각 DTB를 relocation해서 최종 주소는 0x7d585000입니다. `spl export fdt`가 출력하는 주소도 이렇게 실행 시점마다 정해지므로, 스크립트에서는 `fdtargsaddr`·`fdtargslen` 변수를 써서 저장해야 합니다.

## 저장과 시험

인자 DTB와 커널을 매체의 정해진 섹터에 써야 SPL이 읽습니다. 빌드 B의 값이라면 인자 DTB는 섹터 0x800부터 0x80섹터(64 KiB) 안에, 커널은 섹터 0x1000부터입니다. MMC 쓰기 명령은 원본 저장 장치를 직접 바꾸므로, 먼저 별도 이미지 파일에 쓰고 offset·길이·내용을 확인한 뒤 실제 매체로 옮기는 순서를 권합니다. 이 글은 실제 보드의 매체에 쓰는 실행을 하지 않았습니다.

부팅 시간 절감은 U-Boot Proper가 쓰던 시간만큼입니다. 이 시리즈에는 Falcon을 지원하는 보드의 실측이 없으므로 수치는 적지 않습니다. 측정은 같은 보드·이미지·매체에서 GPIO 토글이나 `bootstage`로 SPL 시작부터 커널 첫 출력까지를 잽니다([Ch 1](/blog/embedded/bootloader/chapter01-boot-problem)).

## 확인 목록

| 확인 | 근거 |
| --- | --- |
| `spl_start_uboot()`가 보드에 구현돼 있는가 | SPL 바이너리에 "Please implement spl_start_uboot()" 문자열이 있으면 weak 구현 |
| 매체별 Falcon 옵션(`SPL_FALCON_BOOT_MMCSD` 등)이 켜졌는가 | 꺼져 있으면 `mmc_load_image_raw_os()`가 `-ENOSYS` |
| SPL 크기 여유 | `CONFIG_SPL_MAX_SIZE`와 `spl/u-boot-spl.bin` |
| 인자 DTB의 `bootargs`와 시드 처리 | `fdt print /chosen` |
| 커널 섹터에 OS=Linux 이미지가 있는가 | 아니면 "Expected image is not found. Trying to start U-Boot" |
| U-Boot로 돌아오는 조건 | `spl_start_uboot()`의 1 반환 경로 |

## 정리

- Falcon은 `CONFIG_SPL_OS_BOOT`로 켜지만, 보드의 `spl_start_uboot()`가 0을 돌려줘야 커널로 갑니다. 기본 구현은 항상 1입니다.
- imx8mm에 켜면 SPL이 4,368바이트 커지고 여유가 2,777바이트로 줄었습니다. MMC raw 적재까지 켜면 2,617바이트입니다.
- MMC에서 SPL은 인자 이미지를 고정 섹터에서 `SPL_PAYLOAD_ARGS_ADDR`로 복사하고, 커널 섹터의 이미지가 Linux인지 확인합니다.
- `spl export fdt`는 bootm `start`→`prep`을 실행해 고친 DTB를 남깁니다. ARM에서는 `cmdline`·`bdt`가 실패해도 결과는 성공입니다.
- 인자 DTB에는 `rng-seed`·`kaslr-seed`가 고정된 값으로 들어가므로 따로 처리해야 합니다.

## 다음 편

[Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)에서는 U-Boot의 control DTB와 커널로 넘기는 OS DTB, `fdt` 명령, 보드별 fixup을 다룹니다.

## 근거 자료

- [U-Boot v2024.04 Falcon Mode 문서](https://docs.u-boot.org/en/v2024.04/develop/falcon.html) (`doc/develop/falcon.rst`): `spl_start_uboot()` 반환값.
- U-Boot v2024.04 소스: `common/spl/Kconfig`(SPL_OS_BOOT, SPL_PAYLOAD_ARGS_ADDR, SPL_FALCON_BOOT_MMCSD), `common/spl/spl.c`(weak `spl_start_uboot`, `spl_fixup_fdt`), `boot/fdt_support.c`(`fdt_chosen`), `arch/arm/lib/bootm-fdt.c`(`arch_fixup_fdt`), `common/spl/spl_mmc.c`(`mmc_load_image_raw_os`), `cmd/spl.c`(`subcmd_list`, `call_bootm`), `cmd/Kconfig`(CMD_SPL), `arch/arm/lib/bootm.c`(`do_bootm_linux`), `configs/*`.
- 이 글의 빌드와 실행: `imx8mm_evk` 기준·Falcon 빌드 두 개의 크기와 `strings`, QEMU 11.1.3에서 bootm 하위 명령 실행 로그.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd)
- [Ch 15: FIT Image](/blog/embedded/bootloader/chapter15-fit-image)
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update)
- [Ch 24: SPL 심화](/blog/embedded/bootloader/chapter24-spl-deep)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
