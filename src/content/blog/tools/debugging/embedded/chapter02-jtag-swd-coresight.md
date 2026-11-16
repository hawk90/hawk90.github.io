---
title: "JTAG·SWD·CoreSight 분석 — ARM 디버그 인터페이스 비교"
slug: "tools/debugging/embedded/chapter02-jtag-swd-coresight"
date: 2026-05-26T09:02:00
description: "TAP 상태 머신, SWD 패킷, ARM CoreSight (DAP/FPB/DWT/ITM/ETM) 회로 구조."
tags: [jtag, swd, coresight, arm, embedded]
series: "Embedded Debugging"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

RSP는 *위쪽 프로토콜*입니다. 그 아래에서는 실제로 전선 네다섯 가닥(JTAG) 또는 두 가닥(SWD)이 칩 안의 디버그 회로를 두드립니다. 이 장은 그 논리 계층을 다룹니다. TAP 상태 머신, SWD 패킷 형식, 그리고 칩 안에 무엇이 들어 있는지를 정한 ARM **CoreSight** 블록입니다.

이걸 이해하고 나면 1장에서 본 `Z1,8000128,2` 한 줄이 어떤 레지스터 쓰기로 바뀌는지 따라갈 수 있습니다.

## 이 장의 근거

이 장은 하드웨어 프로브와 보드 없이 썼습니다. 그래서 수치와 비트 배치는 모두 1차 문서에서 가져왔고, 직접 돌린 것은 QEMU에서 읽은 레지스터 값과 작은 디코딩 검사뿐입니다.

| 근거 | 쓴 곳 |
|------|-------|
| Arm IHI 0031G, *Arm Debug Interface Architecture Specification ADIv5.0 to ADIv5.2* | JTAG-DP·SW-DP·DP 레지스터·MEM-AP·SWJ 전환 |
| Arm DDI 0439B, *Cortex-M4 Technical Reference Manual* (r0p0) | FPB·DWT 비교기 수, ROM table 주소 |
| CMSIS 5.9.0 `core_cm4.h` | 레지스터 주소와 비트 위치 |
| OpenOCD 소스(2026-11 main)와 `doc/openocd.texi` | 로그 형식·명령 문법 |
| QEMU 11.1.3 `netduinoplus2` + GDB 16.3 | 에뮬레이터가 무엇을 흉내 내지 *않는지* |

## 왜 알아야 하나

- 프로브가 붙지 않을 때 어느 계층에서 끊겼는지 나눌 수 있습니다. IDCODE가 안 읽히는지, DP는 되는데 AP 접근이 실패하는지, 코어 halt만 안 되는지가 서로 다른 문제입니다.
- 새 칩이 어떤 디버그 자원(BP·watchpoint 개수, ETM 유무)을 가졌는지 레지스터로 직접 확인할 수 있습니다.
- 칩 벤더의 디버그 장(章)과 Arm 명세를 읽을 수 있게 됩니다.

## JTAG — IEEE 1149.1

JTAG의 표준 이름은 IEEE 1149.1 *Standard Test Access Port and Boundary Scan Architecture*입니다(ADIv5 참고 문헌 목록의 표기). 이름 그대로 boundary scan을 위한 TAP 구조이고, ADIv5 B3장은 Arm JTAG-DP가 이 IEEE 1149.1 TAP을 바탕으로 한다고 적습니다.

### 핀

ADIv5 B3.2(Table B3-1)가 정한 JTAG-DP 신호입니다.

| 핀 | 방향 | 의미 |
|---|------|------|
| TCK | 입력 | 테스트 클럭 (디버거가 공급) |
| TMS | 입력 | 모드 선택, TAP 상태 천이 결정 |
| TDI | 입력 | 데이터 입력 |
| TDO | 출력 | 데이터 출력 |
| TRST | 입력, *Optional* | TAP 비동기 리셋 |

TRST가 없어도 리셋은 됩니다. ADIv5 B3.2.3은 *TMS를 HIGH로 둔 채 TCK 다섯 사이클*이면 어느 상태에서든 Test-Logic-Reset으로 간다고 정합니다. 그래서 TRST 없는 4선 JTAG가 흔합니다.

### TAP — Test Access Port

TAP의 핵심은 TMS 값으로 천이하는 상태 머신입니다.

![JTAG TAP 상태 머신](/images/blog/tools/diagrams/jtag-tap-state-machine.svg)

이 상태 머신에서 *명령 레지스터(IR)*와 *데이터 레지스터(DR)*를 시프트해 디버그 자원을 조작합니다. 아래 그림은 리셋 후 4비트 IR에 값을 시프트하는 TMS 순서입니다. 예시 값 0b0000은 ADIv5 Table B3-4가 boundary scan TAP의 EXTEST로 권장하는 인코딩입니다.

![JTAG TAP TMS 시퀀스: TMS=1 다섯 번으로 Reset, Run-Test/Idle에서 Select-DR-Scan·Select-IR-Scan·Capture-IR를 거쳐 Shift-IR에서 TDI 4비트를 시프트하고 Exit1-IR·Update-IR 뒤 Run-Test/Idle로 복귀](/images/blog/debugging/embedded/diagrams/ch02-jtag-tap-sequence.svg)

이 순서는 프로브 펌웨어가 만들어 냅니다. 다만 어느 핀이 어느 역할인지 알아야 오실로스코프 파형이나 로그를 읽을 수 있습니다.

### IR 명령 — Arm JTAG-DP

Arm JTAG-DP의 IR 명령은 ADIv5 Table B3-3에 있습니다. 디버그는 *DPACC/APACC* 두 명령으로 DP와 AP 레지스터에 접근하는 방식입니다.

| 4비트 IR | 명령 | DR 길이 | 용도 |
|---------|------|--------|------|
| `0b1000` | ABORT | 35 | 진행 중인 AP 트랜잭션 중단 |
| `0b1010` | DPACC | 35 | DP 레지스터 접근 |
| `0b1011` | APACC | 35 | AP 레지스터 접근 |
| `0b1110` | IDCODE | 32 | TAP 식별 |
| `0b1111` | BYPASS | 1 | 체인 우회 |
| `0b0xxx` | IMPLEMENTATION DEFINED | — | boundary scan 등 (Table B3-4) |

구현하지 않은 IR 값은 BYPASS를 선택합니다. Test-Logic-Reset 상태에서는 IDCODE가 현재 명령이 되므로, 디버거는 리셋 직후 DR을 시프트하는 것만으로 IDCODE를 읽을 수 있습니다(B3.4.4).

IDCODE 형식도 B3.4.4가 정합니다.

| 비트 | 필드 | 의미 |
|------|------|------|
| [31:28] | VERSION | 구현 정의 |
| [27:12] | PARTNO | DP TAP 부품 번호 |
| [11:1] | DESIGNER | JEP106 제조사 코드, Arm은 0x23B |
| [0] | — | 항상 1 |

OpenOCD는 스캔한 IDCODE를 이 필드로 쪼개 찍습니다. `src/jtag/core.c`의 형식 문자열은 `"JTAG tap: %s %16.16s: 0x%08x (mfg: 0x%3.3x (%s), part: 0x%4.4x, ver: 0x%1.1x)"`입니다. OpenOCD의 `tcl/target/stm32f4x.cfg`는 STM32F4의 JTAG 모드 CPU TAP 기대값으로 `0x4ba00477`(SWD 모드는 `0x2ba01477`)을 적고, 주석으로 "RM0090 38.6.3, Cortex-M4 r0p1"을 출처로 남겼습니다. 0x4ba00477을 위 표로 나누면 VERSION 0x4, PARTNO 0xBA00, DESIGNER 0x23B입니다. 이 값은 *Arm JTAG-DP*의 ID이지 STM32 칩 자체의 ID가 아닙니다. 그래서 같은 cfg는 JTAG 모드에서 boundary scan TAP(`bs`, `-irlen 5`)을 따로 선언합니다.

### Daisy chain

여러 TAP을 한 체인에 묶으면 TDI에서 TDO까지 IR이 이어 붙습니다. 디버거는 체인 전체의 IR 길이 합을 알아야 원하는 TAP에 명령을 넣을 수 있고, 나머지 TAP은 BYPASS(1비트)로 둡니다. OpenOCD에서는 TAP마다 IR 길이를 선언합니다.

```tcl
swj_newdap $_CHIPNAME cpu -irlen 4 -ircapture 0x1 -irmask 0xf -expected-id $_CPUTAPID
jtag newtap $_CHIPNAME bs -irlen 5
```

위 두 줄은 `stm32f4x.cfg`에서 그대로 옮긴 것입니다. `-irlen`이 실제와 다르면 IR 시프트가 어긋납니다. OpenOCD JTAG-DP 코드(`src/target/adi_v5_jtag.c`)에는 이럴 때 볼 수 있는 `Invalid ACK (%1x) in DAP response` 오류가 있지만, 이 메시지는 DAP 응답의 ACK가 기대값이 아니라는 뜻일 뿐 원인을 IR 길이로 특정하지는 않습니다.

## SWD — Serial Wire Debug

SWD는 Arm이 정의한 2선 디버그 프로토콜입니다. SWCLK와 양방향 SWDIO를 쓰고, trace용 SWO는 별도 핀입니다. SWJ-DP는 JTAG와 SWD 핀을 공유하며(TMS↔SWDIO, TCK↔SWCLK), ADIv5는 SWD 동작 중 TDI·TDO·nTRST 핀을 다른 용도로 쓸 수 있다고 적고 있습니다.

### JTAG → SWD 전환

ADIv5 B5.2.2가 정한 전환 순서는 세 단계입니다.

1. SWDIOTMS를 HIGH로 두고 SWCLKTCK를 50사이클 이상 보냅니다(JTAG를 Test-Logic-Reset으로).
2. 16비트 JTAG-to-SWD 선택 시퀀스를 보냅니다.
3. 다시 HIGH로 50사이클 이상 보냅니다(SWD line reset).

선택 시퀀스는 MSB-first로 `0b0111 1001 1110 0111`이고, 명세는 이를 *MSB first로 보내는 0x79E7* 또는 *LSB first로 보내는 0xE79E*로 표기할 수 있다고 적습니다. [CMSIS-DAP의 DAP_SWJ_Sequence](https://arm-software.github.io/CMSIS-DAP/latest/group__DAP__SWJ__Sequence.html) 명령은 문서에 "LSB is transmitted first"라고 적혀 있으므로 0xE79E 표기를 씁니다.

### SWD 패킷 형식

SWD는 JTAG의 상태 머신 대신 *패킷*을 씁니다.

![SWD 패킷 구조](/images/blog/tools/diagrams/swd-packet-format.svg)

- `Start` — 항상 1.
- `APnDP` — AP 접근(1)인지 DP 접근(0)인지.
- `RnW` — 읽기(1) 또는 쓰기(0).
- `A[2:3]` — 레지스터 주소 비트 2·3.
- `Parity` — APnDP·RnW·A[2:3]의 패리티.
- `Stop`(0), `Park`(1) 뒤 turnaround를 거쳐 타깃이 3비트 ACK를 보냅니다.

ACK는 OK `0b001`, WAIT `0b010`, FAULT `0b100`입니다. 명세는 OK 응답이 와이어 위에서 *1, 0, 0 순서*로 나타난다고 적습니다(B4.1.5 Bit order). 그림의 표기는 비트 값 순서이고, 실제 전송은 LSB부터라는 점을 같이 봐야 로직 분석기 캡처와 맞습니다.

### DP — Debug Port 레지스터

DPv1의 주소 맵은 ADIv5 B2.1(Table B2-4)에 있습니다.

| A[3:2] | 읽기 | 쓰기 |
|--------|------|------|
| `0x0` | DPIDR | ABORT (SW-DP) |
| `0x4` | CTRL/STAT (DPBANKSEL=0) | CTRL/STAT |
| `0x8` | RESEND (SW-DP) | SELECT |
| `0xC` | RDBUFF | — |

SELECT는 어느 AP의 어느 뱅크를 볼지 정합니다. ADIv5 B2.2.9 기준으로 APSEL이 [31:24], APBANKSEL이 [7:4]입니다. SWD 요청의 A[3:2]는 뱅크 안 네 개의 32비트 레지스터 중 하나를 고르므로, 뱅크 하나는 16바이트입니다. ADIv6는 AP 주소 모델이 다르므로 이 규칙을 그대로 적용하지 않습니다.

### AP — Access Port

AP 가운데 디버그에서 가장 많이 쓰는 것은 **MEM-AP**입니다. MEM-AP는 칩 내부 버스에 마스터로 붙어, CPU와 같은 주소 공간의 메모리와 MMIO를 읽고 씁니다. Cortex-M4 TRM 8.2가 다루는 AHB-AP가 그 예입니다.

| 오프셋 | 이름 | 역할 |
|--------|------|------|
| 0x00 | CSW | 접근 크기, 자동 증가 |
| 0x04 | TAR | 접근할 주소 |
| 0x0C | DRW | 데이터 |
| 0xFC | IDR | AP 식별자 |

임의 주소의 한 워드를 읽는 순서는 다음과 같습니다.

1. DP SELECT로 AP와 뱅크를 고릅니다.
2. CSW로 32비트 접근을 설정합니다.
3. TAR에 주소를 씁니다.
4. DRW를 읽습니다.

여기서 함정이 하나 있습니다. ADIv5는 SW-DP에서 *AP 읽기가 posted*라서 결과가 *다음 전송*에서 돌아온다고 정합니다(B4.2). 그래서 마지막 DRW 값은 다음 AP 읽기 응답이나 DP RDBUFF 읽기로 회수합니다. 이 왕복 하나하나가 request 8비트, turnaround, ACK 3비트, 데이터 32비트와 패리티로 이뤄지므로, 디버거의 메모리 읽기가 왜 버스 속도보다 훨씬 느린지가 여기서 보입니다.

연속 주소를 읽을 때는 CSW의 AddrInc를 켜서 TAR를 한 번만 쓰고 DRW를 반복해 읽습니다.

## SWO — Trace 출력

SWO는 칩이 trace 패킷을 UART나 Manchester 방식으로 내보내는 한 선짜리 출력입니다. Cortex-M4에서는 TPIU가 이 출력을 맡습니다. TPIU의 ACPR 레지스터는 PRESCALER[12:0] 필드를 갖고, TRM은 "TRACECLKIN의 분주비는 Prescaler + 1"이라고 적습니다. 따라서 SWO 비트율은 TRACECLKIN을 (PRESCALER + 1)로 나눈 값이고, 받는 쪽이 이 비트율을 맞추려면 TRACECLKIN 주파수를 알아야 합니다.

OpenOCD 0.12 이후에는 `tpiu create`·`<이름> configure`·`<이름> enable`이 정식 명령이고, 예전 `tpiu config`는 `DEPRECATED 'tpiu config' command:` 메시지를 남기며 새 명령으로 변환됩니다(`src/target/arm_tpiu_swo.c`). OpenOCD 매뉴얼의 STM32L152 예는 다음과 같습니다.

```bash
openocd -f interface/stlink.cfg \
-c "transport select swd" \
-f target/stm32l1.cfg \
-c "stm32l1.tpiu configure -protocol uart" \
-c "stm32l1.tpiu configure -traceclk 24000000 -pin-freq 12000000" \
-c "stm32l1.tpiu enable"
```

매뉴얼은 `-traceclk`가 필수이며 Cortex-M3/M4 내장 TPIU에서는 보통 HCLK와 같다고 설명하고, `-pin-freq`를 생략하면 어댑터 드라이버가 지원하는 최대 속도를 고른다고 적습니다. `-traceclk`가 실제 클럭과 다르면 수신 쪽 비트율이 어긋나 trace가 깨집니다.

## ARM CoreSight — 디버그 IP 묶음

JTAG/SWD가 *물리 인터페이스*라면, 그 위에서 실제로 일하는 것이 칩 안의 CoreSight 컴포넌트입니다.

![ARM CoreSight 블록 구조](/images/blog/tools/diagrams/coresight-block.svg)

Cortex-M4에서 각 블록의 주소는 다음과 같습니다. 주소는 CMSIS `core_cm4.h`의 `*_BASE` 정의와 Cortex-M4 TRM Table 8-2(ROM table)에서 가져왔습니다.

| 블록 | 주소 (Cortex-M4) | 역할 |
|------|--------|------|
| SCB | `0xE000ED00` | System Control Block |
| CoreDebug (DHCSR 등) | `0xE000EDF0` | halt·step·레지스터 접근 |
| DWT | `0xE0001000` | watchpoint 비교기, 사이클 카운터 |
| FPB | `0xE0002000` | 하드웨어 BP 비교기 |
| ITM | `0xE0000000` | 소프트웨어 trace (stimulus port) |
| TPIU | `0xE0040000` | SWO / trace port 출력 |
| ETM | `0xE0041000` | 명령 trace (구현 선택) |

TRM은 ROM table 항목이 구현에 따라 달라진다고 적습니다. 예를 들어 TPIU가 없으면 해당 항목이 `0xFFF41002`, ETM이 없으면 `0xFFF42002`로 읽혀 "없음"을 알립니다. 디버거는 이 ROM table을 따라가며 무엇이 있는지 확인합니다.

모두 메모리 매핑 레지스터이므로 CPU 자신도, 디버거도(MEM-AP를 통해) 같은 주소를 읽고 씁니다.

### QEMU는 이 회로를 흉내 내지 않는다

QEMU `netduinoplus2`(Cortex-M4)를 `-s -S`로 띄워 GDB로 이 주소들을 읽어 보면 결과가 분명합니다.

```text
0xe000ed00:	0x410fc240
0xe000edf0:	0x00000000
0xe0001000:	0x00000000
0xe0002000:	0x00000000
0xe0000e80:	0x00000000
0xe00ff000:	0x00000000
```

CPUID(`0xE000ED00`)는 `0x410fc240`, 즉 Arm(0x41) Cortex-M4(PARTNO 0xC24) r0p0으로 정상입니다. 그런데 GDB가 코어를 멈춰 둔 상태인데도 DHCSR이 0입니다. QEMU의 gdbstub은 에뮬레이터 바깥에서 실행을 멈추므로 CoreSight halt 상태가 생기지 않고, DWT·FPB·ITM·ROM table도 0으로 읽혔습니다. 1장에서 `Z1`이 통했던 것도 FPB가 아니라 QEMU 내부 기능 덕분입니다. 이 장의 레지스터 동작을 실제로 보려면 실물 보드와 프로브가 필요합니다.

## DHCSR — halt 메커니즘

`break main`이 실제 칩에서 어떻게 멈추는지의 중심에 DHCSR(Debug Halting Control and Status Register, `0xE000EDF0`)이 있습니다. 비트 위치는 CMSIS `core_cm4.h`의 `CoreDebug_DHCSR_*_Pos` 정의 그대로입니다.

| 비트 | 이름 | 의미 |
|------|------|------|
| [31:16] (쓰기) | DBGKEY | 쓰기 키 |
| [25] | S_RESET_ST | 마지막 읽기 이후 리셋이 있었음 |
| [24] | S_RETIRE_ST | 명령이 완료됨 |
| [19] | S_LOCKUP | lockup 상태 |
| [18] | S_SLEEP | sleep 상태 |
| [17] | S_HALT | 코어가 halt 상태 |
| [16] | S_REGRDY | DCRSR 레지스터 전송 완료 |
| [5] | C_SNAPSTALL | 정지된 버스 접근 끊기 |
| [3] | C_MASKINTS | step 중 인터럽트 마스크 |
| [2] | C_STEP | single step |
| [1] | C_HALT | 1을 쓰면 halt 요청 |
| [0] | C_DEBUGEN | halting debug 활성화 |

CMSIS는 DBGKEY를 [31:16]의 쓰기 필드로 정의하고, 같은 자리의 S_ 상태 비트는 읽을 때 나옵니다. 쓰기 키 값은 이 장에서 1차 문서로 확인하지 못해 적지 않았습니다.

실제 칩에서 `break`가 동작하는 흐름은 다음과 같습니다.

1. 스텁(OpenOCD 등)이 FPB 비교기에 주소를 쓰고 켭니다.
2. CPU가 그 주소의 명령을 가져오면 FPB가 BKPT를 돌려주고, 코어가 debug state로 들어갑니다.
3. 스텁이 DHCSR.S_HALT를 폴링하다 1이 되면 GDB에 stop reply를 보냅니다.
4. GDB가 레지스터를 요청하면 스텁이 DCRSR/DCRDR로 하나씩 읽습니다.
5. `continue`면 스텁이 DHCSR.C_HALT를 0으로 씁니다.

### DCRSR / DCRDR — 레지스터 읽기

DCRSR(`0xE000EDF4`)은 REGWnR이 비트 16, REGSEL이 [4:0]입니다(CMSIS `CoreDebug_DCRSR_REGSEL_Msk`가 `0x1F`). DCRDR(`0xE000EDF8`)이 데이터 레지스터입니다. R0 하나를 읽는 순서는 다음과 같습니다.

1. DCRSR에 REGWnR=0, REGSEL=0을 씁니다.
2. DHCSR.S_REGRDY가 1이 될 때까지 폴링합니다.
3. DCRDR을 읽습니다.

레지스터마다 이 세 단계가 필요하고, 각 단계가 다시 앞의 MEM-AP 접근 여러 번으로 이뤄집니다. 1장에서 GDB가 정지할 때마다 `g` 한 번을 보낸 것이 실제 칩에서는 이 왕복 수십 번이 됩니다.

## FPB — 브레이크포인트

Cortex-M4 TRM 8.3은 FPB를 두 구성으로 정의합니다.

- **Full FPB** — literal 비교기 2개 + 명령 비교기 6개. 명령 비교기는 매치 시 BKPT를 돌려주도록 설정해 하드웨어 BP로 씁니다.
- **Reduced FPB** — 명령 비교기 2개. flash patch는 지원하지 않습니다.

즉 Cortex-M4의 하드웨어 BP는 *구현에 따라 6개 또는 2개*입니다. Cortex-M7 TRM(DDI 0489D) 9.3은 FPB를 *4개 또는 8개* 명령 비교기로 구성할 수 있고 flash patch를 지원하지 않는다고 적습니다. 코어 이름만으로 개수를 단정하지 말고, 붙은 칩에서 FP_CTRL의 NUM_CODE 필드를 읽어 확인해야 합니다. OpenOCD도 examine 단계에서 이 값을 읽어 비교기 수를 정하고, 다 쓰면 1장에서 본 `Can not find free FPB Comparator!` 오류를 냅니다.

FPB 레지스터는 FP_CTRL(`0xE0002000`), FP_REMAP(`0xE0002004`), FP_COMP0(`0xE0002008`)부터 이어지는 비교기 레지스터입니다(TRM Table 8-7). TRM은 구현하지 않은 레지스터는 0으로 읽힌다고 적습니다.

### Software vs Hardware BP

`Z0`(소프트웨어 BP)은 명령을 BKPT로 바꿔 씁니다. GDB 16.3 `arm-tdep.c`의 Thumb BP 바이트는 `{0xbe,0xbe}`이고, 1장 로그처럼 원래 명령을 미리 읽어 두었다가 정지하면 되돌립니다. RAM에서는 일반 메모리 쓰기로 충분하지만 flash에서는 그렇게 쓸 수 없습니다.

`Z1`(하드웨어 BP)은 FPB 비교기 하나를 씁니다. flash·ROM에서도 동작하지만 개수가 위처럼 제한됩니다.

GDB는 어느 쪽을 쓸지 memory map으로 정합니다. GDB 매뉴얼 [Setting Breakpoints](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Set-Breaks.html)는 `set breakpoint auto-hw on`이 기본이며, 이때 GDB가 *타깃 memory map을 보고* 소프트웨어·하드웨어 BP를 고른다고 적습니다. 스텁이 memory map에서 flash를 알려 주면 그 영역의 `break`는 하드웨어 BP가 됩니다. `hbreak`는 항상 하드웨어 BP입니다.

## DWT — 워치포인트와 카운터

Cortex-M4 TRM은 watchpoint 유닛을 *1개 또는 4개* 비교기로 구성한다고 적습니다(8.1). 개수는 DWT_CTRL의 NUMCOMP[31:28]에 있습니다. CMSIS `core_cm4.h` 기준 주요 비트는 다음과 같습니다.

| 레지스터 / 비트 | 의미 |
|------|------|
| `DWT_CTRL` [31:28] NUMCOMP | 비교기 수 |
| `DWT_CTRL` [22] CYCEVTENA | 사이클 카운터 이벤트 |
| `DWT_CTRL` [0] CYCCNTENA | 사이클 카운터 켜기 |
| `DWT_CYCCNT` (`0xE0001004`) | 32비트 사이클 카운터 |
| `DWT_COMP0` / `MASK0` / `FUNCTION0` (`0xE0001020`~) | 비교 주소·마스크·동작 |

GDB의 `watch` 하나가 비교기 하나를 씁니다. 1장 QEMU 세션의 `Z2,20000000,4`가 실제 칩이라면 이 비교기 설정이 됩니다.

사이클 카운터로 구간 시간을 재는 코드는 다음과 같습니다. `DEMCR.TRCENA`(비트 24)를 먼저 켜야 DWT가 동작합니다.

```c
CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
uint32_t start = DWT->CYCCNT;
do_work();
uint32_t cycles = DWT->CYCCNT - start;   // 32비트 랩어라운드도 뺄셈으로 처리됨
// us = cycles / (코어 클럭 MHz)
```

예를 들어 168 MHz 코어라면 168 사이클이 1 µs입니다.

## ITM — Software Trace

ITM은 stimulus port 레지스터에 쓴 값을 trace 패킷으로 내보냅니다. 포트 레지스터를 읽으면 비트 0이 FIFO가 받을 준비가 됐는지(FIFOREADY)를 알려 줍니다. 아래 코드는 포트 0으로 한 글자를 보내는 최소 구현입니다.

```c
#define ITM_PORT_U32(n)  (*((volatile uint32_t *)(0xE0000000 + 4*(n))))
#define ITM_PORT_U8(n)   (*((volatile uint8_t  *)(0xE0000000 + 4*(n))))
#define ITM_TER          (*((volatile uint32_t *)(0xE0000E00)))   // Trace Enable
#define ITM_TCR          (*((volatile uint32_t *)(0xE0000E80)))   // Trace Control

void itm_putchar(char c) {
    if (!(ITM_TCR & 1)) return;        // ITMENA 꺼짐
    if (!(ITM_TER & 1)) return;        // port 0 꺼짐
    while ((ITM_PORT_U32(0) & 1) == 0); // FIFOREADY 대기
    ITM_PORT_U8(0) = c;
}
```

OpenOCD 매뉴얼의 예도 같은 패턴으로, 데이터 손실을 막으려면 `ITM_STIM_FIFOREADY`를 기다리라고 적습니다. 출력 경로는 위 SWO 절의 TPIU 설정입니다.

ITM은 Armv7-M과 Armv8-M Mainline의 구성 요소입니다. CMSIS 5.9.0 `core_cm0.h`·`core_cm0plus.h`에는 `ITM_Type` 정의 자체가 없는데, Cortex-M0/M0+(Armv6-M)에서 ITM을 쓸 수 없다는 뜻입니다.

## ETM — 명령 단위 Trace

ETM(Embedded Trace Macrocell)이 있으면 실행한 명령 흐름을 trace로 내보낼 수 있습니다. Cortex-M4에서 ETM은 구현 선택이며(TRM 1.1의 구성 목록에 ITM·DWT·ETM 조합이 나옵니다), 자세한 내용은 별도의 ETM-M4 TRM(DDI 0440)이 다룹니다. TRM의 TPIU 블록 그림은 출력 핀으로 `TRACECLK`와 `TRACEDATA[3:0]`를 보여 줍니다. 이 병렬 trace port를 받으려면 전용 캡처 장비가 필요합니다.

ETM 버전·trace sink·timestamp·핀 노출은 코어와 SoC 구현마다 다릅니다. Cortex-M7·M33의 trace 구성은 각 코어 TRM에서 따로 확인해야 하고, 이 장의 M4 설명을 그대로 옮기지 않습니다.

## 연결이 안 될 때 — 계층별로 나누기

실물 보드에서 프로브가 붙지 않으면, 위에서 본 계층을 아래에서부터 하나씩 확인하는 것이 빠릅니다. 이 절의 명령과 메시지는 OpenOCD 소스·매뉴얼에서 확인한 것이고, 보드 실측값은 없습니다.

### 전원과 Vref

프로브는 타깃 전압을 감지하는 핀을 갖습니다. ST-Link 드라이버는 이 값을 `Target voltage: %f`로 찍고(`src/jtag/drivers/stlink_usb.c`), J-Link 드라이버는 전압이 낮으면 `Target voltage too low. Check target power`를 출력합니다(`src/jtag/drivers/jlink.c`). 여기서 0에 가까운 값이 나오면 디버그 프로토콜 이전에 전원·Vref 배선·GND 공통을 먼저 봐야 합니다.

### 클럭 속도

OpenOCD 매뉴얼의 `adapter speed` 설명은 "칩 데이터시트가 최대 디버그 클럭을 정하며, 외부 어댑터라면 PCB 배선이나 결선 때문에 더 낮아질 수 있다"고 적습니다. 지정한 값은 상한이며 실제 속도가 그보다 빠르지 않습니다. 속도를 낮췄을 때 IDCODE가 읽히기 시작하면 신호 무결성 쪽을 의심할 근거가 됩니다.

### 리셋

펌웨어가 SWD 핀을 다른 기능으로 바꾸거나 곧바로 저전력 모드로 들어가면, 평소 방식으로는 붙을 틈이 없습니다. OpenOCD의 `reset_config`에서 `connect_assert_srst`는 *연결 전에 SRST를 걸어 둔 채* 붙는 옵션입니다. 매뉴얼은 이 옵션에 `srst_nogate`가 필요하며, 일부 타깃(STM32, STR9 예시)만 지원하고, 잘못된 option byte나 비정상 실행 때문에 연결이 안 될 때 쓸모 있다고 적습니다.

```tcl
reset_config srst_only srst_nogate connect_assert_srst
```

## 프로브 종류

프로브마다 지원 인터페이스와 부가 기능이 다릅니다. 이 표는 각 제품군의 성격만 정리했고, 속도·가격은 비교하지 않았습니다.

| 프로브 | 인터페이스 | 비고 |
|--------|------------|------|
| ST-LINK | SWD/JTAG | OpenOCD에 HLA용 `interface/stlink.cfg`와 DAP용 `interface/stlink-dap.cfg`가 모두 있음 |
| CMSIS-DAP / DAPLink | SWD/JTAG | Arm의 프로토콜 명세, 디버거와는 USB로 통신([CMSIS-DAP](https://arm-software.github.io/CMSIS-DAP/latest/)) |
| J-Link | SWD/JTAG | SEGGER 프로브, 4장에서 다룸 |
| J-Trace | SWD/JTAG + trace | SEGGER 페이지 기준 Cortex-M ETM trace를 streaming으로 받음([J-Trace](https://www.segger.com/products/debug-probes/j-trace/)) |
| Black Magic Probe | SWD/JTAG | 펌웨어가 GDB 서버를 구현하고 제어는 GDB monitor 명령으로 함([black-magic.org](https://black-magic.org/)) |
| FT2232 계열 + 회로 | SWD/JTAG | OpenOCD의 MPSSE 드라이버로 구동 |

## 작은 예제 — DHCSR 덤프 해독

보드에서 읽은 값이 위 표와 맞는지 먼저 확인하는 오프라인 검사입니다. SWD 파형이나 실제 halt는 수행하지 않습니다.

```js title="dhcsr-check.mjs"
import assert from 'node:assert/strict';
const decode = word => ({
    halted:Boolean(word & (1<<17)),
    registerReady:Boolean(word & (1<<16)),
    haltRequested:Boolean(word & 2), debugEnabled:Boolean(word & 1)
});
assert.deepEqual(decode(0x00030003),{halted:true,registerReady:true,haltRequested:true,debugEnabled:true});
assert.equal(decode(0x00010003).halted,false);
const apBank = address => (address>>>4)&15;
const requestAddress = address => (address>>>2)&3;
assert.equal(apBank(0xfc),15);
assert.equal(requestAddress(0xfc),3);
assert.equal(apBank(0x0c),0);
const swj=0xe79e;
const bits=Array.from({length:16},(_,i)=>(swj>>>i)&1).join('');
assert.equal(bits,'0111100111100111');
console.log('PASS DHCSR, AP bank/address, SWJ LSB-first vector');
```

Node 24.21.0에서 `node dhcsr-check.mjs`를 실행하면 `PASS DHCSR, AP bank/address, SWJ LSB-first vector`가 출력됩니다. 마지막 검사는 0xE79E를 LSB부터 늘어놓으면 ADIv5가 적은 `0111100111100111`이 된다는 것을 확인합니다. 0x00030003은 S_HALT·S_REGRDY·C_HALT·C_DEBUGEN이 모두 켜진 *가정한* 값이며, 이 장에서 실물 보드로 읽은 값은 아닙니다.

## 정리

- JTAG는 TCK·TMS·TDI·TDO에 선택 신호 TRST를 더한 TAP 구조이고, TMS HIGH 다섯 클럭으로 리셋됩니다.
- Arm JTAG-DP는 DPACC·APACC IR 명령으로 DP·AP 레지스터에 접근합니다.
- SWD는 2선 패킷 프로토콜이며, JTAG에서 전환하려면 50사이클 HIGH, 0xE79E(LSB first), 다시 50사이클이 필요합니다.
- SW-DP의 AP 읽기는 posted라 결과가 다음 전송이나 RDBUFF에서 돌아옵니다.
- DHCSR이 halt의 중심이고, 레지스터는 DCRSR/DCRDR로 하나씩 읽습니다.
- Cortex-M4 FPB는 명령 비교기 6개(full) 또는 2개(reduced), DWT는 비교기 1개 또는 4개입니다. 칩에서 FP_CTRL·DWT_CTRL을 읽어 확인합니다.
- ITM은 Cortex-M0/M0+에 없습니다.
- QEMU는 CoreSight 디버그 회로를 흉내 내지 않으므로, 이 장의 레지스터 동작은 실물 보드에서만 관찰됩니다.

## 다음 장 예고

Ch 3 — OpenOCD 깊이. Tcl 인터프리터, flash driver, target 정의 파일, custom 명령 작성.

## 관련 항목

- [Ch 1: RSP 프로토콜](/blog/tools/debugging/embedded/chapter01-rsp-protocol) — 위쪽 계층
- [Ch 3: OpenOCD 깊이](/blog/tools/debugging/embedded/chapter03-openocd)
- [Performance Engineering: ARM DS·Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach) — ETM trace를 Streamline·TRACE32 프로파일링에 쓰는 법
- [Arm Debug Interface Architecture Specification ADIv5.0 to ADIv5.2 (IHI 0031G)](https://documentation-service.arm.com/static/622222b2e6f58973271ebc21) — DAP 명세
- [Cortex-M4 Technical Reference Manual (DDI 0439B)](https://documentation-service.arm.com/static/5f19da2a20b7cf4bc524d99a) — FPB·DWT·ROM table
- [ARMv7-M Architecture Reference Manual](https://developer.arm.com/documentation/ddi0403/latest/) — 디버그 레지스터 정의
- [CMSIS 5.9.0 core_cm4.h](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/core_cm4.h) — 레지스터 주소·비트
- [CMSIS-DAP](https://arm-software.github.io/CMSIS-DAP/latest/)
