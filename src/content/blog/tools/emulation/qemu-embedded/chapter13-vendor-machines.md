---
title: "Ch 13: 벤더 머신 — STM32·i.MX·BCM"
date: 2025-09-02T13:00:00
description: "Generic virt 너머 — 실제 보드 에뮬레이션."
tags: [QEMU, stm32, imx, raspberry-pi, bcm]
series: "QEMU Embedded Emulation"
seriesOrder: 13
draft: true
---

## 이 챕터의 의도

앞선 Ch 2-3이 generic `-M virt`를 다뤘다면 이 장은 실제 출하 보드를 모방한 vendor machine을 다룬다. STM32, i.MX, Raspberry Pi 같은 제품을 QEMU로 띄우면 실 HW를 받기 전에 펌웨어와 driver를 미리 검증할 수 있다.

## 핵심 항목

- ✦ 벤더별 머신 — `qemu-system-arm -machine ?`로 전체 목록
- ✦ **STM32 계열** — `netduinoplus2` (STM32F405), `mps2-an{385,505,521}` (Cortex-M3/M33), `b-l475e-iot01a` (STM32L4)
- ✦ **NXP i.MX** — `mcimx7d-sabre` (i.MX7 dual A7), `mcimx6ul-evk` (i.MX6 single A7), `imx25-pdk`
- ✦ **BCM (Raspberry Pi)** — `raspi2b` (Pi 2B), `raspi3b` (Pi 3B+), `raspi4b` (Pi 4B) — VideoCore peripheral, mailbox
- ✦ **SiFive** — `sifive_u` (HiFive Unleashed), `hifive_unmatched` (RISC-V dev board)
- ✦ **Xilinx Zynq** — `xlnx-zcu102` (ZynqMP, A53+R5+PL)
- ✦ Per-machine 자동 적용 — memory map, peripheral, interrupt controller, clock tree
- ✦ Per-machine DT — QEMU가 `-dtb` 없이도 internal DT 생성, `-machine dumpdtb=out.dtb`로 추출 가능
- ✦ 머신 선택 기준
  - 펌웨어/RTOS 개발 → STM32, i.MX, mps2
  - Linux 부팅 → raspi, sabre, hifive
  - secure world 학습 → `-machine virt,secure=on` (Ch 16)
  - hypervisor 학습 → `virt,virtualization=on` (Ch 17)
- ✦ 한계 — peripheral 일부만 emulate, 실 보드와 *완전 일치 X* (특히 PHY·아날로그)
- ◦ Custom machine 작성 → QEMU Internals 시리즈

## 다이어그램 (3)

1. 벤더 machine 카테고리 트리 — STM/NXP/BCM/SiFive/Xilinx
2. Generic virt vs vendor machine — peripheral 충실도 비교
3. 머신 선택 의사결정 트리 (목적별)

## 코드 sketch

```bash
# STM32 — bare-metal firmware
qemu-system-arm -M netduinoplus2 -nographic -semihosting \
    -kernel firmware.elf

# i.MX7 — Linux boot
qemu-system-arm -M mcimx7d-sabre \
    -kernel zImage -dtb imx7d-sdb.dtb -initrd rootfs.cpio.gz \
    -nographic -append "console=ttymxc0 root=/dev/ram"

# Raspberry Pi 4 — 64-bit Linux
qemu-system-aarch64 -M raspi4b -smp 4 -m 2G \
    -kernel Image -dtb bcm2711-rpi-4-b.dtb \
    -drive file=rpi.img,format=raw,if=sd \
    -nographic

# SiFive HiFive Unmatched
qemu-system-riscv64 -M hifive_unmatched -m 8G -smp 5 \
    -kernel Image -initrd rootfs.cpio.gz

# Xilinx ZCU102 — APU + RPU
qemu-system-aarch64 -M xlnx-zcu102 \
    -kernel Image -dtb zynqmp-zcu102-rev1.0.dtb
```

```bash
# Machine 사양 확인
qemu-system-arm -machine raspi3b -cpu help
qemu-system-arm -machine raspi3b -device help
qemu-system-arm -machine raspi3b -dumpdtb out.dtb
dtc -I dtb -O dts out.dtb -o out.dts
```

## 레퍼런스

- QEMU `qemu-system-{arm,aarch64,riscv64} -machine ?`
- QEMU `Documentation/system/arm/{stm32,imx,raspi,zynqmp}.rst`
- 각 SoC reference manual (STM32F4 RM0090, i.MX7 RM, BCM2711 ARM peripherals)
- LWN "QEMU emulation of real-world boards"

## 관련 항목

- [Ch 2: ARM virt machine](/blog/tools/emulation/qemu-embedded/chapter02-arm-virt) (기존)
- [Ch 3: RISC-V virt](/blog/tools/emulation/qemu-embedded/chapter03-riscv-virt) (기존)
- [Ch 18: 보드 bringup](/blog/tools/emulation/qemu-embedded/chapter18-board-bringup)
