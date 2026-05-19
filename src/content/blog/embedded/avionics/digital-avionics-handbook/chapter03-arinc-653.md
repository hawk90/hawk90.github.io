---
title: "Ch 3: ARINC-653 partitioning"
date: 2026-05-25T03:00:00
description: "Avionics partitioned OS의 표준 인터페이스 — space + time partitioning, APEX."
series: "Digital Avionics Handbook"
seriesOrder: 3
tags: [avionics, arinc-653, partitioning, apex]
draft: true
---

## 한 줄 요약

> **"ARINC-653 = avionics partitioned OS API 표준"** — APEX 인터페이스 + space·time isolation.

## ARINC-653 위치

```text
표준명:
  ARINC-653 — Avionics Application Software Standard Interface
  Aeronautical Radio, Inc. 발간
  
역사:
  Part 1 (1996) — original
  Part 2 — extended (file·sampling protocol)
  Part 3·4 — conformity·conformance test
  최신 — Part 1 Supplement 5 (2020)
  
지원 RTOS:
  Wind River VxWorks 653
  Green Hills INTEGRITY-178 tuMP
  Lynx LynxOS-178
  SYSGO PikeOS
  DDC-I Deos
  자체 또는 군 OS
```

ARINC-653 — *avionics IMA의 OS API 표준*.

## APEX — Application/EXecutive Interface

```text
APEX 카테고리:

Partition Management:
  GET_PARTITION_STATUS
  SET_PARTITION_MODE (Normal·Idle·Cold/Warm Start)

Process Management (within partition):
  CREATE_PROCESS
  START·STOP
  SUSPEND·RESUME
  GET_PROCESS_ID·STATUS

Time Management:
  PERIODIC_WAIT (next period)
  TIMED_WAIT (sleep N ms)
  GET_TIME

Interpartition Communication:
  Queueing Port — FIFO message
  Sampling Port — latest value

Intrapartition Communication:
  Buffer — FIFO (same partition processes)
  Blackboard — single overwriteable
  Semaphore — counting
  Event — synchronization

Health Monitor:
  REPORT_APPLICATION_MESSAGE
  Error handler

File System (Part 2):
  CREATE_FILE·OPEN·READ·WRITE·CLOSE
```

APEX = *application이 RTOS와 대화하는 API*.

## Partition 구조

```text
Partition = {
    Memory region (separate)
    Time slice (allocated CPU window)
    Process(es) (within)
    Ports (communication)
    Permissions
}

Process (within partition):
    Priority
    Period (periodic) 또는 aperiodic
    Stack
    Stack size
    Deadline
    Time capacity

각 partition 안에 *1+ processes*
Process 간 — partition 내부 IPC (buffer·event·semaphore)
```

Partition = process group + 자원. Linux process != ARINC partition.

## Time Partitioning — Schedule

```text
Major Frame:
  전체 schedule cycle
  보통 50·100·200·500 ms

Minor Frames:
  Major frame을 N partition으로 분할
  각 partition별 *time slice*

예 — 100 ms major frame:
  ┌────────────────────────────────────┐
  │ P1: 0-20 ms (20 ms slice)          │
  │ P2: 20-50 ms (30 ms slice)         │
  │ P3: 50-70 ms (20 ms slice)         │
  │ P4: 70-90 ms (20 ms slice)         │
  │ Idle: 90-100 ms (10 ms slack)      │
  └────────────────────────────────────┘
  ← cycle 반복

각 partition — 자기 slice만 CPU 사용
다른 partition — *영향 0* (time isolation)
```

Schedule — *static configuration*. Runtime 변경 안 됨.

## Space Partitioning

```text
Memory Isolation:
  각 partition별 *별도 physical memory region*
  MMU (또는 MPU)로 enforce
  
MMU configuration:
  Partition 1 region (RX): 0x10000000 - 0x10100000
  Partition 1 region (RW): 0x10100000 - 0x10200000
  Partition 2 region (RX): 0x20000000 - 0x20080000
  Partition 2 region (RW): 0x20080000 - 0x20100000
  ...
  
Hardware enforcement:
  Partition 1 → addr 0x20000010 access
  → MMU fault
  → Health Monitor invoked
  → Partition 1 stopped (또는 restart)
```

Hardware MMU = *enforcement*. Software bug catch.

## Sampling Port

```text
Sampling Port:
  Latest-value semantics
  Sender — 새 값으로 overwrite
  Receiver — 마지막 값 read (timestamp 있음)
  
Use case:
  Sensor data (latest reading)
  Health status (current state)
  
Example:
  CREATE_SAMPLING_PORT (name="imu_data",
                       size=64,
                       direction=SOURCE,
                       period=10 ms)
  
  WRITE_SAMPLING_MESSAGE (port, data, 64)
  
  반대 partition:
  READ_SAMPLING_MESSAGE (port, &buffer, &length, &timestamp)
```

Sampling — *N:M 가능*. Overwrite, no FIFO.

## Queueing Port

```text
Queueing Port:
  FIFO message queue
  Sender·receiver 1:1
  Reliable delivery (queue full 시 wait·timeout·discard)
  
Use case:
  Command·event message
  Telemetry data
  Discrete event

Example:
  CREATE_QUEUING_PORT (name="cmd_in",
                      max_messages=10,
                      max_msg_size=128,
                      direction=DESTINATION)
  
  SEND_QUEUING_MESSAGE (port, data, 64, TIMEOUT_NONE)
  
  반대 partition:
  RECEIVE_QUEUING_MESSAGE (port, TIMEOUT_INFINITE, 
                          &buffer, &length)
```

Queueing — *FIFO + reliable*. 1:1만 가능.

## Health Monitor — 정의

```text
Health Monitor (HM):
  Partition error 발생 시 *action 결정*
  
Error levels (hierarchical):
  Process level    → partition level    → module level
  
Error types:
  - Deadline missed
  - Application error (REPORT_APP_MSG)
  - Numerical error (divide by zero)
  - Illegal request (API violation)
  - Stack overflow
  - Memory violation (MMU fault)
  - Hardware exception
  
Actions (configurable):
  - IGNORE — continue
  - WARM_START — process or partition restart
  - COLD_START — full restart
  - IDLE — partition stop
  - SHUTDOWN — module
```

HM = *configurable error policy*. PSAC·plan에 명시.

## HM Action 예 — Table

```text
HM Configuration Table (XML 보통):

<HM_Module>
  <Error_Level>MODULE</Error_Level>
  <Error_ID>POWER_FAILURE</Error_ID>
  <Action>SHUTDOWN</Action>
</HM_Module>

<HM_Partition>
  <Error_Level>PARTITION</Error_Level>
  <Error_ID>DEADLINE_MISSED</Error_ID>
  <Action>WARM_START</Action>
</HM_Partition>

<HM_Process>
  <Error_Level>PROCESS</Error_Level>
  <Error_ID>STACK_OVERFLOW</Error_ID>
  <Action>STOP_PROCESS</Action>
</HM_Process>
```

각 fault — *partition·system 영향 최소화*.

## Partition Modes

```text
Partition Operating Modes:

IDLE:
  Partition stop, processes not running
  
COLD_START:
  Initialization phase
  Process create
  Resource init
  
WARM_START:
  Recovery 후 init
  State preserved across restart (가능)
  
NORMAL:
  Normal execution
  Periodic·aperiodic processes run

Mode transition:
  SET_PARTITION_MODE() API
  HM action으로 강제 가능
```

각 mode — *명시적 transition*.

## ARINC-653 Configuration File 예

```text
XML Configuration (typical):

<Module>
  <Module_Name>FCC_IMA_1</Module_Name>
  <Memory_Size>16777216</Memory_Size>
  
  <Partition>
    <Name>flight_control</Name>
    <Identifier>1</Identifier>
    <Memory_Size>2097152</Memory_Size>
    <Period>10000000</Period>   <!-- 10 ms -->
    <Duration>5000000</Duration> <!-- 5 ms -->
    <Offset>0</Offset>
    <Criticality>LEVEL_A</Criticality>
  </Partition>
  
  <Partition>
    <Name>navigation</Name>
    <Identifier>2</Identifier>
    <Memory_Size>1048576</Memory_Size>
    <Period>20000000</Period>   <!-- 20 ms -->
    <Duration>3000000</Duration> <!-- 3 ms -->
    <Offset>5000000</Offset>     <!-- 5 ms -->
    <Criticality>LEVEL_B</Criticality>
  </Partition>
  
  <Module_Schedule>
    <Major_Frame>20000000</Major_Frame> <!-- 20 ms -->
  </Module_Schedule>
</Module>
```

Configuration — *immutable at runtime*. Build time fixed.

## Partition Code Sample

```c
#include <apex/apex.h>

PROCESS_ID_TYPE pid;
RETURN_CODE_TYPE rc;
SAMPLING_PORT_ID_TYPE imu_port;

void main_process(void) {
    while (1) {
        SAMPLING_PORT_VALIDITY_TYPE valid;
        unsigned char buf[64];
        MESSAGE_SIZE_TYPE len;
        
        READ_SAMPLING_MESSAGE(imu_port, buf, &len, &valid, &rc);
        if (rc == NO_ERROR && valid == VALID) {
            // Process IMU data
            compute_attitude(buf);
        }
        
        PERIODIC_WAIT(&rc);     /* wait until next period */
    }
}

void partition_main(void) {
    /* Initialization phase (COLD_START) */
    PROCESS_ATTRIBUTE_TYPE attr = {
        .NAME = "control_loop",
        .ENTRY_POINT = main_process,
        .STACK_SIZE = 4096,
        .BASE_PRIORITY = 50,
        .PERIOD = 10000000,     /* 10 ms */
        .TIME_CAPACITY = 5000000, /* 5 ms */
        .DEADLINE = SOFT
    };
    
    CREATE_SAMPLING_PORT("imu_data", 64, DESTINATION, 
                        10000000, &imu_port, &rc);
    
    CREATE_PROCESS(&attr, &pid, &rc);
    START(pid, &rc);
    
    /* Transition to NORMAL */
    SET_PARTITION_MODE(NORMAL, &rc);
    
    /* Idle until error */
    while (1)
        PERIODIC_WAIT(&rc);
}
```

ARINC-653 API — *C 기반 호환*. C++도 wrapper로 사용.

## Multi-core ARINC-653

```text
Multi-core 도전:
  ARINC-653 originally — single-core
  Multi-core — cache·memory bus shared
  → Robust partitioning *시간 보장* 어려움
  
ARINC-653 Part 5 (2015):
  Multi-core extension
  Affinity·core allocation
  
RTOS 지원:
  VxWorks 653 multi-core
  INTEGRITY-178 tuMP
  PikeOS multi-core
  
Cross-core noise:
  Cache contention
  Memory bus contention
  Interrupt routing
  
Mitigation:
  Core affinity per partition
  Cache partitioning (locking)
  Memory bandwidth allocation
  CAST-32A — Multi-core processors in IMA
```

Multi-core IMA — *최신 도전*. Cert authority (FAA·EASA) 적극 관심.

## CAST-32A — Multi-core 인증

```text
CAST-32A (Position Paper):
  Multi-core processor in safety-critical
  FAA·EASA·NAA 공동
  
주요 objective:
  - Interference channel 식별
    - Cache
    - Memory bus
    - Interrupt
    - Peripheral
  
  - Mitigation:
    - Lockstep core (DAL A)
    - Single-active core
    - Static partitioning
  
  - Worst-case analysis (WCET multi-core)
  
대안:
  AMC 20-193 (EASA·FAA 2021)
  Multi-core 인증 guidance 강화
```

Multi-core IMA = *active research·certification*. F-35 Block 4·B787-X 등.

## ARINC-653 vs POSIX·Real-time OS

```text
General-purpose RTOS (POSIX):
  Threads·processes
  Standard scheduling
  No isolation enforcement
  No certification framework
  
ARINC-653:
  Avionics-specific
  Partition (process group + isolation)
  Major/minor frame scheduling
  Health Monitor
  Cert-friendly
  
Mapping:
  Process (ARINC) ≈ Thread (POSIX)
  Partition ≈ Process group + cgroup + namespace
  
사용:
  Aircraft·LV — ARINC-653 (cert)
  Linux·MCU — POSIX-style
  Embedded RTOS (FreeRTOS·Zephyr) — POSIX subset
```

ARINC-653 — *avionics 인증* 친화. 일반 RTOS는 도용 어려움.

## ARINC-653 RTOS Vendor

```text
Wind River VxWorks 653:
  Major user: B787, A380, A350 (일부)
  Multi-core (3.0+)
  
Green Hills INTEGRITY-178 tuMP:
  Major user: F-22, F-35, B777X
  Multi-core MILS
  Highest certification
  
Lynx LynxOS-178:
  Major user: F-22, B787 일부
  Linux 호환 (POSIX)
  
SYSGO PikeOS:
  Major user: A350, A220, Eurofighter
  Hypervisor-based
  유럽 강세

DDC-I Deos:
  Smaller market
  Real-time stack analyzer
  
Open source / 자체:
  AIR (Air Force·NASA collab) — research
  POK (Polytechnic) — academic
```

각 RTOS — *수십만 달러+ license + 인증 kit*.

## ARINC-653 in Practice — 예

```text
B787 Common Core System example:

CCR Cabinet (Right):
  GPM modules:
    GPM-1: VxWorks 653
      Partition 1: Flight Display (Honeywell) — DAL B
      Partition 2: FMS (Honeywell) — DAL A
      Partition 3: Engine indication — DAL B
      Partition 4: Cabin alerting — DAL C
    
    GPM-2:
      Partition 1: Auto-pilot — DAL A
      Partition 2: Auto-throttle — DAL A
      Partition 3: Speed control — DAL B
      Partition 4: Flight envelope — DAL A
  
  AFDX network: 1 Gbps

각 partition — independent supplier
공유 platform = Wind River VxWorks 653 (인증 packet)
```

## 한국 ARINC-653 도입

```text
KAI KF-21 보라매:
  Mission computer — ARINC-653 채택
  Wind River VxWorks 653 또는 자체
  자세한 사항 비공개
  
KARI 위성 (KOMPSAT):
  ECSS 기반 + 일부 ARINC-653-like 채택
  
인노스페이스·페리지:
  민간 LV — federated 위주
  ARINC-653 RTOS 비용 부담
  자체 RTOS 또는 commercial fallback
  
한국 자체 ARINC-653 OS:
  ETRI·KAIST 연구
  Production 도입 부족
```

한국 — *commercial ARINC-653 도입* + 자체 RTOS 연구.

## 자주 하는 실수

> ⚠️ Partition = Linux process 가정

```text
"Partition = process group"
→ Linux와 본질 다름
→ Time·space·hardware isolation 강제
```

→ ARINC-653 = *hardware-enforced*.

> ⚠️ Schedule slack 없음

```text
Major frame 100% 채움
→ jitter·overrun catch 못 함
```

→ 10~20% slack 권장.

> ⚠️ HM action 부족

```text
"Error → just ignore"
→ Fault propagate
```

→ Each error → *partition·module action*.

> ⚠️ Multi-core ARINC-653 검증 부족

```text
"Single-core ARINC-653 → multi-core 자동 적용"
→ CAST-32A·AMC 20-193 evidence 필요
```

→ Multi-core interference analysis.

## 정리

- ARINC-653 — *avionics partitioned OS* API 표준.
- **APEX** = Application/EXecutive interface.
- Partition = *space + time + fault* isolation.
- Sampling vs Queueing port — interpartition comm.
- Health Monitor — fault action policy.
- Multi-core — CAST-32A·AMC 20-193 *active 인증 영역*.
- Vendor — VxWorks·INTEGRITY·LynxOS·PikeOS.
- 한국 — *commercial 도입 + 자체 연구*.

다음 편은 **Avionics Computer Architecture**.

## 관련 항목

- [Ch 2: IMA](/blog/embedded/avionics/digital-avionics-handbook/chapter02-ima)
- [Ch 4: Computer Architecture](/blog/embedded/avionics/digital-avionics-handbook/chapter04-computer-architecture)
- [Ch 11: Avionics SW (RTOS)](/blog/embedded/avionics/digital-avionics-handbook/chapter11-rtos)
- [Developing Safety-Critical SW Ch 5: Design](/blog/embedded/avionics/developing-safety-critical/chapter05-design)
