---
title: "Ch 1: ESP32-C3 — 왜 RISC-V로 갈아탔나"
date: 2026-05-01T01:00:00
description: "Espressif가 Tensilica Xtensa에서 RISC-V로 전환한 첫 SoC. WiFi 4 + BLE 5.0, 32-bit RV32IMC."
series: "ESP32-C3 Mastering"
seriesOrder: 1
tags: [esp32-c3, riscv, mcu, wifi, ble]
draft: false
---

## 한 줄 요약

> **"ESP32-C3은 Espressif의 *첫 RISC-V SoC*이자, ESP8266의 *진짜 후계자*입니다."** Xtensa LX7을 버리고 RV32IMC + PMP를 채택한 결정은 단순한 ISA 교체가 아니라, *로열티 제로의 자체 코어 IP* 전략의 시작이었습니다.

ESP32(원조)가 2016년에 나왔을 때 사람들이 가장 먼저 묻는 질문은 늘 같았습니다. "왜 ARM이 아니라 Xtensa인가?" 답은 *비용*입니다. Espressif는 Tensilica로부터 LX6/LX7 코어 IP를 라이선싱해 썼고, 이는 ARM Cortex-M 라이선스보다 *훨씬 저렴*했습니다. 그러나 Tensilica가 Cadence에 인수되면서 *라이선스 비용이 흔들리기 시작*했습니다. 2020년 말 발표된 ESP32-C3는 *그 흔들림에 대한 답*입니다.

이 장에서는 ESP32-C3의 전반적인 포지셔닝을 다룹니다. *왜 RISC-V*였는지, *무엇이 같고 무엇이 다른지*, 그리고 이 시리즈가 어떤 12개 챕터로 진행될지를 정리합니다. 본격적인 코어·메모리·페리퍼럴은 다음 장부터 들어갑니다.

## ESP32 vs ESP32-C3 — 핵심 차이

이름이 비슷해 헷갈리지만, 두 칩은 *완전히 다른 코어 아키텍처*입니다. 같은 SDK(ESP-IDF)를 쓰는 덕에 *애플리케이션 코드는 거의 호환*되지만, 어셈블리·linker script·startup·인터럽트 핸들러는 *다시 짜야* 합니다.

| 항목 | ESP32 (원조) | ESP32-C3 |
|------|-------------|---------|
| 코어 | Xtensa LX6 dual-core | RV32IMC single-core |
| 클럭 | 240 MHz | 160 MHz |
| SRAM | 520 KB | 400 KB |
| Flash | 외장 SPI (최대 16 MB) | 4 MB on-package (대부분 모델) |
| WiFi | 802.11b/g/n (WiFi 4) | 802.11b/g/n (WiFi 4) |
| BLE | BLE 4.2 | BLE 5.0 (LE 1M/2M/Coded) |
| Classic BT | 있음 (EDR) | 없음 |
| GPIO | 34 | 22 (GPIO0~GPIO21) |
| ADC | 18 ch (12-bit) | 6 ch (12-bit, ADC1만) |
| Touch | 10 ch | 없음 (C3는 미지원) |
| Hall sensor | 있음 | 없음 |
| Hardware crypto | AES/SHA/RSA | AES/SHA/RSA + ECC (HMAC) |
| 가격대 (모듈) | $2.5~$4 | $1.5~$2.5 |

C3는 *기능을 덜고 가격을 낮춘* 칩입니다. ESP32의 *센서 허브* 기능(Hall, Touch, DAC)이 빠진 대신, *RISC-V 코어로 라이선스 비용 절감 + BLE 5.0*을 얻었습니다.

> **메모**: ESP32-C3는 ESP8266의 시장(WiFi 단독, 단일 코어, 저가)을 대체합니다. ESP32의 시장(dual-core + 풍부한 페리퍼럴)은 ESP32-S3가 잇습니다.

## 왜 RISC-V인가

Espressif가 RISC-V로 전환한 이유는 *세 가지*로 요약할 수 있습니다.

### 1. 로열티 제로

RISC-V는 *오픈 ISA*입니다. Tensilica처럼 코어 IP에 라이선스를 지불할 필요가 *아예 없습니다*. ARM Cortex-M처럼 *코어당 라이선스 + 출하당 로열티* 모델도 없습니다. 칩 한 개당 *수십 센트*의 비용이 그대로 절감됩니다.

### 2. 코어 IP 자유도

Espressif는 자체 코어를 *설계*했습니다. 표준 RV32IMC를 베이스로 *PMP·CLIC 인터럽트 컨트롤러·perf counter*를 자체 구현했습니다. ARM Cortex-M은 *NVIC를 마음대로 못 바꾸지만*, RISC-V는 *인터럽트 컨트롤러까지 자유*입니다.

### 3. 생태계의 폭

GCC, Clang, LLVM이 모두 RISC-V를 *1급 시민*으로 지원합니다. OpenOCD, GDB, Rust, Zig, MicroPython 등도 마찬가지입니다. ARM 생태계만큼 *성숙하지는 않지만*, 빠르게 따라잡고 있고 *오픈소스 비중이 더 높습니다*.

## RV32IMC + PMP — 한눈에

C3의 ISA는 *RV32IMC*입니다. 이를 풀면 다음과 같습니다.

```text
RV32IMC = RV32I + M + C
  RV32I — 32-bit base integer instruction set
  M     — Integer multiplication and division
  C     — Compressed 16-bit instructions (코드 밀도 향상)
```

여기에 *PMP*(Physical Memory Protection)가 더해집니다. PMP는 ARM의 MPU와 비슷한 개념인데, RISC-V 표준 사양으로 정의되어 있어 *cross-vendor 이식성*이 좋습니다.

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

C3는 *16 entries*의 PMP를 갖습니다. 부트로더가 *Flash·SRAM·RTC*에 대해 *기본 권한*을 설정하고, 사용자 코드가 *secure boot* 시나리오에서 활용합니다. 자세한 PMP 설정은 Ch 2에서 다룹니다.

## WiFi 4 + BLE 5.0 — 무선의 두 축

C3는 *WiFi와 BLE를 동시에* 제공합니다. 두 라디오는 *분리된 PHY*가 아니라 *공유 라디오 시스템*입니다. 동시 동작은 *time-multiplexing*으로 처리합니다.

### WiFi 4 (802.11 b/g/n)

WiFi 사양:

- **Standard**: IEEE 802.11 b/g/n
- **Band**: 2.4 GHz (5 GHz 미지원)
- **Throughput**: 최대 150 Mbps (HT40)
- **Security**: WPA/WPA2/WPA3-Personal, WPA2/3-Enterprise
- **Antenna**: 1T1R (single antenna)
- **Tx power**: +20 dBm (조정 가능)

WiFi 5/6은 지원하지 않습니다. *IoT 디바이스*에 5 GHz와 MIMO는 *과잉*이라는 판단입니다. 대부분의 가정용 라우터는 2.4 GHz를 *동시 송출*하므로 호환성에 문제가 없습니다.

### BLE 5.0

BLE 사양:

- **Standard**: Bluetooth 5.0 (LE only, Classic BT 없음)
- **PHY**: LE 1M, LE 2M, LE Coded (S=2, S=8)
- **Range**: Coded PHY로 long-range 가능 (~1 km LoS)
- **Roles**: Central / Peripheral / Broadcaster / Observer
- **Mesh**: Bluetooth Mesh (NimBLE 스택)

LE 2M PHY로 *throughput 2배*, Coded PHY로 *거리 4배*를 얻습니다. 둘 다 BLE 5.0의 핵심 추가 기능입니다.

## 메모리·전력·패키지

메모리:

- **SRAM**: 400 KB (실제 사용 가능 약 320 KB, 나머지는 ROM cache 등)
- **ROM**: 384 KB (boot ROM)
- **Flash**: 4 MB on-package (대부분 모듈, 8 MB 옵션 있음)
- **External**: SPI flash 추가 가능

전력:

- **Active**: ~80 mA @ WiFi TX
- **Modem-sleep**: ~15 mA (WiFi off)
- **Light-sleep**: ~140 µA
- **Deep-sleep**: ~5 µA (RTC 메모리 유지 시 ~10 µA)

패키지:

- **Package**: QFN32, 5x5 mm
- **Module**: ESP32-C3-WROOM-02, ESP32-C3-MINI-1

*Deep-sleep 5 µA*는 *코인셀 배터리 수년* 운용을 가능하게 합니다. 센서 → BLE 전송 → 다시 슬립 패턴이 IoT의 핵심 use case입니다.

## ESP-IDF — 개발 환경

C3는 *ESP-IDF v4.3 이상*에서 지원합니다. v5.x를 권장합니다. 설치는 다음과 같습니다.

```bash
# Linux/macOS
$ git clone -b release/v5.1 --recursive https://github.com/espressif/esp-idf.git
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

```c
#include <stdio.h>
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
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
    esp_restart();
}
```

빌드·플래시·모니터를 한 명령으로 실행합니다.

```bash
$ idf.py -p /dev/ttyUSB0 build flash monitor
```

출력 예시는 다음과 같습니다.

```text
I (xxx) cpu_start: Starting scheduler.
Chip: esp32c3, 1 cores, rev v0.4
Restarting in 10 seconds...
Restarting in 9 seconds...
...
```

## 이 시리즈의 12 챕터 로드맵

| Ch | 주제 | 핵심 키워드 |
|----|------|------------|
| 1 | 개요 (이 글) | Xtensa → RISC-V 전환, 사양 비교 |
| 2 | RISC-V 코어 | RV32IMC, M-mode, PMP, CSR |
| 3 | 메모리·플래시 | IRAM/DRAM/RTC, 파티션, NVS, LittleFS, OTA |
| 4 | GPIO·PWM | GPIO Matrix, LEDC, MCPWM |
| 5 | 시리얼 통신 | UART, SPI, I2C, I2S, DMA |
| 6 | ADC·터치 | 12-bit SAR, 캘리브레이션, 노이즈 |
| 7 | WiFi 4 | STA/AP, scan, WPA2/3, ESP-NETIF |
| 8 | BLE 5.0 | NimBLE, GATT, advertising, mesh |
| 9 | RTC·저전력 | sleep mode, wake-up source, ULP |
| 10 | FreeRTOS·ESP-IDF | 태스크, 큐, 이벤트 그룹 |
| 11 | 보안·secure boot | eFuse, flash encryption, secure boot v2 |
| 12 | 양산 워크플로 | 캘리브레이션, OTA, 양산 fixture |

## 자주 묻는 질문

### "ESP32와 ESP32-C3 중 뭘 골라야 하나"

*센서 허브* 기능(터치, Hall, DAC, 듀얼 코어)이 필요하면 ESP32 또는 ESP32-S3. *WiFi/BLE 노드*만 필요하고 *가격·전력*이 중요하면 ESP32-C3. 새 프로젝트라면 보통 C3가 *현명한 출발점*입니다.

### "기존 ESP32 코드가 그대로 도나"

ESP-IDF 레벨 코드는 *95% 이상 호환*됩니다. 인터럽트 핸들러에서 *어셈블리*를 직접 짠 부분, *듀얼 코어 동기화*에 의존하는 부분, *Hall/Touch*를 쓴 부분은 *다시 짜야* 합니다. menuconfig에서 target만 바꾸면 *대부분 빌드*는 됩니다.

### "Arduino IDE에서도 되나"

Arduino-ESP32 core가 *2.0.x부터 C3를 지원*합니다. 단, ESP-IDF 직접 사용 대비 *기능 노출이 늦고 제한적*입니다. 시리즈는 ESP-IDF 기준으로 진행합니다.

### "RISC-V를 새로 배워야 하나"

ESP-IDF 사용자라면 *몰라도 됩니다*. C 레벨에서 코어 ISA는 *완전히 추상화*되어 있습니다. *부트로더 디버깅, 인라인 어셈블리, 컴파일러 옵션 튜닝*이 필요할 때만 RISC-V 지식이 필요합니다. Ch 2에서 *꼭 필요한 만큼*만 다룹니다.

## 정리

- ESP32-C3는 Espressif의 *첫 RISC-V SoC*로, Xtensa 라이선스 비용 절감과 *코어 IP 자유도*를 동시에 노린 전략적 전환입니다.
- ISA는 *RV32IMC + PMP*이며, ESP-IDF 사용자는 코어 ISA를 *몰라도 무방*하지만 secure boot·인라인 어셈블리 시 필요합니다.
- *WiFi 4(2.4 GHz)*과 *BLE 5.0 (Coded PHY 포함)*을 동시 지원하며, 두 라디오는 *time-multiplexing*으로 공유 사용합니다.
- 메모리는 *400 KB SRAM + 4 MB on-package flash*가 표준이고, deep-sleep 시 *5 µA* 수준의 초저전력이 가능합니다.
- ESP32(원조) 대비 *Touch·Hall·DAC·듀얼 코어가 빠진* 대신 *가격·전력·BLE 5.0*에서 우위입니다.
- ESP-IDF v5.x가 권장 SDK이며 `idf.py set-target esp32c3`로 *RV32IMC 툴체인*이 자동 선택됩니다.
- 시리즈 전체 12 챕터는 *코어 → 메모리 → 페리퍼럴 → 무선 → 저전력 → 보안 → 양산* 순으로 진행합니다.

다음 편은 **Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러**입니다. C3의 코어를 ISA 레벨에서 들여다보고, *CSR 접근·PMP 설정·CLIC 인터럽트* 같은 *ESP-IDF가 가려 둔 부분*을 직접 만져봅니다.

## 관련 항목

- [Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러](/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core)
- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-secure-boot) — eFuse·flash encryption
- [Modern Embedded Recipes Part 5.2: WiFi provisioning](/blog/embedded/modern-recipes/part5-02-wifi-provisioning)
- [Practical RTOS Internals Part 1.1: 듀얼 코어 vs 싱글 코어](/blog/embedded/rtos/practical-internals/part1-01-single-vs-dual)
- [원문 — ESP32-C3 Datasheet (Espressif)](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)
- [원문 — ESP-IDF Programming Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/)
