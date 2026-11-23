---
title: "ESP32-C3 개요 — RISC-V 코어·주변장치·ESP-IDF 시작"
slug: "embedded/riscv/esp32-c3-mastering/chapter01-overview"
date: 2026-05-20T09:01:00
description: "ESP32-C3와 원조 ESP32의 사양을 데이터시트로 비교하고, ESP-IDF v5.4.2로 hello_world를 빌드해 Espressif QEMU에서 부팅 로그까지 확인합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 1
tags: [esp32-c3, risc-v, mcu, wifi, ble]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **ESP32-C3은 RISC-V 단일 코어(최대 160 MHz)에 2.4 GHz Wi-Fi와 Bluetooth LE를 붙인 SoC입니다.** 이름은 ESP32와 비슷하지만 코어 ISA, 코어 수, 주변장치 구성이 모두 다릅니다.

이 시리즈는 세 가지 자료를 기준으로 삼습니다. 하드웨어 사양은 [ESP32-C3 Series Datasheet v2.5](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)와 [ESP32-C3 Technical Reference Manual v1.4](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)(이하 TRM)를, 소프트웨어는 [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2) 릴리스 태그를 따릅니다.

실제 보드는 쓰지 않았습니다. 이 장의 빌드 출력은 macOS(Apple Silicon) 호스트에서 ESP-IDF v5.4.2로 직접 빌드한 결과이고, 부팅 로그는 Espressif의 QEMU 포크(`esp_develop_9.0.0_20240606`)에서 `-M esp32c3`로 실행한 결과입니다. QEMU는 칩 revision을 v0.3으로 흉내 내므로, 로그의 revision·flash 벤더 같은 값은 실제 칩과 다를 수 있는 에뮬레이터 값입니다.

## ESP32 vs ESP32-C3 — 데이터시트로 본 차이

두 칩은 같은 ESP-IDF를 쓰지만 안쪽은 완전히 다릅니다. 같은 회사의 두 모델이라기보다, 같은 SDK를 공유하는 다른 계열의 칩으로 보는 편이 정확합니다. 아래 표는 [ESP32 Series Datasheet v5.3](https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf)의 Features 절과 ESP32-C3 Datasheet v2.5의 Features 절을 나란히 옮겼습니다.

| 항목 | ESP32 (Datasheet v5.3) | ESP32-C3 (Datasheet v2.5) |
|------|-------------|---------|
| 코어 | Xtensa LX6, single/dual-core | 32-bit RISC-V single-core (RV32IMC) |
| 클럭 | 240 MHz | 최대 160 MHz |
| CoreMark | 2코어 240 MHz에서 1079.96 | 1코어 160 MHz에서 483.27 |
| ROM | 448 KB | 384 KB |
| SRAM | 520 KB | 400 KB (그중 16 KB는 cache용) |
| RTC SRAM | 16 KB | 8 KB |
| Wi-Fi | 802.11 b/g/n | 802.11 b/g/n, 20/40 MHz, 1T1R 최대 150 Mbps |
| Bluetooth | v4.2 BR/EDR + Bluetooth LE | Bluetooth 5 (LE), Bluetooth mesh |
| GPIO | 34 | 22 (ESP32-C3FH4X·FH4AZ는 16) |
| ADC | 12-bit SAR, 최대 18채널 | 12-bit SAR 2개, 최대 6채널 |
| Touch sensor | 10 | 없음 |
| LED PWM | 최대 16채널 | 최대 6채널 |
| 보안 가속기 | AES, SHA-2, RSA, RNG | AES-128/256, SHA, RSA, RNG, HMAC, Digital Signature |

ESP32의 Hall sensor는 표에서 뺐습니다. ESP32 데이터시트 v5.3의 개정 이력에는 "Removed contents about hall sensor according to PCN20221202"라는 항목이 있고, ESP-IDF v5.0 마이그레이션 가이드도 `hall_sensor_read` API를 제거했다고 밝힙니다.

Flash는 part number로 갈립니다. C3 Datasheet v2.5의 Table 1-1에 따르면 접미사 없는 ESP32-C3는 패키지 안에 flash가 없어 외부 SPI flash가 필요하고, FN4·FH4·FH4AZ·FH4X는 4 MB, FH8X는 8 MB를 패키지 안에 넣었습니다. 같은 표의 각주는 GPIO가 16개인 변형(FH4X·FH4AZ)에서 flash용 SPI0/SPI1 핀을 bond하지 않았다고 설명합니다. 그래서 "C3는 GPIO 22개"라는 말은 part number를 정해야 참이 됩니다.

ESP-IDF 쪽 정의도 같은 숫자를 씁니다. v5.4.2의 [`soc_caps.h`](https://github.com/espressif/esp-idf/blob/v5.4.2/components/soc/esp32c3/include/soc/soc_caps.h)는 `SOC_GPIO_PIN_COUNT 22`, `SOC_LEDC_CHANNEL_NUM (6)`, `SOC_ADC_CHANNEL_NUM(PERIPH_NUM) ((PERIPH_NUM==0)? 5 : 1)`, `SOC_BLE_50_SUPPORTED (1)`을 선언합니다. ADC 6채널은 ADC1 5채널과 ADC2 1채널을 합친 값입니다.

## RV32IMC — misa 레지스터가 말해 주는 것

C3의 ISA는 RV32IMC입니다. 문서가 아니라 하드웨어가 이 이름을 직접 알려 주는 곳이 `misa` CSR(0x301)입니다. TRM v1.4 Register 1.6은 리셋 값의 각 비트를 다음과 같이 고정해 둡니다.

| `misa` 필드 | 값 | 뜻 |
|------|----|----|
| MXL | 1 | XLEN 32-bit |
| I | 1 | RV32I base 정수 명령 |
| M | 1 | 정수 곱셈·나눗셈 |
| C | 1 | 16-bit compressed 명령 |
| U | 1 | User mode 구현 |
| S | 0 | Supervisor mode 없음 |
| A | 0 | Atomic 확장 없음 |
| F, D | 0 | 부동소수점 확장 없음 |

TRM 1.4.1절 CSR 표의 각주는 `misa`가 R/W로 표시돼 있어도 필드가 hardwired라 써도 바뀌지 않는다고 적습니다. A와 F가 0이라는 점은 Ch 2에서 원자 연산과 soft-float 비용을 다룰 때 다시 꺼냅니다.

컴파일러 쪽 근거는 빌드에서 바로 보입니다. 이 장의 예제를 빌드한 `compile_commands.json`에는 `riscv32-esp-elf-gcc`(GCC 14.2.0, `esp-14.2.0_20241119`)와 `-march=rv32imc_zicsr_zifencei`가 찍혀 있습니다. RV32IMC에 CSR 명령(Zicsr)과 `fence.i`(Zifencei)를 더한 이름이고, Ch 2의 인라인 어셈블리가 쓰는 `csrr`·`csrrci`가 Zicsr에 속합니다.

## PMP — 16개 영역과 C3만의 제약

PMP(Physical Memory Protection)는 주소 범위마다 읽기·쓰기·실행 권한을 붙이는 장치입니다. 건물 출입증에 층별 권한을 적어 두는 것과 비슷합니다. 다만 C3의 PMP는 RISC-V 표준과 다르게 동작하는 부분이 있습니다. TRM v1.4 1.8.2절이 밝힌 내용은 다음과 같습니다.

- 영역은 16개이고 최소 단위는 4 byte입니다.
- 표준은 겹치는 영역이 있으면 번호가 가장 낮은 entry가 결정하지만, C3는 이 정적 우선순위를 구현하지 않았습니다. 겹친 영역 중 하나라도 허용하면 접근이 성공합니다.
- NAPOT 범위는 최대 1 GB입니다.

1.8.3절은 기본 동작도 적어 둡니다. PMP는 M-mode 접근을 기본으로 모두 허용하고 U-mode 접근을 모두 막습니다. M-mode에서도 검사를 받게 하려면 entry의 lock(L) 비트를 세워야 하고, 한번 세운 lock은 CPU reset으로만 풀립니다.

ESP-IDF는 이 제약을 그대로 반영해 부팅 중에 16개 entry를 모두 씁니다. v5.4.2의 [`cpu_region_protect.c`](https://github.com/espressif/esp-idf/blob/v5.4.2/components/esp_hw_support/port/esp32c3/cpu_region_protect.c)는 첫 주석에 "ESP32-C3 CPU doesn't support overlapping PMP regions"라고 적고, 주소 공간 전체를 아래에서 위로 TOR entry로 덮습니다. 모든 entry에 `PMP_L`을 붙이므로 M-mode에서 돌아가는 ESP-IDF 코드도 이 권한을 따릅니다.

| entry | 상한 주소 상수 | 권한 |
|------|------|------|
| 0 | `SOC_DEBUG_LOW` | NONE |
| 1 | `SOC_DEBUG_HIGH` | RWX |
| 2 | `SOC_DROM_LOW` | NONE |
| 3 | `SOC_DRAM_LOW` | R (DROM과 그 뒤 빈 구간을 합침) |
| 4 | `SOC_DRAM_HIGH` | RW |
| 5 | `SOC_DROM_MASK_HIGH` | R |
| 6 | `SOC_IROM_MASK_HIGH` | RX |
| 7 | `SOC_IRAM_LOW` | NONE |
| 8 | `SOC_IRAM_HIGH` | RWX |
| 9 | `SOC_IROM_HIGH` | RX |
| 10 | `SOC_RTC_IRAM_LOW` | NONE |
| 11 | `SOC_RTC_IRAM_HIGH` | RWX |
| 12 | `SOC_PERIPHERAL_LOW` | NONE |
| 13 | `SOC_PERIPHERAL_HIGH` | RW |
| 14 | `UINT32_MAX` | NONE |
| 15 | 마지막 4 byte | NA4, 권한 없음 |

entry가 부족해 빈 구간 일부를 이웃한 read-only·read-execute 영역에 붙였다는 점도 소스 주석에 그대로 있습니다. Ch 2에서 이 표를 `pmpcfg`·`pmpaddr` 인코딩과 함께 다시 읽습니다.

## Wi-Fi와 Bluetooth LE

두 무선은 안테나 하나를 나눠 씁니다. C3 Datasheet v2.5 Features 절은 "Internal co-existence mechanism between Wi-Fi and Bluetooth to share the same antenna"라고 적습니다. 한 차선 도로를 신호등으로 번갈아 쓰는 구조라서, Wi-Fi와 BLE를 동시에 켜면 둘 다 공존 스케줄의 영향을 받습니다.

### Wi-Fi (802.11 b/g/n)

데이터시트 Features 절과 4.3.2.2절 Wi-Fi MAC 항목에서 옮긴 사양입니다.

- 2.4 GHz 대역에서 20 MHz와 40 MHz 대역폭을 지원합니다. 5 GHz 대역은 없습니다.
- 1T1R 구성이고 데이터 레이트는 최대 150 Mbps입니다.
- Station, SoftAP, Station + SoftAP, promiscuous 모드를 지원하고 가상 인터페이스는 4개입니다.
- 보안은 GCMP, CCMP, TKIP, WAPI, WEP, BIP, WPA2-PSK/WPA2-Enterprise, WPA3-PSK/WPA3-Enterprise를 지원합니다.
- 송신 출력은 802.11b에서 최대 +21 dBm, 802.11n에서 최대 +20 dBm입니다.

150 Mbps는 무선 구간의 데이터 레이트 상한이고, TCP로 실제 옮길 수 있는 양과는 다른 숫자입니다. 이 시리즈는 실제 AP와 보드로 처리량을 재지 않았으므로 처리량 수치는 싣지 않습니다.

### Bluetooth LE

데이터시트 Features 절과 4.3.3절의 Bluetooth LE 항목입니다.

- Bluetooth 5 (LE)와 Bluetooth mesh를 지원합니다. 데이터시트에는 BR/EDR(Classic BT) 항목이 없습니다.
- PHY는 1 Mbps, 2 Mbps, Coded PHY 125 Kbps·500 Kbps입니다.
- LE Advertising Extensions, 여러 advertising set, Channel Selection Algorithm #2를 지원합니다.
- central과 peripheral 역할을 동시에 맡는 다중 연결을 지원합니다.
- High power mode에서 송신 출력은 최대 20 dBm이고, 125 Kbps 수신 감도는 최대 -105 dBm입니다.

## 메모리와 저전력 수치

SRAM 400 KB가 모두 application heap이 되지는 않습니다. 16 KB는 cache가 가져가고, 나머지에서 코드·정적 데이터·스택이 먼저 자리를 잡습니다. QEMU에서 이 장의 예제를 부팅하면 heap allocator에 등록되는 영역이 로그로 나옵니다.

```text
I (76) heap_init: Initializing. RAM available for dynamic allocation:
I (76) heap_init: At 3FC8DB80 len 00032480 (201 KiB): RAM
I (76) heap_init: At 3FCC0000 len 0001C710 (113 KiB): Retention RAM
I (77) heap_init: At 3FCDC710 len 00002950 (10 KiB): Retention RAM
I (77) heap_init: At 5000001C len 00001FCC (7 KiB): RTCRAM
```

네 영역의 `len`을 더하면 341164 byte(약 333 KiB)이고, 이만큼이 hello 수준의 앱에서 heap으로 등록됩니다. 같은 환경에서 앱만 공식 `hello_world` 예제로 바꿔 실행하면 `esp_get_minimum_free_heap_size()`가 330036 byte를 보고합니다. 둘 다 Wi-Fi를 켜지 않은 상태의 QEMU 값이라, 무선 스택을 올린 앱에서는 이보다 줄어듭니다. 데이터시트 Table 1-1 각주에 따르면 칩 revision v1.1은 SRAM 크기는 같지만 사용자가 쓸 수 있는 공간이 v0.4보다 10 KB 정도 많습니다.

저전력 수치는 칩 단독 기준입니다. 데이터시트 Table 5-9의 typical 값은 다음과 같습니다.

| 모드 | 조건 (Table 5-9) | Typ |
|------|------|-----|
| Light-sleep | VDD_SPI와 Wi-Fi 전원 차단, 모든 GPIO high-impedance | 130 µA |
| Deep-sleep | RTC timer + RTC memory | 5 µA |
| Power off | CHIP_EN low | 1 µA |

개발 보드의 USB-UART, LDO, LED는 이 표에 들어 있지 않습니다. 보드 전체 전류와 배터리 수명 계산은 Ch 12에서 다룹니다.

## ESP-IDF 설치와 첫 빌드

설치 절차는 [v5.4.2 Get Started](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/get-started/index.html)를 따릅니다. 아래 명령은 이 장에서 실제로 실행한 순서입니다. 예제를 저장소 밖으로 복사해 빌드하면 ESP-IDF 트리를 건드리지 않습니다.

```bash
git clone -b v5.4.2 --recursive https://github.com/espressif/esp-idf.git
cd esp-idf
./install.sh esp32c3
. ./export.sh

cp -r examples/get-started/hello_world ~/my_project
cd ~/my_project
idf.py set-target esp32c3
idf.py build
```

`./install.sh esp32c3`의 설치 로그에는 `riscv32-esp-elf-gdb`, `riscv32-esp-elf`(`esp-14.2.0_20241119`), `openocd-esp32`, `esp-rom-elfs` 네 도구가 찍힙니다. QEMU는 기본 설치 대상이 아니어서 `python $IDF_PATH/tools/idf_tools.py install qemu-riscv32`를 따로 실행했습니다.

### 이 장의 hello 코드

chip 정보를 읽어 target 이름, 코어 수, revision을 출력한 뒤 3초 뒤에 재시작하는 코드입니다. v5.4.2 `esp_chip_info.h`의 주석대로 `revision`은 `MXX` 형식(M = wafer major, XX = wafer minor)이라 100으로 나눠 출력합니다.

```c title="c3-hello.c"
#include <stdio.h>
#include "sdkconfig.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_chip_info.h"

void app_main(void) {
    esp_chip_info_t chip_info;
    esp_chip_info(&chip_info);

    printf("Chip: %s, %d cores, rev v%d.%d\n",
           CONFIG_IDF_TARGET,
           chip_info.cores,
           chip_info.revision / 100, chip_info.revision % 100);

    for (int i = 3; i > 0; i--) {
        printf("Restarting in %d seconds...\n", i);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
    esp_restart();
}
```

`idf.py size`는 이 코드가 각 메모리에 얼마나 들어갔는지 보여 줍니다. 아래는 기본 설정(`-Og`) 빌드의 결과입니다.

```text
│ Flash Code          │        91914 │          │                │               │
│    .text            │        91914 │          │                │               │
│ DRAM                │        55872 │    17.39 │         265424 │        321296 │
│    .text            │        47304 │    14.72 │                │               │
│    .data            │         4792 │     1.49 │                │               │
│    .bss             │         3776 │     1.18 │                │               │
│ Flash Data          │        35844 │          │                │               │
│    .rodata          │        35588 │          │                │               │
│    .appdesc         │          256 │          │                │               │
│ RTC SLOW            │           52 │     0.63 │           8140 │          8192 │
│    .force_fast      │           28 │     0.34 │                │               │
│    .rtc_reserved    │           24 │     0.29 │                │               │
...
Total image size: 179882 bytes (.bin may be padded larger)
```

DRAM 행 아래에 `.text` 47304 byte가 함께 잡혀 있습니다. TRM v1.4 3장에 따르면 SRAM 일부는 CPU의 명령 버스와 데이터 버스 양쪽에서 접근할 수 있습니다. IRAM에 올린 코드도 이 SRAM을 쓰므로 `idf.py size`는 그 크기를 DRAM 사용량에 넣어 계산합니다. 이 구조는 Ch 3에서 주소 맵으로 다룹니다.

### QEMU에서 실행한 부팅 로그

`idf.py qemu`는 bootloader, partition table, app을 2 MB flash 이미지 하나로 합친 뒤 QEMU를 띄웁니다. 아래는 그 출력에서 ROM 단계, 2nd-stage bootloader, app 시작, 예제 출력을 차례로 발췌했습니다.

```text
ESP-ROM:esp32c3-api1-20210207
Build:Feb  7 2021
rst:0x1 (POWERON),boot:0x8 (SPI_FAST_FLASH_BOOT)
...
I (1) boot: ESP-IDF v5.4.2 2nd stage bootloader
...
I (11) boot: Partition Table:
I (12) boot: ## Label            Usage          Type ST Offset   Length
I (12) boot:  0 nvs              WiFi data        01 02 00009000 00006000
I (13) boot:  1 phy_init         RF data          01 01 0000f000 00001000
I (14) boot:  2 factory          factory app      00 00 00010000 00100000
...
I (61) cpu_start: Unicore app
I (73) cpu_start: Pro cpu start user code
I (73) cpu_start: cpu freq: 160000000 Hz
...
I (88) main_task: Started on CPU0
I (88) main_task: Calling app_main()
Chip: esp32c3, 1 cores, rev v0.3
Restarting in 3 seconds...
Restarting in 2 seconds...
Restarting in 1 seconds...
ESP-ROM:esp32c3-api1-20210207
Build:Feb  7 2021
rst:0xc (RTC_SW_CPU_RST),boot:0x8 (SPI_FAST_FLASH_BOOT)
```

`esp_restart()` 뒤에 ROM이 `rst:0xc (RTC_SW_CPU_RST)`로 다시 시작하는 것까지 보입니다. `Unicore app`과 `1 cores`는 C3가 단일 코어라는 사실과 맞고, `cpu freq: 160000000 Hz`는 기본 CPU 클럭 설정입니다. `rev v0.3`은 QEMU가 흉내 내는 값이라 실제 칩의 revision과 같다고 볼 수 없습니다. 실제 보드에서는 `idf.py -p <PORT> flash monitor`로 같은 순서의 로그를 받습니다.

## 이 시리즈의 12 챕터 로드맵

| Ch | 주제 | 핵심 키워드 |
|----|------|------------|
| 1 | 개요 (이 글) | ESP32와의 차이, 첫 빌드와 QEMU 부팅 |
| 2 | RISC-V 코어 | RV32IMC, M/U-mode, PMP, CSR |
| 3 | 메모리·플래시 | IRAM/DRAM/RTC, 파티션, NVS, OTA |
| 4 | GPIO·PWM | GPIO Matrix, LEDC, MCPWM 부재 |
| 5 | 시리얼 통신 | UART, SPI, I2C, I2S, DMA |
| 6 | ADC·터치 | 12-bit SAR, 캘리브레이션, 노이즈 |
| 7 | Wi-Fi 4 | STA/AP, scan, WPA2/3, ESP-NETIF |
| 8 | BLE 5.0 | NimBLE, GATT, advertising, mesh |
| 9 | ESP-IDF 빌드 | CMake, sdkconfig, component |
| 10 | FreeRTOS | 태스크, 큐, 이벤트 그룹 |
| 11 | 보안·secure boot | eFuse, flash encryption, secure boot v2 |
| 12 | 저전력 | sleep, wake-up, 전력 예산 |

## 자주 묻는 질문

### "ESP32와 ESP32-C3 중 뭘 골라야 하나"

위 비교표에서 필요한 기능을 한 줄씩 짚어 보면 됩니다. Classic Bluetooth(A2DP 오디오, SPP), touch sensor, 2코어, ADC 7채널 이상 중 하나라도 필요하면 C3로는 안 됩니다. 반대로 BLE 5의 Coded PHY·Advertising Extensions와 HMAC·Digital Signature 가속기는 두 데이터시트 중 C3 쪽에만 있습니다.

### "기존 ESP32 코드가 그대로 도나"

target을 바꾸는 명령은 `idf.py set-target esp32c3` 하나지만, 그 뒤 빌드에서 걸리는 곳은 몇 가지로 모입니다. Xtensa 인라인 어셈블리, `xTaskCreatePinnedToCore()`의 core 1 지정, touch·DAC·MCPWM처럼 C3에 없는 주변장치, ESP32 레지스터 주소를 직접 쓰는 코드가 그렇습니다. 빌드가 통과한 뒤에도 GPIO 번호와 strapping 핀은 C3 기준으로 다시 맞춰야 합니다(Ch 4).

### "Arduino IDE에서도 되나"

이 시리즈는 Arduino core를 다루지 않습니다. 코드와 빌드 설명은 모두 ESP-IDF v5.4.2의 C API와 `idf.py` 기준이므로, Arduino에서 쓰려면 그 core가 기반으로 삼은 ESP-IDF 버전의 API 문서와 대조해야 합니다.

### "RISC-V를 새로 배워야 하나"

`app_main()`부터 C로 쓰는 범위라면 ISA를 몰라도 됩니다. RISC-V 지식이 필요한 순간은 panic 로그의 `mcause`·`mepc`를 읽을 때, 인라인 어셈블리로 CSR을 만질 때, PMP나 인터럽트 진입 코드를 따라갈 때입니다. Ch 2가 이 범위를 다룹니다.

## 정리

ESP32-C3는 RV32IMC 단일 코어, 400 KB SRAM, Wi-Fi 4와 BLE 5를 가진 칩이고, 원조 ESP32와는 코어·Bluetooth·ADC·touch·LED PWM 채널 수가 다릅니다. GPIO 수와 flash 유무는 part number에 따라 갈립니다. ESP-IDF v5.4.2로 빌드한 hello 예제는 QEMU에서 ROM부터 `app_main()`까지 부팅했고, Wi-Fi 없이도 heap으로 등록되는 RAM은 약 333 KiB였습니다.

## 다음 장 예고

다음 편은 **Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러**입니다. TRM의 CSR 목록과 ESP-IDF 소스를 대조해 C3에 실제로 있는 CSR, PMP 인코딩, 인터럽트 매트릭스의 동작을 확인합니다.


## 관련 항목

- [Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러](/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core)
- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — eFuse·flash encryption
- [원문 — ESP32-C3 Datasheet (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)
- [원문 — ESP-IDF Programming Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/)
