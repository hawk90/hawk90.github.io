---
title: "Ch 8: NASA cFS — Core Flight System Framework"
date: 2026-05-18T08:00:00
description: "NASA cFE·OSAL·PSP·apps. Software Bus message-based architecture. 미션 사례·채택."
series: "Launch Vehicle Flight Software"
seriesOrder: 8
tags: [avionics, cfs, nasa, flight-software, framework]
draft: true
---

## 한 줄 요약

> **"NASA cFS = open-source flight SW framework"** — message bus 기반 app architecture.

## cFS Architecture

```text
+-----------------------------+
|    Mission-specific Apps    |   (LC·DS·SCH·HK·... + user apps)
+-----------------------------+
|        cFE (Core Flight     |
|         Executive)           |
|  ES·SB·TIME·EVS·TBL·FS      |
+-----------------------------+
|   OSAL (OS Abstraction)     |
+-----------------------------+
|   PSP (Platform Support)    |
+-----------------------------+
|   RTOS (VxWorks·RTEMS·POSIX) |
+-----------------------------+
|   Hardware (RAD750·Cortex)  |
+-----------------------------+
```

NASA GSFC 시작 → *Apache 2.0 open source*.

## cFE — 4대 핵심 Service

1. **Executive Services (ES)** — App lifecycle (start·stop·restart), System health monitoring, Reset·startup, Memory utilization
2. **Software Bus (SB)** — Message routing (publish/subscribe), CCSDS message format, Inter-app communication
3. **Time Services (TIME)** — Spacecraft time management, CCSDS time codes, Time correlation
4. **Event Services (EVS)** — Event message generation, Filtering·subscription, Onboard logging

추가

- **Table Services (TBL)** — runtime configuration
- **File Services (FS)** — file system abstraction

## OSAL — OS Abstraction

```c
#include "osapi.h"

uint32 task_id;
OS_TaskCreate(&task_id, "MY_TASK", entry_func, NULL,
              STACK_SIZE, PRIORITY, 0);

osal_id_t mutex;
OS_MutSemCreate(&mutex, "MY_MUTEX", 0);
OS_MutSemTake(mutex);
OS_MutSemGive(mutex);
```

OSAL — *VxWorks·RTEMS·POSIX·FreeRTOS* abstraction. Code portability.

## PSP — Platform Support Package

```c
/* PSP — chip·board specific */
CFE_PSP_Restart(uint32 reset_type);
CFE_PSP_GetTime(...);
CFE_PSP_WriteToBuf(...);
CFE_PSP_ReadFromBuf(...);
```

각 hardware (RAD750·Cortex-A·LEON)별 *PSP layer* 존재.

## Software Bus — Pub/Sub

```c
/* App initialization */
CFE_SB_PipeId_t pipe;
CFE_SB_CreatePipe(&pipe, 32, "MY_PIPE");

/* Subscribe to MID (Message ID, = CCSDS APID) */
CFE_SB_Subscribe(CFE_SB_ValueToMsgId(MY_APID), pipe);
CFE_SB_Subscribe(CFE_SB_ValueToMsgId(CMD_APID), pipe);

/* Main loop */
while (CFE_ES_RunLoop(&run_flag)) {
    CFE_SB_Buffer_t *msg;
    CFE_SB_ReceiveBuffer(&msg, pipe, CFE_SB_PEND_FOREVER);
    
    CFE_SB_MsgId_t mid;
    CFE_MSG_GetMsgId(&msg->Msg, &mid);
    
    if (CFE_SB_MsgIdToValue(mid) == MY_APID) {
        process_telemetry(msg);
    } else if (CFE_SB_MsgIdToValue(mid) == CMD_APID) {
        handle_command(msg);
    }
}
```

App 간 *direct call 없음* — *message bus 통과*. Fault isolation.

## App 구조

```c
/* CFS app skeleton */
void MyApp_Main(void) {
    CFE_Status_t status;
    
    /* Init */
    status = MyApp_Init();
    if (status != CFE_SUCCESS) {
        CFE_ES_ExitApp(CFE_ES_RunStatus_APP_INIT_ERROR);
    }
    
    /* Main loop */
    while (CFE_ES_RunLoop(&MyApp_RunStatus)) {
        CFE_ES_PerfLogEntry(MYAPP_MAIN_TASK_PERF_ID);
        
        CFE_SB_Buffer_t *msg;
        CFE_SB_ReceiveBuffer(&msg, MyApp_CmdPipe, CFE_SB_PEND_FOREVER);
        MyApp_ProcessMsg(msg);
        
        CFE_ES_PerfLogExit(MYAPP_MAIN_TASK_PERF_ID);
    }
    
    CFE_ES_ExitApp(CFE_ES_RunStatus_APP_EXIT);
}

void CFE_PSP_Main(void) {
    /* PSP loads cFE */
    /* cFE loads apps from filesystem */
}
```

표준 *startup·main loop·cleanup* 패턴.

## Mission Apps — 표준 cFS Apps

- **SCH (Scheduler)** — 주기 task wakeup, Activity table 기반
- **HK (Housekeeping)** — Telemetry collection, Compose HK packet
- **LC (Limit Checker)** — Sensor value 한계 체크, Out-of-range → event
- **DS (Data Storage)** — Telemetry to flash, Replay capability
- **CS (Checksum)** — Memory integrity, Periodic checksum
- **FM (File Manager)** — File operations, Directory listing
- **MM (Memory Manager)** — Memory dump·load, Critical patching

각 app — *github.com/nasa/* repository 공개.

## Table — Runtime Config

```c
/* Table definition */
typedef struct {
    uint16_t parameter1;
    uint16_t parameter2;
    float    coefficients[10];
} MyApp_Table_t;

CFE_TBL_Handle_t tbl_handle;

/* Register */
CFE_TBL_Register(&tbl_handle, "MyTbl", sizeof(MyApp_Table_t),
                  CFE_TBL_OPT_DEFAULT, NULL);

/* Load from file */
CFE_TBL_Load(tbl_handle, CFE_TBL_SRC_FILE, "/cf/my_table.tbl");

/* Access */
MyApp_Table_t *tbl;
CFE_TBL_GetAddress((void**)&tbl, tbl_handle);
use(tbl->parameter1);
```

Mission ops가 *table file upload*로 parameter 변경 — *reflash 없이*.

## Event Service

```c
/* Event message — onboard log + downlink */
CFE_EVS_Register(NULL, 0, CFE_EVS_BINARY_FILTER);

CFE_EVS_SendEvent(MY_EVENT_ID, CFE_EVS_EventType_INFORMATION,
                    "Sensor X reading: %d", value);

/* Filtering */
CFE_EVS_BinFilter_t filters[] = {
    {MY_EVENT_ID, 0x0000},   /* every occurrence */
    {ERR_EVENT_ID, 0x0010},  /* every 16th */
};
```

Event = *structured telemetry message*. Mission ops가 *event-driven 분석*.

## Performance Monitoring

```c
CFE_ES_PerfLogEntry(PERF_ID);
do_work();
CFE_ES_PerfLogExit(PERF_ID);

/* Per-task CPU usage·timing */
CFE_ES_GetMemPoolStats(&stats, mempool);
```

Onboard profiling — downlink 가능.

## Mission 사례

NASA flight missions using cFS

| Mission | 연도 |
|---|---|
| LADEE (Lunar Atmosphere) | 2013 |
| MMS (Magnetospheric MultiScale) | 2015 |
| ICESat-2 | 2018 |
| Lucy (asteroid) | 2021 |
| SWOT | 2022 |
| Artemis 1 (SLS) | 2022 |

공개된 mission apps — Github에 *전체 source 공개*. Educational·commercial use OK.

NASA mission *생태계 표준*.

## cFS Bundles

- **github.com/nasa/cFS** — 공식 starter bundle, Cortex-M·A·RAD750 build support
- **github.com/nasa-itc/nos3** — NASA Operational Simulator, Full mission sim
- **github.com/nasa-jpl/F-Prime** — alternative framework, Mars Helicopter Ingenuity 사용

## OS Support

OSAL backends

- VxWorks (workhorse, RAD750·LEON)
- RTEMS (NASA·ESA)
- Linux (development·sim)
- POSIX (generic)
- FreeRTOS (Cortex-M, in progress)

LV에서 *VxWorks·RTEMS*가 일반.

## Build·Deploy

```bash
git clone https://github.com/nasa/cFS
cd cFS

# Tools
./run_test_setup.sh

# Build for Linux (dev)
make SIMULATION=native prep
make
make install

# Run
cd build/exe/cpu1
./core-cpu1
```

데모용 — *Linux에서 즉시 실행*. Mission용 — *target cross-compile*.

## Apps Build

```c
/* Mission-specific App */
target_link_libraries(my_app PUBLIC
    cfe-core
    psp-pc-linux
    osal
)

/* CMake로 통합 */
```

App = *별도 ELF + dynamic load*. Reload 가능.

## Korean 적용 — KARI·Spacecraft

KARI 일부 mission이 cFS 활용을 검토 중입니다.

- **KOMPSAT (다목적실용위성)** — 자체 framework 위주
- **KSLV-II 누리 LV** — 자체 RTEMS·VxWorks app, cFS-like architecture (message bus)
- **미래** — Lunar mission·cube sat에서 cFS 채택 증가 전망

cFS — *오픈 + 검증* = 한국 mission *적합도 ↑*.

## SBN — Software Bus Network

```c
/* Multi-node cFS */
/* Each CPU runs cFS instance */
/* SBN distributes messages over network */

cpu1: app A subscribes MID 0x100
cpu2: app B publishes MID 0x100
→ message transparently delivered cpu2 → cpu1
```

Distributed mission (multi-CPU spacecraft) — SBN으로 *cFS 노드 묶음*.

## F´ (F-Prime) — JPL Alternative

JPL F-Prime

- C++-based framework
- Component·port model
- Mars Helicopter Ingenuity 사용 (PX4 위)
- Lunar Lander missions

다른 design philosophy — Statically connected, Type-safe ports, XML-driven generation.

NASA — *cFS (GSFC) vs F-Prime (JPL)* 두 표준. 다음 chapter.

## 자주 하는 실수

> ⚠️ Direct function call between apps

```c
/* App A에서 */
extern void other_app_func(int);
other_app_func(42);   /* 직접 호출 — encapsulation 깨짐 */
```

→ Software Bus message.

> ⚠️ Mission-specific OSAL 수정

```c
/* OSAL 함수 자체 변경 */
```

→ *PSP layer*에서 platform-specific 처리. OSAL은 *공용 유지*.

> ⚠️ Table 없이 hardcoded

```c
#define GAIN 1.5   /* recompile 필요 */
```

→ Table로 *mission ops가 upload*.

> ⚠️ Event 없이 printf

```c
printf("Sensor reading: %d\n", val);
```

→ `CFE_EVS_SendEvent` — *structured + filtering*.

## 정리

- cFS = **cFE + OSAL + PSP + apps**.
- **Software Bus**가 모든 app 통신 — *fault isolation*.
- **Time·Event·Table·File** service 표준.
- NASA mission 표준 — *LADEE·MMS·Lucy·Artemis*.
- **Apache 2.0** = commercial·educational OK.
- **F-Prime**은 JPL alternative.
- 한국 — 미래 mission에 채택 가능성 ↑.

다음 편은 **F-Prime**.

## 관련 항목

- [Ch 7: CCSDS Data Link](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter07-ccsds-data-link)
- [Ch 9: F-Prime](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter09-fprime)
