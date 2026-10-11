---
title: "i.MX8M Mini EVK Linux 부팅 흐름 — BootROM에서 PID 1까지 단계별 인계"
slug: "embedded/modern-recipes/part7-01-linux-boot-flow"
date: 2026-04-16T09:00:00
description: "i.MX8M Mini EVK(U-Boot v2025.04, TF-A v2.12.0, Linux v6.12)를 기준으로 BootROM·SPL·BL31·U-Boot·커널이 다음 단계에 무엇을 넘기는지, root를 누가 mount하는지, 콘솔의 마지막 줄로 멈춘 단계를 짚는 법을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 75
tags: [recipes, linux, boot]
topics: ["embedded"]
---

## 한 줄 요약

> **"각 단계는 다음 단계를 메모리에 올리고, 정해진 레지스터와 Device Tree 속성으로 넘기는 일만 합니다."** root 파일시스템을 mount하는 쪽은 U-Boot가 아니라 커널이나 initramfs의 `/init`이고, U-Boot는 `root=` 문자열을 전달할 뿐입니다.

## 어떤 상황에서 쓰나

새 보드를 올리다 콘솔이 어느 줄에서 멈췄을 때, 그 줄을 찍은 단계와 다음에 실행됐어야 할 단계를 바로 짚으려면 단계 사이의 인계 규칙을 알아야 합니다. initramfs를 넣을지, `root=`만으로 충분한지 정할 때도 같은 규칙이 기준이 됩니다. BootROM·SPL·U-Boot로 이어지는 체인의 개념과 이미지 형식(FIT), secure boot, A/B 업데이트는 [3-12: 임베디드 Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)에서 먼저 보고 오면 됩니다.

## 이 글의 기준

주소·파일 이름·환경 변수·콘솔 문자열은 모두 아래 버전의 upstream 소스에서 가져왔습니다.

- 보드: NXP i.MX8M Mini EVK, U-Boot v2025.04 `imx8mm_evk_defconfig`
- 보안 펌웨어: TF-A v2.12.0 `PLAT=imx8mm` (BL31만 사용, OP-TEE 없음)
- 커널: Linux v6.12, arm64 `defconfig`로 빌드한 `Image`

## 단계별 인계

각 단계가 어디서 실행되고 다음 단계에 무엇을 넘기는지 정리하면 다음과 같습니다.

| 단계 | 실행 위치 | 하는 일 | 다음 단계로 넘기는 방법 | 근거 |
|------|-----------|---------|--------------------------|------|
| BootROM | SoC 내장 ROM | boot switch가 고른 장치에서 `flash.bin`을 읽음(SD는 33 KiB 오프셋) | SPL 시작 | [imx8mm_evk.rst L47-55](https://github.com/u-boot/u-boot/blob/v2025.04/doc/board/nxp/imx8mm_evk.rst?plain=1#L47-L55) |
| SPL | `0x7E1000` (DDR은 `0x40000000`부터) | 콘솔, TZC-380(`enable_tzc380()`), PMIC, DDR 초기화 뒤 `u-boot.itb`에서 U-Boot와 BL31을 올림 | U-Boot 이미지에 entry가 없어 첫 loadable인 BL31의 entry `0x920000`으로 점프 | [defconfig L18](https://github.com/u-boot/u-boot/blob/v2025.04/configs/imx8mm_evk_defconfig#L18), [spl.c L133-142](https://github.com/u-boot/u-boot/blob/v2025.04/board/freescale/imx8mm_evk/spl.c#L133-L142), [imx8mm-u-boot.dtsi L123-214](https://github.com/u-boot/u-boot/blob/v2025.04/arch/arm/dts/imx8mm-u-boot.dtsi#L123-L214), [spl_fit.c L855-860](https://github.com/u-boot/u-boot/blob/v2025.04/common/spl/spl_fit.c#L855-L860) |
| BL31 | `0x920000`, EL3 | 콘솔을 등록하고 EL3 런타임 펌웨어로 상주 | `0x40200000`으로, 코어가 EL2를 구현하면 EL2, 아니면 EL1로 진입 | [platform_def.h L55-65](https://github.com/ARM-software/arm-trusted-firmware/blob/v2.12.0/plat/imx/imx8m/imx8mm/include/platform_def.h#L55-L65), [imx8mm_bl31_setup.c L117-130](https://github.com/ARM-software/arm-trusted-firmware/blob/v2.12.0/plat/imx/imx8m/imx8mm/imx8mm_bl31_setup.c#L117-L130)·[L175-187](https://github.com/ARM-software/arm-trusted-firmware/blob/v2.12.0/plat/imx/imx8m/imx8mm/imx8mm_bl31_setup.c#L175-L187) |
| U-Boot proper | `0x40200000`에서 시작, `board_init_f()` 뒤 DRAM 위쪽으로 자신을 재배치 | `Image`·DTB 적재, DTB 복사본의 `/chosen`에 `bootargs` 기록 | `x0` = DTB 복사본 주소, `x1`~`x3` = 0으로 커널 진입 | [defconfig L3](https://github.com/u-boot/u-boot/blob/v2025.04/configs/imx8mm_evk_defconfig#L3), [board_f.c L375-377](https://github.com/u-boot/u-boot/blob/v2025.04/common/board_f.c#L375-L377), [crt0_64.S L99-130](https://github.com/u-boot/u-boot/blob/v2025.04/arch/arm/lib/crt0_64.S#L99-L130) |
| 커널 | DDR | 드라이버 probe, root 결정 | PID 1 실행 | 아래 "root를 누가 mount하나" |

이 보드에서는 SoC BootROM과 U-Boot SPL이 TF-A의 BL1·BL2 자리를 맡고, TF-A에서는 BL31만 씁니다. TF-A 문서는 이 구성을 BL1·BL2 대신 다른 Trusted Boot Firmware를 쓰는 경우로 다룹니다([firmware-design.rst L572-578](https://github.com/ARM-software/arm-trusted-firmware/blob/v2.12.0/docs/design/firmware-design.rst?plain=1#L572-L578)).

## U-Boot가 커널에 넘기는 것

이 보드의 `bootcmd`는 `bootflow scan -lb; run bsp_bootcmd`입니다([defconfig L28](https://github.com/u-boot/u-boot/blob/v2025.04/configs/imx8mm_evk_defconfig#L28)). 표준 boot 탐색(`bootflow scan`)이 부팅하지 못하면 보드 환경 파일의 경로로 넘어갑니다. 그 경로에서 커널 인계에 쓰는 줄만 옮기면 다음과 같습니다([imx8mm_evk.env](https://github.com/u-boot/u-boot/blob/v2025.04/board/freescale/imx8mm_evk/imx8mm_evk.env)).

```text
console=ttymxc1,115200
image=Image
mmcroot=/dev/mmcblk1p2 rootwait rw
mmcargs=setenv bootargs ${jh_clk} ${mcore_clk} console=${console} root=${mmcroot}
loadimage=fatload mmc ${mmcdev}:${mmcpart} ${loadaddr} ${image}
loadfdt=fatload mmc ${mmcdev}:${mmcpart} ${fdt_addr_r} ${fdtfile}
booti ${loadaddr} - ${fdt_addr_r}
```

`booti`의 형식은 `booti [<addr> [<initrd>[:<size>]] [<fdt>]]`이고, 둘째 인자 `-`는 initrd 없이 Device Tree만 넘긴다는 뜻입니다([booti 문서](https://github.com/u-boot/u-boot/blob/v2025.04/doc/usage/cmd/booti.rst)). 점프 직전에 U-Boot는 다음 순서로 일합니다.

1. `fdt_addr_r`(`0x48000000`)에 읽은 DTB를 새 영역으로 복사하고 `   Loading Device Tree to <시작>, end <끝> ... OK`를 찍습니다([image-fdt.c L253-260](https://github.com/u-boot/u-boot/blob/v2025.04/boot/image-fdt.c#L253-L260)). 이 보드 환경에는 `fdt_high`가 없으므로 DTB는 제자리에서 쓰이지 않고 복사됩니다. 커널이 받는 DTB 주소는 `fdt_addr_r`이 아니라 이 줄의 시작 주소입니다.
2. 복사본의 `/chosen` 노드에 `bootargs` 환경 변수를 쓰고, initrd를 넘겼으면 `linux,initrd-start`·`linux,initrd-end`도 씁니다([image-fdt.c L594](https://github.com/u-boot/u-boot/blob/v2025.04/boot/image-fdt.c#L594)·[L646](https://github.com/u-boot/u-boot/blob/v2025.04/boot/image-fdt.c#L646), [fdt_support.c L257-270](https://github.com/u-boot/u-boot/blob/v2025.04/boot/fdt_support.c#L257-L270)·[L329](https://github.com/u-boot/u-boot/blob/v2025.04/boot/fdt_support.c#L329)). 커널은 이 속성들을 DTB에서 읽습니다([drivers/of/fdt.c L785-790](https://github.com/torvalds/linux/blob/v6.12/drivers/of/fdt.c#L785-L790)·[L1051](https://github.com/torvalds/linux/blob/v6.12/drivers/of/fdt.c#L1051)).
3. `Starting kernel ...`을 출력합니다([arch/arm/lib/bootm.c L70](https://github.com/u-boot/u-boot/blob/v2025.04/arch/arm/lib/bootm.c#L70)).
4. `x0`에 DTB 복사본 주소, `x1`~`x3`에 0을 넣고 커널로 점프합니다([bootm.c L325-327](https://github.com/u-boot/u-boot/blob/v2025.04/arch/arm/lib/bootm.c#L325-L327)). U-Boot가 이미 EL2나 EL1에 있으면 EL을 바꾸지 않고 그대로 점프하므로([transition.S L19-38](https://github.com/u-boot/u-boot/blob/v2025.04/arch/arm/cpu/armv8/transition.S#L19-L38)), 커널은 BL31이 U-Boot에 준 EL로 시작합니다. arm64 커널이 요구하는 값이 `x0` = DTB 물리 주소, `x1`~`x3` = 0이고, EL은 non-secure EL2(권장) 또는 EL1입니다([booting.rst L160-171](https://github.com/torvalds/linux/blob/v6.12/Documentation/arch/arm64/booting.rst?plain=1#L160-L171)).

U-Boot가 root 장치에 대해 하는 일은 `root=/dev/mmcblk1p2 rootwait rw`를 `bootargs`에 넣는 것뿐입니다. 장치를 찾고 mount하는 일은 다음 절의 커널 쪽 경로가 맡습니다.

## root를 누가 mount하나

커널은 부팅 때 항상 rootfs(ramfs, `CONFIG_TMPFS`가 켜져 있으면 tmpfs)를 만들고, 커널에 내장한 cpio를 그 안에 풉니다. initrd 지원을 켠 커널은 부트로더가 넘긴 외부 cpio도 같은 rootfs에 풉니다([ramfs-rootfs-initramfs.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/filesystems/ramfs-rootfs-initramfs.rst)). 그다음 `kernel_init_freeable()`이 rootfs에 `/init`(또는 `rdinit=`로 준 경로)이 있는지 보고 두 경로 중 하나를 고릅니다([init/main.c L1591-1594](https://github.com/torvalds/linux/blob/v6.12/init/main.c#L1591-L1594)).

| 경로 | 조건 | root mount 주체 | PID 1 |
|------|------|-----------------|-------|
| initramfs | rootfs에 `/init`이 있음 | `/init` 프로그램 | `/init`, 이후 진짜 root의 init으로 `switch_root` |
| root 직접 | rootfs에 `/init`이 없음 | 커널 `prepare_namespace()`가 `root=` 장치를 mount | `init=`, 없으면 `CONFIG_DEFAULT_INIT`(설정했을 때) → `/sbin/init` → `/etc/init` → `/bin/init` → `/bin/sh` 순 |

- **initramfs 경로.** 커널은 `root=`를 처리하지 않습니다. `/init`이 진짜 root를 찾아 mount하고 넘겨야 합니다. rootfs는 `pivot_root`도 umount도 할 수 없으므로 `/init`은 rootfs의 파일을 모두 지워 공간을 돌려주고, 새 root를 `/` 위에 덮어 mount한 뒤(`mount --move . /; chroot .`), stdin·stdout·stderr를 새 `/dev/console`에 붙이고 새 init을 exec합니다. busybox 등은 이 절차를 `switch_root`라는 명령으로 제공합니다([ramfs-rootfs-initramfs.rst L123-133](https://github.com/torvalds/linux/blob/v6.12/Documentation/filesystems/ramfs-rootfs-initramfs.rst?plain=1#L123-L133)).
- **root 직접 경로.** `prepare_namespace()`가 `rootwait`이면 장치가 나타날 때까지 기다린 뒤 `root=` 장치를 mount하고 `/`로 옮깁니다([do_mounts.c L464-496](https://github.com/torvalds/linux/blob/v6.12/init/do_mounts.c#L464-L496)). 그 뒤 `init=`가 있으면 그것만 실행하고(실패하면 패닉), 없으면 위 순서로 시도합니다([init/main.c L1508-1531](https://github.com/torvalds/linux/blob/v6.12/init/main.c#L1508-L1531)).

위 `booti ... -` 설정은 외부 cpio를 넘기지 않으므로, 내장 cpio에 `/init`이 없으면 이 보드는 root 직접 경로로 갑니다. 이 경로가 되려면 두 조건이 필요합니다. 하나는 `root=` 값 하나로 root를 가리킬 수 있어야 한다는 것입니다. `root=`는 블록 장치 외에 `ram`(옛 initrd), `nfs`·`cifs`, `mtd`·`ubi`를 받고([kernel-parameters.txt L5892-5898](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/kernel-parameters.txt#L5892-L5898)), 이 보드의 네트워크 부팅 경로(`netargs`)도 `root=/dev/nfs`를 씁니다. 다른 하나는 root 장치와 파일시스템 드라이버가 커널에 들어 있어야 한다는 것입니다. arm64 `defconfig`는 i.MX SD 컨트롤러 드라이버와 ext4를 `=y`로 넣으므로([defconfig L1145](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/configs/defconfig#L1145)·[L1649](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/configs/defconfig#L1649)), `mmcblk1p2`가 ext4라면 initramfs 없이 mount됩니다. 둘 중 하나가 깨지는 예는 다음과 같습니다.

- **root에 필요한 드라이버를 모듈로 빌드한 경우.** 커널은 내장 드라이버만으로 올라오고 추가 모듈은 initrd에서 올리는 두 단계 시작이 initrd의 설계 목적입니다([initrd.rst L14-16](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/initrd.rst?plain=1#L14-L16)).
- **dm-crypt로 암호화한 root.** device-mapper root는 initramfs에서 만들거나 `dm-mod.create=`로 커널이 직접 만들 수 있지만, 문서의 crypt 예처럼 후자는 키를 커널 명령줄, 곧 U-Boot `bootargs`에 그대로 적습니다([dm-init.rst L5-12](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/device-mapper/dm-init.rst?plain=1#L5-L12)·[L92-96](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/device-mapper/dm-init.rst?plain=1#L92-L96)).

## 콘솔의 마지막 줄로 멈춘 단계 짚기

인계 순서와 각 단계가 찍는 문자열을 맞추면, 콘솔에 남은 마지막 줄로 지나간 단계와 멈춘 구간을 정할 수 있습니다. 이 보드에서는 U-Boot, BL31, 커널이 모두 UART2(`0x30890000`, Linux의 `ttymxc1`)에 찍습니다([U-Boot imx8mm-evk.dtsi L13-14](https://github.com/u-boot/u-boot/blob/v2025.04/dts/upstream/src/arm64/freescale/imx8mm-evk.dtsi#L13-L14), [TF-A platform.mk L174](https://github.com/ARM-software/arm-trusted-firmware/blob/v2.12.0/plat/imx/imx8m/imx8mm/platform.mk#L174), [Linux imx8mm.dtsi L36](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/boot/dts/freescale/imx8mm.dtsi#L36)·[L915-916](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/boot/dts/freescale/imx8mm.dtsi#L915-L916)). 문자열은 모두 위 버전의 소스에 있는 그대로입니다.

| 콘솔에 남은 마지막 줄 | 멈춘 구간 | 출처 |
|-----------------------|-----------|------|
| 아무것도 없음 | BootROM이 SPL을 읽지 못했거나 SPL이 `preloader_console_init()` 전에 멈춤. boot switch와 `flash.bin` 오프셋을 먼저 봅니다 | [imx8mm_evk.rst L47-55](https://github.com/u-boot/u-boot/blob/v2025.04/doc/board/nxp/imx8mm_evk.rst?plain=1#L47-L55), [spl.c L133](https://github.com/u-boot/u-boot/blob/v2025.04/board/freescale/imx8mm_evk/spl.c#L133) |
| `U-Boot SPL 2025.04 (...)` 배너 | 배너 뒤의 `enable_tzc380()`·PMIC 설정, DDR 초기화, 부트 장치 탐색 전까지. `ddr_init()`은 진행 메시지를 `debug()`로만 찍습니다 | [common/spl/spl.c L876](https://github.com/u-boot/u-boot/blob/v2025.04/common/spl/spl.c#L876), [spl.c L133-142](https://github.com/u-boot/u-boot/blob/v2025.04/board/freescale/imx8mm_evk/spl.c#L133-L142), [ddr_init.c](https://github.com/u-boot/u-boot/blob/v2025.04/drivers/ddr/imx/imx8m/ddr_init.c) |
| 배너 뒤 `Training FAILED` | DDR PHY training 실패. `ddr_init()`은 실패를 돌려주지만 이 보드의 `spl_dram_init()`이 반환값을 버리고 `board_init_r()`로 넘어가므로, 이 줄 뒤에 무엇이 찍히든 원인은 이 줄입니다 | [ddrphy_utils.c L99-101](https://github.com/u-boot/u-boot/blob/v2025.04/drivers/ddr/imx/phy/ddrphy_utils.c#L99-L101), [ddrphy_train.c L64-66](https://github.com/u-boot/u-boot/blob/v2025.04/drivers/ddr/imx/phy/ddrphy_train.c#L64-L66), [spl.c L51-54](https://github.com/u-boot/u-boot/blob/v2025.04/board/freescale/imx8mm_evk/spl.c#L51-L54)·[L140-142](https://github.com/u-boot/u-boot/blob/v2025.04/board/freescale/imx8mm_evk/spl.c#L140-L142) |
| `SPL: failed to boot from all boot devices` 다음 `### ERROR ### Please RESET the board ###` | 어느 부트 장치에서도 `u-boot.itb`를 읽지 못함 | [common/spl/spl.c L769-775](https://github.com/u-boot/u-boot/blob/v2025.04/common/spl/spl.c#L769-L775), [hang.c L23-28](https://github.com/u-boot/u-boot/blob/v2025.04/lib/hang.c#L23-L28) |
| `Trying to boot from ...` | `u-boot.itb` 적재, BL31로의 점프, BL31 초기 설정 중 하나. 콘솔만으로는 셋을 가를 수 없습니다 | [common/spl/spl.c L641](https://github.com/u-boot/u-boot/blob/v2025.04/common/spl/spl.c#L641), [imx8mm_bl31_setup.c L175-178](https://github.com/ARM-software/arm-trusted-firmware/blob/v2.12.0/plat/imx/imx8m/imx8mm/imx8mm_bl31_setup.c#L175-L178) |
| `NOTICE:  BL31: v2.12.0(release):...` 두 줄 | BL31 진입은 성공. BL31 나머지 초기화나 U-Boot proper의 배너 출력 전 구간 | [bl31_main.c L135-136](https://github.com/ARM-software/arm-trusted-firmware/blob/v2.12.0/bl31/bl31_main.c#L135-L136), [plat_log_common.c L14](https://github.com/ARM-software/arm-trusted-firmware/blob/v2.12.0/plat/common/plat_log_common.c#L14), [board_f.c L914-917](https://github.com/u-boot/u-boot/blob/v2025.04/common/board_f.c#L914-L917) |
| `Starting kernel ...` | 커널 초기 단계. 이 보드 `mmcargs`의 `bootargs`에는 `earlycon`이 없습니다. 값 없이 `earlycon`을 더하면 DT `/chosen/stdout-path`(이 보드 `&uart2`)로 early console이 열립니다 | [kernel-parameters.txt L1253-1258](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/kernel-parameters.txt#L1253-L1258), [imx8mm-evk.dtsi L13-14](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/boot/dts/freescale/imx8mm-evk.dtsi#L13-L14), [imx_earlycon.c L45](https://github.com/torvalds/linux/blob/v6.12/drivers/tty/serial/imx_earlycon.c#L45) |
| `Waiting for root device /dev/mmcblk1p2...` | root 직접 경로, `rootwait`가 장치를 무기한 기다림. MMC 컨트롤러 드라이버·DT 노드·파티션 번호를 봅니다 | [do_mounts.c L413-431](https://github.com/torvalds/linux/blob/v6.12/init/do_mounts.c#L413-L431), [kernel-parameters.txt L5907-5909](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/kernel-parameters.txt#L5907-L5909) |
| `VFS: Unable to mount root fs on ...` 패닉 | root 직접 경로, `root=` 장치를 mount하지 못함 | [do_mounts.c L236·L249](https://github.com/torvalds/linux/blob/v6.12/init/do_mounts.c#L236-L249) |
| `Failed to execute /init (error -8)` 다음 `No working init found.` 패닉 | initramfs 경로, `/init`과 rootfs 안의 대체 init이 모두 실행 실패 | 아래 문단 |
| `No working init found.` 패닉, 앞에 `Failed to execute /init` 없음 | root 직접 경로, 진짜 root의 `/sbin/init`부터 `/bin/sh`까지 모두 실행 실패 | [init/main.c L1525-1532](https://github.com/torvalds/linux/blob/v6.12/init/main.c#L1525-L1532) |

`Failed to execute /init (error -8)`의 -8은 `ENOEXEC`(Exec format error)입니다([errno-base.h L12](https://github.com/torvalds/linux/blob/v6.12/include/uapi/asm-generic/errno-base.h#L12)). 등록된 binfmt 처리기가 모두 그 파일을 거절했다는 뜻입니다([fs/exec.c L1756](https://github.com/torvalds/linux/blob/v6.12/fs/exec.c#L1756)). arm64 ELF 처리기는 `e_machine`이 `EM_AARCH64`가 아닌 ELF를 거절합니다([binfmt_elf.c L841-849](https://github.com/torvalds/linux/blob/v6.12/fs/binfmt_elf.c#L841-L849), [asm/elf.h L97](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/elf.h#L97)). arm64 `defconfig`는 `CONFIG_COMPAT=y`라 32비트 ARM(EABI) ELF는 compat 처리기가 받지만, CPU가 32비트 EL0를 지원할 때만입니다([defconfig L84](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/configs/defconfig#L84), [process.c L652-661](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/kernel/process.c#L652-L661)). 스크립트 처리기는 `#!`로 시작하지 않는 파일을 같은 값으로 거절합니다([binfmt_script.c L40-42](https://github.com/torvalds/linux/blob/v6.12/fs/binfmt_script.c#L40-L42)).

이 줄은 끝이 아닙니다. `/init`이 있다는 이유로 `prepare_namespace()`는 이미 건너뛰었으므로 `root=`를 줬어도 진짜 root는 mount되지 않고, 커널은 PID 1 순서(`init=`, `CONFIG_DEFAULT_INIT`, `/sbin/init` …)로 initramfs 안에서 다시 찾습니다. 파일이 있는데 실행되지 않으면 `Starting init: /sbin/init exists but couldn't execute it (error -8)` 같은 줄이 더 찍히고, 모두 실패하면 `No working init found.` 패닉으로 끝납니다. `init=`를 줬다면 그것이 실패하는 순간 `Requested init ... failed` 패닉입니다. initramfs 안에 실행되는 `/sbin/init`이 있으면 그것이 진짜 root 없이 PID 1이 됩니다([init/main.c L1393-1405](https://github.com/torvalds/linux/blob/v6.12/init/main.c#L1393-L1405)·[L1494-1531](https://github.com/torvalds/linux/blob/v6.12/init/main.c#L1494-L1531)).

## 정리

- initramfs를 넣을지는 `root=` 값 하나로 root를 가리킬 수 있는지, 그 장치와 파일시스템 드라이버가 커널에 들어 있는지 두 가지로 정합니다.
- 커널에 간 DTB 주소는 `fdt_addr_r`이 아니라 U-Boot의 `Loading Device Tree to` 줄에서 읽습니다.
- `error -8`이 보이면 `root=`보다 `/init`의 ELF 아키텍처와 `#!` 줄을 먼저 봅니다.

## 다음 장 예고

다음 편은 **U-Boot 활용**입니다. `printenv`·`setenv`로 환경 변수를 다루는 법, `boot.scr` 스크립트와 TFTP 부팅을 정리합니다. 그 글의 예는 32비트 ARM `zImage`와 `bootz` 기준이므로, 이 보드의 arm64 `Image`에서는 `booti`로 바꿔 읽습니다.

## 관련 항목

- [7-02: U-Boot 활용](/blog/embedded/modern-recipes/part7-02-uboot-usage)
- [3-12: 임베디드 Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
- [7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
- [7-05: 임베디드 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-14: 루트 파일시스템 구축 (Buildroot 기초)](/blog/embedded/modern-recipes/part7-14-rootfs-buildroot)
