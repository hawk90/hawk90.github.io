---
title: "ESP32-C3 메모리 맵과 플래시 — SPIFFS·LittleFS 파일시스템 선택"
slug: "embedded/riscv/esp32-c3-mastering/chapter03-memory-flash"
date: 2026-05-20T09:03:00
description: "ESP32-C3의 주소 맵을 TRM과 ESP-IDF v5.4.2 soc.h로 정리하고, heap capability·NVS·partition table·LittleFS·OTA rollback을 QEMU 실행과 generator 결과로 확인합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 3
tags: [memory, flash, mmu, spiffs, littlefs, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3의 SRAM 400 KB는 명령 버스와 데이터 버스에서 서로 다른 주소로 보이고, flash는 cache를 거쳐 두 개의 8 MB 창으로 보입니다.** 주소 창의 크기를 더해 메모리 총량으로 읽으면 틀립니다.

같은 방을 정문과 후문에서 각각 다른 번지로 부르는 건물을 떠올리면 C3의 메모리 맵이 쉬워집니다. 방은 하나인데 주소가 둘이라, 주소 표만 보고 방 수를 세면 두 배가 됩니다. 이 장은 그 주소 표를 [ESP32-C3 TRM v1.4](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf) 3장과 [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2)의 `components/soc/esp32c3/include/soc/soc.h`로 정리하고, 그 위에 올라가는 heap, NVS, partition table, 파일시스템, OTA를 차례로 다룹니다.

실행 결과는 Espressif QEMU(`esp_develop_9.0.0_20240606`, `-M esp32c3`)에서 얻었고 flash 이미지는 `idf.py qemu`가 만드는 2 MB입니다. 실제 보드의 전원 차단 시험은 하지 않았습니다.

## 메모리 영역 — 한눈에

TRM 3.3.2절은 내부 메모리를 Internal ROM 384 KB, Internal SRAM 400 KB, RTC FAST Memory 8 KB 세 종류로 나누고, Table 3.3-1에 버스별 주소를 적습니다. 외부 flash 주소는 3.3.3절 Table 3.3-2에 있습니다.

| 버스 | 주소 범위 | 크기 | 대상 |
|------|------|------|------|
| Data | `0x3FF0_0000`~`0x3FF1_FFFF` | 128 KB | Internal ROM 1 |
| Data | `0x3FC8_0000`~`0x3FCD_FFFF` | 384 KB | Internal SRAM 1 |
| Instruction | `0x4000_0000`~`0x4003_FFFF` | 256 KB | Internal ROM 0 |
| Instruction | `0x4004_0000`~`0x4005_FFFF` | 128 KB | Internal ROM 1 |
| Instruction | `0x4037_C000`~`0x4037_FFFF` | 16 KB | Internal SRAM 0 |
| Instruction | `0x4038_0000`~`0x403D_FFFF` | 384 KB | Internal SRAM 1 |
| Data/Instruction | `0x5000_0000`~`0x5000_1FFF` | 8 KB | RTC FAST Memory |
| Data (read-only) | `0x3C00_0000`~`0x3C7F_FFFF` | 8 MB | 외부 flash (cache) |
| Instruction | `0x4200_0000`~`0x427F_FFFF` | 8 MB | 외부 flash (cache) |

표를 읽는 요령은 세 가지입니다.

- **Internal SRAM 1 384 KB는 한 덩어리입니다.** 데이터 버스의 `0x3FC8_0000`과 명령 버스의 `0x4038_0000`은 같은 word를 가리킵니다. `soc.h`도 `SOC_DIRAM_IRAM_LOW 0x40380000`, `SOC_DIRAM_DRAM_LOW 0x3FC80000`과 둘의 차이를 `SOC_I_D_OFFSET`으로 정의합니다.
- **Internal SRAM 0 16 KB는 cache 자리입니다.** TRM은 이 영역을 외부 메모리의 instruction cache로 설정할 수 있고, 그때는 CPU가 직접 접근할 수 없다고 설명합니다. SRAM 400 KB = SRAM 0 16 KB + SRAM 1 384 KB입니다.
- **Flash 창은 8 MB씩이지만 장착 용량과는 별개입니다.** TRM 3.3.3.1절에 따르면 cache는 MMU 설정에 따라 64 KB 블록 단위로 매핑하고, 이 매핑으로 외부 flash를 최대 16 MB까지 주소로 쓸 수 있습니다. 같은 절은 명령 버스 8 MB와 데이터 버스 8 MB 주소 공간이 "always shared"라고 적습니다. 4 MB flash를 단 칩에서 창이 8 MB라고 용량이 늘지는 않습니다.

`soc.h`의 `SOC_IRAM_LOW`는 0x4037C000으로, cache용 SRAM 0까지 포함한 명령 버스 시작점입니다. 앱 코드가 실제로 올라가는 첫 주소는 Ch 1 부팅 로그의 `segment 2: ... vaddr=40380000`입니다.

### IRAM과 DRAM — 같은 SRAM을 왜 두 주소로 쓰나

코어는 명령을 가져오는 버스와 데이터를 읽고 쓰는 버스를 따로 갖습니다. 함수를 SRAM에서 실행하려면 명령 버스 주소에, 같은 SRAM에서 변수를 읽으려면 데이터 버스 주소에 두어야 합니다. ESP-IDF는 SRAM 1을 앞쪽은 코드(IRAM), 뒤쪽은 데이터(DRAM)로 나눠 씁니다.

나누는 선은 링커와 memory protection이 정합니다. v5.4.2의 `CONFIG_ESP_SYSTEM_MEMPROT_FEATURE`(기본값 y) 도움말에 따르면 이 기능은 SRAM을 데이터 구간과 명령 구간으로 자동으로 나누고("automatically splits the SRAM memory into data and instruction segments"), 명령 영역에는 Read/Execute, 데이터 영역에는 Read/Write 권한을 줍니다. 그래서 C3 기본 설정에서는 heap에서 실행 가능한 메모리를 받을 수 없습니다. 아래 QEMU 실행에서 `MALLOC_CAP_EXEC`가 0으로 나오는 것도 이 때문입니다. `components/heap/port/esp32c3/memory_layout.c` 역시 `CONFIG_ESP_SYSTEM_MEMPROT_FEATURE`가 켜지면 공통 capability에서 `MALLOC_CAP_EXEC`를 뺍니다.

`IRAM_ATTR`은 함수를 IRAM 구간에 배치하라는 지시입니다. flash cache가 꺼진 동안 실행돼야 하는 ISR이라면, 그 ISR이 부르는 함수와 읽는 데이터까지 내부 메모리에 있어야 합니다. Ch 2의 `ESP_INTR_FLAG_IRAM` 경고와 같은 조건입니다. ESP32 예제에서 자주 보는 GPIO 레지스터 주소 `0x3FF44004`는 C3 주소가 아닙니다. C3의 주변장치 레지스터는 `SOC_PERIPHERAL_LOW 0x60000000`부터 시작합니다.

### RTC FAST Memory — deep sleep을 넘는 8 KB

TRM 3.3.2절은 RTC FAST Memory를 "persistent in deep sleep (i.e., the RTC memory retains its values throughout deep sleep)"이라고 설명합니다. 전원이 대부분 꺼지는 동안에도 켜져 있는 작은 금고입니다. 일반 SRAM은 deep sleep에서 전원이 꺼지므로 값이 남지 않습니다.

`RTC_DATA_ATTR`을 붙인 변수는 이 영역에 놓입니다. 아래는 부팅 횟수를 세는 고전적인 예입니다.

```c title="c3-rtc-boot-count.c"
#include <stdio.h>
#include "esp_attr.h"
#include "esp_sleep.h"

RTC_DATA_ATTR static int boot_count = 0;

void app_main(void) {
    boot_count++;
    printf("Boot count: %d (wakeup cause %d)\n",
           boot_count, (int)esp_sleep_get_wakeup_cause());
    esp_deep_sleep(1000000);  /* 1 s timer wakeup */
}
```

QEMU에서는 첫 부팅의 `Boot count: 1 (wakeup cause 0)`까지만 확인했습니다. `esp_deep_sleep()`에 들어간 뒤 QEMU가 깨어나지 않았기 때문에, deep sleep 뒤 값이 2가 되는지는 이 환경에서 확인하지 못했습니다. 근거는 TRM의 위 문장이고, 실제 wake 동작은 보드에서 확인해야 하는 항목으로 남겨 둡니다.

`idf.py size`는 이 8 KB(8192 byte)를 RTC SLOW 행으로 보여 줍니다. 이름이 다른 이유는 ESP-IDF 쪽 명명에 있습니다. `soc.h`는 이 주소에 "ESP32-C3 only has RTC slow memory"라는 주석을 달고, `memory_layout.c`는 C3에서 RTC "fast" 메모리가 RTC SLOW 영역과 구분 없이 같은 곳에 놓인다고 적습니다. Ch 1의 hello 예제는 이미 52 byte를 썼습니다(`.force_fast` 28, `.rtc_reserved` 24).

## Heap — capability로 고르는 allocator

ESP-IDF의 heap은 영역마다 capability 비트를 붙여 두고, 요청한 capability를 모두 가진 영역에서만 할당합니다. 택배 보관함에 "냉장", "대형" 같은 표시가 있어서 맞는 칸에만 물건을 넣는 방식과 같습니다. `malloc()`은 `MALLOC_CAP_DEFAULT`로 할당하고, 특수한 요구가 있으면 `heap_caps_malloc()`에 capability를 직접 넘깁니다.

v5.4.2의 `memory_layout.c`가 C3에 정의한 영역은 다섯 개입니다.

| 영역 (데이터 버스 주소) | 크기 | 메모리 타입 |
|------|------|------|
| `0x3FC80000` | 0x20000 | RAM (D/IRAM level1) |
| `0x3FCA0000` | 0x20000 | RAM (D/IRAM level2) |
| `0x3FCC0000` | `APP_USABLE_DRAM_END`(0x3FCDC710)까지, 0x1C710 | Retention RAM |
| `0x3FCDC710` | `SOC_DIRAM_DRAM_HIGH`(0x3FCE0000)까지 | Retention RAM (ROM 예약 영역, 시작 후 heap에 추가) |
| `0x50000000` | 0x2000 | RTCRAM (`CONFIG_ESP_SYSTEM_ALLOW_RTC_FAST_MEM_AS_HEAP`일 때) |

여기서 `.data`/`.bss`와 IRAM 코드가 차지한 부분을 빼고 남은 것이 heap입니다. RAM 타입에는 `MALLOC_CAP_DMA`가 붙지만 RTCRAM에는 없습니다.

capability별 여유와 가장 큰 연속 블록을 출력하는 코드입니다.

```c title="c3-heap-report.c"
#include <stdio.h>
#include "esp_heap_caps.h"

void heap_report(void) {
    printf("Free DRAM: %zu\n", heap_caps_get_free_size(MALLOC_CAP_8BIT));
    printf("32-bit-capable free: %zu\n", heap_caps_get_free_size(MALLOC_CAP_32BIT));
    printf("DMA-capable free: %zu\n", heap_caps_get_free_size(MALLOC_CAP_DMA));
    printf("EXEC-capable free: %zu\n", heap_caps_get_free_size(MALLOC_CAP_EXEC));
    printf("RTCRAM free: %zu\n", heap_caps_get_free_size(MALLOC_CAP_RTCRAM));
    printf("Largest block: %zu\n", heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
}
```

QEMU에서 `app_main()` 시작 직후 실행한 결과입니다.

```text
I (73) heap_init: At 3FC8E680 len 00031980 (198 KiB): RAM
I (73) heap_init: At 3FCC0000 len 0001C710 (113 KiB): Retention RAM
I (73) heap_init: At 3FCDC710 len 00002950 (10 KiB): Retention RAM
I (74) heap_init: At 50000020 len 00001FC8 (7 KiB): RTCRAM
...
Free DRAM: 327216
32-bit-capable free: 327216
DMA-capable free: 319460
EXEC-capable free: 0
RTCRAM free: 7756
Largest block: 188416
```

DMA-capable이 Free DRAM보다 정확히 7756 byte 적습니다. 이 차이가 RTCRAM 여유와 같으므로, RTCRAM이 DMA capability를 갖지 않는다는 `memory_layout.c`의 정의가 숫자로 드러납니다. `EXEC-capable free: 0`은 앞 절의 memory protection 결과입니다.

### 총 여유량과 가장 큰 블록은 다르다

free 총량이 충분해도 연속된 큰 블록이 없으면 할당이 실패합니다. 아래 실험은 8-bit heap을 4 KiB 블록으로 채운 뒤 하나 건너 하나씩 해제하고, 8 KiB를 요청합니다.

```c title="c3-fragment.c"
static void *p[128];
int n = 0;
while (n < 128 && (p[n] = heap_caps_malloc(4096, MALLOC_CAP_8BIT))) n++;
for (int i = 0; i < n; i += 2) { heap_caps_free(p[i]); p[i] = NULL; }
void *big = heap_caps_malloc(8192, MALLOC_CAP_8BIT);
```

QEMU 결과입니다.

```text
after fragmenting: blocks=78 free=167316 largest=5632 malloc(8192)=NULL
```

약 163 KiB가 비어 있는데 가장 큰 블록은 5632 byte라 8 KiB 요청이 `NULL`을 받았습니다. 메모리 부족 로그를 분석할 때 `heap_caps_get_free_size()`만 보지 말고 `heap_caps_get_largest_free_block()`을 함께 찍어야 하는 이유입니다.

## 파티션 테이블

Flash 안의 영역 배치는 partition table이 정합니다. 기본 설정(`CONFIG_PARTITION_TABLE_SINGLE_APP`)은 `partitions_singleapp.csv`를 쓰고, Ch 1 부팅 로그의 `nvs`·`phy_init`·`factory` 세 줄이 그 결과입니다. partition table 자체는 0x8000에 놓입니다.

### 4 MiB 사용자 정의 OTA 파티션 예

OTA 슬롯 두 개와 factory, 파일시스템을 4 MiB에 넣은 CSV입니다.

```csv title="c3-partitions.csv"
# Name,Type,SubType,Offset,Size,Flags
nvs,data,nvs,0x9000,0x5000,
otadata,data,ota,0xe000,0x2000,
factory,app,factory,0x10000,0x100000,
ota_0,app,ota_0,0x110000,0x100000,
ota_1,app,ota_1,0x210000,0x100000,
storage,data,spiffs,0x310000,0xf0000,
```

마지막 `storage`의 끝은 `0x310000 + 0xf0000 = 0x400000`으로 4 MiB에 딱 맞습니다. ESP-IDF의 `gen_esp32part.py`로 이 CSV를 세 가지 조건에서 검사했습니다.

```text
== 4MB
Parsing CSV input...
Verifying table...
rc=0
...
storage,data,spiffs,0x310000,960K,
== 2MB
Parsing CSV input...
Verifying table...
Partitions tables occupies 4.0MB of flash (4194304 bytes) which does not fit in configured flash size 2MB. Change the flash size in menuconfig under the 'Serial Flasher Config' menu.
rc=2
== 4MB oversize storage
Parsing CSV input...
Verifying table...
Partitions tables occupies 4.1MB of flash (4259840 bytes) which does not fit in configured flash size 4MB. Change the flash size in menuconfig under the 'Serial Flasher Config' menu.
rc=2
```

`--flash-size 4MB`에서는 통과하고, 같은 CSV를 2 MB로 두거나 `storage`를 0x100000으로 늘리면 generator가 거부합니다. 빌드 중에 이 검사가 돌기 때문에, 용량을 넘는 table은 flash까지 가지 못합니다. 앱 슬롯 1 MiB 안에 image가 들어가는지도 빌드가 `check_sizes.py`로 검사합니다. Ch 1의 hello 예제는 `c3_hello.bin binary size 0x2bf20 bytes. Smallest app partition is 0x100000 bytes. 0xd40e0 bytes (83%) free.`를 출력했습니다.

### menuconfig로 적용

```text
$ idf.py menuconfig
# Partition Table → Custom partition table CSV
# Custom partition CSV file → partitions.csv
$ idf.py build
```

빌드한 뒤 flash에 쓰는 명령은 범위에 따라 나뉩니다.

```text
$ idf.py partition-table       # partition table 빌드·내용 출력
$ idf.py flash                 # bootloader + partition table + app 전체
$ idf.py app-flash             # app만 다시 기록
```

## NVS — 키/값 저장소

NVS(Non-Volatile Storage)는 Wi-Fi 자격 증명, 보정값, 시리얼 번호 같은 작은 값을 key로 저장합니다. v5.4.2 NVS 문서는 "NVS works best for storing many small values"라고 적고, 큰 데이터는 wear levelling 위의 FAT 파일시스템을 권합니다.

아래 helper는 `storage` namespace에 문자열 하나를 쓰고 읽습니다. 호출 전에 `nvs_flash_init()`이 성공해야 합니다.

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

새 flash 이미지에서 저장 전 읽기, 저장, 저장 후 읽기, 3 byte 버퍼로 읽기를 차례로 실행한 QEMU 결과입니다.

```text
nvs_flash_init: ESP_OK
load before save: ESP_ERR_NVS_NOT_FOUND
save: ESP_OK
load after save: ESP_OK value=my-ap len=6
load into 3-byte buffer: ESP_ERR_NVS_INVALID_LENGTH required=6
```

두 가지가 보입니다. 저장 전에는 `nvs_open(..., NVS_READONLY, ...)`이 namespace를 찾지 못해 `ESP_ERR_NVS_NOT_FOUND`를 돌려주므로, 첫 부팅에서 이 오류는 정상 경로로 처리해야 합니다. 또 `len=6`은 `"my-ap"` 5글자에 NUL을 더한 값이고, 버퍼가 작으면 `ESP_ERR_NVS_INVALID_LENGTH`와 함께 필요한 길이를 `capacity`에 돌려줍니다.

한도는 [v5.4.2 `nvs.h`](https://github.com/espressif/esp-idf/blob/v5.4.2/components/nvs_flash/include/nvs.h)와 NVS 문서에 있습니다.

| 항목 | 한도 | 출처 |
|------|------|------|
| key·namespace 이름 | 15자 (`NVS_KEY_NAME_MAX_SIZE` 16, NUL 포함) | `nvs.h` |
| string 값 | 4000 byte (NUL 포함) | NVS 문서 |
| blob 값 | 508,000 byte 또는 partition 크기의 97.6% - 4000 byte 중 작은 쪽 | NVS 문서 |
| entry 크기 | 32 byte (flash encryption 호환) | NVS 문서 |

## SPIFFS vs LittleFS

파일을 여러 개 다뤄야 하면 NVS 대신 파일시스템을 씁니다. ESP-IDF v5.4.2 트리에는 SPIFFS가 `components/spiffs`로 들어 있고, LittleFS는 트리 밖의 managed component입니다. `examples/storage/littlefs`의 `idf_component.yml`은 `joltwallet/littlefs: "~=1.14.8"`을 요구하고, 빌드할 때 component manager가 이를 내려받습니다.

| 관점 | SPIFFS (v5.4.2 문서) | LittleFS (`joltwallet/littlefs` 1.14.8) |
|---|---|---|
| 위치 | ESP-IDF `components/spiffs` | component manager로 받는 외부 component |
| 디렉터리 | 지원하지 않음. `/spiffs/tmp/myfile.txt`는 이름이 `/tmp/myfile.txt`인 파일 하나가 됨 | TBD (이 장에서 시험하지 않음) |
| 전원 차단 | 파일시스템 작업 중 전원이 끊기면 손상될 수 있고, `esp_spiffs_check`로 복구를 시도 | TBD |
| partition SubType | `spiffs` | `littlefs` (예제 `partitions_demo_esp_littlefs.csv`) |

LittleFS 예제를 C3 target으로 빌드하고 QEMU에서 돌린 결과입니다. 빌드 로그에는 `NOTICE: [1/2] joltwallet/littlefs (1.14.8)`가 찍혔습니다.

```text
I (90) esp_littlefs: Initializing LittleFS
I (90) esp_littlefs: Partition size: total: 983040, used: 8192
I (90) esp_littlefs: Opening file
I (110) esp_littlefs: File written
I (110) esp_littlefs: Renaming file
I (110) esp_littlefs: Reading file
I (110) esp_littlefs: Read from file: 'Hello World!'
I (110) esp_littlefs: Reading from flashed filesystem example.txt
I (120) esp_littlefs: Read from file: 'Example text to compile into a LittleFS disk image to be flashed to the ESP device.'
I (120) esp_littlefs: LittleFS unmounted
```

`total: 983040`은 예제 partition table의 `storage` 크기 0xF0000과 같습니다. 빌드 때 만든 이미지(`storage.bin`)를 `idf.py qemu`가 0x110000에 합쳐 넣었기 때문에 `example.txt`가 미리 들어 있습니다. 전원 차단 내성은 QEMU로 시험할 수 없어 이 장에서는 비교하지 않았습니다.

## OTA — A/B 파티션 메커니즘

OTA(Over-The-Air)는 지금 쓰지 않는 OTA 슬롯에 새 image를 받고, `otadata` partition에 다음 부팅 대상을 기록하는 방식입니다. 지금 사는 집은 그대로 두고 옆집을 먼저 꾸며 이사한 뒤, 살 만하면 그때 계약서에 도장을 찍는 순서와 같습니다.

### HTTPS로 받는 코드

`esp_https_ota()`는 다운로드, 기록, 부팅 파티션 갱신을 한 번에 하는 blocking API입니다. 아래 코드는 ESP-IDF v5.4.2에서 컴파일까지 확인했습니다.

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

`server_cert_pem_start` 심볼은 component의 `CMakeLists.txt`에 `EMBED_TXTFILES "server_cert.pem"`을 넣어야 생깁니다. 빌드하면 `server_cert.pem.S`가 생성되고, 오브젝트의 `nm` 출력에 `U _binary_server_cert_pem_start`가 보입니다. 헤더 주석에 따르면 `ESP_OK`는 "OTA data updated, next reboot will use specified partition"이라는 뜻이고, 새 image로 부팅하려면 호출자가 `esp_restart()`를 불러야 합니다. 실패 코드에는 `ESP_ERR_OTA_VALIDATE_FAILED`(image 검증 실패)와 flash 쓰기 오류가 따로 있습니다.

### Rollback — image 상태 머신

v5.4.2의 `esp_flash_partitions.h`는 OTA image 상태를 여섯 가지로 정의합니다.

| 상태 | 값 | 뜻 |
|------|----|----|
| `ESP_OTA_IMG_NEW` | 0x0 | 첫 부팅을 감시할 새 image |
| `ESP_OTA_IMG_PENDING_VERIFY` | 0x1 | 첫 부팅을 했고 확인을 기다림 |
| `ESP_OTA_IMG_VALID` | 0x2 | 동작 확인됨 |
| `ESP_OTA_IMG_INVALID` | 0x3 | 동작 불가로 표시됨, 부팅 대상 제외 |
| `ESP_OTA_IMG_ABORTED` | 0x4 | 확인 없이 재부팅됨, 부팅 대상 제외 |
| `ESP_OTA_IMG_UNDEFINED` | 0xFFFFFFFF | 상태 없음, 제한 없이 부팅 |

[v5.4.2 OTA 문서](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/ota.html)는 `CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE`이 꺼져 있으면(기본값) NEW와 PENDING_VERIFY 상태를 쓰지 않는다고 밝힙니다. 켜면 bootloader가 다음 순서로 움직입니다.

1. 선택한 image가 NEW이면 PENDING_VERIFY로 바꾸고 부팅합니다.
2. 앱이 자체 시험에 성공하면 `esp_ota_mark_app_valid_cancel_rollback()`으로 VALID를 기록합니다.
3. 확인 없이 다시 reset되면 bootloader가 PENDING_VERIFY를 ABORTED로 바꾸고 이전 image로 돌아갑니다.

문서의 표현으로는 "a new application has only one attempt to boot successfully"입니다. 시간 제한이 있는 것이 아니라, 확인하기 전에 한 번이라도 reset되면 끝입니다. 시험이 실패했을 때는 `esp_ota_mark_app_invalid_rollback_and_reboot()`로 INVALID를 기록하고 바로 되돌릴 수 있습니다.

```c title="c3-ota-confirm.c"
#include <stdbool.h>
#include "esp_ota_ops.h"

void confirm_if_pending(bool self_test_ok) {
    const esp_partition_t *running = esp_ota_get_running_partition();
    esp_ota_img_states_t state;
    if (esp_ota_get_state_partition(running, &state) != ESP_OK) return;
    if (state != ESP_OTA_IMG_PENDING_VERIFY) return;
    if (self_test_ok)
        ESP_ERROR_CHECK(esp_ota_mark_app_valid_cancel_rollback());
    else
        esp_ota_mark_app_invalid_rollback_and_reboot();
}
```

PENDING_VERIFY인지 먼저 확인하는 흐름은 OTA 문서의 예제와 같고, 이 함수도 ESP-IDF v5.4.2에서 컴파일되는 것을 확인했습니다. 같은 문서는 앱이 이 코드에 닿기 전에 abort, reboot, 전원 차단으로 멈춰도 bootloader가 다음 부팅에서 그 image를 INVALID로 표시하고 이전 image로 돌아간다고 설명합니다.

## 자주 하는 실수

- **주소 창을 메모리 총량으로 셉니다.** SRAM 1의 데이터 버스 주소와 명령 버스 주소는 같은 384 KB를 가리킵니다.
- **free 총량만 봅니다.** 위 실험에서는 163 KiB가 남았는데도 8 KiB 할당이 실패했습니다. largest free block을 함께 기록합니다.
- **heap에서 실행 코드를 받으려 합니다.** C3 기본 설정은 memory protection 때문에 `MALLOC_CAP_EXEC`가 0입니다.
- **NVS 첫 읽기의 NOT_FOUND를 오류로 처리합니다.** 아직 쓰지 않은 namespace에서는 정상 결과입니다.
- **SPIFFS에서 디렉터리를 만듭니다.** SPIFFS는 경로 전체를 파일 이름으로 저장합니다.
- **rollback이 timeout으로 동작한다고 생각합니다.** 확인 전에 reset되면 그 즉시 ABORTED가 됩니다. watchdog reset도 reset입니다.

## 정리

- C3 SRAM은 400 KB이고, 그중 SRAM 1 384 KB가 데이터 버스(`0x3FC8_0000`)와 명령 버스(`0x4038_0000`) 두 주소로 보입니다.
- Flash는 cache를 거쳐 명령 8 MB, 데이터 8 MB 창으로 매핑되며, 창 크기는 장착 용량과 무관합니다.
- QEMU에서 Wi-Fi 없는 앱의 8-bit heap 여유는 327216 byte였습니다. DMA-capable은 RTCRAM 몫인 7756 byte만큼 적고, EXEC-capable은 0입니다.
- `gen_esp32part.py`는 flash 크기를 넘는 partition table을 빌드 단계에서 거부합니다.
- NVS는 key 15자, string 4000 byte가 한도이고, 첫 읽기의 `ESP_ERR_NVS_NOT_FOUND`는 정상 경로입니다.
- LittleFS는 v5.4.2에서 `joltwallet/littlefs` managed component로 들어오고, SPIFFS는 디렉터리를 지원하지 않습니다.
- Rollback을 켜면 새 image는 확인 전 한 번의 부팅 기회만 갖습니다.

## 다음 장 예고

다음 편은 **Ch 4: GPIO·LEDC와 target 지원 범위**입니다. 22개 GPIO가 GPIO Matrix를 거쳐 주변장치와 연결되는 방식과, C3에 있는 LEDC와 없는 MCPWM의 경계를 다룹니다.


## 관련 항목

- [Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러](/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core)
- [Ch 4: GPIO·LEDC·MCPWM — 디지털 출력의 세 모드](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 12: RTC·저전력](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — RTC SRAM 활용 패턴
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — flash encryption
- [원문 — ESP-IDF Partition Tables](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/partition-tables.html)
- [원문 — LittleFS Design](https://github.com/littlefs-project/littlefs/blob/master/DESIGN.md)
