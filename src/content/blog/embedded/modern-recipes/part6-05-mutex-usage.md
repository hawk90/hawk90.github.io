---
title: "RTOS Mutex 활용 — Recursive·Priority Inheritance 적용"
slug: "embedded/modern-recipes/part6-05-mutex-usage"
date: 2026-04-15T09:04:00
description: "Mutex와 binary semaphore의 차이, priority inheritance, recursive lock, timeout, ownership 규칙을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 67
tags: [recipes, rtos, mutex]
topics: ["embedded"]
---

## 한 줄 요약

> **"Mutex = 누구나 못 들어오게 막는 문 + 누가 들어가 있는지 명패."** 명패가 있어서 priority inheritance와 owner-only release가 가능합니다.

## 어떤 상황에서 쓰나

두 task가 같은 SPI bus, 같은 buffer, 같은 flash sector를 쓸 때 mutex로 한 번에 한 task만 들어가게 합니다. 한 task의 transaction 도중 다른 task가 끼어들면 두 transaction의 byte가 섞입니다.

실행 환경은 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)과 같습니다(FreeRTOS V11.2.0 `ARM_CM3` + `heap_4`, `configASSERT` 정의, QEMU 11.1.3 `mps2-an385` `-icount shift=5`). 아래 코드 중 `spi_xfer()`, `log_err()`, `write_raw()` 같은 함수는 애플리케이션 함수이고, 실행한 코드는 "측정" 절에 있습니다.

mutex 대신 binary semaphore를 쓰면 코드는 거의 같지만 priority inheritance가 없습니다. 아래 측정에서 그 차이가 우선순위 높은 task의 대기 18 tick과 68 tick으로 나타났습니다.

## 핵심 개념

| 속성 | Mutex | Binary semaphore |
|------|-------|-------------------|
| owner 추적 | yes | no |
| priority inheritance | yes | no |
| ISR에서 사용 | 불가(`semphr.h`: "Mutex type semaphores cannot be used from within interrupt service routines") | `xSemaphoreGiveFromISR()` |
| recursive 옵션 | 있음 | 없음 |
| 용도 | mutual excl. | signal |

Owner 추적이 핵심입니다. Mutex는 "누가 잠갔는지"를 기억하므로 그 task에게만 release 권한이 있고, 더 높은 priority의 task가 기다리면 owner의 priority를 일시적으로 올려 빨리 끝내게 합니다.

| 상황 | 결과 |
|---|---|
| hold time이 길면 | PI가 있어도 기다리는 task는 hold time만큼 기다림 |
| 여러 mutex를 다른 순서로 잡음 | deadlock (아래 lock ordering) |

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

Take와 give를 쌍으로 묶고, timeout을 두어 lock을 못 얻은 경우를 알 수 있게 합니다.

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

C++이면 scope를 벗어날 때 소멸자가 give하므로, 중간 `return`에서 give를 빠뜨리는 실수가 없어집니다.

### Static mutex

```c
static StaticSemaphore_t spi_mutex_buf;
SemaphoreHandle_t spi_mutex;

void init(void) {
    spi_mutex = xSemaphoreCreateMutexStatic(&spi_mutex_buf);
}
```

`*Static` 변종은 heap 대신 호출자가 넘긴 `StaticSemaphore_t`에 mutex를 만듭니다.

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

같은 task가 여러 번 take 할 수 있고, 같은 수만큼 give 해야 풀립니다. 비재귀 mutex를 같은 task가 두 번 take하면 두 번째 take가 자기 자신을 기다립니다.

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

FreeRTOS mutex는 High가 기다리기 시작하면 lock을 쥔 Low의 priority를 High의 priority로 올리므로, Med가 ready가 되어도 Low가 먼저 돌아 lock을 놓습니다. binary semaphore에는 이 상속이 없어 Med가 Low를 밀어냅니다. 아래 측정이 이 구조를 돌린 결과입니다.

### Timeout으로 deadlock 감지

```c
if (xSemaphoreTake(m, pdMS_TO_TICKS(200)) != pdTRUE) {
    log_err("possible deadlock");
    /* recovery — abort transaction */
    return ERR_BUSY;
}
```

timeout은 그 lock의 정상 hold time보다 길게 두고, 넘으면 기록하고 transaction을 포기합니다.

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

## 측정

### Priority inheritance: mutex와 binary semaphore

Low(우선순위 1)가 lock을 잡고 20 tick의 일을 하는 동안, High(5)가 tick 2에 lock을 청하고 Med(3)가 tick 3부터 50 tick을 계산합니다. lock을 mutex와 binary semaphore로 바꿔 High가 기다린 tick을 쟀습니다.

```c
/* pi.c: Low (prio 1) holds the lock for 20 ticks of work, High (prio 5)
   asks for it at tick 2, Med (prio 3) computes 50 ticks from tick 3.
   Lock is a mutex, or a binary semaphore with -DUSE_BINARY. */
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

static SemaphoreHandle_t lock;
static void spin(TickType_t n) {                 /* n ticks of CPU work */
    TickType_t done = 0, last = xTaskGetTickCount();
    while (done < n) { TickType_t now = xTaskGetTickCount();
        if (now != last) { done++; last = now; } }
}

static void low(void *a) { (void)a;
    xSemaphoreTake(lock, portMAX_DELAY);
    spin(20);                                    /* counts only ticks it ran */
    xSemaphoreGive(lock);
    for (;;) vTaskDelay(1000);
}
static void med(void *a) { (void)a; vTaskDelay(3); spin(50); for (;;) vTaskDelay(1000); }
static void high(void *a) { (void)a;
    vTaskDelay(2);
    TickType_t t0 = xTaskGetTickCount();
    xSemaphoreTake(lock, portMAX_DELAY);
    pr("%s: High asked at tick %u, got it at tick %u (waited %u)\n",
#ifdef USE_BINARY
       "binary semaphore",
#else
       "mutex",
#endif
       (unsigned)t0, (unsigned)xTaskGetTickCount(), (unsigned)(xTaskGetTickCount() - t0));
    hosted_exit(0);
}

int main(void) {
#ifdef USE_BINARY
    lock = xSemaphoreCreateBinary(); xSemaphoreGive(lock);
#else
    lock = xSemaphoreCreateMutex();
#endif
    xTaskCreate(low, "L", 256, NULL, 1, NULL);
    xTaskCreate(med, "M", 256, NULL, 3, NULL);
    xTaskCreate(high, "H", 256, NULL, 5, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```bash
./build.sh pi.c              && qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel pi.elf
./build.sh pi.c -DUSE_BINARY && qemu-system-arm ... -kernel pi.elf
```

```text
mutex: High asked at tick 2, got it at tick 20 (waited 18)
binary semaphore: High asked at tick 2, got it at tick 70 (waited 68)
```

mutex에서는 Low가 High의 우선순위를 물려받아 남은 18 tick을 Med보다 먼저 끝냈고, binary semaphore에서는 Med의 50 tick이 끼어 High가 68 tick을 기다렸습니다. QEMU icount의 tick이라 보드의 시간은 아니지만 두 설정의 차이는 Med의 50 tick 그대로입니다.

### Owner가 아닌 task의 give

```c
/* nonowner.c: task A takes a mutex, task B gives it */
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
extern void pr(const char *, ...); extern void hosted_exit(int);
static SemaphoreHandle_t m;
static void a(void *p) { (void)p; xSemaphoreTake(m, portMAX_DELAY); pr("A took the mutex\n"); for (;;) vTaskDelay(1000); }
static void b(void *p) { (void)p; vTaskDelay(1); pr("B gives it\n"); xSemaphoreGive(m); pr("B: give returned\n"); hosted_exit(0); }
int main(void) {
    m = xSemaphoreCreateMutex();
    xTaskCreate(a, "A", 256, NULL, 2, NULL);
    xTaskCreate(b, "B", 256, NULL, 1, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```text
A took the mutex
B gives it
ASSERT failed: tasks.c line 6755
```

mutex give는 priority 상속을 되돌리는 `xTaskPriorityDisinherit()`을 거치고, 그 첫머리의 `configASSERT( pxTCB == pxCurrentTCB )`(`tasks.c` 6755행)가 give하는 task가 owner인지 검사합니다.

## 자주 보는 함정

> ISR에서 mutex

```c
void IRQ(void) {
    xSemaphoreGiveFromISR(m, &hp);   /* m is a mutex */
}
```

`xSemaphoreTakeFromISR()`·`xSemaphoreGiveFromISR()` 매크로는 있지만, `semphr.h`는 두 매크로 설명에 "Mutex type semaphores cannot be used from within interrupt service routines"라고 적습니다. `queue.c`의 `xQueueGiveFromISR()`은 누가 쥐고 있는 mutex면 `configASSERT`로 멈춥니다. ISR과 task 사이 신호는 semaphore나 notification으로 합니다.

> Owner가 아닌 task가 give

```c
/* task A took it, task B gives */
xSemaphoreGive(spi_mutex);
```

위 측정처럼 `configASSERT`가 있으면 `tasks.c` 6755행에서 멈춥니다. 개발 빌드에서 `configASSERT`를 켜 두면 이 실수가 처음 실행에서 드러납니다.

> 긴 hold time

```c
xSemaphoreTake(m, ...);
printf_to_uart(big);    /* 수십 ms */
xSemaphoreGive(m);
```

PI가 있어도 기다리는 task는 hold time만큼 기다립니다(위 측정의 18 tick). 공유 자원 접근만 lock 안에 두고, 가공과 로깅은 밖에서 합니다.

> Recursive를 기본으로

```c
SemaphoreHandle_t m = xSemaphoreCreateRecursiveMutex();   /* 무조건 recursive */
```

recursive mutex는 같은 task가 몇 번 잡았는지 세므로, 잡고 놓는 짝이 호출 경로마다 맞는지 따로 확인해야 합니다. 같은 task의 재진입이 실제로 필요한 경로에만 씁니다.

> Timeout 없이 portMAX_DELAY 남용

```c
xSemaphoreTake(m, portMAX_DELAY);   /* 모든 곳에서 무한 대기 */
```

deadlock이 나면 그 task는 영원히 기다리고, 기록도 남지 않습니다. timeout을 두고 넘으면 기록합니다.

## 정리

- Mutex의 본질은 owner 추적입니다. 그 위에 PI, owner-only release, recursive가 얹힙니다.
- ISR은 mutex를 쓰지 않습니다. semaphore나 task notification으로 신호합니다.
- Hold time은 짧게, 가공은 lock 밖에서 합니다. PI는 중간 우선순위의 끼어들기를 막을 뿐 hold time 자체는 줄이지 않습니다.
- 여러 mutex를 잡을 때는 글로벌한 lock order 규칙을 정해 deadlock을 막습니다.
- Recursive는 마지막 수단입니다. 가능하면 비재귀로 설계합니다.
- 위 측정에서 PI는 High의 대기를 68 → 18 tick으로 줄였고, owner가 아닌 give는 `configASSERT`가 잡았습니다.

다음 편은 **Queue 활용**입니다. Producer-consumer, by-value와 by-pointer, backpressure를 다룹니다.

## 관련 항목

- [PRTOS 1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [PRTOS 3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [PRTOS 3-05: Priority Inheritance](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
- [PRTOS 3-10: Deadlock](/blog/embedded/rtos/practical-internals/part3-10-deadlock)
- [9-07: Spinlock vs Mutex](/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex)
