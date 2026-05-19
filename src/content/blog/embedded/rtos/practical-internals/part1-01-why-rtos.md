---
title: "1-01: RTOS가 필요한 이유"
date: 2026-05-08T01:00:00
description: "Super-loop의 한계 — 모든 작업이 직렬화되어 deadline 보장 못 함. RTOS가 답 — preemption과 우선순위로 실시간성 확보."
series: "Practical RTOS Internals"
seriesOrder: 1
tags: [rtos, super-loop, realtime, preemption]
draft: true
---

## 한 줄 요약

> **"deadline이 있으면 RTOS"** — 슈퍼루프는 빠른 작업과 느린 작업이 *직렬화*되어 실시간성 깨짐.

## 시작 — 가장 단순한 임베디드 프로그램

```c
int main(void) {
    init_hw();
    while (1) {
        read_sensors();      // 1 ms
        compute_pid();       // 0.5 ms
        update_actuators();  // 0.3 ms
        log_uart();          // 5 ms  ← 느림
    }
}
```

이 "**Super-Loop**" 패턴은:
- *구조가 단순*하다
- *디버그가 쉽다* (실행 순서가 코드 그대로)
- *오버헤드가 0*

작은 MCU 프로젝트라면 이걸로 충분합니다.

## 한계 — 가장 느린 작업이 *전체*를 결정

위 예에서 한 사이클 = 1 + 0.5 + 0.3 + 5 = **6.8 ms**.

만약 **PID 제어가 1 kHz** (1 ms 마다) 필요하다면? 슈퍼루프에서 PID는 *6.8 ms마다* 실행됩니다. **제어 불가**.

해결책 후보:

### (1) UART 로깅을 비동기로

```c
while (1) {
    read_sensors();
    compute_pid();
    update_actuators();
    if (uart_can_send()) log_uart_nonblocking();
}
```

→ 일부 해결되지만 *모든 작업을 비동기로 재작성* 필요. 코드 복잡도 폭증.

### (2) 인터럽트로 빠른 작업 분리

```c
void TIM1_IRQHandler(void) {
    read_sensors();
    compute_pid();
    update_actuators();
}
```

→ 인터럽트 우선순위로 PID 분리. 하지만 *복잡한 작업을 ISR에서 처리하면* ISR이 길어져 다른 인터럽트 막힘.

### (3) **RTOS**

```c
void pid_task(void *arg) {
    while (1) {
        read_sensors();
        compute_pid();
        update_actuators();
        vTaskDelay(1);   // 1 ms 정확 주기
    }
}

void log_task(void *arg) {
    while (1) {
        log_uart();      // 5 ms — 다른 task에 영향 없음
    }
}
```

**RTOS가 우선순위·preemption을 관리** → PID가 정확히 1 ms 주기로 실행, log는 *남는 시간*에만.

## RTOS의 3가지 핵심 가치

### 1. Preemption — 강제 전환

저우선 task가 실행 중이라도 *고우선 task가 ready 되면 즉시 전환*. 슈퍼루프의 *모든 일이 끝나기 전엔 다음 못 함* 문제 해결.

### 2. 우선순위 (Priority)

각 task에 *0-31* (또는 0-255) 우선순위 부여. *높은 게 항상 먼저*.

### 3. 동기화 프리미티브

- **Mutex** — 공유 자원 보호
- **Semaphore** — task 간 신호
- **Queue** — 메시지 전달
- **Event group** — 다중 조건 대기

ISR과 task, task와 task 사이의 *안전한 통신*.

## 실시간성 — Hard vs Soft

| | Soft Real-Time | Hard Real-Time |
| --- | --- | --- |
| **Deadline miss 결과** | 품질 저하 | 시스템 실패 |
| **예** | 비디오 frame drop, 게임 FPS | 자동차 ESC, 인공 호흡기, ABS |
| **확률** | 99% 충분 | 100% 필요 |
| **OS 요구** | Linux로도 가능 | RTOS 또는 bare-metal |

RTOS는 **hard real-time** 보장 — *수학적으로 deadline 만족 증명 가능*.

## RTOS는 *Linux와 다르다*

| | RTOS (FreeRTOS·Zephyr·VxWorks) | Linux |
| --- | --- | --- |
| **타깃** | MCU (수 KB ~ 수 MB) | SoC (수십 MB+) |
| **Footprint** | 5-50 KB | 5-50 MB |
| **Boot time** | 수 ms | 수 초 |
| **Scheduler latency** | < 10 µs | 보통 < 1 ms (PREEMPT_RT < 100 µs) |
| **Determinism** | High | Best-effort |
| **MMU 요구** | 없음 (MPU 선택) | 필수 |
| **Driver 모델** | 단순 | 복잡 (devicetree, sysfs, etc.) |

Linux도 PREEMPT_RT로 RTOS-like가 가능합니다. 2024년 9월 Linux 6.12에 mainline merge되어 더 이상 별도 패치가 아닙니다. 다만 *진짜 µs-deterministic*은 여전히 RTOS 영역입니다.

## 언제 RTOS를 *안 써야* 하나

- **단일 task만 있는 단순 시스템** — LED 깜빡임, 단순 센서 read
- **deadline 매우 느슨** (≥ 100 ms)
- **메모리 매우 작음** (≤ 4 KB SRAM)
- **인증·검증 비용이 RTOS 도입 cost > 가치**

이 경우 *bare-metal + interrupt-driven*이 더 깔끔.

## 흔한 RTOS 4종

| RTOS | 특징 | 라이선스 | 대표 사용 |
| --- | --- | --- | --- |
| **FreeRTOS** | 가장 널리 사용, 단순 | MIT | AWS IoT, Arduino |
| **Zephyr** | Linux Foundation, 풍부한 driver | Apache 2.0 | Nordic, Intel, NXP |
| **RT-Thread** | 경량, 중국 생태계 | Apache 2.0 | 산업용 IoT |
| **Eclipse ThreadX** | safety 인증 (DO-178B), 2024-01 오픈소스화 | EPL-2.0 | 구 Azure RTOS |
| **Apache NuttX** | POSIX-compliant, mission-critical | Apache 2.0 | PX4 드론, NASA Ingenuity |
| **VxWorks** | 항공·우주 hard real-time | 상용 ($) | 우주 탐사선, 군 |
| **QNX** | 마이크로커널, 자동차 | 상용 ($) | BMW, Bosch |

## 이 시리즈에서

10 챕터로 *RTOS의 기초*를:
- Task·스케줄링·preemption (1-04)
- ISR·동기화 (5-6)
- Semaphore·Mutex·Queue (7-9)
- 실시간성 분석 (10)

Part 2부터는 *내부 구현* — 스케줄러 자료구조, context switch, IPC 내부.

## 정리

- **Super-Loop**은 단순하나 *모든 작업이 직렬화* — 빠른 작업이 느린 작업 뒤에 줄.
- RTOS = **Preemption + 우선순위 + 동기화 프리미티브**.
- *Hard real-time*은 RTOS 또는 bare-metal로만.
- 작은·단순 시스템엔 *bare-metal*이 더 깔끔. 5+ task 또는 deadline < 10ms면 RTOS.

다음 편은 **Task와 Thread 개념** — TCB·상태 머신·생명 주기.

## 관련 항목

- [1-02: Task와 Thread 개념](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
