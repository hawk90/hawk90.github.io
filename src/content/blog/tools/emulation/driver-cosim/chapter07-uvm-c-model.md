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

검증 팀과 driver 팀이 같은 알고리즘을 각각 다시 구현하면, 두 구현이 어긋났을 때 어느 쪽이 맞는지부터 따져야 합니다. C reference 하나를 공유하면 중복 구현이 사라집니다. 대신 같은 결함을 양쪽이 함께 놓치는 위험이 생기므로, 손으로 계산한 golden vector로 reference 자체를 따로 점검합니다. 이런 구조를 **UVM C reference model** 패턴으로 살펴봅니다.

이 장은 UVM의 핵심 어휘를 짚고, reference model을 C로 두는 이유, driver와의 공유 패턴, 유지 관리 trade-off까지 다룹니다. C reference와 DPI open-array adapter는 macOS 27.2.1(Apple M2 Pro)에서 Homebrew clang 23.1.5와 Verilator 5.054로 실행했습니다. UVM library 자체는 실행하지 않았습니다.

## UVM이란 무엇인가

**UVM**(Universal Verification Methodology)은 SystemVerilog 기반의 *검증 프레임워크*입니다. Accellera가 reference implementation을 배포하고, 표준 번호는 IEEE 1800.2입니다. Accellera 다운로드 페이지의 현재 판은 "UVM v2020.3.2 Library Code for IEEE 1800.2"입니다. 아래 file:line 인용은 GitHub `uvm-core` 저장소에서 받을 수 있었던 최신 tag인 2020.3.1 기준입니다. UVM testbench의 구성 요소를 Accellera `uvm-core` 저장소(GitHub `accellera-official/uvm-core`, tag 2020.3.1, commit 78c0654)의 base class와 주석으로 정리하면 다음과 같습니다.

| 컴포넌트 | base class (파일:줄) | 주석이 적은 역할 |
|----------|------|------|
| **Sequence** | `uvm_sequence` (`src/seq/uvm_sequence.svh:47`) | "create streams of sequence items and/or other sequences" (`:41-42`) |
| **Sequencer** | `uvm_sequencer` (`src/seq/uvm_sequencer.svh:44`) | driver의 pull port가 연결되는 상대 (`uvm_driver.svh:42-44`) |
| **Driver** | `uvm_driver` (`src/comps/uvm_driver.svh:58`) | "initiate requests for new transactions via a uvm_seq_item_pull_port" (`:42-43`) |
| **Monitor** | `uvm_monitor` (`src/comps/uvm_monitor.svh:45`) | "the base class for user-defined monitors" (`:36`) |
| **Agent** | `uvm_agent` (`src/comps/uvm_agent.svh:51`) | "typically contains three subcomponents: a driver, sequencer, and monitor" (`:44-45`) |
| **Scoreboard** | `uvm_scoreboard` (`src/comps/uvm_scoreboard.svh:47`) | "the base class for user-defined scoreboards" (`:37-38`) |
| **Env** | `uvm_env` (`src/comps/uvm_env.svh:44`) | "hierarchical containers of other components" (`:37`) |

**Reference model**에 해당하는 base class는 uvm-core에 없습니다. 기대값을 계산하는 부분은 사용자가 scoreboard 안이나 별도 component로 만들고, 이 장은 그 자리에 C 함수를 둡니다.

UVM은 *재사용 가능한 testbench 구조*에 표준을 부여합니다. 그런데 *reference model*을 SV class로 쓰면 driver 팀이 그 코드를 쓸 수 없습니다. driver는 C로 같은 알고리즘을 *다시* 짜야 하고, 두 구현이 어긋나면 어느 쪽이 맞는지 모호해집니다. 비유하면 시험 출제자와 학원 강사가 모범 답안을 따로 쓰는 상황입니다.

## 어떤 문제를 푸는가

NPU 한 세대를 다시 가정합시다. matrix multiply unit이 들어 있고, 다음 셋이 *기능적으로 같은* 코드를 들고 있어야 합니다.

1. **검증 reference model** — RTL output을 비교할 *expected value* 계산.
2. **driver의 software fallback** — 하드웨어 실패 시 CPU로 동일 결과를.
3. **컴파일러의 emit verifier** — 컴파일러가 생성한 명령 sequence가 동일 출력을 내는지 끝-끝 확인.

세 곳이 각자 알고리즘을 *재구현*하면 *세 가지 진실*이 생기고, 불일치가 나올 때마다 세 구현을 모두 의심해야 합니다. 이 장의 답은 **알고리즘을 C 한 곳에 두고 세 영역이 그것을 link하는 것**입니다.

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

### DPI-C로 scoreboard에 노출

scoreboard 쪽에서는 open array로 C reference를 import합니다. 처음에는 기대값 배열을 `output int C[]`로 선언하고 dynamic array를 넘겼는데, Verilator 5.054가 거부했습니다.

```text
%Error: sb.sv:12:30: DPI output open array argument 'C' may not be passed a dynamic array or queue (IEEE 1800-2023 7.7)
```

그래서 `C`를 `inout`으로 바꿨습니다. 아래는 UVM class 없이 module 함수로 쓴 scoreboard 비교 로직입니다. UVM에서는 이 함수를 `uvm_scoreboard`(`uvm_scoreboard.svh:47`)를 상속한 class의 메서드로 옮기고 `$display`를 `` `uvm_error(ID, MSG) `` 매크로(`src/macros/uvm_message_defines.svh:188`)로 바꿉니다. 그 UVM 판은 실행하지 않았습니다.

```systemverilog
import "DPI-C" function int matmul_ref_dpi(
    input  shortint A[],
    input  shortint B[],
    inout  int      C[],
    input  int      M, input int N, input int K
);
function automatic int compare_output(shortint A[], shortint B[], int actual_C[], int M, int N, int K);
  int expected_C[];
  int errors = 0;
  expected_C = new[M*N];
  if (matmul_ref_dpi(A, B, expected_C, M, N, K) != 0) begin
    $display("MATMUL: reference input invalid or result overflow");
    return -1;
  end
  foreach (actual_C[i])
    if (actual_C[i] !== expected_C[i]) begin
      $display("MATMUL mismatch at %0d: got %0d expected %0d", i, actual_C[i], expected_C[i]);
      errors++;
    end
  return errors;
endfunction
```

SV 선언의 open array는 C 쪽에서 raw pointer가 아니라 `svOpenArrayHandle`로 전달됩니다. Verilator가 생성한 prototype도 그렇습니다.

```c
extern int matmul_ref_dpi(const svOpenArrayHandle A, const svOpenArrayHandle B, const svOpenArrayHandle C, int M, int N, int K);
```

따라서 C core의 `const int16_t *` 인자와 바로 연결되지 않습니다. 다음 wrapper는 1D 배열 길이와 차원을 확인하고 simulator가 연속 storage를 제공하는 경우에만 core를 부릅니다. `svGetArrayPtr`가 NULL을 반환하는 layout을 지원하려면 element-wise copy 경로를 추가해야 합니다.

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

빌드에서도 한 번 막혔습니다. Verilator는 `--binary`에 넘긴 `.c` 파일을 C++ 컴파일러로 컴파일해서 `matmul_ref_dpi`가 C++ 이름으로 mangling됐고, link 단계가 `Undefined symbols ... "_matmul_ref_dpi"`로 실패했습니다. C 파일을 C 컴파일러로 따로 묶어 넘기면 해결됩니다.

```text
$ VLTSTD=/opt/homebrew/Cellar/verilator/5.054/share/verilator/include/vltstd
$ cc -std=c11 -O2 -Wall -c -I$VLTSTD matmul-dpi-adapter.c matmul_ref.c checked-count.c && ar rcs libmatmul.a matmul-dpi-adapter.o matmul_ref.o checked-count.o
$ verilator --binary -j 0 sb.sv libmatmul.a
$ ./obj_dir/Vsb
good DUT: errors=0
MATMUL mismatch at 2: got 42 expected 43
bad DUT:  errors=1
MATMUL: reference input invalid or result overflow
overflow: rc=-1
MATMUL: reference input invalid or result overflow
wrong size (M=3): rc=-1
```

정상 DUT 출력, index 2에 오류를 넣은 DUT 출력, int32 overflow가 나는 입력, 배열 크기와 맞지 않는 M=3을 차례로 넣었습니다. Verilator 5.054는 dynamic array에 대해 `svGetArrayPtr`가 연속 storage를 돌려줘서 core까지 도달했고, 크기가 틀린 호출은 adapter의 `svSize` 검사에서 거절됐습니다.

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

공유 C reference가 expected를 계산해 비교합니다. 다만 reference 자체의 결함은 이 비교로 드러나지 않으므로, 손으로 계산한 golden vector로 reference를 따로 검사합니다. `[1 2; 3 4] × [5 6; 7 8] = [19 22; 43 50]`, int16 최솟값끼리의 곱 두 개가 int32를 넘는 경우(-2 반환), 잘못된 차원(-1 반환)을 host에서 ASan/UBSan으로 돌렸습니다.

```text
$ clang -std=c11 -Wall -Wextra -g -fsanitize=address,undefined matmul_ref.c checked-count.c check.c -o check && ./check
golden [19 22 43 50], overflow -> -2, 1x1x1 extreme = 1073741824, invalid -> -1: passed
```

### driver의 software fallback

driver의 fallback도 같은 함수를 부릅니다. 이전 판은 `matmul_ref`의 반환값을 버리고 항상 0을 돌려줬는데, 그러면 overflow(-2)나 잘못된 차원(-1)이 성공으로 보고됩니다. 반환값을 그대로 올려야 합니다.

```c
// my_driver.c (스케치: struct device와 hw_matmul은 driver 쪽 정의)
int my_driver_matmul(struct device *dev, const int16_t *A, const int16_t *B,
                     int32_t *C, int M, int N, int K) {
    if (dev->state == DEVICE_HEALTHY)
        return hw_matmul(dev, A, B, C, M, N, K);
    return matmul_ref(A, B, C, M, N, K);   /* 동일 알고리즘, 오류 코드도 그대로 */
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

- **언어 친화도** — driver 팀은 C를 씁니다. reference를 SV class로 두면 driver 팀이 읽고 고치기 어렵습니다.
- **포팅성** — C ABI는 Python(`ctypes`)·Rust(`extern "C"`)·Go(`cgo`)에서 부를 수 있습니다. 4장에서 ctypes로 C callback을 부른 것이 그 예입니다.
- **명시적 ABI 경계** — DPI open array는 wrapper에서 검사하고 C core용 pointer로 바꿉니다. core는 svdpi.h를 몰라도 됩니다.

구현을 C++로 하더라도 공유 헤더는 `extern "C"`의 plain C로 둡니다. 위 빌드에서 본 것처럼 C 선언이 C++로 컴파일되면 symbol 이름이 바뀌어 link가 깨집니다.

## 알고리즘 reference의 도메인 예

이 시리즈가 이 패턴의 적용 후보로 꼽는 도메인입니다. 아래 행은 이 장에서 실행한 matmul을 빼면 설계 제안이며, 해당 분야 제품이 이렇게 한다는 주장이 아닙니다.

| 도메인 | reference 예 | 공유 대상 |
|--------|---------------|----------|
| NPU 연산 | matmul, conv2d, attention, layernorm | driver fallback · compiler verifier · scoreboard |
| FEC/ECC | LDPC encoder, Reed-Solomon | modem firmware · driver · TB |
| Crypto | AES round, SHA-256 | secure driver · HSM TB |
| Video codec | DCT, motion estimate | playback driver · encoder TB |
| Compression | LZ77, Huffman | filesystem driver · TB |

이 패턴을 적용하면 각 후보에서 reference C 한 벌이 *기능적 진실* 역할을 합니다. 이 장에서 실행한 것은 matmul뿐입니다.

## Coverage feedback — reference로 coverage 채우기

reference model은 *output*만 만들 게 아닙니다. *path*를 기록해 coverage로 환산할 수 있습니다.

```c
struct cov { unsigned vec_dot, large_inner, signed_input; };
static int any_negative(const int16_t *v, int n) { for (int i = 0; i < n; ++i) if (v[i] < 0) return 1; return 0; }
int matmul_ref_with_cov(const int16_t *A, const int16_t *B, int32_t *C,
                        int M, int N, int K, struct cov *cov) {
    int rc = matmul_ref(A, B, C, M, N, K);
    if (rc != 0) return rc;                 /* record coverage only for valid calls */
    if (M == 1) cov->vec_dot++;             /* 1×K · K×N 케이스 */
    if (K > 64) cov->large_inner++;         /* 큰 inner dim */
    if (any_negative(A, M * K) || any_negative(B, K * N)) cov->signed_input++;
    return 0;
}
```

음수가 섞인 2×2와 1×2 입력을 한 번씩 넣으면 hit 수가 다음과 같습니다. `K > 64`는 한 번도 안 맞았으니, 이 test set에는 큰 inner dimension이 빠져 있다는 것이 숫자로 드러납니다.

```text
vec_dot=1 large_inner=0 signed_input=2
```

testbench가 reference를 부르고 나서 `cov`를 UVM covergroup으로 옮기면 *algorithm-level functional coverage*가 됩니다. 그 UVM 연결은 이 장에서 실행하지 않았습니다.

## Maintenance trade-off

이 패턴의 비용도 명확합니다.

- **단일 진실의 책임** — bug 수정이 검증·driver·compiler 셋 모두에 즉시 반영됩니다. 반대로 *어느 한 영역만 임시 우회할 수 없습니다*. 검증을 통과시키려고 reference를 살짝 비틀면 driver의 동작도 같이 바뀝니다.
- **C 인터페이스 동결** — 시그니처를 바꾸면 세 영역과 DPI adapter를 함께 고쳐야 합니다. buffer 소유권·endian·alignment를 헤더에 적어 둡니다.
- **버전 관리** — *RTL이 새 instruction을 추가*할 때 reference도 같은 branch에서 함께 바뀌어야 합니다.

그래서 이 시리즈는 이 패턴을 *출력이 bit 단위로 일치해야 하는 알고리즘*(NPU 연산·FEC·crypto)에만 쓰고, control register 같은 sub-block에는 쓰지 않습니다.

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

- **endian 차이** — driver는 host CPU endian, RTL은 device endian입니다. reference에서 byte 순서 정책을 헤더에 적어 둡니다(2장의 `unpack_words`처럼 shift로 명시).
- **floating-point 순서** — float 덧셈은 결합 법칙이 성립하지 않습니다. 같은 네 값 `{1e8, 1, -1e8, 1}`을 순서대로 더하면 1, 큰 값끼리 먼저 묶어 `(1e8 + -1e8) + (1 + 1)`로 더하면 2가 나왔습니다(`sequential=1 pairwise=2`). RTL accumulator의 덧셈 순서와 reference의 순서가 다르면 bit 단위 비교는 실패합니다. 이 장의 matmul이 정수(int16 × int16 → int64 누적)인 이유입니다.
- **side effect 금지** — reference는 인자만 읽고 쓰는 함수로 둡니다. global state가 있으면 여러 호출 측이 같은 상태를 공유합니다.
- **버전 잠금** — RTL이 *새 feature*를 추가하는 시점에 reference의 호환 동작을 두지 않으면 testbench가 깨집니다.

## 정리

- **UVM C reference model**은 검증·driver·compiler가 같은 알고리즘 구현을 공유해 중복을 줄이는 패턴.
- DPI-C wrapper가 SV array와 C core 사이 ABI 경계를 처리합니다. 공유 reference는 independent golden check와 함께 씁니다.
- Scoreboard와 reference는 다른 것: scoreboard는 *비교*, reference는 *기대값 계산*.
- C로 두는 이유: 언어 친화·포팅성·명시적 ABI 경계. Verilator에서는 output open array에 dynamic array를 넘길 수 없고, C 파일이 C++로 컴파일되면 link가 깨지는 것까지 실행으로 확인했습니다.
- NPU 연산·FEC·crypto·video codec·압축처럼 *알고리즘 자체가 product*인 도메인에 효과적.
- Coverage feedback에도 활용: reference 안에서 path 기록 → UVM coverage로.
- 유지 비용: 단일 진실의 책임·인터페이스 동결·버전 분기. 모든 sub-block에 적용하지는 않음.

## 다음 장 예고

마지막 장에서는 지금까지 다룬 도구(Verilator·DPI-C·CocoTB·BFM·reference model)를 *하나로 묶는* end-to-end cosim 청사진을 봅니다. 실 NPU prototype을 가정한 통합 환경 설계와 CI 파이프라인까지.

## 1차 자료와 실행 환경

- [Accellera UVM 다운로드](https://www.accellera.org/downloads/standards/uvm) — IEEE 1800.2, UVM v2020.3.2
- [accellera-official/uvm-core](https://github.com/accellera-official/uvm-core) tag 2020.3.1(commit 78c0654) — `src/comps/*.svh`, `src/seq/*.svh`, `src/macros/uvm_message_defines.svh:188`
- Verilator 5.054가 생성한 `Vsb__Dpi.h`와 오류 메시지(IEEE 1800-2023 7.7 인용)

실행 환경은 macOS 27.2.1, Apple M2 Pro, Homebrew clang 23.1.5, Apple clang 21.0.0(`cc`), Verilator 5.054입니다(2026-11-16). UVM library, 상용 simulator, compiler verifier는 실행하지 않았습니다.

## 관련 항목

- [Ch 6: Bus Functional Model](/blog/tools/emulation/driver-cosim/chapter06-bfm)
- [Ch 8: End-to-End — Driver + RTL Co-sim](/blog/tools/emulation/driver-cosim/chapter08-end-to-end)
- GoF Design Patterns — Strategy — algorithm interchangeability
- Khorikov Unit Testing — Anti-Patterns — duplicated reference 안티패턴
