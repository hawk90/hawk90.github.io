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

보드가 부팅하면 IP가 없습니다. 첫 단계는 *DHCP*로 IP를 얻는 것입니다. 전체 네트워크 부트 흐름은 DHCP → TFTP → NFS 순서로 진행됩니다.

![네트워크 부트 흐름 — DHCP, TFTP, NFS 서버와의 상호작용](/images/blog/bootloader/diagrams/ch11-network-boot-flow.svg)

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

## DHCP·BOOTP 흐름 자세히

U-Boot의 한 줄 `dhcp` 명령 뒤에서 네 개의 패킷이 오갑니다. 일반적인 DORA 시퀀스입니다.

| 단계 | 방향 | 목적 |
|------|------|------|
| DISCOVER | client → broadcast | 네트워크에 DHCP 서버가 있는지 묻기 |
| OFFER | server → client | IP·옵션 후보 제시 |
| REQUEST | client → broadcast | 그 후보를 받겠다고 선언 |
| ACK | server → client | 확정. lease 시작 |

U-Boot는 OFFER에 담긴 *옵션*을 읽어 어디서 무엇을 받을지 정합니다. 가장 중요한 두 옵션이 있습니다.

| 옵션 번호 | 이름 | 의미 |
|-----------|------|------|
| 1 | subnet mask | 라우팅 |
| 3 | router | 게이트웨이 |
| 6 | DNS | 도메인 이름 서버 |
| 66 | next-server (TFTP server name) | TFTP 서버 주소 |
| 67 | bootfile-name | 받을 파일 경로 |
| 209 | configfile | PXE config 파일 (RFC 5071) |
| 210 | path-prefix | PXE 파일 prefix |

`option 66`과 `option 67`이 있으면 U-Boot의 `dhcp` 명령은 *자동으로 TFTP 전송까지* 진행합니다. 명령 한 줄에 DISCOVER → OFFER → REQUEST → ACK → TFTP READ가 묶입니다.

```text
=> dhcp 0x80000000
BOOTP broadcast 1
DHCP client bound to address 192.168.1.42 (8 ms)
Using ethernet@30be0000 device
TFTP from server 192.168.1.10; our IP address is 192.168.1.42
Filename '/boot/kernel.img'.
```

`bootp_vendor_class_identifier` 환경 변수로 DHCP option 60(VCI)을 설정하면 서버가 *보드 종류별*로 다른 파일을 줄 수 있습니다. dnsmasq에서는 `dhcp-vendorclass` 매칭으로 분기합니다.

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

## TFTP block size 협상

TFTP 원본 사양(RFC 1350)은 *블록 크기 512바이트* 고정입니다. 10MB 커널을 받으려면 약 2만 번의 라운드 트립이 발생합니다. 100Mbps 네트워크에서도 RTT가 누적되어 전송 속도가 1~2 MB/s에 머무는 이유입니다.

RFC 2348의 `blksize` 옵션이 이 문제를 풉니다. 클라이언트가 RRQ 패킷에 원하는 블록 크기를 적으면 서버가 응답에서 합의된 값을 돌려줍니다. U-Boot는 `TFTP_BLOCKSIZE` 환경 변수로 그 값을 정합니다.

```text
=> setenv tftp_blocksize 1468
=> setenv tftp_windowsize 16
=> saveenv
=> tftp 0x80000000 Image
```

각 환경 변수가 갖는 의미를 정리합니다.

| 변수 | 효과 | 권장 값 |
|------|------|---------|
| `tftp_blocksize` | RFC 2348 blksize 옵션 | 1468 (1500 MTU - 28 헤더) |
| `tftp_windowsize` | RFC 7440 윈도우 크기 — ACK 한 번에 N개 블록 | 8 ~ 16 |
| `tftp_timeout` | 재전송 타임아웃 (ms) | 5000 |

windowsize 16에 blocksize 1468이면 라운드 트립당 23KB를 전송합니다. 같은 네트워크에서 10배 이상 빨라집니다. jumbo frame을 지원하는 NIC라면 `tftp_blocksize`를 8972까지 올릴 수 있지만, 중간 스위치가 jumbo frame을 못 받으면 *MTU black hole*로 멈춥니다. 의심스럽다면 1468로 두는 게 안전합니다.

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

1. `pxelinux.cfg/<UUID>`
2. `pxelinux.cfg/01-<MAC address>` — MAC별 설정
3. `pxelinux.cfg/<IP in hex>` — IP 기반
4. `pxelinux.cfg/default` — fallback

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

## iPXE와 U-Boot PXE 지원 비교

iPXE는 PXE의 확장 구현입니다. HTTP·HTTPS·iSCSI·FCoE까지 지원해 단순 TFTP의 한계를 넘습니다. U-Boot의 PXE는 *syslinux 호환 모드*만 지원하지만 임베디드에서는 그것으로 충분합니다.

```text
# /var/lib/tftpboot/pxelinux.cfg/01-AA-BB-CC-DD-EE-FF
# MAC AA:BB:CC:DD:EE:FF 보드 전용 설정
default production

label production
    menu label Production Image
    kernel /myboard/Image-prod
    fdt /myboard/board.dtb
    append console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait

label development
    menu label Dev Image (NFS root)
    kernel /myboard/Image-dev
    fdt /myboard/board.dtb
    append console=ttyS0,115200 root=/dev/nfs nfsroot=192.168.1.10:/srv/nfs/dev ip=dhcp rw
```

U-Boot의 `pxe` 명령은 두 하위 명령으로 나뉩니다.

| 명령 | 동작 |
|------|------|
| `pxe get` | DHCP → 설정 파일 fetch → 메모리에 적재 |
| `pxe boot` | 적재된 설정을 파싱 → kernel·initrd·fdt fetch → 부팅 |

iPXE가 필요한 경우는 *HTTPS로 인증된 이미지를 받아야 할 때*입니다. 양산 라인에서 외부망 경유 provisioning을 한다면 iPXE를 SPI flash에 굽고 그 위에서 U-Boot나 EFI 부트로더를 받는 *2단 chain-load* 구성도 가능합니다. 단, iPXE는 x86 중심이라 ARM 포팅이 제한적입니다.

## NFS root mount 워크플로

NFS root는 *호스트 머신의 디렉터리를 보드의 루트 파일 시스템으로 직접 마운트*하는 방식입니다. flash를 전혀 건드리지 않고 풀 리눅스가 돌아갑니다.

호스트의 `/etc/exports`를 다음과 같이 설정합니다.

```text
/srv/nfs/myboard  192.168.1.0/24(rw,no_root_squash,no_subtree_check,insecure,async)
```

각 옵션의 의미입니다.

| 옵션 | 의미 |
|------|------|
| `rw` | 읽기·쓰기 허용 |
| `no_root_squash` | 보드의 root가 호스트의 root로 매핑 — 필수 |
| `no_subtree_check` | 디렉터리 트리 검증 생략 — 성능 향상 |
| `insecure` | 1024 이상 포트 허용 — U-Boot/커널은 privileged port를 쓰지 않음 |
| `async` | 동기 fsync 미루기 — 개발용 |

커널 cmdline은 다음 형식입니다.

```text
console=ttyS0,115200
root=/dev/nfs
nfsroot=192.168.1.10:/srv/nfs/myboard,nfsvers=3,tcp
ip=dhcp rw rootwait
```

NFSv3과 NFSv4는 동작이 크게 다릅니다.

| 항목 | NFSv3 | NFSv4 |
|------|-------|-------|
| Pseudo filesystem | 없음 | `/` 트리 구조 강제 |
| `no_root_squash` | 의미 있음 | 거의 무의미 (idmap) |
| Stateless | 예 | 아니오 (lease) |
| Embedded 호환성 | 매우 좋음 | 약함 |

임베디드 NFS root는 *NFSv3 + TCP* 조합이 사실상 표준입니다. NFSv4는 idmapd 데몬과 lease 관리가 필요해 minimal rootfs에서 켜기 까다롭습니다.

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

### 완전한 네트워크 부트 스크립트 예시

U-Boot에서 TFTP + NFS root로 부팅하는 전체 흐름입니다.

```text
=> setenv serverip 192.168.1.10
=> setenv ipaddr 192.168.1.42
=> setenv netmask 255.255.255.0
=> setenv gatewayip 192.168.1.1

# kernel과 DTB 다운로드
=> tftp ${kernel_addr_r} Image
=> tftp ${fdt_addr_r} board.dtb

# NFS root bootargs 설정
=> setenv bootargs "console=ttyS0,115200 root=/dev/nfs \
    nfsroot=192.168.1.10:/srv/nfs,nfsvers=3,tcp \
    ip=${ipaddr}:${serverip}:${gatewayip}:${netmask}::eth0:off rw"

# 부팅
=> booti ${kernel_addr_r} - ${fdt_addr_r}
```

이 스크립트를 `boot.cmd`에 넣고 `mkimage`로 `boot.scr`를 만들면 자동화됩니다.

NFS root는 빌드 시스템(Buildroot, Yocto)의 *target* 디렉터리를 그대로 보드에 마운트하는 것과 같습니다. [Buildroot 8장](/blog/embedded/buildroot/chapter08-filesystems)의 *target/* 트리를 `/srv/nfs`로 심볼릭 링크 걸어 두면, `make` 직후 보드에서 바로 새 바이너리를 실행할 수 있습니다.

## HTTP boot — TFTP의 대안

TFTP는 UDP라 패킷 손실에 약하고, RFC 2347 옵션 협상도 모든 서버가 지원하지는 않습니다. 최신 U-Boot는 `wget` 명령으로 HTTP에서 직접 이미지를 받을 수 있습니다. `CONFIG_CMD_WGET=y`로 켭니다.

```text
=> setenv serverip 192.168.1.10
=> wget 0x80000000 http://192.168.1.10/boot/Image
HTTP/1.1 200 OK
Bytes transferred = 10995712
=> wget 0x83000000 http://192.168.1.10/boot/board.dtb
=> booti 0x80000000 - 0x83000000
```

TFTP 대비 장점이 명확합니다.

| 항목 | TFTP | HTTP (U-Boot wget) |
|------|------|---------------------|
| 트랜스포트 | UDP | TCP |
| 인증 | 없음 | Basic auth 가능 |
| 디렉터리 listing | 불가 | 가능 |
| 큰 파일 | 32MB 한계 (RFC 2347 미지원 서버) | 제한 없음 |
| 서버 | tftpd-hpa | nginx, apache |
| 패킷 손실 복구 | 약함 | TCP가 자동 처리 |

한계도 있습니다. U-Boot의 `wget`은 *HTTPS를 지원하지 않습니다*. mbedTLS를 빌드에 포함해도 인증서 체인 검증이 빈약합니다. 인증된 다운로드가 필요하면 *서명된 FIT 이미지*를 HTTP로 받고, 부트로더가 이미지 *자체의 서명*을 검증하는 패턴이 안전합니다.

HTTP 서버 요구사항은 단순합니다. `Content-Length` 헤더를 정확히 돌려주고, `Range` 요청을 지원할 필요는 없습니다. nginx 기본 설정으로 충분합니다.

## factory provisioning 자동화

양산 라인에서는 보드마다 *유니크한 이미지*가 필요합니다. 보드별 시리얼, MAC, 인증서, calibration 데이터가 들어가는 경우입니다. 네트워크 부트를 자동화하면 라인에 보드를 꽂기만 하면 됩니다.

dnsmasq를 부트 서버로 쓰는 단일 구성 예입니다.

```text
# /etc/dnsmasq.d/embedded.conf
# DHCP·TFTP를 한 데몬에서 모두 처리
interface=eth0
dhcp-range=192.168.1.100,192.168.1.250,12h
enable-tftp
tftp-root=/srv/tftp

# MAC 기반으로 다른 PXE config 라우팅
dhcp-host=AA:BB:CC:00:00:01,set:line1
dhcp-host=AA:BB:CC:00:00:02,set:line1
dhcp-mac=set:devkit,AA:BB:CC:99:*:*

# tag별 부트 파일
dhcp-boot=tag:line1,pxelinux.cfg/factory-line1
dhcp-boot=tag:devkit,pxelinux.cfg/devkit

# DNS 서버 옵션 (필요 시 외부망 차단)
dhcp-option=6,192.168.1.10
```

factory 이미지 fetch 흐름은 다음과 같습니다.

1. 보드 첫 부팅 → ROM이 ethernet boot 모드로 진입
2. DHCP DISCOVER → dnsmasq가 MAC 기반 tag 매칭
3. tag별 boot file 응답 → SPL/U-Boot 다운로드
4. U-Boot가 다시 DHCP → HTTP server에서 `/provision/<MAC>/image.fit` 요청
5. 서버가 보드별 unique 이미지 생성 후 응답
6. U-Boot가 eMMC 또는 NOR flash에 굽기 → 재부팅

이 모델은 *동일한 마스터 이미지*를 보드별로 personalize하는 [Ch 30](/blog/embedded/bootloader/chapter30-ci-factory-test)의 factory test 흐름과 자연스럽게 결합합니다.

## 자주 하는 실수

- **호스트 방화벽이 TFTP를 막습니다.** UDP/69는 기본적으로 막혀 있는 경우가 많습니다. `ufw allow tftp` 또는 `firewall-cmd --add-service=tftp`로 열어 주세요.
- **TFTP 디렉터리 권한이 잘못됐습니다.** `tftpd-hpa`는 *tftp 유저*로 실행됩니다. `/var/lib/tftpboot/Image`가 root:root 600이면 읽을 수 없습니다.
- **MTU 충돌로 다운로드가 멈춥니다.** 일부 SoC의 ethernet driver가 jumbo frame을 지원하지 않습니다. switch나 라우터의 MTU를 1500으로 맞추세요.
- **`ip=dhcp`를 빼고 NFS root를 씁니다.** 커널 안에서 IP가 없으면 NFS 마운트에 실패합니다. `ip=`을 반드시 포함하세요.
- **`pxe boot`가 default를 못 찾습니다.** `pxelinux.cfg/`를 빼먹거나 *MAC 별 파일*이 잘못된 경우입니다. U-Boot가 시도하는 파일명을 시리얼에 그대로 찍어 줍니다. 그것에 맞춰 파일을 두세요.
- **DHCP 풀이 작아 라인이 멈춥니다.** `dhcp-range=192.168.1.100,192.168.1.150`은 51개 보드만 받습니다. 양산 라인에서 동시에 150개가 부팅하면 OFFER가 끊깁니다. lease time(`12h`)을 짧게 두거나 풀을 늘리세요.
- **TFTP 32-bit block counter 회전.** RFC 1350의 block number는 16비트이고, blocksize 32KB × 65,536 블록 = 2GB가 한계입니다. U-Boot가 `rollover` 옵션(RFC 2348 확장)을 지원하지 않으면 2GB짜리 rootfs.cpio 전송이 깨집니다. 큰 파일은 *HTTP `wget`*으로 옮기세요.
- **NFS export permission이 잘못됐습니다.** `no_root_squash`를 빼면 보드의 root가 nobody로 매핑되어 `/etc` 같은 디렉터리에 쓰지 못합니다. `exportfs -v`로 실제 적용된 옵션을 확인하세요.
- **DHCP option 67(bootfile)에 절대 경로를 적습니다.** TFTP 서버는 보통 `tftp-root` 기준 상대 경로를 기대합니다. `/var/lib/tftpboot/Image`가 아니라 `Image`로 적어야 합니다.

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

- [Ch 10: 스토리지 부트](/blog/embedded/bootloader/chapter10-storage-boot) — 로컬 미디어 부트와의 대비
- [Ch 12: USB 부트](/blog/embedded/bootloader/chapter12-usb-boot) — USB로 다운로드, fastboot
- [Ch 13: 환경 변수와 bootcmd](/blog/embedded/bootloader/chapter13-env-bootcmd) — distroboot 흐름
- [Ch 29: Distro Boot](/blog/embedded/bootloader/chapter29-distro-boot) — `boot_targets`에 PXE·DHCP 결합
- [Ch 30: CI·factory test](/blog/embedded/bootloader/chapter30-ci-factory-test) — factory provisioning 자동화 연계
- [Buildroot Ch 8: 파일 시스템](/blog/embedded/buildroot/chapter08-filesystems) — NFS root의 target/ 트리
- [PXE Specification 2.1 (Intel)](https://www.intel.com/content/dam/www/public/us/en/documents/specification-updates/pxe-2-1-specification.pdf)
- [RFC 2348 — TFTP Blocksize Option](https://www.rfc-editor.org/rfc/rfc2348)
- [RFC 7440 — TFTP Windowsize Option](https://www.rfc-editor.org/rfc/rfc7440)
