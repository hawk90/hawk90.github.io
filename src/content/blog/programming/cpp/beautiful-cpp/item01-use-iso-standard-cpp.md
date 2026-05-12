---
title: "항목 1: ISO 표준 C++로 작성하라"
date: 2026-05-08T10:00:00
description: "플랫폼·컴파일러 종속성을 피하고 이식성 있는 코드를 작성하는 방법"
tags: [C++, Portability, Standards]
series: "Beautiful C++"
seriesOrder: 1
draft: false
---


## 이식성(Portability)이 왜 중요한가?

**실제 사례: "내 컴퓨터에서는 되는데..."**

```cpp
// Windows에서 잘 되던 코드
#include <windows.h>
Sleep(1000);  // 1초 대기

// Linux에서 컴파일하면?
// error: 'Sleep' was not declared in this scope
```

```cpp
// MSVC에서 잘 되던 코드
int arr[size];  // 가변 길이 배열 (VLA)

// 다른 컴파일러에서?
// MSVC 확장 기능이라 표준이 아님
```

```cpp
// GCC에서 잘 되던 코드
int result = ({ int x = 10; x * 2; });  // Statement Expression

// MSVC에서?
// error: GCC 확장 기능
```

**흔한 상황들:**

| 상황 | 문제 |
|------|------|
| 팀원이 다른 OS 사용 | 코드가 안 돌아감 |
| CI/CD 서버가 Linux | 로컬(Windows)에서 된 게 실패 |
| 고객이 다른 환경 | 배포 후 버그 발생 |
| 컴파일러 업그레이드 | 기존 코드가 안 됨 |

**결론:** 표준을 따르면 이런 문제를 예방할 수 있다.

## 핵심 내용

### 1.1.2 차이를 캡슐화하기

#### 1.1.2.1 런타임 환경의 차이

플랫폼별로 다른 코드가 필요할 때는 조건부 컴파일로 차이를 캡슐화한다.

## 예제 코드

### Bad: 플랫폼 코드가 비즈니스 로직에 섞여 있음

```cpp
#if defined WIN32
auto a_pressed = bool { GetKeyState('A') & 0x8000 != 0 };
#elif defined LINUX
// Linux 구현
#endif
```

### Good: 플랫폼 차이를 별도 파일에 캡슐화

**key_state.h**
```cpp
#pragma once
bool key_state(char key);
```

**key_state_win32.cpp**
```cpp
#include "key_state.h"
#include <windows.h>

bool key_state(char key) {
    return GetKeyState(key) & 0x8000 != 0;
}
```

**key_state_linux.cpp**
```cpp
#include "key_state.h"
#include <X11/Xlib.h>
#include <X11/keysym.h>

bool key_state(char key) {
    Display* display = XOpenDisplay(nullptr);
    char keys[32];
    XQueryKeymap(display, keys);
    KeyCode kc = XKeysymToKeycode(display, key);
    bool pressed = keys[kc / 8] & (1 << (kc % 8));
    XCloseDisplay(display);
    return pressed;
}
```

**CMakeLists.txt**
```cmake
cmake_minimum_required(VERSION 3.10)
project(KeyStateExample)

add_executable(app main.cpp)

if(WIN32)
    target_sources(app PRIVATE key_state_win32.cpp)
elseif(UNIX AND NOT APPLE)
    target_sources(app PRIVATE key_state_linux.cpp)
    target_link_libraries(app X11)
endif()
```

**Makefile**
```makefile
ifeq ($(OS),Windows_NT)
    PLATFORM_SRC = key_state_win32.cpp
else
    PLATFORM_SRC = key_state_linux.cpp
    LDFLAGS = -lX11
endif

app: main.cpp $(PLATFORM_SRC)
	g++ -o $@ $^ $(LDFLAGS)
```

**사용 코드**
```cpp
auto a_pressed = key_state('A');
```

- 윈도우/리눅스 전용 코드는 헤더 파일에 선언하고 별도 파일에 구현
- 플랫폼별로 동작
- 제어 흐름과 분리됨
- 전처리 매크로 부담 없음

#### 1.1.2.2 다양한 C++ 언어 수준 및 컴파일러

컴파일러마다 제공하는 확장 기능이 다르다. 이를 표준으로 캡슐화하자.

**GCC 컴파일러 확장 (비표준)**
```cpp
__has_trivial_constructor(T)
__is_abstract(T)
```

**C++11 표준 라이브러리**
```cpp
#include <type_traits>

std::is_trivially_constructible<T>::value
std::is_abstract<T>::value
```

이런 type trait 기능은 유용한 메타프로그래밍 도구다.

**참고: `__` 밑줄 두 개의 의미**

- `__`로 시작하는 식별자는 C++ 표준에서 **구현자(컴파일러)에게 예약**됨
- 구현자는 `std::`에 새로운 식별자를 추가할 수 없음
- 개발자가 표준 기능처럼 보이지만 실제로는 컴파일러 종속 기능을 실수로 사용할 수 있음

**비표준 코드 방지법**

여러 컴파일러·OS에서 빌드·테스트하면 실수로 섞인 비표준 코드를 찾아낼 수 있다.

```bash
# 여러 컴파일러로 빌드 테스트
g++ -std=c++17 main.cpp
clang++ -std=c++17 main.cpp
cl /std:c++17 main.cpp  # MSVC
```

#### 1.1.2.3 C++ 확장

라이브러리 작성자는 자체 확장 기능을 추가하기도 한다.

**Qt 라이브러리 예시: 시그널과 슬롯**

```cpp
class Counter : public QObject {
    Q_OBJECT

public:
    Counter() { m_value = 0; }
    int value() const { return m_value; }

Q_SIGNALS:
    void valueChanged(int newValue);

Q_SLOTS:
    void setValue(int value) {
        if (value != m_value) {
            m_value = value;
            Q_EMIT valueChanged(value);
        }
    }

private:
    int m_value;
};
```

- `Q_SIGNALS`, `Q_SLOTS`, `Q_EMIT` 같은 키워드는 표준 C++이 아님
- Qt는 **moc(Meta-Object Compiler)** 도구로 이 키워드를 구문 분석하여 C++ 컴파일러가 이해할 수 있는 코드로 변환

**표준 vs 확장**

| | ISO C++ 표준 | 라이브러리 확장 |
|---|---|---|
| 시맨틱스 | 엄격히 정의됨 | 보장 없음 |
| 이식성 | 모든 컴파일러 | 해당 라이브러리만 |
| 문서화 | 모호하지 않음 (읽기 어려움) | 라이브러리마다 다름 |

**결론**

- 이식성 비용을 감수한다면 확장 기능을 자유롭게 사용해도 됨
- 단, 다른 컴파일러에도 같은 확장이 있다는 보장은 없음
- 같은 확장이 있더라도 의미가 같다는 보장도 없음

#### 1.1.2.4 헤더 파일의 안전성

**비표준: `#pragma once`**
```cpp
#pragma once

class MyClass {
    // ...
};
```

- 대부분의 컴파일러에서 지원하지만 **표준이 아님**
- 동작이 보장되지 않음

**표준: 헤더 가드**
```cpp
#ifndef MYCLASS_H
#define MYCLASS_H

class MyClass {
    // ...
};

#endif // MYCLASS_H
```

- ISO C++ 표준 방식
- 모든 컴파일러에서 동작 보장

#### 1.1.2.5 다양한 기본 자료형

**비표준: 컴파일러 확장 타입**
```cpp
typedef __int i32;  // MSVC 확장
auto index = i32{0};
```

- `__int`는 컴파일러 종속 타입

**표준: `<cstdint>` 사용**
```cpp
#include <cstdint>

using i32 = std::int32_t;
auto index = i32{0};
```

- `std::int32_t`는 C++11 표준
- 모든 컴파일러에서 정확히 32비트 정수 보장

#### 1.1.2.6 규제가 있는 제약 사항

ISO C++를 선뜻 사용하지 못하는 경우가 있다. 라이브러리가 부족하거나 언어 기능이 없어서가 아니라, **호스트 환경이 특정 기능을 막기** 때문이다.

**예시: 동적 할당 금지**

```cpp
// 금지되는 코드
auto* ptr = new MyClass();  // 동적 할당 = nondeterministic
```

- 동적 할당은 nondeterministic(비결정적) 동작
- `std::operator new`가 실패 시 `std::bad_alloc`을 발생시키므로 배제
- 실시간 시스템, 임베디드 시스템에서 흔한 제약

**왜 `std::bad_alloc`이 문제인가?**

```cpp
// 실시간 시스템에서 문제가 되는 시나리오
void control_loop() {  // 10ms마다 실행되어야 함
    auto* data = new SensorData();  // 메모리 부족하면 bad_alloc 발생
    // → 예외 처리하느라 10ms 초과
    // → 실시간 제약 위반
    // → 시스템 실패
}
```

1. 메모리 부족 시 → `std::bad_alloc` 예외 발생
2. 예외 처리는 nondeterministic → 언제 발생할지, 처리에 얼마나 걸릴지 예측 불가
3. 실시간 시스템은 timing이 중요 → 예측 불가한 동작은 위험

따라서 **예외를 던질 수 있는 기능 자체를 금지**한다.

**임베디드 시스템에서 동적 할당이 문제인 이유**

1. 메모리 극히 제한적 - KB 단위 (예: 64KB RAM)
2. 메모리 단편화(fragmentation) - 장기 실행 시 힙이 조각나서 연속 메모리 확보 불가
3. 메모리 누수 = 치명적 - 리부팅 외 복구 방법 없음
4. 힙 관리 오버헤드 - malloc/free 자체가 비용
5. **소프트웨어 스택이 없음** (베어메탈 환경)
   - OS 없음
   - 표준 라이브러리(libc, libstdc++) 없거나 제한적
   - 예외 처리 메커니즘 없음 (스택 unwinding 미지원)
   - 힙 관리자 없음

**OS/표준 라이브러리 없으면 일어나는 일들**

```cpp
// 이것들 다 안 됨
new / delete          // 힙 관리자 없음
malloc / free         // 힙 관리자 없음
std::cout / printf    // I/O 시스템 없음
std::thread           // 스레드 스케줄러 없음
std::fstream          // 파일 시스템 없음
throw / catch         // 예외 처리 인프라 없음
dynamic_cast / typeid // RTTI(Run-Time Type Information) 없음
virtual 함수          // vtable 없음, 간접 호출 오버헤드
```

**vtable (Virtual Table)이란?**

가상 함수를 구현하기 위한 함수 포인터 테이블

```cpp
class Animal {
public:
    virtual void speak() { std::cout << "..."; }
    virtual void eat() { std::cout << "eating"; }
};

class Dog : public Animal {
public:
    void speak() override { std::cout << "bark"; }
};
```

컴파일러가 만드는 vtable:
<img src="/images/blog/beautiful/diagrams/item01-vtable.svg" alt="vtable 비교" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

객체 메모리 구조:
<img src="/images/blog/beautiful/diagrams/item01-object-vptr.svg" alt="객체의 vptr" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

가상 함수 호출 과정:
```cpp
Animal* a = new Dog();
a->speak();  // 어떻게 Dog::speak()를 호출하나?

// 1. a의 vptr을 읽음
// 2. vtable에서 speak() 위치(0번)의 함수 포인터를 읽음
// 3. 그 주소로 간접 호출
```

임베디드에서 virtual 함수가 문제인 이유:
- 객체마다 vptr (포인터 크기만큼 메모리 추가)
- 클래스마다 vtable (함수 개수 × 포인터 크기)
- 간접 호출 = 직접 호출보다 느림
- 인라인 불가능
- 분기 예측 어려움

**동적 메모리 사용하는 STL**
```cpp
std::string           // 내부적으로 힙 할당
std::vector           // 동적 배열
std::map / std::set   // 동적 노드 할당
std::function         // 타입 소거 시 힙 할당 가능
std::shared_ptr       // 참조 카운트 블록 힙 할당
```

**오버헤드가 큰 기능들**
```cpp
std::regex            // 매우 무거움
std::locale           // 로케일 데이터 무거움
std::iostream         // 거대한 라이브러리
```

**스레딩/비동기**
```cpp
std::async / std::future  // OS 스레드 필요
std::mutex / std::condition_variable
```

**기타**
```cpp
std::rand()           // 일부 환경에서 엔트로피 소스 없음
atexit()              // 종료 핸들러 인프라 없음
```

→ 이런 기능은 전부 OS·런타임에 의존한다

**임베디드에서 쓸 수 있는 대안**
```cpp
std::array<T, N>      // 스택 기반 고정 배열
std::span             // 뷰 (C++20)
std::string_view      // 문자열 뷰 (힙 안 씀)
std::optional         // 힙 안 씀
std::variant          // 힙 안 씀
```

**스택 unwinding이란?**

예외가 발생하면 catch 블록을 찾을 때까지 콜 스택을 거슬러 올라가면서 **각 스택 프레임의 소멸자를 호출**하는 과정

```cpp
void foo() {
    MyClass obj;  // ← 3. 여기 obj 소멸자 호출
    throw std::runtime_error("error");  // ← 1. 예외 발생
}

void bar() {
    AnotherClass x;  // ← 4. 여기 x 소멸자 호출
    foo();           // ← 2. 스택 거슬러 올라감
}

int main() {
    try {
        bar();
    } catch (...) {  // ← 5. 여기서 catch
        // foo → bar → main 순으로 스택 unwinding
    }
}
```

- 스택 unwinding은 **런타임 지원 필요** (libstdc++, 예외 테이블 등)
- 베어메탈에는 이 인프라가 없음
- 그래서 `-fno-exceptions` 컴파일 옵션으로 예외 자체를 비활성화

```cpp
// 임베디드에서 위험한 패턴
void process() {
    auto* buf = new char[100];  // 할당
    // ... 작업 ...
    delete[] buf;               // 해제
}
// 1000번 반복하면?
// → 힙 단편화 → 결국 할당 실패
```

**임베디드에서의 대안: 정적 할당**

```cpp
char buffer[100];              // 스택
static char pool[1024];        // 정적 할당
std::array<char, 100> arr;     // 스택 (C++11)
```

**예시: 인증되지 않은 라이브러리 금지**

- 항공, 의료, 자동차 등 규제 기관의 인증을 거치지 않은 라이브러리 사용 금지
- Boost 등 유명 라이브러리도 인증 없으면 사용 불가

**해결책**

- C++ Core Guidelines를 해당 환경에 맞게 확장
- 사용자 정의 규칙 추가
- 허용된 기능만 사용하도록 코딩 표준 수립

## 정리

**ISO 표준 C++로 작성하라** = 플랫폼/컴파일러에 종속되지 않는 코드를 작성하라.

### 왜?

- 이식성: 어떤 컴파일러, 어떤 OS에서도 동작
- 유지보수: 플랫폼 변경 시 수정 최소화
- 안정성: 표준은 검증되고 문서화됨

### 어떻게?

| 상황 | 비표준 (피하라) | 표준 (사용하라) |
|------|----------------|----------------|
| 플랫폼 API | `#if WIN32` 코드에 직접 삽입 | 별도 파일에 캡슐화 + 추상화된 인터페이스 |
| 컴파일러 확장 | `__has_trivial_constructor` | `std::is_trivially_constructible` |

### 실천법

1. 플랫폼 차이는 **별도 파일에 캡슐화**
2. 컴파일러 확장 대신 **표준 라이브러리** 사용
3. **복수의 컴파일러**(GCC, Clang, MSVC)로 빌드 테스트

