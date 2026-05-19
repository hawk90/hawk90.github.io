---
title: "6-08: TF-M·TrustZone — Cortex-M33 Secure Firmware·PSA·MCUboot"
date: 2026-05-21T08:00:00
description: "Cortex-M33+ TrustZone-M 위에 TF-M으로 secure firmware를 구성하는 패턴. SPE/NSPE, PSA Crypto/ITS/Attestation, MCUboot secure boot를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 38
tags: [recipes, security, tfm, trustzone, psa, cortex-m33, mcuboot]
---

## 한 줄 요약

> **"TF-M은 Cortex-M33+ 보드의 표준 secure firmware입니다."** PSA Certified 인증이 2024 EU CRA·UK PSTI에 사실상 강제되면서 IoT MCU project의 default가 됐습니다. Crypto·storage·attestation을 secure side에 두고 RTOS·앱은 non-secure side에서 돌립니다.

## 어떤 상황에서 쓰나

IoT sensor, smart lock, gateway, wearable, BLE node, industrial controller처럼 *공격면이 있는 connected MCU device* 모두가 대상입니다. 2024년 이후 다음 규제가 본격화되면서 PSA Certified가 거의 의무가 됐습니다.

```text
EU Cyber Resilience Act (CRA) 2024 발효, 2027 본격 시행
UK PSTI Act 2024 발효
US Cyber Trust Mark 2024-25 점진 적용
```

요구사항은 secure boot, encrypted storage, device attestation, secure update입니다. TF-M이 이 모두를 reference로 제공하기 때문에 vendor SDK(STM32Cube·nRF Connect·NXP MCUXpresso)가 모두 TF-M을 끼워 줍니다.

## 핵심 개념

Cortex-M33/M55/M85는 *TrustZone-M*이라는 hardware mechanism으로 *Secure*와 *Non-Secure* 두 world를 가집니다.

```text
Secure Processing Environment (SPE)
  TF-M core + secure partitions
  Crypto, Internal Trusted Storage, Protected Storage, Attestation
  Boot ROM에서 첫 부팅, 메모리·peripheral 일부를 secure로 표시

Non-Secure Processing Environment (NSPE)
  RTOS (FreeRTOS, Zephyr, mbedOS)
  Application
  PSA API client로 SPE 서비스 호출
```

Memory와 peripheral은 *SAU/IDAU + MPC/PPC*로 region별 secure 여부를 표시합니다. NSPE가 secure 영역에 접근하면 MemManageFault가 발생합니다.

SPE↔NSPE 호출은 *NSC veneer*라는 special function을 거칩니다.

```text
Non-secure 코드
  ↓ BL nsc_function
NSC veneer (secure side, NSCallable 영역)
  ↓ SG (secure gateway) instruction → world switch
SPE service
  ↑ BXNS lr → world switch back
Non-secure 복귀
```

`SG` instruction이 *유일한 entry point*입니다. NSPE는 NSC veneer 외에는 secure 영역에 진입할 수 없습니다.

PSA(Platform Security Architecture)는 ARM이 정의한 *vendor-agnostic security API*입니다.

```text
PSA Crypto         AES, ECDSA, RSA, key management
PSA Storage        ITS (key·credential), PS (encrypted at rest)
PSA Attestation    device identity + measurement token
PSA Firmware Update over-the-air 표준
```

같은 코드가 STM32·nRF·NXP·Renesas 어디서나 돌도록 설계되어 있습니다.

## 코드 / 실제 사용 예

### TF-M build

```bash
git clone https://github.com/TrustedFirmware-M/trusted-firmware-m
cd trusted-firmware-m

mkdir build && cd build
cmake .. \
    -DTFM_PLATFORM=stm/nucleo_l552ze_q \
    -DTFM_PROFILE=profile_medium \
    -DTEST_NS=ON
cmake --build . -- install
```

산출물은 세 binary입니다.

```text
bl2.bin        MCUboot 2nd-stage bootloader
tfm_s.bin      Secure firmware
tfm_ns.bin     Non-Secure (사용자 앱 자리)
```

ROM bootloader → BL2 → tfm_s → tfm_ns 순으로 chain이 구성됩니다.

### PSA Crypto — key 생성·sign

```c
#include "psa/crypto.h"

psa_crypto_init();

/* Persistent ECDSA key */
psa_key_attributes_t attr = PSA_KEY_ATTRIBUTES_INIT;
psa_set_key_type(&attr, PSA_KEY_TYPE_ECC_KEY_PAIR(PSA_ECC_FAMILY_SECP_R1));
psa_set_key_bits(&attr, 256);
psa_set_key_usage_flags(&attr, PSA_KEY_USAGE_SIGN_MESSAGE);
psa_set_key_algorithm(&attr, PSA_ALG_ECDSA(PSA_ALG_SHA_256));
psa_set_key_lifetime(&attr, PSA_KEY_LIFETIME_PERSISTENT);
psa_set_key_id(&attr, 0x1001);

psa_key_id_t key_id;
psa_generate_key(&attr, &key_id);

/* Sign */
uint8_t sig[64];
size_t  sig_len;
psa_sign_message(key_id, PSA_ALG_ECDSA(PSA_ALG_SHA_256),
                  msg, msg_len, sig, sizeof(sig), &sig_len);
```

Private key는 *NSPE에 export되지 않습니다*. `key_id`만 capability로 받아 sign/encrypt 위임만 가능합니다. NSPE가 침투당해도 key 자체는 보호됩니다.

### PSA Internal Trusted Storage

```c
#include "psa/internal_trusted_storage.h"

/* Write — 한 번만 */
uint8_t device_secret[32] = { /* derived from HUK */ };
psa_its_set(0x100, sizeof(device_secret), device_secret,
             PSA_STORAGE_FLAG_NONE);

/* Read */
uint8_t buf[32];
size_t  out_len;
psa_its_get(0x100, 0, sizeof(buf), buf, &out_len);
```

ITS는 *secure side flash region*에 저장되어 NSPE가 read할 수 없습니다. Replay-protected하게 monotonic counter를 같이 보관해 rollback도 막습니다.

### Protected Storage (encrypted at rest)

```c
#include "psa/protected_storage.h"

psa_ps_set(0x200, sizeof(secret), secret, PSA_STORAGE_FLAG_NONE);
psa_ps_get(0x200, 0, sizeof(buf), buf, &out_len);
```

PS는 *external flash까지 안전*하게 encrypted로 저장합니다. Wire-level dump를 떠도 key 없이는 읽을 수 없습니다.

### Initial Attestation

```c
#include "psa/initial_attestation.h"

uint8_t challenge[32];   /* from server */
get_random(challenge, sizeof(challenge));

uint8_t token[1024];
size_t  token_len;
psa_initial_attest_get_token(
    challenge, sizeof(challenge),
    token, sizeof(token), &token_len);

/* Send token to verifier */
```

Token에는 device identity, firmware hash, lifecycle state, nonce(challenge)가 들어가고 device key로 sign됩니다. Cloud server는 signature와 firmware hash를 verify해 *zero-trust* 정책을 적용합니다.

### NSPE에서 SPE service 호출

```c
#include "psa/client.h"

#define MY_SERVICE_SID 0x00000200

psa_handle_t h = psa_connect(MY_SERVICE_SID, 1);

psa_invec  in[1]  = { { in_buf,  in_len  } };
psa_outvec out[1] = { { out_buf, out_size } };

psa_status_t s = psa_call(h, PSA_IPC_CALL, in, 1, out, 1);

psa_close(h);
```

NSPE는 `psa_connect`/`psa_call`/`psa_close`만 알면 됩니다. 어떤 vendor SoC라도 같은 API입니다.

### Custom secure partition

```yaml
# my_service_manifest.yaml
{
  "name": "TFM_SP_MY_SERVICE",
  "type": "PSA-ROT",
  "priority": "NORMAL",
  "entry_point": "tfm_my_service_init",
  "stack_size": "0x0800",
  "services": [{
    "name": "TFM_MY_SERVICE",
    "sid": "0x00000200",
    "signal": "MY_SIGNAL",
    "non_secure_clients": true,
    "version": 1
  }]
}
```

```c
psa_status_t tfm_my_service_init(void) {
    psa_signal_t signals;
    while (1) {
        signals = psa_wait(PSA_WAIT_ANY, PSA_BLOCK);
        if (signals & MY_SIGNAL) {
            psa_msg_t msg;
            psa_get(MY_SIGNAL, &msg);
            /* msg.in_size / msg.out_size */
            handle_request(&msg);
            psa_reply(msg.handle, PSA_SUCCESS);
        }
    }
}
```

PSA IPC는 message-passing 모델입니다. Async event-driven으로 동작합니다.

### MCUboot — secure boot + A/B

```text
Flash layout:
  0x0800_0000  BL2 (MCUboot)
  0x0801_0000  Slot 0 (primary)    — tfm_s + tfm_ns + manifest
  0x0808_0000  Slot 1 (secondary)  — staging
  0x080F_0000  Scratch
```

```bash
# Sign image
imgtool sign \
    --key root-ec-p256.pem \
    --header-size 0x400 \
    --slot-size 0x70000 \
    --version 1.2.3 \
    --align 8 \
    tfm_s_ns_signed.bin
```

Boot 시 BL2가 manifest signature와 anti-rollback counter를 verify합니다. Pass하면 image로 jump, fail하면 secondary로 fallback하거나 halt합니다.

### SAU 설정

```c
void sau_setup(void) {
    /* Region 0: non-secure flash */
    SAU->RNR  = 0;
    SAU->RBAR = (NS_FLASH_START)        & SAU_RBAR_BADDR_Msk;
    SAU->RLAR = (NS_FLASH_END   - 1)    | SAU_RLAR_ENABLE_Msk;

    /* Region 1: NSC veneer */
    SAU->RNR  = 1;
    SAU->RBAR = (NSC_START)             & SAU_RBAR_BADDR_Msk;
    SAU->RLAR = (NSC_END   - 1)         | SAU_RLAR_ENABLE_Msk
                                          | SAU_RLAR_NSC_Msk;

    /* Region 2: non-secure SRAM */
    SAU->RNR  = 2;
    SAU->RBAR = (NS_SRAM_START)         & SAU_RBAR_BADDR_Msk;
    SAU->RLAR = (NS_SRAM_END   - 1)     | SAU_RLAR_ENABLE_Msk;

    SAU->CTRL = SAU_CTRL_ENABLE_Msk;
}
```

Boot 초기에 SAU + MPC(memory protection controller)를 설정한 뒤 NSPE로 진입합니다. 한 region이 잘못 설정되면 NSPE 진입 즉시 fault가 납니다.

## 측정 / 성능 비교

Cortex-M33 @ 80 MHz, TF-M profile_medium, software crypto 기준입니다.

```text
연산                              지연
AES-128 GCM encrypt 1 KB           5 ms (200 KB/s)
SHA-256 1 KB                       2 ms
ECDSA P-256 sign                   50 ms
ECDSA P-256 verify                100 ms
RSA-2048 sign                     500 ms
Initial attestation token         100 ms
PSA service call overhead          ~50 µs (NSC + IPC)
```

Hardware crypto accelerator(STM32U5 PKA, nRF5340 CryptoCell)가 있으면 ECDSA가 5~10 ms로 줄어 10배 빨라집니다. Production은 hardware crypto가 거의 필수입니다.

PSA Certified Level별 비교입니다.

```text
Level         조건                                   기간
Level 1       self-assessment, basic security        2주
Level 2       lab test, side-channel 기본 검증       8주
Level 3       DPA·glitching 등 advanced attack       3개월
Level 4       Common Criteria EAL4+, 금융·정부      6개월+
```

EU CRA·UK PSTI는 *Level 1 minimum*을 사실상 요구합니다. Critical infrastructure는 Level 2+로 올라갑니다.

## 자주 보는 함정

> NSPE에서 secure address access

```c
*(uint32_t*)0x0C000000 = 0xDEADBEEF;   /* secure flash address */
/* HardFault: SecureFault on NSPE access */
```

NSPE는 NSC veneer로만 secure에 진입할 수 있습니다.

> Veneer annotation 누락

```c
/* secure side */
int my_func(int x) { ... }
/* compiler가 NSC entry로 wrap하지 않음 */
```

`__attribute__((cmse_nonsecure_entry))` 또는 vendor macro로 NSC entry를 명시합니다.

> Heap을 cross-world에서

```c
/* secure malloc → non-secure free → corruption */
```

Heap은 secure·non-secure 각자 별도로 둡니다.

> Key를 export해 NSPE에 들고 옴

```c
psa_export_key(key_id, plain, sizeof(plain), &plain_len);
/* NSPE가 plain key를 보유 → 침투 시 노출 */
```

Sign/encrypt는 capability(key_id)만 위임하고 raw key는 SPE 안에 둡니다.

> Anti-rollback counter 무시

```bash
imgtool sign --version 1.0.0 ...   /* 이전 version과 동일 */
```

새 firmware는 anti-rollback counter를 *증가*시켜야 downgrade attack을 막을 수 있습니다.

> MPC·PPC 설정 누락

```c
/* SAU만 설정, MPC 미설정 */
/* peripheral이 여전히 secure로 lock → NSPE에서 사용 불가 */
```

SAU(CPU view) + MPC(memory controller view) + PPC(peripheral)를 모두 설정해야 region이 올바르게 동작합니다.

## 정리

- TF-M은 Cortex-M33+ TrustZone-M 위 표준 secure firmware입니다.
- SPE/NSPE 분리, NSC veneer로 cross-world call, PSA API로 vendor 독립을 보장합니다.
- PSA Crypto·ITS·PS·Attestation이 네 가지 핵심 service입니다.
- MCUboot이 2nd-stage bootloader로 secure boot·anti-rollback·A/B update를 담당합니다.
- 2024 EU CRA·UK PSTI·US Cyber Trust Mark가 PSA Certified를 사실상 강제합니다.
- STM32L5/U5·nRF5340·NXP LPC55가 TF-M reference platform입니다.
- Software crypto는 ECDSA 50 ms, hardware crypto가 있으면 5~10 ms로 줄어듭니다.
- Key는 NSPE에 export하지 않고 `key_id` capability만 위임하는 패턴을 지킵니다.

다음 편은 **Matter·Thread IoT 표준**입니다.

## 관련 항목

- [6-07: 온디바이스 LLM](/blog/embedded/modern-recipes/part6-07-llama-cpp-edge)
- [6-09: Matter·Thread](/blog/embedded/modern-recipes/part6-09-matter-thread)
- [RTOS 4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
