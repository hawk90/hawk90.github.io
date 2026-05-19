---
title: "Chapter 2: Cortex-M Reset → Vector → main"
date: 2026-05-22T02:00:00
description: "Cortex-M vector table, SP_main 초기화, Reset_Handler를 instruction-level로 따라가 main까지의 흐름을 봅니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 2
tags: [arm, baremetal, cortex-m, vector-table, reset-handler]
draft: true
---

> Outline — Cortex-M의 첫 8바이트(SP_main + Reset vector)가 fetch되는 순간부터, `.data` copy·`.bss` zero·`__libc_init_array`·`main()` 호출까지를 어셈블리 한 줄씩 풀어 봅니다.
