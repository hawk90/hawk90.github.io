---
title: "Cortex-M33 TF-M·TrustZone — Secure Firmware·PSA·MCUboot"
slug: "embedded/modern-recipes/part12-12-tfm-trustzone"
date: 2026-04-21T09:10:00
description: "Cortex-M33+ TrustZone-M 위에 TF-M으로 secure firmware를 구성하는 패턴. SPE/NSPE, PSA Crypto/ITS/Attestation, MCUboot secure boot를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 148
tags: [recipes, security, tf-m, trustzone, psa, cortex-m33, mcuboot]
topics: ["embedded"]
---

## 한 줄 요약

> **"TF-M은 TrustZone-M Cortex-M의 secure side에 PSA Crypto·Storage·Attestation 같은 service를 두고, non-secure side의 RTOS·앱이 PSA API로 부르게 하는 open-source firmware입니다."** 아래에서 TF-M과 그 regression test를 QEMU의 `mps2-an521`(Cortex-M33 두 개를 가진 Arm 보드 모델)에 올려, non-secure 쪽에서 PS·ITS·Crypto·Attestation service를 부르는 86개 test가 모두 통과하는 것을 확인했습니다.

## 이 글의 실행 환경

- TF-M `main` commit `2fa55f413`(`git describe`: `TF-Mv2.3.0-461-g2fa55f413`), tf-m-tests `4484a81`
- 빌드: Debian 13 arm64 guest, `arm-none-eabi-gcc` 14.2.1, CMake 3.31.6. Python 의존성은 TF-M 문서대로 저장소에서 `pip install -e .`로 설치했습니다.
- 실행: macOS의 QEMU 11.1.3 `mps2-an521`
- 규제·인증 내용은 공식 페이지에서 확인했고(2026-11-17), 일정은 이미 정리된 [Embedded Security 8장](/blog/embedded/embedded-security/chapter08-iot-standards)과 맞췄습니다.

## 어떤 상황에서 쓰나

네트워크에 연결되는 MCU 제품에서 key와 credential을 펌웨어의 나머지 부분과 격리하고, secure boot와 device attestation을 갖추려는 경우입니다. 규제 측면에서는 다음을 검토합니다.

- **EU Cyber Resilience Act (Regulation (EU) 2024/2847)** — 2024-12-10 발효, Article 14 보고 의무는 2026-09-11, 주요 제품 요구는 2027-12-11부터 적용됩니다.
- **UK PSTI** — gov.uk 안내에 따르면 consumer connectable product 보안 regime이 "came into effect on 29 April 2024"입니다. 요구 사항 셋 중 하나가 최소 보안 업데이트 기간을 공개하는 것입니다.

어떤 규제가 적용되는지, TF-M이 그 요구를 얼마나 채우는지는 제품·시장별로 판단합니다. US Cyber Trust Mark는 FCC 페이지가 403을 돌려줘 확인하지 못했으므로 이 글에서 다루지 않습니다.

## 핵심 개념

Armv8-M의 TrustZone은 core를 Secure와 Non-secure 두 상태로 나눕니다. TF-M은 Secure 쪽을 SPE(Secure Processing Environment), Non-secure 쪽을 NSPE라고 부릅니다.

| 쪽 | 구성 |
|----|------|
| SPE | TF-M core(SPM) + secure partition(Crypto, Internal Trusted Storage, Protected Storage, Initial Attestation 등) |
| NSPE | RTOS·application. PSA API client로 SPE service를 부름 |

주소 공간의 Secure/Non-secure 구분은 SAU(와 구현에 따라 IDAU)가 정하고, 메모리·peripheral 쪽은 보드의 MPC·PPC가 정합니다. NSPE가 secure 영역에 접근하면 Mainline core(Cortex-M33 등)에서는 SecureFault가 납니다. Non-secure 코드가 Secure 코드로 들어가는 입구는 SAU가 Non-Secure Callable(NSC)로 표시한 영역의 `SG` 명령뿐입니다(이 동작은 [2-09](/blog/embedded/modern-recipes/part2-09-trustzone-m) 등에서 AN505 QEMU로 확인했습니다).

PSA API는 vendor에 관계없이 같은 C API로 secure service를 부르게 합니다.

| API | 기능 |
|-----|------|
| PSA Crypto | 암호 연산과 key 관리. key는 `psa_key_id_t`로 다룸 |
| PSA Internal Trusted Storage (ITS) | 작은 secret을 secure 쪽 저장소에 |
| PSA Protected Storage (PS) | 암호화·인증해 저장, NV counter 기반 rollback 보호 |
| PSA Initial Attestation | device 상태를 담은 서명된 token |

TF-M의 PS integration guide는 "The current PS service provides rollback protection based on NV counters"라고 적습니다.

## 코드 / 실제 사용 예

### 빌드 — SPE와 NSPE를 따로

TF-M 문서의 기본 빌드는 SPE만 만들고, 결과를 `build/api_ns`에 설치합니다. 문서가 정리한 artifact 구조는 `bin`(SPE·bootloader(선택)·결합 image), `cmake`(SPE 설정과 NSPE toolchain), `config`, `image_signing`, `interface`(NSPE가 쓰는 PSA API header와 source)입니다.

```bash
cd trusted-firmware-m
pip install -e .                                   # Python deps, incl. mcuboot_imagesign_wrapper
cmake -S . -B build -DTFM_PLATFORM=arm/mps2/an521
cmake --build build -- install
```

`pip install -e .`을 빼고 `tools/requirements.txt`만 설치했더니 빌드 마지막의 서명 단계가 `mcuboot_imagesign_wrapper: not found`로 멈췄습니다. 이 명령은 저장소의 `pyproject.toml`이 제공합니다.

regression test는 tf-m-tests의 `tests_reg`에서 SPE에 test 코드를 넣어 빌드하고, NSPE test app을 그 `api_ns`로 따로 빌드합니다. 이 글에서는 NS 쪽 PS·ITS·Crypto·Attestation suite만 켰습니다.

```bash
cd tf-m-tests/tests_reg
cmake -S spe -B build_spe -DTFM_PLATFORM=arm/mps2/an521 \
      -DCONFIG_TFM_SOURCE_PATH=/root/trusted-firmware-m \
      -DTEST_S=OFF -DTEST_NS_CRYPTO=ON -DTEST_NS_ITS=ON -DTEST_NS_PS=ON -DTEST_NS_ATTESTATION=ON \
      -DTEST_NS_PLATFORM=OFF -DTEST_NS_FWU=OFF -DTEST_NS_MULTI_CORE=OFF -DTEST_NS_MANAGE_NSID=OFF
cmake --build build_spe -j4 -- install
cmake -S . -B build_test -DCONFIG_SPE_PATH=/root/tf-m-tests/tests_reg/build_spe/api_ns
cmake --build build_test -j4
```

```text
Memory region         Used Size  Region Size  %age Used
           FLASH:      118048 B       446 KB     25.85%
             RAM:       53088 B         1 MB      5.06%
```

이 출력은 `tfm_s`(SPE) link 결과입니다.

### QEMU에서 실행

an521의 `flash_layout.h`는 flash base `0x10000000`에서 BL2(MCUboot) 512 KB, 그 뒤에 primary slot(S 512 KB + NS 512 KB), secondary slot, scratch 순으로 둡니다. 그래서 BL2를 `-kernel`로, 서명된 S+NS image를 primary slot 주소 `0x10080000`에 올렸습니다.

```bash
qemu-system-arm -M mps2-an521 -kernel bl2.axf \
    -device loader,file=tfm_s_ns_signed.bin,addr=0x10080000 \
    -serial stdio -display none
```

```text
Non-Secure system starting...

#### Execute test suites for the Non-secure area ####
Running Test Suite PSA protected storage NS interface tests (TFM_NS_PS_TEST_1XXX)...
> Executing 'TFM_NS_PS_TEST_1001'
  Description: 'Set interface'
  TEST: TFM_NS_PS_TEST_1001 - PASSED!
...
Test suite 'PSA protected storage NS interface tests (TFM_NS_PS_TEST_1XXX)' has PASSED
Test suite 'PSA internal trusted storage NS interface tests (TFM_NS_ITS_TEST_1XXX)' has PASSED
Test suite 'Crypto non-secure interface test (TFM_NS_CRYPTO_TEST_1XXX)' has PASSED
Test suite 'Initial Attestation Service non-secure interface tests(TFM_NS_ATTEST_TEST_1XXX)' has PASSED

*** End of Non-secure test suites ***
```

test case 86개가 `PASSED!`였고 실패는 없었습니다. BL2가 primary slot의 서명을 검증하고 SPE로, SPE가 NSPE로 넘어가야 "Non-Secure system starting..."이 찍히므로, boot chain(BL2 → SPE → NSPE)이 QEMU에서 끝까지 돈 것입니다. 이 설정에서는 BL2·SPE의 log가 어느 UART에도 나오지 않았습니다.

### PSA Crypto — key 생성과 서명

```c
#include "psa/crypto.h"

psa_crypto_init();

psa_key_attributes_t attr = PSA_KEY_ATTRIBUTES_INIT;
psa_set_key_type(&attr, PSA_KEY_TYPE_ECC_KEY_PAIR(PSA_ECC_FAMILY_SECP_R1));
psa_set_key_bits(&attr, 256);
psa_set_key_usage_flags(&attr, PSA_KEY_USAGE_SIGN_MESSAGE);
psa_set_key_algorithm(&attr, PSA_ALG_ECDSA(PSA_ALG_SHA_256));
psa_set_key_lifetime(&attr, PSA_KEY_LIFETIME_PERSISTENT);
psa_set_key_id(&attr, 0x1001);

psa_key_id_t key_id;
psa_generate_key(&attr, &key_id);

uint8_t sig[64];
size_t  sig_len;
psa_sign_message(key_id, PSA_ALG_ECDSA(PSA_ALG_SHA_256), msg, msg_len, sig, sizeof(sig), &sig_len);
```

NSPE는 `key_id`만 들고 서명을 SPE에 맡깁니다. key의 usage flag에 export가 없으면 `psa_export_key`로 꺼낼 수도 없습니다. 위 Crypto suite가 NSPE에서 이 API들을 부르는 test입니다.

### ITS·PS

```c
#include "psa/internal_trusted_storage.h"
#include "psa/protected_storage.h"

psa_its_set(0x100, sizeof(device_secret), device_secret, PSA_STORAGE_FLAG_NONE);
psa_its_get(0x100, 0, sizeof(buf), buf, &out_len);

psa_ps_set(0x200, sizeof(secret), secret, PSA_STORAGE_FLAG_NONE);
psa_ps_get(0x200, 0, sizeof(buf), buf, &out_len);
```

`api_ns/interface/include/psa/`의 선언은 `psa_its_set(psa_storage_uid_t uid, size_t data_length, const void *p_data, psa_storage_create_flags_t create_flags)`이고 PS도 같은 형태입니다. 위 regression의 PS·ITS suite가 set·get과 write-once UID, 잘못된 offset·길이 같은 경우를 확인합니다.

### Initial Attestation

```c
#include "psa/initial_attestation.h"

uint8_t token[1024];
size_t  token_len;
psa_initial_attest_get_token(challenge, sizeof(challenge), token, sizeof(token), &token_len);
```

verifier가 보낸 challenge를 넣어 서명된 token을 받고, verifier가 그 서명과 내용을 확인합니다. Attestation suite가 이 호출을 non-secure 쪽에서 시험합니다.

### NSPE에서 직접 만든 service 부르기

```c
#include "psa/client.h"

#define MY_SERVICE_SID 0x00000200

psa_handle_t h = psa_connect(MY_SERVICE_SID, 1);
psa_invec  in[1]  = { { in_buf,  in_len  } };
psa_outvec out[1] = { { out_buf, out_size } };
psa_status_t s = psa_call(h, PSA_IPC_CALL, in, 1, out, 1);
psa_close(h);
```

`psa/client.h`에는 `psa_connect(uint32_t sid, uint32_t version)`, `psa_call(psa_handle_t handle, int32_t type, ...)`, `PSA_IPC_CALL (0)`이 있습니다.

### Secure partition 추가

TF-M의 secure partition 추가 문서에 있는 manifest 형식을 따른 예입니다.

```yaml
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

```c
#include "psa/service.h"
#include "psa_manifest/my_service_manifest.h"

void tfm_my_service_main(void) {
    while (1) {
        psa_signal_t signals = psa_wait(PSA_WAIT_ANY, PSA_BLOCK);
        if (signals & MY_SERVICE_SIGNAL) {
            psa_msg_t msg;
            psa_get(MY_SERVICE_SIGNAL, &msg);
            psa_status_t st = PSA_SUCCESS;
            if (msg.type == PSA_IPC_CALL) st = handle_request(&msg);   /* psa_read / psa_write on the iovecs */
            psa_reply(msg.handle, st);
        }
    }
}
```

문서의 예는 service 이름 `ROT_A`에 대해 `ROT_A_SIGNAL`을 씁니다. SFN model로 쓰려면 `"model": "SFN"`으로 바꾸고 `entry_point`를 지운 뒤 필요하면 `entry_init`을 둡니다. 이 partition은 이 글에서 빌드하지 않았습니다.

### MCUboot — 서명과 rollback

```bash
imgtool sign --key root-ec-p256.pem --header-size 0x400 --slot-size 0x100000 \
             --version 1.2.3 --security-counter 3 --align 8 \
             tfm_s_ns.bin tfm_s_ns_signed.bin
```

imgtool 2.5.0의 `sign --help`에 `-k/--key`, `-H/--header-size`, `-S/--slot-size`, `-v/--version`, `-s/--security-counter`, `--align`이 있습니다. an521 primary slot은 S + NS = 1 MB(0x100000)입니다. TF-M build는 이 서명을 `mcuboot_imagesign_wrapper`로 자동으로 하고, NSPE를 다시 서명할 수 있도록 `api_ns/image_signing`을 내보냅니다.

MCUboot 설계 문서는 primary slot의 image가 유효하지 않으면 `BOOT_SWAP_TYPE_FAIL`이 되고 "MCUboot hangs rather than booting an invalid or compromised image"라고 적습니다. downgrade 방지는 새 image가 "higher version/security counter number"를 가져야 한다는 기능입니다. 업데이트 방식은 TF-M 기본값이 `MCUBOOT_UPGRADE_STRATEGY = OVERWRITE_ONLY`이고, `SWAP_USING_SCRATCH`, `SWAP_USING_MOVE`, `DIRECT_XIP`, `RAM_LOAD`를 고를 수 있습니다. 두 image를 번갈아 쓰는 A/B 방식이 필요하면 이 값을 바꿉니다.

### SAU 설정

```c
void sau_setup(void) {
    SAU->RNR  = 0;                                                 /* non-secure flash */
    SAU->RBAR = NS_FLASH_START & SAU_RBAR_BADDR_Msk;
    SAU->RLAR = ((NS_FLASH_END - 1) & SAU_RLAR_LADDR_Msk) | SAU_RLAR_ENABLE_Msk;

    SAU->RNR  = 1;                                                 /* secure, non-secure callable */
    SAU->RBAR = NSC_START & SAU_RBAR_BADDR_Msk;
    SAU->RLAR = ((NSC_END - 1) & SAU_RLAR_LADDR_Msk) | SAU_RLAR_NSC_Msk | SAU_RLAR_ENABLE_Msk;

    SAU->RNR  = 2;                                                 /* non-secure SRAM */
    SAU->RBAR = NS_SRAM_START & SAU_RBAR_BADDR_Msk;
    SAU->RLAR = ((NS_SRAM_END - 1) & SAU_RLAR_LADDR_Msk) | SAU_RLAR_ENABLE_Msk;

    SAU->CTRL = SAU_CTRL_ENABLE_Msk;
    __DSB(); __ISB();
}
```

CMSIS_6(`69b5aa3`) `core_cm33.h`로 `-mcpu=cortex-m33 -mcmse` 컴파일만 했습니다. `(NS_FLASH_END - 1) | SAU_RLAR_ENABLE_Msk`처럼 끝 주소를 mask하지 않고 OR하면 안 됩니다. 끝 주소가 `0x003FFFFF`처럼 끝나면 하위 bit가 모두 1이라, `SAU_RLAR_NSC_Pos`가 1인 RLAR에서 **NSC bit까지 켜집니다**. 그래서 끝 주소는 `SAU_RLAR_LADDR_Msk`로 거른 뒤 필요한 flag만 OR합니다. TF-M은 이 설정을 platform code에서 하므로 직접 쓸 일은 보통 없지만, bare-metal TrustZone을 짤 때 그대로 걸리는 실수입니다.

## 측정 / 성능 비교

QEMU는 시간을 흉내 내지 않으므로 이 글에서는 latency를 재지 않았습니다. 대상 보드에서는 다음을 잽니다.

| 연산 | 측정 이유 |
|---|---|
| AES-GCM encrypt (payload 크기별) | 통신·PS 암호화 처리량 |
| SHA-256 | image 검증·attestation |
| ECDSA P-256 sign·verify | TLS handshake·attestation token |
| Initial attestation token 생성 | 서버 접속 지연 |
| PSA service 호출 왕복 | NSC + IPC 비용 |

PSA Certified의 level은 PSA Certified 페이지 기준으로 다음과 같습니다.

| Level | 페이지 설명 |
|---|---|
| Level 1 | questionnaire와 interview로 보안 best practice와 정부 요구 정렬을 보임 |
| Level 2 | PSA Root of Trust에 대한 lab 침투 시험, 원격·확장 가능한 software 공격 대응 |
| Level 3 | PSA Root of Trust에 대한 lab 침투 시험, hardware 공격에 대한 견고성 |
| Level 4 iSE/SE | private key와 암호 기능을 보호하는 Secure Enclave·Secure Element의 high attack potential 시험 |

## 자주 보는 함정

> ⚠️ SAU RLAR에 끝 주소를 그대로 OR

위에서 본 것처럼 하위 bit가 NSC bit를 켭니다. `SAU_RLAR_LADDR_Msk`로 거릅니다.

> ⚠️ Python 의존성만 설치하고 TF-M 패키지를 빼먹음

`mcuboot_imagesign_wrapper`가 없어 서명 단계가 실패합니다. TF-M 저장소에서 `pip install -e .`을 합니다.

> ⚠️ secure entry 함수에 CMSE 속성 누락

Secure 쪽 함수를 Non-secure에서 부르려면 `__attribute__((cmse_nonsecure_entry))`로 veneer를 만들게 해야 합니다([2-09](/blog/embedded/modern-recipes/part2-09-trustzone-m)에서 `--cmse-implib`와 함께 확인).

> ⚠️ key를 NSPE로 export

NSPE가 raw key를 들면 NSPE가 뚫렸을 때 key도 노출됩니다. `key_id`만 넘기고 export 권한을 주지 않습니다.

> ⚠️ security counter를 올리지 않은 수정 image

downgrade 방지는 security counter·version 비교로 동작하므로, 취약점을 고친 image는 counter를 올려 서명합니다.

> ⚠️ A/B 업데이트를 기본으로 가정

TF-M의 MCUboot 기본값은 `OVERWRITE_ONLY`입니다. 이전 image로 되돌릴 수 있어야 하면 swap 계열 전략을 고르고 flash layout을 맞춥니다.

## 정리

- TF-M은 SPE에 PSA service를 두고 NSPE가 PSA API로 부르는 구조이고, QEMU `mps2-an521`에서 NS 쪽 PS·ITS·Crypto·Attestation regression 86개가 모두 통과했습니다.
- 빌드는 SPE(`api_ns` 설치)와 NSPE를 따로 하고, Python 의존성은 TF-M 저장소의 `pip install -e .`로 설치합니다.
- an521에서 BL2는 `0x10000000`, primary slot은 `0x10080000`입니다.
- MCUboot는 유효하지 않은 primary image로 boot하지 않고 멈추며, TF-M 기본 업데이트 전략은 `OVERWRITE_ONLY`입니다.
- SAU RLAR에는 끝 주소를 `SAU_RLAR_LADDR_Msk`로 거른 뒤 flag를 OR합니다.
- CRA·PSTI 적용 여부와 PSA Certified level은 제품·시장별로 판단합니다.

다음 편은 **Matter·Thread IoT 표준**입니다.

## 관련 항목

- [12-11: 온디바이스 LLM](/blog/embedded/modern-recipes/part12-11-on-device-llm)
- [12-13: Matter·Thread](/blog/embedded/modern-recipes/part12-13-matter-thread)
- [RTOS 4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
