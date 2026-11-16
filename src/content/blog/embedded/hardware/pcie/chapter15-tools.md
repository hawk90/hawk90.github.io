---
title: "Ch 15: Tools — lspci·setpci·pcimem·protocol analyzer"
slug: "embedded/hardware/pcie/chapter15-tools"
date: 2026-05-19T09:15:00
description: "pciutils 3.13.0의 조회·dump 해석, Linux v6.12 AER 통계와 실제 장비 시험의 경계를 정리합니다."
series: "PCIe Deep Dive"
seriesOrder: 15
tags: [pcie, lspci, setpci, pcimem, debug-tools]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 조회와 제어를 먼저 나누기

PCIe 진단은 topology·장치 ID·현재 설정·커널 로그를 같은 시점에 모으는 데서 시작합니다. 읽는 도구와 쓰는 도구, 저장된 dump를 해석하는 동작과 실제 장치에 접근하는 동작을 나눠야 합니다. 이 장은 이 시리즈에서 실제로 쓴 도구를 정리하고, 각 도구가 보여 주지 않는 것을 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116, pciutils 3.13.0)에서 확인합니다.

기준 문서는 [pciutils v3.13.0 `lspci.man`](https://github.com/pciutils/pciutils/blob/v3.13.0/lspci.man)·[`setpci.man`](https://github.com/pciutils/pciutils/blob/v3.13.0/setpci.man)과 Linux v6.12 소스입니다.

## lspci의 범위

`lspci.man`(76-90행)의 dump 옵션 설명과 시리즈 VM의 NVMe(01:00.0)에서 센 출력 줄 수입니다.

| 옵션 | man page 설명 | 출력 줄 수 |
|------|------|------|
| `-x` | 표준 부분(앞 64바이트, CardBus bridge는 128바이트) | 6 (제목 1 + 16바이트 줄 4 + 빈 줄 1) |
| `-xxx` | PCI config 전체(256바이트). root만 가능하고 일부 장치는 읽기만으로 멈출 수 있다고 경고 | 18 (16바이트 줄 16) |
| `-xxxx` | PCI-X 2.0·PCI Express의 4096바이트 확장 공간 | 258 (16바이트 줄 256) |

권한도 결과를 바꿉니다. 같은 장치를 일반 사용자로 `lspci -vv` 하면 capability 부분이 `Capabilities: <access denied>`로 나옵니다. Linux v6.12 `pci_read_config()`(`drivers/pci/pci-sysfs.c:670-682`)가 `CAP_SYS_ADMIN`이 없으면 sysfs `config`를 앞 64바이트만 돌려주기 때문입니다([Ch 10](/blog/embedded/hardware/pcie/chapter10-linux-basics)). 이 시리즈의 `lspci` 출력은 모두 root로 얻었습니다.

`lspci`의 해석이 레지스터와 다르게 보이는 경우도 이 시리즈에서 두 번 봤습니다. 64-bit prefetchable bridge window를 `[32-bit]`로 표시한 것([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space))과, OS가 보고한 주소가 BAR 레지스터에 없을 때 붙는 `[virtual]` 표시([Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio))입니다. 판단의 근거가 되는 값은 `-xxx` 같은 원본 바이트로 확인합니다.

### `-F` — 저장된 dump 해석하기

`lspci -F FILE`은 장치 대신 `-x` 계열 출력을 저장한 파일을 읽습니다. 실제 NVMe의 4 KiB dump를 저장하고, Device Control(PCI Express Capability 0x80 + 8 = 0x88)의 두 바이트만 `10 28`(0x2810)로 바꾼 사본을 만들어 둘 다 해석했습니다.

```bash
lspci -s 01:00.0 -xxxx > nvme.dump
# 0x88-0x89를 10 28로 바꾼 사본 nvme-devctl2810.dump를 Python으로 만듦
lspci -F nvme.dump -vv | grep -A2 "DevCtl:"
lspci -F nvme-devctl2810.dump -vv | grep -A2 "DevCtl:"
```

```text
80: 10 60 02 00 20 80 00 10 00 00 04 00 00 00 00 00
80: 10 60 02 00 20 80 00 10 10 28 04 00 00 00 00 00
--- lspci -F original
		DevCtl:	CorrErr- NonFatalErr- FatalErr- UnsupReq-
			RlxdOrd- ExtTag- PhantFunc- AuxPwr- NoSnoop- FLReset-
			MaxPayload 128 bytes, MaxReadReq 128 bytes
--- lspci -F edited
		DevCtl:	CorrErr- NonFatalErr- FatalErr- UnsupReq-
			RlxdOrd+ ExtTag- PhantFunc- AuxPwr- NoSnoop+ FLReset-
			MaxPayload 128 bytes, MaxReadReq 512 bytes
--- live device unchanged
0000
```

0x2810을 [Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)의 `pci_regs.h` 정의로 풀면 Relaxed Ordering(0x0010)과 No Snoop(0x0800)이 켜지고, Max_Payload_Size(bit 7:5)는 0이라 128바이트, Max_Read_Request_Size(bit 14:12)는 2라 512바이트입니다. lspci 해석과 같습니다. 마지막 줄은 같은 시각 실제 장치의 DevCtl이 그대로 0000이라는 확인입니다. `-F`로 본 값은 그 파일의 내용일 뿐이고 장치의 현재 상태가 아닙니다.

## setpci와 BAR 직접 접근

`setpci`는 config 레지스터를 이름이나 offset으로 읽고 씁니다. 이 시리즈에서 쓴 형태를 모았습니다.

| 형태 | 예 | 쓴 곳 |
|------|------|------|
| 레지스터 이름 읽기 | `setpci -s 02:00.0 HEADER_TYPE`, `CAPABILITIES` | [Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space) capability walk |
| capability 기준 offset | `setpci -s 00:03.0 CAP_EXP+10.w` | [Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management) LnkCtl 확인 |
| 값만 쓰기 | `setpci -s 06:00.0 BASE_ADDRESS_0=ffffffff` | [Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio) BAR sizing (드라이버 없는 장치) |
| mask 쓰기 `값:마스크` | `setpci -s 03:00.0 COMMAND=0100:0100` | [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling) SERR# 비트만 켜기 |

mask 쓰기는 지정한 비트만 바꾸지만, 그 비트가 장치·드라이버와 어떤 관계인지는 알려 주지 않습니다. 시리즈 VM에서 QEMU가 쓰기를 무시한 비트(Extended Tag, ASPM Control, Retrain Link, Target Link Speed)를 여러 번 만났습니다. 쓴 뒤에는 반드시 다시 읽어 확인했습니다.

BAR를 직접 읽고 쓰는 도구(pcimem 같은)는 sysfs `resourceN` 파일을 mmap합니다. [Linux v6.12 `sysfs-pci.rst`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/sysfs-pci.rst)가 그 인터페이스입니다. 이 시리즈에서는 그 대신 QEMU monitor의 `xp`로 게스트 물리 주소를 읽었습니다. 게스트 커널이 `CONFIG_IO_STRICT_DEVMEM=y`라 `/dev/mem`이 막혔기 때문이고([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)), 이 방법은 가상 머신에서만 쓸 수 있습니다.

## AER 통계의 실제 경로

AER 누적 통계는 [Linux v6.12 sysfs ABI `sysfs-bus-pci-devices-aer_stats`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-pci-devices-aer_stats)의 `aer_dev_correctable`·`aer_dev_nonfatal`·`aer_dev_fatal`, root port의 `aer_rootport_total_err_*`입니다. [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 root port에 오류를 주입한 뒤 읽은 값입니다.

```text
aer_dev_nonfatal: UnsupReq 1 TOTAL_ERR_NONFATAL 1  24
aer_dev_fatal: MalfTLP 1 TOTAL_ERR_FATAL 1  24
```

(0이 아닌 항목과 전체 줄 수만 뽑은 결과.) 이 숫자는 커널이 처리한 오류만 셉니다. [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)의 igb처럼 장치가 오류를 기록했지만 메시지를 보내지 않으면 여기에 남지 않습니다. 장치의 AER status 레지스터(`UESta`·`CESta`)와 이 통계를 함께 봐야 하는 이유입니다.

## 오류 주입 — 두 가지 경로

이 시리즈는 오류를 두 경로로 넣었습니다. 둘은 보여 주는 범위가 다릅니다.

| 경로 | 어디에 넣나 | 무엇을 시험하나 |
|------|------|------|
| QEMU `pcie_aer_inject_error` ([Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)) | QEMU가 장치의 AER 레지스터에 기록하고 ERR 메시지를 보냄 | 장치의 DevCtl enable, 경로 위 bridge, 커널 AER 처리까지 전부 |
| Linux `aer_inject` 모듈 | 커널이 config 읽기를 가로채 가짜 AER status를 보여 줌 | 커널 AER 처리와 드라이버 callback |

Debian 커널은 `CONFIG_PCIEAER_INJECT=m`입니다. `modprobe aer_inject`로 `/dev/aer_inject`가 생기고, `drivers/pci/pcie/aer_inject.c:34-45`의 `struct aer_error_inj`(bus, dev, fn, uncor_status, cor_status, header log 네 개, domain)를 써 넣으면 됩니다. 이 구조체를 그대로 쓰는 30줄짜리 C 프로그램 `swinj`로 넣었습니다.

```c
struct aer_error_inj e = { 0 };
e.bus = 3; e.dev = 0; e.fn = 0;
e.uncor_status = 0x40000;            /* PCI_ERR_UNC_MALF_TLP */
write(open("/dev/aer_inject", O_WRONLY), &e, sizeof(e));
```

(`swinj.c`에서 인자 처리를 뺀 발췌.) QEMU 경로로는 메시지가 나가지 않던 igb에 Fatal Malformed TLP를 넣었습니다.

```text
pcieport 0000:00:05.0: aer_inject: Injecting errors 00000000/00040000 into device 0000:03:00.0
pcieport 0000:00:05.0: AER: Uncorrectable (Fatal) error message received from 0000:03:00.0
igb 0000:03:00.0: AER: PCIe Bus Error: severity=Uncorrectable (Fatal), type=Inaccessible, (Unregistered Agent ID)
pcieport 0000:00:05.0: AER: Root Port link has been reset (0)
igb 0000:03:00.0: enabling device (0000 -> 0002)
pcieport 0000:00:05.0: AER: device recovery successful
igb 0000:03:00.0 ens3: igb: ens3 NIC Link is Up 1000 Mbps Full Duplex, Flow Control: RX/TX
```

[Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 재현하지 못한 "callback을 가진 드라이버"의 사슬이 여기서 끝까지 돕니다. igb의 `igb_io_error_detected()`(`igb_main.c:9577-9597`)가 frozen 상태에서 장치를 내리고 `PCI_ERS_RESULT_NEED_RESET`을 돌려주자 root port link가 reset됐고, `igb_io_slot_reset()`이 `pci_enable_device_mem()`으로 장치를 다시 켜(`enabling device`) 복원한 뒤 `RECOVERED`를 돌려줬습니다. 마지막 줄은 `igb_io_resume()` 뒤 링크가 다시 올라온 것입니다.

Non-Fatal Unsupported Request(`uncor_status=0x100000`)를 넣으면 같은 `error_detected`가 `Non-correctable non-fatal error reported.`를 남기고 `PCI_ERS_RESULT_CAN_RECOVER`를 돌려줘 reset 없이 끝났습니다. Correctable Bad TLP(`cor_status=0x40`)를 e1000e에 넣으면 `type=Data Link Layer`로 기록만 됐습니다.

software 주입은 링크 reset 같은 실제 동작까지 일으키지만, 장치가 오류를 감지하고 메시지를 보내는 단계는 건너뜁니다. igb가 QEMU 경로로는 침묵하고 software 경로로는 복구까지 간 차이가 바로 그 단계입니다.

DPC는 QEMU에 장치 모델이 없어 주입하지 않았습니다.

## Protocol analyzer

링크 위 TLP·DLLP·ordered set을 직접 보는 장비는 이 작업에서 쓰지 않았습니다. 이 시리즈에서 소프트웨어로 본 링크 정보는 LnkSta·LnkSta2 레지스터([Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer)), AER의 Data Link 계열 비트([Ch 8](/blog/embedded/hardware/pcie/chapter08-dllp)), 컨트롤러 드라이버가 찍는 LTSSM 상태까지였습니다. 그보다 아래의 사건은 analyzer 없이는 보이지 않습니다.

## 도구 결과에서 다음 단계로

| 현재 증거 | 이 시리즈에서 쓴 다음 확인 |
|------|------|
| `lspci`에 장치가 없음 | `lspci -tv`의 bus 범위, 위 bridge의 Bus 레지스터, ECAM 읽기가 모두 1인지 ([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)) |
| LnkSta가 LnkCap보다 낮음 | 장치 쪽 LnkCap, LBMS·DLLLA 비트 ([Ch 1](/blog/embedded/hardware/pcie/chapter01-fundamentals), [Ch 9](/blog/embedded/hardware/pcie/chapter09-physical-layer)) |
| AER 로그가 없음 | 장치 `UESta`·`CESta`와 `DevCtl` reporting enable ([Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)) |
| 드라이버가 bound | `/proc/iomem`·`/proc/interrupts`의 자원과 실제 인터럽트 증가 ([Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts)) |
| 커널 로그가 "enabling ..."이라고 함 | 해당 레지스터를 `lspci -vv`로 다시 읽기 ([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)) |

## 정리

- `-x`·`-xxx`·`-xxxx`는 64·256·4096바이트 dump이고, root가 아니면 capability가 `<access denied>`입니다.
- `lspci -F`는 파일의 내용을 해석할 뿐이고, DevCtl 0x2810을 넣은 dump와 실제 장치의 0000이 동시에 존재했습니다.
- `setpci`의 `값:마스크` 쓰기 뒤에는 다시 읽어 반영 여부를 확인합니다.
- AER sysfs 통계는 커널이 처리한 오류만 셉니다.
- QEMU 주입은 장치부터, `aer_inject`는 커널부터 시험합니다. igb의 callback 사슬(`error_detected` → reset → `slot_reset` → `resume`)은 후자로 확인했습니다.

## 다음 편

[Ch 16: Troubleshooting — 시나리오북](/blog/embedded/hardware/pcie/chapter16-troubleshooting)에서 이 시리즈에서 실제로 만난 증상들을 진단 순서로 묶습니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — lspci 출력 영역
- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — QEMU AER 주입
- [Ch 16: Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting)
- [Ch 18: Register Maps](/blog/embedded/hardware/pcie/chapter18-register-maps) — setpci 비트 reference

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 pciutils 3.13.0 기준이고, `swinj.c`는 Debian 13 게스트에서 빌드해 Ch 1의 시리즈 VM에서 실행했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
