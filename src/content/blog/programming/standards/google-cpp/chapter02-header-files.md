---
title: "Ch 2: Header Files"
date: 2025-05-13T02:00:00
description: "Self-contained / #define guard / IWYU / Forward declaration / Inline / Include 순서."
tags: [Google, C++, Style-Guide, Header, Include]
series: "Google C++ Style"
seriesOrder: 2
draft: false
---

헤더 파일은 코드베이스의 접합점이다. 잘못 만들면 컴파일 시간이 폭증하고, 순환 의존이 생기며, 구현 디테일이 인터페이스로 새어 나간다. 이 장의 규칙들은 헤더가 "혼자서도 제 역할을 하도록" 만드는 것을 목표로 한다.

## Self-contained Headers

모든 헤더는 단독으로 컴파일 가능해야 한다는 것이 첫 번째 규칙이다. 어떤 헤더를 사용자가 처음 `#include`하든, 그것만으로 충분해야 한다.

다음은 self-contained가 아닌 헤더의 예다.

```cpp
// foo.h (Bad)
class Foo {
public:
    void Init(const std::string& name);   // string은 어디서?
    std::vector<int> GetData();           // vector도?
private:
    std::map<std::string, int> table_;
};
```

사용자가 이 헤더만 포함하려고 하면 컴파일 에러를 본다.

```cpp
#include "foo.h"   // error: 'string'/'vector'/'map' was not declared
```

해결은 단순하다. 사용하는 타입을 모두 직접 포함한다.

```cpp
// foo.h (Good)
#include <map>
#include <string>
#include <vector>

class Foo {
public:
    void Init(const std::string& name);
    std::vector<int> GetData();
private:
    std::map<std::string, int> table_;
};
```

자기 헤더가 self-contained인지 확인하는 가장 좋은 방법은 `.cc` 파일의 첫 줄에 자기 헤더를 두는 것이다. 만약 누락이 있다면 컴파일러가 즉시 알려 준다.

```cpp
// foo.cc
#include "foo.h"   // 첫 줄. self-contained가 아니면 여기서 실패한다.
#include <iostream>
// ...
```

이 규칙은 `.h` 파일에 적용된다. 코드 일부만 담은 `.inc` 파일(코드 생성 결과나 X-매크로 같은 것)은 예외다.

## The `#define` Guard

같은 헤더가 한 번역 단위에서 여러 번 포함되어도 한 번만 처리되도록 보호한다. 형식은 `<PROJECT>_<PATH>_<FILE>_H_`로 통일한다.

```cpp
// 경로: foo/src/bar/baz.h

#ifndef FOO_BAR_BAZ_H_
#define FOO_BAR_BAZ_H_

// ... 헤더 본문 ...

#endif  // FOO_BAR_BAZ_H_
```

경로 전체를 가드 이름에 반영하는 이유는 같은 이름의 파일이 다른 위치에 있을 때 충돌을 막기 위해서다. `foo/bar/baz.h`와 `qux/bar/baz.h`가 모두 `BAZ_H_`로 가드를 잡으면 둘 중 하나는 무시된다.

`#pragma once`는 대부분의 컴파일러가 지원하지만 표준이 아니다. Google은 일관성을 이유로 `#ifndef` 가드를 쓴다.

```cpp
#pragma once   // 회피 (비표준)
```

## Include What You Use (IWYU)

자기 코드에서 사용하는 모든 심볼은 자기가 직접 포함해야 한다. 다른 헤더가 우연히 끌어다 주는 것에 의존하지 않는다.

다음은 IWYU 원칙을 어긴 경우다.

```cpp
// other.h
#include <string>
#include <vector>
class Other { std::vector<std::string> items; };
```

```cpp
// foo.cc (Bad — 우연한 의존)
#include "other.h"   // 우연히 <string>도 따라옴

void PrintGreeting() {
    std::string s = "hello";   // <string> 직접 안 포함했지만 동작
    std::cout << s;            // <iostream>도 직접 안 포함
}
```

`other.h`가 미래에 `<string>` 의존을 끊으면 `foo.cc`가 깨진다. 사용하는 헤더를 모두 명시하면 이런 시한폭탄이 사라진다.

```cpp
// foo.cc (Good)
#include "other.h"
#include <iostream>
#include <string>

void PrintGreeting() {
    std::string s = "hello";
    std::cout << s;
}
```

자동화 도구로 `include-what-you-use`(Clang 기반)가 있다. CI에 통합해 두면 누락과 잉여를 모두 잡아 준다.

```bash
$ include-what-you-use foo.cc
foo.cc should add these lines:
#include <iostream>
#include <string>

foo.cc should remove these lines:
- #include <map>   // 미사용
```

## Forward Declarations

전방 선언은 컴파일 시간을 줄여 주지만 함정도 많다. 가이드의 입장은 *기본은 `#include`, 꼭 필요할 때만 전방 선언*이다.

전방 선언이 충분한 경우는 다음 셋이다.

```cpp
// 1. 포인터 멤버
class Foo;          // 전방 선언으로 충분
class Bar { Foo* foo_; };

// 2. 참조 매개변수
class Foo;
void Process(const Foo& foo);   // 정의는 .cc에서

// 3. 함수 반환 타입 (선언만)
class Foo;
Foo* CreateFoo();   // 호출처에서 결과를 쓰지 않는 한 충분
```

객체를 직접 갖거나, 메서드를 호출하거나, 인라인으로 사용하면 전방 선언으로 부족하다.

```cpp
class Foo;
class Bar {
    Foo foo_;                        // 에러: incomplete type
    void Use() { foo_->Method(); }   // 에러: 멤버 접근
};
```

전방 선언이 위험한 또 다른 이유는 라이브러리 변경에 약하다는 점이다. `std::string` 같은 타입은 표준 라이브러리에 따라 템플릿 인자 기본값이 다를 수 있어서 전방 선언이 깨질 수 있다.

```cpp
// 회피 — std 타입의 전방 선언:
namespace std { template <typename T> class shared_ptr; }
```

`std`의 모든 타입은 항상 표준 헤더로 포함한다.

## Inline Functions

`inline`은 컴파일러에게 본문을 삽입해 보라는 힌트지만, 큰 함수에 붙이면 바이너리만 비대해진다. 가이드는 본문이 10줄 미만일 때만 inline을 권한다.

```cpp
// Good
inline int Square(int x) { return x * x; }
inline bool IsEmpty(const Container& c) { return c.size() == 0; }
```

루프나 switch가 들어가면 inline의 효과는 거의 없고 코드 부풀림만 남는다.

```cpp
// 회피
inline int Sum(const std::vector<int>& v) {
    int total = 0;
    for (int x : v) total += x;   // 루프
    return total;
}
```

가상 함수와 재귀 함수는 inline이 의미 없다. 컴파일러가 디스패치 시점을 정적으로 결정할 수 없기 때문이다.

```cpp
class Base {
public:
    virtual inline void Method() { /* ... */ }   // inline 무의미
};

inline int Factorial(int n) {                   // 재귀 — 대부분 inline 안 됨
    return n <= 1 ? 1 : n * Factorial(n - 1);
}
```

## Names and Order of Includes

포함 순서는 다섯 단계로 나뉜다. 각 단계 사이는 빈 줄로 구분하고, 단계 안에서는 알파벳 순으로 정렬한다.

```cpp
// myproject/util/url_parser.cc

#include "myproject/util/url_parser.h"   // 1. 자기 헤더 (가장 위)

#include <fcntl.h>                        // 2. C 시스템 헤더
#include <sys/types.h>
#include <unistd.h>

#include <iostream>                       // 3. C++ 표준 헤더
#include <string>
#include <vector>

#include "absl/strings/str_cat.h"         // 4. 외부 라이브러리
#include "absl/strings/string_view.h"
#include "third_party/re2/re2.h"

#include "myproject/util/string_util.h"   // 5. 같은 프로젝트
#include "myproject/util/url_types.h"
```

자기 헤더를 가장 위에 두는 이유는 self-contained 검증을 자동화하기 위해서다. `url_parser.h`에 빠진 include가 있다면 `url_parser.cc`가 컴파일되지 않으므로 즉시 발견된다.

조건부 포함이 필요하면 정렬 규칙을 깨도 된다. 다만 의도를 주석으로 남긴다.

```cpp
#include "myproject/util/header.h"

#ifdef ENABLE_TLS
#include <openssl/ssl.h>
#endif

#include <string>
```

경로는 항상 절대 형식으로 적는다. 빌드 시스템의 include path가 기준이다.

```cpp
// Good
#include "myproject/util/string_util.h"

// 회피
#include "string_util.h"          // 위치 의존, 모호
#include "../util/string_util.h"  // 상대 경로
```

## 실제 헤더 한 장 (전체 예시)

지금까지의 규칙을 한 파일에 모으면 다음과 같이 된다.

```cpp
// myproject/cache/lru_cache.h
//
// LRU cache with a fixed capacity. Not thread-safe; wrap in a mutex
// if concurrent access is needed.

#ifndef MYPROJECT_CACHE_LRU_CACHE_H_
#define MYPROJECT_CACHE_LRU_CACHE_H_

#include <list>
#include <unordered_map>

#include "absl/strings/string_view.h"

#include "myproject/cache/cache_stats.h"

namespace myproject {
namespace cache {

template <typename Key, typename Value>
class LruCache {
public:
    explicit LruCache(size_t capacity);

    void Put(const Key& key, Value value);
    bool Get(const Key& key, Value* out_value);

    inline size_t size() const { return map_.size(); }   // 짧은 inline

private:
    size_t capacity_;
    std::list<std::pair<Key, Value>> items_;
    std::unordered_map<Key, typename decltype(items_)::iterator> map_;
};

}  // namespace cache
}  // namespace myproject

#endif  // MYPROJECT_CACHE_LRU_CACHE_H_
```

가드, namespace 닫는 주석, include 순서, 짧은 inline, 사용하는 표준 헤더의 명시적 포함이 모두 들어가 있다.

## 정리

- 헤더는 단독으로 컴파일 가능해야 하며, `.cc`의 첫 줄에 자기 헤더를 둔다.
- `#define` 가드 이름에는 프로젝트와 경로를 모두 반영한다.
- 사용하는 심볼은 직접 포함한다. 우연한 전이 포함에 기대지 않는다.
- 전방 선언은 컴파일 시간이 결정적 이슈일 때만 쓴다. 기본은 `#include`다.
- 본문이 10줄 미만일 때만 `inline`을 붙인다.
- 포함 순서는 자기 헤더 → C 시스템 → C++ 표준 → 외부 라이브러리 → 프로젝트로 정해진다.

## 다음 장 예고

다음은 **Scoping**이다. namespace, internal linkage, 지역/전역/thread\_local 변수를 다룬다.

## 관련 항목

- [Ch 1: Background](/blog/embedded/automotive/google-cpp/chapter01-background-version-magic)
- [Ch 3: Scoping](/blog/embedded/automotive/google-cpp/chapter03-scoping)
