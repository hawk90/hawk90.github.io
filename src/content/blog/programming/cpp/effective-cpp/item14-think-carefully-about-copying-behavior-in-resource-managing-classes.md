---
title: "항목 14: 자원 관리 클래스의 복사 동작을 신중히 결정하라"
date: 2025-02-03T11:00:00
description: "복사 금지·참조 카운트·깊은 복사·소유권 이전 — 네 가지 복사 정책과 C++11 이동 의미론의 결합."
tags: [C++, Effective C++, RAII, Copy]
series: "Effective C++"
seriesOrder: 14
---

## 개요

자원 관리(RAII) 클래스를 만들 때 가장 먼저 물어야 할 질문은 "**이 클래스를 복사하면 자원에 어떤 일이 일어나야 하는가?**" 입니다. 답은 자원의 성격(공유 가능한가, 독점인가)에 따라 다릅니다. 네 가지 흔한 정책 중 도메인에 맞는 것을 의식적으로 선택하지 않으면 컴파일러가 자동 생성하는 정책(보통 멤버별 비트 복사)이 적용되어 — 거의 항상 잘못된 동작을 합니다.

## 4가지 복사 정책

### 1) 복사 금지 (uncopyable)

자원의 성격상 복사 자체가 무의미한 경우 — 뮤텍스, 파일 핸들, 네트워크 소켓, GPU 컨텍스트.

```cpp
class Lock {
    Mutex* mu;
public:
    explicit Lock(Mutex* m) : mu(m) { mu->lock(); }
    ~Lock() { mu->unlock(); }

    Lock(const Lock&)            = delete;
    Lock& operator=(const Lock&) = delete;
};
```

**이유**: 두 Lock이 같은 뮤텍스를 관리하면 unlock이 두 번 호출됨 — 위험.

**C++11+**: `= delete`. C++98엔 private 선언 + 정의 없음.

### 2) 참조 카운트 (reference counting)

자원이 공유 가능하고, **마지막 사용자가 떠날 때 해제**되어야 하는 경우. `std::shared_ptr` 패턴.

```cpp
class Lock {
    std::shared_ptr<Mutex> mu;
public:
    explicit Lock(Mutex* m)
        : mu(m, [](Mutex* p) { p->unlock(); }) {     // custom deleter로 unlock
        m->lock();
    }
    // 복사·이동은 자동 생성 — shared_ptr가 카운트 관리
};

{
    Lock l1(&m);     // lock 호출, count=1
    Lock l2 = l1;    // count=2 (lock 추가 호출 X)
    // ... 둘 다 critical section ...
}                    // l2 소멸 → count=1, 해제 X
                     // l1 소멸 → count=0, unlock 호출
```

`shared_ptr`의 control block이 카운트와 해제 정책을 보관. 두 번째 인자에 deleter를 주면 `delete` 대신 다른 동작.

**주의**: 위 예제는 의도가 "여러 객체가 같은 뮤텍스 공유"인 경우만 적절. 보통의 락은 (1)번 또는 (4)번이 맞음.

### 3) 깊은 복사 (deep copy)

자원 자체를 **복제**. `std::string`, `std::vector`, 일반적인 값 타입.

```cpp
class Buffer {
    char*  data;
    size_t size;
public:
    Buffer(size_t n) : data(new char[n]), size(n) {}
    ~Buffer() { delete[] data; }

    Buffer(const Buffer& rhs)
        : data(new char[rhs.size]), size(rhs.size) {
        std::copy(rhs.data, rhs.data + size, data);
    }

    Buffer& operator=(Buffer rhs) noexcept {   // copy-and-swap
        swap(rhs);
        return *this;
    }

    void swap(Buffer& other) noexcept {
        std::swap(data, other.data);
        std::swap(size, other.size);
    }
};
```

**비용**: 자원 자체를 복제하므로 큰 자원이면 비쌈 — 이동 연산도 같이 정의 권장.

```cpp
Buffer(Buffer&& other) noexcept
    : data(other.data), size(other.size) {
    other.data = nullptr;
    other.size = 0;
}
```

`std::vector<int> v2 = v1;` — 깊은 복사. `std::vector<int> v2 = std::move(v1);` — 이동, O(1).

### 4) 소유권 이전 (ownership transfer)

`std::unique_ptr` 패턴 — 복사는 금지, 이동만 허용.

```cpp
class Owner {
    Resource* r;
public:
    explicit Owner(Resource* res) : r(res) {}
    ~Owner() { delete r; }

    Owner(const Owner&) = delete;            // 복사 금지
    Owner& operator=(const Owner&) = delete;

    Owner(Owner&& other) noexcept
        : r(other.r) { other.r = nullptr; }   // 이동만 허용
    Owner& operator=(Owner&& other) noexcept {
        if (this != &other) {
            delete r;
            r = other.r;
            other.r = nullptr;
        }
        return *this;
    }
};
```

C++98의 `std::auto_ptr`가 이 모델을 **복사 형태로** 구현 — 코드가 `b = a;`인데 `a`의 소유권이 빠져나가는 의외성 때문에 deprecate, C++17에서 제거. C++11+ `unique_ptr`는 **명시적 `std::move`** 가 있을 때만 이전.

## 결정 기준 — 매트릭스

| 자원 특성 | 정책 |
| --- | --- |
| 공유 의미 없음 (락, 핸들) | 복사 금지 (1) |
| 공유 가능, 마지막 사용자 해제 | 참조 카운트 (2) |
| 자원 자체가 가벼움 (값 타입) | 깊은 복사 (3) |
| 자원 무겁고 단일 사용자 | 소유권 이전 (4) |
| 자원 무겁고 다수 사용자 | 참조 카운트 (2) |

## 흔한 함정 — 자동 생성에 맡기는 함정

```cpp
class Naive {
    Resource* r;
public:
    Naive() : r(new Resource) {}
    ~Naive() { delete r; }
    // 복사/이동 미정의 — 컴파일러 자동 생성
};

Naive a, b;
b = a;     // r 비트 복사 — 두 객체가 같은 자원 가리킴
           // → 한쪽 소멸 시 dangling, 둘 다 소멸 시 이중 해제
```

**raw 포인터 멤버 + 사용자 정의 소멸자**는 거의 항상 함정 — 자동 생성된 복사가 의도와 다름. **반드시 4가지 정책 중 하나를 명시적으로 선택**.

해결책: `std::unique_ptr<Resource>` 사용 (rule of zero, 정책 4 자동 적용).

## 모던 변형 — `std::unique_ptr` 멤버로 자동 해결

```cpp
class Better {
    std::unique_ptr<Resource> r;
public:
    Better() : r(std::make_unique<Resource>()) {}
    // 복사 자동 X (unique_ptr 비복사) — 이동 자동 OK
    // 소멸자도 자동 OK
};
```

`unique_ptr`로 멤버 타입을 바꾸면 — 복사 자동 차단(원하면 명시적으로 deep copy 작성), 이동 자동, 소멸 자동. 거의 모든 경우 추천.

## 흔한 변형 — 깊은 복사 + 이동

대부분의 값 타입은 (3) 깊은 복사 + 이동 의미론.

```cpp
class String {
    char*  data;
    size_t size;
public:
    String(const String&);                     // 깊은 복사
    String& operator=(const String&);
    String(String&&) noexcept;                  // 이동
    String& operator=(String&&) noexcept;
    ~String();
};
```

C++11+의 표준 라이브러리 값 타입은 모두 이 패턴 — `std::string`, `std::vector`, `std::map` 등.

## 결합 — `clone()` 메서드 (다형성 복사)

다형성 클래스에서 복사가 필요한 경우 (값 의미가 아니므로 일반 복사 어색):

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
};

class Circle : public Shape {
    double radius;
public:
    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Circle>(*this);
    }
};

Shape* s = factory();
auto copy = s->clone();    // 다형적 복사
```

복사 생성자를 protected/deleted로 두고 `clone`만 노출 — 값 슬라이싱(slicing) 방지.

## 실무 가이드 — 결정 트리

```
이 자원은 복사 의미가 있는가?
├── 아니오 (락, 핸들, 소켓)
│   └── 복사 금지 (정책 1) + 이동도 보통 금지
├── 자원 자체를 복제 (값 타입)
│   └── 깊은 복사 (정책 3) + 이동 추가
├── 다수 사용자 공유 (캐시, 큰 데이터)
│   └── 참조 카운트 (정책 2) — shared_ptr 사용
└── 단일 소유 (resource handle, unique resource)
    └── 소유권 이전 (정책 4) — unique_ptr 사용
```

## 실무 가이드 — 체크리스트

- [ ] 클래스가 자원을 직접 관리하는가?
- [ ] 4가지 정책 중 어느 것이 도메인에 맞는지 결정했는가?
- [ ] 복사 ops 명시했는가? (default / delete / 직접 작성)
- [ ] 이동 ops도 명시했는가? (C++11+)
- [ ] **자동 생성에 의존하고 있다면 의도와 일치하는지 확인했는가?**
- [ ] 가능하면 RAII 멤버 타입(`unique_ptr` 등)으로 rule of zero?

## 핵심 정리

1. RAII 클래스의 복사 정책은 **4가지 중 하나** — 의식적으로 선택
2. **컴파일러 자동 생성은 보통 잘못** — raw pointer 멤버 + 사용자 dtor면 거의 항상
3. **복사 금지**(락, 핸들), **참조 카운트**(공유), **깊은 복사**(값), **소유권 이전**(단일 소유)
4. C++11+ 이동 의미론과 결합 — 4가지 정책 어디든 이동 추가 가능
5. **rule of zero**: `unique_ptr`/`shared_ptr`/`vector` 등으로 멤버 타입을 바꾸면 정책이 자동으로

## 관련 항목

- [항목 6: 컴파일러 자동 함수 금지](/blog/programming/cpp/effective-cpp/item06-explicitly-disallow-compiler-generated-functions) — 복사 금지 패턴
- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — 4가지 정책의 기반
- [항목 15: raw 자원 접근](/blog/programming/cpp/effective-cpp/item15-provide-access-to-raw-resources-in-resource-managing-classes) — 정책과 무관하게 raw API 다리
