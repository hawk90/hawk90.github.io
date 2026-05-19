---
title: "Ch 3: MCU 크립토 — HW accelerator (AES / SHA / ECC)"
date: 2026-05-08T04:00:00
description: "MCU 내장 crypto 엔진. 소프트웨어 vs 하드웨어. constant-time."
tags: [Crypto, AES, ECC, MCU]
series: "Embedded Security"
seriesOrder: 3
draft: false
---

## 한 줄 요약

> **"MCU 크립토는 *알고리즘 선택* + *하드웨어 가속* + *constant-time 구현*의 삼각 균형입니다."** — 알고리즘은 자원과 위협 수준이 결정하고, HW 가속이 있으면 처리량이 수십 배 빨라지며, constant-time이 아니면 사이드채널로 키가 새 나갑니다.

## 왜 임베디드 크립토는 따로 다루는가

데스크톱 크립토 라이브러리(OpenSSL, libsodium)는 *프로세서가 빠르고 메모리가 충분*하다는 가정에서 출발합니다. 그래서 RSA-4096이나 SHA-3-512가 부담스럽지 않습니다. MCU는 정반대 환경입니다. Cortex-M0+ 48 MHz, RAM 16 KB, flash 64 KB가 흔합니다. 이 위에서 같은 보안 강도를 어떻게 확보하느냐가 임베디드 크립토의 핵심 질문입니다.

답은 세 갈래입니다. 첫째, *적절한 알고리즘*을 골라 연산량을 최소화합니다. 둘째, MCU 내부의 *crypto accelerator*를 활용해 처리량을 끌어올립니다. 셋째, *constant-time*과 *masking* 같은 사이드채널 방어를 빼먹지 않습니다. 이 세 가지가 균형을 잃으면 — 알고리즘은 강한데 SW로만 돌려서 너무 느리거나, HW로 빠르지만 timing leak이 있거나 — 시스템이 무너집니다.

## AES — 대칭키의 기본

AES(Advanced Encryption Standard)는 임베디드에서 가장 흔히 만나는 대칭 암호입니다. 키 길이는 128·192·256비트, 블록 크기는 항상 128비트입니다.

```text
AES-128 — 라운드 10회, 일반 용도
AES-192 — 라운드 12회, 거의 안 씀
AES-256 — 라운드 14회, 고보안 또는 양자 저항 마진
```

블록 cipher 자체는 *고정 크기 16바이트*를 변환할 뿐입니다. 실제 사용을 위해 *모드*가 필요합니다.

| 모드 | 용도 | 특징 | 임베디드 추천 |
|---|---|---|---|
| ECB | (안 씀) | 같은 평문 → 같은 암호문, 패턴 노출 | X |
| CBC | 디스크 암호화 (legacy) | IV 필요, 인증 없음, padding oracle 위험 | X (단독으로는) |
| CTR | 스트림처럼 사용 | nonce 재사용 시 즉시 깨짐, 인증 없음 | 단독은 X |
| GCM | 인증 암호 | CTR + GHASH, AEAD, 표준 | O (HW 가속 있을 때) |
| CCM | 인증 암호 (IoT) | CTR + CBC-MAC, RFC 3610 | O (Zigbee, Thread) |
| OFB | (거의 안 씀) | 스트림 모드, 인증 없음 | X |

AEAD(Authenticated Encryption with Associated Data) 모드만 *기밀성 + 무결성*을 함께 줍니다. GCM과 CCM이 사실상 표준입니다. CBC를 쓴다면 *반드시* 별도의 HMAC을 붙여야 합니다.

```c
// mbedTLS로 AES-128-GCM 암호화 (HW 가속 채널 있을 때 자동 활용)
#include "mbedtls/gcm.h"

uint8_t key[16]   = { /* 키 */ };
uint8_t iv[12]    = { /* 12바이트 nonce */ };
uint8_t aad[8]    = { /* 인증만 받는 헤더 */ };
uint8_t pt[64]    = { /* 평문 */ };
uint8_t ct[64];
uint8_t tag[16];

mbedtls_gcm_context ctx;
mbedtls_gcm_init(&ctx);
mbedtls_gcm_setkey(&ctx, MBEDTLS_CIPHER_ID_AES, key, 128);

mbedtls_gcm_crypt_and_tag(
    &ctx, MBEDTLS_GCM_ENCRYPT,
    sizeof(pt),
    iv, sizeof(iv),
    aad, sizeof(aad),
    pt, ct,
    sizeof(tag), tag);

mbedtls_gcm_free(&ctx);
```

GCM에서 *nonce는 절대 재사용하지 않습니다*. 같은 키로 같은 nonce를 쓰면 인증 키가 즉시 복원됩니다. 12바이트 nonce 안에 보통 counter 또는 hardware-unique sequence를 박습니다.

## SHA — 해시 함수

SHA-2 family가 임베디드의 표준입니다.

| 알고리즘 | 출력 | 블록 | 임베디드 메모 |
|---|---|---|---|
| SHA-1 | 160 bit | 512 bit | 충돌 발견됨, *새 설계에 쓰지 않음* |
| SHA-224 | 224 bit | 512 bit | 거의 안 씀 |
| SHA-256 | 256 bit | 512 bit | 표준. ECDSA P-256과 짝 |
| SHA-384 | 384 bit | 1024 bit | ECDSA P-384와 짝 |
| SHA-512 | 512 bit | 1024 bit | 64비트 연산 많음, 32비트 MCU에 느림 |
| SHA-3 | 256/384/512 | Keccak | 새 표준, HW 가속 드뭄 |

대부분의 새 임베디드 설계는 SHA-256입니다. HW 가속이 흔하고, ECDSA P-256과 길이가 맞고, 32비트 word 연산이라 Cortex-M에 잘 맞습니다.

```c
// SHA-256 한 번에
#include "mbedtls/sha256.h"

uint8_t data[100] = { /* ... */ };
uint8_t digest[32];

mbedtls_sha256(data, sizeof(data), digest, 0 /* not SHA-224 */);
```

스트리밍 모드도 자주 씁니다. flash 전체를 한 번에 RAM에 못 올리니까요.

```c
mbedtls_sha256_context ctx;
mbedtls_sha256_init(&ctx);
mbedtls_sha256_starts(&ctx, 0);

for (size_t off = 0; off < flash_size; off += CHUNK) {
    flash_read(off, buf, CHUNK);
    mbedtls_sha256_update(&ctx, buf, CHUNK);
}

mbedtls_sha256_finish(&ctx, digest);
mbedtls_sha256_free(&ctx);
```

## HMAC — 키 있는 해시

해시 자체로는 *무결성*만 보장합니다. *기원 인증*까지 보장하려면 키를 섞은 HMAC이 필요합니다.

```text
HMAC(K, m) = H((K' ⊕ opad) || H((K' ⊕ ipad) || m))
```

세션 키로 HMAC-SHA-256을 붙이면, 키 없이는 valid MAC을 만들 수 없으므로 *어디서 온 메시지인지*까지 알 수 있습니다. AEAD(GCM/CCM)가 인증을 포함하므로 *그 위에 또 HMAC*은 보통 필요 없습니다. HMAC은 AEAD가 아닌 채널에 별도로 무결성을 더할 때 씁니다.

## ECC — 비대칭 키의 효율

RSA-2048과 ECC P-256은 *비슷한 보안 강도*입니다. 그런데 키 크기와 연산량이 완전히 다릅니다.

| 비교 항목 | RSA-2048 | ECC P-256 |
|---|---|---|
| 공개키 크기 | 256 bytes | 64 bytes |
| 개인키 크기 | 256 bytes | 32 bytes |
| 서명 크기 | 256 bytes | 64 bytes |
| 서명 시간 (Cortex-M4 @ 100MHz) | 약 2~3 s | 약 200~400 ms |
| 검증 시간 | 약 80 ms | 약 100~200 ms |
| 코드 크기 | 약 8~12 KB | 약 15~20 KB |

RSA는 *검증이 빠르고 서명이 느립니다*. ECC는 *검증과 서명이 비슷*합니다. 디바이스가 *서명도 하는* 시나리오(상호 인증)에서는 ECC가 압도적으로 유리합니다.

ECC 곡선의 선택:

| 곡선 | 출처 | 메모 |
|---|---|---|
| NIST P-256 (secp256r1) | NIST | 가장 흔함, NSA Suite B |
| NIST P-384 | NIST | 고보안 |
| Curve25519 / Ed25519 | Bernstein | 빠르고 사이드채널 안전, deterministic |
| Brainpool P256r1 | EU | 유럽 인증 (eIDAS) |
| secp256k1 | Bitcoin | 일반 임베디드에선 거의 안 씀 |

새 설계라면 Ed25519를 강하게 추천합니다. RFC 8032가 nonce 생성을 *결정적*으로 정의해 ECDSA의 큰 함정인 nonce 재사용을 구조적으로 막습니다.

```c
// Ed25519 서명 (libsodium)
#include "sodium.h"

unsigned char sk[crypto_sign_SECRETKEYBYTES];
unsigned char pk[crypto_sign_PUBLICKEYBYTES];
crypto_sign_keypair(pk, sk);

unsigned char sig[crypto_sign_BYTES];
unsigned long long siglen;
const unsigned char msg[] = "firmware payload";

crypto_sign_detached(sig, &siglen,
                     msg, sizeof(msg),
                     sk);

// 검증
if (crypto_sign_verify_detached(sig, msg, sizeof(msg), pk) == 0) {
    // OK
}
```

## TRNG — 진짜 무작위가 필요한 이유

키 생성, nonce 생성, IV 생성은 *예측 불가능한* 값이 있어야 합니다. `rand()`는 *수도*무작위라서 시드를 알면 다음 값을 예측할 수 있습니다.

TRNG(True Random Number Generator)는 *물리적 잡음원* — 열잡음, jitter, 양자 효과 — 에서 entropy를 뽑습니다. 거의 모든 최신 MCU에 내장돼 있습니다.

```c
// STM32 HAL의 TRNG
#include "stm32h7xx_hal.h"

RNG_HandleTypeDef hrng = { .Instance = RNG };
HAL_RNG_Init(&hrng);

uint32_t r;
HAL_RNG_GenerateRandomNumber(&hrng, &r);
```

TRNG의 출력을 직접 키로 쓰면 안 됩니다. *bias*나 *correlation*이 있을 수 있습니다. NIST SP 800-90A의 DRBG로 *whitening*을 거친 후 사용하는 것이 표준입니다. mbedTLS의 `mbedtls_ctr_drbg_seed`가 그 역할을 합니다.

```c
mbedtls_ctr_drbg_context drbg;
mbedtls_entropy_context entropy;

mbedtls_entropy_init(&entropy);
mbedtls_ctr_drbg_init(&drbg);

// entropy source로 TRNG를 등록 (board init에서)
mbedtls_entropy_add_source(&entropy, board_trng_get, NULL,
                           MBEDTLS_ENTROPY_MAX_GATHER,
                           MBEDTLS_ENTROPY_SOURCE_STRONG);

mbedtls_ctr_drbg_seed(&drbg, mbedtls_entropy_func, &entropy,
                      (const uint8_t*)"app-v1", 6);

// 사용
uint8_t nonce[12];
mbedtls_ctr_drbg_random(&drbg, nonce, sizeof(nonce));
```

TRNG의 entropy 품질 검증도 잊지 않습니다. NIST SP 800-90B health test(repetition count, adaptive proportion)를 통과하는지 부팅 시마다 검사합니다.

## HW accelerator — 칩별 차이

같은 AES라도 SW로 돌리느냐 HW 채널로 보내느냐에 따라 처리량이 10~100배 차이가 납니다.

**STM32H7 CRYP + HASH**

STM32H7의 CRYP는 AES-128/192/256을 ECB/CBC/CTR/GCM/CCM 모두 지원하고, HASH는 SHA-1/224/256/MD5를 지원합니다. DMA 연동이 핵심입니다.

```c
// CRYP — AES-128-CBC, DMA 모드
CRYP_HandleTypeDef hcryp = {
    .Instance       = CRYP,
    .Init.DataType  = CRYP_DATATYPE_8B,
    .Init.KeySize   = CRYP_KEYSIZE_128B,
    .Init.pKey      = key,
    .Init.Algorithm = CRYP_AES_CBC,
    .Init.pInitVect = iv,
};
HAL_CRYP_Init(&hcryp);

HAL_CRYP_Encrypt_DMA(&hcryp, (uint32_t*)plain, length, (uint32_t*)cipher);
// 인터럽트에서 완료 콜백
```

CRYP는 약 60~100 MB/s를 냅니다. SW mbedTLS는 같은 칩에서 5~10 MB/s 정도입니다.

**NXP i.MX RT의 CAAM / DCP**

i.MX RT 시리즈는 DCP(Data Co-Processor)를 가집니다. AES-128, SHA-1/256을 SHA blob 단위로 가속합니다.

```c
#include "fsl_dcp.h"

dcp_handle_t handle = {
    .channel    = kDCP_Channel0,
    .keySlot    = kDCP_KeySlot0,
    .swapConfig = kDCP_NoSwap,
};

DCP_AES_SetKey(DCP, &handle, key, 16);
DCP_AES_EncryptCbc(DCP, &handle, plain, cipher, length, iv);
```

i.MX 8 시리즈의 CAAM(Cryptographic Acceleration and Assurance Module)은 더 강력합니다. RSA, ECC까지 HW로 처리하며 blob storage(키를 칩 고유 키로 wrap)도 지원합니다.

**Nordic nRF52/53의 CryptoCell CC310/CC312**

nRF의 CryptoCell은 ARM TrustZone CryptoCell IP입니다. PSA Crypto API와 직접 매핑됩니다.

```c
#include "psa/crypto.h"

psa_crypto_init();

psa_key_attributes_t attrs = PSA_KEY_ATTRIBUTES_INIT;
psa_set_key_type(&attrs, PSA_KEY_TYPE_AES);
psa_set_key_bits(&attrs, 128);
psa_set_key_usage_flags(&attrs, PSA_KEY_USAGE_ENCRYPT);
psa_set_key_algorithm(&attrs, PSA_ALG_GCM);

psa_key_id_t key_id;
psa_import_key(&attrs, raw_key, 16, &key_id);

size_t out_len;
psa_aead_encrypt(key_id, PSA_ALG_GCM,
                 nonce, 12,
                 aad, sizeof(aad),
                 plain, sizeof(plain),
                 out, sizeof(out), &out_len);
```

## KCAPI vs PSA Crypto API

리눅스 진영에는 *Kernel Crypto API* (KCAPI)가 있고, 임베디드 진영에는 ARM의 *PSA Crypto API*가 있습니다.

| 항목 | KCAPI | PSA Crypto |
|---|---|---|
| 대상 | Linux kernel + userspace | 임베디드, RTOS, Cortex-M |
| 인터페이스 | `AF_ALG` socket, `libkcapi` | C API, `psa_*` 함수 |
| 키 관리 | keyring | 키 ID, persistent storage |
| HW 가속 | crypto driver 등록 | driver wrapper, secure element 통합 |
| 표준 | Linux native | PSA Certified, GP TEE |

리눅스 시스템에서는 KCAPI를 통해 dm-crypt, IPsec, fscrypt가 HW 가속을 받습니다. MCU/RTOS에서는 PSA Crypto API가 표준입니다. mbedTLS 3.x부터 내부 구현이 PSA Crypto로 이행되고 있어, 새 코드는 직접 PSA API를 호출하는 것이 좋습니다.

## Constant-time — 타이밍 사이드채널 방어

크립토 코드에서 *데이터에 의존하는 분기*나 *데이터에 의존하는 메모리 접근*은 timing side-channel을 만듭니다.

```c
// 회피 — early exit
int memcmp_naive(const uint8_t* a, const uint8_t* b, size_t n) {
    for (size_t i = 0; i < n; i++)
        if (a[i] != b[i]) return -1;   // 첫 byte에서 끝나면 짧음
    return 0;
}

// Good — 항상 같은 시간
int memcmp_ct(const uint8_t* a, const uint8_t* b, size_t n) {
    uint8_t diff = 0;
    for (size_t i = 0; i < n; i++)
        diff |= a[i] ^ b[i];
    return diff;   // 0이면 같음
}
```

MAC 검증 같은 곳에 일반 `memcmp`를 쓰면 attacker가 *몇 번째 byte까지 맞았는지*를 응답 시간 차이로 알아냅니다. 항상 `mbedtls_ct_memcmp`나 `sodium_memcmp` 같은 constant-time 함수를 씁니다.

비슷하게 *데이터 의존 메모리 접근*도 위험합니다. AES의 S-box를 lookup table로 구현하면 *cache line*이 데이터에 의존해 cache timing 공격이 가능합니다. 그래서 비트슬라이스 AES나 HW 가속을 씁니다.

## SW fallback — mbedTLS / wolfSSL / tinycrypt

HW가 없는 곳에서는 SW로 떨어집니다. 후보가 셋입니다.

| 라이브러리 | 메모리 footprint | 라이선스 | 메모 |
|---|---|---|---|
| **mbedTLS** | 중간 (~30 KB) | Apache 2.0 | TF-M, Zephyr 표준. PSA 통합. |
| **wolfSSL** | 작음 (~20 KB) | GPL / 상용 | 매우 작게 줄일 수 있음. 인증서 많음(FIPS). |
| **tinycrypt** | 매우 작음 (~5 KB) | BSD | Intel/Zephyr. ECDH P-256, ECDSA, AES만 |

tinycrypt는 *최소한의 알고리즘만* 제공하므로, 정말 작은 BLE peripheral 같은 곳에 맞습니다. mbedTLS는 *대부분의 임베디드 설계*에 무난한 선택이며, PSA Crypto API의 reference implementation입니다.

## 자주 하는 실수

- **HW가속을 켰는데 mbedTLS config의 `MBEDTLS_AES_ALT`를 안 켰습니다.** SW 구현이 그대로 빌드돼 HW는 노는 채로 동작합니다. config에 alt 매크로를 켜고 driver를 연결해야 합니다.
- **GCM nonce를 random으로만 생성합니다.** 12바이트의 random은 충돌 확률이 있습니다. counter 8바이트 + boot id 4바이트 같은 구조가 안전합니다.
- **ECDSA nonce를 매번 다시 안 만듭니다.** 같은 nonce로 두 메시지 서명 → 즉시 private key 노출. Ed25519 또는 RFC 6979 deterministic ECDSA가 안전합니다.
- **CBC 모드를 인증 없이 씁니다.** padding oracle 공격으로 평문이 한 byte씩 새 나갑니다. CBC를 쓴다면 *반드시* HMAC을 별도로 붙입니다. AEAD(GCM/CCM)면 이 문제가 없습니다.
- **TRNG의 health test를 안 합니다.** TRNG 회로가 망가져도 0만 출력할 수 있습니다. 부팅 시 NIST SP 800-90B repetition count test를 돌려 1차 검증을 합니다.
- **암호 비교에 일반 `memcmp`를 씁니다.** timing leak으로 MAC 한 byte씩 알아낼 수 있습니다. 항상 constant-time 비교를 씁니다.
- **키를 zeroize하지 않습니다.** 사용이 끝난 키가 stack에 남으면 cold boot 공격이나 메모리 dump로 노출됩니다. `mbedtls_platform_zeroize`로 명시적으로 지웁니다.

## 정리

- AES는 128 또는 256비트로 GCM·CCM AEAD 모드에서 씁니다. ECB·CBC 단독은 피합니다.
- SHA-256이 임베디드의 표준 해시이고, HMAC-SHA-256은 키 있는 무결성 확인에 쓰입니다.
- ECC P-256 또는 Ed25519가 임베디드 비대칭 키의 기본입니다. RSA는 호환성이 필요할 때만.
- TRNG는 거의 모든 최신 MCU에 내장돼 있으며, DRBG로 whitening 후 사용합니다.
- HW accelerator는 STM32 CRYP, NXP CAAM/DCP, Nordic CryptoCell 등으로 처리량을 10~100배 끌어올립니다.
- 임베디드/RTOS는 PSA Crypto API가 표준이고, Linux는 Kernel Crypto API가 표준입니다.
- Constant-time 비교, masked 구현, 키 zeroize는 사이드채널 방어의 기본기입니다.
- SW fallback은 mbedTLS(범용), wolfSSL(인증), tinycrypt(최소) 중에서 자원과 인증 요구로 고릅니다.

다음 편은 **Ch 4: TrustZone — Cortex-A / Cortex-M**. 지금까지의 키와 알고리즘을 *어디에 두고 누가 접근하게 할 것인가*를 결정하는 분리 메커니즘을 봅니다.

## 관련 항목

- [Ch 2: Secure Boot — 부트 체인 검증](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- [CERT C — 보안 코딩 규칙](/blog/embedded/automotive/cert-c)
- [MISRA C — 안전 임베디드 규칙](/blog/embedded/automotive/misra-c)
