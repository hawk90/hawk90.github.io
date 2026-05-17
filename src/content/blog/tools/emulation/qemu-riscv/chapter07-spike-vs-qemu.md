---
title: "Ch 7: spike vs QEMU"
date: 2025-05-20T01:00:00
description: "RISC-V 시뮬레이터 비교 — spike와 QEMU의 차이, 용도별 선택을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 7
tags: [RISC-V, QEMU, spike, Simulator]
draft: true
---

## 개요

RISC-V 시뮬레이션 도구인 spike와 QEMU를 비교한다.

---

## spike란

TODO:

- RISC-V 공식 ISA 시뮬레이터
- 명령어 수준 시뮬레이션
- 레퍼런스 구현체

```bash
spike pk hello.elf
```

---

## 비교표

TODO:

| 항목 | spike | QEMU |
|------|-------|------|
| 목적 | ISA 검증 | 시스템 에뮬레이션 |
| 속도 | 느림 | 빠름 (JIT) |
| 주변장치 | 최소 | 풍부 |
| 디버깅 | 상세 | GDB 통합 |
| 사용 | 검증, 교육 | 개발, 테스트 |

---

## spike 장점

TODO:

- 스펙 준수 검증
- 명령어 트레이스
- 확장 검증
- 교육용

---

## QEMU 장점

TODO:

- 실제 시스템 에뮬레이션
- 빠른 실행 속도
- 풍부한 주변장치
- Linux 실행

---

## 사용 시나리오

TODO:

| 시나리오 | 추천 |
|----------|------|
| ISA 확장 검증 | spike |
| 컴파일러 테스트 | spike |
| 펌웨어 개발 | QEMU |
| Linux 개발 | QEMU |
| 교육/학습 | 둘 다 |

---

## spike 설치

TODO:

```bash
git clone https://github.com/riscv-software-src/riscv-isa-sim.git
cd riscv-isa-sim
mkdir build && cd build
../configure --prefix=/opt/riscv
make -j$(nproc)
make install
```

---

## 정리

- spike = ISA 레퍼런스, 검증용
- QEMU = 시스템 에뮬레이션, 개발용
- 목적에 따라 선택
- 둘 다 알면 좋음

---

## 다음 장 예고

Ch 8에서는 커스텀 디바이스 추가를 다룬다.

---

## 참고 자료

- [spike](https://github.com/riscv-software-src/riscv-isa-sim)
- [QEMU](https://www.qemu.org/)
