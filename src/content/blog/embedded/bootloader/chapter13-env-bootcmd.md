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

> U-Boot 환경은 **CRC32 4 byte 뒤에 `이름=값\0`이 줄줄이 이어진 텍스트 덩어리**입니다. `bootcmd`는 그중 자동 부팅 때 실행되는 변수 하나일 뿐이고, 값 안의 `${...}`가 언제 펼쳐지는지(작은따옴표냐 큰따옴표냐)가 스크립트 동작을 바꿉니다.

이 글의 출력은 U-Boot **v2024.04**를 `qemu_arm64_defconfig`로 빌드해 QEMU 11.1.3 `virt`에서 실행한 것입니다. `saveenv`가 재부팅 뒤에도 남는지 보려고 `-bios` 대신 64 MiB pflash 파일 두 개(`-drive if=pflash,unit=0/1`)를 붙였고, 스크립트용 USB 디스크(GPT·ext4)를 함께 붙였습니다.

## 환경은 어디에, 어떤 모양으로 저장되나

QEMU 빌드는 `CONFIG_ENV_IS_IN_FLASH=y`, `CONFIG_ENV_ADDR=0x4000000`, `CONFIG_ENV_SIZE=0x40000`입니다. 즉 두 번째 NOR flash의 맨 앞 256 KiB가 환경 자리입니다([10장](/blog/embedded/bootloader/chapter10-storage-boot)의 `flinfo`에서 RO로 보이던 그 두 sector입니다). 처음 부팅하면 그 자리가 비어 있어 이렇게 나옵니다.

```text
Loading Environment from Flash... *** Warning - bad CRC, using default environment
```

이 경고는 오류가 아니라 "저장된 환경이 없어서 빌드에 들어 있는 기본값을 쓴다"는 뜻입니다. 값을 하나 저장해 봤습니다.

```text
=> setenv greeting hello
=> saveenv
Saving Environment to Flash... Un-Protected 2 sectors
Erasing Flash...
.. done
Erased 2 sectors
Writing to Flash... done
Protected 2 sectors
OK
```

아래 덤프는 두 번째 부팅에서 `env default -a; saveenv`로 기본값을 다시 저장한 직후의 flash 파일입니다(그래서 `greeting`이 없습니다). QEMU를 끄고 앞부분을 열어 보면 형식이 그대로 보입니다.

```text
$ xxd -l 48 flash1.img
00000000: 4fac b6ef 6172 6368 3d61 726d 0062 6175  O...arch=arm.bau
00000010: 6472 6174 653d 3131 3532 3030 0062 6f61  drate=115200.boa
00000020: 7264 3d71 656d 752d 6172 6d00 626f 6172  rd=qemu-arm.boar
```

앞 4 byte(`0xefb6ac4f`, little-endian)가 CRC32이고, 그 뒤가 `arch=arm\0baudrate=115200\0…`입니다. v2024.04 `include/env_internal.h`의 `env_t`가 바로 이 구조입니다(`crc` 다음 `data[ENV_SIZE]`). host에서 `zlib.crc32()`로 4 byte 이후 `ENV_SIZE`(0x40000 − 4 byte) 전체를 계산하면 `0xefb6ac4f`가 나와 일치합니다. 부팅할 때 이 계산이 맞지 않으면 위의 "bad CRC" 경고와 함께 기본값으로 돌아가는 것입니다.

숫자 하나가 눈에 띕니다. 변수는 21개, 실제로 쓴 공간은 439 byte인데, `saveenv`는 매번 128 KiB sector 두 개를 지우고 다시 씁니다. flash는 지운 횟수만큼 닳기 때문에, 부팅할 때마다 `saveenv`를 부르는 스크립트(부팅 횟수 카운터 등)는 환경 sector의 수명을 깎아 먹습니다. [17장](/blog/embedded/bootloader/chapter17-ab-update)의 bootcount도 v2024.04 `drivers/bootcount/Kconfig`에 환경에 쓰는 `BOOTCOUNT_ENV` 외에 `BOOTCOUNT_RAM`, `BOOTCOUNT_MEM`, RTC를 쓰는 `DM_BOOTCOUNT_RTC` 같은 backend가 있으므로, 매 부팅 바뀌는 값은 flash 환경이 아닌 쪽에 둡니다.

QEMU를 다시 켜면 이번에는 `Loading Environment from Flash... OK`가 나오고 `greeting=hello`가 남아 있습니다. 저장 뒤에 설정한 변수(`x`)는 사라졌습니다. `setenv`는 RAM의 사본만 바꾸고, flash에는 `saveenv` 때만 씁니다.

## 기본 환경은 어디서 오나

`env default -a`는 RAM의 환경을 빌드에 들어 있는 기본값으로 되돌립니다.

```text
=> env default -a
## Resetting to default environment
=> printenv greeting
## Error: "greeting" not defined
```

그 기본값의 출처는 두 가지입니다. v2024.04 `include/env_default.h`는 `bootcmd`·`bootdelay` 같은 공통 항목을 Kconfig 값으로 채우고, 그 뒤에 `CFG_EXTRA_ENV_SETTINGS`를 붙입니다. 오래된 자료에는 `CONFIG_EXTRA_ENV_SETTINGS`로 나오지만, v2024.04의 `include/configs/` 아래 367개 파일은 모두 `CFG_` 이름을 씁니다. 다른 하나는 텍스트 환경 파일입니다. `doc/usage/environment.rst`에 따르면 `board/<vendor>/<board>/<CONFIG_ENV_SOURCE_FILE>.env`, 이 값이 비어 있으면 `<CONFIG_SYS_BOARD>.env`를 씁니다. QEMU는 `CONFIG_ENV_SOURCE_FILE=""`, `CONFIG_SYS_BOARD="qemu-arm"`이므로 `board/emulation/qemu-arm/qemu-arm.env`가 그 파일입니다.

```text
stdin=serial,usbkbd
stdout=serial,vidconsole
stderr=serial,vidconsole
fdt_high=0xffffffff
initrd_high=0xffffffff
fdt_addr=0x40000000
scriptaddr=0x40200000
pxefile_addr_r=0x40300000
kernel_addr_r=0x40400000
ramdisk_addr_r=0x44000000
boot_targets=qfw usb scsi virtio nvme dhcp
```

10장에서 `fdt_addr_r`이 정의되지 않아 `load`가 실패했던 이유가 이 파일에 그대로 보입니다. 새 보드를 만들 때 이 파일 하나에 주소 변수를 빠짐없이 적어 두면 같은 실수를 막을 수 있습니다.

## 핵심 변수

| 변수 | QEMU 빌드의 값 | 역할 |
| --- | --- | --- |
| `bootcmd` | `bootflow scan -lb` | `bootdelay` 뒤 자동 실행 (`CONFIG_BOOTCOMMAND`) |
| `bootdelay` | `2` | 자동 부팅 전 대기 초 (`CONFIG_BOOTDELAY`). `-1`이면 자동 부팅 안 함 |
| `boot_targets` | `qfw usb scsi virtio nvme dhcp` | 표준 부팅이 훑는 장치 순서 |
| `kernel_addr_r`, `ramdisk_addr_r` | `0x40400000`, `0x44000000` | 관례 이름. 값은 보드가 정의 |
| `fdt_addr_r` | (없음) | QEMU에는 정의되지 않음 |
| `board` | `qemu-arm` | Fastboot `getvar product`의 출처([12장](/blog/embedded/bootloader/chapter12-usb-boot)) |
| `serial#` | (없음) | Fastboot `getvar serialno`의 출처 |

## `bootcmd`와 hush — 따옴표 하나가 동작을 바꾼다

이 빌드의 명령줄 해석기는 `CONFIG_HUSH_PARSER`의 old parser(`CONFIG_HUSH_OLD_PARSER`, 2005년 BusyBox hush 기반)입니다. 스크립트를 쓸 때 가장 먼저 걸리는 것은 변수가 **언제** 펼쳐지느냐입니다.

```text
=> setenv x 1
=> setenv show_single 'echo x=${x}'
=> setenv show_double "echo x=${x}"
=> setenv x 2
=> run show_single
x=2
=> run show_double
x=1
=> printenv show_single show_double
show_single=echo x=${x}
show_double=echo x=1
```

작은따옴표로 저장한 `show_single`에는 `${x}`가 글자 그대로 들어가 있어 `run`할 때의 값(2)을 읽습니다. 큰따옴표로 저장한 `show_double`은 `setenv`를 실행하는 순간 이미 `1`로 펼쳐져서 저장되었습니다. `bootargs`를 `"console=${console} root=${rootdev}"`처럼 큰따옴표로 만들면, 나중에 `rootdev`를 바꿔도 `bootargs`에는 옛 값이 박혀 있습니다. 실행할 때 값을 읽어야 하는 변수는 작은따옴표로 저장합니다.

삭제와 빈 값도 다릅니다.

```text
=> setenv del_me 1
=> setenv del_me
=> printenv del_me
## Error: "del_me" not defined
=> setenv empty_me 1
=> setenv empty_me ""
=> printenv empty_me
empty_me=
```

값 없이 `setenv 이름`이면 변수가 사라지고, `""`를 주면 빈 값으로 남습니다. `if test -n "${var}"`처럼 비어 있는지 검사하는 스크립트에서는 두 경우가 같은 결과지만, `env exists` 같은 존재 검사에서는 다르게 나옵니다.

### 실패하면 다음 경로로 — `||`

부팅 경로를 여러 개 두는 고전적인 방법은 명령의 성공·실패를 `||`로 잇는 것입니다. 첫 경로가 없는 파일을 읽게 해서 실패시켰습니다.

```text
=> setenv try_a 'load usb 0:1 ${kernel_addr_r} /boot/missing'
=> setenv try_b 'load usb 0:1 ${kernel_addr_r} /boot/hello.txt'
=> run try_a || run try_b
Failed to load '/boot/missing'
35 bytes read in 1 ms (34.2 KiB/s)
=> echo rc=$?
rc=0
```

`try_a`의 `load`가 실패를 돌려주자 `||` 뒤의 `try_b`가 실행되었고, 전체 결과(`$?`)는 0입니다. 실제 `bootcmd`라면 `try_mmc || try_usb || try_dhcp`처럼 이어 붙이고, 각 `try_*` 안에서는 `load ... && load ... && booti ...`처럼 `&&`로 묶어 중간에 하나라도 실패하면 다음 경로로 넘어가게 합니다.

## 스크립트 파일 — `boot.scr`

명령이 길어지면 환경 변수 대신 저장 장치의 파일에 둡니다. 이때 그냥 텍스트 파일은 실행되지 않습니다.

```text
=> load usb 0:1 ${kernel_addr_r} /boot/boot.cmd
173 bytes read in 0 ms
=> source ${kernel_addr_r}
## Executing script at 40400000
Wrong image format for "source" command
```

`source`는 `boot/image-board.c`의 `image_locate_script()`로 legacy image 헤더나 FIT를 찾고, 둘 다 아니면 위 메시지로 거부합니다. 빌드 때 함께 만들어지는 `tools/mkimage`로 헤더를 붙여야 합니다.

```bash
mkimage -A arm64 -O linux -T script -C none -d boot.cmd boot.scr
```

```text
Image Type:   AArch64 Linux Script (uncompressed)
Data Size:    181 Bytes = 0.18 KiB = 0.00 MiB
```

헤더를 붙인 `boot.scr`(245 byte)는 실행됩니다. 이 스크립트는 처음에 `${devtype} ${devnum}:${distro_bootpart}`를 출력하게 만들어 두었습니다.

```text
=> load usb 0:1 ${kernel_addr_r} /boot/boot.scr
245 bytes read in 0 ms
=> source ${kernel_addr_r}
## Executing script at 40400000
== boot.scr running from  :
35 bytes read in 0 ms
loaded 23 bytes
```

두 가지가 보입니다. 첫째, 손으로 `source`하면 `devtype`·`devnum`·`distro_bootpart`가 비어 있습니다. 둘째, 스크립트의 `echo "loaded ${filesize} bytes"`가 35가 아니라 23을 출력했습니다. `filesize`는 16진수(`0x23` = 35)로 저장되기 때문입니다([10장](/blog/embedded/bootloader/chapter10-storage-boot)).

## 표준 부팅(bootstd)이 스크립트를 찾을 때

같은 스크립트를 표준 부팅에 맡기면 결과가 달라집니다. QEMU의 `bootcmd`가 바로 이것(`bootflow scan -lb`)입니다.

```text
=> bootflow scan -l usb
Scanning for bootflows with label 'usb'
Seq  Method       State   Uclass    Part  Name                      Filename
---  -----------  ------  --------  ----  ------------------------  ----------------
Hunting with: usb
Scanning bootdev 'usb_mass_storage.lun0.bootdev':
  0  script       ready   usb_mass_    1  usb_mass_storage.lun0.boo /boot/boot.scr
No more bootdevs
---  -----------  ------  --------  ----  ------------------------  ----------------
(1 bootflow, 1 valid)
=> bootflow scan -b usb
** Booting bootflow 'usb_mass_storage.lun0.bootdev.part_1' with script
== boot.scr running from usb 0:1
35 bytes read in 1 ms (34.2 KiB/s)
loaded 23 bytes
Boot failed (err=-14)
=> printenv devtype devnum distro_bootpart prefix
devtype=usb
devnum=0
distro_bootpart=1
prefix=/boot/
```

`boot/bootmeth_script.c`는 파일 이름 `boot.scr.uimg`와 `boot.scr`를 prefix(`/`, `/boot/`)마다 찾고, 찾은 스크립트를 실행하기 전에 `devtype`·`devnum`·`distro_bootpart`·`prefix`를 환경에 넣습니다. 그래서 이번에는 `usb 0:1`이 찍혔습니다. 배포판 스크립트가 `load ${devtype} ${devnum}:${distro_bootpart} …`처럼 쓰는 것은 이 값을 기대하기 때문이고, 손으로 시험할 때는 이 변수들을 먼저 `setenv`해야 같은 결과가 나옵니다.

마지막의 `Boot failed (err=-14)`도 의미가 있습니다. `boot/bootflow.c`의 `bootflow_boot()`는 부팅 방법이 **돌아왔다는 것 자체**를 실패로 보고 `-EFAULT`(-14)를 돌려줍니다. 정상적인 boot 스크립트는 마지막에 `booti`로 kernel에 넘어가 돌아오지 않으므로, 이 메시지는 스크립트가 kernel 실행까지 가지 못하고 끝났다는 신호입니다.

v2024.04에는 이전 방식인 `distro_bootcmd`(`include/config_distro_bootcmd.h`, `CONFIG_DISTRO_DEFAULTS`)도 남아 있지만, QEMU 빌드는 `CONFIG_BOOTSTD_DEFAULTS`를 써서 `printenv distro_bootcmd`가 `not defined`였습니다. 같은 `boot_targets` 변수라도 어느 방식이 읽느냐에 따라 문법이 다르므로, 먼저 `bootcmd`가 무엇인지부터 봅니다.

## 전원이 꺼지면 — redundant environment

`saveenv`는 sector를 지운 뒤 씁니다. 지운 직후 전원이 꺼지면 CRC가 맞지 않아 다음 부팅은 기본값으로 돌아갑니다. 기본값으로 부팅할 수 있으면 다행이지만, `bootcmd`나 MAC 주소를 환경에만 둔 제품이라면 현장에서 부팅 경로가 바뀝니다.

`CONFIG_SYS_REDUNDAND_ENVIRONMENT`를 켜면 두 번째 사본(`CONFIG_ENV_ADDR_REDUND` 또는 `CONFIG_ENV_OFFSET_REDUND`)을 두고 번갈아 씁니다. `env/Kconfig`의 도움말은 "saveenv 중 전원이 끊겨도 유효한 백업이 남도록" 하는 옵션이라고 설명하고, 이 옵션을 켜면 `env_t`에 활성·폐기 표시용 `flags` 1 byte가 CRC 뒤에 추가됩니다(`include/env_internal.h`). 그래서 redundant 환경과 단일 환경은 같은 flash 영역을 그대로 읽을 수 없습니다. 이미 출하된 보드에서 이 옵션을 바꾸면 첫 부팅은 "bad CRC"로 기본값을 씁니다.

## 정리

- 환경은 CRC32 4 byte + `이름=값\0` 나열이며(redundant면 flags 1 byte 추가), QEMU에서 저장된 CRC와 host 계산이 일치했습니다.
- "bad CRC, using default environment"는 저장된 환경이 없거나 깨졌다는 뜻이고, 기본값은 `include/env_default.h` + `CFG_EXTRA_ENV_SETTINGS` + 보드 `.env`에서 옵니다(v2024.04에 `CONFIG_EXTRA_ENV_SETTINGS`는 없음).
- `setenv`는 RAM만 바꾸고, `saveenv`는 flash sector를 통째로 지우고 씁니다(QEMU: 439 byte 저장에 256 KiB 지움).
- 작은따옴표는 실행 때, 큰따옴표는 `setenv` 때 `${}`를 펼칩니다. `setenv x`는 삭제, `setenv x ""`는 빈 값입니다.
- `boot.scr`는 `mkimage -T script` 헤더가 있어야 실행되고, 표준 부팅으로 실행될 때만 `devtype`·`devnum`·`distro_bootpart`가 채워집니다.
- 스크립트가 kernel로 넘어가지 못하고 끝나면 bootstd는 `Boot failed (err=-14)`를 출력합니다.

## 다음 장 예고

다음 글에서는 *모던 U-Boot의 bootflow/bootmeth*를 봅니다. distro_bootcmd의 거대한 env 스크립트를 *C 코드 기반의 모듈*로 대체하는 새 모델입니다.

## 관련 항목

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — `boot.scr` 패턴
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — distroboot의 pxe/dhcp target
- [Ch 14: bootflow / bootmeth](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) — distro_bootcmd의 후계자
- [BSP Ch 6: U-Boot 포팅](/blog/embedded/bsp/chapter06-u-boot-porting) — 보드별 환경 설정
- [U-Boot v2025.01 Environment Variables](https://docs.u-boot.org/en/v2025.01/usage/environment.html)
- [U-Boot v2025.01 Distro Configuration](https://docs.u-boot.org/en/v2025.01/develop/distro.html)
