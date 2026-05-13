---
title: "항목 1: Folly 소개 — Meta의 고성능 C++ 라이브러리"
date: 2025-05-13T13:00:00
description: "Meta(Facebook)의 Folly 라이브러리 소개와 설계 철학, 주요 컴포넌트를 살펴봅니다."
tags: [C++, Folly, Meta, Facebook, Library]
series: "Folly C++ 라이브러리"
seriesOrder: 1
draft: true
---

## Folly란?

**Folly**는 "Facebook Open Source Library"의 약자로, Meta(구 Facebook)가 내부적으로 사용하는 C++ 라이브러리를 오픈소스로 공개한 것입니다. 극한의 성능이 필요한 대규모 시스템에서 검증된 코드입니다.

```cpp
#include <folly/FBString.h>
#include <folly/FBVector.h>
#include <folly/futures/Future.h>

// 최적화된 문자열
folly::fbstring str = "Hello, Folly!";

// 최적화된 벡터
folly::fbvector<int> vec = {1, 2, 3, 4, 5};

// 비동기 프로그래밍
folly::Future<int> future = folly::makeFuture(42);
```

## 왜 Folly인가?

### 1. 극한의 성능

Folly는 "Move Fast"를 넘어 "Move Fast with Performance"를 추구합니다:

```cpp
// folly::fbstring: SSO 최적화 + Copy-on-Write
folly::fbstring s1 = "short";      // 스택에 저장 (23바이트까지)
folly::fbstring s2 = s1;           // COW: 복사 대신 참조 카운트 증가

// folly::small_vector: 힙 할당 없이 작은 배열 저장
folly::small_vector<int, 8> vec;   // 8개까지 스택에 저장
```

### 2. 프로덕션 검증

매일 수십억 요청을 처리하는 Facebook/Instagram/WhatsApp에서 사용:

- **높은 동시성**: 수백만 동시 연결 처리
- **낮은 지연**: 마이크로초 단위 최적화
- **대규모 데이터**: 페타바이트급 처리

### 3. 현대적 C++ 패턴

```cpp
// Expected: 예외 없는 에러 처리
folly::Expected<int, std::string> SafeDivide(int a, int b) {
    if (b == 0) {
        return folly::makeUnexpected("Division by zero");
    }
    return a / b;
}

// Futures: 비동기 체이닝
folly::Future<User> GetUserAsync(int id)
    .thenValue([](User user) { return EnrichUser(user); })
    .thenValue([](User user) { return ValidateUser(user); })
    .thenError([](const std::exception& e) {
        LOG(ERROR) << e.what();
        return User::Default();
    });
```

## 주요 컴포넌트

### 문자열 (folly/String.h)

```cpp
#include <folly/String.h>
#include <folly/FBString.h>

// fbstring: 최적화된 문자열
folly::fbstring fast_string = "optimized for performance";

// 문자열 분리
std::vector<folly::StringPiece> parts;
folly::split(',', "a,b,c,d", parts);  // {"a", "b", "c", "d"}

// 문자열 결합
std::string joined = folly::join(", ", parts);  // "a, b, c, d"

// 대소문자 변환 (in-place)
std::string s = "Hello";
folly::toLowerAscii(s);  // "hello"

// 공백 제거
auto trimmed = folly::trimWhitespace("  hello  ");  // "hello"
```

### 컨테이너 (folly/container)

```cpp
#include <folly/FBVector.h>
#include <folly/small_vector.h>
#include <folly/F14Map.h>

// fbvector: jemalloc 최적화된 벡터
folly::fbvector<int> vec;
vec.push_back(42);

// small_vector: Small Buffer Optimization
folly::small_vector<int, 4> small_vec;  // 4개까지 스택에

// F14 해시맵: SIMD 최적화
folly::F14FastMap<std::string, int> fast_map;
folly::F14NodeMap<std::string, int> node_map;  // 포인터 안정성 필요시
folly::F14ValueMap<std::string, int> value_map;  // 값 안정성 필요시
```

### 비동기 (folly/futures)

```cpp
#include <folly/futures/Future.h>
#include <folly/executors/ThreadPoolExecutor.h>

// Future 생성
folly::Future<int> future = folly::makeFuture(42);

// 비동기 체이닝
auto result = future
    .thenValue([](int x) { return x * 2; })
    .thenValue([](int x) { return std::to_string(x); })
    .get();  // "84"

// 여러 Future 결합
auto combined = folly::collect(future1, future2, future3)
    .thenValue([](auto tuple) {
        auto [a, b, c] = tuple;
        return a + b + c;
    });

// Promise로 수동 완료
folly::Promise<int> promise;
auto future = promise.getFuture();
// 나중에...
promise.setValue(100);
```

### 동시성 (folly/concurrency)

```cpp
#include <folly/concurrency/ConcurrentHashMap.h>
#include <folly/MPMCQueue.h>
#include <folly/synchronization/Baton.h>

// Lock-free 해시맵
folly::ConcurrentHashMap<int, std::string> concurrent_map;
concurrent_map.insert(1, "one");

// Multi-Producer Multi-Consumer 큐
folly::MPMCQueue<int> queue(1000);  // capacity
queue.write(42);
int value;
queue.read(value);

// 경량 동기화 프리미티브
folly::Baton<> baton;
// Thread 1: baton.wait();
// Thread 2: baton.post();
```

### JSON (folly/json)

```cpp
#include <folly/json.h>
#include <folly/dynamic.h>

// 파싱
folly::dynamic json = folly::parseJson(R"({
    "name": "Alice",
    "age": 30,
    "skills": ["C++", "Python"]
})");

// 접근
std::string name = json["name"].asString();  // "Alice"
int age = json["age"].asInt();               // 30

// 생성
folly::dynamic obj = folly::dynamic::object
    ("name", "Bob")
    ("age", 25)
    ("active", true);

std::string serialized = folly::toJson(obj);
// {"name":"Bob","age":25,"active":true}

// Pretty print
std::string pretty = folly::toPrettyJson(obj);
```

### 유틸리티

```cpp
#include <folly/Format.h>
#include <folly/Conv.h>
#include <folly/Range.h>

// 포맷팅 (Python 스타일)
std::string s = folly::sformat("Hello, {}! You have {} messages.", name, count);
std::string s2 = folly::sformat("{1} > {0}", 10, 20);  // "20 > 10"

// 타입 변환
int n = folly::to<int>("42");
std::string s = folly::to<std::string>(3.14);
auto result = folly::tryTo<int>("not a number");  // 실패 시 예외 없음

// StringPiece (string_view 유사)
folly::StringPiece sp = "Hello, World!";
auto hello = sp.subpiece(0, 5);  // "Hello"
```

## 설계 철학

### 1. 성능 우선

```cpp
// Folly는 마이크로 최적화를 두려워하지 않음

// 예: fbstring의 SSO (Small String Optimization)
// - 23바이트까지: 힙 할당 없이 객체 내부에 저장
// - 그 이상: COW (Copy-on-Write)로 복사 최소화

// 예: F14 해시맵
// - SIMD 명령어로 16개 슬롯 동시 검색
// - 캐시 친화적 메모리 레이아웃
```

### 2. 예외 적극 활용

Abseil/Google과 다르게 Folly는 예외를 사용합니다:

```cpp
// Folly 방식: 예외 사용
try {
    auto user = GetUser(id);  // 실패 시 예외
    ProcessUser(user);
} catch (const UserNotFoundException& e) {
    LOG(ERROR) << e.what();
}

// 또는 Expected 사용 (예외 회피 원할 때)
auto result = TryGetUser(id);
if (result.hasValue()) {
    ProcessUser(*result);
} else {
    LOG(ERROR) << result.error();
}
```

### 3. 의존성 수용

Folly는 외부 라이브러리를 적극 활용합니다:

- **Boost**: 일부 기능 의존
- **glog**: 로깅
- **gflags**: 명령줄 플래그
- **jemalloc**: 메모리 할당 최적화
- **OpenSSL**: 암호화

## 빌드 설정

### CMake

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(my_project)

set(CMAKE_CXX_STANDARD 17)

find_package(folly REQUIRED)
find_package(gflags REQUIRED)
find_package(glog REQUIRED)

add_executable(my_app main.cpp)
target_link_libraries(my_app
    Folly::folly
    gflags
    glog::glog
)
```

### vcpkg 사용

```bash
# vcpkg로 설치
vcpkg install folly

# CMake에서 사용
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=[vcpkg-root]/scripts/buildsystems/vcpkg.cmake
```

## Abseil vs Folly 비교

| 특성 | Abseil | Folly |
|------|--------|-------|
| 출처 | Google | Meta (Facebook) |
| 철학 | 표준 확장 | 성능 극대화 |
| 예외 | 사용 안 함 | 적극 사용 |
| 의존성 | 최소 | Boost, glog 등 다수 |
| ABI 안정성 | 비보장 (같은 빌드만) | 비보장 |
| 빌드 복잡도 | 낮음 | 높음 |
| 사용 사례 | 범용 | 고성능 서버 |

### 언제 무엇을 선택할까?

```
Abseil 선택:
- 의존성을 최소화하고 싶을 때
- 표준 라이브러리와 유사한 API 원할 때
- 예외 사용이 제한된 환경
- 빌드 단순성이 중요할 때

Folly 선택:
- 극한의 성능이 필요할 때
- 비동기 프로그래밍이 핵심일 때
- 이미 Boost를 사용 중일 때
- 고성능 서버 개발
```

## 다음 단계

- **항목 2**: Folly 코드 리뷰 가이드와 코딩 스타일
- **항목 3**: F14 해시맵 심층 분석
- **항목 4**: Futures와 비동기 프로그래밍

## 참고 자료

- [Folly GitHub](https://github.com/facebook/folly)
- [Folly Documentation](https://github.com/facebook/folly/tree/main/folly/docs)
- [CppCon 2017: Folly Futures](https://www.youtube.com/watch?v=_kZxPTWQX0E)
