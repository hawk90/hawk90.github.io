---
title: "Ch 8: 보드 초기화 — board_init_f와 board_init_r"
date: 2026-05-18T08:00:00
description: "U-Boot 보드 초기화 흐름 — pre-relocation (board_init_f)과 post-relocation (board_init_r)."
series: "Bootloader Internals"
seriesOrder: 8
tags: [embedded, bootloader, u-boot, board-init]
draft: true
---

> Outline — *왜 두 단계인가* — DRAM 초기화 전(SRAM 위)과 후(DRAM 위)의 환경 차이. `init_sequence_f`·`init_sequence_r` 배열의 순차 호출. 보드 코드가 hook할 수 있는 지점들. `gd_t` 전역 데이터 구조.
