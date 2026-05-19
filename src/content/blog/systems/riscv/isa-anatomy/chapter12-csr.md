---
title: "Ch 12: CSR (Control and Status Registers)"
date: 2026-05-17T12:00:00
description: "RISC-V CSR — mstatus, misa, mtvec, mepc, mcause 등 주요 레지스터를 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 12
tags: [RISC-V, CSR, mstatus, mtvec, mcause]
draft: true
---

## 개요

CSR은 프로세서 상태와 제어를 위한 특수 레지스터다.

---

## CSR 접근 명령어

TODO: CSRRW, CSRRS, CSRRC, CSRRWI, CSRRSI, CSRRCI

```asm
csrrw rd, csr, rs1   # rd = csr; csr = rs1
csrrs rd, csr, rs1   # rd = csr; csr |= rs1
csrrc rd, csr, rs1   # rd = csr; csr &= ~rs1
```

---

## CSR 주소 인코딩

TODO: 12비트 주소, 접근 권한 인코딩

```
[11:10] — 읽기/쓰기 권한
[9:8]   — 최소 특권 레벨
[7:0]   — 레지스터 번호
```

---

## Machine 모드 CSR

TODO:

| CSR | 주소 | 용도 |
|-----|------|------|
| mstatus | 0x300 | 상태/제어 |
| misa | 0x301 | ISA 확장 |
| mtvec | 0x305 | 트랩 벡터 |
| mepc | 0x341 | 예외 PC |
| mcause | 0x342 | 예외 원인 |
| mtval | 0x343 | 예외 값 |

---

## mstatus 상세

TODO: MIE, MPIE, MPP, ...

---

## misa 상세

TODO: 확장 비트, MXL

---

## mtvec 상세

TODO: BASE, MODE (Direct/Vectored)

---

## Supervisor 모드 CSR

TODO: sstatus, stvec, sepc, scause, satp

---

## 정리

- CSR은 프로세서 제어의 핵심
- 주소 인코딩에 권한 정보 포함
- M/S/U 레벨별 CSR 분리
- Zicsr 확장이 CSR 접근 명령어 정의

---

## 다음 장 예고

Ch 13에서는 예외와 트랩을 다룬다.

---

## 참고 자료

- RISC-V Privileged Spec, Chapter 2 (CSR)
