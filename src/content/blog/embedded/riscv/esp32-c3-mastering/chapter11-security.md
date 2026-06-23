---
title: "ESP32-C3 보안 분석 — Secure Boot·Flash Encryption·eFuse"
date: 2026-05-20T09:11:00
description: "ECDSA 기반 Secure Boot V2, AES-256 Flash Encryption, eFuse 키 보관."
series: "ESP32-C3 Mastering"
seriesOrder: 11
tags: [security, secure-boot, flash-encryption, efuse, esp32-c3]
draft: false
---

## 한 줄 요약

> **"Secure Boot는 *코드가 진짜 우리 것*임을 증명하고, Flash Encryption은 *플래시를 읽혀도 의미가 없게* 합니다. eFuse는 *둘의 키를 영구히 보관*하는 OTP 비트입니다."** 한 번 *Release 모드*로 봉인하면 *되돌릴 수 없습니다*. 양산 라인에 올리기 전 워크플로를 반드시 손에 익혀야 합니다.

ESP32-C3의 보안 모델은 *3중 레이어*입니다. *Secure Boot V2*가 부팅 체인을 검증하고, *Flash Encryption*이 플래시 내용을 AES-XTS로 암호화하며, *eFuse*가 두 시스템의 키와 정책 비트를 저장합니다. ESP32-C3는 원본 ESP32와 달리 *RSA가 아니라 ECDSA-256(P-256)* 서명을 씁니다.

이번 장에서는 eFuse의 구조, Secure Boot V2 키 생성·서명·burn 절차, Flash Encryption Development vs Release 모드, anti-rollback, HMAC peripheral 사용, 그리고 *영구 brick을 안 만드는* 워크플로까지 다룹니다.

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

```bash
# 칩의 eFuse 상태 확인
espefuse.py --port /dev/ttyUSB0 summary
```

```text
EFUSE_NAME (Block)                       Description = [Value]                      [Readable/Writeable]
=== Generated from "esp_efuse_table.csv" ===
WR_DIS (BLOCK0)                          Disable programming of individual eFuses = 0 R/W
RD_DIS (BLOCK0)                          Disable reading from BlOCK4-10           = 0 R/W
SECURE_BOOT_EN (BLOCK0)                  Enable Secure Boot                       = False R/W
SECURE_BOOT_AGGRESSIVE_REVOKE (BLOCK0)   Enable aggressive Secure Boot key revocation = False R/W
SPI_BOOT_CRYPT_CNT (BLOCK0)              Enable encryption of SPI flash boot       = Disabled R/W
KEY_PURPOSE_0 (BLOCK0)                   KEY0 purpose                             = USER R/W
KEY_PURPOSE_1 (BLOCK0)                   KEY1 purpose                             = USER R/W
...
```

eFuse burn은 *되돌릴 수 없으니* 출력을 *반드시 dry-run*해 본 뒤 실행합니다.

```bash
espefuse.py --port /dev/ttyUSB0 burn_efuse SECURE_BOOT_EN 1
# 확인 프롬프트가 뜸. y를 누른 뒤에야 실제 burn.
```

## Secure Boot V2 — ECDSA 체인 검증

Secure Boot V2는 *3단계 체인*을 ECDSA-256으로 검증합니다.

| 단계 | 검증 |
|------|------|
| ROM bootloader (마스크롬, 변경 불가) | Boot ROM이 BOOTLOADER 영역의 서명을 검증 |
| Secondary bootloader (사용자 빌드, 서명 됨) | 자체적으로 partition table 서명 검증 |
| Partition table (서명 됨) | (다음 단계가 검증) |
| Application (서명 됨) | bootloader가 검증 |

각 단계의 서명은 *공통 ECDSA-256 공개키*로 검증됩니다. 공개키의 SHA-256 digest가 *eFuse의 SECURE_BOOT_V2_KEY_DIGEST에 burn*되어 있습니다. 최대 *3개의 digest*를 보관할 수 있어, *키 회전*이 가능합니다.

### 키 생성과 첫 빌드

```bash
# ECDSA-256 서명 키 생성
espsecure.py generate_signing_key --version 2 --scheme ecdsa256 \
    secure_boot_signing_key.pem

# menuconfig
idf.py menuconfig
# Security features →
#   Enable hardware Secure Boot in bootloader [*]
#   Secure bootloader mode → One-time flash
#   Sign binaries during build [*]
#   Secure boot private signing key → secure_boot_signing_key.pem
```

빌드하면 *bootloader, partition-table, app 세 binary가 자동 서명*됩니다.

```bash
idf.py build

# 결과:
# build/bootloader/bootloader.bin           (서명됨, 64-byte trailer)
# build/partition_table/partition-table.bin (서명됨)
# build/my_app.bin                          (서명됨)
```

### 첫 플래시

처음에는 *모든 영역*을 보통의 esptool로 씁니다.

```bash
idf.py -p /dev/ttyUSB0 flash

# 부팅 시 bootloader가 자동으로:
# 1. 자기 공개키 digest를 eFuse에 burn (없으면)
# 2. partition table·app 서명 검증
# 3. SECURE_BOOT_EN 비트를 burn
# 이후로는 서명된 binary만 받아들임
```

### 펌웨어 업데이트

이후의 모든 새 binary는 *동일 키로 서명되어야* 합니다.

```bash
# 새 빌드는 자동 서명됨
idf.py -p /dev/ttyUSB0 app-flash

# 또는 수동으로 OTA에 사용
espsecure.py sign_data --version 2 --keyfile secure_boot_signing_key.pem \
    --output my_app_signed.bin my_app.bin
```

서명되지 않은 binary는 *부팅 시 거부*되고 reset 루프에 들어갑니다.

## Flash Encryption — AES-256 XTS

Flash Encryption은 *플래시 칩 자체*를 AES-XTS로 암호화합니다. 누군가 *플래시를 떼서 직접 읽어도* 의미 있는 데이터가 나오지 않습니다.

| 항목 | 값 |
|------|-----|
| 알고리즘 | AES-XTS, 256-bit |
| 키 위치 | eFuse BLOCK4~9 중 하나 |
| 키 노출 | 외부 read 불가 (한 번 burn 후 RD_DIS=1) |
| 암호화 단위 | 32-byte sector |
| Tweak | 플래시 주소 기반 |

XTS의 *tweak*가 주소이므로 *같은 평문이라도 위치가 다르면 암호문이 다릅니다*. ECB 같은 패턴 누출이 없습니다.

### Development 모드

개발 단계에서는 *재플래시*가 필요합니다. Development 모드는 *encryption은 켜되 추가 플래시를 허용*합니다.

```text
sdkconfig
CONFIG_SECURE_FLASH_ENC_ENABLED=y
CONFIG_SECURE_FLASH_ENCRYPTION_MODE_DEVELOPMENT=y
CONFIG_SECURE_FLASH_REQUIRE_ALREADY_ENABLED=n
```

```bash
# 첫 플래시
idf.py -p /dev/ttyUSB0 flash
# bootloader가 부팅 시 자동으로:
# 1. 키 생성 (random) 후 eFuse에 burn
# 2. 플래시의 bootloader / partition table / app 영역을 in-place 암호화
# 3. SPI_BOOT_CRYPT_CNT를 1로 burn (Development = 홀수)
```

이후 `idf.py encrypted-flash`로 *새 binary를 호스트에서 미리 암호화해서* 씁니다. 또는 `idf.py flash`로 *평문 binary*를 보내면 부트로더가 *부팅 시 다시 암호화*합니다.

```bash
# 호스트 측 사전 암호화
espsecure.py encrypt_flash_data --keyfile flash_encryption_key.bin \
    --address 0x10000 --output app_encrypted.bin my_app.bin
```

### Release 모드 — 일방향 봉인

양산용입니다. Development의 *재플래시 허용 비트*를 모두 끕니다.

```text
sdkconfig
CONFIG_SECURE_FLASH_ENCRYPTION_MODE_RELEASE=y
```

```bash
idf.py -p /dev/ttyUSB0 flash
# bootloader가 자동으로 (Development와 다름):
# 1. SPI_BOOT_CRYPT_CNT를 3 또는 7로 burn (Release = 마지막 비트도 burn)
# 2. EFUSE_DIS_DOWNLOAD_MODE를 burn (UART download 영구 차단)
# 3. EFUSE_HARD_DIS_JTAG를 burn (JTAG 영구 차단)
# 4. 키 블록의 RD_DIS·WR_DIS를 burn (키 읽기·쓰기 영구 차단)
```

*이후로 호스트가 펌웨어를 갱신할 유일한 방법*은 *OTA*입니다. UART, JTAG, esptool은 모두 차단됩니다.

## Anti-rollback — 구버전 펌웨어 방지

공격자가 *알려진 취약점이 있는 옛 버전*을 다시 설치하지 못하게 막습니다. `secure_version` 필드를 *app descriptor에 박고*, eFuse의 *SECURE_VERSION 카운터*가 *현재 이상*인 펌웨어만 부팅합니다.

```text
sdkconfig
CONFIG_BOOTLOADER_APP_ANTI_ROLLBACK=y
CONFIG_BOOTLOADER_APP_SEC_VER=3
```

OTA에서 *새 펌웨어가 더 높은 secure_version*이면 부팅이 성공하고 *eFuse 카운터가 burn*됩니다. 한 번 burn된 카운터는 *되돌릴 수 없으니*, secure_version은 *신중히 증가*시킵니다. 너무 자주 올리면 *카운터 공간이 빨리 소진*됩니다.

| Version | eFuse 비트 | 비고 |
|---------|----------|------|
| 0~31 | 32-bit 카운터 단방향 | C3 기준 |

ESP32-C3는 *최대 32까지* anti-rollback이 가능합니다. *제품 수명 동안 보안 업데이트 횟수*를 미리 가늠해 *증분 정책*을 세워야 합니다.

## HMAC와 Digital Signature peripheral

ESP32-C3는 *하드웨어 HMAC 가속기*와 *Digital Signature(DS) peripheral*을 갖습니다.

```c
#include "esp_hmac.h"

uint8_t hmac_out[32];
const char *msg = "challenge_data";
ESP_ERROR_CHECK(esp_hmac_calculate(HMAC_KEY0, msg, strlen(msg), hmac_out));
```

HMAC 키도 *eFuse의 키 블록*에 저장됩니다. `KEY_PURPOSE`를 *HMAC_UP* 또는 *HMAC_DOWN*으로 burn해야 사용할 수 있습니다. 키는 *외부에서 읽을 수 없습니다*. 호스트가 *키를 알지 못해도*, 디바이스가 *알맞은 HMAC 응답*을 생성할 수 있어 *디바이스 인증*에 쓰입니다.

Digital Signature(DS) peripheral은 *RSA 서명을 하드웨어 가속*합니다. *클라우드 TLS 클라이언트 인증서*의 private key를 평문이 아닌 *암호화된 형태*로 플래시에 두고, *DS peripheral이 부팅 시 복호화해 사용*합니다. AWS IoT, Azure IoT, Google Cloud IoT 같은 *mTLS 환경*에 핵심입니다.

## Development → Release 전환 워크플로

가장 흔한 *영구 brick 시나리오*는 *Development에서 충분히 확인하지 않고 바로 Release*로 봉인하는 것입니다. 권장 워크플로입니다.

| 단계 | 활동 |
|------|------|
| **1. Development 모드 1차 검증** | sdkconfig `SECURE_FLASH_ENCRYPTION_MODE_DEVELOPMENT` · Secure Boot은 켜고 키 burn은 안 함 · 펌웨어가 잘 부팅·OTA되는지 확인 |
| **2. 키 생성과 백업** | `secure_boot_signing_key.pem` 생성 · HSM 또는 안전한 키 저장소에 백업 · 키 분실 = 향후 OTA 불가 = 모든 디바이스 영구 동결 |
| **3. Development 모드에서 Secure Boot 활성** | `SECURE_BOOT_EN` burn · 서명된 binary로 재플래시 · bootup·OTA 모두 검증 |
| **4. Release 모드로 전환** (한 디바이스에만 먼저) | sdkconfig `SECURE_FLASH_ENCRYPTION_MODE_RELEASE` · 한 디바이스에서 24~48시간 검증 · OTA, BLE provisioning, 정상 운영 시나리오 전부 |
| **5. 양산 라인 적용** | JTAG·UART 차단됨 · 디버그 불가, 모든 갱신은 OTA만 |

### 영구 brick 시나리오

- **키 분실** — secure_boot_signing_key.pem을 잃으면 *새 펌웨어를 서명할 수 없습니다*. 모든 디바이스가 *현재 버전에 고정*됩니다.
- **eFuse 오버 burn** — `WR_DIS` 비트를 잘못 burn해 *원하는 영역의 추가 수정이 차단*됩니다.
- **Release 모드의 OTA 버그** — OTA 코드에 버그가 있는 상태로 Release로 봉인하면, *영원히 그 버그와 함께* 살아야 합니다. UART·JTAG가 차단되어 *복구 불가*.
- **secure_version 오 burn** — 너무 높은 값을 burn하면 *모든 이전 버전 펌웨어가 부팅 거부*됩니다.

이런 시나리오를 피하는 핵심은 *Release 봉인 전에 Development 모드에서 충분히 검증*입니다. 특히 *OTA 경로*를 *반드시 한 번은 통과시킨 뒤* Release로 갑니다.

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| 서명된 binary가 부팅 거부 | 공개키 digest mismatch | keyfile 동일성 확인, 처음부터 다시 |
| "Flash encryption is in DEVELOPMENT" | release로 안 봉인됨 | 의도적이면 정상, 양산이면 RELEASE로 |
| JTAG 안 붙음 | Release 모드라 차단됨 | Release 봉인 후엔 JTAG 영구 불가 |
| OTA가 "image header magic" 에러 | 서명·암호화 누락 | espsecure.py sign + encrypt |
| secure_version mismatch | eFuse counter가 현재보다 큼 | 해당 디바이스 영구 폐기 |
| 새 binary가 너무 큼 → 파티션 오버 | encrypted binary는 약간 더 큼 | OTA 슬롯 크기를 여유 있게 |
| 키 분실 | 백업 안 함 | 해당 lot 전부 OTA 동결 |
| 부팅 직후 무한 reset | partition table 서명 누락 | CONFIG_SECURE_BOOT_BUILD_SIGNED |

가장 비싼 실수는 *키 분실*입니다. *서명 키는 hardware security module(HSM) 또는 air-gapped 시스템*에 보관하는 것이 표준입니다. 여러 사람이 *서로 다른 사본*을 보관해 single point of failure를 없앱니다.

## 정리

- ESP32-C3의 보안은 *3중 레이어*입니다. Secure Boot V2(ECDSA-256), Flash Encryption(AES-256 XTS), eFuse(OTP 키 저장).
- eFuse는 *0 → 1로만 burn*되는 OTP입니다. 한 번 burn하면 *영원히 1*이고, 신중하지 않으면 *영구 brick*입니다.
- Secure Boot V2는 *bootloader → partition table → app 3단계 체인*을 ECDSA-256으로 검증합니다.
- Flash Encryption은 *AES-XTS*로 플래시 자체를 암호화합니다. tweak가 주소라 같은 평문도 위치마다 암호문이 다릅니다.
- Flash Encryption은 *Development*(재플래시 가능)와 *Release*(JTAG·UART 영구 차단) 두 모드입니다. 한 번 Release로 가면 *되돌릴 수 없습니다*.
- Anti-rollback은 *secure_version 카운터*로 옛 펌웨어 재설치를 차단합니다. C3는 *최대 32 단계*까지 가능합니다.
- HMAC peripheral과 DS peripheral은 *키를 외부에 노출하지 않고* 인증·서명에 쓰입니다. AWS IoT mTLS 같은 시나리오의 핵심입니다.
- *Development → Release 워크플로*를 미리 손에 익혀야 *영구 brick*을 피합니다. 키 백업은 *복수 사본*이 표준입니다.

## 다음 편

[Ch 12: 전력 관리 — Modem/Light/Deep Sleep와 Wake 소스](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)는 이 시리즈의 마지막 장입니다. 보안된 펌웨어를 *배터리로 1년 이상 굴리는* 전력 모델, deep sleep과 RTC 도메인, wake 소스를 정리합니다.

## 관련 항목

- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build) — 서명되는 binary들의 출처
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)
- [Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model) — Secure Boot 일반 원리
- [원문 — ESP-IDF Secure Boot V2](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/security/secure-boot-v2.html)
- [원문 — ESP-IDF Flash Encryption](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/security/flash-encryption.html)
- [원문 — espefuse.py reference](https://docs.espressif.com/projects/esptool/en/latest/esp32c3/espefuse/index.html)
