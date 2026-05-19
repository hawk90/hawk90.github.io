---
title: "10-12: 포스트모템 분석 — Core Dump와 Field Crash"
date: 2026-05-17T02:00:00
description: "Linux coredump·gdb 분석부터 MCU 환경의 mini-dump(Memfault)·last-gasp logging·field debug 패턴까지."
series: "Modern Embedded Recipes"
seriesOrder: 122
tags: [recipes, debugging, postmortem]
---

## 한 줄 요약

> **"Crash는 *현장*에서 일어나지만 *분석*은 사무실에서 합니다."** 그 사이를 잇는 것이 coredump (Linux) 또는 mini-dump (MCU)입니다.

## 어떤 상황에서 쓰나

Field에 배포된 device가 가끔 reboot합니다. 사용자는 "그냥 멈췄어요"라고만 합니다. 재현이 안 됩니다. *현장*의 상태를 *사무실*로 가져오는 메커니즘이 필요합니다.

Linux 기반 device는 `coredump`, MCU 기반 device는 *mini-dump* 또는 *last-gasp log* 패턴을 씁니다. 둘 다 본질은 같습니다. Crash 순간의 register·memory·log를 압축해 *그대로* 가져오는 것.

## Linux Coredump

### 활성화

```bash
# 기본은 비활성. systemd
sudo systemctl enable systemd-coredump.service
sudo systemctl start  systemd-coredump.service

# 또는 직접
ulimit -c unlimited
echo "/var/crash/core.%e.%p.%t" | sudo tee /proc/sys/kernel/core_pattern

# 또는 단일 program
$ ulimit -c unlimited
$ ./my_program
Segmentation fault (core dumped)
```

`coredumpctl list`로 최근 coredump를 봅니다.

```bash
coredumpctl list
TIME           PID  UID  GID  SIG     COREFILE  EXE
Mon 10:23      5234 1000 1000 SIGSEGV present   /usr/bin/my_program

coredumpctl debug 5234
# → gdb로 진입
```

### gdb로 coredump 분석

```bash
gdb /path/to/my_program /var/crash/core.my_program.5234.1700000000

(gdb) bt
#0  0x00007f1234567890 in process_input (data=0x0) at input.c:42
#1  0x00007f1234567abc in main (argc=1, argv=...) at main.c:78

(gdb) frame 0
(gdb) print data
$1 = (char *) 0x0
(gdb) list
40    char *p = data;
41    while (*p) {        /* NULL deref */
42        process(*p++);
43    }
```

NULL pointer dereference가 즉시 보입니다. `print` / `info locals`로 변수 값도.

### Symbol과 source 매핑

```bash
# release build는 보통 strip됨
gcc -g -O2 -o my_program main.c     # debug symbol 포함

# strip된 binary는 별도 symbol file 필요
objcopy --only-keep-debug my_program my_program.debug
strip my_program
gdb -s my_program.debug my_program core
```

Production에서는 strip된 binary를 배포하고, 사무실에 *unstripped + debug-info*를 보관.

## MCU Mini-dump 패턴

MCU에는 OS가 없으니 coredump system이 없습니다. 직접 만듭니다.

### Backup SRAM에 저장

```c
#define DUMP_MAGIC 0xC0FFEE00

typedef struct {
    uint32_t magic;
    uint32_t reset_reason;     /* RCC->CSR snapshot */
    uint32_t pc, lr, psr;
    uint32_t cfsr, hfsr, bfar, mmar;
    uint32_t r0_r3[4];
    uint32_t r12;
    uint32_t stack[64];        /* fault 직전 stack top */
    uint32_t log_tail;         /* log ring tail */
    uint8_t  log[2048];        /* 최근 log */
} __attribute__((packed)) mini_dump_t;

void hardfault_save_dump(uint32_t *sp) {
    mini_dump_t *d = (mini_dump_t*)BACKUP_SRAM;
    d->magic = DUMP_MAGIC;
    d->reset_reason = RCC->CSR;
    d->r0_r3[0] = sp[0];
    d->r0_r3[1] = sp[1];
    d->r0_r3[2] = sp[2];
    d->r0_r3[3] = sp[3];
    d->r12 = sp[4];
    d->lr  = sp[5];
    d->pc  = sp[6];
    d->psr = sp[7];
    d->cfsr = *(volatile uint32_t*)0xE000ED28;
    d->hfsr = *(volatile uint32_t*)0xE000ED2C;
    d->bfar = *(volatile uint32_t*)0xE000ED38;
    d->mmar = *(volatile uint32_t*)0xE000ED34;
    memcpy(d->stack, sp, sizeof(d->stack));
    memcpy(d->log, g_log_ring, sizeof(d->log));
    d->log_tail = g_log_tail;

    NVIC_SystemReset();
}
```

Backup SRAM, RP2040 watchdog scratch, NRF52 GPREGRET 등 *reset에서 살아남는* 영역에 저장.

### 부팅 시 dump 확인 + 전송

```c
void boot_check_dump(void) {
    mini_dump_t *d = (mini_dump_t*)BACKUP_SRAM;
    if (d->magic == DUMP_MAGIC) {
        printf("Previous crash detected:\n");
        printf("PC=0x%08lx CFSR=0x%08lx BFAR=0x%08lx\n",
               d->pc, d->cfsr, d->bfar);

        if (network_available()) {
            send_dump_to_cloud(d, sizeof(*d));
        } else {
            store_dump_to_flash(d);   /* 다음 connect 시 전송 */
        }
        d->magic = 0;
    }
}
```

WiFi 있는 device는 즉시 cloud로, 없으면 flash에 두고 다음 boot에 전송.

## Memfault 패턴

Memfault SDK는 production에서 사용하는 상용 솔루션입니다. 오픈소스 대안의 base 패턴.

1. Crash 시 register + stack + thread info를 *coredump format*으로 저장
2. Reboot 후 chunk 단위로 cloud upload
3. 서버에서 elf와 결합해 symbolicate
4. 동일 root cause의 crash를 grouping
5. 대시보드에서 firmware 버전별 crash rate 추적

핵심은 *대량의 device*에서 *동일 crash*를 자동 grouping하는 것입니다. Field 100대 중 5대가 같은 PC에서 reboot하면 한 그룹으로 묶입니다.

## Last-Gasp Logging

Crash 직전 *1초의 로그*가 가장 중요합니다. 평소에 RAM ring buffer에 적어두고 crash 시 NVRAM에 dump.

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

Hot path에서 µs 단위로 부르고, crash dump에 ring 전체를 포함시킵니다. Host에서 ring을 풀어 *마지막 128개 event*를 시간 순으로 봅니다.

## RAM watchpoint 패턴 — Stack overflow 잡기

```c
extern uint32_t _stack_bottom;
*(uint32_t*)&_stack_bottom = 0xCAFEDEAD;

void watch_stack(void) {
    if (*(uint32_t*)&_stack_bottom != 0xCAFEDEAD) {
        gasp_log(GASP_STACK_OVERFLOW, 0);
        hardfault_save_dump(NULL);
    }
}
```

타이머나 idle에서 주기적으로 호출. Overflow가 *발생하는 순간*은 아니지만 그 직후를 잡습니다.

## Reset Reason 분석

```c
typedef enum {
    RESET_POWER   = 1 << 0,
    RESET_PIN     = 1 << 1,
    RESET_SW      = 1 << 2,
    RESET_IWDG    = 1 << 3,
    RESET_WWDG    = 1 << 4,
    RESET_LOWPWR  = 1 << 5,
    RESET_BOR     = 1 << 6,
} reset_reason_t;

reset_reason_t get_reset_reason(void) {
    uint32_t csr = RCC->CSR;
    reset_reason_t r = 0;
    if (csr & RCC_CSR_PORRSTF)  r |= RESET_POWER;
    if (csr & RCC_CSR_PINRSTF)  r |= RESET_PIN;
    if (csr & RCC_CSR_SFTRSTF)  r |= RESET_SW;
    if (csr & RCC_CSR_IWDGRSTF) r |= RESET_IWDG;
    if (csr & RCC_CSR_WWDGRSTF) r |= RESET_WWDG;
    if (csr & RCC_CSR_LPWRRSTF) r |= RESET_LOWPWR;
    if (csr & RCC_CSR_BORRSTF)  r |= RESET_BOR;
    RCC->CSR |= RCC_CSR_RMVF;    /* clear */
    return r;
}
```

| Reason | 의미 |
|--------|------|
| `RESET_POWER` | 정상 부팅 (전원 인가) |
| `RESET_PIN` | 사용자가 reset 버튼 |
| `RESET_SW` | 우리가 `NVIC_SystemReset` |
| `RESET_IWDG` | Independent watchdog → 코드 hang |
| `RESET_WWDG` | Window watchdog → timing 위반 |
| `RESET_BOR` | Brown-out → 전압 dip |
| `RESET_LOWPWR` | Low-power mode escape failure |

Cloud에서 reset reason 분포를 보면 *어떤 종류 crash가 흔한지* 한눈에 보입니다. IWDG 50%, BOR 30%, hardfault 20%면 *전원* 또는 *hang* 문제가 우선.

## Field Debug — 원격 진단

USB 없이 ssh도 없는 device 어떻게 debug할까. 다음 옵션이 있다.

1. **NB-IoT / LTE-M / WiFi** — 가벼운 telemetry
2. **BLE** — 1m 거리에서 mobile app으로 dump 받기
3. **UART/SD card** — 회수 후 분석
4. **디바이스 자체에 dump-view UI**

크리티컬한 device는 *모든 reset마다* cloud에 reset reason과 mini-dump를 보냅니다. 한 사용자의 device에서만 발생하는 crash도 잡힙니다.

## Crash Grouping

다음 두 crash는 *같은 bug*입니다.

```text
device-A: PC=0x08001234 CFSR=0x00008200 BFAR=0x00000004
device-B: PC=0x08001234 CFSR=0x00008200 BFAR=0x00000004
device-C: PC=0x08001236 CFSR=0x00008200 BFAR=0x00000004    ← PC가 약간 다름
```

PC가 정확히 일치 안 해도 *같은 source line*이면 같은 bug. `addr2line`으로 normalize한 다음 grouping.

```bash
addr2line -e firmware.elf 0x08001234 0x08001236
process_packet at packet.c:78
process_packet at packet.c:78
```

같은 line이면 같은 그룹.

## 자주 보는 함정

> Dump 영역을 normal RAM에 둠

```c
mini_dump_t dump;   /* .bss에 위치 → 부팅 시 0으로 clear */
```

`.bss`는 부팅 직후 0으로 초기화됩니다. *no-init RAM* 또는 backup SRAM에 둡니다.

```c
__attribute__((section(".noinit"))) mini_dump_t dump;
```

> Stack overflow로 dump 자체가 망가짐

Fault 진입 시 NVIC가 stack에 push 못 하면 더블 fault. Dump 코드는 *fault entry 전*에 작은 stack frame으로 동작해야 합니다.

```c
__attribute__((naked))
void HardFault_Handler(void) {
    __asm volatile (
        "ldr  sp, =_temp_dump_stack \n"   /* fault용 별도 stack */
        "b    hardfault_save_dump   \n"
    );
}
```

> Cloud 전송 실패 시 dump 잃음

전송 실패 가능성. Flash에 *재전송 큐*로 두고, 다음 connect 시 다시 시도.

> Production에서 PII 포함

Coredump에는 RAM 전체가 들어갈 수 있어 사용자 데이터·암호가 노출됩니다. Field에서 *어느 영역만* dump할지 명시. PII 영역은 dump 전에 zero로 wipe.

> Symbol file 분실

Release 빌드의 `.elf`를 잃으면 `0x08001234`가 *영원히* 의미 없는 숫자. 모든 release elf를 *영구 보관*.

## 정리

- Linux는 systemd-coredump → gdb로 분석.
- MCU는 mini-dump를 backup SRAM에 저장 → reboot 후 cloud 전송.
- Mini-dump = register + stack + 최근 log + reset reason.
- Last-gasp ring buffer로 crash 직전 event를 살립니다.
- Reset reason flag (RCC->CSR)로 IWDG/BOR/SW reset을 구분.
- PC를 source line으로 normalize해서 같은 bug를 grouping.
- Strip된 binary와 *unstripped + debug symbol*을 같이 보관.
- Dump 영역은 `.noinit` 또는 backup SRAM. `.bss` 금지.

다음 편은 **FPGA 기초**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)
- [10-11: 로깅 시스템 설계](/blog/embedded/modern-recipes/part10-11-logging-system)
- [RTOS 5-04: 시스템 진단](/blog/embedded/rtos/practical-internals/part5-04-system-trace)
