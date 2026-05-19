---
title: "Ch 13: 환경 변수와 bootcmd"
date: 2026-05-09T13:00:00
description: "U-Boot 환경 변수 시스템 — saveenv·bootcmd·bootargs·distro_bootcmd 패턴."
series: "Bootloader Internals"
seriesOrder: 13
tags: [embedded, bootloader, u-boot, env, bootcmd]
draft: false
---

## 한 줄 요약

**환경 변수는 U-Boot의 가변 상태 전부입니다.** 부트 시나리오, 커널 인자, 네트워크 설정, MAC 주소까지 모두 environment에 들어가고, `bootcmd`가 그 변수들을 엮어 부트를 완성합니다.

[10~12장](/blog/embedded/bootloader/chapter10-storage-boot)에서 본 부트 미디어별 명령들은 결국 *어떤 변수들의 조합*으로 환경에 박힙니다. `bootcmd`는 그 조합의 entry point이고, distroboot는 표준화된 fallback 사슬입니다. 부트 동작을 바꾸고 싶다면 *코드를 다시 빌드하지 않고도* 환경 변수만으로 충분합니다.

이 글에서는 환경 변수의 저장 위치, 주요 변수의 의미, `bootcmd`의 구조, distro_bootcmd의 자동 fallback, 그리고 redundancy까지 정리합니다.

## 환경은 어디에 저장되나

부트 ROM이 적재한 U-Boot 바이너리에는 *default environment*가 박혀 있습니다. `saveenv`로 수정하면 그 변경분이 *persistent storage*에 저장됩니다. 저장 위치는 빌드 시 `CONFIG_ENV_IS_IN_*`로 정합니다.

```text
CONFIG_ENV_IS_IN_MMC=y         # eMMC/SD의 raw offset
CONFIG_ENV_IS_IN_SPI_FLASH=y   # SPI NOR의 erase block
CONFIG_ENV_IS_IN_NAND=y        # NAND의 UBI 볼륨 또는 raw
CONFIG_ENV_IS_IN_FAT=y         # FAT 파일 시스템의 uboot.env 파일
CONFIG_ENV_IS_IN_EXT4=y        # ext4 파일 시스템의 uboot.env 파일
CONFIG_ENV_IS_NOWHERE=y        # 메모리에만 (saveenv 안됨)
```

eMMC를 쓰는 보드의 환경은 *user area의 특정 offset*이나 *boot partition*에 있습니다.

```text
# include/configs/myboard.h
#define CONFIG_ENV_OFFSET           0x400000   /* 4MiB offset */
#define CONFIG_ENV_SIZE             0x10000    /* 64KiB */
#define CONFIG_SYS_MMC_ENV_DEV      0
#define CONFIG_SYS_MMC_ENV_PART     1          /* boot partition 1 */
```

저장 위치는 *erase size 단위*로 정렬해야 합니다. SPI Flash의 sector size가 4KB면 offset도 4KB의 배수여야 합니다. 그렇지 않으면 erase가 다른 데이터를 같이 지웁니다.

## 기본 명령들

```text
=> printenv
arch=arm64
baudrate=115200
board=myboard
bootargs=console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait
bootcmd=run distro_bootcmd
bootdelay=2
fdt_addr_r=0x43000000
fdtfile=myboard.dtb
kernel_addr_r=0x40400000
loadaddr=0x40400000
serverip=192.168.1.10
...

=> printenv bootargs
bootargs=console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait

=> setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 ro quiet"
=> saveenv
Saving Environment to MMC... Writing to MMC(0)... OK

=> editenv bootargs
edit: console=ttyS0,115200 root=/dev/mmcblk0p2 ro quiet
```

`setenv var ""`은 변수를 *삭제*합니다. `saveenv`는 *전체 environment를 한 번에* 직렬화해 저장합니다. 변수 하나 변경에도 전체가 다시 쓰입니다.

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

이 변수들은 U-Boot 코드에서 *기본값*이 들어 있습니다. 보드별 헤더에서 `CONFIG_EXTRA_ENV_SETTINGS`로 추가합니다.

```c
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

distroboot는 *표준화된 부트 시나리오 라이브러리*입니다. `include/config_distro_bootcmd.h`에 정의되어 있고, 보드는 `CONFIG_DISTRO_DEFAULTS=y`를 켜기만 하면 됩니다.

```text
boot_targets=mmc0 mmc1 nvme0 scsi0 usb0 pxe dhcp

bootcmd=run distro_bootcmd

distro_bootcmd=
    setenv scriptaddr 0x40200000;
    for target in ${boot_targets}; do
        run bootcmd_${target};
    done

bootcmd_mmc0=
    setenv devnum 0;
    run mmc_boot

mmc_boot=
    mmc dev ${devnum};
    if mmc rescan; then
        run scan_dev_for_boot_part;
    fi

scan_dev_for_boot_part=
    part list mmc ${devnum} -bootable devplist;
    for distro_bootpart in ${devplist}; do
        if load mmc ${devnum}:${distro_bootpart} ${scriptaddr} boot.scr; then
            source ${scriptaddr};
            exit;
        fi
    done
```

흐름이 한눈에 들어옵니다.

1. `boot_targets`을 순서대로 시도한다.
2. 각 미디어에서 *bootable 파티션*을 찾는다.
3. `boot.scr`나 `extlinux/extlinux.conf`가 있으면 그것을 실행한다.
4. 한 미디어가 실패하면 다음으로 fall-through.

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

저장 미디어가 *부트 도중 전원이 꺼지면* environment가 깨질 수 있습니다. erase 중에 전원이 빠지면 sector가 *all-FF* 상태로 남아 다음 부트에서 environment를 못 읽습니다.

대책은 *redundancy*입니다. 두 카피를 두고, 한쪽이 망가져도 다른쪽으로 부트합니다.

```text
CONFIG_ENV_OFFSET=0x400000
CONFIG_ENV_OFFSET_REDUND=0x410000
CONFIG_SYS_REDUNDAND_ENVIRONMENT=y
```

저장 시 *번갈아 가며* 새 카피를 쓰고, 둘 다 유효하면 *flag byte*로 최신을 구분합니다. 한쪽이 깨졌다면 다른 쪽을 그대로 씁니다.

양산 보드는 redundancy를 *기본*으로 켭니다. 양산 중에 한 번의 갑작스러운 power loss로도 출하 후 부트가 안 될 수 있기 때문입니다.

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

- **`saveenv` 후 *erase boundary*에 다른 데이터가 있습니다.** SPI Flash에서 env가 끝나는 sector에 부트로더 일부가 걸쳐 있으면 `saveenv`가 부트로더를 지웁니다. layout을 항상 erase size 단위로.
- **`bootargs`에서 *변수 expansion* 시점이 헷갈립니다.** `setenv bootargs "root=${root_dev}"`은 *setenv 시점*에 `${root_dev}`가 펼쳐집니다. *부트 시점*에 펼치고 싶다면 single-quote처럼 escape하거나 `run` 안에서 펼치세요.
- **MAC 주소가 매번 random입니다.** `ethaddr`이 비어 있으면 U-Boot가 random MAC을 만듭니다. DHCP 서버의 고정 매핑이 깨집니다. `ethaddr`을 *fuse나 env에 박아 두세요*.
- **redundant env를 켜고 *원래 offset*만 채웠습니다.** 두 카피 모두 *각각의 위치*에 초기 값이 있어야 합니다. 빌드 산출물의 `u-boot.env`를 두 위치에 모두 굽으세요.
- **`boot.scr`의 mkimage `-T script` 형식을 빠뜨립니다.** plain text로 두면 `source`가 실행하지 못합니다. 반드시 `mkimage -T script`로 헤더를 붙이세요.

## 정리

- 환경은 U-Boot의 가변 상태 전부입니다. 부트 시나리오, 커널 인자, 네트워크가 모두 들어갑니다.
- 저장 위치는 빌드 시 `CONFIG_ENV_IS_IN_*`로 정하고, *erase size 단위*로 정렬합니다.
- 핵심 변수는 `bootcmd`, `bootargs`, `loadaddr`, `*_addr_r`, `boot_targets`, `ethaddr`입니다.
- `bootcmd`는 짧으면 한 줄, 길면 함수 단위 분해입니다.
- distro_bootcmd는 표준 fall-through 라이브러리이고, `boot_targets`만 정하면 끝입니다.
- 양산 보드는 *redundancy*를 켜서 power loss로 인한 env 손상을 막습니다.
- 변수 expansion 시점, MAC 영구화, erase 정렬이 1차 실수입니다.

## 다음 장 예고

다음 글에서는 *모던 U-Boot의 bootflow/bootmeth*를 봅니다. distro_bootcmd의 거대한 env 스크립트를 *C 코드 기반의 모듈*로 대체하는 새 모델입니다.

## 관련 항목

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — `boot.scr` 패턴
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — distroboot의 pxe/dhcp target
- [Ch 14: bootflow / bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) — distro_bootcmd의 후계자
- [BSP Ch 6: U-Boot 포팅](/blog/embedded/bsp/chapter06-u-boot-porting) — 보드별 환경 설정
- [U-Boot Distro Bootcmd 문서](https://docs.u-boot.org/en/latest/develop/distro.html)
