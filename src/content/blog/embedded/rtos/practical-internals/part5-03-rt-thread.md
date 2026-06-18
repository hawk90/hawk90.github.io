---
title: "RT-Thread 분석 — Object 모델·Components·Smart·Studio"
date: 2026-05-08T09:48:00
description: "RT-Thread의 object-oriented C 설계와 component 생태계를 따라갑니다. FreeRTOS급 경량 kernel 위에 DFS·LwIP·POSIX·FinSH가 어떻게 얹히는지, Smart variant가 무엇을 더 가져오는지 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 48
tags: [rt-thread, source-analysis, components, smart, finsh]
---

## 한 줄 요약

> **"RT-Thread는 경량 커널과 풍부한 component를 같은 트리에 묶어 둡니다."** — FreeRTOS만큼 가볍지만 Zephyr처럼 통합된 driver·filesystem·shell이 따라옵니다.

## 어떤 문제를 푸는가

작은 MCU에서는 FreeRTOS가 충분하지만 *파일 시스템·네트워크·POSIX·shell*까지 필요한 순간 부족함을 느낍니다. 반대로 Zephyr는 풍부하지만 커널 LoC와 빌드 복잡도가 작은 프로젝트엔 과합니다. RT-Thread는 그 사이를 노린 RTOS입니다.

이번 편의 목표는 두 가지입니다. 첫째, *object-oriented C*로 구현된 RT-Thread의 커널 구조를 짚습니다. 둘째, `components/`에 모인 통합 서브시스템과 *Smart variant*까지 한눈에 정리합니다. 중국 시장에 압도적이지만 글로벌 IoT에서도 채택이 늘고 있는 RTOS의 모양을 잡아 두는 글입니다.

저장소는 `github.com/RT-Thread/rt-thread`이고, Apache 2.0 라이선스입니다.

## 배경

| 시기 | 이벤트 |
|---|---|
| 2006 | Bernard Xiong 개인 프로젝트로 시작 |
| 2015~ | 중국 기업·IoT 시장 확산 |
| 2020~ | 글로벌 진출 (Apache 2.0 정식 채택) |
| 현재 | 300+ BSP, 1000+ packages |

채택 사례

- China Mobile OneNET (IoT 클라우드)
- BYD·길리 자동차 일부 ECU
- DJI 일부 모듈
- WCH·GD32·HK32 등 중국 MCU 표준 RTOS

중국 vendor MCU(GD32, HK32, N32, WCH CH32V 등)는 *RT-Thread BSP를 공식으로 제공*하는 경우가 많아 사실상 표준 RTOS로 자리잡았습니다.

## 저장소 구조

```text
rt-thread/
├── src/                       # 커널 본체 (~10K LoC)
│   ├── thread.c               # rt_thread
│   ├── scheduler.c
│   ├── ipc.c                  # semaphore·mutex·event·mailbox·msgqueue
│   ├── timer.c
│   ├── mem.c                  # heap
│   ├── memheap.c              # multi-region heap
│   ├── object.c               # object 시스템 (kobject 유사)
│   └── ...
├── include/
│   ├── rtthread.h
│   └── rtdef.h
├── libcpu/                    # 아키텍처별 port
│   ├── arm/cortex-m4/
│   ├── risc-v/
│   └── ...
├── bsp/                       # 보드 지원 (300+)
│   ├── stm32/
│   ├── esp32/
│   ├── ch32/
│   └── ...
├── components/                # 통합 서브시스템
│   ├── dfs/                   # device filesystem
│   ├── net/                   # LwIP 등
│   ├── libc/
│   ├── finsh/                 # CLI
│   ├── drivers/
│   └── posix/
└── examples/
```

코어가 작고 components가 별도 디렉터리에 모여 있어, 필요한 기능만 빌드에 포함시키는 구조가 분명합니다.

## rt_thread 구조

```c
struct rt_thread {
    /* rt_object 상속 */
    char name[RT_NAME_MAX];
    rt_uint8_t type;
    rt_uint8_t flags;
    rt_list_t list;

    /* stack */
    void *sp;
    void *entry;
    void *parameter;
    void *stack_addr;
    rt_uint32_t stack_size;

    /* scheduling */
    rt_err_t error;
    rt_uint8_t stat;
    rt_uint8_t current_priority;
    rt_uint8_t init_priority;
    rt_uint32_t number_mask;       /* priority bitmap 보조 */

    /* time slice */
    rt_uint32_t init_tick;
    rt_uint32_t remaining_tick;

    rt_list_t tlist;               /* wait list 등록 노드 */

    /* SMP */
    int oncpu;
    rt_uint32_t cpus_lock_nest;

    void *user_data;
};
```

FreeRTOS TCB나 Zephyr `k_thread`에 비해 *훨씬 단정한 크기*입니다. 임베디드 MCU에 적합한 RAM 사용량이 유지됩니다.

## Object 시스템 — C로 흉내낸 상속

RT-Thread의 모든 커널 객체는 `rt_object`를 *상속*합니다. C에 클래스가 없으므로 *첫 멤버를 base struct로 두는 관용*이 사용됩니다.

```c
struct rt_object {
    char name[RT_NAME_MAX];
    rt_uint8_t type;       /* THREAD, SEMAPHORE, MUTEX, ... */
    rt_uint8_t flag;
    rt_list_t list;
};
```

type별 container가 있어, 시스템에 존재하는 *모든 스레드*나 *모든 세마포어*를 한 번에 순회할 수 있습니다.

```c
struct rt_object_information *info = rt_object_get_information(RT_Object_Class_Thread);
rt_list_t *list = &info->object_list;
```

Linux 커널의 kobject와 비슷한 발상입니다. FinSH의 `list_thread`, `list_sem` 같은 명령이 가능한 이유가 이 container에 있습니다.

## Scheduler — Priority Bitmap (최대 256)

```c
rt_uint32_t rt_thread_ready_priority_group;   /* 상위 32 비트 그룹 */
rt_uint8_t  rt_thread_ready_table[32];        /* 그룹별 8 priority */

void rt_schedule(void)
{
    rt_uint8_t highest = __rt_ffs(rt_thread_ready_priority_group);
    rt_list_t *list    = &rt_thread_priority_table[highest];
    struct rt_thread *t = rt_list_entry(list->next, struct rt_thread, tlist);
    /* context switch */
}
```

ARM의 `CLZ`나 RISC-V의 `clz` 명령을 이용한 `__rt_ffs`로 *O(1) priority lookup*이 가능합니다. *최대 256 priority*를 지원해 매우 다양한 RT 시스템을 표현할 수 있습니다.

## IPC — 다섯 가지를 한 파일에

`src/ipc.c`에 세마포어, 뮤텍스, event flag, mailbox, message queue가 모두 들어 있습니다. 자료구조가 작아서 한 파일에 다 들어가는 데다, 공통된 wait list와 schedule pattern을 한곳에 모은 효과가 있습니다.

```c
rt_err_t rt_sem_take(rt_sem_t sem, rt_int32_t timeout)
{
    register rt_base_t temp;

    temp = rt_hw_interrupt_disable();
    if (sem->value > 0) {
        sem->value--;
        rt_hw_interrupt_enable(temp);
        return RT_EOK;
    }

    if (timeout == 0) {
        rt_hw_interrupt_enable(temp);
        return -RT_ETIMEOUT;
    }

    /* 현재 스레드를 wait list에 끼우고 schedule */
    rt_thread_t thread = rt_thread_self();
    rt_ipc_list_suspend(&sem->parent.suspend_thread, thread, ...);

    if (timeout > 0) {
        rt_timer_control(&thread->thread_timer, RT_TIMER_CTRL_SET_TIME, &timeout);
        rt_timer_start(&thread->thread_timer);
    }
    rt_hw_interrupt_enable(temp);

    rt_schedule();
    return thread->error;
}
```

`rt_hw_interrupt_disable`이 critical section 진입입니다. 이후 wait list 등록, timer 설정, schedule 호출이 일관된 순서로 일어납니다. mutex나 message queue도 같은 패턴 위에 priority inheritance나 데이터 복사 단계만 더해지는 모양입니다.

## Components — DFS (Device Filesystem)

```c
#include <dfs_posix.h>

int fd = open("/dev/sd0/file.txt", O_RDONLY);
read(fd, buf, sizeof(buf));
close(fd);
```

POSIX 파일 API를 그대로 제공합니다. 백엔드는 FATFS, LittleFS, RomFS, ramfs 같은 여러 구현 중 KConfig로 선택합니다. SD 카드, SPI flash, USB mass storage가 같은 인터페이스 뒤에 숨습니다.

## Components — LwIP 통합 네트워크

```c
#include <lwip/sockets.h>

int sock = socket(AF_INET, SOCK_STREAM, 0);
connect(sock, (struct sockaddr*)&addr, sizeof(addr));
send(sock, data, len, 0);
```

표준 BSD socket API가 활성화됩니다. LwIP는 외부 라이브러리지만 *기본 component로 통합*되어 있어 별도 통합 작업이 거의 필요 없습니다.

## FinSH·MSH — Linux 같은 shell

```text
msh /> help
msh /> ps
msh /> free
msh /> list_thread
msh /> ifconfig
msh /> ping 8.8.8.8
msh /> echo "Hello" > /dev/console
```

`FinSH`는 RT-Thread의 표준 CLI입니다. 디버그 시 *시스템 상태를 인터랙티브하게 확인*할 수 있어 개발 생산성이 크게 올라갑니다. 새 명령을 추가하는 것도 매크로 한 줄이면 됩니다.

```c
static void hello(int argc, char **argv) {
    rt_kprintf("hello from finsh\n");
}
MSH_CMD_EXPORT(hello, simple hello command);
```

## Smart — POSIX + MMU

`RT-Thread Smart`(rt-smart)는 MMU를 활용한 변종입니다. *Linux 같은 process와 user mode*를 지원하면서 RT-Thread의 결정성을 유지합니다.

RT-Thread Smart

- **대상 하드웨어** — Cortex-A·RISC-V S-mode, 256 MB+ RAM
- **특징** — user/kernel 분리, fork·exec·shared library
- **적용** — 자동차 인포테인먼트, 산업 HMI, 디지털 사이니지
- **위치** — Linux는 너무 무겁고 RTOS는 부족한 중간 영역

자동차 인포테인먼트나 HMI에서 *Linux를 쓸 만큼의 자원은 없지만 동적 application 로딩이 필요한* 시나리오에 사용됩니다.

## env tool과 scons

RT-Thread 빌드 환경은 `env` tool + `scons`(Python 기반)입니다.

```bash
env                       # RT-Thread 빌드 환경 진입 (Windows·Linux)
scons --menuconfig        # 인터랙티브 KConfig
scons -j4                 # 빌드
scons --target=mdk5       # Keil project 생성
scons --target=iar        # IAR project 생성
```

Makefile이나 CMake가 아니라 scons를 쓰는 이유는 중국 임베디드 시장의 *Keil·IAR 친화*가 큽니다. scons가 project 파일 생성기 역할도 같이 해 줍니다.

## RT-Thread Studio — IDE

Eclipse 기반의 RT-Thread Studio가 별도 제공됩니다. project generator, SDK 관리, devicetree 비슷한 menuconfig UI, 디버그·플래시 통합이 한 IDE에 모입니다. 중국 임베디드 개발자에게는 STM32CubeIDE를 대체하는 표준 환경입니다.

## SMP Support

```c
#define RT_CPUS_NR  4

struct rt_thread *rt_current_thread_per_cpu[RT_CPUS_NR];

rt_thread_t t = rt_thread_create("rt", entry, NULL, 2048, 5, 10);
rt_thread_control(t, RT_THREAD_CTRL_BIND_CPU, (void*)0);   /* CPU 0 affinity */
```

Cortex-A SMP, RP2040 같은 dual Cortex-M, RISC-V SMP를 모두 지원합니다. 단일 코어와 같은 API에 affinity 설정만 더해진 모양입니다.

## ESP32 적용

ESP32 BSP가 RT-Thread에도 정식 제공됩니다. ESP-IDF(Espressif 기본, FreeRTOS 기반)와는 별개의 선택지로, *RT-Thread 친숙한 사용자가 ESP32 H/W를 활용*할 때 유리합니다.

```c
#include <rtthread.h>

int main(void)
{
    rt_kprintf("Hello RT-Thread on ESP32\n");
    while (1) {
        rt_thread_mdelay(1000);
    }
}
```

## RT-Thread vs FreeRTOS vs Zephyr

| 항목 | RT-Thread | FreeRTOS | Zephyr |
|---|---|---|---|
| 출신 | 중국 (2006) | 영국 (2003) | LF (2016) |
| 커널 LoC | ~10K | ~20K | ~50K |
| Component 통합 | ★★★ (DFS·net·POSIX·shell) | ★ (별도) | ★★★ |
| IDE | RT-Thread Studio | 외부 | west·VSCode |
| BSP 수 | 300+ (중국 MCU 강점) | 거의 모든 MCU | 200+ |
| devicetree | × (menuconfig 기반) | × | ✓ |
| Smart variant (MMU) | ✓ | × | × |
| 중국 시장 점유 | ★★★ | ★★ | ★ |
| 글로벌 시장 점유 | ★ | ★★★ | ★★★ |

선택 기준은 단순합니다. 중국 MCU나 OneNET·CMCC 같은 중국 클라우드와 붙어야 하면 RT-Thread, 그 외 글로벌 IoT는 FreeRTOS 또는 Zephyr가 일반적입니다.

## 자주 보는 함정

> 경고 — 너무 작은 스택

```c
rt_thread_create("name", entry, NULL, 256, 10, 10);
```

DFS, LwIP, FinSH가 함께 도는 시스템에서는 256바이트는 거의 확실한 stack overflow입니다. 최소 512바이트, IPC와 component를 함께 쓴다면 1024바이트 이상이 기준입니다.

> 경고 — Component KConfig 미설정

```c
#include <dfs_posix.h>
open(...);    /* link error: DFS component 비활성 */
```

components는 *기본적으로 꺼져 있습니다*. menuconfig에서 DFS, LwIP, POSIX 같은 옵션을 개별적으로 켜야 함수 본체가 빌드에 포함됩니다.

> 경고 — 영문 문서만 의존

공식 문서가 *중국어 쪽이 더 자세*하고 최신입니다. 영문 페이지가 outdated인 항목이 적지 않습니다. 중국 forum이나 issue tracker를 함께 보는 것이 도움이 됩니다.

> 경고 — Make 사용 시도

`make`는 동작하지 않습니다. scons + env tool 또는 RT-Thread Studio가 정식 빌드 경로입니다. Keil/IAR 사용자는 `scons --target=mdk5` 등으로 project 파일을 생성해서 그 IDE 안에서 빌드합니다.

## 정리

- RT-Thread는 ~10K LoC 경량 커널과 풍부한 component를 같은 트리에 묶은 RTOS입니다.
- 모든 커널 객체가 `rt_object`를 상속하는 *object-oriented C* 설계로, kobject와 비슷한 container를 가집니다.
- Scheduler는 최대 256 priority bitmap + `__rt_ffs`로 O(1) lookup을 제공합니다.
- `ipc.c` 하나에 세마포어, 뮤텍스, event, mailbox, msg queue가 같은 wait/schedule 패턴 위에 구현됩니다.
- DFS, LwIP, POSIX, FinSH 같은 components가 KConfig로 켜고 끄는 *모듈형 통합*으로 제공됩니다.
- Smart variant는 MMU 기반 user/kernel 분리를 더해 *Linux와 RTOS 사이*를 메웁니다.
- 빌드는 env tool + scons가 표준이며, RT-Thread Studio가 별도 IDE로 제공됩니다.
- 중국 vendor MCU(GD32, HK32, N32, WCH 등)의 *de facto 표준 RTOS*입니다.

다음 편은 [5-04 RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)에서 새 아키텍처에 RTOS를 옮기는 절차를 정리합니다.

## 관련 항목

- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
