---
title: "ESP32-C3 보안 분석 — Secure Boot·Flash Encryption·eFuse"
slug: "embedded/riscv/esp32-c3-mastering/chapter11-security"
date: 2026-05-20T09:11:00
description: "ESP-IDF v5.4.2의 C3 RSA-PSS Secure Boot V2·XTS-AES-128과 eFuse·재플래시·anti-rollback 조건을 확인합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 11
tags: [security, secure-boot, flash-encryption, efuse, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **Secure Boot의 서명 검증과 Flash Encryption의 기밀성, eFuse의 정책·키 용도는 별도 계약입니다.** 설정 하나가 모든 공격·복구 실패를 막는 보장은 아닙니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`와 C3의 해당 chip revision입니다. [공식 Secure Boot V2 문서](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/security/secure-boot-v2.html)는 C3 v0.3(ECO3)부터 RSA-PSS/RSA-3072를 사용한다고 설명합니다. 기존의 ECDSA-P256 설명은 이 target과 맞지 않습니다.

이 장은 고정 source의 조건과 read-only counter 해석을 다룹니다. 실제 flash·eFuse burn·서명 image boot·키 provisioning을 실행한 결과가 아닙니다. 한 줄로 SECURE_BOOT_EN을 먼저 burn하던 이전 예는 image·digest·보호 설정의 일관성을 준비하지 못하므로 실행 절차에서 제외했습니다.

## eFuse — 일회성 비트의 보관소

eFuse는 *0 → 1로만 바꿀 수 있는 OTP 비트*입니다. 한 번 burn하면 *영원히 1*입니다. ESP32-C3에는 *11개 블록*이 있습니다.

| 블록 | 용도 | 비고 |
|------|------|------|
| BLOCK0 | 시스템 설정 비트 | reserved 영역 다수 |
| BLOCK1 | MAC 주소, 칩 버전 | 공장 출하 시 burn |
| BLOCK2 | System data | 공장 출하 시 burn |
| BLOCK3 | User data | 사용자가 자유 사용 |
| BLOCK4~BLOCK9 | Key blocks 0~5 | Secure Boot, Flash Encryption, HMAC, DS 키 |
| BLOCK10 | 시스템 (calibration 등) | 공장 출하 시 burn |

키 블록 6개는 *256-bit씩 6개의 서로 다른 키*를 보관할 수 있습니다. 각 블록은 *용도가 별도로 지정*됩니다.

현장 확인에는 chip revision, read-only eFuse summary, effective sdkconfig, key purpose와 보호 bit, 실제 image·partition/boot offset을 함께 기록합니다. Summary 출력 형식은 사용한 esptool/espefuse 버전의 실제 결과를 보관합니다. 이 글에는 기기에서 수집하지 않은 summary transcript를 실측처럼 넣지 않습니다.

키 block마다 key purpose와 read/write protection이 다릅니다. Secure Boot public-key digest를 비밀 HMAC/flash key와 같은 방식으로 보호한다고 일반화하지 않습니다. Plain public key와 그 digest는 비밀 signing key와도 다른 자료입니다.

## Secure Boot V2 — RSA-PSS image 검증

ROM이2nd-stage bootloader를, bootloader가 application image를 검증합니다. ROM 자체는 변경되지 않는 코드입니다. Partition table을 또 하나의 RSA 서명 image 단계로 넣고64byte ECDSA trailer가 붙는다고 설명한 이전 체인은 맞지 않습니다. Partition table의 checksum·암호화와 image signature를 구분합니다.

기준 SDK의 signature sector와 padding을 포함해 실제 signed image 크기를 확인합니다. 키 digest의 저장·최대3개 key slot·revocation은 chip revision과 설정을 따르며, 단순 "동일 key만 영원히 가능"이라는 제약으로 설명하지 않습니다. 반대로 slot이 있다고 검증되지 않은 새 key를 임의로 추가할 수 있는 것도 아닙니다.

### 준비와 검증 범위

서명 key 생성·보관, bootloader/application 서명, public-key digest와 eFuse 목적/보호, 최초 enable 순서와 flash 경로는 **기준 문서의 C3 전체 절차**를 한 단위로 대조합니다. 원래의 `--scheme ecdsa256` command와 "bootloader·partition·app 모두 자동 서명" 출력은 제거했습니다.

서명 검증 실패는 boot 후보와 정책에 따라 중단·다른 image 탐색 등으로 이어집니다. 무조건 reset loop 또는 모든 기기의 영구 폐기라고 단정하지 않습니다. Key rotation·분실·revocation·미서명/손상 image·전원 중단·유효한 recovery image를 실제 대상에서 확인해야 합니다.

## Flash Encryption — XTS-AES-128과 적용 영역

기준 C3 `soc_caps.h`는 `SOC_FLASH_ENCRYPTION_XTS_AES_128`을 선언합니다. XTS용256-bit key material을 두128-bit AES key로 사용하는 구성을 "AES-256-XTS"라고 부르면 다른 알고리즘 선택과 혼동됩니다. Flash chip 자체의 모든 byte를 무조건 암호화하는 것도 아닙니다. App·bootloader·partition metadata와 encrypted flag가 있는 data 등 적용 범위를 확인하며 NVS의 별도 암호화 정책도 구분합니다.

[기준 Flash Encryption 문서](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/security/flash-encryption.html)의 Development/Release·download 관련 조건을 맞춥니다. XTS는 주소에 의존하므로 host에서 만든 ciphertext를 다른 offset으로 옮기면 안 됩니다. 이것이 image signature·runtime 접근 제어·전송 인증을 대신하지는 않습니다.

### SPI_BOOT_CRYPT_CNT는 set-bit 개수

C3의 counter는3bit입니다. **숫자가 홀수인지가 아니라 set bit 개수가 홀수인지**로 enable 상태를 해석합니다. 예를 들어1(`001`)과7(`111`)은 enable,3(`011`)은 disable입니다. 아래 helper는 입력 숫자만 해석하고 eFuse나 register를 읽거나 쓰지 않습니다.

```c title="c3-security-counters.c"
#include <stdbool.h>
#include <stdint.h>

typedef struct {
    bool flash_encryption_enabled;
    unsigned secure_version;
} c3_security_counters_t;

bool c3_decode_security_counters(unsigned crypt_count, uint16_t version_bits,
                                 unsigned version_field_bits,
                                 c3_security_counters_t *out) {
    if (!out || crypt_count > 7 || version_field_bits == 0 || version_field_bits > 16)
        return false;
    unsigned count = 0, version = 0;
    for (unsigned i = 0; i < 3; ++i) count += (crypt_count >> i) & 1u;
    for (unsigned i = 0; i < version_field_bits; ++i) version += (version_bits >> i) & 1u;
    out->flash_encryption_enabled = (count & 1u) != 0;
    out->secure_version = version;
    return true;
}
```

실제 security 판정은 이 두 값뿐 아니라 key·purpose·write protection·download/JTAG·bootloader/image 상태를 함께 확인합니다. 이 helper를 기기 보안 검증기나 release 판정기로 사용하지 않습니다.

### Development와 Release의 재기록 조건

기기에서 생성하고 read-protect한 key를 host가 나중에 꺼내 사전 암호화할 수 있다고 가정하면 안 됩니다. UART download의 encryption 경로와 host가 보유한 key로 만드는 ciphertext, OTA의 runtime flash 쓰기는 서로 다릅니다. Key provisioning 방식·tool command·실제 flash offset을 먼저 구분합니다.

Release는 counter와 download manual-encryption 등의 정책을 잠그지만 **모든 UART/JTAG 기능이 단일 모드 flag로 항상 같은 방식으로 차단되며 OTA만 남는다**고 단정하지 않습니다. Development에서도 일부 debug/download eFuse가 설정될 수 있습니다. 실제 보호 bit·secure download 설정·key 보유/허용 정책·signed update 경로를 함께 확인합니다. 기존의 Release counter를3또는7로 제시한 burn 순서는 제거했습니다.

## Anti-rollback — 구버전 펌웨어 방지

Anti-rollback은 application의 `secure_version`과 eFuse에 기록된 최소 허용 version을 비교하는 정책입니다. Source의 `esp_efuse_check_secure_version()`과 업데이트 시점을 확인하고, 임의의 version 숫자가 적혀 있다고 Secure Boot·서명 검증까지 활성화됐다고 읽지 않습니다.

기준 C3 `esp_efuse_table.csv`의 `SECURE_VERSION`은16bit이고 `BOOTLOADER_APP_SEC_VER_SIZE_EFUSE_FIELD`의 C3 범위도1~16입니다. Binary 정수 counter가 아니라 선택한 field의 burn된 bit 개수로 version을 표현하므로0~16의 상태를 구분합니다. 기존32bit/최대32 설명은 다른 target의 값을 옮긴 것입니다.

Version burn 시점은 image 상태 확인·rollback 설정과 관련됩니다. "새 image가 한 번 boot되면 언제나 즉시 burn"으로 단순화하지 않습니다. 기준 bootloader의 anti-rollback partition 제약(factory/test와 OTA 구성 포함), old/new signed image·실패한 self-test·복구 가능성을 함께 시험합니다.

## HMAC와 Digital Signature peripheral

`esp_hmac_calculate()`는 SHA-256 HMAC을 계산하며 output은32byte입니다. 이 공개 API의 key purpose는 **HMAC upstream** 조건을 만족해야 합니다. Downstream purpose를 같은 API에 넣어도 된다는 설명은 잘못됐습니다. Downstream은 내부 주변장치 등 별도 경로에 사용됩니다.

다음은 이미 적절히 provision된 key를 지정하는 bounded wrapper입니다. Key를 생성하거나 eFuse에 기록하지 않습니다.

```c title="c3-hmac.c"
#include <stddef.h>
#include <stdint.h>
#include "esp_hmac.h"

esp_err_t c3_hmac(hmac_key_id_t key, const void *message, size_t length,
                   uint8_t output[32]) {
    if (key < HMAC_KEY0 || key >= HMAC_KEY_MAX || !message || !output || length > 4096)
        return ESP_ERR_INVALID_ARG;
    return esp_hmac_calculate(key, message, length, output);
}
```

DS peripheral은 암호화된 RSA private-key 자료와 HMAC 관련 key 정책을 사용하는 별도 경로입니다. 평문 private key를 application에 반환하거나 무조건 boot 시 복호화하는 API로 설명하지 않습니다. 특정 cloud 서비스의 채택·현재 제공 여부를 이 hardware 기능의 근거로 삼지 않습니다.

## Development → Release 전환 워크플로

Security 전환 전에는 아래 자료가 같은 기기·build·키 정책을 가리켜야 합니다. 확인 prompt나 dry-run이라는 말만으로 실제 burn 결과를 되돌릴 수 있는 것은 아닙니다.

| 확인 영역 | 필요한 증거 |
|---|---|
| 대상 | 정확한 part/revision·기존 eFuse summary·기존 보호 상태 |
| Image | SDK/config/toolchain·boot offset·partition·서명/padding·각 image hash |
| Key | signing key 보관·복구·사용 권한, public-key digest/slot/revocation 대응 |
| Encryption | 기기/host key 생성 위치·목적·read/write protection·주소 대응 |
| Update | 허용한 download·OTA 경로와 old/new/미서명/손상 image 거부 결과 |
| Recovery | 전원 차단·부분 provisioning·key 변경·self-test 실패 시 가능한 경로 |

고정24~48시간만 실행하면 합격한다는 기준은 사용하지 않습니다. Key 분실과 잘못된 보호 bit는 복구 경로를 줄일 수 있으므로 제품의 backup/rotation·수명 정책과 검증된 부트 후보를 함께 준비합니다. 반대로 오류 하나만으로 모든 기기를 폐기하거나 같은 binary를 sign+encrypt하면 해결된다고 진단하지 않습니다.

## 정리

C3 Secure Boot V2는 RSA-PSS image 검증, Flash Encryption은 XTS-AES-128 적용 영역의 기밀성, eFuse는 key 목적·보호·counter 정책을 담당합니다. Counter의 bit-count 산술과 실제 보안 활성·최초 provisioning·복구 성공은 구분해 기록합니다.

## 다음 편

[Ch 12: 전력 관리 — Modem/Light/Deep Sleep와 Wake 소스](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)는 이 시리즈의 마지막 장입니다. 보안된 펌웨어의 조건별 전력 예산, deep sleep과 RTC 도메인, wake 소스를 정리합니다.

## 관련 항목

- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build) — 서명되는 binary들의 출처
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)
- [Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model) — Secure Boot 일반 원리
- [원문 — ESP-IDF Secure Boot V2](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/security/secure-boot-v2.html)
- [원문 — ESP-IDF Flash Encryption](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/security/flash-encryption.html)
- [원문 — espefuse.py reference](https://docs.espressif.com/projects/esptool/en/v5.4.2/esp32c3/espefuse/index.html)
