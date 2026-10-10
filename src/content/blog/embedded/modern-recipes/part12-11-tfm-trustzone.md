---
title: "Cortex-M33 TF-M·TrustZone — Secure Firmware·PSA·MCUboot"
slug: "embedded/modern-recipes/part12-11-tfm-trustzone"
date: 2026-04-21T09:10:00
description: "Cortex-M33+ TrustZone-M 위에 TF-M으로 secure firmware를 구성하는 패턴. SPE/NSPE, PSA Crypto/ITS/Attestation, MCUboot secure boot를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 147
tags: [recipes, security, tf-m, trustzone, psa, cortex-m33, mcuboot]
topics: ["embedded"]
---

## 한 줄 요약

> **"TF-M은 TrustZone-M 기반 Cortex-M에서 secure service를 구성하는 대표적인 open-source framework입니다."** PSA Certified와 각 지역 규제의 요구사항을 검토할 때 참고할 수 있지만, 인증·준수 여부는 제품 threat model과 구현·평가 범위로 판단합니다. Crypto·storage·attestation을 secure side에 두고 RTOS·앱은 non-secure side에서 돌리는 구성을 지원합니다.

## 어떤 상황에서 쓰나

IoT sensor, smart lock, gateway, wearable, BLE node, industrial controller처럼 *공격면이 있는 connected MCU device*에서 후보가 됩니다. 다음 규제·인증 요구사항을 검토할 때 PSA Certified와 TF-M 구성을 참고할 수 있지만, 적용 의무와 시점은 제품·시장·관할에 따라 확인해야 합니다.

- **EU Cyber Resilience Act (Regulation (EU) 2024/2847)** — 2024년 12월 10일 발효했습니다. 취약점·사고 보고 의무는 2026년 9월 11일부터, essential requirements와 CE marking을 포함한 대부분의 조항은 2027년 12월 11일부터 적용됩니다.
- **UK PSTI Act 2022** — consumer connectable product 보안 regime이 2024년 4월 29일 시행됐습니다. 기본 비밀번호 금지, 취약점 신고 창구 공개, 보안 업데이트 지원 기간 공개를 요구합니다.
- **US Cyber Trust Mark** — FCC가 운영하는 *자발적* labeling 제도로 2025년 1월 7일 출범했습니다.

요구사항에는 secure boot, protected storage, device attestation, secure update 등이 포함될 수 있습니다. TF-M은 관련 secure service의 reference 구현을 제공하며, vendor SDK의 통합 범위와 설정은 MCU·SDK 버전별로 확인합니다.

## 핵심 개념

Cortex-M33/M55/M85는 *TrustZone-M*이라는 hardware mechanism으로 *Secure*와 *Non-Secure* 두 world를 가집니다.

| World | 구성 | 하는 일 |
|-------|------|---------|
| Secure Processing Environment (SPE) | TF-M core + secure partitions (Crypto, Internal Trusted Storage, Protected Storage, Attestation) | Boot ROM에서 가장 먼저 부팅해 메모리와 peripheral 일부를 secure로 표시합니다 |
| Non-Secure Processing Environment (NSPE) | RTOS (FreeRTOS, Zephyr, mbedOS) + application | PSA API client로 SPE의 서비스를 호출합니다 |

Memory와 peripheral은 *SAU/IDAU + MPC/PPC*로 region별 secure 여부를 표시합니다. NSPE가 secure 영역에 접근하면 SecureFault가 발생합니다(SecureFault가 없는 Armv8-M Baseline, 예를 들어 Cortex-M23에서는 HardFault).

SPE↔NSPE 호출은 *NSC veneer*라는 special function을 거칩니다. 순서는 다음과 같습니다.

1. Non-secure 코드가 `BL nsc_function`으로 NSC veneer를 호출합니다.
2. Veneer는 secure side의 Non-Secure Callable(NSC) 영역에 있고, 첫 instruction인 `SG`(secure gateway)가 secure state로 전환합니다.
3. Veneer가 SPE service로 branch해 요청을 처리합니다.
4. Service가 `BXNS lr`로 non-secure state로 돌아가고 호출한 코드로 복귀합니다.

`SG` instruction이 *유일한 entry point*입니다. NSPE는 NSC veneer 외에는 secure 영역에 진입할 수 없습니다.

PSA(Platform Security Architecture)는 ARM이 정의한 *vendor-agnostic security API*입니다.

| API | 기능 |
|-----|------|
| PSA Crypto | AES, ECDSA, RSA, key management |
| PSA Storage | ITS (key·credential), PS (encrypted at rest) |
| PSA Attestation | device identity + measurement token |
| PSA Firmware Update | firmware image 준비·설치 API |

API가 같으므로 STM32·nRF·NXP·Renesas 같은 서로 다른 vendor의 TF-M port 위에서 application 코드를 재사용하는 것이 설계 목표입니다.

## 코드 / 실제 사용 예

### TF-M build

```bash
git clone https://github.com/TrustedFirmware-M/trusted-firmware-m
cd trusted-firmware-m

cmake -S . -B build \
    -DTFM_PLATFORM=stm/nucleo_l552ze_q \
    -DTFM_PROFILE=profile_medium
cmake --build build -- install
```

현재 TF-M build는 SPE만 만듭니다. `install` 결과는 `build/api_ns`에 모이고, 그 안의 `bin`에 bootloader(BL2, 선택)·SPE image·결합 image가, `interface`·`cmake`에 NSPE가 PSA API를 쓰고 빌드할 header와 toolchain 파일이 들어갑니다. NSPE(RTOS + application)는 이 artifact를 가져다 별도 CMake project로 빌드합니다. TF-M test suite나 예제 NS app은 `tf-m-tests`·`tf-m-extras` repository에 있습니다.

Boot chain은 ROM bootloader → BL2(MCUboot) → SPE → NSPE 순입니다.

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

일반적인 PSA Crypto 구성에서는 private key를 NSPE로 export하지 않고 `key_id`를 통해 sign/encrypt를 위임합니다. 실제 key 보호 수준은 hardware isolation·storage backend·policy 설정과 secure world 구현을 함께 검토해야 합니다.

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

ITS는 *secure side의 internal flash*에 저장되어 NSPE가 직접 read할 수 없습니다. 외부 flash를 쓰는 Protected Storage와 달리 저장 매체 자체가 isolation 경계 안에 있다는 것이 전제입니다. Rollback 보호는 아래 PS 쪽이 NV counter로 제공합니다.

### Protected Storage (encrypted at rest)

```c
#include "psa/protected_storage.h"

psa_ps_set(0x200, sizeof(secret), secret, PSA_STORAGE_FLAG_NONE);
psa_ps_get(0x200, 0, sizeof(buf), buf, &out_len);
```

PS는 data를 암호화·인증해 저장하고, TF-M 구현은 NV counter로 object table의 rollback을 막습니다. external flash의 보호 범위와 dump에 대한 저항성은 key 관리·암호화 구현·debug lock·physical attack model을 별도로 검증합니다.

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

Token에는 device identity, firmware measurement, lifecycle state, nonce(challenge)가 들어가고 Initial Attestation Key(IAK)로 sign됩니다. Verifier는 signature와 measurement를 확인해 이 device와 firmware를 신뢰할지 결정합니다.

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

Connection-based service는 NSPE에서 `psa_connect`/`psa_call`/`psa_close`로 호출합니다. 어떤 vendor의 TF-M port든 client API는 같습니다.

### Custom secure partition

```yaml
# my_service_manifest.yaml
{
  "psa_framework_version": 1.1,
  "name": "TFM_SP_MY_SERVICE",
  "type": "APPLICATION-ROT",
  "priority": "NORMAL",
  "model": "IPC",
  "entry_point": "tfm_my_service_main",
  "stack_size": "0x0800",
  "services": [{
    "name": "MY_SERVICE",
    "sid": "0x00000200",
    "non_secure_clients": true,
    "connection_based": true,
    "version": 1,
    "version_policy": "STRICT"
  }]
}
```

IPC model partition의 entry point는 반환하지 않는 loop입니다. Service의 signal 이름은 manifest의 service 이름에서 생성되어(`MY_SERVICE` → `MY_SERVICE_SIGNAL`) `psa_manifest/` header로 들어옵니다.

```c
#include "psa/service.h"
#include "psa_manifest/my_service_manifest.h"

void tfm_my_service_main(void) {
    while (1) {
        psa_signal_t signals = psa_wait(PSA_WAIT_ANY, PSA_BLOCK);
        if (signals & MY_SERVICE_SIGNAL) {
            psa_msg_t msg;
            psa_get(MY_SERVICE_SIGNAL, &msg);
            /* msg.type: PSA_IPC_CONNECT / PSA_IPC_CALL / PSA_IPC_DISCONNECT */
            psa_status_t st = PSA_SUCCESS;
            if (msg.type == PSA_IPC_CALL) {
                st = handle_request(&msg);   /* psa_read / psa_write로 iovec 처리 */
            }
            psa_reply(msg.handle, st);
        }
    }
}
```

PSA IPC는 message-passing 모델입니다. SPM이 client 요청을 signal로 알리고, partition은 `psa_wait`에서 깨어나 message를 처리한 뒤 `psa_reply`로 돌려줍니다. 별도 thread 없이 함수 호출로 처리하는 SFN model도 있으며, 이때는 `entry_point` 대신 `entry_init`을 둡니다.

### MCUboot — secure boot + A/B

Flash 배치는 platform의 `flash_layout.h`가 정합니다. 아래 주소는 구조를 보여 주는 예시입니다.

```text
Flash layout (예시):
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
    --security-counter 3 \
    --align 8 \
    tfm_s_ns.bin tfm_s_ns_signed.bin
```

Boot 시 BL2가 image signature와 security counter를 verify합니다. Secondary slot의 새 image가 검증에 실패하면 설치하지 않고 기존 primary image로 boot하며, primary image마저 실패하면 boot를 멈춥니다. TF-M build는 `api_ns/image_signing`에 이 signing 도구와 key를 함께 내보냅니다.

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

Crypto 연산 latency는 core·clock·crypto backend(software 또는 hardware accelerator)·TF-M profile·isolation level에 따라 크게 달라지므로 target에서 측정합니다. 기록할 항목입니다.

| 연산 | 측정 이유 |
|---|---|
| AES-GCM encrypt (payload 크기별) | 통신·PS 암호화 throughput |
| SHA-256 | image 검증·attestation |
| ECDSA P-256 sign·verify | TLS handshake·attestation token |
| Initial attestation token 생성 | 서버 접속 시 지연 |
| PSA service call overhead | NSC + IPC 왕복 비용, 빈번한 호출 설계 판단 |

Hardware crypto accelerator(STM32U5 PKA, nRF5340 CryptoCell 등)를 사용하면 ECDSA latency를 줄일 수 있지만, 개선 폭은 curve·key size·driver·clock에서 측정합니다. Production에서는 hardware crypto 필요성을 threat model과 성능 예산으로 판단합니다.

PSA Certified는 level별로 평가 범위가 다릅니다.

| Level | 평가 범위 |
|---|---|
| Level 1 | 기본 보안 원칙이 적용되고 관련 기능이 있는지 확인 |
| Level 2 | 원격·확장 가능한 software 공격에 대한 PSA RoT 보호를 lab에서 평가 |
| Level 3 | PSA RoT의 상당한 보안 능력(물리 공격 포함)을 lab에서 평가 |
| Level 4 iSE/SE | secret key와 crypto 기능을 물리·software 공격에서 높은 수준으로 보호 |

Level 2·3에 secure element를 결합한 "+ Secure Element" 등급과 RoT component 평가도 따로 있습니다. 어떤 level이 필요한지는 규제 자체가 정하지 않으므로, 제품의 threat model과 고객·시장 요구로 판단합니다.

## 자주 보는 함정

> NSPE에서 secure address access

```c
*(uint32_t*)0x0C000000 = 0xDEADBEEF;   /* secure flash address */
/* SecureFault (Baseline core는 HardFault) */
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
imgtool sign --version 1.0.0 --security-counter 1 ...   # 이전 image와 같은 counter
```

MCUboot의 downgrade 방지는 image의 security counter(`--security-counter`)와 device NV counter를 비교해 동작합니다. 취약점을 고친 firmware는 counter를 *증가*시켜야 이전 image로의 downgrade를 막을 수 있습니다.

> MPC·PPC 설정 누락

```c
/* SAU만 설정, MPC 미설정 */
/* peripheral이 여전히 secure로 lock → NSPE에서 사용 불가 */
```

SAU(CPU view) + MPC(memory controller view) + PPC(peripheral)를 모두 설정해야 region이 올바르게 동작합니다. MPC·PPC 이름과 register는 vendor마다 다르므로(예: STM32의 GTZC) reference manual을 따릅니다.

## 정리

- TF-M은 Cortex-M33+ TrustZone-M에서 secure service를 구성하는 대표적인 framework입니다.
- SPE/NSPE 분리와 NSC veneer를 제공하며, PSA API로 vendor 간 이식성을 목표로 하지만 platform port와 backend 차이는 확인해야 합니다.
- PSA Crypto·ITS·PS·Attestation이 네 가지 핵심 service입니다.
- MCUboot이 2nd-stage bootloader로 secure boot·anti-rollback·A/B update를 담당합니다.
- EU CRA·UK PSTI·US Cyber Trust Mark의 적용 여부와 PSA Certified 필요성은 제품·시장·관할별 요구사항으로 확인합니다.
- TF-M upstream에는 STM32L5/U5·nRF5340·NXP LPC55 같은 vendor platform port와 Arm MPS 보드 port가 있습니다.
- Crypto latency는 algorithm·hardware·implementation에 따라 benchmark합니다.
- Key는 NSPE에 export하지 않고 `key_id` capability만 위임하는 패턴을 지킵니다.

다음 편은 **Matter·Thread IoT 표준**입니다.

## 관련 항목

- [12-10: 온디바이스 LLM](/blog/embedded/modern-recipes/part12-10-on-device-llm)
- [12-12: Matter·Thread](/blog/embedded/modern-recipes/part12-12-matter-thread)
- [RTOS 4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
