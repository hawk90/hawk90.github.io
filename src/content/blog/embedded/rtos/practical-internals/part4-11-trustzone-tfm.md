---
title: "4-11: TrustZone·TF-M — Secure/Non-Secure·NSC Veneer·PSA"
date: 2026-05-19T23:00:00
description: "Cortex-M33/M55/M85 TrustZone. TF-M secure firmware. Non-secure RTOS·NSC veneer call·PSA Certified."
series: "Practical RTOS Internals"
seriesOrder: 43
tags: [trustzone, tf-m, security, cortex-m33, psa, secure-boot]
draft: true
---

## 한 줄 요약

> **"TrustZone = Secure·Non-Secure 두 세계"** — 같은 CPU에 *격리된 두 OS*.

## ARM TrustZone for Cortex-M

```text
Cortex-M33/M55/M85 — TrustZone for Armv8-M

Secure World (S):
  - TF-M (Trusted Firmware-M) 또는 자체 firmware
  - Crypto·secure storage·attestation
  - Secure boot chain root
  
Non-Secure World (NS):
  - FreeRTOS·Zephyr·application
  - 일반 코드
  
같은 CPU·메모리·peripheral — *attribute로 분리*
```

## Memory 영역 분리

```text
Flash:
  0x00000000 - 0x000FFFFF: Secure (S)
  0x10000000 - 0x101FFFFF: Non-secure (NS)
  
SRAM:
  0x30000000 - 0x300FFFFF: S
  0x20000000 - 0x201FFFFF: NS
  
Peripheral:
  RNG·crypto: S
  GPIO·UART: NS (또는 NSC)
```

같은 물리 주소에 *서로 다른 alias* — `0x00000000` (S) ↔ `0x10000000` (NS).

## SAU + IDAU

```c
/* SAU — Security Attribution Unit */
SAU->RNR = 0;
SAU->RBAR = 0x10000000;
SAU->RLAR = 0x101FFFFF | SAU_RLAR_ENABLE_Msk | SAU_RLAR_NSC_Msk;

/* IDAU — Implementation Defined */
/* 칩별로 — vendor 고정 partition */
```

Region별 *S·NS·NSC (Non-Secure Callable)* attribute.

## NSC Veneer — 합법 Cross-World Call

```text
Non-Secure 코드 → Secure 함수 호출
  1. NS 코드 → NSC 영역의 *veneer* 호출
  2. Veneer 안 *SG instruction* — Secure 전환
  3. Secure 함수 실행
  4. BXNS instruction — NS 복귀
```

```c
/* Secure side */
__attribute__((cmse_nonsecure_entry))
int secure_function(int arg) {
    /* Secure context */
    return process(arg);
}

/* Non-secure side */
extern int secure_function(int arg);   /* veneer alias */
int result = secure_function(42);   /* automatic SG */
```

`cmse_nonsecure_entry` — secure entry point 명시. 컴파일러가 *SG instruction* 자동 삽입.

## TF-M (Trusted Firmware-M)

```text
TF-M architecture:
  - Secure Boot — 첫 단계 코드 서명 검증
  - PSA Crypto Service — AES·RSA·ECDH·HMAC
  - PSA Internal Trusted Storage (ITS) — 키·credential
  - PSA Protected Storage (PS) — encrypted at rest
  - PSA Initial Attestation — device 신원 증명
  - Secure Firmware Update — OTA 검증
```

ARM 공식 reference implementation. 오픈소스 (Apache 2.0).

## PSA Certified Levels

| Level | 요구 사항 |
|---|---|
| **Level 1** | Self-assessment, 10 questions |
| **Level 2** | Lab testing, side-channel attack 일부 |
| **Level 3** | 고급 attack 저항 (DPA, glitching) |
| **Level 4** | Common Criteria EAL4+ 수준 |

자동차·IoT 보안 인증의 표준. ETSI EN 303 645 등과 연계.

## PSA Crypto API

```c
#include <psa/crypto.h>

psa_status_t status;
psa_key_id_t key_id;
psa_key_attributes_t attr = PSA_KEY_ATTRIBUTES_INIT;

psa_set_key_usage_flags(&attr, PSA_KEY_USAGE_ENCRYPT);
psa_set_key_algorithm(&attr, PSA_ALG_GCM);
psa_set_key_type(&attr, PSA_KEY_TYPE_AES);
psa_set_key_bits(&attr, 256);

uint8_t key[32] = { /* ... */ };
psa_import_key(&attr, key, sizeof(key), &key_id);

/* Encrypt */
uint8_t ciphertext[1024];
size_t out_len;
psa_aead_encrypt(key_id, PSA_ALG_GCM,
                 nonce, 12,
                 NULL, 0,
                 plaintext, plaintext_len,
                 ciphertext, sizeof(ciphertext), &out_len);
```

표준화된 crypto API — vendor 독립.

## Initial Attestation

```c
uint8_t token[1024];
size_t token_len;
psa_initial_attest_get_token(challenge, ch_len, token, sizeof(token), &token_len);
```

Token = CBOR Web Token (CWT) 또는 EAT. *device identity + SW state*을 server에 증명. OTA 서버가 검증.

## Secure Boot Chain

```text
1. ROM Boot Loader (RBL) — chip mask ROM
   ↓ verify
2. Secure Bootloader (BL2) — TF-M
   ↓ verify
3. Secure firmware (TF-M secure partition)
   ↓ verify
4. Non-secure application (RTOS + app)
```

각 단계 — 다음 단계 *서명 검증*. Trust anchor = eFuse에 저장된 *root key hash*.

## STM32L5 / nRF5340 — TrustZone-M

```c
/* STM32L562 — Secure + Non-Secure */
/* CubeIDE — *두 프로젝트*:
   - L562_S: TF-M (또는 자체 secure firmware)
   - L562_NS: FreeRTOS application
*/

/* Both flash partition together */
```

nRF5340 (dual-Cortex-M33):
- Application core: NS RTOS
- Network core: BLE controller
- TrustZone 둘 다 — secure key in flash

## Cortex-M33 — Stack 별도

```text
Secure world stacks:
  MSP_S, PSP_S
  
Non-Secure world stacks:
  MSP_NS, PSP_NS

Hardware 자동 switch on world transition.
```

## ARMv8-A — TrustZone-A (다른)

```text
Cortex-A55+ — TrustZone-A
  EL3: Secure Monitor (TF-A)
  EL1S: Secure OS (OP-TEE)
  EL0S: TA (Trusted Application)
  
  EL2: Hypervisor (optional)
  EL1: Linux kernel
  EL0: user apps
```

OP-TEE — 표준 Trusted Execution Environment for Cortex-A.

## SoC 사례 — 자동차 ECU

```text
NXP S32K3 (Cortex-M7 + Cortex-M33):
  - M7: 일반 control
  - M33 TrustZone: secure key store, OTA verify
  
i.MX 8M Plus (Cortex-A53 + M7):
  - A53: Linux + OP-TEE
  - M7: deterministic control
  - 둘 다 TrustZone with attestation
```

## OTA 보안 — TF-M Secure FW Update

```text
1. Server signs new firmware
2. Device receives + stores in non-active partition
3. TF-M Bootloader verifies signature
4. Rollback counter check
5. Boot new firmware
6. Confirm + flush old
```

A/B partition + signing + monotonic counter — *rollback attack* 방지.

## 자주 하는 실수

> ⚠️ Secure ↔ Non-Secure pointer 공유

```c
/* Secure side */
char *secret = "password";

/* NS side */
char *p = get_secret_pointer();   /* ← veneer return */
printf("%s", p);   /* ← NS code가 S memory access — fault */
```

→ Secure가 *copy해서 return*.

> ⚠️ Heap을 양쪽 모두 사용

```c
/* Secure malloc + Non-secure free → corruption */
```

→ 각 world 별 *별도 heap*.

> ⚠️ SAU·MPU 모순 설정

```c
SAU: region NS
MPU: region privileged-only
/* → application 어디서 access 가능? */
```

→ 일관된 설정. Vendor 도구 사용.

> ⚠️ Veneer 직접 작성

```c
/* compile w/o cmse_nonsecure_entry */
int my_func(int x) { ... }   /* ← veneer 자동 생성 안 됨 */
```

→ `__attribute__((cmse_nonsecure_entry))` + `-mcmse`.

## 정리

- TrustZone-M = **S·NS 두 세계**, 같은 CPU.
- **NSC veneer** + `SG` instruction = 합법 cross-world call.
- **TF-M** = ARM 공식 secure firmware reference.
- **PSA Crypto·Storage·Attestation** API.
- 자동차·IoT 보안 — *secure boot + attestation*.
- Cortex-A는 **TrustZone-A + OP-TEE**.

다음 편은 **OpenAMP**.

## 관련 항목

- [4-10: System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)
- [4-12: OpenAMP AMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
