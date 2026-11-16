---
title: "CXL Link Training 디버깅 — LTSSM 상태와 Protocol Analyzer 활용"
slug: "tools/debugging/embedded/chapter08-cxl-link-debug"
date: 2026-06-18T09:01:00
description: "CXL 링크가 안 올라올 때 LTSSM 상태 분석, Protocol Analyzer 캡처, lspci·cxl-cli·dmesg 진단 흐름."
series: "Embedded Debugging"
seriesOrder: 8
tags: [cxl, link-training, ltssm, protocol-analyzer, debugging]
draft: false
topics: ["tools", "tools/debugging"]
---

## 왜 어려운가

CXL 메모리 디바이스가 "안 보인다"는 한 증상 뒤에는 여러 층이 있습니다. PCIe 링크가 올라왔는지, PCIe enumeration이 됐는지, 디바이스가 CXL DVSEC을 광고하는지, 펌웨어가 CEDT로 CXL 토폴로지를 알려 줬는지, 그리고 Linux CXL 드라이버가 그 위에 객체를 만들었는지입니다. 층마다 보는 도구가 다르므로, 아래에서 위로 하나씩 확인하는 순서가 필요합니다.

이 장은 그 순서를 QEMU의 CXL 에뮬레이션에서 실제 출력으로 따라갑니다.

## 실험 환경과 한계

| 항목 | 값 |
|------|-----|
| 에뮬레이터 | QEMU 11.1.3 `virt,cxl=on`, TCG |
| CXL 구성 | `pxb-cxl` + `cxl-rp` + `cxl-type3`(volatile 256 MiB, LSA 256 MiB, serial 0x5), CFMW 4 GiB |
| 게스트 | Debian 13.7 arm64, 커널 6.12.116+deb13-arm64 |
| 도구 | pciutils 3.13.0, ndctl/cxl-cli 81 |
| 소스 | Linux v6.12.116 `drivers/cxl/`, `drivers/pci/controller/dwc/pcie-designware.h` |

QEMU의 CXL 장치는 *이미 올라온 링크*를 흉내 냅니다. LTSSM이나 물리 계층은 에뮬레이션하지 않으므로, 링크 학습 실패 자체는 이 장에서 재현하지 못했습니다. 그 부분은 소스로 확인할 수 있는 것만 적습니다.

QEMU 명령줄의 CXL 부분입니다.

```bash
qemu-system-aarch64 -M virt,gic-version=3,cxl=on -m 4g,maxmem=8g,slots=4 -cpu max ... \
  -object memory-backend-ram,id=vmem0,share=on,size=256M \
  -object memory-backend-file,id=cxl-lsa0,share=on,mem-path=lsa0.raw,size=256M \
  -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
  -device cxl-rp,port=0,bus=cxl.1,id=root_port13,chassis=0,slot=2 \
  -device cxl-type3,bus=root_port13,volatile-memdev=vmem0,lsa=cxl-lsa0,id=cxl-vmem0,sn=0x5 \
  -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=4G
```

## LTSSM — 어디서 멈췄나

LTSSM(Link Training and Status State Machine)은 PCIe 링크를 학습시키는 상태 머신입니다. 상태별 정의는 PCI-SIG의 PCIe Base Specification에 있지만, 이 글을 쓰며 그 문서를 열람하지 못해 상태별 동작 설명은 적지 않습니다.

현재 상태는 *컨트롤러 레지스터*로만 볼 수 있고, 위치와 인코딩은 컨트롤러마다 다릅니다. 예를 들어 Linux의 Synopsys DesignWare PCIe 드라이버(`drivers/pci/controller/dwc/pcie-designware.h`)는 `PCIE_PORT_DEBUG0`(0x728)의 비트 [5:0]에서 LTSSM 상태를 읽고(`PORT_LOGIC_LTSSM_STATE_MASK 0x3f`), 그 값을 `DW_PCIE_LTSSM_DETECT_QUIET = 0x0`, `DW_PCIE_LTSSM_DETECT_ACT = 0x1`, `DW_PCIE_LTSSM_L0 = 0x11`, `DW_PCIE_LTSSM_L2_IDLE = 0x15`로 해석합니다. 다른 컨트롤러라면 그 SoC의 레퍼런스 매뉴얼과 해당 Linux 드라이버에서 같은 정보를 찾아야 합니다.

## 물리 계층 캡처

링크 학습 중의 ordered set이나 CXL 모드 협상을 직접 보려면 protocol analyzer 같은 물리 계층 캡처 장비가 필요합니다. 이 장에는 장비가 없고 QEMU는 물리 계층을 흉내 내지 않아 캡처를 하지 않았습니다. 특정 제품의 사양도 1차 자료로 확인하지 못해 적지 않습니다.

## 호스트 측 진단

### 1. PCIe로 보이는가

```text
$ lspci -nn
00:00.0 Host bridge [0600]: Red Hat, Inc. QEMU PCIe Host bridge [1b36:0008]
00:01.0 Ethernet controller [0200]: Red Hat, Inc. Virtio network device [1af4:1000]
00:02.0 SCSI storage controller [0100]: Red Hat, Inc. Virtio block device [1af4:1001]
00:03.0 Host bridge [0600]: Red Hat, Inc. QEMU PCIe Expander bridge [1b36:000b]
0c:00.0 PCI bridge [0604]: Intel Corporation Device [8086:7075]
0d:00.0 CXL [0502]: Intel Corporation Device [8086:0d93] (rev 01)
```

CXL 메모리 디바이스는 클래스 코드 0x0502로 보이고, `lspci -vvv`는 이를 `CXL Memory Device (CXL 2.x)`(prog-if 10)로 풀어 줍니다. 여기에 디바이스가 없다면 PCIe enumeration 전 단계(전원, 리셋, 링크)의 문제이고, 위의 LTSSM 레지스터를 봐야 합니다. 이 결과만으로 LTSSM이 어디서 멈췄는지는 알 수 없습니다.

### 2. 링크 속도·폭

디바이스와 루트 포트의 `LnkCap`/`LnkSta`입니다(사이의 `LnkCtl` 등은 `...`로 생략).

```text
0d:00.0 (type 3 device)
		LnkCap:	Port #0, Speed 32GT/s, Width x16, ASPM L0s, Exit Latency L0s <64ns
		...
		LnkSta:	Speed 32GT/s, Width x16
			TrErr- Train- SlotClk- DLActive- BWMgmt- ABWMgmt-
0c:00.0 (cxl-rp root port)
		LnkCap:	Port #0, Speed 64GT/s, Width x32, ASPM L0s, Exit Latency L0s <64ns
		...
		LnkSta:	Speed 32GT/s, Width x16
```

루트 포트는 64GT/s x32를 광고하지만 현재 링크는 32GT/s x16입니다. 디바이스의 능력이 32GT/s x16이니 둘 중 낮은 쪽으로 맞춰진 결과이고, 이 경우 LnkSta < LnkCap은 정상입니다. **양쪽 LnkCap 중 작은 값과 LnkSta를 비교해야** 일부 lane만 협상된 문제인지 판단할 수 있습니다. 이 값들은 QEMU가 보고하는 값이며 실제 물리 링크가 아닙니다.

### 3. CXL DVSEC

`0d:00.0`의 `lspci -vvv` 출력에서 DVSEC 부분만 골랐습니다(생략한 줄은 `...`).

```text
	Capabilities: [10c v1] Designated Vendor-Specific: Vendor=1e98 ID=0000 Rev=3 Len=60: CXL
		PCIe DVSEC for CXL Devices
		CXLCap:	Cache- IO+ Mem+ MemHWInit+ HDMCount 1 Viral-
		CXLCtl:	Cache- IO+ Mem+ CacheSFCov 0 CacheSFGran 0 CacheClean- Viral-
		...
	Capabilities: [148 v1] Designated Vendor-Specific: Vendor=1e98 ID=0008 Rev=0 Len=36: CXL
		Register Locator DVSEC
		...
		Block2: BIR: bar2, ID: CXL device registers, offset: 0000000000000000
	Capabilities: [16c v1] Designated Vendor-Specific: Vendor=1e98 ID=0005 Rev=0 Len=16: CXL
		GPF DVSEC for CXL Devices
		...
	Kernel driver in use: cxl_pci
```

`Vendor=1e98`의 DVSEC들이 CXL 능력입니다. ID 0000은 CXL 디바이스 DVSEC(`Mem+`가 CXL.mem 지원), ID 0008은 레지스터 위치(register locator), ID 0005는 GPF입니다. 루트 포트에는 ID 0003 `CXL Extensions DVSEC for Ports`가 보였습니다.

Linux `cxl_pci`(`drivers/cxl/pci.c`)는 CXL 디바이스 DVSEC을 찾지 못하면 `Device DVSEC not present, skip CXL.mem init`을 남깁니다. 이 실험의 디바이스는 DVSEC이 있어 그 메시지는 나오지 않았습니다.

### 4. CXL 서브시스템 등록

```text
$ ls /sys/bus/cxl/devices/
decoder0.0  decoder1.0  decoder2.0  decoder2.1  decoder2.2  decoder2.3
endpoint2  mem0  nvdimm-bridge0  port1  root0
$ ls /sys/firmware/acpi/tables/
APIC CEDT DBG2 DSDT FACP GTDT IORT MCFG PPTT SPCR SRAT data dynamic
$ dmesg | grep -i cxl
[    1.153009] acpi ACPI0016:00: _OSC: OS supports [CXL11PortRegAccess CXL20PortDevRegAccess CXLProtocolErrorReporting CXLNativeHot]
[    1.161007] acpi ACPI0016:00: _OSC: OS now controls [CXLMemErrorReporting]
[   56.571528]  pci0000:0c: host supports CXL
[   58.035896] cxl_pci 0000:0d:00.0: enabling device (0000 -> 0002)
```

`root0`(ACPI CXL 루트), `port1`(host bridge), `endpoint2`, `mem0`, 디코더들이 모두 있고, ACPI 테이블에 CEDT가 있습니다. `_OSC`에서 OS가 `CXLMemErrorReporting` 제어권을 받았다는 줄은 9장의 이벤트 처리와 이어집니다.

### 드라이버가 일부만 있으면

"lspci에는 있는데 CXL 토폴로지가 비어 있다"는 상황을 모듈을 빼서 재현했습니다(`lsmod`·`sleep` 줄과 디렉터리 목록 일부는 생략).

```text
+ modprobe -r cxl_pmem cxl_mem cxl_pci cxl_acpi
+ ls /sys/bus/cxl/devices/
+ modprobe cxl_pci
+ ls /sys/bus/cxl/devices/
mem0
+ cxl list -M -u
+ modprobe cxl_acpi
+ modprobe cxl_mem
+ ls /sys/bus/cxl/devices/
decoder0.0
decoder1.0
...
root0
+ cxl list -M -u
{
  "memdev":"mem0",
  "ram_size":"256.00 MiB (268.44 MB)",
  "serial":"0x5",
  "host":"0000:0d:00.0",
  "firmware_version":"BWFW VERSION 00"
}
```

`cxl_pci`만 올리면 `mem0`은 생기지만 `cxl list -M`은 아무것도 출력하지 않았습니다. `cxl_acpi`(CEDT로 루트와 host bridge를 만듦)와 `cxl_mem`(endpoint를 붙임)까지 올라와야 `root0`·`port1`·디코더와 함께 memdev가 목록에 나왔습니다. 그러니 `/sys/bus/cxl/devices/`가 비거나 일부만 있으면 `lsmod | grep cxl`부터 봅니다. 실험 환경에서는 `cxl_pmem`, `cxl_mem`, `cxl_pci`, `cxl_acpi`가 기본으로 올라와 있었습니다.

### 5. 토폴로지

```text
$ cxl list -M -D -P -T -u
    "ports":[
      {
        "port":"port1",
        "host":"pci0000:0c",
        "depth":1,
        "decoders_committed":0,
        "nr_dports":1,
        "dports":[ { "dport":"0000:0c:00.0", "id":"0" } ],
        "memdevs:port1":[
          {
            "memdev":"mem0",
            "ram_size":"256.00 MiB (268.44 MB)",
            "serial":"0x5",
            "host":"0000:0d:00.0",
            "firmware_version":"BWFW VERSION 00"
          }
        ]
      }
    ]
  ...
    "root decoders":[
      {
        "decoder":"decoder0.0",
        "resource":"0x10000000000",
        "size":"4.00 GiB (4.29 GB)",
        "interleave_ways":1,
        ...
        "targets":[ { "target":"pci0000:0c", "alias":"ACPI0016:00", "position":0, "id":"0xc" } ]
      }
    ]
```

(출력은 공백을 줄이고 일부 키를 `...`로 생략했습니다.) 루트 디코더 `decoder0.0`의 4 GiB는 QEMU 명령줄의 `cxl-fmw.0.size=4G`(CFMWS)이고, 대상이 host bridge `pci0000:0c`입니다. `decoders_committed`가 0인 것은 아직 region을 만들지 않았기 때문입니다. 이 arm64 커널에서 region 생성을 시도하면 커밋 단계에서 실패하는 과정은 [Postmortem Debugging Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)가 다룹니다.

## 자주 만나는 함정

| 증상 | 확인한 것 | 원인 |
|------|------|------|
| `lspci`에 안 보임 | — | PCIe enumeration 전 단계. 컨트롤러의 LTSSM 레지스터로 따로 판독 |
| LnkSta가 루트 포트 LnkCap보다 좁음 | 이 실험의 0c:00.0 | 디바이스 능력이 더 낮으면 정상. 양쪽 LnkCap의 최솟값과 비교 |
| `lspci`엔 있는데 CXL 토폴로지 없음 | 이 실험의 모듈 제거 | `cxl_acpi`·`cxl_mem` 미로딩, 또는 CEDT 없음 |
| dmesg `Device DVSEC not present, skip CXL.mem init` | `drivers/cxl/pci.c` | `cxl_pci`가 CXL 디바이스 DVSEC을 못 찾음 |

## 디버깅 체크리스트

1. `lspci -nn`에 클래스 0502 디바이스가 보이는가 → 없으면 LTSSM·전원·리셋
2. `lspci -vvv`의 LnkSta를 양쪽 LnkCap의 최솟값과 비교했는가
3. `Vendor=1e98` CXL DVSEC이 있는가
4. `lsmod`에 `cxl_acpi`·`cxl_pci`·`cxl_mem`이 있고, `/sys/firmware/acpi/tables/CEDT`가 있는가
5. `cxl list -M -D -P -T`에 root decoder·port·memdev가 다 나오는가
6. 그래도 링크 쪽이 의심되면 물리 계층 캡처

## 정리

- CXL 디바이스가 안 보이는 문제는 링크, PCIe enumeration, DVSEC, CEDT, 드라이버 층으로 나눠 봅니다.
- LTSSM 상태는 컨트롤러 레지스터로만 보이며, 예로 DesignWare는 `PCIE_PORT_DEBUG0`[5:0]에서 L0 = 0x11입니다.
- LnkSta가 한쪽 LnkCap보다 낮은 것은 정상일 수 있으니 양쪽 능력의 최솟값과 비교합니다.
- `cxl_pci`만으로는 `mem0`이 생겨도 토폴로지는 비고, `cxl_acpi`·`cxl_mem`까지 있어야 합니다.
- QEMU는 링크 학습을 흉내 내지 않으므로, 이 장의 링크 실패 진단은 실물 장비에서 보완해야 합니다.

## 다음 장 예고

Ch 9 — CXL 디바이스 트러블슈팅. 이벤트 레코드·poison list를 QEMU에서 직접 주입하며 추적합니다.

## 관련 항목

- [Ch 7: RTOS-aware 디버깅과 트러블슈팅](/blog/tools/debugging/embedded/chapter07-rtos-troubleshooting)
- [Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
- [Bootloader Internals Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Modern Embedded Recipes Ch 150: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
