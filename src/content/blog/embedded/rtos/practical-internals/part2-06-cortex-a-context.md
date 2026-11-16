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

이 표는 AArch32의 기본 모드 일곱 개이고, Security·Virtualization 확장이 있는 구현에는 Monitor·Hyp 모드가 더 있습니다. 예외 진입 시에는 해당 예외 모드로 CPSR.M이 바뀌고, privileged 모드에서는 `cps #모드` 명령으로도 바꿀 수 있습니다.

QEMU 11.1.3 `vexpress-a9`(Cortex-A9)에서 bare-metal로 `cps`로 모드를 바꿔 가며 CPSR을 읽어 봤습니다. 하위 5비트가 표의 값과 같습니다.

```text
CPSR in IRQ mode : 0x400001d2
CPSR in SYS mode : 0x400001df
CPSR in SVC mode : 0x400001d3
CPSR in FIQ mode : 0x400001d1
CPSR in ABT mode : 0x400001d7
CPSR in UND mode : 0x400001db
CPSR in USR mode : 0x400001d0
CPSR after cps #0x1f in USR: 0x400001d0
```

마지막 줄은 User 모드에서 `cps #0x1f`를 실행한 뒤의 CPSR입니다. 모드가 그대로 0x10이므로, User 모드에서는 예외를 거치지 않고는 privileged 모드로 갈 수 없습니다. 출력에는 semihosting을 User 모드에서도 허용하는 `-semihosting-config enable=on,userspace=on`을 썼습니다.

## Banked Registers

| 상태 | 공유·분리 관계 |
| --- | --- |
| R0–R7 | 기본 모드 사이에서 공유 |
| R8–R12 | FIQ만 별도 bank, 나머지는 공유 |
| R13(SP), R14(LR) | User와 System은 공유하며 IRQ·SVC·FIQ·Abort·Undefined는 각각 별도 bank |
| SPSR | 예외 모드별 이전 CPSR 보존용 |

같은 QEMU 프로그램에서 IRQ·SYS·SVC 모드마다 SP와 LR에 다른 값을 넣은 뒤 다시 읽었습니다. SVC 모드에서 `stmia r9, {sp, lr}^`로 *User bank*의 SP/LR을 저장하면, SYS 모드에서 넣은 값이 나옵니다.

```text
User-bank SP read from SVC (stm ^): 0x5a5a0000
User-bank LR read from SVC (stm ^): 0x5a5a0001
SVC SP : 0x5c5c0000
IRQ SP : 0x1a1a0000
IRQ LR : 0x1a1a0001
SYS SP : 0x5a5a0000
FIQ SP : 0xf0f00000
ABT SP : 0xabab0000
UND SP : 0xdede0000
SYS SP : 0x5a5a0000
```

SYS에서 쓴 0x5A5A0000이 User bank로 읽혔으므로 User와 System은 SP/LR을 공유합니다. IRQ·SVC·FIQ·ABT·UND는 각자 SP에 넣은 값을 다른 모드를 거친 뒤에도 그대로 유지했습니다. 사물함이 모드별로 있지만 User와 System은 같은 사물함을 쓰는 셈입니다. R8–R12 쪽도 확인했습니다. SYS에서 r9에 0x99990000을 넣고 FIQ 모드에서 r9에 0xF1F10000을 쓴 뒤 SYS로 돌아오자 `r9 in SYS after setting FIQ r9=0xf1f10000: 0x99990000`이었습니다. FIQ만 R8–R12를 따로 가집니다. 처음 버전의 측정 코드는 결과 포인터를 r9에 두었다가 FIQ 모드의 저장이 엉뚱한 곳으로 가서, 이 bank를 의도치 않게 먼저 확인했습니다.

banked SP가 있다고 모든 태스크마다 HW가 스택을 따로 마련하는 것은 아닙니다. FreeRTOS ARM_CA9 포트는 태스크를 System 모드에서 돌리므로, 위의 공유 SP 하나에 현재 태스크의 저장 SP를 번갈아 로드합니다. IRQ bank는 handler 진입에만 쓰고 task context는 태스크 스택에 저장합니다.

## Mode 진입 시

User 또는 System에서 IRQ를 받는 경우 HW는 이전 CPSR을 SPSR_irq에 보존하고 LR_irq에 예외 복귀에 필요한 주소를 기록한 뒤 IRQ 모드로 벡터에서 handler를 시작합니다.

일반 레지스터를 메모리에 자동 push하는 Cortex-M식 프레임은 생기지 않습니다. HW가 보존하는 것은 SPSR과 banked LR 두 개뿐이고, 나머지는 모두 handler가 저장합니다. IRQ의 LR_irq는 돌아갈 명령보다 4만큼 앞을 가리키므로, FreeRTOS ARM_CA9의 IRQ handler도 처음에 `SUB lr, lr, #4`로 보정합니다([`portASM.S` L171-L178](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CA9/portASM.S#L171-L178)).

## Context Switch 흐름

V11.2.0 ARM_CA9의 portASM.S에는 portSAVE_CONTEXT(L57)와 portRESTORE_CONTEXT(L94) 매크로가 있습니다. 이 포트는 태스크를 System 모드에서 실행하며 다음과 같이 복귀 상태를 **System 스택**에 저장한 뒤 일반 상태를 보존합니다. 아래는 portSAVE_CONTEXT의 첫 세 줄(L61-L63)입니다.

```asm
    SRSDB sp!, #0x1f
    CPS #0x1f
    PUSH {R0-R12, R14}
```

SRS는 예외 모드의 복귀 LR과 SPSR을 지정한 모드의 스택에 저장합니다. 단순히 SVC 스택에 범용 레지스터만 push하는 예제와 달리, System 태스크의 스택과 복귀 상태를 일관되게 다룹니다.

| 순서 | 원본 매크로의 작업 | word |
| --- | --- | ---: |
| 저장 | SRSDB(LR·SPSR) | 2 |
| | System 전환·R0–R12/R14 저장 | 14 |
| 추가 상태 | critical nesting | 1 |
| | FP 사용 시 FPSCR·D0–D31 | 1 + 64 |
| | FP 사용 flag(`ulPortTaskHasFPUContext`) | 1 |
| 스택 교체 | 현재 SP를 TCB에 쓰고 스케줄러 선택 후 새 TCB의 SP 로드 | |
| 복원 | FP flag·필요한 FP 상태·critical nesting 복원, GIC priority mask 반영 | |
| 복귀 | 일반 레지스터 복원 뒤 RFEIA sp!로 PC와 CPSR 복귀 | |

word 수는 위 매크로의 PUSH·VPUSH 목록에서 센 값입니다. FP를 안 쓰는 task는 18 word(72 byte), 쓰는 task는 83 word(332 byte)입니다. FP 저장은 task flag가 0이 아닐 때만 하며(`VPUSHNE`), `VPUSHNE {D16-D31}`이 있으므로 D32 레지스터 파일이 있는 VFPv3-D32/NEON 구성을 전제로 합니다.

실제 소스를 object까지 확인하는 명령은 다음과 같습니다.

```bash
clang --target=arm-none-eabi -mcpu=cortex-a9 -mfpu=neon   -mfloat-abi=softfp -marm -c   FreeRTOS-Kernel/portable/GCC/ARM_CA9/portASM.S -o ca9-port.o
llvm-objdump -d ca9-port.o
```

arm-none-eabi-gcc 16.2.0으로 같은 파일을 object로 만들고 역어셈블하면 `FreeRTOS_SWI_Handler`의 앞부분이 다음과 같습니다(`objdump -d --no-show-raw-insn`).

```text
00000000 <FreeRTOS_SWI_Handler>:
   0:	srsdb	sp!, #31
   4:	cps	#31
   8:	push	{r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, sl, fp, ip, lr}
   c:	ldr	r2, [pc, #700]	@ 2d0 <ulCriticalNestingConst>
  10:	ldr	r1, [r2]
  14:	push	{r1}		@ (str r1, [sp, #-4]!)
  18:	ldr	r2, [pc, #692]	@ 2d4 <ulPortTaskHasFPUContextConst>
  1c:	ldr	r3, [r2]
  20:	cmp	r3, #0
  24:	vmrsne	r1, fpscr
  28:	pushne	{r1}		@ (strne r1, [sp, #-4]!)
  2c:	vpushne	{d0-d15}
  30:	vpushne	{d16-d31}
  34:	push	{r3}		@ (str r3, [sp, #-4]!)
  38:	ldr	r0, [pc, #652]	@ 2cc <pxCurrentTCBConst>
  3c:	ldr	r1, [r0]
  40:	str	sp, [r1]
  44:	mov	r2, sp
  48:	and	r2, r2, #4
  4c:	sub	sp, sp, r2
  50:	ldr	r0, [pc, #644]	@ 2dc <vTaskSwitchContextConst>
  54:	blx	r0
```

0x40의 `str sp, [r1]`이 TCB 첫 필드에 SP를 쓰는 곳이고, 0x44-0x4c는 `vTaskSwitchContext`를 부르기 전에 SP를 8바이트 정렬로 맞춥니다. AAPCS32는 public interface에서 "SP mod 8 = 0. The stack must be double-word aligned."를 요구합니다(2025Q1 L1085). 이 포트는 QEMU에서 실행하지 않았습니다. GIC 초기화와 tick timer 설정을 갖춘 보드 지원 코드가 필요하기 때문입니다.

## SVC — 시스템 콜 entry

AArch32의 svc 명령은 Supervisor 예외 경로로 들어갑니다. 그 명령을 어떤 OS API에 연결할지는 커널 ABI가 정합니다. 이 FreeRTOS 포트에서 SVC는 yield 하나에만 쓰입니다. `FreeRTOS_SWI_Handler`(L145)가 portSAVE_CONTEXT → `vTaskSwitchContext` → portRESTORE_CONTEXT를 수행하고, 다른 FreeRTOS API는 System 모드에서 일반 함수로 호출됩니다.

```asm
    svc #0
```

Linux AArch32 시스템 콜도 SVC 예외를 이용하지만 호출 번호와 인자 전달 규약은 Linux ABI입니다. FreeRTOS 태스크의 System 모드 실행 모델을 User 모드 보호 경계가 있는 Linux 모델과 동일하게 보면 안 됩니다.

## MMU·Cache 영향

FreeRTOS ARM_CA9 포트의 전환 코드에는 TLB나 cache 유지 명령이 하나도 없습니다(위 역어셈블). 모든 task가 같은 주소 공간을 쓰기 때문입니다. 주소 공간을 바꾸는 OS에서는 페이지 테이블을 고친 뒤에 TLB 유지 명령이 필요하고, 그 순서는 아키텍처가 정합니다.

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

이 예제를 clang `--target=aarch64-none-elf`로 assemble하면 통과하고, `--target=arm-none-eabi -mcpu=cortex-a9 -marm`으로는 `error: invalid instruction`(`tlbi vmalle1is`)으로 거부됩니다. 저장소의 `scripts/verify-rtos-context-examples.mjs`가 이 두 경우를 확인합니다.

## NEON / VFP

원본 ARM_CA9 포트의 FP 경로는 D0–D31의 256 byte에 FPSCR 4 byte를 더 저장합니다. 위 표처럼 FP task의 전체 context는 83 word = 332 byte입니다.

어느 task가 FP를 쓰는지는 task가 스스로 `vPortTaskUsesFPU()`를 불러 `ulPortTaskHasFPUContext`를 1로 만들어 알립니다([`ARM_CA9/port.c`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CA9/port.c)). Cortex-M4F처럼 하드웨어가 EXC_RETURN으로 알려 주는 방식이 아니어서, FP를 쓰면서 이 함수를 부르지 않은 task는 전환 때 FP 레지스터를 잃습니다.

## TrustZone — Secure/Non-secure World

Secure world 전환은 RTOS의 같은 world 안 태스크 전환과 다른 계약이고, 어떤 상태를 저장할지는 monitor 코드가 정합니다. FreeRTOS ARM_CA9 포트의 `portASM.S`·`port.c`에는 SMC 명령이나 Monitor 모드 코드가 없습니다.

## 비용 — Cortex-M vs Cortex-A

두 포트의 저장량은 소스로 비교할 수 있습니다. 정수 task 기준 Cortex-M4F는 17 word(HW 8 + SW 9, 2-04), Cortex-A9는 18 word를 모두 소프트웨어로 저장합니다. FP task는 각각 51 word와 83 word입니다. 시간은 이 장에서 재지 않았습니다. 코어·클록·cache·메모리 조건이 정해져야 의미가 있기 때문입니다.

## Zephyr Cortex-A Port

PendSV는 Cortex-M에만 있는 예외라서 Cortex-A 포트에는 없습니다. Zephyr v3.7.0의 AArch32 Cortex-A/R 코드는 `arch/arm/core/cortex_a_r/`에 있고, context switch는 `CONFIG_USE_SWITCH`이면 `switch.S`, 아니면 `swap_helper.S`의 `z_arm_do_swap`이 맡습니다(같은 디렉터리 `CMakeLists.txt` L26-L27). 이 장은 FreeRTOS ARM_CA9만 따라갔습니다.

## 자주 하는 실수

- **User와 System에 서로 다른 SP bank가 있다고 생각합니다.** 두 모드는 SP/LR을 공유하며 권한은 다릅니다.
- **SVC stack에 push한 값을 task context로 취급합니다.** FreeRTOS ARM_CA9는 `SRSDB sp!, #SYS_MODE`로 복귀 상태를 *System* stack, 즉 task stack에 씁니다.
- **AArch32 코드에 AArch64 TLBI를 섞습니다.** ISA와 exception-level 용어를 일관되게 사용합니다.
- **FP task에서 `vPortTaskUsesFPU()`를 빠뜨립니다.** CA9 포트는 이 flag가 있는 task만 D0–D31을 저장합니다.

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
- [Arm ARMv7-A/R Architecture Reference Manual](https://developer.arm.com/documentation/ddi0406/latest): 모드·banked register·SRS/RFE. 이 장의 모드 값과 bank 공유는 이 문서를 직접 열어 대조하지 못했고, 대신 QEMU `vexpress-a9`에서 CPSR과 User bank를 읽어 확인했습니다.
- QEMU 실험: `banked.S`, arm-none-eabi-gcc 16.2.0 `-mcpu=cortex-a9 -marm`, QEMU 11.1.3 `vexpress-a9 -semihosting`.
- [Arm Instruction Set Reference Guide, D2.176 TLBI](https://documentation-service.arm.com/static/6245c734b059dc5ff9a8bdab): 별도 AArch64 maintenance 명령.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
