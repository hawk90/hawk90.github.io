---
title: "Ch 12: QEMU CXL 에뮬레이션 — 노트북에서 CXL 개발"
slug: "embedded/hardware/cxl/chapter12-qemu-emulation"
date: 2026-05-16T09:12:00
description: "QEMU의 CXL 토폴로지 에뮬레이션과 커널 cxl_test mock으로 드라이버 경로를 돌려 보기."
series: "CXL 4.0 Internals"
seriesOrder: 12
tags: [cxl, qemu, emulation, type-3, dev-workflow]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"QEMU는 *CXL host bridge·root port·switch·Type 3 메모리 디바이스*를 에뮬레이션해, 실 디바이스 없이 *Linux guest의 CXL 드라이버 경로*를 돌려 볼 수 있게 합니다."** — `-M q35,cxl=on`(또는 arm `virt,cxl=on`)에 `pxb-cxl·cxl-rp·cxl-type3`와 `cxl-fmw`를 조합합니다. 링크·PHY는 없으니 성능 측정에는 쓰지 않습니다. 이 장은 QEMU master(11.1 개발판, 2026-10) 문서와 소스 기준입니다.

[Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 *Linux drivers/cxl/ 코드*를 봤습니다. 이 코드를 돌려 보려면 실 디바이스나 에뮬레이션이 필요합니다. QEMU가 그 자리를 채웁니다.

## QEMU가 제공하는 것

QEMU 문서(`docs/system/devices/cxl.rst`)와 소스에서 확인되는 구성 요소:

| 구성 요소 | QEMU 이름 |
|------|-----|
| CXL host bridge | `pxb-cxl` |
| CXL root port | `cxl-rp` |
| CXL switch | `cxl-upstream` + `cxl-downstream` (단일 virtual hierarchy) |
| Type 3 메모리 디바이스 | `cxl-type3` — volatile, persistent, Dynamic Capacity(`num-dc-regions`) |
| Fixed Memory Window (CEDT CFMWS) | 머신 옵션 `cxl-fmw.N.*` |
| HDM-DB | `cxl-type3`의 `hdm-db`, 256B flit(`x-256b-flit`), window의 `back-invalidate=on` |
| 머신 | x86 `q35`, arm `virt` |

Type 1·Type 2 가속기 디바이스 모델은 QEMU 트리에 없습니다. 오류·poison·이벤트 주입은 QMP 명령으로 됩니다: `cxl-inject-poison`, `cxl-inject-uncorrectable-errors`, `cxl-inject-correctable-error`, `cxl-inject-general-media-event`, `cxl-inject-dram-event`, `cxl-inject-memory-module-event`, 그리고 Dynamic Capacity용 `cxl-add-dynamic-capacity`·`cxl-release-dynamic-capacity`.

## 머신 옵션

```bash
qemu-system-x86_64 \
    -M q35,cxl=on \
    -m 4G,maxmem=8G,slots=8 \
    -smp 4 \
    ...
```

| 옵션 | 의미 |
|------|------|
| `cxl=on` | 머신의 CXL 지원 켜기. CEDT 생성, `pxb-cxl` 레지스터 연결 |
| `maxmem`·`slots` | QEMU 문서의 모든 CXL 예시가 함께 씀 |
| `q35` | `pxb-cxl`은 PCIe root bus(`pcie.0`)에 달아야 함 |

`cxl=off`인데 `pxb-cxl`이 있으면 QEMU는 `CXL host bridges present, but cxl=off`로 멈춥니다.

## Type 3 디바이스 추가

QEMU 문서의 volatile 메모리 예시:

```bash
qemu-system-x86_64 -M q35,cxl=on -m 4G,maxmem=8G,slots=8 -smp 4 \
  ... \
  -object memory-backend-ram,id=vmem0,share=on,size=256M \
  -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
  -device cxl-rp,port=0,bus=cxl.1,id=root_port13,chassis=0,slot=2 \
  -device cxl-type3,bus=root_port13,volatile-memdev=vmem0,id=cxl-vmem0 \
  -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=4G
```

| 옵션 | 역할 |
|------|------|
| `memory-backend-ram`·`memory-backend-file` | 디바이스 메모리의 backing store |
| `pxb-cxl` | CXL host bridge (PCI Expander Bridge의 CXL 판) |
| `cxl-rp` | CXL root port |
| `cxl-type3` | Type 3 디바이스. `volatile-memdev=` 또는 `persistent-memdev=`(+ `lsa=`) |
| `cxl-fmw.N` | CFMWS 하나. `targets`는 host bridge, `size`는 256 MiB 배수 |

`cxl-type3`의 옛 `memdev=` 속성은 *deprecated*이고, 하위 호환을 위해 *persistent* 메모리로 취급됩니다. volatile region을 만들려면 `volatile-memdev=`를 써야 합니다.

## Linux guest에서 확인

QEMU 문서는 Linux 5.18 기준 필요한 커널 옵션으로 `CONFIG_CXL_BUS`·`CXL_PCI`·`CXL_ACPI`·`CXL_PMEM`·`CXL_MEM`·`CXL_PORT`·`CXL_REGION`을 듭니다.

```bash
# PCI 디바이스: vendor 8086, device 0d93, class 0502 (CXL memory)
guest$ lspci -nn -d 8086:0d93

# CXL bus 객체: root0, portN, endpointN, decoderX.Y, mem0 등
guest$ ls /sys/bus/cxl/devices/

# 토폴로지·decoder·memdev
guest$ cxl list -M -D -T

# volatile region 생성 (크기를 빼면 가능한 최대)
guest$ cxl create-region -m -d decoder0.0 -t ram mem0

# dax 장치를 System RAM으로 (이미 online이면 생략)
guest$ daxctl reconfigure-device dax0.0 -m system-ram

# 새 NUMA 노드 확인
guest$ numactl --hardware
```

`0d93` 디바이스 ID와 Intel vendor ID는 QEMU `hw/mem/cxl_type3.c`가 그대로 박아 둔 값입니다. 출력 JSON 형식은 ndctl 문서(`cxl-list`, `cxl-create-region`)에 예시가 있습니다.

## CEDT 확인

QEMU의 `hw/acpi/cxl.c`가 CEDT를 만듭니다.

| Subtable | 만드는 단위 | 주요 값 |
|---------|------|------|
| CHBS (Type 0) | `pxb-cxl` 하나당 | Record Length 32, *UID = `bus_nr`*, CXL Version 1, Base·Length = host bridge 레지스터 영역 |
| CFMWS | `cxl-fmw.N` 하나당 | window base·size, target host bridge, interleave |

```bash
guest$ acpidump -n CEDT -b
guest$ iasl -d cedt.dat
```

위 예시처럼 `bus_nr=12`면 CHBS UID는 12(0x0C)입니다. 드라이버(`cxl_acpi`)는 실 BIOS가 만든 CEDT와 같은 경로로 이 표를 읽습니다.

## cxl_test — QEMU 없이 도는 mock 토폴로지

커널 트리의 `tools/testing/cxl/`은 QEMU 디바이스와 별개입니다. CXL 모듈을 mock 함수와 함께 다시 빌드하고, `cxl_test` 모듈이 가짜 CXL 토폴로지를 만듭니다. ndctl의 CXL 테스트가 이걸 씁니다.

```bash
# ndctl README의 절차
$ sudo make M=tools/testing/cxl modules_install
$ sudo make modules_install

# 테스트 토폴로지 올리기·내리기 (ndctl test 스크립트와 같음)
$ sudo modprobe cxl_test
$ sudo modprobe -r cxl_test
```

| 모듈 | 소스 |
|------|------|
| `cxl_test` | `test/cxl.c`, `test/hmem_test.c` |
| `cxl_mock` | `test/mock.c` |
| `cxl_mock_mem` | `test/mem.c` |
| `cxl_mock_accel` | `test/accel.c` |

드라이버 로직을 빠르게 반복 테스트하기엔 cxl_test, 실제 PCI 열거·CEDT·레지스터 경로를 보기엔 QEMU가 맞습니다.

## QEMU CXL로 못 하는 것

| 한계 | 이유 |
|------|------|
| 성능·지연 측정 | 링크와 디바이스 지연을 모델링하지 않음 |
| PHY·LTSSM·신호 무결성 | 물리 링크가 없음 |
| Type 1·Type 2 가속기 경로 | 디바이스 모델 없음 |

## 자주 하는 실수

### `memdev=`로 붙이고 ram region을 만들려 함

`memdev=`는 persistent로 취급됩니다. volatile은 `volatile-memdev=`를 써야 합니다.

### `pc`(i440fx) 머신에 `pxb-cxl`

```text
pxb-cxl devices cannot reside on a PCI bus
```

`pxb-cxl`은 PCIe root bus가 필요합니다. `q35`를 씁니다.

### FMW 크기를 256 MiB 배수가 아닌 값으로

```text
Size of a CXL fixed memory window must be a multiple of 256MiB
```

region 전체가 window 안에 들어가야 하므로, interleave할 디바이스 용량의 합보다 작게 잡으면 원하는 region을 만들 수 없습니다.

### 같은 bus 번호로 `pxb-cxl` 두 개

```text
Bus 12 is already in use
```

host bridge마다 `bus_nr`를 다르게 줍니다. QEMU 문서 예시는 12와 222를 씁니다.

## 정리

- QEMU는 *pxb-cxl·cxl-rp·cxl-upstream/downstream·cxl-type3*와 *cxl-fmw*로 CXL 토폴로지를 만듭니다. Type 1·2 모델은 없습니다.
- `-M q35,cxl=on`(x86) 또는 `virt,cxl=on`(arm). volatile은 `volatile-memdev=`.
- guest에서는 `cxl list`·`cxl create-region`·`daxctl`로 실 디바이스와 같은 경로를 탑니다.
- 오류·poison·Dynamic Capacity는 QMP `cxl-*` 명령으로 주입합니다.
- 드라이버 로직만 볼 땐 커널의 *cxl_test* mock이 더 가볍습니다.
- 링크가 없으니 성능·PHY 검증은 실 하드웨어 몫입니다.

## 다음 편

[Ch 13: Switching·Fabric Manager — 2.0 pooling에서 3.x fabric까지](/blog/embedded/hardware/cxl/chapter13-switching-fabric)에서 *CXL switch의 진화*와 *Fabric Manager의 역할*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)
- [Modern Embedded Recipes Ch 150: QEMU CXL Type 3 디바이스 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation) — 환경을 세우는 절차와 처음 걸리는 함정
- [QEMU 공식 CXL 문서](https://qemu.readthedocs.io/en/latest/system/devices/cxl.html)

## 시리즈 자료 출처 안내

이 글은 QEMU master 문서·소스(GPL), Linux `tools/testing/cxl/`, ndctl 문서·테스트를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
