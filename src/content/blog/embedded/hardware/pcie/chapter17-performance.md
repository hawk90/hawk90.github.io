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

PCIe 성능은 link rate 하나로 정해지지 않습니다. TLP 크기, 동시에 걸린 요청 수, 응답 지연, 경로 경합, 메모리 배치, 장치 내부 처리 능력이 모두 끼어듭니다. 이 장은 계산으로 알 수 있는 상한과 측정해야만 알 수 있는 값을 나누고, 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에서 그 둘이 얼마나 다를 수 있는지 보여 줍니다. 실제 하드웨어 NVMe·NIC·GPU 벤치마크는 하지 않았습니다.

## 한 방향 link 상한

Linux v6.12는 link 대역폭을 `PCIE_SPEED2MBS_ENC()`(`drivers/pci/pci.h:345-352`)로 계산합니다. 8b/10b와 128b/130b 손실은 빼고, 64 GT/s는 1/1로 둡니다. 같은 정수 계산으로 x16 한 방향을 구한 값입니다([Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)의 `bw2.py`).

| Rate | lane당 Mb/s (Linux) | x16 한 방향 | 빼지 않은 것 |
|------|------|------|------|
| 8 GT/s | 7876 | 15.752 GB/s | TLP header, DLLP, idle |
| 16 GT/s | 15753 | 31.506 GB/s | 같음 |
| 32 GT/s | 31507 | 63.014 GB/s | 같음 |
| 64 GT/s | 64000 | 128.000 GB/s | Flit 안의 CRC·FEC 등 포함 전부 |
| 128 GT/s | Linux v6.12에 없음 | raw 256 GB/s | 같음 |

64 GT/s 이상에서 Flit 하나 중 TLP가 차지하는 비율은 이번에 연 공개 자료에 PCIe 기준 수치가 없어 계산하지 않았습니다. 참고로 [CXL 3.1 공개 규격](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf) §6.2.3.1.1의 CXL.io Standard 256B Flit은 header 2바이트, data 240바이트(끝 4바이트가 DLLP), CRC 8바이트, FEC 6바이트입니다([Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)). 이것은 CXL.io의 배치이고 PCIe Flit의 효율로 옮겨 쓰지 않습니다.

## 계산한 상한과 측정값이 어긋나는 예

시리즈 VM의 NVMe는 `current_link_speed`가 `2.5 GT/s PCIe`, 폭 1입니다. 위 Linux 계산대로면 이 링크의 상한은 2000 Mb/s, 250 MB/s입니다. 같은 장치를 읽었습니다.

```bash
dd if=/dev/nvme0n1 of=/dev/null bs=1M count=64 iflag=direct
```

```text
2.5 GT/s PCIe
1
67108864 bytes (67 MB, 64 MiB) copied, 0.0611686 s, 1.1 GB/s
67108864 bytes (67 MB, 64 MiB) copied, 0.047526 s, 1.4 GB/s
67108864 bytes (67 MB, 64 MiB) copied, 0.0563294 s, 1.2 GB/s
```

250 MB/s 상한의 네 배 이상이 나왔고, 아래 1 MiB 측정에서는 일곱 배를 넘었습니다. QEMU의 Link Status는 training 결과가 아니라 복사된 값이고([Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)), 에뮬레이션 NVMe의 데이터는 그 링크를 실제로 지나지 않기 때문입니다. 실제 하드웨어에서는 반대 방향의 착각이 생깁니다. `fio`나 `dd`가 낮게 나왔다고 링크가 병목이라는 뜻은 아니고, 링크 계산값이 높다고 장치가 그만큼 낸다는 뜻도 아닙니다. 계산값은 상한, 측정값은 그 경로 전체의 결과입니다.

같은 장치에서 요청 크기만 바꿨습니다.

```text
bs=4k: 67108864 bytes (67 MB, 64 MiB) copied, 1.53756 s, 43.6 MB/s
bs=64k: 67108864 bytes (67 MB, 64 MiB) copied, 0.121483 s, 552 MB/s
bs=1M: 67108864 bytes (67 MB, 64 MiB) copied, 0.0375765 s, 1.8 GB/s
```

`dd`는 요청 하나가 끝나야 다음 요청을 내므로, 4 KiB 요청에서는 요청마다 붙는 고정 비용이 처리량을 정합니다. 4 KiB에서 1 MiB로 키우자 약 40배가 됐습니다. 이 VM의 숫자는 에뮬레이션 비용을 재는 것이라 하드웨어 성능으로 쓰지 않지만, 요청 크기와 동시 요청 수가 처리량을 좌우한다는 구조는 같습니다. 아래 두 절이 그 구조입니다.

## MPS와 MRRS

MPS는 TLP 하나가 실을 수 있는 data의 상한이고, MRRS는 Memory Read 하나로 요청할 수 있는 양의 상한입니다([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)의 `pci_regs.h:507-524`, 128~4096바이트). 시리즈 VM 장치는 모두 DevCap의 MPS 상한이 128바이트였습니다.

TLP header를 H바이트, payload를 P바이트로 두면 header를 뺀 payload 비율은 P / (H + P)입니다. header 크기는 TLP 종류마다 다르고([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)의 Configuration Request는 3 DW = 12바이트), 아래는 H를 12와 16으로 둔 산술입니다. DLLP·sequence number·CRC·encoding은 넣지 않았습니다.

| Payload P | H = 12 | H = 16 |
|------|------|------|
| 128 B | 91.4% | 88.9% |
| 256 B | 95.5% | 94.1% |
| 512 B | 97.7% | 97.0% |

MPS를 키워도 장치가 작은 요청을 보내면 TLP는 커지지 않습니다. [Ch 15](/blog/embedded/hardware/pcie/chapter15-tools)에서 Device Control 0x2810이 MPS 128·MRRS 512로 해석된 것처럼, 레지스터 word 하나에 여러 필드가 함께 들어 있다는 점도 설정을 바꿀 때 주의할 부분입니다.

## Outstanding 요청과 bandwidth-delay product

Read는 Completion이 돌아와야 끝나므로, 링크를 채우려면 응답을 기다리는 동안 다른 요청이 계속 걸려 있어야 합니다. 목표 처리량 B, 왕복 지연 T, 요청 하나의 data S로 두면 필요한 동시 요청 수는 적어도 B × T / S입니다. 예를 들어 B = 32 GB/s, T = 1 µs, S = 256 B를 넣으면 125개입니다. T = 1 µs는 계산을 보이기 위한 가정이고 측정값이 아닙니다.

동시 요청 수의 위쪽은 Tag 폭이 막습니다([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)). 위 125개는 8비트 Extended Tag 공간(256) 안에 들어가지만, 장치와 드라이버의 queue 깊이, credit, 메모리 대역폭이 먼저 막을 수도 있습니다. 위 `dd`의 4 KiB 결과는 동시 요청이 1개인 극단적인 경우입니다.

## 애플리케이션 방향과 PCIe 방향

"읽기"와 "쓰기"는 보는 쪽에 따라 뒤집힙니다. Linux는 블록 요청의 DMA 방향을 `rq_dma_dir()`(`include/linux/blk-mq.h:230-231`)로 정하는데, 쓰기 요청은 `DMA_TO_DEVICE`, 읽기 요청은 `DMA_FROM_DEVICE`입니다. 즉 NVMe Read는 장치가 host 메모리에 쓰는 DMA입니다. NIC도 같아서 igb는 송신 buffer를 `DMA_TO_DEVICE`(`igb_tx_map()`, `igb_main.c:6208`), 수신 page를 `DMA_FROM_DEVICE`(9043-9046행)로 매핑합니다. [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)의 `edu` 실험에서도 RAM→EDU는 장치가 메모리를 읽고, EDU→RAM은 장치가 메모리에 씁니다.

| 작업 | DMA API 방향 | 장치가 하는 일 |
|------|------|------|
| NVMe Read | `DMA_FROM_DEVICE` | host 메모리에 씀 |
| NVMe Write | `DMA_TO_DEVICE` | host 메모리를 읽음 |
| NIC 수신 | `DMA_FROM_DEVICE` | host 메모리에 씀 |
| NIC 송신 | `DMA_TO_DEVICE` | host 메모리를 읽음 |

병목을 볼 때 이 표를 거꾸로 읽으면 반대 방향의 credit이나 대역폭을 의심하게 됩니다. descriptor fetch, doorbell, completion queue, 인터럽트 같은 다른 트래픽도 함께 흐릅니다.

## NUMA·전력·P2P를 비교하는 방법

장치 locality는 sysfs `numa_node`로 봅니다. 시리즈 VM의 NVMe는 `-1`이었고, 이는 커널이 locality를 모른다는 뜻입니다. 단일 node VM이라 원격 메모리 비용은 재지 않았습니다.

ASPM은 idle 전력과 깨어나는 지연 사이의 선택입니다. [Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)에서 본 대로 sysfs 설정이 레지스터에 반영됐는지부터 확인해야 비교가 의미를 가집니다.

장치끼리 직접 주고받는 P2PDMA는 [Linux v6.12 P2PDMA 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/pci/p2pdma.rst)가 provider·client·topology 조건을 설명합니다. Debian 13 arm64 커널은 `# CONFIG_PCI_P2PDMA is not set`이라 이 VM에서는 쓸 수 없습니다.

## 실험 기록에 필요한 항목

| 항목 | 이 장의 `dd` 실험에서 남긴 것 |
|------|------|
| 장치와 경로 | QEMU NVMe, `current_link_speed` 2.5 GT/s, 폭 1, 커널 6.12.116 |
| 부하 | 읽기, `iflag=direct`, 요청 크기 4K·64K·1M, 64 MiB, 동시 요청 1 |
| 반복 | 1M 요청 3회(1.1·1.4·1.2 GB/s) |
| 해석 한계 | 에뮬레이션 장치라 링크 상한과 무관 |

한 번에 한 가지만 바꾸고, 같은 조건을 반복하고, 결과에 그 조건을 같이 적습니다. 위 1M 요청 세 번만 해도 1.1~1.4 GB/s로 흔들렸습니다.

## 정리

- Linux는 8·16·32 GT/s에 128/130, 64 GT/s에 1/1을 써서 link 상한을 계산합니다. 32 GT/s x16 한 방향은 63.014 GB/s입니다.
- PCIe Flit의 TLP 비율은 공개 자료로 확인하지 못해 계산하지 않았습니다.
- 시리즈 VM의 NVMe는 2.5 GT/s x1(250 MB/s 상한)로 보고되지만 1.1~1.8 GB/s가 나왔습니다. 계산값과 측정값은 다른 것을 잽니다.
- 요청 크기를 4 KiB에서 1 MiB로 키우자 처리량이 약 40배가 됐습니다. 동시 요청 수는 B × T / S로 가늠합니다.
- NVMe Read는 `DMA_FROM_DEVICE`, 즉 장치가 host 메모리에 쓰는 DMA입니다.
- Debian 커널은 P2PDMA가 꺼져 있습니다.

## 다음 편

[Ch 18: Register Maps — Configuration Space 비트 reference](/blog/embedded/hardware/pcie/chapter18-register-maps)에서 이 시리즈가 읽은 레지스터 비트를 한곳에 모읍니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals) — rate·encoding
- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — Tag·MPS·MRRS
- [Ch 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management) — ASPM
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — DMA 방향과 주소 변환

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12 기준이고 측정은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
