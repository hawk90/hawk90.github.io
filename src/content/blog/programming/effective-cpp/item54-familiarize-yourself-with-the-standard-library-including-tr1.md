---
title: "항목 54: 표준 라이브러리(TR1 포함)에 익숙해져라"
date: 2025-02-09T11:00:00
description: "C++98 표준 라이브러리, TR1, 그리고 C++11+ 흡수된 항목들."
tags: [C++, Effective C++, Standard Library, TR1]
series: "Effective C++"
seriesOrder: 54
draft: true
---

> **초안** — 정리 진행 중

## 개요

표준 라이브러리는 검증되고 효율적이며 이식성 좋습니다. 직접 만들기 전에 표준에 있는지 확인. 책이 나온 시점(C++03)의 TR1 항목들 대부분은 C++11에 표준 흡수.

## C++98 표준 라이브러리 — 8가지 핵심

1. **STL 컨테이너** — vector, list, deque, map, set, ...
2. **STL 알고리즘** — find, sort, transform, ...
3. **STL 반복자** — input/output/forward/bidirectional/random
4. **수치** — `<cmath>`, `<complex>`, `<valarray>`, `<numeric>`
5. **예외** — `<exception>`, `<stdexcept>`
6. **I/O** — `<iostream>`, `<fstream>`, `<sstream>`
7. **다국어** — `<locale>`
8. **C 표준 라이브러리** — `<cstdio>`, `<cstdlib>`, ...

## TR1 — Technical Report 1 (2005)

C++11에서 표준 흡수된 핵심 항목들:

- **스마트 포인터** — `shared_ptr`, `weak_ptr` (`unique_ptr`는 새로)
- **`std::function`** — 다형적 함수 wrapper
- **`std::bind`** — `boost::bind` 표준화 (C++11+ 람다가 더 좋음)
- **`<unordered_map>`, `<unordered_set>`** — 해시 컨테이너
- **`<random>`** — 수치 분포·생성기
- **`<regex>`** — 정규 표현식
- **`<type_traits>`** — 타입 정보
- **튜플** — `std::tuple`
- **고정 크기 배열** — `std::array`

## C++11 이상

이 책 이후의 추가 (Effective Modern C++ 참고):

- `auto`, `decltype`, range-for, lambda
- 스레드/동시성 (`<thread>`, `<mutex>`, `<atomic>`, `<future>`)
- 이동 의미론, 보편 참조, perfect forwarding
- `<chrono>`, `<filesystem>` (C++17)
- `<optional>`, `<variant>`, `<any>` (C++17)
- ranges, coroutines, concepts, modules (C++20)
- expected, mdspan, ... (C++23)

## 활용 가이드

- **표준 우선** — 직접 만들기 전 표준 확인
- **STL 알고리즘** — 손으로 짠 루프 대신
- **스마트 포인터** — raw new/delete 대신
- **chrono** — `time_t`, `timespec` 직접 다루기 대신

## 핵심 정리

1. 표준은 검증·효율·이식성 — 손수 코드보다 우선 검토
2. C++11+ 매년 새 기능 — 정기적으로 업데이트
3. STL 알고리즘과 컨테이너에 능숙해지기
4. EMC++가 이 책 이후의 표준 라이브러리 변화 다룸
