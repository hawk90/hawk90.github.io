---
title: "Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유"
slug: "embedded/hardware/cxl/chapter04-pooling-gfam"
date: 2026-05-16T09:04:00
description: "CXL 2.0 pooling, CXL 3.x fabric, GFAM (Global Fabric Attached Memory)."
series: "CXL 4.0 Internals"
seriesOrder: 4
tags: [cxl, memory-pooling, gfam, fabric, fabric-manager]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL은 *단계적으로 multi-host 메모리 공유*를 넓혀 왔습니다."** — *2.0 pooling*은 영역마다 host 하나가 쓰는 *pooled memory*, *3.0*은 여러 host가 한 영역을 동시에 쓰는 *Shared FAM*과 *fabric*, 그리고 PBR로 더 크게 확장하는 *G-FAM*입니다. *Fabric Manager*와 *PBR(Port Based Routing)*이 그 메커니즘입니다.

[Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)·[Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 *디바이스 분류와 일관성*을 봤습니다. 이 장은 *디바이스 한 대*에서 *데이터센터 전체 토폴로지*로 시야를 확장합니다. 규격 인용은 [CXL 3.1](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf) 기준입니다.

## 토폴로지 진화 단계

서버마다 DRAM을 꽉 채워 두면, 어떤 서버는 메모리가 남고 어떤 서버는 모자라도 서로 빌려줄 수 없습니다. 아파트마다 개별 창고를 두는 대신 단지 공용 창고를 두면 낭비가 줄어드는 것과 같은 동기입니다. CXL은 이 공용 창고를 *세 단계*로 넓혔습니다.

| 단계 | CXL 버전 | 토폴로지 | 규격의 근거 |
|------|---------|---------|------|
| **Direct Attach** | 1.1 | 호스트 1 ↔ 디바이스 1 | — |
| **Switching·Pooling** | 2.0 | 호스트 N ↔ single-level switch ↔ 디바이스 | §1.4.1: single-level switching, fan-out, 여러 virtual hierarchy에 걸친 pooling |
| **Fabric** | 3.0 / 3.x | 호스트 N ↔ multi-level switch ↔ 디바이스 M | §1.4.1: 최대 4K 포트의 multi-level switching, non-tree 토폴로지, 공유 메모리 |

## CXL 2.0 Switching — Fan-out

CXL 2.0의 *single-level switch*는 *host 포트 하나* 아래에 *여러 CXL 디바이스*를 붙이는 fan-out을 만듭니다(§1.4.1, Figure 1-2). QEMU 게스트에 switch 하나와 Type 3 두 대를 붙여 Linux가 이 구조를 어떻게 보는지 확인했습니다. 다음은 `cxl list -vvv` 출력에서 port 계층만 남긴 것입니다.

```json
"ports:root0":[ { "port":"port1", "host":"pci0000:0c", "depth":1, "nr_dports":1,
  "ports:port1":[ { "port":"port2", "host":"0000:0d:00.0", "depth":2, "nr_dports":2,
    "dports":[ { "dport":"0000:0e:00.0", "id":0 }, { "dport":"0000:0e:01.0", "id":1 } ],
    "endpoints:port2":[
      { "endpoint":"endpoint4", "host":"mem1", "parent_dport":"0000:0e:01.0", "depth":3 },
      { "endpoint":"endpoint3", "host":"mem0", "parent_dport":"0000:0e:00.0", "depth":3 } ] } ] } ]
```

`port2`가 switch upstream port(`0d:00.0`)이고, downstream port 두 개(`0e:00.0`, `0e:01.0`) 아래에 memdev가 하나씩 매달려 있습니다. 같은 게스트의 `numactl -H`는 node 0(1964 MB)과 CPU 없는 node 1(0 MB) 두 개를 보여 줬습니다. node 1은 장치 두 대가 아니라 CEDT의 CFMWS window 하나에서 나왔습니다. v6.12 `drivers/acpi/numa/srat.c:543-556`은 SRAT에 없는 CFMWS 범위마다 NUMA node를 만들고, region을 commit하기 전까지 그 node에는 메모리가 없습니다([Bootloader Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)와 같은 관찰).

## CXL 2.0 Pooling — Multi-Host LD

Pooling에서는 같은 물리 디바이스의 서로 다른 영역을 host별로 전용 할당합니다. 공유 오피스 건물에서 회사마다 다른 호실을 쓰는 것과 같고, 한 호실을 여러 회사가 같이 쓰는 것(Shared FAM)과는 다릅니다.

| 요소 | 의미 |
|------|------|
| Logical Device (LD) | Type 3 MLD의 *격리된 분할 단위*, 최대 16개 (§2.4) |
| LD-ID | CXL.io·CXL.mem 요청과 응답에 실리는 16-bit 식별자 (§2.4.1) |
| 전용 할당 | pooled 영역은 host interface 하나에 전용 (§2.4.3) |
| 재할당 | §1.4.1: 자원을 한 도메인에서 off-line하고 다른 도메인에서 on-line해 virtual hierarchy 사이에 시분할 |

§1.4.1의 표현이 핵심입니다. 재할당은 "off-line 후 on-line"이라는 두 단계이고, 그 사이에는 host 쪽에서 메모리를 비우는 일이 있어야 합니다. 2 TB 장치를 512 GB LD 4개로 나눈 예로 단계를 정리하면 다음과 같습니다.

| 단계 | LD0의 예 | host 쪽에서 끝나 있어야 하는 일 |
|---|---|---|
| 사용 중 | Host A에 bind | — |
| 반환 준비 | A가 사용을 중지 | 해당 메모리 offline·unmap |
| 회수 | FM이 Unbind vPPB | switch가 명령 옵션에 따라 Managed 또는 Surprise Hot-Remove를 시작 (§7.6.6.6) |
| 새 배정 | FM이 Host C 쪽 VCS로 Bind vPPB | host가 이미 부팅했으면 switch가 Managed Hot-Add를 시작할 수 있음 (§7.6.6.5) |

bind/unbind 명령은 [Ch 13](/blog/embedded/hardware/cxl/chapter13-switching-fabric)에서 opcode까지 다룹니다.

## CXL 3.0 Fabric — Coherent Multi-Host

CXL 3.0은 여러 host가 같은 영역에 접근하는 Shared FAM과 fabric을 더했습니다(§1.4.1). 다만 Shared 영역에 hardware coherence가 자동으로 붙지는 않습니다. §2.4.4는 영역마다 FM이 hardware 또는 software 일관성 모델을 지정한다고 씁니다.

| 구성 요소 | 역할 |
|---------|------|
| Multi-level Switch | PBR로 라우팅, multi-hop fabric |
| Fabric Manager | 재구성이 필요한 때를 판단하고 FM API 명령을 내림 (§7.6.1) |
| Shared FAM | 여러 host가 *한 HDM 영역에 동시 접근* (§2.4.3) |
| BISnp | HDM-DB 영역에서 device가 host cache를 snoop·무효화 |

기존 2.0과의 차이:

| 항목 | 2.0 Pooling | 3.0 Fabric |
|------|------------|-----------|
| 공유 모델 | 영역마다 host 하나 (pooled) | 여러 host가 한 영역 (Shared FAM) 추가 |
| Coherency | 단일 host | Shared HDM-DB는 hardware 또는 software 모델 |
| Routing | HBR (Hierarchy Based Routing) | PBR (Port Based Routing) 추가 |
| 토폴로지 | single-level | multi-level, non-tree 가능 |

## GFAM — Global Fabric Attached Memory

규격은 여러 host를 지원하는 장치의 HDM을 *FAM(Fabric-Attached Memory)*이라 부릅니다. LD로 노출하면 *LD-FAM*, *PBR 링크를 써서 더 확장성 있게* 노출하면 *G-FAM(Global-FAM)*입니다(§2.4.3).

| 특성 | 의미 |
|------|------|
| 접근 | G-FAM 디바이스(GFD)는 여러 host·peer의 요청을 받고, 요청의 *Source PBR ID(SPID)*로 누구의 요청인지 구분 (§2.4.3) |
| 공유 형태 | LD-FAM처럼 pooled FAM, Shared FAM, 또는 둘 다 지원 (§2.8) |
| 용량 관리 | Dynamic Capacity 메커니즘에만 의존 (§2.8) |
| 연결 | PBR 링크로 CXL fabric에 연결되는 Type 3 장치 (§2.8) |

## PBR — Port-Based Routing

트리형 PCIe 계층은 우편번호가 시·구·동 순서로만 내려가는 주소 체계와 같습니다. 옆 동네로 가려면 위로 올라갔다 내려와야 합니다. PBR은 각 목적지에 고유 번호(PID)를 붙이고 switch마다 라우팅 표를 두어, 트리를 벗어난 경로도 쓸 수 있게 합니다.

| 라우팅 | 방식 | 적용 |
|--------|------|------|
| HBR | 계층 구조 기반 | 트리형 토폴로지 |
| PBR | PBR ID(SPID·DPID) + 라우팅 테이블 | 다단계 fabric |

§7.7.5는 PBR switch를 쓰는 fabric 토폴로지가 *정해져 있지 않다*고 씁니다. deadlock-free routing을 찾을 수 있으면 어떤 토폴로지든 되고, 예로 PCIe 같은 tree, fat tree(folded Clos), mesh, ring, star, linear, butterfly, HyperX와 그 혼합·다차원 변형을 듭니다. Figure 7-43의 fully connected mesh(1차원 HyperX)에서는 같은 switch에 붙은 장치끼리는 switch 한 번, 다른 switch 사이는 두 번만 거치도록 FM이 라우팅 표를 짤 수 있습니다.

## Fabric Manager: 논리적 관리와 실제 transport

지금까지 본 pooling에는 *누가 LD를 어느 host에 붙일지 정하는가*라는 빈칸이 있습니다. 그 자리를 채우는 것이 *Fabric Manager (FM)*입니다.

§7.6.1은 FM을 *재구성이 필요한 시점을 정하고 구성 명령을 내리는 논리적 프로세스*로 정의합니다. 형태는 정해져 있지 않습니다. host에서 도는 소프트웨어, BMC의 embedded software, 다른 CXL 디바이스나 switch의 펌웨어, 디바이스 안의 state machine 어느 것이든 될 수 있습니다.

§7.6.2에 따르면 FM은 *FM API* 명령 세트(§8.2.9.10)를 CCI로 보내고, CCI는 장치의 Mailbox 레지스터(§8.2.8.4)나 MCTP-capable interface로 노출됩니다. FM API가 CCI로 전달되는 경로와 bind·unbind 흐름은 [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric#fabric-manager)에서 다룹니다.

## 운영 사례 — hyperscale 연구

CXL 메모리 풀링·tiering을 다룬 대표 연구는 둘 다 ASPLOS '23에 실렸습니다.

| 연구 | 내용 |
|------|------|
| [Pond](https://arxiv.org/abs/2203.00241v4) (ASPLOS '23, DOI 10.1145/3575693.3578835) | 클라우드 운영 trace 분석에서 8~16 소켓 범위의 풀링만으로 이득의 대부분을 얻는다고 보고하고, 158개 workload 평가에서 DRAM 비용 7% 절감, 같은 NUMA node 할당 대비 성능 차이 1~5% 이내를 보고합니다. |
| [TPP](https://arxiv.org/abs/2206.02878v2) (ASPLOS '23, DOI 10.1145/3582016.3582063) | OS 수준 hot/cold 페이지 배치. Meta 서버 fleet의 사용 패턴을 분석하고, CXL 1.1을 지원하는 x86 CPU 초기 샘플로 운영 fleet에서 평가해 기존 Linux보다 18%, NUMA Balancing·AutoTiering 등보다 5~17% 낫다고 보고합니다. 패치 대부분이 Linux v5.18에 병합됐습니다. |

수치는 논문 abstract에 적힌 것이고, 논문의 장치·정책·workload 조건에서 나온 값입니다. 세부 비용·수요 모델은 [HBM Ch 12](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)에서 다룹니다.

## Composability — 데이터센터 비전

§1.4.1은 3.0의 fabric이 rack·pod 수준까지 넓어지고, 2.0부터 자원(메모리·가속기)을 한 도메인에서 off-line해 다른 도메인에서 on-line할 수 있다고 씁니다. 렌터카 회사가 지점마다 차를 고정 배치하지 않고, 수요에 따라 지점 사이로 차를 옮기는 것과 비슷합니다.

이 그림이 성립하려면 세 가지가 함께 있어야 합니다. 경로를 제공하는 fabric(PBR switch), 언제 무엇을 옮길지 정하는 FM, 그리고 메모리를 off-line·on-line하는 host OS입니다.

## 자주 하는 실수

### "CXL 2.0 pooling = CXL 3.0 fabric"

*다릅니다*. 2.0 pooling은 영역마다 *host 하나*입니다. 3.0은 여러 host가 *한 영역에 동시 접근*하는 Shared FAM과 PBR fabric을 더했습니다.

### "GFAM은 멀티 host가 자유롭게 read/write"

일관성 모델에 달렸습니다. FM이 Shared HDM-DB 영역마다 *hardware coherency*(MemWr의 SnpType을 No-Op으로 두고 소유권을 먼저 얻는 2단계 write) 또는 *software-managed coherency*를 지정합니다(§2.4.4). software 모델에서는 caching agent의 clean writeback이 다른 host의 갱신을 덮어쓸 수 있어서, 범위에 접근하는 모든 agent에 *No Clean Writebacks* bit가 서 있어야 신뢰할 수 있는 결과가 나온다고 §2.4.4는 씁니다.

### "Fabric Manager는 별도 장비다"

§7.6.1의 정의상 FM은 논리 프로세스이고, host 소프트웨어·BMC·switch 펌웨어·장치 내부 state machine 어느 형태든 됩니다.

### "PBR fabric은 정해진 토폴로지만 된다"

§7.7.5는 PBR fabric 토폴로지를 *정해 두지 않습니다*. *deadlock-free routing을 찾을 수 있는 토폴로지*면 됩니다.

### "장치 하나를 붙이면 NUMA node가 하나 생긴다"

QEMU 게스트에서는 Type 3 두 대를 붙였지만 CXL 쪽 NUMA node는 하나였습니다. node를 만든 것은 장치가 아니라 CFMWS window였습니다(`srat.c:543-556`).

## 정리

- CXL은 *Direct → Switching → Fabric*의 *3단계*로 *single device에서 rack·pod 수준*까지 넓어졌습니다(§1.4.1).
- *CXL 2.0 switching·pooling*은 *LD 단위로 영역을 host에 배정*하고, 재할당은 off-line 후 on-line입니다.
- *CXL 3.0*은 *Shared FAM*과 *PBR fabric*을 더했습니다. HBR은 Hierarchy Based Routing, PBR은 Port Based Routing입니다.
- *G-FAM*은 PBR 링크로 확장성 있게 노출한 FAM이고, 용량은 Dynamic Capacity로만 관리합니다(§2.8).
- PBR fabric 토폴로지는 *deadlock-free routing*만 찾으면 자유롭습니다(§7.7.5).
- QEMU 게스트의 CXL NUMA node는 장치 수가 아니라 CFMWS window 수를 따랐습니다.
- 공개 연구로는 Pond(풀링 비용 절감)와 TPP(OS 수준 tiering)가 있습니다.

## 다음 편

[Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *CXL 4.0이 3.x 위에 더한 운용 기능*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric) — Switch 내부 동작과 FM 통신 프로토콜
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 §1.4.1·§2.4·§2.8·§7.6·§7.7.5, Pond·TPP 논문(ASPLOS '23, arXiv abstract와 Crossref 메타데이터 대조), Linux v6.12 `drivers/acpi/numa/srat.c`와 QEMU 11.1.3 게스트의 `cxl list`·`numactl` 출력을 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
