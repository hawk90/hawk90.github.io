---
title: "Ch 19: 고급 기능 — Lane Margining·10-bit Tag·TPH·ACS·L0p"
slug: "embedded/hardware/pcie/chapter19-advanced-features"
date: 2026-05-19T09:19:00
description: "코어 동작 너머의 PCIe spec 기능들 — Lane Margining(신호 마진 측정)·10-bit Tag(outstanding 확장)·TPH(캐시 주입 힌트)·ACS(격리)·L0p(부분폭 저전력)을 실무 관점에서 정리합니다."
series: "PCIe Deep Dive"
seriesOrder: 19
tags: [pcie, lane-margining, tph, acs, l0p, advanced]
draft: false
topics: ["embedded", "embedded/hardware"]
---

[Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer)에서 물리 계층을, [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 DMA·IOMMU를 봤습니다. 이 장은 그 사이에 있는 다섯 기능을 모읍니다. 수신기 안에서 신호 여유를 재는 Lane Margining, 동시 요청 수를 늘리는 10-bit Tag, 데이터가 갈 곳의 힌트를 싣는 TPH, 장치 사이 우회를 막는 ACS, 링크 폭을 줄여 전력을 아끼는 L0p입니다. 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116, pciutils 3.13.0)에서 각 기능이 어떻게 보이는지, 그리고 이 환경에서 무엇이 없는지 같이 확인합니다.

## 한 줄 요약

> **다섯 기능은 서로 다른 문제를 풉니다.** Lane Margining은 receiver 내부의 시간·전압 마진을 관찰하고, 10-bit Tag는 사용 가능한 요청 식별자 공간을 넓힙니다. TPH는 처리 위치 힌트, ACS는 우회 경로 제어, L0p는 부분폭 절전에 쓰입니다. 지원 비트만으로 성능·격리·전력 효과까지 확인된 것은 아닙니다.

## Lane Margining — 신호 마진을 소프트웨어로

링크가 얼마나 여유 있게 동작하는지는 원래 오실로스코프로 eye를 찍어야 알 수 있었습니다. Lane Margining at Receiver는 그 측정을 수신기 안으로 넣은 기능입니다. [pciutils 3.13.0 `pcilmr.man`](https://github.com/pciutils/pciutils/blob/v3.13.0/pcilmr.man)(53-65행)이 설명하는 내용은 다음과 같습니다.

| 항목 | `pcilmr.man`의 설명 |
|------|------|
| 대상 | 16.0 GT/s 이상을 지원하는 모든 포트에 필수, retimer(Pseudo Port) 포함 |
| 조건 | 링크가 L0인 상태에서 측정 |
| 축 | 전압과 시간, 현재 수신 위치에서 양 방향 |
| 필수 여부 | timing margining은 필수, voltage는 16.0 GT/s에서 선택이고 32.0 GT/s 이상에서 필수 |
| 도구 범위 | 현재 16 GT/s와 32 GT/s 링크 지원 (34-35행), 표 머리글은 "16 GT/s (Gen 4)", "32 GT/s (Gen 5)" (89행) |

같은 매뉴얼(30-51행)은 실행 조건을 둘로 나눕니다. 링크 속도 16 GT/s 이상과 downstream 장치 D0는 사용자가 미리 맞춰야 하고, 도구는 바꾸지 않습니다. 반면 양쪽 포트의 ASPM 끄기, Link Control 2의 Hardware Autonomous Speed Disable, Link Control의 Hardware Autonomous Width Disable은 도구가 측정 중에 직접 설정했다가 결과를 받은 뒤 원래대로 돌립니다. 조회처럼 보여도 레지스터를 바꾸는 도구입니다.

시리즈 VM에서 실행한 결과입니다.

```text
/usr/bin/pcilmr
Links with Lane Margining at the Receiver capabilities:
Links not found or you don't have enough privileges.
```

root로 실행했으므로 권한 문제가 아니라, 16 GT/s 이상으로 협상된 링크가 없고([Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)의 LnkSta는 모두 2.5 GT/s) Lane Margining Capability를 가진 장치도 없다는 뜻입니다. 실제 margin 측정은 하지 않았습니다.

## 10-bit Tag — outstanding 요청 확장

[Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)에서 Non-Posted 요청이 Tag로 식별된다는 것을 봤습니다. Tag 필드가 8비트면 값이 256개, 10비트면 1024개입니다. 실제로 쓸 수 있는 범위는 구현이 정합니다. [Altera R-Tile Avalon-ST IP 사용자 가이드 26.1](https://docs.altera.com/r/docs/683501/26.1/r-tile-avalon-streaming-ip-for-pci-express-user-guide/tag-allocation)의 x16 컨트롤러는 10-bit Tag 256~1023으로 최대 768개, x8·x4 컨트롤러는 256~768로 최대 512개의 Non-Posted 요청을 냅니다.

10-bit Tag는 Device Capabilities 2의 Completer·Requester 지원 비트로 광고합니다. 시리즈 VM에서 Device Capabilities 2를 가진 function 11개는 모두 지원하지 않았습니다(Express Capability v1인 e1000e에는 이 레지스터가 없습니다).

```text
     11 			 10BitTagComp- 10BitTagReq- OBFF Not Supported, ExtFmt+ EETLPPrefix+, MaxEETLPPrefixes 4
     11 			 10BitTagReq- OBFF Disabled, EETLPPrefixBlk-
```

(`lspci -vv | grep -E "10BitTag|TPHComp" | sort | uniq -c` 발췌.) Linux v6.12 `pci_regs.h`에는 10-bit Tag 관련 정의가 없고, 커널이 켜는 것은 8-bit Extended Tag까지입니다([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)의 `pci_configure_extended_tags()`). Tag 수가 처리량에 어떻게 이어지는지는 [Ch 17](/blog/embedded/hardware/pcie/chapter17-performance)의 bandwidth-delay product 계산에 있습니다.

## TPH·Steering Tags — 처리 위치 힌트

DMA로 들어온 데이터를 곧바로 처리해야 하는 장치는, 그 데이터를 어느 CPU 쪽 자원으로 보낼지 힌트를 주고 싶어 합니다. TPH(TLP Processing Hints)가 그 기능이고, Linux v6.12 `pci_regs.h`의 Extended Capability ID는 0x17(TPH Requester)입니다.

[Linux 커널 TPH 문서](https://docs.kernel.org/PCI/tph.html)(2026-11-16 열람)는 이 힌트를 Steering Tag(ST)라는 형식으로 TLP에 싣는다고 설명합니다. 드라이버는 대상 메모리의 ST를 API로 얻어 장치의 ST table에 쓰고, `pcie_enable_tph()`의 모드로 Interrupt Vector Mode(`PCI_TPH_ST_IV_MODE`)와 Device Specific Mode(`PCI_TPH_ST_DS_MODE`)를 고릅니다. ST table은 MSI-X table이나 TPH Extended Capability 안에 있을 수 있습니다. 문서는 Steering Tag가 플랫폼마다 다르며, PCIe 규격은 ST를 어디서 얻는지 정하지 않고 PCI Firmware Specification의 ACPI `_DSM`이 그 방법을 정한다고도 적습니다. 커널 지원은 `CONFIG_PCIE_TPH` 옵션이 필요합니다.

TPH는 placement hint이지 DMA 데이터가 반드시 특정 cache에 놓인다는 보장은 아닙니다. 실제 배치와 locality는 root complex·IOMMU·장치·플랫폼의 I/O 경로에 따라 달라집니다.

시리즈 VM에서는 두 가지가 모두 없었습니다. Linux v6.12 소스에는 `drivers/pci/tph.c`가 없고 Debian 커널 config에 `CONFIG_PCIE_TPH`가 없습니다. 장치 쪽도 `TPHComp- ExtTPHComp-`였습니다. 위 문서는 v6.12보다 뒤의 커널을 설명합니다.

## ACS — 격리와 P2P 리다이렉트 제어

같은 switch 아래 두 장치가 IOMMU를 거치지 않고 직접 주고받으면, IOMMU는 그 트래픽을 보지 못합니다. ACS(Access Control Services)는 downstream port가 그런 요청을 그대로 보낼지, 막을지, 위로 올려 IOMMU를 거치게 할지 정하는 기능입니다. [Linux v6.12 VFIO 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/vfio.rst)(55-65행)도 ACS가 없는 bridge에서 redirection이 IOMMU에 닿지 않을 수 있다고 설명합니다.

시리즈 VM에서 이 차이가 IOMMU group으로 드러났습니다([Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)). ACS가 있는 QEMU root port 아래 장치는 혼자 group을 가졌고(group 10·12), ACS가 없는 XIO3130 downstream port 아래 장치는 port와 같은 group(6·7)이었습니다. root port의 ACS 비트는 [Ch 18](/blog/embedded/hardware/pcie/chapter18-register-maps)에 있습니다(`ACSCtl: SrcValid+ TransBlk- ReqRedir+ CmpltRedir+ UpstreamFwd+ EgressCtrl- DirectTrans-`).

IOMMU group은 ACS 외에도 topology, DMA alias, 장치 내부 경로, kernel quirk의 영향을 받습니다. ACS 하나만으로 group 경계를 계산할 수 없고, 같은 group의 장치를 별도 신뢰 domain에 나눌 수 있는지도 group 전체를 기준으로 판단해야 합니다.

ACS 설정을 바꾸는 Linux v6.12 커널 인자는 `kernel-parameters.txt:4636-4672`의 `pci=disable_acs_redir=`와 `pci=config_acs=`입니다. 문서는 앞의 것이 P2P 트래픽을 위로 올리지 않게 해 "removes isolation between devices and may put more devices in an IOMMU group"이라고 경고하고, 뒤의 것은 ACS 비트 일곱 개(Source Validation부터 Direct Translated P2P까지)를 장치별로 켜고 끄는 형식입니다. 이전 판이 언급한 `pcie_acs_override`는 v6.12 `kernel-parameters.txt`에 없습니다(`grep -n acs_override` 결과 없음). ACS 기능이 없는 경로에서 group 표시만 바꾸는 것은 하드웨어 격리를 만들지 않습니다.

## L0p — 부분폭 저전력 상태

[Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)의 ASPM 상태는 링크 전체를 재웁니다. L0p는 링크를 L0에 둔 채 폭을 줄이는 상태입니다. PCI-SIG 웹사이트는 이번 작업에서 자동 접근을 막아 열지 못했고, L0p를 설명한 vendor 블로그도 403으로 열리지 않았습니다. 그래서 L0p는 [CXL 3.1 공개 규격](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf) §5.1.2.5의 문장으로만 확인합니다. 그 절은 CXL의 256B Flit mode가 "L0p as defined in PCIe Base Specification"을 지원하며, PCIe가 Link Management DLLP로 하는 L0p 폭 협상을 CXL에서는 ARB/MUX ALMP로 대신한다고 적습니다.

이 문장에서 확인되는 것은 L0p가 링크 폭에 대한 상태이고, PCIe에서는 Link Management DLLP로 양쪽이 협상하며, CXL은 256B Flit mode에서 이를 지원한다는 점입니다. 최소 활성 lane 수나 전력 절감량은 이번에 연 자료에 없어 적지 않습니다. Linux v6.12와 2026-11-16의 mainline `pci_regs.h`에는 L0p 관련 정의가 없고, 시리즈 VM 장치는 Flit Mode가 아니므로 해당이 없습니다.

## 정리

- **Lane Margining**: 16 GT/s 이상 포트에 필수인 수신기 내부 측정이고, `pcilmr`은 측정 중 ASPM·autonomous speed/width 설정을 바꿨다가 되돌립니다. 시리즈 VM에는 대상 링크가 없었습니다.
- **10-bit Tag**: Tag 값 공간을 1024로 넓히지만 실제 범위는 구현이 정합니다(R-Tile x16은 768). Linux v6.12에는 정의가 없고 VM 장치도 미지원이었습니다.
- **TPH**: Steering Tag로 처리 위치 힌트를 싣고, 커널 지원은 v6.12보다 뒤의 `CONFIG_PCIE_TPH`에 있습니다.
- **ACS**: VM에서 ACS 유무가 IOMMU group을 갈랐고, `disable_acs_redir`·`config_acs`로 바꿀 수 있지만 격리를 약하게 만들 수 있습니다.
- **L0p**: 링크 폭에 대한 저전력 상태이며, 공개 자료로 확인한 범위는 CXL 3.1 §5.1.2.5까지입니다.

## 관련 항목

- [Ch 2: TLP — Transaction Layer Packet](/blog/embedded/hardware/pcie/chapter02-tlp) — Tag·non-posted 요청
- [Ch 6: Power Management — D·L-state·ASPM](/blog/embedded/hardware/pcie/chapter06-power-management) — L0p의 자리
- [Ch 8: Data Link Layer — FLIT Mode](/blog/embedded/hardware/pcie/chapter08-dllp) — Flit과 DLLP
- [Ch 9: Physical Layer — Equalization·SerDes](/blog/embedded/hardware/pcie/chapter09-physical-layer) — Lane Margining의 맥락
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — ACS와 IOMMU group
- [Ch 12: Virtualization I — SR-IOV·VFIO](/blog/embedded/hardware/pcie/chapter12-virtualization-1) — ACS와 pass-through
- [원문 — pciutils 3.13.0 pcilmr.man](https://github.com/pciutils/pciutils/blob/v3.13.0/pcilmr.man)
- [원문 — Linux Kernel: TPH Support](https://docs.kernel.org/PCI/tph.html)

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12, pciutils 3.13.0, CXL 3.1 공개 규격 기준이고 VM 관찰은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
