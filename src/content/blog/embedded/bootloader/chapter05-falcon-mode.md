---
title: "U-Boot Falcon Mode — SPL이 U-Boot Proper 없이 커널 직접 부팅"
date: 2026-05-09T09:05:00
description: "U-Boot Falcon Mode — SPL이 U-Boot Proper를 건너뛰고 커널을 직접 부트. 부트 시간 단축의 핵심."
series: "Bootloader Internals"
seriesOrder: 5
tags: [embedded, bootloader, u-boot, falcon, boot-time]
draft: false
---

## 한 줄 요약

> **"Falcon Mode는 SPL이 U-Boot Proper를 건너뛰고 *커널을 직접 부팅*하는 옵션입니다."** — U-Boot Proper에서 *1초가 사라집니다*. 양산용으로는 매력적이지만 *명령 인터페이스가 없어* 개발에는 불편합니다. *양산과 개발을 한 빌드*로 공존시키는 것이 일반적입니다.

자동차 후방 카메라는 *2초 안에* 화면이 떠야 합니다. 산업 HMI는 *1초 안에* user space가 동작해야 합니다. 일반 부트 흐름에서 *U-Boot Proper의 driver probe + 명령 인터프리터 초기화*에 *1초 가까이* 듭니다. Falcon Mode는 *그 1초를 통째로 절약*합니다.

## 일반 흐름과 Falcon 흐름

| 단계 | 일반 흐름 | Falcon 흐름 |
|------|-----------|-------------|
| BootROM | 0 ms | 0 ms |
| SPL | 100 ms (DDR init 80 ms) | **150 ms (DDR init + 커널 적재)** |
| U-Boot Proper | 400~1000 ms — driver probe, env, autoboot delay, bootcmd | *생략* |
| Linux Kernel | 부트 시작 | 부트 시작 |

차이는 *수백 ms* — U-Boot Proper 단계가 완전히 사라진다.

U-Boot Proper 단계가 *완전히 사라집니다*. 차이는 *수백 ms* 입니다.

## "Falcon"의 이름

이름의 유래는 *매(falcon)처럼 빠르게* 강하한다는 것입니다. SPL이 *U-Boot Proper를 우회*해 *바로 커널로 점프*하는 모양에서 왔습니다. 2012년 DENX의 Wolfgang Denx가 도입했습니다.

## 동작 원리

Falcon Mode가 동작하기 위해서는 SPL이 *커널을 부트할 모든 정보*를 가지고 있어야 합니다. 그 정보는 *부트 미디어의 정해진 위치*에 *미리 만들어 둔 binary*로 저장됩니다.

```text
SD/eMMC 레이아웃 (Falcon Mode):

오프셋 0          ← MBR / GPT
오프셋 1KB        ← SPL 이미지 (BootROM이 적재)
오프셋 ~50KB      ← U-Boot Proper (개발 모드 대체용)
오프셋 ~800KB     ← Falcon args (DTB + bootargs)
오프셋 ~1MB       ← Falcon kernel (zImage, Image)
오프셋 ~10MB      ← rootfs
```

SPL이 부팅하면 *부트 미디어 + 오프셋*에서 *args와 kernel*을 *바로 적재*하고 *점프*합니다.

```c
/* common/spl/spl.c (Falcon 흐름) */

void board_init_r(gd_t *dummy1, ulong dummy2)
{
    /* ... 기본 init ... */

    /* CONFIG_SPL_OS_BOOT이 활성화되어 있고, */
    /* spl_start_uboot()가 false를 반환하면 → Falcon */
    if (CONFIG_IS_ENABLED(OS_BOOT) && !spl_start_uboot()) {
        ret = spl_load_image(&spl_image, BOOT_DEVICE_MMC1);
        /* spl_load_image가 Linux 부트 정보까지 채움 */
    } else {
        /* 일반 U-Boot Proper 부트 */
        ret = spl_load_uboot(&spl_image, ...);
    }

    jump_to_image_linux(&spl_image);
}
```

`spl_start_uboot()`이 분기점입니다. *어떤 조건*에서 U-Boot Proper로 가고, *어떤 조건*에서 Falcon인지 보드가 결정합니다.

## defconfig 설정

Falcon Mode를 활성화하는 옵션은 *세 줄*입니다.

```text
# configs/<board>_defconfig
CONFIG_SPL_OS_BOOT=y
CONFIG_SYS_SPL_ARGS_ADDR=0x80000100
CONFIG_SYS_OS_BASE=0x80008000
```

| 옵션 | 의미 |
|------|------|
| `CONFIG_SPL_OS_BOOT` | Falcon Mode 활성화 |
| `CONFIG_SYS_SPL_ARGS_ADDR` | DTB가 적재될 메모리 주소 |
| `CONFIG_SYS_OS_BASE` | kernel image가 적재될 메모리 주소 |

부트 미디어에서의 오프셋도 보드별로 정의합니다.

```text
CONFIG_SYS_MMCSD_RAW_MODE_KERNEL_SECTOR=0x900  # 1.125 MB
CONFIG_SYS_MMCSD_RAW_MODE_ARGS_SECTOR=0x100    # 128 KB
CONFIG_SYS_MMCSD_RAW_MODE_ARGS_SECTORS=0x80    # 64 KB
```

이 오프셋이 부트 미디어 굽기 스크립트와 *반드시 일치*해야 합니다.

## `spl_start_uboot()` — 분기 결정

보드 코드가 *언제 Falcon이고 언제 U-Boot Proper인지*를 정합니다.

```c
/* board/<vendor>/<board>/<board>.c */

#include <common.h>
#include <spl.h>

int spl_start_uboot(void)
{
#ifdef CONFIG_SPL_OS_BOOT
    /* GPIO 또는 UART signal로 강제 U-Boot Proper */
    if (force_uboot_pin_pressed())
        return 1;  /* U-Boot Proper로 */

    /* 그 외는 Falcon */
    return 0;  /* 커널 직접 부트 */
#else
    return 1;
#endif
}
```

전형적인 결정 기준은 다음과 같습니다.

- *GPIO 핀*이 jumper로 short되어 있으면 U-Boot Proper (개발 모드)
- *UART에 키 입력*이 있으면 U-Boot Proper
- *부트 카운트가 임계 초과*이면 U-Boot Proper (recovery)
- 그 외는 Falcon

이 분기로 *같은 binary가 양산용·개발용*을 *모두* 지원합니다.

## args 만들기 — `spl export`

Falcon이 동작하려면 *DTB + bootargs*가 *부트 미디어에 미리 굳어져* 있어야 합니다. 일반 U-Boot Proper에서 `spl export` 명령으로 *args를 추출*합니다.

```bash
# 일반 U-Boot Proper 부트
=> setenv bootargs "console=ttymxc1,115200 root=/dev/mmcblk0p2 rw rootwait"
=> load mmc 0:1 ${loadaddr} Image
=> load mmc 0:1 ${fdt_addr} imx8mp-evk.dtb

# 이 시점에 kernel과 dtb가 메모리에 있음

=> spl export atags ${fdt_addr}      # ARMv7 (ATAGS)
# 또는
=> spl export fdt ${fdt_addr}        # ARMv8 (FDT)
```

`spl export`는 *현재의 bootargs를 DTB의 chosen 노드에 fixup*한 *완성된 DTB*를 만들고, 그 DTB의 *주소를 출력*합니다.

```text
=> spl export fdt 0x43000000
Argument image is now in RAM: 0x43000000
=>
```

이 메모리를 *부트 미디어에 굽습니다*.

```text
=> mmc write 0x43000000 0x100 0x80
MMC write: dev # 0, block # 256, count 128 ... 128 blocks written: OK
```

이제 SPL이 *0x100 sector에서 args*를 읽어 부팅하면 *Falcon이 동작*합니다.

## 커널 굽기

Falcon은 *FIT image 또는 raw zImage/Image*를 지원합니다. raw 모드가 더 간단합니다.

```bash
# 호스트에서 SD 카드 굽기

# SPL (오프셋 1KB)
dd if=u-boot-spl.bin of=/dev/sdX bs=1k seek=1

# U-Boot Proper (오프셋 50KB)
dd if=u-boot.bin of=/dev/sdX bs=1k seek=50

# Falcon args (오프셋 128KB)
dd if=args.bin of=/dev/sdX bs=1k seek=128

# Falcon kernel (오프셋 1152KB = 1.125MB)
dd if=Image of=/dev/sdX bs=1k seek=1152

sync
```

오프셋이 defconfig의 `CONFIG_SYS_MMCSD_RAW_MODE_*_SECTOR`와 *정확히 일치*해야 합니다.

## 양산용과 개발용 공존

Falcon은 *양산에 최적*이지만 *개발에는 불편*합니다. 환경 변수도 못 만지고, TFTP 부팅도 안 됩니다. 그래서 *한 binary에 두 모드*를 넣고 *strap pin으로 분기*하는 패턴이 일반적입니다.

```c
/* board/<vendor>/<board>/<board>.c */

#define DEV_MODE_GPIO  IMX_GPIO_NR(1, 5)

int spl_start_uboot(void)
{
    int dev_mode;

    gpio_request(DEV_MODE_GPIO, "dev_mode");
    gpio_direction_input(DEV_MODE_GPIO);
    dev_mode = gpio_get_value(DEV_MODE_GPIO);

    /* GPIO가 GND이면 dev mode (U-Boot Proper) */
    /* GPIO가 VCC이면 release mode (Falcon) */
    return (dev_mode == 0) ? 1 : 0;
}
```

또는 부트 카운트로 *연속 실패가 N회*이면 강제로 U-Boot Proper로 빠지게 합니다.

```c
int spl_start_uboot(void)
{
    u32 boot_count = bootcount_load();

    /* 3회 연속 부트 실패 → recovery (U-Boot Proper) */
    if (boot_count >= 3) {
        bootcount_store(0);
        return 1;
    }

    bootcount_store(boot_count + 1);
    return 0;  /* Falcon */
}
```

[Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update)에서 더 다룹니다.

## Falcon Mode 부트 로그

SPL이 *U-Boot Proper 없이 바로* 커널로 점프할 때의 로그입니다.

```text
U-Boot SPL 2024.04 (May 19 2026 - 09:00:00 +0000)
DDRINFO: start DRAM init
DDRINFO: DRAM rate 4000MTS
DDRINFO: ddrphy calibration done
Falcon Mode: Booting kernel directly                 ← Falcon 분기 선언
Loading kernel from MMC 0:1
Loading args from MMC 0:1
[    0.000000] Booting Linux on physical CPU 0x0      ← 바로 커널
[    0.000000] Linux version 6.6.0 (...)
...
```

`U-Boot 2024.04 (...)` 라인이 *없습니다*. 이것이 Falcon의 *시각적 마커*입니다.

## 부트 시간 비교

실제 측정값(BeagleBone Black, AM335x, 1GB DDR, SD card):

| 단계 | 일반 부트 | Falcon Mode |
|------|----------|-------------|
| BootROM | 0.00 s | 0.00 s |
| SPL (DDR init) | 0.15 s | 0.15 s |
| U-Boot Proper start | 0.30 s | — |
| driver probe done | 0.60 s | — |
| bootcmd start | 1.20 s | — |
| Linux start | 1.80 s | 0.50 s |
| user space | 4.50 s | 3.20 s |

*1.3초 단축*입니다. Linux 부팅이 *상수 시간*이므로 *user space까지의 총 시간*에서 차이가 그대로 유지됩니다.

여기서 *추가로 단축*하려면 *Linux 자체*를 다듬어야 합니다. CONFIG_DEBUG_KERNEL=n, deferred initcall, async probe. 이는 [Embedded Performance Engineering](/blog/embedded/) 시리즈에서 다룹니다.

## Falcon의 한계

### 1. 상호작용 없음

부트 중 키를 눌러도 *반응 없음*. 환경 변수 변경 불가, TFTP 부트 불가, 명령 인터프리터 없음.

### 2. 부트 미디어 *고정*

SPL이 *raw mode로 정해진 오프셋*에서 적재합니다. FAT/ext4를 거치지 않습니다. *파일 이름이 아니라 sector*입니다.

### 3. 커널 *update가 까다로움*

raw mode이므로 sector 오프셋에 *정확히* 굽기 위해 *별도 도구*가 필요합니다. 일반 파일 시스템 위에 커널을 두는 부트보다 *업데이트 절차가 복잡*합니다.

### 4. recovery가 까다로움

Falcon이 *부트 실패*했을 때 *복구 흐름*이 자동이 아닙니다. 보드 코드에서 *부트 카운트 + 분기*를 직접 짜야 합니다.

### 5. DTB fixup 한계

U-Boot Proper의 *런타임 fixup*(MAC 주소, 메모리 크기, 시리얼)이 *동작 안 함*. args를 미리 만들 때 *모든 fixup이 끝나야* 합니다.

## SPL에서의 추가 기능

Falcon Mode에서도 SPL이 *조금의 일*은 더 해야 합니다. 보드별로 차이가 있지만 일반적으로:

- watchdog 시작
- LED indicator (부트 중)
- splash screen (해상도가 작으면 가능)
- secure boot 검증 (이미지 서명 확인)
- A/B 슬롯 선택

```c
/* board/<vendor>/<board>/spl.c */

void spl_board_prepare_for_boot(void)
{
    /* WDT 시작 — Linux가 받아서 계속 servicing */
    wdt_start(...);

    /* GPIO LED 켜기 — 부트 중 indicator */
    gpio_set_value(BOOT_LED, 1);

    /* A/B 슬롯 결정 */
    if (active_slot() == SLOT_B) {
        spl_image.entry_point = KERNEL_B_ADDR;
    }
}
```

[Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot)에서 서명 검증을 다룹니다.

## 자주 하는 실수

### args를 *생성한 보드*와 *부트하는 보드*가 다름

`spl export`로 만든 args는 *해당 보드의 DTB + bootargs*를 기준으로 합니다. *같은 모델의 다른 개체*에서는 시리얼 번호나 MAC만 다르면 동작합니다만, *다른 모델*에서는 동작 안 합니다.

### 오프셋 *불일치*

defconfig의 `CONFIG_SYS_MMCSD_RAW_MODE_KERNEL_SECTOR=0x900`인데 `dd seek=1152`로 굽지 않고 `dd seek=900`(decimal)으로 굽는 실수. *sector 단위(512B)*임을 기억합니다.

```text
오프셋 0x900 sector = 0x900 * 512 bytes = 0x120000 bytes = 1.125 MB
dd seek=1152 bs=1024  ← OK
dd seek=2304 bs=512   ← OK
dd seek=0x900 bs=512  ← OK
```

### `spl_start_uboot()`이 *항상 0 또는 1*만 반환

조건 없이 0을 반환하면 *영원히 Falcon*이고, 1을 반환하면 *Falcon이 꺼진 것*입니다. *항상 분기 조건*을 점검합니다.

### CONFIG_SPL_OS_BOOT을 *켰는데* args를 *안 구움*

SPL이 args를 *못 찾으면* "Failed to load args" 또는 *바로 hang*. raw mode이므로 *어떤 오류 메시지도 없습니다*. 시리얼이 *조용히 죽음*.

### *FIT image와 raw mode를* 헷갈림

Falcon은 *두 모드* 모두 가능합니다. defconfig에서 어느 쪽을 쓰는지 확인합니다.

```text
[FIT]
CONFIG_SPL_FIT=y
CONFIG_SPL_LOAD_FIT=y

[raw]
CONFIG_SPL_RAW_IMAGE_SUPPORT=y
```

### 부트가 *너무 빠르*면 디버깅이 안 됨

Falcon 활성화 직후에는 *시리얼이 너무 빨리 흐릅니다*. 부트 디버깅 시에는 *FORCE_UBOOT GPIO*로 *일반 모드로 빠지게* 해 두는 것이 필요합니다.

## 정리

- Falcon Mode는 SPL이 *U-Boot Proper를 건너뛰고* 커널을 직접 부트하는 옵션입니다.
- 부트 시간이 *수백 ms ~ 1초 이상* 단축됩니다. 양산 시스템의 *sub-second boot*에 필수.
- 활성화는 `CONFIG_SPL_OS_BOOT=y` + `CONFIG_SYS_SPL_ARGS_ADDR` + `CONFIG_SYS_OS_BASE`.
- args(DTB + bootargs)는 *부트 미디어에 미리 굳어져* 있어야 합니다. U-Boot Proper에서 `spl export`로 추출해 *sector 단위로 굽습니다*.
- `spl_start_uboot()` 함수가 *Falcon vs U-Boot Proper 분기*를 결정합니다. GPIO 또는 부트 카운트 기반.
- 양산은 Falcon, 개발은 U-Boot Proper로 *같은 binary 안에 공존*시키는 패턴이 일반적입니다.
- 한계는 *상호작용 없음*, *raw sector 기반 적재*, *런타임 DT fixup 불가*. recovery 로직을 *별도로* 짜야 합니다.
- 부트 로그에 `U-Boot 2024.04 (...)` 라인이 *없으면* Falcon으로 부팅한 것입니다.

## 다음 편

[Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)에서는 U-Boot이 DTB를 다루는 방식을 봅니다. *control DTB*(자기 자신용)와 *OS DTB*(커널에 넘기는 것)의 구분, `fdt` 명령, 런타임 fixup을 다룹니다.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd)
- [Ch 15: FIT Image](/blog/embedded/bootloader/chapter15-fit-image)
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [원문 — U-Boot Falcon Mode docs](https://github.com/u-boot/u-boot/blob/master/doc/README.falcon)
