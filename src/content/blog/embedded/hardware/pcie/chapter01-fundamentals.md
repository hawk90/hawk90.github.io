---
title: "Ch 1: PCIe Fundamentals — 계층 구조와 토폴로지"
slug: "embedded/hardware/pcie/chapter01-fundamentals"
date: 2026-05-19T09:01:00
description: "PCIe 아키텍처의 기초 — point-to-point 직렬 링크, 3-Layer 모델, Root Complex·Switch·Endpoint 토폴로지, Gen 1부터 7.0까지의 진화."
series: "PCIe Deep Dive"
seriesOrder: 1
tags: [pcie, architecture, topology, root-complex, gen7]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"PCIe는 PCI의 공유 parallel bus를 point-to-point 직렬 링크로 바꾸고, 소프트웨어가 보는 configuration 모델은 PCI에서 그대로 물려받았습니다."** 토폴로지는 Root Port·Switch Port·Endpoint로 이루어진 트리이고, 장치는 자기 역할을 PCI Express Capability의 4비트 필드로 스스로 밝힙니다. 링크 속도는 2.5 GT/s에서 PCIe 7.0의 128 GT/s까지 올라갔고, 6.0부터는 PAM4와 256바이트 Flit이 들어왔습니다.

이 시리즈는 PCIe를 소프트웨어 쪽에서 봅니다. PCIe Base Specification 본문은 회원 전용이라 이 시리즈에서 인용하지 않습니다. 대신 PCI-SIG가 공개한 FAQ와 규격 목록, Linux v6.12의 `drivers/pci`와 `include/uapi/linux/pci_regs.h`, QEMU 11.1.3의 PCIe 모델, pciutils 3.13.0 소스를 1차 자료로 씁니다. 레지스터 값은 모두 아래 QEMU 가상 머신에서 직접 읽었습니다.

## 실험 환경

시리즈 전체가 같은 가상 머신을 씁니다. Apple Silicon Mac에서 QEMU 11.1.3으로 Debian 13 arm64 클라우드 이미지(`debian-13-nocloud-arm64.qcow2`, SHA512SUMS로 검증)를 띄웠고, 게스트 커널은 Debian 패키지 `6.12.116+deb13-arm64`, `lspci`는 Debian의 pciutils 3.13.0입니다.

```bash
qemu-system-aarch64 -M virt,iommu=smmuv3 -accel hvf -cpu host -smp 4 -m 4096 \
 -bios /opt/homebrew/share/qemu/edk2-aarch64-code.fd \
 -drive if=none,id=hd,file=ov.qcow2,format=qcow2 -device virtio-blk-pci,drive=hd \
 -nic user,model=virtio-net-pci,hostfwd=tcp:127.0.0.1:2241-:22 \
 -device pcie-root-port,id=rp1,chassis=1,slot=1,x-speed=16,x-width=16 \
 -device nvme,id=nvme0,bus=rp1,serial=pcie01,drive=nv -drive if=none,id=nv,file=nvme.img,format=raw \
 -device pcie-root-port,id=rp2,chassis=2,slot=2,x-speed=8,x-width=1 \
 -device e1000e,id=e1,bus=rp2,netdev=n2 -netdev user,id=n2,restrict=on \
 -device pcie-root-port,id=rp3,chassis=3,slot=3,x-speed=32,x-width=4 \
 -device igb,id=igb0,bus=rp3,netdev=n3 -netdev user,id=n3,restrict=on \
 -device pcie-root-port,id=rp4,chassis=4,slot=4 \
 -device x3130-upstream,id=up1,bus=rp4 \
 -device xio3130-downstream,id=dp1,bus=up1,chassis=5,slot=5 \
 -device xio3130-downstream,id=dp2,bus=up1,chassis=6,slot=6 \
 -device edu,id=edu0,bus=dp1 \
 -device virtio-net-pci,id=vn1,bus=dp2,netdev=n4,ats=on,aer=on,disable-legacy=on -netdev user,id=n4,restrict=on \
 -device pcie-root-port,id=rp5,chassis=7,slot=7,x-speed=64,x-width=16 \
 -serial unix:ser.sock,server,nowait -monitor unix:mon.sock,server,nowait -display none
```

root port 다섯 개 아래에 NVMe, e1000e(82574L), igb(82576), 그리고 TI XIO3130 모델로 만든 switch를 달았습니다. switch 아래에는 QEMU 교육용 장치 `edu`와 ATS·AER을 켠 virtio-net이 있습니다. rp5는 일부러 비워 두었습니다. 이후 장에서는 이 구성을 "시리즈 VM"이라고 부릅니다. 주소와 버스 번호는 이 VM의 값이고 실제 보드와는 다릅니다.

## PCI에서 PCIe로

[PCI-SIG FAQ](https://web.archive.org/web/20260604022039/https://pcisig.com/faq?page=1)("What prompted the creation of PCI Express architecture?")는 PCIe가 나온 이유를 PCI 같은 "traditional parallel buses"가 대역폭 요구를 따라가지 못했기 때문이라고 적습니다. 같은 FAQ는 PCIe의 특징으로 기존 PCI 소프트웨어 프로그래밍 모델과의 호환을 첫 줄에 둡니다. 물리 계층은 직렬 링크로 바꾸고, 소프트웨어가 보는 bus·device·function 번호와 configuration space는 그대로 두었습니다.

그래서 Linux에서 PCIe 장치를 보는 도구는 PCI 시절과 같습니다. 시리즈 VM에서 `lspci -tv`로 본 트리입니다.

```text
-[0000:00]-+-00.0  Red Hat, Inc. QEMU PCIe Host bridge
           +-01.0  Red Hat, Inc. Virtio network device
           +-02.0  Red Hat, Inc. Virtio block device
           +-03.0-[01]----00.0  Red Hat, Inc. QEMU NVM Express Controller
           +-04.0-[02]----00.0  Intel Corporation 82574L Gigabit Network Connection
           +-05.0-[03]----00.0  Intel Corporation 82576 Gigabit Network Connection
           +-06.0-[04-07]----00.0-[05-07]--+-00.0-[06]----00.0  Device 1234:11e8
           |                               \-01.0-[07]----00.0  Red Hat, Inc. Virtio 1.0 network device
           \-07.0-[08]--
```

대괄호 안은 그 bridge 아래에 있는 bus 범위입니다. `06.0-[04-07]`은 root port 00:06.0 아래에 bus 4~7이 있다는 뜻이고, 그 아래 switch가 다시 bus 5~7을 나눕니다. 이 숫자는 각 bridge의 secondary·subordinate bus 레지스터에서 나옵니다([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)).

## 3-Layer Stack

PCIe는 Transaction Layer, Data Link Layer, Physical Layer의 세 층으로 나뉩니다. 규격 본문 없이도 이 구분을 확인할 수 있는 곳이 Linux AER 드라이버입니다. v6.12 `drivers/pci/pcie/aer.c:418-447`은 보고된 오류 비트를 층 이름으로 바꿔 로그에 찍습니다.

| 층 | 단위 | `aer.c`가 이 층으로 분류하는 오류 비트 (`pci_regs.h` 이름) |
|------|------|------|
| Physical Layer | Symbol·Block·Flit | `PCI_ERR_COR_RCVR` (Receiver Error) |
| Data Link Layer | DLLP, TLP에 붙는 sequence number·LCRC | `PCI_ERR_COR_BAD_TLP`, `BAD_DLLP`, `REP_ROLL`(REPLAY_NUM Rollover), `REP_TIMER`(Replay Timer Timeout), 그리고 uncorrectable `PCI_ERR_UNC_DLP` |
| Transaction Layer | TLP | 나머지 전부 (Poisoned TLP, Completion Timeout, Unsupported Request 등) |

Data Link Layer 칸의 이름만 봐도 이 층이 하는 일이 드러납니다. TLP와 DLLP의 무결성을 검사하고(Bad TLP·Bad DLLP), 잃어버린 TLP를 다시 보내는 replay를 관리합니다(REPLAY_NUM·Replay Timer). 층별 오류가 실제 로그에 어떻게 찍히는지는 [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 QEMU로 오류를 주입해 확인합니다.

## 토폴로지 — 장치가 스스로 밝히는 역할

PCIe 장치는 PCI Express Capability(Capability ID 0x10)의 Flags 레지스터 bit 7:4에 자기 역할을 적습니다. Linux v6.12 `include/uapi/linux/pci_regs.h:476-485`의 정의입니다.

| 값 | `PCI_EXP_TYPE_*` | 의미 |
|------|------|------|
| 0x0 | `ENDPOINT` | PCI Express Endpoint |
| 0x1 | `LEG_END` | Legacy Endpoint |
| 0x4 | `ROOT_PORT` | Root Port |
| 0x5 | `UPSTREAM` | Switch Upstream Port |
| 0x6 | `DOWNSTREAM` | Switch Downstream Port |
| 0x7 | `PCI_BRIDGE` | PCIe to PCI/PCI-X Bridge |
| 0x8 | `PCIE_BRIDGE` | PCI/PCI-X to PCIe Bridge |
| 0x9 | `RC_END` | Root Complex Integrated Endpoint |
| 0xa | `RC_EC` | Root Complex Event Collector |

시리즈 VM에서 `lspci -xxxx`로 각 장치의 Capability 시작 4바이트를 읽으면 이 값이 그대로 보입니다. 바이트 순서는 little-endian이라 Flags는 셋째·넷째 바이트를 뒤집어 읽습니다.

| 장치 | Cap offset | 바이트 | Flags | type | `lspci -vv` 표기 |
|------|------|------|------|------|------|
| 00:03.0 root port | 0x54 | `10 48 42 01` | 0x0142 | 4 | `Express (v2) Root Port (Slot+)` |
| 01:00.0 NVMe | 0x80 | `10 60 02 00` | 0x0002 | 0 | `Express (v2) Endpoint` |
| 04:00.0 XIO3130 upstream | 0x90 | `10 80 52 00` | 0x0052 | 5 | `Express (v2) Upstream Port` |
| 05:00.0 XIO3130 downstream | 0x90 | `10 80 62 01` | 0x0162 | 6 | `Express (v2) Downstream Port (Slot+)` |

첫 바이트 0x10이 Capability ID, 둘째 바이트가 다음 capability의 offset입니다. Flags의 하위 4비트 2는 capability 버전(v2)이고, bit 8이 1인 두 포트는 slot이 달린 포트입니다.

Root Complex 자체는 이 표에 없습니다. QEMU virt에서 00:00.0은 class 0x0600(host bridge)인 일반 PCI function이고, root port는 그 옆 bus 0에 있는 장치입니다. 같은 bus 0의 virtio 장치 00:01.0과 00:02.0, 그리고 switch 아래의 `edu`(06:00.0)는 PCI Express Capability가 아예 없습니다(`lspci -vv`의 capability 목록에 `Express`가 없음). PCIe 트리 안에 있어도 configuration space는 PCI 장치처럼 생긴 function이 있다는 뜻입니다.

## Switch는 bridge의 묶음

`lspci`로 switch 부분만 보면 upstream port 하나와 downstream port 둘이 각각 독립된 PCI-to-PCI bridge입니다.

```text
04:00.0 PCI bridge [0604]: Texas Instruments XIO3130 PCI Express Switch (Upstream) [104c:8232] (rev 02)
	Bus: primary=04, secondary=05, subordinate=07, sec-latency=0
05:00.0 PCI bridge [0604]: Texas Instruments XIO3130 PCI Express Switch (Downstream) [104c:8233] (rev 01)
	Bus: primary=05, secondary=06, subordinate=06, sec-latency=0
05:01.0 PCI bridge [0604]: Texas Instruments XIO3130 PCI Express Switch (Downstream) [104c:8233] (rev 01)
	Bus: primary=05, secondary=07, subordinate=07, sec-latency=0
```

upstream port는 bus 4에 있고 switch 내부 bus 5를 엽니다. downstream port 둘은 그 내부 bus 5에 앉아 각자 bus 6과 7을 엽니다. 포트마다 class 0x0604 bridge이고 자기 bus 번호 레지스터를 가지므로, switch를 "포트 N개짜리 hub 하나"로 보면 이 bus 번호 배치를 설명할 수 없습니다. [PCI-SIG FAQ의 Section 7.5.3 답변](https://web.archive.org/web/20250115173818/https://pcisig.com/faq?page=2)도 switch의 각 port가 Memory Base/Limit 같은 aperture 레지스터를 가지고, 그 값으로 memory request를 어느 port로 보낼지 정한다고 설명합니다.

## Lane과 Link Width

[PCI-SIG FAQ](https://web.archive.org/web/20250115173818/https://pcisig.com/faq?page=2)는 PCIe link가 1, 2, 4, 8, 12, 16, 32 lane으로 구성된다고 적습니다. QEMU 11.1.3 `include/hw/pci/pcie_regs.h:50-56`의 `PCIExpLinkWidth`도 같은 일곱 값(x1·x2·x4·x8·x12·x16·x32)을 정의하고, `pcie-root-port`의 `x-width` 속성이 이 중 하나를 받습니다.

Link Capabilities 레지스터는 포트가 지원하는 최대 폭과 속도를, Link Status 레지스터는 지금 동작 중인 값을 담습니다. 시리즈 VM에서 root port와 그 아래 장치를 짝지어 읽은 결과입니다.

```text
== 00:03.0  Red Hat, Inc. QEMU PCIe Root port
		LnkCap:	Port #0, Speed 16GT/s, Width x16, ASPM L0s, Exit Latency L0s <64ns
		LnkSta:	Speed 2.5GT/s, Width x1
== 01:00.0  Red Hat, Inc. QEMU NVM Express Controller (rev 02)
		LnkCap:	Port #0, Speed 2.5GT/s, Width x1, ASPM L0s, Exit Latency L0s <64ns
		LnkSta:	Speed 2.5GT/s, Width x1
== 00:07.0  Red Hat, Inc. QEMU PCIe Root port
		LnkCap:	Port #0, Speed 64GT/s, Width x16, ASPM L0s, Exit Latency L0s <64ns
		LnkSta:	Speed 64GT/s, Width x16
```

root port는 16 GT/s x16을 지원한다고 광고하지만 NVMe가 2.5 GT/s x1이라서 링크는 2.5 GT/s x1로 잡혔습니다. 실제 하드웨어에서는 양쪽이 link training으로 이 값을 정합니다. QEMU에는 link training이 없고, `hw/pci/pcie.c:1170-1217`의 `pcie_sync_bridge_lnk()`가 아래 장치의 Link Status를 읽어 포트의 Link Capabilities 범위로 자른 값을 포트의 Link Status에 복사합니다. 아래 장치가 없으면 Link Capabilities 값을 그대로 씁니다. 그래서 비어 있는 rp5(00:07.0)는 64 GT/s x16으로 보입니다. 이 VM의 Link Status는 협상 결과가 아니라 QEMU가 계산한 값이므로, 속도·폭을 다루는 장에서도 이 점을 전제로 읽어야 합니다.

## Generation 진화 — Gen 1부터 Gen 7까지

아래 날짜는 [PCI-SIG 규격 목록](https://web.archive.org/web/20261111024224/https://pcisig.com/specifications)(2026-11-11 보관본)에 Base Specification 각 판이 게시된 날짜입니다. 전송률은 [PCI-SIG FAQ](https://web.archive.org/web/20250115173818/https://pcisig.com/faq?page=2)의 "lane당 방향당" 값과 [6.0·7.0 FAQ](https://web.archive.org/web/20250117201651/https://pcisig.com/faq?page=3)입니다.

| 판 | Rate (lane당 방향당) | 목록 게시일 | Encoding |
|------|------|------|------|
| 1.x | 2.5 GT/s | 1.1이 2005-03-08 (1.0 본문은 목록에 없음) | 8b/10b |
| 2.0 | 5.0 GT/s | 2006-12-20 | 8b/10b |
| 3.0 | 8.0 GT/s | 2010-11-10 | 128b/130b |
| 4.0 | 16.0 GT/s | 2017-10-05 | 128b/130b |
| 5.0 | 32.0 GT/s | 2019-05-28 | 128b/130b |
| 6.0 | 64 GT/s | 2022-01-11 | PAM4, Flit, FEC |
| 7.0 | 128 GT/s | 2025-06-11 | PAM4 |

같은 목록에는 2026-09-17에 게시된 Revision 7.1과 6.5도 있습니다. 표의 날짜는 각 판이 처음 올라온 날이고, 같은 판의 개정본(예: 2.0은 2009-02-27)은 따로 올라와 있습니다.

전송률에서 바이트 대역폭으로 가는 계산은 encoding만 반영하면 됩니다. 아래는 `bw.py`로 계산한 값이고, TLP header·DLLP·Flit 오버헤드는 빼지 않은 상한입니다.

```text
gen    GT/s      eff  lane GB/s  x16 raw GB/s  x16 enc GB/s
1.x     2.5  0.80000     0.2500           5.0         4.000
2.x     5.0  0.80000     0.5000          10.0         8.000
3.0     8.0  0.98462     0.9846          16.0        15.754
4.0    16.0  0.98462     1.9692          32.0        31.508
5.0    32.0  0.98462     3.9385          64.0        63.015
6.0    64.0      n/a     8.0000         128.0             -
7.0   128.0      n/a    16.0000         256.0             -
128b/130b overhead = 1.538%  8b/10b overhead = 20%
PCIe 5.0 x32 raw per direction = 128.0 GB/s (FAQ: 128 GB/s)
PCIe 6.0 x16 raw both directions = 256.0 GB/s (FAQ: 256 GB/s)
PCIe 7.0 x16 raw both directions = 512.0 GB/s (FAQ: 512 GB/s)
```

식은 `rate × 효율 × lane 수 / 8`입니다. Gen 5 x16 한 방향은 32 × 128/130 × 16 / 8 ≈ 63.0 GB/s입니다. PCI-SIG가 6.0을 "x16에서 256 GB/s", 7.0을 "x16에서 양방향 512 GB/s"라고 할 때는 encoding을 빼지 않은 raw 값을 두 방향 합친 숫자입니다. 마지막 세 줄은 이 해석으로 FAQ 숫자가 재현되는지 확인합니다. 6.0·7.0의 Flit 효율은 공개 FAQ에 숫자가 없어서 표를 비웠습니다.

FAQ의 1.x~3.0 표도 같은 계산입니다. 1.x는 lane당 약 250 MB/s, x16 양방향 합계 약 8 GB/s로 적혀 있고, 위 표의 0.25 GB/s와 4 GB/s × 2에 해당합니다.

Linux v6.12가 아는 최고 속도는 64 GT/s입니다. `pci_regs.h:535-541`의 Link Capabilities 속도 인코딩은 `PCI_EXP_LNKCAP_SLS_64_0GB`(0x6)에서 끝나고, pciutils 3.13.0의 `link_speed()`(`ls-caps.c:755-773`)도 6까지만 이름을 붙이고 나머지는 `unknown`으로 찍습니다. QEMU 11.1.3의 `x-speed`도 `2_5/5/8/16/32/64`까지만 받습니다. 128 GT/s 장치를 이 조합으로 읽으면 속도 칸이 `unknown`으로 나온다는 뜻입니다.

## Encoding 진화 — 8b/10b → 128b/130b → PAM4

| Encoding | 사용 판 | 출처가 밝힌 성질 |
|------|------|------|
| **8b/10b** | 1.x·2.x | 바이트마다 10비트 symbol. DC wander와 최소 edge 밀도를 보장해 AC coupling과 느슨한 clock data recovery를 허용 ([FAQ page 1](https://web.archive.org/web/20260604022039/https://pcisig.com/faq?page=1), "What is 8b/10b encoding?"). 오버헤드 20% (같은 FAQ의 3.0 항목) |
| **128b/130b** | 3.0·4.0·5.0 | 130비트에 128비트 데이터. 오버헤드 2/130 ≈ 1.54%. 대신 scrambling이 8b/10b보다 DC wander를 키워 수신기가 견디거나 보정해야 함 ([FAQ page 1](https://web.archive.org/web/20260604022039/https://pcisig.com/faq?page=1), "What is scrambling?") |
| **PAM4** | 6.0·7.0 | 4-level 신호로 같은 시간에 2비트를 보냄 ([FAQ page 3](https://web.archive.org/web/20250117201651/https://pcisig.com/faq?page=3)) |

3.0이 5.0 GT/s에서 8.0 GT/s로 1.6배만 올렸는데도 "두 배"라고 부르는 이유도 FAQ에 있습니다. 2.0의 5.0 GT/s는 8b/10b 때문에 실제로 4 Gbps이고, 3.0은 128b/130b로 바꿔 약 8 Gbps가 되므로 10 GT/s를 8b/10b로 보낸 것과 같은 대역폭을 낮은 신호 속도로 얻습니다.

6.0이 PAM4로 간 대가는 오류율입니다. [FAQ page 3](https://web.archive.org/web/20250117201651/https://pcisig.com/faq?page=3)은 PAM4에서 예상하는 BER을 10⁻⁶, 이전 세대 NRZ를 10⁻¹²로 적고, 이를 가벼운 FEC와 강한 CRC로 다룬다고 설명합니다.

## FLIT Mode — Gen 6 이후의 큰 변화

같은 FAQ("What is Flit Mode and why did PCI-SIG move to this unit of data exchange?")가 공개한 내용은 다음과 같습니다.

| 항목 | FAQ 내용 |
|------|------|
| 단위 | 256바이트 Flit. 가변 길이 TLP와 DLLP가 그 안에 들어감 |
| 이유 | PAM4와 FEC로 가면서, FEC가 고정 크기 데이터에서만 동작하기 때문 |
| 적용 속도 | 64 GT/s PAM4에서는 필수, 그 외 모든 link 속도에서도 지원 |
| 유지 | link가 Flit Mode로 training되면 LinkUp인 동안 Flit Mode 유지 |
| 혼합 | Flit Mode link와 non-Flit link 사이는 경계에서 자동 변환 |
| 소프트웨어 영향 | 새 TLP 형식 때문에 오류 로그 해석이 바뀜. inter-hierarchy routing 추가 |

TLP가 모두 256바이트가 되는 것이 아니라, 여러 TLP와 DLLP를 256바이트 그릇에 담아 보냅니다. Linux v6.12 `pci_regs.h:700`에는 Link Status 2의 `PCI_EXP_LNKSTA2_FLIT`(0x0400, Flit Mode Status)가 정의돼 있지만, v6.12의 `drivers/`와 `include/linux/`에서는 이 이름을 쓰는 곳이 없습니다(`grep -rn LNKSTA2_FLIT` 결과 없음). 이 판의 커널은 Flit Mode 비트를 정의만 하고 동작을 바꾸지 않습니다.

## 인접 표준 — CXL·UCIe

| 표준 | 공개 자료가 밝힌 관계 |
|------|------|
| **CXL** | [CXL 4.0 발표문](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-Specification-Release_FINAL_Website-Copy.pdf)(2025-11-18)은 4.0이 대역폭을 64 GT/s에서 128 GT/s로 두 배로 올렸고 CXL 3.x의 256B Flit 형식을 유지한다고 적습니다. 두 속도는 PCIe 6.0·7.0의 rate와 같습니다 |
| **UCIe** | [UCIe 규격 페이지](https://www.uciexpress.org/specifications)는 UCIe가 die-to-die physical layer와 die-to-die protocol을 정의하고 PCIe·CXL을 활용한다고 설명합니다. 같은 페이지에 1.0·1.1·2.0·3.0 규격이, 홈페이지에 4.0 공개 공지가 있습니다 |

CXL이 PCIe configuration 모델 안에서 어떻게 자기를 드러내는지는 [CXL 4.0 Internals Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position)과 [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)의 DVSEC 덤프에서 볼 수 있습니다.

## 자주 하는 실수

### "PCIe는 공유 버스다"

PCI-SIG FAQ가 PCIe를 만든 이유로 든 것이 바로 PCI 같은 parallel bus의 한계입니다. 공유되는 것은 configuration 모델과 BDF 번호 체계이고, 링크는 두 포트 사이에만 있습니다. `lspci -tv`에서 root port마다 bus가 하나씩 따로 열리는 것이 그 결과입니다.

### "Switch가 hub와 같다"

시리즈 VM의 XIO3130 switch는 bridge 세 개로 보이고, 포트마다 자기 bus 번호와 memory window를 가집니다. switch는 이 window를 보고 TLP를 특정 포트로 보냅니다. 모든 포트에 같은 신호를 뿌리는 구조가 아닙니다.

### "Gen 6은 단순히 Gen 5의 2배"

rate는 32에서 64 GT/s로 두 배지만, PCI-SIG FAQ가 6.0의 새 요소로 든 것은 PAM4, FEC, Flit 세 가지입니다. FAQ는 Flit 때문에 오류 로그 해석과 routing 규칙이 바뀌었다고도 적습니다. 소프트웨어가 보는 변화가 있다는 뜻입니다.

### "x16 슬롯이면 링크도 x16"

Link Capabilities는 포트가 지원하는 최대값이고, 지금 링크는 Link Status에 있습니다. 시리즈 VM의 00:03.0은 LnkCap이 16 GT/s x16이지만 LnkSta는 2.5 GT/s x1입니다. 링크 상태를 말할 때는 두 줄을 같이 봐야 하고, 장치 쪽 LnkCap도 같이 봐야 어느 쪽이 상한을 정했는지 압니다.

### "PCIe 7.0이 나왔으니 커널과 도구도 128 GT/s를 안다"

PCI-SIG 목록에 7.0은 2025-06-11에 올라왔지만, Linux v6.12 `pci_regs.h`와 pciutils 3.13.0의 속도 이름은 64 GT/s에서 끝납니다. 규격 게시일과 소프트웨어 지원 시점은 따로 확인해야 하는 값입니다.

## 정리

- PCIe는 물리 링크를 point-to-point 직렬로 바꾸고 PCI의 configuration 모델을 유지했습니다.
- 3층 구분은 Linux AER 드라이버의 오류 분류(`aer.c:418-447`)에서 그대로 확인됩니다.
- 장치 역할은 PCI Express Capability Flags bit 7:4에 있고, QEMU VM에서 Root Port 4·Endpoint 0·Upstream 5·Downstream 6으로 읽혔습니다.
- switch는 포트마다 별도 PCI-to-PCI bridge입니다.
- link 폭은 x1·x2·x4·x8·x12·x16·x32이고, LnkCap은 최대값, LnkSta는 현재값입니다. QEMU의 LnkSta는 training 결과가 아니라 복사된 값입니다.
- rate는 2.5 GT/s에서 128 GT/s까지 올라갔고, 바이트 대역폭은 encoding과 방향을 밝혀 계산합니다.
- 6.0의 Flit은 256바이트 고정 단위이고, Linux v6.12는 그 상태 비트를 정의만 합니다.

## 다음 편

[Ch 2: TLP — Transaction Layer Packet](/blog/embedded/hardware/pcie/chapter02-tlp)에서 PCIe 데이터 전송의 기본 단위인 TLP의 구조와 종류, split transaction 흐름을 분해합니다.

## 관련 항목

- [CXL 4.0 Internals Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position) — PCIe 위에 얹히는 alternate protocol
- [Bootloader Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration) — 같은 QEMU virt에서 펌웨어 단계 열거
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Modern Embedded Recipes: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)

## 시리즈 자료 출처 안내

이 시리즈의 1차 자료는 다음과 같습니다.

- **PCI-SIG 공개 페이지**: [FAQ](https://pcisig.com/faq)와 [규격 목록](https://pcisig.com/specifications). pcisig.com이 자동 접근을 막아 Internet Archive 보관본을 링크했고, 각 링크의 URL에 보관 날짜가 들어 있습니다.
- **Linux v6.12 소스**: kernel.org의 `linux-6.12.tar.xz`(sha256sums.asc로 검증). 본문의 `file:line`은 이 판 기준입니다. 실행은 Debian 13의 `6.12.116+deb13-arm64` 커널에서 했습니다.
- **QEMU 11.1.3 소스**와 같은 판의 실행 바이너리
- **pciutils 3.13.0 소스**(GitHub 태그 `v3.13.0`)와 Debian 13의 같은 판 `lspci`

PCI Express Base Specification 본문은 PCI-SIG 회원에게만 공개되므로 인용하지 않습니다. 위 자료로 확인하지 못한 규격 세부(예: LTSSM 세부 상태의 타이밍)는 이 시리즈에 적지 않습니다.

> PCI Express® and PCIe® are registered trademarks of PCI-SIG.
