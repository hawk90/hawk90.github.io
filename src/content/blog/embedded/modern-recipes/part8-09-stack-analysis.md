---
title: "임베디드 스택 분석 — high-water·overflow 탐지"
slug: "embedded/modern-recipes/part8-09-stack-analysis"
date: 2026-04-17T09:08:00
description: "Stack 패턴 채우기로 high-water mark, overflow hook, canary, MPU guard region, RTOS task stack 분석을 한 자리에 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 97
tags: [recipes, memory, stack]
topics: ["embedded"]
---

## 한 줄 요약

> **"Stack overflow는 양산 사고로 이어질 수 있는 결함입니다."** 패턴 채우기, overflow hook, MPU guard를 target에 맞게 조합해 양산 전에 검출합니다.

## 어떤 상황에서 쓰나

펌웨어가 며칠에 한 번씩 randomly reset 되는 원인 중 하나가 stack overflow입니다. Recursion 깊이가 input에 따라 변하거나, `printf`처럼 큰 stack 변수를 쓰는 함수가 깊은 call chain에서 호출되면 특정 workload에서만 드러날 수 있습니다.

또 한 가지 상황은 RTOS task의 stack size를 정하는 일입니다. 추정만으로는 항상 너무 크거나 너무 작습니다. *측정*해서 정해야 합니다.

## 핵심 개념

| 기법 | 동작 |
|------|------|
| high-water mark | stack 시작 시 패턴(`0xA5A5`)을 채워두고 가장 깊이까지 덮어쓴 위치를 찾는 기법 |
| overflow hook | SP가 stack 끝에 도달하면 trap |
| canary | stack 끝에 magic 값을 두고 함수 진입/탈출 시 확인 |
| MPU guard | stack 끝 다음 page를 read-only로 만들어 HW가 trap |

세 기법은 서로 다른 시점과 방식으로 검출하므로 target과 비용에 맞춰 조합합니다.

1. **1차** — high-water mark로 평소 사용량 측정 → size 결정
2. **2차** — overflow hook으로 사고 발생 시 즉시 trap
3. **3차** — MPU guard로 HW 차원 보호

## 코드 / 실제 사용 예

### Stack 패턴 채우기

```c
extern uint32_t _estack;
extern uint32_t _sstack;

void fill_stack_pattern(void) {
    uint32_t *p = &_sstack;
    while (p < &_estack)
        *p++ = 0xA5A5A5A5;
}

size_t stack_used(void) {
    uint32_t *p = &_sstack;
    while (p < &_estack && *p == 0xA5A5A5A5) p++;
    return (uint8_t *)&_estack - (uint8_t *)p;
}
```

부팅 직후 패턴을 깔고, 어느 시점에서나 used bytes를 계산할 수 있습니다.

### FreeRTOS task 별 high-water

```c
void task_check(void *arg) {
    for (;;) {
        UBaseType_t wm = uxTaskGetStackHighWaterMark(NULL);
        if (wm * sizeof(StackType_t) < STACK_WARNING_BYTES) {
            log_warn("low stack: %u free bytes", wm * 4);
        }
        vTaskDelay(pdMS_TO_TICKS(10000));
    }
}

void task_monitor_all(void *arg) {
    TaskStatus_t s[16];
    UBaseType_t n = uxTaskGetSystemState(s, 16, NULL);
    for (UBaseType_t i = 0; i < n; i++) {
        printf("%s free=%u bytes\n", s[i].pcTaskName,
               s[i].usStackHighWaterMark * sizeof(StackType_t));
    }
}
```

`uxTaskGetStackHighWaterMark`가 free *word*를 돌려주므로 byte로 변환합니다. 경고 임계값은 task의 최대 경로와 측정 오차를 고려해 프로젝트별로 정합니다.

### Overflow hook (FreeRTOS)

```c
/* configCHECK_FOR_STACK_OVERFLOW = 2 (canary 방식) */
void vApplicationStackOverflowHook(TaskHandle_t t, char *name) {
    /* ISR context, scheduler suspended */
    panic_log("stack overflow", name);
    NVIC_SystemReset();
}
```

`configCHECK_FOR_STACK_OVERFLOW`의 검사 방식과 호출 시점은 FreeRTOS port와 설정에 따라 다릅니다. 설정값이 2인 port는 추가 경계 검사를 사용하지만, 모든 overflow를 즉시 또는 완전히 검출한다고 보장하지는 않습니다.

### Compiler stack protector

```bash
gcc -fstack-protector-strong -o main main.c
```

GCC가 보호 대상 함수에 canary 검사를 넣을 수 있습니다. 컴파일 옵션·ABI·런타임에 따라 적용 범위가 달라지며, 메모리 안전성이나 ROP 방어를 단독으로 보장하지 않습니다.

```c
/* canary mismatch 시 호출되는 handler */
__attribute__((noreturn)) void __stack_chk_fail(void) {
    panic_log("canary corrupted", NULL);
    NVIC_SystemReset();
}
```

### MPU stack guard (Cortex-M)

```c
/* stack 경계의 guard region 설정 — 속성·방향·정렬은 MPU 문서 확인 */
void setup_stack_guard(void) {
    MPU->RBAR = (uint32_t)&_sstack;
    MPU->RASR = MPU_RASR_ENABLE_Msk
              | (MPU_REGION_SIZE_GUARD << MPU_RASR_SIZE_Pos)
              | MPU_ACCESS_RO;
    MPU->CTRL |= MPU_CTRL_ENABLE_Msk;
}

void MemManage_Handler(void) {
    panic_log("stack guard hit", NULL);
    NVIC_SystemReset();
}
```

stack 성장 방향과 MPU region의 base·size·access 속성에 맞춰 guard region을 배치해야 합니다. 예시의 크기와 속성은 보드·MPU 구현에 맞게 정해야 하며, 잘못 배치하면 overflow를 놓치거나 정상 stack 접근을 막을 수 있습니다.

### Bare-metal main stack

```text
/* linker script — STM32 예시 */
_estack = ORIGIN(RAM) + LENGTH(RAM);  /* stack은 RAM 끝부터 */

ENTRY(Reset_Handler)
MEMORY {
    RAM (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}
```

```c
void Reset_Handler(void) {
    /* main stack 채우기 */
    extern uint32_t _sstack, _estack;
    for (uint32_t *p = &_sstack; p < &_estack; p++) *p = 0xA5A5A5A5;
    main();
}
```

main stack은 linker script로 정의되고, reset handler에서 패턴을 채울 수 있습니다.

### 함수별 stack usage 분석

```bash
# GCC stack usage report
gcc -fstack-usage main.c

# main.su 파일 생성
$ cat main.su
main.c:42:func    96    static
main.c:55:big     2048  static
main.c:60:rec     16    dynamic,bounded
```

각 함수가 얼마나 stack을 쓰는지 컴파일 시 보여줍니다. `static`은 안전, `dynamic`은 input에 따라 변함, `bounded`는 컴파일 시 상한 추정 가능을 의미합니다.

### Worst-case call chain

```bash
# puncover, stack-usage-analyzer 같은 도구
puncover --elf firmware.elf
# 함수별 stack + 호출 트리 + worst-case path
```

여러 도구가 ELF와 `.su` 파일을 통합해 가능한 call path를 보여줍니다. 함수 포인터·재귀·ISR·스케줄링 경로를 포함한 worst-case 보장은 별도 검토가 필요합니다.

## 측정 / 성능 비교

| 인프라 | overhead |
|---|---|
| high-water mark (한 번 채우기) | 영역 크기·메모리 속도별 측정 |
| high-water 측정 (매 회) | 스캔 영역과 메모리 속도별 측정 |
| FreeRTOS canary 검사 | port·검사 범위별 측정 |
| GCC stack protector | 함수·ABI·컴파일러별 측정 |
| MPU guard | 정상 경로의 추가 비용은 구현별 측정 |

MPU guard는 하드웨어 경계를 제공하지만 region 수·정렬·권한·fault 처리 비용을 고려해야 합니다. 지원되는 Cortex-M과 RTOS port에서 검증 후 사용합니다.

```text
대표 size는 Cortex-M4, FreeRTOS와 task 구현에 따라 달라지므로 high-water·worst-case를 측정
간단한 task (LED, button)         측정 필요
일반 driver task                  측정 필요
printf 사용 task                  측정 필요
TCP/IP, lwIP task                 측정 필요
filesystem (FATFS) 사용           측정 필요
```

`printf`와 floating point가 가장 큰 stack 사용자입니다. embedded 환경에서는 `tiny printf`나 fixed-point로 대체합니다.

## 자주 보는 함정

> 추정만으로 size 결정

```c
xTaskCreate(t, "t", 128, ...);   /* 측정 없이 */
```

128 word(512 B)가 충분한지 측정 없이는 알 수 없습니다. 항상 high-water mark를 확인합니다.

> Recursion 깊이를 input에 의존

```c
int parse(node *n) {
    if (n) parse(n->child);
}
```

input depth가 unbounded면 stack overflow가 input attack vector가 됩니다. 반복문 + explicit stack으로 변환합니다.

> `printf`에 큰 buffer

```c
char buf[2048];        /* stack에 */
snprintf(buf, sizeof(buf), ...);
```

큰 local buffer는 `static`으로 옮기거나 heap에서 받습니다. stack에는 작은 buffer만 둡니다.

> Floating-point 사용

```c
void task_x(void *arg) {
    double x = sin(t);     /* FPU register save → stack 사용 큼 */
}
```

FPU context 저장 방식과 지연은 Cortex-M variant·RTOS port·lazy stacking 설정에 따라 달라집니다. 해당 ABI와 port 문서를 확인해 task stack 여유를 정합니다.

> Linker error를 무시

```text
section `.bss' will not fit in region `RAM'
```

`.bss`나 `.data`가 RAM을 다 쓰면 stack 영역이 부족합니다. linker script와 memory map을 다시 확인합니다.

## 정리

- Stack overflow는 양산 사고 1순위입니다. 처음부터 인프라를 켭니다.
- High-water mark(패턴 채우기)로 실제 사용량을 측정해 size를 정합니다.
- FreeRTOS canary는 매 context switch에서 overflow를 잡습니다.
- GCC stack protector는 함수 단위로 canary를 확인합니다.
- MPU guard는 HW로 0 cycle에 overflow를 잡는 가장 강력한 보호입니다.
- `printf`와 FPU 사용 task는 stack 여유를 더 줍니다.
- Recursion 깊이는 input에 의존하지 않게 설계합니다.

다음 편은 **코드 크기 최적화**입니다. `-Os`, LTO, section gc를 다룹니다.

## 관련 항목

- [PRTOS 4-06: Stack Overflow](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [6-12: RTOS 디버깅](/blog/embedded/modern-recipes/part6-12-rtos-debugging)
- [8-01: 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)
- [8-10: 코드 크기 최적화](/blog/embedded/modern-recipes/part8-10-code-size-optimization)
