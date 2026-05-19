---
title: "Ch 3: 하트(Hart) 관리"
date: 2026-05-17T21:00:00
description: "RISC-V 하트 관리 — mhartid, 멀티하트 부팅, 파킹 루프를 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 3
tags: [RISC-V, Hart, SMP, Multi-Core]
draft: true
---

## 개요

RISC-V에서 Hart(Hardware Thread)는 독립적인 실행 컨텍스트다.

---

## mhartid CSR

TODO:

```asm
csrr a0, mhartid   # 현재 하트 ID 읽기
```

---

## 부트 하트 선택

TODO:

```asm
_start:
    csrr a0, mhartid
    bnez a0, secondary_hart  # 하트 0만 부팅 진행

    # 부트 하트 초기화
    ...

secondary_hart:
    # 세컨더리 하트는 대기
    wfi
    j secondary_hart
```

---

## 파킹 루프

TODO: WFI로 전력 절약하며 대기

---

## 세컨더리 하트 깨우기

TODO: IPI (Inter-Processor Interrupt)

---

## 하트별 스택

TODO: 하트마다 별도 스택 영역

```c
#define STACK_SIZE 4096
char stacks[NUM_HARTS][STACK_SIZE];

// 하트별 스택 포인터
sp = (uintptr_t)&stacks[hartid][STACK_SIZE];
```

---

## SBI HSM 확장

TODO: Hart State Management

```
sbi_hart_start(hartid, start_addr, opaque)
sbi_hart_stop()
sbi_hart_get_status(hartid)
```

---

## 정리

- mhartid로 하트 식별
- 부트 하트가 초기화 담당
- 세컨더리 하트는 파킹 후 IPI로 깨움
- SBI HSM으로 런타임 하트 관리

---

## 다음 장 예고

Ch 4에서는 메모리 맵과 디바이스 트리를 다룬다.

---

## 참고 자료

- RISC-V SBI Specification (HSM Extension)
