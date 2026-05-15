---
title: "Ch 7: RTOS-aware 디버깅 + 트러블슈팅"
date: 2025-09-01T07:00:00
description: "FreeRTOS/Zephyr task 콜스택, Hardfault 분석, MPU, 신호 무결성, 보안 lock 해제."
tags: [rtos, freertos, zephyr, hardfault, mpu, troubleshooting, embedded]
series: "Embedded Debugging"
seriesOrder: 7
draft: false
---

이 시리즈의 마지막 장은 *실전에서 자주 만나는* 임베디드 디버깅 문제들을 모았습니다. RTOS-aware 디버깅으로 task별 콜스택 보기, Cortex-M의 Hardfault·UsageFault·MemFault 분석, MPU 위반 추적, 신호 무결성·전원 문제, flash 보호 lock 해제까지.

## RTOS-aware 디버깅

베어메탈 디버깅에서는 한 스레드의 콜스택만 보입니다. RTOS가 도는 펌웨어에서는 *동시에 여러 task*가 살아 있는데, 평소 GDB는 *현재 스택*만 보여 줘 다른 task가 *무엇을 하고 있는지* 알 수 없습니다.

RTOS-aware 디버깅은 OpenOCD/J-Link가 *RTOS의 task control block 구조*를 알고 메모리에서 직접 파싱해 GDB의 `info threads`에 task 목록으로 노출하는 기능입니다.

### OpenOCD 설정

```tcl
# target/<chip>.cfg
$_TARGETNAME configure -rtos FreeRTOS
$_TARGETNAME configure -rtos auto        # 자동 검출
```

지원 RTOS:

- FreeRTOS
- embKernel
- ChibiOS
- eCos
- ThreadX
- mqx
- nuttx
- RIOT
- Zephyr
- hwthread (베어메탈에서 CPU 코어를 thread로)

### J-Link 설정

```bash
$ JLinkGDBServer -device STM32F407VG -if SWD \
    -rtos GDBServer/RTOSPlugin_FreeRTOS
```

J-Link 설치 디렉터리 (`/opt/SEGGER/JLink/GDBServer/`)에 `RTOSPlugin_*` 플러그인.

### 펌웨어 측 요구사항

심볼이 보존돼야 합니다 — RTOS 내부 구조체(`pxCurrentTCB`, `pxReadyTasksLists` 등)를 GDB가 검색.

```c
// FreeRTOS — 디버그 빌드면 자동
// 또는 link script에 KEEP():
KEEP(*(.rtos_meta*))
```

심볼 없는 stripped 빌드면 RTOS-aware가 동작 안 함. 운영 배포본은 stripped + 별도 `.debug`가 표준.

### info threads 결과

```text
(gdb) info threads
  Id   Target Id                                  Frame
* 1    Thread 0x20002000 (Name: idle, Running)   prvIdleTask
  2    Thread 0x20002400 (Name: sensor, Ready)   vTaskDelay
  3    Thread 0x20002800 (Name: uart, Blocked)   xQueueReceive
  4    Thread 0x20002c00 (Name: net, Blocked)    pvSocketReceive
```

`thread 2` 전환 후 `bt` → 그 task의 콜스택. 어떤 task가 *어디서 대기 중*인지 동시에 봅니다.

### task별 스택 사용량

각 task의 *최대 stack high water mark*가 RTOS 내부에 저장됩니다.

```c
UBaseType_t uxTaskGetStackHighWaterMark(TaskHandle_t xTask);
```

GDB Python으로 모든 task 일괄 출력:

```python
class TaskStacks(gdb.Command):
    def __init__(self):
        super().__init__("task_stacks", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        for thread in gdb.selected_inferior().threads():
            thread.switch()
            name = gdb.execute(f"info thread {thread.num}", to_string=True)
            sp = int(gdb.parse_and_eval("$sp"))
            # task stack base/end는 RTOS 구조체에서
            ...
            gdb.write(f"{name}: free = {free} bytes\n")
TaskStacks()
```

스택 오버플로의 *어느 task*가 범인인지 즉시 파악.

## Cortex-M Hardfault 분석

가장 흔한 펌웨어 사고. NULL 역참조, 잘못된 함수 포인터, 스택 오버플로, MPU 위반 등이 모두 *fault exception*으로 귀결됩니다.

### Fault 종류

| Fault | 원인 |
|-------|------|
| HardFault | 다른 fault 핸들러 안에서 또 fault, 또는 *escalated* fault |
| MemFault | MPU 위반, instruction fetch 실패 |
| BusFault | precise: stack push 중 bus error, imprecise: 비동기 |
| UsageFault | undefined instruction, divide-by-zero, unaligned access |
| DebugFault | watchpoint, BKPT 명령 |

### fault 핸들러에서 정보 수집

기본 핸들러는 *무한 루프*. 진짜 정보는 *예외 발생 시 푸시된 스택 프레임*에 있습니다.

![Cortex-M exception stack frame](/images/blog/tools/diagrams/cortex-m-exception-frame.svg)

```c
// 예외 시 HW가 자동 푸시: r0, r1, r2, r3, r12, lr, return_pc, xpsr
// MSP 또는 PSP 어느 스택에 있는지는 LR (EXC_RETURN) 값으로

__attribute__((naked))
void HardFault_Handler(void) {
    __asm volatile(
        "tst lr, #4 \n"            // bit 2: 0=MSP, 1=PSP
        "ite eq \n"
        "mrseq r0, msp \n"
        "mrsne r0, psp \n"
        "b HardFault_Diag \n"
    );
}

void HardFault_Diag(uint32_t *sp) {
    uint32_t r0   = sp[0];
    uint32_t r1   = sp[1];
    uint32_t r2   = sp[2];
    uint32_t r3   = sp[3];
    uint32_t r12  = sp[4];
    uint32_t lr   = sp[5];
    uint32_t pc   = sp[6];     // ← fault 발생 시 PC!
    uint32_t xpsr = sp[7];

    uint32_t cfsr = SCB->CFSR; // Configurable Fault Status Register
    uint32_t hfsr = SCB->HFSR;
    uint32_t mmar = SCB->MMFAR; // MemFault address
    uint32_t bfar = SCB->BFAR;  // BusFault address

    // RTT로 로그
    SEGGER_RTT_printf(0,
        "HardFault!\n"
        "PC=%08x LR=%08x R0=%08x R1=%08x\n"
        "CFSR=%08x HFSR=%08x MMAR=%08x BFAR=%08x\n",
        pc, lr, r0, r1, cfsr, hfsr, mmar, bfar);

    while (1);
}
```

핵심은 *PC* — 어떤 명령이 fault를 일으켰나. 그 PC를 `addr2line`으로 변환.

```bash
$ arm-none-eabi-addr2line -e firmware.elf -f -i 0x08003a12
process_data
/path/to/sensor.c:42
```

### CFSR 비트 해독

```
CFSR (0xE000ED28):
  [25] DIVBYZERO    — 0으로 나눔
  [24] UNALIGNED    — 정렬 안 된 접근
  [19] NOCP         — Coprocessor 없음 (FPU 활성화 안 했나?)
  [18] INVPC        — invalid PC load
  [17] INVSTATE     — invalid state (Thumb 비트?)
  [16] UNDEFINSTR   — undefined instruction
  
  [12:8] BFSR (BusFault):
    [15] BFARVALID  — BFAR 유효
    [12] STKERR     — exception 진입 시 stack push 실패
    [11] UNSTKERR   — return 시 stack pop 실패
    [10] IMPRECISERR — 비동기 bus fault
    [9]  PRECISERR  — 정확한 bus fault (BFAR 의미 있음)
    [8]  IBUSERR    — instruction fetch 실패
  
  [7:0] MMFSR (MemFault):
    [7] MMARVALID   — MMAR 유효
    [5] MLSPERR     — lazy FP stacking 실패
    [4] MSTKERR     — exception 시 stack push 실패
    [3] MUNSTKERR   — pop 실패
    [1] DACCVIOL    — data access violation (MPU)
    [0] IACCVIOL    — instruction access violation
```

```c
void decode_cfsr(uint32_t cfsr) {
    if (cfsr & (1 << 25)) SEGGER_RTT_printf(0, "DIVBYZERO\n");
    if (cfsr & (1 << 24)) SEGGER_RTT_printf(0, "UNALIGNED\n");
    if (cfsr & (1 << 17)) SEGGER_RTT_printf(0, "INVSTATE (Thumb bit?)\n");
    if (cfsr & (1 << 9))  SEGGER_RTT_printf(0, "PRECISERR @ BFAR\n");
    if (cfsr & (1 << 1))  SEGGER_RTT_printf(0, "DACCVIOL (MPU?)\n");
    ...
}
```

### imprecise vs precise

- **precise** — fault 시 PC가 *정확한 명령*. 보통 분석 쉬움.
- **imprecise** — DMA 같은 비동기 source. PC가 *그 시점에 도달한 곳* (실제 원인과 다름). 매우 어려움.

imprecise 해법: `auxiliary control register`의 *write buffer disable* 비트로 모든 write를 동기화 (성능 저하 큰 대가).

```c
// SCnSCB->ACTLR (0xE000E008)
SCnSCB->ACTLR |= (1 << 1);   // DISDEFWBUF
```

이러면 모든 fault가 precise가 됩니다. 디버깅 후 다시 끔.

### 자동 진단 — 라이브러리

[CMSIS 5의 Fault analysis 라이브러리](https://arm-software.github.io/CMSIS_6/latest/Core/group__usage__faults__gr.html) 또는 직접 짠 핸들러로 *상세 fault report*를 RTT로 출력 → 운영 환경에서도 사고 후 분석 가능.

## MPU — Memory Protection Unit

큰 임베디드 칩(M3+)이 MPU 옵션. 메모리 영역에 *권한*을 설정해 권한 위반 시 MemFault.

```c
// 영역 0: flash, RO + exec
MPU->RNR = 0;
MPU->RBAR = 0x08000000;
MPU->RASR = MPU_RASR_ENABLE_Msk |
            (MPU_REGION_SIZE_1MB << MPU_RASR_SIZE_Pos) |
            (MPU_REGION_FULL_ACCESS_RO << MPU_RASR_AP_Pos);

// 영역 1: 스택, RW만, *executable 불가*
MPU->RNR = 1;
MPU->RBAR = stack_base;
MPU->RASR = MPU_RASR_ENABLE_Msk |
            ... | MPU_RASR_XN_Msk;     // execute never

MPU->CTRL = MPU_CTRL_ENABLE_Msk | MPU_CTRL_PRIVDEFENA_Msk;
```

쓸모:

- 스택을 *Execute Never* — buffer overflow exploit 방지.
- 한 task가 다른 task의 메모리를 못 건드리게.
- NULL 페이지를 비활성화 → NULL 역참조가 *조용히 0번지를 읽는* 대신 즉시 MemFault.

NULL 가드:

```c
// 영역 7: 0x00000000 ~ 0x00000100을 비활성화
MPU->RNR = 7;
MPU->RBAR = 0x00000000;
MPU->RASR = MPU_RASR_ENABLE_Msk |
            (MPU_REGION_SIZE_256B << MPU_RASR_SIZE_Pos) |
            (MPU_REGION_NO_ACCESS << MPU_RASR_AP_Pos);
```

이러면 `*((int *)0) = 5;`가 *즉시 MemFault*. 디버깅 매우 쉬워집니다.

## Stack overflow

RTOS task의 스택을 *너무 작게* 설정하면 함수 호출 깊이가 한계 넘는 순간 *다른 task의 스택 또는 .bss*를 덮어씁니다. 증상은 *random*: 한참 후 다른 task가 죽음.

### 검출 — FreeRTOS

```c
configCHECK_FOR_STACK_OVERFLOW 2

void vApplicationStackOverflowHook(TaskHandle_t xTask, char *name) {
    SEGGER_RTT_printf(0, "stack overflow: %s\n", name);
    while (1);
}
```

`2`는 *모든* context switch마다 검사 (느림). `1`은 magic word만.

### MSPLIM / PSPLIM (M33+)

Cortex-M33은 *스택 한계 레지스터*가 있어 SP가 그 이하로 내려가면 자동 UsageFault.

```c
__set_MSPLIM((uint32_t)&_sstack);
__set_PSPLIM((uint32_t)task_stack_base);
```

M0/M3/M4/M7은 없음.

### High water mark

```c
UBaseType_t hwm = uxTaskGetStackHighWaterMark(NULL);
// 남은 공간 (words)
```

CI에서 모든 task의 hwm을 로그하면 *어느 task가 너무 빠듯한지* 추적 가능.

## DMA · 캐시 일관성

Cortex-M7+는 D-cache가 있어 DMA 버퍼와 *일관성* 문제가 생깁니다.

```c
// DMA로 데이터 받은 후 *반드시 invalidate*
SCB_InvalidateDCache_by_Addr(buf, len);

// DMA로 보내기 전 *반드시 clean*
SCB_CleanDCache_by_Addr(buf, len);
```

또는 DMA 버퍼를 *non-cacheable* 영역에 둠 (MPU로).

증상: DMA로 받은 데이터가 *random 값*. 또는 DMA로 보낸 데이터가 *원하는 값 아님*. 매우 어려운 디버그.

## 신호 무결성 트러블슈팅

### 케이블 길이

SWD 케이블이 길면 (>15cm) capacitance 증가 → 고속 SWCLK 깨짐. `adapter speed 4000` 안 되면 `1000`부터 시도.

### 풀업/풀다운

대부분 칩은 SWDIO 내부 풀업. 일부는 외부 10kΩ 필요.

### Vref 미연결

`Target voltage: 0.000V`. 해법:

- 타깃 전원 확인.
- Vref 핀 연결.
- GND 공통.

### Reset 안 됨

`init mode failed`. SRST이 너무 빨리 풀려 워치독이 다시 reset, 또는 외부 회로가 reset을 잡고 있음.

```tcl
reset_config srst_only srst_nogate connect_assert_srst
adapter srst delay 100             # 100ms 동안 SRST 유지
adapter srst pulse_width 50
```

### 디커플링 부족

칩 가까이 100nF 디커플링 캡이 없으면 디버그 트랜잭션이 순간 전류 변동 → 노이즈로 SWD 끊김. 자체 보드는 *항상* 0.1µF + 10µF.

### 디버거 펌웨어 충돌

ST-Link 펌웨어가 오래됐을 때 일부 칩에서 hang. STM32 CubeProgrammer로 ST-Link 펌웨어 업데이트.

```bash
$ STM32_Programmer_CLI -c port=SWD -fwupgrade
```

CMSIS-DAP는 펌웨어가 GitHub 오픈 → 항상 최신 빌드 가능.

## Boot 안 됨 — 진단 흐름

1. `Target voltage` OK?
2. `IDCODE` 검출? (`info reset`)
3. Reset 후 `monitor halt` 가능?
4. PC가 *벡터 테이블의 Reset_Handler*를 가리키나? (`info reg pc`)
5. `step` 가능? 어디서 hang?
6. CFSR/HFSR fault 있나?

각 단계가 *그 다음 단계의 전제*. 1번 부터 차근차근.

## 보안 — RDP / Lock 해제

대부분 MCU는 *플래시 readout protection*. 한 번 lock 되면 디버거 차단.

### STM32 RDP

| Level | 디버거 | flash erase로 풀기 |
|-------|--------|-------------------|
| 0 | 자유 | N/A (이미 자유) |
| 1 | flash 자동 erase 후 접근 | 가능 (펌웨어 잃음) |
| 2 | 영구 차단 | 불가능 (칩 폐기) |

OpenOCD에서 L1 → L0:

```text
(openocd) reset halt
(openocd) stm32f4x unlock 0
(openocd) reset init
(openocd) stm32f4x option_write 0 0xaa 0xff
```

### nRF52 APPROTECT

```text
(openocd) nrf5 mass_erase
```

flash·UICR 전체 erase → APPROTECT 해제.

### ESP32

ESP32는 *eFuse* 기반 secure boot. 한 번 burn하면 영구. 디버그 활성화 비트가 따로 있어 양산 전 확인 필수.

### 핵심

*양산 lock하기 전*에 *모든* 디버거 ↔ 칩 통신이 정상인지 확인. lock 후 문제 발견하면 그 보드는 *폐기*.

## RTOS-aware의 한계

- 심볼이 stripped면 동작 안 함.
- *코드 수정 직후 task control block 레이아웃이 바뀌면* 일관성 깨짐 — debug build와 release build가 다른 layout 가질 수 있음.
- 일부 RTOS는 *동적 task* 생성을 지원해도 디버거가 못 따라감.

## 자동화 — fault → cloud

```c
void HardFault_Diag(uint32_t *sp) {
    // fault 정보를 *비휘발성 영역*에 저장
    save_to_backup_sram(sp, &SCB->CFSR);
    
    // 워치독 활성화 → 자동 reset
    IWDG->KR = 0xCCCC;
    while (1);
}

// 부팅 시 검사
void main() {
    if (last_boot_was_fault()) {
        char buf[256];
        format_fault_report(buf);
        upload_to_cloud(buf);
    }
    ...
}
```

운영 환경에서 fault 자동 수집 → 양산 후 결함 추적의 표준.

## 정리 (시리즈 전체)

- **Ch 1** RSP — `$payload#cs` ASCII 프로토콜. 모든 임베디드 디버깅의 인터페이스.
- **Ch 2** JTAG/SWD/CoreSight — 핀과 회로. DAP·FPB·DWT·ITM·ETM.
- **Ch 3** OpenOCD — TCL 인터프리터, flash driver, target/interface 설정.
- **Ch 4** J-Link — 상용 표준. Unlimited Flash BP, RTT, Ozone.
- **Ch 5** ELF/MAP — 굽는 단위, 링커 스크립트, 메모리 진단.
- **Ch 6** Trace — RTT/ITM/SWO/ETM/Semihosting 비교.
- **Ch 7 (이 장)** RTOS-aware + Hardfault 분석 + 보안 + 트러블슈팅.

임베디드 디버깅의 80%는 위의 도구로 덮입니다. 나머지 20%는 *PCB 설계*와 *오실로스코프* — 그 영역은 별 주제.

## 관련 항목 (시리즈 전체)

- [Ch 1: RSP 프로토콜](/blog/tools/debugging/embedded-debug/chapter01-rsp-protocol)
- [Ch 2: JTAG / SWD / CoreSight](/blog/tools/debugging/embedded-debug/chapter02-jtag-swd-coresight)
- [Ch 3: OpenOCD 깊이](/blog/tools/debugging/embedded-debug/chapter03-openocd)
- [Ch 4: J-Link 도구 체인](/blog/tools/debugging/embedded-debug/chapter04-jlink)
- [Ch 5: ELF / MAP](/blog/tools/debugging/embedded-debug/chapter05-elf-map)
- [Ch 6: Trace](/blog/tools/debugging/embedded-debug/chapter06-trace)

## 외부 자료

- [GDB and LLDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — 일반 GDB
- [DWARF and ELF Internals](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview) — ELF 깊이
- [Postmortem Debugging](/blog/tools/debugging/postmortem-debug/chapter01-core-generation) — core dump 분석
- [Cortex-M3/M4 Programming Manual (ARM)](https://developer.arm.com/documentation/ddi0337/latest/) — fault, MPU
- [FreeRTOS Real-Time Kernel Reference](https://www.freertos.org/Documentation/RTOS_book.html)
- [Zephyr Project](https://docs.zephyrproject.org/)
- [CMSIS-Core docs](https://arm-software.github.io/CMSIS_6/latest/Core/index.html)
