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

M-mode는 필수이며 S/U 지원과 커널 배치는 구현에 따라 다릅니다. FreeRTOS의 일반적인 M-mode 포트를 모든 RTOS의 유일한 실행 모델로 일반화하면 안 됩니다. Linux의 보통 S-mode 배치도 firmware·hypervisor 구성과 구분해서 확인합니다.

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

RV32I에는 32개의 정수 레지스터 이름이 있지만 변경 가능한 것은 x1–x31의 31개입니다. RV32E는 레지스터 수가 다르고 RV64는 슬롯 폭이 다릅니다. gp를 모든 태스크에서 불변으로 취급하는 포트도 있으므로 실제 context 크기는 해당 ABI와 포트로 계산해야 합니다.

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

mtvec가 Direct 모드이면 BASE에서 시작합니다. Vectored 모드에서는 비동기 interrupt가 BASE + 4 × cause로 향하고 동기 예외는 BASE로 향합니다. delegation 설정에 따라 S-mode로 전달되는 trap은 대응하는 supervisor CSR 경로를 사용하므로 모든 trap이 mtvec로 간다고 보면 안 됩니다.

## ISR Save Sequence

다음은 **RTOS 태스크 선택을 구현하지 않는 교육용 trap wrapper**입니다. 진입 시 M-mode의 유효한 16 byte 정렬 스택을 신뢰하고, trap_body는 일반 ILP32 호출 규약을 지키며 MIE를 켜거나 중첩 trap을 유발하지 않아야 합니다. U-mode의 임의 SP를 그대로 쓰는 보안 경계에 적용할 수 없습니다.

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

ISA 컴파일과 별개로 정상 레지스터·CSR 복원, 프레임 경계, 정렬을 모델로 확인할 수 있습니다. 실제 trap 진입·mret·중첩·IRQ controller의 실행 검증은 타깃 또는 적합한 에뮬레이터가 필요합니다.

## mret — Exception Return

mret는 mepc로 복귀하고 mstatus의 MPP·MPIE 등에 따라 privilege와 interrupt-enable 상태를 전환합니다. 그 전에 소프트웨어가 저장한 범용·확장 상태와 올바른 mepc/mstatus를 복원해야 합니다. mret 한 줄이 메모리 프레임까지 자동 복원하는 것은 아닙니다.

interrupt에서는 중단한 명령 위치로 돌아가므로 mepc를 무조건 증가시키지 않습니다. 처리한 ECALL을 넘겨 계속 실행하려면 handler가 해당 ECALL의 mepc를 4 byte 전진시키는 등의 정책이 필요합니다. fault는 원인과 복구 방식에 따라 재실행·종료 여부가 달라집니다.

## ECALL — System Call / OS API

ecall은 현재 privilege에 따른 동기 예외를 발생시킵니다. U-mode ECALL이 M-mode로 갈지 S-mode로 갈지는 지원 모드와 delegation 설정에 달려 있습니다. syscall 번호·인자 전달은 ISA가 아닌 OS ABI의 계약입니다.

```asm
    ecall
```

RTOS의 yield가 ECALL 경로를 사용할 수 있지만 모든 API가 ECALL을 거치는 것은 아닙니다. 이 장의 wrapper에서는 trap_body가 mcause를 해석하고, 지원하는 서비스에 대해서만 복귀 PC와 상태를 바꾸도록 별도로 구현해야 합니다.

## mscratch — Context Save 트릭

mscratch는 M-mode 소프트웨어가 용도를 정하는 CSR입니다. 예를 들어 미리 ISR stack top을 넣어 두었다면 csrrw sp,mscratch,sp로 SP와 값을 교환할 수 있습니다. 교환 뒤 원래 태스크 SP는 mscratch에 있고, 현재 sp는 ISR 스택을 가리킵니다.

```asm
    csrrw sp, mscratch, sp
```

이 한 줄만으로 중첩 trap이 안전해지지는 않습니다. 두 번째 진입에서 다시 교환하면 어떤 스택을 가리키는지, mscratch를 언제 갱신하는지까지 정의해야 합니다. 포트가 다른 scratch 계약을 쓰면 그 계약이 우선입니다.

## FreeRTOS RISC-V Port

실제 FreeRTOS **V11.2.0 GCC/RISC-V**는 portASM.S와 portContext.h, 칩별 freertos_risc_v_chip_specific_extensions.h를 함께 사용합니다. XLEN·RV32E 여부·추가 레지스터·timer와 interrupt controller에 따라 프레임과 경로가 달라집니다.

첫 태스크 복원도 pxCurrentTCB 변수에서 TCB 포인터를 읽고 그 TCB의 저장 SP를 읽는 단계가 필요합니다. 복원 경로에는 재개 PC와 상태의 일관된 설정이 포함됩니다. 일부 줄을 생략한 코드를 완성된 FreeRTOS start 함수처럼 재구성해서는 안 됩니다.

위 144 byte wrapper는 범용 레지스터를 모두 보존하는 학습용 형식이며 **FreeRTOS의 실제 프레임 레이아웃이 아닙니다**. 제품 코드는 링크한 태그의 실제 초기 스택과 save/restore 매크로를 한 쌍으로 사용해야 합니다.

## CLIC vs PLIC

PLIC와 CLIC는 서로 다른 interrupt 전달 모델이며, RISC-V interrupt controller가 반드시 두 종류로만 나뉘는 것은 아닙니다. AIA나 vendor별 구성도 있으므로 제품의 실제 controller와 명세 버전을 확인해야 합니다.

| 항목 | 확인할 질문 |
| --- | --- |
| PLIC | source enable·priority·threshold·claim/complete를 어느 context가 처리하는가? |
| CLIC | 해당 구현의 명세·vectoring·preemption 설정은 무엇인가? |
| 플랫폼 | timer·local IRQ·외부 controller가 어떤 경로로 hart에 연결되는가? |

고정된 256 또는 1000 IRQ 수나 특정 MCU의 CLIC 채택을 이름만 보고 단정하지 않습니다. controller의 우선순위·중첩 계약은 정수 레지스터 저장과 별도의 검증 대상입니다.

## 비트맵·CLZ

RV32I 기본 명령 집합에는 CLZ가 없으며 Zbb 같은 선택 확장 지원을 확인해야 합니다. 그렇더라도 소프트웨어 bitmap 검색이나 generic 우선순위 탐색은 구현할 수 있습니다.

한 CLZ 명령의 존재만으로 전체 스케줄러의 시간 상한을 정할 수 없습니다. 포트의 설정, ready list 접근, 메모리와 interrupt 조건을 포함해 비교해야 합니다. RTOS마다 호출 빈도도 다르므로 “호출이 드물어 차이가 작다”는 보편적 결론은 피합니다.

## RISC-V vs Cortex-M — 요약

| 항목 | Cortex-M4F의 이 시리즈 포트 | 이 장의 RV32I wrapper |
| --- | --- | --- |
| HW 범용 레지스터 push | 기본 예외 프레임 8 word | 없음 |
| 스택 선택 | Thread PSP / Handler MSP | 현재 M-mode SP, 필요하면 별도 소프트웨어 계약 |
| 복귀 | EXC_RETURN과 HW unstack | SW 복원 뒤 mret |
| 확장 상태 | 포트가 FP 프레임과 S16–S31 처리 | FP·벡터는 예제 범위 밖 |

이는 메커니즘 비교이며 성능 순위가 아닙니다. 구체적인 cycle 수나 interrupt latency는 동일한 시작·종료 범위와 실제 코어·메모리·controller로 측정해야 합니다.

## ESP32-C3 / GD32V — MCU 예

같은 RISC-V MCU라도 timer 주소와 IRQ controller, 포트 확장은 다릅니다. 범용 FreeRTOS의 MTIME 예제 주소를 ESP32-C3의 실제 하드웨어 주소처럼 복사해서는 안 됩니다.

ESP32-C3는 해당 ESP-IDF 버전의 SoC 헤더와 FreeRTOS 포트를 사용하고, 다른 MCU도 vendor SDK와 데이터시트에 맞춰야 합니다. 이 장에서는 검증하지 않은 MMIO 상수를 제시하지 않습니다. 링크한 칩별 확장 계약을 기준으로 timer·ISR stack·추가 context를 확인합니다.

## 자주 하는 실수

- **x0까지 저장하거나 RV32E/RV64에 같은 크기를 적용합니다.** ISA와 ABI를 먼저 고정합니다.
- **scratch 레지스터를 원래 값 저장 전에 덮어씁니다.** 위 예제는 x5를 가장 먼저 저장합니다.
- **할당 범위 밖에 CSR을 기록합니다.** 최대 offset에 슬롯 폭을 더한 값이 프레임 크기를 넘지 않아야 합니다.
- **mscratch 교환 후의 SP를 원래 태스크 SP로 저장합니다.** 교환 전후 값의 위치를 추적합니다.
- **모든 trap에서 mepc를 4 증가시킵니다.** interrupt와 처리 완료한 ECALL의 복귀 정책을 구분합니다.
- **CSR 명령 하나가 전체 임계 구역을 보장한다고 생각합니다.** csrrw/csrrs/csrrc의 한 CSR 연산과 여러 명령의 원자성은 다릅니다.

## 정리

- 기본 trap 진입은 CSR을 갱신하지만 범용 레지스터를 메모리에 push하지 않습니다.
- RV32I의 x0은 저장할 필요가 없으며 포트별 ABI·확장 상태가 프레임을 정합니다.
- 교육용 wrapper는 144 byte 안에 정수 상태와 CSR을 저장하고 원래 SP를 마지막에 복원합니다.
- mepc 복원과 ECALL 처리 후 전진 여부는 trap 원인에 맞춰야 합니다.
- mscratch 스택 교환은 초기화·중첩 정책을 포함하는 소프트웨어 계약입니다.
- 실제 FreeRTOS 포트의 초기 프레임과 복원 매크로를 교육용 레이아웃과 섞지 않습니다.

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
