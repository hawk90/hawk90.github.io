---
title: "항목 53: 컴파일러 경고를 진지하게 받아들여라"
date: 2025-02-09T10:00:00
description: "경고는 잠재적 버그의 단서 — 무시하지 말고 이해하고 처리하라."
tags: [C++, Effective C++, Warnings]
series: "Effective C++"
seriesOrder: 53
draft: true
---

> **초안** — 정리 진행 중

## 개요

컴파일러 경고는 무시하기 쉽지만, **잠재적 버그의 가장 저렴한 신호**입니다. 한 컴파일러에선 경고만 나는 코드가 다른 컴파일러에선 에러일 수도 있고, 진짜 버그를 숨기고 있을 수도 있습니다.

## 예제 — 가상 함수 가림

```cpp
class B {
public:
    virtual void f() const;
};

class D : public B {
public:
    virtual void f();        // const 빠짐 — 재정의 아님 (item 12 함정)
};
```

GCC `-Woverloaded-virtual`로:
```
warning: 'virtual void D::f()' was hidden
```

이 경고를 무시하면 의도와 다른 함수가 호출되는 버그가 살아남음.

## 권장 컴파일 옵션

### GCC / Clang
```
-Wall -Wextra -Wpedantic
-Wshadow -Wnon-virtual-dtor
-Wcast-align -Woverloaded-virtual
-Wconversion -Wsign-conversion
```

### MSVC
```
/W4
```

치명적이지 않다고 판단된 경고도 켜두고, 정말 의미 없는 것만 case-by-case로 끄기.

## 경고를 에러로 격상

```
-Werror      # GCC/Clang
/WX          # MSVC
```

CI에서 경고를 빌드 실패로 — 새 경고 도입을 막음.

## 경고를 처리하는 자세

1. **이해 우선** — 경고가 왜 나는지 파악
2. **수정 우선** — 가능하면 경고 사라지도록 코드 수정
3. **억제는 최후** — 정말 의도된 코드라면 명시적으로 (`[[maybe_unused]]`, `pragma diagnostic` 등)

## 컴파일러마다 다름

같은 코드도 GCC, Clang, MSVC가 다른 경고를 냄. 가능하면 여러 컴파일러로 빌드해 polish.

## 핵심 정리

1. 경고는 잠재 버그의 단서 — 무시 금지
2. `-Wall -Wextra` 등 적극적 옵션 사용
3. CI에선 `-Werror`로 격상
4. 가능하면 여러 컴파일러로 빌드 (godbolt 활용)
