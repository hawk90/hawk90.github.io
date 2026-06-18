---
title: "임베디드 Trace 비교 — RTT·ITM·SWO·ETM·Semihosting 선택"
date: 2026-05-26T09:06:00
description: "printf 없이 펌웨어 로그·trace 빼내기. 다섯 가지 방법 비교 + 코드 예제."
tags: [rtt, itm, swo, etm, semihosting, trace, embedded]
series: "Embedded Debugging"
seriesOrder: 6
draft: false
---

UART 한 핀을 *놓치면* 펌웨어 디버깅이 거의 불가능해 보입니다. ISR 안에서 printf를 하면 시스템이 멈추고, 인터럽트가 100 Hz로 들어오는데 9600 baud UART로 로그를 빼면 *로그 자체가 타이밍을 바꿉니다*. 다행히 임베디드 디버깅에는 *non-blocking* trace 메커니즘이 다섯 가지나 있습니다.

이 장은 그 다섯 — **RTT, ITM, SWO, ETM, Semihosting** — 을 비교하고, 어떤 상황에 어느 게 맞는지, 펌웨어·디버거 양쪽 설정을 깊이 다룹니다.

## 한 줄 비교

| 방법 | 핀 | 속도 | 펌웨어 부하 | 디버거 부하 |
|------|------|------|-------------|-------------|
| **Semihosting** | 0 (BKPT) | 매우 느림 | 매번 정지 | low |
| **ITM/SWO** | 1 (SWO) | 빠름 | 메모리 1 워드 쓰기 | medium |
| **RTT** | 0 (메모리만) | 매우 빠름 | 메모리 쓰기 | medium (polling) |
| **ETM** | 4~5 (TRACE 핀) | 매우 빠름 | 0 (HW) | 매우 큼 (capture HW) |
| **UART** | 1 (TX) | 느림 | 블로킹 | low |

## 1. Semihosting

가장 간단. ARM 어셈블리의 `BKPT 0xAB` (Thumb: `BKPT #0xAB` / `0xBEAB`) 명령이 디버거에게 *호스트의 시스템 콜*을 대신 실행해 달라고 요청.

```c
// SYS_WRITE0: NUL-terminated string을 호스트 stdout으로
static inline void semihost_puts(const char *s) {
    register const char *r1 asm("r1") = s;
    register int r0 asm("r0") = 0x04;     // SYS_WRITE0
    asm volatile("bkpt #0xAB" : "+r"(r0) : "r"(r1));
}

void main() {
    semihost_puts("Hello, host!\n");
    ...
}
```

### 호스트 측

OpenOCD:

```
(openocd) arm semihosting enable
```

J-Link GDB Server:

```bash
$ JLinkGDBServer -device STM32... -if SWD -singlerun
# GDB에서:
(gdb) monitor semihosting enable
```

이후 펌웨어의 `BKPT #0xAB`가 호스트 콘솔에 직출력. `printf` redirect도 가능 (newlib의 `_write`).

```c
// newlib retarget
extern "C" int _write(int fd, char *ptr, int len) {
    for (int i = 0; i < len; i++) {
        register int r0 asm("r0") = 0x03;          // SYS_WRITEC
        register const char *r1 asm("r1") = &ptr[i];
        asm volatile("bkpt #0xAB" : "+r"(r0) : "r"(r1));
    }
    return len;
}
```

이러면 `printf("...")`가 호스트 콘솔로.

### 한계

- *매 호출마다 CPU 정지* — 마이크로초 단위 latency가 *수십 ms*로 커짐.
- 디버거가 안 붙어 있으면 `BKPT #0xAB`가 hardfault.
- 인터럽트 latency에 치명적.

디버깅 초창기 (UART 안 잡혔을 때) + 인터럽트 안 쓸 때만 권장.

### 시스템 콜 ID

| ID | 이름 | 동작 |
|----|------|------|
| 0x01 | SYS_OPEN | 호스트 파일 open |
| 0x02 | SYS_CLOSE | close |
| 0x03 | SYS_WRITEC | 한 문자 출력 |
| 0x04 | SYS_WRITE0 | NUL-terminated string |
| 0x05 | SYS_WRITE | fd에 buffer 쓰기 |
| 0x06 | SYS_READ | fd에서 읽기 |
| 0x07 | SYS_READC | stdin 한 문자 |
| 0x0c | SYS_EXIT | 종료 |
| 0x12 | SYS_HEAPINFO | 힙 정보 |
| 0x13 | SYS_ELAPSED | 시간 |

전체 명세는 [ARM Semihosting](https://github.com/ARM-software/abi-aa/blob/main/semihosting/semihosting.rst).

## 2. ITM (Instrumentation Trace Macrocell)

ARM CoreSight의 일부. 메모리 매핑 레지스터에 워드를 쓰면 *SWO 핀*으로 trace 패킷이 송출됩니다.

![ITM/SWO 데이터 경로](/images/blog/tools/diagrams/itm-swo-path.svg)

### 펌웨어 측

```c
// ITM 활성화 (한 번)
void itm_init(uint32_t core_clock_hz, uint32_t swo_baud) {
    // 트레이스 핀 enable
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;

    // TPIU pin protocol = NRZ (UART-like SWO)
    TPI->SPPR = 0x02;

    // SWO baud rate: prescaler = core_clock / swo_baud - 1
    TPI->ACPR = (core_clock_hz / swo_baud) - 1;

    // ITM unlock
    ITM->LAR = 0xC5ACCE55;

    // ITM enable, stim port 0 enable
    ITM->TCR = ITM_TCR_TraceBusID_Msk | ITM_TCR_SWOENA_Msk |
               ITM_TCR_DWTENA_Msk | ITM_TCR_ITMENA_Msk;
    ITM->TER = 0xFFFFFFFF;   // 모든 32 stim port

    // formatter disable
    TPI->FFCR = 0x100;
}

static inline void itm_putchar(char c) {
    if ((ITM->TCR & ITM_TCR_ITMENA_Msk) == 0) return;
    if ((ITM->TER & 1) == 0) return;
    while ((ITM->PORT[0].u32 & 1) == 0);   // FIFO busy?
    ITM->PORT[0].u8 = c;
}
```

`printf` retarget:

```c
extern "C" int _write(int fd, char *ptr, int len) {
    for (int i = 0; i < len; i++) itm_putchar(ptr[i]);
    return len;
}
```

### 디버거 측

OpenOCD:

```text
(openocd) tpiu config internal /tmp/swo.log uart off 168000000 2000000
                              ^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^ ^^^^^^^
                              파일 (또는 :port)        core_clock swo_baud
(openocd) itm port 0 on
```

다음 도구로 보기:

```bash
$ tail -f /tmp/swo.log
$ nc localhost 3334    # internal :3334 로 했다면
```

J-Link:

```text
(JLink) SWOSpeed 2000000
(JLink) SWOSetClk 168000000     # 코어 클럭
(JLink) SWOStart
(JLink) SWORead             # 한번 읽기
```

또는 J-Link SWO Viewer GUI / `JLinkSWOViewerCLExe`.

### 핵심 — 코어 클럭

`tpiu config <core_clock>`이 *실제와 다르면* trace가 깨집니다. 잘못 쓰면 `?@#$` 같은 garbled 문자. 펌웨어 측 `SystemCoreClock` 값을 정확히 통보.

### Stim port 32개

채널을 *분리*해 한 채널은 텍스트, 한 채널은 binary 데이터.

```c
static inline void itm_send_u32(uint8_t port, uint32_t value) {
    while ((ITM->PORT[port].u32 & 1) == 0);
    ITM->PORT[port].u32 = value;
}

// 채널 0 = stdout
itm_putchar('a');

// 채널 1 = 센서 raw
itm_send_u32(1, sensor_value);
```

OpenOCD/J-Link 측에서 채널별 디코더 설정.

### 한계

- *SWO 핀* 필요. 일부 패키지(QFN-32 등 작은 거)는 SWO 핀이 없을 수도.
- 깊은 ISR 안에서 `while (FIFO busy)` 폴링 → 잠시 블로킹.
- SWO baud가 *코어 클럭*보다 훨씬 느림 → 너무 많은 trace는 throughput 한계.

### Cortex-M0/M0+ 주의

M0/M0+는 *ITM 없음*. trace를 쓰려면 RTT 또는 UART.

## 3. RTT (Real-Time Transfer)

Segger의 발명. 메모리 안에 *링 버퍼*를 두고 디버거가 *백그라운드 SWD*로 폴링.

![RTT 링 버퍼 메커니즘](/images/blog/tools/diagrams/rtt-ring-buffer.svg)

### 동작 원리

펌웨어:

```c
struct {
    char id[16];           // "SEGGER RTT\0"
    uint32_t max_up;       // up 채널 개수
    uint32_t max_down;     // down 채널 개수
    SEGGER_RTT_BUFFER_UP up[2];
    SEGGER_RTT_BUFFER_DOWN down[2];
} _SEGGER_RTT;
```

펌웨어 측의 `_SEGGER_RTT.up[0]` 링 버퍼에 바이트를 쓰면, 디버거가 *백그라운드로 SWD 메모리 읽기*로 그 버퍼를 가져갑니다.

CPU는 *멈추지 않습니다*. 인터럽트 latency 영향 최소.

### 펌웨어 측

```c
#include "SEGGER_RTT.h"

void main() {
    SEGGER_RTT_Init();         // 또는 자동 초기화 (zero-init)
    SEGGER_RTT_printf(0, "boot\n");
    while (1) {
        SEGGER_RTT_printf(0, "tick=%u\n", HAL_GetTick());
        HAL_Delay(1000);
    }
}
```

`SEGGER_RTT.c/h` + `SEGGER_RTT_printf.c`가 ~3KB. *완전 무료* (Segger의 *no-cost* 라이선스, 코드 안에 SEGGER 카피라이트 유지).

### 디버거 측

J-Link:

```bash
$ JLinkRTTViewer      # GUI
$ JLinkRTTClient      # CLI
```

또는 GDB 안에서:

```text
(gdb) monitor exec SetRTTSearchRanges 0x20000000 0x10000
(gdb) monitor exec SetRTTAddr 0x20000000
```

OpenOCD:

```text
(openocd) rtt setup 0x20000000 0x10000 "SEGGER RTT"
(openocd) rtt start
(openocd) rtt server start 9090 0
```

```bash
$ nc localhost 9090
```

### 채널 분리

```c
// 채널 1을 binary 센서 데이터로
SEGGER_RTT_ConfigUpBuffer(1, "Sensor", buf, sizeof(buf),
                          SEGGER_RTT_MODE_NO_BLOCK_SKIP);
SEGGER_RTT_Write(1, sensor_raw, 256);
```

- `BLOCK_IF_FIFO_FULL` — 디버거 안 따라오면 펌웨어 멈춤 (다양한 채널에 위험).
- `NO_BLOCK_SKIP` — 가득 차면 skip (기본).
- `NO_BLOCK_TRIM` — 가득 차면 잘라서.

### Up vs Down

- Up = 펌웨어 → 호스트. 로그.
- Down = 호스트 → 펌웨어. 명령 입력.

```c
// 호스트가 보낸 명령 받기
char cmd[32];
int n = SEGGER_RTT_Read(0, cmd, sizeof(cmd));
if (n > 0) process_command(cmd, n);
```

대화형 셸을 펌웨어에 만들 수도 있습니다.

### 속도

J-Link 환경에서 ~1 MB/s. UART 921600 baud(~92 KB/s)의 *10배*. 큰 binary 데이터(이미지·센서 raw)에도 적합.

OpenOCD는 *폴링 빈도*가 J-Link보다 낮아 ~수십 KB/s. 그래도 UART 9600의 *수십 배*.

### 장점 정리

- CPU 정지 안 됨.
- ISR 안에서도 안전 (`NO_BLOCK_SKIP` 모드).
- *추가 핀 없음* (메모리만).
- 디버그 빌드의 핫 패스에 박아도 영향 최소.

### 단점

- 디버거가 *연결돼 있어야* 함 (펌웨어는 그냥 메모리에 쓰지만 호스트가 가져가지 않으면 사이클이 낭비).
- 원래 Segger 전용이지만 OpenOCD 0.11+ 호환 구현.

## 4. ETM (Embedded Trace Macrocell)

ARM CoreSight의 *명령 단위* trace. CPU가 실행하는 *모든 명령*을 trace 핀으로 송출.

### 하드웨어

- 옵션 IP. Cortex-M0/M0+는 *없음*. M3/M4 옵션. M7+ 일반적 탑재.
- TRACE 핀 4~5개 (병렬), 또는 SWO 한 핀 (1bit, 매우 느림).
- *전용 캡처 하드웨어* 필요: J-Trace, Lauterbach TRACE32, ARM DSTREAM.
- 또는 *Embedded Trace Buffer (ETB)* — 칩 내장 RAM에 저장 후 SWD로 나중에 읽기.

### 사용 예

```bash
$ JTraceExe -device STM32F767ZI -if SWD -tracesink uart   # 1-bit SWO
$ JTraceExe -device STM32F767ZI -if SWD -tracesink TRACE  # 4-bit TRACE
```

Ozone GUI에서 *Function Profile* 탭이 자동으로 ETM trace 사용.

### 쓰임

- *Code Coverage* — 어떤 함수가 *실제로 실행됐는지*.
- *Profile* — 함수별 실행 시간 분포 (cycle-accurate).
- *비결정적 버그 분석* — 마지막 N개의 명령 (보통 ETB 4KB ~ 1MB).
- 인터럽트 latency 정확 측정.

### 한계

- 하드웨어가 비쌈 ($1000+).
- 디버그 핀이 PCB 라우팅 시 별도.
- ETM 자체가 추가 silicon (그래서 옵션).

## 5. UART — 비교 대상

전통적 방법. *블로킹*이지만 단순.

```c
void uart_putchar(char c) {
    while (!(USART1->SR & USART_SR_TXE));
    USART1->DR = c;
}
```

*DMA 모드*로 만들면 non-blocking에 가깝지만 코드 복잡.

### 장점

- *디버거 없이* 동작.
- 표준 시리얼 콘솔로 모든 환경에서 확인.
- 양산 출하 후에도 진단용.

### 단점

- 핀 사용 (TX 1핀, 보통 RX도).
- baud 한계 (~1 Mbps).
- ISR에서 블로킹.

대부분의 양산 펌웨어는 *UART + RTT*를 같이 둡니다. 개발은 RTT, 진단은 UART.

## 비교 — 어느 상황에 어느 걸

| 상황 | 추천 |
|------|------|
| UART 미연결, 디버거만 있음 | Semihosting (시작) → RTT (본격) |
| ISR 안 디버깅 | RTT (NO_BLOCK_SKIP) |
| 인터럽트 latency 측정 | ETM 또는 DWT cycle counter |
| 대용량 binary trace | RTT 채널 분리 |
| 양산 후 진단 | UART |
| Cortex-M0/M0+ | RTT (ITM/ETM 없음) |
| 함수 단위 프로파일 | ETM (J-Trace) |
| 운영 모니터링 | UART → cloud |

## printf retarget — 표준 패턴

newlib을 쓰면 `_write`/`_read`만 정의하면 `printf`가 동작.

```c
extern "C" int _write(int fd, char *buf, int len) {
    // RTT가 connected면 RTT로, 아니면 UART로 폴백
    if (SEGGER_RTT_HasData(0) || JLINK_CONNECTED) {
        return SEGGER_RTT_Write(0, buf, len);
    }
    for (int i = 0; i < len; i++) uart_putchar(buf[i]);
    return len;
}
```

stack 사용량 최적화로 `printf` 대신 `siprintf`(integer-only printf) 사용 권장 — float 지원 코드가 큽니다 (~수십 KB).

## RTT 채널 활용 — 실전 예제

데이터 로깅 + 명령 셸.

```c
// 채널 0 (up) = 로그
// 채널 1 (up) = 센서 binary
// 채널 0 (down) = 셸 명령

void shell_loop() {
    char line[64]; int n = 0;
    while (1) {
        int c = SEGGER_RTT_GetKey();
        if (c < 0) continue;
        if (c == '\n' || c == '\r') {
            line[n] = '\0';
            handle_cmd(line);
            n = 0;
        } else if (n < sizeof(line) - 1) {
            line[n++] = c;
            SEGGER_RTT_putchar(0, c);    // echo
        }
    }
}

void handle_cmd(const char *line) {
    if (strcmp(line, "stats") == 0) {
        SEGGER_RTT_printf(0, "ticks=%u, uptime=%u\n",
                          HAL_GetTick(), get_uptime());
    } else if (strncmp(line, "set ", 4) == 0) {
        ...
    }
}
```

USB CDC나 UART 셸을 만드는 것보다 *훨씬 가벼움*. 개발 중에 매우 유용.

## 정리

- **Semihosting** — 0핀, 매우 느림, 매 호출 CPU halt. 시작 단계용.
- **ITM/SWO** — 1핀, 빠름, M3/M4+ 필요. ARM 표준.
- **RTT** — 0핀, 매우 빠름, 모든 ARM (M0 포함). Segger 발명, 일반적 표준.
- **ETM** — 4-5핀, 매우 빠름, 명령 단위 trace, 비싼 HW 필요.
- **UART** — 1핀, 블로킹, 양산 후 진단용.
- 표준 패턴 = RTT (개발) + UART (양산).
- `printf` retarget으로 `_write`만 정의하면 newlib에서 동작.
- 코어 클럭 통보가 SWO/ITM의 핵심 함정.

## 다음 장 예고

Ch 7 — RTOS-aware 디버깅 + 실전 트러블슈팅. FreeRTOS/Zephyr 등의 task별 콜스택, MMU·MPU, fault analyzer, 신호 무결성 문제 해결.

## 관련 항목

- [Ch 4: J-Link 도구 체인](/blog/tools/debugging/embedded/chapter04-jlink) — RTT는 J-Link 표준
- [Ch 7: RTOS-aware + 트러블슈팅](/blog/tools/debugging/embedded/chapter07-rtos-troubleshooting)
- [Segger RTT 페이지](https://www.segger.com/products/debug-probes/j-link/technology/about-real-time-transfer/)
- [ARM Semihosting 명세](https://github.com/ARM-software/abi-aa/blob/main/semihosting/semihosting.rst)
- [ARMv7-M ITM 명세](https://developer.arm.com/documentation/ddi0403/latest/) — Appendix
- newlib `_write`/`_read` retarget — gcc-arm-none-eabi 매뉴얼
