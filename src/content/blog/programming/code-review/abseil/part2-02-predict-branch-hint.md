---
title: "Abseil ABSL_PREDICT_TRUE/FALSE — branch hint"
date: 2026-06-09T09:07:00
description: "Part 2-02: ABSL_PREDICT_TRUE/FALSE — 분기 예측 힌트의 실제 효과, 코드 레이아웃 영향."
series: "Abseil Code Review"
seriesOrder: 7
tags: [cpp, abseil, branch-prediction, performance, base]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: `ABSL_PREDICT_TRUE` / `ABSL_PREDICT_FALSE`는 컴파일러에게 분기 확률을 알려주는 힌트다. 현대 CPU의 분기 예측기는 보통 이를 무시해도 충분히 잘 동작하지만, 코드 레이아웃(hot path 응집)에 미치는 영향은 측정 가능한 만큼 남아 있다.

## 어떤 문제를 푸는가

`if-else`를 만나면 컴파일러는 두 가지를 결정해야 한다.

1. **명령어 순서** — 어느 분기를 fall-through로 둘 것인가.
2. **코드 배치** — 어느 분기를 hot path에 가까이 둘 것인가.

런타임의 분기 예측기는 첫 번째 결정에 점점 덜 의존한다. 그러나 두 번째 결정 — code layout — 은 컴파일 시점에 굳어지고, 런타임이 어떻게 해줄 수 없다. `ABSL_PREDICT_*`는 layout을 위한 힌트다.

## 정의

```cpp
// absl/base/optimization.h에서 발췌
#if ABSL_HAVE_BUILTIN(__builtin_expect)
    #define ABSL_PREDICT_FALSE(x) (__builtin_expect(false || (x), false))
    #define ABSL_PREDICT_TRUE(x)  (__builtin_expect(false || (x), true))
#else
    #define ABSL_PREDICT_FALSE(x) (x)
    #define ABSL_PREDICT_TRUE(x)  (x)
#endif
```

`__builtin_expect`는 GCC/Clang의 표준 builtin이다. MSVC는 같은 기능이 없어 매크로가 그냥 통과한다.

`false ||`로 시작하는 트릭은 인자를 bool로 강제 변환하기 위한 것이다. `int` 값을 직접 expect에 넣으면 0/1 이외의 값에 대해 동작이 미묘해진다.

## 사용 패턴

가장 자주 보는 형태.

```cpp
absl::Status Process(const Request& req) {
    if (ABSL_PREDICT_FALSE(req.IsInvalid())) {
        return absl::InvalidArgumentError("...");
    }
    // hot path
    return DoActualWork(req);
}
```

에러 경로를 `PREDICT_FALSE`로 표시한다. 컴파일러는 hot path의 code layout을 cache-friendly하게 배치하고, 에러 경로는 cold section으로 옮긴다.

## 컴파일러가 실제로 하는 일

clang으로 다음을 컴파일하면.

```cpp
int Sum(int* data, int n) {
    if (ABSL_PREDICT_FALSE(n == 0)) {
        return 0;
    }
    int s = 0;
    for (int i = 0; i < n; ++i) s += data[i];
    return s;
}
```

assembly 결과의 핵심은 두 가지다.

```text
Sum:
    test  %esi, %esi
    je    .L_cold_path        ← 거의 안 가는 곳으로 jump
    xor   %eax, %eax           ← hot path는 fall-through
    ... (loop)
    retq
.L_cold_path:
    xor   %eax, %eax           ← cold section. 보통 함수 끝에 배치
    retq
```

비교: PREDICT 힌트가 없을 때는 cold path가 fall-through일 수도 있다. 컴파일러의 PGO(profile-guided optimization)가 있으면 굳이 힌트가 없어도 같은 결정을 내릴 수 있다.

## ABSL_PREDICT_*의 진짜 효과

세 가지 효과가 있고, 중요도가 다르다.

### 1. Code layout (가장 큼)

cold path가 별도 section으로 분리되면 instruction cache 효율이 올라간다. 큰 함수에서 의미 있다. 작은 함수에서는 효과가 거의 없다.

### 2. 분기 예측 (작음)

현대 CPU는 한 번 본 분기를 거의 완벽하게 예측한다. PREDICT 힌트가 런타임 예측기에 직접 영향을 주지는 않는다. 다만 코드 레이아웃 결정이 간접적으로 분기 예측 패턴에 영향을 줄 수 있다.

### 3. 인라인 결정 (간접)

PREDICT_FALSE로 표시된 경로는 컴파일러가 인라인을 덜 하려 한다. cold path 함수가 따로 호출되면 hot path의 코드 크기가 줄어든다.

## 측정 — 어디까지 의미 있는가

작은 벤치마크로 본 차이.

```cpp
// 시나리오: 1000000번 반복, error rate 0.1%
for (int i = 0; i < 1000000; ++i) {
    if (rand() % 1000 == 0) {  // 0.1%
        DoError();
    } else {
        DoFast();
    }
}
```

| 빌드 | 시간 |
|---|---|
| 힌트 없음, -O2 | 100% (baseline) |
| `PREDICT_FALSE(rand() % 1000 == 0)`, -O2 | 98~100% |
| PGO 적용 | 95~98% |

힌트의 효과는 크지 않다. PGO를 쓰면 힌트와 비슷하거나 더 잘한다. 큰 함수, 복잡한 분기 구조에서는 차이가 더 벌어지지만, 작은 함수에서는 종종 무의미하다.

## 언제 쓰는 게 의미 있는가

다음 조건이 겹치면 효과가 보인다.

1. **함수가 크다** — code layout 효과가 의미 있을 정도.
2. **branch가 자주 일어난다** — hot loop 안.
3. **PGO를 쓰지 않는다** — PGO가 있으면 힌트가 덜 중요.
4. **err/success rate가 명백하게 비대칭** — 99:1 또는 그 이상.

다음 조건에서는 효과가 거의 없다.

- 함수가 작고 인라인됨
- 분기가 한 번만 일어남 (loop 밖)
- 50:50에 가까운 분기

## Abseil 내부의 사용 예

`absl::Status`의 ok 경로가 대표적인 예다.

```cpp
// absl/status/status.h
inline bool Status::ok() const { return rep_ == kOkStatusRep; }

// 호출부 예시
if (ABSL_PREDICT_TRUE(s.ok())) {
    return *value_;
}
return MakeStatusOrError(s);
```

`StatusOr::operator*` 같은 hot accessor에 `PREDICT_TRUE`가 많이 들어가 있다. ok가 99% 이상이라는 가정.

`absl::flat_hash_map`의 lookup도 비슷하다.

```cpp
// 의사 코드
auto it = map.find(key);
if (ABSL_PREDICT_FALSE(it == map.end())) {
    // miss path — 보통 새로 insert
    return DoMissPath();
}
return it->second;
```

cache hit이 흔하다는 가정.

## 코드 리뷰 포인트

```cpp
// 회피 — error path가 hot loop 안에 있는데 힌트 없음
for (auto& x : large_vec) {
    if (x.NeedsSpecialHandling()) {  // 0.01% 발생
        DoSpecial(x);
    } else {
        DoNormal(x);
    }
}

// Good
for (auto& x : large_vec) {
    if (ABSL_PREDICT_FALSE(x.NeedsSpecialHandling())) {
        DoSpecial(x);
    } else {
        DoNormal(x);
    }
}
```

```cpp
// 회피 — 추측만으로 hint를 붙임
if (ABSL_PREDICT_TRUE(user_input_value > 0)) {
    // user_input의 분포를 모르면서 힌트.
    // 실제로는 50:50일 수 있음. 잘못된 hint는 약간의 손해.
}
```

리뷰에서 봐야 할 것:

1. **hot loop인가** — 안쪽이 아니면 거의 의미 없다.
2. **확률이 실제로 비대칭인가** — 측정 없이 추측하면 손해 볼 수 있다.
3. **PGO를 쓰는가** — 쓰면 hint는 부수적.

## 자주 보는 안티패턴

```cpp
// 회피 — 모든 if에 hint 붙이기
if (ABSL_PREDICT_TRUE(x > 0)) {
    if (ABSL_PREDICT_TRUE(y > 0)) {
        if (ABSL_PREDICT_TRUE(z > 0)) {
            ...
        }
    }
}
// 가독성 해치고 효과는 미미.
```

```cpp
// 회피 — error 처리에 PREDICT_TRUE를 잘못 붙임
if (ABSL_PREDICT_TRUE(s.ok())) {
    return *result_;
} else {
    LOG(ERROR) << s;       // 컴파일러가 cold로 배치 — 의도 맞음
    return std::nullopt;
}
// hint 자체는 OK. 다만 ok가 정말 hot인지 확인해야.
```

```cpp
// 회피 — PREDICT를 if-else가 아닌 곳에
return ABSL_PREDICT_TRUE(s.ok()) ? value : default_value;
// 동작은 하지만 ternary에서는 효과 미미. 명시적 if가 낫다.
```

## std와의 비교

C++20의 `[[likely]]` / `[[unlikely]]`가 같은 역할을 한다.

```cpp
// C++20
if (s.ok()) [[likely]] {
    return *value_;
}

// Abseil pre-C++20
if (ABSL_PREDICT_TRUE(s.ok())) {
    return *value_;
}
```

C++20을 쓸 수 있으면 `[[likely]]`가 권장된다. 표준이고, 컴파일러 분기 없이 동작한다. Abseil은 C++17 코드와의 호환을 위해 자체 매크로를 유지한다.

## 정리

- `ABSL_PREDICT_*`는 컴파일러의 code layout을 위한 힌트.
- 가장 큰 효과는 cold path 분리에서 온다. 분기 예측 자체에는 거의 영향 없다.
- 효과를 보려면 함수가 크거나 hot loop 안이어야 한다.
- 측정 없이 hint를 남발하면 손해 볼 수 있다. PGO를 쓰면 hint는 부수적.
- C++20 코드는 `[[likely]]` / `[[unlikely]]`로 옮길 것.

## 다음 편

Part 2-03에서 `absl::LogSeverity`를 본다. 로깅의 첫 단계인 severity가 어떻게 정의되어 있고, 왜 `WARNING`이 아니라 `ABSL_WARNING`인지를 다룬다.

## 관련 항목

- [Part 2-01: ABSL_HAVE_* / ABSL_ATTRIBUTE_*](/blog/programming/code-review/abseil/part2-01-abseil-macros)
- [Part 2-03: absl::LogSeverity](/blog/programming/code-review/abseil/part2-03-log-severity)
- [Part 3-01: absl::Status](/blog/programming/code-review/abseil/part3-01-status) — PREDICT_TRUE가 자주 쓰이는 패턴
- [Beautiful C++: branch hint와 성능](/blog/programming/cpp/beautiful-cpp)
- [원문 — absl/base/optimization.h](https://github.com/abseil/abseil-cpp/blob/master/absl/base/optimization.h)
