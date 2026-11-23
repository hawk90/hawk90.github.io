---
title: "ESP-IDF 빌드 시스템 분석 — 컴포넌트 구조와 CMake 통합"
slug: "embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build"
date: 2026-05-20T09:09:00
description: "ESP-IDF v5.4.2로 ESP32-C3 프로젝트를 만들고, component·Kconfig·sdkconfig.defaults·Component Manager·Debug/Release flavor가 실제 빌드에서 어떻게 동작하는지 직접 돌려 본 결과로 정리합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 9
tags: [esp-idf, cmake, build, component, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **ESP-IDF는 component가 빌드 단위입니다. `main`도, `freertos`도, registry에서 받은 라이브러리도 모두 component입니다.** 설정은 Kconfig로 선언하고, 실제 값은 `sdkconfig` 한 파일이 정합니다.

ESP-IDF 빌드는 레고 상자와 비슷합니다. component는 블록이고, `CMakeLists.txt`는 블록끼리 어떻게 끼우는지 적은 설명서이며, `sdkconfig`는 이번에 어떤 색 블록을 쓸지 고른 주문서입니다. 이 장은 [ESP-IDF v5.4.2 Build System 가이드](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/build-system.html)를 기준으로, 프로젝트를 새로 만들어 component와 Kconfig를 붙이고 Debug/Release를 따로 빌드한 실제 결과를 따라갑니다.

모든 명령은 macOS(Apple Silicon) 호스트에서 ESP-IDF v5.4.2와 `riscv32-esp-elf` GCC 14.2.0(`esp-14.2.0_20241119`)으로 실행했습니다. flash와 monitor는 보드가 없어 실행하지 않았습니다.

## 프로젝트 만들기

빈 프로젝트를 만들고 target을 지정한 뒤 빌드하는 순서입니다.

```bash
. "$IDF_PATH/export.sh"
idf.py create-project my_app
cd my_app
idf.py set-target esp32c3
idf.py build
```

`idf.py create-project`가 만든 파일은 세 개뿐입니다.

```text
my_app
my_app/CMakeLists.txt
my_app/main
my_app/main/CMakeLists.txt
my_app/main/my_app.c
```

최상위 `CMakeLists.txt`는 주석을 빼면 순서가 정해진 세 줄입니다. 생성된 파일의 주석은 "have to be in your project's CMakeLists in this exact order"라고 적습니다.

```cmake title="c3-project-CMakeLists.txt"
cmake_minimum_required(VERSION 3.16)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(my_app)
```

v5.4.2 `tools/idf_py_actions/core_ext.py`를 보면 `idf.py set-target`에는 `fullclean`이 의존 action으로 걸려 있고, 실행하면 `Set Target to: esp32c3, new sdkconfig will be created.`를 찍습니다. 이미 `sdkconfig`가 있으면 `tools/cmake/project.cmake`가 그 파일의 이름을 `sdkconfig.old`로 바꿔 둡니다. target을 바꾸면 설정이 새로 시작되지만 이전 값은 `sdkconfig.old`에 남아 비교할 수 있습니다.

## 컴포넌트 — 빌드 단위

component는 `CMakeLists.txt`에서 `idf_component_register()`로 자신을 등록하는 디렉터리입니다. 아래는 센서 driver를 component로 떼어 낸 구조입니다.

```text
components/
└── my_sensor/
    ├── CMakeLists.txt
    ├── Kconfig
    ├── include/
    │   └── my_sensor.h
    └── my_sensor.c
```

```cmake
# components/my_sensor/CMakeLists.txt
idf_component_register(
    SRCS         "my_sensor.c"
    INCLUDE_DIRS "include"
    REQUIRES     esp_timer
    PRIV_REQUIRES nvs_flash
)
```

`REQUIRES`는 public 의존성입니다. `my_sensor.h`가 `esp_timer.h`를 include하므로, `my_sensor`를 쓰는 component도 `esp_timer` 헤더를 볼 수 있어야 합니다. `PRIV_REQUIRES`는 `.c` 안에서만 쓰는 의존성이고, `my_sensor`를 쓰는 쪽에는 전파되지 않습니다.

정말 전파되지 않는지 확인해 봤습니다. `main`이 `REQUIRES my_sensor`만 선언한 상태에서 `main/my_app.c`에 `#include "nvs_flash.h"` 한 줄을 넣고 빌드하면 다음 오류로 멈춥니다.

```text
.../my_app/main/my_app.c:1:10: fatal error: nvs_flash.h: No such file or directory
```

`my_sensor`가 `nvs_flash`를 private으로 쓰기 때문에 `nvs_flash`의 헤더 경로는 `main`의 include path에 들어가지 않습니다. `main`이 NVS를 직접 쓰려면 자기 `CMakeLists.txt`에 `nvs_flash`를 선언해야 합니다.

```cmake
# main/CMakeLists.txt
idf_component_register(SRCS "my_app.c"
                    INCLUDE_DIRS "."
                    REQUIRES my_sensor)
```

## Kconfig — 컴포넌트 설정 메뉴

component는 자기 `Kconfig` 파일로 `menuconfig`에 설정 항목을 추가합니다. 아래 파일은 on/off 하나와 범위가 있는 정수 하나를 선언합니다.

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

endmenu
```

`sdkconfig.defaults`에 `CONFIG_MY_SENSOR_SAMPLE_RATE_HZ=200`을 두고 처음 빌드하면, `sdkconfig`와 생성 헤더 `build/config/sdkconfig.h`에 다음 줄이 생깁니다.

```text
sdkconfig:1888:CONFIG_MY_SENSOR_ENABLE=y
sdkconfig:1889:CONFIG_MY_SENSOR_SAMPLE_RATE_HZ=200
build/config/sdkconfig.h:794:#define CONFIG_MY_SENSOR_ENABLE 1
build/config/sdkconfig.h:795:#define CONFIG_MY_SENSOR_SAMPLE_RATE_HZ 200
```

C 코드는 이 매크로를 그대로 씁니다.

```c
#include "sdkconfig.h"

int my_sensor_rate_hz(void) {
#if CONFIG_MY_SENSOR_ENABLE
    return CONFIG_MY_SENSOR_SAMPLE_RATE_HZ;
#else
    return 0;
#endif
}
```

`Kconfig` 대신 `Kconfig.projbuild`라는 이름을 쓰면 항목이 "Component config" 하위 메뉴(ESP-IDF 최상위 `Kconfig`의 `menu "Component config"`)가 아니라 menuconfig 최상위에 나타납니다. Build System 가이드도 설정 항목을 그 하위 메뉴가 아니라 최상위에 두고 싶을 때 이 이름을 쓰라고 설명합니다("If you want to include configuration options at the top level of menuconfig, rather than inside the "Component Configuration" sub-menu").

## sdkconfig.defaults — 이미 있는 값은 바꾸지 않음

`sdkconfig.defaults`는 팀이 공유하는 기본값입니다. Build System 가이드는 이 파일이 "used when creating a new config from scratch, or when any new config value hasn't yet been set in the `sdkconfig` file"이라고 적습니다. 즉 `sdkconfig`를 새로 만들 때와, `sdkconfig`에 아직 없는 항목에만 적용됩니다. 위 프로젝트에서 이미 `sdkconfig`가 생긴 뒤 defaults를 `CONFIG_MY_SENSOR_SAMPLE_RATE_HZ=500`으로 바꾸고 다시 빌드한 결과입니다.

```text
after defaults=500 (existing sdkconfig):
1889:CONFIG_MY_SENSOR_SAMPLE_RATE_HZ=200
```

값은 200 그대로입니다. 기존 `sdkconfig`에 있는 값이 defaults보다 우선하기 때문입니다. defaults를 바꾼 뒤 반영하려면 `sdkconfig`를 지우고 다시 configure하거나, `idf.py menuconfig`에서 값을 직접 바꿉니다. 반대로 menuconfig에서 고친 값을 defaults로 옮길 때는 `idf.py save-defconfig`를 씁니다.

`sdkconfig`를 저장소에 커밋할지는 팀이 정할 문제입니다. 커밋하지 않는다면 defaults만으로 재현되는지 새 clone에서 빌드해 확인해야 하고, 커밋한다면 defaults와 `sdkconfig`가 어긋나지 않게 관리해야 합니다.

## Component Manager — 외부 의존성

Component Manager는 [ESP Component Registry](https://components.espressif.com/)에서 component를 받아 옵니다. `idf.py add-dependency`가 `main/idf_component.yml`을 만들어 주고, 다음 configure 때 실제로 내려받습니다.

```bash
idf.py add-dependency "espressif/led_strip^2.5.0"
idf.py reconfigure
```

생성된 manifest입니다.

```yaml title="main/idf_component.yml"
dependencies:
  idf:
    version: '>=4.1.0'
  espressif/led_strip: ^2.5.0
```

`reconfigure`가 끝나면 프로젝트 루트에 `dependencies.lock`이 생기고, 내려받은 component는 `managed_components/espressif__led_strip`에 들어갑니다.

```yaml title="dependencies.lock"
dependencies:
  espressif/led_strip:
    component_hash: 28c6509a727ef74925b372ed404772aeedf11cce10b78c3f69b3c66799095e2d
    dependencies:
    - name: idf
      require: private
      version: '>=4.4'
    source:
      registry_url: https://components.espressif.com/
      type: service
    version: 2.5.5
  idf:
    source:
      type: idf
    version: 5.4.2
direct_dependencies:
- espressif/led_strip
- idf
manifest_hash: 2bfc85108f57e609e749f0da11653e7fd2eb515c180b631209249698a684d1ca
target: esp32c3
version: 2.0.0
```

manifest의 `^2.5.0`이 실제로는 2.5.5로 풀렸고, 그 결과가 `component_hash`와 함께 lock에 고정됐습니다. 이 lock 파일을 커밋해 두면 다른 사람이 빌드해도 같은 2.5.5를 받습니다. `managed_components/` 안의 파일은 다시 받으면 덮어써지므로, 고쳐야 한다면 그 component를 프로젝트의 `components/`로 옮겨 직접 관리합니다.

## 파티션 테이블 정렬

partition 배치는 Ch 3에서 generator로 검사했습니다. 여기서는 빌드 시스템이 막아 주는 정렬 규칙 하나를 더 봅니다. app partition을 0x11000에 두고 `gen_esp32part.py`를 돌린 결과입니다.

```text
Parsing CSV input...
Verifying table...
Partition factory invalid: Offset 0x11000 is not aligned to 0x10000
rc=2
```

app partition은 64 KiB(0x10000) 경계에 놓여야 합니다. Ch 3에서 본 것처럼 cache는 flash를 64 KiB 블록 단위로 매핑하기 때문에(TRM 3.3.3.1절), 이 정렬이 맞아야 app image를 실행 주소에 매핑할 수 있습니다. 용량 초과·정렬 검사를 통과한 4 MiB CSV는 [Ch 3 파티션 예](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash#파티션-테이블)에 있습니다.

## 빌드 플레이버 — Debug·Release 분리

defaults 파일을 여러 개 두고 build 디렉터리와 `sdkconfig`를 따로 쓰면 Debug와 Release를 나눠 빌드할 수 있습니다.

```text
my_app/
├── sdkconfig.defaults              # 공통
├── sdkconfig.defaults.debug        # Debug 추가
├── sdkconfig.defaults.release      # Release 추가
└── ...
```

```bash
idf.py -B build-debug -DIDF_TARGET=esp32c3 -DSDKCONFIG=sdkconfig.debug \
       -DSDKCONFIG_DEFAULTS="sdkconfig.defaults;sdkconfig.defaults.debug" build

idf.py -B build-release -DIDF_TARGET=esp32c3 -DSDKCONFIG=sdkconfig.release \
       -DSDKCONFIG_DEFAULTS="sdkconfig.defaults;sdkconfig.defaults.release" build
```

`-DSDKCONFIG`까지 나누는 이유는 앞 절의 결과에 있습니다. build 디렉터리만 나누고 `sdkconfig` 하나를 공유하면, 먼저 빌드한 flavor의 값이 남아 두 번째 flavor의 defaults가 적용되지 않습니다.

두 flavor에 넣은 설정입니다.

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

두 빌드 모두 `unknown kconfig symbol` 경고 없이 끝났고, 생성된 `sdkconfig.debug`와 `sdkconfig.release`에 각 값이 들어갔습니다. 같은 소스에서 나온 크기 차이는 다음과 같습니다.

| 항목 | Debug (app `-Og`, 로그 DEBUG) | Release (app `-Os`, 로그 INFO) |
|------|------|------|
| bootloader `.bin` | 0x5d30 (23856 byte) | 0x47d0 (18384 byte) |
| app `.bin` | 0x2c5a0 (181664 byte) | 0x24070 (147568 byte) |
| Flash Code | 92492 byte | 69914 byte |
| DRAM 사용 | 56240 byte | 49156 byte |

bootloader는 두 flavor 모두 `CONFIG_BOOTLOADER_COMPILER_OPTIMIZATION_SIZE=y`(`-Os`)로 빌드됐으므로, bootloader 크기 차이는 로그 레벨(DEBUG/WARN) 설정에서 나옵니다. app은 빈 `app_main()`에 가까운데도 `.bin`이 34096 byte(약 19%) 줄었습니다. 두 flavor는 최적화 수준, 로그 레벨, panic 동작, newlib nano format, FreeRTOS trace 설정이 함께 다르므로 이 차이를 항목별로 나누지는 않았습니다.

## 툴체인 — riscv32-esp-elf-gcc

v5.4.2의 `tools/tools.json`은 RISC-V target용 컴파일러로 `esp-14.2.0_20241119` 릴리스를 지정하고, `install.sh esp32c3`가 이를 설치합니다(Ch 1의 설치 로그). 실제로 쓰인 컴파일러와 flag는 `build/compile_commands.json`에 남으므로, 빌드 결과를 기록할 때는 `riscv32-esp-elf-gcc --version` 출력과 이 파일을 함께 보관합니다.

```bash
riscv32-esp-elf-gcc --version
idf.py size
```

## 흔한 함정과 진단

| 증상 | 이 장에서 본 원인 | 확인 방법 |
|---|---|---|
| `fatal error: xxx.h: No such file or directory` | 의존 component가 `PRIV_REQUIRES`로만 선언돼 전파되지 않음 | 쓰는 쪽 `CMakeLists.txt`의 `REQUIRES`/`PRIV_REQUIRES` |
| defaults를 바꿨는데 값이 그대로 | 기존 `sdkconfig`가 우선 | `sdkconfig`의 해당 줄, flavor별 `-DSDKCONFIG` |
| `Partition ... is not aligned to 0x10000` | app partition offset이 64 KiB 경계가 아님 | partition CSV의 offset |
| `unknown kconfig symbol` 경고 | defaults에 이 버전·target에 없는 이름을 씀 | 빌드 로그 앞부분 |
| target을 바꾼 뒤 설정이 초기화됨 | `set-target`이 `sdkconfig`를 `sdkconfig.old`로 옮김 | `sdkconfig.old`와 비교 |

`unknown kconfig symbol` 경고는 실제로 Ch 8에서 `bleprph` 예제를 C3로 빌드할 때 `BTDM_CTRL_MODE_BLE_ONLY` 같은 ESP32(Xtensa)용 symbol에서 나왔습니다. 경고일 뿐 빌드는 계속되므로, 의도한 설정이 빠졌는지 로그에서 직접 찾아야 합니다.

## 정리

- `idf.py create-project`는 최상위·`main` `CMakeLists.txt`와 `main/my_app.c` 세 파일만 만듭니다.
- `PRIV_REQUIRES`로 선언한 의존성은 전파되지 않아, 쓰는 쪽에서 헤더를 찾지 못합니다.
- `sdkconfig.defaults`는 `sdkconfig`를 새로 만들 때나 아직 없는 항목에만 적용되고, 이미 있는 값은 바꾸지 않습니다.
- `set-target`은 기존 `sdkconfig`를 `sdkconfig.old`로 옮기고 새로 만듭니다.
- Component Manager는 `^2.5.0`을 2.5.5로 풀어 `dependencies.lock`에 hash와 함께 고정했습니다.
- app partition은 64 KiB 정렬이 필수입니다.
- 같은 앱에서 Release(`-Os`, 로그 INFO)는 Debug보다 app `.bin`이 약 19% 작았습니다.

## 다음 편

[Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)에서는 빌드한 펌웨어 안에서 태스크가 어떻게 돌아가는지 봅니다. Espressif fork의 단일 코어 동작, tickless idle, watchdog까지 다룹니다.

## 관련 항목

- [Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — 빌드 결과물 서명
- [Modern Embedded Recipes: 빌드 시스템과 CMake](/blog/embedded/modern-recipes/00-preface) — CMake 일반론
- [원문 — ESP-IDF Build System](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/build-system.html)
- [원문 — ESP Component Registry](https://components.espressif.com/)
