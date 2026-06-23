---
title: "Ch 17: Performance — Bandwidth·Latency·Tuning"
date: 2026-05-19T09:17:00
description: "PCIe 성능 — theoretical vs effective BW·MaxPayload·MaxReadReq·latency breakdown·NUMA·P2P·ASPM 영향·tuning."
series: "PCIe Deep Dive"
seriesOrder: 17
tags: [pcie, performance, bandwidth, latency, max-payload, tuning]
draft: false
---

## 한 줄 요약

> **"PCIe 성능은 *theoretical BW × encoding overhead × MaxPayload 효율 × NUMA locality × Posted/Non-Posted 비율*에 의해 결정됩니다."** — *Effective BW*는 *theoretical의 70~90%*. *MaxPayload·MaxReadReq tuning*이 *throughput을 1.5~3배*. *Latency*는 *RC·switch·EP의 hop 누적*. *NUMA mismatch*가 *5~30% 손실*. *ASPM*은 *low-load 절전이지만 burst latency*.

[Ch 16 Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting)에서 *성능 미달 시나리오*를 봤습니다. 이 장은 *성능 측정·tuning의 전체 그림*을 본격적으로 분해합니다.

## Theoretical vs Effective Bandwidth

| Generation | per-lane raw | per-lane effective | x16 raw | x16 effective |
|-----------|-------------|--------------------|---------|--------------|
| Gen 3 | 8 GT/s | ~7.88 Gb/s | 128 GT/s | ~126 Gb/s (16 GB/s) |
| Gen 4 | 16 GT/s | ~15.75 Gb/s | 256 GT/s | ~252 Gb/s (32 GB/s) |
| Gen 5 | 32 GT/s | ~31.5 Gb/s | 512 GT/s | ~504 Gb/s (63 GB/s) |
| Gen 6 | 64 GT/s | ~63 Gb/s | 1024 GT/s | ~126 GB/s |
| Gen 7 | 128 GT/s | ~126 Gb/s | 2048 GT/s | ~252 GB/s |

*encoding overhead* (8b/10b 20%·128b/130b 1.5%·PAM4+FEC ~3%) 적용 후가 *effective*.

*실측 BW*는 *effective의 70~90%* — *TLP header overhead·ACK/NAK·Update FC·idle gap*.

## MaxPayloadSize (MPS) — TLP Payload 최대 크기

| MPS | Header overhead 비율 |
|-----|---------------------|
| 128 byte | ~12.5% (header 16 byte / 128 byte) |
| 256 byte | ~6% |
| 512 byte | ~3% |
| 1024 byte | ~1.5% |
| 4096 byte | ~0.4% |

*전 link의 device들이 최소값으로 협상*. *낮은 MPS device 하나*가 *전체를 끌어내림*.

```bash
# 현재 MPS 확인
lspci -vv | grep "MaxPayload"

# 변경 (driver·BIOS 지원해야)
setpci -s 01:00.0 CAP_EXP+8.W=0x2810  # MaxPayload 256
```

NVMe·Mellanox NIC은 *256·512 byte* 일반. *legacy device*가 *128 byte*면 *bottleneck*.

## MaxReadRequestSize (MRRS)

*outbound Memory Read TLP의 max payload*. 즉 *한 번에 얼마나 큰 read 요청*할지:

| MRRS | 효과 |
|------|------|
| 작음 (128 byte) | 여러 read TLP → header overhead |
| 큼 (4096 byte) | 적은 read TLP → 효율적 |

```bash
# 현재 MRRS
lspci -vv | grep "MaxReadReq"

# 변경
setpci -s 01:00.0 CAP_EXP+8.W=0x5810  # MRRS 4096
```

NVMe·NIC는 *4096 byte*가 일반. *MPS와 다름* — MPS는 *받을 수 있는 payload*, MRRS는 *요청할 size*.

## Latency Breakdown

End-to-end latency:

| 영역 | 일반 latency |
|------|-------------|
| CPU → Root Complex | < 100 ns |
| Root Complex → Switch | ~50~100 ns |
| Switch → Endpoint | ~50 ns/hop |
| Endpoint internal | device 의존 (NVMe ~10 µs·NIC ~µs) |
| Completion 돌아옴 | 같은 path 역순 |

*Latency = 2 × (hop count × hop latency) + endpoint processing*. *Direct attach (RC → EP)*가 *switch traversal*보다 빠름.

## Completion Combining·Coalescing

*큰 Read*는 *여러 Completion으로 split* (Ch 2). *Coalescing*이 *Completion 묶어 처리*:

| 기능 | 효과 |
|------|------|
| TLP coalescing | RC가 *여러 작은 Completion을 batch* — software overhead 감소 |
| NIC interrupt coalescing | 다수 packet → 한 interrupt |
| NVMe Q-depth | submission queue 깊이 |

`ethtool -C eth0 rx-usecs 100`처럼 *NIC-level tuning*.

## NUMA Locality

*Multi-socket system*에서 *device가 어느 socket에 매달려 있는지*:

| 시나리오 | latency·BW |
|---------|-----------|
| Same NUMA (local) | 최적 |
| Cross-NUMA (UPI/Infinity Fabric traverse) | *5~30% 손실* |

```bash
# Device NUMA
cat /sys/bus/pci/devices/0000:01:00.0/numa_node

# Process 측 NUMA pinning
numactl --cpunodebind=0 --membind=0 ./app
```

NVMe·NIC을 *해당 NUMA의 CPU·memory*에서 사용. 8-socket server에서 *NUMA mismatch는 큰 성능 차*.

## Posted vs Non-Posted 비율

| Workload | Posted·Non-Posted |
|----------|-------------------|
| NIC RX (DMA write to host) | 거의 Posted |
| NVMe Read | Non-Posted (Read 요청) + Completion |
| NIC TX (host → NIC DMA) | NIC이 Read 발행 → 응답 |
| GPU compute | Posted Write 중심 |

Non-Posted가 많으면 *latency 노출*. *큰 MRRS로 Non-Posted 줄임*.

## Relaxed Ordering·No Snoop

*Attribute 비트*가 *throughput에 큰 영향*:

| Attr | 효과 |
|------|------|
| RO (Relaxed Ordering) | strict order 완화 → parallelism ↑ |
| NS (No Snoop) | RC cache snoop skip → host CPU 부담 ↓ |

GPU·HPC accelerator가 *RO·NS 활성*해 *최대 throughput*. *데이터 손상 위험*은 driver가 *barrier로 control*.

## ASPM·LTR 영향

| 활성 | Idle 전력 | Burst latency |
|------|----------|-------------|
| ASPM Off | 높음 | 낮음·일정 |
| ASPM L0s | 중간 | µs 잡음 |
| ASPM L1 | 낮음 | µs~수십 µs 잡음 |
| L1.2 substates | 매우 낮음 | 수백 µs |

*Latency-critical (NVMe·NIC)*는 *ASPM off*가 일반. *모바일·노트북*은 *L1.2까지 활성*.

## P2P DMA

*EP A → EP B 직접 DMA* (RC 경유 안 함):

| 시나리오 | 효과 |
|---------|------|
| NVMe → GPU 직접 copy | host memory bypass |
| GPU ↔ GPU (NCCL) | inter-GPU NVLink + PCIe |
| 같은 switch | switch peer-to-peer |

`/sys/bus/pci/.../p2pdma`로 *지원 확인*. *driver·BIOS·switch ACS 모두* P2P 허용해야.

## DDIO — Direct Data I/O

Intel Xeon의 *NIC traffic을 LLC에 직접 DMA*:

| 시나리오 | 효과 |
|---------|------|
| DDIO 활성 | NIC RX가 *LLC*로, CPU L3 hit |
| DDIO 비활성 | DRAM 경유 — latency 큼 |

*Latency 200~300 ns 절감*. 100 GbE·NVMe·CXL에 *유효*.

## 측정 도구

| 도구 | 용도 |
|------|------|
| `lspci -vv | grep "Lnk"` | Link 상태·MPS·MRRS |
| `fio` | NVMe IOPS·throughput·latency |
| `iperf3·netperf` | NIC throughput |
| `perf c2c` | cache contention |
| `intel-pmu-tools` | PCIe BW counter |
| `pcm-pcie` (Intel PCM) | PCIe BW per device |
| `nvidia-smi dmon` | GPU PCIe BW |

## 자주 하는 실수

### "Gen 5면 NVMe Gen 4의 2배"

*Effective BW*는 그렇지만 *NVMe 내부 throughput 한계*도 있음. *NVMe controller·flash bandwidth*가 *bottleneck*이면 *PCIe upgrade* 효과 적음.

### "MPS 키우면 항상 빠름"

*latency-sensitive small transfer*는 *작은 MPS*가 유리. *MPS·MRRS는 workload 따라 다른 optimum*.

### "ASPM Off가 항상 최선"

*low-load device*는 *electricity·thermal cost*. *server*에서도 *deeper power state 활용*이 *total cost optimum*.

### "NUMA가 software 결정"

*PCIe slot의 NUMA*는 *hardware 고정*. *board layout으로 결정*. *bind 못 함*. *workload를 그 NUMA에 맞춤*.

### "Coalescing이 latency 손해만"

*low load*에서 *false*. *high load*에서 *throughput per ISR*가 크게 향상. *workload-aware tuning*.

## 정리

- *Effective BW*는 *theoretical의 70~90%*. encoding·header·ACK/NAK 모두 overhead.
- *MaxPayload·MaxReadReq*가 *throughput tuning의 1순위*.
- *Latency*는 *hop count × hop latency + endpoint*. Direct attach 빠름.
- *NUMA locality*가 *5~30% 차이*. Hardware 고정.
- *Posted·Non-Posted 비율·RO·NS attribute*가 *parallelism*.
- *ASPM·LTR*은 *power vs latency trade-off*.
- *P2P DMA·DDIO*가 *host memory bypass·LLC 직접*.
- 측정: `lspci`·`fio`·`perf`·`pcm-pcie`·`nvidia-smi`.

## 다음 편

[Ch 18: Register Maps — Configuration Space 비트 reference](/blog/embedded/hardware/pcie/chapter18-register-maps)에서 *Configuration·PCIe Cap·AER·MSI/MSI-X·SR-IOV의 비트별 reference*를 제공합니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals) — Gen·encoding
- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — Posted·Non-Posted·attribute
- [Ch 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management) — ASPM
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — P2P DMA

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
