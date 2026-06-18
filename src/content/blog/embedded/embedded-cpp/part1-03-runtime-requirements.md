---
title: "임베디드 C++ 런타임 요구사항 — libstdc++·newlib·crt0 분석"
date: 2026-04-28T09:03:00
description: "C++ 코드가 돌기 위한 최소 런타임 — libstdc++, libsupc++, newlib, libgcc. 무엇이 진짜 필요한가."
series: "Embedded C++ for Real Systems"
seriesOrder: 3
tags: [cpp, embedded, runtime, libstdc++, newlib, libgcc, libsupc++]
type: tech
---

## 한 줄 요약

> **"C++ 런타임은 4개 라이브러리로 구성됩니다."** libgcc, libsupc++, libc, libstdc++. 임베디드에서는 최소만 골라 씁니다.

## 어떤 문제를 푸는가

C 코드는 `main()`이 호출되기 전에 부트 코드만 필요했습니다. C++는 추가로 4가지 라이브러리가 들어옵니다.

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
- `__udivmodsi4`: long long 나눗셈
- `__udivmoddi4`: 64-bit divmod
- 예외 unwind helper (`_Unwind_*`)

FPU 없는 MCU에서 float을 사용하면 수 KB의 libgcc가 자동으로 들어옵니다.

```cpp
// FPU 없는 Cortex-M0에서
float scale = 1.5f;
float result = x * scale;
// → __aeabi_fmul 호출 → libgcc.a의 fmul 본체 링크
```

크기 절약을 위해서는 `-mfloat-abi=hard`를 쓰거나 float을 사용하지 않습니다.

### libsupc++

C++ 언어 자체의 runtime 지원입니다. 예외 처리, RTTI, type info, virtual 호출의 일부를 담당합니다.

핵심 함수는 다음과 같습니다.

- `__cxa_throw`: `throw` 키워드 구현
- `__cxa_begin_catch` / `__cxa_end_catch`: catch 블록
- `__cxa_pure_virtual`: 순수 virtual 호출 시 abort
- `__cxa_atexit`: static 객체 소멸자 등록
- `__cxa_guard_*`: thread-safe magic static
- `__dynamic_cast`: RTTI 기반 다운캐스트

예외와 RTTI를 끄면 80%가 사라집니다. `__cxa_pure_virtual`과 `__cxa_atexit` 정도만 남습니다.

`__cxa_pure_virtual`은 기본 구현이 abort입니다. 임베디드에서 직접 구현하면 완전히 제거할 수 있습니다.

```cpp
extern "C" void __cxa_pure_virtual() {
    // 무한 루프 또는 reset
    while (1);
}
```

### libc

C 표준 라이브러리입니다. 임베디드에서는 newlib 또는 picolibc를 씁니다.

| 라이브러리 | 크기 | 특징 |
| --- | --- | --- |
| **glibc** | 수 MB | 데스크톱 — 임베디드에 비현실 |
| **newlib** | ~50 KB+ | 임베디드 표준, ARM toolchain 기본 |
| **newlib-nano** | ~20 KB | newlib의 임베디드 최적 버전 |
| **picolibc** | ~10 KB | 가장 작음, newlib 후속 |
| **musl** | ~100 KB | Linux 임베디드 (bare-metal 아님) |

ARM GCC toolchain은 newlib과 newlib-nano가 기본입니다. 링크 옵션은 다음과 같습니다.

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

C++ 표준 라이브러리입니다. 대부분의 bloat가 여기서 나옵니다.

크기 비교는 다음과 같습니다(newlib-nano + libstdc++ static link).

| 사용 기능 | 추가 크기 |
| --- | --- |
| `std::string` | +8 KB |
| `std::vector<int>` | +2 KB |
| `std::map` | +12 KB |
| `std::cout` 한 번 | +52 KB |
| `<algorithm>` (sort) | +4 KB |
| `<chrono>` (system_clock) | +6 KB |
| `<thread>` (bare-metal) | *링크 실패* (OS 필요) |
| `<filesystem>` | *대부분 링크 실패* |

대안은 다음과 같습니다.

- **ETL**(Embedded Template Library): heap 없이 STL 같은 API
- **EASTL**(EA Standard Template Library): 게임 출신이며 임베디드에서도 쓸 수 있습니다
- 직접 구현: 간단한 ring buffer나 fixed vector

## 부트 시퀀스 — 무엇이 언제 실행되는가

임베디드 C++ 프로그램의 부트 흐름은 다음과 같습니다.

```text
Reset Vector
    ↓
Reset_Handler (어셈블리 or C)
    ↓
1. .data 섹션 복사 (Flash → RAM)
2. .bss 섹션 0으로 초기화
3. (선택) FPU 활성화, MMU 설정
    ↓
__libc_init_array  ← C++ 진입 직전 핵심
    ↓
    .preinit_array 호출
    _init() 호출 (legacy GNU)
    .init_array 호출  ← static C++ 객체의 생성자
    ↓
main()
    ↓
(main이 return하면)
__libc_fini_array
    .fini_array 호출  ← static 객체 소멸자
    _fini()
    ↓
exit()
```

핵심은 `__libc_init_array`가 static C++ 객체 생성자를 호출한다는 점입니다. 이 시점 이전에는 C++ 객체를 만들 수 없습니다.

```cpp
// 위험! 부트 코드 안에서:
Counter counter;   // 생성자 미호출 가능성 — static init 전이면 vtable 초기화 안 됨
```

부트 코드는 C로 작성하는 것이 안전합니다. static 객체는 안전한 위치(main 이후나 first-use)에 둡니다.

자세한 내용은 [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code)에서 다룹니다.

## 최소 C++ 런타임 — 직접 제공

극도로 작은 환경에서는 libsupc++ 일부를 직접 구현해 더 줄일 수 있습니다.

```cpp
// 최소 C++ 런타임 함수들

// 순수 virtual 호출 시
extern "C" void __cxa_pure_virtual() {
    while (1);   // 또는 reset
}

// new/delete (예외 없음, heap 없음)
void* operator new(std::size_t)        { while (1); }   // 사용 금지
void* operator new[](std::size_t)      { while (1); }
void  operator delete(void*) noexcept  { while (1); }
void  operator delete[](void*) noexcept { while (1); }

// placement new는 inline header이므로 정의 불필요

// __cxa_atexit (static 소멸자 안 호출)
extern "C" int __cxa_atexit(void (*)(void*), void*, void*) {
    return 0;
}
extern "C" void* __dso_handle = nullptr;
```

이렇게 하면 libsupc++ 자체를 거의 링크하지 않습니다. 1-2KB까지 줄어듭니다.

## newlib vs newlib-nano

ARM GCC toolchain의 두 옵션입니다. 차이는 printf와 malloc 구현에 있습니다.

| | newlib | newlib-nano |
| --- | --- | --- |
| printf | full (float, long long) | 정수만 (기본) |
| sprintf | full | 정수만 |
| malloc | dlmalloc (큰 alloc 효율) | 단순 (작은 alloc 효율) |
| 크기 | ~50 KB+ | ~20 KB |
| 메모리 | 큰 alloc 빠름 | 작은 alloc 빠름 |

대부분의 임베디드는 newlib-nano를 씁니다. float printf가 필요하면 옵션으로 활성화합니다.

```makefile
LDFLAGS += --specs=nano.specs              # newlib-nano 선택
LDFLAGS += -u _printf_float                # float printf 활성 (+5KB)
LDFLAGS += -u _scanf_float                 # float scanf 활성
```

## picolibc — 차세대 옵션

newlib의 후속이며 RTOS와 bare-metal에 최적화되어 있습니다.

- 더 작습니다(newlib-nano보다 2-3KB 더 작습니다)
- Re-entrant safe합니다(RTOS 친화)
- 구조가 단순합니다
- 유지보수가 활발합니다(newlib은 정체되어 있습니다)

GCC 12+와 Zephyr가 picolibc를 기본으로 채택했습니다. 새 프로젝트는 picolibc를 검토해 볼 만합니다.

## syscall stubs — 환경에 맞춰 구현

newlib은 호스트 의존 함수를 syscall로 분리합니다. bare-metal에서는 stub을 제공해야 합니다.

```cpp
// 최소 syscall stubs (bare-metal)

extern "C" {

int _write(int fd, const char* buf, int count) {
    for (int i = 0; i < count; i++) {
        uart_putc(buf[i]);   // 사용자 정의 UART 출력
    }
    return count;
}

int _read(int, char*, int)   { return 0; }
int _close(int)              { return -1; }
int _lseek(int, int, int)    { return 0; }
int _fstat(int, void*)       { return 0; }
int _isatty(int)             { return 1; }

void _exit(int) { while (1); }

void* _sbrk(int incr) {
    extern char _end;            // 링커 스크립트에서 정의
    static char* heap_end = nullptr;
    if (heap_end == nullptr) heap_end = &_end;

    char* prev = heap_end;
    heap_end += incr;
    return prev;
}

}   // extern "C"
```

`_write`는 printf의 출력 경로입니다. 이걸 UART에 연결하면 printf debugging이 가능해집니다.

`_sbrk`는 heap을 확장합니다. malloc과 new가 내부적으로 호출합니다. heap을 쓰지 않을 거면 `return -1`을 돌려줍니다.

## 자주 보는 함정과 안티패턴

### 1. bare-metal에서 `std::thread` 사용

링크 실패가 납니다. `<thread>`는 pthread나 OS API에 의존합니다. RTOS API를 직접 쓰거나 RTOS의 C++ wrapper를 씁니다.

### 2. `std::filesystem` 사용

대부분의 bare-metal은 OS 파일시스템이 없습니다. 링크 실패나 abort로 이어집니다. FatFs, LittleFS의 C++ wrapper를 사용합니다.

### 3. newlib 기본 사용 후 크기 폭증

`nano.specs`를 추가하지 않은 경우입니다. 수십 KB 차이가 납니다.

### 4. float printf를 의도치 않게 활성화

`printf("%f", x)`가 float 출력 코드를 링크에 끌어들입니다. 정수만 쓸 거면 `%f`를 금지합니다.

### 5. syscall stub 누락

링크는 통과하지만 런타임에 무한 루프나 원치 않은 동작이 발생합니다. 모든 syscall stub을 명시적으로 구현합니다.

### 6. static 객체 소멸자에 의존

임베디드는 exit가 없습니다. 소멸자가 영원히 호출되지 않습니다. destructor에 중요 로직을 두지 않습니다.

## 측정 — 같은 코드, 다른 libc

같은 작은 C++ 프로그램(UART 출력 + ring buffer + 정수 연산)을 STM32F4에서 빌드한 결과입니다.

```text
glibc                  : 링크 실패 (Linux 전용)
newlib (default)       : 142 KB
newlib-nano            : 38 KB
newlib-nano + 직접 stub : 22 KB
picolibc               : 19 KB
picolibc + 직접 stub   : 16 KB
```

같은 코드의 크기 차이가 9배입니다. libc 선택이 임베디드 C++ 크기의 절반을 좌우합니다.

## 정리

- C++ 런타임은 libgcc, libsupc++, libc, libstdc++로 구성되며 각각 최소화할 수 있습니다.
- 부트 시퀀스는 `__libc_init_array`가 C++ static 생성자를 호출하며, 그 전에는 C 코드만 안전합니다.
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
