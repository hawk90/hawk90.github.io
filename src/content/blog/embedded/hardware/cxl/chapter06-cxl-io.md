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

> **"CXL.io는 PCIe의 enumeration·configuration·MMIO·DMA·오류 보고를 그대로 씁니다."** — CXL에 특유한 부분은 *디바이스가 CXL 기능을 알리는 DVSEC*과, *Compliance·CDAT 같은 메시지를 주고받는 DOE mailbox*입니다. CXL 1.1부터 정의됐고 *모든 CXL 디바이스에 필수*입니다.

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

## CXL.io = PCIe + DVSEC + DOE

PCIe와 *다른 부분 둘*만 기억하면 됩니다.

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

Linux의 `lspci -vvv`로 확인합니다. pciutils는 Vendor 1e98 DVSEC을 CXL로 해석해 capability 필드를 풀어 보여 줍니다.

```bash
$ lspci -vvv -s 5e:00.0
    Capabilities: [...] Designated Vendor-Specific: Vendor=1e98 ID=0000 Rev=1 Len=56: CXL
        CXLCap: Cache- IO+ Mem+ MemHWInit+ HDMCount 1 Viral-
        ...
```

*Vendor=1e98*이 보이면 *CXL 디바이스*입니다.

## DOE — Boutique Protocol Mailbox

*DOE (Data Object Exchange)*는 *config space를 통해 데이터 객체를 주고받는* PCIe mailbox입니다.

| 항목 | 의미 |
|------|------|
| Location | PCIe Extended Config Space |
| 동작 | host가 요청 객체를 쓰고, 디바이스가 응답 객체를 준비하면 host가 읽음 |
| 구분 | 객체 header의 *Vendor ID + Data Object Type*으로 프로토콜을 구분 |

CXL 규격(3.1 표 8-3)이 정의한 DOE Type은 Vendor ID 1E98h를 씁니다.

| DOE Type | CXL 기능 |
|----------|---------|
| 0 | Compliance ([Ch 15](/blog/embedded/hardware/cxl/chapter15-ras-performance)) |
| 2 | Table Access — CDAT(Coherent Device Attribute Table) 읽기 |

인증·measurement에 쓰는 SPDM은 DMTF가 정의한 프로토콜이고, CXL.cachemem IDE의 키 관리는 *CXL_IDE_KM* 프로토콜로 합니다([Ch 14 Security](/blog/embedded/hardware/cxl/chapter14-security)).

lspci는 DOE capability의 레지스터 상태를 보여 줍니다. 지원 프로토콜 목록은 DOE discovery로 따로 조회해야 합니다.

```bash
$ lspci -vvv -s 5e:00.0
    Capabilities: [...] Data Object Exchange
        DOECap: IntSup-
        DOECtl: IntEn-
        DOESta: Busy- IntSta- Error- ObjectReady-
```

DOE가 없어도 기본 CXL.io 동작은 가능하지만, CDAT 조회나 Compliance·인증 흐름에는 DOE가 필요합니다.

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

Linux의 *CXL subsystem 활성화*가 *CXL.io 인식*에서 시작합니다.

```bash
# 1. PCIe enumeration 결과
$ lspci -nn | grep -i cxl
5e:00.0 CXL [0502]: ... [1234:5678]     # class 05 subclass 02, prog-if 10 = CXL Memory Device

# 2. CXL DVSEC 확인
$ lspci -vvv -s 5e:00.0 | grep -E "Designated|Compute Express"

# 3. CXL subsystem 등록 확인 (DVSEC 있어야 등록)
$ ls /sys/bus/cxl/devices/
mem0/ ...

# 4. 메모리 장치의 보안 상태 (sysfs-bus-cxl ABI)
$ ls /sys/bus/cxl/devices/mem0/security/
erase  sanitize  state  ...
```

Type 3 메모리 장치는 `cxl_pci` 드라이버가 *CXL memory class code*로 잡고, CXL DVSEC을 찾아 설정을 읽습니다(`drivers/cxl/pci.c`). host bridge와 메모리 window는 `cxl_acpi`가 CEDT로 찾습니다.

## 자주 하는 실수

### "CXL.io = PCIe 그대로면 그냥 PCIe 쓰면 된다"

*DVSEC·DOE가 CXL 운영의 entry point*입니다. *DVSEC 없으면* host가 *CXL.cache·CXL.mem 인터페이스 활성화 못 함*. PCIe만으로는 *CXL 디바이스의 핵심 기능 사용 불가*.

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
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1·1.1 spec, Linux `drivers/cxl/` 소스, pciutils 소스를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
