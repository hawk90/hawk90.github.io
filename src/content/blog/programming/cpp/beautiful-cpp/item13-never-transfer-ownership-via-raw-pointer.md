---
title: "항목 13: 원시 포인터나 참조로 소유권을 넘기지 말라"
date: 2026-05-05T13:00:00
description: "소유권을 타입으로 표현하기 — unique_ptr, shared_ptr, 관찰 포인터의 의도 명확화."
tags: [C++, Ownership, Smart Pointers]
series: "Beautiful C++"
seriesOrder: 13
draft: true
---

## 왜 이 항목이 중요한가?

`T*`는 가장 흔한 함정의 원천이다. 함수 시그니처에서 `Widget* p`를 보고 호출자가 자문해야 할 질문들:

- 이 함수가 호출 후 `p`를 보관하나? 일회용?
- 반환된 `Widget*`을 내가 `delete`해야 하나?
- `nullptr` 가능?
- 이 포인터가 가리키는 객체가 함수 호출 후에도 살아 있나?

raw 포인터/참조는 **이 모든 의도를 표현하지 못한다**. 결과: 이중 해제, 누수, dangling, use-after-free.

C++11 이후 **스마트 포인터로 소유권을 타입에 박는** 게 표준 idiom. raw pointer는 "**non-owning observer**"의 의미로만 사용. 이 항목은 그 규칙과 패턴.

## 핵심 내용

- `T*` / `T&`는 **소유 의도를 표현하지 못한다** — 호출자가 delete해야 하나? 안 해야 하나?
- 누군가 매뉴얼/주석을 안 보면 **이중 해제**나 **누수**로 직결
- 소유권 이전은 **`std::unique_ptr<T>` 반환** 또는 인자 by-value 이동(`unique_ptr<T>&&`)으로
- 소유권 **공유**가 필요하면 `std::shared_ptr<T>`
- 원시 포인터/참조는 **non-owning**(잠시 빌려보기)일 때만

## 비교 — 의도 불명 vs 시그니처에 표현

### Bad: 호출자가 알 수 없는 소유 의도

```cpp
Widget* create_widget();           // 호출자가 delete? 캐시에 보관?
void    take(Widget* w);            // 보관? 일회용? 소유권 이전?
void    process(Widget* w);         // 빌려보기? 변경?
Widget* find(int id);               // 컨테이너 내부 포인터? 새 객체?

// 사용자가 매번 문서 참조해야 — 종종 실수
```

문제:
- 모든 raw pointer의 의도가 시그니처에 안 보임
- 문서/주석에 의존 — 옛 문서 또는 누락
- 컴파일러가 검증 못 함

### Good: 소유권이 시그니처에 드러난다

```cpp
std::unique_ptr<Widget> create_widget();          // 호출자가 소유 (단일)
std::shared_ptr<Widget> create_shared_widget();   // 공유 소유

void take(std::unique_ptr<Widget> w);             // 소유권 이전 (이동 강제)
void share(std::shared_ptr<Widget> w);             // 공유 참여 (refcount++)

void use(const Widget& w);                         // 빌려보기 (non-owning, non-null)
void observe(Widget* w);                           // 빌려보기 + nullable

Widget& find(int id);                              // 컨테이너의 멤버 참조
```

각 시그니처가 의도를 명시 — 사용자가 문서 안 봐도 OK.

## 표현표 — 의도 → 타입

| 의도 | 타입 |
| --- | --- |
| 단일 소유, 호출자에게 이전 | `std::unique_ptr<T>` |
| 공유 소유, refcount | `std::shared_ptr<T>` |
| 약한 참조 (cycle 방지) | `std::weak_ptr<T>` |
| 빌려보기, non-null 보장 | `const T&` (read) / `T&` (write) |
| 빌려보기, nullable | `const T*` / `T*` |
| C API 호환 (소유권 이전) | `T*` + 명시 문서 또는 wrapper |

## `unique_ptr` 반환 — 가장 흔한 idiom

```cpp
std::unique_ptr<Widget> create_widget(int id) {
    return std::make_unique<Widget>(id);
}

auto w = create_widget(42);     // w가 소유 — w 소멸 시 delete
```

이점:
- 호출자가 `delete` 잊을 일 없음
- 예외 안전 (생성 중 throw 시 메모리 해제)
- `nullptr` 반환은 명시적

## `unique_ptr` 인자 — 소유권 이전

```cpp
class Manager {
    std::vector<std::unique_ptr<Widget>> widgets_;
public:
    void take(std::unique_ptr<Widget> w) {
        widgets_.push_back(std::move(w));
    }
};

auto w = create_widget(42);
manager.take(std::move(w));     // ✅ 명시적 이전
manager.take(w);                 // ❌ 컴파일 에러 — unique_ptr 복사 불가
```

`std::move` 강제 — 사용자가 의도를 코드에 명시.

## 빌려보기 — `const T&` 우선

```cpp
void process(const Widget& w) {       // ✅ non-null 보장, 빌리기만
    // ... w 사용 ...
}

Widget w;
process(w);     // 자동으로 참조 전달
```

`const T&`는:
- **null 불가** — 매개변수에 reference 바인딩
- **소유 X** — 함수는 그냥 사용만
- 사용자가 명시적으로 `&` 안 적어도 됨

수정이 필요하면 `T&` (non-const reference).

## `T*` — nullable observer

```cpp
class TreeNode {
    TreeNode* parent_ = nullptr;        // ✅ nullable, non-owning
public:
    void setParent(TreeNode* p) { parent_ = p; }
    TreeNode* parent() const { return parent_; }
};
```

`parent_`가 null일 수 있음을 명시. `T*`는 종종 "**optional reference**"의 표현.

C++17+ `std::optional<std::reference_wrapper<T>>` 또는 단순히 `T*` — 후자가 흔함.

## 함정 — `shared_ptr` 남용

```cpp
class Widget {
    std::shared_ptr<Database> db_;       // ⚠️ 정말 공유 소유?
public:
    explicit Widget(std::shared_ptr<Database> db) : db_(std::move(db)) {}
};
```

질문: Widget이 정말 Database의 **소유자**인가? 아니면 그냥 사용하나?

- 진짜 공유 → `shared_ptr`
- 사용만, 라이프타임은 외부 보장 → `Database&` 또는 `Database*`

`shared_ptr`는:
- 메모리 오버헤드 (control block)
- atomic refcount 비용
- 순환 참조 가능성

기본은 `unique_ptr` (단일 소유) + reference (빌리기). `shared_ptr`는 정말 공유 의미가 있을 때만.

## 함정 — `shared_ptr<T>` 인자 by-value vs reference

```cpp
void process(std::shared_ptr<Widget> w);        // refcount 증가
void process(const std::shared_ptr<Widget>& w); // refcount 증가 없음
void process(const Widget& w);                  // 가장 효율적 — refcount 무관
```

함수가 `Widget`을 사용만 하면 `const Widget&`로. 정말 보관/공유가 필요할 때만 `shared_ptr`.

## C++17 — `std::optional<T>`

```cpp
std::optional<Widget> find(int id);

if (auto w = find(42)) {       // bool 변환
    use(*w);                    // optional 안의 값
}
```

값 반환 + 실패 가능성 — raw pointer의 nullable 의미 대체.

```cpp
// Bad: raw pointer로 optional
Widget* find(int id);
if (auto* w = find(42)) {     // null 체크
    use(*w);
}

// Good: optional
std::optional<Widget> find(int id);
```

값 의미가 명확할 때 `optional`.

## `weak_ptr` — 순환 참조 방지

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> parent;     // 순환 회피
};
```

`shared_ptr`만 쓰면 순환 시 영구 누수. `weak_ptr`로 한쪽 끊어 해결.

## 함정 — C 라이브러리 호환

```cpp
// C API: void* user_data
void register_callback(void (*cb)(int, void*), void* user_data);

// 사용
auto w = std::make_unique<Widget>();
register_callback(handler, w.get());     // raw pointer 노출
// w가 살아 있어야 콜백이 안전 — C API는 모름
```

C API 경계에선 raw pointer 필수 — 그러나 **그 너머에서 즉시 RAII로** 회복:

```cpp
class CallbackOwner {
    std::unique_ptr<Widget> widget_;
public:
    CallbackOwner() : widget_(std::make_unique<Widget>()) {
        register_callback(handler, widget_.get());
    }
    ~CallbackOwner() {
        unregister_callback();
    }
};
```

## GSL `owner<T*>`, `not_null<T*>`

C++ Core Guidelines의 표시 타입:

```cpp
#include <gsl/pointers>

gsl::owner<Widget*> create();              // 소유 의도 (raw 그대로지만 명시)
void use(gsl::not_null<Widget*> w);        // null 아님 보장
```

raw pointer를 유지하면서도 의도 명시. 점진 마이그레이션에 유용.

## 모던 변형 — `std::observer_ptr` (Library Fundamentals TS)

```cpp
#include <experimental/memory>

void process(std::experimental::observer_ptr<Widget> w);
```

명시적 "관찰자" 타입. 표준 채택 아직 안 됨 — `T*`가 사실상 표준.

## 실무 가이드 — 결정 트리

```
함수가 객체를 어떻게 다루는가?
├── 새로 만들어서 반환 → std::unique_ptr<T> (단일) or shared_ptr<T> (공유 의도)
├── 소유권 받음 → std::unique_ptr<T> 인자 + std::move 강제
├── 그냥 사용만 (수정 가능) → T&
├── 그냥 사용만 (읽기) → const T&
├── 사용만 + null 가능 → T* / const T*
└── C API 경계 → raw T*, 즉시 wrapper로 복귀
```

## 실무 가이드 — 체크리스트

- [ ] 함수 시그니처에서 소유 의도가 드러나는가?
- [ ] 새 객체 반환 — `unique_ptr`?
- [ ] 소유권 이전 인자 — `std::move` 강제?
- [ ] 사용만 — `const T&` 우선?
- [ ] nullable observer — `T*`?
- [ ] `shared_ptr` 정말 필요한가, 단순 빌리기로 충분?
- [ ] 순환 가능성 — `weak_ptr`?
- [ ] C API 경계만 raw pointer 사용?

## 정리

소유권은 **타입으로** 말해야 한다. `unique_ptr`/`shared_ptr`로 소유를, 원시 포인터·참조로 관찰을 표현하면 누수와 이중 해제가 사라진다.

기본 사다리:
1. **`const T&`** — 사용만, null 불가
2. **`T*`** — 사용만, null 가능 (또는 optional)
3. **`std::unique_ptr<T>`** — 단일 소유
4. **`std::shared_ptr<T>`** — 공유 소유 (정말 필요한 경우만)
5. **`weak_ptr<T>`** — 순환 끊기

raw pointer는 절대 **소유 이전**의 의미로 쓰지 마라.

## 관련 항목

- [항목 7: 지저분한 struct 캡슐화](/blog/programming/cpp/beautiful-cpp/item07-encapsulate-messy-structs) — C API의 RAII 래핑
- [항목 11: 명시적 공유 최소화](/blog/programming/cpp/beautiful-cpp/item11-minimize-explicit-data-sharing) — shared_ptr의 신중한 사용
- [항목 30: RAII로 누수 방지](/blog/programming/cpp/beautiful-cpp/item30-use-raii-to-prevent-leaks) — RAII 원리
