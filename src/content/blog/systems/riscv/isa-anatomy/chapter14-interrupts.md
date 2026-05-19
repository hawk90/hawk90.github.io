---
title: "Ch 14: 인터럽트"
date: 2026-05-17T14:00:00
description: "RISC-V 인터럽트 — 외부/타이머/소프트웨어 인터럽트, mie/mip, PLIC/CLINT를 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 14
tags: [RISC-V, Interrupt, PLIC, CLINT]
draft: true
---

## 개요

RISC-V는 세 종류의 표준 인터럽트를 정의한다.

---

## 인터럽트 종류

TODO:

| 종류 | mcause | 설명 |
|------|--------|------|
| Software (MSI) | 3 | IPI 용도 |
| Timer (MTI) | 7 | 타이머 만료 |
| External (MEI) | 11 | 외부 장치 |

---

## mie / mip 레지스터

TODO:

```
mie — 인터럽트 활성화
  MSIE (bit 3): M-mode software interrupt enable
  MTIE (bit 7): M-mode timer interrupt enable
  MEIE (bit 11): M-mode external interrupt enable

mip — 인터럽트 대기
  MSIP, MTIP, MEIP
```

---

## 인터럽트 우선순위

TODO: MEI > MSI > MTI (일반적)

---

## CLINT (Core Local Interruptor)

TODO: 타이머, 소프트웨어 인터럽트

```
mtime      — 현재 시간 (64비트)
mtimecmp   — 비교값 (하트당)
msip       — 소프트웨어 인터럽트 트리거
```

---

## PLIC (Platform-Level Interrupt Controller)

TODO: 외부 인터럽트 라우팅

```
- 다수의 인터럽트 소스
- 우선순위 설정
- 하트별 컨텍스트
- Claim/Complete 프로토콜
```

---

## PLIC 레지스터

TODO: priority, pending, enable, threshold, claim/complete

---

## 인터럽트 핸들링 흐름

TODO:
1. 인터럽트 발생
2. PLIC에서 가장 높은 우선순위 선택
3. 하트가 claim
4. 핸들러 실행
5. complete

---

## Supervisor 인터럽트

TODO: SSIP, STIP, SEIP, sie, sip

---

## 정리

- 3종류: 소프트웨어, 타이머, 외부
- CLINT: 타이머 + IPI
- PLIC: 외부 인터럽트 라우팅
- mie/mip로 활성화/대기 상태 관리

---

## 다음 장 예고

Ch 15에서는 가상 메모리를 다룬다.

---

## 참고 자료

- RISC-V Privileged Spec, Chapter 3.1.9 (Machine Interrupt)
- RISC-V PLIC Specification
