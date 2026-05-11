---
title: "항목 6: 함수에 단일 반환문을 고집하지 마라"
date: 2026-05-08T15:00:00
description: "C 시절의 단일 반환 규칙이 더는 유효하지 않은 이유와 가드 절 활용법"
tags: [C++, Control Flow, RAII]
series: "Beautiful C++"
seriesOrder: 6
draft: true
---


## 핵심 내용

- "함수당 return 하나" 규칙은 RAII 이전 C 시절의 잔재다
- C++에서는 소멸자가 정리 책임을 지므로 **이른 반환(early return)**이 더 안전하고 명확하다
- 가드 절(guard clause)로 예외 케이스를 먼저 걸러내면 본문 들여쓰기가 줄어든다
- 단일 반환을 고집하면 오히려 임시 플래그·중첩 if·복잡한 흐름이 늘어난다

## 예제 코드

```cpp
// Bad: 단일 반환을 위한 인위적 구조
int find_index(const std::vector<int>& v, int target) {
    int result = -1;
    if (!v.empty()) {
        for (size_t i = 0; i < v.size(); ++i) {
            if (v[i] == target) {
                result = static_cast<int>(i);
                break;
            }
        }
    }
    return result;
}

// Good: 가드 절 + 이른 반환
int find_index(const std::vector<int>& v, int target) {
    if (v.empty()) return -1;
    for (size_t i = 0; i < v.size(); ++i) {
        if (v[i] == target) return static_cast<int>(i);
    }
    return -1;
}
```

## 정리

C++에서 자원 정리는 **소멸자**가 한다. return 개수가 아니라 **흐름의 명확함**을 우선하라. 이른 반환이 가독성을 높인다면 주저 없이 써라.
