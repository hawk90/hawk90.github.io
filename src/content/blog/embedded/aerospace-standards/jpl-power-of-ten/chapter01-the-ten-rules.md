---
title: "NASA JPL Power of 10 — Curiosity, Perseverance 로버의 10가지 규칙"
date: 2026-05-18T01:00:00
description: "Gerard Holzmann이 정리한 *단 10개 규칙*으로 NASA JPL이 화성 로버·우주 탐사선 펌웨어를 안전하게 작성하는 방법."
tags: [jpl, nasa, c, power-of-ten, holzmann, curiosity, perseverance, safety]
series: "NASA JPL Power of 10"
seriesOrder: 1
draft: true
---

2006년 NASA JPL(Jet Propulsion Laboratory)의 Gerard Holzmann이 *단 10개 규칙*으로 *안전 critical 코드*를 정리했다. 화성 로버(Spirit, Opportunity, Curiosity, Perseverance), Cassini-Huygens, Voyager 2의 *update* — JPL의 모든 mission-critical 펌웨어에 적용된다.

MISRA C가 *159 항목*, AUTOSAR C++14가 *340+ 항목*인 데 반해 JPL Power of 10은 *10 rules*뿐이다. 단순함이 *철저한 적용을 가능하게 한다*.

## 출처

```
원문: "The Power of 10: Rules for Developing Safety-Critical Code"
저자: Gerard J. Holzmann
출판: IEEE Computer, vol. 39, no. 6, June 2006, pp. 95-99
조직: NASA JPL Laboratory for Reliable Software (LaRS)
```

Holzmann은 *SPIN model checker* 개발자. *대규모 OS·임베디드 코드 검증* 경험을 *10 rules로 응축*했다.

## 적용 — 일반

JPL Power of 10은 *NASA JPL의 mission-critical SW 코딩 가이드*로 발행. 공개된 적용 사례는 *JPL이 운영하는 다양한 mission* (화성 로버, orbiter 등). 각 mission의 *세부 적용 범위·내부 표준 변형*은 *공식 발표가 있는 경우만* 인용. NASA 외 *항공우주·자동차 산업*에도 *원칙이 영향*을 준 것으로 자주 인용된다.

## 10 Rules — 한눈에

| # | 규칙 | 한 줄 요약 |
|---|------|----------|
| 1 | Simple control flow | `goto`, `setjmp`, `longjmp`, 재귀 금지 |
| 2 | Loops have fixed upper bound | 모든 루프에 *정적으로 입증 가능한 상한* |
| 3 | No dynamic memory after init | `malloc`/`free`는 *초기화 단계만* |
| 4 | Functions ≤ 60 lines | *한 화면*에 들어와야 |
| 5 | Min 2 assertions per function | 평균 *함수당 2 assertion 이상* |
| 6 | Smallest possible variable scope | 변수는 *사용처 가장 가까이* |
| 7 | Check return value | non-void 함수 반환값 *모두 검사* |
| 8 | Limit preprocessor | `#include`, *단순 매크로*만 |
| 9 | Limit pointer use | *single dereferencing*, 함수 포인터 금지 |
| 10 | Compile with all warnings + static analysis | `-Wall -Wextra -Wpedantic` + 도구 |

## Rule 1 — Restrict to simple control flow constructs

> Restrict all code to very simple control flow constructs — do not use goto, setjmp, longjmp, or recursion (direct or indirect).

### 금지

```c
// 위반 — goto
goto cleanup;

// 위반 — setjmp/longjmp
setjmp(env);
longjmp(env, 1);

// 위반 — 재귀 (직접)
int Factorial(int n) {
    return n <= 1 ? 1 : n * Factorial(n - 1);
}

// 위반 — 재귀 (간접)
void Foo(void) { Bar(); }
void Bar(void) { Foo(); }
```

### 이유

- *goto*는 *경로 추론*을 망친다. 정적 분석기가 *모든 가능한 흐름*을 추적 어려움.
- *setjmp/longjmp*는 *비국소 점프* — 함수 종료·자원 해제·스택 정리가 *모두 건너뛰어진다*.
- *재귀*는 *스택 사용량을 정적 분석으로 결정 불가*. 우주선 펌웨어는 *최악 스택 사용량*을 알아야 *안전 마진* 계산 가능.

### 대안

```c
// goto cleanup 대신 — 단일 진입·종료 + 상태 변수
int Process(void) {
    int rc = -1;
    Resource *r1 = NULL, *r2 = NULL;

    if ((r1 = Acquire1()) == NULL) goto cleanup_done;  // ← Power of 10 위반
    /* 단 cleanup pattern 자체는 JPL이 *narrow exception*으로 허용 */

    if ((r2 = Acquire2()) == NULL) goto cleanup_r1;
    /* ... */
    rc = 0;

cleanup_r1:
    Release1(r1);
cleanup_done:
    return rc;
}
```

JPL은 *forward goto + cleanup 패턴*을 *narrow exception*으로 허용. 단 *backward goto*는 절대 금지.

```c
// 재귀 대신 — 명시적 스택
typedef struct {
    Node *stack[MAX_DEPTH];
    size_t top;
} walker_t;

void Walk(Node *root) {
    walker_t w = { .stack = {root}, .top = 1 };
    while (w.top > 0) {
        Node *n = w.stack[--w.top];
        Visit(n);
        if (n->right && w.top < MAX_DEPTH) w.stack[w.top++] = n->right;
        if (n->left  && w.top < MAX_DEPTH) w.stack[w.top++] = n->left;
    }
}
```

스택 깊이가 *컴파일 시 결정*되어 *최악 사용량 명확*.

## Rule 2 — All loops must have a fixed upper bound

> All loops must have a fixed upper bound. It must be trivially possible for a checking tool to prove statically that a preset upper-bound on the number of iterations of a loop cannot be exceeded.

### 금지

```c
// 위반 — 무한 루프
while (1) {
    if (cond) break;
    /* ... */
}

// 위반 — 정적 상한 없음
while (data->next != NULL) {
    data = data->next;
}

// 위반 — 입력 의존
while (read_one_byte() != EOF) {
    /* ... */
}
```

### 권장

```c
// Good — 컴파일 시 명시 상한
for (int i = 0; i < MAX_RETRIES; i++) {
    if (Try()) break;
}

// Good — 상한과 break 결합
for (int i = 0; i < MAX_NODES; i++) {
    if (data->next == NULL) break;
    data = data->next;
}

// Good — fault watchdog 추가
size_t count = 0;
while (count < MAX_BYTES) {
    int c = read_one_byte();
    if (c == EOF) break;
    process(c);
    count++;
}
```

### 이유

*우주선 펌웨어는 영원히 동작*한다. 무한 루프가 *데이터·통신 오류*로 *예상보다 오래 도는 것*이 *시스템 hang*. 모든 루프에 *최대 횟수*가 있어야 *Watchdog로 검출 가능*.

화성 로버는 *수년 동안 자율 동작*. 한 함수에서 *영원히 도는 버그*가 발생하면 *미션 종료*.

## Rule 3 — Do not use dynamic memory allocation after initialization

> Do not use dynamic memory allocation after initialization. The use of malloc and garbage collectors are forbidden.

### 금지 (초기화 후)

```c
void Process(size_t n) {
    char *buf = malloc(n);    // 위반 (초기화 후 malloc)
    /* ... */
    free(buf);
}
```

### 권장

```c
// 옵션 1 — 정적 버퍼
static char g_buf[MAX_BUF];

void Process(size_t n) {
    if (n > MAX_BUF) return;
    /* g_buf 사용 */
}

// 옵션 2 — 정적 풀
typedef struct {
    can_msg_t storage[POOL_SIZE];
    uint8_t used[POOL_SIZE / 8];
} can_pool_t;

static can_pool_t g_can_pool;

can_msg_t *PoolAlloc(void) {
    for (size_t i = 0; i < POOL_SIZE; i++) {
        if (!(g_can_pool.used[i / 8] & (1u << (i % 8)))) {
            g_can_pool.used[i / 8] |= (1u << (i % 8));
            return &g_can_pool.storage[i];
        }
    }
    return NULL;
}
```

### 이유

MISRA Rule 21.3과 동일. 화성 로버 펌웨어가 *malloc 실패*하면 *재시도 불가능* — 지구에서 *몇 시간~몇 분 광속 지연*으로 명령 보낼 수도 없다.

*단편화*는 *수년 운영 후* 갑자기 발생. *초기화 시점*에 모든 메모리를 확정하면 단편화 불가능.

### Initialization 단계의 예외

```c
int InitSystem(void) {
    g_buf = malloc(MAX_BUF);          // OK — 초기화 단계
    if (g_buf == NULL) return -ENOMEM;

    /* ... 다른 정적 풀 초기화 ... */

    InitDone();
    return 0;
}
```

이후 *런타임*에는 *추가 malloc 금지*.

## Rule 4 — No function should be longer than what can be printed on a single sheet of paper

> No function should be longer than what can be printed on a single sheet of paper in a standard reference format with one line per statement and one line per declaration. Typically, this means no more than about 60 lines of code per function.

### 60 줄 한계

```c
// 위반 — 200 줄 함수
int ProcessFrame(Frame *f) {
    /* ... 200 줄 ... */
}

// Good — 함수 분할
int ProcessFrame(Frame *f) {
    if (!ValidateFrame(f)) return -EINVAL;
    DecodeHeader(&f->header);
    DecodePayload(&f->payload);
    return TransmitResult(f);
}
```

### 이유

*한 함수는 한 화면*. 리뷰어가 *스크롤 없이* 전체 로직을 본다.

JPL의 추가 권장:
- *함수당 하나의 의도*. 여러 일을 하면 분할.
- *Cyclomatic Complexity ≤ 10*.
- *중첩 깊이 ≤ 4*.

### 적용 — 검증

```bash
# Lizard로 함수 메트릭 측정
lizard src/ -l c -CCN 10 -L 60 -T nloc=60

# 경고:
# function ProcessFrame in file frame.c has 95 lines, CCN 14
```

## Rule 5 — Min two assertions per function

> The assertion density of the code should average to a minimum of two assertions per function. Assertions are used to check for anomalous conditions that should never happen in real-life executions.

### Assertion 예

```c
int Divide(int a, int b) {
    assert(b != 0);            // precondition
    int result = a / b;
    assert(result * b == a);   // postcondition (정수 나눗셈에 한해)
    return result;
}

void PushToStack(int *stack, size_t *top, size_t cap, int value) {
    assert(stack != NULL);
    assert(top != NULL);
    assert(*top < cap);

    stack[(*top)++] = value;

    assert(*top > 0);
    assert(*top <= cap);
}
```

### 이유

*Assertion이 코드의 가정을 명시*한다. 위반 시 *즉시 검출*. *Production code에 포함 권장* — *silent corruption*보다 *명시적 abort*가 훨씬 낫다.

JPL의 추가 규칙:
- Assertion은 *side effect 없어야*. `assert(x++ > 0);` 금지.
- Assertion 위반 시 *recovery code 정의*. `abort()` 외에 *safe mode 진입* 등.

```c
// JPL 스타일 — 위반 시 safe mode
#define ASSERT(cond) do { \
    if (!(cond)) { \
        log_error("ASSERT failed: " #cond " at " __FILE__ ":%d", __LINE__); \
        EnterSafeMode(); \
    } \
} while (0)
```

### 평균 2개 — 어떻게 측정

```bash
# grep으로 단순 추정
asserts=$(grep -c "assert\|ASSERT" src/*.c)
funcs=$(ctags -x --c-kinds=f src/*.c | wc -l)
ratio=$(echo "$asserts / $funcs" | bc -l)
echo "Assertion density: $ratio per function"
```

평균 2 이상이 *권장 minimum*. *5~10*은 *적극적 방어*.

## Rule 6 — Data objects must be declared at the smallest possible level of scope

> Data objects must be declared at the smallest possible level of scope.

### 회피

```c
// 위반 — 함수 시작에 모든 변수
int Process(int n) {
    int i, j, k;
    int sum = 0;
    int temp;
    char buf[64];

    for (i = 0; i < n; i++) {
        sum += array[i];
    }

    for (j = 0; j < n; j++) {        // j도 위에 선언 — 불필요
        for (k = 0; k < n; k++) {
            /* ... */
        }
    }

    return sum;
}
```

### 권장

```c
// Good — 사용처 가장 가까이
int Process(int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += array[i];
    }

    for (int j = 0; j < n; j++) {
        for (int k = 0; k < n; k++) {
            /* ... */
        }
    }

    return sum;
}
```

### 이유

- *변수 lifetime 명확*. *예상치 못한 재사용* 차단.
- *Maintenance 시 영향 범위 작음*.
- *Compiler optimization* — register allocation 효율적.

## Rule 7 — Check return value, use parameters

> The return value of non-void functions must be checked by each calling function, and the validity of parameters must be checked inside each function.

### 회피

```c
// 위반 — 반환값 무시
strncpy(buf, src, sizeof(buf));
fopen("config", "r");

// 위반 — 인자 검증 없음
void Process(char *data, size_t n) {
    memcpy(internal_buf, data, n);    // data가 NULL이면? n이 너무 크면?
}
```

### 권장

```c
// Good — 반환값 검사
size_t copied = strlcpy(buf, src, sizeof(buf));
if (copied >= sizeof(buf)) {
    log_warn("truncated");
}

FILE *fp = fopen("config", "r");
if (fp == NULL) {
    return -EIO;
}

// Good — 인자 검증
int Process(char *data, size_t n) {
    if (data == NULL) return -EINVAL;
    if (n > INTERNAL_BUF_SIZE) return -E2BIG;

    memcpy(internal_buf, data, n);
    return 0;
}
```

### `(void)` 캐스트로 명시적 무시

```c
// 의도적 무시 — 명시
(void)fclose(fp);     // 실패해도 처리 불가능
```

MISRA Rule 17.7과 동일.

## Rule 8 — Limit the use of the preprocessor

> The use of the preprocessor must be limited to the inclusion of header files and simple macro definitions. Token pasting, variable argument lists (ellipses), and recursive macro calls are not allowed.

### 허용

```c
// OK — include
#include <stdio.h>

// OK — 단순 매크로 상수
#define MAX_BUFFER 256
#define DEBUG_LEVEL 2

// OK — 컴파일 시 분기 (조건부 컴파일)
#ifdef DEBUG
    /* ... */
#endif
```

### 금지

```c
// 위반 — token pasting
#define MAKE_NAME(prefix, suffix) prefix##_##suffix
int MAKE_NAME(can, msg) = 0;

// 위반 — variadic macro
#define LOG(fmt, ...) printf(fmt, __VA_ARGS__)

// 위반 — 함수형 매크로 (side effect 위험)
#define MAX(a, b) ((a) > (b) ? (a) : (b))

// 권장 — inline function
static inline int int_max(int a, int b) {
    return (a > b) ? a : b;
}
```

### 이유

- 매크로 expansion은 *디버거에서 안 보임*.
- *Side effect duplication* (`MAX(i++, j)`).
- *컴파일러 경고 위치 불명확*.

## Rule 9 — Restrict pointer use

> The use of pointers should be restricted. Specifically, no more than one level of dereferencing is allowed. Pointer dereference operations may not be hidden in macro definitions or inside typedef declarations. Function pointers are not permitted.

### 금지

```c
// 위반 — 다중 dereferencing
int ***p;
int x = ***p;     // 3 levels

// 위반 — 함수 포인터
typedef void (*callback_t)(int);
void RegisterHandler(callback_t cb);

// 위반 — typedef 안에 dereference
typedef int (*GetValue)(void);   // 함수 포인터
```

### 허용

```c
// OK — single dereferencing
int *p;
int x = *p;

// OK — pointer to struct (-> 한 단계)
foo_t *f;
f->member = 5;

// 회피 권장이지만 일반적 — 2단 포인터 (argv 등)
int main(int argc, char **argv) { /* ... */ }
```

### 함수 포인터 대안

```c
// 회피 — function pointer table
typedef void (*handler_t)(int);
handler_t handlers[HANDLER_COUNT];

// Good — switch dispatch
void Dispatch(int type, int data) {
    switch (type) {
        case HANDLER_A: HandlerA(data); break;
        case HANDLER_B: HandlerB(data); break;
        case HANDLER_C: HandlerC(data); break;
        default: assert(0); break;
    }
}
```

### 이유

- *Pointer aliasing* 추적이 *정적 분석의 가장 어려운 부분*. 단순할수록 자동 검증 가능.
- *Function pointer*는 *control flow 추론 불가*. CFI(Control Flow Integrity)에서 가장 어려운 영역.

## Rule 10 — Compile with all warnings + static analysis

> All code must be compiled, from the first day of development, with all compiler warnings enabled at the most pedantic setting available. All code must compile without warnings.

### 빌드 옵션

```bash
gcc -std=c99 -pedantic \
    -Wall -Wextra -Werror \
    -Wmissing-prototypes -Wmissing-declarations \
    -Wstrict-prototypes -Wold-style-definition \
    -Wcast-align -Wcast-qual \
    -Wconversion -Wsign-conversion \
    -Wshadow -Wundef \
    -Wnull-dereference \
    -Wfloat-equal -Wdouble-promotion \
    -Wformat=2 -Wformat-security \
    -Winit-self -Wmissing-include-dirs \
    -Wunused -Wuninitialized \
    -Wlogical-op -Wredundant-decls \
    -Wstrict-aliasing=2 \
    -fno-strict-aliasing \
    source.c
```

### 정적 분석

```bash
# Coverity, Polyspace, Helix QAC, clang-analyzer, scan-build
scan-build --use-c++=clang++ make
cppcheck --enable=all --inconclusive --xml -i tests/ src/

# Polyspace (JPL 사용)
polyspace-code-prover -sources-list src.lst -prog mission_app
```

### 이유

> "Even if you don't make these checks part of your build process, they will identify issues that you would otherwise miss."
> — Holzmann

*빌드 첫날부터 모든 경고 활성화*. *나중에 도입*하면 *수천 개 경고*가 쌓여 *처리 불가능*.

## Power of 10 적용 — 통합 예 (가상)

10 rules를 *함께 적용한 예* (가상 통신 모듈):

```c
/* 가상 communication 모듈 — Power of 10 적용 예 */

#define MAX_PACKET_LEN 512
#define MAX_RETRIES    3
#define COMM_TIMEOUT_MS 5000

static uint8_t g_tx_buf[MAX_PACKET_LEN];   /* Rule 3: 정적 버퍼 */
static uint8_t g_rx_buf[MAX_PACKET_LEN];

/* Rule 4: 60줄 이내. Rule 9: 단일 dereference. */
int SendPacket(const Packet *pkt, size_t timeout_ms) {
    /* Rule 7: 인자 검증 */
    if (pkt == NULL) return -EINVAL;
    if (pkt->len > MAX_PACKET_LEN) return -EMSGSIZE;

    /* Rule 5: assertion */
    assert(g_tx_buf != NULL);
    assert(pkt->len > 0);

    /* Rule 2: 고정 상한 루프 */
    int rc = -ETIMEDOUT;
    for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
        rc = SerializePacket(pkt, g_tx_buf, sizeof(g_tx_buf));
        if (rc < 0) return rc;     /* Rule 7: 반환값 검사 */

        rc = TransmitBuffer(g_tx_buf, pkt->len, timeout_ms);
        if (rc == 0) break;

        /* Rule 2: 고정 시간 backoff */
        DelayMs(100 << attempt);
    }

    /* Rule 5: post-condition */
    assert(rc <= 0);
    return rc;
}
```

특징:
- 모든 변수가 *명확한 lifetime*.
- 모든 루프가 *고정 상한*.
- 모든 함수가 *반환값 검사*.
- *60줄 안*에 *완결된 의도*.

## MISRA C와의 관계

```
MISRA C:2012           JPL Power of 10
────────────          ─────────────────
159 항목               10 rules
복잡한 분류            단순한 10가지
Required/Mandatory     모두 strict
도구 의존              개념적 + 도구
ISO 26262 인증         NASA 미션 검증
자동차 산업            우주·항공
```

**JPL Power of 10은 MISRA의 부분집합과 비슷**. 다음 정도 매핑:

| JPL | MISRA |
|-----|-------|
| Rule 1 (goto) | 15.1~15.3 |
| Rule 1 (setjmp) | 21.4 |
| Rule 1 (재귀) | 17.2 |
| Rule 2 (루프 상한) | (간접) Dir 4.1 |
| Rule 3 (동적 메모리) | 21.3 |
| Rule 4 (함수 길이) | (외부 정책) |
| Rule 5 (assertion) | (없음) |
| Rule 6 (변수 스코프) | 8.9 |
| Rule 7 (반환값) | 17.7, Dir 4.7 |
| Rule 8 (매크로) | Dir 4.9, 20.* |
| Rule 9 (포인터) | 11.* , 18.5 |
| Rule 10 (경고 + 정적분석) | Dir 2.1 |

JPL이 *MISRA에 없는 추가 가치*:
- *함수 길이 명시 60줄* (MISRA는 명시 없음)
- *Assertion density 강조* (MISRA는 없음)
- *Simplicity의 우선* (MISRA는 *complete coverage* 추구, JPL은 *human-readable*)

## AUTOSAR C++14와의 관계

비슷한 정신이지만 C++ vs C. JPL은 *주로 C*. AUTOSAR는 *modern C++*.

JPL의 Rule 9 (포인터 제한)이 AUTOSAR에서는 *smart pointer 권장*으로 흡수.

## NASA 내부 추가 가이드라인

JPL Power of 10은 *NASA 전체*가 따르지는 않음. 다른 NASA 가이드라인:

- **NPR 7150.2C** — NASA Software Engineering Requirements (조직 차원 표준)
- **NASA-STD-8719.13C** — Software Safety Standard
- **JPL FSW Coding Standards** — JPL 내부 상세 표준 (Power of 10 + 추가)

NASA Goddard, Ames, Johnson 등 *각 센터마다 추가 변형*.

## 실전 도입 — 권장 단계

```
Phase 1 — Awareness (1주)
  - 팀 전체에 10 rules 소개
  - 현 코드와의 갭 분석

Phase 2 — Compile flags (1주)
  - Rule 10 즉시 적용: -Wall -Wextra -Werror
  - Cppcheck 또는 clang-tidy 도입

Phase 3 — Tool integration (1개월)
  - 정적 분석 baseline 설정
  - CI 통합

Phase 4 — Code refactoring (3~6개월)
  - 가장 큰 함수부터 분할 (Rule 4)
  - 동적 메모리 제거 (Rule 3)
  - 재귀 제거 (Rule 1)

Phase 5 — Assertion enrichment (지속)
  - 모든 함수에 평균 2 assertion (Rule 5)
  - 위반 시 graceful degradation 설계
```

## 비판과 한계

- **너무 단순**: 159+ 규칙의 MISRA에 비해 *세부 case 부족*.
- **함수 길이 60줄은 임의**: 알고리즘에 따라 *더 짧거나 길어야 자연스러움*.
- **C 중심**: C++의 *RAII, exception, template*에 대한 입장 없음.
- **Assertion density 측정 어려움**: *비즈니스 로직과 검사의 비율*이 의미 있는가?

그럼에도 *짧고 강렬*. *Engineering culture 형성*에 효과적.

## 정리

- JPL Power of 10은 *단 10 rules*. 단순함이 강점.
- NASA JPL의 *mission-critical SW 코딩 가이드*.
- MISRA의 부분집합과 비슷. *Assertion density*와 *함수 길이 60줄*이 고유 가치.
- *Compile-first day*부터 모든 경고 활성화.
- *동적 메모리·재귀·goto·setjmp* 금지.
- *루프 상한 정적 입증*. *반환값 모두 검사*.
- Engineering culture 도구로 *대학·신생 회사*에서 도입 권장.
- 원문은 IEEE Computer 2006 — [PDF](https://spinroot.com/gerard/pdf/P10.pdf).

## 관련 항목

- [MISRA C Ch 1 — MISRA란](/blog/embedded/automotive/misra-c/chapter01-introduction)
- [DO-178C Ch 1 — 항공 SW 인증](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [JSF C++ Ch 1 — F-35 코딩 표준](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [ECSS-Q-ST-80C Ch 1 — ESA 표준](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter01-introduction)
- [원문 — The Power of 10 (PDF)](https://spinroot.com/gerard/pdf/P10.pdf)
- [Holzmann — SPIN Model Checker](http://spinroot.com/)
- [NASA NPR 7150.2C](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7150_002D_)
