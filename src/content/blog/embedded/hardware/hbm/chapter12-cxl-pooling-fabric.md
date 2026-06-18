---
title: "메모리 풀링과 데이터센터 토폴로지 — CXL Switch와 Fabric"
date: 2026-06-15T09:04:00
description: "CXL 2.0/3.x switch가 만드는 메모리 풀링 — 다중 호스트가 공유하는 메모리 풀과 Coherent Fabric 토폴로지."
series: "HBM·GDDR 심화"
seriesOrder: 12
tags: [cxl, memory-pooling, fabric, datacenter, gfam]
draft: true
---

> Outline — *디바이스 한 대*에서 *데이터센터 전체 토폴로지*로 시야를 넓힌다. 이 장이 *HBM·GDDR 시리즈의 두 번째 마무리*다.
>
> 다룰 것:
>
> - **CXL 2.0 switching** — single-host 토폴로지, *fan-out*과 *device hot-plug*
> - **CXL 2.0 pooling** — *multi-host*가 동일 *CXL device*를 *time-share*. 각 host에 *logical device(LD)*로 분할
> - **CXL 3.0 fabric** — *Coherent Fabric*. multi-host *동시 access*, *cache coherency 유지*
> - **GFAM** (Global Fabric Attached Memory) — *fabric 전역 메모리 풀*. *10 TB+ pool*을 *수십 host가 공유*
> - **PBR** (Port-Based Routing) — fabric의 라우팅 메커니즘
> - **Fabric Manager** — pooling·alloc·dealloc을 *out-of-band 관리*하는 컨트롤러
> - **Composability** — *CPU·메모리·가속기*를 *워크로드별로 동적 조합*하는 데이터센터 비전
> - 실 사람들: Meta Memory Tiering, Microsoft Azure Pond, Google Carbon, AMD MI300 Cluster
> - *시리즈 두 번째 마무리*: HBM의 *on-package 대역폭*, CXL.mem의 *card 단위 용량*, CXL fabric의 *rack 단위 풀링*까지 *메모리 계층의 세 단계*가 완성된다
>
> 시리즈 다음 단계는 *별 시리즈*가 아니라 *Embedded Performance Engineering*, *Embedded Security* 등 *기존 시리즈에 분산 추가*된다.
