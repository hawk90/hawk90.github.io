---
title: "Ch 12: 부트 디버깅"
date: 2026-05-17T06:00:00
description: "RISC-V 부트 디버깅 — UART 초기화, 초기 프린트, JTAG, 흔한 문제를 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 12
tags: [RISC-V, Debug, UART, JTAG, Boot]
draft: true
---

## 개요

부트 과정에서 발생하는 문제를 디버깅하는 방법을 다룬다.

---

## 초기 UART 출력

TODO:

```c
#define UART_BASE 0x10000000

void uart_putc(char c) {
    volatile uint8_t *uart = (uint8_t *)UART_BASE;
    while (uart[5] & 0x20 == 0);  // TX ready 대기
    uart[0] = c;
}

void early_print(const char *s) {
    while (*s) uart_putc(*s++);
}
```

---

## OpenSBI 콘솔

TODO:

```c
#include <sbi/sbi_console.h>
sbi_printf("Debug: %x\n", value);
```

---

## U-Boot 디버그

TODO:

```
CONFIG_DEBUG_UART=y
CONFIG_DEBUG_UART_NS16550=y
```

---

## JTAG 디버깅

TODO:

```bash
# OpenOCD 실행
openocd -f interface/ftdi/olimex-arm-usb-ocd.cfg \
        -f target/riscv.cfg

# GDB 연결
riscv64-unknown-elf-gdb u-boot
(gdb) target remote :3333
(gdb) load
(gdb) break _start
(gdb) continue
```

---

## QEMU 디버깅

TODO:

```bash
qemu-system-riscv64 -M virt -nographic -s -S ...

# 다른 터미널
riscv64-unknown-elf-gdb
(gdb) target remote :1234
```

---

## 흔한 문제

TODO:

| 증상 | 원인 | 해결 |
|------|------|------|
| 출력 없음 | UART 미초기화 | 클럭, 핀 설정 확인 |
| 무한 루프 | 트랩 핸들러 없음 | mtvec 설정 |
| 점프 실패 | 잘못된 주소 | 링커 스크립트 확인 |
| DTB 파싱 실패 | 잘못된 DTB 주소 | a1 레지스터 확인 |

---

## 트랩 원인 확인

TODO:

```c
void trap_handler(void) {
    unsigned long mcause, mepc, mtval;
    asm volatile("csrr %0, mcause" : "=r"(mcause));
    asm volatile("csrr %0, mepc" : "=r"(mepc));
    asm volatile("csrr %0, mtval" : "=r"(mtval));
    early_print("TRAP!\n");
    // mcause, mepc, mtval 출력
    while(1);
}
```

---

## 정리

- 초기 UART 출력이 가장 기본
- JTAG으로 레지스터/메모리 검사
- QEMU -s -S로 GDB 연결
- mcause/mepc/mtval로 트랩 분석

---

## 시리즈 마무리

이 시리즈에서 RISC-V 베어메탈 부트의 전체 과정을 다뤘다.

---

## 관련 시리즈

- [RISC-V ISA 해부](/blog/systems/riscv/isa-anatomy/chapter01-what-is-riscv) — ISA 기초
- [RISC-V QEMU 심화](/blog/tools/emulation/qemu-riscv/chapter01-overview) — 에뮬레이션 실습
- [RISC-V 임베디드 실습](/blog/embedded/riscv-practice/chapter01-toolchain) — 실제 보드

---

## 참고 자료

- [OpenOCD RISC-V](https://openocd.org/doc/html/RISC_002dV.html)
- [GDB Remote Serial Protocol](https://sourceware.org/gdb/onlinedocs/gdb/Remote-Protocol.html)
