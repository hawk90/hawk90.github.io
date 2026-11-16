---
title: "Ch 8: Data Link Layer — DLLP·ACK/NAK·Flow Control·FLIT Mode"
slug: "embedded/hardware/pcie/chapter08-dllp"
date: 2026-05-19T09:08:00
description: "PCIe DLL — ACK/NAK·replay buffer·credit-based flow control·LCRC·Gen 6+ FLIT mode."
series: "PCIe Deep Dive"
seriesOrder: 8
tags: [pcie, dllp, ack-nak, flow-control, flit-mode]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"Data Link Layer는 소프트웨어가 직접 만지지 못하는 층이지만, 그 상태와 실패는 레지스터 몇 개로 드러납니다."** 링크가 TLP를 주고받을 수 있는지는 Link Status의 DL_Active 비트가, 재전송·무결성·흐름 제어의 실패는 AER의 Data Link 계열 비트가 알려 줍니다. Flit Mode에서는 DLLP가 Flit 안의 고정 자리로 들어가고, 재전송 정보는 Flit header로 옮겨 갑니다.

[Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 AER 오류를 주입했습니다. 이 장은 그중 Data Link Layer에 해당하는 부분을 모으고, 공개 자료로 확인할 수 있는 DLL 구조를 정리합니다.

## 이 장의 한계

DLLP의 바이트 형식, ACK/NAK 규칙, sequence number 폭, flow control credit의 단위 같은 세부는 회원 전용인 PCIe Base Specification에 있습니다. 이 장은 그 세부를 적지 않습니다. 대신 세 종류의 공개 자료로 확인한 것만 씁니다.

| 자료 | 이 장에서 확인하는 것 |
|------|------|
| Linux v6.12 `pci_regs.h`, `drivers/pci` | DL_Active 비트와 그 사용처, AER의 DLL 오류 비트 |
| 시리즈 VM (QEMU 11.1.3 virt, Debian 13, 커널 6.12.116) | DL_Active 값, AER 주입 결과 |
| [CXL 3.1 공개 규격](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf) | CXL이 PCIe에서 가져다 쓰는 DLLP·flow control·Flit 정의 |

CXL 규격은 PCIe Base Specification을 여러 곳에서 "as defined in PCIe Base Specification"으로 참조하면서 그 결과를 자기 문맥에 적습니다. 이 장은 그 문장들을 PCIe DLL의 공개된 그림자로 씁니다. CXL 고유의 규칙과 PCIe 규칙은 출처를 나눠 표시합니다.

## 소프트웨어가 보는 DLL — DL_Active

DLL이 링크 위에서 TLP를 주고받을 준비가 됐는지는 Link Status의 Data Link Layer Link Active 비트(`PCI_EXP_LNKSTA_DLLLA` 0x2000, `pci_regs.h:582`)로 보입니다. 포트가 이 비트를 보고할 수 있는지는 Link Capabilities의 `PCI_EXP_LNKCAP_DLLLARC`(0x00100000, 550행)가 알려 줍니다. 엘리베이터 문 위의 "운행 중" 표시등과 비슷합니다. 엘리베이터 안에서 무슨 일이 일어나는지는 안 보이지만, 탈 수 있는지는 그 불로 압니다.

시리즈 VM에서 장치가 달린 root port와 비어 있는 root port를 비교했습니다.

```text
== 00:03.0
			ClockPM- Surprise- LLActRep+ BwNot+ ASPMOptComp-
			TrErr- Train- SlotClk- DLActive+ BWMgmt- ABWMgmt-
== 00:07.0
			ClockPM- Surprise- LLActRep+ BwNot+ ASPMOptComp-
			TrErr- Train- SlotClk- DLActive- BWMgmt- ABWMgmt-
== 04:00.0
			ClockPM- Surprise- LLActRep- BwNot- ASPMOptComp-
			TrErr- Train- SlotClk- DLActive- BWMgmt- ABWMgmt-
```

NVMe가 달린 00:03.0은 `DLActive+`, 아무것도 없는 00:07.0은 `DLActive-`입니다. switch upstream port 04:00.0은 `LLActRep-`, 즉 보고 능력이 없으므로 `DLActive-`가 링크 상태를 뜻하지 않습니다. 이 비트를 읽기 전에 `LLActRep`부터 봐야 하는 이유입니다. QEMU 11.1.3의 `pcie_cap_fill_slot_lnk()`(`hw/pci/pcie.c:186-221`)는 2.5 GT/s를 넘는 slot 포트에 `DLLLARC`를 고정으로 켜고, 주석대로 `DLLLA` 비트는 hotplug 함수에서 바꿉니다.

Linux v6.12의 PCI core에서 이 비트를 읽는 곳은 다음과 같습니다. 이 밖에 Altera·Qualcomm·Tegra194·Aardvark·mvebu 같은 host controller 드라이버와 mlx5 같은 장치 드라이버도 이 비트를 읽습니다(`grep -rn PCI_EXP_LNKSTA_DLLLA drivers`).

| 위치 | 용도 |
|------|------|
| `pciehp_check_link_active()` (`hotplug/pciehp_hpc.c:235-248`) | hotplug slot에 장치가 링크를 올렸는지 판단 |
| `pcie_wait_for_link_status()` (`pci.c:4682-4701`) | 링크 재훈련·reset 뒤 DLLLA(또는 Link Training 비트)가 기대값이 될 때까지 대기 |
| `pci_bridge_wait_for_secondary_bus()` 안 (`pci.c:4933`) | reset 뒤 secondary bus 장치를 기다릴 때 링크가 active인지 확인 |
| `quirks.c:99`, `121` | 특정 장치의 링크 재훈련 quirk에서 링크 상태 확인 |

hotplug에서 이 비트가 실제로 바뀌는 모습은 [Ch 14](/blog/embedded/hardware/pcie/chapter14-linux-operations)에서 장치를 붙였다 떼며 봅니다.

## DLL 오류 — AER로 드러나는 부분

Linux v6.12 `aer.c:424-428`은 다음 비트를 Data Link Layer 오류로 분류합니다. 오른쪽 열은 `pci_regs.h:756-781`의 주석 그대로입니다.

| 비트 (`pci_regs.h`) | 등급 | 헤더 주석 |
|------|------|------|
| `PCI_ERR_COR_BAD_TLP` 0x40 | Correctable | Bad TLP Status |
| `PCI_ERR_COR_BAD_DLLP` 0x80 | Correctable | Bad DLLP Status |
| `PCI_ERR_COR_REP_ROLL` 0x100 | Correctable | REPLAY_NUM Rollover |
| `PCI_ERR_COR_REP_TIMER` 0x1000 | Correctable | Replay Timer Timeout |
| `PCI_ERR_UNC_DLP` 0x10 | Uncorrectable | Data Link Protocol |

TLP·DLLP를 "나쁘다"고 판정하는 검사, 재전송 횟수, 재전송 타이머가 이 층에 있다는 것까지가 이름으로 확인되는 범위입니다.

`PCI_ERR_UNC_FCP`(Flow Control Protocol, 0x2000)와 `PCI_ERR_UNC_SURPDN`(Surprise Down, 0x20)도 흐름 제어와 링크 단절에 관한 비트이지만, `aer.c`의 분류 매크로는 이 둘을 Transaction Layer로 찍습니다. 시리즈 VM root port의 Severity 기본값은 `UESvrt: DLP+ SDES+ TLP- FCP+ ...`로, DLP·Surprise Down·FCP 모두 Fatal입니다.

[Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)의 주입 결과에서 이 부분만 다시 옮깁니다.

```text
virtio-pci 0000:07:00.0: PCIe Bus Error: severity=Correctable, type=Data Link Layer, (Receiver ID)
virtio-pci 0000:07:00.0:   device [1af4:1041] error status/mask=00000080/0000e000
virtio-pci 0000:07:00.0:    [ 7] BadDLLP               
virtio-pci 0000:07:00.0: PCIe Bus Error: severity=Correctable, type=Data Link Layer, (Transmitter ID)
virtio-pci 0000:07:00.0:   device [1af4:1041] error status/mask=00001000/0000e000
virtio-pci 0000:07:00.0:    [12] Timeout
```

Bad DLLP는 받는 쪽(`Receiver ID`), Replay Timer Timeout은 보내는 쪽(`Transmitter ID`)으로 찍힙니다. `aer.c:400-416`의 agent 분류가 Correctable 오류 중 REPLAY_NUM Rollover와 Replay Timer Timeout 두 개만 송신기(`AER_AGENT_TRANSMITTER`)로 묶기 때문입니다. 재전송은 보낸 쪽의 일이라는 뜻입니다. 두 오류 모두 Correctable이라 Linux는 기록만 하고 복구 절차를 돌리지 않습니다.

## ACK/NAK와 Replay

공개 자료로 확인할 수 있는 replay 구조는 이름과 CXL 문장 몇 개입니다. 위 AER 비트 이름에는 재전송 횟수(REPLAY_NUM)와 재전송 타이머(Replay Timer)가 있고, CXL 3.1 §6.2.3.1.1은 256B Flit header 안의 `Replay Command[1:0]`과 `Flit Sequence Number[9:0]`이 "as defined in PCIe Base Specification"이라고 적습니다. 같은 절은 Prior Flit Type 필드 덕분에 받는 쪽이 앞 flit이 NOP나 IDLE이었다는 것을 알면, 그 flit에 CRC 오류가 있어도 replay 없이 버릴 수 있다고 설명합니다.

정리하면 송신 쪽은 보낸 것을 확인받을 때까지 들고 있다가 문제가 있으면 다시 보내고, Flit Mode에서는 그 번호와 명령이 각 Flit header에 실립니다. NAK의 정확한 조건과 replay 범위, Non-Flit Mode의 sequence number 폭은 이번에 연 자료에 없어 적지 않습니다.

## Credit-Based Flow Control

받는 쪽 buffer가 넘치지 않도록 credit을 주고받는 흐름 제어도 공개 자료에는 조각으로만 나옵니다. CXL 3.1 §7.7.7(Inter-Switch Links)은 "PCI Base Specification"의 Shared·Merged FC 초기화 규칙이 CXL switch 사이 링크에도 적용된다고 하면서 예를 듭니다. Dedicated buffer용으로 `InitFC1/2` 동안 Posted HDR credit 하나와 Posted DATA credit 하나를 교환했다면, 송신 쪽은 그것을 두 트래픽 종류에 각각 하나씩 있다고 가정한다는 예입니다. 같은 절은 buffer 해제를 알리는 데 `Update-FC DLLP`를 쓴다고 적습니다.

이 문장들에서 확인되는 것은 세 가지입니다. 링크가 올라올 때 `InitFC1`·`InitFC2`로 credit을 초기화하고, 운영 중에는 `Update-FC` DLLP로 credit을 돌려주며, credit은 Posted처럼 트래픽 종류마다 Header와 Data를 나눠 센다는 것입니다. 식당 예약석으로 치면 "4인 테이블 2개, 2인 테이블 3개"처럼 자리 종류별로 남은 수를 알려 주고, 손님이 나가면 빈자리를 다시 알려 주는 방식입니다. Non-Posted·Completion 클래스까지의 전체 목록과 credit 하나의 크기는 Base Specification 영역이라 적지 않습니다. CXL 3.1 Table 6-6은 보낼 다른 flit이 없을 때도 CXL.io link layer가 DLLP만 실은 NOP flit을 주기적으로 넣는다고 하고, 그 이유를 "PCIe Base Specification requirement for a credit update interval"로 적습니다. credit 갱신에는 정해진 주기 요구가 있다는 뜻입니다. 흐름 제어 규칙 위반은 위의 `PCI_ERR_UNC_FCP`로 보고됩니다.

## LCRC vs ECRC

TLP에 대한 검사는 두 층에 있습니다. Data Link Layer 쪽 검사 실패는 위의 Bad TLP로, Transaction Layer의 끝에서 끝까지 검사인 ECRC의 실패는 `PCI_ERR_UNC_ECRC`(ECRC Error Status)로 보고됩니다. ECRC는 [Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)에서 본 대로 AER의 `ECRCGenCap`·`ECRCChkCap` 능력 비트와 enable 비트로 켜고, Debian 13 arm64 커널은 `CONFIG_PCIE_ECRC`가 꺼져 있어 firmware 설정을 그대로 둡니다. 링크 구간 CRC(LCRC)의 다항식과 폭은 이번에 연 자료에 없습니다.

## FLIT Mode — DLL이 Flit 안으로

Flit Mode에서는 DLLP가 독립된 packet으로 오가지 않고 Flit 안의 정해진 자리에 실립니다. CXL 3.1 §6.2.3.1.1의 CXL.io Standard 256B Flit 그림이 그 배치입니다.

| 영역 | 크기 | CXL 3.1 §6.2.3.1.1의 설명 |
|------|------|------|
| Flit Header | 2 B | Flit Type, Prior Flit Type, Type of DLLP Payload, Replay Command, Flit Sequence Number |
| Flit Data (TLP) | 126 + 110 B | CXL.io TLP payload |
| DLLP | 4 B | Flit Data 끝. "as specified in PCIe Base Specification" |
| CRC | 8 B | Flit Header와 Flit Data 보호, 계산은 PCIe Base Specification대로 |
| FEC | 6 B | Header·Data·CRC 보호, 계산은 PCIe Base Specification대로 |

합계는 2 + 240 + 8 + 6 = 256바이트입니다. 이 표는 CXL.io가 쓰는 Standard 256B Flit이고, 같은 절은 이 flit의 CRC·FEC·DLLP 정의를 PCIe Base Specification에서 가져온다고 밝힙니다. PCIe 자체 Flit의 바이트 배치를 이 표로 단정하지는 않습니다.

오류 기록 방식도 Flit Mode에서 달라집니다. 2026-11-16에 kernel.org에서 받은 mainline `pci_regs.h`(7.4-rc3)에는 AER에 `PCI_ERR_CAP_TLP_LOG_FLIT`("TLP was logged in Flit Mode")와 `PCI_ERR_CAP_TLP_LOG_SIZE`("Logged TLP Size (only in Flit mode)")가 추가돼 있습니다. Linux v6.12에는 이 두 정의가 없습니다.

## DLLP CRC와 NOP

CXL 3.1 §6.2.3.1.1.1은 CXL.io NOP flit이 CXL.io Link Layer가 만들고 valid DLLP payload만 싣는 flit이며, transmit retry buffer에 넣지 않는다고 적습니다. 같은 절의 표에 따르면 TLP와 DLLP를 함께 싣는 CXL.io Payload flit은 retry buffer에 들어가고, DLLP만 실은 NOP flit은 들어가지 않습니다. Non-Flit Mode DLLP 자체의 CRC 폭은 이번에 연 자료에 없습니다.

## 자주 하는 실수

### "DL_Active-면 링크가 죽었다"

시리즈 VM의 switch upstream port는 `LLActRep-`라서 `DLActive-`가 아무 의미가 없습니다. 보고 능력(`LLActRep+`)이 있는 포트에서만 이 비트를 링크 상태로 읽습니다.

### "Replay Timer Timeout은 받는 쪽 문제"

Linux는 이 오류를 `Transmitter ID`로 분류합니다. 오류를 보고한 장치가 송신 쪽이므로, 원인을 찾을 때는 링크 반대편과 경로를 같이 봐야 합니다.

### "Flow Control = TLP 우선순위"

흐름 제어는 받는 쪽 buffer가 넘치지 않게 하는 credit 교환입니다. CXL §7.7.7의 예처럼 credit은 트래픽 종류와 Header·Data로 나뉩니다. 같은 절은 송신 쪽이 공유 credit 정보를 트래픽 종류 사이의 QoS 제한에 쓸 수 있다고 적지만, credit 자체가 TLP 우선순위 필드는 아닙니다.

### "Flit Mode에서도 Header Log는 4 DW 그대로"

mainline Linux가 Flit Mode 전용 AER 비트(`TLP_LOG_FLIT`, `TLP_LOG_SIZE`)를 추가한 것은 Flit Mode에서 Header Log 길이와 해석이 달라지기 때문입니다. v6.12 커널로 Flit Mode 장치의 Header Log를 읽으면 이 구분을 하지 않습니다.

### "DLL 상태는 config space에 하나도 없다"

개별 DLLP는 config dump에 나오지 않지만, DL_Active·LLActRep와 AER의 Data Link 오류 비트는 config space에 있습니다. 링크 문제를 볼 때 첫 단서가 여기서 나옵니다.

## 정리

- DLL의 준비 상태는 `LNKSTA_DLLLA`로 보이고, `LNKCAP_DLLLARC`가 있는 포트에서만 의미가 있습니다. 시리즈 VM에서 장치가 있는 root port는 `+`, 빈 root port는 `-`였습니다.
- Linux는 이 비트를 hotplug와 링크 대기에 씁니다.
- Bad TLP·Bad DLLP·REPLAY_NUM Rollover·Replay Timer Timeout·DLP가 Data Link Layer 오류이고, Replay Timer는 송신 쪽 오류로 찍힙니다.
- 흐름 제어는 `InitFC1/2`로 초기화하고 `Update-FC`로 credit을 돌려주며, Header·Data credit을 나눠 셉니다(CXL 3.1 §7.7.7).
- CXL.io 256B Flit은 2B header, 240B data(끝 4B DLLP), 8B CRC, 6B FEC이고, replay 번호와 명령이 header에 있습니다(CXL 3.1 §6.2.3.1.1).
- Flit Mode의 AER Header Log는 mainline Linux에서 별도 비트로 구분합니다.

## 다음 편

[Ch 9: Physical Layer — LTSSM·Equalization·Encoding](/blog/embedded/hardware/pcie/chapter09-physical-layer)에서 link training과 속도·폭 결정을 공개 자료와 Linux 코드로 따라갑니다.

## 관련 항목

- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — ECRC·Header Log
- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — AER 주입 전체 결과
- [Ch 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer)
- [Ch 14: Linux Operations](/blog/embedded/hardware/pcie/chapter14-linux-operations) — hotplug와 DL_Active
- [CXL Internals Ch 9: Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format) — CXL.cachemem의 별도 flit 형식

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3, CXL 3.1 공개 규격 기준이고 실행은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
