---
title: "5-06: Apache NuttX — POSIX·PX4·NASA Ingenuity"
date: 2026-05-07T07:00:00
description: "NuttX의 POSIX-compliant 구조를 따라가며 PX4 autopilot과 NASA Ingenuity 화성 헬리콥터 채택 배경을 정리합니다. Flat/Protected/Kernel 빌드, VFS, 네트워크, NSH, micro-ROS 통합까지 한 지도로 모읍니다."
series: "Practical RTOS Internals"
seriesOrder: 51
tags: [nuttx, posix, px4, ingenuity, microkernel]
---

## 한 줄 요약

> **"NuttX는 MCU에 올라가는 미니 Unix입니다."** — pthread·socket·VFS가 모두 표준 POSIX이며, PX4와 NASA Ingenuity가 같은 이유로 선택했습니다.

## 어떤 문제를 푸는가

대부분의 RTOS는 *자체 API*를 가집니다. FreeRTOS의 `xQueueSend`, ThreadX의 `tx_queue_send`, Zephyr의 `k_msgq_put`은 모두 비슷한 일을 하지만 시그니처가 다릅니다. 이 비표준성은 *Linux에서 작성한 코드 재활용*과 *교차 RTOS 이식*을 비싼 작업으로 만듭니다.

NuttX는 다른 길을 택했습니다. *처음부터 POSIX 1003.1을 따라가는 RTOS*입니다. `pthread_create`, `open`, `socket`, `signal`이 표준 시그니처 그대로 동작합니다. Linux 코드를 거의 그대로 옮길 수 있고, application 엔지니어가 *RTOS API를 새로 배울 필요가 거의 없습니다*.

이번 편은 두 가지를 봅니다. 첫째, NuttX의 빌드 모드 세 가지(Flat·Protected·Kernel)와 그 의미입니다. 둘째, PX4와 NASA Ingenuity가 NuttX를 채택한 *기술적 근거*를 따라가며 임베디드 POSIX RTOS의 가치를 짚습니다.

저장소는 `github.com/apache/nuttx`, 라이선스는 Apache 2.0입니다.

## 역사

| 시기 | 이벤트 |
|---|---|
| 2007 | Gregory Nutt 개인 프로젝트로 시작 |
| 2019 | Apache Software Foundation incubator 진입 |
| 2021 | Apache Top-Level Project 승격 |
| 현재 | ~100K LoC, Apache 2.0 |

채택 사례

- **PX4 Autopilot** — 드론·UAV 표준 flight stack
- **NASA Ingenuity Mars Helicopter** — 2021년 첫 화성 비행
- **Sony Spresense** — Cortex-M4F 6-core 보드
- **Xiaomi Vela** — 스마트홈 IoT (수억 대)
- **Espressif ESP32** — ESP-IDF 대안

특히 NASA Ingenuity는 *지구 밖 첫 동력 비행*을 NuttX 위에서 수행했고, 50+ 비행을 무사고로 완수해 *space-grade validation*을 사실상 받은 RTOS입니다.

## 저장소 구조

```text
nuttx/
├── sched/               # 스케줄러·task·thread·signal·pthread
├── fs/                  # VFS·FAT·NFS·SmartFS·ROMFS·BinFS
├── net/                 # TCP·UDP·ICMP·IPv6·DHCP·DNS
├── drivers/             # 캐릭터·블록·sensor·usbhost·lcd
├── arch/                # 아키텍처 (ARM·RISC-V·Xtensa·x86)
├── boards/              # 보드 정의
├── libs/                # libc·libxx·기타
├── include/
└── apps/                # 별도 저장소 (apache/nuttx-apps)
```

크기는 ~100K LoC로 FreeRTOS(~20K)와 Zephyr(~50K) 사이입니다. 다만 *POSIX 호환을 위한 인프라*가 차지하는 비중이 커서 단순한 코어보다 무겁게 느껴질 수 있습니다.

## POSIX 호환

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

struct sigaction sa = { .sa_handler = on_signal };
sigaction(SIGINT, &sa, NULL);
```

Linux용 코드 거의 그대로입니다. 이 호환성이 PX4 같은 *대규모 항공 코드베이스*가 NuttX를 선택한 결정적 이유입니다. 같은 코드가 Linux 시뮬레이션 환경과 실 비행 보드에서 *동일하게* 컴파일됩니다.

## Task vs Thread vs Process

```c
/* Task — Linux process에 가까움 */
task_create("name", priority, stack_size, entry, argv);

/* pthread — Linux thread */
pthread_create(&tid, &attr, func, arg);

/* Process — 부모-자식 hierarchy (Protected/Kernel 빌드) */
task_spawn(...);
```

Task와 process는 *별도 address space*를 가질 수 있습니다(MMU/MPU 활성 시). thread는 같은 task 안의 실행 흐름입니다. 이 분리가 Linux와 같은 방식으로 동작하므로 *권한 분리*가 자연스럽게 표현됩니다.

## 세 가지 빌드 모드

NuttX의 가장 독특한 점입니다. 빌드 모드를 *세 가지로 선택*할 수 있고, 각각 다른 격리 모델을 가집니다.

Flat build (기본)

- kernel + application 같은 address space
- FreeRTOS·Zephyr 일반 빌드와 비슷
- MPU/MMU 없는 소형 MCU에 적합

Protected build (MPU)

- kernel과 user 영역을 MPU로 분리
- syscall 경유 호출
- Cortex-M MPU 시스템에 적합

Kernel build (MMU)

- full process·user mode
- fork·exec·shared library 가능
- Linux-like 동작
- Cortex-A·RISC-V S-mode에 적합

같은 application 코드가 *세 모드 모두에서 동작*하도록 설계되어 있습니다. 작은 MCU에서 prototyping한 코드를 Cortex-A 보드에서 *권한 분리*가 적용된 채로 그대로 돌릴 수 있습니다.

## VFS — 표준 파일 시스템

```c
mkdir("/data", 0777);
DIR *dir = opendir("/data");
struct dirent *e;
while ((e = readdir(dir)) != NULL) {
    printf("name: %s\n", e->d_name);
}
closedir(dir);
```

VFS 위에 FAT, SmartFS, ROMFS, NFS, BinFS 등이 모두 마운트됩니다. SD 카드, SPI flash, USB mass storage가 같은 POSIX API 뒤에 숨습니다.

## /proc 호환 procfs

```c
FILE *fp = fopen("/proc/uptime", "r");
char buf[64];
fgets(buf, sizeof(buf), fp);
fclose(fp);
```

Linux `/proc`과 *호환되는 구조*가 제공됩니다. `/proc/meminfo`, `/proc/version`, `/proc/<pid>/status` 같은 친숙한 경로가 동일하게 동작하므로 디버깅과 모니터링 코드를 그대로 가져올 수 있습니다.

## 네트워크 — POSIX Socket

```c
int sock = socket(AF_INET, SOCK_STREAM, 0);
struct sockaddr_in addr = { .sin_family = AF_INET };
inet_pton(AF_INET, "192.168.1.100", &addr.sin_addr);
addr.sin_port = htons(80);

connect(sock, (struct sockaddr*)&addr, sizeof(addr));
send(sock, request, sizeof(request), 0);
recv(sock, buffer, sizeof(buffer), 0);
close(sock);
```

내장 IPv4/IPv6, TCP/UDP, ICMP, DHCP, DNS, 6LoWPAN, 802.11 지원이 표준 socket API로 노출됩니다. Linux 네트워크 코드 재활용이 자연스럽습니다.

## NSH — NuttShell

```text
nsh> ls /
.    ..   dev  proc  data

nsh> cat /proc/uptime
0:23:14

nsh> ps
   PID GROUP PRI POLICY   TYPE    NPX STATE    EVENT     SIGMASK  STACK COMMAND
     0     0   0 FIFO     Kthread N-- Ready              0000000  1024 Idle Task
     1     1 100 RR       Task    --- Running            0000000  2048 init

nsh> free
                   total       used       free    largest
       Mem:       262144      40960     221184     221184

nsh> ifconfig
eth0    Link encap:Ethernet HWaddr 00:e0:de:ad:be:ef
        inet addr:192.168.1.42 Mask:255.255.255.0

nsh> ping 8.8.8.8
nsh> echo "Hello" > /dev/console
```

Linux shell과 거의 같은 사용감입니다. 디버깅 시 *시스템 상태를 인터랙티브하게 점검*할 수 있어 임베디드 개발 효율이 크게 올라갑니다.

## PX4 — 드론 표준 flight stack

PX4 Autopilot

- open-source flight stack (BSD)
- NuttX 기반 (Cortex-M7·H7·F7)
- 1 kHz 제어 루프
- IMU·GPS·기압계·자력계 sensor fusion
- EKF 기반 자세 추정
- MAVLink 프로토콜
- mission planning

채택

- Skydio, Auterion, Quanergy 등 상업 드론
- 학계·hobbyist 표준
- DJI 생태계의 open 대안

PX4가 NuttX를 선택한 핵심 이유는 *POSIX 호환성*입니다. 같은 application 코드가 *Linux 시뮬레이션 환경(SITL)*과 *실 비행 컨트롤러*에서 동일하게 동작합니다. 개발과 테스트 사이클이 짧아집니다.

## NASA Mars Ingenuity

- **2021-04** — 첫 화성 비행 ("Wright Brothers moment")
- **~ 2024** — 72회 비행 누적, 임무 종료

하드웨어

- Qualcomm Snapdragon 801 (Cortex-A53) — main vision computer
- Cortex-M chip — flight control (FCU)
- Linux + ROS — main OS
- NuttX — FCU의 RTOS

NASA의 채택 근거 (paper 인용)

> "Apache NuttX is the RTOS chosen for the FCU because of its small footprint, real-time characteristics, and POSIX compliance."

NASA가 든 세 가지 이유 — *작은 footprint, 결정적 실시간성, POSIX 호환* — 가 NuttX의 정체성을 그대로 요약합니다. 화성 표면에서 70회 이상 무사고로 작동한 사실이 *임베디드 POSIX RTOS*의 검증 사례로 남았습니다.

## micro-ROS 통합

```c
#include <rcl/rcl.h>

rcl_node_t node = rcl_get_zero_initialized_node();
rcl_node_options_t opts = rcl_node_get_default_options();
rcl_node_init(&node, "my_node", "", &support, &opts);
```

micro-ROS는 ROS 2 노드를 RTOS 위에서 돌리는 클라이언트 라이브러리입니다. NuttX, Zephyr, FreeRTOS 위에서 동작하며, *Linux ROS 2 노드와 같은 메시지·서비스 시스템*에 참여할 수 있습니다. 자율 로봇과 드론에서 표준화가 진행 중입니다.

## Sony Spresense — 멀티코어 NuttX

Sony Spresense

- Cortex-M4F × 6 core
- NuttX 공식 RTOS
- GPS 내장
- Hi-Res audio
- Edge AI (DNNRT)

교육·취미·IoT prototype 시장에서 인기.

Spresense는 NuttX의 SMP 지원이 정식 활용되는 대표 보드입니다. 6-core 위에서 SMP NuttX가 affinity 기반 task 분배로 동작합니다.

## Xiaomi Vela — 가장 큰 NuttX 배포

Xiaomi Vela

- NuttX fork
- 스마트홈 IoT 디바이스
- 수억 대 디바이스 deployment
- 글로벌 출시 라인업

Vela는 *현존하는 가장 큰 NuttX 사용자*입니다. 작은 IoT 디바이스에서 *Linux 호환 application 모델*을 유지하면서도 *MCU footprint*에 맞춘 결과입니다.

## 빌드

```bash
git clone https://github.com/apache/nuttx
git clone https://github.com/apache/nuttx-apps apps
cd nuttx

./tools/configure.sh stm32f4discovery:nsh
make menuconfig
make -j8

make flash
```

Linux 스타일 Makefile + KConfig입니다. Zephyr와 비슷한 빌드 경험이지만 *west 같은 메타툴 없이* 단순 git + make로 끝납니다.

## NuttX vs FreeRTOS vs Zephyr — 한 줄 비교

| 항목 | NuttX | FreeRTOS | Zephyr |
|---|---|---|---|
| POSIX | 거의 완전 | minimal | partial |
| 빌드 모드 | Flat/Protected/Kernel | Flat | Flat (+ user mode) |
| 커널 LoC | ~100K | ~20K | ~50K |
| Network/BLE | 통합 | 외부 | 통합 |
| Driver model | Unix 스타일 | HAL 별도 | devicetree |
| 대표 적용 | PX4·NASA·Vela | 일반 MCU | IoT·BLE·Matter |
| 학습 곡선 | Linux 경험자 친화 | 매우 낮음 | 보통 |

POSIX 호환이 핵심 가치이고, *Linux 코드 자산이 큰 조직*과 *권한 분리*가 중요한 시스템에서 NuttX의 가치가 두드러집니다.

## 자주 보는 함정

> 경고 — POSIX 100% 가정

```c
fork();          /* Flat/Protected 빌드에서는 없음 */
mmap(...);       /* MMU 없는 빌드에서 제한 */
```

POSIX 호환은 *모드 의존적*입니다. Kernel build(MMU)에서만 fork와 mmap 같은 기능이 완전해집니다. Flat build에서는 `task_create`나 `task_spawn`을 써야 합니다.

> 경고 — Linux 헤더 포함

```c
#include <linux/...>     /* NuttX는 BSD/POSIX 스타일 */
```

NuttX는 *POSIX 표준 헤더*만 제공합니다. `<linux/...>`는 존재하지 않으며, GNU 확장도 *제한적*입니다. 표준 POSIX 시그니처에 머무는 것이 안전합니다.

> 경고 — ESP-IDF와 NuttX 혼동

Espressif ESP32 보드에는 두 가지 RTOS 옵션이 있습니다.

| 옵션 | 특징 |
|---|---|
| ESP-IDF | Espressif 기본, FreeRTOS 기반, 풍부한 driver |
| NuttX | Apache 2.0, POSIX, 작은 차이 있는 driver |

ESP-IDF 문서를 보면서 NuttX 코드를 작성하면 *driver API와 timer 동작*에서 차이로 막힙니다. 어느 RTOS를 사용할지 *프로젝트 초기에* 명확히 정해야 합니다.

> 경고 — 큰 RAM 가정

```c
malloc(1024 * 1024);    /* 1 MB — Cortex-M flat에서는 거의 실패 */
```

POSIX API가 친숙하다 보니 Linux 감각으로 *큰 메모리 alloc*을 시도하는 실수가 잦습니다. NuttX는 *임베디드 MCU의 RAM 한도*를 그대로 가집니다.

## 정리

- NuttX는 POSIX 1003.1을 *처음부터 따라가는* 임베디드 RTOS이며, Linux 코드 재활용이 가장 자연스럽습니다.
- Flat/Protected/Kernel 세 가지 빌드 모드로 *MCU에서 Cortex-A까지 동일한 application*을 다른 격리 모델에서 실행할 수 있습니다.
- VFS, POSIX socket, signal, /proc 호환 procfs가 *Linux와 같은 디버그 경험*을 제공합니다.
- PX4가 채택한 핵심 이유는 *Linux SITL과 실 비행 컨트롤러의 코드 일치*입니다.
- NASA Ingenuity가 화성에서 70회 이상 무사고로 비행해 *space-grade validation*을 사실상 확보했습니다.
- Sony Spresense, Xiaomi Vela 등 대규모 배포에서 검증되며, micro-ROS 통합으로 자율 로봇 영역에서도 자리잡고 있습니다.
- ESP32에서는 ESP-IDF와 NuttX가 *서로 다른 선택지*이므로 프로젝트 초기에 결정해야 합니다.
- POSIX 호환은 빌드 모드 의존적이므로 fork/mmap 같은 기능을 가정하기 전에 모드를 확인합니다.

다음 편은 [5-07 PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)에서 2024년 mainline에 합류한 real-time Linux를 RTOS와 비교합니다.

## 관련 항목

- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
- [5-07: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
