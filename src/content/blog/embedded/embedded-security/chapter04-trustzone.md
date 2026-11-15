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

TrustZone 시스템에서는 보안 속성이 실행 상태와 interconnect·메모리·peripheral 설정을 통해 전달되고 검사됩니다. 구체적인 속성 전달과 접근 결과는 프로세서 아키텍처, interconnect, 보안 컨트롤러와 SoC 구현에 따라 다릅니다.

| CPU 상태 | 버스 NS bit | 메모리 controller 동작 |
|----------|-------------|----------------------|
| Secure | 보안 상태의 access attribute | 보안 컨트롤러와 region policy에 따라 허용·차단 여부 결정 |
| Non-Secure | non-secure access attribute | secure로 분류된 자원에 대한 접근은 SoC 정책에 따라 차단 또는 오류 처리 |

이 하드웨어 속성과 설정이 *공간적 분리*에 기여합니다. 차단된 접근의 결과는 주변 장치와 interconnect의 명세를 따르므로 고정된 더미값을 일반 규칙으로 가정하지 않습니다.

## Cortex-A TrustZone — Exception Level 모델

이 절은 RME를 제외한 AArch64 Secure·Non-secure 구성을 설명합니다. EL과 security state의 모든 조합이 항상 존재하지는 않으며 Secure EL2도 FEAT_SEL2 지원에 달려 있습니다.

![EL × Secure/Non-secure matrix](/images/blog/embedded-security/diagrams/ch04-trustzone-el-matrix.svg)

그림의 EL3 box는 공통 monitor 역할을 나타내며 Non-secure EL3가 따로 있다는 뜻이 아닙니다. EL3 monitor는 world 전환을 관리합니다. EL2는 hypervisor 레벨이고, EL1은 OS 커널, EL0는 사용자 application입니다.

세계 사이를 오가는 명령은 SMC(Secure Monitor Call)입니다.

실제 SMC는 [SMCCC(DEN0028)](https://developer.arm.com/documentation/den0028/latest)와 해당 service ABI를 따릅니다. 임의의 Function ID·생략된 register 인자로 실행 예를 만들지 않습니다. Monitor 구현과 호출 가능한 상태·conduit는 플랫폼 조건도 확인해야 합니다.


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

초기 attribution과 controller 설정은 platform boot 흐름이 담당합니다. 설정 주체·runtime 변경·lock과 reset 조건은 SoC별이며, 모든 controller가 EL3에서 한 번 영구 잠기는 것은 아닙니다.

## ARM Trusted Firmware — EL3 코드의 표준

EL3에서 동작하는 코드는 일반적으로 ARM Trusted Firmware-A(TF-A)의 BL31입니다. 오픈 소스이고 SoC 벤더가 platform port를 제공합니다. 책임은 다음과 같습니다.

BL31 (Runtime EL3 firmware)의 역할:

1. SMC 처리 — non-secure ↔ secure 디스패처
2. PSCI 구현 — CPU on/off, suspend/resume, system reset
3. Secure Partition Manager — secure EL1 payload (OP-TEE)와 통신
4. Interrupt routing — secure IRQ를 secure world로
5. SDEI (Software Delegated Exception) 디스패치

아래는 SMCCC의 fast-call 인코딩 예입니다. 전체 service 범위 표가 아니며 bit 31의 fast/yielding, bit 30의 32/64-bit convention, bit 29:24 owner를 구분합니다. [Linux v6.12 arm-smccc.h](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/linux/arm-smccc.h)와 대조했습니다.

| SMC ID 범위 | 서비스 |
|-------------|--------|
| `0x80000000–0x8000FFFF` (SMC32) / `0xC0000000–0xC000FFFF` (SMC64) | Arm Architecture calls |
| `0x81000000–0x8100FFFF` / `0xC1000000–0xC100FFFF` | CPU Service calls |
| `0x82000000–0x8200FFFF` / `0xC2000000–0xC200FFFF` | SiP Service calls |
| `0x83000000–0x8300FFFF` / `0xC3000000–0xC300FFFF` | OEM Service calls |
| `0x84000000–0x8400FFFF` / `0xC4000000–0xC400FFFF` | Standard Service calls |

SMC32와 SMC64의 convention bit 및 owner/range 해석은 SMCCC 버전을 기준으로 해야 합니다. OP-TEE는 자체 client ABI를 제공하므로 임의의 function ID를 만들지 말고 공개 헤더와 드라이버를 사용합니다.

OP-TEE call이 들어오면 BL31은 *world switch*를 수행합니다. 해당 ABI와 monitor가 정한 context를 저장·복원해 secure payload로 전환합니다. OP-TEE OS가 받아 적절한 Trusted Application으로 dispatch합니다. 이 흐름은 Ch 5에서 자세히 봅니다.

## Cortex-M TrustZone-M — MCU의 분리

Cortex-A의 TrustZone은 *OS-level 분리*입니다. Linux와 OP-TEE가 동시에 동작합니다. Cortex-M은 별도 Secure·Non-secure image로 빌드·배포하는 구성도 사용합니다. M23, M33, M55, M85가 지원합니다.

핵심 차이는 별도 exception level 대신 Secure/Non-Secure 상태와 메모리 attribution을 사용한다는 점입니다. SAU·IDAU와 SoC 보안 설정이 주소의 속성을 정하고, Non-Secure에서 Secure로 들어가는 전환은 NSC/SG gateway와 상태 전환 규칙을 따릅니다. 단순히 fetch 주소가 바뀌었다고 상태가 전환되는 것은 아닙니다.

![Secure·Non-secure flash와 SRAM을 나눈 개념적 partition 예시](/images/blog/embedded-security/diagrams/ch04-stm32l552-memory-map.svg)

위 그림은 partition 역할의 개념도이며 STM32L552의 실제 주소 범위나 기본 memory map이 아닙니다. 실제 크기·alias·option byte는 [ST AN5347](https://www.st.com/content/st_com/en/technical-documents/an5347-introduction-to-arm-trustzone-features-on-stm32l5-stm32u5-and-stm32u3-mcus-stmicroelectronics_asset/chunk-003-topic-an5347-rdp.html)와 대상 RM으로 확인합니다. 메모리 접근의 보안 attribution은 SAU·IDAU 및 SoC 통합 설정이 결정합니다. 코드가 상태를 전환하는 방식과 허용된 gateway는 Armv8-M architecture 및 해당 MCU 문서를 따릅니다.

## SAU / IDAU 설정

SAU는 프로그래머가 설정하는 security attribution입니다. SAU region 수는 구현별이며, region 우선순위·IDAU 결합·미설정 주소의 동작은 프로세서 및 SoC 문서를 확인해야 합니다.

주소 범위는 임의로 복사하지 않습니다. 예를 들어 STM32L552/L562의 SAU attribution과 NSC 구간은 해당 보드의 flash/RAM 분할, option bytes, IDAU와 TF-M partition 설정에 맞춰야 합니다. 이전에 흔히 인용되는 전체 `0x08000000–0x081FFFFF` 범위는 이 계열의 특정 비보안 구간을 나타내는 보편 설정이 아닙니다.

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

Clang의 Cortex-M33 `-mcmse` compile로 entry의 `BXNS`, callback의 `BLXNS`와 Non-secure 일반 호출을 확인합니다. 실제 NSC veneer link·보드 attribution·SecureFault나 context 유출 시험은 별도입니다.

## TrustZone-M 의 자원 분리

CPU의 SAU 설정만으로 DMA·peripheral의 접근이 모두 보호되는 것은 아닙니다. MCU의 bus master와 memory·peripheral controller를 함께 설정해야 합니다. ST GTZC 등 실제 block 크기·register·lock은 해당 부품 RM과 SDK header를 대조하고, 다른 STM32 계열에 같은 값을 복사하지 않습니다.

| 경계 | 필요한 확인 |
|------|------|
| NSC 진입 | linker veneer와 region attribution, 허용된 entry |
| 공유 buffer | 접근 권한·길이 overflow·비밀 영역 배제·검사 후 변경(TOCTOU) |
| DMA·peripheral | CPU 밖 master의 보안 속성과 controller 정책 |
| Interrupt·stack | GIC/NVIC routing과 각 상태의 stack·context 노출 방지 |
| Reset·lock | 재설정 뒤 attribution 복원과 실제 lock 범위 |

주소 검사 한 번으로 공유 buffer의 내용이 이후에도 불변이라고 보장할 수 없습니다. 민감한 metadata는 secure 쪽에 복사하고 검증·사용의 일관성을 유지해야 합니다. State별 stack 보호가 필요하지만 모든 stack pointer가 반드시 서로 다른 네 개의 물리 영역을 가져야 한다는 일률적 규칙은 아닙니다.

## PSA Root of Trust 아키텍처

Arm PSA(Platform Security Architecture)는 보안 모델과 API 규격을 포함합니다. TF-M은 PSA API와 services의 한 implementation이며, 제공되는 service와 backend는 configuration dependent입니다.

![TF-M PSA 아키텍처 — Non-Secure App → SG → Secure SPM + 4 services](/images/blog/embedded-security/diagrams/ch04-tfm-psa.svg)

TF-M 기반 제품에서 사용할 수 있는 대표 API/service 예시는 다음과 같습니다. 실제 제공 여부는 빌드 구성과 storage·attestation backend에 따라 다릅니다.

| Service | API | 역할 |
|---|---|---|
| Crypto | `psa_*` | AES/SHA/ECC/TRNG, 키 관리 |
| Internal Trusted Storage (ITS) | `psa_its_*` | secure NVS, 무결성 |
| Protected Storage (PS) | `psa_ps_*` | external storage, 암호화 + 인증 |
| Initial Attestation | PSA Initial Attestation API | 디바이스 상태 증명; token 형식·backend는 구현에 따름 |

Non-secure application은 PSA API만 호출합니다. 내부적으로 SG를 거쳐 secure side로 들어가고, secure side는 검증·키 사용·NVS 작업을 한 뒤 결과만 돌려보냅니다.

## 자주 하는 실수

- **NSC region에 SG가 아닌 명령을 둡니다.** 보통은 컴파일러가 알아서 처리하지만, asm 코드를 직접 NSC에 배치하면 첫 명령이 SG가 아니면 SecureFault가 납니다.
- **`cmse_check_address_range` 검사를 빼먹습니다.** Non-secure가 secure 메모리 주소를 인자로 넘기면, secure 함수가 그 주소에 데이터를 *읽거나 씁니다*. 항상 입력 포인터가 non-secure 영역인지 확인합니다.
- **Secure 함수 안에서 non-secure callback을 호출합니다.** 이 시점에 secure 컨텍스트가 leak할 수 있습니다. callback에는 CMSE ABI의 context 정리와 대상 포인터 검증·수명 관리가 필요합니다. Queue·polling도 그 자체로 안전성을 보장하지 않습니다.
- **SAU/IDAU 결합과 default attribution을 가정합니다.** 미설정 주소의 결과는 Arm architecture와 IDAU 구현 설정을 확인하고 의도한 attribution을 검증합니다.
- **GTZC 설정과 lock 동작을 혼동합니다.** 재설정 가능성과 lock 효과는 부품별 register 설명을 확인한 뒤 검증합니다.
- **Cortex-A에서 GIC interrupt group 설정을 빼먹습니다.** secure peripheral의 IRQ가 non-secure side로 가면 *secure 데이터가 누설*되거나 *non-secure가 ack해 secure side가 멈춥니다*. SCR_EL3, GICD_IGROUPRn 설정을 검증합니다.
- **Secure stack과 non-secure stack을 같은 영역에 둡니다.** 실제로 사용하는 stack의 security attribution·권한·한계와 context 수명을 확인하고 Non-secure가 Secure stack에 접근하지 못하도록 합니다.

## 정리

- TrustZone은 프로세서 상태, security attribution과 SoC 보안 설정으로 Secure/Non-Secure 접근을 분리합니다.
- Cortex-A는 Exception Level 모델로 EL3 secure monitor가 두 세계를 디스패치합니다. SMC가 진입 통로입니다.
- Cortex-M의 TrustZone-M은 메모리 영역 기반 분리이며, SAU와 IDAU가 attribution을 정합니다.
- 함수 진입은 NSC의 SG와 `cmse_nonsecure_entry`, 반대 방향 callback은 `cmse_nonsecure_call`로 구분합니다.
- TZASC·TZPC·GIC(Cortex-A)와 GTZC·SPU(Cortex-M)가 메모리·peripheral·interrupt의 NS 라벨을 강제합니다.
- ARM Trusted Firmware의 BL31이 Cortex-A의 표준 EL3 펌웨어이며, OP-TEE 같은 secure payload의 디스패처 역할을 합니다.
- PSA API와 TF-M service의 실제 제공 범위는 프로젝트 구성과 backend에 따라 달라집니다.
- 분리의 효과는 입력 검증·stack 분리·peripheral lock·interrupt grouping 같은 *세부 설정의 완성도*에 달려 있습니다.

검토는 위 Arm CMSE·SMCCC, Linux v6.12 header와 ST 자료의 선언 범위입니다. 실제 보드 설정·firmware link·격리 위반 시험을 수행하지 않았습니다.

다음 편은 **Ch 5: TEE — OP-TEE / ARM CCA**. TrustZone이라는 *분리 메커니즘* 위에서 동작하는 *실제 OS와 application*을 봅니다. OP-TEE의 아키텍처, Trusted Application 개발, ARM Confidential Compute Architecture까지 다룹니다.

## 관련 항목

- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 6: OTA 업데이트](/blog/embedded/embedded-security/chapter06-ota-update)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- AUTOSAR Adaptive — 차량 보안
