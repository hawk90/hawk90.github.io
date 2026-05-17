---
title: "Ch 11: 특권 모드 개요"
date: 2025-05-18T11:00:00
description: "RISC-V 특권 모드 — M/S/U 모드, 모드 전환 메커니즘, 특권 레벨을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 11
tags: [RISC-V, Privilege, Machine-Mode, Supervisor-Mode]
draft: true
---

## 개요

RISC-V는 최대 3개의 특권 모드를 정의한다: Machine, Supervisor, User.

---

## 특권 레벨

TODO:

| 레벨 | 인코딩 | 약어 | 용도 |
|------|--------|------|------|
| 0 | 00 | U | 사용자 애플리케이션 |
| 1 | 01 | S | OS 커널 |
| 3 | 11 | M | 펌웨어/부트로더 |

---

## 모드 조합

TODO:

| 구성 | 용도 |
|------|------|
| M only | 단순 임베디드 |
| M + U | 보호된 임베디드 |
| M + S + U | 범용 OS |

---

## Machine 모드

TODO: 가장 높은 특권, 모든 리소스 접근

---

## Supervisor 모드

TODO: OS 커널, 가상 메모리 관리

---

## User 모드

TODO: 최소 특권, 애플리케이션 실행

---

## 모드 전환

TODO: 트랩, MRET, SRET

---

## 특권 명령어

TODO: MRET, SRET, WFI, SFENCE.VMA

---

## 정리

- M 모드는 필수, S/U는 선택
- 트랩으로 상위 모드 진입
- xRET으로 하위 모드 복귀
- 모드별 CSR 접근 권한 상이

---

## 다음 장 예고

Ch 12에서는 CSR(Control and Status Registers)을 다룬다.

---

## 참고 자료

- RISC-V Privileged Spec, Chapter 1 (Introduction)
