---
title: "Linux CXL 드라이버 분석 — cxl_pci·cxl_core·region·DAX"
slug: "embedded/modern-recipes/part11-17-linux-cxl-driver"
date: 2026-06-18T09:03:00
description: "CXL 디바이스가 메모리로 안 올라올 때 모듈 체인·sysfs·mailbox 중 어디서 끊겼는지 좁혀 가는 절차."
series: "Modern Embedded Recipes"
seriesOrder: 151
tags: [recipes, linux, cxl, kernel-driver, dax, sysfs]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Linux CXL 드라이버는 *cxl_core* 위에 *cxl_port·cxl_acpi·cxl_pmem·cxl_mem·cxl_pci*가 얹힌 모듈 묶음입니다."** 어느 한 모듈이 빠지면 그 층에서 객체가 생기지 않고, 에러 대신 *빈 sysfs*로 나타나기 쉽습니다.

## 이 레시피가 푸는 것

CXL 디바이스가 안 올라올 때 가장 곤란한 점은 *에러가 안 난다*는 것입니다. `lspci`에는 보이는데 `/sys/bus/cxl/devices/`가 비어 있거나, memdev는 있는데 `numactl --hardware`에 노드가 안 생기거나, region은 만들어졌는데 commit이 거부됩니다. 각 경우가 서로 다른 층에서 끊긴 것인데 증상만 보면 구분이 안 갑니다.

이 글은 그 층을 아래에서 위로 하나씩 짚어 *어디서 끊겼는지* 좁히는 절차입니다. 각 층의 커널 코드가 실제로 무엇을 하는지는 [CXL 4.0 Internals Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 `cxl_pci_probe`부터 `cxl_region_attach`까지 따라갑니다.

## 층 구분

먼저 지도를 잡습니다. 디바이스가 메모리로 쓰이기까지 통과하는 층은 다섯입니다.

| 층 | 확인 지점 | 끊기면 |
|----|----------|--------|
| 1. PCI 열거 | `lspci`에 CXL 디바이스 | 물리·링크 문제 |
| 2. 모듈 로딩 | `lsmod \| grep cxl` | 서브시스템 자체가 안 뜸 |
| 3. CXL 등록 | `/sys/bus/cxl/devices/` | probe가 중간에 멈춤 |
| 4. Region | `cxl list -RT`의 region | decoder·interleave 설정 문제 |
| 5. NUMA | `numactl --hardware` | DAX 모드 전환 누락 |

아래로 내려갈수록 원인이 물리에 가깝습니다. 그래서 *위에서부터 확인하되 실패한 지점의 한 층 아래를 의심*하는 것이 빠릅니다.

## 1층 — PCI에 보이는가

가장 먼저 디바이스가 PCI 레벨에서 열거됐는지 봅니다.

```bash
$ lspci -nn | grep -i cxl
$ lspci -vv -s 0c:00.0 | grep -A4 "Designated Vendor-Specific"
```

CXL 디바이스는 *DVSEC*(Designated Vendor-Specific Extended Capability)로 자신이 CXL임을 알립니다. `cxl_pci`는 CXL memory class code(0502)로 디바이스에 붙고, probe 중 CXL Device DVSEC을 찾습니다. DVSEC이 없으면 `Device DVSEC not present, skip CXL.mem init` 경고만 남기고 probe는 계속합니다(`drivers/cxl/pci.c`). 이 경고가 dmesg에 있으면 CXL.mem 초기화가 빠졌습니다.

## 2층 — 모듈 체인이 다 올라왔는가

CXL 모듈은 기능별 의존성이 있으며, 필요한 모듈과 펌웨어·ACPI 정보를 모두 사용할 수 있어야 probe가 진행됩니다. 모듈을 수동으로 특정 순서에 맞춰 올리는 것보다 kernel의 module dependency와 플랫폼 상태를 확인하는 편이 안전합니다.

```bash
$ lsmod | grep cxl
```

`drivers/cxl/Makefile`이 built-in 순서를 이렇게 적습니다. `core`가 먼저, 다음 `port`(CXL root port를 바로 enable하려고 `acpi`보다 앞), `acpi`, `pmem`·`mem`(endpoint 드라이버보다 앞), 마지막이 `pci`(하드웨어 열거 계층과 같은 순서)입니다. `cxl_core`는 공통 기능을 제공하고 나머지 드라이버가 이를 사용합니다. 정상적인 시스템에서는 CEDT와 필요한 장치가 있으면 `modprobe cxl_acpi` 또는 udev/module autoload로 의존성이 처리됩니다. `cxl_mem not found`가 나오면 모듈 순서뿐 아니라 kernel config, 장치 타입, firmware table도 함께 확인해야 합니다.

`cxl_acpi`가 안 올라온다면 펌웨어 쪽을 봅니다. CEDT 테이블이 없으면 root port를 등록할 근거가 없습니다.

```bash
$ ls /sys/firmware/acpi/tables/CEDT
```

## 3층 — CXL 서브시스템에 등록됐는가

모듈이 다 올라왔는데 아래가 비어 있다면 probe가 중간에 멈춘 것입니다.

```bash
$ ls /sys/bus/cxl/devices/
mem0/  decoder0.0/  port0/  root0/

$ dmesg | grep -i cxl | tail -20
```

`mem0`은 있는데 decoder가 없는 식으로 *일부만* 등록될 수 있습니다. probe가 어느 단계에서 멈췄는지는 ftrace로 잡습니다.

```bash
$ echo 'cxl_*' > /sys/kernel/debug/tracing/set_ftrace_filter
$ echo function > /sys/kernel/debug/tracing/current_tracer
$ echo 1 > /sys/kernel/debug/tracing/tracing_on
$ modprobe -r cxl_pci && modprobe cxl_pci
$ cat /sys/kernel/debug/tracing/trace | grep cxl
```

마지막으로 호출된 `cxl_*` 함수가 멈춘 지점입니다. 그 함수가 무엇을 하려던 것인지는 [Kernel Debugging Ch 8](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)에서 다룹니다.

## 4층 — region이 만들어지고 commit되는가

여기가 가장 많이 막히는 층입니다. region 생성은 sysfs write의 연속이고, 각 write가 실패하면 그 자리에서 errno를 돌려줍니다.

```bash
$ cxl create-region -m -d decoder0.0 -t ram mem0
# 실패하면 어느 write에서 났는지 확인
$ dmesg | tail -5
```

`cxl-cli`가 하는 일은 결국 sysfs에 값을 쓰는 것이라, 막히면 손으로 한 단계씩 밟아 어디서 거부되는지 볼 수 있습니다. 순서와 의미는 커널 ABI 문서(`Documentation/ABI/testing/sysfs-bus-cxl`)를 따릅니다.

```bash
# root decoder가 다음 region 이름을 알려 주고, 그 이름을 그대로 써야 함
$ cat /sys/bus/cxl/devices/decoder0.0/create_ram_region
region0
$ echo region0 > /sys/bus/cxl/devices/decoder0.0/create_ram_region

# interleave 설정 → size → target(endpoint decoder 이름) → commit
$ echo 1    > /sys/bus/cxl/devices/region0/interleave_ways
$ echo 256  > /sys/bus/cxl/devices/region0/interleave_granularity
$ echo 256M > /sys/bus/cxl/devices/region0/size
$ echo decoder2.0 > /sys/bus/cxl/devices/region0/target0
$ echo 1    > /sys/bus/cxl/devices/region0/commit
```

`targetN`에는 memdev 이름이 아니라 *endpoint decoder* 이름을 씁니다. 그 endpoint decoder에는 미리 DPA 공간이 잡혀 있어야 하고, `cxl create-region`은 이 과정까지 대신 합니다. size는 interleave 설정 뒤에 써야 합니다.

**commit은 되돌릴 수 있습니다.** `commit`에 0을 쓰면 decoder reset이 예약되고 region이 내려갑니다. 플랫폼이 잠근(locked) region만 `-EPERM`으로 거부합니다(`drivers/cxl/core/region.c`의 `commit_store`).

commit이 `-EBUSY`로 거부되면 decoder를 spec이 정한 순서(마지막으로 commit된 decoder id + 1)대로 commit하지 않았거나, 그 memdev에서 sanitize가 진행 중입니다(`drivers/cxl/core/hdm.c`의 `cxl_decoder_commit`). 이미 enable된 decoder는 `-EBUSY`가 아니라 그대로 성공 처리됩니다.

## 5층 — NUMA 노드로 올라오는가

region까지 됐는데 `numactl`에 안 보인다면 대개 DAX 모드 전환이 빠진 것입니다.

```bash
$ daxctl list
$ daxctl reconfigure-device dax0.0 -m system-ram
$ numactl --hardware
```

`devdax` 모드는 `/dev/dax0.0` 문자 디바이스로만 보이고 일반 메모리로는 안 잡힙니다. `system-ram`으로 바꿔야 커널이 hot-add해 NUMA 노드가 생깁니다.

## mailbox가 응답하지 않을 때

디바이스 상태를 물어보는 명령(`cxl list -H`의 health 정보, poison list 조회 등)이 멈춘다면 mailbox 층입니다.

`cxl_pci`의 mailbox 전송은 doorbell을 `CXL_MAILBOX_TIMEOUT_MS`(2 × HZ, 약 2초)까지 polling합니다(`drivers/cxl/pci.c`). 오래 걸리는 background 명령은 별도 경로로 완료를 기다립니다. dmesg에 mailbox timeout이 찍히면 이 층에서 막혔습니다.

## RAS 이벤트가 안 보일 때

CXL 프로토콜 에러는 PCIe AER 경로를 타고 올라오고, 커널은 `cxl_aer_correctable_error`·`cxl_aer_uncorrectable_error` 같은 trace event로 남깁니다(`drivers/cxl/core/trace.h`). 디바이스의 media 이벤트는 `cxl_general_media`·`cxl_dram` 등 event record trace로 나옵니다. `cxl monitor`가 이 trace event를 보여 줍니다.

```bash
$ cxl monitor
```

## Hot-remove 전에

디바이스를 뽑기 전에 region을 쓰는 워크로드를 먼저 정리하고 region을 내립니다.

```bash
$ umount /mnt/cxl-backed   # 있다면 먼저
$ cxl disable-region region0
$ cxl destroy-region region0
```

## 정리

- 층을 나눠 좁힙니다. PCI 열거 → 모듈 체인 → CXL 등록 → region → NUMA 순서로, 실패 지점의 *한 층 아래*를 의심합니다.
- `lspci`에 보여도 CXL Device DVSEC이 없으면 `cxl_pci`가 경고를 남기고 CXL.mem 초기화를 건너뜁니다.
- `cxl_core`가 베이스이고, built-in 순서는 core → port → acpi → pmem/mem → pci입니다.
- region commit은 되돌릴 수 있습니다(`commit`에 0). `-EBUSY`는 순서가 어긋난 commit이나 진행 중인 sanitize입니다.
- region이 있는데 NUMA 노드가 없으면 `daxctl reconfigure-device -m system-ram`이 빠진 것입니다.
- mailbox doorbell은 약 2초까지 polling합니다. health 정보는 `cxl list -H`로 봅니다.
- RAS 이벤트는 trace event로 남고 `cxl monitor`로 봅니다.

다음 편은 Modern Embedded Recipes 시리즈의 *Part 12 (Edge AI·IoT)* 영역으로 이어집니다.

## 관련 항목

- [Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Ch 150: QEMU CXL Type 3 디바이스 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
- [CXL 4.0 Internals Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver) — 각 층의 커널 코드가 실제로 하는 일
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Kernel Debugging Ch 9: drivers/cxl 코드 분석](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)
- [Bootloader Internals Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
