---
title: "항목 18: 헤더 파일의 전역 범위에 using namespace를 사용하지 말라"
date: 2026-05-09T17:00:00
description: "헤더의 using namespace는 모든 사용자 파일을 오염시킴 — 이름 충돌, 오버로드 해석 변경, ODR 위반."
tags: [C++, Headers, Namespaces]
series: "Beautiful C++"
seriesOrder: 18
draft: true
---

## 왜 이 항목이 중요한가?

`.cpp` 파일에서 `using namespace std;`를 쓰면 — 그 파일 안에서만 효과. 짧고 편리.

`.h` 헤더 파일에서 같은 짓을 하면 — **그 헤더를 include한 모든 파일**의 네임스페이스가 오염된다. 사용자가 자기 코드에 `class vector`를 정의했다면? — `std::vector`와 충돌. 사용자가 `using namespace mylib;`을 추가했다면? — 두 네임스페이스의 이름이 무작위로 섞임. 한 번 풀린 네임스페이스는 되돌릴 방법이 없다.

이 항목의 규칙은 단순하다 — **헤더에선 절대 `using namespace`** 를 풀지 마라.

## 핵심 내용

- 헤더의 `using namespace`는 **그 헤더를 포함한 모든 파일**의 네임스페이스를 오염시킨다
- 한 번 오염되면 **되돌릴 방법이 없다** — 사용자에게 강요되는 결정
- 이름 충돌·오버로드 해결 변경·미묘한 ODR 위반의 원인
- **소스 파일(`.cpp`) 안이나 함수 범위**에서만 제한적으로 허용
- 헤더에서는 항상 **명시적 한정** (`std::vector`)

## 비교 — 헤더 오염 vs 명시 한정

### Bad: header.h

```cpp
// header.h
#include <vector>
using namespace std;            // 이 헤더를 include한 모든 곳에 std 풀림

class Widget {
    vector<int> data_;          // 짧지만 전염성이 강함
};
```

사용자 측 영향:

```cpp
// user.cpp
#include "header.h"

namespace user {
    class vector { /* ... */ };     // user::vector 정의
}

using namespace user;               // user의 vector도 풀림

vector<int> v;     // 모호 — std::vector? user::vector?
                   // → 컴파일 에러
```

또는 더 미묘하게:

```cpp
// user.cpp
#include "header.h"

class Widget;     // forward declaration

void f() {
    Widget w;     // ⚠️ std::Widget? mylib::Widget? 모호
}
```

ADL과 결합하면 더 혼란.

### Good: header.h

```cpp
// header.h
#include <vector>

class Widget {
    std::vector<int> data_;     // 명시적 한정
};
```

사용자에게 어떤 강요도 없음. 추가 보너스: 코드 읽을 때 `std::`가 보여 표준 라이브러리 사용임이 즉시 인지.

## 한 번 풀린 네임스페이스를 되돌릴 수 없다

```cpp
#include "header_with_using.h"
// 이 시점부터 std::가 풀림

namespace { using namespace std; }     // 더 풀기

#undef ???      // ⚠️ using namespace는 #undef 불가
```

`using namespace`를 취소하는 표준 메커니즘 자체가 **없다**. 헤더에서 한 번 풀면 — 사용자의 영원한 부담.

## 함정 — 오버로드 해석 변경

```cpp
// std::distance 추가 후 사용자 코드 동작 변경
#include "header.h"     // using namespace std 포함

int distance(int a, int b);     // 사용자 함수

void f() {
    auto it1 = v.begin(), it2 = v.end();
    auto d = distance(it1, it2);    // std::distance? 사용자 distance?
                                     // 표준 추가에 따라 동작 바뀜
}
```

C++ 표준 라이브러리가 함수를 추가할 때마다 — `using namespace std`가 풀린 헤더를 통해 사용자 코드의 의미가 바뀔 위험.

## 함정 — ADL 충돌

```cpp
// header.h
using namespace std;

// user.cpp
#include "header.h"

namespace my {
    struct Widget {};
    void swap(Widget&, Widget&);     // my::swap
}

void f() {
    my::Widget a, b;
    swap(a, b);     // ADL → my::swap 발견
                    // + using namespace std → std::swap도 후보
                    // → 모호 또는 std::swap이 우선
}
```

ADL(Argument-Dependent Lookup)과 결합하면 — 어느 swap이 호출되는지 예측 어려움.

## 함정 — ODR 위반 가능

```cpp
// header.h
using namespace std;

inline int compute() {
    string s = "hello";     // std::string인가, 다른 string인가?
    return s.size();
}
```

두 다른 TU에서 `compute()`의 인스턴스화가 다른 string을 보면 — **inline 함수의 정의가 다름** → ODR 위반 → UB.

실제로는 드물지만, 가능한 시나리오.

## 정당한 예외 — 좁은 범위의 using

### 1) 함수 안

```cpp
void process(std::vector<int>& v) {
    using std::sort;       // 함수 안 — OK
    using std::greater;
    
    sort(v.begin(), v.end(), greater<int>{});
}
```

함수 범위만 영향. 짧고 안전.

### 2) 클래스 안

```cpp
class Widget {
    using namespace std;     // ❌ 클래스 안에서도 권장 X
public:
    vector<int> data_;
};
```

기술적으로 가능하지만 — 클래스 인터페이스에 영향. 사용 자제.

### 3) using declaration (특정 이름만)

```cpp
// header.h — 이 정도는 OK
namespace mylib {
    using std::string;       // string 만 끌어옴
    using std::vector;
    
    class Widget {
        string  name;
        vector<int> data;
    };
}
```

특정 이름만 — 충돌 위험 적음. `mylib` 네임스페이스 안에서만 효과.

## .cpp 파일에서의 using namespace

```cpp
// widget.cpp
#include "widget.h"

using namespace std;     // ✅ 소스 파일 내부 — OK

void Widget::process() {
    vector<int> tmp;     // std::vector
    sort(tmp.begin(), tmp.end());
}
```

소스 파일은 다른 곳에 영향 X. 단, 큰 파일이거나 여러 라이브러리를 사용하면 — 충돌 가능성. 보수적으로 `std::` 명시도 권장.

## C++17 nested namespace

```cpp
namespace company::team::library {
    // ...
}
```

긴 네임스페이스 경로를 줄이는 모던 도구. `using namespace` 의존을 줄임.

## C++20 `using enum`

```cpp
enum class Color { Red, Green, Blue };

void f(Color c) {
    using enum Color;     // C++20 — 좁은 범위에 enum 값 풀기
    
    if (c == Red) { /* ... */ }     // Color:: 생략 가능
}
```

특정 enum만, 함수 안에서. 헤더에선 사용 자제.

## 자동 코드 포매터 / 린터 설정

```bash
clang-tidy --checks='google-build-using-namespace'
```

헤더의 `using namespace`를 자동 감지. CI에 통합 권장.

## 모던 변형 — alias로 짧게

긴 네임스페이스 경로가 부담이면 — alias로:

```cpp
namespace fs = std::filesystem;
namespace mpl = boost::mpl;

fs::path p = "/tmp";
auto v = mpl::vector<int, double>{};
```

`namespace alias = ...` — `using namespace` 없이도 짧게.

## 함정 — Anonymous namespace + using

```cpp
// widget.cpp
namespace {
    using namespace std;     // ⚠️ 익명 namespace + using namespace
    
    void helper() {
        vector<int> v;
    }
}
```

소스 파일 안의 익명 namespace는 그 파일에 한정 — using namespace 영향도 그 파일 안. 기술적으로 OK지만 가독성에 안 좋음.

## 흔한 패턴 — 헤더 안의 안전한 using

```cpp
// mylib/types.h
#include <string>
#include <vector>

namespace mylib {
    // 자주 쓰는 타입을 mylib 안으로 끌어옴
    using std::string;
    using std::vector;
    
    using StringList = vector<string>;
    using IntList    = vector<int>;
}
```

- `using namespace std;` 아님 — 특정 이름만
- `mylib` 안에서만 효과 — 외부 영향 X
- 자체 alias 정의에 사용

## 실무 가이드 — 결정

```
using ~를 사용하고 싶다 — 어디서?
├── 헤더 전역 → 절대 X
├── 헤더 안의 namespace 내부 → 특정 이름만 (using std::X) OK
├── 소스 파일 (.cpp) 전역 → using namespace std OK (조심)
├── 함수 안 → using std::sort 등 OK
└── 클래스 안 → 자제 (인터페이스 영향)
```

## 실무 가이드 — 체크리스트

- [ ] 헤더에 `using namespace` 없는가?
- [ ] 헤더의 모든 표준 이름이 `std::` 명시?
- [ ] 좁은 범위에서만 using 사용?
- [ ] `using std::X` (특정 이름) 우선?
- [ ] clang-tidy로 자동 검출?
- [ ] 긴 네임스페이스는 alias로 단축?

## 정리

헤더는 **수많은 번역 단위에 복사**된다. 거기서 네임스페이스를 풀어버리면 사용자 코드의 의미를 임의로 바꾸는 셈이다. 항상 `std::`처럼 명시적으로 적어라.

규칙:
- **헤더 전역 `using namespace` 금지** (예외 없음)
- **`using std::X`** — 특정 이름만 OK
- **소스 파일 / 함수 내부** — 신중히 사용
- **alias로 단축** — 긴 경로는 `namespace ns = ...`

## 관련 항목

- [항목 5: 한 선언 한 이름](/blog/programming/cpp/beautiful-cpp/item05-one-declaration-per-name) — 헤더 위생 일반
- [항목 9: C ABI 경계](/blog/programming/cpp/beautiful-cpp/item09-use-c-subset-for-cross-compiler-abi) — 헤더의 또 다른 신중함
- [항목 12: TMP 최소화](/blog/programming/cpp/beautiful-cpp/item12-use-template-metaprogramming-sparingly) — 헤더 컴파일 시간
