---
title: "Ch 16: Troubleshooting — 실무 시나리오북"
date: 2026-05-19T09:16:00
description: "Device not visible·link training fail·downgrade·CE storm·hang·ACS group·hot-plug·성능 미달·lane reversal·power budget."
series: "PCIe Deep Dive"
seriesOrder: 16
tags: [pcie, troubleshooting, debugging, scenarios]
draft: false
---

## 한 줄 요약

> **"실무 PCIe 문제는 *10가지 패턴*에 거의 다 들어갑니다."** — *device not visible·link training fail·rate downgrade·CE storm·hang/freeze·IOMMU group 분리 안 됨·hot-plug 실패·성능 미달·lane reversal·power budget*. 각 시나리오의 *증상·1단계 진단·일반 원인*을 정리합니다.

[Ch 15 Tools](/blog/embedded/hardware/pcie/chapter15-tools)에서 *도구*를 봤습니다. 이 장은 *그 도구로 실 시나리오 진단·해결*하는 케이스북입니다.

## 시나리오 1 — Device가 안 보임

| 증상 | `lspci -D` 에 *없음* |
| 1단계 | `lspci -tv` topology 확인 |
| 2단계 | `dmesg | grep -i "pci|link"` 진단 |

| 가능 원인 | 검증 |
|----------|------|
| Slot 비활성 (BIOS) | BIOS slot enable |
| Bifurcation 잘못 (x16 → x8+x8) | BIOS bifurcation 설정 |
| Card 미인식 (presence detect 실패) | 물리적 재삽입 |
| Link Training fail | Recovery·LTSSM 추적 |
| Bus 번호 충돌 | re-enumeration (`echo 1 > /sys/bus/pci/rescan`) |
| Card 자체 결함 | 다른 slot 시험 |

## 시나리오 2 — Link Training Fail

| 증상 | `dmesg`에 *"Link training failed"* 또는 *LTSSM Recovery 반복* |
| 1단계 | `lspci -vv | grep "LnkSta"` 확인 |
| 2단계 | 신호 무결성 검토 |

| 원인 | 해결 |
|------|------|
| Equalization fail (Gen 3+) | BIOS preset 변경 |
| Cable·connector 손상 | 교체 |
| PCB·card 결함 | RMA |
| Bifurcation 미스 | 재설정 |
| Retimer 호환성 | retimer driver·firmware update |

## 시나리오 3 — Link Downgrade (Gen X → Gen Y)

| 증상 | LnkCap=8 GT/s·LnkSta=2.5 GT/s |
| 1단계 | `lspci -vv | grep "LnkSta"` |

| 원인 | 검증 |
|------|------|
| Equalization fail로 *rate fallback* | analyzer 또는 BIOS log |
| BIOS forced low speed | BIOS option |
| 외부 retimer 한계 | retimer datasheet |
| Long PCB trace + cable 합 | signal integrity 측정 |

## 시나리오 4 — Correctable Error Storm

| 증상 | dmesg에 *AER CE 폭주*, `aer_dev_correctable` counter 급증 |
| 1단계 | `cat /sys/kernel/debug/pci/<BDF>/aer_dev_correctable` |

| 원인 | 해결 |
|------|------|
| Cable 노이즈·접점 산화 | 재삽입·교체 |
| Power supply noise | filter capacitor 점검 |
| Cross-talk (인접 card) | slot 분리 |
| Replay 빈도 ↑ | Replay Timer 조정 |

CE 자체는 자동 복구, *frequent CE는 임박 fault 신호*.

## 시나리오 5 — Hang / Freeze

| 증상 | System unresponsive·`dmesg`에 *completion timeout·UE fatal* |
| 1단계 | sysrq trigger·crashdump |

| 원인 | 검증 |
|------|------|
| Completion Timeout | Read Request에 *응답 안 옴* — device hung |
| AER fatal → DPC trigger | downstream link 차단 |
| IOMMU page fault loop | PRI handler 결함 |
| Driver bug | softlockup detect |

복구: *FLR → secondary bus reset → power cycle*. *RAS log 분석*이 *root cause*.

## 시나리오 6 — IOMMU Group 분리 안 됨 (VFIO)

| 증상 | `/sys/kernel/iommu_groups/N/`에 *여러 device* |
| 1단계 | `lspci -vv | grep ACS` 확인 |

| 원인 | 해결 |
|------|------|
| Switch downstream port ACS 미지원 | switch 교체 |
| ACS bits 비활성화 | `pci=force_floppy_to_high_dma=Off`·BIOS |
| Vendor 펌웨어 한계 | firmware update |
| Multi-function device | function 분리 불가 (펌웨어) |

대안: *ACS override patch* (security 위험), *별도 slot 사용*.

## 시나리오 7 — Hot-plug 실패

| 증상 | Card 삽입해도 *probe 안 됨* |
| 1단계 | `dmesg | grep pciehp` |

| 원인 | 해결 |
|------|------|
| Slot이 *Hot-Plug Capable* 아님 | hardware 한계 |
| BIOS·UEFI에서 hot-plug disable | BIOS option |
| `pciehp` 모듈 미로드 | `modprobe pciehp` |
| Power budget 한계 | `Slot Capabilities Power Limit` 검증 |
| ACPI HOTPLUG 결함 | DSDT analysis |

## 시나리오 8 — 성능 미달 (Throughput 부족)

| 증상 | NVMe random IOPS 또는 NIC pps가 *예상 이하* |
| 1단계 | `lspci -vv | grep "MaxPayload\|MaxReadReq"` |

| 원인 | 해결 |
|------|------|
| MaxPayload 작음 (default 128) | driver·BIOS 설정 |
| MaxReadReq 작음 | driver tuning |
| ASPM L1 진입 빈번 | `pcie_aspm=off` |
| IRQ affinity 잘못 | `irqbalance`·driver affinity API |
| NUMA mismatch | `numactl` |
| TLP coalescing 미설정 | NIC: tx/rx coalesce |

## 시나리오 9 — Lane Reversal·Width 한계

| 증상 | LnkCap x16 인데 LnkSta x8 |
| 1단계 | `lspci -vv | grep "LnkSta"` |

| 원인 | 해결 |
|------|------|
| Bifurcation 적용 (x16 → 2×x8) | BIOS 옵션 |
| Lane 일부 결함 → fallback | 다른 slot 시험 |
| Cable 한계 (PCIe Riser) | 직접 연결 |
| Retimer/Re-driver 결함 | analyzer 추적 |

## 시나리오 10 — Power Budget

| 증상 | Card 인식되지만 *power on 실패* |
| 1단계 | `dmesg | grep "Power Limit"` |

| 원인 | 해결 |
|------|------|
| Card *PCIe slot power* 초과 | 6/8-pin 보조 전원 |
| PSU 자체 부족 | 더 큰 PSU |
| Daisy-chain 전원 부족 | 분리된 cable |
| BIOS Power Limit 설정 | BIOS option |

GPU·HPC accelerator에서 흔함. 카드 specs *TDP* 확인.

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
| `lspci -vv | grep "LnkSta"`로 *link 상태* | 정상이면 다음 |
| `dmesg | grep -E "pci|aer"`로 *kernel log* | error 있으면 분석 |
| `cat /sys/kernel/debug/pci/<BDF>/aer_*`로 *counter* | CE/UE 분류 |
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
- 1단계 도구: *lspci -vv·dmesg·`/sys/kernel/debug/pci/`*.
- *2단계*: hardware level (signal integrity·analyzer).
- *AER counter 보존*이 *근본 원인 추적*의 핵심.
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
