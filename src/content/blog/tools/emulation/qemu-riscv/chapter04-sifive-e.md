---
title: "Ch 4: sifive_e 머신"
date: 2026-05-17T22:00:00
description: "QEMU sifive_e — E31 코어 에뮬레이션, 주변장치 모델을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 4
tags: [RISC-V, QEMU, SiFive, E31, HiFive1, Bare-metal]
draft: true
---

`virt` 머신이 *Linux*급 시스템이라면, `sifive_e`는 *마이크로컨트롤러*급입니다. SiFive의 첫 양산 RISC-V 보드인 **HiFive1**과 호환되는 가상 머신으로, 메모리가 작고 OS 없는 베어메탈 펌웨어 개발에 적합합니다. Arduino-스타일 코드를 RISC-V로 옮길 때 가장 빠른 환경이기도 합니다.

이 장은 sifive_e의 머신 구성, 메모리 맵, 주변 장치, SiFive Freedom Metal 호환성, 베어메탈 코드 실행 흐름을 다룹니다.

## SiFive HiFive1과 E31

HiFive1은 2016년 SiFive가 발표한 RISC-V 마이크로컨트롤러 평가 보드입니다.

| 항목 | 값 |
|------|-----|
| SoC | SiFive FE310-G000 |
| CPU 코어 | E31 (RV32IMAC) |
| 클럭 | 320MHz (실 보드) |
| 코어 수 | 1 |
| Flash | 16MB QSPI |
| RAM | 16KB DTIM (Data Tightly Integrated Memory) |
| 디버그 | JTAG, SEGGER J-Link Mini |

QEMU의 `sifive_e`는 이 SoC를 *기능적*으로 따라가는 머신입니다. 클럭은 emulation이므로 실 hertz 의미가 없지만, 메모리 맵·peripheral·interrupt 구조는 실 보드와 동일합니다.

## 실행

빌드된 ELF 펌웨어를 곧장 실행할 수 있습니다.

```bash
qemu-system-riscv32 -machine sifive_e -nographic \
    -kernel firmware.elf
```

`-bios none`이 기본이라 별도 firmware blob을 줄 필요가 없습니다. 베어메탈 펌웨어는 `-kernel`로 직접 로드되어 reset vector부터 시작합니다.

```text
Hello, RISC-V from HiFive1 emulator!
counter = 0
counter = 1
counter = 2
```

종료는 `Ctrl-A`, `x`.

## 메모리 맵

HiFive1의 메모리 맵을 QEMU가 그대로 따라갑니다.

| 주소 | 영역 |
|------|------|
| `0x0000_0000` | Debug |
| `0x0200_0000` | CLINT |
| `0x0C00_0000` | PLIC (외부 IRQ) |
| `0x1000_0000` | AON (Always-On block) |
| `0x1000_8000` | PRCI (Power Reset Clock Interrupt) |
| `0x1001_0000` | OTP (One-Time Programmable memory) |
| `0x1001_2000` | GPIO |
| `0x1001_3000` | UART0 |
| `0x1001_4000` | QSPI0 (Flash) |
| `0x1001_5000` | PWM0 |
| `0x1002_3000` | UART1 |
| `0x1002_4000` | SPI1 |
| `0x1002_5000` | PWM1 |
| `0x2000_0000` | Flash (XIP, eXecute-In-Place) |
| `0x8000_0000` | DTIM (16KB) |

Flash는 *XIP*로 매핑되어 있어서 펌웨어가 그 주소에서 *직접 실행*됩니다. RAM은 16KB로 매우 작으므로 stack/data만 그리로 옮기는 패턴이 일반적입니다.

## 가장 작은 베어메탈

GCC RISC-V toolchain으로 직접 빌드하는 단순한 예.

```c
// main.c
#define UART0_BASE   0x10013000
#define UART_TXDATA  (*(volatile unsigned int *)(UART0_BASE + 0x00))
#define UART_TXCTRL  (*(volatile unsigned int *)(UART0_BASE + 0x08))

void uart_init(void) {
    UART_TXCTRL = 1;  // TX enable
}

void uart_putc(char c) {
    while (UART_TXDATA & (1u << 31)) ;  // TX full bit
    UART_TXDATA = c;
}

void uart_puts(const char *s) {
    while (*s) uart_putc(*s++);
}

int main(void) {
    uart_init();
    uart_puts("Hello from sifive_e\r\n");
    while (1) ;
}
```

reset vector + stack 셋업.

```asm
# start.S
.section .text.init
.global _start
_start:
    la sp, _stack_top
    call main
1:  j 1b
```

링커 스크립트.

```ld
/* link.ld */
MEMORY {
    flash (rx)  : ORIGIN = 0x20000000, LENGTH = 16M
    ram   (rwx) : ORIGIN = 0x80000000, LENGTH = 16K
}

SECTIONS {
    .text : { *(.text.init) *(.text*) } > flash
    .rodata : { *(.rodata*) } > flash
    .data : { *(.data*) } > ram AT > flash
    .bss : { *(.bss*) *(COMMON) } > ram
    _stack_top = ORIGIN(ram) + LENGTH(ram);
}
```

빌드와 실행.

```bash
riscv64-unknown-elf-gcc -march=rv32imac -mabi=ilp32 \
    -nostartfiles -T link.ld -o fw.elf start.S main.c

qemu-system-riscv32 -machine sifive_e -nographic -kernel fw.elf
```

콘솔에 `Hello from sifive_e`가 출력되면 베어메탈 환경이 완성입니다.

## 주변 장치 모델

QEMU의 sifive_e가 모사하는 peripheral과 그 *충실도*.

| 디바이스 | 모델 | 비고 |
|----------|------|------|
| UART0/UART1 | 정확 | TX/RX FIFO, IRQ |
| QSPI0 (Flash) | XIP만 | flash write는 제한적 |
| GPIO | 부분 | input/output, IRQ |
| PWM0/1/2 | 미흡 | 일부 register만 |
| PRCI | 부분 | PLL는 모델링 미흡 |
| OTP | 미흡 | read-only, 실제 fuse는 시뮬레이션 X |
| AON | 부분 | watchdog 등 |

UART와 GPIO는 *충실히* 모사됩니다. PWM/OTP/PRCI는 펌웨어가 *값을 읽고 진행 결정*에 사용하는 정도까지만 모사되고, 실 신호로 외부에 영향을 주는 부분은 없습니다.

## SiFive Freedom Metal 호환

[Freedom Metal](https://github.com/sifive/freedom-metal)은 SiFive가 제공하는 베어메탈 HAL 라이브러리입니다. QEMU sifive_e에서 Freedom Metal 기반 코드를 *그대로* 실행할 수 있습니다.

```c
#include <metal/uart.h>
#include <metal/cpu.h>

int main(void) {
    struct metal_uart *uart = metal_uart_get_device(0);
    metal_uart_init(uart, 115200);

    const char *msg = "Hello via Freedom Metal\r\n";
    while (*msg) metal_uart_putc(uart, *msg++);

    return 0;
}
```

빌드는 Freedom Metal의 Makefile에 `TARGET=sifive-hifive1`을 줘서 생성. 결과 ELF를 `qemu-system-riscv32 -machine sifive_e -kernel ...`로 실행하면 정상 동작합니다.

## 디버깅

`-s -S` 옵션은 sifive_e에서도 동일하게 작동합니다.

```bash
qemu-system-riscv32 -machine sifive_e -nographic \
    -kernel fw.elf -s -S
```

다른 터미널에서:

```bash
riscv64-unknown-elf-gdb fw.elf
```

```text
(gdb) target remote :1234
(gdb) break main
(gdb) continue
```

flash XIP 영역(`0x20000000~`)에 breakpoint를 걸려면 *hardware breakpoint*가 필요합니다.

```text
(gdb) hbreak *0x20000040
```

## CLINT와 PLIC

E31에서 인터럽트 구조:
- **CLINT** (`0x02000000`) — software/timer 인터럽트 per HART
- **PLIC** (`0x0C000000`) — 외부 디바이스 IRQ를 aggregate

timer interrupt 활성화 예:

```c
#define CLINT_MTIMECMP  (*(volatile uint64_t *)0x02004000)
#define CLINT_MTIME     (*(volatile uint64_t *)0x0200BFF8)

void timer_set(uint64_t deadline) {
    CLINT_MTIMECMP = deadline;
}

void timer_init_periodic_1ms(void) {
    timer_set(CLINT_MTIME + 32768);  // 32.768kHz LFROSC 기준 1ms
    set_csr(mie, MIP_MTIP);          // timer IE
    set_csr(mstatus, MSTATUS_MIE);   // global IE
}
```

PLIC을 통한 UART RX IRQ도 비슷한 패턴으로 구성합니다.

## sifive_e의 한계

QEMU sifive_e는 *학습*과 *기본 펌웨어 개발*에는 충분하지만, 실 HiFive1과 다른 점이 있습니다.

- **클럭 정확도** — emulation이므로 PWM 출력 주파수 같은 *timing-critical* 동작은 무의미.
- **Flash write** — XIP 영역에 *programming*을 시도하면 결과가 다를 수 있음.
- **PMU(Power Management Unit)** — 일부 power state는 미구현.
- **외부 peripheral** — SPI/I2C로 *외부 칩*과 통신하는 코드는 QEMU에서 상대편 디바이스를 별도 attach해야 함.

실 보드가 손에 있다면 *알고리즘과 register 시퀀스*를 QEMU에서 검증한 뒤 timing-critical 부분만 실 보드에서 마무리하는 흐름이 보통입니다.

## 정리

- `sifive_e`는 SiFive HiFive1 호환 마이크로컨트롤러급 QEMU 머신.
- E31 코어(RV32IMAC), 16KB DTIM, 16MB QSPI flash가 표준 구성.
- Flash는 XIP로 `0x2000_0000`에 매핑되어 거기서 *직접 실행*.
- 베어메탈 펌웨어는 `-kernel firmware.elf`로 곧장 로드됨. `-bios` 불필요.
- UART·GPIO·CLINT·PLIC은 충실히 모사. PWM·OTP·PMU는 제한적.
- Freedom Metal HAL이 그대로 호환되어 SiFive 공식 라이브러리로 개발 가능.
- 한계는 timing accuracy와 외부 peripheral 인터랙션. *알고리즘 검증*에는 충분.

## 다음 장 예고

다음 장은 한 단계 더 큰 SiFive 머신인 **sifive_u**를 다룹니다. U54 코어와 S-mode 지원으로 Linux를 부팅하는 환경이 등장합니다.

## 관련 항목

- [Ch 3: QEMU + GDB 디버깅](/blog/tools/emulation/qemu-riscv/chapter03-gdb-debugging)
- [Ch 5: sifive_u 머신](/blog/tools/emulation/qemu-riscv/chapter05-sifive-u)
- [RISC-V 베어메탈 부트](/blog/systems/riscv/baremetal-boot/chapter01-overview)
- [Modern Embedded Recipes — Linker Script](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
