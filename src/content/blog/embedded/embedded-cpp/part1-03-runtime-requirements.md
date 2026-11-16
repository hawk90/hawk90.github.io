---
title: "임베디드 C++ 런타임 요구사항 — libstdc++·newlib·crt0 분석"
slug: "embedded/embedded-cpp/part1-03-runtime-requirements"
date: 2026-04-28T09:03:00
description: "C++ 코드가 돌기 위한 최소 런타임 — libstdc++, libsupc++, newlib, libgcc. 무엇이 진짜 필요한가."
series: "Embedded C++ for Real Systems"
seriesOrder: 3
tags: [cpp, embedded, runtime, libstdc++, newlib, libgcc, libsupc++]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> GCC 계열 bare-metal 환경에서는 컴파일러 헬퍼·C++ 언어 지원·C/C++ 라이브러리·startup의 책임을 나눠 확인합니다. 모든 C++ 구현이 같은 네 파일로 구성되지는 않습니다.

## 어떤 문제를 푸는가

C도 데이터 초기화·C 라이브러리 지원이 필요할 수 있습니다. C++에서는 사용하는 언어·라이브러리 기능에 따라 추가 지원이 필요하며, GCC 계열의 대표적 구성은 다음과 같습니다.

- **libgcc**: 컴파일러 헬퍼(소프트 float, divmod, unwind helper)
- **libsupc++**: C++ 언어 지원(예외, RTTI, type info)
- **libc**: 표준 C 라이브러리(malloc, memcpy, printf 등)
- **libstdc++**: C++ 표준 라이브러리(string, vector, iostream 등)

이 중 어느 것이 진짜 필요한지를 모르면 링크가 깨지거나, 쓰지 않는 기능까지 끌려온 바이너리가 나옵니다. 임베디드는 필요한 것만 골라 static link합니다. 이 글의 링크·심볼 확인은 Homebrew arm-none-eabi-g++ 16.2.0(newlib·libstdc++ 미포함, libgcc 포함)과 Clang 23.1.5로 했습니다. 이 툴체인에 없는 newlib·libstdc++는 소스를 인용합니다.

## 4개 라이브러리의 역할

### libgcc

GCC 컴파일러가 번역할 수 없는 명령을 함수 호출로 대체할 때 그 함수의 본체입니다. 컴파일러 번들에 포함됩니다.

전형적인 호출은 다음과 같습니다.

- `__aeabi_uidiv`: 정수 나눗셈 명령이 없는 코어(Cortex-M0/M0+, ARMv6-M)의 32비트 나눗셈
- `__aeabi_fadd`: FPU 없는 MCU의 float 덧셈
- __udivmodsi4: SI 모드 정수의 div/mod 헬퍼입니다. 이 글의 ARM ILP32에서는 32-bit이며 long long용이 아닙니다.
- `__udivmoddi4`: 64-bit divmod
- 예외 unwind helper (`_Unwind_*`)

아래 [직접 확인](#직접-확인--arm-타입-폭힙-범위-검사) 절의 `widths.cpp`(32비트 나눗셈, 64비트 나눗셈, float 곱셈 함수 하나씩)를 libgcc와 링크하면, 끌려오는 헬퍼와 크기가 코어마다 다릅니다(`-Os`, `--gc-sections`).

| 심볼 | Cortex-M0 (바이트) | Cortex-M3 (바이트) |
| --- | ---: | ---: |
| `__aeabi_fmul` | 644 | 360 |
| `__udivsi3` (`__aeabi_uidiv`) | 266 | 없음 |
| `__aeabi_uidivmod` | 8 | 없음 |
| `__aeabi_uldivmod` | 62 | 48 |
| `__udivmoddi4` | 398 | 820 |
| `__clzsi2` + `__clzdi2` | 84 | 없음 |
| ELF text 전체 | 1,504 | 1,264 |

Cortex-M3는 `udiv` 명령이 있어 `divide32`가 `udiv r0, r0, r1; bx lr` 두 명령으로 끝나고 32비트 나눗셈 헬퍼가 링크되지 않습니다. 64비트 나눗셈과 float 곱셈은 두 코어 모두 libgcc를 부릅니다.

```cpp
// FPU 없는 Cortex-M0에서
float scale = 1.5f;
float result = x * scale;
// → __aeabi_fmul 호출 → libgcc.a의 fmul 본체 링크
```

FPU가 없는 Cortex-M0에서 float 곱셈 하나가 644바이트 헬퍼를 끌고 옵니다. hard-float ABI를 고른다고 FPU가 생기지는 않으므로, float를 피하려면 정수·고정소수점으로 바꿔야 합니다.

### libsupc++

C++ 언어 자체의 runtime 지원입니다. 예외 처리, RTTI, type info, virtual 호출의 일부를 담당합니다.

핵심 함수는 다음과 같습니다.

- `__cxa_throw`: `throw` 키워드 구현
- `__cxa_begin_catch` / `__cxa_end_catch`: catch 블록
- `__cxa_pure_virtual`: 순수 virtual 호출 시 abort
- `__cxa_atexit`: static 객체 소멸자 등록
- `__cxa_guard_*`: thread-safe magic static
- `__dynamic_cast`: RTTI 기반 다운캐스트

예외·RTTI를 꺼도 이 목록이 다 사라지지는 않습니다. [Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags)에서 `-fno-exceptions -fno-rtti`로 컴파일한 오브젝트에도 동적 static의 `__cxa_guard_acquire`/`__cxa_guard_release`와 정적 소멸자의 `__aeabi_atexit`가 남았습니다.

`__cxa_pure_virtual`은 생성자·소멸자 안에서 순수 가상 함수를 부르는 식의 잘못된 호출이 닿는 곳입니다. 순수 가상 함수가 있는 클래스의 생성자를 컴파일하면 vtable 슬롯이 이 심볼을 가리킵니다. arm-none-eabi-g++ 16.2.0은 이 참조를 weak 미정의(`w __cxa_pure_virtual`)로 남겼습니다. GCC 16 libsupc++의 기본 구현(`pure.cc`)은 `"pure virtual method called\n"`을 쓴 뒤 `std::terminate()`를 부릅니다. 직접 정의하면 이 출력·terminate 경로 대신 보드 정책(무한 루프, 리셋)으로 바꿀 수 있지만, 잘못된 가상 호출 자체를 정상 동작으로 바꾸지는 못합니다.

```cpp
extern "C" void __cxa_pure_virtual() {
    // 무한 루프 또는 reset
    while (1);
}
```

### libc

C 표준 라이브러리입니다. 임베디드에서는 newlib 또는 picolibc를 씁니다.

| 라이브러리 | 확인할 환경·설정 |
| --- | --- |
| glibc / musl | OS를 갖춘 임베디드 Linux에서 사용되는 선택지입니다. |
| newlib / newlib-nano | 배포 toolchain과 빌드 설정별로 제공 기능·syscall 포트를 확인합니다. |
| picolibc | bare-metal/RTOS용 구성과 보드·toolchain 지원을 확인합니다. |

newlib/nano를 함께 배포하는 ARM GCC 배포판(Arm GNU Toolchain 등)에는 다음 specs 파일이 들어 있습니다. Homebrew의 `arm-none-eabi-gcc`처럼 C 라이브러리 없이 배포되는 툴체인에는 없습니다.

```makefile
# newlib-nano 사용
LDFLAGS += --specs=nano.specs

# float-enabled printf (메모리 비쌈)
LDFLAGS += -u _printf_float

# semihosting (debug용)
LDFLAGS += --specs=rdimon.specs
```

`-u _printf_float`가 필요한 이유는 newlib `README`의 `--enable-newlib-nano-formatted-io` 항목에 있습니다. nano의 formatted I/O는 부동소수점 지원을 weak 함수로 분리해 기본으로 링크하지 않고, 필요한 프로그램은 `_printf_float`·`_scanf_float`를 `-u`로 강제 링크해야 합니다. 같은 항목은 이 함수를 링크하지 않은 채 `%f`를 쓰면 미정의 동작이 될 수 있다고 적습니다.

### libstdc++

C++ 표준 라이브러리입니다. 정적 아카이브(`libstdc++.a`)는 참조한 심볼이 들어 있는 멤버만 링크되므로, 크기는 어떤 기능을 썼는지가 정합니다. 이 글의 툴체인에는 libstdc++가 없어 기능별 크기는 재지 못했습니다. `std::thread`·`std::filesystem`은 표준의 freestanding 헤더 목록에 없고([Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#6-c-표준-라이브러리-전부-사용-가능하다고-가정)), OS 스레드·파일 시스템 연동이 있는 구성에서만 동작합니다.

대안은 다음과 같습니다.

- **ETL**(Embedded Template Library): heap 없이 STL 같은 API
- **EASTL**(EA Standard Template Library): Electronic Arts가 게임 개발용으로 공개한 STL 대체 구현
- 직접 구현: 간단한 ring buffer나 fixed vector

## 부트 시퀀스 — 무엇이 언제 실행되는가

newlib의 ARM용 `libgloss/arm/crt0.S`와 `newlib/libc/misc/init.c`·`fini.c`를 따라간 흐름입니다. 벤더 startup 파일은 이 crt0 대신 자체 `Reset_Handler`를 쓰므로 순서가 다를 수 있습니다([Part 1-06](/blog/embedded/embedded-cpp/part1-06-startup-code)).

1. **Reset Vector** — 리셋 직후 진입 지점입니다.
2. **`Reset_Handler`** (어셈블리 또는 C)
   - `.data` 섹션 복사 (Flash → RAM)
   - `.bss` 섹션 0으로 초기화
   - (선택) FPU 활성화, MMU 설정
3. **`atexit(__libc_fini_array)`** — crt0가 종료 처리를 먼저 등록합니다.
4. **`__libc_init_array`** — C++ 진입 직전의 핵심입니다.
   - `.preinit_array` 호출
   - `_init()` 호출 (`_HAVE_INIT_FINI`일 때)
   - `.init_array` 호출 — static C++ 객체의 생성자가 여기서 돕니다
5. **`main()`**
6. **`exit()`** — crt0가 `main`의 반환값으로 부릅니다. 등록된 atexit 함수가 역순으로 돌고, 그중 하나가 `__libc_fini_array`입니다.
   - `.fini_array`를 끝에서부터 역순으로 호출 — static 객체 소멸자
   - `_fini()` 호출 (`_HAVE_INIT_FINI`일 때)

핵심은 `__libc_init_array`가 static C++ 객체 생성자를 호출한다는 점입니다. 이는 정적 저장 객체의 동적 초기화 경로를 말합니다. 필요한 런타임이 준비돼 있다면 자동 저장 객체를 그 전에 명시적으로 구성할 수도 있습니다. 모든 C++ 코드를 금지하는 경계는 아닙니다.

```cpp
// 위험! 부트 코드 안에서:
Counter counter;   // 자동 저장 객체의 생성자는 이 문장에서 호출됨
// 위험 여부는 생성자가 의존하는 초기화·메모리·하드웨어 준비 상태로 판단
```

C로 썼다는 사실만으로 미초기화 전역·미준비 하드웨어 접근이 안전해지지는 않습니다. `.data` 복사와 `.bss` 정리 전에는 C 코드든 C++ 코드든 전역 변수를 읽으면 안 됩니다.

자세한 내용은 [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code)에서 다룹니다.

## 최소 C++ 런타임 — 직접 제공

libsupc++의 일부 심볼(`__cxa_pure_virtual` 등)은 직접 정의해 기본 구현 대신 쓸 수 있습니다. 그렇다고 언어 런타임 전체를 임의의 stub으로 바꾸지는 않습니다. __cxa_atexit가 성공을 반환하면서 소멸자를 버리는 구현은 종료 정책을 바꾸며, __dso_handle은 startup이 이미 정의했을 수 있습니다. new/delete도 sized·aligned·nothrow 등 필요한 형태와 실패 정책을 확인해야 합니다. 헤더와 ABI 없이 몇 개의 함수를 정의했다고 최소 런타임이 완성되지는 않습니다.

종료·동적 할당을 금지한 firmware라면 `arm-none-eabi-nm -u`로 오브젝트의 미정의 심볼을 모아 `__cxa_atexit`·`__aeabi_atexit`·`_Znwj`(`operator new(unsigned)`) 같은 이름이 없는지 빌드에서 검사할 수 있습니다.


## newlib vs newlib-nano

newlib-nano 빌드는 다음 두 configure 옵션을 켭니다. newlib `README`에 따르면 `--enable-newlib-nano-formatted-io`는 formatted I/O를 C89 범위로 줄이고 부동소수점 지원을 분리하며, `--enable-newlib-nano-malloc`은 `mallocr.c` 대신 "메모리가 아주 적은 시스템용" `nano-mallocr.c`를 씁니다. `nano.specs`는 이렇게 빌드한 라이브러리로 링크하게 만드는 specs 파일입니다.

```makefile
LDFLAGS += --specs=nano.specs
LDFLAGS += -u _printf_float
LDFLAGS += -u _scanf_float
```

이 환경에는 newlib이 없어 nano와 기본 newlib의 크기 차이를 재지 못했습니다.


## picolibc — 차세대 옵션

[picolibc](https://github.com/picolibc/picolibc)는 README의 표현으로 "RAM이 적은 작은 임베디드 시스템을 겨냥한" C 라이브러리이며, newlib과 AVR Libc의 코드를 섞어 만들었습니다. 어느 C 라이브러리가 기본인지는 컴파일러 버전이 아니라 툴체인 배포판이 정합니다. 이 글에서는 picolibc로 링크한 크기를 재지 않았습니다.


## syscall stubs — 환경에 맞춰 구현

newlib은 호스트 의존 함수를 syscall로 분리합니다. bare-metal에서는 stub을 제공해야 합니다.

함수 시그니처와 errno/반환 규약을 사용하는 newlib 헤더·보드 포트에 맞춥니다. 아래 항목은 모두 성공을 반환하는 가짜 stub으로 대체하지 않습니다.

| 경로 | 확인할 계약 |
| --- | --- |
| _write/_read | 실제 전송량·오류·EOF를 구분하며 UART 등의 준비 상태를 확인합니다. |
| _fstat | 성공 시 요청한 stat 구조체의 필요한 필드도 채워야 합니다. |
| _lseek/_close | 지원하지 않는 연산은 적절한 오류와 errno로 표현합니다. |
| _sbrk | 힙 상·하한, 증가량 overflow/축소, 정렬·동시성 정책을 확인합니다. 실패는 포트가 요구하는 (void*)-1 및 errno를 적용합니다. |

반환 타입이 포인터인 _sbrk에서 단순 정수 -1을 반환하는 코드를 그대로 복사하지 않습니다. 동적 할당을 금지한다면 allocator 호출 경로와 종료 동작도 확인합니다. [newlib syscall 계약](https://sourceware.org/newlib/libc.html#Syscalls)을 시작점으로 실제 설치 헤더를 대조합니다.


## 자주 보는 함정과 안티패턴

### 1. bare-metal에서 `std::thread` 사용

`std::thread`는 OS 스레드 위에 구현됩니다. libstdc++는 gthreads 계층(POSIX 스레드 등)으로 스레드를 만들고, 이 글의 `arm-none-eabi-gcc -v`는 `Thread model: single`을 출력하는데, 이렇게 빌드한 GCC에는 그 계층이 없습니다. RTOS API를 직접 쓰거나 RTOS의 C++ wrapper를 씁니다.

### 2. `std::filesystem` 사용

`std::filesystem`은 OS의 파일 시스템 호출 위에 구현됩니다. OS가 없는 firmware라면 FatFs, LittleFS 같은 파일 시스템 라이브러리를 C++로 감싸 씁니다.

### 3. newlib 기본 사용 후 크기 폭증

`nano.specs` 없이 링크하면 기본 newlib의 formatted I/O와 malloc이 들어옵니다. 어느 아카이브 멤버가 들어왔는지는 `-Wl,-Map=out.map`의 `Archive member included` 절이 이유와 함께 보여 줍니다([Part 1-04](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)).

### 4. float printf를 의도치 않게 활성화

`printf("%f", x)`가 float 출력 코드를 링크에 끌어들입니다. 정수만 쓸 거면 `%f`를 금지합니다.

### 5. syscall stub 누락

`nosys.specs`로 링크하면 libnosys의 stub이 들어가는데, 이 stub은 실패(`-1`, `errno = ENOSYS`)를 반환합니다(`libgloss/libnosys/write.c`). 그래서 `printf`가 링크는 되지만 아무것도 출력하지 않습니다. stub이 없으면 `_write`·`_sbrk` 같은 심볼이 미정의로 남아 링크가 실패합니다.

### 6. static 객체 소멸자에 의존

영구 실행 firmware에서는 정상 종료 경로를 사용하지 않을 수 있지만, 임베디드 Linux·테스트·재시작 정책은 다릅니다. 자동 저장 객체의 scope 종료 소멸과 프로그램 종료 소멸을 구분합니다. destructor에 중요 로직을 두지 않습니다.

## 측정 — 같은 코드, 다른 libc

이 환경에는 newlib·picolibc가 없어 같은 코드를 C 라이브러리별로 링크한 크기 비교는 하지 못했습니다. 아래는 libgcc 헬퍼와 힙 경계 처리를 재현합니다.


## 직접 확인 — ARM 타입 폭·힙 범위 검사

`widths.cpp`는 long/long long의 폭을 컴파일 시 확인하고, 정수·float 연산이 요구하는 미정의 헬퍼를 읽습니다. 위 libgcc 크기 표가 이 파일을 링크한 결과입니다.

```cpp title="widths.cpp"
static_assert(sizeof(unsigned long) == 4);
static_assert(sizeof(unsigned long long) == 8);
unsigned long divide32(unsigned long a, unsigned long b) { return a / b; }
unsigned long long divide64(unsigned long long a, unsigned long long b) { return a / b; }
float multiply(float a, float b) { return a * b; }
```

```bash
clang++ --target=arm-none-eabi -mcpu=cortex-m0 -mthumb -std=c++17 -O1 -c widths.cpp -o widths.o
llvm-nm -u widths.o
```

Clang 23.1.5와 arm-none-eabi-g++ 16.2.0(`-mcpu=cortex-m0`) 모두 같은 세 심볼을 남깁니다.

```text
         U __aeabi_fmul
         U __aeabi_uidiv
         U __aeabi_uldivmod
```

`-mcpu=cortex-m3`로 바꾸면 `__aeabi_uidiv`가 빠집니다.

다음은 _sbrk의 ABI 구현이 아니라 경계 계산을 분리한 네이티브 진단 프로그램입니다. 실패를 nullptr로 나타내는 내부 함수이므로 실제 newlib 포트에 연결할 때는 그 ABI의 오류 규약으로 변환해야 합니다. 정렬·allocator lock·링커 메모리 배치도 이 예제 밖에서 처리합니다.

```cpp title="heap-window.cpp"
#include <cassert>
#include <cstddef>
#include <limits>
#include <cstdio>

alignas(std::max_align_t) unsigned char storage[64];
std::size_t used = 0;
void* reserve(std::ptrdiff_t increment) {
    const auto previous = used;
    if (increment >= 0) {
        const auto amount = static_cast<std::size_t>(increment);
        if (amount > sizeof(storage) - used) return nullptr;
        used += amount;
    } else {
        const auto amount = static_cast<std::size_t>(-(increment + 1)) + 1;
        if (amount > used) return nullptr;
        used -= amount;
    }
    return storage + previous;
}
int main() {
    assert(reserve(16) == storage);
    assert(reserve(0) == storage + 16);
    assert(reserve(49) == nullptr && used == 16);
    assert(reserve(-17) == nullptr && used == 16);
    assert(reserve(std::numeric_limits<std::ptrdiff_t>::min()) == nullptr);
    assert(reserve(-8) == storage + 16 && used == 8);
    assert(reserve(56) == storage + 8 && used == 64);
    assert(reserve(1) == nullptr && used == 64);
    std::puts("heap bounds and signed-minimum checks passed");
}
```

## 정리

- GCC 계열 C++ 런타임은 libgcc, libsupc++, libc, libstdc++로 나뉘고, 정적 링크에서는 참조한 심볼이 있는 멤버만 들어옵니다.
- newlib crt0는 `atexit(__libc_fini_array)` → `__libc_init_array` → `main` → `exit` 순서입니다. 정적 객체의 동적 초기화와 자동 객체 생성은 구분합니다.
- libc는 newlib-nano나 picolibc를 쓰고 `nano.specs`를 잊지 않도록 합니다.
- syscall stubs는 환경에 맞춰 구현합니다 — `_write`로 printf를 UART에, `_sbrk`로 heap을 연결합니다.
- libsupc++의 일부는 직접 작성해 제거할 수 있습니다.

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — newlib 선택, `--specs=nano.specs`
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — 어느 라이브러리에서 어떤 크기가 오는지 측정
- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — `__libc_init_array`의 내부
- [Part 1-07: 링커 스크립트와 C++](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.init_array` 섹션 배치
- [Part 3-01: 동적 할당 없이 C++ 쓰기](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc) — malloc/new 회피

## 다음 글

[Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — 어디서 크기가 오는지 측정하는 도구들을 다룹니다. `size`, `nm`, `objdump`, `bloaty`, `arm-none-eabi-objcopy`가 핵심입니다.
