---
title: "Linux 커널 BSP 설정 — defconfig·Kconfig·DT 통합"
date: 2026-05-18T09:08:00
description: "BSP에서 커널을 빌드합니다. defconfig 선택과 커스터마이즈, DT 통합, 모듈 vs 빌트인 결정을 정리합니다."
series: "BSP Development"
seriesOrder: 8
tags: [embedded, bsp, linux-kernel, defconfig]
draft: false
---

## 한 줄 요약

**커널 설정은 "어떤 드라이버를 넣을지"가 아니라 "언제 로드할지"를 결정하는 작업입니다.** 빌트인은 부팅 경로에 필요하고, 모듈은 필요할 때 불러옵니다. 그 경계가 BSP의 첫 정체성입니다.

부트로더가 끝나면 커널이 자기 자신을 푸는 작업부터 시작합니다. 이때 사용 가능한 디스크도, RAM도, 콘솔도 모두 *커널 빌드 당시*의 설정에 의해 결정됩니다. 빌드 시점에 잘못된 결정을 하면 부팅 후 어떤 명령으로도 복구할 수 없습니다. 그래서 BSP에서 가장 먼저 마주하는 회의는 "어떤 옵션을 빌트인하고, 어떤 옵션을 모듈로 미루는가"입니다.

## defconfig — 보드별 기본 설정

`arch/<arch>/configs/<board>_defconfig`가 시작점입니다. mainline 커널이라면 `bcm2711_defconfig`(라즈베리파이 4), `imx_v8_defconfig`(NXP i.MX8M), `defconfig`(arm64 일반)를 그대로 쓰는 것이 1순위 선택입니다. vendor 커널이라면 vendor가 제공한 defconfig를 받아서 시작합니다.

```bash
# arm64 라즈베리파이 4
export ARCH=arm64
export CROSS_COMPILE=aarch64-linux-gnu-

make bcm2711_defconfig
make -j$(nproc) Image dtbs modules
```

`Image`는 압축 안 한 ELF가 아닌 raw 커널, `Image.gz`는 gzip 압축본, `zImage`는 32-bit ARM의 self-decompressing 커널입니다. arm64는 `Image` 또는 `Image.gz`를 씁니다. U-Boot가 압축을 풀 수 있는 환경이라면 `Image.gz`가 SD 카드 공간을 아낄 수 있습니다.

### 자주 쓰는 defconfig

| 보드 | defconfig | 비고 |
|------|-----------|------|
| Raspberry Pi 4 | `bcm2711_defconfig` | 64-bit, mainline 지원 우수 |
| Raspberry Pi 3 | `bcm2835_defconfig` | 32-bit 호환도 가능 |
| i.MX8M Mini/Plus | `imx_v8_defconfig` | NXP 보드 통합 |
| Rockchip RK3588 | `defconfig` (arm64) | rockchip platform 옵션 활성 |
| TI AM62x | `defconfig` (arm64) | TI 플랫폼 |
| STM32MP1 | `multi_v7_defconfig` | 32-bit ARM |

## menuconfig — 트리 탐색

defconfig를 시작점으로 두고 `menuconfig`로 옵션을 살펴봅니다. ncurses 기반 UI이며, `/` 키로 옵션을 검색할 수 있습니다.

```bash
make menuconfig
```

자주 켜고 끄는 옵션들을 분류해 보면 다음과 같습니다.

| 영역 | 옵션 | 의미 |
|------|------|------|
| Preemption | `CONFIG_PREEMPT_NONE` | 서버 워크로드. throughput 우선 |
| Preemption | `CONFIG_PREEMPT_VOLUNTARY` | 일반 데스크탑 |
| Preemption | `CONFIG_PREEMPT` | 일반 임베디드. 인터랙티브 |
| Preemption | `CONFIG_PREEMPT_RT` | 실시간. PREEMPT_RT 패치 필요 |
| Timer | `CONFIG_HZ_100` / `CONFIG_HZ_250` / `CONFIG_HZ_1000` | 스케줄러 tick 주파수 |
| Tickless | `CONFIG_NO_HZ_IDLE` / `CONFIG_NO_HZ_FULL` | idle/실행 중 tick 정지 |
| DT | `CONFIG_OF` / `CONFIG_OF_OVERLAY` | Device Tree 지원, overlay |
| Debug | `CONFIG_DEBUG_FS` | `/sys/kernel/debug/` 마운트 가능 |
| Debug | `CONFIG_DEBUG_INFO` | DWARF 디버그 정보 (gdb·perf) |
| Debug | `CONFIG_MAGIC_SYSRQ` | 시리얼에서 강제 sysrq |
| Tracing | `CONFIG_FTRACE` / `CONFIG_FUNCTION_TRACER` | ftrace 활성 |
| Modules | `CONFIG_MODULES` / `CONFIG_MODULE_UNLOAD` | LKM 빌드와 unload |
| initramfs | `CONFIG_BLK_DEV_INITRD` | initrd/initramfs |

`CONFIG_HZ`는 임베디드 보드 RTOS-like 응답이 필요하면 1000으로, 배터리 친화적이라면 100으로 둡니다. `CONFIG_PREEMPT`는 인터랙티브 응답이 필요하면 활성화합니다.

## 빌트인(`=y`) vs 모듈(`=m`)

이 결정이 BSP의 색을 정합니다.

| 값 | 의미 |
|---|---|
| `y` (built-in) | `vmlinux`/`Image` 안에 포함. 부팅 즉시 가능 |
| `m` (module) | `.ko` 파일. rootfs에서 `modprobe`로 로드 |
| `n` (disabled) | 빌드 안 함 |

기준은 명확합니다.

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
- GPU (DRM/KMS는 빌트인이 흔하지만 vendor blob은 모듈)
- 비디오 코덱 (V4L2)
- 카메라 sensor 드라이버

**빌트인 vs 모듈 — 케이스 바이 케이스**

- 이더넷 — NFS root면 빌트인, 일반 부팅이면 모듈
- I2C 컨트롤러 — EEPROM이 부팅 직후 필요하면 빌트인
- SPI flash — 부팅 후 환경설정 읽으면 빌트인

`Image`가 작아야 할 이유가 있다면 (eMMC partition 크기, NOR flash 등) 모듈로 미루는 옵션이 유리합니다. 반대로 부팅 속도가 중요한 자동차 ECU, 가전 등에서는 빌트인이 모듈 로드 비용을 절약합니다.

## savedefconfig — 변경사항 저장

`menuconfig`로 설정을 바꾸면 `.config`가 생성됩니다. 이를 그대로 vendor 트리에 커밋하면 안 됩니다. `.config`는 수천 줄이고, 대부분이 *기본값과 같은* 항목입니다. 그래서 `savedefconfig`가 *최소 차이*만 추출합니다. 다음 그림은 이 설정 흐름을 보여줍니다.

![커널 설정 흐름 — defconfig에서 menuconfig를 거쳐 savedefconfig까지](/images/blog/bsp/diagrams/ch08-kernel-config-flow.svg)

```bash
make savedefconfig
cp defconfig arch/arm64/configs/myboard_defconfig

git diff arch/arm64/configs/myboard_defconfig
# 변경된 항목만 보임
```

`savedefconfig`의 출력은 입력 `.config`와 *의미적으로 동일*합니다. 다만 표현이 짧을 뿐입니다. 새 보드를 추가할 때는 vendor 가까운 보드의 defconfig를 복사해서 시작합니다.

### defconfig 비교와 merge 예시

기존 defconfig에서 변경된 옵션만 확인하는 방법입니다.

```bash
# 현재 .config와 원본 defconfig 비교
make savedefconfig
diff -u arch/arm64/configs/imx_v8_defconfig defconfig

# 변경 사항만 추출
scripts/diffconfig arch/arm64/configs/imx_v8_defconfig .config
# 출력 예시:
# +CONFIG_LOCALVERSION="-myboard"
# -CONFIG_USB_XHCI_HCD=m
# +CONFIG_USB_XHCI_HCD=y
```

merge_config.sh는 여러 config fragment를 합칩니다. BSP별 옵션을 fragment로 관리할 때 유용합니다.

```bash
# 기본 defconfig + BSP 오버레이 + 디버그 옵션
./scripts/kconfig/merge_config.sh \
    arch/arm64/configs/defconfig \
    myboard.config \
    debug.config

# myboard.config 내용 예시
CONFIG_LOCALVERSION="-myboard"
CONFIG_USB_XHCI_HCD=y
CONFIG_SPI_IMX=y
```

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

`depends on`은 *나도 따라가는* 의존성이고, `select`는 *남을 끌고 가는* 의존성입니다. `select`는 강력하지만 cyclic 위험이 있어 신중히 씁니다.

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

빌드된 DTB는 `arch/arm64/boot/dts/freescale/imx8mm-myboard.dtb`에 생깁니다. U-Boot가 이를 `bootm <kernel> - <dtb>` 형식으로 커널에 넘깁니다.

### DT overlay

런타임에 DT를 패치하고 싶다면 overlay를 씁니다. 같은 보드에서 카메라 모듈, 디스플레이 모듈을 끼고 빼는 시나리오에 적합합니다.

```bash
make broadcom/overlays/imx219.dtbo
```

`/boot/overlays/`에 두고 `config.txt`(라즈베리파이) 또는 `extlinux.conf`에서 활성화합니다.

## vendor 커널 vs mainline 커널

BSP 초기에 마주하는 큰 결정입니다.

| 항목 | vendor 커널 | mainline 커널 |
|------|-------------|---------------|
| 드라이버 완성도 | 높음 (vendor blob 포함) | 보드별 격차 큼 |
| 보안 업데이트 | vendor 의존 | LTS 채널 |
| 새 기능 | 느림 | 빠름 |
| 커뮤니티 | 좁음 | 넓음 |
| 라이선스 위험 | proprietary 혼재 가능 | GPL 명확 |
| 장기 유지 비용 | vendor가 떠나면 부담 | 자체 흡수 가능 |

신생 SoC라면 vendor 커널에서 출발해 *upstream 패치를 따라가는* 전략이 보통입니다. 성숙한 SoC(BCM2711, i.MX8M, RK3588)는 mainline이 충분히 커버합니다.

## 빌드 산출물

빌드가 끝나면 다음이 생깁니다.

```text
arch/arm64/boot/Image           # 압축 안 한 raw 커널
arch/arm64/boot/Image.gz        # gzip 압축
arch/arm64/boot/dts/.../<>.dtb  # 빌드된 DTB
*.ko                            # 외부 트리에 흩어진 모듈
System.map                      # 심볼 ↔ 주소
vmlinux                         # ELF (gdb·perf용)
```

`vmlinux`는 SD 카드에 안 올립니다. 디버깅에 쓸 ELF입니다. 실제 부팅에는 `Image` 또는 `Image.gz`와 `*.dtb`만 필요합니다.

```bash
make INSTALL_MOD_PATH=/tmp/rootfs modules_install
# /tmp/rootfs/lib/modules/<version>/ 에 .ko 설치
```

## 흔한 실수

- **모듈로 둔 MMC 드라이버**: `rootwait`로 기다려도 모듈이 로드 안 됐으니 영원히 못 마운트합니다. 빌트인이 정답입니다.
- **`CONFIG_DEBUG_FS=n`으로 빌드한 양산 커널**: 필드 디버깅에서 `/sys/kernel/debug/`가 없어 ftrace·gpio dump·clk tree를 못 봅니다. 양산에서도 켜 두는 편이 안전합니다.
- **`CONFIG_MAGIC_SYSRQ=n`**: 시스템이 hang했을 때 시리얼로 `echo b > /proc/sysrq-trigger`를 못 씁니다. 필드 trouble shooting이 어려워집니다.
- **`CONFIG_PRINTK_TIME=n`**: dmesg에 timestamp가 없어 boot 단계별 지연을 분석 못 합니다.
- **defconfig를 직접 편집**: 사람이 `.config` 형식을 직접 쓰면 충돌·누락이 생깁니다. 항상 `menuconfig` → `savedefconfig` 사이클을 씁니다.

## 정리

- `arch/<arch>/configs/<board>_defconfig`가 BSP 커널 설정의 진입점입니다.
- `ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu-` 환경 변수로 cross compile합니다.
- 빌트인은 *부팅에 필요한* 드라이버에만, 모듈은 나중에 로드해도 되는 것에만 씁니다.
- `CONFIG_PREEMPT`, `CONFIG_HZ`, `CONFIG_DEBUG_FS`, `CONFIG_MAGIC_SYSRQ`는 응답성·디버깅에 큰 영향을 줍니다.
- `menuconfig` 후에는 반드시 `savedefconfig`로 최소 diff를 만들어 커밋합니다.
- Kconfig의 `depends on`은 따라가는 의존성, `select`는 끌고 가는 의존성입니다.
- DTB는 `make dtbs`로 빌드하고 보드 `Makefile`에 `dtb-y +=`로 등록합니다.
- vendor 커널은 빠른 양산, mainline 커널은 장기 유지에 유리합니다.

## 다음 편 예고

[Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup)에서는 boot CPU 외의 나머지 코어를 어떻게 깨우는지, PSCI와 spin-table의 차이가 무엇인지 살펴봅니다.

## 관련 항목

- [Ch 7: Device Tree 작성](/blog/embedded/bsp/chapter07-device-tree)
- [Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup)
- [Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)
- [Buildroot로 첫 이미지 만들기](/blog/embedded/buildroot/) — 커널과 rootfs 통합
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/) — `CONFIG_PREEMPT`·`HZ` 선택의 성능 영향
