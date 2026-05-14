---
title: "항목 1: 템플릿 타입 추론 규칙을 이해하라"
date: 2025-01-05T10:00:00
description: "템플릿 타입 추론의 세 가지 경우. 참조·포인터, 보편 참조, 값 전달. 그리고 auto가 이 규칙을 어떻게 물려받는가."
tags: [C++, Template, Type Deduction]
series: "Effective Modern C++"
seriesOrder: 1
---

## 왜 이 항목이 중요한가?

`auto`, `decltype`, 람다, 보편 참조, perfect forwarding. Modern C++의 거의 모든 핵심 기능이 **템플릿 타입 추론** 위에 서 있다. 항목 1은 그 토대다.

규칙 자체는 세 가지 경우로 깔끔하게 나뉘는데, 각 경우의 const·참조 처리 방식이 미묘하게 다르다. 이 차이를 정확히 짚지 못하면 다음과 같은 일이 일어난다.

- `auto`가 왜 const를 떨궜는지 모른다.
- `T&&`와 그냥 `&&`를 헷갈려서 의도와 다른 함수가 호출된다.
- 배열을 `f(arr)`로 넘겼더니 포인터가 되어 크기 정보가 사라진다.

이 항목을 한 번 정리해 두면 이후 40여 개 항목이 모두 같은 어휘로 풀린다.

## 개요

C++의 템플릿 타입 추론(template type deduction)은 복잡해 보이지만, 세 가지 경우로 나누어 생각하면 명확해진다. `auto` 타입 추론도 거의 동일한 규칙을 따르므로 이 규칙을 확실히 이해해 두는 것이 중요하다.

## 템플릿 함수 기본 형태

```cpp
template<typename T>
void f(ParamType param);

f(expr);  // expr로 T와 ParamType을 추론
```

## 필수 개념: const와 volatile

> **초보자를 위한 배경 지식**

<br>

템플릿 타입 추론을 이해하려면 먼저 타입 한정자(type qualifier)를 알아야 한다.

### const — "변경 금지"

**const = 상수 = 한 번 정하면 바꿀 수 없는 값**

```cpp
int age = 25;
age = 26;        // OK: 일반 변수는 변경 가능

const int birth_year = 1998;
birth_year = 1999;  // 에러! const는 절대 수정 불가
```

**const와 포인터 — 무엇이 const인가?**

```cpp
// 1. const가 * 앞에 있으면 → 가리키는 값이 const
const int* ptr1 = &x;      // "ptr1이 가리키는 int가 const"
int const* ptr1 = &x;      // 위와 완전히 동일!

*ptr1 = 30;                 // 에러! 가리키는 값 수정 불가
ptr1 = &y;                  // OK! 포인터는 다른 곳을 가리킬 수 있음

// 2. const가 * 뒤에 있으면 → 포인터 자체가 const
int* const ptr2 = &x;      // "ptr2라는 포인터가 const"

*ptr2 = 40;                 // OK! 가리키는 값은 변경 가능
ptr2 = &y;                  // 에러! 포인터는 다른 곳을 가리킬 수 없음

// 3. 둘 다 const
const int* const ptr3 = &x; // 포인터도, 가리키는 값도 모두 const
```

**암기법: "const는 바로 오른쪽 것을 const로 만든다"**
```cpp
int const *     // int가 const
int * const     // *(포인터)가 const
```

### volatile — "최적화 금지"

**volatile = 변덕스러운 = 언제든 바뀔 수 있는 값**

컴파일러는 코드를 더 빠르게 실행하기 위해 똑똑한 변경(최적화)을 한다.

```cpp
int x = 5;
int y = x * 2;
int z = x * 2;  // 컴파일러: "x * 2를 두 번? y값 재사용하자!"
```

그런데 때로는 이런 최적화가 문제가 된다.

```cpp
// volatile 없을 때
int flag = 1;
while (flag) {
    // flag를 바꾸는 코드가 없네?
}
// 컴파일러: "flag는 안 바뀌니까 while(true)로 바꾸자!"
// 결과: 무한 루프! (다른 스레드가 flag를 바꿔도 모름)

// volatile 있을 때
volatile int flag = 1;
while (flag) {
    // 매번 메모리에서 flag 값을 다시 읽음
}
// 컴파일러: "volatile이니까 최적화하면 안 돼. 매번 읽어야 해"
// 결과: 다른 스레드가 flag를 0으로 바꾸면 루프 종료!
```

**언제 쓰는가?**

- 하드웨어가 바꾸는 메모리 (임베디드 시스템)
- 여러 스레드가 공유하는 변수 (다만 `std::atomic`이 더 낫다)

### cv-qualifiers

const와 volatile을 함께 쓸 수도 있다.

```cpp
const volatile int cv_val = 42;
// const:    우리 코드에서 수정 불가
// volatile: 외부에서 바뀔 수 있으니 최적화 금지
```

**템플릿 타입 추론에서 중요한 점**

- 값 전달(pass-by-value)에서는 const와 volatile이 무시된다.
- 참조나 포인터 전달에서는 const가 유지된다.

## 필수 개념: Value Categories (값 분류)

> **초보자를 위한 배경 지식**

<br>

C++11부터 값(표현식)의 분류가 더 세밀해졌다. 템플릿 타입 추론을 이해하려면 이 개념이 필수다.

### C++11의 값 분류 체계

![C++ Value Categories](/images/blog/emc/diagrams/cpp-value-categories.svg)

### 1. lvalue (Left Value)

**특징**

- 이름이 있는 객체
- 주소를 구할 수 있다 (`&` 연산자 사용 가능)
- 여러 번 접근 가능

```cpp
int x = 42;              // x는 lvalue
int* ptr = &x;           // OK: 주소를 구할 수 있다

int& getRef();
getRef() = 10;           // getRef()의 반환값도 lvalue

const int y = 5;         // const도 lvalue (수정은 불가능하지만)
```

### 2. prvalue (Pure Right Value)

**특징**

- 리터럴이나 임시 객체
- 주소를 구할 수 없다
- 표현식이 끝나면 사라진다

```cpp
42;                      // 숫자 리터럴은 prvalue
int getValue();
getValue();              // 반환값은 prvalue

int x = 10 + 20;         // (10 + 20)은 prvalue
```

### 3. xvalue (eXpiring Value)

**특징**

- 곧 소멸할 객체 (move 가능)
- rvalue 참조를 반환하는 함수 호출
- `std::move()`의 결과

```cpp
int&& getRvalueRef();
getRvalueRef();          // xvalue

std::vector<int> v;
std::move(v);            // xvalue — v를 이동시킬 수 있다

static_cast<int&&>(x);   // x를 xvalue로 변환
```

### 4. glvalue (Generalized Left Value)

lvalue와 xvalue를 묶은 카테고리다.

- 실제 객체를 가리킨다
- 다형성 타입일 수 있다

### 5. rvalue

prvalue와 xvalue를 묶은 카테고리다.

- move 연산의 대상이 될 수 있다
- 임시 객체 또는 이동 가능한 객체

### 함수 반환 타입별 차이 — 가장 헷갈리는 부분

`int& f()`, `int f()`, `int&& f()`는 **반환 타입 한 글자 차이**로 호출 결과의 값 카테고리가 완전히 달라진다. "함수가 무엇을 돌려주는가"를 기준으로 비교하면 명확해진다.

| 반환 타입 | 함수가 돌려주는 것 | 호출 결과의 카테고리 | 직관적 의미 |
| --- | --- | --- | --- |
| `int&` | 이미 존재하는 변수를 가리키는 참조 | **lvalue** | "이 자리에 가서 직접 만지세요" |
| `int` | 값의 **복사본** (임시 객체) | **prvalue** | "값만 복사해서 줄게요" |
| `int&&` | 곧 사라질 객체에 대한 rvalue 참조 | **xvalue** | "이거 이제 안 쓸 거니까 가져가세요" |

#### `int&` 반환 — 실제 객체를 손에 쥐어준다

```cpp
int storage = 0;
int& getRef() { return storage; }   // 함수 밖의 storage를 그대로 노출

getRef() = 10;        // OK! storage = 10 과 동일
                      // 반환값이 lvalue → '=' 의 왼쪽에 올 수 있다
int* p = &getRef();   // OK! 주소도 구할 수 있다
```

`storage`라는 **메모리에 자리 잡은 진짜 객체**를 가리키므로 lvalue다.

#### `int` 반환 — 값만 복사해 임시 객체로 돌려준다

```cpp
int getValue() { return 10; }       // 10을 담은 임시 int를 반환

getValue() = 5;       // 에러! 임시 객체는 '=' 의 왼쪽에 못 온다
int* p = &getValue(); // 에러! 임시 객체는 주소를 구할 수 없다
int y = getValue();   // OK: 값을 y에 복사
```

반환값은 어디 저장된 변수가 아니라 표현식 도중에만 존재하는 임시 객체다. 그래서 prvalue다.

#### `int&&` 반환 — "이제 가져가도 돼" 신호가 붙은 참조

```cpp
int storage = 100;
int&& getRvalueRef() {
    return std::move(storage);      // storage를 rvalue로 캐스팅해서 반환
}

getRvalueRef();           // xvalue (곧 만료될 객체로 취급)
int z = getRvalueRef();   // storage의 값을 이동(또는 복사)해서 z로
```

`storage`는 함수 밖에 그대로 살아 있지만, 반환 타입이 `int&&`라서 호출 결과는 "곧 사라질 객체"로 취급된다. 그래서 xvalue다. 이 카테고리 덕분에 `std::move`가 lvalue를 rvalue처럼 다룰 수 있다.

#### 한눈에 비교

```cpp
int x = 1;
int&  f1() { return x; }            // lvalue  반환
int   f2() { return x; }            // prvalue 반환 (복사본)
int&& f3() { return std::move(x); } // xvalue  반환

f1() = 99;     // OK   — lvalue, x를 덮어쓴다
f2() = 99;     // 에러 — prvalue (임시 객체)
f3() = 99;     // OK이지만 위험 — xvalue도 실제 메모리에 있다 → x 덮어쓴다

&f1();         // OK   — 실제 객체를 가리킨다
&f2();         // 에러 — 임시 객체는 주소 없음
&f3();         // OK   — xvalue도 실제 객체를 가리킨다
```

**기억할 한 줄**

- 참조(`&`, `&&`) 반환은 **어딘가의 객체**를 가리킨다. lvalue 또는 xvalue.
- 값(`int`) 반환은 **그 자리에 새로 만들어진 임시**다. prvalue.

### 실용적인 구분법

**간단한 규칙**

1. 이름이 있으면? → **lvalue**
2. 리터럴이나 임시 객체? → **prvalue**
3. `std::move()`의 결과? → **xvalue**

```cpp
int x = 10;              // x: lvalue, 10: prvalue
int&& rr = std::move(x); // rr: lvalue (이름이 있다!)
                         // std::move(x): xvalue

void process(int& lr);   // lvalue만 받는다
void process(int&& rr);  // rvalue만 받는다

int y = 20;
process(y);              // lvalue → 첫 번째 오버로드
process(30);             // prvalue → 두 번째 오버로드
process(std::move(y));   // xvalue → 두 번째 오버로드
```

**주의사항**

```cpp
int&& rref = 10;         // rref는 rvalue 참조 타입이지만
                         // rref 자체는 lvalue다! (이름이 있다)
process(rref);           // 첫 번째 오버로드 호출
process(std::move(rref));// 두 번째 오버로드를 원한다면 move 필요
```

### 임시 객체(Temporary Object) 자세히 보기

> **초보자를 위한 배경 지식**

<br>

값 분류를 이야기할 때 자주 등장하는 **임시 객체**(temporary object)는 prvalue를 이해하는 핵심이다.

**임시 객체란?**

표현식을 평가하는 동안 컴파일러가 자동으로 만드는 **이름 없는** 객체다. 대부분 prvalue로 분류되고, 그 표현식이 끝나는 시점까지만 살아 있다가 사라진다.

```cpp
std::string("hello");   // 임시 string 객체
Widget();               // 임시 Widget 객체
1 + 2;                  // 임시 int (값 3)
getValue();             // 함수가 값으로 반환한 결과
```

**임시 객체는 언제 만들어지나?**

1. **생성자/리터럴 직접 호출**

```cpp
auto s = std::string("temp");
//       └── 우변 자체가 임시 string 객체
```

2. **암묵적 변환**

```cpp
void take(std::string s);
take("hello");
//   └── const char* → std::string 임시 객체가 만들어져 전달된다
```

3. **함수의 값 반환**

```cpp
std::string make() { return "x"; }
make();   // 반환값은 임시 객체 (RVO로 최적화될 수 있다)
```

4. **표현식 평가의 중간 결과**

```cpp
int a = (1 + 2) * 3;
//       └── (1 + 2)의 결과 3은 표현식 도중의 임시 객체
```

**임시 객체는 메모리 어디에 만들어지나?**

"컴파일러가 자동으로 만든다"는 말은 추상적으로 들리지만, 실제로는 **현재 함수의 스택 프레임 안 자동 저장소(automatic storage)** 한 자리를 잠깐 빌려 쓰는 것에 가깝다. `new`로 힙에 잡는 게 아니므로 우리가 따로 `delete`할 필요가 없다.

```cpp
void caller() {
    bar(std::string("hello"));
    //  └── caller()의 스택 프레임 안에 임시 string의 자리가 잡힌다
    //      (string 객체 본체: 보통 16~32 byte, 포인터/크기/용량 등)
    //      "hello" 문자 데이터는 string 내부 SSO 버퍼나 힙에 별도 저장
}   // ; 에서 소멸자 호출, 함수 종료 시 스택 자리 자동 회수
```

**객체 종류별로 실제 위치는 조금씩 다르다**

| 임시 객체 종류 | 실제 저장 위치 |
| --- | --- |
| `1 + 2` 같은 작은 정수/실수 | 보통 **CPU 레지스터** — 메모리에 안 갈 수도 있다 |
| `Widget()` 같은 일반 클래스 인스턴스 | **호출자 함수의 스택 프레임** |
| `std::string("...")`처럼 동적 자원을 쓰는 타입 | 객체 본체는 **스택**, 내부 데이터(문자열 버퍼)는 **힙** |
| 함수가 값으로 반환하는 큰 객체 | **호출자 쪽에 미리 잡아둔 자리**에 직접 구성 (RVO) |

**소멸 = 소멸자 호출 + 자리 회수**

임시 객체의 "소멸"은 두 단계가 합쳐진 일이다.

1. **소멸자 호출** — 객체가 잡고 있던 자원(힙 메모리, 파일 핸들 등)을 정리한다.
2. **스택 자리 회수** — 함수가 끝나면 스택 프레임 전체가 사라지면서 자동으로 회수된다.

```cpp
void foo() {
    std::string("temp");   // ① 스택의 한 자리에 string 객체 구성
                           // ② 생성자가 힙에서 문자 버퍼 할당 (필요 시)
                           // ③ ; 에서 소멸자 호출 → 힙 버퍼 free
}                          // ④ 함수 종료 → 스택의 그 자리 회수
```

**최적화: 임시 객체 자체가 사라지기도 한다 (Copy Elision / RVO)**

C++ 컴파일러는 임시 객체 생성을 **건너뛸 권한**이 있다. C++17부터는 일부 경우에 강제된다(guaranteed copy elision).

```cpp
std::string make() {
    return std::string("hi");
}

std::string s = make();
// 순진하게 보면:
//   make() 안의 임시 → 반환값 임시 → s
//   생성/이동이 여러 번 일어날 듯하지만
// 실제로는:
//   컴파일러가 s 자리에 곧바로 string을 구성한다
//   임시 객체는 메모리상 한 번도 별도로 존재하지 않는다
```

소스코드에 적힌 `std::string("hi")`가 실제 메모리에 **별개의 임시 자리**로 잡힌다는 보장은 없다. 컴파일러는 가능한 한 호출자 변수의 자리에 객체를 곧바로 구성한다.

**임시 객체의 수명**

임시 객체는 보통 그것이 등장한 **전체 표현식이 끝나는 지점(세미콜론)** 에서 소멸한다.

```cpp
foo(std::string("a"));   // foo() 호출 동안만 임시 객체가 살아 있다
                         // ; 에 도달하는 순간 소멸
```

**예외: const 참조나 rvalue 참조에 묶이면 수명 연장**

임시 객체를 `const T&` 또는 `T&&`에 바인딩하면 수명이 그 참조의 수명까지 연장된다.

```cpp
const std::string& ref = std::string("hello");
// 임시 객체의 수명이 ref와 같아진다
std::cout << ref;   // OK: 아직 살아 있다

std::string&& rref = std::string("world");
// 마찬가지로 rref가 살아있는 동안 임시 객체도 유지된다
```

다만 이 수명 연장은 **이름 있는 참조에 직접 바인딩될 때만** 적용된다. 함수에 전달되거나 다른 객체로 다시 묶이면 적용되지 않으니 주의가 필요하다.

```cpp
const std::string& danger = std::string("oops").substr(0, 2);
// substr(...)이 만든 또 다른 임시 객체에 묶인다
// 원본 std::string("oops") 임시는 이미 소멸 → 댕글링!
```

**왜 템플릿 타입 추론에서 중요한가?**

임시 객체는 rvalue이기 때문에, 보편 참조 `T&&`에 전달되면 `T`가 참조가 아닌 일반 타입으로 추론된다. 같은 함수 호출이라도 lvalue를 넘기느냐, 임시 객체(rvalue)를 넘기느냐에 따라 추론 결과가 달라진다.

```cpp
template<typename T>
void f(T&& param);

std::string s = "hi";
f(s);                    // s는 lvalue   → T = std::string&,  param = std::string&
f(std::string("hi"));    // 임시 객체     → T = std::string,   param = std::string&&
f(std::move(s));         // xvalue       → T = std::string,   param = std::string&&
```

이 차이가 다음 항목들에서 다룰 `std::move`, `std::forward`, perfect forwarding의 토대가 된다.

## 기본 형태

템플릿 함수의 일반적인 형태는 다음과 같다.

```cpp
template<typename T>
void f(ParamType param);

f(expr);  // expr로부터 T와 ParamType을 추론
```

컴파일러는 `expr`로부터 두 가지 타입을 추론한다.

- `T`의 타입
- `ParamType`의 타입

이 둘은 종종 다르다. `ParamType`에는 const나 참조(`&`) 같은 한정자가 포함될 수 있기 때문이다.

## 세 가지 경우

### 경우 1: ParamType이 참조 또는 포인터 (보편 참조는 제외)

**규칙**

1. `expr`이 참조 타입이면, 참조 부분을 무시한다.
2. `expr`의 타입과 `ParamType`을 패턴 매칭해서 `T`를 결정한다.

```cpp
template<typename T>
void f(T& param);    // param은 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T는 int,       param의 타입은 int&
f(cx);  // T는 const int, param의 타입은 const int&
f(rx);  // T는 const int, param의 타입은 const int&
        // (rx의 참조성은 무시된다)
```

const 참조 파라미터의 경우는 이렇다.

```cpp
template<typename T>
void f(const T& param);  // param은 const 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T는 int, param의 타입은 const int&
f(cx);  // T는 int, param의 타입은 const int&
f(rx);  // T는 int, param의 타입은 const int&
```

**lvalue/rvalue 바인딩 규칙 — 자주 빠지는 함정**

`T&` 파라미터는 **rvalue를 받지 못한다.** 반면 `const T&` 파라미터는 lvalue와 rvalue를 모두 받는다. 이 비대칭 때문에 라이브러리 함수는 대부분 `const T&`로 받도록 설계된다.

```cpp
template<typename T>
void f(T& param);           // non-const lvalue 참조

int x = 27;
f(x);                        // OK   — lvalue
f(27);                       // 에러 — rvalue를 non-const 참조에 못 묶는다
f(x + 1);                    // 에러 — (x + 1)은 prvalue

template<typename T>
void g(const T& param);     // const lvalue 참조

g(x);                        // OK: lvalue          → T = int
g(27);                       // OK: rvalue도 받는다  → T = int
g(x + 1);                    // OK: prvalue도 받는다 → T = int
```

`const T&`가 만능처럼 동작하는 이유는 C++이 const lvalue 참조에 한해서 **임시 객체 바인딩과 수명 연장**을 허용하기 때문이다(앞 절의 임시 객체 규칙 참고).

포인터도 동일한 규칙이 적용된다.

```cpp
template<typename T>
void f(T* param);

int x = 27;
const int* px = &x;

f(&x);  // T는 int,       param의 타입은 int*
f(px);  // T는 const int, param의 타입은 const int*
```

**`const T*` vs `T* const` — const 위치가 추론에 어떻게 영향을 주나**

```cpp
template<typename T> void f1(T* param);
template<typename T> void f2(const T* param);
template<typename T> void f3(T* const param);   // 포인터 자체가 const

int x = 27;
const int cx = 99;

f1(&x);   // T = int        → param: int*
f1(&cx);  // T = const int  → param: const int*       (대상의 const 보존)

f2(&x);   // T = int        → param: const int*       (const는 매개변수에 이미 있다)
f2(&cx);  // T = int        → param: const int*

f3(&x);   // T = int        → param: int* const
          // (param이 const라는 사실은 호출자에겐 보이지 않는다 — 함수 내부 약속)
```

**다중 포인터와 멤버 포인터도 동일한 패턴 매칭**

```cpp
template<typename T> void f(T** param);

int x = 1;
int* p = &x;
f(&p);    // T = int → param: int**

// 멤버 포인터
struct S { int n; };
template<typename T, typename C>
void g(T C::* member);

g(&S::n); // T = int, C = S
```

핵심은 컴파일러가 "내가 만든 ParamType 자리에 expr이 들어가려면 T는 무엇이어야 하는가"를 **패턴 매칭**으로 풀어낸다는 점이다. 포인터가 몇 겹이든, 멤버 포인터든 같은 발상이다.

### 경우 2: ParamType이 보편 참조(Universal Reference)

#### 보편 참조란?

보편 참조(Universal Reference) 또는 전달 참조(Forwarding Reference)는 `T&&` 형태로 선언되는 특별한 참조다.

**왜 특별한가?**

- 일반적인 `&&`는 rvalue 참조만 받는다.
- 그런데 템플릿에서 `T&&`는 lvalue와 rvalue를 **모두** 받을 수 있다.

```cpp
void f(Widget&& param);        // rvalue 참조 — rvalue만 받는다
template<typename T>
void f(T&& param);             // 보편 참조 — lvalue, rvalue 모두 받는다
```

#### 보편 참조의 "정확한" 조건

`&&`만 보았다고 다 보편 참조는 아니다. 모양이 살짝만 달라도 그냥 rvalue 참조가 된다. 이걸 헷갈리면 의도와 다른 함수가 호출된다.

```cpp
template<typename T>
void f1(T&& param);            // ✅ 보편 참조

template<typename T>
void f2(const T&& param);      // ❌ rvalue 참조
                               //    const가 붙는 순간 보편 X

template<typename T>
void f3(std::vector<T>&& v);   // ❌ rvalue 참조
                               //    T가 직접이 아니라 다른 타입에 감싸져 있다

template<typename T>
class Box {
    void f4(T&& param);        // ❌ rvalue 참조!
                               //    여기서 T는 Box를 인스턴스화할 때 이미 결정된다
                               //    f4 호출 시점에 추론되는 게 아니므로 보편 X
};
```

**보편 참조가 되는 두 조건**

1. **타입 추론**이 일어나는 자리여야 한다 (= 호출 시점에 `T`가 결정).
2. **정확히 `T&&`** 형태여야 한다 (const, volatile, 다른 타입으로 감싸짐 모두 X).

`auto&&`도 같은 두 조건을 만족하므로 보편 참조다 (항목 2에서 다룬다).

**규칙**

- `expr`이 lvalue면 → `T`와 `ParamType` 모두 lvalue 참조로 추론된다.
- `expr`이 rvalue면 → 일반 규칙(경우 1)을 적용한다.

```cpp
template<typename T>
void f(T&& param);   // param은 보편 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // x는 lvalue  → T는 int&,       param은 int&
f(cx);  // cx는 lvalue → T는 const int&, param은 const int&
f(rx);  // rx는 lvalue → T는 const int&, param은 const int&
f(27);  // 27은 rvalue → T는 int,        param은 int&&
```

이것이 유일하게 `T`가 참조 타입으로 추론되는 경우다.

#### 참조 축약(Reference Collapsing) 규칙

보편 참조가 작동하는 이유는 "참조 축약" 때문이다.

```cpp
template<typename T>
void f(T&& param);

int x = 10;
f(x);  // x는 lvalue
```

위 호출에서 무슨 일이 일어날까?

1. `x`는 lvalue이므로 `T`는 `int&`로 추론된다.
2. `param`의 타입은 `int& &&`가 되어야 하는데….
3. C++의 참조 축약 규칙이 적용된다.

**참조 축약 규칙**

```cpp
T& &   → T&     // 참조에 대한 참조
T& &&  → T&     // lvalue 참조에 대한 rvalue 참조
T&& &  → T&     // rvalue 참조에 대한 lvalue 참조
T&& && → T&&    // rvalue 참조에 대한 rvalue 참조
```

**실제 적용 예시**

```cpp
template<typename T>
void f(T&& param);

int x = 10;
const int cx = x;

f(x);    // T = int&,       param = int& && → int&
f(cx);   // T = const int&, param = const int& && → const int&
f(10);   // T = int,        param = int&&
```

#### std::move와 std::forward의 이해

보편 참조를 제대로 활용하려면 이 두 함수를 이해해야 한다.

**std::move**

- lvalue를 rvalue로 캐스팅한다 (실제로 이동하지는 않는다).
- "이 객체는 이동해도 된다"는 신호다.

```cpp
template<typename T>
typename std::remove_reference<T>::type&& move(T&& t) noexcept {
    return static_cast<typename std::remove_reference<T>::type&&>(t);
}

// 사용 예시
std::string str = "hello";
std::string str2 = std::move(str);  // str을 rvalue로 캐스팅
// 이제 str은 "moved-from" 상태 (사용하면 안 된다)
```

**std::forward (Perfect Forwarding)**

- 조건부 캐스팅: lvalue는 lvalue로, rvalue는 rvalue로 전달한다.
- 보편 참조와 함께 사용해 원래 값 카테고리를 유지한다.

```cpp
template<typename T>
T&& forward(typename std::remove_reference<T>::type& t) noexcept {
    return static_cast<T&&>(t);
}

// 보편 참조와 함께 사용
template<typename T>
void wrapper(T&& arg) {
    // arg는 이름이 있으므로 항상 lvalue다!
    // forward를 사용해 원래 카테고리를 유지한다
    process(std::forward<T>(arg));
}

int x = 10;
wrapper(x);        // forward는 lvalue로 전달
wrapper(20);       // forward는 rvalue로 전달
```

**언제 무엇을 사용하나?**

```cpp
template<typename T>
void func(T&& param) {
    // rvalue로 이동하고 싶을 때
    process(std::move(param));

    // 원래 값 카테고리를 유지하고 싶을 때
    process(std::forward<T>(param));

    // 주의: param 자체는 항상 lvalue다! (이름이 있으므로)
    process(param);  // 항상 lvalue로 전달된다
}
```

**실전 예제: 팩토리 함수**

```cpp
template<typename T, typename... Args>
std::unique_ptr<T> make_unique_wrong(Args&&... args) {
    return std::unique_ptr<T>(new T(args...));  // 잘못됨! 모두 lvalue로 전달
}

template<typename T, typename... Args>
std::unique_ptr<T> make_unique_correct(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));  // 정답!
}

// 사용
struct Widget {
    Widget(std::string&& s) { /* move constructor */ }
};

auto w = make_unique_correct<Widget>("temp");  // rvalue가 제대로 전달된다
```

### 경우 3: ParamType이 참조도 포인터도 아닌 경우

값 전달(pass-by-value)이다.

**규칙**

1. `expr`이 참조면 참조 부분을 무시한다.
2. 참조를 무시한 후, `expr`이 const면 const도 무시한다.
3. volatile이면 그것도 무시한다.

```cpp
template<typename T>
void f(T param);     // param은 값 전달

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T와 param의 타입 모두 int
f(cx);  // T와 param의 타입 모두 int (const 무시!)
f(rx);  // T와 param의 타입 모두 int (const와 참조 무시!)
```

**중요**: const는 무시되지만, const 포인터가 가리키는 대상의 const는 유지된다.

```cpp
const char* const ptr = "Fun with pointers";

f(ptr);  // param의 타입은 const char*
         // 포인터 자체의 const는 무시되지만,
         // 가리키는 대상의 const는 유지된다
```

## 배열 인수

배열은 특별한 처리가 필요하다.

```cpp
const char name[] = "J. P. Briggs";  // 타입: const char[13]

template<typename T>
void f(T param);

f(name);  // T는 const char*로 추론 (배열이 포인터로 decay)

template<typename T>
void f(T& param);

f(name);  // T는 const char[13]으로 추론!
          // param의 타입은 const char(&)[13]
```

**왜 값 전달에서는 배열이 포인터로 decay되나?**

C 시절부터 이어진 호환성 때문이다. C/C++에서 함수 매개변수의 배열 문법은 **컴파일러가 내부적으로 포인터로 바꿔치기**한다.

```cpp
void f(int param[]);    // 컴파일러가 보기엔
void f(int* param);     // 이 둘이 완전히 동일하다
void f(int param[10]);  // 크기는 무시 — 역시 int*와 동일
```

따라서 값 전달 템플릿 매개변수도 같은 규칙을 따라 배열을 포인터로 decay시킨다. 배열을 "값으로 복사"한다는 개념 자체가 함수 호출 규약에 존재하지 않기 때문이다.

**왜 참조로 받으면 decay되지 않나?**

참조는 객체를 복사하지 않고 **그대로 가리킨다.** 배열에 대한 참조라는 개념(`T (&)[N]`)이 C++에 존재하므로, 컴파일러는 배열 크기까지 포함한 진짜 타입을 그대로 추론할 수 있다.

이를 활용하면 컴파일 타임에 배열 크기를 구할 수 있다.

```cpp
template<typename T, std::size_t N>
constexpr std::size_t arraySize(T (&)[N]) noexcept {
    return N;
}

int keyVals[] = { 1, 3, 5, 7, 9, 11, 22, 35 };
std::array<int, arraySize(keyVals)> mappedVals;
```

## 함수 인수

함수도 함수 포인터로 decay된다 (배열과 같은 이유로).

```cpp
void someFunc(int, double);

template<typename T>
void f1(T param);

template<typename T>
void f2(T& param);

f1(someFunc);  // param은 함수 포인터: void(*)(int, double)
f2(someFunc);  // param은 함수 참조: void(&)(int, double)
```

값 전달이면 함수 포인터로, 참조면 함수 참조로 추론된다. 배열과 정확히 같은 패턴이다.

## 추론이 실패하거나 의외로 동작하는 경우

### 1. 명시적 템플릿 인자를 주면 추론은 일어나지 않는다

```cpp
template<typename T>
void f(T param);

f(42);            // 추론: T = int
f<double>(42);    // 명시: T = double, 추론 비활성
                  //       42는 int → double로 변환되어 전달
```

일부만 명시하는 것도 가능하다. 이때 **명시한 부분 뒤로** 추론이 시작된다.

```cpp
template<typename R, typename T>
R cast(T x) { return static_cast<R>(x); }

cast<double>(42);   // R = double (명시), T = int (추론)
```

### 2. 같은 `T`가 다른 타입을 만나면 에러

같은 템플릿 매개변수가 서로 다른 타입을 받으면 컴파일러는 어느 쪽을 골라야 할지 결정하지 못한다.

```cpp
template<typename T>
void f(T x, T y);

f(1, 2);          // OK:  T = int
f(1, 2.0);        // 에러! T = int? double? 결정 불가

// 해결책 1: 명시
f<double>(1, 2.0);   // OK: 1이 double로 변환

// 해결책 2: 매개변수 분리
template<typename T1, typename T2>
void g(T1 x, T2 y);
g(1, 2.0);        // OK: T1 = int, T2 = double
```

### 3. `{1, 2, 3}` 중괄호 초기화 리스트는 추론할 수 없다

이게 `auto`와 템플릿 추론의 가장 큰 차이다 (자세한 건 항목 2).

```cpp
auto x = {1, 2, 3};   // OK: x는 std::initializer_list<int>

template<typename T>
void f(T param);

f({1, 2, 3});         // 에러! 컴파일러가 T를 추론하지 못한다

// 명시적으로 initializer_list라고 알려주면 OK
template<typename T>
void g(std::initializer_list<T> list);

g({1, 2, 3});         // OK: T = int
```

### 4. 추론은 암묵적 변환을 거의 하지 않는다

함수 호출의 **다른 부분**에서 일어나는 암묵적 변환과 달리, 추론 과정에선 타입 변환이 거의 적용되지 않는다.

```cpp
template<typename T>
void f(T x, T y);

f(1, 2L);         // 에러! int와 long을 묶어줄 변환을 하지 않는다
                  // (명시 또는 캐스팅 필요)

template<typename T>
void g(const T& x, const T& y);

g(std::string("hi"), "world");
// 에러! 첫 번째에서 T = std::string, 두 번째에서 T = char[6]
// const char[6] → std::string 변환은 추론 후에 일어나기 때문에
// 추론 단계에서 이미 충돌한다
```

## auto 추론과의 관계

`auto` 타입 추론은 **거의 정확히** 위 세 가지 경우와 같은 규칙을 사용한다. 한 가지 예외만 빼고.

| 상황 | 템플릿 추론 | `auto` 추론 |
| --- | --- | --- |
| `T x = expr` / `auto x = expr` | const, 참조성 무시 | 동일 |
| `T& x = expr` / `auto& x = expr` | 참조 유지, const 보존 | 동일 |
| `T&& x = expr` / `auto&& x = expr` | 보편 참조 규칙 | 동일 |
| `f({1,2,3})` / `auto x = {1,2,3}` | **에러** | **`std::initializer_list<int>`** |

이 마지막 한 줄의 차이가 항목 2의 핵심 주제다.

## 추론 결과를 확인하고 싶다면

타입 추론은 머릿속으로 따라가다 보면 헷갈리기 쉽다. 컴파일러가 실제로 무슨 타입으로 추론했는지 확인하는 자세한 방법은 **항목 4**에서 다룬다. 간단한 트릭만 미리 보면 다음과 같다.

```cpp
// 정의되지 않은 클래스를 인스턴스화시켜
// 컴파일 에러 메시지로 T를 확인하는 방법
template<typename T> class TypeDisplayer;

template<typename T>
void f(T&& param) {
    TypeDisplayer<T> tType;                 // 에러 메시지에 T가 적나라하게 출력
    TypeDisplayer<decltype(param)> pType;   // param의 정확한 타입도 확인
}
```

런타임에 확인하려면 `typeid(T).name()` (cv/참조 정보가 깎이는 한계가 있다) 또는 `boost::typeindex::type_id_with_cvr<T>()`를 사용한다.

## 핵심 정리

1. **참조 파라미터**: expr의 참조성은 무시되지만 const는 타입 추론에 포함된다.
2. **`T&`는 rvalue를 못 받고, `const T&`는 lvalue·rvalue 모두 받는다.**
3. **보편 참조 파라미터**: 정확히 `T&&` 형태일 때만 보편 참조이며, lvalue는 `T`가 참조 타입으로 추론된다.
4. **값 전달 파라미터**: const와 volatile이 무시된다 (포인터가 가리키는 대상의 const는 유지).
5. **배열과 함수**: 값 전달에선 포인터로 decay, 참조 전달에선 원래 타입을 유지한다.
6. **추론이 실패하는 경우**: 같은 `T`에 다른 타입, `{}` 초기화 리스트, 암묵적 변환이 필요한 자리.
7. **`auto` 추론은 거의 같지만** `{}`만 다르게 처리한다 (항목 2).

템플릿 타입 추론을 이해하면 `auto`, `decltype`, 그리고 Modern C++의 많은 기능을 더 잘 활용할 수 있다.

## 관련 항목

- [항목 2: auto의 타입 추론 규칙을 이해하라](/blog/programming/cpp/effective-modern-cpp/item02-understand-auto-type-deduction) — `{...}` 한 가지 예외
- [항목 3: decltype의 작동 방식을 이해하라](/blog/programming/cpp/effective-modern-cpp/item03-understand-decltype) — 추론하지 않고 보고하는 도구
- [항목 4: 추론된 타입을 확인하는 방법을 알아두라](/blog/programming/cpp/effective-modern-cpp/item04-know-how-to-view-deduced-types) — IDE·컴파일러·런타임에서 타입 확인
- [항목 23: std::move와 std::forward를 이해하라](/blog/programming/cpp/effective-modern-cpp/item23-understand-std-move-and-std-forward) — 두 캐스팅 도구의 정확한 의미
- [항목 24: 보편 참조와 rvalue 참조를 구별하라](/blog/programming/cpp/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references) — 보편 참조 판별 기준
- [항목 28: 참조 축약을 이해하라](/blog/programming/cpp/effective-modern-cpp/item28-understand-reference-collapsing) — `T& &&`가 `T&`가 되는 이유
