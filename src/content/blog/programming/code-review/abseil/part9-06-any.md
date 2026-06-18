---
title: "absl::any 분석"
date: 2026-06-12T09:05:00
description: "absl::any — 임의 타입을 담는 type-erased 컨테이너. variant와 언제 어떻게 다른가."
series: "Abseil Code Review"
seriesOrder: 53
tags: [cpp, abseil, types, any, type-erasure]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## std::any의 polyfill

C++17 `std::any`와 동일 인터페이스. C++17 이상 빌드에서는 `std::any`의 별칭.

```cpp
#include "absl/types/any.h"

absl::any a = 42;
a = std::string("hello");
a = std::vector<int>{1, 2, 3};

if (a.has_value()) {
    auto v = absl::any_cast<std::vector<int>>(a);
}
```

## variant와의 차이

| 측면 | `absl::variant<Ts...>` | `absl::any` |
|------|-----------------------|-------------|
| 가능한 타입 | *컴파일 타임*에 닫힌 집합 | 임의 (`open`) |
| sizeof | `max(sizeof Ts)` | 보통 32바이트 (포인터 + 컨트롤) |
| 큰 객체 | inline | 힙 할당 (SBO 가능) |
| 접근 | `holds_alternative` / `get` | `any_cast<T>` |
| visit | `absl::visit` 지원 | 없음 — 타입을 알아야 cast |
| 컴파일 시 검증 | 모든 alternative 강제 처리 | 런타임 cast 실패 |

`variant`는 *알려진 닫힌 집합*에, `any`는 *플러그인·생명주기 컨테이너* 같이 무엇이 들어올지 모를 때 쓴다.

## 사용 — any_cast

```cpp
absl::any a = std::string("hello");

// 값 cast (복사)
auto s = absl::any_cast<std::string>(a);   // string 복사

// reference cast (소유권 없음)
auto& r = absl::any_cast<std::string&>(a);

// pointer cast (실패하면 nullptr)
if (auto* p = absl::any_cast<std::string>(&a)) {
    use(*p);
}
```

`any_cast<T>(any&)`는 잘못된 타입이면 `bad_any_cast` throw. 안전한 시도는 *pointer 버전*.

## 사용 예 — 플러그인 메타데이터

```cpp
class Plugin {
public:
    virtual ~Plugin() = default;
    virtual void Run() = 0;

    void SetUserData(absl::any data) { user_data_ = std::move(data); }
    template <typename T>
    T* GetUserData() { return absl::any_cast<T>(&user_data_); }

private:
    absl::any user_data_;
};

// 호출자
plugin.SetUserData(std::string("config"));
if (auto* s = plugin.GetUserData<std::string>()) {
    LOG(INFO) << "config = " << *s;
}
```

플러그인이 들고 다닐 타입을 라이브러리가 모를 때 적합. 단, 잘못된 cast는 *런타임* 에만 발견되므로 강한 타입을 우선한다.

## 비용

| 작업 | 비용 |
|------|------|
| 작은 객체(보통 16바이트 이하) | inline storage — 할당 없음 |
| 큰 객체 | 힙 할당(`new`) |
| `any_cast<T>` | typeid 비교 (대부분 RTTI 활용) |
| 복사 | 내부 타입의 복사 비용 |

RTTI 비활성화 빌드(`-fno-rtti`)에서는 `any` 사용 *불가*. Google 코드는 RTTI를 거의 안 쓰는데, `any` 도입 시 이 점을 의식해야 한다.

## 회피 패턴

```cpp
// 회피 — variant로 충분한데 any 사용
absl::any color;   // ❌ 무엇이 들어가지?
color = "red";

// Good — 닫힌 집합은 variant
enum class Color { kRed, kGreen, kBlue };
absl::variant<Color, std::string /*hex*/> color;
```

```cpp
// 회피 — any를 API 경계로 흘리기
absl::any Compute();   // ❌ 반환 타입을 호출자가 추측?

// Good — 의도가 명확한 타입
absl::StatusOr<Result> Compute();
absl::variant<Success, RateLimited, Error> Compute();
```

```cpp
// 회피 — RTTI 없는 빌드에서 any
// 컴파일은 되지만 typeid가 빈 정보 → cast 실패
```

## 작은 예시 — 이벤트 디스패처

```cpp
class Dispatcher {
public:
    using Handler = std::function<void(const absl::any&)>;

    template <typename T>
    void Subscribe(std::function<void(const T&)> fn) {
        handlers_[std::type_index(typeid(T))] =
            [fn = std::move(fn)](const absl::any& a) {
                if (auto* p = absl::any_cast<T>(&a)) {
                    fn(*p);
                }
            };
    }

    void Dispatch(const absl::any& event) {
        auto it = handlers_.find(std::type_index(event.type()));
        if (it != handlers_.end()) it->second(event);
    }

private:
    absl::flat_hash_map<std::type_index, Handler> handlers_;
};
```

타입별 핸들러를 등록하고 이벤트를 type-erased로 흘린다. variant로는 *컴파일 타임에 모든 이벤트 타입*을 라이브러리가 알아야 해서 부적합.

## 정리

- `absl::any`는 임의 타입을 담는 type-erased 컨테이너.
- `variant`(닫힌 집합)와 달리 *open set*. 비용으로 RTTI·힙 할당이 들어올 수 있음.
- `any_cast<T*>(&a)`로 안전 cast. throw 버전은 잘못된 타입에서 `bad_any_cast`.
- *플러그인 메타데이터*, *이벤트 디스패처* 같이 타입이 외부에서 결정되는 경우에만.
- 코드베이스가 RTTI off라면 사용 불가.

## 다음 장 예고

[Part 9-07: absl::compare](/blog/programming/code-review/abseil/part9-07-compare) — three-way comparison.

## 관련 항목

- [Part 9-04: absl::variant](/blog/programming/code-review/abseil/part9-04-variant)
- [Part 9-05: absl::span](/blog/programming/code-review/abseil/part9-05-span)
- [원문 — absl::any](https://abseil.io/docs/cpp/guides/types#any)
