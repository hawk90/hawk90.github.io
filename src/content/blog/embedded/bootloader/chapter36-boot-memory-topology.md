---
title: "부트 시 메모리 토폴로지 — Firmware 정보와 Linux NUMA·Tier·Zone의 경계"
slug: "embedded/bootloader/chapter36-boot-memory-topology"
date: 2026-06-19T09:03:00
description: "SRAT·HMAT·SLIT·CEDT가 기술하는 정보와 Linux의 NUMA node·memory tier·RAM online·zone 정책을 구분하고, 주소 충돌과 발견 단계별 진단을 살펴봅니다."
series: "Bootloader Internals"
seriesOrder: 36
tags: [embedded, bootloader, memory-topology, srat, hmat, numa, cxl-mem, tiered-memory]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

펌웨어는 메모리 토폴로지를 ACPI 테이블 세 개로 넘깁니다. SRAT는 "어느 주소가 어느 proximity domain인가", SLIT는 "domain 사이 상대 거리", HMAT는 "initiator에서 target까지의 latency·bandwidth"입니다. Linux는 이것을 NUMA node, `distance`, memory tier로 바꿉니다. QEMU로 두 node를 만들어 보면, SLIT 거리 40만으로는 두 node가 같은 tier에 남습니다. HMAT에 300 ns·5 GB/s를 넣어야 메모리 전용 node가 tier4에서 tier54로 떨어지고 demotion 대상이 됩니다. zone은 이 테이블과 상관없이 주소로 정해지고, SRAT의 hotplug 범위는 커널에 ACPI memory hotplug 드라이버가 없으면 쓰이지 않습니다.

[Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)·[Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서는 CXL window가 node 1이 되고도 0 kB로 남는 것까지 봤습니다. 이 장은 CXL을 빼고, 펌웨어 테이블 하나하나가 커널의 어느 결정으로 이어지는지 확인합니다.

## 실험 환경

| 항목 | 값 |
| --- | --- |
| QEMU | 11.1.3, `-M virt,gic-version=3,hmat=on -cpu max -smp 4 -m 4g,maxmem=8g,slots=4` |
| NUMA | node 0: CPU 0–3 + 2 GiB, node 1: 메모리 전용 2 GiB (`-numa node,...,initiator=0`) |
| SLIT | `-numa dist,src=0,dst=1,val=40` |
| HMAT | initiator 0 → node 0: 100 ns, 20 GB/s / → node 1: 300 ns, 5 GB/s (`-numa hmat-lb`) |
| 비교 부팅 | 같은 구성에서 `hmat=on`과 `hmat-lb`·`initiator`만 제거 |
| 펌웨어·게스트 | `edk2-aarch64-code.fd`, Debian 13 arm64, 커널 `6.12.116+deb13-arm64` |

HMAT의 숫자는 측정값이 아니라 QEMU 옵션으로 넣은 값입니다. 실제 플랫폼에서도 사정은 같아서, Linux v6.12 `Documentation/admin-guide/mm/numaperf.rst`는 이 값이 "correspond to the rated latency and bandwidth for the platform"이라고 적습니다. 펌웨어가 정한 정격값이고 애플리케이션의 실측이 아닙니다.

## 펌웨어가 넘긴 테이블

```text
# ls /sys/firmware/acpi/tables/
APIC  DBG2  DSDT  FACP	GTDT  HMAT  IORT  MCFG	PPTT  SLIT  SPCR  SRAT	data  dynamic
```

부팅 초기 로그에 세 테이블의 해석이 나옵니다.

```text
[    0.000000] ACPI: SRAT 0x00000000BCB43198 0000F0 (v03 BOCHS  BXPC     00000001 BXPC 00000001)
[    0.000000] ACPI: SLIT 0x00000000BCB43A18 000030 (v01 BOCHS  BXPC     00000001 BXPC 00000001)
[    0.000000] ACPI: HMAT 0x00000000BCB43718 0000D8 (v02 BOCHS  BXPC     00000001 BXPC 00000001)
[    0.000000] ACPI: SRAT: Node 0 PXM 0 [mem 0x40000000-0xbfffffff]
[    0.000000] ACPI: SRAT: Node 1 PXM 1 [mem 0xc0000000-0x13fffffff]
[    0.000000] ACPI: SRAT: Node 1 PXM 1 [mem 0x140000000-0x33fffffff] hotplug
[    0.000000] NUMA: Initialized distance table, cnt=2
...
[    0.000000] ACPI: NUMA: SRAT: PXM 0 -> MPIDR 0x0 -> Node 0
[    0.000000] ACPI: NUMA: SRAT: PXM 0 -> MPIDR 0x1 -> Node 0
[    0.000000] ACPI: NUMA: SRAT: PXM 0 -> MPIDR 0x2 -> Node 0
[    0.000000] ACPI: NUMA: SRAT: PXM 0 -> MPIDR 0x3 -> Node 0
[    0.000000] Fallback order for Node 0: 0 1 
[    0.000000] Fallback order for Node 1: 1 0 
...
[    0.824863] acpi/hmat: Memory Flags:0001 Processor Domain:0 Memory Domain:0
[    0.825263] acpi/hmat: Memory Flags:0001 Processor Domain:0 Memory Domain:1
[    0.825589] acpi/hmat: Locality: Flags:00 Type:Access Latency Initiator Domains:1 Target Domains:2 Base:100000
[    0.826041] acpi/hmat:   Initiator-Target[0-0]:100 nsec
[    0.826319] acpi/hmat:   Initiator-Target[0-1]:300 nsec
[    0.826570] acpi/hmat: Locality: Flags:00 Type:Access Bandwidth Initiator Domains:1 Target Domains:2 Base:1024
[    0.826955] acpi/hmat:   Initiator-Target[0-0]:20480 MB/s
[    0.827094] acpi/hmat:   Initiator-Target[0-1]:5120 MB/s
...
[    2.497729] Demotion targets for Node 0: preferred: 1, fallback: 1
[    2.497901] Demotion targets for Node 1: null
```

아래에서 이 로그를 테이블별로 나눠 읽습니다.

## SRAT — 주소와 CPU를 node에 묶는다

SRAT의 Memory Affinity는 주소 범위를, GICC Affinity는 CPU(MPIDR)를 proximity domain(PXM)에 묶습니다. 커널은 PXM을 Linux node 번호로 바꿉니다. 이 구성에서는 PXM 0 → node 0, PXM 1 → node 1로 같지만, 번호가 같다는 보장은 없습니다. [Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서는 SRAT에 없는 CFMWS 범위에 커널이 새 PXM을 만들어 node 1을 붙였습니다.

결과는 sysfs의 node 상태에 그대로 나옵니다.

```text
# cat /sys/devices/system/node/online /sys/devices/system/node/has_cpu /sys/devices/system/node/has_memory
0-1
0
0-1
node0 distance: 10 40 cpulist=0-3
Node 0 MemTotal:        2023332 kB
node1 distance: 40 10 cpulist=
Node 1 MemTotal:        1987852 kB
```

node 1은 CPU 없이 메모리만 있는 node입니다. 세 번째 SRAT 줄의 `hotplug` 범위 0x140000000–0x33fffffff는 8 GiB입니다. QEMU v11.1.0 `hw/arm/virt.c`는 device memory 크기를 `maxram_size - ram_size + ram_slots * GiB`, 즉 (8 − 4) + 4 × 1 = 8 GiB로 잡고 RAM 바로 뒤에 둡니다. `hw/arm/virt-acpi-build.c`의 `build_srat()`는 이 영역 전체를 마지막 node(`num_nodes - 1`), 즉 node 1의 hotplug 가능 범위로 SRAT에 적습니다. 이 범위가 실제로 쓰이는지는 뒤의 hotplug 절에서 봅니다.

## SLIT — 거리는 fallback 순서에 쓰인다

SLIT의 40은 `distance` 파일에 그대로 나옵니다(자기 자신은 10). 커널은 이 거리로 page 할당의 fallback 순서를 정합니다. node 0은 0 → 1, node 1은 1 → 0입니다.

SLIT가 하지 *않는* 일도 비교 부팅으로 확인했습니다. HMAT만 빼고 같은 SLIT로 부팅하면 이렇게 됩니다.

```text
# ls /sys/firmware/acpi/tables/
APIC  DBG2  DSDT  FACP	GTDT  IORT  MCFG  PPTT	SLIT  SPCR  SRAT	data	dynamic
[    1.478049] Demotion targets for Node 0: null
[    1.478178] Demotion targets for Node 1: null
/sys/devices/virtual/memory_tiering/memory_tier4 nodelist=0-1
40 10
```

거리는 여전히 40이지만 두 node가 모두 `memory_tier4`에 있고 demotion 대상도 없습니다. Linux 6.12에서 memory tier를 나누는 것은 SLIT가 아니라 성능 정보입니다.

## HMAT — 성능 정보가 tier를 만든다

HMAT가 있는 부팅에서는 node마다 `access0`·`access1` 디렉터리가 생기고, 값은 HMAT 로그와 같습니다.

```text
/sys/devices/system/node/node0/access0/initiators/read_bandwidth=20480
/sys/devices/system/node/node0/access0/initiators/read_latency=100
/sys/devices/system/node/node1/access0/initiators/read_bandwidth=5120
/sys/devices/system/node/node1/access0/initiators/read_latency=300
```

(write 값은 read와 같고, `access1`도 같은 값이라 생략)

`numaperf.rst`에 따르면 access class 0은 target에 가장 성능이 좋은 initiator와의 관계이고, access class 1은 같은 형식에 CPU initiator만 넣은 것입니다. 이 구성은 initiator가 CPU node 0 하나라서 두 class가 같습니다. 단위는 bandwidth가 MiB/s, latency가 ns입니다. QEMU에 넣은 `20G`가 20480으로 나옵니다.

memory tier는 이렇게 나뉘었습니다.

```text
/sys/devices/virtual/memory_tiering/memory_tier4 nodelist=0
/sys/devices/virtual/memory_tiering/memory_tier54 nodelist=1
```

tier 번호는 Linux v6.12 `mm/memory-tiers.c`의 계산 그대로입니다. 먼저 메모리와 CPU를 함께 가진 node가 기본 DRAM이 됩니다(`default_dram_nodes`는 `N_MEMORY`와 `N_CPU`의 교집합). `drivers/acpi/numa/hmat.c`의 `hmat_set_default_dram_perf()`가 node 0의 HMAT 값을 기준 성능으로 등록합니다. 다른 node의 abstract distance는 `mt_perf_to_adistance()`가 기준 대비 latency에 비례하고 bandwidth에 반비례하도록 계산합니다.

```c
	*adist = MEMTIER_ADISTANCE_DRAM *
		(perf->read_latency + perf->write_latency) /
		(default_dram_perf.read_latency + default_dram_perf.write_latency) *
		(default_dram_perf.read_bandwidth + default_dram_perf.write_bandwidth) /
		(perf->read_bandwidth + perf->write_bandwidth);
```

`include/linux/memory-tiers.h`에서 `MEMTIER_CHUNK_BITS`는 7이고 `MEMTIER_ADISTANCE_DRAM`은 4 × 128 + 64 = 576입니다. tier id는 abstract distance를 7비트 오른쪽으로 민 값입니다.

| node | abstract distance | tier id |
| --- | --- | --- |
| 0 (기본 DRAM) | 576 | 576 >> 7 = 4 |
| 1 | 576 × 600 / 200 × 40960 / 10240 = 6912 | 6912 >> 7 = 54 |

계산 결과가 sysfs의 `memory_tier4`·`memory_tier54`와 같습니다. tier가 둘로 나뉘자 부팅 로그에 "Demotion targets for Node 0: preferred: 1"이 나옵니다. 내려보낼 곳이 정해졌다는 뜻일 뿐, 실제로 reclaim이 page를 옮기지는 않습니다. 이 게스트의 `/sys/kernel/mm/numa/demotion_enabled`는 `false`였습니다. 펌웨어가 HMAT를 넘겨도 demotion을 켜는 것은 운영 정책입니다. tier 번호 4와 54는 계산 결과일 뿐 "DRAM = 0, CXL = 1" 같은 고정 라벨이 아닙니다. 같은 커널에서도 HMAT 값이 달라지면 번호가 바뀝니다.

## Zone은 주소로 정해진다

같은 부팅의 zone 범위입니다.

```text
[    0.000000] Zone ranges:
[    0.000000]   DMA      [mem 0x0000000040000000-0x00000000ffffffff]
[    0.000000]   Normal   [mem 0x0000000100000000-0x000000013fffffff]
[    0.000000] Movable zone start for each node
[    0.000000] Initmem setup node 0 [mem 0x0000000040000000-0x00000000bfffffff]
[    0.000000] Initmem setup node 1 [mem 0x00000000c0000000-0x000000013fffffff]
```

이 구성에서 arm64의 ZONE_DMA는 4 GiB 아래 전체입니다. 그래서 node 0의 2 GiB는 전부 DMA zone이고, 0xc0000000에서 시작하는 node 1은 DMA 1 GiB와 Normal 1 GiB로 나뉩니다. `/proc/zoneinfo`의 `present` 값이 그렇습니다(4 KiB page 기준).

```text
Node 0, zone      DMA
        present  524288
Node 0, zone   Normal
        present  0
Node 1, zone      DMA
        present  262144
Node 1, zone   Normal
        present  262144
Node 1, zone  Movable
        present  0
```

(DMA32·Device zone과 `managed` 줄 생략)

node 1이 느린 tier라는 사실은 zone에 반영되지 않습니다. 펌웨어 테이블에는 zone을 지정하는 필드가 없고, ZONE_MOVABLE도 비어 있습니다. ZONE_MOVABLE은 부팅 인자나 memory online 정책으로 커널이 정합니다.

## SRAT의 hotplug 범위는 드라이버가 있어야 쓰인다

새로 online되는 메모리 block의 zone 정책을 보려고 hotplug를 시도했습니다. 먼저 커널 설정과 기본 정책을 확인합니다.

```text
online
8000000
CONFIG_MEMORY_HOTPLUG=y
CONFIG_MHP_DEFAULT_ONLINE_TYPE_ONLINE_AUTO=y
CONFIG_MEMORY_HOTREMOVE=y
```

첫 줄은 `auto_online_blocks`, 둘째 줄은 block 크기 0x8000000(128 MiB)입니다. 기본 메모리 4 GiB는 128 MiB block 32개(`memory` 디렉터리 32개)입니다. `auto_online_blocks`를 `online_movable`로 바꾼 뒤 QEMU monitor에서 1 GiB DIMM을 node 1에 꽂았습니다.

```text
(qemu) info memory-devices
Memory device [dimm]: "dimm0"
  addr: 0x140000000
  slot: 0
  node: 1
  size: 1073741824
  memdev: /objects/hp0
  hotplugged: true
  hotpluggable: true
```

QEMU는 SRAT hotplug 범위의 시작 0x140000000에 DIMM을 놓았습니다. 그런데 게스트에서는 아무 일도 일어나지 않았습니다. 5초 뒤에도 `free -m`과 node 1의 `MemTotal`이 그대로였고, memory block은 32개, `/proc/iomem`의 마지막 System RAM은 `c0000000-13fffffff`였습니다. ACPI 장치 목록에는 메모리 장치 `PNP0C80:00`–`03` 4개가 있지만, 이 장치를 처리할 드라이버가 Debian 커널에 없습니다.

```text
# CONFIG_ACPI_HOTPLUG_MEMORY is not set
```

Linux v6.12 `drivers/acpi/Kconfig`의 도움말은 이 드라이버가 "fields notifications on ACPI memory devices (PNP0C80)"라고 설명합니다. 드라이버가 없으면 펌웨어가 보낸 hotplug 알림을 받을 곳이 없습니다. SRAT가 hotplug 범위를 기술하고 QEMU가 DIMM을 꽂아도, 그 메모리는 커널 설정 하나 때문에 쓰이지 않습니다. 이 결과는 Debian 13 arm64 커널의 설정이고, 다른 배포판이나 아키텍처 설정은 따로 확인해야 합니다.

## 결정 주체 정리

| 결정 | 입력 | 커널에서 정하는 곳 | 이 실험의 결과 |
| --- | --- | --- | --- |
| 주소·CPU → node | SRAT | `drivers/acpi/numa/srat.c` (CFMWS는 `acpi_parse_cfmws`) | node 0(CPU+2 GiB), node 1(메모리 전용) |
| 할당 fallback 순서 | SLIT | `mm/page_alloc.c`의 `build_zonelists`·`find_next_best_node` | 0→1, 1→0 |
| memory tier·demotion 대상 | HMAT | `hmat.c` → `memory-tiers.c` | HMAT 있음: tier4/tier54, 대상 0→1. 없음: 둘 다 tier4 |
| demotion 실행 | 운영 정책 | `demotion_enabled` | `false` |
| zone | 주소, 부팅 인자, online 정책 | arm64 zone 경계, memory hotplug | node 1 = DMA 1 GiB + Normal 1 GiB, Movable 0 |
| 메모리 추가 | SRAT hotplug 범위 + ACPI 알림 | `ACPI_HOTPLUG_MEMORY` 드라이버 | 드라이버 없음, 1 GiB DIMM 무시 |

## 증상별로 나누어 보기

| 관찰 | 이 실험에서의 예 | 다음 확인 |
| --- | --- | --- |
| 느린 메모리가 기본 tier에 섞임 | HMAT 없는 비교 부팅 | `/sys/firmware/acpi/tables/HMAT` 존재, `access0` 디렉터리, 커널 HMAT 로그 |
| SLIT 거리는 큰데 demotion이 없음 | 같은 비교 부팅 | memory tier 목록, "Demotion targets" 로그 |
| tier 번호가 예상과 다름 | tier54 | HMAT 값과 기본 DRAM node의 성능, `mt_perf_to_adistance` 계산 |
| 메모리 전용 node의 page가 DMA zone에 있음 | node 1 | 아키텍처의 zone 경계(`Zone ranges` 로그) |
| 꽂은 메모리가 보이지 않음 | 1 GiB DIMM | `CONFIG_ACPI_HOTPLUG_MEMORY`, `PNP0C80` 장치, memory block 수 |
| node는 있는데 MemTotal 0 | Ch 35의 CXL node 1 | region commit·dax·online |

## 정리

- SRAT는 주소와 CPU를 node에 묶습니다. 메모리 전용 node도 생기며, PXM과 node 번호가 같다는 보장은 없습니다.
- SLIT 거리는 `distance`와 fallback 순서에 쓰입니다. Linux 6.12에서 memory tier를 나누지는 않습니다.
- HMAT의 정격 latency·bandwidth가 abstract distance가 되고, 그 값을 7비트 민 것이 tier 번호입니다. 300 ns·5 GB/s node는 tier54, demotion 대상이 됐습니다. 실제 demotion은 `demotion_enabled`가 켜져야 일어납니다.
- zone은 주소로 정해집니다. 느린 node라도 4 GiB 아래면 DMA zone입니다.
- SRAT의 hotplug 범위와 QEMU DIMM이 있어도 `ACPI_HOTPLUG_MEMORY`가 없는 커널은 그 메모리를 쓰지 않습니다.

## 다음 편

[Ch 37: UEFI Secure Boot 인증서 만료](/blog/embedded/bootloader/chapter37-secureboot-cert-rollover)에서 firmware가 인계하는 하드웨어 정보와 별개로, 부팅 이미지의 신뢰를 갱신하는 PK·KEK·db·dbx 체계를 살펴봅니다.

## 근거 자료

- Linux v6.12 소스: `mm/memory-tiers.c`(`default_dram_nodes`, `mt_perf_to_adistance`, `dump_demotion_targets`), `include/linux/memory-tiers.h`(`MEMTIER_CHUNK_BITS`, `MEMTIER_ADISTANCE_DRAM`), `drivers/acpi/numa/hmat.c`(`hmat_set_default_dram_perf`), `drivers/acpi/numa/srat.c`, `drivers/acpi/Kconfig`(`ACPI_HOTPLUG_MEMORY`).
- Linux v6.12 `Documentation/admin-guide/mm/numaperf.rst`: access class, 단위, 정격값.
- [ACPI 6.5 §5](https://uefi.org/specs/ACPI/6.5/05_ACPI_Software_Programming_Model.html): SRAT·SLIT·HMAT 구조.
- [Linux Memory Hot(Un)Plug](https://docs.kernel.org/admin-guide/mm/memory-hotplug.html): `auto_online_blocks`와 online 정책.
- Linux v6.12 `mm/page_alloc.c`(`build_zonelists`, `find_next_best_node`).
- QEMU v11.1.0 `hw/arm/virt.c`(device memory 크기), `hw/arm/virt-acpi-build.c`(SRAT·SLIT·HMAT 생성), `-numa node`·`dist`·`hmat-lb` 옵션.

## 관련 항목

- [Ch 9: DDR Controller와 PHY Training](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [Ch 37: UEFI Secure Boot 인증서 만료](/blog/embedded/bootloader/chapter37-secureboot-cert-rollover)
- [Embedded Performance Engineering: CXL.mem 지연·대역폭](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
