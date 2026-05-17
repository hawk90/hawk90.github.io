---
title: "Ch 8: SBI 확장"
date: 2025-05-19T02:00:00
description: "SBI 확장 — 타이머, IPI, RFENCE, HSM, PMU 등 주요 확장을 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 8
tags: [RISC-V, SBI, Extensions, Timer, IPI]
draft: true
---

## 개요

SBI는 확장 가능한 구조로, 다양한 기능을 제공한다.

---

## Base 확장 (EID 0x10)

TODO:

```c
sbi_get_spec_version()
sbi_get_impl_id()
sbi_get_impl_version()
sbi_probe_extension(eid)
sbi_get_mvendorid()
sbi_get_marchid()
sbi_get_mimpid()
```

---

## Timer 확장 (EID 0x54494D45)

TODO:

```c
sbi_set_timer(stime_value)
```

---

## IPI 확장 (EID 0x735049)

TODO:

```c
sbi_send_ipi(hart_mask, hart_mask_base)
```

---

## RFENCE 확장 (EID 0x52464E43)

TODO:

```c
sbi_remote_fence_i(...)
sbi_remote_sfence_vma(...)
sbi_remote_sfence_vma_asid(...)
```

---

## HSM 확장 (EID 0x48534D)

TODO:

```c
sbi_hart_start(hartid, start_addr, opaque)
sbi_hart_stop()
sbi_hart_get_status(hartid)
sbi_hart_suspend(suspend_type, resume_addr, opaque)
```

---

## SRST 확장 (EID 0x53525354)

TODO:

```c
sbi_system_reset(reset_type, reset_reason)
```

---

## PMU 확장 (EID 0x504D55)

TODO: Performance Monitoring Unit

---

## 확장 탐색

TODO:

```c
struct sbiret ret = sbi_probe_extension(SBI_EXT_HSM);
if (ret.value)
    // HSM 지원됨
```

---

## 정리

- Base로 SBI 버전/구현 확인
- Timer로 타이머 인터럽트 설정
- IPI로 하트간 통신
- HSM으로 하트 관리
- SRST로 시스템 리셋

---

## 다음 장 예고

Ch 9에서는 U-Boot RISC-V 포팅을 다룬다.

---

## 참고 자료

- [SBI Specification](https://github.com/riscv-non-isa/riscv-sbi-doc)
