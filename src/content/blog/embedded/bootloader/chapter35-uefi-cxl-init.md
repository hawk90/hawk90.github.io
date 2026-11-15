---
title: "EFI·UEFI에서 CXL 초기화 — CEDT 인계와 HDM Decoder 설정의 경계"
slug: "embedded/bootloader/chapter35-uefi-cxl-init"
date: 2026-06-19T09:02:00
description: "CXL firmware가 인계하는 CEDT의 CHBS·CFMWS 정보와 HDM decoder·region의 runtime 설정을 구분하고, QEMU와 Linux guest에서 확인할 범위를 정리합니다."
series: "Bootloader Internals"
seriesOrder: 35
tags: [embedded, bootloader, uefi, edk2, cxl, cedt, acpi, hdm-decoder]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

CXL 메모리를 쓰려면 펌웨어가 넘기는 *지도*와 OS가 하는 *배선*이 둘 다 필요합니다. 지도는 ACPI CEDT입니다. CHBS가 host bridge 레지스터 위치를, CFMWS가 host physical address window를 알립니다. 배선은 HDM decoder를 host bridge부터 endpoint까지 차례로 프로그래밍하고 commit하는 일입니다. QEMU arm/virt + EDK2 + Debian 13(Linux 6.12)에서 실제로 해 보면 지도는 108바이트로 정확히 도착합니다. 그런데 arm64 커널은 마지막 commit에서 "Failed to synchronize CPU cache state"를 내고 region을 켜지 않습니다.

[Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서는 U-Boot이 같은 CXL 장치를 아예 찾지 못했고, ECAM을 손으로 읽어 256 MiB Range와 64 KiB BAR를 확인했습니다. 이 장은 같은 토폴로지를 UEFI·ACPI 경로로 부팅해 Linux가 무엇을 받고 무엇을 직접 하는지 따라갑니다.

## 실험 환경

| 항목 | 값 |
| --- | --- |
| QEMU | 11.1.3, `-M virt,gic-version=3,cxl=on -m 4g,maxmem=8g,slots=4 -cpu max -smp 4` |
| 펌웨어 | QEMU에 포함된 `edk2-aarch64-code.fd` (DMI: `edk2-stable202408-prebuilt.qemu.org`) |
| CXL 토폴로지 | QEMU 문서 arm/virt 예제: `pxb-cxl` bus 12, `cxl-rp`, 256 MiB volatile `cxl-type3`, `cxl-fmw.0.size=4G` |
| 게스트 | Debian 13 nocloud arm64 이미지, 커널 `6.12.116+deb13-arm64` |
| 비교용 소스 | Linux v6.12, QEMU v11.1.0 |

QEMU 에뮬레이션이므로 link training·신호·실장치 보안은 다루지 않습니다. 이 글의 출력은 모두 위 구성에서 받았습니다.

## UEFI 경로에서 바뀌는 것

U-Boot은 [Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 `pxb-cxl`을 host bridge class 장치로만 보고 그 아래 bus 12·13을 훑지 않았습니다. 같은 QEMU 구성을 EDK2로 부팅하면 Linux는 ACPI에서 CXL host bridge(`ACPI0016`)를 받고, 그 아래를 직접 열거합니다.

```text
[    0.484469] acpi ACPI0016:00: _OSC: OS supports [CXL11PortRegAccess CXL20PortDevRegAccess CXLProtocolErrorReporting CXLNativeHot]
[    0.487809] acpi ACPI0016:00: _OSC: OS now controls [CXLMemErrorReporting]
[    0.803472] pci 0000:0c:00.0: [8086:7075] type 01 class 0x060400 PCIe Root Port
[    0.828242] pci 0000:0d:00.0: [8086:0d93] type 00 class 0x050210 PCIe Endpoint
[    0.828509] pci 0000:0d:00.0: BAR 0 [mem 0x10200000-0x1020ffff 64bit]
[    0.828644] pci 0000:0d:00.0: BAR 2 [mem 0x10210000-0x10210fff 64bit]
[    0.828779] pci 0000:0d:00.0: BAR 4 [mem 0x10211000-0x10211fff]
...
[   13.926929]  pci0000:0c: host supports CXL
[   14.022995] cxl_pci 0000:0d:00.0: enabling device (0000 -> 0002)
```

Ch 34에서 ECAM으로 재 본 BAR 크기 64 KiB·4 KiB·4 KiB가 커널 로그의 BAR 범위와 같습니다. 게스트의 ACPI 테이블 목록은 다음과 같습니다.

```text
# ls /sys/firmware/acpi/tables/
APIC  CEDT  DBG2  DSDT	FACP  GTDT  IORT  MCFG	PPTT  SPCR  SRAT  data	dynamic
```

CEDT와 SRAT는 있고 HMAT와 SLIT는 없습니다. 커널 로그의 테이블 헤더는 OEM ID `BOCHS`·`BXPC`입니다.

```text
[    0.000000] ACPI: SRAT 0x000000013CB43198 0000C8 (v03 BOCHS  BXPC     00000001 BXPC 00000001)
[    0.000000] ACPI: CEDT 0x000000013CB43698 00006C (v01 BOCHS  BXPC     00000001 BXPC 00000001)
```

이 CEDT는 EDK2의 CXL 드라이버가 만든 것이 아닙니다. QEMU v11.1.0의 `hw/arm/virt-acpi-build.c`가 `cxl=on`일 때 `cxl_build_cedt()`(`hw/acpi/cxl.c`)를 호출해 직접 만들고, EDK2는 QEMU가 넘긴 테이블을 설치합니다. 실제 플랫폼에서는 이 역할을 펌웨어가 맡습니다. 그래서 CEDT의 내용이 플랫폼 펌웨어의 계약이 됩니다.

## CEDT 108바이트 읽기

`/sys/firmware/acpi/tables/CEDT`를 그대로 덤프했습니다.

```text
# od -A x -t x1 -v /sys/firmware/acpi/tables/CEDT
000000 43 45 44 54 6c 00 00 00 01 30 42 4f 43 48 53 20
000010 42 58 50 43 20 20 20 20 01 00 00 00 42 58 50 43
000020 01 00 00 00 00 00 20 00 0c 00 00 00 01 00 00 00
000030 00 00 00 00 00 00 00 04 40 00 00 00 00 00 01 00
000040 00 00 00 00 01 00 28 00 00 00 00 00 00 00 00 00
000050 00 01 00 00 00 00 00 00 01 00 00 00 00 00 00 00
000060 00 00 00 00 2f 00 00 00 0c 00 00 00
00006c
```

처음 36바이트(0x00–0x23)는 ACPI 공통 헤더입니다. 서명 `CEDT`, 길이 0x6c, revision 1입니다. 그 뒤에 구조 두 개가 이어집니다. 필드 순서는 QEMU의 `cedt_build_chbs()`·`cedt_build_cfmws()`와 Linux v6.12 `include/acpi/actbl1.h`의 `struct acpi_cedt_chbs`·`acpi_cedt_cfmws`로 맞춰 읽었습니다. 모든 값은 little-endian입니다.

**CHBS (0x24–0x43, type 0, 32바이트)**

| offset | 필드 | 값 | 뜻 |
| --- | --- | --- | --- |
| 0x28 | UID | 0x0000000c | host bridge `_UID` = 12. QEMU는 `pxb-cxl`의 `bus_nr`를 씁니다 |
| 0x2c | CXL Version | 0x00000001 | `ACPI_CEDT_CHBS_VERSION_CXL20` (CXL 2.0, component register 위치) |
| 0x34 | Base | 0x0000004004000000 | host bridge component register 주소 |
| 0x3c | Length | 0x0000000000010000 | 64 KiB |

**CFMWS (0x44–0x6b, type 1, 40바이트)**

| offset | 필드 | 값 | 뜻 |
| --- | --- | --- | --- |
| 0x4c | Base HPA | 0x0000010000000000 | 1 TiB 지점 |
| 0x54 | Window Size | 0x0000000100000000 | 4 GiB (`cxl-fmw.0.size=4G`) |
| 0x5c | Interleave Ways (encoded) | 0 | 1-way |
| 0x60 | Interleave Granularity (encoded) | 0 | 256 B |
| 0x64 | Restrictions | 0x002f | bit 0·1·2·3·5 |
| 0x66 | QTG ID | 0 | |
| 0x68 | Target[0] | 0x0000000c | 위 CHBS의 UID 12 |

Restrictions 0x2f를 Linux 커널 문서의 비트 정의로 풀면 bit 0(Type 2)·1(Type 3)·2(volatile)·3(persistent)이 켜져 있고 bit 4(Fixed Config)는 꺼져 있습니다. bit 5는 Linux v6.12 `actbl1.h`의 `ACPI_CEDT_CFMWS_RESTRICT_*`에 정의가 없는 비트입니다. QEMU는 이 필드를 0x2f 상수로 씁니다. 커널은 이 값을 root decoder 속성으로 옮겨 둡니다.

```text
== /sys/bus/cxl/devices/decoder0.0
devtype=cxl_decoder_root
start=0x10000000000
size=0x100000000
interleave_ways=1
interleave_granularity=256
target_list=12
locked=0
cap_type2=1
cap_type3=1
cap_ram=1
cap_pmem=1
```

`locked=0`은 bit 4가 꺼진 결과입니다. `/proc/iomem`에도 window가 잡힙니다.

```text
10000000000-100ffffffff : CXL Window 0
```

이 구조에 *없는* 것도 확인해 둘 만합니다. CHBS는 UID·version·레지스터 주소만, CFMWS는 window·interleave·허용 용도·target만 담습니다. endpoint 장치 목록이나 용량, 장치 인증 상태를 담는 필드는 없습니다. 장치가 256 MiB라는 정보는 [Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 본 장치 자신의 DVSEC Range에 있고, 커널은 그것을 `mem0/ram/size=0x10000000`으로 보여 줍니다.

## 부팅 직후 decoder 상태 — 펌웨어는 배선하지 않았다

커널이 만든 CXL 객체는 root·port·endpoint 세 층입니다.

```text
# ls /sys/bus/cxl/devices/
decoder0.0  decoder1.0	decoder2.0  decoder2.1	decoder2.2  decoder2.3	endpoint2  mem0  nvdimm-bridge0  port1	root0
```

| 객체 | 정체 | 부팅 직후 |
| --- | --- | --- |
| decoder0.0 | root decoder, CFMWS 하나에 대응 | start 1 TiB, size 4 GiB (CEDT 값) |
| decoder1.0 | port1(host bridge)의 HDM decoder | start 0, size 0 |
| decoder2.0–2.3 | endpoint2(Type 3 장치)의 HDM decoder 4개 | start 0, size 0, `mode=none` |
| mem0 | memory device | `ram/size=0x10000000` |

endpoint decoder가 4개인 것은 DVSEC의 HDM_Count(1)가 아니라 component register 안 HDM decoder capability의 개수입니다. QEMU v11.1.0의 `CXL_HDM_DECODER_COUNT`가 4이고, Linux `cxl/core/hdm.c`는 이 capability에서 `decoder_count`를 읽습니다. 두 port 모두 `decoders_committed`가 0입니다. 이 구성의 펌웨어는 HDM decoder를 하나도 프로그래밍하지 않았습니다.

Linux의 CXL BIOS/EFI 문서도 "Programming of HDM decoders and switch ports is not required"라고 적습니다. 펌웨어가 미리 decoder를 설정하고 잠그는 플랫폼도 있지만, 이 구성은 그렇지 않습니다. 나머지는 OS가 맡습니다.

## OS가 배선하기 — sysfs로 region 만들기

`cxl` CLI 없이 Linux v6.12 `Documentation/ABI/testing/sysfs-bus-cxl`에 적힌 순서대로 sysfs에 직접 썼습니다.

```bash title="create-ram-region.sh"
D=/sys/bus/cxl/devices
R=$(cat $D/decoder0.0/create_ram_region)      # region0
echo $R > $D/decoder0.0/create_ram_region
echo 1 > $D/region0/interleave_ways
echo 256 > $D/region0/interleave_granularity
echo 0x10000000 > $D/region0/size             # root decoder window에서 HPA 할당
echo ram > $D/decoder2.0/mode
echo 0x10000000 > $D/decoder2.0/dpa_size      # 장치 DPA 할당
echo decoder2.0 > $D/region0/target0
echo 1 > $D/region0/commit
```

마지막 줄 전까지는 모두 성공했습니다(`rc=0`).

```text
R=region0
rc=0
0x10000000000
0x10000000
ram
```

`region0/resource`가 0x10000000000, 즉 CFMWS window의 시작입니다. endpoint decoder는 DPA 0부터 256 MiB를 받았습니다(`dpa_resource=0x0`, `dpa_size=0x10000000`). 이 시점에 소프트웨어 상태로는 decoder 세 층이 모두 같은 범위를 가리킵니다.

```text
== decoder0.0 start=0x10000000000 size=0x100000000 locked=0
== decoder1.0 start=0x10000000000 size=0x10000000 locked=0
== decoder2.0 start=0x10000000000 size=0x10000000 locked=0
```

`/proc/iomem`에도 region이 window 안에 생깁니다.

```text
10000000000-100ffffffff : CXL Window 0
  10000000000-1000fffffff : region0
```

## arm64에서 commit이 거부되다

`commit`에 1을 쓰자 커널이 경고를 내고 쓰기를 거부했습니다.

```text
[   28.765188] cxl region0: Failed to synchronize CPU cache state
[   28.765547] WARNING: CPU: 1 PID: 581 at drivers/cxl/core/region.c:235 cxl_region_invalidate_memregion.isra.0+0x3c/0x58
...
[   28.769673]  cxl_region_invalidate_memregion.isra.0+0x3c/0x58
[   28.769879]  commit_store+0xc8/0x100
...
-bash: echo: write error: No such device or address
```

`decoders_committed`는 두 port 모두 여전히 0이고, `/sys/bus/dax/devices/`는 비어 있으며, node 1의 `MemTotal`은 0 kB입니다. HPA는 할당됐지만 하드웨어 decoder는 하나도 켜지지 않았습니다.

원인은 Linux v6.12 `drivers/cxl/core/region.c`에 있습니다.

```c
static int cxl_region_invalidate_memregion(struct cxl_region *cxlr)
{
	if (!cpu_cache_has_invalidate_memregion()) {
		if (IS_ENABLED(CONFIG_CXL_REGION_INVALIDATION_TEST)) {
			dev_info_once(
				&cxlr->dev,
				"Bypassing cpu_cache_invalidate_memregion() for testing!\n");
			return 0;
		} else {
			dev_WARN(&cxlr->dev,
				 "Failed to synchronize CPU cache state\n");
			return -ENXIO;
		}
	}

	cpu_cache_invalidate_memregion(IORES_DESC_CXL);
	return 0;
}
```

region을 새로 켜면 같은 HPA에 남아 있을 수 있는 CPU cache line을 무효화해야 합니다. 이 수단은 `mm/Kconfig`의 `ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`으로 표시됩니다. v6.12에서 `arch/x86/Kconfig`는 이 심볼을 select하지만 `arch/arm64/Kconfig`에는 이 심볼이 없습니다. 우회 옵션 `CONFIG_CXL_REGION_INVALIDATION_TEST`의 Kconfig 도움말은 이 옵션이 데이터 무결성 안전장치를 끈다고 설명합니다. Debian 커널은 이 옵션을 켜지 않았습니다.

```text
CONFIG_CXL_REGION=y
# CONFIG_CXL_REGION_INVALIDATION_TEST is not set
CONFIG_DEV_DAX_CXL=m
CONFIG_DEV_DAX_KMEM=m
```

이 결과는 펌웨어 설계 선택으로 이어집니다. Linux 6.12 arm64에서는 OS가 sysfs로 region을 새로 commit하는 경로가 막혀 있습니다. 같은 파일에서 펌웨어가 이미 commit한 decoder를 발견해 region을 조립하는 경로는 다릅니다. target 설정이 성공하면 "in the autodiscovery case then the region is already committed"라는 주석과 함께 상태를 `CXL_CONFIG_COMMIT`으로 바로 바꾸고, `commit_store()`의 cache 무효화 단계를 거치지 않습니다. 그래서 arm64에서는 펌웨어의 사전 commit이 사실상 남은 경로입니다. 이 실험은 사전 commit 펌웨어를 쓰지 않았으므로 그 경로는 소스로만 확인했습니다. 조합(arm64, 6.12)이 바뀌면 결론도 다시 확인해야 합니다.

## SRAT와 NUMA node

같은 부팅의 SRAT 로그입니다.

```text
[    0.000000] ACPI: SRAT: Node 0 PXM 0 [mem 0x40000000-0x13fffffff]
[    0.000000] ACPI: SRAT: Node 0 PXM 0 [mem 0x140000000-0x33fffffff] hotplug
```

SRAT는 DRAM 4 GiB와 `maxmem`용 hotplug 범위만 기술하고, 1 TiB의 CXL window는 기술하지 않습니다. 그런데 게스트에서 online node는 `0-1`입니다. Linux v6.12 `drivers/acpi/numa/srat.c`의 `acpi_parse_cfmws()`는 SRAT가 다루지 않은 CFMWS 범위마다 새 proximity domain을 만들어 node를 붙입니다("No SRAT description. Create a new node."). node 1이 그것이고, commit이 실패했으므로 메모리는 0 kB입니다. node·tier가 정해지는 과정은 [Ch 36](/blog/embedded/bootloader/chapter36-boot-memory-topology)에서 이어서 봅니다.

## 증상별로 나누어 보기

| 관찰 | 이 구성에서의 예 | 다음 확인 |
| --- | --- | --- |
| PCI 장치만 있고 `/sys/bus/cxl` 객체가 없음 | U-Boot 경로(Ch 34) | ACPI0016 host bridge·CEDT 존재, `cxl_acpi` 로드 |
| `CXL Window`는 있으나 region 없음 | 부팅 직후 상태 | 펌웨어 사전 commit 여부(`decoders_committed`), OS region 생성 |
| region 생성 중 `commit` ENXIO | arm64 6.12의 cache invalidate 부재 | `ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`, 펌웨어 사전 commit |
| node는 있는데 MemTotal 0 | node 1 | region commit·dax 장치·kmem online |
| Restrictions에 모르는 비트 | 0x2f의 bit 5 | 사용하는 커널의 `actbl1.h` 정의 |

## 정리

- 이 구성의 CEDT는 QEMU가 만들어 EDK2가 설치합니다. CHBS 32바이트와 CFMWS 40바이트에는 host bridge UID·레지스터 위치·HPA window·interleave·용도 비트만 있습니다.
- 커널은 CFMWS를 root decoder로 옮깁니다(1 TiB, 4 GiB, target 12). 장치 용량은 장치의 DVSEC에서 읽습니다.
- 펌웨어는 HDM decoder를 프로그래밍하지 않았습니다. Linux 문서도 그것을 요구하지 않습니다.
- sysfs로 region을 만드는 데까지는 성공했지만, arm64 Linux 6.12는 CPU cache 무효화 수단이 없어 commit을 ENXIO로 거부했습니다.
- SRAT가 기술하지 않은 CFMWS에도 커널이 NUMA node를 만들며, commit 전까지 그 node의 메모리는 0입니다.

## 다음 편

[Ch 36: 부트 시 메모리 토폴로지 결정](/blog/embedded/bootloader/chapter36-boot-memory-topology)에서 SRAT·HMAT·SLIT과 Linux의 NUMA·tier·zone 결정 주체를 나눠 살펴봅니다.

## 근거 자료

- Linux v6.12 소스: `include/acpi/actbl1.h`(CEDT 구조와 `ACPI_CEDT_CFMWS_RESTRICT_*`), `drivers/cxl/core/region.c`(`cxl_region_invalidate_memregion`, `commit_store`, autodiscovery 경로), `drivers/cxl/core/hdm.c`, `drivers/cxl/Kconfig`(`CXL_REGION_INVALIDATION_TEST`), `drivers/acpi/numa/srat.c`(`acpi_parse_cfmws`), `mm/Kconfig`·`arch/x86/Kconfig`·`arch/arm64/Kconfig`, `Documentation/ABI/testing/sysfs-bus-cxl`.
- QEMU v11.1.0 소스: `hw/acpi/cxl.c`(`cxl_build_cedt`, `cedt_build_chbs`, `cedt_build_cfmws`), `hw/arm/virt-acpi-build.c`, `include/hw/cxl/cxl_component.h`(`CXL_HDM_DECODER_COUNT`), `docs/system/devices/cxl.rst`.
- [Linux CXL CEDT](https://docs.kernel.org/driver-api/cxl/platform/acpi/cedt.html): CHBS·CFMWS와 Restrictions 비트.
- [Linux CXL BIOS/EFI Configuration](https://docs.kernel.org/driver-api/cxl/platform/bios-and-efi.html): 펌웨어의 decoder 사전 프로그래밍이 필수가 아니라는 경계.
- [QEMU CXL 문서](https://www.qemu.org/docs/master/system/devices/cxl.html): arm/virt 예제 토폴로지.

## 관련 항목

- [Ch 18: U-Boot의 EFI 호환](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [Ch 36: 부트 시 메모리 토폴로지](/blog/embedded/bootloader/chapter36-boot-memory-topology)
- [Embedded Security: SPDM과 CMA](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Modern Embedded Recipes: QEMU CXL Type 3 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
