---
title: "PCIe → CXL 진화 — 같은 PHY 위 cache-coherent 프로토콜 추가"
date: 2026-06-18T09:01:00
description: "PCIe 5.0/6.0 PHY 위에서 CXL이 어떻게 cache coherency를 얹는지 — Flex Bus, 세 프로토콜 다중화, Type 1/2/3 디바이스 구분."
series: "Modern Embedded Recipes"
seriesOrder: 149
tags: [recipes, pcie, cxl, flex-bus, cache-coherency, interconnect]
---

## 한 줄 요약

> **"CXL은 PCIe 케이블을 그대로 쓰면서 *cache coherency*를 얹은 표준입니다."** PCIe 5.0/6.0 PHY 위에 *세 프로토콜이 다중화*되어 흐릅니다.

## PCIe와 CXL의 관계

[Ch 125 (PCIe BAR)](/blog/embedded/modern-recipes/part11-03-pcie-bar)에서 *PCIe로 device를 enumerate*하고 *MMIO로 register를 read/write*하는 흐름을 봤습니다. CXL은 *같은 PCIe 인프라*를 그대로 쓰면서 *추가 능력*을 얹은 표준입니다.

레이어 구조:

| 레이어 | 역할 |
|--------|------|
| PCIe 5.0/6.0 PHY (32 GT/s / 64 GT/s) | 동일 물리 계층 |
| Flex Bus (multiplexer) | 세 프로토콜을 시분할 |
| CXL.io | =PCIe (config·DMA) |
| CXL.cache | device → host cache |
| CXL.mem | host → device memory |

*같은 케이블·같은 connector·같은 enumeration*입니다. *디바이스 측이 CXL을 지원*하면 *config space에 CXL DVSEC*이 추가되어 *host가 인식*합니다.

## 세 프로토콜의 역할

| 프로토콜 | 용도 | 비유 |
|---------|------|------|
| CXL.io | discovery·config·DMA | *기존 PCIe 그대로* |
| CXL.cache | device가 host memory를 *coherent하게 cache* | accelerator → CPU 메모리 |
| CXL.mem | host가 device memory를 *load/store* | CPU → expander DRAM |

*CXL.io는 모든 디바이스 필수*입니다. PCIe 호환 enumeration을 위해서입니다. 나머지 둘은 *디바이스 타입에 따라 선택적*입니다.

## Type 1/2/3 디바이스

CXL 디바이스는 *지원 프로토콜 조합*으로 *세 타입*으로 나뉩니다.

| Type | 지원 프로토콜 | 대표 사례 | 메모리 |
|------|--------------|----------|--------|
| **Type 1** | CXL.io + CXL.cache | NIC·HBA·accelerator | 없음 (host 메모리 사용) |
| **Type 2** | CXL.io + CXL.cache + CXL.mem | GPU·NPU·FPGA | 자체 HBM/DRAM |
| **Type 3** | CXL.io + CXL.mem | memory expander | 자체 DRAM (host에 노출) |

가장 *간단한 게 Type 3*입니다. *DRAM 모듈*을 *PCIe 너머로 노출*하는 디바이스로, *CXL.io는 enumeration용*, *CXL.mem은 host의 load/store용*입니다.

## Flex Bus — 한 링크에서 시분할

같은 *PCIe 5.0 x16 링크*에서 *세 프로토콜이 동시에* 흐릅니다.

```text
[Flex Bus 시분할 — flit 단위]

t=0   CXL.mem M2S Req   (host → device, load addr=0x1000)
t=1   CXL.io  TLP       (config write)
t=2   CXL.cache D2H Req (device → host, snoop addr=0x2000)
t=3   CXL.mem S2M DRS   (device → host, data 64 B)
...
```

*Arbiter가 flit별로 우선순위*를 정합니다. *CXL.mem과 CXL.cache가 latency-critical*이라 우선됩니다.

## 호스트 측에서 CXL 디바이스 인식

Linux에서 PCIe enumeration이 CXL을 보려면 *kernel 6.0+*이 필요합니다.

```bash
# 1. lspci로 보면 PCIe device로 보임
$ lspci -nn
5e:00.0 Memory controller [0508]: Samsung CMM-D [1234:5678]

# 2. CXL DVSEC 확인
$ lspci -vvv -s 5e:00.0 | grep -A 5 "Designated Vendor"
Capabilities: [60] Designated Vendor-Specific: Vendor=1e98 ID=0000
    Compute Express Link
    DVSEC Rev: 1, Len: 56

# 3. CXL 서브시스템에 등록 확인
$ ls /sys/bus/cxl/devices/
root0/  port0/  decoder0.0/  mem0/

# 4. 메모리 region 확인
$ cxl list -m mem0
[
  {
    "memdev":"mem0",
    "ram_size":274877906944,    # 256 GB
    "host":"0000:5e:00.0"
  }
]
```

*PCI subsystem이 디바이스를 발견*하면 *CXL subsystem이 추가로 등록*해 *별도 sysfs entry*를 만듭니다. *cxl-cli*가 이 정보를 노출합니다.

## 임베디드에서 CXL을 만나는 자리

CXL은 *데이터센터 표준*으로 시작했지만 *임베디드 영역*에도 영향이 들어오고 있습니다.

| 영역 | CXL 응용 |
|------|---------|
| **AI Edge box** | NPU + 외부 CXL.mem expander로 *LLM 추론 메모리 확보* |
| **Storage controller** | NVMe-CXL hybrid — *block + load/store 동시 노출* |
| **Network appliance** | SmartNIC가 *Type 1*로 동작, packet metadata를 host와 *cache-coherent 공유* |
| **In-memory DB appliance** | *Type 3 memory pool*로 *TB급 working set* 확보 |

*Cortex-A 기반 SoC*들이 *PCIe 5.0 root port*를 갖추면서 *CXL 1.1 디바이스를 attach 가능*해지고 있습니다.

## 자주 하는 실수

> ⚠️ CXL 디바이스를 일반 PCIe device로 취급

```bash
# PCIe로만 본 enumeration
$ lspci | grep Samsung
5e:00.0 Memory controller: Samsung CMM-D

$ ls /sys/bus/pci/devices/0000:5e:00.0/
# → 평범한 PCIe device처럼 보이지만 CXL 영역이 안 보임
```

CXL 서브시스템(`/sys/bus/cxl`)을 *반드시 확인*해야 *region·decoder·memdev*가 보입니다. PCIe sysfs만 보면 *CXL.mem capability를 놓칩니다*.

> ⚠️ 호스트 BIOS·UEFI가 CXL 미지원

```text
# dmesg
[    0.524] cxl_pci: device 0000:5e:00.0 — CHBS not found in CEDT
```

CXL은 *ACPI CEDT(CXL Early Discovery Table)*가 *BIOS·UEFI에서 제공*되어야 *host가 인식*합니다. *오래된 BIOS*는 CXL 디바이스를 *비활성 PCIe*로 인식합니다. BIOS update가 필요합니다.

> ⚠️ Kernel 5.x에서 CXL 사용 시도

```bash
$ uname -r
5.15.0-...

$ ls /sys/bus/cxl
ls: cannot access '/sys/bus/cxl': No such file or directory
```

CXL subsystem은 *kernel 6.0+*에서 mainline에 들어왔습니다. *6.5+에서 region·DAX 통합*이 안정됩니다. *5.15 LTS*는 OEM patch 없이는 CXL을 못 봅니다.

> ⚠️ PCIe 4.0 슬롯에 CXL 디바이스 장착

```text
# CXL 디바이스가 PCIe 4.0으로 fall-back
$ cxl list -m mem0
"link_speed":"16.0 GT/s",  # PCIe 4.0 속도
"cxl_mode":false           # CXL 모드 비활성
```

CXL은 *PCIe 5.0 이상 슬롯*이 필요합니다. PCIe 4.0 슬롯에서는 *PCIe로만 동작*하고 *CXL.mem·CXL.cache는 비활성*됩니다.

## 정리

- CXL은 *PCIe 5.0/6.0 PHY를 그대로 쓰면서* cache coherency 프로토콜을 얹은 표준입니다.
- 세 프로토콜(CXL.io·CXL.cache·CXL.mem)이 *Flex Bus 위에서 시분할*로 흐릅니다.
- Type 1은 *cache-only*, Type 2는 *memory 가진 가속기*, Type 3은 *memory expander*입니다.
- Linux *kernel 6.0+*과 *BIOS의 CEDT 제공*이 함께 있어야 CXL 디바이스가 *호스트에 등록*됩니다.
- 임베디드 SoC에도 *PCIe 5.0 root port*가 등장하면서 *CXL 1.1 디바이스 attach*가 가능해지고 있습니다.
- *cxl-cli*가 CXL 전용 sysfs를 노출해 *region·decoder·memdev* 정보를 보여줍니다.

다음 편은 **Ch 150: QEMU CXL Type 3 디바이스 에뮬레이션** — 노트북에서 *실 하드웨어 없이* CXL 개발 환경을 만드는 법을 정리합니다.

## 관련 항목

- [11-03: PCIe BAR 매핑 분석](/blog/embedded/modern-recipes/part11-03-pcie-bar)
- [11-09: PCIe Streaming 분석](/blog/embedded/modern-recipes/part11-09-pcie-streaming)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [Embedded Security Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
