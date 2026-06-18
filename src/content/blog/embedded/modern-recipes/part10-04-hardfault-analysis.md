---
title: "Cortex-M 하드폴트 분석 — Stacked Frame·CFSR 읽기"
date: 2026-04-19T09:03:00
description: "Cortex-M HardFault 핸들러에서 stacked PC·LR·CFSR을 추출해 정확한 fault 위치를 찾는 절차를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 114
tags: [recipes, debugging, hardfault, cortex-m]
---

## 한 줄 요약

> **"HardFault는 *우연*이 아니라 *기록을 남기고* 떨어집니다."** Stacked PC와 CFSR 두 값만 정확히 읽어내면 90%의 hardfault는 5분 안에 원인이 잡힙니다.

## 사례 — "그냥 멈춰요"

QA에서 "보드가 5초쯤 동작하다 멈춥니다"라는 보고가 옵니다. UART 출력도 없고 LED 토글도 멈춥니다. JTAG로 halt해 보면 PC가 `HardFault_Handler` 안입니다. 여기서부터 시작입니다.

```text
(gdb) backtrace
#0  HardFault_Handler () at startup.s:142
#1  <signal handler called>
#2  0x????????

(gdb) info registers
r0  0x12345678
...
PC  0x08000142  ← HardFault_Handler
LR  0xfffffff9  ← EXC_RETURN — main stack 리턴
PSR 0x01000003
```

`backtrace`는 도움이 안 됩니다. *진짜 fault가 난 PC*는 stack frame 안에 있습니다.

## 핵심 개념 — Stacked Frame

Cortex-M은 예외 진입 시 다음 8 word를 *자동으로* stack에 push합니다.

```text
SP →  R0
      R1
      R2
      R3
      R12
      LR     ← fault 직전 함수의 return address
      PC     ← fault 발생 명령 주소
      xPSR
```

EXC_RETURN의 LR (`0xFFFFFFF9`, `0xFFFFFFFD` 등)으로 *어느 stack에 push되었는지*를 알 수 있습니다.

```text
LR 값          Mode              Stack
0xFFFFFFF1     Handler           MSP
0xFFFFFFF9     Thread, no FP     MSP
0xFFFFFFFD     Thread, no FP     PSP
0xFFFFFFE1/E9  Thread, FP        + FP regs
```

## Step 1 — Handler에서 SP 잡기

```c
__attribute__((naked))
void HardFault_Handler(void) {
    __asm volatile (
        "tst   lr, #4           \n"   // bit 2: 0=MSP, 1=PSP
        "ite   eq               \n"
        "mrseq r0, msp          \n"
        "mrsne r0, psp          \n"
        "b     hardfault_report \n"
    );
}

void hardfault_report(uint32_t *sp) {
    uint32_t r0   = sp[0];
    uint32_t r1   = sp[1];
    uint32_t r2   = sp[2];
    uint32_t r3   = sp[3];
    uint32_t r12  = sp[4];
    uint32_t lr   = sp[5];
    uint32_t pc   = sp[6];   // ← fault 명령 주소
    uint32_t psr  = sp[7];

    uint32_t cfsr = *(volatile uint32_t*)0xE000ED28;
    uint32_t hfsr = *(volatile uint32_t*)0xE000ED2C;
    uint32_t mmar = *(volatile uint32_t*)0xE000ED34;
    uint32_t bfar = *(volatile uint32_t*)0xE000ED38;

    printf("HARDFAULT\n");
    printf("PC   = 0x%08lx\n", pc);
    printf("LR   = 0x%08lx\n", lr);
    printf("CFSR = 0x%08lx\n", cfsr);
    printf("HFSR = 0x%08lx\n", hfsr);
    printf("MMAR = 0x%08lx\n", mmar);
    printf("BFAR = 0x%08lx\n", bfar);

    while (1);
}
```

이 핸들러를 startup 코드의 weak `HardFault_Handler`를 override해서 넣어 둡니다.

## Step 2 — CFSR 비트 해석

CFSR(Configurable Fault Status Register, `0xE000ED28`) 32비트는 세 sub-register로 나뉩니다.

```text
[31:16] UFSR — Usage Fault
  bit 16  UNDEFINSTR    정의되지 않은 명령
  bit 17  INVSTATE      Thumb 비트 0
  bit 18  INVPC         예외 return 시 잘못된 EXC_RETURN
  bit 19  NOCP          코프로세서 없음
  bit 24  UNALIGNED     unaligned access
  bit 25  DIVBYZERO     0으로 나눔

[15:8] BFSR — Bus Fault
  bit 8   IBUSERR       명령 fetch
  bit 9   PRECISERR     precise data bus error (BFAR 유효)
  bit 10  IMPRECISERR   imprecise (BFAR 무효, 위치 부정확)
  bit 11  UNSTKERR      exception entry stacking
  bit 12  STKERR        exception exit unstacking
  bit 15  BFARVALID     BFAR에 주소 적힘

[7:0]  MMFSR — MemManage Fault (MPU)
  bit 0   IACCVIOL      명령 fetch MPU violation
  bit 1   DACCVIOL      data access MPU violation
  bit 7   MMARVALID     MMAR에 주소 적힘
```

가장 흔한 두 패턴.

```text
CFSR = 0x00008200
  → BFSR bit 9 (PRECISERR) + bit 15 (BFARVALID)
  → BFAR 주소에 *유효한 fault 위치* 있음
  → 보통: null pointer dereference, peripheral 미초기화

CFSR = 0x00020000
  → UFSR bit 17 (INVSTATE)
  → 함수 포인터 호출 시 LSB가 0 (Thumb 비트 누락)
  → 보통: function pointer 깨짐
```

## Step 3 — PC를 source line으로

```bash
arm-none-eabi-addr2line -e firmware.elf -f -C 0x08001234
process_packet
src/packet.c:87
```

또는 GDB에서 직접.

```text
(gdb) list *0x08001234
0x8001234 is in process_packet (packet.c:87).
82  if (hdr->len > MAX_LEN) return -1;
83  uint8_t *dst = buffers[hdr->channel];
84
85  // hdr->channel이 음수 (channel = -1) → buffers[-1] dereference
86  // → BFAR = 0x20001ff8 (buffers 직전 주소)
87  memcpy(dst, payload, hdr->len);
```

이 한 줄에서 채널 음수가 들어온 path를 따라가면 원인이 잡힙니다.

## 사례 마무리

처음 보드의 CFSR/BFAR이 다음이었습니다.

```text
CFSR = 0x00008200    BFAR = 0x00000004
PC   = 0x08002A18    LR   = 0x0800291C
```

`0x00000004`는 *null pointer + 4*. 누군가 `NULL->next` 같은 dereference를 했다는 신호입니다.

```bash
addr2line -e firmware.elf 0x08002A18
queue_pop
src/queue.c:42
```

```c
// queue.c:42
QueueItem *item = q->head;
q->head = item->next;   // ← item이 NULL일 때
```

`q->head`가 비어 있을 때 `queue_pop`을 호출한 caller가 범인이었습니다. ISR과 main이 같은 queue를 다루며 빈 큐 검사를 ISR이 빠뜨렸습니다. 5초 후 발생은 ISR이 처음 *empty queue*를 만났을 때였습니다.

## Imprecise BFSR — 가장 까다로움

```text
CFSR = 0x00000400    BFSR bit 10 IMPRECISERR
BFAR 무효
```

Write buffer 때문에 fault PC가 실제 명령보다 *몇 사이클 늦게* 보고됩니다. 다음을 시도합니다.

```c
// SCB->ACTLR에서 write buffer disable (디버깅 시에만)
*(volatile uint32_t*)0xE000E008 |= (1 << 1);  // DISDEFWBUF
```

이러면 fault가 *정확한 PC*에 떨어집니다. Production에서는 해제합니다.

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

Field 환경에서 boot 후 *이전 reset 원인*을 알 수 있습니다. STM32 RTC backup, RP2040 watchdog scratch, NRF52 GPREGRET 모두 reset에서 살아남는 영역을 제공합니다.

## CFSR 비트별 흔한 원인

| CFSR | 의미 | 흔한 원인 |
|---|---|---|
| BFSR PRECISERR + BFAR | precise bus error | null pointer, 미초기화 peripheral, RCC clock off |
| BFSR IMPRECISERR | imprecise | write buffer로 인한 지연 — disable 후 재현 |
| UFSR UNDEFINSTR | undefined inst | flash 깨짐, JTAG 잘못 flash |
| UFSR INVSTATE | thumb 비트 0 | function pointer 깨짐, code memory 손상 |
| UFSR UNALIGNED | unaligned access | `__packed` 구조체 → 정렬 안 된 word load/store |
| MMFSR DACCVIOL + MMAR | MPU violation | task stack overflow가 guard region 침범 |

## 자주 보는 함정

> Handler에서 printf 호출

UART buffer DMA가 fault로 멈춘 상태일 수 있습니다. `HAL_UART_Transmit` polling 모드로 하거나, ITM/SWO로 출력합니다.

> Stack pointer가 깨진 채로 handler 진입

```text
SP = 0xdeadbeef    ← stack 자체가 무효
sp[6] 읽기 → 또 fault → "lockup"
```

NVIC가 stacked frame을 못 push해서 무한 fault에 빠집니다. `HFSR.FORCED`가 떨어집니다. Stack overflow가 원인입니다. MPU stack guard로 *먼저* 잡아야 합니다.

> 잘못된 EXC_RETURN

```c
__asm volatile ("bx %0" :: "r"(0xFFFFFFF8));   // ← reserved
```

EXC_RETURN을 인라인 어셈블리로 만들 때 reserved 값을 쓰면 UFSR INVPC가 떨어집니다.

> `-Os` 빌드에서 PC와 source의 미스매치

`addr2line`이 함수 이름은 맞지만 줄이 어긋날 수 있습니다. `-Og`로 빌드하거나, `objdump -dS firmware.elf | less`로 어셈블리·source 인터리브를 봅니다.

> CFSR을 *읽고 안 clear*

```c
uint32_t cfsr = *(volatile uint32_t*)0xE000ED28;
// CFSR은 W1C — 다음 fault 추적을 위해 clear
*(volatile uint32_t*)0xE000ED28 = cfsr;
```

Reset 없이 fault 재현 디버깅을 할 때 누적된 bit 때문에 헷갈립니다.

## 정리

- HardFault는 stacked frame과 CFSR에 모든 단서를 남깁니다.
- LR (EXC_RETURN) 비트 2로 MSP/PSP를 골라 stacked frame을 잡습니다.
- Stacked PC가 *fault 발생 명령*. `addr2line`으로 source line.
- CFSR을 BFSR/UFSR/MMFSR로 나눠 읽고 BFAR/MMAR을 함께 봅니다.
- Imprecise BFSR은 write buffer disable로 precise하게 만듭니다.
- Field에서는 fault record를 NVRAM에 남기고 reset합니다.
- Stack overflow가 lockup의 가장 흔한 원인. MPU guard로 먼저 잡습니다.

다음 편은 **UART 안 찍힐 때**입니다.

## 관련 항목

- [10-03: GDB 원격 디버깅](/blog/embedded/modern-recipes/part10-03-gdb-remote-debug)
- [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)
- [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)
- [Embedded Performance Ch 8: Crash 분석](/blog/embedded/performance-engineering/part5-08-nsight)
