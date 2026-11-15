---
title: "ARMv7-A Context Switch — AArch32 모드·SVC·Banked Registers"
slug: "embedded/rtos/practical-internals/part2-06-cortex-a-context"
date: 2026-05-05T09:16:00
description: "ARMv7-A AArch32의 모드와 banked register를 FreeRTOS ARM_CA9 포트로 추적합니다. User/System 공유 SP·LR, SRS/RFE 복귀, MMU 처리 범위를 구분합니다."
series: "Practical RTOS Internals"
seriesOrder: 16
tags: [cortex-a, svc, mode, banked-registers, mmu]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

이 장은 **ARMv7-A AArch32, Cortex-A9, FreeRTOS V11.2.0 GCC/ARM_CA9**를 기준으로 합니다. 예외 모드의 banked register가 일부 상태를 보존하지만, 태스크별 범용·FP 상태는 포트가 저장·복원합니다. AArch64의 EL0–EL3 모델과 명령어를 이 코드에 섞으면 안 됩니다.

## ARMv7-A AArch32의 기본 모드

| 모드 | 비트 | 용도 |
| --- | --- | --- |
| User (USR) | 10000 | Application |
| FIQ | 10001 | Fast IRQ |
| IRQ | 10010 | 일반 IRQ |
| Supervisor (SVC) | 10011 | OS kernel |
| Abort (ABT) | 10111 | Memory fault |
| Undefined (UND) | 11011 | Undef instruction |
| System (SYS) | 11111 | Privileged user mode |

이 표는 AArch32의 기본 모드 일곱 개입니다. Security/Virtualization 확장에 따른 Monitor/Hyp 모드는 별도로 있으며, 모든 Cortex-A 구현이 같은 확장을 갖는 것은 아닙니다. 예외 진입 시에는 해당 예외 모드로 CPSR.M이 바뀌지만, 임의 모드 전환은 권한과 명령의 제약을 따릅니다.

## Banked Registers

| 상태 | 공유·분리 관계 |
| --- | --- |
| R0–R7 | 기본 모드 사이에서 공유 |
| R8–R12 | FIQ만 별도 bank, 나머지는 공유 |
| R13(SP), R14(LR) | User와 System은 공유하며 IRQ·SVC·FIQ·Abort·Undefined는 각각 별도 bank |
| SPSR | 예외 모드별 이전 CPSR 보존용, User/System에는 없음 |

banked SP가 있다고 모든 태스크마다 HW가 스택을 따로 마련하는 것은 아닙니다. 태스크들이 System 모드에서 실행되는 포트는 같은 SP bank에 현재 태스크의 저장 SP를 번갈아 로드합니다. IRQ bank는 handler 진입에 사용하고 task context는 포트가 정한 태스크 스택에 저장합니다.

## Mode 진입 시

User 또는 System에서 IRQ를 받는 경우 HW는 이전 CPSR을 SPSR_irq에 보존하고 LR_irq에 예외 복귀에 필요한 주소를 기록합니다. IRQ 모드가 선택되고 벡터 주소에서 handler가 실행되며, 세부 마스크와 벡터 계산은 아키텍처 설정을 따릅니다.

일반 레지스터를 메모리에 자동 push하는 Cortex-M식 프레임은 생기지 않습니다. 다만 CPSR/SPSR와 banked LR 같은 HW 예외 진입 동작은 있으므로 “아무 상태도 HW가 보존하지 않는다”고 표현해도 틀립니다. 실제 복귀에서는 IRQ의 LR 보정과 SPSR 복원이 필요합니다.

## Context Switch 흐름

V11.2.0 ARM_CA9의 portASM.S에는 portSAVE_CONTEXT와 portRESTORE_CONTEXT 매크로가 있습니다. 이 포트는 태스크를 System 모드에서 실행하며 다음과 같이 복귀 상태를 **System 스택**에 저장한 뒤 일반 상태를 보존합니다. 아래는 전체 매크로가 아닌 순서 설명용 발췌입니다.

```asm
    SRSDB sp!, #0x1f
    CPS #0x1f
    PUSH {R0-R12, R14}
```

SRS는 예외 모드의 복귀 LR과 SPSR을 지정한 모드의 스택에 저장합니다. 단순히 SVC 스택에 범용 레지스터만 push하는 예제와 달리, System 태스크의 스택과 복귀 상태를 일관되게 다룹니다.

| 순서 | 원본 매크로의 작업 |
| --- | --- |
| 저장 | SRSDB·System 전환·R0–R12/R14 저장 |
| 추가 상태 | critical nesting, FP 사용 시 FPSCR·D0–D31, FP 사용 flag 저장 |
| 스택 교체 | 현재 SP를 TCB에 쓰고 스케줄러 선택 후 새 TCB의 SP 로드 |
| 복원 | FP flag·필요한 FP 상태·critical nesting 복원, GIC priority mask 반영 |
| 복귀 | 일반 레지스터 복원 뒤 RFEIA sp!로 PC와 CPSR 복귀 |

FP 보존은 task flag에 따라 조건부이며 D0–D31을 사용할 수 있는 해당 Cortex-A9 설정을 전제로 합니다. 모든 Cortex-A·VFP 구현에 D32 레지스터 파일을 가정해서는 안 됩니다.

실제 소스를 object까지 확인하는 명령은 다음과 같습니다. ELF 링크·GIC 초기화·실제 예외 진입을 검증하는 명령은 아닙니다.

```bash
clang --target=arm-none-eabi -mcpu=cortex-a9 -mfpu=neon   -mfloat-abi=softfp -marm -c   FreeRTOS-Kernel/portable/GCC/ARM_CA9/portASM.S -o ca9-port.o
llvm-objdump -d ca9-port.o
```

역어셈블에서 FreeRTOS_SWI_Handler·FreeRTOS_IRQ_Handler·vPortRestoreTaskContext와 SRS/RFE를 확인할 수 있습니다. 원본의 IRQ LR 보정·중첩 처리·GIC ACK/EOI까지 읽어야 완전한 handler 흐름이 됩니다.

## SVC — 시스템 콜 entry

AArch32의 svc 명령은 Supervisor 예외 경로로 들어갑니다. 그 명령을 어떤 OS API에 연결할지는 커널 ABI가 정합니다. 모든 RTOS API가 SVC를 통과하는 것은 아니며, 이 FreeRTOS 포트에서는 FreeRTOS_SWI_Handler가 context 저장·스케줄러 호출·복원 경로를 수행합니다.

```asm
    svc #0
```

Linux AArch32 시스템 콜도 SVC 예외를 이용하지만 호출 번호와 인자 전달 규약은 Linux ABI입니다. FreeRTOS 태스크의 System 모드 실행 모델을 User 모드 보호 경계가 있는 Linux 모델과 동일하게 보면 안 됩니다.

## MMU·Cache 영향

태스크 전환이 항상 TLB invalidate나 cache flush를 요구하는 것은 아닙니다. 같은 주소 공간의 스레드는 매핑을 공유할 수 있고, 주소 공간을 바꿀 때도 ASID와 커널 정책에 따라 기존 translation을 유지할 수 있습니다. 매핑을 변경할 때 필요한 maintenance 순서는 페이지 테이블·shareability·타깃 아키텍처를 기준으로 정합니다.

다음은 **AArch64 EL1의 별도 명령 예제**입니다. 이 장의 ARMv7-A 포트에 붙여 넣을 수 없으며, 매 태스크 전환 코드나 완전한 break-before-make 절차도 아닙니다. 적절한 권한·범위에서 앞선 테이블 쓰기를 완료한 뒤 EL1 stage-1 TLB maintenance를 수행하는 명령 순서만 보입니다.

```asm title="aarch64-tlbi.S"
.text
.global invalidate_el1_stage1
invalidate_el1_stage1:
    dsb ishst
    tlbi vmalle1is
    dsb ish
    isb
    ret
```

이 예제를 AArch64로 assemble하고 AArch32로는 거부되는지 확인하면 ISA 혼용을 잡을 수 있습니다. 실제 매핑 변경의 정당성이나 실행 시간을 그 컴파일 결과로 검증할 수는 없습니다.

## NEON / VFP

원본 ARM_CA9 포트의 FP 경로는 D0–D31의 256 byte에 FPSCR와 FP 사용 flag 등을 추가로 저장합니다. 기본 프레임과 정렬·critical nesting도 별도이므로 256 byte만으로 전체 FP 태스크 context 크기를 정하지 않습니다.

FP를 사용하는 태스크를 어떻게 표시하는지는 포트의 등록·설정 계약에 따릅니다. “Lazy save가 항상 좋다”는 기준 대신 사용 기능, ISR의 FP 사용과 중첩 정책, 필요한 최악 지연을 함께 검토해야 합니다.

## TrustZone — Secure/Non-secure World

Security 확장이 있는 ARMv7-A AArch32에서는 SMC가 Monitor 모드의 처리 경로와 연관됩니다. AArch64의 EL3와 같은 모드 이름이 아니며 trap routing과 허용 여부는 구성에 달려 있습니다.

Secure world 전환은 RTOS의 같은 world 안 태스크 전환과 다른 계약입니다. 어떤 GP·FP·보안 상태를 저장하는지는 monitor/TEE 구현과 호출 규약에 따라 확인해야 합니다. 이 ARM_CA9 scheduler 코드가 OP-TEE world switch까지 검증하거나 구현하는 것은 아닙니다.

## 비용 — Cortex-M vs Cortex-A

코어 이름과 클록만으로 context switch 시간을 비교할 수 없습니다. IRQ entry만인지, scheduler를 포함하는지, 주소 공간을 바꾸는지, FP·캐시·메모리 조건이 무엇인지가 모두 달라집니다.

측정 시에는 동일한 시작·종료 이벤트를 정하고 코어·커널 태그·설정·메모리 배치·표본 수와 분포를 남깁니다. 이 글의 object 검사는 명령과 ISA의 일치를 확인할 뿐이며 300 cycle이나 수 µs의 실측 근거를 제공하지 않습니다.

## Zephyr Cortex-A Port

커널마다 AArch32 포트 경로와 handler 명칭이 다릅니다. Cortex-M 전용 PendSV 이름을 Cortex-A port의 실존 심볼처럼 인용해서는 안 됩니다.

이 글은 검증 범위를 명확히 하기 위해 FreeRTOS V11.2.0 ARM_CA9 소스만 추적합니다. 다른 커널로 옮길 때는 그 태그의 exception entry, task stack, interrupt controller와 FP 보존 경로를 별도로 대조해야 합니다.

## 자주 하는 실수

- **User와 System에 서로 다른 SP bank가 있다고 생각합니다.** 두 모드는 SP/LR을 공유하며 권한은 다릅니다.
- **SVC stack에 push한 값을 User task context로 취급합니다.** task SP와 SPSR/복귀 주소의 저장 계약을 먼저 확인합니다.
- **AArch32 코드에 AArch64 TLBI를 섞습니다.** ISA와 exception-level 용어를 일관되게 사용합니다.
- **DMA 뒤에 무조건 invalidate합니다.** 비일관 DMA는 전송 방향에 따라 device 읽기 전 clean, CPU 읽기 전 적절한 invalidate·동기화 등이 필요합니다. coherent 환경까지 같은 절차를 일반화하지 않습니다.
- **privileged 명령이 언제나 같은 예외를 낸다고 가정합니다.** 명령·모드·확장·trap 설정별 동작을 확인해야 합니다.

## 정리

- 이 장의 모드 표는 ARMv7-A AArch32의 기본 모드이며 AArch64 EL 모델과 다릅니다.
- User/System은 SP·LR을 공유하고 예외 모드에는 banked 상태가 있습니다.
- ARM_CA9 포트는 SRS·System 스택·RFE를 이용해 태스크 복귀 계약을 구성합니다.
- FP·critical nesting·GIC 마스크도 저장·복원 경로에 포함됩니다.
- TLB·cache maintenance는 주소 공간과 매핑 변경 정책에 따르며 모든 태스크 전환의 고정 비용이 아닙니다.

다음 편은 RISC-V context switch입니다. RV32I의 스택 범위와 mepc/mstatus 복원 순서를 확인합니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CA9 portASM.S](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CA9/portASM.S): 실제 저장·복원·IRQ 경로.
- [같은 태그의 ARM_CA9 port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CA9/port.c): 초기 스택과 FP 설정 계약.
- [Arm ARMv7-A/R Architecture Reference Manual](https://developer.arm.com/documentation/ddi0406/latest): 모드·banked register·SRS/RFE.
- [Arm Instruction Set Reference Guide, D2.176 TLBI](https://documentation-service.arm.com/static/6245c734b059dc5ff9a8bdab): 별도 AArch64 maintenance 명령.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
