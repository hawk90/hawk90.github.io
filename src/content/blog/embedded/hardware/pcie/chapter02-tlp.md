---
title: "Ch 2: TLP — Transaction Layer Packet"
slug: "embedded/hardware/pcie/chapter02-tlp"
date: 2026-05-19T09:02:00
description: "PCIe의 기본 packet인 TLP — Linux 드라이버가 직접 만드는 Configuration TLP header, Tag·Extended Tag, AER Header Log로 본 TLP, posted write와 read-back 순서."
series: "PCIe Deep Dive"
seriesOrder: 2
tags: [pcie, tlp, transaction-layer, split-transaction, routing]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"TLP는 Transaction Layer가 만드는 PCIe의 기본 packet이고, header 첫 바이트의 Fmt·Type이 그 종류를 정합니다."** 규격 본문 없이도 TLP를 볼 수 있는 창구가 셋 있습니다. 소프트웨어가 TLP를 직접 조립하는 Linux의 Altera root port 드라이버, 오류가 난 TLP의 header를 저장하는 AER Header Log, 그리고 Tag·Payload 크기를 정하는 Device Control 레지스터입니다.

[Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 3계층 구조를 봤습니다. 이 장은 Transaction Layer가 만드는 TLP를 위 세 창구로 들여다봅니다. 실험은 Ch 1의 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에서 했습니다.

## TLP를 손으로 만드는 드라이버

대부분의 root port는 CPU의 config 접근을 하드웨어가 TLP로 바꿉니다. 그래서 TLP 형식이 소프트웨어에 드러나지 않습니다. 예외가 Linux v6.12의 `drivers/pci/controller/pcie-altera.c`입니다. 이 드라이버는 Altera FPGA root port에 Configuration Request TLP의 header를 DW 단위로 직접 써 넣습니다. 우편물로 치면 봉투 겉면을 기계가 아니라 사람이 손으로 쓰는 경우라서, 무엇을 어디에 쓰는지가 코드에 그대로 남아 있습니다.

```c
/* TLP configuration type 0 and 1 */
#define TLP_FMTTYPE_CFGRD0		0x04	/* Configuration Read Type 0 */
#define TLP_FMTTYPE_CFGWR0		0x44	/* Configuration Write Type 0 */
#define TLP_FMTTYPE_CFGRD1		0x05	/* Configuration Read Type 1 */
#define TLP_FMTTYPE_CFGWR1		0x45	/* Configuration Write Type 1 */
#define TLP_PAYLOAD_SIZE		0x01
#define TLP_READ_TAG			0x1d
#define TLP_WRITE_TAG			0x10
#define RP_DEVFN			0
#define TLP_CFG_DW0(pcie, cfg)		\
		(((cfg) << 24) |	\
		  TLP_PAYLOAD_SIZE)
#define TLP_CFG_DW1(pcie, tag, be)	\
	(((PCI_DEVID(pcie->root_bus_nr,  RP_DEVFN)) << 16) | (tag << 8) | (be))
#define TLP_CFG_DW2(bus, devfn, offset)	\
				(((bus) << 24) | ((devfn) << 16) | (offset))
#define TLP_COMP_STATUS(s)		(((s) >> 13) & 7)
#define TLP_BYTE_COUNT(s)		(((s) >> 0) & 0xfff)
#define TLP_HDR_SIZE			3
```

(`pcie-altera.c:49-66` 발췌.) 이 매크로를 읽으면 Configuration Request header가 다음처럼 생겼다는 것을 알 수 있습니다.

| DW | 비트 | 내용 | 근거 |
|------|------|------|------|
| DW0 | 31:24 | Fmt·Type 한 바이트 (CfgRd0 = 0x04 등) | `TLP_CFG_DW0` |
| DW0 | 하위 | Length = 1 | `TLP_PAYLOAD_SIZE` |
| DW1 | 31:16 | Requester ID = `PCI_DEVID(bus, devfn)` | `TLP_CFG_DW1` |
| DW1 | 15:8 | Tag | 같은 매크로 |
| DW1 | 7:0 | Byte Enable | 같은 매크로 |
| DW2 | 31:24·23:16·하위 | 대상 Bus·devfn·레지스터 offset | `TLP_CFG_DW2` |

header가 3 DW라는 것도 `TLP_HDR_SIZE 3`에 있습니다. config 접근은 4바이트 하나를 읽고 쓰므로 Length가 1이고, 이 값이 DW 단위라는 것도 여기서 읽힙니다. Completion에서 상태와 byte count를 꺼내는 위치(`>> 13 & 7`, `& 0xfff`)도 같이 있습니다.

Fmt·Type 바이트를 비트로 펴면 규칙이 보입니다. 상위 3비트가 Fmt, 하위 5비트가 Type입니다.

| 값 | 2진수 | Fmt | Type | 의미 |
|------|------|------|------|------|
| 0x04 | 000 00100 | 000 | 00100 | Config Read Type 0 |
| 0x44 | 010 00100 | 010 | 00100 | Config Write Type 0 |
| 0x05 | 000 00101 | 000 | 00101 | Config Read Type 1 |
| 0x45 | 010 00101 | 010 | 00101 | Config Write Type 1 |

Read와 Write는 Type이 같고 Fmt의 가운데 비트만 다릅니다. 이 비트가 data payload가 붙는지를 나타냅니다. Type 4·5는 DesignWare PCIe 컨트롤러 드라이버의 outbound ATU 설정값(`pcie-designware.h:164-168`)에서도 같은 값으로 나옵니다.

| `PCIE_ATU_TYPE_*` | 값 | TLP 종류 |
|------|------|------|
| `MEM` | 0x0 | Memory |
| `IO` | 0x2 | I/O |
| `CFG0` | 0x4 | Configuration Type 0 |
| `CFG1` | 0x5 | Configuration Type 1 |
| `MSG` | 0x10 | Message |

여기에 Altera 드라이버의 Completion 처리(`RXCPL` 레지스터, `TLP_COMP_STATUS`)를 더하면 Memory·I/O·Configuration·Message·Completion 다섯 종류가 두 드라이버 소스로 확인됩니다. 이전 판에 있던 64-bit Memory Write의 Fmt 값 같은 세부 인코딩은 공개 소스에서 확인하지 못해 뺐습니다.

## Requester ID — 16비트에 담긴 BDF

DW1의 상위 16비트는 `PCI_DEVID(bus, devfn)`입니다. Linux v6.12 `include/linux/pci.h:71`과 `include/uapi/linux/pci.h:31-33`의 정의를 합치면 비트 배치가 나옵니다.

| 비트 | 필드 | Linux 매크로 |
|------|------|------|
| 15:8 | Bus | `PCI_DEVID`의 `bus << 8` |
| 7:3 | Device | `PCI_SLOT(devfn)` = `(devfn >> 3) & 0x1f` |
| 2:0 | Function | `PCI_FUNC(devfn)` = `devfn & 0x07` |

ARI(Alternative Routing-ID Interpretation)를 켜면 Device 5비트를 따로 쓰지 않고 devfn 8비트 전체를 function 번호로 씁니다. 시리즈 VM에서는 igb(03:00.0)가 ARI Extended Capability(`[150 v1] Alternative Routing-ID Interpretation (ARI)`)를 갖고, 그 위 root port는 `DevCap2: ... ARIFwd+`로 ARI를 전달할 수 있다고 광고합니다. SR-IOV로 VF를 많이 만들 때 이 8비트가 필요해지고, [Ch 12](/blog/embedded/hardware/pcie/chapter12-virtualization-1)에서 실제로 VF를 만듭니다.

## Tag — outstanding request를 구분하는 번호

Memory Read 같은 Non-Posted request는 Completion이 돌아와야 끝납니다. requester는 응답을 기다리는 동안 다른 request를 더 보낼 수 있고, 돌아온 Completion이 어느 request의 답인지는 Tag로 맞춥니다. 식당 진동벨 번호와 같은 역할입니다. 번호 개수가 동시에 기다릴 수 있는 주문 수의 상한이 됩니다.

Altera 드라이버는 한 번에 하나만 보내므로 읽기 Tag 0x1d, 쓰기 Tag 0x10을 고정으로 씁니다. 반대로 여러 request를 겹쳐 보내는 장치는 Tag 필드 폭이 중요합니다.

| Tag 폭 | 공개 자료 |
|------|------|
| 8비트 Extended Tag | Device Capabilities의 `PCI_EXP_DEVCAP_EXT_TAG`, Device Control의 `PCI_EXP_DEVCTL_EXT_TAG`(`pci_regs.h:491,514`) |
| 10비트 Tag | pciutils 3.13.0이 `DevCap2`의 `10BitTagComp`·`10BitTagReq`를 표시함. Linux v6.12 `pci_regs.h`에는 해당 정의가 없음 |
| 14비트 Tag | [PCI-SIG FAQ](https://web.archive.org/web/20250117201651/https://pcisig.com/faq?page=3) "Were bit tags adjusted in the PCIe 6.0 specification?": 6.0에서 14비트로 늘렸다고 답함 |

10비트 Tag의 사용 범위는 구현마다 다릅니다. 한 예로 [Altera R-Tile Avalon-ST IP 사용자 가이드 26.1](https://docs.altera.com/r/docs/683501/26.1/r-tile-avalon-streaming-ip-for-pci-express-user-guide/tag-allocation)은 x16 컨트롤러가 Tag 256~1023을 써서 최대 768개, x8·x4 컨트롤러는 256~768로 최대 512개의 Non-Posted request를 낸다고 적습니다. 이 숫자는 그 IP의 값이고, PCIe 전체의 한계로 일반화하지 않습니다.

### Linux는 Extended Tag를 켰다고 하는데 레지스터는 그대로

Linux v6.12의 `pci_configure_extended_tags()`(`drivers/pci/probe.c:2143-2187`)는 장치가 Extended Tag를 지원하면 Device Control에 `PCI_EXP_DEVCTL_EXT_TAG`를 쓰고 "enabling Extended Tags"를 로그에 남깁니다. 시리즈 VM의 부팅 로그와 그 뒤의 `lspci -vv`를 나란히 놓으면 결과가 다릅니다.

```text
[    0.075073] pci 0000:00:03.0: enabling Extended Tags
[    0.095876] pci 0000:01:00.0: enabling Extended Tags
```

```text
01:00.0 Non-Volatile memory controller: Red Hat, Inc. QEMU NVM Express Controller (rev 02) (prog-if 02 [NVM Express])
		DevCap:	MaxPayload 128 bytes, PhantFunc 0, Latency L0s <64ns, L1 <1us
			ExtTag+ AttnBtn- AttnInd- PwrInd- RBE+ FLReset+ SlotPowerLimit 0W TEE-IO-
		DevCtl:	CorrErr- NonFatalErr- FatalErr- UnsupReq-
			RlxdOrd- ExtTag- PhantFunc- AuxPwr- NoSnoop- FLReset-
			MaxPayload 128 bytes, MaxReadReq 128 bytes
```

DevCap는 `ExtTag+`인데 DevCtl은 `ExtTag-`입니다. 원인은 QEMU 쪽에 있습니다. QEMU 11.1.3 `hw/pci/pcie.c:369-371`은 PCIe Capability의 Device Control에서 오류 보고 enable 네 비트(`CERE`·`NFERE`·`FERE`·`URRE`)만 쓰기 가능으로 열어 둡니다. 나머지 비트에 쓴 값은 버려지고, 커널은 쓴 뒤에 다시 읽어 확인하지 않습니다. 같은 이유로 이 VM의 `RlxdOrd`·`NoSnoop`·MaxPayload도 바뀌지 않습니다. 로그 한 줄이 레지스터 상태를 보증하지 않는다는 점은 실제 하드웨어에서도 같아서, 설정을 확인할 때는 `lspci -vv`로 다시 읽습니다.

## Payload 크기 — Max_Payload_Size와 Max_Read_Request_Size

TLP 하나가 실을 수 있는 data 크기는 Device Control의 두 필드가 정합니다. Linux v6.12 `pci_regs.h:507-524`의 인코딩입니다.

| 필드 | 비트 | 값 0~5 |
|------|------|------|
| Max_Payload_Size (`PCI_EXP_DEVCTL_PAYLOAD`) | 7:5 | 128·256·512·1024·2048·4096 바이트 |
| Max_Read_Request_Size (`PCI_EXP_DEVCTL_READRQ`) | 14:12 | 128·256·512·1024·2048·4096 바이트 |

두 필드 모두 상한이 4096바이트입니다. MPS는 TLP 하나에 실을 data, MRRS는 Memory Read 하나로 요청할 수 있는 양입니다. 시리즈 VM의 장치는 모두 `MaxPayload 128 bytes, MaxReadReq 128 bytes`로 보이는데, 위에서 본 대로 QEMU가 이 필드를 쓰기 가능으로 열지 않았기 때문입니다. Debian 커널의 MPS 정책은 `CONFIG_PCIE_BUS_DEFAULT=y`입니다(`/boot/config-6.12.116+deb13-arm64`).

## AER Header Log — 오류가 난 TLP를 보는 창구

TLP 오류가 나면 AER Capability의 Header Log(`PCI_ERR_HEADER_LOG`, offset 0x1c, 16바이트, `pci_regs.h:793`)에 그 TLP의 header가 남습니다. Linux는 이 네 DW를 `struct pcie_tlp_log`(`include/linux/aer.h:21-23`)로 읽어 `__print_tlp_header()`(`aer.c:667-671`)에서 16진수로 찍습니다.

QEMU monitor의 `pcie_aer_inject_error`는 오류 종류와 함께 header 네 DW를 받습니다. 위 Altera 매크로 그대로 "root port(bus 0, devfn 0)가 Tag 0x1d로 bus 7 장치의 offset 0x100을 Config Read Type 0으로 읽는" header를 만들어, switch 아래 virtio-net(07:00.0)에 Unsupported Request로 주입했습니다.

| DW | 계산 | 값 |
|------|------|------|
| DW0 | `0x04 << 24 \| 1` | 0x04000001 |
| DW1 | `PCI_DEVID(0, 0) << 16 \| 0x1d << 8 \| 0x0f` | 0x00001d0f |
| DW2 | `7 << 24 \| 0 << 16 \| 0x100` | 0x07000100 |

```text
(qemu) pcie_aer_inject_error vn1 UNSUP 0x04000001 0x00001d0f 0x07000100 0
OK id: vn1 root bus: 0000:00, bus: 7 devfn: 0.0
```

```text
pcieport 0000:00:06.0: AER: Uncorrectable (Non-Fatal) error message received from 0000:07:00.0
virtio-pci 0000:07:00.0: PCIe Bus Error: severity=Uncorrectable (Non-Fatal), type=Transaction Layer, (Requester ID)
virtio-pci 0000:07:00.0:   device [1af4:1041] error status/mask=00100000/02400000
virtio-pci 0000:07:00.0:    [20] UnsupReq               (First)
virtio-pci 0000:07:00.0: AER:   TLP Header: 01000004 0f1d0000 00010007 00000000
```

Unsupported Request는 `aer.c`의 분류대로 Transaction Layer 오류로 찍혔습니다. 그런데 TLP Header 줄은 넣은 값과 바이트 순서가 반대입니다. QEMU `hw/pci/pcie_aer.c:439`가 header DW를 `stl_be_p()`로 big-endian 저장하고, 게스트는 config dword를 little-endian으로 읽기 때문입니다. 0x04000001의 첫 바이트 0x04(Fmt·Type)가 config 공간의 가장 낮은 주소에 놓이고, 그 결과 dword 값으로는 01000004가 됩니다. `lspci -vv`의 `HeaderLog: 01000004 0f1d0000 00010007 00000000`도 같습니다. Header Log를 해석하는 도구를 만들거나 다른 플랫폼 로그와 비교할 때는, 각 플랫폼이 이 레지스터에 바이트를 어떤 순서로 두는지부터 확인해야 같은 header를 같은 값으로 읽습니다.

## Posted 쓰기와 read-back

[Linux v6.12 device-io 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/driver-api/device-io.rst)는 PCI bus의 쓰기가 posted, 즉 비동기라는 점을 직접 경고합니다(74-83행). 쓰기가 장치에 닿았는지 확인해야 하는 경우에는 같은 장치에서 read를 한 번 내야 하고, 장치가 reset 중이라 그 read가 실패할 수 있으면 응답이 없을 때도 실패로 끝나는 config space read를 쓰라고 합니다. `ioremap()` 매핑의 쓰기도 CPU가 장치 도착을 기다리지 않는다고 설명합니다(323-325행).

```c
/* 같은 장치의 레지스터를 다시 읽어 앞선 posted write가 도착했음을 확인 */
writel(DOORBELL_RING, regs + DOORBELL);
(void)readl(regs + STATUS);
```

위 코드의 레지스터 이름은 예시입니다. 핵심은 같은 장치에서 읽는다는 점입니다. 다른 장치를 읽어서는 이 확인이 되지 않습니다. 같은 문서는 반대로 I/O port 접근(`outb()`)은 PCI 규칙상 non-posted여야 하지만, x86이 아닌 많은 host bridge가 이를 지키지 않아 posted로 동작할 수 있다고도 적습니다(252-257행).

## Attribute — Relaxed Ordering과 No Snoop

TLP에는 순서 규칙과 cache snoop을 완화하는 attribute가 있고, 장치가 이를 쓸지는 Device Control의 enable 비트가 정합니다.

| 비트 | 정의 (`pci_regs.h`) | Linux 처리 |
|------|------|------|
| Relaxed Ordering | `PCI_EXP_DEVCTL_RELAX_EN` 0x0010 (506행) | root port에 `PCI_DEV_FLAGS_NO_RELAXED_ORDERING`이 있으면 아래 장치의 RO를 끔 (`probe.c:2205-2229`) |
| No Snoop | `PCI_EXP_DEVCTL_NOSNOOP_EN` 0x0800 (517행) | |
| ID-Based Ordering | `PCI_EXP_DEVCTL2_IDO_REQ_EN`·`IDO_CMP_EN` (672-673행) | |

RO를 끄는 플래그는 quirk가 붙입니다. `drivers/pci/quirks.c:4482-4486`의 `quirk_relaxedordering_disable()` 바로 아래 주석은 Broadwell·Haswell 기반 Intel Xeon root complex에서 RO가 설정된 upstream TLP가 Flow Control credit 문제로 성능 저하를 일으킨다고 적고, 해당 root port ID들에 이 quirk를 겁니다. 이렇게 되면 `pci_configure_relaxed_ordering()`이 "Relaxed Ordering disabled because the Root Port didn't support it"을 남기고 장치 쪽 RO를 끕니다.

RO를 실제로 쓰는 드라이버는 `pcie_relaxed_ordering_enabled()`(`probe.c:2195-2202`)로 이 비트를 읽고 결정합니다. v6.12에서 이 함수를 부르는 드라이버는 mlx5(이더넷·InfiniBand), bnxt_re, cxgb4·cxgb4vf, csiostor입니다(`grep -rln pcie_relaxed_ordering_enabled drivers`).

## ECRC — 끝에서 끝까지의 CRC

ECRC는 TLP 끝에 붙는 선택적 CRC입니다. 생성·검사 능력과 enable 비트는 AER Capability에 있고, 시리즈 VM의 root port는 `ECRCGenCap+ ECRCGenEn- ECRCChkCap+ ECRCChkEn-`로 능력은 있지만 꺼져 있습니다.

Linux에서 ECRC를 켜는 코드는 `CONFIG_PCIE_ECRC`가 있을 때만 들어갑니다(`aer.c:123-134`). 정책은 `bios`(firmware 설정 유지), `off`, `on` 세 가지이고 기본값은 `bios`입니다. Debian 13 arm64 커널은 `# CONFIG_PCIE_ECRC is not set`이라서, 이 커널에서는 부팅 인자로 ECRC를 켤 수 없고 firmware가 정한 상태가 그대로 남습니다. ECRC 검사 실패는 AER의 `PCI_ERR_UNC_ECRC`(ECRC Error Status) 비트로 보고됩니다.

## ATS·PRI·PASID·TPH

이 기능들은 TLP에 주소 변환·page request·address space 식별·처리 hint를 더하는 Extended Capability입니다. Linux v6.12 `pci_regs.h`의 ID는 ATS 0x0F, PRI 0x13, TPH Requester 0x17, PASID 0x1B입니다(726-738행). 시리즈 VM의 virtio-net(07:00.0)은 `ats=on`으로 띄워 `[148 v1] Address Translation Service (ATS)`가 보이고, Debian 커널은 `CONFIG_PCI_ATS=y`, `CONFIG_PCI_PRI=y`, `CONFIG_PCI_PASID=y`입니다. 동작은 [Ch 11 DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma)와 [Ch 19](/blog/embedded/hardware/pcie/chapter19-advanced-features)에서 다룹니다.

## 자주 하는 실수

### "MWr도 Completion을 기다린다"

Linux device-io 문서가 경고하는 대로 PCI 쓰기는 posted입니다. 도착을 확인하려면 같은 장치에서 read를 내야 하고, 장치가 응답하지 않을 수 있는 상황이면 config space read를 씁니다.

### "Tag 수는 장치가 원하는 만큼"

Tag 폭은 Extended Tag·10비트·14비트 기능을 지원하고 켰는지에 달렸고, 실제로 쓰는 범위는 구현이 정합니다. R-Tile IP처럼 x16과 x8 컨트롤러의 상한이 다른 경우도 있습니다. 그리고 시리즈 VM처럼 "enabling Extended Tags" 로그가 나와도 레지스터가 안 바뀔 수 있으니 `lspci -vv`로 확인합니다.

### "Header Log는 그대로 읽으면 된다"

QEMU는 header를 big-endian으로 저장해 Linux 로그에 바이트가 뒤집혀 나옵니다. 0x04000001을 넣었는데 01000004가 찍힙니다. 해석 도구를 만들 때는 기준 플랫폼에서 이미 아는 header를 넣어 보고 바이트 순서를 맞춥니다.

### "ECRC는 커널 인자로 켜면 된다"

`pci=ecrc=on`은 `CONFIG_PCIE_ECRC`로 빌드된 커널에서만 의미가 있습니다. Debian 13 arm64 커널은 이 옵션이 꺼져 있습니다.

### "Length는 byte 단위"

Altera 드라이버는 4바이트 config 접근에 Length 1을 씁니다. Length는 DW 단위입니다.

## 정리

- TLP header 첫 바이트는 Fmt(상위 3비트)와 Type(하위 5비트)입니다. Config Read Type 0은 0x04, Write는 0x44입니다.
- Configuration Request header는 3 DW이고, Requester ID·Tag·Byte Enable·대상 BDF·offset 위치가 Linux `pcie-altera.c` 매크로에 그대로 있습니다.
- Type 값 Memory 0, I/O 2, CFG0 4, CFG1 5, Message 0x10은 DesignWare ATU 정의와 일치합니다.
- Tag는 8비트(Extended), 10비트, 6.0의 14비트로 넓어졌고, 실제 범위는 구현마다 다릅니다.
- MPS·MRRS는 128~4096바이트 인코딩이고, QEMU VM에서는 쓰기가 막혀 128바이트로 고정입니다.
- AER Header Log로 오류 TLP를 보고, QEMU에서는 바이트 순서가 뒤집혀 보입니다.
- posted write의 도착은 같은 장치 read-back으로 확인합니다.
- RO는 root port quirk로 꺼질 수 있고, ECRC는 커널 빌드 옵션에 묶여 있습니다.

## 다음 편

[Ch 3: Configuration Space — 4 KB ECAM·Capability](/blog/embedded/hardware/pcie/chapter03-config-space)에서 Configuration TLP가 읽고 쓰는 4 KB 영역과 capability linked list를 분해합니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals) — 시리즈 VM 구성
- [Ch 7: Error Handling (AER)](/blog/embedded/hardware/pcie/chapter07-error-handling) — 같은 주입으로 본 오류 처리 흐름
- [Ch 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp) — TLP 아래 link-level 동작
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — ATS·PRI·PASID

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3 기준이고, 실행은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
