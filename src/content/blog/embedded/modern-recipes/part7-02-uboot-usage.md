---
title: "U-Boot 활용 — bootcmd·env·tftp·boot.scr 분석"
slug: "embedded/modern-recipes/part7-02-uboot-usage"
date: 2026-04-16T09:01:00
description: "U-Boot environment, script, bootcmd, TFTP/Fastboot, UEFI 모드까지 현장에서 쓰는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 76
tags: [recipes, linux, u-boot]
topics: ["embedded"]
---

## 한 줄 요약

> **"U-Boot의 핵심은 *environment variable*입니다."** `bootcmd`, `bootargs`, 직접 만든 변수가 한 번의 부팅 전체를 결정하고, 그 위에 script와 network boot가 얹힙니다. 이 글의 예는 모두 QEMU `virt` 보드에서 U-Boot v2025.04를 직접 빌드해 돌린 출력입니다.

## 어떤 상황에서 쓰나

개발 단계에서는 커널을 고칠 때마다 저장 장치에 다시 굽지 않고 TFTP로 받아 바로 부팅합니다. 양산 단계에서는 OTA 업데이트가 실패하면 이전 slot으로 돌아가도록 boot count를 둡니다. 두 경우 모두 U-Boot environment와 script를 다루는 일이 핵심입니다.

이미지를 장치에 넣는 경로로는 fastboot도 있습니다. Android 장치가 아니어도 U-Boot에 fastboot를 켜 두면 PC의 `fastboot` 명령으로 장치와 주고받을 수 있습니다.

## 이 글의 기준

- U-Boot v2025.04 태그, `qemu_arm64_defconfig`. Debian 13 arm64 VM에서 gcc 14.2.0으로 `make qemu_arm64_defconfig && make -j6`
- 커널: Linux v6.12 arm64 `defconfig`로 빌드한 `Image`([7-01](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)의 QEMU 절과 같은 파일)
- QEMU 11.1.3. 실행 명령은 아래와 같고, 두 번째 pflash(`flash1.img`, 64 MiB)가 environment 저장소입니다. `qemu_arm64_defconfig`는 `CONFIG_ENV_IS_IN_FLASH=y`, `CONFIG_ENV_ADDR=0x4000000`, `CONFIG_ENV_SIZE=0x40000`이고, U-Boot 문서도 env 저장용 pflash를 index 1로 붙이라고 안내합니다(`doc/board/emulation/qemu-arm.rst`).

```bash
truncate -s 64m flash1.img
qemu-system-aarch64 -M virt -cpu cortex-a57 -m 1G -nographic \
  -bios u-boot.bin -drive if=pflash,format=raw,index=1,file=flash1.img \
  -nic user,model=virtio-net-pci,tftp=$PWD/tftp
```

`-nic user,tftp=<dir>`는 QEMU user network 안에 TFTP 서버(10.0.2.2)를 띄웁니다. 그래서 별도 `tftpd-hpa` 없이 TFTP 부팅을 시험할 수 있습니다.

## 핵심 개념

| 이름 | 역할 | 이 글에서 본 값 |
| --- | --- | --- |
| environment | `key=value` 저장소. 부팅 때 저장 장치에서 읽고, CRC가 틀리면 기본값을 씁니다 | 첫 부팅 `*** Warning - bad CRC, using default environment` |
| `saveenv` / `printenv` / `setenv` | 저장, 출력, RAM에서 변경 | 아래 실행 |
| `bootcmd` | autoboot가 실행하는 명령 | `bootflow scan -lb` |
| `bootdelay` | autoboot 전에 키 입력을 기다리는 초 | `2` |
| `bootargs` | 커널 명령줄. `booti`가 DTB의 `/chosen`에 씁니다 | — |
| script (`boot.scr`) | `mkimage -T script`로 감싼 명령 묶음. `source`로 실행 | 아래 실행 |

`qemu_arm64` 기본 환경의 주소 변수는 다음과 같습니다. 이 보드에는 `fdt_addr_r`이 없고, QEMU가 넘긴 DTB를 U-Boot가 쓰는 주소가 `fdtcontroladdr`에 들어 있습니다.

```text
=> printenv bootcmd bootdelay kernel_addr_r fdt_addr_r scriptaddr ramdisk_addr_r
bootcmd=bootflow scan -lb
bootdelay=2
kernel_addr_r=0x40400000
## Error: "fdt_addr_r" not defined
scriptaddr=0x40200000
ramdisk_addr_r=0x44000000
```

`bootflow scan -lb`는 표준 boot(bootstd)가 장치를 차례로 훑어 부팅할 수 있는 것을 찾아 바로 부팅하라는 뜻입니다. 이 보드의 훑는 순서는 `boot_targets=qfw usb scsi virtio nvme dhcp`였습니다. 예전처럼 `run mmcboot` 같은 변수 하나에 load·boot 명령을 묶어 두는 방식도 여전히 쓸 수 있고, 아래 TFTP 절이 그 형태입니다.

## 코드 / 실제 사용 예

### Environment 다루기

빈 `flash1.img`로 처음 부팅하면 저장된 env가 없으므로 CRC 경고와 함께 기본값을 씁니다. `bootdelay`를 0으로 바꾸고, 공백이 든 값을 하나 넣은 뒤 저장했습니다.

```text
=> printenv bootdelay
bootdelay=2
=> setenv bootdelay 0
=> setenv bootargs console=ttyAMA0 root=/dev/vda2 rootwait quiet
=> printenv bootargs
bootargs=console=ttyAMA0 root=/dev/vda2 rootwait quiet
=> setenv greeting "hello world"
=> printenv greeting
greeting=hello world
=> saveenv
Saving Environment to Flash... Un-Protected 2 sectors
Erasing Flash...
.. done
Erased 2 sectors
Writing to Flash... done
Protected 2 sectors
OK
```

`setenv bootargs`에 따옴표 없이 단어 다섯 개를 줘도 값은 공백으로 이어진 한 문자열이 됐습니다. `setenv`는 이름 뒤의 인자를 모두 공백으로 이어 붙여 값으로 씁니다(`env/common.c`의 `env_do_env_set`, 105-119행). 따옴표가 꼭 필요한 경우는 값에 `;`나 `$`가 들어 있어서, `setenv`가 받기 전에 명령줄 parser가 그 문자를 해석하면 안 될 때입니다. 아래 `bootcmd` 예처럼 명령 여러 개를 한 변수에 담을 때가 그렇습니다.

QEMU를 끄고 같은 `flash1.img`로 다시 켜면 저장한 값이 돌아옵니다. `bootdelay=0`이라 키를 누를 틈 없이 `bootflow scan`이 돌았고, 부팅할 것을 찾지 못해 프롬프트로 떨어진 뒤의 출력입니다.

```text
Loading Environment from Flash... OK
...
=> printenv bootdelay bootargs greeting
bootdelay=0
bootargs=console=ttyAMA0 root=/dev/vda2 rootwait quiet
greeting=hello world
=> env default -a
## Resetting to default environment
=> printenv greeting
## Error: "greeting" not defined
=> printenv bootdelay
bootdelay=2
```

`env default -a`는 RAM의 environment만 기본값으로 되돌립니다. 저장소까지 되돌리려면 그 뒤에 `saveenv`를 해야 합니다. 이 버전의 `env` 하위 명령은 `ask`·`default`·`delete`·`edit`·`export`·`grep`·`import`·`info`·`load`·`print`·`run`·`save`·`erase`·`select`·`set`·`exists` 등이고(`cmd/nvedit.c:1063-1109`, 일부는 Kconfig로 켜야 함), `env reset`이라는 명령은 없습니다. 실제로 쳐 보면 `env`의 사용법만 출력됩니다.

### TFTP boot (개발용)

QEMU의 TFTP 디렉터리에 `Image`, initramfs, `boot.scr`를 넣고 받아 봤습니다. `autoload no`는 `dhcp`가 주소만 받고 파일은 받지 않게 합니다(`doc/usage/environment.rst`의 `autoload`).

```text
=> setenv autoload no
=> dhcp
BOOTP broadcast 1
DHCP client bound to address 10.0.2.15 (2 ms)
=> printenv ipaddr serverip
ipaddr=10.0.2.15
serverip=10.0.2.2
```

실제 보드에서는 DHCP 서버가 `serverip`를 주지 않을 수 있으므로 `setenv serverip <PC 주소>`를 직접 넣습니다. 그다음 `tftp`로 받은 파일을 `booti`로 넘기는 세 줄을 변수 하나에 묶어 두면 `run tftpboot` 한 줄로 반복할 수 있습니다.

```text
=> setenv tftpboot 'tftp ${kernel_addr_r} Image; tftp ${ramdisk_addr_r} initramfs.cpio.gz; booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdtcontroladdr}'
=> saveenv
```

작은따옴표는 `${...}`를 `setenv` 시점이 아니라 `run` 시점에 풀게 합니다. `${filesize}`는 직전 `tftp`가 받은 크기라서, initramfs를 받은 바로 뒤에 `booti`가 와야 맞는 값이 들어갑니다.

### boot.scr (script 파일)

같은 일을 script 파일로 만들어 두면 U-Boot env를 건드리지 않고 부팅 절차를 바꿀 수 있습니다. 원문은 다음 `boot.cmd`입니다.

```text
echo "boot.scr: loading Image and initramfs over TFTP"
setenv bootargs console=ttyAMA0 rdinit=/init
tftp ${kernel_addr_r} Image
tftp ${ramdisk_addr_r} initramfs.cpio.gz
booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdtcontroladdr}
```

U-Boot 트리에서 빌드된 `tools/mkimage`(`mkimage version 2025.04`)로 감쌌습니다. `-A arm64`가 헤더의 아키텍처입니다.

```bash
tools/mkimage -A arm64 -O linux -T script -C none -d boot.cmd boot.scr
```

```text
Image Name:   
Created:      Mon Nov 16 13:35:43 2026
Image Type:   AArch64 Linux Script (uncompressed)
Data Size:    248 Bytes = 0.24 KiB = 0.00 MiB
Load Address: 00000000
Entry Point:  00000000
Contents:
   Image 0: 240 Bytes = 0.23 KiB = 0.00 MiB
```

받아서 `source`로 실행한 결과입니다. `Image`(38,246,912 B)를 받는 동안의 `#` 줄은 줄였습니다.

```text
=> tftp ${scriptaddr} boot.scr
Using virtio-net#32 device
TFTP from server 10.0.2.2; our IP address is 10.0.2.15
Filename 'boot.scr'.
Load address: 0x40200000
Loading: #
	 304.7 KiB/s
done
Bytes transferred = 312 (138 hex)
=> source ${scriptaddr}
## Executing script at 40200000
boot.scr: loading Image and initramfs over TFTP
...
Bytes transferred = 38246912 (2479a00 hex)
...
Bytes transferred = 1017676 (f874c hex)
## Flattened Device Tree blob at 7e578df0
   Loading Ramdisk to 7d474000, end 7d56c74c ... OK
   Loading Device Tree to 000000007d371000, end 000000007d473fff ... OK

Starting kernel ...
```

커널은 script가 넣은 명령줄로 올라와 initramfs의 `/init`을 PID 1로 실행했습니다.

```text
[    0.000000] Kernel command line: console=ttyAMA0 rdinit=/init
[    0.651217] Run /init as init process
hello from /init, PID 1
```

전송 속도(`304.7 KiB/s`, `43.9 MiB/s` 등)는 QEMU user network를 지난 값이라 실제 Ethernet 속도와는 관계가 없습니다.

`bootcmd`를 바꾸지 않아도 표준 boot가 script를 찾습니다. bootstd의 script bootmeth는 각 파티션의 `/`와 `/boot/`에서 `boot.scr.uimg`, 그다음 `boot.scr`를 찾습니다(`boot/bootmeth_script.c:23-24`, `boot/bootstd-uclass.c:24`). 그래서 boot 파티션에 `boot.scr`를 두면 `bootflow scan`이 그것을 부팅 후보로 잡습니다.

### Boot count와 A/B fallback

OTA 뒤 새 slot이 부팅에 계속 실패하면 이전 slot으로 돌아가야 합니다. 체육관 출입 카드에 "세 번 연속 실패하면 관리실로 안내"라는 규칙을 두는 것과 같습니다. U-Boot에서는 `CONFIG_BOOTCOUNT_LIMIT`가 이 규칙이고, 부팅할 때마다 `bootcount`를 1씩 올려 `bootlimit`보다 커지면 `bootcmd` 대신 `altbootcmd`를 실행합니다(`doc/api/bootcount.rst`, `common/autoboot.c:455`, `:479-482`).

`qemu_arm64_defconfig`에는 이 기능이 없으므로 다음 세 줄을 더해 다시 빌드했습니다. 셋째 줄의 fastboot는 다음 절에서 씁니다.

```text
CONFIG_BOOTCOUNT_LIMIT=y
CONFIG_BOOTCOUNT_ENV=y
CONFIG_UDP_FUNCTION_FASTBOOT=y
CONFIG_FASTBOOT_BUF_ADDR=0x50000000
```

`CONFIG_BOOTCOUNT_ENV`는 count를 environment에 저장하는 backend입니다. 이 backend는 `upgrade_available`이 1일 때만 `bootcount`를 저장하고 읽습니다(`drivers/bootcount/bootcount_env.c:9-27`). OTA 업데이트 도구가 새 이미지를 쓴 뒤 `upgrade_available=1`로 두고, 새 시스템이 정상 부팅하면 사용자 공간에서 `upgrade_available`과 `bootcount`를 0으로 되돌리는 구조입니다(`doc/api/bootcount.rst:52-58`).

slot B가 매번 실패하는 상황을 `bootcmd='echo booting slot B; reset'`으로 흉내 냈습니다.

```text
=> setenv bootdelay 0
=> setenv upgrade_available 1
=> setenv bootlimit 2
=> setenv bootcmd 'echo booting slot B; reset'
=> setenv altbootcmd 'echo bootlimit exceeded, booting slot A; setenv upgrade_available 0; setenv bootcount 0; saveenv'
=> setenv bootcount 0
=> saveenv
...
=> reset
```

`reset` 뒤 세 번의 부팅에서 찍힌 줄만 모으면 다음과 같습니다. 부팅마다 count를 저장하느라 `Saving Environment to Flash...`가 먼저 나옵니다.

```text
Saving Environment to Flash... Un-Protected 2 sectors
...
booting slot B
resetting ...
...
booting slot B
resetting ...
...
Warning: Bootlimit (2) exceeded. Using altbootcmd.
Hit any key to stop autoboot:  0 
bootlimit exceeded, booting slot A
...
=> printenv bootcount upgrade_available
bootcount=0
upgrade_available=0
```

count 1과 2에서는 `bootcmd`, 3에서 `bootlimit`(2)를 넘어 `altbootcmd`가 돌았습니다. 비교가 `bootcount > bootlimit`이기 때문입니다(`include/bootcount.h`의 `bootcount_error`).

위 설정에서 `setenv bootcount 0` 한 줄을 빼면 결과가 달라집니다. 설정을 입력하던 그 부팅에서도 `bootcount_inc()`가 RAM의 `bootcount`를 1로 만들어 두므로(`upgrade_available`이 0이라 저장만 안 했을 뿐입니다), 이어서 `saveenv`를 하면 1이 저장됩니다. 실제로 그렇게 돌렸더니 `printenv bootcount`가 `bootcount=1`을 보였고, `reset` 뒤 slot B를 한 번만 시도하고 바로 `altbootcmd`로 넘어갔습니다.

`altbootcmd`가 이 예처럼 실제 부팅을 하지 않으면, 장치는 다시 reset되지 않고 프롬프트에 머뭅니다. 양산 이미지에서는 `altbootcmd`가 이전 slot을 실제로 부팅하는 명령이어야 합니다. `bootlimit`만 있고 `altbootcmd`가 없으면 U-Boot는 대화형 모드에 머문다고 문서에 적혀 있습니다(`doc/api/bootcount.rst:18-20`).

### Fastboot

Fastboot는 USB(`fastboot usb <controller>`)나 UDP(`fastboot udp`)로 PC의 `fastboot` 명령을 받습니다(`cmd/fastboot.c`의 help, `doc/android/fastboot.rst`). QEMU `virt`에는 USB gadget이 없으므로 UDP로 돌렸습니다. QEMU에 `hostfwd=udp:127.0.0.1:5554-:5554`를 더하고 U-Boot에서 `fastboot udp`를 실행했습니다.

```text
=> setenv autoload no
=> dhcp
BOOTP broadcast 1
DHCP client bound to address 10.0.2.15 (3 ms)
=> fastboot udp
Using virtio-net#32 device
Listening for fastboot command on 10.0.2.15
```

PC 쪽은 Debian 13 VM의 `fastboot` 34.0.5(`apt install fastboot`)입니다. VM 안에서 10.0.2.2는 그 VM을 띄운 호스트이므로, 호스트의 5554번 UDP를 지나 U-Boot에 닿습니다.

```text
$ fastboot -s udp:10.0.2.2 getvar version
version: 0.4
Finished. Total time: 0.001s
$ fastboot -s udp:10.0.2.2 getvar max-download-size
max-download-size: 0x07000000
Finished. Total time: 0.001s
$ fastboot -s udp:10.0.2.2 getvar product
product: qemu-arm
Finished. Total time: 0.000s
```

`max-download-size`는 `CONFIG_FASTBOOT_BUF_SIZE`(기본 `0x7000000`)와 같습니다. `fastboot flash`는 이 QEMU 보드에서 시험하지 않았습니다. v2025.04에서 flash 대상은 `CONFIG_FASTBOOT_FLASH_MMC`(MMC 필요)나 `CONFIG_FASTBOOT_FLASH_NAND`이고(`drivers/fastboot/Kconfig:115-121`), QEMU `virt`에는 둘 다 없기 때문입니다.

`fastboot flash boot boot.img`의 `boot`는 저장 장치의 파티션 이름입니다. GPT 이름이 `boot`가 아니라면 `fastboot_partition_alias_boot=LNX` 같은 변수로 별명을 줍니다(`doc/android/fastboot.rst:86-94`). `partitions` 변수는 `oem format`이 `gpt write mmc %x $partitions`로 파티션 표를 새로 쓸 때 쓰는 값입니다(같은 문서 27행).

### UEFI 부팅

U-Boot는 UEFI 펌웨어 역할도 합니다. Debian 13 nocloud arm64 이미지를 virtio 디스크로 붙이고 표준 boot 탐색을 돌리면, EFI 시스템 파티션의 `/EFI/BOOT/BOOTAA64.EFI`가 후보로 잡힙니다.

```text
=> bootflow scan -l
...
Scanning bootdev 'virtio-blk#33.bootdev':
  1  efi          ready   virtio       f  virtio-blk#33.bootdev.par /EFI/BOOT/BOOTAA64.EFI
...
(2 bootflows, 2 valid)
```

같은 파일을 직접 읽어 `bootefi`로 넘겨도 됩니다. Debian의 GRUB이 뜨고, GRUB이 커널을 EFI stub으로 부팅했습니다.

```text
=> load virtio 0:f ${kernel_addr_r} EFI/BOOT/BOOTAA64.EFI
1059712 bytes read in 5 ms (202.1 MiB/s)
=> bootefi ${kernel_addr_r}
...
Booting /EFI\BOOT\BOOTAA64.EFI
...
Loading Linux 6.12.116+deb13-arm64 ...
Loading initial ramdisk ...
EFI stub: Booting Linux Kernel...
...
EFI stub: Using DTB from configuration table
EFI stub: Exiting boot services...
```

이 경로에서는 커널 명령줄과 DTB 선택을 GRUB 설정과 EFI 테이블이 맡으므로, U-Boot의 `bootargs`는 쓰이지 않습니다.

### Custom command 추가

보드 전용 명령은 `cmd/` 아래 C 파일 하나와 Makefile 한 줄로 더할 수 있습니다. 아래 파일을 `cmd/health.c`로 두고 `cmd/Makefile`에 `obj-y += health.o`를 더해 빌드했습니다.

```c
// SPDX-License-Identifier: GPL-2.0+
#include <command.h>
#include <stdio.h>

static int do_health(struct cmd_tbl *cmdtp, int flag, int argc, char *const argv[])
{
	printf("health OK\n");
	return CMD_RET_SUCCESS;
}

U_BOOT_CMD(health, 1, 0, do_health, "show device health", "");
```

```text
=> health
health OK
=> help health
health - show device health
health 
```

`U_BOOT_CMD`의 둘째 인자 `1`은 명령 이름을 포함한 최대 인자 수, 셋째 `0`은 Enter만 눌렀을 때 다시 실행하지 않는다는 뜻입니다(`include/command.h`의 `U_BOOT_CMD` 정의).

## 측정 / 성능 비교

부팅 시간 항목(autoboot 대기, TFTP 전송, 저장 장치 읽기, 콘솔 출력)은 모두 보드의 네트워크·저장 장치·UART 속도로 정해지므로 QEMU에서 잰 숫자로 대신할 수 없습니다. 이 글에서 잰 값은 위에 나온 것뿐입니다. 그중 보드와 관계없이 성립하는 것은 두 가지입니다. `bootdelay` 초만큼은 키 입력을 기다리며 그대로 흘러가고, boot count를 env에 두면 부팅마다 env를 한 번 지우고 씁니다. 위 로그에서 부팅마다 `Erasing Flash... Writing to Flash...`가 찍힌 것이 그 쓰기입니다.

환경 저장 위치는 defconfig의 `CONFIG_ENV_IS_IN_*`가 정합니다. 이 보드는 NOR flash(`ENV_IS_IN_FLASH`)이고 env 크기는 `CONFIG_ENV_SIZE`(`0x40000`, 256 KiB)입니다. NOR·eMMC에 env를 두 벌 두는 `CONFIG_SYS_REDUNDAND_ENVIRONMENT`가 있지만, 이 글에서는 켜지 않았습니다.

## 자주 보는 함정

> ⚠️ `saveenv` 누락

`setenv`는 RAM의 environment만 바꿉니다. 위 실행에서 `saveenv` 뒤에 다시 켰을 때만 `greeting`이 남아 있었고, `env default -a`도 `saveenv` 전까지는 저장소를 바꾸지 않습니다.

> ⚠️ 명령 여러 개를 담을 변수를 따옴표 없이 씀

```text
=> setenv cmdtest echo first; echo second
second
=> printenv cmdtest
cmdtest=echo first
=> setenv cmdtest 'echo first; echo second'
=> printenv cmdtest
cmdtest=echo first; echo second
=> run cmdtest
first
second
```

따옴표가 없으면 명령줄 parser가 `;`에서 명령을 끊습니다. `setenv`는 `echo first`만 값으로 받고, 뒤의 `echo second`는 그 자리에서 바로 실행됐습니다. `bootcmd='echo booting slot B; reset'`을 따옴표 없이 쓰면 같은 이유로 `reset`이 그 자리에서 실행됩니다. 값 전체를 작은따옴표로 감쌉니다.

> ⚠️ boot count 설정을 저장하면서 RAM의 `bootcount`까지 저장함

위 절에서 본 대로, 설정하던 부팅의 RAM에는 이미 `bootcount=1`이 들어 있습니다. `setenv bootcount 0` 없이 `saveenv`를 하면 첫 시도가 한 번 줄어듭니다.

> ⚠️ `altbootcmd`가 실패하는 경로

`bootcount_error()`는 `bootcount > bootlimit`인 동안 계속 참이므로, `altbootcmd`가 부팅에 실패하고 reset하면 다음 부팅도 다시 `altbootcmd`로 갑니다. `altbootcmd`는 이미 검증된 이전 slot이나 recovery 파티션을 부팅해야 합니다.

> ⚠️ Fastboot 파티션 이름 불일치

`fastboot flash <name>`의 이름은 GPT 파티션 이름이나 `fastboot_partition_alias_<name>` 변수로 찾습니다. `partitions` 변수를 바꿔도 이름 해석은 달라지지 않습니다.

## 정리

- U-Boot의 동작은 environment가 정합니다. `setenv`는 RAM만, `saveenv`가 저장소까지 바꿉니다.
- `setenv`는 인자를 공백으로 이어 붙이므로 공백만 있는 값에는 따옴표가 필요 없고, `;`·`$`가 든 값에는 작은따옴표가 필요합니다.
- QEMU `-nic user,tftp=`로 TFTP 부팅과 `boot.scr`를 보드 없이 시험할 수 있습니다. bootstd는 `/`와 `/boot/`에서 `boot.scr`를 찾습니다.
- Boot count는 `bootcount > bootlimit`에서 `altbootcmd`로 갑니다. env backend는 `upgrade_available=1`일 때만 count를 저장합니다.
- Fastboot는 UDP로도 동작하지만, flash 대상은 v2025.04에서 MMC와 NAND뿐입니다.
- U-Boot는 UEFI 펌웨어로서 배포판 이미지의 `BOOTAA64.EFI`를 그대로 부팅할 수 있습니다.

다음 편은 [7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics)입니다.

## 관련 항목

- [7-01: i.MX8M Mini EVK Linux 부팅 흐름](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)
- [7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
- [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)
- [7-05: 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-14: 루트 파일시스템 (Buildroot 기초)](/blog/embedded/modern-recipes/part7-14-rootfs-buildroot)
