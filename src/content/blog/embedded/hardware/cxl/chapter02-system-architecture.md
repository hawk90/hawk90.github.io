---
title: "Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD"
slug: "embedded/hardware/cxl/chapter02-system-architecture"
date: 2026-05-16T09:02:00
description: "CXL 디바이스 분류와 multi-LD·multi-head 구조."
series: "CXL 4.0 Internals"
seriesOrder: 2
tags: [cxl, cxl-type, mld, mh-mld, bundled-port]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **Type 1·2·3는 프로토콜 조합의 분류이고, SLD·MLD·multi-headed는 논리 분할과 연결 구조의 분류입니다. 이들을 서로 배타적인 다섯 타입으로 세지 않습니다.**

[Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position)에서 *세 프로토콜과 backward-compatible한 세대 진화*를 봤습니다. 이 장은 *디바이스 측 분류*입니다. 프로토콜 type과 논리 분할·head·영역 공유를 별도 축으로 읽습니다. 자동차로 치면 Type은 "엔진 종류(가솔린·하이브리드·전기)"이고, MLD·multi-headed는 "좌석 배치(1인승·카풀·버스)"입니다. 기본 정의는 [CXL 3.1 §2.1~2.6](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)을 기준으로 합니다.

## 세 가지 기본 유형

CXL은 *지원하는 프로토콜 조합*으로 *디바이스를 3가지 type*으로 분류합니다.

| Type | 프로토콜 | 장치 쪽 메모리 | 핵심 능력 |
|------|---------|------------|----------|
| **Type 1** | CXL.io + CXL.cache | host에 노출하지 않음. private device-attached memory는 선택 (Figure 2-2) | host 메모리를 *coherent 캐시* |
| **Type 2** | CXL.io + CXL.cache + CXL.mem | DDR·HBM 등 (§2.2) | host와 *양방향 cache-coherent 공유* |
| **Type 3** | CXL.io + CXL.mem | 메모리 기술에 독립적 (§2.3) | *host에 메모리 노출* |

CXL.io는 *모든 유형 필수*입니다. 다른 두 프로토콜은 *디바이스 사용 모델에 따라 선택*입니다. 자세한 동작은 [Ch 6 CXL.io](/blog/embedded/hardware/cxl/chapter06-cxl-io)·[Ch 7 CXL.cache](/blog/embedded/hardware/cxl/chapter07-cxl-cache)·[Ch 8 CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 봅니다.

### Type 1 — 캐시를 가진 디바이스

host에 CXL.mem HDM을 제공하지 않고 CXL.cache를 사용하는 디바이스입니다. §2.1은 표준 Producer-Consumer ordering 모델이 잘 맞지 않는 장치를 대상으로 들고, 예로 PCIe 표준 atomic에 없는 *복잡한 atomic 연산*이 필요한 가속기를 듭니다. 같은 절은 이런 장치가 *작은 용량의 캐시*만 필요하고, 지원할 수 있는 캐시 크기는 *host의 snoop filter 용량*에 달려 있다고 씁니다.

### Type 2 — Accelerator with Memory

*자체 메모리를 가진 가속기*입니다. §2.2는 예로 GDDR을 단 GPGPU를 들면서, 기존에는 이런 장치 메모리가 host에서 보이지 않고 일관성도 없는 PDM(Private Device Memory)이었다고 설명합니다. 그 결과 operand를 넣고 결과를 꺼낼 때마다 host 메모리와 장치 메모리 사이에 대역폭이 큰 복사가 오갔습니다. CXL의 목표는 host가 장치 메모리에 operand를 밀어 넣고 결과를 끌어오는 비용을 줄이는 것입니다.

Type 2의 HDM 일관성은 두 방법으로 풉니다(§2.2). CXL.cache를 쓰는 *HDM-D*와 CXL.mem의 Back-Invalidate Snoop 채널을 쓰는 *HDM-DB*입니다. [Ch 3 메모리 일관성](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 본격 분해합니다.

### Type 3 — Memory Expander

CXL.io와 CXL.mem을 지원하는 디바이스입니다(§2.3). host 메모리에 대해 동작하는 가속기가 아니므로 *CXL.cache로 요청하지 않습니다*. 대표 예는 *HDM-H 메모리 expander*이고, 수동 expander는 메모리가 host에 노출된 동안 그 내용을 직접 조작하지 않습니다(RAS·보안 요구는 예외).

Type 3도 HDM-DB 영역을 둘 수 있습니다. §2.3은 이 경우 장치 안에 *DCOH(Device Coherence engine)*가 있어야 하고, HDM-DB가 장치를 가속기처럼(예: in-memory computing) 동작하게 하며 peer의 UIO·CXL.mem 직접 접근도 가능하게 한다고 씁니다.

### 한 VH 아래 Type 1·2는 16개까지

§2.6은 한 virtual hierarchy 아래에 Type 1·Type 2 장치를 *최대 16개* 연결할 수 있다고 씁니다. 그 조건으로 Type 2는 HDM 일관성 관리에 CXL.cache 대신 CXL.mem의 BISnp 채널을 써야 합니다.

## MLD — Multi Logical Device

MLD는 *하나의 Type 3 디바이스를 최대 16개의 격리된 Logical Device로 분할*해, 하나의 공유 링크로 여러 host에 제공하는 구조입니다(§2.4). 한 건물 안을 여러 회사에 임대하는 공유 오피스와 비슷합니다. 출입구(링크)는 하나지만 각 회사(host)는 자기 사무실(LD)만 봅니다.

| 요소 | 규격의 내용 |
|------|------|
| Logical Device (LD) | VH에서 보면 Type 3 장치로 동작. MLD 하나에 host binding용 LD *최대 16개* + FM 전용 LD(FMLD) 1개 (§2.4) |
| LD-ID | 16-bit 식별자. CXL.io는 16 bit 전체를, CXL.mem은 하위 4 bit만 실어 링크당 16개를 구분 (§2.4.1) |
| FMLD | LD-ID FFFFh. FM이 LD 간 자원 배분과 공유 링크를 관리 (§2.4) |
| 대상 Type | LD-ID가 CXL.io·CXL.mem에만 있으므로 MLD는 *Type 3만* 가능 (§2.4) |

LD 자원 배분은 FM API로 구성하거나 정적으로 정해 둘 수 있고, 어느 쪽이든 결과는 MLD DVSEC에 광고됩니다(§2.4). 아래는 그 배분을 설명하기 위한 수치 예입니다.

1. Memory expander가 2 TB를 가짐
2. Fabric Manager가 512 GB × 4 LD로 분할
3. Host A·B·C에 각각 LD0·LD1·LD2 할당
4. LD3은 *미할당*으로 유지

LD를 다른 host로 옮기는 흐름은 [Ch 4 Pooling·GFAM](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)과 [Ch 13](/blog/embedded/hardware/cxl/chapter13-switching-fabric)의 bind/unbind에서 다룹니다.

## Shared FAM — 같은 영역을 다중 host 공유

규격은 여러 host를 지원하는 장치가 노출하는 HDM을 *FAM(Fabric-Attached Memory)*이라 부르고, 둘로 나눕니다(§2.4.3). HDM 영역 하나를 *host 하나에 전용*으로 주면 *pooled memory*, *여러 host가 한 영역에 동시 접근*하면 *Shared FAM*입니다. 식당으로 치면 pooled는 테이블을 손님마다 따로 주는 것이고, Shared FAM은 뷔페 테이블을 여럿이 함께 쓰는 것입니다.

| 모드 | 특성 |
|------|------|
| **Pooled memory** | 영역마다 host 하나가 *전용* |
| **Shared FAM** | 여러 host가 *한 영역에 동시 접근*. 영역마다 접근하는 host 집합이 다를 수 있음 |

Shared HDM-DB 영역의 일관성은 영역마다 FM이 두 모델 중 하나로 정합니다(§2.4.4).

- *multi-host hardware coherency* — 장치가 host별 캐시 상태를 snoop filter나 directory로 추적합니다. 이 영역에 대한 MemWr는 SnpType을 No-Op으로 둬야 하므로, host가 M2S Request로 먼저 소유권을 얻은 뒤 쓰는 *2단계*가 됩니다.
- *software-managed coherency* — 하드웨어가 추적하지 않고, 각 host의 소프트웨어가 cache line 소유권을 맞춥니다. HDM-H로 노출한 Shared FAM은 이 모델만 됩니다.

§2.4.4의 implementation note는 software 모델의 함정을 짚습니다. 하드웨어 prefetch로 읽어 온 clean line을 caching agent가 스스로 write back하면 다른 host의 갱신을 덮어쓸 수 있습니다. 그래서 host(CSDS)와 장치(DVSEC CXL Capability2)에 *No Clean Writebacks* capability bit가 있고, 범위에 접근하는 모든 agent가 이 bit를 세워야 software 모델이 신뢰할 만한 결과를 냅니다.

## Multi-Headed Device: MH-SLD와 MH-MLD

*포트(head)를 여러 개 가진 Type 3 디바이스*입니다(§2.5). 두 종류가 있습니다.

| 종류 | 각 head가 보이는 모습 |
|------|---------------------|
| MH-SLD | 모든 head가 SLD. head와 LD가 1:1 |
| MH-MLD | 어떤 head든 MLD일 수 있음. head마다 LD 1~16개. LD가 하나면 SLD로, 둘 이상이면 MLD로 보임 |

| 차이 | MLD | MH-MLD |
|------|-----|--------|
| 링크 | 하나의 공유 링크 | 여러 링크(head) |
| LD pool | 최대 16 LD | 16개를 넘을 수 있음. head별 LD-ID 0~n-1을 장치 전체 index로 매핑 (§2.5.1) |

LD는 각각 *head 하나에만* 매핑되고, MH-SLD와 MH-MLD 모두 LD 단위로 메모리 자원·상태·context·관리를 격리해야 합니다(§2.5). 디바이스 안의 모든 LD는 *LD Pool CCI*라는 관리 인터페이스로 관리합니다. LD Pool CCI는 MCTP 기반 CCI로 노출되거나, head의 Mailbox CCI를 통한 Tunnel Management Command로 접근합니다.

## Bundled Port — 4.0의 새 layer

CXL 4.0의 *Bundled Port*는 여러 물리 device port를 하나의 논리 entity로 묶는 기능입니다. 아래는 [CXL 4.0 백서](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-White-Paper_FINAL.pdf), [발표문](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-Specification-Release_FINAL_Website-Copy.pdf), [공식 Q&A](https://computeexpresslink.org/blog/introducing-the-cxl-4-0-specification-webinar-qa-recap-4386/)에 적힌 내용입니다. 4.0 규격 본문은 열람하지 않았습니다.

| 항목 | 내용 | 출처 |
|------|------|------|
| 대상 | Host와 CXL 가속기(Type 1/2) 사이의 device port | 발표문 |
| 구성 | 묶음마다 full-capability port 하나 이상 + 데이터 이동에 최적화한 Streamlined Port | 백서 |
| SLD-B | Bundled Port를 구현한 SLD. 여러 device port가 하나의 논리 port로 보임 | 백서 |
| enumeration | bus enumeration 소프트웨어에는 SLD-B 여러 개가 보이고, device driver가 이들을 한 가속기로 관리 | Q&A Q6 |
| 트래픽 | 장치가 모든 port에 트래픽을 분산. flit 하나를 여러 port로 쪼개지 않음 | Q&A Q6·Q10 |
| multi-headed | MH-SLD·MH-MLD로 확장할 계획은 현재 없음 | Q&A Q7 |

[Ch 5 CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *Bundled Port의 동작*을 더 봅니다.

## Linux 측 인식 — 유형별 path

분류가 실제 커널 객체로 어떻게 보이는지 QEMU 게스트(Debian 13 arm64, 커널 6.12.116)에서 확인했습니다. 토폴로지는 host bridge → root port → switch → Type 3 두 대(volatile 256 MiB, persistent 256 MiB)입니다. 먼저 CXL bus의 장치 목록입니다.

```bash
ls /sys/bus/cxl/devices/
cxl list -M -u
```

```text
decoder0.0  decoder1.0  decoder2.0  decoder2.1  decoder2.2  decoder2.3
decoder3.0  decoder3.1  decoder3.2  decoder3.3  decoder4.0  decoder4.1
decoder4.2  decoder4.3  endpoint3   endpoint4   mem0        mem1
nvdimm-bridge0  pmem1   port1       port2       root0
```

```json
[
  { "memdev":"mem1", "pmem_size":"256.00 MiB (268.44 MB)", "serial":"0x11",
    "host":"0000:10:00.0", "firmware_version":"BWFW VERSION 00" },
  { "memdev":"mem0", "ram_size":"256.00 MiB (268.44 MB)", "serial":"0x10",
    "host":"0000:0f:00.0", "firmware_version":"BWFW VERSION 00" }
]
```

`root0`는 ACPI CEDT에서 온 CXL root, `port1`은 host bridge, `port2`는 switch upstream port입니다. 두 Type 3는 `mem0`·`mem1` memdev와 `endpoint3`·`endpoint4`로 나타납니다(`cxl list` 출력은 줄바꿈만 줄였습니다). root decoder `decoder0.0`을 뺀 switch·endpoint decoder 13개(`decoder1.0`~`decoder4.3`)의 `target_type`은 모두 `expander`였습니다.

이 `target_type` 값은 v6.12 `drivers/cxl/core/port.c:132-144`의 `target_type_show()`가 `CXL_DECODER_DEVMEM`이면 `accelerator`, `CXL_DECODER_HOSTONLYMEM`이면 `expander`로 출력한 것입니다(enum은 `cxl.h:327-328`). 장치 쪽 분류에는 `cxlmem.h:392-395`의 `enum cxl_devtype`가 있어 `CXL_DEVTYPE_DEVMEM`(Type 2)과 `CXL_DEVTYPE_CLASSMEM`(Type 3)을 나눕니다. 다만 v6.12 `drivers/cxl/`에서 `cxlds.type`을 설정하는 곳은 `core/mbox.c:1452`의 `cxl_memdev_state_create()` 하나뿐이고, 값은 `CXL_DEVTYPE_CLASSMEM`입니다. 이 커널 판에는 Type 2를 등록하는 경로가 없습니다(6.12.116에서도 1456행 한 곳).

[Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 이 객체들이 만들어지는 probe 순서를 따라갑니다.

## 자주 하는 실수

### "Type 3는 항상 수동 메모리다"

대표 예가 HDM-H 수동 expander일 뿐입니다. §2.3은 HDM-DB로 노출하는 Type 3가 DCOH를 갖추고 in-memory computing 같은 가속기 동작과 peer의 직접 접근을 할 수 있다고 씁니다. 다만 어느 경우든 Type 3는 CXL.cache 요청을 내지 않습니다.

### "MLD와 Shared FAM은 같은 거다"

*다릅니다*. MLD는 *디바이스 형태*(한 링크로 여러 LD)이고, pooled memory와 Shared FAM은 *영역을 어떻게 나눠 주느냐*입니다(§2.4.3). pooled는 영역마다 host 하나, Shared FAM은 여러 host가 한 영역에 동시 접근합니다.

### "포트가 여러 개인 Type 3는 모두 Multi-Headed Device다"

§2.4.3은 MH-SLD·MH-MLD를 §9.11.7.2의 *임의의 multi-ported Type 3*와 구분하라고 씁니다. 후자는 하나의 OS 도메인 안의 multi-CPU 토폴로지를 지원하는 장치입니다. MH 장치는 head마다 별도 host 도메인을 두고 LD 단위로 격리합니다.

### "Bundled Port가 Multi-LD를 대체한다"

*다른 개념*입니다. Bundled Port는 *가속기의 port를 묶어 대역폭을 늘리는* 것이고, 묶음 안의 port는 각각 *SLD-B*를 노출합니다. MLD는 *한 링크로 여러 LD를 노출해 용량을 나누는* Type 3 구조입니다. Q&A Q9 답변도 Type 3 SLD 메모리 expander는 이미 interleave로 비슷한 이득을 얻는다고 설명합니다.

## 정리

- CXL 디바이스는 *프로토콜 조합*으로 *Type 1·2·3*로 나뉩니다. 캐시를 가진 디바이스, 메모리를 가진 가속기, memory expander입니다.
- 한 VH 아래 Type 1·2는 최대 16개이고, 그때 Type 2는 BISnp로 일관성을 관리합니다(§2.6).
- *MLD*는 Type 3 전용으로, 한 링크에 *FMLD + 최대 16 LD*를 노출합니다. CXL.mem은 LD-ID 하위 4 bit만 씁니다.
- FAM은 *pooled memory*와 *Shared FAM*으로 나뉩니다. Shared HDM-DB 영역은 FM이 hardware 또는 software 일관성 모델을 정합니다.
- *Multi-Headed Device*는 *head가 여러 개인 Type 3*이고, LD는 LD Pool CCI로 관리합니다.
- CXL 4.0의 *Bundled Port*는 가속기의 port를 묶어 *대역폭을 늘립니다*.
- Linux v6.12는 Type 3만 memdev로 등록하고, QEMU 게스트의 switch·endpoint decoder `target_type`은 모두 `expander`였습니다.

## 다음 편

[Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 *Type 2 가속기의 양방향 cache coherency*가 *어떻게 유지*되는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position)
- [Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)
- [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)
- [HBM·GDDR 심화 Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types) — 같은 분류를 *메모리 산업 관점*에서

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 §2.1~2.6, CXL 4.0 백서·발표문·공식 Q&A, Linux v6.12 `drivers/cxl/` 소스와 QEMU 11.1.3 게스트의 `cxl list` 출력을 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
