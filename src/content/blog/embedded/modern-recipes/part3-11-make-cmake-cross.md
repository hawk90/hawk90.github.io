---
title: "Make·CMake 크로스 컴파일 — Toolchain File·Sysroot·Preset"
slug: "embedded/modern-recipes/part3-11-make-cmake-cross"
date: 2026-04-12T09:33:00
description: "arm-none-eabi 크로스 빌드를 Makefile과 CMake toolchain file·preset으로 구성하고, find root·sysroot·링크 옵션에서 생기는 함정을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 33
tags: [recipes, build, cmake]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> CMake toolchain file이나 Makefile 접두어 변수로 host와 target compiler를 나누고, CPU·FPU 옵션은 한 곳에 두어 컴파일과 링크에 같은 값으로 넘깁니다.

toolchain 설치는 [3-01: 크로스 컴파일러](/blog/embedded/modern-recipes/part3-01-cross-compiler), linker script 작성은 [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)에서 다룬 것을 전제로 합니다.

## 어떤 상황에서 쓰나

- 새 chip이나 보드를 위한 빌드 환경 구축
- 같은 코드를 두 chip(예: STM32F4와 H7)에 빌드
- CI 서버에서 고정한 toolchain으로 자동 빌드

## 핵심 개념

### 1) Make로 단순 빌드

아래 Makefile은 compiler 접두어(`CROSS`)만 바꿔 host와 target을 나누는 가장 작은 구성입니다. `CFLAGS`를 `LDFLAGS`에 다시 넣어 CPU·FPU 옵션이 링크 단계에도 가도록 했습니다.

```makefile
# Makefile — 간단한 ARM 빌드
TARGET    = app
CROSS     = arm-none-eabi-

CC        = $(CROSS)gcc
LD        = $(CROSS)gcc
OBJCOPY   = $(CROSS)objcopy
SIZE      = $(CROSS)size

CFLAGS    = -mcpu=cortex-m4 -mthumb \
            -mfpu=fpv4-sp-d16 -mfloat-abi=hard \
            -Wall -Wextra -Os -g3 \
            -ffunction-sections -fdata-sections
DEPFLAGS  = -MMD -MP

LDFLAGS   = $(CFLAGS) \
            -T linker.ld \
            -Wl,--gc-sections \
            -Wl,-Map=$(TARGET).map \
            --specs=nano.specs

SRCS = $(wildcard src/*.c) startup.s
OBJS = $(SRCS:%.c=build/%.o)
OBJS := $(OBJS:%.s=build/%.o)
DEPS = $(OBJS:.o=.d)

all: $(TARGET).bin $(TARGET).elf
	$(SIZE) $(TARGET).elf

$(TARGET).elf: $(OBJS)
	$(LD) $(LDFLAGS) $(OBJS) -o $@

$(TARGET).bin: $(TARGET).elf
	$(OBJCOPY) -O binary $< $@

build/%.o: %.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) $(DEPFLAGS) -c $< -o $@

build/%.o: %.s
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -rf build $(TARGET).elf $(TARGET).bin $(TARGET).map

-include $(DEPS)

.PHONY: all clean
```

헤더 의존성은 `DEPFLAGS`가 맡습니다. `-MMD`는 컴파일하면서 `-o` 파일 이름의 확장자를 `.d`로 바꾼 의존성 파일을 만들고(시스템 헤더는 빼고), `-MP`는 헤더마다 빈 규칙을 더해 헤더를 지웠을 때 make가 멈추지 않게 합니다([GCC 14.2 Preprocessor Options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Preprocessor-Options.html)). `-include`는 첫 빌드처럼 `.d`가 아직 없을 때 오류 없이 넘어갑니다([GNU make, Including Other Makefiles](https://www.gnu.org/software/make/manual/html_node/Include.html)). `DEPFLAGS`를 `CFLAGS`에 넣지 않은 것은 `LDFLAGS`가 `CFLAGS`를 다시 쓰기 때문입니다.

### 2) CMake toolchain file

```cmake
# toolchain-arm-none-eabi.cmake
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER arm-none-eabi-gcc)
set(CMAKE_CXX_COMPILER arm-none-eabi-g++)
set(CMAKE_ASM_COMPILER arm-none-eabi-gcc)
set(CMAKE_AR arm-none-eabi-ar)
set(CMAKE_OBJCOPY arm-none-eabi-objcopy)
set(CMAKE_SIZE arm-none-eabi-size)

set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
```

[3-01: 크로스 컴파일러](/blog/embedded/modern-recipes/part3-01-cross-compiler)의 toolchain file과 비교하면 `CMAKE_AR`와 find root 네 줄을 더했고, `CMAKE_C_FLAGS_INIT`의 `-mcpu=cortex-m4 -mthumb`는 뺐습니다. `CMAKE_<LANG>_FLAGS_INIT`은 `CMAKE_<LANG>_FLAGS`의 초기값이고, `CMAKE_<LANG>_FLAGS`는 컴파일과 링크의 모든 compiler 호출에 붙습니다([`CMAKE_<LANG>_FLAGS_INIT`](https://cmake.org/cmake/help/v3.31/variable/CMAKE_LANG_FLAGS_INIT.html), [`CMAKE_<LANG>_FLAGS`](https://cmake.org/cmake/help/v3.31/variable/CMAKE_LANG_FLAGS.html)). toolchain file에 `-mcpu`를 두면 아래 두 family 예의 H7 빌드에서 C·C++ 명령줄에 `-mcpu=cortex-m4`와 `-mcpu=cortex-m7`이 함께 들어갑니다. 그래서 CPU 옵션은 `CMakeLists.txt`의 `MCU_FLAGS` 한 곳에만 둡니다.

- `CMAKE_SYSTEM_NAME`을 설정하면 CMake가 `CMAKE_CROSSCOMPILING`을 참으로 두고, `Generic`은 bare metal embedded device용 값입니다([CMAKE_CROSSCOMPILING](https://cmake.org/cmake/help/v3.31/variable/CMAKE_CROSSCOMPILING.html), [CMAKE_SYSTEM_NAME](https://cmake.org/cmake/help/v3.31/variable/CMAKE_SYSTEM_NAME.html)).
- `STATIC_LIBRARY`는 configure 단계의 `try_compile()`이 실행 파일 대신 정적 라이브러리를 만들게 합니다. CMake 문서는 이 값이 링커를 돌리지 않으며 "cross-compiling toolchains that cannot link without custom flags or linker scripts"를 위한 것이라고 적습니다([CMAKE_TRY_COMPILE_TARGET_TYPE](https://cmake.org/cmake/help/v3.31/variable/CMAKE_TRY_COMPILE_TARGET_TYPE.html), 3.6에서 추가). 이 toolchain file에는 linker script도 CPU 옵션도 없으므로 테스트 프로그램을 링크하지 않는 쪽이 맞습니다.

### 3) Sysroot와 find root

find root 네 줄은 root가 있어야 의미가 있습니다. CMake 소스는 `CMAKE_SYSROOT`·`CMAKE_SYSROOT_COMPILE`·`CMAKE_SYSROOT_LINK`·`CMAKE_FIND_ROOT_PATH`가 모두 비어 있으면 검색 경로를 다시 root하지 않고 그대로 돌려줍니다([cmFindCommon.cxx, v3.31.0](https://github.com/Kitware/CMake/blob/v3.31.0/Source/cmFindCommon.cxx#L229-L240)). 위 toolchain file만으로는 `ONLY`를 적어도 `find_*`가 host 경로를 찾습니다.

target용 라이브러리를 `find_*`로 찾는 경우를 예로 듭니다. vendor SDK를 프로젝트의 `sdk/` 아래에 두고 그 안에 `lib/libfoo.a`와 `include/foo.h`가 있다고 하면, toolchain file에 root 한 줄을 더합니다.

```cmake
# toolchain-arm-none-eabi.cmake에 추가
set(CMAKE_FIND_ROOT_PATH ${CMAKE_CURRENT_LIST_DIR}/sdk)
```

```cmake
# CMakeLists.txt
find_library(FOO_LIB foo REQUIRED)
find_path(FOO_INCLUDE_DIR foo.h REQUIRED)
```

`Generic` 플랫폼 파일은 시스템 검색 경로를 `/lib`·`/include`로 정하고([Generic.cmake, v3.31.0](https://github.com/Kitware/CMake/blob/v3.31.0/Modules/Platform/Generic.cmake)), `CMAKE_FIND_ROOT_PATH`는 모든 검색 경로 앞에 붙어 검색 전체를 그 아래로 다시 root합니다([find_library](https://cmake.org/cmake/help/v3.31/command/find_library.html)). 그래서 `find_library`는 `sdk/lib/libfoo.a`를, `find_path`는 `sdk/include`를 돌려줍니다. 모드가 `ONLY`이므로 host의 `/usr/lib`에 같은 이름의 라이브러리가 있어도 후보가 되지 않고, `sdk/`에 없으면 `REQUIRED`가 configure를 멈춥니다(3.18에서 추가).

`CMAKE_SYSROOT`도 `find_*` root로 쓰이지만 compiler에 `--sysroot`로 함께 전달되고, toolchain file에서만 설정할 수 있습니다([CMAKE_SYSROOT](https://cmake.org/cmake/help/v3.31/variable/CMAKE_SYSROOT.html)). GCC는 `--sysroot=dir`을 받으면 헤더와 라이브러리를 찾는 논리 root를 `dir`로 바꿉니다([GCC 14.2 Directory Options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Directory-Options.html)). compiler의 검색은 그대로 두고 `find_*`만 SDK로 돌리려면 `CMAKE_FIND_ROOT_PATH`를 씁니다. [cmake-toolchains(7)](https://cmake.org/cmake/help/v3.31/manual/cmake-toolchains.7.html#cross-compiling-for-linux)의 Linux 예처럼 target rootfs 전체가 있을 때가 `CMAKE_SYSROOT` 쪽입니다.

### 4) CMakeLists.txt 작성

toolchain file이 compiler를 정하면 `CMakeLists.txt`는 옵션과 target만 다룹니다. `add_compile_options()`·`add_link_options()`는 디렉터리 속성이라 호출 *뒤에* 만든 target에만 적용되므로 `add_executable()`보다 앞에 둡니다([add_link_options](https://cmake.org/cmake/help/v3.31/command/add_link_options.html), [COMPILE_OPTIONS 디렉터리 속성](https://cmake.org/cmake/help/v3.31/prop_dir/COMPILE_OPTIONS.html)).

```cmake
cmake_minimum_required(VERSION 3.21)
project(myapp LANGUAGES C CXX ASM)

set(MCU_FLAGS -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard)
set(LD_SCRIPT ${CMAKE_SOURCE_DIR}/linker.ld)

add_compile_options(
    ${MCU_FLAGS}
    -Wall -Wextra
    -ffunction-sections -fdata-sections
)

add_link_options(
    ${MCU_FLAGS}
    -T ${LD_SCRIPT}
    -Wl,--gc-sections
    -Wl,-Map=${CMAKE_PROJECT_NAME}.map
    --specs=nano.specs
)

file(GLOB SRCS src/*.c)

add_executable(${CMAKE_PROJECT_NAME}.elf
    ${SRCS}
    startup.s
)

add_custom_command(TARGET ${CMAKE_PROJECT_NAME}.elf POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:${CMAKE_PROJECT_NAME}.elf>
            ${CMAKE_PROJECT_NAME}.bin
    COMMAND ${CMAKE_SIZE} $<TARGET_FILE:${CMAKE_PROJECT_NAME}.elf>
)
```

`MCU_FLAGS`는 따옴표 없이 씁니다. `set()`은 여러 인자를 세미콜론 목록으로 저장하고, 따옴표 없는 `${MCU_FLAGS}`는 그 목록을 인자 여러 개로 펼칩니다([set](https://cmake.org/cmake/help/v3.31/command/set.html), [cmake-language(7) Lists](https://cmake.org/cmake/help/v3.31/manual/cmake-language.7.html#lists)). `COMPILE_OPTIONS`는 목록 원소 하나를 옵션 하나로 담으므로, `set(MCU_FLAGS "-mcpu=cortex-m4 -mthumb ...")`처럼 따옴표로 묶으면 공백이 든 문자열 전체가 옵션 하나로 들어갑니다. 한 문자열을 옵션 여러 개로 나누는 방법은 `SHELL:` 접두어입니다([add_compile_options, Option De-duplication](https://cmake.org/cmake/help/v3.31/command/add_compile_options.html#option-de-duplication)).

`-O`·`-g`는 여기에 고정하지 않고 preset의 `CMAKE_BUILD_TYPE`에 맡깁니다. CMake 3.31의 GNU compiler 설정은 `Debug`에 `-g`, `MinSizeRel`에 `-Os -DNDEBUG`를 붙이고([GNU.cmake L56-64](https://github.com/Kitware/CMake/blob/v3.31.0/Modules/Compiler/GNU.cmake#L56-L64)), 이 configuration별 플래그는 `add_compile_options()`로 더한 옵션보다 앞에 놓입니다([`CMAKE_<LANG>_FLAGS_<CONFIG>`](https://cmake.org/cmake/help/v3.31/variable/CMAKE_LANG_FLAGS_CONFIG.html)). `add_compile_options()`에 `-Os`를 적어 두면 Debug preset으로 빌드해도 `-Os`가 들어갑니다.

### 5) 빌드 실행

같은 소스를 Make, CMake의 Unix Makefiles generator, Ninja generator, preset으로 빌드하는 명령입니다. `-DCMAKE_TOOLCHAIN_FILE`의 상대 경로는 build 디렉터리에서 먼저, 없으면 source 디렉터리에서 찾습니다([CMAKE_TOOLCHAIN_FILE](https://cmake.org/cmake/help/v3.31/variable/CMAKE_TOOLCHAIN_FILE.html)).

```bash
make

cmake -S . -B build -G "Unix Makefiles" -DCMAKE_TOOLCHAIN_FILE=toolchain-arm-none-eabi.cmake
cmake --build build

cmake -S . -B build-ninja -G Ninja -DCMAKE_TOOLCHAIN_FILE=toolchain-arm-none-eabi.cmake
cmake --build build-ninja

cmake --preset debug-arm
cmake --build --preset debug-arm
```

### 6) CMake preset

프로젝트 루트의 `CMakePresets.json`에 configure preset과 build preset을 짝지어 둡니다. `cmake --build --preset`은 `buildPresets`에 있는 이름을 받고, build 디렉터리는 연결된 configure preset의 `binaryDir`에서 가져옵니다([cmake-presets(7)](https://cmake.org/cmake/help/v3.31/manual/cmake-presets.7.html)).

```json
{
    "version": 3,
    "configurePresets": [
        {
            "name": "debug-arm",
            "generator": "Ninja",
            "binaryDir": "${sourceDir}/build/debug-arm",
            "toolchainFile": "${sourceDir}/toolchain-arm-none-eabi.cmake",
            "cacheVariables": {
                "CMAKE_BUILD_TYPE": "Debug"
            }
        },
        {
            "name": "release-arm",
            "inherits": "debug-arm",
            "binaryDir": "${sourceDir}/build/release-arm",
            "cacheVariables": {
                "CMAKE_BUILD_TYPE": "MinSizeRel"
            }
        }
    ],
    "buildPresets": [
        { "name": "debug-arm", "configurePreset": "debug-arm" },
        { "name": "release-arm", "configurePreset": "release-arm" }
    ]
}
```

`toolchainFile` 필드는 preset 파일 version 3 이상에서만 쓸 수 있고, version 3은 CMake 3.21에서 추가됐습니다(같은 문서). `CMakeLists.txt`의 `cmake_minimum_required(VERSION 3.21)`은 이 요구에 맞춘 값입니다.

## 코드 / 실제 사용 예

### 두 family를 한 CMakeLists로

STM32Cube 패키지는 HAL 드라이버와 CMSIS device 헤더를 family별 디렉터리에 둡니다. [STM32CubeF4 v1.28.3](https://github.com/STMicroelectronics/STM32CubeF4/blob/v1.28.3/.gitmodules)과 [STM32CubeH7 v1.13.0](https://github.com/STMicroelectronics/STM32CubeH7/blob/v1.13.0/.gitmodules)에서 `Drivers/STM32F4xx_HAL_Driver`·`Drivers/CMSIS/Device/ST/STM32F4xx`(H7은 `H7xx`)는 git submodule이므로 `git clone --recursive`로 받아야 내용이 채워집니다. 경로가 family 글자만 다르므로 캐시 변수에는 `F4`·`H7`만 넣고 경로는 `STM32${MCU_FAMILY}xx`로 조립합니다.

아래 블록은 CMakeLists.txt 작성 절의 `set(MCU_FLAGS ...)`·`set(LD_SCRIPT ...)` 두 줄을 대신하고, `include`·`definition`·HAL 소스는 `add_executable()` 뒤에 붙입니다. CPU 옵션이 `MCU_FLAGS` 한 곳에만 있으므로 F4 값과 H7 값이 섞이지 않습니다.

```cmake
set(MCU_FAMILY "F4" CACHE STRING "STM32 family: F4 or H7")

if(MCU_FAMILY STREQUAL "F4")
    set(MCU_FLAGS -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard)
    set(MCU_DEVICE STM32F429xx)
    set(LD_SCRIPT ${CMAKE_SOURCE_DIR}/ld/stm32f4.ld)
elseif(MCU_FAMILY STREQUAL "H7")
    set(MCU_FLAGS -mcpu=cortex-m7 -mthumb -mfpu=fpv5-d16 -mfloat-abi=hard)
    set(MCU_DEVICE STM32H743xx)
    set(LD_SCRIPT ${CMAKE_SOURCE_DIR}/ld/stm32h7.ld)
else()
    message(FATAL_ERROR "Unsupported MCU_FAMILY: ${MCU_FAMILY}")
endif()

set(HAL_DIR ${CMAKE_SOURCE_DIR}/Drivers/STM32${MCU_FAMILY}xx_HAL_Driver)
file(GLOB HAL_SRCS ${HAL_DIR}/Src/*.c)
list(FILTER HAL_SRCS EXCLUDE REGEX "_template\\.c$")
```

```cmake
target_sources(${CMAKE_PROJECT_NAME}.elf PRIVATE ${HAL_SRCS})

target_compile_definitions(${CMAKE_PROJECT_NAME}.elf PRIVATE
    ${MCU_DEVICE}
    USE_HAL_DRIVER
)

target_include_directories(${CMAKE_PROJECT_NAME}.elf PRIVATE
    inc
    ${HAL_DIR}/Inc
    Drivers/CMSIS/Device/ST/STM32${MCU_FAMILY}xx/Include
    Drivers/CMSIS/Include
)
```

각 줄이 필요한 이유는 HAL 헤더의 include 사슬에 있습니다.

- `stm32f4xx_hal_def.h`는 `stm32f4xx.h`를 include하고([stm32f4xx_hal_driver v1.8.5](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Inc/stm32f4xx_hal_def.h#L29)), 이 파일은 CMSIS device 디렉터리에 있습니다. 그래서 `Drivers/CMSIS/Device/ST/STM32${MCU_FAMILY}xx/Include`가 include 경로에 있어야 합니다.
- `stm32f4xx.h`는 `STM32F429xx` 같은 device 매크로가 없으면 `#error`로 멈추고, `USE_HAL_DRIVER`가 정의돼 있을 때만 `stm32f4xx_hal.h`를 include합니다([stm32f4xx.h L174·L286](https://github.com/STMicroelectronics/cmsis_device_f4/blob/3c77349ce04c8af401454cc51f85ea9a50e34fc1/Include/stm32f4xx.h#L174), STM32CubeF4 v1.28.3이 가리키는 커밋). H7 쪽 [stm32h7xx.h](https://github.com/STMicroelectronics/cmsis_device_h7/blob/v1.10.7/Include/stm32h7xx.h#L166)도 같은 구조입니다. ST의 [NUCLEO-H743ZI 템플릿](https://github.com/STMicroelectronics/STM32CubeH7/blob/v1.13.0/Projects/NUCLEO-H743ZI/Templates/STM32CubeIDE/.cproject)도 `STM32H743xx`와 `USE_HAL_DRIVER`를 compiler 정의로 넘깁니다.
- `stm32f4xx_hal.h`는 사용자가 만드는 `stm32f4xx_hal_conf.h`를 include합니다([stm32f4xx_hal.h L29](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Inc/stm32f4xx_hal.h#L29)). HAL 드라이버의 `Inc/stm32f4xx_hal_conf_template.h`를 `inc/stm32f4xx_hal_conf.h`로 복사해 쓰는 것이 `inc`를 경로에 넣은 이유입니다.
- `Src/`에는 `_template.c` 파일이 함께 들어 있고, 그중 timebase 템플릿 세 개(`..._timebase_tim_template.c`, `..._rtc_alarm_template.c`, `..._rtc_wakeup_template.c`)는 `stm32f4xx_hal.c`의 `__weak HAL_InitTick()`을 대신하는 강한 정의를 각각 갖습니다([stm32f4xx_hal.c L253](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Src/stm32f4xx_hal.c#L253), [timebase_tim_template.c L54](https://github.com/STMicroelectronics/stm32f4xx_hal_driver/blob/v1.8.5/Src/stm32f4xx_hal_timebase_tim_template.c#L54)). `Src/*.c`를 그대로 넣으면 `HAL_InitTick`이 세 번 정의되므로 `list(FILTER)`로 템플릿을 뺍니다. H7 HAL v1.11.6에도 같은 역할의 timebase 템플릿 세 개가 `HAL_InitTick()`을 강하게 정의합니다.

FPU 옵션과 device 매크로는 ST가 같은 패키지에 넣은 STM32CubeIDE 템플릿을 따랐습니다. [STM32F429I-Discovery 템플릿](https://github.com/STMicroelectronics/STM32CubeF4/blob/v1.28.3/Projects/STM32F429I-Discovery/Templates/STM32CubeIDE/.cproject)은 `fpv4-sp-d16`·hard와 `STM32F429xx`, NUCLEO-H743ZI 템플릿은 `fpv5-d16`·hard입니다. device 헤더 [stm32f429xx.h](https://github.com/STMicroelectronics/cmsis_device_f4/blob/3c77349ce04c8af401454cc51f85ea9a50e34fc1/Include/stm32f429xx.h)는 `core_cm4.h`를, [stm32h743xx.h](https://github.com/STMicroelectronics/cmsis_device_h7/blob/v1.10.7/Include/stm32h743xx.h)는 `core_cm7.h`를 include하므로 `-mcpu`가 각각 `cortex-m4`·`cortex-m7`입니다.

### CI 빌드

toolchain 릴리스를 URL로 고정하면 로컬과 CI가 같은 compiler를 씁니다. 아래 URL은 Arm GNU Toolchain 14.2.rel1의 x86_64 Linux 호스트용 `arm-none-eabi` 배포본입니다. `$GITHUB_PATH`에 쓴 디렉터리는 이후 단계의 `PATH` 앞에 붙습니다([workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)). CMake와 Ninja는 설치하지 않았습니다. runner-images 저장소의 [ubuntu24/20261004.327 판 목록](https://github.com/actions/runner-images/blob/ubuntu24/20261004.327/images/ubuntu/Ubuntu2404-Readme.md)에 CMake 3.31.6과 Ninja 1.13.2가 들어 있어 preset version 3의 요구(3.21 이상)를 만족합니다.

```yaml
# .github/workflows/build.yml
on: [push, pull_request]

jobs:
    build:
        runs-on: ubuntu-24.04
        steps:
            - uses: actions/checkout@v4
              with:
                  submodules: recursive
            - name: Install toolchain
              run: |
                  wget -q https://developer.arm.com/-/media/Files/downloads/gnu/14.2.rel1/binrel/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi.tar.xz
                  tar xf arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi.tar.xz
                  echo "$PWD/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi/bin" >> $GITHUB_PATH
            - name: Configure
              run: cmake --preset release-arm
            - name: Build
              run: cmake --build --preset release-arm
```

`on`은 workflow를 실행할 이벤트이고([workflow syntax, `on`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#on)), `submodules: recursive`는 Drivers를 submodule로 둔 프로젝트에서 HAL·CMSIS 디렉터리를 채웁니다([actions/checkout v4](https://github.com/actions/checkout/blob/v4/action.yml)). `POST_BUILD` 명령이 `arm-none-eabi-size`를 실행하므로 크기는 Build 단계 로그에 남습니다.

## Make와 CMake 비교

| 구성 | toolchain 지정 | 헤더 의존성 | 필요한 도구 |
| --- | --- | --- | --- |
| 손으로 쓴 Makefile | `CROSS` 접두어 변수 | `-MMD -MP`로 만든 `.d`를 `-include` | make |
| CMake + Unix Makefiles | toolchain file | CMake가 자동 처리 | cmake, make |
| CMake + Ninja | toolchain file | CMake가 자동 처리 | cmake, ninja |

헤더 의존성 열의 CMake 쪽은 [OBJECT_DEPENDS](https://cmake.org/cmake/help/v3.31/prop_sf/OBJECT_DEPENDS.html) 문서의 "automatic dependency scanning" 설명을 따릅니다. Makefile 쪽은 같은 일을 `DEPFLAGS` 두 옵션과 `-include` 한 줄로 직접 합니다.

## 자주 보는 함정

> ⚠️ configure가 "is not able to compile a simple test program"으로 멈춤

CMake가 compiler 검사에 실패하면 `The C compiler ... is not able to compile a simple test program.` 메시지 뒤에 compiler 출력을 붙여 configure를 멈춥니다([CMakeTestCCompiler.cmake L67-70, v3.31.0](https://github.com/Kitware/CMake/blob/v3.31.0/Modules/CMakeTestCCompiler.cmake#L67-L70)). 붙은 출력이 링크 단계 오류라면 toolchain file에 `CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY`가 빠진 경우입니다(CMake toolchain file 절).

> ⚠️ `-mcpu`·`-mfpu`·`-mfloat-abi`가 CFLAGS에만 있고 LDFLAGS에 없음

GCC 문서는 hard-float ABI와 soft-float ABI가 링크 호환이 아니며, 프로그램 전체를 같은 ABI로 컴파일하고 호환되는 라이브러리와 링크해야 한다고 적습니다([GCC 14.2 ARM Options, `-mfloat-abi`](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/ARM-Options.html)). gcc 드라이버는 명령줄의 다른 옵션으로 multilib을 고르고([`-print-multi-directory`](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Developer-Options.html)), GCC의 `rmprofile` multilib 구성은 `march=armv7e-m+fp/mfloat-abi=hard`와 `march=armv7e-m+fp.dp/mfloat-abi=hard` 라이브러리를 soft-float 판과 따로 빌드합니다([t-rmprofile, GCC 14.2.0](https://github.com/gcc-mirror/gcc/blob/releases/gcc-14.2.0/gcc/config/arm/t-rmprofile)). 링크 명령에 FPU·ABI 옵션이 없으면 드라이버는 hard-float 판을 고를 근거가 없습니다. 이때 부동소수점을 쓰는 두 오브젝트의 `Tag_ABI_VFP_args` 속성이 다르면 GNU ld는 `error: X uses VFP register arguments, Y does not`를 내고 링크를 실패시킵니다([bfd/elf32-arm.c, binutils 2.43](https://sourceware.org/git/?p=binutils-gdb.git;a=blob;f=bfd/elf32-arm.c;hb=refs/tags/binutils-2_43)). Makefile 절이 `LDFLAGS`에 `CFLAGS`를 다시 넣고, CMakeLists.txt 작성 절이 `MCU_FLAGS`를 `add_link_options()`에도 넣은 이유입니다.

> ⚠️ 생성 헤더가 다시 만들어지지 않음

`add_custom_command(OUTPUT ...)`로 만드는 헤더는 그 출력을 쓰는 target과 같은 target에서 생성되면 CMake의 자동 의존성 스캔이 잡습니다. 다른 target이 만드는 헤더라면 `add_dependencies()`로 target 간 의존을 겁니다. `OBJECT_DEPENDS`는 원래 이 용도로 생겼지만 이제는 필요 없다고 문서가 밝힙니다([OBJECT_DEPENDS](https://cmake.org/cmake/help/v3.31/prop_sf/OBJECT_DEPENDS.html)).

## 정리

- CPU·FPU 옵션은 toolchain file이 아니라 `CMakeLists.txt`의 목록 변수 하나에 두고, 컴파일과 링크 양쪽에 넘깁니다.
- `find_*`로 target 라이브러리를 찾을 때만 `CMAKE_FIND_ROOT_PATH`를 주고, compiler의 `--sysroot`까지 바꿔야 할 때만 `CMAKE_SYSROOT`를 씁니다.
- 최적화 수준은 `CMAKE_BUILD_TYPE`(preset)에 맡겨 Debug와 MinSizeRel이 서로 다른 플래그를 받게 합니다.
- STM32Cube HAL을 GLOB할 때는 `_template.c`를 거릅니다.

다음 편에서는 **Bootloader 체인**을 다룹니다. Cortex-A가 BootROM에서 SPL·U-Boot를 거쳐 커널까지 올라가는 단계입니다.

## 관련 항목

- [3-01: 크로스 컴파일러](/blog/embedded/modern-recipes/part3-01-cross-compiler)
- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-09: 컴파일러 최적화](/blog/embedded/modern-recipes/part3-09-compiler-optimization)
- [3-12: Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
