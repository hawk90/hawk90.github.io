---
title: "Ch 17: Performance — Bandwidth·Latency·Tuning"
slug: "embedded/hardware/pcie/chapter17-performance"
date: 2026-05-19T09:17:00
description: "PCIe 성능 — theoretical vs effective BW·MaxPayload·MaxReadReq·latency breakdown·NUMA·P2P·ASPM 영향·tuning."
series: "PCIe Deep Dive"
seriesOrder: 17
tags: [pcie, performance, bandwidth, latency, max-payload, tuning]
draft: false
topics: ["embedded", "embedded/hardware"]
---


## 대역폭 계산과 측정을 구분하기

PCIe 속도는 link rate 하나로 결정되지 않습니다. TLP 크기·outstanding 요청·응답 지연·경로의 경합·메모리 배치·장치 내부 처리 능력을 나눠 봐야 합니다. 이 요인을 하나의 고정된 효율 비율로 곱하거나, 특정 설정만으로 1.5~3배 빨라진다고 단정할 수는 없습니다.

이 장은 [PCI-SIG의 Flit 공개 설명](https://pcisig.com/blog/evolution-pci-express-specification-its-sixth-generation-third-decade-and-still-going-strong)과 [Linux v6.12 PCI register 정의](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/uapi/linux/pci_regs.h), DMA·P2PDMA 문서를 기준으로 계산과 실험 설계를 설명합니다. 실제 NVMe·NIC·GPU benchmark는 실행하지 않았습니다. 아래 계산값을 장치 실측 결과로 사용하면 안 됩니다.

## 한 방향 link 상한

Gen 3~5의 128b/130b 반영 값과 Gen 6~7의 Flit 전송률을 같은 “effective” 열에 섞지 않습니다. 방향과 overhead를 먼저 고정합니다.

| x16 링크 | 한 방향 계산 | 포함하지 않은 것 |
|------|------|------|
| Gen 3 | 8 × 16 / 8 × 128/130 ≈ 15.75 GB/s | TLP·DLL·idle 등 |
| Gen 4 | 16 × 16 / 8 × 128/130 ≈ 31.51 GB/s | TLP·DLL·idle 등 |
| Gen 5 | 32 × 16 / 8 × 128/130 ≈ 63.02 GB/s | TLP·DLL·idle 등 |
| Gen 6 | 64 × 16 / 8 = 128 GB/s 명목 | Flit·CRC·FEC·idle 등 |
| Gen 7 | 128 × 16 / 8 = 256 GB/s 명목 | Flit·CRC·FEC·idle 등 |

PCIe 6.0의 Flit은 256 B 중 236 B가 TLP 영역입니다. 따라서 Gen 6 x16에서 128 × 236/256 = 118 GB/s는 이 영역만 고려한 산술 상한입니다. TLP header도 이 영역에 들어가고 padding·실제 packing·SKP·경합 등이 남으므로 애플리케이션 payload 118 GB/s 보장은 아닙니다. 양방향 합계가 필요하면 별도로 표시하고 실제로 양방향을 동시에 포화시킨 부하인지 확인합니다.

## MPS와 MRRS

MPS는 TLP가 실을 수 있는 data payload의 상한이며, 실제 장치가 매번 그만큼 묶어 보낸다는 뜻은 아닙니다. MRRS는 requester가 한 Memory Read로 요청하는 data 크기의 상한입니다. Read Request 자체에 그 크기의 payload가 실리는 것은 아닙니다.

4 DW header 16 B와 data만 계산하는 단순 TLP 예에서 payload 비율은 다음과 같습니다. Prefix·ECRC·DLL·encoding 비용은 제외했으므로 wire 효율과 다릅니다.

| Payload | Payload / (16 + Payload) |
|------|------|
| 128 B | 88.9% |
| 256 B | 94.1% |
| 512 B | 97.0% |

작은 전송은 MPS를 높여도 자동으로 큰 TLP가 되지 않습니다. Read의 completion 크기는 MPS·boundary·completer의 동작에 영향을 받으므로 MRRS를 키우는 것과 별개입니다. 지원 capability·현재 설정·전체 경로의 제약을 같이 확인해야 합니다.

[Ch 15의 실제 decoder 검사](/blog/embedded/hardware/pcie/chapter15-tools#실제-도구로-합성-필드-해석하기)에서 Device Control `0x2810`은 MPS 128 B·MRRS 512 B로 해석됐습니다. 전체 word를 이 값으로 쓰는 것을 MPS 256 B tuning이라고 제시할 수 없습니다. 이 작업에서는 setpci write를 실행하지 않았습니다.

## Outstanding 요청과 bandwidth-delay product

Read pipeline을 채우려면 응답이 돌아오는 동안 충분한 요청이 진행 중이어야 합니다. 목표 처리량을 B byte/s, 왕복 지연을 T s, 실제 요청당 처리 data를 S byte로 놓으면, 단순 모델에서 필요한 outstanding 수는 적어도 B × T / S 정도입니다. Tag·credit·buffer·device queue 한계와 completion 분할은 별도로 남습니다.

예를 들어 32 GB/s × 1 µs / 256 B = 125개입니다. 이 값은 임의 조건의 산술 예이며 실제 장치 지연이 1 µs라는 뜻은 아닙니다. 10-bit Tag 공간이 넓어져도 driver와 hardware의 실제 요청 한도나 memory bandwidth가 병목이면 성능은 늘지 않습니다.

End-to-end 지연에는 요청 전송·queue 대기·장치 처리·completion 전송·CPU/driver 관찰이 들어갑니다. Hop마다 같은 고정 ns를 가정하기보다 무엇의 시작과 끝을 재는지 정의합니다. 평균뿐 아니라 p50·p99와 queue depth·offered load를 기록해야 합니다.

## 애플리케이션 방향과 PCIe 방향

NVMe 명령의 Read/Write는 PCIe TLP의 MRd/MWr와 같지 않습니다. 이름이 같다는 이유로 방향을 대응시키면 병목을 반대로 해석할 수 있습니다.

| 작업 | 대표적인 PCIe data 경로 |
|------|------|
| NIC RX | NIC가 받은 packet을 host memory로 DMA write |
| NIC TX | NIC가 host의 packet을 DMA read하고 completion data를 받음 |
| NVMe Read | Controller가 storage data를 host memory에 DMA write |
| NVMe Write | Controller가 host data를 DMA read |

Descriptor fetch·doorbell·completion queue·interrupt 등 다른 traffic도 있으므로 위 표는 data 경로의 출발점입니다. GPU workload 전체를 항상 Posted Write 중심이라고 분류하지 않습니다.

## NUMA·전력·P2P를 비교하는 방법

장치 locality와 실행 CPU·buffer 배치를 함께 기록합니다. Sysfs `numa_node`의 -1은 유효한 node 번호가 아니라 locality를 알 수 없는 경우입니다. Remote 배치의 손실을 고정 5~30%로 가정하지 말고, 실제 memory controller·interconnect와 부하를 비교합니다.

ASPM은 idle 전력과 burst 지연 사이의 선택에 영향을 줍니다. 고정된 복귀 시간표나 “서버이면 off” 규칙 대신 [Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)의 상태·정책·실제 측정을 구분합니다. RO·No Snoop의 순서·coherency 계약도 CPU barrier 하나로 복원할 수는 없습니다.

[P2PDMA 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/pci/p2pdma.rst)는 provider·client·topology 제약을 설명합니다. P2P라고 항상 Root Complex를 지나지 않는 것은 아니며, 같은 switch 아래에 있다는 사실만으로 임의 peer DMA를 지원하지는 않습니다. DDIO 역시 platform의 cache I/O 기능이지 모든 PCIe·CXL traffic의 고정 지연 절감 보장이 아닙니다.

## 실험 기록에 필요한 항목

| 항목 | 기록과 해석 |
|------|------|
| 장치와 경로 | ID·firmware·driver·kernel, 양단 LnkCap/LnkSta, switch 공유 upstream |
| 부하 | 방향·전송 크기·queue depth·동시 요청·offered load·지속 시간 |
| 배치 | CPU·IRQ·buffer NUMA, IOMMU·bounce·cache 조건 |
| 관찰 | 유효 payload 처리량, latency 분포, CPU 사용률·전력·오류·재전송 |
| 비교 | 한 설정씩 변경하고 같은 조건 반복. cold/warm·열 제한을 구분 |

`fio`·`iperf3`는 storage·network 경로 전체를 측정합니다. 그 숫자만으로 PCIe link가 포화됐다고 판정하지 않습니다. 장치·uncore counter의 의미와 방향을 확인해 애플리케이션 처리량과 대조해야 합니다. 더 큰 MPS·MRRS나 coalescing이 이득인지도 workload와 정확성 조건을 유지한 비교로 판단합니다.

## 정리

- 방향·단위·encoding·Flit 비용을 구분해 상한을 계산합니다.
- MPS·MRRS와 실제 전송 크기는 다르며, 작은 요청을 설정만으로 합칠 수는 없습니다.
- B × T / S는 outstanding 수를 가늠하는 단순 모델이며 실제 자원 한도를 확인합니다.
- NVMe Read/Write와 PCIe MRd/MWr의 방향을 구분합니다.
- NUMA·전력·ordering·P2P는 지원 조건과 실제 latency 분포·처리량을 함께 비교합니다.

## 다음 편

[Ch 18: Register Maps — Configuration Space 비트 reference](/blog/embedded/hardware/pcie/chapter18-register-maps)에서 *Configuration·PCIe Cap·AER·MSI/MSI-X·SR-IOV의 비트별 reference*를 제공합니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals) — Gen·encoding
- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — Posted·Non-Posted·attribute
- [Ch 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management) — ASPM
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — DMA 소유권·주소 변환

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
