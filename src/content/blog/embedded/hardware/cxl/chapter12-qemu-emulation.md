---
title: "Ch 12: QEMU CXL 에뮬레이션 — 모델 구성과 게스트 검증"
slug: "embedded/hardware/cxl/chapter12-qemu-emulation"
date: 2026-05-16T09:12:00
description: "고정한 QEMU 9.2.4의 Type 3 모델을 정지 상태에서 검증하고, guest Linux·cxl_test·물리 링크 검증의 범위를 구분합니다."
series: "CXL 4.0 Internals"
seriesOrder: 12
tags: [cxl, qemu, emulation, type-3, dev-workflow]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **QEMU의 CXL 모델 초기화, 게스트 firmware의 PCI 구성과 Linux CXL driver 실행은 서로 다른 검증 단계입니다. 모델이 만들어졌다는 사실만으로 guest의 region·System RAM이나 물리 CXL 성능을 증명하지는 못합니다.**

이 장의 소스 기준은 [QEMU v9.2.4, commit `b2995afed254`](https://gitlab.com/qemu-project/qemu/-/tree/b2995afed254e4804611df52210067a4d5dbdf0b)입니다. [공식 CXL 문서의 해당 판](https://gitlab.com/qemu-project/qemu/-/blob/b2995afed254e4804611df52210067a4d5dbdf0b/docs/system/devices/cxl.rst)과 장치 속성을 대조합니다. 확인하지 않은 2026년 master·11.1 개발판을 실행 환경으로 사용하지 않습니다.

직접 검증한 범위는 macOS arm64 host에서 빌드한 x86_64 system emulator의 **headless·TCG·CPU 정지 상태의 machine/device 초기화와 QMP 조회**입니다. guest image나 kernel은 연결하지 않았습니다. 따라서 아래에서 guest Linux 명령은 후속 실습 절차이며 이 글의 실행 결과와 구분합니다.

## 이 판의 모델과 지원 범위

| 구성 요소 | 이름·속성 | 확인 범위 |
|---|---|---|
| host bridge | `pxb-cxl` | PCIe root bus에 연결합니다. |
| root port | `cxl-rp` | host bridge 아래 port를 만듭니다. |
| switch | `cxl-upstream`, `cxl-downstream` | 단일 virtual hierarchy 모델입니다. 이 장의 실행에는 추가하지 않았습니다. |
| Type 3 | `cxl-type3` | volatile·persistent backing과 `num-dc-regions` 속성을 제공합니다. |
| fixed memory window | `cxl-fmw.N.*` | CEDT의 CFMWS 구성에 사용됩니다. |

9.2.4의 Type 3 모델에는 이 글의 이전 예에 있던 `hdm-db`·`x-256b-flit` 속성이 없습니다. 정지 상태의 QOM property 조회에서도 이를 확인했습니다. 다른 판의 기능을 이 판에서 사용할 수 있다고 섞지 않습니다. `num-dc-regions` 속성의 존재도 실제 DC extent 추가·수락·반납을 시험했다는 뜻은 아닙니다.

QEMU의 CXL 문서는 coherence protocol 자체를 에뮬레이션하는 모델과 topology·register 모델을 구분합니다. 여기서 cache·PHY·LTSSM의 실제 timing을 얻을 수는 없습니다. Type 1·2 가속기 모델을 이 Type 3 구성으로 검증했다고 주장하지 않습니다.

## 작은 구성: guest를 실행하지 않고 시작하기

다음은 실험용 초기화 명령입니다. CXL backing은 256 MiB, 기본 guest RAM은 128 MiB이고 CPU는 `-S`로 정지합니다. guest disk·kernel·network나 물리 장치 passthrough를 추가하지 않습니다. 소스 build를 사용한다면 `QEMU_SOURCE`를 해당 clone 경로로 설정하고, executable 경로도 build에 맞게 지정합니다.

```bash title="qemu-cxl-paused.sh"
qemu-system-x86_64 \
  -L "$QEMU_SOURCE/pc-bios" \
  -accel tcg,thread=single \
  -machine q35,cxl=on \
  -m 128M,maxmem=1G,slots=8 -smp 1 \
  -nodefaults -display none -monitor none -serial none -S \
  -object memory-backend-ram,id=vmem0,size=256M \
  -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
  -device cxl-rp,port=0,bus=cxl.1,id=root_port13,chassis=0,slot=2 \
  -device cxl-type3,bus=root_port13,volatile-memdev=vmem0,id=cxl-vmem0 \
  -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=256M \
  -qmp stdio
```

이 구성에는 Linux guest boot image가 없습니다. `-S`를 빼고 guest OS가 부팅된 것처럼 해석하지 않습니다.

QMP의 greeting을 받은 뒤 먼저 capabilities를 활성화하고 상태·속성을 조회합니다. 아래 JSON은 줄마다 하나씩 보내며 `cont`는 보내지 않습니다. 마지막 `quit`으로 emulator를 종료합니다.

```json
{"execute":"qmp_capabilities"}
{"execute":"query-status"}
{"execute":"qom-get","arguments":{"path":"/machine/peripheral/cxl-vmem0","property":"realized"}}
{"execute":"qom-get","arguments":{"path":"/machine/peripheral/cxl-vmem0","property":"volatile-memdev"}}
{"execute":"qom-list","arguments":{"path":"/machine/peripheral/cxl-vmem0"}}
{"execute":"quit"}
```

실행에서는 `query-status`의 `running=false`, Type 3의 `realized=true`, backing object 경로 `/objects/vmem0`을 확인했습니다. 이들은 모델 초기화에 관한 관측입니다. firmware를 실행하기 전 `query-pci`에 모든 downstream 장치가 보이는 것은 아니며, guest의 PCI enumeration·driver binding 결과로 대신 사용할 수 없습니다.

재현 검사는 저장소의 `scripts/verify-qemu-cxl-topology.mjs`에 있습니다. `QEMU_ARTICLE_SOURCE`와 `QEMU_ARTICLE_BUILD`로 고정 clone·build 위치를 지정하면 실제 binary를 실행해 QMP 응답과 다음 실패 조건을 검사합니다. 빌드에는 두 compile job을 사용했고 시스템에 설치하지 않았습니다.

## 잘못된 구성을 실제로 거부하는지 확인하기

| 변경한 조건 | 9.2.4에서 관측한 오류 | 의미 |
|---|---|---|
| `q35,cxl=off`에 `pxb-cxl` 추가 | `CXL host bridges present, but cxl=off` | machine의 CXL 설정과 bridge가 맞지 않습니다. |
| FMW size를 257 MiB로 변경 | `multiple of 256MiB`를 포함한 오류 | window 크기 정렬 조건이 맞지 않습니다. |
| host bridge 두 개에 `bus_nr=12` 사용 | `Bus 12 is already in use` | expander bus 번호가 충돌합니다. |

모두 guest CPU 실행 전에 프로세스가 오류로 종료되는 것을 확인했습니다. 이 결과는 장치의 hardware error·poison이나 Linux recovery를 주입한 시험이 아닙니다. 서로 다른 실패 범위를 같은 “CXL 오류 테스트”로 묶지 않습니다.

## Guest Linux에서 이어서 확인할 것

실제 driver 실습에는 boot 가능한 guest kernel·root filesystem과 필요한 CXL/DAX 설정, cxl-cli·daxctl 등이 필요합니다. Linux v6.12와 ndctl v80을 쓴다면 [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)의 source 기준과 연결할 수 있습니다. QEMU 문서의 오래된 Linux 5.18 설정 문단을 모든 region 기능의 최소 버전처럼 사용하지 않습니다.

Linux guest 안에서 다음 상태를 확인합니다. 이 명령은 이 글의 검증에서 실행하지 않았으며, 장치 이름·BDF·region·node 번호는 실제 guest에서 얻어야 합니다.

```bash
lspci -n
ls /sys/bus/cxl/devices/
cxl list -M -D -T
cxl list -R
daxctl list
numactl --hardware
```

`volatile-memdev`는 volatile backing이며, 오래된 `memdev` 속성의 persistent 호환 경로와 구분합니다. volatile region 생성과 Device DAX/System RAM 노출도 별도 단계입니다. 먼저 이미 구성된 region을 확인하고, 실제 생성·mode 전환은 guest 안에서 지원 조건과 데이터 수명을 확인한 뒤 수행합니다. 이 글은 region 생성·destroy나 memory online/offline을 실행하지 않습니다.

QEMU 소스 `hw/mem/cxl_type3.c`의 model Vendor/Device ID는 실제 제조사 제품이나 PCI 등록 상태의 증거가 아닙니다. guest에서 같은 ID를 읽더라도 에뮬레이터 모델임을 표시해야 합니다. [Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)의 synthetic dump 검사와도 구분합니다.

## CEDT와 firmware 경계

`hw/acpi/cxl.c`는 QEMU의 CEDT 생성을 담당합니다. CHBS는 host bridge 정보를, CFMWS는 fixed window의 base·size·target·interleave 정보를 전달합니다. 이 판의 host bridge UID가 `bus_nr`에서 오는 소스 경로와, guest가 실제 table을 읽어 decoder를 등록한 결과는 다른 증거입니다.

Guest가 부팅된 후에는 `acpidump`·`iasl` 등으로 CEDT를 확인하고 kernel log·sysfs와 대응시킬 수 있습니다. 이 장에서는 guest를 부팅하지 않았으므로 CEDT dump를 얻었다고 주장하지 않습니다. QMP object의 존재가 유효한 guest ACPI 소비와 메모리 mapping을 보장하지는 않습니다.

## cxl_test는 별도의 kernel mock입니다

Linux v6.12의 `tools/testing/cxl/`은 실제 driver의 일부 경로를 mock 함수와 함께 빌드하는 테스트 구성입니다. QEMU가 만든 PCI device를 사용하는 것이 아니며 `test/`의 소스와 Kbuild를 같이 읽어야 합니다. 이 판의 `test/cxl.c`, `mock.c`, `mem.c` 등의 역할을 다른 판의 accelerator mock과 섞지 않습니다.

cxl_test 실습은 적합한 별도 Linux kernel·module build 환경에서 진행합니다. module 설치·교체는 테스트 대상 kernel에 영향을 주므로 명령 두 줄을 일반 host 설정법처럼 제시하지 않습니다. 이 글에서는 host나 guest에 module을 설치·load/unload하지 않았습니다.

| 확인하려는 것 | 적합한 검증 범위 |
|---|---|
| topology·register·firmware와 guest driver 연결 | QEMU와 boot 가능한 Linux guest |
| 특정 driver 로직의 mock 오류·반환 | 고정 kernel의 cxl_test 또는 선언된 host 함수 harness |
| PHY·coherency·실제 지연·대역폭 | 지원 hardware와 적절한 계측 |

## 정리

- 고정한 QEMU 판의 모델·속성과 명령을 사용합니다.
- 이 장에서 확인한 실행은 CPU를 멈춘 상태의 Type 3 초기화와 QMP 속성입니다.
- 잘못된 window·bus·machine 설정의 거부는 실제 binary로 확인했습니다.
- guest boot·PCI enumeration·CXL driver·region·NUMA는 후속 검증입니다.
- QEMU, kernel mock과 물리 링크 계측은 서로 다른 범위를 다룹니다.
- 모델 초기화와 기능 지원을 실제 CXL 4.0 성능·coherency 결과로 확대하지 않습니다.

다음 [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric)에서 논리적 자원 배정과 host 메모리 사용의 경계를 살펴봅니다.

## 관련 항목

- [Ch 11: Linux CXL driver](/blog/embedded/hardware/cxl/chapter11-linux-driver)
- [Modern Embedded Recipes: QEMU CXL Type 3 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
- [QEMU v9.2.4 CXL 문서](https://gitlab.com/qemu-project/qemu/-/blob/b2995afed254e4804611df52210067a4d5dbdf0b/docs/system/devices/cxl.rst)

## 시리즈 자료 출처 안내

이 글은 QEMU v9.2.4의 문서·model/QAPI 소스, Linux v6.12 `tools/testing/cxl/`와 ndctl v80 자료를 대조했습니다. 실행 범위와 남은 guest·hardware 검증을 위에서 구분합니다. 전체 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
