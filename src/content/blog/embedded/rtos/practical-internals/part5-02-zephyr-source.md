---
title: "Zephyr 커널 분석 — k_thread·k_sem·Driver Model"
slug: "embedded/rtos/practical-internals/part5-02-zephyr-source"
date: 2026-05-08T09:47:00
description: "Zephyr 커널 서브트리를 따라가며 sched.c·thread.c·sem.c의 핵심을 읽습니다. devicetree로 드라이버 인스턴스가 만들어지는 경로와 KConfig·west 빌드 체계까지 한 지도 위에 모읍니다."
series: "Practical RTOS Internals"
seriesOrder: 47
tags: [zephyr, source-analysis, k_thread, device-model, device-tree]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> Zephyr의 kernel·device·build를 연결해 읽되 Linux와 API/driver ABI가 같다고 가정하지 않습니다.

## 어떤 문제를 푸는가

FreeRTOS 저장소가 커널과 port만 담는 것과 달리, Zephyr 저장소에는 커널 옆에 *드라이버 모델*, *devicetree*, *Kconfig*, 빌드 스크립트가 함께 들어 있습니다. 부품만 파는 가게와 조립 키트를 파는 가게의 차이입니다. 키트는 설명서(devicetree·Kconfig)대로 끼우면 바로 돌지만, 부품 하나를 보려 해도 설명서부터 읽어야 합니다.

이번 편은 두 가지를 노립니다. 첫째, `kernel/` 서브트리에서 스레드와 동기화 객체가 어떻게 구현되는지 골라 봅니다. 둘째, 드라이버 인스턴스가 devicetree에서 어떻게 *컴파일 시간에* 만들어지는지를 추적합니다. 이 두 축을 잡으면 Zephyr 코드를 처음 보더라도 길을 잃지 않습니다.

기준은 **Zephyr v3.7.0**, commit `36940db938a8f4a1e919496793ed439850a221c2`(2024-07-26)입니다. 소스를 읽는 것과 함께, 이 트리를 Debian 13 arm64 guest에서 `native_sim/native/64` board로 빌드해 돌렸습니다(cmake 3.31.6, ninja, host gcc 14.2.0, west 없이 `cmake -DBOARD=...`). native_sim은 Zephyr 커널을 Linux process로 돌리는 board라서 scheduler·semaphore·devicetree 생성은 그대로 동작하지만, interrupt timing은 실제 MCU와 다릅니다.

```text
*** Booting Zephyr OS build 3.7.0 ***
Hello World! native_sim/native/64
```

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
│   ├── posix/             # native_sim
│   ├── riscv/
│   └── xtensa/
├── drivers/               # 드라이버 (vtable 기반)
│   ├── serial/            # UART (uart_stm32.c 등)
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

처음 들어갈 때는 `kernel/` 안에서 `sched.c`와 `sem.c`만 골라 봅니다. 나머지 디렉터리는 대부분 그 둘을 쓰는 쪽입니다.

## k_thread — TCB의 Zephyr 버전

`struct k_thread`는 v3.7.0 `include/zephyr/kernel/thread.h:259`에 있습니다. 앞쪽은 `struct _thread_base base`, `struct _callee_saved callee_saved`, `void *init_data`, `_wait_q_t join_queue` 순서이고(`:261-270`), 그 뒤는 `CONFIG_POLL`·`CONFIG_EVENTS`·`CONFIG_THREAD_MONITOR` 같은 config에 따라 붙는 필드입니다. `join_queue`는 조건 없이 항상 있습니다.

`base`가 offset 0이라는 점은 FreeRTOS TCB의 `pxTopOfStack`과 같은 발상입니다. native_sim 64-bit 빌드에서 크기와 offset을 찍었습니다.

```text
sizeof(struct k_sem)=24 sizeof(struct k_thread)=136 offsetof(base)=0 offsetof(callee_saved)=72
```

`callee_saved`는 함수 호출 규약상 callee가 보존해야 하는 register를 담는 architecture별 구조체입니다. 이 값은 native_sim 기준이고, Cortex-M 빌드에서는 `arch/arm`의 정의를 따라 달라집니다.

## sched.c — Config별 Ready Queue

ready queue 자료구조는 Kconfig로 고릅니다. `CONFIG_SCHED_DUMB`는 정렬된 linked list, `CONFIG_SCHED_SCALABLE`은 red-black tree, `CONFIG_SCHED_MULTIQ`는 priority별 list 배열입니다. 위 native_sim 빌드의 `.config`는 `CONFIG_SCHED_DUMB=y`였고, preemptible priority는 `CONFIG_NUM_PREEMPT_PRIORITIES=15`개였습니다. 자료구조 구현은 `kernel/include/priority_q.h`에 있습니다.

SMP에서도 run queue는 하나입니다. v3.7.0 SMP 문서는 "The kernel does not keep a per-CPU run queue"라고 적고, CPU mask를 쓰려면 `CONFIG_SCHED_DUMB`여야 한다고 적습니다([SMP 비교](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)).

## k_sem — spinlock 기반 동기화 객체

v3.7.0의 `struct k_sem`(`include/zephyr/kernel.h:3114-3117`)에는 `wait_q`, `count`, `limit`와 config에 따른 poll·tracing 필드가 있고 **lock 멤버는 없습니다.** 모든 semaphore가 `kernel/sem.c:39`의 파일 범위 `static struct k_spinlock lock` 하나를 함께 씁니다. 건물의 모든 회의실 예약을 안내 데스크 한 곳에서 받는 셈이라, 객체마다 lock을 두는 것보다 메모리는 덜 쓰지만 여러 CPU가 서로 다른 semaphore를 동시에 다뤄도 이 한 lock에서 줄을 섭니다.

| 경로 | 실제 source 동작 |
|---|---|
| z_impl_k_sem_take, count > 0 | 공통 lock 아래 감소 후 unlock |
| count 0 + K_NO_WAIT | unlock 후 `-EBUSY` (`sem.c:152`) |
| count 0 + 대기 | `z_pend_curr(&lock, key, &sem->wait_q, timeout)` (`sem.c:158`) |
| give | waiter를 깨우거나 limit까지 count 증가 |
| user call | z_vrfy 경로의 object 검증 뒤 implementation 호출 |

표의 경로를 native_sim에서 확인했습니다. `K_SEM_DEFINE(sem, 0, 2)`(초기 0, 한도 2)에 priority 2 thread를 `K_FOREVER`로 기다리게 하고, priority 0의 main이 give합니다.

```text
main (prio 0): give once -> waiter should run
waiter (prio 2): k_sem_take(K_FOREVER) -> 0 after 20 ms
count after waiter took it: 0
after 4 more gives with limit 2: count=2
take K_NO_WAIT: 0 0 -16
take K_MSEC(50) on empty: -11 after 60 ms
-EBUSY=-16 -EAGAIN=-11
```

give가 기다리던 thread에게 바로 넘어가 count는 0으로 남았고, 한도 2를 넘는 give는 버려져 count가 2에서 멈췄습니다. 빈 semaphore의 `K_NO_WAIT` take는 `-EBUSY`, 50 ms timeout은 `-EAGAIN`이었습니다. 50 ms가 60 ms가 된 것은 이 board의 tick이 `CONFIG_SYS_CLOCK_TICKS_PER_SEC=100`(10 ms)이고, timeout을 등록할 때 `kernel/timeout.c:122`가 `timeout.ticks + 1 + elapsed()`로 한 tick을 더하기 때문입니다. 최소한 요청한 시간은 기다리게 하려는 보정입니다.

## Driver Model — vtable + devicetree

Zephyr 드라이버는 *vtable + instance data + instance config* 세 가지로 구성됩니다. STM32 UART driver는 `drivers/serial/uart_stm32.c`에 있습니다(예전 판의 `drivers/uart/`는 v3.7.0에 없는 경로였습니다). vtable은 `:1904`의 `uart_stm32_driver_api`이고, instance 정의는 `STM32_UART_INIT(index)` 매크로 안에 있습니다.

```c
/* drivers/serial/uart_stm32.c:2453-2458 (STM32_UART_INIT(index) 매크로 안) */
DEVICE_DT_INST_DEFINE(index,
		    &uart_stm32_init,
		    PM_DEVICE_DT_INST_GET(index),
		    &uart_stm32_data_##index, &uart_stm32_cfg_##index,
		    PRE_KERNEL_1, CONFIG_SERIAL_INIT_PRIORITY,
		    &uart_stm32_driver_api);
/* :2467 */
DT_INST_FOREACH_STATUS_OKAY(STM32_UART_INIT)
```

`DEVICE_DT_INST_DEFINE(index, ...)`는 **한 instance**를 정의하고, 파일 끝의 `DT_INST_FOREACH_STATUS_OKAY(STM32_UART_INIT)`가 devicetree에서 `status = "okay"`인 `st,stm32-uart` 노드(`DT_DRV_COMPAT st_stm32_uart`, `:9`)마다 그 매크로를 펼칩니다. 그래서 UART가 몇 개 켜져 있든 instance가 컴파일 시간에 그만큼 만들어지고, 실행 중에 등록하는 코드는 없습니다.

devicetree 입력은 Linux DTS와 같은 문법입니다.

```dts
/* boards/st/stm32f4_disco/stm32f4_disco.dts (v3.7.0) 발췌 */
/dts-v1/;
#include <st/f4/stm32f407Xg.dtsi>
#include <st/f4/stm32f407v(e-g)tx-pinctrl.dtsi>

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

빌드 때 이 파일은 `dts/bindings`와 대조되어 `devicetree_generated.h`가 됩니다. native_sim 빌드의 생성 header에서 console 선택이 이렇게 나왔습니다.

```text
#define DT_CHOSEN_zephyr_console                 DT_N_S_uart
```

드라이버의 `DT_INST_*` 매크로가 이런 생성 이름을 읽어 instance를 만듭니다. 같은 driver를 다른 board에 쓰려면 그 board의 DTS 노드가 같은 binding(`compatible`)을 따라야 합니다.

## KConfig — feature를 컴파일에서 잘라내기

```text
# prj.conf
CONFIG_SERIAL=y
CONFIG_UART_INTERRUPT_DRIVEN=y
CONFIG_MAIN_STACK_SIZE=2048
CONFIG_LOG=y
```

문법은 Linux Kconfig와 같습니다. 위 native_sim 빌드의 configure 로그가 그 과정을 보여 줍니다. board의 `native_sim_64_defconfig`를 먼저 읽고 sample의 `prj.conf`를 합친 뒤, 결과를 `.config`와 `autoconf.h`로 씁니다. 꺼진 기능은 CMake가 그 source 파일을 아예 빌드 목록에서 빼거나 `#ifdef`로 잘라 냅니다. `menuconfig` target으로 대화형으로 고를 수도 있습니다.

```text
Loaded configuration '/root/zephyr/boards/native/native_sim/native_sim_64_defconfig'
Merged configuration '/root/zephyr/samples/hello_world/prj.conf'
Configuration saved to '/root/zb/hello/zephyr/.config'
Kconfig header saved to '/root/zb/hello/zephyr/include/generated/zephyr/autoconf.h'
```

```bash
west build -b stm32f4_disco samples/hello_world -t menuconfig
```

## west — 멀티 저장소 메타툴

west는 `west.yml` manifest에 적힌 여러 저장소(HAL, module)를 정해진 revision으로 받아 오는 workspace 도구입니다. v3.7.0 workspace 예는 다음과 같습니다. 예전 판의 `nucleo_f407g`는 v3.7.0 `boards/st/`에 없는 이름이라, F407을 쓰는 실제 board인 `stm32f4_disco`로 바꿨습니다.

```bash
west init -m https://github.com/zephyrproject-rtos/zephyr --mr v3.7.0 zephyr-workspace
cd zephyr-workspace
west update
cd zephyr
west build -b stm32f4_disco samples/hello_world
```

STM32 board로 빌드하려면 Zephyr SDK(또는 arm toolchain)와 `west update`로 받는 STM32 HAL module이 필요합니다. 이 글에서는 west와 SDK 없이 native_sim만 빌드했고, 위 west 명령은 돌리지 않았습니다.

## POSIX 서브시스템

Zephyr의 POSIX API(`lib/posix/`)는 pthread·semaphore 같은 함수를 Zephyr 커널 객체 위에 구현한 source 호환 계층입니다. Linux binary를 그대로 돌리는 것이 아니라, POSIX API로 쓴 소스를 Zephyr용으로 다시 빌드하는 것입니다. 이 글에서는 POSIX 계층을 빌드하지 않았습니다.

## Network·BLE — 통합 서브시스템

Zephyr가 FreeRTOS와 갈리는 지점은 *내장 서브시스템의 폭*입니다.

```text
subsys/net/         ip/ (ipv4.c ipv6.c tcp.c udp.c), lib/ (coap mqtt lwm2m http sockets ...)
subsys/bluetooth/   host/ controller/ mesh/ audio/ services/
subsys/usb/         device/ device_next/ host/ usb_c/
subsys/fs/          fat_fs.c littlefs_fs.c ext2/ nvs/
subsys/logging/     backends/ (log_backend_uart, rtt, net, ble, fs ...)
```

위 다섯 디렉터리는 v3.7.0 트리에 모두 있고, 각각 Kconfig로 켜고 끕니다. 괄호 안의 기능 목록은 각 디렉터리의 하위 폴더 이름에서 옮긴 것이고, 이 글에서 빌드해 본 것은 아닙니다.

## User Mode — MPU/MMU 분리

CONFIG_USERSPACE는 기능을 활성화합니다. 실제 user thread 생성에는 K_USER 등 해당 API 옵션이 필요하며 모든 thread가 자동 unprivileged가 되지는 않습니다.

```c
K_THREAD_DEFINE(user_thr, 2048, user_entry, NULL, NULL, NULL,
                5, K_USER, 0);
```

user thread에서 `k_sem_take()`를 부르면 표의 마지막 줄처럼 `z_vrfy_k_sem_take()`가 객체를 검증한 뒤 `z_impl_k_sem_take()`를 부릅니다. 객체 권한은 4-10에서 본 `k_object_access_grant()` 등으로 따로 줘야 합니다. native_sim은 MPU가 없어 이 경로는 돌리지 않았습니다.

## FreeRTOS와 Zephyr — 한 줄 비교

이 시리즈에서 직접 본 차이를 모으면 이렇습니다.

| 항목 | FreeRTOS V11.2.0 | Zephyr v3.7.0 |
| --- | --- | --- |
| 저장소 범위 | 커널 + port + heap | 커널 + driver + devicetree + subsys |
| semaphore lock | 전역 critical section(`taskENTER_CRITICAL()`) + queue별 `prvLockQueue` | 모든 `k_sem`이 `sem.c`의 lock 하나 공유 |
| ready queue | priority별 list 배열(고정) | DUMB·SCALABLE·MULTIQ 중 Kconfig로 선택 |
| stack 크기 단위 | `StackType_t` 원소 수 | byte (4-04) |
| SMP run queue | 공유 list 하나(4-07) | 공유 queue 하나(4-07) |

## SMP Support

CPU mask는 runnable이 아닌 thread에만 바꿀 수 있습니다(SMP 문서, `-EINVAL`). 그래서 `K_FOREVER` delay로 만들어 둔 thread에 `k_thread_cpu_pin()`을 걸고 `k_thread_start()`로 시작합니다(4-07). 이 글에서는 SMP board를 돌리지 않았습니다.

## 자주 보는 함정

- `prj.conf`에 쓴 값이 실제로 들어갔는지 `prj.conf` 대신 빌드 디렉터리의 `zephyr/.config`로 확인합니다. 다른 설정의 의존성 때문에 꺼질 수 있습니다.
- 생성 header가 의심되면 `zephyr/include/generated/zephyr/devicetree_generated.h`를 직접 엽니다.
- `CONFIG_MAIN_STACK_SIZE` 기본값(이 빌드는 1024)이 내 main에 충분하다고 봅니다. 4-04의 `.su` 합산으로 확인합니다.
- `K_MSEC(50)`이 정확히 50 ms라고 봅니다. tick 단위로 올림되고 한 tick이 더해집니다(60 ms 실행).
- user thread에게 객체 권한을 주면 메모리 접근 권한도 생긴다고 봅니다. 따로 줘야 합니다.

## 정리

- v3.7.0은 host gcc만으로 `native_sim/native/64`에 빌드해 돌릴 수 있었습니다.
- `struct k_thread`는 `base`가 offset 0이고, native_sim 64-bit에서 136 byte였습니다.
- 모든 `k_sem`은 `sem.c`의 lock 하나를 공유하고, 빈 semaphore의 `K_NO_WAIT`는 `-EBUSY`, timeout은 `-EAGAIN`입니다.
- `DT_INST_FOREACH_STATUS_OKAY`가 okay인 노드마다 driver instance를 컴파일 시간에 만듭니다.
- STM32 UART driver 경로는 `drivers/serial/`, F407 board 이름은 `stm32f4_disco`입니다.

## 근거 자료

- [v3.7.0 sem.c](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/sem.c), [timeout.c](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/timeout.c), [thread.h](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/include/zephyr/kernel/thread.h), [device.h](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/include/zephyr/device.h), [uart_stm32.c](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/drivers/serial/uart_stm32.c), [stm32f4_disco.dts](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/boards/st/stm32f4_disco/stm32f4_disco.dts).
- [v3.7.0 SMP](https://docs.zephyrproject.org/3.7.0/kernel/services/smp/smp.html), [kernel objects](https://docs.zephyrproject.org/3.7.0/kernel/usermode/kernelobjects.html).



다음 편은 [5-03 RT-Thread](/blog/embedded/rtos/practical-internals/part5-03-rt-thread)에서 경량 커널과 풍부한 component를 함께 가진 중국 출신 RTOS를 봅니다.

## 관련 항목

- [2-03: Scheduler Algorithm](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
