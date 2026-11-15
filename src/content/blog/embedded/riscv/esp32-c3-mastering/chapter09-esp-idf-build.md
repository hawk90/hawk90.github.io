---
title: "ESP-IDF 빌드 시스템 분석 — 컴포넌트 구조와 CMake 통합"
slug: "embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build"
date: 2026-05-20T09:09:00
description: "ESP-IDF v5.4.2의 프로젝트 template·CMake component 의존성과 sdkconfig/defaults·분리 빌드 경로를 확인합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 9
tags: [esp-idf, cmake, build, component, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **"ESP-IDF는 *컴포넌트*가 단위입니다. `main`도 컴포넌트고, `freertos`도 컴포넌트고, 외부 라이브러리도 컴포넌트입니다."** 컴포넌트 경계를 잘 그으면 *재사용·테스트·OTA*가 자연스럽고, 못 그으면 한 덩어리의 main.c가 됩니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`입니다. 이 릴리스의 빌드는 *CMake 위의 idf.py 래퍼*입니다. `idf.py`가 configure/build 도구와 flashing·monitor·menuconfig 동작을 조정합니다. CMake는 build graph를 생성하고 선택한 build backend가 compile/link command를 실행합니다. 빌드 시스템은 *컴포넌트 모델*을 채택하여, Component의 CMakeLists.txt가 등록을 담당하며 Kconfig는 필요할 때 추가합니다.

이번 장에서는 프로젝트 골격, 컴포넌트 작성, sdkconfig·menuconfig, Component Manager로 외부 의존성 가져오기, 그리고 *Debug·Release 같은 빌드 flavor* 분기까지 다룹니다. 실제 선택된 toolchain과 설정의 확인 범위도 마지막에 정리합니다.

## 프로젝트 만들기

```bash
# ESP-IDF 환경 활성화 (한 번만)
. "$HOME/esp/esp-idf/export.sh"

# 새 프로젝트
idf.py create-project my_app
cd my_app

# 칩 타겟 지정 (default가 esp32라 명시 권장)
idf.py set-target esp32c3

# 빌드 / 플래시 / 모니터
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

기준 `set-target` action은 `fullclean`에 의존하며 새 target의 설정을 준비합니다. 기존 설정과 sdkconfig.old 보존·변경을 확인하고 target을 바꿀 때마다 원래 설정을 잃지 않도록 관리합니다. Command 뒤에 별도 fullclean이 항상 더 필요한 것은 아닙니다.

기준 `create_project()`가 sample template에서 만드는 최소 구조입니다. 선택 파일을 template의 자동 생성물로 표시하지 않습니다.

```text
my_app/
├── CMakeLists.txt
└── main/
    ├── CMakeLists.txt
    └── my_app.c
```

최상위 CMake는 minimum version과 ESP-IDF project include를 `project()`보다 먼저 둡니다.

```cmake title="c3-project-CMakeLists.txt"
cmake_minimum_required(VERSION 3.16)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(my_app)
```

`components/`, `idf_component.yml`, `sdkconfig.defaults`, custom partitions는 목적에 따라 추가합니다. `sdkconfig`는 configuration 과정에서 만들어지는 유효 설정이며 단순 menuconfig 화면의 산출물만은 아닙니다. Defaults를 version control하고 실제 build의 sdkconfig·lock·toolchain 정보도 release 증거로 보관합니다. sdkconfig를 repository에 포함할지는 재현 정책에 따라 정하며 commit 자체를 오류로 취급하지 않습니다.

## 컴포넌트 — 빌드 단위

ESP-IDF에서 *모든 코드*는 컴포넌트 안에 있습니다. `main`도 *특수 이름의 컴포넌트*일 뿐, 다른 component처럼 등록되지만 이름에 따른 기본 dependency 등 특수 동작도 있습니다.

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

`REQUIRES`는 *public* 의존성(이 컴포넌트의 헤더가 해당 컴포넌트의 헤더를 `#include`함). `PRIV_REQUIRES`는 *private* 의존성(`.c` 파일 안에서만 씀). 공개 include/link interface와 내부 dependency를 구분합니다. 선언만 나눴다고 자동으로 cycle이 사라지는 것은 아닙니다.

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

실제 UI와 메뉴는 선택한 config 도구와 component에 따라 달라집니다. 저장할 SDKCONFIG 경로와 기본값 입력을 확인합니다. 이미 존재하는 sdkconfig의 값을 `sdkconfig.defaults` 변경만으로 덮어쓰지는 않습니다. `idf.py save-defconfig`와 유효 sdkconfig diff를 검토해 기본값을 관리합니다.

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

Fresh config에서 defaults는 symbol의 입력값을 제공합니다. Kconfig 의존성·choice·target 제약에 따라 최종 값이 달라질 수 있으므로 생성된 `sdkconfig.h`와 sdkconfig를 확인합니다.

## Component Manager — 외부 의존성

기준 릴리스는 Component Manager를 통해 외부 component를 관리합니다. NPM 같은 *컴포넌트 레지스트리*에서 라이브러리를 가져옵니다. 레지스트리는 https://components.espressif.com 입니다.

Manifest에는 dependency의 이름·버전 조건·source를 선언합니다. 아래는 SDK 기준만 제한한 최소 예이며 외부 package download를 시험한 예는 아닙니다.

```yaml title="c3-idf_component.yml"
dependencies:
  idf: "5.4.2"
```

외부 component는 실제 registry entry 또는 git source와 검토한 revision을 지정합니다. `dependencies.lock`의 해석 결과·target·component archive와 source hash를 보관하고 `managed_components/`를 수작업으로 고쳐 정본으로 사용하지 않습니다. 디렉터리가 gitignore인지 여부가 download 재발생의 직접 원인은 아니며 lock·cache·변경된 manifest·target을 확인합니다.

## 파티션 테이블

Flash 크기·image 크기·partition table offset과 각 entry의 정렬·경계는 서로 다른 조건입니다. Factory와 OTA slot이 항상 함께 있는 단일 기본 구성을 가정하지 않습니다. App partition은 기준 generator에서64KiB 정렬을 요구하며 data와 동일4KiB 규칙으로 처리하지 않습니다.

용량·overlap·alignment를 실제 generator로 검사한4MiB CSV는 [Ch3 파티션 예](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash#파티션-테이블)에 두었습니다. Factory를 빼야만 OTA slot 두 개를 만들 수 있다는 설명은 맞지 않습니다. 전체 image와 여유 용량·otadata·rollback 정책에 따라 구성합니다.

Module suffix만으로 모든 flash 용량을 추측하지 않습니다. 실제 part/module 자료와 설정, 필요하면 read-only flash identification을 대조합니다. `idf.py flash`나 erase를 확인용 조회 명령으로 실행하지 않습니다.

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
idf.py -B build-debug -DIDF_TARGET=esp32c3 -DSDKCONFIG=sdkconfig.debug \
       -DSDKCONFIG_DEFAULTS="sdkconfig.defaults;sdkconfig.defaults.debug" build

# Release 빌드 (별도 build dir)
idf.py -B build-release -DIDF_TARGET=esp32c3 -DSDKCONFIG=sdkconfig.release \
       -DSDKCONFIG_DEFAULTS="sdkconfig.defaults;sdkconfig.defaults.release" \
       build
```

Build directory만 나누고 같은 sdkconfig를 공유하면 defaults 변경이 기대대로 적용되지 않을 수 있습니다. 위 예는 SDKCONFIG도 나눕니다. 기존 config 값은 defaults보다 우선하므로 초기 적용과 이후 변경을 구분합니다.

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
# CONFIG_COMPILER_CXX_EXCEPTIONS is not set
CONFIG_NEWLIB_NANO_FORMAT=y
```

## 툴체인 — riscv32-esp-elf-gcc

기준 `tools/tools.json`의 권장 RISC-V compiler는 `esp-14.2.0_20241119`입니다. "v5.x는 모두GCC13"이라고 설명하지 않습니다. 다른 SDK tag는 해당 tools manifest와 build의 compiler command를 확인합니다.

```bash
riscv32-esp-elf-gcc --version
idf.py size
```

`CONFIG_COMPILER_OPTIMIZATION_LTO`와 고정5~10% 크기 감소·2~3배 build-time 증가를 근거 없이 제시한 이전 설명은 제외했습니다. 지원 compiler·linker 옵션과 runtime/component 호환성을 고정해 실제 산출물·build 시간·debug 동작을 비교합니다.

## 흔한 함정과 진단

| 증상 | 확인할 범위 |
|---|---|
| target 불일치 | build cache·SDKCONFIG·IDF_TARGET·toolchain |
| header not found | include path와 공개/내부 dependency·component 발견 여부 |
| undefined reference | 실제 object/library·symbol·link interface·config 조건 |
| `ESP_ERR_INVALID_STATE` | 실패 API와 현재 state; flash mismatch로 단정하지 않기 |
| partition/image 초과 | 실제 flash 설정·CSV·app alignment·서명 padding·image 크기 |
| defaults 미반영 | 기존 sdkconfig·Kconfig dependency/choice·SDKCONFIG 경로 |

같은 error code를 단일 원인으로 mapping하지 않습니다. Header 공개와 링크 문제도 실패 단계가 다릅니다. 실제 build log의 최초 오류·configure 값·최종 compile/link command를 함께 남깁니다. 이 장에서는 project template 생성과 source 계약을 대조했으며 전체 target toolchain build·flash를 실행하지 않았습니다.

## 정리

Component 등록·CMake build graph·유효 SDKCONFIG·dependency lock·toolchain을 하나의 build 증거로 기록합니다. Defaults는 기존 설정을 무조건 덮는 override가 아니며 build별 config와 cache를 분리합니다. Generator 검사·template 생성 성공과 실제 C3 compile/link/flash 성공을 구분합니다.

## 다음 편

[Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)에서는 빌드한 펌웨어 안에서 *어떻게 태스크가 돌아가는지*를 봅니다. Espressif fork의 단일 코어 동작, tickless idle, watchdog까지 풉니다.

## 관련 항목

- [Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — 빌드 결과물 서명
- [Modern Embedded Recipes: 빌드 시스템과 CMake](/blog/embedded/modern-recipes/00-preface) — CMake 일반론
- [원문 — ESP-IDF Build System](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/build-system.html)
- [원문 — ESP Component Registry](https://components.espressif.com/)
