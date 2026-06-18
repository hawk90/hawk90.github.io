---
title: "부트 시 메모리 토폴로지 결정 — DDR + CXL.mem 통합 인식"
date: 2026-06-19T09:03:00
description: "부트로더가 DDR DIMM·CXL.mem·HBM을 하나의 메모리 토폴로지로 통합하는 흐름 — SRAT·HMAT·SLIT 생성과 NUMA 노드 매핑."
series: "Bootloader Internals"
seriesOrder: 36
tags: [embedded, bootloader, memory-topology, srat, hmat, numa, cxl-mem, tiered-memory]
draft: true
---

> Outline — [Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)과 [Ch 35](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서 *PCIe enumeration*과 *CXL CEDT 생성*을 봤다. 이 장은 *시리즈 마무리* — *모든 메모리가 어떻게 하나의 토폴로지로 통합*되는지를 본다.
>
> 다룰 것:
>
> - **메모리 토폴로지의 구성 요소** —
>   - *DDR DIMM* (per-socket·per-channel)
>   - *HBM on-package* (CPU 통합 — Xeon Max·Genoa-X)
>   - *CXL.mem* (Direct attach·Switch·Pool)
>   - *Persistent memory* (NVDIMM·CXL persistent)
> - **부트로더의 책임** — *모든 메모리 영역을 식별*하고 *적절한 ACPI 테이블*에 *통합 표현*
> - **SRAT (System Resource Affinity Table)** — *NUMA 노드*와 *메모리 affinity* 정의. CXL.mem은 *별도 NUMA 노드*로 등록
> - **HMAT (Heterogeneous Memory Attribute Table)** — *latency·bandwidth·access pattern* 정의. *initiator → target 관계*로 기술
> - **SLIT (System Locality Information Table)** — *NUMA 노드 간 거리*. CXL.mem은 *local DDR보다 큰 distance* (보통 50~80)
> - **메모리 분류 의사 결정** —
>   - *System RAM*: 일반 메모리, kernel allocator가 사용
>   - *Movable Zone*: hot-remove 가능, CXL.mem 후보
>   - *Device DAX*: byte-addressable persistent, mmap-only
>   - *Reserved*: 부트로더·펌웨어 전용
> - **Tiered Memory 자동 인식 흐름** —
>   1. 부트로더가 SRAT·HMAT 생성
>   2. 커널이 *memory tier*를 *HMAT bandwidth 기준*으로 자동 분류
>   3. `numactl --hardware`로 tier 확인 가능
>   4. DAMON·DAMOS가 *hot/cold page* 자동 promotion/demotion
> - **부트 시점 결정 vs 런타임 결정** — *Hot-add CXL device*는 부트로더 책임 외. 그러나 *부트 시 알려진 디바이스*는 *반드시 SRAT에 포함*
> - **CXL Fabric의 부트 인식 한계** — CXL 3.0 fabric의 *동적 메모리 풀링*은 *부트 시점에 fixed 영역만* 인식. dynamic 영역은 *Fabric Manager가 OS에 알림*
> - **실 예 — Granite Rapids + Astera Leo CXL**:
>   ```bash
>   $ numactl --hardware
>   node distances:
>   node   0   1   2
>     0:  10  21  50    # DDR socket 0
>     1:  21  10  50    # DDR socket 1
>     2:  50  50  10    # CXL.mem (node 2)
>
>   $ dmesg | grep -i hmat
>   ACPI: HMAT: Memory Latency: 100ns at node 0
>   ACPI: HMAT: Memory Latency: 240ns at node 2  # CXL.mem
>   ```
> - **트러블슈팅** —
>   - SRAT에 CXL.mem 누락 → kernel이 *node 0의 일부로 잘못 인식*
>   - HMAT bandwidth 미정의 → DAMON이 *tier 분류 못 함*
>   - SLIT distance 잘못 → kernel이 *CXL.mem을 hot tier로 오판*
>
> **시리즈 마무리** — Bootloader Internals 시리즈가 *부트로더의 첫 명령*부터 *복잡한 메모리 토폴로지를 커널에 인계*하는 *마지막 단계*까지 완주. 다음 단계 확장은 *Embedded Debugging의 CXL 링크 디버깅*, *BSP Development의 CXL device tree binding*, 또는 *Kernel Debugging의 CXL 드라이버 디버깅*으로 *기존 시리즈에 분산 추가*된다.
