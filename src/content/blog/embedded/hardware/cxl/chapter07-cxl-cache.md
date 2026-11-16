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

> **CXL.cache는 디바이스가 host 메모리의 사본을 캐시하고, host와 coherence 메시지로 상태를 맞추는 프로토콜입니다. 디바이스 캐시 상태는 MESI이고, 어떤 상태로 둘지는 host의 GO 응답이 정합니다.**

[Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)에서는 발견과 관리 경로를 살펴봤습니다. 이 장은 [CXL 3.1 §3.2](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)의 channel·요청·snoop·GO 응답을 따라갑니다. 도서관에서 책을 빌리는 일에 비유하면, 디바이스는 대출자, host는 대출 기록을 쥔 사서입니다. 대출자가 책을 가져가도 사서가 "지금 누가 어떤 상태로 들고 있는지"를 알고 있어야 다른 사람이 같은 책을 고칠 때 문제가 생기지 않습니다.

## CXL.cache 메시지 — D2H·H2D

§3.2.1은 CXL.cache를 *방향마다 Request·Response·Data 세 채널*로 정의합니다(Figure 3-10). 채널이 독립이어서 서로 다른 메시지가 전용 wire를 쓰고, 한 채널이 막혀도 다른 채널이 진행할 수 있습니다.

| 방향 | 채널 | 메시지 예 (§3.2.4) | 의미 |
|------|------|-----------|------|
| Device → Host | D2H Req | RdCurr·RdOwn·RdShared·RdAny·RdOwnNoData·ItoMWr·WrCur·CLFlush·CleanEvict·DirtyEvict·WrInv·CacheFlushed 등 | device의 read·write·eviction 요청. 요청마다 응답 0~2개, 데이터는 64 B 한 줄 이하 |
| Device → Host | D2H Resp | RspIHitI·RspSHitSE·RspSFwdM·RspIFwdM 등 | host snoop에 대한 응답. device 캐시에 남긴 상태를 알림 |
| Device → Host | D2H Data | 64 B cache line | snoop에 따른 implicit write-back, eviction에 따른 explicit write-back |
| Host → Device | H2D Req | SnpData·SnpInv·SnpCur | host가 device cache를 snoop |
| Host → Device | H2D Resp | GO·WritePull·GO_WritePull 등 | ordering 메시지와 write data pull |
| Host → Device | H2D Data | 64 B cache line | device read 요청의 데이터 |

데이터는 어느 채널이든 항상 64 B cache line 하나 단위로 옮겨집니다(§3.2.1). 채널은 서로 독립이어야 하지만 예외가 하나 있습니다. host는 H2D Response로 보낸 GO가 device에 관찰되기 전에는 같은 주소로 snoop을 보내지 않아야 합니다(§3.2.2.1).

## Read 흐름 — Device가 Host 메모리 Read

가장 단순한 *D2H read*입니다.

| 단계 | 동작 |
|------|------|
| 1 | Device cache miss — addr=X |
| 2 | Device → Host: *D2H Req* RdShared, addr=X |
| 3 | Host가 다른 캐시의 상태를 확인 |
| 4 | Host → Device: H2D Resp *GO-S* + H2D Data(64 B). 두 채널은 독립이라 도착 순서가 정해져 있지 않음 |
| 5 | Device가 Shared 상태로 캐시 |

§3.2.4.2.8의 RdShared는 보통 GO-S를 받습니다. 오류 조건에서는 GO-I나 GO-Err를 받을 수 있고, 둘 다 모든 비트가 1인 합성 데이터가 옵니다. 쓰기 의도가 있으면 *RdOwn*을 보냅니다(§3.2.4.2.7). 상태를 바꾸지 않고 최신 값만 한 번 쓰려면 *RdCurr*를 보내는데, 이 요청은 GO 없이 데이터만 받고 장치는 그 줄을 캐시할 수 없습니다(§3.2.4.2.6).

## Write 흐름 — Device가 Host 메모리 Write

| 단계 | 동작 |
|------|------|
| 1 | Device가 cache line을 수정하려 함 |
| 2 | Device → Host: *D2H Req* RdOwn, addr=X |
| 3 | Host가 다른 sharer에 SnpInv를 보내 무효화 |
| 4 | Host → Device: 보통 *GO-E* 또는 *GO-M* + 데이터 (§3.2.4.2.7) |
| 5 | Device가 쓰기를 수행하면 줄은 Modified |
| 6 | Modified 줄은 버릴 수 없고, eviction이나 snoop 때 host로 write back |

§3.2.4.5.2는 host가 Modified 상태를 돌려주면 device가 그 dirty data에 책임을 지고, write back 없이 버릴 수 없다고 씁니다. 반대로 GO-I나 GO-Err를 받으면 데이터를 최대 한 번만 쓰고 캐시하지 않아야 합니다.

## Snoop 흐름 — Host CPU가 같은 Line Read

Device cache에 *modified line*이 있는데 *host CPU가 같은 line을 읽으면* 다음이 일어납니다.

| 단계 | 동작 |
|------|------|
| 1 | Host CPU read miss — addr=X (device가 Modified로 보유) |
| 2 | Host → Device: *H2D Req* SnpData, addr=X |
| 3 | Device cache 확인 — Modified line 있음 |
| 4 | Device → Host: *D2H Resp* RspSFwdM(Shared로 내림) 또는 RspIFwdM(무효화) + *D2H Data* |
| 5 | Host CPU가 최신 데이터를 받음 |

§3.2.4.4.1은 SnpData를 받은 device가 줄을 무효화하거나 Shared로 내려야 하고, dirty data가 있으면 host에 돌려줘야 한다고 씁니다. 쓰기 때문에 오는 *SnpInv*는 무조건 무효화를 요구합니다(§3.2.4.4.2). *SnpCur*는 RdCurr를 대신해서만 보내며, 상태를 바꾸지 않는 것을 권고합니다(§3.2.4.4.3).

## Cache State와 GO 응답

§3.2.4.5.2는 GO를 "트랜잭션이 시스템에 관찰됐다"는 표시로 정의하고, RspType 필드에 인코딩한 *MESI* 상태가 requester 캐시에 넣을 상태를 정한다고 씁니다.

| State | 의미 | Device에서 |
|-------|------|----------|
| **Modified (M)** | exclusive + dirty | device가 유일하게 보유, host RAM과 다름. 버릴 수 없음 |
| **Exclusive (E)** | exclusive + clean | device가 유일하게 보유, host RAM과 같음 |
| **Shared (S)** | shared + clean | device·host(들)이 함께 읽기용으로 보유 |
| **Invalid (I)** | line 없음 | GO-I면 데이터를 한 번만 쓰고 캐시하지 않음 |

§3.2.5.2는 GO와 snoop의 순서도 정합니다. 예를 들어 host가 RdOwn에 GO-E를 보낸 직후 같은 주소로 snoop을 보내면, device는 줄을 M으로 바꾼 뒤 RspIFwdM으로 답하는 것이 기대 동작입니다. 이를 위해 link layer는 두 메시지를 서로 다른 slot에 실어 순서가 모호하지 않게 합니다.

## Type 1 시나리오 — 반복해서 읽는 host 데이터

§2.1이 드는 Type 1의 예는 PCIe 표준에 없는 *복잡한 atomic 연산*이 필요한 가속기입니다. 같은 절은 이런 장치가 작은 캐시만 필요하고, 그 크기는 host snoop filter 용량에 달려 있다고 씁니다. 아래는 앞의 메시지 정의를 그대로 이어 붙인 흐름입니다.

| 단계 | 동작 |
|------|------|
| 1 | 디바이스가 host 메모리의 데이터를 `RdShared`로 읽음 |
| 2 | GO-S를 받아 Shared로 캐시 |
| 3 | 다시 읽을 때 Shared 사본이 남아 있으면 CXL 요청 없이 사용 |
| 4 | host CPU가 그 줄에 쓰면 host가 `SnpInv`로 디바이스 사본을 무효화 |
| 5 | 디바이스는 다음 접근 때 다시 `RdShared`로 가져옴 |

## False Sharing — 최악 시나리오

*같은 cache line의 다른 byte*를 *device와 host가 번갈아 수정*하면 줄이 양쪽을 오갑니다. 사무실 공용 화이트보드 한 장을 두 팀이 번갈아 가져가 쓰는 것과 같습니다. 각자 다른 칸에 쓰는데도 보드를 통째로 옮겨야 합니다. 메시지로 보면 다음과 같습니다.

| 시간 | Device | Host CPU | CXL.cache 메시지 |
|------|--------|----------|--------|
| t1 | byte 0 수정 | — | D2H RdOwn → GO-E/GO-M |
| t2 | — | byte 32 수정 | H2D SnpInv → D2H RspIFwdM + D2H Data(64 B) |
| t3 | byte 0 다시 수정 | — | D2H RdOwn → GO-E/GO-M + H2D Data(64 B) |
| ... | (반복) | (반복) | 수정마다 요청·snoop·64 B 데이터 이동 |

데이터를 64 B 단위로만 옮기므로(§3.2.1), 서로 다른 byte라도 같은 줄에 있으면 매번 줄 전체가 오갑니다. 해결은 CPU 코드와 같습니다. 두 쪽이 쓰는 필드를 서로 다른 64 B 줄로 나누거나, 데이터 layout을 바꿔 같은 줄을 한쪽만 쓰게 합니다.

## Linux 측 — CXL.cache 활용

이 시리즈의 QEMU 11.1.3에는 CXL.cache를 쓰는 장치 모델이 없습니다. 소스 트리의 CXL endpoint 모델은 `hw/mem/cxl_type3.c` 하나이고, 나머지는 root port·switch·host bridge입니다. 게스트에서 볼 수 있는 것은 capability 비트까지입니다.

```text
0f:00.0  CXLCap:  Cache- IO+ Mem+ MemHWInit+ HDMCount 1 Viral-
0d:00.0  FBCap:   Cache+ IO+ Mem+ 68BFlit+ MltLogDev- 256BFlit- PBRFlit-
0d:00.0  FBSta:   Cache- IO+ Mem+ SynHdrByp- DrftBuf- 68BFlit+ MltLogDev- 256BFlit- PBRFlit-
```

(`lspci -vvv`에서 해당 줄만 모아 BDF를 앞에 붙였습니다.) endpoint `0f:00.0`은 `Cache-`라서 Type 3입니다. switch upstream port `0d:00.0`은 Flex Bus capability에 `Cache+`를 광고하지만, 협상 결과 자리인 `FBSta`는 `Cache-`입니다. 다만 이것은 협상의 결과가 아닙니다. QEMU 11.1.3 `hw/pci-bridge/cxl_upstream.c:121-125`가 capability와 control은 `0x27`(Cache 포함), status는 `0x26`(Cache 없음)으로 고정해 써 넣습니다. 실제 하드웨어라면 링크 트레이닝의 결과가 status에 들어가므로, capability(`FBCap`)와 status(`FBSta`)를 구분해 읽어야 한다는 점만 이 출력에서 가져갑니다.

Linux v6.12 `drivers/cxl/`에도 Type 1·2 장치를 등록하는 경로가 없습니다. 장치 상태의 `type`을 설정하는 곳은 `core/mbox.c:1452` 하나이고 값은 Type 3용 `CXL_DEVTYPE_CLASSMEM`입니다([Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)). 그래서 이 장의 흐름은 실행으로 확인하지 않았고, 규격 본문으로만 설명합니다.

## 자주 하는 실수

### "CXL.cache가 있으면 모든 접근이 캐시된다"

요청 opcode가 상태를 정합니다. RdCurr는 데이터만 받고 캐시하지 않으며(§3.2.4.2.6), GO-I나 GO-Err를 받은 줄도 한 번만 씁니다(§3.2.4.5.2).

### "Device cache state는 software가 관리"

*Hardware 프로토콜이 관리*합니다. 디바이스가 가질 수 있는 상태는 host가 GO 응답의 MESI 인코딩으로 정합니다(§3.2.4.5.2).

### "CXL.cache 디바이스는 MOESI·MESIF 상태도 쓴다"

§3.2.4.5.2가 GO의 RspType에 인코딩한다고 쓰는 상태는 *MESI*입니다. Owned·Forward 상태는 없습니다.

### "Modified 줄은 필요 없으면 버려도 된다"

§3.2.4.2.7과 §3.2.4.5.2는 Modified 줄을 버리지 말고 host에 write back하라고 씁니다. 예외는 오류 응답(GO-Err 등)으로 끝난 abort 조건입니다.

## 정리

- CXL.cache는 *디바이스가 host memory를 캐시*하는 프로토콜이고, 방향마다 Request·Response·Data 세 채널을 씁니다(§3.2.1).
- 데이터는 항상 64 B cache line 단위로 옮겨집니다.
- RdShared는 보통 GO-S, RdOwn은 GO-E 또는 GO-M을 받고, 오류 시 GO-I·GO-Err와 all-1 합성 데이터를 받습니다.
- host snoop은 SnpData·SnpInv·SnpCur 세 가지이고, dirty data는 Fwd 계열 응답과 함께 돌려줍니다.
- 디바이스 캐시 상태는 *MESI*이고, host가 GO 응답으로 정합니다.
- *False sharing*은 수정마다 64 B 줄 전체를 오가게 합니다.
- QEMU 11.1.3과 Linux v6.12에는 CXL.cache 장치 경로가 없어, 게스트에서는 `Cache-` capability까지만 관찰했습니다.

## 다음 편

[Ch 8: CXL.mem — M2S·S2M·HDM Decoder](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 *host가 device memory에 load/store*하는 *CXL.mem 프로토콜의 메시지 흐름*과 *HDM Decoder의 주소 매핑*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: 메모리 일관성 모델](/blog/embedded/hardware/cxl/chapter03-coherency-model)
- [Ch 6: CXL.io](/blog/embedded/hardware/cxl/chapter06-cxl-io)
- [Ch 8: CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)
- [Embedded Performance Engineering Ch 38: Cache Coherency 프로토콜](/blog/embedded/performance-engineering/part4-09-cache-coherency)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 §2.1·§3.2.1·§3.2.2.1·§3.2.4.2.6~.8·§3.2.4.4·§3.2.4.5.2·§3.2.5.2를 근거로 합니다. CXL.cache 장치가 없어 메시지 흐름은 실행하지 않았고, QEMU 11.1.3 게스트에서는 capability 비트만 확인했습니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
