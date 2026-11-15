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

이 중 어느 것이 진짜 필요한지를 모르면 링크가 깨지거나 거대한 바이너리가 나옵니다. 임베디드는 최소만 골라 static link합니다.

## 4개 라이브러리의 역할

### libgcc

GCC 컴파일러가 번역할 수 없는 명령을 함수 호출로 대체할 때 그 함수의 본체입니다. 컴파일러 번들에 포함됩니다.

전형적인 호출은 다음과 같습니다.

- `__aeabi_uidiv`: ARM에 정수 나눗셈 명령이 없는 경우
- `__aeabi_fadd`: FPU 없는 MCU의 float 덧셈
- __udivmodsi4: SI 모드 정수의 div/mod 헬퍼입니다. 이 글의 ARM ILP32에서는 32-bit이며 long long용이 아닙니다.
- `__udivmoddi4`: 64-bit divmod
- 예외 unwind helper (`_Unwind_*`)

FPU 없는 MCU의 float 연산은 컴파일러 헬퍼 참조를 만들 수 있습니다. 정확한 심볼과 링크 크기를 확인합니다.

```cpp
// FPU 없는 Cortex-M0에서
float scale = 1.5f;
float result = x * scale;
// → __aeabi_fmul 호출 → libgcc.a의 fmul 본체 링크
```

FPU가 없는 Cortex-M0에 hard-float ABI를 선택해 하드웨어를 만들어 낼 수는 없습니다. 하드웨어·ABI·라이브러리를 맞추고 필요한 경우 정수/고정소수점 대안을 비교합니다.

### libsupc++

C++ 언어 자체의 runtime 지원입니다. 예외 처리, RTTI, type info, virtual 호출의 일부를 담당합니다.

핵심 함수는 다음과 같습니다.

- `__cxa_throw`: `throw` 키워드 구현
- `__cxa_begin_catch` / `__cxa_end_catch`: catch 블록
- `__cxa_pure_virtual`: 순수 virtual 호출 시 abort
- `__cxa_atexit`: static 객체 소멸자 등록
- `__cxa_guard_*`: thread-safe magic static
- `__dynamic_cast`: RTTI 기반 다운캐스트

필요한 심볼은 실제 생성 코드와 링크 결과로 확인합니다. 예외·RTTI를 꺼도 동적 static guard, allocation, 소멸자 등록 등이 남을 수 있으며 고정된 80% 감소를 보장하지 않습니다.

`__cxa_pure_virtual`은 기본 구현이 abort입니다. 보드 정책에 맞는 처리기를 제공할 수 있지만, 잘못된 가상 호출 자체를 정상 동작으로 바꾸는 것은 아닙니다.

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

라이브러리 이름만으로 최종 Flash 크기를 고정할 수 없습니다. 링크되는 기능, 정적 아카이브 선택, GC/LTO, printf 설정, ABI에 따라 측정합니다.

newlib/nano를 제공하는 ARM GCC 배포판에서는 해당 specs 파일을 사용할 수 있습니다. 링크 옵션은 다음과 같습니다.

```makefile
# newlib-nano 사용
LDFLAGS += --specs=nano.specs

# float-enabled printf (메모리 비쌈)
LDFLAGS += -u _printf_float

# semihosting (debug용)
LDFLAGS += --specs=rdimon.specs
```

`printf("%f", x)`는 수 KB의 float formatting을 요구합니다. 정수만 쓰는 printf가 훨씬 작습니다.

### libstdc++

C++ 표준 라이브러리입니다. 실제로 참조한 기능과 링크 조건을 기준으로 포함량을 확인합니다.

string·vector·iostream 등의 추가 크기는 구현·입력·링커 조건에 따라 다릅니다. 동일 소스의 map·section 결과 없이 기능별 KB 표를 실측으로 제시하지 않습니다. thread/filesystem은 선택한 런타임의 OS·파일시스템 연동 지원을 확인합니다.

대안은 다음과 같습니다.

- **ETL**(Embedded Template Library): heap 없이 STL 같은 API
- **EASTL**(EA Standard Template Library): 게임 출신이며 임베디드에서도 쓸 수 있습니다
- 직접 구현: 간단한 ring buffer나 fixed vector

## 부트 시퀀스 — 무엇이 언제 실행되는가

newlib 계열 startup의 예시 흐름입니다. 정확한 초기화·종료 호출 순서는 사용하는 포트의 crt0/startup과 라이브러리 구현으로 확인합니다.

1. **Reset Vector** — 리셋 직후 진입 지점입니다.
2. **`Reset_Handler`** (어셈블리 또는 C)
   - `.data` 섹션 복사 (Flash → RAM)
   - `.bss` 섹션 0으로 초기화
   - (선택) FPU 활성화, MMU 설정
3. **`__libc_init_array`** — C++ 진입 직전의 핵심입니다.
   - `.preinit_array` 호출
   - `_init()` 호출 (legacy GNU)
   - `.init_array` 호출 — static C++ 객체의 생성자가 여기서 돕니다
4. **`main()`**
5. **`__libc_fini_array`** — `main`이 return하면 실행됩니다.
   - `.fini_array` 호출 — static 객체 소멸자
   - `_fini()` 호출
6. **`exit()`**

핵심은 `__libc_init_array`가 static C++ 객체 생성자를 호출한다는 점입니다. 이는 정적 저장 객체의 동적 초기화 경로를 말합니다. 필요한 런타임이 준비돼 있다면 자동 저장 객체를 그 전에 명시적으로 구성할 수도 있습니다. 모든 C++ 코드를 금지하는 경계는 아닙니다.

```cpp
// 위험! 부트 코드 안에서:
Counter counter;   // 자동 저장 객체의 생성자는 이 문장에서 호출됨
// 위험 여부는 생성자가 의존하는 초기화·메모리·하드웨어 준비 상태로 판단
```

startup에서 사용할 수 있는 언어·함수는 초기화 순서와 의존성을 검토합니다. C로 썼다는 사실만으로 미초기화 전역·미준비 하드웨어 접근이 안전해지는 것은 아닙니다. 위 흐름의 fini/exit 순서도 실제 startup과 atexit 연결에 따라 확인합니다.

자세한 내용은 [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code)에서 다룹니다.

## 최소 C++ 런타임 — 직접 제공

극도로 작은 환경에서는 libsupc++ 일부를 직접 구현해 더 줄일 수 있습니다.

언어 런타임 전체를 임의의 stub으로 교체하지 않습니다. __cxa_atexit가 성공을 반환하면서 소멸자를 버리는 구현은 종료 정책을 바꾸며, __dso_handle은 startup이 이미 정의했을 수 있습니다. new/delete도 sized·aligned·nothrow 등 필요한 형태와 실패 정책을 확인해야 합니다. 헤더와 ABI 없이 몇 개의 함수를 정의했다고 최소 런타임이 완성되지는 않습니다.

특정 firmware에서 종료·동적 할당을 의도적으로 금지한다면 해당 정책과 호출 금지를 별도로 검증하고, 필요한 지원 심볼을 nm/map으로 확인합니다. 이 글은 보드 런타임을 완성해 링크한 크기를 주장하지 않습니다.


## newlib vs newlib-nano

ARM GCC toolchain의 두 옵션입니다. 차이는 printf와 malloc 구현에 있습니다.

nano 구성은 코드·데이터 크기를 줄이려는 설정이지만 기능과 성능 차이는 배포판의 구성으로 확인합니다. nano.specs나 rdimon.specs가 모든 GCC 설치에 있는 것은 아닙니다. float printf/scanf 옵션도 해당 nano 포맷터가 제공할 때 사용합니다.

```makefile
LDFLAGS += --specs=nano.specs
LDFLAGS += -u _printf_float
LDFLAGS += -u _scanf_float
```

필요한 기능을 선택한 전후의 링크 산출물을 비교하며 고정된 추가 KB나 allocator 속도 순위를 가정하지 않습니다.


## picolibc — 차세대 옵션

picolibc는 bare-metal/RTOS를 위한 C 라이브러리 선택지입니다. GCC 버전만으로 기본 라이브러리가 결정되지 않으며 배포 toolchain과 OS/보드 설정을 확인합니다. newlib보다 항상 몇 KB 작다거나 newlib 유지보수가 정체됐다는 단정 대신 필요한 기능·포트·라이선스·실제 링크 결과를 비교합니다.


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

OS/RTOS 연동이 없는 표준 라이브러리 구성에서는 링크나 동작이 제한됩니다. 필요한 스레드 런타임 지원을 확인합니다. RTOS API를 직접 쓰거나 RTOS의 C++ wrapper를 씁니다.

### 2. `std::filesystem` 사용

대부분의 bare-metal은 OS 파일시스템이 없습니다. 링크 실패나 abort로 이어집니다. FatFs, LittleFS의 C++ wrapper를 사용합니다.

### 3. newlib 기본 사용 후 크기 폭증

라이브러리 선택과 실제 링크된 기능을 map으로 확인합니다. nano.specs 유무만으로 고정된 KB 차이를 가정하지 않습니다.

### 4. float printf를 의도치 않게 활성화

`printf("%f", x)`가 float 출력 코드를 링크에 끌어들입니다. 정수만 쓸 거면 `%f`를 금지합니다.

### 5. syscall stub 누락

미정의 심볼로 링크가 실패하거나 기본 stub이 링크되어 원치 않는 런타임 동작을 만들 수 있습니다. 필요한 인터페이스를 확인하고 반환 규약과 오류 경로를 구현합니다.

### 6. static 객체 소멸자에 의존

영구 실행 firmware에서는 정상 종료 경로를 사용하지 않을 수 있지만, 임베디드 Linux·테스트·재시작 정책은 다릅니다. 자동 저장 객체의 scope 종료 소멸과 프로그램 종료 소멸을 구분합니다. destructor에 중요 로직을 두지 않습니다.

## 측정 — 같은 코드, 다른 libc

해당 보드의 startup·링커 스크립트·라이브러리 버전·소스가 없는 KB 비교표를 실측 결과로 제공하지 않습니다. 아래는 타입·헬퍼와 힙 경계 처리만 재현하며 전체 firmware 크기를 측정한 기록은 아닙니다.


## 직접 확인 — ARM 타입 폭·힙 범위 검사

widths.cpp는 ARM Cortex-M0 타깃의 헤더 없는 오브젝트로만 생성합니다. long/long long의 폭을 컴파일 시 확인하고 정수·float 연산이 요구하는 미정의 헬퍼를 읽습니다. compiler-rt 또는 libgcc 본체 링크와 실제 MCU 실행은 별도입니다.

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

- C++ 런타임은 libgcc, libsupc++, libc, libstdc++로 구성되며 각각 최소화할 수 있습니다.
- 정적 동적 초기화와 자동 객체 생성은 구분하고 startup의 실제 의존 순서를 확인합니다.
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
