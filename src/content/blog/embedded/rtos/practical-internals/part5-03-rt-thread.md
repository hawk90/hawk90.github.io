---
title: "5-03: RT-Thread — Components·Smart·Studio IDE"
date: 2026-05-20T04:00:00
description: "RT-Thread 중국 RTOS. 경량 kernel + components (DFS·LwIP·POSIX). Smart MMU variant. Studio IDE."
series: "Practical RTOS Internals"
seriesOrder: 48
tags: [rt-thread, source-analysis, components, smart, studio]
draft: true
---

## 한 줄 요약

> **"RT-Thread = 중국 생태계 표준 RTOS"** — 경량 + 풍부한 components.

## 배경

```text
RT-Thread:
  - 2006년 Bernard Xiong (시작)
  - Apache 2.0 license
  - 중국 시장 dominant
  - 글로벌 — 임베디드 IoT 채택 증가
  - 30+ language support
  - 1000+ packages (component)
```

OneNET (China Mobile IoT)·CMCC·BYD 자동차·DJI 드론 채택.

## 디렉토리 구조

```text
rt-thread/
├── src/                      # 커널 코어
│   ├── thread.c              # rt_thread
│   ├── scheduler.c           # 스케줄러
│   ├── ipc.c                 # semaphore·mutex·event·mailbox·msgqueue
│   ├── timer.c
│   ├── mem.c                 # heap
│   ├── memheap.c             # 다중 heap
│   ├── object.c              # kernel object system
│   └── ...
├── include/
│   ├── rtthread.h
│   ├── rtdef.h
│   └── ...
├── libcpu/                   # architecture-specific
│   ├── arm/cortex-m4/
│   ├── risc-v/
│   └── ...
├── bsp/                      # board support packages
│   ├── stm32/
│   ├── esp32/
│   ├── allwinner/
│   └── ...
├── components/               # subsystem
│   ├── dfs/                  # device filesystem
│   ├── net/                  # lwIP
│   ├── libc/
│   ├── finsh/                # shell
│   ├── drivers/              # device driver framework
│   ├── posix/
│   └── ...
└── examples/
```

크기 — 코어만 *~10K lines*. Full release *~수십 MB*.

## rt_thread 구조

```c
struct rt_thread {
    /* rt_object inherit */
    char name[RT_NAME_MAX];
    rt_uint8_t type;
    rt_uint8_t flags;
    rt_list_t list;
    
    /* Stack */
    void *sp;
    void *entry;
    void *parameter;
    void *stack_addr;
    rt_uint32_t stack_size;
    
    /* Scheduling */
    rt_err_t error;
    rt_uint8_t stat;
    rt_uint8_t current_priority;
    rt_uint8_t init_priority;
    rt_uint32_t number_mask;     /* for priority bitmap */
    
    /* Time slice */
    rt_uint32_t init_tick;
    rt_uint32_t remaining_tick;
    
    /* Wait */
    rt_list_t tlist;             /* thread list */
    
    /* Lwp */
    int oncpu;                   /* SMP */
    rt_uint32_t cpus_lock_nest;
    
    /* User data */
    void *user_data;
};
```

FreeRTOS TCB·Zephyr k_thread보다 *간단*. 임베디드 *친화적 크기*.

## Object System

```c
struct rt_object {
    char name[RT_NAME_MAX];
    rt_uint8_t type;        /* OBJECT_CLASS_THREAD, SEMAPHORE, etc. */
    rt_uint8_t flag;
    rt_list_t list;
};

/* Container — type별 list */
struct rt_object_information *information = rt_object_get_information(type);
rt_list_t *list = &information->object_list;
```

모든 kernel object (thread·sem·queue·timer)가 *공통 base 상속*. Linux-like *kobject*와 비슷.

## Scheduler — Priority Bitmap

```c
/* RT-Thread — 256 priority levels */
rt_uint32_t rt_thread_ready_priority_group;

/* 32-bit × 8 = 256 priority */
rt_uint8_t rt_thread_ready_table[32];

void rt_schedule(void) {
    rt_uint8_t highest_ready_priority = __rt_ffs(rt_thread_ready_priority_group);
    
    rt_list_t *list = &rt_thread_priority_table[highest_ready_priority];
    struct rt_thread *thread = rt_list_entry(list->next, struct rt_thread, tlist);
    
    /* Context switch */
}
```

`__rt_ffs` (find first set) — ARM CLZ 또는 SW. *O(1) priority lookup*.

256 priority — 매우 다양한 RT system 지원.

## Components — DFS (Device Filesystem)

```c
#include <dfs_posix.h>

int fd = open("/dev/sd0/file.txt", O_RDONLY);
read(fd, buf, 100);
close(fd);
```

POSIX file API — *FATFS·LittleFS·SDFS 등 backend 통합*. SD card·SPI flash·USB 모두.

## Components — LwIP Network

```c
#include <lwip/sockets.h>

int sock = socket(AF_INET, SOCK_STREAM, 0);
connect(sock, ..., sizeof(addr));
send(sock, data, len, 0);
```

Standard BSD socket API. LwIP integrated.

## Finsh / MSH — Shell

```text
msh />
msh /> help
msh /> ps          /* 프로세스 목록 */
msh /> free        /* heap 사용 */
msh /> ifconfig    /* 네트워크 */
msh /> ifconfig 0  /* eth0 정보 */
msh /> ping 8.8.8.8
```

Linux-like shell — *RT-Thread 표준*. 개발 시 *디버그 매우 편함*.

## Smart — POSIX MMU variant

```text
RT-Thread Smart (rt-smart):
  - MMU 활용
  - Linux 같은 process·user mode
  - POSIX 완전 호환
  - 임베디드 Linux 대안
  
Hardware:
  - Cortex-A·RISC-V S-mode
  - 256 MB+ RAM
  
사용 시:
  - Linux 너무 무거움 (boot 시간·footprint)
  - 그러나 RTOS는 모자람
  → Smart!
```

자동차 인포테인먼트·산업 HMI에 채택.

## RT-Thread Studio — IDE

```text
RT-Thread Studio:
  - Eclipse-based
  - Project generator
  - SDK 자동 관리
  - Devicetree 같은 *menuconfig*
  - Debug + flash 통합
  
중국 개발자에 표준. STM32CubeIDE 대안.
```

## env Tool

```bash
# env — RT-Thread 빌드 환경
env

# menuconfig
scons --menuconfig

# Build
scons -j4

# Flash
scons --target=keil   /* keil project 생성 */
scons --target=iar
```

`scons` (Python-based build system) — FreeRTOS의 Makefile, Zephyr의 CMake와 비슷.

## ESP32 Support

```c
/* RT-Thread ESP32 BSP */
#include "esp_log.h"
#include <rtthread.h>

int main(void) {
    rt_kprintf("Hello RT-Thread\n");
    while (1) {
        rt_thread_mdelay(1000);
    }
}
```

ESP-IDF (Espressif 기본) + RT-Thread 결합. Wi-Fi·BLE 사용 가능.

## SMP Support

```c
/* SMP enabled */
RT_CPUS_NR = 4

/* Per-CPU 현재 thread */
struct rt_thread *rt_current_thread_per_cpu[RT_CPUS_NR];

/* CPU mask */
rt_thread_t thread = rt_thread_create(...);
rt_thread_control(thread, RT_THREAD_CTRL_BIND_CPU, (void*)0);   /* CPU 0 affinity */
```

Cortex-A SMP·Cortex-M Multi-core (RP2040)·RISC-V 모두 지원.

## OneCard·OneOS — 중국 벤더

```text
중국 IoT 표준 OS:
  - RT-Thread (Apache 2.0)
  - OneOS (China Mobile, fork of LiteOS)
  - HUAWEI LiteOS (Huawei)
  - AliOS Things (Alibaba)
  
RT-Thread = 가장 활발한 community.
```

## Hardware Compatibility

```text
지원 MCU·SoC:
  - STM32 (모든 라인업)
  - NXP i.MX RT·LPC
  - GD32·HK32·N32 (중국)
  - WCH (CH32V)
  - Renesas
  - Allwinner (Cortex-A)
  - Rockchip
  - Espressif
  - Nordic nRF
  - RP2040
```

특히 중국 vendor MCU (GD·HK·N32·WCH) — *RT-Thread BSP 표준 제공*.

## RT-Thread vs FreeRTOS vs Zephyr

| 항목 | RT-Thread | FreeRTOS | Zephyr |
|---|---|---|---|
| 출신 | 중국 (2006) | 영국 (2003) | LF (2016) |
| Lines (kernel) | ~10K | ~20K | ~50K |
| Components | 통합 (DFS·net·posix·shell) | 별도 | 통합 |
| IDE | RT-Thread Studio | 별도 | west·VSCode |
| BSP 수 | 300+ | 거의 모든 MCU | 200+ |
| Devicetree | × (menuconfig) | × | ✓ |
| Smart variant (MMU) | ✓ | × | × |
| 중국 시장 | ★★★ | ★★ | ★ |
| 글로벌 시장 | ★ | ★★★ | ★★★ |

## License

```text
RT-Thread Kernel — Apache 2.0
  자유 사용·상업 OK·기여 친화
  
일부 components — 별도 license
  e.g. LwIP — modified BSD
```

## 자주 하는 실수

> ⚠️ 작은 stack

```c
rt_thread_create("name", entry, NULL, 256, ...);   /* 256 byte */
```

→ Zephyr보다 작지만 최소 512+.

> ⚠️ Component 활성 안 함

```c
#include <dfs_posix.h>
open(...);   /* link error — DFS component off */
```

→ menuconfig에서 DFS·LwIP·POSIX 활성.

> ⚠️ 중국어 doc 의존

```text
공식 doc 중국어가 *더 자세함*. 영문은 일부 outdated.
```

→ Google translate·중국 forum 활용.

> ⚠️ scons vs cmake 혼동

```bash
scons --target=keil   /* Keil project 생성 */
make                  /* X — Makefile 안 만들어짐 */
```

→ RT-Thread Studio·env tool 사용.

## 정리

- RT-Thread = **중국 시장 표준 RTOS**, 글로벌 확산.
- **경량 kernel** + 풍부한 **components** (DFS·net·POSIX·shell).
- **Smart** = MMU variant — 임베디드 Linux 대안.
- **Studio IDE**·**env tool** + scons build.
- 중국 MCU (GD·HK·WCH) — *RT-Thread native*.

다음 편은 **Porting**.

## 관련 항목

- [5-02: Zephyr 소스](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-04: Porting](/blog/embedded/rtos/practical-internals/part5-04-porting)
