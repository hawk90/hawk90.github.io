---
title: "Chapter 17: Unusual Control Structures"
date: 2026-05-11T17:00:00
description: "비주류 제어 구조 — 다중 return, recursion, goto, 예외. 각각의 정당한 사용."
series: "Code Complete"
seriesOrder: 17
tags: [code-complete, control-flow, McConnell]
draft: true
---

## 이 챕터의 메시지

`if`, `for`, `while` 외에도 — 덜 흔한 제어 구조들이 있다. 다중 return, recursion, goto, 예외.

> 각각 **정당한 사용처가 있다**. 다만 신중함이 필요하다.

## 핵심 내용

- **다중 return** — 가독성 향상에 유용 (가드 절).
- **재귀** — 자연스러운 자료구조에 적합, 깊이 제한 의식.
- **goto** — 거의 모든 경우 X, 정리 코드 외엔 회피.
- **예외** — 정상 흐름이 아닌 비정상 경로에.

## 다중 return

옛 컨벤션은 — **함수당 return 하나**. McConnell은 이 규칙이 너무 엄격하다고 본다.

```c
// 단일 return — 강제하면 불필요한 플래그
int find(int target) {
    int result = -1;
    bool found = false;
    for (int i = 0; i < n && !found; i++) {
        if (data[i] == target) {
            result = i;
            found = true;
        }
    }
    return result;
}

// 다중 return — 자연스러움
int find(int target) {
    for (int i = 0; i < n; i++) {
        if (data[i] == target) return i;
    }
    return -1;
}
```

가독성을 올리는 자리에선 — **다중 return 권장**.

## 재귀

자연스러운 자료구조(트리, 그래프, 분할정복)엔 — 재귀가 가장 명확.

```c
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

### 함정

- **스택 오버플로** — 깊이 제한. 대안 — 반복.
- **성능** — 일부 언어는 재귀 최적화 안 함.
- **추적 어려움** — 디버깅 까다로움.

### 언제 안 쓰나

- 깊이가 크고 예측 불가 (입력 크기 의존).
- 단순 반복으로 풀 수 있음.
- 꼬리 재귀 최적화가 안 되는 언어.

## goto

> McConnell의 견해 — **goto는 거의 모든 경우 회피**한다.

다만 — **C 코드의 정리 패턴**에선 정당할 수 있다.

```c
int process() {
    if (!step1()) goto cleanup;
    if (!step2()) goto cleanup;
    if (!step3()) goto cleanup;
    // 성공
    return 0;
cleanup:
    free_resources();
    return -1;
}
```

C++엔 RAII로 대체. Java/Python엔 try-finally. 사용자가 직접 쓰는 자리는 거의 없다.

### goto가 만드는 함정

- 흐름 추적 어려움.
- 스파게티 코드의 원인.
- 변수 스코프 혼동.

## 예외 (Exceptions)

> 예외는 **비정상 경로**에. 정상 흐름에 쓰면 — 가독성·성능 모두 손해.

```cpp
// Bad — 정상 흐름에 예외
try {
    int idx = container.find(key);
    return container.at(idx);
} catch (NotFoundException) {
    return defaultValue;
}

// Good — 검사 후 결정
auto it = container.find(key);
return it != container.end() ? *it : defaultValue;
```

자세한 패턴은 — [Clean Code Ch 7](/blog/programming/engineering/clean-code/chapter07-error-handling) 참고.

## 정리

- **다중 return** — 가독성 향상에 적극 활용.
- **재귀** — 자연 구조에 자연스러움, 깊이 의식.
- **goto** — 거의 항상 X, C의 정리 패턴 외에는.
- **예외** — 비정상 경로에만.

## 관련 항목

- [Ch 16: Controlling Loops](/blog/programming/engineering/code-complete/ch16-Controlling-Loops)
- [Ch 18: Table-Driven Methods](/blog/programming/engineering/code-complete/ch18-Table-Driven-Methods)
- [Clean Code Ch 7: 에러 처리](/blog/programming/engineering/clean-code/chapter07-error-handling)
