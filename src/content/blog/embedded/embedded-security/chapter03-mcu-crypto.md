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

MCU 크립토에서는 알고리즘의 보안 요구와 실제 구현 경로를 나눠 봐야 합니다. 칩에 AES 엔진이 있다는 사실과 내 GCM 호출이 그 엔진을 쓴다는 사실은 별개이고, 빠른 구현이 전력 분석에도 강하다는 뜻도 아닙니다.

이 장의 실행 예는 [Mbed TLS v3.6.4](https://github.com/Mbed-TLS/mbedtls/tree/c765c831e5c2a0971410692f92f7a81d6ec65ec2)입니다. macOS arm64의 Apple clang 21.0.0으로 `libmbedcrypto.a`를 `-fsanitize=address,undefined`로 빌드하고, 본문의 두 C 함수를 그대로 추출해 연결했습니다. 결과는 마지막 절에 있습니다. MCU HAL·DMA·hardware key slot·entropy source·전력 누출 시험은 하지 않았습니다.

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

같은 key·nonce를 두 번 쓰면 CTR keystream이 같아져 두 암호문의 XOR이 두 평문의 XOR이 됩니다. 인증도 무너집니다. SP 800-38D Appendix A는 IV가 반복되면 공격자가 hash subkey H를 알아낼 가능성이 높고, 그러면 임의의 암호문·AAD에 맞는 tag를 만들 수 있다고 적습니다. 그래서 재부팅·전원 차단·counter 복원·key 교체를 포함한 key 수명 전체에서 nonce가 겹치지 않아야 합니다. 난수 nonce에는 상한도 있습니다. [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final) §8.3은 96-bit IV를 결정적 구성(counter 등)으로 만드는 경우를 빼면, 난수 IV를 쓰는 구현의 암호화 호출 횟수를 한 key당 2^32회로 제한합니다. 장치 여러 대가 같은 key를 나눠 쓰면 이 상한도 나눠 가집니다.

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

[NIST SP 800-57 Part 1 Rev.5 Table 2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf)(§5.6.1.1)는 RSA-2048을 112-bit, RSA-3072와 ECC 256~383-bit를 128-bit security strength에 대응시킵니다. P-256과 같은 강도의 RSA는 2048이 아니라 3072입니다. 같은 강도로 맞추면 서명 크기는 RSA-3072 384 B 대 P-256 raw 64 B입니다([Ch 2](/blog/embedded/embedded-security/chapter02-secure-boot)의 OpenSSL 측정).

| 항목 | 확인할 내용 |
|------|------|
| ECDSA | nonce 재사용 방지와 승인된 난수·deterministic 생성 방식. DER·raw 서명 형식을 구분 |
| Ed25519 | [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)의 형식과 순수형·prehash형을 구분. 결정적 서명도 구현 결함·fault·key 유출을 막아 주지는 않음 |
| RSA | modulus 크기·padding·hash·salt 조건과 검증 정책. 공개 지수와 구현에 따라 비용이 다름 |
| Key storage | key ID를 쓴다고 비밀키가 반드시 secure element에 있는 것은 아님. 실제 lifetime·location·정책 확인 |

Flash 비용은 [Ch 1](/blog/embedded/embedded-security/chapter01-threat-model)에서 Cortex-M4 object로 쟀습니다. Mbed TLS 3.6.4 기준 RSA 경로가 22,938 B, P-256 ECDSA 경로가 25,959 B로 비슷했습니다. 코드 크기보다 서명·키 크기와 BootROM·상대 장치가 받아 주는 알고리즘 목록이 선택을 가릅니다.

## 가속기 연결과 자원 수명

Mbed TLS에서 하드웨어를 연결하는 길은 두 가지입니다. 하나는 모듈을 통째로 바꾸는 `MBEDTLS_<MODULE>_ALT`이고, 다른 하나는 PSA Crypto driver입니다. [`mbedtls_config.h`](https://github.com/Mbed-TLS/mbedtls/blob/c765c831e5c2a0971410692f92f7a81d6ec65ec2/include/mbedtls/mbedtls_config.h#L356-L397)는 `MBEDTLS_AES_ALT`를 켜면 "모듈 전체를 대체"하고 `aes_alt.h`를 include한다고 설명하며, `MBEDTLS_GCM_ALT`·`MBEDTLS_SHA256_ALT`는 별도 macro로 둡니다. 그래서 AES만 하드웨어로 바꾸면 GCM은 어떻게 될까요? [`gcm.c`](https://github.com/Mbed-TLS/mbedtls/blob/c765c831e5c2a0971410692f92f7a81d6ec65ec2/library/gcm.c#L347-L365)를 보면 `MBEDTLS_GCM_ALT`가 없을 때 AES block 암호화는 `mbedtls_block_cipher`를 거쳐 ALT AES로 가지만, GHASH 곱셈(`gcm_mult`)은 x86 AES-NI나 Armv8-A crypto extension(AESCE)이 없으면 소프트웨어 table 구현으로 돕니다. Cortex-M에는 둘 다 없으므로 GHASH는 CPU가 계산합니다.

| 확인 지점 | 실패 또는 반례 |
|------|------|
| 엔진의 알고리즘·모드 | AES ALT만 켜면 GHASH는 위처럼 소프트웨어. 엔진이 GCM 전체를 하면 `MBEDTLS_GCM_ALT`나 PSA driver로 연결 |
| SDK API와 buffer | 정렬·cache·DMA 길이 단위가 맞지 않거나 마지막 block 처리 실패 |
| 비동기 완료 | 제출 성공을 완료로 오인해 buffer·key를 먼저 해제 |
| 동시 사용 | 여러 task의 key·context·DMA channel 소유권 충돌 |
| Fallback | 지원되지 않은 크기·모드가 software로 내려가며 예상 지연을 초과 |
| Key cleanup | library context 해제와 hardware key slot 삭제가 별도 절차 |

PSA API도 마찬가지입니다. `psa_cipher_encrypt()`를 불렀다고 엔진이 도는 것이 아니라, `MBEDTLS_PSA_CRYPTO_DRIVERS`로 연결한 driver가 해당 algorithm과 key location을 받아들일 때만 엔진으로 갑니다. 실제로 엔진을 쓰는지는 driver 함수에 breakpoint를 걸거나 엔진의 status register가 바뀌는지 봐서 확인합니다.

## Entropy와 side-channel 검증

Entropy source는 물리 source의 평가·health test, DRBG는 수집된 entropy를 바탕으로 하는 생성기로 역할이 다릅니다. [SP 800-90B](https://csrc.nist.gov/pubs/sp/800/90/b/final)와 [SP 800-90A Rev.1](https://csrc.nist.gov/pubs/sp/800/90/a/r1/final)의 범위를 구분합니다. 실패한 TRNG 출력을 계속 쓰거나 반환값을 버리고 seed 성공으로 처리하면 안 됩니다. GCM nonce의 유일성 요구와 CBC IV의 예측 불가능성 요구도 같은 규칙으로 묶지 않습니다.

Timing 방어에는 검증된 비교 함수와 비밀값 의존 branch·memory access 검토가 필요합니다. Mbed TLS 3.6.4는 [`constant_time.h`](https://github.com/Mbed-TLS/mbedtls/blob/c765c831e5c2a0971410692f92f7a81d6ec65ec2/include/mbedtls/constant_time.h#L32)에 `mbedtls_ct_memcmp()`를 public API로 둡니다. 아래 실행에서 같은 16 B는 0, 마지막 byte만 다른 입력은 0이 아닌 값(256)을 반환했습니다. 이 결과는 동작이 맞다는 확인일 뿐이고, 실행 시간이 입력과 무관하다는 측정은 아닙니다.

Masking은 중간 비밀값을 random share로 나누는 접근이며, 단순 delay 추가와 다릅니다. 하드웨어 AES 엔진도 전력은 소비하므로 "hardware면 side-channel 안전"은 성립하지 않습니다. 공격과 방어는 [Ch 7](/blog/embedded/embedded-security/chapter07-side-channel)에서 다룹니다.

## 실행 결과와 남은 타깃 시험

Host 검사는 본문의 두 C 함수를 markdown에서 그대로 추출해 ASan·UBSan으로 빌드한 3.6.4 library에 연결했습니다. GCM 입력은 McGrew·Viega 시험 벡터 4의 key·IV·AAD에 60 B 합성 평문을 쓴 것입니다. 출력의 일부는 다음과 같습니다.

```text
encrypt rc=0
tag=73d7bd76f25294936a156a562f5c599b
decrypt ok rc=0 match=1
tag flip rc=-18
cipher flip rc=-18
aad flip rc=-18
nonce flip rc=-18
key flip rc=-18
tag len 3 rc=-20
sha empty rc=0 d=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
sha chunk0 rc=-116 (MBEDTLS_ERR_SHA256_BAD_INPUT_DATA=-116)
ct_memcmp equal=0 diff=256
hmac rc=0 hmac=b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7
selftest aes=0 gcm=0 sha256=0
```

`-18`은 `MBEDTLS_ERR_GCM_AUTH_FAILED`(-0x0012), `-20`은 `MBEDTLS_ERR_GCM_BAD_INPUT`(-0x0014)입니다. Tag·암호문·AAD·nonce·key 중 1 bit만 바꿔도 `mbedtls_gcm_auth_decrypt()`가 인증 실패를 돌려줬습니다. 암호문과 tag는 Python `cryptography` 50.0.2의 `AESGCM`으로 따로 계산한 값과 같았습니다. `hash_chunks()`는 길이 1·63·64·65·999·1000 B와 chunk 1·7·64·4096의 24개 조합 모두 Python `hashlib.sha256`과 같은 digest를 냈습니다. HMAC 값은 [RFC 4231](https://www.rfc-editor.org/rfc/rfc4231) test case 1의 HMAC-SHA-256과 같습니다. ASan·UBSan 경고는 없었습니다.

MCU에서 가속 전후를 비교한다면 같은 입력 크기와 메모리 영역에서 DWT cycle counter로 CPU cycle을, DMA 완료 interrupt까지의 시간을 함께 잽니다. 이 장에서는 MCU 성능을 측정하지 않았습니다.

## 정리

- AES-GCM은 반환값과 인증 결과를 확인하고 key별 nonce 유일성을 관리합니다.
- Streaming SHA는 실제 마지막 조각 길이와 read 실패를 처리합니다.
- Hash·HMAC·서명은 다른 신뢰 가정을 가집니다.
- 알고리즘 비교는 같은 security strength와 실제 platform 지원을 기준으로 합니다.
- 가속은 빌드·driver·key location·완료·fallback을 관찰해 확인합니다.
- `MBEDTLS_AES_ALT`만 켜면 Cortex-M에서 GHASH는 소프트웨어로 남습니다.
- 난수 IV GCM은 key당 2^32회가 상한입니다(SP 800-38D §8.3).
- Host 시험에서 1 bit 변조는 모두 `-18`(AUTH_FAILED)로 거부됐고, 이 결과는 MCU 성능·side-channel 시험이 아닙니다.

다음 편은 **Ch 4: TrustZone — Cortex-A / Cortex-M**. 지금까지의 키와 알고리즘을 *어디에 두고 누가 접근하게 할 것인가*를 결정하는 분리 메커니즘을 봅니다.

## 관련 항목

- [Ch 2: Secure Boot — 부트 체인 검증](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 7: 사이드채널 공격](/blog/embedded/embedded-security/chapter07-side-channel)
- CERT C — 보안 코딩 규칙
- MISRA C — 안전 임베디드 규칙
