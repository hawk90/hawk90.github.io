---
title: "6-04: Semaphore 활용"
date: 2026-05-14T18:00:00
description: "Binary semaphore signaling, counting semaphore resource pool, ISR-to-task wake-up 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 66
tags: [recipes, rtos, semaphore]
---

## 한 줄 요약

> **"Semaphore는 count를 가진 신호입니다."** Binary는 0/1 한 비트, counting은 N개의 자원을 한 줄로 관리합니다. Mutex와 달리 owner가 없어서 ISR이 자유롭게 give 할 수 있습니다.

## 어떤 상황에서 쓰나

ADC 변환이 끝났음을 task에 알리고 싶을 때, EXTI button 한 번 눌렸음을 task에 전달할 때, UART RX FIFO에 byte가 들어왔음을 신호할 때처럼 ISR에서 task로 가는 흐름에 가장 자주 등장합니다. Mutex는 task와 task 사이인 데 반해, semaphore는 한쪽 방향 신호이기 때문에 ISR에서도 자연스럽게 쓸 수 있습니다.

또 하나는 동시에 N개만 허용하는 자원 풀입니다. DMA channel 4개, BLE connection slot 6개처럼 갯수가 정해진 자원은 counting semaphore가 가장 단순한 답입니다.

## 핵심 개념

| 종류 | 값 | 용도 |
|------|-----|------|
| Binary semaphore | 0 또는 1 | ISR 신호 |
| Counting semaphore | 0 ~ N | 자원 풀 |
| Mutex | 0 또는 1 + owner | mutual exclusion |

Semaphore의 두 가지 핵심 동작입니다.

```text
take    count > 0이면 count--, 아니면 block (timeout 가능)
give    count++, wait중인 task가 있으면 가장 높은 priority를 깨움
```

Mutex와 달리 어떤 task든 give 할 수 있고, ISR에서도 `*FromISR` 변종으로 give 할 수 있습니다. 대신 priority inheritance가 없어 long hold가 우선순위 역전을 일으킵니다.

## 코드 / 실제 사용 예

### Binary semaphore — ISR signaling

```c
SemaphoreHandle_t adc_done;

void ADC_IRQHandler(void) {
    ADC1->SR &= ~ADC_SR_EOC;
    BaseType_t hp = pdFALSE;
    xSemaphoreGiveFromISR(adc_done, &hp);
    portYIELD_FROM_ISR(hp);
}

void task_processor(void *arg) {
    for (;;) {
        if (xSemaphoreTake(adc_done, pdMS_TO_TICKS(100)) == pdTRUE) {
            process_samples();
        } else {
            log_warn("ADC timeout");
        }
    }
}

int main(void) {
    adc_done = xSemaphoreCreateBinary();
    /* ... */
}
```

ISR에서 한 줄, task에서 한 줄이면 polling이 사라집니다. CPU usage가 0%에 가깝게 떨어지고 latency도 한 자릿수 µs입니다.

### Counting semaphore — resource pool

```c
SemaphoreHandle_t dma_slots;    /* DMA channel 4개 */

void task_xfer(void *arg) {
    for (;;) {
        xSemaphoreTake(dma_slots, portMAX_DELAY);     /* 빈 channel 대기 */
        int ch = alloc_dma_channel();
        start_transfer(ch);
        wait_complete(ch);
        free_dma_channel(ch);
        xSemaphoreGive(dma_slots);
    }
}

int main(void) {
    dma_slots = xSemaphoreCreateCounting(4, 4);    /* max=4, initial=4 */
}
```

자원이 모두 사용 중이면 take에서 block 합니다. 자원이 풀리는 순간 가장 높은 priority의 대기 task부터 깨워줍니다.

### Counting semaphore — event count

```c
SemaphoreHandle_t pkt_count;

void RADIO_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    for (int n = pending_packets(); n > 0; n--)
        xSemaphoreGiveFromISR(pkt_count, &hp);
    portYIELD_FROM_ISR(hp);
}

void task_parser(void *arg) {
    for (;;) {
        xSemaphoreTake(pkt_count, portMAX_DELAY);   /* packet 1개 처리 */
        parse_one();
    }
}

int main(void) {
    pkt_count = xSemaphoreCreateCounting(64, 0);   /* max=64, initial=0 */
}
```

ISR이 몇 개 들어왔는지 count에 누적해두면 task가 놓치지 않고 처리할 수 있습니다. Binary 한 비트로는 이런 누적이 불가능합니다.

### Notification — 더 가벼운 대안

```c
TaskHandle_t target;

void EXTI_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    vTaskNotifyGiveFromISR(target, &hp);
    portYIELD_FROM_ISR(hp);
}

void task_btn(void *arg) {
    target = xTaskGetCurrentTaskHandle();
    for (;;) {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
        handle_button();
    }
}
```

Target task가 정확히 하나일 때는 task notification이 semaphore보다 빠르고 RAM도 적게 씁니다. 4 byte 정도 절약됩니다.

### Synchronization barrier

```c
SemaphoreHandle_t s1, s2;     /* 둘 다 binary */

void task_a(void *arg) {
    for (;;) {
        do_part_a();
        xSemaphoreGive(s1);
        xSemaphoreTake(s2, portMAX_DELAY);
    }
}

void task_b(void *arg) {
    for (;;) {
        xSemaphoreTake(s1, portMAX_DELAY);
        do_part_b();
        xSemaphoreGive(s2);
    }
}
```

두 task가 매 cycle 만나도록 하는 단순한 rendezvous입니다. Event group을 쓰면 더 깔끔하지만, 2-way라면 semaphore 두 개로 충분합니다.

### Static semaphore

```c
static StaticSemaphore_t sem_buf;
SemaphoreHandle_t s;

void init(void) {
    s = xSemaphoreCreateBinaryStatic(&sem_buf);   /* heap 사용 0 */
}
```

양산 firmware에서는 가급적 `*Static` 변종을 써서 heap fragmentation을 원천 차단합니다.

## 측정 / 성능 비교

Cortex-M4 72 MHz에서 측정한 latency입니다.

```text
패턴                              latency
ISR → semaphore give → task wake   5.8 µs
ISR → task notification → wake     3.2 µs
mutex take/give (uncontended)      0.9 µs
counting semaphore take (count>0)  1.1 µs
```

Notification이 semaphore보다 약 두 배 빠릅니다. 1:1 신호라면 거의 항상 notification이 더 낫습니다.

RAM 사용량:

| 종류 | 크기 |
|------|------|
| binary semaphore (dynamic) | 80 B |
| binary semaphore (static) | 80 B (heap 0) |
| task notification | 4 B (TCB 내장) |

자원이 빠듯한 MCU에서는 notification으로 모아 두면 RAM이 분명히 줄어듭니다.

## 자주 보는 함정

> ISR에서 `Take` 호출

```c
void IRQ(void) {
    xSemaphoreTakeFromISR(s, &hp);   /* 안 됨 */
}
```

ISR은 block 할 수 없으니 take는 의미가 없습니다. ISR에서는 give만 합니다.

> `*FromISR` 변종을 빼먹음

```c
void IRQ(void) {
    xSemaphoreGive(s);    /* 보통 crash 또는 race */
}
```

ISR 전용 API를 안 쓰면 internal critical section이 어긋납니다. 컴파일 에러가 안 나니 주의해야 합니다.

> Counting semaphore의 초기값을 max로

```c
xSemaphoreCreateCounting(64, 64);   /* 모든 packet을 받았다고 거짓 신호 */
```

event count 용도라면 initial은 0이어야 합니다. Resource pool 용도라면 max와 같게 둡니다.

> Semaphore로 mutual exclusion

```c
xSemaphoreCreateBinary();   /* mutex 대신 사용 */
```

Owner가 없으니 priority inheritance가 없습니다. SPI bus 같은 자원 보호에는 mutex를 써야 합니다.

> Stale signal

```c
xSemaphoreGive(s);
xSemaphoreGive(s);   /* binary는 두 번째가 무시됨 */
```

Binary semaphore는 count가 0 또는 1이므로 두 번 give 해도 1로 유지됩니다. 이벤트가 누적되어야 하면 counting을 씁니다.

## 정리

- Semaphore는 count 있는 신호로, ISR이 자유롭게 give 할 수 있습니다.
- Binary는 1:1 신호, counting은 자원 풀과 event count에 씁니다.
- `*FromISR`을 항상 ISR에서 사용하고, `portYIELD_FROM_ISR`을 잊지 않습니다.
- 1:1 신호는 task notification이 더 빠르고 가볍습니다.
- Mutual exclusion에는 semaphore가 아니라 mutex를 쓰는 것이 안전합니다.
- 양산은 `*Static` 변종으로 heap을 0으로 만듭니다.

다음 편은 **Mutex 활용**입니다. Priority inheritance와 recursive lock을 다룹니다.

## 관련 항목

- [PRTOS 1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [PRTOS 3-02: Semaphore Implementation](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [6-05: Mutex 활용](/blog/embedded/modern-recipes/part6-05-mutex-usage)
- [6-06: Queue 활용](/blog/embedded/modern-recipes/part6-06-queue-usage)
