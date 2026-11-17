---
title: "Ch 14: Linux Operations — Hot-plug·AER Recovery·DPC·ARI"
slug: "embedded/hardware/pcie/chapter14-linux-operations"
date: 2026-05-19T09:14:00
description: "PCIe 운영 — pciehp surprise·orderly hot-plug·AER recovery callback chain·DPC integration·ARI 8-bit function 식별·EEH."
series: "PCIe Deep Dive"
seriesOrder: 14
tags: [pcie, hotplug, aer-recovery, dpc, ari, linux-operations]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"운영 중인 시스템에서 PCIe 장치가 붙고 떨어지는 일은 slot 레지스터의 이벤트 → pciehp → PCI core 열거 → 드라이버 probe/remove의 사슬로 처리됩니다."** 오류 복구는 [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)의 AER 흐름을, function 번호 확장은 ARI를 탑니다. 이 장은 시리즈 VM에서 장치를 실제로 붙였다 떼고, VF가 살아 있는 PF를 뽑아 봅니다.

실험은 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에서 QEMU monitor의 `device_add`·`device_del`로 했습니다.

## Hot-plug 종류

Linux v6.12 pciehp의 `pciehp_ctrl.c:107` 주석은 제거를 "safely removed"와 "surprise removed" 두 가지로 나눕니다. 이 VM에서 실행한 것은 앞의 경우입니다. QEMU 11.1.3은 `device_add`·`device_del`을 slot의 Attention Button 누름으로 전달합니다(`hw/pci/pcie.c:528-575`의 plug callback이 `PCI_EXP_HP_EV_PDC | PCI_EXP_HP_EV_ABP` 이벤트를, unplug 요청이 666행에서 `pcie_cap_slot_push_attention_button()`을 부름). 예고 없이 장치가 사라지는 surprise removal은 이 VM에서 재현하지 않았습니다.

| 메커니즘 | Linux 드라이버 | 시리즈 VM |
|------|------|------|
| Native PCIe hot-plug | `pciehp` | root port 다섯 개와 switch downstream port 둘에 등록 ([Ch 10](/blog/embedded/hardware/pcie/chapter10-linux-basics)의 `pcie004`·`pcie204`) |
| ACPI hot-plug | `acpiphp` | `_OSC`로 OS가 `PCIeHotplug`를 넘겨받아 pciehp가 맡음 |

## Slot Capabilities·Status·Control

slot이 달린 포트는 PCI Express Capability 안에 Slot Capabilities·Control·Status를 가집니다. pciehp는 초기화 때 Slot Capabilities를 한 줄로 찍습니다(`pciehp_hpc.c:1033`).

```text
pcieport 0000:00:03.0: pciehp: Slot #1 AttnBtn+ PwrCtrl+ MRL- AttnInd+ PwrInd+ HotPlug+ Surprise+ Interlock+ NoCompl- IbPresDis- LLActRep+
```

| 표시 | `pci_regs.h` 비트 | 뜻 |
|------|------|------|
| `AttnBtn+` | `PCI_EXP_SLTCAP_ABP` 0x01 | Attention Button Present |
| `PwrCtrl+` | `PCI_EXP_SLTCAP_PCP` 0x02 | Power Controller Present |
| `HotPlug+` | `PCI_EXP_SLTCAP_HPC` 0x40 | Hot-Plug Capable |
| `Surprise+` | `PCI_EXP_SLTCAP_HPS` 0x20 | Hot-Plug Surprise |
| `LLActRep+` | (Link Capabilities) | [Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)의 DL_Active 보고 |

(`pci_regs.h:587-598`.) root port rp5(00:07.0)의 Slot Status와 Link Status를 장치를 꽂은 뒤와 뗀 뒤에 읽었습니다.

```text
		LnkSta:	Speed 2.5GT/s (overdriven), Width x1 (overdriven)
			TrErr- Train- SlotClk- DLActive+ BWMgmt- ABWMgmt-
--
		SltSta:	Status: AttnBtn- PowerFlt- MRL- CmdCplt- PresDet+ Interlock-
```

```text
		LnkSta:	Speed 2.5GT/s (overdriven), Width x1 (overdriven)
			TrErr- Train- SlotClk- DLActive- BWMgmt- ABWMgmt-
--
		SltSta:	Status: AttnBtn- PowerFlt- MRL- CmdCplt- PresDet- Interlock-
```

(각각 `lspci -s 00:07.0 -vv | grep -E "SltSta|LnkSta:" -A1` 발췌.) 꽂은 뒤에는 Presence Detect State(`PCI_EXP_SLTSTA_PDS`, 0x40)와 DL_Active가 함께 켜져 있고, 뗀 뒤에는 둘 다 꺼졌습니다. `(overdriven)`은 이 시점 rp5의 Link Capabilities 값이 0x00300000(속도·폭 0)이라 pciutils가 붙인 표시입니다. 부팅 직후에는 64 GT/s x16이었고([Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)), 그 사이 언제 왜 바뀌었는지는 확인하지 않았습니다.

## Hot-plug 시퀀스 — 추가

빈 rp5에 virtio-net을 붙인 로그입니다([Ch 13](/blog/embedded/hardware/pcie/chapter13-virtualization-2)의 packed virtqueue 실험과 같은 장치).

```text
(qemu) device_add virtio-net-pci,id=vn5,bus=rp5,netdev=n5,packed=on,disable-legacy=on
```

```text
pcieport 0000:00:07.0: pciehp: Slot(7): Button press: will power on in 5 sec
pcieport 0000:00:07.0: pciehp: Slot(7): Card present
pcieport 0000:00:07.0: pciehp: Slot(7): Link Up
pci 0000:08:00.0: [1af4:1041] type 00 class 0x020000 PCIe Endpoint
pci 0000:08:00.0: BAR 4 [mem 0x00000000-0x00003fff 64bit pref]
pci 0000:08:00.0: BAR 4 [mem 0x8000c00000-0x8000c03fff 64bit pref]: assigned
pcieport 0000:00:07.0: PCI bridge to [bus 08]
virtio-pci 0000:08:00.0: Adding to iommu group 13
virtio-pci 0000:08:00.0: enabling device (0000 -> 0002)
virtio_net virtio3 ens7: renamed from eth0
```

(발췌.) 단계로 나누면 다음과 같습니다.

| 단계 | 로그 | 담당 |
|------|------|------|
| 1 | `Button press: will power on in 5 sec` | pciehp가 Attention Button 이벤트를 받음 (`pciehp_ctrl.c:173`) |
| 2 | `Card present`, `Link Up` | Presence Detect와 링크 확인 (280-283행) |
| 3 | `[1af4:1041] type 00 ... PCIe Endpoint` | PCI core가 bus 8을 다시 훑음 |
| 4 | `BAR ... assigned`, `PCI bridge to [bus 08]` | rp5 window 안에 BAR 배치 |
| 5 | `Adding to iommu group 13` | IOMMU group 생성 |
| 6 | `enabling device`, `renamed from eth0` | virtio-pci·virtio_net 드라이버 probe |

rp5 window는 장치가 없을 때부터 잡혀 있었습니다. 부팅 뒤 `/proc/iomem`에 비어 있는 bus 8의 `10a00000-10bfffff`와 `8000c00000-8000dfffff : PCI Bus 0000:08`이 있었고, 새 BAR가 그 안에 들어갔습니다. hot-plug slot에 미리 window를 남겨 두지 않으면 나중에 붙는 장치의 BAR가 들어갈 곳이 없습니다.

## Hot-plug 시퀀스 — 제거

같은 장치를 `device_del`로 뗐습니다.

```text
pcieport 0000:00:07.0: pciehp: Slot(7): Button press: will power off in 5 sec
```

이 VM에서 이 줄 뒤에는 커널 로그가 더 남지 않았지만, `lspci -tv`에서 bus 8이 다시 비고(`\-07.0-[08]--`), Slot Status는 `PresDet-`, Link Status는 `DLActive-`로 돌아갔습니다. 버튼 이벤트 뒤 5초를 기다리는 것은 사용자가 버튼을 다시 눌러 취소할 시간입니다. 같은 파일 193-199행에 "canceling request to power off/on" 메시지가 있습니다.

## PF를 뽑으면 VF도 사라진다

VF 두 개를 켠 igb(03:00.0)를 `device_del igb0`로 뗐습니다.

```text
pcieport 0000:00:05.0: pciehp: Slot(3): Button press: will power off in 5 sec
igbvf 0000:03:10.2: Link is Up 1000 Mbps Full Duplex
igbvf 0000:03:10.0: Link is Up 1000 Mbps Full Duplex
igb 0000:03:00.0: removed PHC on ens3
igb 0000:03:00.0: IOV Disabled
---
no bus 03 devices
```

(VF의 MAC filter 경고 줄을 뺀 발췌.) 버튼 이벤트 뒤 PF 드라이버의 `igb_remove()`(`igb_main.c:3847-`)가 `igb_disable_sriov()`를 부르고, 그 함수가 `pci_disable_sriov()`를 부른 뒤 `IOV Disabled`를 남겼습니다(3692-3720행). 그 결과 VF 03:10.0·03:10.2도 PF와 함께 사라져 bus 3에 아무 장치도 남지 않았습니다. VF를 guest에 넘겨 둔 상태였다면 그 guest의 장치도 같이 사라진다는 뜻입니다.

다시 `device_add igb,id=igb0,bus=rp3,netdev=n3`로 붙이자 PF가 열거되면서 VF BAR가 미리 배치됐습니다.

```text
pci 0000:03:00.0: VF BAR 0 [mem 0x00000000-0x0001ffff 64bit pref]: contains BAR 0 for 8 VFs
pci 0000:03:00.0: VF BAR 0 [mem 0x8000400000-0x800041ffff 64bit pref]: assigned
```

VF를 켜지 않았어도 PF 열거 때 TotalVFs 8개분(128 KiB)의 VF BAR 공간을 잡습니다. [Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)의 계산과 같은 값입니다.

## AER Recovery Callback Chain

복구 순서는 [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 QEMU 주입으로 따라갔습니다. callback 반환값은 Linux v6.12 `include/linux/pci.h:846-864`에 정의돼 있고, `err.c:191-278`이 그 값으로 다음 단계를 고릅니다.

| 반환값 | `err.c`가 하는 일 |
|------|------|
| `PCI_ERS_RESULT_CAN_RECOVER` | 모두 이 값이면 `mmio_enabled` 단계로 |
| `PCI_ERS_RESULT_NEED_RESET` | `slot_reset` 단계로 |
| `PCI_ERS_RESULT_RECOVERED` | `resume` 단계로 |
| `PCI_ERS_RESULT_DISCONNECT` | 복구 실패로 끝냄 |
| `PCI_ERS_RESULT_NO_AER_DRIVER` | callback 없는 장치가 있다는 표시. 이후 callback을 막고 실패 (`err.c:62-74`) |

시리즈 VM에서 callback이 없는 virtio-net은 `device recovery failed`, 장치 없는 root port는 `device recovery successful`로 끝났습니다. 드라이버가 callback을 가진 장치의 전체 사슬은 이 VM에서 재현하지 못했습니다([Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)에 이유가 있습니다).

## DPC Integration

QEMU 11.1.3에는 DPC Capability를 가진 장치 모델이 없어 DPC는 실행하지 않았습니다. Linux v6.12 `drivers/pci/pcie/dpc.c`에서 DPC 인터럽트는 `dpc_handler()`(351행)를 거쳐 `dpc_process_error()`(260행)로 가고, 복구는 AER과 같은 `pcie_do_recovery()`를 씁니다. Debian 커널은 `CONFIG_PCIE_DPC=y`이고, 시리즈 VM의 `/sys/bus/pci_express/drivers`에도 `dpc`가 등록돼 있지만 붙은 장치는 없습니다.

## ARI — Alternative Routing-ID Interpretation

기존 devfn은 Device 5비트와 Function 3비트로 나뉩니다. ARI는 이 8비트를 모두 Function 번호로 씁니다([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)). 장치에 ARI Capability가 있어도, 위 포트가 ARI Forwarding을 켜야 의미가 있습니다.

Linux v6.12 `pci_configure_ari()`(`drivers/pci/pci.c:3540-3565`)는 bridge의 DevCap2에 ARI Forwarding 지원이 있고 아래 장치에 ARI Extended Capability가 있으면 bridge의 DevCtl2 ARI 비트를 켭니다. 시리즈 VM에서 두 root port가 그 차이를 보입니다.

```text
== 00:03.0
		DevCtl2: Completion Timeout: 50us to 50ms, TimeoutDis- ARIFwd-
== 00:05.0
		DevCtl2: Completion Timeout: 50us to 50ms, TimeoutDis- ARIFwd+
		ARICap:	MFVC- ACS-, Next Function: 0
		IOVCtl:	Enable- Migration- Interrupt- MSE- ARIHierarchy+ 10BitTagReq-
```

NVMe가 달린 00:03.0은 `ARIFwd-`, ARI를 가진 igb 아래 00:05.0은 `ARIFwd+`입니다. igb의 SR-IOV Control에는 `ARIHierarchy+`가 켜졌는데, `iov.c:762-764`가 bus의 ARI 상태(`pci_ari_enabled()`)를 보고 `PCI_SRIOV_CTRL_ARI`를 씁니다. 같은 파일 876-877행 주석은 이 비트가 First VF Offset과 Stride 값에 영향을 준다고 적습니다. 시리즈 VM의 VF offset 128은 QEMU igb 모델의 고정값(`hw/net/igb.c:85` `IGB_VF_OFFSET 0x80`)이고, QEMU는 ARI 비트에 따라 이 값을 바꾸지 않습니다.

## EEH — POWER Architecture

IBM POWER 계열의 EEH는 Linux v6.12 `Documentation/arch/powerpc/eeh-pci-error-recovery.rst`가 설명하는 별도 오류 처리 하드웨어이고, `Documentation/PCI/pci-error-recovery.rst`(13-26행)는 PCI-E chipset과 Power4·5·6 pSeries host bridge를 같은 오류 복구 API로 다룬다고 적습니다. 이 VM에서는 실행하지 않았습니다.

## 자주 하는 실수

### "Hot-plug는 꽂으면 바로 붙는다"

pciehp는 Attention Button 이벤트 뒤 5초를 기다리고, 그 사이 다시 누르면 취소합니다. 장치가 보이지 않으면 Slot Status의 `PresDet`, Link Status의 `DLActive`, 그리고 포트에 미리 잡힌 bridge window를 차례로 봅니다.

### "PF와 VF는 따로 관리된다"

PF를 떼자 VF도 함께 사라졌습니다. VF를 guest에 넘길 때는 PF가 뽑히거나 PF 드라이버가 내려갈 때의 영향까지 포함해 계획해야 합니다.

### "ARI = SR-IOV"

ARI는 Routing ID 해석이고, SR-IOV는 VF를 만드는 기능입니다. 시리즈 VM에서는 ARI가 켜져 있었고 VF offset은 128이었습니다. 두 기능은 함께 쓰이지만 같은 것은 아닙니다.

### "AER recovery는 자동"

callback 없는 드라이버의 장치는 `NO_AER_DRIVER`로 복구가 실패합니다. 시리즈 VM의 virtio-net이 그 예입니다.

## 정리

- QEMU의 `device_add`·`device_del`은 Attention Button 이벤트로 전달되고, pciehp는 5초 뒤 전원을 켜거나 끕니다.
- 붙일 때는 Card present → Link Up → 열거 → BAR 배치 → IOMMU group → 드라이버 probe 순서로 로그가 남았습니다.
- hot-plug slot에는 장치가 없을 때부터 bridge window가 잡혀 있어야 BAR가 들어갑니다.
- VF가 켜진 PF를 떼면 `pci_disable_sriov()`로 VF가 함께 사라집니다.
- ARI는 포트의 ARI Forwarding과 장치의 ARI Capability가 함께 있어야 켜지고, SR-IOV의 offset·stride에 영향을 줍니다.

## 다음 편

[Ch 15: Tools — lspci·setpci·pcimem·protocol analyzer](/blog/embedded/hardware/pcie/chapter15-tools)에서 이 시리즈에서 쓴 도구를 정리하고, 도구가 보여 주지 않는 것을 짚습니다.

## 관련 항목

- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — AER 주입과 복구
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — pcie-portdrv
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1) — PF·VF와 소유권
- [Ch 13: Virtualization II](/blog/embedded/hardware/pcie/chapter13-virtualization-2) — 같은 hot-plug 장치의 virtio feature

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3 기준이고 실행은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
