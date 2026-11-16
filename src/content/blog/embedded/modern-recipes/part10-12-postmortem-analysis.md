---
title: "임베디드 포스트모템 분석 — Core Dump와 Field Crash"
slug: "embedded/modern-recipes/part10-12-postmortem-analysis"
date: 2026-04-19T09:11:00
description: "Linux core dump 설정과 gdb 분석의 요점을 정리하고, MCU mini-dump를 QEMU에서 fault → 저장 → reset → 다음 부팅 보고까지 실제로 돌려 addr2line으로 원인 줄을 찾으며, reset 원인 플래그와 crash 묶기를 HAL·데이터시트로 짚습니다."
series: "Modern Embedded Recipes"
seriesOrder: 122
tags: [recipes, debugging, postmortem]
topics: ["embedded"]
---

## 한 줄 요약

> **"Crash는 현장에서 일어나지만 분석은 책상에서 합니다."** 그 사이를 잇는 것이 Linux의 core dump와 MCU의 mini-dump입니다.

## 어떤 상황에서 쓰나

배포한 장치가 가끔 재부팅되고, 재현은 안 되고, 사용자는 "그냥 멈췄다"고만 합니다. 이때 필요한 것은 crash 순간의 레지스터·메모리·로그를 남겨 두었다가 나중에 꺼내 보는 장치입니다. Linux 기반 장치는 커널의 core dump를, OS가 없는 MCU는 직접 만든 mini-dump를 씁니다. 이 글은 MCU 쪽을 QEMU에서 실제로 끝까지 돌려 보고(fault → dump 저장 → reset → 다음 부팅에서 보고), Linux 쪽은 실제 실행 결과가 있는 [Postmortem Debugging 시리즈](/blog/tools/debugging/postmortem/chapter01-core-generation)로 연결합니다.

## Linux core dump

### 켜기

core는 기본 동작이 core인 시그널을 받은 프로세스에서, `RLIMIT_CORE`와 `/proc/sys/kernel/core_pattern`에 따라 만들어집니다. 파일 경로 패턴이면 `ulimit -c`를 따르고, `|`로 시작하는 파이프 패턴이면 그 프로그램이 core를 받습니다.

```bash
ulimit -c unlimited
echo "/var/crash/core.%e.%p.%t" | sudo tee /proc/sys/kernel/core_pattern
./my_program
```

Debian 13에서는 `systemd-coredump` 패키지를 설치하면 `core_pattern`이 그 처리기로 바뀌고 서비스의 core 한도도 함께 바뀝니다. 그 다음부터는 `coredumpctl list`로 목록을, `coredumpctl debug <PID>`로 gdb 진입을 합니다. Debian 13 VM에서 실제로 확인한 동작과 출력은 [Postmortem 1장](/blog/tools/debugging/postmortem/chapter01-core-generation)에 있습니다.

### gdb로 보기

```bash
gdb /path/to/my_program /var/crash/core.my_program.<pid>.<time>
(gdb) bt
(gdb) frame 0
(gdb) info locals
```

`bt`로 crash 지점의 호출 스택을, `frame`·`print`·`info locals`로 그 시점 변수를 봅니다. 실제 core로 돌린 세션은 [Postmortem 3장](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)에 있습니다.

### 심볼을 따로 보관하기

```bash
gcc -g -O2 -o my_program main.c
objcopy --only-keep-debug my_program my_program.debug
strip my_program
gdb -s my_program.debug my_program core
```

배포 이미지는 strip하고, 같은 빌드의 디버그 정보는 따로 보관해 분석 때 `-s`(symbol file)로 붙입니다. build-id로 디버그 정보를 찾아 주는 debuginfod와 자동화는 [Postmortem 4장](/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation)에 있습니다.

## MCU mini-dump — QEMU에서 끝까지

MCU에는 core dump를 만들어 주는 OS가 없으므로 HardFault 핸들러가 직접 남깁니다. 핵심은 세 가지입니다. reset을 거쳐도 지워지지 않는 곳에 쓰고, 쓴 뒤 reset하고, 다음 부팅에서 표시(magic)를 보고 꺼냅니다.

QEMU 11.1.3의 `mps2-an386`(Cortex-M4)에는 backup SRAM이 없으므로, 링커 스크립트에 `NOLOAD` 섹션 `.noinit`를 두고 startup의 `.bss` 0 채우기 범위 밖에 dump를 놓았습니다. QEMU는 system reset 때 RAM을 지우지 않으므로 이 영역이 살아남습니다. 실제 보드라면 STM32F405/407의 4 KB backup SRAM(기본으로 꺼져 있어 소프트웨어로 켬, DS8626 2.2.18)이 이 자리입니다.

```text
.noinit (NOLOAD) : { . = ALIGN(4); *(.noinit*) } > RAM
```

```c
#define DUMP_MAGIC 0xC0FFEE00u
typedef struct {
    uint32_t magic;
    uint32_t pc, lr, psr;
    uint32_t cfsr, hfsr, bfar, mmfar;
    uint32_t r0_r3[4], r12;
    uint32_t boots;
} mini_dump_t;
__attribute__((section(".noinit"))) mini_dump_t g_dump;   /* not zeroed by startup */

__attribute__((naked)) void HardFault_Handler(void) {
    __asm volatile("tst lr, #4\n ite eq\n mrseq r0, msp\n mrsne r0, psp\n b hardfault_save_dump\n");
}
void hardfault_save_dump(uint32_t *sp) {
    mini_dump_t *d = &g_dump;
    for (int i = 0; i < 4; i++) d->r0_r3[i] = sp[i];
    d->r12 = sp[4]; d->lr = sp[5]; d->pc = sp[6]; d->psr = sp[7];
    d->cfsr  = *(volatile uint32_t *)0xE000ED28;
    d->hfsr  = *(volatile uint32_t *)0xE000ED2C;
    d->bfar  = *(volatile uint32_t *)0xE000ED38;
    d->mmfar = *(volatile uint32_t *)0xE000ED34;
    d->magic = DUMP_MAGIC;
    __asm volatile("dsb");
    *(volatile uint32_t *)0xE000ED0C = 0x05FA0004;   /* AIRCR: VECTKEY | SYSRESETREQ */
    for (;;) { }
}

struct pkt { uint8_t len; uint8_t *payload; };
__attribute__((noinline)) uint32_t read_payload(const struct pkt *p) {
    return *(volatile uint32_t *)p->payload;          /* payload points at an unmapped address */
}

int main(void) {
    if (g_dump.magic == DUMP_MAGIC) {
        pr("Previous crash: PC=0x%08x LR=0x%08x CFSR=0x%08x BFAR=0x%08x\n",
           g_dump.pc, g_dump.lr, g_dump.cfsr, g_dump.bfar);
        g_dump.magic = 0;
        return 0;
    }
    pr("first boot: running\n");
    struct pkt p = { 4, (uint8_t *)0x60000000u };
    pr("%u\n", read_payload(&p));
    return 0;
}
```

reset은 AIRCR에 `VECTKEY`(0x05FA)와 `SYSRESETREQ`(bit 2)를 쓰는 것으로 요청합니다(ARMv7-M ARM B3.2.6). 같은 일을 CMSIS `NVIC_SystemReset()`이 합니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O1 -g -ffreestanding -nostdlib -Wall \
  -T an386.ld startup.c sh.c dump.c -lgcc -o dump.elf
qemu-system-arm -M mps2-an386 -nographic -monitor none -serial none \
  -semihosting-config enable=on,target=native -kernel dump.elf
```

```text
first boot: running
Previous crash: PC=0x000002ee LR=0x0000031d CFSR=0x00008200 BFAR=0x60000000
```

첫 부팅에서 매핑되지 않은 주소를 읽어 BusFault(HardFault로 올라감)가 났고, 핸들러가 dump를 남기고 reset을 요청했습니다. 두 번째 부팅에서 `main()`이 magic을 보고 직전 crash를 출력했습니다. 이 PC와 LR을 같은 ELF로 풀면 crash 지점과 호출한 곳이 나옵니다.

```text
$ arm-none-eabi-addr2line -s -f -e dump.elf 0x2ee 0x31d
read_payload
dump.c:34
main
dump.c:45
```

dumped PC 0x2ee는 `read_payload()`의 34행(`*(volatile uint32_t *)p->payload`)이고, CFSR 0x8200(PRECISERR + BFARVALID)과 BFAR 0x60000000이 잘못된 주소를 알려 줍니다. 비트 해석은 [10-04](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)에 있습니다. 실제 장치라면 여기서 dump를 네트워크나 저장소로 보내고, 보낸 뒤에 magic을 지웁니다.

## Last-gasp 로그

dump에 crash 직전의 이벤트 기록을 함께 넣으면 "어떻게 거기까지 갔는지"도 보입니다. 평소에는 RAM의 작은 ring에 적고, crash 때 ring 전체를 dump에 복사합니다.

```c
#define LAST_GASP_N 128
typedef struct {
    uint32_t ts;
    uint16_t code;
    uint16_t arg;
} __attribute__((packed)) gasp_t;

static volatile gasp_t g_gasp[LAST_GASP_N];
static volatile uint16_t g_gasp_idx;

static inline void gasp_log(uint16_t code, uint16_t arg) {
    uint16_t i = g_gasp_idx++ & (LAST_GASP_N - 1);
    g_gasp[i].ts   = DWT->CYCCNT;
    g_gasp[i].code = code;
    g_gasp[i].arg  = arg;
}
```

ISR과 main이 함께 부른다면 `g_gasp_idx++`는 [10-09](/blog/embedded/modern-recipes/part10-09-timing-race-diag)의 QEMU 실험처럼 경쟁하므로, 칸을 차지하는 한 줄은 IRQ를 막습니다. 남는 기록 수는 ring 크기(여기서 128개 × 8바이트 = 1 KB)로 정해집니다. 기록 비용은 [10-11](/blog/embedded/modern-recipes/part10-11-logging-system)의 측정처럼 record를 필드로 바로 쓰는 방식이 가장 적었습니다.

## Stack 끝 표지

```c
extern uint32_t _stack_bottom;
static void stack_guard_init(void) { _stack_bottom = 0xCAFEDEAD; }

void watch_stack(void) {
    if (_stack_bottom != 0xCAFEDEAD) {
        gasp_log(GASP_STACK_OVERFLOW, 0);
        /* dump를 남기고 reset */
    }
}
```

주기적으로 확인하므로 넘친 *순간*이 아니라 그 다음 확인 때 잡습니다. 넘치는 순간에 잡으려면 [10-08](/blog/embedded/modern-recipes/part10-08-memory-corruption)의 MPU guard를 씁니다(QEMU에서 첫 쓰기에 MemManage).

## Reset 원인

부팅마다 reset 원인을 읽어 dump와 함께 남깁니다. STM32F4에서는 `RCC->CSR`의 플래그입니다.

```c
uint32_t read_and_clear_reset_flags(void) {
    uint32_t csr = RCC->CSR;
    RCC->CSR |= RCC_CSR_RMVF;    /* clear */
    return csr;
}
```

HAL v1.8.6 `stm32f4xx_hal_rcc.h`의 `__HAL_RCC_GET_FLAG()` 설명은 각 플래그를 다음과 같이 적습니다.

| 플래그 | HAL 설명 |
|--------|----------|
| `BORRSTF` | POR/PDR or BOR reset |
| `PINRSTF` | Pin reset |
| `PORRSTF` | POR/PDR reset |
| `SFTRSTF` | Software reset |
| `IWDGRSTF` | Independent Watchdog reset |
| `WWDGRSTF` | Window Watchdog reset |
| `LPWRRSTF` | Low Power reset |

`BORRSTF`의 설명이 "POR/PDR or BOR"이므로 전원을 처음 켰을 때도 함께 설 수 있습니다. 그래서 brown-out만 따로 세려면 `PORRSTF`와 같이 섰는지를 봅니다. NRST 핀은 내부 reset이 날 때도 펄스를 내보내므로(DS8626 Table 50의 T_NRST_OUT, 내부 reset 원인), 핀 reset 플래그 해석은 레퍼런스 매뉴얼의 reset 절과 함께 봅니다. 위 QEMU 실행의 두 번째 부팅은 `SYSRESETREQ`에 의한 software reset입니다.

## Crash 묶기

여러 장치에서 올라온 dump는 PC 값 그대로가 아니라 `addr2line`으로 푼 함수와 줄로 묶습니다. 같은 펌웨어 빌드라면 같은 줄의 명령은 몇 바이트 차이로 다른 PC를 가질 수 있기 때문입니다. 위 실행에서도 `read_payload()`는 0x2ec가 33행, 0x2ee가 34행이었습니다. 펌웨어 버전마다 주소가 바뀌므로, dump에는 빌드를 식별할 값(빌드 ID나 버전)을 함께 넣고 그 빌드의 ELF로 풉니다.

## 자주 보는 함정

> dump를 `.bss`에 둠

```c
mini_dump_t dump;   /* .bss: startup이 0으로 채움 */
```

startup은 `.bss`를 0으로 채우므로 다음 부팅에서 dump가 지워집니다. 위 예처럼 0 채우기 범위 밖의 `.noinit`나 backup SRAM에 둡니다.

> stack이 깨진 상태의 핸들러

stack이 넘쳐 SP가 쓸 수 없는 곳을 가리키면 예외 진입의 stacking부터 실패합니다(CFSR `STKERR`·`MSTKERR`, 10-04). 이런 경우까지 dump를 남기려면 핸들러 첫머리에서 SP를 별도 영역으로 옮깁니다. 다만 그러면 stacked frame은 원래 SP 쪽에 있으므로 원래 SP를 먼저 r0에 잡아 둡니다.

```c
__attribute__((naked)) void HardFault_Handler(void) {
    __asm volatile (
        "mrs  r0, msp               \n"   /* original frame (if stacking succeeded) */
        "ldr  r1, =_fault_stack_top \n"
        "mov  sp, r1                \n"   /* switch to a reserved stack */
        "b    hardfault_save_dump   \n");
}
```

> 전송 실패로 dump를 잃음

보내기 전에 magic을 지우면 전송이 실패했을 때 dump가 사라집니다. 전송이 끝난 것을 확인한 뒤 지웁니다.

> dump에 개인 정보

RAM을 통째로 담으면 사용자 데이터가 함께 나갑니다. dump에 넣을 영역을 정해 두고, 민감한 영역은 넣지 않습니다.

> ELF를 보관하지 않음

dump의 PC는 그 빌드의 ELF가 있어야 함수와 줄로 풀립니다. 위 Linux 절의 디버그 정보 보관과 같은 이유로, 배포한 모든 펌웨어의 ELF를 보관합니다.

## 정리

- Linux는 `core_pattern`·`ulimit`(또는 systemd-coredump)로 core를 받고 gdb로 봅니다. 실제 실행은 Postmortem 시리즈에 있습니다.
- MCU mini-dump는 0 채우기 밖의 영역에 저장 → reset → 다음 부팅에 보고하는 흐름이고, QEMU에서 PC 0x2ee·CFSR 0x8200·BFAR 0x60000000을 다음 부팅까지 넘기는 것을 확인했습니다.
- dumped PC는 `addr2line`으로 함수·줄로 풀고, crash는 그 결과로 묶습니다.
- reset 원인은 `RCC->CSR`로 읽고 `BORRSTF`가 전원 투입에도 선다는 점을 감안합니다.
- dump는 전송 확인 뒤 지우고, 민감한 영역은 넣지 않으며, ELF를 보관합니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)
- [10-11: 로깅 시스템 설계](/blog/embedded/modern-recipes/part10-11-logging-system)
- RTOS 5-04: 시스템 진단
