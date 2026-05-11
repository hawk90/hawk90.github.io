---
title: "항목 9: 크로스 컴파일러 ABI가 필요하면 C 방식의 하위 집합을 사용하라"
date: 2026-05-08T18:00:00
description: "DLL/플러그인 경계에서 C++ ABI 호환성 문제를 피하는 법"
tags: [C++, ABI, FFI]
series: "Beautiful C++"
seriesOrder: 9
draft: true
---


## 핵심 내용

- C++의 ABI(name mangling, vtable 레이아웃, 예외 처리)는 **컴파일러·버전마다 다르다**
- DLL/so 경계, 플러그인, 다른 언어와의 FFI에서 C++ 타입을 그대로 노출하면 호환성이 깨진다
- 경계에서는 **`extern "C"`로 선언된 단순한 C 함수 + POD 구조체 + 불투명 핸들**만 사용하라
- 내부 구현은 마음껏 C++로 작성하되, 인터페이스만 C 하위 집합으로 좁혀라

## 예제 코드

```cpp
// Bad: C++ 타입이 ABI 경계를 넘는다 — 컴파일러 다르면 깨짐
extern "C" std::string get_version();           // std::string 레이아웃 의존
extern "C" std::vector<int> get_data();         // 표준 라이브러리 ABI 의존

// Good: C 하위 집합만 노출
extern "C" {
    typedef struct LibHandle LibHandle;          // 불투명 핸들

    LibHandle* lib_create();
    void       lib_destroy(LibHandle*);

    // 출력은 호출자가 버퍼를 제공
    int  lib_get_version(LibHandle*, char* out, size_t out_size);
    int  lib_get_data(LibHandle*, int* out, size_t* in_out_count);
}
```

## 정리

C++의 풍요로움은 **모듈 내부에서**만 누리고, 모듈 경계는 **C로 좁혀라**. 이 한 줄이 멀티 컴파일러·다언어 호환성을 지켜준다.
