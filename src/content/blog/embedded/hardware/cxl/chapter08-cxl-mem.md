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

> **CXL.mem은 host가 device memory에 접근하는 메모리 프로토콜입니다. CPU 명령 하나와 wire 트랜잭션 하나가 항상 일대일로 대응하지는 않습니다.** — *M2S Req·RwD*가 명령을, *S2M NDR·DRS*가 응답을 전달합니다. *HDM Decoder*가 *system physical address → device physical address* 매핑을 담당하고, 응답은 요청의 *Tag*로 짝지어집니다.

[Ch 7](/blog/embedded/hardware/cxl/chapter07-cxl-cache)에서 *디바이스가 host memory를 cache*하는 *CXL.cache*를 봤습니다. 이 장은 *반대 방향* — *host가 device memory를 load/store*하는 *CXL.mem*입니다.

## CXL.mem의 매력 — Native load/store

설정된 HDM을 CPU가 읽을 때 cache hit이면 기존 cache data로 처리할 수 있습니다. 아래는 CXL 접근이 필요한 cache miss의 단순화한 경로이며, instruction 자체가 링크를 이동한다는 뜻은 아닙니다.

| 단계 | 처리 |
|------|------|
| 1 | CPU 명령 — `mov rax, [VA]` |
| 2 | MMU가 VA → PA 변환 |
| 3 | host의 물리 주소 라우팅과 플랫폼 window·decoder 구성이 대상 경로를 정합니다. |
| 4 | CXL Root Port → CXL link → CXL device |
| 5 | Device가 DRAM read (64 B cache line) |
| 6 | Device → host로 응답 |
| 7 | CPU가 데이터 받음, load 완료 |

매 load마다 명시적인 DMA setup이나 driver 호출을 하는 API 모델과 다릅니다. 다만 해당 mapping·page fault·권한·OS 메모리 상태는 먼저 준비되어야 합니다. NVMe의 block IO와 CXL의 메모리 주소 접근도 구분합니다.

이게 가능한 이유는 *HDM Decoder*가 해당 물리 주소 범위를 CXL 디바이스로 보내도록 설정되기 때문입니다.

## 메시지 채널

[CXL 3.1 §3.3](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf) 기준 CXL.mem은 *방향마다 세 채널*, 모두 6개입니다(§3.3.2). 기본은 방향마다 두 채널이고, HDM-DB를 지원하는 디바이스는 BI* 두 채널(S2M BISnp·M2S BIRsp)을 더 씁니다.

| 방향 | 채널 | 메시지 | 의미 |
|------|------|--------|------|
| Host → Device | M2S Req | MemRd·MemRdData·MemInv | host의 *read·invalidate* 요청 |
| Host → Device | M2S RwD | MemWr·MemWrPtl | host의 *write* 요청 + data |
| Device → Host | S2M NDR | Cmp·Cmp-S·Cmp-E·Cmp-M 등 | no-data completion·상태 응답. Cmp-M은 host 선택 지원이며 device에서 비활성화 가능해야 합니다. |
| Device → Host | S2M DRS | MemData | *data response* (read 결과 64 B) |
| Device → Host | S2M BISnp | BISnp | *Back-Invalidation Snoop* (HDM-DB 영역) |
| Host → Device | M2S BIRsp | BIRsp | BISnp에 대한 host 응답 (HDM-DB 영역) |

단순한 read data 반환과 write completion 외에도 요청·영역의 coherency 조건에 따라 NDR과 DRS 조합을 봐야 합니다. 모든 read가 data 하나만 받고 완료된다고 일반화하지 않습니다. BISnp는 *HDM-DB* 영역에서 씁니다. HDM-DB는 Type 2와 Type 3 모두 쓸 수 있습니다([Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)).

## Read 트랜잭션 흐름

다음 표는 data만 반환하는 단순 read 경로의 예입니다. 다른 영역·요청에 필요한 coherency completion과 ordering을 생략한 모델이며 모든 CPU load의 실행 trace가 아닙니다.

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
| 1 | CPU store는 cache·store buffer 등의 경로를 거칩니다. 아래는 이후 device로 내보내는 write transaction의 예입니다. |
| 2 | Host → Device: *M2S RwD* MemWr, addr=0x80000000, tag=43, 64 B payload |
| 3 | Device DRAM write |
| 4 | Device → Host: *S2M NDR* Cmp, tag=43 (write completion) |

RwD는 write 명령과 데이터를 함께 전달하고 NDR은 해당 트랜잭션을 완료합니다. Cmp를 CPU store의 retire 시점, 다른 agent의 관측 시점이나 영구 저장 완료와 동일하게 취급하지 않습니다.

`MemWrPtl` (Partial Write)은 *64 B 미만 쓰기*에 사용. *64-bit Byte Enable*을 함께 보내 *어느 byte를 update할지* 지정합니다.

## HDM Decoder — 주소 매핑의 핵심

CPU가 *0x80000000*에 load 했을 때, 그 주소가 *어느 CXL 디바이스의 어느 DRAM*에 해당하는지 결정하는 곳이 *HDM Decoder*입니다.

| 항목 | 의미 |
|------|------|
| Input | System Physical Address (SPA) |
| Output | Device Physical Address (DPA) + target device |
| Configurable | host CPU·CXL switch·CXL device 각 단계에 |
| Programming | firmware가 구성하거나 Linux가 region 생성·발견 과정에서 관리합니다. |

단일 디바이스 매핑:

| SPA Range | Device DPA |
|-----------|-----------|
| 0x0000_8000_0000 ~ 0x0000_FFFF_FFFF | Device A: 0x0 ~ 0x7FFF_FFFF (2 GiB) |

2-way interleave (256 B 단위):

| 구간 | SPA | Device | DPA |
|-----------|-----|--------|-----|
| 0 | 0x80000000 | A | 0x0 |
| 1 | 0x80000100 | B | 0x0 |
| 2 | 0x80000200 | A | 0x100 |
| 3 | 0x80000300 | B | 0x100 |

(interleave granularity = 256 B)

## 주소 분산을 검산하는 작은 예제

위 2-way 표는 host base를 뺀 offset을 256 B stripe로 나누고 두 target에 번갈아 배치한 모델입니다. 아래 함수는 **직접 연결된 동일 크기 target 두 개, DPA base 0, 단일 stripe 단계**만 가정합니다. 실제 다단 decoder·DPA skip·root window와 3/6/12-way 등의 별도 인코딩을 구현한 것은 아닙니다.

```js title="cxl-two-way-address.mjs"
export function translateTwoWay(hpa, base, size, granularity) {
  const values = [hpa, base, size, granularity];
  const limit = 1n << 64n;
  if (!values.every(x => typeof x === 'bigint' && x >= 0n) ||
      size === 0n || base + size > limit ||
      granularity < 256n || granularity > 16384n ||
      (granularity & (granularity - 1n)) !== 0n ||
      size % (2n * granularity) !== 0n ||
      hpa < base || hpa >= base + size) {
    throw new RangeError('invalid two-way teaching-map input');
  }
  const offset = hpa - base;
  const stripe = offset / granularity;
  return {
    target: Number(stripe % 2n),
    dpa: (stripe / 2n) * granularity + offset % granularity,
  };
}
```

`base=0x80000000n`, `size=0x80000000n`, `granularity=256n`으로 두면 전체 2 GiB를 target당 1 GiB로 나눕니다. `0x80000100n`은 target 1의 DPA 0, `0x80000200n`은 target 0의 DPA `0x100n`으로 갑니다. 범위 끝은 포함하지 않으며 중간 target의 순서는 예제 입력의 정책입니다.

이 산술에서 특정 granularity를 허용한다고 실제 장치에서 해당 region을 만들 수 있다는 뜻은 아닙니다. Linux v6.12의 `drivers/cxl/cxl.h` 인코딩 함수는 256 B~16 KiB의 2의 거듭제곱을 다루지만, root·경로·장치와 생성하는 region의 제약이 추가됩니다. interleave ways와 granularity가 독립적으로 아무 조합이나 가능한 것도 아닙니다.

큰 granularity가 항상 sequential에 좋고 작은 값이 항상 random에 좋다는 규칙도 없습니다. stride, 동시성, device bandwidth와 queue 분산에 따라 한 target으로 접근이 몰릴 수 있습니다. 실제 workload의 주소와 병목을 측정해야 합니다.

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

## Linux 측: region의 mode와 노출 상태

이 절의 기준은 Linux v6.12와 ndctl v80입니다. 아래는 실제 Linux 대상에서 상태를 읽는 명령 예이며 이 글에서 수집한 물리 출력은 아닙니다.

```bash
cxl list -DT
cxl list -R
daxctl list
numactl --hardware
```

[`cxl-create-region` 문서](https://github.com/pmem/ndctl/blob/04815e5f8b87e02a4fb5a61aeebaa5cad25a15c3/Documentation/cxl/cxl-create-region.txt)는 `ram`/`pmem` mode와 target·크기·interleave 조건을 구분합니다. `-m`은 뒤의 target 이름을 memdev로 해석하는 옵션이며 ram mode라는 뜻이 아닙니다. volatile region과 Device DAX/System RAM 노출은 서로 다른 단계입니다.

firmware가 이미 구성한 region도 있으므로 모든 시스템에서 생성 명령부터 실행하지 않습니다. `daxctl reconfigure-device`는 실제 상태를 바꾸는 작업이며 단순 조회가 아닙니다. NUMA node 번호와 CXL region의 관계도 실제 topology·OS 노출 상태로 확인합니다. 이 장에서는 region 생성·destroy·memory online/offline을 실행하지 않습니다.

자세한 driver 경로는 [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver), 실습 구성과 실행 범위는 [Ch 12](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에서 구분합니다.

## 자주 하는 실수

### "CPU load마다 CXL.mem 요청 하나가 나간다"

CPU cache에서 처리되는 load가 있고, prefetch·writeback·coherency 등의 traffic도 별도로 있습니다. instruction 수를 그대로 CXL 요청 수로 바꾸지 않습니다. cache miss의 종류와 실제 관측 경계를 함께 봅니다.

### "Type 3 디바이스는 BISnp와 무관하다"

*HDM-H* Type 3면 그렇습니다. 하지만 Type 3도 direct P2P나 multi-host 일관성을 위해 *HDM-DB*를 쓸 수 있고, 그때는 BISnp 채널을 지원해야 합니다.

### "Interleave granularity는 작을수록 좋다"

주소 분산과 병목에 따릅니다. granularity가 작아도 특정 stride가 한 target만 선택할 수 있으므로 접근 패턴과 동시성을 함께 확인합니다.

### "CXL.mem load는 DDR load와 동일"

*Latency가 다릅니다*. [Sun et al., MICRO 2023 연구](https://tianyin.github.io/pub/cxl-mem.pdf)의 Xeon Gold 6430·Linux 6.2·CXL 장치 3종 구성에서 load 지연이 원격 소켓 DDR5의 1.35배~약 3배로 디바이스마다 갈렸습니다. 이는 해당 측정 구성의 결과이며 모든 CXL 제품의 지연 배수가 아닙니다. 실제 Linux 노드 노출은 플랫폼·region·OS 상태에 따릅니다([Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)).

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

이 글은 CXL 3.1 spec, Linux v6.12 `drivers/cxl/` 소스, ndctl v80 문서, Sun et al. MICRO 2023를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
