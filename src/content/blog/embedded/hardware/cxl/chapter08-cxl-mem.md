---
title: "Ch 8: CXL.mem — M2S·S2M·HDM Decoder"
date: 2026-05-16T09:08:00
description: "호스트가 디바이스 메모리를 load/store하는 프로토콜."
series: "CXL 4.0 Internals"
seriesOrder: 8
tags: [cxl-mem, m2s, s2m, hdm-decoder, interleave]
draft: false
---

## 한 줄 요약

> **"CXL.mem은 *host CPU의 load·store instruction이 64 B cache line 단위로 변환*되어 *PCIe 링크 위를 흐르는* 프로토콜입니다."** — *M2S Req·RwD*가 명령을, *S2M NDR·DRS*가 응답을 전달합니다. *HDM Decoder*가 *system physical address → device physical address* 매핑을 담당하고, *Tag 기반 out-of-order completion*으로 queue 활용을 극대화합니다.

[Ch 7](/blog/embedded/hardware/cxl/chapter07-cxl-cache)에서 *디바이스가 host memory를 cache*하는 *CXL.cache*를 봤습니다. 이 장은 *반대 방향* — *host가 device memory를 load/store*하는 *CXL.mem*입니다.

## CXL.mem의 매력 — Native load/store

CPU의 *load instruction* (`mov rax, [0x12345000]`)이 *device memory에 직접 도달*합니다:

| 단계 | 처리 |
|------|------|
| 1 | CPU 명령 — `mov rax, [VA]` |
| 2 | MMU가 VA → PA 변환 |
| 3 | 메모리 컨트롤러가 *DDR 또는 CXL Root Port*로 분기 (HDM Decoder) |
| 4 | CXL Root Port → CXL link → CXL device |
| 5 | Device가 DRAM read (64 B cache line) |
| 6 | Device → host로 응답 |
| 7 | CPU가 데이터 받음, load 완료 |

*드라이버 호출 없음*. *DMA setup 없음*. NVMe SSD와는 *완전히 다른 의미*입니다.

이게 가능한 이유는 *호스트의 메모리 컨트롤러가 CXL Root Port를 DDR DIMM과 같은 등급*으로 취급하기 때문입니다.

## 4가지 메시지 채널

CXL.mem 트랜잭션은 *두 방향·각 두 채널*입니다.

| 방향 | 채널 | 메시지 | 의미 |
|------|------|--------|------|
| Host → Device | M2S Req | MemRd·MemRdData·MemInv | host의 *read·invalidate* 요청 |
| Host → Device | M2S RwD | MemWr·MemWrPtl | host의 *write* 요청 + data |
| Device → Host | S2M NDR | Cmp·Cmp-S·Cmp-E·Cmp-M | *no-data response* (write 완료·invalidate 완료) |
| Device → Host | S2M DRS | MemData | *data response* (read 결과 64 B) |
| Device → Host | S2M BISnp | BISnp | *Back-Invalidation Snoop* (HDM-DB only) |

기본은 *M2S Req → S2M DRS (read)* 또는 *M2S RwD → S2M NDR (write)*. BISnp는 *Type 2 HDM-DB*만.

## Read 트랜잭션 흐름

가장 단순한 *load* 동작:

| 단계 | 동작 |
|------|------|
| 1 | CPU 명령: `mov rax, [0x12345000]` |
| 2 | MMU가 VA → PA 변환 (예: 0x80000000) |
| 3 | HDM Decoder가 PA를 CXL device로 라우팅 |
| 4 | Host → Device: *M2S Req* MemRd, addr=0x80000000, tag=42 |
| 5 | Device가 DRAM read (64 B cache line) |
| 6 | Device → Host: *S2M DRS* MemData, tag=42, payload 64 B |
| 7 | CPU 데이터 수령, load 완료 |

*Tag*는 *outstanding request 식별 ID*. CXL.mem은 *out-of-order completion*을 허용하므로 *여러 read를 동시 issue*하고 *응답이 임의 순서*로 와도 *tag로 매칭*합니다.

## Write 트랜잭션 흐름

Write는 *RwD 채널*로 *명령과 데이터를 함께* 보냅니다:

| 단계 | 동작 |
|------|------|
| 1 | CPU 명령: `mov [0x80000000], rax` |
| 2 | Host → Device: *M2S RwD* MemWr, addr=0x80000000, tag=43, 64 B payload |
| 3 | Device DRAM write |
| 4 | Device → Host: *S2M NDR* Cmp, tag=43 (write completion) |

*Completion이 짧다*는 점에 주의 — *write data는 RwD에 실어 한 번에 보냄*. host는 *Cmp 응답*만 기다리면 됩니다.

`MemWrPtl` (Partial Write)은 *64 B 미만 쓰기*에 사용. *write mask*를 함께 보내 *어느 byte를 update할지* 지정.

## HDM Decoder — 주소 매핑의 핵심

CPU가 *0x80000000*에 load 했을 때, 그 주소가 *어느 CXL 디바이스의 어느 DRAM*에 해당하는지 결정하는 곳이 *HDM Decoder*입니다.

| 항목 | 의미 |
|------|------|
| Input | System Physical Address (SPA) |
| Output | Device Physical Address (DPA) + target device |
| Configurable | host CPU·CXL switch·CXL device 각 단계에 |
| Programming | Linux는 `cxl create-region` 시 자동 |

단일 디바이스 매핑:

| SPA Range | Device DPA |
|-----------|-----------|
| 0x0000_8000_0000 ~ 0x0000_FFFF_FFFF | Device A: 0x0 ~ 0x7FFF_FFFF (2 GB) |

2-way interleave (cache line 단위):

| Cache Line | SPA | Device | DPA |
|-----------|-----|--------|-----|
| 0 | 0x80000000 | A | 0x0 |
| 1 | 0x80000040 | B | 0x0 |
| 2 | 0x80000080 | A | 0x40 |
| 3 | 0x800000C0 | B | 0x40 |

(interleave granularity = 64 B)

## Interleave Granularity

*Interleave granularity*는 64 B(cache line)·256 B·512 B·1 KB·…·16 KB 중 선택.

| Granularity | 장점 | 단점 |
|------------|------|------|
| 64 B (cache line) | *모든 디바이스에 부하 분산* | DRAM bank parallelism 분산 |
| 4 KB | DRAM bank parallelism 보존 | 단일 디바이스에 hot spot |
| 16 KB | prefetch·sequential read 최적 | random에 약함 |

*워크로드 access pattern*에 따라 선택. Sequential bulk read는 *큰 granularity*, random random은 *64 B*.

Linux 확인:

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

`interleave_ways=2, interleave_granularity=64`로 *두 디바이스에 cache line 단위 stripe*되어 있습니다.

## BISnp — HDM-DB의 Coherency Maintenance

Type 2 디바이스의 HDM-DB 영역은 *device cache + host cache*가 *같은 line을 공유*할 수 있습니다. *Device가 자기 cache를 update*하면 *host cache를 invalidate*해야 합니다.

이게 *BISnp (Back-Invalidation Snoop)*. 자세한 흐름은 [Ch 3 메모리 일관성](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 다뤘습니다.

## Flit Packing과 Credit Flow Control

CXL.mem 메시지는 *flit (flow control unit)*에 packing되어 *PCIe PHY*로 전송됩니다.

| CXL 세대 | Flit 크기 | PHY |
|---------|----------|-----|
| 1.1·2.0 | 528-bit (66 B) | PCIe 5.0 |
| 3.0+ | 256 B | PCIe 6.0/7.0 |

자세한 flit 구조는 [Ch 9 Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)에서.

*Credit-based flow control*은 *queue overflow 방지*입니다. host가 *N개의 outstanding request slot을 가짐*을 device에 알리고, device는 *그만큼만 보냅니다*. credit이 *돌아오면 다시 issue 가능*.

이 메커니즘으로 *link utilization*이 *queue depth에 의존*합니다. queue 얕으면 *stall*, 깊으면 *latency 폭증* — *적절한 균형*이 *튜닝 포인트*.

## Linux 측 — Region 생성과 사용

```bash
# Decoder 확인
$ cxl list -DT

# Region 생성 (sysfs 또는 cxl-cli)
$ cxl create-region -d decoder0.0 -t ram -s 128G \
    -w 2 -g 64 -m mem0,mem1
# -t ram: system RAM 모드
# -w 2: 2-way interleave
# -g 64: 64 B granularity
# -m mem0,mem1: 두 디바이스

# DAX 모드 또는 system RAM 모드 전환
$ daxctl reconfigure-device dax0.0 -m system-ram

# NUMA 노드 확인
$ numactl --hardware
# node 2: CXL.mem region (별도 NUMA)
```

자세한 *Linux drivers/cxl/ 코드 분석*은 [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서.

## 자주 하는 실수

### "CXL.mem이 cache miss마다 CXL 트래픽 발생"

*아닙니다*. CPU의 L1·L2·L3가 *CXL.mem 데이터를 캐시*합니다. *cache hit이면 CXL 트래픽 0*. *miss일 때만* CXL 트래픽. *cache hit rate*가 *CXL.mem 워크로드의 핵심 metric*.

### "Type 3 디바이스도 BISnp 필요"

*불필요*입니다. Type 3는 *device 측 cache 없음*. *coherency는 host CPU의 cache hierarchy*가 *전적으로 담당*. BISnp 메시지를 *host가 처리할 필요도 없음*.

### "Interleave granularity는 작을수록 좋다"

*워크로드 의존*입니다. Sequential access는 *4 KB*가, random은 *64 B*가 좋습니다. *잘못 설정하면 대역폭 절반*.

### "Tag-based out-of-order completion은 자동"

*host CPU의 LSU·메모리 컨트롤러가 reorder를 처리*해야 합니다. *single-threaded application*에서는 의미 적고, *multi-threaded·heavy queue*에서 효과.

### "CXL.mem load는 DDR load와 동일"

*Latency가 다릅니다*. DDR5는 *80~120 ns*, CXL.mem direct는 *170~220 ns*. *2배 정도 느림*. *NUMA distance가 다르게 표시*되어 [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 자세히.

## 정리

- CXL.mem은 *host load/store가 64 B cache line 단위 메시지*로 변환되는 프로토콜입니다.
- *M2S Req·RwD*가 명령, *S2M NDR·DRS*가 응답. *Tag로 out-of-order completion*.
- *HDM Decoder*가 *SPA → DPA + target device* 매핑. *interleave* 설정 가능.
- *Interleave granularity*는 64 B·256 B·...·16 KB 중 선택. *워크로드 access pattern 의존*.
- *BISnp*는 *HDM-DB Type 2 전용*. Type 3는 *device cache 없어 BISnp 불필요*.
- *Credit-based flow control*이 *queue depth와 latency의 trade-off*를 만듭니다.

## 다음 편

[Ch 9: Flit Format — 68B vs 256B vs Latency-Optimized](/blog/embedded/hardware/cxl/chapter09-flit-format)에서 *CXL의 데이터 단위인 flit 구조*가 *세대별로 어떻게 진화*했는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: 메모리 일관성 모델](/blog/embedded/hardware/cxl/chapter03-coherency-model)
- [Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·Linux drivers/cxl/ 소스·hyperscale 측정 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
