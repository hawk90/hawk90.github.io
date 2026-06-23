---
title: "Ch 10: VFIO-PCI 패스스루"
date: 2026-05-17T10:00:00
description: "실 FPGA를 VM에 — bind·unbind·reset 흐름."
tags: [QEMU, vfio-pci, passthrough, fpga]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 10
draft: true
---

실 FPGA가 도착했습니다. **VFIO-PCI**로 guest VM에 *직접 pass-through*하면, fake-fpga로 짠 driver를 *수정 없이* 그대로 VM에서 실 보드에 사용할 수 있습니다. 시리즈의 step 1(fake)에서 step 2(실 보드)로 넘어가는 결정적 단계입니다.

## 무엇을 푸는가

실 FPGA를 host에 꽂으면 vendor driver(xocl, intel-fpga 등)가 자동으로 binding됩니다. 우리 목적은:

- *host driver를 떼어내고* vfio-pci에 device 맡기기
- QEMU로 guest VM 띄우면서 *그 device를 guest에 노출*
- guest 안에서 fake용 driver 그대로 사용

이로써 driver의 *수정 없이* 실 보드 검증이 됩니다.

## 단계별 흐름

```text
[Host]                          [Guest VM]
                                
  실 FPGA bind된 상태             (없음)
       │
       ▼
  host driver unbind
       │
       ▼
  vfio-pci bind
       │
       ▼
  IOMMU group + container        ← (QEMU 시작)
       │                              │
       ▼                              ▼
                              QEMU vfio-pci 드라이버
                                      │
                                      ▼
                              Guest 안 PCI scan
                                      │
                                      ▼
                              Guest 안 my-fake-fpga driver
                                      │
                                      ▼
                              "Fake FPGA IDENT: 0x584c4e58"
```

## Host 측 — VFIO 바인딩

```bash
DEV=0000:01:00.0
sudo lspci -nn -s $DEV
# 01:00.0 ... [10ee:9038] (Xilinx Alveo U250)

# 1. Vendor driver unbind
echo $DEV | sudo tee /sys/bus/pci/devices/$DEV/driver/unbind

# 2. vfio-pci에 새 ID 등록
echo "10ee 9038" | sudo tee /sys/bus/pci/drivers/vfio-pci/new_id

# 3. FLR(Function-Level Reset)으로 clean state
echo 1 | sudo tee /sys/bus/pci/devices/$DEV/reset

# 4. 확인
ls -la /sys/bus/pci/devices/$DEV/iommu_group/devices/
ls /dev/vfio/   # 새 group 번호 보임
```

`new_id`를 한 번 등록해 두면 *같은 vendor/device의 모든 device*가 자동 binding됩니다. 한 번만 set up하면 됩니다.

## QEMU에 mount

guest를 띄우면서 vfio-pci device를 attach.

```bash
sudo qemu-system-x86_64 -enable-kvm -m 8G -smp 4 \
    -kernel vmlinuz -initrd rootfs.img \
    -device vfio-pci,host=$DEV,id=fpga0 \
    -nographic -append "console=ttyS0"
```

핵심 옵션: `-device vfio-pci,host=01:00.0,id=fpga0`. host에서 *그 BDF*의 device를 guest에 노출합니다.

## Guest 안 확인

```bash
# guest$ lspci -nn | grep 10ee
01:00.0 ... [10ee:9038]   # 같은 device, 같은 ID로 보임

# 우리 driver insert
guest$ insmod my_fpga.ko
guest$ dmesg | grep my_fpga
my_fpga 0000:01:00.0: probed
my_fpga 0000:01:00.0: BAR0 mapped at ffff...
my_fpga 0000:01:00.0: User logic version 0x1234
```

driver는 *수정 없이* 동작합니다. fake-fpga와 실 Alveo의 register layout이 호환되도록 만든 보상.

## Function-Level Reset (FLR)

PCIe device를 *깨끗하게* 다음 사용자에게 넘기려면 reset이 필요합니다.

| 방식 | 의미 |
|------|------|
| **FLR** (Function-Level Reset) | PCIe Spec의 표준 — config space에서 trigger |
| **Secondary Bus Reset** | FLR 미지원 시 fallback. 같은 bus의 모든 device reset |
| **Hot Reset** | bus 전체 reset (drastic) |

driver pass-through 전후로 자동으로 reset이 일어나지만, *문제가 있을 때* 수동으로 trigger 가능.

```bash
echo 1 | sudo tee /sys/bus/pci/devices/$DEV/reset
```

## INTx vs MSI/MSI-X passthrough

| 방식 | 경로 | 성능 |
|------|------|------|
| INTx | host가 받아서 KVM IRQ inject | 느림(vmexit 필수) |
| MSI/MSI-X | eventfd → KVM IRQFD | 거의 native |

FPGA는 거의 항상 MSI-X. KVM이 *직접* eventfd를 guest interrupt vector로 라우팅하므로 vmexit이 IRQ 자체에는 발생하지 않습니다.

## BAR mapping

`-device vfio-pci`는 다음을 처리합니다.

1. host에서 `VFIO_DEVICE_GET_REGION_INFO`로 BAR 정보 조회.
2. host가 `mmap(device_fd, ...)`로 BAR을 자신의 메모리 공간에 mapping.
3. KVM이 그 mapping을 *guest physical address*로 라우팅.

결과: guest에서 BAR access가 *host의 mmap된 메모리*에 *직접* 도달. 추가 vmexit 없음.

## DMA — IOMMU 변환

guest가 DMA를 시도하면:

1. guest driver가 *guest physical address*(GPA)로 DMA descriptor 작성.
2. FPGA가 그 GPA로 PCIe transaction.
3. IOMMU가 *GPA → host physical address* 변환.
4. host RAM에 실제 접근.

guest는 자기 PA로 *알고* DMA하지만, IOMMU가 *투명하게* host PA로 변환. 보안 격리 + 성능.

## 성능 비교

| 방식 | overhead |
|------|----------|
| Device emulation (e.g., e1000) | 10~30% (모든 MMIO·DMA vmexit) |
| Paravirtual (e.g., virtio) | 5~15% (vring 최적화) |
| **VFIO pass-through** | **<5%** (IRQ·일부 DMA 검사만 trap) |
| SR-IOV (Ch 11) | < 5% |

```bash
# host
$ ./fpga_bench --iter 100000
Latency p50: 5.2 µs, p99: 8.1 µs

# guest (VFIO pass-through)
$ ./fpga_bench --iter 100000
Latency p50: 5.4 µs, p99: 8.5 µs   # <5% overhead
```

이 격차가 cloud FPGA(AWS F1, Azure NP)의 *VM-based 제공*을 가능하게 합니다.

## Multi-board pass-through

여러 FPGA를 *같은 container*에 묶으면 guest가 둘 다 봅니다.

```bash
qemu-system-x86_64 -enable-kvm -m 16G \
    -device vfio-pci,host=01:00.0,id=fpga0 \
    -device vfio-pci,host=02:00.0,id=fpga1 \
    ...
```

NPU 클러스터 환경에서 *같은 VM 안에서 multi-FPGA로 작업 분할*하는 패턴.

## Hotplug — runtime add/remove

QEMU monitor에서:

```text
(qemu) device_add vfio-pci,host=03:00.0,id=fpga2
(qemu) device_del fpga0
```

production에서는 *workload 변화*에 따라 동적으로 FPGA를 vault에 반납·할당. cloud FPGA의 핵심 기능.

## Cross-host migration의 한계

VFIO pass-through device가 *VM live migration*을 막습니다. 다른 host에 같은 device가 있다는 보장이 없으므로. 해결책:

- **SR-IOV VF**(Ch 11) — 같은 vendor에서 호환 VF로 migrate
- **vDPA**(virtio Data Path Acceleration) — virtio 인터페이스로 추상화, device-agnostic migrate
- **CXL.memory pooling**(Ch 14) — memory도 별도 자원으로

production cloud FPGA는 위 패턴 중 하나를 택해 *uptime SLA*를 유지합니다.

## 흔한 함정

- **IOMMU 비활성** — `iommu=pt` 없으면 vfio-pci 작동 안 함. dmesg에 "No IOMMU".
- **다른 device 같은 group** — ACS 없는 환경. 그 group의 다른 device(VGA 등)도 같이 점유해야 함.
- **FLR 미지원** — `pci-pf-stub` 모듈로 우회. 일부 오래된 FPGA에 필요.
- **MSI-X vector 부족** — guest가 더 많이 요구하면 일부만 할당. dmesg 확인.

## 정리

- **VFIO-PCI**로 실 FPGA를 guest VM에 *직접 pass-through*. fake용 driver가 *그대로* 동작.
- 흐름: host driver unbind → vfio-pci bind → FLR → QEMU에 `-device vfio-pci,host=...`.
- IRQ는 **eventfd → KVM IRQFD** 경로 — vmexit 없는 거의 native 성능.
- DMA는 **IOMMU GPA→HPA 변환** — 보안 격리 + 성능.
- Overhead < 5%로 emulation(10~30%)·virtio(5~15%) 대비 우위.
- Multi-board·hotplug 지원으로 production cloud FPGA의 기반.
- 한계: live migration 어려움. SR-IOV·vDPA·CXL이 대안.

## 다음 장 예고

다음 장은 *한 FPGA를 여러 VM이 공유*하는 **SR-IOV·mdev** — datacenter cloud FPGA의 핵심 메커니즘. 그리고 vendor 별 framework(OPAE/XRT)으로 자연스럽게 이어집니다.

## 관련 항목

- [Ch 9: VFIO 기초](/blog/tools/emulation/qemu-fpga-driver/chapter09-vfio-basics)
- [Ch 11: SR-IOV·mdev](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
- [QEMU Internals — KVM Accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [PCIe Deep Dive — SR-IOV/VFIO](/blog/embedded/hardware/pcie/chapter01-fundamentals)
