---
title: "Ch 19: vhost-net·vhost-user"
date: 2025-09-03T19:00:00
description: "Kernel·userspace backend offload — QEMU bypass."
tags: [QEMU, vhost, vhost-user, dpdk]
series: "QEMU Internals"
seriesOrder: 19
draft: true
---

## 이 챕터의 의도

virtio-net data path가 *guest → QEMU → host kernel*을 거치면 context switch 비용이 크다. **vhost-net**(kernel)과 **vhost-user**(userspace 백엔드, DPDK/SPDK)는 *QEMU process를 데이터패스에서 제거*해 throughput을 *수 배* 끌어올린다. 본 챕터는 vhost 프로토콜 + 백엔드별 구조.

## 핵심 항목

- ✦ Why vhost — virtio-net이 QEMU 거치면 *guest → vmexit → QEMU userspace → tap fd write → kernel TCP/IP* 다중 호스팅. vhost는 *QEMU 거치는 부분 제거*
- ✦ **vhost-net (kernel backend)**
  - `/dev/vhost-net` kernel module
  - QEMU가 virtqueue 정보·eventfd·KVM IRQFD를 vhost-net에 등록
  - 이후 *kernel thread*가 직접 virtqueue 처리 + tap I/O
  - QEMU는 *control path*만, data path는 우회
- ✦ **vhost-user (userspace backend)**
  - 백엔드가 *별도 process* — DPDK testpmd, SPDK vhost target, Open vSwitch
  - UNIX socket으로 control message
  - 공유 메모리로 virtqueue
  - eventfd로 notification (kick/call)
- ✦ vhost protocol
  - `VHOST_SET_OWNER`, `VHOST_GET_FEATURES`, `VHOST_SET_FEATURES`
  - `VHOST_SET_MEM_TABLE` — guest physical → host VA 매핑 전달
  - `VHOST_SET_VRING_NUM/ADDR/BASE/CALL/KICK`
  - vhost-user 추가 — `VHOST_USER_SET_LOG_BASE` (live migration), `_GET_QUEUE_NUM`, `_SET_VRING_ENABLE`
- ✦ vhost device 종류
  - **vhost-net** — virtio-net
  - **vhost-vsock** — VM↔host socket
  - **vhost-scsi** — virtio-scsi
  - **vhost-fs (virtiofs)** — 공유 파일시스템
  - **vhost-user-blk**, **vhost-user-net**, **vhost-user-gpu**
- ✦ Performance gain — context switch 제거, zero-copy (vhost-user는 shared mem)
- ✦ Live migration — vhost-user는 dirty page logging 별도 협의
- ✦ DPDK vhost-user backend — `testpmd`, OVS-DPDK
- ✦ SPDK vhost target — vhost-user-blk·vhost-user-scsi (Lightbits, NetApp 사용)
- ◦ **vDPA** — 다음 진화. vhost-user는 SW backend, vDPA는 HW backend (NIC 자체가 virtqueue spec 구현)

## 다이어그램 (4)

1. 3가지 path 비교 — QEMU virtio / vhost-net / vhost-user
2. vhost-net 흐름 — guest → KVM → vhost kernel thread → tap → host TCP/IP
3. vhost-user — control(socket) + data(shared mem) + notification(eventfd)
4. DPDK/SPDK vhost-user backend 구조

## 코드 sketch

```bash
# vhost-net (kernel backend) 활성
qemu-system-x86_64 -enable-kvm \
    -netdev tap,id=net0,vhost=on,vhostforce=on,queues=4 \
    -device virtio-net-pci,netdev=net0,mq=on,vectors=10

# vhost-user-blk + SPDK target
# 1) SPDK target 실행
sudo spdk_tgt &
sudo rpc.py bdev_malloc_create 1024 4096 -b Malloc0
sudo rpc.py vhost_create_blk_controller vhost.0 Malloc0

# 2) QEMU client
qemu-system-x86_64 -enable-kvm -m 4G \
    -object memory-backend-file,id=mem,size=4G,mem-path=/dev/hugepages,share=on \
    -numa node,memdev=mem \
    -chardev socket,id=spdk0,path=/var/tmp/vhost.0 \
    -device vhost-user-blk-pci,chardev=spdk0,num-queues=4
```

```c
/* vhost-user message handler (단순화) */
static void vhost_user_process_msg(VhostUserMsg *msg) {
    switch (msg->request) {
    case VHOST_USER_SET_MEM_TABLE:
        /* guest mem region 정보 등록, mmap host VA로 */
        for (int i = 0; i < msg->payload.memory.nregions; i++) {
            VhostUserMemoryRegion *r = &msg->payload.memory.regions[i];
            void *mapped = mmap(NULL, r->memory_size, PROT_READ | PROT_WRITE,
                                MAP_SHARED, fds[i], r->mmap_offset);
            /* guest_phys r->guest_phys_addr → host_virt mapped */
        }
        break;
    case VHOST_USER_SET_VRING_KICK:
        /* eventfd 등록 — driver가 notify할 때 fd readable */
        register_kick_fd(msg->payload.u64, fds[0]);
        break;
    case VHOST_USER_SET_VRING_CALL:
        /* eventfd 등록 — backend가 write하면 driver IRQ */
        register_call_fd(msg->payload.u64, fds[0]);
        break;
    }
}
```

```c
/* QEMU 측 — vhost backend 전환 */
static int vhost_dev_init(VhostDev *hdev, int kernel_or_user) {
    if (kernel_or_user == VHOST_BACKEND_KERNEL) {
        hdev->vhost_fd = open("/dev/vhost-net", O_RDWR);
        /* ioctl로 protocol */
    } else {
        /* vhost-user — UNIX socket connect */
        hdev->fd = connect_unix(path);
        /* socket message로 protocol */
    }
}
```

## 레퍼런스

- QEMU `Documentation/interop/vhost-user.rst` — protocol full spec
- QEMU `hw/virtio/vhost-user.c`, `hw/virtio/vhost.c`
- Linux `drivers/vhost/`
- DPDK `lib/librte_vhost/`
- SPDK `lib/vhost/`
- "vhost-user: A virtio in user space" — Michael Tsirkin

## 관련 항목

- [Ch 18: VirtIO 구현 심화](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
- [Ch 20: microvm](/blog/tools/emulation/qemu-internals/chapter20-microvm)
- [PCIe Ch 13: vIOMMU/S-IOV/VirtIO-PCI](/blog/embedded/hardware/pcie/) — vDPA 진화 방향
