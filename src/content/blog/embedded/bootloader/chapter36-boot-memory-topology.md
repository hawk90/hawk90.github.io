---
title: "부트 시 메모리 토폴로지 결정 — DDR + CXL.mem 통합 인식"
date: 2026-06-19T09:03:00
description: "부트로더가 DDR DIMM·CXL.mem·HBM을 하나의 메모리 토폴로지로 통합하는 흐름 — SRAT·HMAT·SLIT 생성과 NUMA 노드 매핑."
series: "Bootloader Internals"
seriesOrder: 36
tags: [embedded, bootloader, memory-topology, srat, hmat, numa, cxl-mem, tiered-memory]
draft: false
---

## 한 줄 요약

> **"현세대 서버의 메모리는 *4가지 이상의 다른 영역*이 *하나의 SPA 공간*으로 통합됩니다."** — DDR DIMM·HBM·CXL.mem·Persistent memory가 *각각 다른 지연·대역폭·persistence*를 가지지만, 부트로더가 *SRAT·HMAT·SLIT을 정교하게 채워* 두면 *커널이 자동으로 tier 분류·NUMA 노드 매핑*을 합니다. 이게 *시리즈의 마무리*입니다.

[Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 *PCIe enumeration*, [Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서 *UEFI의 CEDT 생성*을 봤습니다. 이 마지막 장은 *전체 메모리 토폴로지*가 *어떻게 통합 인식*되는지를 정리하면서 *Bootloader Internals 시리즈를 마무리*합니다.

## 메모리 토폴로지의 4가지 구성

현세대 서버는 *최소 4가지 메모리 영역*을 동시에 갖습니다.

| Tier | 대표 | 지연 | 대역폭 | persistence |
|------|------|------|--------|-------------|
| HBM on-package | Xeon Max·Genoa-X | 100~150 ns | 1 TB/s+ | volatile |
| DDR DIMM | per-socket | 80~120 ns | 80~100 GB/s | volatile |
| CXL.mem | per-card | 200~400 ns | 30~120 GB/s | volatile or persistent |
| Persistent memory | NVDIMM, CXL persistent | 100~300 ns | 5~20 GB/s | persistent |

부트로더의 책임은 *이 모든 영역을 식별*하고 *적절한 ACPI 테이블*에 *통합 표현*하는 것.

## 부트로더의 책임 분해

전체 흐름을 *부트로더가 담당하는 단계*로 나누면:

| 단계 | 작업 |
|------|------|
| 1 | DRAM controller 초기화 ([Ch 9](/blog/embedded/bootloader/chapter09-dram-init)) |
| 2 | DDR DIMM size·channel 검출 |
| 3 | HBM detected check (CPU의 on-package) |
| 4 | PCIe enumeration ([Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)) |
| 5 | CXL DVSEC scan ([Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)) |
| 6 | CXL HDM Decoder 프로그래밍 |
| 7 | Persistent memory firmware namespace 인식 |
| 8 | ACPI 테이블 (SRAT·HMAT·SLIT·MCFG·CEDT·NFIT) 생성 |
| 9 | Memory map E820/EFI 작성 |
| 10 | 커널 인계 |

각 단계가 *순서대로 정확*해야 *커널이 일관된 메모리 view*를 갖습니다.

## SRAT — System Resource Affinity Table

*SRAT*는 *NUMA 노드와 메모리·CPU의 affinity*를 정의합니다.

| 항목 | 내용 |
|------|------|
| Processor Local APIC/SAPIC Affinity | CPU와 노드 매핑 |
| Memory Affinity | memory range와 노드 매핑 |
| Processor Local x2APIC Affinity | x2APIC 환경 |
| GIC ITS Affinity | ARM GICv3 ITS |
| Generic Initiator Affinity | CXL device 등 |

CXL.mem은 *Generic Initiator Affinity* 또는 *Memory Affinity*로 등록되어 *별도 NUMA 노드*가 됩니다.

```text
[SRAT Memory Affinity 예시]

Affinity 0: range 0x0 ~ 0x80000000, proximity domain 0  (socket 0 DDR)
Affinity 1: range 0x80000000 ~ 0x100000000, proximity domain 1  (socket 1 DDR)
Affinity 2: range 0x100000000 ~ 0x180000000, proximity domain 2  (CXL.mem)
Affinity 3: range 0x180000000 ~ 0x200000000, proximity domain 3  (HBM on-package)
```

## HMAT — Heterogeneous Memory Attribute Table

*HMAT*은 *각 메모리 영역의 성능 특성*을 정의합니다. *Tiered memory의 핵심*.

| Subtable | 내용 |
|----------|------|
| Memory Subsystem Address Range Structure (MSARS) | 어느 SPA range가 어느 proximity domain |
| System Locality Latency·Bandwidth Information Structure (SLLBI) | initiator → target의 latency·bandwidth |
| Memory Side Cache Information Structure (MSCIS) | memory side cache (드물게 사용) |

핵심은 *SLLBI*. *읽기·쓰기·access pattern*별로 *latency·bandwidth*를 매트릭스 형태로 정의:

```text
[HMAT SLLBI 매트릭스 예시 — Read Latency (ns)]

           Target → DDR0  DDR1  CXL   HBM
Initiator
CPU0           100   140   240    90
CPU1           140   100   240   180
CXL device     240   240   180     —
```

*커널이 HMAT를 자동 파싱*해 *각 노드를 hot/cold tier*로 분류. *DAMON의 자동 promotion/demotion*이 *이 정보 기반*.

## SLIT — System Locality Information Table

*SLIT*는 *NUMA 노드 간 distance matrix*를 정의합니다.

| Distance | 의미 |
|----------|------|
| 10 | local (자기 노드) |
| 20~30 | same socket (UPI/NVLink 가까움) |
| 40~50 | cross-socket (UPI 1 hop) |
| 50~80 | CXL local |
| 100+ | CXL multi-hop |

```text
[SLIT distance 매트릭스 예시]

node:   0   1   2   3
  0:   10  21  50  17    # socket 0
  1:   21  10  50  35    # socket 1
  2:   50  50  10  60    # CXL.mem
  3:   17  35  60  10    # HBM on-package socket 0
```

이 distance가 *NUMA balancer의 page migration 결정*에 직접 사용됩니다.

## 메모리 분류 의사 결정

부트로더는 *각 메모리 영역을 어떤 ZONE으로 노출*할지 결정합니다.

| 분류 | 의미 | 적용 |
|------|------|------|
| Conventional / System RAM | 일반 kernel allocator | DDR, 일부 CXL |
| Movable Zone | hot-remove 가능 | CXL.mem (default) |
| Reserved | 부트로더·펌웨어 전용 | EFI Memory Map의 일부 |
| ACPI NVS | ACPI 데이터 영역 | 작음 |
| Persistent | NVDIMM·CXL persistent | mmap-only |
| Device DAX | byte-addressable, mmap-only | CXL DAX 모드 |

*CXL.mem을 Movable로 노출*하면 *hot-remove 가능*. *System RAM으로 노출*하면 *일반 메모리처럼 사용*하지만 *hot-remove 어려움*.

## Tiered Memory 자동 인식 흐름

부트 → 커널 → 운영의 *전체 흐름*:

| 단계 | 동작 |
|------|------|
| 1 | 부트로더가 SRAT·HMAT·SLIT 생성 |
| 2 | 커널이 NUMA 노드 등록 |
| 3 | 커널이 *HMAT bandwidth 기준*으로 *memory tier 자동 분류* |
| 4 | `/sys/devices/virtual/memory_tiering/`에 tier 정보 노출 |
| 5 | DAMON이 *tier 정보 활용*해 *promotion/demotion 결정* |
| 6 | NUMA balancing이 *추가 보조* |

운영 검증:

```bash
$ numactl --hardware
node distances:
node   0   1   2
  0:  10  21  50
  1:  21  10  50
  2:  50  50  10

$ dmesg | grep -i "hmat\|memory_tier"
ACPI: HMAT: Memory Latency: 100ns at node 0
ACPI: HMAT: Memory Latency: 240ns at node 2
memory_tier: assigned tier 0 (DDR) to node 0
memory_tier: assigned tier 0 (DDR) to node 1
memory_tier: assigned tier 1 (CXL) to node 2

$ ls /sys/devices/virtual/memory_tiering/
memory_tier0/  memory_tier1/

$ cat /sys/devices/virtual/memory_tiering/memory_tier0/nodelist
0,1
$ cat /sys/devices/virtual/memory_tiering/memory_tier1/nodelist
2
```

## 부트 시점 vs 런타임 결정

*무엇이 부트 시점*에 결정되고 *무엇이 런타임*인지 구분 중요:

| 항목 | 시점 |
|------|------|
| 메모리 size·position | 부트 |
| NUMA distance | 부트 |
| Tier 분류 | 부트 (HMAT 기반) + 런타임 (DAMON 보조) |
| Page placement | 런타임 (NUMA balance·DAMOS) |
| Hot-add CXL device | 런타임 |
| Region 생성·commit | firmware-managed면 부트, user면 런타임 |

*부트 시점 결정은 변경 불가*. 잘못 설정하면 reboot만이 답.

## CXL Fabric의 부트 인식 한계

CXL 3.0 fabric의 *동적 pooling*은 *부트 시점에 완전히 인식 불가*합니다.

부트로더는:
- *정적으로 할당된 영역*: SRAT·HMAT에 포함
- *동적 영역*: CFMWS에 *예약된 window*로 표시
- 런타임에는 *Fabric Manager가 OS에 hot-add 알림*

이 *2단계 발견 모델*이 *fabric의 표준 흐름*입니다.

## 실 운영 예 — Granite Rapids + Astera Leo

가상 시나리오 (현장 일반화):

```bash
# 부팅 후 numactl 출력
$ numactl --hardware
available: 3 nodes (0-2)
node 0 cpus: 0-63
node 0 size: 256000 MB     # socket 0 DDR
node 1 cpus: 64-127
node 1 size: 256000 MB     # socket 1 DDR
node 2 cpus:
node 2 size: 2097152 MB    # CXL.mem 2 TB
node distances:
node   0   1   2
  0:  10  21  60
  1:  21  10  60
  2:  60  60  10

# HMAT 확인
$ dmesg | grep -i hmat
ACPI: HMAT: Memory Latency: 100ns, Bandwidth: 96000MB/s at node 0
ACPI: HMAT: Memory Latency: 100ns, Bandwidth: 96000MB/s at node 1
ACPI: HMAT: Memory Latency: 280ns, Bandwidth: 56000MB/s at node 2  # CXL

# Memory tier 분류
$ cat /sys/devices/virtual/memory_tiering/memory_tier*/nodelist
0,1
2
```

*노드 2 (CXL)가 자동으로 tier 1*로 분류되어 *DAMON·NUMA balance*가 *cold page를 자동 이동*.

## 자주 하는 실수

### SRAT에 CXL.mem 누락

```text
[증상]
guest$ numactl --hardware
available: 2 nodes (0-1)   # CXL 노드 안 보임

# 그러나 lspci에는 디바이스 존재
guest$ lspci | grep CXL
5e:00.0 ... CXL Memory Device

# 메모리는 node 0의 일부로 잘못 인식
```

BIOS의 *CXL 활성화 옵션이 disabled* 또는 *EDK II에 CXL 모듈 누락*. *BIOS update*가 답.

### HMAT 누락 → tier 자동 분류 실패

```text
[증상]
guest$ ls /sys/devices/virtual/memory_tiering/
# 비어 있음

guest$ dmesg | grep hmat
# 출력 없음
```

HMAT가 없으면 *모든 노드를 single tier로 가정*. *DAMON promotion/demotion 동작 안 함*. *수동 tiering 구성*이 답이지만 *근본 해결은 BIOS 수정*.

### SLIT distance 잘못 → 역방향 promotion

```text
[증상]
node distances:
node   0   1   2
  0:  10  21  20   # CXL.mem이 cross-socket보다 가까움 (잘못)
  1:  21  10  20
  2:  20  20  10
```

distance가 *틀리면 NUMA balancer가 CXL.mem을 hot으로 잘못 판단*. *성능이 떨어지는 노드로 page promote*가 일어남.

### Memory map 영역 충돌

```text
[부팅 로그]
EFI: Memory Map: range 0x100000000-0x180000000 conflicting
EFI: dropping CXL region overlap
```

UEFI Memory Map과 *CFMWS·SRAT의 range가 겹치면* 일부 영역이 *사라집니다*. BIOS의 *memory map 계산 오류*. 보통 *BIOS bug*.

### Firmware-managed mode에서 user commit 시도

```bash
$ cxl create-region -d decoder0.0 -t ram -s 128G
Error: decoder firmware-locked
```

BIOS가 *모든 HDM을 미리 commit*했고 *user의 추가 commit이 불가*. *BIOS 옵션*에서 *user-managed mode*로 전환해야.

## 정리

- 현세대 서버 메모리는 *HBM·DDR·CXL.mem·persistent*의 *4가지 이상 영역*이 *한 SPA 공간*으로 통합됩니다.
- 부트로더는 *SRAT·HMAT·SLIT·CEDT·NFIT*를 *정교하게 채워* 커널이 *자동으로 NUMA·tier 분류*하게 합니다.
- *HMAT의 latency·bandwidth 정보*가 *memory tier 자동 분류의 근거*. *DAMON·NUMA balancing*이 그 정보 기반.
- *Firmware-managed vs user-managed* HDM mode는 *부트 시점 vs 런타임* 결정 분기.
- *CXL Fabric의 동적 영역*은 *부트 시점에 예약*되고 *런타임에 hot-add*. 2단계 발견 모델.
- 흔한 실수는 *SRAT/HMAT 누락·distance 잘못·memory map 충돌·mode 충돌* 5가지.

## 시리즈 마무리 — Bootloader Internals 36편 회고

본 시리즈는 *전원 인가 직후의 0 명령어*에서 시작해 *복잡한 multi-tier 메모리 토폴로지*까지 *부트로더의 전체 책임*을 다뤘습니다.

| Part | 챕터 | 핵심 |
|------|------|------|
| 도입 (Ch 1) | 부트의 빈자리 | 왜 부트로더가 필요한가 |
| U-Boot 기초 (Ch 2~14) | 빌드·구조·드라이버·페리페럴 | U-Boot 내부 |
| 보안·통합 (Ch 15~20) | FIT·verified boot·A/B·EFI·RAUC | 양산 보안 |
| 실전 (Ch 21~30) | porting·debugging·BootROM·TF-A·CI | 양산 운영 |
| 확장 (Ch 31~33) | TF-A BL31·PSCI·SMP | ARM64 깊이 |
| CXL 통합 (Ch 34~36) | PCIe enum·UEFI CXL·메모리 토폴로지 | 데이터센터 |

CXL 통합 챕터(34~36)는 *임베디드 부트로더가 데이터센터 서버까지 확장*되는 흐름을 보여 줍니다.

다음 깊이는 *기존 다른 시리즈*에 *분산 추가*된 챕터로 자연 연결:
- 보안: [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- 드라이버: [Modern Embedded Recipes Ch 151](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- 디버깅: [Embedded Debugging Ch 8~9](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)

## 관련 항목

- [Ch 1: ROM부터 init까지](/blog/embedded/bootloader/chapter01-boot-problem) — 시리즈 시작
- [Ch 9: DDR Controller 프로그래밍과 PHY Training](/blog/embedded/bootloader/chapter09-dram-init) — 메모리 초기화의 시작
- [Ch 19: Linux Boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff) — 커널 인계 규약
- [Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
