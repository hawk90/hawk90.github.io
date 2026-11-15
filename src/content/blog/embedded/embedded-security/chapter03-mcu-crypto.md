---
title: "MCU 크립토 — AES·SHA API와 하드웨어 가속 검증"
slug: "embedded/embedded-security/chapter03-mcu-crypto"
date: 2026-05-21T09:03:00
description: "Mbed TLS 3.6.4의 AES-GCM·SHA 예제와 MCU 가속기의 선택·실패·측정 조건을 구분합니다."
tags: [Crypto, AES, ECC, MCU]
series: "Embedded Security"
seriesOrder: 3
draft: false
topics: ["embedded"]
---


## 알고리즘과 실행 경로를 따로 확인하기

MCU 크립토에서는 알고리즘의 보안 요구와 실제 구현 경로를 나눠 봐야 합니다. 하드웨어 엔진이 있어도 선택한 모드·키 저장 방식·driver가 그 엔진을 쓰는지 확인해야 하고, 빠른 구현이 물리 공격에도 안전하다는 뜻은 아닙니다. 타깃별 시간·RAM·flash·전력 측정과 실패 처리가 선택의 근거입니다.

이 장의 실행 예는 [Mbed TLS v3.6.4](https://github.com/Mbed-TLS/mbedtls/tree/c765c831e5c2a0971410692f92f7a81d6ec65ec2)입니다. macOS arm64에서 두 작업으로 라이브러리를 빌드하고 ASan·UBSan을 적용한 host 기능 검사를 수행했습니다. MCU HAL·DMA·hardware key slot·entropy source·timing 또는 전력 누출 시험을 수행한 것은 아닙니다.

## AES-GCM — 반환값과 인증 실패

AES의 block은 16 B이고 키 길이는 128·192·256 bit입니다. AES 자체와 GCM·CCM 같은 authenticated encryption mode를 구분합니다. CBC·CTR 단독은 메시지 인증을 제공하지 않으며, 새 protocol을 임의로 조립하기보다 검증된 AEAD protocol과 해당 key·nonce 정책을 따릅니다.

아래는 이 글에서 작성한 AES-128-GCM wrapper입니다. Caller는 명시한 길이만큼 유효한 buffer를 제공하고, input/output을 겹치지 않게 준비하며, 같은 key 아래 12 B nonce가 재사용되지 않도록 관리합니다. 이 함수가 nonce 상태나 key provisioning을 구현하는 것은 아닙니다.

```c title="article-gcm-encrypt.c"
#include <stddef.h>
#include "mbedtls/gcm.h"

int encrypt_packet(const unsigned char key[16],
                   const unsigned char nonce[12],
                   const unsigned char *aad, size_t aad_len,
                   const unsigned char *plain, size_t length,
                   unsigned char *cipher, unsigned char tag[16])
{
    mbedtls_gcm_context ctx;
    mbedtls_gcm_init(&ctx);
    int rc = mbedtls_gcm_setkey(&ctx, MBEDTLS_CIPHER_ID_AES,
                              key, 128);
    if (rc == 0)
        rc = mbedtls_gcm_crypt_and_tag(
            &ctx, MBEDTLS_GCM_ENCRYPT, length,
            nonce, 12, aad, aad_len, plain, cipher, 16, tag);
    mbedtls_gcm_free(&ctx);
    return rc;
}
```

Caller는 반환 0을 확인한 뒤에만 cipher·tag를 전송합니다. 수신은 tag를 검증하는 `mbedtls_gcm_auth_decrypt()`로 처리하고 성공한 뒤에만 평문을 사용합니다. `crypt_and_tag()`의 decrypt mode로 평문과 tag를 계산한 것만으로 인증 성공으로 취급하면 안 됩니다.

같은 key·nonce의 재사용은 GCM의 기밀성·인증을 약화시킵니다. 재부팅·전원 차단·counter 복원·key 교체를 포함한 key 수명 전체에서 유일성을 설계해야 합니다. 난수 nonce도 충돌 가능성·사용량을 고려해야 하므로 “TRNG가 있다” 하나로 해결하지 않습니다. 기준은 [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final)입니다.

## SHA-256 — 마지막 조각의 길이

Flash image를 chunk로 읽을 때 마지막 조각은 chunk보다 짧을 수 있습니다. 매번 고정 CHUNK 길이를 hash하면 범위를 넘겨 읽거나 이미지 밖 데이터를 포함할 수 있습니다. 아래 함수는 이미 메모리에 읽힌 buffer의 streaming hash 예이며 실제 flash read 실패·부분 읽기는 caller가 처리해야 합니다.

```c title="article-sha256-chunks.c"
#include <stddef.h>
#include "mbedtls/sha256.h"

int hash_chunks(const unsigned char *data, size_t length,
                size_t chunk, unsigned char digest[32])
{
    if (chunk == 0)
        return MBEDTLS_ERR_SHA256_BAD_INPUT_DATA;
    mbedtls_sha256_context ctx;
    mbedtls_sha256_init(&ctx);
    int rc = mbedtls_sha256_starts(&ctx, 0);
    size_t offset = 0;
    while (rc == 0 && offset < length) {
        size_t n = length - offset;
        if (n > chunk) n = chunk;
        rc = mbedtls_sha256_update(&ctx, data + offset, n);
        offset += n;
    }
    if (rc == 0) rc = mbedtls_sha256_finish(&ctx, digest);
    mbedtls_sha256_free(&ctx);
    return rc;
}
```

Hash는 신뢰된 기준 digest와 비교해야 변조 탐지에 사용할 수 있습니다. 공격자가 이미지와 digest를 함께 바꿀 수 있으면 hash만으로 authenticity가 생기지 않습니다. HMAC은 공유 비밀키를 가진 주체가 생성한 메시지를 인증하지만, 같은 키를 공유한 여러 주체 중 누구인지까지 구분하지는 못합니다.

## 서명 알고리즘의 비교 기준

[NIST SP 800-57 Part 1 Rev.5 Table 2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf)는 RSA-2048을 112-bit, ECC 256~383-bit 범위를 128-bit security strength에 대응시킵니다. 따라서 RSA-2048과 P-256을 같은 강도로 놓고 크기·시간만 비교하면 안 됩니다. 장치의 지원 알고리즘·image format·보안 수명과 실제 서명·검증 비용을 함께 비교합니다.

| 항목 | 확인할 내용 |
|------|------|
| ECDSA | nonce 재사용 방지와 승인된 난수·deterministic 생성 방식. DER·raw 서명 형식을 구분 |
| Ed25519 | [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)의 형식과 순수형·prehash형을 구분. 결정적 서명도 구현 결함·fault·key 유출을 막아 주지는 않음 |
| RSA | modulus 크기·padding·hash·salt 조건과 검증 정책. 공개 지수와 구현에 따라 비용이 다름 |
| Key storage | key ID를 쓴다고 비밀키가 반드시 secure element에 있는 것은 아님. 실제 lifetime·location·정책 확인 |

한 알고리즘을 모든 MCU의 기본 선택으로 추천하지 않습니다. Constant-time 구현·hardware key 보호·상호운용성도 library와 platform 조건으로 확인합니다.

## 가속기 연결과 자원 수명

Mbed TLS의 ALT 구현과 PSA driver 경로는 설정·API가 다릅니다. `MBEDTLS_AES_ALT` 하나가 모든 GCM·SHA·ECC 연산의 hardware 사용을 보장하지 않습니다. 실제 빌드 설정·연결된 driver·fallback·실행 trace를 확인해야 합니다.

| 확인 지점 | 실패 또는 반례 |
|------|------|
| 엔진의 알고리즘·모드 | AES를 지원해도 GCM·GHASH나 해당 key location을 지원하지 않을 수 있음 |
| SDK API와 buffer | 정렬·cache·DMA 길이 단위가 맞지 않거나 마지막 block 처리 실패 |
| 비동기 완료 | 제출 성공을 완료로 오인해 buffer·key를 먼저 해제 |
| 동시 사용 | 여러 task의 key·context·DMA channel 소유권 충돌 |
| Fallback | 지원되지 않은 크기·모드가 software로 내려가며 예상 지연을 초과 |
| Key cleanup | library context 해제와 hardware key slot 삭제가 별도 절차 |

STM32 CRYP/HASH, NXP DCP/CAAM, Nordic 보안 엔진은 부품·revision·SDK별 지원을 확인합니다. 이 장은 버전이 없는 HAL·DCP 코드 조각을 완성 가속 예제로 제시하지 않습니다. PSA API 역시 실제 driver와 key location을 연결하지 않으면 MCU 엔진 사용을 입증하지 못합니다.

## Entropy와 side-channel 검증

Entropy source는 물리 source의 평가·health test, DRBG는 수집된 entropy를 바탕으로 하는 생성기로 역할이 다릅니다. [SP 800-90B](https://csrc.nist.gov/pubs/sp/800/90/b/final)와 [SP 800-90A Rev.1](https://csrc.nist.gov/pubs/sp/800/90/a/r1/final)의 범위를 구분합니다. 실패한 TRNG 출력을 계속 쓰거나 반환값을 버리고 seed 성공으로 처리하면 안 됩니다. GCM nonce의 유일성 요구와 CBC IV의 예측 불가능성 요구도 같은 규칙으로 묶지 않습니다.

Timing 방어에는 검증된 비교 함수와 비밀값 의존 branch·memory access 검토가 필요합니다. Mbed TLS 3.6.4의 `mbedtls_ct_memcmp()`가 그 예입니다. 기능 검사로 같은·다른 값을 올바르게 판별했다는 사실은 target의 constant-time이나 power/EM 누출 부재를 입증하지 않습니다.

Masking은 중간 비밀값 표현을 random share로 나누는 접근이며, 단순 delay 추가와 다릅니다. Randomness 품질·고차 누출·물리 구현에 따라 평가해야 하므로 “hardware면 side-channel 안전”으로 결론내리지 않습니다. 세부 공격·방어 평가는 [Ch 7](/blog/embedded/embedded-security/chapter07-side-channel)에서 다룹니다.

## 실행 결과와 남은 타깃 시험

Host 검사는 본문의 두 C 함수를 그대로 추출해 실제 3.6.4 library에 연결했습니다. AES-GCM known-answer와 정상 복호화, tag·cipher·AAD·nonce·key 변조 거부, 잘못된 tag 길이, SHA의 빈 입력·마지막 부분 chunk·chunk 0 거부를 확인합니다. SHA 결과는 host의 독립 hash 구현과 비교했고, library의 AES·GCM·SHA self-test와 RFC 4231의 HMAC known-answer도 별도로 실행했습니다. 실제 실행 항목과 결과는 검증 기록에 남깁니다.

MCU의 가속 전후 비교는 같은 보안 설정·입력 크기·메모리 영역에서 CPU cycle, DMA 완료까지의 wall time, CPU 점유·전력·최대 RAM을 기록합니다. 작은 입력의 setup 비용과 긴 전송의 처리량을 나누고 오류·timeout·fallback 경로도 포함해야 합니다. 이 장의 host 기능 검사를 그 MCU 성능이나 보안 인증으로 확대하지 않습니다.

## 정리

- AES-GCM은 반환값과 인증 결과를 확인하고 key별 nonce 유일성을 관리합니다.
- Streaming SHA는 실제 마지막 조각 길이와 read 실패를 처리합니다.
- Hash·HMAC·서명은 다른 신뢰 가정을 가집니다.
- 알고리즘 비교는 같은 security strength와 실제 platform 지원을 기준으로 합니다.
- 가속은 빌드·driver·key location·완료·fallback을 관찰해 확인합니다.
- Host known-answer 검증과 MCU 성능·entropy·side-channel 검증을 구분합니다.

다음 편은 **Ch 4: TrustZone — Cortex-A / Cortex-M**. 지금까지의 키와 알고리즘을 *어디에 두고 누가 접근하게 할 것인가*를 결정하는 분리 메커니즘을 봅니다.

## 관련 항목

- [Ch 2: Secure Boot — 부트 체인 검증](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- CERT C — 보안 코딩 규칙
- MISRA C — 안전 임베디드 규칙
