---
title: "Ch 18: 확장 로드맵"
date: 2026-05-17T18:00:00
description: "RISC-V 확장 로드맵 — V(벡터), B(비트조작), H(하이퍼바이저), Zicsr, Zifencei, 프로파일을 다룬다."
series: "RISC-V ISA 해부"
seriesOrder: 18
tags: [RISC-V, Extensions, Vector, Hypervisor, Profiles]
draft: true
---

## 개요

RISC-V는 모듈형 설계로 다양한 확장을 지원한다. 표준 확장과 향후 로드맵을 정리한다.

---

## 표준 확장 상태

TODO:

| 확장 | 상태 | 설명 |
|------|------|------|
| M | Ratified | 곱셈/나눗셈 |
| A | Ratified | 원자 연산 |
| F | Ratified | 단정밀도 FP |
| D | Ratified | 배정밀도 FP |
| C | Ratified | 압축 명령어 |
| V | Ratified | 벡터 |
| B | Ratified | 비트 조작 |
| H | Ratified | 하이퍼바이저 |

---

## V (Vector) 확장

TODO: 별도 시리즈로 다룰 예정

- 벡터 레지스터 v0-v31
- VLA (Vector Length Agnostic)
- LMUL, SEW, vl, vtype

---

## B (Bit-manipulation) 확장

TODO:

```
Zba — 주소 생성
Zbb — 기본 비트 조작
Zbc — 캐리리스 곱셈
Zbs — 단일 비트 연산
```

---

## H (Hypervisor) 확장

TODO:

- VS/VU 모드 추가
- 2단계 주소 변환
- hstatus, hgatp, ...

---

## Zicsr / Zifencei

TODO:

```
Zicsr    — CSR 접근 명령어
Zifencei — FENCE.I 명령어
```

---

## 기타 Z 확장

TODO:

| 확장 | 설명 |
|------|------|
| Zicbom | 캐시 블록 관리 |
| Zicboz | 캐시 블록 제로화 |
| Zawrs | Wait-on-Reservation-Set |
| Ztso | Total Store Ordering |
| Zihintpause | PAUSE 힌트 |

---

## 프로파일

TODO:

```
RVI20U32 — 32비트 기본
RVI20U64 — 64비트 기본
RVA20U64 — 애플리케이션 프로세서
RVA22U64 — 최신 애플리케이션 (V 포함)
```

---

## 커스텀 확장

TODO: X 네임스페이스, 벤더 확장

---

## 향후 전망

TODO:
- Zc* (코드 크기 최적화)
- Cryptography extensions (Zkn, Zks)
- Profile 기반 생태계 통합

---

## 정리

- 모듈형 설계로 유연한 확장
- V, B, H 확장으로 범용성 확보
- 프로파일로 호환성 보장
- 커스텀 확장 공간 예약

---

## 시리즈 마무리

이 시리즈에서 RISC-V ISA의 근본을 다뤘다. 다음 시리즈에서는 베어메탈 부트(B), QEMU 심화(D), 벡터 확장(E)을 다룬다.

---

## 관련 시리즈

- [RISC-V 베어메탈 부트](/blog/systems/riscv/baremetal-boot/chapter01-boot-overview) — OpenSBI, U-Boot, Linux
- [RISC-V QEMU 심화](/blog/tools/emulation/qemu-riscv/chapter01-overview) — 에뮬레이션
- [RISC-V Vector Extension](/blog/systems/riscv/vector-extension/chapter01-overview) — RVV 1.0

---

## 참고 자료

- [RISC-V Specifications](https://riscv.org/technical/specifications/)
- [RISC-V Profiles](https://github.com/riscv/riscv-profiles)
- [RISC-V Extensions Wiki](https://wiki.riscv.org/display/HOME/Recently+Ratified+Extensions)
