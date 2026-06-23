---
title: "Ch 12: RTOS 에뮬레이션"
date: 2026-05-17T12:00:00
description: "FreeRTOS와 Zephyr를 QEMU에서 실행한다."
tags: [QEMU, FreeRTOS, Zephyr, NuttX, RTOS, Cortex-M]
series: "QEMU Embedded Emulation"
seriesOrder: 12
draft: true
---

bare-metal과 Linux 사이에 *Real-Time Operating System*(RTOS)이 있습니다. FreeRTOS·Zephyr·NuttX·ThreadX 등 — *task scheduler + 동기화 primitive*만 제공하는 가벼운 커널. QEMU에서 RTOS를 띄우면 *MCU 펌웨어*를 보드 없이 개발할 수 있습니다.

## QEMU에서의 RTOS

| RTOS | 적합 머신 | 비고 |
|------|-----------|------|
| **FreeRTOS** | `mps2-an{385,521}`, `mps3-an547` | Cortex-M3/M33/M55 |
| **Zephyr** | `qemu_cortex_a53`, `qemu_x86`, `qemu_riscv32` | 멀티 architecture |
| **NuttX** | `mps2-an521`, vendor 다수 | POSIX 호환 |
| **ThreadX** | (제한적) | Microsoft, 산업용 |
| **RT-Thread** | RISC-V, ARM | 중국 ecosystem 강세 |

이 시리즈는 FreeRTOS·Zephyr를 중심으로.

## FreeRTOS on QEMU

FreeRTOS는 Cortex-M3/M33을 가장 잘 지원합니다. QEMU의 `mps2-an385`(M3) 또는 `mps2-an521`(M33).

### 다운로드와 빌드

```bash
git clone https://github.com/FreeRTOS/FreeRTOS.git
cd FreeRTOS/FreeRTOS/Demo/CORTEX_MPS2_QEMU_IAR_GCC/build/gcc
make
```

결과 `output/RTOSDemo.out` ELF.

### 실행

```bash
qemu-system-arm -M mps2-an385 -cpu cortex-m3 \
    -kernel output/RTOSDemo.out -nographic -semihosting
```

콘솔 출력:

```text
FreeRTOS Demo starting
Task 1 starting
Task 2 starting
[Tick 100] running...
```

semihosting(Ch 14)으로 printf가 *UART 없이도* host로 흐릅니다.

### Task 작성

```c
#include "FreeRTOS.h"
#include "task.h"

static void vTaskA(void *pvParameters) {
    while (1) {
        printf("Task A tick=%lu\n", xTaskGetTickCount());
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

static void vTaskB(void *pvParameters) {
    while (1) {
        printf("Task B tick=%lu\n", xTaskGetTickCount());
        vTaskDelay(pdMS_TO_TICKS(750));
    }
}

int main(void) {
    xTaskCreate(vTaskA, "A", 256, NULL, 1, NULL);
    xTaskCreate(vTaskB, "B", 256, NULL, 1, NULL);
    vTaskStartScheduler();
    while (1) ;
}
```

`mps2-an385` 환경에서 *실 보드와 동일한* FreeRTOS 동작을 시험할 수 있습니다.

## Zephyr on QEMU

Zephyr는 *멀티 architecture*에 강합니다. west 도구로 빌드·실행.

### Setup

```bash
sudo apt install python3-venv
python3 -m venv ~/zephyrproject/.venv
source ~/zephyrproject/.venv/bin/activate
pip install west
west init ~/zephyrproject
cd ~/zephyrproject
west update
```

### Hello World — QEMU x86

```bash
west build -p auto -b qemu_x86 zephyr/samples/hello_world
west build -t run
```

콘솔:

```text
SeaBIOS (version rel-1.16.0-...)
...
*** Booting Zephyr OS build v3.5.0 ***
Hello World! qemu_x86
```

### QEMU Cortex-A53

```bash
west build -p auto -b qemu_cortex_a53 zephyr/samples/synchronization
west build -t run
```

multi-thread sync 예제가 *Cortex-A53 머신*에서 동작.

### QEMU RISC-V

```bash
west build -p auto -b qemu_riscv64 zephyr/samples/hello_world
west build -t run
```

`-b`(board) 인자만 바꿔 *모든 architecture*에 같은 코드를 시험할 수 있습니다. Zephyr의 강점.

## NuttX on QEMU

POSIX 호환 RTOS — Linux user-space와 비슷한 API.

```bash
git clone https://github.com/apache/nuttx.git
git clone https://github.com/apache/nuttx-apps.git apps
cd nuttx

./tools/configure.sh -l mps2-an521:nsh
make -j$(nproc)

qemu-system-arm -M mps2-an521 -cpu cortex-m33 \
    -kernel nuttx -nographic -semihosting
```

콘솔에 NuttShell(NSH) prompt — `ls`/`ps`/`cat` 같은 Linux 같은 명령.

```text
NuttShell (NSH) NuttX-12.0.0
nsh> ps
  PID GROUP CPU PRI POLICY   TYPE    NPX STATE  EVENT
    0     0   0   0 FIFO     Kthread N-- Ready
    1     0   0 224 RR       Task    --- Running
nsh>
```

## RTOS 부팅 시간 비교

| RTOS | 부팅 시간 |
|------|-----------|
| FreeRTOS (Cortex-M3) | < 100ms |
| Zephyr (Cortex-A53) | ~500ms |
| NuttX (Cortex-M33) | ~300ms |
| Linux (Cortex-A72) | 1~5s |

RTOS의 가치 — *수십 ms 안에 task가 동작*.

## QEMU에서 timer accuracy

RTOS는 *deterministic timing*이 핵심인데, QEMU는 *emulation*이라 정확한 wall-clock이 보장되지 않습니다.

- *상대적 ordering* — 잘 보존
- *수십 µs 단위 latency* — 보장 안 됨
- *deadline test* — 실 보드에서 검증 필요

따라서 RTOS *기능 검증*은 QEMU에서, *timing 검증*은 실 보드 또는 cycle-accurate simulator에서.

## 디버깅

`-s -S` + GDB가 RTOS에도 그대로.

```bash
qemu-system-arm -M mps2-an385 -cpu cortex-m3 \
    -kernel RTOSDemo.out -nographic -semihosting -s -S
```

```bash
arm-none-eabi-gdb RTOSDemo.out
(gdb) target remote :1234
(gdb) break vTaskA
(gdb) continue
```

GDB의 `info threads`로 *FreeRTOS task list*를 보고 싶다면 *OpenOCD + FreeRTOS aware*가 필요한데, QEMU 자체에서는 *thread*가 RTOS의 task와 별개. 한계가 있는 부분.

## CI에 활용

GitHub Actions에서 RTOS 빌드 + QEMU 부팅 자동화.

```yaml
- name: Build FreeRTOS
  run: |
    cd FreeRTOS/Demo/CORTEX_MPS2_QEMU_IAR_GCC/build/gcc
    make
- name: Run RTOSDemo in QEMU
  run: |
    timeout 30 qemu-system-arm -M mps2-an385 -cpu cortex-m3 \
        -kernel output/RTOSDemo.out -nographic -semihosting \
        | tee out.log
    grep "Task A tick=" out.log
```

*30초* 안에 RTOS task가 동작하면 성공. *수십 PR에 자동 적용*.

## 흔한 함정

- **잘못된 머신** — FreeRTOS는 Cortex-M, Zephyr는 멀티. `west boards` 또는 demo README 확인.
- **semihosting 누락** — printf가 콘솔에 안 나옴. `-semihosting` 명시.
- **stack overflow** — RTOS는 stack 크기를 *task별로* 명시. 256 word(1KB)는 작은 task만.
- **interrupt priority** — FreeRTOS는 SVCall/PendSV priority 규약이 있음. 실 보드와 *반드시* 일치.

## 정리

- **RTOS**는 task scheduler + 동기화 primitive. bare-metal과 Linux 사이의 영역.
- **FreeRTOS**는 Cortex-M(mps2 머신)에서 가장 자연스러움. semihosting으로 printf.
- **Zephyr**는 멀티 architecture — west로 빌드, `-b` 인자만 변경.
- **NuttX**는 POSIX 호환 — Linux 같은 user-space 인터페이스.
- 부팅 시간 < 1s. RTOS의 핵심 가치.
- QEMU의 *timing accuracy* 한계 — 기능 검증은 QEMU, deadline은 실 보드.
- `-s -S` + GDB로 RTOS 디버깅. task-aware는 한도 있음.
- CI에 RTOS 빌드 + boot test가 *30초* 안에.

## 다음 장 예고

다음 장부터는 *generic virt를 넘어* — **vendor machine**(STM32·i.MX·Raspberry Pi·SiFive·Zynq)을 다룹니다.

## 관련 항목

- [Ch 11: 베어메탈 펌웨어](/blog/tools/emulation/qemu-embedded/chapter11-baremetal)
- [Ch 13: 벤더 머신](/blog/tools/emulation/qemu-embedded/chapter13-vendor-machines)
- Practical RTOS Internals
- [Mastering the FreeRTOS Real Time Kernel](/blog/embedded/rtos/freertos-mastering/chapter01-distribution)
