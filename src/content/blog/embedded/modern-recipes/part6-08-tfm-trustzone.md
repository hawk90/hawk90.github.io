---
title: "6-08: TF-M·TrustZone — Cortex-M Secure Firmware 통합"
date: 2026-05-21T08:00:00
description: "TF-M 통합 가이드. SPE/NSPE, secure partition, PSA Crypto/Storage/Attestation, secure boot."
series: "Modern Embedded Recipes"
seriesOrder: 38
tags: [recipes, security, tfm, trustzone, psa, cortex-m33, secure-boot]
draft: true
---

## 한 줄 요약

> **"TF-M = Cortex-M33+ 표준 secure firmware"** — PSA Certified·2025 IoT 의무.

## 배경 — 왜 TF-M

```text
2024+ IoT 보안 의무:
  EU CRA (Cyber Resilience Act) 2024
  UK PSTI Act 2024
  US Cyber Trust Mark
  
요구:
  - Secure boot
  - Encrypted storage
  - Device attestation
  - Secure update
  
→ TF-M이 표준 reference.
```

## SPE·NSPE 분리

```text
Cortex-M33+ TrustZone-M:
  
  Secure Processing Environment (SPE):
    TF-M Core + Secure Partitions
    Crypto·Storage·Attestation
    
  Non-Secure Processing Environment (NSPE):
    RTOS (FreeRTOS·Zephyr·mbedOS)
    Application
    
  Boundary:
    NSC veneer (PSA Function ID)
    SAU/IDAU memory partition
```

## TF-M Build

```bash
git clone https://github.com/TrustedFirmware-M/trusted-firmware-m
cd trusted-firmware-m

mkdir build && cd build
cmake -DTFM_PLATFORM=stm/nucleo_l552ze_q \
      -DTFM_PROFILE=profile_medium \
      -DTEST_NS=ON ..
cmake --build . -- install
```

산출물:
- `tfm_s.bin` — Secure firmware
- `tfm_ns.bin` — Non-Secure (사용자 application)
- `bl2.bin` — MCUboot (2nd stage bootloader)

## SPE Partition 추가

```c
/* manifest yaml */
{
  "name": "TFM_SP_MYSERVICE",
  "type": "PSA-ROT",
  "priority": "NORMAL",
  "entry_point": "tfm_my_service_init",
  "stack_size": "0x0800",
  "services": [{
    "name": "TFM_MY_SERVICE",
    "sid": "0x00000200",
    "signal": "MY_SIGNAL",
    "non_secure_clients": true
  }]
}
```

```c
/* Service implementation */
psa_status_t tfm_my_service_init(void) {
    psa_signal_t signals;
    while (1) {
        signals = psa_wait(PSA_WAIT_ANY, PSA_BLOCK);
        if (signals & MY_SIGNAL) {
            psa_msg_t msg;
            psa_get(MY_SIGNAL, &msg);
            handle_request(&msg);
            psa_reply(msg.handle, PSA_SUCCESS);
        }
    }
}
```

PSA IPC — *async message-passing* 모델.

## NSPE Client 호출

```c
/* Non-secure side */
#include "psa/client.h"

#define MY_SERVICE_SID  0x00000200

psa_handle_t handle = psa_connect(MY_SERVICE_SID, 1);

psa_invec  in[1]  = { { input, input_len } };
psa_outvec out[1] = { { output, output_size } };

psa_status_t s = psa_call(handle, PSA_IPC_CALL, in, 1, out, 1);

psa_close(handle);
```

PSA standard — vendor-agnostic IPC.

## PSA Crypto

```c
psa_crypto_init();

/* Key generation */
psa_key_attributes_t attr = PSA_KEY_ATTRIBUTES_INIT;
psa_set_key_type(&attr, PSA_KEY_TYPE_ECC_KEY_PAIR(PSA_ECC_FAMILY_SECP_R1));
psa_set_key_bits(&attr, 256);
psa_set_key_usage_flags(&attr, PSA_KEY_USAGE_SIGN_MESSAGE | PSA_KEY_USAGE_EXPORT);
psa_set_key_algorithm(&attr, PSA_ALG_ECDSA(PSA_ALG_SHA_256));
psa_set_key_lifetime(&attr, PSA_KEY_LIFETIME_PERSISTENT);
psa_set_key_id(&attr, 0x1001);

psa_key_id_t key_id;
psa_generate_key(&attr, &key_id);

/* Sign */
uint8_t sig[64];
size_t sig_len;
psa_sign_message(key_id, PSA_ALG_ECDSA(PSA_ALG_SHA_256),
                  msg, msg_len, sig, sizeof(sig), &sig_len);
```

Private key — *NSPE에 노출 안 됨*. `key_id`는 *capability*. Sign·encrypt만 위임.

## PSA Internal Trusted Storage (ITS)

```c
psa_status_t psa_its_set(
    psa_storage_uid_t uid,
    size_t data_length,
    const void *p_data,
    psa_storage_create_flags_t create_flags);

psa_status_t psa_its_get(
    psa_storage_uid_t uid,
    size_t data_offset,
    size_t data_size,
    void *p_data,
    size_t *p_data_length);
```

ITS — *Secure-only storage*. Key·credential·counter. Replay-protected.

## PSA Protected Storage (PS)

```c
psa_ps_set(uid, len, data, PSA_STORAGE_FLAG_NONE);
psa_ps_get(uid, 0, len, buf, &out_len);
```

PS — *encrypted at rest*. Flash 외부 noise·tampering 차단.

## Initial Attestation

```c
psa_initial_attest_get_token(
    challenge, challenge_size,
    token, token_size, &token_actual_size);

/* Token = CBOR Web Token (CWT) / EAT */
/* Contains:
   - Instance ID (device identity)
   - Implementation ID
   - SW measurements (firmware hash)
   - Lifecycle state
   - Nonce
   Signed with device key.
*/
```

OTA server·cloud — token *verify* + 서비스 권한 결정. Zero-trust IoT.

## Secure Boot — MCUboot (BL2)

```text
Boot chain:
  Reset → ROM (immutable) → BL2 (MCUboot)
                              ↓ verify signature
                            S firmware (TF-M)
                              ↓ verify
                            NS firmware (app)

각 단계:
  Signature verify
  Anti-rollback counter check
  → fail → halt 또는 recovery
```

MCUboot — TF-M 표준 BL2.

## Anti-Rollback

```c
/* Firmware version embedded */
const uint32_t firmware_version = 0x010203;   /* 1.2.3 */

/* MCUboot — anti-rollback counter (NV counter) */
PSA_NV_COUNTER_FW_VERSION = 0x010202;
/* 새 firmware version >= NV counter — 통과 */
/* < — rollback attempt, reject */
```

Old version으로 *downgrade attack* 방지.

## A/B Update

```text
Flash layout:
  Slot 0 (primary)   — current firmware
  Slot 1 (secondary) — staging area
  Scratch            — swap working
  
Update:
  Server → secondary
  TF-M verify
  Swap (slot 0 ↔ slot 1)
  Boot new
  Confirm or revert
```

MCUboot — swap·overwrite·direct-xip mode.

## SAU·IDAU Configuration

```c
/* Secure firmware initialization */
void sau_init(void) {
    /* Non-Secure flash region */
    SAU->RNR  = 0;
    SAU->RBAR = 0x08000000;
    SAU->RLAR = 0x080FFFFF | SAU_RLAR_ENABLE_Msk;
    
    /* NSC veneer table */
    SAU->RNR  = 1;
    SAU->RBAR = 0x0C038000;
    SAU->RLAR = 0x0C03BFFF | SAU_RLAR_ENABLE_Msk | SAU_RLAR_NSC_Msk;
    
    /* Non-Secure SRAM */
    SAU->RNR  = 2;
    SAU->RBAR = 0x20000000;
    SAU->RLAR = 0x2001FFFF | SAU_RLAR_ENABLE_Msk;
    
    SAU->CTRL = SAU_CTRL_ENABLE_Msk;
}
```

Boot 초기 — *SAU enable* + region setup. 이후 NS firmware load.

## PSA Certified Levels

```text
Level 1 (Self-Assessment):
  - 10 question 자가 평가
  - 기본 보안 hygiene
  
Level 2 (Lab Test):
  - 외부 lab 테스트
  - 일부 side-channel 검증
  - 8 day evaluation
  
Level 3 (Advanced):
  - 고급 attack 저항 (DPA·glitching)
  - 30 day evaluation
  
Level 4 (Common Criteria EAL4+):
  - 정부·금융 grade
```

EU CRA·UK PSTI — *Level 1 minimum*. 일부 critical = Level 2+.

## STM32L5·U5 — TF-M Reference

```text
STM32L562·STM32U585:
  Cortex-M33 + TrustZone
  ST에서 TF-M port 제공
  STM32CubeIDE — *2 project*:
    - L562_S (Secure firmware)
    - L562_NS (Non-Secure app)
    
  Single flash image (signed)
```

## nRF5340 — BLE + TF-M

```text
Nordic nRF5340:
  Dual Cortex-M33:
    Application core (M33) — TF-M·app
    Network core (M33)     — BLE controller
  
TF-M services:
  Key storage (LE Secure Connection key)
  Device attestation
  OTA verification
```

BLE + secure provisioning.

## TF-M Performance

```text
Cortex-M33 @ 80 MHz:
  PSA Crypto AES-128 GCM: 200 KB/s
  ECDSA P-256 sign:        50 ms
  RSA-2048 sign:           500 ms
  Attestation token:       100 ms
```

PSA Crypto = Mbed TLS 기반. Hardware accelerator 있으면 *10-50x* 빠름.

## Profile Selection

```text
TFM_PROFILE_SMALL:
  - 작은 Cortex-M33 (96 KB+)
  - Minimal partitions
  - Crypto only
  
TFM_PROFILE_MEDIUM:
  - 일반 (256 KB+)
  - Crypto + ITS + PS
  
TFM_PROFILE_LARGE:
  - Full (512 KB+)
  - + Attestation + custom partitions
```

자원에 맞춰 *build-time profile 선택*.

## 자주 하는 실수

> ⚠️ NS 메모리 secure로 access

```c
/* NS code */
*(uint32_t*)0x0C000000 = 0xDEADBEEF;   /* secure address — MemManageFault */
```

→ NS는 NS 영역만.

> ⚠️ Veneer 직접 호출

```c
SG;
secure_func();   /* manual SG — 컴파일러 자동 wrap 필요 */
```

→ `cmse_nonsecure_entry` annotation.

> ⚠️ Heap을 양쪽

```c
/* Secure malloc + NS free */
/* → corruption */
```

→ separate heaps.

> ⚠️ Key NSPE 노출

```c
uint8_t secret_key[32];
psa_export_key(key_id, secret_key, ...);   /* ✗ — capability 다시 secure에만 */
```

→ key handle만 사용.

## 정리

- TF-M = **Cortex-M33+ 표준 secure firmware**.
- **SPE·NSPE 분리**, NSC veneer로 cross-world call.
- **PSA Crypto·ITS·PS·Attestation** API.
- **MCUboot** = secure boot + anti-rollback + A/B.
- 2025 EU·UK·US IoT 보안 의무 — PSA Certified Level 1+.
- STM32L5/U5·nRF5340 — TF-M 표준 platform.

다음 편은 **Matter·Thread**.

## 관련 항목

- [6-07: 온디바이스 LLM](/blog/embedded/modern-recipes/part6-07-llama-cpp-edge)
- [6-09: Matter·Thread](/blog/embedded/modern-recipes/part6-09-matter-thread)
- [RTOS 4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
