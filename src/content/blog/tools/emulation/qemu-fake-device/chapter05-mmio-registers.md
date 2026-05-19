---
title: "Ch 5: MMIO 레지스터 구현"
date: 2026-05-17T05:00:00
description: "Memory-mapped I/O 레지스터를 구현하고 게스트에서 읽고 쓴다."
tags: [QEMU, MMIO, Register, BAR, MemoryRegionOps]
series: "QEMU Fake Device Driver"
seriesOrder: 5
draft: true
---

PCI device의 *registers*가 *MMIO BAR*에 매핑됩니다. driver가 그 영역을 `writel`/`readl`로 접근하면 *device callback*이 호출되어 처리. 이 장은 *register set*을 정의하고 callback에서 *상태 관리*하는 흐름을 봅니다.

## Register design

먼저 *어떤 register*가 있을지 설계.

| Offset | Name | RW | 의미 |
|--------|------|----|------|
| `0x00` | `IDENT` | RO | magic "FAKE" |
| `0x04` | `CTRL` | RW | enable·mode |
| `0x08` | `VERSION` | RO | 0x00010000 |
| `0x0C` | `INTR_MASK` | RW | IRQ enable bits |
| `0x10` | `INTR_STATUS` | RW1C | IRQ pending |
| `0x20` | `DATA_IN` | WO | input data |
| `0x24` | `DATA_OUT` | RO | output data |
| `0x28` | `LEN` | RW | byte count |
| `0x2C` | `GO` | WO | doorbell |

이 register set이 *driver와의 contract*. 이후 모든 driver code가 이 layout을 가정.

## State 구조체 갱신

```c
struct MyPCIState {
    PCIDevice parent_obj;
    MemoryRegion mmio;       /* BAR0 */

    /* 레지스터 상태 */
    uint32_t ctrl;
    uint32_t intr_mask;
    uint32_t intr_status;
    uint32_t data_in;
    uint32_t data_out;
    uint32_t len;
};
```

`mmio`가 BAR0의 MemoryRegion. register는 *internal state*에 저장.

## Read callback

```c
#define REG_IDENT       0x00
#define REG_CTRL        0x04
#define REG_VERSION     0x08
#define REG_INTR_MASK   0x0C
#define REG_INTR_STATUS 0x10
#define REG_DATA_IN     0x20
#define REG_DATA_OUT    0x24
#define REG_LEN         0x28
#define REG_GO          0x2C

#define IDENT_MAGIC     0x46414b45   /* "FAKE" */
#define VERSION_VALUE   0x00010000

static uint64_t my_mmio_read(void *opaque, hwaddr addr, unsigned size) {
    MyPCIState *s = opaque;
    uint32_t val = 0;

    switch (addr) {
    case REG_IDENT:        val = IDENT_MAGIC; break;
    case REG_CTRL:         val = s->ctrl; break;
    case REG_VERSION:      val = VERSION_VALUE; break;
    case REG_INTR_MASK:    val = s->intr_mask; break;
    case REG_INTR_STATUS:  val = s->intr_status; break;
    case REG_DATA_OUT:     val = s->data_out; break;
    case REG_LEN:          val = s->len; break;
    default:
        qemu_log_mask(LOG_GUEST_ERROR,
                      "my-pci: bad read offset 0x%" HWADDR_PRIx "\n", addr);
        val = 0;
        break;
    }
    return val;
}
```

`qemu_log_mask(LOG_GUEST_ERROR, ...)`가 *guest의 잘못된 access*를 logging. `-d guest_errors`로 활성.

## Write callback

```c
static void my_mmio_write(void *opaque, hwaddr addr,
                          uint64_t val, unsigned size) {
    MyPCIState *s = opaque;

    switch (addr) {
    case REG_CTRL:
        s->ctrl = val & 0x3;     /* lower 2 bits만 유효 */
        break;
    case REG_INTR_MASK:
        s->intr_mask = val;
        break;
    case REG_INTR_STATUS:
        /* W1C — write 1 clears */
        s->intr_status &= ~val;
        break;
    case REG_DATA_IN:
        s->data_in = val;
        break;
    case REG_LEN:
        s->len = val;
        break;
    case REG_GO:
        /* doorbell — trigger device action */
        process_request(s);
        break;
    default:
        qemu_log_mask(LOG_GUEST_ERROR,
                      "my-pci: bad write offset 0x%" HWADDR_PRIx "\n", addr);
        break;
    }
}
```

각 register별 *처리*. read-only register는 *write 무시* 또는 *log*. W1C는 *bit 1 clear*.

## process_request — 가짜 처리

`GO` write 시 *간단한 처리*. 예: 입력을 *역순*으로 출력.

```c
static void process_request(MyPCIState *s) {
    if (!(s->ctrl & CTRL_ENABLE)) {
        return;
    }
    s->data_out = bswap32(s->data_in);   /* 단순 byte-swap */
    s->intr_status |= INTR_DONE;
    /* IRQ 발사는 Ch 6에서 */
}
```

real device의 *어떤 동작*이든 *이 callback에서* 흉내.

## MemoryRegionOps 등록

```c
static const MemoryRegionOps my_mmio_ops = {
    .read = my_mmio_read,
    .write = my_mmio_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
    .impl = {
        .min_access_size = 4,
        .max_access_size = 4,
    },
    .valid = {
        .min_access_size = 4,
        .max_access_size = 4,
    },
};
```

| 옵션 | 의미 |
|------|------|
| `endianness` | LE/BE/native |
| `impl.min/max_access_size` | callback이 *받는* size |
| `valid.min/max_access_size` | guest가 *시도 가능한* size |

`impl.min_access_size=4·max=4`로 *4-byte aligned*만 허용. guest의 1-byte read는 *4-byte read 후 byte 추출*로 변환.

## realize에서 BAR 등록

```c
static void my_pci_realize(PCIDevice *pdev, Error **errp) {
    MyPCIState *s = MY_PCI(pdev);

    memory_region_init_io(&s->mmio, OBJECT(s), &my_mmio_ops, s,
                          "my-pci-mmio", 0x1000);
    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->mmio);

    s->ctrl = 0;
    s->intr_mask = 0;
    s->intr_status = 0;
    s->data_in = 0;
    s->data_out = 0;
    s->len = 0;
}
```

`pci_register_bar` 인자.

| 인자 | 의미 |
|------|------|
| `pdev` | PCIDevice |
| `0` | BAR 번호 (0~5) |
| `PCI_BASE_ADDRESS_SPACE_MEMORY` | MMIO |
| `&s->mmio` | MemoryRegion |

## reset에서 default 복원

```c
static void my_pci_reset(DeviceState *dev) {
    MyPCIState *s = MY_PCI(DEVICE(dev));
    s->ctrl = 0;
    s->intr_mask = 0;
    s->intr_status = 0;
    s->data_in = 0;
    s->data_out = 0;
    s->len = 0;
}

static void my_pci_class_init(...) {
    DeviceClass *dc = DEVICE_CLASS(klass);
    /* ... */
    dc->reset = my_pci_reset;
}
```

VM reset 시 자동 호출.

## Guest에서 접근

driver 안에서.

```c
void __iomem *mmio = pci_iomap(pdev, 0, 0);

u32 ident = readl(mmio + REG_IDENT);
if (ident != IDENT_MAGIC) {
    dev_err(&pdev->dev, "bad IDENT 0x%x\n", ident);
    return -ENODEV;
}

writel(CTRL_ENABLE, mmio + REG_CTRL);
writel(0x12345678, mmio + REG_DATA_IN);
writel(4, mmio + REG_LEN);
writel(1, mmio + REG_GO);    /* doorbell */

u32 result = readl(mmio + REG_DATA_OUT);
/* result == 0x78563412 */
```

driver 측 *전체 시퀀스*. 다음 장(driver 작성)에서 본격적으로.

## Debug — info mtree

```text
(qemu) info mtree
address-space: memory
  ...
  00000000febd0000-00000000febd0fff (prio 1, i/o): my-pci-mmio
```

device의 BAR가 *guest physical*에 mapping된 것을 확인.

## 다양한 access size

driver가 *1-byte read*를 시도하면.

```c
static const MemoryRegionOps my_mmio_ops = {
    /* impl 4-byte only */
    .impl.min_access_size = 4,
    .impl.max_access_size = 4,
    /* valid는 1~4 허용 */
    .valid.min_access_size = 1,
    .valid.max_access_size = 4,
};
```

QEMU가 *4-byte read*해서 *해당 byte만 추출*해 guest에 반환. callback은 *항상 4-byte*로 본다.

## VMState — migration support

```c
static const VMStateDescription vmstate_my_pci = {
    .name = TYPE_MY_PCI,
    .version_id = 1,
    .minimum_version_id = 1,
    .fields = (VMStateField[]) {
        VMSTATE_PCI_DEVICE(parent_obj, MyPCIState),
        VMSTATE_UINT32(ctrl, MyPCIState),
        VMSTATE_UINT32(intr_mask, MyPCIState),
        VMSTATE_UINT32(intr_status, MyPCIState),
        VMSTATE_UINT32(data_in, MyPCIState),
        VMSTATE_UINT32(data_out, MyPCIState),
        VMSTATE_UINT32(len, MyPCIState),
        VMSTATE_END_OF_LIST()
    }
};

static void my_pci_class_init(...) {
    DeviceClass *dc = DEVICE_CLASS(klass);
    /* ... */
    dc->vmsd = &vmstate_my_pci;
}
```

이걸 정의해 두면 *savevm/loadvm·migration*이 device state까지 보존.

## 흔한 함정

- **endian 누락** — host 기본을 따름. ARM·RISC-V는 LE, *명시* 권장.
- **alignment 위반** — `.valid.min_access_size`보다 작은 access. 일반적으로 4-byte 권장.
- **W1C 잘못** — `|=`로 set하면 모든 bit가 *영원히 1*. `&=~val`이 정답.
- **state 초기화 누락** — realize에서 초기화 안 하면 *random 값*. reset에서도 같은 default.

## 정리

- MMIO register는 `MemoryRegionOps`의 read/write callback으로 구현.
- realize에서 `memory_region_init_io` + `pci_register_bar(0, ...)`.
- access size·endianness 명시. 4-byte aligned 권장.
- 각 register별 switch case로 *명시적 처리*. unknown은 log.
- W1C는 `s->reg &= ~val`. set은 *bit별 OR*.
- doorbell write는 *그 자리에서 처리* — `process_request`.
- `vmstate`로 migration·snapshot 호환.
- `info mtree`·`lspci -vvv`로 confirm.

## 다음 장 예고

다음 장은 *비동기 알림* — **interrupt**(MSI-X). device가 완료를 driver에 알리는 메커니즘.

## 관련 항목

- [Ch 4: 간단한 PCI 디바이스](/blog/tools/emulation/qemu-fake-device/chapter04-simple-pci)
- [Ch 6: 인터럽트 구현](/blog/tools/emulation/qemu-fake-device/chapter06-interrupts)
- [Ch 13: Register Bank](/blog/tools/emulation/qemu-fake-device/chapter13-register-bank)
- [QEMU Internals — Memory Model](/blog/tools/emulation/qemu-internals/chapter03-memory-model)
