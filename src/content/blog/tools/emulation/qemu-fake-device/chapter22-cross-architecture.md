---
title: "Ch 22: 크로스 아키텍처 디바이스"
date: 2026-05-17T22:00:00
description: "한 device model을 x86/ARM/RISC-V에서 — endian·alignment 일관성."
tags: [QEMU, cross-architecture, endianness, portable-device]
series: "QEMU Fake Device Driver"
seriesOrder: 22
draft: true
---

## 이 챕터의 의도

같은 IP(NPU, sensor, NIC controller)가 x86 host PC, aarch64 자동차 ECU, RISC-V 임베디드에 모두 들어간다면 device model 하나로 세 host를 모두 검증해야 한다. QEMU는 multi-arch를 지원하지만 endianness, alignment, atomic 시맨틱이 host 아키텍처에 따라 달라지는 함정이 있다. 이 장에서는 그 함정과 회피법을 본다.

## 핵심 항목

- ✦ QEMU `softmmu-system-{x86_64,aarch64,riscv64}` — 같은 device code, 다른 host
- ✦ `MemoryRegionOps.endianness` — `DEVICE_LITTLE_ENDIAN` / `BIG_ENDIAN` / `NATIVE_ENDIAN`
  - PCIe spec은 little-endian → 대부분 `LITTLE_ENDIAN` 명시
  - SoC IP에 따라 host endian (`NATIVE_ENDIAN`) 의도적 선택
- ✦ Driver 측 — `readl`/`writel` (host endian) vs `ioread32be`/`iowrite32be` (강제 BE)
- ✦ Alignment — ARMv7은 unaligned MMIO 일부 trap, ARMv8/x86은 대부분 허용
- ✦ Atomic — `__atomic_*` semantic은 동일하나 *cache coherency 도메인*이 arch별 다름
- ✦ DMA mask — 32-bit vs 64-bit, ARM 일부 SoC는 IOMMU 통한 IOVA 강제
- ✦ Machine별 device 등록 — `virt` (ARM/RISC-V), `pc-q35` (x86) 각각 PCIe root complex 다름
- ✦ Device 추가 — `-device my-pci,bus=pcie.0` (x86 q35), `bus=pcie.0` (ARM virt) — 공통 BDF
- ✦ Cross-arch CI matrix — GitHub Actions per-arch runner, qemu-user-static
- ✦ Driver portability test — 같은 driver 소스, 3개 arch 컴파일·실행
- ◦ Virtio가 *legacy*에서 host-endian 문제 (modern은 LE 고정)

## 다이어그램 (3)

1. 같은 device model → x86/ARM/RISC-V QEMU 빌드 매트릭스
2. Endianness handling — device LE vs host BE 시 byteswap 위치
3. Cross-arch CI pipeline — build matrix → run → results aggregate

## 코드 sketch

```c
/* Device 측 — endianness 명시 */
static const MemoryRegionOps my_csr_ops = {
    .read       = my_csr_read,
    .write      = my_csr_write,
    .endianness = DEVICE_LITTLE_ENDIAN,   /* PCIe 표준 */
    .impl       = { .min_access_size = 4, .max_access_size = 4 },
    .valid      = { .min_access_size = 4, .max_access_size = 4 },
};

/* register 값을 dev struct에 저장할 때 host endian으로 자동 변환됨
   (QEMU가 io read/write 시 endianness 옵션 보고 처리) */
```

```c
/* Driver 측 — PCIe LE 명시적 처리 */
static u32 my_read_reg(struct my_dev *d, u32 off) {
    return le32_to_cpu(readl(d->mmio + off));   /* LE → host */
}

static void my_write_reg(struct my_dev *d, u32 off, u32 val) {
    writel(cpu_to_le32(val), d->mmio + off);    /* host → LE */
}
```

```yaml
# GitHub Actions cross-arch test
strategy:
  matrix:
    target:
      - { arch: x86_64,  qemu: qemu-system-x86_64,  machine: q35 }
      - { arch: aarch64, qemu: qemu-system-aarch64, machine: virt }
      - { arch: riscv64, qemu: qemu-system-riscv64, machine: virt }
steps:
  - run: |
      ${{ matrix.target.qemu }} -M ${{ matrix.target.machine }} \
          -kernel out/Image.${{ matrix.target.arch }} \
          -device my-pci \
          -append "console=ttyS0" -nographic -no-reboot \
          -serial mon:stdio
```

## 레퍼런스

- QEMU `include/exec/memory.h::MemoryRegionOps`
- QEMU `Documentation/devel/memory.rst` — endianness handling
- Linux `Documentation/driver-api/device-io.rst` — `readl/writel` 의미
- ARM Architecture Reference Manual §B2.3 (Atomic/memory ordering)
- LWN "Cross-architecture kernel testing"

## 관련 항목

- [Ch 17: 디바이스 퍼징](/blog/tools/emulation/qemu-fake-device/chapter17-fuzzing)
- [Ch 18: 성능 모델링](/blog/tools/emulation/qemu-fake-device/chapter18-performance-modeling)
- [QEMU Embedded Emulation 시리즈](/blog/tools/emulation/qemu-embedded/) — ARM/RISC-V 깊이
