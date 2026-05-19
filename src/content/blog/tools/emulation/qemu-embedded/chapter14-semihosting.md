---
title: "Ch 14: Semihosting"
date: 2026-05-17T14:00:00
description: "Host I/O on bare-metal — UART 없이 printf하기."
tags: [QEMU, semihosting, baremetal, arm-semihosting]
series: "QEMU Embedded Emulation"
seriesOrder: 14
draft: true
---

## 이 챕터의 의도

UART도 없는 bare-metal MCU에서 printf 디버깅이 가능할까? Semihosting은 guest가 특수 명령을 trigger해 host(QEMU)의 syscall을 빌려 쓰는 메커니즘이다. 펌웨어 개발자가 매우 자주 쓰는 트릭이며, 특히 CI에서 firmware의 exit code로 테스트 결과를 받는 데 유용하다.

## 핵심 항목

- ✦ Semihosting 개념 — guest의 *trap*을 host emulator/debugger가 가로채 *host I/O* 대행
- ✦ Spec — **ARM Semihosting** (Document ID `ARM IHI 0054`), **RISC-V Semihosting** (RISC-V semihosting v1.0)
- ✦ Trigger 방식
  - ARM A/R-profile: `SVC #0x123456` (AArch32) or `HLT #0xF000` (AArch64)
  - ARM M-profile: `BKPT 0xAB`
  - RISC-V: `slli x0,x0,0x1f` + `ebreak` + `srai x0,x0,7` sequence
- ✦ Register convention
  - 호출: `r0` = operation number, `r1` = argument block pointer
  - 응답: `r0` = return value
- ✦ Operation
  - `SYS_OPEN` (0x01), `SYS_CLOSE` (0x02), `SYS_WRITEC` (0x03 single char), `SYS_WRITE0` (0x04 string), `SYS_WRITE` (0x05), `SYS_READ` (0x06)
  - `SYS_EXIT` (0x18) — guest 종료 + host exit code
  - `SYS_TIME` (0x11), `SYS_CLOCK` (0x10) — host clock
- ✦ QEMU flag — `-semihosting` 활성, `-semihosting-config enable=on,target=native|gdb`
- ✦ Library 통합 — **Newlib** semihosting backend (`libnosys`/`librdimon`), **picolibc** semihosting glue
- ✦ Use case — UART 없는 STM32 칩 초기 부팅, 단위 테스트 결과 host로 전송, CI firmware test exit code
- ✦ 한계 — 매우 느림 (vmexit 비용), 실 HW에선 안 됨 → 개발 only
- ◦ MultiArch: Cortex-M에서 `BKPT 0xAB` 못 잡으면 hard fault → debugger/QEMU 둘 다 필요

## 다이어그램 (3)

1. Semihosting trigger 흐름 — guest BKPT → QEMU intercept → host syscall → return
2. Register convention — `r0` op + `r1` arg block
3. Newlib + semihosting backend — printf → `_write` → SYS_WRITE → QEMU stdout

## 코드 sketch

```c
/* Bare-metal Cortex-M: 직접 semihosting */
static inline int sh_write0(const char *s) {
    register int r0 asm("r0") = 0x04;          /* SYS_WRITE0 */
    register const char *r1 asm("r1") = s;
    asm volatile("bkpt #0xAB" : "+r"(r0) : "r"(r1) : "memory");
    return r0;
}

static inline void sh_exit(int code) {
    register int r0 asm("r0") = 0x18;          /* SYS_EXIT */
    register int r1 asm("r1") = code;
    asm volatile("bkpt #0xAB" :: "r"(r0), "r"(r1));
    while (1);
}

void main(void) {
    sh_write0("Hello from bare-metal\n");
    sh_exit(0);
}
```

```bash
# QEMU 실행 (semihosting 활성)
qemu-system-arm -M mps2-an385 -nographic -semihosting -kernel hello.elf
# stdout: "Hello from bare-metal"
# exit code 0

# CI에서 test 결과 받기
qemu-system-arm -M netduinoplus2 -nographic -semihosting -kernel test.elf
echo "test exit code: $?"
```

```c
/* Newlib semihosting — linker option */
/* -specs=rdimon.specs -lrdimon */
#include <stdio.h>

int main(void) {
    printf("printf works via semihosting!\n");   // → SYS_WRITE
    return 42;                                    // → SYS_EXIT(42)
}
```

## 레퍼런스

- ARM Semihosting (ARM IHI 0054C)
- RISC-V Semihosting v1.0
- QEMU `Documentation/about/index.rst::Semihosting`
- Newlib `libgloss/arm/syscalls.c`
- picolibc `picolibc/semihost/`
- LWN "Bare-metal printf via semihosting"

## 관련 항목

- [Ch 11: Bare-metal 부팅](/blog/tools/emulation/qemu-embedded/chapter11-baremetal) (기존)
- [Ch 13: 벤더 머신](/blog/tools/emulation/qemu-embedded/chapter13-vendor-machines)
- [Ch 20: CI matrix](/blog/tools/emulation/qemu-embedded/chapter20-ci-matrix)
