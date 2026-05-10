---
title: "항목 5: 명시적 타입 선언보다는 auto를 선호하라"
date: 2025-01-05T14:00:00
description: "auto를 사용해야 하는 이유와 명시적 타입 선언보다 나은 점을 알아봅니다."
tags: [C++, auto, Modern C++]
series: "Effective Modern C++"
seriesOrder: 5
---

## 개요

"auto를 쓰면 타입을 모르잖아요!" 맞아요. 하지만 그게 장점입니다. auto는 더 짧고, 더 안전하고, 더 유연한 코드를 만들어줍니다.

## auto의 장점들

### 1. 초기화 강제 = 더 안전한 코드

```cpp
int x1;         // 초기화 안 됨! 쓰레기값
auto x2;        // 에러! auto는 초기화 필수
auto x3 = 0;    // OK
```

### 2. 긴 타입명에서 해방

**Before (auto 없이):**
```cpp
std::unordered_map<std::string, std::vector<Customer>>::iterator iter
    = customerMap.begin();

// 눈 아프죠?
```

**After (auto 사용):**
```cpp
auto iter = customerMap.begin();

// 깔끔!
```

### 3. 타입 불일치 문제 해결

**숨어있는 버그:**
```cpp
std::vector<int> v;
unsigned sz = v.size();  // 문제! size()는 std::size_t 반환
                         // 32비트: unsigned = size_t (OK)
                         // 64비트: unsigned ≠ size_t (위험!)
```

**auto로 해결:**
```cpp
auto sz = v.size();  // 항상 올바른 타입!
```

### 4. 숨은 형변환 방지

**성능 문제 예제:**
```cpp
std::unordered_map<std::string, int> m;

// 나쁜 예 - 숨은 복사 발생!
for (const std::pair<std::string, int>& p : m) {
    // 실제 타입은 std::pair<const std::string, int>
    // const가 빠져서 임시 객체 생성됨!
}

// 좋은 예 - auto 사용
for (const auto& p : m) {
    // 정확한 타입으로 추론, 복사 없음
}
```

#### 왜 map element는 `pair<const K, V>`인가

연관 컨테이너(`map`, `unordered_map`, `set` 등)의 `value_type`은 **key가 const**인 pair입니다. 키를 바꾸면 트리/해시 구조가 무너지기 때문입니다.

```cpp
std::unordered_map<std::string, int>::value_type
// = std::pair<const std::string, int>   ← key가 const!
```

그래서 `for (const std::pair<std::string, int>& p : m)`는 타입이 **정확히 일치하지 않습니다.** const가 빠진 pair 타입을 요청한 셈이라 컴파일러는:

1. 모든 element를 `pair<const string, int>`에서 `pair<string, int>`로 **임시 복사**
2. 그 임시 객체에 const 참조를 묶음 (수명 연장 규칙)

루프 한 바퀴마다 `string` 복사가 일어납니다 — 컨테이너가 크면 치명적입니다.

```cpp
for (const auto& p : m) {                      // 정확한 타입 → 복사 없음
    // p는 const pair<const string, int>&
}
```

`auto&`만 적어도 컴파일러가 정확한 element 타입을 잡아주므로 이 함정을 피할 수 있습니다.

### 4.5. narrowing 변환을 막아주기도 한다

`auto`는 항상 우변 타입 그대로 추론하므로 **명시적 타입 + 암묵적 변환**으로 인한 정밀도 손실이 발생할 자리를 줄여줍니다.

```cpp
double d = 3.14;

int    a = d;    // OK이지만 — 3으로 잘림 (경고만)
auto   b = d;    // double — 의도가 명확

// 함수 반환에서 더 위험
size_t big_count();
int n = big_count();   // 64bit 시스템에서 잠재적 narrowing
auto m = big_count();  // size_t 그대로 — 안전
```

물론 정반대로, 의도적인 변환을 하고 싶을 때는 `static_cast`로 명시하는 게 항목 6의 패턴입니다.

### 5. 람다 저장이 가능

```cpp
// 람다는 타입을 쓸 수 없음
auto derefUPLess = [](const std::unique_ptr<Widget>& p1,
                     const std::unique_ptr<Widget>& p2) {
    return *p1 < *p2;
};

// std::function은 가능하지만...
std::function<bool(const std::unique_ptr<Widget>&,
                   const std::unique_ptr<Widget>&)>
    derefUPLess2 = [](const auto& p1, const auto& p2) {
        return *p1 < *p2;
    };
// 더 느리고, 메모리도 더 씀!
```

#### 클로저 타입은 람다마다 유일하다

람다 표현식은 컴파일러가 그 자리에서 **익명 클래스**를 생성합니다. 같은 시그니처의 두 람다라도 **서로 다른 타입**입니다.

```cpp
auto a = [](int x) { return x * 2; };
auto b = [](int x) { return x * 2; };  // 본문이 같아도

static_assert(!std::is_same_v<decltype(a), decltype(b)>);  // 타입은 다름!

// 그래서 타입을 직접 적을 방법이 없음 — 오직 auto 또는 std::function
```

이 "유일한 타입"이 왜 중요한가:

- **컴파일러는 호출을 인라인할 수 있다** — 타입이 정확히 알려져 있으므로 가상 호출 없이 바로 본문을 펼침
- **타입을 다른 곳에 적을 수 없으므로** 변수에 담거나 전달하려면 `auto`가 사실상 유일한 선택지
- **같은 본문이라도 서로 다른 클로저 타입**이라 컨테이너에 같이 넣을 수도 없음

```cpp
std::vector<decltype(a)> v;
v.push_back(a);  // OK
v.push_back(b);  // 에러! a와 b는 타입이 다름
```

**유일성을 우회하려면** `std::function`이나 함수 포인터(캡처가 없는 람다만 가능)로 타입 소거(type erasure)를 해야 합니다 — 그 비용이 다음 절의 주제입니다.

#### `std::function` 오버헤드의 정확한 원인

`std::function`이 느린 이유는 타입 소거(type erasure)의 본질적 비용 때문입니다.

| 항목 | `auto` 람다 | `std::function` |
| --- | --- | --- |
| 타입 정보 | 컴파일 타임에 정확히 알려짐 | 런타임에 가려짐 (type-erased) |
| 호출 방식 | 직접 호출 / 인라인 가능 | **가상 호출**(또는 함수 포인터 우회) |
| 저장 위치 | 스택 (캡처와 같은 자리) | **작은 캡처는 SBO 버퍼, 큰 캡처는 힙 할당** |
| 객체 크기 | 캡처 크기 (캡처 없으면 1 byte) | 보통 32~64 byte (구현 따라) |
| 복사 비용 | 캡처 복사만 | vtable 포인터 + 캡처 복사 (+ 힙 할당 가능) |

```cpp
auto lambda = [](int x) { return x * 2; };
std::function<int(int)> f = lambda;

sizeof(lambda);  // 1     — 캡처 없는 람다 (빈 클래스)
sizeof(f);       // 32~64 — 구현 정의

lambda(5);  // 보통 인라인되어 어셈블리에 그대로 펼쳐짐
f(5);       // vtable 룩업 → 간접 호출 (인라인 거의 불가)
```

**큰 캡처는 추가로 힙 할당:**

```cpp
std::array<int, 1024> big_data;
auto big_lambda = [big_data](int x) { return big_data[x]; };

std::function<int(int)> f = big_lambda;
// big_lambda가 SBO 버퍼보다 크면 → operator new로 힙 할당
// 함수 호출마다 가상 호출 + 힙 메모리 접근
```

**결론**: `std::function`은 "어떤 호출 가능 객체든 받겠다"는 인터페이스가 필요한 경계(콜백 등록, type-erased 컨테이너)에서만 쓰고, 내부 구현이라면 `auto` + 템플릿이 압도적으로 빠릅니다.

### 6. 리팩토링이 쉬워짐

**타입 변경 시나리오:**
```cpp
// 원래 코드
int makeValue();
int val = makeValue();

// 나중에 long으로 변경
long makeValue();
int val = makeValue();  // 타입 불일치! 수정 필요

// auto를 썼다면?
auto val = makeValue();  // 자동으로 long이 됨!
```

## 실전 예제

### 반복자와 auto
```cpp
// 복잡한 타입
template<typename It>
void dwim(It b, It e) {
    while (b != e) {
        // 현재 요소 타입을 직접 쓰기 어려움
        typename std::iterator_traits<It>::value_type
            currValue = *b;  // 복잡함

        // auto로 간단히!
        auto currValue = *b;  // 간단함
    }
}
```

### 컨테이너와 auto
```cpp
// 인덱스 타입 실수 방지
std::vector<int> v = {1, 2, 3};

// 위험: int는 음수 가능, size()는 unsigned
for (int i = 0; i < v.size(); ++i) { }

// 안전: 정확한 타입
for (auto i = 0u; i < v.size(); ++i) { }

// 더 나은 방법: range-for
for (auto& elem : v) { }
```

## auto를 쓰면 안 되는 경우?

### 1. 프록시 타입 문제 (항목 6에서 자세히)
```cpp
std::vector<bool> features(const Widget& w);

auto highPriority = features(w)[5];  // bool이 아님!
// std::vector<bool>::reference 타입 (프록시)

bool highPriority = features(w)[5];  // 명시적 변환
```

### 2. 가독성 — 타입이 의미를 전달할 때

이게 `auto`의 가장 큰 트레이드오프입니다. 타입은 **인터페이스 계약**이기도 합니다 — 타입을 보면 그 변수가 무엇을 표현하는지, 어떤 연산이 가능한지 짐작이 됩니다.

```cpp
auto result = calculate();
// calculate()가 뭘 반환하지? Money? Vector? Status?
// 함수 정의를 찾아가야 알 수 있음

Money result = calculate();
// 아, 금액을 반환하는구나 — 한눈에 파악
```

**가독성 측면에서 `auto`가 손해를 보는 자리들:**

| 상황 | 권장 |
| --- | --- |
| 도메인 의미가 강한 타입 (`Money`, `UserId`, `Duration`) | **명시적 타입** |
| 코드 리뷰에서 타입을 검증해야 하는 자리 | **명시적 타입** |
| 라이브러리 경계 / 공개 API 시그니처 | **명시적 타입** (auto 추론은 inference이지 contract가 아님) |
| 길고 반복적인 템플릿 타입 / 반복자 / 람다 | **`auto`** |
| 우변에 이미 타입이 명백히 적혀 있는 경우 (`auto p = std::make_unique<T>()`) | **`auto`** |

### 3. 의도하지 않은 타입으로 추론될 때

`auto`는 우변에 충실하므로, 우변이 의도와 다르면 잠잠히 따라갑니다.

```cpp
auto x = 0u;       // unsigned int — 의도?
auto y = 0.0f;     // float — double을 원했나?
auto z = "hello";  // const char* — std::string을 원했나?
```

이런 자리에선 **명시적 타입 + 의도된 리터럴 접미사**가 더 안전합니다.

### 4. const/참조 의도가 우변에 보이지 않을 때

```cpp
auto v = container.front();  // 복사? 참조? 코드만 봐선 모름
auto& v = container.front(); // 참조라는 의도가 명확
```

`auto`만 쓰면 항상 값으로 복사되므로, **참조나 const가 필요한지 한 번 더 생각**해야 합니다. 깜빡 잊고 그냥 `auto`로 두면 의도치 않은 복사가 일어납니다.

## auto 사용 가이드라인

### auto를 쓸 때
1. 긴 타입명 (특히 템플릿)
2. 람다 표현식
3. 반복자
4. 타입을 정확히 모를 때
5. 리팩토링이 잦은 코드

### auto를 피할 때
1. 프록시 타입
2. 타입이 중요한 비즈니스 로직
3. 명시적 형변환이 필요할 때

## 성능 비교

```cpp
// std::function vs auto 람다
auto lambda1 = [](int x) { return x * 2; };
std::function<int(int)> lambda2 = [](int x) { return x * 2; };

// 크기 차이
sizeof(lambda1);  // 1 (캡처 없는 람다)
sizeof(lambda2);  // 32~64 바이트 (구현에 따라)

// 호출 속도
lambda1(5);  // 인라인 가능
lambda2(5);  // 간접 호출
```

## 핵심 정리

**auto의 장점:**
1. **초기화 강제** → 더 안전
2. **타입 추론** → 실수 방지
3. **짧은 코드** → 가독성 향상
4. **정확한 타입** → 이식성 향상
5. **리팩토링 용이** → 유지보수 향상

**기억하세요:**
```cpp
// 이전 방식
std::unordered_map<std::string, int>::const_iterator iter = m.cbegin();

// 현대적 방식
auto iter = m.cbegin();

// 둘 다 같은 일을 하지만, 어느 게 읽기 쉬운가요?
```

**결론:** auto는 단순히 타이핑을 줄이는 게 아니라, 더 정확하고 유지보수하기 쉬운 코드를 만듭니다!