---
title: "Ch 9: Intrinsics 프로그래밍"
date: 2025-05-20T13:00:00
description: "RVV Intrinsics — rvv-intrinsics API, 컴파일러 지원을 다룬다."
series: "RISC-V Vector Extension"
seriesOrder: 9
tags: [RISC-V, Vector, Intrinsics, C]
draft: true
---

## 개요

C/C++에서 RVV intrinsics를 사용한 벡터 프로그래밍을 다룬다.

---

## rvv-intrinsics 헤더

TODO:

```c
#include <riscv_vector.h>
```

---

## 데이터 타입

TODO:

```c
vint32m1_t    // SEW=32, LMUL=1
vint32m2_t    // SEW=32, LMUL=2
vfloat32m1_t  // FP32, LMUL=1
vuint8m4_t    // unsigned 8bit, LMUL=4

vbool32_t     // 마스크 (32비트당 1비트)
```

---

## vl 설정

TODO:

```c
size_t vl = __riscv_vsetvl_e32m1(n);
// n개 원소 요청, 실제 vl 반환
```

---

## 로드/스토어

TODO:

```c
vint32m1_t va = __riscv_vle32_v_i32m1(ptr, vl);
__riscv_vse32_v_i32m1(ptr, va, vl);
```

---

## 산술 연산

TODO:

```c
vint32m1_t vc = __riscv_vadd_vv_i32m1(va, vb, vl);
vint32m1_t vd = __riscv_vmul_vx_i32m1(va, scalar, vl);
```

---

## 벡터 덧셈 예제

TODO:

```c
void vadd(int32_t *a, int32_t *b, int32_t *c, size_t n) {
    for (size_t vl; n > 0; n -= vl, a += vl, b += vl, c += vl) {
        vl = __riscv_vsetvl_e32m1(n);
        vint32m1_t va = __riscv_vle32_v_i32m1(a, vl);
        vint32m1_t vb = __riscv_vle32_v_i32m1(b, vl);
        vint32m1_t vc = __riscv_vadd_vv_i32m1(va, vb, vl);
        __riscv_vse32_v_i32m1(c, vc, vl);
    }
}
```

---

## 마스킹

TODO:

```c
vbool32_t mask = __riscv_vmslt_vx_i32m1_b32(va, 0, vl);
vint32m1_t vd = __riscv_vadd_vv_i32m1_m(mask, va, vb, vl);
```

---

## 컴파일

TODO:

```bash
riscv64-unknown-elf-gcc -march=rv64gcv -O2 test.c -o test
```

---

## 컴파일러 지원

TODO:

| 컴파일러 | 지원 버전 |
|----------|----------|
| GCC | 12+ |
| LLVM/Clang | 14+ |

---

## 정리

- riscv_vector.h 헤더
- 타입 네이밍: v{type}{sew}m{lmul}_t
- __riscv_v* 함수명
- vsetvl로 루프 구성

---

## 다음 장 예고

Ch 10에서는 자동 벡터화와 최적화를 다룬다.

---

## 참고 자료

- [rvv-intrinsic-doc](https://github.com/riscv-non-isa/rvv-intrinsic-doc)
