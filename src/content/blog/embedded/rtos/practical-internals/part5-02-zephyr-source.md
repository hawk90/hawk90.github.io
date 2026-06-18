---
title: "Zephyr 커널 분석 — k_thread·k_sem·Driver Model"
date: 2026-05-08T09:47:00
description: "Zephyr 커널 서브트리를 따라가며 sched.c·thread.c·sem.c의 핵심을 읽습니다. devicetree로 드라이버 인스턴스가 만들어지는 경로와 KConfig·west 빌드 체계까지 한 지도 위에 모읍니다."
series: "Practical RTOS Internals"
seriesOrder: 47
tags: [zephyr, source-analysis, k_thread, device-model, devicetree]
---

## 한 줄 요약

> **"Zephyr는 RTOS 모양의 미니 Linux입니다."** — devicetree·KConfig·driver model이 모두 Linux 스타일이며, 커널만 봐도 FreeRTOS의 두세 배 규모입니다.

## 어떤 문제를 푸는가

작은 MCU에서 출발한 FreeRTOS와 달리 Zephyr는 처음부터 *다양한 SoC를 같은 빌드 체계*에서 다루도록 설계되었습니다. Linux Foundation이 관리하며 Wind River, Intel, NXP, Nordic, Espressif가 모두 코드를 보탭니다. 그 결과 커널 자체보다도 *드라이버 모델*, *devicetree*, *KConfig*, *west*가 함께 따라옵니다.

이번 편은 두 가지를 노립니다. 첫째, `kernel/` 서브트리에서 스레드와 동기화 객체가 어떻게 구현되는지 골라 봅니다. 둘째, 드라이버 인스턴스가 devicetree에서 어떻게 *컴파일 시간에* 만들어지는지를 추적합니다. 이 두 축을 잡으면 Zephyr 코드를 처음 보더라도 길을 잃지 않습니다.

저장소는 `github.com/zephyrproject-rtos/zephyr`이고, 커널만 보려면 `kernel/`과 `include/zephyr/kernel.h` 두 디렉터리면 충분합니다.

## 저장소 구조

```text
zephyr/
├── kernel/                # 커널 핵심
│   ├── thread.c
│   ├── sched.c
│   ├── sem.c
│   ├── mutex.c
│   ├── timer.c
│   ├── msg_q.c
│   ├── poll.c
│   └── ...
├── arch/                  # 아키텍처별 port
│   ├── arm/core/cortex_m/
│   ├── arm64/
│   ├── riscv/
│   └── xtensa/
├── drivers/               # 드라이버 (vtable 기반)
│   ├── uart/
│   ├── i2c/
│   ├── gpio/
│   └── ...
├── include/zephyr/
│   ├── kernel.h
│   └── device.h
├── dts/                   # devicetree 바인딩
├── boards/                # 보드 정의 + 기본 KConfig
└── samples/
```

커널만 ~50K LoC, 드라이버와 서브시스템까지 합치면 수백 MB가 되는 거대한 트리입니다. 처음 들어갈 때는 `kernel/` 안에서 `sched.c`와 `sem.c`만 골라 보는 편이 좋습니다.

## k_thread — TCB의 Zephyr 버전

`struct k_thread`는 FreeRTOS의 TCB와 비슷한 역할입니다. 다만 userspace 격리와 mem_domain까지 들고 있어서 구조가 더 큽니다.

```c
struct k_thread {
    struct _thread_base base;          /* priority, state, queue node */
    struct _callee_saved callee_saved; /* 아키텍처별 콜백 저장 */
    void *init_data;

    #if defined(CONFIG_USERSPACE)
    _wait_q_t join_queue;
    struct k_mem_domain *mem_domain;
    #endif

    k_thread_stack_t *stack_obj;
    size_t stack_size;
    char name[CONFIG_THREAD_MAX_NAME_LEN];

    struct k_heap *resource_pool;
    /* ... */
};
```

`_thread_base`가 스케줄러가 보는 *공통 헤더*입니다. priority, 상태 비트, 큐에 끼울 dnode가 여기 모입니다.

```c
struct _thread_base {
    sys_dnode_t qnode_dlist;   /* per-priority 또는 wait queue */
    uint32_t order_key;
    uint8_t prio;
    uint8_t user_options;
    uint8_t thread_state;
    /* ... */
};
```

`thread_state`는 `_THREAD_PENDING`, `_THREAD_PRESTART`, `_THREAD_DEAD` 같은 비트 모음입니다. 한 스레드가 여러 상태를 동시에 가질 수 있도록 비트 OR로 누적합니다.

## sched.c — 두 가지 ready queue

Zephyr는 빌드 옵션에 따라 *다른 ready queue 자료구조*를 고를 수 있습니다. 기본은 단순한 dumb queue, 큰 시스템에서는 multiqueue 또는 rbtree 기반 scalable queue가 활성화됩니다.

```c
static inline struct k_thread *_priq_dumb_best(sys_dlist_t *pq)
{
    struct k_thread *t = NULL;
    sys_dnode_t *n = sys_dlist_peek_head(pq);
    if (n != NULL) {
        t = CONTAINER_OF(n, struct k_thread, base.qnode_dlist);
    }
    return t;
}
```

`dumb`는 한 linked list 안에 priority 순으로 정렬해 두는 방식입니다. priority 수가 적고 ready 스레드가 많지 않은 임베디드 시스템에서는 이 단순함이 그대로 이득입니다.

조금 큰 시스템에서는 multiqueue가 켜집니다.

```c
#if defined(CONFIG_SCHED_MULTIQ)
    uint32_t multiq_bitmap[CONFIG_NUM_BITMAP_WORDS];
    sys_dlist_t multiq_queues[K_NUM_PRIO_BITMAP];
#endif
```

priority별 큐와 비트맵을 함께 두는 구조입니다. `find_lsb_set(bitmap)` 한 번이면 최상위 priority가 나오므로 FreeRTOS의 `uxTopReadyPriority` + CLZ 조합과 같은 효과를 봅니다. SMP 빌드에서는 *per-CPU runqueue*에 push/pull balancing이 얹힌 형태로 확장됩니다. 이 구조의 비교는 [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 다룹니다.

## k_sem — spinlock 기반 동기화 객체

`kernel/sem.c`의 take 함수는 SMP를 고려한 일반적인 구조를 보여 줍니다.

```c
struct k_sem {
    _wait_q_t wait_q;
    uint32_t count;
    uint32_t limit;
};

int k_sem_take(struct k_sem *sem, k_timeout_t timeout)
{
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

`k_spin_lock`은 단일 코어 빌드에서 IRQ disable로 축약되고, SMP 빌드에서는 *spinlock + IRQ disable*로 확장됩니다. 같은 소스가 두 빌드에서 모두 정확합니다.

`z_pend_curr`는 현재 스레드를 wait queue에 끼우고 락을 풀면서 스케줄러로 돌아갑니다. timeout이 지나면 다시 ready로 돌리고 적절한 errno로 빠져나옵니다. 이 패턴이 mutex, msg queue, k_poll에서 그대로 재사용됩니다.

## Driver Model — vtable + devicetree

Zephyr 드라이버는 *vtable + per-instance data + per-instance config*의 삼각형으로 구성됩니다. UART 드라이버 예를 보면 분리가 분명합니다.

```c
/* drivers/uart/uart_stm32.c */
static int uart_stm32_init(const struct device *dev)         { /* ... */ }
static int uart_stm32_poll_in(const struct device *dev,
                               unsigned char *c)             { /* ... */ }

static const struct uart_driver_api uart_stm32_driver_api = {
    .poll_in   = uart_stm32_poll_in,
    .poll_out  = uart_stm32_poll_out,
    .err_check = uart_stm32_err_check,
    /* ... */
};

DEVICE_DT_INST_DEFINE(0, uart_stm32_init, NULL,
    &uart_stm32_data_0, &uart_stm32_cfg_0,
    PRE_KERNEL_1, CONFIG_SERIAL_INIT_PRIORITY,
    &uart_stm32_driver_api);
```

`DEVICE_DT_INST_DEFINE`이 핵심 매크로입니다. devicetree에서 같은 compatible을 가진 *모든 인스턴스*에 대해 `device` 구조체를 컴파일 시간에 만들어 둡니다. 런타임 dynamic registration이 필요 없으므로 ROM에 그대로 자리잡습니다.

devicetree 입력은 Linux DTS와 같은 문법입니다.

```dts
/* boards/arm/nucleo_f407g/nucleo_f407g.dts */
/dts-v1/;
#include <st/f4/stm32f407Xg.dtsi>

/ {
    chosen {
        zephyr,console = &usart2;
        zephyr,sram    = &sram0;
        zephyr,flash   = &flash0;
    };
};

&usart2 {
    pinctrl-0     = <&usart2_tx_pa2 &usart2_rx_pa3>;
    pinctrl-names = "default";
    current-speed = <115200>;
    status        = "okay";
};
```

빌드 시 `dts/`의 바인딩과 매칭되어 *generated header*로 변환되고, 드라이버 매크로가 그 header를 consume합니다. 보드를 바꿔도 드라이버 코드는 한 줄도 변하지 않습니다.

## KConfig — feature를 컴파일에서 잘라내기

```text
# prj.conf
CONFIG_SERIAL=y
CONFIG_UART_INTERRUPT_DRIVEN=y
CONFIG_MAIN_STACK_SIZE=2048
CONFIG_LOG=y
```

Linux의 KConfig 문법 그대로입니다. 켜지 않은 기능은 *링크 단계에서 사라지므로* 작은 MCU에서도 footprint를 통제할 수 있습니다. `menuconfig`로 인터랙티브 탐색이 가능합니다.

```bash
west build -b nucleo_f407g samples/hello_world -t menuconfig
```

## west — 멀티 저장소 메타툴

Zephyr는 단일 저장소가 아니라 *Zephyr core + 수십 개 module*로 분산되어 있습니다. `west`가 manifest를 읽어 모두 동기화합니다.

```bash
west init -m https://github.com/zephyrproject-rtos/zephyr --mr main
cd zephyrproject
west update

west build -b nucleo_f407g samples/hello_world
west flash
```

`west`가 git 작업, 빌드, 플래시, signing을 한 인터페이스로 묶습니다. Linux 세계의 `apt + cmake + ninja`를 단일 도구로 뭉친 셈입니다.

## POSIX 서브시스템

`subsys/posix`를 활성화하면 pthread, semaphore, signal API의 일부가 그대로 사용 가능해집니다.

```c
#include <pthread.h>

pthread_t tid;
pthread_create(&tid, NULL, thread_entry, NULL);
pthread_join(tid, NULL);

pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_lock(&mtx);
pthread_mutex_unlock(&mtx);
```

Linux에서 쓰던 코드가 *재컴파일만으로* MCU에서 도는 경우가 많습니다. 다만 fork, mmap, signal handler에는 제약이 있으므로 *호환되는 부분만* 의존하는 편이 안전합니다.

## Network·BLE — 통합 서브시스템

Zephyr가 FreeRTOS와 갈리는 지점은 *내장 서브시스템의 폭*입니다.

```text
subsys/net/         IPv4·IPv6·TCP·UDP·CoAP·MQTT·LwM2M·HTTP
subsys/bluetooth/   BLE host + controller (Nordic·Espressif)
subsys/usb/         USB device + host
subsys/fs/          LittleFS·FATFS·NVS
subsys/logging/     LOG_INF·LOG_ERR + 백엔드 (UART·RTT·net)
```

각 서브시스템이 KConfig로 켜고 끌 수 있도록 모듈화되어 있습니다. BLE는 특히 *현재 가장 많이 채택되는 RTOS*가 Zephyr입니다. Nordic nRF Connect SDK가 Zephyr 기반이고, Espressif도 ESP32에 Zephyr를 정식 지원합니다.

## User Mode — MPU/MMU 분리

`CONFIG_USERSPACE=y`로 빌드하면 스레드가 *user mode*로 동작합니다.

```c
K_THREAD_DEFINE(user_thr, 2048, user_entry, NULL, NULL, NULL,
                5, K_USER, 0);
```

User 스레드는 커널 데이터에 직접 접근할 수 없고, `k_sem_take` 같은 API도 *syscall로 wrap*되어 호출됩니다. MPU나 MMU가 강제하는 격리 위에서 *Linux 같은 권한 분리*가 가능해집니다. safety-critical 시스템에서 application 코드와 커널의 경계를 강하게 두고 싶을 때 유용합니다.

## FreeRTOS와 Zephyr — 한 줄 비교

| 항목 | FreeRTOS | Zephyr |
|---|---|---|
| 커널 LoC | ~20K | ~50K+ |
| devicetree | × | ✓ |
| KConfig | × (`FreeRTOSConfig.h`) | ✓ |
| 드라이버 모델 | × (HAL 별도) | ✓ |
| Network stack | external | built-in |
| BLE | external | built-in |
| POSIX | × | partial |
| User mode (MPU) | partial | full |
| 적합한 규모 | 작은 센서·MCU | 중급·고급 MCU·SoC |
| 인증 | SafeRTOS 상업 변종 | Auto Cert·DO-178C 진행 |

작은 펌웨어는 FreeRTOS의 단순함이 이깁니다. 통신 스택과 드라이버가 많이 필요한 IoT 게이트웨이나 BLE 디바이스는 Zephyr가 합리적입니다.

## SMP Support

Zephyr SMP는 [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 깊게 다루지만, 코어 API 자체는 단순합니다.

```c
K_THREAD_DEFINE(thr0, 2048, entry, NULL, NULL, NULL, 5, 0, 0);

k_thread_cpu_mask_disable_all(&thr0_thread);
k_thread_cpu_mask_enable(&thr0_thread, 0);   /* CPU 0 affinity */
```

ARM Cortex-A, ARMv8-M dual-core, RISC-V SMP를 모두 지원하며, FreeRTOS 11 SMP보다 *runqueue 자료구조와 balancing 알고리즘*이 더 일찍 안정화되어 있습니다.

## 자주 보는 함정

> 경고 — devicetree 변경 후 캐시된 빌드 사용

`west build` 직후 DTS만 바꾸고 다시 빌드하면 *이전 generated header*가 그대로 남아 있는 경우가 있습니다. `west build --pristine`이나 빌드 디렉터리 삭제로 강제 재생성을 시킵니다.

> 경고 — KConfig 의존성 미설정

```text
CONFIG_BT=y
# CONFIG_BT_CTLR 또는 BT_HCI_RAW 미설정 → 런타임에 동작하지 않음
```

심볼 하나를 켰는데 *짝이 되는 옵션*을 빠뜨리면 빌드는 통과해도 BLE adv가 시작되지 않습니다. `menuconfig`로 의존성을 확인하는 습관이 필요합니다.

> 경고 — 스택 크기를 FreeRTOS 감각으로 잡기

```c
K_THREAD_DEFINE(thr, 512, entry, ...);
```

Zephyr는 logging, k_poll, 드라이버 syscall 등이 스택을 더 씁니다. 최소 1024바이트, 일반적인 작업은 2048바이트가 안전한 기준입니다.

> 경고 — User mode에서 직접 레지스터 접근

```c
SCB->ICSR = ...;   /* user 스레드 → fault */
```

User mode 스레드는 커널 영역에 직접 접근할 수 없습니다. syscall로 wrap된 API만 사용해야 하며, 그렇지 않으면 MPU fault로 죽습니다.

## 정리

- Zephyr 커널은 `kernel/sched.c`와 `kernel/sem.c`를 중심으로 읽으면 동기화와 스케줄러의 골격이 잡힙니다.
- 스레드 상태는 비트 OR로 누적되며, ready queue는 dumb/multiqueue/scalable 중 빌드 옵션으로 선택됩니다.
- 동기화 객체는 `k_spinlock`을 통해 단일 코어와 SMP에서 동일한 코드가 동작하도록 일반화되어 있습니다.
- 드라이버 모델은 vtable + devicetree-driven 인스턴스 정의가 핵심이며, 보드를 바꿔도 드라이버 코드가 변하지 않습니다.
- KConfig가 모든 기능을 *컴파일 단계에서* 잘라내므로 작은 MCU에서도 footprint 통제가 가능합니다.
- `west`는 멀티 저장소 manifest와 빌드·플래시·signing을 묶는 메타툴입니다.
- POSIX 서브시스템과 BLE/네트워크 스택이 *내장*되어 있어 IoT 게이트웨이급 시스템에 잘 맞습니다.
- User mode와 mem_domain으로 MPU/MMU 기반 권한 분리를 제공하므로 safety-critical 격리를 일찍 도입할 수 있습니다.

다음 편은 [5-03 RT-Thread](/blog/embedded/rtos/practical-internals/part5-03-rt-thread)에서 경량 커널과 풍부한 component를 함께 가진 중국 출신 RTOS를 봅니다.

## 관련 항목

- [2-03: Scheduler Algorithm](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
