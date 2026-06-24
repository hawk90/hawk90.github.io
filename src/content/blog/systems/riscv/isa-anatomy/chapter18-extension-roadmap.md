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

확장이 모듈형이라는 건 장점이자 함정이다. 구현마다 확장 조합이 다르면 같은 RISC-V라도 한 바이너리가 모든 칩에서 돌지 않는다. **프로파일**은 "이 등급의 프로세서라면 최소 이 확장들은 보장한다"는 합의된 묶음이다. OS·배포판이 단일 바이너리로 여러 칩을 지원하게 해 파편화를 막는다.

이름은 `RV{A|I}{세대}{U|S}{32|64}` 꼴이다. `A`는 application, `I`는 임베디드, `U`/`S`는 user/supervisor 레벨, 끝 숫자는 비트 폭이다. 예를 들어 `RVA23U64`는 64비트 application 프로파일의 user 레벨 묶음이다.

| 프로파일 | 비준 | 기준선 | 핵심 |
|---------|------|--------|------|
| RVI20 | 2023-03 | RV32I/RV64I | 임베디드 최소 묶음 |
| RVA20 | 2023-03 | RV64GC | 첫 application 프로파일 |
| RVA22 | 2023-03 | RVA20 + Zihintpause·Zic* 등 | 벡터(V)는 *옵션* |
| **RVA23** | **2024-10** | RVA22 + **V·H 필수** | 벡터·하이퍼바이저 의무화 |

RVI20·RVA20·RVA22는 2022년 public review를 거쳐 2023년 3월 v1.0으로 비준됐고, RVA23은 2024년 10월 21일 비준됐다.

RVA23이 분기점이다. 그동안 *옵션*이던 **벡터(V)**와 **하이퍼바이저(H)**를 *필수*로 끌어올렸다. 덕분에 런타임·OS가 "RVA23 칩이면 벡터가 반드시 있다"고 전제하고 빌드할 수 있다. 실제로 **Android의 RISC-V ABI 기준선**이 RVA23이고, **Ubuntu 25.10**은 RVA23을 최소 요구로 못 박아 그 이하 하드웨어 지원을 끊었다. 프로파일이 단순 권고가 아니라 *소프트웨어 생태계의 실질 진입 기준*으로 작동하기 시작한 사례다.

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
