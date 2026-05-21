---
title: "Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS"
date: 2026-05-01T03:00:00
description: "ESP32-C3 메모리 구조 — 400KB SRAM, 4MB SPI flash, MMU. 파일시스템 선택."
series: "ESP32-C3 Mastering"
seriesOrder: 3
tags: [memory, flash, mmu, spiffs, littlefs, esp32-c3]
draft: false
---

## 한 줄 요약

> **"C3는 *400 KB SRAM*을 IRAM/DRAM/RTC로 나누어 쓰고, *4 MB 플래시*를 파티션 테이블로 영역화합니다."** 파일시스템은 *SPIFFS는 레거시, LittleFS가 ESP-IDF 5.x 권장*입니다. OTA는 *A/B 파티션 + otadata*로 구현됩니다.

ESP32-C3에서 메모리 관련 실수는 *거의 모든 신규 프로젝트가 겪는* 통과의례입니다. "Heap 부족", "IRAM overflow", "OTA가 절반에서 멈춤", "전원 끊으니 NVS가 깨졌다" 같은 증상은 모두 *메모리 모델을 모르고 짠 코드*에서 나옵니다.

이 장은 *어디에 무엇이 살고*, *왜 영역이 나뉘어 있고*, *언제 어떤 파일시스템을 고르는지*를 정리합니다. 마지막에 OTA의 A/B 메커니즘과 NVS의 wear-leveling을 다룹니다.

## 메모리 영역 — 한눈에

```text
주소 공간                    영역              크기      특징
0x3FC8_0000~0x3FCE_0000     SRAM (DRAM)       384 KB   데이터 (read/write)
0x4037_0000~0x4038_0000     SRAM (IRAM)       (overlay) 코드 + ISR
0x5000_0000~0x5000_2000     RTC SRAM           8 KB     deep-sleep 유지
0x4200_0000~0x4280_0000     External flash    4 MB     MMU mapped (XIP)
0x3C00_0000~0x3C80_0000     External flash    4 MB     MMU mapped (data)
0x4000_0000~0x4006_0000     ROM (boot)         384 KB   immutable
```

SRAM은 *물리적으로 한 덩어리*지만 *bus mapping*에 따라 IRAM과 DRAM 두 가지 *view*로 보입니다. 같은 워드를 IRAM 주소로 *읽으면 명령어*가 되고 DRAM 주소로 *읽으면 데이터*가 됩니다.

### IRAM vs DRAM — 왜 나누는가

코어의 *명령어 fetch bus*와 *데이터 access bus*가 *서로 다른 주소 영역*에서 출발하기 때문입니다. 명령어를 *IRAM 주소*에 두면 fetch가 빠르고, 데이터를 *DRAM 주소*에 두면 load/store가 빠릅니다. 같은 SRAM이라도 *어떤 view로 접근하느냐*에 따라 *성능과 정렬 제약*이 달라집니다.

| 영역 | 코드 | 데이터 | 정렬 |
|------|------|--------|------|
| IRAM | OK (실행) | 32-bit aligned read/write만 | 4-byte alignment 필수 |
| DRAM | 불가 (fetch fault) | byte/word 모두 OK | byte alignment 가능 |

ISR을 `IRAM_ATTR`로 표시하는 이유가 *여기*에 있습니다. flash cache miss 중에도 *IRAM에 있는 ISR은 항상 실행 가능*합니다.

```c
#include "esp_attr.h"

void IRAM_ATTR my_critical_isr(void *arg) {
    // 이 함수는 IRAM에 배치됨 → flash cache miss 영향 없음
    *(volatile uint32_t *)0x3FF44004 = 0x1;
}
```

### RTC SRAM — sleep 너머의 8 KB

deep-sleep 진입 시 일반 SRAM은 *전원이 끊깁니다*. RTC SRAM 8 KB만 *유지*됩니다.

```c
#include "esp_attr.h"

RTC_DATA_ATTR static int boot_count = 0;

void app_main(void) {
    boot_count++;
    printf("Boot count: %d\n", boot_count);
    // deep-sleep 후에도 boot_count 유지
}
```

`RTC_DATA_ATTR`로 표시한 변수는 *RTC SRAM*에 배치되어 *deep-sleep 사이클을 넘어* 유지됩니다. 8 KB 한도 안에서 신중히 사용합니다.

## Heap — capabilities-based allocator

ESP-IDF의 heap은 *capabilities로 분류*됩니다. 그냥 `malloc()`은 *기본 capability*로 할당하지만, 특수 영역이 필요할 때는 `heap_caps_malloc()`을 씁니다.

```c
#include "esp_heap_caps.h"

// 일반 DRAM heap (대부분의 경우)
uint8_t *buf = malloc(1024);

// DMA 가능한 영역 (페리퍼럴이 직접 접근)
uint8_t *dma_buf = heap_caps_malloc(1024, MALLOC_CAP_DMA);

// 32-bit aligned access만 가능한 IRAM heap
uint32_t *iram_buf = heap_caps_malloc(1024, MALLOC_CAP_32BIT | MALLOC_CAP_EXEC);

// 8 KB RTC SRAM heap (deep-sleep 유지)
uint8_t *rtc_buf = heap_caps_malloc(64, MALLOC_CAP_RTCRAM);
```

힙 상태를 *런타임에 확인*하는 명령도 유용합니다.

```c
printf("Free DRAM: %zu\n", heap_caps_get_free_size(MALLOC_CAP_8BIT));
printf("Free IRAM: %zu\n", heap_caps_get_free_size(MALLOC_CAP_32BIT));
printf("Largest block: %zu\n", heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
```

`heap_caps_get_largest_free_block`은 *fragmentation 진단*에 필수입니다. free 총량은 충분한데 *큰 연속 블록이 없을* 때 `malloc(8192)`가 실패합니다.

## 파티션 테이블

플래시 4 MB는 *파티션 테이블*로 영역이 정해집니다. CSV 파일로 작성하고 `idf.py menuconfig`에서 *Custom partition table*을 선택해 사용합니다.

### 기본 OTA 파티션 테이블

```text
# Name,   Type, SubType, Offset,   Size,    Flags
nvs,      data, nvs,     0x9000,   0x6000,
otadata,  data, ota,     0xf000,   0x2000,
phy_init, data, phy,     0x11000,  0x1000,
factory,  app,  factory, 0x20000,  0x100000,
ota_0,    app,  ota_0,   0x120000, 0x180000,
ota_1,    app,  ota_1,   0x2A0000, 0x180000,
spiffs,   data, spiffs,  0x420000, 0x1E0000,
```

각 행의 의미입니다.

| 파티션 | 역할 | 크기 |
|--------|------|------|
| `nvs` | 키-값 저장 (Wi-Fi 인증, 캘리브레이션) | 24 KB |
| `otadata` | 현재 boot 파티션 인디케이터 | 8 KB |
| `phy_init` | RF calibration 초기값 | 4 KB |
| `factory` | 공장 firmware (OTA 실패 시 복귀용) | 1 MB |
| `ota_0` | OTA slot A | 1.5 MB |
| `ota_1` | OTA slot B | 1.5 MB |
| `spiffs` | 파일시스템 | 1.9 MB |

총합이 *flash 크기*를 넘으면 안 됩니다. 위 예는 *약 4 MB*에 맞춰져 있습니다.

### menuconfig로 적용

```bash
$ idf.py menuconfig
# Partition Table → Custom partition table CSV
# Custom partition CSV file → partitions.csv
$ idf.py build
```

빌드 후 *플래시*는 다음과 같이 진행됩니다.

```bash
$ idf.py partition-table       # 현재 파티션 테이블 보기
$ idf.py flash                 # 부트로더 + 파티션 + 앱 전체 플래시
$ idf.py app-flash             # 앱만 다시 플래시 (개발 중 빠른 cycle)
```

## NVS — 키/값 저장소

NVS(Non-Volatile Storage)는 *작은 설정 값*을 저장하는 용도입니다. WiFi SSID/비밀번호, RF 캘리브레이션, 시리얼 번호 등이 대표적입니다. 내부적으로 *wear-leveling + CRC*를 합니다.

```c
#include "nvs_flash.h"
#include "nvs.h"

void save_config(void) {
    nvs_handle_t handle;
    ESP_ERROR_CHECK(nvs_open("storage", NVS_READWRITE, &handle));

    ESP_ERROR_CHECK(nvs_set_str(handle, "ssid", "MyRouter"));
    ESP_ERROR_CHECK(nvs_set_i32(handle, "boot_count", 42));
    ESP_ERROR_CHECK(nvs_commit(handle));

    nvs_close(handle);
}

void load_config(void) {
    nvs_handle_t handle;
    if (nvs_open("storage", NVS_READONLY, &handle) != ESP_OK) {
        return;
    }

    char ssid[33] = {0};
    size_t len = sizeof(ssid);
    nvs_get_str(handle, "ssid", ssid, &len);

    int32_t boot_count = 0;
    nvs_get_i32(handle, "boot_count", &boot_count);

    nvs_close(handle);
}
```

NVS의 한계입니다.

- *key 최대 15 chars*
- *value 최대 4000 bytes*
- *전체 파티션 크기 안에서 한정*
- *binary blob도 지원 (`nvs_set_blob`)*

대용량 데이터는 NVS가 아니라 *파일시스템*으로 가야 합니다.

## SPIFFS vs LittleFS

ESP-IDF는 두 가지 임베디드 파일시스템을 지원합니다.

| 항목 | SPIFFS | LittleFS |
|------|--------|----------|
| 출시 | 2013 | 2017 |
| 라이선스 | MIT | BSD-3 |
| Power-fail safety | 약함 (마운트 깨짐 보고 다수) | 강함 (atomic update) |
| 디렉토리 | 미지원 (가짜 path만) | 지원 (진짜 디렉토리) |
| Wear-leveling | dynamic | dynamic |
| 메모리 사용 | 큼 | 작음 |
| ESP-IDF 5.x 권장 | X | O |

새 프로젝트는 *LittleFS*를 권장합니다. SPIFFS는 *기존 코드 유지*가 필요할 때만 씁니다.

### LittleFS 사용 예

`menuconfig`에서 LittleFS component를 활성화하고 파티션 테이블에 littlefs subtype을 더합니다.

```text
storage,  data, littlefs, 0x420000, 0x1E0000,
```

코드는 다음과 같습니다.

```c
#include "esp_littlefs.h"

esp_vfs_littlefs_conf_t conf = {
    .base_path = "/littlefs",
    .partition_label = "storage",
    .format_if_mount_failed = true,
    .dont_mount = false,
};

void mount_lfs(void) {
    ESP_ERROR_CHECK(esp_vfs_littlefs_register(&conf));

    size_t total = 0, used = 0;
    esp_littlefs_info(conf.partition_label, &total, &used);
    printf("LittleFS: %u / %u bytes used\n", used, total);
}

void write_log(const char *line) {
    FILE *f = fopen("/littlefs/log.txt", "a");
    if (f) {
        fprintf(f, "%s\n", line);
        fclose(f);
    }
}
```

POSIX `fopen`/`fread`/`fwrite`/`fclose`로 *그대로* 동작합니다. ESP-IDF의 *VFS layer*가 path를 분기합니다.

## OTA — A/B 파티션 메커니즘

OTA(Over-The-Air) 업데이트는 *현재 안 쓰는 ota 파티션에 새 이미지를 받고*, *otadata에 부트 인디케이터를 갱신*하는 방식입니다.

### 부트 흐름

| 단계 | 동작 |
|------|------|
| boot | `otadata` 읽기 |
| select | 사용할 app 파티션 결정 |
| → `factory` | 즉시 실행 |
| → `ota_0` 또는 `ota_1` | 이미지 verify → 실행 |

부팅 후 *firmware가 정상 동작 확인*되면 *valid mark*를 합니다. valid가 안 찍힌 채 재부팅되면 *otadata가 자동으로 이전 파티션으로 롤백*합니다.

### OTA 코드 예 (HTTPS download)

```c
#include "esp_https_ota.h"
#include "esp_ota_ops.h"

void do_ota(const char *url) {
    esp_http_client_config_t http_cfg = {
        .url = url,
        .cert_pem = (char *)server_cert_pem_start,
    };
    esp_https_ota_config_t ota_cfg = {
        .http_config = &http_cfg,
    };

    esp_err_t err = esp_https_ota(&ota_cfg);
    if (err == ESP_OK) {
        printf("OTA OK, rebooting\n");
        esp_restart();
    } else {
        printf("OTA failed: %s\n", esp_err_to_name(err));
    }
}
```

`esp_https_ota`는 *내부적으로* 다음을 수행합니다.

1. `esp_ota_get_next_update_partition()`로 빈 슬롯 선택
2. HTTPS GET으로 이미지 다운로드
3. flash에 쓰기 (page 단위)
4. SHA-256 검증
5. `esp_ota_set_boot_partition()`으로 otadata 갱신

### Rollback

새 firmware가 *처음 부트 후 N초 안에 valid mark*를 하지 않으면 자동 롤백입니다.

```c
#include "esp_ota_ops.h"

void app_main(void) {
    // ... 정상 동작 확인 후
    esp_ota_mark_app_valid_cancel_rollback();
}
```

이 호출이 *없으면* 다음 부팅 시 이전 파티션으로 돌아갑니다. *깨진 OTA가 brick이 되지 않게* 막는 safeguard입니다.

## 자주 하는 실수

### "IRAM overflow"

`IRAM_ATTR`을 너무 많이 붙이면 IRAM이 *터집니다*. 정말 *cache miss 중에도 실행되어야* 하는 코드만 IRAM에 둡니다. 일반 hot path는 *flash cache*로 충분합니다.

### "Heap 단편화로 큰 할당이 실패"

총 free는 100 KB인데 `malloc(8192)`가 실패하면 *fragmentation*입니다. `heap_caps_get_largest_free_block`로 확인하고, *큰 버퍼는 *부팅 직후 한 번만 할당*해 두는 패턴이 안전합니다.

### "NVS가 가득 차서 새 키가 안 들어간다"

NVS 파티션이 작으면 *binary blob 몇 개*만 넣어도 차버립니다. *키 삭제 후 commit*해도 *공간이 즉시 회수되지 않습니다*. wear-leveling 사이클 후에 재사용됩니다. 큰 데이터는 *LittleFS*로.

### "OTA 다운로드는 됐는데 부팅이 안 된다"

이미지 검증은 *flash 쓰기 후*에 SHA-256을 다시 읽어 확인합니다. *flash chip이 다르면* 페이지 크기 가정이 깨질 수 있고, *전원이 약하면* 쓰기 중에 비트가 흔들립니다. `idf.py monitor`에서 *부트로더 로그*가 invalid checksum이라고 외칩니다.

### "deep-sleep에서 깨면 변수가 0이다"

`RTC_DATA_ATTR`을 *안 붙인* 변수는 *모두 사라집니다*. 부팅 카운터, 마지막 센서 값, 정전 시점 등은 RTC 영역에 두어야 합니다.

### "SPIFFS가 마운트 자체가 안 된다"

전원 끊김 후 자주 발생합니다. SPIFFS의 *알려진 약점*입니다. `format_if_mount_failed = true`로 *최후의 수단*을 두지만, *데이터를 잃습니다*. LittleFS로 옮기는 것이 근본 해결입니다.

## 정리

- C3의 SRAM은 *400 KB*이며 *IRAM(코드)·DRAM(데이터)·RTC SRAM(8 KB, deep-sleep 유지)*으로 view가 나뉩니다.
- Heap은 *capabilities 기반*으로 `MALLOC_CAP_DMA`·`MALLOC_CAP_32BIT`·`MALLOC_CAP_RTCRAM` 같은 플래그로 영역을 지정합니다.
- 4 MB 플래시는 *파티션 테이블 CSV*로 나뉘며, OTA 사용 시 *nvs/otadata/phy_init/factory/ota_0/ota_1/spiffs* 7개가 표준입니다.
- NVS는 *작은 키/값* 저장용(WiFi 자격 증명, 캘리브레이션), 대용량은 *LittleFS*를 씁니다.
- ESP-IDF 5.x는 *LittleFS를 권장*하며 SPIFFS는 *power-fail 취약성* 때문에 신규 프로젝트에서 회피합니다.
- OTA는 *A/B 파티션 + otadata*로 동작하고, *valid mark 호출*이 없으면 자동 롤백되어 brick을 막습니다.
- IRAM은 *희소 자원*이므로 `IRAM_ATTR`은 *진짜 cache-miss-critical*에만 붙이고 일반 코드는 flash cache에 둡니다.

## 다음 장 예고

다음 편은 **Ch 4: GPIO·LEDC·MCPWM — 디지털 출력의 세 모드**입니다. 22개 GPIO가 *GPIO Matrix를 통해 어떻게 페리퍼럴과 연결되는지*, LEDC와 MCPWM이 *무엇이 다른지* 풀어봅니다.


## 관련 항목

- [Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러](/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core)
- [Ch 4: GPIO·LEDC·MCPWM — 디지털 출력의 세 모드](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 9: RTC·저전력](/blog/embedded/riscv/esp32-c3-mastering/chapter09-rtc-sleep) — RTC SRAM 활용 패턴
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-secure-boot) — flash encryption
- [Modern Embedded Recipes Part 6.3: OTA 전략](/blog/embedded/modern-recipes/part6-03-ota-strategy)
- [Practical RTOS Internals Part 3.2: Heap fragmentation](/blog/embedded/rtos/practical-internals/part3-02-heap)
- [원문 — ESP-IDF Partition Tables](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/partition-tables.html)
- [원문 — LittleFS Design](https://github.com/littlefs-project/littlefs/blob/master/DESIGN.md)
