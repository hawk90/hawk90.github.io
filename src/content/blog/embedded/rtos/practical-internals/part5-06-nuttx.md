---
title: "5-06: Apache NuttX — POSIX·PX4·Mars Helicopter Ingenuity"
date: 2026-05-20T07:00:00
description: "Apache NuttX RTOS. POSIX-compliant. PX4 드론, NASA Ingenuity 채택. Microkernel."
series: "Practical RTOS Internals"
seriesOrder: 51
tags: [nuttx, posix, px4, ingenuity, microkernel]
draft: true
---

## 한 줄 요약

> **"NuttX = 임베디드용 POSIX RTOS"** — NASA Mars helicopter·PX4 드론 채택.

## 역사·도입

```text
NuttX:
  - 2007년 Gregory Nutt 시작
  - 2019년 Apache Foundation incubation
  - 2021년 Apache top-level project
  - License: Apache 2.0
  
Notable adoption:
  - PX4 (드론·UAV autopilot 표준)
  - NASA Ingenuity (Mars helicopter, 2021-)
  - Sony Spresense
  - Xiaomi Vela (스마트홈 IoT)
  - Espressif ESP32 (alternative to ESP-IDF)
```

NASA Ingenuity — Mars 표면에서 *50+ flights* successful (2024 기준).

## 디렉토리 구조

```text
nuttx/
├── sched/                  # scheduler·task
│   ├── task/
│   ├── sched/
│   ├── semaphore/
│   ├── signal/
│   ├── pthread/
│   └── ...
├── fs/                     # filesystem
│   ├── vfs/
│   ├── fat/
│   ├── nfs/
│   └── ...
├── net/                    # network stack
│   ├── tcp/
│   ├── udp/
│   ├── icmp/
│   └── ...
├── drivers/                # device drivers
│   ├── usbhost/
│   ├── lcd/
│   ├── sensors/
│   └── ...
├── arch/                   # architecture
│   ├── arm/src/cortex-m7/
│   ├── risc-v/
│   └── ...
├── boards/                 # board configurations
├── libs/                   # libc 등 lib
└── include/
```

크기 — *~100K lines C*. FreeRTOS(20K) + Zephyr(50K) 사이.

## POSIX 호환성

```c
#include <pthread.h>
#include <unistd.h>
#include <fcntl.h>
#include <signal.h>

pthread_t tid;
pthread_create(&tid, NULL, thread_func, NULL);
pthread_join(tid, NULL);

int fd = open("/dev/ttyS0", O_RDWR);
write(fd, data, len);
close(fd);

sigaction(SIGINT, &sa, NULL);
kill(getpid(), SIGTERM);
```

**Linux 코드 거의 그대로** 임베디드에서 컴파일·실행.

## Task vs Thread

```c
/* Task — Linux process 같음 */
task_create("name", priority, stack_size, entry, argv);

/* pthread — Linux thread 같음 */
pthread_create(&tid, &attr, func, arg);

/* Process — 부모-자식 hierarchy */
task_spawn(...);
```

Task = *별도 address space 가능* (MMU 시). Process·thread *concept 그대로*.

## File System — Full POSIX

```c
mkdir("/data", 0777);
DIR *dir = opendir("/data");
struct dirent *e;
while ((e = readdir(dir)) != NULL) {
    printf("%s\n", e->d_name);
}
closedir(dir);
```

VFS 위 — FAT·SDFS·SmartFS·NFS·ROMFS·BinFS 등.

## Network — POSIX Socket

```c
int sock = socket(AF_INET, SOCK_STREAM, 0);
struct sockaddr_in addr;
inet_pton(AF_INET, "192.168.1.100", &addr.sin_addr);
addr.sin_port = htons(80);
connect(sock, (struct sockaddr*)&addr, sizeof(addr));
send(sock, request, sizeof(request), 0);
```

내장 IPv4·IPv6·TCP·UDP·ICMP·DHCP·DNS.

## /proc 같은 procfs

```c
FILE *fp = fopen("/proc/uptime", "r");
char buf[64];
fgets(buf, sizeof(buf), fp);
fclose(fp);
```

Linux /proc 호환 — *Linux 같은 디버그 경험*.

## NSH — NuttShell

```text
NuttShell — POSIX-style:
  
nsh> ls /
nsh> cat /proc/uptime
nsh> ps
nsh> free
nsh> ifconfig
nsh> ping 8.8.8.8
nsh> echo "Hello" > /dev/console
```

Linux 같은 *interactive shell*.

## Microkernel-Style

```text
NuttX 구조:
  - kernel space — sched·MM·VFS·driver framework
  - user space — task·thread·application
  - syscall layer (MMU 시)
  
Optional kernel mode:
  - flat build — kernel·user 모두 같은 space
  - protected build — MMU/MPU 분리
  - kernel build — full POSIX process
```

Flat build = FreeRTOS 같음. Protected/kernel build = Linux 같음.

## PX4 — 드론 표준

```text
PX4 Autopilot:
  - Open source flight stack
  - NuttX 기반 (Cortex-M7·H7·F7)
  - 1 kHz control loop
  - Sensor fusion (IMU·GPS·barometer·magnetometer)
  - Mission planning
  - MAVLink protocol
  
드론 vendors:
  - DJI alternative
  - Skydio
  - Quanergy
  - 학계·hobbyist
```

## NASA Mars Ingenuity

```text
2021년 4월 첫 비행:
  - Cortex-A53 (Qualcomm Snapdragon 801) — main
  - Cortex-M chip — sensor processing
  - Linux + ROS — main OS
  - 내부에 NuttX (FCU) — flight control

50+ flights · 무사고 (2024 기준)
  - "First powered flight on another planet"
  
NASA paper:
  "Apache NuttX is the RTOS chosen for the FCU
   because of its small footprint, real-time
   characteristics, and POSIX compliance."
```

NuttX의 *space-grade* validation.

## ROS 2 통합

```c
/* micro-ROS — ROS 2 client for RTOS */
#include <rcl/rcl.h>

rcl_node_t node = rcl_get_zero_initialized_node();
rcl_node_options_t node_ops = rcl_node_get_default_options();
rcl_node_init(&node, "my_node", "", &support, &node_ops);
```

micro-ROS — NuttX·Zephyr·FreeRTOS 위에서 ROS 2 표준 노드. 자율 로봇·드론에 사용.

## Sony Spresense

```text
Sony Spresense board:
  - Cortex-M4F multi-core (6 core)
  - NuttX official RTOS
  - GPS 내장
  - Hi-Res audio
  - Edge AI
  
교육·취미·IoT에 인기.
```

## Xiaomi Vela

```text
Xiaomi Vela:
  - NuttX fork
  - 스마트홈 IoT 디바이스
  - 글로벌 출시
  - 수억 대 deployment
```

가장 큰 NuttX 사용자.

## 빌드

```bash
git clone https://github.com/apache/nuttx
cd nuttx
git clone https://github.com/apache/nuttx-apps apps

# Configure for board
./tools/configure.sh stm32f4discovery:nsh

# Build
make

# Flash
make flash
```

Makefile + Kconfig 사용. Linux 스타일.

## 자주 하는 실수

> ⚠️ POSIX 100% 가정

```c
fork();   /* ← NuttX flat·protected 빌드에선 없음 */
```

→ task_create 또는 task_spawn.

> ⚠️ Large RAM 가정

```c
malloc(1024 * 1024);   /* 1 MB — Cortex-M flat에서 fail */
```

→ embedded RAM 인지.

> ⚠️ ESP-IDF + NuttX 혼동

```text
Espressif는 두 RTOS 선택:
  - ESP-IDF (FreeRTOS-based, 기본)
  - NuttX (Apache 2.0, 일부)
  
ESP-IDF doc 보고 NuttX 시도 → 차이 큼
```

→ 명확히 선택.

> ⚠️ NuttX·Linux 코드 차이 무시

```c
#include <linux/...>   /* ✗ — NuttX은 POSIX·BSD-like */
```

→ standard POSIX 헤더만.

## 정리

- NuttX = **POSIX-compliant 임베디드 RTOS**.
- **NASA Ingenuity·PX4 드론** 채택 — space-grade validation.
- pthread·socket·signal·VFS — Linux 같은 API.
- Flat·Protected·Kernel build mode.
- ROS 2·MAVLink 통합.
- Sony·Xiaomi·NASA·드론 vendors.

다음 편은 **PREEMPT_RT Linux**.

## 관련 항목

- [5-05: Selection Guide](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
- [5-07: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
