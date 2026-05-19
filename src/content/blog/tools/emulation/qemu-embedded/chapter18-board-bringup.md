---
title: "Ch 18: 보드 Bringup Workflow"
date: 2026-05-17T18:00:00
description: "DTB → kernel → rootfs → driver — 새 보드 살리는 절차."
tags: [QEMU, board-bringup, dtb, kernel-config, hal]
series: "QEMU Embedded Emulation"
seriesOrder: 18
draft: true
---

새 SoC나 보드를 받아 Linux를 *부팅시키는 절차*가 **board bringup**입니다. power → clock → UART → DRAM → bootloader → kernel → rootfs → driver — 한 단계씩 올립니다. 보드 도착 *전*에 QEMU에서 같은 절차를 *시뮬레이션*해 두면, 펌웨어와 driver 코드가 모두 준비된 상태로 실 보드를 받아 *몇 시간 안에* 콘솔까지 올릴 수 있습니다.

## Bringup 단계 — 의존 순서

```text
1. Power-on / reset      ← 칩 전원, reset signal
        │
2. Clock tree            ← PLL, peripheral clock
        │
3. UART                  ← 첫 "Hello" 출력 가능
        │
4. DRAM                  ← DDR controller init·training
        │
5. JTAG / ICE            ← (실 보드만) debug interface
        │
6. Bootloader            ← U-Boot, edk2, Coreboot
        │
7. Kernel                ← defconfig + DTS로 부팅
        │
8. Rootfs                ← busybox·libc 최소 환경
        │
9. Driver probe          ← peripheral마다 동작 검증
```

각 단계가 *이전 단계*에 의존합니다. UART 없이는 *진단 불가*, DRAM 없이는 *kernel 부재*. QEMU는 1~4·6~9를 *시뮬레이션*하고 5(JTAG)는 실 HW에서만.

## DTS 작성 — 보드 정의

새 보드의 *device tree*가 가장 먼저 작성됩니다.

```dts
/* myboard.dts — minimal new board */
/dts-v1/;
/ {
    compatible = "myvendor,myboard", "arm,virt";
    #address-cells = <2>;
    #size-cells = <2>;

    chosen {
        stdout-path = "/soc/serial@9000000";
        bootargs = "console=ttyAMA0";
    };

    cpus {
        #address-cells = <1>;
        #size-cells = <0>;
        cpu@0 {
            device_type = "cpu";
            compatible = "arm,cortex-a72";
            reg = <0>;
        };
    };

    memory@40000000 {
        device_type = "memory";
        reg = <0x0 0x40000000 0x0 0x10000000>;   /* 256MB */
    };

    soc {
        compatible = "simple-bus";
        #address-cells = <2>;
        #size-cells = <2>;
        ranges;

        serial@9000000 {
            compatible = "arm,pl011", "arm,primecell";
            reg = <0x0 0x9000000 0x0 0x1000>;
            interrupts = <0 1 4>;
        };

        myperi@a000000 {
            compatible = "myvendor,myperi-v1";
            reg = <0x0 0xa000000 0x0 0x1000>;
            interrupts = <0 32 4>;
            clocks = <&clk24m>;
        };

        clk24m: clk-24m {
            compatible = "fixed-clock";
            #clock-cells = <0>;
            clock-frequency = <24000000>;
        };
    };
};
```

## 핵심 DTS property

| Property | 의미 |
|----------|------|
| `compatible` | driver matching의 key |
| `reg` | MMIO base + size |
| `interrupts` | IRQ specifier (GIC PPI/SPI) |
| `clocks` | clock 의존 |
| `pinctrl-*` | pin mux 설정 |
| `power-domains` | power management |
| `reserved-memory` | DMA·OpenAMP 공유 영역 |

`compatible`이 *제일 중요*. driver의 `of_match_table`과 정확히 일치해야 probe됨.

## Kernel defconfig

```bash
# 베이스 defconfig 복사
cp arch/arm64/configs/defconfig arch/arm64/configs/myboard_defconfig

# Custom 설정 추가
make ARCH=arm64 myboard_defconfig
make ARCH=arm64 menuconfig
# Device Drivers → Misc devices → MyVendor MyPeri = m
make ARCH=arm64 -j$(nproc) Image
```

## DTB 빌드

```bash
dtc -I dts -O dtb -o myboard.dtb myboard.dts
```

또는 kernel build tree 안에 두고 `make dtbs`.

## QEMU에서 부팅

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 256M -nographic \
    -kernel arch/arm64/boot/Image \
    -dtb myboard.dtb \
    -initrd rootfs.cpio.gz \
    -append "console=ttyAMA0"
```

또는 직접 머신 만들면(`-M virt`가 아닌) `-M myboard,...`(QEMU Internals에서 다룸).

## Rootfs 최소

```bash
# busybox 최소
make -C busybox CROSS_COMPILE=aarch64-linux-gnu- defconfig
make -C busybox install

# init script
mkdir -p _install/dev _install/proc _install/sys
cat > _install/init <<'EOF'
#!/bin/sh
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev
echo "Hello from bringup rootfs"
exec /bin/sh
EOF
chmod +x _install/init

# cpio
cd _install
find . | cpio -o -H newc | gzip > ../rootfs.cpio.gz
```

## Driver probe 검증

```bash
# Boot 후 guest 안에서
guest$ dmesg | grep myperi
myperi: probed: base=0xa000000 irq=32

guest$ ls /sys/devices/platform/
soc/  myperi@a000000/

guest$ cat /proc/interrupts | grep myperi
32:    1234   GIC-0  32 Level   myperi
```

`myperi` line 3개가 모두 보이면 *probe 성공*.

## Driver skeleton

```c
/* drivers/misc/myperi.c */
#include <linux/module.h>
#include <linux/platform_device.h>
#include <linux/of.h>
#include <linux/io.h>

static int myperi_probe(struct platform_device *pdev) {
    struct resource *res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    void __iomem *base = devm_ioremap_resource(&pdev->dev, res);
    int irq = platform_get_irq(pdev, 0);

    dev_info(&pdev->dev, "probed: base=%pa irq=%d\n", &res->start, irq);
    return 0;
}

static const struct of_device_id myperi_match[] = {
    { .compatible = "myvendor,myperi-v1" },
    {}
};

static struct platform_driver myperi_driver = {
    .driver = {
        .name = "myperi",
        .of_match_table = myperi_match,
    },
    .probe = myperi_probe,
};
module_platform_driver(myperi_driver);

MODULE_LICENSE("GPL");
```

이 skeleton이 *모든 platform driver*의 표준 형태.

## 실 HW migration — QEMU → board

QEMU에서 검증된 *driver code*는 그대로 옮깁니다. 차이가 나는 부분:

| 영역 | QEMU | 실 HW |
|------|------|--------|
| MMIO behavior | 정확 (model) | 정확 (real chip) |
| Timing | 명목 | cycle-accurate |
| Analog (ADC·DAC) | 없음 | 진짜 |
| PHY (Ethernet, USB) | virtio | 실 PHY chip |
| Errata | 없음 | vendor-specific |

대부분의 *driver logic*은 그대로. *HAL 일부*(PHY init, errata workaround)만 실 HW에 추가.

## 단계별 검증 patterns

| 증상 | 위치 |
|------|------|
| QEMU 시작 불가 | 옵션 오류·머신 잘못 |
| Boot ROM 진행 안 됨 | 메모리 맵 mismatch |
| OpenSBI/ATF 안 보임 | bootloader address |
| Kernel "Booting Linux..." 안 보임 | DRAM·entry point |
| "Cannot open root device" | rootfs·virtio-blk·cmdline |
| Driver probe 안 됨 | DTS compatible·driver match |
| dmesg "ENODEV" | reg·interrupts·clocks 잘못 |

각 단계마다 *expected log line*을 정해 두면 *어디서 fail했는지* 즉시 알 수 있습니다.

## Bringup 자동화

CI에서 bringup test를 *매 PR마다*. QEMU + GitHub Actions matrix(Ch 20)로:

```bash
timeout 60 qemu-system-aarch64 -M virt -m 256M -nographic \
    -kernel Image -dtb myboard.dtb -initrd rootfs.cpio.gz \
    -append "console=ttyAMA0 init=/sbin/poweroff" \
    | tee boot.log

grep "myperi: probed" boot.log || exit 1
```

`/sbin/poweroff`가 *kernel halt*. 정상 부팅 후 자동 종료. exit code로 pass/fail.

## 실 보드 도착 후 — 일정 단축

QEMU에서 충실히 준비했다면:

| 단계 | QEMU | 실 보드 |
|------|------|---------|
| Power/Reset 회로 | (모사) | 1~2일 |
| UART | (모사) | 수 시간 |
| DRAM 초기화 | (모사) | 1주 (ddrtool tuning) |
| Bootloader | 동작 | 그대로 |
| Kernel | 동작 | 그대로 |
| Driver logic | 동작 | HAL 일부 교체 |
| Total | 1~2주 | 4~6주 |

QEMU 준비 *없이* 실 보드 bringup이 *2달*이라면 QEMU 결합 시 *4~6주*. 가속 효과 큼.

## 흔한 함정

- **compatible 오타** — `myvendor,myperi-v1` ↔ `myvendor,myper-v1`. driver match fail.
- **address-cells/size-cells 누락** — child의 `reg`가 잘못 해석.
- **interrupt-parent 누락** — IRQ 도착 안 함. probe되어도 IRQ 없으면 동작 안 함.
- **kernel module 미포함** — `.ko`가 rootfs `/lib/modules/`에 없으면 driver probe 안 됨. built-in으로 빌드 권장.

## 정리

- Board bringup은 *power → clock → UART → DRAM → bootloader → kernel → rootfs → driver*의 단계적 의존.
- QEMU에서 1~4·6~9를 시뮬레이션 가능. JTAG(5)만 실 HW.
- DTS의 *compatible·reg·interrupts·clocks*가 driver match의 핵심.
- defconfig 복사 → custom 설정 → DTB build → QEMU run의 흐름.
- Driver skeleton은 *platform_driver*: probe·of_match_table·module_platform_driver.
- 실 HW migration은 *대부분의 driver code 그대로*, HAL 일부(PHY·errata)만 교체.
- 단계별 expected log로 실패 위치 즉시 진단.
- CI에 bringup test 자동화하면 매 PR마다 회귀 검증.

## 다음 장 예고

다음 장은 *robustness 검증* — **fault injection**. clock skew·power glitch·watchdog timeout 같은 fault를 QEMU에서 결정적으로 주입.

## 관련 항목

- [Ch 17: ARM Hypervisor](/blog/tools/emulation/qemu-embedded/chapter17-hypervisor)
- [Ch 19: Fault Injection](/blog/tools/emulation/qemu-embedded/chapter19-fault-injection)
- [Ch 20: CI matrix](/blog/tools/emulation/qemu-embedded/chapter20-ci-matrix)
- [BSP Development](/blog/embedded/bsp/chapter01-what-is-bsp)
