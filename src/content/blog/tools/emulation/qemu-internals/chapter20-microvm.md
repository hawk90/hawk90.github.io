---
title: "Ch 20: microvm Machine"
date: 2025-09-03T20:00:00
description: "virtio-mmio·minimal boot·serverless VM."
tags: [QEMU, microvm, serverless, firecracker]
series: "QEMU Internals"
seriesOrder: 20
draft: true
---

## 이 챕터의 의도

AWS Lambda 같은 *serverless*는 **함수 한 번 호출 = VM 한 번 부팅**. 일반 q35/virt는 ACPI·PCI enum에 *수 초*가 걸려 부적합. QEMU `microvm` machine은 *모든 legacy 제거*로 **~125ms 부팅**. Firecracker가 이 아이디어를 극단까지 — 본 챕터는 microvm 구조 + Firecracker 비교 + serverless 운영.

## 핵심 항목

- ✦ **microvm machine** (`-machine microvm`) — minimal architecture
- ✦ 제거된 것 — ACPI, PCI bus, SeaBIOS, legacy PIC, RTC, VGA, USB, floppy
- ✦ 남은 것 — virtio-mmio (PCI 없이), 8250 UART, GIC 등 필수
- ✦ **virtio-mmio bus** — PCI enum 없이 *컴파일 타임*에 fixed address
- ✦ Boot time — q35 ACPI ~2s, virt ~1s, **microvm ~125ms**
- ✦ Direct kernel boot — bootloader 없이 `-kernel` 직접
- ✦ Memory — 128MB도 충분 (kernel + busybox)
- ✦ **Firecracker** — AWS가 microvm 아이디어를 *Rust로 rewrite + 더 작게*
  - 1 VM당 ~5MiB user memory 오버헤드
  - 시작 시간 ~125ms
  - VMM 자체가 ~30K LOC (QEMU 1.5M LOC와 비교)
  - vsock, virtio-net, virtio-block, balloon만 지원
  - jailer로 seccomp + namespace 격리
- ✦ **Cloud Hypervisor** — Intel·Rust, microvm + 추가 (CXL, SR-IOV)
- ✦ Use case
  - AWS Lambda, Fargate
  - **kata-containers** — VM-based container runtime
  - **gVisor** — userspace kernel + microvm
  - **fly.io machines** — VM-per-app
- ✦ Snapshot/suspend/resume 최적화 — UFFD (Userfault File Descriptor) + lazy page restore
- ✦ Boot 최적화
  - Direct kernel boot (no bootloader)
  - PVH boot entry — Linux PVH ABI, ELF 직접
  - Kernel debloating
- ◦ Firecracker API — RESTful, JSON config

## 다이어그램 (4)

1. q35 vs virt vs microvm vs Firecracker — 부팅 시간 + 메모리 비교
2. microvm device set (UART + GIC + virtio-mmio 1-2개)
3. Serverless 운영 — request → VM clone → run → kill, 100ms 사이클
4. snapshot-restore — full snapshot → UFFD lazy page

## 코드 sketch

```bash
# QEMU microvm 부팅
qemu-system-x86_64 -enable-kvm -M microvm \
    -m 128M -nographic -no-acpi \
    -kernel vmlinux-microvm -append "console=hvc0 root=/dev/vda" \
    -drive id=hd0,file=rootfs.img,format=raw,if=none \
    -device virtio-blk-device,drive=hd0 \
    -netdev tap,id=net0,vhost=on \
    -device virtio-net-device,netdev=net0

# 부팅 시간 측정
time qemu-system-x86_64 -enable-kvm -M microvm ...
# real: 0m0.135s
```

```bash
# Firecracker 시작
firecracker --api-sock /tmp/fc.sock &

# API로 config
curl -X PUT 'http://localhost/boot-source' --data '{
  "kernel_image_path": "vmlinux",
  "boot_args": "console=ttyS0 reboot=k panic=1"
}'

curl -X PUT 'http://localhost/drives/rootfs' --data '{
  "drive_id": "rootfs",
  "path_on_host": "rootfs.ext4",
  "is_root_device": true,
  "is_read_only": false
}'

curl -X PUT 'http://localhost/actions' --data '{ "action_type": "InstanceStart" }'

# 부팅 ~125ms
```

```rust
// Firecracker 핵심 — Rust로 매우 작게
fn main() {
    let vmm = Vmm::new(&config)?;
    vmm.start_vcpus()?;
    vmm.run_event_loop();   // KVM run loop, API server
}
```

## 레퍼런스

- QEMU `Documentation/system/i386/microvm.rst`
- QEMU `hw/i386/microvm.c`
- Firecracker — github.com/firecracker-microvm/firecracker
- "Firecracker: Lightweight Virtualization for Serverless Applications" — Agache et al. NSDI 2020
- kata-containers — github.com/kata-containers/kata-containers
- Cloud Hypervisor — github.com/cloud-hypervisor/cloud-hypervisor

## 관련 항목

- [Ch 14: KVM accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [Ch 19: vhost-net/vhost-user](/blog/tools/emulation/qemu-internals/chapter19-vhost)
- [Ch 21: Confidential computing](/blog/tools/emulation/qemu-internals/chapter21-confidential)
- [Ch 22: Snapshot vs migration](/blog/tools/emulation/qemu-internals/chapter22-snapshot-vs-migration)
