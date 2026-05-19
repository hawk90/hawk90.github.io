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

fastboot는 Android 프로젝트에서 부트로더와 호스트 PC 사이의 *flash 프로토콜*로 출발했습니다. 지금은 *비-Android 임베디드*에서도 표준입니다. U-Boot에는 `fastboot` 명령이 들어 있고, USB gadget 위에서 동작합니다.

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

![fastboot 프로토콜 — 호스트와 보드 간의 getvar/download/flash 메시지 교환](/images/blog/bootloader/diagrams/chapter12-fastboot-seq.svg)

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

- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — 다른 download 채널
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — fastboot 환경 변수
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update) — fastboot 위에서의 OTA
- [Security Ch 6: OTA Update](/blog/embedded/embedded-security/chapter06-ota-update) — fastboot의 보안 측면
- [Android fastboot Protocol](https://source.android.com/docs/core/architecture/bootloader/fastboot-overview)
