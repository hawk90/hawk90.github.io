---
title: "항목 16: new와 delete는 같은 형태를 사용하라"
date: 2025-02-03T13:00:00
description: "new[]에는 delete[]를, new에는 delete를. 섞이면 UB."
tags: [C++, Effective C++, Memory Management]
series: "Effective C++"
seriesOrder: 16
draft: true
---

> **초안** — 정리 진행 중

## 개요

`new`와 `new[]`는 메모리 레이아웃이 다릅니다. **잘못 짝지으면 UB**.

## 차이

```cpp
int* single = new int(42);          // single object
int* arr    = new int[10];          // array

delete single;     // OK
delete[] arr;      // OK

delete[] single;   // UB
delete arr;        // UB
```

배열 `new[]`는 보통 메모리 앞에 **요소 개수**를 저장 — `delete[]`는 그 정보로 각 요소의 소멸자를 호출. `delete`는 단일 객체로 가정해 정보를 잘못 해석.

## typedef 함정

```cpp
typedef std::string AddressLines[4];   // AddressLines = string[4]

std::string* p = new AddressLines;     // 사실은 new string[4]
delete p;     // UB! delete[] 필요했지만 단서 없음
delete[] p;   // OK — 그러나 typedef를 모르면 헷갈림
```

배열 typedef를 피하라 — `std::array<std::string, 4>` 또는 `std::vector<std::string>` 사용.

## 권장

- `new`/`delete` 직접 쓰지 말고 `std::vector`, `std::unique_ptr` 사용
- `std::unique_ptr<T[]>`도 가능 — 자동으로 `delete[]` 호출

## 핵심 정리

1. `new` ↔ `delete`, `new[]` ↔ `delete[]` 일대일
2. 섞으면 UB
3. 배열 typedef 피하기
4. 가능하면 컨테이너/스마트 포인터로 raw new/delete 회피
