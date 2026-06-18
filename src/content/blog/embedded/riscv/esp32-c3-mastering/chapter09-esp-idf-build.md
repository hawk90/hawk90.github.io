---
title: "ESP-IDF 빌드 시스템 분석 — 컴포넌트 구조와 CMake 통합"
date: 2026-05-20T09:09:00
description: "CMake 기반 ESP-IDF 빌드. 컴포넌트(component) 모델로 라이브러리 모듈화."
series: "ESP32-C3 Mastering"
seriesOrder: 9
tags: [esp-idf, cmake, build, component, esp32-c3]
draft: false
---

## 한 줄 요약

> **"ESP-IDF는 *컴포넌트*가 단위입니다. `main`도 컴포넌트고, `freertos`도 컴포넌트고, 외부 라이브러리도 컴포넌트입니다."** 컴포넌트 경계를 잘 그으면 *재사용·테스트·OTA*가 자연스럽고, 못 그으면 한 덩어리의 main.c가 됩니다.

ESP-IDF v5.x의 빌드는 *CMake 위의 idf.py 래퍼*입니다. CMake가 *실제 빌드*를 하고, idf.py는 *flashing·monitor·menuconfig 같은 인기 명령*을 묶어 줍니다. 빌드 시스템은 *컴포넌트 모델*을 채택하여, 각 라이브러리·드라이버·앱이 *자체 CMakeLists.txt + Kconfig*를 갖습니다.

이번 장에서는 프로젝트 골격, 컴포넌트 작성, sdkconfig·menuconfig, Component Manager로 외부 의존성 가져오기, 그리고 *Debug·Release 같은 빌드 flavor* 분기까지 다룹니다. RISC-V 툴체인의 LTO·strip 옵션도 마지막에 정리합니다.

## 프로젝트 만들기

```bash
# ESP-IDF 환경 활성화 (한 번만)
. $HOME/esp/esp-idf/export.sh

# 새 프로젝트
idf.py create-project --path . my_app
cd my_app

# 칩 타겟 지정 (default가 esp32라 명시 권장)
idf.py set-target esp32c3

# 빌드 / 플래시 / 모니터
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

`set-target`은 *한 번만* 실행합니다. 변경하면 `build/` 디렉토리가 *완전히 무효*가 되어 `idf.py fullclean`이 필요합니다.

생성되는 구조입니다.

```text
my_app/
├── CMakeLists.txt
├── main/
│   ├── CMakeLists.txt
│   ├── my_app.c
│   └── idf_component.yml
├── components/
├── sdkconfig
├── sdkconfig.defaults
└── partitions.csv
```

| 경로 | 역할 |
|------|------|
| `CMakeLists.txt` | 프로젝트 최상위 CMake |
| `main/CMakeLists.txt` | main 컴포넌트의 CMake |
| `main/my_app.c` | 사용자 코드 |
| `main/idf_component.yml` | 외부 의존성 선언 (옵션) |
| `components/` | 자체 컴포넌트 (옵션) |
| `sdkconfig` | 빌드 설정 (gitignore 권장) |
| `sdkconfig.defaults` | 팀 공유 기본값 (git 커밋) |
| `partitions.csv` | 사용자 파티션 테이블 (옵션) |

`sdkconfig`는 *menuconfig가 생성*하는 결과물입니다. 팀이 공유할 때는 *`sdkconfig.defaults`*에 *변경한 값만* 적고, `sdkconfig`는 `.gitignore`에 두는 패턴이 표준입니다.

## 컴포넌트 — 빌드 단위

ESP-IDF에서 *모든 코드*는 컴포넌트 안에 있습니다. `main`도 *특수 이름의 컴포넌트*일 뿐, freertos, lwip, nvs_flash와 동등합니다.

컴포넌트의 최소 골격입니다.

```text
components/
└── my_sensor/
    ├── CMakeLists.txt
    ├── include/
    │   └── my_sensor.h
    ├── my_sensor.c
    └── Kconfig                 # 설정 (옵션)
```

```cmake
# components/my_sensor/CMakeLists.txt
idf_component_register(
    SRCS         "my_sensor.c"
    INCLUDE_DIRS "include"
    REQUIRES     driver esp_timer
    PRIV_REQUIRES nvs_flash
)
```

`REQUIRES`는 *public* 의존성(이 컴포넌트의 헤더가 해당 컴포넌트의 헤더를 `#include`함). `PRIV_REQUIRES`는 *private* 의존성(`.c` 파일 안에서만 씀). 분리하면 *헤더 포함 그래프가 명확*해지고 *순환 의존을 막습니다*.

main 컴포넌트의 CMake도 같은 구조입니다.

```cmake
# main/CMakeLists.txt
idf_component_register(
    SRCS         "my_app.c"
    INCLUDE_DIRS "."
    REQUIRES     my_sensor esp_wifi nvs_flash
)
```

## Kconfig — 컴포넌트 설정 메뉴

각 컴포넌트는 *자체 Kconfig*로 설정을 노출합니다. `idf.py menuconfig`에서 사용자가 *체크박스·정수·문자열*로 수정합니다.

```text
# components/my_sensor/Kconfig
menu "My Sensor"

    config MY_SENSOR_ENABLE
        bool "Enable my sensor driver"
        default y

    config MY_SENSOR_SAMPLE_RATE_HZ
        int "Sample rate (Hz)"
        depends on MY_SENSOR_ENABLE
        range 1 1000
        default 100
        help
            Sample rate Hz. Higher rate increases CPU load.

    config MY_SENSOR_LOG_LEVEL
        int "Log level"
        default 3
        range 0 5

endmenu
```

C 코드에서는 *생성된 매크로*를 씁니다.

```c
#include "sdkconfig.h"

#if CONFIG_MY_SENSOR_ENABLE
    int rate = CONFIG_MY_SENSOR_SAMPLE_RATE_HZ;
    ESP_LOGI(TAG, "sensor sample rate: %d Hz", rate);
#endif
```

`Kconfig.projbuild`라는 *변형 파일명*은 *프로젝트 루트 메뉴*에 직접 항목을 추가합니다. 보통은 그냥 `Kconfig`를 쓰고, 별도 메뉴를 *최상위*로 띄우고 싶을 때만 `Kconfig.projbuild`를 씁니다.

## menuconfig 워크플로

```bash
idf.py menuconfig
```

ncurses TUI가 뜹니다. 주요 메뉴입니다.

```text
─[Sdkconfig editor]──────────────────────
  Serial flasher config                       --->
  Partition Table                              --->
  Compiler options                             --->
  Component config                             --->
      Bluetooth                                --->
      Wi-Fi                                    --->
      FreeRTOS                                 --->
      ESP System Settings                      --->
  Example Configuration                        --->
  My Sensor                                    --->   ← 우리가 추가한 메뉴
```

저장하면 *프로젝트 루트의 `sdkconfig`*에 반영됩니다. 팀 공유는 *변경된 값만*을 `sdkconfig.defaults`에 옮기는 것이 깔끔합니다.

팀 공유 기본값은 `sdkconfig.defaults`에 적습니다.

```ini
CONFIG_IDF_TARGET="esp32c3"
CONFIG_ESP_MAIN_TASK_STACK_SIZE=8192
CONFIG_FREERTOS_HZ=1000
CONFIG_COMPILER_OPTIMIZATION_SIZE=y
CONFIG_BT_ENABLED=y
CONFIG_BT_NIMBLE_ENABLED=y
CONFIG_MY_SENSOR_ENABLE=y
CONFIG_MY_SENSOR_SAMPLE_RATE_HZ=200
```

새 clone에서 `idf.py build`를 처음 돌리면 *defaults가 sdkconfig로 자동 변환*됩니다.

## Component Manager — 외부 의존성

ESP-IDF 4.4 이후 *Component Manager*가 도입되었습니다. NPM 같은 *컴포넌트 레지스트리*에서 라이브러리를 가져옵니다. 레지스트리는 https://components.espressif.com 입니다.

```yaml
# main/idf_component.yml
dependencies:
  idf:
    version: ">=5.1"
  espressif/cmake_utilities: "^0.5"
  espressif/led_strip: "^2.5"
  espressif/mdns: "^1.2"
  joltwallet/littlefs: "^1.10"
```

`idf.py build` 첫 호출에서 *자동으로 다운로드*되어 `managed_components/`에 풀립니다. `.gitignore`에 두는 것이 표준입니다(lock 파일인 `dependencies.lock`만 커밋).

자체 git repo의 컴포넌트도 가능합니다.

```yaml
dependencies:
  my_private_lib:
    git: "https://github.com/myorg/my_private_lib.git"
    version: "v1.2.3"
```

## 파티션 테이블

플래시는 *파티션*으로 나뉩니다. 기본은 `factory + nvs + otadata + ota_0 + ota_1` 같은 형태이지만, 펌웨어 크기·OTA·파일시스템에 따라 *맞춰 잘라야* 합니다.

```text
# partitions.csv
# Name,   Type, SubType, Offset,  Size,     Flags
nvs,      data, nvs,     0x9000,  0x6000,
phy_init, data, phy,     0xf000,  0x1000,
factory,  app,  factory, 0x10000, 1M,
storage,  data, spiffs,  ,        1M,
```

OTA 슬롯 두 개를 두려면 *factory를 빼고* `ota_0`, `ota_1`을 둡니다.

```text
nvs,      data, nvs,     0x9000,  0x6000,
otadata,  data, ota,     0xf000,  0x2000,
ota_0,    app,  ota_0,   0x20000, 1500K,
ota_1,    app,  ota_1,   ,        1500K,
storage,  data, spiffs,  ,        500K,
```

```bash
idf.py menuconfig
# Partition Table → Custom partition table CSV → partitions.csv
```

플래시 사이즈 mismatch는 *흔한 빌드 실패 원인*입니다. menuconfig의 `Serial flasher config → Flash size`와 *실제 모듈의 플래시 사이즈*가 같아야 합니다. ESP32-C3-WROOM-02는 4 MB가 표준이고, 일부 -N8 모델은 8 MB입니다.

## 빌드 플레이버 — Debug·Release 분리

여러 sdkconfig.defaults 파일을 두면 *플레이버*가 만들어집니다.

```text
my_app/
├── sdkconfig.defaults              # 공통
├── sdkconfig.defaults.debug        # Debug 추가
├── sdkconfig.defaults.release      # Release 추가
└── ...
```

```bash
# Debug 빌드
idf.py -DSDKCONFIG_DEFAULTS="sdkconfig.defaults;sdkconfig.defaults.debug" build

# Release 빌드 (별도 build dir)
idf.py -B build-release \
       -DSDKCONFIG_DEFAULTS="sdkconfig.defaults;sdkconfig.defaults.release" \
       build
```

Debug용 추가 옵션 예시입니다.

```text
# sdkconfig.defaults.debug
CONFIG_COMPILER_OPTIMIZATION_DEBUG=y
CONFIG_BOOTLOADER_LOG_LEVEL_DEBUG=y
CONFIG_LOG_DEFAULT_LEVEL_DEBUG=y
CONFIG_ESP_SYSTEM_PANIC_PRINT_HALT=y
CONFIG_FREERTOS_USE_TRACE_FACILITY=y
CONFIG_FREERTOS_GENERATE_RUN_TIME_STATS=y
```

```text
# sdkconfig.defaults.release
CONFIG_COMPILER_OPTIMIZATION_SIZE=y
CONFIG_BOOTLOADER_LOG_LEVEL_WARN=y
CONFIG_LOG_DEFAULT_LEVEL_INFO=y
CONFIG_ESP_SYSTEM_PANIC_SILENT_REBOOT=y
CONFIG_COMPILER_CXX_EXCEPTIONS=n
CONFIG_NEWLIB_NANO_FORMAT=y
```

## 툴체인 — riscv32-esp-elf-gcc

ESP32-C3는 RV32IMC 코어라 *RISC-V 툴체인*을 씁니다.

```bash
which riscv32-esp-elf-gcc
# ~/.espressif/tools/riscv32-esp-elf/esp-13.2.0_20230928/riscv32-esp-elf/bin/riscv32-esp-elf-gcc

riscv32-esp-elf-gcc --version
# riscv32-esp-elf-gcc (crosstool-NG esp-13.2.0_20230928) 13.2.0
```

ESP-IDF v5.x는 *GCC 13 기반*입니다. C++23, C17 일부 기능이 사용 가능합니다. *LTO(Link-Time Optimization)*를 켜면 코드 크기가 5~10% 줄고 *cross-translation-unit inlining*이 이뤄집니다.

```text
# sdkconfig
CONFIG_COMPILER_OPTIMIZATION_LTO=y
```

단, LTO는 *빌드 시간이 2~3배*로 늘고, *링커 에러 메시지가 모호*해집니다. 운영 release 빌드에만 켜고 *Debug에는 꺼 두는* 것이 보통입니다.

## 흔한 함정과 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| "esp32 target not supported" | set-target 이 esp32 (기본) | idf.py set-target esp32c3 |
| sdkconfig diff 폭주 | sdkconfig를 git commit | sdkconfig.defaults만 커밋, sdkconfig 제외 |
| ESP_ERROR_CHECK fail = 0x103 | flash size mismatch | menuconfig Flash size 모듈과 일치 |
| component header not found | REQUIRES 누락 | 해당 컴포넌트를 REQUIRES에 추가 |
| 링커 에러: undefined reference | PRIV_REQUIRES만 있고 헤더 노출 시도 | REQUIRES로 승격 |
| OTA가 두 슬롯 인식 못 함 | partitions.csv에 otadata 누락 | otadata 파티션 추가 |
| managed_components가 매번 다운로드 | .gitignore에 못 들어감 | dependencies.lock 커밋, dir은 ignore |
| 빌드는 되는데 부팅 panic | 파티션 offset 미정렬 | offset을 0x1000 배수로 |

가장 자주 보는 함정은 *플래시 사이즈 mismatch*입니다. 4 MB로 설정해 빌드했는데 모듈이 2 MB라면, 부트로더가 *파티션 테이블 위치를 못 찾고* 즉시 reset 루프에 빠집니다. `esptool.py flash_id`로 *실제 칩 정보*를 먼저 확인합니다.

```bash
esptool.py --port /dev/ttyUSB0 flash_id
# Manufacturer: ef
# Device: 4016
# Detected flash size: 4MB
```

## 정리

- ESP-IDF는 *컴포넌트가 빌드 단위*입니다. main, freertos, 외부 라이브러리가 동등합니다.
- 컴포넌트는 *CMakeLists.txt + Kconfig* 두 파일로 정의됩니다. `idf_component_register`가 핵심 호출입니다.
- `REQUIRES`(public)와 `PRIV_REQUIRES`(private)를 분리하면 *헤더 그래프가 명확*해집니다.
- `sdkconfig`는 *gitignore*, `sdkconfig.defaults`는 *git 커밋*이 표준입니다.
- Component Manager(`idf_component.yml`)는 *컴포넌트 NPM*입니다. 공식 레지스트리와 git URL 모두 지원합니다.
- 파티션 테이블의 *flash size*는 실제 모듈과 *반드시 일치*해야 합니다. mismatch는 부팅 panic의 1순위 원인입니다.
- 빌드 플레이버는 *sdkconfig.defaults.debug / .release*로 분리합니다. Debug는 풍부한 로그, Release는 size 최적화 + silent reboot.
- 툴체인은 *riscv32-esp-elf-gcc 13*입니다. *LTO*는 release 빌드에서만 켜는 것이 보통입니다.

## 다음 편

[Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)에서는 빌드한 펌웨어 안에서 *어떻게 태스크가 돌아가는지*를 봅니다. Espressif fork의 단일 코어 동작, tickless idle, watchdog까지 풉니다.

## 관련 항목

- [Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — 빌드 결과물 서명
- [Modern Embedded Recipes Part 2: 빌드 시스템](/blog/embedded/modern-recipes/) — CMake 일반론
- [원문 — ESP-IDF Build System](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/build-system.html)
- [원문 — ESP Component Registry](https://components.espressif.com/)
