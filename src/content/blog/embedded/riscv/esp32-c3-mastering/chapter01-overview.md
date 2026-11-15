---
title: "ESP32-C3 개요 — RISC-V 코어·주변장치·ESP-IDF 시작"
slug: "embedded/riscv/esp32-c3-mastering/chapter01-overview"
date: 2026-05-20T09:01:00
description: "ESP32-C3의 RISC-V·무선·주변장치 지원을 확인하고 ESP-IDF v5.4.2 기준으로 개발 환경을 시작합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 1
tags: [esp32-c3, risc-v, mcu, wifi, ble]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **ESP32-C3은 단일 RISC-V 코어와 2.4 GHz Wi-Fi·Bluetooth LE를 결합한 SoC입니다.** 모델 이름이 비슷해도 기존 ESP32의 주변장치·코어 수·핀 배치를 그대로 가정하면 안 됩니다.

이 시리즈의 소프트웨어 기준은 **ESP-IDF v5.4.2, commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`**입니다. 특정 릴리스를 현재 제품의 최적 선택으로 권고하는 의미는 아닙니다. 아래 hello_world는 API 사용 예이며 실제 보드의 전력·무선 처리량을 측정한 결과가 아닙니다.

기업의 비공개 IP 계약 비용과 ISA 전환 동기는 공개 근거 없이 단정하지 않습니다. 기존의 Cadence 인수에 따른 비용 변동·칩당 수십 센트 절감·대부분 코드95% 호환 주장은 근거를 확인하지 못해 제외했습니다.

## ESP32 vs ESP32-C3 — 핵심 차이

이름이 비슷해 헷갈리지만, 두 칩은 *완전히 다른 코어 아키텍처*입니다. ESP-IDF의 공통 API를 사용할 수 있지만 지원 주변장치·컴포넌트 설정·메모리·핀·ISA 의존 코드를 점검해야 합니다. SDK가 제공하는 startup·linker script를 사용자마다 다시 구현해야 하는 것은 아닙니다.

| 항목 | ESP32 (원조) | ESP32-C3 |
|------|-------------|---------|
| 코어 | Xtensa LX6 dual-core | RV32IMC single-core |
| 클럭 | 240 MHz | 160 MHz |
| SRAM | 520 KB | 400 KB |
| Flash | 외장 SPI (최대 16 MB) | part number별 flash 유무·용량 확인 |
| WiFi | 802.11b/g/n (WiFi 4) | 802.11b/g/n (WiFi 4) |
| BLE | BLE 4.2 | BLE 5.0 (LE 1M/2M/Coded) |
| Classic BT | 있음 (EDR) | 없음 |
| GPIO | 34 | 22 (GPIO0~GPIO21) |
| ADC | 18 ch (12-bit) | ADC1 5채널 + ADC2 1채널; API 제약 별도 |
| Touch | 10 ch | 없음 (C3는 미지원) |
| Hall sensor | 있음 | 없음 |
| Hardware crypto | AES/SHA/RSA | AES/SHA/RSA·HMAC·Digital Signature |

이 표는 핀 호환이나 기능의 상위 호환을 뜻하지 않습니다. Flash는 칩 내 package와 모듈 PCB의 별도 flash를 구분하고, 데이터시트의 part number·module schematic을 확인합니다. ADC는 두 unit에 걸쳐 있지만 대상 revision과 ESP-IDF driver의 지원 조건을 따릅니다. HMAC은 ECC 가속기의 다른 이름이 아닙니다.

## RISC-V를 읽는 기준

RISC-V는 ISA 규격이며 구현 IP의 계약과 비용은 별개의 문제입니다. C3용 바이너리는 RV32IMC 계열 toolchain으로 빌드하고 Xtensa 어셈블리를 그대로 재사용하지 않습니다. ISA와 주변장치 차이를 구분하면 core port 문제와 pin/driver 문제를 나누어 찾을 수 있습니다. 실제 toolchain 옵션은 고정한 ESP-IDF build의 compiler command에서 확인합니다.

## RV32IMC + PMP — 한눈에

C3의 ISA는 *RV32IMC*입니다. 이를 풀면 다음과 같습니다.

```text
RV32IMC = RV32I + M + C
  RV32I — 32-bit base integer instruction set
  M     — Integer multiplication and division
  C     — Compressed 16-bit instructions
```

여기에 *PMP*(Physical Memory Protection)가 더해집니다. PMP는 물리 주소 영역의 접근 권한을 제어합니다. C3에는 표준과 다른 overlapping-region 제약도 있어 다른 RISC-V 구현의 설정을 그대로 이식하지 않습니다.

```text
PMP entry (8 bits per cfg + 4 bytes per addr)
  pmpcfgN[i]:
    bit 7    L      Lock
    bit 6:5  -      Reserved
    bit 4:3  A      Address matching mode (OFF/TOR/NA4/NAPOT)
    bit 2    X      Execute permission
    bit 1    W      Write permission
    bit 0    R      Read permission

  pmpaddrN: 32-bit base address (shifted >> 2)
```

기준 ESP-IDF의 `components/esp_hw_support/port/esp32c3/cpu_region_protect.c`는 16개 entry로 비중첩 TOR 영역 등을 설정하고 lock을 사용합니다. 이는 secure boot의 서명 검증과 다른 보호 경로입니다. Ch 2에서 설정과 접근 모드의 차이를 다룹니다.

## WiFi 4 + BLE 5.0 — 무선의 두 축

C3는 *WiFi와 BLE를 동시에* 제공합니다. 두 라디오는 *분리된 PHY*가 아니라 *공유 라디오 시스템*입니다. 동시 동작은 *time-multiplexing*으로 처리합니다.

### WiFi 4 (802.11 b/g/n)

WiFi 사양:

- **Standard**: IEEE 802.11 b/g/n
- **Band**: 2.4 GHz (5 GHz 미지원)
- **전송률**: PHY link rate와 application 처리량을 구분
- **Security**: WPA/WPA2/WPA3-Personal, WPA2/3-Enterprise
- **Antenna**: 1T1R (single antenna)
- **Tx power**: 변조·규제·설정별 데이터시트 조건 확인

5 GHz 전용 AP에는 연결할 수 없습니다. 보안 방식·채널·국가 설정과 provisioning을 실제 AP에서 확인합니다.

### BLE 5.0

BLE 사양:

- **Standard**: Bluetooth 5.0 (LE only, Classic BT 없음)
- **PHY**: LE 1M, LE 2M, LE Coded (S=2, S=8)
- **Range**: 안테나·출력·PHY·간섭·배치에 따라 측정
- **Roles**: Central / Peripheral / Broadcaster / Observer
- **Mesh**: ESP-IDF의 별도 ESP-BLE-MESH 구성과 host 선택 확인

PHY 속도의 차이를 application 처리량이나 거리의 고정 배수로 읽지 않습니다. 패킷 크기·connection interval·재전송·공존 설정까지 포함해 측정합니다.

## 메모리·전력·패키지

실제 사용 가능한 heap은 cache·정적 데이터·task stack·무선 stack·linker 배치에 따라 달라집니다. SRAM 총량을 그대로 application 예산으로 쓰거나 고정320 KB를 보장하지 않습니다. Flash 유무와 용량, 노출 GPIO도 칩 part number와 모듈 회로에서 확인합니다.

전력 비교는 supply voltage·클럭·RF 모드·wake source와 측정 지점을 함께 기록합니다. 칩의 Deep-sleep 값만으로 개발 보드 전체 소비전류나 배터리 수명을 계산할 수 없습니다. LED·USB-UART·regulator·외부 센서와 주기적 송신 비용을 포함해 Ch12에서 예산을 다룹니다.

[ESP32-C3 Datasheet v2.4](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)의 series comparison·CPU/memory·전류 측정 조건을 부품 선택의 기준으로 사용합니다. 해당 수치를 이 글의 실측 결과로 제시하지 않습니다.

## ESP-IDF — 개발 환경

아래는 기준 릴리스의 설치 흐름입니다. 운영체제별 prerequisite와 Python/toolchain 요구 조건은 [v5.4.2 시작 안내](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/get-started/index.html)를 먼저 확인합니다.

```text
# Linux/macOS
$ git clone -b v5.4.2 --recursive https://github.com/espressif/esp-idf.git
$ cd esp-idf
$ ./install.sh esp32c3
$ . ./export.sh

# 새 프로젝트
$ cp -r examples/get-started/hello_world ~/my_project
$ cd ~/my_project
$ idf.py set-target esp32c3
$ idf.py menuconfig
$ idf.py build flash monitor
```

`idf.py set-target esp32c3`는 *RV32IMC 툴체인*을 자동 선택합니다. ESP32(Xtensa)와 ESP32-S3(Xtensa)는 *다른 툴체인*을 씁니다. 같은 머신에 둘 다 설치 가능합니다.

### 첫 hello_world

```c title="c3-hello.c"
#include <stdio.h>
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

    for (int i = 10; i > 0; i--) {
        printf("Restarting in %d seconds...\n", i);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
    esp_restart();
}
```

빌드·플래시·모니터를 한 명령으로 실행합니다.

```text
$ idf.py -p /dev/ttyUSB0 build flash monitor
```

실행하면 target 문자열·core 수·revision과 재시작 countdown을 출력합니다. revision은 연결한 chip에 따라 다르며 startup log의 문구도 ESP-IDF 설정에 따라 달라집니다. 이 장에서는 실제 USB port에 flash하거나 로그를 수집하지 않았습니다.

## 이 시리즈의 12 챕터 로드맵

| Ch | 주제 | 핵심 키워드 |
|----|------|------------|
| 1 | 개요 (이 글) | target 차이, 사양 확인 |
| 2 | RISC-V 코어 | RV32IMC, M-mode, PMP, CSR |
| 3 | 메모리·플래시 | IRAM/DRAM/RTC, 파티션, NVS, LittleFS, OTA |
| 4 | GPIO·PWM | GPIO Matrix, LEDC, C3 지원 범위 |
| 5 | 시리얼 통신 | UART, SPI, I2C, I2S, DMA |
| 6 | ADC·터치 | 12-bit SAR, 캘리브레이션, 노이즈 |
| 7 | WiFi 4 | STA/AP, scan, WPA2/3, ESP-NETIF |
| 8 | BLE 5.0 | NimBLE, GATT, advertising, mesh |
| 9 | ESP-IDF 빌드 | CMake, sdkconfig, component |
| 10 | FreeRTOS | 태스크, 큐, 이벤트 그룹 |
| 11 | 보안·secure boot | eFuse, flash encryption, secure boot v2 |
| 12 | 저전력 | sleep, wake-up, 전력 예산 |

## 자주 묻는 질문

### "ESP32와 ESP32-C3 중 뭘 골라야 하나"

필요한 주변장치·핀·무선 기능·메모리·전력 조건과 구매 가능한 part를 비교합니다. ESP32-S3를 포함한 다른 칩도 모든 센서 기능을 공유하지 않습니다. 가격과 전력 우위를 고정한 값으로 일반화하지 않습니다.

### "기존 ESP32 코드가 그대로 도나"

공통 API 위의 코드라도 target 선택 후 실제 build·link·실행 검증이 필요합니다. 듀얼 코어 동기화·Xtensa inline assembly·지원하지 않는 주변장치·직접 레지스터 접근을 먼저 찾습니다. 성공 비율을 측정하지 않은95% 같은 수치는 사용하지 않습니다.

### "Arduino IDE에서도 되나"

Arduino-ESP32를 사용한다면 선택한 core 릴리스와 board definition의 ESP32-C3 지원을 확인합니다. 이 시리즈의 C API·빌드 설명은 ESP-IDF v5.4.2를 기준으로 합니다.

### "RISC-V를 새로 배워야 하나"

ESP-IDF 사용자라면 *몰라도 됩니다*. C 레벨에서 코어 ISA는 *완전히 추상화*되어 있습니다. *부트로더 디버깅, 인라인 어셈블리, 컴파일러 옵션 튜닝*이 필요할 때만 RISC-V 지식이 필요합니다. Ch 2에서 *꼭 필요한 만큼*만 다룹니다.

## 정리

C3는 기존 ESP32와 ISA·코어 수·주변장치가 다릅니다. ESP-IDF의 공통 API와 target별 제약을 구분하고, 부품 사양·SDK contract·실제 보드 측정을 각각 기록합니다. 시리즈는 코어, 메모리, 주변장치, 무선, 빌드, FreeRTOS, 보안, 저전력 순서로 이어집니다.

## 다음 장 예고

다음 편은 **Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러**입니다. C3의 코어를 ISA 레벨에서 들여다보고, *CSR 접근·PMP 설정·인터럽트 매트릭스* 같은 *ESP-IDF가 가려 둔 부분*을 직접 만져봅니다.


## 관련 항목

- [Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러](/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core)
- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — eFuse·flash encryption
- [원문 — ESP32-C3 Datasheet (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)
- [원문 — ESP-IDF Programming Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/)
