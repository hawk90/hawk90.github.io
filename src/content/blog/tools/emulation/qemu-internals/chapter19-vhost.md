---
title: "Ch 19: vhost-net·vhost-user"
date: 2026-05-17T19:00:00
description: "Kernel·userspace backend offload — QEMU bypass."
tags: [QEMU, vhost, vhost-user, dpdk, kernel-bypass]
series: "QEMU Internals"
seriesOrder: 19
draft: true
---

VirtIO datapath의 *극한 성능*은 QEMU를 *완전히 우회*하는 **vhost**에서 나옵니다. *kernel*(vhost-net·vhost-scsi·vhost-blk)이나 *user-space process*(vhost-user)가 *virtqueue 처리*를 직접 담당. QEMU는 *control plane*만 다룹니다.

## 왜 vhost인가

VirtIO의 *fast path*도 *vmexit + device emulation + backend*를 거치므로 *수 µs* latency. high-throughput NIC·NVMe에 *그 비용*이 누적되면 throughput 한계.

| 방식 | latency |
|------|---------|
| QEMU device emulation | 5~15 µs |
| VirtIO + virtio-blk | 3~8 µs |
| VirtIO + vhost-net (kernel) | 1~2 µs |
| VirtIO + vhost-user (DPDK) | <1 µs |

DPDK 같은 *user-space packet switch*와 결합 시 100 Gbps NIC도 처리.

## vhost 모델

```text
Guest                        Host
─────────────────────────────────
virtio-net driver
        │
        │ doorbell (KVM ioeventfd)
        │       ▼
        │  vhost-net kernel module
        │       │
        │       └─ vring fetch
        │       │
        │       └─ tap_send / packet processing
        │       │
        │       │ (no QEMU vmexit!)
        │       │
        │  ◀───┘ IRQ via irqfd
```

doorbell이 *KVM에서 직접* vhost-net으로 전달. 응답 IRQ도 *kernel에서 직접* guest로 inject. QEMU는 *setup·teardown*만.

## vhost protocol

QEMU와 vhost backend가 *공유 정보*를 ioctl 또는 socket으로 교환.

| Message | 의미 |
|---------|------|
| `VHOST_SET_OWNER` | 소유권 설정 |
| `VHOST_SET_MEM_TABLE` | memory region 정보 |
| `VHOST_SET_VRING_NUM` | ring 크기 |
| `VHOST_SET_VRING_ADDR` | ring 주소 |
| `VHOST_SET_VRING_KICK` | doorbell eventfd |
| `VHOST_SET_VRING_CALL` | IRQ eventfd |
| `VHOST_NET_SET_BACKEND` | tap fd |

이 셋업 후 *data path*는 vhost가 *직접*. QEMU는 끼지 않음.

## vhost-net

`drivers/vhost/net.c`(Linux kernel module).

```bash
qemu-system-x86_64 -enable-kvm \
    -netdev tap,id=net0,ifname=tap0,vhost=on,script=no \
    -device virtio-net-pci,netdev=net0
```

`vhost=on`이 활성. kernel module이 *tap0 fd*와 *virtio ring*을 직접 연결.

성능: *VirtIO 단독* 대비 *2~3× throughput*, *latency 절반*.

## vhost-scsi·vhost-blk

block I/O 버전. *file·block device*에 직접 접근.

```bash
qemu-system-x86_64 -enable-kvm \
    -object iothread,id=iothread0 \
    -drive file=disk.img,if=none,id=hd0,format=raw,cache=none,aio=native \
    -device vhost-scsi-pci,wwpn=naa.50014050000001,...
```

storage IOPS critical workload에 유용.

## vhost-user — userspace

```text
QEMU ←socket→ vhost-user process (e.g., DPDK)
                  │
                  ▼
                packet processing (DPDK PMD)
```

vhost-net이 *kernel*이라면 vhost-user는 *user-space process*. **DPDK**·**OVS-DPDK** 같은 *packet switch*가 backend.

```bash
qemu-system-x86_64 \
    -chardev socket,id=char0,path=/var/run/vhost-user.sock \
    -netdev vhost-user,id=net0,chardev=char0 \
    -device virtio-net-pci,netdev=net0
```

DPDK process가 *socket path*로 attach. QEMU와 *memory share*(memfd).

## Shared memory

vhost-user의 핵심 — guest의 RAM을 host의 *다른 process*가 *직접* 접근.

```bash
-object memory-backend-memfd,id=mem,size=4G,share=on \
-numa node,memdev=mem
```

`memfd`로 *anonymous file 생성*. QEMU와 DPDK가 *같은 fd*를 mmap → 같은 memory.

## vDPA — virtual DPA

**vDPA**(Virtual Data Path Acceleration)는 *real HW NIC*의 datapath를 *virtio처럼* 노출.

```text
Guest                vDPA driver           HW NIC
─────────────────────────────────────────
virtio-net    →    vhost-vDPA    →    SR-IOV VF
        (virtio ring)     (offload)
```

guest는 *virtio-net*으로 보지만 *실 NIC가 직접* packet 처리. cloud provider의 *SmartNIC*에 표준.

## vhost-vsock

guest와 host의 *socket-like 통신*. AF_VSOCK API.

```bash
-device vhost-vsock-pci,guest-cid=3
```

```c
/* guest */
int fd = socket(AF_VSOCK, SOCK_STREAM, 0);
struct sockaddr_vm addr = { .svm_family = AF_VSOCK,
                            .svm_cid = VMADDR_CID_HOST,
                            .svm_port = 1234 };
connect(fd, ...);
```

agentless guest management·serverless에 사용. Firecracker가 표준 활용.

## NUMA + vhost

```bash
-numa node,memdev=mem0,cpus=0-1 \
-numa node,memdev=mem1,cpus=2-3 \
-netdev tap,id=net0,vhost=on,queues=2
```

multi-queue vhost를 NUMA node에 분배해 *locality 보장*. 대규모 packet workload에 효과.

## Cross-version compatibility

vhost-user protocol이 *versioning*되어 있어 *host와 vhost-user process*가 다른 버전이면 *feature subset* 협상.

```c
VHOST_USER_GET_FEATURES   /* server's features */
VHOST_USER_SET_FEATURES   /* client's acceptance */
```

DPDK 22.x와 QEMU 8.x가 다른 feature set이면 *공통 부분*만 사용.

## vhost monitoring

```bash
# vhost-net kernel
cat /proc/vmstat | grep vhost

# vhost-user process
dpdk-procinfo
```

throughput·packet loss·queue depth 같은 metric을 *kernel/process tooling*으로.

## Production 시나리오

| 도메인 | vhost variant |
|--------|---------------|
| OpenStack cloud | vhost-net for VirtIO net |
| Telco NFV | vhost-user + DPDK + OVS |
| Public cloud (AWS·Azure) | vDPA + SmartNIC |
| Database VM | vhost-blk + NVMe direct |
| Edge compute | vhost-vsock for host-guest API |

## QEMU 측 vhost driver

`hw/virtio/vhost.c`가 QEMU 측 vhost client.

```c
struct vhost_dev {
    /* vhost backend (kernel or user) */
    int vhost_fd;
    /* virtio device */
    VirtIODevice *vdev;
    /* memory regions */
    struct vhost_memory *mem;
    /* virtqueues */
    struct vhost_virtqueue *vqs;
    /* ... */
};
```

`vhost_dev_init`·`vhost_dev_start`·`vhost_dev_stop`이 lifecycle.

## 흔한 함정

- **vhost-net kernel module 부재** — `modprobe vhost_net`. 없으면 fallback to QEMU.
- **vhost-user socket permission** — DPDK process와 QEMU가 다른 user면 socket access 실패.
- **memory share 누락** — DPDK가 guest memory 못 봄. `memory-backend-memfd,share=on` 명시.
- **feature mismatch** — vhost backend가 *guest 요청 feature* 지원 안 하면 *fallback* 또는 fail.

## 정리

- **vhost**가 VirtIO datapath를 *QEMU 우회*. kernel(vhost-net·vhost-blk·vhost-scsi) 또는 userspace(vhost-user).
- vhost protocol로 QEMU·backend 셋업. data path는 *완전 우회*.
- **vhost-net**으로 packet 2~3× 가속. **vhost-user**로 DPDK 통합 100Gbps급.
- **memory share**(memfd)가 vhost-user의 핵심.
- **vDPA**로 real HW NIC datapath를 virtio처럼 노출. SmartNIC cloud.
- **vhost-vsock**으로 host-guest socket API. Firecracker.
- production: OpenStack·NFV·public cloud·DB VM·edge.

## 다음 장 예고

다음 장은 *minimal QEMU* — **microvm machine**. 부팅 < 100ms의 serverless 환경.

## 관련 항목

- [Ch 18: VirtIO Impl](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
- [Ch 20: microvm Machine](/blog/tools/emulation/qemu-internals/chapter20-microvm)
- [Ch 6: Network Layer](/blog/tools/emulation/qemu-internals/chapter06-network-layer)
- [FPGA Driver — VFIO-PCI](/blog/tools/emulation/qemu-fpga-driver/chapter10-vfio-pci-passthrough)
