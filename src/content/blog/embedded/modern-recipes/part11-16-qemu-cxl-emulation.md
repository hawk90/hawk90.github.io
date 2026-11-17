---
title: "QEMU CXL Type 3 디바이스 에뮬레이션 — 노트북에서 CXL 개발 환경 구축"
slug: "embedded/modern-recipes/part11-16-qemu-cxl-emulation"
date: 2026-06-18T09:02:00
description: "QEMU로 CXL Type 3 개발 환경을 세우는 레시피 — 한 번에 붙여넣는 실행 명령, 부팅 후 검증 순서, 처음 세울 때 걸리는 함정."
series: "Modern Embedded Recipes"
seriesOrder: 151
tags: [recipes, cxl, qemu, emulation, virtualization, type-3]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"실 CXL 카드 없이도 노트북에서 *CXL 드라이버·BIOS 개발*이 가능합니다."** QEMU가 Type 3 memory expander를 에뮬레이션합니다.

## 왜 에뮬레이션이 필요한가

[Ch 149](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)에서 CXL의 PHY·프로토콜을 봤습니다. 그런데 드라이버 prototype이나 BIOS의 CXL 초기화 코드를 손보려면 *디바이스가 실제로 있어야* 합니다. 실 Type 3 카드와 그것을 꽂을 CXL 지원 보드가 모두 필요합니다. 개발자 한 명이 책상 위에서 시작하기엔 문턱이 높습니다.

QEMU는 그 문턱을 없애 줍니다. Linux guest 입장에서는 `lspci`에도 잡히고 `/sys/bus/cxl/devices/`에도 등록되는 CXL 디바이스가 생깁니다. 대여한 장비를 반납할 걱정 없이 커널 모듈을 몇 번이고 다시 올렸다 내렸다 할 수 있는 셈입니다.

이 글의 명령은 macOS(Apple M2 Pro)의 QEMU 11.1.3에서 Debian 13 `generic-amd64` guest(kernel 6.12.116, `cxl` 81)로 끝까지 돌렸습니다. macOS에는 KVM이 없어 `-enable-kvm` 대신 TCG를 썼고, guest uptime 기준 27초쯤에 cloud-init까지 끝났습니다. arm64 guest(`-M virt,cxl=on`)로도 시험한 결과는 아래 함정 절에 적었습니다.

이 글은 *환경을 세우는 레시피*입니다. QEMU의 CXL 지원 범위와 내부 동작, CEDT 테이블 구조, 4.0 기능의 구현 현황은 [CXL 4.0 Internals Ch 12](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에서 다룹니다.

## 준비물

시작하기 전에 호스트 쪽 조건을 확인합니다. 여기서 하나라도 어긋나면 아래 명령이 실패합니다.

| 항목 | 최소 | 확인 명령 |
|------|------|----------|
| QEMU | `cxl-type3`의 `volatile-memdev=` 지원 | `qemu-system-x86_64 -device cxl-type3,help` |
| Guest 커널 | 6.3+ (`create_ram_region`) | guest에서 `uname -r` |
| Guest 커널 설정 | `CONFIG_CXL_BUS`·`CXL_PCI`·`CXL_ACPI`·`CXL_PMEM`·`CXL_MEM`·`CXL_PORT`·`CXL_REGION` | guest에서 `/boot/config-*` |
| CPU 가상화 | KVM이 있으면 빠름(없으면 TCG) | `ls /dev/kvm` |
| region commit | guest가 CPU cache를 invalidate할 수 있어야 함 | 아래 "region commit이 `No such device or address`" 참고 |
| 여유 디스크 | backing store 크기 + 여유 | `df -h .` |

Guest 커널 기준을 6.3으로 잡는 이유는 하나입니다. 이 레시피는 volatile(ram) region을 만드는데, 그 sysfs인 `create_ram_region`이 v6.3에 들어왔습니다(`Documentation/ABI/testing/sysfs-bus-cxl`). 커널 설정 목록은 QEMU CXL 문서가 Linux 5.18 기준으로 드는 것입니다.

## 한 번에 붙여넣는 실행

backing store 파일을 먼저 만들고, 그 파일을 CXL 디바이스의 volatile 메모리로 붙이는 순서입니다. 아래 블록을 실행하면 256 MB짜리 Type 3 expander 한 개가 달린 guest가 뜹니다.

```bash
# 1. backing store — CXL 디바이스의 메모리가 실제로 저장되는 파일
truncate -s 256M ./cxl-mem-backing

# 2. guest 실행
qemu-system-x86_64 \
    -machine q35,cxl=on \
    -m 8G,slots=8,maxmem=32G \
    -smp 4 -enable-kvm \
    -drive file=./guest.qcow2,if=none,id=hd0 \
    -device virtio-blk-pci,drive=hd0,bus=pcie.0 \
    \
    -object memory-backend-file,id=cxl-mem0,share=on,mem-path=./cxl-mem-backing,size=256M \
    \
    -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
    -device cxl-rp,port=0,bus=cxl.1,id=root_port0,chassis=0,slot=0 \
    -device cxl-type3,bus=root_port0,volatile-memdev=cxl-mem0,id=cxl-mem0-dev \
    \
    -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=512M
```

disk를 `-drive ...,if=virtio`로 붙이면 QEMU 11.1.3은 시작하자마자 멈춥니다. 자동으로 붙는 virtio 장치가 `pxb-cxl` bus로 가기 때문입니다.

```text
qemu-system-x86_64: -drive file=./overlay.qcow2,if=virtio: PCI: Only PCI/PCIe bridges can be plugged into pxb-cxl
```

그래서 disk와 NIC은 위처럼 `bus=pcie.0`을 명시한 `-device`로 붙입니다(NIC은 `-netdev user,id=n0 -device virtio-net-pci,netdev=n0,bus=pcie.0`).

디바이스 스택은 실 하드웨어의 계층을 그대로 흉내 냅니다. host bridge(`pxb-cxl`) 아래 root port(`cxl-rp`)가 있고 그 아래 endpoint(`cxl-type3`)가 붙는 구조입니다. `cxl-fmw`는 펌웨어가 잡아 주는 주소 창(CFMWS)에 해당하고, 여기서는 그 역할을 QEMU가 대신합니다.

`cxl-type3`의 옛 `memdev=` 속성은 deprecated이고 persistent 메모리로 취급되므로, ram region을 만들려면 `volatile-memdev=`를 씁니다(QEMU `docs/system/devices/cxl.rst`). FMW 크기는 256 MiB의 배수여야 하고(`hw/cxl/cxl-host.c`), 만들 region 전체가 그 창 안에 들어가야 합니다. 여기서는 디바이스를 하나 더 붙여 interleave를 시험할 여유를 두고 512M로 잡았습니다.

## 부팅 후 3분 검증

디바이스가 제대로 붙었는지는 아래 순서로 확인합니다. 위에서부터 하나씩 통과해야 다음 것이 의미가 있습니다.

```bash
# 커널 버전 (6.3 이상)
guest$ uname -r

# 모듈 로딩
guest$ modprobe cxl_acpi
guest$ modprobe cxl_pci

# PCIe 레벨에서 보이는가
guest$ lspci -nn -d 8086:0d93

# CXL 서브시스템에 등록됐는가
guest$ ls /sys/bus/cxl/devices/

# 토폴로지가 기대대로인가
guest$ cxl list -RT
```

실행 결과입니다.

```text
0d:00.0 CXL [0502]: Intel Corporation Device [8086:0d93] (rev 01)
cxl_acpi cxl_mem cxl_pci cxl_pmem
decoder0.0  decoder1.0  decoder2.0  decoder2.1  decoder2.2  decoder2.3  endpoint2  mem0  nvdimm-bridge0  port1  root0
```

`cxl list -RT`는 region이 아직 없으므로 `no matching devices found`와 빈 배열을 돌려줍니다. 여기까지 통과하면 환경은 완성입니다. 이제 메모리로 쓸 수 있게 region을 만들고 NUMA 노드로 올립니다.

```bash
guest$ cxl create-region -m -d decoder0.0 -t ram mem0
guest$ daxctl reconfigure-device dax0.0 -m system-ram

guest$ numactl --hardware
```

stock 커널 guest에서는 첫 줄이 이렇게 실패했습니다.

```text
cxl region: create_region: region0: failed to commit decode: No such device or address
cxl region: cmd_create_region: created 0 regions
```

dmesg에는 `cxl region0: Failed to synchronize CPU cache state`가 남습니다. `drivers/cxl/core/region.c`의 `cxl_region_invalidate_memregion()`은 `cpu_cache_has_invalidate_memregion()`이 거짓이면 `-ENXIO`를 돌려주는데, x86 구현(`arch/x86/mm/pat/set_memory.c`)은 `return !cpu_feature_enabled(X86_FEATURE_HYPERVISOR);`입니다. 즉 CPUID에 hypervisor bit가 있는 guest에서는 region을 commit할 수 없습니다. 길은 둘입니다.

- guest 커널을 `CONFIG_CXL_REGION_INVALIDATION_TEST=y`로 빌드합니다. Kconfig help는 이 option이 "for testing purposes" cache 무효화를 건너뛴다고 적습니다. Debian 6.12.116 커널은 이 option이 꺼져 있습니다.
- guest에 hypervisor bit를 숨깁니다. TCG에서 `-cpu max,-hypervisor`를 주자 아래처럼 끝까지 진행됐습니다. KVM에서 같은 방법이 통하는지는 확인하지 않았습니다.

```text
cxl region: cmd_create_region: created 1 region
  "region":"region0", "size":268435456, "type":"ram", "decode_state":"commit", "memdev":"mem0", "decoder":"decoder2.0"
daxctl list:  "chardev":"dax0.0", "size":268435456, "target_node":1, "mode":"system-ram", "online_memblocks":2
dax0.0: error: kernel policy will auto-online memory, aborting
node 1 cpus:
node 1 size: 256 MB
```

region을 만들자 커널이 dax device를 이미 `system-ram`으로 online해 두어, `daxctl reconfigure-device`는 "kernel policy will auto-online memory"로 거부됐습니다. 이 경우 그 명령은 필요 없습니다. `numactl`에 CPU 없는 node 1(256 MB)이 보이면 끝입니다. guest 안에서는 `cxl`·`daxctl`이 실 디바이스와 같은 sysfs 경로를 탑니다. QEMU의 Type 3 디바이스는 vendor 8086, device 0d93, class 0502로 보입니다(`hw/mem/cxl_type3.c`).

## 처음 세울 때 걸리는 함정

이 레시피가 실패하는 지점은 거의 정해져 있습니다. 증상만 보면 원인이 안 보이는 것들이라 미리 적어 둡니다.

| 증상 | 원인 | 고치는 법 |
|------|------|----------|
| `pxb-cxl devices cannot reside on a PCI bus` | `-machine pc`(i440fx)에 `pxb-cxl,bus=pci.0`. root bus가 PCIe가 아님(`bus=pcie.0`을 그대로 쓰면 `Bus 'pcie.0' not found`) | `-machine q35,cxl=on`으로 바꿉니다 |
| `CXL host bridges present, but cxl=off` | `-machine q35`에 `cxl=on`이 없음 | `-machine q35,cxl=on` |
| `Only PCI/PCIe bridges can be plugged into pxb-cxl` | `-drive ...,if=virtio`·`-nic` 같은 자동 배치 장치가 `pxb-cxl`로 감 | `-device ...,bus=pcie.0`으로 명시 |
| `failed to commit decode: No such device or address` | guest에 hypervisor bit가 있어 cache 무효화 불가 | `CONFIG_CXL_REGION_INVALIDATION_TEST=y` 또는(TCG) `-cpu max,-hypervisor` |
| ram region을 만들 수 없음 | `cxl-type3`에 `memdev=`를 씀. persistent로 취급됨 | `volatile-memdev=`로 바꿉니다 |
| `Size of a CXL fixed memory window must be a multiple of 256MiB` | `cxl-fmw.N.size`가 256 MiB 배수가 아님 | 256 MiB 배수로, 만들 region 전체가 들어가게 잡습니다 |
| ram region 생성 실패 | guest 커널에 `create_ram_region`이 없음(v6.3 미만) | guest 커널을 6.3 이상으로 올립니다 |
| `daxctl reconfigure-device`가 "kernel policy will auto-online memory" | 커널이 이미 online함 | 그 명령을 건너뜁니다 |

`Size of a CXL fixed memory window must be a multiple of 256MiB`와 `CXL host bridges present, but cxl=off`는 QEMU 11.1.3에서 직접 재현한 문구입니다.

arm64에서도 시험했습니다. QEMU 문서의 arm/virt 예(`-M virt,gic-version=3,cxl=on` + `pxb-cxl` + `cxl-rp` + `cxl-type3`)는 TCG(`-cpu max`)에서 Debian arm64 guest가 부팅해 `mem0`까지 등록됐지만, macOS의 HVF(`-accel hvf`)에서는 150초 동안 serial에 firmware 출력이 한 줄도 없었습니다(같은 image를 CXL 없이 HVF로 띄우면 16초 만에 login까지 갔습니다). region commit은 arm64 6.12 guest에서도 같은 `Failed to synchronize CPU cache state`로 실패했습니다. 그 커널 설정에는 `ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`이 없고, Linux 7.4-rc3의 `arch/arm64/Kconfig`는 이를 select합니다. 위의 x86 `cpu_cache_has_invalidate_memregion()` 본문도 7.4-rc3 소스에서 옮긴 것이고, 6.12 guest의 동작(hypervisor bit가 있으면 실패, 숨기면 성공)과 맞았습니다.

## 커널 모듈을 고쳐 가며 쓰기

드라이버 로직만 빠르게 반복하려면 QEMU 대신 커널 트리의 *cxl_test* mock 토폴로지를 씁니다. `tools/testing/cxl/`은 QEMU 디바이스와 별개로, CXL 모듈을 mock 함수와 함께 다시 빌드하고 `cxl_test` 모듈이 가짜 토폴로지를 만듭니다. ndctl의 CXL 테스트가 이걸 씁니다.

```bash
# ndctl README의 절차 (커널 소스 트리에서)
$ sudo make M=tools/testing/cxl modules_install
$ sudo make modules_install

# 테스트 토폴로지 올리기·내리기
$ sudo modprobe cxl_test
$ sudo modprobe -r cxl_test
```

실제 PCI 열거·CEDT·레지스터 경로를 보려면 QEMU, mock으로 드라이버 로직을 반복하려면 cxl_test가 맞습니다.

## 여기서 멈춰야 할 때

QEMU가 흉내 내지 못하는 영역이 있습니다. 아래에 해당하는 작업이라면 이 환경에서 나온 결과를 믿으면 안 됩니다.

- **성능 측정·튜닝** — latency 모델이 실제와 다릅니다.
- **PHY·signal integrity 디버깅** — 실 PCIe 링크가 없어 LTSSM 버그가 재현되지 않습니다.
- **Type 1·Type 2 accelerator 경로** — QEMU에 해당 디바이스 모델이 없습니다.
- **RAS 운영 시나리오** — 오류·poison은 QMP `cxl-inject-*`, Dynamic Capacity는 `cxl-add-dynamic-capacity`·`cxl-release-dynamic-capacity`로 *직접 주입*해야 생깁니다.

지원 범위 매트릭스, 정밀 시뮬레이터·FPGA와의 비교, CXL 4.0 기능의 QEMU 구현 현황은 [CXL 4.0 Internals Ch 12](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에 정리돼 있습니다.

## 정리

- `truncate`로 backing store를 만들고 `-machine q35,cxl=on`에 `pxb-cxl → cxl-rp → cxl-type3`를 쌓습니다. disk·NIC은 `bus=pcie.0`으로 명시해야 QEMU가 시작합니다.
- 가상 machine guest에서 region을 commit하려면 cache 무효화가 가능해야 합니다. 테스트용 커널 option을 켜거나, TCG에서 `-cpu max,-hypervisor`를 줘야 했습니다.
- volatile 메모리는 `volatile-memdev=`로 붙이고, FMW는 256 MiB 배수로 region 전체가 들어가게 잡습니다.
- 검증은 `lspci` → `/sys/bus/cxl/devices/` → `cxl list -RT` → `numactl --hardware` 순서로 위에서부터 통과시킵니다.
- 자주 걸리는 지점은 q35 미사용, `memdev=` 사용, FMW 크기, guest 커널 6.3 미만입니다.
- mock 토폴로지는 `tools/testing/cxl/`의 `cxl_test`로, `modprobe cxl_test`로 QEMU 없이 올립니다.

다음 편은 **Ch 151: Linux CXL 드라이버 분석** — `drivers/cxl/` 디렉터리의 코드를 진입점부터 sysfs까지 분해합니다.

## 관련 항목

- [Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver) (다음 편)
- [CXL 4.0 Internals Ch 12: QEMU CXL 에뮬레이션](/blog/embedded/hardware/cxl/chapter12-qemu-emulation) — 지원 범위·CEDT 구조·4.0 기능 현황
- [Bootloader Internals Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init) — CEDT 생성
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [QEMU CXL 문서](https://qemu.readthedocs.io/en/latest/system/devices/cxl.html)
