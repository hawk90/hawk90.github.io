---
title: "ESP32-C3 보안 분석 — Secure Boot·Flash Encryption·eFuse"
slug: "embedded/riscv/esp32-c3-mastering/chapter11-security"
date: 2026-05-20T09:11:00
description: "ESP32-C3의 eFuse 블록 구성, RSA-PSS Secure Boot V2 서명, XTS-AES-128 Flash Encryption, anti-rollback, HMAC을 TRM과 ESP-IDF v5.4.2 문서로 정리하고, 서명 빌드와 QEMU의 flash encryption 첫 부팅을 직접 돌려 봅니다."
series: "ESP32-C3 Mastering"
seriesOrder: 11
tags: [security, secure-boot, flash-encryption, efuse, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **Secure Boot는 "누가 만든 펌웨어인가"를, Flash Encryption은 "flash를 떼어 읽어도 알아볼 수 있는가"를 지킵니다.** 둘 다 eFuse에 키와 설정을 굽기 때문에, 한 번 켜면 되돌릴 수 없는 단계가 섞여 있습니다.

비유하면 Secure Boot는 봉인된 편지의 도장 확인이고, Flash Encryption은 편지 내용을 암호로 쓰는 일입니다. 도장이 맞아도 내용은 누구나 읽을 수 있고, 암호로 써도 누가 썼는지는 보장하지 않습니다. 이 장은 [ESP32-C3 TRM v1.4](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf) 4장(eFuse)과 [ESP-IDF v5.4.2 Secure Boot V2](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/security/secure-boot-v2.html)·[Flash Encryption](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/security/flash-encryption.html) 문서를 기준으로 합니다.

실제 칩의 eFuse는 굽지 않았습니다. 실행 결과는 세 곳에서 나왔습니다. 서명은 호스트의 `idf.py build`와 `espsecure.py`, eFuse 비트 해석은 `espefuse.py --virt`(가상 eFuse 파일), flash encryption과 HMAC은 Espressif QEMU(`esp_develop_9.0.0_20240606`)의 가상 eFuse입니다. QEMU의 eFuse는 `build/qemu_efuse.bin` 파일이라, 실제 칩과 달리 지우고 다시 시험할 수 있습니다.

## eFuse — 일회성 비트의 보관소

eFuse는 0에서 1로만 바꿀 수 있는 OTP 비트입니다. 볼펜으로 칸을 칠하는 시험지처럼, 한 번 칠한 칸은 지울 수 없습니다. TRM v1.4 4.3절은 C3의 eFuse를 "11 blocks (BLOCK0 ~ BLOCK10)"으로 나누고, Table 4.3-3에 BLOCK1~10의 용도를 적습니다.

| 블록 | TRM 파라미터 이름 | 크기 | 용도 (Table 4.3-3) |
|------|------|------|------|
| BLOCK0 | (설정 비트 모음) | — | 보안·boot 설정 (Table 4.3-1) |
| BLOCK1 | `EFUSE_MAC` 등 | — | MAC 주소, SPI pad 설정, system data |
| BLOCK2 | `EFUSE_SYS_DATA_PART1` | 256 bit | System data |
| BLOCK3 | `EFUSE_USR_DATA` | 256 bit | User data |
| BLOCK4~9 | `EFUSE_KEY0_DATA`~`EFUSE_KEY5_DATA` | 256 bit씩 | KEY0~KEY5 또는 user data |
| BLOCK10 | `EFUSE_SYS_DATA_PART2` | 256 bit | System data |

같은 절에 따르면 BLOCK1~BLOCK10은 RS(44, 32) 부호로 최대 6 byte까지 오류를 자동 정정하고, 읽기 보호는 BLOCK4~BLOCK10에만 걸 수 있습니다. key block 여섯 개에는 각각 용도(`KEY_PURPOSE_n`)를 따로 지정합니다.

`espefuse.py --chip esp32c3 --virt summary`로 가상 칩의 출고 상태를 보면 보안 관련 항목은 모두 0입니다.

```text
DIS_DOWNLOAD_MANUAL_ENCRYPT (BLOCK0)               Set this bit to disable flash encryption when in d = False R/W (0b0)
...
SPI_BOOT_CRYPT_CNT (BLOCK0)                        Enables flash encryption when 1 or 3 bits are set  = Disable R/W (0b000)
...
SECURE_BOOT_KEY_REVOKE0 (BLOCK0)                   Revoke 1st secure boot key                         = False R/W (0b0)
...
KEY_PURPOSE_0 (BLOCK0)                             Purpose of Key0                                    = USER R/W (0x0)
...
SECURE_BOOT_EN (BLOCK0)                            Set this bit to enable secure boot                 = False R/W (0b0)
...
SECURE_VERSION (BLOCK0)                            Secure version (used by ESP-IDF anti-rollback feat = 0 R/W (0x0000)
```

실제 제품의 상태를 기록할 때는 같은 명령을 `--virt` 없이 보드에 실행한 결과를, 사용한 espefuse 버전(여기서는 v4.14.0)과 함께 남깁니다.

## Secure Boot V2 — RSA-PSS image 검증

Secure Boot는 서명이 맞지 않는 펌웨어를 부팅 단계에서 거부합니다. Secure Boot V2 문서는 C3 항목에 "available for ESP32-C3 from chip revision v0.3 (ECO3) onwards"라고 적고, C3의 서명 방식(`IDF_TARGET_SBV2_SCHEME`)을 RSA-PSS로 정합니다. `soc_caps.h`도 `SOC_SECURE_BOOT_V2_RSA 1`, `SOC_EFUSE_SECURE_BOOT_KEY_DIGESTS 3`을 선언합니다.

문서의 boot 절차를 보면 검증은 두 단계로 이뤄집니다. ROM이 2nd-stage bootloader의 signature block과 image를 검증하고, bootloader가 application image를 검증합니다. 어느 단계든 실패하면 boot가 멈춥니다. 다만 application 단계에서 실패하면 bootloader가 다른 OTA 슬롯의 image를 검증해 봅니다. 문서 표현으로는 "If the verification fails but another application image is found, the bootloader will then try to verify that other image"입니다.

signature block의 형식도 문서에 있습니다. block은 4 KB 경계에서 시작해 flash sector 하나를 차지하고, image의 SHA-256 hash, RSA-3072 공개키, RSA-PSS 서명(SHA256, MGF1, salt 32 byte)을 담아 1216 byte까지 0으로 채웁니다. 공개키는 최대 세 개까지 칩에 등록할 수 있고, eFuse에는 키 자체가 아니라 공개키의 digest가 저장됩니다.

### 서명 빌드를 직접 돌려 보기

RSA-3072 서명 키를 만들고 Secure Boot V2를 켜서 Ch 1의 hello 예제를 빌드했습니다. Secure Boot를 켜면 bootloader가 커지므로 partition table offset을 0xC000으로 옮겼습니다.

```bash
espsecure.py generate_signing_key --version 2 --scheme rsa3072 secure_boot_signing_key.pem
```

```ini
CONFIG_SECURE_BOOT=y
CONFIG_SECURE_BOOT_V2_ENABLED=y
CONFIG_SECURE_BOOT_SIGNING_KEY="secure_boot_signing_key.pem"
CONFIG_PARTITION_TABLE_OFFSET=0xC000
```

빌드 출력에서 서명 관련 줄만 모았습니다.

```text
...
Secure boot enabled, so bootloader not flashed automatically.
...
Bootloader binary size 0x9050 bytes. 0x2fb0 bytes (25%) free.
...
Padding data contents by 4016 bytes so signature sector aligns at sector boundary
1 signing key(s) found.
Signed 40960 bytes of data from .../build/bootloader/bootloader-unsigned.bin. Signature sector now has 1 signature blocks.
...
Bootloader binary size 0xb000 bytes. 0x1000 bytes (8%) free.
...
Signed 196608 bytes of data from .../build/c3_hello-unsigned.bin. Signature sector now has 1 signature blocks.
...
c3_hello.bin binary size 0x31000 bytes. Smallest app partition is 0x100000 bytes. 0xcf000 bytes (81%) free.
```

bootloader는 36944 byte(0x9050)를 4016 byte 채워 40960 byte로 맞춘 뒤 4096 byte signature sector를 붙여 45056 byte(0xb000)가 됐습니다. app도 196608 byte에서 200704 byte(0x31000)로 4096 byte 늘었습니다. `Secure boot enabled, so bootloader not flashed automatically.`는 `idf.py flash`가 bootloader를 쓰지 않는다는 뜻이라, bootloader는 문서의 절차대로 따로 기록해야 합니다.

`espsecure.py`로 서명을 검증하고 공개키 digest를 뽑았습니다.

```text
Signature block 0 is valid (RSA).
Signature block 0 verification successful using the supplied key (RSA).
Signature block 1 invalid. Skipping.
Signature block 2 invalid. Skipping.
...
Public key digest for block 0: 6a 72 3b f1 ac 4a 92 bd 83 be b2 da c6 32 64 07 30 3e ad 93 25 ce bf 98 6c 91 0d 2d 87 5d 6f 7b
```

signature sector에는 block 세 개 자리가 있고 지금은 0번만 채워졌습니다. 이 32 byte digest가 eFuse key block에 구워지는 값입니다. 서명 키를 잃으면 이 digest에 맞는 새 image를 만들 수 없으므로, 등록하지 않은 예비 키를 함께 준비해 두고 `SECURE_BOOT_KEY_REVOKE0~2`로 폐기하는 절차를 미리 정해 둡니다.

## Flash Encryption — XTS-AES-128

flash 칩을 떼어 내 읽으면 펌웨어가 그대로 보입니다. Flash Encryption은 flash에 암호문을 쓰고, CPU가 cache로 읽을 때는 소프트웨어가 따로 손대지 않아도 하드웨어가 복호화합니다. v5.4.2 C3 `soc_caps.h`는 `SOC_FLASH_ENCRYPTION_XTS_AES_128 1`을 선언하고, 문서의 C3 절은 bootloader가 RNG로 "256 bit key"를 만들어 `BLOCK_KEYN`에 쓴다고 설명합니다. XTS-AES-128은 128-bit key 두 개, 합쳐 256 bit를 씁니다.

### QEMU에서 본 첫 부팅

`CONFIG_SECURE_FLASH_ENC_ENABLED=y`(기본 Development mode)로 hello 예제를 빌드하고, 빈 eFuse의 QEMU에서 처음 부팅한 로그입니다.

```text
I (51) boot: Loaded app from partition at offset 0x20000
I (52) boot: Checking flash encryption...
I (56) efuse: Batch mode of writing fields is enabled
I (57) flash_encrypt: Generating new flash encryption key...
I (58) efuse: Writing EFUSE_BLK_KEY0 with purpose 4
W (59) flash_encrypt: Not disabling UART bootloader encryption
I (60) flash_encrypt: Disable UART bootloader cache...
I (60) flash_encrypt: Disable JTAG...
...
I (186) flash_encrypt: bootloader encrypted successfully
I (196) flash_encrypt: partition table encrypted and loaded successfully
...
I (232) flash_encrypt: Encrypting partition 2 at offset 0x20000 (length 0x2d8f0)...
I (675) flash_encrypt: Done encrypting
...
I (708) flash_encrypt: Flash encryption completed
I (709) boot: Resetting with flash encryption enabled...
```

문서의 C3 절차와 순서가 같습니다. bootloader가 key를 만들어 KEY0에 쓰고(purpose 4는 XTS_AES_128_KEY), bootloader·partition table·app을 제자리에서 암호화한 뒤 `SPI_BOOT_CRYPT_CNT`의 첫 비트를 세우고 재시작합니다. Development mode라 문서 6단계대로 UART bootloader 암호화는 막지 않고(`Not disabling UART bootloader encryption`) JTAG과 download cache는 끕니다. 재시작 뒤 bootloader는 `flash encryption is enabled (1 plaintext flashes left)`를 찍고, app은 `Flash encryption mode is DEVELOPMENT (not secure)` 경고를 냅니다.

QEMU의 flash 이미지를 직접 덤프하면 평문이 사라진 것이 보입니다.

```text
plaintext app (c3_hello.bin) first 16 bytes:
00000000: e906 021f ea02 3840 ee00 0000 0500 0303  ......8@........
qemu_flash.bin @0x20000 after first boot:
00020000: 863b 0776 9a1e 8d73 8142 488d 96e9 2516  .;.v...s.BH...%.
```

평문 app image는 magic byte 0xE9로 시작하지만, 같은 위치의 flash 내용은 알아볼 수 없는 값이 됐습니다. 호스트에서 미리 암호화하는 `espsecure.py encrypt_flash_data`는 `--address`("Address offset in flash where file will be flashed")를 필수 인자로 받습니다. 암호문이 기록될 flash 주소에 묶여 있으므로, 한 offset용으로 만든 암호문을 다른 offset에 쓰면 올바르게 복호화되지 않습니다.

### 같이 켜지는 NVS 암호화

이 QEMU 실행은 재시작 뒤 app 초기화에서 멈췄습니다.

```text
I (854) nvs_sec_provider: NVS Encryption - Registering Flash encryption-based scheme...
E (856) nvs_sec_provider: partition with subtype "nvs_keys" not found
E (857) cpu_start: init function 0x42009ea8 has failed (0xffffffff), aborting
```

v5.4.2 `nvs_flash/Kconfig`의 `CONFIG_NVS_ENCRYPTION`이 "default y if SECURE_FLASH_ENC_ENABLED"이기 때문입니다. 생성된 `sdkconfig`에도 `CONFIG_NVS_ENCRYPTION=y`와 `CONFIG_NVS_SEC_KEY_PROTECT_USING_FLASH_ENC=y`가 들어갔고, 이 방식은 NVS key를 `nvs_keys` subtype partition에 둬야 하는데 기본 single-app partition table에는 그 partition이 없습니다. flash encryption을 켤 때는 partition table에 `nvs_keys` partition을 추가하거나, NVS 암호화 방식을 HMAC 기반으로 바꿀지 함께 정해야 합니다.

### SPI_BOOT_CRYPT_CNT는 set-bit 개수

TRM v1.4의 `EFUSE_SPI_BOOT_CRYPT_CNT` 설명은 "Odd count of bits with a value of 1: Enabled. Even count of bits with a value of 1: Disabled"입니다. 숫자가 홀수인지가 아니라 1인 비트의 개수가 홀수인지를 봅니다. 가상 eFuse 파일에 1, 3, 7을 차례로 굽고 summary를 읽은 결과입니다.

```text
== burn SPI_BOOT_CRYPT_CNT -> 1
...
SPI_BOOT_CRYPT_CNT (BLOCK0)                        Enables flash encryption when 1 or 3 bits are set  = Enable R/W (0b001)
...
== burn SPI_BOOT_CRYPT_CNT -> 3
...
SPI_BOOT_CRYPT_CNT (BLOCK0)                        Enables flash encryption when 1 or 3 bits are set  = Disable R/W (0b011)
...
== burn SPI_BOOT_CRYPT_CNT -> 7
...
SPI_BOOT_CRYPT_CNT (BLOCK0)                        Enables flash encryption when 1 or 3 bits are set  = Enable R/W (0b111)
...
```

3비트 카운터라 켜기·끄기·켜기 세 번이면 끝입니다. 위 QEMU 로그의 `1 plaintext flashes left`도 0b001에서 비트 하나를 더 세워 끄고 평문을 다시 쓸 수 있는 기회가 한 번 남았다는 뜻입니다.

아래 helper는 이 규칙을 그대로 코드로 옮겼습니다. eFuse를 읽거나 쓰지 않고 입력 숫자만 해석합니다.

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

QEMU에서 0~7을 넣어 본 결과입니다.

```text
crypt_cnt=0 -> enabled=0 (secure_version from 0x0007 = 3)
crypt_cnt=1 -> enabled=1 (secure_version from 0x0007 = 3)
crypt_cnt=2 -> enabled=1 (secure_version from 0x0007 = 3)
crypt_cnt=3 -> enabled=0 (secure_version from 0x0007 = 3)
crypt_cnt=4 -> enabled=1 (secure_version from 0x0007 = 3)
crypt_cnt=5 -> enabled=0 (secure_version from 0x0007 = 3)
crypt_cnt=6 -> enabled=0 (secure_version from 0x0007 = 3)
crypt_cnt=7 -> enabled=1 (secure_version from 0x0007 = 3)
```

### Development와 Release

문서의 C3 절차에서 두 모드의 차이는 6~7단계입니다. Development mode는 UART bootloader로 암호화된 image를 다시 쓸 수 있고 `SPI_BOOT_CRYPT_CNT`를 write-protect하지 않으며, 기본으로 `DIS_DOWNLOAD_ICACHE`, `DIS_PAD_JTAG`, `DIS_USB_JTAG`, `DIS_LEGACY_SPI_BOOT`를 세웁니다. Release mode는 여기에 `DIS_DOWNLOAD_MANUAL_ENCRYPT`를 더하고 `SPI_BOOT_CRYPT_CNT`를 write-protect합니다. 문서는 Release mode에서 "New plaintext images can ONLY be downloaded using the over-the-air (OTA) scheme"이라고 적습니다. 그래서 Release로 굽기 전에 OTA 경로가 실제로 동작하는지 먼저 시험해야 합니다.

## Anti-rollback — 구버전 펌웨어 방지

옛 펌웨어도 서명은 여전히 유효하므로, Secure Boot만으로는 알려진 취약점이 있는 구버전 설치를 막지 못합니다. anti-rollback은 app header의 `secure_version`을 eFuse의 최소 허용 값과 비교해 그보다 낮은 image를 거부합니다.

C3의 v5.4.2 `esp_efuse_table.csv`는 `SECURE_VERSION`을 BLOCK0의 16 bit 필드로 정의합니다. `CONFIG_BOOTLOADER_APP_SEC_VER_SIZE_EFUSE_FIELD`는 ESP32(1~32)와 C2(1~4)가 아닌 target에서 범위 1~16, 기본 16입니다. eFuse는 지울 수 없으므로 version은 2진수가 아니라 1인 비트의 개수로 셉니다. 위 helper에서 `0x0007`(비트 3개)이 version 3이 된 것이 그 예이고, 16 bit 필드로는 version 0~16까지 17단계를 쓸 수 있습니다. 제품 수명 동안 보안 업데이트가 16번을 넘을 수 있다면 이 한도가 설계 제약이 됩니다.

## HMAC와 Digital Signature peripheral

HMAC peripheral은 eFuse key block에 있는 비밀 key로 HMAC-SHA256을 계산하고, key 자체는 소프트웨어가 읽지 못하게 합니다. v5.4.2 `esp_hmac.h`에 따르면 `esp_hmac_calculate()`는 HMAC peripheral을 upstream mode로 씁니다("Uses the HMAC peripheral in "upstream" mode"). 따라서 key block의 purpose가 "HMAC upstream purpose value"여야 하고, 출력 buffer는 32 byte입니다. downstream purpose의 key는 Digital Signature peripheral 같은 하드웨어 내부 경로 전용이라 이 API에는 넘기지 않습니다.

다음 wrapper는 이미 구워 둔 key를 지정해 HMAC을 계산합니다.

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

QEMU의 가상 eFuse에 0x00~0x1F 32 byte를 `HMAC_UP` 용도로 구운 뒤(`idf.py qemu efuse-burn-key BLOCK_KEY0 hmac_key.bin HMAC_UP`) `"hello c3"`의 HMAC을 계산하고, 같은 key로 호스트 Python `hmac` 모듈이 낸 값과 비교했습니다.

```text
KEY0 purpose=8 (HMAC_UP=8)
c3_hmac -> ESP_OK: 13c290e5d64c743569f03cc356e0838e8661160c5e8d1efaa05055b49282dc4c
c3_hmac(HMAC_KEY_MAX) -> ESP_ERR_INVALID_ARG
host HMAC-SHA256: 13c290e5d64c743569f03cc356e0838e8661160c5e8d1efaa05055b49282dc4c
```

두 값이 같습니다. QEMU의 HMAC 모델에서 얻은 결과라 실제 칩의 동작까지 증명하지는 않습니다. 다만 key purpose 지정과 API 호출 순서가 맞다는 것은 보여 줍니다. 실제 장치에서는 key를 장치마다 다르게 만들고, 구운 뒤 그 block을 읽기 보호합니다.

Digital Signature(DS) peripheral은 암호화된 RSA private key 자료를 받아 하드웨어 안에서 서명만 하는 장치입니다. v5.4.2 DS 문서에 따르면 private key 자료는 AES로 암호화해 flash에 두고, 그 AES key는 eFuse key block을 입력으로 HMAC이 하드웨어 안에서 유도합니다. 그래서 문서 표현대로 "neither the decryption key for the RSA parameters nor the input key for the HMAC key derivation function can be seen by the software"입니다.

## Development → Release 전환 전에 남길 기록

eFuse를 굽는 순간 되돌릴 수 없으므로, 전환 전에 같은 기기·build·key를 가리키는 기록을 모아 둡니다.

| 영역 | 남길 기록 |
|---|---|
| 대상 | part number와 chip revision(Secure Boot V2는 v0.3 이상), 전환 전 `espefuse.py summary` |
| Image | ESP-IDF 버전, `sdkconfig`, toolchain, 서명된 bootloader·app의 hash |
| Key | 서명 키 보관 위치와 예비 키, 공개키 digest, revoke 계획 |
| Encryption | key를 장치에서 생성하는지 호스트에서 주입하는지, `nvs_keys` partition 유무 |
| Update | OTA로 새 image를 받고, 서명 안 된·손상된·구버전 image를 거부하는 시험 결과 |
| Recovery | 전원 차단, 부분 provisioning, self-test 실패 때의 동작 |

## 정리

- C3 eFuse는 BLOCK0~BLOCK10의 11개 블록이고, key block 6개(BLOCK4~9)는 256 bit씩이며 읽기 보호를 걸 수 있습니다.
- Secure Boot V2는 C3 v0.3 이상에서 RSA-3072 RSA-PSS이고, 공개키 digest를 최대 3개 등록합니다.
- 서명 빌드는 bootloader와 app 끝에 4 KB signature sector를 붙였고, `espsecure.py`가 서명과 digest를 확인했습니다.
- Flash Encryption은 XTS-AES-128이고, QEMU 첫 부팅에서 bootloader가 key 생성, 제자리 암호화, CRYPT_CNT 설정, 재시작을 차례로 했습니다.
- flash encryption을 켜면 NVS 암호화가 기본으로 함께 켜져 `nvs_keys` partition이 필요합니다.
- `SPI_BOOT_CRYPT_CNT`와 `SECURE_VERSION`은 1인 비트 개수로 해석합니다. SECURE_VERSION은 16 bit라 version 16까지입니다.
- HMAC은 upstream purpose key로만 `esp_hmac_calculate()`를 쓸 수 있고, QEMU 결과가 호스트 HMAC과 일치했습니다.

## 다음 편

[Ch 12: 전력 관리 — Modem/Light/Deep Sleep와 Wake 소스](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)는 이 시리즈의 마지막 장입니다. 데이터시트의 전류 표로 전력 예산을 세우고, deep sleep과 RTC 도메인, wake 소스를 정리합니다.

## 관련 항목

- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build) — 서명되는 binary들의 출처
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)
- [Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model) — Secure Boot 일반 원리
- [원문 — ESP-IDF Secure Boot V2](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/security/secure-boot-v2.html)
- [원문 — ESP-IDF Flash Encryption](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/security/flash-encryption.html)
- [원문 — espefuse.py reference](https://docs.espressif.com/projects/esptool/en/release-v4/esp32c3/espefuse/index.html)
