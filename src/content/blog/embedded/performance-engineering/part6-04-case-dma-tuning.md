---
title: "사례 분석 — 카메라 payload와 DMA 전송 경로"
slug: "embedded/performance-engineering/part6-04-case-dma-tuning"
date: 2026-04-28T09:03:00
description: "카메라 캡처의 frame drop을 분석할 때 대역폭 요구량과 SoC별 DMA 설정을 확인하는 절차를 설명합니다. 결과 수치는 재현된 실측값이 아닙니다."
series: "Embedded Performance Engineering"
seriesOrder: 53
tags: [case-study, dma, burst, axi, throughput]
topics: ["embedded"]
---

## 한 줄 요약

> **"CPU가 한가한데 throughput이 모자란다면 bus와 DMA를 의심해야 합니다."**

## 증상 — 보고된 문제

카메라 영상을 캡처해 디스크에 저장하는 프로토타입에서 frame drop이 보고됐습니다.

| 항목 | 값 |
|------|-----|
| HW | Cortex-A53 quad-core, 1.2 GHz, MIPI CSI-2 input |
| 요구 | 1080p (1920×1080) YUV422, 60 fps → 1920 × 1080 × 2 × 60 = 248,832,000 B/s = 248.832 MB/s (십진) ≈ 237.3 MiB/s |

이 값은 blanking·metadata·padding을 포함하지 않는 픽셀 payload 계산입니다. 실제 CSI-2와 메모리 경로 요구량은 센서 포맷과 플랫폼 설정으로 확인해야 합니다. 아래 관측치도 검증된 보드 로그가 아니라 설명용 시나리오입니다.

증상은 다음 세 가지였습니다.

- 안정적으로 캡처되는 것은 30 fps까지였습니다.
- 60 fps로 설정하면 frame drop이 50%에 달했습니다.
- 그런데도 CPU idle이 70% 이상으로 여유가 많았습니다.

CPU가 한가한데 throughput이 모자라는 전형적인 비-CPU bound 문제였습니다. 처음에는 카메라 센서나 ISP 자체의 한계를 의심했지만, 데이터시트상 센서는 60 fps를 지원했습니다.

## 가설 1 — CPU 처리 부하

먼저 CPU 부하를 확인했습니다.

```bash
top -H -p $(pidof capture_app)

#   PID USER     %CPU  COMMAND
#  1234 root      28.0 capture_app
#  1235 root      15.0 cap_dma_thread
#  1236 root       8.0 cap_format
#  1237 root       4.0 cap_writer
```

캡처 데몬의 모든 thread를 합쳐도 60% 미만. 코어별로 봐도 가장 바쁜 코어가 40% 정도였습니다.

`perf stat`으로 IPC도 확인했습니다.

```bash
perf stat -p $(pidof capture_app) sleep 10

#  1.61  insn per cycle
#  0.8% branch-miss
#  4.2% cache-miss
```

이 예시의 IPC·cache miss 값은 타깃 이벤트 의미와 기준 자료가 없어 정상/비정상 판정에 사용할 수 없습니다. CPU 사용률만으로 memory나 I/O 병목을 배제할 수도 없습니다.

**가설 1 미검증**: task accounting, run queue, device activity와 deadline miss를 함께 확인해야 합니다.

## 가설 2 — DMA 성능 부족

CPU가 한가하다면 다음 의심은 데이터 전송 경로입니다. MIPI CSI-2 receiver → DMA → DDR 경로 어딘가에서 throughput이 부족해 보였습니다.

먼저 DMA 컨트롤러의 통계 레지스터를 읽었습니다.

```c
/* 디버그 코드 */
printf("DMA xfer count: %u\n", read_reg(DMA_XFER_CNT));
printf("DMA error:      %u\n", read_reg(DMA_ERR_STATUS));
printf("DMA active:     %u%%\n", read_reg(DMA_BUSY_PCT));
```

```text
DMA xfer count: 124000000
DMA error:      0
DMA active:     98%
```

DMA channel이 98% busy라고 가정한 설명 예시입니다. 원고의 `DDR3-1600 single-channel 6.4 GB/s` 전제는 데이터 폭이 명시되지 않아 보편값으로 쓸 수 없습니다. 채널 폭과 메모리 컨트롤러 사양을 알아야 비교할 수 있으며, 아래 숫자는 측정 사실로 확인되지 않았습니다.

AXI bus 효율은 검토할 가설입니다. 전용 performance monitor의 event·counter 정의는 SoC별로 확인해야 합니다. 아래 프로파일 값은 출처 없는 예시입니다.

```text
AXI master ports utilization:
  cam_dma:    98%
  cpu:        12%
  gpu:         3%
  total:     ~50% (overlapping)

cam_dma transaction profile:
  avg burst length:    16 beats
  beat width:           8 byte
  → per transaction:  128 byte
  inter-transaction gap: ~20 ns (assumed model)
  effective efficiency: 50%
```

이 예시의 단순 모델은 128 byte마다 20 ns의 간격을 둡니다. 이는 설명용 계산일 뿐 실제 AXI transaction이나 idle 시간을 입증하지 않습니다.

**판정 보류**: 실제 burst 길이와 bus 효율은 SoC monitor 또는 controller trace로 확인해야 합니다.

## 원인 — Burst Size와 Descriptor 모델

이 설명 시나리오는 burst size default 16 beat, hardware maximum 256 beat를 가정합니다. 대상 controller의 드라이버나 데이터시트에서 확인된 설정이 아닙니다.

```text
16 beat × 8 byte = 128 byte/transaction
이 payload의 전송 시간(6.4 GB/s 가정) = 128 byte / 6.4 GB/s = 20 ns
간격 20 ns를 더한 단순 모델 시간 = 40 ns
유효 처리량 = 128 byte / 40 ns = 3.2 GB/s (가정한 6.4 GB/s의 50%)

256 beat × 8 byte = 2048 byte/transaction
이 payload의 전송 시간(6.4 GB/s 가정) = 320 ns
간격 20 ns를 더한 단순 모델 시간 = 340 ns
유효 처리량 = 2048 byte / 340 ns ≈ 6.02 GB/s (가정한 6.4 GB/s의 94.1%)
```

이 단순 계산은 16배 burst에서 50% → 94.1%를 예측합니다. 따라서 같은 가정만으로는 124 MB/s의 원인을 설명하지 못합니다. 실제 효율에는 controller 제한, arbitration, 다른 traffic, descriptor 처리 등이 영향을 줍니다.

추가 가설은 single descriptor 완료 후 다음 frame을 준비하는 동안 DMA가 쉬는 구조입니다. 실제 드라이버 소스와 descriptor trace로 이 구조인지 확인해야 합니다.

![DMA Single Descriptor — Idle Overhead 문제](/images/blog/perf-eng/diagrams/part6-04-dma-timeline.svg)

60 fps의 frame period는 약 16.67 ms입니다. 200 µs가 매 frame 한 번의 완전한 idle 구간이라는 가정 아래 시간 비율은 약 1.2%입니다. 이 계산은 line 간격 손실이 반복된다는 증거가 아닙니다.

## 해결 — Burst Size, Scatter-Gather, Double Buffer

검토할 후보 변경은 다음 세 가지입니다. 실제 적용 결과가 없으므로 각 변경을 따로 시험한 뒤 조합해야 합니다.

**Step 1**: 컨트롤러 문서에서 지원되는 burst 설정을 확인합니다. `16 → 256 beat`는 일부 hardware의 가정 예시이며, 이 장치에 적용 가능한 값으로 검증되지 않았습니다.

Device-tree 속성과 최대 burst는 DMA 컨트롤러 및 해당 binding에 종속됩니다. `snps,*` 속성이나 최대 256 beat를 일반 카메라 DMA 설정으로 복사하지 말고, 대상 커널의 binding·드라이버·SoC 데이터시트를 확인해야 합니다.

DMAengine client 쪽 설정도 채널별 capability를 확인한 뒤 사용합니다. `src_maxburst`의 의미를 AXI beat 수와 동일시할 수 없습니다.

```c
struct dma_slave_config cfg = {
    .src_addr = peripheral_fifo_addr,
    .src_addr_width = DMA_SLAVE_BUSWIDTH_4_BYTES,
    .src_maxburst = controller_supported_burst,
};
ret = dmaengine_slave_config(chan, &cfg);
```

이 client API 예시는 설정 흐름만 보이는 부분 코드이며, `ret`·주소·폭·burst 값과 error handling은 장치·컨트롤러별 문서에 맞춰야 합니다. API의 burst length를 AXI beat 수와 동일시할 수 없으며, AXI 및 DDR 동작으로의 매핑은 controller 구현이 결정합니다. (출처: [Linux DMAengine client 문서](https://docs.kernel.org/driver-api/dmaengine/client.html))

**Step 2**: Scatter-gather descriptor chain

Descriptor ring은 하드웨어 chaining을 지원하는 컨트롤러에서 사용할 수 있습니다. DMAengine API의 SG descriptor 자체가 frame chaining이나 CPU 개입 제거를 보장하지는 않습니다.

DMAengine slave scatter-gather 흐름은 client가 DMA device를 얻고, scatterlist를 그 device로 매핑한 뒤 `dmaengine_prep_slave_sg()` → `dmaengine_submit()` → `dma_async_issue_pending()` 순으로 사용합니다. 완료 전에는 매핑을 유지하고 완료 후 올바른 방향으로 unmap해야 합니다. DMAengine descriptor가 자동으로 다음 frame으로 이어지는지와 cyclic/ring 지원 여부는 controller 기능으로 확인해야 합니다. (출처: [DMAengine client 문서](https://docs.kernel.org/driver-api/dmaengine/client.html))

**Step 3**: Double buffer로 latency hiding

DMA가 다음 frame을 받는 동안 user thread가 이전 frame을 처리합니다. Producer-consumer ring으로 구현합니다.

```c
ring_buffer_t *rb;

/* IRQ handler */
void on_frame_done(int idx)
{
    ring_buffer_publish(rb, idx);
}

/* Consumer thread */
void *processor(void *arg)
{
    while (1) {
        int idx = ring_buffer_consume(rb);
        process_frame(buf[idx]);
        ring_buffer_release(rb, idx);
    }
}
```

올바른 buffer ownership과 충분한 queue depth가 있으면 DMA와 CPU가 서로 다른 buffer를 처리하며 겹칠 수 있습니다. frame interval 전체 활용 여부는 workload와 backpressure에 따라 측정해야 합니다.

## 검증 — Before / After

원문의 아래 표는 각 변경의 효과를 보여 주는 예시 값입니다. 원시 trace, hardware/driver 정보, 반복 실험과 단일 변수 변경 기록이 없어 실제 단계별 측정으로 검증되지 않았습니다.

| 단계 | DMA throughput | AXI eff. | 캡처 fps | Frame drop |
|---|---|---|---|---|
| Original | 124 MB/s | 50% | 30 | 50% |
| Burst 256 | 230 MB/s | 92% | 56 | 7% |
| + SG chain | 245 MB/s | 95% | 59 | 2% |
| + Double buffer | 248 MB/s | 96% | 60 | 0.01% |

이 표는 관측 절차를 보여 주는 미검증 예시이며 재현된 결과가 아닙니다. 목표 payload는 앞의 계산대로 약 248.832 MB/s입니다. AXI 효율과 frame drop 개선은 실제 장치에서 동일 조건으로 측정해야 합니다.

원문에 적힌 CPU 사용률과 transport 효율 변화도 raw log가 없어 확인할 수 없습니다.

## 교훈

이번 사례에서 얻은 교훈을 정리합니다.

- **CPU 사용률만으로 원인을 배제하지 않습니다**. throughput, queueing, device status, memory·bus counters를 함께 확인합니다.
- **DMA burst size는 controller 문서로 정합니다**. 기본값·단위·최대치는 구현별로 다르며 큰 값이 항상 유리하지 않습니다.
- **AXI performance monitor를 확인**. event 의미·counter 범위·clock domain은 SoC 문서에 따라 해석합니다.
- **Descriptor chaining은 선택지입니다**. 지원 여부, 완료 처리, buffer ownership은 DMAengine과 장치 드라이버의 계약을 따릅니다.
- **Double buffering으로 overlap을 시험**. Producer/consumer 속도, buffer 소유권, queue backpressure를 함께 평가합니다.
- **측정 없이 가정하지 말 것**. 이 장의 효율·성능 값은 실측이 아니며, 실제 SoC에서 정의된 counter와 frame payload를 비교해야 합니다.

성능 진단에서는 CPU counters만으로 전체 경로를 판단하지 않고, memory, bus, peripheral의 지원되는 계측을 함께 사용합니다. 이 시나리오에는 실제 SoC·driver trace가 없어 지목된 경로를 확정하지 않습니다.

다음 사례는 [CXL.mem 기반 LLM KV cache 분석](/blog/embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache)입니다.

## 관련 항목

- [6-03: Lock Contention 사례](/blog/embedded/performance-engineering/part6-03-case-lock-contention)
- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
