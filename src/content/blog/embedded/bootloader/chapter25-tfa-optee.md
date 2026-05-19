---
title: "Ch 25: ARM TF-A 통합 — BL1·BL2·BL31·BL32·BL33"
date: 2026-05-19T25:00:00
description: "ARMv8 secure boot의 표준 단계화 — Trusted Firmware-A의 BL1·BL2·BL31과 OP-TEE(BL32)·U-Boot(BL33) 위치."
series: "Bootloader Internals"
seriesOrder: 25
tags: [embedded, bootloader, tf-a, atf, op-tee, secure-boot, armv8]
draft: false
---

## 한 줄 요약

> **"ARMv8 secure boot은 *한 개의 부트로더*가 아니라 *다섯 단계의 펌웨어 체인*입니다."** — BL1·BL2·BL31·BL32·BL33이 EL3·EL1·EL2 사이를 오가며 각자 다른 책임을 집니다. U-Boot은 그중 *맨 마지막의 한 단계*일 뿐입니다.

ARMv7 시대에는 *부트로더 = U-Boot* 한 단어로 끝났습니다. ARMv8-A로 넘어오면서 Exception Level이 4단계로 늘었고 secure 영역과 non-secure 영역이 분리되었습니다. 그 결과 부트 체인이 *여러 단계의 펌웨어가 손을 잡고 넘기는* 형태로 바뀌었습니다. 이 표준 체인의 reference 구현이 ARM이 직접 유지하는 *Trusted Firmware-A*, 줄여서 TF-A 또는 ATF입니다.

이 장은 TF-A가 왜 표준이 되었는지, BL1부터 BL33까지의 각 단계가 *어디서 실행되고 무엇을 하는지*, 그리고 OP-TEE와 U-Boot이 어떻게 끼어드는지를 정리합니다.

## 왜 TF-A가 표준이 되었는가

ARMv8-A reference 부트 흐름을 ARM이 직접 정의했기 때문입니다. TF-A는 ARM Holdings가 유지보수하며, ARM Architecture Reference Manual의 EL3 firmware 권장사항을 그대로 구현합니다. spec과 reference 코드가 *같은 출처*에서 나옵니다.

거의 모든 ARMv8 vendor BSP가 TF-A를 채택했습니다. 다음 표가 주요 SoC 사례입니다.

| Vendor | SoC 계열 | 특이사항 |
|---|---|---|
| **NXP** | i.MX 8M·8M Plus·9 | `imx-mkimage`로 BL2 + ROM container 묶음 |
| **Texas Instruments** | K3 (AM62·AM64·J7) | DM firmware가 BL31 자리 일부 담당 |
| **Rockchip** | RK3399·RK3568·RK3588 | `idbloader.img` + `u-boot.itb` |
| **Allwinner** | A64·H6·H616 | mainline TF-A에 platform 포함 |
| **Xilinx (AMD)** | Zynq UltraScale+ | PMU firmware가 BL31 협력 |
| **Marvell** | Armada 70xx·80xx | TF-A의 `marvell` platform |
| **Qualcomm** | Snapdragon (open boards) | XBL이 BL1·BL2 대체 (partial) |

vendor가 자체 secure monitor를 만들지 않고 *TF-A에 platform 코드만 추가*하는 패턴이 자리잡았습니다. PSCI·SDEI·SiP service 같은 런타임 SMC interface가 mainline TF-A에 이미 구현되어 있어 새로 만들 이유가 없습니다. 또한 SystemReady 인증, UEFI 호환, Linux 커널의 EL3 가정 등 생태계 전체가 TF-A를 전제합니다.

## BL 단계 모델 — BL1부터 BL33까지

TF-A는 부트를 다섯 단계로 나눕니다. 각 단계의 머리글자 BL은 *Boot Loader*의 약자입니다.

```text
[POR]
   ▼
[BL1]   ROM 안, immutable
   - root of trust
   - BL2 image 검증·적재
   ▼
[BL2]   SRAM 안, trusted boot firmware
   - DDR init
   - FIP를 풀어 BL31·BL32·BL33을 위치에 배치
   ▼
[BL31]  DDR secure, EL3 secure monitor
   - PSCI handler, SMC dispatcher
   - 평생 살아 있음 (런타임 firmware)
   ▼
[BL32]  DDR secure, S-EL1 (옵션)
   - OP-TEE 등 secure OS
   - TA(Trusted Application) 실행
   ▼
[BL33]  DDR normal, EL2 또는 EL1
   - U-Boot / UEFI(EDK II) / LinuxBoot
   - 커널 적재
```

각 BL의 책임을 한 표로 묶으면 다음과 같습니다.

| 단계 | 위치 | EL | 변경 가능 | 역할 |
|---|---|---|---|---|
| **BL1** | SoC ROM | EL3 | no | reset vector, BL2 적재·검증 |
| **BL2** | SRAM | EL3 또는 S-EL1 | yes | DDR init, FIP 파싱, BL31~BL33 적재 |
| **BL31** | DDR secure | EL3 | yes | PSCI, SMC handler, 런타임 |
| **BL32** | DDR secure | S-EL1 또는 S-EL2 | yes | Secure OS (OP-TEE 등) |
| **BL33** | DDR normal | EL2 또는 EL1 | yes | U-Boot, 커널 적재 |

핵심 관찰은 두 가지입니다. 첫째, *BL31은 부트가 끝나도 살아 있습니다*. 커널이 SMC를 호출하면 BL31이 응답합니다. 둘째, *BL32는 옵션*입니다. OP-TEE를 안 쓰면 BL2가 BL31 다음에 바로 BL33으로 점프하도록 설정합니다.

## 각 BL의 실행 위치 — ROM·SRAM·DDR

물리 메모리 어디에서 각 BL이 실행되는지가 디버깅의 시작입니다. crash 주소가 0xFFFF_XXXX이면 BL1, 0x0091_XXXX이면 SRAM의 BL2처럼 주소로 단계를 짐작할 수 있습니다. i.MX 8M Plus를 예로 들면 다음과 같이 배치됩니다.

```text
0x0000_0000 ──  ROM (mask, BL1)
0x0008_0000 ──
0x0091_0000 ──  OCRAM (BL2)        ~256 KB
0x0094_0000 ──
0x4000_0000 ──  DDR normal (BL33, kernel)
   ...
0xBE00_0000 ──  DDR secure (BL31)  ~64 KB
0xBE10_0000 ──  DDR secure (BL32 OP-TEE) ~32 MB
0xC000_0000 ──
```

BL31·BL32가 차지하는 DDR 영역은 *secure-only*로 마킹됩니다. TrustZone 컨트롤러가 non-secure master의 접근을 차단하므로, Linux 커널이 그 주소를 매핑하려 하면 bus error가 납니다.

DTB의 `/reserved-memory`에 이 영역이 반영되어야 커널이 *그곳을 건드리지 않습니다*. U-Boot이 부팅 직전 DTB를 fixup해 BL31·BL32 carveout을 추가합니다.

```text
reserved-memory {
    optee@be100000 {
        reg = <0x0 0xbe100000 0x0 0x01e00000>;
        no-map;
    };
    atf@be000000 {
        reg = <0x0 0xbe000000 0x0 0x00100000>;
        no-map;
    };
};
```

`no-map`이 *커널이 페이지 테이블에 매핑하지 못하게* 막는 핵심 속성입니다. 이 속성이 빠지면 커널이 secure 영역을 normal mapping으로 잡고 부팅 직후 crash합니다.

## EL3 secure monitor (BL31)

BL31은 다른 모든 BL과 성격이 다릅니다. *부트가 끝나도 사라지지 않습니다*. EL3에서 영원히 살아 있으며, EL1·EL2에서 *SMC 명령*이 올라오면 응답합니다. SMC는 *Secure Monitor Call*의 약자로 ARMv8의 전용 명령어입니다. 커널이 다음과 같이 호출합니다.

```c
/* Linux kernel: PSCI CPU_ON */
#include <linux/arm-smccc.h>

#define PSCI_0_2_FN64_CPU_ON   0xC4000003

static int psci_cpu_on(unsigned long cpuid, unsigned long entry)
{
    struct arm_smccc_res res;

    arm_smccc_smc(PSCI_0_2_FN64_CPU_ON,
                  cpuid, entry, 0,    /* context_id */
                  0, 0, 0, 0,
                  &res);
    return res.a0;                    /* 0 = success */
}
```

`arm_smccc_smc()`가 내부에서 `smc #0` 명령을 실행해 EL1 → EL3 trap을 일으킵니다. BL31의 vector table이 호출을 받고, dispatcher가 function ID(`0xC4000003`)를 보고 적절한 handler로 분기합니다.

```asm
/* SMCCC trampoline (단순화) */
smc_call:
    smc     #0                /* EL3로 trap, BL31이 x0~x7을 채워 반환 */
    ret
```

BL31이 제공하는 주요 서비스는 다음과 같습니다.

| 서비스 | function ID prefix | 용도 |
|---|---|---|
| **PSCI** | 0x84/0xC4 + 0x0000 | CPU power on/off, system reset, suspend |
| **SDEI** | 0xC400_0020 ~ | Software Delegated Exception, RAS |
| **SiP service** | 0x8200/0xC200 ~ | SoC-specific (NXP·Rockchip 자체 정의) |
| **TRNG** | 0x8400_0050 ~ | hardware RNG access |

리눅스의 `cpu_hotplug`, suspend-to-RAM, `reboot` system call이 모두 내부에서 PSCI SMC를 사용합니다. BL31이 죽으면 *커널의 전원 관리가 통째로 무너집니다*.

## OP-TEE — secure OS (BL32)

BL32는 secure world에서 동작하는 작은 OS입니다. de-facto 표준이 *OP-TEE*(Open Portable TEE)이며 Linaro가 유지합니다. OP-TEE 안에서는 *TA(Trusted Application)*가 동작하는데, secure key store, DRM decryptor, fingerprint matcher 같이 normal world에 보이면 안 되는 코드를 담습니다. Normal world의 Linux 애플리케이션은 *TEE Client API*로 TA를 호출합니다.

OP-TEE TA의 Makefile은 다음과 같은 형태입니다.

```makefile
# user_ta.mk — OP-TEE TA build
CFG_TEE_TA_LOG_LEVEL ?= 2
CPPFLAGS += -DSTR_TRACE_USER_TA=\"hello_ta\"

# 고정 UUID — Client API에서 이걸로 TA를 찾음
BINARY = 8aaaf200-2450-11e4-abe2-0002a5d5c51b

include $(TA_DEV_KIT_DIR)/mk/ta_dev_kit.mk

srcs-y += hello_ta.c
TA_SIGN_KEY ?= $(TA_DEV_KIT_DIR)/keys/default_ta.pem
```

빌드된 TA는 서명된 `.ta` 파일로 떨어지고 rootfs의 `/lib/optee_armtz/`에 설치됩니다. Normal world Linux의 `tee-supplicant` daemon이 TA 파일을 OP-TEE에 전달하면, OP-TEE가 서명을 검증한 뒤 메모리에 적재합니다.

OP-TEE의 호출 경로는 다음과 같습니다.

```text
[Normal world]
  user app → libteec → /dev/tee0 → OP-TEE driver
                                         │ smc #0
[Secure monitor]               BL31 dispatcher (routes to BL32)
                                         │
[Secure world]                 OP-TEE OS → TA invocation
```

`smc #0` 한 번에 EL1(NS) → EL3 → S-EL1로 두 번의 EL 전환이 일어납니다. 호출이 끝나면 같은 경로를 거꾸로 돌아옵니다. 한 번 왕복에 수 µs가 들기 때문에 *호출 빈도가 높은 인터페이스*는 OP-TEE를 피하는 게 정답입니다.

## U-Boot — non-secure 진입 (BL33)

BL33은 secure world와 완전히 분리된 normal world의 첫 단계입니다. U-Boot이 가장 흔하지만 UEFI(EDK II), LinuxBoot도 BL33 자리에 올 수 있습니다.

BL2가 BL33으로 점프할 때 *어느 EL에서 시작할지*를 정합니다. TF-A platform config에 다음과 같이 적습니다.

```c
/* plat/<vendor>/<board>/include/platform_def.h */
#define BL33_BASE   UL(0x40200000)

/* BL33 진입 시 EL 결정 — KVM을 원하면 EL2 */
#define BL33_SPSR   SPSR_64(MODE_EL2, MODE_SP_ELX, DISABLE_ALL_EXCEPTIONS)
```

`MODE_EL2`를 적으면 U-Boot이 EL2에서 시작합니다. 커널도 EL2로 진입할 수 있어 KVM 가상화가 가능해집니다. `MODE_EL1`로 두면 EL1에서 시작하고 KVM은 못 씁니다.

U-Boot 쪽도 자신의 EL을 알아야 합니다. `armv8_switch_to_el2()` 같은 헬퍼가 EL 전환을 처리하는데, 일치하지 않으면 U-Boot이 EL2에서 시작했는데 EL1으로 다시 떨어지면서 trap하는 사고가 납니다.

## FIP — Firmware Image Package

여러 BL을 한 파일로 묶어 부트 미디어에 두기 위해 TF-A가 정의한 컨테이너가 *FIP*(Firmware Image Package)입니다. 헤더 + UUID로 식별되는 image들의 연속이라는 단순한 구조입니다.

FIP는 `fiptool` 유틸리티로 만듭니다.

```bash
# fip.bin 생성
fiptool create \
    --tb-fw  bl2.bin \
    --soc-fw bl31.bin \
    --tos-fw bl32.bin \
    --nt-fw  u-boot.bin \
    --hw-config fdt-bl31.dtb \
    fip.bin

# 내용 확인
fiptool info fip.bin
# Firmware Updater NS_BP-BL2:  offset=0x000B0, size=0x0001B5C0, ...
# SoC Firmware BL31:           offset=0x1B670, size=0x0001E000, ...
# Secure Payload BL32:         offset=0x39670, size=0x00200000, ...
# Non-Trusted Firmware BL33:   offset=0x239670, size=0x000A0000, ...
```

각 image는 고유한 UUID로 식별됩니다. BL2가 부팅 시 FIP를 SD/eMMC에서 읽어 헤더를 파싱한 뒤, UUID로 해당 image를 찾아 *지정된 메모리 주소*에 적재합니다. 대표 UUID는 다음과 같이 spec에 박혀 있습니다.

| Image | UUID |
|---|---|
| BL2 | `5ff9ec0b-4d22-3e4d-a544-c39d81c73f0a` |
| BL31 (SoC firmware) | `47d4086d-4cfe-9846-9b95-2950cbbd5a00` |
| BL32 (secure OS) | `05d0e189-53dc-1347-8d2b-500a4b7a3e38` |
| BL33 (non-trusted) | `d6d0eea7-fcea-d54b-9782-9934f234b6e4` |

UUID가 spec 차원에서 고정이기 때문에 다른 vendor의 BL31을 가져다 같은 FIP에 묶어도 fiptool이 인식합니다. 단 ABI(entry point, parameter passing)가 platform별로 다르므로 *그대로 동작하지는 않습니다*.

## 빌드 흐름 — fiptool로 묶기

실제 빌드는 세 개의 독립된 트리에서 진행됩니다. TF-A·OP-TEE·U-Boot 트리가 각각 자기 image를 만든 뒤 fiptool이 한 봉지로 묶습니다. NXP의 `imx-mkimage` 워크플로가 이 패턴의 전형입니다.

```bash
# 1) OP-TEE 빌드 (BL32)
cd optee_os
make PLATFORM=imx PLATFORM_FLAVOR=mx8mpevk \
     CROSS_COMPILE=aarch64-linux-gnu- \
     CFG_ARM64_core=y
# → out/arm-plat-imx/core/tee.bin

# 2) U-Boot 빌드 (BL33)
cd u-boot
make imx8mp_evk_defconfig
make CROSS_COMPILE=aarch64-linux-gnu-
# → u-boot-nodtb.bin, u-boot.dtb

# 3) TF-A 빌드 — BL2·BL31, 그리고 fip 묶기
cd trusted-firmware-a
make PLAT=imx8mp \
     CROSS_COMPILE=aarch64-linux-gnu- \
     SPD=opteed \
     BL32=../optee_os/out/arm-plat-imx/core/tee.bin \
     BL33=../u-boot/u-boot-nodtb.bin \
     bl2 bl31 fip
# → build/imx8mp/release/{bl2,bl31,fip}.bin

# 4) NXP container 묶기 — BootROM이 이해하는 포맷
cd imx-mkimage
make SOC=iMX8MP flash_evk
# → iMX8MP/flash.bin  (BL2 + DDR firmware + FIP)
```

`SPD=opteed`가 *Secure Payload Dispatcher*를 OP-TEE 변종으로 선택합니다. BL31 안의 dispatcher가 OP-TEE 호출을 알아듣게 됩니다. SPD를 빼면 BL32 없이 BL31 → BL33으로 바로 갑니다.

vendor별 FIP 변형도 짚어 둘 만합니다.

| Vendor | 산출물 | 묶음 도구 | 부트 미디어 위치 |
|---|---|---|---|
| **NXP i.MX 8M** | `flash.bin` | `imx-mkimage` | SD 0x42 sector |
| **Rockchip RK3399** | `idbloader.img` + `u-boot.itb` | `mkimage -T rksd` | SD 0x40 sector / 0x4000 |
| **TI K3** | `tiboot3.bin` + `tispl.bin` + `u-boot.img` | `mksysfw.sh` | FAT partition |
| **Allwinner mainline** | `u-boot-sunxi-with-spl.bin` | `mksunxiboot` | SD 0x10 sector |
| **QEMU virt** | `flash.bin` (TF-A FIP 그대로) | fiptool | `-bios` 옵션 |

vendor가 FIP을 *추가로 한 번 더* 자기 컨테이너에 넣는 패턴이 흔합니다. NXP는 ROM container, Rockchip은 idblock 헤더, TI는 ROM image format을 한 겹 더 씌웁니다.

## PSCI — power state 협력

BL31의 PSCI(Power State Coordination Interface)는 멀티 코어 부팅과 절전의 핵심입니다. ARMv8 spec의 일부로 정의되어 Linux 커널이 어느 SoC에서든 *같은 인터페이스*로 CPU를 깨우고 재웁니다.

기본 PSCI 호출은 다음 다섯 개입니다.

| 호출 | function ID | 의미 |
|---|---|---|
| `CPU_ON` | 0xC400_0003 | secondary core 깨우기 |
| `CPU_OFF` | 0x8400_0002 | 자기 자신을 끄기 |
| `SYSTEM_RESET` | 0x8400_0009 | 시스템 reset |
| `SYSTEM_OFF` | 0x8400_0008 | shutdown |
| `CPU_SUSPEND` | 0xC400_0001 | low power state 진입 |

DTB에 PSCI 노드를 정확히 적어야 커널이 사용합니다.

```text
psci {
    compatible = "arm,psci-1.0";
    method = "smc";
    cpu_on = <0xC4000003>;
    cpu_off = <0x84000002>;
    cpu_suspend = <0xC4000001>;
};

cpus {
    cpu@0 { enable-method = "psci"; };
    cpu@1 { enable-method = "psci"; };
};
```

`method = "smc"`가 BL31에 SMC로 trap한다는 의미입니다. 일부 ARMv7 환경에서는 `"hvc"`를 쓰지만, ARMv8 + TF-A 조합은 거의 항상 SMC입니다. PSCI가 없으면 secondary core를 어떻게 깨울지 BSP-specific 코드를 따로 짜야 하는데, mainline 커널은 PSCI 없는 ARMv8 보드를 환영하지 않습니다.

## 흔한 실수

TF-A 통합에서 반복적으로 발생하는 실수를 정리합니다.

### BL31 entry point mismatch

TF-A의 `BL31_BASE`와 BL2가 BL31을 적재하는 주소가 *정확히 같아야* 합니다. 다르면 BL2가 BL31을 점프시키자마자 prefetch abort. 디버깅이 어려운 이유는 UART 출력이 그 어디에도 안 뜨기 때문입니다.

```bash
$ aarch64-linux-gnu-objdump -h build/imx8mp/release/bl31/bl31.elf | head
Idx Name          Size      VMA               LMA               File off
  0 ro            00010000  00000000be000000  ...
```

`VMA`가 0xBE00_0000이면 platform_def의 `BL31_BASE`도 같은 값이어야 합니다.

### OP-TEE shared memory 범위 오류

OP-TEE는 normal world와 공유 메모리로 데이터를 주고받습니다. 그 영역은 non-secure DDR에 있고 DTB의 `/firmware/optee` 노드로 커널에 알립니다. OP-TEE config(`CFG_SHMEM_START`, `CFG_SHMEM_SIZE`)와 DTB의 reserved-memory가 어긋나면 `tee-supplicant`가 실행되자마자 OP-TEE가 panic.

### BL33의 EL을 잘못 설정

BL31의 `BL33_SPSR`을 `MODE_EL1`로 둔 상태에서 U-Boot이 자신은 EL2로 시작한다고 가정하면 즉시 trap. 다음 한 줄로 U-Boot 실행 중 현재 EL을 확인합니다.

```text
=> bdinfo
...
current_el = 2
```

기대값과 다르면 TF-A platform_def을 고치고 다시 빌드.

### `SPD=opteed` 누락

BL32 파일을 fiptool로 묶었어도 SPD가 없으면 BL31의 dispatcher가 BL32를 모릅니다. 부팅은 되지만 OP-TEE 호출이 전부 실패합니다. TF-A 빌드 명령에 `SPD=opteed`가 반드시 포함돼야 합니다.

### Reserved-memory 누락

BL31·BL32의 secure carveout을 DTB에 `no-map`으로 표시하지 않으면 커널이 그 영역을 normal mapping으로 잡고 첫 접근에서 bus fault. 보통 부팅 중간에 죽기 때문에 SPL이나 U-Boot 문제로 오해하기 쉽습니다. crash 주소가 secure 영역과 겹치면 DTB carveout부터 의심합니다.

## 정리

- ARMv8 secure boot은 BL1·BL2·BL31·BL32·BL33의 다섯 단계 펌웨어 체인입니다.
- ARM이 직접 유지하는 TF-A가 사실상 표준이며 NXP·TI·Rockchip·Allwinner·Xilinx 등 거의 모든 vendor BSP가 채택했습니다.
- BL1은 ROM에서, BL2는 SRAM에서, BL31·BL32는 DDR secure 영역에서, BL33은 DDR normal 영역에서 실행됩니다.
- BL31은 부트 후에도 살아 있는 런타임 펌웨어입니다. PSCI·SDEI·SiP service를 SMC로 제공합니다.
- BL32는 OP-TEE 같은 secure OS이며 TA를 실행합니다. Normal world와 SMC를 통해 통신합니다.
- BL33은 U-Boot이 가장 흔하며 BL31이 정한 SPSR에 따라 EL1 또는 EL2에서 시작합니다.
- FIP은 BL2/BL31/BL32/BL33을 UUID로 묶은 컨테이너입니다. `fiptool create`로 만들고 BL2가 부팅 시 풉니다.
- 빌드는 TF-A·OP-TEE·U-Boot 세 트리에서 독립적으로 진행한 뒤 fiptool로 묶고, vendor 컨테이너로 한 번 더 감쌉니다.
- PSCI 없이는 mainline 커널의 멀티 코어·suspend가 동작하지 않습니다. DTB의 `psci` 노드가 필수입니다.
- 흔한 실수는 BL31 entry point mismatch, OP-TEE shared memory 범위, BL33 EL 잘못 설정, SPD 누락, reserved-memory 누락 다섯 가지입니다.

## 다음 편

다음 편은 [Ch 26: DDR training 깊이](/blog/embedded/bootloader/chapter26-ddr-training)입니다. BL2가 DDR을 깨우는 절차의 내부를 들여다보면서 PHY training·ZQ calibration·write/read leveling이 *왜 그렇게 느린지*, vendor DDR Tool이 뽑아 주는 parameter를 *어떻게 코드에 반영하는지*를 정리합니다.

## 관련 항목

- [Ch 19: 커널로의 인계](/blog/embedded/bootloader/chapter19-kernel-handoff) — BL33이 BL31의 도움으로 커널에 진입하는 마지막 단계
- [Ch 23: Secure Boot 체인 — verified boot](/blog/embedded/bootloader/chapter23-secure-boot)
- [Ch 24: HAB·AHAB·HBK — vendor secure boot](/blog/embedded/bootloader/chapter24-hab-ahab)
- [Ch 27: chain of trust — root key부터 rootfs까지](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
- [원문 — Trusted Firmware-A 공식 문서](https://trustedfirmware-a.readthedocs.io/)
- [원문 — OP-TEE 공식 문서](https://optee.readthedocs.io/)
- [원문 — Arm PSCI specification](https://developer.arm.com/documentation/den0022)
