---
title: "CXL Type 1·2·3 디바이스 분류 — 이 중 무엇이 나에게 메모리인가"
date: 2026-06-15T09:03:00
description: "CXL 세 유형을 메모리 계층 관점에서 다시 읽습니다. 어떤 유형이 호스트 용량을 늘려 주고, 어떤 유형이 늘려 주지 않는지, NUMA와 대역폭에서 무엇이 달라지는지."
series: "HBM·GDDR 심화"
seriesOrder: 11
tags: [cxl, cxl-type, accelerator, memory-expander]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL 카드 세 유형은 *메모리 계층에서 대등하지 않습니다*."** — *Type 3*는 계층에 *tier 하나를 통째로 더하고*, *Type 2*는 *가속기가 자기 메모리를 들고 오지만 그게 호스트 몫은 아니며*, *Type 1*은 *용량을 한 바이트도 늘리지 않습니다*. 카드를 고를 때 물어야 할 질문은 "*이 디바이스가 어떤 프로토콜을 쓰는가*"가 아니라 "*내 워킹셋이 여기에 들어가는가*"입니다.

[Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 CXL.mem이 *DDR과 SSD 사이*에 *지연 150~300 ns, 대역폭 30~120 GB/s, 용량 256 GB~2 TB*의 새 tier를 만든다는 걸 봤고, [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 그 tier가 *M2S·S2M 메시지*로 어떻게 동작하는지를 봤습니다. 그런데 *CXL 카드라고 다 그 tier에 앉는 게 아닙니다*. 어떤 카드는 계층에 한 단을 더하고, 어떤 카드는 아무것도 더하지 않습니다. 이 장은 세 유형을 *메모리 계층표 위에 올려놓고* 읽습니다.

디바이스 유형을 *프로토콜 조합으로 정의하는 분류 체계 자체*와 *MLD·MH-MLD 같은 multi-host 변형*은 [CXL 4.0 Internals Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)에 정리돼 있습니다. 여기서는 그 분류를 전제로 두고, *메모리를 사려는 사람의 질문*만 따라갑니다.

## 세 유형, 메모리 계층에서 다시 읽기

같은 슬롯에 꽂히고 같은 링크를 쓰지만, *호스트의 메모리 용량*이라는 잣대를 대면 셋은 완전히 다른 물건입니다.

| 유형 | 호스트 용량이 늘어나나 | 호스트의 접근 방식 | Ch 9 계층표에서의 자리 |
|------|---------------------|------------------|---------------------|
| **Type 1** | 늘지 않음 | 해당 없음. 반대로 *디바이스가 호스트 메모리를 캐시* | 새 tier 아님. 기존 DDR 앞에 붙는 원격 캐시 |
| **Type 2** | 조건부로 늘어남 | load/store 가능하나 *소유권·Bias 협상*에 종속 | 가속기 쪽 HBM. 호스트에겐 *링크 대역폭이 상한* |
| **Type 3** | 늘어남 (카드당 256 GB~2 TB) | 일반 메모리처럼 load/store | *DDR과 SSD 사이의 새 tier* 그 자체 |

이 비대칭이 이 장의 전부입니다. 세 유형을 나란히 놓고 외우면 오히려 헷갈립니다. *메모리 확장이 목적이라면 실질적인 선택지는 Type 3 하나*이고, Type 2는 *가속기를 사면 딸려 오는 메모리*이며, Type 1은 *메모리 이야기가 아닙니다*.

## Type 3 — 계층에 tier가 하나 붙는다

Type 3은 *순수 메모리 디바이스*입니다. DRAM 모듈을 PCIe 너머에 두고 호스트에게 그대로 노출합니다. 디바이스 쪽에는 캐시가 없고, 모든 캐시는 *호스트 CPU의 L1·L2·L3*에 있습니다. 그래서 호스트 입장에서는 *조금 느린 DIMM 한 뭉치*를 더 꽂은 것과 의미가 거의 같습니다.

Ch 9의 계층표에서 이 자리를 다시 보면 이렇습니다.

| Tier | 지연 | 대역폭 | 용량 |
|------|------|--------|------|
| HBM (on-package) | 100~150 ns | 0.8~1.2 TB/s | 24~192 GB |
| DDR DIMM (local socket) | 80~120 ns | 80~100 GB/s | 1~6 TB |
| **CXL Type 3 카드** | **150~300 ns** | **30~120 GB/s** | **256 GB~2 TB** |
| NAND SSD | 50~100 µs | 7~14 GB/s | 4~64 TB |

지연은 *DDR의 두 배쯤*이고 대역폭은 *DDR보다 낮거나 비슷*한데, 용량은 *소켓 밖에서 한 자리수 더* 붙습니다. 이 교환이 남는 장사인지가 Type 3 도입의 전부입니다. Ch 9에서 정리했듯 *LLM inference의 KV cache pool*, *in-memory DB의 cold tier*, *컨테이너 호스트의 overcommit*처럼 *순차 접근이 많고 지연에 덜 민감한* 워크로드에서만 값을 합니다.

지연 숫자는 *카드 한 장의 사양이 아니라 배치의 함수*라는 점도 중요합니다. Ch 9의 실측 구간을 유형 선택에 그대로 옮기면, 같은 Type 3 카드라도 *direct attached 170~220 ns*, *switch 한 단 250~350 ns*, *pooled 2-hop fabric 400~600 ns*로 벌어집니다. *용량을 늘리려고 switch를 넣는 순간 tier가 한 칸 더 내려간다*고 보면 됩니다. 이 트레이드오프는 [Ch 12](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)에서 토폴로지 단위로 다시 봅니다.

Type 3 카드 제품군은 Ch 9의 *현세대 디바이스* 절에 정리해 두었습니다. 이 장에서 덧붙일 것은 하나뿐입니다. *메모리 확장이 목적이면 데이터시트에서 확인할 항목은 Type 번호가 아니라 카드 용량·링크 폭·배치 위치*입니다.

## Type 2 — 메모리가 오긴 하는데 내 것이 아니다

Type 2는 *자체 HBM이나 DRAM을 가진 가속기*입니다. GPU·NPU·FPGA 가속기가 여기 속합니다. 카드에 메모리가 실려 오니 "용량이 늘어난다"고 읽기 쉽지만, 메모리 계층 관점에서는 *가장 오해하기 쉬운 유형*입니다.

호스트는 이 디바이스 메모리를 *load/store로 직접 건드릴 수 있습니다*. 여기까지는 Type 3와 같습니다. 다른 건 그다음입니다. Type 2의 메모리는 *가속기가 쓰려고 들고 온 메모리*이고, 호스트와 디바이스가 *양방향으로 캐시를 공유*하기 때문에 *누가 지금 이 영역의 주인인가*를 계속 협상해야 합니다. Ch 10에서 본 *Host Bias / Device Bias 전환*이 그 협상입니다. Device Bias 구간에서 호스트가 끼어들면 *BISnp가 뒤따르고*, 그만큼 비용이 붙습니다.

두 번째 함정은 대역폭입니다. Ch 9의 가정 시스템에서 가속기 보드의 HBM은 *192 GB @ 8 TB/s*였지만, 호스트가 같은 HBM을 *PCIe 5.0 x16 링크 너머로* 읽을 때의 실측 처리량은 *50~58 GB/s* 구간입니다. *같은 물리 메모리인데 가속기 자신이 보는 대역폭과 호스트가 보는 대역폭이 두 자리수 차이*가 납니다.

| 보는 주체 | 경로 | 실효 대역폭 |
|----------|------|-----------|
| 가속기 자신 | on-package HBM 스택 | 8 TB/s (Ch 9 가정 구성) |
| 호스트 | CXL 링크 → 디바이스 메모리 | 50~58 GB/s (PCIe 5.0 x16 실측 구간) |

그래서 "*Type 2 카드를 꽂았으니 HBM 192 GB가 내 메모리 풀에 추가됐다*"는 계산은 성립하지 않습니다. 그 메모리는 *가속기가 tight loop을 돌 때 8 TB/s로 쓰라고 있는 것*이고, 호스트가 대량으로 퍼 나르는 순간 *링크가 병목*이 됩니다. 호스트 워킹셋을 담을 자리로는 Type 3 카드가 맞고, Type 2의 메모리는 *가속기 워크로드가 그 안에서 끝날 때* 값을 합니다.

정리하면 Type 2를 사는 이유는 *메모리가 필요해서가 아니라 연산이 필요해서*입니다. 메모리는 그 연산을 먹이기 위해 딸려 오는 것이고, 계층표에서는 *호스트 tier가 아니라 가속기 tier*에 놓입니다.

## Type 1 — 용량은 한 바이트도 안 는다

Type 1은 *자체 메모리가 없는 가속기*입니다. NIC·DPU·HBA 계열이 후보로 거론되며, 하는 일은 *호스트 메모리를 coherent하게 캐시*해서 PCIe 라운드트립을 줄이는 것입니다.

메모리 계층 관점에서 Type 1은 *tier를 더하지 않습니다*. 오히려 방향이 반대입니다. 디바이스가 *호스트 DDR의 hot region을 자기 쪽으로 당겨* 캐시하므로, 계층에 새 단이 생기는 게 아니라 *기존 DDR 앞에 원격 캐시가 하나 붙는* 그림입니다. 늘어나는 것은 용량이 아니라 *특정 접근 패턴의 실효 지연*입니다.

그래서 Type 1은 이 시리즈의 관심사인 *용량·대역폭 병목*과는 사실상 무관합니다. 라우팅 테이블이나 flow state처럼 *작고 반복 접근되는 메타데이터*가 있을 때 값을 하고, 그 판단은 *메모리 계층이 아니라 워크로드의 캐시 히트율*에서 나옵니다. 후보 제품군과 CXL.cache 양산 현황은 [CXL 4.0 Internals Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)에 있습니다.

## 호스트에 어떻게 보이나 — NUMA 노드가 되는 유형과 아닌 유형

유형 차이는 *운영체제가 그 메모리를 어떤 물건으로 취급하는가*에서 가장 뚜렷하게 드러납니다.

| 유형 | 호스트에 보이는 형태 | 배치 결정 주체 |
|------|-------------------|--------------|
| Type 3 (System RAM 모드) | CPU가 붙지 않은 *메모리 전용 NUMA 노드* | 커널 (NUMA balancing, promotion·demotion) |
| Type 3 (DAX 모드) | `/dev/dax*` 캐릭터 디바이스. 노드로 안 잡힘 | 애플리케이션이 명시적으로 mmap |
| Type 2 | 디바이스 메모리 영역은 HDM으로 매핑되나 *vendor 드라이버·Bias 정책*에 종속 | 가속기 런타임 |
| Type 1 | *메모리로는 보이지 않음*. 기존 PCI 디바이스로만 등장 | 해당 없음 |

Ch 9에서 본 두 모드(System RAM·DAX)는 *Type 3에만 의미가 있는 선택지*입니다. 자동 tiering에 맡기려면 System RAM 모드로 노드를 만들고, 어떤 데이터를 CXL에 둘지 애플리케이션이 직접 정하려면 DAX로 씁니다.

현장에서 유형을 확인할 때 쓰는 명령은 다음과 같습니다.

```bash
numactl --hardware   # CXL 영역이 별도 노드로 잡혔는지
daxctl list          # System RAM 대신 DAX로 노출된 경우
cxl list -DT         # decoder와 target 매핑 확인
```

`numactl --hardware`에 *CPU 없는 노드*가 하나 늘었다면 Type 3가 System RAM으로 올라온 것이고, 아무 노드도 늘지 않았는데 `cxl list`에는 디바이스가 보인다면 *DAX이거나 가속기 쪽 메모리*입니다. 드라이버 바인딩과 sysfs 트리 구조 자체는 [CXL 4.0 Internals Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)에서 유형별로 정리합니다.

## 대역폭·지연이 유형별로 다른 이유

링크는 같은데 특성이 갈리는 이유는 단순합니다. *데이터가 어디 있고, 누가 캐시하며, 링크를 몇 번 건너는가*가 다르기 때문입니다.

| 유형 | 링크를 건너는 것 | 전송 단위 | 병목이 생기는 지점 |
|------|---------------|----------|-----------------|
| Type 1 | 호스트 DRAM의 hot line | 64 B | 디바이스 캐시 미스율. 미스마다 호스트 왕복 |
| Type 2 (compute phase) | 거의 없음 (Device Bias) | — | 없음. 가속기가 자기 HBM에서 자족 |
| Type 2 (data phase) | 가속기 메모리 ↔ 호스트 | 4 KB~ | 링크 대역폭. 8 TB/s 스택이 링크 뒤에 갇힘 |
| Type 3 (read-heavy) | 캐시 미스된 라인 전부 | 64 B | 링크 왕복 지연. 미스마다 150~300 ns |
| Type 3 (write-heavy) | 쓰기 라인 | 64 B | 상대적으로 완만. write buffer가 흡수 |

Type 3에서 *지연이 곧 성능*인 이유가 여기 있습니다. 호스트 캐시에서 빠지는 순간 무조건 링크를 건너야 하고, 그 왕복이 그대로 명령어 지연에 얹힙니다. 반대로 Type 2는 *Device Bias 구간에서 링크 트래픽이 거의 0*이라 링크 사양이 성능을 좌우하지 않습니다. 같은 카드라도 *phase에 따라 완전히 다른 프로파일*이 나옵니다.

## 자주 하는 실수

### "Type 2 가속기를 꽂으면 그 HBM만큼 메모리가 늘어난다"

*호스트 입장에서는 늘어난다고 보기 어렵습니다*. 접근은 되지만 *링크 대역폭이 상한*이고 *Bias 협상 비용*이 붙습니다. 가속기가 8 TB/s로 쓰라고 있는 메모리를 호스트가 50~58 GB/s 경로로 퍼 나르면 *가속기 성능까지 같이 떨어집니다*. 호스트 워킹셋을 담을 자리는 Type 3입니다.

### "Type 1도 CXL이니 메모리 확장에 도움이 된다"

*전혀 도움이 되지 않습니다*. Type 1은 자체 메모리가 없습니다. 용량은 그대로이고, 바뀌는 것은 *디바이스가 호스트 메모리에 접근하는 지연*뿐입니다. 용량 문제를 Type 1으로 풀려는 시도는 출발부터 어긋납니다.

### "Type 3면 DDR 슬롯을 늘린 것과 같다"

*지연이 다릅니다*. Ch 9의 실측 구간에서 local DDR5가 80~100 ns인 데 비해 direct attached Type 3는 170~220 ns입니다. hot·cold 분리 없이 워킹셋 전체를 CXL 노드에 올리면 *용량은 해결되고 성능은 무너집니다*. NUMA balancing이나 DAX 배치로 *cold 데이터만 내려보내는 설계*가 전제입니다.

### "용량이 큰 카드를 고르면 tier 설계가 끝난다"

*배치가 남아 있습니다*. 같은 카드도 direct attach·switch 경유·pooled fabric에서 지연이 170~220 ns에서 400~600 ns까지 벌어집니다. *용량을 키우려고 switch를 한 단 넣는 결정*이 곧 *tier를 한 칸 내리는 결정*입니다.

### "유형만 알면 Linux에서 어떻게 보일지 예측된다"

*Type 3만 예측 가능합니다*. Type 3는 NUMA 노드나 DAX 둘 중 하나로 정해집니다. Type 2는 *vendor 드라이버가 어떻게 노출하느냐*에 달렸고, Type 1은 메모리로는 아예 등장하지 않습니다. 운영 계획은 *유형이 아니라 실제 sysfs·numactl 출력*을 보고 세워야 합니다.

## 정리

- CXL 세 유형은 *메모리 계층에서 대등하지 않습니다*. 용량을 늘려 주는 것은 사실상 *Type 3 하나*입니다.
- *Type 3*는 Ch 9의 계층표에 *지연 150~300 ns, 대역폭 30~120 GB/s, 용량 256 GB~2 TB*의 tier를 그대로 얹습니다.
- *Type 2*의 메모리는 *가속기가 쓰려고 들고 온 것*입니다. 호스트는 접근할 수 있지만 *링크 대역폭이 상한*이고 *Bias 협상 비용*이 붙습니다.
- *Type 1*은 자체 메모리가 없어 *용량이 전혀 늘지 않습니다*. 계층에 tier를 더하는 게 아니라 *기존 DDR 앞에 원격 캐시를 붙이는* 구조입니다.
- 호스트에 보이는 모습도 갈립니다. Type 3만 *NUMA 노드 또는 DAX*로 예측 가능하게 등장하고, Type 2는 드라이버에, Type 1은 메모리와 무관합니다.
- 유형별 트래픽 차이는 *어디에 데이터가 있고 링크를 몇 번 건너는가*에서 나옵니다. Type 3는 *미스마다 링크 왕복*, Type 2는 *Device Bias 구간에 링크 트래픽 거의 0*입니다.
- 같은 Type 3 카드도 *direct attach 170~220 ns에서 pooled fabric 400~600 ns*까지 벌어지므로, 유형 선택 다음에 오는 결정은 *배치*입니다.

## 다음 편

[Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)에서는 *카드 한 장*에서 *데이터센터 전체 토폴로지*로 시야를 넓힙니다. 이 장에서 미룬 *배치에 따른 지연 차이*가 CXL Switch·Pooling·Fabric에서 어떻게 벌어지는지, 그리고 *시리즈 마무리*까지 다룹니다.

## 관련 항목

- [Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — 이 장이 기준으로 삼은 계층표와 지연·대역폭 실측
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol) — Type 2의 Bias 전환과 BISnp 동작
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric) (다음 편)
- [CXL 4.0 Internals Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD](/blog/embedded/hardware/cxl/chapter02-system-architecture) — 프로토콜 조합으로 정의되는 *분류 체계 자체*, 유형별 제품군, MLD·MH-MLD·Bundled Port 같은 multi-host 변형
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
