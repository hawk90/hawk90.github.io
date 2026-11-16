---
title: "Cortex-M 하드폴트 분석 — Stacked Frame·CFSR 읽기"
slug: "embedded/modern-recipes/part10-04-hardfault-analysis"
date: 2026-04-19T09:03:00
description: "Cortex-M HardFault 핸들러로 stacked PC·LR과 CFSR·HFSR·BFAR을 읽는 절차를, QEMU mps2-an386에서 일으킨 다섯 가지 fault(NULL 읽기·쓰기, 매핑 안 된 주소, Thumb 비트 누락, 0 나누기)의 실제 출력과 ARMv7-M ARM으로 따라갑니다."
series: "Modern Embedded Recipes"
seriesOrder: 114
tags: [recipes, debugging, hardfault, cortex-m]
topics: ["embedded"]
---

## 한 줄 요약

> **"HardFault는 *기록을 남기고* 분석해야 합니다."** Stacked frame과 CFSR는 중요한 단서지만, fault 종류·stacking 상태·최적화와 target 구현을 함께 확인해야 합니다.

## 어떤 상황에서 쓰나

디버거로 멈춰 보니 PC가 `HardFault_Handler` 안이고 `backtrace`가 handler 위로 이어지지 않는 경우입니다. fault를 일으킨 명령의 주소는 핸들러가 아니라, 예외 진입 때 stack에 저장된 frame 안에 있습니다. 이 글은 그 frame과 fault 상태 레지스터를 읽어 원인 명령까지 가는 순서를 QEMU에서 실제로 fault를 다섯 가지 일으켜 보며 따라갑니다.

근거는 ARMv7-M Architecture Reference Manual(DDI 0403E, 이하 ARMv7-M ARM) B1.5와 B3.2, Cortex-M4 TRM(DDI 0439B)입니다. 실행 환경은 QEMU 11.1.3의 `mps2-an386`(Cortex-M4)이고, 보드에서는 실행하지 않았습니다.

## 핵심 개념 — Stacked Frame

예외에 들어갈 때 프로세서는 8 word의 기본 frame을 stack에 저장합니다. FP extension이 있고 FP 상태가 살아 있으면 FP 레지스터까지 담은 extended frame이 되고, stack 정렬을 위해 한 word가 더 들어갈 수 있습니다(ARMv7-M ARM B1.5.6·B1.5.7).

SP가 가리키는 낮은 주소부터 차례로 다음과 같이 쌓입니다.

| 순서 | 레지스터 | 의미 |
|------|----------|------|
| 1 | R0 | |
| 2 | R1 | |
| 3 | R2 | |
| 4 | R3 | |
| 5 | R12 | |
| 6 | LR | 예외 직전의 LR |
| 7 | PC | 복귀 주소. precise fault라면 fault를 낸 명령 |
| 8 | xPSR | |

핸들러에 들어온 순간 LR에는 EXC_RETURN 값이 들어 있고, 이 값으로 frame이 어느 stack에 어떤 형태로 쌓였는지 압니다. ARMv7-M ARM Table B1-9(FP extension이 있는 경우)입니다.

| EXC_RETURN | 복귀 모드 | stack | frame |
| --- | --- | --- | --- |
| `0xFFFFFFE1` | Handler | Main(MSP) | Extended(FP 포함) |
| `0xFFFFFFE9` | Thread | Main | Extended |
| `0xFFFFFFED` | Thread | Process(PSP) | Extended |
| `0xFFFFFFF1` | Handler | Main | Basic |
| `0xFFFFFFF9` | Thread | Main | Basic |
| `0xFFFFFFFD` | Thread | Process | Basic |

bit 2가 0이면 MSP, 1이면 PSP입니다. 아래 핸들러가 `tst lr, #4`로 고르는 것이 이 비트입니다.

## Step 1 — Handler에서 SP 잡기

핸들러는 어셈블리 몇 줄로 frame 주소를 골라 C 함수에 넘깁니다. 아래는 실제로 QEMU에서 돌린 코드이고, `pr()`은 semihosting으로 출력하는 작은 printf입니다. EXC_RETURN도 함께 넘겨 출력합니다.

```c
__attribute__((naked)) void HardFault_Handler(void) {
    __asm volatile (
        "tst   lr, #4           \n"   /* bit 2: 0 = MSP, 1 = PSP */
        "ite   eq               \n"
        "mrseq r0, msp          \n"
        "mrsne r0, psp          \n"
        "mov   r1, lr           \n"   /* EXC_RETURN */
        "b     hardfault_report \n");
}

void hardfault_report(uint32_t *sp, uint32_t exc_return) {
    pr("HARDFAULT  EXC_RETURN=0x%08x\n", exc_return);
    pr("PC   = 0x%08x  LR = 0x%08x  xPSR = 0x%08x\n", sp[6], sp[5], sp[7]);
    pr("CFSR = 0x%08x  HFSR = 0x%08x\n", *(volatile uint32_t *)0xE000ED28, *(volatile uint32_t *)0xE000ED2C);
    pr("MMFAR= 0x%08x  BFAR = 0x%08x\n", *(volatile uint32_t *)0xE000ED34, *(volatile uint32_t *)0xE000ED38);
    sh_exit(1);
}
```

이 핸들러를 startup 코드의 weak `HardFault_Handler`를 override해서 넣어 둡니다.

## Step 2 — CFSR 비트 해석

CFSR(Configurable Fault Status Register, `0xE000ED28`) 32비트는 세 sub-register로 나뉩니다.

`[31:16]`은 UFSR(Usage Fault), `[15:8]`은 BFSR(Bus Fault), `[7:0]`은 MMFSR(MemManage Fault, MPU)입니다.

| Sub-register | 비트 | 이름 | 의미 |
|--------------|------|------|------|
| UFSR `[31:16]` | bit 16 | `UNDEFINSTR` | 정의되지 않은 명령 |
| UFSR `[31:16]` | bit 17 | `INVSTATE` | Thumb 비트 0 |
| UFSR `[31:16]` | bit 18 | `INVPC` | 예외 return 시 잘못된 EXC_RETURN |
| UFSR `[31:16]` | bit 19 | `NOCP` | 코프로세서 없음 |
| UFSR `[31:16]` | bit 24 | `UNALIGNED` | unaligned access |
| UFSR `[31:16]` | bit 25 | `DIVBYZERO` | 0으로 나눔 |
| BFSR `[15:8]` | bit 8 | `IBUSERR` | 명령 fetch |
| BFSR `[15:8]` | bit 9 | `PRECISERR` | precise data bus error (BFAR 유효) |
| BFSR `[15:8]` | bit 10 | `IMPRECISERR` | imprecise (BFAR 무효, 위치 부정확) |
| BFSR `[15:8]` | bit 11 | `UNSTKERR` | 예외 복귀(unstacking) 중 bus fault |
| BFSR `[15:8]` | bit 12 | `STKERR` | 예외 진입(stacking) 중 bus fault |
| BFSR `[15:8]` | bit 15 | `BFARVALID` | BFAR에 주소 적힘 |
| MMFSR `[7:0]` | bit 0 | `IACCVIOL` | 명령 fetch MPU violation |
| MMFSR `[7:0]` | bit 1 | `DACCVIOL` | data access MPU violation |
| MMFSR `[7:0]` | bit 7 | `MMARVALID` | MMAR에 주소 적힘 |

비트 정의는 ARMv7-M ARM B3.2.15입니다. HardFault 상태 레지스터 HFSR(`0xE000ED2C`)의 bit 30 `FORCED`는 우선순위나 비활성 때문에 configurable fault가 HardFault로 올라왔다는 뜻입니다(B3.2.16). MemManage·BusFault·UsageFault 핸들러를 따로 켜지 않으면 셋 다 HardFault로 올라오므로, 아래 실행에서는 모든 경우에 `FORCED`가 섭니다.

### 다섯 가지 fault를 실제로 일으켜 보기

같은 핸들러로, 코드 하나를 `-DCASE=N`으로 다섯 번 빌드해 돌렸습니다. 각 경우의 핵심 코드는 다음과 같습니다.

| CASE | 코드 | 의도 |
| --- | --- | --- |
| 1 | `queue_pop()`이 빈 큐에서 `q->head->next`를 읽음 | NULL 읽기 (0x0, 0x4) |
| 2 | `((struct item *)0)->next = ...` | NULL 쓰기 |
| 3 | `*(volatile uint32_t *)0x60000000` 읽기 | 매핑되지 않은 주소 |
| 4 | `write_null_next` 주소의 bit 0을 지운 함수 포인터 호출 | Thumb 비트 누락 |
| 5 | `CCR.DIV_0_TRP`를 켜고 `1 / 0` | 0으로 나누기 |

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O1 -g -ffreestanding -nostdlib -DCASE=$c \
  -T an386.ld startup.c sh.c hf.c -lgcc -o hf$c.elf
qemu-system-arm -M mps2-an386 -nographic -monitor none -serial none \
  -semihosting-config enable=on,target=native -kernel hf$c.elf
```

```text
=== CASE 1
case 1
queue_pop(empty) returned 67
=== CASE 2
case 2
=== CASE 3
case 3
HARDFAULT  EXC_RETURN=0xfffffff9
PC   = 0x000002fa  LR = 0x00000325  xPSR = 0x61000000
CFSR = 0x00008200  HFSR = 0x40000000
MMFAR= 0x00000000  BFAR = 0x60000000
=== CASE 4
case 4
HARDFAULT  EXC_RETURN=0xfffffff9
PC   = 0x00000280  LR = 0x00000309  xPSR = 0x60000000
CFSR = 0x00020000  HFSR = 0x40000000
MMFAR= 0x00000000  BFAR = 0x00000000
=== CASE 5
case 5
HARDFAULT  EXC_RETURN=0xfffffff9
PC   = 0x00000310  LR = 0x00000339  xPSR = 0x21000000
CFSR = 0x02000000  HFSR = 0x40000000
MMFAR= 0x00000000  BFAR = 0x00000000
```

결과를 비트로 풀면 다음과 같습니다.

| CASE | CFSR | 세워진 비트 | 의미 |
| --- | --- | --- | --- |
| 1 | — | fault 없음 | 0x4를 읽으면 vector table의 reset vector(0x43)가 나옴 |
| 2 | — | fault 없음 | QEMU에서는 0x0 쓰기도 fault가 나지 않음 |
| 3 | `0x00008200` | BFSR `PRECISERR`(bit 9) + `BFARVALID`(bit 15) | BFAR = 0x60000000, 정확한 주소 |
| 4 | `0x00020000` | UFSR `INVSTATE`(bit 17) | stacked PC = 0x280, Thumb 비트가 빠진 분기 대상 |
| 5 | `0x02000000` | UFSR `DIVBYZERO`(bit 25) | `CCR.DIV_0_TRP`를 켠 경우에만 |

CASE 1이 이 글의 가장 중요한 결과입니다. 빈 큐에서 `NULL->next`를 읽었는데 fault 없이 `queue_pop(empty) returned 67`이 나왔습니다. Cortex-M에서 0번지는 vector table이 놓이는 code 영역이고, 0x4의 내용은 reset vector 0x43(Reset_Handler 0x42 + Thumb 비트)입니다. STM32F405/407도 0x0000_0000~0x000F_FFFF가 BOOT 핀에 따라 Flash·system memory·SRAM의 alias라서(DS8626 memory map) 같은 일이 생깁니다. NULL 포인터 *읽기*는 fault로 잡히지 않고 엉뚱한 값을 돌려주며, 잡으려면 MPU로 0번지 영역을 접근 금지로 만들어야 합니다([10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)).

## Step 3 — PC를 source line으로

위 실행의 stacked PC를 `addr2line`에 넣으면 source 줄이 나옵니다.

```text
$ arm-none-eabi-addr2line -e hf3.elf -f 0x000002fa
read_unmapped
hf.c:40
$ arm-none-eabi-addr2line -e hf4.elf -f 0x00000280
write_null_next
hf.c:35
$ arm-none-eabi-addr2line -e hf5.elf -f 0x00000310
divide
hf.c:48
```

세 경우 모두 fault를 낸 함수와 줄을 가리킵니다. CASE 4는 조금 다릅니다. stacked PC 0x280은 fault를 낸 명령이 아니라 *분기 대상*인 `write_null_next`의 시작 주소입니다. bit 0이 0인 주소로 분기하면 실행 상태가 Thumb가 아니게 되어, 그 주소에서 첫 명령을 실행하려는 순간 INVSTATE가 납니다. 그래서 원인은 PC가 아니라 stacked LR(0x309, 분기를 한 `call_even_ptr`)에 있습니다. GDB에서는 `list *0x2fa`, LLDB에서는 `image lookup -a 0x2fa`가 같은 일을 합니다.

## Imprecise BFSR — 가장 까다로움

```text
CFSR = 0x00000400    BFSR bit 10 IMPRECISERR
BFAR 무효
```

IMPRECISERR는 store가 write buffer를 거쳐 나중에 끝나면서 bus error가 났다는 뜻이라, 그때 stacked PC는 이미 그 store 뒤의 명령을 가리키고 BFAR도 유효하지 않습니다. Cortex-M4 TRM 4.3.1은 ACTLR(`0xE000E008`)의 bit 1 `DISDEFWBUF`가 default memory map 접근에서 write buffer를 끄고, 그러면 모든 bus fault가 precise가 되는 대신 store가 끝날 때까지 다음 명령이 기다려 성능이 떨어진다고 적습니다.

```c
// SCB->ACTLR에서 write buffer disable (디버깅 시에만)
*(volatile uint32_t*)0xE000E008 |= (1 << 1);  // DISDEFWBUF
```

디버깅할 때만 켜고, 원인을 찾으면 끕니다. QEMU는 write buffer를 모델링하지 않아 위 CASE 3도 precise로 나왔으므로, imprecise fault는 이 실행으로 재현하지 못했습니다.

## 사용 권장 패턴 — fault 정보 NVRAM 저장

```c
typedef struct {
    uint32_t magic;     // 0xFA17DEAD
    uint32_t pc, lr, psr;
    uint32_t cfsr, hfsr;
    uint32_t bfar, mmar;
    uint32_t reason;    // 자체 정의 code
} fault_record_t;

void hardfault_report(uint32_t *sp) {
    fault_record_t *fr = (void*)BACKUP_SRAM_BASE;
    fr->magic = 0xFA17DEAD;
    fr->pc    = sp[6];
    fr->lr    = sp[5];
    fr->cfsr  = *(volatile uint32_t*)0xE000ED28;
    /* ... */
    NVIC_SystemReset();
}

void boot_check_fault(void) {
    fault_record_t *fr = (void*)BACKUP_SRAM_BASE;
    if (fr->magic == 0xFA17DEAD) {
        printf("Last boot fault: PC=0x%08lx CFSR=0x%08lx\n",
               fr->pc, fr->cfsr);
        fr->magic = 0;
    }
}
```

다음 부팅에서 직전 fault의 PC와 CFSR을 읽을 수 있습니다. `BACKUP_SRAM_BASE`는 reset으로 지워지지 않는 영역이어야 합니다. STM32F405/407에는 4 KB backup SRAM이 있습니다(DS8626 첫 쪽 "192+4KB RAM"). 이 영역에 쓰려면 PWR·backup domain 접근을 먼저 열어야 하는데, 그 절차는 레퍼런스 매뉴얼의 PWR 절에 있습니다. 같은 일을 하는 코드는 [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)에 있습니다.

## CFSR 비트에서 다음 행동으로

| CFSR | 확인할 것 |
|---|---|
| BFSR `PRECISERR` + `BFARVALID` | BFAR 주소가 어느 영역인지 메모리 맵과 대조(위 CASE 3) |
| BFSR `IMPRECISERR` | `DISDEFWBUF`로 precise하게 만든 뒤 다시 재현 |
| UFSR `INVSTATE` | stacked LR 쪽의 분기, 함수 포인터 값의 bit 0(위 CASE 4) |
| UFSR `DIVBYZERO` | `CCR.DIV_0_TRP`가 켜졌는지, 나누는 값의 출처(위 CASE 5) |
| UFSR `UNALIGNED` | `CCR.UNALIGN_TRP`가 켜졌는지, packed 구조체 접근 |
| MMFSR `DACCVIOL` + `MMARVALID` | MMFAR 주소가 어느 MPU region인지 |
| BFSR `STKERR` / MMFSR `MSTKERR` | 예외 진입 때 stacking 실패. stacked frame 자체를 믿지 않는다 |

## 자주 보는 함정

> Handler에서 printf 호출

fault가 UART 드라이버나 그 DMA 버퍼에서 났다면, 같은 드라이버로 출력하는 순간 다시 fault가 납니다. 핸들러에서는 레지스터에 직접 쓰는 polling 출력이나 ITM처럼 드라이버 상태에 기대지 않는 경로를 씁니다. 위 실행은 semihosting으로 출력했습니다.

> Stack pointer가 깨진 채로 handler 진입

stack이 넘쳐 SP가 유효하지 않은 곳을 가리키면, 예외 진입 때 frame을 쌓는 일부터 실패합니다. ARMv7-M ARM B3.2.15는 이를 BFSR `STKERR`(bus fault) 또는 MMFSR `MSTKERR`(MemManage)로 기록하므로, 이 비트가 서 있으면 `sp[6]`의 PC를 믿지 않습니다. stack 끝에 MPU guard region을 두면 넘치는 순간 MemManage fault가 나서 원인 위치에서 멈춥니다(10-08).

> 잘못된 EXC_RETURN

ARMv7-M ARM B1.5.8은 위 표에 없는 reserved EXC_RETURN을 쓰면 연쇄 UsageFault가 난다고 적습니다(UFSR `INVPC`). 같은 절은 Thread 모드에서 EXC_RETURN 모양의 값을 PC에 넣으면 특별한 값이 아니라 주소로 취급되고, 0xFXXXXXXX 영역은 Execute Never라서 MemManage나 INVSTATE UsageFault가 난다고 적습니다. RTOS의 context switch 코드를 고칠 때 이 두 경우를 구분합니다.

> `-Os` 빌드에서 PC와 source의 미스매치

최적화 빌드에서는 줄 번호가 없는 명령이나 여러 줄이 섞인 명령이 생깁니다([10-03](/blog/embedded/modern-recipes/part10-03-gdb-remote-debug)의 `-O2` 예). `addr2line`의 줄이 의심스러우면 `objdump -dS firmware.elf`로 그 주소 주변의 어셈블리와 source를 함께 봅니다.

> CFSR을 *읽고 안 clear*

```c
uint32_t cfsr = *(volatile uint32_t*)0xE000ED28;
// CFSR은 W1C — 다음 fault 추적을 위해 clear
*(volatile uint32_t*)0xE000ED28 = cfsr;
```

CFSR의 비트는 1을 써야 지워집니다(ARMv7-M ARM B3.2.15의 각 sub-register 설명). 지우지 않으면 다음 fault 때 이전 비트가 남아 있어, reset 없이 fault를 반복 재현할 때 두 fault가 섞여 보입니다.

## 정리

- HardFault는 stacked frame과 CFSR에 모든 단서를 남깁니다.
- LR (EXC_RETURN) 비트 2로 MSP/PSP를 골라 stacked frame을 잡습니다.
- precise fault에서 stacked PC는 fault를 낸 명령입니다(CASE 3·5). INVSTATE는 분기 대상이 PC이고 원인은 stacked LR 쪽입니다(CASE 4). imprecise bus fault는 PC가 뒤에 있습니다.
- CFSR을 BFSR/UFSR/MMFSR로 나눠 읽고 BFAR/MMFAR을 함께 봅니다. 별도 핸들러가 없으면 `HFSR.FORCED`가 섭니다.
- Cortex-M에서 NULL 읽기는 vector table을 읽을 뿐 fault가 나지 않습니다(CASE 1). MPU로 0번지를 막아야 잡힙니다.
- Imprecise BFSR은 `ACTLR.DISDEFWBUF`로 precise하게 만듭니다(M4 TRM).
- `STKERR`·`MSTKERR`가 서 있으면 stacked frame을 믿지 않습니다.

다음 편은 **UART 안 찍힐 때**입니다.

## 관련 항목

- [10-03: GDB 원격 디버깅](/blog/embedded/modern-recipes/part10-03-gdb-remote-debug)
- [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)
- [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)
- [Embedded Performance Ch 8: Crash 분석](/blog/embedded/performance-engineering/part5-08-nsight)
