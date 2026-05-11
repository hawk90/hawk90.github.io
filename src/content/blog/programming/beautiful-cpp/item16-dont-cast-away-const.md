---
title: "항목 16: const를 형 변환하지 말라"
date: 2026-05-09T15:00:00
description: "const_cast의 함정과 mutable로 의도를 명시하는 방법"
tags: [C++, const-correctness, mutable]
series: "Beautiful C++"
seriesOrder: 16
draft: true
---


## 핵심 내용

- `const`는 **호출자와의 약속**이다 — "나는 이걸 안 바꾼다"
- `const_cast`로 벗기는 순간 약속이 깨지고, 진짜 const 객체에 쓰면 **UB**
- 보통 `const_cast`가 필요하다 = **API 설계가 잘못됐다**는 신호다
- 진짜 변경이 필요한 캐시·로깅 같은 내부 상태는 **`mutable`**로 표현하라
- 외부 C API가 const를 안 받는 경우만 예외적으로 허용

## 예제 코드

```cpp
// Bad: const를 벗기고 수정 — UB 위험
void modify(const Widget& w) {
    auto& mut = const_cast<Widget&>(w);
    mut.set_value(42);  // 호출자가 const Widget을 줬다면 UB
}

// Bad: 캐시를 위해 const_cast
class Repo {
    mutable std::optional<Result> cache_;  // ← 이렇게가 정답
public:
    Result query() const {
        if (!cache_) cache_ = compute();
        return *cache_;
    }
};

// Good: 진짜 변경은 mutable, 진짜 읽기 전용은 const 유지
class Logger {
    mutable std::mutex mtx_;   // 락은 const 메서드에서도 잠가야 함
public:
    void log(const std::string& msg) const {
        std::lock_guard lock{mtx_};
        // ...
    }
};
```

## 정리

`const_cast`는 **냄새**다. 정말로 변경해야 하는 멤버는 `mutable`로 명시하고, 그 외에는 const 약속을 지켜라.
