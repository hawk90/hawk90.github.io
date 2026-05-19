---
title: "Ch 11: 베어메탈 펌웨어"
date: 2026-05-17T11:00:00
description: "QEMU에서 OS 없이 베어메탈 펌웨어를 실행한다."
tags: [QEMU, Baremetal, Firmware, linker-script, reset-vector]
series: "QEMU Embedded Emulation"
seriesOrder: 11
draft: true
---

**Bare-metal**은 OS 없이 *하드웨어 직접 위에서* 실행되는 코드입니다. 부트 ROM, 초기 펌웨어, 보안 모니터, 작은 RTOS 등이 해당. QEMU는 baremetal 코드를 직접 `-kernel`로 실행할 수 있어 *MCU 펌웨어 개발*에 매우 자주 쓰입니다.

## 무엇이 다른가

| 항목 | Linux 환경 | Bare-metal |
|------|------------|-------------|
| OS | Linux kernel | 없음 |
| Stack | 자동 | linker에서 명시 |
| Memory mgmt | malloc/mmap | 직접 |
| I/O | syscall | MMIO 직접 |
| Console | `printk` → driver | UART 직접 또는 semihosting |
| Boot | bootloader → kernel | reset → main |

bare-metal은 *깨지기 쉽지만 정확*합니다 — 모든 동작이 *내 코드*입니다.

## 가장 작은 예제 — ARM Cortex-A

```c
/* main.c */
#define UART0    ((volatile unsigned int *)0x09000000)   // PL011 데이터 레지스터

static void uart_putc(char c) {
    *UART0 = c;
}

static void uart_puts(const char *s) {
    while (*s) uart_putc(*s++);
}

void c_entry(void) {
    uart_puts("Hello from bare-metal ARM!\n");
    while (1);
}
```

reset vector 어셈블리.

```asm
/* start.S */
.section .text.boot
.global _start

_start:
    /* 다른 코어는 정지 */
    mrs x0, mpidr_el1
    and x0, x0, #0xff
    cbnz x0, hang

    /* stack 설정 */
    ldr x1, =_stack_top
    mov sp, x1

    /* bss zero */
    ldr x2, =_bss_start
    ldr x3, =_bss_end
1:  cmp x2, x3
    bge 2f
    str xzr, [x2], #8
    b 1b

2:  /* C로 점프 */
    bl c_entry

hang:
    wfe
    b hang
```

Linker script.

```ld
/* link.ld */
ENTRY(_start)

MEMORY {
    RAM (rwx) : ORIGIN = 0x40000000, LENGTH = 128M
}

SECTIONS {
    . = 0x40000000;

    .text : {
        *(.text.boot)
        *(.text*)
    } > RAM

    .rodata : { *(.rodata*) } > RAM

    .data : { *(.data*) } > RAM

    .bss : {
        _bss_start = .;
        *(.bss*)
        *(COMMON)
        _bss_end = .;
    } > RAM

    . = ALIGN(16);
    . += 0x10000;
    _stack_top = .;
}
```

빌드와 실행.

```bash
aarch64-linux-gnu-gcc -nostartfiles -nostdlib -T link.ld \
    -o firmware.elf start.S main.c

qemu-system-aarch64 -M virt -cpu cortex-a72 -nographic \
    -kernel firmware.elf
```

콘솔에 `Hello from bare-metal ARM!` 출력.

## QEMU의 `-kernel`

QEMU는 `-kernel` 인자가 ELF면 *적절한 entry point*로 점프합니다.

- ARM/AArch64: kernel image header가 없으면 binary 시작 주소(`0x4000_0000`)
- ELF: entry point에서 시작
- RISC-V: 마찬가지로 ELF entry 또는 binary 첫 주소

따라서 *별도 부트로더 없이* firmware ELF를 곧장 실행할 수 있습니다.

## RISC-V bare-metal

```c
/* main.c — RISC-V */
#define UART0    ((volatile unsigned int *)0x10000000)   // NS16550

static void uart_putc(char c) {
    *UART0 = c;
}

void c_entry(void) {
    const char *s = "Hello from bare-metal RISC-V!\n";
    while (*s) uart_putc(*s++);
    while (1);
}
```

reset vector.

```asm
# start.S — RISC-V
.section .text.init
.global _start

_start:
    csrr a0, mhartid
    bnez a0, hang

    la sp, _stack_top
    call c_entry

hang:
    wfi
    j hang
```

Linker script.

```ld
ENTRY(_start)
MEMORY {
    RAM (rwx) : ORIGIN = 0x80000000, LENGTH = 128M
}
SECTIONS {
    . = 0x80000000;
    .text : { *(.text.init) *(.text*) } > RAM
    .rodata : { *(.rodata*) } > RAM
    .data : { *(.data*) } > RAM
    .bss  : { *(.bss*) } > RAM
    . = ALIGN(16);
    . += 0x10000;
    _stack_top = .;
}
```

빌드와 실행.

```bash
riscv64-linux-gnu-gcc -nostartfiles -nostdlib -T link.ld \
    -mcmodel=medany -o firmware.elf start.S main.c

qemu-system-riscv64 -M virt -nographic -kernel firmware.elf
```

`-bios none`이 기본일 수도 있으므로 *firmware가 M-mode 인식*하지 않으면 `-bios none`을 명시.

## Newlib + libc 사용

`-nostdlib`로 *완전한 bare-metal*이 가능하지만, *printf 같은 편의*가 필요하면 newlib semihosting backend를 link.

```bash
# Cortex-M(MPS2)
arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb \
    --specs=rdimon.specs -lrdimon \
    -T mps2.ld -o firmware.elf start.S main.c
```

`rdimon.specs`가 semihosting 기반 `_write`·`_read` 등을 제공. main에서 `printf("...");`가 *그냥 작동*.

## Exception handler

bare-metal에서 *fault* 발생 시 무한 hang. exception vector를 설정해야 진단 가능.

```asm
/* ARM AArch64 — 부분 */
.section .text.vectors
.balign 0x800
_vectors:
    /* Sync EL1 */
    .balign 0x80
    b sync_handler
    /* IRQ EL1 */
    .balign 0x80
    b irq_handler
    /* FIQ EL1 */
    .balign 0x80
    b fiq_handler
    /* SError EL1 */
    .balign 0x80
    b serror_handler

sync_handler:
    mrs x0, esr_el1
    mrs x1, elr_el1
    /* uart_print_hex(x0); uart_print_hex(x1); */
    b .
```

C에서:

```c
void c_entry(void) {
    /* vbar_el1에 _vectors 설정 */
    extern char _vectors[];
    asm volatile("msr vbar_el1, %0" :: "r"(_vectors));
    /* ... */
}
```

이렇게 두면 *kernel panic 직전*에 register dump가 콘솔에.

## 디버깅 — GDB 결합

Ch 10의 GDB stub이 bare-metal에도 적용됩니다.

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -nographic \
    -kernel firmware.elf -s -S
```

```bash
aarch64-linux-gnu-gdb firmware.elf
(gdb) target remote :1234
(gdb) break c_entry
(gdb) continue
```

bare-metal에서는 *모든 메모리 접근*이 driver를 거치지 않으므로 GDB가 *완전히* 제어 가능. 매우 강력합니다.

## CMSIS·HAL 없이 vs 함께

ARM Cortex-M 펌웨어는 보통 *vendor HAL*(STM32 HAL, NXP MCUXpresso 등)이나 *CMSIS*(ARM 표준)를 link해 register 매크로·startup 코드를 가져옵니다. QEMU vendor machine에서 시뮬레이션할 때 *그 HAL이 그대로 동작*하므로, 학습이나 unit test에 매우 유용합니다(Ch 13 참조).

## 흔한 함정

- **stack 설정 없이 C 진입** — `sp`가 0이면 첫 push에서 fault.
- **bss 초기화 안 함** — global 변수가 random 값.
- **linker address 불일치** — `0x4000_0000`(ARM virt) vs `0x8000_0000`(RISC-V virt).
- **`-nostartfiles`/`-nostdlib` 누락** — host용 startup이 link되어 깨짐.
- **endian 가정** — ARM big-endian builds는 별도. 기본 little.

## 정리

- Bare-metal = OS 없는 *직접 하드웨어 위*. linker script + reset vector + main이 골격.
- QEMU `-kernel firmware.elf`로 ELF entry point에 *직접 점프*.
- ARM virt는 `0x4000_0000`, RISC-V virt는 `0x8000_0000`에서 시작.
- Newlib semihosting backend로 `printf` 등 *libc 편의*. UART 없는 MCU에서도 동작(Ch 14).
- Exception vector를 *반드시* 설정. panic 진단을 위해.
- GDB stub이 bare-metal에서 가장 강력 — 모든 메모리·register 제어.
- HAL/CMSIS는 vendor machine + 학습/unit test에 결합.

## 다음 장 예고

다음 장은 *bare-metal과 OS 사이* — **RTOS**. FreeRTOS와 Zephyr를 QEMU에서 띄우는 흐름.

## 관련 항목

- [Ch 10: GDB 원격 디버깅](/blog/tools/emulation/qemu-embedded/chapter10-gdb-remote)
- [Ch 12: RTOS 에뮬레이션](/blog/tools/emulation/qemu-embedded/chapter12-rtos)
- [Ch 14: Semihosting](/blog/tools/emulation/qemu-embedded/chapter14-semihosting)
- [Modern Embedded Recipes — Linker Script](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
