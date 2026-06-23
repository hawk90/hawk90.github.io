---
title: "Ch 15: Tools — lspci·setpci·pcimem·protocol analyzer"
date: 2026-05-19T09:15:00
description: "PCIe 디버깅 도구 — lspci 전체 옵션·setpci raw access·pcimem BAR R/W·protocol analyzer·debugfs."
series: "PCIe Deep Dive"
seriesOrder: 15
tags: [pcie, lspci, setpci, pcimem, debug-tools]
draft: false
---

## 한 줄 요약

> **"PCIe 트러블슈팅은 *lspci로 topology·capability dump → setpci로 register read·write → pcimem으로 BAR 직접 access → dmesg·debugfs로 kernel state → 마지막에 protocol analyzer*의 흐름입니다."** — *대부분 문제는 lspci -vv + dmesg*로 해결, *드물게 setpci의 raw write*가 필요, *진짜 link 문제*는 *protocol analyzer hardware*.

[Ch 1~14](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 *PCIe의 동작 원리*를 봤습니다. 이 장은 *그것을 진단·검증할 도구*를 본격적으로 분해합니다.

## lspci — 1차 진단 도구

`pciutils` 패키지에 포함. PCIe device 정보 dump:

| 옵션 | 효과 |
|------|------|
| `-t` | tree topology — switch·port 구조 |
| `-tv` | tree + vendor/device 이름 |
| `-D` | full domain (0000:bb:dd.f) |
| `-x` | 256 byte config space hex dump |
| `-xxx` | 4 KB extended config space hex dump |
| `-xxxx` | 4 KB + capability 분해 |
| `-vv` | 모든 capability 디코딩 (실용 1순위) |
| `-k` | kernel driver·module 정보 |
| `-nn` | numeric ID + name |
| `-s 01:00.0` | 특정 device |

## lspci -vv 출력 해석

```text
01:00.0 Network controller [0280]: Intel Corp. 82599EB ...
        Subsystem: Intel Corp. ...
        Flags: bus master, fast devsel, latency 0, IRQ 50
        Memory at f7800000 (64-bit, prefetchable) [size=4M]
        Capabilities: [40] Power Management ...
        Capabilities: [50] MSI: Enable+ Count=1/1 ...
        Capabilities: [60] MSI-X: Enable+ Count=64 ...
        Capabilities: [a0] Express Endpoint, ...
                LnkCap: Port #0, Speed 8GT/s, Width x8 ...
                LnkSta: Speed 8GT/s (ok), Width x8 (ok)
                DevCtl: ... MaxPayload 256 ...
                DevCtl2: ... LTR+ ...
        Capabilities: [100] AER ...
        Capabilities: [140] SR-IOV ... NumVF 0
        Kernel driver in use: ixgbe
```

핵심:
- *LnkCap vs LnkSta* — 광고와 현재 일치 여부
- *MaxPayload*·*MaxReadRequest* — performance tuning
- *AER 상태*·*카운터*

## setpci — Raw Register Access

*직접 Configuration Space write*. 위험!

| 명령 | 효과 |
|------|------|
| `setpci -s 01:00.0 0x04.W` | offset 0x04 W (16-bit) read |
| `setpci -s 01:00.0 0x04.W=0x0006` | bus master·memory enable |
| `setpci -s 01:00.0 CAP_EXP+30.W` | Capability symbolic name |

```bash
# bus master + memory space enable
setpci -s 01:00.0 COMMAND=0x06

# MaxPayload 256 byte set (Device Control)
setpci -s 01:00.0 CAP_EXP+8.W=0x2810

# AER capability enable
setpci -s 01:00.0 ECAP_AER+18.L=0x00000007
```

*driver가 인지 못 하는 변경* — race 가능. *디버깅·연구용*.

## pcimem — BAR Direct R/W

`pcimem` 도구 (github.com/billfarrow/pcimem):

```bash
# BAR0의 offset 0x100 32-bit read
pcimem /sys/bus/pci/devices/0000:01:00.0/resource0 0x100 w

# write
pcimem /sys/bus/pci/devices/0000:01:00.0/resource0 0x100 w 0xdeadbeef
```

*driver 없이도 BAR access*. *register layout 검증·하드웨어 brings up*.

## /sys/bus/pci/devices/<BDF>/

| Entry | 의미 |
|-------|------|
| `config` | 4 KB config dump (binary) |
| `resource` | BAR base·limit·flags |
| `resource0`~`resource5` | 각 BAR (mmap 가능) |
| `vendor·device` | ID |
| `class` | Class Code |
| `numa_node` | NUMA locality |
| `driver` | 매칭 driver symlink |
| `sriov_numvfs` | SR-IOV 활성 (PF만) |
| `reset` | FLR·secondary bus reset trigger |
| `power/control` | runtime PM ("auto"·"on") |
| `power/wakeup` | wake-up 활성 |

```bash
# config space dump
xxd /sys/bus/pci/devices/0000:01:00.0/config | head

# FLR
echo 1 > /sys/bus/pci/devices/0000:01:00.0/reset

# runtime PM
echo auto > /sys/bus/pci/devices/0000:01:00.0/power/control
```

## debugfs

`/sys/kernel/debug/pci/`에 *디버깅 인터페이스*:

| Entry | 의미 |
|-------|------|
| `pci/devices` | 모든 device 목록 |
| `pci/<BDF>/config` | config space |
| `pci/<BDF>/aer_dev_correctable` | CE counter |
| `pci/<BDF>/aer_dev_fatal·nonfatal` | UE counter |
| `pci/<BDF>/dpc` | DPC trigger·log |

`mount -t debugfs none /sys/kernel/debug` 필요.

## dmesg — Kernel Log

| 패턴 | 의미 |
|------|------|
| `pcieport` | hot-plug·AER·DPC |
| `aer` | AER report |
| `ixgbe·nvme·...` | driver-specific |
| `BAR.*can't` | resource conflict |
| `Link is up` | LTSSM L0 진입 |
| `Link is down` | LTSSM 떨어짐 |

```bash
dmesg | grep -iE "pci|pcie|aer" | tail -50
```

*첫 line부터 timing·sequence 추적*. *boot 직후 init·error 동시 추적*.

## aer-inject

`drivers/pci/pcie/aer_inject.c`로 *AER 에러 인위 발생*. *driver recovery callback 검증*용:

```bash
# 모듈 로드
modprobe aer_inject

# 가짜 CE 발생
echo "0000:01:00.0 cor=000001" > /sys/kernel/debug/pci/aer_inject

# driver의 error_detected callback 확인
dmesg | grep "error_detected"
```

## dpc-test

`drivers/pci/pcie/dpc-test.c`로 *DPC 동작 검증*. *Switch port의 DPC trigger* test.

## Protocol Analyzer — Hardware

| 분야 | 도구 |
|------|------|
| Commercial | Teledyne LeCroy *Summit*·Keysight *Pulsar* |
| TLP/DLLP capture | 모든 link traffic |
| LTSSM 추적 | state transition timeline |
| FPGA-based open-source | `pcie-tlp-injector` 등 |

*Cost 수천만 원*. *제조사·card vendor*에서 *진짜 link 문제 분석*에 사용.

## NVMe·NIC 특화 도구

| 도구 | 용도 |
|------|------|
| `nvme list·smart-log·get-log` | NVMe AER·SMART |
| `ethtool -S` | NIC statistics |
| `mlnx_perf·intel_iommu_dump` | vendor-specific |

## 트러블슈팅 결정 트리 (간략)

| 증상 | 1단계 |
|------|------|
| Device 안 보임 | `lspci -D` |
| Link 속도 안 남 | `lspci -vv | grep "LnkSta"` |
| Driver bind 안 됨 | `lspci -k` |
| Hot-plug 안 됨 | `dmesg | grep pciehp` |
| 성능 미달 | `lspci -vv | grep "MaxPayload\|MaxReadReq"` |
| AER 폭주 | `dmesg | grep aer` + `aer_dev_*` counter |

자세한 시나리오북은 [Ch 16 Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting).

## 자주 하는 실수

### "setpci로 BAR 변경"

*driver가 동작 중*이면 *driver 입장의 BAR이 invalid*. *device hang*. *unbind 후 setpci, 또는 manual driver*만.

### "lspci -vv가 항상 동작"

*kernel access 필요*. *VFIO-bound device*는 *userspace 소유*라 *상세 정보 제한*. *unbind 후* 다시.

### "AER counter 0이면 정상"

*Mask로 가려진 경우*도. `lspci -vv | grep "AER.*MaskSta"` 확인 필요.

### "Protocol Analyzer가 모든 문제 해결"

*Hardware 자체의 비결정적 fault*는 *analyzer로도 reproduction* 어려움. *통계적 RAS 누적 → analyzer trigger*가 일반 워크플로.

### "debugfs는 production에 안전"

*Read는 OK*, *write·trigger는 production 위험*. *staging·QA*에서만 trigger.

## 정리

- *lspci -vv*가 *PCIe 진단의 1순위*. topology·capability·LnkCap/LnkSta 모두 dump.
- *setpci*는 *raw register access* — driver 무관하게 변경 가능, *위험*.
- *pcimem*이 *BAR 직접 R/W*. driver brings up·register 검증.
- *sysfs (`/sys/bus/pci/`)·debugfs*가 *kernel state·counter·reset trigger*.
- *dmesg*에서 *boot·link·error timing* 추적.
- *aer-inject·dpc-test*가 *driver recovery 검증*.
- *Protocol analyzer*는 *진짜 link 문제*에. cost 큼.

## 다음 편

[Ch 16: Troubleshooting — 시나리오북](/blog/embedded/hardware/pcie/chapter16-troubleshooting)에서 *실무 자주 만나는 PCIe 문제 케이스북*과 *진단 decision tree*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — lspci 출력 영역
- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — AER counter 의미
- [Ch 16: Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting)
- [Ch 18: Register Maps](/blog/embedded/hardware/pcie/chapter18-register-maps) — setpci 비트 reference

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
