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

작은 MCU에서는 FreeRTOS가 충분하지만 *파일 시스템·네트워크·POSIX·shell*까지 필요한 순간 부족함을 느낍니다. 반대로 Zephyr는 풍부하지만 커널 LoC와 빌드 복잡도가 작은 프로젝트엔 과합니다. RT-Thread는 그 사이를 노린 RTOS입니다.

이번 편의 목표는 두 가지입니다. 첫째, *object-oriented C*로 구현된 RT-Thread의 커널 구조를 짚습니다. 둘째, `components/`에 모인 통합 서브시스템과 *Smart variant*까지 한눈에 정리합니다. 시장 점유율 대신 source와 component 경계를 읽는 글입니다.

기준은 **RT-Thread v5.1.0**, commit 4f7940167d172858e37373bc330c7093e8765d5b입니다. 저장소의 Apache-2.0 license와 개별 component/dependency 조건은 함께 확인합니다.

## 기준 버전과 범위

kernel object·single-core scheduler·semaphore와 static thread API를 확인합니다. Smart·Studio·BSP 지원은 kernel과 다른 범위이며 특정 제품 채택·회사/국가별 시장 순위의 증거로 사용하지 않습니다. BSP/package 수와 LoC는 해당 revision·집계 방법 없이 고정 숫자로 비교하지 않습니다.

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

v5.1.0의 rtdef.h는 struct rt_thread 첫 멤버로 **struct rt_object parent**를 둡니다. object field를 평평하게 복사한 이전 예는 실제 struct 선언이 아니었습니다.

그 뒤 sp/entry/parameter/stack_addr/stack_size, error, scheduler context macro, thread_timer, cleanup과 조건부 mutex/signal/Smart·SMP 상태를 확인합니다. 끝의 spinlock과 rt_ubase_t user_data도 실제 type을 따릅니다. 다른 RTOS의 TCB보다 항상 작다고 크기를 단정하지 않습니다.

## Object 시스템 — C로 흉내낸 상속

이 글에서 보는 thread·IPC 등 관리 객체는 `rt_object`를 *상속*합니다. C에 클래스가 없으므로 *첫 멤버를 base struct로 두는 관용*이 사용됩니다.

아래는 RT_NAME_MAX > 0이고 module/Smart의 추가 멤버를 제외한 핵심 필드 발췌입니다. 전체 layout은 rtdef.h를 따릅니다.

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

v5.1.0 scheduler_up.c의 _scheduler_get_highest_priority_thread는 RT_THREAD_PRIORITY_MAX가 32보다 클 때 두 단계로 찾습니다.

1. number = __rt_ffs(group) - 1로 8-priority 묶음을 고릅니다.
2. priority = (number << 3) + __rt_ffs(table[number]) - 1로 세부 번호를 구합니다.

__rt_ffs는 1-based 결과이므로 두 곳의 -1을 빼면 index가 틀립니다. group 번호만으로 priority list를 선택할 수도 없습니다. ready group nonzero 등 caller invariant가 필요합니다. 지원 priority config·SMP의 local/global queue 조건을 실제 source에서 확인합니다.

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

이는 256-priority **host 산술 모델**입니다. selected group/table의 일관성을 caller가 보장하며 kernel 동시성·port instruction의 실행 검증은 아닙니다. 모든 ARM/RISC-V target이 CLZ 명령을 지원한다거나 이 조회만으로 전체 scheduling의 WCET가 정해지는 것은 아닙니다.

## IPC — 다섯 가지를 한 파일에

v5.1.0 src/ipc.c에서 rt_sem_take는 _rt_sem_take로 이어집니다. 해당 경로는 sem의 spinlock을 rt_spin_lock_irqsave로 잡고 count·timeout·wait 상태와 scheduler/재개를 처리합니다. 단순 local IRQ disable 코드만을 현재 SMP-safe 구현으로 설명하지 않습니다.

mutex/event/mailbox/message queue도 이 파일에서 읽되 동일한 반환·ownership·priority protocol이라고 가정하지 않습니다. RT_EOK 성공, no-wait 실패, timeout/cancel 경로와 호출 문맥을 해당 함수별로 확인합니다.

## Components — DFS (Device Filesystem)

```c
#include <dfs_posix.h>

/* mount된 filesystem의 실제 path와 open/read/close 결과 확인 필요 */
int fd = open("/data/file.txt", O_RDONLY);
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

표준 BSD socket API가 활성화됩니다. LwIP는 외부 라이브러리지만 *기본 component로 통합*되어 있어 board network driver·memory·thread priority·socket option과 선택한 LwIP 설정을 별도로 맞춰야 합니다.

## FinSH·MSH — 진단 Shell

```text
msh /> help
msh /> ps
msh /> free
msh /> list_thread
msh /> ifconfig
msh /> ping 8.8.8.8
msh /> # command/redirection 지원은 선택한 FinSH/MSH config로 확인
```

`FinSH`는 RT-Thread의 표준 CLI입니다. 디버그 시 *시스템 상태를 인터랙티브하게 확인*할 수 있어 개발 생산성이 크게 올라갑니다. 새 명령을 추가하는 것도 매크로 한 줄이면 됩니다.

```c
static void hello(int argc, char **argv) {
    (void)argc; (void)argv;
    rt_kprintf("hello from finsh\n");
}
MSH_CMD_EXPORT(hello, simple hello command);
```

## Smart — POSIX + MMU

Smart는 user process/주소 공간과 system service를 추가하는 구성입니다. components/lwp, RT_USING_SMART·ARCH_MM_MMU 등 선택한 target/config의 지원을 확인합니다. 일반 kernel build와 동일한 기능·footprint·deadline이라고 가정하지 않습니다.

256 MB 이상이 모든 target의 최소 RAM이라거나 모든 Smart build가 fork/exec/shared library를 같은 수준으로 제공한다는 일반 표는 사용하지 않습니다. 필요한 process API·loader·libc·memory model을 실제 board와 release에서 검증합니다.

## env tool과 scons

RT-Thread 빌드 환경은 `env` tool + `scons`(Python 기반)입니다.

```bash
env                       # RT-Thread 빌드 환경 진입 (Windows·Linux)
scons --menuconfig        # 인터랙티브 KConfig
scons -j4                 # 빌드
scons --target=mdk5       # Keil project 생성
scons --target=iar        # IAR project 생성
```

board별 README와 SConstruct/rtconfig.py를 기준으로 toolchain·component를 선택합니다. scons의 project export 기능이 모든 board/toolchain에 동일하게 지원되지는 않습니다.

## RT-Thread Studio — IDE

Eclipse 기반의 RT-Thread Studio가 별도 제공됩니다. project generator, SDK 관리, devicetree 비슷한 menuconfig UI, 디버그·플래시 통합이 한 IDE에 모입니다. IDE release와 SDK/board package의 지원 조합은 별도로 확인합니다.

## SMP Support

RT_USING_SMP와 CPU 수, 지원 BSP·port를 함께 준비해야 합니다. v5.1.0의 RT_THREAD_CTRL_BIND_CPU는 arg를 정수 CPU 번호로 변환하여 scheduler bind 함수에 넘깁니다. 일반 object 포인터를 dereference하는 API처럼 혼동하지 않습니다.

생성/초기화·bind·startup의 결과와 thread 상태 조건을 확인합니다. core 수 define과 affinity 한 줄만으로 새 board가 SMP-safe가 되지는 않습니다. RTOS/port가 제공하는 interrupt와 inter-core lock·ordering 계약도 필요합니다.

## ESP32 적용

ESP32 대상은 선택한 release/BSP의 README·toolchain·지원 peripheral을 확인합니다. ESP-IDF(Espressif 기본, FreeRTOS 기반)와는 별개의 선택지로, *RT-Thread 친숙한 사용자가 ESP32 H/W를 활용*할 때 유리합니다.

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

같은 MCU·compiler·library·network/filesystem·IRQ 부하·stack 분석 조건으로 최종 image와 실행을 비교합니다. 시장 점유 별점·국가별 표준이라는 주장·source LoC만으로 프로젝트 적합성을 정하지 않습니다. 기존 driver·지원 release·유지보수·필수 API/격리 모델이 실제로 맞는지를 우선합니다.

## 자주 보는 함정

- 256/512/1024 byte를 보편적인 안전 stack 기준으로 사용하지 않습니다. 실제 call path와 관찰 workload를 검증합니다.
- component include만으로 source·mount·network driver가 준비되었다고 가정하지 않습니다.
- 문서 언어의 우열 대신 pinned source·동일 revision 문서와 issue/release 조건을 대조합니다.
- make는 항상 불가능하다는 일반화 대신 해당 BSP의 공식 build entry를 따릅니다.
- object list를 돌 때 thread/object의 동시 생성/삭제와 수명을 무시하지 않습니다.

## 정리

- v5.1.0의 실제 rt_object parent·thread layout과 scheduler 파일을 기준으로 읽습니다.
- 256-priority lookup은 group과 하위 table의 두 단계·1-based ffs 보정을 포함합니다.
- semaphore는 실제 spinlock/IRQ-save와 wait/timeout 경로를 확인합니다.
- component·Smart·Studio 지원은 kernel의 범위와 구분합니다.

## 근거 자료

- [RT-Thread v5.1.0](https://github.com/RT-Thread/rt-thread/tree/v5.1.0), [rtdef.h](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/include/rtdef.h), [scheduler_up.c](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/src/scheduler_up.c), [ipc.c](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/src/ipc.c).
- [thread.c](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/src/thread.c), [LWP](https://github.com/RT-Thread/rt-thread/tree/v5.1.0/components/lwp).



다음 편은 [5-04 RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)에서 새 아키텍처에 RTOS를 옮기는 절차를 정리합니다.

## 관련 항목

- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
