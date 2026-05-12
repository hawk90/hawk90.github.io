---
title: "Embedded C++ for Real Systems: 서문"
date: 2026-05-12
description: "어디까지 C++를 써도 되는가? RAII, constexpr, no-exception 설계부터 lock-free 패턴까지. 임베디드에서 안전하게 C++를 쓰는 법."
series: "Embedded C++ for Real Systems"
seriesOrder: 0
tags: [cpp, embedded, raii, constexpr, no-exception, modern-cpp]
type: tech
featured: true
---

## 이 시리즈를 쓰는 이유

"임베디드에서 C++를 쓰면 안 됩니다."

이런 말을 들어본 적 있으신가요? 아직도 많은 임베디드 팀에서는 C++를 금기시합니다. 이유는 대략 이렇습니다:

- "C++는 무겁다"
- "예외 처리가 예측 불가능하다"
- "동적 할당이 위험하다"
- "런타임 오버헤드가 있다"

**일부는 맞고, 일부는 틀립니다.**

## C++ 오해와 진실

### 오해 1: "C++는 C보다 느리다"

```cpp
// 이 코드는 C와 동일한 어셈블리를 생성합니다
template<typename T>
constexpr T max(T a, T b) {
    return (a > b) ? a : b;
}
```

Modern C++의 많은 기능은 **zero-cost abstraction**입니다. 컴파일 타임에 모든 것이 결정되고, 런타임 오버헤드는 없습니다.

### 오해 2: "예외 처리는 필수다"

```cpp
// -fno-exceptions 플래그로 완전히 비활성화 가능
// 대안: std::optional, std::expected, error code
std::expected<int, Error> parse(const char* str);
```

예외를 사용하지 않는 C++ 코드는 완전히 가능하며, 많은 임베디드 프로젝트가 이미 이렇게 하고 있습니다.

### 오해 3: "동적 할당이 필수다"

```cpp
// 정적 할당만 사용하는 것이 가능합니다
std::array<int, 100> buffer;  // 스택에 할당
static std::array<Task, 10> tasks;  // 정적 영역에 할당

// 커스텀 allocator 사용
std::pmr::monotonic_buffer_resource pool{static_buffer, sizeof(static_buffer)};
```

`new`/`delete`를 사용하지 않고도 C++의 모든 기능을 활용할 수 있습니다.

## 그렇다면 왜 C++인가?

C 대신 C++를 선택하면 얻을 수 있는 것들:

### 1. 컴파일 타임 안전성

```cpp
// C: 런타임에 발견되는 버그
void* data = get_data();
int* ptr = (int*)data;  // 잘못된 캐스트여도 컴파일 성공

// C++: 컴파일 타임에 발견
auto data = get_data();
auto ptr = std::get<int*>(data);  // 타입 불일치 시 컴파일 에러
```

### 2. RAII: 리소스 누수 방지

```cpp
class ScopedLock {
    Mutex& mtx;
public:
    ScopedLock(Mutex& m) : mtx(m) { mtx.lock(); }
    ~ScopedLock() { mtx.unlock(); }  // 예외가 발생해도 반드시 해제
};

void critical_section() {
    ScopedLock lock(mutex);  // 함수 종료 시 자동 해제
    // ... 작업 ...
}  // 여기서 lock 소멸자 호출 → unlock
```

### 3. constexpr: 컴파일 타임 계산

```cpp
// 런타임 비용 0으로 CRC 테이블 생성
constexpr auto crc_table = generate_crc_table();

// 컴파일 타임에 설정 검증
static_assert(BUFFER_SIZE >= MIN_REQUIRED, "Buffer too small");
```

### 4. 타입 안전한 하드웨어 추상화

```cpp
// C: 실수하기 쉬운 비트 조작
GPIOA->ODR |= (1 << 5);

// C++: 타입 안전한 API
gpio::Pin<GPIOA, 5> led;
led.set_high();
```

## 대상 독자

1. **C에서 C++로 전환하려는 임베디드 개발자**
   - "C++를 써도 될까?" 고민 중인 분
   - 팀에 C++ 도입을 설득해야 하는 분

2. **C++를 쓰고 있지만 확신이 없는 분**
   - "이렇게 해도 되나?" 싶은 코드가 있는 분
   - Best practice를 알고 싶은 분

3. **Modern C++ 기능을 임베디드에 적용하고 싶은 분**
   - C++11/14/17/20 기능 중 뭘 써도 되는지
   - 어떤 기능은 피해야 하는지

## 시리즈 구성

총 3개 Part, 12개 글로 구성됩니다:

| Part | 주제 | 글 수 |
|------|-----|-------|
| 1 | Zero-Cost Abstractions | 4 |
| 2 | Memory & Error Handling | 4 |
| 3 | Advanced Patterns | 4 |

### Part 1: Zero-Cost Abstractions

런타임 비용 없이 추상화하는 방법:

- RAII in embedded: 리소스 관리의 정석
- constexpr 완전정복: 컴파일 타임 계산
- Templates 비용 분석: 코드 bloat 피하기
- Static polymorphism: virtual 없이 다형성

### Part 2: Memory & Error Handling

메모리와 에러를 안전하게 다루는 법:

- Custom allocators: 정적 할당의 기술
- No-exception 설계: 예외 없이 에러 처리
- No-RTTI: typeid 없이 타입 정보 활용
- std::expected vs Result: 에러 처리 패턴

### Part 3: Advanced Patterns

고급 C++ 패턴의 임베디드 적용:

- Intrusive containers: 동적 할당 없는 자료구조
- Lock-free smart pointers: 안전한 공유
- Ownership model: 소유권 명확히 하기
- ETL 활용: Embedded Template Library

## 이 시리즈의 원칙

1. **측정 가능한 주장만 한다**
   - "빠르다" → "어셈블리 N줄, 사이클 M개"
   - "안전하다" → "컴파일 타임에 검증됨"

2. **대안을 제시한다**
   - "이건 쓰지 마세요" → "대신 이걸 쓰세요"
   - 금지만 하지 않고 해결책 제공

3. **실제 코드를 보여준다**
   - 개념 설명 + 동작하는 예제
   - Godbolt(Compiler Explorer) 링크 제공

4. **C를 비하하지 않는다**
   - C가 더 적합한 상황도 분명히 있다
   - 부트 코드, 극단적으로 작은 MCU, 인증 제약이 강한 코드베이스는 C가 더 현실적일 수 있다

## 이 시리즈에서 다루지 않는 것

범위를 명확히 하기 위해 일부 주제는 의도적으로 깊게 다루지 않습니다:

- GUI 프레임워크나 앱 레벨 C++ 패턴
- 데스크톱/서버 C++의 allocator 튜닝
- exception, RTTI를 적극 활용하는 일반 애플리케이션 스타일
- "C++이면 무조건 더 좋다"는 식의 기술 전도

핵심은 **제약이 강한 시스템에서 어느 기능이 실제로 이득을 주는가**입니다.

## 어떤 환경을 기준으로 설명하나

예제와 판단 기준은 다음 같은 환경을 우선합니다:

- Cortex-M / Cortex-A 기반 MCU, MPU, SoC
- bare-metal, FreeRTOS, Zephyr
- `-fno-exceptions`, `-fno-rtti` 또는 제한적 런타임 사용
- 정적 할당 우선, 동적 할당은 통제된 구간에서만 허용
- 코드 크기, latency, deterministic behavior가 중요한 제품

즉, "문법적으로 가능한가?"보다 **바이너리 크기와 실행 특성까지 포함해 감당 가능한가?**를 기준으로 판단합니다.

## 읽는 순서

처음부터 순서대로 읽는 것이 가장 좋지만, 상황에 따라 이렇게 시작해도 됩니다:

- 팀에서 "C++ 도입 여부"를 논의 중이라면: Part 1부터
- 이미 C++를 쓰지만 메모리/에러 처리가 불안하다면: Part 2부터
- 템플릿, intrusive container, ownership 같은 구조 설계가 고민이라면: Part 3부터

시리즈 전체를 관통하는 질문은 세 가지입니다:

1. 이 기능이 런타임 비용을 추가하는가?
2. 이 기능이 디버깅과 운영을 더 쉽게 만드는가?
3. 이 기능이 팀 전체 코드 품질을 안정적으로 끌어올리는가?

## 컴파일러 플래그 가이드

임베디드 C++ 프로젝트의 권장 플래그:

```makefile
# GCC/Clang 공통
CXXFLAGS += -std=c++17          # 또는 c++20
CXXFLAGS += -fno-exceptions     # 예외 비활성화
CXXFLAGS += -fno-rtti           # RTTI 비활성화
CXXFLAGS += -fno-threadsafe-statics  # 정적 초기화 락 제거

# 최적화
CXXFLAGS += -Os                 # 사이즈 최적화
CXXFLAGS += -flto               # Link Time Optimization

# 경고
CXXFLAGS += -Wall -Wextra -Wpedantic
CXXFLAGS += -Werror             # 경고를 에러로
```

## 레퍼런스

**서적**
- *Effective Modern C++* - Scott Meyers
- *C++ Core Guidelines* - Stroustrup & Sutter
- *Real-Time C++* - Christopher Kormanyos
- *Large-Scale C++* - John Lakos

**온라인**
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/)
- [Embedded Template Library (ETL)](https://www.etlcpp.com/)
- [Compiler Explorer](https://godbolt.org/)
- [Embedded Artistry](https://embeddedartistry.com/)

**컨퍼런스 발표**
- CppCon Embedded Track
- Meeting C++ Embedded
- Embedded World

**비교 관점**
- Rust도 메모리 안전성 측면에서 강한 대안이 될 수 있다
- 다만 이 시리즈의 초점은 Rust와의 우열이 아니라, 현재 C/C++ 기반 팀에서 C++를 어디까지 안전하게 도입할 수 있는가에 있다

## 기대하는 결과

이 시리즈를 다 읽고 나면 다음 정도는 직접 판단할 수 있어야 합니다:

- "이 모듈은 C로 유지하고, 이 계층부터는 C++로 올리자"
- "RAII는 여기까지 허용하고, allocator는 이 방식으로 제한하자"
- "템플릿은 쓰되, code bloat는 이 기준으로 통제하자"
- "예외/RTTI 없이도 유지보수성 있는 인터페이스를 설계하자"

---

다음 글: [Part 1-1: RAII in Embedded](/blog/embedded/embedded-cpp/part1-01-raii)
