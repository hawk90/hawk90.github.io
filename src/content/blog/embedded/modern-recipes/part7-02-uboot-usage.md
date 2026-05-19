---
title: "7-02: U-Boot 활용"
date: 2026-05-15T04:00:00
description: "U-Boot environment, script, bootcmd, TFTP/Fastboot, UEFI 모드까지 현장에서 쓰는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 76
tags: [recipes, linux, uboot]
---

## 한 줄 요약

> **"U-Boot의 핵심은 *environment variable*입니다."** `bootcmd`, `bootargs`, custom 변수가 한 boot 전체의 동작을 결정하고, 그 위에 script와 network boot가 얹힙니다.

## 어떤 상황에서 쓰나

개발 단계에서는 매번 kernel을 다시 굽지 않고 TFTP로 receive해 빠르게 iterate합니다. 양산 단계에서는 OTA 업데이트가 실패할 경우 fallback partition으로 boot하도록 redundant boot를 구성합니다. 두 경우 모두 U-Boot의 environment와 script를 잘 다루는 것이 핵심입니다.

또 한 가지 흔한 작업은 fastboot 모드입니다. Android 기반 device뿐 아니라 일반 Linux device도 fastboot를 지원하면 PC에서 한 명령으로 flash가 가능해집니다.

## 핵심 개념

```text
environment            key=value 저장소 (eMMC/SPI/RAM)
saveenv / printenv     persistent 저장과 출력
bootcmd                전원 인가 후 자동 실행 (autoboot delay 후)
bootargs               kernel command line으로 전달
script (.scr)          mkimage로 만든 명령 묶음
fastboot mode          USB로 PC에서 flash
```

기본 boot 흐름의 환경 변수입니다.

```text
bootcmd=run mmcboot
mmcboot=load mmc 0:1 ${kernel_addr_r} zImage;
        load mmc 0:1 ${fdt_addr_r} board.dtb;
        bootz ${kernel_addr_r} - ${fdt_addr_r}
bootargs=console=ttyS0,115200 root=/dev/mmcblk0p2 rootwait
```

`run mmcboot`처럼 *함수* 형태로 환경 변수를 정의해두면 사람이 읽기에도, 자동화에도 좋습니다.

## 코드 / 실제 사용 예

### Environment 다루기

```text
=> printenv
=> printenv bootcmd

=> setenv bootdelay 0       # autoboot 지연 0초
=> setenv bootcmd 'run tftpboot'
=> saveenv                  # eMMC 또는 SPI에 영속화

=> env default -a           # 공장 reset
=> env reset                # default를 RAM에 로드 (저장 안 함)
```

`saveenv` 없이는 reboot 시 변경이 사라집니다. 양산기는 env partition을 read-only로 만들기도 합니다.

### TFTP boot (개발용)

```text
=> setenv serverip 192.168.1.100
=> setenv ipaddr   192.168.1.50
=> tftp ${kernel_addr_r} zImage
=> tftp ${fdt_addr_r}    board.dtb
=> bootz ${kernel_addr_r} - ${fdt_addr_r}
```

PC 쪽에서 `tftpd-hpa` 서비스를 띄워두고 위 네 줄을 묶어 `tftpboot` 환경 변수로 정의합니다.

```text
=> setenv tftpboot 'tftp ${kernel_addr_r} zImage; \
                    tftp ${fdt_addr_r} board.dtb; \
                    bootz ${kernel_addr_r} - ${fdt_addr_r}'
=> saveenv
```

이렇게 두면 매번 `run tftpboot`만 입력하면 됩니다.

### boot.scr (script 파일)

```text
# boot.cmd
setenv loadaddr   0x40400000
setenv fdtaddr    0x43000000
load mmc 0:1 ${loadaddr} zImage
load mmc 0:1 ${fdtaddr}  board.dtb
bootz ${loadaddr} - ${fdtaddr}
```

```bash
mkimage -A arm -O linux -T script -C none -d boot.cmd boot.scr
cp boot.scr /mnt/boot/
```

U-Boot가 자동으로 `boot.scr`을 찾아 실행하도록 `bootcmd`를 설정하면, kernel을 새로 build해도 U-Boot env를 건드릴 필요가 없습니다.

### Redundant boot (A/B partition)

```text
# slot A 정상 boot 시 health flag 1로 갱신
mmcboot=test "${slot}" = "B" && setenv root /dev/mmcblk0p3 || setenv root /dev/mmcblk0p2;
        setenv bootargs console=ttyS0,115200 root=${root} ro;
        load mmc 0:${slot_part} ${kernel_addr_r} zImage;
        bootz ${kernel_addr_r} - ${fdt_addr_r}

# OTA 후 boot 시도, 부팅 실패 시 reset → bootlimit 도달 → 자동 fallback
bootlimit=3
bootcount=0
altbootcmd=setenv slot A; setenv slot_part 1; run mmcboot
```

`bootcount`/`bootlimit`을 사용하면 boot 실패가 N회 연속이면 `altbootcmd`로 fallback합니다. OTA failure의 표준 패턴입니다.

### Fastboot mode

```text
=> fastboot 0

# PC에서
$ fastboot devices
$ fastboot flash boot     boot.img
$ fastboot flash system   system.img
$ fastboot reboot
```

U-Boot가 fastboot 응답을 USB로 처리합니다. 양산 라인의 first flash나 RMA의 reimage에 매우 편리합니다.

### UEFI mode (UEFI/grub 통합)

```text
=> bootefi bootmgr

# 또는 grub-efi binary 직접
=> load mmc 0:1 ${kernel_addr_r} EFI/BOOT/BOOTAA64.EFI
=> bootefi ${kernel_addr_r}
```

UEFI shell과 grub를 통합한 환경에서는 U-Boot가 BIOS 역할을 하고 부팅 결정은 EFI bootmgr에게 위임합니다. 일반 distro image와의 호환이 좋아집니다.

### Custom command 추가

```c
/* cmd/mycmd.c */
#include <command.h>
static int do_health(struct cmd_tbl *cmdtp, int flag, int argc, char *const argv[]) {
    printf("health OK\n");
    return 0;
}
U_BOOT_CMD(health, 1, 0, do_health, "show device health", "");
```

vendor의 BSP는 보통 board-specific 명령(`board_id`, `health`, `mfg_test`)을 추가합니다. 양산 라인의 burn-in test에도 활용합니다.

## 측정 / 성능 비교

```text
조작                              소요 시간
autoboot delay 기본               2 s
autoboot delay 0                  0 s
TFTP load 8 MB zImage             ~600 ms (100 Mbps)
eMMC load 8 MB zImage             ~80 ms
SD load 8 MB zImage               ~250 ms
silent console (no UART print)    -200 ms
```

가장 큰 boot time 절감은 autoboot delay 0과 console silent입니다. 양산 펌웨어에서 둘을 함께 적용합니다.

```text
환경 저장 위치 비교
eMMC redundant env       64 KB × 2  안정성 최고
SPI NOR env              64 KB      가장 흔함
RAM env                  0 (영구 X)  개발용만
```

## 자주 보는 함정

> `saveenv` 누락

```text
=> setenv bootcmd run tftpboot
=> boot           # tftpboot로 boot
=> reboot         # 이전 bootcmd로 돌아감
```

`saveenv`를 안 하면 RAM env만 바뀝니다. 영구 적용은 반드시 `saveenv`를 같이 합니다.

> bootargs의 따옴표 누락

```text
=> setenv bootargs console=ttyS0,115200 root=/dev/mmcblk0p2 rw quiet
=> setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 rw quiet"  # 권장
```

공백이 있는 값은 따옴표가 필수입니다. 그렇지 않으면 두 번째 단어부터는 다음 명령으로 해석됩니다.

> Network boot 시 server unreachable

```text
TFTP retry count exceeded
```

SoC 쪽 PHY 초기화 지연이 원인일 때가 흔합니다. `setenv autoload no; dhcp`로 lease만 받고 잠시 wait한 후 `tftp` 명령을 따로 실행하는 식으로 우회합니다.

> bootlimit 무한 reset loop

```text
bootcount=99 (>bootlimit)
altbootcmd도 fail → 영구 reset
```

`altbootcmd`가 *항상* 성공할 수 있는 경로여야 합니다. recovery partition을 미리 준비해 둡니다.

> Fastboot mode에서 partition 이름 mismatch

```text
fastboot flash boot boot.img → "boot" partition not found
```

`partitions=` 환경 변수가 fastboot partition 이름을 정의합니다. eMMC partition layout과 일치시킵니다.

## 정리

- U-Boot의 핵심은 environment variable입니다. `bootcmd`와 `bootargs`가 거의 모든 결정을 합니다.
- TFTP는 개발 cycle을 빠르게, fastboot는 양산 flash를 단순하게 만듭니다.
- `boot.scr`을 쓰면 kernel update 시 U-Boot env를 건드리지 않습니다.
- `bootcount/altbootcmd`로 redundant boot를 구성하는 것이 OTA의 표준입니다.
- Autoboot delay 0과 silent console로 boot time을 쉽게 줄일 수 있습니다.
- 양산은 env partition을 redundant로 두거나 read-only로 만듭니다.

다음 편부터 7-03은 별도 다루고, 본 시리즈에서는 **Device Tree Overlay**로 넘어갑니다.

## 관련 항목

- [7-01: 임베디드 Linux 부팅 흐름](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)
- [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)
- [7-05: 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-14: 루트 파일시스템 (Buildroot 기초)](/blog/embedded/modern-recipes/part7-14-rootfs-buildroot)
