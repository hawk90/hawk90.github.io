---
title: "임베디드 Trace 비교 — RTT·ITM·SWO·ETM·Semihosting 선택"
slug: "tools/debugging/embedded/chapter06-trace"
date: 2026-05-26T09:06:00
description: "printf 없이 펌웨어 로그·trace 빼내기. 다섯 가지 방법 비교 + 코드 예제."
tags: [rtt, itm, swo, etm, semihosting, trace, embedded]
series: "Embedded Debugging"
seriesOrder: 6
draft: false
topics: ["tools", "tools/debugging"]
---

UART 한 핀을 못 쓰게 되면 펌웨어 로그를 어떻게 빼낼까요? 출력 방법마다 *관찰 대상을 얼마나 건드리는지*가 다릅니다. 디버거에게 매번 CPU를 세워 달라고 하는 방법도 있고, 메모리에 써 두면 프로브가 몰래 가져가는 방법도 있고, 하드웨어가 명령 흐름을 통째로 내보내는 방법도 있습니다.

이 장은 **Semihosting, ITM/SWO, RTT, ETM**을 UART와 비교합니다. 동작 원리는 1차 문서로, 직접 확인할 수 있는 부분은 QEMU에서 돌려 확인했습니다.

## 실험 환경

| 항목 | 값 |
|------|-----|
| 에뮬레이터 | QEMU 11.1.3 `netduinoplus2` (Cortex-M4) |
| 컴파일러 | semihosting 예제: arm-none-eabi-gcc 16.2.0 (5장 `fw.elf`), RTT 예제: Debian `gcc-arm-none-eabi` 14.2.1 + newlib-nano |
| RTT 소스 | [SEGGERMicro/RTT](https://github.com/SEGGERMicro/RTT) 태그 V8.58.0 |
| 명세 | [Arm Semihosting 2025Q4](https://github.com/ARM-software/abi-aa/blob/2025Q4/semihosting/semihosting.rst), Cortex-M4 TRM(DDI 0439B), CMSIS 5.9.0 |

QEMU는 ITM·TPIU·ETM을 흉내 내지 않습니다(2장에서 ITM TCR이 0으로 읽혔습니다). 그래서 ITM/SWO와 ETM은 문서로만 다루고, 실제 실행은 semihosting과 RTT에 한정했습니다.

## 한눈에 비교

| 방법 | 추가 핀 | 출력할 때 CPU | 디버거 필요 | 근거 |
|------|------|-------------|-------------|------|
| **Semihosting** | 0 (`BKPT #0xAB`) | 호출마다 디버거가 처리할 때까지 정지 | 필수. 없으면 HardFault (아래 실험) | Arm Semihosting 명세 |
| **ITM/SWO** | 1 (SWO) | stimulus port FIFO가 빌 때까지 대기 | 수신기 필요 | Cortex-M4 TRM, CMSIS |
| **RTT** | 0 (메모리만) | 버퍼에 쓰고 진행(모드에 따라 대기) | 없어도 동작, 읽으려면 필요 | SEGGER RTT 소스 |
| **ETM** | trace port | 영향 없음 (SEGGER: "non-intrusively") | 전용 캡처 장비 | Cortex-M4 TRM, SEGGER J-Trace 페이지 |
| **UART** | 1 (TX) | 구현에 따라(폴링이면 대기) | 불필요 | — |

속도는 표에 넣지 않았습니다. 프로브·인터페이스 속도·버퍼 크기에 따라 달라지고, 이 장에는 실측 자료가 없기 때문입니다.

## 1. Semihosting

가장 단순한 방법입니다. 타깃이 `BKPT #0xAB`를 실행하면 디버거가 그 자리에서 CPU를 세우고, 레지스터에 담긴 요청(호스트 파일 열기, 문자열 출력 등)을 *대신 실행*한 뒤 재개합니다. Arm Semihosting 명세는 M-profile의 트랩 명령을 T32 `BKPT #0xAB`(인코딩 `0xBEAB`)로 정하고, R0에 operation 번호, R1에 인자 블록 주소를 넣도록 합니다.

5장 예제의 `semihost.h`입니다.

```c title="semihost.h"
#pragma once
static inline int semihost_call(int op, const void *arg) {
    register int r0 __asm__("r0") = op;
    register const void *r1 __asm__("r1") = arg;
    __asm__ volatile("bkpt #0xAB" : "+r"(r0) : "r"(r1) : "memory");
    return r0;
}
static inline void semihost_puts(const char *s) { semihost_call(0x04, s); } /* SYS_WRITE0 */
```

### 호스트 측

QEMU는 `-semihosting-config enable=on`으로 받습니다. `target=native`면 QEMU가 직접 출력하고, `target=gdb`면 1장에서 본 것처럼 GDB에 `Fwrite,2,8000150,5` 패킷으로 넘깁니다.

OpenOCD는 `arm semihosting enable`, J-Link GDB Server는 `monitor semihosting enable`로 켭니다. J-Link GDB Server는 semihosting 출력을 별도 Telnet 포트 2333으로 내보냅니다(4장).

### 디버거가 없으면

같은 `fw.elf`를 semihosting을 끈 QEMU에서 `-d int`로 돌리면 이렇게 됩니다.

```text
Loaded reset SP 0x20002408 PC 0x8000045 from vector table
Taking exception 7 [Breakpoint] on CPU 0
...taking pending nonsecure exception 3
...loading from element 3 of non-secure vector table at 0xc
...loaded new PC 0x8000041
```

`BKPT`가 처리되지 못하고 HardFault(예외 3)로 올라가 `Default_Handler`(0x08000041)로 빠졌습니다. 첫 `semihost_puts("boot\n")`에서 펌웨어가 멈춘 것입니다. SEGGER의 RTT FAQ도 "소프트웨어 브레이크포인트를 쓰는 printf 방식은 디버거 없이 실행하면 hardfault를 일으킨다"고 이 문제를 지적합니다. semihosting 출력이 들어간 디버그 빌드를 디버거 없이 돌리면 안 되는 이유입니다.

### operation 번호

[Arm Semihosting 2025Q4](https://github.com/ARM-software/abi-aa/blob/2025Q4/semihosting/semihosting.rst)의 operation 목록에서 자주 쓰는 것입니다.

| 번호 | 이름 | 동작 |
|----|------|------|
| 0x01 | SYS_OPEN | 호스트 파일 열기 |
| 0x02 | SYS_CLOSE | 닫기 |
| 0x03 | SYS_WRITEC | 한 문자 출력 |
| 0x04 | SYS_WRITE0 | NUL로 끝나는 문자열 출력 |
| 0x05 | SYS_WRITE | 파일 핸들에 버퍼 쓰기 |
| 0x06 | SYS_READ | 파일 핸들에서 읽기 |
| 0x07 | SYS_READC | 콘솔에서 한 문자 |
| 0x16 | SYS_HEAPINFO | 힙·스택 정보 |
| 0x18 | SYS_EXIT | 종료 |
| 0x30 | SYS_ELAPSED | 경과 tick |

newlib의 `--specs=rdimon.specs` 같은 semihosting 라이브러리를 쓰면 `printf`가 이 호출들로 바뀝니다. J-Run이 테스트 종료를 semihosting exit로 알아채는 것(4장)도 같은 메커니즘입니다.

### 한계

- 호출마다 CPU가 멈추고 디버거 왕복이 끼므로, 인터럽트 응답 시간을 재거나 타이밍이 민감한 경로에는 맞지 않습니다.
- 위 실험처럼 디버거가 없으면 HardFault입니다.

## 2. ITM (Instrumentation Trace Macrocell)

ITM은 2장에서 본 CoreSight 블록입니다. stimulus port 레지스터에 쓰면 trace 패킷이 TPIU를 거쳐 SWO 핀으로 나갑니다.

![ITM/SWO 데이터 경로](/images/blog/tools/diagrams/itm-swo-path.svg)

### 펌웨어 측

아래 초기화 코드의 레지스터와 비트 이름은 CMSIS 5.9.0 `core_cm4.h`에 있는 그대로입니다. 보통은 디버거가 TPIU를 설정하므로 펌웨어가 직접 할 필요가 없지만, 무엇이 설정되는지 보여 주려고 모두 적었습니다.

```c
void itm_init(uint32_t traceclk_hz, uint32_t swo_baud) {
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;   // trace 블록 켜기
    TPI->SPPR = 2;                                    // 핀 프로토콜: 2 = async NRZ(UART)
    TPI->ACPR = (traceclk_hz / swo_baud) - 1;          // 분주비 = PRESCALER + 1
    TPI->FFCR = 0x100;                                // EnFCont=0 (formatter 끔)
    ITM->LAR = 0xC5ACCE55;                            // CoreSight lock 해제 키
    ITM->TCR = (1UL << ITM_TCR_TraceBusID_Pos) | ITM_TCR_SWOENA_Msk |
               ITM_TCR_DWTENA_Msk | ITM_TCR_ITMENA_Msk;
    ITM->TER = 0xFFFFFFFF;                            // stimulus port 32개 모두
}

static inline void itm_putchar(char c) {
    if ((ITM->TCR & ITM_TCR_ITMENA_Msk) == 0) return;
    if ((ITM->TER & 1) == 0) return;
    while (ITM->PORT[0].u32 == 0) {}                  // FIFO가 받을 준비가 될 때까지
    ITM->PORT[0].u8 = (uint8_t)c;
}
```

근거를 짚으면 이렇습니다. SPPR 값 2가 async NRZ라는 것은 OpenOCD `src/target/arm_tpiu_swo.h`의 `TPIU_PIN_PROTOCOL_ASYNC_UART = 2`에서, ACPR이 PRESCALER + 1로 나눈다는 것은 Cortex-M4 TRM의 TPIU_ACPR 설명에서 확인했습니다. FFCR은 TRM에서 리셋값이 0x102이고 비트 8 TrigIn은 RAO, 비트 1이 EnFCont(continuous formatting)입니다. `0xC5ACCE55`는 OpenOCD `arm_coresight.h`의 `ARM_CS_LAR_UNLOCK_KEY`와 같은 값입니다. `itm_putchar`의 대기 조건은 CMSIS의 `ITM_SendChar()`가 쓰는 조건과 같습니다.

`printf`를 ITM으로 보내려면 newlib의 `_write`를 정의합니다.

```c
int _write(int fd, char *ptr, int len) {
    for (int i = 0; i < len; i++) itm_putchar(ptr[i]);
    return len;
}
```

### 디버거 측

OpenOCD 0.12 이후에는 `tpiu create`·`<이름> configure`를 씁니다(2장). 매뉴얼의 STM32L1 예에서 핵심은 두 줄입니다.

```tcl
stm32l1.tpiu configure -protocol uart -traceclk 24000000 -pin-freq 12000000
stm32l1.tpiu enable
itm port 0 on
```

`-traceclk`는 필수이고 Cortex-M3/M4 내장 TPIU라면 보통 HCLK와 같다고 매뉴얼이 적습니다. `-pin-freq`를 생략하면 어댑터가 지원하는 최대 속도를 고릅니다.

### 핵심 — trace 클럭

받는 쪽이 아는 TRACECLKIN이 실제와 다르면, ACPR로 나눈 SWO 비트율이 기대와 달라져 바이트가 깨집니다. 펌웨어가 클럭을 바꾼다면(PLL 전환 등) 디버거 설정도 같은 값을 써야 합니다.

### stimulus port 분리

포트가 32개이므로 채널을 나눠 쓸 수 있습니다. 포트 0을 텍스트, 포트 1을 32비트 측정값으로 쓰는 식입니다.

```c
static inline void itm_send_u32(uint8_t port, uint32_t value) {
    while (ITM->PORT[port].u32 == 0) {}
    ITM->PORT[port].u32 = value;
}
```

### 한계

- SWO 핀이 패키지에 나와 있어야 합니다.
- FIFO가 찰 정도로 많이 쓰면 위의 대기 루프에서 CPU가 기다립니다.
- Cortex-M0/M0+(Armv6-M)에는 ITM이 없습니다. CMSIS `core_cm0.h`·`core_cm0plus.h`에 `ITM_Type`이 정의돼 있지 않습니다.

## 3. RTT (Real-Time Transfer)

RTT는 SEGGER가 만든 메모리 기반 채널입니다. 타깃 RAM에 *control block*과 링 버퍼를 두고, 펌웨어는 버퍼에 쓰기만 합니다. 프로브는 CPU를 멈추지 않고 디버그 포트로 메모리를 읽어 가져갑니다.

![RTT 링 버퍼 메커니즘](/images/blog/tools/diagrams/rtt-ring-buffer.svg)

### control block 구조

V8.58.0 `SEGGER_RTT.h`의 정의입니다.

```c
typedef struct {
  const     char*    sName;
            char*    pBuffer;
            unsigned SizeOfBuffer;
            unsigned WrOff;         // 타깃이 다음에 쓸 위치
  volatile  unsigned RdOff;         // 호스트가 다음에 읽을 위치 (호스트가 갱신)
            unsigned Flags;         // [1:0] = 동작 모드
} SEGGER_RTT_BUFFER_UP;

typedef struct {
  char                    acID[16];   // "SEGGER RTT"
  int                     MaxNumUpBuffers;
  int                     MaxNumDownBuffers;
  SEGGER_RTT_BUFFER_UP    aUp[SEGGER_RTT_MAX_NUM_UP_BUFFERS];
  SEGGER_RTT_BUFFER_DOWN  aDown[SEGGER_RTT_MAX_NUM_DOWN_BUFFERS];
} SEGGER_RTT_CB;
```

`SEGGER_RTT_ConfDefaults.h`의 기본값은 up 버퍼 1024바이트(`BUFFER_SIZE_UP`), up·down 버퍼 각 2개, 기본 모드 `SEGGER_RTT_MODE_NO_BLOCK_SKIP`입니다. 헤더 주석은 "가득 참과 비어 있음을 구분하려고 버퍼를 끝까지 채우지 않으므로 1바이트를 잃는다"고 적습니다. 호스트는 메모리에서 `acID`의 `"SEGGER RTT"` 문자열을 찾아 control block 위치를 알아냅니다(OpenOCD `rtt setup`의 ID 기본값, J-Link의 자동 검색이 모두 이 문자열입니다).

### 펌웨어 크기

Debian arm-none-eabi-gcc 14.2.1, `-mcpu=cortex-m4 -mthumb -Os`로 V8.58.0 소스를 컴파일한 결과입니다.

```text
   text	   data	    bss	    dec	    hex	filename
   2562	      0	   1209	   3771	    ebb	SEGGER_RTT.o
   1067	      0	      0	   1067	    42b	SEGGER_RTT_printf.o
```

bss 1209바이트는 control block과 기본 up 버퍼 1024바이트, down 버퍼 16바이트 등입니다. SEGGER 제품 페이지는 "~500 Bytes of ROM"이라고 적는데, 이 빌드의 `SEGGER_RTT.o` 코드는 그보다 큽니다. 링크 후 `--gc-sections`로 쓰지 않는 함수는 빠지므로, 실제로 차지하는 크기는 최종 ELF의 MAP 파일(5장)로 확인해야 합니다.

### 버퍼 모드 — 실제로 돌려 보기

세 모드의 차이를 QEMU에서 확인했습니다. up 버퍼 1번을 32바이트로 설정하고 쓰기 결과를 semihosting으로 출력하는 펌웨어입니다(소스 일부).

```c
static char small[32];
static const char msg[] = "0123456789abcdefghijklmnopqrstuvwxyzABCD"; /* 40 bytes */

SEGGER_RTT_ConfigUpBuffer(1, "Small", small, sizeof small, SEGGER_RTT_MODE_NO_BLOCK_SKIP);
report("SKIP 40B into empty 32B", SEGGER_RTT_Write(1, msg, 40));
report("SKIP 10B", SEGGER_RTT_Write(1, msg, 10));
report("SKIP 30B more", SEGGER_RTT_Write(1, msg, 30));
SEGGER_RTT_ConfigUpBuffer(1, "Small", small, sizeof small, SEGGER_RTT_MODE_NO_BLOCK_TRIM);
report("TRIM 10B", SEGGER_RTT_Write(1, msg, 10));
report("TRIM 30B more", SEGGER_RTT_Write(1, msg, 30));
n = SEGGER_RTT_ReadUpBuffer(1, host, sizeof host);   /* 프로브가 하는 일을 흉내 */
report("TRIM 30B after host read", SEGGER_RTT_Write(1, msg, 30));
```

출력입니다.

```text
SKIP 40B into empty 32B: returned 0, bytes in buffer 0
SKIP 10B: returned 10, bytes in buffer 10
SKIP 30B more: returned 0, bytes in buffer 10
TRIM 10B: returned 10, bytes in buffer 10
TRIM 30B more: returned 21, bytes in buffer 31
host read 31 bytes
TRIM 30B after host read: returned 30, bytes in buffer 34
```

- **NO_BLOCK_SKIP**(기본)은 *전부 들어가지 않으면 하나도 쓰지 않습니다*. 빈 32바이트 버퍼에도 40바이트는 0, 10바이트가 찬 뒤의 30바이트도 0입니다. 로그 한 줄이 통째로 사라집니다.
- **NO_BLOCK_TRIM**은 *들어가는 만큼* 씁니다. 10바이트 뒤에 30바이트를 쓰면 21바이트만 들어가 31바이트(32 − 1)가 찹니다. 줄 끝이 잘립니다.
- 호스트가 31바이트를 읽어 가자 다시 30바이트가 들어갔습니다. *읽어 가는 쪽이 없으면 공간이 생기지 않는다*는 것이 RTT의 본질입니다.

마지막 줄의 `bytes in buffer 34`는 32바이트 버퍼로는 불가능한 값입니다. `SEGGER_RTT_GetBytesInBuffer()`(V8.58.0 `SEGGER_RTT.c` 2049~2053행)는 `RdOff > WrOff`인 경우 `SizeOfBuffer - (WrOff - RdOff)`를 계산하는데, unsigned 뺄셈이 음수가 되어 랩어라운드합니다. 이때 RdOff는 31, WrOff는 (31 + 30) mod 32 = 29이므로 32 − (29 − 31)이 unsigned로 34가 됩니다. 버퍼가 한 바퀴 돌면 이 함수의 값을 믿을 수 없다는 뜻이고, 이 실험에서만 확인한 동작입니다.

**BLOCK_IF_FIFO_FULL**은 같은 32바이트 버퍼에 40바이트를 쓰게 했더니 함수가 돌아오지 않았습니다. 4초 뒤 GDB로 붙어 본 상태입니다.

```text
#1  0x0800029e in _WriteBlocking (pRing=pRing@entry=0x20000510 <_SEGGER_RTT+48>, pBuffer=0x800193f <msg+30> "vwxyzABCD", NumBytes=9) at SEGGER_RTT.c:361
#2  0x0800042a in SEGGER_RTT_WriteNoLock (BufferIndex=BufferIndex@entry=1, pBuffer=pBuffer@entry=0x8001920 <msg>, NumBytes=NumBytes@entry=40) at SEGGER_RTT.c:1097
#3  0x0800045a in SEGGER_RTT_Write (BufferIndex=BufferIndex@entry=1, pBuffer=pBuffer@entry=0x8001920 <msg>, NumBytes=NumBytes@entry=40) at SEGGER_RTT.c:1168
#4  0x0800018c in main () at rttdemo.c:29
$1 = {sName = 0x8001825, pBuffer = 0x200000b0, SizeOfBuffer = 0x20, WrOff = 0x1f, RdOff = 0x0, Flags = 0x2}
```

31바이트를 쓰고(WrOff 0x1f) 남은 9바이트(`"vwxyzABCD"`)를 넣을 자리가 생기기를 `_WriteBlocking`에서 계속 기다리고 있습니다. 호스트가 없으면 영원히 기다립니다. SEGGER RTT 문서도 `BLOCK_IF_FIFO_FULL`을 제외한 모든 모드는 호스트가 가져가는 속도보다 빨리 쓰면 데이터를 잃을 수 있다고 적고, 제품 페이지 FAQ는 기본이 non-blocking이라 디버거가 없어도 프로그램이 계속 동작한다고 설명합니다.

정리하면, ISR에서 쓸 버퍼는 non-blocking 모드여야 하고, 그 대가로 데이터가 사라질 수 있다는 것을 받아들여야 합니다.

### 디버거 측

J-Link는 연결이 살아 있는 동안 localhost:19021에 RTT Telnet 채널을 엽니다(4장). OpenOCD는 다음과 같습니다.

```tcl
rtt setup 0x20000000 0x10000 "SEGGER RTT"
rtt start
rtt server start 9090 0
```

OpenOCD 소스(`src/rtt/rtt.c`)의 기본 폴링 주기는 100 ms이고 `rtt polling_interval`로 바꿉니다. 폴링 주기 동안 쓰인 데이터가 버퍼보다 크면 위의 SKIP·TRIM 결과처럼 데이터가 사라지므로, 버퍼 크기는 *폴링 주기 동안 쓰는 양*보다 커야 합니다. SEGGER 제품 페이지도 최소 버퍼 크기를 "1 ms 동안 쓰는 양과 한 번에 쓰는 최대량"으로 어림하라고 안내합니다(이 기준은 J-Link의 폴링을 전제로 한 설명입니다).

### Up vs Down

- Up = 타깃 → 호스트. 로그.
- Down = 호스트 → 타깃. 명령 입력.

```c
char cmd[32];
unsigned n = SEGGER_RTT_Read(0, cmd, sizeof cmd);   // down 버퍼 0에서 읽기
if (n > 0) process_command(cmd, n);
```

`SEGGER_RTT_HasData(n)`은 *down* 버퍼 n에 호스트가 보낸 데이터가 있는지, `SEGGER_RTT_HasDataUp(n)`은 up 버퍼에 아직 안 읽힌 데이터가 있는지 알려 줍니다. 이름이 비슷하니 헤더를 확인하고 씁니다.

### 지원 대상

SEGGER 제품 페이지는 RTT가 *백그라운드 메모리 접근을 허용하는* 타깃, 즉 Cortex-M과 RX에서 동작한다고 적고, FAQ에서 Cortex-M0/M0+도 된다고 답합니다. ITM이 없는 M0/M0+에서 쓸 수 있는 소프트웨어 trace라는 점이 RTT의 큰 장점입니다.

## 4. ETM (Embedded Trace Macrocell)

ETM은 CPU가 실행한 *명령 흐름*을 trace로 내보내는 CoreSight 블록입니다. Cortex-M4 TRM은 ETM을 구현 선택으로 두고(1.1의 trace 구성 목록), TPIU 블록 그림에 병렬 trace port 출력 `TRACECLK`·`TRACEDATA[3:0]`를 보여 줍니다. ROM table에서 ETM이 없으면 해당 항목이 `0xFFF42002`로 읽힙니다(2장).

### 하드웨어

- 칩이 ETM을 구현했는지, trace port 핀이 패키지에 나와 있는지 먼저 확인합니다.
- trace port를 받으려면 전용 캡처 장비가 필요합니다. 예를 들어 SEGGER [J-Trace 페이지](https://www.segger.com/products/debug-probes/j-trace/)는 지원 trace encoder로 Cortex-M ETM Trace를 듭니다.

### 쓰임

J-Trace 페이지가 드는 용도는 다음과 같습니다.

- 어떤 코드가 *실제로 실행됐는지*(live code coverage).
- 함수별 실행 시간 분포(live code profiling).
- 실행한 명령 흐름 전체의 기록(complete instruction trace).

이 장에서는 ETM 캡처를 하지 않았습니다. 장비·설정은 [Performance Engineering 시리즈의 ARM DS·Lauterbach 글](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)이 다룹니다.

## 5. UART — 비교 대상

가장 전통적인 방법이고, 디버거 없이도 동작한다는 점이 다른 모든 방법과 다릅니다.

```c
void uart_putchar(char c) {
    while (!(USART1->SR & USART_SR_TXE)) {}   // 송신 레지스터가 빌 때까지 대기
    USART1->DR = c;
}
```

이 폴링 구현은 바이트마다 송신이 끝날 때까지 기다리므로, 출력량에 비례해 CPU 시간을 씁니다. 인터럽트나 DMA로 보내면 대기는 줄지만 버퍼 관리 코드가 늘어납니다.

- 디버거 없이 동작하므로 출하 후 진단에 쓸 수 있습니다.
- TX 핀(대개 RX까지)이 필요합니다.

## 상황별 선택

아래 판단은 위의 동작 특성에서 끌어낸 것입니다.

| 상황 | 고를 방법 | 이유 |
|------|------|------|
| UART가 없고 디버거만 있음, bring-up 초기 | Semihosting | 설정 없이 바로 출력 |
| ISR 안에서 로그 | RTT (non-blocking) | CPU를 세우지 않음. 대신 데이터가 사라질 수 있음 |
| 인터럽트 지연 측정 | DWT 사이클 카운터(2장) 또는 ETM | 출력 자체가 타이밍을 바꾸지 않음 |
| Cortex-M0/M0+ | RTT 또는 UART | ITM 없음 |
| 디버거 없이 돌아야 하는 빌드 | UART 또는 RTT(non-blocking) | semihosting은 HardFault |
| 함수 단위 프로파일 | ETM | 명령 흐름 전체 |

## printf 연결 — newlib `_write`

newlib을 쓰면 `_write`만 정의하면 `printf`가 그 경로로 나갑니다. RTT와 UART를 둘 다 두고 싶다면, 디버거 연결 여부를 추측하지 말고 *둘 다* 보내는 편이 단순합니다. RTT는 non-blocking이라 아무도 읽지 않아도 펌웨어가 멈추지 않습니다.

```c
int _write(int fd, char *buf, int len) {
    SEGGER_RTT_Write(0, buf, len);              // 읽는 호스트가 없으면 버려짐(기본 SKIP)
    for (int i = 0; i < len; i++) uart_putchar(buf[i]);
    return len;
}
```

부동소수점이 필요 없다면 newlib의 정수 전용 `siprintf`를 쓸 수 있습니다. Debian newlib의 `libc_nano.a`에도 `siprintf`가 들어 있었습니다. 코드 크기 차이는 링크 결과의 MAP 파일로 확인합니다.

## RTT로 만드는 작은 셸

up 0을 로그, up 1을 바이너리 데이터, down 0을 명령 입력으로 쓰면 디버그 포트만으로 대화형 셸을 만들 수 있습니다. `SEGGER_RTT_GetKey()`는 down 버퍼 0에서 한 문자를 읽고 없으면 음수를 돌려줍니다.

```c
void shell_loop(void) {
    char line[64]; unsigned n = 0;
    for (;;) {
        int c = SEGGER_RTT_GetKey();
        if (c < 0) continue;
        if (c == '\n' || c == '\r') {
            line[n] = '\0';
            handle_cmd(line);
            n = 0;
        } else if (n < sizeof line - 1) {
            line[n++] = (char)c;
            SEGGER_RTT_PutChar(0, (char)c);    // echo
        }
    }
}
```

J-Link RTT Client는 up/down 채널 0만 지원하므로(4장), 채널을 여러 개 쓰는 셸이라면 Telnet 채널이나 OpenOCD `rtt server`를 채널별로 엽니다.

## 정리

- **Semihosting**은 `BKPT #0xAB`로 디버거에게 호스트 작업을 맡깁니다. 디버거가 없으면 HardFault가 나는 것을 QEMU에서 확인했습니다.
- **ITM/SWO**는 Armv7-M 이상의 CoreSight 경로이며, TRACECLKIN과 ACPR 분주비가 맞아야 받을 수 있습니다. M0/M0+에는 없습니다.
- **RTT**는 메모리 링 버퍼이고, 기본 모드 SKIP은 다 들어가지 않으면 통째로 버리고, TRIM은 잘라 쓰고, BLOCK은 호스트가 읽을 때까지 기다립니다. 세 동작 모두 QEMU에서 재현했습니다.
- V8.58.0의 `SEGGER_RTT_GetBytesInBuffer()`는 버퍼가 랩어라운드하면 잘못된 값을 돌려줬습니다.
- **ETM**은 명령 흐름 전체를 내보내지만 전용 캡처 장비가 필요합니다.
- 디버거 없이 돌아야 하는 빌드에는 UART나 non-blocking RTT를 씁니다.

## 다음 장 예고

Ch 7 — RTOS-aware 디버깅과 실전 트러블슈팅. FreeRTOS task별 상태, Cortex-M fault 분석, 스택 오버플로 검출을 QEMU에서 직접 일으켜 봅니다.

## 관련 항목

- [Ch 4: J-Link 도구 체인](/blog/tools/debugging/embedded/chapter04-jlink) — RTT Telnet 채널, J-Run
- [Ch 7: RTOS-aware + 트러블슈팅](/blog/tools/debugging/embedded/chapter07-rtos-troubleshooting)
- [Performance Engineering: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling) — DWT cycle counter·ITM으로 실행 시간을 재는 법
- [SEGGER RTT](https://kb.segger.com/RTT)
- [SEGGERMicro/RTT 소스](https://github.com/SEGGERMicro/RTT)
- [Arm Semihosting 명세](https://github.com/ARM-software/abi-aa/blob/2025Q4/semihosting/semihosting.rst)
- [Cortex-M4 Technical Reference Manual (DDI 0439B)](https://documentation-service.arm.com/static/5f19da2a20b7cf4bc524d99a) — ITM·TPIU
