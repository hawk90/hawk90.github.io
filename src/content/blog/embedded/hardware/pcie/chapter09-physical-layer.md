---
title: "Ch 9: Physical Layer — LTSSM·Equalization·SerDes"
slug: "embedded/hardware/pcie/chapter09-physical-layer"
date: 2026-05-19T09:09:00
description: "PCIe link training의 상태·ordered set·equalization과 Linux에서 관찰할 수 있는 범위를 구분합니다."
series: "PCIe Deep Dive"
seriesOrder: 9
tags: [pcie, ltssm, physical-layer, equalization, serdes, pam4]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"Physical Layer의 상태 기계(LTSSM)는 표준 config space에 거의 드러나지 않고, 컨트롤러마다 자기 레지스터에 자기 번호로 보여 줍니다."** 표준 레지스터로 보이는 것은 현재 속도·폭, Link Training 비트, equalization 각 phase의 성공 여부, 그리고 Retrain Link·Target Link Speed 같은 제어 비트 정도입니다. 링크가 안 올라올 때 Linux 드라이버가 LTSSM 상태를 찍는 코드와 실제 erratum quirk가 이 차이를 잘 보여 줍니다.

[Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 속도별 encoding을, [Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)에서 DL_Active를 봤습니다. 이 장은 그 아래 link training을 다룹니다. 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에는 실제 PHY가 없으므로, 상태 이름과 순서는 Linux 컨트롤러 드라이버와 AMD PG239 문서에서, 레지스터 값은 VM에서 가져옵니다.

## LTSSM의 주요 상태

LTSSM 상태 이름은 회원 전용인 Base Specification에 정의되지만, 그 이름을 레지스터 값으로 노출하는 컨트롤러 드라이버가 Linux에 있습니다. MediaTek Gen3 PCIe 드라이버는 `PCIE_LTSSM_STATUS_REG` bit 28:24를 읽어 이름으로 바꾸는 표를 가집니다(`drivers/pci/controller/pcie-mediatek-gen3.c:197-226`).

| 코드 | 이름 | 코드 | 이름 |
|------|------|------|------|
| 0x00 | detect.quiet | 0x0E | recovery.receiverconfig |
| 0x01 | detect.active | 0x0F | recovery.idle |
| 0x02 | polling.active | 0x10 | L0 |
| 0x03 | polling.compliance | 0x11 | L0s |
| 0x04 | polling.configuration | 0x12 | L1.entry |
| 0x05 | config.linkwidthstart | 0x13 | L1.idle |
| 0x06 | config.linkwidthaccept | 0x14 | L2.idle |
| 0x07 | config.lanenumwait | 0x15 | L2.transmitwake |
| 0x08 | config.lanenumaccept | 0x16 | disable |
| 0x09 | config.complete | 0x17 | loopback.entry |
| 0x0A | config.idle | 0x18 | loopback.active |
| 0x0B | recovery.receiverlock | 0x19 | loopback.exit |
| 0x0C | recovery.equalization | 0x1A | hotreset |
| 0x0D | recovery.speed | | |

Detect → Polling → Configuration → L0로 링크가 올라가고, Recovery는 속도 변경·equalization·재훈련에 쓰이며, L0s·L1·L2는 절전, Disabled·Loopback·Hot Reset은 특수 상태입니다. 코드 번호는 컨트롤러마다 다릅니다. 같은 Linux 트리의 Baikal-T1 드라이버(`dwc/pcie-bt1.c:43-79`)는 L0이 0x11이고, Recovery equalization을 `RCVR_EQ0`~`RCVR_EQ3`(0x20~0x23) 네 개로 나눠 둡니다. DesignWare 공통 헤더(`dwc/pcie-designware.h:331-336`)도 `DW_PCIE_LTSSM_L0 = 0x11`입니다. 다른 보드의 로그에 찍힌 LTSSM 숫자는 그 컨트롤러의 표로만 읽어야 합니다.

이 표가 쓰이는 곳은 링크가 안 올라왔을 때입니다. MediaTek 드라이버는 reset 해제 뒤 link-up 비트를 기다리다 시간이 끝나면 상태 레지스터를 읽어 `PCIe link down, current LTSSM state: %s (%#x)`를 남깁니다(`pcie-mediatek-gen3.c:427-436`). 예를 들어 `polling.compliance`에 머물러 있다면 상대가 감지되긴 했지만 정상 training을 시작하지 못했다는 단서가 됩니다.

## Link Training Timeline

reset 뒤 L0까지 가는 동안 소프트웨어가 표준 레지스터로 볼 수 있는 것은 Link Status의 두 비트입니다.

| 비트 (`pci_regs.h`) | 뜻 |
|------|------|
| `PCI_EXP_LNKSTA_LT` 0x0800 (580행) | Link Training 진행 중 |
| `PCI_EXP_LNKSTA_DLLLA` 0x2000 (582행) | Data Link Layer Link Active |

Linux v6.12 `pcie_retrain_link()`(`drivers/pci/pci.c:4715-4750`)는 이 두 비트로 재훈련을 관리합니다. 먼저 진행 중인 training이 끝나기를 LT 비트로 기다리고, Link Control의 Retrain Link 비트(`PCI_EXP_LNKCTL_RL`, 0x0020)를 쓴 뒤, 다시 LT나 DLLLA가 기대값이 될 때까지 기다립니다. 주석은 링크 파라미터를 바꾸기 전에 시작된 training과 경합하지 않으려는 것이라고 설명합니다. 일부 장치는 RL 비트를 다시 지워야 training이 성공하는 erratum이 있어 `clear_retrain_link` 플래그로 처리합니다.

시리즈 VM의 root port는 이 레지스터를 이렇게 보여 줍니다.

```text
LNKCTL before=0000 LNKCTL2=0004
LNKCTL after RL write=0000 LNKSTA=2011
LNKCTL2 after TLS=1 write=0004
```

LnkSta 0x2011은 DLLLA(0x2000), 폭 x1(0x0010), 속도 코드 1(2.5 GT/s)입니다. Retrain Link를 써도 LnkCtl은 0000, Target Link Speed를 1로 써도 LnkCtl2는 0004(16 GT/s) 그대로입니다. QEMU 11.1.3 `pcie_cap_lnkctl_init()`(`hw/pci/pcie.c:385-390`)이 Link Control에서 Common Clock Configuration·Extended Synch 두 비트만 쓰기 가능으로 열고, Target Link Speed는 `pcie_cap_fill_lnk()`(126-135행)가 최고 속도로 채운 뒤 쓰기를 받지 않기 때문입니다. 이 VM에서 retrain을 실험할 수 없는 이유입니다.

## 속도 제한과 재훈련 — ASM2824 erratum

link training이 실제로 어떻게 실패하는지는 Linux의 quirk 하나가 잘 보여 줍니다. `pcie_failed_link_retrain()`(`drivers/pci/quirks.c:38-135`) 주석의 사례는 ASMedia ASM2824(Gen 3 switch)의 downstream port에 Pericom PI7C9X2G304(Gen 2 switch)를 연결한 구성입니다. 두 switch는 5.0 GT/s, 안 되면 2.5 GT/s로 맞춰야 하는데 두 속도 사이를 끝없이 오가고, Data Link Layer는 active가 되지 못하며, Link Training 비트는 약 84%의 시간 동안 켜져 있었다고 적습니다. Target Link Speed를 2.5 GT/s로 강제하자 통신이 됐고, 그 뒤 더 높은 목표로 재훈련하자 5.0 GT/s로 협상됐습니다. 이 상황에서 Link Bandwidth Management Status(LBMS)는 켜지고 DLLLA는 꺼진 채라서, 드라이버는 이 조합으로 문제를 알아챕니다. 연결되지 않은 포트는 두 비트가 모두 꺼져 있어 구분됩니다.

| 단계 | 코드 동작 |
|------|------|
| 1 | downstream port이고 Link Active Reporting과 Link Control 2가 있는지 확인 |
| 2 | `LBMS=1, DLLLA=0`이면 "broken device, retraining non-functional downstream link at 2.5GT/s"를 남김 |
| 3 | Link Control 2의 Target Link Speed(`PCI_EXP_LNKCTL2_TLS`)를 2.5 GT/s로 내리고 `pcie_retrain_link()` |
| 4 | 실패하면 원래 값으로 되돌리고 다시 retrain |
| 5 | 성공했고 장치가 ASM2824로 확인되면 제한을 풀고 LnkCap 최고 속도로 다시 retrain |

속도를 2.5 GT/s로 낮추면 링크가 올라오는 경우가 있다는 것, 그리고 그 판단 근거가 LBMS·DLLLA 두 비트라는 것이 여기서 드러납니다. 제한을 다시 푸는 것은 안전하다고 확인된 장치에서만 해야 하므로, 코드는 Vendor:Device ID가 ASM2824일 때만 제한을 풉니다.

## TS1·TS2 Ordered Set

TS1·TS2의 필드 배치는 Base Specification에만 있고, 이번에 연 공개 자료에는 바이트 단위 형식이 없어 이 장에서 다루지 않습니다. 위 LTSSM 이름에서 `config.linkwidthstart`·`config.lanenumwait` 같은 Configuration 하위 상태가 폭과 lane 번호를 정하는 단계라는 것까지가 확인 가능한 범위입니다.

## Equalization — Phase 0~3

고속 링크는 송신·수신 설정을 링크마다 맞추는 equalization을 거칩니다. 공개 자료로 확인한 것은 세 가지입니다.

첫째, 상태 위치입니다. MediaTek 표의 `recovery.equalization`(0x0C)과 Baikal-T1의 `RCVR_EQ0`~`RCVR_EQ3`처럼, equalization은 Recovery 상태 안에서 phase 0~3으로 진행됩니다.

둘째, phase별 역할입니다. [AMD PG239 PCI Express PHY LogiCORE IP Product Guide, "Equalization Sequences"](https://docs.amd.com/r/en-US/pg239-pcie-phy/Equalization-Sequences)(v1.0, 2024-12-18)는 PHY 쪽 동작을 이렇게 적습니다.

| 동작 | Upstream Port | Downstream Port |
|------|------|------|
| RX Adapt (New Proposal과 Adaptation 두 단계) | Recovery.Equalization Phase 2 | Phase 3 |
| TX Adapt (Coefficient Apply·Coefficient Query) | Phase 3 | Phase 2 |

같은 페이지는 속도 변경이 Recovery.Speed와 Polling.Compliance 상태에서 이뤄지고, 새 속도로 바꾸기 전에 Preset Apply를 해야 한다고 적습니다. Phase 0·1의 내용은 이 페이지에 없습니다.

셋째, 결과를 보는 레지스터입니다. Link Status 2에 각 phase의 성공 비트가 있고, pciutils 3.13.0이 `lib/header.h:933-937`의 정의로 해석합니다.

| 비트 | 정의 |
|------|------|
| 0x02 | Equalization Complete |
| 0x04 | Equalization Phase 1 Successful |
| 0x08 | Equalization Phase 2 Successful |
| 0x10 | Equalization Phase 3 Successful |
| 0x20 | Link Equalization Request |

시리즈 VM의 root port는 모두 `-`입니다. QEMU 11.1.3은 Link Status 2에서 Flit Mode 비트만 다룹니다(`hw/pci/pcie.c:163-164`, `1200-1203`).

```text
		LnkSta2: Current De-emphasis Level: -6dB, EqualizationComplete- EqualizationPhase1-
			 EqualizationPhase2- EqualizationPhase3- LinkEqualizationRequest-
```

Linux v6.12 `pci_regs.h`에는 이 다섯 비트의 정의가 없습니다(`LNKSTA2`는 `PCI_EXP_LNKSTA2_FLIT`뿐). 16 GT/s용 lane별 transmitter preset은 Physical Layer 16.0 GT/s Extended Capability(ID 0x26)의 Lane Equalization Control 레지스터(`PCI_PL_16GT_LE_CTRL` 0x20, `pci_regs.h:1122-1125`)에 downstream·upstream port preset 4비트씩으로 들어갑니다.

## Lane Reversal·Polarity Inversion

lane 순서 반전과 차동쌍 극성 반전의 규칙은 이번에 연 공개 자료에 없어 이 장에서 다루지 않습니다. Linux v6.12 `pci_regs.h`에도 그 결과를 보여 주는 표준 레지스터 정의는 없습니다.

## SKP Ordered Set

SKP ordered set의 목적·간격·형식은 Base Specification 영역이고 이번에 연 자료에 없습니다. 이 장에서 수치를 적지 않습니다.

## Encoding 진화 (재확인)

[Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)의 표대로 Linux v6.12 `PCIE_SPEED2MBS_ENC()`(`drivers/pci/pci.h:345-352`)는 2.5·5 GT/s에 8/10, 8·16·32 GT/s에 128/130, 64 GT/s에 1/1을 씁니다. 64 GT/s 이상의 신호 방식은 [CXL 4.0 소개 자료](https://computeexpresslink.org/wp-content/uploads/2025/12/CXL_4.0-Webinar_December-2025_FINAL.pdf) PDF 15쪽의 "PCIe 7.0 FEC and CRC"까지만 확인했습니다.

## Recovery State

Recovery는 L0에서 벗어나 다시 맞추는 상태입니다. 위 표의 `recovery.*` 하위 상태 다섯 개(receiverlock, equalization, speed, receiverconfig, idle)가 그 내부 단계이고, PG239는 속도 변경을 Recovery.Speed에서 한다고 적습니다. Linux에서 소프트웨어가 Recovery를 직접 일으키는 수단이 `pcie_retrain_link()`의 Retrain Link 비트입니다.

`lspci`의 LnkSta에는 Recovery 진입 횟수 같은 카운터가 없습니다. 현재 속도·폭과 LT·DLLLA·LBMS 같은 비트만으로 LTSSM 이력을 복원할 수는 없습니다. 링크가 스스로 속도나 폭을 바꾼 흔적은 LBMS(Link Bandwidth Management Status)로 남고, 위 ASM2824 quirk가 이 비트를 씁니다.

## FTS — Fast Training Sequence

FTS의 용도·개수·형식도 이번에 연 자료에 없어 다루지 않습니다. L0s 자체는 [Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)의 ASPM 실험을 참고합니다.

## LTSSM 디버깅

표준 config space로는 현재 LTSSM 상태를 읽을 수 없고, 컨트롤러별 레지스터가 필요합니다. Linux 트리에서 그런 레지스터를 읽는 예가 MediaTek Gen3(`ltssm_str[]`), Baikal-T1(`BT1_CCU_PCIE_LTSSM_*`), DesignWare 계열(`DW_PCIE_LTSSM_*`)입니다. 이들 드라이버는 링크가 올라오지 않으면 그 값을 로그에 남기므로, 보드 bring-up 로그에서 LTSSM 숫자를 봤다면 먼저 해당 드라이버 소스의 표를 찾습니다.

## 자주 하는 실수

### "LTSSM 숫자는 표준이다"

MediaTek Gen3는 L0을 0x10, Baikal-T1과 DesignWare 헤더는 0x11로 씁니다. 숫자만 보고 상태를 판단하면 틀립니다.

### "낮은 속도로 링크가 잡혔으니 호환성은 OK"

ASM2824 quirk는 2.5 GT/s로 내려야만 링크가 올라오는 장치를 다룹니다. Linux도 이 경우 제한을 풀지 확인된 장치에서만 판단합니다. LnkSta 속도가 LnkCap보다 낮다면 그 이유부터 찾습니다.

### "Retrain Link를 쓰면 바로 재훈련된다"

`pcie_retrain_link()`는 진행 중인 training이 끝나기를 먼저 기다리고, 일부 장치에서는 RL 비트를 다시 지워야 합니다. QEMU 11.1.3처럼 Link Control에서 RL 비트를 쓰기 가능으로 열지 않은 구현도 있습니다(`pcie_cap_lnkctl_init()`, `hw/pci/pcie.c:385-390`). RL은 다시 읽으면 0일 수 있으므로, 재훈련 여부는 LT·DLLLA 비트와 LnkSta 변화로 봅니다.

### "equalization 결과는 볼 수 없다"

Link Status 2의 Equalization Complete·Phase 1~3 Successful 비트가 결과를 보여 줍니다. pciutils 3.13.0은 이를 `LnkSta2` 줄에 찍습니다. Linux v6.12 헤더에는 정의가 없으므로 커널 코드에서는 직접 쓰지 않습니다.

## 정리

- LTSSM 상태 이름과 번호는 Linux 컨트롤러 드라이버에서 확인할 수 있고, 번호는 컨트롤러마다 다릅니다.
- 표준 레지스터로 보이는 것은 LT·DLLLA·LBMS, Retrain Link, Target Link Speed, Link Status 2의 equalization 결과입니다.
- Linux `pcie_retrain_link()`는 LT 대기 → RL → LT/DLLLA 대기 순서로 재훈련합니다.
- ASM2824 quirk는 LBMS=1·DLLLA=0을 보고 2.5 GT/s로 낮춰 재훈련하고, ASM2824에서만 제한을 다시 풉니다.
- equalization은 Recovery 안의 phase 0~3이고, AMD PG239는 Upstream Port가 phase 2에서 RX, phase 3에서 TX 적응을 한다고 적습니다.
- QEMU VM은 Retrain Link·Target Link Speed 쓰기를 받지 않아 training 실험은 할 수 없습니다.

## 다음 편

[Ch 10: Linux PCI Basics — enumeration·driver model](/blog/embedded/hardware/pcie/chapter10-linux-basics)에서 Linux 커널이 PCIe 장치를 찾고 드라이버를 붙이고 자원을 잡는 과정을 시리즈 VM에서 따라갑니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals) — 속도별 encoding
- [Ch 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management) — L0s·L1
- [Ch 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp) — DL_Active

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12, QEMU 11.1.3, pciutils 3.13.0, AMD PG239 기준이고 레지스터 실험은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
