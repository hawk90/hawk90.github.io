---
title: "항목 15: memset과 memcpy 대신 생성자와 할당 연산자를 사용하라"
date: 2026-05-09T14:00:00
description: "객체에 바이트 단위 연산을 적용하면 즉시 UB — vtable·string·vector 박살. C++ 객체 모델 존중."
tags: [C++, Constructor, Undefined Behavior]
series: "Beautiful C++"
seriesOrder: 15
draft: false
---

## 왜 이 항목이 중요한가?

C에서 옮겨온 C++ 개발자가 가장 자주 양산하는 UB 한 가지:

```cpp
MyClass obj;
std::memset(&obj, 0, sizeof(obj));     // "객체 0 초기화"
```

C에선 `memset(&struct, 0, sizeof(struct))`가 정직했다 — POD 구조체에 그냥 0 비트 패턴 적용. C++ 객체는 다르다. `std::string`, `std::vector`, virtual 함수, 가상 베이스 — 이 모든 게 **객체 내부에 비트 단위로 의미 있는 데이터**를 갖는다. `memset`으로 0을 칠하면 그 데이터가 박살 — **즉시 UB**.

C++ 객체는 **생성자가 만들고 소멸자가 끝낸다**. 그 사이를 우회하는 어떤 비트 연산도 위험.

## 핵심 내용

- `memset`/`memcpy`는 **바이트 단위 복사**일 뿐 — 타입의 의미를 무시
- vtable 포인터, 가상 베이스, `std::string`·`std::vector` 같은 타입을 `memset`으로 0 초기화하면 **즉시 UB**
- 생성자/대입 연산자는 **불변식·소유권·자원 관리**를 책임진다
- `memset`은 진짜 trivially copyable한 POD에만, 그것도 의식적으로 사용하라

## 비교 — bytewise 연산 vs 생성자

### Bad: memset으로 0 초기화

```cpp
class Widget {
    std::string name_;
    std::vector<int> data_;
    int count_ = 0;
};

Widget w;
std::memset(&w, 0, sizeof(w));     // ⚠️ UB!
```

무엇이 깨지나:
- `name_` (std::string): 내부 포인터, 크기, 용량 모두 0으로. SSO(Small String Optimization)면 buffer 0, 아니면 heap 포인터 0
- `~Widget()` 호출 시 `~string()`이 그 0을 정상 string으로 가정 → 잘못된 free 또는 crash

C++03 시절엔 종종 동작했지만 — 표준상 UB이고 모던 라이브러리는 즉시 깨짐.

### Bad: memcpy로 객체 복사

```cpp
Widget src, dst;
std::memcpy(&dst, &src, sizeof(Widget));     // ⚠️ UB
```

`src`와 `dst`가 같은 string buffer 가리킴 → 둘 다 소멸자에서 free → **double free** → crash.

```cpp
// 또 다른 UB
Widget* arr = static_cast<Widget*>(std::malloc(10 * sizeof(Widget)));
// 생성자 호출 안 함 — 객체가 초기화 안 됨
arr[0].name_ = "hello";    // 잘못된 string 객체에 대입 — UB
```

### Good: 생성자 / 대입 연산자

```cpp
Widget w{};                       // 값 초기화 — 각 멤버의 default ctor 호출
Widget dst = src;                 // 복사 생성자 — string/vector 깊은 복사
dst = src;                        // 복사 대입 — string/vector 정리 후 복사
Widget moved = std::move(src);    // 이동 생성자 — 포인터 transfer

std::vector<Widget> arr(10);      // 각 요소에 생성자 호출
```

C++이 제공하는 도구로 — 자원 관리, 깊은 복사, 라이프사이클 모두 자동.

## 무엇이 trivially copyable인가

`std::is_trivially_copyable<T>::value` — `T`가 `memcpy`로 안전한지 확인.

조건:
- 모든 복사/이동 생성자, 대입 연산자가 trivial
- 소멸자가 trivial
- 가상 함수 X, 가상 베이스 X

```cpp
struct Point { int x, y; };
static_assert(std::is_trivially_copyable_v<Point>);     // true

struct Widget { std::string name; };
static_assert(!std::is_trivially_copyable_v<Widget>);   // false
```

trivially copyable이면 `memcpy` 사용 OK. 표준 라이브러리도 내부적으로 trivial 타입에 `memcpy` 최적화.

```cpp
Point p1{1, 2};
Point p2;
std::memcpy(&p2, &p1, sizeof(Point));     // OK — trivially copyable
```

## 함정 — 가상 함수가 있으면 vtable

```cpp
class Base {
public:
    virtual void f() {}
};

class Derived : public Base {
    int data_ = 0;
};

Derived d;
std::memset(&d, 0, sizeof(d));     // ⚠️ vtable 포인터 0으로
d.f();                              // crash — nullptr->f() 호출
```

vtable 포인터는 **객체의 첫 8 byte**에 보통 위치. `memset 0`은 그것을 nullptr로 만들어 virtual dispatch 깨뜨림.

## 함정 — 부모-자식 부분만 memcpy

```cpp
class Base { /* ... */ };
class Derived : public Base { /* ... */ };

Derived src, dst;
std::memcpy(&dst, &src, sizeof(Base));     // Base 부분만 복사
                                            // → dst의 Derived 부분은 변경 없음
                                            // → vtable/멤버 불일치
```

다중 상속에서 더 복잡한 메모리 레이아웃 — bytewise 연산이 의도와 다르게 동작.

## 함정 — placement new 후 비트 연산

```cpp
alignas(Widget) char buf[sizeof(Widget)];
new (buf) Widget;                              // placement new
std::memset(buf, 0, sizeof(Widget));            // ⚠️ 객체 박살
reinterpret_cast<Widget*>(buf)->~Widget();     // crash
```

placement new로 만든 객체도 — 살아 있는 동안 비트 연산 금지.

## 정당한 memset / memcpy 사용

### 1) C-호환 POD 초기화

```cpp
struct CHeader {
    uint32_t magic;
    uint32_t version;
    uint32_t flags;
    uint8_t  reserved[16];
};

CHeader hdr;
std::memset(&hdr, 0, sizeof(hdr));     // OK — trivially copyable
```

C API에 넘기기 전 buffer 초기화 — 표준 idiom.

### 2) 큰 trivial 배열

```cpp
int arr[1024];
std::memset(arr, 0, sizeof(arr));     // OK — int는 trivial
```

대량의 정수/바이트 초기화 — 컴파일러가 어차피 `memset`으로 최적화하지만 명시도 OK.

### 3) 직렬화 / 네트워크

```cpp
struct Packet {
    uint16_t header;
    uint32_t payload_size;
    uint8_t  payload[1024];
};

void send(const Packet& p) {
    socket.write(reinterpret_cast<const char*>(&p), sizeof(p));     // OK — POD
}
```

POD를 바이트 스트림으로 — 단, **endianness 주의**, padding 주의.

## 모던 대안 — std::ranges::fill, std::fill

```cpp
std::array<int, 1024> arr;
std::ranges::fill(arr, 0);             // C++20, type-safe
```

타입 안전, 동일 성능 (`memset`으로 컴파일).

## 모던 대안 — `{}` 값 초기화

```cpp
struct Settings {
    int a, b, c;
    char name[64];
};

Settings s{};       // ✅ 모든 멤버 0 또는 default 초기화
                    // memset 불필요
```

C++11+ `{}` brace init이 — 가장 안전하고 명확한 0 초기화 방법.

## 함정 — alignment

```cpp
// ⚠️ alignment 무시
char buf[sizeof(Widget)];
auto* w = reinterpret_cast<Widget*>(buf);
w->name_ = "hello";        // alignment 안 맞을 가능성 → UB
```

해결:

```cpp
alignas(Widget) char buf[sizeof(Widget)];
new (buf) Widget;          // placement new
```

또는 더 모던:

```cpp
std::aligned_storage_t<sizeof(Widget), alignof(Widget)> storage;
new (&storage) Widget;
```

C++23부터 `std::aligned_storage`는 deprecated — `alignas` + 직접 메모리.

## 진짜 trivial인지 확인 — static_assert

```cpp
template<typename T>
void serialize(const T& obj, std::ofstream& out) {
    static_assert(std::is_trivially_copyable_v<T>,
                  "T must be trivially copyable for bitwise serialization");
    out.write(reinterpret_cast<const char*>(&obj), sizeof(obj));
}
```

타입 안전성 — 컴파일러가 잘못된 사용 차단.

## 표준 라이브러리의 internal 최적화

```cpp
std::vector<int> a(10000, 0);
std::vector<int> b(a);     // 내부적으로 memcpy 사용 (int는 trivial)
```

표준 라이브러리는 trivial 타입 감지해서 `memcpy`로 최적화. 사용자가 직접 부를 필요 없음.

## 모던 변형 — `std::bit_cast` (C++20)

```cpp
float f = 3.14f;
uint32_t bits = std::bit_cast<uint32_t>(f);     // 비트 재해석, 타입 안전
```

`memcpy`의 의도(비트 재해석)를 타입 안전하게. trivially copyable 검증 + 크기 일치.

## 실무 가이드 — 결정 트리

```
객체 초기화/복사가 필요한가?
├── 평범한 클래스 → 생성자 / 복사 / 이동
├── 값 초기화 → {} brace init
├── 진짜 POD (정수/바이트 배열, C struct) → memset/memcpy 또는 std::fill
├── 비트 재해석 → std::bit_cast (C++20)
└── C API 호환 → memset 후 reinterpret_cast (POD만)
```

## 실무 가이드 — 체크리스트

- [ ] `memset(&obj, 0, sizeof(obj))` 패턴 사용 X (C++ 객체에)
- [ ] `memcpy`로 객체 복사 X (복사 생성자 사용)
- [ ] POD인지 `is_trivially_copyable_v` 확인?
- [ ] `static_assert`로 컴파일 타임 검증?
- [ ] `alignas`로 alignment 보장?
- [ ] C++11+ `{}` brace init 우선?
- [ ] C++20 `std::bit_cast`로 비트 재해석?

## 정리

C++ 객체는 **생성자가 만들고 소멸자가 끝낸다**. 바이트 복사는 생명주기를 우회하므로, 진짜 POD가 아니라면 절대 쓰지 마라.

규칙:
- **생성자 / `= default` / `{}`** — C++ 객체 초기화의 표준
- **복사·이동 연산자** — 객체 복사
- **`memset`/`memcpy`** — POD only, 의식적으로

## 관련 항목

- [항목 3: 기본 멤버 초기화자](/blog/programming/beautiful-cpp/item03-use-default-member-initializers) — 모던 초기화
- [항목 7: 지저분한 struct 캡슐화](/blog/programming/beautiful-cpp/item07-encapsulate-messy-structs) — C API 경계
- [항목 28: 사용 전 초기화](/blog/programming/beautiful-cpp/item28-dont-declare-before-init) — 초기화 일반 원칙
