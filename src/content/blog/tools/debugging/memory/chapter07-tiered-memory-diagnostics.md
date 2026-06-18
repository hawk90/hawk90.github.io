---
title: "Tiered Memory 진단 — DAMON·DAMOS·Promotion/Demotion 디버깅"
date: 2026-06-18T09:06:00
description: "DDR + CXL.mem 계층화 환경에서 DAMON·DAMOS 동작 분석 — page promotion/demotion 추적, hot/cold 분류 디버깅."
series: "Memory Diagnostics"
seriesOrder: 7
tags: [tiered-memory, damon, damos, cxl, promotion, demotion]
draft: true
---

> Outline — [Ch 6](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)에서 *CXL 디바이스 자체*를 진단했다. 이 장은 *DDR + CXL.mem 계층화 환경*에서 *자동 tier 관리*가 잘 동작하는지를 본다.
>
> 다룰 것:
>
> - **DAMON 기본 동작 모델** — *region sampling·access counting·aggregation* 3단계
> - **DAMON parameter 튜닝** — `sample_interval`, `aggr_interval`, `min_nr_regions`, `max_nr_regions`
> - **DAMOS scheme 종류**:
>   - `pageout` — cold page를 swap으로
>   - `migrate_hot` — hot page를 *상위 tier로 promotion*
>   - `migrate_cold` — cold page를 *하위 tier로 demotion*
>   - `lru_prio`·`lru_deprio` — LRU 우선순위 조정
> - **Tiered memory configuration** — `/sys/devices/virtual/memory_tiering/`
> - **Promotion·demotion 추적**:
>   ```bash
>   $ damo monitor --kdamonds 0
>   $ cat /sys/kernel/debug/tracing/trace | grep migrate_pages
>   $ perf stat -e mm:page_migrate
>   ```
> - **흔한 문제들**:
>   - *false promotion* — 단발 access인데 hot 분류
>   - *demotion thrashing* — 한 page가 *상하 tier 사이*를 *왕복*
>   - *promotion 실패* — DDR tier가 *full*인 경우의 처리
>   - *NUMA balancing과 충돌* — `numa_balancing`이 DAMON과 *역방향*으로 동작
> - **워크로드별 권장 DAMON config** — LLM inference·in-memory DB·container host
> - **bpftrace로 migration 캡처**:
>   ```bash
>   bpftrace -e 'tracepoint:migrate:mm_migrate_pages_start {
>     printf("%llu: %d pages from node %d to %d\n",
>            nsecs, args->nr_pages, args->from_node, args->to_node);
>   }'
>   ```
> - **Performance regression 사례** — DAMON 활성화 후 throughput 떨어진 워크로드 분석
> - **시리즈 마무리** — Memory Diagnostics가 *DDR 단일에서 시작해 CXL tiered memory까지* 완주
>
> 다음 단계는 *Postmortem Debugging*의 *CXL 디바이스 core dump 분석*으로 자연 연결.
