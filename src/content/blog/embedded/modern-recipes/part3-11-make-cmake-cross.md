---
title: "3-11: Make와 CMake (cross-compile)"
date: 2026-05-13T09:00:00
description: "Embedded 빌드 시스템 — toolchain file·target_link_options."
series: "Modern Embedded Recipes"
seriesOrder: 33
tags: [recipes, build, cmake]
draft: false
---

## 한 줄 요약

> **"임베디드 빌드 시스템의 핵심은 toolchain 분리입니다."** CMake toolchain file 또는 Makefile 변수로 host와 target을 깔끔히 나눕니다.

## 어떤 상황에서 쓰나

- 새 chip이나 보드를 위한 빌드 환경 구축
- 같은 코드를 두 chip(예: STM32F4와 H7)에 빌드
- CI 서버에서 자동 빌드와 테스트
- ESP-IDF, Zephyr, STM32CubeIDE와 통합

## 핵심 개념

### 1) Make로 단순 빌드

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

LDFLAGS   = $(CFLAGS) \
            -T linker.ld \
            -Wl,--gc-sections \
            -Wl,-Map=$(TARGET).map \
            --specs=nano.specs

SRCS = $(wildcard src/*.c) startup.s
OBJS = $(SRCS:%.c=build/%.o)
OBJS := $(OBJS:%.s=build/%.o)

all: $(TARGET).bin $(TARGET).elf
	$(SIZE) $(TARGET).elf

$(TARGET).elf: $(OBJS)
	$(LD) $(LDFLAGS) $(OBJS) -o $@

$(TARGET).bin: $(TARGET).elf
	$(OBJCOPY) -O binary $< $@

build/%.o: %.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

build/%.o: %.s
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -rf build $(TARGET).elf $(TARGET).bin $(TARGET).map

.PHONY: all clean
```

작은 프로젝트에는 충분합니다.

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

set(CMAKE_C_FLAGS_INIT "-mcpu=cortex-m4 -mthumb")
set(CMAKE_CXX_FLAGS_INIT "-mcpu=cortex-m4 -mthumb")

# CMake가 host compiler test를 시도하지 않게 함
set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)

# Cross-compile 시 search path 제한
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
```

`CMAKE_SYSTEM_NAME Generic`이 bare-metal의 signal입니다.

### 3) CMakeLists.txt 작성

```cmake
cmake_minimum_required(VERSION 3.20)
project(myapp LANGUAGES C CXX ASM)

# 컴파일 옵션
add_compile_options(
    -Wall -Wextra
    -Os -g3
    -ffunction-sections -fdata-sections
    -mcpu=cortex-m4 -mthumb
    -mfpu=fpv4-sp-d16 -mfloat-abi=hard
)

add_link_options(
    -mcpu=cortex-m4 -mthumb
    -mfpu=fpv4-sp-d16 -mfloat-abi=hard
    -T ${CMAKE_SOURCE_DIR}/linker.ld
    -Wl,--gc-sections
    -Wl,-Map=${CMAKE_PROJECT_NAME}.map
    --specs=nano.specs
)

# Source 파일
file(GLOB SRCS src/*.c)

# Executable
add_executable(${CMAKE_PROJECT_NAME}.elf
    ${SRCS}
    startup.s
)

# bin 변환과 size 출력
add_custom_command(TARGET ${CMAKE_PROJECT_NAME}.elf POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:${CMAKE_PROJECT_NAME}.elf>
            ${CMAKE_PROJECT_NAME}.bin
    COMMAND ${CMAKE_SIZE} $<TARGET_FILE:${CMAKE_PROJECT_NAME}.elf>
)
```

### 4) 빌드 실행

```bash
# Make는 직접 호출
make

# CMake는 두 단계
mkdir build && cd build
cmake -DCMAKE_TOOLCHAIN_FILE=../toolchain-arm-none-eabi.cmake ..
cmake --build .

# Ninja generator (빠른 빌드)
cmake -G Ninja -DCMAKE_TOOLCHAIN_FILE=../toolchain.cmake ..
ninja

# Preset 사용 (CMake 3.19+)
cmake --preset=debug-arm
cmake --build --preset=debug-arm
```

### 5) CMake preset

```json
// CMakePresets.json
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
                "CMAKE_BUILD_TYPE": "Release"
            }
        }
    ]
}
```

team이나 CI에서 빌드 환경을 통일하는 데 편합니다.

## 코드 / 실제 사용 예

STM32CubeMX가 생성한 Makefile을 CMake로 마이그레이션할 때 흔한 구조:

```cmake
# 다양한 chip 지원
set(MCU_TARGET "STM32F4" CACHE STRING "Target MCU")

if(MCU_TARGET STREQUAL "STM32F4")
    set(MCU_FLAGS "-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard")
    set(LD_SCRIPT "${CMAKE_SOURCE_DIR}/ld/stm32f4.ld")
elseif(MCU_TARGET STREQUAL "STM32H7")
    set(MCU_FLAGS "-mcpu=cortex-m7 -mthumb -mfpu=fpv5-d16 -mfloat-abi=hard")
    set(LD_SCRIPT "${CMAKE_SOURCE_DIR}/ld/stm32h7.ld")
endif()

add_compile_options(${MCU_FLAGS})
add_link_options(${MCU_FLAGS} -T ${LD_SCRIPT})

target_include_directories(${CMAKE_PROJECT_NAME}.elf PRIVATE
    inc
    Drivers/STM32${MCU_TARGET}_HAL_Driver/Inc
    Drivers/CMSIS/Include
)
```

CI 빌드 예:

```yaml
# .github/workflows/build.yml
jobs:
    build:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - name: Install toolchain
              run: |
                  wget https://.../arm-gnu-toolchain.tar.xz
                  tar xf arm-gnu-toolchain.tar.xz
                  echo "$PWD/arm-gnu-toolchain/bin" >> $GITHUB_PATH
            - name: Configure
              run: cmake --preset=release-arm
            - name: Build
              run: cmake --build --preset=release-arm
            - name: Size check
              run: arm-none-eabi-size build/release-arm/*.elf
```

## 측정 / 비교

| 빌드 시스템 | 장점 | 단점 |
| --- | --- | --- |
| Make | 단순, 어디서나 | 큰 프로젝트에서 변수 관리 어려움 |
| CMake + Make | 표준 generator | 빌드 자체는 make 느림 |
| CMake + Ninja | 빠른 빌드 | ninja 설치 필요 |
| Meson | 명확한 syntax | 생태계 작음 |
| Bazel | reproducible | 학습 곡선 |
| ESP-IDF | ESP 전용 통합 | 다른 chip 불가 |
| West (Zephyr) | multi-repo 관리 | Zephyr 전용 |

| 빌드 시간 (50 파일 임베디드 프로젝트) |
| --- |
| Make (단일 thread) | 25 s |
| Make -j8 | 8 s |
| Ninja | 6 s |
| Bazel (cached) | 1 s |

## 자주 보는 함정

> ⚠️ Host compiler test 시 fail

CMake가 cross-compile임을 모르면 host gcc로 test 빌드를 시도. `CMAKE_SYSTEM_NAME Generic`과 `CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY` 필수.

> ⚠️ Linker script가 build 결과에 link 안 됨

`add_link_options(-T linker.ld)` 또는 `target_link_options(target PRIVATE -T linker.ld)`로 명시. 경로는 절대 경로 권장.

> ⚠️ Makefile에서 `-mcpu`만 CFLAGS에 있고 LDFLAGS에 없음

`-mcpu`, `-mfpu`, `-mfloat-abi`는 link 시에도 필요. libc 선택과 ABI 검사에 사용됩니다.

> ⚠️ Generated header가 dependency 추적 안 됨

CMake `add_custom_command`으로 만드는 header는 의존성을 명시해야 재빌드. `DEPENDS`나 `OBJECT_DEPENDS`.

> ⚠️ CI 빌드에서 toolchain 버전 불일치

GCC 버전에 따라 코드 크기가 다릅니다. CI에서 toolchain 버전을 고정.

## 정리

- Make는 단순 프로젝트, CMake는 multi-target/복잡 프로젝트에 적합합니다.
- CMake toolchain file로 host와 target compiler를 분리합니다.
- `CMAKE_SYSTEM_NAME Generic`이 bare-metal의 signal입니다.
- Preset과 Ninja generator로 빌드 환경 통일과 속도를 얻습니다.
- LDFLAGS에 `-mcpu`, `-mfpu`, `-mfloat-abi`를 빼먹는 게 가장 흔한 실수입니다.
- ESP-IDF, Zephyr 같은 환경은 자체 빌드 시스템을 갖고 있어 그 위에서 작업합니다.

다음 편에서는 **Bootloader 체인**을 다룹니다. Cortex-A의 부팅 단계입니다.

## 관련 항목

- [3-01: 크로스 컴파일러](/blog/embedded/modern-recipes/part3-01-cross-compiler)
- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-09: 컴파일러 최적화](/blog/embedded/modern-recipes/part3-09-compiler-optimization)
- [3-12: Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
