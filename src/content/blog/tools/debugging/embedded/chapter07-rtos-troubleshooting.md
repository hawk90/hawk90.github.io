---
title: "RTOS-aware 디버깅과 임베디드 트러블슈팅 — Task·Stack·Fault 분석"
slug: "tools/debugging/embedded/chapter07-rtos-troubleshooting"
date: 2026-05-26T09:07:00
description: "FreeRTOS/Zephyr task와 스택 추적, Cortex-M fault 분석, MPU 및 보드 디버깅 문제 진단."
tags: [rtos, freertos, zephyr, hardfault, mpu, troubleshooting, embedded]
series: "Embedded Debugging"
seriesOrder: 7
draft: false
topics: ["tools", "tools/debugging"]
---

이 장은 RTOS-aware 도구가 task별 상태를 어떻게 알아내는지 보고, Cortex-M fault와 MPU 위반을 해석하며, 스택 오버플로를 어떻게 잡는지(그리고 어떻게 놓치는지) 다룹니다. 모든 fault와 오버플로는 QEMU에서 직접 일으켜 레지스터 값을 받았습니다.

## 실험 환경

| 항목 | 값 |
|------|-----|
| 에뮬레이터 | QEMU 11.1.3 `mps2-an385`(Cortex-M3), `mps2-an505`(Cortex-M33) |
| RTOS | FreeRTOS 커널 git main(`tskKERNEL_VERSION_NUMBER` "V11.1.0+"), `portable/GCC/ARM_CM3`, `heap_4` |
| 컴파일러 | FreeRTOS 예제: Debian `gcc-arm-none-eabi` 14.2.1 + newlib-nano, M33 예제: arm-none-eabi-gcc 16.2.0 |
| 디버거 | GDB 16.3 (`gdb-multiarch`) |

예제 `app.c`는 빌드 때 `-DMODE=n`으로 동작을 고릅니다. 0은 task 세 개, 1은 스택 오버플로, 2~5는 fault입니다. fault 핸들러는 결과를 semihosting으로 출력하고 `SYS_EXIT`로 QEMU를 끝냅니다.

## RTOS-aware 디버깅

베어메탈 디버거는 CPU 하나의 현재 스택만 봅니다. RTOS 펌웨어에는 여러 task가 동시에 살아 있지만, 지금 CPU에서 돌지 않는 task의 레지스터는 *각 task 스택에 저장된 문맥*으로만 존재합니다. RTOS-aware 디버깅은 디버그 서버가 RTOS의 task 목록과 저장된 문맥을 메모리에서 읽어 GDB에 스레드처럼 보여 주는 기능입니다.

### QEMU gdbstub은 task를 모른다

MODE 0 펌웨어는 우선순위가 다른 task 셋(`sensor`, `uart`, `monitor`)과 idle task로 돕니다. `monitor`가 50 ms 뒤 `monitor_idle()`을 반복 호출하게 해 두고, GDB에서 거기에 브레이크포인트를 걸었습니다.

```text
Breakpoint 1, monitor_idle () at app.c:65
  Id   Target Id                    Frame 
* 1    Thread 1.1 (CPU#0 [running]) monitor_idle () at app.c:65
$1 = "monitor\000\000\000\000"
$2 = 4
```

`info threads`는 CPU 하나만 보여 줍니다. 하지만 `pxCurrentTCB->pcTaskName`이 `"monitor"`이고 `uxCurrentNumberOfTasks`가 4이니, 메모리에는 task 정보가 다 있습니다.

### OpenOCD가 하는 일을 GDB Python으로

OpenOCD의 FreeRTOS 지원(`src/rtos/freertos.c`)은 ELF에서 `pxCurrentTCB`, `pxReadyTasksLists`, `xDelayedTaskList1/2`, `pxDelayedTaskList`, `pxOverflowDelayedTaskList`, `xPendingReadyList`, `xTasksWaitingTermination`, `xSuspendedTaskList`, `uxCurrentNumberOfTasks`, `uxTopUsedPriority`, `xSchedulerRunning` 심볼을 찾고, 리스트를 따라가며 TCB를 읽습니다. 저장된 레지스터의 위치는 포트마다 다르며, OpenOCD `src/rtos/rtos_standard_stackings.c`의 Cortex-M3 표는 저장된 스택 포인터에서 PC가 `0x38` 오프셋에 있다고 정의합니다. FreeRTOS ARM_CM3 포트의 PendSV가 `stmdb r0!, {r4-r11}`로 r4~r11을 하드웨어 프레임 위에 쌓기 때문입니다(r4~r11 8워드 뒤 하드웨어 프레임의 PC는 워드 오프셋 14, 즉 0x38).

같은 일을 하는 GDB Python 명령을 만들어 돌렸습니다(핵심 부분).

```python
def walk(lst):
    end = lst['xListEnd'].address
    item = lst['xListEnd']['pxNext']
    while item != end:
        yield item['pvOwner'].cast(gdb.lookup_type('TCB_t').pointer())
        item = item['pxNext']
# ...
sp = tcb['pxTopOfStack'].cast(u32)
pc = int((sp + 8 + 6).dereference())   # r4-r11 8워드 뒤, 하드웨어 프레임의 PC
```

```text
IDLE     prio 0 Ready     TCB 0x20001750 <ucHeap+5040>  pc 0x000003dc prvIdleTask + 16
monitor  prio 1 Running   TCB 0x200014e8 <ucHeap+4424>  pc 0x000000c0 monitor_idle
sensor   prio 2 Delayed   TCB 0x20000818 <ucHeap+1144>  pc 0x00000a94 vTaskDelay + 16
uart     prio 3 Suspended TCB 0x20000c80 <ucHeap+2272>  pc 0x0000127a xQueueReceive + 294
```

OpenOCD나 J-Link의 RTOS 플러그인이 `info threads`에 보여 주는 내용이 이것입니다. 눈여겨볼 점이 하나 있습니다. `uart`는 `xQueueReceive(q, &v, portMAX_DELAY)`로 기다리는 중인데 *Suspended* 리스트에 있습니다. FreeRTOS `tasks.c`는 `INCLUDE_vTaskSuspend == 1`이고 대기 시간이 `portMAX_DELAY`이면 "시간 이벤트로 깨지 않도록" task를 지연 리스트 대신 `xSuspendedTaskList`에 넣습니다. 디버거에서 "Suspended"로 보인다고 해서 누가 `vTaskSuspend()`를 부른 것은 아닙니다.

### OpenOCD 설정

```tcl
$_TARGETNAME configure -rtos FreeRTOS
$_TARGETNAME configure -rtos auto
```

OpenOCD 0.12.0이 받는 RTOS 이름은 3장에서 확인한 대로 `ThreadX, FreeRTOS, eCos, linux, chibios, Chromium-EC, embKernel, mqx, uCOS-III, nuttx, RIOT, Zephyr, hwthread`입니다.

### J-Link 설정

```bash
JLinkGDBServer -device STM32F407VG -if SWD -rtos GDBServer/RTOSPlugin_FreeRTOS
```

SEGGER GDB Server 문서는 embOS와 FreeRTOS 플러그인이 설치 디렉터리의 `GDBServer` 하위에 기본 포함된다고 적습니다(4장). J-Link 쪽은 이 장에서 실행하지 않았습니다.

### 펌웨어 쪽 요구사항

RTOS-aware에 필요한 것은 *심볼이 있는 ELF*입니다. 위 심볼들은 대부분 `tasks.c`의 `static` 변수인데, 이 빌드에서 `nm`으로 보면 그대로 남아 있습니다.

```text
20000378 B pxCurrentTCB
20000314 b pxReadyTasksLists
200002a0 b uxCurrentNumberOfTasks
00002970 t uxTopUsedPriority
20000294 b xSchedulerRunning
```

`uxTopUsedPriority`는 FreeRTOS 커널이 *OpenOCD를 위해* 정의한 상수입니다. `tasks.c` 주석은 "OpenOCD makes use of uxTopUsedPriority for thread debugging"이라 적고, 최적화로 지워지지 않도록 `vTaskStartScheduler()`에서 `( void ) uxTopUsedPriority;`로 참조합니다. 이 심볼이 없으면 OpenOCD는 `FreeRTOS: uxTopUsedPriority is not defined, consult the OpenOCD manual for a work-around`를 냅니다. 배포용 펌웨어를 strip했다면, 디버깅할 때는 같은 빌드의 심볼 있는 ELF를 GDB에 줘야 합니다.

### task별 스택 사용량

FreeRTOS는 task를 만들 때 스택을 `tskSTACK_FILL_BYTE`(0xa5)로 채워 두고, `uxTaskGetStackHighWaterMark()`가 그 패턴이 남은 길이를 세어 *지금까지 가장 적게 남았던 여유*를 돌려줍니다(`tasks.c`). `INCLUDE_uxTaskGetStackHighWaterMark`를 1로 해야 빌드에 들어갑니다. MODE 0에서 `monitor` task가 출력한 값입니다.

```text
sensor   high water mark: 220 words (880 bytes)
uart     high water mark: 222 words (888 bytes)
monitor  high water mark: 394 words (1576 bytes)
last value received by uart: 10
```

`sensor`·`uart`는 256워드, `monitor`는 512워드로 만들었으니, 50 ms 동안 각각 36·34·118워드를 썼습니다. 이 값은 *실행한 경로에서 관측한 최소 여유*이며, 실행하지 않은 경로까지 보증하지는 않습니다.

## Cortex-M fault 분석

잘못된 함수 포인터, 0으로 나누기, MPU 위반, 스택 오버플로는 모두 fault 예외로 끝납니다. 기본 핸들러는 무한 루프라 정보가 없고, 진짜 단서는 *예외 진입 때 하드웨어가 쌓은 스택 프레임*과 fault 상태 레지스터에 있습니다.

### fault 종류

| 예외 | 번호 (ARMv7-M ARM Table B1-4) | 언제 |
|-------|------|------|
| HardFault | 3 | 다른 fault가 꺼져 있거나 처리할 수 없을 때 올라옴(escalation) |
| MemManage | 4 | MPU 위반 |
| BusFault | 5 | 버스 오류 |
| UsageFault | 6 | 정의되지 않은 명령, 잘못된 상태, 트랩을 켠 0 나누기·비정렬 접근 |

MemManage·BusFault·UsageFault는 SHCSR의 enable 비트(CMSIS `SCB_SHCSR_MEMFAULTENA`/`BUSFAULTENA`/`USGFAULTENA`)를 켜야 각자의 핸들러로 가고, 꺼져 있으면 HardFault로 올라가며 HFSR.FORCED(비트 30)가 섭니다. 아래 실험이 정확히 그 차이를 보여 줍니다.

### 핸들러에서 정보 모으기

![Cortex-M exception stack frame](/images/blog/tools/diagrams/cortex-m-exception-frame.svg)

예제의 핸들러입니다. EXC_RETURN(LR)의 비트 2로 MSP·PSP 중 어느 스택에 프레임이 있는지 고르고, 프레임과 fault 레지스터를 출력합니다. 네 fault 벡터가 모두 이 핸들러를 가리킵니다.

```c title="fault.c (일부)"
#define SCB_CFSR  (*(volatile uint32_t *)0xE000ED28)
#define SCB_HFSR  (*(volatile uint32_t *)0xE000ED2C)
#define SCB_MMFAR (*(volatile uint32_t *)0xE000ED34)
#define SCB_BFAR  (*(volatile uint32_t *)0xE000ED38)

__attribute__((naked)) void HardFault_Handler(void) {
    __asm volatile(
        "tst lr, #4      \n"     // bit 2: 0 = MSP, 1 = PSP
        "ite eq          \n"
        "mrseq r0, msp   \n"
        "mrsne r0, psp   \n"
        "mov r1, lr      \n"
        "b fault_diag    \n");
}

void fault_diag(uint32_t *sp, uint32_t exc_return) {
    /* sp[0..7] = r0, r1, r2, r3, r12, lr, pc, xpsr  (하드웨어가 쌓은 프레임) */
    /* ICSR[8:0] = 현재 예외 번호, CFSR/HFSR/MMFAR/BFAR 출력 */
}
```

### 실험 1 — 0으로 나누기 (UsageFault 켬)

`CCR.DIV_0_TRP`(비트 4)를 켜고 `SHCSR.USGFAULTENA`(비트 18)도 켠 뒤 `divide(7, 0)`을 불렀습니다.

```text
FAULT exc=6 EXC_RETURN=fffffffd stack=PSP
  r0=00000007 r1=00000000 r2=e000e000 r3=00040000 r12=a5a5a5a5
  lr=000000b7 pc=00000040 xpsr=21000000
  CFSR=02000000 HFSR=00000000 MMFAR=00000000 BFAR=00000000
  CFSR bit 25 DIVBYZERO
```

예외 6(UsageFault)으로 바로 왔고, CFSR 비트 25 DIVBYZERO가 섰습니다. ARMv7-M ARM(DDI 0403E.b) B1.5.8의 Table B1-8에서 EXC_RETURN `0xFFFFFFFD`는 thread 모드·process 스택(PSP) 복귀이므로, *task 안에서* 난 fault입니다. 쌓인 r0=7, r1=0이 나누기 인자이고, 쌓인 PC를 `addr2line`에 넣으면 위치가 나옵니다.

```text
$ arm-none-eabi-addr2line -e rtos2.elf -f -s 0x40
divide
app.c:41
```

`objdump`로 보면 0x40은 `sdiv r0, r0, r1`입니다. r12의 `a5a5a5a5`는 FreeRTOS가 task 스택을 채운 패턴이 아직 레지스터에 남아 있던 값입니다.

### 실험 2 — 같은 나누기, UsageFault 끔

```text
FAULT exc=3 EXC_RETURN=fffffffd stack=PSP
  r0=00000007 r1=00000000 r2=e000e000 r3=00000210 r12=a5a5a5a5
  lr=000000b7 pc=00000040 xpsr=21000000
  CFSR=02000000 HFSR=40000000 MMFAR=00000000 BFAR=00000000
  CFSR bit 25 DIVBYZERO
  HFSR FORCED
```

이번에는 예외 3(HardFault)으로 왔고 HFSR.FORCED가 섰습니다. 그래도 CFSR의 DIVBYZERO와 쌓인 PC는 같습니다. **HardFault라도 CFSR을 먼저 봐야 하는 이유**가 이것입니다. 원인은 UsageFault였고, 핸들러가 꺼져 있어 HardFault로 올라왔을 뿐입니다.

### 실험 3 — Thumb 비트가 빠진 함수 포인터

ARMv7-M ARM은 "ARMv7-M only supports execution of Thumb instructions"라고 적고, EPSR.T가 0인 채 명령을 실행하면 INVSTATE UsageFault가 난다고 정합니다(A1.2.1, EPSR 설명). 비트 0이 0인 주소(`0x00000100`)로 함수를 호출했습니다.

```text
FAULT exc=3 EXC_RETURN=fffffffd stack=PSP
  r0=00000000 r1=2000083c r2=10000000 r3=00000100 r12=a5a5a5a5
  lr=000000cf pc=00000100 xpsr=60000000
  CFSR=00020000 HFSR=40000000 MMFAR=00000000 BFAR=00000000
  CFSR bit 17 INVSTATE
  HFSR FORCED
```

CFSR 비트 17 INVSTATE입니다. 쌓인 xPSR의 T 비트(비트 24)가 0이고(`60000000`), PC는 뛰어간 주소 0x100 자체입니다. 이런 fault에서는 PC보다 *LR*이 단서입니다. LR 0xcf(비트 0은 Thumb 표시)를 넣으면 호출한 곳이 나옵니다.

```text
$ arm-none-eabi-addr2line -e rtos4.elf -f -s 0xcf
fault_task
app.c:51
```

### 실험 4 — MPU no-access 영역

32바이트 배열 `guarded`에 MPU region 0을 AP=000(접근 금지)으로 걸고, `MEMFAULTENA`를 켠 뒤 `guarded[2]`에 썼습니다. 레지스터 값은 Armv7-M MPU 레이아웃(RBAR/RASR)대로 직접 넣었습니다.

```c
*MPU_RNR  = 0;
*MPU_RBAR = (uint32_t)guarded;                       /* 32바이트 정렬 */
*MPU_RASR = (0u << 24) | (4u << 1) | 1u;             /* AP=000, SIZE=4 -> 2^(4+1)=32 B, ENABLE */
*MPU_CTRL = (1u << 2) | 1u;                          /* PRIVDEFENA | ENABLE */
SCB_SHCSR |= (1u << 16);                             /* MEMFAULTENA */
guarded[2] = 0x1234;
```

```text
FAULT exc=4 EXC_RETURN=fffffffd stack=PSP
  r0=00000000 r1=20000060 r2=00010000 r3=00001234 r12=a5a5a5a5
  lr=000009b5 pc=00000094 xpsr=21000000
  CFSR=00000082 HFSR=00000000 MMFAR=20000068 BFAR=00000000
  CFSR bit 1 DACCVIOL
  CFSR bit 7 MMARVALID
```

예외 4(MemManage), DACCVIOL, 그리고 MMARVALID가 섰으므로 MMFAR가 유효합니다. `guarded`는 0x20000060(r1)이고 MMFAR 0x20000068은 정확히 `guarded[2]`입니다. 쓰려던 값 0x1234도 r3에 남아 있습니다. ARMv7-M ARM B3.5.6(MPU_CTRL)은 PRIVDEFENA를 1로 하면 기본 메모리 맵이 특권 접근의 *배경 region(-1번)*이 된다고 정합니다. 그래서 이 실험에서 region 밖의 코드·데이터 접근은 그대로 계속됐습니다.

실무에서는 이 방법으로 스택 아래에 작은 no-access 영역을 두거나, 쓰면 안 되는 버퍼를 막아 *덮어쓰는 순간*에 fault가 나게 만듭니다. 이 예제의 mps2-an385는 코드가 0번지에 있어서 0번지 NULL 가드는 걸지 않았습니다. 가드 위치는 각 칩의 메모리 맵에 따라 정합니다.

### CFSR 비트

CMSIS 5.9.0 `core_cm3.h`의 `SCB_CFSR_*_Pos` 정의입니다. CFSR은 MMFSR[7:0], BFSR[15:8], UFSR[31:16]을 합친 레지스터입니다.

| 비트 | 이름 | 의미 |
|------|------|------|
| 25 | DIVBYZERO | 0 나누기 (CCR.DIV_0_TRP일 때) |
| 24 | UNALIGNED | 비정렬 접근 트랩 |
| 19 | NOCP | 코프로세서 없음 |
| 18 | INVPC | 잘못된 EXC_RETURN 등으로 PC 적재 실패 |
| 17 | INVSTATE | 잘못된 실행 상태(Thumb 비트) |
| 16 | UNDEFINSTR | 정의되지 않은 명령 |
| 15 | BFARVALID | BFAR 유효 |
| 12 | STKERR | 예외 진입 중 스택 push 버스 오류 |
| 11 | UNSTKERR | 예외 복귀 중 pop 버스 오류 |
| 10 | IMPRECISERR | 비동기(imprecise) 버스 오류 |
| 9 | PRECISERR | 동기(precise) 버스 오류 |
| 8 | IBUSERR | 명령 fetch 버스 오류 |
| 7 | MMARVALID | MMFAR 유효 |
| 4 | MSTKERR | 예외 진입 중 MPU 위반 |
| 3 | MUNSTKERR | 예외 복귀 중 MPU 위반 |
| 1 | DACCVIOL | 데이터 접근 MPU 위반 |
| 0 | IACCVIOL | 명령 fetch MPU 위반 |

5장의 KEEP 실험에서 QEMU가 찍은 `UFSR.UNALIGNED`와 `BFSR.STKERR`도 이 표의 비트입니다.

### imprecise BusFault

IMPRECISERR이면 쌓인 PC가 원인 명령이 아닙니다. 쓰기가 write buffer에 들어간 뒤 나중에 실패하기 때문입니다. Cortex-M4 TRM(DDI 0439B) 4.3.1의 ACTLR 설명은 DISDEFWBUF(비트 1)가 "기본 메모리 맵 접근에서 write buffer 사용을 끄며, 그 결과 모든 bus fault가 precise가 되지만 store가 끝나야 다음 명령이 실행되므로 성능이 떨어진다"고 적습니다. CMSIS는 이 비트를 `SCnSCB_ACTLR_DISDEFWBUF_Msk`로 정의합니다.

```c
SCnSCB->ACTLR |= SCnSCB_ACTLR_DISDEFWBUF_Msk;   // 디버깅 중에만
```

TRM 문구대로 *기본 메모리 맵 접근*에만 적용되는 설정이라는 점과 성능 비용을 함께 기억해야 합니다. 이 장에서는 imprecise fault를 재현하지 않았습니다.

## 스택 오버플로

RTOS task 스택이 모자라면 함수 호출이 스택 아래의 메모리를 덮어씁니다. 무엇이 덮이는지는 메모리 배치에 달려 있고, 증상이 엉뚱한 곳에서 나타나는 것이 이 버그의 특징입니다.

### FreeRTOS 검출 — 그리고 한계

```c
// FreeRTOSConfig.h
#define configCHECK_FOR_STACK_OVERFLOW 2

void vApplicationStackOverflowHook(TaskHandle_t xTask, char *pcTaskName) {
    /* 이름과 TCB를 출력하고 정지 */
}
```

FreeRTOS `include/stack_macros.h`의 주석이 동작을 정확히 적고 있습니다. 1이면 task를 *전환해 내보낼 때* 현재 스택 포인터가 한계를 넘었는지만 보고, 2 이상이면 스택 맨 끝의 초기화 패턴(0xa5a5a5a5 네 워드)이 덮였는지도 봅니다. 그리고 주석 자체가 "이 두 번째 검사도 오버플로를 항상 잡는다고 보장하지 않는다"고 적습니다.

MODE 1은 128워드(512바이트) 스택의 task가 재귀 함수 `deep()`을 부릅니다. `objdump`로 보면 `deep()`은 `push {lr}`와 `sub sp, #68`로 호출당 72바이트를 씁니다. 같은 소스에서 `-DDEPTH=4`~`8`, `20`으로 한 번에 빌드해 돌린 결과입니다. 여섯 빌드 모두 `pxCurrentTCB`(0x20000368)와 `ucHeap`(0x20000390) 주소가 같았습니다.

| 재귀 깊이 | 결과 |
|-----------|------|
| 4~7 | 아무 출력 없음 |
| 8 | `stack overflow hook: task "" (TCB 0x20000600)` |
| 20 | `stack overflow hook: task "dy" (TCB 0x2000060c)` |

hook이 불렸지만 *넘겨받은 정보가 이미 망가져* 있습니다. 같은 펌웨어를 GDB로 보면, task를 만든 직후 `greedy`의 TCB는 0x20000608, 스택 시작(`pxStack`)은 0x20000400이었습니다. 그런데 hook이 받은 TCB 주소는 깊이 20에서 0x2000060c(4바이트 어긋남), 깊이 8에서 0x20000600(8바이트 어긋남)이었습니다. 이름 `"dy"`는 `"greedy"`를 4바이트 뒤에서 읽은 결과와 같습니다. 깊이 8의 hook에서 그 주소의 TCB를 출력하면 `pxStack = 0x0`이고 리스트 포인터가 `xDelayedTaskList1` 같은 커널 변수를 가리키는 등 내용이 어긋나 있었습니다.

이유는 배치에 있습니다. `nm`으로 보면 커널 변수 `pxCurrentTCB`(0x20000368), `pxReadyTasksLists`(0x20000304), `xDelayedTaskList1`(0x200002f0)이 힙 `ucHeap`(0x20000390)보다 *아래*에 있고, `greedy`는 첫 task라 스택이 힙 앞쪽(0x20000400부터)에 잡혔습니다. 스택이 아래로 넘치면 힙 앞부분을 지나 커널 자신의 변수까지 닿을 수 있는 배치입니다. hook이 읽는 `pxCurrentTCB`가 바로 그 영역에 있으니, 검출이 되더라도 보고 내용을 믿을 수 없습니다. 깊이 4~7에서 아무 출력이 없었던 것도 "넘치지 않았다"는 증거가 아닙니다.

정리하면, FreeRTOS 검사는 *오버플로가 있었다는 신호*로는 쓸모 있지만 보고된 이름을 그대로 믿으면 안 되고, 검출되지 않았다고 안전한 것도 아닙니다.

### MSPLIM / PSPLIM (Armv8-M Mainline)

Cortex-M33 같은 Armv8-M Mainline 코어는 스택 한계 레지스터를 가집니다. SP가 한계 아래로 내려가는 push가 일어나면 UsageFault가 나고 CFSR에 STKOF(UFSR 비트 4, CFSR 비트 20)가 섭니다(CMSIS `core_cm33.h`의 `SCB_CFSR_STKOF_Pos`). CMSIS `cmsis_gcc.h`도 `__get_MSPLIM()`/`__set_MSPLIM()`을 Armv8-M Mainline·Baseline 조건 블록 안에만 둡니다.

QEMU `mps2-an505`(Cortex-M33, secure)에서 MSPLIM을 스택 하한으로 두고 재귀를 돌렸습니다. 첫 시도는 UsageFault 핸들러를 평범한 C 함수로 썼고, 스택 하한이 RAM 시작이었습니다.

```text
MSPLIM set, recursing
qemu: fatal: Lockup: can't escalate 3 to HardFault (current priority -1)
```

`-d int` 로그를 보면 순서가 보입니다. 재귀에서 STKOF UsageFault가 났고, 핸들러는 *한계에 붙은 바로 그 MSP* 위에서 돌기 시작해 자기 push에서 다시 STKOF를 냈고, HardFault도 같은 이유로 실패해 lockup에 빠졌습니다. 그래서 두 가지를 고쳤습니다. 핸들러 첫 명령에서 MSPLIM을 0으로 풀고, 링커 스크립트에서 스택 하한 아래 0x200바이트를 비워 핸들러가 쓸 자리를 남겼습니다.

```c
__attribute__((naked)) void UsageFault_Handler(void) {
    __asm volatile("movs r0, #0\n msr msplim, r0\n b UsageFault_C");   /* give the handler room first */
}
```

```text
MSPLIM set, recursing
UsageFault: CFSR=00100000 STKOF=1 sp=380001e8 msplim=00000000
```

CFSR 0x00100000은 비트 20 STKOF 하나뿐입니다. 하한(`_sstack`)은 0x38000200이었고, 핸들러가 비운 공간을 써서 SP가 0x380001e8까지 내려갔습니다. 헤드룸 없이 MSPLIM만 풀었던 중간 시도에서는 핸들러가 RAM 시작(0x38000000) 아래를 건드려 `BFAR 0x37fffff8`의 BusFault(STKERR)로 끝났습니다. **하드웨어 한계 검사도 핸들러가 쓸 스택 자리를 따로 마련해야 의미가 있습니다.**

### High water mark로 미리 잡기

앞 절의 `uxTaskGetStackHighWaterMark()` 값을 CI 테스트에서 task별로 기록하면, 여유가 줄어드는 추세를 오버플로 전에 볼 수 있습니다. 이 값도 실행한 경로에서 관측한 최솟값일 뿐이라는 한계는 같습니다.

## DMA · 캐시 일관성

D-cache가 있는 코어(Cortex-M7 등)에서는 DMA 버퍼와 캐시 내용이 어긋날 수 있습니다. CMSIS 5.9.0 `cachel1_armv7.h`가 주소 범위 단위의 유지보수 함수를 제공합니다.

```c
SCB_CleanDCache_by_Addr(buf, len);        // DMA가 읽기 전에: 캐시의 dirty 데이터를 메모리로
SCB_InvalidateDCache_by_Addr(buf, len);   // DMA가 쓴 뒤에: CPU가 오래된 캐시 줄을 읽지 않게
```

증상은 "DMA로 받은 데이터가 이상하다" 또는 "보낸 데이터가 이전 값이다"로 나타납니다. QEMU의 M-profile 모델로는 캐시 일관성 문제를 재현할 수 없어 이 장에서는 실행하지 않았습니다.

## 보드 쪽 문제 — 계층별로

프로브가 붙지 않거나 리셋이 이상할 때의 계층별 확인은 2장(Vref, 클럭 속도, `connect_assert_srst`)과 3장(OpenOCD 스캔 로그 읽기)에 정리했습니다. 여기서는 리셋 타이밍 옵션만 덧붙입니다. OpenOCD 매뉴얼 기준으로 `adapter srst pulse_width <ms>`는 nSRST를 건 뒤 풀기 전까지 최소 대기 시간, `adapter srst delay <ms>`는 nSRST를 푼 뒤 JTAG 동작을 시작하기 전 대기 시간이며, 매뉴얼은 리셋 버튼에 하드웨어 디바운싱이 있는 보드라면 후자가 필요할 것이라고 적습니다.

## 부팅이 안 될 때 — 확인 순서

앞 장들의 도구로 아래에서 위로 확인합니다. 각 단계는 다음 단계의 전제입니다.

1. 타깃 전압이 보이는가 (프로브의 `Target voltage` 출력, 2장).
2. IDCODE/DPIDR이 읽히는가 (OpenOCD 스캔 로그, 3장의 실패 예와 비교).
3. `dap info`로 ROM table이 읽히는가 (OpenOCD 매뉴얼: MEM-AP의 ROM table 표시).
4. `reset halt` 뒤 PC가 벡터 테이블의 `Reset_Handler`인가 (5장 `fw.hex` 벡터 해독).
5. step이 되는가, 멈추는 곳은 어디인가.
6. CFSR/HFSR에 fault가 남았는가 (이 장).

## 보안 — 잠긴 칩

readout protection을 푸는 명령은 3장에 정리했습니다. OpenOCD의 STM32F2/F4/F7 계열은 `stm32f2x lock`/`unlock`, nRF52는 `target/nrf52.cfg`의 `nrf52_recover`입니다. 보호 레벨별로 무엇이 지워지고 무엇이 영구적인지는 칩 벤더의 레퍼런스 매뉴얼이 정하는 내용이며, 이 시리즈에서는 확인하지 않았습니다.

## RTOS-aware의 한계

이 장에서 직접 확인한 한계입니다.

- 심볼 있는 ELF가 필요하고, FreeRTOS라면 `uxTopUsedPriority`까지 있어야 합니다.
- 디버거가 보여 주는 상태 이름은 RTOS 내부 리스트 기준입니다. `portMAX_DELAY`로 기다리는 task가 Suspended로 보인 것이 그 예입니다.
- 스택 오버플로로 커널 변수가 덮이면, 디버거가 읽는 TCB 목록 자체가 틀립니다. 오버플로 hook이 받은 `pxCurrentTCB`가 4~8바이트 어긋나 있었던 것처럼, RTOS-aware 화면도 같은 메모리를 읽으므로 믿을 수 없게 됩니다.

## 자동화 — fault 정보를 남기기

운영 중인 기기에서는 디버거가 없으므로, fault 핸들러가 위 실험의 정보(쌓인 r0~xPSR, EXC_RETURN, CFSR·HFSR·MMFAR·BFAR)를 *리셋에도 지워지지 않는 영역*에 저장하고 재부팅한 뒤 보고하는 구조를 씁니다.

```c
void fault_diag(uint32_t *sp, uint32_t exc_return) {
    save_fault_record(sp, exc_return, SCB_CFSR, SCB_HFSR, SCB_MMFAR, SCB_BFAR);
    system_reset();                       /* 예: CMSIS NVIC_SystemReset() */
}

int main(void) {
    if (fault_record_present()) report_and_clear_fault_record();
    /* ... */
}
```

`save_fault_record()`가 쓸 영역(백업 SRAM, 리셋 때 0으로 초기화하지 않는 `NOLOAD` 섹션 등)은 칩과 링커 스크립트에 따라 정합니다. 쌓인 PC와 LR만 남아 있어도, 같은 빌드의 ELF와 `addr2line`으로 위 실험처럼 위치를 찾을 수 있습니다.

## 정리

- **Ch 1** RSP — `$payload#cs` 패킷과 `qSupported` 협상.
- **Ch 2** JTAG/SWD/CoreSight — DAP, FPB, DWT, ITM, ETM의 레지스터.
- **Ch 3** OpenOCD — Tcl 서버, 설정 파일, flash driver, RTOS 심볼.
- **Ch 4** J-Link — GDB Server·Commander·RTT·Unlimited Flash Breakpoints.
- **Ch 5** ELF/MAP — LMA/VMA, 링커 스크립트, MAP 진단.
- **Ch 6** Trace — semihosting, ITM/SWO, RTT 모드, ETM.
- **Ch 7 (이 장)** — RTOS task 목록을 메모리에서 읽는 법, CFSR로 읽는 네 가지 fault, 스택 오버플로 검출의 한계와 MSPLIM.

이 장의 실험에서 얻은 요점은 세 가지입니다. HardFault라도 CFSR을 먼저 보고, 쌓인 PC가 의미 없으면 LR을 봅니다. 스택 오버플로 hook의 보고는 이미 망가진 메모리를 읽은 결과일 수 있습니다. 하드웨어 스택 한계도 핸들러가 쓸 자리가 있어야 동작합니다.

## 다음 장 예고

Ch 8 — CXL link training과 LTSSM 상태, 호스트 쪽 `lspci`·`cxl` 도구를 이용한 링크 문제 진단.

## 관련 항목 (시리즈 전체)

- [Ch 1: RSP 프로토콜](/blog/tools/debugging/embedded/chapter01-rsp-protocol)
- [Ch 2: JTAG / SWD / CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)
- [Ch 3: OpenOCD 깊이](/blog/tools/debugging/embedded/chapter03-openocd)
- [Ch 4: J-Link 도구 체인](/blog/tools/debugging/embedded/chapter04-jlink)
- [Ch 5: ELF / MAP](/blog/tools/debugging/embedded/chapter05-elf-map)
- [Ch 6: Trace](/blog/tools/debugging/embedded/chapter06-trace)
- [Ch 8: CXL Link Training 디버깅](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)
- [Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)

## 외부 자료

- [GDB and LLDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — 일반 GDB
- [DWARF and ELF Internals](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview) — ELF 깊이
- [Postmortem Debugging](/blog/tools/debugging/postmortem/chapter01-core-generation) — core dump 분석
- [Cortex-M4 Technical Reference Manual (DDI 0439B)](https://documentation-service.arm.com/static/5f19da2a20b7cf4bc524d99a) — ACTLR, 디버그
- [ARMv7-M Architecture Reference Manual](https://developer.arm.com/documentation/ddi0403/latest/) — 예외 번호, EXC_RETURN, MPU_CTRL (이 글은 DDI 0403E.b를 대조)
- [FreeRTOS-Kernel](https://github.com/FreeRTOS/FreeRTOS-Kernel) — `tasks.c`, `include/stack_macros.h`
- [CMSIS 5.9.0 Core](https://github.com/ARM-software/CMSIS_5/tree/5.9.0/CMSIS/Core/Include) — `core_cm3.h`, `core_cm33.h`, `cachel1_armv7.h`
