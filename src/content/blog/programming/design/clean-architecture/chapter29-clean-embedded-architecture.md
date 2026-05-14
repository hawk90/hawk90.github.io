---
title: "Ch 29: Clean Embedded Architecture"
date: 2025-06-02T05:00:00
description: "임베디드에서 Clean Architecture를 적용한다는 것. firmware와 software를 구분하고, HAL로 하드웨어를 격리한다."
tags: [Architecture, Embedded, HAL]
series: "Clean Architecture"
seriesOrder: 29
draft: true
---

## 이 챕터의 메시지

Clean Architecture가 웹 / 엔터프라이즈에만 적용된다는 오해가 있다. Martin은 임베디드 시스템에도 똑같이 적용된다고 본다.

핵심 메시지 — **임베디드 코드의 대부분은 hardware-independent해야 한다**.

## firmware vs software

Martin은 임베디드 세계의 두 단어를 다시 정의한다.

- **firmware** — hardware에 의존하는 코드
- **software** — hardware에 무관한 코드

이 정의에 따르면 대부분의 임베디드 코드는 **software여야 한다**. 그러나 현실에선 firmware로 가득하다.

> "If your code is firmware — that is, if your code is dependent on hardware — then it is firmware. Even if the code is written in C."

언어가 C든 Java든 상관없다. **하드웨어에 의존하면 firmware**다.

## 흔한 안티 패턴

```c
// 흔한 임베디드 코드
void main() {
  GPIO_PORTA = 0xFF;       // 하드웨어 직접 접근
  TIMER_REG = 1000;        // 하드웨어 직접 접근
  
  while (1) {
    if (GPIO_PORTB & 0x01) {  // 비즈니스 로직 안에 하드웨어
      sensor_value = ADC_READ();
      if (sensor_value > 100) {
        GPIO_PORTC |= 0x02;  // 또 하드웨어
      }
    }
  }
}
```

비즈니스 로직과 하드웨어 접근이 한 곳에 섞여 있다. 결과:

- 하드웨어 변경 시 비즈니스 로직도 만진다
- 단위 테스트 불가능 (실제 하드웨어 필요)
- 다른 하드웨어로 이식 어려움

## HAL — Hardware Abstraction Layer

해법은 17장의 경계와 같다. **HAL**(Hardware Abstraction Layer)로 하드웨어를 격리한다.

```c
// hal.h — 인터페이스
typedef struct {
  void (*set_output)(int pin, int value);
  int  (*read_input)(int pin);
  int  (*read_adc)(int channel);
  void (*set_timer)(int us);
} hal_t;

// 비즈니스 로직 (hardware-independent)
void process(hal_t* hal) {
  if (hal->read_input(BUTTON)) {
    int sensor = hal->read_adc(SENSOR);
    if (sensor > 100) {
      hal->set_output(LED, 1);
    }
  }
}

// arm_hal.c — ARM 하드웨어 구현
void arm_set_output(int pin, int v) { GPIOA->ODR |= ...; }
// ... arm_hal 구조체 채움

// x86_hal.c — 시뮬레이션 구현 (테스트용)
void x86_set_output(int pin, int v) { mock_state.pins[pin] = v; }
```

이제 비즈니스 로직은 ARM에서도, x86 시뮬레이션에서도 같은 코드로 돈다. 단위 테스트는 x86_hal로.

## OS 추상화

또 다른 의존 — OS / RTOS. FreeRTOS의 `xTaskCreate`, Zephyr의 `k_thread_create` — 모두 OS-specific.

해법은 또 한 겹의 추상화.

```c
// os.h — OS 추상
typedef struct {
  task_t (*create_task)(void (*fn)(void*), void* arg);
  void   (*delay_ms)(int ms);
  mutex_t (*create_mutex)(void);
} os_t;

// 비즈니스 로직
void worker(os_t* os) {
  while (1) {
    do_work();
    os->delay_ms(100);
  }
}

// freertos_os.c — FreeRTOS 구현
// zephyr_os.c — Zephyr 구현
// posix_os.c — POSIX 구현 (Linux 테스트용)
```

이런 추상화의 좋은 예가 **POSIX**다. 다양한 OS가 같은 POSIX 인터페이스를 구현한다. POSIX에 의존하는 코드는 어떤 POSIX 호환 시스템에서도 동작한다.

임베디드 세계에서는 CMSIS-RTOS가 비슷한 표준화 시도다.

## 임베디드의 Clean Architecture

22장의 동심원을 임베디드 컨텍스트로 옮기면.

```
                ┌──────────────────────┐
                │ Microcontroller Code  │
                │ + Hardware Driver     │
                │                      │
                │  ┌──────────────────┐ │
                │  │  HAL / OS Abst.  │ │
                │  │                  │ │
                │  │  ┌────────────┐  │ │
                │  │  │ Use Cases   │  │ │
                │  │  │             │  │ │
                │  │  │  ┌────────┐ │  │ │
                │  │  │  │Domain   │ │  │ │
                │  │  │  │(센서 처리)│  │ │
                │  │  │  └────────┘ │  │ │
                │  │  └────────────┘  │ │
                │  └──────────────────┘ │
                └──────────────────────┘
```

같은 4겹. 의존성 규칙도 동일 — 안쪽으로만.

## 임베디드 특유의 제약

임베디드에서는 추가 제약이 있다.

**1. 메모리 / CPU 제한**

추상화는 비용이 든다. 가상 함수 호출(C++) 또는 함수 포인터 호출(C)이 정적 호출보다 느림. 그 비용을 감당할 수 있는지 측정.

**2. 결정성(determinism)**

real-time 시스템에서는 호출 비용이 예측 가능해야 한다. 함수 포인터를 통한 호출은 분기 예측이 어려워 안 좋을 수 있다.

**3. 코드 크기**

작은 MCU(8KB Flash 같은)에서는 모든 추상화가 부담. 가장 핵심만 추상화한다.

이런 제약은 추상화를 막는 게 아니라 **신중하게** 만든다. 정말 필요한 곳에만 HAL을 두고, 나머지는 직접 접근.

## 점진적 적용

처음부터 완전한 Clean Architecture를 적용하지 않아도 된다. 점진적으로.

1. 가장 자주 변하는 부분부터 HAL 도입
2. 비즈니스 로직을 hardware 호출에서 분리
3. 단위 테스트 가능한 부분 늘리기
4. 점차 firmware 비율 줄이기

가장 중요한 단일 진보 — **단위 테스트 가능한 비즈니스 로직**. 임베디드도 PC에서 테스트할 수 있는 부분이 있다는 것을 인식.

## 정리

- 임베디드 코드의 대부분은 **software여야** — hardware-independent
- **HAL**로 하드웨어를 격리
- **OS 추상화**로 RTOS / OS 격리
- 22장의 동심원이 임베디드에도 적용
- 임베디드 제약 (메모리, 결정성, 코드 크기)을 고려해 **신중한** 추상화
- 점진적 적용 — 가장 자주 변하는 부분부터

## 다음 장 예고

여기서 Part V(아키텍처)가 끝난다. 다음 장(30)부터는 Part VI — **세부 사항**. DB, Web, Framework가 디테일임을 더 깊이 다룬다.

## 관련 항목

- [Ch 17: 경계](/blog/programming/design/clean-architecture/chapter17-boundaries-drawing-lines) — HAL이 정확히 그 경계
- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — 동심원
- [Embedded Security 시리즈](/blog/embedded/embedded-security/) — 임베디드 컨텍스트 더 깊이
