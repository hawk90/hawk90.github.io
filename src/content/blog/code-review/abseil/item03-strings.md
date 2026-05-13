---
title: "항목 3: Abseil 문자열 라이브러리 — StrCat, StrJoin, StrSplit"
date: 2025-05-13T12:00:00
description: "Abseil의 문자열 처리 라이브러리를 깊이 있게 살펴봅니다."
tags: [C++, Abseil, Strings, Performance]
series: "Abseil C++ 라이브러리"
seriesOrder: 3
draft: true
---

## 왜 Abseil 문자열인가?

C++의 문자열 처리는 악명 높게 비효율적입니다:

```cpp
// ❌ std::string의 문제점
std::string result = a + b + c + d;
// 실제로는:
// temp1 = a + b;       // 할당 1
// temp2 = temp1 + c;   // 할당 2
// result = temp2 + d;  // 할당 3
// 총 3번의 메모리 할당!

// ✅ Abseil 방식
std::string result = absl::StrCat(a, b, c, d);
// 총 길이 계산 → 한 번의 할당 → 복사
// 단 1번의 메모리 할당!
```

## absl::StrCat

### 기본 사용법

```cpp
#include "absl/strings/str_cat.h"

// 문자열 연결
std::string s1 = absl::StrCat("Hello", " ", "World");  // "Hello World"

// 다양한 타입 지원
int count = 42;
double price = 19.99;
std::string s2 = absl::StrCat("Items: ", count, ", Price: $", price);
// "Items: 42, Price: $19.99"

// string_view와 혼합 사용
absl::string_view prefix = "Error: ";
std::string s3 = absl::StrCat(prefix, "Something went wrong");
```

### 내부 동작 원리

```cpp
// StrCat의 핵심: 미리 크기를 계산
template <typename... Args>
std::string StrCat(const Args&... args) {
    // 1. 모든 인자의 길이 합산
    size_t total_size = (... + StringLength(args));

    // 2. 한 번에 할당
    std::string result;
    result.reserve(total_size);

    // 3. 순서대로 append
    (result.append(ToString(args)), ...);

    return result;
}
```

### 숫자 포맷팅

```cpp
// 정수
absl::StrCat(42);           // "42"
absl::StrCat(-17);          // "-17"

// 16진수
absl::StrCat(absl::Hex(255));          // "ff"
absl::StrCat(absl::Hex(255, absl::kZeroPad4));  // "00ff"

// 8진수
absl::StrCat(absl::Oct(64));           // "100"

// 부동소수점
absl::StrCat(3.14159);      // "3.14159"
absl::StrCat(absl::SixDigits(3.14159));  // 정밀도 제어
```

### StrAppend (in-place 연결)

```cpp
std::string result = "Start: ";

// ❌ 비효율적
result = result + a + b + c;  // 여러 번 할당

// ✅ 효율적
absl::StrAppend(&result, a, b, c);  // 기존 버퍼 재사용
```

## absl::StrSplit

### 기본 사용법

```cpp
#include "absl/strings/str_split.h"

// 단일 구분자
std::vector<std::string> parts = absl::StrSplit("a,b,c", ',');
// {"a", "b", "c"}

// 문자열 구분자
std::vector<std::string> parts2 = absl::StrSplit("a::b::c", "::");
// {"a", "b", "c"}

// string_view로 반환 (복사 없음!)
std::vector<absl::string_view> views = absl::StrSplit("a,b,c", ',');
```

### 다양한 구분자

```cpp
// 여러 문자 중 하나로 분리
auto parts = absl::StrSplit("a,b;c:d", absl::ByAnyChar(",;:"));
// {"a", "b", "c", "d"}

// 공백으로 분리 (연속 공백 처리)
auto words = absl::StrSplit("  hello   world  ", ' ', absl::SkipEmpty());
// {"hello", "world"}

// 최대 분할 수 지정
auto limited = absl::StrSplit("a:b:c:d", absl::MaxSplits(':', 2));
// {"a", "b", "c:d"}
```

### 구조체로 직접 분해

```cpp
// pair로 분해
std::pair<std::string, std::string> kv = absl::StrSplit("key=value", '=');
// kv.first = "key", kv.second = "value"

// 여러 변수로 분해
std::string name, age, city;
if (absl::StrSplit("Alice,30,Seoul", ',', &name, &age, &city)) {
    // 성공: name="Alice", age="30", city="Seoul"
}
```

### 필터링

```cpp
// 빈 문자열 건너뛰기
auto parts = absl::StrSplit("a,,b,,c", ',', absl::SkipEmpty());
// {"a", "b", "c"}

// 공백만 있는 것도 건너뛰기
auto parts2 = absl::StrSplit("a, ,b, ,c", ',', absl::SkipWhitespace());
// {"a", "b", "c"}

// 커스텀 필터
auto parts3 = absl::StrSplit("1,2,3,4,5", ',',
    [](absl::string_view s) { return std::stoi(std::string(s)) > 2; });
// {"3", "4", "5"}
```

## absl::StrJoin

### 기본 사용법

```cpp
#include "absl/strings/str_join.h"

std::vector<std::string> parts = {"a", "b", "c"};

std::string joined = absl::StrJoin(parts, ", ");
// "a, b, c"

std::string joined2 = absl::StrJoin(parts, "");
// "abc"
```

### 다양한 컨테이너

```cpp
// 배열
int arr[] = {1, 2, 3, 4, 5};
std::string s1 = absl::StrJoin(arr, "-");  // "1-2-3-4-5"

// set
std::set<int> nums = {3, 1, 4, 1, 5};
std::string s2 = absl::StrJoin(nums, ",");  // "1,3,4,5" (정렬됨)

// map
std::map<std::string, int> scores = {{"Alice", 100}, {"Bob", 85}};
std::string s3 = absl::StrJoin(scores, ", ", absl::PairFormatter("="));
// "Alice=100, Bob=85"

// 범위
std::string s4 = absl::StrJoin(parts.begin(), parts.begin() + 2, ",");
// "a,b"
```

### 커스텀 포맷터

```cpp
// 포인터 역참조
std::vector<int*> ptrs = {&a, &b, &c};
std::string s = absl::StrJoin(ptrs, ",", absl::DereferenceFormatter());
// 포인터가 가리키는 값들을 join

// 람다 포맷터
std::vector<User> users = {{1, "Alice"}, {2, "Bob"}};
std::string s = absl::StrJoin(users, ", ",
    [](std::string* out, const User& u) {
        absl::StrAppend(out, u.name, "(", u.id, ")");
    });
// "Alice(1), Bob(2)"
```

## absl::Substitute

printf 스타일보다 안전한 포맷팅:

```cpp
#include "absl/strings/substitute.h"

// 위치 기반 치환
std::string s = absl::Substitute("Hello, $0! You have $1 messages.",
                                  "Alice", 5);
// "Hello, Alice! You have 5 messages."

// 순서 변경 가능
std::string s2 = absl::Substitute("$1 is greater than $0", 10, 20);
// "20 is greater than 10"

// 다양한 타입 자동 처리
int count = 42;
double price = 19.99;
bool available = true;
std::string s3 = absl::Substitute(
    "Items: $0, Price: $$1, Available: $2",
    count, price, available);
// "Items: 42, Price: $19.99, Available: true"
```

### printf vs Substitute

```cpp
// ❌ printf 문제점
char buf[256];
sprintf(buf, "Name: %s, Age: %d", name, age);  // 버퍼 오버플로우 가능
sprintf(buf, "Value: %d", some_string);        // 타입 불일치 = UB

// ✅ Substitute 장점
std::string s = absl::Substitute("Name: $0, Age: $1", name, age);
// - 타입 안전
// - 버퍼 관리 자동
// - 성능도 우수
```

## 성능 비교

### 문자열 연결 벤치마크

```cpp
// 1000개의 문자열 연결 테스트

// std::string + 연산자
void ConcatStd(const std::vector<std::string>& parts) {
    std::string result;
    for (const auto& p : parts) {
        result = result + p;  // O(n²)
    }
}
// 결과: ~15ms

// std::stringstream
void ConcatStream(const std::vector<std::string>& parts) {
    std::stringstream ss;
    for (const auto& p : parts) {
        ss << p;
    }
    std::string result = ss.str();
}
// 결과: ~8ms

// absl::StrJoin
void ConcatAbsl(const std::vector<std::string>& parts) {
    std::string result = absl::StrJoin(parts, "");
}
// 결과: ~2ms (7.5x 빠름!)
```

### 메모리 할당 비교

| 방식 | 할당 횟수 | 총 할당 크기 |
|------|----------|-------------|
| `+` 연산자 | N-1 | O(N²) |
| `stringstream` | ~log(N) | O(N) |
| `StrCat/StrJoin` | 1 | O(N) |

## 실전 패턴

### 로그 메시지 생성

```cpp
// ❌ 느림
LOG(INFO) << "User " << user_id << " performed " << action
          << " on " << resource << " at " << timestamp;

// ✅ 빠름 (한 번의 할당)
LOG(INFO) << absl::StrCat("User ", user_id, " performed ", action,
                          " on ", resource, " at ", timestamp);
```

### CSV 파싱

```cpp
absl::StatusOr<std::vector<Record>> ParseCsv(absl::string_view csv) {
    std::vector<Record> records;

    for (absl::string_view line : absl::StrSplit(csv, '\n', absl::SkipEmpty())) {
        std::vector<absl::string_view> fields = absl::StrSplit(line, ',');

        if (fields.size() != 3) {
            return absl::InvalidArgumentError(
                absl::StrCat("Expected 3 fields, got ", fields.size()));
        }

        records.push_back({
            .name = std::string(fields[0]),
            .age = std::stoi(std::string(fields[1])),
            .city = std::string(fields[2])
        });
    }

    return records;
}
```

### URL 쿼리 문자열 생성

```cpp
std::string BuildQueryString(
    const absl::flat_hash_map<std::string, std::string>& params) {

    return absl::StrJoin(params, "&",
        [](std::string* out, const auto& kv) {
            absl::StrAppend(out, kv.first, "=", kv.second);
        });
}

// 사용
auto params = {{"name", "Alice"}, {"age", "30"}};
std::string query = BuildQueryString(params);
// "name=Alice&age=30"
```

## 다음 단계

- **항목 4**: Abseil 컨테이너 — flat_hash_map, btree_map
- **항목 5**: Abseil 시간 라이브러리

## 참고 자료

- [Abseil Strings Library](https://abseil.io/docs/cpp/guides/strings)
- [Tip of the Week #3: String Concatenation](https://abseil.io/tips/3)
