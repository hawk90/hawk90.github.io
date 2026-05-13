---
title: "항목 8: 함수의 인자를 적게 유지하라"
date: 2026-05-08T17:00:00
description: "긴 인자 목록의 함정 — 무음 버그, 변경 부담, 책임 비대. 구조체와 designated init으로 묶기."
tags: [C++, API Design, Function Design]
series: "Beautiful C++"
seriesOrder: 8
draft: true
---

## 왜 이 항목이 중요한가?

함수 시그니처를 본 사용자의 첫 질문은 — "**이 함수 어떻게 부르지?**" 인자 두세 개라면 함수 이름과 매개변수 이름만으로 답이 나온다. 일곱 개라면 — 문서를 펴거나 인자 순서 외우기 시작.

같은 타입(`int, int, int, int, bool, bool, bool`)이 연달아 있으면 **무음 버그**의 온상이다. 컴파일러는 인자 순서를 검증할 방법이 없고, 함수가 의도와 다른 값을 받아 조용히 잘못 동작한다. 이 항목은 그 함정과, **의미 단위로 묶기**의 패턴을 다룬다.

## 핵심 내용

- 인자가 많을수록 호출자는 **순서·의미·기본값**을 모두 외워야 한다
- 같은 타입의 인자가 연달아 있으면 **무음 버그**(인자 순서 실수)의 온상
- 인자 묶음이 의미적으로 한 덩어리라면 **구조체로 묶어라**
- **인자 4~5개를 넘기 시작하면** 함수 책임이 너무 큰 것은 아닌지 의심

## 비교 — 긴 인자 vs 의미 단위 묶음

### Bad: 의미가 비슷한 인자가 너무 많다

```cpp
Rectangle make_rect(int x, int y, int w, int h, int margin, int border, bool round);

auto r = make_rect(10, 20, 100, 200, 4, 2, true);     // 각 숫자가 뭐였지?
```

문제:
- `10, 20`이 `x, y`인지 `w, h`인지 호출 지점에선 보이지 않음
- `4, 2`가 margin과 border 어느 쪽?
- `true`가 round? frame? center?

### Good: 묶음을 구조체로

```cpp
struct Rect {
    int x, y, w, h;
};

struct Style {
    int  margin   = 0;
    int  border   = 0;
    bool rounded  = false;
};

Rectangle make_rect(Rect bounds, Style style = {});

auto r = make_rect({10, 20, 100, 200},
                   {.margin = 4, .border = 2, .rounded = true});    // C++20
```

각 인자가 의미 단위 — Rect는 위치+크기, Style은 외관. **designated initializer**(C++20)로 호출 지점에서 매개변수 이름이 보임.

## 인자 묶음의 도메인 의미

```cpp
// 분산된 인자
void drawLine(int x1, int y1, int x2, int y2, int r, int g, int b, int width);

// 묶음으로 — 도메인 의미가 드러남
struct Point { int x; int y; };
struct Color { int r; int g; int b; };

void drawLine(Point start, Point end, Color color, int width);

drawLine({10, 20}, {100, 200}, {255, 128, 0}, 2);
```

호출 지점에서:
- `{10, 20}` — 시작점이라는 게 명확
- `{255, 128, 0}` — 색상이라는 게 명확

`Point`, `Color` 같은 작은 타입은 비용 0(레지스터에 들어감) — 두려워 말 것.

## 같은 타입 연속 — 가장 위험

```cpp
void copyRegion(int srcX, int srcY, int srcW, int srcH,
                int dstX, int dstY, int dstW, int dstH);

copyRegion(0, 0, 100, 100, 50, 50, 100, 100);
copyRegion(50, 50, 100, 100, 0, 0, 100, 100);     // src와 dst 헷갈리면?
```

순서 실수해도 컴파일러 검출 불가. **타입을 분리**하면:

```cpp
struct Region { int x, y, w, h; };

void copyRegion(Region src, Region dst);

copyRegion(Region{0, 0, 100, 100}, Region{50, 50, 100, 100});
```

또는 더 강한 타입:

```cpp
struct SourceRegion : Region {};
struct DestRegion   : Region {};

void copyRegion(SourceRegion src, DestRegion dst);

copyRegion(SourceRegion{0, 0, 100, 100}, DestRegion{50, 50, 100, 100});
```

이제 컴파일러가 순서 잘못을 잡음.

## boolean 매개변수 함정

```cpp
void save(const std::string& path, bool compress, bool overwrite, bool log);

save("data.bin", true, false, true);     // ⚠️ 무엇이 무엇?
```

해결 — strong enum:

```cpp
enum class Compression { Off, On };
enum class Overwrite   { Forbid, Allow };
enum class Logging     { Off, On };

void save(const std::string& path,
          Compression compress, Overwrite overwrite, Logging log);

save("data.bin", Compression::On, Overwrite::Forbid, Logging::On);     // 명확
```

`enum class`는 강 타입 — 순서 바뀌면 컴파일 에러. 항목 20에서도 다룸.

## 책임 분리 신호

인자 4~5개 넘기 시작하면 — **함수가 너무 많은 일을 하는** 신호.

```cpp
// Bad: 한 함수가 모든 일
void processOrder(const Customer& customer,
                  const std::vector<Item>& items,
                  const Address& shipTo,
                  const Address& billTo,
                  PaymentMethod payment,
                  Promotion promo,
                  ShippingSpeed shipping);
```

분리 — 도메인 객체로:

```cpp
struct Order {
    Customer customer;
    std::vector<Item> items;
    Address shipTo;
    Address billTo;
    PaymentMethod payment;
    Promotion promo;
    ShippingSpeed shipping;
};

void processOrder(const Order& order);
```

또는 단계별 분리:

```cpp
class OrderProcessor {
public:
    void validate(const Order& order);
    void charge(const Customer& customer, PaymentMethod payment);
    void ship(const std::vector<Item>& items, const Address& to, ShippingSpeed speed);
};
```

## C++20 designated initializers — 인자 묶기의 모던 sugar

```cpp
struct WindowOptions {
    int          width    = 800;
    int          height   = 600;
    bool         fullscreen = false;
    std::string  title    = "Untitled";
    bool         vsync    = true;
};

Window createWindow(const WindowOptions& opts = {});

// 호출 — 필요한 것만 명시
auto w1 = createWindow();
auto w2 = createWindow({.width = 1920, .height = 1080, .fullscreen = true});
auto w3 = createWindow({.title = "My App", .vsync = false});
```

builder 패턴 없이도 — 명명 인자 + 기본값 + 부분 명시 모두 가능.

**제약**: designated init은 **선언 순서 그대로** 적어야 함. `{.height = 1080, .width = 1920}`은 컴파일 에러.

## 함정 — 너무 작은 단위로 묶음

```cpp
struct X { int value; };
struct Y { int value; };

void f(X x, Y y);     // ⚠️ 의미적 묶음이 아닌 단순 wrapping
```

타입을 만들 만큼의 도메인 의미가 없으면 — 그냥 인자. 묶음이 의미를 강화해야 함.

기준: **"두 값이 같은 객체의 일부인가?"** 답이 yes면 묶음, no면 분리.

```cpp
draw(Point{10, 20}, Color{255, 0, 0}, 2);     // Point는 같은 객체, Color도, width는 별도
```

## 표준 라이브러리 사례

```cpp
// 묶기 잘된 예
std::sort(v.begin(), v.end(), comparator);          // 3 인자
std::transform(in.begin(), in.end(), out.begin(), f);    // 4 인자

// vs std::filesystem::copy_options (flag 묶음)
std::filesystem::copy(from, to, std::filesystem::copy_options::recursive | ...);
```

표준은 보통 3-5 인자. 그 이상이면 옵션 구조체 패턴.

## 모던 변형 — 빌더 패턴

긴 인자 + 부분 명시가 흔하면 빌더:

```cpp
auto img = ImageBuilder{}
    .width(800)
    .height(600)
    .format("png")
    .quality(90)
    .build();
```

C++20 designated init이 도입된 후엔 빌더의 가치가 줄었지만 — 검증·계산이 필요한 경우엔 여전히 유효.

## 함정 — 너무 많은 기본값

```cpp
void process(int a, int b = 0, int c = 0, bool d = false, bool e = true);
```

기본값이 많을수록 — 호출 지점이 다양해지고 의도가 불명확. 인자가 정말 그렇게 많이 필요한지 재검토.

## 실무 가이드 — 결정 트리

```
함수 인자가 몇 개인가?
├── 1-3 → OK, 그대로
├── 4-5 → 같은 타입 연속 있으면 강 타입 또는 묶음
├── 6+ → 도메인 객체 / 옵션 구조체로 묶음
└── 매우 많음 → 함수 자체를 분리
```

```
인자들이 의미적으로 함께 다니나?
├── 그렇다 → 구조체로
├── 아니다 → 그대로
└── 일부만 → 그것만 묶음
```

## 실무 가이드 — 체크리스트

- [ ] 인자가 4-5개를 넘는가?
- [ ] 같은 타입(int, bool)이 연속으로 있는가? → 강 타입/묶음
- [ ] boolean 여러 개 → enum class
- [ ] 의미적 묶음이 있는가? → struct
- [ ] C++20 사용 가능? → designated init으로 명명 인자 효과
- [ ] 함수 책임이 너무 크지 않은가?

## 정리

인자는 **의미적 단위로 묶고**, 자주 같이 다니는 데이터는 타입을 만들어 주어라. 호출부의 가독성이 함수 시그니처의 품질을 결정한다.

도구 순서:
1. **타입 분리** — 같은 타입 연속을 강 타입으로
2. **enum class** — bool 매개변수 명확화
3. **구조체 묶음** — 의미적 함께 다니는 값
4. **designated init** (C++20) — 명명 인자 효과
5. **함수 분리** — 책임이 너무 크면 쪼개기

## 관련 항목

- [항목 19: 다중 반환은 struct로](/blog/programming/cpp/beautiful-cpp/item19-return-struct-for-multiple-outputs) — 반환에도 같은 원리
- [항목 20: enum class 선호](/blog/programming/cpp/beautiful-cpp/item20-prefer-enum-class) — bool 매개변수 대체
- [항목 25: 정적 타입 안전성](/blog/programming/cpp/beautiful-cpp/item25-static-type-safety) — 강 타입 패턴
