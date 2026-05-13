---
title: "항목 16: new와 delete는 같은 형태를 사용하라"
date: 2025-02-03T13:00:00
description: "new ↔ delete, new[] ↔ delete[] — 짝이 맞지 않으면 UB. typedef 함정과 컨테이너로 회피."
tags: [C++, Effective C++, Memory Management]
series: "Effective C++"
seriesOrder: 16
---

## 왜 이 항목이 중요한가?

`new int`와 `new int[10]`은 비슷해 보이지만 **내부 메모리 레이아웃이 다르다**. 그래서 해제도 짝이 맞아야 한다. `new` → `delete`, `new[]` → `delete[]`다.

짝을 잘못 맞추면 UB가 즉시 일어난다. `delete`는 객체 하나의 소멸자만 부르고, `delete[]`는 배열 헤더에서 개수를 읽어 N번 호출한다. 잘못 짝지으면 메모리 해석 자체가 어긋난다.

이게 raw `new`/`delete`를 직접 다루는 자리에서 자주 일어나는 사고다. typedef로 배열 타입을 감추거나, 베이스 포인터에 다형성 객체를 `delete[]`하면 깨진다.

C++11+의 답은 명확하다. **raw `new`/`delete`를 직접 쓰지 마라**. `std::vector`, `std::array`, `std::unique_ptr<T[]>`이 짝을 자동으로 관리한다.

## 개요

`new`와 `new[]`는 서로 다른 함수이며, 만들어진 메모리의 **레이아웃과 소멸 방식**도 다르다. 짝이 안 맞는 `delete`/`delete[]`는 즉시 UB다. 한쪽은 객체 하나의 소멸자만 부르고, 다른 쪽은 배열 헤더에서 개수를 읽어 N번의 소멸자를 호출한다. 잘못 짝지으면 **메모리 해석 자체가 어긋난다**.

C++11+ 에선 **raw `new`/`delete`를 피하는 것**이 가장 안전하다. `std::vector`, `std::array`, `std::unique_ptr` 등이 정확한 짝을 자동으로 관리한다.

## 메모리 레이아웃의 차이

```cpp
int* single = new int(42);       // 그냥 int 하나
int* arr    = new int[10];       // int 10개 + 메타데이터(개수)
```

배열 `new[]`는 보통 메모리 앞에 **요소 개수**를 저장:

```
new int[10]:
┌─────┬─────┬─────┬─────┬─────┬─────────────────┐
│  N  │ [0] │ [1] │ [2] │ ... │ [9]             │
└─────┴─────┴─────┴─────┴─────┴─────────────────┘
  ↑          ↑
  메타       반환된 포인터 (사용자가 받음)
```

`delete[]`는 포인터 앞의 메타에서 N을 읽어 각 요소의 소멸자를 N번 호출. `delete`는 그런 메타가 없다고 가정 — 잘못된 짝지으면 잘못된 메모리 영역을 해석합니다.

## 잘못 짝지으면 무엇이 일어나나

```cpp
int* arr = new int[10];
delete arr;          // ⚠️ UB
                     //    1) arr를 단일 객체로 가정 → 메타데이터 무시
                     //    2) 일부 구현에선 잘못된 메모리 영역에 free 호출
```

```cpp
int* single = new int(42);
delete[] single;     // ⚠️ UB
                     //    1) single 앞에서 "개수"를 읽으려 함 — garbage
                     //    2) garbage 횟수만큼 소멸자 호출 → crash
```

`int` 같은 trivially destructible 타입에선 일부 구현이 **운 좋게** 동작할 수 있음 — 그러나 표준상 UB이고 클래스 타입이면 즉시 segfault.

```cpp
struct Resource { ~Resource() { /* 정리 */ } };

Resource* arr = new Resource[10];
delete arr;          // ⚠️ Resource::~Resource가 1번만 호출됨 → 9개 누수
delete[] arr;        // ✅ 10번 호출 (역순)
```

## typedef 함정

가장 발견하기 어려운 형태 — 타입 이름이 배열인지 안 드러남.

```cpp
typedef std::string AddressLines[4];   // AddressLines == std::string[4]

std::string* p = new AddressLines;     // 사실은 new std::string[4]
delete p;                               // ⚠️ UB — delete[] 필요했지만 단서 없음
delete[] p;                             // ✅
```

호출자는 `new AddressLines`만 보고 — "단일 객체겠지" 추측하기 쉽습니다. typedef가 배열을 감춰서 문법이 매칭을 깨트림.

**규칙**: 배열 typedef를 피하라. 사용해야 한다면 정의 위치에 큰 주석으로 "**이 타입은 배열이므로 `delete[]` 필요**" 명시.

더 나은 대안:

```cpp
using AddressLines = std::array<std::string, 4>;    // 컨테이너
// 또는
using AddressLines = std::vector<std::string>;      // 동적 크기
```

## 클래스 변환 시 — 멤버가 배열을 가리키면

```cpp
class StringTable {
    std::string* lines;        // 배열을 가리킴
public:
    StringTable() : lines(new std::string[10]) {}
    ~StringTable() { delete lines; }     // ⚠️ delete[] 필요!
};
```

생성자에서 `new[]`로 할당했으니 소멸자는 `delete[]`. 손쉽게 잘못 적기 쉬운 패턴 — `new`/`delete`의 단수/복수 짝을 매번 확인.

## 모던 회피 — 컨테이너와 unique_ptr

```cpp
class StringTable {
    std::vector<std::string> lines;     // 자동 관리
public:
    StringTable() : lines(10) {}        // 10개 string
    // 소멸자 자동 — vector가 모든 string 정리
};
```

`vector`는 내부적으로 `new[]`/`delete[]`를 정확히 짝지어 사용 — 사용자가 신경 쓸 필요 없음.

배열이 정말 필요하면 `unique_ptr<T[]>`:

```cpp
auto arr = std::make_unique<std::string[]>(10);   // C++14
arr[3] = "hello";
// 소멸 시 자동으로 delete[] 호출
```

`unique_ptr<T[]>`는 `T*`가 아닌 별도 부분 특수화 — 첨자 접근 `arr[i]` 지원, `delete[]` 자동.

## 흔한 함정 — placement new와 짝짓기

```cpp
void* buffer = std::malloc(sizeof(Widget));
Widget* p = new (buffer) Widget;     // placement new — 메모리 재사용

delete p;                             // ⚠️ UB
                                      //    placement new에 짝지어진 delete가 아님
```

placement new로 만든 객체는 `delete`로 해제하면 안 됨 — 메모리는 malloc으로 얻었으니 free로. 명시적 소멸자 호출 + free:

```cpp
p->~Widget();              // 소멸자 명시 호출
std::free(buffer);          // 메모리 해제
```

이는 raw 메모리 풀, 사용자 정의 할당기에서 등장 — 일반 코드에선 거의 안 만남.

## C 호환 — malloc과 new 섞지 말 것

```cpp
Widget* p = (Widget*)std::malloc(sizeof(Widget));   // ⚠️ 생성자 안 부름
delete p;                                            // ⚠️ free 짝 — 깨짐

Widget* q = new Widget;
std::free(q);                                        // ⚠️ delete 짝 — 깨짐
```

C++의 `new`/`delete`는 C의 `malloc`/`free`와 호환되지 않습니다. 짝을 정확히 맞춰야 함.

## 실무 가이드 — 체크리스트

코드를 작성/리뷰할 때:

- [ ] `new` ↔ `delete`, `new[]` ↔ `delete[]` 일대일 매칭?
- [ ] 배열 typedef 사용하고 있는가? → 가능하면 제거
- [ ] 멤버가 배열을 가리키면 소멸자에서 `delete[]`?
- [ ] **가능하면 raw `new`/`delete` 회피** — `vector`, `array`, `unique_ptr<T[]>`
- [ ] `malloc`/`free`와 섞지 않는가?

## 핵심 정리

1. `new` ↔ `delete`, `new[]` ↔ `delete[]` **일대일** 짝
2. 섞으면 **즉시 UB** — 메모리 해석 자체가 다름
3. **배열 typedef 피하기** — 짝이 코드에 드러나지 않음
4. C++11+ 권장: **raw new/delete 안 쓰기** — 컨테이너와 스마트 포인터로
5. `unique_ptr<T[]>` — 배열 소유에 대응
6. `malloc`/`free`와 `new`/`delete` 섞지 말 것

## 관련 항목

- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — raw new/delete 회피의 기본
- [항목 17: new로 만든 객체는 스마트 포인터에](/blog/programming/cpp/effective-cpp/item17-store-newed-objects-in-smart-pointers-in-standalone-statements) — 짝 맞추기를 라이브러리에 위임
- [항목 51: new와 delete 작성 시 규약](/blog/programming/cpp/effective-cpp/item51-adhere-to-convention-when-writing-new-and-delete) — 사용자 정의 할당
