---
title: "Ch 2: JTAG / SWD / CoreSight"
date: 2026-05-17T02:00:00
description: "TAP 상태 머신, SWD 패킷, ARM CoreSight (DAP/FPB/DWT/ITM/ETM) 회로 구조."
tags: [jtag, swd, coresight, arm, embedded]
series: "Embedded Debugging"
seriesOrder: 2
draft: false
---

RSP는 *위쪽 프로토콜*. 아래에서는 실제로 *전선 다섯 가닥*(JTAG) 또는 *두 가닥*(SWD)이 칩 안의 디버그 회로를 두드립니다. 이 장은 그 전기·논리 계층을 다룹니다 — TAP 상태 머신, SWD 패킷 형식, 그리고 *칩 안에 무엇이 들어 있나*의 표준인 ARM **CoreSight**.

한 번 이걸 이해하고 나면 `(gdb) break main`이 어떤 비트 시퀀스로 풀려 칩의 어떤 레지스터를 건드리는지 *전부* 추적할 수 있습니다.

## 왜 알아야 하나

- 프로브가 안 붙을 때(`init mode failed`, `target voltage 0.000V`) 어디가 끊겼는지 추적.
- 새 칩이 어떤 디버그 자원을 가졌는지(BP 개수, watchpoint 개수, ETM 유무) 파악.
- 자체 보드 설계 시 SWD/JTAG 핀 배치 결정.
- *칩 회사*의 디버그 매뉴얼을 읽을 수 있게 됩니다.

## JTAG — IEEE 1149.1

1990년 표준화. *원래* 목적은 PCB 제조 후 핀 솔더링 검증을 위한 *boundary scan* — 칩의 입력 핀에 패턴을 넣고 출력에서 받는 식. 디버그·플래시 프로그래밍은 *나중에* 흡수된 부가 기능.

### 핀

| 핀 | 방향 | 의미 |
|---|------|------|
| TCK | 입력 | 테스트 클럭 (디버거가 공급) |
| TMS | 입력 | 모드 선택 — TAP 상태 천이 결정 |
| TDI | 입력 | 데이터 입력 (시프트인) |
| TDO | 출력 | 데이터 출력 (시프트아웃) |
| TRST | 입력 | 비동기 리셋 (옵션) |

5핀 중 TRST는 옵션. 그래서 표 헤더에서는 종종 *4핀*이라고도 합니다 (TRST 생략 시 TAP-Reset state는 TMS=1을 5클럭 연속으로 두면 진입).

### TAP — Test Access Port

핵심은 16-상태 유한 상태 머신. TMS 값에 따라 천이.

![JTAG TAP 상태 머신](/images/blog/tools/diagrams/jtag-tap-state-machine.svg)

이 상태 머신에서 *명령 레지스터(IR)*와 *데이터 레지스터(DR)*를 *시프트*해서 칩의 디버그 자원을 조작합니다.

흐름 한 예 — IR에 `EXTEST` 명령(0x00)을 넣기.

```text
TMS 시퀀스: 1 1 1 1 1 0 1 1 0 0 0 0 1 1 0
            └ Reset 보장 ┘ │ │ │ │       │
                          │ │ │ │       └ Update-IR (값 반영)
                          │ │ │ └ Shift-IR (4번 비트 시프트)
                          │ │ └ Capture-IR
                          │ └ Select-IR-Scan
                          └ Run-Test/Idle
TDI 시퀀스:     ... 0 0 0 0 ...  ← IR에 0x00을 4비트 시프트
```

복잡해 보이지만 *디버거 펌웨어*가 알아서 합니다. 사용자는 신경 안 써도 됩니다 — 다만 *왜 5핀이 필요하고 어떤 신호가 어떤 역할인지*를 아는 것이 트러블슈팅에 결정적.

### IR 명령

| IR 코드 (예) | 명령 | 의미 |
|-------------|------|------|
| `0x00` | `EXTEST` | boundary scan: 외부 핀 제어 |
| `0x01` | `SAMPLE/PRELOAD` | 핀 상태 캡처 |
| `0x02` | `INTEST` | 내부 로직 테스트 |
| `0x0e` | `IDCODE` | 32-bit 칩 식별자 |
| `0x0f` | `BYPASS` | 1-bit 통과 (체인 우회) |
| 칩별 | `DEBUG` | 디버그 자원 접근 (ARM의 SCAN_N+INTEST 등) |

`IDCODE`가 매우 유용. 디버거가 *어떤 칩인지* 처음으로 알아내는 명령.

```text
JTAG ID code (32-bit):
[31:28] Version
[27:12] Part Number
[11:1]  Manufacturer ID (JEDEC)
[0]     Always 1

예: 0x4ba00477 = ARM Cortex-M4 (다양한 베리언트)
    0x06433041 = STM32F4 series
```

```bash
$ openocd -f openocd.cfg
Info : JTAG tap: stm32f4x.cpu tap/device found: 0x4ba00477
       (mfg: 0x23b (ARM Ltd), part: 0xba00, ver: 0x4)
```

`mfg: 0x23b`이 ARM, `part: 0xba00`이 Cortex-M의 표준 ID. 다른 IDCODE면 *prober가 다른 칩에 연결*된 것.

### Daisy chain

여러 칩을 한 JTAG 체인에 묶을 수 있습니다.

```text
TDI → [Chip A] → [Chip B] → [Chip C] → TDO
```

A와 C가 BYPASS면 A·C는 1-bit, B가 실제 명령. 디버거가 IR 명령 시퀀스를 *체인 전체 길이*로 보내야 하고, *내가 조작하는 칩이 몇 번째인지* 알아야 합니다.

```tcl
(openocd)
jtag newtap stm32f4x cpu -irlen 4 -expected-id 0x4ba00477
```

`-irlen 4`가 그 칩의 IR 길이. 잘못 적으면 시프트가 어긋나 모든 명령이 깨집니다.

체인 디버깅에서 자주 만나는 `Invalid ACK` 오류는 보통 *IR 길이가 틀린* 경우.

## SWD — Serial Wire Debug

ARM이 핀 수를 줄이기 위해 만든 *2핀* 대체. JTAG 5핀 → SWD 2핀(SWCLK/SWDIO) + 옵션 1핀(SWO).

| 핀 | 의미 |
|---|------|
| SWCLK | 클럭 (디버거 공급) |
| SWDIO | 양방향 데이터 (반이중) |
| SWO | (옵션) 1핀 trace 출력 |

같은 핀(SWCLK/SWDIO)이 *JTAG mode/SWD mode*로 양립합니다 — STM32 같은 칩은 처음에 JTAG 모드로 시작했다가 *어떤 패턴*을 받으면 SWD로 전환.

```text
JTAG → SWD 전환 시퀀스 (16-bit on SWDIO):
   0x79E7
```

SWD → JTAG도 비슷한 매직 시퀀스 존재.

### SWD 패킷 형식

JTAG의 상태 머신과 달리 *패킷 기반*.

![SWD 패킷 구조](/images/blog/tools/diagrams/swd-packet-format.svg)

- `APnDP` — Access Port(0)인가 Debug Port(1)인가?
- `RnW` — read(1) or write(0)?
- `A2..A3` — 4바이트 정렬 주소 비트.
- `Parity` — request의 APnDP+RnW+A2+A3 패리티.

### DP — Debug Port 레지스터

```text
A2 A3:
  00  IDCODE (read) / ABORT (write)
  01  CTRL/STAT  (control + status)
  10  SELECT     (어느 AP의 어느 뱅크?)
  11  RDBUFF (read) / 미사용 (write)
```

`SELECT`로 *어느 AP*에 접근할지 + 그 AP의 *어느 256바이트 뱅크*인지 지정. AP 안의 4바이트 레지스터 16개 = 64바이트 단위로 잡지만 ARM의 표준 AP는 4개 뱅크 = 256바이트.

### AP — Access Port 레지스터

AP 종류:

- **MEM-AP**(AHB-AP, AXI-AP, APB-AP) — 칩 내부 메모리 버스 접근. CPU와 같은 주소 공간으로 메모리·MMIO를 읽고 씁니다.
- **JTAG-AP** — JTAG 명령을 SWD로 터널링 (드물게 사용).

MEM-AP의 주요 레지스터:

| 오프셋 | 이름 | 역할 |
|--------|------|------|
| 0x00 | CSW (Control/Status Word) | 접근 크기, 자동 증분 |
| 0x04 | TAR (Transfer Address) | 다음 접근 주소 |
| 0x0c | DRW (Data R/W) | 데이터 |
| 0xfc | IDR | AP 식별자 |

SWD 패킷 한 단위로 *32비트만* 전송. 그러므로 *임의 주소의 한 워드*를 읽으려면:

1. DP-SELECT로 *AP*와 *뱅크* 선택.
2. AP-CSW로 *32-bit access* 설정 (보통 디버거가 이미 해 둠).
3. AP-TAR에 주소 쓰기.
4. AP-DRW 읽기 → 그 주소의 데이터.

총 *3-4 패킷*. 한 워드 읽기가 SWD 약 30-40 클럭. 4 MHz SWCLK에서 ~10µs.

연속 읽기는 CSW의 *AddrInc* 비트로 가속 — TAR을 한 번 쓰고 DRW를 연속 읽기, AP가 자동으로 주소 증분.

## SWO — Trace 출력

SWD의 3핀 (옵션). MCU에서 *UART처럼* trace 패킷을 송출. 디버거가 받아 PC로 전달.

baud는 *코어 클럭 / divider*. 일반적으로 2 MBaud. 디버거 펌웨어가 *코어 클럭*을 알아야 정확한 디코딩 가능 — 그래서 `tpiu config <core_clock_hz> <swo_baud>` 같은 명령으로 코어 클럭을 통보합니다.

```bash
(openocd telnet) tpiu config internal /tmp/swo.log uart off 168000000 2000000
```

코어 클럭이 *실제와 다르면* trace가 garbled. 흔한 함정.

## ARM CoreSight — 디버그 IP 묶음

JTAG/SWD가 *물리 인터페이스*라면 그 위에서 실제로 일하는 게 칩 안의 **CoreSight**입니다. ARM이 표준화한 디버그·trace IP 블록 카탈로그.

![ARM CoreSight 블록 구조](/images/blog/tools/diagrams/coresight-block.svg)

| 블록 | 메모리 위치 (Cortex-M) | 역할 |
|------|--------|------|
| DAP | (전용 SWD/JTAG 인터페이스) | 외부 ↔ 내부 버스 게이트웨이 |
| **SCS/SCB** | `0xE000ED00` 시작 | System Control Block — DHCSR 등 |
| **DWT** | `0xE0001000` | Data Watchpoint and Trace — 4 워치포인트, 사이클 카운터 |
| **FPB** | `0xE0002000` | Flash Patch and Breakpoint — 6 hardware BP |
| **ITM** | `0xE0000000` | Instrumentation Trace Macrocell — software trace |
| **TPIU** | `0xE0040000` | Trace Port Interface Unit — SWO 출력 |
| **ETM** | `0xE0041000` | Embedded Trace Macrocell — 명령 trace (옵션) |

모두 *메모리 매핑*. 즉 CPU도 이 레지스터를 *직접 쓸 수 있고*, 디버거도 SWD를 통해 같은 주소를 두드릴 수 있습니다. 디버거 ↔ CPU의 *경쟁* 가능 — 보통은 디버거가 CPU를 halt시킨 뒤 접근.

## SCB / DHCSR — halt 메커니즘

`break main`이 어떻게 일어나나? 답은 DHCSR(Debug Halting Control and Status Register, 주소 `0xE000EDF0`).

```text
DHCSR:
  [31:16] DBGKEY (= 0xA05F to write)
  [25]    S_RESET_ST  (reset since last read)
  [24]    S_RETIRE_ST (instruction retired)
  [19]    S_LOCKUP
  [18]    S_SLEEP
  [17]    S_HALT     ← 1이면 정지
  [16]    S_REGRDY
  [5:2]   reserved
  [3]     C_MASKINTS  (mask interrupts in halt)
  [2]     C_STEP
  [1]     C_HALT     ← 1로 쓰면 정지
  [0]     C_DEBUGEN  ← 1이면 디버그 가능
```

`break main`의 흐름.

1. 디버거가 FPB에 `main`의 주소를 기록 + 활성화.
2. CPU가 fetch 시 PC가 FPB와 일치 → core가 *debug state*로 천이.
3. 디버거가 DHCSR.S_HALT를 폴링하다 1이 되면 GDB에 stop 패킷 전송.
4. GDB가 `bt`/`print` 요청 → 디버거가 DCRSR(register select)로 레지스터를 한 개씩 끌어옴.
5. `continue` → DHCSR.C_HALT = 0 → CPU 재개.

`monitor halt`는 *외부에서* DHCSR.C_HALT = 1을 강제로 써서 CPU를 멈추는 것.

DHCSR을 직접 들여다보면 *왜 CPU가 안 멈추는지*를 디버깅할 수 있습니다.

```bash
(openocd) mdw 0xe000edf0
0xe000edf0: 00010003   ← S_HALT=1, C_DEBUGEN=1, C_HALT=1
```

### DCRSR / DCRDR — 레지스터 읽기

```text
DCRSR (0xE000EDF4):
  [16]    REGWnR — 1=write, 0=read
  [6:0]   REGSEL — 어느 레지스터 (0=R0, ..., 15=PC, 16=xPSR, ...)

DCRDR (0xE000EDF8): 데이터 워드
```

디버거가 R0 읽기:

1. DCRSR에 `0x00000000` (REGWnR=0, REGSEL=0) 쓰기.
2. DHCSR.S_REGRDY 폴링 (작업 완료).
3. DCRDR 읽기 → R0 값.

레지스터 16개를 모두 받으면 *17 패킷 왕복*. SWD에서 그래도 ~1ms 안에 끝.

## FPB — 브레이크포인트

Flash Patch and Breakpoint Unit. 6개의 *주소 비교기*(comparator) + 2개의 *literal*. 비교기에 주소를 넣고 활성화하면 CPU fetch가 그 주소에 도달했을 때 halt.

```text
FP_COMP0 (0xE0002008):
  [31:30] REPLACE — 00=BP, 01/10/11=instruction patch
  [28:2]  COMP — 비교 주소 (4바이트 정렬, 비트 0 무시)
  [0]     ENABLE
```

GDB의 `break main` → 디버거가 FPB에 `&main`을 기록 + ENABLE.

```bash
(openocd) mdw 0xe0002000 8
0xe0002000: 00000010 ...     ← FP_CTRL: NUM_CODE=2, NUM_LIT=0
0xe0002008: 08000125 ...     ← FP_COMP0: BP at 0x08000124+1 (Thumb)
```

Cortex-M0/M0+는 보통 4개, M3/M4/M7은 6개, M33+은 8개. *flash patch*는 별도 라이센스 + 칩 옵션.

### Software vs Hardware BP

`Z0` (sw): 명령어 한 바이트를 `BKPT #0` (Thumb: 0xBExx)로 갈아 끼우고 원래 명령은 별도 저장. *개수 무제한*이지만 *flash엔 못 씀*.

`Z1` (hw): FPB 비교기 1개 소모. *flash·ROM에서 동작*하지만 *유한*.

GDB는 보통 `Z0`을 먼저 시도하고, *flash 영역*이면 `Z1`로 폴백.

J-Link의 *Unlimited Flash Breakpoints*는 7번째 BP부터 *flash 페이지 패치*로 흉내냅니다.

## DWT — 워치포인트와 카운터

```text
DWT_CTRL (0xE0001000):
  [31:28] NUMCOMP — 비교기 개수 (보통 4)
  [24]    CYCEVTENA
  ...
  [0]     CYCCNTENA  ← 사이클 카운터 활성화

DWT_CYCCNT (0xE0001004): 32-bit 사이클 카운터
DWT_COMP0 (0xE0001020): 비교 주소
DWT_MASK0 (0xE0001024): 비트 마스크
DWT_FUNCTION0 (0xE0001028): 동작 (read/write/access)
```

GDB의 `watch *my_var` → DWT 비교기 한 개 소모. 4개 한도.

사이클 카운터는 µs 측정에 매우 유용.

```c
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
uint32_t start = DWT->CYCCNT;
do_work();
uint32_t cycles = DWT->CYCCNT - start;
// us = cycles / (CoreClock_MHz)
```

168 MHz 코어에서 168 cycles = 1 µs.

DWT는 *exception trace*도 지원 — 어떤 ISR이 언제 들어오고 나갔는지 SWO로 송출. OS-aware 디버깅의 핵심.

## ITM — Software Trace

ITM은 32개의 *stim port*. 워드를 쓰면 SWO/TRACE 핀으로 trace 패킷 송출.

```c
#define ITM_PORT_U32(n)  (*((volatile uint32_t *)(0xE0000000 + 4*(n))))
#define ITM_PORT_U8(n)   (*((volatile uint8_t  *)(0xE0000000 + 4*(n))))
#define ITM_TER          (*((volatile uint32_t *)(0xE0000E00)))   // Trace Enable
#define ITM_TCR          (*((volatile uint32_t *)(0xE0000E80)))   // Trace Control

void itm_putchar(char c) {
    if (!(ITM_TCR & 1)) return;        // ITM disabled
    if (!(ITM_TER & 1)) return;        // port 0 disabled
    while ((ITM_PORT_U32(0) & 1) == 0); // wait FIFO
    ITM_PORT_U8(0) = c;
}
```

OpenOCD/J-Link가 SWO trace를 받아 *stim port 0*을 stdout처럼 디코딩.

```bash
(openocd) tpiu config internal /tmp/swo.log uart off 168000000 2000000
(openocd) itm port 0 on
```

168 MHz 코어 / 2 MBaud SWO. 코어 클럭이 안 맞으면 깨진 글자.

## ETM — 명령 단위 Trace

ETM(Embedded Trace Macrocell)이 있으면 CPU의 *모든 명령어 실행*이 trace됩니다. 일반 4-5 핀 *parallel TRACE* 인터페이스 또는 *ETB*(Embedded Trace Buffer, 칩 안 RAM에 저장).

SEGGER J-Trace, Lauterbach TRACE32 같은 고가 도구가 받습니다.

쓰임:

- 비결정적 버그의 *완전한 이전 시퀀스* 재구성 (rr의 베어메탈 버전).
- 인터럽트 latency 측정.
- 캐시 hit/miss 통계.

Cortex-M7/M33은 ETM-M4 옵션 탑재. 모든 칩에 있는 건 아닙니다. *opdata*: M0/M0+는 ETM 없음, M3/M4는 옵션, M7은 보통 탑재.

## CTI — Cross Trigger Interface

멀티 코어 칩(예: Cortex-A + Cortex-M)에서 한 코어의 halt를 *다른 코어에 신호*로 전달. *동기 멈춤*에 사용. 자체 보드 디버깅 시 직접 만질 일은 거의 없지만 SoC 디버깅에서 가끔 등장.

## 신호 무결성 — 실전

이론과 별개로 *전기적 문제*가 디버깅을 망치는 일이 잦습니다.

### 길이

SWD/JTAG 케이블이 *너무 길면* (>15cm) capacitance가 증가해 고속 SWCLK가 망가집니다. `adapter speed 4000` (4 MHz)이 잘 안 되면 `1000` (1 MHz)부터 시도.

### 풀업

대부분의 칩은 SWDIO에 *내부 풀업*이 있지만 일부는 외부 풀업(~10kΩ)이 필요. 이게 없으면 reset 직후 floating.

### Vref

JTAG 커넥터에 *Vref* 핀이 있어 디버거가 *타깃 전압*을 감지합니다. 1.65V~3.3V 자동 적응. Vref가 *0V*면 (`Target voltage: 0.000V`) 다음 중 하나:

- 타깃 전원 안 들어옴.
- Vref 핀 미연결.
- 타깃 ↔ 디버거 GND 미연결.

### RESET

JTAG 커넥터의 nRESET (SRST)이 *적극적*으로 토글되어야 *원치 않게 펌웨어가 디버거 통신을 무력화한 경우*에도 정상 진입 가능. OpenOCD의 `reset_config srst_only srst_nogate`가 자주 도움.

```tcl
(openocd config)
reset_config srst_only srst_nogate connect_assert_srst
```

### 디커플링

칩 가까이 100nF 디커플링 캡이 없으면 디버그 자체 트랜잭션이 일으키는 *순간 전류*가 칩에 노이즈를 줘 SWD가 자꾸 끊깁니다. 자체 보드면 *항상* 0.1µF 디커플링 + 10µF 벌크.

## 프로브 종류

| 프로브 | 인터페이스 | 가격 | 비고 |
|--------|------------|------|------|
| ST-Link/V2 | SWD/JTAG | 매우 저렴 (보드 내장) | STM32에 묶임 |
| ST-Link/V3 | SWD/JTAG, VCOM, MSC | 저렴 | 더 빠름, VCP 유용 |
| CMSIS-DAP / DAPLink | SWD/JTAG (CMSIS-DAP) | 저렴 | ARM 표준 |
| J-Link EDU mini | SWD/JTAG | 저렴 (비상업용) | 가성비 |
| J-Link BASE/PLUS | SWD/JTAG | 비쌈 | 상용·산업 |
| J-Trace | SWD/JTAG + ETM | 매우 비쌈 | 명령 trace |
| Black Magic Probe | SWD/JTAG | 중간 | 내장 gdbserver (호스트 OS 없이 직접) |
| FT2232 + breakout | SWD/JTAG | 매우 저렴 | 범용 |

CMSIS-DAP가 *표준* — 같은 펌웨어가 거의 모든 보드의 디버그 인터페이스에 호환. 새 칩 → CMSIS-DAP 검증 → 그 다음 다른 프로브 시도.

## 정리

- JTAG = 5핀 + TAP 16-상태 FSM. boundary scan에서 디버그까지.
- SWD = 2핀 패킷 기반 (ARM 전용).
- DP·AP·MEM-AP가 SWD/JTAG → 내부 버스 게이트웨이.
- CoreSight = DAP + FPB(BP) + DWT(WP/cycle) + ITM(printf trace) + ETM(명령 trace) + TPIU(출력).
- DHCSR이 halt 메커니즘의 핵심 레지스터.
- FPB가 hardware BP를 제공 (M3/M4=6, M0=4).
- DWT가 watchpoint + cycle counter.
- ITM/SWO가 가벼운 trace, ETM이 완전 trace.
- 신호 무결성(케이블 길이·디커플링·Vref·SRST)이 트러블슈팅의 80%.

## 다음 장 예고

Ch 3 — OpenOCD 깊이. TCL 인터프리터, flash driver, target 정의 파일, custom 명령 작성.

## 관련 항목

- [Ch 1: RSP 프로토콜](/blog/tools/debugging/embedded/chapter01-rsp-protocol) — 위쪽 계층
- [Ch 3: OpenOCD 깊이](/blog/tools/debugging/embedded/chapter03-openocd)
- [ARMv7-M Architecture Reference Manual](https://developer.arm.com/documentation/ddi0403/latest/) — CoreSight 정의
- [ARM Debug Interface Architecture v5](https://developer.arm.com/documentation/ihi0031/latest/) — DAP 명세
- [CMSIS-DAP](https://arm-software.github.io/CMSIS_5/DAP/html/index.html)
- [Black Magic Probe](https://black-magic.org/)
