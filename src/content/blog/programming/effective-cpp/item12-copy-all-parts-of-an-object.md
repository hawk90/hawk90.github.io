---
title: "항목 12: 객체의 모든 부분을 복사하라"
date: 2025-02-02T17:00:00
description: "복사 함수에서 멤버와 base 부분을 빠뜨리지 않는 법. 멤버 추가 시 컴파일러는 침묵한다."
tags: [C++, Effective C++, Copy Constructor]
series: "Effective C++"
seriesOrder: 12
---

## 개요

복사 생성자와 복사 대입 연산자를 **직접 작성하면 책임도 본인 것** — 모든 멤버와 base 클래스 부분을 빠뜨리지 않고 복사해야 합니다. 멤버를 새로 추가한 후 복사 함수를 업데이트하지 않으면 컴파일러는 **경고도 없이** 부분 복사를 허용합니다. 컴파일러 자동 생성에 맡길 수 있으면 그게 가장 안전한 길.

## 함정 1 — 멤버 추가 후 업데이트 누락

```cpp
class Customer {
    std::string name;
public:
    Customer(const Customer& rhs)
        : name(rhs.name) {}

    Customer& operator=(const Customer& rhs) {
        name = rhs.name;
        return *this;
    }
};
```

나중에 멤버를 추가:

```cpp
class Customer {
    std::string name;
    Date        lastTransaction;     // ⚠️ 새 멤버 추가
public:
    Customer(const Customer& rhs)
        : name(rhs.name) {}           // ⚠️ lastTransaction 복사 누락
                                       //    Date의 기본 생성자가 호출됨

    Customer& operator=(const Customer& rhs) {
        name = rhs.name;
        return *this;                  // ⚠️ lastTransaction 대입 누락
    }                                  //    값이 변하지 않음
};
```

**컴파일러는 침묵**합니다 — 사용자가 명시적으로 작성한 함수에 대해 "왜 멤버를 빠뜨렸냐"고 묻지 않음. 사용자가 "원하는 멤버만 복사"하는 의도일 수도 있으니까. 결과: 부분 복사 버그가 조용히 코드에 들어감.

```cpp
Customer original;
original.recordPurchase();
Customer copy = original;
// copy.lastTransaction은 default Date — original과 다름!
```

## 함정 2 — 상속 시 base 부분

```cpp
class PriorityCustomer : public Customer {
    int priority;
public:
    PriorityCustomer(const PriorityCustomer& rhs)
        : priority(rhs.priority) {}     // ⚠️ Customer 부분 복사 누락
                                         //    Customer 기본 생성자 호출됨
                                         //    rhs.name, rhs.lastTransaction 무시

    PriorityCustomer& operator=(const PriorityCustomer& rhs) {
        priority = rhs.priority;        // ⚠️ Customer 대입 누락
        return *this;
    }
};
```

derived 복사 생성자는 **반드시** base의 복사 생성자를 호출해야 합니다 — 그렇지 않으면 base의 기본 생성자가 호출되어 rhs의 base 부분이 무시됨.

## 해결 — base 명시적 호출

```cpp
class PriorityCustomer : public Customer {
public:
    PriorityCustomer(const PriorityCustomer& rhs)
        : Customer(rhs),                // ✅ base 복사 생성자 호출
          priority(rhs.priority) {}

    PriorityCustomer& operator=(const PriorityCustomer& rhs) {
        Customer::operator=(rhs);        // ✅ base 복사 대입 호출
        priority = rhs.priority;
        return *this;
    }
};
```

**핵심**:
- 복사 생성자: 멤버 초기화 리스트에 `: Base(rhs)`
- 복사 대입: 본문 첫 줄에 `Base::operator=(rhs)`

## 함정 3 — 복사 생성자가 복사 대입을 부르거나, 반대

자연스럽게 떠오르는 코드 중복 제거:

```cpp
// ❌ 비논리적
PriorityCustomer(const PriorityCustomer& rhs) {
    *this = rhs;        // 복사 대입 호출
}

PriorityCustomer& operator=(const PriorityCustomer& rhs) {
    // ... 복사 ...
}
```

**문제**: 복사 생성자는 "**객체를 새로 만드는 중**" — 멤버는 default 초기화 상태에서 대입. 한편 복사 대입은 "**이미 만들어진 객체**" — 옛 값을 갖고 있어 정리가 필요할 수 있음. 두 함수의 전제가 다르므로 한 쪽이 다른 쪽을 호출하는 건 의미가 어긋남.

반대도 마찬가지:

```cpp
// ❌ 더 이상함
PriorityCustomer& operator=(const PriorityCustomer& rhs) {
    this->~PriorityCustomer();          // 소멸자 호출
    new (this) PriorityCustomer(rhs);   // placement new로 재생성
    return *this;
}
```

소멸자 + placement new는 **객체 식별성**(identity)을 깨트림 — base 포인터로 polymorphic하게 다루는 경우 특히 위험. 권장되지 않음.

## 해결 — 공통 로직은 private helper로

```cpp
class Widget {
    // ... 멤버 ...

    void init() {                       // 공통 초기화
        // 멤버 default 설정
    }

    void copyFrom(const Widget& rhs) {  // 공통 복사 로직
        // 멤버별 복사
    }

public:
    Widget() { init(); }

    Widget(const Widget& rhs) {
        init();         // 또는 멤버 init list 사용
        copyFrom(rhs);
    }

    Widget& operator=(const Widget& rhs) {
        if (this == &rhs) return *this;
        copyFrom(rhs);
        return *this;
    }
};
```

**규칙**: 복사 생성자와 복사 대입 사이의 공통 코드는 **별도의 private 멤버 함수**로 추출. 두 함수가 같은 멤버 함수를 호출하되, 서로를 직접 호출하지 않음.

## 더 나은 해결 — 컴파일러 자동 생성 (rule of zero)

```cpp
class Customer {
    std::string name;
    Date        lastTransaction;
public:
    // 복사 함수 안 적음 — 컴파일러가 멤버별 복사 자동 생성
    // → 멤버 추가해도 자동으로 추가됨, 누락 없음
};
```

**rule of zero**: 멤버가 모두 적절한 복사 의미를 가진 타입이라면 (스마트 포인터·컨테이너·기본 타입) — **아무것도 적지 마**. 컴파일러가 알아서 합니다.

자동 생성된 복사 생성자는:
- 모든 멤버에 대해 그 타입의 복사 생성자 호출
- base 클래스의 복사 생성자 호출
- 멤버 추가 시 자동 적응

자원 관리 필요한 클래스만 직접 작성 — 그 경우 RAII로 분리 가능하면 더 좋음 (항목 13, 14).

## copy-and-swap으로 통일 (C++11+)

```cpp
class Widget {
    Bitmap* pb;
public:
    Widget(const Widget& rhs)
        : pb(new Bitmap(*rhs.pb)) {}    // 복사 ctor 작성

    void swap(Widget& other) noexcept {
        std::swap(pb, other.pb);
    }

    Widget& operator=(Widget rhs) noexcept {   // 값 매개변수
        swap(rhs);                               // 복사 ctor 재사용
        return *this;
    }                                            // rhs 소멸 시 옛 자원 해제

    ~Widget() { delete pb; }
};
```

`operator=`가 인자를 **값으로 받음** — 호출 시 복사 생성자 호출 → 복사 로직 단일 출처. 멤버 추가 시 복사 생성자만 업데이트하면 대입도 자동.

## 흔한 함정 — 깊은/얕은 복사 혼동

```cpp
class Bad {
    int*  numbers;
    int   count;
public:
    Bad(const Bad& rhs)
        : numbers(rhs.numbers),         // ⚠️ 포인터만 복사 — shallow
          count(rhs.count) {}
};
```

`numbers`는 동적 할당 배열. 둘이 같은 메모리를 가리키게 됨 — 한쪽이 소멸하면 다른 쪽은 dangling, 양쪽 모두 소멸하면 이중 해제.

```cpp
// 깊은 복사
Bad(const Bad& rhs)
    : numbers(new int[rhs.count]),
      count(rhs.count) {
    std::copy(rhs.numbers, rhs.numbers + count, numbers);
}
```

대안: `std::vector<int>` 사용 → 자동으로 깊은 복사 (rule of zero).

## 컴파일러 도움 — `-Wsuggest-final-types`, `-Wuninitialized`

gcc/clang에서 `-Wsuggest-override`, `-Wsuggest-final-methods` 등은 다른 함정을 잡지만, **부분 복사를 직접 잡는 옵션은 없음** — 사용자가 의도적으로 일부 멤버만 복사하는 경우와 구별 불가.

해결: **rule of zero 따르거나, 코드 리뷰에서 자문**.

## 실무 가이드 — 체크리스트

복사 함수를 직접 작성한다면:

- [ ] 클래스의 모든 멤버를 복사하고 있는가?
- [ ] base 클래스가 있다면 `Base(rhs)` 또는 `Base::operator=(rhs)` 호출?
- [ ] 멤버 추가 시 복사 함수 업데이트 — 코드 리뷰 체크리스트에 명시?
- [ ] 복사 생성자가 복사 대입을 호출하지 않는가? (반대도)
- [ ] 공통 로직은 private helper로 분리?
- [ ] **rule of zero**가 가능한지 먼저 검토했는가?

## 핵심 정리

1. **복사 함수는 모든 멤버를 복사** — 멤버 추가 시 업데이트 책임은 본인
2. **상속 시 base 부분도 명시적으로** — `Base(rhs)`, `Base::operator=(rhs)`
3. 복사 생성자와 복사 대입 **서로 호출하지 마라** — 의미가 어긋남
4. 공통 로직은 `private` 멤버 함수로 분리
5. **rule of zero**: 가능하면 컴파일러 자동 생성에 맡기는 게 가장 안전
6. copy-and-swap으로 복사 로직 단일화

## 관련 항목

- [항목 5: C++가 자동 생성하는 함수들](/blog/programming/effective-cpp/item05-know-what-functions-cpp-silently-writes) — rule of zero 기반
- [항목 11: 자기 대입 처리](/blog/programming/effective-cpp/item11-handle-assignment-to-self-in-operator-equals) — copy-and-swap의 다른 측면
- [항목 13: 자원 관리에는 객체](/blog/programming/effective-cpp/item13-use-objects-to-manage-resources) — 복사 책임을 RAII에 위임
