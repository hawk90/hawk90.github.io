---
title: "Ch 12: QEMU CXL 에뮬레이션 — 모델 구성과 게스트 검증"
slug: "embedded/hardware/cxl/chapter12-qemu-emulation"
date: 2026-05-16T09:12:00
description: "QEMU 11.1.3 arm64 virt에 switch와 Type 3 두 대를 구성해 게스트 Linux에서 CEDT·driver·mailbox·poison을 확인하고, cxl_test·물리 링크 검증의 범위를 구분합니다."
series: "CXL 4.0 Internals"
seriesOrder: 12
tags: [cxl, qemu, emulation, type-3, dev-workflow]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **QEMU의 CXL 모델 초기화, 게스트 firmware의 PCI 구성과 Linux CXL driver 실행은 서로 다른 검증 단계입니다. QEMU 11.1.3 arm64 게스트에서는 topology·mailbox·poison·event까지 실제로 동작했고, region commit에서 멈췄습니다.**

이 장의 실행 환경은 macOS arm64 host의 Homebrew QEMU 11.1.3(`qemu-system-aarch64`, TCG)과 Debian 13 nocloud arm64 이미지(커널 6.12.116)입니다. 소스 인용은 같은 판의 `qemu-11.1.3.tar.xz`에서 했습니다. 실제 CXL 장비가 없을 때 QEMU는 자동차 시뮬레이터와 같습니다. 계기판·핸들·브레이크 배선은 진짜처럼 시험할 수 있지만, 엔진 출력이나 타이어 마찰은 재현하지 못합니다.

## 이 판의 모델과 지원 범위

QEMU 소스 트리의 CXL 관련 장치 모델과 소스는 다음과 같습니다.

| 구성 요소 | 이름 | 소스 |
|---|---|---|
| host bridge | `pxb-cxl` | `hw/pci-bridge/pci_expander_bridge.c` |
| root port | `cxl-rp` | `hw/pci-bridge/cxl_root_port.c` |
| switch | `cxl-upstream`, `cxl-downstream` | `hw/pci-bridge/cxl_upstream.c`, `cxl_downstream.c` |
| Type 3 | `cxl-type3` | `hw/mem/cxl_type3.c` |
| switch mailbox CCI | `cxl-switch-mailbox-cci` | `hw/cxl/switch-mailbox-cci.c` (FM API 명령 처리, 이 시리즈에서는 쓰지 않음) |
| fixed memory window | `-M cxl-fmw.N.*` | `hw/cxl/cxl-host.c` |
| CEDT·`_OSC` | ACPI 표 생성 | `hw/acpi/cxl.c` |

Type 1·Type 2 모델은 없습니다. [QEMU 11.1.3 CXL 문서](https://gitlab.com/qemu-project/qemu/-/blob/v11.1.3/docs/system/devices/cxl.rst)도 "QEMU는 coherency protocol을 에뮬레이션하지 않는다"고 쓰고, 에뮬레이션의 초점을 CXL 2.0 이후로 둡니다. 실행 중인 게스트의 Type 3 장치를 QMP `qom-list`로 조회하면 이 판의 속성에 `hdm-db`, `x-256b-flit`, `num-dc-regions`, `volatile-dc-memdev`, `x-speed`, `x-width`가 있습니다. 이 장에서는 이 가운데 어느 것도 켜지 않았습니다.

## 이 시리즈의 구성: switch 아래 Type 3 두 대

실제로 부팅한 명령입니다. 경로와 disk·network 옵션은 줄이고 옵션 순서도 정리했습니다.

```bash title="qemu-cxl-switch.sh"
qemu-system-aarch64 -nographic -M virt,gic-version=3,cxl=on \
  -m 2g,maxmem=8g,slots=4 -smp 4 -accel tcg -cpu max \
  -bios /opt/homebrew/share/qemu/edk2-aarch64-code.fd \
  -qmp tcp:127.0.0.1:4471,server=on,wait=off \
  -object memory-backend-ram,id=vmem0,share=on,size=256M \
  -object memory-backend-file,id=pmem1,share=on,mem-path=pmem1.raw,size=256M \
  -object memory-backend-file,id=lsa1,share=on,mem-path=lsa1.raw,size=1M \
  -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
  -device cxl-rp,port=0,bus=cxl.1,id=rp0,chassis=0,slot=2 \
  -device cxl-upstream,bus=rp0,id=us0 \
  -device cxl-downstream,port=0,bus=us0,id=dsp0,chassis=0,slot=4 \
  -device cxl-downstream,port=1,bus=us0,id=dsp1,chassis=0,slot=5 \
  -device cxl-type3,bus=dsp0,volatile-memdev=vmem0,id=cxl-vmem0,sn=0x10 \
  -device cxl-type3,bus=dsp1,persistent-memdev=pmem1,lsa=lsa1,id=cxl-pmem1,sn=0x11 \
  -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=4G
```

`-accel hvf`가 아니라 TCG를 쓴 이유는 이 시리즈 전체가 같은 조건(TCG에서 CXL Type 3 동작)으로 관찰을 맞췄기 때문입니다. 게스트에서 본 PCI 트리입니다.

```text
-+-[0000:00]-+-00.0  Red Hat, Inc. QEMU PCIe Host bridge
 |           +-01.0  Red Hat, Inc. Virtio network device
 |           +-02.0  Red Hat, Inc. Virtio block device
 |           \-03.0  Red Hat, Inc. QEMU PCIe Expander bridge
 \-[0000:0c]---00.0-[0d-10]----00.0-[0e-10]--+-00.0-[0f]----00.0  Intel Corporation Device 0d93
                                             \-01.0-[10]----00.0  Intel Corporation Device 0d93
```

`bus_nr=12`가 그대로 버스 `0c`가 되고, root port `0c:00.0` 아래 switch upstream port `0d:00.0`, downstream port `0e:00.0`·`0e:01.0`, Type 3 `0f:00.0`·`10:00.0`이 이어집니다. `lspci -nn`의 switch port ID는 `19e5:a128`·`19e5:a129`, Type 3는 `8086:0d93`이었습니다. 모델이 정한 ID라서 실제 제품을 뜻하지 않습니다.

## 잘못된 구성을 실제로 거부하는지 확인하기

설정 오류는 게스트 부팅 전에 QEMU가 거부합니다. `-S`로 CPU를 멈춘 채 disk 없이 띄워 확인했습니다.

| 변경한 조건 | QEMU 11.1.3의 오류 (종료 코드 1) |
|---|---|
| `virt,cxl=off`에 `pxb-cxl` 추가 | `CXL host bridges present, but cxl=off` |
| FMW size를 257 MiB로 변경 | `Size of a CXL fixed memory window must be a multiple of 256MiB` |
| host bridge 두 개에 `bus_nr=12` 사용 | `Bus 12 is already in use` |
| Type 3에 `x-speed=128` | `Parameter 'x-speed' does not accept value '128'` |

마지막 줄은 [Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 본 대로 QEMU의 `PCIELinkSpeed` 열거형이 64 GT/s에서 끝나기 때문입니다(`qapi/common.json:118-119`).

## Guest Linux에서 확인한 것

부팅한 게스트에서 이 시리즈가 실제로 확인한 항목입니다.

| 확인 항목 | 결과 | 장 |
|---|---|---|
| CEDT | CHBS 1개(UID 12), CFMWS 1개(`0x10000000000`, 4 GiB) | [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) |
| driver binding | `cxl_pci`가 `0f:00.0`·`10:00.0`에 bind, `mem0`·`mem1` 등록 | [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver) |
| DVSEC·DOE·CDAT | SLD 필수 DVSEC 4개, CDAT 160바이트 | [Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io) |
| region | decoder 값은 채워지고 commit은 `-ENXIO` | [Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem) |
| mailbox | Get Health Info는 CEL에 없어 `-ENOTTY` | [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver) |
| poison·event·RAS | QMP 주입이 `cxl list -L`·`cxl monitor`·AER로 보임 | [Ch 15](/blog/embedded/hardware/cxl/chapter15-ras-performance) |

`volatile-memdev`는 volatile backing이고, 문서의 Deprecations 절은 오래된 `memdev` 속성이 persistent로 해석된다고 씁니다. 이 구성의 `mem0`은 `ram_size`, `mem1`은 `pmem_size`로 나왔습니다.

## CEDT와 firmware 경계

`hw/acpi/cxl.c`의 `cedt_build_chbs()`(103행)는 CHBS의 UID에 `pxb->bus_nr`를 넣고(118-119행, 주석 "UID - currently equal to bus number"), `cedt_build_cfmws()`(139행)는 window의 base·size·target host bridge 목록을 씁니다. 게스트에서 `acpidump -n CEDT -b`와 `iasl -d`로 푼 결과의 `Associated host bridge : 0000000C`가 그 UID 12입니다. CFMWS의 `Restrictions : 002F`는 Linux에서 root decoder의 `cap_type2`·`cap_type3`·`cap_ram`·`cap_pmem`이 모두 1인 것으로 나타났습니다(`drivers/cxl/acpi.c:118-125`).

edk2 펌웨어는 HDM decoder를 프로그래밍하지 않았습니다. 부팅 직후 모든 port의 `decoders_committed`가 0이었습니다. 펌웨어 쪽 흐름은 [Bootloader Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서 다룹니다.

## QMP로 장치 상태 바꾸기

QEMU의 `qapi/cxl.json`은 Type 3 장치에 오류와 이벤트를 넣는 QMP 명령을 정의합니다. 이 시리즈에서 실제로 쓴 명령은 다음과 같습니다.

| QMP 명령 | 게스트에서 본 결과 |
|---|---|
| `cxl-inject-poison` | `cxl list -L`의 `media_errors`에 `"source":"Internal"` 항목 |
| `cxl-inject-general-media-event` | `cxl_general_media` trace event |
| `cxl-inject-dram-event` | `cxl_dram` trace event |
| `cxl-inject-correctable-error` | AER mask를 푼 뒤 `CorrIntErr`와 `cxl_aer_correctable_error` |
| `cxl-inject-uncorrectable-errors` | AER mask를 푼 뒤 frozen → slot reset → resume |

같은 파일에는 `cxl-add-dynamic-capacity`·`cxl-release-dynamic-capacity`도 있지만, 이 구성은 DC region을 만들지 않아 실행하지 않았습니다.

## cxl_test는 별도의 kernel mock입니다

Linux v6.12의 `tools/testing/cxl/`에는 `cxl_acpi_test.c`, `cxl_core_test.c`, `mock_acpi.c`와 `test/cxl.c`·`mock.c`·`mem.c` 등이 있습니다. 실제 driver 소스를 mock 함수와 함께 다시 빌드해, QEMU 장치 없이 커널 안에서 가짜 topology를 만드는 테스트입니다. 이 시리즈에서는 빌드하거나 load하지 않았습니다.

| 확인하려는 것 | 이 시리즈에서 쓴 검증 범위 |
|---|---|
| topology·register·firmware와 guest driver 연결 | QEMU 11.1.3 + Debian 13 arm64 게스트 |
| 특정 driver 로직의 mock 오류·반환 | 실행하지 않음 (cxl_test 대상) |
| PHY·coherency·실제 지연·대역폭 | 실행하지 않음 (실제 하드웨어 필요) |

## 정리

- QEMU 11.1.3의 CXL 장치 모델은 host bridge·root port·switch·switch mailbox CCI·Type 3이고, Type 1·2 모델은 없으며 coherency protocol은 에뮬레이션하지 않습니다.
- 잘못된 machine·window·bus 설정과 지원하지 않는 링크 속도는 QEMU가 시작 전에 거부합니다.
- arm64 게스트에서 CEDT·driver binding·DVSEC·CDAT·mailbox·poison·event·AER 복구까지 실제로 관찰했습니다.
- region commit은 arm64 커널의 cache 무효화 부재로 `-ENXIO`였습니다.
- QEMU 실행 결과를 실제 CXL 장치의 성능·coherency 결과로 쓰지 않습니다.

다음 [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric)에서 논리적 자원 배정과 host 메모리 사용의 경계를 살펴봅니다.

## 관련 항목

- [Ch 11: Linux CXL driver](/blog/embedded/hardware/cxl/chapter11-linux-driver)
- [Modern Embedded Recipes: QEMU CXL Type 3 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
- [QEMU 11.1.3 CXL 문서](https://gitlab.com/qemu-project/qemu/-/blob/v11.1.3/docs/system/devices/cxl.rst)

## 시리즈 자료 출처 안내

이 글은 QEMU 11.1.3의 문서·장치 모델·QAPI 소스, Linux v6.12 `tools/testing/cxl/`, Debian 13 arm64 게스트(커널 6.12.116, cxl 81)의 실행 결과를 근거로 합니다. 전체 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
