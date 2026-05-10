---
title: "항목 2: 선택의 여지가 있다면 오버로딩 대신 기본 인수를 사용하라"
date: 2026-05-10T10:00:00
description: "함수 오버로딩과 기본 인수를 언제, 어떻게 선택해야 하는지"
tags: [C++, API Design, Default Arguments]
series: "Beautiful C++"
seriesOrder: 2
draft: false
---


## 왜 API 설계가 중요한가?

API는 다른 개발자(또는 미래의 나)가 내 코드를 사용하는 인터페이스다.

**나쁜 API의 결과:**
```cpp
// 이 함수를 어떻게 호출해야 하지?
void process(int a, int b, int c, bool d, bool e);

process(100, 200, 50, true, false);  // 각 인수가 뭘 의미하는지?
```

**좋은 API의 결과:**
```cpp
// 함수 시그니처만 봐도 의도가 명확
void process_image(int width, int height, int depth = 8,
                   bool grayscale = false, bool flip = false);
```

→ API 설계는 **코드의 사용성**을 결정한다.

## 용어 설명

### 오버로딩(Overloading)이란?

같은 이름의 함수를 매개변수만 다르게 여러 개 정의하는 것

```cpp
void print(int x);           // print 함수 1
void print(double x);        // print 함수 2
void print(const string& s); // print 함수 3

print(42);      // print(int) 호출
print(3.14);    // print(double) 호출
print("hello"); // print(const string&) 호출
```

→ 컴파일러가 인수 타입을 보고 어떤 함수를 호출할지 결정

### 기본 인수(Default Arguments)란?

함수 매개변수에 기본값을 지정해두는 것

```cpp
void greet(const string& name, const string& greeting = "Hello");

greet("Alice");           // greet("Alice", "Hello")와 같음
greet("Bob", "Hi");       // greeting을 "Hi"로 지정
```

→ 호출 시 인수를 생략하면 기본값이 사용됨

### 셀프 도큐먼팅(Self-documenting)이란?

코드 자체가 설명서 역할을 하는 것 - 별도 주석 없이도 의도가 명확함

```cpp
// Bad: 주석 없이는 이해 불가
void connect(string, int, int);
connect("localhost", 80, 30);  // 80이 뭐고 30이 뭐지?

// Good: 셀프 도큐먼팅
void connect(const string& host, int port = 80, int timeout_sec = 30);
connect("localhost");  // 기본값이 보이니까 의도가 명확
```

## 핵심 내용

- API 설계 능력은 중요하다
- 코드는 **셀프 도큐먼팅**이 되어야 한다
- 같은 일을 약간 다르게 수행하는 두 추상화는 **전달되는 인수만 다르고 나머지는 의미론적으로 모두 같다** → 이런 경우 기본 인수를 사용하라

### 오버로딩이 필요한 경우

```cpp
// 타입이 다를 때 - 오버로딩 필요
void print(int x);
void print(double x);
void print(const std::string& s);

// 완전히 다른 동작일 때
void process(File& f);      // 파일 처리
void process(Network& n);   // 네트워크 처리
```

→ **의미론적으로 다른 동작**을 할 때는 오버로딩

### 기본 인수가 좋은 경우

```cpp
// Bad: 오버로딩 - 코드 중복, 기본값이 안 보임
void connect(const string& host, int port, int timeout) { ... }
void connect(const string& host, int port) {
    connect(host, port, 30);  // 중복 호출
}
void connect(const string& host) {
    connect(host, 80, 30);    // 중복 호출
}

// Good: 기본 인수 - 한 곳에서 관리, 기본값이 보임
void connect(const string& host, int port = 80, int timeout = 30);
```

→ **의미론적으로 같은 동작**인데 인수만 다를 때는 기본 인수

### 1.2.2 추상화 다듬기: 추가 인수냐, 오버로딩이냐

```cpp
// 오버로딩 방식
office make_office(float floor_space, int staff);
office make_office(float floor_space, int staff, bool two_floors);
```

→ 같은 `make_office`인데 옵션만 하나 더 있는 것

```cpp
// 기본 인수 방식 - 더 나음
office make_office(float floor_space,
                   int staff,
                   bool two_floors = false,
                   std::string const& building_name = {});
```

- 기본값이 바로 보임 (`false`, 빈 문자열)
- 코드 중복 없음
- 셀프 도큐먼팅
- `{}` = 해당 타입의 기본값 (빈 문자열)

### 기본 인수의 함정

```cpp
auto eh_office = make_office(2400.f, 200, "Eagle Heights");
```

**문제:** `"Eagle Heights"`가 `bool two_floors`에 들어감!

- 문자열 리터럴(`const char*`)은 `bool`로 암시적 변환됨
- nullptr이 아닌 포인터 → `true`
- 의도: building_name에 넣고 싶었음
- 결과: two_floors = true, building_name = 빈 문자열

**기본 인수의 한계:** 중간 인수를 건너뛸 수 없다

```cpp
// 이렇게 해야 함
auto eh_office = make_office(2400.f, 200, false, "Eagle Heights");
```

### 1.2.3 오버로드 확인의 미묘한 차이

컴파일러가 오버로딩된 함수 중 어떤 것을 선택할지 결정하는 과정

**암묵적 변환 시퀀스의 순위 (우선순위 순)**

| 순위 | 변환 시퀀스 | 설명 |
|------|-------------|------|
| 1 | 표준 변환 시퀀스 | 언어에 내장된 변환 |
| 2 | 사용자 정의 변환 시퀀스 | 생성자, 변환 연산자 |
| 3 | 줄임표 변환 시퀀스 | `...` (C 가변 인자) |

**표준 변환 시퀀스 세부 순위**

| 순위 | 종류 | 예시 |
|------|------|------|
| 1 | 완전일치 (Exact Match) | `int` → `int` |
| 2 | 승격 (Promotion) | `short` → `int`, `float` → `double` |
| 3 | 변환 (Conversion) | `int` → `double`, `int` → `bool` |

```cpp
void foo(int x);      // 1순위: 완전일치
void foo(double x);   // 3순위: 변환

foo(42);    // int → foo(int) 호출 (완전일치)
foo(3.14);  // double → foo(double) 호출 (완전일치)
foo(3.14f); // float → foo(double) 호출 (승격)
```

### 1.2.4 예제로 돌아가기

포인터 → bool 암묵적 변환의 예:

```cpp
// 포인터 → bool 변환
if (ptr) {
    ptr->do_thing();
}

// 명시적 비교
if (ptr != 0) {
    ptr->do_thing();
}
```

이게 바로 앞의 `make_office` 문제의 원인:

```cpp
make_office(2400.f, 200, "Eagle Heights");
//                       ^^^^^^^^^^^^^^
// const char* → bool 변환 (nullptr 아님 → true)
```

- 포인터 타입은 `bool`로 암묵적 변환됨
- 이건 C++의 "기능"이지만 버그의 원인이 되기도 함

**왜 `std::string`이 아닌 `bool`로 변환되었나?**

| 변환 | 종류 | 우선순위 |
|------|------|----------|
| `const char*` → `bool` | 표준 변환 | 높음 |
| `const char*` → `std::string const&` | 사용자 정의 변환 | 낮음 |

- `std::string(const char*)`은 생성자 호출 = 사용자 정의 변환
- 표준 변환이 사용자 정의 변환보다 우선순위가 높음
- 그래서 `"Eagle Heights"`가 `std::string`이 아닌 `bool`로 감

### 1.2.5 기본 인수가 모호함을 만들지 않게 하는 법

**해결책: 매개변수 순서 재배치**

```cpp
// 문제가 있는 버전: bool이 string보다 앞에
office make_office(float floor_space,
                   int staff,
                   bool two_floors = false,
                   std::string const& building_name = {});

// 개선된 버전 1: bool에 기본값 없애고 string에만 기본값
office make_office(float floor_space,
                   int staff,
                   bool two_floors,
                   std::string const& building_name = {});

// 개선된 버전 2: string을 앞으로 (더 자주 쓰는 인자)
office make_office(float floor_space,
                   int staff,
                   std::string const& building_name,
                   bool two_floors = false);
```

**버전 1 사용:**
```cpp
make_office(2400.f, 200, false, "Eagle Heights");  // 명시적으로 bool 전달
```

**버전 2 사용:**
```cpp
make_office(2400.f, 200, "Eagle Heights");  // two_floors는 기본값 false
```

→ 기본 인수 순서를 잘 설계하면 모호함 없이 사용 가능

### 1.2.6 오버로드의 대안

**오버로딩 대신 다른 함수 이름 사용하기**

```cpp
// 오버로딩 - 어떤 게 호출될지 헷갈릴 수 있음
office make_office(float floor_space, int staff, floors f);
office make_office(float floor_space, int staff, std::string const& name);
```

```cpp
// 대안 - 함수 이름이 의도를 명확하게 표현
office make_office_by_floor_count(float floor_space, int staff, floors f);
office make_office_by_building_name(float floor_space, int staff, std::string const& name);
```

**장점:**
- 함수 이름만 봐도 의도가 명확함 (셀프 도큐먼팅)
- 오버로드 해결 규칙 몰라도 됨
- 컴파일러 에러 메시지가 더 명확함

### 타이브레이커(Tie-breaker)

오버로드 후보들의 순위가 같을 때 최종 선택하는 규칙

```cpp
void foo(int x);            // 후보 1
void foo(int x, int y = 0); // 후보 2

foo(42);  // 둘 다 호출 가능 - 어떤 걸 선택?
```

**타이브레이커 규칙들:**

| 우선순위 | 규칙 |
|----------|------|
| 1 | 매개변수 매칭이 덜 필요한 쪽 |
| 2 | 비템플릿 함수 > 템플릿 함수 |
| 3 | 더 특수화된 템플릿 > 덜 특수화된 템플릿 |
| 4 | non-const > const (수정 가능한 객체일 때) |
| 5 | lvalue 참조 vs rvalue 참조 |

```cpp
template<typename T>
void bar(T x);        // 템플릿

void bar(int x);      // 비템플릿

bar(42);  // 비템플릿 버전 선택 (타이브레이커)
```

### 1.2.7 반드시 오버로드해야 하는 경우

**1. 생성자**

생성자는 이름이 클래스명으로 고정되어 있음 → 다양한 방법으로 객체를 생성하려면 오버로드 필수

```cpp
class Date {
public:
    Date();                              // 기본 생성자
    Date(int year, int month, int day);  // 날짜 지정
    Date(const std::string& iso_date);   // 문자열 파싱
    Date(time_t timestamp);              // 타임스탬프
};
```

**2. std::swap 등 특수 함수**

```cpp
// 커스텀 타입의 swap 오버로딩
namespace my {
    class Widget { /* ... */ };

    void swap(Widget& a, Widget& b) noexcept {
        // 효율적인 swap 구현
    }
}
```

**주의사항:**

- 오버로드해야 할 때는 **의식적으로** 하라
- **기본 인수와 오버로드를 섞어 사용하지 마라** → 혼란의 원인

```cpp
// Bad: 기본 인수 + 오버로드 혼용
void foo(int x, int y = 0);
void foo(int x);  // 어떤 게 호출될지 모호함!
```

## 정리

**선택의 여지가 있다면 오버로딩 대신 기본 인수를 사용하라** = 같은 동작에 옵션만 다르면 기본 인수가 더 낫다.

### 왜?

- 셀프 도큐먼팅: 기본값이 시그니처에 보임
- 코드 중복 없음: 한 함수에서 모든 케이스 처리
- 유지보수 쉬움: 수정할 곳이 한 군데

### 언제 오버로딩? 언제 기본 인수?

| 상황 | 선택 |
|------|------|
| 의미론적으로 **같은** 동작 + 옵션만 다름 | 기본 인수 |
| 의미론적으로 **다른** 동작 | 오버로딩 |
| 타입이 다름 | 오버로딩 |
| 생성자 | 오버로딩 (이름 바꿀 수 없으니까) |

### 주의사항

1. **암묵적 변환 조심**: `const char*` → `bool` 같은 함정
2. **매개변수 순서 설계**: 자주 쓰는 선택적 인수를 뒤로
3. **기본 인수 + 오버로드 혼용 금지**: 모호함의 원인

### 실천법

1. 기본값이 있으면 **기본 인수**로 표현
2. 오버로딩 대신 **다른 함수 이름** 고려 (make_office_by_name 등)
3. 오버로드가 필요하면 **의식적으로** 결정

