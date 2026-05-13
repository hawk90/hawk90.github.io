---
title: "항목 40: 다중 상속을 신중하게 사용하라"
date: 2025-02-06T18:00:00
description: "ambiguity, diamond, virtual base — 다중 상속의 함정과 인터페이스+구현 분리의 정당한 활용."
tags: [C++, Effective C++, Multiple Inheritance]
series: "Effective C++"
seriesOrder: 40
---

## 왜 이 항목이 중요한가?

다중 상속(Multiple Inheritance, MI)은 C++의 강력한 도구지만 **복잡성의 비용이 크다**. 다른 언어(Java, C#)가 의도적으로 배제한 이유다.

MI는 세 가지 함정을 만든다.

- **ambiguity** — 같은 이름이 여러 base에 있으면 어느 것을 호출하는지 모호하다.
- **diamond inheritance** — 공통 조상이 derived에 두 번 나타나 데이터가 중복된다.
- **virtual base** — diamond를 해결하지만 추가 포인터 비용과 미묘한 생성 순서가 따라온다.

C++ 커뮤니티에서 "가능하면 피하라"는 의견이 강하지만, **추상 인터페이스(순수 가상 함수만) + 구현 클래스**의 결합 같은 정당한 패턴도 분명히 존재한다. Java의 `interface`와 비슷한 역할이다.

이 항목은 MI의 함정과 정당한 사용 패턴, 그리고 대안(composition, CRTP)을 정리한다.

## 개요

다중 상속(MI)은 강력하지만 복잡성도 크다. **ambiguity**(같은 이름 충돌), **diamond inheritance**(공통 base의 중복), **virtual base**의 비용이 따라온다. C++ 커뮤니티에서 "**가능하면 피하라**"는 의견이 강한 영역이지만, **추상 인터페이스 + 구현 클래스 결합** 같은 정당한 패턴도 분명히 존재한다.

## 함정 1 — Ambiguity (같은 이름 충돌)

```cpp
class BorrowableItem {
public:
    void checkOut();
};

class ElectronicGadget {
public:
    bool checkOut() const;    // 다른 시그니처지만 같은 이름
};

class MP3Player : public BorrowableItem, public ElectronicGadget {};

MP3Player mp;
mp.checkOut();        // ❌ 모호! BorrowableItem::checkOut? ElectronicGadget::checkOut?
                      //    컴파일러는 access check 이전에 이름 해상도를 하므로
                      //    ElectronicGadget::checkOut이 private라도 모호함이 우선
```

**왜 우선순위가 그런가**: C++ 표준은 access 검사(private/public)를 이름 해상도 **후에** 수행. 그러므로 private인 한쪽은 "이게 더 좋은 매치"라고 자동 선택되지 않음.

해결 — 명시 자격:

```cpp
mp.BorrowableItem::checkOut();        // 명시
mp.ElectronicGadget::checkOut();
```

매번 명시 — 가독성 ↓. 이름이 충돌하지 않게 base 설계하는 것이 우선.

## 함정 2 — Diamond Inheritance

```cpp
class Person {
public:
    std::string name;
};

class Student : public Person {
public:
    void study();
};

class Athlete : public Person {
public:
    void train();
};

class StudentAthlete : public Student, public Athlete {};
//                            ↘             ↙
//                         둘 다 Person 부분 가짐
//                         → StudentAthlete에 Person 데이터가 두 벌!
```

`StudentAthlete` 객체 메모리:

```
┌──────────────────────────────────┐
│ Student::Person::name            │  ← 두 개의 name!
│ Student data...                  │
├──────────────────────────────────┤
│ Athlete::Person::name            │
│ Athlete data...                  │
└──────────────────────────────────┘
```

`StudentAthlete sa; sa.name = "Alice";` — 어느 name? 모호.

```cpp
sa.Student::name = "Alice";
sa.Athlete::name = "Alice";      // 두 번 설정해야
```

자료 중복 + 코드 중복 — 보통 의도와 다름.

## 해결 — virtual 상속

```cpp
class Person {
public:
    std::string name;
};

class Student : virtual public Person {     // ← virtual
public:
    void study();
};

class Athlete : virtual public Person {     // ← virtual
public:
    void train();
};

class StudentAthlete : public Student, public Athlete {};
```

`virtual` 상속으로 — `Person` 부분이 **공유**됨. `StudentAthlete` 객체 메모리:

```
┌──────────────────────────────────┐
│ Person::name (공유)              │
├──────────────────────────────────┤
│ Student data                     │
├──────────────────────────────────┤
│ Athlete data                     │
└──────────────────────────────────┘
```

```cpp
sa.name = "Alice";        // ✅ 모호하지 않음 — 하나뿐
```

### virtual 상속의 비용

- **객체 크기 증가** — 보통 virtual base pointer 추가
- **멤버 접근 비용 증가** — 간접 참조 한 단계 더
- **most-derived 클래스가 virtual base 생성자 호출 책임**
  ```cpp
  class StudentAthlete : public Student, public Athlete {
  public:
      StudentAthlete(const std::string& name)
          : Person(name),     // ← 직접 호출 (Student, Athlete가 못 함)
            Student(),
            Athlete() {}
  };
  ```
  생성자 코드가 복잡해짐.

## 권장 — virtual 상속 안 쓸 수 있으면 안 쓰기

- diamond를 만들지 않게 클래스 계층 재설계
- 공통 데이터는 base가 아닌 별도 helper로
- 인터페이스만 다중 상속 (데이터 중복 X)

## 정당한 활용 — 인터페이스 + private 구현

```cpp
// 추상 인터페이스 (데이터 없음)
class IPerson {
public:
    virtual ~IPerson() = default;
    virtual std::string name() const = 0;
};

// 구현 helper (선택)
class PersonInfo {
protected:
    std::string getName() const;
    Date        getBirthday() const;
};

// 구체 클래스
class Person : public IPerson, private PersonInfo {
public:
    std::string name() const override {
        return getName();    // PersonInfo의 protected 사용
    }
};
```

**핵심**:
- `IPerson` — public IS-A (다형성)
- `PersonInfo` — private is-implemented-in-terms-of (구현 위임)

다중 상속의 정당한 패턴 — 다른 역할을 가진 두 base 결합.

## Java의 영향 — interface + 구현 클래스

Java는 다중 상속을 금지하고 다중 **interface** 구현만 허용:

```java
class Person implements IPerson, ISerializable, IComparable<Person> {}
```

C++로 옮기면:

```cpp
class Person : public IPerson, public ISerializable, public IComparable {
    // 모두 추상 인터페이스 — 데이터 없음, diamond 위험 적음
};
```

**추상 인터페이스만 다중 상속**하면 diamond는 거의 안 일어남. 데이터는 한 곳에만.

## 모던 변형 — concept과 type erasure

C++20에서 일부 다중 상속 사용처를 대체:

```cpp
template<typename T>
concept Drawable = requires(const T& t) { t.draw(); };

template<typename T>
concept Saveable = requires(const T& t) { t.save(); };

template<Drawable T, Saveable U>
void process(T t, U u) { /* ... */ }
```

상속 없이 인터페이스 명세 — 비용 0, 컴파일 타임 검증.

## CRTP — 다중 상속의 대안

```cpp
template<typename Derived>
class Counter {
public:
    int count() const { return count_; }
protected:
    void increment() { ++count_; }
private:
    int count_ = 0;
};

template<typename Derived>
class Comparable {
public:
    bool operator!=(const Derived& other) const {
        return !static_cast<const Derived&>(*this).operator==(other);
    }
};

class Widget : public Counter<Widget>, public Comparable<Widget> {
public:
    bool operator==(const Widget& other) const;
};
```

CRTP는 다중 상속이지만 — 각 base가 derived의 함수를 호출하는 mixin. 런타임 비용 0.

## 다중 상속의 합법적 사용 — 사례 정리

| 사례 | 권장 정도 |
| --- | --- |
| 여러 추상 인터페이스 구현 | ✅ 안전 (데이터 없음) |
| 인터페이스 + 구현 클래스 결합 | ✅ 정당 (다른 역할) |
| 여러 Mixin 결합 (CRTP) | ✅ 안전 |
| 데이터 가진 base 여러 개 (diamond 가능성) | ⚠️ 매우 신중 — virtual 상속 필요 |
| 단순 코드 재사용 | ❌ composition으로 |

## 함정 — 진단하기 어려운 ABI 변화

```cpp
// 라이브러리 헤더 v1
class Widget : public Base1 {};

// v2 — Base2 추가
class Widget : public Base1, public Base2 {};

// ABI 변화 — 사용자 재컴파일 필요
// Base2 추가로 객체 레이아웃, vtable 구조 모두 변경
```

라이브러리 인터페이스에 다중 상속 추가/변경은 ABI 영향이 큼.

## 흔한 함정 — diamond 의도 없이

```cpp
class IDrawable { public: virtual void draw() const = 0; };
class IClickable { public: virtual void onClick() = 0; };

// 사용자는 Drawable과 Clickable의 인터페이스만 의식
class Button : public IDrawable, public IClickable {};

// 그러나 라이브러리 v2:
class IDrawable : public IRendering {};   // 새 base
class IClickable : public IInputHandler {};

// 만약 IRendering이 IInputHandler를 상속한다면 — diamond!
```

라이브러리 진화 과정에서 diamond가 우발적으로 만들어질 수 있음. base hierarchy 신중히.

## 실무 가이드 — 결정

```
다중 상속이 필요한가?
├── 여러 추상 인터페이스 → 안전 (그러나 인터페이스가 정말 다중 필요한가?)
├── 인터페이스 + 구현 클래스 → 정당
├── 데이터 있는 base 여러 개 → 다시 검토
│   ├── 공통 데이터를 별도 helper로
│   └── 또는 virtual 상속 (비용 감수)
└── 코드 재사용 목적 → composition으로
```

## 실무 가이드 — 체크리스트

- [ ] 다중 상속의 base들이 서로 충돌하는 이름 없는가?
- [ ] 공통 base가 있어 diamond가 만들어지는가?
- [ ] diamond라면 virtual 상속 + 그 비용 감수?
- [ ] 데이터 가진 base 여러 개라면 — composition으로 대체 가능?
- [ ] 인터페이스만이라면 안전한 다중 상속
- [ ] CRTP나 concepts로 대체 가능한가?

## 핵심 정리

1. **다중 상속은 단일 상속보다 복잡** — 신중히
2. **ambiguity**는 명시 자격으로, **diamond**는 virtual 상속으로
3. virtual 상속은 비용 — 객체 크기 + 생성자 복잡도
4. **정당한 패턴**: 추상 인터페이스 + 구현 클래스
5. 데이터 가진 base 여러 개는 의심 — composition으로
6. CRTP, concepts(C++20)가 일부 사용처 대체

## 관련 항목

- [항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 다중 IS-A의 의미
- [항목 38: composition](/blog/programming/cpp/effective-cpp/item38-model-has-a-or-implemented-in-terms-of-through-composition) — 다중 상속 회피
- [항목 39: private 상속](/blog/programming/cpp/effective-cpp/item39-use-private-inheritance-judiciously) — 정당한 다중 상속 패턴의 일부
