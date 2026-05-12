---
title: "항목 26: 변수 정의는 가능한 한 늦춰라"
date: 2025-02-05T10:00:00
description: "사용 직전에 정의 — 불필요한 생성·소멸 회피, 의미 있는 값으로 초기화, 루프 안/밖의 트레이드오프."
tags: [C++, Effective C++, Performance, Initialization]
series: "Effective C++"
seriesOrder: 26
---

## 개요

C 시절의 컨벤션은 함수 시작에 모든 변수를 선언하는 것이었지만, **C++의 변수는 생성자·소멸자라는 무거운 행위가 따라옵니다**. 사용하지 않을 변수까지 함수 도입부에 만들면 — 예외 경로에선 만들었다가 바로 소멸하는 비용. 사용 직전에 의미 있는 초기치로 정의하는 게 효율과 가독성 모두에 유리합니다.

## 함정 1 — 사용 안 될 수도 있는 변수

```cpp
std::string encryptPassword(const std::string& password) {
    std::string encrypted;                              // ⚠️ 일찍 정의

    if (password.length() < MIN_LEN) {
        throw std::logic_error("password too short");
        // encrypted를 사용해 보지도 못함
        // 그러나 이미 만들어졌으므로 unwinding 시 소멸자 호출
    }

    encrypted = password;
    encrypt(encrypted);
    return encrypted;
}
```

**비용**:
- `std::string` 기본 생성 (작지만 0은 아님)
- 예외 경로에서 소멸자 호출
- 사용 안 된 메모리

해결 — **사용 시점**에 정의:

```cpp
std::string encryptPassword(const std::string& password) {
    if (password.length() < MIN_LEN)
        throw std::logic_error("password too short");

    std::string encrypted(password);                    // ✅ 사용 시점, 의미 있는 값
    encrypt(encrypted);
    return encrypted;
}
```

## 함정 2 — 기본 생성 + 대입 vs 직접 초기화

```cpp
// 두 단계 — 비효율
std::string s;            // 1) 기본 생성
s = someValue;            // 2) 복사 대입

// 한 단계 — 효율적
std::string s = someValue;       // copy ctor (한 번에 의도된 값으로)
std::string s(someValue);         // direct init
std::string s{someValue};         // C++11 brace
```

`std::string` 기본 생성도 비용이 0은 아닙니다. 의도된 초기치가 있다면 **그 값으로 직접 생성**하는 게 효율적.

**규칙**: 의미 있는 첫 값이 있다면 그 값으로 초기화. 기본 생성 후 대입은 사실상 "두 번 작업".

## 함정 3 — 분기 안의 변수

```cpp
void process(int code) {
    Widget w;                       // ⚠️ 모든 분기에서 만들지만...
    switch (code) {
        case 0: return;             // ← w를 사용 안 함
        case 1: w.doA(); break;
        case 2: w.doB(); break;
    }
}
```

`case 0`에선 `w`가 무의미. 좁은 스코프로:

```cpp
void process(int code) {
    switch (code) {
        case 0: return;
        case 1: { Widget w; w.doA(); break; }
        case 2: { Widget w; w.doB(); break; }
    }
}
```

또는 더 좁게:

```cpp
void process(int code) {
    if (code == 0) return;
    Widget w;                       // 여기서부터 필요
    if (code == 1) w.doA();
    else if (code == 2) w.doB();
}
```

## 루프 안 vs 밖 — 트레이드오프

```cpp
// A: 루프 밖
Widget w;                            // 1번 생성
for (int i = 0; i < n; ++i) {
    w = expr(i);                      // n번 대입
    // ...
}
// 총: 1 ctor + n 대입 + 1 dtor

// B: 루프 안
for (int i = 0; i < n; ++i) {
    Widget w(expr(i));                // n번 생성·소멸
    // ...
}
// 총: n 생성 + n 소멸
```

비용 비교는 두 요소:
- **(생성 + 소멸) vs 대입** — 생성·소멸이 비싼 타입이면 A 유리
- **scope 좁힘 (B)** — 가독성·안전성 ↑, 깜빡 사용 위험 ↓

| 상황 | 권장 |
| --- | --- |
| 비싼 ctor/dtor + 같은 의미로 재사용 | A (밖) |
| ctor가 가벼움, scope 명확 우선 | B (안) |
| 의심 시 | **B (안)** — 가독성 우선, 측정 후 변경 |

## 함정 4 — 변수 재사용

```cpp
std::string name;
// ... 코드 1 ...
name = "first user";
processFirst(name);

// ... 코드 2 ...
name = "second user";
processSecond(name);
```

한 변수를 다른 의미로 재사용 — "버킷 변수" 패턴. 가독성에 나쁨.

```cpp
{
    std::string name = "first user";
    processFirst(name);
}
// ...
{
    std::string name = "second user";
    processSecond(name);
}
```

각 스코프에 한 가지 의미. 컴파일러도 더 잘 최적화.

## 모던 변형 — 구조적 바인딩 + if-init (C++17)

```cpp
// C++17: if 안에서 변수 정의 — 좁은 scope
if (auto it = m.find(key); it != m.end()) {
    use(it->second);
}
// it는 if 블록 내에서만 존재

// 비슷한 switch-init
switch (auto v = compute(); v) {
    case 0: ...;
    case 1: ...;
}
```

값 정의를 가능한 한 사용 시점에 — 명령형 표현보다 좋음.

## RVO와의 결합

```cpp
std::string encrypt(std::string input) {     // by-value
    // ... input 수정 ...
    return input;     // NRVO — 호출자 위치에 직접
}

std::string s = encrypt(password);            // 무복사
```

C++11+ 이동 의미론으로 by-value sink가 효율적 — 미리 변수 만들고 대입할 필요 없음. **함수 호출 결과를 직접 변수에 묶기**가 좋은 패턴.

## 흔한 함정 — auto와 함께 일찍 정의

```cpp
auto result = compute();      // result는 어떤 타입?
if (cond) {
    result = otherCompute();   // 같은 타입이어야 함
}
```

`auto`는 첫 정의의 타입 — 나중에 다른 타입으로 대입 못 함. 이런 경우 의미가 다른 두 값을 한 변수에 담으려는 시도일 수 있음 — 별도 변수로 나누는 게 보통 더 명확.

## 실무 가이드 — 체크리스트

- [ ] 변수 정의가 **첫 사용 직전**인가?
- [ ] 의미 있는 초기치로 한 번에 초기화? (기본 생성 + 대입 X)
- [ ] 분기/조기 return 전에 정의되지 않았는가?
- [ ] 루프 안/밖 — 비용 비교 후 결정?
- [ ] 한 변수가 여러 의미로 재사용되지 않는가?
- [ ] C++17 if-init / switch-init 활용 가능?

## 핵심 정리

1. **변수는 사용 직전에** 정의 — 예외 경로의 무의미한 ctor/dtor 회피
2. **의미 있는 초기치**로 한 번에 — 기본 생성 + 대입은 두 번 작업
3. **scope를 가능한 좁게** — 가독성·안전성·최적화 기회
4. **루프 안 vs 밖**은 비용 비교 후 결정 — 의심 시 좁은 scope (안)
5. C++17 **if-init / switch-init**로 더 좁은 scope

## 관련 항목

- [항목 4: 객체 초기화](/blog/programming/cpp/effective-cpp/item04-make-sure-objects-are-initialized-before-use) — 초기치의 중요성
- [항목 21: 객체 반환은 값으로](/blog/programming/cpp/effective-cpp/item21-dont-try-to-return-a-reference-when-you-must-return-an-object) — RVO와 함께 변수 회피
- [항목 30: inline의 이해](/blog/programming/cpp/effective-cpp/item30-understand-the-ins-and-outs-of-inlining) — 최적화의 다른 측면
