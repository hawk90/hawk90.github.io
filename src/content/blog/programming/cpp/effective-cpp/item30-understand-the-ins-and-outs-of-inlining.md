---
title: "항목 30: 인라이닝의 안팎을 이해하라"
date: 2025-02-05T14:00:00
description: "inline은 요청일 뿐 — 컴파일러가 결정. 코드 부피·디버깅·라이브러리 호환성 트레이드오프와 LTO 시대의 위치."
tags: [C++, Effective C++, inline, Performance]
series: "Effective C++"
seriesOrder: 30
---

## 개요

`inline` 키워드는 컴파일러에게 **인라이닝을 요청**하는 것 — **보장이 아닙니다**. 컴파일러는 함수 본문을 호출 지점에 펼치는 게 비용 대비 가치 있는지 자체 판단. 인라이닝의 장점(호출 비용 제거, 추가 최적화 기회)은 분명하지만, 코드 부피·디버깅 어려움·헤더-의존성·라이브러리 ABI 영향 등 단점도 큽니다. 모던 컴파일러 + LTO 환경에선 **`inline` 키워드를 거의 안 적어도 잘 동작**하는 경우가 많습니다.

## 필수 개념: inline의 두 형태

> **초보자를 위한 배경 지식**

<br>

C++에서 함수를 인라인 후보로 만드는 방법은 두 가지.

### 명시적 inline

```cpp
inline int square(int n) { return n * n; }
```

`inline` 키워드로 명시 — "이 함수를 인라이닝 고려하시오 + ODR 면제(여러 TU에 정의 OK)".

### 암묵적 inline — 클래스 본문 안의 함수

```cpp
class Widget {
public:
    int getX() const { return x_; }      // 클래스 본문에 정의 → 암묵 inline
private:
    int x_;
};
```

클래스 정의 안에서 본문을 가진 멤버 함수는 자동으로 `inline`. 같은 효과:

```cpp
class Widget {
public:
    int getX() const;                     // 선언만
private:
    int x_;
};

inline int Widget::getX() const { return x_; }   // 명시 inline (헤더에 두기 위해)
```

## inline의 두 가지 효과

```cpp
inline int square(int n) { return n * n; }
```

1. **호출 지점에 펼치기** — 컴파일러 판단. 안 펼칠 수도 있음.
2. **ODR 면제** — 여러 TU에 같은 정의 OK. 헤더에 두기 위함.

대부분의 사용자는 (1)만 의식하지만, **헤더에 함수 정의를 두는 데** (2)가 필요. 헤더에 그냥 함수를 정의하면 여러 .cpp가 include할 때 multiple definition 링크 에러.

## inline이 거부되는 경우

컴파일러는 모든 inline 요청을 받아들이지 않습니다:

- **함수가 복잡** — 비용 대비 손해라고 판단
- **재귀 함수** — 무한 펼치기 불가
- **virtual 함수의 동적 호출** — 어떤 함수가 호출될지 런타임에 결정, 인라인 불가
  ```cpp
  Base* p = ...;
  p->virtualFunc();    // 어느 derived의 함수? 컴파일 타임에 모름
  ```
- **함수 포인터로 호출** — 마찬가지
  ```cpp
  auto* f = &square;
  f(5);                 // f가 가리키는 함수를 컴파일 타임에 모름
  ```

가상 함수도 컴파일러가 **devirtualize**(타입을 알면 정적 호출로 변환)하면 인라인 가능. LTO나 final 키워드가 도움.

## 단점 1 — 코드 부피

```cpp
inline void process() { /* 100 줄 */ }

void caller1() { process(); }       // 100 줄 펼침
void caller2() { process(); }       // 또 100 줄
// ... 100 군데 호출 ...               // 10,000 줄
```

**작은 함수**(1-5 줄)만 인라인이 진짜 이득. 큰 함수는 코드 부피만 늘고 성능은 비슷하거나 더 나빠짐 (i-cache 압박).

규칙:
- ✅ getter/setter, 단순 연산자, trivial wrapper — 인라인 OK
- ❌ 100 줄짜리 알고리즘, 큰 분기 — 인라인 안 좋음

## 단점 2 — 디버깅

```cpp
inline int square(int n) { return n * n; }

int main() {
    int x = square(5);     // 디버거에서 square에 break 어떻게 거나?
}
```

인라인된 함수는 **호출 자체가 사라짐** — 디버거가 break를 걸 함수가 없음. 디버그 빌드에선 컴파일러가 인라인 안 하는 경우가 많아 문제 적음, 그러나 release 빌드 디버깅은 어려움.

## 단점 3 — 라이브러리 호환성 (ABI)

```cpp
// header.h (라이브러리 인터페이스)
inline int compute() { return 42; }
```

라이브러리 사용자는 `compute`의 본문을 자신의 코드에 인라인. 라이브러리 버전이 올라가 `compute`의 본문이 바뀌면:
- **사용자도 다시 컴파일해야 함** — 옛 본문이 박혀 있으므로
- 단순 리링크로 해결 안 됨

비-inline 함수라면 — 라이브러리만 교체 + 재링크하면 끝. **라이브러리 인터페이스에 inline 키워드는 ABI 안정성에 부정적**.

## 단점 4 — 컴파일 시간

```cpp
// header.h
inline void bigFunction() { /* 100줄 */ }

// 모든 .cpp가 이 헤더를 include하면 — 매번 100줄을 다시 파싱
```

헤더에 본문이 있으면 — include하는 모든 TU가 같은 코드를 재컴파일. 컴파일 타임 ↑.

## 80/20 원칙

대부분 함수는 **인라인이 의미가 없음**:
- 호출 비용이 함수 본문 비용에 비해 무시할 만 (큰 함수)
- 컴파일러가 알아서 인라인 결정 (LTO, PGO)

**핫 패스**(전체 시간의 80%를 차지하는 20%의 함수)만 인라인이 진짜 이득. 그런 함수도 보통 컴파일러가 자동으로 인라인.

## C++17 `inline` 변수

C++17부터 `inline`은 변수에도 적용 가능 — 헤더에 정의된 변수의 ODR 문제 해결.

```cpp
// header.h — C++17+
inline constexpr double Pi = 3.14159265358979;
inline int globalCounter = 0;     // 모든 TU에 같은 정의 — ODR 위반 없음
```

C++17 이전엔 헤더에 정의된 비-const 변수는 `extern` + 별도 .cpp 정의 필요. inline으로 해결.

## inline의 적절한 사용

다음은 인라인이 좋은 케이스:

```cpp
class Point {
    int x_, y_;
public:
    int x() const { return x_; }              // 1줄 — 자연스럽게 인라인
    int y() const { return y_; }
    void setX(int x) { x_ = x; }
    void setY(int y) { y_ = y; }
};

template<typename T>
inline const T& max(const T& a, const T& b) {     // 작은 알고리즘
    return a > b ? a : b;
}
```

일반적으로:
- **1-3줄 본문**
- **호출 비용이 본문 비용보다 큼**
- **헤더에 두기 위해 ODR 면제 필요**

## 모던 변형 — `__attribute__((always_inline))` / `[[gnu::always_inline]]`

```cpp
[[gnu::always_inline]] inline int hot() { /* ... */ }    // GCC/Clang 강제
__forceinline int hot() { /* ... */ }                     // MSVC
```

컴파일러가 거부하지 않도록 **강제** 인라인 (단, 컴파일러는 여전히 일부 케이스 거부 가능 — virtual, 재귀 등).

표준이 아닌 컴파일러 확장. **정말 hot path에만**, 측정 후.

## 모던 변형 — LTO (Link-Time Optimization)

```bash
g++ -O2 -flto src1.cpp src2.cpp -o app
```

LTO는 **링크 시점에 전체 프로그램을 다시 본 후 최적화** — 별도 TU의 함수 호출도 인라인 가능. 이 시대엔 `inline` 키워드의 (1) 효과가 약해짐 — 컴파일러가 자동 결정.

`inline` 키워드는 주로 **ODR 면제**((2) 효과) 목적으로 사용.

## 흔한 함정 — 헤더 분리 시 인라인 잊기

```cpp
// widget.h
class Widget {
public:
    int getX() const;     // 선언
};

// widget_impl.h
int Widget::getX() const { return x_; }      // ❌ inline 빠짐 — multiple def 링크 에러
```

헤더에 본문을 두려면 `inline` 명시:

```cpp
// widget_impl.h
inline int Widget::getX() const { return x_; }
```

또는 클래스 본문 안에 직접 작성 (암묵 inline).

## 실무 가이드 — 결정

```
함수를 inline으로 둘까?
├── 1-3줄짜리 getter/setter/단순 연산 → inline OK (자연스러움)
├── 큰 함수 → inline 안 함
├── virtual 함수 → 어차피 일반 호출, inline 의미 약함
├── 라이브러리 인터페이스 → 신중 (ABI 영향)
└── hot path 측정 후 → 가능하면 inline
```

## 실무 가이드 — 체크리스트

- [ ] inline 키워드 남발하지 않는가?
- [ ] 1-3줄 함수만 inline?
- [ ] virtual 함수에 inline 붙이지 않는가? (의미 약함)
- [ ] 라이브러리 인터페이스에 inline은 ABI 영향 검토?
- [ ] LTO 사용 중인가? — inline의 가치 재평가
- [ ] C++17 inline variable로 헤더 상수 정리?

## 핵심 정리

1. `inline`은 **요청, 보장 X** — 컴파일러가 최종 결정
2. **두 효과**: (1) 호출 지점 펼치기 (2) ODR 면제 — 헤더 정의를 위해
3. **작은 함수만** inline 의미 — 큰 함수는 코드 부피 손해
4. **라이브러리 인터페이스에 inline은 ABI 안정성 손실** — 신중
5. 모던 컴파일러 + **LTO**가 대부분 결정 — 무지성 inline 키워드 피하기
6. C++17 **inline variable**로 헤더의 상수 ODR 안전

## 관련 항목

- [항목 2: #define보다 const/enum/inline](/blog/programming/cpp/effective-cpp/item02-prefer-consts-enums-and-inlines-to-defines) — inline 함수 템플릿 사용
- [항목 31: 컴파일 의존성 최소화](/blog/programming/cpp/effective-cpp/item31-minimize-compilation-dependencies-between-files) — inline의 헤더 의존성 영향
- [항목 35: 가상 함수의 대안](/blog/programming/cpp/effective-cpp/item35-consider-alternatives-to-virtual-functions) — 인라인 친화적 다형성
