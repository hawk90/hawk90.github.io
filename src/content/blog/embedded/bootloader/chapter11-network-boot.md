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

네트워크 부팅은 firmware가 네트워크 설정을 얻고, 서버에서 boot configuration과 OS 파일을 받아 다음 단계로 넘기는 흐름입니다. DHCP, TFTP, PXE는 서로 다른 역할을 하며, 실제 파일 로딩 동작은 U-Boot version과 build configuration에 따라 확인해야 합니다.

[10장](/blog/embedded/bootloader/chapter10-storage-boot)에서 다룬 로컬 저장 장치 대신, 개발 환경에서는 네트워크 서버에서 파일을 받을 수 있습니다. 이를 통해 보드에 이미지를 계속 기록하지 않고도 새 kernel/DTB를 시험할 수 있지만, IP 설정·서버 구성·보안 경계를 맞춰야 합니다.

![U-Boot target이 DHCP/BOOTP server에서 주소와 bootfile 정보를 받고, PXE를 쓸 때 TFTP server에서 config를 읽은 뒤 tftpboot로 kernel과 DTB를 받으며, kernel 단계에서 별도로 NFS root를 mount하는 순서도](/images/blog/bootloader/diagrams/ch11-network-boot-flow.svg)

그림은 이 글에서 다루는 네 단계를 순서대로 보여 주며, 마지막 NFS root mount는 U-Boot가 아니라 kernel 설정에 속하는 별도 단계입니다.

## DHCP와 BOOTP

DHCP는 client가 주소와 네트워크 설정을 얻는 프로토콜입니다. 흔히 DISCOVER, OFFER, REQUEST, ACK 네 메시지로 설명하지만, 실제 패킷 흐름과 선택한 옵션은 client/server 구성에 달려 있습니다. BOOTP는 오래된 bootstrapping protocol이며 DHCP는 BOOTP packet format 및 동작을 확장해 사용합니다.

DHCP 응답에는 주소 외에 server, boot filename 등 부팅에 필요한 정보가 실릴 수 있습니다. BOOTP `siaddr` 필드와 DHCP option 66은 같은 필드가 아닙니다. option 66은 TFTP server name, option 67은 bootfile name을 나타내므로 서버 설정을 확인해 해석해야 합니다. U-Boot의 `dhcp`가 주소만 얻는지, 응답에 따라 bootfile을 추가로 처리하는지는 사용 중인 version과 설정 문서를 확인하세요.

U-Boot network command의 일반적인 사용 형태는 다음과 같습니다. 이는 명령 문법 예시이며 실제 서버나 보드에서 실행한 결과가 아닙니다.

```text
=> dhcp
=> printenv ipaddr serverip bootfile
```

## TFTP로 파일 읽기

TFTP는 간단한 request/response 방식의 파일 전송 프로토콜입니다. U-Boot에서 지원되고 network가 준비되어 있다면 `tftp <RAM address> <filename>` 형태로 파일을 받을 수 있습니다. 부팅 파일의 RAM 주소는 kernel, DTB, initramfs의 크기와 board memory map을 보고 정해야 합니다.

```text
=> tftp ${kernel_addr_r} Image
=> tftp ${fdt_addr_r} board.dtb
```

위 주소와 파일명은 실제 target 설정을 확인해야 하며, 예시 명령은 실행하지 않았습니다. 결과를 기록할 때는 보드 식별 정보, U-Boot version, server 설정, 원본 console log를 함께 남기고 임의의 bytes/sec 수치를 만들지 않습니다.

TFTP의 기본 DATA payload 크기는 RFC 1350에서 512 octets입니다. RFC 2348은 `blksize` option으로 더 큰 block을 협상하는 방법을 정의하고, RFC 7440은 window-size option을 정의합니다. 협상된 크기와 동작은 양쪽 구현 및 network path가 지원할 때만 사용할 수 있습니다. MTU 계산도 TFTP DATA header를 포함해야 합니다. 예를 들어 IPv4 header 20B, UDP header 8B, TFTP DATA header 4B를 가정한 1500B IP MTU라면 data portion의 상한은 `1500 - 20 - 8 - 4 = 1468`B입니다. IPv4 options, IPv6, tunnel 또는 다른 MTU에서는 달라지므로 보편 권장값으로 취급하지 않습니다.

U-Boot 문서의 `tftpblocksize`와 `tftptimeout` 환경 변수는 build/version에서 지원되는 의미를 확인하고 설정해야 합니다. 해당 변수의 존재만으로 server 협상이나 높은 throughput을 보장할 수 없습니다. [U-Boot v2025.01 environment reference](https://docs.u-boot.org/en/v2025.01/usage/environment.html)에는 TFTP 관련 변수 설명이 있습니다.

## PXE와 U-Boot의 extlinux 형식

U-Boot의 `pxe` command는 PXELINUX 기능의 subset을 제공하며, TFTP에서 설정 파일을 받아 해석할 수 있습니다. 기본 명령 흐름은 `pxe get`으로 config를 가져오고 `pxe boot`로 처리하는 형태입니다. 필요한 environment variable과 RAM addresses는 공식 문서를 보고 구성합니다.

```text
=> pxe get
=> pxe boot
```

설정 파일은 `default`, `label`, `kernel`, `initrd`, `fdt`, `append`와 같은 지원 항목을 사용합니다. U-Boot의 PXE 구현은 PXELINUX 전체와 동일하지 않습니다. 특히 versioned U-Boot 문서는 RFC 5071 PXELINUX DHCP option codes 미지원 등을 차이로 명시합니다. 따라서 PXE server 예제의 모든 옵션이 U-Boot에서 처리된다고 가정하지 않습니다. [U-Boot PXE and extlinux.conf](https://docs.u-boot.org/en/stable/usage/pxe.html)

`boot_targets`에서 네트워크 target을 쓰는 distro configuration도 선택할 수 있습니다. U-Boot v2024.04 distro document에서 `dhcp`와 `pxe`는 network targets로 설명되며 storage target과 표기 방식이 다릅니다. 내부 변수 구현에 의존하기보다 지원되는 interface를 확인합니다. [Generic Distro Configuration Concept](https://docs.u-boot.org/en/v2024.04/develop/distro.html)

## NFS root는 별도 구성

Network를 통해 kernel을 읽는 것과 kernel이 NFS filesystem을 root로 mount하는 것은 별개의 단계입니다. 후자는 kernel network driver, command line, NFS server export, 접근 제어와 root filesystem 준비가 맞아야 합니다. U-Boot에서 받은 IP 설정이 kernel 설정으로 자동 이전된다고 가정하지 말고, kernel의 network boot documentation과 보드 command line을 확인합니다.

개발용 NFS root를 설정할 때도 host의 쓰기 권한을 무조건 열지 말고, 필요한 client와 권한만 허용하며 격리된 네트워크에서 사용합니다. 이 문서에서는 `no_root_squash` 등의 광범위한 권한 설정을 기본 예제로 제시하지 않습니다.

## 점검 순서

1. U-Boot tag와 해당 network stack/driver configuration을 고정합니다.
2. target의 MAC, selected interface, DHCP lease, server address와 bootfile option을 관찰합니다.
3. 동일 network에서 작은 known file을 먼저 내려 받아 path와 TFTP server root를 확인합니다.
4. PXE를 쓸 경우 U-Boot가 지원하는 config syntax와 address variables를 확인합니다.
5. kernel을 실행하기 전 RAM layout, DTB, initrd, boot command와 root filesystem 설정을 각각 점검합니다.

이 환경에는 target board와 TFTP/DHCP server가 없어 명령, download, 정상·실패 transcript를 실행하지 않았습니다. 따라서 측정 속도, packet timing, 특정 NIC 동작은 보고하지 않습니다.

## 정리

- DHCP/BOOTP는 주소와 boot metadata를 제공하고, TFTP는 파일을 전송합니다.
- PXE/extlinux config는 U-Boot에서 지원하는 subset과 version에 맞춰야 합니다.
- MTU 및 TFTP block 계산은 protocol headers와 실제 path를 포함해 검토합니다.
- kernel의 NFS root는 U-Boot network boot와 별도의 kernel/server 설정입니다.
- 실제 실행 증거에는 board, U-Boot version, server config와 원본 output이 필요합니다.

## 다음 장 예고

다음 글에서는 USB host/device mode, firmware download, removable media 부팅을 구분합니다.

## 관련 항목

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — 로컬 미디어에서 파일 읽기
- [Ch 12: USB 부트와 download mode](/blog/embedded/bootloader/chapter12-usb-boot) — USB 전송과 recovery
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — 부팅 명령 설정
- [Ch 29: Distro Boot](/blog/embedded/bootloader/chapter29-distro-boot) — `boot_targets`와 부트 탐색
- [RFC 1350: TFTP](https://www.rfc-editor.org/rfc/rfc1350)
- [RFC 2348: TFTP Blocksize Option](https://www.rfc-editor.org/rfc/rfc2348)
- [RFC 7440: TFTP Windowsize Option](https://www.rfc-editor.org/rfc/rfc7440)
- [RFC 2131: DHCP](https://www.rfc-editor.org/rfc/rfc2131)
- [RFC 2132: DHCP Options](https://www.rfc-editor.org/rfc/rfc2132)
