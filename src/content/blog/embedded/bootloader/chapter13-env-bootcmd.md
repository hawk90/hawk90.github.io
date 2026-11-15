---
title: "U-Boot 환경 변수와 bootcmd — 부팅 시나리오 정의하기"
slug: "embedded/bootloader/chapter13-env-bootcmd"
date: 2026-05-09T09:13:00
description: "U-Boot 환경 변수 시스템 — saveenv·bootcmd·bootargs·distro_bootcmd 패턴."
series: "Bootloader Internals"
seriesOrder: 13
tags: [embedded, bootloader, u-boot, env, bootcmd]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**환경 변수는 U-Boot의 설정 인터페이스 중 하나입니다.** 부트 명령과 일부 네트워크 설정은 environment로 조정할 수 있지만, 모든 상태가 변수에 들어가는 것은 아니며 기본값과 저장 방식은 보드 설정에 따라 다릅니다.

[10~12장](/blog/embedded/bootloader/chapter10-storage-boot)에서 본 부트 미디어별 명령은 환경 변수와 보드 코드의 조합으로 구성됩니다. `bootcmd`는 자동 부트의 진입점이며, distro boot와 Standard Boot는 설정된 미디어에서 부트 항목을 찾는 구현입니다. 변경 가능한 범위는 빌드 설정과 보드 구현에 달려 있습니다.

이 글에서는 환경 변수의 저장 위치, 주요 변수의 의미, `bootcmd`의 구조, distro_bootcmd의 자동 fallback, 그리고 redundancy까지 정리합니다.

## 환경은 어디에 저장되나

U-Boot는 빌드된 기본 environment를 제공하며, `saveenv`는 현재 설정을 보드가 구성한 persistent backend에 저장합니다. backend와 세부 위치는 빌드 및 보드 설정에 따릅니다. 현대 U-Boot에서는 보드별 text-based `.env` 파일을 사용할 수 있고, 전통적인 C 환경도 지원합니다.

```text
# backend 선택은 U-Boot 버전과 board Kconfig/defconfig를 확인한다.
# 저장 위치·파일명·중복 저장 지원도 해당 보드의 설정과 드라이버를 따른다.
```

환경 위치는 보드별로 확인해야 합니다. 아래는 특정 보드 설정을 대신하지 않는 형식 예시이며, 실제 offset/partition 값으로 사용하면 안 됩니다.

```text
# 실제 설정 예시는 대상 보드의 defconfig, Kconfig 및 DTS에서 확인한다.
# 환경 offset/size를 임의로 정하면 다른 데이터와 겹칠 수 있다.
```

저장 backend가 erase 기반인지, 필요한 정렬 및 보호 범위가 무엇인지는 해당 드라이버와 flash layout에서 확인해야 합니다. 모든 backend에 동일한 정렬 규칙을 적용할 수는 없습니다.

## 기본 명령들

아래 명령은 문법을 설명하는 예시이며, `saveenv`는 지속 환경을 변경합니다. 실제 보드에서는 변경 전 현재 설정과 복구 방법을 확인하고, 허가된 시험 환경에서만 저장합니다. 출력 줄은 실제 보드 캡처가 아닙니다.

```text
=> printenv bootcmd
bootcmd=<빌드/보드별 기본 명령>

=> printenv bootargs
bootargs=console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait

=> setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 ro quiet"
=> saveenv
Saving Environment ... <backend별 출력>

=> editenv bootargs
edit: console=ttyS0,115200 root=/dev/mmcblk0p2 ro quiet
```

변수 삭제에는 `env delete var`를 사용합니다. `env set`의 alias인 `setenv`는 값 없이 사용할 경우 삭제 동작을 할 수 있지만, `setenv var ""`는 빈 값 설정이므로 삭제와 같다고 가정하지 않습니다. 저장 단위와 원자성은 backend별 구현에 달려 있으므로 `saveenv`가 항상 전체 environment를 한 번에 다시 쓴다고 일반화하지 않습니다.

## 핵심 변수들

| 변수 | 역할 |
|------|------|
| `bootcmd` | 자동 부트에서 실행되는 명령 |
| `bootargs` | 커널에 넘기는 command line |
| `bootdelay` | 자동 부트 전 대기 시간(초). `-1`이면 자동 부트 안 함 |
| `loadaddr` | 일반 데이터 적재 주소 |
| `kernel_addr_r` | 커널 적재 주소 |
| `fdt_addr_r` | DTB 적재 주소 |
| `ramdisk_addr_r` | initramfs 적재 주소 |
| `serverip` / `ipaddr` | TFTP 서버와 자기 IP |
| `ethaddr` | MAC 주소 (보통 OTP fuse나 환경 변수에 박음) |
| `fdtfile` | DTB 파일 이름 (보드별) |
| `boot_targets` | distroboot가 시도할 미디어 목록 |

이 변수들은 보드와 기능 설정에 따라 제공 여부와 기본값이 달라집니다. 전통적 환경은 `CONFIG_EXTRA_ENV_SETTINGS` 등을 사용하고, text-based 환경은 `.env` 파일에서 구성할 수 있습니다.

```c
/* 설명용 형식 예시이며 임의로 대상 보드에 복사하지 않는다. */
/* include/configs/myboard.h */
#define CONFIG_EXTRA_ENV_SETTINGS \
    "kernel_addr_r=0x40400000\0" \
    "fdt_addr_r=0x43000000\0" \
    "ramdisk_addr_r=0x44000000\0" \
    "fdtfile=myboard.dtb\0" \
    "boot_targets=mmc0 usb0 pxe dhcp\0" \
    "console=ttyS0,115200\0" \
    "bootargs_default=console=${console} root=/dev/mmcblk0p2 rw rootwait\0"
```

각 항목 끝의 `\0`이 변수 구분자입니다. `\0` 두 개가 연속되면 *목록의 끝*입니다.

## bootcmd의 구조

가장 단순한 `bootcmd`는 한 줄짜리 명령입니다.

```text
bootcmd=mmc dev 0; ext4load mmc 0:1 ${kernel_addr_r} /boot/Image; \
        ext4load mmc 0:1 ${fdt_addr_r} /boot/${fdtfile}; \
        booti ${kernel_addr_r} - ${fdt_addr_r}
```

그러나 보드별 차이, 부트 실패 시 fallback, 멀티 OS 지원 같은 요구가 늘면 *함수 단위*로 쪼개야 합니다.

```text
bootcmd=run try_mmc || run try_usb || run try_dhcp

try_mmc=mmc dev 0 && ext4load mmc 0:1 ${kernel_addr_r} /boot/Image && \
        ext4load mmc 0:1 ${fdt_addr_r} /boot/${fdtfile} && \
        booti ${kernel_addr_r} - ${fdt_addr_r}

try_usb=usb start && load usb 0:1 ${kernel_addr_r} /boot/Image && \
        load usb 0:1 ${fdt_addr_r} /boot/${fdtfile} && \
        booti ${kernel_addr_r} - ${fdt_addr_r}

try_dhcp=dhcp ${kernel_addr_r} && booti ${kernel_addr_r} - ${fdt_addr_r}
```

이런 식의 *수작업 환경 변수*가 보드별로 누적되면 관리가 어려워집니다. 그래서 도입된 것이 *distroboot*입니다.

## distro_bootcmd — 표준 부트 시나리오

distro boot는 U-Boot 환경 스크립트와 빌드 설정을 이용하는 부트 방식입니다. 정확한 대상과 기본값은 해당 tag의 보드 설정에서 확인해야 하며, `CONFIG_DISTRO_DEFAULTS` 하나만으로 모든 장치에서 동일한 동작이 보장되지는 않습니다. 새 보드 구성에서는 Standard Boot도 별도 선택지입니다.

```text
boot_targets=mmc0 mmc1 nvme0 scsi0 usb0 pxe dhcp

bootcmd=run distro_bootcmd

distro_bootcmd=
    <대상별 환경 스크립트와 scan 절차는 보드 설정에 따라 다름>
```

흐름이 한눈에 들어옵니다.

1. 보드가 구성한 `boot_targets`와 관련 스크립트를 확인한다.
2. 각 대상의 scan 절차와 파일 이름은 U-Boot 버전 및 설정에 따라 달라진다.
3. extlinux 설정과 U-Boot script가 표준 boot 경로에 쓰일 수 있지만, 모든 빌드가 둘 다 검색하지는 않는다.

`boot.scr`는 [10장](/blog/embedded/bootloader/chapter10-storage-boot)에서 본 *파일 시스템 안의 스크립트*입니다. 부트 시나리오를 *파일*로 두면, U-Boot 환경을 건드리지 않고 OS만 새로 배포할 수 있습니다.

```bash
# /boot/boot.cmd (사람이 읽는 원본)
setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait"
load mmc ${devnum}:${distro_bootpart} ${kernel_addr_r} /boot/Image
load mmc ${devnum}:${distro_bootpart} ${fdt_addr_r}    /boot/${fdtfile}
booti ${kernel_addr_r} - ${fdt_addr_r}

# 빌드
mkimage -A arm64 -O linux -T script -C none -d boot.cmd boot.scr
```

## 환경 변수 redundancy

저장 중 전원 손실로 environment가 손상될 가능성과 복구 동작은 backend 및 저장 구현에 따라 다릅니다.

일부 backend는 redundant environment를 지원합니다. 이 옵션이 활성화되어 있고 올바르게 설정된 경우에만 두 복사본을 이용한 복구가 가능합니다.

```text
CONFIG_ENV_OFFSET=0x400000
CONFIG_ENV_OFFSET_REDUND=0x410000
CONFIG_SYS_REDUNDAND_ENVIRONMENT=y
```

복사본 선택과 validity metadata의 형식은 backend/version 구현을 확인해야 합니다. Redundancy는 모든 양산 보드의 기본값이 아니므로, 제품의 전원 손실 요구와 저장 layout을 검토해 선택합니다.

## 환경 변수의 *default* 처리

OTA나 공장 초기화 후 environment를 *default로 되돌리고* 싶을 때는 다음 절차를 씁니다.

```text
=> env default -a
## Resetting to default environment
=> saveenv
```

`-a`는 *all*입니다. 특정 변수만 default로 돌리려면 `env default ipaddr serverip`처럼 씁니다.

코드 측에서 default를 정의하는 곳은 `include/env_default.h`와 보드별 `CONFIG_EXTRA_ENV_SETTINGS`입니다. 빌드 후 변경할 수 없는 *baseline*입니다.

## 자주 하는 실수

- **환경 영역과 flash layout이 겹칩니다.** erase 기반 backend에서는 실제 erase 범위와 보호 영역을 확인하고 target layout으로 검증합니다.
- **`bootargs` 확장과 인용을 가정합니다.** 실제 확장 규칙은 명령 parser와 변수 내용에 따라 확인해야 합니다.
- **MAC 기본값을 가정합니다.** 주소의 출처와 빈 값일 때 동작은 Ethernet driver, board code, OTP 및 환경 설정에 따라 다릅니다.
- **redundant env 초기화 형식을 가정합니다.** 초기화·선택·복구 방식은 대상 backend와 U-Boot 버전에 맞는 절차를 따라야 합니다.
- **`boot.scr`의 mkimage `-T script` 형식을 빠뜨립니다.** plain text로 두면 `source`가 실행하지 못합니다. 반드시 `mkimage -T script`로 헤더를 붙이세요.

## 정리

- environment는 U-Boot 설정 인터페이스이며 변수와 backend는 보드별로 다릅니다.
- 저장 위치, 저장 단위, redundancy는 target의 Kconfig, driver, flash layout으로 확인합니다.
- 핵심 변수는 `bootcmd`, `bootargs`, `loadaddr`, `*_addr_r`, `boot_targets`, `ethaddr`입니다.
- `bootcmd`는 짧으면 한 줄, 길면 함수 단위 분해입니다.
- distro boot의 실제 scan/fallback 동작은 선택한 U-Boot tag, 보드 스크립트 및 `boot_targets` 설정을 확인합니다.
- 일부 보드는 redundancy를 지원하고 사용합니다. 제품별 전원 손실 및 복구 시험이 필요합니다.
- 변수 expansion, MAC 주소 설정 및 저장 영역 보호는 대상 설정에서 확인할 항목입니다.

## 다음 장 예고

다음 글에서는 *모던 U-Boot의 bootflow/bootmeth*를 봅니다. distro_bootcmd의 거대한 env 스크립트를 *C 코드 기반의 모듈*로 대체하는 새 모델입니다.

## 관련 항목

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — `boot.scr` 패턴
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — distroboot의 pxe/dhcp target
- [Ch 14: bootflow / bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) — distro_bootcmd의 후계자
- [BSP Ch 6: U-Boot 포팅](/blog/embedded/bsp/chapter06-u-boot-porting) — 보드별 환경 설정
- [U-Boot v2025.01 Environment Variables](https://docs.u-boot.org/en/v2025.01/usage/environment.html)
- [U-Boot v2025.01 Distro Configuration](https://docs.u-boot.org/en/v2025.01/develop/distro.html)
