---
title: "Ch 6: 네트워크 레이어"
date: 2026-05-17T06:00:00
description: "QEMU NIC 에뮬레이션과 네트워크 백엔드를 이해한다."
tags: [QEMU, Network, NIC, virtio-net, tap, vhost]
series: "QEMU Internals"
seriesOrder: 6
draft: true
---

QEMU network layer는 *NIC frontend*와 *backend*가 *분리된* 구조입니다. guest가 보는 NIC(`virtio-net`·`e1000`·`rtl8139`)와 host의 backend(`tap`·`user`·`socket`·`vhost`)가 *자유롭게 조합*되어, *서로 다른 시나리오*를 같은 코드에서 처리합니다.

## Frontend / Backend 분리

```text
┌──────────────────┐
│ Guest NIC        │  ← virtio-net, e1000, rtl8139, virtio-net-pci
│ (Frontend)       │
└────────┬─────────┘
         │
┌────────▼─────────┐
│ NetClientState   │  ← QEMU internal abstraction
└────────┬─────────┘
         │
┌────────▼─────────┐
│ Backend          │  ← tap, user, socket, vhost-user, l2tpv3
└──────────────────┘
```

NetClientState가 *교환점*. guest는 e1000을, host는 vhost-net을 쓰는 등 *자유 조합*.

## CLI 흐름

```bash
qemu-system-x86_64 -netdev tap,id=net0,ifname=tap0,script=no \
    -device virtio-net-pci,netdev=net0,mac=52:54:00:12:34:56
```

| 옵션 | 의미 |
|------|------|
| `-netdev` | **backend** 정의 |
| `-device` | **frontend** 정의 |
| `netdev=net0` | frontend가 backend 참조 |
| `mac=...` | NIC의 MAC address |

## NIC frontend 종류

| Frontend | 특징 |
|----------|------|
| `virtio-net-pci` | paravirtualized, 최고 성능 |
| `virtio-net-device` | MMIO 버전 (ARM virt 등) |
| `e1000` / `e1000e` | Intel 8254x/82574 호환 — driver 풍부 |
| `rtl8139` | Realtek — legacy |
| `vmxnet3` | VMware paravirt — VMware 호환 |
| `pcnet` | AMD PCnet — old NetWare 등 |
| `tulip` | DEC 21x4x |

성능은 *virtio-net이 압도적*. e1000 등은 *legacy guest* 호환용.

## Backend 종류

| Backend | 의미 |
|---------|------|
| `user` (SLIRP) | host kernel 우회, NAT |
| `tap` | host tap0 인터페이스 |
| `socket` | QEMU 간 통신 |
| `vhost-user` | DPDK 같은 user-space switch |
| `l2tpv3` | L2TPv3 tunneling |
| `bridge` | tap + bridge auto |
| `vhost-vsock` | host-guest socket |

## User-mode (SLIRP) 구현

`net/slirp.c`가 *user-space TCP/IP stack*. host kernel을 거치지 않고 SLIRP library가 *NAT을 직접 처리*.

- 게스트 패킷 → SLIRP → host kernel의 *application socket*
- 응답 → SLIRP → 게스트 NIC
- ICMP는 raw socket 필요(권한)·일부 제한

```bash
-netdev user,id=net0,hostfwd=tcp::2222-:22
```

`hostfwd`로 host 포트를 guest로 forward.

## TAP backend

```c
static ssize_t tap_receive_iov(NetClientState *nc,
                                const struct iovec *iov, int iovcnt) {
    TAPState *s = (TAPState *)nc;
    return writev(s->fd, iov, iovcnt);   /* tap0에 write */
}
```

guest의 NIC가 패킷 송신하면 `tap_receive_iov`가 host의 *tap0 fd에 write*. host kernel이 패킷을 라우팅.

## vhost-net — kernel bypass

KVM 환경에서 *virtio-net의 datapath*를 *host kernel module*이 직접 처리. vmexit 없이 guest의 vring을 *kernel space에서* 처리.

```bash
qemu-system-x86_64 -enable-kvm \
    -netdev tap,id=net0,ifname=tap0,vhost=on,script=no \
    -device virtio-net-pci,netdev=net0
```

`vhost=on`이 결정. 성능 *수 배* 향상.

## vhost-user — user-space switch

DPDK·OVS-DPDK 같은 *user-space packet switch*와 통합.

```bash
qemu-system-x86_64 \
    -chardev socket,id=char0,path=/tmp/vhost-user.sock \
    -netdev vhost-user,id=net0,chardev=char0 \
    -device virtio-net-pci,netdev=net0
```

DPDK process가 *socket*으로 QEMU에 attach해 *zero-copy* packet 처리.

## VirtIO net — vring 구조

virtio-net의 packet 전달은 *vring buffer*를 통함.

```text
Guest                         QEMU
─────────────────────────────────
TX vring
├── desc 0: skb addr/len
├── desc 1: skb addr/len    →  read descriptor
└── avail idx               →  fetch packet
                            →  tap_write or vhost handle
                            ←  used idx update
                            ←  IRQ inject
```

3-ring 구조: descriptor·available·used. guest와 host가 *공유 메모리*로 동기화.

## NetClientState

QEMU 내부에서 NIC frontend와 backend를 잇는 *abstraction*.

```c
typedef struct NetClientState {
    NetClientInfo *info;           /* virtio, tap, user 등의 vtable */
    NetClientState *peer;          /* 반대편 */
    char *model;
    char *name;
    QTAILQ_ENTRY(NetClientState) next;
    /* ... */
} NetClientState;
```

`peer`로 frontend ↔ backend가 *서로 가리킴*. 패킷 송수신은 `peer->info->receive(peer, ...)`.

## Filter

netdev에 *filter*를 attach해 패킷 inspect·drop·duplicate.

```bash
-netdev tap,id=net0,... \
-object filter-buffer,id=fb0,netdev=net0,queue=all,interval=1000000 \
-object filter-dump,id=fd0,netdev=net0,file=net.pcap
```

`filter-dump`가 *pcap* 파일로 dump — Wireshark로 분석.

## Multi-queue

virtio-net이 *여러 queue*. CPU 코어별 분산.

```bash
-netdev tap,id=net0,vhost=on,queues=4 \
-device virtio-net-pci,netdev=net0,mq=on,vectors=10
```

guest 측 RSS(Receive Side Scaling)와 결합해 multi-core network performance ↑.

## RDMA — DPDK/SR-IOV

극한 성능이 필요하면 RDMA·SR-IOV로 NIC를 *직접 pass-through*(VFIO). QEMU network layer를 우회.

## 흔한 함정

- **-netdev와 -device의 id 불일치** — frontend가 backend 못 찾음.
- **MAC 충돌** — 여러 guest를 띄울 때 같은 MAC. `mac=`을 다르게.
- **tap 권한** — `script=no` 안 주면 setuid 필요. script로 자동화 권장.
- **vhost-net 부재** — 일부 host kernel에서 vhost.ko 없음. `lsmod | grep vhost`.

## 정리

- QEMU network는 **frontend(NIC) + backend** 분리 구조. NetClientState로 연결.
- Frontend: virtio-net·e1000·rtl8139·vmxnet3 등.
- Backend: user(SLIRP)·tap·socket·vhost-user·l2tpv3.
- **virtio-net + vhost**가 최고 성능 — kernel space에서 packet 처리.
- **vhost-user**로 DPDK/OVS-DPDK 통합.
- **Filter**로 packet inspect·pcap dump. Wireshark 분석.
- **Multi-queue**(`queues=N` + `mq=on`)로 multi-core scaling.
- Frontend·backend의 *id 일치*가 흔한 함정.

## 다음 장 예고

다음 장은 *PCI subsystem* — host bridge·BAR·MSI-X가 QEMU 안에서 어떻게 구현되는지.

## 관련 항목

- [Ch 5: 블록 레이어](/blog/tools/emulation/qemu-internals/chapter05-block-layer)
- [Ch 7: PCI 서브시스템](/blog/tools/emulation/qemu-internals/chapter07-pci-subsystem)
- [Ch 18: VirtIO Impl](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
- [Ch 19: vhost](/blog/tools/emulation/qemu-internals/chapter19-vhost)
