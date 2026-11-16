---
title: "새 보드 U-Boot 포팅 실전 — defconfig 작성부터 첫 부팅까지"
slug: "embedded/bootloader/chapter21-board-porting"
date: 2026-05-09T09:21:00
description: "U-Boot에 새 보드를 추가하는 전체 워크플로 — configs·board·dts·MAINTAINERS."
series: "Bootloader Internals"
seriesOrder: 21
tags: [embedded, bootloader, u-boot, porting, board]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> U-Boot에 보드를 하나 추가하는 일은 **Kconfig에 타깃을 등록하고, `board/<vendor>/<board>/`에 Kconfig·Makefile·C 코드·`.env`·MAINTAINERS를 두고, `make savedefconfig`로 defconfig를 만드는 것**입니다. 가장 가까운 기존 보드를 출발점으로 삼되, 기존 타깃 이름에 묶여 있던 기본값들이 새 타깃에서 조용히 빠지거나 남는 곳을 찾아내는 것이 포팅의 실제 작업입니다.

이 글은 실제 하드웨어 대신 U-Boot **v2024.04**의 QEMU 보드(`board/emulation/qemu-arm/`)를 출발점으로 삼아 `demo/demo-virt`라는 새 보드를 처음부터 추가하고, 빌드하고, QEMU 11.1.3 `virt`에서 첫 부팅까지 한 기록입니다. 원본 소스는 건드리지 않고 복사본에서 작업했으며, 변경은 8개 파일 293줄이었습니다. SoC 초기화와 DRAM training이 없는 가상 보드라 [9장](/blog/embedded/bootloader/chapter09-dram-init)의 DDR 단계는 빠져 있지만, 보드를 tree에 넣는 절차와 그 과정에서 생기는 문제는 실제 보드와 같습니다.

## 출발점 고르기

새 보드는 거의 항상 가장 비슷한 기존 보드에서 시작합니다. 같은 SoC, 같은 부트 매체, 같은 PMIC를 쓰는 보드일수록 고칠 곳이 적습니다. 출발점이 정해지면 먼저 **그 보드가 tree의 어디에 등록되어 있는지**를 봅니다. QEMU 보드는 세 군데에 걸쳐 있었습니다.

| 위치 | 하는 일 |
| --- | --- |
| `arch/arm/mach-qemu/Kconfig` | `TARGET_QEMU_ARM_64BIT` 타깃 정의, `SYS_VENDOR`·`SYS_BOARD`·`SYS_CONFIG_NAME` 기본값 |
| `arch/arm/Kconfig` | `source "board/emulation/qemu-arm/Kconfig"` |
| `board/emulation/qemu-arm/` | `Kconfig`, `Makefile`, `qemu-arm.c`, `qemu-arm.env`, `MAINTAINERS` |

그리고 기존 타깃 이름이 tree 곳곳에서 조건으로 쓰이는지 찾습니다.

```bash
git grep -n 'TARGET_QEMU_ARM_64BIT' -- ':!configs' ':!doc'
```

```text
arch/arm/mach-qemu/Kconfig:14:	default TARGET_QEMU_ARM_64BIT
arch/arm/mach-qemu/Kconfig:23:config TARGET_QEMU_ARM_64BIT
board/emulation/common/Kconfig:3:	default "64m(u-boot)" if TARGET_QEMU_ARM_64BIT && !TFABOOT
board/emulation/common/Kconfig:11:	default "64m(u-boot-env)" if TARGET_QEMU_ARM_64BIT && !TFABOOT
board/emulation/common/qemu_dfu.c:58:	    IS_ENABLED(CONFIG_TARGET_QEMU_ARM_64BIT)) {
board/emulation/common/qemu_mtdparts.c:56:	    IS_ENABLED(CONFIG_TARGET_QEMU_ARM_64BIT)) {
board/emulation/qemu-arm/Kconfig:1:if TARGET_QEMU_ARM_32BIT || TARGET_QEMU_ARM_64BIT
board/emulation/qemu-arm/Kconfig:21:if TARGET_QEMU_ARM_64BIT && !TFABOOT
board/emulation/qemu-arm/qemu-arm.c:41:#elif defined(CONFIG_TARGET_QEMU_ARM_64BIT)
cmd/Kconfig:2282:	default y if TARGET_QEMU_ARM_32BIT || TARGET_QEMU_ARM_64BIT || \
```

이 목록이 곧 "보드를 복사한 뒤 따로 챙겨야 할 곳"입니다. MTD 파티션 기본값, DFU 영역 계산, capsule 업데이트 이미지 목록, `cmd/Kconfig`의 `CMD_QFW` 기본값이 모두 QEMU 타깃 이름에 묶여 있어서, 새 타깃에서는 다르게 동작합니다.

## 타깃 등록

`arch/arm/mach-qemu/Kconfig`의 타깃 선택지에 새 타깃을 넣고, vendor·board 이름이 새 타깃일 때 바뀌도록 조건부 기본값을 앞에 둡니다. Kconfig는 위에서부터 처음 맞는 `default`를 쓰기 때문에 순서가 중요합니다.

```text
config SYS_VENDOR
	default "demo" if TARGET_DEMO_VIRT
	default "emulation"

config SYS_BOARD
	default "demo-virt" if TARGET_DEMO_VIRT
	default "qemu-arm"
...
config TARGET_DEMO_VIRT
	bool "Demo board on QEMU virt (ARMv8, 64bit)"
	select ARM64
	select BOARD_LATE_INIT
```

`SYS_CONFIG_NAME`은 그대로 `qemu-arm`으로 두어 `include/configs/qemu-arm.h`를 함께 씁니다. `SYS_VENDOR`·`SYS_BOARD`가 빌드 시스템이 `board/demo/demo-virt/`를 찾는 경로가 됩니다. `arch/arm/Kconfig`에는 새 보드의 Kconfig를 `source`하는 한 줄을 더했습니다.

## 보드 디렉터리

| 파일 | 내용 |
| --- | --- |
| `Kconfig` | `if TARGET_DEMO_VIRT` 안에 `TEXT_BASE`(0), `BOARD_SPECIFIC_OPTIONS`(virtio imply), `PRE_CON_BUF_ADDR` |
| `Makefile` | `obj-y += demo-virt.o` |
| `demo-virt.c` | `qemu-arm.c`에서 capsule 업데이트 블록을 빼고 `checkboard()`를 더함 |
| `demo-virt.env` | `qemu-arm.env` + `fdt_addr_r=0x43e00000`, `boot_targets=virtio` |
| `MAINTAINERS` | 보드 디렉터리와 defconfig의 담당자 |

`qemu-arm.c`에서 그대로 가져온 함수들이 보드 C 코드의 최소 구성을 보여 줍니다. AArch64 MMU 영역 표 `mem_map`, `dram_init()`(QEMU는 DT의 `memory` 노드에서 크기를 읽음, 9장), `board_fdt_blob_setup()`(QEMU가 넘긴 DTB를 control DTB로 씀, [16장](/blog/embedded/bootloader/chapter16-verified-boot)), CFI flash 접근 함수입니다. 실제 SoC 보드라면 이 자리에 pin mux, clock, PMIC 설정이 들어갑니다. 새로 넣은 것은 배너에 보드 이름을 찍는 한 함수입니다.

```c
int checkboard(void)
{
	puts("Board: Demo Virt rev A (QEMU virt)\n");
	return 0;
}
```

`.env`에는 [10장](/blog/embedded/bootloader/chapter10-storage-boot)에서 QEMU 보드에 없어서 `load`가 실패했던 `fdt_addr_r`을 처음부터 넣었습니다. 새 보드를 만들 때가 주소 변수를 빠짐없이 정해 두기 가장 좋은 시점입니다.

## defconfig는 `savedefconfig`로

v2024.04 `doc/develop/board_best_practices.rst`는 "The platform defconfig file must be generated via `make savedefconfig`"라고 정합니다. `qemu_arm64_defconfig`에서 시작해 타깃을 바꾸고(`TARGET_DEMO_VIRT=y`), 프롬프트(`SYS_PROMPT="demo=> "`)와 보드 정보 출력(`DISPLAY_BOARDINFO`)을 켠 뒤 `make savedefconfig`를 실행했습니다. 첫 결과를 원래 defconfig와 비교하자 직접 바꾸지 않은 줄이 세 개 더 있었습니다.

```text
> CONFIG_CMD_QFW=y
> CONFIG_SET_DFU_ALT_INFO=y
> CONFIG_SYS_MTDPARTS_RUNTIME=y
```

이 셋은 QEMU 타깃에서는 Kconfig 기본값이라 defconfig에 적을 필요가 없었습니다. 새 타깃에서는 기본값이 아니므로, `savedefconfig`가 현재 상태를 지키려고 명시적으로 적은 것입니다. 앞의 `git grep` 목록과 맞춰 보면, `SET_DFU_ALT_INFO`와 `SYS_MTDPARTS_RUNTIME`가 쓰는 `qemu_dfu.c`·`qemu_mtdparts.c`는 `CONFIG_TARGET_QEMU_ARM_64BIT`일 때만 실제 동작을 합니다. 새 보드에서 켜 두면 아무것도 하지 않는 코드가 되므로 두 옵션은 끄고 `savedefconfig`를 다시 실행했습니다. 최종 defconfig는 72줄이고, 원본과의 차이는 의도한 네 줄(`TARGET_DEMO_VIRT`, `SYS_PROMPT`, `DISPLAY_BOARDINFO`, 그리고 유지하기로 한 `CMD_QFW`)뿐입니다. defconfig diff를 이렇게 한 줄씩 설명할 수 있는 상태가 리뷰할 수 있는 상태입니다.

## 빌드와 첫 부팅

```bash
make O=build-demo demo_virt_defconfig
make O=build-demo -j8 CROSS_COMPILE=aarch64-elf-
```

빌드 로그에 `CC board/demo/demo-virt/demo-virt.o`가 찍혔고 `u-boot.bin`은 1,046,248 byte였습니다(경고 8개는 모두 macOS에서 빌드한 host 도구 `tools/imagetool.c`·`proftool.c`·`relocate-rela.c`의 것이었습니다). QEMU에서 부팅한 결과입니다.

```text
U-Boot 2024.04-gbc7c5457-dirty (Nov 15 2026 - 23:00:02 +0900)

Model: linux,dummy-virt
Board: Demo Virt rev A (QEMU virt)
DRAM:  1 GiB
Core:  49 devices, 12 uclasses, devicetree: board
Flash: 64 MiB
Loading Environment from Flash... *** Warning - bad CRC, using default environment
...
demo=> printenv board board_name vendor fdt_addr_r boot_targets
board=demo-virt
board_name=demo-virt
vendor=demo
fdt_addr_r=0x43e00000
boot_targets=virtio
```

확인할 것이 네 가지 있습니다.

- `Board:` 줄이 새로 넣은 `checkboard()`입니다. `CONFIG_DISPLAY_BOARDINFO`를 켜야 `init_sequence_f`의 `show_board_info`가 이 함수를 부릅니다.
- `board`·`board_name`·`vendor` 변수는 따로 적지 않았는데 생겼습니다. `CONFIG_ENV_VARS_UBOOT_CONFIG`가 `SYS_BOARD`·`SYS_VENDOR`에서 만들어 넣는 값이고, [12장](/blog/embedded/bootloader/chapter12-usb-boot)의 Fastboot `getvar product`가 읽는 것도 이 `board`입니다.
- 버전 문자열의 `-gbc7c5457-dirty`는 빌드한 소스 tree의 git 커밋과 수정 여부입니다. 첫 부팅 로그를 남길 때 어느 소스로 만든 바이너리인지가 이 한 줄로 기록됩니다.
- `Model: linux,dummy-virt`는 QEMU가 만든 DTB의 값입니다. 실제 보드라면 여기에 보드 DTS의 `model`이 나와야 하고, 다른 보드 이름이 보이면 DTS를 잘못 고른 것입니다.

## 첫 부팅이 멈출 때 — `initcall failed`

포팅 초기에 가장 흔한 것은 `board_init_f()`의 초기화 함수 하나가 실패해 멈추는 상황입니다. `dram_init()`이 `-EINVAL`을 돌려주도록 일부러 바꿔 빌드했습니다.

```text
Board: Demo Virt rev A (QEMU virt)
DRAM:  initcall failed at call 000000000002a85c (err=-22)
### ERROR ### Please RESET the board ###
```

`err=-22`는 `-EINVAL`입니다. 문제는 주소입니다. ELF로 풀어 보면 `0x2a85c`는 `dram_init`이 아니었습니다.

```text
$ aarch64-elf-addr2line -f -e u-boot 0x2a85c
setup_dest_addr
.../common/board_f.c:350
$ aarch64-elf-nm u-boot | grep ' T dram_init$'
000000000000342c T dram_init
```

v2024.04 `lib/initcall.c`의 반복문이 원인입니다.

```c
for (ptr = init_sequence; func = *ptr, !ret && func; ptr++) {
	...
	ret = type ? event_notify_null(type) : func();
}
```

실패한 함수가 돌아오면 `ptr++`가 먼저 일어나고, 조건식의 `func = *ptr`이 **다음 항목**을 읽은 뒤에야 `!ret`로 반복을 끝냅니다. 그래서 출력되는 주소는 실패한 함수가 아니라 `init_sequence_f`에서 **그다음 함수**입니다. [8장](/blog/embedded/bootloader/chapter08-board-init)의 배열에서 `dram_init` 다음이 `setup_dest_addr`이고, 실제로 그 주소가 나왔습니다. 이 메시지를 보면 `addr2line`으로 함수를 찾은 뒤 배열에서 **한 칸 앞** 항목을 의심합니다. 이 경우에는 직전에 출력된 `DRAM:  `(`announce_dram_init`)도 같은 결론을 줍니다.

## 단계별로 어디까지 왔는가

![새 보드 first-boot 진단 단계의 개념도](/images/blog/bootloader/diagrams/chapter21-first-boot-stages.svg)

실제 SoC 보드의 첫 부팅은 그림의 단계를 하나씩 넘는 일입니다. DEBUG_UART로 한 글자를 찍는 것이 첫 목표이고, SPL과 DRAM([9장](/blog/embedded/bootloader/chapter09-dram-init)), relocation([8장](/blog/embedded/bootloader/chapter08-board-init)), 저장 장치([10장](/blog/embedded/bootloader/chapter10-storage-boot)), kernel 인계([19장](/blog/embedded/bootloader/chapter19-kernel-handoff))로 이어집니다. 위의 QEMU 실험은 3단계 이후만 다루지만, `initcall failed` 메시지와 그 주소를 읽는 법은 어느 단계에서 멈추든 같습니다.

## MAINTAINERS와 제출

보드 디렉터리의 `MAINTAINERS`는 그 파일들을 누가 책임지는지 적습니다. 실제 제출이라면 담당자 본인의 이름과 주소를 씁니다.

```text
DEMO VIRT BOARD
M:	Demo Maintainer <maintainer@example.invalid>
S:	Maintained
F:	board/demo/demo-virt/
F:	configs/demo_virt_defconfig
```

같은 best practices 문서는 표준 부팅([14장](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)) 지원을 권하고, 부팅 매체나 빌드 종류마다 다른 설정은 defconfig를 여러 벌 만들지 말고 보드 디렉터리 안의 Kconfig fragment로 두라고 안내합니다.

## 정리

- 보드 추가는 타깃 Kconfig 등록 + `board/<vendor>/<board>/`의 Kconfig·Makefile·C·`.env`·MAINTAINERS + `savedefconfig`입니다. 이 실험은 8개 파일 293줄이었습니다.
- 출발점 보드의 타깃 이름을 `git grep`해서, 그 이름에 묶인 기본값과 코드를 먼저 찾습니다. QEMU는 타깃 정의 두 줄을 빼고 8곳이었습니다.
- `savedefconfig` diff에는 옛 타깃의 기본값이 명시적인 줄로 나타납니다. 새 보드에서 쓸모없는 줄(여기서는 DFU·MTD 파티션)은 끄고 다시 만듭니다.
- `board`·`vendor` 환경 변수와 버전의 git 표시는 첫 부팅 로그에서 보드와 빌드를 식별하는 근거가 됩니다.
- v2024.04의 `initcall failed at call <addr>`은 실패한 함수의 **다음** 항목 주소를 출력합니다. `addr2line` 후 배열에서 한 칸 앞을 봅니다.

## 다음 장 예고

다음 장에서는 U-Boot가 멈추거나 이상하게 동작할 때 쓰는 디버깅 도구를 다룹니다. 이 글의 `initcall failed`, [19장](/blog/embedded/bootloader/chapter19-kernel-handoff)의 gdb 연결, `DEBUG` 매크로와 로그 레벨을 이어서 실제로 써 봅니다.

## 관련 항목

- [Ch 20: RAUC / SWUpdate](/blog/embedded/bootloader/chapter20-rauc-swupdate)
- [Ch 22: U-Boot 디버깅](/blog/embedded/bootloader/chapter22-debugging)
- [BSP Development Ch 1: What is BSP](/blog/embedded/bsp/chapter01-what-is-bsp)
- [U-Boot v2024.04 `doc/develop/board_best_practices.rst`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/develop/board_best_practices.rst)
- [U-Boot v2024.04 `board/emulation/qemu-arm/`](https://github.com/u-boot/u-boot/tree/v2024.04/board/emulation/qemu-arm)
- [U-Boot v2024.04 `lib/initcall.c`](https://github.com/u-boot/u-boot/blob/v2024.04/lib/initcall.c)
