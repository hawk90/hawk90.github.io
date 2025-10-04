---
layout: post
title: "Effective C++ Item 1: Prefer const"
date: 2024-03-16
categories: [C++, Effective C++]
tags: [cpp, const, best-practices]
---

# Item 1: const를 적극 활용하자

Scott Meyers의 Effective C++ 첫 번째 항목입니다.

## const의 장점

1. **컴파일 시점 오류 감지**
2. **의도 명확화**
3. **최적화 기회 제공**

## 예제 코드

```cpp
class Widget {
public:
    // const 멤버 함수
    int getValue() const { return value; }

    // const 참조 매개변수
    void process(const std::string& str) {
        // str은 수정 불가
    }

private:
    int value;
};
```

## const_cast 사용 시 주의점

```cpp
const int& getValue() const {
    // const 버전 구현
    return value;
}

int& getValue() {
    // non-const 버전은 const 버전 활용
    return const_cast<int&>(
        static_cast<const Widget&>(*this).getValue()
    );
}
```

const를 적절히 사용하면 더 안전하고 효율적인 코드를 작성할 수 있습니다.