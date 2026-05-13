---
title: "항목 28: 객체 내부 핸들 반환을 피하라"
date: 2025-02-05T12:00:00
description: "내부 데이터의 참조/포인터/반복자 반환은 캡슐화를 깨고 댕글링을 만든다. 임시 객체 + 내부 핸들의 함정."
tags: [C++, Effective C++, Encapsulation, Dangling]
series: "Effective C++"
seriesOrder: 28
---

## 왜 이 항목이 중요한가?

`getter`가 객체 내부의 **참조/포인터/반복자**를 그대로 반환하면 두 가지 사고가 일어난다.

- **캡슐화 우회** — 사용자가 받은 참조로 내부 상태를 직접 수정한다. private의 의미가 사라진다.
- **댕글링** — 객체가 소멸한 후에도 핸들이 살아있다. 특히 **임시 객체에서 핸들을 받으면** 표현식이 끝나는 순간 댕글링이 된다.

const 참조 반환이 캡슐화 문제는 해결하지만 댕글링은 여전하다. 가능하면 **값으로 반환**하고, 어쩔 수 없으면 const + 라이프타임 문서화가 답이다.

C++17의 `string_view`, C++20의 `span` 같은 non-owning view 타입도 같은 함정을 가진다 — 원본 수명에 묶인다.

## 개요

객체 내부 데이터에 대한 **참조·포인터·반복자**(handles)를 반환하면 두 가지 위험이 따라온다. 사용자가 그 핸들로 캡슐화를 우회 변경할 수 있고, 객체가 소멸한 후에도 핸들을 들고 있을 수 있다(댕글링). const로 막아도 댕글링 위험은 그대로다. 가능하면 **값으로 반환**, 어쩔 수 없으면 const + 라이프타임 문서화가 답이다.

## 위험 1 — 캡슐화 우회

```cpp
class Rectangle {
    Point ulhc, lrhc;        // 좌상단, 우하단
public:
    Point& upperLeft() const { return ulhc; }    // ⚠️ 참조 반환
    Point& lowerRight() const { return lrhc; }
};

Rectangle r;
r.upperLeft().setX(50);      // const 메서드인데 내부 데이터가 수정됨!
```

**무엇이 잘못됐나**:
- `upperLeft()`는 `const` 멤버 함수 → 객체 상태가 변경 안 될 것이라는 약속
- 그런데 `Point&`(non-const)를 반환 → 사용자가 그 참조로 내부 데이터 수정
- **bitwise const**(컴파일러 관점)는 OK, **logical const**(사용자 관점)는 깨짐

이는 항목 3에서 다룬 `CTextBlock` 함정과 같은 패턴.

### 부분적 해결 — const 참조

```cpp
const Point& upperLeft() const { return ulhc; }    // const&
const Point& lowerRight() const { return lrhc; }
```

```cpp
Rectangle r;
r.upperLeft().setX(50);       // ❌ const Point&라 수정 차단
```

`const` 반환으로 캡슐화 일부 회복. 그러나 **댕글링은 여전히** 가능.

## 위험 2 — 댕글링 핸들

```cpp
class GUIObject { /* ... */ };
const Rectangle bounds(const GUIObject& obj);    // 값 반환

GUIObject* pgo = ...;
const Point* p = &(bounds(*pgo).upperLeft());
//               ^^^^^^^^^^^^^^
//               임시 Rectangle 객체
```

펼치면:
1. `bounds(*pgo)` — 임시 Rectangle 반환
2. `.upperLeft()` — 임시의 `Point&` 반환
3. `&(...)` — 임시 안의 Point 주소
4. 전체 표현식 종료 → **임시 Rectangle 소멸 → p는 댕글링!**
5. `*p` — UB

내부 핸들 반환은 **임시 객체와 결합하면 댕글링이 흔히 발생**. 사용자는 자신이 임시 안의 데이터를 가리키고 있다는 걸 알아채기 어려움.

### const 만으로는 부족

```cpp
const Point& upperLeft() const;     // const&

const Point* p = &bounds(*pgo).upperLeft();    // 여전히 같은 댕글링
                                                 // const라도 임시는 소멸
```

const는 수정만 차단할 뿐 — 라이프타임 문제는 별개.

## 표준 라이브러리도 같은 위험

```cpp
std::vector<int> v{1, 2, 3};
int* p = &v[0];                     // 내부 데이터 포인터
v.push_back(4);                      // ⚠️ realloc 가능 → p 댕글링
```

표준 컨테이너의 `operator[]`, `data()`, `begin()` 등도 모두 **내부 참조 반환**. 사용자가 컨테이너 라이프타임 관리 책임.

```cpp
std::string s = "hello";
const char* p = s.data();
s = "different string";              // ⚠️ s 내부 재할당 → p 댕글링 가능
```

표준 라이브러리도 효율을 위해 이 패턴 — **사용자 책임**으로 두는 명시적 계약.

## 댕글링이 안 일어나는 경우

핸들 반환이 안전한 경우:

```cpp
class Container {
    std::vector<T> data;
public:
    const T& at(size_t i) const { return data[i]; }    // ✅ this의 멤버
    T& at(size_t i) { return data[i]; }
};

Container c;
const T& ref = c.at(0);              // ref는 c가 사는 동안 안전
```

객체 자체가 살아 있고 (`c`가 임시가 아님), 변경 작업도 없으면 — 댕글링 X.

**전제**: 사용자가 객체 라이프타임과 변경 작업을 의식적으로 관리.

## 자동 해결책 — 값 반환

```cpp
class Rectangle {
    Point ulhc, lrhc;
public:
    Point upperLeft() const { return ulhc; }    // ✅ 값으로 복사
};

auto p = bounds(*pgo).upperLeft();   // p는 독립 객체, 댕글링 X
```

**비용**: Point 복사 — 작은 객체면 무비용 수준. C++11+ 이동 의미론으로 더 효율적.

대부분의 작은 값 타입은 값 반환이 최선.

## 큰 데이터는? — 다양한 옵션

```cpp
// 옵션 1: 값 반환 (대부분 RVO + move로 비용 적음)
std::vector<T> getData() const { return data; }

// 옵션 2: const& 반환 + 사용자 라이프타임 책임 (표준 라이브러리 스타일)
const std::vector<T>& getData() const { return data; }

// 옵션 3: 콜백 — 데이터 노출 없이 처리
void forEach(std::function<void(const T&)> f) const {
    for (const auto& x : data) f(x);
}

// 옵션 4: 뷰 (C++20 ranges)
auto view() const { return std::views::all(data); }
```

뷰는 댕글링 위험을 줄이지 못함 — 라이프타임은 여전히 원본에 의존. 단, 사용자가 명시적으로 view라는 것을 인식.

## 흔한 함정 — `auto`의 추론

```cpp
class C {
    std::vector<int> data;
public:
    const std::vector<int>& getData() const { return data; }
};

auto v = c.getData();                // ⚠️ auto는 참조 안 받음 — 값 복사!
                                      // 의도: const auto&로 받기
const auto& v = c.getData();         // ✅ 참조
```

함수 시그니처가 const 참조를 반환해도 — 호출자가 `auto`로 받으면 **값 복사**가 됨. 의도와 다르게 비용이 증가하거나, 원본을 가리키려던 의도가 실패.

## 함정 — 멤버 포인터를 통한 우회

```cpp
class C {
    int data;
public:
    int data_member;     // public 멤버 — 데이터 핸들 그 자체
};

C c;
int* p = &c.data_member;     // 직접 핸들 — 객체 라이프타임에 묶임
```

public 멤버는 사실상 영구 핸들. **항목 22** 참고 — private이 안전한 이유.

## 모던 변형 — `std::optional<T>` for 값 반환

```cpp
class Database {
public:
    std::optional<User> findUser(int id) const;     // 실패 가능 + 값
};

if (auto u = db.findUser(42)) {     // 안전한 값 의미론
    use(*u);
}
```

값 의미 + 실패 표현 — 참조 반환의 일부 사용 케이스를 대체.

## 실무 가이드 — 결정 트리

```
함수가 객체 내부 데이터를 노출하는가?
├── 작은 값 타입 (Point 등) → 값으로 반환 (RVO 효율적)
├── 큰 데이터, 빈번한 접근 → const& 반환 + 라이프타임 책임 명시
├── 처리만 필요, 데이터 노출 X → 콜백 / 뷰
├── 변경 가능성 있어야 → 변경자 메서드 (setX, setY)
└── 표준 컨테이너 인터페이스 흉내 → operator[], at, data + 책임 문서화
```

## 실무 가이드 — 체크리스트

- [ ] 내부 데이터의 참조/포인터/반복자 반환하고 있는가?
- [ ] 작은 값 타입이라면 값으로 반환?
- [ ] const로 수정 차단하고 있는가?
- [ ] 댕글링 위험 — 임시 객체에서 핸들 꺼내는 사용 패턴 있는가?
- [ ] 사용자에게 라이프타임 책임 명시 (헤더 주석)?
- [ ] auto vs auto& vs const auto& 차이 인지?

## 핵심 정리

1. **내부 핸들 반환 피하기** — 캡슐화 우회 + 댕글링 위험
2. 어쩔 수 없으면 **const** — 수정 차단
3. **임시 객체에서 핸들 꺼내기**는 댕글링 — 사용 패턴 주의
4. 표준 라이브러리도 같은 위험 — 컨테이너 변경 후 이전 반복자 무효
5. **값 반환**이 가장 안전 — C++11+ 이동 의미론으로 비용 적음
6. 사용자가 `auto`로 받을 때 **참조 vs 값** 의도 확인

## 관련 항목

- [항목 3: const 사용](/blog/programming/cpp/effective-cpp/item03-use-const-whenever-possible) — bitwise vs logical const
- [항목 21: 객체 반환은 값으로](/blog/programming/cpp/effective-cpp/item21-dont-try-to-return-a-reference-when-you-must-return-an-object) — 참조 반환의 위험
- [항목 22: 데이터 멤버는 private](/blog/programming/cpp/effective-cpp/item22-declare-data-members-private) — 핸들 노출 차단
