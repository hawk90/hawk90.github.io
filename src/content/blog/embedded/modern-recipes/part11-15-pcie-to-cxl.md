---
title: "PCIe → CXL 진화 — 같은 PHY 위 cache-coherent 프로토콜 추가"
slug: "embedded/modern-recipes/part11-15-pcie-to-cxl"
date: 2026-06-18T09:01:00
description: "PCIe 5.0/6.0 PHY 위에서 CXL이 어떻게 cache coherency를 얹는지 — Flex Bus, 세 프로토콜 다중화, Type 1/2/3 디바이스 구분."
series: "Modern Embedded Recipes"
seriesOrder: 149
tags: [recipes, pcie, cxl, flex-bus, cache-coherency, interconnect]
topics: ["embedded"]
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
| **Type 1** | CXL.io + CXL.cache | local memory 없는 accelerator | 없음 (host 메모리 사용) |
| **Type 2** | CXL.io + CXL.cache + CXL.mem | GPU·NPU·FPGA | 자체 HBM/DRAM |
| **Type 3** | CXL.io + CXL.mem | memory expander | 자체 DRAM (host에 노출) |

가장 *간단한 게 Type 3*입니다. *DRAM 모듈*을 *PCIe 너머로 노출*하는 디바이스로, *CXL.io는 enumeration용*, *CXL.mem은 host의 load/store용*입니다.

## Flex Bus — 한 링크에서 시분할

같은 *CXL 링크*에서 *세 프로토콜이 동시에* 흐릅니다.

```text
[Flex Bus 시분할 — flit 단위]

t=0   CXL.mem M2S Req   (host → device, load addr=0x1000)
t=1   CXL.io  TLP       (config write)
t=2   CXL.cache D2H Req (device → host, snoop addr=0x2000)
t=3   CXL.mem S2M DRS   (device → host, data 64 B)
...
```

링크의 arbitration과 credit 정책은 구현·구성에 따라 여러 트래픽을 조정합니다. CXL.mem과 CXL.cache의 지연 특성은 링크·장치·큐 상태를 함께 측정해야 하며, 한 프로토콜이 항상 우선된다고 일반화할 수 없습니다.

## 호스트 측에서 CXL 디바이스 인식

Linux에서 CXL을 사용하려면 해당 kernel의 CXL 지원과 `CONFIG_CXL_*`, ACPI/firmware 및 플랫폼 지원을 함께 확인해야 합니다. 단순히 kernel 버전 하나만으로 동작 여부를 판단할 수 없습니다.

```bash
# 1. lspci로 보면 PCIe device로 보임
$ lspci -nn
5e:00.0 CXL [0502]: <vendor> <device> [<vendor id>:<device id>]

# 2. CXL DVSEC 확인 (CXLCap 줄은 -vv 이상에서 출력)
$ sudo lspci -vvv -s 5e:00.0 | grep -A 1 "Designated Vendor"
	Capabilities: [...] Designated Vendor-Specific: Vendor=1e98 ID=0000 Rev=1 Len=56: CXL
		CXLCap:	Cache- IO+ Mem+ MemHWInit+ HDMCount 1 Viral-

# 3. CXL 서브시스템에 등록 확인
$ ls /sys/bus/cxl/devices/
root0/  port0/  decoder0.0/  mem0/

# 4. memdev 확인 (ram_size·pmem_size·serial·host 필드)
$ cxl list -m mem0
```

*PCI subsystem이 디바이스를 발견*하면 *CXL subsystem이 추가로 등록*해 *별도 sysfs entry*를 만듭니다. *cxl-cli*가 이 정보를 노출합니다.

## 임베디드에서 CXL을 만나는 자리

CXL은 *데이터센터 표준*으로 시작했고, 서버급 Arm 설계에서 먼저 보입니다. Arm의 Neoverse V2 reference design(RD-V2)은 CMN-700 mesh에 가속기 연결용 CML 링크 8개를 두고, 이 링크가 *CXL 2.0*을 지원합니다(Arm RD-V2 Technical Overview).

SoC에 PCIe root port가 있다고 CXL 장치를 attach할 수 있는 것은 아닙니다. root port의 CXL 지원, firmware의 CEDT, kernel의 CXL 드라이버, 장치의 CXL 지원을 각각 확인해야 합니다.

## 자주 하는 실수

> ⚠️ CXL 디바이스를 일반 PCIe device로 취급

```bash
# PCIe로만 본 enumeration — class 0502 (CXL)
$ lspci -nn | grep 0502

$ ls /sys/bus/pci/devices/0000:5e:00.0/
# → PCI 속성만 보이고 region·decoder·memdev는 없음
```

CXL 서브시스템(`/sys/bus/cxl`)을 *반드시 확인*해야 *region·decoder·memdev*가 보입니다. PCIe sysfs만 보면 *CXL.mem capability를 놓칩니다*.

> ⚠️ 호스트 BIOS·UEFI가 CXL 미지원

CXL host bridge와 메모리 창은 *ACPI CEDT(CXL Early Discovery Table)*로 *BIOS·UEFI가 알려 줍니다*. `cxl_acpi`는 이 표에서 CXL root와 host bridge를 등록하므로, CEDT가 없으면 CXL 메모리 경로가 열리지 않습니다(`/sys/firmware/acpi/tables/CEDT`로 확인).

> ⚠️ 커널 버전 하나로 판단

CXL sysfs는 단계적으로 들어왔습니다. 커널 ABI 문서(`Documentation/ABI/testing/sysfs-bus-cxl`) 기준으로 `memX`는 v5.12, port·decoder는 v5.14, `create_pmem_region`은 v6.0, volatile 메모리용 `create_ram_region`은 v6.3부터입니다. ram region을 만들려면 v6.3 이상과 함께 `CONFIG_CXL_*` 설정을 확인합니다.

> ⚠️ CXL은 PCIe 5.0 슬롯에서만 동작한다고 가정

CXL 3.1 spec은 CXL 모드의 정상 속도를 32 GT/s 또는 64 GT/s로 두고, 8·16·32 GT/s로 낮춘 *degraded mode*도 CXL 모드로 정의합니다(§1.5, §6). 링크가 CXL 모드로 들어가는지는 속도가 아니라 *alternate protocol negotiation*으로 정해지므로, root port 쪽이 CXL을 지원해야 합니다.

## 정리

- CXL은 *PCIe 5.0/6.0 PHY를 그대로 쓰면서* cache coherency 프로토콜을 얹은 표준입니다.
- 세 프로토콜(CXL.io·CXL.cache·CXL.mem)이 *Flex Bus 위에서 시분할*로 흐릅니다.
- Type 1은 *cache-only*, Type 2는 *memory 가진 가속기*, Type 3은 *memory expander*입니다.
- *BIOS의 CEDT 제공*과 커널 CXL 지원(ram region은 v6.3+)이 함께 있어야 CXL 메모리가 *호스트에 등록*됩니다.
- CXL 모드 진입은 alternate protocol negotiation으로 정해지며, 8·16 GT/s degraded mode도 CXL 모드입니다.
- *cxl-cli*가 CXL 전용 sysfs를 노출해 *region·decoder·memdev* 정보를 보여줍니다.

다음 편은 **Ch 150: QEMU CXL Type 3 디바이스 에뮬레이션** — 노트북에서 *실 하드웨어 없이* CXL 개발 환경을 만드는 법을 정리합니다.

## 관련 항목

- [11-03: PCIe BAR 매핑 분석](/blog/embedded/modern-recipes/part11-03-pcie-bar)
- [11-09: PCIe Streaming 분석](/blog/embedded/modern-recipes/part11-09-pcie-streaming)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [Embedded Security Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
