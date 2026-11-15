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

작은 MCU에서 출발한 FreeRTOS와 달리 Zephyr는 처음부터 *다양한 SoC를 같은 빌드 체계*에서 다루도록 설계되었습니다. Linux Foundation이 관리하며 Wind River, Intel, NXP, Nordic, Espressif가 모두 코드를 보탭니다. 그 결과 커널 자체보다도 *드라이버 모델*, *devicetree*, *KConfig*, *west*가 함께 따라옵니다.

이번 편은 두 가지를 노립니다. 첫째, `kernel/` 서브트리에서 스레드와 동기화 객체가 어떻게 구현되는지 골라 봅니다. 둘째, 드라이버 인스턴스가 devicetree에서 어떻게 *컴파일 시간에* 만들어지는지를 추적합니다. 이 두 축을 잡으면 Zephyr 코드를 처음 보더라도 길을 잃지 않습니다.

기준은 **Zephyr v3.7.0**, commit 36940db938a8f4a1e919496793ed439850a221c2입니다. kernel/과 include/zephyr/kernel.h를 출발점으로 개별 kernel header·arch·generated config/syscall code까지 추적합니다.

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

LoC·크기는 포함 경로·comment·config와 측정법에 따라 달라 고정 배수로 비교하지 않습니다. 처음 들어갈 때는 `kernel/` 안에서 `sched.c`와 `sem.c`만 골라 보는 편이 좋습니다.

## k_thread — TCB의 Zephyr 버전

v3.7.0의 include/zephyr/kernel/thread.h에서 struct k_thread를 확인합니다. base, callee_saved, init_data, join_queue가 있고 뒤의 stack 정보·userspace·resource pool·name 등은 config와 개별 구조체를 따릅니다. join_queue가 CONFIG_USERSPACE에서만 존재한다거나 stack_size가 항상 직접 멤버라고 적은 재구성 struct는 실제 layout이 아닙니다.

_thread_base의 state/priority/queue node와 arch별 callee_saved를 따로 읽습니다. callee_saved는 architecture가 보존하는 register context이며 callback 저장 공간이 아닙니다. state bit를 조합한다는 사실만으로 모든 bit 조합이 유효하지는 않으며 전이 조건은 sched.c/thread.c를 확인합니다.

## sched.c — Config별 Ready Queue

CONFIG_SCHED_DUMB, CONFIG_SCHED_SCALABLE, CONFIG_SCHED_MULTIQ는 서로 다른 자료구조 경로를 선택합니다. priority 수뿐 아니라 runnable thread 수·CPU mask·memory와 삽입/선택 비용을 함께 봅니다.

SMP라고 per-CPU runqueue와 push/pull balancing으로 자동 바뀌지는 않습니다. v3.7.0 SMP 문서는 per-CPU runqueue를 유지하지 않는다고 명시하며 CPU-mask 처리의 backend 제약도 설명합니다. [SMP 비교](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)와 kernel/sched.c·include/zephyr/kernel/priority_q.h의 실제 조건을 대조합니다.

비트 찾기 한 번의 비용을 전체 scheduler의 일정 cycle·상수 응답 시간으로 환산하지 않습니다.

## k_sem — spinlock 기반 동기화 객체

v3.7.0의 struct k_sem에는 wait_q, count, limit와 선택적 poll/tracing/object-core 상태가 있으며 **sem->lock 멤버는 없습니다.** kernel/sem.c의 파일 범위 static struct k_spinlock lock을 사용합니다.

| 경로 | 실제 source 동작 |
|---|---|
| z_impl_k_sem_take, count > 0 | 공통 lock 아래 감소 후 unlock |
| count 0 + K_NO_WAIT | unlock 후 -EBUSY |
| count 0 + 대기 | z_pend_curr(&lock, key, &sem->wait_q, timeout) |
| give | waiter를 깨우거나 limit까지 count 증가 |
| user call | z_vrfy 경로의 object 검증 뒤 implementation 호출 |

ISR take는 K_NO_WAIT 제약이 있으며 timeout/cancel/reset의 반환도 실제 계약을 따릅니다. 이 source tour는 공통 lock의 메모리/경쟁 trade-off를 보여 주며 Zephyr scheduler를 host에서 실행한 결과는 아닙니다.

## Driver Model — vtable + devicetree

Zephyr 드라이버는 *vtable + per-instance data + per-instance config*의 삼각형으로 구성됩니다. 아래는 세 요소를 보여 주는 구성 예이며 실제 STM32 driver 전체나 build 가능한 application은 아닙니다. 함수 본체·instance data·clock/IRQ 설정은 해당 driver source에서 확인합니다.

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

`DEVICE_DT_INST_DEFINE(inst, ...)`는 지정한 **한 instance**를 정의합니다. 모든 status-okay instance에 반복 적용하려면 보통 DT_INST_FOREACH_STATUS_OKAY와 driver의 instance 생성 macro를 함께 사용합니다. 런타임 dynamic registration이 필요 없으므로 ROM에 그대로 자리잡습니다.

devicetree 입력은 Linux DTS와 같은 문법입니다.

```dts
/* board overlay 개념 예. 실제 v3.7.0 board 경로·pinctrl 이름 확인 필요. */
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

빌드 시 `dts/`의 바인딩과 매칭되어 *generated header*로 변환되고, 드라이버 매크로가 그 header를 consume합니다. 같은 driver를 재사용할 수 있지만 binding·clock·pinctrl·IRQ·지원 feature가 실제 새 board와 맞아야 합니다.

## KConfig — feature를 컴파일에서 잘라내기

```text
# prj.conf
CONFIG_SERIAL=y
CONFIG_UART_INTERRUPT_DRIVEN=y
CONFIG_MAIN_STACK_SIZE=2048
CONFIG_LOG=y
```

Linux의 KConfig 문법 그대로입니다. Kconfig는 CMake source 선택·preprocessor·generated config에 영향을 줍니다. 모든 비활성 기능이 오직 링크 단계에서 사라진다는 뜻은 아닙니다. `menuconfig`로 인터랙티브 탐색이 가능합니다.

```bash
west build -b nucleo_f407g samples/hello_world -t menuconfig
```

## west — 멀티 저장소 메타툴

west는 manifest의 repository revision을 동기화하는 workspace 도구입니다. v3.7.0 문서/board 이름에 맞춘 workspace 예는 다음과 같습니다.

```bash
west init -m https://github.com/zephyrproject-rtos/zephyr --mr v3.7.0 zephyr-workspace
cd zephyr-workspace
west update
cd zephyr
west build -b nucleo_f407g samples/hello_world
```

별도 host dependencies·Python 환경·Zephyr SDK와 module 다운로드가 필요합니다. 위 명령은 이 검증에서 board firmware로 build/flash하지 않았습니다. manifest root와 source tree의 현재 작업 경로를 구분합니다. flash/sign은 해당 runner·board 설정을 확인한 뒤 사용합니다.

## POSIX 서브시스템

POSIX 지원은 선택한 Kconfig feature·libc·지원 API와 resource limit에 따릅니다. pthread/socket/signal 일부가 지원된다는 사실을 Linux binary/syscall ABI 또는 모든 Linux source의 재컴파일 호환으로 확대하지 않습니다. 사용 API 목록을 고정해 성공·실패/timeout·signal semantics를 확인합니다.

## Network·BLE — 통합 서브시스템

Zephyr가 FreeRTOS와 갈리는 지점은 *내장 서브시스템의 폭*입니다.

```text
subsys/net/         IPv4·IPv6·TCP·UDP·CoAP·MQTT·LwM2M·HTTP
subsys/bluetooth/   BLE host + controller (Nordic·Espressif)
subsys/usb/         USB device + host
subsys/fs/          LittleFS·FATFS·NVS
subsys/logging/     LOG_INF·LOG_ERR + 백엔드 (UART·RTT·net)
```

각 서브시스템이 KConfig로 켜고 끌 수 있도록 모듈화되어 있습니다. 시장 점유·최다 채택·vendor 지원 범위는 이 source 분석에서 조사하지 않았습니다. 실제 대상 board와 controller/host driver·module revision을 고정해 통합을 확인합니다.

## User Mode — MPU/MMU 분리

CONFIG_USERSPACE는 기능을 활성화합니다. 실제 user thread 생성에는 K_USER 등 해당 API 옵션이 필요하며 모든 thread가 자동 unprivileged가 되지는 않습니다.

```c
K_THREAD_DEFINE(user_thr, 2048, user_entry, NULL, NULL, NULL,
                5, K_USER, 0);
```

User 스레드는 커널 데이터에 직접 접근할 수 없고, `k_sem_take` 같은 API도 *syscall로 wrap*되어 호출됩니다. MPU나 MMU가 강제하는 격리 위에서 *Linux 같은 권한 분리*가 가능해집니다. safety-critical 시스템에서 application 코드와 커널의 경계를 강하게 두고 싶을 때 유용합니다.

## FreeRTOS와 Zephyr — 한 줄 비교

비교할 때는 kernel뿐 아니라 driver·network·libc·port·build 도구를 같은 기능 범위로 맞춥니다. FreeRTOS에도 MPU/SMP port와 별도 POSIX/network component가 있으므로 단순 없음/partial/full 표로 제품 전체 기능과 인증 수준을 등급화하지 않습니다. source 수만으로 RAM/Flash나 검증 비용을 예측하지 않습니다.

## SMP Support

CPU mask 변경은 thread가 runnable 상태가 아닐 때 해야 합니다. v3.7.0의 k_thread_cpu_mask_clear/k_thread_cpu_pin 등 실제 API를 사용하고 config·반환값을 확인합니다. 생성 시 K_FOREVER로 시작을 보류한 뒤 권한·affinity를 준비하고 k_thread_start로 시작하는 흐름이 한 방법입니다.

FreeRTOS보다 먼저 안정화되었다는 일반 비교 대신 선택한 revision과 workload의 실행 증거를 수집합니다.

## 자주 보는 함정

- generated header가 의심되면 실제 build dependency와 DTS/config 산출물을 확인하고 pristine rebuild로 비교합니다. DTS를 바꾸면 항상 stale이라는 뜻은 아닙니다.
- Kconfig 경고·최종 .config와 driver readiness를 확인합니다. BLE host/controller 조합은 선택한 architecture에 따릅니다.
- 1024/2048 byte가 보편적인 안전 stack 크기는 아닙니다. 실제 call path·exception·library와 관찰 workload를 분석합니다.
- user object grant와 buffer memory domain, direct MMIO 권한을 구분합니다.

## 정리

- v3.7.0의 실제 field·semaphore 공통 lock·ready queue config를 따라갑니다.
- device instance 하나의 정의와 instance 전체 반복 macro를 구분합니다.
- west workspace 경로·module/config/generated code를 함께 고정합니다.
- source tour는 board 실행·IRQ/SMP·USERSPACE fault 검증을 대신하지 않습니다.

## 근거 자료

- [v3.7.0 sem.c](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/sem.c), [thread.h](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/include/zephyr/kernel/thread.h), [device.h](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/include/zephyr/device.h).
- [v3.7.0 SMP](https://docs.zephyrproject.org/3.7.0/kernel/services/smp/smp.html), [kernel objects](https://docs.zephyrproject.org/3.7.0/kernel/usermode/kernelobjects.html).



다음 편은 [5-03 RT-Thread](/blog/embedded/rtos/practical-internals/part5-03-rt-thread)에서 경량 커널과 풍부한 component를 함께 가진 중국 출신 RTOS를 봅니다.

## 관련 항목

- [2-03: Scheduler Algorithm](/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-05: RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)
