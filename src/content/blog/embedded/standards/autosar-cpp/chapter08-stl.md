---
title: "Ch 8: STL — Container, Algorithm, Smart Pointer"
date: 2025-09-15T09:00:00
description: "C 라이브러리 금지(A18-0), std::array 권장(A18-1), new/delete 회피(A18-5), make_unique·make_shared, vector at vs []."
tags: [autosar, cpp, stl, smart-pointer, container, algorithm]
series: "AUTOSAR C++14"
seriesOrder: 8
draft: false
---

C++ 표준 라이브러리는 *수많은 유용한 도구*를 주지만, *동적 메모리·예외·복잡한 알고리즘*이 얽혀 있다. AUTOSAR는 *허용·금지 영역*을 명확히 한다.

## A18-0 — C 라이브러리 사용 제한

CERT C에서 본 함수들이 *대부분 그대로 금지*된다.

### A18-0-1 — `<cstdio>` 회피

```c++
// 위반
printf("hello\n");                   // dynamic format, heap, unbounded
sprintf(buf, "%d", n);                // bounds 검사 X

// Good — C++ stream 또는 fmt
std::cout << "hello\n";
std::ostringstream oss;
oss << "value=" << n;

// 더 좋음 — fmt (C++20 std::format의 원형)
#include <fmt/core.h>
fmt::print("value={}\n", n);
```

`std::ostream`은 *type-safe + extensible*. `fmt`는 *컴파일 시 format string 검증*.

### A18-0-2 — `<csetjmp>`, `<csignal>` 금지

MISRA R21.4/21.5와 같다.

### A18-0-3 — `std::system`, `std::abort`, `std::exit`, `std::getenv` 회피

```c++
// 위반
std::system("rm /tmp/foo");          // 명령 주입 위험
std::exit(1);                         // destructor 호출 없이 종료
```

### A18-0-4 — `<cwchar>` wide character 회피

```c++
// 회피
std::wstring s = L"hello";

// Good — UTF-8 with std::string
std::string s = "hello";              // 또는 u8"hello" (C++20)
```

Wide character는 *플랫폼마다 폭이 다르고*(`wchar_t`는 Windows 16비트, Linux 32비트), *불필요한 복잡도*.

## A18-1 — Containers and Arrays

### A18-1-1 — C-style 배열 대신 *std::array*

```c++
// 위반
int arr[10];

// Good — std::array
#include <array>
std::array<int, 10> arr;
arr.size();       // 안다
arr.at(5);        // 범위 검사
```

`std::array`는 *컴파일 타임 크기 + 표준 컨테이너 인터페이스*. C 배열의 *decay 문제*도 없음.

### A18-1-2 — `std::vector<bool>` 회피

```c++
// 회피 — vector<bool>은 특수화로 bit packing — 일반 vector와 다른 동작
std::vector<bool> flags(10);
bool &b = flags[0];    // 컴파일 에러 — proxy 객체

// Good
std::vector<char> flags(10);          // char (1 byte)
std::bitset<10> flags;                // 또는 고정 크기 bitset
```

`std::vector<bool>`는 *역사적 실수*. 다른 컨테이너로 우회.

### A18-1-3~6 — `std::list`, `std::forward_list` 회피

```c++
// 회피
std::list<int> l;       // cache locality 나쁨, allocation 많음

// Good
std::vector<int> v;     // 거의 모든 경우 더 빠름
std::deque<int> d;      // 양쪽 끝 자주 변경
```

링크드 리스트는 *cache miss + heap allocation 폭주*. 임베디드는 *vector + 정렬 검색*이 일반적으로 더 빠름.

### A18-9-1 — `std::vector::operator[]`와 `at()`

```c++
std::vector<int> v(10);

int x = v[20];          // 위반 — bounds 검사 없음, UB
int y = v.at(20);       // OK — std::out_of_range throw

// Good — 자체 검사
if (idx < v.size()) {
    int y = v[idx];
}
```

`operator[]`는 *bounds 검사 없음*. `at()`은 *throws on out-of-range*. 예외 비활성화 환경에서는 *자체 검사 필요*.

### A18-9-2 — `std::array::at`도 권장 (또는 자체 검사)

## A18-5 — Memory Management

### A18-5-1 — `new`/`delete` *직접 사용 회피*

```c++
// 회피
Foo *p = new Foo();
/* ... */
delete p;        // 누수, double free 위험

// Good — smart pointer
std::unique_ptr<Foo> p = std::make_unique<Foo>();
// destructor 자동 호출
```

### A18-5-2 — `std::make_unique`, `std::make_shared`

```c++
// 회피
std::shared_ptr<Foo> p(new Foo());

// Good
auto p = std::make_shared<Foo>();
```

`make_*`의 장점:

- **예외 안전** — *new와 shared_ptr 사이의 leak* 차단.
- **한 번의 allocation** — `make_shared`는 *제어 블록과 객체*를 한 번에.
- **간결**.

### A18-5-3 — `delete` 직접 호출 금지, *smart pointer 사용*

### A18-5-4 — *`new` 배열 형*: `std::vector` 또는 `std::array`

```c++
// 회피
int *arr = new int[100];
delete[] arr;

// Good
std::vector<int> arr(100);
std::array<int, 100> arr;
```

### A18-5-5 — *Custom allocator*가 필요한 경우 *명시*

임베디드는 *정적 풀 allocator*가 일반적.

```c++
// 정적 풀 allocator
template <typename T, size_t N>
class StaticPoolAllocator {
public:
    using value_type = T;
    T *allocate(size_t n) {
        if (used_ + n > N) return nullptr;
        T *p = reinterpret_cast<T *>(&storage_[used_]);
        used_ += n;
        return p;
    }
    void deallocate(T *p, size_t n) noexcept { /* arena: noop */ }
private:
    alignas(T) std::byte storage_[sizeof(T) * N];
    size_t used_ = 0;
};

std::vector<int, StaticPoolAllocator<int, 1024>> v;
```

이런 패턴으로 *STL container를 정적 메모리 위*에 사용.

### A18-5-7 — *모든 객체*는 *single owner*

```c++
// 회피 — 소유권 모호
Foo *p = ...;
some_container.push_back(p);
some_other.push_back(p);       // 누가 free?

// Good — unique_ptr 한 곳, 다른 곳은 raw pointer (non-owning)
std::unique_ptr<Foo> p = std::make_unique<Foo>();
some_container.push_back(p.get());     // non-owning
// p가 owner
```

`std::shared_ptr`은 *공유 소유권 필요할 때만*. reference counting 비용 + 순환 참조 위험.

### A18-5-8 — `std::shared_ptr` 사용 *최소화*

```c++
// 회피 — 단일 소유면 unique_ptr
std::shared_ptr<Foo> p = std::make_shared<Foo>();

// Good
std::unique_ptr<Foo> p = std::make_unique<Foo>();
```

### A18-5-10 — `std::shared_ptr` 순환 참조는 `std::weak_ptr`

```c++
class Node {
    std::shared_ptr<Node> child;        // 자식 강참조
    std::weak_ptr<Node> parent;         // 부모 약참조 — 순환 차단
};
```

## A18-9 — STL Algorithm

### A18-9-1 — *Type-safe* 알고리즘 사용

```c++
// 회피 — C-style
qsort(arr, n, sizeof(int), cmp);

// Good — STL
std::sort(arr.begin(), arr.end());
std::sort(arr.begin(), arr.end(), [](int a, int b) { return a > b; });
```

`std::sort`는 *type-safe + inline 가능*. `qsort`는 *function pointer 호출*로 inline 불가.

### A18-9-2 — *Range-based for* 활용

```c++
// 회피
for (auto it = v.begin(); it != v.end(); ++it) {
    DoWork(*it);
}

// Good
for (const auto &elem : v) {
    DoWork(elem);
}

// 더 좋음 — std::for_each
std::for_each(v.begin(), v.end(), DoWork);
```

### 알고리즘 카테고리

```c++
// 검색
std::find, std::find_if, std::search

// 변환
std::transform, std::generate

// 정렬·검색
std::sort, std::binary_search, std::lower_bound

// 누적
std::accumulate, std::reduce (C++17)

// 부분 정렬
std::partial_sort, std::nth_element
```

알고리즘은 *iterator 추상*. *컨테이너 종류와 무관*하게 동작.

## std::string vs C-string

```c++
// 회피
char buf[256];
strcpy(buf, src);                // size 검사 X

// Good
std::string s = src;             // 자동 메모리 관리
std::string s = std::string(src, n);   // 길이 명시

// C API 호환 — c_str()
const char *p = s.c_str();
some_c_function(p);
```

`std::string`은 *동적 메모리 사용*. 임베디드에서 *Small String Optimization (SSO)*가 있어 *짧은 문자열은 stack에*. 긴 문자열은 heap. *malloc 금지* 정책이면 *고정 크기 wrapper* 필요.

## std::optional / std::variant

```c++
// C++17 — optional
std::optional<int> Parse(const std::string &s) {
    if (s.empty()) return std::nullopt;
    return std::stoi(s);
}

auto result = Parse("42");
if (result) {
    int v = *result;
}
```

`std::optional`은 *nullable value*를 *type-safe*하게. 포인터 NULL deref 대체 패턴.

## 임베디드 STL 사용 — 종합

| 컴포넌트 | 사용 |
|---------|------|
| `std::array` | ✓ 항상 |
| `std::vector` | △ 동적 할당 — 정적 allocator로 |
| `std::string` | △ 동적 할당 — SSO 또는 wrapper |
| `std::map`, `std::unordered_map` | △ 동적 할당 — flat_map 대안 |
| `std::list` | ✗ cache locality 나쁨 |
| `std::shared_ptr` | △ 순환 참조 위험 |
| `std::unique_ptr` | ✓ |
| `std::optional` | ✓ |
| algorithm `sort`, `find`, etc. | ✓ |

## 정리

- C 라이브러리(`<cstdio>`, `<csetjmp>` 등) 회피, C++ stream/fmt.
- C-style 배열 대신 `std::array`. `vector<bool>` 회피.
- `new`/`delete` 직접 호출 회피 — `make_unique` / `make_shared`.
- 단일 소유는 `unique_ptr`. 공유는 `shared_ptr` + `weak_ptr` 순환 차단.
- `at()` 또는 자체 검사로 *bounds-safe access*.
- `range-based for` + `std::algorithm`이 *type-safe + 깔끔*.
- 임베디드는 *정적 allocator*로 STL을 정적 메모리 위.

## 다음 장 예고

9장은 동시성과 메모리 모델. thread, atomic, memory_order, lock-free.

## 관련 항목

- [Ch 7 — Exception Handling](/blog/embedded/standards/autosar-cpp/chapter07-exceptions)
- [Ch 9 — Concurrency, Memory](/blog/embedded/standards/autosar-cpp/chapter09-concurrency-memory)
