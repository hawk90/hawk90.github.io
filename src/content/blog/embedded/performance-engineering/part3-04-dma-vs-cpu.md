---
title: "DMA vs CPU Copy 성능 비교 — Break-even·Setup Overhead 측정법"
slug: "embedded/performance-engineering/part3-04-dma-vs-cpu"
date: 2026-04-25T09:03:00
description: "DMA setup overhead와 CPU memcpy 비용을 비교하는 방법, 대상별 break-even 측정 절차."
series: "Embedded Performance Engineering"
seriesOrder: 22
tags: [dma, memcpy, cpu, break-even]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DMA가 항상 빠른 것은 아닙니다."** 작은 transfer에서는 *CPU memcpy*가 우세합니다.

이 글에는 보드에서 잰 DMA 측정이 없습니다. CPU 쪽은 M2 Pro에서 실제로 쟀고, Cortex-M4 쪽은 컴파일러가 낸 코드에 TRM의 cycle 표를 적용해 계산했습니다. 둘 다 "DMA보다 빠르다/느리다"를 직접 말해 주지는 않으므로, 아래의 식과 측정 절차로 대상 보드에서 손익분기점을 구합니다.

## CPU memcpy — 크기별 실측 (M2 Pro)

libSystem의 `memcpy`를 크기별로 반복 호출해 한 번에 걸린 시간을 쟀습니다(`bench/copy/mcp.c`, `clang -O2`, 같은 src/dst를 재사용, 7묶음의 중앙값).

| 크기 | 호출당 시간 | 복사 속도 |
|---:|---:|---:|
| 16 B | 3.9 ns | 4.1 GB/s |
| 64 B | 3.0 ns | 21.1 GB/s |
| 256 B | 5.1 ns | 49.9 GB/s |
| 1 KiB | 12.8 ns | 80.2 GB/s |
| 4 KiB | 50.3 ns | 81.4 GB/s |
| 64 KiB | 1,034 ns | 63.4 GB/s |
| 1 MiB | 16.6 µs | 63.3 GB/s |
| 64 MiB | 1.32 ms | 50.9 GB/s |

256 B까지는 호출당 수 ns의 고정 비용이 대부분이고, 1 KiB부터는 크기에 비례합니다. 64 MiB는 캐시를 넘으므로 DRAM 속도로 떨어집니다. DMA를 쓸지 정할 때 비교해야 하는 것이 이 곡선입니다.

## Cortex-M4 — 생성된 코드와 TRM cycle

`arm-none-eabi-gcc` 16.2(`-mcpu=cortex-m4 -mthumb -O2`)는 단순한 word 복사 루프를 이렇게 컴파일했습니다(`bench/copy/cp-m4.log`).

```c
void copy_word(uint32_t *dst, const uint32_t *src, size_t words) {
    for (size_t i = 0; i < words; i++) dst[i] = src[i];
}
```

```asm
.L3:
	ldr	r3, [r1, #4]!
	str	r3, [r0, #4]!
	cmp	r1, r2
	bne	.L3
```

Cortex-M4 TRM(DDI 0439B) 표 3-1과 3.3.2로 루프 한 번을 세면 다음과 같습니다. wait state 없는 메모리를 가정한 계산이고 보드에서 재지 않았습니다.

| 명령 | cycle | 근거 |
|---|---:|---|
| `ldr` | 2 | 표 3-1 |
| `str` | 1 | 표 3-1의 2 cycle에서, 앞 LDR의 결과를 주소에 쓰지 않는 STR이라 1 cycle 절약(3.3.2) |
| `cmp` | 1 | 표 3-1 |
| `bne` (taken) | 1 + P = 2~4 | 표 3-1, P는 1~3 |
| 합계 | 6~8 | 4 byte당 |

즉 이 루프는 cycle당 0.5~0.67 byte입니다. 168 MHz라면 4 KB에 약 6,100~8,200 cycle(36~49 µs)입니다. 손으로 8 word씩 묶은 `copy_8`은 기대와 달리 LDM/STM이 아니라 `ldrd`/`strd`와 `ldr`/`str` 조합으로 컴파일됐습니다. 표 3-1에서 LDRD와 LDM은 1 + N cycle입니다. 같은 컴파일러가 `-O2`에서 `copy_word`를 `memcpy` 호출로 바꾸지 않았다는 것도 확인했습니다(`-ffreestanding` 유무와 무관).

## Break-even — 식으로 보기

DMA의 고정 비용을 T_setup(채널 설정 레지스터 쓰기)와 T_done(완료 인터럽트 진입·복귀, task 깨우기)으로, 전송 속도를 BW_dma로 두고, CPU 복사 속도를 BW_cpu로 두면 N byte 복사에 걸리는 경과 시간은 다음과 같습니다.

$$T_{\text{cpu}}(N) = \frac{N}{BW_{\text{cpu}}}, \qquad T_{\text{dma}}(N) = T_{\text{setup}} + \frac{N}{BW_{\text{dma}}} + T_{\text{done}}$$

경과 시간만 보면 BW_dma가 BW_cpu보다 크지 않은 한 DMA가 빠를 수 없습니다. 그런데 CPU가 실제로 *쓰는* 시간은 다릅니다. DMA에서는 CPU가 T_setup과 T_done 동안만 일하고 그 사이에는 다른 일을 할 수 있습니다.

$$\text{CPU 점유}_{\text{cpu}} = \frac{N}{BW_{\text{cpu}}}, \qquad \text{CPU 점유}_{\text{dma}} = T_{\text{setup}} + T_{\text{done}}$$

따라서 손익분기점은 N / BW_cpu = T_setup + T_done이 되는 N이고, 그보다 큰 복사는 DMA로 넘기면 CPU 시간을 아낍니다. 단, CPU가 그동안 할 다른 일이 없다면 아낀 CPU 시간은 쓸모가 없고 경과 시간만 남습니다. T_done의 하한으로 Cortex-M4의 인터럽트 진입(최대 12 cycle)과 복귀(12 cycle, TRM 3.9.1)를 쓸 수 있지만, 드라이버와 RTOS가 더하는 시간은 대상에서 재야 합니다.

## 측정 절차

```c
__DSB(); uint32_t t0 = DWT->CYCCNT;
memcpy(dst, src, len);
__DSB(); uint32_t t1 = DWT->CYCCNT;
cpu_cycles[len_idx] = t1 - t0;

t0 = DWT->CYCCNT;
HAL_DMA_Start_IT(&hdma, (uint32_t)src, (uint32_t)dst, len_words);
uint32_t t_after_start = DWT->CYCCNT;           /* T_setup */
while (!dma_done) { __WFI(); }                   /* 완료 인터럽트가 dma_done을 세움 */
t1 = DWT->CYCCNT;
dma_setup[len_idx] = t_after_start - t0;
dma_total[len_idx] = t1 - t0;
```

크기마다 반복해 `cpu_cycles`와 `dma_setup + 인터럽트 처리 cycle`을 비교하면 위 식의 손익분기점이 나옵니다. `HAL_DMA_Start_IT()`의 인자는 `SrcAddress`, `DstAddress`, `DataLength`이고(STM32H7 HAL `stm32h7xx_hal_dma.h` 1198행), `DataLength`의 단위는 설정한 data width입니다. 이 코드는 보드에서 실행하지 않았습니다.

## DMA가 유리한 경우

### 1. Peripheral ↔ Memory

```c
HAL_UART_Receive_DMA(&huart, rx_buf, 256);
```

UART를 CPU로 받으면 byte마다 인터럽트나 polling이 필요합니다. 115200 baud 8N1이면 byte 간격이 86.8 µs(1-03)이므로, 256 byte를 받는 22 ms 동안 CPU가 256번 깨어나야 합니다. DMA는 그 대신 buffer가 찰 때 한 번 알립니다.

### 2. 연속 / 주기 transfer

```c
HAL_DCMI_Start_DMA(&hdcmi, DCMI_MODE_CONTINUOUS, (uint32_t)frame_buf, frame_len);
```

1920 × 1080, 픽셀당 2 byte, 30 fps 카메라는 1920 × 1080 × 2 × 30 = 124.4 MB/s입니다. 위 M2 Pro 표의 1 MiB 복사 속도(63 GB/s)로 이 양을 CPU가 옮긴다면 초당 약 2 ms지만, Cortex-M4의 단순 루프(0.5~0.67 byte/cycle)라면 168 MHz에서 초당 1.1~1.5 s, 즉 CPU 하나로는 따라갈 수 없습니다. `HAL_DCMI_Start_DMA()`의 시그니처는 STM32H7 HAL `stm32h7xx_hal_dcmi.h` 542행에 있습니다.

### 3. Cache pollution 회피

CPU로 큰 buffer를 복사하면 그 데이터가 캐시를 지나가며 다른 데이터를 밀어냅니다(2-06의 capacity miss). Cortex-M7처럼 DMA가 CPU 캐시와 coherent하지 않은 시스템에서는 DMA가 메모리를 직접 읽고 쓰므로 CPU의 working set을 건드리지 않습니다. 대신 3-03의 cache maintenance가 필요합니다.

## CPU가 유리한 경우

```c
memcpy(&header, src, 16);   /* M2 Pro에서 호출당 3.9 ns */
```

- 크기가 작아 N / BW_cpu가 T_setup + T_done보다 작을 때
- CPU가 어차피 기다릴 수밖에 없을 때(부팅 중 한 번만 하는 복사 등)
- 남은 DMA channel이 없을 때

## 자주 하는 실수

> ⚠️ 작은 전송마다 DMA 설정

```c
for (i = 0; i < 1000; i++) {
    HAL_DMA_Start(...);
    wait_dma();
}
```

고정 비용 T_setup + T_done이 1000번 붙습니다. 한 번의 큰 전송이나 3-03의 linked list로 묶습니다.

> ⚠️ DMA 완료를 바쁜 대기로

```c
HAL_DMA_Start(...);
while (DMA1_Stream0->NDTR != 0) { }   /* 주변장치 레지스터를 계속 읽음 */
```

CPU가 기다리는 동안 다른 일을 못 하므로 DMA의 이점(CPU 점유 = T_setup + T_done)이 사라지고, 레지스터 읽기가 버스 transaction도 만듭니다(3-02). 완료 인터럽트와 `__WFI()`를 씁니다.

> ⚠️ register 하나를 DMA로

```c
HAL_DMA_Start(&hdma, (uint32_t)&val, (uint32_t)&reg, 1);
```

`str` 한 번이면 끝나는 일입니다. Cortex-M4 TRM 표 3-1에서 STR은 2 cycle, STM은 1 + N cycle입니다.

> ⚠️ `-O2`가 루프를 `memcpy`로 바꿔 줄 거라는 가정

위 컴파일 결과에서 `arm-none-eabi-gcc` 16.2 `-O2`는 word 복사 루프를 그대로 두었습니다. 라이브러리의 최적화된 복사를 쓰려면 `memcpy`를 직접 부릅니다. `volatile` 버퍼는 어떤 경우에도 `memcpy`로 바뀌지 않습니다.

## 정리

- M2 Pro의 libSystem `memcpy`는 256 B까지 호출당 수 ns의 고정 비용이 대부분이고, 1~4 KiB에서 약 80 GB/s, 64 MiB에서 51 GB/s였습니다.
- Cortex-M4의 단순 word 복사 루프는 TRM 기준 4 byte에 6~8 cycle(0.5~0.67 byte/cycle)입니다. `copy_8`은 LDM/STM이 아니라 LDRD/STRD로 컴파일됐습니다.
- 손익분기점은 N / BW_cpu = T_setup + T_done이고, CPU가 그동안 할 일이 있을 때만 의미가 있습니다.
- 1080p·2 B/px·30 fps 카메라는 124.4 MB/s이고, Cortex-M4 CPU 복사로는 따라갈 수 없습니다.

다음 편은 **Interrupt Latency**를 다룹니다.

## 관련 항목

- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)

## 참고 자료

- Cortex-M4 Technical Reference Manual (DDI 0439B) 표 3-1, 3.3.2, 3.9.1
- [STM32CubeH7 HAL driver](https://github.com/STMicroelectronics/stm32h7xx-hal-driver) (`stm32h7xx_hal_dma.h`, `stm32h7xx_hal_dcmi.h`, `stm32h7xx_hal_uart.h`)
