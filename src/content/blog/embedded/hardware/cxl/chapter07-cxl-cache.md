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

> **CXL.cache는 디바이스가 host 메모리의 사본을 캐시하고, host와 coherence 메시지로 상태를 맞추는 프로토콜입니다. Cache hit에서 요청을 줄일 수 있지만 모든 접근의 왕복이나 소프트웨어 동기화가 사라지는 것은 아닙니다.**

[Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)에서는 발견과 관리 경로를 살펴봤습니다. 이 장은 [CXL 3.1 §3.2](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)의 channel·요청·GO 응답을 구분합니다. PCIe 장치도 플랫폼에 따라 coherent DMA나 자체 caching 기능을 사용할 수 있으므로 기존 PCIe는 항상 비일관적이며 매 access마다 DMA setup이 필요하다고 단정하지 않습니다.

CXL.cache의 의미는 규격이 정의한 host/device coherence 상호작용입니다. 실제 이득은 cache hit, 공유 패턴과 snoop·링크 비용으로 측정해야 합니다. Type 1·2의 캐시 동작과 Type 2의 device HDM 접근도 구분합니다.

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
| 4 | 정상 경로에서 Host → Device: GO-S 응답과 H2D Data(64 B). 각 채널의 도착 순서를 별도로 처리합니다. |
| 5 | 필요한 응답·데이터가 준비되면 Shared 사본을 사용합니다. 오류 응답은 별도 처리합니다. |
| 6 | Device 내부 use |

*RdShared*는 *읽기 전용 사본*. 만약 *device가 write 의도*면 *RdOwn* (exclusive 요청). RdOwn은 *host의 다른 sharer를 invalidate*.

## Write 흐름 — Device가 Host 메모리 Write

| 단계 | 동작 |
|------|------|
| 1 | Device가 cache line modify 의도 |
| 2 | Device → Host: *D2H Req* RdOwn, addr=X (exclusive 요청) |
| 3 | Host CPU의 cache에서 *다른 sharer invalidate* |
| 4 | 정상 경로의 GO-E 또는 GO-M과 데이터를 처리합니다. 오류 응답을 성공으로 쓰지 않습니다. |
| 5 | 허용된 쓰기 가능 상태를 확보합니다. RdOwn 수신만으로 무조건 Modified인 것은 아닙니다. |
| 6 | 실제 쓰기를 수행하면 Modified data로 관리합니다. GO-M으로 받은 data도 임의 폐기하지 않습니다. |
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

## Cache State와 GO 응답

CXL.cache의 디바이스 캐시는 *MESI* (Modified·Exclusive·Shared·Invalid)를 씁니다. H2D 응답 GO는 디바이스가 가질 수 있는 상태를 나타냅니다. §3.2.4.2.7의 RdOwn은 정상적으로 GO-E 또는 GO-M을 받을 수 있고, §3.2.4.2.8의 RdShared는 보통 GO-S를 받습니다. GO-I·GO-Err 같은 오류 경로를 정상 fill과 섞지 않습니다.

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
| 3 | 같은 데이터를 다시 읽을 때 유효한 사본이면 cache hit로 처리할 수 있습니다. |
| 4 | host CPU가 그 데이터를 바꾸면 `SnpInv`로 디바이스 cache를 무효화 |
| 5 | 디바이스가 다음 접근 때 다시 `RdShared`로 가져옴 |

## Type 2 시나리오 — Accelerator의 Shared Data

Type 2 GPU·NPU도 CXL.cache를 사용해 *host의 shared data*에 접근합니다.

| 시나리오 | 동작 |
|---------|------|
| LLM weight | host에 보관, GPU가 부분 read·캐시 |
| Tokenization table | host에 보관, GPU·NPU가 read |
| Configuration | host control plane, GPU가 cache |

위 표는 가능한 사용 모델이며 특정 GPU·NPU의 구현·성능 보고가 아닙니다. Type 2의 device memory는 HBM으로 한정되지 않으며 host/device 배치와 캐시 정책은 제품과 workload에 따릅니다.

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
- **정렬과 분리** — CXL line과 CPU의 실제 coherence 단위·배열 stride까지 확인합니다.
- **데이터 layout 재설계** — *AoS vs SoA* 선택

## Linux 측 — CXL.cache 활용

Type 1은 CXL.mem HDM을 제공하지 않습니다. generic CXL memory region이 없다는 사실과 PCI 장치가 발견되지 않는다는 주장은 다릅니다. 장치의 PCI function과 전용 driver에서 CXL.cache capability·enable 상태를 읽어야 합니다.

```bash
lspci -vv -s 0000:01:00.0
```

BDF는 실제 대상에서 확인합니다. `Cache+` capability는 프로토콜을 지원한다는 광고이며 실제 cache hit, snoop 처리나 coherence 동작의 trace가 아닙니다. [Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)의 합성 DVSEC 검증도 출력 형식만 확인하므로 물리 캐시 실험과 구분합니다.

## 자주 하는 실수

### "CXL.cache가 있으면 무조건 빠르다"

*Cache hit rate가 충분*해야 합니다. *불규칙한 access pattern*은 *cache miss → DMA-like round-trip*. 워크로드 *temporal locality 분석* 필수.

### "Cache line padding은 불필요하다"

CXL.cache 환경에서는 *false sharing이 매우 비쌉니다*. C++의 `std::hardware_destructive_interference_size`는 host 구현의 힌트이며 외부 디바이스의 coherence 단위까지 증명하지 않습니다. 정렬만 해도 서로 다른 객체가 같은 line을 공유할 수 있으므로 크기·stride도 확인합니다.

### "Device cache state는 software가 관리"

*Hardware가 관리*합니다. 디바이스가 가질 수 있는 상태는 host가 GO 응답의 MESI 인코딩으로 정합니다.

### "CXL.cache 디바이스는 MOESI·MESIF 상태도 쓴다"

CXL 규격이 정의한 디바이스 캐시 상태는 *MESI*입니다. Owned·Forward 상태는 규격에 없습니다.

### "Snoop overhead가 항상 무시 가능"

host와 디바이스가 *같은 line을 자주 번갈아 쓰면* snoop 트래픽이 커집니다. 공유 데이터의 배치와 access pattern을 먼저 봐야 합니다.

## 정리

- CXL.cache는 *디바이스가 host memory를 native cache*하는 프로토콜입니다.
- *D2H·H2D 메시지*가 *MESI coherency를 양방향 유지*. PCIe DMA보다 *정교한 메시지 set*.
- 정상 read/write 흐름은 요청 opcode뿐 아니라 GO 응답과 data 준비 조건을 함께 봅니다. RdOwn은 GO-E 또는 GO-M을 받을 수 있습니다.
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

이 글은 CXL 3.1 §3.2.1·§3.2.4.2.7/.8·§3.2.4.4와 CXL 1.1 규격을 근거로 합니다. 실제 CXL.cache 디바이스나 analyzer를 사용한 검증 결과는 아닙니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
