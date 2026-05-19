---
title: "항목 55: Boost에 익숙해져라"
date: 2026-05-04T07:00:00
description: "Boost — 표준의 인큐베이터이자 production-quality 라이브러리 모음. 어느 영역에서 여전히 가치가 있는가."
tags: [C++, Effective C++, Boost]
series: "Effective C++"
seriesOrder: 55
draft: true
---

## 왜 이 항목이 중요한가?

**Boost**는 단순한 외부 라이브러리가 아니다. C++ 표준 라이브러리의 **인큐베이터**다. 사용자가 매일 쓰는 `shared_ptr`, `regex`, `thread`, `filesystem`, `optional`, `variant`, `any` — 모두 Boost에서 시작해 표준으로 흡수됐다.

C++ 표준이 빠르게 발전하면서(C++11/14/17/20/23) Boost의 자리는 줄었지만, 여전히 **표준이 다루지 않는 영역**에서 가장 검증된 선택지다. 그래프, 명령행 파싱, 직렬화, BoostSpirit 파서 콤비네이터, asio 네트워킹 등.

이 항목은 Boost의 역할, 여전히 가치 있는 영역, 그리고 외부 의존성으로서의 트레이드오프를 정리한다.

## 개요

**Boost**는 동료 평가를 거친 무료 C++ 라이브러리 모음이다. C++ 표준 라이브러리의 **인큐베이터**(원형) 역할을 한다. `shared_ptr`, `regex`, `thread`, `filesystem`, `optional`, `variant`, `any` 등이 모두 Boost에서 시작해 C++11/17/20에 표준 흡수됐다. 표준이 빠르게 발전하면서 Boost의 자리가 줄었지만, 여전히 **표준이 안 다루는 영역에서 가장 검증된 옵션**이다.

## Boost의 역할과 가치

```
새 기능 → Boost (실험) → 동료 평가 → 표준 위원회 채택 → C++11/14/17/20에 흡수
```

- 새 라이브러리의 **실험장** — 표준 위원회에 채택되기 전 검증
- **이식성** — 거의 모든 컴파일러·플랫폼
- **무료, 자유로운 라이선스** (Boost Software License — 상업 사용 OK)
- **고품질** — 동료 평가, 광범위한 테스트
- **표준 흡수의 패스** — 한 번 Boost로 검증되면 표준 채택 가능성 ↑

## Boost가 다루는 영역 — 카테고리별

### 일반 유틸리티

표준에 흡수된 항목들 — 옛 코드 호환 또는 C++17 미만 환경에서 여전히 유효:

- **Boost.Optional** — `std::optional`(C++17) 원형
- **Boost.Variant** / **Boost.Variant2** — `std::variant`(C++17) 원형
- **Boost.Any** — `std::any`(C++17) 원형
- **Boost.Tuple** — `std::tuple` 원형
- **Boost.Range** — C++20 ranges 원형 (Boost.Range는 더 광범위)

### 함수형 프로그래밍

- **Boost.Function** — `std::function` 원형
- **Boost.Bind** — `std::bind` 원형
- **Boost.Lambda** — C++11 람다 이전의 작은 람다
- **Boost.Phoenix** — 함수형 메타프로그래밍

C++11+ 람다·표준 functional이 대부분 대체.

### 스마트 포인터

- **shared_ptr, weak_ptr, scoped_ptr** — `std::shared_ptr`/`weak_ptr` 원형 (C++11+)
- **Boost.Intrusive** — 객체 자체에 컨테이너 노드를 두는 컨테이너 (성능)
- **intrusive_ptr** — 객체에 카운터를 박는 ref-counting (shared_ptr보다 가벼움)

intrusive 패턴은 표준에 없음 — Boost 고유 가치.

### 메타프로그래밍

- **Boost.MPL** — 컴파일 타임 알고리즘 (옛 — TMP 시대)
- **Boost.Fusion** — 컴파일 타임 + 런타임 결합 자료구조
- **Boost.Hana** — 모던 메타프로그래밍 (C++14+ 기반, 매우 빠른 컴파일)
- **Boost.Preprocessor** — 매크로 메타프로그래밍

C++17 `if constexpr`, C++20 concepts가 일부 대체.

### 자료구조

- **Boost.Multi-index** — 한 컨테이너에 여러 정렬·해시 인덱스 (RDB의 인덱스 느낌)
- **Boost.Bimap** — 양방향 map (`A ↔ B`)
- **Boost.Heap** — 다양한 heap 구현 (Fibonacci, binomial 등)
- **Boost.PolyCollection** — 다형성 컨테이너
- **Boost.Container** — 표준 컨테이너의 확장/대안

표준에 없는 강력한 자료구조들.

### 문자열 / 텍스트

- **Boost.Regex** — `<regex>` 원형, 일부 기능은 표준보다 빠름
- **Boost.Format** — `printf` 안전 대안 (C++20 `<format>` 흡수)
- **Boost.Spirit** — 파서 콤비네이터 (EBNF로 파서 직접 작성)
- **Boost.Lexical_cast** — `boost::lexical_cast<int>(str)` (C++17 `std::from_chars`로 대체 가능)

Spirit은 표준에 없는 강력한 도구.

### 그래프

- **Boost.Graph (BGL)** — 그래프 자료구조 + 알고리즘 (BFS, DFS, Dijkstra, MST, ...)

표준엔 그래프 라이브러리 없음 — BGL이 사실상 표준.

### 동시성

- **Boost.Thread** — `std::thread` 원형 (대부분 C++11에 흡수)
- **Boost.Asio** — 비동기 I/O / 네트워크 (표준 흡수 진행 중 — C++26 Networking)
- **Boost.Lockfree** — 락-프리 자료구조
- **Boost.Fiber** — 사용자 공간 스케줄 코루틴

Asio는 네트워크 라이브러리의 사실상 표준 — C++ 네트워킹 코드 작성 시 거의 필수.

### 수치 / 자료과학

- **Boost.uBLAS** — 선형대수 (BLAS의 C++ 래퍼)
- **Boost.Math** — 특수 함수 (베타·감마·통계 분포 등)
- **Boost.Geometry** — 기하학 (점, 선, 다각형, 거리 등)
- **Boost.Interval** — 구간 산술 (구간으로 계산해 오차 추적)

수치 계산이 필요하면 Eigen / Armadillo와 함께 비교 검토.

### 직렬화

- **Boost.Serialization** — 객체 직렬화 (XML, JSON, binary)

표준엔 없음 — 사실상 Boost 또는 protobuf / msgpack 등 외부.

### 파일 시스템

- **Boost.Filesystem** — `std::filesystem`(C++17) 원형

### 테스트

- **Boost.Test** — 단위 테스트 (Google Test, Catch2와 함께 흔히 사용)

### Type Erasure

- **Boost.TypeErasure** — 인터페이스 기반 다형성 (가상 함수 없이)

C++20 concepts와 유사한 아이디어, 그러나 더 일반적.

### Pre-C++11 호환

- **Boost.Foreach** — `BOOST_FOREACH` 매크로 (C++11 range-based for 이전)
- **Boost.StaticAssert** — `BOOST_STATIC_ASSERT` (C++11 `static_assert` 이전)

옛 C++03 환경 호환 — 모던 환경에선 불필요.

## 활용 가이드 — "표준 → Boost → 직접"

```
새 기능 필요?
├── 표준에 있는지 확인 → 우선 사용
├── 표준 없으면 Boost — 검증된 옵션
├── Boost에도 없으면 외부 라이브러리 (eigen, protobuf, fmt 등)
└── 그 외 직접 작성
```

## C++ 표준의 진화와 Boost의 미래

C++ 표준이 빠르게 발전하며 — Boost의 많은 라이브러리가 흡수됨. 그래도 Boost는 여전히 강력:

- 표준이 안 다루는 영역(Graph, Multi-index, Spirit, Geometry)
- 더 풍부한 기능 (Range가 표준 ranges보다 광범위)
- 옛 C++ 환경 호환 (C++03 코드베이스 등)
- 표준의 다음 후보 실험 (Asio → Networking TS → C++26?)

## 의존성 관리

```bash
# 패키지 매니저
brew install boost
apt install libboost-all-dev
pacman -S boost
vcpkg install boost

# CMake
find_package(Boost REQUIRED COMPONENTS filesystem regex)
target_link_libraries(myapp Boost::filesystem Boost::regex)
```

Boost는 헤더-only 라이브러리도 많음 — 일부는 컴파일된 라이브러리 링크 필요.

## 흔한 함정 — Boost 의존성 과대

```
프로젝트가 Boost의 한두 기능만 쓰는데 — 전체 Boost 의존
```

해결:
- 필요한 컴포넌트만 명시
- `header-only` 부분만 사용하면 컴파일 의존성만
- 가능하면 C++17+ 표준으로 대체 (`std::optional`, `std::filesystem` 등)

## Boost와 모던 C++의 결합 — 예

```cpp
#include <boost/multi_index_container.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index/hashed_index.hpp>

using namespace boost::multi_index;

struct Employee {
    int id;
    std::string name;
    int salary;
};

using EmployeeContainer = multi_index_container<
    Employee,
    indexed_by<
        ordered_unique<member<Employee, int, &Employee::id>>,
        hashed_non_unique<member<Employee, std::string, &Employee::name>>,
        ordered_non_unique<member<Employee, int, &Employee::salary>>
    >
>;

// 한 컨테이너 — id로 정렬, name으로 해시, salary로 정렬 — 모두 동시에
```

표준엔 없는 강력한 자료구조.

## 학습 곡선

Boost 일부 라이브러리는 학습 곡선이 가파름:
- **Boost.MPL** — TMP 깊은 이해 필요
- **Boost.Spirit** — DSL 문법
- **Boost.Asio** — 비동기 I/O 모델

**가볍게**: Boost.Optional, Boost.Format, Boost.Filesystem
**중간**: Boost.Regex, Boost.Multi-index, Boost.Bimap
**무거움**: Boost.MPL, Boost.Spirit, Boost.Asio

## 대안 라이브러리들

Boost는 광범위하지만 — 도메인별 더 좋은 옵션도 있음:

| 영역 | Boost 외 대안 |
| --- | --- |
| 수치 계산 | Eigen, Armadillo, xtensor |
| JSON | nlohmann/json, RapidJSON, simdjson |
| 로깅 | spdlog |
| 테스트 | Catch2, doctest, Google Test |
| HTTP | cpp-httplib, Beast(asio 위), libcurl |
| Format | fmt (C++20 std::format 원형) |

## 실무 가이드 — 결정

```
어떤 라이브러리 사용?
├── 표준에 있다 → 표준 (C++17+ 우선)
├── 표준에 없지만 곧 흡수될 → Boost (Networking 등)
├── Boost에도 없거나 더 좋은 도구 → 외부 (Eigen, fmt 등)
├── 학습 시간 vs 직접 작성 비교
└── 의존성 관리 (Conan, vcpkg, CMake)
```

## 실무 가이드 — 체크리스트

- [ ] 표준에 같은 기능 있는지 먼저 확인?
- [ ] Boost의 어느 라이브러리가 필요한지 명확?
- [ ] 필요한 컴포넌트만 의존 (전체 X)?
- [ ] header-only인가, 링크 필요?
- [ ] 의존성 관리 도구 (vcpkg, Conan)?
- [ ] 학습 곡선 vs 직접 작성 비용?

## 핵심 정리

1. **Boost = 검증된 무료 C++ 라이브러리 모음** — 표준의 인큐베이터
2. 많은 항목이 **C++11/14/17/20에 흡수** — `shared_ptr`, `regex`, `optional`, `filesystem` 등
3. **표준에 없는 영역**에서 첫 검토 대상 — Graph, Multi-index, Spirit, Asio, Geometry
4. 일부는 무겁거나 학습 곡선 ↑ — 도메인에 맞게 선택
5. **표준 → Boost → 외부 라이브러리 → 직접 작성** 순서로 검토
6. 의존성 관리 (vcpkg, Conan) 시 — 필요한 컴포넌트만

## 관련 항목

- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — Boost.SmartPtr → 표준
- [항목 47: traits 클래스](/blog/programming/cpp/effective-cpp/item47-use-traits-classes-for-information-about-types) — Boost.MPL의 원형 영역
- [항목 54: 표준 라이브러리](/blog/programming/cpp/effective-cpp/item54-familiarize-yourself-with-the-standard-library-including-tr1) — Boost가 흡수된 표준
