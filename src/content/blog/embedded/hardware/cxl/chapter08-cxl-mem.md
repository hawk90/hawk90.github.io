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

[CXL 3.1 §3.3](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf) 기준 CXL.mem은 *방향마다 세 채널*, 모두 6개입니다(§3.3.2, Figure 3-18). Direct P2P를 지원하는 장치는 방향을 뒤집은 6개를 더 가집니다. HDM-DB를 지원하는 디바이스는 BI* 두 채널(S2M BISnp·M2S BIRsp)을 반드시 지원하고, HDM-D만 쓰는 Type 2는 BI* 채널이 없을 수 있습니다.

| 방향 | 채널 | 메시지 | 의미 |
|------|------|--------|------|
| Host → Device | M2S Req | MemRd·MemRdData·MemInv | host의 *read·invalidate* 요청 |
| Host → Device | M2S RwD | MemWr·MemWrPtl | host의 *write* 요청 + data |
| Device → Host | S2M NDR | Cmp·Cmp-S·Cmp-E·Cmp-M 등 | no-data completion·상태 응답. Cmp-M은 host가 선택적으로 지원하고, device는 이 응답을 끌 수 있어야 함 (§3.3.9) |
| Device → Host | S2M DRS | MemData | *data response* (read 결과 64 B) |
| Device → Host | S2M BISnp | BISnp | *Back-Invalidation Snoop* (HDM-DB 영역) |
| Host → Device | M2S BIRsp | BIRsp | BISnp에 대한 host 응답 (HDM-DB 영역) |

Cmp-S·Cmp-E·Cmp-M은 장치의 DCOH가 host에 줄의 상태를 알리는 응답이라(§3.3.9), HDM-D/HDM-DB 영역에서는 read에 DRS 데이터와 NDR 상태 응답이 함께 올 수 있습니다. BISnp는 *HDM-DB* 영역에서 씁니다. §3.3.2는 Type 3가 CXL.io의 peer-to-peer를 위해, MLD와 G-FAM 장치가 multi-host 일관성과 CXL.mem peer-to-peer를 위해 HDM-DB를 쓸 수 있다고 씁니다([Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)).

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

*Tag*는 요청을 보낸 쪽(Master)이 붙이는 16 bit 필드입니다(§3.3.5). 디바이스(Subordinate)는 NDR·DRS 응답에 이 값을 그대로 돌려주고(§3.3.9·§3.3.10), host는 그것으로 응답을 원래 요청에 연결합니다. 식당 주문표 번호처럼 음식이 나오는 순서가 아니라 번호로 짝을 맞춥니다. §3.3.2는 한 채널 안에 순서 규칙이 없다고 쓰므로(예외는 §3.3.11), 응답이 요청 순서대로 온다고 가정할 수 없습니다.

## Write 트랜잭션 흐름

Write는 *RwD 채널*로 *명령과 데이터를 함께* 보냅니다:

| 단계 | 동작 |
|------|------|
| 1 | CPU store는 cache·store buffer 등의 경로를 거칩니다. 아래는 이후 device로 내보내는 write transaction의 예입니다. |
| 2 | Host → Device: *M2S RwD* MemWr, addr=0x80000000, tag=43, 64 B payload |
| 3 | Device DRAM write |
| 4 | Device → Host: *S2M NDR* Cmp, tag=43 (write completion) |

RwD는 write 명령과 데이터를 함께 전달하고 NDR의 Cmp가 해당 트랜잭션을 완료합니다(§3.3.9의 Cmp: "writeback·read·invalidate의 완료").

`MemWrPtl` (Partial Write)은 64 B 줄의 일부만 쓸 때 씁니다. §3.3.6의 TRP 비트(이전 이름 BEP)가 서면 byte enable이 trailer로 붙고, 256B flit에서 byte enable 필드는 64 bit, 곧 64 B의 byte마다 1 bit입니다(§3.2.3.3.2).

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

Node.js 24.21.0으로 이 함수를 실행한 결과입니다. 앞의 표와 같은 값이 나오고, 범위 끝(`0x100000000`)은 예외를 던집니다.

```text
80000000 -> target 0 dpa 0x0
80000100 -> target 1 dpa 0x0
80000200 -> target 0 dpa 0x100
80000300 -> target 1 dpa 0x100
ffffffff -> target 1 dpa 0x3fffffff
end-exclusive: invalid two-way teaching-map input
```

함수의 granularity 검사는 Linux v6.12 `drivers/cxl/cxl.h:108-115`의 `granularity_to_eig()`를 따랐습니다. 이 함수는 `CXL_DECODER_MIN_GRANULARITY`(72행, 256)보다 작거나 `SZ_16K`보다 크거나 2의 거듭제곱이 아니면 `-EINVAL`을 돌려주고, 나머지는 `ilog2(granularity) - 8`로 인코딩합니다.

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

## Linux 측: HDM decoder가 실제로 채워지는 순서

HDM decoder는 region을 만들 때 커널이 root부터 endpoint까지 차례로 채웁니다. QEMU 게스트(Type 3 `mem0`, 256 MiB volatile)에서 [Linux v6.12 sysfs ABI](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-cxl)의 순서대로 region을 손으로 만들어 봤습니다. `cxl create-region`이 내부에서 하는 일과 같은 단계입니다.

```bash
cd /sys/bus/cxl/devices
R=$(cat decoder0.0/create_ram_region); echo $R > decoder0.0/create_ram_region
cd decoder0.0/$R
echo 1 > interleave_ways; echo 256 > interleave_granularity; echo 0x10000000 > size
echo ram > ../../decoder3.0/mode; echo 0x10000000 > ../../decoder3.0/dpa_size
echo decoder3.0 > target0
echo 1 > commit
```

`size`를 쓴 직후 `resource`는 `0x10000000000`이 됐습니다. root decoder가 CFMWS window(시작 `0x10000000000`, 4 GiB)에서 256 MiB를 떼어 준 것입니다. `target0`까지 쓰자 경로의 decoder가 모두 같은 HPA 범위로 채워졌습니다.

| decoder | 위치 | start | size | 기타 |
|---|---|---|---|---|
| `decoder1.0` | host bridge | `0x10000000000` | `0x10000000` | |
| `decoder2.0` | switch upstream port | `0x10000000000` | `0x10000000` | |
| `decoder3.0` | endpoint (`mem0`) | `0x10000000000` | `0x10000000` | `dpa_resource` `0x0`, mode `ram` |

마지막 `commit`은 실패했습니다.

```text
bash: line 17: echo: write error: No such device or address
[  135.680487] WARNING: CPU: 3 PID: 899 at drivers/cxl/core/region.c:235 cxl_region_invalidate_memregion.isra.0+0x3c/0x58
```

`cxl list -R -i -u`는 이 region을 `"decode_state":"reset"`, `"state":"disabled"`로 보여 줬습니다. 소프트웨어 쪽 decoder 값은 채워졌지만 하드웨어 decoder에 commit되지는 않았다는 뜻입니다. v6.12 `core/region.c:385`의 `commit_store()`가 decoder commit(390행)보다 먼저 `cxl_region_invalidate_memregion()`을 부르고, 이 함수(226-243행)는 CPU가 메모리 범위 캐시 무효화를 지원하지 않으면 `-ENXIO`를 돌려줍니다. v6.12에서 그 지원(`ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`)을 선언하는 아키텍처는 x86뿐이라, arm64 게스트에서는 여기서 멈춥니다([Perf Eng 3-11](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)과 같은 결과). 그래서 이 장의 HPA→DPA 변환을 실제 load로 따라가는 실험은 하지 못했습니다.

[ndctl v81 `cxl-create-region` 문서](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-create-region.txt)에 따르면 `-m`은 뒤의 target 이름을 memdev로 해석하라는 옵션이고, `-t`는 `pmem`/`ram` region type입니다. 같은 명령 `cxl create-region -m -d decoder0.0 -w 1 -t ram mem0`도 게스트에서 `failed to commit decode: No such device or address`로 끝났습니다.

자세한 driver 경로는 [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver), 실습 구성은 [Ch 12](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에서 다룹니다.

## 자주 하는 실수

### "CPU load마다 CXL.mem 요청 하나가 나간다"

CXL.mem 요청을 내는 쪽은 CPU 명령이 아니라 host의 coherency engine입니다. §3.3.1은 CPU coherency engine을 CXL.mem Master로 부릅니다. CPU 캐시에서 끝나는 load는 링크로 나가지 않고, write-back처럼 명령과 직접 대응하지 않는 요청도 있습니다.

### "Type 3 디바이스는 BISnp와 무관하다"

*HDM-H* Type 3면 그렇습니다. 하지만 Type 3도 direct P2P나 multi-host 일관성을 위해 *HDM-DB*를 쓸 수 있고, 그때는 BISnp 채널을 지원해야 합니다.

### "region 객체가 보이면 메모리를 쓸 수 있다"

QEMU 게스트에서 `region0`은 sysfs에 생겼고 경로의 decoder 값도 채워졌지만, commit이 `-ENXIO`로 실패해 `decode_state`가 `reset`으로 남았습니다. 실제로 쓸 수 있는지는 `commit`과 `decode_state`로 확인합니다.

### "CXL.mem load는 DDR load와 동일"

*Latency가 다릅니다*. [Sun et al., MICRO '23](https://tianyin.github.io/pub/cxl-mem.pdf)은 Xeon 6430 두 소켓, Linux v6.2(Table 1)에 CXL 장치 3종을 붙여 쟀습니다. §4.1의 관찰 O2에 따르면 CXL-A는 원격 소켓 DDR5(DDR5-R)보다 `ld` 지연이 35% 길었고, CXL-B와 CXL-C는 거의 2배와 3배였습니다. 논문은 지연이 CXL controller 설계에 크게 좌우된다고 결론짓습니다.

## 정리

- CXL.mem은 *host load/store가 64 B cache line 단위 메시지*로 변환되는 프로토콜입니다.
- *M2S Req·RwD*가 명령, *S2M NDR·DRS*가 응답. 응답은 *Tag*로 요청과 짝지음.
- *HDM Decoder*가 *SPA → DPA + target device* 매핑. *interleave* 설정 가능.
- Linux v6.12는 interleave granularity를 256 B~16 KiB의 2의 거듭제곱으로 인코딩합니다(`cxl.h:108-115`).
- QEMU arm64 게스트에서 region의 decoder 값은 채워졌지만 commit은 `region.c:235`의 경고와 함께 `-ENXIO`로 실패했습니다.
- *BISnp*는 *HDM-DB* 영역에서 씁니다(Type 2·3). HDM-H Type 3는 쓰지 않습니다.

## 다음 편

[Ch 9: Flit Format — 68B vs 256B vs Latency-Optimized](/blog/embedded/hardware/cxl/chapter09-flit-format)에서 *CXL의 데이터 단위인 flit 구조*가 *세대별로 어떻게 진화*했는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: 메모리 일관성 모델](/blog/embedded/hardware/cxl/chapter03-coherency-model)
- [Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 §3.2.3.3.2·§3.3.1~§3.3.11, Linux v6.12 `drivers/cxl/` 소스와 ABI 문서, ndctl v81 문서, Sun et al. MICRO '23, QEMU 11.1.3 게스트의 sysfs·dmesg 출력과 Node.js 24.21.0 실행 결과를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
