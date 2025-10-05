---
layout: post
title: "항목 5: 명시적 타입 선언보다는 auto를 선호하라"
date: 2025-01-05
categories: [C++, Effective Modern C++]
tags: [C++, auto, Modern C++]
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

**성능 차이:**
- `auto` 람다: 인라인 가능, 크기 = 람다 크기
- `std::function`: 간접 호출, 힙 할당 가능, 더 큰 메모리

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

### 2. 가독성이 중요할 때
```cpp
auto result = calculate();  // calculate()가 뭘 반환하지?

// 때로는 명시적이 나음
Money result = calculate();  // 아, 돈을 반환하는구나
```

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