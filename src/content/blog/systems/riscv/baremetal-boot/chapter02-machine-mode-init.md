---
title: "Ch 2: 머신 모드 초기화"
date: 2025-05-18T20:00:00
description: "RISC-V M-mode 초기화 — 스택 설정, BSS 클리어, 트랩 벡터, CSR 초기화를 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 2
tags: [RISC-V, Machine-Mode, Initialization, Startup]
draft: true
---

## 개요

리셋 직후 M-mode에서 수행해야 할 초기화 작업을 다룬다.

---

## 스타트업 어셈블리

TODO:

```asm
.section .text.start
.global _start
_start:
    # 스택 포인터 설정
    la sp, _stack_top

    # BSS 클리어
    la t0, _bss_start
    la t1, _bss_end
clear_bss:
    bgeu t0, t1, done_bss
    sw zero, 0(t0)
    addi t0, t0, 4
    j clear_bss
done_bss:

    # C 진입
    call main
```

---

## 스택 설정

TODO: 링커 스크립트에서 스택 영역 정의

---

## BSS 클리어

TODO: 초기화되지 않은 전역 변수 영역

---

## 트랩 벡터 설정

TODO:

```asm
la t0, trap_handler
csrw mtvec, t0
```

---

## 인터럽트 비활성화

TODO:

```asm
csrw mie, zero    # 모든 인터럽트 비활성화
csrw mstatus, zero
```

---

## GP (Global Pointer) 설정

TODO: 링커 relaxation 최적화

```asm
.option push
.option norelax
la gp, __global_pointer$
.option pop
```

---

## 멀티하트 처리

TODO: hartid 확인, 메인 하트만 초기화

---

## 정리

- 스택 설정이 최우선
- BSS 클리어 필수
- mtvec으로 트랩 핸들러 등록
- GP 설정으로 코드 크기 최적화

---

## 다음 장 예고

Ch 3에서는 하트(Hart) 관리를 다룬다.

---

## 참고 자료

- RISC-V Assembly Programmer's Manual
