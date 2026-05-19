---
title: "10-08: 메모리 오버플로우/오염 진단"
date: 2026-05-16T22:00:00
description: "Heap canary·MPU guard·data watchpoint·desktop ASan — 임베디드 메모리 오염을 잡는 도구를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 118
tags: [recipes, debugging, memory]
---

## 한 줄 요약

> **"메모리 오염은 *누가 망가뜨렸는지*를 잡는 게 본질입니다."** Canary·MPU guard·data watchpoint·desktop ASan을 조합하면 *현장에서* 범인을 잡습니다.

## 어떤 상황에서 쓰나

"평소엔 잘 도는데 1시간쯤 지나면 다른 변수 값이 이상하게 바뀌어요." "함수가 끝나고 caller로 못 돌아와요 (Hardfault PC가 이상한 영역)." 이런 류는 거의 다 메모리 오염입니다.

오염은 *현장*에서 일어나지만 *증상*은 다른 코드에서 나타나므로, 디버깅이 까다롭습니다. 도구로 *현장*에서 잡아야 합니다.

## 핵심 개념 — 오염 vs 증상

```text
[현장]  buf[1024]를 [1030]까지 씀   ← 누가
[증상]  buf 직후 stack의 LR이 깨짐 → return 시 hardfault   ← 어디서 보이는지
```

증상에서 거꾸로 추적하지 않고, *현장 자체*를 잡는 도구를 둡니다.

## 도구 1 — Stack canary (Compiler)

```bash
gcc -fstack-protector -fstack-protector-strong main.c
```

```c
// stack canary 자동 삽입
void process(uint8_t *in, size_t n) {
    uint32_t __canary = __stack_chk_guard;
    uint8_t buf[64];
    memcpy(buf, in, n);   /* n > 64 → canary 깨짐 */
    if (__canary != __stack_chk_guard)
        __stack_chk_fail();
}
```

Newlib에는 `__stack_chk_fail`이 없습니다. 직접 구현합니다.

```c
uint32_t __stack_chk_guard = 0xDEADBEEF;

void __stack_chk_fail(void) {
    printf("STACK SMASH\n");
    NVIC_SystemReset();
}
```

Function-level canary는 오염을 *그 함수가 return할 때* 잡습니다. 함수 사이의 stack 오염은 못 잡습니다.

## 도구 2 — Heap canary

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

`my_check`를 주기적으로 또는 free 시 호출합니다. Head/tail canary가 깨졌다면 그 영역에 오버플로우가 있었습니다.

## 도구 3 — MPU stack guard

각 task stack 아래·위 또는 *bottom region*에 access를 막는 MPU region을 둡니다.

```c
// task stack: 0x20001000 ~ 0x20002000
// guard:      0x20000FE0 ~ 0x20001000 (32 byte)

MPU->RNR = 0;
MPU->RBAR = 0x20000FE0;
MPU->RASR = (4 << MPU_RASR_SIZE_Pos)    /* 32 byte */
          | MPU_RASR_ENABLE_Msk
          | (0 << MPU_RASR_AP_Pos);     /* no access */
```

Stack이 guard region에 침범하는 *순간* MemManage fault가 떨어집니다. Caller로 돌아간 후가 아닌, *오염 직전*에 잡힙니다.

FreeRTOS는 MPU port에서 자동으로 task stack guard를 둡니다 (`portUSING_MPU_WRAPPERS`).

## 도구 4 — Data watchpoint

```text
(gdb) watch *((uint32_t*)0x20001234)
(gdb) continue

Hardware watchpoint 2: *((uint32_t*)0x20001234)
Old value = 5
New value = 1819045216    ← 깨진 값
process_packet (data=0x...) at packet.c:78
```

특정 주소가 *누가, 어디서* 쓰는지 잡습니다. Cortex-M DWT는 보통 4 comparator입니다. 가장 강력한 도구.

```c
/* DWT 직접 설정 (gdb 없이 production에서) */
DWT->COMP0  = 0x20001234;
DWT->MASK0  = 0;                          /* exact match */
DWT->FUNCTION0 = (5 << 0);               /* write 시 */

void DebugMon_Handler(void) {
    /* PC = DWT 매칭 직전의 명령 */
    handle_watch_hit();
}
```

## 도구 5 — Desktop simulation + ASan

가능하면 HW-independent 코드는 *desktop*에서 ASan으로 돌립니다.

```bash
gcc -fsanitize=address -fno-omit-frame-pointer -g \
    parser.c parser_test.c -o test
./test
```

```text
==12345==ERROR: AddressSanitizer: heap-buffer-overflow
WRITE of size 4 at 0x602000000058 thread T0
    #0 0x4007ae in process_packet packet.c:84
    #1 0x4007fe in main main.c:23
```

임베디드에서 못 보던 오류가 ASan에서는 ms 단위로 잡힙니다. *모든 모듈을* 이렇게 빌드할 필요는 없습니다. Parser·codec·state machine 같은 *알고리즘 모듈*만 분리해 desktop test에 둡니다.

## 도구 6 — Fill pattern으로 stack high-water mark

```c
extern uint32_t _estack;
extern uint32_t _Min_Stack_Size;

void stack_fill(void) {
    uint32_t *bottom = (uint32_t*)((char*)&_estack - (size_t)&_Min_Stack_Size);
    uint32_t *sp;
    __asm volatile ("mov %0, sp" : "=r"(sp));
    while (bottom < sp) *bottom++ = 0xA5A5A5A5;
}

size_t stack_used(void) {
    uint32_t *bottom = (uint32_t*)((char*)&_estack - (size_t)&_Min_Stack_Size);
    uint32_t *p = bottom;
    while (*p == 0xA5A5A5A5) p++;
    return (char*)&_estack - (char*)p;
}
```

부팅 직후 stack을 패턴으로 채우고, 주기적으로 패턴이 *어디까지 사라졌는지* 봅니다. Stack worst-case 사용량을 정량화할 수 있습니다.

FreeRTOS는 `uxTaskGetStackHighWaterMark()`로 같은 일을 합니다.

## 도구 7 — Sentinel 변수

오염이 잘 일어나는 자리에 사용 안 하는 *sentinel*을 둡니다.

```c
volatile uint32_t SENTINEL_BEFORE = 0x11223344;
char comm_buffer[256];
volatile uint32_t SENTINEL_AFTER  = 0x55667788;

void check_sentinel(void) {
    if (SENTINEL_BEFORE != 0x11223344) printf("buf overflow before!\n");
    if (SENTINEL_AFTER  != 0x55667788) printf("buf overflow after!\n");
}
```

비싸진 않고 production에 남겨도 됩니다.

## 사례 — "Return 시 hardfault"

```text
[증상] func_A → func_B → return → HardFault, PC = 0xdeadbeef
[가설] func_B 안에서 stack overflow로 saved LR이 깨짐
```

Stack canary 사용 → `func_B` return 직후 `__stack_chk_fail` 호출. 범위가 좁혀집니다.

```c
void func_B(uint8_t *in, size_t n) {
    char buf[32];
    strncpy(buf, in, n);   /* n = 100 → 68 byte overflow */
}
```

`strncpy`에 잘못된 `n`을 넘긴 게 원인. 호출 측 `n` 계산을 수정.

## 사례 — "변수가 *나 모르게* 바뀌어요"

```c
uint32_t g_state;   /* 갑자기 0xdeadbeef로 바뀜 */

/* watchpoint 시도 */
(gdb) watch g_state
(gdb) continue

Hardware watchpoint 1: g_state
Old value = 5
New value = 0xdeadbeef
dma_callback (ch=2) at dma.c:142
```

DMA가 *원래 의도와 다른 주소*에 buffer를 적었습니다. DMA destination address가 한 byte 어긋나 g_state 위에 떨어졌습니다.

Watchpoint 없이는 dma_callback과 g_state의 관계를 *영원히* 못 잡았을 것입니다.

## 사례 — NULL pointer + 4

```text
HardFault, BFAR = 0x00000004
```

`NULL->next` 같은 dereference. `addr2line`으로 fault PC를 source line으로 매핑.

NULL pointer 영역(0x00000000 ~ 0x000000FF)에 *no-access* MPU region을 두면, *write 시도*에 *그 명령에서* 막힙니다.

```c
MPU->RNR  = 7;
MPU->RBAR = 0x00000000;
MPU->RASR = (7 << MPU_RASR_SIZE_Pos)     /* 256 byte */
          | MPU_RASR_ENABLE_Msk
          | (0 << MPU_RASR_AP_Pos);
```

## 사례 — Use-after-free

```c
chunk_t *c = malloc_chunk();
free(c);
c->next = NULL;   /* ← 이미 free된 메모리 write */
```

Free 시 chunk를 0xDEADBEEF로 채우면 `c->next` write도 *deadbeef.next로 망가뜨림*. 다음 alloc 때 corruption이 *다른 곳*에서 발생합니다.

```c
void debug_free(void *p) {
    size_t n = chunk_size(p);
    memset(p, 0xDD, n);
    real_free(p);
}
```

Production에서는 `memset`이 비싸므로 *debug build*에만 둡니다.

## 자주 보는 함정

> Cache invalidate 누락 → "메모리 오염"으로 오해

```c
dma_read_into(buf, 1024);
process(buf);   /* DDR write 완료, CPU cache는 옛 데이터 */
```

진짜 오염은 아니지만 *증상*은 똑같습니다. DMA 후 `__DSB(); __invalidate_dcache_range(buf, 1024);` 또는 buffer를 non-cacheable에 둡니다.

> Aliased pointer

```c
uint32_t *a = (uint32_t*)0x20001000;
uint8_t  *b = (uint8_t*)(a + 1);
*b = 5;
*(a + 1);   /* compiler가 a+1을 cache했으면 옛 값을 봄 */
```

Strict aliasing 위반. `-fno-strict-aliasing`으로 빌드하거나, `memcpy`/`union`을 씁니다.

> Unaligned access

ARMv6-M (Cortex-M0)은 unaligned access를 *지원하지 않음*. 4 byte 정수를 odd address에 쓰면 fault. `__packed` 구조체에서 흔합니다.

> Stack 사용량 미측정

Worst-case stack 사용량을 *측정 없이* 추정하면 거의 항상 underestimate합니다. Fill pattern으로 측정.

> Production에서 watchpoint

Cortex-M은 hardware breakpoint/watchpoint가 제한적입니다. Production에서는 sentinel + canary + periodic check이 현실적입니다.

## 정리

- 메모리 오염은 *증상*이 아니라 *현장*을 잡아야 풉니다.
- Stack canary, heap canary, MPU guard, data watchpoint, ASan, fill pattern, sentinel — 도구를 layer로 둡니다.
- Desktop ASan은 algorithm 모듈에 가장 빠른 회수율을 줍니다.
- Watchpoint는 *변수가 누가 망가뜨리는지* 잡는 최강의 도구.
- NULL pointer 영역에 no-access MPU region을 두면 null deref가 *현장*에서 잡힙니다.
- Cache invalidate 누락은 *진짜 오염이 아닌데* 오염처럼 보입니다.
- Production은 sentinel + canary + periodic check 조합이 현실적.

다음 편은 **타이밍/race 진단**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)
