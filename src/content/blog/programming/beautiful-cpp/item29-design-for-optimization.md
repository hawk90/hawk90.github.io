---
title: "항목 29: 최적화할 수 있도록 설계하라"
date: 2026-05-10T18:00:00
description: "컴파일러가 최적화할 여지를 남기는 설계 원칙"
tags: [C++, Performance, Design]
series: "Beautiful C++"
seriesOrder: 29
draft: false
---


## 핵심 내용

- "성능은 마지막에 측정하고 고친다"가 원칙이지만, **최적화의 여지를 막지 않는 설계**는 처음부터 가능하다
- 컴파일러가 최적화할 수 있도록 **별칭(aliasing)·전역 상태·가상 호출**을 줄여라
- **값 의미론**을 선호 — 컴파일러가 이동·인라이닝·NRVO를 적용하기 쉬움
- 인터페이스는 **연속된 데이터**를 다루도록(범위/스팬) → 캐시·SIMD 친화적
- "필요할 때 최적화"가 가능하려면 **측정 가능한 구조**여야 한다 (작은 함수, 명확한 경계)

## 예제 코드

```cpp
// Bad: 가상 호출 + 출력 인자 + 리스트 노드형
class IShape {
public:
    virtual void render(Canvas&) const = 0;
    virtual ~IShape() = default;
};
std::list<std::unique_ptr<IShape>> shapes;   // 캐시 비효율, 가상 호출

// Good: 값 타입 + 연속 메모리 + 비가상
struct Shape { /* 데이터만 */ };
void render(const Shape& s, Canvas& c);      // 자유 함수

std::vector<Shape> shapes;                   // 캐시 친화
for (const auto& s : shapes) render(s, canvas);  // 인라이닝 가능
```

```cpp
// 작은 함수 = 측정 가능 + 인라이닝 가능
constexpr int square(int x) { return x * x; }   // 컴파일러가 마음껏 처리
```

## 정리

최적화는 **여지를 남겨두는 설계**에서 출발한다. 가상 호출, 흩뿌려진 할당, 숨은 전역 상태를 줄이면 나중에 측정-수정 사이클이 훨씬 쉬워진다.
