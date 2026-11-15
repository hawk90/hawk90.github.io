---
title: "임베디드 네트워크 부팅 — TFTP·PXE·BOOTP 시퀀스 분석"
slug: "embedded/bootloader/chapter11-network-boot"
date: 2026-05-09T09:11:00
description: "네트워크를 통한 부팅 — DHCP/BOOTP·TFTP·PXE의 단계와 U-Boot 명령."
series: "Bootloader Internals"
seriesOrder: 11
tags: [embedded, bootloader, u-boot, tftp, pxe]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> U-Boot의 네트워크 부팅은 **DHCP 네 메시지로 주소와 파일 이름을 받고, TFTP로 블록마다 ACK를 주고받으며 파일을 받는 일**입니다. 기본 설정에서 `dhcp`는 주소만 받지 않고 bootfile까지 내려받으며, `pxe get`은 설정 파일을 열 개 넘는 이름으로 차례로 찾습니다. 둘 다 패킷을 보면 바로 드러납니다.

이 글의 출력과 패킷은 U-Boot **v2024.04**를 `qemu_arm64_defconfig`로 빌드해 QEMU 11.1.3 `virt`에서 실행하고, QEMU user-mode 네트워크(`-netdev user,tftp=<dir>,bootfile=payload.bin`)의 내장 DHCP·TFTP 서버에 붙인 결과입니다. 패킷은 `-object filter-dump`로 pcap에 저장해 `tcpdump`로 읽었습니다. 시험 파일 `payload.bin`은 2 MiB(2,097,152 byte) 난수입니다.

[10장](/blog/embedded/bootloader/chapter10-storage-boot)의 로컬 저장 장치 대신 네트워크에서 파일을 받으면, 개발 중에 보드의 flash를 계속 다시 쓰지 않고도 새 kernel·DTB를 시험할 수 있습니다.

![U-Boot target이 DHCP/BOOTP server에서 주소와 bootfile 정보를 받고, PXE를 쓸 때 TFTP server에서 config를 읽은 뒤 tftpboot로 kernel과 DTB를 받으며, kernel 단계에서 별도로 NFS root를 mount하는 순서도](/images/blog/bootloader/diagrams/ch11-network-boot-flow.svg)

그림의 네 단계 중 앞의 세 단계는 아래에서 실제 패킷으로 확인합니다. 마지막 NFS root mount는 U-Boot가 아니라 kernel이 하는 별도 단계입니다.

## DHCP — 네 메시지와 U-Boot가 보내는 정보

`dhcp`를 실행했을 때 오간 패킷을 시간 순서대로 보면 교과서의 네 메시지 그대로입니다.

```text
0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request from 52:54:00:12:34:56
    DHCP-Message (53): Discover
    ARCH (93): 22
    Vendor-Class (60): "U-Boot.armv8"
    Parameter-Request (55): Subnet-Mask (1), Default-Gateway (3), Domain-Name-Server (6), Hostname (12)
10.0.2.2.67 > 255.255.255.255.68: BOOTP/DHCP, Reply
    Your-IP 10.0.2.15
    Server-IP 10.0.2.2
    file "payload.bin"
    DHCP-Message (53): Offer
0.0.0.0.68 > 255.255.255.255.67: ... DHCP-Message (53): Request
10.0.2.2.67 > 255.255.255.255.68: ... DHCP-Message (53): ACK
```

(`tcpdump -v` 출력에서 주요 줄만 남겼습니다.)

U-Boot가 Discover에 싣는 두 값은 빌드 설정에서 옵니다. option 60 `"U-Boot.armv8"`은 `CONFIG_BOOTP_VCI_STRING`이고, option 93 값 22는 `CONFIG_BOOTP_PXE_CLIENTARCH=0x16`입니다(`cmd/Kconfig`에서 ARM64 기본값이 `0x16`, 32-bit ARM은 `0x15`). DHCP 서버는 이 두 값을 보고 "ARM64 U-Boot에게는 이 파일을 주라"처럼 클라이언트별로 다른 bootfile을 줄 수 있습니다.

서버의 응답에서 파일 이름은 DHCP option 67이 아니라 BOOTP 헤더의 `file` 필드(`file "payload.bin"`)에, TFTP 서버 주소는 `Server-IP`(`siaddr`) 필드에 실렸습니다. 서버 구현에 따라 이 정보를 option 66·67로 보내기도 하므로, 실제로 어느 쪽에 실렸는지는 이렇게 패킷으로 보는 것이 가장 확실합니다. 결과는 환경 변수로 남습니다.

```text
=> printenv ipaddr serverip netmask gatewayip bootfile
ipaddr=10.0.2.15
serverip=10.0.2.2
netmask=255.255.255.0
gatewayip=10.0.2.2
bootfile=payload.bin
```

## `dhcp`가 파일까지 받는 이유 — `autoload`

주소만 받으려고 `dhcp`를 쳤는데 콘솔은 이렇게 끝났습니다.

```text
=> printenv autoload
## Error: "autoload" not defined
=> dhcp
BOOTP broadcast 1
DHCP client bound to address 10.0.2.15 (2 ms)
Using virtio-net#31 device
TFTP from server 10.0.2.2; our IP address is 10.0.2.15
Filename 'payload.bin'.
Load address: 0x40200000
Loading: *#################################################################
...
Bytes transferred = 2097152 (200000 hex)
```

`net/net.c`의 `net_auto_load()`가 원인입니다. DHCP가 끝나면 이 함수가 `env_get_yesno("autoload")`를 보고, 값이 `no`(0)일 때만 멈춥니다. 변수가 없으면 -1이 돌아오므로(`env/common.c`) 멈추지 않고 `tftp_start(TFTPGET)`으로 bootfile을 `loadaddr`(QEMU에서는 `0x40200000`)에 받습니다. 즉 **`autoload`가 없으면 "예"로 취급됩니다**.

이 동작은 두 가지 문제를 만들 수 있습니다. 하나는 시간입니다. bootfile이 큰 rootfs 이미지라면 주소만 필요한 `dhcp`가 수십 MB를 받습니다. 다른 하나는 메모리입니다. `loadaddr`가 다른 이미지를 이미 올려 둔 자리와 겹치면 덮어씁니다. 주소만 필요한 스크립트라면 앞에 `setenv autoload no`를 둡니다.

## TFTP — 블록 크기와 패킷 수

`tftpboot`가 보내는 첫 요청(RRQ)에는 U-Boot가 원하는 옵션이 붙고, 서버는 OACK로 받아들인 값을 돌려줍니다.

```text
10.0.2.15.3394 > 10.0.2.2.69: TFTP, length 43, RRQ "payload.bin" octet timeout 5 blksize 1468
10.0.2.2.69 > 10.0.2.15.3394: TFTP, length 15, OACK blksize 1468
```

`blksize 1468`은 `CONFIG_TFTP_BLOCKSIZE`의 기본값입니다(`net/Kconfig`). 도움말은 이 값을 "Ethernet MTU 1500에서 헤더를 뺀 크기"라고 설명합니다. 실제로 IPv4 헤더 20 B, UDP 헤더 8 B, TFTP DATA 헤더 4 B를 빼면 `1500 - 20 - 8 - 4 = 1468`이 되어, 블록 하나가 IP fragment 없이 한 프레임에 들어갑니다. `windowsize` 옵션은 보이지 않는데, `net/tftp.c`가 값이 1보다 클 때만 붙이고 이 빌드는 `CONFIG_TFTP_WINDOWSIZE=1`이기 때문입니다. window가 1이면 **DATA 하나를 받을 때마다 ACK 하나를 보내고 다음 DATA를 기다립니다**.

같은 2 MiB 파일을 `tftpblocksize` 환경 변수만 바꿔 두 번 받았습니다.

| `tftpblocksize` | RRQ 옵션 | 서버가 보낸 DATA 수 | 마지막 DATA |
| --- | --- | --- | --- |
| 기본 (1468) | `blksize 1468` | 1,429 | block 1429, 데이터 848 B |
| `512` | `blksize 512` | 4,097 | block 4097, 데이터 0 B |

1,429는 2,097,152 ÷ 1468의 올림이고, 마지막 블록의 848 B는 그 나머지입니다. 512일 때가 흥미롭습니다. 2 MiB는 512로 나누어떨어지므로 데이터는 4,096 블록이면 충분한데, DATA가 하나 더 갔고 그 크기는 0입니다. RFC 1350은 "512 byte보다 작은 data packet이 전송의 끝을 알린다"고 정하고, `blksize` 옵션을 정의한 RFC 2348은 이 기준을 협상된 블록 크기로 바꿉니다. 그래서 파일이 블록 크기의 정확한 배수이면 빈 블록을 하나 더 보내야 끝이 전달됩니다. 1468 B 전송에서는 마지막 블록이 848 B라 빈 블록이 필요 없었습니다.

window가 1이므로 DATA 수가 곧 왕복 횟수입니다. 블록을 512로 줄이면 왕복이 1,429번에서 4,097번으로 약 2.9배 늘어나고, 지연이 큰 네트워크일수록 그만큼 느려집니다. 전송 속도 숫자도 콘솔에 찍히지만(`40 MiB/s` 등), QEMU 내부 네트워크에서는 같은 명령도 실행마다 수 배씩 달라서 비교 근거로 쓰지 않았습니다. 패킷 수는 매번 같습니다.

받은 파일이 맞는지는 U-Boot의 `crc32`와 host 쪽 계산을 비교하면 됩니다.

```text
=> crc32 ${kernel_addr_r} ${filesize}
crc32 for 40400000 ... 405fffff ==> 0873ec53
```

host에서 Python `zlib.crc32()`로 같은 파일을 계산해도 `0x0873ec53`이 나왔습니다. 파일이 없을 때는 서버가 ERROR 패킷으로 답하고 U-Boot는 다시 시도하지 않습니다.

```text
=> tftpboot ${kernel_addr_r} nosuchfile
...
TFTP error: 'File not found' (1)
Not retrying...
```

## PXE — 설정 파일을 찾는 순서

`pxe get`은 PXELINUX 방식으로 설정 파일을 찾습니다. TFTP 서버의 `pxelinux.cfg/default`에 설정을 두고 실행했더니, U-Boot는 이 파일에 닿기 전까지 열 개의 이름을 먼저 요청했습니다. 패킷의 RRQ 순서 그대로입니다.

| 순서 | 요청한 파일 | 어디서 온 이름인가 (v2024.04 `cmd/pxe.c`) |
| --- | --- | --- |
| 0 | (요청 없음) | `pxeuuid` 환경 변수. 없어서 "missing environment variable: pxeuuid" 출력 |
| 1 | `pxelinux.cfg/01-52-54-00-12-34-56` | `ethaddr` 앞에 ARP 형식 `01-` |
| 2~9 | `0A00020F`, `0A00020`, … `0A`, `0` | IP 10.0.2.15를 `%08X`로 쓴 뒤 끝에서 한 글자씩 지움(`pxe_ipaddr_paths()`) |
| 10 | `pxelinux.cfg/default-arm` | `"default-" CONFIG_SYS_ARCH` |
| 11 | `pxelinux.cfg/default` | 마지막 기본값 → 찾음 |

IP를 한 글자씩 줄이는 이유는 서브넷 단위로 설정을 나누기 위해서입니다. 예를 들어 `0A0002`라는 파일을 두면 10.0.2.x 대역의 모든 보드가 그 설정을 받습니다. `default-arm` 앞에 `default-<arch>-<soc>-<board>`, `default-<arch>-<soc>`도 시도하도록 되어 있지만, QEMU 빌드는 `CONFIG_SYS_SOC`가 없어서 `default-arm`부터 시작했습니다. 실제 보드에서는 SoC·보드 이름으로 된 기본 설정을 둘 수 있다는 뜻입니다.

그리고 끝에 이런 줄이 찍힙니다.

```text
Bytes transferred = 83 (53 hex)
Config file 'payload.bin' found
```

실제로 받은 것은 83 byte짜리 `pxelinux.cfg/default`인데 이름은 `payload.bin`으로 나옵니다. `pxe_get()`의 성공 경로가 찾은 파일 이름 대신 `env_get("bootfile")`을 돌려주기 때문입니다. 소스 주석도 "크기는 돌려주지만 이름은 돌려주지 않는다"고 적어 둡니다. 로그만 보고 "PXE가 bootfile을 설정 파일로 읽었다"고 판단하면 틀립니다. 어느 파일이 실제로 왔는지는 바로 위의 `Filename '…'` 줄이나 패킷으로 봅니다.

설정 파일 문법은 v2024.04의 `doc/README.pxe`가 설명하는 PXELINUX의 부분 집합입니다. 이 실험의 `default`는 다음과 같았습니다. `payload.bin`은 kernel이 아니므로 `pxe boot`는 실행하지 않았습니다. 같은 문서에 따르면 `pxe boot`가 `fdt` 항목의 파일을 받으려면 `fdt_addr_r`이 설정되어 있어야 합니다. [10장](/blog/embedded/bootloader/chapter10-storage-boot)에서 본 것처럼 QEMU 기본 환경에는 이 변수가 없으므로, 그대로 두면 설정 파일에 `fdt`를 적어도 DTB를 받지 않습니다.

```text
default test
label test
	kernel payload.bin
	fdt board.dtb
	append console=ttyAMA0
```

## 자동 부팅에서도 같은 일이 일어난다

autoboot을 제때 멈추지 못한 첫 실행에서는 제가 명령을 치기 전에 이미 DHCP 두 번과 TFTP 전송이 일어났습니다. QEMU 환경의 `boot_targets=qfw usb scsi virtio nvme dhcp`에 따라 표준 부팅(bootstd)이 마지막 `dhcp` bootdev까지 훑었고, 그 과정에서 `payload.bin`을 받았지만 부팅할 수 있는 형식이 아니어서 `(0 bootflows, 0 valid)`로 끝났습니다. 네트워크 부팅을 쓰지 않는 제품이라면 `boot_targets`에서 `dhcp`를 빼 두어야 부팅 시간마다 DHCP 대기가 끼지 않습니다.

## NFS root는 별도 구성

U-Boot가 네트워크로 kernel을 받는 일과 kernel이 NFS를 root filesystem으로 mount하는 일은 서로 다른 단계입니다. 후자는 kernel의 network driver, `root=/dev/nfs`·`nfsroot=`·`ip=` 같은 kernel command line, NFS 서버의 export가 맞아야 합니다. U-Boot가 DHCP로 받은 주소는 kernel에 자동으로 넘어가지 않으므로, kernel 쪽에서 다시 `ip=dhcp` 등으로 설정합니다. 이 QEMU 빌드는 U-Boot의 `nfs` 명령(`CONFIG_CMD_NFS`)도 꺼져 있습니다.

개발용 NFS root를 열 때는 쓰기 권한을 필요한 client에만 주고, 격리된 네트워크에서 씁니다.

## 정리

- DHCP는 Discover·Offer·Request·ACK 네 메시지였고, U-Boot는 option 60 `"U-Boot.armv8"`과 option 93(22 = ARM64)을 보냈습니다.
- 파일 이름과 TFTP 서버 주소는 BOOTP `file`·`siaddr` 필드에 실려 왔습니다. 서버마다 다를 수 있으므로 패킷으로 확인합니다.
- `autoload`가 정의되지 않으면 `dhcp`는 bootfile을 `loadaddr`로 내려받습니다. 주소만 필요하면 `setenv autoload no`.
- 기본 TFTP 블록은 1468 B(MTU 1500 기준)이고 window 1이라 블록마다 ACK가 오갑니다. 512 B로 줄이면 2 MiB에 DATA 1,429개 → 4,097개로 늘었고, 512의 배수 파일은 빈 마지막 블록이 붙었습니다.
- `pxe get`은 UUID → MAC → IP 접두어 8개 → `default-<arch>` → `default` 순서로 찾고, "Config file '…' found"의 이름은 실제 파일이 아니라 `bootfile` 값입니다.
- 네트워크 부팅을 쓰지 않으면 `boot_targets`에서 `dhcp`를 빼 둡니다.

## 다음 장 예고

다음 글에서는 USB를 통한 부팅과 복구 경로, 곧 USB 저장 장치에서의 부팅과 Fastboot·DFU·UMS 같은 USB device 모드를 구분합니다.

## 관련 항목

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — 로컬 미디어에서 파일 읽기
- [Ch 12: USB 부트와 download mode](/blog/embedded/bootloader/chapter12-usb-boot) — USB 전송과 recovery
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — 부팅 명령 설정
- [Ch 29: Distro Boot](/blog/embedded/bootloader/chapter29-distro-boot) — `boot_targets`와 부트 탐색
- [U-Boot v2024.04 `net/tftp.c`](https://github.com/u-boot/u-boot/blob/v2024.04/net/tftp.c) · [`cmd/pxe.c`](https://github.com/u-boot/u-boot/blob/v2024.04/cmd/pxe.c)
- [RFC 1350: TFTP](https://www.rfc-editor.org/rfc/rfc1350)
- [RFC 2348: TFTP Blocksize Option](https://www.rfc-editor.org/rfc/rfc2348)
- [RFC 7440: TFTP Windowsize Option](https://www.rfc-editor.org/rfc/rfc7440)
- [RFC 2131: DHCP](https://www.rfc-editor.org/rfc/rfc2131)
- [RFC 2132: DHCP Options](https://www.rfc-editor.org/rfc/rfc2132)
