---
title: "Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러"
date: 2026-05-01T02:00:00
description: "ESP32-C3 코어의 ISA·특권 모델·인터럽트. 32-bit IMC, M-mode only, PMP 16 entries."
series: "ESP32-C3 Mastering"
seriesOrder: 2
tags: [riscv, isa, pmp, interrupt, esp32-c3]
draft: true
---

> Outline — *RV32IMC* — base I + M(곱셈/나눗셈) + C(compressed 16-bit). *Privilege model* — M-mode만 (RISC-V M+U 중 U 미지원). *PMP* — Physical Memory Protection, 16 entries. *Interrupt* — CLIC 변형 (Espressif 자체 컨트롤러). 31개 외부 인터럽트, vectored mode. *PIE/IE* — global enable. CSR 매핑. *PERFCNT* — 사이클·인스트럭션 카운터. Xtensa와의 차이 — 어셈블리 inline 시 주의.
