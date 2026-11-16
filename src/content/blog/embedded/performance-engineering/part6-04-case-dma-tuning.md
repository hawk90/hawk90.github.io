---
title: "사례 분석 — 카메라 payload와 DMA 전송 경로"
slug: "embedded/performance-engineering/part6-04-case-dma-tuning"
date: 2026-04-28T09:03:00
description: "1080p60 카메라 캡처의 frame drop을 payload 계산, AXI burst 규칙, DMAengine 큐 동작으로 따져 보고, buffer 개수별 drop률을 시뮬레이션으로 재 봅니다."
series: "Embedded Performance Engineering"
seriesOrder: 53
tags: [case-study, dma, burst, axi, throughput]
topics: ["embedded"]
---

## 한 줄 요약

> **"CPU가 한가한데 frame이 빠진다면, 전송 하나의 크기와 *다음 전송이 미리 준비돼 있는지*를 봅니다. buffer를 늘려도 소비자가 frame 주기보다 느리면 drop은 남습니다."**

## 증상 — 문제 설정

카메라 영상을 캡처해 저장하는 프로토타입에서 30 fps는 안정적인데 60 fps로 올리면 frame이 빠진다고 해 봅니다. CPU 사용률은 낮아 보입니다. 먼저 60 fps가 요구하는 대역폭을 계산합니다.

| 항목 | 값 |
|------|-----|
| 포맷 | 1920×1080 YUV422 (픽셀당 2 B) |
| frame 하나 | 1920 × 1080 × 2 = 4,147,200 B |
| 60 fps | 4,147,200 × 60 = 248,832,000 B/s = 248.832 MB/s (십진) ≈ 237.3 MiB/s |
| frame 주기 | 1/60 s ≈ 16.667 ms |

이 값은 픽셀 payload만 센 것입니다. blanking·metadata·line padding은 센서 포맷과 플랫폼 설정에 따라 더해집니다.

이 글에서는 실제 카메라 SoC를 쓰지 않았습니다. 측정에 쓴 arm64 VM(QEMU `-M virt`)에는 DMA 엔진이 없습니다. `/sys/class/dma/`가 비어 있고, 커널은 `CONFIG_DMA_ENGINE=y`이지만 `CONFIG_DMATEST`는 꺼져 있어 `dmatest` 모듈도 없습니다. 그래서 이 글은 다음 두 가지로 나눠 진행합니다.

- **burst·descriptor 동작**은 1차 문서(AMBA AXI 사양, Linux DMAengine 문서)로 확인합니다. 실측 수치는 쓰지 않습니다.
- **buffer 소유권과 drop**은 실제 스레드 두 개로 만든 시뮬레이션 `dblbuf.c`로 잽니다. 하드웨어 DMA 대신 `memcpy`가 frame을 채웁니다.

## 가설 1 — CPU 처리 부하

"CPU가 한가하다"는 관찰부터 따져 봅니다. 시뮬레이션의 구조는 이렇습니다. 생산자 스레드("DMA")가 16.667 ms마다 비어 있는 buffer에 frame을 채우고, 빈 buffer가 없으면 그 frame을 버립니다. 소비자 스레드는 채워진 buffer를 순서대로 꺼내 `proc_us`만큼 처리한 뒤 돌려줍니다.

```c
for (int f = 0; f < frames; f++) {
    double tick = t0 + (double)f * period_us;
    while (now_us() < tick) ;                       /* wait for the frame tick */
    pthread_mutex_lock(&m);
    for (i = 0; i < nbuf; i++) if (state[i] == 0) { found = i; state[i] = 2; break; }
    pthread_mutex_unlock(&m);
    if (found < 0) { dropped++; continue; }         /* no free buffer at the tick */
    memcpy(buf[found], src, FRAME);                 /* "DMA" fills the frame */
    /* ... mark filled, push to the consumer FIFO ... */
}
```

buffer가 하나뿐이고 처리 시간이 16 ms라면, 소비자는 frame 주기의 96%만 씁니다. 평균으로는 4%가 남습니다. 하지만 같은 buffer를 "채우기 → 처리"가 차례로 써야 하므로, 채우는 시간(Mac에서 중앙값 약 0.1 ms)과 스케줄링 흔들림이 그 4% 안에 들어가야 합니다. 실제로 buffer 1개, 처리 16 ms 조건의 5회 중앙값 drop률은 Mac 4.3%, VM 0.7%였습니다. 한 번은 35.7%까지 나왔습니다.

**가설 1 기각**: CPU 시간의 평균은 모자라지 않았습니다. 빠진 것은 *겹쳐서 일할 자리*입니다.

## 가설 2 — DMA 성능 부족

다음 후보는 전송 경로입니다. 실제 SoC라면 MIPI CSI-2 receiver → DMA → DDR 경로의 처리량을 SoC의 performance monitor로 재야 합니다. 그런 장치가 없으므로 여기서는 전송 크기에 관한 규칙을 문서로 확인합니다.

AXI에서 한 번의 주소로 여러 데이터를 연달아 보내는 단위가 burst입니다. 택배 트럭으로 치면, 출발할 때마다 주소 확인 절차(주소 phase)를 한 번씩 거치므로 한 번에 많이 실을수록 절차 비용이 덜 듭니다. [AMBA AXI and ACE Protocol Specification(ARM IHI 0022E)](https://documentation-service.arm.com/static/5f915b62f86e16515cdc3b1c) §A3.4.1은 burst 길이를 이렇게 정합니다.

- AXI3는 모든 burst 유형에서 1~16 transfer입니다(`Burst_Length = AxLEN[3:0] + 1`).
- AXI4는 INCR burst만 1~256 transfer로 늘렸습니다(`AxLEN[7:0] + 1`). 다른 burst 유형은 1~16 그대로입니다.
- burst는 4KB 주소 경계를 넘을 수 없고, 도중에 끝낼 수도 없습니다.

예를 들어 데이터 폭이 8 B인 AXI4 INCR burst는 최대 256 × 8 = 2,048 B입니다. 실제 DMA 컨트롤러가 어떤 burst 길이를 쓰는지는 컨트롤러와 드라이버가 정합니다.

Linux 쪽 설정은 단위가 다릅니다. [include/linux/dmaengine.h](https://elixir.bootlin.com/linux/v6.12/source/include/linux/dmaengine.h#L415)는 `src_maxburst`를 "the maximum number of words (note: words, as in units of the src_addr_width member, not bytes) that can be sent in one burst to the device"로 정의하고, I/O 장치에서는 보통 FIFO 깊이의 절반 정도를 쓴다고 적습니다. 즉 `src_maxburst`는 *장치 FIFO 쪽* word 수이고, AXI 버스의 beat 수와 같은 값이라는 보장이 없습니다. 채널이 지원하는 최대값은 `dma_get_slave_caps()`가 채워 주는 `struct dma_slave_caps`의 `max_burst`로 확인합니다([같은 파일](https://elixir.bootlin.com/linux/v6.12/source/include/linux/dmaengine.h#L489)).

### 전송 크기 비유 실험 (CPU `memcpy`, DMA 아님)

고정 비용이 전송마다 붙을 때 전송 크기가 처리량을 어떻게 바꾸는지는 CPU에서도 볼 수 있습니다. 아래는 DMA 측정이 **아닙니다**. 한 frame(4,147,200 B)을 S바이트씩 나눠, 인라인되지 않는 함수 안에서 `memcpy`를 S바이트씩 호출합니다(`chunkcopy.c`, 200 frame, 5회 중앙값).

| 호출당 크기 S | Mac (M2 Pro) | VM (같은 Mac, GCC 14.2.0) |
|---|---|---|
| 64 B | 19,292 MB/s, 215.0 µs/frame | 25,492 MB/s, 162.7 µs/frame |
| 128 B | 35,226 MB/s, 117.7 µs/frame | 29,864 MB/s, 138.9 µs/frame |
| 512 B | 34,913 MB/s, 118.8 µs/frame | 38,600 MB/s, 107.4 µs/frame |
| 2,048 B | 35,888 MB/s, 115.6 µs/frame | 42,686 MB/s, 97.2 µs/frame |
| frame 전체 | 35,944 MB/s, 115.4 µs/frame | 46,195 MB/s, 89.8 µs/frame |

Mac에서는 64 B 호출 64,800번이 frame 전체 한 번보다 약 100 µs 더 걸렸습니다. 호출 하나에 약 1.5 ns가 더 붙은 셈이고, 128 B부터는 그 비용이 거의 보이지 않습니다. 이 숫자는 CPU 함수 호출의 비용이지 AXI 주소 phase나 DMA descriptor의 비용이 아닙니다. 원본과 대상 buffer 합계 약 8.3 MB가 M2 Pro의 16 MiB L2(`sysctl hw.perflevel0.l2cachesize`)에 들어가므로 절대 처리량도 DRAM 대역폭과 무관합니다. 이 실험이 보여 주는 것은 "전송마다 붙는 고정 비용은 전송을 키우면 희석된다"는 모양뿐입니다. 실제 SoC에서 같은 표를 만들려면 그 SoC의 DMA 채널로 burst 설정만 바꿔 가며 재야 합니다.

**가설 2 판정 보류**: 대상 SoC의 bus monitor나 DMA trace 없이는 burst 설정이 원인인지 정할 수 없습니다.

## 원인 — 다음 Descriptor가 준비돼 있지 않음

buffer가 하나뿐인 구조를 DMA 쪽에서 보면 아래 그림과 같습니다. frame 전송이 끝나면 IRQ가 오고, CPU가 다음 전송을 준비해 다시 시작할 때까지 DMA는 쉽니다.

![DMA Single Descriptor — Idle Overhead 문제](/images/blog/perf-eng/diagrams/part6-04-dma-timeline.svg)

Linux DMAengine은 이 빈틈을 큐로 메웁니다. [DMAengine client 문서](https://elixir.bootlin.com/linux/v6.12/source/Documentation/driver-api/dmaengine/client.rst)의 5단계는 "If channel is idle then the first transaction in queue is started and subsequent ones queued up. On completion of each DMA operation, the next in queue is started and a tasklet triggered."라고 적습니다. 다음 descriptor를 미리 큐에 넣어 두면, 완료 IRQ를 처리하는 동안에도 다음 전송이 이미 시작됩니다. 같은 문서는 `dmaengine_submit()`이 전송을 시작하지 않고 큐에 넣기만 하며, 시작은 `dma_async_issue_pending()`이 한다는 점도 짚습니다.

카메라 드라이버의 user 공간 API도 같은 구조입니다. V4L2 [streaming I/O 문서](https://elixir.bootlin.com/linux/v6.12/source/Documentation/userspace-api/media/v4l/mmap.rst)는 드라이버가 incoming·outgoing 두 buffer 큐를 두어 "the synchronous capture or output operation locked to a video clock"을 디스크·네트워크 지연이나 선점을 겪는 애플리케이션과 떼어 놓는다고 설명합니다. 캡처 애플리케이션은 보통 매핑한 buffer를 모두 큐에 넣은 뒤 캡처를 시작합니다.

## 해결 — Burst 설정, Scatter-Gather, Double Buffer

**Step 1: burst 설정은 채널 capability로 정합니다.** DMAengine client는 `dmaengine_slave_config()`로 burst를 설정합니다. 아래는 흐름만 보이는 부분 코드입니다.

```c
struct dma_slave_config cfg = {
    .src_addr = peripheral_fifo_addr,
    .src_addr_width = DMA_SLAVE_BUSWIDTH_4_BYTES,
    .src_maxburst = controller_supported_burst,   /* words of src_addr_width, see dma_slave_caps.max_burst */
};
ret = dmaengine_slave_config(chan, &cfg);
```

`src_maxburst`의 단위는 앞에서 본 대로 `src_addr_width` 단위의 word입니다. 장치 FIFO를 넘치게 하지 않는 범위에서, `dma_slave_caps.max_burst` 이하로 정합니다.

**Step 2: Scatter-gather.** frame buffer가 물리적으로 연속이 아니면 scatterlist로 넘깁니다. client 문서가 정한 순서는 다음과 같습니다.

```c
struct device *dma_dev = dmaengine_get_dma_device(chan);
nr_sg = dma_map_sg(dma_dev, sgl, sg_len);          /* map with the DMA struct device */
desc = dmaengine_prep_slave_sg(chan, sgl, nr_sg, direction, flags);
cookie = dmaengine_submit(desc);                   /* queued, not started */
dma_async_issue_pending(chan);                     /* start */
```

문서는 scatterlist를 전송이 끝날 때까지 매핑된 상태로 유지해야 한다고 적습니다. `dma_slave_caps`의 `max_sg_burst`는 소프트웨어 개입 없이 한 번에 처리하는 SG 항목 수이고, 0이면 제한이 없다는 뜻입니다.

**Step 3: Double buffer.** DMA가 다음 frame을 채우는 동안 CPU가 이전 frame을 처리하게 합니다. 시뮬레이션에서는 `nbuf`가 이 개수입니다.

## 검증 — Before / After

`dblbuf.c`로 buffer 개수(1·2·3)와 frame당 처리 시간을 바꿔 가며 300 frame(60 fps, 5초)씩 돌렸습니다. 각 조합 5회의 drop률 중앙값입니다. 30 fps 조건은 150 frame입니다.

| 조건 | buffer 1 | buffer 2 | buffer 3 |
|---|---|---|---|
| 30 fps, 처리 16 ms | Mac 0.0% / VM 0.0% | — | — |
| 60 fps, 처리 12 ms | Mac 0.3% / VM 0.0% | Mac 0.0% / VM 0.0% | Mac 0.0% / VM 0.0% |
| 60 fps, 처리 16 ms | Mac 4.3% / VM 0.7% | Mac 0.0% / VM 0.0% | Mac 0.0% / VM 0.0% |
| 60 fps, 처리 20 ms | Mac 50.0% / VM 50.0% | Mac 16.3% / VM 16.3% | Mac 16.3% / VM 16.0% |

환경은 Mac(M2 Pro, Apple clang 21.0.0 `-O2`)과 같은 Mac 위의 Debian 13 arm64 VM(GCC 14.2.0, `taskset -c 2,3`)입니다. frame을 채우는 `memcpy`의 중앙값은 Mac 92~121 µs, VM 104~117 µs였습니다.

표에서 세 가지를 읽을 수 있습니다.

1. **30 fps는 되고 60 fps는 안 되는 모양이 buffer 하나로 재현됩니다.** 처리 16 ms는 33.3 ms 주기에는 넉넉하지만 16.7 ms 주기에서는 채우기와 처리가 차례로 들어갈 틈이 거의 없습니다.
2. **buffer를 둘로 늘리면 처리 시간이 주기보다 짧은 한 drop이 사라집니다.** 채우기와 처리가 다른 buffer에서 겹치기 때문입니다.
3. **처리 시간이 주기보다 길면 buffer를 늘려도 drop이 남습니다.** 처리 20 ms에서 buffer 2·3개의 drop률 16.0~16.3%는 소비자가 낼 수 있는 처리율의 한계 1 − 16.667/20 = 16.7%에 가깝습니다. buffer 1개의 50%는 frame 하나를 처리하는 동안 다음 tick이 빈 buffer를 못 찾아 frame을 하나씩 걸러 받은 결과입니다.

같은 Mac에서 다른 작업이 함께 돌았기 때문에 몇몇 실행은 크게 흔들렸습니다. 예를 들어 Mac의 buffer 2개·처리 16 ms 조건은 5회 중 두 번이 25.0%와 41.3%였습니다. 그래서 한 번의 실행이 아니라 중앙값으로 읽습니다.

## 교훈

- **payload부터 계산합니다.** 1080p60 YUV422는 픽셀만 248.832 MB/s이고 frame 주기는 16.667 ms입니다. 이 두 숫자가 모든 판단의 기준입니다.
- **CPU 사용률 평균만으로 원인을 배제하지 않습니다.** buffer 하나에서는 CPU 시간이 4% 남아도 drop이 났습니다.
- **burst 단위를 섞지 않습니다.** AXI burst는 transfer 수(AXI4 INCR 최대 256, 4KB 경계 금지), DMAengine `src_maxburst`는 `src_addr_width` 단위의 word 수입니다.
- **다음 descriptor를 미리 큐에 넣습니다.** DMAengine은 완료 시 큐의 다음 전송을 바로 시작합니다. V4L2 캡처도 buffer를 먼저 큐에 넣고 시작합니다.
- **buffer 개수는 겹침만 해결합니다.** 처리 시간이 frame 주기보다 길면 buffer를 늘려도 drop률은 처리율 한계(이 실험에서 약 16%)에 머뭅니다. 그때는 처리 자체를 줄여야 합니다.
- **비유 실험과 실측을 구분해 적습니다.** 이 글의 `memcpy` 실험은 DMA 측정이 아니며, 실제 burst 효과는 대상 SoC의 DMA 채널과 bus monitor로 다시 재야 합니다.

측정 소스는 `dblbuf.c`(`./dblbuf <nbuf> <period_us> <proc_us> <frames>`)와 `chunkcopy.c`(`./chunkcopy <chunk_bytes> <frames>`)입니다.

다음 사례는 [CXL.mem 기반 LLM KV cache 분석](/blog/embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache)입니다.

## 관련 항목

- [6-03: Lock Contention 사례](/blog/embedded/performance-engineering/part6-03-case-lock-contention)
- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
