---
title: "Ch 19: 고급 기능 — Lane Margining·10-bit Tag·TPH·ACS·L0p"
date: 2026-05-19T09:19:00
description: "코어 동작 너머의 PCIe spec 기능들 — Lane Margining(신호 마진 측정)·10-bit Tag(outstanding 확장)·TPH(캐시 주입 힌트)·ACS(격리)·L0p(부분폭 저전력)을 실무 관점에서 정리합니다."
series: "PCIe Deep Dive"
seriesOrder: 19
tags: [pcie, lane-margining, tph, acs, l0p, advanced]
draft: true
---

[Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer)에서 물리 계층을, [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 DMA·IOMMU를 봤습니다. 이 장은 그 사이사이에 끼어 있지만 *자주 그냥 지나치는* spec 기능들을 모읍니다. 신호 무결성을 소프트웨어로 재는 *Lane Margining*, in-flight 요청을 늘리는 *10-bit Tag*, 캐시에 직접 꽂는 *TPH*, 가상화 격리의 토대인 *ACS*, 그리고 대역폭에 비례해 전력을 줄이는 *L0p*입니다.

## 한 줄 요약

> **"코어 동작 너머의 다섯 기능이 *진단·성능·격리·전력*을 각각 풉니다."** — *Lane Margining*은 *오실로스코프 없이* receiver eye를 재고, *10-bit Tag*는 *outstanding 요청을 256→768*로 늘리며, *TPH*는 *DMA 데이터를 특정 캐시로 steering*하고, *ACS*는 *IOMMU group 입도*를 정하며, *L0p*는 *쓰는 lane 수만큼만 전력*을 씁니다.

## Lane Margining — 신호 마진을 소프트웨어로 (PCIe 4.0+)

링크가 *지금 얼마나 여유 있게 동작하는지*는 전통적으로 오실로스코프로 eye diagram을 찍어야 알 수 있었습니다. PCIe 4.0은 이 측정을 *receiver 안으로* 넣었습니다. **Lane Margining at Receiver**는 *16 GT/s 이상* 모든 포트(리타이머 포함)에 *필수*이며, 링크가 *L0(정상 동작)인 채로* 추가 하드웨어 없이 마진을 잽니다.

측정하는 것은 두 축입니다.

- **eye width (시간 마진)** — 샘플링 지점을 좌우로 옮기며 에러가 나기 시작하는 경계.
- **eye height (전압 마진)** — 샘플링 임계 전압을 위아래로 옮기며 찾는 경계.

Linux에서는 `pciutils`의 `pcilmr`로 실행합니다. 동작 중인 링크에서 바로 마진을 떠 볼 수 있습니다.

```bash
# 특정 포트의 모든 lane 마진 (시간·전압)
sudo pcilmr 3d:00.0

# receiver 번호·step 지정
sudo pcilmr --margin 3d:00.0
```

마진이 좁으면 *케이블·커넥터·리타이머* 문제를 의심합니다. [Ch 16 Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting)의 신호 무결성 시나리오와 직접 연결되는, *현장에서 가장 실용적인* 기능입니다.

## 10-bit Tag — outstanding 요청 확장 (PCIe 4.0)

[Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)에서 non-posted 요청이 *Tag*로 식별된다는 것을 봤습니다. Tag는 *완료(Completion)가 돌아올 때까지* 그 요청을 구분하는 번호입니다. 기존 8-bit Tag는 *256개*의 outstanding 요청만 허용했습니다.

문제는 *대역폭 × 지연*이 큰 링크입니다. Gen4 x16처럼 빠르고, 리타이머·스위치로 *왕복 지연이 긴* 경로에서는 256개로는 파이프를 다 채우지 못해 *대역폭이 outstanding 수에 묶입니다*. **10-bit Tag**는 Tag 공간을 *768개*까지 늘려 이 한계를 풉니다.

requester와 completer가 *둘 다 지원*할 때만 켜지며, 효과는 [Ch 17 Performance](/blog/embedded/hardware/pcie/chapter17-performance)의 *bandwidth-delay product* 논의와 맞닿습니다.

## TPH·Steering Tags — 캐시 주입 힌트 (PCIe 3.1+)

DMA로 들어온 데이터는 보통 *메모리에 쓰인 뒤* CPU가 다시 읽어 캐시로 올립니다. 네트워크·스토리지처럼 *방금 도착한 데이터를 곧바로 처리*하는 경우, 이 왕복이 낭비입니다.

**TPH(TLP Processing Hints)**는 endpoint가 *이 데이터는 어느 캐시로 가야 한다*는 힌트를 TLP 헤더에 실어 보내게 합니다. 힌트의 실체는 **Steering Tag(ST)**로, 호스트의 캐시 구조를 가리키는 값입니다. Root Complex가 이 ST를 보고 데이터를 *해당 캐시에 직접 주입*하면, CPU가 처리할 때 *cache hit* 확률이 올라갑니다.

TPH는 *옵션 extended capability*이고, Linux 커널은 *부팅 때 TPH를 발견*하지만 *실제 활성화는 디바이스 드라이버가 요청*합니다(`docs.kernel.org/PCI/tph`). [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)의 DMA 경로 최적화의 연장선입니다.

## ACS — 격리와 P2P 리다이렉트 제어 (PCIe 2.0+)

스위치나 root port 아래 두 endpoint가 있을 때, downstream port는 둘 사이의 트래픽을 *위로 보내지 않고 바로 우회(P2P redirect)*시킬 수 있습니다. 성능에는 좋지만 *보안에는 치명적*입니다. 우회가 *IOMMU 아래*에서 일어나면 IOMMU가 *주소 변환·격리*를 할 기회를 잃기 때문입니다.

**ACS(Access Control Services)**는 이 우회를 *제어*합니다. TLP를 *정상 라우팅·차단·강제 상향(IOMMU로)* 중 어떻게 다룰지 정하는 제어점입니다. 그래서 ACS는 [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)의 IOMMU와 [Ch 12 Virtualization](/blog/embedded/hardware/pcie/chapter12-virtualization-1)의 pass-through에 *직접* 영향을 줍니다.

실무에서 ACS는 **IOMMU group 입도**로 드러납니다. ACS가 없거나 약하면 여러 디바이스가 *한 group으로 묶여* 따로 VM에 할당할 수 없습니다.

```bash
# 디바이스의 IOMMU group 확인
for d in /sys/kernel/iommu_groups/*/devices/*; do
  echo "group $(basename $(dirname $(dirname $d))): $(basename $d)"
done | sort -n

# ACS capability 보유 여부
sudo lspci -vvv | grep -i 'Access Control'
```

ACS가 펌웨어에 없을 때 격리를 *강제로 분리*하는 `pcie_acs_override` 커널 파라미터가 있지만, *보안 보장을 깨는* 우회라 production에서는 신중해야 합니다.

## L0p — 부분폭 저전력 상태 (PCIe 6.0)

[Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)에서 D-state·L-state·ASPM을 봤습니다. 기존 저전력 상태는 *링크 전체*를 재우는 방식이라, 다시 깨우는 *지연*과 *전력 절약*이 trade-off였습니다.

PCIe 6.0의 **L0p(Low-power Partial-width State)**는 발상을 바꿉니다. L0(정상)의 *하위 상태*로, *일부 lane만 electrical idle*로 재우고 *나머지는 계속 데이터를 나릅니다*. 각 방향에 *최소 1 lane은 항상 활성*이라 *데이터 흐름이 멈추지 않습니다*. 즉 *쓰는 대역폭만큼만 전력*을 쓰도록 lane 수를 동적으로 조절합니다.

전제 조건이 둘 있습니다.

- **FLIT 모드 전용** — [Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)에서 본 256B FLIT 위에서만 동작합니다.
- **양측 협상** — 링크 트레이닝의 Configuration.Complete 단계에서 *둘 다 지원*해야 켜집니다.

지원은 대부분의 포트에 *옵션*이지만, *리타이머에는 필수*입니다. AI·데이터센터처럼 *링크는 x16으로 깔되 평소 트래픽은 적은* 환경에서 전력 효율을 크게 끌어올립니다.

## 정리

- **Lane Margining** — 16 GT/s+ 필수. L0에서 eye width·height를 소프트웨어로 측정(`pcilmr`). 신호 무결성 진단의 1선.
- **10-bit Tag** — outstanding 요청을 256→768로 확장. 고대역·고지연 링크의 대역폭 한계를 푼다.
- **TPH·Steering Tags** — DMA 데이터를 특정 캐시로 steering해 cache hit을 높임. 커널 발견 + 드라이버 활성.
- **ACS** — TLP P2P 우회를 제어해 IOMMU 격리를 보장. IOMMU group 입도를 결정.
- **L0p** — FLIT 모드 부분폭 저전력. 쓰는 lane만큼만 전력. 리타이머 필수.

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
