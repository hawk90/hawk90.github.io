---
title: "CXL Type 1·2·3 디바이스 분류 — Cache·Accelerator·Memory"
date: 2026-06-15T09:03:00
description: "CXL 디바이스 세 유형 — Type 1 (cache-only), Type 2 (accelerator with memory), Type 3 (memory expander)의 사용 사례와 트래픽 패턴."
series: "HBM·GDDR 심화"
seriesOrder: 11
tags: [cxl, cxl-type, accelerator, memory-expander]
draft: true
---

> Outline — CXL은 *디바이스를 세 유형*으로 나눈다. 이 장은 *유형별 자리와 트래픽 패턴*을 본다.
>
> 다룰 것:
>
> - **Type 1** — *cache-only* 디바이스. NIC·HBA 같은 *I/O 가속기*가 *호스트 메모리를 캐시*. 트래픽은 *CXL.io + CXL.cache*
> - **Type 2** — *accelerator with attached memory*. GPU·NPU 등이 *자체 HBM/DRAM*을 가지고 *host와 양방향 캐시 공유*. 트래픽은 *CXL.io + CXL.cache + CXL.mem*
> - **Type 3** — *memory expander*. DRAM 모듈을 *PCIe 너머로 노출*. Ch 9에서 다룬 *Samsung CMM-D·SK Hynix Niagara·Astera Leo*가 여기. 트래픽은 *CXL.io + CXL.mem*
> - 각 타입별 *bias 모드* — host bias vs device bias의 의미
> - 실 사례 매핑: NVIDIA Connect-X (Type 1), AMD Instinct MI300X (Type 2), Astera Leo (Type 3)
> - *Type 별 Linux 커널 인식 경로* (`cxl_pci`, `cxl_mem`, `cxl_acpi`)
>
> [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric)로 이어진다.
