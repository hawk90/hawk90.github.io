---
title: "Ch 20: microvm Machine"
date: 2026-05-17T20:00:00
description: "virtio-mmio·minimal boot·serverless VM."
tags: [QEMU, microvm, serverless, firecracker, fast-boot]
series: "QEMU Internals"
seriesOrder: 20
draft: true
---

기존 QEMU 머신(`pc`·`q35`·`virt`)은 *legacy PCI host bridge·ACPI·BIOS*를 포함해 무거웠습니다. *serverless·함수 단위* 워크로드에서는 부팅 시간 *수초*도 부담입니다. **microvm**은 그 모든 *불필요한 부분*을 빼서 *<100ms 부팅*을 가능하게 한 *minimal machine*입니다.

## 무엇을 빼는가

microvm vs pc-q35.

| 항목 | pc-q35 | microvm |
|------|--------|---------|
| Firmware | OVMF (UEFI) | 없음·linux boot only |
| PCI host bridge | 있음 | 없음 (PCI 없음) |
| ACPI | 있음 | 없음 (cmdline·DT-free) |
| Legacy devices | RTC, serial, etc. | 최소 |
| Device transport | virtio-pci | **virtio-mmio** |
| Boot time | 1~5초 | <100ms |
| 메모리 footprint | ~20MB | ~5MB |

*serverless function*의 cold start에 적합.

## 사용

```bash
qemu-system-x86_64 -M microvm,x-option-roms=off,pic=off,pit=off,rtc=off \
    -enable-kvm -cpu host -m 128M \
    -nodefaults -no-user-config \
    -kernel vmlinux \
    -append "console=hvc0 reboot=k panic=-1 nomodule" \
    -chardev stdio,id=virtiocon0 \
    -device virtio-serial-device \
    -device virtconsole,chardev=virtiocon0 \
    -netdev tap,id=net0,vhost=on,script=no \
    -device virtio-net-device,netdev=net0
```

| 옵션 | 의미 |
|------|------|
| `-M microvm` | machine 선택 |
| `x-option-roms=off` | option ROM 제거 |
| `pic=off,pit=off,rtc=off` | legacy device 제거 |
| `-nodefaults` | QEMU의 default device 모두 제거 |
| `virtio-*-device` | virtio-mmio 사용 (PCI 아님) |
| `console=hvc0` | virtio serial console |

## 부팅 흐름

```text
1. QEMU 시작 + KVM_RUN  (~10ms)
        │
2. Linux kernel direct boot (kernel header에 entry)
        │
3. kernel decompression + early init (~30ms)
        │
4. virtio-mmio device probe (~10ms)
        │
5. init (~30ms)
        │
6. application start (~10ms)

Total: ~90ms cold start
```

*BIOS·UEFI·grub 없음*. kernel이 *직접* 진입.

## virtio-mmio 디바이스

PCI 대신 *memory-mapped*.

```c
/* hw/virtio/virtio-mmio.c */
typedef struct VirtIOMMIOProxy {
    SysBusDevice parent_obj;
    MemoryRegion iomem;
    VirtIODevice *vdev;
    qemu_irq irq;
    /* ... */
} VirtIOMMIOProxy;
```

guest는 `/dev/vda` 같은 device가 *MMIO를 직접* 접근. PCI scan 없음 — *kernel cmdline에 명시*.

```text
console=hvc0  (virtio console)
root=/dev/vda (virtio-blk)
ip=dhcp (virtio-net)
```

## Direct kernel boot

QEMU가 *Linux kernel image*를 *직접 로드*. bootloader 없음.

```c
load_linux_efi(...)  /* uefi 사용 시 */
load_linux(...);     /* direct kernel — microvm 사용 */
```

`load_linux`가 *kernel image header*를 파싱해 *entry point*에 점프. memory map·cmdline·initrd info를 *register 또는 별도 영역*으로 전달.

## Firecracker — microvm 응용

AWS의 **Firecracker**가 QEMU microvm의 *극한 minimal*. 자체 VMM이지만 *QEMU microvm과 같은 철학*.

| 항목 | Firecracker | QEMU microvm |
|------|-------------|---------------|
| Codebase | Rust, 80k lines | QEMU 전체 |
| Boot | <150ms | <100ms |
| Devices | virtio-mmio only | virtio-mmio + 일부 legacy |
| 사용처 | AWS Lambda·Fargate | OpenShift Sandboxed Containers, Kata |

서로 *호환 메뉴*(virtio-mmio·direct kernel boot). 코드는 분리.

## 사용 사례

| 도메인 | 이유 |
|--------|------|
| Serverless | cold start <100ms |
| Sandboxed container | container의 보안 격리 |
| FaaS (Function-as-a-Service) | request-per-VM 모델 |
| CI/CD runner | 격리된 단발성 환경 |
| edge computing | resource 절약 |

## guest kernel 최적화

microvm을 *진짜 빨리* 부팅하려면 guest kernel도 *최소 config*.

```text
CONFIG_TINYCONFIG=y   # base
CONFIG_VIRTIO_MMIO=y
CONFIG_VIRTIO_NET=y
CONFIG_VIRTIO_BLK=y
CONFIG_VIRTIO_CONSOLE=y
CONFIG_INIT_STACK_NONE=y   # 보안 layer 일부 제거
```

`vmlinux` 크기 *2~3MB*까지 줄임. decompression 시간 단축.

## rootfs 최소

Buildroot·`busybox`로 *수 MB rootfs*. initramfs 사용.

```bash
qemu-system-x86_64 -M microvm ... \
    -kernel vmlinux \
    -initrd rootfs.cpio.gz \
    -append "console=hvc0 init=/sbin/myapp"
```

`/sbin/myapp`이 *유일한 process*. Linux init 같은 system manager 없음.

## Snapshot + restore — pre-warmed VM

cold start 더 줄이려면 *snapshot에서 restore*.

```bash
# 미리 만든 snapshot에서 restore
qemu-system-x86_64 -M microvm ... -loadvm vm-image.snap
```

application이 *이미 running 상태*. 첫 request에 즉시 응답.

Firecracker의 *snapshot-based scaling*이 이 메커니즘.

## memory ballooning

각 microvm이 *고정 memory*보다 *동적*. virtio-balloon으로 idle 시 *host에 반환*.

```bash
-device virtio-balloon-device
```

QMP:

```text
{ "execute": "qom-set",
  "arguments": { "path": "/machine/peripheral-anon/device[0]",
                 "property": "guest-stats-polling-interval",
                 "value": 60 } }
```

## Comparison — Container vs microvm

| 측면 | Container | microvm |
|------|-----------|---------|
| 격리 | namespace + cgroup | full VM (HW) |
| 시작 시간 | <10ms | <100ms |
| 메모리 | <10MB | ~30MB |
| 보안 격리 | weak (kernel 공유) | strong (KVM) |
| OS 의존 | host kernel | own kernel |

microvm이 *container보다 약간 느리지만 훨씬 강한 격리*. 멀티 테넌트 서버에 적합.

## QMP control

```text
{ "execute": "device_add",
  "arguments": { "driver": "virtio-net-device", ... } }
```

VM start 후 device 동적 추가. 단, microvm은 *PCI hotplug 없음* — virtio-mmio slot 미리 reserve.

## 디버깅

microvm은 *legacy console 없음*. virtio-console 사용.

```bash
-chardev stdio,id=virtiocon0 \
-device virtio-serial-device \
-device virtconsole,chardev=virtiocon0
```

stdio가 guest의 `/dev/hvc0`에 연결.

## 흔한 함정

- **PCI device 시도** — microvm은 PCI 없음. `virtio-blk-pci`가 아닌 `virtio-blk-device`.
- **ACPI 의존 OS** — microvm은 ACPI 없음. Linux는 OK, Windows·BSD는 어려움.
- **option ROM 활성** — `x-option-roms=on`이면 부팅 ~100ms 추가.
- **`-nodefaults` 누락** — QEMU의 default가 기본 device 추가해 *느려짐*.

## 정리

- **microvm**은 *minimal machine* — virtio-mmio·direct kernel boot·legacy 제거.
- 부팅 <100ms·메모리 ~5MB. serverless·sandboxed container·FaaS에 적합.
- *PCI·ACPI·BIOS·option ROM 없음*. virtio-mmio device transport.
- `load_linux`가 kernel image entry point로 직접 점프.
- **Firecracker**와 *호환 표준*. AWS Lambda의 기반.
- guest kernel + rootfs 최소화로 추가 가속.
- Snapshot restore로 *pre-warmed VM* — 즉시 응답.
- Container 대비 *약간 느리지만 강한 격리*.

## 다음 장 예고

다음 장은 *cloud workload의 보안 격리* — **confidential computing**(SEV·TDX).

## 관련 항목

- [Ch 19: vhost](/blog/tools/emulation/qemu-internals/chapter19-vhost)
- [Ch 21: Confidential Computing](/blog/tools/emulation/qemu-internals/chapter21-confidential)
- [QEMU Embedded — TrustZone](/blog/tools/emulation/qemu-embedded/chapter16-trustzone)
