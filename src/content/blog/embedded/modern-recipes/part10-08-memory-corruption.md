---
title: "메모리 오버플로우·오염 진단 — Canary·MPU·Pattern 분석"
slug: "embedded/modern-recipes/part10-08-memory-corruption"
date: 2026-04-19T09:07:00
description: "Stack canary·MPU guard·NULL 영역 MPU·stack fill pattern을 QEMU Cortex-M4에서, 패킷 parser 오버플로를 ASan으로 실제로 잡아 보고, DWT write watchpoint 설정(FUNCTION 0b0110)을 ARMv7-M ARM으로 바로잡습니다."
series: "Modern Embedded Recipes"
seriesOrder: 118
tags: [recipes, debugging, memory]
topics: ["embedded"]
---

## 한 줄 요약

> **"메모리 오염 진단은 *누가 망가뜨렸는지* 잡는 일입니다."** Canary·MPU guard·data watchpoint·desktop ASan을 조합하면 *현장에서* 범인을 잡습니다.

## 어떤 상황에서 쓰나

"평소엔 잘 도는데 1시간쯤 지나면 다른 변수 값이 이상하게 바뀌어요." "함수가 끝나고 caller로 못 돌아와요 (Hardfault PC가 이상한 영역)." 이런 증상은 메모리 오염을 먼저 의심합니다.

오염은 *현장*에서 일어나지만 *증상*은 다른 코드에서 나타나므로, 디버깅이 까다롭습니다. 도구로 *현장*에서 잡아야 합니다.

## 핵심 개념 — 오염이 난 곳과 증상이 보이는 곳

`buf[16]`에 24바이트를 쓰는 순간이 오염이 난 곳이고, 그 뒤 함수가 덮인 복귀 주소로 돌아가다 fault가 나는 순간이 증상이 보이는 곳입니다. 둘 사이에는 몇 줄에서 몇 분까지 거리가 있을 수 있어서, 증상에서 거꾸로 따라가기보다 *쓰는 순간*에 멈추는 도구를 둡니다. 아래 도구 가운데 넷은 QEMU 11.1.3의 `mps2-an386`(Cortex-M4, MPU 포함)에서, ASan은 이 Mac의 clang으로 실제로 돌렸습니다. 공통 하네스는 [10-04](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)와 같은 startup·semihosting 코드이고, `-DCASE=N`으로 경우를 고릅니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O1 -g -ffreestanding -nostdlib [-fstack-protector-strong] \
  -DCASE=$c -I CMSIS_5/CMSIS/Core/Include -T an386.ld startup.c sh.c mc.c -lgcc -o mc$c.elf
qemu-system-arm -M mps2-an386 -nographic -monitor none -serial none \
  -semihosting-config enable=on,target=native -kernel mc$c.elf
```

네 경우의 출력을 한꺼번에 먼저 보입니다.

```text
=== CASE 1
n=16 ok
STACK SMASH detected
=== CASE 2
guard=0x20000000 buf=0x20000020
MemManage CFSR=0x00000082 MMFAR=0x2000001f
=== CASE 3
MemManage CFSR=0x00000082 MMFAR=0x00000004
=== CASE 4
stack top 0x20010000, deepest use reached 0x2000fcd8 -> 808 bytes used
```

## 도구 1 — Stack canary (컴파일러)

GCC의 `-fstack-protector-strong`은 배열 같은 지역 변수가 있는 함수에 canary를 넣습니다. 함수 입구에서 전역 `__stack_chk_guard` 값을 stack에 복사해 두고, 나갈 때 다시 비교해 다르면 `__stack_chk_fail()`을 부릅니다. 이 Mac의 `arm-none-eabi-gcc`에는 C 라이브러리가 없으므로 두 심볼을 직접 정의했습니다.

```c
uint32_t __stack_chk_guard = 0xDEADBEEF;
void __stack_chk_fail(void) { pr("STACK SMASH detected\n"); sh_exit(1); }
__attribute__((noinline)) void process(const uint8_t *in, size_t n) {
    uint8_t buf[16];
    for (size_t i = 0; i < n; i++) buf[i] = in[i];
    __asm volatile("" :: "r"(buf) : "memory");
}
int main(void) {
    static uint8_t pkt[32];
    process(pkt, 16); pr("n=16 ok\n");
    process(pkt, 24); pr("n=24 returned\n");
    return 0;
}
```

CASE 1 출력처럼 16바이트 복사는 통과하고, 24바이트 복사는 `process()`가 돌아가기 전에 `STACK SMASH detected`로 잡힙니다. 실제로 들어간 코드는 `objdump`로 보면 다음과 같습니다(비교와 분기 부분만 옮김).

```text
00000310 <process>:
 314:	ldr	r3, [pc, #52]	@ (34c <process+0x3c>)
 316:	ldr	r3, [r3, #0]
 318:	str	r3, [sp, #20]
 336:	ldr	r3, [pc, #20]	@ (34c <process+0x3c>)
 338:	ldr	r2, [r3, #0]
 33a:	ldr	r3, [sp, #20]
 33c:	eors	r2, r3
 342:	bne.n	348 <process+0x38>
 348:	bl	2fc <__stack_chk_fail>
 34c:	.word	0x20000000
```

0x34c의 0x20000000이 `__stack_chk_guard`의 주소입니다. 입구에서 이 값을 `sp+20`에 저장하고(0x318), 출구에서 둘을 `eors`로 비교해 다르면 0x348의 `bl __stack_chk_fail`로 갑니다. 그래서 canary는 *그 함수가 돌아갈 때* 오염을 잡고, canary 위치를 건드리지 않은 덮어쓰기나 다른 함수의 stack 오염은 잡지 못합니다. 고정값 0xDEADBEEF는 데모용이고, 공격 방어까지 바란다면 부팅 때 난수로 채웁니다.

## 도구 2 — Heap canary

할당 앞뒤에 알려진 값을 두고, 해제하거나 주기적으로 검사할 때 그 값이 그대로인지 봅니다.

```c
typedef struct {
    uint32_t magic_head;    /* 0xAB12CD34 */
    size_t   size;
    uint32_t pad[2];
} chunk_hdr_t;

void *my_malloc(size_t n) {
    chunk_hdr_t *c = real_malloc(sizeof(*c) + n + 4);
    c->magic_head = 0xAB12CD34;
    c->size       = n;
    *(uint32_t*)((uint8_t*)(c + 1) + n) = 0xCDEF1234;  /* tail */
    return c + 1;
}

int my_check(void *p) {
    chunk_hdr_t *c = (chunk_hdr_t*)p - 1;
    if (c->magic_head != 0xAB12CD34) return -1;
    if (*(uint32_t*)((uint8_t*)p + c->size) != 0xCDEF1234) return -1;
    return 0;
}
```

tail 값을 `n` 바로 뒤에 두므로, 그 4바이트가 정렬되지 않은 주소일 수 있습니다. Cortex-M4는 일반 `LDR`/`STR`의 비정렬 접근을 허용하지만(`CCR.UNALIGN_TRP`가 0일 때, ARMv7-M ARM A3.2.1), 다른 코어로 옮길 때는 tail을 4바이트 경계로 올립니다.

## 도구 3 — MPU guard

stack 끝이나 버퍼 아래에 접근 금지 MPU region을 두면, 그 영역을 건드리는 *바로 그 명령*에서 MemManage fault가 납니다. CASE 2는 32바이트 guard 바로 위에 버퍼를 두고, 버퍼 시작에서 아래로 써 내려갑니다.

```c
__attribute__((aligned(32))) static uint8_t guard[32];   /* no-access region */
__attribute__((aligned(32))) static uint8_t buf[64];
int main(void) {
    pr("guard=0x%08x buf=0x%08x\n", (unsigned)(uintptr_t)guard, (unsigned)(uintptr_t)buf);
    MPU->RNR  = 0;
    MPU->RBAR = (uint32_t)(uintptr_t)guard;
    MPU->RASR = (4u << MPU_RASR_SIZE_Pos) | (0u << MPU_RASR_AP_Pos) | MPU_RASR_ENABLE_Msk;  /* 32 B, no access */
    MPU->CTRL = MPU_CTRL_PRIVDEFENA_Msk | MPU_CTRL_ENABLE_Msk;
    SCB->SHCSR |= SCB_SHCSR_MEMFAULTENA_Msk;
    __DSB(); __ISB();
    volatile uint8_t *p = buf;
    for (int i = 0; i > -40; i--) p[i] = 0xAA;    /* walks down from buf into guard */
    pr("not reached\n");
    return 0;
}
```

출력은 `MemManage CFSR=0x00000082 MMFAR=0x2000001f`입니다. 0x82는 MMFSR의 `DACCVIOL`(bit 1)과 `MMARVALID`(bit 7)이고, MMFAR 0x2000001F는 guard의 마지막 바이트, 즉 버퍼 바로 아래 첫 바이트입니다. 넘친 첫 쓰기에서 멈췄습니다. region 크기는 `RASR.SIZE` = N일 때 2^(N+1) 바이트이고(4 → 32바이트), `AP` = 0은 접근 금지입니다(ARMv7-M ARM B3.5.9). base 주소는 region 크기에 정렬되어야 하므로 `aligned(32)`를 붙였습니다. `PRIVDEFENA`는 region이 없는 나머지 주소에 기본 메모리 맵을 쓰게 하고, `SHCSR.MEMFAULTENA`가 없으면 MemManage가 HardFault로 올라갑니다.

## 도구 4 — Data watchpoint

디버거가 붙어 있으면 [10-03](/blog/embedded/modern-recipes/part10-03-gdb-remote-debug)의 watchpoint 세션처럼 특정 주소에 쓰는 순간 멈춥니다. 디버거 없이 펌웨어 스스로 같은 일을 하려면 DWT comparator를 DebugMonitor 예외와 함께 씁니다.

```c
#include "stm32f407xx.h"
extern volatile uint32_t g_state;
volatile uint32_t watch_hits;

/* DWT comparator 0: DebugMonitor exception on any write to g_state (no debugger attached) */
void watch_g_state(void) {
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk | CoreDebug_DEMCR_MON_EN_Msk;
    DWT->COMP0     = (uint32_t)&g_state;
    DWT->MASK0     = 2;                     /* ignore low 2 address bits: 4-byte word */
    DWT->FUNCTION0 = 0x6;                   /* 0110: watchpoint on write (Table C1-14) */
}

void DebugMon_Handler(void) {
    DWT->FUNCTION0;                          /* reading clears MATCHED */
    watch_hits++;
}
```

ARMv7-M ARM Table C1-14에서 `FUNCTION` = 0b0110이 "쓰기 전용 data 주소 비교, watchpoint debug event"이고, 0b0101은 *읽기* 전용입니다. `MATCHED` 비트는 `DWT_FUNCTION`을 읽으면 0으로 지워집니다(C1.8.17). `MASK`는 비교에서 무시할 하위 주소 비트 수입니다. halting debug가 꺼진 상태에서 이 event는 `DEMCR.MON_EN`이 켜져 있으면 DebugMonitor 예외가 됩니다. 이 코드는 `cmsis_device_f4` 헤더로 경고 없이 빌드되지만, QEMU는 DWT comparator를 모델링하지 않아 실행으로 확인하지는 못했습니다. comparator 수는 Cortex-M4에서 1개 또는 4개입니다(10-03, Cortex-M4 TRM).

## 도구 5 — Desktop 빌드 + ASan

하드웨어에 묶이지 않은 parser·codec·상태 기계는 PC에서 AddressSanitizer로 돌립니다. 길이 바이트를 믿는 패킷 parser를 그대로 옮겨 Homebrew clang 23.1.5로 돌렸습니다.

```c
int parse(const uint8_t *pkt, uint8_t *out) {
    uint8_t len = pkt[0];
    memcpy(out, pkt + 1, len);
    return len;
}
```

```bash
clang -g -O0 -fsanitize=address -fno-omit-frame-pointer parse.c -o parse && ./parse
```

```text
=================================================================
==58896==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x00016f69e110 at pc 0x000100c621e4 bp 0x00016f69e050 sp 0x00016f69d800
WRITE of size 20 at 0x00016f69e110 thread T0
    #0 0x000100c621e0 in __asan_memcpy+0x4b8 (libclang_rt.asan_osx_dynamic.dylib:arm64+0x521e0)
    #1 0x00010076083c in parse parse.c:7
    #2 0x0001007609a4 in main parse.c:13
    #3 0x0001895ccd78 in start+0x19f8 (dyld:arm64e+0x31d78)

Address 0x00016f69e110 is located in stack of thread T0 at offset 112 in frame
    #0 0x00010076085c in main parse.c:10

```

ASan은 20바이트 쓰기가 16바이트 `out`을 넘는 순간 멈추고, 쓴 함수와 줄(parse.c:7), 넘친 변수(`out`)까지 알려 줍니다. 같은 코드가 MCU에서는 아무 메시지 없이 옆 변수를 덮을 뿐입니다. 처음 Apple clang에 `-O1`로 빌드했을 때는 `out`을 쓰지 않는 코드를 컴파일러가 지워 아무것도 잡히지 않았으므로, ASan으로 볼 코드는 결과를 실제로 쓰게 만들어 둡니다.

## 도구 6 — Fill pattern으로 stack high-water mark

부팅 직후 남은 stack을 알려진 패턴으로 채우고, 나중에 패턴이 어디까지 지워졌는지 봅니다.

```c
extern uint32_t _ebss, _estack;
__attribute__((noinline)) int recurse(int d) { volatile uint8_t pad[64]; pad[0] = d; return d ? recurse(d - 1) + pad[0] : 0; }
int main(void) {
    uint32_t *lo = &_ebss, *sp; __asm volatile("mov %0, sp" : "=r"(sp));
    for (uint32_t *q = lo; q < sp - 16; q++) *q = 0xA5A5A5A5u;   /* paint free stack */
    recurse(10);
    uint32_t *q = lo; while (*q == 0xA5A5A5A5u) q++;
    pr("stack top 0x%08x, deepest use reached 0x%08x -> %u bytes used\n",
       (unsigned)(uintptr_t)&_estack, (unsigned)(uintptr_t)q, (unsigned)((uintptr_t)&_estack - (uintptr_t)q));
    return 0;
}
```

CASE 4 출력은 `808 bytes used`입니다. `recurse(10)`이 64바이트 배열을 담은 72바이트 프레임(`push {lr}` + `sub sp, #68`)을 열한 번 쌓은 792바이트에 main 쪽 16바이트가 더해진 결과이고, 같은 측정을 보드에서 긴 시간 돌린 뒤 하면 그동안의 최대 사용량이 나옵니다. 패턴이 우연히 같은 값으로 쓰인 word는 사용하지 않은 것으로 보이므로, 이 값은 실제 사용량의 하한입니다. FreeRTOS V11.2.0도 task stack을 `tskSTACK_FILL_BYTE`(0xA5, `tasks.c` 120행)로 채우고, `uxTaskGetStackHighWaterMark()`가 `prvTaskCheckFreeStackSpace()`로 그 값이 남은 바이트를 센 뒤 `StackType_t` 단위(word)로 나눠 돌려줍니다([Practical RTOS Internals 4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)).

## 도구 7 — Sentinel 변수

자주 넘치는 버퍼 앞뒤에 쓰지 않는 값을 두고 주기적으로 확인합니다.

```c
volatile uint32_t SENTINEL_BEFORE = 0x11223344;
char comm_buffer[256];
volatile uint32_t SENTINEL_AFTER  = 0x55667788;

void check_sentinel(void) {
    if (SENTINEL_BEFORE != 0x11223344) printf("buf overflow before!\n");
    if (SENTINEL_AFTER  != 0x55667788) printf("buf overflow after!\n");
}
```

전역 변수의 실제 배치는 초기값 유무에 따라 `.data`와 `.bss`로 갈리고 링커가 정하므로, 선언 순서대로 붙는다고 기대할 수 없습니다. 위 예에서도 `comm_buffer`는 초기값이 없어 `.bss`로, sentinel은 `.data`로 갈 수 있습니다. 10-03의 예처럼 버퍼와 sentinel을 한 구조체에 넣으면 순서가 정해집니다.

## NULL 포인터 + 4

[10-04](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)에서 0번지에 코드 메모리가 있는 칩은 `NULL->v` 읽기가 fault 없이 vector table을 읽는다는 것을 봤습니다. CASE 3은 0번지부터 32바이트를 접근 금지 MPU region으로 막고 같은 읽기를 합니다.

```c
struct item { struct item *next; int v; };
int main(void) {
    struct item *it = 0;
    MPU->RNR  = 0;
    MPU->RBAR = 0x00000000;
    MPU->RASR = (4u << MPU_RASR_SIZE_Pos) | (0u << MPU_RASR_AP_Pos) | MPU_RASR_ENABLE_Msk;  /* 0x0-0x1F no access */
    MPU->CTRL = MPU_CTRL_PRIVDEFENA_Msk | MPU_CTRL_ENABLE_Msk;
    SCB->SHCSR |= SCB_SHCSR_MEMFAULTENA_Msk;
    __DSB(); __ISB();
    pr("it->v = %d\n", *(volatile int *)&it->v);
    return 0;
}
```

이번에는 `MemManage CFSR=0x00000082 MMFAR=0x00000004`로 읽는 순간 잡힙니다. MMFAR 0x4가 `it->v`의 오프셋 4입니다. 예외의 vector table 읽기는 이 region에 막히지 않았고 handler가 정상 실행되었습니다.

## Use-after-free

```c
chunk_t *c = malloc_chunk();
free(c);
c->next = NULL;   /* 이미 해제된 메모리에 쓰기 */
```

해제된 블록은 allocator가 자기 목록 정보를 넣는 데 쓸 수 있으므로, 해제 뒤의 쓰기는 다음 할당 때 *다른 곳*에서 문제로 나타납니다. 디버그 빌드에서 해제할 때 블록을 알려진 값으로 채우면, 해제된 메모리를 읽는 코드가 그 값을 보게 되어 찾기 쉬워집니다.

```c
void debug_free(void *p) {
    size_t n = chunk_size(p);
    memset(p, 0xDD, n);
    real_free(p);
}
```

## 자주 보는 함정

> DMA 뒤 캐시 무효화 누락

```c
dma_read_into(buf, 1024);
process(buf);   /* 메모리는 새 데이터, data cache에는 옛 데이터 */
```

D-cache가 있는 코어(Cortex-M7 등)에서 DMA가 메모리를 바꾼 뒤 캐시를 무효화하지 않으면 CPU는 옛 값을 읽습니다. 메모리 오염과 증상이 같지만 원인은 다릅니다. 처리 방법은 [2-06: ARM 캐시](/blog/embedded/modern-recipes/part2-06-arm-cache)에 있습니다.

> 타입이 다른 포인터로 같은 메모리 접근

```c
uint32_t *a = (uint32_t*)0x20001000;
uint8_t  *b = (uint8_t*)(a + 1);
*b = 5;
```

C11(N1570) 6.5절 7항은 객체를 그 유효 타입이나 문자 타입 등 정해진 타입으로만 접근하도록 정합니다. 그래서 `uint8_t`(문자 타입)로 접근하는 위 코드는 허용되지만, 서로 다른 비문자 타입 포인터(예: `uint32_t *`와 `float *`)로 같은 객체를 읽고 쓰는 코드는 이 규칙을 어기고, 컴파일러는 둘이 같은 메모리를 가리키지 않는다고 가정하고 최적화할 수 있습니다. 바이트 단위로 해석할 때는 `memcpy`를 씁니다.

> 디버거 없는 양산 보드

양산 보드에는 디버거가 없으므로 watchpoint 대신 위 도구 1·3·7(canary, MPU guard, sentinel)과 도구 6의 주기적 측정이 남습니다.

## 정리

- 오염은 *쓰는 순간* 잡아야 합니다. MPU guard는 넘친 첫 쓰기에서 `DACCVIOL`과 정확한 MMFAR을 줬습니다(QEMU).
- stack canary는 함수가 돌아갈 때 잡습니다. `-fstack-protector-strong`이 넣은 비교·`bl __stack_chk_fail`을 objdump로 확인했습니다.
- 0번지에 MPU region을 두면 NULL 읽기가 MMFAR = 오프셋으로 잡힙니다.
- DWT watchpoint의 쓰기 비교는 `FUNCTION` = 0b0110입니다(0b0101은 읽기).
- PC에서 돌릴 수 있는 모듈은 ASan으로 줄 번호까지 잡습니다.
- stack 사용량은 fill pattern으로 잽니다(데모에서 808바이트, 하한값).

다음 편은 **타이밍/race 진단**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)
