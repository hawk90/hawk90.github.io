---
title: "항목 53: 컴파일러 경고를 진지하게 받아들여라"
date: 2025-02-09T10:00:00
description: "경고는 잠재 버그의 가장 저렴한 신호 — 권장 옵션, CI에서 -Werror, sanitizer 결합."
tags: [C++, Effective C++, Warnings]
series: "Effective C++"
seriesOrder: 53
---

## 개요

컴파일러 경고는 무시하기 쉬운 노이즈처럼 보이지만 — **잠재적 버그의 가장 저렴한 신호**입니다. 한 컴파일러에선 경고만 나는 코드가 다른 컴파일러에선 에러일 수도 있고, 진짜 버그를 숨기고 있을 수도 있습니다. 모던 C++ 개발은 **공격적 경고 옵션 + CI의 `-Werror` + sanitizer**의 결합으로 이루어집니다.

## 예제 — 가상 함수 가림 함정

```cpp
class B {
public:
    virtual void f() const;
};

class D : public B {
public:
    virtual void f();        // ⚠️ const 빠짐 — override 아님
};
```

`override` 키워드 없이 — 컴파일은 통과. 그러나 `B::f()`를 가렸을 뿐 진짜 override 아님. base 포인터로 호출 시 의도와 다른 결과.

GCC `-Woverloaded-virtual`:
```
warning: 'virtual void D::f()' hides 'virtual void B::f() const' [-Woverloaded-virtual]
```

이 경고를 무시하면 의도와 다른 함수가 호출되는 버그가 살아남음. **경고는 코드 리뷰가 못 잡는 미묘함을 잡아냅니다**.

## 권장 컴파일 옵션

### GCC / Clang

기본:
```
-Wall -Wextra -Wpedantic
```

`-Wall`은 이름과 달리 모든 경고가 아닌 **흔한 경고만**. 더 적극적:

```
-Wshadow                 # 변수 가림
-Wnon-virtual-dtor       # 다형성 base의 non-virtual dtor (항목 7)
-Wold-style-cast         # C-style cast (항목 27)
-Wcast-align             # 정렬 깨는 cast
-Woverloaded-virtual     # 가상 함수 가림
-Wconversion             # 암묵 변환 (narrowing 등)
-Wsign-conversion        # signed/unsigned 변환
-Wnull-dereference       # nullptr 역참조
-Wdouble-promotion       # float → double 암묵
-Wformat=2               # printf-like format 엄격 검사
-Wimplicit-fallthrough   # switch fallthrough
-Wmisleading-indentation # 들여쓰기 오해 (Goto fail 같은)
-Wduplicated-cond        # if-else의 중복 조건
-Wlogical-op             # &&와 &의 혼동
```

clang 추가:
```
-Weverything             # 정말 모든 경고 (대부분 noise — 선택적 비활성)
```

### MSVC

```
/W4                      # 4단계 (최고는 /Wall — 너무 시끄러움)
/permissive-             # 엄격한 표준 준수
/Zc:__cplusplus          # __cplusplus 매크로 정확히 (역사적 호환 X)
```

## 경고를 에러로 격상

```
-Werror                  # GCC/Clang
/WX                      # MSVC
```

**모든 경고가 빌드 실패**가 됨. 새 경고 도입 즉시 막힘.

CI에서 `-Werror` 사용 권장 — 개발자 로컬에선 옵션 (몇몇 임시 경고가 있을 수 있음).

특정 경고만 격상:

```
-Werror=non-virtual-dtor    # 이 경고만 에러로
-Wno-error=unused-parameter # 이 에러는 다시 경고로 (특정 파일 등에서)
```

## 경고 억제 — 최후의 수단

정말 의도된 코드라면 명시적으로 억제:

### `[[maybe_unused]]` (C++17)

```cpp
void f([[maybe_unused]] int x) { /* 사용 안 함 의도적 */ }

[[maybe_unused]] auto result = compute();    // 디버그 빌드 등에서 안 쓰일 수도
```

### `[[nodiscard]]`로 무시 차단 (반대 방향)

```cpp
[[nodiscard]] int compute();     // 반환값 무시 시 경고

compute();    // ⚠️ warning: ignoring return value
auto _ = compute();   // 의도적 — OK
```

### pragma diagnostic (컴파일러별)

```cpp
// GCC/Clang
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wshadow"
// 의도된 shadow 코드
#pragma GCC diagnostic pop

// MSVC
#pragma warning(push)
#pragma warning(disable: 4456)
// ...
#pragma warning(pop)
```

특정 코드 블록만 — **전체 파일이 아닌 좁은 범위**.

## sanitizer와의 결합

경고는 정적 — 런타임 버그까지 잡진 못함. **sanitizer**가 동적 검사:

```bash
# GCC/Clang sanitizer
-fsanitize=address       # 메모리 (use-after-free, out-of-bounds)
-fsanitize=undefined     # UB (signed overflow 등)
-fsanitize=thread        # data race
-fsanitize=memory        # uninitialized read (clang 전용)
```

```cpp
int main() {
    int* p = new int[10];
    p[10] = 1;        // out-of-bounds — ASan이 잡음
    delete[] p;
    p[0] = 1;         // use-after-free — ASan이 잡음
}
```

런타임 비용은 있지만 — 개발/테스트 빌드에 권장.

## 경고 처리 — 자세

```
경고가 떴다 → 이해 → 수정
```

1. **이해 우선** — 경고가 왜 나는지 파악
2. **수정 시도** — 가능하면 코드를 경고 없게
3. **억제는 최후** — 정말 의도된 코드라면 명시적으로

"경고 안 나오게 캐스트 추가" 같은 잘못된 수정은 — 원인을 묻고 있던 버그를 숨김.

## 컴파일러마다 다름

```cpp
int n = -1;
unsigned m = n;     // GCC -Wsign-conversion: warning
                    // Clang: 비슷한 경고
                    // MSVC: 다른 메시지
```

**여러 컴파일러로 빌드**해 polish하면 — 각자 다른 경고로 다른 버그 발견. CI 매트릭스에 여러 컴파일러 포함.

[godbolt.org](https://godbolt.org) — 다양한 컴파일러를 웹에서 즉시 테스트.

## clang-tidy / 정적 분석 도구

컴파일러 경고 + 추가 분석:

```bash
clang-tidy file.cpp \
    -checks='modernize-*,readability-*,bugprone-*' \
    -- -std=c++20
```

- **modernize-** — C++ 신기능 사용 권유
- **readability-** — 가독성 개선
- **bugprone-** — 흔한 버그 패턴
- **cert-** — CERT 보안 규칙

cppcheck, PVS-Studio 등 다른 분석기도.

## 흔한 경고들 — 의미

### Shadow

```cpp
int x = 5;
{
    int x = 10;     // ⚠️ shadow — 외부 x를 가림
}
```

종종 의도된 것 (작은 스코프). 그러나 큰 함수에선 혼란.

### Uninitialized

```cpp
int x;
if (cond) x = 5;
return x;           // ⚠️ cond false면 uninit
```

가장 흔하고 위험한 함정.

### Comparison signed/unsigned

```cpp
int      i = -1;
unsigned u = 1;
if (i < u) ...     // ⚠️ i가 unsigned로 변환 — 큰 양수가 됨
                    //    의도와 반대 결과
```

암묵 변환의 함정.

### Sign extension

```cpp
char  c = -1;        // 0xFF
unsigned u = c;       // 4294967295 (sign extension)
```

종종 의도되지 않은 값.

### Format mismatch

```cpp
printf("%d", 3.14);    // ⚠️ %d에 double — UB
```

`std::format`(C++20) 또는 `std::ostream`이 안전.

## CI 설정 — 권장

```yaml
# .github/workflows/build.yml 류
build:
  - cmd: g++ -std=c++20 -Wall -Wextra -Wpedantic -Werror src/*.cpp
  - cmd: clang++ -std=c++20 -Wall -Wextra -Wpedantic -Werror src/*.cpp
  - cmd: clang-tidy src/*.cpp -- -std=c++20
  - cmd: g++ -fsanitize=address src/*.cpp && ./a.out
  - cmd: g++ -fsanitize=undefined src/*.cpp && ./a.out
```

여러 컴파일러 + sanitizer + 정적 분석 — 모두 통과해야 머지.

## 흔한 함정 — `-Wno-` 남발

```cpp
// 빌드 시스템
-Wall -Wno-unused-parameter -Wno-shadow -Wno-conversion ...
```

경고를 끄면 — 그 영역의 모든 버그가 침묵. **특정 위치**에서 의도된 것만 좁게 억제.

## 모던 변형 — C++20 attribute

```cpp
[[nodiscard]] int compute();
[[deprecated("use foo() instead")]] void oldFoo();
[[maybe_unused]] auto result = ...;
[[fallthrough]];        // switch case에서
[[likely]] / [[unlikely]]    // 분기 예측 힌트
```

표준 attribute로 — 의도를 코드에 명시.

## 실무 가이드 — 체크리스트

- [ ] `-Wall -Wextra -Wpedantic` 최소?
- [ ] 추가 옵션 (`-Wshadow`, `-Wconversion` 등)?
- [ ] CI에 `-Werror`?
- [ ] sanitizer 빌드 (ASan, UBSan)?
- [ ] 여러 컴파일러로 빌드 (CI 매트릭스)?
- [ ] clang-tidy / 정적 분석?
- [ ] 의도된 경고만 좁게 억제?
- [ ] 새 코드는 경고 0 — "warning hygiene"?

## 핵심 정리

1. **경고는 잠재 버그의 단서** — 무시 금지
2. `-Wall -Wextra -Wpedantic` 기본, `-Wshadow`/`-Wconversion` 추가
3. CI에선 **`-Werror`** — 새 경고 도입 차단
4. **sanitizer**(ASan/UBSan/TSan)와 결합 — 런타임 검사
5. **여러 컴파일러**로 빌드 — 각자 다른 시야
6. clang-tidy 등 **정적 분석**으로 추가 검출
7. **억제는 최후** — 의도된 곳만 좁게

## 관련 항목

- [항목 7: 다형성 base에 virtual 소멸자](/blog/programming/effective-cpp/item07-declare-destructors-virtual-in-polymorphic-base-classes) — `-Wnon-virtual-dtor`
- [항목 27: 캐스팅 최소화](/blog/programming/effective-cpp/item27-minimize-casting) — `-Wold-style-cast`
- [항목 36: non-virtual 재정의 금지](/blog/programming/effective-cpp/item36-never-redefine-an-inherited-non-virtual-function) — `-Wsuggest-override`
