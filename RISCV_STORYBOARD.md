# RISC-V 풀 시리즈 스토리보드

RISC-V ISA부터 Vector Extension까지 *근본*을 다루는 5개 sub-series. 총 60+ sections.

---

## 1. 비전

RISC-V는 오픈 ISA로서 임베디드·서버·HPC·AI 가속기 전 영역에서 급성장 중이다. ARM과 달리 스펙이 공개되어 있어 *스펙 기반 학습*이 가능하다. ISA 근본부터 시작해 부트·실습·에뮬레이션·벡터 확장까지 체계적으로 커버한다.

---

## 2. 진행 상태

| Sub-series | 위치 | sections | 상태 |
|---|---|---|---|
| A. RISC-V ISA 해부 | `systems/riscv/isa-anatomy/` | 18 | 계획 |
| B. RISC-V 베어메탈 부트 | `systems/riscv/baremetal-boot/` | 12 | 계획 |
| C. RISC-V 임베디드 실습 | `embedded/riscv-practice/` | 12 | 계획 |
| D. RISC-V QEMU 심화 | `tools/emulation/qemu-riscv/` | 10 | 계획 |
| E. RISC-V Vector Extension | `systems/riscv/vector-extension/` | 10 | 계획 |

**총 62 sections.**

---

## 3. 시리즈별 챕터 매트릭스

### 3.1 A. RISC-V ISA 해부 (18 sections)

근본 시리즈. 다른 모든 시리즈의 선수 지식.

**Part 1 — 기초 (1-5)**

1. RISC-V란 무엇인가 — 역사, 설계 철학, 모듈형 ISA, 네이밍(RV32/64/128, I/M/A/F/D/C)
2. 레지스터와 호출 규약 — x0-x31, ABI 이름(zero, ra, sp, ...), 함수 호출 규약
3. RV32I/RV64I 기본 정수 명령어 — 산술, 논리, 비교, 분기, 점프
4. 메모리 접근 — load/store, 주소 지정, 정렬 요구사항
5. 명령어 인코딩 — R/I/S/B/U/J 포맷, 즉시값 배치, opcode 맵

**Part 2 — 표준 확장 (6-10)**

6. 곱셈·나눗셈 확장 (M) — MUL, MULH, DIV, REM, 성능 고려
7. 원자 연산 확장 (A) — LR/SC, AMO 명령어, 메모리 순서 의미론
8. 단정밀도 부동소수점 (F) — f0-f31 레지스터, 연산, 반올림 모드, fcsr
9. 배정밀도 부동소수점 (D) — F 확장과의 관계, NaN 처리
10. 압축 명령어 (C) — 16비트 인코딩, RVC 매핑, 코드 밀도

**Part 3 — 특권 아키텍처 (11-15)**

11. 특권 모드 개요 — M/S/U 모드, 모드 전환 메커니즘
12. CSR (Control and Status Registers) — mstatus, misa, mtvec, mepc, mcause
13. 예외와 트랩 — 동기/비동기, 트랩 벡터, 핸들러 진입/복귀
14. 인터럽트 — 외부/타이머/소프트웨어, mie/mip, PLIC/CLINT
15. 가상 메모리 — Sv32/Sv39/Sv48/Sv57, 페이지 테이블, satp, TLB

**Part 4 — 고급 주제 (16-18)**

16. 메모리 모델 (RVWMO) — 순서 규칙, fence, acquire/release, 다른 모델과 비교
17. 디버그 확장 — 트리거 모듈, 디버그 모드, JTAG/cJTAG
18. 확장 로드맵 — V(벡터), B(비트조작), H(하이퍼바이저), Zicsr, Zifencei, Zawrs, 프로파일

### 3.2 B. RISC-V 베어메탈 부트 (12 sections)

리셋부터 Linux 커널 진입까지.

**Part 1 — 부트 기초 (1-4)**

1. RISC-V 부트 시퀀스 개요 — 리셋 벡터, 부트 단계, 책임 분리
2. 머신 모드 초기화 — 스택 설정, BSS 클리어, 트랩 벡터, CSR 초기화
3. 하트(Hart) 관리 — mhartid, 멀티하트 부팅, 파킹 루프
4. 메모리 맵과 디바이스 트리 — 주소 공간 레이아웃, DTB 전달

**Part 2 — OpenSBI (5-8)**

5. OpenSBI 개요 — SBI 스펙, 플랫폼 추상화
6. OpenSBI 빌드와 구성 — 플랫폼 포팅, 설정 옵션
7. SBI 호출 규약 — ecall, 함수 ID, 반환값
8. SBI 확장 — 타이머, IPI, RFENCE, HSM, PMU

**Part 3 — U-Boot (9-11)**

9. U-Boot RISC-V 포팅 — 보드 설정, 디바이스 트리
10. U-Boot SPL — 2단계 로더, 메모리 초기화
11. 커널 부팅 — booti/bootm, FDT 전달, 커널 요구사항

**Part 4 — 마무리 (12)**

12. 부트 디버깅 — UART 초기화, 초기 프린트, JTAG, 흔한 문제

### 3.3 C. RISC-V 임베디드 실습 (12 sections)

실제 보드로 손에 익히기.

**Part 1 — 환경 구축 (1-3)**

1. 툴체인 설치 — riscv-gnu-toolchain, LLVM, IDE 설정
2. 보드 선택 가이드 — ESP32-C3, BL602, Longan Nano, SiFive HiFive
3. 개발 환경 — OpenOCD, probe-rs, 디버거 설정

**Part 2 — ESP32-C3 실습 (4-6)**

4. ESP32-C3 개요 — RV32IMC, 메모리 맵, 주변장치
5. 베어메탈 LED 깜빡이기 — GPIO, 링커 스크립트, 스타트업
6. ESP-IDF + FreeRTOS — 빌드 시스템, 태스크 생성

**Part 3 — BL602/BL616 실습 (7-9)**

7. BL602 개요 — RV32IMFC, Wi-Fi/BLE, 메모리 맵
8. bl_mcu_sdk 환경 — 빌드, 플래시, 디버그
9. Zephyr on BL602 — 포팅 상태, 빌드, 예제

**Part 4 — SiFive 실습 (10-12)**

10. SiFive Freedom 보드 — E310, U540, 메모리 맵
11. Freedom Metal — HAL 사용, 인터럽트 핸들링
12. Linux on HiFive — 빌드, 부팅, 드라이버 개발 맛보기

### 3.4 D. RISC-V QEMU 심화 (10 sections)

에뮬레이션으로 하드웨어 없이 실험.

**Part 1 — 기초 (1-3)**

1. QEMU RISC-V 개요 — 지원 머신, 빌드 옵션
2. virt 머신 해부 — 메모리 맵, 가상 디바이스, DTB 자동 생성
3. QEMU + GDB 디버깅 — 브레이크포인트, 레지스터 검사, 싱글 스텝

**Part 2 — 머신별 심화 (4-7)**

4. sifive_e 머신 — E31 코어, 주변장치 모델
5. sifive_u 머신 — U54 코어, S 모드, Linux 부팅
6. opentitan 머신 — 보안 칩, ROM 부팅
7. spike vs QEMU — ISA 시뮬레이터 비교, 용도별 선택

**Part 3 — 고급 (8-10)**

8. 커스텀 디바이스 추가 — MMIO 디바이스 구현
9. QEMU + OpenSBI + U-Boot + Linux — 풀 스택 부팅
10. 성능 측정과 트레이싱 — TCG 프로파일링, -d 옵션

### 3.5 E. RISC-V Vector Extension (10 sections)

RVV 1.0 심화. A 시리즈 완료 후 권장.

**Part 1 — 기초 (1-4)**

1. 벡터 확장 개요 — SIMD vs 벡터, VLA(Vector Length Agnostic), 설계 철학
2. 벡터 레지스터와 CSR — v0-v31, vl, vtype, vlenb, vstart
3. 벡터 타입 설정 — vsetvli/vsetivli, SEW, LMUL, 꼬리/마스크 정책
4. 벡터 메모리 접근 — unit-stride, strided, indexed, segment

**Part 2 — 연산 (5-7)**

5. 정수 벡터 연산 — 산술, 비교, 논리, 시프트
6. 고정소수점·포화 연산 — widening, narrowing, saturating
7. 부동소수점 벡터 연산 — FP 산술, 변환, 비교

**Part 3 — 고급 (8-10)**

8. 마스킹과 조건부 실행 — v0 마스크, vmerge, vcompress
9. Intrinsics 프로그래밍 — rvv-intrinsics, 컴파일러 지원
10. 자동 벡터화와 최적화 — GCC/LLVM 옵션, 벤치마크, 튜닝

---

## 4. 시리즈 간 의존성

```
        ┌────────────────────────────────────────┐
        │         A. ISA 해부 (근본)              │
        └────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ B. 부트   │   │ D. QEMU  │   │ E. 벡터  │
    └──────────┘   └──────────┘   └──────────┘
          │               │
          ▼               │
    ┌──────────┐          │
    │ C. 실습  │◄─────────┘
    └──────────┘
```

- **A는 필수 선수 지식**
- B, D, E는 A 완료 후 병렬 가능
- C는 B 또는 D 중 하나 완료 후 권장

---

## 5. 참고 자료 (모두 무료)

### 공식 스펙

- [RISC-V ISA Specifications](https://riscv.org/technical/specifications/)
  - Unprivileged Spec (Volume 1)
  - Privileged Spec (Volume 2)
  - Debug Spec
  - Vector Extension (RVV 1.0)
- [RISC-V ABI Spec](https://github.com/riscv-non-isa/riscv-elf-psabi-doc)

### 구현체

- [OpenSBI](https://github.com/riscv-software-src/opensbi)
- [U-Boot RISC-V](https://docs.u-boot.org/en/latest/arch/riscv.html)
- [QEMU RISC-V](https://www.qemu.org/docs/master/system/target-riscv.html)
- [Spike ISA Simulator](https://github.com/riscv-software-src/riscv-isa-sim)

### 보드·SDK

- [ESP32-C3 Technical Reference](https://www.espressif.com/en/products/socs/esp32-c3)
- [Bouffalo Lab SDK](https://github.com/bouffalolab/bouffalo_sdk)
- [SiFive Freedom Tools](https://github.com/sifive/freedom-tools)

### 튜토리얼·책

- [RISC-V Reader](http://riscvbook.com/) — Patterson & Waterman
- [RISC-V Assembly Programmer's Manual](https://github.com/riscv-non-isa/riscv-asm-manual)
- [RVV Intrinsics Guide](https://github.com/riscv-non-isa/rvv-intrinsic-doc)

---

## 6. 사용 시나리오

| 독자 | 추천 경로 |
|------|----------|
| ISA 입문자 | A 전체 |
| 임베디드 개발자 | A → B → C |
| 에뮬레이션/가상화 | A → D |
| HPC/SIMD 개발자 | A → E |
| 컴파일러/툴체인 | A → E → B |
| 전체 마스터 | A → B → C → D → E |

---

## 7. 카테고리 추가 필요

`categories.ts`에 추가할 항목:

```typescript
{ id: 'systems/riscv', parent: 'systems', name: 'RISC-V Architecture', description: 'RISC-V ISA, 특권 아키텍처, 벡터 확장, 부트' },
{ id: 'embedded/riscv', parent: 'embedded', name: 'RISC-V Embedded', description: 'ESP32-C3, BL602, SiFive — RISC-V MCU/SoC 실습' },
```

---

## 8. 진행 전략

1. **A 시리즈 스텁 생성** (18편) — 최우선
2. **A 시리즈 1-5편 완성** — 기초 확립
3. **B, D 스텁 생성** — A 진행 중 병렬로
4. **A 완료 후** B·D·E 본격 집필
5. **C는 마지막** — 실제 보드 필요, B·D 완료 후

예상 총 분량: 62편 × 평균 2,000자 = 124,000자+
