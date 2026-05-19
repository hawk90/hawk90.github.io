---
title: "Ch 1: 부트로더가 푸는 문제"
date: 2026-05-09T01:00:00
description: "ROM부터 init까지의 전체 흐름과, 부트로더가 그 사이에서 채우는 자리."
series: "Bootloader Internals"
seriesOrder: 1
tags: [embedded, bootloader, u-boot, boot]
draft: false
---

## 한 줄 요약

> **"부트로더는 *아무것도 동작하지 않는 CPU*를 *커널이 동작할 수 있는 환경*으로 만드는 다리입니다."** — DDR이 없고, 클럭이 안 잡혀 있고, 페리페럴이 죽어 있고, 파일 시스템이 보이지 않는 상태에서 *그 모든 것을 차례로 깨우는* 일을 합니다.

전원을 인가한 직후의 ARM Cortex-A 코어는 *거의 아무것도* 할 수 없습니다. 32KB의 on-chip SRAM 안에서 *명령 한 줄씩* 실행할 수 있을 뿐, DDR도 없고, MMC controller도 없고, ethernet도 없습니다. 이 상태에서 *수십 MB짜리 커널 이미지*를 어떻게 적재하고, *4GB의 가상 메모리*를 어떻게 매핑하며, *시스템콜이 동작하는 user space*까지 어떻게 도달할까요. 부트로더는 그 *간격*을 채우는 코드입니다.

## 전원이 들어온 직후의 CPU

ARM64 CPU가 reset signal을 받으면 *reset vector*로 점프합니다. ARMv8의 경우 EL3(secure monitor)에서 시작하고, reset vector 주소는 SoC 설계에 따라 고정되어 있습니다.

```text
[전원 인가]
   │
   ▼
[POR — Power-On Reset]
   - PMIC가 voltage rail을 차례로 올림
   - PLL이 lock되기까지 ms 단위 대기
   - CPU reset deassert
   │
   ▼
[Reset Vector @ 고정 주소]
   - i.MX 8M: 0x00910000 (BootROM)
   - Rockchip RK3399: 0xFFFF0000 (BootROM)
   - Raspberry Pi: GPU가 먼저, ARM은 나중
   │
   ▼
[BootROM 실행 — SoC ROM 안의 코드]
   - mask ROM, 변경 불가
   - boot mode pin을 읽음 (SD/eMMC/USB/SPI)
   - 부트 미디어에서 다음 단계 적재
```

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

```text
ARM64 Linux 커널 진입 요구사항:
- x0 = physical address of device tree blob (DTB)
- x1 = 0 (reserved)
- x2 = 0 (reserved)
- x3 = 0 (reserved)
- MMU off, D-cache off, I-cache on (optional)
- EL2 권장 (KVM 사용을 위해)
- 모든 CPU가 secondary boot 진입점에 wait
```

부트로더가 *이 ABI를 정확히 맞춰* 커널로 점프합니다. 한 가지라도 어긋나면 커널은 *첫 줄도 출력하지 못하고* 죽습니다.

### 4. 환경 변수와 부트 정책

"어느 파티션에서 부팅할까", "kernel command line은 무엇인가", "rootfs는 어디 있는가"를 누군가 결정해야 합니다. 부트로더가 *영구 저장소에 저장된 환경 변수*를 읽어 *bootargs를 조립*하고, *A/B 슬롯 중 어느 쪽이 활성인지*를 판단합니다.

## 전체 부트 체인

전원 인가부터 user space의 init까지를 한눈에 보면 다음과 같습니다.

```text
[POR]
   │
   ▼
[BootROM]
   - mask ROM, SoC 고정
   - boot mode 결정
   - 다음 단계를 SRAM에 적재
   │
   ▼
[SPL / BL1+BL2]
   - SRAM 안, 50~100 KB
   - DDR init, clock, pinmux
   - U-Boot Proper를 DDR에 적재
   │
   ▼
[BL31 (TF-A)]  ←  ARMv8-A secure 보드만
   - EL3 secure monitor
   - PSCI(Power State Coord Interface) 제공
   - SMC 핸들러 등록
   - BL33으로 점프
   │
   ▼
[U-Boot Proper / BL33]
   - DDR 위에서 동작
   - 시리얼 console + 명령 인터프리터
   - 환경 변수 처리
   - 커널 이미지 적재 (mmc, tftp, fit)
   - DTB fixup (MAC, memory size)
   - booti / bootm으로 커널 진입
   │
   ▼
[Linux Kernel]
   - 메모리 매핑, 페이지 테이블
   - 드라이버 probe
   - rootfs 마운트
   - init/systemd 실행
   │
   ▼
[User space]
```

각 단계가 *다음 단계를 메모리에 적재*하고 *점프*하는 *수직 인계* 구조입니다. 한 단계가 죽으면 *다음 단계는 시작도 못 합니다*.

## 시리즈에서 다룰 보드

추상적인 설명만으로는 부트로더가 손에 잡히지 않습니다. 시리즈 전체에서 *세 가지 보드*를 예로 듭니다.

| 보드 | SoC | 아키텍처 | 특징 |
|------|-----|---------|------|
| QEMU virt | virt machine | ARMv8-A | 가상, JTAG 없이 실험에 적합 |
| BeagleBone Black | TI AM335x | ARMv7-A | 단순한 부트 흐름, SPL 학습에 좋음 |
| NXP i.MX 8M Plus EVK | i.MX 8M Plus | ARMv8-A | 실제 산업용, TF-A + U-Boot |

`make qemu_arm64_defconfig`로 빌드한 U-Boot은 *QEMU virt*에서 *몇 초 안에* 부팅합니다. 학습 사이클이 짧습니다. 실제 하드웨어로 가기 전에 QEMU에서 *흐름을 익히는* 것을 권합니다.

```bash
# QEMU virt에서 U-Boot 실행
qemu-system-aarch64 -M virt -cpu cortex-a53 -nographic \
    -bios u-boot.bin
```

```text
U-Boot 2024.04 (May 19 2026 - 09:00:00 +0000)

DRAM:  128 MiB
Core:  35 devices, 14 uclasses, devicetree: board
Flash: 64 MiB
Loading Environment from Flash... *** Warning - bad CRC, using default
In:    serial,usbkbd
Out:   serial,vidconsole
Err:   serial,vidconsole
Net:   eth0: virtio-net#32
Hit any key to stop autoboot:  0
=>
```

이 한 줄(`=>`)에 도달하면 시리즈의 *반은 이미 이해한 것*입니다.

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

산업용 시스템은 *부트 시간이 곧 사용자 경험*입니다. 자동차 인포테인먼트는 *2초 안에* 후방 카메라가 떠야 합니다. 산업용 HMI는 *1초 안에* user space가 동작해야 합니다.

전형적인 부트 시간 분포(i.MX 8M Plus, 2GB DDR, eMMC):

```text
0.0 ~ 0.3 s   BootROM + SPL (DDR training이 절반)
0.3 ~ 1.0 s   U-Boot Proper (driver probe + 환경 변수)
1.0 ~ 1.5 s   bootcmd 실행 (커널 적재)
1.5 ~ 3.5 s   Linux kernel (driver probe)
3.5 ~ 5.0 s   systemd / user space
```

U-Boot Proper는 *시간 도둑*입니다. SPL이 *커널을 직접 부트*하는 [Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)가 양산용 옵션입니다.

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
- 전체 부트 체인은 BootROM → SPL → BL31 → U-Boot Proper → Linux → user space의 수직 인계 구조입니다.
- ARM64 커널은 진입 시점에 *x0에 DTB physical address*, *MMU off*, *D-cache off*를 요구합니다. ABI 한 줄이라도 어긋나면 커널이 시작 못 합니다.
- ARMv7-A, ARMv8-A, RISC-V는 *세부가 다르지만 큰 흐름은 같습니다*. 시리즈는 ARMv8-A를 기준으로 합니다.
- QEMU virt에서 `qemu-system-aarch64 -bios u-boot.bin`으로 *몇 초 안에* 학습 사이클을 돌릴 수 있습니다.
- 부트 시간은 *산업용에서 곧 사용자 경험*입니다. U-Boot Proper를 건너뛰는 Falcon Mode가 양산 옵션입니다.

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
