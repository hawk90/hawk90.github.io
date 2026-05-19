---
title: "4-11: TrustZone·TF-M — Secure/Non-Secure·NSC Veneer·PSA"
date: 2026-05-07T23:00:00
description: "Cortex-M33/M55/M85의 TrustZone-M과 TF-M secure firmware를 정리합니다. SAU/IDAU로 메모리를 secure/non-secure로 가르고, NSC veneer + SG 명령으로 안전하게 cross-world call을 수행하는 구조, PSA Crypto/Storage/Attestation API, secure boot chain까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 43
tags: [trustzone, tf-m, security, cortex-m33, psa, secure-boot]
---

## 한 줄 요약

> **"TrustZone-M은 같은 CPU 위에 *두 개의 세계*를 만듭니다."** — Secure World와 Non-Secure World가 hardware로 분리되고, NSC veneer만이 합법 통로가 됩니다.

## 어떤 문제를 푸는가

이전 편에서 user/kernel을 MPU로 분리하는 방법을 보았습니다. 그 분리는 *한 OS 안의 권한 경계*입니다. 같은 firmware가 작성한 user task와 kernel을 갈라 놓을 뿐, *서로 다른 신뢰 도메인을 같은 칩 위에서 격리*하는 문제는 풀지 못합니다.

대표적인 시나리오가 *secure key storage*입니다. IoT 디바이스에 device-unique private key가 들어 있다고 합시다. 일반 application은 그 key로 *서명만* 부탁할 수 있어야 하고, key 자체는 *읽을 수 없어야* 합니다. application firmware가 손상되더라도 key는 새지 않아야 합니다.

ARM이 Cortex-M33/M55/M85에 도입한 **TrustZone for Armv8-M**이 이 문제를 풉니다. 같은 코어에서 *Secure World(S)*와 *Non-Secure World(NS)* 두 영역이 hardware로 분리됩니다. Non-Secure에 위치한 FreeRTOS는 Secure에 위치한 *crypto, secure storage, attestation* 서비스를 호출만 할 수 있고, 직접 접근은 불가능합니다.

이번 편은 TrustZone-M의 메모리 분할, NSC veneer를 통한 cross-world call, ARM 공식 reference인 TF-M(Trusted Firmware-M)과 PSA API를 정리합니다.

## 두 세계 — Secure와 Non-Secure

```text
Cortex-M33/M55/M85 — TrustZone for Armv8-M

Secure World (S):
  TF-M 또는 자체 secure firmware
  crypto, secure storage, attestation, secure boot root

Non-Secure World (NS):
  FreeRTOS / Zephyr / application
  일반 펌웨어 코드

같은 CPU, 같은 메모리, 같은 peripheral
→ region별 attribute로 분리
```

두 세계가 같은 칩 위에서 어떻게 갈라지는지 그림으로 보면 이렇습니다. Secure Flash/SRAM/Peripheral과 Non-Secure 영역이 attribute로 분리되고, NSC veneer가 둘 사이의 유일한 합법 통로가 됩니다.

![TrustZone-M secure / non-secure world](/images/blog/rtos/diagrams/part4-11-trustzone-worlds.svg)

두 세계는 *별도의 register bank*를 가집니다. MSP와 PSP가 각각 `MSP_S/MSP_NS`, `PSP_S/PSP_NS`로 나뉘고, world 전환 시 hardware가 자동으로 stack을 바꿉니다. PRIMASK, BASEPRI 같은 mask register도 두 벌입니다. NS에서 IRQ를 막아도 Secure IRQ는 계속 들어옵니다.

## Memory 분할 — SAU와 IDAU

메모리 영역마다 *Secure / Non-Secure / Non-Secure Callable* 셋 중 하나의 attribute가 붙습니다. 이 attribute를 결정하는 두 unit이 SAU와 IDAU입니다.

```text
Flash:
  0x0C00_0000 ~ 0x0C0F_FFFF : Secure
  0x0800_0000 ~ 0x080F_FFFF : Non-Secure
  (같은 물리 flash의 alias)

SRAM:
  0x3000_0000 ~ 0x3001_FFFF : Secure
  0x2000_0000 ~ 0x2001_FFFF : Non-Secure

Peripheral:
  TRNG, Crypto : Secure
  GPIO, UART   : Non-Secure (또는 NSC)
```

같은 물리 주소가 *bit 28을 통해 두 alias*로 보입니다. `0x0800_0000`은 NS view, `0x0C00_0000`은 S view입니다. 컴파일러는 `-mcmse` 옵션으로 각 코드가 어떤 world에 속하는지 인식하고 적절한 alias로 접근하도록 코드를 생성합니다.

**SAU(Security Attribution Unit)** 는 software가 설정하는 region table입니다.

```c
/* Secure firmware에서 SAU 초기화 */
void sau_init(void) {
    SAU->RNR  = 0;
    SAU->RBAR = 0x0800'0000;
    SAU->RLAR = 0x080F'FFE0 | SAU_RLAR_ENABLE_Msk;        /* NS region */

    SAU->RNR  = 1;
    SAU->RBAR = 0x0C03'8000;
    SAU->RLAR = 0x0C03'BFE0 | SAU_RLAR_ENABLE_Msk
                            | SAU_RLAR_NSC_Msk;            /* NSC veneer */

    SAU->CTRL = SAU_CTRL_ENABLE_Msk;
}
```

**IDAU(Implementation Defined Attribution Unit)** 는 chip vendor가 hardware로 고정하는 region table입니다. STM32L5, nRF5340 같은 칩이 자체 IDAU를 제공해 *전형적 partition*을 기본값으로 설정합니다. SAU 결과와 IDAU 결과의 *더 secure한 쪽*이 최종 attribute가 됩니다.

## NSC Veneer — 합법 Cross-World Call

NS 코드가 Secure 함수를 호출하려면 *Non-Secure Callable* 영역에 놓인 veneer를 거쳐야 합니다. veneer 안에는 `SG`(Secure Gateway) 명령이 있고, 이 명령만이 NS → S 전환의 합법 진입점입니다.

```text
NS 코드가 secure_function() 호출
  ↓
NSC 영역의 veneer 진입 (SG instruction)
  ↓ hardware가 secure mode로 전환
  ↓
실제 Secure 함수 실행
  ↓
BXNS 명령으로 NS 복귀
```

컴파일러가 이 과정을 자동화합니다.

```c
/* Secure side — entry function 정의 */
#include <arm_cmse.h>

__attribute__((cmse_nonsecure_entry))
psa_status_t secure_aes_encrypt(const uint8_t *in, size_t in_len,
                                uint8_t *out, size_t out_size,
                                size_t *out_len) {
    /* NS pointer 검증 */
    if (cmse_check_address_range((void*)in, in_len, CMSE_NONSECURE) == NULL ||
        cmse_check_address_range(out, out_size, CMSE_NONSECURE | CMSE_MPU_READWRITE) == NULL) {
        return PSA_ERROR_INVALID_ARGUMENT;
    }

    return psa_aead_encrypt(/* ... */);
}
```

`cmse_nonsecure_entry` 속성이 붙은 함수는 *NSC 영역에 veneer가 자동 생성*되고, NS 측에서는 평범한 extern 선언으로 호출할 수 있습니다.

```c
/* Non-Secure side — 평범한 호출처럼 보임 */
extern psa_status_t secure_aes_encrypt(const uint8_t *in, size_t in_len,
                                       uint8_t *out, size_t out_size,
                                       size_t *out_len);

void ns_task(void) {
    uint8_t pt[64] = { /* ... */ };
    uint8_t ct[80];
    size_t  ct_len;

    psa_status_t s = secure_aes_encrypt(pt, sizeof(pt), ct, sizeof(ct), &ct_len);
    if (s == PSA_SUCCESS) {
        send_over_wire(ct, ct_len);
    }
}
```

링크 단계에서 컴파일러는 두 산출물을 만듭니다. Secure firmware ELF와 *NS측이 link해야 할 veneer import library*(`.o`)입니다. NS firmware는 이 import library를 link해 veneer 주소를 가져옵니다.

## NS Pointer 검증 — `cmse_check_address_range`

NS가 넘긴 pointer를 Secure가 검증 없이 dereference하면 *권한 분리가 무너집니다*. NS가 secret이 있는 Secure 주소를 buf로 넘기면, Secure가 그 주소에 평문을 쓰거나 거기서 읽어 NS에 돌려 줄 위험이 있습니다.

`arm_cmse.h`가 제공하는 `cmse_check_address_range`가 *해당 주소 범위가 정말 NS에 속하는지*를 hardware 도움으로 확인합니다. TT(Test Target) 명령을 통해 SAU/IDAU의 attribute를 직접 조회합니다.

```c
void *p = cmse_check_address_range(ns_buf, len,
                                   CMSE_NONSECURE | CMSE_MPU_READWRITE);
if (p == NULL) {
    return PSA_ERROR_INVALID_ARGUMENT;
}
```

Linux의 `copy_from_user`와 같은 사상으로, *user/kernel pointer 분리*가 NS/S 분리로 옮겨 온 것입니다.

## TF-M — ARM 공식 Secure Firmware

**Trusted Firmware-M**(TF-M)은 ARM이 공식으로 유지하는 Secure World reference implementation입니다. Apache 2.0 오픈소스로 공개되어 있고, STM32L5/U5, nRF5340, MPS3 등 대부분의 Cortex-M33 보드가 TF-M 포팅을 제공합니다.

```text
TF-M 구성:
  BL2 (MCUboot 기반)        boot stage 2, 서명 검증
  TF-M Core                 SPM (Secure Partition Manager)
  Crypto partition          PSA Crypto API 구현 (Mbed TLS 기반)
  ITS partition             Internal Trusted Storage
  PS partition              Protected Storage (encrypted at rest)
  Attestation partition     EAT/CWT 토큰 생성
  Firmware Update partition PSA FWU API
```

NS application은 *PSA API*만 호출합니다. PSA API는 TF-M에 의해 NSC veneer로 노출되고, 내부에서는 Secure Partition Manager가 적절한 secure partition으로 IPC를 보냅니다. 즉 NS 입장에서는 *단순한 함수 호출*이지만, 내부는 *RPC over NSC*입니다.

## PSA Crypto API — Vendor 독립 표준

```c
#include <psa/crypto.h>

void provision_and_use_key(const uint8_t *key_material) {
    psa_crypto_init();

    psa_key_attributes_t attr = PSA_KEY_ATTRIBUTES_INIT;
    psa_set_key_usage_flags(&attr, PSA_KEY_USAGE_ENCRYPT | PSA_KEY_USAGE_DECRYPT);
    psa_set_key_lifetime(&attr, PSA_KEY_LIFETIME_PERSISTENT);
    psa_set_key_id(&attr, 0x1234);
    psa_set_key_algorithm(&attr, PSA_ALG_GCM);
    psa_set_key_type(&attr, PSA_KEY_TYPE_AES);
    psa_set_key_bits(&attr, 256);

    psa_key_id_t kid;
    psa_import_key(&attr, key_material, 32, &kid);

    uint8_t nonce[12]   = { /* ... */ };
    uint8_t plain[128]  = { /* ... */ };
    uint8_t cipher[144];
    size_t  cipher_len;

    psa_aead_encrypt(kid, PSA_ALG_GCM,
                     nonce, sizeof(nonce),
                     NULL, 0,
                     plain, sizeof(plain),
                     cipher, sizeof(cipher), &cipher_len);
}
```

핵심은 *key handle만 NS에 노출되고 key material은 Secure에 머문다*는 점입니다. `psa_import_key`가 반환하는 `kid`는 일종의 capability이며, NS는 이 핸들로 *operation만 요청*합니다. AES key를 read해 가는 API는 존재하지 않습니다.

## Initial Attestation — Device 신원 증명

OTA 서버 입장에서는 *이 디바이스가 진짜 우리 제품이고 펌웨어 무결성이 보존된 상태인가*를 확인해야 합니다. TF-M의 attestation service가 이 토큰을 만들어 줍니다.

```c
uint8_t challenge[32];
get_random(challenge, sizeof(challenge));

uint8_t token[1024];
size_t  token_len;
psa_initial_attest_get_token(challenge, sizeof(challenge),
                             token, sizeof(token), &token_len);

upload_to_server(challenge, token, token_len);
```

토큰은 CBOR Web Token(CWT) 또는 Entity Attestation Token(EAT) 형식이며, *device identity와 SW 측정값*(BL2, TF-M, NS image 각각의 hash)을 포함합니다. Secure attestation key로 서명되어 서버가 검증할 수 있습니다.

## Secure Boot Chain

```text
1. ROM Boot Loader (RBL)        chip mask ROM, 변경 불가
   └ root key hash로 BL2 서명 검증
2. Secure Bootloader (BL2/MCUboot)
   └ TF-M secure firmware 서명 검증
3. TF-M Secure firmware
   └ Non-Secure application 서명 검증
4. Non-Secure RTOS + application 실행
```

각 단계는 *다음 단계의 서명을 검증*한 뒤에만 jump합니다. trust anchor는 eFuse에 *한 번만 굽힌* root key hash입니다. provisioning 단계에서 한 번 굽고, 그 뒤로는 변경할 수 없습니다. 이 chain 전체를 **measured boot**로 부르고, 단계별 hash가 attestation token에 그대로 들어갑니다.

## PSA Certified — 보안 인증 등급

PSA Certified는 TF-M을 채택한 디바이스가 받을 수 있는 보안 인증 프로그램입니다.

| Level | 평가 방식 | 대상 |
|---|---|---|
| Level 1 | self-assessment 10개 질문 | 입문, 일반 IoT |
| Level 2 | lab testing, 일부 side-channel | smart meter, gateway |
| Level 3 | DPA, glitching 같은 고급 attack 저항 | payment, automotive |
| Level 4 | Common Criteria EAL4+ 수준 | smart card, HSM |

ETSI EN 303 645, NIST IR 8259, EU CRA(Cyber Resilience Act) 같은 규제·표준과 매핑되어 *시장 진입 요건*으로 점점 자리잡고 있습니다.

## SoC 사례 — Cortex-M33 칩들

```text
STM32L5 / STM32U5 (ST):
  TF-M 공식 지원, CubeIDE에 dual-project template
  Secure firmware 프로젝트 + Non-Secure RTOS 프로젝트가 함께 빌드

nRF5340 / nRF54L15 (Nordic):
  Application core (M33) + Network core (BLE controller)
  Application core에 TrustZone, TF-M 또는 Zephyr TF-M 통합

NXP LPC55Sxx / MCXNxxx:
  PUF(Physically Unclonable Function) 기반 root key
  TF-M 포팅 제공

Microchip SAM L11 / PIC32CM LS:
  진입형 TrustZone-M, 자체 secure firmware 권장

RP2350 (Raspberry Pi):
  dual Cortex-M33, TrustZone 지원
  Secure boot, OTP 기반 root key
```

## 자동차 ECU — TrustZone 활용

자동차 ECU는 OTA 서명 검증, V2X 인증서 보관, immobilizer key 같은 보안 자원을 별도 *HSM* 칩이나 Cortex-M33의 TrustZone으로 처리합니다.

```text
NXP S32K3 family:
  M7 core    일반 control loop, AUTOSAR application
  M33 core   TrustZone, HSM 역할
              ├ secure key storage
              ├ OTA signature verify
              └ secure debug

i.MX 8M Plus:
  A53 cluster   Linux + OP-TEE (TrustZone-A)
  M7 core       deterministic control
  공동 attestation chain
```

## Cross-World Call Overhead

NSC veneer 호출은 평범한 함수 호출보다 비쌉니다.

```text
Cortex-M33 @ 110 MHz 측정:
  일반 함수 호출         : ~5 cycle
  NSC veneer 호출 (NS→S) : ~25 cycle (SG + 검증 + stacking)
  NSC return (S→NS)     : ~20 cycle
  cmse_check_address    : ~10 cycle (TT 명령 1회)
  ────────────────────────────────────────
  최소 round-trip       : ~55 cycle (≈0.5 µs)

PSA AES-GCM 128 B 암호화 : ~12000 cycle (≈109 µs)
PSA ECDSA P-256 서명     : ~3.5 M cycle (≈32 ms, HW accel 없을 때)
```

veneer 자체 비용은 크지 않습니다. 대부분의 시간은 *실제 crypto 연산*에 들어가고, 그래서 hardware crypto accelerator(AES-CCM, SHA, PKA)가 있는 칩이 권장됩니다.

## 자주 보는 함정과 안티패턴

> 경고 — Secure pointer를 NS로 반환

```c
__attribute__((cmse_nonsecure_entry))
const char *secure_get_secret_ptr(void) {
    return secret_string;        /* Secure flash 주소 — NS가 read fault */
}
```

NS에 Secure 영역의 pointer를 넘기면 NS는 그 주소에 접근하는 순간 fault를 받습니다. Secure는 *복사해서* 전달해야 합니다. 비밀 자체라면 *복사도 안 합니다*.

> 경고 — NS pointer 검증 누락

```c
__attribute__((cmse_nonsecure_entry))
void secure_log(const char *msg) {
    secure_print(msg);           /* msg가 Secure 주소면? */
}
```

`cmse_check_address_range`로 *NS 영역에 속하는지* 확인하지 않으면 NS가 Secure 주소를 넘겨 *secret을 읽어내는 oracle*로 악용할 수 있습니다.

> 경고 — Heap을 두 world에서 공유

```c
/* Secure가 malloc, NS가 free → heap 손상 */
```

Secure와 NS는 *각자의 heap*을 가져야 합니다. NSC veneer가 buffer를 반환해야 한다면 *caller가 제공한 NS buffer에 복사*하는 형태로 설계합니다.

> 경고 — SAU와 MPU 설정 모순

```c
SAU :  region NS attribute
MPU_NS : 같은 region을 unmapped 처리
```

두 unit이 모순되면 NS application은 *접근할 수 없는 영역*이 됩니다. vendor가 제공하는 SAU/MPU 설정 도구(STM32CubeIDE의 Trust Zone Manager 등)를 쓰면 모순을 잡아 줍니다.

> 경고 — `cmse_nonsecure_entry` 누락

```c
int my_entry(int x) { return x + 1; }   /* veneer 자동 생성 안 됨 */
```

속성이 없으면 NSC 영역에 veneer가 만들어지지 않고 NS에서는 호출 자체가 불가능합니다. `-mcmse` 옵션과 속성을 함께 챙겨야 합니다.

## 정리

- TrustZone-M은 *같은 Cortex-M33 코어 위에 Secure World와 Non-Secure World*를 hardware로 분리합니다.
- 메모리 attribute는 SAU(software)와 IDAU(chip vendor)가 결정하며, 두 결과 중 *더 secure한 쪽*이 적용됩니다.
- NSC veneer 안의 `SG` 명령만이 *NS → S 전환의 합법 진입점*이며, 컴파일러가 `cmse_nonsecure_entry` 속성으로 자동 생성합니다.
- NS가 넘긴 pointer는 반드시 `cmse_check_address_range`로 *NS 영역인지* 검증한 뒤 dereference합니다.
- TF-M은 ARM 공식 secure firmware로 *PSA Crypto, ITS, PS, Attestation*을 표준화된 API로 제공합니다.
- secure boot chain은 *ROM → BL2 → TF-M → NS*의 단계별 서명 검증으로 구성되며, eFuse의 root key hash가 trust anchor입니다.
- NSC 호출 자체는 수십 cycle 수준이고, 비용 대부분은 *실제 crypto 연산*이 차지하므로 hardware accelerator의 가치가 큽니다.
- PSA Certified Level 1~4가 *시장 진입 보안 인증*의 표준 등급으로 자리잡고 있습니다.

다음 편은 [4-12 AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)에서 *서로 다른 코어가 서로 다른 OS를 돌리는* heterogeneous SoC를 다룹니다.

## 관련 항목

- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-10: System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)
- [4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded C++ 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
