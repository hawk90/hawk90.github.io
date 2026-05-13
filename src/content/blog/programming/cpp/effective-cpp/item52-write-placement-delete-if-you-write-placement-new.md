---
title: "항목 52: placement new를 작성하면 placement delete도 작성하라"
date: 2025-02-08T13:00:00
description: "생성자 throw 시 컴파일러가 매칭 placement delete를 자동 호출 — 없으면 메모리 누수. 짝 맞춤 규칙."
tags: [C++, Effective C++, new, delete, Placement]
series: "Effective C++"
seriesOrder: 52
---

## 왜 이 항목이 중요한가?

`new` 표현식은 사실 **두 단계 작업**이다.

1. `operator new`로 메모리를 할당한다.
2. 그 메모리 위에서 생성자를 호출한다.

생성자가 예외를 던지면 어떻게 되나? 컴파일러는 **할당된 메모리를 자동 해제**해야 한다. 그러기 위해 **시그니처가 매칭되는 `operator delete`** 를 찾아 호출한다.

사용자 정의 `operator new`(placement)를 만들면서 매칭 delete를 빼먹으면 어떻게 될까? 컴파일러가 적절한 delete를 못 찾아 **메모리가 누수**된다. 컴파일 에러도, 런타임 에러도 없이 조용히.

이 항목은 placement new/delete의 짝 맞춤 규칙과, 표준 delete를 가리는 함정까지 정리한다.

## 개요

`new` 표현식은 **두 단계**다. `operator new`로 메모리를 할당하고, 그 후 생성자를 호출한다. 생성자가 throw하면 컴파일러는 **할당된 메모리를 자동 해제**해야 하는데, 이를 위해 **시그니처가 매칭되는 `operator delete`** 를 찾아 호출한다. 사용자 정의 `operator new`(placement)가 있는데 매칭 delete가 없으면 **메모리 누수**가 일어난다.

## 필수 개념: new 표현식의 두 단계

> **초보자를 위한 배경 지식**

<br>

```cpp
Widget* w = new Widget(args);
```

이 한 줄이 펼쳐지면:

```cpp
void* mem = ::operator new(sizeof(Widget));    // 1단계: 메모리 할당
try {
    Widget* w = new (mem) Widget(args);         // 2단계: placement new로 생성자
} catch (...) {
    ::operator delete(mem);                      // 생성자 throw → 메모리 해제
    throw;                                        // 예외 다시 던짐
}
```

핵심: **2단계에서 throw하면** — 1단계에서 할당된 메모리를 컴파일러가 자동 해제. 어떻게? **매칭 `operator delete`**를 호출.

## 매칭 시그니처 규칙

`operator new`의 시그니처:
```cpp
void* operator new(std::size_t, [추가 매개변수...]);
```

매칭 `operator delete`:
```cpp
void operator delete(void*, [같은 추가 매개변수...]) noexcept;
```

**첫 매개변수만 다름** — new는 `size_t`, delete는 `void*`. 나머지 추가 매개변수는 동일.

## placement new 예제

```cpp
class Widget {
public:
    // placement new — std::ostream& 추가 매개변수
    static void* operator new(std::size_t size, std::ostream& log) {
        log << "allocating " << size << " bytes\n";
        return ::operator new(size);
    }
};

Widget* w = new (std::cerr) Widget;
//          ^^^^^^^^^^^^^^
//          placement new 호출 — std::cerr를 log로
```

## 함정 — 짝 delete 없음

```cpp
class Widget {
public:
    Widget() { throw std::runtime_error("oops"); }     // 생성자 throw
    
    static void* operator new(std::size_t size, std::ostream& log) {
        log << "alloc\n";
        return ::operator new(size);
    }
    // placement delete 정의 안 함!
};

Widget* w = new (std::cerr) Widget;
// 1. operator new(size, std::cerr) 호출 — 메모리 할당, "alloc" 출력
// 2. Widget() 생성자 호출 — throw
// 3. 컴파일러가 매칭 placement delete 찾음:
//    operator delete(void*, std::ostream&) — 없음
//    → 어떤 delete도 호출 안 함 — 메모리 누수!
```

해결 — placement delete 추가:

```cpp
class Widget {
public:
    static void* operator new(std::size_t size, std::ostream& log) {
        log << "alloc\n";
        return ::operator new(size);
    }
    
    // 매칭 placement delete — 생성자 throw 시 자동 호출
    static void operator delete(void* p, std::ostream& log) noexcept {
        log << "alloc failed — freeing\n";
        ::operator delete(p);
    }
};
```

## 일반 delete도 필요

```cpp
class Widget {
public:
    static void* operator new(std::size_t, std::ostream&);
    static void  operator delete(void*, std::ostream&) noexcept;     // placement delete
    
    // 일반 delete 누락!
};

Widget* w = new (std::cerr) Widget;
// 가정: 생성자 성공
delete w;                                    // ⚠️ 어떤 delete 호출?
                                              //    placement는 시그니처 매칭 안 됨
                                              //    → 표준 ::operator delete 호출
                                              //    → 풀이 잘못된 free
```

`delete w;`는 **일반 delete**(`operator delete(void*)`) 호출 — placement delete와 다른 시그니처. 일반 delete를 정의하지 않으면 표준이 호출되어 잘못된 free.

해결 — 일반 delete도:

```cpp
class Widget {
public:
    // placement new
    static void* operator new(std::size_t size, std::ostream& log);
    // 생성자 throw 시 호출
    static void  operator delete(void* p, std::ostream& log) noexcept;
    // 정상 delete 호출 시
    static void  operator delete(void* p) noexcept {
        ::operator delete(p);
    }
};
```

## 표준 placement new — `new (ptr) T`

표준이 제공하는 placement new는 **메모리 위치 지정**:

```cpp
void* operator new(std::size_t, void* p) noexcept { return p; }
```

이미 할당된 메모리에 객체 생성:

```cpp
alignas(Widget) char buffer[sizeof(Widget)];
Widget* w = new (buffer) Widget;     // buffer 자리에 생성
// ...
w->~Widget();                          // 명시적 소멸자 호출
                                        // buffer는 그대로 (해제 안 함)
```

표준은 이 placement new의 짝도 정의:

```cpp
void operator delete(void*, void*) noexcept {}     // 아무것도 안 함
```

생성자 throw 시 — 메모리는 placement이므로 해제 책임 X. delete는 no-op.

이 표준 placement new/delete는 모든 클래스가 자동 사용.

## 이름 가리기 함정

```cpp
class Widget {
public:
    static void* operator new(std::size_t, std::ostream&);     // 클래스에 정의
};

Widget* w = new Widget;     // ⚠️ 컴파일 에러
//          ^^^^^^^^^^
//          표준 `new(size_t)`는 가려짐 — placement new만 보임
```

클래스에 `operator new`를 정의하면 — **글로벌 / 표준의 모든 시그니처가 가려짐**. 같은 클래스에서 표준 new도 호출하려면 명시:

```cpp
class Widget {
public:
    static void* operator new(std::size_t size, std::ostream& log);
    
    // 표준 시그니처도 (위임)
    static void* operator new(std::size_t size) {
        return ::operator new(size);
    }
};

Widget* w1 = new Widget;                  // ✅ 표준
Widget* w2 = new (std::cerr) Widget;       // ✅ placement
```

또는 `using ::operator new;`:

```cpp
class Widget {
public:
    using ::operator new;     // 글로벌 노출
    static void* operator new(std::size_t, std::ostream&);     // placement 추가
};
```

## 표준 nothrow placement도 같은 패턴

```cpp
Widget* w = new (std::nothrow) Widget;
//          ^^^^^^^^^^^^^^^^^^
//          placement — std::nothrow_t 매개변수
```

표준 시그니처:

```cpp
void* operator new(std::size_t, std::nothrow_t&) noexcept;
void  operator delete(void*, std::nothrow_t&) noexcept;
```

사용자가 nothrow placement new를 정의하면 — 매칭 delete도.

## 모든 시그니처를 다 정의 — 권장 패턴

```cpp
class Widget {
public:
    // 표준 new/delete
    static void* operator new(std::size_t);
    static void  operator delete(void*) noexcept;
    static void  operator delete(void*, std::size_t) noexcept;     // sized (C++14)
    
    // nothrow
    static void* operator new(std::size_t, std::nothrow_t&) noexcept;
    static void  operator delete(void*, std::nothrow_t&) noexcept;
    
    // 사용자 placement (예: log)
    static void* operator new(std::size_t, std::ostream& log);
    static void  operator delete(void*, std::ostream& log) noexcept;
    
    // C++17 align-aware
    static void* operator new(std::size_t, std::align_val_t);
    static void  operator delete(void*, std::align_val_t) noexcept;
};
```

각 new에 매칭 delete — 모든 시나리오에서 누수 없음.

## 흔한 함정 — 배열 형태

```cpp
class Widget {
public:
    static void* operator new(std::size_t);
    static void  operator delete(void*) noexcept;
};

Widget* arr = new Widget[10];     // ⚠️ 배열 new — operator new[] 호출
                                   //    operator new는 X
```

배열 형태는 별도 시그니처:

```cpp
class Widget {
public:
    static void* operator new[](std::size_t);     // 배열 new
    static void  operator delete[](void*) noexcept;
};
```

new와 new[]는 별개 함수 — 둘 다 정의 필요할 수도.

## 흔한 함정 — base class hiding

```cpp
class Base {
public:
    static void* operator new(std::size_t, std::ostream&);
    static void  operator delete(void*, std::ostream&) noexcept;
};

class Derived : public Base {
    // 아무것도 정의 안 함
};

Derived* d = new (std::cerr) Derived;     // ✅ 상속됨
delete d;                                    // ⚠️ 표준 delete 호출 — 누수 가능
```

derived가 추가 정의 안 하면 base의 것 상속. 그러나 일반 `delete` 시 base의 매칭 delete 없으면 — 표준 호출 + 누락.

해결: 일반 delete도 정의.

## 모던 변형 — `std::construct_at`, `std::destroy_at`

C++20:

```cpp
alignas(Widget) char buffer[sizeof(Widget)];
Widget* w = std::construct_at(reinterpret_cast<Widget*>(buffer), args);
std::destroy_at(w);
```

placement new/소멸자 호출의 typesafe wrapper. C++20 constexpr 가능.

## 실무 가이드 — 결정

```
placement new를 정의하나?
├── 추가 매개변수 있는 operator new → placement
├── 짝 맞는 placement delete 정의 필수 (생성자 throw 시)
├── 일반 delete도 함께 (사용자 delete w; 시)
├── 표준 시그니처 가려지면 — using 또는 명시
└── 배열 형태(operator new[]) — 필요하면 별도
```

## 실무 가이드 — 체크리스트

- [ ] placement new를 정의했는가?
- [ ] **매칭 placement delete**도 정의했는가? (생성자 throw 시)
- [ ] **일반 delete**도 정의했는가? (`delete w;` 시)
- [ ] noexcept 명시?
- [ ] 표준 시그니처가 가려지지 않는가? (using 또는 명시)
- [ ] 배열 형태 필요한가? — `operator new[]/delete[]`도

## 핵심 정리

1. **placement new** = 추가 매개변수를 받는 `operator new` 오버로드
2. **생성자 throw 시 컴파일러가 매칭 placement delete 자동 호출**
3. 매칭 delete 없으면 — **메모리 누수**
4. **일반 delete**(`delete w;`용)도 함께 정의
5. operator new를 클래스에 두면 — **표준/글로벌 시그니처 가려짐** (using으로 노출)
6. C++20 **`std::construct_at`** / **`std::destroy_at`** — placement의 typesafe wrapper

## 관련 항목

- [항목 49: new-handler](/blog/programming/cpp/effective-cpp/item49-understand-the-behavior-of-the-new-handler) — 실패 처리
- [항목 50: new/delete 교체](/blog/programming/cpp/effective-cpp/item50-understand-when-it-makes-sense-to-replace-new-and-delete) — 정당한 사유
- [항목 51: new/delete 규약](/blog/programming/cpp/effective-cpp/item51-adhere-to-convention-when-writing-new-and-delete) — 일반 규칙
