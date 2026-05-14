---
title: "Ch 11: 실전 팁 — STL pretty-printers / 최적화 코드"
date: 2025-08-20T11:00:00
description: "STL / boost 보기 좋게. 최적화 코드 디버깅. .gdbinit."
tags: [gdb, STL, Optimization]
series: "GDB and LLDB"
seriesOrder: 11
draft: true
---

## 예정 내용
- STL pretty-printers — libstdc++ / libc++ 자동
- print *(this->_M_impl._M_start)@10 — vector 내용
- -O2 코드 — "value optimized out"
- -ggdb3 vs -g
- .gdbinit / .lldbinit 추천 설정
- record / reverse-step — time travel debugging
- 시리즈 마무리 — 추가 학습 (rr, perf 등)
