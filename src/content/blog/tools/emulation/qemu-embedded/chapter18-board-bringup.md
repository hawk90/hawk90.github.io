---
title: "Ch 18: 보드 Bringup Workflow"
date: 2025-09-02T18:00:00
description: "DTB → kernel → rootfs → driver — 새 보드 살리는 절차."
tags: [QEMU, board-bringup, dtb, kernel-config]
series: "QEMU Embedded Emulation"
seriesOrder: 18
draft: true
---

## 이 챕터의 의도

새 SoC/보드를 받았을 때 *Linux를 부팅시키는 절차* — power·clock·UART·DRAM·bootloader·kernel·rootfs·driver를 *한 단계씩* 올리는 게 bringup. 보드 도착 *전*에 QEMU에서 같은 절차를 시뮬레이션하면 *모든 펌웨어·driver 코드를 미리 준비* 가능 → 보드 받으면 *몇 시간 안에 콘솔*.

## 핵심 항목

- ✦ Bringup 단계 (의존 순서)
  1. **Power-on** + reset 회로 → core fetch from boot ROM
  2. **Clock tree** — PLL 설정, peripheral clock
  3. **UART** — 첫 console 출력 ("Hello")
  4. **DRAM** — DDR controller init, training, scrubbing
  5. **JTAG** — debug interface 활성 (실 HW만)
  6. **Bootloader** — U-Boot, edk2, Coreboot
  7. **Kernel** — defconfig + DTS로 boot
  8. **Rootfs** — busybox minimum or buildroot/Yocto image
  9. **Driver** — per-peripheral probe·dmesg 검증
- ✦ **DTS (Device Tree Source) 작성**
  - `compatible` — driver matching key
  - `reg` — MMIO base/size
  - `interrupts` — IRQ specifier (GIC PPI/SPI)
  - `clocks`, `pinctrl`, `power-domains`
  - `reserved-memory` — DMA, OpenAMP 공유 영역
- ✦ Kernel defconfig — `make ARCH=arm64 myboard_defconfig`, `make menuconfig`
- ✦ Kernel module selection — `=y` (built-in) vs `=m` (module)
- ✦ Rootfs minimum — `/init` 또는 `busybox --install`, libc(musl/glibc)
- ✦ Driver probe verification — `dmesg | grep myperi`, `/sys/devices/`, `/proc/interrupts`
- ✦ **QEMU의 강력함** — 한 SoC 모델로 *모든 단계*를 사이클 단위 시뮬레이션, JTAG 없이 ICE 시작
- ✦ Bringup 도구
  - `dtc -I dts -O dtb` — DTS→DTB
  - `mkimage -f myboard.its` — FIT image (multi-DTB)
  - `qemu-system-... -M virt -dtb out.dtb -kernel Image -initrd rootfs.cpio.gz`
- ✦ 실제 HW와의 gap
  - QEMU emulate 못 하는 영역 — analog, PHY, exact timing, undocumented errata
  - 마이그레이션 방법 — QEMU에서 *driver code*는 그대로, HAL 일부만 교체
- ◦ Bringup 자동화 — Jenkins/GitLab CI matrix (Ch 20)

## 다이어그램 (4)

1. Bringup 단계 의존 그래프 (power → clock → UART → DRAM → bootloader → kernel → rootfs → driver)
2. DTS 노드 구조 — root + cpu + memory + soc + peripheral
3. QEMU bringup 워크플로우 — DTS 수정 → DTB build → kernel rebuild → QEMU run
4. 실 HW migration — QEMU에서 검증된 driver → real board HAL 교체

## 코드 sketch

```dts
/* myboard.dts — minimal new board */
/dts-v1/;
/ {
    compatible = "myvendor,myboard", "arm,virt";
    #address-cells = <2>;
    #size-cells = <2>;

    chosen { stdout-path = "/serial@9000000"; bootargs = "console=ttyAMA0"; };

    cpus {
        #address-cells = <1>;
        #size-cells = <0>;
        cpu@0 { device_type = "cpu"; compatible = "arm,cortex-a72"; reg = <0>; };
    };

    memory@40000000 {
        device_type = "memory";
        reg = <0x0 0x40000000 0x0 0x10000000>;   /* 256MB */
    };

    soc {
        compatible = "simple-bus";
        #address-cells = <2>; #size-cells = <2>; ranges;

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

        clk24m: clk-24m { compatible = "fixed-clock"; #clock-cells = <0>; clock-frequency = <24000000>; };
    };
};
```

```bash
# 빌드 + 부팅
dtc -I dts -O dtb -o myboard.dtb myboard.dts
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 256M \
    -kernel Image -dtb myboard.dtb -initrd rootfs.cpio.gz \
    -nographic -append "console=ttyAMA0"

# Driver 검증
guest$ dmesg | grep -i myperi
guest$ ls /sys/bus/platform/devices/
guest$ cat /proc/interrupts | grep myperi
```

```c
/* 최소 driver — probe 확인용 */
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
    .driver = { .name = "myperi", .of_match_table = myperi_match },
    .probe  = myperi_probe,
};
module_platform_driver(myperi_driver);
```

## 레퍼런스

- Linux `Documentation/devicetree/booting-without-of.rst`
- Linux `Documentation/devicetree/bindings/`
- "Mastering Embedded Linux Programming" (Chris Simmonds) — bringup 챕터
- "Embedded Linux Primer" (Christopher Hallinan)
- Free Electrons/Bootlin training slides (board bringup)

## 관련 항목

- [Ch 4: U-Boot](/blog/tools/emulation/qemu-embedded/chapter04-u-boot) (기존)
- [Ch 5: Kernel boot](/blog/tools/emulation/qemu-embedded/chapter05-kernel) (기존)
- [Ch 7: Device Tree](/blog/tools/emulation/qemu-embedded/chapter07-device-tree) (기존)
- [Ch 13: 벤더 머신](/blog/tools/emulation/qemu-embedded/chapter13-vendor-machines)
- [Ch 19: Fault Injection](/blog/tools/emulation/qemu-embedded/chapter19-fault-injection)
