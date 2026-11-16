---
title: "CXL Type 1·2·3 디바이스 분류 — 이 중 무엇이 나에게 메모리인가"
slug: "embedded/hardware/hbm/chapter11-cxl-device-types"
date: 2026-06-15T09:03:00
description: "CXL 세 유형을 메모리 계층 관점에서 다시 읽습니다. 어떤 유형이 호스트 용량을 늘려 주고, 어떤 유형이 늘려 주지 않는지, NUMA와 대역폭에서 무엇이 달라지는지."
series: "HBM·GDDR 심화"
seriesOrder: 11
tags: [cxl, cxl-type, accelerator, memory-expander]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL 카드 세 유형은 *메모리 계층에서 대등하지 않습니다*."** — *Type 3*는 계층에 *tier 하나를 더하고*, *Type 2*는 *가속기가 쓰는 메모리를 호스트가 operand 입출력 통로로 함께 보며*, *Type 1*은 *용량을 늘리지 않습니다*. 카드를 고를 때 물어야 할 질문은 "*이 디바이스가 어떤 프로토콜을 쓰는가*"가 아니라 "*내 워킹셋이 여기에 들어가는가*"입니다.

[Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 CXL.mem이 *DDR과 SSD 사이*에 새 tier를 만든다는 것을, [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 그 tier의 지연과 대역폭이 무엇으로 정해지는지를 봤습니다. 그런데 *CXL 카드라고 다 그 tier에 앉는 게 아닙니다*. 이 장은 세 유형을 *메모리 계층 위에 올려놓고* 읽습니다.

디바이스 유형을 *프로토콜 조합으로 정의하는 분류 체계 자체*와 *MLD·MH-MLD 같은 multi-host 변형*은 [CXL 4.0 Internals Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)에 정리돼 있습니다.

## 세 유형, 규격의 정의부터

[CXL 1.1 규격(2019년 6월)](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-1.1-Specification.pdf) §2.1~2.3은 세 유형을 이렇게 설명합니다.

| 유형 | 규격의 설명 | 쓰는 프로토콜 |
|------|-----------|--------------|
| **Type 1** | *캐시를 가진* 디바이스. 캐시 크기는 host snoop filter 용량에 달림. 예: PCIe 표준에 없는 복잡한 atomic 연산이 필요한 가속기 | CXL.io + CXL.cache |
| **Type 2** | DDR·HBM 같은 *메모리가 붙은* 가속기. 이 메모리를 HDM(Host-managed Device Memory)으로 시스템 주소에 매핑 | CXL.io + CXL.cache + CXL.mem |
| **Type 3** | *memory expander*. 연산 엔진이 아니며 *CXL.cache로 어떤 요청도 하지 않음*, CXL.io는 discovery·enumeration·error reporting·관리용 | CXL.io + CXL.mem |

*호스트의 메모리 용량*이라는 잣대를 대면 셋은 완전히 다른 물건입니다.

| 유형 | 호스트 관점의 용량·노출 | 메모리 계층에서의 자리 |
|------|---------------------|---------------------|
| Type 1 | 늘지 않음 | 새 tier 아님. *디바이스가 호스트 메모리를 캐시* |
| Type 2 | HDM 매핑과 OS/driver 정책에 따름 | 가속기 쪽 메모리. 호스트에겐 *링크가 상한* |
| Type 3 | 늘어남 | *DDR과 SSD 사이의 새 tier* |

Type 3는 메모리 확장을 위한 유형입니다. 그러나 Type 2의 HDM도 호스트 시스템 주소로 매핑될 수 있으므로 **Type 3만 호스트 용량을 늘릴 수 있다는 규격상의 금지는 없습니다**. 다만 규격이 Type 2의 HDM을 두는 목적은 *호스트가 operand를 넣고 결과를 꺼내 가는 것*이라고 적으므로, 호스트의 일반 RAM 확장과는 목적이 다릅니다.

## Type 3 — 계층에 tier가 하나 붙는다

Type 3은 *memory expander*입니다. DRAM을 CXL 링크 너머에 두고 호스트에게 메모리로 노출합니다. 규격은 Type 3이 CXL.cache로 요청하지 않고 *주로 CXL.mem으로 호스트의 요청을 처리*한다고 적으므로, 이 메모리를 캐시하는 것은 *호스트 CPU의 캐시*입니다.

local DDR보다 *지연이 크고*, 대신 *소켓 밖에서 용량을 더* 붙입니다. [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 본 Sun 등의 실측에서 같은 CPU에 붙인 Type 3 장치 3종의 load 지연은 원격 소켓 DDR5 대비 1.35배·약 2배·약 3배로 갈렸습니다. switch를 끼우면 왕복 경로에 통과 지점이 둘 더 붙습니다. 이 트레이드오프는 [Ch 12](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)에서 토폴로지 단위로 다시 봅니다.

Type 3 제품군은 Ch 9의 *공개 제품 사례* 절에 있습니다. *메모리 확장이 목적이면 데이터시트에서 확인할 항목은 Type 번호가 아니라 용량·링크 폭·배치 위치*입니다.

## Type 2 — HDM 접근과 일반 RAM 노출을 구별하기

Type 2는 *메모리가 붙은 가속기*입니다. 규격은 그 목적을 이렇게 설명합니다. 가속기는 *자기 메모리와의 큰 대역폭*에서 성능을 얻고, CXL은 호스트가 그 메모리에 *operand를 넣고 결과를 꺼내 가는* 비용을 줄입니다.

호스트는 이 메모리를 *load/store로 직접 건드릴 수 있습니다*. 여기까지는 Type 3와 같습니다. 다른 건 가속기 자체의 접근과 coherency 정책입니다. CXL 1.1 §2.2.1.3은 별도 bias 전환 없이 전체가 Host Bias인 구현도 허용합니다. [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 본 *Host Bias / Device Bias*가 그 구분입니다. 디바이스가 작업을 실행하는 Device Bias 동안에는 호스트도 접근할 수 있지만, 규격 표현대로 *성능이 떨어집니다*.

두 번째 함정은 대역폭입니다. 규격도 Type 2의 성능이 *가속기와 device-attached memory 사이의 큰 대역폭*에서 나온다고 적습니다. HBM3 stack 하나가 819 GB/s, 9.6 Gbps HBM3E가 1,228.8 GB/s입니다([Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)). 호스트는 같은 메모리를 *CXL 링크 너머로* 읽고, PCIe 5.0 x16의 원시 전송률은 *64 GB/s*입니다. HBM3 stack 하나만 비교해도 `819 ÷ 64 ≈ 12.8`배입니다.

그래서 "*Type 2 카드를 꽂았으니 그 메모리만큼 내 메모리 풀에 추가됐다*"는 계산은 성립하지 않습니다. 단순히 카드 용량을 host의 일반 RAM에 합산하는 것은 잘못입니다. 그 메모리는 가속기가 일하는 공간이고, 호스트가 읽으면 위 대역폭 차이를 치릅니다. bias를 구현한 장치라면 Device Bias 구간의 *compromised performance*도 더해집니다.

## Type 1 — 용량은 늘지 않는다

Type 1은 *캐시를 가진 디바이스*입니다. 규격이 드는 예는 *PCIe 표준 atomic에 없는 복잡한 atomic 연산*이 필요한 가속기입니다. CXL.cache로 *호스트 메모리를 coherent하게 캐시*합니다.

메모리 계층 관점에서 Type 1은 *tier를 더하지 않습니다*. 디바이스가 호스트 메모리 일부를 자기 쪽으로 당겨 캐시하는 구조라, 늘어나는 것은 용량이 아니라 *디바이스가 그 데이터에 접근하는 속도*입니다. 캐시 크기도 *호스트 snoop filter 용량*에 묶입니다.

## 호스트에 어떻게 보이나 — NUMA 노드가 되는 유형과 아닌 유형

| 유형 | 호스트에 보이는 형태 | 배치 결정 주체 |
|------|-------------------|--------------|
| Type 3 (System RAM 모드) | firmware·hotplug·online·NUMA 설정에 따른 메모리 node | 커널 |
| Type 3 (devdax 모드) | `/dev/daxX.Y`. System RAM 할당 대상과 NUMA locality 메타데이터는 별개 | 애플리케이션이 mmap |
| Type 2 | 디바이스 메모리가 HDM으로 매핑되지만 *가속기 드라이버*가 노출 방식을 정함 | 가속기 런타임 |
| Type 1 | *메모리로는 보이지 않음* (HDM이 없음) | 해당 없음 |

Ch 9에서 본 두 모드(System RAM·DAX)는 *Type 3에서 고르는 선택지*입니다.

```bash
numactl --hardware   # CXL 영역이 별도 노드로 잡혔는지
daxctl list          # System RAM 대신 DAX로 노출된 경우
cxl list -M -D       # memdev와 decoder 확인
```

[Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)의 QEMU 게스트(Debian 13.7 arm64, kernel 6.12.116, cxl-type3 256 MiB)에서 실행한 결과입니다. 세 명령 모두 Ch 9의 region 생성이 실패한 뒤, 같은 부팅에서 실행했습니다.

```text
# numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3
node 0 size: 3911 MB
node 0 free: 3363 MB
node 1 cpus:
node 1 size: 0 MB
node 1 free: 0 MB
# daxctl list
# cxl list -M -D
[
  {
    "memdevs":[
      {
        "memdev":"mem0",
        "ram_size":268435456,
        "serial":0,
        "host":"0000:0d:00.0",
        "firmware_version":"BWFW VERSION 00"
      }
    ]
  },
  {
    "root decoders":[
      {
        "decoder":"decoder0.0",
        "resource":1099511627776,
        "size":4294967296,
        "interleave_ways":1,
        "max_available_extent":4294967296,
        "pmem_capable":true,
        "volatile_capable":true,
        "accelmem_capable":true,
        "qos_class":0,
        "nr_targets":1
      }
    ]
  },
  {
    "port decoders":[
      {
        "decoder":"decoder1.0",
        "resource":1099511627776,
        "size":268435456,
        "interleave_ways":1,
        "nr_targets":1
      }
    ]
  }
]
```

세 명령의 결과가 서로 다른 단계를 보여 줍니다.

- `numactl`의 node 1은 *CPU가 없고 0 MB*입니다. CPU 없는 node가 있다는 사실만으로는 CXL 메모리가 쓰이고 있다고 말할 수 없습니다.
- `daxctl list`는 비어 있습니다. DAX 장치가 없다는 것은 region이 없다는 뜻이기도 해서, 이것만으로 Type 2나 System RAM 모드라고 판정할 수 없습니다.
- `cxl list`는 memdev `mem0`(256 MiB)를 보여 줍니다. region 생성을 시도하기 전 Ch 9의 `cxl list -M -P -D`에는 없던 port decoder `decoder1.0`이 256 MiB 범위로 나타났지만, region은 없습니다.

root decoder의 `accelmem_capable:true`는 이 CXL 창이 Type 2 장치 메모리도 받을 수 있다는 표시입니다. 같은 게스트의 sysfs `decoder0.0/cap_type2`와 `cap_type3`가 둘 다 1이었습니다. [Linux v6.12 CXL 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/cxl/memory-devices.rst)가 설명하는 memdev → decoder → region → DAX/메모리 block 연결을 순서대로 따라가야 어느 단계에서 멈췄는지 보입니다.

## 트래픽이 유형별로 다른 이유

링크는 같은데 특성이 갈리는 이유는 *데이터가 어디 있고, 누가 캐시하며, 링크를 몇 번 건너는가*가 다르기 때문입니다.

| 유형 | 링크를 건너는 것 | 병목이 생기는 지점 |
|------|---------------|-----------------|
| Type 1 | 호스트 메모리의 cache line | 디바이스 캐시 미스. 미스마다 호스트 왕복 |
| Type 2 (Device Bias, 실행 중) | 적음 | 디바이스가 호스트를 거치지 않고 자기 메모리 접근 |
| Type 2 (Host Bias, 데이터 입출력) | 가속기 메모리 ↔ 호스트 | 링크 대역폭 |
| Type 3 | 호스트 캐시에서 미스된 line | 링크 왕복 지연 |

Type 3에서 *지연이 곧 성능*인 이유가 여기 있습니다. 호스트 캐시에서 빠지는 순간 링크를 건너야 하고, 그 왕복이 명령어 지연에 얹힙니다. 반대로 Type 2는 규격 표현대로 *Device Bias 동안 호스트의 일관성 엔진을 거치지 않고* 자기 메모리에 접근합니다. 같은 구간에 호스트가 접근하면 규격이 말하는 *compromised performance*가 됩니다.

## 자주 하는 실수

### "Type 2 가속기를 꽂으면 그 메모리만큼 호스트 메모리가 늘어난다"

CXL 1.1 §2.2가 정한 HDM의 목적은 호스트가 *operand를 넣고 결과를 꺼내는* 것입니다. bias를 구현한 장치라면 그 메모리는 가속기가 일하는 동안 Device Bias로 가속기 쪽에 있고, 호스트가 읽으면 링크(PCIe 5.0 x16 64 GB/s)를 건넙니다.

### "Type 1도 CXL이니 메모리 확장에 도움이 된다"

*도움이 되지 않습니다*. Type 1은 HDM이 없어 용량이 그대로입니다. 바뀌는 것은 *디바이스가 호스트 메모리에 접근하는 방식*뿐입니다.

### "Type 3면 DDR 슬롯을 늘린 것과 같다"

*지연이 다릅니다*. Sun 등의 실측에서 CXL 메모리는 *원격 소켓* DDR5보다도 35%~3배 느렸습니다. 그래서 NUMA 배치나 DAX로 *덜 쓰는 데이터를 내려보내는 설계*가 함께 필요합니다([Ch 12](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)의 TPP 참조).

### "유형만 알면 Linux에서 어떻게 보일지 예측된다"

유형은 프로토콜 능력을 설명합니다. 위 QEMU 실행의 Type 3는 memdev·decoder가 모두 보였는데도 region이 만들어지지 않아 메모리로 쓸 수 없었습니다(arm64 kernel 6.12에서 CPU cache invalidate 미지원, Ch 9). Type 1은 CXL.mem을 쓰지 않으므로 HDM이 없습니다.

## 정리

- CXL 1.1 규격에서 Type 1은 *캐시를 가진 디바이스*, Type 2는 *메모리(HDM)가 붙은 가속기*, Type 3는 *memory expander*입니다.
- Type 3는 메모리 확장을 목적으로 하며, Type 2의 HDM도 호스트 주소 공간에 매핑될 수 있습니다.
- *Type 2*의 HDM은 호스트가 operand를 넣고 결과를 꺼내는 통로입니다. 호스트는 접근할 수 있지만 *링크가 상한*이고 Device Bias 중이면 성능이 떨어집니다.
- *Type 1*은 HDM이 없어 *용량이 늘지 않습니다*.
- Type 3도 region이 만들어지고 online되기 전에는 메모리로 쓸 수 없습니다. QEMU arm64 실행에서는 memdev가 보여도 region 생성이 실패했습니다.
- 유형 선택 다음에 오는 결정은 *배치(direct·switch·fabric)*입니다.

## 다음 편

[Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)에서는 *카드 한 장*에서 *데이터센터 토폴로지*로 시야를 넓힙니다. CXL Switch·Pooling·Fabric에서 배치가 지연을 어떻게 바꾸는지, 그리고 시리즈 마무리까지 다룹니다.

## 관련 항목

- [Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — CPU 관점의 메모리 계층과 Linux 조회
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol) — CXL 1.1 Type 2의 bias 모델과 접근 비용
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric) (다음 편)
- [CXL 4.0 Internals Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD](/blog/embedded/hardware/cxl/chapter02-system-architecture) — 프로토콜 조합으로 정의되는 *분류 체계 자체*, 유형별 제품군, MLD·MH-MLD·Bundled Port 같은 multi-host 변형
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [Modern Embedded Recipes: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
