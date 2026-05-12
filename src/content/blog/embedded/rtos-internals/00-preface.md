---
title: "Practical RTOS Internals: 서문"
date: 2026-05-12
description: "RTOS를 사용하는 것이 아니라 이해하고 구현하는 법. Scheduler, context switch, memory allocator의 내부 동작을 소스 코드 수준에서 분석합니다."
series: "Practical RTOS Internals"
seriesOrder: 0
tags: [rtos, freertos, zephyr, scheduler, context-switch, embedded, arm, risc-v]
type: tech
featured: true
---

## 이 시리즈를 쓰는 이유

```c
xTaskCreate(vTaskFunction, "Task", 128, NULL, 1, NULL);
```

FreeRTOS 튜토리얼은 대부분 여기서 시작합니다. Task를 만들고, Queue를 쓰고, Semaphore를 사용하는 법을 배웁니다. 그리고 대부분 여기서 끝납니다.

하지만 실무에서는 다른 질문들이 생깁니다:

- "context switch가 정확히 어떻게 일어나지?"
- "이 task가 왜 이렇게 늦게 깨어나지?"
- "메모리가 fragmentation 되는 것 같은데..."
- "tickless 모드에서 타이머가 왜 정확하지 않지?"

API 사용법을 아는 것과 **내부 동작을 이해하는 것**은 완전히 다른 차원의 문제입니다. 이 시리즈는 FreeRTOS, Zephyr, RT-Thread의 소스 코드를 직접 분석하며 이 질문들에 답합니다.

## 대상 독자

1. **RTOS 사용 경험이 있는 엔지니어**
   - API는 쓸 줄 알지만 내부 동작이 궁금한 분
   - "왜 이렇게 동작하지?"에 답을 찾고 싶은 분

2. **자신만의 RTOS를 만들어보고 싶은 분**
   - 학습 목적의 mini-RTOS 구현
   - 기존 RTOS 커스터마이징

3. **RTOS 선택/평가를 해야 하는 분**
   - FreeRTOS vs Zephyr vs ThreadX
   - 프로젝트에 맞는 RTOS 선택 기준

## 시리즈 구성

**총 5개 Part, 45개 글**로 구성됩니다.

RTOS의 핵심 개념부터 소스 코드 분석, 직접 구현, RTOS 비교까지 체계적으로 다룹니다.

---

### Part 1: RTOS Fundamentals (10개)

RTOS의 핵심 개념과 기초를 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 1-01 | RTOS가 필요한 이유 | 슈퍼루프의 한계, 실시간 요구사항 |
| 1-02 | Task와 Thread 개념 | TCB, 상태 머신, 생명 주기 |
| 1-03 | 스케줄링 알고리즘 | RR, Priority-based, EDF, Rate Monotonic |
| 1-04 | Preemption과 Cooperation | 선점형 vs 협력형, trade-off |
| 1-05 | 인터럽트와 RTOS | ISR context, deferred processing |
| 1-06 | 동기화 기초 | Critical section, mutual exclusion |
| 1-07 | 세마포어 개념 | Counting, binary, 사용 패턴 |
| 1-08 | 뮤텍스 개념 | Ownership, recursive, priority inheritance |
| 1-09 | 큐와 메시지 패싱 | Producer-consumer, mailbox |
| 1-10 | 실시간성 분석 | Latency, jitter, deadline, WCET |

---

### Part 2: Scheduler & Context Switch (10개)

RTOS의 심장인 스케줄러와 컨텍스트 스위치를 깊이 분석합니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 2-01 | Ready List 자료구조 | 연결 리스트, 비트맵, O(1) 스케줄러 |
| 2-02 | Blocked List 자료구조 | 타임아웃 관리, 정렬 방식 |
| 2-03 | Scheduler 알고리즘 구현 | 다음 task 선택 로직 |
| 2-04 | Context Switch 원리 | 레지스터 저장/복원, 스택 프레임 |
| 2-05 | ARM Cortex-M Context Switch | PendSV, 어셈블리 분석 |
| 2-06 | ARM Cortex-A Context Switch | SVC, 모드 전환 |
| 2-07 | RISC-V Context Switch | ECALL, mret, CSR |
| 2-08 | Tick과 타이머 | SysTick, 하드웨어 타이머 연동 |
| 2-09 | Tickless 모드 구현 | 저전력, 타이머 보상 알고리즘 |
| 2-10 | Scheduler Latency 측정 | 측정 방법, 최적화 기법 |

---

### Part 3: IPC & Synchronization Internals (10개)

동기화 프리미티브와 IPC의 내부 구현을 분석합니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 3-01 | Critical Section 구현 | Interrupt disable, spin lock |
| 3-02 | 세마포어 내부 구현 | 대기 큐, 카운터 관리 |
| 3-03 | 뮤텍스 내부 구현 | Owner tracking, recursion |
| 3-04 | Priority Inversion 문제 | 원인, 사례, Mars Pathfinder |
| 3-05 | Priority Inheritance 구현 | 동적 우선순위 조정 |
| 3-06 | Priority Ceiling Protocol | 정적 vs 동적 |
| 3-07 | 큐 내부 구현 | Ring buffer, 복사 vs 참조 |
| 3-08 | Event Group 구현 | 비트 플래그, AND/OR 대기 |
| 3-09 | ISR-safe API 설계 | FromISR 패턴, 지연 처리 |
| 3-10 | 데드락 탐지와 회피 | 탐지 알고리즘, timeout 활용 |

---

### Part 4: Memory & Advanced Topics (10개)

메모리 관리와 고급 주제를 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 4-01 | 실시간 메모리 요구사항 | Determinism, fragmentation |
| 4-02 | FreeRTOS heap_1~5 분석 | 각 구현의 특성 비교 |
| 4-03 | TLSF 알고리즘 | Two-Level Segregated Fit |
| 4-04 | 정적 메모리 할당 | Static allocation 패턴 |
| 4-05 | 메모리 풀 구현 | Fixed-size block allocator |
| 4-06 | 스택 오버플로우 탐지 | Canary, MPU 활용 |
| 4-07 | SMP RTOS 설계 | 멀티코어, 로드 밸런싱 |
| 4-08 | Spinlock과 SMP 동기화 | 멀티코어 동기화 기법 |
| 4-09 | Software Timer 구현 | Timer task, callback |
| 4-10 | System Call 구현 | User/Kernel 모드 분리 |

---

### Part 5: RTOS Source Analysis & Comparison (5개)

실제 RTOS 소스 코드를 분석하고 비교합니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 5-01 | FreeRTOS 소스 분석 | tasks.c, queue.c, port.c |
| 5-02 | Zephyr 커널 분석 | k_thread, k_sem, 드라이버 모델 |
| 5-03 | RT-Thread 분석 | 경량 RTOS 구조 |
| 5-04 | RTOS 포팅 가이드 | 새 아키텍처 포팅 절차 |
| 5-05 | RTOS 선택 가이드 | 프로젝트별 선택 기준 |

---

## 분석 대상 RTOS

| RTOS | 버전 | 특징 |
|------|-----|------|
| FreeRTOS | 11.x | 가장 널리 사용, 단순한 구조, AWS IoT 통합 |
| Zephyr | 3.7+ | Linux Foundation, 풍부한 드라이버, devicetree |
| RT-Thread | 5.x | 경량 RTOS, 중국 생태계, 다양한 컴포넌트 |
| ThreadX | 6.x | Azure RTOS, safety certification, 상용 품질 |

## 학습 로드맵

### RTOS 입문자

```
Part 1 (기초) → Part 2 (스케줄러) → Part 5-01 (FreeRTOS 분석)
```

### RTOS 내부 이해

```
Part 2 (스케줄러) → Part 3 (IPC) → Part 4 (메모리)
```

### RTOS 개발자/포팅

```
Part 2 심화 → Part 4 심화 → Part 5 (소스 분석, 포팅)
```

## 핵심 질문

이 시리즈가 답하는 질문들:

- ready list는 어떤 자료구조로 유지되는가?
- preemption point는 정확히 어디인가?
- interrupt tail-chaining이 latency에 어떤 영향을 주는가?
- timeout과 wake-up은 어떤 tick source를 기준으로 계산되는가?
- heap 구현이 fragmentation, determinism, peak memory에 어떤 차이를 만드는가?

이 질문에 답할 수 있으면 특정 RTOS에 묶이지 않고, 새로운 커널을 보더라도 구조를 빠르게 읽어낼 수 있습니다.

## 소스 코드 분석 방법

RTOS 소스는 처음 보면 함수 호출이 얽혀 있어 막막합니다. 이 시리즈에서는 다음 순서로 분석합니다:

1. **Public API entry point**를 찾습니다
2. **내부 자료구조**를 먼저 봅니다
3. **Critical section 경계**를 표시합니다
4. **Scheduler decision point**를 찾습니다
5. **Architecture-dependent assembly**로 내려갑니다

즉, `xTaskCreate()`나 `k_sem_take()` 같은 API에서 시작하되, 결국은 **list, queue, bitmap, stack frame, interrupt mask**까지 내려가서 이해하는 흐름으로 설명합니다.

## 사전 지식

- C 프로그래밍 (포인터, 구조체, 함수 포인터)
- ARM Cortex-M 기초 (레지스터, 인터럽트, 예외)
- 기본적인 RTOS 개념 (task, scheduler, preemption)
- 어셈블리 기초 (ARM 또는 RISC-V)

## 레퍼런스

**서적**
- *Operating System Concepts* (10th ed) - Silberschatz
- *Real-Time Systems* - Jane W. S. Liu
- *Hard Real-Time Computing Systems* (3rd ed) - Buttazzo
- *MicroC/OS-III: The Real-Time Kernel* - Jean Labrosse

**소스 코드**
- [FreeRTOS Kernel](https://github.com/FreeRTOS/FreeRTOS-Kernel)
- [Zephyr Project](https://github.com/zephyrproject-rtos/zephyr)
- [RT-Thread](https://github.com/RT-Thread/rt-thread)

**문서**
- [FreeRTOS Kernel Developer Docs](https://www.freertos.org/Documentation/)
- [Zephyr Documentation](https://docs.zephyrproject.org/)
- [AOSA Book - FreeRTOS Chapter](https://aosabook.org/en/v1/freertos.html)

## 이 시리즈의 목표

이 시리즈를 완주하면:

- **Scheduler 지연 원인**을 자료구조 수준에서 설명할 수 있다
- **Context switch 비용**을 architecture 관점에서 추적할 수 있다
- **동기화 프리미티브**를 직접 구현할 수 있다
- **Allocator/IPC 선택**이 실시간성에 미치는 영향을 비교할 수 있다
- **FreeRTOS와 Zephyr**를 "기능 표"가 아니라 내부 구조 관점에서 평가할 수 있다
- **새로운 RTOS를 분석**할 때 핵심 포인트를 빠르게 파악할 수 있다

---

다음 글: [Part 1-01: RTOS가 필요한 이유](/blog/embedded/rtos-internals/part1-01-why-rtos)
