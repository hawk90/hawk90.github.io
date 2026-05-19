---
title: "Ch 13: 벤더 머신 — STM32·i.MX·BCM"
date: 2026-05-17T13:00:00
description: "Generic virt 너머 — 실제 보드 에뮬레이션."
tags: [QEMU, stm32, imx, raspberry-pi, bcm, sifive, zynq]
series: "QEMU Embedded Emulation"
seriesOrder: 13
draft: true
---

지금까지 다룬 generic `-M virt`는 *학습과 prototype*에 좋습니다. 그러나 실 SoC의 *vendor-specific peripheral*(STM32의 PWM·i.MX의 GPMI·Raspberry Pi의 VideoCore mailbox)을 다뤄야 하는 시점이 옵니다. QEMU는 다수의 *vendor machine*을 제공합니다 — 실 출하 보드를 흉내내는 머신들. 이 장은 그 카테고리와 활용을 정리합니다.

## 사용 가능한 머신 확인

```bash
qemu-system-arm -machine ?
qemu-system-aarch64 -machine ?
qemu-system-riscv64 -machine ?
```

수십 개의 머신이 나옵니다. 자주 쓰는 것을 카테고리로 묶으면:

| 카테고리 | 머신 | SoC |
|----------|------|-----|
| **STM32** | `netduinoplus2` | STM32F405 (Cortex-M4) |
| ARM Cortex-M | `mps2-an385` | M3 |
| | `mps2-an505` | M33 |
| | `mps2-an521` | M33 SecureSubsystem |
| | `mps3-an547` | M55 |
| | `b-l475e-iot01a` | STM32L4 IoT |
| **NXP i.MX** | `mcimx7d-sabre` | i.MX7 dual A7 |
| | `mcimx6ul-evk` | i.MX6 single A7 |
| | `imx25-pdk` | i.MX25 |
| **Raspberry Pi** | `raspi2b` | BCM2836 (Pi 2B) |
| | `raspi3b` | BCM2837 (Pi 3B+) |
| | `raspi4b` | BCM2711 (Pi 4B) |
| **SiFive** | `sifive_u` | HiFive Unleashed (RV64GC) |
| | `hifive_unmatched` | RV64GC dev board |
| **Xilinx** | `xlnx-zcu102` | ZynqMP (A53 + R5 + PL) |
| | `xlnx-versal-virt` | Versal generic |

각 머신은 *해당 SoC의 메모리 맵·peripheral·인터럽트 컨트롤러*를 모사합니다.

## STM32 — Cortex-M 펌웨어

```bash
qemu-system-arm -M netduinoplus2 -nographic -semihosting \
    -kernel firmware.elf
```

`netduinoplus2`는 STM32F405 호환 — UART·SPI·I2C·GPIO·timer가 *실 STM32 register layout*. STM32 HAL 코드가 *그대로* 동작.

mps2 시리즈는 ARM이 제공하는 *Cortex-M 평가 보드*입니다.

```bash
# Cortex-M3
qemu-system-arm -M mps2-an385 -cpu cortex-m3 -nographic -semihosting \
    -kernel firmware.elf

# Cortex-M33 with TrustZone
qemu-system-arm -M mps2-an521 -cpu cortex-m33 -nographic -semihosting \
    -kernel firmware.elf

# Cortex-M55 (Helium SIMD)
qemu-system-arm -M mps3-an547 -cpu cortex-m55 -nographic -semihosting \
    -kernel firmware.elf
```

`-semihosting`은 UART 없는 환경에서 printf를 host로 forward(Ch 14).

## i.MX — Linux on Cortex-A

```bash
qemu-system-arm -M mcimx7d-sabre \
    -kernel zImage -dtb imx7d-sdb.dtb -initrd rootfs.cpio.gz \
    -nographic -append "console=ttymxc0 root=/dev/ram"
```

i.MX7의 UART는 `ttymxc0`(NXP의 UART driver). NXP BSP의 dtb와 결합해 *실 Sabre 보드*와 같은 환경을 시험.

## Raspberry Pi — 학습·교육

```bash
qemu-system-aarch64 -M raspi4b -smp 4 -m 2G \
    -kernel kernel8.img -dtb bcm2711-rpi-4-b.dtb \
    -drive file=rpi.img,format=raw,if=sd \
    -nographic
```

Raspberry Pi 4B 호환. SD 카드 이미지를 그대로 attach해 *실 Pi와 같은* 부팅. mailbox·VideoCore 일부도 모사.

학습용으로 가장 사랑받는 머신입니다 — Raspberry Pi가 *교육 표준*이라서.

## SiFive HiFive — RISC-V Linux

```bash
qemu-system-riscv64 -M hifive_unmatched -m 8G -smp 5 \
    -bios fw_jump.bin \
    -kernel u-boot.bin \
    -drive file=rootfs.ext4,format=raw,id=hd0,if=none \
    -device virtio-blk-device,drive=hd0 \
    -append "root=/dev/vda console=ttySIF0"
```

HiFive Unleashed/Unmatched 보드 호환. *RISC-V QEMU 심화* 시리즈에서 자세히.

## Xilinx ZCU102 — APU + RPU

```bash
qemu-system-aarch64 -M xlnx-zcu102 \
    -kernel Image -dtb zynqmp-zcu102-rev1.0.dtb \
    -initrd rootfs.cpio.gz \
    -nographic -append "console=ttyPS0"
```

ZynqMP는 *Cortex-A53 ×4 + Cortex-R5 ×2 + Programmable Logic*의 *heterogeneous SoC*. AMP/OpenAMP(Ch 15) 학습 환경.

## DTB 확인

vendor machine마다 *내부 device tree*가 다릅니다.

```bash
qemu-system-aarch64 -M raspi4b,dumpdtb=rpi4.dtb -nographic
dtc -I dtb -O dts rpi4.dtb -o rpi4.dts
```

이 DT는 *실 Raspberry Pi 4*가 부팅 시 사용하는 DT와 거의 같음. 학습에 매우 유용.

## 머신 선택 기준

| 목적 | 추천 머신 |
|------|----------|
| 펌웨어 학습 (Cortex-M) | `mps2-an385`(M3), `mps2-an521`(M33 TZ) |
| STM32 HAL 코드 시험 | `netduinoplus2` |
| Linux 부팅 학습 | `raspi3b`/`raspi4b`(가장 친숙) |
| i.MX BSP 개발 | `mcimx7d-sabre` |
| RISC-V Linux | `hifive_unmatched` |
| Secure world 학습 | `virt,secure=on` 또는 `mps2-an521` |
| Hypervisor 학습 | `virt,virtualization=on` |
| AMP heterogeneous | `xlnx-zcu102` |

## 한계

- **peripheral 일부만 emulate** — 모든 peripheral이 모사되지는 않음. dmesg에 "probe failed" 흔함.
- **PHY·analog 부재** — 외부 신호 시뮬레이션 X.
- **clock·power 모사 부족** — 정확한 timing은 실 보드.
- **boot ROM** — vendor가 별도 제공한 *Boot ROM*이 필요한 보드 있음(예: i.MX의 NXP HAB).

## CPU·머신 details 확인

```bash
qemu-system-arm -machine raspi3b -cpu help
qemu-system-arm -machine raspi3b -device help
```

CPU 옵션과 attach 가능한 device를 머신별로 나열. 시작 시 *어떤 machine이 어떤 self를 지원하는지* 확인.

## Custom vendor machine 작성

QEMU의 *내가 만든 SoC*를 위한 머신 — QEMU Internals 시리즈에서 다룹니다. `hw/arm/myboard.c`에 SysBus device들을 instantiate하고 메모리 맵에 배치.

## 흔한 함정

- **wrong cpu** — machine은 *기본 CPU*가 정해져 있지만 `-cpu`로 override 가능. 호환 안 되는 조합이면 fail.
- **dtb 누락** — vendor machine은 *DTB 필수*가 많음. `-dtb` 명시.
- **storage interface** — SD vs USB vs eMMC. machine마다 다른 `-drive ... ,if=...`.
- **console 명** — machine마다 다름(`ttymxc0`·`ttySIF0`·`ttyPS0`·`ttyAMA0`·`ttyS0`). DTS의 `chosen.stdout-path` 확인.

## 정리

- generic `-M virt`를 넘어 *vendor machine*이 실 SoC를 흉내냄. STM32·i.MX·Raspberry Pi·SiFive·Zynq.
- 머신 종류: Cortex-M(mps2 시리즈)·Linux capable(raspi, sabre, hifive)·heterogeneous(xlnx-zcu102).
- 머신마다 DT가 *내부 자동 생성*. dumpdtb로 확인 가능.
- 머신 선택은 *목적*에 따라 — 펌웨어는 mps2, Linux는 raspi/sabre, secure는 virt+secure=on.
- 한계: peripheral 일부, PHY/analog 부재, clock timing 부족. 실 보드 보완 필요.
- 콘솔 명이 머신마다 다르므로 *DTS의 stdout-path* 확인 필수.
- Custom 머신은 QEMU Internals 시리즈에서.

## 다음 장 예고

다음 장은 *UART 없는 환경*의 printf — **semihosting**. CI에서 firmware test exit code를 host로 전달하는 패턴까지.

## 관련 항목

- [Ch 12: RTOS 에뮬레이션](/blog/tools/emulation/qemu-embedded/chapter12-rtos)
- [Ch 14: Semihosting](/blog/tools/emulation/qemu-embedded/chapter14-semihosting)
- [Ch 18: 보드 bringup](/blog/tools/emulation/qemu-embedded/chapter18-board-bringup)
- [RISC-V QEMU — sifive_u](/blog/tools/emulation/qemu-riscv/chapter05-sifive-u)
