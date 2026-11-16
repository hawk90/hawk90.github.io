---
title: "Ch 7: Error Handling — Correctable·Uncorrectable·AER·DPC"
slug: "embedded/hardware/pcie/chapter07-error-handling"
date: 2026-05-19T09:07:00
description: "PCIe 에러 분류·계층별 처리·AER capability·DPC containment·Linux 복구 callback."
series: "PCIe Deep Dive"
seriesOrder: 7
tags: [pcie, error-handling, aer, dpc, flr]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"PCIe 오류는 Correctable, Uncorrectable Non-Fatal, Uncorrectable Fatal 세 등급이고, 장치가 오류를 '알아채는 것'과 '알리는 것'과 '복구되는 것'은 각각 다른 조건을 가집니다."** AER Capability가 오류를 비트 단위로 기록하고, Device Control의 enable 비트가 켜져 있어야 ERR_* 메시지가 root port로 올라가며, Linux는 드라이버의 `pci_error_handlers`가 있어야 복구를 끝냅니다. 세 조건 중 하나만 빠져도 결과가 달라지는 것을 QEMU 오류 주입으로 확인합니다.

[Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)에서 AER Header Log를 봤고, [Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)은 Data Link Layer의 replay를 다룹니다. 이 장은 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에 QEMU monitor의 `pcie_aer_inject_error`로 오류를 넣고 Linux v6.12 AER 드라이버가 어떻게 반응하는지 따라갑니다.

## Error 3-Tier 분류

Linux v6.12 `aer.c:437-441`의 severity 문자열이 세 등급입니다.

| 등급 | Linux 표기 | 기본 처리 (`drivers/pci/pcie/err.c`) |
|------|------|------|
| Correctable | `Correctable` | 기록·통계만. 복구 절차 없음 |
| Uncorrectable Non-Fatal | `Uncorrectable (Non-Fatal)` | 드라이버에 `pci_channel_io_normal`로 알리고 복구 절차 |
| Uncorrectable Fatal | `Uncorrectable (Fatal)` | `pci_channel_io_frozen`으로 알리고 그 위 포트의 link reset 뒤 복구 절차 |

Uncorrectable 오류가 Fatal인지 Non-Fatal인지는 오류 종류마다 고정이 아니라 AER의 Uncorrectable Error Severity 레지스터가 정합니다. 시리즈 VM root port의 기본값 `UESvrt: DLP+ SDES+ TLP- FCP+ ... RxOF+ MalfTLP+ ...`에서 `+`인 항목이 Fatal입니다. 그래서 아래 실험에서 Unsupported Request는 Non-Fatal, Malformed TLP는 Fatal로 처리됩니다.

## 계층별 에러

[Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 본 대로 `aer.c:418-433`은 오류 비트를 층으로 분류합니다. switch 아래 virtio-net(07:00.0, QEMU `aer=on`)에 Correctable 오류 세 개를 넣었습니다.

```text
(qemu) pcie_aer_inject_error vn1 BAD_DLLP
OK id: vn1 root bus: 0000:00, bus: 7 devfn: 0.0
```

```text
pcieport 0000:00:06.0: AER: Correctable error message received from 0000:07:00.0
virtio-pci 0000:07:00.0: PCIe Bus Error: severity=Correctable, type=Data Link Layer, (Receiver ID)
virtio-pci 0000:07:00.0:   device [1af4:1041] error status/mask=00000080/0000e000
virtio-pci 0000:07:00.0:    [ 7] BadDLLP               
virtio-pci 0000:07:00.0: PCIe Bus Error: severity=Correctable, type=Physical Layer, (Receiver ID)
virtio-pci 0000:07:00.0:    [ 0] RxErr                  (First)
virtio-pci 0000:07:00.0: PCIe Bus Error: severity=Correctable, type=Data Link Layer, (Transmitter ID)
virtio-pci 0000:07:00.0:    [12] Timeout
```

(세 주입의 로그 발췌.) Receiver Error는 Physical Layer, Bad DLLP와 Replay Timer Timeout은 Data Link Layer로 찍힙니다. 끝의 `(Receiver ID)`·`(Transmitter ID)`는 오류를 감지한 쪽이 수신기인지 송신기인지를 나타내는 agent 분류입니다. 메시지는 장치가 아니라 그 위 root port 00:06.0이 받았습니다. switch는 중간에서 ERR_* 메시지를 위로 전달만 했습니다.

## AER — Advanced Error Reporting

AER(Extended Capability 0x0001)의 레지스터는 Linux v6.12 `pci_regs.h:753-800`에 있습니다.

| 레지스터 | offset | 위 로그에서의 값 |
|------|------|------|
| Uncorrectable Error Status / Mask / Severity | 0x04 / 0x08 / 0x0c | `error status/mask=00100000/02400000` |
| Correctable Error Status / Mask | 0x10 / 0x14 | `00000080/0000e000` |
| Capabilities and Control (`PCI_ERR_CAP`) | 0x18 | First Error Pointer, ECRC 능력·enable |
| Header Log | 0x1c | 16바이트 |
| Root Command / Status / Error Source | 0x2c / 0x30 / 0x34 | root port만 |

Correctable mask 0x0000e000은 bit 13~15, Advisory Non-Fatal·Corrected Internal·Header Log Overflow입니다(`pci_regs.h:782-784`). 시리즈 VM root port의 `CEMsk: ... AdvNonFatalErr+ CorrIntErr+ HeaderOF+`와 같습니다.

Linux는 장치별 누적 개수를 sysfs에 둡니다. 아래 실험 뒤 root port 00:07.0의 값입니다.

```text
aer_dev_nonfatal: UnsupReq 1 TOTAL_ERR_NONFATAL 1  24
aer_dev_fatal: MalfTLP 1 TOTAL_ERR_FATAL 1  24
aer_rootport_total_err_fatal: 1  1
aer_rootport_total_err_nonfatal: 1  1
```

각 줄은 0이 아닌 항목과, 파일의 전체 줄 수(24)를 함께 찍은 것입니다.

## ERR Messages — 알리려면 enable 비트가 필요하다

장치가 오류를 감지해도 Device Control의 Correctable·Non-Fatal·Fatal·UR Reporting Enable 비트가 꺼져 있으면 ERR_COR·ERR_NONFATAL·ERR_FATAL 메시지를 보내지 않습니다. Linux v6.12 `pci_aer_init()`(`aer.c:367-392`)은 AER Capability가 있는 장치에서만 `pci_enable_pcie_error_reporting()`으로 이 네 비트(`PCI_EXP_AER_FLAGS`)를 켭니다.

시리즈 VM에서 같은 오류를 igb(03:00.0)와 NVMe(01:00.0)에 넣었더니 Linux 로그가 한 줄도 나오지 않았습니다.

```text
(qemu) pcie_aer_inject_error igb0 MALF_TLP
OK id: igb0 root bus: 0000:00, bus: 3 devfn: 0.0
```

```text
		DevSta:	CorrErr- NonFatalErr+ FatalErr+ UnsupReq- AuxPwr- TransPend-
		UESta:	DLP- SDES- TLP- FCP- CmpltTO- CmpltAbrt+ UnxCmplt- RxOF- MalfTLP+
		DevCtl:	CorrErr- NonFatalErr- FatalErr- UnsupReq-
```

(`lspci -s 03:00.0 -vv` 발췌.) 장치는 오류를 기록했습니다(`MalfTLP+`, `FatalErr+`). 하지만 DevCtl의 reporting enable이 모두 `-`라서 메시지가 나가지 않았습니다. 원인은 두 장치가 다릅니다.

| 장치 | AER Cap | DevCtl enable | 이유 |
|------|------|------|------|
| igb, e1000e | 있음 | 꺼짐 | QEMU 11.1.3 `igb.c`·`e1000e.c`가 `pcie_aer_init()`은 부르지만 `pcie_cap_deverr_init()`을 부르지 않아, DevCtl의 네 비트가 쓰기 가능으로 열리지 않음 |
| NVMe | 없음 | 꺼짐 | Linux `pci_aer_init()`이 AER Capability 없는 장치는 건너뜀 |
| virtio-net (`aer=on`), root port, switch port | 있음 | 켜짐 | QEMU가 `pcie_cap_deverr_init()`을 부름 |

QEMU 쪽 근거는 `hw/pci/pcie_aer.c:196-231`의 `pcie_aer_msg_alldev()`입니다. 메시지의 severity 비트가 DevCtl에 켜져 있지 않으면 전송을 멈춥니다. 위 주입 직전 igb의 Command 레지스터에 SERR# Enable(0x0100)도 켜 봤지만, 같은 함수가 SERR# 검사 뒤에 DevCtl을 다시 검사하므로 결과가 같았습니다.

실제 하드웨어에서도 이 구분은 그대로 쓸모가 있습니다. "AER 로그가 없다"는 오류가 없다는 뜻이 아닐 수 있습니다. 장치의 AER status와 DevCtl enable, 경로 위 bridge의 Bridge Control SERR#를 함께 봐야 합니다.

## DPC — Downstream Port Containment

DPC(Extended Capability 0x1D)는 downstream port가 오류를 감지하면 link를 끊어 오류가 퍼지지 않게 막는 기능입니다. QEMU 11.1.3 소스에서 `PCI_EXT_CAP_ID_DPC`는 Linux 헤더 사본에만 있고 장치 모델에는 없어서(`grep -rln PCI_EXT_CAP_ID_DPC hw include`), 이 VM에서는 DPC를 실행하지 않았습니다. Debian 커널은 `CONFIG_PCIE_DPC=y`입니다.

Linux v6.12 `drivers/pci/pcie/dpc.c`에서 확인한 동작은 이렇습니다. DPC 인터럽트를 받으면 `dpc_handler()`(351행)가 `dpc_process_error()`(260행)를 부르고, 그 함수가 `containment event, status:%#06x source:%#06x`를 남깁니다. link를 다시 살리는 것은 DPC가 아니라 그 뒤의 `pcie_do_recovery()`와 드라이버 callback입니다. 이 장에서 다루는 AER 복구 흐름과 같은 함수를 씁니다.

## Linux 복구 흐름 — 세 가지 결과

Linux v6.12 `pcie_do_recovery()`(`drivers/pci/pcie/err.c:193-270`)는 오류를 낸 장치가 bridge가 아니면 그 위 bridge를 기준으로 삼고, 아래 장치들의 드라이버에 차례로 알립니다. Fatal이면 먼저 `reset_subordinates()`로 bridge 아래 link를 reset합니다. 이 함수의 결과가 드라이버 callback 유무에 따라 어떻게 갈리는지 세 경우를 주입했습니다.

**1. 장치에 드라이버가 없거나 callback이 없다.** virtio-net에 Fatal Malformed TLP를 넣었습니다.

```text
pcieport 0000:00:06.0: AER: Uncorrectable (Fatal) error message received from 0000:07:00.0
virtio-pci 0000:07:00.0: AER: PCIe Bus Error: severity=Uncorrectable (Fatal), type=Inaccessible, (Unregistered Agent ID)
virtio-pci 0000:07:00.0: AER: can't recover (no error_detected callback)
pcieport 0000:05:01.0: AER: Downstream Port link has been reset (0)
pcieport 0000:05:01.0: AER: device recovery failed
```

`type=Inaccessible`은 Linux가 Fatal 오류를 낸 endpoint의 AER 레지스터를 읽지 않았다는 뜻입니다. `aer_get_device_error_info()`(`aer.c:1208-1250`)는 Uncorrectable 오류에서 root port·downstream port이거나 Non-Fatal일 때만 "link가 아직 IO 읽기에 건강하다"고 보고 레지스터를 읽습니다. 그다음 `report_error_detected()`(`err.c:49-86`)가 virtio-pci 드라이버에 `error_detected`가 없다는 것을 확인하고, switch downstream port 05:01.0 아래 link를 reset한 뒤 실패로 끝냅니다. 드라이버는 붙은 채로 남습니다.

**2. 장치가 bridge 자신이고 아래가 비어 있다.** 아무것도 달지 않은 root port rp5(00:07.0)에 Non-Fatal과 Fatal을 차례로 넣었습니다.

```text
pcieport 0000:00:07.0: AER: Uncorrectable (Non-Fatal) error message received from 0000:00:07.0
pcieport 0000:00:07.0: PCIe Bus Error: severity=Uncorrectable (Non-Fatal), type=Transaction Layer, (Requester ID)
pcieport 0000:00:07.0:    [20] UnsupReq               (First)
pcieport 0000:00:07.0: AER: device recovery successful
pcieport 0000:00:07.0: AER: Uncorrectable (Fatal) error message received from 0000:00:07.0
pcieport 0000:00:07.0: PCIe Bus Error: severity=Uncorrectable (Fatal), type=Transaction Layer, (Receiver ID)
pcieport 0000:00:07.0:    [18] MalfTLP                (First)
pcieport 0000:00:07.0: AER: Root Port link has been reset (0)
pcieport 0000:00:07.0: AER: device recovery successful
```

(발췌.) root port는 자기 AER 레지스터를 읽을 수 있어서 Fatal도 종류가 찍혔습니다. Fatal 쪽만 `Root Port link has been reset`(`aer.c:1559`)이 나오고, 둘 다 성공으로 끝났습니다.

**3. 드라이버가 callback을 가진 장치.** 시리즈 VM에서는 이 경우를 재현하지 못했습니다. callback을 가진 igb·e1000e·NVMe가 위에서 본 이유로 ERR 메시지를 보내지 않기 때문입니다. 대신 Linux v6.12 `include/linux/pci.h:867-887`의 callback 구조를 옮겨 둡니다.

| Callback | `err.c`에서 부르는 단계 |
|------|------|
| `error_detected(dev, state)` | 모든 경우 처음. `state`는 Non-Fatal이면 normal, Fatal이면 frozen |
| `mmio_enabled` | `error_detected`가 모두 `CAN_RECOVER`면 (`report_mmio_enabled`) |
| `slot_reset` | 누군가 `NEED_RESET`을 돌려주면 (`report_slot_reset`) |
| `resume` | 마지막 (`report_resume`) |
| `reset_prepare`·`reset_done` | AER 복구가 아니라 `pci_reset_function()` 같은 function reset 전후 |
| `cor_error_detected` | Correctable 오류의 추가 정보 기록 |

```c
static const struct pci_error_handlers mydrv_err_handler = {
	.error_detected = mydrv_error_detected,
	.slot_reset     = mydrv_slot_reset,
	.resume         = mydrv_resume,
};

static struct pci_driver mydrv_driver = {
	.name        = "mydrv",
	.id_table    = mydrv_ids,
	.probe       = mydrv_probe,
	.err_handler = &mydrv_err_handler,
};
```

위 등록 코드는 구조를 보이기 위한 예이고, `mydrv_*` 함수는 이 글에서 구현하지 않았습니다. 실제 예는 `drivers/net/ethernet/intel/igb/igb_main.c`의 `igb_err_handler`처럼 드라이버마다 있습니다.

## Poisoned TLP

Poisoned TLP는 data가 이미 잘못됐다고 표시해서 보낸 TLP입니다. 받은 쪽은 AER의 `PCI_ERR_UNC_POISON_TLP`(Poisoned TLP, `pci_regs.h:758`)로 기록합니다. Linux AER 드라이버는 이 비트를 `AER_LOG_TLP_MASKS`에 넣어 header log를 함께 읽습니다. poison은 내용이 틀렸다는 표시이고, header가 깨진 것을 찾아내는 CRC와는 역할이 다릅니다. CRC는 [Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)의 LCRC와 [Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)의 ECRC가 맡습니다.

## Reset 종류

Linux v6.12는 function reset 방법을 `pci_reset_fn_methods[]`(`drivers/pci/pci.c:5201-5210`)에 순서대로 둡니다. `device_specific`, `acpi`, `flr`, `af_flr`, `pm`, `bus`, `cxl_bus`입니다. 장치마다 쓸 수 있는 것은 sysfs `reset_method`에 나옵니다.

```text
0000:01:00.0 reset_method=flr bus
0000:02:00.0 reset_method=pm bus
0000:03:00.0 reset_method=flr pm bus
0000:06:00.0 reset_method=bus
0000:07:00.0 reset_method=flr pm bus
0000:00:01.0 reset_method=cat: '0000:00:01.0/reset_method': No such file or directory
```

| 방법 | 조건 | 시리즈 VM |
|------|------|------|
| `flr` | DevCap의 `PCI_EXP_DEVCAP_FLR`(`pci_regs.h:500`) | NVMe, igb, virtio-net |
| `pm` | PM Capability가 있고 `NoSoftRst-`, 즉 D3hot→D0에서 reset되는 장치 (`pci_pm_reset()`, `pci.c:4643-4652`) | e1000e, igb, virtio-net. NVMe는 `NoSoftRst+`라 없음 |
| `bus` | 위 bridge의 Secondary Bus Reset(`PCI_BRIDGE_CTL_BUS_RESET`, `pci_regs.h:167`) | root port·switch 아래 장치 |

root bus의 virtio-blk·virtio-net(00:01.0·00:02.0)은 위에 bridge가 없고 FLR·PM reset도 없어서 `reset_method` 파일 자체가 없습니다.

NVMe에 sysfs `reset`을 써서 FLR을 실행했습니다. 드라이버가 붙은 채로 `pci_reset_function()`이 `reset_prepare`·`reset_done`을 부르므로 NVMe 드라이버가 queue를 다시 만듭니다.

```text
rc=0
[ 2375.352120] nvme nvme0: 4/0/0 default/read/poll queues
[ 2375.352733] nvme nvme0: Ignoring bogus Namespace Identifiers
40960 bytes (41 kB, 40 KiB) copied, 0.0218619 s, 1.9 MB/s
```

reset 직후 읽기가 성공했습니다. 이 결과는 드라이버가 reset 전후 callback을 구현한 장치의 경우이고, reset 자체가 진행 중이던 I/O를 되살려 주지는 않습니다. 이 실험은 I/O가 없는 상태에서 했습니다.

## Replay·Replay Timer

Data Link Layer의 replay 관련 오류는 AER Correctable status의 두 비트로 보고됩니다. `PCI_ERR_COR_REP_ROLL`(REPLAY_NUM Rollover, 0x100)과 `PCI_ERR_COR_REP_TIMER`(Replay Timer Timeout, 0x1000)이고(`pci_regs.h:780-781`), 위 주입의 `[12] Timeout`이 후자입니다. 둘 다 Correctable이라 Linux는 기록만 하고 복구 절차를 돌리지 않습니다. 동작 원리는 [Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)에서 다룹니다.

## EEH — Enhanced Error Handling (POWER)

IBM POWER 계열에는 EEH라는 별도 오류 처리 하드웨어가 있습니다. Linux v6.12 `Documentation/arch/powerpc/eeh-pci-error-recovery.rst`는 EEH가 PCI bus 오류를 감지해 해당 카드만 "재부팅"하고 운영체제는 계속 돌게 하는 기능이라고 설명합니다. 같은 `pci_error_handlers` 인터페이스를 쓰므로, 드라이버가 callback을 구현하면 AER과 EEH 양쪽에서 복구에 참여합니다. 이 VM에서는 실행하지 않았습니다.

## 자주 하는 실수

### "AER 로그가 없으면 오류도 없다"

시리즈 VM의 igb는 `MalfTLP+`를 기록했는데 Linux 로그는 비어 있었습니다. Device Control의 reporting enable이 꺼져 있으면 오류 메시지가 나가지 않습니다. 장치의 `UESta`·`CESta`와 `DevCtl`을 직접 읽어 봅니다.

### "AER을 켜면 자동 복구된다"

virtio-net 실험은 AER 보고와 link reset까지 됐지만 `device recovery failed`로 끝났습니다. 복구 판단은 드라이버의 `error_detected`가 돌려주는 값에 달려 있고, callback이 없는 장치가 하나라도 있으면 `PCI_ERS_RESULT_NO_AER_DRIVER`가 됩니다(`err.c:62-74`).

### "Fatal이면 장치 레지스터에 원인이 찍힌다"

Linux는 Fatal 오류를 낸 endpoint의 AER 레지스터를 읽지 않고 `type=Inaccessible`로 남깁니다. 원인 비트는 reset 전에 `lspci -vv`나 `setpci`로 직접 읽어야 합니다.

### "FLR은 모든 장치가 지원한다"

시리즈 VM의 e1000e와 `edu`는 FLR이 없습니다. e1000e는 PM reset과 bus reset, `edu`는 bus reset만 됩니다. bus reset은 같은 bridge 아래 다른 function까지 reset합니다.

### "Replay Number Rollover면 끝"

Rollover와 Replay Timer Timeout은 Correctable이고 Linux는 복구 절차를 돌리지 않습니다. 같은 시각의 Uncorrectable 오류나 link 상태 변화와 함께 봐야 의미가 있습니다.

## 정리

- 등급은 Correctable, Non-Fatal, Fatal이고, Uncorrectable의 Fatal 여부는 Severity 레지스터가 정합니다.
- Linux는 오류 비트를 Physical·Data Link·Transaction Layer로 분류해 로그에 찍습니다.
- 메시지 전송에는 Device Control의 reporting enable이 필요합니다. QEMU의 igb·e1000e는 이 비트가 열리지 않아 오류가 Linux까지 오지 않습니다.
- Fatal 오류에서 Linux는 endpoint AER 레지스터를 읽지 않고 그 위 link를 reset합니다.
- 복구 성공 여부는 드라이버 callback이 정합니다. callback 없는 virtio-net은 실패, 빈 root port는 성공이었습니다.
- function reset 방법은 `flr`·`pm`·`bus` 등이고 장치마다 sysfs `reset_method`로 확인합니다.
- QEMU에는 DPC 모델이 없어 DPC는 소스로만 다뤘습니다.

## 다음 편

[Ch 8: Data Link Layer — DLLP·ACK/NAK·Flow Control·FLIT Mode](/blog/embedded/hardware/pcie/chapter08-dllp)에서 TLP에 신뢰성과 credit 기반 흐름 제어를 얹는 Data Link Layer를 공개 자료로 확인할 수 있는 범위에서 다룹니다.

## 관련 항목

- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — ECRC·Header Log
- [Ch 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp) — Replay·NAK
- [Ch 14: Linux Operations (Hot-plug·AER·DPC)](/blog/embedded/hardware/pcie/chapter14-linux-operations)
- [Ch 16: Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting) — error 시나리오
- [BSP Stability Testing](/blog/embedded/bsp/chapter19-stability-testing) — stress·soak 동안 AER 로그를 감시하는 양산 검증 흐름

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3 기준이고, 오류 주입은 Ch 1의 시리즈 VM에서 QEMU monitor로 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
