---
title: "항목 18: 헤더 파일의 전역 범위에 using namespace를 사용하지 말라"
date: 2026-05-09T17:00:00
description: "헤더의 using namespace가 전역으로 퍼지는 오염 문제"
tags: [C++, Headers, Namespaces]
series: "Beautiful C++"
seriesOrder: 18
draft: true
---


## 핵심 내용

- 헤더의 `using namespace`는 **그 헤더를 포함한 모든 파일**의 네임스페이스를 오염시킨다
- 한 번 오염되면 되돌릴 방법이 없다 — 사용자에게 강요되는 결정이다
- 이름 충돌·오버로드 해결 변경·미묘한 ODR 위반의 원인이 된다
- **소스 파일(`.cpp`)** 안이나 **함수 범위**에서만 제한적으로 허용
- 헤더에서는 항상 **명시적 한정**(`std::vector`)을 써라

## 예제 코드

```cpp
// Bad: header.h
#include <vector>
using namespace std;            // 이 헤더를 include한 모든 곳에 std가 풀림

class Widget {
    vector<int> data_;          // 짧지만 전염성이 강함
};

// 사용자 측 영향: 자기 코드의 vector와 충돌, 진단 메시지 폭발

// Good: header.h
#include <vector>

class Widget {
    std::vector<int> data_;     // 명시적 한정
};

// Good: 정 짧게 쓰고 싶다면 좁은 범위에서
namespace mylib {
    using std::vector;          // 네임스페이스 내부에 한정
    class Widget { vector<int> data_; };
}
```

## 정리

헤더는 **수많은 번역 단위에 복사**된다. 거기서 네임스페이스를 풀어버리면 사용자 코드의 의미를 임의로 바꾸는 셈이다. 항상 `std::`처럼 명시적으로 적어라.
