---
title: "Practical RTOS Internals: 서문"
date: 2026-05-12
description: "RTOS를 사용하는 것이 아니라 이해하고 구현하는 법. Scheduler, context switch, memory allocator의 내부 동작을 분석합니다."
series: "Practical RTOS Internals"
seriesOrder: 0
tags: [rtos, freertos, zephyr, scheduler, context-switch, embedded]
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

API 사용법을 아는 것과 **내부 동작을 이해하는 것**은 완전히 다른 차원의 문제입니다.

## RTOS를 "이해한다"는 것

RTOS를 이해한다는 것은:

1. **Scheduler가 어떻게 다음 task를 선택하는지** 설명할 수 있다
2. **Context switch 시 어떤 레지스터가 저장되는지** 안다
3. **Priority inversion이 왜 발생하고 어떻게 해결되는지** 안다
4. **Tickless 모드가 어떻게 전력을 절약하는지** 안다
5. **실시간 시스템에서 malloc을 쓰면 안 되는 이유**를 안다

이 시리즈는 FreeRTOS와 Zephyr의 소스 코드를 직접 분석하며 이 질문들에 답합니다.

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

총 3개 Part, 15개 글로 구성됩니다:

| Part | 주제 | 글 수 |
|------|-----|-------|
| 1 | Scheduler & Context Switch | 5 |
| 2 | Advanced Topics | 5 |
| 3 | RTOS Comparison | 5 |

### Part 1: Scheduler & Context Switch

RTOS의 핵심인 스케줄러와 컨텍스트 스위치를 다룹니다:

- Scheduler 자료구조 (ready list, blocked list)
- Context switch assembly 분석 (ARM Cortex-M)
- Tickless 구현
- ISR entry/exit 처리
- Latency 측정 방법

### Part 2: Advanced Topics

실무에서 마주치는 고급 주제들:

- SMP RTOS 설계
- Real-time memory allocator (TLSF, heap_4)
- IPC 내부 구현 (Queue, Semaphore, EventGroup)
- POSIX compatibility layer
- System call 구현

### Part 3: RTOS Comparison

주요 RTOS들의 비교 분석:

- FreeRTOS 소스 분석
- Zephyr 소스 분석
- VxWorks/QNX 참고
- 선택 가이드라인

## 분석 대상 RTOS

| RTOS | 버전 | 특징 |
|------|-----|------|
| FreeRTOS | 10.x | 가장 널리 사용, 단순한 구조 |
| Zephyr | 3.x | Linux Foundation 기반, 범용성과 확장성이 강함 |
| RT-Thread | 5.x | 경량 RTOS 계열에서 참고할 만한 오픈소스 구현 |

### 구현 관점에서 주목할 점

- **Zephyr**: 다양한 보드/드라이버/서브시스템 구성이 풍부함
- **FreeRTOS**: 구조가 단순해 커널 내부 분석과 학습에 적합함
- **RISC-V 확장**: Cortex-M 중심 설명과 함께 RISC-V 포팅 관점도 같이 볼 가치가 있음

## 이 시리즈가 강조하는 질문

RTOS를 공부할 때 API 이름보다 더 중요한 질문들이 있습니다:

- ready list는 어떤 자료구조로 유지되는가
- preemption point는 정확히 어디인가
- interrupt tail-chaining이 latency에 어떤 영향을 주는가
- timeout과 wake-up은 어떤 tick source를 기준으로 계산되는가
- heap 구현이 fragmentation, determinism, peak memory에 어떤 차이를 만드는가

이 질문에 답할 수 있으면 특정 RTOS에 묶이지 않고, 새로운 커널을 보더라도 구조를 빠르게 읽어낼 수 있습니다.

## 소스 코드를 어떻게 읽을 것인가

RTOS 소스는 처음 보면 함수 호출이 얽혀 있어 막막합니다. 이 시리즈에서는 다음 순서로 분석합니다:

1. public API entry point를 찾습니다
2. 내부 자료구조를 먼저 봅니다
3. critical section 경계를 표시합니다
4. scheduler decision point를 찾습니다
5. architecture-dependent assembly로 내려갑니다

즉, `xTaskCreate()`나 `k_sem_take()` 같은 API에서 시작하되, 결국은 **list, queue, bitmap, stack frame, interrupt mask**까지 내려가서 이해하는 흐름으로 설명합니다.

## 이 시리즈에서 다루지 않는 것

범위를 좁히기 위해 다음은 우선순위를 낮춥니다:

- RTOS API 사용법 입문
- GUI task 설계나 middleware 포팅 일반론
- safety certification 문서 절차 자체
- 상용 RTOS의 라이선스/조달 비교

핵심은 "무엇을 호출할까"보다 **커널이 왜 그렇게 동작하는가**입니다.

## 실무에서 바로 연결되는 포인트

내부 구조를 이해하면 다음 문제들이 훨씬 빨리 풀립니다:

- 특정 task만 주기적으로 deadline miss가 나는 문제
- ISR 이후 깨어나야 할 task가 예상보다 늦는 문제
- heap 사용량은 충분한데 allocation 실패가 나는 문제
- mutex는 잡히는데 system throughput이 계속 떨어지는 문제
- tickless 전환 이후 sleep/wakeup 타이밍이 흔들리는 문제

## 사전 지식

이 시리즈를 읽기 전에 다음을 알고 있으면 좋습니다:

- C 프로그래밍 (포인터, 구조체)
- ARM Cortex-M 기초 (레지스터, 인터럽트)
- 기본적인 RTOS 개념 (task, scheduler, preemption)

## 레퍼런스

**서적**
- *Operating System Concepts* - Silberschatz
- *Real-Time Systems* - Jane W. S. Liu
- *Hard Real-Time Computing Systems* - Buttazzo

**소스 코드**
- [FreeRTOS Kernel](https://github.com/FreeRTOS/FreeRTOS-Kernel)
- [Zephyr Project](https://github.com/zephyrproject-rtos/zephyr)

**문서**
- [FreeRTOS Kernel Book](https://www.freertos.org/Documentation/)
- [Zephyr Documentation](https://docs.zephyrproject.org/)
- [AOSA Book - FreeRTOS Chapter](https://aosabook.org/en/v1/freertos.html)

## 이 시리즈의 목표

이 시리즈를 다 읽고 나면 적어도 다음은 가능해야 합니다:

- scheduler 지연 원인을 자료구조 수준에서 설명하기
- context switch 비용을 architecture 관점에서 추적하기
- allocator/IPC 선택이 실시간성에 미치는 영향을 비교하기
- FreeRTOS와 Zephyr를 "기능 표"가 아니라 내부 구조 관점에서 평가하기

---

다음 글: [Part 1-1: Scheduler 자료구조 분석](/blog/embedded/rtos-internals/part1-01-scheduler)
