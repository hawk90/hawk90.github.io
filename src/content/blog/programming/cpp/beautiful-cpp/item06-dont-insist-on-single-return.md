---
title: "항목 6: 함수에 단일 반환문을 고집하지 마라"
date: 2026-05-08T06:00:00
description: "C 시절의 단일 반환 규칙이 더는 유효하지 않은 이유 — RAII와 가드 절로 자연스러운 흐름 만들기."
tags: [C++, Control Flow, RAII]
series: "Beautiful C++"
seriesOrder: 6
draft: true
---

## 왜 이 항목이 중요한가?

C 코드베이스의 오래된 코딩 가이드는 종종 "한 함수에 return은 하나만"이라고 적혀 있다. 이유는 명확했다 — 함수 끝에 정리 코드(`goto cleanup:` 패턴)를 두고 모든 경로가 그곳으로 모이게 해 자원 누수를 방지하기 위해. C++에는 **소멸자**가 있어 이 규칙의 전제가 사라졌다.

오히려 단일 반환을 고집하면 — 임시 플래그, 깊은 중첩, "괄호의 피라미드"가 생긴다. 이 항목은 그 함정을 보여주고, **가드 절 + 이른 반환**의 자연스러운 흐름을 권한다.

## 핵심 내용

- "함수당 return 하나" 규칙은 **RAII 이전 C 시절의 잔재**다
- C++에서는 소멸자가 정리 책임을 지므로 **이른 반환(early return)** 이 더 안전하고 명확하다
- **가드 절**(guard clause)로 예외 케이스를 먼저 걸러내면 본문 들여쓰기가 줄어든다
- 단일 반환을 고집하면 오히려 **임시 플래그·중첩 if·복잡한 흐름**이 늘어난다

## 비교 — 단일 반환 강박 vs 가드 절

### Bad: 단일 반환을 위한 인위적 구조

```cpp
int find_index(const std::vector<int>& v, int target) {
    int result = -1;
    if (!v.empty()) {
        for (size_t i = 0; i < v.size(); ++i) {
            if (v[i] == target) {
                result = static_cast<int>(i);
                break;          // ← break + 마지막 return을 위한 우회
            }
        }
    }
    return result;
}
```

- `result` 플래그를 들고 있어야 함
- 중첩 if → 깊은 들여쓰기
- 본문 끝까지 읽어야 의미 파악 가능

### Good: 가드 절 + 이른 반환

```cpp
int find_index(const std::vector<int>& v, int target) {
    if (v.empty()) return -1;                              // 가드
    for (size_t i = 0; i < v.size(); ++i) {
        if (v[i] == target) return static_cast<int>(i);    // 찾았으면 즉시
    }
    return -1;                                              // 못 찾음
}
```

- 가드 절이 예외 케이스를 먼저 처리
- 본문이 평탄 — 들여쓰기 한 단계
- 각 분기의 의미가 즉시 명확

## 가드 절의 패턴

```cpp
void process(const Order* order) {
    // ── 가드: 비정상 케이스 빠르게 처리 ──
    if (!order)                  return;
    if (!order->is_valid())      throw std::invalid_argument("invalid order");
    if (order->is_cancelled())   return;
    if (order->items().empty())  return;
    
    // ── 본문: 정상 케이스 ──
    for (const auto& item : order->items()) {
        // ... 실제 로직 ...
    }
}
```

이른 반환을 위에 모아두면 — 본문이 **"정상 경로의 직선"** 이 된다. 사용자 코드의 진짜 흐름이 코드에서도 직선으로 보임.

## RAII가 정리 책임 — return 어디든 안전

```cpp
int process_file(const std::string& path) {
    std::ifstream in(path);                     // RAII — 함수 끝나면 자동 close
    if (!in) return -1;                          // 안전
    
    std::lock_guard lock(mu);                    // RAII — 자동 unlock
    if (some_condition) return 0;                // 안전
    
    std::unique_ptr<Buffer> buf = make_buffer();// RAII — 자동 delete
    if (other_condition) return 1;               // 안전
    
    // ... 작업 ...
    return 42;
}
```

각 RAII 객체가 자기 자원 정리를 책임 — return 위치는 의미적 선택만 남는다.

대조: C 시절의 패턴.

```c
int process_file(const char* path) {
    int result = -1;
    FILE* fp = NULL;
    char* buf = NULL;
    
    fp = fopen(path, "r");
    if (!fp) goto cleanup;
    
    buf = malloc(BUFSIZE);
    if (!buf) goto cleanup;
    
    /* ... 작업 ... */
    result = 0;
    
cleanup:
    if (buf) free(buf);
    if (fp) fclose(fp);
    return result;
}
```

C++에서 이 패턴이 필요한 경우는 거의 없다 — 외부 C API의 raw 자원이 있을 때만, 그것조차 RAII 래퍼로 가두면 끝(항목 7).

## 함정 — 너무 많은 이른 반환

```cpp
int complex_logic(int a, int b, int c) {
    if (a < 0) return -1;
    if (b > 100) {
        if (c == 0) return -2;
        if (c < 0) return -3;
        if (c > 50) return -4;
    }
    if (a == b) return -5;
    if (a + b > 1000) return -6;
    // ... 더 많은 가드 ...
    return /* 본문 결과 */;
}
```

가드가 **너무 많거나 깊으면** 또 다른 가독성 문제. 보통 함수 자체가 너무 많은 책임을 진다는 신호.

해결: 분리.

```cpp
std::optional<Error> validate(int a, int b, int c) {
    if (a < 0)         return Error::NegativeA;
    if (b > 100 && c == 0) return Error::InvalidC;
    // ...
    return std::nullopt;
}

int complex_logic(int a, int b, int c) {
    if (auto err = validate(a, b, c)) return error_code(*err);
    return compute(a, b, c);
}
```

검증과 계산을 분리 — 각 함수의 책임 단일화.

## 함정 — 이른 반환과 cleanup 코드

```cpp
void process() {
    init_logging();
    if (error_condition) return;     // ⚠️ log 닫기 잊음
    // ...
    shutdown_logging();
}
```

수동 정리가 필요한 부분이 있으면 — 이른 반환이 그걸 우회. 해결: 그 정리도 RAII로.

```cpp
class LoggingScope {
public:
    LoggingScope()  { init_logging(); }
    ~LoggingScope() { shutdown_logging(); }
};

void process() {
    LoggingScope log;                // RAII
    if (error_condition) return;     // 자동 cleanup
    // ...
}
```

또는 `std::scope_exit`(C++ Library Fundamentals TS 또는 third-party):

```cpp
auto cleanup = std::scope_exit([] { shutdown_logging(); });
```

## 흔한 패턴 — 반환값과 부작용 분리

```cpp
std::optional<User> find_user(int id) {
    auto it = users.find(id);
    if (it == users.end()) return std::nullopt;    // 명확한 실패
    return it->second;                              // 명확한 성공
}
```

두 경로 — 성공과 실패 — 가 모두 짧고 명확. 단일 반환이라면 임시 변수와 분기가 필요.

## C++ 표준 라이브러리도 같은 스타일

```cpp
// <algorithm>의 find_if (개념적 구현)
template<typename It, typename Pred>
It find_if(It first, It last, Pred p) {
    for (; first != last; ++first)
        if (p(*first)) return first;     // 찾으면 즉시
    return last;                          // 끝까지 못 찾음
}
```

표준 라이브러리 곳곳에 이른 반환 — 표준 자체가 이 스타일을 따른다.

## 모던 변형 — `std::expected` (C++23)

```cpp
std::expected<User, Error> find_user(int id) {
    if (!authenticated())  return std::unexpected(Error::NotAuthenticated);
    if (!valid_id(id))     return std::unexpected(Error::InvalidId);
    
    auto user = db.lookup(id);
    if (!user)             return std::unexpected(Error::NotFound);
    
    return *user;
}
```

성공/실패를 타입으로 — 각 경로가 이른 반환과 자연스럽게 결합.

## 실무 가이드 — 결정

```
이 함수에 return이 여러 개인가?
├── 의미적으로 같은 결과 (예: -1 = 못 찾음) → 그대로 두기
├── 가드 절로 비정상 케이스 분리 → 권장
├── 본문 끝에 정리 코드가 있음 → RAII로 옮기기
└── 복잡한 분기로 return이 흩어짐 → 함수 분리 검토
```

## 실무 가이드 — 체크리스트

- [ ] 가드 절로 비정상 케이스를 위에서 빨리 처리하는가?
- [ ] 본문이 정상 경로의 직선인가?
- [ ] 수동 정리 코드 대신 RAII 사용?
- [ ] 가드가 너무 많으면 함수 분리?
- [ ] 단일 반환을 위한 임시 플래그/중첩 if 사용 안 하는가?

## 정리

C++에서 자원 정리는 **소멸자**가 한다. return 개수가 아니라 **흐름의 명확함**을 우선하라. 이른 반환이 가독성을 높인다면 주저 없이 써라.

핵심 차이:
- C 시대: 정리 코드를 위해 단일 반환 + goto
- C++ 시대: RAII가 정리 → 가드 절 + 이른 반환이 자연스러움
- 모던: `std::expected`/`std::optional`로 성공/실패 명시

## 관련 항목

- [항목 7: 지저분한 struct 캡슐화](/blog/programming/cpp/beautiful-cpp/item07-encapsulate-messy-structs) — RAII 래퍼 패턴
- [항목 17: 전역 상태/에러 처리](/blog/programming/cpp/beautiful-cpp/item17-avoid-global-state-error-handling) — 에러 처리 모델
- [항목 30: RAII로 누수 방지](/blog/programming/cpp/beautiful-cpp/item30-use-raii-to-prevent-leaks) — RAII의 기반
