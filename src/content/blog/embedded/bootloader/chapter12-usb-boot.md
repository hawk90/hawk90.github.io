---
title: "Ch 12: USB 부트 — fastboot, UMS, USB host"
date: 2026-05-09T12:00:00
description: "USB를 통한 부팅과 flash — fastboot, USB Mass Storage(UMS), USB host 부팅 흐름."
series: "Bootloader Internals"
seriesOrder: 12
tags: [embedded, bootloader, u-boot, usb, fastboot]
draft: false
---

## 한 줄 요약

**USB는 양산 라인의 download 인터페이스이자, 필드의 recovery 채널입니다.** fastboot로 이미지를 보내고, UMS로 eMMC를 노출하고, USB host로 외부 메모리에서 부팅하는 세 가지 흐름이 모두 U-Boot 안에 있습니다.

[11장](/blog/embedded/bootloader/chapter11-network-boot)에서 네트워크가 BSP 개발의 빠른 iteration 채널이었다면, USB는 *양산*과 *recovery*의 표준 채널입니다. flash가 비어 있는 보드, 양산 라인에서 막 PCB를 받아 첫 이미지를 굽는 단계, 필드에서 부트가 꼬여 USB로 다시 살려야 하는 단계 모두에서 USB가 쓰입니다.

이 글에서는 fastboot 프로토콜, UMS의 동작, USB host 부트의 흐름, 그리고 NXP `uuu`·TI `uniflash` 같은 양산 도구가 이 위에서 어떻게 구성되는지를 정리합니다.

## fastboot — Android에서 시작한 표준

fastboot는 Android 프로젝트에서 부트로더와 호스트 PC 사이의 *flash 프로토콜*로 출발했습니다. 지금은 *비-Android 임베디드*에서도 표준입니다. U-Boot에는 `fastboot` 명령이 들어 있고, USB gadget 위에서 동작합니다. USB 부트의 세 가지 모드를 먼저 보겠습니다.

![USB 부트 모드 — SDP, fastboot, UMS의 역할과 흐름](/images/blog/bootloader/diagrams/ch12-usb-boot-modes.svg)

```text
=> fastboot usb 0
fastboot_setup: gadget initialized
USB device 'fastboot' connected
[보드는 여기서 호스트의 명령을 기다림]
```

호스트 PC에서 `fastboot` 도구로 보드를 다룹니다.

```bash
# 보드가 연결됐는지 확인
$ fastboot devices
0a2a0123abcd    fastboot

# 변수 조회
$ fastboot getvar version-bootloader
version-bootloader: 2024.04
finished. total time: 0.001s

# 파티션에 이미지 굽기
$ fastboot flash boot      boot.img
$ fastboot flash system    system.img
$ fastboot flash userdata  userdata.img

# 재부팅
$ fastboot reboot
```

`fastboot flash <partition>`은 호스트의 파일을 보드의 *환경 변수에 정의된 파티션*에 씁니다. U-Boot 측에서 `fastboot_partition_alias_boot=/dev/mmcblk0p1` 같은 매핑을 환경 변수로 둡니다. 새 파티션이면 환경 변수만 추가하면 됩니다.

```text
fastboot_partition_alias_boot=mmc 0:1
fastboot_partition_alias_system=mmc 0:2
fastboot_partition_alias_userdata=mmc 0:3
```

## fastboot 프로토콜의 내부

fastboot는 *USB bulk endpoint*에서 4byte 헤더 + payload로 메시지를 주고 받습니다. 명령은 ASCII로, payload는 binary로 갑니다.


응답 접두사가 의미가 있습니다.

- `OKAY` — 성공
- `FAIL<reason>` — 실패
- `DATA<size>` — 데이터 받을 준비
- `INFO<message>` — 진행 로그

`OEM` 명령을 통해 *벤더별 확장*이 가능합니다. NXP는 `fastboot oem flash_uboot`, Qualcomm은 `fastboot oem unlock`을 추가합니다.

## UMS — eMMC를 PC에 노출

UMS(USB Mass Storage)는 *U-Boot가 USB device 모드로 들어가서, 보드의 eMMC를 PC에 USB 디스크처럼 노출*하는 기능입니다. PC에 꽂으면 외장 SD 리더와 똑같이 보입니다.

```text
=> ums 0 mmc 0
UMS: LUN 0, dev mmc 0, hwpart 0, sector 0x0, count 0x1d59000

[PC 측에서는 /dev/sdX로 디스크가 뜸]
```

```bash
# 호스트에서
$ lsblk
NAME   MAJ:MIN RM   SIZE RO TYPE
sda      8:0    1  14.9G  0 disk
├─sda1   8:1    1   256M  0 part
└─sda2   8:2    1  14.6G  0 part

# 그대로 이미지 굽기
$ sudo dd if=rootfs.img of=/dev/sda2 bs=4M status=progress
$ sudo sync
```

UMS의 가치는 *PC의 표준 도구*를 그대로 쓸 수 있다는 점입니다. `dd`, `fdisk`, `mkfs`, `partclone` 모두 동작합니다. fastboot가 *partition 단위*라면 UMS는 *raw sector 단위*입니다.

UMS 모드에서 빠져나오려면 PC에서 안전하게 unmount한 뒤, 보드 시리얼에서 Ctrl-C를 누릅니다. 부트로더 prompt로 돌아옵니다.

## USB host — 외부 메모리에서 부팅

위의 두 흐름은 *U-Boot가 USB device*였습니다. 반대로 U-Boot가 *USB host*가 되어 외부 USB stick에서 이미지를 읽을 수도 있습니다.

```text
=> usb start
starting USB...
Bus usb@38100000: Register 200000c0 NbrPorts 2
scanning bus usb@38100000 for devices... 2 USB Device(s) found
=> usb tree
USB device tree:
  1  Hub (480 Mb/s, 0mA)
  |  USB2.0 Hub
  |
  +-2  Mass Storage (480 Mb/s, 200mA)
       SanDisk Cruzer Glide 4C530001271107110353
=> ls usb 0:1
  10995712   image
   4587642   board.dtb
=> load usb 0:1 ${loadaddr} /boot/Image
=> booti ${loadaddr} - ${fdt_addr_r}
```

USB host 부트는 *recovery 미디어*나 *현장 업데이트*에 자주 쓰입니다. SD 슬롯이 없는 보드에서 USB stick을 꽂아 첫 이미지를 굽거나, 필드 엔지니어가 USB stick으로 펌웨어를 들고 다니며 업데이트하는 식입니다.

distroboot의 `boot_targets`에 `usb0`을 두면 USB stick의 `boot.scr`를 자동으로 찾아 실행합니다.

## USB download mode — boot ROM 레벨

가장 강력한 USB 채널은 *boot ROM이 직접 받는* download mode입니다. flash가 완전히 비어 있어도, BOOTSEL을 USB로 설정하면 boot ROM이 USB device로 깨어나 호스트의 명령을 기다립니다.

벤더마다 도구 이름이 다릅니다.

| SoC 벤더 | 호스트 도구 | 프로토콜 |
|----------|------------|----------|
| NXP i.MX | `uuu` (Universal Update Utility) | HID + bulk |
| TI | `uniflash`, `dfu-util` | USB DFU |
| Rockchip | `rkdeveloptool` | rockusb (custom) |
| Allwinner | `sunxi-fel` | FEL (custom) |
| Qualcomm | `qdl` | EDL (Sahara + Firehose) |

`uuu`는 *script로 다단계 다운로드*를 지원합니다.

```text
# emmc.uuu — uuu가 실행하는 스크립트
uuu_version 1.5.0

# SDP 프로토콜로 SPL을 SRAM에 적재
SDP: boot -f u-boot-spl.imx

# SPL이 메모리 위에서 main U-Boot를 받음
SDPU: write -f u-boot.itb
SDPU: jump

# main U-Boot가 fastboot 모드로 진입
FB: ucmd setenv fastboot_buffer ${loadaddr}
FB: ucmd setenv fastboot_dev mmc 0
FB: flash bootloader1   u-boot-with-spl.bin
FB: flash boot          boot.img
FB: flash system        system.img
FB: done
```

호스트에서는 `uuu emmc.uuu` 한 줄이면 빈 보드에서 *부트로더 → 메인 U-Boot → 양산 이미지*까지 한 번에 굽힙니다. 양산 라인의 *jig*가 이 명령 하나로 보드 한 장을 처리하게 됩니다.

### fastboot 파티션 설정 예시

U-Boot의 환경 변수로 fastboot가 접근하는 파티션을 정의합니다.

```text
# U-Boot 환경 변수
=> setenv fastboot_raw_partition_bootloader "0x8000 0x1000 mmcpart 1"
=> setenv fastboot_partition_alias_boot "mmc 0:1"
=> setenv fastboot_partition_alias_rootfs "mmc 0:2"
=> setenv fastboot_partition_alias_data "mmc 0:3"
=> saveenv

# 호스트에서 flash
$ fastboot flash boot Image
$ fastboot flash rootfs rootfs.ext4
$ fastboot flash data userdata.img
```

raw partition은 GPT 없이 *offset과 크기*를 직접 지정합니다. boot partition에 SPL/U-Boot를 쓸 때 유용합니다.

## USB host vs USB device 모드

U-Boot의 USB 스택은 *방향이 두 가지*입니다. 하나는 *host*로 동작해서 외부 USB stick을 enumerate하는 흐름, 다른 하나는 *device*(gadget)로 동작해서 PC에 노출되는 흐름입니다. 한 보드에서 두 모드를 *번갈아 가며* 쓰는 경우가 흔합니다.

| 모드 | 역할 | 대표 명령 | 사용처 |
|------|------|----------|--------|
| host | enumerate, mass storage 읽기 | `usb start`, `usb tree`, `load usb 0:1` | USB stick 부트, 펌웨어 복사 |
| device (DFU) | 호스트의 download 받기 | `dfu 0 mmc 0` | 양산 단계 첫 굽기 |
| device (fastboot) | partition 단위 flash | `fastboot usb 0` | Android·일반 OTA |
| device (UMS) | eMMC를 disk로 노출 | `ums 0 mmc 0` | 디버깅·임시 rootfs 굽기 |

물리적으로는 *같은 USB controller·같은 포트*가 모드 전환을 하는 경우가 많습니다. i.MX의 OTG 포트나 STM32의 dual-role 포트가 대표적입니다. U-Boot 진입 시점에는 host로 enumerate하다가, 호스트 PC가 보이지 않으면 device 모드로 전환하는 fallback도 자주 씁니다.

```text
=> usb start
starting USB...
[no devices found]
=> fastboot usb 0
[device 모드로 전환, PC에서 인식]
```

Kconfig 측면에서는 두 스택이 *별개*입니다. host는 `CONFIG_USB_EHCI_HCD` 또는 `CONFIG_USB_XHCI_HCD`로, device는 `CONFIG_USB_GADGET`과 그 하위 `CONFIG_USB_GADGET_DOWNLOAD`로 켭니다. 한 binary에 둘 다 들어가지만, *런타임에 한 번에 한 모드만* 동작합니다.

## DFU — Device Firmware Upgrade

DFU는 USB-IF가 정의한 *표준 펌웨어 업데이트 프로토콜*입니다. fastboot가 Android 진영의 사실상 표준이라면, DFU는 *벤더 중립*의 산업 표준입니다. STM32·NXP·TI 모두 DFU를 지원하고, 호스트 도구는 `dfu-util` 하나로 통일됩니다.

U-Boot에서 DFU를 켜려면 *어떤 storage를 어떤 alt setting으로 노출할지*를 환경 변수 `dfu_alt_info`에 적습니다.

```text
=> setenv dfu_alt_info "u-boot raw 0x80 0x800 mmcpart 1; \
                        boot part 0 1; \
                        rootfs part 0 2"
=> setenv dfu_alt_info_mmc "${dfu_alt_info}"
=> dfu 0 mmc 0
```

호스트에서는 alt setting 번호로 대상을 고릅니다.

```bash
# 사용 가능한 alt 목록 조회
$ dfu-util -l
Found DFU: [0525:a4a5] alt=0, name="u-boot", serial="UNKNOWN"
Found DFU: [0525:a4a5] alt=1, name="boot",   serial="UNKNOWN"
Found DFU: [0525:a4a5] alt=2, name="rootfs", serial="UNKNOWN"

# alt 0 (u-boot)에 SPL+U-Boot 굽기
$ dfu-util -a 0 -D u-boot-with-spl.bin

# alt 2 (rootfs)에 이미지 굽기
$ dfu-util -a rootfs -D rootfs.ext4
```

DFU의 장점은 *raw offset, partition, NAND, SPI flash*를 한 프로토콜로 다 다룬다는 점입니다. fastboot는 partition 추상화에 가깝지만, DFU는 *physical layout*에 더 가깝습니다. SPI NOR에 SPL을 굽고 eMMC에 rootfs를 굽는 *혼합 storage* 보드에서 진가가 나옵니다.

## USB fastboot 추가 디테일

앞서 본 fastboot의 protocol 측면을 *U-Boot 빌드* 관점에서 보겠습니다. fastboot는 `CONFIG_FASTBOOT`와 그 하위 옵션으로 켭니다.

```text
# defconfig 발췌
CONFIG_USB_GADGET=y
CONFIG_USB_GADGET_DOWNLOAD=y
CONFIG_FASTBOOT=y
CONFIG_FASTBOOT_BUF_ADDR=0x42000000
CONFIG_FASTBOOT_BUF_SIZE=0x10000000
CONFIG_FASTBOOT_FLASH=y
CONFIG_FASTBOOT_FLASH_MMC_DEV=0
CONFIG_FASTBOOT_CMD_OEM_FORMAT=y
```

`FASTBOOT_BUF_ADDR`이 *호스트가 보낸 이미지를 임시로 받는 RAM 주소*입니다. DDR 크기에 맞춰 충분히 크게 잡아야 큰 partition을 한 번에 받을 수 있습니다. 256MB 미만으로 잡으면 큰 system 이미지가 `FAILtoo large`로 끊깁니다.

```bash
# 보드에서 fastboot 모드 진입
=> fastboot usb 0

# 호스트에서 partition flash
$ fastboot flash u-boot u-boot.imx
Sending 'u-boot' (1024 KB)        OKAY [  0.034s]
Writing 'u-boot'                  OKAY [  0.123s]
Finished. Total time: 0.181s
```

`fastboot flash u-boot`은 환경 변수 `fastboot_partition_alias_u-boot=...`을 따라 *eMMC boot partition*이나 *raw offset*으로 갑니다. partition 이름은 *프로젝트 규약*이고, U-Boot 환경 변수가 *실제 매핑*입니다.

OEM 명령으로 *벤더 확장*도 가능합니다. `fastboot oem format`은 GPT를 다시 쓰고, `fastboot oem partconf`는 eMMC boot partition을 활성화합니다.

## UMS gadget — 보드를 USB disk로

UMS는 앞서 한 번 다뤘지만, *gadget* 관점에서 한 번 더 짚어 보겠습니다. U-Boot의 UMS는 *Linux의 g_mass_storage 드라이버*와 같은 USB Mass Storage class를 구현합니다. PC 입장에서 보드는 *그냥 USB 디스크*입니다.

```text
# 단일 LUN
=> ums 0 mmc 0

# 다중 LUN (eMMC 두 개를 동시에 노출)
=> ums 0 mmc 0,1

# eMMC boot partition을 노출
=> mmc dev 0 1
=> ums 0 mmc 0
```

PC 측에서는 `/dev/sda`로 잡히고, 일반 USB stick과 똑같이 다룹니다.

```bash
# 파티션 테이블 확인
$ sudo fdisk -l /dev/sda

# 이미지를 raw로 굽기
$ sudo dd if=image.wic of=/dev/sda bs=4M conv=fsync status=progress

# 파일 시스템 마운트해서 파일 단위 작업
$ sudo mount /dev/sda2 /mnt
$ sudo cp -a rootfs/* /mnt/
$ sudo umount /mnt
```

UMS의 강점은 *PC의 표준 도구*가 그대로 동작한다는 점입니다. `dd`, `gparted`, `partclone`, `rsync`까지 모두 그대로 씁니다. fastboot가 binary blob 전송에 강하다면, UMS는 *파일 시스템 단위 작업*에 강합니다. 개발 중 rootfs를 자주 갈아 끼울 때 가장 빠른 방법입니다.

[Ch 10](/blog/embedded/bootloader/chapter10-storage-boot)에서 본 storage stack 위에 UMS가 *얇은 USB 래퍼*로 얹히는 구조입니다.

## SDP — NXP BootROM의 USB 다운로드

SDP(Serial Download Protocol)는 NXP i.MX BootROM이 *USB 위에서 직접 받는* 프로토콜입니다. flash가 완전히 비어 있는 보드도, BOOT 핀을 `USB`로 두고 USB cable을 꽂으면 BootROM이 SDP device로 깨어납니다. U-Boot가 들어가기 *전*의 단계라는 점이 핵심입니다.

호스트 도구는 NXP의 `uuu`입니다.

```bash
# 가장 단순한 형태 — SPL 한 개만 SRAM에 적재
$ uuu -v u-boot.imx

# 스크립트로 다단계 처리
$ uuu -v emmc-full.uuu
```

`uuu -v`의 `-v`는 *verbose*로, 각 단계의 protocol 전이를 보여줍니다. 양산 라인 디버깅에 필수입니다.

```text
$ uuu -v u-boot.imx
uuu (Universal Update Utility) for nxp imx chips -- libuuu_1.5.21-0
Wait for Known USB Device Appear...
New USB Device Attached at 1:34
1:34     1/ 2 [=================100%=================] SDP: boot -f u-boot.imx
1:34     2/ 2 [=================100%=================] SDP: done
```

SDP는 단계별로 protocol이 바뀝니다.

| 단계 | Protocol | 역할 |
|------|----------|------|
| BootROM | SDP | SPL을 SRAM에 적재 |
| SPL | SDPU / SDPV | main U-Boot를 DDR에 받음 |
| main U-Boot | FastBoot (FB) | partition 단위 flash |

`uuu`의 스크립트(`.uuu` 파일)는 이 *단계 전이*를 자동화합니다. 양산 jig가 SPI flash·eMMC가 빈 보드를 받아서 한 번에 부트로더부터 OS까지 굽는 경우, 이 스크립트 한 장이 핵심입니다. [Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp-internals)에서 BootROM 내부를 더 깊이 봅니다.

## USB recovery boot — 필드 복구 시나리오

production 보드의 SPI flash나 eMMC가 *손상*된 경우, USB가 마지막 복구 채널입니다. recovery 시나리오는 *얼마나 깊이 망가졌는가*에 따라 다릅니다.

| 손상 단계 | recovery 채널 | 도구 |
|----------|--------------|------|
| rootfs만 손상 | USB host 또는 UMS | `dd`, `fastboot flash rootfs` |
| kernel 손상, U-Boot OK | fastboot 또는 DFU | `fastboot flash boot` |
| U-Boot env 깨짐 | USB host에서 `env import` | `usb start; load usb 0 ...` |
| U-Boot 본체 손상 | DFU (SPL은 살아 있을 때) | `dfu-util -a u-boot -D u-boot.bin` |
| SPL까지 손상 | BootROM USB (SDP/USB-DFU) | `uuu`, `sunxi-fel`, `rkdeveloptool` |
| eFuse·BootROM 손상 | RMA | 없음 |

SPI flash가 깨졌어도 *BootROM의 USB fallback*이 살아 있으면 보드는 복구 가능합니다. 이 fallback의 존재가 *recovery 가능 보드 vs 벽돌 보드*를 가릅니다. 보드 디자인 단계에서 BOOT 핀이나 jumper로 USB fallback에 진입할 수 있게 *반드시* 두어야 합니다.

```bash
# 시나리오: SPI flash의 U-Boot가 손상, BOOTSEL을 USB로 전환
# BootROM이 USB device로 깨어남
$ uuu -v rescue.uuu

# rescue.uuu 내용
uuu_version 1.5.0
SDP: boot -f u-boot-spl-rescue.imx
SDPU: write -f u-boot-rescue.itb
SDPU: jump
# 이 시점에 U-Boot가 RAM 위에서 동작
FB: ucmd sf probe
FB: ucmd sf erase 0 0x100000
FB: flash u-boot u-boot-prod.imx
FB: done
```

RAM에서 띄운 *임시 U-Boot*가 SPI flash의 본체 U-Boot를 다시 굽는 흐름입니다.

## factory provisioning 워크플로

양산 라인에서 *빈 PCB → 검증된 완제품*까지 가는 USB 워크플로를 정리하겠습니다. 핵심은 *한 명령으로 모든 단계*가 끝나는 자동화입니다.

| # | 단계 |
|---|------|
| 1 | 빈 PCB → jig 장착 → USB 연결 → 전원 인가 |
| 2 | BootROM USB SDP enumerate |
| 3 | uuu 스크립트 실행 (호스트) |
| 4a | SPL → SRAM 적재 |
| 4b | U-Boot → DDR 적재 |
| 4c | fastboot 모드 진입 |
| 5 | partition 단위 flash |
| 6 | reboot 및 검증 |

4a / 4b / 4c는 uuu 스크립트가 *순차로* 진행하는 단계입니다.

전형적인 `factory.uuu` 스크립트입니다.

```text
uuu_version 1.5.0

# 1. BootROM이 받은 SPL을 SRAM에 적재
SDP: boot -f flash.bin

# 2. SPL이 RAM 위에서 main U-Boot 받기
SDPU: write -f u-boot.itb
SDPU: jump

# 3. main U-Boot가 fastboot 모드로 전환되면 partition flash
FB: ucmd setenv fastboot_dev mmc
FB: ucmd setenv mmcdev 0
FB: ucmd mmc dev 0
FB: flash bootloader flash.bin
FB: flash gpt        partition-table.img
FB: flash boot       boot.img
FB: flash rootfs     rootfs.ext4
FB: flash userdata   userdata.img

# 4. 마지막 검증 — 환경 변수 초기화 후 부팅
FB: ucmd setenv serial# ${UUID}
FB: ucmd env save
FB: reboot
```

호스트에서는 `uuu factory.uuu`로 한 번에 굽고, *시리얼 콘솔 로그*를 함께 캡처해서 [Ch 30](/blog/embedded/bootloader/chapter30-bootloader-ci)의 CI factory pipeline이 PASS/FAIL을 판정합니다. 양산 jig는 보통 *USB 허브 + 시리얼 어댑터 + 전원 제어*가 한 보드에 들어가서, 작업자는 PCB만 끼우면 됩니다.

## USB 디버깅 — 흔한 실수 정리

USB는 *cable·controller·driver·protocol* 어느 층에서나 깨질 수 있어서 디버깅이 까다롭습니다. 양산 라인에서 자주 만나는 패턴입니다.

- **EHCI vs XHCI driver 불일치.** SoC가 USB 3.0(XHCI)인데 U-Boot defconfig가 EHCI만 켜진 경우, `usb start`가 enumerate에 실패합니다. `CONFIG_USB_XHCI_HCD=y`를 추가하세요. 반대로 EHCI 전용 보드에 XHCI driver만 들어 있어도 같은 증상이 나옵니다.
- **DFU offset 잘못 계산.** `dfu_alt_info`의 raw offset이 다른 partition을 덮어쓰는 경우입니다. SPL과 U-Boot가 같은 raw 영역을 두고 충돌하면 다음 부팅이 안 됩니다. *partition 테이블*을 그려 두고 offset을 맞추세요.
- **fastboot LUN 헷갈림.** eMMC는 보통 user area + boot0 + boot1 + RPMB로 *4개 LUN*입니다. `fastboot_dev mmc 0` 만으로는 user area만 보입니다. boot partition에 SPL을 쓰려면 `mmc partconf 0 1 1 1`로 boot0를 활성화하고 `mmc dev 0 1`로 전환해야 합니다.
- **USB OTG ID 핀.** dual-role 포트는 ID 핀이 *grounded* 되어야 host로 깨어납니다. micro-AB가 아닌 일반 micro-B cable로는 host 모드 진입이 안 됩니다. OTG cable이나 hub를 쓰세요.
- **`uuu`가 device를 찾지 못함.** Windows에서는 *signed driver*가 필요합니다. NXP의 `uuu_run.exe`와 함께 제공되는 `imx_usb_loader` driver를 설치하세요. Linux에서는 udev 규칙만 추가하면 됩니다.

## 자주 하는 실수

- **USB cable이 *data 라인 없는* power-only입니다.** 보드가 enumerate되지 않으면 cable부터 의심하세요.
- **`fastboot`가 *권한 부족*으로 디바이스를 못 봅니다.** Linux 호스트에서 `udev` 규칙을 만들어 일반 유저에게 USB device 접근 권한을 주세요.
  ```text
  # /etc/udev/rules.d/51-android.rules
  SUBSYSTEM=="usb", ATTR{idVendor}=="0a2a", MODE="0666"
  ```
- **UMS 중에 보드를 재부팅합니다.** PC가 disk를 캐시하고 있으므로, unmount 없이 끊으면 *eMMC의 슈퍼블록*이 깨질 수 있습니다. 반드시 unmount → Ctrl-C 순서로.
- **`uuu`가 SDP를 못 찾습니다.** BOOTSEL을 USB로 두지 않았거나, *recovery jumper*를 안 채운 경우입니다. 보드 매뉴얼대로 jumper를 설정하세요.
- **fastboot 파티션 alias가 환경 변수에 없습니다.** `fastboot flash boot`이 "unknown partition"으로 실패합니다. `fastboot_partition_alias_boot=...`을 env에 추가하세요.

## 정리

- fastboot는 partition 단위의 USB flash 프로토콜이고, U-Boot의 `fastboot usb 0` 한 줄로 시작합니다.
- UMS는 eMMC를 PC에 USB 디스크로 노출합니다. `dd`·`fdisk` 같은 표준 도구를 그대로 씁니다.
- USB host 부트는 USB stick에서 직접 부팅하는 흐름이고, 필드 recovery에 유용합니다.
- boot ROM 레벨의 USB download는 벤더별 도구(`uuu`, `rkdeveloptool`, `sunxi-fel`)가 다룹니다.
- 양산 라인은 *jig + uuu 스크립트* 조합으로 보드 한 장을 한 명령으로 처리합니다.
- USB cable, udev 권한, BOOTSEL jumper가 1차 실패 원인입니다.

## 다음 장 예고

다음 글에서는 U-Boot의 *환경 변수*와 *bootcmd*를 봅니다. `saveenv`의 저장 위치, distro_bootcmd의 구조, 그리고 환경 변수 redundancy까지 정리합니다.

## 관련 항목

- [Ch 10: storage 드라이버](/blog/embedded/bootloader/chapter10-storage-boot) — UMS·DFU의 backend
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — 다른 download 채널
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — fastboot 환경 변수
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update) — fastboot 위에서의 OTA
- [Ch 23: BootROM 내부](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp-internals) — SDP·USB fallback의 출발점
- [Ch 30: CI factory pipeline](/blog/embedded/bootloader/chapter30-bootloader-ci) — `uuu` 자동화의 위층
- [Security Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update) — fastboot의 보안 측면
- [Android fastboot Protocol](https://source.android.com/docs/core/architecture/bootloader/fastboot-overview)
