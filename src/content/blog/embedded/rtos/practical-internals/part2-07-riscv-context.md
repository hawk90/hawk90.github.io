---
title: "RISC-V Context Switch 분석 — ECALL·mret·CSR"
slug: "embedded/rtos/practical-internals/part2-07-riscv-context"
date: 2026-05-05T09:17:00
description: "RV32I M-mode trap에서 필요한 레지스터와 CSR을 보존하는 프레임을 구성합니다. 저장 범위·원래 SP·mepc 복원과 mscratch의 소프트웨어 계약을 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 17
tags: [risc-v, ecall, mret, csr, mscratch, mepc]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

기본 RISC-V trap 진입은 범용 레지스터를 메모리에 자동 push하지 않습니다. handler와 RTOS 포트가 재개에 필요한 레지스터·CSR·확장 상태를 보존해야 합니다. 이 장의 실행 형식 예제는 **RV32I + Zicsr, ILP32, M-mode, FP·벡터 없는 비중첩 trap**으로 범위를 고정합니다.

## RISC-V Privilege Levels

| Mode | 비트 | 용도 |
| --- | --- | --- |
| **M** (Machine) | 11 | Highest — bare-metal, RTOS |
| **S** (Supervisor) | 01 | Linux kernel |
| **U** (User) | 00 | Application |

인코딩은 privileged spec "Table 1. RISC-V privilege levels"(0 = U `00`, 1 = S `01`, 3 = M `11`, 2는 reserved)를 따릅니다([priv-intro](https://docs.riscv.org/reference/isa/v20260120/priv/priv-intro.html)). M-mode는 필수이고 S·U는 선택입니다. FreeRTOS V11.2.0 `GCC/RISC-V` 포트는 task와 커널을 모두 M-mode에서 돌립니다(아래 `mret`와 `mstatus` 사용).

## RISC-V Registers

| 레지스터 | ABI 이름·역할 |
| --- | --- |
| x0 | zero, 항상 0이며 저장 불필요 |
| x1 | ra, 호출 복귀 주소 |
| x2 | sp, 스택 포인터 |
| x3/x4 | gp/tp, 전역·스레드 포인터 |
| x5–x7, x28–x31 | t0–t6, 임시값 |
| x8–x9, x18–x27 | s0–s11, 일반 호출에서 보존 |
| x10–x17 | a0–a7, 인자·반환값 |

RV32I에는 32개의 정수 레지스터 이름이 있지만 변경 가능한 것은 x1–x31의 31개입니다. RV32E는 x0–x15 16개이고 RV64는 슬롯 폭이 8 byte입니다. FreeRTOS RISC-V 포트는 이 차이를 `portContext.h`에서 처리합니다. RV32I/RV64에서는 `portCONTEXT_SIZE`가 31 word, RV32E(`__riscv_32e`)에서는 15 word이고, word 크기 `portWORD_SIZE`는 XLEN에 따라 4 또는 8입니다([`portContext.h` L33-L57](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portContext.h#L33-L57)).

## Key CSRs (Control and Status Registers)

| CSR | 의미 |
| --- | --- |
| **mstatus** | Status (IE bit, MPP 모드 등) |
| **mepc** | Exception PC — interrupt 복귀 |
| **mcause** | Exception 원인 |
| **mtval** | Fault address (memory fault 시) |
| **mtvec** | Vector table base |
| **mscratch** | Free scratch — context save에 활용 |
| **mip** | Interrupt pending |
| **mie** | Interrupt enable |

## Interrupt 진입 — Cortex-M보다 적은 자동화

M-mode로 trap이 전달되는 경우 HW는 mepc에 중단·예외 위치를 기록하고 mcause에 interrupt 여부와 원인 코드를 기록합니다. mstatus에는 이전 privilege와 interrupt-enable 상태를 보존하고 MIE를 내린 뒤 handler로 이동합니다. 범용 레지스터의 메모리 저장은 하지 않습니다.

mtvec가 Direct 모드이면 BASE에서 시작합니다. Vectored 모드에서는 spec 원문대로 "Asynchronous interrupts set pc to BASE+4×cause"이고 동기 예외는 BASE로 갑니다([Machine-Level ISA](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html) mtvec MODE 표). S-mode가 있는 구현에서 `medeleg`/`mideleg`로 위임한 trap은 `stvec`로 갑니다.

## ISR Save Sequence

다음은 **RTOS 태스크 선택을 구현하지 않는 교육용 trap wrapper**입니다. 진입 시 M-mode의 유효한 16 byte 정렬 스택을 신뢰하고, trap_body는 일반 ILP32 호출 규약을 지키며 MIE를 켜거나 중첩 trap을 유발하지 않는다고 가정합니다. U-mode에서 들어온 trap의 SP를 그대로 쓰므로 보안 경계에는 쓸 수 없습니다.

31개 정수 슬롯과 mepc·mstatus는 132 byte입니다. 호출 시 정렬을 유지하려고 padding 12 byte를 더해 **144 byte**를 확보합니다. x5를 scratch로 쓰기 전에 원래 값을 먼저 저장하고, 원래 SP는 sp + 144로 계산합니다.

```asm title="rv32-trap.S"
.text
.balign 4
.global rv32_trap
rv32_trap:
    addi sp, sp, -144
    sw x5, 16(sp)
    addi x5, sp, 144
    sw x5, 4(sp)
    sw x1, 0(sp)
    sw x3, 8(sp)
    sw x4, 12(sp)
    sw x6, 20(sp)
    sw x7, 24(sp)
    sw x8, 28(sp)
    sw x9, 32(sp)
    sw x10, 36(sp)
    sw x11, 40(sp)
    sw x12, 44(sp)
    sw x13, 48(sp)
    sw x14, 52(sp)
    sw x15, 56(sp)
    sw x16, 60(sp)
    sw x17, 64(sp)
    sw x18, 68(sp)
    sw x19, 72(sp)
    sw x20, 76(sp)
    sw x21, 80(sp)
    sw x22, 84(sp)
    sw x23, 88(sp)
    sw x24, 92(sp)
    sw x25, 96(sp)
    sw x26, 100(sp)
    sw x27, 104(sp)
    sw x28, 108(sp)
    sw x29, 112(sp)
    sw x30, 116(sp)
    sw x31, 120(sp)
    csrr x5, mepc
    sw x5, 124(sp)
    csrr x5, mstatus
    sw x5, 128(sp)
    call trap_body
    lw x5, 124(sp)
    csrw mepc, x5
    lw x5, 128(sp)
    csrw mstatus, x5
    lw x1, 0(sp)
    lw x3, 8(sp)
    lw x4, 12(sp)
    lw x5, 16(sp)
    lw x6, 20(sp)
    lw x7, 24(sp)
    lw x8, 28(sp)
    lw x9, 32(sp)
    lw x10, 36(sp)
    lw x11, 40(sp)
    lw x12, 44(sp)
    lw x13, 48(sp)
    lw x14, 52(sp)
    lw x15, 56(sp)
    lw x16, 60(sp)
    lw x17, 64(sp)
    lw x18, 68(sp)
    lw x19, 72(sp)
    lw x20, 76(sp)
    lw x21, 80(sp)
    lw x22, 84(sp)
    lw x23, 88(sp)
    lw x24, 92(sp)
    lw x25, 96(sp)
    lw x26, 100(sp)
    lw x27, 104(sp)
    lw x28, 108(sp)
    lw x29, 112(sp)
    lw x30, 116(sp)
    lw x31, 120(sp)
    lw sp, 4(sp)
    mret
```

이 프레임에서는 마지막 12 byte만 padding이고, 실제 저장은 offset 0–128의 4 byte 슬롯 안에 있습니다. 복원에서는 모든 메모리 접근이 끝난 뒤 원래 SP를 읽습니다. mstatus에 복원하는 값은 trap 진입 직후의 MIE=0 상태여야 하며, mret가 이전 interrupt-enable과 privilege를 반영합니다.

기존처럼 128 byte만 확보한 뒤 offset 128·132에 쓰면 프레임 밖을 침범합니다. mscratch로 스택을 교환한 직후 x2를 저장하면 그것은 이미 바뀐 SP이므로 원래 태스크 SP가 되지 않습니다. 이 예제는 별도 ISR 스택 교환을 생략하여 해당 계약을 분리했습니다.

### QEMU에서 실제 trap으로 돌려 보기

이 wrapper를 QEMU 11.1.3 `qemu-system-riscv32 -M virt -bios none`에서 bare-metal로 실행했습니다. 시험 코드는 mtvec를 Direct 모드로 이 wrapper에 걸고, x1과 x3–x31에 `0x01010101 × 레지스터 번호`를 넣은 뒤 M-mode에서 `ecall`을 실행합니다. `trap_body`는 mcause를 기록하고 frame의 mepc 슬롯(124)을 4 전진시킵니다. `mret` 뒤 31개 레지스터를 모두 원래 값·원래 SP와 비교합니다.

```text
mcause=0x0000000b mismatched registers after mret=0x00000000
```

mcause 11은 spec의 exception code 표에서 "Environment call from M-mode"입니다. 불일치 0은 x1·x3–x31이 모두 돌아왔고 x2가 trap 이전 SP와 같았다는 뜻입니다. 링커가 없는 환경이라 시험 파일 하나에 wrapper를 `.include`하고 모든 참조를 같은 section 안의 PC-relative 주소로 만든 뒤 Homebrew clang 23.1.5 `--target=riscv32 -march=rv32im_zicsr -mabi=ilp32`로 어셈블하고 `llvm-objcopy -O binary`로 이미지를 만들었습니다. relocation이 0개인 것을 `llvm-objdump -r`로 확인했습니다.

## mret — Exception Return

mret는 mepc로 복귀하고 mstatus의 MPP·MPIE 등에 따라 privilege와 interrupt-enable 상태를 전환합니다. 그 전에 소프트웨어가 저장한 범용·확장 상태와 올바른 mepc/mstatus를 복원해야 합니다. mret 한 줄이 메모리 프레임까지 자동 복원하는 것은 아닙니다.

interrupt에서는 중단한 명령 위치로 돌아가므로 mepc를 무조건 증가시키지 않습니다. 처리한 ECALL을 넘겨 계속 실행하려면 handler가 mepc를 4 byte 전진시킵니다. FreeRTOS RISC-V 포트의 trap handler가 정확히 이렇게 나눕니다. mcause의 최상위 bit로 interrupt인지 보고(`bge a0, x0, synchronous_exception`), 동기 예외일 때만 `addi a1, a1, 4`를 한 뒤 frame 0번 슬롯에 저장합니다([`portASM.S` L334-L349](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portASM.S#L334-L349)).

## ECALL — System Call / OS API

ecall은 현재 privilege에 따라 environment-call-from-U/S/M-mode 예외를 일으킵니다(spec 2.1.3.1). U-mode ECALL이 M-mode로 갈지 S-mode로 갈지는 `medeleg` 위임 설정이 정합니다. syscall 번호·인자 전달은 ISA가 아닌 OS ABI의 계약입니다.

```asm
    ecall
```

FreeRTOS RISC-V 포트에서는 `portYIELD()`가 `ecall`이고([`portmacro.h` L94](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portmacro.h#L94)), 다른 API는 일반 함수 호출입니다. 이 장의 wrapper에서는 위 QEMU 시험의 `trap_body`처럼 mcause를 보고 복귀 PC를 정합니다.

## mscratch — Context Save 트릭

mscratch는 M-mode 소프트웨어가 용도를 정하는 CSR입니다. 예를 들어 미리 ISR stack top을 넣어 두었다면 csrrw sp,mscratch,sp로 SP와 값을 교환할 수 있습니다. 교환 뒤 원래 태스크 SP는 mscratch에 있고, 현재 sp는 ISR 스택을 가리킵니다.

```asm
    csrrw sp, mscratch, sp
```

이 한 줄만으로 중첩 trap이 안전해지지는 않습니다. 두 번째 진입에서 다시 교환하면 sp에는 첫 번째 trap의 ISR stack이 아니라 task SP가 돌아오기 때문입니다. FreeRTOS RISC-V 포트는 mscratch를 쓰지 않습니다. task stack에 context를 저장한 뒤 전역 변수 `xISRStackTop`에서 ISR stack을 읽어 SP를 바꿉니다(`load_x sp, xISRStackTop`, [`portContext.h` L124](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portContext.h#L124)).

## FreeRTOS RISC-V Port

실제 FreeRTOS **V11.2.0 GCC/RISC-V**는 portASM.S와 portContext.h, 칩별 `freertos_risc_v_chip_specific_extensions.h`를 함께 사용합니다. 저장 매크로 `portcontextSAVE_CONTEXT_INTERNAL`([`portContext.h` L67-L114](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portContext.h#L67-L114))의 RV32I 프레임은 다음과 같습니다.

| 슬롯 | 내용 |
| --- | --- |
| 0 | mepc (동기 예외면 +4) |
| 1 | x1 (ra) |
| 2–28 | x5–x31 |
| 29 | `xCriticalNesting` |
| 30 | mstatus |

31 word = 124 byte입니다. 위 교육용 wrapper(144 byte)와 다른 점은 x3(gp)와 x4(tp)를 저장하지 않는다는 것입니다. FreeRTOS는 모든 task가 같은 gp·tp를 쓴다고 보고 넘어갑니다. 칩마다 더 저장할 레지스터는 `portasmSAVE_ADDITIONAL_REGISTERS` 매크로로 추가하고, 그 크기는 `portasmADDITIONAL_CONTEXT_SIZE`로 frame에 더합니다. 마지막으로 `store_x sp, 0 ( t0 )`로 SP를 TCB 첫 필드에 씁니다. 1-02에서 본 "pxTopOfStack은 첫 멤버" 규칙이 RISC-V에서도 같습니다.

## CLIC vs PLIC

interrupt controller는 정수 레지스터 저장과 별개의 문제이고, 이 장에서는 PLIC·CLIC 명세를 다루지 않았습니다. FreeRTOS RISC-V 포트가 커널 안에서 직접 처리하는 trap은 두 가지뿐입니다. mcause가 machine timer interrupt(0x80000007)이면 compare 레지스터를 갱신하고 `xTaskIncrementTick()`을 부르며, mcause가 11(M-mode ecall, 즉 `portYIELD()`)이면 `vTaskSwitchContext()`를 부릅니다. 나머지 interrupt와 예외는 응용이 제공하는 `freertos_risc_v_application_interrupt_handler`·`freertos_risc_v_application_exception_handler`로 넘깁니다([`portASM.S` L350-L373](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portASM.S#L350-L373)). 어떤 controller를 쓰든 그 handler 안에서 claim·완료 처리를 합니다.

## 비트맵·CLZ

RV32I 기본 명령 집합에는 CLZ가 없고, Zbb 확장의 `clz`로 생깁니다. FreeRTOS RISC-V 포트의 `portmacro.h`는 `configUSE_PORT_OPTIMISED_TASK_SELECTION == 1`이면 `portGET_HIGHEST_PRIORITY`를 `31UL - __builtin_clz( uxReadyPriorities )`로 정의합니다([`portmacro.h` L153](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portmacro.h#L153)). 같은 식 `31u - __builtin_clz(b)`를 Homebrew clang 23.1.5 `-O2`로 컴파일하면 `-march=rv32im_zbb`에서는 `clz` 한 명령이 되고, `-march=rv32im`에서는 shift·or·popcount 계산으로 펼친 32개 명령(`ret` 포함 33개)이 됐습니다. 같은 C 코드가 Zbb 유무에 따라 명령 수가 수십 배 달라지는 셈입니다.

## RISC-V vs Cortex-M — 요약

| 항목 | Cortex-M4F의 이 시리즈 포트 | 이 장의 RV32I wrapper |
| --- | --- | --- |
| HW 범용 레지스터 push | 기본 예외 프레임 8 word | 없음 |
| 스택 선택 | Thread PSP / Handler MSP | 현재 M-mode SP, 필요하면 별도 소프트웨어 계약 |
| 복귀 | EXC_RETURN과 HW unstack | SW 복원 뒤 mret |
| 확장 상태 | 포트가 FP 프레임과 S16–S31 처리 | FP·벡터는 예제 범위 밖 |

이는 메커니즘 비교이며 성능 순위가 아닙니다. 저장 word 수로 보면 Cortex-M4F 정수 task 17 word(HW 8 + SW 9), FreeRTOS RISC-V RV32I 31 word(전부 SW)입니다. cycle은 이 장에서 재지 않았습니다.

## ESP32-C3 / GD32V — MCU 예

같은 RISC-V MCU라도 timer 주소와 IRQ controller, 포트 확장은 다릅니다. FreeRTOS RISC-V 포트는 machine timer의 주소를 `configMTIME_BASE_ADDRESS`·`configMTIMECMP_BASE_ADDRESS`로 받고, 칩마다 다른 레지스터는 `chip_specific_extensions/` 아래 칩별 헤더로 넣습니다. 이 장에서는 ESP32-C3나 GD32V의 실제 주소를 다루지 않았습니다. ESP32-C3는 [ESP32-C3 Mastering](/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview) 시리즈에서 다룹니다.

## 자주 하는 실수

- **x0까지 저장하거나 RV32E/RV64에 같은 크기를 적용합니다.** FreeRTOS도 RV32E는 15 word, RV64는 word 8 byte로 따로 계산합니다.
- **scratch 레지스터를 원래 값 저장 전에 덮어씁니다.** 위 예제는 x5를 가장 먼저 저장합니다.
- **할당 범위 밖에 CSR을 기록합니다.** 최대 offset에 슬롯 폭을 더한 값이 프레임 크기를 넘지 않아야 합니다.
- **mscratch 교환 후의 SP를 원래 태스크 SP로 저장합니다.** 교환 전후 값의 위치를 추적합니다.
- **모든 trap에서 mepc를 4 증가시킵니다.** interrupt와 처리 완료한 ECALL의 복귀 정책을 구분합니다.
- **CSR 명령 하나가 전체 임계 구역을 보장한다고 생각합니다.** csrrw/csrrs/csrrc의 한 CSR 연산과 여러 명령의 원자성은 다릅니다.

## 정리

- 기본 trap 진입은 CSR을 갱신하지만 범용 레지스터를 메모리에 push하지 않습니다.
- RV32I의 x0은 저장할 필요가 없으며 포트별 ABI·확장 상태가 프레임을 정합니다.
- 교육용 wrapper는 144 byte 안에 정수 상태와 CSR을 저장하고 원래 SP를 마지막에 복원합니다. QEMU `riscv32 virt`에서 `ecall` 뒤 31개 레지스터가 모두 돌아왔습니다(mcause 11).
- FreeRTOS RISC-V RV32I 프레임은 31 word로 gp·tp를 저장하지 않고, ISR stack은 mscratch가 아닌 `xISRStackTop`으로 바꿉니다.
- mepc 복원과 ECALL 처리 후 전진 여부는 trap 원인에 맞춰야 합니다.
- mscratch 스택 교환은 초기화·중첩 정책을 포함하는 소프트웨어 계약입니다.
- 실제 FreeRTOS 포트의 초기 프레임과 복원 매크로를 교육용 레이아웃과 섞지 않습니다(슬롯 순서가 다름).

다음 편은 tick과 타이머입니다. SysTick과 generic timer의 주기·단위를 다룹니다.

## 근거 자료

- [RISC-V Machine-Level ISA 1.13](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html): trap·CSR·MRET·ECALL.
- [RISC-V psABI](https://riscv-non-isa.github.io/riscv-elf-psabi-doc/): 정수 ABI와 스택 정렬.
- [FreeRTOS V11.2.0 RISC-V portASM.S](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portASM.S): 실제 entry·첫 태스크 경로.
- [같은 태그의 portContext.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portContext.h): XLEN·RV32E·추가 context 저장 계약.

## 관련 항목

- [2-06: Cortex-A Context Switch](/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [ESP32-C3 Mastering](/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview)
