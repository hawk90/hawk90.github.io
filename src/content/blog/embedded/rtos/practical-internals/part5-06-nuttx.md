---
title: "Apache NuttX 분석 — POSIX·PX4·빌드 모드"
slug: "embedded/rtos/practical-internals/part5-06-nuttx"
date: 2026-05-08T09:51:00
description: "NuttX의 POSIX 지향 API와 PX4의 task/thread 추상화를 살펴봅니다. Flat/Protected/Kernel의 격리 차이, VFS·procfs·socket과 board/config 조건, 출처 없는 NASA 채택 인용의 한계를 구분합니다."
series: "Practical RTOS Internals"
seriesOrder: 51
tags: [nuttx, posix, px4, ingenuity, microkernel]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"NuttX는 MCU에 올라가는 미니 Unix입니다."** — POSIX 지향 API를 제공하지만 지원 option·resource·격리 모델과 Linux 호환 범위를 확인해야 합니다.

## 어떤 문제를 푸는가

이 시리즈의 RTOS들은 각자 API가 있습니다. FreeRTOS의 `xQueueSend()`, Zephyr의 `k_msgq_put()`, RT-Thread의 `rt_mq_send()`는 비슷한 일을 하지만 시그니처가 다릅니다. NuttX는 POSIX(`open`·`read`·`pthread_create`·`socket`)를 기본 API로 삼습니다. 콘센트 모양을 국제 표준으로 맞춘 집과 같아서, Linux에서 쓰던 플러그(코드)가 꽂히는 경우가 많습니다. 다만 전압(timing)과 차단기 용량(resource limit)까지 같지는 않습니다.

이 글은 NuttX와 nuttx-apps를 `nuttx-13.1.0` 태그(각각 commit `2b5c0de5`, `3c772ea3`)로 받아 Debian 13 arm64 guest에서 `sim:nsh` 구성으로 빌드하고 돌렸습니다. simulator는 NuttX를 Linux process로 돌리는 board라, NSH·procfs·VFS는 그대로 동작하지만 interrupt timing은 실제 MCU와 다릅니다. 저장소 `LICENSE`는 Apache License 2.0입니다. 소스 tarball에서 빌드해 git 정보가 없어 version 문자열은 `0.0.0`으로 찍혔습니다.

## 범위와 근거

소스 트리의 `Documentation/`(memory configuration, task control), PX4 v1.15 architecture 문서, 그리고 sim 실행 결과를 대조합니다. 채택 사례와 배포 수량은 다루지 않습니다.

## 저장소 구조

```text
nuttx/
├── sched/               # 스케줄러·task·thread·signal·pthread
├── fs/                  # VFS·FAT·NFS·SmartFS·ROMFS·BinFS
├── net/                 # TCP·UDP·ICMP·IPv6·DHCP·DNS
├── drivers/             # 캐릭터·블록·sensor·usbhost·lcd
├── arch/                # arm arm64 avr risc-v sim x86_64 xtensa ...
├── boards/              # 보드 정의
├── libs/                # libc·libxx·기타
├── include/
└── ...                  # apps는 sibling의 별도 apache/nuttx-apps 저장소
```

`apps/`는 같은 태그의 별도 저장소 `nuttx-apps`를 nuttx 옆 디렉터리에 둡니다. NSH도 거기 있습니다. 위 sim 빌드의 `nuttx` 실행 파일은 5.4 MB(5379360 byte)였는데, 이것은 Linux용 host binary라 MCU image 크기와 비교할 수 없습니다.

## POSIX 호환

다음은 파일 앞부분을 읽는 함수입니다. POSIX만 쓰므로 Linux와 NuttX에서 같은 소스로 빌드됩니다. capacity에는 C 문자열의 `\0`이 포함되지 않습니다.

```c title="read-file-prefix.c"
#include <errno.h>
#include <fcntl.h>
#include <stddef.h>
#include <unistd.h>

/* 최대 capacity byte만 읽음. 성공 0, 실패는 음수 errno. */
int read_file_prefix(const char *path, unsigned char *out,
                     size_t capacity, size_t *used)
{
    if (path == NULL || out == NULL || used == NULL || capacity == 0)
        return -EINVAL;
    *used = 0;
    int fd = open(path, O_RDONLY);
    if (fd < 0) return -errno;
    int result = 0;
    while (*used < capacity) {
        ssize_t n = read(fd, out + *used, capacity - *used);
        if (n < 0) {
            if (errno == EINTR) continue;
            result = -errno;
            break;
        }
        if (n == 0) break;
        *used += (size_t)n;
    }
    if (close(fd) < 0 && result == 0) result = -errno;
    return result;
}
```

Linux guest에서 여섯 경우로 돌렸습니다.

```text
/proc/version          cap= 16 -> ret=0 used=16 "Linux version 6."
/proc/version          cap=256 -> ret=0 used=198 "Linux version 6.12.1"
/tmp/empty.txt         cap= 16 -> ret=0 used=0
/nonexistent           cap= 16 -> ret=-2 used=0
(null)                 cap= 16 -> ret=-22 used=99
/proc/version          cap=  0 -> ret=-22 used=99
```

capacity만큼 잘려 읽히고, 없는 파일은 `-ENOENT`(-2), 잘못된 인자는 `*used`를 건드리기 전에 `-EINVAL`(-22)입니다. 같은 함수를 NuttX에서 `/proc/version`에 쓰면 API는 같아도 내용은 다릅니다. 아래 sim 실행에서 그 파일은 "NuttX version ..."으로 시작합니다. 이 함수를 NuttX 안에서 빌드하지는 않았습니다.

## Task vs Thread vs Process

NuttX의 task는 자기 file descriptor 목록을 갖고, 같은 task 안의 pthread는 그 목록을 공유합니다. `Documentation/reference/user/01_task_control.rst:874-890`의 `task_spawn()`은 "an address in memory"인 entry point로 새 child task를 만들고, `file_actions`가 NULL이면 호출한 task의 열린 파일이 child에도 열린 채 남는다고 적습니다. 이름에 spawn이 들어가도 Flat build에서는 같은 주소 공간입니다.

sim에서 `ps`를 쳤습니다.

```text
  TID   PID  PPID PRI POLICY   TYPE    NPX STATE    EVENT     SIGMASK            STACK COMMAND
    0     0     0   0 FIFO     Kthread   - Ready              0000000000000000 0069584 Idle_Task
    4     4     0 100 FIFO     Task      - Waiting  Semaphore 0000000000000000 0067496 init_main
    9     9     4 100 FIFO     Task      - Running            0000000000000000 0067504 sh
```

kernel thread(`Kthread`)와 application task(`Task`)가 구분되고, NSH(`sh`)는 `init_main`(PID 4)의 child task(PID 9)입니다.

## 세 가지 빌드 모드

| 구성 | 구분할 memory 경계 |
|---|---|
| Flat | kernel/application이 공통 주소 공간 |
| Protected | privileged kernel과 unprivileged application 영역 분리 |
| Kernel | MMU 기반 kernel/user와 process별 virtual address space 구성 |

`Documentation/implementation/memory_configurations.rst`가 세 모드를 설명합니다. Flat은 "a single blob of code in a flat address space"이고, MMU가 있는 Cortex-A에서도 보통 identity mapping만 씁니다. Protected(`CONFIG_BUILD_PROTECTED`)는 "two blobs, one privileged and one unprivileged"로 빌드되고 application은 call gate를 통한 system call로 RTOS를 부릅니다. 같은 문서는 이 모드가 현재 "available only for the ARM Cortex-M family"이고 MPU가 두 blob을 지킨다고 적습니다(`:74-105`). 그래서 Protected에서 application끼리는 한 blob 안이라 서로 보호되지 않습니다. Kernel(`CONFIG_BUILD_KERNEL`)은 각 application process가 "its own, private address environment"에서 돕니다(`:173-185`). 위 sim 빌드의 `.config`는 `CONFIG_BUILD_FLAT=y`였습니다. 4-10의 FreeRTOS-MPU와 비교하면 Protected가 그 위치에 있습니다.

## VFS — 표준 파일 시스템

VFS가 여러 파일 시스템과 장치를 한 이름 공간에 붙입니다. sim의 `mount`입니다.

```text
nsh> mount
  /bin type binfs
  /data type hostfs
  /etc type romfs
  /proc type procfs
  /tmp type vfat
```

`/data`의 hostfs는 Linux host의 디렉터리를 그대로 보여 주는 sim 전용 파일 시스템이고, `/etc`는 image에 들어 있는 ROMFS, `/tmp`는 FAT입니다. MCU board라면 이 자리에 SD 카드나 flash 위의 파일 시스템이 mount됩니다. `/dev/mmcsd0` 같은 block device 자체는 파일이 아니므로, 파일을 쓰려면 그 장치를 어딘가에 mount한 경로를 씁니다.

## /proc 호환 procfs

procfs는 `CONFIG_FS_PROCFS=y`로 켜고, 위 sim은 이 값이 켜진 채 `/proc`에 mount돼 있었습니다. 내용을 보면 이름은 Linux와 비슷해도 형식이 다릅니다.

```text
nsh> cat /proc/version
NuttX version 0.0.0 0 Nov 16 2026 11:31:40 sim:nsh
nsh> cat /proc/1/status
Name:       sim_loop_wq
Type:       Kthread
Group:      0
State:      Waiting,Semaphore
Flags:      -
Priority:   224
Scheduler:  SCHED_FIFO
SigMask:    0000000000000000
```

`/proc/1/status`에 `Type`·`Group`·`Scheduler` 같은 NuttX 고유 필드가 있고, Linux의 `VmRSS` 같은 필드는 없습니다. Linux용 `/proc` parser는 그대로 쓰지 못합니다. `ls /proc`에는 `cpuinfo`·`meminfo`·`uptime`·`version`과 task별 디렉터리, NuttX 고유의 `tcbinfo`·`memdump`가 있었습니다.

## 네트워크 — POSIX Socket

network stack은 `net/`에 있고 BSD socket API로 씁니다. 위 `sim:nsh` 구성은 network를 켜지 않아 이 글에서는 돌리지 않았습니다.

## NSH — NuttShell

NSH는 nuttx-apps의 `nshlib`가 제공하는 shell입니다. 앞의 `ps`·`mount`·`cat`이 모두 NSH 명령이었고, `free`는 heap 상태를 보여 줍니다.

```text
nsh> free
      total       used       free    maxused    maxfree  nused  nfree name
   67108864    1859680   65249184    1860376   65189344    108      3 Umem
```

sim 구성은 heap으로 64 MiB를 잡았습니다. 이 값은 sim의 설정이고 MCU board에서는 칩의 RAM에 따라 정해집니다.

## PX4 — 드론 표준 flight stack

PX4 v1.15 architecture 문서는 "NuttX is the primary RTOS for running PX4 on a flight-control board"라고 적습니다. Linux·macOS에서는 "PX4 runs in a single process, and the modules run in their own threads"이고, 이때는 "there is no distinction between tasks and threads as on NuttX"입니다. `px4_task_spawn_cmd()`가 NuttX에서는 task를, POSIX에서는 thread를 띄우는 추상화입니다. 같은 문서는 NuttX에서 module이 task로 돌며 "they have their own file descriptor lists, but they share a single address space"라고 설명합니다. 위 sim의 `ps`에서 본 task 구조 그대로입니다. 그래서 Linux에서의 SITL simulation이 성공해도, task별 descriptor 목록이나 flight controller의 interrupt timing을 검증한 것은 아닙니다. PX4는 이 글에서 빌드하지 않았습니다.

## NASA Mars Ingenuity

예전 판은 NASA 자료의 서지 없이 "NuttX를 고른 이유"라는 영문 문장을 따옴표로 인용했습니다. 확인할 원문이 없어 **그 인용과 NuttX의 space-grade validation 주장을 철회합니다.** NASA/JPL의 2021-07-08 기사 "Meet the Open-Source Software Powering NASA's Ingenuity Mars Helicopter"가 확인하는 것은 F Prime이라는 flight software framework 사용이고, 같은 기사에서 Tim Canham은 "an open-source operating system"을 썼다고만 말할 뿐 이름을 밝히지 않습니다. 기사 본문에 NuttX라는 단어는 없습니다. 그래서 이 글은 Ingenuity를 NuttX의 사례로 쓰지 않습니다.

## micro-ROS 통합

micro-ROS의 NuttX 지원은 이 글에서 원문을 확인하지 않았고 빌드하지도 않아 설명을 지웠습니다. 예전 판의 `rcl_node_init()` 조각도 선언되지 않은 변수를 쓰고 있어 함께 지웠습니다.

## Sony Spresense — 멀티코어 NuttX

NuttX 13.1.0 트리에는 Sony Spresense용 board가 `boards/arm/cxd56xx/spresense/`에 있습니다. Sony SDK의 SMP·ASMP 설정은 SDK 문서 사이트(developer.sony.com)를 이 글을 쓰며 열 수 없어 설명을 지웠습니다.

## Xiaomi Vela — 가장 큰 NuttX 배포

Xiaomi Vela와 NuttX의 관계, 배포 규모는 이 글에서 원문을 확인하지 않아 다루지 않습니다.

## 빌드

nuttx와 nuttx-apps를 같은 태그로 받아 `nuttx/`와 `apps/`를 나란히 둔 뒤, `nuttx/`에서 `./tools/configure.sh -l sim:nsh`, `make -j4`를 했습니다. configure 단계는 Kconfig 도구가 필요합니다. Debian의 `python3-kconfiglib` package에는 `olddefconfig` 같은 명령이 없어 `pip install kconfiglib`로 넣었고, `tools/sethost.sh:164-176`이 부르는 `kconfig-tweak`은 따로 없어 `--enable`·`--disable`만 처리하는 작은 shell script로 대신했습니다. 이 shim은 harness 디렉터리에 남겨 뒀습니다. 그 뒤 configure와 build가 통과했습니다.

```text
nsh> uname -a
NuttX 0.0.0 0 Nov 16 2026 11:31:40 sim sim
```

## NuttX vs FreeRTOS vs Zephyr — 한 줄 비교

| 항목 | FreeRTOS V11.2.0 | Zephyr v3.7.0 | NuttX 13.1.0 |
| --- | --- | --- | --- |
| 기본 API | FreeRTOS API | `k_*` API | POSIX |
| POSIX | 커널 저장소에 없음 | `lib/posix/` 계층 | 기본 |
| 메모리 보호 | MPU port(4-10) | `CONFIG_USERSPACE` | Protected(Cortex-M MPU)·Kernel(MMU) |
| host 실행 | POSIX port(4-13, 5-01) | native_sim(5-02) | sim(이 글) |

## 자주 보는 함정과 안티패턴

- `/proc` 파일 이름이 같다고 Linux parser를 그대로 씁니다. 위 `/proc/1/status`처럼 필드가 다릅니다.
- Protected build를 application마다 독립 주소 공간으로 봅니다. application 쪽 blob은 하나입니다.
- sim이나 SITL에서 돈 것을 target timing 검증으로 봅니다.
- nuttx와 apps를 다른 태그로 받습니다. 같은 태그로 맞춥니다.
- Ingenuity 같은 채택 사례를 출처 없이 인용합니다. 위 NASA 기사에는 NuttX가 없습니다.

## 정리

- NuttX 13.1.0 `sim:nsh`는 Debian arm64 guest에서 빌드되고 NSH까지 올라왔습니다(kconfig 도구 보충 필요).
- POSIX 함수는 같은 소스로 돌지만 `/proc` 내용처럼 Linux와 형식이 다른 곳이 있습니다.
- Flat·Protected·Kernel은 문서대로 주소 공간 하나, blob 둘(Cortex-M MPU), process별 주소 공간입니다.
- PX4는 NuttX에서 module을 task로, Linux에서 thread로 돌립니다.
- NASA Ingenuity 기사는 F Prime과 "an open-source operating system"만 말하고 NuttX를 언급하지 않습니다.

## 근거 자료

- [NuttX nuttx-13.1.0](https://github.com/apache/nuttx/tree/nuttx-13.1.0), [nuttx-apps nuttx-13.1.0](https://github.com/apache/nuttx-apps/tree/nuttx-13.1.0): `Documentation/implementation/memory_configurations.rst`, `Documentation/reference/user/01_task_control.rst`.
- [PX4 v1.15 architecture](https://docs.px4.io/v1.15/en/concept/architecture).
- [NASA/JPL F Prime 소개](https://www.jpl.nasa.gov/news/meet-the-open-source-software-powering-nasas-ingenuity-mars-helicopter/).



다음 편은 [5-07 PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)에서 real-time Linux를 RTOS와 비교합니다.

## 관련 항목

- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
- [5-07: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
