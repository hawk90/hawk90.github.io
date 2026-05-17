---
title: "Ch 17: 디버그 확장"
date: 2025-05-18T17:00:00
description: "RISC-V 디버그 확장 — 트리거 모듈, 디버그 모드, JTAG/cJTAG 연동을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 17
tags: [RISC-V, Debug, JTAG, Trigger, Breakpoint]
draft: true
---

## 개요

RISC-V Debug Specification은 외부 디버거를 위한 인터페이스를 정의한다.

---

## 디버그 모드 (D 모드)

TODO: M 모드보다 높은 특권

---

## 디버그 모드 진입

TODO:
- 외부 디버거 요청
- 트리거 매치
- EBREAK (dcsr.ebreakm 설정 시)

---

## 디버그 CSR

TODO:

| CSR | 용도 |
|-----|------|
| dcsr | 디버그 제어/상태 |
| dpc | 디버그 PC |
| dscratch0/1 | 스크래치 레지스터 |

---

## 트리거 모듈

TODO:

```
tselect — 트리거 선택
tdata1  — 트리거 타입/설정 (mcontrol/icount/itrigger/etrigger)
tdata2  — 트리거 데이터 (주소/값)
tdata3  — 추가 데이터
```

---

## 브레이크포인트 타입

TODO:

| 타입 | 용도 |
|------|------|
| Address match | 특정 주소 실행/접근 |
| Data match | 특정 값 접근 |
| Instruction count | N개 명령어 후 |
| Exception | 특정 예외 발생 |

---

## Debug Module

TODO: DTM, DMI, 추상 명령어

---

## JTAG 인터페이스

TODO: TAP, DMI 접근

---

## OpenOCD 연동

TODO: 기본 설정 예시

---

## 정리

- 디버그 모드는 최고 특권
- 트리거로 브레이크포인트/왓치포인트 구현
- JTAG으로 외부 디버거 연결
- OpenOCD + GDB 조합이 일반적

---

## 다음 장 예고

Ch 18에서는 확장 로드맵을 다룬다.

---

## 참고 자료

- RISC-V Debug Specification
- [OpenOCD RISC-V](https://openocd.org/doc/html/RISC_002dV.html)
