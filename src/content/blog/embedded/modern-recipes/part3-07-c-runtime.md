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

> **"crt0는 OS와 application 사이의 가장 얇은 layer입니다."** Linux 환경의 startup도 본질은 `.data` 복사와 `.bss` 클리어, 그리고 `__libc_init_array` 호출입니다.

## 어떤 상황에서 쓰나

- newlib, picolibc의 내부 동작 이해
- `printf`가 호출하는 system call(`_write` 등) stub 작성
- Linux 임베디드에서 static linking
- `atexit`, `exit` 동작 분석

## 핵심 개념

### 1) crt0, crti, crtn — 무엇이 차이인가

GCC의 startup은 여러 작은 object 파일로 나뉩니다.

| 파일 | 내용 |
| --- | --- |
| crt0.o | `_start` (entry point) |
| crti.o | `.init`/`.fini` 시작 부분 |
| crtbegin.o | C++ constructor list 시작 |
| (your code) | application |
| crtend.o | C++ constructor list 끝 |
| crtn.o | `.init`/`.fini` 끝 부분 |

link 시 이 순서로 들어가고, `.init` 섹션이 자연스럽게 모입니다.

### 2) `_start` — entry point

Linux나 bare-metal newlib의 entry:

```asm
_start:
    @ stack 초기화 (Linux는 kernel이 해 줌)
    @ argc, argv, envp 준비 (Linux)
    @ 또는 .data 복사, .bss 클리어 (bare)
    
    @ __libc_init_array → C++ ctors
    bl  __libc_init_array
    
    @ main 호출
    bl  main
    
    @ exit
    bl  exit
```

bare-metal에서는 보통 startup file의 `Reset_Handler`가 이 초기화 역할을 담당합니다. `_start`라는 이름과 실제 entry 구성은 linker script, C runtime, startup file 조합에 따라 달라집니다.

### 3) `.init_array` / `.fini_array`

전역 객체나 `__attribute__((constructor))` 함수들이 모이는 section입니다.

```c
// 자동으로 .init_array에 들어감
__attribute__((constructor))
void my_init(void) {
    printf("called before main\n");
}

__attribute__((destructor))
void my_fini(void) {
    printf("called at exit\n");
}
```

linker는:

```text
.init_array :
{
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array*))
    PROVIDE_HIDDEN(__init_array_end = .);
} > FLASH
```

`SORT`는 linker script의 정렬 규칙에 따라 input section을 정렬합니다. constructor priority가 있더라도 toolchain/linker 규칙을 확인해야 하며, priority가 없는 서로 다른 translation unit의 순서를 애플리케이션 계약으로 가정해서는 안 됩니다.

### 4) `__libc_init_array` / `__libc_fini_array`

newlib가 제공하는 함수입니다. `.init_array` / `.fini_array`를 순회합니다.

```c
void __libc_init_array(void) {
    /* .preinit_array */
    /* .init() function (legacy) */
    /* .init_array */
    size_t count = __init_array_end - __init_array_start;
    for (size_t i = 0; i < count; i++) {
        __init_array_start[i]();
    }
}
```

runtime이 `exit()` 경로에서 이를 호출하도록 구성된 경우 `__libc_fini_array`가 destructor 처리를 담당합니다. bare-metal에서는 `exit` 경로 자체가 생략되거나 별도로 구현될 수 있습니다.

### 5) System call stub — `_write`, `_sbrk`, `_close`

newlib의 `printf` 같은 함수는 결국 system call로 출력합니다. bare-metal에는 OS가 없으므로 stub을 직접 제공합니다.

```c
#include <unistd.h>
#include <errno.h>

// stdout 출력 — UART로 redirect
int _write(int fd, const char *buf, int len) {
    for (int i = 0; i < len; i++) {
        uart_putc(buf[i]);
    }
    return len;
}

// heap 확장 — malloc 호출 시 사용
extern uint32_t _end;          // .bss 끝 (linker가 제공)
static uint8_t *heap_end = (uint8_t *)&_end;

void *_sbrk(int incr) {
    uint8_t *prev = heap_end;
    if ((uintptr_t)(heap_end + incr) > 0x20020000) {  // SRAM 한계
        errno = ENOMEM;
        return (void *)-1;
    }
    heap_end += incr;
    return prev;
}

// 기본 stub들
int _close(int fd)                  { return -1; }
int _lseek(int fd, int off, int w)  { return 0; }
int _read(int fd, char *buf, int n) { return 0; }
int _fstat(int fd, struct stat *st) { st->st_mode = S_IFCHR; return 0; }
int _isatty(int fd)                 { return 1; }
```

`--specs=nosys.specs`는 모든 stub을 기본 error 반환으로 채워 link만 통과시킵니다. `--specs=nano.specs`는 newlib-nano 사용.

## 코드 / 실제 사용 예

`printf`가 동작하기까지의 흐름:

```c
printf("hello\n");
   ↓
vfprintf(stdout, "hello\n", ...)   // format 처리
   ↓
__sfvwrite                          // buffering
   ↓
_write(1, "hello\n", 6)             // 사용자 stub
   ↓
uart_putc 반복
```

main 전후 흐름:

```c
__attribute__((constructor(101)))
void early_init(void) { /* 가장 먼저 */ }

__attribute__((constructor(200)))
void normal_init(void) { /* 두 번째 */ }

class Sensor {
public:
    Sensor() { initialize(); }
};
static Sensor s_sensor;            // priority 없는 ctor

int main(void) {
    // 호출 순서:
    // 1. early_init
    // 2. normal_init
    // 3. Sensor::Sensor (s_sensor)
    // 4. main
    return 0;
}
```

## 측정 / 비교

| 빌드 옵션 | 효과 |
| --- | --- |
| `--specs=nano.specs` | newlib-nano 사용 (작은 크기) |
| `--specs=nosys.specs` | system call stub을 default error로 |
| `--specs=rdimon.specs` | semihosting 사용 (debugger I/O) |
| `-u _printf_float` | nano에서 float printf 활성 |
| `-Wl,--wrap=malloc` | malloc을 wrapping (디버깅용) |

| C 런타임 크기 (hello world) |
| --- |
| `--specs=nosys.specs` (full newlib) | toolchain·옵션·사용 API에 따라 달라짐 |
| `--specs=nano.specs` | toolchain·옵션·사용 API에 따라 달라짐 |
| picolibc | toolchain·옵션·사용 API에 따라 달라짐 |
| 사용자 직접 stub | runtime 구현에 따라 달라짐 |

## 자주 보는 함정

> ⚠️ `_sbrk`가 stack과 충돌

heap이 위로 자라고 stack은 아래로 자랍니다. `_sbrk`에서 stack pointer를 체크 안 하면 heap이 stack 영역을 침범. linker script에서 heap top을 명시.

> ⚠️ `printf` float 지원 없어 `%f`가 빈 출력

newlib-nano는 기본적으로 float printf가 disabled. `-u _printf_float` link 옵션 필요.

> ⚠️ Stub `_write`가 UART 초기화 전에 호출

C++ static constructor에서 `printf`를 부르면 UART가 아직 setup 안 됐을 수 있습니다. 순서 의존성 주의.

> ⚠️ Constructor에서 다른 constructor에 의존

priority 없으면 link 순서. 명확한 순서가 필요하면 `__attribute__((constructor(N)))`로 priority 지정 (101 ~ 65535, 작은 게 먼저).

> ⚠️ Bare-metal에서 `atexit` 사용 후 `main` 반환

`atexit` 함수가 등록된 경우 `main` 반환 시 runtime의 종료 경로가 이를 호출할 수 있습니다. bare-metal 애플리케이션은 보통 main이 반환되지 않도록 설계하거나, 반환·종료 정책을 명시합니다.

## 정리

- crt0은 OS와 application 사이의 가장 얇은 layer입니다.
- `_start` 또는 vendor/startup이 정한 reset entry에서 runtime 초기화를 시작하며, bare-metal의 실제 entry 이름과 구성은 toolchain에 따라 달라집니다.
- `.init_array` / `.fini_array`에 C++ static 생성자와 destructor가 모입니다.
- `_write`, `_sbrk` 같은 system call stub을 사용자가 제공해야 `printf`, `malloc`이 동작합니다.
- `--specs=nano.specs`는 기능과 크기를 줄인 newlib 변형을 선택할 수 있지만, 실제 절감 폭은 toolchain·옵션·사용 API로 측정해야 합니다.
- Stack/heap 영역 설정과 constructor 순서가 흔한 함정입니다.

다음 편에서는 **메모리 레이아웃**을 다룹니다. stack/heap/static이 어디 사는지의 전체 그림입니다.

## 관련 항목

- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-06: 스타트업 코드 분석](/blog/embedded/modern-recipes/part3-06-startup-code)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- 더 깊이 — [Embedded C++ for Real Systems: static 초기화](/blog/embedded/embedded-cpp/00-preface)
