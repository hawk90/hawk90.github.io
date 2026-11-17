---
title: "Linux CXL 드라이버 분석 — cxl_pci·cxl_core·region·DAX"
slug: "embedded/modern-recipes/part11-17-linux-cxl-driver"
date: 2026-06-18T09:03:00
description: "CXL 디바이스가 메모리로 안 올라올 때 모듈 체인·sysfs·mailbox 중 어디서 끊겼는지 좁혀 가는 절차."
series: "Modern Embedded Recipes"
seriesOrder: 152
tags: [recipes, linux, cxl, kernel-driver, dax, sysfs]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Linux CXL 드라이버는 *cxl_core* 위에 *cxl_port·cxl_acpi·cxl_pmem·cxl_mem·cxl_pci*가 얹힌 모듈 묶음입니다."** 어느 한 모듈이 빠지면 그 층에서 객체가 생기지 않고, 에러 대신 *빈 sysfs*로 나타나기 쉽습니다.

## 이 레시피가 푸는 것

CXL 디바이스가 안 올라올 때 가장 곤란한 점은 *에러가 안 난다*는 것입니다. `lspci`에는 보이는데 `/sys/bus/cxl/devices/`가 비어 있거나, memdev는 있는데 `numactl --hardware`에 노드가 안 생기거나, region은 만들어졌는데 commit이 거부됩니다. 각 경우가 서로 다른 층에서 끊긴 것인데 증상만 보면 구분이 안 갑니다.

이 글은 그 층을 아래에서 위로 하나씩 짚어 *어디서 끊겼는지* 좁히는 절차입니다. 아래 출력은 [Ch 150](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)의 QEMU 11.1.3 Type 3 장치를 붙인 Debian 13 x86_64 guest(kernel 6.12.116, `cxl` 81)에서 얻었습니다. 각 층의 커널 코드가 실제로 무엇을 하는지는 [CXL 4.0 Internals Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 `cxl_pci_probe`부터 `cxl_region_attach`까지 따라갑니다.

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
0d:00.0 CXL [0502]: Intel Corporation Device [8086:0d93] (rev 01)
$ lspci -vvv -s 0d:00.0 | grep -A3 "Designated Vendor-Specific"
	Capabilities: [100 v1] Designated Vendor-Specific: Vendor=1e98 ID=0000 Rev=3 Len=60: CXL
		PCIe DVSEC for CXL Devices
		CXLCap:	Cache- IO+ Mem+ MemHWInit+ HDMCount 1 Viral-
```

`-s`에는 CXL 장치 자신의 주소를 줍니다. 이 구성에서 `0c:00.0`은 그 위의 CXL root port(`8086:7075`)이고, memory device는 `0d:00.0`입니다.

CXL 디바이스는 *DVSEC*(Designated Vendor-Specific Extended Capability)로 자신이 CXL임을 알립니다. `cxl_pci`는 CXL memory class code(0502)로 디바이스에 붙고, probe 중 CXL Device DVSEC을 찾습니다. DVSEC이 없으면 `Device DVSEC not present, skip CXL.mem init` 경고만 남기고 probe는 계속합니다(`drivers/cxl/pci.c`). 이 경고가 dmesg에 있으면 CXL.mem 초기화가 빠졌습니다.

## 2층 — 모듈 체인이 다 올라왔는가

CXL 모듈은 서로 의존하고, 펌웨어·ACPI 정보까지 갖춰져야 probe가 끝까지 갑니다. 모듈을 손으로 순서대로 올리기보다 module dependency와 플랫폼 상태를 먼저 봅니다.

```bash
$ lsmod | grep -E '^cxl' | awk '{print $1}'
cxl_acpi
cxl_mem
cxl_pci
cxl_pmem
```

`cxl_core`와 `cxl_port`가 목록에 없다고 빠진 것은 아닙니다. Debian 6.12 커널은 `CONFIG_CXL_BUS=y`, `CONFIG_CXL_PORT=y`로 둘을 built-in으로 넣어 `lsmod`에 나오지 않습니다. 커널 설정(`/boot/config-*`)으로 확인합니다.

`drivers/cxl/Makefile`이 built-in 순서를 이렇게 적습니다. `core`가 먼저, 다음 `port`(CXL root port를 바로 enable하려고 `acpi`보다 앞), `acpi`, `pmem`·`mem`(endpoint 드라이버보다 앞), 마지막이 `pci`(하드웨어 열거 계층과 같은 순서)입니다. `cxl_core`는 공통 기능을 제공하고 나머지 드라이버가 이를 사용합니다. 정상적인 시스템에서는 CEDT와 필요한 장치가 있으면 `modprobe cxl_acpi` 또는 udev/module autoload로 의존성이 처리됩니다. `cxl_mem not found`가 나오면 모듈 순서보다 kernel config, 장치 타입, firmware table을 먼저 봅니다.

`cxl_acpi`가 안 올라온다면 펌웨어 쪽을 봅니다. CEDT 테이블이 없으면 root port를 등록할 근거가 없습니다.

```bash
$ ls /sys/firmware/acpi/tables/CEDT
```

## 3층 — CXL 서브시스템에 등록됐는가

모듈이 다 올라왔는데 아래가 비어 있다면 probe가 중간에 멈춘 것입니다.

```bash
$ ls /sys/bus/cxl/devices/
decoder0.0  decoder1.0  decoder2.0  decoder2.1  decoder2.2  decoder2.3  endpoint2  mem0  nvdimm-bridge0  port1  root0

$ dmesg | grep -i cxl | tail -20
```

`mem0`은 있는데 decoder가 없는 식으로 *일부만* 등록될 수 있습니다. 실제로 region을 commit한 뒤 guest만 warm reboot하자 `endpoint2`와 `decoder2.*`가 사라졌고, dmesg에는 다음이 남았습니다.

```text
cxl_pci 0000:0d:00.0: Range register decodes outside platform defined CXL ranges.
cxl_mem mem0: endpoint2 failed probe
```

장치(QEMU 모델)가 이전 boot의 range register 값을 그대로 들고 있었기 때문으로, QEMU를 완전히 내렸다 다시 띄우자 정상으로 돌아왔습니다. probe가 어느 단계에서 멈췄는지는 ftrace로 잡습니다.

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

# endpoint decoder에 DPA를 먼저 잡음
$ echo ram        > /sys/bus/cxl/devices/decoder2.0/mode
$ echo 0x10000000 > /sys/bus/cxl/devices/decoder2.0/dpa_size

# interleave 설정 → size → target(endpoint decoder 이름) → commit → driver bind
$ echo 1          > /sys/bus/cxl/devices/region0/interleave_ways
$ echo 256        > /sys/bus/cxl/devices/region0/interleave_granularity
$ echo 0x10000000 > /sys/bus/cxl/devices/region0/size
$ echo decoder2.0 > /sys/bus/cxl/devices/region0/target0
$ echo 1          > /sys/bus/cxl/devices/region0/commit
$ echo region0    > /sys/bus/cxl/drivers/cxl_region/bind
```

각 write를 하나씩 해 본 결과입니다.

| write | 결과 |
|-------|------|
| interleave 설정 전에 `size` | `No such device or address` |
| `echo 256M > size` | `Invalid argument` |
| `echo 0x10000000 > size`(interleave 뒤) | 성공 |
| `echo mem0 > target0` | `Invalid argument` |
| `echo decoder2.0 > target0` | 성공 |
| `commit` 1 → 0 → 1 | `commit`이 1, 0, 1로 바뀜 |
| `cxl_region` bind | `dax0.0`이 생기고 node 1(256 MB)이 나타남 |

`size`와 `dpa_size`는 `kstrtou64`·`kstrtoull`로 읽으므로(`drivers/cxl/core/region.c`, `port.c`) `256M` 같은 접미사를 받지 않아 `echo 256M > size`는 실패합니다. `targetN`에는 memdev 이름이 아니라 *endpoint decoder* 이름을 쓰고, 그 decoder에는 위처럼 DPA를 먼저 잡아야 합니다. commit만 해서는 메모리가 생기지 않고, region을 `cxl_region` driver에 bind해야 dax device가 만들어집니다. `cxl create-region`은 이 모든 단계를 대신 합니다.

**commit은 되돌릴 수 있습니다.** `commit`에 0을 쓰면 decoder reset이 예약되고 region이 내려갑니다. 플랫폼이 잠근(locked) region만 `-EPERM`으로 거부합니다(`drivers/cxl/core/region.c`의 `commit_store`).

가상 machine guest에서는 commit이 `No such device or address`(`-ENXIO`)로 거부될 수 있습니다. dmesg의 `Failed to synchronize CPU cache state`가 그 표시이고, guest가 CPU cache를 무효화할 수 없을 때 `cxl_region_invalidate_memregion()`이 돌려주는 값입니다(x86은 hypervisor CPUID bit가 있으면 불가). 해결은 [Ch 150](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)에 있습니다.

commit이 `-EBUSY`로 거부되면 decoder를 spec이 정한 순서(마지막으로 commit된 decoder id + 1)대로 commit하지 않았거나, 그 memdev에서 sanitize가 진행 중입니다(`drivers/cxl/core/hdm.c`의 `cxl_decoder_commit`). 이미 enable된 decoder는 `-EBUSY`가 아니라 그대로 성공 처리됩니다.

## 5층 — NUMA 노드로 올라오는가

region까지 됐는데 `numactl`에 안 보인다면 대개 DAX 모드 전환이 빠진 것입니다.

```bash
$ daxctl list
$ daxctl reconfigure-device dax0.0 -m system-ram
$ numactl --hardware
```

`devdax` 모드는 `/dev/dax0.0` 문자 디바이스로만 보이고 일반 메모리로는 안 잡힙니다. `system-ram`으로 바꿔야 커널이 hot-add해 NUMA 노드가 생깁니다.

반대로 커널이 이미 online해 둔 경우도 있습니다. 위 guest는 `auto_online_blocks`가 `online`(`CONFIG_MHP_DEFAULT_ONLINE_TYPE_ONLINE_AUTO=y`)이라 region을 만들자마자 `dax0.0`이 `"mode":"system-ram"`, `"movable":false`로 올라왔고, `daxctl reconfigure-device`는 `kernel policy will auto-online memory, aborting`으로 거부됐습니다. `daxctl list`의 `mode`를 먼저 봅니다.

## mailbox가 응답하지 않을 때

디바이스 상태를 물어보는 명령(`cxl list -H`의 health 정보, poison list 조회 등)이 멈춘다면 mailbox 층입니다. 이 글의 QEMU 장치에서 `cxl list -H -m mem0`은 멈추지 않았지만 health 항목도 없이 `memdev`·`ram_size`·`serial`·`host`·`firmware_version`만 돌려줬습니다.

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

위의 auto-online guest에서는 이 순서가 통하지 않았습니다. 메모리가 `movable:false`로 online돼 있어 `cxl disable-region`이 dax device를 offline하지 못했습니다.

```text
libdaxctl: offline_one_memblock: dax0.0: Failed to offline /sys/devices/system/node/node1/memory338/state: Device or resource busy
cxl region: cmd_disable_region: disabled 0 regions
cxl region: destroy_region: region0 active. Disable it or use --force
```

나중에 내릴 메모리라면 처음부터 movable로 online되도록 커널의 기본 online 정책을 정해 둡니다. 이 실행에서는 non-movable로 올라간 메모리를 내리지 못했습니다.

## 정리

- 층을 나눠 좁힙니다. PCI 열거 → 모듈 체인 → CXL 등록 → region → NUMA 순서로, 실패 지점의 *한 층 아래*를 의심합니다.
- `lspci`에 보여도 CXL Device DVSEC이 없으면 `cxl_pci`가 경고를 남기고 CXL.mem 초기화를 건너뜁니다.
- `cxl_core`가 베이스이고, built-in 순서는 core → port → acpi → pmem/mem → pci입니다. built-in인 것은 `lsmod`에 나오지 않습니다.
- region commit은 되돌릴 수 있습니다(`commit`에 0, 실행으로 확인). `size`·`dpa_size`에는 `0x10000000` 같은 숫자를 쓰고, commit 뒤 `cxl_region` bind까지 해야 메모리가 생깁니다.
- `-EBUSY`는 순서가 어긋난 commit이나 진행 중인 sanitize, VM guest의 `-ENXIO`는 CPU cache 무효화 불가입니다.
- region이 있는데 NUMA 노드가 없으면 `daxctl reconfigure-device -m system-ram`이 빠진 것입니다. auto-online 커널에서는 이미 올라와 있고, 이 실행에서 non-movable로 올라간 메모리는 offline되지 않았습니다.
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
