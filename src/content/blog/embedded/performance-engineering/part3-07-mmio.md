---
title: "MMIO 접근 성능 — Cache Policy·Write-Combining·Volatile·Barrier"
slug: "embedded/performance-engineering/part3-07-mmio"
date: 2026-04-25T09:06:00
description: "MMIO의 메모리 속성과 Linux ioremap 계열을 커널 소스·문서로 확인하고, volatile·RMW를 실제 컴파일 결과로 보며, DMB·DSB·ISB와 bit-banding을 Arm 문서로 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 25
tags: [mmio, register, cache-policy, volatile, barrier]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"MMIO는 peripheral register를 메모리처럼 다루는 방식입니다."** 다만 cache와 reorder는 *금지*입니다.

## MMIO 메모리 속성

ARMv7-M Architecture Reference Manual(DDI 0403E) A3.5.1은 메모리 영역마다 서로 배타적인 세 가지 type을 둡니다. Normal, Device, Strongly-ordered입니다. 같은 절은 프로그램 코드와 데이터 저장용 메모리(flash, ROM, SRAM, DRAM)는 대개 Normal이고, 주변장치 I/O는 Normal과 다른 접근 규칙을 따른다고 적습니다. 연속 접근이 FIFO를 하나씩 꺼내는 레지스터처럼, 읽기 한 번에도 부작용이 있는 장치가 그 예입니다.

Armv8-A의 Linux(arm64)는 이 속성을 다음과 같이 씁니다. `arch/arm64/include/asm/memory.h` 172~176행의 memory type 번호와 `arch/arm64/include/asm/io.h` 295~300행의 매핑입니다.

| Linux 함수 | 쓰는 속성 |
|---|---|
| `ioremap()` | `PROT_DEVICE_nGnRE` (Device, no Gathering, no Reordering, Early write acknowledgement 허용) |
| `ioremap_np()` | `PROT_DEVICE_nGnRnE` (Early write acknowledgement도 금지, 즉 non-posted) |
| `ioremap_wc()` | `PROT_NORMAL_NC` (Normal, non-cacheable) |

## Linux ioremap

```c
void __iomem *mmio = ioremap(phys, 0x1000);
iowrite32(0x12345678, mmio + 0x10);
val = ioread32(mmio + 0x20);
iounmap(mmio);
```

`Documentation/driver-api/device-io.rst`(Linux 6.12)는 `ioremap()` 매핑의 성질을 이렇게 정리합니다. CPU 캐시를 거치지 않고, 커밋된 프로그램 흐름에 도달한 명령만 접근을 내며(추측 접근 없음), 서로 순서를 바꾸지 않고, 명령 하나에 접근을 여러 번 내지 않으며, 여러 write를 합치지 않습니다. 또 PCI 같은 많은 버스에서 `ioremap()` 매핑의 write는 posted라서 CPU가 write가 장치에 도착하기를 기다리지 않고 다음 명령으로 넘어간다고 적습니다.

## Write-Combining

같은 문서에 따르면 `ioremap_wc()`는 I/O 메모리를 write combining이 되는 Normal 메모리로 매핑하며, `ioremap()`과 달리 CPU가 실행하지 않은 읽기를 추측으로 낼 수 있고, 결과가 프로그램 입장에서 일관되는 한 순서를 바꾸며, 한 번의 write를 같은 위치에 여러 번 낼 수도 있고, 여러 write를 더 큰 write로 합칠 수 있습니다. 주로 video framebuffer에 쓰고, 일반 `ioremap()` 레지스터 접근과의 순서는 명시적 barrier 없이는 보장되지 않습니다. PCI에서는 `IORESOURCE_PREFETCH` 표시가 있는 BAR에만 쓰는 것이 대체로 안전하다고 적습니다.

```c
mmio = ioremap_wc(phys, size);
```

## Volatile — 컴파일러 차단

MMIO를 일반 포인터로 읽고 쓰면 컴파일러가 접근을 줄입니다. `arm-none-eabi-gcc` 16.2(`-mcpu=cortex-m4 -mthumb -O2`)로 같은 레지스터를 두 번 읽고, 두 번 쓰는 함수를 컴파일했습니다(`bench/mmio/vol2-m4.log`).

| 코드 | `volatile` 없음 | `volatile` 있음 |
|---|---|---|
| `a = *reg; b = *reg; return a + b;` | `ldr` 한 번, `lsls r0, r0, #1`(2배) | `ldr` 두 번, `add` |
| `*reg = 1; *reg = 2;` | `str` 한 번(값 2만) | `str` 두 번(1, 2 순서) |

`volatile`이 없으면 두 번째 읽기는 첫 값의 재사용으로, 첫 번째 쓰기는 죽은 store로 처리되어 사라졌습니다. 상태 레지스터를 polling하거나, 같은 레지스터에 순서대로 두 값을 써야 하는 장치에서는 동작이 달라집니다.

`volatile`은 컴파일러가 내는 접근만 지킵니다. 하드웨어가 그 접근들을 어떤 순서로 완료하는지는 메모리 속성과 barrier가 정합니다.

## ARM Memory Barrier

ARMv7-M ARM A3.7.3의 정의입니다.

| 명령 | A3.7.3의 설명 |
|---|---|
| `DMB` | data memory barrier. 앞뒤 메모리 접근의 순서를 보장 |
| `DSB` | DMB와 같이 동작하면서, 실행 흐름을 메모리 접근과 동기화(앞선 접근이 끝날 때까지 뒤 명령을 진행하지 않음) |
| `ISB` | pipeline을 비워, ISB 뒤 명령을 ISB가 끝난 뒤에 다시 fetch. system control 갱신 같은 context 변경이 뒤 명령에 보이게 함 |

같은 절은 ARMv7-M이 shareability domain이나 access type 제한 없는 system-wide barrier만 지원한다고 덧붙입니다.

```c
/* 주변장치 clock을 켠 직후 그 주변장치에 접근 */
RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
__DSB();          /* clock enable write가 끝난 뒤에 진행 */
TIM2->CR1 = 1;

/* 코드를 새로 쓰고 실행 */
flash_write(code_buf);
__DSB(); __ISB(); /* write 완료 후, 이후 명령을 새로 fetch */
call_new_code();

/* DMA 시작 전 cache clean */
SCB_CleanDCache_by_Addr(buf, len);
__DSB();
HAL_DMA_Start(...);
```

clock enable 직후의 접근이 실제로 문제가 되는지와 필요한 지연은 MCU reference manual의 RCC 절이 정합니다. 위 `DSB`는 "앞선 write가 끝났다"는 것만 보장합니다.

## Read-Modify-Write Race

```c
GPIOA->ODR |= (1u << 5);
```

같은 컴파일러가 낸 코드는 세 명령입니다.

```asm
ldr	r3, [r2]
orr	r3, r3, #32
str	r3, [r2]
```

`ldr`과 `str` 사이에 인터럽트가 들어와 ISR이 같은 레지스터의 다른 bit를 바꾸면, 돌아온 뒤의 `str`이 ISR의 변경을 옛 값으로 덮어씁니다.

해결 방법은 다음과 같습니다.

- 장치가 set/reset 전용 레지스터를 제공하면 그것을 씁니다. STM32 GPIO의 BSRR은 쓰기만으로 bit 하나를 set하거나 reset합니다. STM32H7 HAL의 `HAL_GPIO_WritePin()`은 set일 때 `BSRR = GPIO_Pin`, reset일 때 `BSRR = GPIO_Pin << 16`으로 쓰고, 주석에 이것이 atomic read/modify 접근을 가능하게 한다고 적습니다(`stm32h7xx_hal_gpio.c` 411~436행).
- Cortex-M3/M4라면 bit-banding을 씁니다(아래).
- 둘 다 없으면 RMW 구간을 인터럽트 금지나 BASEPRI로 감쌉니다(3-05).

```c
GPIOA->BSRR = (1u << 5);          /* set */
GPIOA->BSRR = (1u << 5) << 16;    /* reset */
```

## Bit-Banding (Cortex-M3·M4)

Cortex-M4 TRM(DDI 0439B) 3.7에 따르면 bit-banding은 M4의 *선택 사항*이고, SRAM 영역과 Peripheral 영역 각각의 가장 낮은 1 MB가 bit-band 영역이며, 각각 32 MB alias 영역에 대응합니다. alias word에 쓰면 System 버스 인터페이스가 그 쓰기를 원자적 read-modify-write로 바꿉니다. 대응식은 다음과 같습니다.

```text
bit_word_offset = (byte_offset × 32) + (bit_number × 4)
bit_word_addr   = bit_band_base + bit_word_offset
```

```c
#define BITBAND_SRAM(addr, bit) \
    ((volatile uint32_t *)(0x22000000u + ((((uint32_t)(addr)) - 0x20000000u) << 5) + ((bit) << 2)))

*BITBAND_SRAM(&flag_byte, 3) = 1;   /* flag_byte의 bit 3을 원자적으로 set */
```

`flag_byte`가 SRAM bit-band 영역(0x2000_0000부터 1 MB) 밖에 있으면 이 주소는 의미가 없습니다. Cortex-M7 TRM(DDI 0489D) 2.3.1은 M3·M4용 코드가 bit-banding에 의존하지 않는 한 M7과 호환된다고 적습니다. bit-banding에 의존하는 코드는 M7로 그대로 옮길 수 없습니다.

## PCIe MMIO — posted write

`device-io.rst`는 PCI 버스의 write가 비동기로 posted된다는 점을 짚고, write가 장치에 실제로 도달했는지 확인해야 하는 경우에는 같은 장치에서 읽기를 한 번 하라고 적습니다. 카드가 리셋 중이라 그 읽기가 실패할 수 있으면 config space에서 읽으라고도 적습니다.

```c
iowrite32(val, mmio);          /* posted */
(void)ioread32(mmio + STATUS); /* 같은 장치 읽기로 앞 write를 밀어냄 */
```

arm64에서는 `ioremap_np()`가 non-posted(nGnRnE) 매핑을 요청합니다. 같은 문서는 `ioremap_np()`가 일부 아키텍처에서만 있다고 적고, "ioremap_np() should never be used for PCI drivers"라며 PCI memory write는 항상 posted라고 덧붙입니다. PCI에서는 위의 읽기로 완료를 확인합니다.

## DMA와 MMIO Ordering

```c
fill_buf(tx_buf, len);   /* Normal 메모리에 쓰기 */
__DSB();                 /* 그 쓰기가 끝난 뒤에 */
DMA->SRC = (uint32_t)tx_buf;
DMA->LEN = len;
DMA->CR  = DMA_EN;       /* DMA 시작 레지스터 쓰기 */
```

buffer 쓰기는 Normal 메모리, DMA 시작은 Device 메모리 접근이라 서로 다른 속성입니다. 시작 레지스터를 쓰기 전에 buffer 쓰기가 끝나 있어야 DMA가 완성된 데이터를 읽습니다. Cortex-M7에서 buffer가 cacheable이라면 그 전에 3-03의 clean도 필요합니다. `DMA->SRC` 같은 이름은 예시입니다.

## 접근 폭

`device-io.rst`는 많은 플랫폼에서 I/O 접근이 접근 크기에 맞춰 정렬되어야 하며, 그렇지 않으면 예외나 예측할 수 없는 결과가 난다고 적습니다. 레지스터가 32-bit로 정의되어 있으면 Linux에서는 `iowrite32()`/`ioread32()`, MCU에서는 `volatile uint32_t`로 그 폭 그대로 접근합니다. 8-bit나 16-bit 접근을 허용하는지는 장치의 reference manual이 정합니다.

## CMSIS register 비트 매크로

```c
GPIOA->MODER &= ~GPIO_MODER_MODER5_Msk;         /* clear */
GPIOA->MODER |=  (0b10u << GPIO_MODER_MODER5_Pos); /* AF mode */
```

`_Msk`는 bit mask, `_Pos`는 bit 위치입니다. CMSIS 코어 헤더(`core_cm4.h`의 `DWT_CTRL_CYCCNTENA_Msk` 등)와 제조사 장치 헤더가 같은 규칙으로 이름을 붙입니다.

## 자주 하는 실수

> ⚠️ Volatile 없이 register access

```c
*(uint32_t *)0x40000004u = 1;
*(uint32_t *)0x40000004u = 2;
```

위 컴파일 결과처럼 첫 store가 사라집니다.

> ⚠️ D-cache를 켠 뒤 MMIO 영역의 속성

Cortex-M7에서 D-cache를 켜면 Normal·cacheable로 매핑된 영역은 캐시를 거칩니다. ARMv7-M의 기본 memory map은 0x4000_0000부터의 Peripheral 영역을 Device로 정하지만(B3.1 표), MPU region이 그 위를 덮으면 MPU 속성이 쓰이므로, MPU로 영역을 다시 정의할 때 주변장치 영역을 Normal로 덮지 않게 합니다(3-03의 MPU 규칙).

> ⚠️ Barrier 누락

clock을 켜자마자 주변장치에 접근하거나, buffer를 다 쓰기 전에 DMA를 시작하면 앞선 write가 끝나기 전에 다음 접근이 갑니다. 위 예처럼 `DSB`를 둡니다.

> ⚠️ Bit-band 영역 밖에서 사용

SRAM bit-band는 0x2000_0000부터, Peripheral bit-band는 0x4000_0000부터 각 1 MB입니다(M4 TRM 3.7). heap이나 다른 RAM 영역의 변수에는 쓸 수 없습니다.

## 정리

- ARMv7-M의 메모리 type은 Normal, Device, Strongly-ordered이고, 주변장치는 Normal과 다른 규칙을 따릅니다(A3.5.1).
- arm64 Linux에서 `ioremap()`은 Device nGnRE, `ioremap_np()`는 nGnRnE, `ioremap_wc()`는 Normal non-cacheable입니다.
- `volatile`이 없으면 `-O2`에서 두 번 읽기가 한 번으로, 두 번 쓰기가 한 번으로 줄었습니다.
- `|=`는 `ldr`/`orr`/`str` 세 명령이라 ISR과 경합합니다. BSRR, bit-banding, 인터럽트 금지로 막습니다.
- PCI의 posted write는 같은 장치에서 읽어 완료를 확인합니다(device-io.rst).
- 이 게스트에서는 PCI BAR의 sysfs `resource4` mmap이 `EINVAL`로 거부되어 MMIO latency를 재지 못했습니다.

다음 편은 **Peripheral Clock**을 다룹니다.

## 관련 항목

- [3-06: Interrupt Storm](/blog/embedded/performance-engineering/part3-06-interrupt-storm)
- [3-08: Peripheral Clock](/blog/embedded/performance-engineering/part3-08-peripheral-clock)

## 참고 자료

- ARMv7-M Architecture Reference Manual (DDI 0403E) A3.5.1, A3.7.3
- Cortex-M4 Technical Reference Manual (DDI 0439B) 3.7
- Linux v6.12 `Documentation/driver-api/device-io.rst`, `arch/arm64/include/asm/io.h`, `arch/arm64/include/asm/memory.h`
