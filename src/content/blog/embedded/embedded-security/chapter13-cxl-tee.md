---
title: "CXL TEE 확장 — Trusted Execution을 메모리 디바이스까지"
date: 2026-06-17T09:03:00
description: "TDISP·TVM·CXL TEE — Confidential Computing이 메모리 디바이스·가속기로 확장되는 표준 흐름."
series: "Embedded Security"
seriesOrder: 13
tags: [cxl, tdisp, confidential-computing, arm-cca, sev-tio, tvm]
draft: true
---

> Outline — [Ch 5 (TEE)](/blog/embedded/embedded-security/chapter05-tee)는 *CPU 안의 Secure World*를 다뤘다. [Ch 11 (IDE)](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)는 *링크 암호화*를, [Ch 12 (SPDM)](/blog/embedded/embedded-security/chapter12-spdm-cma)는 *디바이스 인증*을 다뤘다. 이 셋이 합쳐져 *Confidential Computing이 디바이스 측까지 확장*된다.
>
> 다룰 것:
>
> - **TDISP (TEE Device Interface Security Protocol)** — PCIe·CXL 디바이스를 *TVM(Trusted Virtual Machine)에 안전하게 연결*하는 표준. PCIe IDE WG·CXL Consortium·CCC가 *공동 표준화*
> - **TVM (Trusted Virtual Machine)** — guest VM이 *호스트 hypervisor를 신뢰하지 않고도* 안전하게 동작. CPU 측은 *AMD SEV-SNP, Intel TDX, ARM CCA*가 담당
> - **TDISP 상태 머신** — `LOCKED` → `RUN` → `ERROR` → `UNLOCKED`. *디바이스가 한 TVM에 묶여 있는 동안* 다른 VM·hypervisor의 *간섭 차단*
> - **MMIO·DMA 격리** — TVM이 *직접 디바이스 register·memory에 접근*하는 동안 *hypervisor는 못 봄*. *page table·IOMMU 매핑*이 TVM controlled
> - **CXL TEE 특화** — CXL.mem 디바이스의 *attached DRAM 영역*도 *TVM 전용으로 격리*. host CPU가 *load/store*는 가능하지만 *encrypted in transit (IDE) + isolated at rest (memory encryption)*
> - **ARM CCA에서의 CXL** — *Realm Memory Manager*가 *CXL device를 Realm에 attach*. RMM·EL3 monitor 협조
> - **AMD SEV-TIO** — Trusted I/O. SEV-SNP guest가 *PCIe 가속기와 안전한 연결*. NVIDIA H100·Blackwell GPU에 적용
> - **Intel TDX Connect** — TDX guest가 *CXL.mem과 가속기*를 *TVM 안에서 사용*. 2025+ Granite Rapids에서 본격화
> - **운영 예** — Linux KVM에서 *TDX guest 시작* → *CXL.mem 영역 attach* → *TDISP LOCK* → guest exit 시 *UNLOCK + memory wipe*
> - **위협 모델 정리** — *cloud operator·co-tenant·rogue hypervisor*가 모두 *attacker 가정*. 신뢰 경계가 *guest VM 안*까지 좁아지는 모델
> - **시리즈 마무리** — Embedded Security 시리즈가 *CPU 안(TEE) → 디바이스 인증(SPDM) → 링크 암호화(IDE) → 메모리 디바이스 격리(TDISP)*까지 *Confidential Computing의 전체 스택*을 *흐름으로 완성*
>
> 관련: 위 셋 (Ch 11·12·13)이 *셋 묶음*으로 *Confidential Computing 가능 표준*을 형성. 한국 산업 위치에서는 *Samsung·SK Hynix의 CXL 메모리*가 *TDISP 표준에 적극 참여*.
