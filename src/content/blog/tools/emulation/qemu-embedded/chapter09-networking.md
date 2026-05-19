---
title: "Ch 9: 네트워킹"
date: 2026-05-17T09:00:00
description: "QEMU에서 TAP/User-mode 네트워킹을 설정한다."
tags: [QEMU, Networking, TAP, SLIRP, virtio-net, hostfwd]
series: "QEMU Embedded Emulation"
seriesOrder: 9
draft: true
---

guest VM이 *어떻게 네트워크에 연결되는지*가 임베디드 개발에서 자주 필요합니다 — TFTP 부팅, NFS root, SSH 접속, package install. QEMU는 *여러 backend*를 통해 다양한 시나리오를 지원합니다. 이 장은 user-mode·TAP·socket의 차이와 활용을 정리합니다.

## 네트워크 backend 종류

| 방식 | 특징 | 적합도 |
|------|------|--------|
| **User-mode (SLIRP)** | host kernel 우회, NAT 자동 | 가장 간단, 학습·CI |
| **TAP** | host에 tap0 인터페이스, 실 NIC처럼 | production-like, bridge 가능 |
| **Socket** | 여러 QEMU 인스턴스 사이 | multi-VM 시뮬레이션 |
| **vhost-net** | TAP을 kernel-bypass로 가속 | 고성능 |

대부분의 *학습/CI*는 user-mode면 충분합니다.

## User-mode 네트워킹 (SLIRP)

`-netdev user`. 외부 인터넷 접속이 자동(NAT)이고 root 권한 불필요.

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -kernel Image \
    -netdev user,id=net0 \
    -device virtio-net-device,netdev=net0 \
    -append "console=ttyAMA0 ip=dhcp"
```

guest에서 인터넷 확인:

```bash
guest$ ip a
2: eth0: ... 10.0.2.15/24 ...

guest$ ping -c 1 8.8.8.8
PING 8.8.8.8 ...
64 bytes from 8.8.8.8: icmp_seq=1 ttl=42 time=12.3 ms
```

QEMU의 *내장 가상 라우터*가 `10.0.2.0/24` 네트워크를 만들고 NAT로 host의 네트워크로 forwarding합니다.

## Host-guest 포트 forwarding

guest의 service를 host에서 접속하려면 `hostfwd`.

```bash
-netdev user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::8080-:80
```

| 형식 | 의미 |
|------|------|
| `hostfwd=tcp::2222-:22` | host 2222 → guest 22 |
| `hostfwd=tcp:127.0.0.1:2222-:22` | localhost만 |
| `hostfwd=udp::5353-:5353` | UDP |

host에서:

```bash
# SSH로 guest 접속
$ ssh -p 2222 root@localhost

# guest의 web server에 접속
$ curl http://localhost:8080
```

## SLIRP의 한계

- *ICMP에 일부 제약* (raw socket 권한 의존)
- *낮은 throughput* (host kernel을 우회하므로)
- *Multi-guest 통신* 불가 (각 user-mode가 독립)

이 한계가 거슬리면 TAP으로 옮깁니다.

## TAP 네트워킹

host에 `tap0` 가상 인터페이스를 만들고 그것을 *guest의 NIC*로 연결.

```bash
# 1. tap 인터페이스 생성 (host)
sudo ip tuntap add tap0 mode tap
sudo ip link set tap0 up
sudo ip addr add 192.168.100.1/24 dev tap0

# 2. QEMU
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -kernel Image \
    -netdev tap,id=net0,ifname=tap0,script=no,downscript=no \
    -device virtio-net-device,netdev=net0,mac=52:54:00:12:34:56 \
    -append "console=ttyAMA0 ip=192.168.100.2::192.168.100.1:255.255.255.0::eth0:off"
```

guest와 host가 *같은 LAN*처럼 통신합니다.

## TAP + bridge — 실 네트워크 연결

`br0` bridge에 tap0 + 실 NIC(`eth0`)를 묶으면 guest가 *진짜* LAN에 노출됩니다.

```bash
sudo ip link add br0 type bridge
sudo ip link set eth0 master br0
sudo ip link set tap0 master br0
sudo ip link set br0 up
```

guest가 DHCP로 LAN IP를 받습니다. *실 IoT 네트워크 시뮬레이션*에 가깝습니다.

## script 옵션

`script=...`로 tap 활성 자동화.

```bash
# /etc/qemu-ifup.sh
#!/bin/sh
sudo ip link set $1 up
sudo ip link set $1 master br0
```

```bash
-netdev tap,id=net0,script=/etc/qemu-ifup.sh
```

QEMU가 tap을 만들 때 그 script를 자동 호출.

## Socket — 다중 VM 통신

여러 QEMU 인스턴스 사이를 연결.

```bash
# Listener
qemu-system-aarch64 ... \
    -netdev socket,id=net0,listen=:1234 \
    -device virtio-net-device,netdev=net0

# Connector
qemu-system-aarch64 ... \
    -netdev socket,id=net0,connect=127.0.0.1:1234 \
    -device virtio-net-device,netdev=net0
```

두 VM이 *직접 통신*. NIC mesh 시뮬레이션·distributed system 학습에 유용.

## vhost-net — 고성능

TAP의 kernel-bypass 버전. *Linux host*에서만 사용 가능.

```bash
qemu-system-aarch64 -enable-kvm ... \
    -netdev tap,id=net0,vhost=on,ifname=tap0,script=no \
    -device virtio-net-pci,netdev=net0
```

KVM + vhost-net 조합으로 throughput이 *수 배* 증가. cloud FPGA·SmartNIC 시뮬레이션에 적합.

## DNS forwarding

user-mode에서는 host의 DNS resolver를 자동 forward. TAP 환경에서는 별도 설정이 필요합니다 — dnsmasq나 host의 systemd-resolved에 의존.

```bash
# tap + dnsmasq
sudo dnsmasq --interface=tap0 --bind-interfaces \
    --dhcp-range=192.168.100.50,192.168.100.150,12h \
    --dhcp-option=6,8.8.8.8
```

## TFTP 부팅 — user-mode가 가장 쉬움

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -bios u-boot.bin \
    -netdev user,id=net0,tftp=/srv/tftp \
    -device virtio-net-device,netdev=net0
```

`tftp=...`로 QEMU의 *내장 TFTP*. host의 tftpd를 띄울 필요 없이 *guest에서 즉시 tftpboot* 가능.

U-Boot에서:

```text
=> setenv serverip 10.0.2.2
=> tftpboot 0x40400000 Image
```

## 흔한 함정

- **IP 못 받음** — `-netdev user`는 DHCP를 *자동 제공*. guest의 NIC가 *DHCP client*를 켰는지 확인.
- **TAP 권한 부족** — `script=no` 안 주면 QEMU가 setuid 필요. root 권한 또는 script 명시.
- **bridge 설정 후 host 인터넷 끊김** — eth0를 bridge에 묶을 때 IP가 *eth0에서 br0로* 옮겨가야. NetworkManager가 자동 처리 못할 수 있음.
- **MAC 충돌** — 여러 guest를 띄울 때 같은 MAC. `mac=...`을 명시적으로 다르게.

## 정리

- 네트워크 backend: **user-mode(SLIRP)**·**TAP**·**socket**·**vhost-net** 네 방식.
- user-mode는 가장 간단·NAT 자동·root 불필요. CI에 최적.
- `hostfwd`로 host-guest 포트 매핑(SSH 등).
- TAP은 실 NIC처럼 동작·bridge로 LAN 노출. production-like.
- socket으로 *다중 VM* 시뮬레이션.
- vhost-net으로 *kernel-bypass* 고성능.
- TFTP는 user-mode의 `tftp=...` 옵션이 가장 빠른 방법.
- DNS·DHCP·bridge 설정은 host 환경 의존이 큼.

## 다음 장 예고

다음 장은 *디버깅의 결정적 도구* — **GDB 원격 디버깅**. kernel·firmware·user app까지 breakpoint·step·register dump 흐름.

## 관련 항목

- [Ch 8: 페리페럴 추가](/blog/tools/emulation/qemu-embedded/chapter08-peripherals)
- [Ch 10: GDB 원격 디버깅](/blog/tools/emulation/qemu-embedded/chapter10-gdb-remote)
- [QEMU RISC-V — 풀 스택 부팅](/blog/tools/emulation/qemu-riscv/chapter09-full-stack-boot)
- [QEMU Internals — Network Layer](/blog/tools/emulation/qemu-internals/chapter06-network-layer)
