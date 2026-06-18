---
title: "Google 스타일의 Abseil 사용 패턴"
date: 2026-06-13T09:02:00
description: "Part 13-01: Google이 사내에서 Abseil을 어떻게 쓰는지 — code review에서 자주 보는 권장 패턴."
series: "Abseil Code Review"
seriesOrder: 66
tags: [cpp, abseil, code-review, google-style, best-practices]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## Google 코드 리뷰의 핵심 원칙

Abseil은 Google의 내부 코드 리뷰 문화를 그대로 따릅니다. 이 철학을 이해하면 더 나은 C++ 코드를 작성할 수 있습니다.

### 리뷰의 목적

> **코드베이스의 전반적인 건강 상태를 시간이 지남에 따라 개선하는 것**

"완벽한" 코드는 없습니다. 목표는 "더 나은" 코드입니다:

```cpp
// ❌ 리뷰어: "이건 완벽하지 않아서 거부합니다"
// ✅ 리뷰어: "이 변경이 코드베이스를 개선하나요? 그렇다면 승인합니다"
```

### 리뷰어의 책임

1. **기술적 사실과 데이터에 기반해 판단**
2. **스타일 이슈는 스타일 가이드를 따름** (개인 취향 아님)
3. **소프트웨어 설계는 절대적인 원칙이 아닌 트레이드오프**

## 코드 리뷰 체크리스트

### 1. 설계 (Design)

```cpp
// ✅ 좋은 설계: 단일 책임, 명확한 인터페이스
class UserRepository {
public:
    absl::StatusOr<User> FindById(int64_t id);
    absl::Status Save(const User& user);
    absl::Status Delete(int64_t id);
};

// ❌ 나쁜 설계: 너무 많은 책임
class UserManager {
public:
    User* FindUser(int id);
    void SaveUser(User* u);
    void SendEmail(User* u, std::string msg);  // 왜 여기에?
    void GenerateReport();                      // 관련 없음
    void UpdateCache();                         // 구현 상세 노출
};
```

**리뷰 질문**:
- 이 코드가 시스템의 나머지 부분과 잘 통합되는가?
- 지금이 이 기능을 추가할 적절한 시점인가?

### 2. 기능성 (Functionality)

```cpp
// 리뷰어는 엣지 케이스를 생각해야 함
absl::StatusOr<int> ParseInt(absl::string_view input) {
    // ❌ 엣지 케이스 누락
    return std::stoi(std::string(input));

    // ✅ 엣지 케이스 처리
    if (input.empty()) {
        return absl::InvalidArgumentError("Empty input");
    }
    // overflow 처리, 비숫자 문자 처리 등...
}
```

**리뷰 질문**:
- 작성자가 의도한 대로 동작하는가?
- 사용자에게 좋은가? (API 사용자, 최종 사용자 모두)

### 3. 복잡성 (Complexity)

> **"이 코드를 나중에 호출하거나 수정할 개발자가 쉽게 이해할 수 있는가?"**

```cpp
// ❌ 과도하게 복잡
template<typename T, typename Alloc = std::allocator<T>,
         typename = std::enable_if_t<std::is_trivially_copyable_v<T>>>
class OptimizedBuffer {
    // 300줄의 메타프로그래밍...
};

// ✅ 적절한 복잡성 (필요한 만큼만)
class Buffer {
public:
    explicit Buffer(size_t capacity);
    void Append(absl::string_view data);
    absl::string_view View() const;
private:
    std::vector<char> data_;
};
```

**Over-engineering 경고 신호**:
- "나중에 필요할 것 같아서" 추가한 기능
- 실제 사용 사례 없이 일반화된 코드
- 한 번만 사용되는 추상화

### 4. 테스트 (Tests)

```cpp
// ✅ 좋은 테스트: 명확하고, 실패 시 원인 파악 쉬움
TEST(UserRepositoryTest, FindById_ReturnsUser_WhenExists) {
    UserRepository repo;
    repo.Save(User{.id = 42, .name = "Alice"});

    auto result = repo.FindById(42);

    ASSERT_TRUE(result.ok());
    EXPECT_EQ(result->name, "Alice");
}

TEST(UserRepositoryTest, FindById_ReturnsNotFound_WhenMissing) {
    UserRepository repo;

    auto result = repo.FindById(999);

    EXPECT_EQ(result.status().code(), absl::StatusCode::kNotFound);
}

// ❌ 나쁜 테스트: 무엇을 테스트하는지 불명확
TEST(UserTest, Test1) {
    auto u = GetUser();
    EXPECT_TRUE(u != nullptr);  // 무슨 조건?
}
```

**테스트 리뷰 포인트**:
- 정확하고 의미 있는가?
- 실제로 버그를 잡을 수 있는가?
- 실패 시 메시지가 명확한가?

### 5. 명명 (Naming)

```cpp
// ✅ 좋은 이름: 의도가 명확
absl::Duration connection_timeout = absl::Seconds(30);
int num_active_connections;
bool ShouldRetryRequest(const Request& req);

// ❌ 나쁜 이름: 모호하거나 약어
int n;           // 무엇의 개수?
absl::Duration t;  // 무슨 시간?
bool Check();    // 무엇을 체크?
int cnt;         // count를 줄일 이유 없음
```

**명명 원칙**:
- 이름이 충분히 길어서 의미를 전달하는가?
- 하지만 불필요하게 길지는 않은가?

### 6. 주석 (Comments)

```cpp
// ✅ 좋은 주석: WHY를 설명
// 레거시 시스템과의 호환성을 위해 1-based 인덱스 사용
int index = position + 1;

// ✅ 좋은 주석: 복잡한 알고리즘 설명
// Knuth-Morris-Pratt 알고리즘 사용
// 시간 복잡도: O(n + m), n = text 길이, m = pattern 길이
int KmpSearch(absl::string_view text, absl::string_view pattern);

// ❌ 나쁜 주석: WHAT을 반복
// counter를 1 증가시킨다
++counter;

// ❌ 나쁜 주석: 오래된 정보
// TODO(john): 2019년에 수정 예정
```

### 7. 스타일 (Style)

Abseil/Google은 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)를 따릅니다:

```cpp
// Google 스타일 요약
class MyClass {  // 클래스 이름: PascalCase
public:
    void PublicMethod();  // 메서드: PascalCase

private:
    int member_variable_;  // 멤버 변수: snake_case + 밑줄
};

void FreeFunction();  // 자유 함수: PascalCase
int local_variable;   // 지역 변수: snake_case
const int kConstant = 42;  // 상수: k + PascalCase

namespace my_namespace {  // 네임스페이스: snake_case
// ...
}
```

## 리뷰어로서의 행동 지침

### DO (해야 할 것)

```
✅ 건설적이고 교육적인 피드백 제공
✅ "왜"를 설명하고 대안 제시
✅ 좋은 점도 언급 ("이 부분은 깔끔하네요!")
✅ 질문으로 의도 확인 ("이렇게 한 이유가 있나요?")
✅ 빠르게 응답 (24시간 이내 목표)
```

### DON'T (하지 말아야 할 것)

```
❌ "이건 별로네요" (이유 없이 비판)
❌ "내 방식이 더 낫다" (개인 취향 강요)
❌ 사소한 것에 집착 (nit-picking)
❌ 리뷰 지연 (며칠씩 방치)
❌ 한 번에 너무 많은 피드백
```

### 피드백 작성 예시

```cpp
// 원본 코드
void process(std::vector<int>& data) {
    for (int i = 0; i < data.size(); i++) {
        if (data[i] < 0) data[i] = 0;
    }
}

// ❌ 나쁜 리뷰 코멘트
// "이 코드 별로임"

// ✅ 좋은 리뷰 코멘트
// "몇 가지 개선 제안:
// 1. 함수 이름이 모호합니다. `ClampNegativeToZero`는 어떨까요?
// 2. `int` 대신 `size_t`를 사용하면 signed/unsigned 경고를 피할 수 있습니다.
// 3. range-based for를 쓰면 더 읽기 쉽습니다:
//    for (int& value : data) { if (value < 0) value = 0; }
// Nit: const correctness - data를 수정하지 않는다면 const& 사용"
```

## Abseil 특화 리뷰 포인트

### API 안정성

```cpp
// Abseil은 API 안정성을 중시
// 리뷰 시 확인: 이 API가 장기적으로 유지 가능한가?

// ❌ 불안정한 API: 구현 상세 노출
class Cache {
public:
    std::unordered_map<K, V>& GetInternalMap();  // 구현 노출
};

// ✅ 안정적인 API: 추상화된 인터페이스
class Cache {
public:
    absl::optional<V> Get(const K& key);
    void Put(const K& key, V value);
    void Remove(const K& key);
};
```

### 성능 고려

```cpp
// Abseil 코드는 성능을 중요시
// 리뷰 시 확인: 불필요한 복사, 할당이 있는가?

// ❌ 불필요한 복사
std::string GetName() { return name_; }  // 복사 발생

// ✅ 참조 반환
absl::string_view GetName() const { return name_; }

// ❌ 반복적인 할당
for (const auto& item : items) {
    result += item + ", ";  // 매번 재할당
}

// ✅ 한 번에 처리
result = absl::StrJoin(items, ", ");
```

### 에러 처리

```cpp
// Abseil 방식: absl::Status 사용

// ❌ 예외 사용 (Google/Abseil은 예외 사용 안 함)
User GetUser(int id) {
    if (!exists(id)) throw std::runtime_error("Not found");
    return users_[id];
}

// ✅ absl::StatusOr 사용
absl::StatusOr<User> GetUser(int id) {
    if (!exists(id)) {
        return absl::NotFoundError(absl::StrCat("User ", id, " not found"));
    }
    return users_[id];
}
```

## 리뷰 프로세스

### 1. 작은 CL (Change List) 권장

```
권장 크기: ~200줄 이하의 변경

장점:
- 빠른 리뷰 가능
- 더 철저한 검토
- 쉬운 롤백
- 병합 충돌 감소
```

### 2. 좋은 CL 설명 작성

```
## 좋은 CL 설명 예시

첫 줄: 무엇을 하는지 (50자 이내)
> Add caching layer to UserRepository

빈 줄

본문: 왜 이 변경이 필요한지
> UserRepository.FindById() 호출이 DB를 직접 접근하여
> 지연 시간이 높았습니다 (p99: 50ms).
>
> 이 CL은 LRU 캐시를 추가하여:
> - 캐시 히트 시 <1ms 응답
> - 예상 히트율: 80%+
>
> 벤치마크 결과:
> - Before: p50=10ms, p99=50ms
> - After: p50=1ms, p99=15ms
```

## 다음 장 예고

[Part 13-02: 자주 보는 anti-pattern](/blog/programming/code-review/abseil/part13-02-anti-patterns) — 리뷰에서 반복적으로 지적되는 실수 모음.

## 관련 항목

- [Part 13-02: 자주 보는 anti-pattern](/blog/programming/code-review/abseil/part13-02-anti-patterns)
- [Part 13-03: std → absl 마이그레이션 전략](/blog/programming/code-review/abseil/part13-03-std-to-absl-migration)
- [Part 1-02: Design philosophy](/blog/programming/code-review/abseil/part1-02-design-philosophy)
- [Part 3-01: absl::Status](/blog/programming/code-review/abseil/part3-01-status)
- [Google Engineering Practices - Code Review](https://google.github.io/eng-practices/review/)
- [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
- [Abseil C++ Tips](https://abseil.io/tips/)
