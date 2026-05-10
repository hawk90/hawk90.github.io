---
title: "항목 26: 보편 참조에 대한 오버로딩을 피하라"
date: 2025-01-08T13:00:00
description: "보편 참조 함수가 다른 오버로드를 압도해 버리는 이유와 함정."
tags: [C++, Universal Reference, Overloading, Modern C++]
series: "Effective Modern C++"
seriesOrder: 26
draft: true
---

> **초안** — 정리 진행 중

## 개요

보편 참조 매개변수를 받는 함수는 **거의 모든 인자에 매칭**되는 강력한 후보입니다. 다른 오버로드와 함께 두면 의도한 함수가 호출되지 않는 일이 자주 일어납니다.

## 함정 예제

```cpp
std::multiset<std::string> names;

void logAndAdd(const std::string& name) {
    names.emplace(name);
}

template<typename T>
void logAndAdd(T&& name) {                  // 보편 참조 오버로드
    names.emplace(std::forward<T>(name));
}

logAndAdd("Patty Dog");   // 어느 게 호출될까?
```

답: **템플릿이 호출됨** — `const char[10]&`로 정확히 매칭(보편 참조 추론)이 더 정밀하기 때문.

`const std::string&` 버전은 string 임시 객체 생성이 필요한 변환을 거치므로 후순위.

## 더 위험한 예 — 생성자

```cpp
class Person {
public:
    template<typename T>
    explicit Person(T&& n) : name(std::forward<T>(n)) {}   // 1) 보편 참조 생성자

    explicit Person(int idx);                              // 2) int 생성자
    Person(const Person& rhs);                             // 3) copy
    Person(Person&& rhs);                                  // 4) move
private:
    std::string name;
};

Person p("Nancy");

auto cloneP = p;       // copy 생성자 호출? NO!
                       // 1)이 Person&로 인스턴스화되어 더 정밀 매칭
                       // → 생성자 1) 호출 → name(p) → string(Person) 컴파일 에러
```

`Person p2 = p;`처럼 자연스러운 복사도 보편 참조 생성자에 가로채여 컴파일 에러를 일으킵니다.

심지어 derived 클래스의 copy/move도 base의 보편 참조 생성자로 떨어집니다.

## 왜 이렇게 되나

보편 참조의 추론은 **참조 + cv-qualifier까지 정확히** 맞추므로, 같은 타입의 다른 후보(예: `const T&` 변환 후 매칭)보다 거의 항상 더 정밀합니다.

## 결론

- 보편 참조 함수와 다른 오버로드를 **같이 두지 말 것**
- 같은 의미를 다른 방식으로 처리하고 싶다면 **다른 이름의 함수**로 분리
- 또는 항목 27의 우회 기법(태그 디스패치, `enable_if`, 다형성 사용) 사용

## 핵심 정리

1. 보편 참조 함수는 거의 모든 인자에 더 정밀 매칭됨
2. copy/move 생성자도 가로챌 수 있음 — 위험
3. 오버로드를 피하거나 함수 이름을 분리
4. 진짜 필요하면 항목 27의 디스패치 기법으로 좁히기
