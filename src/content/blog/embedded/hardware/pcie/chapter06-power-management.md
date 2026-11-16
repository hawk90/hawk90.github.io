---
title: "Ch 6: Power Management — D-state·L-state·ASPM"
slug: "embedded/hardware/pcie/chapter06-power-management"
date: 2026-05-19T09:06:00
description: "PCIe 전력 관리 — Device D0~D3·Link L0~L3·ASPM·L1 substates·CLKREQ·PME 흐름."
series: "PCIe Deep Dive"
seriesOrder: 6
tags: [pcie, power-management, aspm, l1-substates, clkreq, pme]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 두 축을 나눠야 하는 이유

장치가 한동안 I/O를 하지 않는다고 장치 전원과 링크를 모두 꺼도 되는 것은 아닙니다. 다시 깨우는 데 걸리는 시간, 깨우는 신호가 지나갈 길, 같은 상위 포트를 쓰는 다른 장치가 각각 제약을 만듭니다. 그래서 PCIe 전력 관리는 **장치 상태 D-state**와 **링크 상태 L-state**를 따로 둡니다. 집으로 치면 D-state는 방 안의 가전을 끄는 일, L-state는 복도 조명을 끄는 일입니다. 방 가전은 켜 둔 채 복도 불만 끌 수도 있습니다.

이 장은 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에서 D-state를 직접 바꿔 보고, ASPM 설정이 레지스터까지 가는지 확인합니다. 소스는 Linux v6.12의 `Documentation/power/pci.rst`, `drivers/pci/pcie/aspm.c`, `drivers/pci/pci-driver.c`입니다. 전력이나 복귀 시간은 가상 머신에서 측정할 수 없어 다루지 않습니다.

## 장치 상태와 링크 상태

[Linux v6.12 PCI PM 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/power/pci.rst)(88-137행)가 D-state를 이렇게 정리합니다.

| 장치 상태 | 문서 내용 |
|------|------|
| D0 | 전원이 모두 들어간 상태. 모든 장치가 가짐 |
| D1·D2 | 선택. PM Capability에 지원 비트가 있을 때만 |
| D3hot | PCI PM을 구현한 장치는 반드시 지원. 소프트웨어가 PMCSR로 들어가게 할 수 있고, config 레지스터는 응답하지만 I/O·memory 공간은 꺼짐 |
| D3cold | 공급 전압이 빠진 상태. 장치를 프로그래밍해서 들어가게 할 수는 없음. D0로 돌아올 때 power-on reset과 기본값 복원 |

같은 문서의 전이 표는 낮은 D-state에서 더 깊은 D-state나 D0로만 갈 수 있다고 적습니다(D1 → D2·D3, D2 → D3, D1~D3 → D0). QEMU 11.1.3 `pci_pm_update()`(`hw/pci/pci.c:498-536`)도 같은 규칙을 코드로 가집니다. 지원하지 않는 D1·D2로 가거나, 0이 아닌 상태에서 더 얕은 0이 아닌 상태로 가는 쓰기는 이전 값으로 되돌립니다.

시리즈 VM 장치들의 PM Capability입니다.

```text
== 01:00.0
	Capabilities: [60] Power Management version 3
		Flags: PMEClk- DSI- D1- D2- AuxCurrent=0mA PME(D0-,D1-,D2-,D3hot-,D3cold-)
		Status: D0 NoSoftRst+ PME-Enable- DSel=0 DScale=0 PME-
== 02:00.0
	Capabilities: [c8] Power Management version 2
		Flags: PMEClk- DSI+ D1- D2- AuxCurrent=0mA PME(D0-,D1-,D2-,D3hot-,D3cold-)
		Status: D0 NoSoftRst- PME-Enable- DSel=0 DScale=0 PME-
```

세 장치 모두 D1·D2를 지원하지 않고, 어느 상태에서도 PME를 내지 않는다고 광고합니다. `NoSoftRst`는 Linux `pci_regs.h:256`의 `PCI_PM_CTRL_NO_SOFT_RESET`, "No reset for D3hot->D0"입니다. NVMe는 D3hot에서 D0로 돌아와도 내부 상태를 유지한다고 하고, e1000e는 아니라고 합니다.

링크 쪽은 L0(정상 전송), L0s·L1(ASPM 절전), L1 substates, L2·L3(전원 제거 문맥)으로 나뉩니다. 이 VM의 QEMU 장치는 L0s만 광고합니다(`LnkCap: ... ASPM L0s`). L1·L1 substates는 아래에서 Linux 소스로만 다룹니다.

## D3hot을 직접 만들어 보기

e1000e(02:00.0)에서 드라이버를 떼고 PMCSR(PM Capability + 4, `PCI_PM_CTRL`)에 3을 썼습니다. 하위 2비트(`PCI_PM_CTRL_STATE_MASK`)가 D-state입니다.

```bash
echo 0000:02:00.0 > /sys/bus/pci/drivers/e1000e/unbind
setpci -s 02:00.0 c8+4.w=0003
```

```text
PMCSR=0003
		Status: D3 NoSoftRst- PME-Enable- DSel=0 DScale=0 PME-
(qemu) xp /4wx 0x10240000
10240000: 0xffffffff 0xffffffff 0xffffffff 0xffffffff
(qemu) xp /2wx 0x4010200000
4010200000: 0x10d38086 0x00100002
```

D3hot에서 BAR0(0x10240000) 읽기는 모두 1이고, ECAM으로 읽은 config의 Vendor·Device ID는 그대로 0x10d38086입니다. 문서가 말한 "config는 응답, memory 공간은 꺼짐"이 그대로 나옵니다. QEMU 쪽 구현은 `pci_update_mappings()`(`hw/pci/pci.c:1743-1745`)에서 PM 상태가 0이 아니면 BAR를 `PCI_BAR_UNMAPPED`로 두는 코드입니다. PMCSR에 0을 다시 쓰자 같은 주소가 `0x18140241 0x00000000 0x00080283 0x00000000`을 돌려줬고, 드라이버를 다시 붙였습니다.

드라이버가 붙은 장치에서 같은 실험을 하면 드라이버가 갑자기 모두 1을 읽게 되므로 하지 않습니다. 실제 시스템에서 D-state 전환은 드라이버의 PM 콜백과 PCI core가 맡습니다.

## runtime PM — 'suspended'와 D-state는 다르다

드라이버 없이 둔 장치의 sysfs `power/control`을 `auto`로 바꾸면 어떻게 되는지도 봤습니다.

```text
control=on status=active state=D0
after auto: status=suspended state=D0
		Status: D0 NoSoftRst- PME-Enable- DSel=0 DScale=0 PME-
```

runtime PM 상태는 `suspended`인데 `power_state`와 PMCSR은 D0입니다. Linux v6.12 `pci_pm_runtime_suspend()`(`drivers/pci/pci-driver.c:1284-1301`)는 드라이버가 없는 장치를 D0에 두고 config만 저장합니다. 주석은 그 위 bridge가 runtime suspend하면 D3cold로 갈 수 있어 미리 저장한다고 적습니다. `runtime_status`만 보고 장치가 저전력 D-state에 있다고 판단하면 안 되는 이유입니다. D-state는 sysfs `power_state`나 `lspci -vv`의 `Status: D?`로 따로 읽습니다.

## Linux에서 관찰하기

이전 판이 "조회 예"로만 적었던 명령을 시리즈 VM에서 실행했습니다.

```bash
for b in 0000:01:00.0 0000:02:00.0 0000:06:00.0; do
  d=/sys/bus/pci/devices/$b
  echo "$b control=$(cat $d/power/control) runtime_status=$(cat $d/power/runtime_status)" \
       "wakeup=$(cat $d/power/wakeup 2>&1) power_state=$(cat $d/power_state)" \
       "d3cold_allowed=$(cat $d/d3cold_allowed)"
done
cat /sys/module/pcie_aspm/parameters/policy
```

```text
0000:01:00.0 control=on runtime_status=active wakeup=disabled power_state=D0 d3cold_allowed=1
0000:02:00.0 control=on runtime_status=active wakeup=enabled power_state=D0 d3cold_allowed=1
0000:06:00.0 control=on runtime_status=active wakeup=disabled power_state=unknown d3cold_allowed=0
aspm policy: [default] performance powersave powersupersave
```

세 가지를 읽을 수 있습니다. PM Capability가 없는 `edu`(06:00.0)는 `power_state=unknown`입니다. e1000e는 PM Capability가 PME를 하나도 지원하지 않는데 `wakeup=enabled`입니다. PCI core는 PME를 지원하는 장치만 wakeup capable로 만들지만(`drivers/pci/pci.c:3231-3247`), e1000e 드라이버가 EEPROM의 WoL 설정이나 manageability 모드를 보고 `device_wakeup_enable()`을 직접 부르기 때문입니다(`e1000e/netdev.c:7645-7651`). `wakeup` 속성은 장치가 깨울 수 있다는 증명이 아니라 커널의 wakeup 정책 값입니다. 마지막으로 ASPM 정책은 `default`입니다. Debian 커널은 `CONFIG_PCIEASPM_DEFAULT=y`입니다.

## ASPM과 CLKREQ#

ASPM은 장치가 D0일 때도 idle link를 L0s·L1로 내리는 기능입니다. Linux v6.12 `policy_to_aspm_state()`(`aspm.c:269-285`)의 정책별 요청은 다음과 같습니다.

| 정책 | 요청하는 상태 |
|------|------|
| `performance` | 0 (ASPM·Clock PM 끔) |
| `powersave` | L0s·L1 |
| `powersupersave` | L1 substates까지 전부 |
| `default` | `link->aspm_default`, 부팅 때 firmware가 켜 둔 상태 그대로 |

이 요청은 그대로 레지스터로 가지 않습니다. `pcie_config_aspm_link()`(`aspm.c:908-962`)는 먼저 양쪽 LnkCap이 모두 지원하는 상태(`aspm_capable`)와 사용자가 끈 상태(`aspm_disable`)로 걸러 낸 뒤, 양쪽의 Link Control에 쓰고 `link->aspm_enabled`에 기록합니다. sysfs `link/l0s_aspm`을 읽으면 이 `aspm_enabled` 값이 나옵니다(`aspm_attr_show_common()`, 1535-1543행).

시리즈 VM에서 NVMe 링크에 L0s를 요청했습니다.

```bash
echo powersave > /sys/module/pcie_aspm/parameters/policy
echo 1 > /sys/bus/pci/devices/0000:01:00.0/link/l0s_aspm
```

```text
policy=default performance [powersave] powersupersave  l0s_aspm=1
		LnkCtl:	ASPM Disabled; RCB 64 bytes, LnkDisable- CommClk-
		LnkCtl:	ASPM Disabled; RCB 64 bytes, LnkDisable- CommClk-
raw LNKCTL ep=0000 rp=0000
```

커널은 `l0s_aspm=1`이라고 답하지만, 장치와 root port의 Link Control은 둘 다 0입니다. QEMU 11.1.3 `pcie_cap_lnkctl_init()`(`hw/pci/pcie.c:385-390`)이 Link Control에서 Common Clock Configuration과 Extended Synch 두 비트만 쓰기 가능으로 열어 두어, ASPM Control 비트 쓰기가 버려졌습니다. Ch 2의 Extended Tag와 같은 현상입니다. 실제 하드웨어에서도 ASPM이 켜졌는지는 sysfs가 아니라 `lspci -vv`의 `LnkCtl: ASPM ...`으로 확인합니다. 실험 뒤 정책을 `default`로 되돌렸고, 그러자 `l0s_aspm`도 0으로 돌아갔습니다.

이 실험에는 함정이 하나 있었습니다. 처음에 `l0s_aspm`에 0을 쓴 뒤 `powersave`로 바꾸자 L0s가 켜지지 않았습니다. `aspm_attr_store_common()`(1545-1576행)이 0 쓰기를 `aspm_disable` 마스크에 남겨 두고, 정책을 바꿔도 그 마스크가 먼저 적용되기 때문입니다. sysfs로 ASPM을 비교 실험할 때는 상태를 하나씩 되돌리며 기록해야 합니다.

CLKREQ#를 이용한 Clock PM도 같은 구조입니다. `pcie_clkpm_cap_init()`(`aspm.c:356-379`)은 링크 아래 모든 function의 LnkCap에 `PCI_EXP_LNKCAP_CLKPM`(0x00040000)이 있어야 capable로 보고, 켜진 상태는 LnkCtl의 `PCI_EXP_LNKCTL_CLKREQ_EN`(0x0100)으로 판단합니다. 시리즈 VM 장치는 모두 `ClockPM-`라서 대상이 아닙니다.

## L1 PM Substates와 LTR

L1 substates(Extended Capability 0x1E)는 L1보다 깊은 L1.1·L1.2를 정의합니다. Linux v6.12 `pci_regs.h:1087-1104`에는 PCI-PM L1.2·ASPM L1.2 지원 비트와 L1.2 진입 기준인 `LTR_L1.2_THRESHOLD` Value·Scale 필드가 있습니다. L1.2 진입 판단이 장치가 보고한 LTR 값과 이 threshold를 비교한다는 점에서 [Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)의 LTR이 여기와 연결됩니다.

시리즈 VM에는 L1SS·LTR Capability를 가진 장치가 없고, ACPI `_OSC`도 `platform does not support [LTR]`이었습니다. 실제 보드에서 L1 관련 erratum이 어떻게 드러나는지는 [BSP Ch 2](/blog/embedded/bsp/chapter02-datasheet)에 i.MX 사례가 있습니다.

## PME와 실제 wake 순서

wake는 초인종에 가깝습니다. 초인종에 전원이 있고, 소리가 집 안까지 전달되고, 누군가 문을 열어야 손님이 들어옵니다. Linux PM 문서(133-137행)는 D3cold에서 PME를 내는 능력이 선택이며 보조 전원(3.3Vaux)이 있어야 한다고 적습니다.

| 단계 | 시리즈 VM에서 확인한 것 |
|------|------|
| 장치가 PME를 낼 수 있는가 | PM Capability의 `PME(D0-,...,D3cold-)`. 세 장치 모두 지원 없음 |
| OS가 PME를 처리하는가 | `_OSC: OS now controls [PCIeHotplug SHPCHotplug PME AER PCIeCapability]`, root port마다 `PME: Signaling with IRQ 55` 등 |
| wake 정책 | sysfs `power/wakeup`. e1000e는 드라이버가 켜서 `enabled` |

PME를 지원하지 않는 장치에 `power/wakeup=enabled`가 붙어 있는 e1000e처럼, 세 칸 중 하나만 보고 "깨울 수 있다"고 판단하면 틀립니다.

## 실패를 가르는 기준

| 증상 | 시리즈 VM이 보여 준 원인 후보 | 확인할 값 |
|------|------|------|
| `control=auto`인데 장치가 D0 | 드라이버 없는 장치는 D0 유지 (`pci-driver.c:1293-1301`) | `power_state`, `Status: D?` |
| sysfs `l0s_aspm=1`인데 절전이 안 됨 | 레지스터 쓰기가 반영되지 않음 | `LnkCtl: ASPM ...`, `setpci CAP_EXP+10.w` |
| 정책을 바꿔도 ASPM이 안 켜짐 | 이전에 sysfs로 끈 상태가 `aspm_disable`에 남음 | 각 `link/*_aspm` 값 |
| 절전 뒤 MMIO가 모두 1 | 장치가 D3hot (memory 공간 꺼짐) | PMCSR, config는 정상인지 |
| wakeup `enabled`인데 깨지 않음 | 장치에 PME 지원이 없음 | PM Capability의 `PME(...)` |

## 정리

- D-state는 장치, L-state는 링크의 전력 상태이고 Linux sysfs에서도 따로 보입니다.
- D3hot에서는 config만 응답하고 BAR는 모두 1을 돌려줍니다. 시리즈 VM의 e1000e에서 확인했습니다.
- runtime PM `suspended`는 D-state가 아닙니다. 드라이버 없는 장치는 D0에 남습니다.
- ASPM 정책은 요청일 뿐이고, 양쪽 capability·사용자 disable 마스크를 거친 뒤 레지스터에 씁니다. 결과는 LnkCtl로 확인합니다.
- Clock PM은 모든 function의 `CLKPM` 지원이 필요합니다.
- PME wake는 장치 능력, OS 제어권, wakeup 정책 세 가지가 모두 맞아야 합니다.

## 다음 편

[Ch 7: Error Handling — Correctable·Uncorrectable·AER·DPC](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 시리즈 VM에 AER 오류를 주입하고 Linux 복구 흐름을 따라갑니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — PCI-PM Cap·LTR
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — PME 인터럽트가 지나는 MSI-X
- [Ch 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer) — LTSSM·L states 진입
- [BSP: SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet) — L1 timeout을 일으키는 i.MX erratum과 커널 driver 속 workaround 위치

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3 기준이고 실행은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
