---
title: "CXL.mem 프로토콜 분해 — M2S·S2M 메시지와 HDM Decoder"
date: 2026-06-15T09:02:00
description: "CXL.mem 트랜잭션 흐름 — M2S Req·S2M NDR/DRS, HDM Decoder의 주소 매핑, BI·Snoop Filter 동작."
series: "HBM·GDDR 심화"
seriesOrder: 10
tags: [cxl, cxl-mem, hdm-decoder, cache-coherency]
draft: false
---

## 한 줄 요약

> **"CXL.mem은 *host의 load/store가 64 B cache line 단위 메시지로 변환*되어 *PCIe 링크 위를 흐르는* 프로토콜입니다."** — host 측 M2S(Master-to-Subordinate) Req·RwD가 *디바이스로 명령을 내리고*, device 측 S2M(Subordinate-to-Master) NDR·DRS가 *응답을 돌려보냅니다*. *HDM Decoder*가 *system physical address*를 *device physical address*로 매핑하고, *Bias·Snoop Filter*가 *coherency를 유지*합니다.

[Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 *CXL.mem이 메모리 계층의 어디에 끼는지*를 봤습니다. 이 장은 *그 안쪽*입니다. CPU가 `mov rax, [0x1234_5678_9000]` 한 줄을 실행했을 때 *무엇이 PCIe 링크를 지나가는지*, *디바이스가 어떻게 응답하는지*, *그 사이에 어떤 cache coherency 보호 장치*가 동작하는지를 본격적으로 분해합니다.

## 4가지 메시지 종류

CXL.mem 트랜잭션은 *두 방향·두 종류*로 나뉩니다.

| 방향 | 채널 | 메시지 | 의미 |
|------|------|--------|------|
| Host → Device | M2S Req | MemRd·MemRdData·MemInv | host가 *읽기·invalidate*를 요청 |
| Host → Device | M2S RwD | MemWr·MemWrPtl | host가 *데이터와 함께 쓰기* 요청 |
| Device → Host | S2M NDR | Cmp·Cmp-S·Cmp-E·Cmp-M | *no-data response* (write 완료·invalidate 완료) |
| Device → Host | S2M DRS | MemData | *data response* (read 결과 64 B) |
| Device → Host | S2M BISnp | BISnp | *Back-Invalidation Snoop* (Type 2 디바이스만) |

*M2S Req·RwD*는 *명령*을 보내고, *S2M NDR·DRS*는 *응답*을 보냅니다. 한 트랜잭션은 *항상 Req → response 쌍*으로 끝나며, host가 *credit-based flow control*로 큐를 관리합니다.

## Read 트랜잭션 흐름

가장 단순한 *load* 동작 — 단계별:

| 단계 | 동작 |
|------|------|
| 1 | CPU 명령: `mov rax, [0x12345000]` |
| 2 | MMU가 VA → PA 변환 (예: 0x80000000) |
| 3 | HDM Decoder가 PA를 CXL 디바이스로 라우팅 |
| 4 | Host → Device: *M2S Req* MemRd, addr=0x80000000, tag=42 |
| 5 | Device가 DRAM read (64 B cache line) |
| 6 | Device → Host: *S2M DRS* MemData, tag=42, payload 64 B |
| 7 | CPU가 데이터 수령, load 완료 |

*tag*는 *outstanding request를 식별*하는 ID입니다. CXL.mem은 *out-of-order completion*을 허용하므로, host가 *여러 read를 동시에 issue*하고 *응답이 임의 순서*로 와도 *tag로 매칭*합니다.

## Write 트랜잭션 흐름

write는 *RwD 채널*을 통해 *명령과 데이터를 함께* 보냅니다 — 단계별:

| 단계 | 동작 |
|------|------|
| 1 | CPU 명령: `mov [0x80000000], rax` |
| 2 | Host → Device: *M2S RwD* MemWr, addr=0x80000000, tag=43, 64 B payload |
| 3 | Device가 DRAM write |
| 4 | Device → Host: *S2M NDR* Cmp, tag=43 (write completion) |

*completion이 짧다*는 점에 주의 — *write data는 RwD에 실어 한 번에 보냄*. host는 *Cmp 응답*만 기다리면 됩니다.

`MemWrPtl`(Partial Write)은 *64 B 미만 쓰기*에 사용됩니다. *write mask*를 함께 보내 *어느 byte를 update할지* 지정합니다.

## HDM Decoder — 주소 매핑

CPU가 *0x80000000*에 load 한 줄 던졌을 때, 그 주소가 *어느 CXL 디바이스의 어느 DRAM 영역*에 해당하는지 결정하는 곳이 *HDM Decoder*입니다.

**단일 디바이스 매핑:**

| SPA Range | Device DPA |
|-----------|-----------|
| 0x0000_8000_0000 ~ 0x0000_FFFF_FFFF | Device A: 0x0 ~ 0x7FFF_FFFF (2 GB) |

**2-way Interleave (cache line 단위):**

| Cache Line | SPA | Device | DPA |
|-----------|-----|--------|-----|
| 0 | 0x80000000 | A | 0x0 |
| 1 | 0x80000040 | B | 0x0 |
| 2 | 0x80000080 | A | 0x40 |
| 3 | 0x800000C0 | B | 0x40 |

(interleave granularity = 64 B)

*Interleave granularity*는 64 B(cache line)·256 B·512 B·1 KB·…·16 KB 중 선택. *작은 granularity*는 *대역폭 증가*에 좋고, *큰 granularity*는 *prefetch 친화적*입니다.

Linux에서 HDM Decoder 구성 확인:

```bash
$ cxl list -DT
[
  {
    "decoder":"decoder3.0",
    "resource":0x80000000,
    "size":0x80000000,
    "interleave_ways":2,
    "interleave_granularity":64,
    "targets":[
      {"target":"mem0", "position":0},
      {"target":"mem1", "position":1}
    ]
  }
]
```

`interleave_ways=2`로 *두 디바이스에 cache line 단위 stripe*되어 있습니다.

## Bias-Based Coherency — Type 2 디바이스만

Type 3 메모리 expander는 *coherency가 단순*합니다 — host만 *load/store*하므로 *cache state*가 *host 측에만* 있습니다.

그러나 *Type 2 가속기*(GPU·NPU·FPGA)는 *device 측도 attached memory를 캐시*합니다. 같은 cache line을 *host와 device가 동시에 캐시*할 수 있어 *coherency 문제*가 발생합니다.

CXL은 *Bias-Based Coherency*로 이 문제를 *경량*하게 풉니다.

| Bias | 의미 | 적용 |
|------|------|------|
| **Host Bias** | host가 *해당 영역을 주로 사용*. device 측은 *snoop*해야 host의 dirty data 봄 | data 로딩 단계 |
| **Device Bias** | device가 *해당 영역을 주로 사용*. host는 *접근 시 snoop 발생* | GPU compute 단계 |

*Bias 전환*은 *software가 trigger*합니다. 예를 들어 LLM inference에서:

1. *Weight loading*: host가 HBM에 weight 채움 → *Host Bias*
2. *Inference 실행*: GPU가 weight 사용 → *Device Bias로 전환*
3. *결과 회수*: host가 output 읽음 → *Host Bias로 다시 전환*

bias 전환 자체는 *수 µs*가 들지만, *적절한 bias 동안의 access는 snoop 없이 빠릅니다*.

## Back-Invalidation Snoop (BISnp)

CXL 3.0부터 추가된 *BISnp*는 *device가 host의 cache를 invalidate*하는 메시지입니다.

시나리오 — *Device-Bias 영역*에 host가 접근:

| 단계 | 동작 |
|------|------|
| 1 | CPU가 Device-Bias 영역의 cache line X 접근 |
| 2 | Host → Device: *M2S Req* MemRd, addr=X |
| 3 | Device → Host: *S2M BISnp* (host에 cache line X invalidate 요청) |
| 4 | Host → Device: invalidate 확인 응답 |
| 5 | Device가 자기 캐시에서 fresh data 준비 |
| 6 | Device → Host: *S2M DRS* MemData, addr=X |

*BISnp가 필요한 이유*는 *device가 자기 캐시를 update*했을 때 *host의 stale 캐시*를 *무효화*해야 *데이터 무결성이 유지*되기 때문입니다.

## Flit Packing과 Credit Flow Control

CXL 메시지는 *flit (flow control unit)*에 packing되어 *PCIe PHY*로 전송됩니다.

| CXL 세대 | Flit 크기 | PHY |
|---------|----------|-----|
| 1.1·2.0 | 528-bit (66 B) | PCIe 5.0 |
| 3.0 | 256 B (Standard) / 256 B (Latency-Optimized) | PCIe 6.0 |

한 flit에 *여러 메시지가 packing*됩니다. 예를 들어 256-bit flit에는:
- 4개의 M2S Req·NDR (각 64-bit) 또는
- 1개의 M2S RwD + 4개의 NDR

*Credit-based flow control*은 *queue overflow 방지*입니다. host가 *N개의 outstanding request slot을 가짐*을 디바이스에 알리고, 디바이스는 *그만큼만 보냅니다*. credit이 *돌아오면 다시 issue 가능*.

이 메커니즘 때문에 *링크 utilization*이 *queue depth*에 크게 의존합니다. queue가 *얕으면 stall*, *깊으면 latency 폭증* — *적절한 균형*이 *튜닝 포인트*입니다.

## 자주 하는 실수

### "CXL.mem이 cache miss마다 CXL 트래픽"

*아닙니다*. CPU의 L1·L2·L3가 *CXL.mem 데이터를 캐시*합니다. *cache hit이면 CXL 트래픽 0*. *miss일 때만* CXL 트래픽이 발생합니다. *cache hit rate*가 *CXL.mem 워크로드의 핵심 metric*입니다.

### "Type 3 디바이스도 BISnp가 필요"

*불필요*입니다. Type 3는 *device 측이 자기 메모리를 캐시 안 함*. *coherency는 host CPU의 cache hierarchy*가 *전적으로 담당*합니다. BISnp 메시지를 *host가 처리할 필요도 없습니다*.

### "Interleave granularity는 무조건 작을수록 좋다"

*워크로드 의존*입니다. *Sequential access* 워크로드는 *granularity 4 KB*가 좋습니다 — *한 디바이스에서 연속 read*가 *prefetcher 활용*에 유리. *Random access*는 *granularity 64 B*가 좋습니다 — *모든 디바이스에 부하 분산*. 잘못 설정하면 *대역폭 절반*만 나옵니다.

### "Bias 전환은 비싸니 안 쓴다"

*Bias 전환의 비용은 µs 수준*이지만, *전환 후 수 ms~수 초 동안 snoop-free access*가 가능합니다. *큰 데이터 phase가 바뀔 때마다*(예: weight load → inference → output read) *전환하면 throughput이 크게 좋아집니다*. 작은 phase에 자주 전환하면 손해.

### "Flit 크기가 크면 무조건 좋다"

CXL 3.0의 *256 B flit*은 *throughput에 유리*하지만 *latency는 더 큽니다* — 한 flit 가득 차길 *기다리는* 시간이 생깁니다. CXL은 그래서 *Latency-Optimized 모드*를 별도 제공해 *작은 메시지는 빠르게 보냄*. 모드 선택이 *워크로드 의존*입니다.

## 정리

- CXL.mem은 *M2S Req·RwD*와 *S2M NDR·DRS·BISnp* 4가지 채널로 *명령·응답·snoop*을 주고받습니다.
- *Read는 Req → DRS*, *Write는 RwD → NDR*로 끝나며 *tag로 out-of-order completion*을 지원합니다.
- *HDM Decoder*가 *SPA → DPA 매핑*과 *interleave*를 결정합니다. `cxl list -DT`로 구성 확인.
- *Bias-Based Coherency*는 *Type 2 디바이스 전용* 경량 메커니즘입니다. *Host Bias / Device Bias 전환*으로 *대량 snoop 회피*.
- *BISnp*는 *device가 host cache 무효화*에 사용되며 CXL 3.0+에서 *명시적으로* 지원됩니다.
- *Flit packing*과 *credit flow control*로 *링크 효율*을 최대화하지만 *queue depth 튜닝*이 필요합니다.
- 성능 튜닝의 핵심은 *cache hit rate 높이기 + 적절한 interleave + Bias 활용*입니다.

## 다음 편

[Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)에서는 *디바이스 유형별로 어떤 프로토콜 조합*과 *어떤 트래픽 패턴*을 보이는지를 정리합니다. NVIDIA Connect-X(Type 1), AMD Instinct MI300X(Type 2), Astera Leo(Type 3) 같은 *실 제품 사례*와 *Linux 인식 경로*도 함께 봅니다.

## 관련 항목

- [Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types) (다음 편)
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
