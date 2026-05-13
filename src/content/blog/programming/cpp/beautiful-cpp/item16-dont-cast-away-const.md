---
title: "항목 16: const를 형 변환하지 말라"
date: 2026-05-09T15:00:00
description: "const_cast는 약속을 깨는 신호 — mutable 캐시, API 재설계로 풀어라."
tags: [C++, const-correctness, mutable]
series: "Beautiful C++"
seriesOrder: 16
draft: false
draft: true
---

## 왜 이 항목이 중요한가?

`const`는 단순한 키워드가 아니라 **호출자와의 약속**이다 — "이 함수/메서드는 이 객체를 변경하지 않는다." 사용자는 이 약속을 믿고 const 객체를 넘기거나 thread-safe하게 공유한다.

`const_cast<T&>(const_obj)`로 const를 벗기는 순간 — 그 약속을 깨고 변경 시도. 원본이 정말 mutable이면 OK일 수도 있지만, **진짜 const 객체**(예: `const` 변수, ROM 데이터)에 쓰면 **즉시 UB**. 그리고 보통 `const_cast`가 필요하다는 사실 자체가 **API 설계가 잘못됐다**는 신호다.

진짜 변경이 필요한 내부 상태(캐시, mutex, 로깅 카운터)는 — `mutable` 키워드로 명시. 그게 정직한 표현.

## 핵심 내용

- `const`는 **호출자와의 약속** — "나는 이걸 안 바꾼다"
- `const_cast`로 벗기는 순간 약속이 깨지고, 진짜 const 객체에 쓰면 **UB**
- 보통 `const_cast`가 필요하다 = **API 설계가 잘못됐다**는 신호
- 진짜 변경이 필요한 캐시·로깅 같은 내부 상태는 **`mutable`** 로 표현
- 외부 C API가 const를 안 받는 경우만 예외적으로 허용

## 비교 — const_cast vs mutable

### Bad: const_cast로 약속 깸

```cpp
class Repo {
    std::optional<Result> cache_;
public:
    Result query() const {              // const 메서드
        if (!cache_) {
            const_cast<Repo*>(this)->cache_ = compute();    // ⚠️ const 벗김
        }
        return *cache_;
    }
};

const Repo r;
r.query();     // ⚠️ const 객체에 const_cast → 변경 → UB
```

문제:
- `const Repo`로 만들면 진짜 read-only 메모리에 들어갈 수 있음
- 거기에 `const_cast` 후 쓰기 → segfault 또는 UB
- 코드 리뷰에서 "왜 const_cast?" 묻게 됨

### Good: mutable로 의도 명시

```cpp
class Repo {
    mutable std::optional<Result> cache_;     // 'mutable' — const 메서드에서도 변경 가능
public:
    Result query() const {
        if (!cache_) cache_ = compute();      // ✅ mutable이라 OK
        return *cache_;
    }
};

const Repo r;
r.query();     // ✅ 안전 — cache_는 mutable
```

`mutable` 키워드:
- 멤버에 표시 → const 메서드 안에서도 변경 가능
- 의미: "이 멤버는 객체의 **논리적 상태**가 아니라 **구현 디테일**(캐시, 로깅 등)"
- 호출자와의 약속(const)을 유지하면서 내부 변경 가능

## bitwise const vs logical const

C++ 표준의 `const` 멤버 함수는 **bitwise const** — 객체의 비트가 변경 안 됨. 그러나 우리가 원하는 건 보통 **logical const** — 사용자 관점에서 객체 상태가 변경 안 됨.

```cpp
class CTextBlock {
    char* pText;
public:
    char& operator[](size_t pos) const {     // bitwise const — pText 안 바뀜
        return pText[pos];                    // 하지만 호출자가 *pText 수정 가능
                                              // → logical const는 깨짐
    }
};
```

`pText` 자체는 const 멤버 함수에서 안 바뀌지만 — 반환된 reference로 데이터가 수정됨. **약속을 깨는 형태**.

해결: `const` 반환 + 별도 non-const 오버로드.

```cpp
class TextBlock {
    std::string text_;
public:
    const char& operator[](size_t i) const { return text_[i]; }    // 읽기만
    char&       operator[](size_t i)       { return text_[i]; }    // 변경 가능
};
```

## `mutable`의 정당한 사용

### 1) 캐시

```cpp
class Computation {
    int input_;
    mutable std::optional<int> cache_;
public:
    int result() const {
        if (!cache_) cache_ = expensive_compute(input_);
        return *cache_;
    }
};
```

캐시는 **외부 관찰 가능 상태가 아님** — 같은 결과를 빠르게 반환할 뿐. mutable로 OK.

### 2) Mutex

```cpp
class ThreadSafeRepo {
    mutable std::mutex mu_;          // 락은 const 메서드에서도 잠가야
    std::vector<Item> items_;
public:
    size_t size() const {            // const + thread-safe
        std::lock_guard lock(mu_);
        return items_.size();
    }
};
```

`std::lock_guard`가 mutex 잠금/해제 — `mu_`의 내부 상태 변경. `mutable` 필수.

### 3) 로깅 / 통계

```cpp
class Service {
    mutable std::atomic<int> call_count_ = 0;
public:
    Result query() const {
        ++call_count_;                   // 통계 — 외부 상태 X
        return /* ... */;
    }
};
```

호출 횟수, 마지막 접근 시간 등 — 외부 의미와 무관한 메타데이터.

## `const_cast`가 합법적인 드문 경우

### 1) C API 호환 — 원본이 mutable일 때

```cpp
void legacy_api(char* str);       // C API — const 매개변수 X

void wrapper(const std::string& s) {
    char* mut = const_cast<char*>(s.data());     // ⚠️ s가 정말 mutable?
    legacy_api(mut);
}
```

`s`가 정말 mutable 변수에서 왔다면 OK. 그러나 호출자가 `const std::string`을 넘긴 경우엔 UB. 보통 — 복사본 만들기:

```cpp
void wrapper(const std::string& s) {
    std::string mut = s;     // 복사 — 안전
    legacy_api(mut.data());
}
```

C++17+ `std::string`의 `data()`는 non-const 오버로드 있음 — `const_cast` 불필요.

### 2) const 멤버에서 non-const 멤버 호출 (드뭄, 위험)

```cpp
class C {
    void doWork() { /* ... */ }
public:
    void process() const {
        const_cast<C*>(this)->doWork();     // ⚠️ const 약속 깸
    }
};
```

이건 **거의 항상 잘못된 디자인**. `doWork()`가 정말 const-safe면 const 메서드로 만들기. 아니면 `process()`가 const가 아니어야.

### 3) const → non-const 위임 (안전한 변형)

```cpp
class TextBlock {
public:
    const char& operator[](size_t i) const { /* 본문 */ }
    char& operator[](size_t i) {
        return const_cast<char&>(
            static_cast<const TextBlock&>(*this)[i]
        );
    }
};
```

이건 **안전한 const_cast** — 호출자가 원래 non-const 객체이므로 const 제거가 정당. EC++ item 3.

## 함정 — string literal에 const_cast

```cpp
const char* s = "hello";
char* mut = const_cast<char*>(s);
mut[0] = 'H';      // ⚠️ UB — string literal은 read-only memory
```

string literal은 진짜 read-only — 어떤 const_cast로도 변경 불가. 변경하려면 array 또는 string 사용:

```cpp
char s[] = "hello";     // 변경 가능한 array
s[0] = 'H';             // OK
```

## 컴파일러가 잡지 못함

```cpp
void f(const Widget& w) {
    const_cast<Widget&>(w).modify();     // 컴파일러는 침묵
}
```

`const_cast`는 컴파일러 체크를 명시적으로 우회 — 어떤 경고도 없음. 코드 리뷰가 유일한 방어.

## 모던 변형 — `std::as_const` 또는 명시 `const` 컨테이너

`as_const`는 임시로 const 뷰 — `const_cast`의 반대.

```cpp
std::vector<int> v;
for (const auto& x : std::as_const(v)) {     // const reference로 순회
    // ...
}
```

## 함정 — `mutable` 남용

```cpp
class Bad {
    mutable int x_ = 0;
public:
    void doThing() const {
        ++x_;     // 그래서 정말 const-safe인가?
    }
};
```

`mutable`을 단순히 const 회피로 쓰면 — 의도가 흐려짐. **외부 관찰 가능 상태**라면 const 메서드가 잘못. 진짜 implementation detail (캐시, 락)만 mutable.

## 함정 — `mutable` + thread safety

```cpp
class Cache {
    mutable std::optional<Result> cache_;
public:
    Result query() const {
        if (!cache_) cache_ = compute();    // ⚠️ 두 스레드가 동시 호출하면 race
        return *cache_;
    }
};
```

`mutable`은 const 약속을 유지하면서 변경 — 그러나 thread safety는 별개. **여러 스레드에서 const 메서드 호출이 안전**해야 한다는 통념을 깨지 마. 동기화 추가:

```cpp
class Cache {
    mutable std::mutex mu_;
    mutable std::optional<Result> cache_;
public:
    Result query() const {
        std::lock_guard lock(mu_);
        if (!cache_) cache_ = compute();
        return *cache_;
    }
};
```

## 실무 가이드 — 결정 트리

```
const를 벗기고 싶다 — 왜?
├── 캐시/로깅/통계 → mutable 멤버
├── thread safety용 mutex → mutable mutex
├── C API가 const를 안 받음 → 가능하면 복사본, 안 되면 const_cast (원본 mutable 보장)
├── const 멤버에서 non-const 호출하고 싶음 → 디자인 재검토
└── string literal 수정 → 절대 X, 다른 buffer 사용
```

## 실무 가이드 — 체크리스트

- [ ] `const_cast` 사용 전 — 원본이 정말 mutable인가?
- [ ] 캐시/로깅이라면 — `mutable` 멤버로?
- [ ] thread safety용 mutex도 mutable?
- [ ] string literal에 `const_cast` 안 하는가?
- [ ] const 메서드 안에서 mutable 멤버 변경 시 — 동기화?
- [ ] API가 const를 안 받으면 — 인터페이스 재설계 가능?

## 정리

`const_cast`는 **냄새**다. 정말로 변경해야 하는 멤버는 `mutable`로 명시하고, 그 외에는 const 약속을 지켜라.

규칙:
- **`const` 약속을 지키는 게 기본**
- **`mutable`로 정직하게** — 캐시, 락, 통계
- **`const_cast`는 마지막 수단** — C API 호환 등 정말 어쩔 수 없을 때
- 원본이 const면 절대 `const_cast` 후 변경 X (UB)

## 관련 항목

- [Effective C++ 항목 3: const 사용](/blog/programming/cpp/effective-cpp/item03-use-const-whenever-possible) — const 전반
- [Effective C++ 항목 27: 캐스팅 최소화](/blog/programming/cpp/effective-cpp/item27-minimize-casting) — 캐스트 일반
- [항목 26: 불변 데이터 선호](/blog/programming/cpp/beautiful-cpp/item26-prefer-immutable-data) — const의 적극적 활용
