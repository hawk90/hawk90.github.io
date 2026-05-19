---
title: "Ch 11: 커스텀 머신 타입"
date: 2026-05-17T11:00:00
description: "QEMU에서 새로운 머신 타입(보드)을 정의한다."
tags: [QEMU, Machine, Board, MachineClass]
series: "QEMU Internals"
seriesOrder: 11
draft: true
---

QEMU의 기본 머신(`virt`·`raspi`·`sifive_u`)으로 못 풀리는 *내 SoC*를 시뮬레이션하려면 **custom machine type**을 추가해야 합니다. CPU + 메모리 + 인터럽트 컨트롤러 + peripheral을 *조립*해 *완전한 가상 SoC*를 만드는 작업입니다.

## Machine type — 무엇

QEMU의 *머신*은 *가상 하드웨어 구성*. 다음을 정의.

- CPU type과 수
- 메모리 layout (`MemoryRegion` tree)
- 인터럽트 컨트롤러 (GIC·PLIC·APIC)
- Peripheral 묶음 (UART·timer·storage·net)
- Bootloader 진입점
- Device tree(자동 생성 또는 fixed)

`-M virt`, `-M raspi3b` 같은 옵션이 *이 묶음*을 선택.

## 가장 작은 머신

`hw/arm/mymachine.c`에 작성한다고 가정.

```c
#include "qemu/osdep.h"
#include "hw/boards.h"
#include "hw/arm/boot.h"
#include "hw/arm/cortex_m.h"
#include "hw/char/pl011.h"
#include "qom/object.h"

#define TYPE_MY_MACHINE MACHINE_TYPE_NAME("my-machine")
OBJECT_DECLARE_SIMPLE_TYPE(MyMachineState, MY_MACHINE)

struct MyMachineState {
    MachineState parent;

    /* device instances */
    ARMCPU *cpu;
    DeviceState *gic;
    DeviceState *uart;
    MemoryRegion dram;
};

static void my_machine_init(MachineState *machine) {
    MyMachineState *s = MY_MACHINE(machine);
    MemoryRegion *sysmem = get_system_memory();

    /* 1. CPU */
    Object *cpu = object_new(machine->cpu_type);
    object_property_set_link(cpu, "memory", OBJECT(sysmem), &error_abort);
    qdev_realize(DEVICE(cpu), NULL, &error_fatal);
    s->cpu = ARM_CPU(cpu);

    /* 2. DRAM */
    memory_region_init_ram(&s->dram, NULL, "ram",
                          machine->ram_size, &error_fatal);
    memory_region_add_subregion(sysmem, 0x40000000, &s->dram);

    /* 3. GIC */
    s->gic = qdev_new("arm-gic");
    qdev_prop_set_uint32(s->gic, "revision", 3);
    qdev_prop_set_uint32(s->gic, "num-cpu", 1);
    qdev_prop_set_uint32(s->gic, "num-irq", 96);
    sysbus_realize(SYS_BUS_DEVICE(s->gic), &error_fatal);
    sysbus_mmio_map(SYS_BUS_DEVICE(s->gic), 0, 0x08000000);
    sysbus_mmio_map(SYS_BUS_DEVICE(s->gic), 1, 0x080A0000);

    /* GIC ↔ CPU 연결 */
    sysbus_connect_irq(SYS_BUS_DEVICE(s->gic), 0,
                       qdev_get_gpio_in(DEVICE(s->cpu), ARM_CPU_IRQ));

    /* 4. UART */
    s->uart = qdev_new("pl011");
    sysbus_realize(SYS_BUS_DEVICE(s->uart), &error_fatal);
    sysbus_mmio_map(SYS_BUS_DEVICE(s->uart), 0, 0x09000000);
    sysbus_connect_irq(SYS_BUS_DEVICE(s->uart), 0,
                       qdev_get_gpio_in(s->gic, 33));

    /* 5. kernel 로드 (CLI -kernel) */
    if (machine->kernel_filename) {
        struct arm_boot_info info = {
            .loader_start = 0x40000000,
            .ram_size = machine->ram_size,
            .nb_cpus = 1,
        };
        arm_load_kernel(s->cpu, machine, &info);
    }
}
```

이게 *minimal* SoC. UART 하나·GIC·CPU 1개·256MB DRAM.

## MachineClass 등록

```c
static void my_machine_class_init(ObjectClass *oc, void *data) {
    MachineClass *mc = MACHINE_CLASS(oc);

    mc->desc = "My Custom SoC";
    mc->init = my_machine_init;
    mc->max_cpus = 4;
    mc->default_ram_size = 256 * MiB;
    mc->default_cpu_type = ARM_CPU_TYPE_NAME("cortex-a72");
    mc->default_ram_id = "my-machine.ram";
}

static const TypeInfo my_machine_info = {
    .name           = TYPE_MY_MACHINE,
    .parent         = TYPE_MACHINE,
    .instance_size  = sizeof(MyMachineState),
    .class_init     = my_machine_class_init,
};

static void my_machine_register(void) {
    type_register_static(&my_machine_info);
}
type_init(my_machine_register)
```

`type_init`이 *자동 등록*. 사용자가 `-M my-machine`으로 선택 가능.

## Build 통합

`hw/arm/Kconfig`:

```text
config MY_MACHINE
    bool
    default y if TCG && AARCH64
    select ARM_GIC
    select PL011
```

`hw/arm/meson.build`:

```text
arm_ss.add(when: 'CONFIG_MY_MACHINE', if_true: files('mymachine.c'))
```

`configs/devices/aarch64-softmmu/default.mak`:

```text
CONFIG_MY_MACHINE=y
```

빌드 후 `qemu-system-aarch64 -M help`에 `my-machine`이 보입니다.

## Machine 옵션

```c
static void my_machine_class_init(ObjectClass *oc, void *data) {
    MachineClass *mc = MACHINE_CLASS(oc);
    /* ... */
    object_class_property_add_bool(oc, "secure",
                                   my_machine_get_secure,
                                   my_machine_set_secure);
}
```

사용자가 `-M my-machine,secure=on`처럼 옵션 전달.

## Device tree 생성

```c
static void create_fdt(MyMachineState *s, hwaddr ram_base, uint64_t ram_size) {
    void *fdt = create_device_tree(&s->fdt_size);
    qemu_fdt_setprop_string(fdt, "/", "compatible", "myvendor,my-soc");
    qemu_fdt_setprop_cell(fdt, "/", "#address-cells", 2);
    qemu_fdt_setprop_cell(fdt, "/", "#size-cells", 2);

    /* cpus node */
    qemu_fdt_add_subnode(fdt, "/cpus");
    /* ... */

    /* memory node */
    char *node = g_strdup_printf("/memory@%lx", ram_base);
    qemu_fdt_add_subnode(fdt, node);
    qemu_fdt_setprop_string(fdt, node, "device_type", "memory");
    qemu_fdt_setprop_sized_cells(fdt, node, "reg",
                                  2, ram_base, 2, ram_size);
    /* ... */
}
```

guest Linux가 *이 DT*를 *boot 시 받음*. driver matching에 사용.

## 자주 빠지는 device

위 minimal 외에 *production 머신*이 추가하는 것들.

- VirtIO MMIO 슬롯들
- PCIe host bridge
- RTC
- Watchdog
- GPIO controller
- Power management
- Boot ROM (또는 SPL)
- Secure world(EL3)·Hypervisor(EL2) 설정

each가 *수십 줄*씩 init code. 전체 머신이 보통 *500~2000 lines*.

## Boot path

kernel·firmware를 load해 *entry point*에 점프.

```c
struct arm_boot_info info = {
    .loader_start = 0x40000000,    /* DRAM 시작 */
    .ram_size = machine->ram_size,
    .nb_cpus = 1,
    .board_id = -1,                /* DT 사용 */
    .secure_boot = false,
};
arm_load_kernel(s->cpu, machine, &info);
```

`arm_load_kernel`이 *Linux kernel header*를 보고 `Image`/`zImage`/`uImage`를 적절히 처리.

## Multi-CPU

```c
for (int i = 0; i < machine->smp.cpus; i++) {
    Object *cpu = object_new(machine->cpu_type);
    qdev_realize(DEVICE(cpu), NULL, &error_fatal);
    /* GIC에 connect */
    sysbus_connect_irq(SYS_BUS_DEVICE(s->gic), i,
                       qdev_get_gpio_in(DEVICE(cpu), ARM_CPU_IRQ));
}
```

`-smp 4`로 4 core. 각각 GIC redistributor·timer·IPI 등 연결.

## 보드 versioning

호환성 보존을 위해 *버전별 머신*을 둠.

```c
static void my_machine_v1_class_init(ObjectClass *oc, void *data) {
    /* v1 */
}
static void my_machine_v2_class_init(ObjectClass *oc, void *data) {
    /* v2 — VirtIO 추가 등 */
}

DEFINE_MY_MACHINE_TYPE(2, NULL, false)   /* my-machine-2.0 */
DEFINE_MY_MACHINE_TYPE(1, NULL, true)    /* my-machine-1.0 (default) */
```

production은 *수십 버전* 가져 *live migration 호환성* 유지.

## QOM tree에서 확인

```text
(qemu) info qom-tree /machine
/machine (my-machine)
  /unattached
    /device[0] (arm-gic)
    /device[1] (pl011)
  /peripheral
  /peripheral-anon
  /sysbus
  /soc (container)
```

내가 만든 머신이 *QOM tree*에 등장.

## 흔한 함정

- **CPU type 누락** — `default_cpu_type` 안 set하면 `-cpu` 안 줬을 때 fail.
- **IRQ wiring 잘못** — device의 IRQ가 GIC line N에 연결되어야 한다 가정. 잘못 set하면 *영원히* fire 안 됨.
- **메모리 영역 겹침** — RAM과 MMIO BAR이 겹치면 *unpredictable*. mtree로 확인.
- **boot info의 ram_size** — `machine->ram_size`와 일치해야. mismatch 시 kernel panic.

## 정리

- Custom machine은 `hw/arm/...c`에 `MachineClass` 등록.
- `init` callback에서 *CPU + 메모리 + IC + peripheral* 조립.
- Kconfig·meson.build·default.mak에 builds 통합.
- Machine 옵션은 `object_class_property_add_*`로 설정.
- Device tree를 *자동 생성*하거나 `-dtb`로 외부 전달.
- Production은 *버전별 머신*으로 migration 호환.
- 디버깅: `info qom-tree`·`info mtree`로 *구조 확인*.

## 다음 장 예고

다음 장은 *QEMU project에 기여하는 법* — code style·patch·mailing list까지.

## 관련 항목

- [Ch 10: 마이그레이션](/blog/tools/emulation/qemu-internals/chapter10-migration)
- [Ch 12: QEMU 기여하기](/blog/tools/emulation/qemu-internals/chapter12-contributing)
- [QEMU RISC-V — Custom Device](/blog/tools/emulation/qemu-riscv/chapter08-custom-device)
- [QEMU Embedded — Vendor Machines](/blog/tools/emulation/qemu-embedded/chapter13-vendor-machines)
