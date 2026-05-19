---
title: "Ch 8: 커스텀 디바이스 추가"
date: 2026-05-17T02:00:00
description: "QEMU 커스텀 디바이스 — MMIO 디바이스 구현을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 8
tags: [RISC-V, QEMU, Device, MMIO, QOM, SysBus]
draft: true
---

기본 머신(`virt`·`sifive_e`·`sifive_u`·`opentitan`)이 갖춰 둔 디바이스만으로 부족할 때가 있습니다. 내가 설계 중인 *커스텀 가속기*나 *비표준 peripheral*을 modeling하려면 QEMU에 새 디바이스를 추가해야 합니다.

이 장은 *간단한 MMIO 디바이스*를 QEMU에 추가하는 흐름을 처음부터 끝까지 다룹니다. QOM(QEMU Object Model), MemoryRegionOps, SysBusDevice, 머신에 연결까지.

## QOM — QEMU Object Model

QEMU의 모든 디바이스는 **QOM** 객체입니다. C로 작성된 *객체지향 시스템*으로, 클래스·상속·인터페이스를 흉내 냅니다.

| 개념 | QEMU 구현 |
|------|-----------|
| 클래스 | `TypeInfo` |
| 인스턴스 | C 구조체 + `TYPE_*` 매크로 |
| 생성자 | `instance_init` callback |
| `realize`(완전 초기화) | `realize` callback |
| 상속 | `TypeInfo.parent` |
| 인터페이스 | `interfaces` 배열 |

`SysBusDevice`(시스템 버스에 attach되는 모든 디바이스의 부모 클래스)가 MMIO 디바이스의 표준 기반입니다.

```text
TYPE_OBJECT
  └─ TYPE_DEVICE
       └─ TYPE_SYS_BUS_DEVICE
            └─ TYPE_MY_DEVICE  ← 우리가 만들 것
```

## 만들 디바이스 — myacc-counter

가장 단순한 예: 카운터 가속기.

| Register | Offset | RW | 설명 |
|----------|--------|----|------|
| `CTRL` | 0x00 | RW | bit 0: enable |
| `COUNT_LO` | 0x04 | R | 카운터 하위 32비트 |
| `COUNT_HI` | 0x08 | R | 카운터 상위 32비트 |
| `INCR` | 0x0C | RW | 한 cycle당 증가량 |
| `IRQ_AT` | 0x10 | RW | 이 값에 도달하면 IRQ |
| `STATUS` | 0x14 | R/W1C | bit 0: IRQ pending |

기능: enable되면 매 clock cycle마다 INCR만큼 counter 증가, IRQ_AT에 도달하면 IRQ assert. 단순하지만 *MMIO + IRQ + timer*의 표준 패턴을 다 담습니다.

## 디바이스 구조체

`hw/misc/myacc_counter.c`에 작성한다고 가정.

```c
/* SPDX-License-Identifier: GPL-2.0-or-later */
#include "qemu/osdep.h"
#include "qemu/log.h"
#include "qemu/timer.h"
#include "hw/sysbus.h"
#include "hw/irq.h"
#include "hw/qdev-properties.h"
#include "migration/vmstate.h"

#define TYPE_MYACC_COUNTER "myacc-counter"
OBJECT_DECLARE_SIMPLE_TYPE(MyAccCounterState, MYACC_COUNTER)

#define REG_CTRL      0x00
#define REG_COUNT_LO  0x04
#define REG_COUNT_HI  0x08
#define REG_INCR      0x0C
#define REG_IRQ_AT    0x10
#define REG_STATUS    0x14

#define CTRL_ENABLE   (1u << 0)
#define STATUS_IRQ    (1u << 0)

struct MyAccCounterState {
    SysBusDevice parent_obj;

    MemoryRegion mmio;
    qemu_irq irq;
    QEMUTimer *timer;

    uint32_t ctrl;
    uint64_t count;
    uint32_t incr;
    uint64_t irq_at;
    uint32_t status;
};
```

`OBJECT_DECLARE_SIMPLE_TYPE` 매크로가 `MYACC_COUNTER(obj)` 같은 캐스팅 헬퍼를 만들어 줍니다.

## MMIO 읽기/쓰기 핸들러

```c
static uint64_t myacc_read(void *opaque, hwaddr addr, unsigned size)
{
    MyAccCounterState *s = opaque;

    switch (addr) {
    case REG_CTRL:
        return s->ctrl;
    case REG_COUNT_LO:
        return (uint32_t)(s->count & 0xFFFFFFFF);
    case REG_COUNT_HI:
        return (uint32_t)(s->count >> 32);
    case REG_INCR:
        return s->incr;
    case REG_IRQ_AT:
        return s->irq_at & 0xFFFFFFFF;
    case REG_STATUS:
        return s->status;
    default:
        qemu_log_mask(LOG_GUEST_ERROR,
                      "%s: bad read offset 0x%" HWADDR_PRIx "\n",
                      __func__, addr);
        return 0;
    }
}

static void myacc_write(void *opaque, hwaddr addr,
                        uint64_t val, unsigned size)
{
    MyAccCounterState *s = opaque;

    switch (addr) {
    case REG_CTRL: {
        bool was_enabled = s->ctrl & CTRL_ENABLE;
        bool now_enabled = val & CTRL_ENABLE;
        s->ctrl = val & 0x1;
        if (now_enabled && !was_enabled) {
            timer_mod(s->timer,
                      qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + 1000000);
        }
        break;
    }
    case REG_INCR:
        s->incr = val;
        break;
    case REG_IRQ_AT:
        s->irq_at = (s->irq_at & 0xFFFFFFFF00000000ULL) | (val & 0xFFFFFFFF);
        break;
    case REG_STATUS:
        /* W1C: write 1 clears */
        if (val & STATUS_IRQ) {
            s->status &= ~STATUS_IRQ;
            qemu_set_irq(s->irq, 0);
        }
        break;
    default:
        qemu_log_mask(LOG_GUEST_ERROR,
                      "%s: bad write offset 0x%" HWADDR_PRIx "\n",
                      __func__, addr);
        break;
    }
}
```

`qemu_log_mask(LOG_GUEST_ERROR, ...)`는 *guest의 잘못된 접근*을 logging합니다. QEMU 실행 시 `-d guest_errors`로 활성화 가능.

## MemoryRegionOps

```c
static const MemoryRegionOps myacc_ops = {
    .read = myacc_read,
    .write = myacc_write,
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

RISC-V는 *little-endian*이 표준. `min/max_access_size = 4`는 word-aligned 32-bit 접근만 허용.

## Timer callback

매 *vt(virtual time)* 단위로 카운터를 증가시키는 timer.

```c
static void myacc_timer_fire(void *opaque)
{
    MyAccCounterState *s = opaque;

    if (!(s->ctrl & CTRL_ENABLE)) {
        return;
    }

    s->count += s->incr;

    if (s->irq_at && s->count >= s->irq_at && !(s->status & STATUS_IRQ)) {
        s->status |= STATUS_IRQ;
        qemu_set_irq(s->irq, 1);
    }

    /* 다음 tick 재예약 */
    timer_mod(s->timer,
              qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + 1000000);
}
```

`QEMU_CLOCK_VIRTUAL`은 *virtual time*으로 진행하는 clock. host wall-clock과는 다르며, simulation의 *cycle 단위*에 가깝습니다.

## 초기화

```c
static void myacc_realize(DeviceState *dev, Error **errp)
{
    MyAccCounterState *s = MYACC_COUNTER(dev);

    memory_region_init_io(&s->mmio, OBJECT(s), &myacc_ops, s,
                          TYPE_MYACC_COUNTER, 0x100);
    sysbus_init_mmio(SYS_BUS_DEVICE(s), &s->mmio);
    sysbus_init_irq(SYS_BUS_DEVICE(s), &s->irq);

    s->timer = timer_new_ns(QEMU_CLOCK_VIRTUAL, myacc_timer_fire, s);
}

static void myacc_reset(DeviceState *dev)
{
    MyAccCounterState *s = MYACC_COUNTER(dev);

    s->ctrl = 0;
    s->count = 0;
    s->incr = 1;
    s->irq_at = 0;
    s->status = 0;

    if (s->timer) {
        timer_del(s->timer);
    }
}
```

## VMState — migration·snapshot 지원

```c
static const VMStateDescription vmstate_myacc = {
    .name = TYPE_MYACC_COUNTER,
    .version_id = 1,
    .minimum_version_id = 1,
    .fields = (VMStateField[]) {
        VMSTATE_UINT32(ctrl,    MyAccCounterState),
        VMSTATE_UINT64(count,   MyAccCounterState),
        VMSTATE_UINT32(incr,    MyAccCounterState),
        VMSTATE_UINT64(irq_at,  MyAccCounterState),
        VMSTATE_UINT32(status,  MyAccCounterState),
        VMSTATE_END_OF_LIST()
    }
};
```

이걸 정의해 두면 QEMU의 `savevm`/`loadvm`이 디바이스 상태를 dump/restore할 수 있습니다.

## 클래스 등록

```c
static void myacc_class_init(ObjectClass *klass, void *data)
{
    DeviceClass *dc = DEVICE_CLASS(klass);

    dc->realize = myacc_realize;
    dc->reset = myacc_reset;
    dc->vmsd = &vmstate_myacc;
    dc->desc = "MyAcc Counter";
}

static const TypeInfo myacc_info = {
    .name          = TYPE_MYACC_COUNTER,
    .parent        = TYPE_SYS_BUS_DEVICE,
    .instance_size = sizeof(MyAccCounterState),
    .class_init    = myacc_class_init,
};

static void myacc_register_types(void)
{
    type_register_static(&myacc_info);
}

type_init(myacc_register_types)
```

`type_init`은 QEMU 시작 시 *자동으로* 호출되어 디바이스 클래스를 등록합니다.

## 빌드 시스템 통합

`hw/misc/meson.build`에 한 줄 추가.

```meson
system_ss.add(when: 'CONFIG_MYACC_COUNTER', if_true: files('myacc_counter.c'))
```

`hw/misc/Kconfig`에:

```text
config MYACC_COUNTER
    bool
    select PTIMER
```

`default-configs/devices/riscv64-softmmu.mak`에:

```makefile
CONFIG_MYACC_COUNTER=y
```

이러면 RISC-V softmmu 빌드에 우리 디바이스가 *자동으로* 포함됩니다.

## 머신에 연결

`virt` 머신의 init 함수(`hw/riscv/virt.c`)에 한 줄을 추가해 인스턴스화·매핑·IRQ 연결을 합니다.

```c
#define MYACC_MMIO_BASE  0x10100000
#define MYACC_IRQ_NUM    15

static void virt_machine_init(MachineState *machine) {
    /* 기존 코드 ... */

    DeviceState *myacc = qdev_new(TYPE_MYACC_COUNTER);
    sysbus_realize_and_unref(SYS_BUS_DEVICE(myacc), &error_fatal);
    sysbus_mmio_map(SYS_BUS_DEVICE(myacc), 0, MYACC_MMIO_BASE);
    sysbus_connect_irq(SYS_BUS_DEVICE(myacc), 0,
                       qdev_get_gpio_in(DEVICE(s->plic), MYACC_IRQ_NUM));
}
```

또는 *외부에서 추가*하려면 `-device` 옵션으로 head-less attach.

```bash
qemu-system-riscv64 -machine virt -m 2G -nographic -bios default \
    -device myacc-counter
```

(다만 외부 attach는 `realize` 후의 sysbus binding이 명시되어야 해서, 머신 변경 없이는 어렵습니다. 보통 머신 init에 직접 박는 게 깔끔.)

## DTB에 노드 추가

guest Linux가 디바이스를 *인식*하려면 device tree에 노드가 있어야 합니다.

`hw/riscv/virt.c`의 device tree 생성 코드에:

```c
static void create_fdt_myacc(RISCVVirtState *s, hwaddr base, int irq)
{
    char *nodename = g_strdup_printf("/soc/myacc@%lx", (long)base);
    qemu_fdt_add_subnode(s->fdt, nodename);
    qemu_fdt_setprop_string(s->fdt, nodename, "compatible", "myacc,counter-v1");
    qemu_fdt_setprop_cells(s->fdt, nodename, "reg", 0, base, 0, 0x100);
    qemu_fdt_setprop_cell(s->fdt, nodename, "interrupts", irq);
    qemu_fdt_setprop_cell(s->fdt, nodename, "interrupt-parent",
                          s->phandle.plic);
    g_free(nodename);
}
```

부팅 시 Linux가 *자동으로 device tree를 파싱*해서 driver를 매칭합니다. driver는 `compatible = "myacc,counter-v1"`을 등록한 platform driver로 작성합니다(다른 시리즈에서 다룸).

## 디바이스 테스트

빌드 후 부팅.

```bash
qemu-system-riscv64 -machine virt -m 2G -nographic -bios default \
    -kernel test_myacc.elf
```

펌웨어 쪽에서 register 접근.

```c
#define MYACC_BASE   0x10100000
#define MYACC_CTRL   (*(volatile uint32_t *)(MYACC_BASE + 0x00))
#define MYACC_COUNT_LO (*(volatile uint32_t *)(MYACC_BASE + 0x04))
#define MYACC_INCR   (*(volatile uint32_t *)(MYACC_BASE + 0x0C))
#define MYACC_IRQ_AT (*(volatile uint32_t *)(MYACC_BASE + 0x10))

int main(void) {
    MYACC_INCR = 100;
    MYACC_IRQ_AT = 10000;
    MYACC_CTRL = 1;  // enable
    while (1) ;
}
```

## 흔한 함정

- **endianness 누락** — `.endianness`를 안 주면 host 기본을 따름. *반드시* `DEVICE_LITTLE_ENDIAN` 명시.
- **IRQ 연결 누락** — `sysbus_connect_irq` 안 하면 디바이스가 IRQ를 *raise해도* PLIC이 모릅니다.
- **alignment 위반** — `min/max_access_size`보다 작은 접근에 대한 처리.
- **timer leak** — `realize`에서 `timer_new_ns`, *unrealize/finalize*에서 `timer_free` 짝.
- **vmstate 누락 필드** — savevm 후 loadvm하면 새 필드는 *초기화 안 됨*. 시간이 지나며 누적되는 디버깅 함정.

## 정리

- QEMU에 디바이스 추가는 **QOM**의 `SysBusDevice` 상속 패턴.
- 핵심 4개: 구조체·`MemoryRegionOps`·`realize`/`reset`/`vmstate`·`TypeInfo` + `type_init`.
- MMIO read/write callback이 register handling의 본체. W1C 같은 패턴 직접 구현.
- IRQ는 `sysbus_init_irq` + `qemu_set_irq`. 머신 init에서 PLIC에 connect.
- Timer는 `timer_new_ns(QEMU_CLOCK_VIRTUAL, ...)`로 *virtual time*에 동작.
- `meson.build` + `Kconfig` + `default-configs/*.mak`로 빌드 통합.
- 머신의 device tree 생성 코드에 노드를 추가하면 Linux driver가 자동 매칭.

## 다음 장 예고

다음 장은 ch1~8에서 다룬 모든 요소를 *한꺼번에* 활용해 OpenSBI + U-Boot + Linux 풀 스택을 QEMU에서 부팅하는 흐름을 정리합니다.

## 관련 항목

- [Ch 7: spike vs QEMU](/blog/tools/emulation/qemu-riscv/chapter07-spike-vs-qemu)
- [Ch 9: 풀 스택 부팅](/blog/tools/emulation/qemu-riscv/chapter09-full-stack-boot)
- [QEMU Internals — QOM Deep Dive](/blog/tools/emulation/qemu-internals/chapter02-qom-deep-dive)
- [QEMU Fake Device — Linux Driver](/blog/tools/emulation/qemu-fake-device/chapter08-linux-driver)
