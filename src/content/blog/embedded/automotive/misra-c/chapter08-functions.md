---
title: "Ch 8: Rule 17 — 함수의 본체, 재귀, 가변인자, 반환값"
date: 2026-05-18T09:00:00
description: "stdarg 금지(R17.1), 재귀 금지(R17.2), 모든 경로 return(R17.4), 반환값 처리(R17.7) — 함수 호출의 안전 계약."
tags: [misra, c, function, recursion, varargs, return-value]
series: "MISRA C"
seriesOrder: 8
draft: true
---

함수는 안전 펌웨어의 *최소 검증 단위*다. 각 함수가 *예측 가능한 호출 계약*을 따라야 단위 테스트와 정적 분석이 의미를 가진다.

## R17 — 함수 호출의 안전성

### Rule 17.1 (Required) — `<stdarg.h>` 가변 인자 금지

```c
// 위반
int log_message(const char *fmt, ...) {
    va_list args;
    va_start(args, fmt);
    vprintf(fmt, args);
    va_end(args);
}
```

`va_list`는 다음 이유로 위험하다.

1. **타입 안전성 없음** — `printf("%d", 3.14)`는 컴파일 통과, 런타임 UB.
2. **인자 개수 검증 불가** — `%d %d %d`에 두 개만 넘기면 스택 쓰레기 읽음.
3. **임베디드에서 비중량** — `vprintf` 구현이 stdio·heap에 의존.

대안:

```c
// Good — 고정 시그니처 + 구조체
typedef struct {
    log_level_t level;
    const char *module;
    const char *message;
    int err_code;
} log_entry_t;

void log_message(const log_entry_t *e);
```

### Rule 17.2 (Required) — 직접·간접 재귀 금지

재귀는 *스택 사용량을 정적 분석으로 결정 불가*하게 만든다. 임베디드 시스템은 *최악 스택 사용량*을 알아야 안전하다.

```c
// 위반 — 직접 재귀
int Factorial(int n) {
    return (n <= 1) ? 1 : n * Factorial(n - 1);
}

// 위반 — 간접 재귀
void Foo(void) { Bar(); }
void Bar(void) { Foo(); }
```

대안: *반복문으로 변환* 또는 *명시적 스택*.

```c
// Good — 반복문
int Factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; i++) result *= i;
    return result;
}

// Tree traversal — 명시적 스택
typedef struct { node_t *stack[MAX_DEPTH]; size_t top; } walker_t;

void Walk(node_t *root) {
    walker_t w = { .stack = { root }, .top = 1 };
    while (w.top > 0) {
        node_t *n = w.stack[--w.top];
        Visit(n);
        if (n->right) w.stack[w.top++] = n->right;
        if (n->left)  w.stack[w.top++] = n->left;
    }
}
```

R17.2 deviation은 *tree·graph 알고리즘*에서 자주 신청된다. 재귀 깊이를 *상수 상한*으로 못박고 *스택 사용량 분석 도구*로 검증.

### Rule 17.3 (Mandatory) — 함수는 사용 전 *prototype 가시*

선언 없이 함수를 호출하면 C89 호환 처리로 *암묵 int* 반환·*인자 검증 누락*이 일어난다. C99에서 폐지됐지만 *Mandatory*로 못박는다.

```c
// 위반
int main(void) {
    Calculate(5);            // 위반 — 선언이 없음
    return 0;
}

int Calculate(int x) { /* ... */ }
```

### Rule 17.4 (Mandatory) — non-void 함수는 모든 경로에서 return

```c
// 위반
int Lookup(int key) {
    if (key > 0) return key;
    // key <= 0 경로에 return 없음 — UB
}
```

GCC `-Wreturn-type`이 같은 검사. C99까지는 *조용히* 0 반환되는 컴파일러도 있었다.

### Rule 17.5 (Advisory) — 배열 인자는 *크기 명시*

```c
// 회피 — 크기 모름
void Process(int arr[]);

// Good — 크기 명시
void Process(int arr[10]);
void Process(int arr[static 10]);    // C99 — 최소 10개 보장
void Process(int *arr, size_t n);    // 더 일반적
```

`int arr[10]`은 함수 시그니처 안에서 `int *`로 *decay*되지만, *문서적 의미*가 추가된다. 일부 도구는 검사한다.

### Rule 17.6 (Mandatory) — 배열 인자에 `static`은 *고정 크기* 보장

```c
// 위반 — static 이지만 size 0
void Foo(int arr[static 0]);

// Good
void Foo(int arr[static 1]);     // 최소 1
```

### Rule 17.7 (Required) — non-void 함수 반환값은 *사용하거나 명시적으로 무시*

D4.7과 같은 정신, Rule로 강제.

```c
// 위반
printf("hello\n");         // 반환값 int (출력된 문자 수) 무시
strcpy(dst, src);           // 반환값 (dst) 무시

// Good 1 — 사용
int written = printf("hello\n");

// Good 2 — 명시적 무시
(void)printf("hello\n");
(void)strcpy(dst, src);
```

`(void)` 캐스트는 *의도적으로 무시함*을 도구·리뷰어에게 알리는 신호다.

GCC `__attribute__((warn_unused_result))`로 함수 측에서 *반환값 사용을 강제*할 수 있다.

```c
[[nodiscard]] int may_fail(void);    // C23
int __attribute__((warn_unused_result)) may_fail(void);   // GCC
```

### Rule 17.8 (Advisory) — 함수 매개변수를 *수정하지 마라*

```c
// 회피
int Process(int x) {
    x = x * 2;        // 매개변수 수정
    return x + 1;
}

// Good — 지역 변수 사용
int Process(int x) {
    int v = x * 2;
    return v + 1;
}
```

매개변수 수정은 *호출자 입장에서 직관에 반한다*(C는 pass-by-value이므로 호출자에 영향은 없지만). 추적성·디버깅에서 *원래 입력*을 잃는다.

## 함수 시그니처 설계 패턴

MISRA 적합 함수는 보통 다음 패턴을 따른다.

```c
/* @requirement SR-CAN-014
 * @return 0 on success, negative errno on failure */
int can_send(const can_msg_t *msg, uint32_t timeout_ms) __attribute__((nonnull(1)));
```

요소별 의미:

- `int` 반환 — 0 성공, 음수 에러 코드.
- `const can_msg_t *msg` — 수정 불가, NULL이면 정의되지 않음(`nonnull`).
- `uint32_t timeout_ms` — 폭 명시, 의미를 변수명에.
- doc 주석으로 *요구사항·반환값 의미* 명시(D3.1).

## 함수 길이·복잡도 — Rule 외 정책

MISRA는 *길이·복잡도*에 명시적 제한을 두지 않는다. 하지만 *Mandatory*는 아니더라도 거의 모든 자동차 프로젝트가 *내부 코딩 표준*에 다음을 둔다.

| 지표 | 일반적 한계 |
|------|------------|
| 한 함수 줄 수 | ≤ 50~100 (한 화면) |
| McCabe 복잡도 | ≤ 10 |
| 매개변수 수 | ≤ 7 |
| 중첩 깊이 | ≤ 4 |

도구(Polyspace, Coverity, SonarQube)가 모두 측정한다.

## 자주 위반되는 항목

| Rule | 위반 빈도 | 흔한 원인 |
|------|----------|----------|
| 17.2 | 중간 | 트리·그래프 알고리즘, 파서 |
| 17.7 | 매우 높음 | `printf` 반환값 무시 습관 |
| 17.8 | 높음 | for loop 카운터 수정 습관 |
| 17.4 | 낮음 | 컴파일러가 보통 잡음 |

## 정리

- 가변 인자(17.1)는 임베디드에 위험하다 — 구조체로 대체.
- 재귀(17.2)는 스택 분석 불가 — 반복문 + 명시적 스택.
- 모든 경로 return(17.4)은 Mandatory.
- 반환값 무시(17.7)는 `(void)` 캐스트로 의도 명시.
- 함수 시그니처는 *요구사항 ID, NULL 정책, 에러 의미*까지 문서화.

## 다음 장 예고

9장은 R21~R22 — 표준 라이브러리와 동적 메모리. malloc 금지, signal, setjmp, errno 사용 정책.

## 관련 항목

- [Ch 7 — 제어흐름](/blog/embedded/automotive/misra-c/chapter07-control-flow)
- [Ch 9 — 메모리·표준 라이브러리](/blog/embedded/automotive/misra-c/chapter09-memory-library)
