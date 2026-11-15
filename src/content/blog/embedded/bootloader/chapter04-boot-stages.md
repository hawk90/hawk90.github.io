---
title: "Arm 임베디드 부트 단계 — TF-A BL1·BL2·BL31·BL33과 U-Boot SPL/TPL"
slug: "embedded/bootloader/chapter04-boot-stages"
date: 2026-05-09T09:04:00
description: "TF-A의 대표 AArch64 단계와 U-Boot SPL/TPL 모델을 소개하고, Linux 진입 인자와 보드별 단계 차이를 설명합니다."
series: "Bootloader Internals"
seriesOrder: 4
tags: [embedded, bootloader, u-boot, tf-a, spl]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **부트 흐름은 여러 firmware stage가 초기화와 이미지 인계를 나눌 수 있습니다.** 각 단계의 검증·수명·인계 방식은 platform configuration에 달려 있습니다.

부트로더가 항상 단일 binary인 것은 아닙니다. Arm Trusted Firmware-A(TF-A)의 대표적인 AArch64 부트 흐름은 BootROM → BL1 → BL2 → BL31 → BL33으로 설명할 수 있습니다. 실제 단계와 BL1의 존재 여부는 SoC와 플랫폼 설계에 따라 달라집니다. 각 단계가 *왜 따로 있어야* 하는지, *어떤 권한 수준*에서 동작하는지, *메모리는 어디*에서 동작하는지를 정리합니다.

## 왜 한 binary로 못 하나

가장 단순한 질문에서 시작합니다. "BootROM이 *바로 커널을 적재*하면 안 되나?"

이유와 단계 수는 SoC의 ROM 기능, 보안 모델, 초기화 요구에 따라 달라집니다.

### 1. BootROM은 너무 작다

Mask ROM의 기능과 용량은 SoC마다 다릅니다. ROM은 고정 기능을 수행하고, 이후 단계에서 추가 이미지 적재와 초기화를 이어가는 설계가 흔합니다.

### 2. BootROM은 *수정 불가*다

Mask ROM은 출고 뒤 변경할 수 없는 코드이므로, 제품의 후속 boot flow에서 업데이트 가능한 firmware를 둘 수 있습니다.

### 3. 권한 수준이 다르다

TF-A의 한 구성에서는 BL1·BL31이 EL3, BL2가 보통 Secure EL1에서 실행되고 BL33은 비보안 상태에서 가장 높은 구현 EL로 진입합니다. 이는 모든 Armv8-A 부트 체인의 고정 배치가 아닙니다.

이러한 요구를 만족하기 위해 여러 boot stage를 사용하는 구현이 많습니다.

## TF-A의 대표 AArch64 단계

TF-A v2.10의 Firmware Design 문서에서 설명하는 대표 이미지 역할은 다음과 같습니다. 플랫폼에 따라 BL1·BL2의 배치와 optional payload가 달라질 수 있습니다.

![ARMv8-A 부트 단계 — BL1 → BL2 → BL31 → BL33 → Linux와 EL 권한](/images/blog/bootloader/diagrams/chapter04-armv8-boot-stages.svg)

이미지 명칭은 TF-A firmware design의 역할을 가리킵니다. 실제 패키징, 프로젝트 경계와 결합 방식은 SoC·제품 통합에 따라 다릅니다.

| 단계 | TF-A에서의 대표 역할 | 적용 범위 |
|------|------------------|------------|
| BL1 | TF-A 첫 부트 단계 (플랫폼 선택에 따름) | 크기는 플랫폼과 빌드 설정에 따라 다름 |
| BL2 | TF-A의 로딩 단계(구성에 따라 생략·대체 가능) | 크기는 플랫폼과 빌드 설정에 따라 다름 |
| BL31 | TF-A의 EL3 runtime firmware | 크기는 플랫폼과 빌드 설정에 따라 다름 |
| BL32 | 선택적 Secure-EL1 payload (예: OP-TEE) | 구성에 따라 달라짐 |
| BL33 | Non-secure payload (예: U-Boot) | 구성에 따라 달라짐 |

## U-Boot의 SPL/TPL 모델

U-Boot은 *자체 다단 모델*인 SPL/TPL을 가집니다. TF-A를 안 쓰는 ARMv7-A에서는 *이 모델 단독*으로 동작합니다.

![U-Boot SPL/TPL 모델 — BootROM → TPL(작은 SRAM, 옵션) → SPL(DDR init + U-Boot Proper 적재) → U-Boot Proper(DDR) → Linux Kernel](/images/blog/bootloader/diagrams/ch04-uboot-spl-tpl.svg)

일부 보드는 TPL을 선택해 더 작은 초기 코드 단계 뒤에 SPL을 적재합니다. TPL 사용 여부와 SRAM 제약은 SoC/board configuration을 확인해야 합니다.

TPL의 필요성은 보드의 ROM 요구, 메모리 제약과 U-Boot configuration에 따라 다릅니다.

## SPL과 BL2의 역할 관계

일부 보드에서 U-Boot SPL은 TF-A BL2가 맡는 초기 적재 역할의 일부를 수행하거나, TF-A와 연동합니다. 두 단계가 항상 서로 대체되는 것은 아니며 DDR 초기화와 이미지 인계 책임은 보드 구현을 확인해야 합니다.

| 모델 | 흐름 | DDR init 담당 |
|------|------|---------------|
| 예시 A | BootROM → SPL → BL31/BL33 등 | 보드의 SPL 구현 |
| 예시 B (TF-A) | BootROM → BL1 → BL2 → BL31 → BL33 등 | TF-A 및 플랫폼 설정 |

위의 행은 역할을 설명하는 개념 예시이며 특정 SoC에 적용된다고 판정하지 않습니다. 해당 제품의 ROM 요구, board configuration, TF-A/U-Boot 통합 소스로 확인해야 합니다.

## 권한 수준(Exception Level)의 변화

ARMv8-A는 *네 개의 권한 수준*을 가집니다.

```text
EL3 — secure monitor (가장 높음)
EL2 — hypervisor
EL1 — kernel
EL0 — user space (가장 낮음)
```

추가로 *secure / non-secure* 구분이 EL0/EL1/EL2에 *직교*로 존재합니다.

![TrustZone EL3 splits secure and non-secure worlds](/images/blog/bootloader/diagrams/ch04-trustzone-el-split.svg)

아래는 TF-A v2.10 문서에서 설명하는 대표 실행 상태입니다. 플랫폼은 다른 허용된 entry level과 payload를 사용할 수 있습니다.

| 단계 | EL | World |
|------|-----|-------|
| BL1 (TF-A 예시) | EL3 | Secure |
| BL2 (TF-A 기본 흐름) | S-EL1; 특수 RESET_TO_BL2 구성은 EL3 | Secure |
| BL31 (TF-A 예시) | EL3 | Secure runtime |
| BL32 (OP-TEE) | EL1-S | Secure |
| BL33 (U-Boot 예시) | Non-secure에서 구현 가능한 상위 EL | Non-secure |
| Linux Kernel | 보통 EL2 또는 EL1에서 진입 | Non-secure |

TF-A BL31은 선택된 non-secure payload의 entry point와 실행 상태로 전환합니다. 최종 예외 수준은 플랫폼이 설정한 BL33 entry point에 따릅니다.

## 각 단계의 메모리 모델

부트 단계별 주소와 실행 상태는 board-specific configuration으로 확인해야 합니다.

단계별 실행 주소, 메모리 속성, 다음 이미지의 load address는 SoC와 firmware platform 설정에서 정합니다. TF-A의 일반 역할만으로 secure SRAM/DDR 주소나 MMU/cache 상태를 확정할 수 없습니다. 실제 board의 memory map, TF-A platform port, U-Boot linker/configuration 및 image description을 함께 확인하세요. 확인되지 않은 i.MX 주소 예시는 제거했습니다.

## SPL의 적재 흐름

U-Boot SPL은 선택된 boot device/image loader를 통해 다음 이미지를 준비하고, 구성에 맞춰 U-Boot proper 또는 다른 firmware로 인계할 수 있습니다. 정확한 C 함수와 호출 순서는 고정된 U-Boot tag, board port, Kconfig에 따라 달라집니다. 이 문서는 이를 실행한 것으로 주장하지 않습니다.


## FIT image — 한 파일에 모두

일부 boot flow는 FIT image를 사용해 여러 firmware payload와 DTB를 패키징할 수 있습니다. FIT image는 [Ch 15](/blog/embedded/bootloader/chapter15-fit-image)에서 다룹니다.

```text
# FIT payload 관계를 보여주는 개념 예시; 보드별 구성·실행 출력이 아님
u-boot.itb (FIT image)
├── images
│   ├── atf-1     ← BL31
│   ├── uboot     ← BL33 (U-Boot Proper)
│   └── fdt-1     ← DTB
└── configurations
    └── conf-1 (default)
        - firmware: atf-1
        - loadables: uboot
        - fdt: fdt-1
```

이미지 선택과 적재는 FIT configuration 및 SPL 지원에 달려 있습니다.

ITS가 지정하는 payload, configuration과 load/entry 정보는 target boot flow와 함께 검토해야 합니다. 실행하지 않은 build output은 이 글에서 제시하지 않습니다.

## RISC-V의 다단 부트

RISC-V 플랫폼의 firmware chain은 SoC·board 설정에 따라 다르며, OpenSBI와 U-Boot의 조합은 그중 하나입니다. 단계별 실행 특권과 entry convention은 보드 지원 자료 및 OpenSBI 플랫폼 설정에서 확인해야 합니다.

<!-- TODO: TikZ (RISC-V 다단 부트 flow) -->

| 단계 | 모드 | 역할 |
|------|------|------|
| BootROM | M-mode | 최초 진입 |
| U-Boot SPL | M-mode | DDR init, OpenSBI 적재 |
| OpenSBI | M-mode firmware | SBI firmware 서비스와 next-stage handoff (플랫폼별) |
| U-Boot Proper | S-mode | 부트 정책 |
| Linux Kernel | S-mode | 커널 실행 |

RISC-V privilege modes와 Arm exception levels는 서로 다른 architecture 개념입니다. SBI와 SMC는 각 ISA의 firmware interface이며 직접 대응하는 같은 ABI가 아닙니다.

## 단계 간 인계 — 어떻게 정보를 넘기나

각 단계 사이에 *주소, DTB, 부트 인자*를 넘겨야 합니다. 각 단계의 인자 규약은 해당 firmware와 플랫폼의 문서를 따라야 합니다. Linux AArch64 진입 규약은 아래에서 별도로 다룹니다.

```text
TF-A BL2 → BL31 (개념): 실행 이미지 목록과 플랫폼별 인계 데이터
BL31 → BL33: 플랫폼별 entry point와 실행 상태
Linux AArch64 진입: x0 = DTB physical address, x1–x3 = 0
Linux 진입 시 MMU = off; I-cache 상태, cache maintenance와 나머지 CPU 조건은 Linux boot protocol을 따름
```

x0에 DTB를 전달하는 규약은 Linux AArch64 커널 진입 시점의 규약입니다. 앞선 firmware 단계 간 인자와 혼동하면 안 됩니다.

## 부트 로그로 보는 단계

부트 로그는 SoC, 빌드 옵션, 보드 지원 코드에 따라 달라집니다. 아래의 접두어는 흔히 보이는 식별 단서일 뿐, 정확한 출력 순서나 문구를 보장하지 않습니다. 실제 장치의 UART 로그와 사용 중인 이미지 빌드를 함께 기록해 단계 진행을 확인하세요.

- `U-Boot SPL` 또는 `SPL`: 해당 빌드에서 SPL 코드가 출력한 메시지
- `NOTICE: BL31`: TF-A BL31이 출력한 메시지일 수 있음
- `U-Boot ...`: U-Boot proper의 배너일 수 있음

로그 일부만으로 이미지 load address, 전달된 인자, 실패 원인을 단정할 수 없습니다.

## 자주 하는 실수

### *어느 단계가* 부팅하는지 헷갈림

"U-Boot이 부팅 안 된다"고 할 때 *SPL인지, U-Boot Proper인지, BL31인지* 분리해서 봐야 합니다. 시리얼에 *어디까지 출력*됐는지로 판단합니다.

### ### firmware image address가 맞지 않음

이미지 설명의 load/entry address나 플랫폼 메모리 보호 설정이 실제 메모리 맵과 맞지 않으면 이미지 적재·실행이 실패할 수 있습니다. 주소를 추정하지 말고 해당 보드의 ITS, TF-A 플랫폼 설정과 메모리 맵을 함께 확인하세요.

### `CONFIG_SPL_TEXT_BASE`와 *실제 SRAM 주소* 불일치

SPL의 링크·실행 주소와 BootROM이 이미지를 적재하는 주소 관계는 SoC와 부트 매체 구현에 따라 다릅니다. 해당 보드의 Kconfig, linker script, ROM 문서를 확인하세요.

### Linux AArch64에 잘못된 DTB 주소를 전달

Linux AArch64 진입 시 x0는 DTB의 물리 주소이며 MMU와 D-cache는 꺼져 있어야 합니다. I-cache 상태와 기타 CPU 조건은 커널 boot protocol을 따릅니다. 실제 handoff를 준비하는 구성요소는 플랫폼별 흐름에서 확인하세요.

### SPL의 *console init 누락*

SPL이 `preloader_console_init()`을 호출하기 전에 *어딘가에서 hang*하면 *시리얼에 아무것도 안 나옵니다*. 보드 코드 첫 줄에 *DEBUG_UART로 'A'를 강제 송출*해 path를 검증합니다.

## 정리

- 부트는 *작은 단계가 큰 다음 단계를 RAM에 적재*하는 *수직 인계*의 연쇄입니다.
- TF-A의 대표적인 AArch64 구성은 BootROM → BL1 → BL2 → BL31 → BL33이며 플랫폼에 따라 단계와 payload가 다릅니다.
- TF-A와 U-Boot은 각각 firmware 구성요소를 제공하지만, 단계별 이미지·빌드 결합 방식은 보드 설정에 따라 다릅니다.
- TF-A BL1/BL31의 EL3, 기본 BL2의 S-EL1, BL33과 Linux의 실행 상태는 대표 배치일 뿐이며 플랫폼 설정이 결정합니다.
- BL31은 *runtime firmware*입니다. 부팅 후에도 *메모리에 살아 있고* PSCI/SMC 호출에 응답합니다.
- Linux AArch64 진입 시 x0는 DTB 물리 주소이고 x1–x3는 0입니다. 앞선 단계의 인계 ABI는 별도로 확인합니다.
- FIT은 구성에 따라 여러 이미지와 설정을 한 이미지 형식으로 패키징할 수 있습니다. SPL의 지원·적재 동작은 빌드 설정과 보드 구현에 달려 있습니다.
- 부트 로그의 *prefix*(`U-Boot SPL`, `NOTICE: BL31`, `U-Boot`)로 *어느 단계가 출력 중*인지 식별합니다.

## 다음 편

[Ch 5: Falcon Mode — SPL이 커널을 직접 부팅](/blog/embedded/bootloader/chapter05-falcon-mode)에서는 *U-Boot Proper를 건너뛰는* 양산 옵션을 다룹니다. SPL이 kernel을 직접 시작하는 구성과 보드별 Falcon 설정을 봅니다.

## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)
- [Ch 2: U-Boot의 위치](/blog/embedded/bootloader/chapter02-u-boot-position)
- [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)
- [Ch 8: board_init_f vs board_init_r](/blog/embedded/bootloader/chapter08-board-init)
- [Ch 15: FIT Image](/blog/embedded/bootloader/chapter15-fit-image)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [BSP Ch 7: TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [TF-A v2.10 Firmware Design](https://trustedfirmware-a.readthedocs.io/en/v2.10/design/firmware-design.html)
- [Linux AArch64 boot protocol](https://docs.kernel.org/6.18/arch/arm64/booting.html)
- [OpenSBI firmware types](https://github.com/riscv-software-src/opensbi/blob/master/docs/firmware/fw.md)
