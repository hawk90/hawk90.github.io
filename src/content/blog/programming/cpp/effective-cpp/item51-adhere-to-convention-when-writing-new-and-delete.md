---
title: "항목 51: new와 delete를 작성할 때 규약을 따르라"
date: 2025-02-03T03:00:00
description: "operator new/delete 구현 시 지켜야 할 표준 규약 — handler 루프, 0-byte, 상속, 정렬, 짝 맞춤."
tags: [C++, Effective C++, new, delete]
series: "Effective C++"
seriesOrder: 51
draft: true
---

## 왜 이 항목이 중요한가?

`operator new`와 `operator delete`를 직접 작성하기로 했다면 (항목 50의 정당한 사유로), **표준이 정한 규약**을 지켜야 한다. 일반 함수처럼 자유롭게 짤 수 없다.

이 규약을 어기면 미묘한 함정이 따라온다.

- handler 루프 미구현 → 메모리 부족 시 우아한 복구 기회 사라짐.
- 0-byte 요청 처리 누락 → 표준 라이브러리 호출 시 깨짐.
- 정렬 위반 → SIMD 코드, atomic 등에서 UB.
- 짝 맞춤 누락 → `new`만 오버로드하고 `delete`를 안 만들면 누수.

이 항목은 두 함수의 정확한 시그니처, 0-byte/상속/정렬 처리, 그리고 **짝 맞춤** 의무를 정리한다.

## 개요

`operator new`와 `operator delete`를 직접 작성하기로 했다면 표준이 정한 **규약**을 지켜야 한다. 잘못된 구현은 메모리 누수, 정렬 위반, handler 미호출 등으로 이어진다. 이 항목은 두 함수의 정확한 시그니처, 0-byte/상속/정렬 처리, 그리고 **짝 맞춤** 의무를 정리한다.

## `operator new`의 규약

표준이 요구하는 동작:

1. **올바른 반환값** — 성공 시 메모리 포인터, 실패 시 `std::bad_alloc` throw
2. **handler 호출 루프** — 메모리 부족 시 등록된 `new_handler` 부르고 재시도 (항목 49)
3. **0-byte 요청 처리** — 0 byte도 유효 포인터 반환 의무
4. **잘못된 크기 위임** — 클래스 멤버 `new`인데 derived의 큰 요청은 글로벌 `::operator new`로

### 정석 구현

```cpp
void* operator new(std::size_t size) {
    if (size == 0) size = 1;     // 0-byte를 1-byte로 (표준 보장 위해)
    
    while (true) {
        void* p = std::malloc(size);
        if (p) return p;          // 성공
        
        // 메모리 부족 — 현재 핸들러 조회
        std::new_handler h = std::set_new_handler(nullptr);
        std::set_new_handler(h);
        
        if (h) (*h)();            // 핸들러 호출 → 다시 시도
        else throw std::bad_alloc();
    }
}
```

핵심 디테일:
- 0 → 1 변환: 같은 메모리 영역 두 번 할당해도 두 다른 포인터 보장
- 루프: 핸들러가 메모리를 확보했을 수 있음
- 핸들러 조회 — `set_new_handler(nullptr)`로 받아오기 + 다시 set

## 클래스 멤버 `operator new` — 상속 처리

```cpp
class Base {
public:
    static void* operator new(std::size_t size) {
        if (size != sizeof(Base))
            return ::operator new(size);     // ⚠️ derived 크기는 글로벌로 위임
        
        // Base 전용 처리 (예: 풀 할당)
        return basePool.allocate();
    }
};

class Derived : public Base {
    int extraData[100];     // Base보다 큰 객체
};

Derived* p = new Derived;
// Base::operator new 호출 (상속됨)
// size == sizeof(Derived) > sizeof(Base)
// → 위 코드에서 글로벌 ::operator new로 위임 — 안전
```

**왜 위임?**: Base의 풀은 `sizeof(Base)` 단위로 설계됨. Derived는 더 크므로 풀에 안 맞음. 글로벌로 위임해야 함.

만약 위임 안 하면 — Derived가 풀에 안 맞아 메모리 손상 또는 동작 미정의.

## `operator delete`의 규약

1. **null 포인터는 OK** — `delete nullptr`는 합법 (no-op)
2. **잘못된 크기 위임** — 클래스 멤버 delete는 같은 위임 패턴
3. **`noexcept` 필수** — 소멸자처럼 throw하면 위험

```cpp
void operator delete(void* p) noexcept {
    if (p == nullptr) return;       // null은 OK
    std::free(p);
}
```

## 클래스 멤버 `operator delete` — 크기 매개변수

C++14+ 표준은 size 매개변수를 받는 시그니처도 정의 (sized deallocation):

```cpp
class Base {
public:
    static void* operator new(std::size_t size);
    static void  operator delete(void* p, std::size_t size) noexcept {
        if (!p) return;
        if (size != sizeof(Base)) {
            ::operator delete(p);     // 위임
            return;
        }
        basePool.deallocate(p);
    }
};
```

size를 받으면 — 풀 종류 식별, 정확한 위임 가능.

## 짝 맞춤 — new와 delete

new를 정의했으면 **반드시 짝이 되는 delete**도 정의:

```cpp
class Widget {
public:
    static void* operator new(std::size_t);
    // operator delete가 없으면? — 컴파일러는 ::operator delete 호출
    //   → 풀에 free 시도 — 메모리 손상
};
```

`Widget* w = new Widget;` 후 `delete w;`:
- new는 풀에서 할당
- delete는 표준 ::operator delete 호출 (Widget에 없음)
- 풀이 잘못된 free → 손상

**규칙**: `operator new` 정의하면 `operator delete`도 정의.

## C++17 — align-aware 오버로드

엄격한 정렬을 가진 타입에 대해 컴파일러가 호출하는 별도 오버로드:

```cpp
// C++17 표준 시그니처
void* operator new(std::size_t size, std::align_val_t alignment);
void  operator delete(void* p, std::align_val_t alignment) noexcept;

// 크기 + 정렬
void* operator new(std::size_t size, std::align_val_t alignment);
void  operator delete(void* p, std::size_t size, std::align_val_t alignment) noexcept;
```

```cpp
struct alignas(64) Aligned {
    int data[16];
};

Aligned* p = new Aligned;     // C++17+: align-aware new 자동 호출
                               // 정렬 64-byte 보장
```

## placement new — 항목 52와 연결

```cpp
class Widget {
public:
    // 추가 매개변수가 있는 operator new = placement new
    static void* operator new(std::size_t size, std::ostream& log);
};

Widget* w = new (std::cerr) Widget;
```

placement new를 정의하면 — **매칭 placement delete**도. 항목 52.

## 함수 시그니처 정리 — 표준 오버로드

```cpp
// 비-멤버 (글로벌)
void* operator new(std::size_t);
void  operator delete(void* p) noexcept;
void  operator delete(void* p, std::size_t) noexcept;     // sized (C++14+)

// nothrow
void* operator new(std::size_t, std::nothrow_t&) noexcept;
void  operator delete(void* p, std::nothrow_t&) noexcept;

// align-aware (C++17+)
void* operator new(std::size_t, std::align_val_t);
void  operator delete(void* p, std::align_val_t) noexcept;
void  operator delete(void* p, std::size_t, std::align_val_t) noexcept;

// 배열 버전 (T[])
void* operator new[](std::size_t);
void  operator delete[](void* p) noexcept;
// ... 모든 위 시그니처의 배열 버전 ...

// placement (사용자 정의 — 표준 1개:)
void* operator new(std::size_t, void* p) noexcept { return p; }     // 정의된 위치 사용
```

이 모두를 정의할 필요는 없음 — 일반적으로 `new(size_t)` + `delete(void*)`만으로 충분. 다른 건 필요한 경우만.

## 흔한 함정

### 0-byte 무시

```cpp
void* operator new(std::size_t size) {
    return std::malloc(size);     // ⚠️ size == 0이면 malloc(0)
                                   //    구현에 따라 nullptr 또는 유효 포인터
                                   //    표준은 "유효 포인터"를 보장 의무
}
```

`if (size == 0) size = 1;`로 정정.

### handler 미호출

```cpp
void* operator new(std::size_t size) {
    void* p = std::malloc(size);
    if (p) return p;
    throw std::bad_alloc();     // ⚠️ handler 호출 안 함
                                 //    사용자 핸들러가 무시됨
}
```

handler 루프 필수.

### delete 누락

```cpp
class Widget {
    static void* operator new(std::size_t);
    // delete 정의 안 함 — 풀 할당 후 표준 free 호출 위험
};
```

짝 맞춤 필수.

### `noexcept` 누락

```cpp
void operator delete(void* p) {     // ⚠️ noexcept 없음
    std::free(p);
}
```

표준은 `operator delete`가 `noexcept`이길 강력히 권장. 명시 권장.

## 흔한 함정 — name hiding

```cpp
class Widget {
public:
    static void* operator new(std::size_t, std::ostream&);
    // 다른 operator new들 (글로벌·표준 nothrow 등) 가려짐
};

Widget* w = new Widget;     // ⚠️ 컴파일 에러 — placement만 있어서
                             //    표준 new(size_t) 안 보임
```

해결 — `using` 또는 명시:

```cpp
class Widget {
public:
    static void* operator new(std::size_t, std::ostream&);
    using ::operator new;     // 글로벌 노출 (모든 시그니처)
};
```

또는 모든 시그니처를 클래스에 명시.

## 모던 변형 — `std::launder`

C++17 `std::launder`는 placement new 후 메모리 접근을 안전하게:

```cpp
alignas(int) char buf[sizeof(int)];
int* p = new (buf) int(42);
int v = *std::launder(p);     // 안전한 접근 — strict aliasing 검증
```

저수준 메모리 조작 시 사용.

## 실무 가이드 — 결정

```
operator new/delete 작성?
├── 정말 필요한가? (항목 50 참고)
├── 외부 라이브러리(tcmalloc 등)로 해결 가능?
├── C++17 std::pmr로 해결 가능?
└── 직접 작성 결정 → 모든 규약 준수
    ├── handler 루프
    ├── 0-byte 처리
    ├── 상속 위임
    ├── 짝 delete + noexcept
    ├── 필요한 시그니처 정의 (size, align, placement)
    └── thread safety
```

## 실무 가이드 — 체크리스트

- [ ] handler 호출 루프 구현?
- [ ] 0-byte 요청 처리?
- [ ] 클래스 멤버 — 상속 크기 위임?
- [ ] `operator delete` 짝으로 정의?
- [ ] `delete`에 `noexcept` 명시?
- [ ] null 포인터 delete는 no-op?
- [ ] C++17 align-aware 필요한가?
- [ ] thread safety?
- [ ] name hiding으로 다른 시그니처 가려지지 않는가?

## 핵심 정리

1. **`operator new`** — handler 루프 + 0-byte + 상속 위임
2. **`operator delete`** — null 처리 + noexcept + 상속 위임
3. **짝 맞춤** — new를 정의하면 delete도
4. C++14+ **sized delete**, C++17+ **align-aware** 시그니처
5. **name hiding** — 클래스 정의가 글로벌·표준 시그니처 가림
6. 직접 작성 어려움 — 표준/외부 라이브러리 우선 (항목 50)

## 관련 항목

- [항목 49: new-handler](/blog/programming/cpp/effective-cpp/item49-understand-the-behavior-of-the-new-handler) — handler 루프
- [항목 50: new/delete 교체 시기](/blog/programming/cpp/effective-cpp/item50-understand-when-it-makes-sense-to-replace-new-and-delete) — 정당한 사유
- [항목 52: placement delete](/blog/programming/cpp/effective-cpp/item52-write-placement-delete-if-you-write-placement-new) — placement 짝
