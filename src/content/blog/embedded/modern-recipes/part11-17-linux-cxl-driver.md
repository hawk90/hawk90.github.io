---
title: "Linux CXL 드라이버 분석 — cxl_pci·cxl_core·region·DAX"
date: 2026-06-18T09:03:00
description: "CXL 디바이스가 메모리로 안 올라올 때 모듈 체인·sysfs·mailbox 중 어디서 끊겼는지 좁혀 가는 절차."
series: "Modern Embedded Recipes"
seriesOrder: 151
tags: [recipes, linux, cxl, kernel-driver, dax, sysfs]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Linux CXL 드라이버는 *cxl_acpi → cxl_pci → cxl_core → cxl_mem*의 의존성 체인으로 동작합니다."** 어느 한 모듈만 로딩 안 돼도 *침묵하며 동작 안* 합니다.

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

CXL 디바이스는 *DVSEC*(Designated Vendor-Specific Extended Capability)로 자신이 CXL임을 알립니다. `lspci`에는 뜨는데 DVSEC가 없으면 커널은 그냥 PCI 디바이스로 취급하고 CXL 경로를 아예 타지 않습니다. 이 경우 CXL 모듈을 아무리 로딩해도 소용없습니다.

## 2층 — 모듈 체인이 다 올라왔는가

CXL 모듈은 순서가 있고, 아래 것이 없으면 위 것이 조용히 실패합니다.

```bash
$ lsmod | grep cxl
cxl_mem      cxl_core
cxl_pci      cxl_core
cxl_acpi     cxl_core
cxl_core
```

`cxl_core`가 베이스이고 나머지가 그 위에 얹힙니다. 정상적인 시스템에서는 CEDT가 있으면 `modprobe cxl_acpi` 한 번으로 의존성이 자동 해결됩니다. 손으로 하나씩 올리다 `cxl_mem not found`가 나온다면 대개 순서 문제입니다.

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

`mem0`은 있는데 `decoder0.0`이 없는 식으로 *일부만* 등록되는 경우가 실제로 자주 나옵니다. probe가 어느 단계에서 멈췄는지는 ftrace로 잡는 것이 가장 빠릅니다.

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
$ cxl create-region -d decoder0.0 -t ram -s 128G
# 실패하면 어느 write에서 났는지 확인
$ dmesg | tail -5
```

`cxl-cli`가 하는 일은 결국 sysfs에 값을 쓰는 것이라, 막히면 손으로 한 단계씩 밟아 어디서 거부되는지 볼 수 있습니다.

```bash
$ echo region0 > /sys/bus/cxl/devices/decoder0.0/create_ram_region
$ echo mem0   > /sys/bus/cxl/devices/region0/target0
$ echo 137438953472 > /sys/bus/cxl/devices/region0/size
$ echo 1      > /sys/bus/cxl/devices/region0/commit
```

**commit은 되돌릴 수 없습니다.** decoder를 잘못 프로그래밍한 채 commit하면 그 decoder는 reboot 전까지 그 상태입니다. size와 target을 확인하고 마지막 줄을 실행합니다.

commit이 `-EBUSY`로 거부되면 decoder가 이미 enable 상태입니다. 앞선 시도가 절반쯤 성공한 채 남아 있는 경우가 대부분입니다.

## 5층 — NUMA 노드로 올라오는가

region까지 됐는데 `numactl`에 안 보인다면 대개 DAX 모드 전환이 빠진 것입니다.

```bash
$ daxctl list
$ daxctl reconfigure-device dax0.0 -m system-ram
$ numactl --hardware
```

`devdax` 모드는 `/dev/dax0.0` 문자 디바이스로만 보이고 일반 메모리로는 안 잡힙니다. `system-ram`으로 바꿔야 커널이 hot-add해 NUMA 노드가 생깁니다.

## mailbox가 응답하지 않을 때

디바이스 상태를 물어보는 명령(`cxl health`, poison list 조회 등)이 멈춘다면 mailbox 층입니다.

명령마다 걸리는 시간이 크게 다르다는 점이 함정입니다. Identify는 즉시 돌아오지만 firmware update나 flash 계열은 수십 초가 걸립니다. 드라이버의 mailbox timeout이 짧게 잡혀 있으면 정상 동작 중인 명령을 timeout으로 죽입니다. 기본값은 2000 ms 이상을 씁니다.

## RAS 이벤트가 안 보일 때

CXL의 에러는 PCIe AER 경로를 타고 올라옵니다. 그래서 AER이 꺼져 있으면 *에러가 조용히 사라집니다*.

```bash
$ cat /proc/cmdline | grep -o 'pci=noaer'
```

`pci=noaer`는 다른 문제를 디버깅하다 넣어 두고 잊는 대표적인 옵션입니다. 이게 남아 있으면 CXL 디바이스가 media error를 내고 있어도 호스트는 모릅니다.

## Hot-remove 전에

디바이스를 뽑기 전에 region을 쓰는 워크로드를 먼저 정리합니다. hot-remove 중 region cleanup에는 시간이 걸리고, 그 사이 접근하는 프로세스는 SIGBUS를 받거나 최악의 경우 OOPS로 이어집니다.

```bash
$ umount /mnt/cxl-backed   # 있다면 먼저
$ cxl disable-region region0
$ cxl destroy-region region0
```

## 정리

- 층을 나눠 좁힙니다. PCI 열거 → 모듈 체인 → CXL 등록 → region → NUMA 순서로, 실패 지점의 *한 층 아래*를 의심합니다.
- `lspci`에 보여도 DVSEC가 없으면 커널은 CXL 경로를 타지 않습니다.
- `cxl_core`가 베이스입니다. 손으로 modprobe하면 순서를 맞춰야 합니다.
- region commit은 되돌릴 수 없습니다. `-EBUSY`는 앞선 시도가 절반 남아 있다는 뜻입니다.
- region이 있는데 NUMA 노드가 없으면 `daxctl reconfigure-device -m system-ram`이 빠진 것입니다.
- mailbox timeout은 2000 ms 이상. firmware 계열 명령은 수십 초가 정상입니다.
- `pci=noaer`가 남아 있으면 RAS 이벤트가 통째로 사라집니다.

다음 편은 Modern Embedded Recipes 시리즈의 *Part 12 (Edge AI·IoT)* 영역으로 이어집니다.

## 관련 항목

- [Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Ch 150: QEMU CXL Type 3 디바이스 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
- [CXL 4.0 Internals Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver) — 각 층의 커널 코드가 실제로 하는 일
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Kernel Debugging Ch 9: drivers/cxl 코드 분석](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)
- [Bootloader Internals Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
