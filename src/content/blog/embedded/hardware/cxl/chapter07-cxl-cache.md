---
title: "Ch 7: CXL.cache — D2H·H2D 흐름과 coherency state"
slug: "embedded/hardware/cxl/chapter07-cxl-cache"
date: 2026-05-16T09:07:00
description: "디바이스가 호스트 메모리를 캐시하는 프로토콜."
series: "CXL 4.0 Internals"
seriesOrder: 7
tags: [cxl-cache, d2h, h2d, mesi, snoop]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL.cache는 *디바이스가 host 메모리를 native 캐시*하게 만들어 *PCIe 라운드트립을 회피*하는 프로토콜입니다."** — *D2H Req* (device → host: read·write·invalidate)와 *H2D Snoop·Resp·Data*가 *MESI 기반의 양방향 cache coherency*를 유지합니다. *Type 1·2 디바이스가 사용*합니다.

[Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)에서 *CXL.io의 PCIe 호환성*을 봤습니다. 이 장은 *디바이스가 host memory를 native 접근*하는 *CXL.cache 메커니즘*입니다. *PCIe DMA의 한계*를 넘는 *coherent caching*이 핵심입니다.

## 왜 CXL.cache가 필요한가

기존 PCIe 가속기는 *host RAM 접근*을 *DMA*로만 합니다. 문제:

- **Round-trip 비용** — 매 access마다 DMA setup·완료
- **No caching** — 같은 데이터 반복 access도 *매번 DMA*
- **No coherency** — host가 cache한 데이터를 *device가 못 봄*

CXL.cache는 *디바이스에 작은 local cache*를 두고 *host memory의 hot region*을 *coherent하게 캐시*합니다.

| 시나리오 | PCIe DMA | CXL.cache |
|---------|---------|-----------|
| 같은 데이터 반복 read | 매번 DMA | 첫 read 후 디바이스 cache hit |
| Coherency | 소프트웨어가 처리 | 하드웨어가 처리 |

## CXL.cache 메시지 — D2H·H2D

CXL.cache는 *양방향 메시지*로 동작합니다.

| 방향 | 채널 | 메시지 종류 | 의미 |
|------|------|-----------|------|
| Device → Host | D2H Req | RdCurr·RdShared·RdOwn·RdAny·RdOwnNoData·ItoMWr·WrCur·WrInv·CLFlush·CleanEvict·DirtyEvict·CacheFlushed 등 | device가 read·write·eviction 요청 |
| Device → Host | D2H Resp·Data | response·data return | host snoop 응답·data 반환 |
| Host → Device | H2D Req | SnpData·SnpInv·SnpCur | host가 device cache를 snoop |
| Host → Device | H2D Resp·Data | response·data return | device read 응답·data 반환 |

*양방향 모두 Req·Resp·Data 3가지 트래픽*. PCIe DMA보다 *훨씬 정교한 메시지 set*입니다.

## Read 흐름 — Device가 Host 메모리 Read

가장 단순한 *D2H read*:

| 단계 | 동작 |
|------|------|
| 1 | Device가 cache miss 발생 — addr=X |
| 2 | Device → Host: *D2H Req* RdShared, addr=X |
| 3 | Host CPU의 cache line 상태 확인 |
| 4 | Host → Device: *H2D Resp* + *H2D Data* (64 B) |
| 5 | Device cache에 line 채움, state = Shared |
| 6 | Device 내부 use |

*RdShared*는 *읽기 전용 사본*. 만약 *device가 write 의도*면 *RdOwn* (exclusive 요청). RdOwn은 *host의 다른 sharer를 invalidate*.

## Write 흐름 — Device가 Host 메모리 Write

| 단계 | 동작 |
|------|------|
| 1 | Device가 cache line modify 의도 |
| 2 | Device → Host: *D2H Req* RdOwn, addr=X (exclusive 요청) |
| 3 | Host CPU의 cache에서 *다른 sharer invalidate* |
| 4 | Host → Device: *H2D Resp* + *H2D Data* (line 보냄) |
| 5 | Device cache에 line 채움, state = Modified |
| 6 | Device가 modify, 캐시에 보관 |
| 7 | Eviction 또는 explicit writeback 시 → host로 반환 |

## Snoop 흐름 — Host CPU가 같은 Line Read

Device cache에 *modified line*이 있는데 *host CPU가 같은 line read*하면:

| 단계 | 동작 |
|------|------|
| 1 | Host CPU read miss — addr=X (이미 device가 Modified state) |
| 2 | Host → Device: *H2D Snoop* SnpData, addr=X |
| 3 | Device cache 확인 — Modified line 있음 |
| 4 | Device → Host: *D2H Resp* + *D2H Data* (modified data 반환) |
| 5 | Device cache state → Shared (또는 Invalid) |
| 6 | Host CPU가 fresh data 받음 |

이 흐름이 *MESI coherency의 핵심*. *Device·Host 양쪽 cache가 같은 line*을 가질 때 *coherency 유지*.

## Cache State — MESI 변형

CXL.cache의 디바이스 캐시는 *MESI* (Modified·Exclusive·Shared·Invalid)를 씁니다. host는 응답(GO)에 *4-bit MESI 인코딩*을 실어 디바이스가 그 line을 어떤 상태로 가져도 되는지 알려 줍니다.

| State | 의미 | Device에서 |
|-------|------|----------|
| **Modified (M)** | exclusive + dirty | device가 *유일 소유*, host RAM과 다름 |
| **Exclusive (E)** | exclusive + clean | device가 *유일 소유*, host RAM과 동일 |
| **Shared (S)** | shared + clean | device·host(들)이 *공유* read |
| **Invalid (I)** | line 없음 | cache eviction 또는 invalidate된 상태 |

## Type 1 시나리오 — 반복해서 읽는 host 데이터

CXL 1.1 규격이 드는 Type 1의 예는 *복잡한 atomic 연산*이 필요한 가속기입니다. 더 일반적으로는, host 메모리에 있는 *작고 자주 읽는 데이터*를 디바이스가 캐시하는 흐름이 CXL.cache의 기본 모양입니다.

| 단계 | 동작 |
|------|------|
| 1 | 디바이스가 host 메모리의 데이터를 `RdShared`로 읽음 |
| 2 | 디바이스 cache에 저장, state = Shared |
| 3 | 같은 데이터를 다시 쓰면 *cache hit*, host 접근 없음 |
| 4 | host CPU가 그 데이터를 바꾸면 `SnpInv`로 디바이스 cache를 무효화 |
| 5 | 디바이스가 다음 접근 때 다시 `RdShared`로 가져옴 |

## Type 2 시나리오 — Accelerator의 Shared Data

Type 2 GPU·NPU도 CXL.cache를 사용해 *host의 shared data*에 접근합니다.

| 시나리오 | 동작 |
|---------|------|
| LLM weight | host에 보관, GPU가 부분 read·캐시 |
| Tokenization table | host에 보관, GPU·NPU가 read |
| Configuration | host control plane, GPU가 cache |

*Type 2는 자체 HBM이 있어* *대부분의 hot data는 자기 HBM*. CXL.cache는 *간헐적으로 필요한 host data*를 *효율적으로 접근*하는 데 활용.

## False Sharing — 최악 시나리오

*같은 cache line의 다른 byte*를 *device와 host가 번갈아 modify*하면 *cache ping-pong* 발생:

| 시간 | Device | Host CPU | 트래픽 |
|------|--------|----------|--------|
| t1 | byte 0 modify | — | D2H RdOwn, line snatched |
| t2 | — | byte 32 modify | H2D Snoop, line snatched back |
| t3 | byte 0 again | — | D2H RdOwn again |
| ... | (반복) | (반복) | 매번 D2H 요청과 H2D snoop |

*throughput이 무너집니다*. 해결:

- **Cache line padding** — 다른 byte를 *별도 line으로 분리*
- **alignas(64)** — 구조체 alignment 명시
- **데이터 layout 재설계** — *AoS vs SoA* 선택

## Linux 측 — CXL.cache 활용

Type 1 디바이스는 HDM이 없어 `/sys/bus/cxl/devices/` 아래 CXL 메모리 장치로 등장하지 않습니다. 디바이스가 CXL.cache를 지원하는지는 CXL DVSEC의 capability로 보입니다.

```bash
$ lspci -vvv -s 5e:00.0
    Capabilities: [...] Designated Vendor-Specific: Vendor=1e98 ID=0000 Rev=1 Len=56: CXL
        CXLCap: Cache+ IO+ Mem- ...
```

## 자주 하는 실수

### "CXL.cache가 있으면 무조건 빠르다"

*Cache hit rate가 충분*해야 합니다. *불규칙한 access pattern*은 *cache miss → DMA-like round-trip*. 워크로드 *temporal locality 분석* 필수.

### "Cache line padding은 불필요하다"

CXL.cache 환경에서는 *false sharing이 매우 비쌉니다*. *modern C++의 std::hardware_destructive_interference_size* 사용 권장.

### "Device cache state는 software가 관리"

*Hardware가 관리*합니다. 디바이스가 가질 수 있는 상태는 host가 GO 응답의 MESI 인코딩으로 정합니다.

### "CXL.cache 디바이스는 MOESI·MESIF 상태도 쓴다"

CXL 규격이 정의한 디바이스 캐시 상태는 *MESI*입니다. Owned·Forward 상태는 규격에 없습니다.

### "Snoop overhead가 항상 무시 가능"

host와 디바이스가 *같은 line을 자주 번갈아 쓰면* snoop 트래픽이 커집니다. 공유 데이터의 배치와 access pattern을 먼저 봐야 합니다.

## 정리

- CXL.cache는 *디바이스가 host memory를 native cache*하는 프로토콜입니다.
- *D2H·H2D 메시지*가 *MESI coherency를 양방향 유지*. PCIe DMA보다 *정교한 메시지 set*.
- Read는 *RdShared/RdOwn*, Write는 *RdOwn → Modified*, Host의 update는 *Snoop으로 device cache invalidate*.
- 디바이스 캐시 상태는 *MESI*이고, host가 GO 응답으로 허용 상태를 정합니다.
- *False sharing*이 *최악 시나리오* — cache line padding으로 회피.

## 다음 편

[Ch 8: CXL.mem — M2S·S2M·HDM Decoder](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 *host가 device memory에 load/store*하는 *CXL.mem 프로토콜의 메시지 흐름*과 *HDM Decoder의 주소 매핑*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: 메모리 일관성 모델](/blog/embedded/hardware/cxl/chapter03-coherency-model)
- [Ch 6: CXL.io](/blog/embedded/hardware/cxl/chapter06-cxl-io)
- [Ch 8: CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)
- [Embedded Performance Engineering Ch 38: Cache Coherency 프로토콜](/blog/embedded/performance-engineering/part4-09-cache-coherency)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1·1.1 spec를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
