---
title: "항목 3: 기본 생성자 대신 기본 멤버 초기화자로 초깃값을 설정하라"
date: 2026-05-08T12:00:00
description: "기본 멤버 초기화자로 깔끔한 초기화를 표현하는 법"
tags: [C++, Initialization, Constructor]
series: "Beautiful C++"
seriesOrder: 3
draft: false
---


## 핵심 내용

- 멤버를 단순히 초기화하기 위한 기본 생성자는 **노이즈**다
- C++11부터 클래스 정의 안에서 직접 멤버 초기값을 줄 수 있다 (default member initializer)
- 컴파일러가 생성하는 기본 생성자(`= default`)와 함께 쓰면 코드가 짧아지고 의도가 명확해진다
- 초기값이 한 곳(선언부)에 모이므로 유지보수가 쉽다

## 예제 코드

```cpp
// Bad: 멤버 초기화만을 위한 기본 생성자
class Widget {
    int count_;
    std::string name_;
    bool ready_;
public:
    Widget() : count_(0), name_("none"), ready_(false) {}
};

// Good: 기본 멤버 초기화자 + = default
class Widget {
    int count_ = 0;
    std::string name_ = "none";
    bool ready_ = false;
public:
    Widget() = default;
};
```

## 정리

초기값은 **선언과 함께** 두라. 기본 생성자가 정말 멤버 초기화 외에 하는 일이 없다면 `= default`로 충분하며, 가독성과 유지보수성이 모두 좋아진다.
