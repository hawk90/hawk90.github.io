---
title: "항목 3: 가능한 모든 곳에 const를 사용하라"
date: 2025-02-01T12:00:00
description: "const 위치별 의미, 멤버 함수의 const, bitwise vs logical const, mutable, 중복 제거 패턴."
tags: [C++, Effective C++, const]
series: "Effective C++"
seriesOrder: 3
---

## 왜 이 항목이 중요한가?

`const`를 안 붙여도 코드는 동작한다. 그런데 안 붙이면 다음 세 가지를 잃는다.

- **컴파일러의 도움**. const가 없으면 의도하지 않은 수정도 컴파일러가 통과시킨다. const가 있으면 "여기 수정하면 안 됨"이 문법 수준에서 강제된다.
- **인터페이스의 정직함**. `void f(std::string& s)`와 `void f(const std::string& s)`는 호출자에게 완전히 다른 약속을 한다. 후자는 "내 객체 안 건드린다"를 시그니처에 박는다.
- **멀티스레드 안전성**. 표준은 const 멤버 함수가 thread-safe라고 가정한다 ([항목 16, EMC](/blog/programming/cpp/effective-modern-cpp/item16-make-const-member-functions-thread-safe)). const는 단순한 표식이 아니라 동시성 규약이다.

이 항목은 const가 들어갈 수 있는 다섯 자리(변수·매개변수·반환·멤버 함수·멤버 변수)와, 가장 헷갈리는 두 가지 — **bitwise vs logical const**, **const/non-const 멤버 함수 중복 제거 패턴** — 을 정리한다.

## 개요

`const`는 "이 값/포인터/객체는 수정되지 않는다"는 **약속을 컴파일러에 박는 도구**다. 사용자에겐 의도를 알리고, 컴파일러에겐 최적화 기회를 주며, 실수로 인한 수정을 컴파일 타임에 차단한다. **가능한 모든 자리에 `const`를 박는 습관**이 코드의 안전성과 가독성을 동시에 끌어올린다.

## 필수 개념: const는 어디에 붙는가

> **초보자를 위한 배경 지식**

<br>

`const`는 변수·매개변수·반환 타입·멤버 함수·멤버 변수 다섯 자리에 모두 붙을 수 있다.

```cpp
const int x = 0;                       // 1) 변수
void f(const std::string& s);          // 2) 매개변수
const Rational operator*(...);         // 3) 반환 타입
int Container::size() const;           // 4) 멤버 함수 (const this)
struct S { const int id; };            // 5) 멤버 변수
```

각 위치마다 막는 것이 다르다. 차근차근 보면 모두 같은 원리다. "**무엇이 수정되지 않는가**"의 답이 다를 뿐이다.

## 포인터와 const — 왼쪽 / 오른쪽 규칙

```cpp
char greeting[] = "Hello";

char*       p1 = greeting;   // pointer / data 둘 다 변경 가능
const char* p2 = greeting;   // data const  (가리키는 문자 변경 X)
char* const p3 = greeting;   // pointer const (다른 곳을 가리킬 수 X)
const char* const p4 = greeting;   // 둘 다 const
```

**규칙**: `*` 왼쪽에 있는 `const`는 **데이터** const, `*` 오른쪽에 있는 `const`는 **포인터** const다.

```cpp
*p2 = 'h';     // ❌ const data
 p2 = nullptr; // ✅ pointer는 자유

*p3 = 'h';     // ✅ data는 자유
 p3 = nullptr; // ❌ const pointer
```

복잡한 예시도 같은 규칙으로 풀린다.

```cpp
const int* const* p;       // p: pointer to (const pointer to const int)
int* const* const p;       // p: const pointer to (const pointer to int)
```

읽는 요령은 이렇다. `*` 기호를 기준으로 안쪽부터 바깥으로 풀어 읽는다.

### 동서 const — `int const` vs `const int`

`const`는 타입의 왼쪽이든 오른쪽이든 둘 수 있다 (단, `*` 위치는 다르게 동작).

```cpp
const int x = 5;   // "west const"
int const y = 5;   // "east const" — 동일 의미

const int* p;      // p가 가리키는 int가 const
int const* q;      // 동일 — int 다음의 const, 즉 가리키는 int가 const
```

**east const 스타일**은 "오른쪽에서 왼쪽으로 읽기" 규칙이 일관되어 복잡한 타입에서 헷갈림이 적다. 다만 코드베이스 컨벤션을 따르는 게 우선이다.

## 반복자와 const — STL의 두 종류

```cpp
std::vector<int> v{1, 2, 3};

// 1) const iterator — 포인터 자체가 const (T* const)
const std::vector<int>::iterator it = v.begin();
*it = 10;     // ✅ 데이터 수정 OK
++it;         // ❌ 자기 자신은 const

// 2) const_iterator — 데이터가 const (const T*)
std::vector<int>::const_iterator cit = v.begin();
*cit = 10;    // ❌ 데이터 수정 불가
++cit;        // ✅ 반복자는 자유
```

**보통 원하는 건 두 번째**(`const_iterator`)다. 컨테이너의 원소를 읽기만 할 때다.

C++11+ `cbegin`/`cend`로 더 간결하게 쓸 수 있다.

```cpp
for (auto it = v.cbegin(); it != v.cend(); ++it) {
    // *it는 const& — 수정 불가
}
```

C++17+ `std::as_const`도 있다.

```cpp
for (const auto& x : std::as_const(v)) {
    // v를 const 참조로 본 뷰 — 의도 명시
}
```

## 반환값에 const — 의도치 않은 대입 차단

```cpp
class Rational { /* ... */ };

const Rational operator*(const Rational& a, const Rational& b);

Rational a, b, c;
(a * b) = c;     // ❌ const 반환 덕분에 컴파일 에러 — 잘 잡힘
```

`(a * b) = c`는 우연일 가능성이 크다(`==` 오타). 임시 객체에 대입한들 곧 사라지므로 무의미하다. **반환값을 const**로 두면 이런 사고를 컴파일러가 미리 막아 준다.

> 주의 — C++11 이후엔 **이동 의미론** 때문에 `const Rational`이 이동을 차단할 수 있어 `Rational`로 두는 편이 일반적이다. 임시 객체의 의도치 않은 대입 차단은 우선순위가 낮아졌다.

## const 멤버 함수 — this의 const

```cpp
class TextBlock {
    std::string text;
public:
    // const 객체에서 호출 가능 — this는 const TextBlock*
    const char& operator[](std::size_t i) const { return text[i]; }

    // non-const 객체에서 호출 가능
    char&       operator[](std::size_t i)       { return text[i]; }
};

const TextBlock ctb = ...;
ctb[0];          // const 버전 호출 → const char&
TextBlock tb = ...;
tb[0] = 'X';     // non-const 버전 → char&, 대입 가능
```

**오버로드 규칙**: 같은 시그니처에서 `const` 유무만 다르면 별개의 함수다. 객체의 const성에 따라 컴파일러가 선택한다.

### 왜 같은 함수를 두 번 쓰나

`operator[]` 같은 접근자는 **읽기 전용 대상**(const)에도, **쓰기 가능 대상**(non-const)에도 호출되어야 한다. const 객체는 const 멤버 함수만 호출이 가능하다. 그래서 두 버전이 필요하다.

## bitwise const vs logical const

C++ 표준의 const 멤버 함수 정의는 **bitwise const**(객체의 비트가 변경되지 않음)다. 그러나 우리가 직관적으로 원하는 것은 **logical const**(사용자 관점에서 객체 상태가 변경되지 않음)다.

이 둘이 어긋나는 가장 유명한 예를 보자.

```cpp
class CTextBlock {
    char* pText;          // 포인터
public:
    char& operator[](std::size_t pos) const {
        return pText[pos];    // pText 자체는 안 바뀜 → bitwise const OK
                              // 하지만 호출자가 *pText를 마음대로 수정 가능
                              // → logical const는 깨짐
    }
};

const CTextBlock cctb = ...;
char* p = &cctb[0];
*p = 'X';                 // ⚠️ const 객체의 내용이 바뀌었다!
```

**컴파일러는 통과시키지만, 의도를 어긴 코드**다. 반환을 `const char&`로 두는 게 안전하다.

### `mutable` — logical const를 위한 탈출구

캐싱 같은 패턴에서 "객체의 논리적 상태는 안 바뀌지만 내부 캐시는 갱신"하고 싶을 때 쓴다.

```cpp
class Cache {
    mutable bool   cacheValid = false;
    mutable int    cacheValue;
    int            input;
public:
    int getValue() const {
        if (!cacheValid) {
            cacheValue = expensiveCompute(input);   // mutable 덕분에 OK
            cacheValid = true;
        }
        return cacheValue;
    }
};
```

`mutable` 멤버는 const 멤버 함수 안에서도 변경이 가능하다. **객체의 외부 관찰 가능 상태는 그대로**이고, 내부 캐시는 갱신된다.

⚠️ 멀티스레드에서 const 멤버 함수가 mutable 멤버를 만지면 **race**가 발생할 수 있다. `std::mutex`도 mutable로 두고 동기화가 필요하다. 자세한 건 [EMC 항목 16](/blog/programming/cpp/effective-modern-cpp/item16-make-const-member-functions-thread-safe)에서 다룬다.

## non-const 버전이 const 버전을 호출하는 패턴

같은 로직을 const/non-const 두 번 쓰는 건 코드 중복이다. const 버전에 본문을 두고, non-const 버전이 캐스팅으로 위임한다.

```cpp
class TextBlock {
    std::string text;
public:
    const char& operator[](std::size_t i) const {
        // ... 경계 검사, 로깅 등 ...
        return text[i];
    }

    char& operator[](std::size_t i) {
        return const_cast<char&>(                       // 안전한 캐스팅
            static_cast<const TextBlock&>(*this)[i]    // const 버전 호출
        );
    }
};
```

작동 원리는 이렇다.

1. `static_cast<const TextBlock&>(*this)` — 현재 객체를 const 뷰로 본다.
2. `[i]` — const 버전 `operator[]`를 호출해 `const char&`를 반환한다.
3. `const_cast<char&>` — 반환된 const 참조에서 const를 제거한다.

**왜 안전한가**: 호출자는 원래 non-const 객체이므로, 그 객체의 멤버에 대한 const 제거는 정당하다. **반대 방향**(non-const → const 호출)은 **금지**다. const 멤버 함수에서 non-const 함수를 부르면 const 약속이 깨진다.

```cpp
// ❌ 반대 방향은 금지
const char& operator[](std::size_t i) const {
    return const_cast<TextBlock*>(this)->operator[](i);   // 위험!
    // const 객체에 대해 non-const 멤버 함수를 부르면 안 됨
}
```

### C++23 — `deducing this`

C++23부터 **explicit object parameter** 문법이 추가됐다. const/non-const 중복을 한 함수로 줄일 수 있다.

```cpp
class TextBlock {
    std::string text;
public:
    template<typename Self>
    auto&& operator[](this Self&& self, std::size_t i) {
        return std::forward<Self>(self).text[i];
    }
};

TextBlock tb = ...;
const TextBlock ctb = ...;
tb[0] = 'X';     // non-const 호출 → char&
auto c = ctb[0]; // const 호출 → const char&
```

한 함수로 const/non-const/rvalue 세 가지를 모두 처리한다. const_cast 트릭이 사라진다.

## 매개변수에 const — 기본값으로 두라

```cpp
// ✅ const 참조 — 복사 비용 X, 호출자 객체 보호
void printName(const std::string& name);

// ✅ const 값 — 함수 본문에서 매개변수 변경 차단
void process(const int count);

// ✅ 포인터의 두 const
void copy(const char* const src, char* const dst);
```

특히 큰 객체엔 `const T&`, 값 매개변수에도 가능한 `const`다. 함수 본문 안에서 실수로 수정하는 사고를 막아 준다 (인터페이스 시그니처 측면에선 보이지 않지만, 본문 검토 시 도움이 된다).

### C++20 `std::span<const T>` — const 뷰

배열·컨테이너의 const 뷰를 표현하는 표준 도구다.

```cpp
void print(std::span<const int> values) {   // const view
    for (int v : values) std::cout << v << '\n';
}

int arr[] = {1, 2, 3};
std::vector<int> v = {4, 5, 6};
print(arr);   // ✅ 배열
print(v);     // ✅ vector
```

`const std::vector<int>&`보다 유연하다. 배열·deque·subrange 모두 같은 인터페이스로 받는다.

## 모던 변형

### `constexpr` — 컴파일 타임 const

```cpp
constexpr int Limit = 100;        // 컴파일 타임 상수
constexpr int square(int n) { return n * n; }
constexpr int Sq25 = square(5);   // 컴파일 타임에 25
```

`constexpr` ⇒ `const`다 (반대는 아니다). 컴파일 타임에 결정되는 값에 사용한다.

### `const` vs `consteval` vs `constinit`

| 키워드 | 의미 | 컴파일 타임 | 런타임 |
| --- | --- | --- | --- |
| `const` | 변경 불가 | 가능 | 가능 |
| `constexpr` | 변경 불가 + 컴파일 타임 가능 | 가능 | 가능 (함수의 경우) |
| `consteval` | **반드시** 컴파일 타임 (C++20) | 강제 | 불가 |
| `constinit` | 컴파일 타임 초기화 (C++20) | 강제 | 변경 가능 |

### const 람다 (C++11+)

```cpp
auto f = [](int x) { return x * 2; };           // operator() const
auto g = [](int x) mutable { ++x; return x; };  // operator() non-const
```

람다의 `operator()`는 기본이 `const`다. 캡처 변수를 수정하고 싶으면 `mutable`을 붙인다.

## 함정 — C API 인터롭에서 const stripping

C 라이브러리 API가 const-correct하지 않은 경우가 흔하다.

```cpp
// 옛 C 라이브러리
extern void legacy_print(char* str);   // const char*가 아님

void modern_caller(const std::string& s) {
    legacy_print(s.c_str());   // ⚠️ const char* → char* 변환 실패
}
```

해결책은 두 가지다.

```cpp
// 1) const_cast — 라이브러리가 실제로 안 바꿀 거라고 확신할 때
legacy_print(const_cast<char*>(s.c_str()));

// 2) 안전한 복사
std::string tmp = s;
legacy_print(tmp.data());   // C++17부터 data()가 char* 반환
```

`const_cast`는 **라이브러리가 약속을 지킨다고 신뢰**하는 도구다. 실제로 수정하면 UB다 — 특히 `s.c_str()`이 string의 내부 버퍼를 가리키므로 진짜 수정되면 string이 망가진다.

## 실무 가이드 — 체크리스트

코드 리뷰에서 자문할 항목이다.

- [ ] 함수 매개변수는 모두 `const T&` 또는 `const T*`인가? (수정 의도가 없다면)
- [ ] 멤버 함수가 객체를 변경하지 않으면 `const` 붙어 있는가?
- [ ] 컨테이너 순회에 `const_iterator` 또는 const 참조 range-based for?
- [ ] 클래스 멤버 중 변경되지 않는 것 (`id`, `name` 등)은 `const` 멤버?
- [ ] 캐시·로그 같은 내부 가변 상태는 `mutable`로 명시?
- [ ] mutable 멤버가 멀티스레드 환경이면 `mutex`도 mutable로 두고 동기화?
- [ ] C API 인터롭에서 `const_cast` 사용 시 라이브러리가 정말 안 바꾸는가?

## 핵심 정리

1. 가능한 모든 자리에 `const`를 박는다. 매개변수·반환·멤버 함수·멤버 변수다.
2. 포인터의 const는 `*` 왼쪽/오른쪽으로 구분된다. 데이터 vs 포인터다.
3. 멤버 함수 `const`는 오버로드가 가능하다. const/non-const 객체에 다른 동작을 준다.
4. **bitwise const ≠ logical const**다. 포인터 멤버에 주의하고 `mutable`로 명시한다.
5. **코드 중복 제거**: const 멤버에 본문, non-const는 `const_cast`로 위임 (반대는 금지).
6. C++23 `deducing this`로 중복을 한 함수로 줄일 수 있다.

## 관련 항목

- [항목 2: #define보다 const, enum, inline](/blog/programming/cpp/effective-cpp/item02-prefer-consts-enums-and-inlines-to-defines) — 매크로 대신 컴파일러가 보는 상수
- [항목 20: 값 전달보다 const 참조](/blog/programming/cpp/effective-cpp/item20-prefer-pass-by-reference-to-const-to-pass-by-value) — 매개변수 const의 실전
- [항목 21: 객체를 반환할 때는 참조가 아니라 객체로](/blog/programming/cpp/effective-cpp/item21-dont-try-to-return-a-reference-when-you-must-return-an-object) — 반환 const의 한계
- [EMC 항목 16: const 멤버 함수는 thread-safe하게](/blog/programming/cpp/effective-modern-cpp/item16-make-const-member-functions-thread-safe) — const의 멀티스레드 함의
