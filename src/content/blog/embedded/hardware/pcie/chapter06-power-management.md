---
title: "Ch 6: Power Management — D-state·L-state·ASPM"
date: 2026-05-19T09:06:00
description: "PCIe 전력 관리 — Device D0~D3·Link L0~L3·ASPM·L1 substates·CLKREQ·PME 흐름."
series: "PCIe Deep Dive"
seriesOrder: 6
tags: [pcie, power-management, aspm, l1-substates, clkreq, pme]
draft: false
---

## 한 줄 요약

> **"PCIe 전력은 *device state (D)*와 *link state (L)* 두 축으로 관리됩니다."** — D0(active)부터 D3cold(완전 차단)까지·L0(active)·L0s·L1·L1.1·L1.2·L2·L3까지. *ASPM*은 *link이 idle일 때 자동으로 L0s/L1 진입*. *L1 substates*가 *모바일·노트북의 BAR 대기 전력*을 *수십 mW에서 mW급*으로 떨어뜨렸습니다.

[Ch 5 Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts)에서 *MSI Memory Write*가 *interrupt 전달의 핵심*임을 봤습니다. PM 상태에서는 *PME (Power Management Event)*가 *wake-up* 책임. 이 장은 *D-state·L-state·ASPM·sub-states*를 본격적으로 분해합니다.

## Device States (D0 ~ D3cold)

| State | 의미 |
|-------|------|
| **D0** | Active, 정상 동작 |
| **D1** | Light sleep — 일부 기능 비활성, 빠른 복귀 (optional) |
| **D2** | Deeper sleep (optional) |
| **D3hot** | Configuration Space 외 *대부분 차단*, configuration 통한 wake 가능 |
| **D3cold** | *전원 완전 차단* — *Vaux만 유지*, PME가 wake |

*D1·D2는 거의 안 씀*. 실용은 *D0 → D3hot → D3cold*. D3cold가 *최대 절전*. *PCI-PM Capability (ID 0x01)*가 D-state 전환 제어.

## Link States (L0 ~ L3)

| State | 의미 |
|-------|------|
| **L0** | Active, normal traffic |
| **L0s** | Lower power active — *수 µs 진입·복귀*. *one direction*만 power down |
| **L1** | Standby — *수 µs ~ 수십 µs*, *양방향 power down* |
| **L1.1** | L1 substate — *CLKREQ# 유지*, 더 깊은 절전 |
| **L1.2** | L1 substate — *CLKREQ# off*, *최대 절전*, *복귀 수백 µs* |
| **L2** | Sleep — *주 전원 off*, *Vaux 유지*, PME 가능 |
| **L3** | Off — *완전 차단*, PCIe 없음 |

## ASPM — Active State Power Management

*PCIe Cap의 Link Control register*에서 활성화. *idle 시 자동으로 L0s 또는 L1 진입*:

| 설정 | 동작 |
|------|------|
| Disabled | L0 고정 |
| L0s | idle 시 L0s 진입 (수 µs 절전) |
| L1 | idle 시 L1 진입 (더 깊은 절전, 진입·복귀 더 느림) |
| L0s+L1 | 둘 다 활성 |

*양단 (RC·EP) 모두 동일 설정* 필요. ASPM 협상은 *Link Cap*의 *L0s/L1 Exit Latency*로 *application latency budget* 결정.

## L1 Substates — L1.1·L1.2

PCIe 4.0+ device·노트북·모바일에서 *기본 활성*:

| State | CLKREQ# | RefCLK | 진입 latency | 복귀 latency |
|-------|---------|--------|--------------|--------------|
| L1.1 | 유지 | 유지 | µs | µs |
| L1.2 | off | off | µs | 수백 µs |

*L1.2*가 *RefCLK까지 차단*해서 *최대 절전*. NVMe SSD가 *idle 시 L1.2*로 *수 mW만 소비*. 다만 *복귀 latency 길어 throughput burst*에 영향.

*Latency Tolerance Reporting (LTR)*과 결합 — *EP가 OS에 latency budget 알리고* RC가 *deeper state 결정*.

## PME — Power Management Event

*D3hot·D3cold에서 wake-up*은 *PME Message*로:

| 단계 | 동작 |
|------|------|
| 1 | Device에 *wake event* (예: NIC가 magic packet 수신) |
| 2 | Device가 *PME Message* TLP 발송 (Vaux 전원으로) |
| 3 | RC가 *PME 받고 ACPI handler 호출* |
| 4 | OS가 *device를 D0로 복귀·driver resume* |

*Wake-on-LAN*이 이 메커니즘. *Vaux 전원이 항상 살아있어야* 가능 — *standby 전력 소비*.

## CLKREQ# — Clock Request

*PCIe RefCLK*은 *100 MHz differential signal*. *device가 필요할 때만 활성*:

| 시나리오 | CLKREQ# |
|---------|---------|
| L0·L0s·L1·L1.1 | low (CLK 필요) |
| L1.2 | high (CLK 차단 가능) |
| L2·L3 | high |

*노트북의 RefCLK 발진기*가 *L1.2 진입 시 stop* → *수십 mW 절감*. *L1.2가 모바일 PCIe SSD의 필수 기능*인 이유.

## D-state 전환 흐름

| 단계 | 동작 |
|------|------|
| 1 | OS가 *driver suspend handler 호출* |
| 2 | Driver가 *device internal save·outstanding I/O drain* |
| 3 | Driver가 *PCI-PM Capability의 Power State 비트 write* (D0→D3) |
| 4 | Device가 *internal context save·power gating* |
| 5 | RC가 *bridge·switch port도 함께 lower state* (이전 device가 다 D3면) |
| 6 | Resume 시 *역순* |

## Linux PCIe PM 동작

| 영역 | 위치 |
|------|------|
| Driver runtime PM | `pm_runtime_*` API |
| `/sys/bus/pci/devices/<BDF>/power/control` | "auto" or "on" |
| `/sys/bus/pci/devices/<BDF>/power/wakeup` | wake-up 활성 여부 |
| ASPM policy | `/sys/module/pcie_aspm/parameters/policy` |

`lspci -vv | grep -E "Power|ASPM"`으로 *현재 PM 설정* 확인.

## 자주 하는 실수

### "ASPM은 그냥 활성하면 좋다"

*Latency-critical workload*에서 *ASPM L1* 진입·복귀가 *µs latency spike*. NVMe random IOPS·latency 측정에서 *ASPM 활성/비활성 차이* 큼. *production NVMe·high-throughput NIC*는 *L0s/L1 비활성*이 일반.

### "L1.2가 항상 더 좋다"

*복귀 latency 수백 µs* — *burst workload*에는 *throughput drop*. 노트북 *idle*에는 좋지만 *server*에는 비추.

### "D3cold면 device가 완전 reset"

*D3cold도 internal context 일부 유지* (vendor 구현). *Driver는 항상 resume 시 full reinitialize* 가정해야 안전.

### "PME는 항상 wake한다"

*OS·BIOS·driver 모두 wake-up 활성화*해야. `/sys/.../wakeup`이 *enabled*여야. *security 정책*으로 차단되기도.

### "ASPM이 boot loader 단계에 동작"

UEFI·BIOS 단계 *ASPM 비활성*이 일반. OS 진입 후 *driver·ACPI*로 활성. *boot 시 link instability*는 *ASPM과 무관*.

## 정리

- *D-state*는 *device 단위*, *L-state*는 *link 단위* 전력 관리.
- 실용: *D0·D3hot·D3cold + L0·L0s·L1·L1.2*.
- *ASPM*이 *link idle 시 자동 lower state* 진입. *latency budget* 고려 필요.
- *L1 substates (L1.1·L1.2)*가 *모바일·노트북 PCIe의 mW급 절전* 가능하게.
- *CLKREQ#*가 *RefCLK 활성 control*. *L1.2 = CLK off*.
- *PME Message*가 *D3cold·L2/L3에서 wake-up* 트리거.
- Linux PM: *pm_runtime API + sysfs control + ASPM policy*.

## 다음 편

[Ch 7: Error Handling — Correctable·Uncorrectable·AER·DPC](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 *PCIe 에러 분류와 Advanced Error Reporting·Downstream Port Containment*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — PCI-PM Cap·LTR
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — PME 흐름
- [Ch 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer) — LTSSM·L states 진입

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
