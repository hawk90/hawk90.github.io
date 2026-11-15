---
title: "TrustZone과 TF-M — Secure/Non-Secure·NSC Veneer·PSA"
slug: "embedded/rtos/practical-internals/part4-11-trustzone-tfm"
date: 2026-05-07T09:43:00
description: "Cortex-M33/M55/M85의 TrustZone-M과 TF-M secure firmware를 정리합니다. SAU/IDAU로 메모리를 secure/non-secure로 가르고, NSC veneer + SG 명령으로 안전하게 cross-world call을 수행하는 구조, PSA Crypto/Storage/Attestation API, secure boot chain까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 43
tags: [trustzone, tf-m, security, cortex-m33, psa, secure-boot]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"TrustZone-M은 같은 CPU 위에 *두 개의 세계*를 만듭니다."** — Secure World와 Non-Secure World가 hardware로 분리되고, 일반적인 NS→Secure 서비스 호출은 NSC gateway를 통과하며 예외·복귀 경로는 별도로 존재합니다.

## 어떤 문제를 푸는가

이전 편에서 user/kernel을 MPU로 분리하는 방법을 보았습니다. 그 분리는 *한 OS 안의 권한 경계*입니다. MPU 기반 권한 격리도 서로 다른 신뢰의 코드를 분리하는 데 사용할 수 있습니다. TrustZone은 security state라는 별도의 경계를 제공하며 privilege와 직교합니다.

대표적인 시나리오가 *secure key storage*입니다. IoT 디바이스에 device-unique private key가 들어 있다고 합시다. 일반 application은 그 key로 *서명만* 부탁할 수 있어야 하고, key 자체는 *읽을 수 없어야* 합니다. application firmware가 손상되더라도 key는 새지 않아야 합니다.

Security Extension을 구현·활성화한 Cortex-M 계열의 TrustZone이 이 경계를 지원합니다. core 이름만으로 SoC 전체 attribution·debug·DMA 보안이 완성되지는 않습니다. 같은 코어에서 *Secure World(S)*와 *Non-Secure World(NS)* 두 영역이 hardware로 분리됩니다. Non-Secure에 위치한 FreeRTOS는 Secure에 위치한 *crypto, secure storage, attestation* 서비스를 호출만 할 수 있고, 직접 접근은 불가능합니다.

이번 편은 TrustZone-M의 메모리 분할, NSC veneer를 통한 cross-world call, ARM 공식 reference인 TF-M(Trusted Firmware-M)과 PSA API를 정리합니다.

## 두 세계 — Secure와 Non-Secure

Cortex-M33/M55/M85에서 TrustZone for Armv8-M은 두 세계를 만듭니다.

Secure World (S)

- TF-M 또는 자체 secure firmware
- crypto, secure storage, attestation, secure boot root

Non-Secure World (NS)

- FreeRTOS / Zephyr / application
- 일반 펌웨어 코드

같은 CPU, 같은 메모리, 같은 peripheral — region별 attribute로 분리합니다.

두 세계가 같은 칩 위에서 어떻게 갈라지는지 그림으로 보면 이렇습니다. Secure Flash/SRAM/Peripheral과 Non-Secure 영역이 attribute로 분리되고, NSC veneer가 일반 서비스 호출의 통로가 됩니다. 그림은 예외·interrupt·복귀의 모든 전이를 표현하지 않습니다.

![TrustZone-M secure / non-secure world](/images/blog/rtos/diagrams/part4-11-trustzone-worlds.svg)

일부 system register와 stack pointer가 security state별로 banked됩니다. general-purpose register 전체가 두 벌인 것은 아니며 gateway ABI는 정보 누출 방지를 처리해야 합니다. SG 함수 호출은 exception 진입과 같지 않습니다. IRQ masking과 priority는 security state·설정에 따라 분석합니다.

## Memory 분할 — SAU와 IDAU

security attribution과 MPU 접근 권한을 구분합니다. SAU와 implementation-defined attribution, bus/peripheral의 보안 제어를 SoC reference manual에 맞춰 구성합니다. NSC는 Secure code의 진입 영역이지 GPIO/UART peripheral에 붙이는 서비스 호출 속성이 아닙니다.

기존 주소 예의 0x08000000과 0x0C000000의 차이는 **0x04000000, bit 26**입니다. 모든 칩이 bit 28 alias를 사용한다는 설명은 틀립니다. 이 두 주소가 같은 물리 flash인지와 접근 정책은 해당 SoC 문서가 결정합니다. -mcmse가 임의 주소를 자동으로 Secure alias로 변환하지 않습니다.

SAU table만으로 board attribution 설정이 끝나지는 않습니다. NSC의 32-byte 경계·실제 linker section, IDAU·peripheral/DMA·MPU·debug와 boot 정책을 함께 확인해야 하므로 특정 칩에 그대로 쓸 수 없는 register 주소 예제는 사용하지 않습니다.

## NSC Veneer — 합법 Cross-World Call

일반 NS→Secure 함수 호출은 NSC 영역의 SG gateway로 진입합니다. cmse_nonsecure_entry는 compiler/linker가 entry ABI와 veneer를 만들도록 표시하며 linker 배치와 NS import library가 함께 필요합니다.

```c title="cmse-entry.c"
#include <arm_cmse.h>
#include <stdint.h>
#include <stddef.h>

/* 공개 정수 하나를 읽어 공개 결과를 쓰는 교육용 서비스. crypto/권한 모델 아님. */
__attribute__((cmse_nonsecure_entry))
int secure_increment(const uint32_t *input, uint32_t *output)
{
    if (input == NULL || output == NULL ||
        ((uintptr_t)input % _Alignof(uint32_t)) != 0 ||
        ((uintptr_t)output % _Alignof(uint32_t)) != 0) return -1;
    const volatile uint32_t *in = cmse_check_address_range((void *)input,
        sizeof(*input), CMSE_NONSECURE | CMSE_MPU_READ);
    volatile uint32_t *out = cmse_check_address_range(output,
        sizeof(*output), CMSE_NONSECURE | CMSE_MPU_READWRITE);
    if (in == NULL || out == NULL) return -1;
    uint32_t snapshot = *in;
    *out = snapshot + UINT32_C(1); /* unsigned modular 결과 */
    return 0;
}
```

입력은 한 번 snapshot으로 읽고 NS read 권한, 출력은 NS write 권한을 검사합니다. memory attribution이 trusted configuration 아래 안정적이라는 전제가 필요합니다. 이 예는 M33 -mcmse object 생성과 TT/BXNS 경로만 검사하며 실제 NS/S dual-image 실행·fault·재진입/서비스 authorization을 검증하지 않습니다.

NS image는 linker가 만든 import symbol과 맞춰 호출합니다. entry 속성이 object에 있다는 사실만으로 올바른 NSC 배치나 안전한 전체 secure image가 증명되지는 않습니다.

## NS Pointer 검증 — `cmse_check_address_range`

cmse_check_address_range는 접근 범위/권한 확인 도구이며 서비스 권한·입력 내용·race를 대신하지 않습니다. 길이 산술 overflow, output length pointer, alignment와 전체 buffer 범위를 검증해야 합니다. NS data가 검사 후 바뀔 수 있으므로 검증한 크기·내용은 secure snapshot에 고정하는 등 TOCTOU를 다룹니다.

CMSE_NONSECURE만 넣은 입력 검사는 호출자의 필요한 MPU read 권한과 구분해야 합니다. raw pointer 검사를 완전한 fault-safe copy나 암호 서비스의 안전성 증명으로 보지 않습니다.

## TF-M — ARM 공식 Secure Firmware

이 글의 기준은 **TF-Mv2.1.0**, commit 0c4c99ba33b3e66deea070e149279278dc7647f4입니다. TF-M은 Trusted Firmware 프로젝트의 Secure Processing Environment 구현으로, SPM과 선택한 crypto/storage/attestation/FWU service를 구성합니다. 모든 board·service·isolation level이 같은 것은 아닙니다.

TF-M 내부 secure partition isolation과 NS/S 경계도 구분합니다. IPC/SFN·single/dual CPU 등 선택한 profile과 platform의 지원 조건을 확인해야 합니다. NS의 PSA API가 언제나 동일한 NSC RPC 경로 하나로 구현된다고 일반화하지 않습니다.

## PSA Crypto API — Vendor 독립 표준

PSA Crypto는 key type·usage·algorithm·lifetime·caller 권한을 관리합니다. psa_export_key라는 API도 존재하며 export 허용 여부는 key policy·location·type에 따라 결정됩니다. key handle만 쓴다는 사실이 언제나 key export 불가를 뜻하지 않습니다.

psa_import_key는 호출자가 제공한 key bytes를 가져옵니다. NS가 원래 갖고 있던 key material이 import 후 과거에도 노출되지 않았던 것처럼 설명할 수 없습니다. persistent key ID 충돌, 반환값, attributes reset와 key lifetime을 처리해야 합니다.

AES-GCM은 같은 key에서 nonce를 재사용하면 안 됩니다. 고정 zero nonce로 persistent key를 매번 encrypt하는 기존 조각은 사용하지 않습니다. 제품의 nonce 발급·재부팅·key rotation 정책을 먼저 정하고, init/import/encrypt 결과와 output capacity·길이를 각각 검사합니다. 이 절은 API 계약 대조이며 실제 TF-M crypto service를 실행한 결과가 아닙니다.

## Initial Attestation — Device 신원 증명

attestation은 verifier가 발급한 challenge와 token의 서명·신뢰 anchor·claim·freshness·policy를 함께 검증하는 절차입니다. token 생성 호출 하나로 firmware의 모든 런타임 상태가 정상임을 증명하지 않습니다.

반환 status와 token length를 확인한 뒤 전송해야 합니다. 포함된 measurement·identity claim과 encoding은 선택한 profile/platform에 따르며 BL2·TF-M·NS image hash가 항상 동일한 형태로 전부 들어간다고 가정하지 않습니다.

## Secure Boot Chain

TF-Mv2.1.0 문서는 MCUboot BL2가 secure/non-secure image를 결합된 하나의 image 또는 독립된 여러 image로 검증할 수 있음을 설명합니다. 항상 TF-M runtime이 NS application 서명을 검증하는 고정 chain은 아닙니다.

최초 실행 code와 trust anchor의 불변성/인증, rollback counter·update strategy는 platform에서 구성합니다. anchor가 무조건 동일한 eFuse hash이고 영원히 교체 불가하다고 일반화하지 않습니다.

**secure/verified boot는 실행 허용을 위한 인증, measured boot는 측정값 기록**입니다. 둘을 함께 사용할 수 있지만 같은 용어가 아닙니다. 측정값과 attestation claim 연결도 실제 build로 확인합니다.

## PSA Certified — 보안 인증 등급

PSA Certified는 TF-M을 쓴다는 사실만으로 부여되지 않습니다. 공식 scheme의 평가 대상·version·범위를 확인해야 합니다. Level 1의 questionnaire/lab review, Level 2의 software attack 평가, Level 3의 hardware/software attack 저항, Level 4 iSE/SE의 대상은 서로 다릅니다.

Level 1을 단순 자가 질문 10개, Level 4를 Common Criteria EAL4+와 동일하다고 표현하지 않습니다. 인증과 별도 법규 적합성·제품 전체 보안은 동일한 보증이 아닙니다.

## SoC 사례 — Cortex-M33 칩들

TF-M 지원은 선택한 release의 platform·profile·test 결과로 확인합니다. core가 TrustZone을 지원한다고 모든 vendor SDK가 같은 TF-M service를 제공하는 것은 아닙니다.

NXP S32K3는 Cortex-M7 계열 MCU와 HSE를 제공하며, HSE를 단순히 일반 M33 TrustZone core라고 설명할 수 없습니다. RP2350도 M33 기반 보안 기능과 OTP를 제공하지만 특정 TF-M integration은 별도 확인 대상입니다.

독립 secure domain도 DMA/debug·key provisioning·fault injection과 수명주기 설정을 포함해 검증합니다.

## Cross-World Call Overhead

NSC entry·pointer 검사·SPM IPC·서비스 본체·복귀를 분리해 측정합니다. 실제 compiler/clock/crypto acceleration·buffer size·sample 분포가 없는 55 cycle·109 µs·32 ms 표는 측정 근거로 사용하지 않습니다.

## 자주 보는 함정과 안티패턴

- NSC section·entry ABI·import symbol이 서로 맞지 않는 경우.
- input만 확인하고 output pointer·output length·length overflow를 놓치는 경우.
- NS가 바꿀 수 있는 값을 검사 뒤 다시 읽어 사용하는 경우.
- SAU만 설정하고 SoC bus/DMA/peripheral·debug 정책을 생략하는 경우.
- PSA handle·인증 label·compile 성공을 전체 key 보호의 증명으로 사용하는 경우.

## 정리

- security state와 privilege/MPU permission은 별도 축입니다.
- SG gateway와 exception/복귀 경로를 구분하고 register 전체가 banked라고 가정하지 않습니다.
- alias 주소와 SAU/IDAU는 SoC 문서·linker와 맞춥니다.
- pointer read/write 권한·범위·snapshot·서비스 권한을 함께 검증합니다.
- TF-M boot 검증과 measured boot, PSA API와 인증 범위를 구분합니다.

## 근거 자료

- [Arm CMSE tool requirements](https://arm-software.github.io/acle/cmse/cmse.html): entry ABI·range check와 NS data 변경.
- [TF-Mv2.1.0 secure boot source](https://git.trustedfirmware.org/TF-M/trusted-firmware-m.git/tree/docs/design_docs/booting/tfm_secure_boot.rst?h=TF-Mv2.1.0), [isolation](https://git.trustedfirmware.org/TF-M/trusted-firmware-m.git/tree/docs/design_docs/ff_isolation.rst?h=TF-Mv2.1.0).
- [Mbed TLS 3.6.3 PSA Crypto API](https://mbed-tls.readthedocs.io/projects/api/en/v3.6.3/api/file/crypto_8h/): key export·import와 AEAD 계약.
- [PSA Certified 평가 범위](https://www.psacertified.org/getting-certified/), [NXP S32K3](https://www.nxp.com/products/S32K3).



다음 편은 [4-12 AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)에서 *서로 다른 코어가 서로 다른 OS를 돌리는* heterogeneous SoC를 다룹니다.

## 관련 항목

- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-10: System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)
- [4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded C++ 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
