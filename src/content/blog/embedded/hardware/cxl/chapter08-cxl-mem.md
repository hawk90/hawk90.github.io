---
title: "Ch 8: CXL.mem — M2S·S2M·HDM Decoder"
slug: "embedded/hardware/cxl/chapter08-cxl-mem"
date: 2026-05-16T09:08:00
description: "호스트가 디바이스 메모리를 load/store하는 프로토콜."
series: "CXL 4.0 Internals"
seriesOrder: 8
tags: [cxl-mem, m2s, s2m, hdm-decoder, interleave]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL.mem은 *host CPU의 load·store instruction이 64 B cache line 단위로 변환*되어 *PCIe 링크 위를 흐르는* 프로토콜입니다."** — *M2S Req·RwD*가 명령을, *S2M NDR·DRS*가 응답을 전달합니다. *HDM Decoder*가 *system physical address → device physical address* 매핑을 담당하고, 응답은 요청의 *Tag*로 짝지어집니다.

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

이게 가능한 이유는 *HDM Decoder*가 해당 물리 주소 범위를 CXL 디바이스로 보내도록 설정되기 때문입니다.

## 메시지 채널

CXL 3.1 기준 CXL.mem은 *방향마다 세 채널*, 모두 6개입니다(§3.3.2). 기본은 방향마다 두 채널이고, HDM-DB를 지원하는 디바이스는 BI* 두 채널(S2M BISnp·M2S BIRsp)을 더 씁니다.

| 방향 | 채널 | 메시지 | 의미 |
|------|------|--------|------|
| Host → Device | M2S Req | MemRd·MemRdData·MemInv | host의 *read·invalidate* 요청 |
| Host → Device | M2S RwD | MemWr·MemWrPtl | host의 *write* 요청 + data |
| Device → Host | S2M NDR | Cmp·Cmp-S·Cmp-E·Cmp-M | *no-data response* (write 완료·invalidate 완료) |
| Device → Host | S2M DRS | MemData | *data response* (read 결과 64 B) |
| Device → Host | S2M BISnp | BISnp | *Back-Invalidation Snoop* (HDM-DB 영역) |
| Host → Device | M2S BIRsp | BIRsp | BISnp에 대한 host 응답 (HDM-DB 영역) |

기본은 *M2S Req → S2M DRS (read)* 또는 *M2S RwD → S2M NDR (write)*. BISnp는 *HDM-DB* 영역에서 씁니다. HDM-DB는 Type 2와 Type 3 모두 쓸 수 있습니다([Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)).

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

*Tag*는 요청을 보낸 쪽(Master)이 트랜잭션 동안 잡아 둔 entry 번호(16 bit)입니다. 디바이스(Subordinate)는 응답에 이 값을 그대로 돌려주고, host는 그것으로 응답을 원래 요청에 연결합니다(CXL 3.1 §3.3). 한 채널 안에는 기본적으로 순서 규칙이 없어서(§3.3.2), 응답이 요청 순서대로 온다고 가정할 수 없습니다.

## Write 트랜잭션 흐름

Write는 *RwD 채널*로 *명령과 데이터를 함께* 보냅니다:

| 단계 | 동작 |
|------|------|
| 1 | CPU 명령: `mov [0x80000000], rax` |
| 2 | Host → Device: *M2S RwD* MemWr, addr=0x80000000, tag=43, 64 B payload |
| 3 | Device DRAM write |
| 4 | Device → Host: *S2M NDR* Cmp, tag=43 (write completion) |

*Completion이 짧다*는 점에 주의 — *write data는 RwD에 실어 한 번에 보냄*. host는 *Cmp 응답*만 기다리면 됩니다.

`MemWrPtl` (Partial Write)은 *64 B 미만 쓰기*에 사용. *64-bit Byte Enable*을 함께 보내 *어느 byte를 update할지* 지정합니다.

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

2-way interleave (256 B 단위):

| 구간 | SPA | Device | DPA |
|-----------|-----|--------|-----|
| 0 | 0x80000000 | A | 0x0 |
| 1 | 0x80000100 | B | 0x0 |
| 2 | 0x80000200 | A | 0x100 |
| 3 | 0x80000300 | B | 0x100 |

(interleave granularity = 256 B)

## Interleave Granularity

Linux 커널의 HDM decoder 코드는 granularity로 *256 B부터 16 KB까지*(2의 거듭제곱)를 받습니다.

| Granularity | 장점 | 단점 |
|------------|------|------|
| 256 B | 부하가 여러 디바이스로 고르게 흩어짐 | 한 디바이스 안의 연속성이 짧음 |
| 4 KB | 한 디바이스 안에서 연속 영역 유지 | 접근이 몰리면 한 디바이스에 hot spot |
| 16 KB | sequential read·prefetch에 유리 | random에 약함 |

*워크로드 access pattern*에 따라 고릅니다. Sequential bulk read는 *큰 granularity*, random은 *작은 granularity*가 맞습니다.

Linux에서는 region을 만들 때 정하고, `cxl list`로 확인합니다.

```bash
$ cxl create-region -m -d decoder0.1 -w 2 -g 1024 mem0 mem1
$ cxl list -R
# region 출력에 "interleave_ways":2, "interleave_granularity":1024 가 보입니다
```

## BISnp — HDM-DB의 Coherency Maintenance

HDM-DB 영역에서는 host가 디바이스 메모리의 line을 cache하고 있어도, 디바이스가 그 line을 무효화해야 할 때가 있습니다. Type 2라면 디바이스 자신이 쓰려 할 때, Type 3라면 다른 host나 peer가 접근할 때입니다. 이때 디바이스가 host에 보내는 것이

*BISnp (Back-Invalidation Snoop)*이고, host는 M2S BIRsp로 답합니다. 자세한 흐름은 [Ch 3 메모리 일관성](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 다뤘습니다.

## Flit Packing과 Credit Flow Control

CXL.mem 메시지는 *flit (flow control unit)*에 packing되어 *PCIe PHY*로 전송됩니다.

| Flit 모드 | 크기 | 비고 |
|---------|----------|-----|
| 68B flit | 68 B | link layer flit 528 bit(16 B slot 4개 + CRC 2 B) + Protocol ID 2 B. 1.1·2.0 |
| 256B flit | 256 B | 3.0에서 추가. 4.0의 128 GT/s도 사용 |

자세한 flit 구조는 [Ch 9 Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)에서.

*Credit-based flow control*은 *받는 쪽 버퍼가 넘치지 않게* 하는 장치입니다. 받는 쪽이 받을 수 있는 만큼 credit을 주고, 보내는 쪽은 credit이 있을 때만 보냅니다. 받는 쪽이 처리하면 credit이 반환됩니다.

## Linux 측 — Region 생성과 사용

```bash
# Decoder 확인
$ cxl list -DT

# Region 생성 (sysfs 또는 cxl-cli)
$ cxl create-region -m -d decoder0.0 -t ram -s 128G \
    -w 2 -g 256 mem0 mem1
# -m: 뒤의 target 인자를 memdev 이름으로 해석
# -t ram: 휘발성(ram) region
# -w 2: 2-way interleave
# -g 256: 256 B granularity (root decoder 설정과 맞아야 함)

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

### "Type 3 디바이스는 BISnp와 무관하다"

*HDM-H* Type 3면 그렇습니다. 하지만 Type 3도 direct P2P나 multi-host 일관성을 위해 *HDM-DB*를 쓸 수 있고, 그때는 BISnp 채널을 지원해야 합니다.

### "Interleave granularity는 작을수록 좋다"

*워크로드 의존*입니다. Sequential access는 *큰 값*이, random은 *작은 값*(최소 256 B)이 맞습니다.

### "CXL.mem load는 DDR load와 동일"

*Latency가 다릅니다*. 실제 CXL 디바이스 3종을 잰 연구(Sun et al., MICRO 2023)에서 load 지연이 원격 소켓 DDR5의 1.35배~약 3배로 디바이스마다 갈렸습니다. Linux에서 CXL 메모리는 별도 NUMA 노드로 보입니다([Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)).

## 정리

- CXL.mem은 *host load/store가 64 B cache line 단위 메시지*로 변환되는 프로토콜입니다.
- *M2S Req·RwD*가 명령, *S2M NDR·DRS*가 응답. 응답은 *Tag*로 요청과 짝지음.
- *HDM Decoder*가 *SPA → DPA + target device* 매핑. *interleave* 설정 가능.
- *Interleave granularity*는 256 B~16 KB 중 선택. *워크로드 access pattern 의존*.
- *BISnp*는 *HDM-DB* 영역에서 씁니다(Type 2·3). HDM-H Type 3는 쓰지 않습니다.

## 다음 편

[Ch 9: Flit Format — 68B vs 256B vs Latency-Optimized](/blog/embedded/hardware/cxl/chapter09-flit-format)에서 *CXL의 데이터 단위인 flit 구조*가 *세대별로 어떻게 진화*했는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: 메모리 일관성 모델](/blog/embedded/hardware/cxl/chapter03-coherency-model)
- [Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 spec, Linux `drivers/cxl/` 소스, ndctl 문서, Sun et al. MICRO 2023를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
