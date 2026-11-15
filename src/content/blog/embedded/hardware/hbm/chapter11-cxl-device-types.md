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

> **"CXL 카드 세 유형은 *메모리 계층에서 대등하지 않습니다*."** — *Type 3*는 계층에 *tier 하나를 더하고*, *Type 2*는 *가속기 메모리의 호스트 노출 정책을 별도로 확인해야 하며*, *Type 1*은 *용량을 늘리지 않습니다*. 카드를 고를 때 물어야 할 질문은 "*이 디바이스가 어떤 프로토콜을 쓰는가*"가 아니라 "*내 워킹셋이 여기에 들어가는가*"입니다.

[Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 CXL.mem이 *DDR과 SSD 사이*에 새 tier를 만든다는 것을, [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 그 tier의 지연과 대역폭이 무엇으로 정해지는지를 봤습니다. 그런데 *CXL 카드라고 다 그 tier에 앉는 게 아닙니다*. 이 장은 세 유형을 *메모리 계층 위에 올려놓고* 읽습니다.

디바이스 유형을 *프로토콜 조합으로 정의하는 분류 체계 자체*와 *MLD·MH-MLD 같은 multi-host 변형*은 [CXL 4.0 Internals Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)에 정리돼 있습니다.

## 세 유형, 규격의 정의부터

[CXL 1.1 규격](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-1.1-Specification.pdf) §2.1~2.3은 세 유형을 이렇게 설명합니다.

| 유형 | 규격의 설명 | 쓰는 프로토콜 |
|------|-----------|--------------|
| **Type 1** | *캐시를 가진* 디바이스. 캐시 크기는 host snoop filter 용량에 달림. 예: PCIe 표준에 없는 복잡한 atomic 연산이 필요한 가속기 | CXL.io + CXL.cache |
| **Type 2** | DDR·HBM 같은 *메모리가 붙은* 가속기. 이 메모리를 HDM(Host-managed Device Memory)으로 시스템 주소에 매핑 | CXL.io + CXL.cache + CXL.mem |
| **Type 3** | *memory expander*. 연산 엔진이 아니며 CXL.cache로 요청하지 않음 | CXL.io + CXL.mem |

*호스트의 메모리 용량*이라는 잣대를 대면 셋은 완전히 다른 물건입니다.

| 유형 | 호스트 관점의 용량·노출 | 메모리 계층에서의 자리 |
|------|---------------------|---------------------|
| Type 1 | 늘지 않음 | 새 tier 아님. *디바이스가 호스트 메모리를 캐시* |
| Type 2 | HDM 매핑과 OS/driver 정책에 따름 | 가속기 쪽 메모리. 호스트에겐 *링크가 상한* |
| Type 3 | 늘어남 | *DDR과 SSD 사이의 새 tier* |

Type 3는 메모리 확장을 위한 유형입니다. 그러나 Type 2의 HDM도 호스트 시스템 주소로 매핑될 수 있으므로 **Type 3만 호스트 용량을 늘릴 수 있다는 규격상의 금지는 없습니다**. 일반 RAM으로의 노출·할당·ownership 정책은 장치와 OS/driver 구현을 확인해야 합니다.

## Type 3 — 계층에 tier가 하나 붙는다

Type 3은 *memory expander*입니다. DRAM을 CXL 링크 너머에 두고 호스트에게 메모리로 노출합니다. CXL.cache로 요청하지 않으므로, 이 메모리의 캐시는 *호스트 CPU의 캐시*입니다. 호스트 입장에서는 *조금 느린 DIMM 한 뭉치*를 더 꽂은 것과 의미가 비슷합니다.

local DDR보다 *지연이 크고*, 대신 *소켓 밖에서 용량을 더* 붙입니다. 이 교환이 남는 장사인지가 Type 3 도입의 전부입니다. [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 본 실측처럼 같은 Type 3라도 컨트롤러에 따라 지연이 크게 갈리고, switch를 끼우면 경로에 통과 지점이 더 붙습니다. *용량을 늘리려고 switch를 넣는 순간 tier가 한 칸 더 내려간다*고 보면 됩니다. 이 트레이드오프는 [Ch 12](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)에서 토폴로지 단위로 다시 봅니다.

Type 3 제품군은 Ch 9의 *공개 제품 사례* 절에 있습니다. *메모리 확장이 목적이면 데이터시트에서 확인할 항목은 Type 번호가 아니라 용량·링크 폭·배치 위치*입니다.

## Type 2 — HDM 접근과 일반 RAM 노출을 구별하기

Type 2는 *메모리가 붙은 가속기*입니다. 규격은 그 목적을 이렇게 설명합니다. 가속기는 *자기 메모리와의 큰 대역폭*에서 성능을 얻고, CXL은 호스트가 그 메모리에 *operand를 넣고 결과를 꺼내 가는* 비용을 줄입니다.

호스트는 이 메모리를 *load/store로 직접 건드릴 수 있습니다*. 여기까지는 Type 3와 같습니다. 다른 건 가속기 자체의 접근과 coherency 정책입니다. CXL 1.1 §2.2.1.3은 별도 bias 전환 없이 전체가 Host Bias인 구현도 허용합니다. [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 본 *Host Bias / Device Bias*가 그 구분입니다. 디바이스가 작업을 실행하는 Device Bias 동안에는 호스트도 접근할 수 있지만, 규격 표현대로 *성능이 떨어집니다*.

두 번째 함정은 대역폭입니다. 가속기는 자기 메모리를 *on-package 경로*로 씁니다. HBM3 stack 하나가 819 GB/s, HBM3E가 1.23 TB/s입니다. 호스트는 같은 메모리를 *CXL 링크 너머로* 읽고, PCIe 5.0 x16의 원시 전송률은 *64 GB/s*입니다. *같은 물리 메모리인데 가속기가 보는 대역폭과 호스트가 보는 대역폭이 한 자리수 이상 차이*가 납니다.

그래서 "*Type 2 카드를 꽂았으니 그 메모리만큼 내 메모리 풀에 추가됐다*"는 계산은 성립하지 않습니다. 단순히 카드 용량을 host의 일반 RAM에 합산하는 것은 잘못입니다. 반대로 Type 2라는 이유만으로 host 메모리 사용을 금지한다고 결론내려서도 안 됩니다. HDM 매핑·runtime의 사용 방식과 동시 접근 비용을 확인합니다.

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

CPU 없는 NUMA node만으로 CXL Type 3를 식별할 수는 없습니다. 반대로 memdev가 보이더라도 region 미구성·driver 미결합·메모리 offline 등 여러 상태가 있습니다. [Linux v6.12 CXL 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/cxl/memory-devices.rst)를 기준으로 memdev→decoder→region→DAX/메모리 block의 연결과 online 상태를 함께 추적해야 합니다. 조회 결과의 부재만으로 Type 2나 DAX라고 판정하지 않습니다.

## 트래픽이 유형별로 다른 이유

링크는 같은데 특성이 갈리는 이유는 *데이터가 어디 있고, 누가 캐시하며, 링크를 몇 번 건너는가*가 다르기 때문입니다.

| 유형 | 링크를 건너는 것 | 병목이 생기는 지점 |
|------|---------------|-----------------|
| Type 1 | 호스트 메모리의 cache line | 디바이스 캐시 미스. 미스마다 호스트 왕복 |
| Type 2 (Device Bias, 실행 중) | 적음 | 디바이스가 호스트를 거치지 않고 자기 메모리 접근 |
| Type 2 (Host Bias, 데이터 입출력) | 가속기 메모리 ↔ 호스트 | 링크 대역폭 |
| Type 3 | 호스트 캐시에서 미스된 line | 링크 왕복 지연 |

Type 3에서 *지연이 곧 성능*인 이유가 여기 있습니다. 호스트 캐시에서 빠지는 순간 링크를 건너야 하고, 그 왕복이 명령어 지연에 얹힙니다. 반대로 Type 2는 *Device Bias 구간에서 호스트를 거치지 않으므로* 자체 메모리 접근 경로를 사용할 수 있습니다. 그러나 host의 입력·출력이나 다른 링크 트래픽이 실행과 겹치면 링크 병목도 여전히 확인해야 합니다.

## 자주 하는 실수

### "Type 2 가속기를 꽂으면 그 메모리만큼 호스트 메모리가 늘어난다"

HDM 접근 능력과 Linux 일반 RAM 할당 가능성은 다릅니다. 호스트에 매핑·노출된 범위를 확인하고, 해당 영역을 쓰는 가속기의 동시 접근·bias·링크 비용까지 포함해야 합니다.

### "Type 1도 CXL이니 메모리 확장에 도움이 된다"

*도움이 되지 않습니다*. Type 1은 HDM이 없어 용량이 그대로입니다. 바뀌는 것은 *디바이스가 호스트 메모리에 접근하는 방식*뿐입니다.

### "Type 3면 DDR 슬롯을 늘린 것과 같다"

*지연이 다릅니다*. hot·cold 분리 없이 워킹셋 전체를 CXL 노드에 올리면 *용량은 해결되고 성능은 떨어집니다*. NUMA 배치나 DAX로 *cold 데이터를 내려보내는 설계*가 전제입니다.

### "유형만 알면 Linux에서 어떻게 보일지 예측된다"

유형은 프로토콜 능력을 설명합니다. Type 3도 firmware·decoder·region·driver·online 상태가 갖춰져야 사용할 수 있습니다. Type 2는 HDM의 노출 정책을 추가로 확인하며, Type 1에는 HDM이 없습니다.

## 정리

- CXL 1.1 규격에서 Type 1은 *캐시를 가진 디바이스*, Type 2는 *메모리(HDM)가 붙은 가속기*, Type 3는 *memory expander*입니다.
- Type 3는 메모리 확장을 목적으로 하며, Type 2의 HDM도 호스트 주소 공간에 매핑될 수 있습니다.
- *Type 2*의 메모리 노출과 할당 정책은 장치·driver에 따라 확인해야 합니다. 호스트는 접근할 수 있지만 *링크가 상한*이고 Device Bias 중이면 성능이 떨어집니다.
- *Type 1*은 HDM이 없어 *용량이 늘지 않습니다*.
- Type 3도 구성·driver·online 상태에 따라 Linux에서의 노출이 달라집니다.
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
