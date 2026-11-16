---
title: "RT-Thread 분석 — Object 모델·Components·Smart·Studio"
slug: "embedded/rtos/practical-internals/part5-03-rt-thread"
date: 2026-05-08T09:48:00
description: "RT-Thread의 object-oriented C 설계와 component 생태계를 따라갑니다. FreeRTOS급 경량 kernel 위에 DFS·LwIP·POSIX·FinSH가 어떻게 얹히는지, Smart variant가 무엇을 더 가져오는지 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 48
tags: [rt-thread, source-analysis, components, smart, finsh]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"RT-Thread는 경량 커널과 풍부한 component를 같은 트리에 묶어 둡니다."** — 필요 기능을 선택할 수 있으며 실제 footprint는 port·config·library와 같은 workload로 비교해야 합니다.

## 어떤 문제를 푸는가

FreeRTOS 저장소는 커널만 담고, 파일 시스템·네트워크·shell은 따로 붙여야 합니다(5-01). Zephyr는 그것들을 다 담지만 devicetree·Kconfig·CMake를 같이 배워야 합니다(5-02). RT-Thread는 커널과 component를 한 저장소에 두고 Kconfig + scons로 고르는 방식입니다. 기본 반찬이 차려진 백반집에서 원하는 반찬만 더 시키는 것에 가깝습니다.

이번 편의 목표는 두 가지입니다. 첫째, *object-oriented C*로 구현된 RT-Thread의 커널 구조를 짚습니다. 둘째, `components/`에 모인 통합 서브시스템과 *Smart variant*까지 한눈에 정리합니다. 시장 점유율 대신 source와 component 경계를 읽는 글입니다.

기준은 **RT-Thread v5.1.0**, commit `4f7940167d172858e37373bc330c7093e8765d5b`(2024-04-22)입니다. 저장소 `LICENSE`는 Apache License 2.0입니다. 소스를 읽는 것과 함께, 공식 BSP `bsp/qemu-vexpress-a9`를 Debian 13 arm64 guest에서 Debian의 `gcc-arm-none-eabi` 14.2.1 + newlib과 scons로 빌드하고 QEMU 10.0.13 `-M vexpress-a9`에서 돌렸습니다.

## 기준 버전과 범위

이 글은 kernel object, single-core scheduler, semaphore, shell을 소스와 실행으로 봅니다. Smart(user process)·RT-Thread Studio·SMP는 소스와 문서만 봤고 돌리지 않았습니다. 시장 점유나 채택 사례는 다루지 않습니다.

```text
 \ | /
- RT -     Thread Operating System
 / | \     5.1.0 build Nov 16 2026 11:17:45
 2006 - 2024 Copyright by RT-Thread team
Hello RT-Thread!
msh />
```

## 저장소 구조

```text
rt-thread/
├── src/                       # 커널 본체
│   ├── thread.c               # rt_thread
│   ├── scheduler_up.c / scheduler_mp.c
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
├── bsp/                       # 보드 지원
│   ├── stm32/
│   ├── ESP32_C3/
│   ├── qemu-vexpress-a9/
│   └── ...
├── components/                # 통합 서브시스템
│   ├── dfs/                   # device filesystem
│   ├── net/                   # LwIP 등
│   ├── libc/                  # posix/ 포함
│   ├── finsh/                 # CLI
│   ├── drivers/
│   └── lwp/                   # Smart의 user process
└── examples/
```

예전 판의 `bsp/esp32/`·`bsp/ch32/`·`components/posix/`는 v5.1.0 트리에 없어 실제 이름(`ESP32_C3`, `components/libc/posix`)으로 고쳤습니다. 위 BSP를 빌드한 image의 크기는 이렇습니다. shell, 파일 시스템, SD driver가 모두 켜진 BSP 기본 설정입니다.

```text
arm-none-eabi-size rtthread.elf
   text	   data	    bss	    dec	    hex	filename
 504962	  34260	  79188	 618410	  96faa	rtthread.elf
```

## rt_thread 구조

v5.1.0 `include/rtdef.h:855`의 `struct rt_thread`는 첫 멤버로 **`struct rt_object parent`**를 두고, 그 바로 뒤에 `sp`·`entry`가 옵니다. FreeRTOS TCB가 `pxTopOfStack`을 맨 앞에 두는 것과 달리, RT-Thread는 공통 object header를 맨 앞에 두고 stack pointer를 그 다음에 둡니다. context switch 함수는 `rt_hw_context_switch((rt_ubase_t)&from_thread->sp, (rt_ubase_t)&to_thread->sp)`(`src/scheduler_up.c:276`)처럼 `sp` 필드의 주소를 인자로 받으므로, 어셈블리가 이 offset을 알 필요가 없습니다.

## Object 시스템 — C로 흉내낸 상속

이 글에서 보는 thread·IPC 등 관리 객체는 `rt_object`를 *상속*합니다. C에 클래스가 없으므로 *첫 멤버를 base struct로 두는 관용*이 사용됩니다.

아래는 `include/rtdef.h:335-354`에서 `RT_NAME_MAX > 0`일 때의 필드만 고른 것입니다. `RT_USING_MODULE`·`RT_USING_SMART`일 때 붙는 필드는 뺐습니다. 위 BSP의 `RT_NAME_MAX`는 8입니다.

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

모든 thread와 semaphore가 종류별 list에 걸려 있으니, shell은 그 list를 훑기만 하면 됩니다. QEMU에서 `list thread`와 `list sem`을 쳤습니다.

```text
msh />list thread
thread   pri  status      sp     stack size max used left tick   error  tcb addr
-------- ---  ------- ---------- ----------  ------  ---------- ------- ----------
tshell    20  running 0x00000188 0x00001000    16%   0x0000000a OK      0x600b1bc8
aio      128  suspend 0x00000080 0x00000800    06%   0x0000000a OK      0x600afbc0
mmcsd_de  22  suspend 0x000000c0 0x00004000    35%   0x00000014 EINTRPT 0x600a4350
sys wor   23  suspend 0x00000084 0x00002004    01%   0x0000000a OK      0x600ad6f8
tidle0   255  ready   0x0000005c 0x00001000    05%   0x00000007 OK      0x600a8730
timer      4  suspend 0x000000b8 0x00001000    04%   0x0000000a EINTRPT 0x600aa1b8
msh />list sem
semaphor v   suspend thread
-------- --- --------------
shrx     000 0
sem_sd0  001 0
psem     001 0
wqueue   000 0
sd_ack   000 0
wqueue   000 0
stimer   000 1:timer
```

thread 이름이 `mmcsd_de`, `sys wor`처럼 8자에서 잘린 것이 `RT_NAME_MAX 8`의 결과입니다. idle thread의 priority가 255인 것은 이 BSP가 `RT_THREAD_PRIORITY_MAX 256`이기 때문입니다. 같은 이름의 semaphore(`wqueue`)가 둘 있어도 object는 이름이 아니라 주소로 구별됩니다. QEMU를 `-smp cpus=2`로 띄웠지만 이 BSP 설정은 `RT_CPUS_NR 1`이라 idle thread가 하나뿐입니다.

## Scheduler — Priority Bitmap (최대 256)

v5.1.0 `src/scheduler_up.c`의 `_scheduler_get_highest_priority_thread()`는 `RT_THREAD_PRIORITY_MAX`가 32보다 크면 두 단계로 찾습니다(`:94-101`). 숫자가 작을수록 높은 priority입니다.

1. number = __rt_ffs(group) - 1로 8-priority 묶음을 고릅니다.
2. priority = (number << 3) + __rt_ffs(table[number]) - 1로 세부 번호를 구합니다.

`__rt_ffs()`는 가장 낮은 1 bit의 위치를 1부터 세므로, 두 곳의 `- 1`이 빠지면 index가 하나씩 밀립니다. group이 0이면 `__rt_ffs()`가 0을 돌려 `-1`이 되는데, idle thread가 항상 ready라 실제로는 일어나지 않습니다. 같은 산술을 JS로 옮긴 모델입니다.

```js title="rt-priority-model.mjs"
export function readyPriority(group, table) {
    if (!Number.isInteger(group) || group <= 0 || group > 0xffffffff ||
        !Array.isArray(table) || table.length !== 32) throw new RangeError('group/table');
    const lowest = value => { let n = 0; while ((value & 1n) === 0n) { value >>= 1n; ++n; } return n; };
    const bucket = lowest(BigInt(group));
    const bits = table[bucket];
    if (!Number.isInteger(bits) || bits <= 0 || bits > 255) throw new RangeError('bucket');
    return bucket * 8 + lowest(BigInt(bits));
}
```

Node.js v24.21.0에서 돌린 결과입니다. bucket 2(priority 16~23)에 bit 2·5, bucket 31(priority 248~255)에 bit 7이 서 있으면 가장 높은 ready priority는 2×8+2 = 18이고, idle(255)만 있으면 255입니다.

```text
group=0x80000004, table[2]=0x24, table[31]=0x80 -> priority 18
only idle (255): group=0x80000000 -> priority 255
group=0 -> RangeError: group/table
```

kernel 코드와 달리 이 모델은 group 0을 예외로 막습니다. 이 모델은 산술만 확인한 것이고 kernel의 동시성은 다루지 않습니다.

## IPC — 다섯 가지를 한 파일에

v5.1.0 `src/ipc.c`에서 `rt_sem_take()`(`:644`)는 `_rt_sem_take()`(`:558`)로 이어지고, 그 함수는 semaphore마다 있는 `sem->spinlock`을 `rt_spin_lock_irqsave()`로 잡습니다(`:573`). Zephyr가 모든 `k_sem`을 파일 범위 lock 하나로 보호하는 것(5-02)과 달리 객체마다 lock을 둡니다. 단일 core 빌드에서 이 spinlock은 interrupt를 막는 것과 같은 효과입니다. 위 `list sem`의 `stimer 000 1:timer`는 timer thread가 count 0인 `stimer`를 기다리는 상태를 보여 줍니다.

mutex·event·mailbox·message queue도 같은 `ipc.c`에 있지만, 반환값과 priority 처리는 함수마다 다르므로 각 함수를 따로 읽습니다.

## Components — DFS (Device Filesystem)

```c
#include <dfs_posix.h>

/* mount된 filesystem의 실제 path와 open/read/close 결과 확인 필요 */
int fd = open("/data/file.txt", O_RDONLY);
read(fd, buf, sizeof(buf));
close(fd);
```

v5.1.0에서 `dfs_posix.h`는 `components/dfs/dfs_v2/include/`와 `components/legacy/dfs/`에 있습니다. 파일 시스템 구현은 Kconfig로 고르는데, 위 BSP는 SD 카드에 elm(FatFs)을 씁니다. 부팅 로그에서 빈 SD image를 mount하려다 실패하자 format한 뒤 다시 mount하는 과정이 보입니다.

```text
[W/DFS.fs] mount / failed with file system type: elm
[W/FileSystem] [sd] File System on SD ('sd') initialization failed!
[W/FileSystem] [sd] Try to format and re-mount...
[I/FileSystem] [sd] File System on SD ('sd') initialized!
```

로그 앞뒤의 색상 escape code는 지웠습니다.

## Components — LwIP 통합 네트워크

```c
#include <lwip/sockets.h>

int sock = socket(AF_INET, SOCK_STREAM, 0);
connect(sock, (struct sockaddr*)&addr, sizeof(addr));
send(sock, data, len, 0);
```

lwIP는 `components/net/` 아래에 들어 있고, 켜면 BSD socket API를 씁니다. 위 BSP 빌드에서는 network를 켜지 않아 이 코드는 돌리지 않았습니다.

## FinSH·MSH — 진단 Shell

위 BSP에서 `help`를 치면 그 빌드에 들어간 명령이 나옵니다. 일부만 옮깁니다.

```text
version          - show RT-Thread version information
list             - list objects
help             - RT-Thread shell help
ps               - List threads in the system
free             - Show the memory usage in the system
```

`free`의 결과입니다. 이 BSP의 heap 총량은 66406992 byte(약 63 MiB)입니다.

```text
msh />free
total    : 66406992
used     : 31704
maximum  : 50424
available: 66375288
```

새 명령은 `components/finsh/finsh.h:142`의 `MSH_CMD_EXPORT` 매크로 한 줄로 추가합니다.

```c
static void hello(int argc, char **argv) {
    (void)argc; (void)argv;
    rt_kprintf("hello from finsh\n");
}
MSH_CMD_EXPORT(hello, simple hello command);
```

## Smart — POSIX + MMU

Smart는 MMU가 있는 target에서 user process와 주소 공간을 추가하는 구성이고, 구현은 `components/lwp/`에 있습니다. `struct rt_object`에 `RT_USING_SMART`일 때만 붙는 `lwp_ref_count`(`rtdef.h:349-351`)가 그 흔적입니다. 이 글에서는 Smart를 빌드하지 않았습니다. 예전 판의 "256 MB 이상" 같은 요구 사양은 출처가 없어 지웠습니다.

## env tool과 scons

RT-Thread 빌드 환경은 `env` tool + `scons`(Python 기반)입니다.

```bash
env                       # RT-Thread 빌드 환경 진입 (Windows·Linux)
scons --menuconfig        # 인터랙티브 KConfig
scons -j4                 # 빌드
scons --target=mdk5       # Keil project 생성
scons --target=iar        # IAR project 생성
```

이 글에서는 env tool 없이 `bsp/qemu-vexpress-a9`에서 `RTT_EXEC_PATH=/usr/bin scons -j4`만 돌렸습니다. toolchain 경로는 BSP의 `rtconfig.py`가 `RTT_EXEC_PATH` 환경 변수로 받습니다(`rtconfig.py:33`). `bsp/simulator`(Linux host 위 simulator)도 시도했지만 glibc의 `struct timeval`과 RT-Thread libc header가 충돌해(`components/libc/compilers/common/include/sys/time.h:52`) 빌드되지 않았습니다. `--target=mdk5`·`iar`는 돌리지 않았습니다.

## RT-Thread Studio — IDE

RT-Thread Studio라는 IDE가 별도로 있지만, 이 글에서는 설치하지도 문서를 확인하지도 않아 기능 설명은 지웠습니다.

## SMP Support

SMP는 `RT_USING_SMP`와 `RT_CPUS_NR`로 켭니다. 위 BSP는 `RT_CPUS_NR 1`이었습니다. thread를 특정 CPU에 묶는 `rt_thread_control(thread, RT_THREAD_CTRL_BIND_CPU, arg)`는 `arg` 포인터 값 자체를 CPU 번호로 씁니다(`src/thread.c:816-819`, `cpu = (rt_uint8_t)(size_t)arg`). 그래서 번호를 담은 변수의 주소가 아니라 `(void *)1`처럼 번호를 바로 넘깁니다. SMP 빌드는 돌리지 않았습니다.

## ESP32 적용

v5.1.0에서 Espressif 칩용 BSP는 `bsp/ESP32_C3`입니다(예전 판의 `bsp/esp32`는 없습니다). 아래 코드는 위 QEMU BSP의 `Hello RT-Thread!`와 같은 형태의 main이고, ESP32_C3에서는 돌리지 않았습니다.

```c
#include <rtthread.h>

int main(void)
{
    rt_kprintf("Hello RT-Thread on ESP32-C3\n");
    while (1) {
        rt_thread_mdelay(1000);
    }
}
```

## RT-Thread vs FreeRTOS vs Zephyr

이 시리즈에서 본 세 커널의 semaphore 보호 방식만 놓고 봐도 셋이 다릅니다.

| 항목 | FreeRTOS V11.2.0 | Zephyr v3.7.0 | RT-Thread v5.1.0 |
| --- | --- | --- | --- |
| semaphore 보호 | `taskENTER_CRITICAL()` | `sem.c`의 lock 하나 공유 | 객체마다 `spinlock` |
| priority 방향 | 숫자 클수록 높음 | 숫자 작을수록 높음 | 숫자 작을수록 높음 |
| 최대 priority 수 | `configMAX_PRIORITIES` | Kconfig (이 빌드 15) | 8·32·256 중 Kconfig 선택 (이 BSP 256) |
| 저장소 범위 | 커널 + port | 커널 + driver + devicetree | 커널 + component + BSP |

image 크기 비교는 같은 MCU와 같은 기능으로 빌드해야 의미가 있어서 이 글에서는 하지 않았습니다.

## 자주 보는 함정

- stack 크기를 감으로 정합니다. `list thread`의 `max used` 열(위 실행에서 `mmcsd_de` 35%)로 실제 사용률을 봅니다.
- 빈 저장 장치에 파일 시스템이 있다고 봅니다. 위 BSP는 mount 실패 뒤 format으로 복구했습니다.
- `RT_NAME_MAX`보다 긴 object 이름이 그대로 남는다고 봅니다. 8자에서 잘립니다.
- `RT_THREAD_CTRL_BIND_CPU`에 CPU 번호 변수의 주소를 넘깁니다. 포인터 값이 번호로 해석됩니다.
- object list를 훑는 도중 다른 thread가 object를 만들거나 지울 수 있다는 점을 잊습니다.

## 정리

- v5.1.0 `qemu-vexpress-a9` BSP는 Debian의 arm-none-eabi gcc + newlib과 scons로 빌드되고, QEMU에서 msh shell까지 올라왔습니다.
- 모든 kernel 객체는 `struct rt_object`를 첫 멤버로 두고 종류별 list에 걸리며, `list thread`·`list sem`이 그 list를 보여 줍니다.
- 256-priority 탐색은 32-bit group과 8-bit table의 두 단계 `__rt_ffs() - 1`입니다.
- semaphore는 객체마다 spinlock을 `rt_spin_lock_irqsave()`로 잡습니다.
- 예전 판의 `bsp/esp32`·`bsp/ch32`·`components/posix`는 v5.1.0에 없는 경로였습니다.

## 근거 자료

- [RT-Thread v5.1.0](https://github.com/RT-Thread/rt-thread/tree/v5.1.0), [rtdef.h](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/include/rtdef.h), [scheduler_up.c](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/src/scheduler_up.c), [ipc.c](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/src/ipc.c).
- [thread.c](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/src/thread.c), [LWP](https://github.com/RT-Thread/rt-thread/tree/v5.1.0/components/lwp), [finsh.h](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/components/finsh/finsh.h), [qemu-vexpress-a9 BSP](https://github.com/RT-Thread/rt-thread/tree/v5.1.0/bsp/qemu-vexpress-a9).



다음 편은 [5-04 RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)에서 새 아키텍처에 RTOS를 옮기는 절차를 정리합니다.

## 관련 항목

- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
