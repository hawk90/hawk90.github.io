---
title: "UVM C Reference Model 통합 — DUT와 황금 모델 비교 검증"
slug: "tools/emulation/driver-cosim/chapter07-uvm-c-model"
date: 2026-05-22T09:07:00
description: "UVM testbench의 reference model을 C로 — driver와 공유."
series: "Driver-RTL Co-simulation"
seriesOrder: 7
tags: [uvm, reference-model, dpi-c, scoreboard, single-source]
draft: false
topics: ["tools", "tools/emulation"]
---

검증 팀과 driver 팀이 같은 알고리즘을 각각 다시 구현하면 동작 차이가 생길 수 있습니다. C reference를 공유하면 중복 구현을 줄일 수 있지만, 같은 결함을 양쪽에서 놓치는 위험은 독립 golden vector로 따로 점검해야 합니다. 이런 구조를 **UVM C reference model** 패턴으로 살펴봅니다.

이 장은 UVM의 핵심 어휘를 짚고, reference model을 C로 두는 이유, driver와의 공유 패턴, 유지 관리 trade-off까지 다룹니다.

## UVM이란 무엇인가

**UVM**(Universal Verification Methodology)은 SystemVerilog 기반의 *검증 프레임워크*입니다. Accellera 표준이며, Cadence/Synopsys/Mentor 모든 상용 simulator가 지원합니다. UVM testbench의 표준 구성:

| 컴포넌트 | 역할 |
|----------|------|
| **Sequence** | transaction 흐름의 시나리오 |
| **Sequencer** | sequence를 driver로 전달 |
| **Driver** | sequencer로부터 받은 transaction을 RTL의 wire 토글로 변환 |
| **Monitor** | RTL의 wire에서 transaction을 다시 추출 |
| **Agent** | sequencer + driver + monitor 묶음 |
| **Scoreboard** | DUT의 출력과 *기대값*을 비교 |
| **Reference Model** | "기대값"을 계산하는 알고리즘 |
| **Env** | 위 모두를 묶는 환경 |

UVM은 *재사용 가능한 testbench 구조*에 표준을 부여합니다. 그런데 한 가지 성가신 문제가 있습니다 — *reference model*이 SV로 작성되면 *driver 팀이 못 씁니다*. driver는 C로 같은 알고리즘을 *다시* 짜야 합니다. 두 구현이 차이가 나면 어느 쪽이 진실인지 모호해집니다.

## 어떤 문제를 푸는가

NPU 한 세대를 다시 가정합시다. matrix multiply unit이 들어 있고, 다음 셋이 *기능적으로 같은* 코드를 들고 있어야 합니다.

1. **검증 reference model** — RTL output을 비교할 *expected value* 계산.
2. **driver의 software fallback** — 하드웨어 실패 시 CPU로 동일 결과를.
3. **컴파일러의 emit verifier** — 컴파일러가 생성한 명령 sequence가 동일 출력을 내는지 끝-끝 확인.

세 곳이 각자 알고리즘을 *재구현*하면 *세 가지 진실*이 생깁니다. 어디서 어긋났는지 추적 비용이 폭증합니다. 답: **알고리즘을 C 한 곳에 두고 세 영역이 그것을 import**.

## 패턴 — C reference + DPI 노출 + driver 공유

전체 그림.

![C Reference Model — Shared Across 3 Domains](/images/blog/driver-cosim/diagrams/ch07-c-ref-fanout.svg)

세 영역 모두 *동일 C 함수*를 호출. 알고리즘 변경은 한 곳만 고치면 됩니다.

### C reference 작성

```c title="matmul_ref.c"
// matmul_ref.c — 모든 곳에서 공유되는 reference
#include <stdint.h>
#include <stddef.h>
#include <limits.h>
int checked_count(int m, int n, int k, size_t *a_count,
                  size_t *b_count, size_t *c_count);

int matmul_ref(const int16_t *A, const int16_t *B,
               int32_t *C, int M, int N, int K) {
    size_t a_count, b_count, c_count;
    if (!A || !B || !C || !checked_count(M, N, K, &a_count, &b_count, &c_count))
        return -1;
    (void)a_count; (void)b_count;
    for (size_t m = 0; m < (size_t)M; m++) {
        for (size_t n = 0; n < (size_t)N; n++) {
            int64_t acc = 0;
            for (size_t k = 0; k < (size_t)K; k++) {
                acc += (int64_t)A[m*(size_t)K + k] * (int64_t)B[k*(size_t)N + n];
            }
            if (acc < INT32_MIN || acc > INT32_MAX) return -2;
            C[m*(size_t)N + n] = (int32_t)acc;
        }
    }
    return 0;
}
```

### DPI-C로 UVM에 노출

```systemverilog
import "DPI-C" function int matmul_ref_dpi(
    input  shortint A[],
    input  shortint B[],
    output int      C[],
    input  int      M, input int N, input int K
);

class matmul_scoreboard extends uvm_scoreboard;
  function void compare_output(shortint A[], shortint B[], int actual_C[], int M, int N, int K);
    int expected_C[];
    expected_C = new[M*N];
    if (matmul_ref_dpi(A, B, expected_C, M, N, K) != 0)
      `uvm_fatal("MATMUL", "reference input invalid or result overflow")
    foreach (actual_C[i]) begin
      if (actual_C[i] !== expected_C[i]) begin
        `uvm_error("MATMUL", $sformatf("mismatch at %0d: got %0d expected %0d",
                                       i, actual_C[i], expected_C[i]));
      end
    end
  endfunction
endclass
```

SV 선언의 open array는 C 쪽에서 raw pointer가 아니라 `svOpenArrayHandle`로 전달됩니다. 따라서 C core의 `const int16_t *` 인자와 바로 연결되지 않습니다. 다음 wrapper는 1D 배열 길이와 차원을 확인하고 simulator가 연속 storage를 제공하는 경우에만 core를 부르는 형태입니다. `svGetArrayPtr`가 NULL을 반환하는 layout을 지원하려면 element-wise copy 경로를 추가해야 합니다.

```c title="matmul-dpi-adapter.c"
#include "svdpi.h"
#include <stdint.h>
#include <stddef.h>
#include <limits.h>
int checked_count(int, int, int, size_t *, size_t *, size_t *);
int matmul_ref(const int16_t *, const int16_t *, int32_t *, int, int, int);
int matmul_ref_dpi(const svOpenArrayHandle A, const svOpenArrayHandle B,
                   const svOpenArrayHandle C, int M, int N, int K) {
    size_t a_count, b_count, c_count;
    if (!A || !B || !C || !checked_count(M, N, K, &a_count, &b_count, &c_count))
        return -1;
    if (a_count > INT_MAX || b_count > INT_MAX || c_count > INT_MAX) return -1;
    if (svDimensions(A) != 1 || svDimensions(B) != 1 || svDimensions(C) != 1 ||
        (size_t)svSize(A, 1) != a_count || (size_t)svSize(B, 1) != b_count ||
        (size_t)svSize(C, 1) != c_count || svLeft(A, 1) != 0 ||
        svLeft(B, 1) != 0 || svLeft(C, 1) != 0 ||
        svRight(A, 1) != (int)a_count - 1 || svRight(B, 1) != (int)b_count - 1 ||
        svRight(C, 1) != (int)c_count - 1)
        return -1;
    const int16_t *a = (const int16_t *)svGetArrayPtr(A);
    const int16_t *b = (const int16_t *)svGetArrayPtr(B);
    int32_t *c = (int32_t *)svGetArrayPtr(C);
    if (!a || !b || !c) return -1;
    return matmul_ref(a, b, c, M, N, K);
}
```

실제 wrapper의 API 지원과 contiguous storage 조건은 사용한 simulator의 DPI 문서와 array fixture로 검증합니다.

`M*N`, `M*K`, `K*N` 계산과 accumulator 범위도 검사해야 합니다. 다음 helper는 dimension 곱을 `size_t` overflow 전에 확인합니다.

```c title="checked-count.c"
#include <stdint.h>
#include <stddef.h>
int checked_count(int m, int n, int k, size_t *a_count,
                  size_t *b_count, size_t *c_count) {
    if (m <= 0 || n <= 0 || k <= 0 || !a_count || !b_count || !c_count)
        return 0;
    if ((size_t)m > SIZE_MAX / (size_t)k ||
        (size_t)k > SIZE_MAX / (size_t)n ||
        (size_t)m > SIZE_MAX / (size_t)n)
        return 0;
    *a_count = (size_t)m * (size_t)k;
    *b_count = (size_t)k * (size_t)n;
    *c_count = (size_t)m * (size_t)n;
    return 1;
}
```

공유 C reference가 expected를 계산해 비교합니다. 다만 양쪽에서 같은 결함을 놓치지 않도록 고정 golden vector나 독립적인 작은 oracle도 둡니다.

### driver의 software fallback

```c
// my_driver.c
int my_driver_matmul(struct device *dev, ...) {
    if (dev->state == DEVICE_HEALTHY) {
        return hw_matmul(dev, A, B, C, M, N, K);
    } else {
        matmul_ref(A, B, C, M, N, K);   // 동일 알고리즘
        return 0;
    }
}
```

알고리즘 한 줄을 고치면 검증·driver·컴파일러 *셋이 동시에* 갱신됩니다.

## Scoreboard vs Reference Model — 헷갈리기 쉬운 둘

처음 UVM을 배우면 이 둘이 섞입니다. 명확히 정리.

| 항목 | Reference Model | Scoreboard |
|------|------------------|------------|
| 무엇을 하는가 | *expected*를 계산 | actual ↔ expected를 비교 |
| 어디에 사는가 | C 라이브러리·SV class | UVM env 안의 별도 컴포넌트 |
| 재사용도 | 도메인 표준(여러 testbench·driver와 공유) | testbench 별로 다를 수 있음 |
| 입력 | 자극(input transaction) | (input transaction, RTL output) |
| 출력 | expected output | pass/fail · log |

비유: reference는 *모범 답안*, scoreboard는 *채점관*.

## C로 작성하는 이유

reference를 *SV class*로 둘 수도 있습니다. 왜 굳이 C인가?

- **언어 친화도** — driver 팀은 C를 씁니다. SV를 강제하면 진입장벽이 생김.
- **포팅성** — Python(`ctypes`)·Rust(`extern "C"`)·Go(`cgo`) 모든 곳에서 사용 가능. compiler verifier 등 다양한 도구에 재사용.
- **성능** — large workload reference 실행이 SV simulator에서보다 빠름.
- **명시적 ABI 경계** — DPI open array를 wrapper에서 검사하고 C core용 buffer로 변환.

C++을 쓰면 좋은 경우도 있지만, *공유 헤더*만 plain C로 두고 구현은 C++로 가는 hybrid도 일반적입니다.

## 알고리즘 reference의 도메인 예

이 패턴이 가장 명확히 빛나는 도메인.

| 도메인 | reference 예 | 공유 대상 |
|--------|---------------|----------|
| NPU 연산 | matmul, conv2d, attention, layernorm | driver fallback · compiler verifier · scoreboard |
| FEC/ECC | LDPC encoder, Reed-Solomon | modem firmware · driver · TB |
| Crypto | AES round, SHA-256 | secure driver · HSM TB |
| Video codec | DCT, motion estimate | playback driver · encoder TB |
| Compression | LZ77, Huffman | filesystem driver · TB |

위 모든 경우에서 reference C 한 벌이 *기능적 진실*입니다.

## Coverage feedback — reference로 coverage 채우기

reference model은 *output*만 만들 게 아닙니다. *path*를 기록해 coverage로 환산할 수 있습니다.

```c
// reference 안에서 path 기록
void matmul_ref_with_cov(const int16_t *A, const int16_t *B, int32_t *C,
                         int M, int N, int K, struct cov *cov) {
    if (M == 1) cov->vec_dot = 1;        // 1×K · K×N 케이스
    if (K > 64) cov->large_inner = 1;    // 큰 inner dim
    if (any_negative(A, M*K) || any_negative(B, K*N)) cov->signed_input = 1;
    // ... 알고리즘
}
```

testbench가 reference를 부르고 나서 `cov`를 UVM coverage로 환산하면, *algorithm-level functional coverage*가 자동으로 모입니다.

## Maintenance trade-off

이 패턴의 비용도 명확합니다.

- **단일 진실의 책임** — bug 수정이 검증·driver·compiler 셋 모두에 즉시 반영. 좋아 보이지만, *어느 한 영역이 임시 우회를 못 함*. 검증을 통과시키려고 reference를 살짝 비틀면 driver의 동작도 같이 바뀝니다.
- **C 인터페이스 동결** — 시그니처 변경은 큰 일. 데이터 buffer가 누구 소유인지·endian·alignment 명시해야.
- **버전 관리** — RTL feature branch와 reference 분기 처리. *RTL이 새 instruction을 추가*할 때 reference도 같이 분기.

이 비용을 감수할 수 있는 것은 *치명적 일치를 보장해야 하는 알고리즘*뿐입니다. 모든 sub-block에 적용하면 오히려 비용이 큽니다. NPU 연산·FEC·crypto처럼 *알고리즘 자체가 product*인 곳에만 적용.

## 코드 조직 예

저장소 layout 한 예:

```text
src/
├─ algo/                  ← single source
│  ├─ matmul_ref.c
│  ├─ matmul_ref.h
│  ├─ conv2d_ref.c
│  └─ conv2d_ref.h
├─ driver/
│  └─ my_driver.c         ← matmul_ref.h include
├─ tb/
│  └─ uvm/
│     ├─ matmul_scoreboard.sv  ← DPI import
│     └─ ...
└─ compiler/
   └─ verifier/
      └─ matmul_check.c   ← matmul_ref.h include
```

`algo/`가 *모든 영역의 입력*이 됩니다. 같은 헤더를 빌드 시 include해서, 각자 다른 binary에 link되지만 *기능은 동일*.

## 흔한 함정

- **endian 차이** — driver는 host CPU endian, RTL은 device endian. reference에서 byte swap 정책을 *문서로 못박아*야 함.
- **floating-point determinism** — reference가 float을 쓰면 host CPU 따라 결과가 다를 수 있음. NPU에서는 보통 fixed-point 또는 bit-exact float subset 사용.
- **side effect 금지** — reference는 *순수 함수* 권장. global state는 모든 호출 측에서 race 위험.
- **버전 잠금** — RTL이 *새 feature*를 추가하는 시점에 reference의 호환 동작을 두지 않으면 testbench가 깨짐.

## 정리

- **UVM C reference model**은 검증·driver·compiler가 같은 알고리즘 구현을 공유해 중복을 줄이는 패턴.
- DPI-C wrapper가 SV array와 C core 사이 ABI 경계를 처리합니다. 공유 reference는 independent golden check와 함께 씁니다.
- Scoreboard와 reference는 다른 것: scoreboard는 *비교*, reference는 *기대값 계산*.
- C로 두는 이유: 언어 친화·포팅성·성능. 배열·정수 범위·소유권은 각 ABI adapter에서 확인합니다.
- NPU 연산·FEC·crypto·video codec·압축처럼 *알고리즘 자체가 product*인 도메인에 효과적.
- Coverage feedback에도 활용: reference 안에서 path 기록 → UVM coverage로.
- 유지 비용: 단일 진실의 책임·인터페이스 동결·버전 분기. 모든 sub-block에 적용하지는 않음.

## 다음 장 예고

마지막 장에서는 지금까지 다룬 도구(Verilator·DPI-C·CocoTB·BFM·reference model)를 *하나로 묶는* end-to-end cosim 청사진을 봅니다. 실 NPU prototype을 가정한 통합 환경 설계와 CI 파이프라인까지.

## 관련 항목

- [Ch 6: Bus Functional Model](/blog/tools/emulation/driver-cosim/chapter06-bfm)
- [Ch 8: End-to-End — Driver + RTL Co-sim](/blog/tools/emulation/driver-cosim/chapter08-end-to-end)
- GoF Design Patterns — Strategy — algorithm interchangeability
- Khorikov Unit Testing — Anti-Patterns — duplicated reference 안티패턴
