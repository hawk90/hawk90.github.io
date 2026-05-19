---
title: "6-05: Mutex 활용"
date: 2026-05-14T19:00:00
description: "Mutex와 binary semaphore의 차이, priority inheritance, recursive lock, timeout, ownership 규칙을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 67
tags: [recipes, rtos, mutex]
---

## 한 줄 요약

> **"Mutex = 누구나 못 들어오게 막는 문 + 누가 들어가 있는지 명패."** 명패가 있어서 priority inheritance와 owner-only release가 가능합니다.

## 어떤 상황에서 쓰나

두 task가 같은 SPI bus, 같은 sensor의 shadow buffer, 같은 flash sector에 접근할 때 mutex가 필요합니다. 한 task가 transaction을 시작했는데 다른 task가 도중에 끼어들면 byte stream이 섞이고, sensor 보정값이 깨지고, flash write가 부분 실패로 끝납니다.

함정은 mutex 대신 binary semaphore를 쓰는 것입니다. 코드는 비슷하지만 priority inheritance가 없어 Mars Pathfinder 사고가 작은 board에서도 똑같이 재현됩니다.

## 핵심 개념

```text
                      Mutex            Binary semaphore
owner 추적            yes              no
priority inheritance  yes              no
ISR에서 give          금지             가능
recursive 옵션        있음             없음
용도                  mutual excl.     signal
```

Owner 추적이 핵심입니다. Mutex는 "누가 잠갔는지"를 기억하므로 그 task에게만 release 권한이 있고, 더 높은 priority의 task가 기다리면 owner의 priority를 일시적으로 올려 빨리 끝내게 합니다.

```text
hold time이 길면          PI가 있어도 jitter 증가
nested lock 두 개 이상    deadlock 위험 (lock order 필요)
ISR에서 mutex             금지 (owner가 없으므로)
```

## 코드 / 실제 사용 예

### 기본 SPI bus 보호

```c
SemaphoreHandle_t spi_mutex;

void spi_xfer_safe(const uint8_t *tx, uint8_t *rx, size_t n) {
    if (xSemaphoreTake(spi_mutex, pdMS_TO_TICKS(100)) != pdTRUE) {
        log_err("spi busy");
        return;
    }
    spi_xfer(tx, rx, n);
    xSemaphoreGive(spi_mutex);
}

int main(void) {
    spi_mutex = xSemaphoreCreateMutex();
}
```

Take와 give를 쌍으로 묶고, timeout을 두어 deadlock이 영구화되지 않도록 합니다. `portMAX_DELAY`는 디버깅이 끝난 코드에만 씁니다.

### RAII 스타일 (C++ scope guard)

```cpp
class mutex_guard {
public:
    explicit mutex_guard(SemaphoreHandle_t m) : m_(m) {
        xSemaphoreTake(m_, portMAX_DELAY);
    }
    ~mutex_guard() { xSemaphoreGive(m_); }
private:
    SemaphoreHandle_t m_;
};

void do_spi(void) {
    mutex_guard g(spi_mutex);
    spi_write(buf, len);
    /* return 또는 exception 어디서든 자동 release */
}
```

C++을 쓰는 환경에서는 `std::lock_guard` 같은 패턴을 그대로 적용할 수 있습니다. Release 누락이 원천 차단됩니다.

### Static mutex

```c
static StaticSemaphore_t spi_mutex_buf;
SemaphoreHandle_t spi_mutex;

void init(void) {
    spi_mutex = xSemaphoreCreateMutexStatic(&spi_mutex_buf);
}
```

`*Static` 변종은 heap을 사용하지 않고 미리 할당된 storage에 mutex를 만듭니다. 양산 firmware의 표준 선택입니다.

### Recursive mutex

```c
SemaphoreHandle_t log_mtx;

void log_line(const char *s);
void log_with_prefix(const char *p, const char *s) {
    xSemaphoreTakeRecursive(log_mtx, portMAX_DELAY);
    write_raw(p);
    log_line(s);    /* 내부에서 또 take */
    xSemaphoreGiveRecursive(log_mtx);
}

void log_line(const char *s) {
    xSemaphoreTakeRecursive(log_mtx, portMAX_DELAY);
    write_raw(s);
    xSemaphoreGiveRecursive(log_mtx);
}

int main(void) {
    log_mtx = xSemaphoreCreateRecursiveMutex();
}
```

같은 task가 여러 번 take 할 수 있고, 같은 수만큼 give 해야 풀립니다. 보통은 비재귀로 설계가 가능한지 먼저 고민하는 것이 좋습니다.

### Priority inheritance 시연

```c
void task_low(void *arg) {       /* priority 1 */
    for (;;) {
        xSemaphoreTake(m, portMAX_DELAY);
        busy_work(50);            /* High가 들어오면 PI로 priority 5 boost */
        xSemaphoreGive(m);
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void task_med(void *arg) {       /* priority 3 */
    for (;;) {
        busy_work(100);           /* PI 없으면 Low를 영원히 preempt */
        vTaskDelay(pdMS_TO_TICKS(1));
    }
}

void task_high(void *arg) {      /* priority 5 */
    for (;;) {
        xSemaphoreTake(m, portMAX_DELAY);
        do_critical();
        xSemaphoreGive(m);
    }
}
```

PI가 켜진 FreeRTOS mutex라면 Low가 High의 priority로 잠시 boost되어 빨리 release합니다. PI가 없으면 Med이 끝없이 끼어들어 High가 영원히 못 들어옵니다.

### Timeout으로 deadlock 감지

```c
if (xSemaphoreTake(m, pdMS_TO_TICKS(200)) != pdTRUE) {
    log_err("possible deadlock");
    /* recovery — abort transaction */
    return ERR_BUSY;
}
```

`portMAX_DELAY`는 양산 펌웨어에서는 가능한 한 피하고, 합리적인 timeout과 fallback path를 둡니다.

### Lock ordering 규칙

```c
/* 항상 address 오름차순으로 lock */
void transfer(account_t *a, account_t *b, int amount) {
    account_t *first  = (a < b) ? a : b;
    account_t *second = (a < b) ? b : a;
    xSemaphoreTake(first->mtx,  portMAX_DELAY);
    xSemaphoreTake(second->mtx, portMAX_DELAY);
    /* ... */
    xSemaphoreGive(second->mtx);
    xSemaphoreGive(first->mtx);
}
```

여러 mutex를 잡는 모든 코드가 같은 순서로 잡으면 deadlock이 발생할 수 없습니다.

## 측정 / 성능 비교

```text
연산                             시간 (Cortex-M4 72 MHz)
mutex take (uncontended)         0.9 µs
mutex give (no waiter)           0.7 µs
mutex take (PI boost 발생)       3.1 µs
recursive take                   1.1 µs
mutex contended → 다음 깨움      6.4 µs
```

PI boost는 ready list rebalancing 비용이 들지만 µs 단위입니다. Hold time이 ms라면 PI cost는 무시할 만합니다.

```text
PI on vs off (Mars Pathfinder 재현, Med busy_work 100 ms)
PI on              High wait  = 50 ms
PI off             High wait  = 영구 굶음
```

## 자주 보는 함정

> ISR에서 mutex

```c
void IRQ(void) {
    xSemaphoreTakeFromISR(m, ...);   /* 존재하지 않음 */
}
```

Mutex는 owner가 task이므로 ISR이 사용할 수 없습니다. ISR과 task 사이 신호는 semaphore나 notification으로 합니다.

> Owner가 아닌 task가 give

```c
/* task A가 take, task B가 give */
xSemaphoreGive(spi_mutex);   /* error 반환 — 풀리지 않음 */
```

FreeRTOS는 error를 반환만 하고 silently 무시합니다. 디버깅 시 mutex가 영영 안 풀리면 owner 확인부터 합니다.

> 긴 hold time

```c
xSemaphoreTake(m, ...);
printf_to_uart(big);    /* 수십 ms */
xSemaphoreGive(m);
```

PI가 있어도 hold가 길면 jitter가 망가집니다. 공유 자원 접근만 lock 안에 두고, 가공과 로깅은 밖에서 합니다.

> Recursive를 기본으로

```c
SemaphoreHandle_t m = xSemaphoreCreateRecursiveMutex();   /* 무조건 recursive */
```

Recursive는 비재귀로 표현 가능한 구조까지 모호하게 만듭니다. 호출 그래프를 다시 보면 비재귀로 풀리는 경우가 많습니다.

> Timeout 없이 portMAX_DELAY 남용

```c
xSemaphoreTake(m, portMAX_DELAY);   /* 모든 곳에서 무한 대기 */
```

Deadlock이 발생해도 reset 외에 빠져나올 길이 없습니다. 운영 환경에서는 timeout과 logging을 항상 둡니다.

## 정리

- Mutex의 본질은 owner 추적입니다. 그 위에 PI, owner-only release, recursive가 얹힙니다.
- ISR은 mutex를 쓰지 않습니다. semaphore나 task notification으로 신호합니다.
- Hold time은 µs 단위로 유지하고, 가공은 lock 밖에서 합니다.
- 여러 mutex를 잡을 때는 글로벌한 lock order 규칙을 정해 deadlock을 막습니다.
- Recursive는 마지막 수단입니다. 가능하면 비재귀로 설계합니다.
- 양산은 static 변종에 합리적 timeout과 디버깅 로깅을 표준화합니다.

다음 편은 **Queue 활용**입니다. Producer-consumer, by-value와 by-pointer, backpressure를 다룹니다.

## 관련 항목

- [PRTOS 1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [PRTOS 3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [PRTOS 3-05: Priority Inheritance](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
- [PRTOS 3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [9-07: Spinlock vs Mutex](/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex)
