---
title: "Linux 커널 BSP 설정 — defconfig·Kconfig·DT 통합"
slug: "embedded/bsp/chapter08-kernel-config"
date: 2026-05-18T09:08:00
description: "BSP에서 커널을 빌드합니다. defconfig 선택과 커스터마이즈, DT 통합, 모듈 vs 빌트인 결정을 정리합니다."
series: "BSP Development"
seriesOrder: 8
tags: [embedded, bsp, linux-kernel, defconfig]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**커널 설정은 어떤 기능을 포함하고, 무엇을 built-in 또는 module로 제공할지 정하는 작업입니다.** 빌트인은 부팅 경로에 필요하고, 모듈은 필요할 때 불러옵니다. 그 경계가 BSP의 첫 정체성입니다.

부트로더가 커널로 넘어간 순간, 커널이 쓸 수 있는 드라이버는 *빌드 당시* 넣어 둔 것뿐입니다. root 파일시스템을 마운트하기 전에는 모듈을 읽어 올 곳이 없으므로, 그 전에 필요한 드라이버는 이미지 안에 있어야 합니다. 그래서 BSP에서 가장 먼저 정하는 것이 "무엇을 빌트인하고, 무엇을 모듈로 미루는가"입니다.

이 장의 명령과 출력은 kernel.org의 linux-6.12 tarball(sha256 확인)을 Debian 13 arm64 guest(4 vCPU)에서 네이티브로 설정·빌드한 결과입니다.

## defconfig — 보드별 기본 설정

`arch/<arch>/configs/` 아래의 defconfig이 시작점입니다. 먼저 어떤 defconfig이 어느 트리에 있는지부터 확인해야 합니다. linux-6.12의 arm64에는 보드별 defconfig이 없습니다.

```text
$ ls linux-6.12/arch/arm64/configs/
defconfig
hardening.config
virt.config
```

arm64 메인라인은 `defconfig` 하나에 모든 SoC를 담는 방식이고, i.MX 8M도 여기서 `CONFIG_ARCH_MXC=y`로 켜집니다. 흔히 보이는 `imx_v8_defconfig`나 `bcm2711_defconfig`는 vendor 트리의 파일입니다. GitHub의 `nxp-imx/linux-imx`(`lf-6.6.y` 브랜치)에는 `arch/arm64/configs/imx_v8_defconfig`가, `raspberrypi/linux`(`rpi-6.12.y`)에는 `bcm2711_defconfig`가 있습니다. 32-bit ARM은 사정이 달라서, linux-6.12 `arch/arm/configs/`에 `omap2plus_defconfig`(BeagleBone Black의 AM335x), `imx_v6_v7_defconfig`, `multi_v7_defconfig`, `stm32_defconfig`, `bcm2835_defconfig`가 있습니다.

arm64 `defconfig`을 적용하고 빌드한 명령입니다(arm64 guest라 `CROSS_COMPILE`이 없습니다).

```bash
make defconfig
make -j4 Image Image.gz modules dtbs
```

결과 `.config`는 11,168줄이었고, `=y`가 3,168개, `=m`이 1,167개였습니다. 빌드는 `real 18m48.218s`가 걸렸습니다(같은 guest에서 다른 작업을 함께 돌린 상태였습니다).

`Image`는 비압축 커널, `Image.gz`는 그 gzip 압축본입니다. `Documentation/arch/arm64/booting.rst:63-65`는 "The AArch64 kernel does not currently provide a decompressor"라고 적습니다. 즉 `Image.gz`를 쓰면 압축을 푸는 일은 부트로더 몫입니다. 32-bit ARM의 `zImage`는 스스로 압축을 푸는 이미지입니다.

## menuconfig — 트리 탐색

defconfig를 시작점으로 두고 `menuconfig`로 옵션을 살펴봅니다. ncurses 기반 UI이며, `/` 키로 옵션을 검색할 수 있습니다.

```bash
make menuconfig
```

자주 켜고 끄는 옵션들을 분류해 보면 다음과 같습니다.

| 영역 | 옵션 | 의미 |
|------|------|------|
| Preemption | `CONFIG_PREEMPT_NONE` | Kconfig 제목 "No Forced Preemption (Server)" |
| Preemption | `CONFIG_PREEMPT_VOLUNTARY` | "Voluntary Kernel Preemption (Desktop)" |
| Preemption | `CONFIG_PREEMPT` | "Preemptible Kernel (Low-Latency Desktop)", help는 "desktop or embedded system with latency requirements in the milliseconds range" |
| Preemption | `CONFIG_PREEMPT_RT` | 실시간. 6.12부터 메인라인 Kconfig에 있음 |
| Timer | `CONFIG_HZ_100` / `CONFIG_HZ_250` / `CONFIG_HZ_1000` | 스케줄러 tick 주파수 |
| Tickless | `CONFIG_NO_HZ_IDLE` / `CONFIG_NO_HZ_FULL` | idle/실행 중 tick 정지 |
| DT | `CONFIG_OF` / `CONFIG_OF_OVERLAY` | Device Tree 지원, overlay |
| Debug | `CONFIG_DEBUG_FS` | `/sys/kernel/debug/` 마운트 가능 |
| Debug | `CONFIG_DEBUG_INFO` | DWARF 디버그 정보 (gdb·perf) |
| Debug | `CONFIG_MAGIC_SYSRQ` | kernel SysRq 기능; 입력 경로와 허용 mask는 별도 설정 |
| Tracing | `CONFIG_FTRACE` / `CONFIG_FUNCTION_TRACER` | ftrace 활성 |
| Modules | `CONFIG_MODULES` / `CONFIG_MODULE_UNLOAD` | LKM 빌드와 unload |
| initramfs | `CONFIG_BLK_DEV_INITRD` | initrd/initramfs |

linux-6.12 arm64 `defconfig`의 실제 값은 `CONFIG_PREEMPT=y`, `CONFIG_HZ_250=y`(`CONFIG_HZ=250`), `CONFIG_NO_HZ_IDLE=y`, `CONFIG_DEBUG_FS=y`, `CONFIG_DEBUG_INFO=y`, `CONFIG_MAGIC_SYSRQ=y`, `CONFIG_PRINTK_TIME=y`이고 `CONFIG_OF_OVERLAY`는 꺼져 있습니다. `PREEMPT_RT`는 `kernel/Kconfig.preempt:70-73`에 `depends on EXPERT && ARCH_SUPPORTS_RT`로 들어 있고, arm64는 `arch/arm64/Kconfig:105`에서 `ARCH_SUPPORTS_RT`를 select합니다. 별도 패치 없이 고를 수 있습니다.

## 빌트인(`=y`) vs 모듈(`=m`)

비유하면 빌트인은 차에 기본으로 달린 장비, 모듈은 트렁크에 실은 공구입니다. 트렁크(rootfs)를 열기 전에는 공구를 꺼낼 수 없습니다.

| 값 | 의미 |
|---|---|
| `y` (built-in) | `vmlinux`/`Image` 안에 포함. 부팅 즉시 가능 |
| `m` (module) | `.ko` 파일. rootfs에서 `modprobe`로 로드 |
| `n` (disabled) | 빌드 안 함 |

기준은 "rootfs를 마운트하기 전에 필요한가"입니다. arm64 `defconfig`이 이 기준대로 되어 있는지 위 `.config`에서 보면, i.MX의 콘솔 `CONFIG_SERIAL_IMX=y`, PL011 `CONFIG_SERIAL_AMBA_PL011=y`, SD/eMMC `CONFIG_MMC_SDHCI=y`·`CONFIG_MMC_SDHCI_ESDHC_IMX=y`, `CONFIG_EXT4_FS=y`가 모두 빌트인입니다.

**빌트인이 옳은 것**

- 부트 콘솔 드라이버 (8250, imx-uart, pl011)
- rootfs를 마운트하는 스토리지 드라이버 (mmc, ufs, scsi, nvme)
- rootfs 파일시스템 (ext4, squashfs, f2fs)
- 부트 클럭, 부트 power 도메인
- pinctrl, gpio, regulator의 핵심 드라이버
- IOMMU (DMA 보안 요구 시)
- 핵심 네트워크 (root over NFS일 경우)

**모듈이 옳은 것**

- USB 호스트, USB 디바이스 (필요시 로드)
- 사운드 (ALSA SoC 드라이버)
- WiFi, Bluetooth (firmware도 같이)
- GPU (DRM/KMS)
- 비디오 코덱 (V4L2)
- 카메라 sensor 드라이버

**빌트인 vs 모듈 — 케이스 바이 케이스**

- 이더넷 — NFS root면 빌트인, 일반 부팅이면 모듈
- I2C 컨트롤러 — EEPROM이 부팅 직후 필요하면 빌트인
- SPI flash — 부팅 후 환경설정 읽으면 빌트인

크기도 기준입니다. 위 빌드에서 arm64 `defconfig` 하나가 만든 산출물은 다음과 같습니다.

| 산출물 | 크기·개수 |
|--------|----------|
| `arch/arm64/boot/Image` | 38,246,912바이트 |
| `arch/arm64/boot/Image.gz` | 13,874,511바이트 |
| `vmlinux` (디버그 정보 포함 ELF) | 153,683,816바이트 |
| `*.ko` | 1,309개 |
| `*.dtb` | 1,191개 (그중 `imx8mp*` 36개) |

모든 SoC를 담은 defconfig이라 `Image`가 36 MiB를 넘습니다. 보드 하나만 지원하는 제품이라면 다른 SoC를 끄고 `Image`를 줄입니다. 부팅 시간에 미치는 영향은 Ch 15에서 측정합니다.

## savedefconfig — 변경사항 저장

`.config`는 위처럼 11,168줄이고, 그중 Kconfig 기본값과 다른 항목만 `savedefconfig`가 추출합니다. 아래에서 보듯 그 결과는 1,685줄이었습니다. 다음 그림은 이 설정 흐름을 보여줍니다.

![커널 설정 흐름 — defconfig에서 menuconfig를 거쳐 savedefconfig까지](/images/blog/bsp/diagrams/ch08-kernel-config-flow.svg)

```bash
make savedefconfig
cp defconfig arch/arm64/configs/myboard_defconfig

git diff arch/arm64/configs/myboard_defconfig
# 변경된 항목만 보임
```

linux-6.12에서 `make defconfig` 직후 `make savedefconfig`를 돌리면, 결과는 in-tree `arch/arm64/configs/defconfig`과 같지 않습니다.

```text
$ wc -l arch/arm64/configs/defconfig defconfig .config
  1726 arch/arm64/configs/defconfig
  1685 defconfig
 11168 .config
```

in-tree 파일에는 이미 기본값이 된 항목(예: `CONFIG_COMMON_CLK_MT8192_*=y` 여러 줄)과 순서가 다른 줄이 남아 있어서, `diff`로 비교하면 in-tree 쪽 줄 55개와 savedefconfig 쪽 줄 14개가 달랐습니다. savedefconfig 결과는 그 커널 revision의 Kconfig 기본값에 대한 차이이므로, 커널을 올리면 다시 `olddefconfig` 후 비교합니다.

### defconfig 비교와 merge 예시

기존 defconfig에서 변경된 옵션만 확인하는 방법입니다.

`merge_config.sh`는 config fragment를 합치고, `scripts/diffconfig`는 두 `.config`의 차이를 보여 줍니다. 세 줄짜리 fragment로 해 본 결과입니다.

```text
$ cat myboard.config
CONFIG_LOCALVERSION="-myboard"
CONFIG_USB_XHCI_HCD=y
CONFIG_SPI_IMX=y
$ grep -E "^CONFIG_(LOCALVERSION|USB_XHCI_HCD|SPI_IMX)=" .config
CONFIG_LOCALVERSION=""
CONFIG_SPI_IMX=m
CONFIG_USB_XHCI_HCD=y
$ cp .config kcfg.before
$ ./scripts/kconfig/merge_config.sh -m .config myboard.config
...
Previous value: CONFIG_SPI_IMX=m
New value: CONFIG_SPI_IMX=y
...
$ make olddefconfig
$ ./scripts/diffconfig kcfg.before .config
 LOCALVERSION "" -> "-myboard"
 SPI_IMX m -> y
```

`CONFIG_USB_XHCI_HCD`는 `defconfig`에서 이미 `y`라 차이에 나오지 않습니다. fragment를 만들기 전에 base config의 값을 먼저 확인해야 하는 이유입니다. `-m`은 fragment를 합치기만 하고 `make olddefconfig`는 직접 돌리라는 옵션이라, 의존성 해석은 그 다음 줄에서 일어납니다.

## Kconfig 의존성

새 옵션을 추가하면 `Kconfig` 파일을 손봐야 합니다. 의존성과 선택 관계의 기본 syntax는 짧지만 자주 헷갈립니다.

```text
config MYBOARD_LED
    tristate "MyBoard LED driver"
    depends on GPIOLIB && OF
    select LEDS_CLASS
    default n
    help
      Enable LED control for MyBoard.

config MYBOARD_AUDIO
    bool "MyBoard audio codec"
    depends on SND_SOC && I2C
    select SND_SOC_GENERIC_DMAENGINE_PCM
```

| 키워드 | 의미 |
|--------|------|
| `tristate` | `y`/`m`/`n` 가능 |
| `bool` | `y`/`n`만 가능 |
| `depends on` | 이 조건을 만족해야 옵션이 보임 |
| `select` | 강제로 켬 (의존하지 않고 켬) |
| `imply` | 권장하지만 강제 안 함 |
| `default` | 기본값 |

`depends on`은 *나도 따라가는* 의존성이고, `select`는 *남을 끌고 가는* 의존성입니다. `Documentation/kbuild/kconfig-language.rst:137-155`는 `select`가 "will force a symbol to a value without visiting the dependencies"라고 경고합니다. 위 예에서 `MYBOARD_AUDIO`가 `select SND_SOC_GENERIC_DMAENGINE_PCM`을 하면 그 심볼의 `depends on`이 만족되지 않아도 켜집니다. 그래서 같은 문서는 `select`를 prompt가 없고 의존성도 없는 심볼에만 쓰라고 권합니다. `imply`는 같은 문서 163행의 "weak reverse dependencies"로, 기본값만 올리고 사용자가 끌 수 있습니다.

## DT 통합 — DTB 빌드

커널 빌드는 `arch/<arch>/boot/dts/<vendor>/<board>.dts`도 함께 컴파일합니다.

```bash
make dtbs                              # 모든 DTB
make freescale/imx8mm-myboard.dtb      # 단일 DTB
```

`Makefile`에 새 보드를 등록합니다.

```make
# arch/arm64/boot/dts/freescale/Makefile
dtb-$(CONFIG_ARCH_MXC) += imx8mm-myboard.dtb
```

EVK도 같은 줄로 등록되어 있습니다(`freescale/Makefile:172`, `dtb-$(CONFIG_ARCH_MXC) += imx8mp-evk.dtb`). 빌드된 DTB는 소스와 같은 디렉터리에 생기고, U-Boot는 arm64 `Image`를 `booti <kernel> - <dtb>`로 부팅합니다(Ch 6).

### DT overlay

overlay(`.dtso`)도 `make dtbs`가 함께 빌드합니다. base와 overlay를 합친 DTB를 Makefile에서 만드는 방법(`-dtbs :=`)과 적용 시점은 Ch 3에서 실제로 해 봤습니다. arm64 `defconfig`은 `CONFIG_OF_OVERLAY`를 켜지 않으므로 커널 런타임 overlay는 기본으로 없습니다.

## vendor 커널 vs mainline 커널

BSP 초기에 마주하는 큰 결정입니다. 이 시리즈의 두 보드가 반대 선택의 예입니다. Buildroot의 BeagleBone Black defconfig은 메인라인에 `am335x-boneblack.dts`가 있는데도 BeagleBoard 재단의 vendor 트리 `6.1.46-ti-r13`을 받아 씁니다(Ch 1). 반면 i.MX 8M Plus EVK는 메인라인 linux-6.12의 `defconfig`과 `imx8mp-evk.dts`로 빌드됩니다. 어느 쪽이 맞는지는 요구 장치마다 메인라인 드라이버와 binding이 있는지를 표로 만들어 정합니다(Ch 1, Ch 12).

## 빌드 산출물

빌드가 끝나면 다음이 생깁니다.

| 산출물 | 설명 |
|--------|------|
| `arch/arm64/boot/Image` | 압축 안 한 커널 |
| `arch/arm64/boot/Image.gz` | gzip 압축 |
| `arch/arm64/boot/dts/<vendor>/*.dtb` | 빌드된 DTB |
| `*.ko` | 소스 트리 곳곳에 생긴 모듈 |
| `System.map` | 심볼과 주소의 대응표 |
| `vmlinux` | ELF (gdb·addr2line용) |

`vmlinux`(위 빌드에서 147 MiB)는 보드에 올리지 않고 디버깅에 씁니다. Ch 11에서 이 파일로 panic 주소를 함수 이름으로 바꿉니다.

```bash
make INSTALL_MOD_PATH=/tmp/rootfs modules_install
# /tmp/rootfs/lib/modules/<version>/ 에 .ko 설치
```

## 흔한 실수

- **모듈로 둔 MMC 드라이버**: initramfs 없이 rootfs가 eMMC에 있다면, `rootwait`는 "Wait (indefinitely) for root device to show up"(`Documentation/admin-guide/kernel-parameters.txt:5907`)이라 영원히 기다립니다. 모듈을 읽을 rootfs가 없으니 장치가 나타나지 않습니다.
- **`CONFIG_DEBUG_FS=n`으로 빌드한 양산 커널**: Ch 4·12·13에서 쓴 `clk_summary`, `regulator_summary`, `devices_deferred`, `wakeup_sources`가 모두 debugfs 파일입니다. 양산에서 끌지는 보안 정책으로 정합니다.
- **`CONFIG_PRINTK_TIME=n`**: dmesg에 timestamp가 없어 boot 단계별 지연을 볼 수 없습니다. Ch 15의 측정이 이 timestamp에 기댑니다.
- **fragment를 base 확인 없이 작성**: 위 `CONFIG_USB_XHCI_HCD=y`처럼 이미 같은 값이면 fragment가 아무 일도 하지 않습니다. `diffconfig`로 실제 바뀐 것만 확인합니다.

## 정리

- linux-6.12의 arm64 defconfig은 `defconfig` 하나입니다. `imx_v8_defconfig`, `bcm2711_defconfig`는 vendor 트리에 있습니다.
- arm64 `defconfig` 빌드는 `Image` 38,246,912바이트, 모듈 1,309개, DTB 1,191개를 만들었습니다.
- 빌트인은 *부팅에 필요한* 드라이버에만, 모듈은 나중에 로드해도 되는 것에만 씁니다.
- 6.12에서는 `PREEMPT_RT`가 메인라인 Kconfig 옵션입니다.
- `savedefconfig` 결과(1,685줄)는 in-tree defconfig(1,726줄)과 달랐으므로, 같은 revision에서 `merge_config.sh` + `diffconfig`로 차이를 관리합니다.
- Kconfig의 `depends on`은 따라가는 의존성, `select`는 끌고 가는 의존성입니다.
- DTB는 `make dtbs`로 빌드하고 vendor 디렉터리 `Makefile`에 `dtb-$(CONFIG_ARCH_MXC) +=` 형태로 등록합니다.
- vendor 커널과 메인라인의 선택은 요구 장치별 지원 표로 정합니다. BeagleBone Black(Buildroot)은 vendor, i.MX 8M Plus EVK는 메인라인으로 빌드됩니다.

## 다음 편 예고

[Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup)에서는 boot CPU 외의 나머지 코어를 어떻게 깨우는지, PSCI와 spin-table의 차이가 무엇인지 살펴봅니다.

## 관련 항목

- [Ch 7: Device Tree 작성](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup)
- [Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)
- [Buildroot로 첫 이미지 만들기](/blog/embedded/buildroot/chapter01-problem) — 커널과 rootfs 통합
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface) — `CONFIG_PREEMPT`·`HZ` 선택의 성능 영향
