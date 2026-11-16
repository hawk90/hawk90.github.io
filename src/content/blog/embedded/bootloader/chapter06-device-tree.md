---
title: "Device Tree DTB 부트로더 처리 — 로딩 시점과 fixup 메커니즘 추적"
slug: "embedded/bootloader/chapter06-device-tree"
date: 2026-05-09T09:06:00
description: "U-Boot가 DTB를 다루는 방식 — control DTB와 OS DTB, fdt 명령, 런타임 fixup."
series: "Bootloader Internals"
seriesOrder: 6
tags: [embedded, bootloader, u-boot, device-tree, dtb]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

U-Boot은 Device Tree를 두 가지 용도로 다룹니다. 자기 드라이버를 찾는 control DTB와, 커널에 넘기는 OS DTB입니다. 두 시리즈 구성에서 둘은 이렇게 다릅니다. QEMU `qemu_arm64`는 control DTB를 QEMU에게 받습니다(`OF_BOARD`). imx8mm은 41,168바이트 DTB를 U-Boot 뒤에 붙이고(`OF_SEPARATE`), SPL에는 노드 241개 중 42개만 남긴 8,199바이트판을 따로 만듭니다. OS DTB는 U-Boot가 부팅 직전에 고칩니다. 그런데 정리된 DTB에는 빈 공간이 없어서 `fdt set`이 `FDT_ERR_NOSPACE`로 실패하고, `fdt resize 4096`은 인자를 16진수로 읽어 16 KiB를 더합니다. 이 장의 출력은 모두 그 두 구성에서 실행한 것입니다.

![control DTB는 OF_EMBED·OF_SEPARATE·OF_BOARD 중 한 경로로 얻어 gd->fdt_blob을 거쳐 driver model이 쓰고, OS DTB는 부트 미디어의 파일을 fdt 명령과 runtime fixup으로 다듬은 뒤 booti로 커널에 넘기는 두 흐름](/images/blog/bootloader/diagrams/chapter06-two-dtb-flow.svg)

## control DTB를 얻는 세 경로

| 설정 | 어디서 오나 | 이 시리즈의 예 |
| --- | --- | --- |
| `CONFIG_OF_SEPARATE` | 빌드한 DTB를 `u-boot-nodtb.bin` 뒤에 붙임 | `imx8mm_evk` |
| `CONFIG_OF_BOARD` | 보드 코드가 런타임에 찾아 줌 | `qemu_arm64` (QEMU가 RAM에 둔 DTB) |
| `CONFIG_OF_EMBED` | U-Boot 이미지 안에 빌드해 넣음 | 없음. v2024.04 문서는 "suitable for debugging and development only and is not recommended for production devices"라고 적음 |

### imx8mm — OF_SEPARATE

`imx8mm_evk`의 `.config`는 `CONFIG_OF_SEPARATE=y`입니다. 산출물 크기가 그대로 붙인 결과입니다.

| 파일 | 크기 (바이트) |
| --- | ---: |
| `u-boot-nodtb.bin` | 672,720 |
| `u-boot.dtb` (= `dts/dt.dtb`) | 41,168 |
| `u-boot-dtb.bin` = 둘을 이어 붙인 것 | 713,888 |

672,720 + 41,168 = 713,888입니다. [Ch 4](/blog/embedded/bootloader/chapter04-boot-stages)에서 FIT 안의 `fdt-1`이 41,168바이트였던 것도 이 DTB입니다.

### qemu_arm64 — OF_BOARD

`qemu_arm64`는 `CONFIG_OF_BOARD=y`, `CONFIG_OF_OMIT_DTB=y`입니다. U-Boot 바이너리에는 DTB가 없고([Ch 3](/blog/embedded/bootloader/chapter03-build-system)), QEMU가 RAM에 만들어 둔 DTB를 씁니다. U-Boot는 그 주소를 `fdtcontroladdr` 환경 변수로 알려 줍니다.

```text
=> printenv fdtcontroladdr fdt_addr_r
fdtcontroladdr=7e596d90
## Error: "fdt_addr_r" not defined
=> fdt addr $fdtcontroladdr
Working FDT set to 7e596d90
=> fdt header
magic:			0xd00dfeed
totalsize:		0x100000 (1048576)
off_dt_struct:		0x40
off_dt_strings:		0x1aec
...
size_dt_strings:	0x206
size_dt_struct:		0x1aac
```

(`fdt header` 일부 생략)

totalsize는 1 MiB이지만 실제 구조와 문자열은 0x1aec + 0x206 = 7,410바이트(약 7.2 KiB)입니다. QEMU가 DTB를 1 MiB로 패딩해 넘기기 때문입니다. [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 이렇게 패딩된 DTB를 QEMU `-dtb`로 넘겼다가 TF-A BL2가 `Invalid Device Tree ... error -3`(`FDT_ERR_NOSPACE`)로 거부한 일이 있습니다. `qemu_arm64`의 기본 환경에는 `fdt_addr_r`도 없습니다. 이 보드는 커널용 DTB를 따로 읽어 오는 흐름을 기본으로 두지 않습니다.

control DTB는 U-Boot 전역 상태 `gd->fdt_blob`이 가리키고, driver model이 이 트리로 장치를 만듭니다([Ch 7](/blog/embedded/bootloader/chapter07-driver-model)).

## SPL의 DTB는 다시 깎는다

SPL도 `CONFIG_SPL_OF_CONTROL=y`라 DTB가 필요하지만, SRAM에 들어가야 합니다([Ch 3](/blog/embedded/bootloader/chapter03-build-system)의 여유 7,145바이트). imx8mm 빌드의 두 DTB를 `dtc`로 풀어 비교했습니다.

| DTB | 크기 | 노드 | `bootph-*` 속성 | `interrupts` 속성 |
| --- | ---: | ---: | ---: | ---: |
| `u-boot.dtb` (Proper) | 41,168 | 241 | 45 | 68 |
| `spl/u-boot-spl.dtb` | 8,199 | 42 | 0 | 0 |

깎는 규칙은 `scripts/Makefile.lib`의 `cmd_fdtgrep`에 있습니다.

```make
quiet_cmd_fdtgrep = FDTGREP $@
      cmd_fdtgrep = $(objtree)/tools/fdtgrep $(fdtgrep_props) -u -RT $< \
		-n /chosen -n /config -O dtb | \
	$(objtree)/tools/fdtgrep -r -O dtb - -o $@ \
		-P bootph-all -P bootph-pre-ram -P bootph-pre-sram \
		-P bootph-verify \
		$(migrate_all) \
		$(addprefix -P ,$(subst $\",,$(CONFIG_OF_SPL_REMOVE_PROPS)))
```

SPL 빌드에서 `fdtgrep_props`는 `-b bootph-all -b bootph-pre-ram`입니다. 첫 `fdtgrep`이 그 속성을 가진 노드와 부모, 그리고 `-n`으로 지정한 `/chosen`·`/config`를 남기고, 두 번째가 `bootph-*` 속성 자체와 `CONFIG_OF_SPL_REMOVE_PROPS`를 지웁니다. imx8mm은 그 값이 `"interrupt-parent interrupts"`라서 두 속성이 모두 사라졌습니다. 남은 42개 노드는 SPL이 DRAM을 켜고 다음 이미지를 읽는 데 필요한 것들입니다.

```text
aliases clock-osc-24m usbphynop1 soc@0 bus@30000000 spba-bus@30000000
gpio@30200000 … gpio@30240000 watchdog@30280000 pinctrl@30330000 (그룹 8개)
clock-controller@30380000 serial@30890000 crypto@30900000 (jr 3개)
i2c@30a20000 pmic@4b regulators mmc@30b40000 mmc@30b50000 mmc@30b60000
usb@32e40000 usbmisc@32e40200 chosen wdt-reboot
```

(`dtc` 출력의 노드 이름을 한 줄로 모아 일부 줄임)

UART, eMMC/SD, PMIC를 위한 I2C, 클록·핀 설정, 그리고 USB(SDP 다운로드용)입니다. `bootph-pre-ram`을 붙이지 않은 장치는 SPL에서 보이지 않습니다. 이 속성은 커널과 같이 쓰는 `imx8mm-evk.dts`·`imx8mm-evk.dtsi`·`imx8mm.dtsi`에는 하나도 없습니다. U-Boot 쪽 `arch/arm/dts/imx8mm-evk-u-boot.dtsi`(26개)와 `imx8mm-u-boot.dtsi`(19개)에 있고, 합이 위 표의 45개입니다. 같은 DTS를 쓰면서 U-Boot 전용 속성은 `*-u-boot.dtsi`로 덧붙이는 구조입니다.

## OS DTB를 고치기 — fdt 명령

OS DTB는 부팅 매체에서 읽어 오고, 부팅 전에 고칩니다. QEMU의 DTB를 `dumpdtb`로 받아 `dtc`로 정리한 7,785바이트 파일을 0x48000000에 올리고 `fdt`로 다뤘습니다.

```text
=> fdt addr 0x48000000
Working FDT set to 48000000
=> fdt print /memory@40000000
memory@40000000 {
	reg = <0x00000000 0x40000000 0x00000000 0x40000000>;
	device_type = "memory";
};
=> fdt set /chosen bootargs "manual"
libfdt fdt_setprop(): FDT_ERR_NOSPACE
=> fdt mknode / blogtest
libfdt fdt_add_subnode(): FDT_ERR_NOSPACE
```

`dtc`로 정리한 DTB는 totalsize가 내용과 정확히 같아서(0x1e69) 속성 하나 넣을 자리도 없습니다. 먼저 `fdt resize`로 공간을 만들어야 합니다.

```text
=> fdt resize 4096
=> fdt mknode / blogtest
=> fdt set /blogtest compatible "blog,test"
=> fdt header
magic:			0xd00dfeed
totalsize:		0x6000 (24576)
...
```

이번에는 성공했지만 totalsize가 24,576바이트로 커졌습니다. `cmd/fdt.c`의 `resize`는 인자를 `hextoul()`로 읽어 `fdt_shrink_to_minimum(working_fdt, extrasize)`에 넘깁니다. `4096`은 0x4096, 즉 16,534바이트입니다. `fdt_shrink_to_minimum()`(`boot/fdt_support.c`)은 "구조체 끝 + 문자열 크기 + 예약 엔트리 5개 + extrasize"를 4 KiB 경계로 올립니다. 0x1c30 + 0x239 + 80 + 16,534 = 24,399를 4 KiB로 올리면 24,576입니다. 4 KiB를 원했다면 `fdt resize 1000`이라고 써야 합니다. `help fdt`의 설명은 "Resize fdt to size + padding to 4k addr + some optional <extrasize> if needed"입니다.

`reg` 값의 cell 수는 부모의 `#address-cells`·`#size-cells`를 따릅니다. QEMU 루트는 둘 다 2라서, 위 `memory` 노드는 시작 0x0_40000000, 크기 0x0_40000000(1 GiB)입니다.

## OS DTB를 고치기 — bootm의 자동 fixup

`bootm`·`booti`는 커널로 넘어가기 전에 DTB를 자동으로 고칩니다. [Ch 5](/blog/embedded/bootloader/chapter05-falcon-mode)에서 만든 FIT(커널 + 같은 7,785바이트 DTB)로 bootm 하위 명령을 실행하고, 끝난 DTB를 같은 명령으로 다시 봤습니다.

```text
=> setenv bootargs console=ttyAMA0 falcon=yes
=> bootm start 0x44000000
...
   Booting using the fdt blob at 0x463ea990
=> bootm loados
   Loading Kernel Image to 40400000
=> bootm fdt
   Loading Device Tree to 000000007d58d000, end 000000007d591e68 ... OK
Working FDT set to 7d58d000
=> bootm prep
   Loading Device Tree to 000000007d585000, end 000000007d58ce68 ... OK
Working FDT set to 7d585000
=> fdt header
magic:			0xd00dfeed
totalsize:		0x2000 (8192)
...
=> fdt list /chosen
chosen {
	u-boot,bootconf = "conf-1";
	u-boot,version = "2024.04";
	bootargs = "console=ttyAMA0 falcon=yes";
	stdout-path = "/pl011@9000000";
	rng-seed = <0xe1b7cb3c 0x6e895de5 0xc46432e4 0x359aff6c 0x842f3edd 0x1d12d431 0xc2b5aa44 0x2b2cc7e8>;
	kaslr-seed = <0x12f5e98c 0x077b7936>;
};
```

(FIT 상세 출력 생략)

| 항목 | 원본 DTB | bootm 뒤 |
| --- | --- | --- |
| `/chosen` 속성 | `stdout-path`, `rng-seed`, `kaslr-seed` | + `bootargs`, `u-boot,version`, `u-boot,bootconf` |
| `/memory@40000000` | 1 GiB | 1 GiB (QEMU 값이 이미 맞음) |
| totalsize | 7,785 | 8,192 |

크기 변화는 두 단계를 거칩니다. 먼저 DTB를 bootmap으로 옮길 때 `boot/image-fdt.c` 182행이 `of_len = *of_size + CONFIG_SYS_FDT_PAD`로 공간을 늘립니다. `lib/Kconfig`의 기본값은 0x3000입니다. "end 7d591e68"까지 0x4e69 = 7,785 + 12,288바이트가 그것입니다. 다음으로 fixup이 끝난 뒤 같은 파일 679행의 `fdt_shrink_to_minimum(blob, 0)`이 다시 4 KiB 단위로 줄여 8,192가 됩니다. 수동 `fdt set`이 실패했던 같은 DTB에 bootm은 속성 세 개를 문제없이 넣었습니다. 이 패딩 덕분입니다. DTB에 큰 overlay나 노드를 붙이는 보드는 `CONFIG_SYS_FDT_PAD`를 늘려야 합니다.

이 실행에서는 `bootm fdt`와 `bootm prep`이 각각 DTB를 옮겨 최종 주소가 0x7d585000이 됐습니다.

## 보드별 fixup과 overlay

`bootargs`·`/chosen`·메모리 노드 외의 보드 고유 fixup은 `CONFIG_OF_BOARD_SETUP`의 `ft_board_setup()`이 맡습니다. `imx8mm_evk`와 `qemu_arm64`는 둘 다 이 옵션이 꺼져 있습니다. ARM 공통 fixup은 `arch/arm/lib/bootm-fdt.c`의 `arch_fixup_fdt()`가 하고, 메모리 뱅크와 PSCI 노드 등을 고칩니다.

overlay는 `fdt apply`로 적용할 수 있지만 `CONFIG_OF_LIBFDT_OVERLAY`가 필요합니다. `qemu_arm64`는 이 옵션이 꺼져 있어 이 글에서는 실행하지 않았습니다. 호스트에서 미리 합치려면 `fdtoverlay`를 씁니다.

## 자주 하는 실수

- **`fdt resize 4096`** — 16진수로 읽혀 16 KiB가 더해집니다. 4 KiB는 `fdt resize 1000`입니다.
- **정리된 DTB에 바로 `fdt set`** — `FDT_ERR_NOSPACE`입니다. `fdt resize`를 먼저 하거나 bootm의 자동 패딩에 맡깁니다.
- **control DTB를 고친다고 커널 DTB가 바뀐다고 생각함** — `fdt addr`로 어느 DTB를 작업 대상으로 잡았는지 확인합니다. QEMU에서 control DTB는 0x7e596d90, 올린 OS DTB는 0x48000000이었습니다.
- **SPL에서 장치가 안 보임** — 그 노드에 `bootph-pre-ram`이 없으면 SPL DTB에서 빠집니다. `spl/u-boot-spl.dtb`를 `dtc`로 열어 봅니다.
- **`booti`에서 initrd 자리를 비움** — initrd가 없으면 `booti <kernel> - <fdt>`처럼 `-`를 넣습니다.

## 정리

- control DTB는 `OF_SEPARATE`(imx8mm, 41,168바이트를 붙임) 또는 `OF_BOARD`(QEMU, 1 MiB 패딩으로 받음)로 얻습니다.
- SPL DTB는 `fdtgrep`이 `bootph-*` 노드만 남기고 속성을 지워 만듭니다. imx8mm에서 241개 노드가 42개, 8,199바이트가 됐습니다.
- `fdt set`은 DTB에 빈 공간이 있어야 합니다. `fdt resize`의 인자는 16진수입니다.
- bootm은 DTB를 `CONFIG_SYS_FDT_PAD`(0x3000)만큼 늘려 옮기고, `/chosen`에 `bootargs` 등을 넣은 뒤 다시 줄입니다.

## 다음 편

[Ch 7: Driver Model — uclass, driver, device](/blog/embedded/bootloader/chapter07-driver-model)에서는 control DTB가 어떻게 driver 인스턴스로 바뀌는지, uclass·driver·udevice 구조와 `compatible` 기반 binding을 봅니다.

## 근거 자료

- U-Boot v2024.04 소스: `scripts/Makefile.lib`(`cmd_fdtgrep`, `fdtgrep_props`), `cmd/fdt.c`(`resize`), `boot/fdt_support.c`(`fdt_shrink_to_minimum`), `boot/image-fdt.c`(182행 `CONFIG_SYS_FDT_PAD`, 679행), `lib/Kconfig`(`SYS_FDT_PAD`), `arch/arm/lib/bootm-fdt.c`, `arch/arm/dts/imx8mm-evk-u-boot.dtsi`·`imx8mm-u-boot.dtsi`, `doc/develop/devicetree/control.rst`.
- 이 시리즈의 빌드·실행: `imx8mm_evk` `.config`와 `u-boot.dtb`·`spl/u-boot-spl.dtb`의 `dtc` 비교, QEMU 11.1.3의 `qemu_arm64`에서 `fdt`·bootm 실행 로그.
- [U-Boot v2024.04 Device Tree Control](https://docs.u-boot.org/en/v2024.04/develop/devicetree/control.html).
- [Devicetree Specification](https://devicetree-specification.readthedocs.io/en/stable/devicetree-basics.html): `#address-cells`·`#size-cells`.

## 관련 항목

- [Ch 3: 빌드 시스템](/blog/embedded/bootloader/chapter03-build-system)
- [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)
- [Ch 7: Driver Model](/blog/embedded/bootloader/chapter07-driver-model)
- [Ch 8: board_init_f vs board_init_r](/blog/embedded/bootloader/chapter08-board-init)
- [Ch 15: FIT Image](/blog/embedded/bootloader/chapter15-fit-image)
- [Ch 19: Kernel 인계](/blog/embedded/bootloader/chapter19-kernel-handoff)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
