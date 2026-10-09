---
title: "CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층"
slug: "embedded/hardware/hbm/chapter09-cxl-mem"
date: 2026-06-15T09:01:00
description: "CXL.mem이 메모리 계층에 끼어드는 자리 — on-package HBM과 DRAM DIMM 사이의 새 tier."
series: "HBM·GDDR 심화"
seriesOrder: 9
tags: [cxl, memory-tiering, hbm, ddr, ndp]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"HBM은 *대역폭*을, DDR은 *용량*을 풀지만, 서버 한 대에 꽂을 수 있는 메모리에는 한계가 있습니다."** — CXL.mem은 PCIe 물리 계층 위에서 *호스트 CPU가 외부 디바이스의 DRAM을 load/store로 직접 접근*하게 합니다. local DDR보다 멀리 있어 *지연은 더 크지만*, *용량을 링크 너머로 늘리는* 새 메모리 단을 만듭니다.

[Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 Llama 2 70B를 batch 128·seq 2048로 서빙하면 *약 226 GB*(weight 140 GB + KV cache 86 GB)가 필요하다는 것을 봤습니다. H100 80 GB로는 *weight조차* 한 장에 들어가지 않습니다. *PCIe 너머로 DRAM을 끌어와* 용량을 늘리는 길이 CXL.mem입니다. 이 장은 *CXL.mem이 메모리 계층의 어디에 끼는지*를 정리합니다.

## 메모리 계층의 새 자리

| Tier | 위치 | 접근 방식 |
|------|------|-----------|
| HBM | GPU·가속기 패키지 안 | load/store |
| DDR DIMM | CPU 소켓 옆 메모리 채널 | load/store |
| **CXL.mem** | **CXL 링크 너머 디바이스** | **load/store** |
| NAND SSD | NVMe | block I/O (드라이버·DMA) |

SSD는 *block I/O*라서 CPU의 load 명령으로 바로 읽을 수 없습니다. 드라이버 호출과 DMA가 끼어듭니다. CXL.mem은 *DDR과 SSD 사이*에, load/store 의미를 유지하면서 *용량을 더하는* 단을 만듭니다. 각 단의 지연·대역폭 수치는 제품과 구성에 따라 달라 이 장에서는 TBD로 둡니다.

## PCIe 위에 *load/store*를 얹는 길

CXL은 *PCIe 물리 계층을 재사용*합니다. CXL 3.0(2022년 8월)은 PCIe 6.0 PHY의 *64 GT/s*(PAM4)를 씁니다. 그 위에 *세 프로토콜*을 함께 흘립니다.

| 프로토콜 | 목적 |
|----------|------|
| CXL.io | PCIe 호환 discovery·configuration·DMA |
| CXL.cache | 디바이스가 호스트 메모리를 *캐시* |
| CXL.memory | 호스트가 디바이스 메모리를 *load/store* |

CXL.mem에서는 CPU의 *load instruction*이 *MMU 변환 → 메모리 컨트롤러 → CXL 링크 → 디바이스 DRAM*을 거쳐 cache line을 가져옵니다. NVMe SSD처럼 *드라이버를 호출하거나 DMA를 설정하지 않습니다*.

이게 가능한 것은 호스트와 디바이스의 *HDM(Host-managed Device Memory) Decoder*가 *물리 주소 범위*를 CXL 디바이스로 보내도록 설정되기 때문입니다. Linux 커널은 CXL 2.0 규격의 *HDM Decoder Capability Structure*를 읽어 이 decoder를 관리합니다.

링크 원시 전송률은 `GT/s × lane 수 ÷ 8`로 어림합니다. PCIe 5.0 x16은 *64 GB/s*, CXL 3.0의 64 GT/s x16은 *128 GB/s*(한 방향)입니다. 프로토콜 오버헤드를 뺀 실측값은 TBD입니다.

## CXL 버전

| 버전 | 발표 | 주요 내용 |
|------|------|-----------|
| CXL 2.0 | 2020년 11월 10일 | switching(fan-out), memory pooling, persistent memory 지원, 1.1·1.0과 하위 호환 |
| CXL 3.0 | 2022년 8월 | PCIe 6.0 PHY 64 GT/s, fabric, memory sharing·pooling 개선, peer-to-peer |

switch를 거치는 구성과 pooling은 *CXL 2.0부터*입니다. 시스템을 설계할 때는 호스트·switch·디바이스의 *지원 버전*을 맞춰야 합니다.

## 현세대 디바이스

CXL Type 3 메모리 디바이스는 DRAM을 CXL 링크 너머에 붙이는 모듈입니다.

| 제품 | 회사 | 내용 |
|------|------|------|
| CMM-D | Samsung | CXL 2.0, 128·256 GB (512 GB 제품도 등록됨) |
| CMM-DDR5 | SK hynix | CXL 2.0, 96 GB 고객 검증 완료, 128 GB 검증 진행 |
| CZ120 | Micron | CXL 2.0, 128·256 GB, PCIe 5.0 x8, 최대 36 GB/s |
| Leo (메모리 컨트롤러) | Astera Labs | CXL 2.0, 컨트롤러당 최대 2 TB |

Microsoft는 Azure M-series VM 프리뷰에서 Astera Labs Leo를 쓴 CXL 메모리 확장을 발표했습니다(2025년 11월).

## 어디서 쓰면 효과가 크나

CXL.mem은 *local DDR보다 지연이 크고*, 대신 *용량을 늘릴 수 있습니다*. 그래서 *지연보다 용량이 먼저 부족한* 워크로드에 맞습니다. Astera Labs는 in-memory database, LLM의 KV cache 저장, 추천 시스템을 대표 용도로 듭니다.

반대로 *지연에 민감한 tight loop*나 *대역폭이 먼저인 학습*은 HBM·DDR이 답입니다.

## OS·소프트웨어 통합

CXL.mem은 *load/store가 native로 가능*하지만, *OS가 인식하고 배치를 결정*해야 합니다. Linux의 CXL 서브시스템은 디바이스를 `sysfs`에 노출합니다.

```text
/sys/bus/cxl/devices/
    ├── root0/        # CXL root
    ├── port1/        # port
    ├── decoder0.0/   # HDM decoder
    ├── endpoint2/    # endpoint
    ├── mem0/         # memory device
    └── region0/      # region: interleave 등으로 묶은 메모리 영역
```

ndctl 패키지의 `cxl` 도구로 다룹니다.

```bash
cxl list -M -P -D                                       # memdev·port·decoder 목록
cxl create-region -m -d decoder0.1 -w 2 -g 1024 mem0 mem1   # 2-way interleave region
daxctl list                                             # DAX 디바이스
```

CXL 메모리는 두 가지 방식으로 *호스트에 노출*됩니다.

| 모드 | 어떻게 보이나 | 용도 |
|------|--------------|------|
| **System RAM** | 별도 NUMA node로 등장, 일반 RAM처럼 사용 | 가장 간단 |
| **Device DAX** | `/dev/daxX.Y`, mmap으로 직접 접근 | application이 *어디에 둘지* 결정 |

## 자주 하는 실수

### "CXL.mem은 DRAM을 대체한다"

*그렇지 않습니다*. 링크 너머에 있어 local DDR보다 *지연이 큽니다*. CXL.mem은 DDR을 대체하는 게 아니라 *DDR 너머의 확장*입니다.

### "CXL = NVMe와 비슷한 거다"

다릅니다. NVMe는 *block 단위 I/O*와 *드라이버 호출*입니다. CXL.mem은 *cache line 단위 load/store*이고 드라이버가 접근 경로에 끼지 않습니다.

### "CXL.mem은 HBM의 대체"

*반대*입니다. HBM은 *대역폭*, CXL.mem은 *용량*입니다. 서로 보완합니다.

### "CXL 1.1과 2.0과 3.0은 다 같다"

switching과 pooling은 *CXL 2.0부터*, fabric과 64 GT/s는 *CXL 3.0부터*입니다. 버전마다 할 수 있는 구성이 다릅니다.

## 정리

- CXL.mem은 PCIe PHY 위에서 *호스트가 디바이스 DRAM을 load/store로 접근*하게 하는 프로토콜입니다.
- 호스트·디바이스의 *HDM Decoder*가 물리 주소 범위를 CXL 디바이스로 보냅니다.
- *DDR과 SSD 사이*에 load/store를 유지하면서 *용량을 더하는* 단을 만듭니다.
- CXL 2.0은 switching·pooling, CXL 3.0은 PCIe 6.0(64 GT/s)·fabric을 더했습니다.
- *HBM 대체가 아닙니다*. HBM은 대역폭, CXL.mem은 용량입니다.
- Samsung CMM-D, SK hynix CMM-DDR5, Micron CZ120, Astera Labs Leo가 CXL 2.0 메모리 제품입니다.
- Linux는 CXL 디바이스를 sysfs에 노출하고, `cxl` 도구로 region을 만듭니다.

## 다음 편

[Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서는 CXL.mem 메시지가 어떻게 흐르는지, 왕복 횟수가 지연을 어떻게 만드는지를 분해합니다.

## 관련 항목

- [Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage) — KV cache 폭증 문제, CXL.mem이 푸는 자리
- [Ch 5: 메모리 대역폭 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck) — Roofline에서 CXL.mem의 자리
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol) (다음 편)
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
