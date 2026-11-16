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

> **"CXL.io는 PCIe의 enumeration·configuration·MMIO·DMA·오류 보고를 그대로 씁니다."** — 여기서는 CXL DVSEC의 기능 발견과 DOE의 데이터 객체 교환을 다룹니다. DVSEC와 DOE 자체는 PCI-SIG가 정의한 메커니즘이고, CXL은 그 위에 Vendor ID 1E98h로 자기 구조를 얹습니다. CXL.io는 *모든 CXL 디바이스에 필수*입니다(3.1 §1.4.1).

[Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 *CXL 4.0의 새 기능*을 봤습니다. 이 장부터 *프로토콜 별 본격 분해*입니다. 이 장의 출력은 모두 QEMU 11.1.3 게스트(Debian 13 arm64, 커널 6.12.116, pciutils 3.13.0)에서 에뮬레이션한 Type 3 장치 `0f:00.0`을 읽은 것입니다.

## CXL.io가 하는 일

새 장치가 꽂혔을 때 OS가 가장 먼저 해야 하는 일은 "이게 무엇이고 어디 있는가"를 알아내는 것입니다. CXL은 이 일을 새로 만들지 않고 PCIe에 맡깁니다. 이사 온 가게가 새 주소 체계를 만들지 않고 기존 도로명 주소에 등록하는 것과 같습니다.

| 역할 | 3.1 §1.4.1·§2.3의 표현 |
|------|------|
| Discovery·Enumeration | CXL.io로 장치 발견·열거 |
| Error Reporting | CXL.io로 오류 보고 |
| P2P·HPA lookup | CXL 메모리로의 P2P 접근과 host physical address lookup |
| 관리 | Type 3는 CXL.io로 discovery·enumeration·error reporting·management (§2.3) |

그래서 기존 host의 PCIe enumeration 코드는 CXL 장치를 PCIe function으로 먼저 발견합니다. 게스트의 `lspci -nn`이 그 모습입니다.

```text
0f:00.0 CXL [0502]: Intel Corporation Device [8086:0d93] (rev 01)
10:00.0 CXL [0502]: Intel Corporation Device [8086:0d93] (rev 01)
```

class code `0502`는 PCI ID 목록의 "CXL" memory class이고, `lspci -vvv`는 `prog-if 10 [CXL Memory Device (CXL 2.x)]`까지 보여 줍니다. Vendor/Device ID `8086:0d93`은 QEMU 모델이 쓰는 값이므로 실제 제품을 뜻하지 않습니다.

## DVSEC와 DOE: PCIe 기반의 발견·관리 경로

| 추가 | 역할 |
|------|------|
| **DVSEC** | "*이 function이 어떤 CXL 기능을 갖고 있다*"는 구조. Vendor ID 1E98h + DVSEC ID로 구분 |
| **DOE** | config space를 통해 *데이터 객체를 주고받는 mailbox* 채널 |

이 둘이 CXL.io와 PCIe의 차이 전부는 아닙니다. 이 장은 두 관리 경로에 집중합니다.

## DVSEC — CXL 호환 표지

*DVSEC (Designated Vendor-Specific Extended Capability)*은 PCIe가 정의한 capability입니다. CXL 규격은 Vendor ID를 *1E98h*로 둔 DVSEC들로 CXL 기능을 알리고, 3.1 Table 8-2가 DVSEC ID와 어느 component에 필수인지 정합니다. 건물 입구의 층별 안내판처럼, 같은 1E98h 안에서 ID마다 다른 정보를 담습니다.

| DVSEC ID | 이름 (3.1 Table 8-2) | SLD(D2)에 대한 요구 |
|------|------|------|
| 0000h | PCIe DVSEC for CXL Devices (§8.1.3) | 필수 |
| 0003h | CXL Extensions DVSEC for Ports (§8.1.5) | 금지 (root port·switch port 필수) |
| 0005h | GPF DVSEC for CXL Devices (§8.1.7) | 필수 |
| 0007h | PCIe DVSEC for Flex Bus Port (§8.1.8) | 필수 |
| 0008h | Register Locator DVSEC (§8.1.9) | 필수 |

게스트 endpoint의 `lspci -vvv`에는 정확히 이 필수 네 개가 있었습니다.

```text
Capabilities: [10c v1] Designated Vendor-Specific: Vendor=1e98 ID=0000 Rev=3 Len=60: CXL
	PCIe DVSEC for CXL Devices
	CXLCap:	Cache- IO+ Mem+ MemHWInit+ HDMCount 1 Viral-
	CXLCtl:	Cache- IO+ Mem+ CacheSFCov 0 CacheSFGran 0 CacheClean- Viral-
	Range1: 0000000000000000-000000000fffffff [size=0x10000000]
Capabilities: [148 v1] Designated Vendor-Specific: Vendor=1e98 ID=0008 Rev=0 Len=36: CXL
	Register Locator DVSEC
	Block1: BIR: bar0, ID: component registers, offset: 0000000000000000
	Block2: BIR: bar2, ID: CXL device registers, offset: 0000000000000000
Capabilities: [16c v1] Designated Vendor-Specific: Vendor=1e98 ID=0005 Rev=0 Len=16: CXL
	GPF DVSEC for CXL Devices
Capabilities: [17c v1] Designated Vendor-Specific: Vendor=1e98 ID=0007 Rev=2 Len=32: CXL
	PCIe DVSEC for Flex Bus Port
```

(ID 0000의 `CXLSta`·`CXLCtl2` 등 몇 줄과 Range2는 줄였습니다.) `Rev=3`은 Table 8-2가 ID 0000h에 적은 최고 revision 3과 같습니다. `CXLCap`의 `Cache-`는 이 장치가 Type 3라는 뜻이고, `Range1` 크기 `0x10000000`은 256 MiB HDM입니다. Register Locator는 component register가 BAR0, 메일박스 등 device register가 BAR2에 있다고 알려 줍니다.

같은 게스트에서 switch upstream port `0d:00.0`과 root port `0c:00.0`에는 ID 0003h(CXL Extensions DVSEC for Ports)가 있었고, endpoint에는 없었습니다. Table 8-2의 필수·금지 열과 그대로 맞습니다.

## DOE — Data Object Exchange mailbox

*DOE (Data Object Exchange)*는 3.1 §8.1.2의 표현으로 "host가 PCIe function과 데이터 객체를 교환하는 PCI-SIG 정의 메커니즘"입니다. 은행 창구의 번호표 시스템처럼, 요청 서류를 넣고 응답 서류가 준비되면 꺼내 가는 방식입니다.

| 항목 | 의미 |
|------|------|
| Location | PCIe Extended Config Space |
| 구분 | 객체 header의 *Vendor ID + Data Object Type*으로 프로토콜을 구분 |
| CXL 정의 객체 | Vendor ID 1E98h (§8.1.2) |

3.1 Table 8-3이 정의한 DOE Type입니다.

| DOE Type | CXL 기능 | SLD(D2)에 대한 요구 |
|----------|---------|------|
| 0 | Compliance (§14) | 선택 |
| 2 | Table Access — CDAT(Coherent Device Attribute Table) 읽기 (§8.1.11) | 필수 |

게스트 endpoint의 DOE capability 자체는 상태 레지스터만 보여 줍니다.

```text
Capabilities: [19c v1] Data Object Exchange
	DOECap: IntSup+
		IntMsgNum 0
	DOECtl: IntEn-
	DOESta: Busy- IntSta- Error- ObjectReady-
```

DOE로 실제 무엇을 주고받는지는 커널이 읽어 온 CDAT로 확인할 수 있습니다. Linux v6.12 `drivers/cxl/core/pci.c`는 `pci_find_doe_mailbox(pdev, PCI_VENDOR_ID_CXL, CXL_DOE_PROTOCOL_TABLE_ACCESS)`(607행, Type 2를 475행에서 정의)로 Table Access 메일박스를 찾고, `cxl_cdat_read_table()`(509행)이 entry handle을 바꿔 가며 `0xffff`가 나올 때까지 한 entry씩 요청합니다. §8.1.11도 CDAT를 "한 번에 한 entry씩" 읽는다고 씁니다. 그렇게 읽은 결과가 `endpoint3/CDAT` sysfs 파일에 있습니다.

```bash
od -A d -t x1 /sys/bus/cxl/devices/endpoint3/CDAT
```

```text
0000000 a0 00 00 00 02 0d 00 00 00 00 00 00 00 00 00 00
0000016 00 00 18 00 00 00 00 00 00 00 00 00 00 00 00 00
0000032 00 00 00 10 00 00 00 00 01 00 18 00 00 00 01 00
0000048 10 27 00 00 00 00 00 00 0f 00 00 00 00 00 00 00
```

160바이트(`0xa0`) 가운데 앞 64바이트입니다. 첫 16바이트가 CDAT header(길이 160, revision 2)이고, offset 16의 type `00`·길이 `0x18`이 DSMAS(DPA 0부터 길이 `0x10000000`), offset 40의 type `01`이 DSLBIS입니다. DSLBIS의 base unit `0x2710`(10000)과 값 `0x0f`(15)는 QEMU `hw/mem/cxl_type3.c:85-92`의 "read latency, 10 ns base, 150 ns"와 같습니다. 같은 소스(98-131행)는 write latency 250 ns, read·write bandwidth 16 GB/s를 넣습니다. 모두 에뮬레이터가 정한 값이지 측정값이 아닙니다.

인증·measurement에 쓰는 SPDM은 DMTF가 정의한 프로토콜이고, CXL.cachemem IDE의 키 관리는 *CXL_IDE_KM* 프로토콜로 합니다([Ch 14 Security](/blog/embedded/hardware/cxl/chapter14-security)).

## UIO — Unordered I/O

*UIO (Unordered I/O)*는 PCIe의 기본 ordering 규칙에 묶이지 않는 I/O 요청입니다. 3.1 §1.4.1 각주는 CXL.mem 영역으로의 peer-to-peer 흐름을 CXL.io의 UIO 또는 Direct CXL.mem 접근으로 지원한다고 씁니다. CXL 3.0은 UIO로 HDM 메모리에 직접 peer-to-peer 접근하는 기능을 더했습니다(§1.4.1).

## Direct CXL.mem Access — P2P 메모리 접근

CXL 3.1 규격에는 디바이스끼리 host를 거치지 않고 메모리에 접근하는 경로가 두 가지 있습니다.

| 경로 | 규격 | 내용 |
|------|------|------|
| Direct P2P CXL.mem | §3.3.2.1 | 가속기(Type 1·2·3)가 방향을 뒤집은 CXL.mem 채널로 peer Type 3 메모리에 접근. 두 장치 모두 PBR Edge DSP에 직접 연결돼야 함 |
| UIO Direct P2P to HDM | §7.7.9 | UIO(CXL.io)로 HDM에 접근. PBR switch는 edge-to-edge 라우팅, 기존 소프트웨어는 HDM decoder로 제한적으로 사용 |

HDM-DB 영역이면 일관성은 BISnp로 맞춥니다([Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)).

## Linux 측 — CXL.io 인식 경로

Linux v6.12 `drivers/cxl/pci.c:956`의 match table은 `PCI_DEVICE_CLASS((PCI_CLASS_MEMORY_CXL << 8 | CXL_MEMORY_PROGIF), ~0)`입니다. `PCI_CLASS_MEMORY_CXL`은 `0x0502`(`include/linux/pci_ids.h:54`), `CXL_MEMORY_PROGIF`는 `0x10`(`drivers/cxl/cxlpci.h:8`)입니다. PCI function의 Vendor/Device ID가 아니라 class code로 잡으므로, QEMU의 `8086:0d93`이든 다른 제조사 ID든 `0502`/`10`이면 `cxl_pci`가 probe합니다. 게스트의 dmesg가 그 결과입니다.

```text
[   24.355091]  pci0000:0c: host supports CXL
[   25.056769] cxl_pci 0000:0f:00.0: enabling device (0000 -> 0002)
[   25.070060] cxl_pci 0000:10:00.0: enabling device (0000 -> 0002)
```

`cxl_pci_probe()`(pci.c:810)는 840-844행에서 ID 0000h Device DVSEC를 찾고, 없으면 "Device DVSEC not present, skip CXL.mem init"을 경고한 뒤 다음 단계로 진행합니다. 6.12.116에서는 같은 코드가 838행에 있습니다.

## 자주 하는 실수

### "CXL.io = PCIe 그대로면 그냥 PCIe 쓰면 된다"

DVSEC·DOE는 기능 발견·관리 경로입니다. 게스트의 `CXLCtl`이 `Mem+`였어도 decoder가 commit되지 않아 그 메모리는 OS에 보이지 않았습니다([Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position)).

### "DOE에 어떤 protocol이든 막 넣어도 된다"

DOE 객체는 *Vendor ID와 Data Object Type*으로 구분됩니다. CXL 규격이 정의한 Type은 Compliance(0)와 Table Access(2)이고(Table 8-3), SPDM은 DMTF가 정의합니다. 커널도 Vendor 1E98h·Type 2를 지정해 메일박스를 찾습니다.

### "P2P CXL.mem은 아무 switch에서나 된다"

§3.3.2.1은 Direct P2P CXL.mem에 PBR 라우팅이 필요하다고 씁니다. 모든 CXL.mem 메시지에 HBR switch가 host로 갈지 peer로 갈지 판단할 정보가 들어 있지는 않기 때문입니다.

### "CDAT의 지연·대역폭 값은 측정값이다"

CDAT는 장치가 *스스로 보고하는* 속성표입니다. QEMU 모델의 150 ns·16 GB/s는 소스에 상수로 적힌 값입니다.

## 정리

- CXL.io는 PCIe의 enumeration·config·MMIO·DMA·오류 보고를 그대로 씁니다.
- CXL 기능은 *Vendor ID 1E98h DVSEC*으로 알리고, SLD에는 ID 0000h·0005h·0007h·0008h가 필수입니다(Table 8-2). QEMU endpoint에도 정확히 이 넷이 있었습니다.
- *DOE*는 config space mailbox입니다. CXL이 정의한 DOE Type은 Compliance(0)와 Table Access/CDAT(2)입니다.
- 커널은 Table Access DOE로 CDAT를 한 entry씩 읽어 `endpointN/CDAT`에 내놓습니다.
- 디바이스 간 직접 접근은 *Direct P2P CXL.mem*과 *UIO Direct P2P to HDM* 두 경로가 있고, 둘 다 PBR switch가 필요합니다.
- Linux에서 Type 3는 `cxl_pci`가 class code `0502`·prog-if `10`으로 잡습니다.

## 다음 편

[Ch 7: CXL.cache — D2H·H2D 흐름과 coherency state](/blog/embedded/hardware/cxl/chapter07-cxl-cache)에서 *디바이스가 host 메모리를 캐시*하는 *CXL.cache 프로토콜의 메시지 흐름*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 14: Security — IDE·SPDM·TSP](/blog/embedded/hardware/cxl/chapter14-security) — DOE 위의 SPDM·IDE_KM 흐름
- [Embedded Security Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Modern Embedded Recipes: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 §1.4.1·§2.3·§3.3.2.1·§7.7.9·§8.1.2~8.1.11(Table 8-2·8-3), Linux v6.12 `drivers/cxl/`, QEMU 11.1.3 소스와 게스트의 `lspci`·CDAT 출력을 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
