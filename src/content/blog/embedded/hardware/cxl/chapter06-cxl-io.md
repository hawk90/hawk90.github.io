---
title: "Ch 6: CXL.io — PCIe와의 차이·DOE·DVSEC"
slug: "embedded/hardware/cxl/chapter06-cxl-io"
date: 2026-05-16T09:06:00
description: "CXL.io 프로토콜의 PCIe 호환성과 CXL 고유 확장."
series: "CXL 4.0 Internals"
seriesOrder: 6
tags: [cxl-io, pcie, dvsec, doe, uio]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL.io는 PCIe의 enumeration·configuration·MMIO·DMA·오류 보고를 그대로 씁니다."** — 여기서는 CXL DVSEC의 기능 발견과 DOE의 데이터 객체 교환을 다룹니다. DVSEC와 DOE 자체는 PCIe가 정의한 메커니즘이며 CXL 전용 기능은 아닙니다. CXL 1.1부터 정의됐고 *모든 CXL 디바이스에 필수*입니다.

[Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *CXL 4.0의 새 기능*을 봤습니다. 이 장부터 *프로토콜 별 본격 분해*입니다. *CXL.io는 가장 기본·필수*인 프로토콜로, *전체 CXL 디바이스의 출발점*입니다.

## CXL.io가 하는 일

CXL.io는 *PCIe 시맨틱*을 그대로 가져와 *디바이스 발견·설정·DMA*를 담당합니다.

| 역할 | 의미 |
|------|------|
| Discovery·Enumeration | host가 *어떤 디바이스가 어디 있나* 발견 |
| Configuration | config space 읽기·쓰기, capability 활성화 |
| Error Reporting | AER (Advanced Error Reporting), poison message |
| MMIO | host가 device register를 *load/store* |
| DMA | device가 host RAM에 데이터 전송 |

PCIe 시맨틱을 그대로 쓰므로 *기존 host의 PCIe enumeration 코드가 CXL 디바이스를 PCIe 디바이스로 발견*합니다.

## DVSEC와 DOE: PCIe 기반의 발견·관리 경로

이 장은 DVSEC와 DOE 두 관리 기능에 집중합니다. 이 둘이 CXL.io와 PCIe 사이의 모든 차이라는 뜻은 아닙니다. CXL.io의 reset·전원 관리·ATS·UIO 등에는 별도의 규칙도 있습니다.

| 추가 | 역할 |
|------|------|
| **DVSEC** | "*이 디바이스가 CXL 호환이다*" 표지 |
| **DOE** | config space를 통해 *데이터 객체를 주고받는 mailbox* 채널 |

이 장은 이 둘을 중심으로 봅니다.

## DVSEC — CXL 호환 표지

*DVSEC (Designated Vendor-Specific Extended Capability)*은 PCIe가 정의한 capability입니다. CXL 규격은 Vendor ID를 *1E98h*로 둔 DVSEC들로 CXL 기능을 알립니다.

| 항목 | 의미 |
|------|------|
| Location | PCIe Extended Config Space (0x100+) |
| Vendor ID | 0x1E98 (CXL Consortium) |
| DVSEC ID | 디바이스 type별 (CXL Device·Port 등) |
| 정보 | CXL 버전·capability·feature flag |

운영 흐름:

1. Host의 PCIe enumeration이 *config space scan*
2. *Extended Capability list*에서 *DVSEC 발견*
3. *Vendor ID = 0x1E98인 DVSEC*을 보면 *CXL 호환 디바이스로 인식*
4. *CXL subsystem 활성화*, 추가 capability negotiation

pciutils v3.13.0의 [`ls-ecaps.c`](https://github.com/pciutils/pciutils/blob/7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee/ls-ecaps.c)는 Vendor `1e98`인 DVSEC를 CXL로 해석하고 ID `0000`을 PCIe DVSEC for CXL Devices로 표시합니다. 포트·register locator 등의 DVSEC는 별도 ID를 사용합니다.

다음은 **합성 configuration dump**를 실제 pciutils v3.13.0의 dump backend로 읽은 출력 일부입니다. 물리 장치 캡처가 아니며, raw config의 IO/Mem capability bit를 설정하고 enable bit는 끈 fixture입니다. 이를 통해 기능 광고와 실제 enable 상태가 다르다는 것을 확인합니다.

```text
Capabilities: [100 v1] Designated Vendor-Specific: Vendor=1e98 ID=0000 Rev=1 Len=56: CXL
    PCIe DVSEC for CXL Devices
    CXLCap: Cache- IO+ Mem+ MemHWInit- HDMCount 0 Viral-
    CXLCtl: Cache- IO- Mem- CacheSFCov 0 CacheSFGran 0 CacheClean- Viral-
```

이 출력의 `Mem+`는 실제 HDM 매핑이나 CXL.mem 트랜잭션 성공을 증명하지 않습니다. 장치 driver binding, link mode와 decoder·OS 상태를 따로 봐야 합니다. Vendor 값만으로 모든 Type의 기능·정상 동작을 판정하지 않습니다.

## DOE — Data Object Exchange mailbox

*DOE (Data Object Exchange)*는 *config space를 통해 데이터 객체를 주고받는* PCIe mailbox입니다.

| 항목 | 의미 |
|------|------|
| Location | PCIe Extended Config Space |
| 동작 | host가 요청 객체를 쓰고, 디바이스가 응답 객체를 준비하면 host가 읽음 |
| 구분 | 객체 header의 *Vendor ID + Data Object Type*으로 프로토콜을 구분 |

[CXL 3.1 표 8-3](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)이 정의한 DOE Type은 Vendor ID 1E98h를 씁니다.

| DOE Type | CXL 기능 |
|----------|---------|
| 0 | Compliance ([Ch 15](/blog/embedded/hardware/cxl/chapter15-ras-performance)) |
| 2 | Table Access — CDAT(Coherent Device Attribute Table) 읽기 |

인증·measurement에 쓰는 SPDM은 DMTF가 정의한 프로토콜이고, CXL.cachemem IDE의 키 관리는 *CXL_IDE_KM* 프로토콜로 합니다([Ch 14 Security](/blog/embedded/hardware/cxl/chapter14-security)).

동일한 합성 dump의 DOE 출력 일부입니다. lspci는 DOE 레지스터 상태를 보여 주며 지원 프로토콜 목록은 DOE discovery로 별도 조회해야 합니다. 아래 정지 상태 비트만으로 SPDM이나 CDAT 교환 성공을 판정하지 않습니다.

```text
Capabilities: [...] Data Object Exchange
        DOECap: IntSup-
        DOECtl: IntEn-
        DOESta: Busy- IntSta- Error- ObjectReady-
```

DOE의 필요 여부는 사용하는 기능과 transport에 따릅니다. DOE 기반 CDAT·Compliance 교환과, SPDM을 DOE 또는 MCTP 경로로 운반하는 경우를 구분해야 합니다. 모든 인증 흐름이 반드시 DOE를 쓴다는 뜻은 아닙니다.

## UIO — Unordered I/O

*UIO (Unordered I/O)*는 PCIe의 기본 ordering 규칙에 묶이지 않는 I/O 요청입니다. CXL 3.x는 UIO를 *peer-to-peer*와 *PBR fabric*에서 씁니다. 예를 들어 PBR fabric에서 UIO 요청을 보낸 쪽은 *Source PBR ID(SPID)*로 구분됩니다.

순서 보장이 필요한 control path는 기본 PCIe ordering을 씁니다. CXL 4.0의 Streamlined Port는 UIO에 최적화돼 있습니다([Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)).

## Direct CXL.mem Access — P2P 메모리 접근

CXL 3.1 규격에는 디바이스끼리 host를 거치지 않고 메모리에 접근하는 경로가 두 가지 있습니다.

| 경로 | 규격 | 내용 |
|------|------|------|
| Direct P2P CXL.mem | §3.3.2.1 | *가속기*가 CXL.mem으로 다른 디바이스의 HDM에 직접 접근 |
| UIO Direct P2P to HDM | §7.7.9 | *UIO*(CXL.io)로 HDM에 직접 접근. PBR fabric에서 지원 |

HDM-DB 영역이면 일관성은 BISnp로 맞춥니다([Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)). GPU·NPU 간 *모델 weight·KV cache 공유*가 이런 경로의 대표적인 쓰임입니다.

## Linux 측 — CXL.io 인식 경로

Linux v6.12의 [`drivers/cxl/pci.c`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/pci.c)는 Type 3 메모리 장치를 class/subclass `0502`, programming interface `10`의 match로 probe합니다. PCI function의 Vendor/Device ID와 DVSEC 내부 Vendor ID `1e98`을 혼동하지 않습니다.

실제 대상의 BDF를 확인한 뒤 아래처럼 읽을 수 있습니다. 이 명령의 출력은 물리 장치에서 얻지 않았으므로 가상의 mem0 목록을 캡처처럼 붙이지 않습니다.

```bash
lspci -n
lspci -vv -s 0000:01:00.0
ls /sys/bus/cxl/devices/
```

이 판의 `cxl_pci_probe()`는 Device DVSEC가 없으면 경고하고 다음 register 설정 절차로 진행합니다. 그 자리에서 항상 probe가 실패하는 것은 아닙니다. management 기능에 쓸 수 있는 경로와 CXL.mem 초기화·주소 매핑 완료를 구분해야 합니다. `cxl_acpi`의 host bridge·window 발견도 별도 경로입니다.

합성 fixture를 사용한 재현에서는 `lspci -F cxl-io-synthetic.dump -n -vv`로 dump만 읽습니다. 이 검증은 host의 PCI 장치에 접근하거나 DOE 요청을 보내지 않습니다. 실제 DOE discovery·응답·오류 검사는 해당 장치의 mailbox 소유권·timeout과 함께 별도 수행해야 합니다. 저장소의 `scripts/verify-cxl-protocol-examples.mjs`는 고정한 pciutils build를 받아 임시 폴더에 해당 합성 dump와 출력 파일을 생성하고 경로를 알립니다. `PCIUTILS_ARTICLE_SOURCE`로 clone 위치를 지정할 수 있습니다.

## 자주 하는 실수

### "CXL.io = PCIe 그대로면 그냥 PCIe 쓰면 된다"

DVSEC·DOE는 기능 발견·관리에 쓰이는 경로입니다. CXL.cache/mem 사용에는 링크·플랫폼·장치의 공통 지원과 설정이 필요합니다. 특정 Linux 판의 management probe 성공을 전체 CXL.mem 사용 가능 상태와 혼동하지 않습니다.

### "DOE에 어떤 protocol이든 막 넣어도 된다"

DOE 객체는 *Vendor ID와 Data Object Type*으로 구분됩니다. CXL 규격이 정의한 Type은 Compliance(0)와 Table Access(2)이고, SPDM은 DMTF가 정의합니다. 디바이스는 자기가 지원하는 Type만 처리합니다.

### "UIO 항상 켜는 게 좋다"

UIO는 ordering을 보장하지 않으므로, *순서가 필요한 path*에는 쓰면 안 됩니다.

### "P2P CXL.mem은 host overhead 0"

host를 거치지 않을 뿐, switch 통과와 (HDM-DB면) BISnp 일관성 트래픽은 그대로 있습니다.

### "DOE mailbox는 빠르다"

DOE는 *config space 접근*으로 객체를 주고받는 control path입니다. bulk data는 DMA·MMIO로 보냅니다.

## 정리

- CXL.io는 PCIe의 enumeration·config·MMIO·DMA·오류 보고를 그대로 씁니다.
- CXL 기능은 *Vendor ID 1E98h DVSEC*으로 알립니다. lspci는 이를 `: CXL`로 해석합니다.
- *DOE*는 config space mailbox입니다. CXL이 정의한 DOE Type은 Compliance(0)와 Table Access/CDAT(2)입니다.
- *UIO*는 ordering 없는 I/O 요청으로, P2P와 PBR fabric에서 씁니다.
- 디바이스 간 직접 접근은 *Direct P2P CXL.mem*과 *UIO Direct P2P to HDM* 두 경로가 있습니다.
- Linux에서 Type 3는 `cxl_pci`가 class code로 잡고 DVSEC을 읽습니다.

## 다음 편

[Ch 7: CXL.cache — D2H·H2D 흐름과 coherency state](/blog/embedded/hardware/cxl/chapter07-cxl-cache)에서 *디바이스가 host 메모리를 캐시*하는 *CXL.cache 프로토콜의 메시지 흐름*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 14: Security — IDE·SPDM·TSP](/blog/embedded/hardware/cxl/chapter14-security) — DOE 위의 SPDM·IDE_KM 흐름
- [Embedded Security Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Modern Embedded Recipes: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1·1.1 spec, Linux v6.12 `drivers/cxl/`와 pciutils v3.13.0 소스를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
