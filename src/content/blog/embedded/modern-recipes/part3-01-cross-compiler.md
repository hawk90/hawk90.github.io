---
title: "임베디드 크로스 컴파일러 분석 — GCC·Clang·Sysroot 구성"
slug: "embedded/modern-recipes/part3-01-cross-compiler"
date: 2026-04-12T09:23:00
description: "arm-none-eabi-gcc/clang — 호스트와 타겟이 다른 컴파일러 체인."
series: "Modern Embedded Recipes"
seriesOrder: 23
tags: [recipes, toolchain, cross-compile]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"크로스 컴파일러는 한 architecture에서 다른 architecture용 코드를 만드는 도구 세트입니다."** 이름의 triplet이 target과 C library 계열을 말해 주고, 같은 `printf` 한 줄도 어떤 libc를 고르느냐에 따라 flash 크기가 몇 배 달라집니다.

## 어떤 상황에서 쓰나

- 새 ARM 보드에 펌웨어를 올려야 할 때
- CI 빌드 서버에서 임베디드 타겟 빌드
- bare-metal과 Linux 두 환경 모두 지원
- 여러 코어/CPU 변형용 multi-arch 빌드

이 글의 출력은 Debian 13 arm64 guest(QEMU 11.1.3 `virt`, HVF)에 Debian 패키지 `gcc-arm-none-eabi` 14.2.rel1-1(GCC 14.2.1), `libnewlib-arm-none-eabi` 4.5.0, `picolibc-arm-none-eabi` 1.8.10, `gcc-arm-linux-gnueabihf`(GCC 14.2.0)를 설치해 직접 돌린 결과입니다. host가 arm64라 "x86에서 ARM용"이 아니라 "AArch64 Linux에서 Cortex-M·32-bit ARM용"을 빌드했지만, 크로스 컴파일의 구조는 같습니다.

## 핵심 개념

### 1) Triplet

크로스 컴파일러 이름 앞부분은 target triplet입니다. 대개 `<arch>-<vendor>-<os>-<abi>` 꼴이고 vendor는 빠지기도 합니다. 각 컴파일러에 `-dumpmachine`을 물으면 자기 triplet을 답합니다.

```text
$ arm-none-eabi-gcc -dumpmachine
arm-none-eabi
$ arm-linux-gnueabihf-gcc -dumpmachine
arm-linux-gnueabihf
$ gcc -dumpmachine
aarch64-linux-gnu
```

| Triplet | 의미 | 용도 | Debian 13 패키지 |
| --- | --- | --- | --- |
| `arm-none-eabi` | ARM, OS 없음, EABI | Cortex-M/R 펌웨어 | `gcc-arm-none-eabi` |
| `arm-linux-gnueabihf` | ARM Linux, glibc, hard-float EABI | 32-bit ARM Linux userspace | `gcc-arm-linux-gnueabihf` |
| `aarch64-linux-gnu` | AArch64 Linux, glibc | 64-bit ARM Linux | `gcc-aarch64-linux-gnu` |
| `riscv64-unknown-elf` | RISC-V, vendor unknown, bare-metal ELF | RISC-V MCU·펌웨어 | `gcc-riscv64-unknown-elf` |

### 2) 구성 요소

크로스 컴파일러는 단일 binary가 아니라 세트입니다. Debian의 `gcc-arm-none-eabi`와 `binutils-arm-none-eabi`를 설치하면 `/usr/bin`에 다음이 생깁니다.

```text
arm-none-eabi-addr2line arm-none-eabi-ar arm-none-eabi-as arm-none-eabi-c++ arm-none-eabi-c++filt
arm-none-eabi-cpp arm-none-eabi-elfedit arm-none-eabi-g++ arm-none-eabi-gcc arm-none-eabi-gcc-14.2.1
arm-none-eabi-gcc-ar arm-none-eabi-gcc-nm arm-none-eabi-gcc-ranlib arm-none-eabi-gcov arm-none-eabi-gcov-dump
arm-none-eabi-gcov-tool arm-none-eabi-gprof arm-none-eabi-ld arm-none-eabi-ld.bfd arm-none-eabi-lto-dump
arm-none-eabi-nm arm-none-eabi-objcopy arm-none-eabi-objdump arm-none-eabi-ranlib arm-none-eabi-readelf
arm-none-eabi-size arm-none-eabi-strings arm-none-eabi-strip
```

| Tool | 역할 |
|------|------|
| `arm-none-eabi-gcc` / `-g++` | C/C++ 컴파일러 driver (cpp·cc1·as·ld를 차례로 부름) |
| `arm-none-eabi-as` / `-ld` | assembler / linker |
| `arm-none-eabi-objcopy` | ELF → bin/hex 변환 |
| `arm-none-eabi-objdump` / `-readelf` | 디스어셈블, section·header dump |
| `arm-none-eabi-nm` / `-size` | symbol list / section 크기 |

C library는 실행 파일이 아니라 따로 설치하는 라이브러리입니다. Debian에서는 `libnewlib-arm-none-eabi`, `picolibc-arm-none-eabi`가 각각 newlib과 picolibc를 넣습니다. debugger도 이 세트에 없고, Debian은 `gdb-multiarch` 같은 별도 패키지로 제공합니다. 반대로 Homebrew의 `arm-none-eabi-gcc`(이 Mac에서 쓴 16.2.0)는 C library 없이 설치되어, `<stdint.h>`를 include하는 순간 "fatal error: stdint.h: No such file or directory"가 납니다([2-01](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison)에서 `-ffreestanding`으로 우회한 이유).

### 3) C library 선택

bare-metal에서 어떤 libc를 쓸지 결정해야 합니다. 같은 `printf("hello %d\n", 42)` 프로그램을 Cortex-M4 hard-float, `-O2`로 세 가지 libc에 링크해 `arm-none-eabi-size`로 비교했습니다.

| 빌드 | text | data | bss |
| --- | ---: | ---: | ---: |
| newlib (`--specs=nosys.specs`) | 28944 | 1768 | 812 |
| newlib-nano (`--specs=nano.specs --specs=nosys.specs`) | 7532 | 108 | 504 |
| picolibc 1.8.10 (`--specs=picolibc.specs --oslib=semihost`) | 7236 | 80 | 4104 |
| libc 없음 (`-nostdlib`, 무한 루프만) | 24 | 0 | 0 |

`printf("pi %f\n", 3.14159)`로 바꾸면 차이가 더 벌어집니다.

| 빌드 | text |
| --- | ---: |
| newlib | 28936 |
| newlib-nano | 7544 |
| newlib-nano + `-u _printf_float` | 22116 |
| picolibc 1.8.10 | 7244 |

newlib-nano는 기본으로 float 출력 코드를 넣지 않고, `-u _printf_float`로 그 symbol을 강제로 끌어오면 text가 7544에서 22116 byte로 늘어납니다. picolibc 빌드는 `-u` 없이도 거의 같은 크기로 float를 찍었습니다. QEMU `mps2-an386`에서 semihosting으로 돌린 출력입니다.

```text
$ qemu-system-arm -M mps2-an386 -nographic -monitor none -serial none \
    -semihosting-config enable=on,target=native -kernel hf-pico.elf
pi 3.141590
```

(이 picolibc 빌드는 `main`이 끝난 뒤 QEMU를 종료시키지 않아 `timeout 5`로 멈췄습니다.)

```bash
# newlib-nano + float printf
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard -O2 \
    --specs=nano.specs --specs=nosys.specs -u _printf_float hello_float.c -o hf-nano-float.elf
```

newlib을 `nosys.specs`로 링크하면 linker가 `_write`, `_read`, `_close` 같은 system call stub마다 경고를 냅니다.

```text
.../libc.a(libc_a-writer.o): in function `_write_r':
.../newlib/libc/reent/writer.c:49:(.text+0x14): warning: _write is not implemented and will always fail
```

`nosys.specs`는 이름 그대로 "system call이 없다"는 stub을 넣는 것이라, 이 상태의 `printf`는 링크만 되고 출력은 나가지 않습니다. 실제로 UART로 내보내려면 `_write`를 직접 구현하거나, 디버거 콘솔로 보내는 `rdimon.specs`(semihosting)를 고릅니다. Debian 패키지가 제공하는 specs 파일은 `nano.specs`, `nosys.specs`, `rdimon.specs`, `picolibc.specs` 등입니다.

Linux용 libc(glibc·musl)는 OS가 있는 target의 이야기라 MCU에는 쓰지 않습니다.

### 4) Multilib

같은 컴파일러가 여러 ISA·FPU·ABI 변형용 라이브러리를 함께 갖고, 옵션에 맞는 것을 골라 링크합니다. Debian `gcc-arm-none-eabi` 14.2.rel1의 목록은 39줄이고 앞부분은 다음과 같습니다.

```text
$ arm-none-eabi-gcc --print-multi-lib | head -8
.;
arm/v5te/softfp;@marm@march=armv5te+fp@mfloat-abi=softfp
arm/v5te/hard;@marm@march=armv5te+fp@mfloat-abi=hard
thumb/nofp;@mthumb@mfloat-abi=soft
thumb/v7/nofp;@mthumb@march=armv7@mfloat-abi=soft
thumb/v7+fp/softfp;@mthumb@march=armv7+fp@mfloat-abi=softfp
thumb/v7+fp/hard;@mthumb@march=armv7+fp@mfloat-abi=hard
thumb/v7-r+fp.sp/softfp;@mthumb@march=armv7-r+fp.sp@mfloat-abi=softfp
```

옵션을 주고 `--print-multi-directory`를 물으면 실제로 고르는 디렉터리가 나옵니다. 위 newlib 링크 경고의 경로(`.../lib/thumb/v7e-m+fp/hard/libc.a`)가 바로 이 디렉터리입니다.

```text
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard --print-multi-directory
thumb/v7e-m+fp/hard
```

### 5) Sysroot

Linux 크로스 컴파일에서는 target의 header와 library 위치(sysroot)를 컴파일러가 알아야 합니다. Debian의 `arm-linux-gnueabihf-gcc`는 sysroot가 `/`이고 target 라이브러리를 `/usr/arm-linux-gnueabihf` 아래에 둡니다.

```text
$ arm-linux-gnueabihf-gcc -print-sysroot
/
$ arm-linux-gnueabihf-gcc -print-file-name=libc.so
/usr/lib/gcc-cross/arm-linux-gnueabihf/14/../../../../arm-linux-gnueabihf/lib/libc.so
```

Buildroot·Yocto가 만든 sysroot를 쓸 때는 `--sysroot`로 그 트리를 가리킵니다.

```bash
arm-linux-gnueabihf-gcc \
    --sysroot=/opt/sysroot/buildroot-2024 \
    main.c -lpthread
```

같은 hello.c를 이 컴파일러로 빌드하면 32-bit ARM ELF가 나오고, `qemu-arm`(user-mode)에 target 라이브러리 경로를 주면 arm64 host에서 바로 실행됩니다.

```text
$ arm-linux-gnueabihf-gcc -O2 hello.c -o h-linux && file h-linux
h-linux: ELF 32-bit LSB pie executable, ARM, EABI5 version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-armhf.so.3, ...
$ qemu-arm -L /usr/arm-linux-gnueabihf ./h-linux
hello 42
```

## 코드 / 실제 사용 예

Debian/Ubuntu 계열에서는 패키지로 설치합니다.

```bash
sudo apt install gcc-arm-none-eabi libnewlib-arm-none-eabi picolibc-arm-none-eabi
arm-none-eabi-gcc --version
# arm-none-eabi-gcc (15:14.2.rel1-1) 14.2.1 20241119
```

bare-metal 빌드는 CPU·FPU 옵션, specs, linker script를 함께 줍니다. 아래는 picolibc의 기본 linker script에 메모리 위치만 `--defsym`으로 넘긴 예로, 위 표의 `h-pico.elf`를 만든 명령입니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard -O2 \
    --specs=picolibc.specs --oslib=semihost \
    -Wl,--defsym=__flash=0x0,--defsym=__flash_size=0x400000 \
    -Wl,--defsym=__ram=0x20000000,--defsym=__ram_size=0x10000 \
    hello.c -o h-pico.elf
arm-none-eabi-objcopy -O binary h-pico.elf h-pico.bin
arm-none-eabi-size h-pico.elf
```

CMake toolchain file은 같은 정보를 CMake에 넘깁니다. CMake 문서는 `CMAKE_TRY_COMPILE_TARGET_TYPE`의 `STATIC_LIBRARY` 값이 linker를 쓰지 않으며 "intended for use with cross-compiling toolchains that cannot link without custom flags or linker scripts"라고 설명합니다. 그래서 CMake의 컴파일러 확인 단계가 linker script 없이 실행 파일을 링크하려다 실패하지 않습니다. 자세한 사용은 [3-11](/blog/embedded/modern-recipes/part3-11-make-cmake-cross)에서 다룹니다.

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

설치 크기는 Debian 패키지의 `Installed-Size`입니다. 다운로드 크기는 재지 않았습니다.

| 패키지 (Debian 13) | 버전 | Installed-Size |
| --- | --- | ---: |
| `gcc-arm-none-eabi` | 15:14.2.rel1-1 | 515,826 KB |
| `binutils-arm-none-eabi` | 2.44-3+23+b2 | 19,566 KB |
| `libnewlib-arm-none-eabi` | 4.5.0.20241231-1 | 415,958 KB |
| `picolibc-arm-none-eabi` | 1.8.10-2 | 414,966 KB |

`libnewlib-arm-none-eabi`에는 `libc.a`가 39개 들어 있어, 4절의 multilib 39가지 변형마다 하나씩입니다. 펌웨어 크기는 3절의 표에서 비교했습니다.

## 자주 보는 함정

> ⚠️ 호스트용 gcc로 ARM 빌드 시도

host `gcc`는 host용 코드만 만듭니다. arm64 Debian의 GCC 14.2.0에 Cortex-M 옵션을 주면 바로 거부합니다.

```text
$ gcc -mcpu=cortex-m4 -c hello.c
cc1: error: unknown value ‘cortex-m4’ for ‘-mcpu’
```

> ⚠️ FPU flag mismatch

hard-float 객체와 soft-float 객체를 섞으면 linker가 "uses VFP register arguments"로 막습니다([2-01](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison)의 함정 절에 실제 출력). multilib가 옵션에 맞는 libc를 고르므로, 모든 object와 라이브러리를 같은 `-mfloat-abi`·`-mfpu`로 빌드합니다.

> ⚠️ `nosys.specs`로 링크하고 출력이 안 나온다고 헤맴

3절의 경고대로 `nosys.specs`의 `_write`는 "is not implemented and will always fail"입니다. 링크가 된다고 출력 경로가 생긴 것이 아닙니다. `_write`를 UART로 구현하거나 semihosting specs를 씁니다.

> ⚠️ 코어별 FPU 차이를 무시

Cortex-M4의 FPU는 single-precision만, Cortex-M7은 double-precision까지 옵션입니다([2-01](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison) 4절). M7용으로 `-mfpu=fpv5-d16`으로 빌드한 바이너리는 M4에서 double FPU 명령을 실행하지 못합니다. 두 코어에 같은 바이너리를 쓰려면 둘 다 가진 기능으로 맞춥니다.

> ⚠️ 오래된 컴파일러의 C++ 기본 모드

GCC의 C++ 기본 언어 모드는 버전마다 다릅니다. GCC "C++ Standards Support" 페이지는 C++17 모드가 "the default in GCC 11 up until GCC 15 (inclusive)"라고 적습니다. 오래된 툴체인으로 C++17 코드를 빌드하면 기본 모드가 달라 에러가 나므로 `-std=c++17`을 명시합니다.

## 정리

- 크로스 컴파일러는 triplet으로 식별하고, `-dumpmachine`이 그 triplet을 알려 줍니다.
- 컴파일러·binutils·C library는 별도 구성 요소이고, Homebrew 패키지처럼 libc가 빠진 배포본도 있습니다.
- 같은 hello world가 newlib 28,944 byte, newlib-nano 7,532 byte, picolibc 7,236 byte(text)였고, newlib-nano의 float `printf`는 `-u _printf_float`로 켜야 합니다.
- multilib는 옵션에 맞는 라이브러리 디렉터리를 고르며, `--print-multi-directory`로 확인합니다.
- Linux 크로스 빌드는 sysroot를, bare-metal 빌드는 specs와 linker script를 맞춥니다.

다음 편에서는 **컴파일 4단계**를 다룹니다. preprocess, compile, assemble, link를 분리해 봅니다.

## 관련 항목

- [3-02: 컴파일 4단계](/blog/embedded/modern-recipes/part3-02-compile-pipeline)
- [3-06: 스타트업 코드 분석](/blog/embedded/modern-recipes/part3-06-startup-code)
- [3-11: Make와 CMake (cross-compile)](/blog/embedded/modern-recipes/part3-11-make-cmake-cross)
- 더 깊이 — [Embedded C++ for Real Systems: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags)
