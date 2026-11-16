---
title: "CMake 언어 분석 — 변수·조건문·함수의 동작"
slug: "tools/build/cmake/chapter02-language"
date: 2026-06-02T09:02:00
description: "CMake 스크립트의 기본 문법: 변수, 리스트, 조건문, 반복문, 함수."
tags: [cmake, build, cpp, syntax]
series: "CMake"
seriesOrder: 2
draft: false
topics: ["tools", "tools/build"]
---

## 왜 CMake 언어를 알아야 하는가

[Ch 1](/blog/tools/build/cmake/chapter01-intro)의 세 줄짜리 CMakeLists.txt는 *시작점*입니다. 실제 프로젝트는 곧 다음과 같은 요구를 만납니다.

- Debug 빌드에서만 특정 매크로를 켜고 싶다.
- GCC와 Clang에서 *다른 경고 옵션*을 쓰고 싶다.
- 소스 파일 목록을 한 자리에 *변수로* 모으고 싶다.
- 반복되는 설정을 *함수*로 묶고 싶다.

이런 요구는 모두 CMake가 *자체 스크립팅 언어*라는 사실에서 출발합니다.

```cmake
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(app PRIVATE -Wall -Wextra -Werror)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    target_compile_options(app PRIVATE /W4 /WX)
endif()
```

이 코드는 이미 만든 `app` 타겟에 컴파일러별 옵션을 붙이는 일부입니다. 이 장에서는 이런 설정이 예상과 다르게 동작할 때 확인할 변수 참조, 인자 분리, 조건 평가와 스코프를 다룹니다.

CMake 언어는 다른 스크립팅 언어와 비교했을 때 *기묘하게 느껴지는 자리*가 몇 군데 있습니다. 변수가 *문자열만 있는 점*, 리스트가 *세미콜론으로 구분되는 점*, `if()`가 *변수 이름을 자동 역참조하는 점*. 다른 언어 경험이 있다면 이런 자리에서 한 번씩 발을 헛디딥니다. 본 장은 그런 함정들을 미리 짚어 둡니다.

문서와 실행 확인의 기준은 **CMake 4.5.0**(macOS, AppleClang 21, Ninja 1.13.2)입니다. 아래 예제는 정책 기준을 3.25로 지정하지만, 3.25 자체로 실행한 결과는 아닙니다. 코드 주석에 적은 결과값은 모두 4.5.0에서 실행해 확인한 값입니다. 변수·리스트·함수 예제는 `cmake -P script.cmake`로 실행하고, `project()`나 `target_*()`가 있는 코드는 `CMakeLists.txt`에서 실행합니다. [스크립트 모드](https://cmake.org/cmake/help/v4.4/manual/cmake-language.7.html#scripts)는 빌드 타겟을 생성하지 않습니다.

---

## CMake 언어 기초

CMake는 *명령어 기반* 언어입니다. 명령 호출은 `명령(인자1 인자2 ...)` 모양입니다. 대입은 `set(...)`, 산술은 `math(EXPR ...)`, 조건식은 `if(...)`의 인자로 적습니다. 연산자를 독립된 대입문에 쓰는 방식과 구분해야 합니다.

```cmake
cmake_minimum_required(VERSION 3.25)
project(MyApp LANGUAGES CXX)
add_executable(app main.cpp)
```

### 대소문자

명령어는 대소문자를 구분하지 않습니다. 관례상 **소문자**를 사용합니다.

```cmake
# 모두 같은 동작
message("Hello")
MESSAGE("Hello")
Message("Hello")

# 권장: 소문자
message("Hello")
```

변수 이름은 대소문자를 **구분**합니다. `MY_VAR`와 `my_var`는 다른 변수입니다.

### 주석

```cmake
# 한 줄 주석

#[[
여러 줄 주석
CMake 3.0 이상에서 지원
]]
```

`#[[ ... ]]` 형태의 bracket comment는 CMake 3.0 릴리스 노트에 Lua의 long bracket을 본뜬 문법으로 처음 나옵니다.

### 인자 구분

소스에 적힌 따옴표 없는 인자는 공백으로 구분합니다. 따옴표 없는 인자를 평가한 결과는 다시 세미콜론에 따라 리스트 요소로 나뉩니다. 따옴표로 감싼 인자는 공백이나 세미콜론이 있어도 인자 하나로 전달합니다. 이 구분은 [명령 인자 규칙](https://cmake.org/cmake/help/v4.4/manual/cmake-language.7.html#command-arguments)에 정의되어 있습니다.

```cmake
# 이 세 줄은 같습니다
set(SRCS main.cpp utils.cpp config.cpp)
set(SRCS "main.cpp" "utils.cpp" "config.cpp")
set(SRCS main.cpp;utils.cpp;config.cpp)
```

---

## 변수 — 모두 *문자열*이다

CMake의 가장 큰 특징 중 하나: *모든 변수는 문자열*입니다. 숫자도, 리스트도, 불리언도 결국 문자열입니다. `10`이라는 변수의 *내부 표현*은 문자열 `"10"`이고, `TRUE`도 문자열 `"TRUE"`입니다. 비교 시점에 CMake가 의미를 *해석*합니다.

이 단일 타입 모델은 단순하지만 함정도 있습니다. 빈 문자열인 변수와 정의되지 않은 변수는 모두 빈 문자열로 확장되지만, `if(DEFINED ...)`로 구분합니다. 리스트를 여러 인자로 전달할지, 문자열 하나로 전달할지는 참조를 따옴표로 감쌌는지에 따라 달라집니다.

### 변수 설정과 참조

`set()` 명령으로 변수를 설정하고, `${변수명}`으로 참조합니다.

```cmake
set(MY_VAR "Hello")
message(${MY_VAR})        # Hello
message("${MY_VAR}")      # Hello
message("Say: ${MY_VAR}") # Say: Hello
```

따옴표 안에서도 변수가 확장됩니다. 소스에 공백이 포함된 값을 직접 적을 때는 따옴표로 묶습니다. 변수 확장 결과의 공백을 셸처럼 다시 분리하지는 않지만, 빈 값과 세미콜론까지 보존해 인자 하나로 전달하려면 `"${MY_VAR}"` 형태를 사용합니다.

```cmake
set(PATH "/usr/local/bin")
set(MSG "Install path is ${PATH}")
message("${MSG}")  # Install path is /usr/local/bin
```

### 변수 해제

```cmake
set(MY_VAR "value")
unset(MY_VAR)
message("${MY_VAR}")  # (빈 문자열)
```

### 변수 스코프

일반 변수는 디렉터리, 함수 호출, `block(SCOPE_FOR VARIABLES)`에서 만든 스코프에 놓입니다. `block()`은 CMake 3.25에 도입됐습니다. 함수는 호출자의 변수를 읽지만, 함수 내부의 일반 `set()`은 함수 스코프에만 기록합니다.

캐시는 그 계층의 부모 스코프가 아니라 별도의 저장소입니다. 변수 참조는 일반 변수를 먼저 찾고, 없으면 캐시를 찾습니다. 프로젝트 구성에서 캐시 값은 빌드 디렉터리의 `CMakeCache.txt`에 저장됩니다. `unset(VAR)` 뒤에 같은 이름의 캐시 값이 다시 보이는 이유도 이 검색 순서 때문입니다. 캐시 변수 `V`를 `"cached"`로 만든 뒤 일반 변수 `V`를 `"normal"`로 덮고 `unset(V)`를 하면, 4.5.0 출력은 `-- 1: normal` 다음에 `-- 2: cached`입니다. 지운 것은 일반 변수뿐이고 캐시 항목은 그대로 남아 있습니다. [변수 스코프](https://cmake.org/cmake/help/v4.4/manual/cmake-language.7.html#variables)와 [set()](https://cmake.org/cmake/help/v4.4/command/set.html) 문서에 두 저장 방식이 구분되어 있습니다.

```cmake
# 현재 스코프
set(VAR "value")

# 부모 스코프로 전달 (함수 내부에서)
set(VAR "value" PARENT_SCOPE)

# 캐시 변수 (영구 저장, 빌드 디렉터리에 저장됨)
set(VAR "value" CACHE STRING "설명")
```

### 환경 변수

```cmake
# 환경 변수 읽기
message("HOME: $ENV{HOME}")

# 현재 CMake 프로세스와 이후 실행하는 자식 프로세스에 적용
set(ENV{MY_VAR} "value")
```

---

## 리스트

CMake에서 리스트는 **세미콜론으로 구분된 문자열**입니다. 별도의 리스트 타입이 없습니다.

```cmake
set(MY_LIST "a;b;c")          # 리스트 (문자열)
set(MY_LIST a b c)            # 같은 결과
set(MY_LIST "a" "b" "c")      # 같은 결과

message("${MY_LIST}")         # a;b;c
```

### 리스트 조작

`list()` 명령으로 리스트를 조작합니다.

```cmake
set(SRCS main.cpp utils.cpp)

# 추가
list(APPEND SRCS config.cpp)
# SRCS = main.cpp;utils.cpp;config.cpp

# 길이
list(LENGTH SRCS LEN)
message("Length: ${LEN}")     # Length: 3

# 인덱스 접근 (0부터 시작)
list(GET SRCS 0 FIRST)
message("First: ${FIRST}")    # First: main.cpp

# 마지막 요소 (-1)
list(GET SRCS -1 LAST)
message("Last: ${LAST}")      # Last: config.cpp

# 제거
list(REMOVE_ITEM SRCS utils.cpp)
# SRCS = main.cpp;config.cpp

# 필터링 (정규식)
list(FILTER SRCS INCLUDE REGEX ".*\\.cpp")

# 정렬
list(SORT SRCS)

# 중복 제거
list(REMOVE_DUPLICATES SRCS)
```

### foreach — 리스트 순회

```cmake
set(SRCS main.cpp utils.cpp config.cpp)

foreach(SRC ${SRCS})
    message("Source: ${SRC}")
endforeach()
```

출력은 `Source: main.cpp`, `Source: utils.cpp`, `Source: config.cpp`입니다.

범위 반복도 지원합니다.

```cmake
# 0부터 5까지
foreach(i RANGE 5)
    message("${i}")
endforeach()
# 출력: 0 1 2 3 4 5

# start, end, step
foreach(i RANGE 1 10 2)
    message("${i}")
endforeach()
# 출력: 1 3 5 7 9
```

### while 반복

```cmake
set(COUNT 0)
while(COUNT LESS 5)
    message("Count: ${COUNT}")
    math(EXPR COUNT "${COUNT} + 1")
endwhile()
```

---

## 문자열 처리

### string 명령

```cmake
set(STR "Hello, World!")

# 길이
string(LENGTH "${STR}" LEN)     # LEN = 13

# 부분 문자열 (시작, 길이)
string(SUBSTRING "${STR}" 0 5 SUBSTR)  # SUBSTR = Hello

# 치환
string(REPLACE "World" "CMake" RESULT "${STR}")
# RESULT = Hello, CMake!

# 대소문자 변환
string(TOUPPER "${STR}" UPPER)  # UPPER = HELLO, WORLD!
string(TOLOWER "${STR}" LOWER)  # LOWER = hello, world!

# 앞뒤 공백 제거
string(STRIP "  hello  " STRIPPED)  # STRIPPED = hello

# 비교
string(COMPARE EQUAL "abc" "abc" IS_EQUAL)  # IS_EQUAL = 1
```

### 정규식

```cmake
# 첫 번째 매칭
string(REGEX MATCH "[0-9]+" NUMS "abc123def456")
# NUMS = 123

# 모든 매칭
string(REGEX MATCHALL "[0-9]+" ALL_NUMS "abc123def456")
# ALL_NUMS = 123;456

# 치환
string(REGEX REPLACE "[0-9]+" "X" RESULT "a1b2c3")
# RESULT = aXbXcX
```

### math 연산

```cmake
math(EXPR RESULT "1 + 2 * 3")     # RESULT = 7
math(EXPR RESULT "(1 + 2) * 3")   # RESULT = 9
math(EXPR RESULT "10 / 3")        # RESULT = 3 (정수 나눗셈)
```

---

## 조건문

### 기본 구조

```cmake
if(condition)
    # ...
elseif(condition)
    # ...
else()
    # ...
endif()
```

`endif()`, `elseif()`, `else()`에 조건을 반복하지 않아도 됩니다(옛날 스타일에서는 반복했습니다).

### 조건식 종류

아래 블록은 조건식 형태를 비교하기 위한 일부입니다. 실행할 때는 각 `if()`에 본문과 `endif()`를 붙입니다.

**불리언 값:**

```cmake
if(TRUE)      # 참
if(FALSE)     # 거짓
if(VAR)       # 정의되어 있고 값이 false 상수가 아니면 참
if(NOT VAR)   # 부정
```

`if(VAR)`는 빈 문자열뿐 아니라 `0`, `OFF`, `NO`, `FALSE`, `N`, `IGNORE`, `NOTFOUND`, `-NOTFOUND`로 끝나는 값도 거짓으로 판정합니다. 이름으로 된 불리언 상수는 대소문자를 구분하지 않습니다. 따라서 `set(VAR OFF)` 뒤의 `if(VAR)`는 거짓입니다. 존재 여부만 확인할 때는 `if(DEFINED VAR)`를 씁니다. [if()의 기본 조건](https://cmake.org/cmake/help/v4.4/command/if.html#basic-expressions)을 기준으로 구분합니다.

**문자열 비교:**

```cmake
if(VAR STREQUAL "value")          # 문자열 같음
if(VAR STREQUAL "")               # 빈 문자열 확인
if("${VAR}" STREQUAL "value")     # 권장: 따옴표로 감싸기
```

**숫자 비교:**

```cmake
if(VAR EQUAL 10)           # 같음
if(VAR LESS 10)            # 미만
if(VAR GREATER 10)         # 초과
if(VAR LESS_EQUAL 10)      # 이하
if(VAR GREATER_EQUAL 10)   # 이상
```

**존재 확인:**

```cmake
if(DEFINED VAR)             # 변수가 정의되어 있으면
if(EXISTS path)             # 파일/디렉터리가 존재하면
if(IS_DIRECTORY path)       # 디렉터리면
if(TARGET target_name)      # 타겟이 존재하면
```

**논리 연산:**

```cmake
if(A AND B)
if(A OR B)
if(NOT A)
if((A OR B) AND C)
```

**정규식 매칭:**

```cmake
if(VAR MATCHES "^[0-9]+$")  # 숫자로만 구성
```

**버전 비교:**

```cmake
if(CMAKE_VERSION VERSION_LESS "3.15")
if(PROJECT_VERSION VERSION_GREATER_EQUAL "2.0.0")
```

### 실전 예시

```cmake
# 빌드 타입별 설정
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    message(STATUS "Debug build - defining DEBUG_MODE")
    add_compile_definitions(DEBUG_MODE)
endif()

# 컴파일러별 경고 옵션
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(app PRIVATE -Wall -Wextra -Wpedantic)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(app PRIVATE -Wall -Wextra -Wpedantic)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    target_compile_options(app PRIVATE /W4 /permissive-)
endif()

# 플랫폼별 설정
if(WIN32)
    target_compile_definitions(app PRIVATE PLATFORM_WINDOWS)
elseif(APPLE)
    target_compile_definitions(app PRIVATE PLATFORM_MACOS)
elseif(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    target_compile_definitions(app PRIVATE PLATFORM_LINUX)
endif()

# 타겟 존재 확인
if(TARGET mylib)
    target_link_libraries(app PRIVATE mylib)
endif()
```

---

## 함수와 매크로

반복되는 코드를 재사용하려면 함수나 매크로를 정의합니다.

### function

```cmake
function(my_function ARG1 ARG2)
    message("ARG1 = ${ARG1}")
    message("ARG2 = ${ARG2}")
    message("ARGC = ${ARGC}")     # 인자 개수
    message("ARGV = ${ARGV}")     # 모든 인자 리스트
    message("ARGN = ${ARGN}")     # 명명되지 않은 추가 인자들
endfunction()

my_function("Hello" "World" "Extra1" "Extra2")
```

출력은 다음과 같습니다.

- `ARG1 = Hello`
- `ARG2 = World`
- `ARGC = 4`
- `ARGV = Hello;World;Extra1;Extra2`
- `ARGN = Extra1;Extra2`

함수는 **자체 스코프**를 가집니다. 함수 안의 일반 `set()`은 바깥 변수를 덮어쓰지 않습니다. 다음 예제는 호출 전에 `MY_VAR`를 해제해 바깥 출력이 빈 문자열이 되도록 합니다.

```cmake
function(set_var)
    set(MY_VAR "inside function")
    message("Inside: ${MY_VAR}")  # inside function
endfunction()

unset(MY_VAR)
set_var()
message("Outside: ${MY_VAR}")     # (빈 문자열)
```

부모 스코프로 값을 전달하려면 `PARENT_SCOPE`를 사용합니다.

```cmake
function(get_version OUTPUT_VAR)
    set(${OUTPUT_VAR} "1.2.3" PARENT_SCOPE)
endfunction()

get_version(VERSION)
message("Version: ${VERSION}")    # Version: 1.2.3
```

### macro

매크로는 **별도 변수 스코프 없이 호출자 스코프에서 실행**됩니다. 매크로의 인자 참조는 함수의 지역 변수와 달리 문자열 치환입니다. 매크로 전체가 C/C++ 전처리기처럼 임의의 소스 텍스트를 바꾸는 도구라는 뜻은 아닙니다. [macro() 문서](https://cmake.org/cmake/help/v4.4/command/macro.html#macro-vs-function)는 인자와 제어 흐름의 차이도 설명합니다.

```cmake
macro(set_var_macro)
    set(MY_VAR "from macro")
endmacro()

set_var_macro()
message("${MY_VAR}")  # from macro (호출자 스코프에서 설정됨)
```

### function vs macro

| 특성 | function | macro |
|------|----------|-------|
| 스코프 | 자체 스코프 | 호출자 스코프 |
| 변수 전달 | `PARENT_SCOPE` 필요 | 자동 반영 |
| 인자 처리 | 지역 변수 | 인자 참조의 문자열 치환 |
| 호출자 변수 | 건드리지 않음 | 매크로 안의 `set()`이 호출자 변수를 덮어씀 |

이 글의 공통 타겟 설정에는 `function()`을 사용합니다. 임시 변수가 호출자에게 남지 않기 때문입니다. 함수 안에서도 `target_*()`로 타겟 속성을 바꿀 수 있으므로, 타겟을 설정하려고 매크로를 선택할 필요는 없습니다.

### 실전 예시

공통 설정을 함수로 묶는 패턴입니다.

```cmake
function(add_my_executable TARGET_NAME)
    # ARGN은 추가 인자들 (소스 파일)
    add_executable(${TARGET_NAME} ${ARGN})

    # 공통 설정 적용
    target_compile_features(${TARGET_NAME} PRIVATE cxx_std_17)

    if(MSVC)
        target_compile_options(${TARGET_NAME} PRIVATE /W4)
    else()
        target_compile_options(${TARGET_NAME} PRIVATE -Wall -Wextra)
    endif()

    # 공통 정의
    target_compile_definitions(${TARGET_NAME} PRIVATE
        $<$<CONFIG:Debug>:DEBUG_BUILD>
    )
endfunction()

# 사용
add_my_executable(app1 main1.cpp utils.cpp)
add_my_executable(app2 main2.cpp)
```

---

## 제너레이터 표현식

**제너레이터 표현식(Generator Expressions)**은 CMake 구성 시점이 아니라 **빌드 시스템 생성 시점**에 평가됩니다. `$<...>` 문법을 사용합니다.

### 왜 필요한가

일반 변수는 CMake 실행 시점에 평가됩니다. 그러나 어떤 정보는 빌드 시스템이 생성될 때까지 알 수 없습니다.

```cmake
# 문제: multi-config 생성기는 CMAKE_BUILD_TYPE으로 구성을 선택하지 않음
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_definitions(app PRIVATE DEBUG_MODE)
endif()
```

Visual Studio나 Xcode는 **multi-config 생성기**입니다. 구성 시점에는 빌드 타입을 모르고, 빌드 시점에 선택합니다. 이때 제너레이터 표현식을 사용합니다.

```cmake
# 해결: 생성 시점에 각 구성에 맞는 정의를 기록
target_compile_definitions(app PRIVATE
    $<$<CONFIG:Debug>:DEBUG_MODE>
)
```

### 기본 문법

제너레이터 식은 *세 종류의 패턴*을 가집니다.

```cmake
# 1. 조건부 — 조건이 참이면 값, 거짓이면 빈 문자열
$<조건:값>

# 2. if-else — 조건이 참이면 첫 인자, 거짓이면 두 번째
$<IF:조건,참값,거짓값>

# 3. 속성/정보 참조 — 타겟 정보 추출
$<TARGET_FILE:타겟>
```

### 중첩 구문 — `$<$<...>:...>`이 무엇을 의미하는가

제너레이터 식에서 가장 헷갈리는 것은 *중첩 구문*입니다.

```cmake
target_compile_definitions(app PRIVATE
    $<$<CONFIG:Debug>:DEBUG_MODE>
)
```

여기엔 `$<...>`이 *두 번* 등장합니다. 안쪽부터 풀어 봅시다.

**1단계 — 안쪽 `$<CONFIG:Debug>`이 무엇을 돌려주는가**

`$<CONFIG:Debug>`은 *질문 형태의 표현*입니다. "지금 빌드 구성이 Debug인가?" 그 결과는 *1 또는 0*입니다.

- 빌드 타입이 Debug면 → `1`
- 그 외 (Release / RelWithDebInfo / MinSizeRel) → `0`

**2단계 — 바깥 `$<조건:값>`은 어떻게 결합되는가**

`$<조건:값>` 형태는 "*조건이 1이면 값을 내고, 0이면 빈 문자열을 낸다*"는 의미입니다. 안쪽 결과 1/0이 그대로 바깥의 조건이 됩니다.

따라서 전체는 이렇게 풀립니다.

| `CONFIG` | `$<CONFIG:Debug>` | `$<$<CONFIG:Debug>:DEBUG_MODE>` |
|----------|-------------------|--------------------------------|
| Debug | `1` | `DEBUG_MODE` |
| Release | `0` | `(빈 문자열)` |

빌드 시스템 생성 단계에서 CMake는 *각 구성마다* 이 식을 풀어 결과를 컴파일러 인자로 넣습니다. Debug 빌드에서는 `-DDEBUG_MODE`가 들어가고, Release 빌드에서는 아무것도 안 들어갑니다.

### `$<IF:...>` — 명시적 if-else

두 분기에 서로 다른 값을 넣으려면 *if-else 형태*를 사용합니다. 다음 예제는 앞선 예제와 달리 Debug 이외 구성에 `NDEBUG`도 추가합니다.

```cmake
target_compile_definitions(app PRIVATE
    $<IF:$<CONFIG:Debug>,DEBUG_MODE,NDEBUG>
)
```

- Debug → `DEBUG_MODE`
- Release/기타 → `NDEBUG`

대체값이 필요하면 `$<IF:...>`를 사용합니다. 거짓 분기가 빈 문자열이면 짧은 `$<조건:값>` 형태로 적습니다.

### 왜 `if`로는 안 되는가

같은 일을 단순히 `if`로 적으면 안 되는가? 됩니다 — 단, *single-config 생성기*(Make, Ninja)에서만.

```cmake
# Make, Ninja에서는 동작
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_definitions(app PRIVATE DEBUG_MODE)
endif()
```

문제는 *multi-config 생성기*(Visual Studio, Xcode, Ninja Multi-Config)입니다. 이들은 여러 구성을 생성하고, 빌드할 때 `--config Debug`처럼 하나를 선택합니다. [`CMAKE_BUILD_TYPE`](https://cmake.org/cmake/help/v4.4/variable/CMAKE_BUILD_TYPE.html)은 이 선택을 제어하지 않습니다. 값을 명시적으로 넣어 위 `if()`가 참이 되더라도, 그 정의는 Debug 전용이 아니라 모든 구성에 붙습니다.

아래 "직접 실행해 확인하기"의 `main.cpp`로 확인하면 이렇습니다. `Ninja Multi-Config`에 `-DCMAKE_BUILD_TYPE=Debug`를 주고 구성한 뒤 `--config Release`로 빌드한 실행 파일이 `DEBUG_MODE=ON`을 찍었습니다. 반대로 `CMAKE_BUILD_TYPE` 없이 구성하면 `--config Debug`로 빌드해도 `DEBUG_MODE=OFF`였습니다. 어느 쪽이든 `if()`는 빌드할 구성을 보지 못합니다.

제너레이터 식은 **빌드 시스템 생성 시점에 구성별로 평가**됩니다. 빌드할 때는 이미 생성된 규칙 중 선택한 구성의 규칙을 실행합니다. [평가 시점](https://cmake.org/cmake/help/v4.4/manual/cmake-generator-expressions.7.html#introduction)과 빌드 시점의 구성 선택을 구분해야 합니다.

### 자주 쓰는 표현식

**빌드 타입:**

```cmake
target_compile_definitions(app PRIVATE
    $<$<CONFIG:Debug>:DEBUG_MODE>
    $<$<CONFIG:Release>:NDEBUG>
)
```

**컴파일러:**

```cmake
target_compile_options(app PRIVATE
    "$<$<CXX_COMPILER_ID:GNU>:-Wall;-Wextra>"
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)
```

**플랫폼:**

```cmake
target_link_libraries(app PRIVATE
    $<$<PLATFORM_ID:Linux>:pthread>
    $<$<PLATFORM_ID:Windows>:ws2_32>
)
```

**빌드 vs 설치:**

```cmake
target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)
```

이 패턴은 라이브러리를 만들 때 중요합니다. 빌드할 때는 소스 디렉터리의 include를, 설치 후에는 설치된 include 경로를 사용합니다.

여러 옵션을 내는 표현식은 위 컴파일러 예제처럼 전체를 따옴표로 묶고 내부 값을 세미콜론으로 구분합니다. 공백을 그대로 넣으면 제너레이터 식을 평가하기 전에 명령 인자가 나뉩니다. 자세한 규칙은 [제너레이터 식의 공백과 따옴표](https://cmake.org/cmake/help/v4.4/manual/cmake-generator-expressions.7.html#whitespace-and-quoting)에 있습니다. `INSTALL_INTERFACE`는 설치 명령을 실행할 때 평가한다는 뜻이 아니라, 설치용으로 내보낸 타겟의 사용 요구사항을 나타냅니다.

### 정리 표

| 표현식 | 의미 |
|--------|------|
| `$<CONFIG:Debug>` | 빌드 타입이 Debug면 1 |
| `$<PLATFORM_ID:Linux>` | 플랫폼이 Linux면 1 |
| `$<CXX_COMPILER_ID:GNU>` | 컴파일러가 GCC면 1 |
| `$<TARGET_FILE:tgt>` | 타겟의 출력 파일 전체 경로 |
| `$<TARGET_FILE_DIR:tgt>` | 타겟의 출력 디렉터리 |
| `$<BUILD_INTERFACE:...>` | 같은 빌드 트리에서 사용하거나 빌드 트리를 내보낼 때의 내용 |
| `$<INSTALL_INTERFACE:...>` | 설치용 타겟을 내보낼 때의 내용 |
| `$<BOOL:val>` | val이 참이면 1 |
| `$<AND:a,b>` | a AND b |
| `$<OR:a,b>` | a OR b |
| `$<NOT:a>` | NOT a |

---

## message 출력

디버깅과 상태 출력에 `message()`를 사용합니다.

```cmake
message("일반 메시지")
message(STATUS "상태 메시지")         # -- 접두사로 출력
message(WARNING "경고")               # 경고 메시지
message(AUTHOR_WARNING "개발자 경고")  # -Wno-dev로 끌 수 있음
message(SEND_ERROR "오류")            # 오류, 구성은 계속 진행
message(FATAL_ERROR "치명적 오류")     # 오류, 즉시 중단
```

`AUTHOR_WARNING`과 `SEND_ERROR` 다음에 `message(STATUS "still running")`을 둔 프로젝트를 4.5.0으로 구성한 출력입니다.

```text
CMake Warning (author) at CMakeLists.txt:8 (message):
  dev warning
This warning is for project developers.  Use -Wno-author to suppress it.

CMake Error at CMakeLists.txt:9 (message):
  send error


-- still running
-- Configuring incomplete, errors occurred!
```

`SEND_ERROR` 뒤의 명령은 계속 실행되지만 구성 결과는 "incomplete"이고 `cmake`의 종료 코드는 1입니다. 빌드 디렉터리에는 `CMakeCache.txt`와 `CMakeFiles/`만 있고 `Makefile`은 생성되지 않았습니다. `-Wno-dev`를 주고 다시 구성하면 author 경고 블록이 사라졌습니다.

```cmake
# 변수 디버깅
message(STATUS "CMAKE_CXX_COMPILER: ${CMAKE_CXX_COMPILER}")
message(STATUS "CMAKE_BUILD_TYPE: ${CMAKE_BUILD_TYPE}")
message(STATUS "PROJECT_SOURCE_DIR: ${PROJECT_SOURCE_DIR}")
```

---

## 흔한 실수

### 변수 참조 시 따옴표 누락

```cmake
# 회피: 빈 문자열일 때 문제 발생
if(${MY_VAR} STREQUAL "value")  # MY_VAR이 비어 있으면 구문 오류

# Good: 따옴표로 감싸기
if("${MY_VAR}" STREQUAL "value")
```

`${MY_VAR}`이 빈 문자열이면 `if( STREQUAL "value")`가 됩니다. 4.5.0의 실제 오류입니다.

```text
CMake Error at e1.cmake:3 (if):
  if given arguments:

    "STREQUAL" "value"

  Unknown arguments specified
```

`set(MY_VAR "")`로 빈 값을 넣은 경우와 `unset(MY_VAR)`로 지운 경우 모두 같은 오류였습니다. 따옴표로 감싸면 `if("" STREQUAL "value")`가 되어 거짓으로 평가됩니다.

### 리스트와 문자열 혼동

```cmake
set(PATH "C:/Program Files/MyApp")
message("${PATH}")  # C:/Program Files/MyApp

# 공백은 변수 확장 후 다시 분리하지 않음
foreach(P ${PATH})
    message("${P}")  # C:/Program Files/MyApp (한 번 출력)
endforeach()

# 리스트는 세미콜론으로 요소를 나눔
set(PATHS "C:/Program Files/MyApp;D:/SDK")
foreach(P IN LISTS PATHS)
    message("${P}")  # 두 경로를 각각 출력
endforeach()
```

경로 하나를 인자 하나로 넘길 때는 `"${PATH}"`, 리스트를 순회할 때는 `foreach(P IN LISTS PATHS)`로 의도를 드러냅니다. `foreach(P "${PATHS}")`는 전체 문자열 하나를 순회하므로 리스트 순회와 다릅니다.

### if() 조건의 자동 변수 역참조

```cmake
set(VAR "SOME_VALUE")
set(SOME_VALUE OFF)

# VAR의 값은 SOME_VALUE라는 비어 있지 않은 문자열
if(VAR)
    message("VAR=true")
endif()

# 먼저 ${VAR}를 확장하면 if(SOME_VALUE)가 되어 OFF를 검사
if(${VAR})
    message("expanded=true")
else()
    message("expanded=false")
endif()
```

결과는 `VAR=true`, `expanded=false`입니다. `if(VAR)`가 변수 이름을 계속 따라가는 것은 아닙니다. `${VAR}`를 먼저 확장한 뒤 `if()`가 받은 인자가 달라진 결과입니다. 존재 여부는 `if(DEFINED VAR)`, 불리언 해석은 `if(VAR)`, 문자열 비교는 `if("${VAR}" STREQUAL "SOME_VALUE")`로 목적에 맞게 구분합니다.

### function에서 PARENT_SCOPE 누락

```cmake
# 회피: 값이 반환되지 않음
function(get_value OUTPUT)
    set(${OUTPUT} "result")
endfunction()

get_value(MY_RESULT)
message("${MY_RESULT}")  # (빈 문자열)

# Good: PARENT_SCOPE 사용
function(get_value OUTPUT)
    set(${OUTPUT} "result" PARENT_SCOPE)
endfunction()

get_value(MY_RESULT)
message("${MY_RESULT}")  # result
```

### 제너레이터 표현식 디버깅 불가

```cmake
# 회피: 구성 시점에 출력하면 리터럴 문자열
message("Value: $<CONFIG>")  # 출력: Value: $<CONFIG>

# 생성 시점에 평가한 값을 구성별 파일에 기록
file(GENERATE
    OUTPUT "${CMAKE_BINARY_DIR}/debug-genex-$<CONFIG>.txt"
    CONTENT "Config: $<CONFIG>\n"
)
```

---

## `cmake_policy()` — 정책 시스템

`cmake_minimum_required(VERSION 3.25)`는 3.25까지 도입된 정책을 `NEW`로 설정합니다. 그 뒤에 도입된 정책까지 자동으로 설정하는 것은 아닙니다. 정책은 CMake가 기존 동작을 바꿀 때 호환성을 관리하는 장치입니다.

CMake는 버전이 올라가면서 *기존 동작을 바꿔야 했던 결정*들을 *번호가 매겨진 정책*으로 등록합니다. 예: `CMP0048`, `CMP0077`, `CMP0135`.

각 정책은 *OLD*와 *NEW* 두 동작을 가집니다.
- *OLD* — 정책 도입 *이전*의 동작 (역호환성).
- *NEW* — 도입 *이후*의 새 동작 (권장).

```cmake
cmake_policy(GET CMP0077 RESULT)
message("CMP0077: ${RESULT}")    # 위 최소 버전 선언 뒤에는 NEW

# 특정 정책을 명시적으로 설정
cmake_policy(SET CMP0077 NEW)
```

정책 값은 최소 버전 선언이 한꺼번에 정합니다. 그 범위 밖의 정책은 미설정이고, `cmake_policy(GET ...)`은 빈 문자열을 돌려줍니다. `VERSION 3.25` 아래에서 3.13의 `CMP0077`과 3.24의 `CMP0135`는 `NEW`였고, 3.31에 들어온 `CMP0180`은 빈 값이었습니다. [cmake-policies(7)](https://cmake.org/cmake/help/latest/manual/cmake-policies.7.html)은 미설정 정책에 OLD 동작을 쓰고, 정책마다 "설정되지 않았다"는 경고를 붙일 수 있다고 적습니다. `cmake_policy(SET ...)`로 경고만 끄면 동작을 고른 것이므로, 그 정책 문서의 OLD·NEW 설명을 읽고 정합니다.

```cmake
# CMake 3.24에 도입된 아카이브 추출 시각 정책
cmake_policy(GET CMP0135 TIMESTAMP_POLICY)
message("CMP0135: ${TIMESTAMP_POLICY}")  # 최소 버전 3.25이면 NEW
```

[`CMP0135`](https://cmake.org/cmake/help/v4.4/policy/CMP0135.html)는 URL로 받은 아카이브를 풀 때 파일 시각을 어떻게 정할지 다룹니다. `DOWNLOAD_EXTRACT_TIMESTAMP`를 지정하지 않았을 때 `OLD`는 아카이브 안의 시각을 복원하고, `NEW`는 추출 시각을 사용합니다. 해시 검증을 설정하는 `URL_HASH`와는 다른 기능입니다. 정책 전체 목록은 [공식 정책 문서](https://cmake.org/cmake/help/v4.4/manual/cmake-policies.7.html)에 있습니다.

## 직접 실행해 확인하기

문법 조각만 보고 넘어가면 공백·세미콜론·불리언의 차이를 놓치기 쉽습니다. 다음 내용을 `language-check.cmake`로 저장하면 타겟이나 컴파일러 없이 세 동작을 확인할 수 있습니다.

```cmake title="language-check.cmake"
cmake_minimum_required(VERSION 3.25)
set(APP_PATH "C:/Program Files/MyApp")
foreach(P ${APP_PATH})
    message(STATUS "path=[${P}]")
endforeach()
set(PATHS "${APP_PATH};D:/SDK")
list(LENGTH PATHS PATH_COUNT)
message(STATUS "paths=${PATH_COUNT}")
foreach(V IN ITEMS OFF "" SOME_VALUE)
    if(V)
        message(STATUS "bool=[${V}]:true")
    else()
        message(STATUS "bool=[${V}]:false")
    endif()
endforeach()
set(VAR SOME_VALUE)
set(SOME_VALUE OFF)
if(VAR)
    message(STATUS "VAR=true")
endif()
if(NOT ${VAR})
    message(STATUS "expanded=false")
endif()
string(COMPARE EQUAL "abc" "abc" IS_EQUAL)
message(STATUS "equal=${IS_EQUAL}")
cmake_policy(GET CMP0135 TIMESTAMP_POLICY)
message(STATUS "CMP0135=${TIMESTAMP_POLICY}")
```

저장한 파일이 있는 디렉터리에서 실행합니다.

```bash
cmake -P language-check.cmake
```

CMake 4.5.0에서 확인한 출력은 다음과 같습니다. 경로의 공백은 보존되고, `OFF`는 비어 있지 않아도 거짓이며, 문자열 비교 결과는 `1`입니다.

```text
-- path=[C:/Program Files/MyApp]
-- paths=2
-- bool=[OFF]:false
-- bool=[]:false
-- bool=[SOME_VALUE]:true
-- VAR=true
-- expanded=false
-- equal=1
-- CMP0135=NEW
```

제너레이터 식은 `-P` 대신 최소 프로젝트로 확인합니다. 별도 빈 디렉터리에 다음 `CMakeLists.txt`와 `main.cpp`를 저장합니다. `file(GENERATE)`의 파일명에 구성을 넣었으므로 여러 구성의 결과가 같은 파일을 덮어쓰지 않습니다.

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(LanguageCheck LANGUAGES CXX)
add_executable(app main.cpp)
target_compile_definitions(app PRIVATE
    $<$<CONFIG:Debug>:DEBUG_MODE>
)
target_compile_options(app PRIVATE
    "$<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:-Wall;-Wextra>"
)
file(GENERATE
    OUTPUT "${CMAKE_BINARY_DIR}/config-$<CONFIG>.txt"
    CONTENT "Config: $<CONFIG>\nDebug: $<IF:$<CONFIG:Debug>,ON,OFF>\n"
)
```

이 프로그램은 실제 컴파일에 `DEBUG_MODE`가 전달됐는지 출력합니다.

```cpp title="main.cpp"
#include <iostream>
int main() {
#ifdef DEBUG_MODE
    std::cout << "DEBUG_MODE=ON\n";
#else
    std::cout << "DEBUG_MODE=OFF\n";
#endif
}
```

아래 명령은 Ninja가 설치된 macOS·Linux 셸을 기준으로 합니다. 단일 구성 생성기는 빌드 디렉터리를 나누고, 다중 구성 생성기는 같은 디렉터리에서 구성을 선택합니다.

```bash
cmake -S . -B build-debug -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build-debug
./build-debug/app
cmake -S . -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release
./build-release/app

cmake -S . -B build-multi -G "Ninja Multi-Config"
cmake --build build-multi --config Debug
./build-multi/Debug/app
cmake --build build-multi --config Release
./build-multi/Release/app
```

4.5.0에서 실행 결과는 순서대로 `DEBUG_MODE=ON`, `DEBUG_MODE=OFF`, `DEBUG_MODE=ON`, `DEBUG_MODE=OFF`였습니다. 구성 명령이 끝난 시점에 `build-debug/`에는 `config-Debug.txt`(`Config: Debug`, `Debug: ON`), `build-release/`에는 `config-Release.txt`(`Debug: OFF`)가 이미 생겨 있습니다. `build-multi/`에는 빌드 전부터 `config-Debug.txt`·`config-Release.txt`·`config-RelWithDebInfo.txt` 세 개가 있습니다. 생성 단계가 `CMAKE_CONFIGURATION_TYPES`의 구성마다 식을 한 번씩 평가했다는 증거입니다. Debug 빌드의 컴파일 명령(`cmake --build build-debug -v`)에는 `-DDEBUG_MODE`와 `-Wall -Wextra`가 들어 있었습니다.

## 정리

- 변수 확장 결과의 공백은 다시 인자로 나뉘지 않습니다. 세미콜론 리스트와 구분합니다.
- 문자열 하나를 전달할 때는 `"${VAR}"`, 리스트 순회에는 `foreach(... IN LISTS VAR)`를 사용합니다.
- `if(VAR)`의 불리언 해석, `if(DEFINED VAR)`의 존재 검사, `STREQUAL`의 문자열 비교를 구분합니다.
- 함수의 일반 변수 변경은 함수 스코프에 남습니다. 값을 호출자에게 전달할 때는 `PARENT_SCOPE`를 사용합니다.
- 제너레이터 식은 빌드 시스템 생성 시점에 구성별로 평가합니다. 여러 옵션을 내는 식은 전체를 따옴표로 묶습니다.
- 정책은 호환 동작을 선택합니다. `CMP0135`의 추출 시각과 `URL_HASH`의 해시 검증은 별개입니다.

## 다음 장 예고

[Ch 3: 타겟](/blog/tools/build/cmake/chapter03-targets)에서는 `add_executable`·`add_library`·`target_link_libraries`와 `PRIVATE / PUBLIC / INTERFACE`를 다룹니다. 이번 장에서 확인한 변수와 스코프가 타겟의 속성·사용 요구사항과 어떻게 다른지 이어서 살펴봅니다.

## 참고 자료

- [CMake Language 4.4](https://cmake.org/cmake/help/v4.4/manual/cmake-language.7.html)
- [CMake Variables 4.4](https://cmake.org/cmake/help/v4.4/manual/cmake-variables.7.html)
- [Generator Expressions 4.4](https://cmake.org/cmake/help/v4.4/manual/cmake-generator-expressions.7.html)

## 관련 항목

- [Ch 1: CMake 소개와 첫 프로젝트](/blog/tools/build/cmake/chapter01-intro) — 이 문법이 실제로 놓이는 자리
- [Ch 3: 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — 변수 대신 타겟에 정보를 붙이는 방식
- [Ch 4: 옵션과 캐시 변수](/blog/tools/build/cmake/chapter04-options) — 일반 변수와 캐시 변수의 차이를 더 파고드는 장
- [GNU Make 변수와 자동 변수](/blog/tools/build/gnu-make/chapter03-variables) — 재귀 확장과 단순 확장, 같은 문제를 Make는 어떻게 푸는가
- [cmake-policies(7)](https://cmake.org/cmake/help/v4.4/manual/cmake-policies.7.html) — `cmake_policy()`가 다루는 정책 목록
