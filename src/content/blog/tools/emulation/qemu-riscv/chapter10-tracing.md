---
title: "Ch 10: 성능 측정과 트레이싱"
date: 2025-05-20T04:00:00
description: "QEMU 트레이싱 — TCG 프로파일링, -d 옵션, 성능 분석을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 10
tags: [RISC-V, QEMU, Tracing, Performance]
draft: true
---

## 개요

QEMU의 트레이싱과 성능 분석 기능을 다룬다.

---

## -d 옵션

TODO:

```bash
qemu-system-riscv64 -d help
```

| 옵션 | 설명 |
|------|------|
| in_asm | 게스트 어셈블리 |
| out_asm | 호스트 어셈블리 |
| int | 인터럽트 |
| exec | 실행 흐름 |
| cpu | CPU 상태 |
| mmu | MMU 연산 |

---

## 명령어 트레이스

TODO:

```bash
qemu-system-riscv64 -d in_asm -D trace.log \
    -machine virt -nographic -kernel firmware.elf
```

---

## 인터럽트 트레이스

TODO:

```bash
qemu-system-riscv64 -d int -D int.log ...
```

---

## QEMU 트레이싱 시스템

TODO:

```bash
# 트레이스 포인트 목록
qemu-system-riscv64 -trace help

# 특정 트레이스 활성화
qemu-system-riscv64 -trace "riscv_*"
```

---

## TCG 프로파일링

TODO:

```bash
qemu-system-riscv64 -d op,op_opt ...
```

---

## 명령어 카운트

TODO:

```bash
qemu-system-riscv64 -icount shift=0 ...
```

---

## 플러그인

TODO:

```bash
qemu-system-riscv64 -plugin libexeclog.so ...
```

---

## perf 연동

TODO:

```bash
perf record qemu-system-riscv64 ...
perf report
```

---

## 정리

- -d로 다양한 트레이스
- 트레이싱 시스템으로 세밀한 제어
- TCG 프로파일링으로 번역 분석
- perf로 호스트 측 분석

---

## 시리즈 마무리

이 시리즈에서 QEMU RISC-V 에뮬레이션을 심화 학습했다.

---

## 관련 시리즈

- [RISC-V ISA 해부](/blog/systems/riscv/isa-anatomy/) — ISA 기초
- [RISC-V 베어메탈 부트](/blog/systems/riscv/baremetal-boot/) — 부트 과정
- [RISC-V 임베디드 실습](/blog/embedded/riscv-practice/) — 실제 보드

---

## 참고 자료

- [QEMU Tracing](https://www.qemu.org/docs/master/devel/tracing.html)
- [QEMU TCG](https://www.qemu.org/docs/master/devel/tcg.html)
