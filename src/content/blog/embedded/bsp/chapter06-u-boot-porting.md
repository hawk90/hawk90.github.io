---
title: "U-Boot 새 보드 포팅 — defconfig·board.c·DTS 작성 흐름"
slug: "embedded/bsp/chapter06-u-boot-porting"
date: 2026-05-18T09:06:00
description: "BSP 관점에서의 U-Boot 추가 — defconfig·board.c·DT 통합 흐름."
series: "BSP Development"
seriesOrder: 6
tags: [embedded, bsp, u-boot, porting]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"BSP 관점의 U-Boot 포팅은 *시리얼 첫 한 줄*에 도달하기까지의 디버깅 사이클입니다."** 이후 부분은 *환경 설정과 부트 명령 튜닝*입니다.

이 장은 U-Boot v2024.04에서 i.MX 8M Plus EVK를 복사해 가상의 `acme/cam` 보드를 실제로 만들고 빌드해 봅니다. 빌드는 Debian 13 arm64 QEMU guest에서 네이티브로 했고, 보드가 없으므로 부팅 후 단계(`dm tree`, 환경 변수, TFTP)는 같은 v2024.04의 `qemu_arm64_defconfig`를 QEMU virt 머신에서 돌려 확인했습니다.

## U-Boot의 boot phases

U-Boot은 SPL·TPL·VPL 같은 초기 단계를 둘 수 있습니다. i.MX 8M Plus EVK는 BootROM → SPL → (TF-A BL31) → U-Boot proper 순서이고, 각 단계는 Ch 1의 부트 체인 표에 정리했습니다. 이어달리기에 비유하면 SPL은 짧은 첫 주자입니다. 몸집이 작아야 SoC 내부 메모리에 들어가고, 하는 일은 DRAM을 깨워 다음 주자가 뛸 트랙을 까는 것입니다.

**SPL (Secondary Program Loader)** 단계는 다음 일을 합니다.

- DRAM 밖에서 동작합니다. EVK의 `CONFIG_SPL_TEXT_BASE=0x920000`은 DRAM 시작(0x40000000)보다 아래입니다.
- 크기 제한이 있습니다. EVK는 `CONFIG_SPL_MAX_SIZE=0x26000`(155,648바이트)이고, 아래에서 빌드한 SPL은 93,438바이트였습니다.
- DDR을 초기화하고(Ch 5) 콘솔 clock·pinmux를 설정합니다(Ch 4).
- 다음 단계를 DDR로 적재합니다.

**U-Boot proper** 단계는 다음을 담당합니다.

- DDR에서 동작합니다(EVK `CONFIG_TEXT_BASE=0x40200000`).
- 시리얼 console과 명령 인터프리터를 제공합니다.
- 환경 변수를 읽고 저장합니다.
- 커널을 적재하고 부팅합니다.

SPL과 U-Boot proper는 *같은 소스 트리와 같은 .config*에서 함께 빌드됩니다. `CONFIG_SPL_*` 심볼이 SPL 쪽에 무엇을 넣을지 따로 정하고, 같은 드라이버 소스가 `spl/` 아래에 한 번 더 컴파일됩니다. 빌드 로그의 `CC spl/drivers/crypto/fsl/error.o` 같은 줄이 그 흔적입니다.

## U-Boot 디렉터리 구조

새 보드를 추가하기 위해 알아야 할 디렉터리입니다(v2024.04 기준).

```text
u-boot/
├── arch/arm/
│   ├── mach-imx/imx8m/      ← i.MX 8M SoC 공통 (Kconfig에 보드 TARGET 목록)
│   ├── mach-omap2/          ← TI OMAP/AM335x
│   └── dts/                 ← SoC dtsi, 보드 dts, <board>-u-boot.dtsi
├── board/
│   ├── freescale/imx8mp_evk/
│   │   ├── Kconfig
│   │   ├── MAINTAINERS
│   │   ├── Makefile
│   │   ├── imx8mp_evk.c
│   │   ├── imximage-8mp-lpddr4.cfg
│   │   ├── lpddr4_timing.c
│   │   └── spl.c
│   └── <vendor>/<board>/    ← 우리 보드
├── configs/<board>_defconfig
├── include/configs/<board>.h
└── drivers/, common/
```

## 가장 빠른 출발 — reference 보드 복사, 실제로 해 보기

ACME 카메라 보드의 베이스는 `imx8mp_evk`입니다. 실제로 복사해 보면 "board 디렉터리 + defconfig + dts"만으로는 끝나지 않습니다. 빌드가 통과할 때까지 손댄 곳은 다음과 같습니다.

| 파일 | 한 일 |
|------|-------|
| `board/acme/cam/` | `board/freescale/imx8mp_evk/` 복사, `imx8mp_evk.c` → `acme_cam.c`, Makefile의 `.o` 이름 수정 |
| `board/acme/cam/Kconfig` | `if TARGET_ACME_CAM`, `SYS_BOARD "cam"`, `SYS_VENDOR "acme"`, `SYS_CONFIG_NAME "acme_cam"`, `IMX_CONFIG` 경로 |
| `arch/arm/mach-imx/imx8m/Kconfig` | `config TARGET_ACME_CAM`(EVK와 같은 `select` 목록) 추가, `source "board/acme/cam/Kconfig"` 추가 |
| `include/configs/acme_cam.h` | `imx8mp_evk.h` 복사 |
| `arch/arm/dts/acme-cam.dts`, `Makefile` | EVK dts 복사, dtb 목록에 `acme-cam.dtb` 추가 |
| `arch/arm/dts/acme-cam-u-boot.dtsi` | `imx8mp-evk-u-boot.dtsi` 복사 (아래에서 이유를 봅니다) |
| `configs/acme_cam_defconfig` | `CONFIG_TARGET_ACME_CAM=y`, `CONFIG_DEFAULT_DEVICE_TREE="acme-cam"` |

`make acme_cam_defconfig` 뒤 `.config`에는 `CONFIG_SYS_VENDOR="acme"`, `CONFIG_SYS_BOARD="cam"`, `CONFIG_SYS_CONFIG_NAME="acme_cam"`이 들어갑니다.

`-u-boot.dtsi`를 빼먹은 첫 빌드는 SPL과 U-Boot 바이너리까지 만든 뒤 마지막 패키징에서 멈췄습니다.

```text
  BINMAN  .binman_stamp
binman: Device tree 'u-boot.dtb' does not have a 'binman' node
make: *** [Makefile:1125: .binman_stamp] Error 1
```

U-Boot 빌드는 `<보드 dts 이름>-u-boot.dtsi`를 자동으로 덧붙입니다. `scripts/Makefile.lib:162-166`이 `<dts 이름>`, `CONFIG_SYS_SOC`, `CONFIG_SYS_CPU`, `CONFIG_SYS_VENDOR` 순으로 `-u-boot.dtsi`를 찾고, `u-boot.dtsi`를 마지막 후보로 둡니다. EVK의 그 파일은 첫 줄에서 `#include "imx8mp-u-boot.dtsi"`로 `flash.bin`을 조립하는 binman 노드를 가져오고, Ch 4에서 본 `bootph-pre-ram` 표시도 담고 있습니다. 파일 이름이 `acme-cam`으로 바뀌면서 이 자동 포함이 끊긴 것입니다. 복사해 넣자 빌드가 끝났고, SPL용 DT에 콘솔 핀 그룹이 들어갔습니다.

```text
$ dtc -I dtb -O dts spl/u-boot-spl.dtb | grep -A4 "uart2grp {"
				uart2grp {
					fsl,pins = <0x228 0x488 0x5f0 0x00 0x06 0x140 0x22c 0x48c 0x00 0x00 0x00 0x140>;
					phandle = <0x2a>;
				};
```

SPL DT는 노드 43개, U-Boot proper DT는 333개였습니다. `FDTGREP spl/dts/dt-spl.dtb` 단계가 `bootph-*` 표시가 있는 노드만 남긴 결과입니다.

두 번째 빌드도 경고를 남겼습니다. 외부 blob이 없어서입니다.

```text
Image 'u-boot-spl-ddr' is missing external blobs and is non-functional: ddr-1d-imem-fw ddr-1d-dmem-fw ddr-2d-imem-fw ddr-2d-dmem-fw
...
Image 'itb' is missing external blobs and is non-functional: atf-blob

/binman/itb/fit/images/atf/atf-blob (bl31.bin):
   See the documentation for your board. You may need to build ARM Trusted
   Firmware and build with BL31=/path/to/bl31.bin

Some images are invalid
```

`BINMAN_ALLOW_MISSING=1`을 주었기 때문에 `flash.bin`(1,196,968바이트)은 만들어졌지만 binman 스스로 "non-functional"이라고 적습니다. 보드에 쓰려면 Ch 5의 DDR training firmware 네 개와 Ch 7의 `bl31.bin`을 빌드 디렉터리에 넣어야 합니다.

> **메모** Debian 13의 SWIG 4.3.0에서는 v2024.04의 `scripts/dtc/pylibfdt/libfdt.i`가 `too few arguments to function 'SWIG_Python_AppendOutput'`로 컴파일되지 않았습니다. guest의 복사본에서 이 이름 세 곳을 `SWIG_AppendOutput`으로 바꿔 빌드했습니다.

## defconfig 핵심 옵션

복사한 defconfig는 EVK 것이고, v2024.04의 `configs/imx8mp_evk_defconfig`에서 보드마다 다시 볼 줄은 다음과 같습니다.

```ini
CONFIG_TEXT_BASE=0x40200000
CONFIG_ENV_SIZE=0x1000
CONFIG_ENV_OFFSET=0x400000
CONFIG_DEFAULT_DEVICE_TREE="imx8mp-evk"
CONFIG_TARGET_IMX8MP_EVK=y
CONFIG_SPL_TEXT_BASE=0x920000
CONFIG_SPL_STACK=0x960000
CONFIG_SPL_MAX_SIZE=0x26000
CONFIG_SPL_BSS_START_ADDR=0x98fc00
CONFIG_SPL_BOOTROM_SUPPORT=y
CONFIG_SYS_MMC_ENV_DEV=1
CONFIG_MXC_UART=y
```

| 옵션 | 값 | 의미 |
|---|---|---|
| `CONFIG_TEXT_BASE` | `0x40200000` | U-Boot proper 링크 주소, DDR 안 |
| `CONFIG_SPL_TEXT_BASE` | `0x920000` | SPL 주소, DRAM 밖 |
| `CONFIG_SPL_MAX_SIZE` | `0x26000` | SPL이 넘으면 빌드가 실패하는 크기 |
| `CONFIG_ENV_OFFSET` / `ENV_SIZE` | `0x400000` / `0x1000` | 환경 변수를 저장할 MMC 위치와 크기 |
| `CONFIG_SYS_MMC_ENV_DEV` | `1` | 환경을 저장할 MMC 장치 번호 |

예전 자료의 `CONFIG_SYS_TEXT_BASE`는 v2024.04에서 `CONFIG_TEXT_BASE`로 이름이 바뀌어 있습니다(Kconfig에 `SYS_TEXT_BASE`가 없습니다). 초기 디버그 UART를 켤 때의 심볼은 Ch 2에서 본 대로 `DEBUG_UART_MXC`입니다.

## SPL 단계 — `spl.c`

EVK의 SPL 진입점은 짧습니다. `board/freescale/imx8mp_evk/spl.c:123-146`입니다.

```c
/* Do not use BSS area in this phase */
void board_init_f(ulong dummy)
{
	int ret;

	arch_cpu_init();

	init_uart_clk(1);

	ret = spl_early_init();
	if (ret) {
		debug("spl_init() failed: %d\n", ret);
		hang();
	}

	preloader_console_init();

	enable_tzc380();

	power_init_board();

	/* DDR initialization */
	spl_dram_init();
}
```

순서가 곧 디버깅 지도입니다. `init_uart_clk(1)`이 UART2 클록을 열고, `spl_early_init()`이 driver model과 SPL DT를 올리며 그 과정에서 pinctrl이 적용되고, `preloader_console_init()`에서 처음으로 `U-Boot SPL 2024.04 (...)` 배너가 나옵니다. 배너 뒤의 `power_init_board()`가 PMIC를 설정하고 `spl_dram_init()`이 Ch 5의 `ddr_init()`을 부릅니다. 같은 파일의 `spl_board_init()`은 `puts("Normal Boot\n")`을 찍습니다.

## 첫 부팅의 디버깅 사이클

새 보드에서 SPL부터 첫 시리얼까지는 볼 수 있는 출력이 가장 적은 구간입니다. 위 순서를 따라 단계를 나눕니다.

### 단계 1: 초기 firmware가 *실행 자체* 안 되는가

시리얼에 아무것도 없으면 BootROM이 SPL을 못 찾았을 수 있습니다.

- U-Boot v2024.04 `doc/board/nxp/imx8mp_evk.rst:51-55`는 SD에 `flash.bin`을 32 KiB 오프셋으로 씁니다(`dd if=flash.bin of=/dev/sd[x] bs=1K seek=32 conv=notrunc`). 이 값은 i.MX 8M Plus SD 부팅의 값이고 다른 SoC·매체에는 문서를 따로 봅니다.
- boot switch가 SD를 가리키는지 Ch 2의 SW4 표로 확인합니다(EVK 기본값은 eMMC).
- 전원과 reset 회로를 확인합니다.

JTAG이 있으면 SPL 시작 주소(0x920000)에 break를 걸어 PC가 닿는지 봅니다.

### 단계 2: SPL이 실행은 됐는데 *시리얼 출력*이 없는가

배너는 `preloader_console_init()`에서 나오므로, 그 앞의 `init_uart_clk()`과 `spl_early_init()` 사이에서 멈춘 것입니다.

- 콘솔 UART 번호와 `init_uart_clk()` 인자가 맞는지 (UART2 = 1)
- 콘솔 핀 그룹에 `bootph-pre-ram`이 있어 SPL DT에 남았는지 (위의 `uart2grp` 확인 방법)
- `stdout-path`가 가리키는 UART와 회로도의 디버그 헤더가 같은지
- USB-TTL 어댑터의 baud rate (`CONFIG_BAUDRATE` 기본값 115200)

더 앞에서 문자를 보고 싶으면 `DEBUG_UART_MXC` 기반 debug UART를 켭니다(Ch 2). driver model 없이 `CONFIG_DEBUG_UART_BASE` 주소에 직접 씁니다.

### 단계 3: 배너는 뜨는데 *DDR training 실패*

Ch 5에서 본 `drivers/ddr/imx/phy/ddrphy_utils.c:101`의 `Training FAILED`가 이 단계의 신호입니다. DDR 표, training firmware 판, 보드 신호를 봅니다.

### 단계 4: DDR은 통과, U-Boot proper가 *적재 안 됨*

EVK의 SPL은 MMC 드라이버로 `u-boot.itb`를 읽지 않습니다. `spl.c:27-30`의 `spl_board_boot_device()`가 `BOOT_DEVICE_BOOTROM`을 돌려주므로 `common/spl/spl_bootrom.c:27`의 `"BOOTROM"` 로더가 선택되고, `arch/arm/mach-imx/spl_imx_romapi.c`가 i.MX ROM API로 이미지를 받아 옵니다. 그래서 정상 로그는 `Trying to boot from BOOTROM`이고, 모든 로더가 실패하면 `common/spl/spl.c:751`의 `SPL: failed to boot from all boot devices (err=%d)`가 찍힙니다.

- `flash.bin` 안에 `u-boot.itb`가 실제로 들어 있는지 (`bl31.bin`이 빠진 "non-functional" 이미지가 아닌지)
- `CONFIG_SPL_IMX_ROMAPI_LOADADDR=0x48000000` 같은 임시 적재 주소가 DRAM 범위 안인지

### 단계 5: U-Boot proper가 부팅, 명령이 기대와 다름

`dm tree`로 장치와 드라이버의 연결을 봅니다. QEMU virt의 `qemu_arm64_defconfig` 출력 일부입니다.

```text
=> dm tree
 Class     Index  Probed  Driver                Name
-----------------------------------------------------------
 root          0  [ + ]   root_driver           root_driver
 ...
 firmware      0  [   ]   psci                  |-- psci
 ...
 qfw           0  [ + ]   qfw_mmio              |-- fw-cfg@9020000
 ...
 virtio        0  [ + ]   virtio-mmio           |-- virtio_mmio@a000000
 ...
 pci           0  [ + ]   pci_generic_ecam      |-- pcie@10000000
 ...
 rtc           0  [   ]   rtc-pl031             |-- pl031@9010000
 serial        0  [ + ]   serial_pl01x          |-- pl011@9000000
 mtd           0  [ + ]   cfi_flash             |-- flash@0
 ...
```

`Probed`가 빈칸(`[   ]`)인 `rtc-pl031`은 실패한 것이 아닙니다. 드라이버는 bind되어 있고, 아직 아무도 RTC를 쓰지 않아 probe하지 않았을 뿐입니다. `doc/develop/driver-model/design.rst`는 bind 직후 "nothing has been activated (except for the root device)"라고 적고, 장치는 uclass 코드가 찾을 때 activate됩니다. 그러니 MMC가 `[   ]`라면 먼저 `mmc list`나 `mmc dev`로 사용해 본 뒤 다시 확인합니다. 명령 자체가 없을 수도 있습니다. 같은 QEMU 빌드에서 `mmc list`는 `Unknown command 'mmc' - try 'help'`였습니다(`CMD_MMC`가 꺼져 있음).

## U-Boot 환경 설정

부팅 흐름은 *환경 변수*로 정합니다. v2024.04에서 기본 환경을 정하는 방법은 두 가지입니다. `doc/usage/environment.rst:24-36, 90-99`에 따르면 `board/<vendor>/<board>/<CONFIG_ENV_SOURCE_FILE>.env` 텍스트 파일이 우선이고, 없으면 예전 방식인 `CFG_EXTRA_ENV_SETTINGS` 매크로를 씁니다(옛 이름 `CONFIG_EXTRA_ENV_SETTINGS`는 `CFG_`로 바뀌었습니다). EVK는 후자입니다. `include/configs/imx8mp_evk.h:29-41`의 일부입니다.

```c
#define CFG_EXTRA_ENV_SETTINGS		\
	BOOTENV \
	"scriptaddr=" __stringify(CONFIG_SYS_LOAD_ADDR) "\0" \
	"kernel_addr_r=" __stringify(CONFIG_SYS_LOAD_ADDR) "\0" \
	"image=Image\0" \
	"console=ttymxc1,115200 earlycon=ec_imx6q,0x30890000,115200\0" \
	"fdt_addr_r=0x43000000\0"			\
	"boot_fdt=try\0" \
	"fdtfile=" CONFIG_DEFAULT_FDT_FILE "\0" \
	"initrd_addr=0x43800000\0"		\
	"bootm_size=0x10000000\0" \
	"mmcpart=1\0" \
	"mmcroot=/dev/mmcblk1p2 rootwait rw\0" \
```

`console=ttymxc1`은 UART2입니다. Linux `imx8mp.dtsi`의 alias가 `serial1 = &uart2;`이고, i.MX UART 드라이버(`drivers/tty/serial/imx.c:165`)의 장치 이름이 `ttymxc`라 alias 번호가 그대로 tty 번호가 됩니다. `earlycon=ec_imx6q,0x30890000`도 Ch 2의 UART2 주소와 같습니다. `BOOTENV`는 `config_distro_bootcmd.h`의 distro boot 스크립트를 펼칩니다.

QEMU 빌드에서 환경을 바꾸고 저장하면 다음과 같습니다. 이 보드는 환경을 NOR flash에 둡니다.

```text
=> printenv bootcmd
bootcmd=bootflow scan -lb
=> setenv foo bar
=> saveenv
Saving Environment to Flash... Un-Protected 2 sectors
Erasing Flash...
.. done
Erased 2 sectors
Writing to Flash... done
Protected 2 sectors
OK
```

처음 부팅할 때는 `Loading Environment from Flash... *** Warning - bad CRC, using default environment`가 나왔습니다. 저장된 환경이 없으면 CRC 검사에 실패하고 컴파일된 기본값을 쓴다는 뜻이므로, 새 보드의 첫 부팅에서는 정상입니다. EVK라면 `saveenv`가 `CONFIG_SYS_MMC_ENV_DEV=1` 장치의 `CONFIG_ENV_OFFSET=0x400000`에 씁니다.

## TFTP로 빠른 dev cycle

개발 중에 커널을 바꿀 때마다 SD를 다시 굽는 대신 TFTP로 받습니다. QEMU의 user 네트워크는 `-nic user,model=virtio-net-pci,tftp=<디렉터리>`로 내장 TFTP 서버를 띄우므로, 호스트에 서버를 따로 설치하지 않고 흐름을 확인했습니다. 4 MiB 임의 파일을 `Image`로, Ch 3에서 컴파일한 GW74xx DTB를 함께 올렸습니다.

```text
=> setenv autoload no
=> dhcp
BOOTP broadcast 1
DHCP client bound to address 10.0.2.15 (1 ms)
=> tftp 0x40400000 Image
Using virtio-net#32 device
TFTP from server 10.0.2.2; our IP address is 10.0.2.15
Filename 'Image'.
Load address: 0x40400000
...
Bytes transferred = 4194304 (400000 hex)
=> crc32 0x40400000 ${filesize}
crc32 for 40400000 ... 407fffff ==> a0965445
=> tftp 0x43000000 imx8mp-venice-gw74xx.dtb
Bytes transferred = 74511 (1230f hex)
=> fdt addr 0x43000000
Working FDT set to 43000000
=> fdt print / model
model = "Gateworks Venice GW74xx i.MX8MP board"
```

호스트에서 Python `zlib.crc32`로 같은 파일을 계산하면 `0xa0965445`로 U-Boot의 `crc32`와 같습니다. 받은 파일이 깨지지 않았는지 이렇게 확인한 뒤 `booti ${kernel_addr_r} - ${fdt_addr_r}`로 넘어갑니다. 실제 보드에서는 호스트에 dnsmasq나 tftpd-hpa를 띄우고 `serverip`를 그 주소로 둡니다.

## 자주 하는 실수

### `CONFIG_TEXT_BASE`를 *SPL 자리*와 헷갈림

`CONFIG_TEXT_BASE`는 U-Boot proper의 주소(DDR 안), `CONFIG_SPL_TEXT_BASE`는 SPL의 주소(DRAM 밖)입니다. 옛 문서의 `CONFIG_SYS_TEXT_BASE`를 그대로 defconfig에 쓰면 v2024.04 Kconfig에는 그 심볼이 없어 무시됩니다. defconfig 끝에 `CONFIG_SYS_TEXT_BASE=0x40200000`을 붙여 `make`로 적용해 보면 경고 없이 끝나고, 결과 `.config`에 `SYS_TEXT_BASE`는 0번 나옵니다.

### `<board>-u-boot.dtsi`를 복사하지 않음

위에서 본 대로 binman 노드와 `bootph-pre-ram` 표시가 이 파일에 있습니다. dts 이름을 바꾸면 이 파일 이름도 같이 바꿉니다.

### SD 이미지의 *오프셋*을 놓침

i.MX 8M Plus SD 부팅은 32 KiB입니다(`imx8mp_evk.rst:55`). 다른 SoC의 값을 가져오지 않습니다.

### 콘솔 UART가 단계마다 다름

SPL의 `init_uart_clk()` 인자, DT의 `stdout-path`, 환경의 `console=ttymxcN`, debug UART 주소가 모두 같은 UART를 가리켜야 합니다. EVK는 넷 다 UART2입니다(`init_uart_clk(1)`, `&uart2`, `ttymxc1`, `0x30890000`).

### `saveenv`를 안 함

`setenv`는 RAM의 사본만 바꿉니다. 재부팅하면 저장된 환경(또는 위의 기본값)으로 돌아갑니다.

### Ethernet PHY MDIO 주소 잘못

DT `ethernet-phy@N`의 `reg`가 보드의 PHY strap 주소와 다르면 link가 안 잡힙니다. U-Boot의 `mii info` 명령(`cmd/mii.c`)으로 MDIO 버스에서 응답하는 주소를 확인합니다. 이 글은 실제 PHY가 있는 보드에서 실행하지 않았으므로 출력은 싣지 않습니다.

## 정리

- reference 보드 복사는 board 디렉터리, `include/configs` 헤더, `mach-imx/imx8m/Kconfig`의 TARGET과 `source`, dts와 dts Makefile, `<board>-u-boot.dtsi`, defconfig까지 손대야 빌드가 끝납니다.
- `-u-boot.dtsi`가 빠지면 binman이 `does not have a 'binman' node`로 멈춥니다.
- `BINMAN_ALLOW_MISSING=1` 빌드는 DDR firmware와 `bl31.bin`이 빠진 "non-functional" 이미지를 만듭니다.
- EVK SPL은 `init_uart_clk` → `spl_early_init` → 배너 → PMIC → DDR 순이고, U-Boot proper는 ROM API(`BOOTROM` 로더)로 적재합니다.
- `dm tree`의 빈 `Probed` 칸은 실패가 아니라 아직 쓰지 않은 장치입니다.
- v2024.04의 이름은 `CONFIG_TEXT_BASE`, `CFG_EXTRA_ENV_SETTINGS`입니다.
- TFTP로 받은 파일은 `crc32`로 호스트 값과 대조합니다.

## 다음 편

[Ch 7 — TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)에서는 TF-A를 사용하는 보드의 firmware 단계와 U-Boot BL33 handoff를 다룹니다. TF-A 사용 여부와 역할은 SoC·boot chain 및 firmware 구성에서 확인합니다.

## 관련 항목

- [Ch 4: Pin Mux와 Clock](/blog/embedded/bsp/chapter04-pinmux-clock)
- [Ch 5: DDR 매개변수](/blog/embedded/bsp/chapter05-ddr-params)
- [Ch 7: TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Buildroot Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — U-Boot 공식 사이트](https://www.denx.de/wiki/U-Boot)
- [원문 — U-Boot README (메인라인)](https://source.denx.de/u-boot/u-boot/-/blob/master/README)
- [원문 — U-Boot Driver Model](https://u-boot.readthedocs.io/en/latest/develop/driver-model/index.html)
