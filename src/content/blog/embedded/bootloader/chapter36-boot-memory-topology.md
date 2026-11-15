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

firmware의 메모리 기술과 Linux의 메모리 사용 정책은 서로 연결되지만 같은 결정은 아닙니다. **주소 범위·NUMA affinity·접근 성능·memory online·zone·page placement를 따로 확인**해야 CXL 장치는 보이는데 RAM은 늘지 않는 상황을 설명할 수 있습니다.

[Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)의 PCI 발견과 [Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)의 firmware 인계 다음에는 OS가 이를 어떻게 해석했는지 확인해야 합니다. 이 글은 ACPI 기반 Linux의 경계를 설명하며, 특정 서버·BIOS의 측정 결과나 모든 제품에 공통인 초기화 순서를 제시하지 않습니다.

## 메모리 종류와 Host Physical Address

서버가 DDR·HBM·CXL.mem·persistent memory를 모두 갖는 것은 아닙니다. GPU의 HBM도 항상 CPU의 일반 System RAM과 같은 주소·allocator 계약으로 노출되지는 않습니다. 장치 이름 대신 실제 접근 주체와 사용 mode를 먼저 확인합니다.

| 종류 | 확인할 조건 |
| --- | --- |
| DDR DIMM | controller 초기화·주소 map·예약 영역 |
| CPU에 연결된 HBM | 제품의 flat/cache mode와 OS 노출 방식 |
| GPU HBM | GPU 주소 공간·driver와 CPU 접근 계약 |
| CXL.mem | host window·decoder 경로·capacity·region·driver |
| persistent capacity | persistence domain·region mode·사용 인터페이스 |

capacity와 latency·bandwidth는 다른 지표입니다. 칩 이름만으로 고정 ns·GB/s를 부여하지 않으며, CPU의 큰 cache를 HBM 용량으로 세지 않습니다. 성능 비교에는 topology·읽기/쓰기·부하·측정 경계를 명시해야 합니다.

## 부트로더·Firmware와 커널의 책임

| 단계 | 책임·확인 대상 |
| --- | --- |
| 메모리 초기화 | board/firmware가 필요한 controller·training·주소 map을 준비 |
| firmware 기술 | memory map·ACPI 또는 DT가 실제 하드웨어와 일치 |
| OS 초기 발견 | 예약 영역·proximity domain·NUMA 정보 해석 |
| CXL driver 구성 | port·decoder·region·DAX 등의 상태 |
| RAM 사용 | memory block online과 zone 정책 |
| 실행 중 배치 | allocator·NUMA balancing·명시적 migration 등의 정책 |

모든 CXL decoder를 부팅 전에 설정해야 한다는 조건은 없습니다. firmware가 구성한 RAM 경로와 driver가 나중에 구성한 메모리 경로를 구분해야 초기 allocator에 들어간 용량과 runtime에 추가된 용량을 설명할 수 있습니다.

## SRAT — Proximity Domain과 Affinity

SRAT는 processor·memory range 등의 proximity domain 정보를 기술합니다. Linux는 이를 NUMA node 구성에 활용하지만 **proximity domain 번호와 Linux node 번호가 항상 같다고 보장하지는 않습니다.** memory-only node도 가능합니다.

Memory Affinity는 메모리 범위의 affinity를 나타냅니다. Generic Initiator Affinity는 접근을 시작하는 주체를 기술하는 별도 구조이므로 CXL.mem target 용량을 그 구조로 대체 등록한다고 설명하면 안 됩니다. CEDT와 SRAT의 관계와 누락 시 처리도 kernel 버전을 확인해야 합니다.

Linux CXL early-boot 문서는 v6.15 기준으로 SRAT에 없는 CFMWS 범위에 가상 proximity domain을 만들 수 있다고 설명합니다. 따라서 “SRAT가 없으면 CXL node가 절대로 없다”는 진단은 성립하지 않습니다. 실제 kernel의 초기 발견 결과를 확인해야 합니다.

## HMAT — 접근 성능 정보

HMAT는 메모리 proximity domain의 속성과 initiator→target의 latency·bandwidth, memory-side cache 정보 등을 기술합니다. SRAT와 연결해서 해석해야 하며 성능 정보가 곧 현재 애플리케이션의 실측값은 아닙니다. firmware가 제공한 단위·행렬·유효성을 해당 ACPI revision으로 확인합니다.

Linux CXL 문서는 HMAT/CDAT의 성능 정보가 access coordinates를 통해 memory-tier 구성에 전달되는 경로를 설명합니다. 실제 반영은 kernel 버전·driver·config와 정보 제공 여부에 달려 있습니다. HMAT bandwidth 하나만으로 모든 노드의 tier가 정해진다고 단정하지 않습니다.

## SLIT — 상대 거리

SLIT는 locality 사이의 상대 거리를 기술합니다. local 값 10을 기준으로 해석하지만, 21은 항상 cross-socket이고 50~80은 CXL이라는 표준 등급은 없습니다. 값 자체를 ns로 바꾸거나 링크 종류를 역추정해서는 안 됩니다.

아래는 **규격 의미를 설명하기 위해 만든 작은 행렬**이며 제품 출력이 아닙니다. diagonal의 10과 서로 다른 locality의 상대 거리만 보여 줍니다.

| 출발→도착 | Domain A | Domain B | Domain C |
| --- | ---: | ---: | ---: |
| A | 10 | 21 | 40 |
| B | 21 | 10 | 50 |
| C | 40 | 50 | 10 |

실제 page 배치에는 거리 외에도 task·memory policy·가용 용량·접근 패턴·kernel 설정이 관여합니다. 거리 값만 보고 CXL의 hot/cold 상태나 promotion 성공을 결론내릴 수 없습니다.

## Memory Map·Zone·DAX 구분

EFI memory type과 Linux zone은 다른 분류입니다. firmware가 ZONE_MOVABLE을 직접 지정하는 것이 아니라 Linux가 memory online 경로와 설정으로 zone을 선택합니다. Device DAX도 EFI memory type의 동의어가 아닙니다.

| 분류 | 확인할 의미 |
| --- | --- |
| firmware memory map | OS가 사용할 수 있는 주소·예약 영역·속성 |
| CXL region | decoder 경로와 capacity를 묶은 메모리 범위 |
| Device DAX | page allocator와 다른 device 접근 mode |
| System RAM | kernel page allocator에 제공할 메모리 |
| ZONE_NORMAL / ZONE_MOVABLE | online한 RAM에 대한 Linux allocation 정책 |

Linux CXL memory-hotplug 문서에서는 build config·boot parameter·auto_online_blocks에 따라 offline·ZONE_NORMAL·ZONE_MOVABLE 경로가 달라집니다. ZONE_MOVABLE은 제거 가능성을 높이지만 offlining 성공을 보장하지 않습니다. region 생성과 memory online을 한 단계로 취급하면 안 됩니다.

## 작은 예제 — 메모리 Leaf 범위 충돌 검사

주소 검토에서는 CFMWS 같은 **상위 window**가 실제 region을 포함하는 것과 두 개의 **독립된 leaf 자원**이 겹치는 것을 구분해야 합니다. 다음은 후자만 다루는 64-bit 범위 산술 예제이며 ACPI·EFI parser나 유효성 검사기 전체가 아닙니다. 입력 범위는 끝 주소를 포함하지 않습니다.

```js title="memory-leaves.mjs"
export function validateMemoryLeaves(leaves) {
  const limit = 1n << 64n;
  const ranges = leaves.map(({base, size}) => {
    if (typeof base !== 'bigint' || typeof size !== 'bigint' ||
        base < 0n || size <= 0n || base + size > limit)
      throw new RangeError('invalid leaf range');
    return {base, end: base + size};
  }).sort((a, b) => a.base < b.base ? -1 : a.base > b.base ? 1 : 0);
  for (let i = 1; i < ranges.length; ++i)
    if (ranges[i].base < ranges[i - 1].end)
      throw new RangeError('overlapping leaves');
  return ranges;
}
```

base 0x100000000·size 0x80000000과, base 0x180000000·동일 size는 각각 2 GiB인 인접 범위입니다. 후자의 base를 0x17FFFFFFF로 바꾸면 1 byte가 겹쳐 거부합니다. container window·reserved subrange를 같은 leaf 배열에 섞으면 잘못 판정할 수 있으므로 실제 자원 관계를 먼저 분류합니다.

## Linux에서 상태를 순서대로 확인하기

다음은 대응하는 Linux 환경에서 사용하는 **읽기용 수집 예제**입니다. sysfs 속성·CLI 유무는 해당 kernel과 도구에 달려 있습니다. 여기서는 명령을 실행한 결과를 제시하지 않습니다.

```bash title="memory-topology-read.sh"
uname -a
cat /proc/cmdline
numactl --hardware
cat /proc/iomem
ls /sys/bus/cxl/devices/
ls /sys/bus/dax/devices/
cat /sys/devices/system/memory/auto_online_blocks
for node in /sys/devices/system/node/node[0-9]*; do
    test -d "$node" || continue
    printf '%s\n' "$node"
    cat "$node/distance"
done
for tier in /sys/devices/virtual/memory_tiering/memory_tier*; do
    test -d "$tier" || continue
    printf '%s\n' "$tier"
    cat "$tier/nodelist"
done
```

memory_tier의 끝 번호를 0=DDR·1=CXL이라는 고정 라벨로 해석하지 않습니다. node list를 실제 성능 정보와 대응시켜야 합니다. HMAT가 없는 경우에도 default tier나 다른 성능 정보가 있을 수 있으므로 디렉터리 유무만으로 원인을 결정하지 않습니다.

DAMON의 감시, DAMOS의 action, NUMA balancing 등은 별도로 설정과 지원 여부를 조사합니다. firmware table이 존재한다는 사실만으로 cold page가 자동 이동했다는 증거가 되지는 않습니다.

## Boot 시점과 Runtime의 경계

SRAT 같은 초기 table이나 platform 설정을 고친 뒤에는 재부팅이 필요할 수 있습니다. 반면 region 구성·memory online/offline·page placement까지 모두 boot 시점에 고정되는 것은 아닙니다. 조작 가능 여부는 사용 상태·lock·driver·hotplug 지원에 달려 있습니다.

CXL fabric의 pooling·dynamic capacity도 규격 이름만으로 공통 구현 순서가 정해지지는 않습니다. Fabric Manager·host software·device firmware의 조합과 지원 revision을 확인합니다. 이 장에서는 동적 fabric 동작을 검증하지 않았습니다.

## 실패 구간을 나누어 조사하기

| 관찰 | 다음 확인 |
| --- | --- |
| lspci에는 있으나 CXL object가 없음 | protocol·driver·ACPI·probe error |
| region은 있으나 RAM이 늘지 않음 | DAX mode·memory block·online 상태 |
| tier가 예상과 다름 | online memory·HMAT/CDAT·kernel로 전달된 성능 정보 |
| memory range가 사라짐 | memory map·예약·alignment·decoder 경로와 원시 로그 |
| offline 실패 | pin된 page·이동할 곳의 용량·zone과 실행 중인 이용자 |

증상만으로 BIOS bug라고 결정하지 않고 각 경계의 자료를 모읍니다. 진단 중 create-region이나 online/offline을 무조건 실행하면 사용 중인 메모리 상태를 바꾸게 됩니다. 먼저 읽기 결과를 보존하고 대상 범위를 확인합니다.

## 정리

- 메모리 종류의 이름과 CPU가 사용할 수 있는 System RAM은 다른 분류입니다.
- SRAT·HMAT·SLIT·CEDT와 firmware memory map은 서로 다른 정보를 담습니다.
- Linux의 NUMA·tier·zone·page placement는 각각 설정과 확인이 필요합니다.
- BAR 발견·region 생성·RAM online의 경계를 순서대로 관찰합니다.
- 가상의 distance·성능표를 실측 로그로 취급하지 않습니다.

## 다음 편

[Ch 37: UEFI Secure Boot 인증서 만료](/blog/embedded/bootloader/chapter37-secureboot-cert-rollover)에서 firmware가 인계하는 하드웨어 정보와 별개로, 부팅 이미지의 신뢰를 갱신하는 PK·KEK·db·dbx 체계를 살펴봅니다.

## 근거 자료

- [ACPI 6.5 §5](https://uefi.org/specs/ACPI/6.5/05_ACPI_Software_Programming_Model.html): SRAT·SLIT·HMAT 구조.
- [Linux CXL Early Boot](https://docs.kernel.org/driver-api/cxl/linux/early-boot.html): proximity domain·NUMA·memory tier.
- [Linux CXL Memory Hotplug](https://docs.kernel.org/driver-api/cxl/linux/memory-hotplug.html): online·zone·driver-managed memory.
- [Linux Memory Hot(Un)Plug](https://docs.kernel.org/admin-guide/mm/memory-hotplug.html): zone·online/offline과 실패 조건.

## 관련 항목

- [Ch 9: DDR Controller와 PHY Training](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [Ch 37: UEFI Secure Boot 인증서 만료](/blog/embedded/bootloader/chapter37-secureboot-cert-rollover)
- [Embedded Performance Engineering: CXL.mem 지연·대역폭](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
