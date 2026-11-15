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

PCIe 진단은 topology·장치 ID·현재 설정·kernel log를 같은 시점에 모으는 데서 시작합니다. Register를 읽는 도구와 쓰는 도구, 저장된 dump를 읽는 동작과 실제 장치를 접근하는 동작을 구분해야 합니다. BAR는 데이터 배열과 달리 read 자체에도 부작용이 있는 register를 포함할 수 있습니다.

기준은 [pciutils v3.13.0 lspci 매뉴얼](https://github.com/pciutils/pciutils/blob/v3.13.0/lspci.man)·[setpci 매뉴얼](https://github.com/pciutils/pciutils/blob/v3.13.0/setpci.man), [Linux v6.12 AER HOWTO](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/pcieaer-howto.rst)입니다. 이 작업에서는 pciutils를 빌드하고 **합성 dump의 `lspci -F` 해석만 실행**했습니다. 실제 PCI config·BAR 접근이나 setpci write·오류 주입은 하지 않았습니다.

## lspci의 범위

옵션의 verbosity와 raw dump 길이는 별개입니다. 권한 부족이나 장치 상태에 따라 전부 읽지 못할 수 있고, raw config 전체 읽기는 장치에 따라 문제를 일으킬 수도 있습니다.

| 옵션 | pciutils 3.13.0의 의미 |
|------|------|
| `-t` | bridge·bus topology 표시 |
| `-D`·`-nn` | domain과 numeric ID를 명시 |
| `-v`·`-vv`·`-vvv` | 해석 정보의 상세 수준 증가 |
| `-x` | 표준 header 64 B, CardBus는 128 B raw dump |
| `-xxx` | 256 B config raw dump |
| `-xxxx` | 4096 B extended config raw dump |
| `-k` | 지원되는 OS에서 kernel driver·module 정보 |
| `-s BDF` | 대상 장치 선택 |
| `-F FILE` | 저장된 dump 파일을 읽는 backend. 실제 장치 조회와 구분 |

가져온 dump를 해석할 때는 원본 수집 시점·장치·도구 버전·읽지 못한 범위를 남깁니다. 파일 안의 capability·enable bit는 그 시점의 관찰이며 현재 장치의 활성 상태를 입증하지 않습니다.

### 실제 도구로 합성 필드 해석하기

4096 B 합성 config에 Express capability를 배치하고 Device Control을 `0x2810`으로 설정했습니다. 아래는 빌드한 3.13.0 `lspci -F` 출력의 해당 부분입니다. 실제 Intel NIC나 완전한 하드웨어 profile의 dump가 아닙니다.

```text
DevCtl: CorrErr- NonFatalErr- FatalErr- UnsupReq-
        RlxdOrd+ ExtTag- PhantFunc- AuxPwr- NoSnoop+
        MaxPayload 128 bytes, MaxReadReq 512 bytes
LnkSta: Speed 32GT/s, Width x16
        TrErr- Train- SlotClk- DLActive- BWMgmt- ABWMgmt-
```

공백을 정리한 발췌이며, MPS·MRRS의 유효 encoding 0~5 조합 36개도 같은 decoder로 확인했습니다. `0x2810`의 MPS mask `0x00e0` 결과는 0이므로 MPS는 128 B입니다. 이를 “MPS 256 설정값”이라고 쓰면 틀립니다. `lspci`의 LnkSta에는 Recovery Time을 뜻하는 RT counter도 없습니다.

## setpci와 BAR 직접 접근

setpci는 config register를 읽거나 쓸 수 있습니다. Device Control 전체 word를 상수로 덮으면 MPS 외 RO·No Snoop·error reporting 등의 bit도 바뀝니다. Masked write라도 경로의 MPS 제약·driver 동기화를 대신하지 못하므로 이 글은 임의 tuning write를 제공하지 않습니다.

특히 AER capability의 `+0x18`은 AER Capabilities/Control입니다. 여기에 7을 쓰는 것을 포괄적인 “AER enable”로 설명하면 안 됩니다. Error reporting·mask·severity·Root Error Command는 서로 다른 register입니다.

pcimem류 도구는 resource mapping을 통해 BAR를 직접 접근합니다. [Linux sysfs PCI 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/sysfs-pci.rst)처럼 platform별 mmap 지원과 resource 정보를 확인해야 합니다. Driver unbind만으로 임의 offset·폭의 read/write가 안전해지는 것은 아닙니다. 장치 register 명세와 소유권·DMA·interrupt 상태를 아는 초기화·검증 절차 안에서 사용합니다.

## AER 통계의 실제 경로

AER 통계는 일반적인 debugfs `pci/<BDF>/` 경로가 아니라 [v6.12 sysfs ABI](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-pci-devices-aer_stats)에 정의돼 있습니다. 아래는 Linux 대상에서 사용할 조회 형식이며 실제 장치에서는 실행하지 않았습니다.

```bash
bdf=0000:01:00.0
lspci -Dnn -s "$bdf" -vv
cat "/sys/bus/pci/devices/$bdf/aer_dev_correctable"
cat "/sys/bus/pci/devices/$bdf/aer_dev_nonfatal"
cat "/sys/bus/pci/devices/$bdf/aer_dev_fatal"
dmesg | grep -iE 'pci|pcie|aer'
```

속성 부재·권한 거부는 0개라는 뜻이 아닙니다. Device의 AER status bit와 kernel이 관찰한 누적 통계도 구분합니다. 빈도를 비교하려면 시작·끝 시각과 counter 차이, reset·재열거 여부, mask·log ratelimit·overflow, 부하를 함께 기록합니다.

`resource`는 주소와 flags를 보여 주지만 `resourceN` mapping은 장치 접근입니다. `reset`·`remove`·`rescan`·`power/control` 쓰기는 제어 동작입니다. Debugfs는 driver별 interface가 다르며 read라는 이유만으로 부작용이 없다고 가정하지 않습니다.

## 오류 주입과 protocol analyzer

v6.12의 AER software injection은 `CONFIG_PCIEAER_INJECT`와 `/dev/aer_inject`, 별도 [intel/aer-inject](https://github.com/intel/aer-inject) 도구를 사용합니다. 존재하지 않는 debugfs echo 경로로 대신할 수 없습니다. Software injection은 kernel의 보고·복구 경로를 시험하는 수단이며 실제 PHY 오류·link 차단과 같은 시험은 아닙니다. CE 주입은 일반적으로 nonfatal/fatal recovery callback을 시험하는 것과도 다릅니다.

DPC 시험은 지원되는 controller·장치와 구체적인 trigger 절차가 필요합니다. v6.12의 파일을 대조하지 않은 `dpc-test.c`나 임의 utility를 보편적인 kernel 도구로 소개하지 않습니다. 이 글에서는 두 주입 모두 실행하지 않았습니다.

Protocol analyzer는 지원 속도·폭·encoding의 traffic과 상태를 관찰할 때 사용합니다. Interposer·probe가 시험 경로에 미치는 영향, trigger 조건, capture 누락과 재현 조건을 기록해야 합니다. Capture 하나가 장치 내부 상태나 드문 장애의 모든 원인을 설명해 주지는 않습니다. 제품 이름·가격보다 필요한 관찰 범위에 맞춰 선택합니다.

## 도구 결과에서 다음 단계로

| 현재 증거 | 다음 질문 |
|------|------|
| BDF가 없음 | upstream topology·power·link·bus 범위가 맞는가? |
| LnkCap보다 낮은 LnkSta | 양단 capability·정책·배선과 재훈련 이력은 무엇인가? |
| AER counter 증가 | 오류 종류·부하·시간 상관관계와 다른 경로의 기록이 일치하는가? |
| Driver가 bound | probe 뒤 queue·DMA·IRQ 준비와 실제 I/O 완료도 확인했는가? |
| Reset 성공 | 애플리케이션 데이터와 서비스가 실제 복구됐는가? |

## 정리

- `lspci` 해석 수준과 raw dump 길이를 나눠 사용합니다.
- 합성 dump decoder 실행과 실제 장치 검증은 다릅니다.
- setpci·BAR 직접 접근은 driver·장치 명세와 동기화 조건을 확인합니다.
- AER 통계는 sysfs ABI를 따르고 관찰 구간·누락·reset을 같이 기록합니다.
- Software injection·DPC·protocol capture는 각각 다른 증거를 제공합니다.

## 다음 편

[Ch 16: Troubleshooting — 시나리오북](/blog/embedded/hardware/pcie/chapter16-troubleshooting)에서 *실무 자주 만나는 PCIe 문제 케이스북*과 *진단 decision tree*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — lspci 출력 영역
- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — AER counter 의미
- [Ch 16: Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting)
- [Ch 18: Register Maps](/blog/embedded/hardware/pcie/chapter18-register-maps) — setpci 비트 reference

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
