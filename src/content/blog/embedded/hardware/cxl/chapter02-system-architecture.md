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

[Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position)에서 *세 프로토콜과 backward-compatible한 세대 진화*를 봤습니다. 이 장은 *디바이스 측 분류*입니다. 프로토콜 type과 논리 분할·head·영역 공유를 별도 축으로 읽습니다. 기본 정의는 [CXL 3.1 §2.1~2.5](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)를 기준으로 합니다.

## 세 가지 기본 유형

CXL은 *지원하는 프로토콜 조합*으로 *디바이스를 3가지 type*으로 분류합니다.

| Type | 프로토콜 | 자체 메모리 | 핵심 능력 |
|------|---------|------------|----------|
| **Type 1** | CXL.io + CXL.cache | host에 HDM으로 노출하지 않음. private memory는 있을 수 있습니다. | host 메모리를 *coherent 캐시* |
| **Type 2** | CXL.io + CXL.cache + CXL.mem | 있음 (HBM·DRAM) | host와 *양방향 cache-coherent 공유* |
| **Type 3** | CXL.io + CXL.mem | 있음. 메모리 매체는 DRAM에 한정되지 않습니다. | *host에 메모리 노출* |

CXL.io는 *모든 유형 필수*. 다른 두 프로토콜은 *디바이스 사용 모델에 따라 선택*입니다. 자세한 동작은 [Ch 6 CXL.io](/blog/embedded/hardware/cxl/chapter06-cxl-io)·[Ch 7 CXL.cache](/blog/embedded/hardware/cxl/chapter07-cxl-cache)·[Ch 8 CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 봅니다.

### Type 1 — 캐시를 가진 디바이스

host에 CXL.mem HDM을 제공하지 않고 CXL.cache를 사용하는 디바이스입니다. private device-attached memory가 물리적으로 없다는 뜻은 아닙니다. CXL.cache로 *host 메모리를 coherent하게 캐시*합니다. CXL 1.1 규격이 드는 예는 PCIe 표준 atomic에 없는 *복잡한 atomic 연산*이 필요한 가속기입니다. 디바이스가 둘 수 있는 캐시 크기는 *host의 snoop filter 용량*에 묶입니다.

### Type 2 — Accelerator with Memory

*자체 HBM/DRAM을 가진 가속기*입니다. *host와 양방향 cache coherent*입니다.

Type 2의 *coherency가 가장 복잡*합니다. CXL.cache와 device memory coherency를 함께 구분해야 하는데 [Ch 3 메모리 일관성](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 본격 분해합니다.

### Type 3 — Memory Expander

CXL.io와 CXL.mem을 지원하고 CXL.cache로 host 메모리를 요청하지 않는 디바이스입니다. passive memory expander가 대표 예이지만, “계산 기능이 절대로 없는 DRAM 전용 장치”라는 물리적 정의는 아닙니다.

Type 3는 *CXL.cache로 요청하지 않습니다*. 메모리 영역을 *HDM-H(host-only coherent)*로 노출하면 일관성은 host 쪽 캐시 계층이 맡습니다. CXL 3.0부터는 *HDM-DB* 영역도 둘 수 있는데, 이때는 디바이스가 host의 캐시 상태를 추적하고 *Back-Invalidate Snoop*으로 무효화를 요청합니다([Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)). 단순한 HDM-H Type 3가 *가장 흔한* 형태입니다.

## MLD — Multi Logical Device

*하나의 물리 디바이스를 여러 logical device로 분할*해 host별로 할당한 LD가 같은 물리 링크를 공유하는 구조입니다. 여러 host가 각자의 LD를 사용하는 것을 시간순 독점 대여만으로 한정하지 않습니다. CXL 2.0부터 정의됐습니다.

핵심 개념:

| 요소 | 역할 |
|------|------|
| Logical Device (LD) | 디바이스 자원의 *논리적 분할 단위*. MLD 하나에 FM용 LD 하나와 *최대 16개*의 LD |
| LD-ID | 각 LD를 식별하는 ID — CXL.io와 CXL.mem 양쪽에서 씀 |
| Fabric Manager | LD를 *어느 host에 할당할지* 결정 |

운영 흐름:

1. Memory expander가 *2 TB physical capacity*를 가짐
2. Fabric Manager가 *512 GB × 4 LD*로 분할
3. Host A·B·C에 각각 LD0·LD1·LD2 할당
4. LD3은 *미할당 pool*로 유지
5. Host A의 워크로드 종료 시 *LD0 회수*, 새 워크로드에 *재할당*

위 용량 분할은 가상 예입니다. 회수·재할당에는 host의 사용 중지·매핑 정리·데이터 수명과 격리 조건이 필요하며, FM의 bind 변경만으로 사용 중인 메모리가 안전하게 옮겨지지는 않습니다. 자세한 흐름은 [Ch 4 Pooling·GFAM](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서.

## Shared FAM — 같은 영역을 다중 host 공유

규격은 여러 host에 노출되는 HDM을 *FAM(Fabric-Attached Memory)*이라 부르고, 둘로 나눕니다. HDM 영역 하나를 *host 하나에 전용*으로 주면 *pooled memory*, *여러 host가 한 영역에 동시 접근*하면 *Shared FAM*입니다.

| 모드 | 특성 | 적합 워크로드 |
|------|------|-------------|
| **Pooled memory** | 영역마다 host 하나가 *전용* | 컨테이너 host overcommit, dynamic VM 메모리 |
| **Shared FAM** | 여러 host가 *한 영역에 동시 접근* | 분산 DB·in-memory cache·shared model state |

Shared FAM의 일관성은 영역마다 FM이 두 모델 중 하나로 정합니다(CXL 3.1 §2.4.4).

- *multi-host hardware coherency* — HDM-DB 영역에서 디바이스가 host별 캐시 상태를 snoop filter나 directory로 추적합니다. 이 모드에서 write는 먼저 소유권을 얻고 나서 쓰는 *2단계*입니다.
- *software-managed coherency* — 하드웨어가 추적하지 않고, host들 사이의 일관성을 소프트웨어가 맞춥니다. HDM-H로 노출한 Shared FAM은 이 모델만 됩니다.

## Multi-Headed Device: MH-SLD와 MH-MLD

*포트(head)를 여러 개 가진 Type 3 디바이스*입니다(CXL 3.1 §2.5). 두 종류가 있습니다.

| 종류 | 각 head가 보이는 모습 |
|------|---------------------|
| MH-SLD | 모든 head가 SLD. head와 LD가 1:1 |
| MH-MLD | 어떤 head든 MLD일 수 있음. head마다 LD 1~16개 |

| 차이 | MLD | MH-MLD |
|------|-----|--------|
| 링크 | 하나의 공유 링크 | 여러 링크(head) |
| 연결 형태 | 한 링크로 여러 LD를 제공합니다. | 여러 head를 제공합니다. head별 직접 연결만 가능한 것은 아닙니다. |

LD는 각각 *head 하나에만* 매핑됩니다. 디바이스 안의 모든 LD는 *LD Pool CCI*라는 관리 인터페이스로 관리합니다. LD Pool CCI는 MCTP 기반으로 노출되거나, head의 Mailbox CCI를 통한 tunnel 명령으로 접근합니다.

## Bundled Port — 4.0의 새 layer

CXL 4.0의 *Bundled Port*는 디바이스의 *여러 port를 한 묶음으로 써 대역폭을 늘리는* 기능입니다(CXL 4.0 웨비나, 2025년 12월).

| 항목 | 내용 |
|------|------|
| 대상 | 가속기 디바이스 (Type 1·2, 가속기형 Type 3) |
| 구성 | 묶음마다 *표준 port 하나 이상* + *Streamlined Port* 여러 개. 각 port는 SLD-B를 노출 |
| Streamlined Port | 데이터 대역폭 확장용, 면적·전력 최적화, 256B flit 모드만 |
| 기존 소프트웨어 | 각 port를 *따로* enumerate하고 관리할 수 있음 |
| 묶음 활용 | 포트 간 트래픽 interleave 같은 기능에는 *새 소프트웨어*가 필요 |
| HDM 용량 | 묶음 전체 용량은 각 port의 용량 합 |

[Ch 5 CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *Bundled Port의 동작*을 더 봅니다.

## Linux 측 인식 — 유형별 path

이 절의 소스 기준은 Linux v6.12입니다. `drivers/cxl/pci.c`의 PCI driver, `mem.c`와 `core/`의 장치·decoder·region 관리를 구분해서 읽습니다. 장치 디렉터리의 존재만으로 Device DAX나 System RAM 노출이 완료된 것은 아닙니다.

```bash
ls /sys/bus/cxl/devices/
cxl list -M
```

위 명령은 실제 Linux 대상에서 상태를 읽는 예이며 이 글에서 캡처한 출력은 아닙니다. 이름·개수는 구성에 따라 다르고 region은 firmware가 이미 구성했을 수도 있습니다. 이 판의 `drivers/cxl/cxl.h`에는 decoder target 분류인 `CXL_DECODER_DEVMEM`과 `CXL_DECODER_HOSTONLYMEM`이 있지만, 이것이 `CXL_DEVTYPE_DEVMEM`이라는 Type 2 memdev 등록 API를 뜻하지는 않습니다. 그런 API로 모든 Type 2가 generic CXL memdev에 등록된다는 기존 설명은 사용하지 않습니다.

[Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 실제 버전의 driver binding과 sysfs를 따로 추적합니다. Type 1에 generic memory region이 없다는 점과 PCI 장치로 발견되지 않는다는 주장은 다릅니다.

## 자주 하는 실수

### "Type 3 = Type 2의 단순 버전"

*디바이스 구현은 그렇지만 운영은 다릅니다*. Type 3는 *대량 메모리 관리·tiered memory·NUMA 통합*이 복잡. Type 2는 *coherency가 복잡한 대신 사용 패턴이 명확*(GPU 같은 compute). *운영 복잡도가 디바이스 복잡도와 일치하지 않습니다*.

### "MLD와 Shared FAM은 같은 거다"

*다릅니다*. MLD는 *디바이스 형태*(한 링크로 여러 LD)이고, pooled memory와 Shared FAM은 *영역을 어떻게 나눠 주느냐*입니다. pooled는 영역마다 host 하나, Shared FAM은 여러 host가 한 영역에 동시 접근합니다.

### "MH-MLD는 한 host 다운 시 다른 host도 함께 죽는다"

규격의 per-LD 자원·상태·관리 격리와 물리 디바이스 전체의 장애 독립성은 다릅니다. LD는 head 하나에 매핑되지만 공유 전원·controller나 전체 device 오류가 없어진다는 보장은 아닙니다.

### "Bundled Port가 Multi-LD를 대체한다"

*다른 개념*입니다. Bundled Port는 *가속기 디바이스의 port를 묶어 대역폭을 늘리는* 것이고, 묶음 안의 port는 각각 *SLD-B(Single Logical Device)*를 노출합니다. MLD는 *한 링크로 여러 LD를 노출해 용량을 나누는* 것입니다.

## 정리

- CXL 디바이스는 *프로토콜 조합*으로 *Type 1·2·3*. *캐시를 가진 디바이스·메모리 가진 가속기·memory expander*입니다.
- *MLD*는 한 링크로 *FM용 LD + 최대 16 LD*를 노출합니다.
- FAM은 *pooled memory*(영역마다 host 하나)와 *Shared FAM*(여러 host 동시 접근)으로 나뉩니다. Shared FAM의 일관성은 *하드웨어(HDM-DB)* 또는 *소프트웨어* 모델입니다.
- *Multi-Headed Device*는 *head가 여러 개인 Type 3*이고, LD는 LD Pool CCI로 관리합니다.
- CXL 4.0의 *Bundled Port*는 표준 port와 Streamlined Port를 묶어 *대역폭을 늘립니다*.
- Linux 장치·decoder·region의 존재와 메모리 사용 가능 상태를 구분합니다. 지원하지 않는 Type 2 등록 API를 가정하지 않습니다.

## 다음 편

[Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 *Type 2 가속기의 양방향 cache coherency*가 *어떻게 유지*되는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position)
- [Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)
- [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)
- [HBM·GDDR 심화 Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types) — 같은 분류를 *메모리 산업 관점*에서

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 §2.1~2.5, CXL 4.0 공개 소개 자료와 Linux v6.12 `drivers/cxl/` 소스를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
