---
title: "3-01: 크로스 컴파일러"
date: 2026-05-12T23:00:00
description: "arm-none-eabi-gcc/clang — 호스트와 타겟이 다른 컴파일러 체인."
series: "Modern Embedded Recipes"
seriesOrder: 23
tags: [recipes, toolchain, cross-compile]
draft: false
---

## 한 줄 요약

> **"크로스 컴파일러는 한 architecture에서 다른 architecture용 코드를 만드는 도구입니다."** x86 PC에서 ARM 펌웨어를 빌드할 수 있게 해 줍니다.

## 어떤 상황에서 쓰나

- 새 ARM 보드에 펌웨어를 올려야 할 때
- CI 빌드 서버에서 임베디드 타겟 빌드
- bare-metal과 Linux 두 환경 모두 지원
- 여러 코어/CPU 변형용 multi-arch 빌드

## 핵심 개념

### 1) Triplet

크로스 컴파일러 이름은 보통 `<arch>-<vendor>-<os>-<abi>` 형식입니다.

| Triplet | 의미 | 용도 |
| --- | --- | --- |
| `arm-none-eabi` | ARM, no vendor, bare-metal | Cortex-M 펌웨어 |
| `arm-linux-gnueabihf` | ARM Linux, glibc, hard-float | Linux userspace |
| `aarch64-none-elf` | ARMv8 64-bit, bare-metal | 64-bit 펌웨어 |
| `aarch64-linux-gnu` | ARMv8 Linux | 64-bit Linux |
| `riscv32-unknown-elf` | RISC-V 32-bit, bare-metal | RISC-V MCU |
| `xtensa-esp32-elf` | Xtensa ESP32 | ESP-IDF |

### 2) 구성 요소

크로스 컴파일러는 단일 binary가 아니라 세트입니다.

| Tool | 역할 |
|------|------|
| `arm-none-eabi-gcc` | C 컴파일러 driver |
| `arm-none-eabi-g++` | C++ 컴파일러 driver |
| `arm-none-eabi-as` | assembler |
| `arm-none-eabi-ld` | linker |
| `arm-none-eabi-objcopy` | ELF → bin/hex 변환 |
| `arm-none-eabi-objdump` | 디스어셈블, section dump |
| `arm-none-eabi-nm` | symbol list |
| `arm-none-eabi-size` | section size |
| `arm-none-eabi-gdb` | debugger |
| `arm-none-eabi-newlib` | C library |

이들은 모두 host(x86)에서 실행되지만, 출력은 target(ARM)용입니다.

### 3) C library 선택

bare-metal에서 어떤 libc를 쓸지 결정해야 합니다.

| libc | 크기 | 기능 | 특징 |
| --- | --- | --- | --- |
| newlib | 보통 | full POSIX-like | gnu-arm 기본 |
| newlib-nano | 작음 | basic | `printf` float 옵션 |
| picolibc | 매우 작음 | C99 + 일부 POSIX | newlib-nano 후속 |
| musl | 중간 | full | Linux용 (정적 링크 좋음) |
| glibc | 매우 큼 | full POSIX | Linux 표준 |

MCU에서는 보통 newlib-nano 또는 picolibc를 씁니다. `printf` float 지원은 따로 활성화합니다.

```bash
# newlib-nano + float printf
arm-none-eabi-gcc --specs=nano.specs \
    -u _printf_float main.c
```

### 4) Multilib

같은 컴파일러로 여러 ABI 변형을 지원합니다. `arm-none-eabi-gcc --print-multi-lib`로 확인.

```text
.;
thumb;@mthumb
thumb/v6-m/nofp;@mthumb@march=armv6s-m@mfloat-abi=soft
thumb/v7-m/nofp;@mthumb@march=armv7-m@mfloat-abi=soft
thumb/v7e-m/fpv4-sp/softfp;@mthumb@march=armv7e-m@mfpu=fpv4-sp-d16@mfloat-abi=softfp
thumb/v7e-m/fpv4-sp/hard;@mthumb@march=armv7e-m@mfpu=fpv4-sp-d16@mfloat-abi=hard
...
```

컴파일러 옵션(예: `-mcpu=cortex-m4 -mfpu=fpv4-sp-d16 -mfloat-abi=hard`)에 맞는 변형의 libc가 자동 링크됩니다.

### 5) Sysroot

Linux 크로스 컴파일에서 target의 root filesystem 일부를 host에 두는 것을 sysroot라고 합니다.

```text
sysroot/
├── usr/include/    # target header
├── usr/lib/        # target library
└── lib/
```

```bash
arm-linux-gnueabihf-gcc \
    --sysroot=/opt/sysroot/buildroot-2024 \
    main.c -lpthread
```

bare-metal에서는 sysroot 대신 newlib가 자동 들어옵니다.

## 코드 / 실제 사용 예

ARM GNU Toolchain 설치 후 첫 빌드입니다.

```bash
# macOS
brew install arm-none-eabi-gcc

# Ubuntu
sudo apt install gcc-arm-none-eabi

# Linux 일반 (ARM 공식)
wget https://developer.arm.com/-/media/Files/downloads/.../arm-gnu-toolchain.tar.xz
tar xf arm-gnu-toolchain.tar.xz
export PATH=$PWD/arm-gnu-toolchain/bin:$PATH

# 버전 확인
arm-none-eabi-gcc --version
# arm-none-eabi-gcc (Arm GNU Toolchain 13.3.Rel1) 13.3.1
```

기본 hello.c 빌드:

```bash
# 컴파일
arm-none-eabi-gcc \
    -mcpu=cortex-m4 -mthumb \
    -mfpu=fpv4-sp-d16 -mfloat-abi=hard \
    --specs=nosys.specs \
    -T linker.ld \
    -nostartfiles \
    startup.s main.c \
    -o app.elf

# bin 추출
arm-none-eabi-objcopy -O binary app.elf app.bin

# size
arm-none-eabi-size app.elf
#    text    data     bss     dec     hex filename
#    1248      16      32    1296     510 app.elf
```

CMake toolchain file:

```cmake
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER arm-none-eabi-gcc)
set(CMAKE_CXX_COMPILER arm-none-eabi-g++)
set(CMAKE_ASM_COMPILER arm-none-eabi-gcc)
set(CMAKE_OBJCOPY arm-none-eabi-objcopy)
set(CMAKE_SIZE arm-none-eabi-size)

set(CMAKE_C_FLAGS_INIT "-mcpu=cortex-m4 -mthumb")
set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)
```

## 측정 / 비교

| Toolchain | 다운로드 크기 | 설치 후 |
| --- | --- | --- |
| ARM GNU Toolchain | 500 MB | 1.5 GB |
| LLVM Embedded | 200 MB | 800 MB |
| ARM Compiler 6 (상업) | 100 MB | 400 MB |
| Zephyr SDK (multi-arch) | 1.5 GB | 4 GB |

| libc | hello-world flash 크기 |
| --- | --- |
| newlib (full) | 28 KB |
| newlib-nano | 4 KB |
| picolibc | 2 KB |
| 없음 (bare) | < 1 KB |

## 자주 보는 함정

> ⚠️ 호스트용 gcc로 ARM 빌드 시도

`gcc main.c -mcpu=cortex-m4`는 x86 binary를 만듭니다. host gcc는 ARM 명령을 모릅니다. 반드시 `arm-none-eabi-gcc` 사용.

> ⚠️ FPU flag mismatch

application은 hard-float, libc는 soft-float이면 linker error 또는 runtime crash. 모든 object와 libc가 같은 FPU ABI여야 합니다.

> ⚠️ Library search path 누락

bare-metal에서 `--specs=nosys.specs` 없이 빌드하면 `_sbrk`, `_write` 등 시스템 호출 stub이 없어 link 실패.

> ⚠️ ABI 호환성 무시

Cortex-M4와 M7은 같은 v7E-M이지만 FPU 옵션이 다르면 ABI 충돌. 한 binary가 두 코어에 다 동작하려면 가장 보수적인 옵션 사용.

> ⚠️ 옛 4.x 컴파일러 사용

ARM GNU 4.x는 C++14 일부, C++17은 없습니다. 최신 13+를 권장합니다.

## 정리

- 크로스 컴파일러는 triplet으로 식별합니다 (`arm-none-eabi`, `aarch64-linux-gnu` 등).
- gcc, ld, objcopy 등 도구 세트로 구성됩니다.
- bare-metal에는 newlib(-nano) 또는 picolibc, Linux에는 glibc 또는 musl을 씁니다.
- multilib로 같은 컴파일러가 여러 ABI 변형을 지원합니다.
- FPU flag mismatch, 호스트 gcc 사용, libc spec 누락이 흔한 빌드 실패 원인입니다.

다음 편에서는 **컴파일 4단계**를 다룹니다. preprocess, compile, assemble, link를 분리해 봅니다.

## 관련 항목

- [3-02: 컴파일 4단계](/blog/embedded/modern-recipes/part3-02-compile-pipeline)
- [3-06: 스타트업 코드 분석](/blog/embedded/modern-recipes/part3-06-startup-code)
- [3-11: Make와 CMake (cross-compile)](/blog/embedded/modern-recipes/part3-11-make-cmake-cross)
- 더 깊이 — [Embedded C++ for Real Systems: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags)
