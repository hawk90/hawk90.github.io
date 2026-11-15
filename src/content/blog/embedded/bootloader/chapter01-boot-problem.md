---
title: "ROM부터 init까지 — 부트로더가 채우는 부팅 단계"
slug: "embedded/bootloader/chapter01-boot-problem"
date: 2026-05-09T09:01:00
description: "BootROM에서 커널과 init으로 이어지는 흐름에서 부트로더가 맡는 초기화·이미지 적재·인계 역할을 설명합니다."
series: "Bootloader Internals"
seriesOrder: 1
tags: [embedded, bootloader, u-boot, boot]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"부트로더는 *초기화가 끝나지 않은 시스템*을 *커널이 동작할 수 있는 환경*으로 만드는 다리입니다."** — 일부 보드에서는 DDR이나 부트 미디어를 아직 사용할 수 없으므로, 펌웨어 단계가 필요한 장치를 초기화하고 다음 단계에 제어를 넘깁니다.

전원이 들어온 직후의 코어가 사용할 수 있는 메모리와 주변 장치는 SoC와 보드의 초기화 상태에 따라 다릅니다. 많은 시스템은 초기 코드가 사용할 SRAM을 제공하고, DDR controller와 부트 미디어를 사용할 수 있게 하는 일은 이후 firmware 단계에서 진행합니다. 커널 이미지를 적재하고 커널이 사용할 하드웨어 정보를 전달한 뒤, 커널이 초기화되어 user space의 `init`을 실행하기까지의 간격을 부트 체인이 채웁니다.

## 전원이 들어온 직후의 CPU

Armv8-A에서 reset 후 실행 위치는 구현된 Exception level과 플랫폼 firmware 구성에 좌우됩니다. EL3가 구현된 PE는 EL3에서 reset을 시작하지만, EL3는 선택 사항이므로 모든 Armv8-A 시스템이 EL3에서 시작한다고 일반화할 수 없습니다. reset vector의 주소와 초기 메모리 배치는 SoC가 정합니다.

![Reset 직후 흐름 — 전원 → POR(PMIC rail + PLL lock + CPU deassert) → Reset Vector(SoC 고정 주소) → BootROM(boot mode strap에 따라 다음 단계 적재)](/images/blog/bootloader/diagrams/ch01-reset-flow.svg)

BootROM은 *SoC 출고 시 mask ROM에 굳어진 코드*입니다. 우리가 수정할 수 없습니다. BootROM은 *boot mode strap pin*을 읽어 어디서 다음 단계를 가져올지 정한 뒤, SoC 내부 SRAM에 *수십 KB짜리 작은 이미지*를 적재해 점프합니다.

이 *작은 이미지*가 부트로더의 첫 단계입니다. U-Boot에서는 SPL(Secondary Program Loader), ARMv8 secure boot에서는 BL1·BL2라고 부릅니다.

## 부트로더 없이는 안 되는 이유

"커널이 직접 동작하면 되지 않나"라는 질문에 답해야 합니다. 답은 *커널 이미지가 RAM에 적재되어 있어야 동작*하는데, *그 RAM이 아직 존재하지 않는다*는 것입니다.

부트로더가 책임지는 일은 네 가지입니다.

### 1. DDR 초기화

DDR controller는 *복잡한 상태 기계*입니다. PHY training, ZQ calibration, refresh interval 설정, write/read leveling을 *수십 단계*로 진행해야 비로소 *읽고 쓸 수 있는 메모리*가 됩니다. 이 시퀀스가 끝나기 전에는 *0x80000000 같은 DDR 주소를 읽으면 hang*합니다.

[Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)에서 자세히 다룹니다.

### 2. 부트 미디어 추상화

커널 이미지는 eMMC, SD, NAND, SPI flash, USB, ethernet 중 어느 매체에서든 올 수 있습니다. 커널은 자신이 *어디서 왔는지 모르는 채로* 동작합니다. 부트로더가 *해당 매체의 controller를 깨우고*, *파일 시스템을 마운트하거나 raw block을 읽어*, 메모리에 *형태가 맞는* 이미지를 펼쳐 놓습니다.

### 3. 커널 로딩 ABI

ARM64 커널은 *PC 주소가 어디든* 동작하지만, 진입 시점에 *특정 레지스터에 특정 값*이 들어 있어야 합니다.

ARM64 Linux 커널 진입 요구사항은 다음과 같습니다.

- `x0` = physical address of device tree blob (DTB) in system RAM
- `x1` = 0 (reserved)
- `x2` = 0 (reserved)
- `x3` = 0 (reserved)
- non-secure EL2 (권장) 또는 EL1, MMU off
- 인터럽트 마스크 및 캐시 일관성 등 추가 진입 조건 준수
- 부팅 대상 CPU는 같은 Exception level에서 커널에 진입

부트로더가 이 진입 조건을 맞춰 커널로 점프합니다. 조건을 어기면 초기 진입 실패나 부팅 중단으로 이어질 수 있습니다.

### 4. 환경 변수와 부트 정책

"어느 파티션에서 부팅할까", "kernel command line은 무엇인가", "rootfs는 어디 있는가"를 누군가 결정해야 합니다. 부트로더가 *영구 저장소에 저장된 환경 변수*를 읽어 *bootargs를 조립*하고, *A/B 슬롯 중 어느 쪽이 활성인지*를 판단합니다.

## 전체 부트 체인

전원 인가부터 user space의 init까지를 한눈에 보면 다음과 같습니다.

![전체 부트 체인 — POR → BootROM → SPL/BL1+BL2 → BL31(TF-A) → U-Boot Proper/BL33 → Linux Kernel → user space, 각 단계가 다음 단계를 메모리에 적재하고 점프](/images/blog/bootloader/diagrams/ch01-full-boot-chain.svg)

각 단계가 *다음 단계를 메모리에 적재*하고 *점프*하는 *수직 인계* 구조입니다. 한 단계가 죽으면 *다음 단계는 시작도 못 합니다*.

## 시리즈에서 다룰 보드

추상적인 설명만으로는 부트로더가 손에 잡히지 않습니다. 시리즈 전체에서 *세 가지 보드*를 예로 듭니다.

| 보드 | SoC | 아키텍처 | 특징 |
|------|-----|---------|------|
| QEMU virt | virt machine | ARMv8-A | 가상, JTAG 없이 실험에 적합 |
| BeagleBone Black | TI AM335x | ARMv7-A | 단순한 부트 흐름, SPL 학습에 좋음 |
| NXP i.MX 8M Plus EVK | i.MX 8M Plus | ARMv8-A | 실제 산업용, TF-A + U-Boot |

U-Boot 소스와 필요한 cross-toolchain, QEMU를 준비하면 `qemu_arm64_defconfig` 대상으로 QEMU virt 부트 흐름을 실험할 수 있습니다. 이 문서 작성 환경에서는 U-Boot 빌드나 QEMU 실행을 하지 않았으므로 실행 시간과 콘솔 결과는 확인하지 않았습니다.

```bash
# QEMU virt에서 U-Boot 실행
qemu-system-aarch64 -machine virt -nographic -cpu cortex-a57 \
    -bios u-boot.bin
```

명령이 실행되면 대상 U-Boot 버전과 defconfig에 맞는 실제 콘솔 출력을 기록하세요. 이 문서에서는 확인하지 않은 보드 장치 수, 메모리 크기, 버전 날짜를 예시 출력으로 고정하지 않습니다. U-Boot prompt가 나오는 것은 실험 시작점이지 부트 체인 전체를 이해했다는 검증은 아닙니다.

## 아키텍처별 차이

ARMv7, ARMv8-A, RISC-V는 부트 흐름의 *세부가 다릅니다*. 시리즈는 ARMv8-A를 기준으로 하되, 다른 아키텍처는 *차이만* 짚습니다.

### ARMv7-A

- 단일 권한 모드(monitor mode가 선택)
- BL31 같은 secure monitor가 *옵션*
- U-Boot SPL → U-Boot Proper → Linux의 단순한 흐름이 일반적

### ARMv8-A

- EL0(user), EL1(kernel), EL2(hypervisor), EL3(secure monitor)
- 부트 시작은 EL3
- TF-A가 BL1·BL2·BL31을 담당, U-Boot은 BL33으로 동작
- PSCI를 통해 secondary CPU를 깨움

### RISC-V

- M-mode(machine), S-mode(supervisor), U-mode(user)
- OpenSBI가 M-mode firmware로 자리잡음
- U-Boot은 OpenSBI 위에서 S-mode로 동작
- ARMv8-A의 TF-A와 비슷한 위치

[Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)에서 각 단계별 책임을 정리합니다.

## 부트 시간의 한계

제품은 사용 시나리오에 맞는 부팅 완료 기준과 목표 시간을 정합니다. 예를 들어 화면 출력, 입력 수용, 네트워크 연결, 사용자 공간 서비스 준비는 서로 다른 완료 지점입니다.

부트 시간은 보드, firmware 설정, 저장 장치, 커널·드라이버 구성, 측정 시작·종료 지점에 따라 달라집니다. 특정 보드의 수치를 일반화하지 말고, 같은 조건에서 단계별 로그나 계측으로 기준선을 잡아야 합니다.

| 단계 | 확인할 구간 |
|------|-----------|
| BootROM·초기 firmware | reset부터 다음 단계 인계까지 |
| SPL·U-Boot Proper | DDR 초기화, 장치 초기화, 이미지 적재 |
| 커널 | 진입부터 사용자 공간 실행 준비까지 |
| init·서비스 | `init` 실행부터 제품이 정의한 준비 상태까지 |

측정 결과에서 U-Boot Proper가 병목으로 확인되면 초기화 항목을 줄이거나, SPL이 커널을 직접 부트하는 [Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)를 검토할 수 있습니다. 적용 가능성은 보드의 부트 구성과 복구 요구사항에 따라 확인해야 합니다.

## 자주 하는 오해

### "BootROM도 우리가 수정할 수 있다"

수정 불가능합니다. mask ROM입니다. *SoC 출고 후*에는 *어떤 방법으로도* 바뀌지 않습니다. fuse를 통해 *동작 정책*은 바꿀 수 있지만 *코드 자체*는 못 바꿉니다.

### "부트로더는 단일 바이너리다"

요즘 SoC의 부트로더는 *항상 다단*입니다. SPL → U-Boot Proper만 해도 두 단계이고, ARMv8-A는 BL1·BL2·BL31·BL33으로 *네 단계*가 흔합니다.

### "커널이 부트 미디어를 직접 읽을 수 있다"

커널은 *RAM에 적재된 상태*에서 시작합니다. 부트 미디어에서 *자신을 읽어 오는* 능력이 없습니다. 부트로더가 *반드시* 커널을 RAM에 펼쳐 놓아야 합니다.

### "DDR 초기화는 BIOS가 한다"

x86은 BIOS/UEFI가 합니다. 임베디드는 *SPL의 보드 코드*가 직접 합니다. NXP DDR Tool, TI K3 DDR config 같은 vendor 도구가 *training parameter*를 뽑아 주고, 그 값을 *우리가 짠 코드가* DDR controller 레지스터에 씁니다.

## 정리

- 부트로더는 *아무것도 동작하지 않는 CPU*를 *커널이 동작할 수 있는 환경*으로 만드는 다리입니다.
- BootROM은 SoC mask ROM이고 수정 불가능합니다. boot mode strap을 읽어 다음 단계를 SRAM에 적재합니다.
- 부트로더가 책임지는 일은 *DDR 초기화*, *부트 미디어 추상화*, *커널 로딩 ABI 정합*, *환경 변수와 부트 정책*입니다.
- 한 가지 부트 체인 예는 BootROM → SPL → BL31 → U-Boot Proper → Linux → user space입니다. 실제 단계와 각 단계를 제공하는 프로젝트는 SoC·보드 구성에 따라 달라집니다.
- AArch64 Linux 진입 시에는 *x0에 DTB physical address*, *x1~x3에 0*, *MMU off*, *non-secure EL2 또는 EL1* 등 boot protocol 조건을 맞춰야 합니다. instruction cache는 on/off 모두 가능하며 stale entry가 없어야 합니다.
- ARMv7-A, ARMv8-A, RISC-V는 *세부가 다르지만 큰 흐름은 같습니다*. 시리즈는 ARMv8-A를 기준으로 합니다.
- U-Boot와 QEMU를 준비하면 QEMU virt에서 부트 체인을 실험할 수 있습니다. 실제 실행 시간과 결과는 빌드·실행 환경에서 확인해야 합니다.
- 부트 시간 목표는 제품의 준비 상태와 측정 기준으로 정의합니다. 병목이 확인된 경우에만 Falcon Mode 같은 대안을 검토합니다.

## 다음 편

[Ch 2: U-Boot의 위치 — Das U-Boot, TF-A, EDK II](/blog/embedded/bootloader/chapter02-u-boot-position)에서는 임베디드 부트로더 생태계의 *분업표*를 정리합니다. U-Boot이 어디서 일하고, TF-A·EDK II·LinuxBoot가 어떤 자리를 차지하는지 봅니다.

## 관련 항목

- [Ch 2: U-Boot의 위치](/blog/embedded/bootloader/chapter02-u-boot-position)
- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — U-Boot 공식 사이트](https://www.denx.de/wiki/U-Boot)
- [원문 — Linux ARM64 booting requirements](https://www.kernel.org/doc/Documentation/arm64/booting.txt)
- [Arm AArch64 Exception model](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Learn%20the%20Architecture/Exception%20model.pdf)
- [Linux kernel: Booting AArch64 Linux](https://docs.kernel.org/6.18/arch/arm64/booting.html)
- [U-Boot v2024.01: QEMU ARM](https://docs.u-boot.org/en/v2024.01/board/emulation/qemu-arm.html)
