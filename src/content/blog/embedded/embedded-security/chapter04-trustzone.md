---
title: "Ch 4: TrustZone — Cortex-A / Cortex-M"
date: 2026-05-08T05:00:00
description: "ARM TrustZone — Secure / Non-Secure World 분리. SMC, NSC."
tags: [TrustZone, ARM, Secure World]
series: "Embedded Security"
seriesOrder: 4
draft: false
---

## 한 줄 요약

> **"TrustZone은 한 칩 안에 두 개의 *실행 세계*를 만듭니다."** — Secure World가 자기만의 메모리·peripheral·exception을 갖고, Non-Secure World는 게이트를 통해서만 들어올 수 있습니다. 같은 CPU에서 시간 분할로 두 세계를 오가는, *하드웨어 강제* 분리입니다.

## 왜 분리가 필요한가

Ch 3에서 키와 알고리즘을 다뤘습니다. 그런데 키를 *어디에 두고, 누가 만질 수 있는가*는 더 깊은 질문입니다. 일반 application과 같은 메모리 공간에 키가 있으면, application의 어떤 버그(stack overflow, use-after-free, format string)도 키를 노출시킬 수 있습니다.

전통적인 답은 *별도의 보안 칩* (Secure Element, TPM, smart card)을 추가하는 것이었습니다. 한 칩으로 통합하려는 노력이 ARM TrustZone입니다. CPU·메모리·버스·peripheral 전체에 *Secure / Non-Secure* 라벨을 도입해, 한 칩 안에서 두 세계를 분리합니다.

Cortex-A와 Cortex-M의 TrustZone은 *기본 아이디어는 같고 구현은 다릅니다*. Cortex-A는 OS 단위(Linux + OP-TEE) 분리이고, Cortex-M은 application 단위(RTOS task + TF-M) 분리입니다.

## TrustZone의 핵심 — NS bit

TrustZone의 모든 메커니즘 뒤에는 단 한 비트가 있습니다. *NS(Non-Secure) bit*입니다. 버스 트랜잭션마다, 메모리 영역마다, peripheral마다 이 비트가 있고, 하드웨어가 항상 검사합니다.

```text
CPU가 Secure 상태에서 메모리 R/W 발생
  → 버스 트랜잭션에 NS=0 (secure access) 표시
  → 메모리 controller가 region의 NS 설정과 비교
  → secure region이면 통과, non-secure region이면 (정책에 따라) 차단

CPU가 Non-Secure 상태에서 메모리 R/W 발생
  → 버스 트랜잭션에 NS=1 표시
  → secure region 접근 시도 → 차단, fault
  → non-secure region이면 통과
```

이 한 비트가 *공간적 분리*를 만듭니다. 같은 SoC 안에서도 secure peripheral은 secure CPU 상태에서만 보입니다. Non-Secure에서는 그 주소가 *읽히지 않거나*, *0xDEADBEEF 같은 더미*를 반환하거나, fault를 일으킵니다.

## Cortex-A TrustZone — Exception Level 모델

ARMv8-A Cortex-A는 4단계 Exception Level과 두 세계의 곱집합으로 동작합니다.

```text
                Non-secure                Secure
  EL3 (Monitor) ─────────────────────────────────────── Secure Monitor
                                                        (ARM Trusted FW BL31)
  EL2 (Hypervisor) ──┬───────────────┬──────────────┐
                     │ KVM, Xen      │              │ (Secure EL2, optional)
  EL1 (OS Kernel)    │ Linux         │              │ OP-TEE OS
                     │               │              │
  EL0 (User)         │ apps, libs    │              │ Trusted Applications
```

EL3는 *Secure Monitor*이며 둘 사이를 전환하는 유일한 통로입니다. EL2는 hypervisor 레벨이고, EL1은 OS 커널, EL0는 사용자 application입니다.

세계 사이를 오가는 명령은 SMC(Secure Monitor Call)입니다.

```asm
// Non-secure EL1 (Linux kernel) 에서 secure 서비스 호출
mov   x0, #0x32000001  // SMC function ID (예: TEE call)
mov   x1, ...
mov   x2, ...
smc   #0               // EL3로 진입
```

SMC를 실행하면 CPU가 EL3로 트랩하고, ARM Trusted Firmware의 BL31이 인자(`x0~x7`)를 보고 *어느 secure service로 라우팅할지* 결정합니다. PSCI(전원 관리), OP-TEE call, 또는 vendor 특화 service 중 하나로 갑니다.

## NS bit이 controlling하는 자원들

ARMv8-A에서 NS bit으로 분리되는 자원은 다음과 같습니다.

| 자원 | 분리 메커니즘 | 메모 |
|---|---|---|
| RAM 영역 | TZASC (TrustZone Address Space Controller) | DDR 영역을 secure/non-secure로 나눔 |
| SRAM 영역 | TZMA (TrustZone Memory Adapter) | 작은 secure SRAM 분리 |
| Peripheral | TZPC (TrustZone Protection Controller) | UART, GPIO 등을 secure로 락 |
| Cache lines | NS bit이 cache tag에 포함 | secure/non-secure cache miss 분리 |
| Interrupt | GIC (Generic Interrupt Controller) Group | Group 0 = secure, Group 1 = non-secure |
| MMU translation | TTBR0_EL1_S vs TTBR0_EL1_NS | 페이지 테이블이 세계별로 다름 |

이 모든 컨트롤러는 *부팅 초기 EL3에서 설정*되며, 한 번 잠그면 non-secure에서 다시 만질 수 없습니다.

## ARM Trusted Firmware — EL3 코드의 표준

EL3에서 동작하는 코드는 일반적으로 ARM Trusted Firmware-A(TF-A)의 BL31입니다. 오픈 소스이고 SoC 벤더가 platform port를 제공합니다. 책임은 다음과 같습니다.

BL31 (Runtime EL3 firmware)의 역할:

1. SMC 처리 — non-secure ↔ secure 디스패처
2. PSCI 구현 — CPU on/off, suspend/resume, system reset
3. Secure Partition Manager — secure EL1 payload (OP-TEE)와 통신
4. Interrupt routing — secure IRQ를 secure world로
5. SDEI (Software Delegated Exception) 디스패치

BL31의 SMC 디스패치는 함수 ID 범위로 라우팅됩니다.

| SMC ID 범위 | 서비스 |
|-------------|--------|
| `0x00000000 ~ 0x0000FFFF` | ARM Architecture Service (e.g. PSCI) |
| `0x82000000 ~ 0x8200FFFF` | SiP (Silicon Provider) Service |
| `0x82000000 ~ 0xC1FFFFFF` | OEM Service |
| `0xC2000000 ~ 0xC200FFFF` | Standard Secure Service |
| `0x32000000 ~ 0x3200FFFF` | Trusted OS Service (OP-TEE) |

OP-TEE call이 들어오면 BL31은 *world switch*를 수행합니다. 모든 레지스터를 secure context로 저장·복원하고, EL1S로 점프합니다. OP-TEE OS가 받아 적절한 Trusted Application으로 dispatch합니다. 이 흐름은 Ch 5에서 자세히 봅니다.

## Cortex-M TrustZone-M — MCU의 분리

Cortex-A의 TrustZone은 *OS-level 분리*입니다. Linux와 OP-TEE가 동시에 동작합니다. Cortex-M의 TrustZone-M은 *MCU의 single binary 안에서의 분리*입니다. M23, M33, M55, M85가 지원합니다.

핵심 차이는 *exception level이 없다*는 것입니다. 대신 Secure/Non-Secure 두 *상태*만 있고, 메모리 영역 단위로 어디가 secure인지 정해집니다. CPU가 *어디서 명령을 fetch하느냐*에 따라 상태가 바뀝니다.

```text
Memory Map (예시 — STM32L552)

0x00000000 ─┐
            │ Non-secure flash (application)
0x07FFFFFF ─┘
0x0C000000 ─┐
            │ Secure flash (TF-M, secure boot)
0x0FFFFFFF ─┘
0x20000000 ─┐
            │ Non-secure SRAM
0x2002FFFF ─┘
0x30000000 ─┐
            │ Secure SRAM
0x3000FFFF ─┘
```

CPU가 secure flash 영역에서 명령을 fetch하면 *secure 상태*가 되고, non-secure flash로 점프하면 *non-secure 상태*가 됩니다. 이 전환은 SAU(Security Attribution Unit) 또는 IDAU(Implementation Defined Attribution Unit)가 결정합니다.

## SAU / IDAU 설정

SAU는 *프로그래머가 설정하는* security attribution입니다. 8개의 region을 정의해 각각을 secure / non-secure / non-secure callable로 표시합니다.

```c
// CMSIS 함수로 SAU region 설정 (TF-M boot에서)
SAU->RNR  = 0;                          // region number
SAU->RBAR = 0x08000000;                 // region base (non-secure flash 시작)
SAU->RLAR = 0x081FFFFF | SAU_RLAR_ENABLE_Msk;  // limit + enable, NSC=0

SAU->RNR  = 1;
SAU->RBAR = 0x20000000;                 // non-secure SRAM
SAU->RLAR = 0x2002FFFF | SAU_RLAR_ENABLE_Msk;

SAU->CTRL = SAU_CTRL_ENABLE_Msk;        // SAU 활성화
```

NSC(Non-Secure Callable)는 *non-secure에서 secure로 점프할 수 있는 유일한 게이트*입니다. NSC 영역에는 *SG(Secure Gateway) 명령*이 들어 있어야 하고, non-secure 코드가 SG가 아닌 곳으로 점프하면 SecureFault가 발생합니다.

```c
// secure 측 — NSC veneer 함수 (CMSE 컴파일러 확장)
#include <arm_cmse.h>

// secure에서 non-secure로 노출할 함수
__attribute__((cmse_nonsecure_entry))
int secure_aes_encrypt(const uint8_t* in, uint8_t* out, size_t len) {
    // 입력 포인터가 진짜 non-secure에서 합법한지 확인
    if (cmse_check_address_range(in,  len, CMSE_NONSECURE | CMSE_MPU_READ)  == NULL ||
        cmse_check_address_range(out, len, CMSE_NONSECURE | CMSE_MPU_READWRITE) == NULL) {
        return -1;
    }
    // HW AES 호출
    return hw_aes_encrypt(in, out, len);
}
```

`cmse_nonsecure_entry` 속성이 컴파일러에게 *이 함수의 entry point에 SG 명령을 박아라*를 시킵니다. 링커는 그 entry point를 NSC region에 배치합니다. Non-secure에서 부르려면 *function pointer를 import*합니다.

```c
// non-secure 측
typedef int (*secure_aes_t)(const uint8_t*, uint8_t*, size_t)
            __attribute__((cmse_nonsecure_call));

extern secure_aes_t secure_aes_encrypt;

// 호출 — 컴파일러가 BLXNS 명령 발행
int rc = secure_aes_encrypt(in, out, len);
```

`BLXNS` 명령이 secure entry로 점프하고, 거기서 `SG` 명령이 secure 상태로 전환합니다. 돌아올 때는 secure 함수가 `BXNS lr` 명령으로 non-secure 상태로 돌아옵니다.

## TrustZone-M 의 자원 분리

Cortex-A의 TZASC·TZPC에 해당하는 MCU 컨트롤러들입니다.

| MCU | 메모리 분리 | Peripheral 분리 |
|---|---|---|
| STM32L5/U5 | GTZC-MPCBB (block-based) | GTZC-TZSC (per-peripheral) |
| Nordic nRF53/91 | SPU (System Protection Unit) | SPU |
| NXP RT500/600 | SECURE-only AHB, TrustZone Memory Protection Checker | AHBSC, TZIC |
| Microchip SAM L11 | NVM Lock Bits | PAC (Peripheral Access Controller) |

GTZC의 예 (STM32U5):

```c
// SRAM2 block 0~7을 secure로 표시 (block당 256B)
GTZC_MPCBB1_S->VCTR[0] = 0x000000FF;   // 각 비트 = 1 block의 secure 여부

// LPTIM1을 secure peripheral로
GTZC_TZSC_S->SECCFGR3 |= GTZC_TZSC_SECCFGR3_LPTIM1_Pos;
```

설정이 끝난 후 GTZC의 lock 비트를 굽으면 *non-secure에서 더 이상 만질 수 없도록* 잠깁니다.

## PSA Root of Trust 아키텍처

ARM PSA(Platform Security Architecture)는 TrustZone-M 위에서 동작하는 *표준 reference architecture*입니다. TF-M(Trusted Firmware-M)이 그 구현체입니다.

```text
┌─────────────────────────────────┐
│        Non-Secure World         │
│  ┌────────────────────────────┐ │
│  │  Application / RTOS        │ │
│  │  (FreeRTOS, Zephyr, …)     │ │
│  └────────────────────────────┘ │
│              │                  │
│              │ PSA Function ID  │
│              │ via veneer       │
└──────────────┼──────────────────┘
               │ SG instruction
┌──────────────┼──────────────────┐
│              ▼   Secure World   │
│  ┌────────────────────────────┐ │
│  │  TF-M SPM (SP Manager)     │ │
│  └─────┬──────────────────────┘ │
│        │                        │
│  ┌─────┴────┐ ┌──────────┐      │
│  │ Crypto   │ │ Internal │      │
│  │  Service │ │  Trusted │      │
│  │          │ │  Storage │      │
│  └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐      │
│  │ Initial  │ │ Firmware │      │
│  │  Attest  │ │  Update  │      │
│  └──────────┘ └──────────┘      │
└─────────────────────────────────┘
```

PSA가 제공하는 *4개의 표준 service*가 있습니다.

| Service | API | 역할 |
|---|---|---|
| Crypto | `psa_*` | AES/SHA/ECC/TRNG, 키 관리 |
| Internal Trusted Storage (ITS) | `psa_its_*` | secure NVS, 무결성 |
| Protected Storage (PS) | `psa_ps_*` | external storage, 암호화 + 인증 |
| Initial Attestation | `psa_iat_*` | 디바이스 신원 증명, EAT token |

Non-secure application은 PSA API만 호출합니다. 내부적으로 SG를 거쳐 secure side로 들어가고, secure side는 검증·키 사용·NVS 작업을 한 뒤 결과만 돌려보냅니다.

## 자주 하는 실수

- **NSC region에 SG가 아닌 명령을 둡니다.** 보통은 컴파일러가 알아서 처리하지만, asm 코드를 직접 NSC에 배치하면 첫 명령이 SG가 아니면 SecureFault가 납니다.
- **`cmse_check_address_range` 검사를 빼먹습니다.** Non-secure가 secure 메모리 주소를 인자로 넘기면, secure 함수가 그 주소에 데이터를 *읽거나 씁니다*. 항상 입력 포인터가 non-secure 영역인지 확인합니다.
- **Secure 함수 안에서 non-secure callback을 호출합니다.** 이 시점에 secure 컨텍스트가 leak할 수 있습니다. callback이 필요하면 *secure가 결과를 큐에 넣고 non-secure가 polling*하는 패턴이 안전합니다.
- **SAU region을 다 안 채우고 부팅합니다.** 정의되지 않은 영역은 IDAU 디폴트로 정해지고, 보통 secure로 잡힙니다. 모든 메모리 영역이 의도된 attribution을 갖는지 부팅 직후 검사합니다.
- **GTZC lock을 안 굽고 release합니다.** 양산 펌웨어가 GTZC 설정만 하고 lock하지 않으면 non-secure side가 그 설정을 *덮어쓸 수 있습니다*. 부팅 마지막에 lock 비트를 굽습니다.
- **Cortex-A에서 GIC interrupt group 설정을 빼먹습니다.** secure peripheral의 IRQ가 non-secure side로 가면 *secure 데이터가 누설*되거나 *non-secure가 ack해 secure side가 멈춥니다*. SCR_EL3, GICD_IGROUPRn 설정을 검증합니다.
- **Secure stack과 non-secure stack을 같은 영역에 둡니다.** Cortex-M에서 MSP_S, PSP_S, MSP_NS, PSP_NS 네 개의 stack pointer를 *모두 다른 영역*에 둡니다. 그렇지 않으면 stack 누설로 secure 데이터가 보입니다.

## 정리

- TrustZone은 NS bit 하나로 한 칩 안에서 Secure/Non-Secure 두 세계를 분리합니다.
- Cortex-A는 Exception Level 모델로 EL3 secure monitor가 두 세계를 디스패치합니다. SMC가 진입 통로입니다.
- Cortex-M의 TrustZone-M은 메모리 영역 기반 분리이며, SAU와 IDAU가 attribution을 정합니다.
- NSC region의 SG 명령과 `cmse_nonsecure_entry` 함수가 non-secure → secure의 유일한 합법 진입점입니다.
- TZASC·TZPC·GIC(Cortex-A)와 GTZC·SPU(Cortex-M)가 메모리·peripheral·interrupt의 NS 라벨을 강제합니다.
- ARM Trusted Firmware의 BL31이 Cortex-A의 표준 EL3 펌웨어이며, OP-TEE 같은 secure payload의 디스패처 역할을 합니다.
- ARM PSA + TF-M은 Cortex-M의 standard secure architecture로, Crypto·ITS·PS·Attestation 네 service를 제공합니다.
- 분리의 효과는 입력 검증·stack 분리·peripheral lock·interrupt grouping 같은 *세부 설정의 완성도*에 달려 있습니다.

다음 편은 **Ch 5: TEE — OP-TEE / ARM CCA**. TrustZone이라는 *분리 메커니즘* 위에서 동작하는 *실제 OS와 application*을 봅니다. OP-TEE의 아키텍처, Trusted Application 개발, ARM Confidential Compute Architecture까지 다룹니다.

## 관련 항목

- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 6: OTA 업데이트](/blog/embedded/embedded-security/chapter06-ota-update)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [AUTOSAR Adaptive — 차량 보안](/blog/embedded/automotive/autosar-adaptive)
