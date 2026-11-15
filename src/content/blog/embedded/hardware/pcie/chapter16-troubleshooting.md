---
title: "Ch 16: Troubleshooting — 실무 시나리오북"
slug: "embedded/hardware/pcie/chapter16-troubleshooting"
date: 2026-05-19T09:16:00
description: "Device not visible·link training fail·downgrade·CE storm·hang·ACS group·hot-plug·성능 미달·lane reversal·power budget."
series: "PCIe Deep Dive"
seriesOrder: 16
tags: [pcie, troubleshooting, debugging, scenarios]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"이 장은 PCIe 문제를 조사할 열 가지 출발점을 정리합니다."** — *device not visible·link training fail·rate downgrade·CE storm·hang/freeze·IOMMU group 분리 안 됨·hot-plug 실패·성능 미달·lane reversal·power budget*. 각 시나리오의 *증상·1단계 진단·일반 원인*을 정리합니다.

[Ch 15 Tools](/blog/embedded/hardware/pcie/chapter15-tools)에서 *도구*를 봤습니다. 이 장은 *그 도구로 실 시나리오 진단·해결*하는 케이스북입니다.

다음은 실제 장애 재현 결과가 아니라 조사 순서입니다. 기준은 [Linux v6.12 AER HOWTO](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/pcieaer-howto.rst), [AER sysfs ABI](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-pci-devices-aer_stats)와 PCI source입니다. 단일 증상에서 원인을 확정하거나 자동 reset·설정 변경으로 넘어가지 않습니다.

## 시나리오 1 — Device가 안 보임

| 확인 단계 | 내용 |
|------|------|
| 증상 | `lspci -D`에 *없음* |
| 1단계 | `lspci -tv` topology 확인 |
| 2단계 | `dmesg \| grep -iE "pci\|link"` 진단 |

| 가능 원인 | 검증 |
|----------|------|
| Slot 비활성 (BIOS) | BIOS slot enable |
| Bifurcation 잘못 (x16 → x8+x8) | BIOS bifurcation 설정 |
| Card 미인식 (presence detect 실패) | 물리적 재삽입 |
| Link Training fail | Recovery·LTSSM 추적 |
| Bus 번호 충돌 | firmware·bridge의 bus 번호 범위를 먼저 수집. rescan은 설정 변경이며 자동 해결책이 아님 |
| Card 자체 결함 | 다른 slot 시험 |

## 시나리오 2 — Link Training Fail

| 확인 단계 | 내용 |
|------|------|
| 증상 | `dmesg`에 *"Link training failed"* 또는 *LTSSM Recovery 반복* |
| 1단계 | `lspci -vv \| grep "LnkSta"` 확인 |
| 2단계 | 신호 무결성 검토 |

| 원인 | 해결 |
|------|------|
| Equalization fail (Gen 3+) | BIOS preset 변경 |
| Cable·connector 손상 | 교체 |
| PCB·card 결함 | RMA |
| Bifurcation 미스 | 재설정 |
| Retimer 호환성 | retimer driver·firmware update |

## 시나리오 3 — Link Downgrade (Gen X → Gen Y)

| 확인 단계 | 내용 |
|------|------|
| 증상 | LnkCap=8 GT/s·LnkSta=2.5 GT/s |
| 1단계 | `lspci -vv \| grep "LnkSta"` |

| 원인 | 검증 |
|------|------|
| Equalization fail로 *rate fallback* | analyzer 또는 BIOS log |
| BIOS forced low speed | BIOS option |
| 외부 retimer 한계 | retimer datasheet |
| Long PCB trace + cable 합 | signal integrity 측정 |

## 시나리오 4 — Correctable Error Storm

| 확인 단계 | 내용 |
|------|------|
| 증상 | dmesg에 *AER CE 폭주*, `aer_dev_correctable` counter 급증 |
| 1단계 | `cat /sys/bus/pci/devices/<BDF>/aer_dev_correctable` |

| 원인 | 해결 |
|------|------|
| Cable 노이즈·접점 산화 | 재삽입·교체 |
| Power supply noise | filter capacitor 점검 |
| Cross-talk (인접 card) | slot 분리 |
| Replay 빈도 ↑ | 오류 종류·발생 속도·부하와 link 조건을 비교 |

CE는 protocol상 복구되는 분류입니다. 빈도가 높으면 조사하되 단일 counter로 임박 고장을 확정하지 않습니다.

## 시나리오 5 — Hang / Freeze

| 확인 단계 | 내용 |
|------|------|
| 증상 | System unresponsive·`dmesg`에 *completion timeout·UE fatal* |
| 1단계 | sysrq trigger·crashdump |

| 원인 | 검증 |
|------|------|
| Completion Timeout | Read Request에 *응답 안 옴* — device hung |
| AER fatal → DPC trigger | downstream link 차단 |
| IOMMU page fault loop | PRI handler 결함 |
| Driver bug | softlockup detect |

복구는 영향 범위·장치 지원·서비스 I/O 중단 조건을 확인해 선택합니다. Reset 순서를 고정해서 실행하거나 성공한 reset을 원인 확인으로 간주하지 않습니다.

## 시나리오 6 — IOMMU Group 분리 안 됨 (VFIO)

| 확인 단계 | 내용 |
|------|------|
| 증상 | `/sys/kernel/iommu_groups/N/`에 *여러 device* |
| 1단계 | `lspci -vv \| grep ACS` 확인 |

| 원인 | 해결 |
|------|------|
| Switch downstream port ACS 미지원 | switch 교체 |
| ACS bits 비활성화 | 실제 ACS control·firmware 정책과 해당 kernel의 지원 옵션 확인 |
| Vendor 펌웨어 한계 | firmware update |
| Multi-function device | function 분리 불가 (펌웨어) |

대체 slot·topology의 실제 격리와 group 구성을 비교합니다. 소프트웨어로 group만 나누는 override는 하드웨어 격리를 추가하지 않습니다.

## 시나리오 7 — Hot-plug 실패

| 확인 단계 | 내용 |
|------|------|
| 증상 | Card 삽입해도 *probe 안 됨* |
| 1단계 | `dmesg \| grep pciehp` |

| 원인 | 해결 |
|------|------|
| Slot이 *Hot-Plug Capable* 아님 | hardware 한계 |
| BIOS·UEFI에서 hot-plug disable | BIOS option |
| `pciehp` 모듈 미로드 | kernel의 built-in·module 설정과 firmware의 제어권 확인 |
| Power budget 한계 | `Slot Capabilities Power Limit` 검증 |
| ACPI HOTPLUG 결함 | DSDT analysis |

## 시나리오 8 — 성능 미달 (Throughput 부족)

| 확인 단계 | 내용 |
|------|------|
| 증상 | NVMe random IOPS 또는 NIC pps가 *예상 이하* |
| 1단계 | `lspci -vv \| grep "MaxPayload\|MaxReadReq"` |

| 원인 | 해결 |
|------|------|
| MaxPayload 작음 (default 128) | driver·BIOS 설정 |
| MaxReadReq 작음 | driver tuning |
| ASPM L1 진입 빈번 | 실제 절전 전환과 지연의 상관관계를 먼저 측정 |
| IRQ affinity 잘못 | `irqbalance`·driver affinity API |
| NUMA mismatch | `numactl` |
| TLP coalescing 미설정 | NIC interrupt coalescing과 PCIe TLP packing을 구분 |

## 시나리오 9 — Lane Reversal·Width 한계

| 확인 단계 | 내용 |
|------|------|
| 증상 | LnkCap x16 인데 LnkSta x8 |
| 1단계 | `lspci -vv \| grep "LnkSta"` |

| 원인 | 해결 |
|------|------|
| Bifurcation 적용 (x16 → 2×x8) | BIOS 옵션 |
| Lane 일부 결함 → fallback | 다른 slot 시험 |
| Cable 한계 (PCIe Riser) | 직접 연결 |
| Retimer/Re-driver 결함 | analyzer 추적 |

## 시나리오 10 — Power Budget

| 확인 단계 | 내용 |
|------|------|
| 증상 | Card 인식되지만 *power on 실패* |
| 1단계 | `dmesg \| grep "Power Limit"` |

| 원인 | 해결 |
|------|------|
| Card *PCIe slot power* 초과 | 6/8-pin 보조 전원 |
| PSU 자체 부족 | 더 큰 PSU |
| Daisy-chain 전원 부족 | 분리된 cable |
| BIOS Power Limit 설정 | BIOS option |

GPU·HPC accelerator에서 흔함. 카드 specs *TDP* 확인.

## 증거를 보존하고 다음 단계로 넘어가기

동일 BDF가 reset·재열거 뒤 다른 장치를 가리키지 않는지 ID·topology·firmware를 같이 기록합니다. AER 속성 부재나 권한 오류를 0으로 처리하지 않고, mask·ratelimit·overflow와 관찰 시작 시점을 남깁니다. 설정을 하나 바꿔 비교할 때는 부하·온도·전원·연결 조건을 유지하고, 증상이 사라져도 반복 검증 전에는 원인을 확정하지 않습니다. 이 글에서는 장치 설정이나 reset을 실행하지 않았습니다.

## 추가 진단 도구 모음

| Symptom | First-step |
|---------|-----------|
| Boot 시 fail | UEFI log + grub serial |
| Runtime hang | sysrq + crashkernel |
| Random reboot | mce log·journalctl |
| Performance | `perf` + driver trace |

## 일반 진단 결정 트리

| 1단계 | 2단계 |
|-------|------|
| `lspci -D`로 *visible 확인* | visible면 다음 |
| `lspci -vv \| grep "LnkSta"`로 *link 상태* | 정상이면 다음 |
| `dmesg \| grep -E "pci\|aer"`로 *kernel log* | error 있으면 분석 |
| `cat /sys/bus/pci/devices/<BDF>/aer_*`로 *counter* | CE/UE 분류 |
| Driver-specific tool로 *application-level* | NVMe smart·ethtool 등 |
| 마지막 *Protocol analyzer* | hardware 추적 |

## 자주 하는 실수

### "재부팅으로 해결되면 끝"

*Transient fault는 반복 발생*. *AER counter·dmesg 로그 보존* — *근본 원인 추적* 필요.

### "Driver update가 만능"

*Hardware 결함·signal integrity 문제*는 *driver update*로 안 풀림. *물리 layer 추적*.

### "BIOS 설정 default가 최적"

*Server BIOS*는 *balanced default*, *workload-specific tuning*은 *manual*. *MaxPayload·ASPM·Bifurcation*은 *변경 가치 큼*.

### "Hardware 교체로 끝"

*같은 결함이 다음 card에도*. *Slot·PCB·연결*도 의심.

### "VFIO bind 후 성능 안 나옴"

*hugepage·lcore·affinity* 모두 검토. *DPDK·SPDK 자체 tuning*도. *vfio-pci binding만으로 빠르지 않음*.

## 정리

- 10가지 패턴 — *device not visible·link training fail·downgrade·CE storm·hang·IOMMU group·hot-plug·성능·lane·power*.
- 1단계 도구: *lspci -vv·dmesg·AER sysfs 통계*.
- *2단계*: hardware level (signal integrity·analyzer).
- AER counter는 시간 구간·부하·reset 여부·로그 손실 여부와 함께 보존합니다.
- *Driver·BIOS·hardware*의 *세 단계 검증*이 일반.

## 다음 편

[Ch 17: Performance — Bandwidth·Latency·Tuning](/blog/embedded/hardware/pcie/chapter17-performance)에서 *PCIe 성능 측정·튜닝*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — AER·DPC
- [Ch 14: Linux Operations](/blog/embedded/hardware/pcie/chapter14-linux-operations) — pciehp·recovery
- [Ch 15: Tools](/blog/embedded/hardware/pcie/chapter15-tools)
- [Ch 17: Performance](/blog/embedded/hardware/pcie/chapter17-performance)

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
