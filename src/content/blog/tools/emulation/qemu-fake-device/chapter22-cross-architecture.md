---
title: "Ch 22: 크로스 아키텍처 디바이스"
date: 2026-05-17T22:00:00
description: "한 device model을 x86/ARM/RISC-V에서 — endian·alignment 일관성."
tags: [QEMU, cross-architecture, endianness, portable-device]
series: "QEMU Fake Device Driver"
seriesOrder: 22
draft: true
---

시리즈 마지막 장입니다. 지금까지 device를 x86_64에서 개발했지만, 실 cloud는 *ARM Graviton·RISC-V*도. 같은 device가 *모든 architecture*에서 *일관되게* 동작하도록 *endian·alignment·timing*에 주의해야 합니다.

## Cross-architecture의 의미

| 의미 |
|------|
| QEMU device가 *모든 target architecture*(x86_64·aarch64·riscv64·ppc64)에서 동작 |
| Linux driver가 *모든 host architecture*에서 동일하게 동작 |
| 같은 cluster의 multi-arch host에서 *VM migration* (제한적) |

cloud의 *Graviton·Ampere·SiFive*로 가는 길에서 *device portability*가 갈수록 중요.

## Endian — 가장 흔한 함정

| Architecture | 기본 endian |
|--------------|-------------|
| x86/x86_64 | LE |
| ARM (modern) | LE (예외: powerpc·bigendian 모드) |
| RISC-V | LE |
| PowerPC | BE (legacy), LE (modern) |
| MIPS | BE 또는 LE |

대부분 LE지만 PowerPC·MIPS에 BE 잔존. device는 *항상 LE*로 정해 두면 안전.

## device 측 endian

```c
static const MemoryRegionOps my_ops = {
    .read = my_read,
    .write = my_write,
    .endianness = DEVICE_LITTLE_ENDIAN,    /* 명시 */
    /* ... */
};
```

QEMU가 *guest의 endian과 device의 endian*이 다르면 *자동 byte swap*. callback은 *항상 LE*.

## VirtIO modern endian

VirtIO 1.0+는 *항상 LE*. 1.0 이전은 *target endian 따라감* (legacy).

```c
static void config_read(VirtIODevice *vdev, uint8_t *config) {
    struct my_config cfg = {
        .max_buf = cpu_to_le32(MAX_BUF),
        .modes   = cpu_to_le32(supported_modes),
    };
    memcpy(config, &cfg, sizeof(cfg));
}
```

`cpu_to_le32`로 *host endian → little-endian* 변환. modern이면 *guest endian 무관*.

## Driver — multi-arch 호환

```c
/* multi-arch safe */
static int my_pci_init(struct my_dev *d) {
    u32 ident = readl(d->mmio + REG_IDENT);
    /* readl이 *little-endian access*. modern Linux는 항상 LE. */

    if (ident != IDENT_MAGIC) {   /* 0x46414b45 — LE byte order */
        return -ENODEV;
    }
    return 0;
}
```

`readl`/`writel`은 *kernel API가 자동으로 LE access*. driver code는 *endian-agnostic*.

## Big-endian byte arithmetic

```c
/* 회피 */
u32 val = ((u8 *)mmio + REG_IDENT)[0] |
          (((u8 *)mmio + REG_IDENT)[1] << 8) |
          /* ... 명시적 byte order assumption */;

/* good */
u32 val = readl(mmio + REG_IDENT);   /* abstraction이 자동 처리 */
```

byte-level arithmetic은 *architecture에 의존*. abstraction 사용.

## Alignment

| Architecture | unaligned access |
|--------------|------------------|
| x86_64 | 허용 (성능 ↓) |
| ARM (modern) | 허용 (성능 ↓) |
| ARM (older) | 위반 시 fault |
| RISC-V | 허용 또는 fault (구현 의존) |
| MIPS | fault |

device는 *aligned access만 허용*하도록.

```c
static const MemoryRegionOps my_ops = {
    .impl.min_access_size = 4,
    .impl.max_access_size = 4,
    .valid.min_access_size = 4,
    .valid.max_access_size = 4,
};
```

driver의 misaligned access를 *조기에* 잡음.

## DMA buffer alignment

```c
/* page-aligned + 적절한 size */
buf = dma_alloc_coherent(&pdev->dev, PAGE_SIZE * 4,
                          &dma_addr, GFP_KERNEL);
```

`dma_alloc_coherent`가 *naturally aligned* buffer 반환. 모든 arch에서.

## Bitfield의 위험

```c
struct desc {
    uint32_t flags:8;
    uint32_t length:24;
};
```

bitfield order가 *compiler/architecture에 따라* 다름. *명시적 mask·shift* 권장.

```c
#define DESC_FLAGS_MASK   GENMASK(7, 0)
#define DESC_LEN_MASK     GENMASK(31, 8)

desc.flags = FIELD_GET(DESC_FLAGS_MASK, raw);
desc.length = FIELD_GET(DESC_LEN_MASK, raw);
```

`GENMASK`·`FIELD_GET`/`FIELD_PREP`이 *명시적*. cross-arch 안전.

## Atomic ops

driver의 *concurrent access*를 위한 atomic. Linux *모든 arch에서 호환*:

```c
atomic_t counter;
atomic_inc(&counter);
atomic_dec_and_test(&counter);
atomic_cmpxchg(&counter, old, new);
```

architecture-specific intrinsic 사용 *금지*.

## Memory barrier

weak ordering architecture(ARM·RISC-V)에서 *명시적 barrier*.

```c
/* descriptor 작성 후 doorbell write */
write_desc(d, idx, &desc);
wmb();                       /* write barrier */
writel(idx, d->mmio + REG_DOORBELL);
```

x86은 *strong order*라 종종 barrier가 *no-op*. ARM·RISC-V는 *진짜 barrier*.

## QEMU build — multi-target

```bash
./configure --target-list=x86_64-softmmu,aarch64-softmmu,riscv64-softmmu \
    --enable-debug
make -j$(nproc)
```

같은 device가 *세 target 모두*에서 빌드.

## Test matrix

```yaml
strategy:
  matrix:
    target:
      - { arch: x86_64,  qemu: x86_64,  guest_arch: x86_64 }
      - { arch: aarch64, qemu: aarch64, guest_arch: aarch64 }
      - { arch: riscv64, qemu: riscv64, guest_arch: riscv64 }
```

GitHub Actions가 *세 architecture* 동시 검증. driver의 *real portability* 보장.

## Migration cross-arch?

QEMU live migration은 *같은 architecture*만. ARM → x86 같은 cross-arch migration은 *지원 안 됨*.

| 가능 | 불가 |
|------|------|
| 같은 arch + 같은 CPU feature | 다른 arch |
| 같은 arch + 호환 feature subset | CPU feature 누락 |
| 같은 arch + 호환 machine type | 호환 안 되는 machine |

cross-arch는 *cold migration* (VM 정지 → reboot)만.

## userspace bin compat

x86 binary를 ARM guest에서 실행하려면 *QEMU user-mode*.

```bash
# binfmt_misc 등록
sudo apt install qemu-user-static

# ARM guest 안에서 x86 binary 실행
arm-guest$ /usr/bin/qemu-x86_64-static /path/to/x86-binary
```

`qemu-user` 자체가 *TCG*로 binary 번역. ARM·RISC-V cloud에서 *x86 container* 실행에 사용.

## Endian-safe device protocol

```c
struct on_wire_packet {
    uint32_t magic;     /* always LE */
    uint32_t version;
    uint64_t length;
    /* ... */
} __attribute__((packed));

static void send_packet(struct my_dev *d, struct on_wire_packet *p) {
    p->magic = cpu_to_le32(0x12345678);
    p->version = cpu_to_le32(1);
    p->length = cpu_to_le64(payload_len);
    /* DMA로 device에 */
}
```

*on-wire*는 *항상 LE*로 통일. host endian과 무관.

## VirtIO-mmio 활용

ARM·RISC-V virt 환경은 *virtio-mmio*가 표준. PCI bus 없는 microvm.

```bash
# ARM
qemu-system-aarch64 -M virt -device virtio-blk-device,...

# RISC-V
qemu-system-riscv64 -M virt -device virtio-blk-device,...
```

device 정의는 *transport-agnostic*. mmio 변형이 자동.

## 시리즈 종합

22장 끝까지 왔습니다.

| 영역 | 장 |
|------|----|
| 기본 | 1~2 (overview, build) |
| Device model | 3~5 (QOM, PCI, MMIO) |
| 통신 | 6~7 (IRQ, DMA) |
| Driver | 8~9 (Linux driver, debugging) |
| Testing | 10~11 (CI, advanced scenarios) |
| 실 device | 12 (NVMe case study) |
| Production patterns | 13~14 (register bank, SG-DMA) |
| VirtIO | 15~16 (basics, advanced) |
| Security | 17 (fuzzing) |
| Performance | 18 |
| Topology | 19~20 (multi-function, hotplug) |
| RAS | 21 (AER) |
| Portability | 22 (cross-arch) |

이 어휘로 *production-grade fake device + Linux driver*를 *처음부터 끝까지* 만들 수 있습니다.

## 시리즈 마무리

22장을 끝까지 따라온 셈입니다. QEMU의 *가상 device 개발*은 *처음에 어색*하지만 *어휘만 잡히면* 매우 강력한 도구입니다. 보드 없이 driver 작성, CI에 통합, fuzz 검증까지 — *production driver 개발의 새 표준*.

새 NPU·FPGA·NIC·storage device 만들 때 *이 시리즈*가 reference가 되기를 바랍니다.

## 다음 단계

- *내 SoC* QEMU에 추가 — Custom Machine Type(Internals Ch 11)
- *driver-RTL cosim* — Driver-RTL Co-simulation 시리즈
- *FPGA driver* — FPGA Driver via QEMU+VFIO 시리즈
- *Embedded* — QEMU Embedded Emulation 시리즈
- *RISC-V 깊이* — RISC-V QEMU 심화 시리즈
- *QEMU 내부* — QEMU Internals 시리즈

이 6개 시리즈가 *임베디드 + 시스템 + 시뮬레이션*의 완전한 지도입니다.

## 흔한 함정 (마지막 정리)

- **endian assumption** — `__attribute__((packed))` + `cpu_to_le*`/`le*_to_cpu`.
- **alignment** — `aligned(4)` 명시. 4-byte access만 device callback.
- **bitfield** — 사용 회피, GENMASK·FIELD_GET 사용.
- **architecture-specific intrinsic** — 절대 금지.
- **production-only test** — multi-arch CI matrix 필수.

## 정리

- Cross-architecture portability는 *endian·alignment·atomic·barrier* 일관성.
- device는 *항상 LE* 표준. `DEVICE_LITTLE_ENDIAN` + `cpu_to_le*`.
- Aligned access만 허용 — *최소·최대 4-byte*.
- `readl`/`writel`로 *kernel abstraction* 활용. byte-level arithmetic 회피.
- **GENMASK·FIELD_GET·FIELD_PREP**로 *명시적 bit manipulation*.
- **Memory barrier** — ARM·RISC-V는 *진짜 barrier*. x86은 종종 no-op.
- CI matrix(x86_64·aarch64·riscv64)로 *real portability* 보장.
- Cross-arch migration은 *불가*. cold migration만.
- *VirtIO-mmio*가 ARM·RISC-V virt의 표준 transport.

## 시리즈 마무리 — 6개 인접 시리즈로

22장이 끝났습니다. QEMU의 *가상 device + Linux driver*를 *완전히 어휘화*했습니다. 이제 *내 device·driver·system*에 적용해 보세요.

다음 깊이는 *6개 인접 시리즈*에서 — 임베디드·RISC-V·FPGA·cosim·internals. 어느 쪽으로 가든 *이 시리즈가 launching pad*가 됩니다.

QEMU와 함께 하시는 길 응원합니다.

## 관련 항목

- [Ch 21: AER Emulation](/blog/tools/emulation/qemu-fake-device/chapter21-aer-emulation)
- [Ch 1: 시리즈 시작](/blog/tools/emulation/qemu-fake-device/chapter01-overview) — 다시 보기

## 관련 시리즈

- [QEMU Internals](/blog/tools/emulation/qemu-internals/chapter01-architecture) — QEMU 내부
- [QEMU Embedded](/blog/tools/emulation/qemu-embedded/chapter01-overview) — embedded workflow
- [QEMU RISC-V](/blog/tools/emulation/qemu-riscv/chapter01-overview) — RISC-V 깊이
- [FPGA Driver via QEMU+VFIO](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge) — FPGA workflow
- [Driver-RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter01-why-cosim) — pre-silicon
- [QEMU Embedded — CI Matrix](/blog/tools/emulation/qemu-embedded/chapter20-ci-matrix)

## 참고 자료

- QEMU Documentation — qemu.org/docs/master/
- PCIe Base Specification
- Linux kernel `Documentation/PCI/`
- Syzkaller — github.com/google/syzkaller
- "Linux Device Drivers" (LDD3)
