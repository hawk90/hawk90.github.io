---
title: "ARM TrustZone 분석 — Cortex-A·Cortex-M 격리 메커니즘"
slug: "embedded/embedded-security/chapter04-trustzone"
date: 2026-05-21T09:04:00
description: "ARM TrustZone — Secure / Non-Secure World 분리. SMC, NSC."
tags: [TrustZone, ARM, secure-world]
series: "Embedded Security"
seriesOrder: 4
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"TrustZone은 한 칩 안에 두 개의 *실행 세계*를 만듭니다."** — Secure World가 자기만의 메모리·peripheral·exception을 갖고, Non-Secure World는 게이트를 통해서만 들어올 수 있습니다. 같은 CPU에서 시간 분할로 두 세계를 오가는, *하드웨어 강제* 분리입니다.

## 왜 분리가 필요한가

Ch 3에서 키와 알고리즘을 다뤘습니다. 그런데 키를 *어디에 두고, 누가 만질 수 있는가*는 더 깊은 질문입니다. 일반 application과 같은 메모리 공간에 키가 있으면, application의 어떤 버그(stack overflow, use-after-free, format string)도 키를 노출시킬 수 있습니다.

전통적인 답은 *별도의 보안 칩* (Secure Element, TPM, smart card)을 추가하는 것이었습니다. 한 칩으로 통합하려는 노력이 ARM TrustZone입니다. CPU·메모리·버스·peripheral 전체에 *Secure / Non-Secure* 라벨을 도입해, 한 칩 안에서 두 세계를 분리합니다.

Cortex-A와 Cortex-M의 TrustZone은 *기본 아이디어는 같고 구현은 다릅니다*. Linux·OP-TEE와 RTOS·TF-M은 대표적인 구성 예입니다. TrustZone 자체가 특정 OS나 하나의 binary 형식을 요구하는 것은 아닙니다.

## TrustZone의 핵심 — NS bit

Cortex-A TrustZone에서 CPU의 보안 상태는 bus transaction마다 붙는 NS 속성으로 interconnect에 전달됩니다. 메모리·peripheral 앞의 보안 컨트롤러(TZASC·TZPC 등)가 이 속성을 자기 region 설정과 비교해 접근을 통과시키거나 막습니다. 건물 출입증의 색깔을 층마다 경비가 확인하는 구조와 비슷합니다.

| CPU 상태 | 버스 NS bit | 메모리 controller 동작 |
|----------|-------------|----------------------|
| Secure | 보안 상태의 access attribute | 보안 컨트롤러와 region policy에 따라 허용·차단 여부 결정 |
| Non-Secure | non-secure access attribute | secure로 분류된 자원에 대한 접근은 SoC 정책에 따라 차단 또는 오류 처리 |

이 속성과 컨트롤러 설정이 *공간적 분리*를 만듭니다. 막힌 접근이 bus error가 되는지, 0을 읽는지는 컨트롤러의 설정과 TRM이 정합니다.

## Cortex-A TrustZone — Exception Level 모델

이 절은 RME를 제외한 AArch64 Secure·Non-secure 구성을 설명합니다. EL과 security state의 모든 조합이 항상 존재하지는 않으며 Secure EL2도 FEAT_SEL2 지원에 달려 있습니다.

![EL × Secure/Non-secure matrix](/images/blog/embedded-security/diagrams/ch04-trustzone-el-matrix.svg)

그림의 EL3 box는 공통 monitor 역할을 나타내며 Non-secure EL3가 따로 있다는 뜻이 아닙니다. EL3 monitor는 world 전환을 관리합니다. EL2는 hypervisor 레벨이고, EL1은 OS 커널, EL0는 사용자 application입니다.

세계 사이를 오가는 명령은 SMC(Secure Monitor Call)입니다.

SMC의 Function ID는 [SMCCC(DEN0028)](https://developer.arm.com/documentation/den0028/latest)가 bit 단위로 정합니다. TF-A v2.15.0 [`include/lib/smccc.h`](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/include/lib/smccc.h#L28-L111)를 보면 bit 31은 fast(1)/yielding(0), bit 30은 SMC64(1)/SMC32(0), bit 29:24는 owner(OEN)입니다. OEN은 0 Arm Architecture, 1 CPU, 2 SiP, 3 OEM, 4 Standard, 5 Standard Hypervisor, 6 Vendor Hypervisor, 7 Vendor EL3, 48~49 Trusted Application, 50~63 Trusted OS로 나뉩니다. 실제 ID 예는 PSCI입니다. [`psci.h`](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/include/lib/psci/psci.h#L43-L57)에서 `PSCI_VERSION`은 `0x84000000`(fast, SMC32, OEN 4), `PSCI_CPU_ON_AARCH64`는 `0xC4000003`, `PSCI_SYSTEM_RESET`은 `0x84000009`입니다.


SMC를 실행하면 CPU가 EL3로 트랩하고, ARM Trusted Firmware의 BL31이 인자(`x0~x7`)를 보고 *어느 secure service로 라우팅할지* 결정합니다. PSCI(전원 관리), OP-TEE call, 또는 vendor 특화 service 중 하나로 갑니다.

## NS bit이 controlling하는 자원들

ARMv8-A에서 NS bit으로 분리되는 자원은 다음과 같습니다.

| 자원 | 분리 메커니즘 | 메모 |
|---|---|---|
| RAM 영역 | TZASC (TrustZone Address Space Controller) | DDR 영역을 secure/non-secure로 나눔 |
| SRAM 영역 | TZMA (TrustZone Memory Adapter) | 작은 secure SRAM 분리 |
| Peripheral | TZPC (TrustZone Protection Controller) | UART, GPIO 등을 secure로 락 |
| Cache lines | NS bit이 cache tag에 포함 | secure/non-secure cache miss 분리 |
| Interrupt | GIC와 보안 설정 | GICv3에서는 Secure Group 0·Secure Group 1·Non-secure Group 1을 구분 |
| MMU translation | EL·security state의 translation context 관리 | 가상 register 이름을 만들지 않고 실제 register·context save/restore 규칙 확인 |

이 컨트롤러는 누가 언제 설정할까요? TF-A v2.15.0의 Arm 참조 플랫폼에서는 `plat_arm_security_setup()`(TZC-400이면 `arm_tzc400_setup()`)이 설정합니다. `plat/arm/common`에서 호출하는 곳은 여섯 곳입니다. AArch64 부팅 경로의 대표 위치는 BL2(RME가 없으면 [`arm_bl2_platform_setup()`](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/plat/arm/common/arm_bl2_setup.c#L256-L261), 있으면 `arm_bl2_plat_arch_setup()`), `RESET_TO_BL31` 빌드면 [BL31 setup](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/plat/arm/common/arm_bl31_setup.c#L388-L394), 나머지는 BL2U·AArch32 `RESET_TO_SP_MIN` 경로와, system power domain이 깨어날 때의 [`arm_system_pwr_domain_resume()`](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/plat/arm/common/arm_pm.c#L172-L183)입니다. 마지막 호출이 있다는 것은 전원이 꺼졌다 켜지면 컨트롤러 설정이 사라져 다시 써야 한다는 뜻입니다. 아래 TrustZone-M 절의 STM32L5 GTZC처럼 lock bit를 따로 두는 컨트롤러도 있습니다.

## ARM Trusted Firmware — EL3 코드의 표준

TF-A를 쓰는 플랫폼에서 EL3에 상주하는 코드는 BL31입니다. 오픈 소스이고 SoC 벤더가 platform port를 제공합니다. v2.15.0 source tree 기준으로 책임은 다음과 같습니다.

BL31 (Runtime EL3 firmware)의 역할:

1. SMC 처리 — OEN별 runtime service로 디스패치
2. PSCI 구현(`lib/psci/`) — CPU on/off, suspend/resume, system reset
3. Secure payload dispatcher(`services/spd/opteed` 등)와 SPMD(`services/std_svc/spmd`) — OP-TEE 같은 secure payload와 통신
4. Interrupt routing — secure IRQ를 secure world로
5. SDEI(`services/std_svc/sdei`) 디스패치

아래는 fast call에서 OEN 0~4의 ID 범위입니다. 위 bit 정의로 계산한 값이며 [Linux v6.12 arm-smccc.h](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/linux/arm-smccc.h)와도 대조했습니다.

| SMC ID 범위 | 서비스 |
|-------------|--------|
| `0x80000000–0x8000FFFF` (SMC32) / `0xC0000000–0xC000FFFF` (SMC64) | Arm Architecture calls |
| `0x81000000–0x8100FFFF` / `0xC1000000–0xC100FFFF` | CPU Service calls |
| `0x82000000–0x8200FFFF` / `0xC2000000–0xC200FFFF` | SiP Service calls |
| `0x83000000–0x8300FFFF` / `0xC3000000–0xC300FFFF` | OEM Service calls |
| `0x84000000–0x8400FFFF` / `0xC4000000–0xC400FFFF` | Standard Service calls |

OP-TEE는 OEN 50~63(Trusted OS) 범위를 쓰며, Linux에서는 `drivers/tee/optee`가 이 ABI를 구현합니다. Normal world 코드는 function ID를 직접 만들지 않고 이 driver와 `libteec`를 거칩니다.

OP-TEE call이 들어오면 BL31은 *world switch*를 수행합니다. 해당 ABI와 monitor가 정한 context를 저장·복원해 secure payload로 전환합니다. OP-TEE OS가 받아 적절한 Trusted Application으로 dispatch합니다. 이 흐름은 Ch 5에서 자세히 봅니다.

## Cortex-M TrustZone-M — MCU의 분리

Cortex-A의 TrustZone은 *OS-level 분리*입니다. Linux와 OP-TEE가 동시에 동작합니다. Cortex-M은 Secure image와 Non-secure image를 따로 빌드해 한 flash에 올립니다. Armv8-M 기반의 M23, M33, M55, M85가 Security Extension을 선택 사양으로 갖습니다.

핵심 차이는 별도 exception level 대신 Secure/Non-Secure 상태와 메모리 attribution을 사용한다는 점입니다. SAU·IDAU와 SoC 보안 설정이 주소의 속성을 정하고, Non-Secure에서 Secure로 들어가는 전환은 NSC/SG gateway와 상태 전환 규칙을 따릅니다. 단순히 fetch 주소가 바뀌었다고 상태가 전환되는 것은 아닙니다.

![Secure·Non-secure flash와 SRAM을 나눈 개념적 partition 예시](/images/blog/embedded-security/diagrams/ch04-stm32l552-memory-map.svg)

위 그림은 partition 역할의 개념도이며 STM32L552의 실제 주소 범위나 기본 memory map이 아닙니다. STM32L5의 Secure·Non-secure alias와 option byte는 [ST AN5347](https://www.st.com/content/st_com/en/technical-documents/an5347-introduction-to-arm-trustzone-features-on-stm32l5-stm32u5-and-stm32u3-mcus-stmicroelectronics_asset/chunk-003-topic-an5347-rdp.html)이 다룹니다. 주소의 최종 보안 속성은 아래 SAU 절처럼 SAU와 IDAU가 함께 정합니다.

## SAU / IDAU 설정

SAU는 Secure 코드가 설정하는 security attribution 표입니다. [Cortex-M33 TRM](https://developer.arm.com/documentation/100230/latest)(100230 Issue 08)에 따르면 Cortex-M33의 SAU region 수는 칩을 만들 때 0·4·8 중에서 고르고, 실행 중에는 `SAU_TYPE[7:0]`로 읽습니다(§4.2). Reset 직후에는 `SAU_CTRL.EN`과 `SAU_CTRL.ALLNS`가 모두 0이라 PPB의 일부를 뺀 모든 메모리가 Secure입니다. 이 상태에서는 IDAU도 어떤 영역을 NSC·NS로 낮출 수 없습니다. 그래서 Secure 부트 코드가 SAU region을 프로그램하고 `EN`을 켜기 전에는 Non-secure image가 실행될 수 없습니다.

주소 범위는 보드마다 다릅니다. STM32L552/L562라면 flash/RAM 분할, option byte, TF-M platform port의 partition 설정이 SAU 값과 맞아야 합니다.

NSC(Non-Secure Callable)는 *non-secure에서 secure로 점프할 수 있는 유일한 게이트*입니다. NSC 영역에는 *SG(Secure Gateway) 명령*이 들어 있어야 하고, non-secure 코드가 SG가 아닌 곳으로 점프하면 SecureFault가 발생합니다.

[Arm CMSE 도구 요구사항](https://arm-software.github.io/acle/cmse/cmse.html)은 진입 함수와 반대 방향 호출을 구분합니다. 아래는 uint32 값만 전달하는 compiler 검사 예입니다. 암호 서비스·포인터 검증·linker의 NSC 배치를 구현한 예가 아닙니다.

```c title="cmse-directions.c"
#include <stdint.h>
#include <arm_cmse.h>

__attribute__((cmse_nonsecure_entry))
uint32_t secure_increment(uint32_t value)
{
    return value + 1u;
}

typedef uint32_t (*ns_callback)(uint32_t)
    __attribute__((cmse_nonsecure_call));

uint32_t secure_call_ns(ns_callback callback, uint32_t value)
{
    return callback(value);
}
```

Non-secure caller는 생성된 import library·header를 통해 gateway 함수를 일반 C 함수처럼 호출합니다. `cmse_nonsecure_call`은 Secure에서 Non-secure callback을 부르는 반대 방향이며 `BLXNS`를 사용합니다. Non-secure → Secure는 NSC의 `SG`로 진입하고 Secure entry의 복귀는 `BXNS`로 이루어집니다. `FNC_RETURN`과 exception을 통한 전이도 있으므로 모든 전이를 단순 함수 호출 하나로 묶지는 않습니다.

실제 toolchain이 무엇을 만드는지 Debian 13의 `arm-none-eabi-gcc` 14.2.1로 확인했습니다. NSC 영역을 `0x0C03E000`에 두는 linker script로 link하고 import library를 함께 만들었습니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m33 -mthumb -mcmse -O2 -c cmse-directions.c -o s.o
arm-none-eabi-gcc -mcpu=cortex-m33 -mthumb -mcmse -nostartfiles -Wl,-T,s.ld \
  -Wl,--section-start=.gnu.sgstubs=0x0C03E000 \
  -Wl,--cmse-implib -Wl,--out-implib=secure_cmse.o -Wl,-e,secure_increment \
  s.o -lgcc -o secure.elf
```

```text
00000000 <secure_increment>:
   0:	4671      	mov	r1, lr
   2:	4672      	mov	r2, lr
   4:	4673      	mov	r3, lr
   6:	3001      	adds	r0, #1
   8:	46f4      	mov	ip, lr
   a:	f38e 8c00 	msr	CPSR_fs, lr
   e:	4774      	bxns	lr

Disassembly of section .gnu.sgstubs:
0c03e000 <secure_increment>:
 c03e000:	e97f e97f 	sg
 c03e004:	f7c1 bffc 	b.w	c000000 <__acle_se_secure_increment>

$ arm-none-eabi-nm secure_cmse.o
0c03e000 A secure_increment
```

세 가지가 보입니다. 첫째, compiler는 entry 함수에 `__acle_se_secure_increment`라는 두 번째 symbol을 붙이고, 반환 직전에 r1~r3·ip와 flag를 `lr` 값으로 덮어 Secure 쪽 값이 register에 남지 않게 한 뒤 `bxns`로 돌아갑니다. 둘째, NSC 영역의 `sg` 명령은 compiler가 아니라 linker가 `.gnu.sgstubs`에 veneer로 만들어 넣습니다. 셋째, import library `secure_cmse.o`에는 `secure_increment`가 veneer 주소 `0x0c03e000`의 절대 symbol로만 들어 있어, Non-secure image는 이 파일을 link해 veneer를 일반 함수처럼 부릅니다.

Callback 쪽 `secure_call_ns()`는 GCC에서 libgcc의 `__gnu_cmse_nonsecure_call`을 부릅니다. 이 helper는 callee-saved register를 target 주소 값으로 덮고 `vlstm`으로 FP 상태를 저장한 뒤 `blxns r4`로 넘어갑니다. Target 주소의 bit 0은 GCC가 `lsrs r4, r4, #1; lsls r4, r4, #1`로, Debian clang 19.1.7은 helper 없이 inline으로 만든 코드의 `bic r2, r2, #1`로 지웁니다. bit 0이 0이어야 `blxns`가 Non-secure 상태로 넘어갑니다. 이 시험은 link까지이며, 보드에서 SecureFault나 context 유출을 시험하지는 않았습니다.

## TrustZone-M 의 자원 분리

SAU는 CPU가 내는 접근만 봅니다. DMA 같은 다른 bus master의 접근은 SoC의 보안 컨트롤러가 막아야 합니다. STM32L5에서는 그 컨트롤러가 GTZC입니다. [stm32l5xx-hal-driver v1.0.7 `stm32l5xx_hal_gtzc.h`](https://github.com/STMicroelectronics/stm32l5xx-hal-driver/blob/8a45ae313e26ff92273fbaee75275b191c3bb81e/Inc/stm32l5xx_hal_gtzc.h#L315-L325)를 보면 SRAM용 MPCBB는 256 B block 단위로 Secure/Non-secure를 정하고, 32 block(8 KB)인 super-block 단위로 lock합니다. Peripheral용 TZSC는 `CR.LCK` bit 하나로 잠그며, HAL의 `HAL_GTZC_TZSC_Lock()`은 `__ARM_FEATURE_CMSE == 3`일 때, 즉 Secure image에서만 compile됩니다.

| 경계 | 필요한 확인 |
|------|------|
| NSC 진입 | linker veneer와 region attribution, 허용된 entry |
| 공유 buffer | 접근 권한·길이 overflow·비밀 영역 배제·검사 후 변경(TOCTOU) |
| DMA·peripheral | CPU 밖 master의 보안 속성과 controller 정책 |
| Interrupt·stack | GIC/NVIC routing과 각 상태의 stack·context 노출 방지 |
| Reset·lock | 재설정 뒤 attribution 복원과 실제 lock 범위 |

주소 검사 한 번으로 공유 buffer의 내용이 이후에도 불변이라고 보장할 수 없습니다. Non-secure 쪽 interrupt handler나 DMA가 검사 뒤에 값을 바꿀 수 있기 때문입니다. 민감한 metadata는 secure 쪽에 복사한 뒤 그 복사본만 검증하고 씁니다. Stack은 CPU가 상태별로 나눠 둡니다. [Cortex-M33 TRM](https://developer.arm.com/documentation/100230/latest)(100230 Issue 08)은 Security Extension이 있으면 `MSP_S`·`PSP_S`·`MSP_NS`·`PSP_NS` 네 stack pointer와 상태별 `MSPLIM`·`PSPLIM` stack limit register가 있다고 적습니다.

## PSA Root of Trust 아키텍처

Arm PSA(Platform Security Architecture)는 보안 모델과 API 규격을 포함합니다. TF-M은 PSA API와 services의 참조 구현입니다.

![TF-M PSA 아키텍처 — Non-Secure App → SG → Secure SPM + 4 services](/images/blog/embedded-security/diagrams/ch04-tfm-psa.svg)

TF-M v2.3.1에서 어느 service가 들어갈지는 CMake option이 정합니다. [`config/config_base.cmake`](https://git.trustedfirmware.org/plugins/gitiles/TF-M/trusted-firmware-m.git/+/0b40d7806136baadf489febf8e2f91bf87aca63d/config/config_base.cmake#165)는 `TFM_PARTITION_PROTECTED_STORAGE`·`INTERNAL_TRUSTED_STORAGE`·`CRYPTO`·`INITIAL_ATTESTATION`을 모두 `OFF`로 두고, `TFM_PROFILE`이 고른 profile 파일이 켭니다. Profile Small은 Crypto·ITS·Initial Attestation만 켜고 Protected Storage는 `OFF`로 둡니다. Medium과 Large는 넷 다 켭니다.

| Service | API | 역할 |
|---|---|---|
| Crypto | `psa_*` | AES/SHA/ECC/TRNG, 키 관리 |
| Internal Trusted Storage (ITS) | `psa_its_*` | secure NVS, 무결성 |
| Protected Storage (PS) | `psa_ps_*` | external storage, 암호화 + 인증 |
| Initial Attestation | PSA Initial Attestation API | 디바이스 상태 증명; token 형식·backend는 구현에 따름 |

Non-secure application은 PSA API만 호출합니다. 내부적으로 SG를 거쳐 secure side로 들어가고, secure side는 검증·키 사용·NVS 작업을 한 뒤 결과만 돌려보냅니다.

## 자주 하는 실수

- **NSC region에 SG가 아닌 명령을 둡니다.** C entry 함수의 `sg` veneer는 위 실행처럼 linker가 `.gnu.sgstubs`에 만듭니다. asm 코드를 직접 NSC에 배치하면서 첫 명령을 `sg`로 두지 않으면 SecureFault가 납니다.
- **`cmse_check_address_range` 검사를 빼먹습니다.** Non-secure가 secure 메모리 주소를 인자로 넘기면, secure 함수가 그 주소에 데이터를 *읽거나 씁니다*. 항상 입력 포인터가 non-secure 영역인지 확인합니다.
- **Secure 함수 안에서 non-secure callback을 호출합니다.** 이 시점에 secure 컨텍스트가 leak할 수 있습니다. callback에는 CMSE ABI의 context 정리와 대상 포인터 검증·수명 관리가 필요합니다. Queue·polling도 그 자체로 안전성을 보장하지 않습니다.
- **SAU region 하나만 NS로 열면 그 주소가 NS가 된다고 가정합니다.** Cortex-M33 TRM §4.1은 SAU와 IDAU가 낸 속성 중 더 secure한 쪽이 최종 속성이라고 적습니다(Table 4-1). IDAU가 S로 둔 주소는 SAU에서 NS로 설정해도 S로 남습니다. SAU가 꺼진 reset 상태에서는 모든 메모리가 Secure입니다. 의도한 attribution은 SAU 설정 뒤 `TT` 명령(`cmse_TT()`)으로 주소를 조회해 확인합니다.
- **GTZC lock의 단위를 착각합니다.** STM32L5 MPCBB는 256 B block으로 속성을 정하지만 lock은 8 KB super-block 단위입니다. 한 block만 잠그는 설정은 없습니다.
- **Cortex-A에서 GIC interrupt group 설정을 빼먹습니다.** secure peripheral의 IRQ가 non-secure side로 가면 *secure 데이터가 누설*되거나 *non-secure가 ack해 secure side가 멈춥니다*. SCR_EL3, GICD_IGROUPRn 설정을 검증합니다.
- **Secure stack과 non-secure stack을 같은 영역에 둡니다.** `MSP_S`·`PSP_S`가 가리키는 영역은 SAU에서 Secure로 두고, `MSPLIM_S`·`PSPLIM_S`로 아래 경계를 겁니다.

## 정리

- TrustZone은 프로세서 상태, security attribution과 SoC 보안 설정으로 Secure/Non-Secure 접근을 분리합니다.
- Cortex-A는 Exception Level 모델로 EL3 secure monitor가 두 세계를 디스패치합니다. SMC가 진입 통로입니다.
- Cortex-M의 TrustZone-M은 메모리 영역 기반 분리이며, SAU와 IDAU가 attribution을 정합니다.
- 함수 진입은 NSC의 SG와 `cmse_nonsecure_entry`, 반대 방향 callback은 `cmse_nonsecure_call`로 구분합니다.
- TZASC·TZPC·GIC(Cortex-A)와 GTZC·SPU(Cortex-M)가 메모리·peripheral·interrupt의 NS 라벨을 강제합니다.
- ARM Trusted Firmware의 BL31이 Cortex-A의 표준 EL3 펌웨어이며, OP-TEE 같은 secure payload의 디스패처 역할을 합니다.
- TF-M v2.3.1은 PSA service partition을 기본 `OFF`로 두고 profile이 켭니다. Profile Small에는 Protected Storage가 없습니다.
- 분리의 효과는 입력 검증·stack 분리·peripheral lock·interrupt grouping 같은 *세부 설정의 완성도*에 달려 있습니다.

출처는 TF-A v2.15.0·TF-M v2.3.1 source, Cortex-M33 TRM Issue 08, Linux v6.12 header, STM32L5 HAL v1.0.7입니다. 실행한 것은 GCC 14.2.1·clang 19.1.7의 CMSE compile·link까지이며, 보드에서 격리 위반 시험은 하지 않았습니다.

다음 편은 **Ch 5: TEE — OP-TEE / ARM CCA**. TrustZone이라는 *분리 메커니즘* 위에서 동작하는 *실제 OS와 application*을 봅니다. OP-TEE의 아키텍처, Trusted Application 개발, ARM Confidential Compute Architecture까지 다룹니다.

## 관련 항목

- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 6: OTA 업데이트](/blog/embedded/embedded-security/chapter06-ota-update)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- AUTOSAR Adaptive — 차량 보안
