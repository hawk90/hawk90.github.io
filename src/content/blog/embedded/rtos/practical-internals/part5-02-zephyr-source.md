---
title: "5-02: Zephyr 커널 분석 — k_thread·k_sem·Device Model"
date: 2026-05-20T03:00:00
description: "Zephyr Project 커널. k_thread·k_sem. Device driver model + devicetree. POSIX subsys."
series: "Practical RTOS Internals"
seriesOrder: 47
tags: [zephyr, source-analysis, k_thread, device-model, posix]
draft: true
---

## 한 줄 요약

> **"Zephyr = Linux-like RTOS"** — devicetree·KConfig·driver model 모두 Linux 스타일.

## Zephyr Project

```text
Linux Foundation managed:
  - 2016년 Wind River + Intel + NXP
  - 현재 50+ vendors
  - Apache 2.0 license
  - 200+ board 지원
  - ARM·RISC-V·x86·Xtensa·MIPS·ARC
```

FreeRTOS와 비교 — *훨씬 큰 ecosystem*, complexity 비례.

## 디렉토리 구조

```text
zephyr/
├── kernel/                   # 커널 코어
│   ├── thread.c              # k_thread
│   ├── sched.c               # scheduler
│   ├── sem.c                 # semaphore
│   ├── mutex.c               # mutex
│   ├── timer.c               # timer
│   ├── msg_q.c               # message queue
│   ├── poll.c                # k_poll (select-like)
│   └── ...
├── arch/                     # architecture
│   ├── arm/core/cortex_m/
│   ├── riscv/
│   └── ...
├── drivers/                  # device drivers
│   ├── gpio/
│   ├── uart/
│   ├── i2c/
│   └── ...
├── include/zephyr/
│   ├── kernel.h              # k_thread, k_sem, ...
│   ├── device.h              # device driver model
│   └── ...
├── boards/                   # board configurations
│   ├── arm/nucleo_f407g/
│   └── ...
└── dts/                      # devicetree
```

크기 — 코어만 *~50K lines*. 풀 release *수백 MB* (driver·subsystem 포함).

## k_thread 구조

```c
struct k_thread {
    struct _thread_base base;       /* priority, state, etc. */
    struct _callee_saved callee_saved;   /* arch-specific */
    void *init_data;
    
    #if defined(CONFIG_USERSPACE)
    _wait_q_t join_queue;
    struct k_mem_domain *mem_domain;
    #endif
    
    /* Stack */
    k_thread_stack_t *stack_obj;
    size_t stack_size;
    
    char name[CONFIG_THREAD_MAX_NAME_LEN];
    
    struct k_heap *resource_pool;
    /* ... */
};

struct _thread_base {
    sys_dnode_t qnode_dlist;    /* per-priority list */
    union {
        struct _thread_arch arch_data;
        ...
    };
    uint32_t order_key;
    uint8_t prio;
    uint8_t user_options;
    uint8_t thread_state;
    /* ... */
};
```

FreeRTOS TCB와 비슷 — *더 복잡* (userspace·mem_domain).

## Scheduler

```c
/* kernel/sched.c */

static inline struct k_thread *_priq_dumb_best(sys_dlist_t *pq) {
    struct k_thread *t = NULL;
    sys_dnode_t *n = sys_dlist_peek_head(pq);
    if (n != NULL) t = CONTAINER_OF(n, struct k_thread, base.qnode_dlist);
    return t;
}
```

Default — *dumb queue* (linear). Larger systems — *scalable priority queue* (rbtree·bitmap).

```c
#if defined(CONFIG_SCHED_MULTIQ)
    /* Bitmap of priorities */
    uint32_t multiq_bitmap[CONFIG_NUM_BITMAP_WORDS];
    sys_dlist_t multiq_queues[K_NUM_PRIO_BITMAP];
#endif
```

빠른 priority lookup — find_lsb_set(bitmap).

## k_sem 구조

```c
/* kernel/sem.c */
struct k_sem {
    _wait_q_t wait_q;          /* waiter list */
    uint32_t count;
    uint32_t limit;
};

int k_sem_take(struct k_sem *sem, k_timeout_t timeout) {
    int ret = 0;
    k_spinlock_key_t key = k_spin_lock(&sem->lock);
    
    if (sem->count > 0) {
        sem->count--;
        ret = 0;
    } else if (K_TIMEOUT_EQ(timeout, K_NO_WAIT)) {
        ret = -EBUSY;
    } else {
        ret = z_pend_curr(&sem->lock, key, &sem->wait_q, timeout);
        return ret;
    }
    
    k_spin_unlock(&sem->lock, key);
    return ret;
}
```

`k_spin_lock` — SMP-aware. `z_pend_curr` — current thread를 wait queue에 등록 + reschedule.

## Device Driver Model

```c
/* drivers/uart/uart_stm32.c */
static int uart_stm32_init(const struct device *dev) { ... }
static int uart_stm32_poll_in(const struct device *dev, unsigned char *c) { ... }

static const struct uart_driver_api uart_stm32_driver_api = {
    .poll_in = uart_stm32_poll_in,
    .poll_out = uart_stm32_poll_out,
    .err_check = uart_stm32_err_check,
    /* ... */
};

DEVICE_DT_INST_DEFINE(0, uart_stm32_init, NULL,
    &uart_stm32_data_0, &uart_stm32_cfg_0,
    PRE_KERNEL_1, CONFIG_SERIAL_INIT_PRIORITY,
    &uart_stm32_driver_api);
```

Linux 스타일 — *driver = vtable + data + config*. `DEVICE_DT_INST_DEFINE` 매크로가 *devicetree에서 인스턴스 생성*.

## Devicetree

```dts
/* boards/arm/nucleo_f407g/nucleo_f407g.dts */
/dts-v1/;
#include <st/f4/stm32f407Xg.dtsi>

/ {
    chosen {
        zephyr,console = &usart2;
        zephyr,sram = &sram0;
        zephyr,flash = &flash0;
    };
};

&usart2 {
    pinctrl-0 = <&usart2_tx_pa2 &usart2_rx_pa3>;
    pinctrl-names = "default";
    current-speed = <115200>;
    status = "okay";
};
```

Linux DTS와 *같은 syntax*. Build time에 *header 생성* + driver consume.

## KConfig

```text
prj.conf:
  CONFIG_SERIAL=y
  CONFIG_UART_INTERRUPT_DRIVEN=y
  CONFIG_MAIN_STACK_SIZE=2048
  CONFIG_LOG=y
```

Linux KConfig 그대로 — feature *compile-out 가능*.

## 빌드

```bash
west init -m https://github.com/zephyrproject-rtos/zephyr --mr main
cd zephyrproject
west update

# Build
west build -b nucleo_f407g samples/hello_world
west flash
```

`west` = meta-tool (Linux의 cmake + apt 비슷).

## POSIX Subsystem

```c
#include <pthread.h>

pthread_t tid;
pthread_create(&tid, NULL, thread_entry, NULL);
pthread_join(tid, NULL);

pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_lock(&mtx);
pthread_mutex_unlock(&mtx);
```

POSIX API wrapper — *Linux 코드 그대로 컴파일*. 임베디드 + POSIX = unique.

## Network Stack

```text
zephyr/subsys/net/:
  IP·TCP·UDP·ICMP
  6LoWPAN·CoAP
  Bluetooth Mesh·BLE
  Thread·Zigbee
  HTTP·MQTT·WebSocket·LWM2M
  
모두 *built-in*.
```

FreeRTOS — `FreeRTOS-Plus-TCP` 별도. Zephyr는 *통합*.

## Bluetooth Stack

```c
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gatt.h>

bt_enable(NULL);
bt_le_adv_start(BT_LE_ADV_CONN, ad, ARRAY_SIZE(ad), NULL, 0);
```

Zephyr — *BLE 가장 많이 사용되는 RTOS*. Nordic·Espressif·NXP 채택.

## 빌드 시스템 — CMake

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20.0)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(my_app)

target_sources(app PRIVATE src/main.c)
```

Linux 스타일 CMake. Make·Ninja·MSYS2 모두 지원.

## SMP Support

```c
/* CONFIG_SMP=y */

K_THREAD_DEFINE(thr0, 2048, entry, NULL, NULL, NULL, 5, 0, 0);

k_thread_cpu_mask_disable_all(&thr0_thread);
k_thread_cpu_mask_enable(&thr0_thread, 0);   /* CPU 0 affinity */
```

ARM Cortex-A·M55+M85·RISC-V SMP — 모두 지원. FreeRTOS 11 SMP보다 *더 성숙*.

## User Space — Privilege Separation

```c
/* CONFIG_USERSPACE=y */

K_THREAD_DEFINE(user_thr, 2048, user_entry, NULL, NULL, NULL,
                5, K_USER, 0);   /* user mode */
```

MPU/MMU로 *user/kernel 분리*. Linux 같은 *strong isolation* — safety-critical 적용.

## License

```text
Zephyr Project — Apache 2.0:
  - 자유 사용·수정·배포
  - 상업 OK
  - 기여 시 DCO (Developer Certificate of Origin)
  
FreeRTOS MIT보다 *약간 까다로움* — 그러나 큰 차이 없음.
```

## FreeRTOS vs Zephyr

| 항목 | FreeRTOS | Zephyr |
|---|---|---|
| Lines of code | ~20K | ~50K+ |
| Devicetree | × | ✓ |
| KConfig | × (FreeRTOSConfig.h) | ✓ |
| Driver model | × (HAL 별도) | ✓ |
| Network | external | built-in |
| BLE | external | built-in |
| POSIX | × | partial |
| User mode (MPU) | partial | full |
| 적용 | 작은 sensor·MCU | 중급·high-end MCU·SoC |
| 인증 | SafeRTOS commercial | Auto Cert·DO-178C in progress |

작은 MCU — FreeRTOS, 큰 시스템 — Zephyr 추세.

## 자주 하는 실수

> ⚠️ DTS 변경 후 rebuild 안 함

```bash
west build samples/...   # cached DTS — old binding
```

→ `west build --pristine` 또는 build dir 삭제.

> ⚠️ KConfig 의존성 무시

```text
CONFIG_BLE=y
# 그러나 CONFIG_BLE_CONTROLLER 미설정 → 동작 안 함
```

→ `west config menuconfig`로 인터랙티브 dependency 검토.

> ⚠️ Stack size 부족

```c
K_THREAD_DEFINE(thr, 512, entry, ...);   /* 512 byte? */
```

→ Zephyr 함수 stack 사용 큼. 최소 1024+.

> ⚠️ User mode kernel API

```c
/* User thread */
k_sem_take(&sem, K_FOREVER);   /* OK — syscall로 wrap */
SCB->...;   /* ✗ — direct register access — fault */
```

→ User mode는 *syscall만*.

## 정리

- Zephyr = **Linux-like RTOS** (devicetree·KConfig·driver model).
- `k_thread`·`k_sem` 등 standardized API.
- **Built-in network·BLE·USB·display·sensor**.
- POSIX subsystem — Linux 코드 호환.
- SMP·user mode·MPU·MMU 지원.
- Build = `west` + CMake.

다음 편은 **RT-Thread**.

## 관련 항목

- [5-01: FreeRTOS 소스](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-03: RT-Thread](/blog/embedded/rtos/practical-internals/part5-03-rt-thread)
