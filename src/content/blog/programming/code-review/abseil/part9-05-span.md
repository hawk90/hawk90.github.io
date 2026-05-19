---
title: "Part 9-05: absl::span"
date: 2026-05-25T06:00:00
description: "absl::Span — 연속 메모리의 non-owning view. std::span의 친척이자 더 일찍 도착한 polyfill."
series: "Abseil Code Review"
seriesOrder: 52
tags: [cpp, abseil, types, span, range]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

## span이 푸는 문제

배열·벡터·서브 슬라이스를 받는 함수의 시그니처는 *모든 입력 형태*를 받기 어렵다.

```cpp
// 회피 — 여러 오버로드
void Process(const std::vector<int>& v);
void Process(const int* p, size_t n);
void Process(std::initializer_list<int> il);
```

`absl::Span`은 *연속 메모리의 view*로 이걸 한 줄로 묶는다.

```cpp
#include "absl/types/span.h"

void Process(absl::Span<const int> s);

Process(std::vector<int>{1, 2, 3});
int arr[] = {1, 2, 3};
Process(arr);
Process({1, 2, 3});
Process(absl::MakeSpan(arr, 2));   // 슬라이스
```

## std::span과의 관계

C++20 `std::span`이 표준에 들어왔지만 두 가지 차이가 있다.

| 측면 | `absl::Span` | `std::span` |
|------|--------------|-------------|
| extent | 항상 *dynamic* (런타임 크기) | static or dynamic |
| 가용성 | C++11 이상 | C++20 이상 |
| 인터페이스 | std 호환 (`size`, `data`, `begin/end`) | 동일 |

`std::span<int, 5>` 같은 static extent는 `absl::Span`에 없다. fixed-size 배열을 컴파일 타임에 검증하는 용도가 아니면 사실상 같은 도구다.

## 생성

`absl::MakeSpan` 함수 헬퍼가 깔끔하다.

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};

absl::Span<int> s1 = absl::MakeSpan(v);              // 전체
absl::Span<int> s2 = absl::MakeSpan(v.data(), 3);    // 처음 3개
absl::Span<int> s3 = absl::MakeSpan(&v[1], 2);       // {2, 3}
absl::Span<int> s4(v);                                // 직접 생성

int arr[10];
absl::Span<int> s5(arr);    // sizeof 추론 → size 10
```

`const T` 데이터를 받으려면 `Span<const T>`.

```cpp
void Read(absl::Span<const int> s);   // 읽기 전용
void Write(absl::Span<int> s);        // 수정 가능
```

## 슬라이싱

```cpp
absl::Span<int> s = absl::MakeSpan(v);

auto first3 = s.subspan(0, 3);
auto last2  = s.last(2);
auto skip1  = s.subspan(1);          // 1번부터 끝까지

s.front();   // s[0]
s.back();    // s[size-1]
s.size();    // 원소 개수
s.empty();
s.data();    // 첫 원소 주소
```

## 컨테이너 인터페이스 호환

`absl::Span`은 `begin()`/`end()`를 제공하므로 range-based for·STL 알고리즘에 그대로 들어간다.

```cpp
void PrintAll(absl::Span<const int> s) {
    for (int x : s) std::cout << x << " ";
}

int Sum(absl::Span<const int> s) {
    return std::accumulate(s.begin(), s.end(), 0);
}
```

## 함수 매개변수 가이드

| 입력 의도 | 시그니처 |
|-----------|----------|
| 읽기 전용, 어떤 contiguous든 | `absl::Span<const T>` |
| 쓰기 가능, 어떤 contiguous든 | `absl::Span<T>` |
| 소유권 이양 | `std::vector<T>` (값) |
| 컨테이너 타입 강제 | 구체 타입 (`std::vector<T>`, `std::array<T, N>`) |
| 단일 원소 | `const T&` |

대부분의 *읽기* 인터페이스는 `Span<const T>`로 통일하면 호출 측 boilerplate가 사라진다.

## 함정 — dangling

`Span`은 *view* 이므로 원본보다 오래 살면 dangle.

```cpp
// 회피 — 임시 객체의 데이터
absl::Span<int> Bad() {
    std::vector<int> v = {1, 2, 3};
    return absl::MakeSpan(v);   // ❌ v 소멸 → dangling
}

// 회피 — initializer_list 임시
void Use() {
    absl::Span<const int> s = {1, 2, 3};
    // ❌ {1,2,3}은 lifetime이 statement 끝 — 다음 줄에서 dangling
    Process(s);
}

// Good — 같은 statement 안에서만 사용
Process(absl::Span<const int>{1, 2, 3});
```

`string_view`와 같은 dangling 위험을 가진다(다음 시리즈의 anti-pattern 참조).

## 다차원 — Span<Span<T>> 안 됨

`absl::Span`은 *연속* 메모리 가정이다. 행이 흩어진 2D를 직접 표현하지 않는다.

```cpp
// 회피
absl::Span<absl::Span<int>> matrix;   // ❌ Span 배열은 연속 메모리 아님 (대부분)

// Good — flat + stride
struct Matrix {
    absl::Span<float> data;
    int rows, cols;
    float& At(int r, int c) { return data[r * cols + c]; }
};
```

다차원이 필요하면 `mdspan`(C++23) 또는 직접 stride 관리.

## 작은 예시 — 청크 처리

```cpp
void ProcessInChunks(absl::Span<const uint8_t> input, size_t chunk_size) {
    for (size_t off = 0; off < input.size(); off += chunk_size) {
        size_t n = std::min(chunk_size, input.size() - off);
        absl::Span<const uint8_t> chunk = input.subspan(off, n);
        ProcessChunk(chunk);
    }
}

// 호출 측
std::vector<uint8_t> buf = ReadFile();
ProcessInChunks(absl::MakeSpan(buf), 4096);
```

원본의 *어떤 부분*이든 추가 복사 없이 전달.

## 회피 패턴

```cpp
// 회피 — vector를 const& 받으면 호출자가 vector 만들어야 함
void Sum(const std::vector<int>& v);
int arr[] = {1, 2, 3};
Sum(std::vector<int>(std::begin(arr), std::end(arr)));   // ❌ 복사

// Good
void Sum(absl::Span<const int> s);
Sum(arr);   // 복사 없음
```

```cpp
// 회피 — Span으로 받았는데 size_t* 추가
void Read(absl::Span<const int> s, size_t* count);   // ❌ count는 s.size()

// Good
void Read(absl::Span<const int> s) {
    for (int x : s) { /* ... */ }
}
```

## 정리

- `absl::Span`은 연속 메모리의 non-owning view.
- `std::span`(C++20)의 dynamic-extent 짝. 인터페이스 호환.
- 읽기 인터페이스는 `Span<const T>`로 통일하면 모든 contiguous container 수용.
- 슬라이싱: `subspan`, `first`, `last`. STL 알고리즘 그대로 사용.
- dangling 위험은 `string_view`와 동일 — 원본보다 길게 살 수 없음.

## 다음 장 예고

[Part 9-06: absl::any](/blog/programming/code-review/abseil/part9-06-any) — type-erased single-value container.

## 관련 항목

- [Part 4-01: string_view](/blog/programming/code-review/abseil/part4-01-string-view) — 같은 정신의 문자열 view
- [Part 4-02: string_view pitfalls](/blog/programming/code-review/abseil/part4-02-string-view-pitfalls) — dangling 위험
- [Effective Modern C++ — 항목 21: make_unique](/blog/programming/cpp/effective-modern-cpp)
- [원문 — absl::Span](https://abseil.io/docs/cpp/guides/types#span)
