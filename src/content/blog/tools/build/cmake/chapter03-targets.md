---
title: "Ch 3: 타겟과 라이브러리"
date: 2025-05-14T03:00:00
description: "Modern CMake의 핵심: 타겟 중심 접근법과 라이브러리 생성."
tags: [cmake, build, cpp, library, target]
series: "CMake"
seriesOrder: 3
draft: false
---

## 왜 타겟 중심 접근법인가

CMake 2.x 시절의 표준 패턴은 *전역 변수*에 모든 것을 담는 모양이었습니다.

```cmake
# 옛 CMake — 전역 설정
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall")
include_directories(include)
link_libraries(pthread)

add_executable(app1 src/app1.cpp)
add_executable(app2 src/app2.cpp)
# 두 실행 파일 모두에 -Wall, include, pthread가 자동 적용됨
```

작은 프로젝트에서는 깔끔해 보입니다. 하지만 *프로젝트가 커지자마자* 세 가지 문제가 줄줄이 등장합니다.

1. **전역 오염**: 모든 타겟이 *모든 설정*을 받습니다. `app2`가 pthread를 안 쓰는데도 강제 링크되고, 라이브러리 X에만 필요한 매크로가 *모든 라이브러리*에 들어갑니다.
2. **의존성 불명확**: 어떤 타겟이 *무엇 때문에* 특정 옵션을 받았는지 추적이 안 됩니다. 코드 위에서 아래로 흐르는 *순서 의존성*이 모든 줄에 깔립니다.
3. **재사용 불가**: 다른 프로젝트에서 이 라이브러리를 쓰려면, 어떤 옵션·include·라이브러리가 *그 라이브러리를 위해* 필요했는지를 직접 다시 적어야 합니다.

CMake 3.0(2014) 이후 권장되는 *Modern CMake* 모델은 *모든 것을 타겟에 붙입니다*.

```cmake
# Modern CMake — 타겟별 설정
add_executable(app1 src/app1.cpp)
target_compile_options(app1 PRIVATE -Wall)
target_include_directories(app1 PRIVATE include)
target_link_libraries(app1 PRIVATE pthread)

add_executable(app2 src/app2.cpp)
target_compile_options(app2 PRIVATE -Wall)
target_include_directories(app2 PRIVATE include)
# app2는 pthread 없이 빌드 — 깔끔
```

이 모델의 장점은 *명시성*과 *전이성* 둘입니다. 설정이 *어느 타겟에 붙어 있는지* 코드에서 즉시 보입니다. 그리고 한 타겟을 다른 타겟이 *사용*하면, 필요한 설정이 *자동으로 따라옵니다*(PUBLIC/INTERFACE 가시성). 이게 *전이적 의존성 추적*이고, Modern CMake의 가장 중요한 능력입니다.

![Old CMake vs Modern CMake](/images/blog/cmake/diagrams/ch03-old-vs-modern.svg)

이 챕터의 목표는 셋입니다.

1. 타겟의 *세 종류*(실행 파일·라이브러리·커스텀)와 그 차이.
2. *PRIVATE / PUBLIC / INTERFACE* 세 가시성의 의미와 선택 기준.
3. 라이브러리를 *재사용 가능한 단위*로 만드는 표준 패턴.

---

## 타겟이란

CMake에서 **타겟(target)**은 빌드할 대상입니다. 세 가지 종류가 있습니다.

| 종류 | 생성 명령 | 설명 |
|------|-----------|------|
| **실행 파일** | `add_executable` | 프로그램 (.exe, ELF) |
| **라이브러리** | `add_library` | 정적/동적 라이브러리 |
| **커스텀 타겟** | `add_custom_target` | 빌드 단계 (코드 생성 등) |

타겟에는 **속성(property)**이 붙습니다. 컴파일 옵션, 인클루드 경로, 링크 라이브러리 등이 속성입니다.

```cmake
add_executable(app main.cpp)

# 타겟 속성 설정
target_compile_options(app PRIVATE -Wall)
target_include_directories(app PRIVATE include)
target_compile_definitions(app PRIVATE DEBUG_MODE)
target_link_libraries(app PRIVATE pthread)
```

---

## 실행 파일 타겟

### add_executable

```cmake
add_executable(myapp
    src/main.cpp
    src/utils.cpp
)
```

타겟 이름 `myapp`이 생성되는 실행 파일 이름이 됩니다. Linux에서 `myapp`, Windows에서 `myapp.exe`가 됩니다.

### 타겟 속성 설정 명령

```cmake
# 컴파일 옵션 (-Wall, -O2 등)
target_compile_options(myapp PRIVATE -Wall -Wextra)

# 전처리기 정의 (-DFOO=1)
target_compile_definitions(myapp PRIVATE VERSION="1.0.0" DEBUG_MODE)

# 인클루드 디렉터리 (-I)
target_include_directories(myapp PRIVATE include src)

# C++ 표준
target_compile_features(myapp PRIVATE cxx_std_17)

# 링크 옵션
target_link_options(myapp PRIVATE -static)

# 라이브러리 링크
target_link_libraries(myapp PRIVATE pthread mylib)
```

모든 `target_*` 명령에는 **가시성 키워드**(PRIVATE, PUBLIC, INTERFACE)가 필요합니다. 실행 파일의 경우 대부분 `PRIVATE`을 씁니다.

---

## 라이브러리 타겟

### 정적 라이브러리 (STATIC)

```cmake
add_library(mylib STATIC
    src/mylib.cpp
)
```

컴파일된 오브젝트 파일을 아카이브한 파일입니다.

| 플랫폼 | 확장자 |
|--------|--------|
| Linux/macOS | `.a` |
| Windows | `.lib` |

정적 라이브러리를 링크하면 코드가 실행 파일에 **복사**됩니다. 실행 파일이 커지지만, 배포 시 추가 파일이 필요 없습니다.

### 동적 라이브러리 (SHARED)

```cmake
add_library(mylib SHARED
    src/mylib.cpp
)
```

런타임에 로드되는 라이브러리입니다.

| 플랫폼 | 확장자 |
|--------|--------|
| Linux | `.so` |
| macOS | `.dylib` |
| Windows | `.dll` (+ `.lib` import library) |

동적 라이브러리는 여러 프로그램이 **공유**합니다. 실행 파일이 작아지지만, 배포 시 라이브러리 파일이 함께 필요합니다.

### 헤더 전용 라이브러리 (INTERFACE)

```cmake
add_library(mylib INTERFACE)
target_include_directories(mylib INTERFACE include)
target_compile_definitions(mylib INTERFACE USE_MYLIB)
```

컴파일할 소스가 없고 헤더만 있는 라이브러리입니다. 템플릿 라이브러리나 헤더 전용 라이브러리(Boost.Hana, Eigen 등)에 사용합니다.

INTERFACE 라이브러리의 모든 속성은 `INTERFACE`로 지정합니다. 자체 빌드가 없으므로 PRIVATE이나 PUBLIC은 의미가 없습니다.

### 오브젝트 라이브러리 (OBJECT)

```cmake
add_library(common OBJECT
    src/utils.cpp
    src/config.cpp
)
```

오브젝트 파일(.o)만 생성하고 아카이브(.a)하지 않습니다. 여러 타겟에서 같은 소스를 공유할 때 중복 컴파일을 피할 수 있습니다.

```cmake
add_executable(app1 src/app1.cpp)
target_link_libraries(app1 PRIVATE common)

add_executable(app2 src/app2.cpp)
target_link_libraries(app2 PRIVATE common)

# 또는 제너레이터 표현식으로
add_executable(app3 src/app3.cpp $<TARGET_OBJECTS:common>)
```

### 라이브러리 타입 미지정

```cmake
add_library(mylib src/mylib.cpp)
```

타입을 생략하면 `BUILD_SHARED_LIBS` 변수에 따라 결정됩니다.

```bash
cmake -B build -DBUILD_SHARED_LIBS=ON   # SHARED
cmake -B build -DBUILD_SHARED_LIBS=OFF  # STATIC (기본)
cmake -B build                          # STATIC (기본)
```

---

## 가시성 키워드: PRIVATE, PUBLIC, INTERFACE

`target_*` 계열 명령에는 *가시성 키워드*가 거의 항상 필요합니다. 이 한 단어가 *설정이 어디까지 흘러가는지*를 결정합니다.

| 키워드 | 현재 타겟 빌드에 사용 | 의존 타겟에도 자동 전파 |
|--------|----------------------|-----------------------|
| `PRIVATE` | ✓ | ✗ |
| `PUBLIC` | ✓ | ✓ |
| `INTERFACE` | ✗ | ✓ |

### 한 줄 정의

- **PRIVATE** — "*나만* 쓸 거다."
- **PUBLIC** — "*나도 쓰고, 나를 쓰는 사람도* 쓸 거다."
- **INTERFACE** — "*나는 안 쓰지만, 나를 쓰는 사람은* 쓸 거다."

### 그림으로 — 의존 그래프와 전파

`app → mylib`라는 의존성이 있을 때, `mylib`에 붙인 옵션이 `app`까지 전파되는지를 가시성이 결정합니다.

![가시성 전파](/images/blog/cmake/diagrams/ch03-visibility-propagation.svg)

### 실제 코드로 — 어느 자리에 어떤 키워드

```cmake
add_library(mylib src/mylib.cpp)

# PRIVATE — mylib 내부 구현 디테일
target_include_directories(mylib PRIVATE src/internal)
target_compile_options(mylib PRIVATE -Wno-unused-parameter)

# PUBLIC — mylib도 쓰고, mylib 헤더를 #include하는 사람도 봐야 함
target_include_directories(mylib PUBLIC include)
target_compile_features(mylib PUBLIC cxx_std_17)

# INTERFACE — mylib는 안 쓰고, mylib 사용자만 알아야 할 매크로
target_compile_definitions(mylib INTERFACE USE_MYLIB)
```

```cmake
add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE mylib)
# 위 한 줄로 app은 자동으로:
#   - include/ 인클루드 경로
#   - cxx_std_17 표준
#   - USE_MYLIB 매크로
# 를 받습니다 (PUBLIC + INTERFACE 항목).
#
# 받지 않는 것:
#   - src/internal 경로 (PRIVATE)
#   - -Wno-unused-parameter (PRIVATE)
```

### 선택 가이드 — 헷갈릴 때 묻는 세 질문

새 설정을 추가하려는데 어떤 키워드를 써야 할지 망설일 때, 다음 세 질문을 던집니다.

1. *내 .cpp가 이 설정을 직접 쓰는가?* — Yes면 (PRIVATE 또는 PUBLIC 후보).
2. *내 헤더가 이 설정에 의존하는가?* — 즉 헤더 안에서 매크로를 참조하거나, 헤더가 다른 라이브러리 헤더를 `#include`하거나. Yes면 (PUBLIC 또는 INTERFACE 후보).
3. *나는 안 쓰지만 다른 사람만 쓰는가?* — Yes면 (INTERFACE 후보).

조합하면:

| 1번 | 2번 | 정답 |
|-----|-----|-----|
| ✓ | ✗ | **PRIVATE** |
| ✓ | ✓ | **PUBLIC** |
| ✗ | ✓ | **INTERFACE** |

가장 흔한 패턴은 `target_include_directories`의 *공개 헤더 경로는 PUBLIC*, *내부 소스의 헤더 경로는 PRIVATE*입니다. 라이브러리 사용자가 보아야 할 헤더 경로가 PUBLIC으로 전파되어, `target_link_libraries`만 호출해도 자동으로 인클루드 경로가 더해집니다.

### 예시로 이해하기

```cmake
add_library(mylib src/mylib.cpp)

# PRIVATE: mylib 빌드에만 필요, 사용자에게는 전파 안 됨
target_include_directories(mylib PRIVATE src/internal)
target_compile_options(mylib PRIVATE -Wno-unused-parameter)

# PUBLIC: mylib 빌드에도 필요하고, 사용자에게도 전파됨
target_include_directories(mylib PUBLIC include)
target_compile_features(mylib PUBLIC cxx_std_17)

# INTERFACE: mylib 빌드에는 필요 없지만, 사용자에게 전파됨
target_compile_definitions(mylib INTERFACE USE_MYLIB)
```

```cmake
add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE mylib)
```

`app`이 `mylib`에 링크하면:

- `include` 디렉터리 상속 (PUBLIC)
- C++17 요구 상속 (PUBLIC)
- `USE_MYLIB` 정의 상속 (INTERFACE)
- `src/internal`은 상속 안 함 (PRIVATE)
- `-Wno-unused-parameter`는 상속 안 함 (PRIVATE)

### 가시성 결정 가이드

| 상황 | 가시성 |
|------|--------|
| 내부 구현 헤더 | PRIVATE |
| 공개 API 헤더 | PUBLIC |
| 헤더 전용 라이브러리의 모든 설정 | INTERFACE |
| 구현 세부사항 (최적화 플래그 등) | PRIVATE |
| 의존 라이브러리 (pthread 등) — 내부 구현 | PRIVATE |
| 의존 라이브러리 — 공개 API에 노출 | PUBLIC |
| 실행 파일의 모든 설정 | PRIVATE |

### 전파 예시 다이어그램

위의 [가시성 전파 다이어그램](#그림으로--의존-그래프와-전파)을 참조하세요. `mylib`의 PUBLIC과 INTERFACE 속성은 `app`에 자동 전파되고, PRIVATE 속성은 전파되지 않습니다.

---

## 라이브러리 연결

### target_link_libraries

```cmake
target_link_libraries(app PRIVATE mylib)
```

`mylib`의 PUBLIC과 INTERFACE 속성이 `app`에 전파됩니다. 링크도 자동으로 처리됩니다.

### 의존성 체인

```cmake
# C가 B를 사용하고, B가 A를 사용
add_library(A src/a.cpp)
add_library(B src/b.cpp)
add_library(C src/c.cpp)

target_link_libraries(B PUBLIC A)    # B의 공개 API에서 A 타입 사용
target_link_libraries(C PRIVATE B)   # C의 내부에서만 B 사용

add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE C)
# app → C → B → A (체인으로 연결)
```

### 시스템 라이브러리

```cmake
# 라이브러리 이름으로 (링커가 찾음)
target_link_libraries(app PRIVATE pthread m dl)

# 전체 경로로
target_link_libraries(app PRIVATE /usr/lib/libfoo.so)

# 플래그로
target_link_libraries(app PRIVATE -lz)
```

---

## 라이브러리 구조

### 전형적인 디렉터리 구조

```text
mylib/
├── CMakeLists.txt
├── include/
│   └── mylib/
│       ├── mylib.hpp      ← 공개 헤더
│       └── types.hpp
└── src/
    ├── mylib.cpp
    └── internal.hpp       ← 내부 헤더
```

공개 헤더는 `include/mylib/` 아래에, 내부 헤더는 `src/` 아래에 둡니다.

### CMakeLists.txt

```cmake
add_library(mylib
    src/mylib.cpp
)

# 별칭 (find_package와 일관된 사용)
add_library(MyLib::mylib ALIAS mylib)

# 인클루드 경로
target_include_directories(mylib
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# C++ 표준
target_compile_features(mylib PUBLIC cxx_std_17)

# 컴파일 옵션
target_compile_options(mylib
    PRIVATE
        $<$<CXX_COMPILER_ID:GNU>:-Wall -Wextra>
        $<$<CXX_COMPILER_ID:MSVC>:/W4>
)
```

`BUILD_INTERFACE`와 `INSTALL_INTERFACE`는 제너레이터 표현식입니다.

- `BUILD_INTERFACE`: 빌드 트리에서 라이브러리를 사용할 때의 경로
- `INSTALL_INTERFACE`: `make install` 후 사용할 때의 경로

이렇게 하면 빌드할 때와 설치 후 모두 올바른 경로가 적용됩니다.

---

## 별칭 타겟

```cmake
add_library(mylib src/mylib.cpp)
add_library(MyLib::mylib ALIAS mylib)
```

별칭(alias)은 타겟에 네임스페이스 형태의 이름을 붙입니다. 두 가지 장점이 있습니다.

1. **일관성**: `find_package(MyLib)`로 찾은 타겟과 같은 형식
2. **오류 감지**: 존재하지 않는 별칭을 사용하면 즉시 오류 발생

```cmake
# 내부에서 직접 빌드
add_subdirectory(libs/mylib)
target_link_libraries(app PRIVATE MyLib::mylib)

# find_package로 찾았을 때도 같은 코드
find_package(MyLib REQUIRED)
target_link_libraries(app PRIVATE MyLib::mylib)
```

별칭이 없으면 `mylib`이 실제 타겟인지 문자열인지 구분하기 어렵습니다. `MyLib::mylib`은 항상 타겟으로 해석되어 오타를 즉시 잡아냅니다.

---

## 서브디렉터리 추가 — `add_subdirectory`

### 기본 사용

```cmake
add_subdirectory(libs/mylib)
```

해당 디렉터리의 `CMakeLists.txt`를 *그 자리에서* 처리하고, 거기 정의된 타겟을 *현재 프로젝트 트리에 흡수*합니다. C 언어로 치면 `#include`와 비슷하지만 *스코프 처리가 다릅니다*.

### 스코프 — 변수가 어디까지 가는가

`add_subdirectory`는 *새로운 디렉터리 스코프*를 만듭니다. 이 스코프가 어떻게 동작하는지 정확히 알지 못하면, *변수가 사라지는* 미스터리에 자주 빠집니다.

```cmake
# 최상위 CMakeLists.txt
set(MY_VAR "parent value")

add_subdirectory(libs/mylib)   # libs/mylib/CMakeLists.txt가 실행됨

message("After subdir: ${MY_VAR}")  # 여전히 "parent value"
```

```cmake
# libs/mylib/CMakeLists.txt
message("In subdir: ${MY_VAR}")     # "parent value" — 부모 값이 보임

set(MY_VAR "child value")            # 자기 스코프에서만 변경
message("After change: ${MY_VAR}")   # "child value"

# 이 스코프는 add_subdirectory가 끝나면 사라짐
```

규칙은 *두 줄*입니다.

1. *부모의 변수는 자식이 읽을 수 있다.* 자식 스코프는 부모 스코프를 상속합니다.
2. *자식의 변수 변경은 부모에게 안 보인다.* `set()`은 자기 스코프만 변경합니다.

이 두 줄이 *Modern CMake 모델*의 기반입니다. 자식 디렉터리에서 만든 *전역 변수가 부모를 오염시키지 않습니다*. 그 결과 모듈성이 보장됩니다.

자식의 값을 *명시적으로 부모로 올리고* 싶을 때는 `set(VAR value PARENT_SCOPE)`을 씁니다. 하지만 이게 자주 등장하면 설계 신호입니다 — *변수 전달 대신 타겟 속성*([Ch 3 PUBLIC/INTERFACE](/blog/tools/cmake/chapter03-targets#가시성-키워드-private-public-interface))을 쓸 수 있는지 다시 보세요.

### 타겟은 스코프를 가로질러 *전역*이다

변수와 달리, *타겟은 한 번 정의되면 프로젝트 전체에서 보입니다*. 이 차이가 매우 중요합니다.

```cmake
# libs/mylib/CMakeLists.txt
add_library(mylib src/mylib.cpp)
target_include_directories(mylib PUBLIC include)
```

```cmake
# 최상위
add_subdirectory(libs/mylib)

add_executable(myapp src/main.cpp)
target_link_libraries(myapp PRIVATE mylib)   # 자식이 만든 타겟이 보임
```

타겟에 붙인 PUBLIC/INTERFACE 옵션은 *스코프 경계를 무시하고* 전이됩니다. 변수처럼 사라지지 않습니다. 이게 Modern CMake가 *변수 대신 타겟에 모든 것을 붙이라*고 권하는 핵심 이유입니다.

### `EXCLUDE_FROM_ALL` — 디폴트 빌드에서 빼기

```cmake
add_subdirectory(third_party/google-benchmark EXCLUDE_FROM_ALL)
```

`EXCLUDE_FROM_ALL`을 주면 *이 서브디렉터리의 타겟이 디폴트 빌드에 포함되지 않습니다*. 사용자가 그 타겟을 *명시적으로 링크*할 때만 빌드됩니다. 외부 라이브러리를 통째로 가져왔지만 *우리 빌드에는 일부만 필요*할 때 자주 등장합니다.

### 프로젝트 구조 예시

```text
project/
├── CMakeLists.txt          ← 최상위
├── libs/
│   ├── math/
│   │   ├── CMakeLists.txt
│   │   ├── include/
│   │   └── src/
│   └── utils/
│       ├── CMakeLists.txt
│       ├── include/
│       └── src/
├── src/
│   └── main.cpp
└── apps/
    └── cli/
        ├── CMakeLists.txt
        └── main.cpp
```

### 최상위 CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.15)
project(MyProject VERSION 1.0.0 LANGUAGES CXX)

# 라이브러리들
add_subdirectory(libs/math)
add_subdirectory(libs/utils)

# 메인 실행 파일
add_executable(myapp src/main.cpp)
target_link_libraries(myapp PRIVATE MyProject::math MyProject::utils)

# 추가 앱
add_subdirectory(apps/cli)
```

### libs/math/CMakeLists.txt

```cmake
add_library(math
    src/add.cpp
    src/multiply.cpp
)
add_library(MyProject::math ALIAS math)

target_include_directories(math
    PUBLIC include
    PRIVATE src
)

target_compile_features(math PUBLIC cxx_std_17)
```

---

## 커스텀 타겟

`add_executable`·`add_library` 외에 *컴파일러 외부 도구*(protoc, doxygen, 셸 스크립트)를 빌드 단계에 통합하는 *커스텀 타겟* 메커니즘이 있습니다. `add_custom_command`와 `add_custom_target`이 그것입니다.

분량이 적지 않아 별도 챕터로 다룹니다 — [Ch 9: Modern Advanced](/blog/tools/cmake/chapter09-modern-advanced#커스텀-타겟--add_custom_command-vs-add_custom_target)에서 자세히.

---

## 실전 예시

계산기 프로젝트의 전체 CMakeLists.txt입니다.

```cmake
cmake_minimum_required(VERSION 3.15)
project(Calculator VERSION 1.0.0 LANGUAGES CXX)

# === 전역 설정 (최소화) ===
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# === 라이브러리 ===
add_library(calclib
    src/calc/add.cpp
    src/calc/subtract.cpp
    src/calc/multiply.cpp
    src/calc/divide.cpp
)
add_library(Calculator::calclib ALIAS calclib)

target_include_directories(calclib
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_options(calclib
    PRIVATE
        $<$<CXX_COMPILER_ID:GNU>:-Wall -Wextra -Wpedantic>
        $<$<CXX_COMPILER_ID:Clang>:-Wall -Wextra -Wpedantic>
        $<$<CXX_COMPILER_ID:MSVC>:/W4 /permissive->
)

# === 메인 실행 파일 ===
add_executable(calc apps/main.cpp)
target_link_libraries(calc PRIVATE Calculator::calclib)

# === 테스트 ===
add_executable(calc_test tests/test_calc.cpp)
target_link_libraries(calc_test PRIVATE Calculator::calclib)
```

---

## 흔한 실수

### 전역 include_directories 사용

```cmake
# 회피: 모든 타겟에 영향
include_directories(include)
add_executable(app1 src/app1.cpp)
add_executable(app2 src/app2.cpp)

# Good: 타겟별 설정
add_executable(app1 src/app1.cpp)
target_include_directories(app1 PRIVATE include)

add_executable(app2 src/app2.cpp)
target_include_directories(app2 PRIVATE other_include)
```

### 가시성 키워드 누락

```cmake
# 회피: CMake 3.x에서 경고 또는 오류
target_link_libraries(app mylib)  # 가시성 없음

# Good: 명시적 가시성
target_link_libraries(app PRIVATE mylib)
```

### 라이브러리에 모든 설정을 PRIVATE으로

```cmake
# 회피: 사용자가 헤더를 찾을 수 없음
add_library(mylib src/mylib.cpp)
target_include_directories(mylib PRIVATE include)  # 공개 헤더인데 PRIVATE

add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE mylib)
# 오류: mylib.hpp를 찾을 수 없음

# Good: 공개 헤더는 PUBLIC
target_include_directories(mylib PUBLIC include)
```

### 별칭 없이 사용

```cmake
# 회피: 오타 시 조용히 문자열로 처리될 수 있음
target_link_libraries(app PRIVATE myliib)  # 오타!
# 링커에서 "myliib" 라이브러리를 찾으려 함

# Good: 별칭 사용
add_library(MyLib::mylib ALIAS mylib)
target_link_libraries(app PRIVATE MyLib::myliib)  # 오타!
# CMake 오류: Target "MyLib::myliib" not found
```

### 순환 의존성

```cmake
# 회피: A → B → A
add_library(A src/a.cpp)
add_library(B src/b.cpp)
target_link_libraries(A PRIVATE B)
target_link_libraries(B PRIVATE A)  # 순환!

# 해결: 공통 부분을 분리
add_library(common src/common.cpp)
add_library(A src/a.cpp)
add_library(B src/b.cpp)
target_link_libraries(A PRIVATE common)
target_link_libraries(B PRIVATE common)
```

---

## 정리

- **타겟**은 CMake의 핵심 빌드 단위입니다.
- `add_executable`: 실행 파일, `add_library`: 라이브러리.
- 라이브러리 종류: `STATIC`, `SHARED`, `INTERFACE`, `OBJECT`.
- **가시성**: `PRIVATE`(내부만), `PUBLIC`(내부+전파), `INTERFACE`(전파만).
- `target_link_libraries`로 타겟을 연결하면 PUBLIC/INTERFACE 속성이 전파됩니다.
- **Modern CMake**: 전역 변수 대신 `target_*` 명령으로 타겟별 설정.
- **별칭**: `MyLib::mylib` 형태로 일관성과 오류 감지 향상.

## 다음 장 예고

Ch 4에서는 옵션과 캐시 변수를 다룹니다. `option()`, `set(... CACHE ...)`, 그리고 CMakePresets.json으로 빌드 구성을 관리합니다.

## 참고 자료

- [CMake - add_library](https://cmake.org/cmake/help/latest/command/add_library.html)
- [CMake - target_link_libraries](https://cmake.org/cmake/help/latest/command/target_link_libraries.html)
- [It's Time To Do CMake Right](https://pabloariasal.github.io/2018/02/19/its-time-to-do-cmake-right/)
