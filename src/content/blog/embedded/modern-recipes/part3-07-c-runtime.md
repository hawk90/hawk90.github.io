---
title: "C 런타임 crt0 분석 — Stack·BSS Zero·Data Copy·atexit"
slug: "embedded/modern-recipes/part3-07-c-runtime"
date: 2026-04-12T09:29:00
description: "crt0·.data 복사·.bss 클리어·ctors·atexit."
series: "Modern Embedded Recipes"
seriesOrder: 29
tags: [recipes, toolchain, runtime]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"crt0는 OS(또는 reset)와 application 사이의 가장 얇은 layer입니다."** newlib의 ARM `crt0.S`가 하는 일은 stack·`.bss` 준비, 종료 처리 등록(`atexit`), `__libc_init_array`, `main`, `exit`이고, 이 중 하나를 직접 만든 startup에서 빠뜨리면 그 기능만 조용히 사라집니다.

## 어떤 상황에서 쓰나

- newlib, picolibc의 내부 동작 이해
- `printf`가 호출하는 system call(`_write` 등) stub 작성
- Linux 임베디드에서 static linking
- `atexit`, `exit` 동작 분석

이 글의 실행은 Debian 13 arm64 guest의 `gcc-arm-none-eabi` 14.2.rel1(newlib 4.5.0)로 빌드하고 QEMU 11.1.3 `netduinoplus2`(Cortex-M4F)에서 돌렸습니다. newlib 소스 인용은 sourceware.org의 newlib-cygwin 저장소에서 연 `libgloss/arm/crt0.S`, `newlib/libc/misc/init.c`, `fini.c`입니다.

## 핵심 개념

### 1) crt0, crti, crtbegin — 링크 순서

GCC driver는 startup을 여러 작은 object로 나눠 사용자 코드 앞뒤에 붙입니다. `--specs=nosys.specs`로 `main`만 있는 파일을 `-v`로 링크해 `collect2`에 넘어간 순서를 그대로 뽑았습니다.

```text
.../gcc/arm-none-eabi/14.2.1/thumb/v7e-m+fp/hard/crti.o
.../gcc/arm-none-eabi/14.2.1/thumb/v7e-m+fp/hard/crtbegin.o
.../arm-none-eabi/lib/thumb/v7e-m+fp/hard/crt0.o
/tmp/ccUwv43f.o                    (사용자 코드)
--start-group -lgcc -lc            (nosys.specs가 추가한 group 포함)
.../gcc/arm-none-eabi/14.2.1/thumb/v7e-m+fp/hard/crtend.o
.../gcc/arm-none-eabi/14.2.1/thumb/v7e-m+fp/hard/crtn.o
```

| 파일 | 출처 | 역할 |
| --- | --- | --- |
| `crti.o` / `crtn.o` | GCC | `.init`/`.fini` section의 앞부분과 끝부분 |
| `crtbegin.o` / `crtend.o` | GCC | C++ 지원 코드와 `__dso_handle` 같은 symbol |
| `crt0.o` | newlib(libgloss) | entry point `_start` |

`crt0.o`가 맨 앞이 아니라 `crti.o`·`crtbegin.o` 뒤에 온다는 점이 이전 판의 표와 다릅니다.

### 2) `_start` — newlib ARM crt0의 실제 순서

`libgloss/arm/crt0.S`의 `_start`(같은 위치에 `_mainCRTStartup`도 정의)는 stack과 `.bss`를 준비한 뒤 다음을 실행합니다. 파일 앞부분에서 `_init`을 `__libc_init_array`, `_fini`를 `__libc_fini_array`로 `#define`해 두었으므로 아래의 `_init`·`.Lfini`가 그 두 함수입니다.

```asm
	ldr	r0, .Lfini
	bl	FUNCTION (atexit)
.Lweak_atexit:
	bl	FUNCTION (_init)
	movs	r0, r4
	movs	r1, r5
#endif
	bl	FUNCTION (main)

	bl	FUNCTION (exit)		/* Should not return.  */
```

순서는 `atexit(__libc_fini_array)` 등록 → `__libc_init_array()` → `main()` → `exit()`입니다. bare-metal 펌웨어에서는 보통 vendor startup의 `Reset_Handler`가 이 자리를 대신하고, [3-06](/blog/embedded/modern-recipes/part3-06-startup-code)에서 본 ST startup은 `__libc_init_array`와 `main`만 부릅니다. 그 차이가 아래 5)절의 destructor 결과로 나타납니다.

### 3) `.init_array` / `.fini_array`

전역 객체 생성자나 `__attribute__((constructor))` 함수는 `.init_array`에, `__attribute__((destructor))` 함수는 `.fini_array`에 함수 포인터로 들어갑니다.

```c
__attribute__((constructor))
void my_init(void) {
    printf("called before main\n");
}

__attribute__((destructor))
void my_fini(void) {
    printf("called at exit\n");
}
```

linker script는 이 section들을 모아 시작·끝 symbol을 정의합니다.

```text
.init_array :
{
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array*))
    PROVIDE_HIDDEN(__init_array_end = .);
} > FLASH
```

priority를 준 constructor는 `.init_array.NNNNN`처럼 번호 붙은 section에 들어가고, `SORT`가 그 번호 순으로 모읍니다. GCC 매뉴얼은 priority를 "bounded between 101 and 65535 inclusive"라고 정하고, "A constructor with a smaller priority number runs before a constructor with a larger priority number"라고 적습니다(0~100은 컴파일러·runtime 예약). 같은 문서는 C++ static 객체 생성자와 `constructor` 함수 사이의 순서가 "normally unspecified"라고도 적습니다.

### 4) `__libc_init_array` / `__libc_fini_array`

newlib `misc/init.c`의 `__libc_init_array`는 `.preinit_array` → `_init()`(`_HAVE_INIT_FINI`일 때) → `.init_array` 순으로 호출합니다(전체 코드는 [3-06](/blog/embedded/modern-recipes/part3-06-startup-code)의 4)절). `misc/fini.c`의 `__libc_fini_array`는 `__fini_array_start`·`__fini_array_end` 사이를 순회합니다. 이 함수가 불리는 것은 위 crt0처럼 누군가 `atexit`으로 등록했을 때뿐입니다.

### 5) System call stub — `_write`, `_sbrk`, `_exit`

newlib의 `printf`·`malloc`은 결국 `_write`·`_sbrk` 같은 함수를 부릅니다. bare-metal에는 OS가 없으므로 이 함수들을 직접 제공합니다. 아래는 이 글에서 실행한 stub입니다. UART 대신 semihosting `SYS_WRITE0`(0x04)으로 출력하고, `_sbrk`는 heap이 stack 영역 1 KB 앞까지만 자라도록 상한을 검사합니다.

```c
#include <errno.h>
#include <stdint.h>
#include <sys/stat.h>
#include <unistd.h>
/* semihosting SYS_WRITE0 (0x04) stands in for a UART here */
static int semi(int op, void *arg) {
    register int r0 __asm__("r0") = op; register void *r1 __asm__("r1") = arg;
    __asm__ volatile("bkpt 0xab" : "+r"(r0) : "r"(r1) : "memory"); return r0;
}
int _write(int fd, const char *buf, int len) {
    char chunk[65];
    (void)fd;
    for (int i = 0; i < len; i += 64) {
        int n = len - i < 64 ? len - i : 64;
        for (int k = 0; k < n; k++) chunk[k] = buf[i + k];
        chunk[n] = 0;
        semi(0x04, chunk);
    }
    return len;
}
extern char end;                      /* PROVIDE(end = .) in the linker script */
extern char _estack;
#define STACK_RESERVE 0x400           /* keep the heap below _estack - 1 KB */
static char *heap_end = &end;
void *_sbrk(int incr) {
    char *prev = heap_end;
    if (heap_end + incr > &_estack - STACK_RESERVE) { errno = ENOMEM; return (void *)-1; }
    heap_end += incr;
    return prev;
}
void _exit(int code) { semi(0x18, (void *)(code ? 0x20024 : 0x20026)); for (;;) {} }
int _close(int fd)                  { (void)fd; return -1; }
int _lseek(int fd, int off, int w)  { (void)fd; (void)off; (void)w; return 0; }
int _read(int fd, char *buf, int n) { (void)fd; (void)buf; (void)n; return 0; }
int _fstat(int fd, struct stat *st) { (void)fd; st->st_mode = S_IFCHR; return 0; }
int _isatty(int fd)                 { (void)fd; return 1; }
int _kill(int pid, int sig)         { (void)pid; (void)sig; return -1; }
int _getpid(void)                   { return 1; }
void _init(void) {}
void _fini(void) {}
void *__dso_handle = 0;              /* normally defined by crtbegin.o; -nostartfiles drops it */
```

마지막 줄은 직접 만든 startup으로 `-nostartfiles` 링크를 할 때 필요했습니다. C++ static 객체의 destructor를 등록하는 코드가 `__dso_handle`을 참조하는데, 이를 정의하는 `crtbegin.o`가 빠지기 때문입니다.

```text
main.cpp:(.text+0x9c): undefined reference to `__dso_handle'
ld: full.elf: hidden symbol `__dso_handle' isn't defined
```

stub 없이 `--specs=nosys.specs`로 링크하면 newlib가 같은 이름의 stub을 넣어 링크는 통과시키지만, 그 stub들은 "is not implemented and will always fail" 경고를 내는 실패 반환용입니다([3-01](/blog/embedded/modern-recipes/part3-01-cross-compiler)).

## 코드 / 실제 사용 예

main 전후의 호출 순서를 확인하는 프로그램입니다. startup은 [3-06](/blog/embedded/modern-recipes/part3-06-startup-code)의 어셈블리 `Reset_Handler`에서 `SystemInit` 호출을 빼고 `bl main` 뒤에 `bl exit`를 더한 것입니다.

```cpp
#include <stdio.h>
#include <stdlib.h>

extern "C" __attribute__((constructor(101))) void early_init(void)  { printf("ctor 101 early_init\n"); }
extern "C" __attribute__((constructor(200))) void normal_init(void) { printf("ctor 200 normal_init\n"); }
extern "C" __attribute__((destructor))       void my_fini(void)     { printf("destructor my_fini\n"); }

class Sensor {
public:
    Sensor()  { printf("Sensor::Sensor (no priority)\n"); }
    ~Sensor() { printf("Sensor::~Sensor\n"); }
};
static Sensor s_sensor;

static void bye(void) { printf("atexit handler\n"); }

int main(void) {
    atexit(bye);
    printf("main: hello %d, pi %f\n", 42, 3.14159);
    void *big = malloc(200 * 1024);   /* more than the RAM: _sbrk must refuse */
    printf("malloc(200 KB) = %p\n", big);
    return 0;                          /* startup calls exit(0) */
}
```

```bash
F="-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard -O1"
L="-nostartfiles -T stm32f4-init.ld startup.s vectors.o syscalls.o main.o"
arm-none-eabi-g++ $F $L -o full.elf                                    # newlib
arm-none-eabi-g++ $F --specs=nano.specs $L -o nano.elf                 # newlib-nano
arm-none-eabi-g++ $F --specs=nano.specs -u _printf_float $L -o nano-float.elf
```

```text
### full.elf                                ### nano.elf
ctor 101 early_init                         ctor 101 early_init
ctor 200 normal_init                        ctor 200 normal_init
Sensor::Sensor (no priority)                Sensor::Sensor (no priority)
main: hello 42, pi 3.141590                 main: hello 42, pi
malloc(200 KB) = 0x0                        malloc(200 KB) = 0
atexit handler                              atexit handler
Sensor::~Sensor                             Sensor::~Sensor
```

읽을 점이 네 가지입니다.

- priority 101 → 200 → priority 없는 C++ 생성자 순으로 불렸습니다. 이 순서는 이번 toolchain의 결과이고, GCC 매뉴얼은 생성자와 `constructor` 함수 사이 순서를 보장하지 않습니다.
- `exit()`이 `atexit`에 등록된 `bye`를 먼저, 그보다 먼저 등록된 `Sensor::~Sensor`를 나중에 불렀습니다(등록의 역순).
- `destructor my_fini`는 나오지 않았습니다. `.fini_array`의 함수는 `__libc_fini_array`가 부르는데, 이 startup은 crt0와 달리 `atexit(__libc_fini_array)`를 등록하지 않기 때문입니다.
- newlib-nano는 `%f`를 빈 문자열로 찍었고, `-u _printf_float`를 주면 `3.141590`이 나옵니다. 200 KB `malloc`은 `_sbrk`가 `ENOMEM`을 돌려 NULL이 됐습니다.

## 측정 / 비교

같은 프로그램의 크기(`arm-none-eabi-size`)입니다.

| 빌드 | text | data | bss |
| --- | ---: | ---: | ---: |
| newlib | 29356 | 1768 | 2324 |
| newlib-nano (`--specs=nano.specs`) | 7984 | 116 | 2284 |
| newlib-nano + `-u _printf_float` | 22484 | 480 | 2288 |

| 빌드 옵션 | 효과 |
| --- | --- |
| `--specs=nano.specs` | newlib-nano 사용 (위 표의 크기 차이) |
| `--specs=nosys.specs` | system call을 실패 반환 stub으로 채움 |
| `--specs=rdimon.specs` | semihosting 기반 system call (Debian 패키지에 포함) |
| `-u _printf_float` | nano에서 float printf 활성 |
| `-Wl,--wrap=malloc` | `malloc` 호출을 `__wrap_malloc`으로 돌림 (디버깅용) |

## 자주 보는 함정

> ⚠️ `_sbrk`가 상한을 검사하지 않음

newlib `libnosys`의 `_sbrk`는 `end`에서 시작해 요청만큼 포인터를 올릴 뿐 상한을 보지 않습니다([3-04](/blog/embedded/modern-recipes/part3-04-linker-script-basics)). 위 stub처럼 stack 쪽 경계를 검사해야 큰 `malloc`이 stack을 덮는 대신 NULL을 돌려받습니다.

> ⚠️ newlib-nano에서 `%f`가 빈 출력

위 실행처럼 nano의 기본 `printf`는 float 변환을 넣지 않아 `pi ` 뒤가 비었습니다. `-u _printf_float`로 켜고, 그 대가로 text가 7984에서 22484 byte로 늘었습니다.

> ⚠️ Stub `_write`가 UART 초기화 전에 호출

위 출력의 첫 줄들처럼 생성자는 `main`보다 먼저 `printf`를 부릅니다. `_write`가 UART를 쓰는데 UART 초기화가 `main`에 있다면, 생성자의 출력은 초기화 전 UART로 갑니다. 출력이 필요한 생성자가 있다면 UART 초기화를 그보다 먼저(priority가 더 작은 constructor 등) 둡니다.

> ⚠️ Constructor 순서에 기대기

GCC 매뉴얼대로 priority는 101~65535이고 작을수록 먼저입니다. priority가 없는 생성자끼리, 그리고 C++ 객체 생성자와 `constructor` 함수 사이의 순서는 보장되지 않으므로, 순서가 필요하면 priority를 명시하거나 초기화를 명시적인 함수 호출로 바꿉니다.

> ⚠️ 직접 만든 startup에서 destructor가 사라짐

newlib crt0는 `atexit(__libc_fini_array)`를 등록하지만, vendor startup이나 직접 만든 `Reset_Handler`는 보통 그러지 않습니다. 위 실행에서 `__attribute__((destructor))` 함수가 불리지 않은 이유입니다. bare-metal에서 종료 처리가 필요하면 startup에서 이를 등록하거나, `main`에서 돌아오지 않는 구조로 정리합니다.

## 정리

- GCC driver는 `crti.o`, `crtbegin.o`, `crt0.o`, 사용자 코드, 라이브러리, `crtend.o`, `crtn.o` 순으로 링크합니다.
- newlib ARM crt0의 `_start`는 `atexit(__libc_fini_array)` → `__libc_init_array` → `main` → `exit` 순입니다.
- constructor priority는 101~65535이고 작은 번호가 먼저이며, 등록된 종료 함수는 등록의 역순으로 불립니다.
- `_write`·`_sbrk`·`_exit` stub을 제공해야 `printf`·`malloc`·`exit`가 동작하고, `-nostartfiles`면 `__dso_handle`도 직접 정의합니다.
- newlib-nano는 같은 프로그램에서 text를 29,356 byte에서 7,984 byte로 줄였고, float `printf`는 `-u _printf_float`로 켭니다.

다음 편에서는 **메모리 레이아웃**을 다룹니다. stack/heap/static이 어디 사는지의 전체 그림입니다.

## 관련 항목

- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-06: 스타트업 코드 분석](/blog/embedded/modern-recipes/part3-06-startup-code)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- 더 깊이 — [Embedded C++ for Real Systems: static 초기화](/blog/embedded/embedded-cpp/00-preface)
