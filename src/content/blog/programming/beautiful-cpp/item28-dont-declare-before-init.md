---
title: "항목 28: 값을 초기화하기 전까지는 변수를 선언하지 말라"
date: 2026-05-10T17:00:00
description: "선언과 초기화 분리는 C 시절의 잔재 — 미초기화 변수 = UB. 사용 시점 선언 + auto가 정답."
tags: [C++, Initialization, Code Style]
series: "Beautiful C++"
seriesOrder: 28
draft: false
---

## 왜 이 항목이 중요한가?

C89까지는 — 함수 안의 모든 변수를 **함수 시작 부분에 선언**해야 했다. 결과:

```c
int func() {
    int i, j, count, total, max;        /* 시작에 모두 선언 */
    char buf[100];
    /* ... 실제 코드는 한참 후 ... */
}
```

C99 이후 / C++은 — 어디서나 선언 가능. 그러나 옛 스타일이 관성으로 남았다. 문제:

- **미초기화 변수가 함수 시작에** — 읽으면 UB
- 변수가 "무엇을 의미하는지" 사용 직전이 아니라 함수 끝까지 추적해야
- 스코프가 넓어져서 — 다른 곳에서 잘못 변경 가능
- `auto` 같은 모던 도구가 무용 (타입을 미리 정해야 하므로)

C++ 모던 스타일은 — **값을 알게 되는 시점**에 선언 + 초기화. 함수 시작에 미초기화 변수가 떠다니지 않게.

## 핵심 내용

- "선언만 먼저, 대입은 나중에"는 C 시절의 잔재
- **미초기화 변수는 읽기 시 UB**의 원인이고, 정적 분석기조차 놓치는 경우가 있다
- 변수는 **값을 안 시점**에 선언하면 자연스럽게 초기화와 함께 만들어진다
- 결과적으로 변수 스코프가 좁아지고(항목 21), 코드 흐름이 더 직선적
- C++17 구조적 바인딩, `if (auto x = ...; cond)` 등이 이 패턴을 더 쉽게

## 비교 — 미리 선언 vs 사용 시점 선언

### Bad: 미리 선언, 한참 후 대입

```cpp
std::string name;       // 빈 문자열 — 의미 없는 기본 상태
int age;                // 미초기화 — 읽으면 UB
bool valid;

// ... 30줄 후 ...
name = lookup_name(id);
age  = lookup_age(id);

if (some_condition) {
    valid = compute(age);
} else {
    // valid 안 설정! → 이후 사용 시 UB
}

use(name, age, valid);     // valid가 미초기화일 수도
```

문제:
- 선언과 초기화 사이 30줄 — 추적 어려움
- 미초기화 사용 위험
- 일부 분기에서 초기화 안 됨

### Good: 알게 되는 시점에 선언 + 초기화

```cpp
auto name = lookup_name(id);     // 의미 있는 값으로 즉시 초기화
auto age  = lookup_age(id);

bool valid = some_condition ? compute(age) : default_valid;
// valid가 항상 초기화

use(name, age, valid);
```

- 미초기화 변수 0
- `auto`로 자연스럽게 한 줄
- 흐름이 직선

### Even Better: 한 번에 받아 구조적 바인딩

```cpp
auto [name, age, valid] = lookup_user(id);     // C++17

use(name, age, valid);
```

함수가 묶음 반환 — 분해. 변수 선언과 초기화가 한 줄.

### Best: if 초기화 절로 스코프까지 좁히기

```cpp
if (auto user = lookup_user(id); user.is_valid()) {
    use(user);
}     // user는 if 후 사라짐 — 좁은 스코프
```

C++17 `if` 초기화 절 — 변수 라이프타임을 최소.

## 미초기화의 진짜 위험

```cpp
void process() {
    int x;
    if (some_path) x = compute();
    
    return x + 1;     // some_path가 false면 x는 쓰레기 → UB
}
```

컴파일러 경고가 **잡지 못하는 경우**가 많음:
- 다른 함수가 `&x`로 받아 채울 가능성 (컴파일러는 침묵)
- 복잡한 분기로 추적 한계

**해결**: 처음부터 초기화.

```cpp
int x = some_path ? compute() : 0;
```

## auto + 사용 시점 선언

`auto` — 사용 시점 선언과 자연스럽게 결합:

```cpp
auto count = compute_count();      // 타입 자동 추론
auto data  = load_data(path);
auto cfg   = parse_config(args);
```

- 타입을 미리 정할 필요 없음
- 초기화가 강제
- 코드가 간결

## C++17 — if/switch 초기화 절

```cpp
if (auto it = map.find(key); it != map.end()) {
    use(it->second);
}     // it는 if 블록 안에만

if (auto [first, last] = range(); first < last) {
    // ...
}

switch (auto code = get_code(); code) {
    case 0:  /* ... */;
    default: /* ... */;
}
```

가장 좁은 스코프 + 의미 있는 초기화.

## C++20 — range-for 초기화 절

```cpp
for (auto v = compute_vector(); auto& x : v) {     // C++20
    use(x);
}     // v도 for 종료 시 소멸
```

임시 컨테이너의 라이프타임 좁힘.

## 함정 — 정말 분기에서만 결정되는 경우

```cpp
// 의미적으로 둘 중 하나 — 어떻게 표현?
T result;
if (cond) {
    result = compute_a();
} else {
    result = compute_b();
}
```

방법 1 — 즉시 초기화로 분기 표현:

```cpp
T result = cond ? compute_a() : compute_b();     // 삼항 연산자
```

방법 2 — 람다 IIFE:

```cpp
auto result = [&]() {
    if (cond) return compute_a();
    return compute_b();
}();
```

방법 3 — 별도 함수:

```cpp
auto result = compute_choice(cond);
```

거의 모든 경우 — 미초기화 변수를 두지 않고 표현 가능.

## 함정 — `auto`의 함정

```cpp
auto x{};         // ⚠️ 컴파일 에러 — 타입 추론 불가
auto x;           // ⚠️ 컴파일 에러
auto x = 0;       // OK — int
auto x = 0.0;     // OK — double
auto y = {1, 2};  // OK — std::initializer_list<int> (의외)
```

`auto`는 초기화 필요. **이게 좋은 일** — 미초기화 변수 자동 차단.

## 함정 — early returns + initialization

```cpp
auto data = load_data();
if (data.empty()) {
    log("no data");
    return;
}

auto result = process(data);     // 정말 필요한 시점에 선언
```

이른 반환 + 즉시 초기화 — 가장 깔끔한 패턴.

## 클래스 멤버 — DMI (Default Member Initializer)

```cpp
class Widget {
    int count_ = 0;                          // DMI
    std::string name_ = "Untitled";
    std::vector<int> data_{1, 2, 3};
public:
    Widget() = default;
};
```

멤버도 — 선언과 동시에 초기화. 항목 3 참고.

## 함정 — 초기화 비용

```cpp
std::string buf;             // 빈 string 생성 — 매우 가벼움
// 매우 자주 호출되는 함수
std::array<char, 1024> tmp;  // 1024 byte zero-init — 약간의 비용
```

대부분의 타입은 — 초기화 비용 무시 가능. 정말 핫 패스의 큰 배열만 의도적으로 미초기화:

```cpp
std::byte buf[1024];            // 미초기화 (지역 변수)
// 또는
std::vector<std::byte> v(1024); // 0-init (vector는 zero-init)
```

가능한 빨리 초기화로 채우기.

## C++17+ 변형 — std::optional로 지연 초기화

```cpp
std::optional<Widget> w;     // 빈 optional — 미초기화 X (명시적 비어 있음)

if (some_condition) {
    w = Widget{args};         // 나중에 채움
}

if (w) use(*w);
```

지연 초기화가 진짜 필요할 때 — `std::optional`. 미초기화 위험 없음.

## 함정 — POD에서 misleading initialization

```cpp
struct Config { int port; bool secure; };

Config c;           // ⚠️ port, secure 미초기화!
Config c{};         // ✅ 값 초기화 — port=0, secure=false
Config c{8080};     // ✅ port=8080, secure=false (나머지 0)
```

집합(aggregate) 초기화에 — `{}` 명시. 빈 brace로 zero-init.

C++20 designated init:

```cpp
Config c{.port = 8080, .secure = true};
```

## 모던 변형 — `[[indeterminate]]` (C++26 제안 중)

```cpp
// 진짜 미초기화 의도를 명시 (제안)
int x [[indeterminate]];     // 컴파일러가 0-init 생략
```

성능 critical에서 — 명시적으로 미초기화 요청. 현재 표준 아님.

## 표준 도구로 미초기화 검출

```bash
# Clang sanitizer
clang -fsanitize=memory     # uninitialized read 검출 (런타임)

# 정적 분석
clang-tidy --checks='cppcoreguidelines-init-variables'

# 컴파일러 경고
-Wuninitialized
-Wmaybe-uninitialized
```

## 함정 — global / static 변수

```cpp
int global_x;           // ✅ zero-init (static storage duration)
                         //    함수 안의 int x;와 다름
                         
static int counter;     // ✅ zero-init
```

전역/static 변수는 — 자동 zero-init (C++ 표준). 함수 안 지역 변수만 미초기화 위험.

그래도 명시적 초기화 권장 — 의도 명확:

```cpp
int global_x = 0;       // 명시적
```

## 실무 가이드 — 결정

```
변수가 필요하다 — 어디서 선언?
├── 즉시 의미 있는 값으로 초기화 가능 → 그 시점에 선언
├── 분기에서 결정 → 삼항 / 람다 IIFE / 별도 함수
├── 정말 지연 → std::optional
├── 클래스 멤버 → DMI
└── 함수 시작에 미초기화 → 금지
```

## 실무 가이드 — 체크리스트

- [ ] 모든 변수가 **선언과 동시에 초기화**?
- [ ] `auto` 활용으로 자연스러운 초기화?
- [ ] 구조적 바인딩으로 함수 반환 분해?
- [ ] C++17 if/switch 초기화 절로 스코프 좁힘?
- [ ] 클래스 멤버에 DMI?
- [ ] 분기 결정은 삼항/람다/함수로?
- [ ] 컴파일러 경고 활성?

## 정리

선언과 초기화는 **한 줄에서**. "나중에 채울게"라는 핑계로 미초기화 변수를 두지 마라 — UB와 읽는 사람의 인지 부담이 동시에 사라진다.

도구 사다리:
1. **`auto var = init`** — 가장 기본
2. **구조적 바인딩** — 다중 값 분해
3. **`if (init; cond)`** — 스코프까지 좁힘
4. **DMI** — 클래스 멤버
5. **`std::optional`** — 정말 지연 초기화

## 관련 항목

- [항목 3: 기본 멤버 초기화자](/blog/programming/beautiful-cpp/item03-use-default-member-initializers) — 멤버 초기화
- [항목 15: ctor not memset](/blog/programming/beautiful-cpp/item15-use-constructors-not-memset-memcpy) — 객체 초기화
- [항목 21: 스코프 작게](/blog/programming/beautiful-cpp/item21-keep-scope-small) — 좁은 스코프
