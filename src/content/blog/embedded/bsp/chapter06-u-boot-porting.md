---
title: "U-Boot 새 보드 포팅 — defconfig·board.c·DTS 작성 흐름"
date: 2026-05-18T09:06:00
description: "BSP 관점에서의 U-Boot 추가 — defconfig·board.c·DT 통합 흐름."
series: "BSP Development"
seriesOrder: 6
tags: [embedded, bsp, u-boot, porting]
draft: false
---

## 한 줄 요약

> **"BSP 관점의 U-Boot 포팅은 *시리얼 첫 한 줄*에 도달하기까지의 디버깅 사이클입니다."** — 이후 부분은 *환경 설정과 부트 명령 튜닝*입니다.

U-Boot은 거의 모든 ARM SoC에서 *사실상 표준* 부트로더입니다. NXP, TI, ST, Rockchip, Broadcom이 모두 vendor BSP에서 U-Boot을 씁니다. Zephyr나 Xen 환경이 아니라면 BSP의 부트로더는 *U-Boot입니다*.

## U-Boot의 두 단계

요즘 SoC의 U-Boot은 *항상 두 단계*입니다.

```text
[BootROM (SoC 내부)]
   │
   ▼
[SPL — Secondary Program Loader]
   - SoC 내부 SRAM에서 동작 (DDR 없음)
   - 크기 제한 (보통 128KB 이내)
   - DDR 초기화, clock·pinmux 설정
   - 다음 단계를 DDR로 적재
   │
   ▼
[U-Boot proper (또는 BL31 → BL33 U-Boot)]
   - DDR에서 동작
   - 시리얼 console + 명령 인터프리터
   - 부트 환경 (uEnv.txt, fw_env)
   - 커널 적재 + 부팅
```

SPL과 U-Boot proper는 *같은 소스 트리에서 다른 .config*로 빌드됩니다. 동일한 driver를 *다르게 컴파일*해 양쪽에 link합니다.

ARMv8 보드는 *SPL 자리에 TF-A BL2*가 오는 경우가 늘고 있습니다. [Ch 7](/blog/embedded/bsp/chapter07-tfa-trustzone)에서 다룹니다.

## U-Boot 디렉터리 구조

새 보드를 추가하기 위해 알아야 할 디렉터리입니다.

```text
u-boot/
├── arch/
│   ├── arm/
│   │   ├── cpu/
│   │   ├── mach-imx/        ← NXP i.MX SoC 공통
│   │   │   ├── imx8m/
│   │   │   └── ...
│   │   ├── mach-rockchip/
│   │   ├── mach-omap2/      ← TI OMAP/AM335x
│   │   └── dts/             ← SoC dtsi
│   └── ...
├── board/
│   ├── freescale/
│   │   ├── imx8mp_evk/      ← NXP reference 보드
│   │   │   ├── Kconfig
│   │   │   ├── MAINTAINERS
│   │   │   ├── Makefile
│   │   │   ├── imx8mp_evk.c
│   │   │   ├── spl.c
│   │   │   ├── lpddr4_timing.c
│   │   │   └── README
│   │   └── ...
│   ├── ti/
│   ├── beagle/
│   └── <vendor>/
│       └── <board>/         ← 우리 보드가 여기 들어감
├── configs/
│   ├── imx8mp_evk_defconfig
│   ├── am335x_evm_defconfig
│   └── <board>_defconfig    ← 우리 defconfig
├── include/
│   └── configs/
│       └── <board>.h        ← 보드별 헤더 (점점 비어 가는 추세)
├── drivers/
└── common/
```

새 보드 추가는 다음 *6개 파일*을 만들면 됩니다.

1. `board/<vendor>/<board>/Kconfig` — Kconfig 통합
2. `board/<vendor>/<board>/Makefile` — build rules
3. `board/<vendor>/<board>/<board>.c` — board init 코드
4. `board/<vendor>/<board>/spl.c` — SPL 단계 코드
5. `configs/<board>_defconfig` — defconfig
6. `arch/arm/dts/<board>.dts` — device tree

DDR 코드는 NXP의 경우 `board/<vendor>/<board>/lpddr4_timing.c`로 별도, TI는 `board/ti/<board>/`에 통합되는 식입니다.

## 가장 빠른 출발 — *비슷한* reference 보드 복사

vendor reference 보드와 *가장 비슷한* 것을 골라 *통째로* 복사한 뒤 수정합니다.

NXP i.MX 8M Plus 기반 ACME 카메라 보드를 예로 들면 *imx8mp_evk*가 베이스입니다.

```bash
cd u-boot

# 1. board 디렉터리 복사
cp -r board/freescale/imx8mp_evk board/acme/cam

# 2. 파일 이름 바꾸기
cd board/acme/cam
mv imx8mp_evk.c acme_cam.c
sed -i 's/imx8mp_evk/acme_cam/g' Kconfig Makefile MAINTAINERS

# 3. defconfig 복사
cd ../../../
cp configs/imx8mp_evk_defconfig configs/acme_cam_defconfig
sed -i 's/imx8mp-evk/acme-cam/g' configs/acme_cam_defconfig
sed -i 's/imx8mp_evk/acme_cam/g' configs/acme_cam_defconfig

# 4. DT 복사
cp arch/arm/dts/imx8mp-evk.dts arch/arm/dts/acme-cam.dts
sed -i 's/imx8mp-evk/acme-cam/g' arch/arm/dts/acme-cam.dts
```

복사 후 *컴파일 통과*만 확인합니다. 동작은 *그 다음 단계*에서 잡습니다.

```bash
make ARCH=arm CROSS_COMPILE=aarch64-linux-gnu- acme_cam_defconfig
make ARCH=arm CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc)
```

## defconfig 핵심 옵션

i.MX 8M Plus용 defconfig에서 보드별로 *반드시* 확인할 항목입니다.

```text
CONFIG_ARM=y
CONFIG_ARCH_IMX8M=y
CONFIG_SYS_TEXT_BASE=0x40200000   ← U-Boot 적재 주소 (DDR 안)
CONFIG_TARGET_ACME_CAM=y          ← 우리 보드 선택

# SPL
CONFIG_SPL=y
CONFIG_SPL_TEXT_BASE=0x920000     ← SoC SRAM 안
CONFIG_SPL_MAX_SIZE=0x25000
CONFIG_SPL_STACK=0x96fff0
CONFIG_SPL_BSS_START_ADDR=0x95e000

# DT
CONFIG_DEFAULT_DEVICE_TREE="acme-cam"
CONFIG_OF_CONTROL=y
CONFIG_SPL_OF_CONTROL=y

# Console / Debug UART
CONFIG_DEBUG_UART=y
CONFIG_DEBUG_UART_BASE=0x30890000   ← UART2 base (보드별 확인)
CONFIG_DEBUG_UART_CLOCK=24000000
CONFIG_DEBUG_UART_IMX=y
CONFIG_BAUDRATE=115200
CONFIG_SYS_CONSOLE_INFO_QUIET=y

# Drivers
CONFIG_DM=y
CONFIG_DM_GPIO=y
CONFIG_DM_I2C=y
CONFIG_DM_MMC=y
CONFIG_DM_PMIC=y
CONFIG_DM_REGULATOR=y
CONFIG_PHY_IMX8MQ_USB=y
CONFIG_USB_DWC3=y

# Boot 미디어
CONFIG_SUPPORT_EMMC_BOOT=y
CONFIG_MMC=y
CONFIG_FSL_USDHC=y

# Network
CONFIG_NET=y
CONFIG_DM_ETH=y
CONFIG_FEC_MXC=y
CONFIG_PHY_REALTEK=y

# Environment
CONFIG_ENV_IS_IN_MMC=y
CONFIG_SYS_MMC_ENV_DEV=0
CONFIG_SYS_MMC_ENV_PART=1
CONFIG_ENV_OFFSET=0x400000
CONFIG_ENV_SIZE=0x2000
```

`CONFIG_DEBUG_UART_*` 네 줄이 *첫 시리얼 출력*을 결정합니다. base address, clock 주파수, baud rate가 정확해야 합니다.

`CONFIG_SYS_TEXT_BASE`는 U-Boot proper가 *DDR의 어느 주소*에서 동작할지입니다. DDR 영역 안이어야 하고, *충분한 공간*이 위·아래로 있어야 합니다.

## SPL 단계 — `spl.c`

가장 어려운 코드입니다. *DDR이 아직 없는* SRAM 안에서, *console도 처음 띄우면서*, *DDR을 깨우고*, *다음 단계로 점프*합니다.

i.MX 8M Plus SPL의 *핵심 함수*만 정리하면 다음과 같습니다.

```c
/* board/acme/cam/spl.c */

#include <common.h>
#include <asm/arch/clock.h>
#include <asm/arch/sys_proto.h>
#include <asm/mach-imx/iomux-v3.h>
#include <asm/arch/imx8mp_pins.h>

extern struct dram_timing_info dram_timing;

void spl_dram_init(void)
{
    /* NXP DDR Tool 출력을 사용해 DDRC + PHY 설정 */
    ddr_init(&dram_timing);
}

static iomux_v3_cfg_t const uart_pads[] = {
    MX8MP_PAD_UART2_RXD__UART2_DCE_RX | MUX_PAD_CTRL(0x140),
    MX8MP_PAD_UART2_TXD__UART2_DCE_TX | MUX_PAD_CTRL(0x140),
};

int board_early_init_f(void)
{
    init_uart_clk(1);   /* UART2 clock enable */
    imx_iomux_v3_setup_multiple_pads(uart_pads, ARRAY_SIZE(uart_pads));
    return 0;
}

void board_init_f(ulong dummy)
{
    int ret;

    arch_cpu_init();
    init_uart_clk(1);
    board_early_init_f();

    timer_init();

    preloader_console_init();   /* 첫 printf가 동작하는 시점 */

    ret = spl_init();
    if (ret) {
        debug("spl_init() failed: %d\n", ret);
        hang();
    }

    enable_tzc380();    /* TrustZone 메모리 컨트롤러 */
    power_init_board(); /* PMIC 초기화 */

    spl_dram_init();    /* DDR 초기화 */

    board_init_r(NULL, 0);
}
```

이 흐름의 *각 단계가 살아 있는지*를 확인하면서 디버깅합니다. *어디서 멈췄는지* 알면 절반은 해결입니다.

## 첫 부팅의 디버깅 사이클 — 가장 *길고 외로운* 단계

새 보드의 BSP에서 *가장 시간이 많이 드는* 부분이 SPL부터 첫 시리얼까지입니다. 다음 순서로 점검합니다.

### 단계 1: SPL이 *실행 자체* 안 되는가

시리얼이 *아무것도* 안 나오면 SPL이 *실행 시작도 안 한 것*일 수 있습니다. BootROM이 SPL 이미지를 *못 찾았거나* 못 *적재한 것*입니다.

확인할 것:

- SD 카드의 *오프셋 1KB*에 imx8mp의 boot image가 있는가 (`dd ... seek=2 bs=512`).
- BOOT_MODE 핀의 strap이 SD를 가리키는가.
- 보드에 *전원이 정상*인가.
- 보드의 reset 핀이 안정적인가.

JTAG이 있으면 *SPL의 첫 명령어 주소(0x920000)*에 break하고 *PC가 거기 닿는지* 확인합니다.

### 단계 2: SPL이 실행은 됐는데 *시리얼 출력*이 없는가

`preloader_console_init()` 호출 *전*에 죽었거나, console 설정이 *잘못된* 것입니다.

확인할 것:

- `CONFIG_DEBUG_UART_BASE`가 회로도와 일치
- UART pad가 *board_early_init_f()*에서 설정됨
- UART parent clock이 enable됨
- USB-TTL 어댑터의 baud rate 일치

가장 빠른 진단은 *DEBUG_UART를 manual로 토글*하는 것입니다.

```c
/* SPL 초기에 강제로 'A'를 보내기 */
void board_init_f(ulong dummy) {
    /* IOMUXC 직접 set */
    writel(0x0, 0x303404f0);   /* UART2 RXD MUX_MODE = ALT0 */
    writel(0x140, 0x30340754); /* PAD_CTL */
    writel(0x0, 0x303404f4);   /* UART2 TXD MUX_MODE = ALT0 */
    writel(0x140, 0x30340758);

    /* UART 직접 send */
    writel('A', 0x30890040);   /* UART2_UTXD */
    while(1);
}
```

'A'가 *시리얼에 한 글자라도* 나오면 *시리얼 path는 살아 있는 것*입니다. 안 나오면 *pad mux 또는 baud rate*가 틀린 것입니다.

### 단계 3: 시리얼은 뜨는데 *DDR training 실패*

```text
U-Boot SPL 2024.04 (...)
DDRINFO: start DRAM init
DDR PHY training FAILED at frequency 0
```

[Ch 5](/blog/embedded/bsp/chapter05-ddr-params)에서 다룬 *DDR 디버깅 사이클*로 들어갑니다. DDR Tool 재실행, training firmware 버전 확인.

### 단계 4: DDR은 통과, U-Boot proper가 *적재 안 됨*

```text
DDRINFO: end DRAM init
Trying to boot from MMC1
SPL: failed to boot from all boot devices
```

SPL이 SD/eMMC에서 *u-boot.itb*(또는 u-boot.img)를 못 찾는 것입니다. 확인:

- u-boot.itb가 SD의 *기대 오프셋*에 있는가
- MMC 컨트롤러 핀이 설정됐는가 (SPL의 board_init_f에서)
- USDHC clock이 enable됐는가
- vmmc 전원이 PMIC에서 켜졌는가

### 단계 5: U-Boot proper가 부팅, *commands 안 되는*

```text
U-Boot 2024.04 (...)
DRAM:  2 GiB
=>
=> mmc list
(아무 응답 없음)
```

MMC driver가 probe 실패한 것입니다. `dm tree`로 driver model 트리 확인.

```text
=> dm tree
 Class     Index  Probed  Driver                Name
-----------------------------------------------------------
 root          0  [ + ]   root_driver           root_driver
 cpu           0  [   ]   imx8_cpu              cpu@0
 ...
 mmc           0  [   ]   fsl_esdhc_imx         mmc@30b40000   <-- 미probed
```

probe 실패 원인은 *clock 부재*, *regulator 부재*, *pinctrl 미설정*입니다. `dm tree -v`와 dts를 비교.

## U-Boot 환경 설정

부팅 흐름은 *환경 변수*로 정합니다. 보드 헤더에 *기본값*을 정의합니다.

```c
/* include/configs/acme_cam.h */

#define CONFIG_EXTRA_ENV_SETTINGS \
    "image=Image\0" \
    "fdt_file=acme-cam.dtb\0" \
    "loadaddr=0x40480000\0" \
    "fdt_addr=0x43000000\0" \
    "mmcdev=0\0" \
    "mmcpart=1\0" \
    "mmcroot=/dev/mmcblk0p2 rootwait rw\0" \
    "mmcargs=setenv bootargs console=ttymxc1,115200 root=${mmcroot}\0" \
    "loadimage=load mmc ${mmcdev}:${mmcpart} ${loadaddr} ${image}\0" \
    "loadfdt=load mmc ${mmcdev}:${mmcpart} ${fdt_addr} ${fdt_file}\0" \
    "mmcboot=" \
        "run loadimage; run loadfdt; run mmcargs; " \
        "booti ${loadaddr} - ${fdt_addr}\0"

#define CONFIG_BOOTCOMMAND \
    "mmc dev ${mmcdev}; " \
    "if mmc rescan; then " \
        "run mmcboot; " \
    "fi"
```

부팅 시 `CONFIG_BOOTCOMMAND`가 실행됩니다. `run mmcboot`가 *Image, dtb, bootargs를 차례로 적재해 booti*로 점프합니다.

런타임 환경 변수 변경은 다음과 같습니다.

```text
=> setenv bootdelay 3
=> setenv ipaddr 192.168.1.100
=> saveenv
Saving Environment to MMC...
Writing to MMC(0)... OK
```

`saveenv`가 변경을 eMMC의 *지정 오프셋*에 영구 기록합니다. `CONFIG_ENV_IS_IN_MMC=y` + `CONFIG_ENV_OFFSET=0x400000` 설정에 따른 위치입니다.

## TFTP로 빠른 dev cycle

개발 중에는 *SD에 매번 굽는 것이 비효율*입니다. TFTP로 *호스트에서 직접* 커널 적재합니다.

```text
=> setenv serverip 192.168.1.10
=> setenv ipaddr 192.168.1.100
=> tftp ${loadaddr} Image
Using FEC ethernet device
TFTP from server 192.168.1.10; our IP address is 192.168.1.100
Loading: #################################################  41.6 MiB
=> tftp ${fdt_addr} acme-cam.dtb
=> run mmcargs
=> booti ${loadaddr} - ${fdt_addr}
```

호스트에 dnsmasq나 tftpd-hpa를 띄우면 build 결과를 *바로 부팅*할 수 있습니다. 1초 컴파일 후 1초 부팅이 BSP 개발 속도의 핵심입니다.

## U-Boot의 첫 출력 — 표준 형태

성공적으로 동작하는 i.MX 8M Plus 보드의 첫 출력입니다.

```text
U-Boot SPL 2024.04 (May 19 2026 - 14:23:01 +0900)
DDRINFO: start DRAM init
DDRINFO: DRAM rate 4000MTS
DDRINFO:ddrphy calibration done
DDRINFO: ddrmix config done
Normal Boot
Trying to boot from MMC2

U-Boot 2024.04 (May 19 2026 - 14:23:01 +0900)

CPU:   Freescale i.MX8MP[8] rev1.1 1600 MHz (running at 1200 MHz)
CPU:   Industrial temperature grade (-40C to 105C) at 47C
Reset cause: POR
Model: ACME i.MX 8M Plus Camera Board v1
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

이 메시지의 *각 줄*이 살아 있다는 것은 BSP의 *큰 부분*이 완성됐다는 뜻입니다.

- `DDRINFO` — DDR이 깨졌습니다.
- `CPU:` — clock tree가 정상입니다.
- `Model:` — DT가 맞게 적재됐습니다.
- `MMC:` — eMMC controller가 probe됐습니다.
- `Net:` — PHY가 잡혔습니다.

이제 *커널 부팅* 단계로 갑니다.

## 자주 하는 실수

### `CONFIG_SYS_TEXT_BASE`를 *SPL 자리*와 헷갈림

`CONFIG_SYS_TEXT_BASE`는 U-Boot proper의 적재 주소(DDR 안). `CONFIG_SPL_TEXT_BASE`가 SPL의 적재 주소(SRAM 안). 둘이 바뀌면 *어디서도 동작 안 함*.

### SD 이미지의 *오프셋*을 놓침

i.MX는 boot image를 *오프셋 1KB(SD)* 또는 *오프셋 0(eMMC boot partition)*에서 찾습니다. `dd seek=2 bs=512`처럼 정확히 굽지 않으면 BootROM이 못 찾습니다.

### 시리얼 *둘 다* (UART1/UART2) 다른 것 사용

DT가 UART2를 console로 쓰는데 `CONFIG_DEBUG_UART_BASE`는 UART1을 가리킬 수 있습니다. 한쪽만 동작하는 *부분 시리얼*이 됩니다. *반드시 같은 UART*.

### `bootargs`에 *DT를 통한 console과 다른* console 명시

`console=ttymxc0`이지만 실제 UART2가 console이면, 커널이 *다른 UART에 메시지를 보냅니다*. 커널 메시지가 안 보이는 이유 1순위.

### `saveenv`를 안 함

환경 변수를 setenv로 바꾼 후 saveenv 안 하면 *재부팅 시 사라집니다*. 개발 중에 환경을 자주 잃으면 saveenv 누락입니다.

### Ethernet PHY MDIO 주소 잘못

DT에서 `phy-handle = <&ethphy0>`로 가리키는 PHY의 *MDIO 주소*(reg)가 실제 보드의 strap과 다르면 link가 안 잡힙니다. `mii info` 명령으로 확인.

```text
=> mii info
PHY 0x01: OUI = 0x001CC8, Model = 0x05, Rev = 0x01,  100baseT,  FDX
```

## 정리

- BSP에서의 U-Boot 포팅은 *시리얼 첫 한 줄*에 도달하기까지가 핵심입니다.
- 가장 비슷한 vendor reference 보드를 *통째로 복사*해서 시작합니다. board 디렉터리·defconfig·dts 6개 파일을 만듭니다.
- defconfig의 `CONFIG_DEBUG_UART_*` 네 줄이 첫 시리얼 출력을 결정합니다. base, clock, baud rate가 정확해야 합니다.
- SPL은 *DDR 없는 SRAM 안*에서 동작합니다. *console init → DDR init → 다음 단계 적재*의 흐름입니다.
- 첫 부팅 디버깅 사이클은 *5단계*입니다. SPL 실행 → 시리얼 출력 → DDR training → U-Boot proper 적재 → driver probe.
- 환경 변수는 `CONFIG_EXTRA_ENV_SETTINGS`에 기본을 정의하고, `setenv` + `saveenv`로 영구 변경합니다.
- 개발 중에는 *TFTP*로 SD 굽는 시간을 절약합니다. dnsmasq 또는 tftpd-hpa로 호스트에 서버 설치.
- 첫 출력의 `DDRINFO`, `CPU:`, `Model:`, `MMC:`, `Net:`이 *모두 나오면* BSP의 큰 부분이 완성된 것입니다.

## 다음 편

[Ch 7 — TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)에서는 ARMv8 보드에 *반드시* 들어가는 ARM Trusted Firmware-A를 BSP에 통합하고, U-Boot이 BL33으로 동작하는 구조를 다룹니다.

## 관련 항목

- [Ch 4: Pin Mux와 Clock](/blog/embedded/bsp/chapter04-pinmux-clock)
- [Ch 5: DDR 매개변수](/blog/embedded/bsp/chapter05-ddr-params)
- [Ch 7: TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Buildroot Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — U-Boot 공식 사이트](https://www.denx.de/wiki/U-Boot)
- [원문 — U-Boot README (메인라인)](https://source.denx.de/u-boot/u-boot/-/blob/master/README)
- [원문 — U-Boot Driver Model](https://u-boot.readthedocs.io/en/latest/develop/driver-model/index.html)
