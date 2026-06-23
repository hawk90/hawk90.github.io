---
title: "Ch 10: 자동 벡터화와 최적화"
date: 2026-05-17T14:00:00
description: "RVV 자동 벡터화 — GCC/LLVM 옵션, 벤치마크, 튜닝을 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 10
tags: [RISC-V, Vector, Autovectorization, Optimization]
draft: true
---

## 개요

컴파일러의 자동 벡터화와 성능 최적화를 다룬다.

---

## GCC 자동 벡터화

TODO:

```bash
riscv64-linux-gnu-gcc -march=rv64gcv -O3 \
    -ftree-vectorize \
    -fopt-info-vec-optimized \
    test.c -o test
```

---

## Clang 자동 벡터화

TODO:

```bash
clang --target=riscv64 -march=rv64gcv -O3 \
    -Rpass=loop-vectorize \
    test.c -o test
```

---

## 벡터화 가능 루프

TODO:

```c
// 벡터화 가능
for (int i = 0; i < n; i++) {
    c[i] = a[i] + b[i];
}

// 벡터화 어려움 (의존성)
for (int i = 1; i < n; i++) {
    a[i] = a[i-1] + b[i];
}
```

---

## 벡터화 힌트

TODO:

```c
#pragma omp simd
for (int i = 0; i < n; i++) {
    c[i] = a[i] * b[i];
}
```

---

## restrict 키워드

TODO:

```c
void add(int * restrict a, int * restrict b, int * restrict c, int n) {
    for (int i = 0; i < n; i++)
        c[i] = a[i] + b[i];
}
```

---

## VLEN 영향

TODO:

| VLEN | 성능 |
|------|------|
| 128 | 기준 |
| 256 | ~2x |
| 512 | ~4x |
| 1024 | ~8x |

---

## 벤치마크

TODO:

- SPEC CPU 벡터 서브셋
- STREAM
- BLAS 루틴

---

## 튜닝 팁

TODO:

1. 정렬 보장 (`__attribute__((aligned(64)))`)
2. 루프 트립 카운트 정보 제공
3. restrict로 별칭 제거
4. 의존성 제거 패턴
5. 인라인으로 함수 호출 오버헤드 제거

---

## 프로파일링

TODO:

```bash
perf stat -e instructions,cycles ./test
```

---

## 정리

- -O3 -ftree-vectorize로 자동 벡터화
- restrict, 정렬, 힌트로 벡터화 지원
- VLEN에 따라 성능 스케일
- 프로파일링으로 검증

---

## 시리즈 마무리

이 시리즈에서 RISC-V Vector Extension의 핵심을 다뤘다.

---

## 관련 시리즈

- [RISC-V ISA 해부](/blog/systems/riscv/isa-anatomy/chapter01-what-is-riscv) — ISA 기초
- [RISC-V 베어메탈 부트](/blog/systems/riscv/baremetal-boot/chapter01-boot-overview) — 부트 과정
- [RISC-V QEMU 심화](/blog/tools/emulation/qemu-riscv/chapter01-overview) — 에뮬레이션

---

## 참고 자료

- [RISC-V Vector Extension Spec](https://github.com/riscv/riscv-v-spec)
- [rvv-intrinsic-doc](https://github.com/riscv-non-isa/rvv-intrinsic-doc)
- [GCC RISC-V](https://gcc.gnu.org/wiki/RISC-V)
