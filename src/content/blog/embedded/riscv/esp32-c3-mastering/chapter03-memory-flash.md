---
title: "ESP32-C3 메모리 맵과 플래시 — SPIFFS·LittleFS 파일시스템 선택"
slug: "embedded/riscv/esp32-c3-mastering/chapter03-memory-flash"
date: 2026-05-20T09:03:00
description: "ESP-IDF v5.4.2의 메모리 alias·heap 조건과 4MB 파티션을 확인하고 NVS·파일시스템·OTA 오류 경로를 구분합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 3
tags: [memory, flash, mmu, spiffs, littlefs, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **주소 창 크기·실제 물리 메모리·링커가 남긴 heap은 서로 다릅니다.** 파티션은 장착 flash의 끝을 넘을 수 없고, OTA rollback은 설정과 image 상태에 달려 있습니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`입니다. 메모리 경계는 이 revision의 `soc.h`, heap 등록은 `memory_layout.c`, 파티션은 실제 `gen_esp32part.py`로 대조합니다. 이 장은 target flash나 전원 차단을 실행한 결과가 아닙니다.

## 메모리 영역 — 한눈에

| 주소 공간 | 영역 | 크기 | 특징 |
|-----------|------|------|------|
| `0x3FC8_0000`~`0x3FCE_0000` | SRAM (DRAM) | 384 KB | 데이터 (read/write) |
| `0x4037_C000`~`0x403E_0000` | SRAM instruction alias | 주소 창 400 KiB | data alias·예약 영역과 함께 확인 |
| `0x5000_0000`~`0x5000_2000` | RTC SRAM | 8 KB | deep-sleep 유지 |
| `0x4200_0000`~`0x4280_0000` | External flash | 주소 창 8 MiB | MMU mapped (XIP) |
| `0x3C00_0000`~`0x3C80_0000` | External flash | 주소 창 8 MiB | MMU mapped (data) |
| `0x4000_0000`~`0x4006_0000` | ROM (boot) | 384 KB | immutable |

표의 경계는 상한을 제외한 범위입니다. 주소 창을 더해 총 SRAM으로 계산하지 않습니다. IRAM/DRAM alias와 cache·linker 예약을 확인하며 RTC 메모리는 별도 영역입니다. Flash의8 MiB mapping 창은4 MiB 부품을8 MiB로 늘려 주지 않습니다. [기준 soc.h](https://github.com/espressif/esp-idf/blob/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0/components/soc/esp32c3/include/soc/soc.h)와 linker map을 함께 봅니다.

### IRAM vs DRAM — 왜 나누는가

코어의 *명령어 fetch bus*와 *데이터 access bus*가 *서로 다른 주소 영역*에서 출발하기 때문입니다. 명령어를 *IRAM 주소*에 두면 fetch가 빠르고, 데이터를 *DRAM 주소*에 두면 load/store가 빠릅니다. 같은 SRAM이라도 *어떤 view로 접근하느냐*에 따라 *성능과 정렬 제약*이 달라집니다.

C3의 data-byte 접근 범위와 실행 가능한 영역은 alias·heap capability에 따라 확인합니다. Xtensa의 "IRAM은32-bit access만"이라는 제약을 C3 전체에 복사하지 않습니다. 필요한 버퍼는 `MALLOC_CAP_8BIT`처럼 실제 접근 조건을 지정합니다.

`IRAM_ATTR`은 함수 배치 요청입니다. ISR이 cache-disabled 상태에서도 안전하려면 호출 code와 data까지 내부 메모리에 있어야 합니다. 이전 예의 ESP32 주소 `0x3FF44004`에 직접 쓰는 코드는 C3 GPIO 동작 예에서 제거했습니다. GPIO driver와 해당 target register를 사용합니다.

### RTC SRAM — sleep 너머의 8 KB

일반 SRAM의 값은 Deep-sleep을 건너 유지할 수 있다고 가정하지 않습니다. RTC 데이터도 power-domain 설정·reset 원인·초기화 조건을 확인합니다. 다음은 선언 예이며 실제 유지 여부는 sleep/wake 실험으로 확인합니다.

```c
#include <stdio.h>
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

```c title="c3-heap.c"
#include <stdint.h>
#include <stdlib.h>
#include "esp_heap_caps.h"

int use_dma_buffer(void) {
    uint8_t *buffer = heap_caps_malloc(1024, MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!buffer) return -1;
    /* Initialize/use only within the chosen peripheral driver's alignment contract. */
    heap_caps_free(buffer);
    return 0;
}
```

`MALLOC_CAP_EXEC`, `MALLOC_CAP_32BIT`, `MALLOC_CAP_RTCRAM`은 사용 목적·설정과 함께 확인합니다. `memory_layout.c`는 `CONFIG_ESP_SYSTEM_ALLOW_RTC_FAST_MEM_AS_HEAP`에 따라 RTC heap을 등록합니다. RTC heap pointer와 allocator 상태를 Deep-sleep 뒤 그대로 재사용하는 영속 저장 예로 읽으면 안 됩니다.

힙 상태를 *런타임에 확인*하는 명령도 유용합니다.

```c
printf("Free DRAM: %zu\n", heap_caps_get_free_size(MALLOC_CAP_8BIT));
printf("32-bit-capable free: %zu\n", heap_caps_get_free_size(MALLOC_CAP_32BIT));
printf("Largest block: %zu\n", heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
```

`heap_caps_get_largest_free_block`은 *fragmentation 진단*에 필수입니다. free 총량은 충분한데 *큰 연속 블록이 없을* 때 `malloc(8192)`가 실패합니다.

## 파티션 테이블

플래시 4 MB는 *파티션 테이블*로 영역이 정해집니다. CSV 파일로 작성하고 `idf.py menuconfig`에서 *Custom partition table*을 선택해 사용합니다.

### 4 MiB 사용자 정의 OTA 파티션 예

```csv title="c3-partitions.csv"
# Name,Type,SubType,Offset,Size,Flags
nvs,data,nvs,0x9000,0x5000,
otadata,data,ota,0xe000,0x2000,
factory,app,factory,0x10000,0x100000,
ota_0,app,ota_0,0x110000,0x100000,
ota_1,app,ota_1,0x210000,0x100000,
storage,data,spiffs,0x310000,0xf0000,
```

마지막 storage의 끝은 `0x310000 + 0xf0000 = 0x400000`입니다. 각 app slot은1 MiB이므로 실제 image가 들어가는지도 build에서 검사합니다. 이6행은 사용자 정의 예이며 표준7분할이 아닙니다. factory가 있다고 모든 OTA 실패에서 자동 복구되는 것은 아니므로 rollback 설정·image 상태·boot 가능한 후보를 확인합니다.

파티션을 실제 flash 설정과 맞춥니다. 기준 generator는 `--flash-size 4MB`로 용량 초과를 거부합니다. auto offset·alignment·overlap도 같은 generator로 검사하고 partition binary와 기록 대상을 대조합니다.

### menuconfig로 적용

```text
$ idf.py menuconfig
# Partition Table → Custom partition table CSV
# Custom partition CSV file → partitions.csv
$ idf.py build
```

빌드 후 *플래시*는 다음과 같이 진행됩니다.

```text
$ idf.py partition-table       # 현재 파티션 테이블 보기
$ idf.py flash                 # 부트로더 + 파티션 + 앱 전체 플래시
$ idf.py app-flash             # 앱만 다시 플래시 (개발 중 빠른 cycle)
```

## NVS — 키/값 저장소

NVS(Non-Volatile Storage)는 *작은 설정 값*을 저장하는 용도입니다. WiFi SSID/비밀번호, RF 캘리브레이션, 시리얼 번호 등이 대표적입니다. 내부적으로 *wear-leveling + CRC*를 합니다.

아래 helper를 호출하기 전에 application의 NVS 초기화와 오류 정책을 정합니다. 초기화 오류가 났다고 사용자 데이터를 자동 erase하는 경로는 넣지 않습니다.

```c title="c3-nvs.c"
#include <stddef.h>
#include "nvs.h"
#include "esp_err.h"

esp_err_t save_ssid(const char *ssid) {
    if (!ssid) return ESP_ERR_INVALID_ARG;
    nvs_handle_t handle;
    esp_err_t error = nvs_open("storage", NVS_READWRITE, &handle);
    if (error != ESP_OK) return error;
    error = nvs_set_str(handle, "ssid", ssid);
    if (error == ESP_OK) error = nvs_commit(handle);
    nvs_close(handle);
    return error;
}

esp_err_t load_ssid(char *out, size_t *capacity) {
    if (!out || !capacity || !*capacity) return ESP_ERR_INVALID_ARG;
    nvs_handle_t handle;
    esp_err_t error = nvs_open("storage", NVS_READONLY, &handle);
    if (error != ESP_OK) return error;
    error = nvs_get_str(handle, "ssid", out, capacity);
    nvs_close(handle);
    return error;
}
```

key 길이와 string/blob 한도는 [기준 nvs.h](https://github.com/espressif/esp-idf/blob/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0/components/nvs_flash/include/nvs.h)의 해당 API를 따릅니다. 모든 value가4000 byte까지라는 공통 한도는 아닙니다. String 길이에는 NUL이 포함되고, blob·partition 공간·entry 관리에는 별도 조건이 있습니다. Getter 실패 시 초기화한 buffer를 유효한 값처럼 사용하지 않습니다.

## SPIFFS vs LittleFS

기준 ESP-IDF에는 SPIFFS component가 있습니다. `esp_littlefs.h`는 이 트리의 기본 header가 아니라 외부 component를 도입할 때의 interface이므로 `menuconfig`만으로 생긴다고 설명하지 않습니다. 도입할 wrapper·LittleFS revision과 component manifest를 먼저 고정합니다.

| 관점 | SPIFFS | LittleFS 도입 시 |
|---|---|---|
| 경로 | 디렉터리처럼 보이는 이름을 가진 flat namespace | 선택한 wrapper의 directory 지원 확인 |
| 전원 차단 | write 중단 뒤 mount/check·복구 정책 시험 | atomic metadata 주장과 application write durability 구분 |
| resource | 실제 파일 수·GC·지연·heap 측정 | block/cache/lookahead 설정과 workload 측정 |
| 오류 정책 | 자동 format의 데이터 손실을 명시 | mount 실패 시 무조건 format하지 않기 |

어느 filesystem도 전원 차단 시 application의 모든 기록을 보존하는 보장은 아닙니다. critical 설정은 commit·flush·동기화·복구 순서를 설계하고 반복 power-cut 시험을 수행합니다. 근거 없는 memory 사용 순위와 "ESP-IDF5.x의 일괄 LittleFS 권장" 문구는 제외했습니다. 외부 component를 고정하지 않은 이전 mount 예는 실행 절차에서 제거했습니다.

## OTA — A/B 파티션 메커니즘

OTA(Over-The-Air) 업데이트는 *현재 안 쓰는 ota 파티션에 새 이미지를 받고*, *otadata에 부트 인디케이터를 갱신*하는 방식입니다.

### 부트 흐름

| 단계 | 동작 |
|------|------|
| boot | `otadata` 읽기 |
| select | 사용할 app 파티션 결정 |
| → `factory` | 즉시 실행 |
| → `ota_0` 또는 `ota_1` | 이미지 verify → 실행 |

`CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE`이 켜진 경우 새 OTA image의 NEW/PENDING_VERIFY 상태와 다음 boot 경로를 확인합니다. 정상 self-test 후 valid로 바꾸며, 미확인 상태에서 reset되면 rollback 후보를 찾습니다. 설정·상태·유효 image 없이 무조건 복귀한다고 보장하지 않습니다.

### OTA 코드 예 (HTTPS download)

```c title="c3-ota.c"
#include <stdint.h>
#include <string.h>
#include "esp_system.h"
#include "esp_https_ota.h"
#include "esp_ota_ops.h"

extern const uint8_t server_cert_pem_start[] asm("_binary_server_cert_pem_start");

esp_err_t do_ota(const char *url) {
    if (!url || strncmp(url, "https://", 8) != 0) return ESP_ERR_INVALID_ARG;
    esp_http_client_config_t http_cfg = {
        .url = url,
        .cert_pem = (char *)server_cert_pem_start,
    };
    esp_https_ota_config_t ota_cfg = {
        .http_config = &http_cfg,
    };

    return esp_https_ota(&ota_cfg);
}
```

`server_cert.pem`에는 선택한 OTA server를 검증할 trust anchor를 넣습니다. 기본 hostname 검증을 해제하지 않습니다. Component의 `idf_component_register`에 `EMBED_TXTFILES "server_cert.pem"`를 지정해야 위 symbol이 생깁니다. `.c` 예이므로 symbol 선언의 GNU asm 문법도 고정 toolchain에서 확인합니다.

이 blocking API는 오류를 반환하며 caller가 실패 기록·재시도·성공 후 reboot를 결정합니다. HTTPS server 검증, image 형식/무결성 검증, secure boot의 서명 검증과 anti-rollback은 서로 다른 조건입니다. OTA API 성공만으로 이 모든 정책을 활성화했다고 읽지 않습니다.

### Rollback

기본적으로 "N초 안에 valid mark"라는 자동 timeout은 아닙니다. Rollback이 활성화된 새 image에서 application self-test와 watchdog/reset 정책을 정합니다.

```c
#include "esp_ota_ops.h"

void app_main(void) {
    // ... 정상 동작 확인 후
    ESP_ERROR_CHECK(esp_ota_mark_app_valid_cancel_rollback());
}
```

NEW/PENDING_VERIFY image와 rollback 설정에서 의미가 있는 절차입니다. Mark 실패를 무시하지 않고 이전 image도 실제로 boot 가능한지 검증합니다. Power loss·metadata 손상·보안 정책 거부를 포함한 모든 brick을 방지한다는 보장은 아닙니다.

## 자주 하는 실수

- **총 free만 봅니다.** 동일 capability의 largest block과 실패 크기를 함께 확인합니다. 전체 heap이 남아도 DMA·alignment·capability 조건 때문에 실패할 수 있습니다.
- **IRAM_ATTR 하나면 안전하다고 읽습니다.** 실제 cache-disabled 경로의 code·data·호출 함수를 map에서 확인합니다.
- **RTC heap을 영속 저장소로 씁니다.** Deep-sleep을 건너 유지할 데이터와 runtime allocator의 lifetime은 구분합니다.
- **mount 실패 때 자동 format합니다.** 사용자 데이터 손실을 숨기지 않고 오류·복구·명시적 초기화 정책을 분리합니다.
- **OTA rollback을 timer로 가정합니다.** 설정·image 상태·reset과 이전 image의 유효성을 함께 확인합니다.

## 정리

주소 alias와 물리 메모리를 구분하고 실제 image·partition 크기를 generator로 확인합니다. NVS·heap·OTA helper는 오류를 caller에게 돌려주며, filesystem 선택과 rollback 성공은 target의 전원 차단·재부팅 시험으로 검증합니다.

## 다음 장 예고

다음 편은 **Ch 4: GPIO·LEDC와 target 지원 범위**입니다. 22개 GPIO가 *GPIO Matrix를 통해 어떻게 페리퍼럴과 연결되는지*, C3에서 지원하는 LEDC와 지원하지 않는 MCPWM의 경계를 다룹니다.


## 관련 항목

- [Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러](/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core)
- [Ch 4: GPIO·LEDC·MCPWM — 디지털 출력의 세 모드](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 12: RTC·저전력](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — RTC SRAM 활용 패턴
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — flash encryption
- [원문 — ESP-IDF Partition Tables](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/partition-tables.html)
- [원문 — LittleFS Design](https://github.com/littlefs-project/littlefs/blob/master/DESIGN.md)
