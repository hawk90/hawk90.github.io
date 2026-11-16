---
title: "U-Boot USB 부팅 — fastboot·UMS·USB host 메커니즘"
slug: "embedded/bootloader/chapter12-usb-boot"
date: 2026-05-09T09:12:00
description: "USB를 통한 부팅과 flash — fastboot, USB Mass Storage(UMS), USB host 부팅 흐름."
series: "Bootloader Internals"
seriesOrder: 12
tags: [embedded, bootloader, u-boot, usb, fastboot]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> USB 포트 하나가 U-Boot에서 세 가지 다른 일을 합니다. 보드가 **host**가 되어 USB 메모리를 읽거나, 보드가 **device(gadget)**가 되어 PC의 `fastboot`·DFU 도구와 이야기하거나, 보드의 저장 장치를 PC에 **USB 디스크(UMS)**로 내보입니다. 그리고 이 셋 모두 U-Boot가 이미 실행된 뒤의 일이라, ROM의 USB recovery와는 단계가 다릅니다.

이 글은 U-Boot **v2024.04** 소스를 기준으로 합니다. USB host와 Fastboot는 실제로 실행했습니다. `qemu_arm64_defconfig`에 `CONFIG_UDP_FUNCTION_FASTBOOT`를 켜고 Fastboot 버퍼를 `0x50000000`·`0x7000000`으로 정해 빌드했습니다. QEMU 11.1.3 `virt`에 XHCI controller와 USB 저장 장치(10장과 같은 GPT·ext4 이미지)를 붙여 실행했고, host 쪽 도구는 Android platform-tools의 `fastboot` 37.0.1입니다.

![U-Boot 진입 전의 Boot ROM USB recovery와, U-Boot 실행 후 board가 USB host로 저장 장치를 읽는 경우, USB gadget으로 Fastboot·DFU·UMS를 제공하는 경우를 나눈 구성도](/images/blog/bootloader/diagrams/ch12-usb-boot-modes.svg)

같은 포트라도 그림의 어느 칸에 있느냐에 따라 쓰는 명령과 빌드 옵션이 완전히 다릅니다. 아래에서 칸마다 하나씩 확인합니다.

## USB host — 블록 장치가 하나 더 생길 뿐

보드가 host일 때 USB 메모리는 [10장](/blog/embedded/bootloader/chapter10-storage-boot)의 SATA·NVMe와 같은 블록 장치가 됩니다. 실행 결과입니다.

```text
=> usb start
=> usb tree
USB device tree:
  1  Hub (5 Gb/s, 0mA)
  |  U-Boot XHCI Host Controller
  |
  |+-2  Mass Storage (5 Gb/s, 0mA)
       QEMU QEMU USB HARDDRIVE 1-0000:00:01.0-1

=> usb storage
  Device 0: Vendor: QEMU     Rev: 2.5+ Prod: QEMU HARDDISK
            Type: Hard Disk
            Capacity: 64.0 MB = 0.0 GB (131072 x 512)
=> part list usb 0

Partition Map for USB device 0  --   Partition Type: EFI
...
  1	0x00000800	0x000187ff	"boot"
=> load usb 0:1 ${kernel_addr_r} /boot/hello.txt
35 bytes read in 3 ms (10.7 KiB/s)
```

`usb start`가 아무것도 출력하지 않은 데는 이유가 있습니다. USB는 shell이 뜨기 훨씬 전, `board_late_init()`에서 이미 시작됐습니다. `board/emulation/qemu-arm/qemu-arm.c:118-120`이 "start usb so that usb keyboard can be used as input device"라는 주석과 함께 `CONFIG_USB_KEYBOARD`일 때 `usb_init()`을 부르고, 부팅 로그의 `Net:` 줄 앞 `scanning bus xhci_pci for devices... 2 USB Device(s) found`가 그 결과입니다. `usb_init()`이 `usb_started`를 세우므로, 그 뒤의 `CONFIG_PREBOOT="usb start"`도 제가 친 `usb start`도 `cmd/usb.c`에서 아무 말 없이 돌아갑니다. QEMU 환경의 `stdin=serial,usbkbd`처럼 USB 키보드를 콘솔로 쓰려면 shell 전에 USB가 올라와 있어야 하기 때문입니다. 실제 보드에서도 preboot에 `usb start`가 있으면 USB 장치 열거 시간만큼 부팅이 늦어집니다.

`usb tree`에서 저장 장치는 root hub 아래 2번 장치로 붙었고, `usb storage`가 그것을 `Device 0`으로 보여 줍니다. 그다음부터는 `part list usb 0`, `load usb 0:1`처럼 인터페이스 이름만 `usb`로 바꾸면 10장과 똑같습니다.

## Fastboot — PC와 주고받는 짧은 명령 프로토콜

Fastboot는 PC의 `fastboot` 도구가 짧은 텍스트 명령을 보내고 보드가 `OKAY`·`FAIL`·`DATA`로 답하는 프로토콜입니다. 식당 주문에 비유하면 손님(PC)이 주문서(명령)를 내고 주방(U-Boot)이 "됐습니다/안 됩니다"로 답하는 구조입니다. 보통은 USB로 연결하지만, U-Boot는 같은 명령 처리 코드를 UDP로도 열 수 있습니다(`fastboot [-l addr] [-s size] usb <controller> | udp`, `cmd/fastboot.c`). QEMU에는 USB device controller가 없으므로 UDP로 실행했습니다. 전송 방법만 다르고 명령과 응답은 같은 `drivers/fastboot/` 코드를 탑니다.

보드 쪽에서는 주소를 받고 대기 상태로 들어갑니다.

```text
=> setenv autoload no
=> dhcp
DHCP client bound to address 10.0.2.15 (1 ms)
=> fastboot udp
Using virtio-net#31 device
Listening for fastboot command on 10.0.2.15
```

(`autoload no`를 먼저 둔 이유는 [11장](/blog/embedded/bootloader/chapter11-network-boot)에서 본 `dhcp`의 자동 다운로드를 막기 위해서입니다.) PC 쪽에서는 QEMU가 UDP 5554를 넘겨주도록 하고 명령을 보냈습니다.

```text
$ fastboot -s udp:127.0.0.1 getvar version
version: 0.4
$ fastboot -s udp:127.0.0.1 getvar max-download-size
max-download-size: 0x07000000
$ fastboot -s udp:127.0.0.1 getvar product
product: qemu-arm
$ fastboot -s udp:127.0.0.1 getvar serialno
getvar:serialno                                    FAILED (remote: 'Value not set')
$ fastboot -s udp:127.0.0.1 getvar nonexistent
getvar:nonexistent                                 FAILED (remote: 'Variable not implemented')
```

응답 하나하나가 `drivers/fastboot/fb_getvar.c`의 어느 줄에서 나오는지 따라가면 보드 설정에서 무엇을 바꿔야 하는지가 보입니다.

| 변수 | 응답 | 값이 오는 곳 (v2024.04) |
| --- | --- | --- |
| `version` | `0.4` | `include/fastboot.h`의 `FASTBOOT_VERSION` (프로토콜 버전, U-Boot 버전 아님) |
| `max-download-size` | `0x07000000` | `fastboot_buf_size`, 곧 `CONFIG_FASTBOOT_BUF_SIZE` |
| `product` | `qemu-arm` | 환경 변수 `board` |
| `serialno` | FAIL `Value not set` | 환경 변수 `serial#` (QEMU에는 없음) |
| 그 밖 | FAIL `Variable not implemented` | 목록에 없는 이름 |

`serialno`가 실패한다는 것은 작은 일이 아닙니다. PC의 `fastboot devices`는 serial로 장치를 구분하므로, 여러 보드를 한 PC에 꽂아 쓰는 생산 라인에서는 보드마다 `serial#`을 채워 두어야 합니다. 그리고 `max-download-size`는 PC가 이미지를 쪼개는 기준입니다. AOSP `fastboot`(`fastboot/fastboot.cpp`)는 이 값을 sparse 한도로 읽고, 더 큰 이미지는 `resparse_file()`로 여러 sparse 조각으로 나눠 보냅니다. U-Boot 쪽은 `drivers/fastboot/fb_mmc.c`가 받은 조각을 `write_sparse_image()`로 풀어 씁니다. 버퍼를 작게 잡으면 이미지가 더 잘게 나뉘어 왕복이 늘어납니다.

### 내려받은 데이터는 어디로 가는가

`fastboot stage <file>`은 파일을 보드의 download 버퍼에 올리기만 하는 명령입니다. 64 KiB 난수 파일을 보냈습니다.

```text
$ fastboot -s udp:127.0.0.1 stage fb-payload.bin
Sending 'fb-payload.bin' (64 KB)                   OKAY [  0.007s]
```

보드 콘솔에는 `Starting download of 65536 bytes` … `downloading of 65536 bytes finished`가 찍혔습니다. Ctrl+C로 fastboot를 빠져나오면 `Abort`와 `fastboot udp error: -4`가 나오는데, -4는 `net/net.c`가 Ctrl+C를 감지했을 때 돌려주는 `-EINTR`입니다. 오류처럼 보이지만 정상 종료입니다. 그다음 버퍼를 확인했습니다.

```text
=> crc32 0x50000000 0x10000
crc32 for 50000000 ... 5000ffff ==> 3e6034f5
```

host에서 같은 파일의 CRC32도 `0x3e6034f5`였습니다. 데이터는 `CONFIG_FASTBOOT_BUF_ADDR`(`0x50000000`)에 그대로 놓입니다. 이 주소는 v2024.04 Kconfig에 SoC별 기본값만 있고 QEMU용은 없어서 직접 정했습니다. 실제 보드에서 이 버퍼가 [8장](/blog/embedded/bootloader/chapter08-board-init)의 `relocaddr` 아래 예약 영역이나 kernel 적재 주소와 겹치면, 큰 이미지를 받는 순간 U-Boot 자신이나 다른 이미지를 덮어씁니다. `bdinfo`의 예약 영역과 `max-download-size`를 함께 보고 정합니다.

`fastboot flash <partition>`은 이 버퍼의 내용을 저장 장치의 파티션에 쓰는 명령입니다. 쓰기 대상은 `CONFIG_FASTBOOT_FLASH`와 MMC·NAND 같은 backend 설정이 정하고, QEMU 빌드에는 그 backend가 없어 실행하지 않았습니다.

## DFU와 UMS — gadget이 있어야 하는 기능

DFU와 UMS는 USB device controller가 필요합니다. QEMU 빌드에서 `help dfu`를 보면 이 차이가 그대로 드러납니다.

```text
=> help dfu
dfu - Device Firmware Upgrade

Usage:
dfu     [list] - list available alt settings
tftp [<interface> <dev>] [<addr>]
  - device firmware upgrade via TFTP
```

USB 형식인 `dfu <USB_controller> [<interface> <dev>] [list]`는 `cmd/dfu.c`에서 `CONFIG_DFU_OVER_USB`일 때만 들어가므로, 이 빌드에는 TFTP 형식만 남았습니다. 같은 명령이라도 빌드 옵션에 따라 사용법 자체가 바뀝니다.

DFU가 어디에 쓸지는 `dfu_alt_info` 환경 변수가 정합니다. QEMU에서는 `printenv dfu_alt_info`가 `not defined`였습니다. `board/emulation/common/qemu_dfu.c`의 `set_dfu_alt_info()`는 이 변수가 필요한 순간에 `nor0` MTD의 파티션 목록으로 값을 만들고, 소스 주석에 따르면 그 용도는 EFI capsule update입니다. `mtd list`에 보이는 `nor0`(block size `0x20000`)이 그 대상입니다. 실제 보드에서는 보통 defconfig나 환경에 직접 적어 두며, 그 문법은 v2024.04 `doc/usage/dfu.rst`가 설명합니다.

UMS는 보드의 블록 장치를 PC에 USB 디스크로 내보이는 기능입니다. 명령은 `ums <USB_controller> [<devtype>] <dev[:part]>`이고 devtype을 생략하면 `mmc`입니다(`cmd/usb_mass_storage.c`). `CONFIG_CMD_USB_MASS_STORAGE`가 `USB_GADGET`과 `USB_GADGET_DOWNLOAD`에 의존하므로 QEMU 빌드에는 없습니다. 소스를 보면 끝나는 조건이 정해져 있습니다.

- 케이블 감지를 지원하는 보드는 "Please connect USB cable."을 띄우고 기다리다가 Ctrl+C나 timeout으로 끝납니다.
- 연결된 뒤에는 `fsg_main_thread()`가 오류를 돌려줄 때까지 돕니다. `-EIO`면 "Check USB cable connection", Ctrl+C(`-EPIPE`)면 "CTRL+C - Operation aborted"를 찍고 끝납니다.
- `CONFIG_CMD_UMS_ABORT_KEYED`가 켜져 있으면 아무 키로도 끝낼 수 있습니다.

UMS가 도는 동안 PC는 보드의 파티션을 자기 디스크처럼 씁니다. U-Boot는 그 사이 파일시스템 내용을 알지 못하므로, PC에서 unmount하기 전에 Ctrl+C로 끝내면 PC가 아직 쓰지 않은 캐시 데이터가 사라집니다. PC 쪽 eject를 먼저 하고 보드에서 Ctrl+C를 누르는 순서를 지킵니다.

## ROM의 USB recovery는 다른 단계

많은 SoC의 Boot ROM은 저장 장치에서 부팅할 수 없을 때 USB download 모드로 들어갑니다. 이것은 U-Boot가 실행되기 **전**의 일이라 위의 Fastboot·DFU·UMS와 관계가 없습니다. 진입 조건, 프로토콜, PC 도구는 SoC 제조사가 정합니다. 그래서 U-Boot의 eMMC boot partition을 잘못 바꿨을 때([10장](/blog/embedded/bootloader/chapter10-storage-boot)의 `mmc partconf`)나 U-Boot 자체가 망가졌을 때의 마지막 복구 수단이 됩니다. 새 보드를 받으면 쓰기 작업을 시작하기 전에 이 ROM recovery 경로가 실제로 동작하는지부터 확인해 두는 것이 안전합니다.

## 정리

- USB host 모드에서 USB 메모리는 블록 장치가 되어 `part list usb 0`, `load usb 0:1`로 읽습니다. QEMU 보드는 `board_late_init()`의 `usb_init()`으로 shell 전에 USB를 시작해서 `usb start`가 조용했습니다.
- Fastboot는 USB든 UDP든 같은 명령 처리 코드를 쓰고, `getvar` 응답은 `FASTBOOT_VERSION`, `CONFIG_FASTBOOT_BUF_SIZE`, 환경 변수 `board`·`serial#`에서 옵니다.
- `fastboot stage`로 보낸 데이터는 `CONFIG_FASTBOOT_BUF_ADDR`에 그대로 놓였고 CRC32가 host와 일치했습니다. 이 주소는 U-Boot 예약 영역과 겹치지 않게 직접 정합니다.
- 생산 라인처럼 여러 보드를 다룰 때는 `serial#`을 채워 둡니다. 비어 있으면 `serialno`가 FAIL입니다.
- DFU의 USB 사용법과 UMS는 USB gadget 빌드에서만 생기고, 대상은 `dfu_alt_info`와 `ums`의 devtype이 정합니다.
- UMS는 PC 쪽 eject → 보드 Ctrl+C 순서로 끝냅니다.

## 다음 장 예고

다음 글에서는 지금까지 손으로 친 명령들을 부팅 때 자동으로 실행하게 만드는 환경 변수와 `bootcmd`를 다룹니다.

## 관련 항목

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — local storage interface와 layout
- [Ch 11: 네트워크 부트](/blog/embedded/bootloader/chapter11-network-boot) — network download
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — boot command 설정
- [Ch 17: A/B 업데이트](/blog/embedded/bootloader/chapter17-ab-update) — update layout과 rollback
- [Ch 23: BootROM 내부](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — SoC ROM 및 boot configuration
- [Ch 30: Bootloader CI](/blog/embedded/bootloader/chapter30-bootloader-ci) — 자동화 검증
- [U-Boot v2024.04 `drivers/fastboot/fb_getvar.c`](https://github.com/u-boot/u-boot/blob/v2024.04/drivers/fastboot/fb_getvar.c)
- [U-Boot v2024.04 `cmd/usb_mass_storage.c`](https://github.com/u-boot/u-boot/blob/v2024.04/cmd/usb_mass_storage.c)
