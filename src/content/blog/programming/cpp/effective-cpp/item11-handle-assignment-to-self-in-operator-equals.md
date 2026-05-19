---
title: "항목 11: operator=에서 자기 대입을 처리하라"
date: 2026-05-04T11:00:00
description: "x = x; 자기 대입 — 별칭으로도 발생. identity check / 순서 변경 / copy-and-swap의 트레이드오프."
tags: [C++, Effective C++, Operator Overloading, Exception Safety]
series: "Effective C++"
seriesOrder: 11
draft: true
---

## 왜 이 항목이 중요한가?

`x = x`를 직접 적는 일은 거의 없다. 그런데 **별칭(alias)을 통해 의도치 않게** 자기 대입이 일어난다. 같은 객체를 두 포인터로 가리키거나, 컨테이너의 두 원소가 같은 객체이거나, base 포인터가 동일 객체를 가리키는 경우다.

자원을 raw로 관리하는 `operator=`가 자기 대입을 처리하지 않으면 다음 두 사고가 난다.

- **이중 해제** — `delete pData; pData = new T(rhs.data);`에서 rhs가 자신이라면 이미 해제된 메모리를 읽는다.
- **자원 손실** — copy-then-delete 순서가 잘못되면 객체가 비어버린다.

해결책은 세 가지다. identity check, 순서 변경, copy-and-swap. 이 항목은 셋의 트레이드오프와 어떤 패턴을 언제 쓸지를 정리한다.

## 개요

`x = x`는 직접 적는 일이 드물지만, **별칭(alias)을 통해 흔히 발생**한다. 같은 객체를 두 포인터/참조로 가리키거나, 같은 컨테이너 안의 두 원소가 우연히 같은 객체일 수 있다. 자원 관리 클래스의 `operator=`가 자기 대입을 처리하지 않으면 **이중 해제** 또는 **자원 손실**이 일어난다.

## 자기 대입은 언제 발생하나

직접:
```cpp
Widget w;
w = w;     // 직접 — 거의 안 함
```

별칭을 통해:
```cpp
Widget* p1 = &w;
Widget* p2 = &w;
*p1 = *p2;                  // 자기 대입

std::vector<Widget> v;
v[i] = v[j];                // i == j면 자기 대입

void f(Widget& a, Widget& b);    // 호출자가 같은 객체를 두 인자로 줄 수 있음
f(w, w);

Base* a = new Derived;
Base* b = a;
*a = *b;                     // 자기 대입 (별칭)
```

특히 컬렉션이나 다형성 컨테이너를 다루면 자기 대입은 **흔한** 사건.

## 위험한 코드 — 단순 패턴의 함정

```cpp
class Bitmap { /* ... */ };

class Widget {
    Bitmap* pb;
public:
    Widget& operator=(const Widget& rhs) {
        delete pb;                       // 1) 기존 자원 해제
        pb = new Bitmap(*rhs.pb);        // 2) rhs.pb 복사
        return *this;
    }
};

Widget w;
w = w;
//   delete w.pb;             ← 해제됨
//   pb = new Bitmap(*w.pb);  ← 이미 해제된 메모리 접근 → UB
```

**문제**: `rhs`가 `*this`와 같은 객체일 때, 1번 단계에서 `rhs.pb`까지 같이 해제된 셈. 2번에서 dangling pointer 역참조.

## 해결 1 — 자기 대입 검사 (identity check)

가장 직관적:

```cpp
Widget& operator=(const Widget& rhs) {
    if (this == &rhs) return *this;        // 자기 대입이면 즉시 반환
    delete pb;
    pb = new Bitmap(*rhs.pb);
    return *this;
}
```

장점: 단순. 자기 대입 사이클을 빠르게 건너뜀.

**단점 — 예외 안전성 미흡**:

```cpp
delete pb;                        // pb 해제 OK
pb = new Bitmap(*rhs.pb);         // new가 throw하면? pb는 dangling으로 남음
```

`new`가 메모리 부족으로 throw하면 `pb`는 이미 해제됐고 새 자원도 없어진 상태 — 객체가 손상.

## 해결 2 — 순서 변경 (statement reordering)

자기 대입과 예외 안전성을 동시에 해결:

```cpp
Widget& operator=(const Widget& rhs) {
    Bitmap* pOrig = pb;
    pb = new Bitmap(*rhs.pb);     // 새 자원 먼저
    delete pOrig;                  // 옛 자원 나중에 해제
    return *this;
}
```

**왜 동작하나**:
- `new`가 throw해도 `pb`는 원본 그대로 — 객체 상태 보존 (강력한 예외 보증)
- 자기 대입의 경우에도 `*rhs.pb`가 새 메모리에 복사된 후 옛 거 해제 — 안전

식별 검사 없이도 정상 동작. 약간의 비효율(자기 대입이라도 한 번 복사)이 있지만, 자기 대입은 드무므로 무시 가능.

성능이 정말 중요하다면 식별 검사 + 순서 변경 결합:

```cpp
Widget& operator=(const Widget& rhs) {
    if (this == &rhs) return *this;
    Bitmap* pOrig = pb;
    pb = new Bitmap(*rhs.pb);
    delete pOrig;
    return *this;
}
```

## 해결 3 — copy-and-swap

가장 우아한 패턴:

```cpp
class Widget {
    Bitmap* pb;
public:
    void swap(Widget& other) noexcept {
        std::swap(pb, other.pb);
    }

    Widget& operator=(Widget rhs) {      // ← 값으로 받음
        swap(rhs);                         // rhs와 swap
        return *this;
    }                                      // rhs 소멸 시 옛 pb 해제
};
```

**작동 원리**:
1. `operator=`가 인자를 **값으로 받음** — 호출 시점에 복사(또는 이동) 생성
2. `swap(rhs)` — 멤버를 통째로 교환. 원본 객체는 이제 새 자원, `rhs`는 옛 자원.
3. 함수 종료 — `rhs`가 소멸하면서 옛 자원 자동 해제

**장점**:
- 자기 대입도 자연스럽게 처리됨 (자기 대입이면 호출 시 복사 생성자 호출 → 별개의 객체)
- 예외 안전성: 복사 생성자가 throw하면 호출 시점에서 끝 — 원본 손상 X
- 코드 중복 제거: 복사 생성자가 이미 자원을 정확히 복사하는 로직을 가짐 → 재사용
- C++11+ 이동 의미론과 자연스럽게 결합 (값 매개변수로 이동 가능)

**단점**:
- 항상 한 번의 복사(또는 이동) 발생
- 작은 객체엔 약간 과한 패턴

### copy-and-swap의 C++11 이동 활용

```cpp
Widget& operator=(Widget rhs) noexcept {
    swap(rhs);
    return *this;
}

// 호출
Widget a, b;
a = b;            // b를 복사 생성으로 rhs 만듦
a = std::move(b); // b를 이동 생성으로 rhs 만듦 — 비용 거의 0!
```

복사 대입과 이동 대입을 **한 함수로** 처리.

## 비교 — 어느 방식을 쓸 것인가

| 패턴 | 자기 대입 | 예외 안전 | 코드 중복 | 비용 |
| --- | --- | --- | --- | --- |
| identity check | OK | ❌ | 별도 작성 | 자기 대입은 빠름 |
| 순서 변경 | OK | ✅ | 별도 작성 | 항상 한 번 복사 |
| copy-and-swap | OK | ✅ | 복사 ctor 재사용 | 항상 한 번 복사·이동 |
| identity + 순서 변경 | OK | ✅ | 별도 작성 | 자기 대입은 빠름 |

대부분의 경우 **copy-and-swap**이 가장 깨끗하고 안전. 성능이 critical하면 식별 검사 추가.

## 단순한 클래스 — 신경 쓸 필요 없음

```cpp
class Point {
    int x, y;
};
// 컴파일러 자동 생성 operator=는 멤버별 대입
// 내장 타입 멤버의 자기 대입은 안전(int = int)
// → 사용자가 작성할 필요 자체가 없음
```

**자기 대입 처리는 자원을 직접 관리하는 클래스에만 필요**. 컴파일러 자동 생성 함수에 맡길 수 있는 클래스는 무시.

## 흔한 함정 — 멤버 함수 안에서 self check 잊기

```cpp
class Widget {
public:
    void absorb(Widget& other) {       // other를 흡수
        delete pData;
        pData = other.pData;
        other.pData = nullptr;
    }
};

Widget w;
w.absorb(w);    // ⚠️ 자기 흡수 — pData 해제 후 같은 nullptr로 덮어씀
                //    의도와 다른 동작
```

`operator=` 외의 멤버 함수도 같은 함정 — `swap`, `merge`, `assign` 류는 자기 호출 가능성 검토.

## C++11+ 이동 대입에서도

```cpp
Widget& operator=(Widget&& rhs) noexcept {
    if (this == &rhs) return *this;        // 식별 검사
    delete pb;
    pb = rhs.pb;
    rhs.pb = nullptr;
    return *this;
}
```

이동 대입도 자기 대입(`a = std::move(a)`) 가능. 무의미한 호출이지만 발생하면 처리 필요.

표준 라이브러리는 "self-move는 valid but unspecified state"를 허용 — 정상 동작은 보장 안 하지만 UB도 아님. 그래도 사용자 코드는 안전하게 두는 게 좋음.

## 실무 가이드 — 결정 트리

```
이 클래스가 자원을 직접 관리하나? (raw pointer / handle)
├── 아니오 → rule of zero — operator= 작성 X
└── 예
    ├── 단순 비용·강력 예외 안전 → copy-and-swap
    ├── 성능 critical → identity + 순서 변경
    └── C++98 호환 필요 → 순서 변경 (또는 identity)
```

## 핵심 정리

1. 자기 대입은 **별칭으로 흔히 발생** — 컬렉션·다형성에서 특히
2. **단순 자기 대입 검사**(`if (this == &rhs)`)는 예외 안전성 부족
3. **순서 변경**: 새 자원 먼저 → 옛 자원 해제 (강력한 예외 보증)
4. **copy-and-swap**: 가장 깨끗 — 자기 대입·예외·코드 중복 동시 해결
5. 자원을 직접 관리하지 않는 클래스는 컴파일러 자동에 맡기고 신경 쓸 필요 없음

## 관련 항목

- [항목 10: 대입 연산자는 *this 참조 반환](/blog/programming/cpp/effective-cpp/item10-have-assignment-operators-return-reference-to-this) — operator= 시그니처
- [항목 12: 객체의 모든 부분을 복사](/blog/programming/cpp/effective-cpp/item12-copy-all-parts-of-an-object) — operator=의 책임
- [항목 25: non-throwing swap 지원](/blog/programming/cpp/effective-cpp/item25-consider-support-for-a-non-throwing-swap) — copy-and-swap의 핵심 도구
- [항목 29: 예외 안전 코드](/blog/programming/cpp/effective-cpp/item29-strive-for-exception-safe-code) — 강력한 예외 보증
