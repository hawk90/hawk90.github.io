---
title: "항목 21: 범위는 작게 유지하라"
date: 2026-05-10T10:00:00
description: "변수 수명을 짧게 유지하는 현대 C++ 스타일"
tags: [C++, Scope, Code Style]
series: "Beautiful C++"
seriesOrder: 21
draft: false
---


## 핵심 내용

- 변수의 **수명을 짧게** 유지할수록 추론과 디버깅이 쉽다
- 변수는 **사용하기 직전에** 선언하라 (C++의 권장 스타일)
- `if`/`for`의 **초기화 절**(C++17 `if (auto x = f(); x.ok())`)을 활용하면 스코프를 더 좁힐 수 있다
- 큰 함수는 보통 **스코프가 커진 결과**다 — 함수를 쪼개면 자연히 해결된다
- 스코프가 작으면 다음에 그 변수를 안 봐도 된다 (인지 부담↓)

## 예제 코드

```cpp
// Bad: 변수가 함수 전체에 떠다님
int find_first_negative(const std::vector<int>& v) {
    int i = 0;
    int result = -1;
    for (i = 0; i < (int)v.size(); ++i) {
        if (v[i] < 0) { result = i; break; }
    }
    return result;
}

// Good: 사용 시점에 선언, 초기화 절 활용
int find_first_negative(const std::vector<int>& v) {
    for (int i = 0; i < (int)v.size(); ++i) {
        if (v[i] < 0) return i;
    }
    return -1;
}

// C++17: if 초기화 절로 스코프 최소화
if (auto it = map.find(key); it != map.end()) {
    use(it->second);
}   // it는 여기서 끝 — 바깥 스코프 오염 없음
```

## 정리

스코프가 작을수록 **버그가 숨을 곳이 줄어든다**. 변수는 사용 직전에 만들고, 가능하면 if/for의 초기화 절로 더 좁혀라.
