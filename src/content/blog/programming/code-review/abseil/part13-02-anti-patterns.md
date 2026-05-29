---
title: "Part 13-02: 자주 보는 anti-pattern"
date: 2026-05-25T21:00:00
description: "code review에서 반복적으로 지적하는 Abseil 오용 사례 — string_view dangling, mutex annotation 누락, StatusOr 무시, 잘못된 hash 등."
series: "Abseil Code Review"
seriesOrder: 67
tags: [cpp, abseil, anti-pattern, code-review, mistakes]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## anti-pattern을 모아 보는 이유

리뷰 코멘트의 80%는 *같은 실수의 반복* 이다. 한 번 정리해 두면 PR 작성 단계에서 스스로 잡아낼 수 있다. 부정 분류는 가볍게 "회피 vs Good" 쌍으로.

## 1. string_view dangling

`absl::string_view`는 *원본을 빌려보는 뷰* 다. 원본보다 오래 살면 안 된다.

```cpp
// 회피 — 임시 객체의 데이터 view
absl::string_view Bad() {
    return std::string("hello");   // ❌ 임시 std::string 즉시 소멸
}

absl::string_view sv = absl::StrCat("a", "b", "c");   // ❌ StrCat 결과 즉시 소멸

// Good
std::string s = absl::StrCat("a", "b", "c");
absl::string_view sv = s;   // s 살아 있는 동안만 사용
```

함수 매개변수로 받는 `string_view`는 *호출자의 책임* 으로 살아 있다고 가정한다. 함수 반환·멤버 저장은 위험.

```cpp
// 회피 — 멤버 변수로 저장
class Bad {
public:
    explicit Bad(absl::string_view s) : s_(s) {}   // ❌ s_가 dangle 가능
private:
    absl::string_view s_;
};

// Good
class Good {
public:
    explicit Good(absl::string_view s) : s_(s) {}
private:
    std::string s_;   // 복사 소유
};
```

## 2. Mutex annotation 누락

Clang thread safety analysis는 *주석된 mutex/필드*만 검증한다. 누락하면 race가 잡히지 않는다.

```cpp
// 회피
class Bad {
public:
    void Add(int x) { data_.push_back(x); }   // ❌ lock 없이 수정
private:
    absl::Mutex mu_;
    std::vector<int> data_;   // ❌ GUARDED_BY 없음
};

// Good
class Good {
public:
    void Add(int x) ABSL_LOCKS_EXCLUDED(mu_) {
        absl::MutexLock lock(&mu_);
        data_.push_back(x);
    }
private:
    absl::Mutex mu_;
    std::vector<int> data_ ABSL_GUARDED_BY(mu_);
};
```

`ABSL_GUARDED_BY`, `ABSL_LOCKS_EXCLUDED`, `ABSL_EXCLUSIVE_LOCKS_REQUIRED`를 routine하게 붙인다.

## 3. StatusOr / Status 무시

`absl::Status` / `absl::StatusOr<T>`는 nodiscard. 그래도 무시되는 경우가 흔하다.

```cpp
// 회피
absl::Status DoWork() { /* ... */ }

void Caller() {
    DoWork();   // ❌ status 무시 — 컴파일러 경고는 나지만 코드 지나감
}

// 회피 — StatusOr value() 무방비
absl::StatusOr<int> Compute();
int v = Compute().value();   // ❌ 실패 시 throw

// Good — RETURN_IF_ERROR / ASSIGN_OR_RETURN 패턴
absl::Status Caller() {
    RETURN_IF_ERROR(DoWork());
    ASSIGN_OR_RETURN(int v, Compute());
    use(v);
    return absl::OkStatus();
}
```

## 4. Hash + Equality 불일치

`AbslHashValue`와 `operator==`가 *다른 필드 집합*을 보면 해시 컨테이너 invariant가 깨진다.

```cpp
// 회피
struct Bad {
    int id;
    std::string name;
    int version;

    template <typename H>
    friend H AbslHashValue(H h, const Bad& b) {
        return H::combine(std::move(h), b.id);   // id만
    }

    friend bool operator==(const Bad& a, const Bad& b) {
        return a.id == b.id && a.name == b.name;   // id + name
    }
};
// ❌ a == b 인데 hash 다름 가능 (절대 안 됨) — 또는 그 반대
```

**규칙: `a == b` ⇒ `hash(a) == hash(b)`.** hash가 보는 필드 ⊆ equality가 보는 필드.

## 5. flat_hash_map<K, V*> + 멤버에 dangling raw pointer

```cpp
// 회피
absl::flat_hash_map<int, std::vector<int>*> m;
auto* v = m[42];   // 새 슬롯 — null pointer
v->push_back(1);   // ❌ UB

// Good — node_hash_map 또는 value 보유
absl::flat_hash_map<int, std::vector<int>> m;
m[42].push_back(1);   // 자동 생성

// 또는 명시 insert
auto [it, inserted] = m.try_emplace(42);
it->second.push_back(1);
```

## 6. Duration int 변환

```cpp
// 회피 — 단위 모호
void Wait(int seconds);
Wait(5);   // ms? s?

// Good
void Wait(absl::Duration d);
Wait(absl::Seconds(5));
```

```cpp
// 회피 — Duration → int 추출 후 다시 만들기
int ms = static_cast<int>(absl::ToDoubleMilliseconds(d));
absl::Duration restored = absl::Milliseconds(ms);   // 정밀도 손실

// Good — Duration 그대로 전달
absl::Duration restored = d;
```

## 7. ScopedMockLog 누락 → flaky test

```cpp
// 회피 — 로그 출력 검증을 stderr capture로
TEST(BadLog, Warning) {
    // stderr 캡처 + 문자열 매칭 ... ❌ 환경 의존, flaky
}

// Good — ScopedMockLog
TEST(GoodLog, Warning) {
    absl::ScopedMockLog log;
    EXPECT_CALL(log, Log(absl::LogSeverity::kWarning, _, HasSubstr("slow")));
    log.StartCapturingLogs();
    DoSlow();
}
```

## 8. BitGen 매번 생성

```cpp
// 회피
int Pick() {
    absl::BitGen bg;   // ❌ 매번 OS entropy 시드 — 비싸고 thread 충돌
    return absl::Uniform(bg, 0, 100);
}

// Good — thread_local
thread_local absl::BitGen tls_bg;
int Pick() { return absl::Uniform(tls_bg, 0, 100); }
```

## 9. SetFlag 후 캡처된 값 기대

```cpp
// 회피
const bool verbose = absl::GetFlag(FLAGS_verbose);   // 캡처
absl::SetFlag(&FLAGS_verbose, true);
if (verbose) { ... }   // ❌ 여전히 이전 값

// Good — 런타임 변경 감지 필요하면 매번 GetFlag
if (absl::GetFlag(FLAGS_verbose)) { ... }
```

또는 *변경 불가* 한 설정은 main에서 한 번 캡처 후 그것만 사용.

## 10. absl::variant get without check

```cpp
// 회피
absl::variant<int, std::string> v = "hello";
int x = absl::get<int>(v);   // ❌ throw absl::bad_variant_access

// Good
if (auto* p = absl::get_if<int>(&v)) {
    use(*p);
}
```

## 11. FormatTime/ParseTime의 time zone 가정

```cpp
// 회피
std::string s = absl::FormatTime("%H:%M:%S", t, absl::LocalTimeZone());
// ❌ 호스트 의존 — 서버 reboot 시 시간대 바뀌면 결과 다름

// Good — 서비스 표준 TZ
std::string s = absl::FormatTime(absl::RFC3339_full, t, absl::UTCTimeZone());
```

## 12. CHECK로 사용자 입력 검증

```cpp
// 회피
absl::Status Handle(const Request& req) {
    CHECK(!req.user_id().empty());   // ❌ 사용자가 빈 ID 보내면 서버 죽음
}

// Good
absl::Status Handle(const Request& req) {
    if (req.user_id().empty()) {
        return absl::InvalidArgumentError("user_id required");
    }
}
```

CHECK는 *invariant 위반* (자기 코드의 버그). 외부 입력 에러는 `Status`.

## 13. StrCat에 std::string 임시 + string_view 결합

```cpp
// 회피
absl::string_view sv = absl::StrCat("prefix-", suffix);   // ❌ 임시 string

// Good
std::string s = absl::StrCat("prefix-", suffix);
absl::string_view sv = s;   // s 살아 있는 동안 OK
```

## 14. flat_hash_set의 iterator를 invalidate 후 사용

```cpp
// 회피
auto it = set.find(key);
set.insert(new_key);   // ❌ 재해싱 시 it invalidate
if (it != set.end()) use(*it);

// Good — insert 후 다시 find 또는 insert 전에 사용
auto it = set.find(key);
if (it != set.end()) use(*it);   // 먼저 사용
set.insert(new_key);
```

`flat_hash_*`는 *어떤 mutation에서도 iterator·reference invalidate*. 안정 reference가 필요하면 `node_hash_map`.

## 15. Initialize 누락

```cpp
// 회피
int main(int argc, char** argv) {
    LOG(INFO) << "start";   // ❌ log 초기화 전 — flag 미적용
}

// Good
int main(int argc, char** argv) {
    absl::ParseCommandLine(argc, argv);
    absl::InitializeSymbolizer(argv[0]);
    absl::InstallFailureSignalHandler({});
    absl::InitializeLog();
    LOG(INFO) << "start";
}
```

## 빠른 자가 점검 표

| 영역 | 체크 |
|------|------|
| string_view | 멤버 저장 / 함수 반환 안 함 |
| Mutex | `GUARDED_BY` 모든 보호 필드에 |
| Status | `RETURN_IF_ERROR` / `ASSIGN_OR_RETURN` 사용 |
| Hash | hash vs equality 필드 일치 |
| flat_hash_* | iterator invalidation 의식 |
| Duration | int 대신 `Duration` 시그니처 |
| BitGen | `thread_local` 또는 멤버 |
| CHECK | invariant만 — 입력 검증은 Status |
| FormatTime | UTC + RFC3339 기본 |
| LOG | severity 적절, Initialize 호출 |

## 정리

- 가장 빈번한 anti-pattern은 *string_view dangling* — 멤버 저장 금지.
- *Mutex annotation 누락* 은 race를 정적 분석에서 숨김 — 일관 적용.
- Status/StatusOr는 `RETURN_IF_ERROR`/`ASSIGN_OR_RETURN` 패턴이 표준.
- hash vs equality 필드 *일치*는 컨테이너 invariant.
- CHECK는 invariant 위반만, 사용자 입력은 Status로.

## 다음 장 예고

[Part 13-03: std → absl 마이그레이션 전략](/blog/programming/code-review/abseil/part13-03-std-to-absl-migration).

## 관련 항목

- [Part 4-02: string_view pitfalls](/blog/programming/code-review/abseil/part4-02-string-view-pitfalls)
- [Part 6-05: Mutex annotations](/blog/programming/code-review/abseil/part6-05-mutex-annotations)
- [Part 3-03: Status 매크로](/blog/programming/code-review/abseil/part3-03-status-macros)
- [Part 5-01: flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [Part 13-01: Google 스타일의 Abseil 사용 패턴](/blog/programming/code-review/abseil/part13-01-google-style-patterns)
