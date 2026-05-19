---
title: "Ch 7: 디바이스 트리"
date: 2026-05-17T07:00:00
description: "QEMU가 생성하는 디바이스 트리를 이해하고 커스터마이징한다."
tags: [QEMU, DeviceTree, DTB, dtc, overlay]
series: "QEMU Embedded Emulation"
seriesOrder: 7
draft: true
---

ARM·RISC-V Linux 시스템에서 *하드웨어 구성*을 커널에 알려 주는 표준 메커니즘이 **Device Tree**(DT)입니다. QEMU는 머신 구성에 맞춰 DT를 *자동 생성*해 부트로더에 전달하지만, 종종 *직접 수정*하거나 *증강*해야 할 때가 있죠. 이 장은 DT의 기본부터 QEMU에서의 활용까지 한 번에 정리합니다.

## Device Tree란

DT는 *하드웨어 토폴로지 + 자원 위치*를 기술하는 *데이터 구조*입니다. 그 이전(x86)에는 보통 *BIOS ACPI*가 했고, ARM/RISC-V는 ACPI 대신(또는 함께) DT를 씁니다.

```text
.dts (text, 사람이 작성)
   │  dtc -O dtb
   ▼
.dtb (binary, 부트로더 → 커널 전달)
```

`dtc`(Device Tree Compiler)가 둘 사이를 변환.

## DTS 문법

```dts
/dts-v1/;

/ {
    compatible = "linux,dummy-virt";
    #address-cells = <0x02>;
    #size-cells = <0x02>;

    cpus {
        #address-cells = <0x01>;
        #size-cells = <0x00>;

        cpu@0 {
            device_type = "cpu";
            compatible = "arm,cortex-a72";
            reg = <0x00>;
        };
    };

    memory@40000000 {
        device_type = "memory";
        reg = <0x00 0x40000000 0x00 0x80000000>;
    };

    pl011@9000000 {
        compatible = "arm,pl011";
        reg = <0x00 0x9000000 0x00 0x1000>;
        interrupts = <0x00 0x01 0x04>;
    };
};
```

핵심 element: **node**(`name@address`), **property**(`name = value`), **address-cells/size-cells**(주소·크기 word 개수).

## QEMU가 자동 생성

QEMU는 머신 구성(GIC 버전·CPU 수·DRAM 크기·VirtIO 슬롯·attach된 device)을 보고 *런타임*에 DT를 만듭니다. 가장 자주 하는 작업이 *그 DT를 보는 것*.

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -smp 4 \
    -nographic -machine dumpdtb=qemu.dtb -kernel /dev/null 2>&1
# Or simpler:
qemu-system-aarch64 -M virt,dumpdtb=qemu.dtb -nographic
```

`qemu.dtb`를 DTS로 변환.

```bash
dtc -I dtb -O dts qemu.dtb -o qemu.dts
less qemu.dts
```

## 자주 보는 노드

| 노드 | 의미 |
|------|------|
| `/cpus/cpu@N` | CPU 정의 |
| `/memory@addr` | DRAM 영역 |
| `/intc@addr` | 인터럽트 컨트롤러 |
| `/timer` | ARM Generic Timer |
| `/pl011@addr` | PL011 UART |
| `/virtio_mmio@addr` | VirtIO MMIO slot |
| `/chosen` | bootargs·stdout-path |
| `/aliases` | 별명 |
| `/clocks/...` | 클락 트리 |

`/chosen`이 *부팅 시점 결정* 정보 — bootargs(cmdline), stdout-path(콘솔), initrd 위치 등.

## QEMU 머신과 DT의 관계

QEMU virt 머신은 device tree를 *명시적*으로 생성하므로, 머신 옵션이 곧 DT 변경.

| 옵션 | DT 변경 |
|------|---------|
| `-smp 4` | `/cpus`에 4 CPU 노드 |
| `-m 4G` | `/memory@40000000`의 size 4GB |
| `-M virt,gic-version=3` | `/intc@...`의 compatible "arm,gic-v3" |
| `-device virtio-net-device,...` | virtio MMIO node 활성 |

따라서 QEMU 머신 옵션을 바꾸고 `dumpdtb`하면 *DT가 어떻게 변하는지* 학습할 수 있습니다.

## 커스텀 DTB

QEMU에 직접 DTB를 줄 수도 있습니다.

```bash
# 1. 자동 생성된 DTB 추출
qemu-system-aarch64 -M virt,dumpdtb=base.dtb -nographic

# 2. DTS 편집
dtc -I dtb -O dts base.dtb -o my.dts
$EDITOR my.dts
# (예: chosen의 bootargs 수정)

# 3. 다시 dtb로
dtc -I dts -O dtb my.dts -o my.dtb

# 4. QEMU에 명시
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G \
    -kernel Image -dtb my.dtb -nographic
```

이 흐름이 *실 보드 BSP 개발*과 정확히 같습니다 — vendor가 제공한 base DT를 수정해 board-specific 변경을 적용.

## Overlay

전체 DT를 새로 만들지 않고 *일부만 추가*하는 메커니즘이 **DT overlay**.

```dts
/dts-v1/;
/plugin/;

&i2c1 {
    status = "okay";

    my_sensor@48 {
        compatible = "myvendor,my-sensor";
        reg = <0x48>;
    };
};
```

`&i2c1`이 base DT의 i2c1 node를 *참조*. overlay는 그 안에 새 device를 추가합니다. 빌드:

```bash
dtc -@ -I dts -O dtb my-overlay.dtso -o my-overlay.dtbo
```

런타임에 configfs로 attach:

```bash
mkdir /sys/kernel/config/device-tree/overlays/my-sensor
cat my-overlay.dtbo > /sys/kernel/config/device-tree/overlays/my-sensor/dtbo
```

*partial reconfig*(FPGA Driver Ch 8)에 자주 쓰이는 패턴.

## Phandle과 reference

DT 노드 사이의 *참조*는 phandle로.

```dts
intc: intc@8000000 { ... };

uart: pl011@9000000 {
    /* ... */
    interrupts = <0x00 0x01 0x04>;
    interrupt-parent = <&intc>;   /* phandle 참조 */
};
```

`&intc`가 *intc 노드의 phandle*. C의 pointer 같은 역할.

## 자주 묻는 질문

**Q: ACPI와 DT 어느 쪽?**

| 상황 | 표준 |
|------|------|
| 임베디드 SoC (ARM/RISC-V) | DT |
| ARM server | ACPI |
| x86 | ACPI |
| Apple Silicon | DT |

서버용 ARM이 ACPI를 쓰는 건 *enterprise 호환성*. 임베디드는 DT가 표준.

**Q: bindings 문서 어디?**

Linux source의 `Documentation/devicetree/bindings/`가 *진실의 원천*. 새 driver를 만들 때 *binding을 함께 작성*해야 mainline에 들어갑니다.

## 흔한 함정

- **address-cells/size-cells 누락** — child node의 `reg`가 잘못 해석.
- **interrupt-parent 누락** — IRQ 라우팅 fail.
- **compatible string typo** — driver 매칭 안 됨. dmesg에 device probe 안 보임.
- **size = 0** — `reg = <addr 0>` 같은 실수. memory 영역 0이라 mount 안 됨.
- **base DTB vs vendor DTB** — QEMU는 자동 DT, 실 vendor 보드는 별도 DT. 둘이 혼동되기 쉽습니다.

## 정리

- Device Tree는 ARM·RISC-V Linux의 *하드웨어 토폴로지 기술 표준*. `.dts`(source) ↔ `.dtb`(binary).
- QEMU는 머신 구성으로부터 *DT 자동 생성* — `dumpdtb=...`로 추출 가능.
- 자주 보는 노드: `/cpus`·`/memory`·`/intc`·UART/timer·`/chosen` (bootargs).
- 커스텀 DT는 *추출 → 편집 → 빌드 → -dtb*로 명시. 실 vendor BSP와 동일 흐름.
- **Overlay**는 일부만 추가 — configfs로 runtime attach. FPGA PR과 결합.
- phandle(`&intc`)로 노드 참조. interrupt-parent 같은 cross-link.
- bindings는 Linux source `Documentation/devicetree/bindings/`.

## 다음 장 예고

다음 장은 *DT가 정의하는 device들* — **peripherals**. UART·SPI·I2C·GPIO를 QEMU에 attach하고 driver가 어떻게 보는지.

## 관련 항목

- [Ch 6: 루트 파일시스템](/blog/tools/emulation/qemu-embedded/chapter06-rootfs)
- [Ch 8: 페리페럴 추가](/blog/tools/emulation/qemu-embedded/chapter08-peripherals)
- [QEMU RISC-V — virt 머신](/blog/tools/emulation/qemu-riscv/chapter02-virt-machine)
- [FPGA Driver — Partial Reconfig](/blog/tools/emulation/qemu-fpga-driver/chapter08-partial-reconfig)
