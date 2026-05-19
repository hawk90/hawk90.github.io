---
title: "Ch 11: 네트워크 부트 — TFTP, PXE, BOOTP"
date: 2026-05-09T11:00:00
description: "네트워크를 통한 부팅 — DHCP/BOOTP·TFTP·PXE의 단계와 U-Boot 명령."
series: "Bootloader Internals"
seriesOrder: 11
tags: [embedded, bootloader, u-boot, tftp, pxe]
draft: false
---

## 한 줄 요약

**네트워크 부트는 개발 단계에서 가장 빠른 iteration을 줍니다.** flash에 쓰지 않고 호스트의 TFTP 서버에서 바로 커널을 받아 실행할 수 있기 때문입니다.

[10장](/blog/embedded/bootloader/chapter10-storage-boot)에서 봤듯 스토리지 부트는 *flash에 쓰는 시간*이 매번 듭니다. 양산 보드라면 어쩔 수 없지만, BSP 개발 중에는 커널을 빌드할 때마다 flash 쓰기를 반복하기는 너무 비효율적입니다. 네트워크 부트는 그 비용을 거의 0으로 만듭니다. `make`만 끝나면 `tftp`로 보드에 바로 적재할 수 있습니다.

이 글에서는 DHCP/BOOTP의 역할, TFTP의 단순한 프로토콜, PXE 사양과 distroboot의 통합, 그리고 호스트 측 TFTP/DHCP 서버 구성을 정리합니다.

## DHCP — IP 얻기

보드가 부팅하면 IP가 없습니다. 첫 단계는 *DHCP*로 IP를 얻는 것입니다.

```text
=> dhcp
BOOTP broadcast 1
DHCP client bound to address 192.168.1.42 (8 ms)
Using ethernet@30be0000 device
TFTP from server 192.168.1.10; our IP address is 192.168.1.42
Filename '/boot/kernel.img'.
Load address: 0x40400000
Loading: ##################################################  10.5 MiB
         12.3 MiB/s
done
Bytes transferred = 10995712 (a7c000 hex)
```

`dhcp` 명령은 두 가지 일을 합니다. 먼저 DHCP DISCOVER를 보내 *IP, gateway, DNS*를 받고, 응답에 *next-server*와 *boot-file* 옵션이 있으면 *바로 TFTP로 그 파일을 받습니다*. 즉 한 줄에 "IP 받기 + 커널 다운로드"가 묶입니다.

서버 측에서 `dhcpd.conf`에 다음을 둡니다.

```text
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
    option domain-name-servers 8.8.8.8;
    next-server 192.168.1.10;          # TFTP 서버
    filename "/boot/kernel.img";        # 받을 파일
}

host myboard {
    hardware ethernet 00:11:22:33:44:55;
    fixed-address 192.168.1.42;         # MAC별 고정 IP
    filename "/boot/kernel-myboard.img";
}
```

BOOTP는 DHCP의 조상입니다. U-Boot에는 `bootp` 명령이 있지만 거의 쓰지 않습니다. DHCP가 BOOTP를 포함합니다.

## TFTP — 파일 받기

TFTP는 UDP 위의 *가장 단순한 파일 전송 프로토콜*입니다. 인증도, 디렉터리 listing도 없습니다. 그래서 부트로더에 박기 좋습니다.

```text
=> setenv serverip 192.168.1.10
=> setenv loadaddr 0x40400000
=> tftp ${loadaddr} kernel.img
Using ethernet@30be0000 device
TFTP from server 192.168.1.10; our IP address is 192.168.1.42
Filename 'kernel.img'.
Load address: 0x40400000
Loading: ##################################################  10.5 MiB
done
Bytes transferred = 10995712 (a7c000 hex)
=> booti ${loadaddr} - ${fdt_addr_r}
```

호스트 측에서는 `tftpd-hpa`나 `dnsmasq` 같은 TFTP 서버를 띄웁니다. Ubuntu에서는 다음과 같이 설정합니다.

```bash
sudo apt install tftpd-hpa
sudo mkdir -p /var/lib/tftpboot
sudo chown -R tftp:tftp /var/lib/tftpboot
sudo systemctl restart tftpd-hpa

# 커널·DTB·initramfs 배치
sudo cp arch/arm64/boot/Image /var/lib/tftpboot/
sudo cp arch/arm64/boot/dts/.../myboard.dtb /var/lib/tftpboot/
sudo cp rootfs.cpio.uboot /var/lib/tftpboot/
```

`/etc/default/tftpd-hpa`에서 *루트 디렉터리*와 *옵션*을 조정합니다.

```text
TFTP_USERNAME="tftp"
TFTP_DIRECTORY="/var/lib/tftpboot"
TFTP_ADDRESS=":69"
TFTP_OPTIONS="--secure --create"
```

`--create`는 *write도* 허용합니다. 보드에서 호스트로 로그 파일을 올리고 싶다면 켭니다. 양산용 호스트는 read-only로 두는 게 안전합니다.

## PXE — 표준 네트워크 부트

PXE(Preboot eXecution Environment)는 *Intel의 x86 사양*에서 출발했지만, ARM 보드에서도 표준 네트워크 부트 절차로 자리잡았습니다. 핵심은 *`pxelinux.cfg/` 디렉터리의 설정 파일을 따라 부팅*하는 것입니다.

```text
=> setenv pxefile_addr_r 0x40200000
=> setenv kernel_addr_r  0x40400000
=> setenv fdt_addr_r     0x43000000
=> setenv ramdisk_addr_r 0x44000000
=> pxe get
TFTP from server 192.168.1.10; our IP address is 192.168.1.42
Filename 'pxelinux.cfg/01-00-11-22-33-44-55'.
=> pxe boot
```

`pxe get`은 다음 순서로 설정 파일을 찾습니다.

```text
1. pxelinux.cfg/<UUID>
2. pxelinux.cfg/01-<MAC address>    (MAC별 설정)
3. pxelinux.cfg/<IP in hex>         (IP 기반)
4. pxelinux.cfg/default             (fallback)
```

파일은 *syslinux/extlinux 문법*입니다.

```text
# /var/lib/tftpboot/pxelinux.cfg/default
default linux

label linux
    kernel /Image
    fdt /myboard.dtb
    append console=ttyS0,115200 root=/dev/nfs nfsroot=192.168.1.10:/srv/nfs ip=dhcp rw

label recovery
    kernel /Image
    initrd /rescue.cpio
    append console=ttyS0,115200 root=/dev/ram0 rw
```

`pxe boot`는 default 라벨을 자동 선택합니다. 시리얼 콘솔에서 메뉴를 띄우려면 `prompt 1` + `timeout 30` 같은 directive를 추가합니다.

## distroboot와 네트워크 통합

[13장](/blog/embedded/bootloader/chapter13-env-bootcmd)에서 자세히 볼 *distroboot*는 표준 부트 시나리오 목록입니다. 그 목록의 한 항목으로 *DHCP/PXE 부트*가 들어가 있습니다.

```text
boot_targets=mmc0 mmc1 nvme0 usb0 pxe dhcp

bootcmd_pxe=run boot_net_usb_start; run boot_pxe
boot_pxe=dhcp ${pxefile_addr_r} && pxe boot ${pxefile_addr_r}

bootcmd_dhcp=run boot_net_usb_start;
             setenv efi_fdtfile ${fdtfile};
             setenv efi_old_vci ${bootp_vci};
             ...
             dhcp ${kernel_addr_r}; ...
```

`boot_targets`의 순서대로 시도하다, 미디어가 없으면 다음으로 fall-through합니다. 디스크가 비어 있으면 자동으로 PXE로 가는 보드가 distroboot의 가장 흔한 사용 사례입니다.

`networking=true`나 `ethaddr` 환경 변수가 비어 있으면 dhcp/pxe target은 *건너뜁니다*. 보드의 MAC이 OTP fuse에 박혀 있지 않으면 부트 때마다 새 random MAC을 받게 되어 *고정 IP* 매핑이 어려워집니다. SoC 벤더 가이드에 따라 `ethaddr`를 환경 변수나 OTP에 박아 두세요.

## NFS root와 결합

네트워크 부트의 가장 강력한 조합은 *kernel은 TFTP, rootfs는 NFS*입니다. 보드의 디스크를 전혀 건드리지 않고 풀 리눅스가 돕니다.

```text
# 호스트의 /etc/exports
/srv/nfs    192.168.1.0/24(rw,no_root_squash,no_subtree_check,insecure)

# U-Boot bootargs
setenv bootargs "console=ttyS0,115200
    root=/dev/nfs nfsroot=192.168.1.10:/srv/nfs,nfsvers=3,tcp
    ip=dhcp rw rootwait"
```

`ip=dhcp`는 *커널*이 부팅 후 DHCP를 다시 돌리도록 합니다. U-Boot에서 받은 IP는 커널로 이어지지 않습니다. 커널이 자체적으로 다시 DHCP를 돌려야 합니다.

NFS root는 빌드 시스템(Buildroot, Yocto)의 *target* 디렉터리를 그대로 보드에 마운트하는 것과 같습니다. [Buildroot 8장](/blog/embedded/buildroot/chapter08-filesystems)의 *target/* 트리를 `/srv/nfs`로 심볼릭 링크 걸어 두면, `make` 직후 보드에서 바로 새 바이너리를 실행할 수 있습니다.

## 자주 하는 실수

- **호스트 방화벽이 TFTP를 막습니다.** UDP/69는 기본적으로 막혀 있는 경우가 많습니다. `ufw allow tftp` 또는 `firewall-cmd --add-service=tftp`로 열어 주세요.
- **TFTP 디렉터리 권한이 잘못됐습니다.** `tftpd-hpa`는 *tftp 유저*로 실행됩니다. `/var/lib/tftpboot/Image`가 root:root 600이면 읽을 수 없습니다.
- **MTU 충돌로 다운로드가 멈춥니다.** 일부 SoC의 ethernet driver가 jumbo frame을 지원하지 않습니다. switch나 라우터의 MTU를 1500으로 맞추세요.
- **`ip=dhcp`를 빼고 NFS root를 씁니다.** 커널 안에서 IP가 없으면 NFS 마운트에 실패합니다. `ip=`을 반드시 포함하세요.
- **`pxe boot`가 default를 못 찾습니다.** `pxelinux.cfg/`를 빼먹거나 *MAC 별 파일*이 잘못된 경우입니다. U-Boot가 시도하는 파일명을 시리얼에 그대로 찍어 줍니다. 그것에 맞춰 파일을 두세요.

## 정리

- DHCP는 IP를 얻고, *옵션으로 들어온 boot-file*을 자동으로 TFTP로 받습니다.
- TFTP는 단순한 UDP 프로토콜이고, `tftpd-hpa` 같은 서버 한 줄로 시작합니다.
- PXE는 `pxelinux.cfg/`의 설정 파일을 따라 부팅하는 표준 절차이고, ARM에서도 동일하게 동작합니다.
- distroboot의 `boot_targets`에 `pxe`와 `dhcp`를 두면 자동 fall-through가 됩니다.
- `kernel via TFTP + rootfs via NFS`는 BSP 개발 단계의 황금 조합입니다.
- 보드의 MAC을 *OTP나 환경 변수에 고정*해야 DHCP 서버의 고정 IP 매핑이 안정됩니다.
- 호스트 방화벽과 권한이 1차 실패 원인입니다.

## 다음 장 예고

다음 글에서는 *USB 부트*를 봅니다. fastboot 프로토콜, UMS(USB Mass Storage)로 eMMC를 PC에 노출하는 방법, 그리고 NXP `uuu`와 같은 양산 다운로드 도구를 정리합니다.

## 관련 항목

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — 로컬 미디어 부트
- [Ch 12: USB 부트](/blog/embedded/bootloader/chapter12-usb-boot) — USB로 다운로드
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — distroboot 흐름
- [Buildroot Ch 8: 파일 시스템](/blog/embedded/buildroot/chapter08-filesystems) — NFS root의 target/ 트리
- [PXE Specification 2.1 (Intel)](https://www.intel.com/content/dam/www/public/us/en/documents/specification-updates/pxe-2-1-specification.pdf)
