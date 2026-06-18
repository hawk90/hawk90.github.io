---
title: "CXL 성능 프로파일링 도구 — cxl-cli·DAMON·perf-mem 활용"
date: 2026-06-16T09:02:00
description: "CXL.mem 환경 성능 도구 — cxl-cli 토폴로지·DAMON page activity·perf-mem로 보는 CXL 트래픽·numastat 통계."
series: "Embedded Performance Engineering"
seriesOrder: 55
tags: [cxl, cxl-cli, damon, perf-mem, numastat, profiling]
draft: true
---

> Outline — [Ch 54](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)에서 *측정 결과*를 봤다. 이 장은 *측정에 쓴 도구들*을 *Part 5 (프로파일링 도구) 톤*으로 정리한다.
>
> 다룰 것:
>
> - **cxl-cli** — Linux 6.0+ CXL 서브시스템 표준 CLI. `cxl list -RT`, `cxl create-region`, `cxl set-partition` 등 *토폴로지와 region 관리*
> - **DAMON** (Data Access Monitor) — kernel 5.15+에서 *page granularity 접근 빈도*. *hot/cold 분류*로 tier 결정
> - **DAMOS** — DAMON 기반 *자동 promotion/demotion*. `pageout`, `migrate_hot`, `migrate_cold` action
> - **perf-mem** — Linux perf의 *memory access 프로파일링*. *load latency 분포*와 *miss source* 추적
> - **numastat·numactl** — NUMA 노드 통계. CXL은 *별도 노드*로 등록되므로 numastat로 *CXL.mem 사용량* 확인
> - **bpftrace로 CXL 트래픽** — kprobe로 *cxl_pci, cxl_mem* 커널 함수 호출 빈도 추적
> - 실전 예시: *CXL Tiered Memory 환경*에서 *workload 시작 → DAMON으로 hot page 식별 → DAMOS로 자동 promotion → numastat으로 결과 검증*의 한 cycle
>
> [Ch 56: 실전 사례 — CXL.mem 추가로 LLM inference KV cache 처리량 회복](/blog/embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache)로 이어진다.
