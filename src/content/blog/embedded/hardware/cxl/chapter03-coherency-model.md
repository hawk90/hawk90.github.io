---
title: "Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp"
slug: "embedded/hardware/cxl/chapter03-coherency-model"
date: 2026-05-16T09:03:00
description: "Host-managed Device Memory 두 종류와 일관성 메커니즘."
series: "CXL 4.0 Internals"
seriesOrder: 3
tags: [cxl, coherency, hdm-db, hdm-d, bias, bisnp]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"device memory를 host와 device가 함께 캐시할 수 있으면 일관성을 맞출 장치가 필요합니다."** — CXL은 HDM 영역을 *세 종류*로 나눕니다. *HDM-H*는 host만 일관성을 책임지는 Type 3 영역, *HDM-D*는 CXL.cache로 host와 일관성을 맞추는 Type 2 영역, *HDM-DB*는 CXL.mem의 *Back-Invalidate Snoop(BISnp)* 채널로 일관성을 맞추는 영역입니다. 256B flit을 쓰는 디바이스는 HDM-DB를 지원해야 합니다.

[Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)에서 디바이스 유형을 봤습니다. 이 장은 *device memory의 일관성이 어떻게 유지되는지*를 CXL 3.1 규격 §2.2 기준으로 정리합니다.

## HDM이란

*HDM(Host-managed Device Memory)*은 *디바이스에 붙은 메모리를 system coherent 주소 공간에 매핑*해, host가 *일반 write-back 방식으로 접근*하게 한 영역입니다. 디바이스의 메모리는 HDM 또는 *PDM(Private Device Memory)*으로 매핑됩니다.

| 항목 | 의미 |
|------|------|
| Mapping | HDM Decoder가 host 물리 주소를 device 주소로 변환 |
| Visibility | host의 모든 코어가 같은 주소로 접근 |
| Caching | host CPU cache에 *일반 load/store처럼* 캐시됨 |

## HDM 영역의 세 종류

CXL 3.1 규격의 용어 정의입니다.

| 종류 | 규격 정의 | 쓰는 디바이스 | host와 일관성을 맞추는 채널 |
|------|----------|--------------|---------------------------|
| **HDM-H** | Host-only Coherent | Type 3만 | 없음 (host 캐시 계층이 담당) |
| **HDM-D** | Device Coherent | Type 2만 | CXL.cache (D2H) |
| **HDM-DB** | Device Coherent using Back-Invalidate | Type 2 또는 Type 3 | CXL.mem의 BISnp / BIRsp |

일반적인 memory expander(Type 3)는 HDM-H입니다. Type 3도 *direct peer-to-peer*를 위해 HDM-DB를 쓸 수 있고, MLD와 G-FAM 디바이스는 *multi-host 일관성*을 위해 HDM-DB를 씁니다. 그리고 *256B flit 모드를 구현하는 디바이스는 모두 HDM-DB를 지원*해야 합니다. HDM-D 흐름은 68B flit 모드와의 호환을 위해 남아 있습니다.

## HDM-D — Bias 기반 일관성

HDM-D는 CXL 1.1부터 있던 Type 2의 *bias 기반 일관성 모델*을 씁니다.

| Bias | 성질 | 규격이 드는 쓰임 |
|------|------|-----------------|
| **Host Bias** | host 접근이 빠름. 디바이스가 접근하려면 host를 거쳐야 함 | 작업을 넣을 때, 결과를 읽을 때 |
| **Device Bias** | 디바이스가 host 일관성 엔진을 거치지 않고 접근. host도 접근할 수 있지만 성능이 떨어짐 | 디바이스가 작업을 실행하는 동안 |

Type 2 디바이스는 bias를 *page 단위*(예: 4 KB당 1 bit)로 Bias Table에 기록하고, *Transition Agent*가 host 캐시를 정리하며 bias를 바꿉니다. LLM inference처럼 *weight 적재 → 연산 → 결과 회수*로 phase가 뚜렷하면 이 모델에 맞습니다. 전환 비용의 구체적인 크기는 TBD입니다.

## HDM-DB — Back-Invalidate Snoop

HDM-DB는 *CXL 3.0*에서 추가된 *Back-Invalidate Snoop*을 씁니다. CXL.mem에 *디바이스가 host로 직접 snoop을 보내는* 전용 채널이 생깁니다.

| 채널 | 방향 | 역할 |
|------|------|------|
| BISnp | S2M (device → host) | 디바이스가 host의 캐시 line을 snoop·무효화 요청 |
| BIRsp | M2S (host → device) | host의 응답 |

디바이스는 개별 cache line의 일관성을 *inclusive snoop filter*로 추적할 수 있고, host가 BISnp를 처리할 때까지 *새 M2S 요청을 막을 수* 있습니다. 2.2.2절의 bias 기반 추적 방식도 HDM-DB에서 모두 쓸 수 있습니다. 차이는 host로 가는 일관성 흐름이 *CXL.cache D2H 대신 CXL.mem BISnp 채널*만 쓴다는 점입니다.

## HDM-D와 HDM-DB의 차이

| 기준 | HDM-D | HDM-DB |
|------|-------|--------|
| 쓰는 디바이스 | Type 2 | Type 2, Type 3 (MLD·G-FAM 포함) |
| host와 일관성 채널 | CXL.cache | CXL.mem BISnp / BIRsp |
| flit 모드 | 68B flit 호환용 | 256B flit 디바이스는 필수 지원 |
| multi-host 일관성 | — | Shared FAM의 hardware coherency 모델에 사용 |

## Snoop Filter — Device 측 추적

BISnp를 *모든 cache line마다* 보내면 부담이 큽니다. 디바이스는 *snoop filter*로 *host가 어떤 line을 갖고 있을 수 있는지* 추적해, 필요한 경우에만 BISnp를 보냅니다. 규격은 *inclusive snoop filter*를 추적 방식의 예로 듭니다. filter가 host 캐시 내용을 모두 포함하면, filter에 없는 line은 host가 갖고 있지 않으므로 BISnp를 보낼 필요가 없습니다.

snoop filter의 크기는 디바이스 설계의 트레이드오프입니다. 작으면 추적할 수 있는 line이 줄어 snoop이 늘고, 크면 면적이 늘어납니다.

## Linux 측 — decoder의 target type

Linux에서 switch 수준 decoder가 어떤 메모리를 디코딩하는지는 sysfs의 `target_type`으로 보입니다.

```bash
$ cat /sys/bus/cxl/devices/decoder1.0/target_type
expander       # Type 3 memory. accelerator memory(Type 2)면 accelerator
```

커널 ABI 문서(`sysfs-bus-cxl`, v5.14)에 따르면 이 값은 *그 decode 계층에서 어떤 메모리 영역이 활성화되느냐*에 따라 바뀔 수 있습니다. 메모리 장치 자체는 `cxl list -M`으로 보이고, 출력에는 `memdev`, `ram_size`, `pmem_size`, `serial`, `host` 같은 필드가 나옵니다.

## 자주 하는 실수

### "Bias(HDM-D)와 BISnp(HDM-DB) 중 워크로드에 맞는 것을 고른다"

규격상 둘은 *같은 선상의 선택지가 아닙니다*. HDM-DB에서도 bias 기반 추적을 쓸 수 있고, 차이는 *host와 일관성을 맞추는 채널*입니다. 그리고 256B flit 디바이스는 HDM-DB 지원이 *필수*입니다.

### "Type 3의 주된 영역은 HDM-DB다"

일반적인 Type 3 memory expander는 *HDM-H*입니다. HDM-DB는 direct P2P나 multi-host 일관성이 필요한 Type 3(MLD·G-FAM 포함)가 씁니다.

### "Bias 전환은 단순한 flag"

Type 2 디바이스는 bias를 page 단위로 추적하고, 전환할 때 *Transition Agent가 host 캐시를 정리*합니다. 단순히 bit 하나를 바꾸는 일이 아닙니다.

### "Snoop filter가 크면 무조건 좋다"

면적 비용이 큽니다. 크기는 *추적해야 할 line 수*와 면적의 균형으로 정해집니다.

## 정리

- *HDM*은 디바이스 메모리를 *system coherent 주소 공간*에 매핑해 host가 write-back 방식으로 접근하게 한 영역입니다.
- 영역은 *HDM-H*(host-only, Type 3), *HDM-D*(CXL.cache로 일관성, Type 2), *HDM-DB*(BISnp/BIRsp로 일관성, Type 2·3)로 나뉩니다.
- *HDM-D*는 page 단위 *Host Bias / Device Bias*로 일관성 비용을 phase별로 나눕니다.
- *HDM-DB*는 CXL 3.0의 *BISnp 채널*을 쓰고, 256B flit 디바이스는 반드시 지원해야 합니다.
- 디바이스는 *inclusive snoop filter*로 필요한 경우에만 BISnp를 보냅니다.
- Linux는 switch decoder의 `target_type`으로 accelerator(Type 2)와 expander(Type 3) 메모리를 구분합니다.

## 다음 편

[Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서 *CXL 2.0 pooling*과 *3.0 coherent fabric*, 그리고 *GFAM (Global Fabric Attached Memory)*가 *어떻게 다중 host 메모리 공유*를 가능하게 하는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 8: CXL.mem — M2S·S2M·HDM Decoder](/blog/embedded/hardware/cxl/chapter08-cxl-mem) — HDM Decoder의 mapping 구조
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol) — Bias·BISnp의 message 흐름

## 시리즈 자료 출처 안내

이 글은 CXL 3.1·1.1 spec, Linux `drivers/cxl/` 소스, ndctl 문서를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
