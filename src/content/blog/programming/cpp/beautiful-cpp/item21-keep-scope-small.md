---
title: "항목 21: 범위는 작게 유지하라"
date: 2026-05-08T21:00:00
description: "변수 수명을 짧게 — 사용 직전에 선언, if/for 초기화 절, 가독성과 디버깅 모두 개선."
tags: [C++, Scope, Code Style]
series: "Beautiful C++"
seriesOrder: 21
draft: true
---

## 왜 이 항목이 중요한가?

C 시절의 코딩 스타일 — 함수 맨 위에 모든 변수 선언. C89 이전 표준이 강제했고, 관성으로 남았다. 결과:

```c
int func() {
    int i, j, count, total, max;     // 함수 시작 — 무엇이 무엇?
    /* ... 한참 후 ... */
    for (i = 0; i < N; ++i) { /* ... */ }
}
```

- 변수가 함수 전체에 떠다님
- 어디서 사용되는지 추적 어려움
- 초기값이 멀어서 디버깅 시 헷갈림
- 변수 이름 충돌·재사용

C++은 — **사용 직전에 선언, 가능한 좁은 스코프**가 표준 스타일. C++17 `if`/`switch` 초기화 절로 더 좁힐 수 있다. 이 항목은 그 원칙과 도구.

## 핵심 내용

- 변수의 **수명을 짧게** 유지할수록 추론과 디버깅이 쉽다
- 변수는 **사용하기 직전에** 선언
- `if` / `for`의 **초기화 절**(C++17 `if (auto x = f(); x.ok())`)을 활용하면 스코프를 더 좁힐 수 있다
- 큰 함수는 보통 **스코프가 커진 결과** — 함수를 쪼개면 자연히 해결
- 스코프가 작으면 다음에 그 변수를 안 봐도 됨 (인지 부담↓)

## 비교 — 함수 전역 변수 vs 좁은 스코프

### Bad: 변수가 함수 전체에 떠다님

```cpp
int find_first_negative(const std::vector<int>& v) {
    int i = 0;                       // 시작
    int result = -1;
    for (i = 0; i < (int)v.size(); ++i) {     // 다시 i 사용
        if (v[i] < 0) {
            result = i;
            break;
        }
    }
    return result;                   // result 여기까지 살아 있음
}
```

문제:
- `i`와 `result`가 함수 끝까지 살아 있음
- `result`의 초기값(-1)이 왜 -1인지 — 멀리 떨어진 곳에서 의미 발견
- early return 없음 — break + 플래그 패턴

### Good: 사용 직전에 선언, 이른 반환

```cpp
int find_first_negative(const std::vector<int>& v) {
    for (int i = 0; i < (int)v.size(); ++i) {   // i는 for 안에만
        if (v[i] < 0) return i;                  // 찾으면 즉시
    }
    return -1;                                    // 못 찾음
}
```

- `i`는 for 루프 스코프
- `result` 변수 없음 — 흐름이 직접적
- 의도가 코드에서 즉시 보임

## C++17 `if` / `switch` 초기화 절

가장 강력한 모던 도구:

```cpp
// Before C++17
auto it = map.find(key);
if (it != map.end()) {
    use(it->second);
}
// it는 if 후에도 살아 있음 — 더 이상 필요 없는데

// C++17: if 초기화 절
if (auto it = map.find(key); it != map.end()) {
    use(it->second);
}   // it는 여기서 끝 — 깨끗
```

여러 변수도 가능:

```cpp
if (auto [it, inserted] = map.insert({k, v}); inserted) {
    // 새로 삽입됨
} else {
    // 이미 있음 — it가 기존 entry
}
```

switch도:

```cpp
switch (auto status = getStatus(); status) {
    case Status::OK:    /* ... */; break;
    case Status::Error: handle_error(status); break;
}   // status는 switch 후 사라짐
```

## C++20 range-based for의 초기화 절

```cpp
for (auto v = compute_vector(); auto& x : v) {     // C++20
    use(x);
}   // v도 for 끝나면 소멸
```

range-based for에도 초기화 절 추가. 임시 컨테이너 라이프타임 좁힘.

## 블록 스코프로 명시적 좁힘

```cpp
void process() {
    // ── 설정 단계 ──
    {
        Config cfg = loadConfig();
        applyConfig(cfg);
        // cfg는 여기까지만 필요
    }
    
    // ── 작업 단계 ──
    {
        WorkContext ctx;
        doWork(ctx);
    }
    
    // 함수 끝
}
```

`{}` 블록으로 — 변수 라이프타임 명시 한정. 가독성에 도움, RAII 객체 소멸 시점 제어.

## 함정 — 변수 재사용

```cpp
int result;
result = func1();
use1(result);

result = func2();      // 같은 변수 재사용 — 의미 다름
use2(result);
```

같은 이름으로 다른 의미의 값 — "버킷 변수". 가독성 안 좋음.

해결:

```cpp
int r1 = func1();
use1(r1);

int r2 = func2();
use2(r2);
```

또는 블록 스코프:

```cpp
{
    int result = func1();
    use1(result);
}
{
    int result = func2();      // 다른 변수 — 다른 의미
    use2(result);
}
```

## 함정 — 변수가 너무 일찍 선언

```cpp
void process(const std::vector<int>& v) {
    int sum;                          // 초기화 안 됨
    bool found;                       // 초기화 안 됨
    
    if (v.empty()) return;
    
    sum = 0;                          // 한참 후 초기화
    for (int x : v) sum += x;
    
    found = (sum > 100);
    // ...
}
```

미초기화 변수가 함수 시작에 — 위험.

해결:

```cpp
void process(const std::vector<int>& v) {
    if (v.empty()) return;
    
    int sum = 0;
    for (int x : v) sum += x;         // 한 줄로 가능: std::accumulate
    
    bool found = (sum > 100);
    // ...
}
```

각 변수가 사용 직전에 + 의미 있는 초기값.

## 큰 함수의 스코프 — 함수 분리 신호

```cpp
void megaFunction() {
    // 100 줄
    // 변수 30개
    // 모두 함수 전체 스코프
}
```

함수가 길수록 — 변수 스코프도 길어짐. **함수 분리**가 자연스러운 해결.

```cpp
void megaFunction() {
    auto data = loadData();          // 작은 함수
    auto processed = processData(data);  // 또 작은 함수
    saveResults(processed);          // 또
}
```

각 작은 함수 안에서 — 변수 스코프 자연스럽게 좁음.

## C++20 ranges로 스코프 줄임

```cpp
// Before
std::vector<int> filtered;
for (auto x : v) {
    if (x > 0) filtered.push_back(x);
}
int sum = 0;
for (auto x : filtered) sum += x;

// After (C++20 ranges)
int sum = std::accumulate(
    v | std::views::filter([](int x) { return x > 0; }),
    0
);
// 임시 변수 없음
```

ranges로 — 중간 변수 없이 파이프라인.

## 함정 — RAII 객체의 스코프

```cpp
void process() {
    std::lock_guard lock(mu);     // 함수 시작에서 lock
    
    // ... 한참 작업 ...
    
    // 함수 끝까지 lock 유지 — 필요한 만큼만 보유?
}
```

RAII 객체의 라이프타임 = 락 보유 시간. 필요한 부분만 잠그려면 — 블록 스코프:

```cpp
void process() {
    SharedData snapshot;
    {
        std::lock_guard lock(mu);
        snapshot = sharedData;     // 빠르게 복사
    }   // lock 해제
    
    // 시간 오래 걸리는 작업 (lock 없이)
    process(snapshot);
}
```

## 흔한 패턴 — 임시 객체

```cpp
// Before
std::string fullName = firstName + " " + lastName;
log(fullName);
// fullName 더 이상 안 씀

// After
log(firstName + " " + lastName);    // 임시로
```

또는 즉시 사용 후 버려도 OK:

```cpp
{
    auto fullName = firstName + " " + lastName;
    log(fullName);
}
```

`std::string` 같은 무거운 객체는 가능한 빨리 소멸.

## C++17 structured bindings로 명명

```cpp
auto [it, inserted] = map.insert({k, v});
if (!inserted) return;
use(it->second);
```

이름이 분명 + 좁은 스코프 결합.

## 모던 변형 — 람다로 스코프 격리

```cpp
auto result = [&]() {
    // 자체 스코프 — 외부에 영향 X
    int tmp1 = compute1();
    int tmp2 = compute2();
    return tmp1 + tmp2;
}();    // 즉시 호출

// tmp1, tmp2는 람다 안에 갇힘 — 외부에서 안 보임
```

IIFE (Immediately Invoked Function Expression) 패턴. 복잡한 초기화에 유용.

## 실무 가이드 — 결정

```
변수를 어디서 선언?
├── 사용 직전 → 기본
├── if 조건과 결합 → if (init; cond) (C++17)
├── for 루프 카운터 → for(int i=0; ...; ++i)
├── 라이프타임 명시 → {} 블록
├── 복잡한 초기화 → 람다 IIFE
└── 함수 시작에 모두 선언 → C 스타일, 피하기
```

## 실무 가이드 — 체크리스트

- [ ] 변수가 **사용 직전**에 선언되는가?
- [ ] 가능한 좁은 스코프?
- [ ] C++17 if/switch 초기화 절 활용?
- [ ] C++20 range-for 초기화 절?
- [ ] 블록 `{}`로 RAII 라이프타임 제어?
- [ ] 변수 재사용 ("버킷 변수") 피하는가?
- [ ] 함수가 너무 길면 분리?

## 정리

스코프가 작을수록 **버그가 숨을 곳이 줄어든다**. 변수는 사용 직전에 만들고, 가능하면 if/for의 초기화 절로 더 좁혀라.

도구 사다리:
1. **사용 직전 선언** — 기본 원칙
2. **`if (init; cond)`** (C++17) — 조건과 함께 좁힘
3. **블록 `{}`** — RAII 라이프타임 명시
4. **함수 분리** — 큰 함수의 자연스러운 해결
5. **람다 IIFE** — 복잡한 초기화 격리

## 관련 항목

- [항목 5: 한 선언 한 이름](/blog/programming/cpp/beautiful-cpp/item05-one-declaration-per-name) — 변수 선언 규칙
- [항목 6: 단일 반환 X](/blog/programming/cpp/beautiful-cpp/item06-dont-insist-on-single-return) — 이른 반환과 스코프
- [항목 28: 사용 전 초기화](/blog/programming/cpp/beautiful-cpp/item28-dont-declare-before-init) — 초기화 일반
