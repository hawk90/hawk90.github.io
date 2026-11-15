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

[Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer)에서 물리 계층을, [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 DMA·IOMMU를 봤습니다. 이 장은 그 사이사이에 끼어 있지만 *자주 그냥 지나치는* spec 기능들을 모읍니다. 신호 무결성을 소프트웨어로 재는 *Lane Margining*, in-flight 요청을 늘리는 *10-bit Tag*, 처리 위치 힌트를 전달하는 TPH, 가상화 격리의 토대인 *ACS*, 그리고 대역폭에 비례해 전력을 줄이는 *L0p*입니다.

## 한 줄 요약

> **"코어 동작 너머의 다섯 기능이 *진단·성능·격리·전력*을 각각 풉니다."** — *Lane Margining*은 *오실로스코프 없이* receiver eye를 재고, *10-bit Tag*는 *outstanding 요청을 256→768*로 늘리며, *TPH*는 *DMA 데이터를 특정 캐시로 steering*하고, *ACS*는 *IOMMU group 입도*를 정하며, *L0p*는 활성 lane 폭을 조절해 전력을 줄이는 데 쓰입니다.

이 장은 [pciutils v3.13.0 pcilmr 매뉴얼](https://github.com/pciutils/pciutils/blob/v3.13.0/pcilmr.man), [Altera의 Tag Allocation](https://docs.altera.com/r/docs/683501/26.1/r-tile-avalon-streaming-ip-for-pci-express-user-guide/tag-allocation), 아래 PCI-SIG·Linux 자료를 기준으로 합니다. 실제 margin 측정·TPH 활성화·ACS 변경·L0p 전력 시험은 수행하지 않았습니다.

## Lane Margining — 신호 마진을 소프트웨어로 (PCIe 4.0+)

링크가 *지금 얼마나 여유 있게 동작하는지*는 전통적으로 오실로스코프로 eye diagram을 찍어야 알 수 있었습니다. PCIe 4.0은 이 측정을 *receiver 안으로* 넣었습니다. **Lane Margining at Receiver**는 *16 GT/s 이상* 모든 포트(리타이머 포함)에 *필수*이며, 링크가 *L0(정상 동작)인 채로* 추가 하드웨어 없이 마진을 잽니다.

측정하는 것은 두 축입니다.

- **eye width (시간 마진)** — 샘플링 지점을 좌우로 옮기며 에러가 나기 시작하는 경계.
- **eye height (전압 마진)** — 샘플링 임계 전압을 위아래로 옮기며 찾는 경계.

pciutils 3.13.0 매뉴얼은 16·32 GT/s link 지원과 D0 등 조건을 설명합니다. 16 GT/s의 timing margining은 필수지만 voltage margining은 선택적이며, 32 GT/s 이상에서는 voltage도 요구됩니다. Receiver 내부의 마진 근사치이므로 oscilloscope의 전체 eye capture·compliance 결과와 같지는 않습니다. 이 utility는 ASPM과 autonomous speed·width 설정을 일시 변경하므로 단순 조회로 취급하지 않습니다.

매뉴얼의 `pcilmr --margin BDF`는 선택 link를 측정하는 형식입니다. `--margin` 자체가 receiver·step 지정 옵션은 아닙니다. 실제 receiver·lane·step과 grading 정책은 같은 판의 옵션과 device quirk를 확인해야 합니다. 측정 중 오류·중단과 설정 복원도 시험 범위에 넣습니다.


마진이 좁으면 *케이블·커넥터·리타이머* 문제를 의심합니다. [Ch 16 Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting)의 신호 무결성 시나리오와 직접 연결되는, *현장에서 가장 실용적인* 기능입니다.

## 10-bit Tag — outstanding 요청 확장 (PCIe 4.0)

[Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)에서 non-posted 요청이 *Tag*로 식별된다는 것을 봤습니다. Tag는 *완료(Completion)가 돌아올 때까지* 그 요청을 구분하는 번호입니다. 기존 8-bit Tag는 *256개*의 outstanding 요청만 허용했습니다.

문제는 *대역폭 × 지연*이 큰 링크입니다. Gen4 x16처럼 빠르고, 리타이머·스위치로 *왕복 지연이 긴* 경로에서는 256개로는 파이프를 다 채우지 못해 *대역폭이 outstanding 수에 묶입니다*. **10-bit Tag**는 Tag 공간을 *768개*까지 늘려 이 한계를 풉니다.

requester와 completer가 *둘 다 지원*할 때만 켜지며, 효과는 [Ch 17 Performance](/blog/embedded/hardware/pcie/chapter17-performance)의 *bandwidth-delay product* 논의와 맞닿습니다.

## TPH·Steering Tags — 캐시 주입 힌트 (PCIe 3.1+)

DMA로 들어온 데이터는 보통 *메모리에 쓰인 뒤* CPU가 다시 읽어 캐시로 올립니다. 네트워크·스토리지처럼 *방금 도착한 데이터를 곧바로 처리*하는 경우, 이 왕복이 낭비입니다.

**TPH(TLP Processing Hints)**는 endpoint가 *이 데이터는 어느 캐시로 가야 한다*는 힌트를 TLP 헤더에 실어 보내게 합니다. 힌트의 실체는 **Steering Tag(ST)**로, 호스트의 캐시 구조를 가리키는 값입니다. Host가 지원하는 방식으로 힌트를 활용할 수 있지만, ST가 곧 물리 cache 번호이거나 특정 cache 주입·hit를 보장하는 것은 아닙니다. DDIO와 TPH도 동일한 기능이 아닙니다.

TPH는 *옵션 extended capability*이고, 실제 발견·활성화 API는 사용하는 kernel과 driver의 지원을 확인합니다. [Linux TPH 문서](https://docs.kernel.org/PCI/tph.html)는 별도로 판을 확인할 구현 자료이며, 이 장에서 고정한 v6.12 전체 지원을 입증하는 출처는 아닙니다. [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)의 DMA 경로 최적화의 연장선입니다.

## ACS — 격리와 P2P 리다이렉트 제어 (PCIe 2.0+)

스위치나 root port 아래 두 endpoint가 있을 때, downstream port는 둘 사이의 트래픽을 *위로 보내지 않고 바로 우회(P2P redirect)*시킬 수 있습니다. 성능에는 좋지만 *보안에는 치명적*입니다. 우회가 *IOMMU 아래*에서 일어나면 IOMMU가 *주소 변환·격리*를 할 기회를 잃기 때문입니다.

**ACS(Access Control Services)**는 이 우회를 *제어*합니다. TLP를 *정상 라우팅·차단·강제 상향(IOMMU로)* 중 어떻게 다룰지 정하는 제어점입니다. 그래서 ACS는 [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)의 IOMMU와 [Ch 12 Virtualization](/blog/embedded/hardware/pcie/chapter12-virtualization-1)의 pass-through에 *직접* 영향을 줍니다.

실무에서 ACS는 **IOMMU group 입도**로 드러납니다. ACS가 없거나 약하면 여러 디바이스가 *한 group으로 묶여* 따로 VM에 할당할 수 없습니다.

특정 장치의 sysfs `iommu_group` link와 그 group의 `devices` 목록을 먼저 확인합니다. ACS capability뿐 아니라 control의 활성 bit, topology·DMA alias를 같이 봅니다. Group 하나가 보인다고 reset 격리나 전체 confidential I/O가 보장되는 것은 아닙니다.


`pcie_acs_override`는 일부 배포·외부 patch에서 제공되는 옵션이며 이 글의 Linux v6.12 mainline parameter로 가정하지 않습니다. 실제 ACS 기능이 없는 경로에서 group 표시를 바꿔도 하드웨어 격리는 생기지 않습니다.

## L0p — 부분폭 저전력 상태 (PCIe 6.0)

[Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)에서 D-state·L-state·ASPM을 봤습니다. 기존 저전력 상태는 *링크 전체*를 재우는 방식이라, 다시 깨우는 *지연*과 *전력 절약*이 trade-off였습니다.

PCIe 6.0의 **L0p(Low-power Partial-width State)**는 발상을 바꿉니다. L0(정상)의 *하위 상태*로, *일부 lane만 electrical idle*로 재우고 *나머지는 계속 데이터를 나릅니다*. 각 방향에 *최소 1 lane은 항상 활성*이라 *데이터 흐름이 멈추지 않습니다*. 활성 폭을 줄이는 절전 기능이며 전력이 대역폭이나 lane 수에 정확히 비례한다는 보장은 아닙니다. 고정 PHY·clock·controller 비용과 폭 변경 동작도 남습니다.

전제 조건이 둘 있습니다.

- **FLIT 모드 전용** — [Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)에서 본 256B FLIT 위에서만 동작합니다.
- **양측 협상** — 링크 트레이닝의 Configuration.Complete 단계에서 *둘 다 지원*해야 켜집니다.

[PCI-SIG의 PCIe 6.0 기능 설명](https://pcisig.com/blog/pci-express%C2%AE-60-specification-functionality-updates-%E2%80%93-part-2)은 Flit Mode에서 L0p가 선택적이고 retimer도 이를 지원한다고 설명합니다. Retimer 필수 조건은 Flit Mode를 지원하는 해당 구성에 한정해 읽어야 합니다. AI·데이터센터처럼 *링크는 x16으로 깔되 평소 트래픽은 적은* 환경에서 전력 효율을 크게 끌어올립니다.

## 정리

- **Lane Margining** — 지원 속도·timing/voltage 조건과 도구의 설정 변경을 확인해 receiver 마진을 측정합니다.
- **10-bit Tag** — outstanding 요청을 256→768로 확장. 고대역·고지연 링크의 대역폭 한계를 푼다.
- **TPH·Steering Tags** — 처리 위치 힌트이며 실제 활용은 host·driver 지원에 달려 있습니다.
- **ACS** — P2P 우회 경로 제어에 쓰이며 topology·alias와 함께 격리 범위를 확인합니다.
- **L0p** — FLIT 모드 부분폭 저전력. 활성 폭을 조절해 절전하며 지원·협상 조건과 실제 전력을 확인합니다.

## 관련 항목

- [Ch 2: TLP — Transaction Layer Packet](/blog/embedded/hardware/pcie/chapter02-tlp) — Tag·non-posted 요청
- [Ch 6: Power Management — D·L-state·ASPM](/blog/embedded/hardware/pcie/chapter06-power-management) — L0p의 자리
- [Ch 8: Data Link Layer — FLIT Mode](/blog/embedded/hardware/pcie/chapter08-dllp) — L0p의 전제
- [Ch 9: Physical Layer — Equalization·SerDes](/blog/embedded/hardware/pcie/chapter09-physical-layer) — Lane Margining의 맥락
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — TPH·ACS의 무대
- [Ch 12: Virtualization I — SR-IOV·VFIO](/blog/embedded/hardware/pcie/chapter12-virtualization-1) — ACS와 pass-through
- [원문 — pcilmr(8) man page](https://man7.org/linux/man-pages/man8/pcilmr.8.html)
- [원문 — Linux Kernel: TPH Support](https://docs.kernel.org/PCI/tph.html)
- [원문 — Rambus: L0p and FLIT Mode in PCIe 6.x](https://www.rambus.com/blogs/revolutionizing-power-efficiency-in-pcie-6x-l0p-and-flit-mode-in-action/)
