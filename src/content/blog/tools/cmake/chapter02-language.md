---
title: "Ch 2: CMake 언어 — 변수, 조건문, 함수"
date: 2025-05-14T11:00:00
description: "CMake 스크립트의 기본 문법: 변수, 리스트, 조건문, 반복문, 함수."
tags: [cmake, build, cpp, syntax]
series: "CMake"
seriesOrder: 2
draft: false
---

## 왜 CMake 언어를 알아야 하는가

Ch 1에서 세 줄짜리 CMakeLists.txt를 작성했습니다. 간단한 프로젝트는 이것으로 충분합니다. 그러나 실제 프로젝트에서는 다음과 같은 요구가 생깁니다.

- Debug 빌드에서만 특정 정의를 추가하고 싶다
- GCC와 Clang에서 다른 경고 옵션을 쓰고 싶다
- 소스 파일 목록을 변수로 관리하고 싶다
- 반복되는 설정을 함수로 묶고 싶다

```cmake
# 이런 코드를 작성하려면 CMake 언어를 알아야 합니다
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(app PRIVATE -Wall -Wextra -Werror)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    target_compile_options(app PRIVATE /W4 /WX)
endif()
```

CMake는 자체 스크립팅 언어를 가지고 있습니다. 변수, 리스트, 조건문, 함수 등 프로그래밍 언어의 기본 요소를 제공합니다. 이 장에서 CMake 언어의 핵심을 다룹니다.

---

## CMake 언어 기초

CMake는 **명령어 기반** 언어입니다. 모든 구문은 `명령(인자1 인자2 ...)` 형태입니다.

```cmake
cmake_minimum_required(VERSION 3.15)
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
복잡한 설명이 필요할 때 유용
]]
```

### 인자 구분

인자는 공백이나 세미콜론으로 구분합니다.

```cmake
# 이 세 줄은 같습니다
set(SRCS main.cpp utils.cpp config.cpp)
set(SRCS "main.cpp" "utils.cpp" "config.cpp")
set(SRCS main.cpp;utils.cpp;config.cpp)
```

---

## 변수

### 변수 설정과 참조

`set()` 명령으로 변수를 설정하고, `${변수명}`으로 참조합니다.

```cmake
set(MY_VAR "Hello")
message(${MY_VAR})        # Hello
message("${MY_VAR}")      # Hello
message("Say: ${MY_VAR}") # Say: Hello
```

따옴표 안에서도 변수가 확장됩니다. 공백이 포함된 값은 따옴표로 감싸야 합니다.

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

CMake 변수는 세 가지 스코프를 가집니다.

**CMake 변수 스코프 계층**

- **캐시 스코프** (`CMakeCache.txt`에 저장, 영구)
- **디렉터리 스코프** (`CMakeLists.txt`별)
  - **함수 스코프** (`function` 내부, 호출당 하나)

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

# 환경 변수 설정 (CMake 프로세스 내에서만)
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

출력:

```
Source: main.cpp
Source: utils.cpp
Source: config.cpp
```

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
string(COMPARE EQUAL "abc" "abc" IS_EQUAL)  # IS_EQUAL = TRUE
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

**불리언 값:**

```cmake
if(TRUE)      # 참
if(FALSE)     # 거짓
if(VAR)       # VAR이 TRUE, ON, YES, 1, Y 또는 비어 있지 않으면 참
if(NOT VAR)   # 부정
```

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
    message(STATUS "Debug build - adding debug symbols")
    add_compile_definitions(DEBUG_MODE)
endif()

# 컴파일러별 경고 옵션
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(app PRIVATE -Wall -Wextra -Wpedantic)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(app PRIVATE -Wall -Wextra -Weverything)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    target_compile_options(app PRIVATE /W4 /permissive-)
endif()

# 플랫폼별 설정
if(WIN32)
    target_compile_definitions(app PRIVATE PLATFORM_WINDOWS)
elseif(APPLE)
    target_compile_definitions(app PRIVATE PLATFORM_MACOS)
elseif(UNIX)
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

출력:

```
ARG1 = Hello
ARG2 = World
ARGC = 4
ARGV = Hello;World;Extra1;Extra2
ARGN = Extra1;Extra2
```

함수는 **자체 스코프**를 가집니다. 함수 안에서 설정한 변수는 함수 밖에서 보이지 않습니다.

```cmake
function(set_var)
    set(MY_VAR "inside function")
    message("Inside: ${MY_VAR}")  # inside function
endfunction()

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

매크로는 **호출 위치에서 텍스트 치환**됩니다. 자체 스코프가 없습니다.

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
| 동작 방식 | 함수 호출 | 텍스트 치환 |
| 디버깅 | 예측 가능 | 예상치 못한 부작용 가능 |

**권장**: 대부분의 경우 `function`을 사용하세요. 스코프가 격리되어 예측 가능한 동작을 보장합니다. 매크로는 간단한 텍스트 치환이 필요할 때만 사용합니다.

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
# 문제: CMAKE_BUILD_TYPE은 multi-config 생성기에서 빈 문자열
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_definitions(app PRIVATE DEBUG_MODE)
endif()
```

Visual Studio나 Xcode는 **multi-config 생성기**입니다. 구성 시점에는 빌드 타입을 모르고, 빌드 시점에 선택합니다. 이때 제너레이터 표현식을 사용합니다.

```cmake
# 해결: 빌드 시점에 평가
target_compile_definitions(app PRIVATE
    $<$<CONFIG:Debug>:DEBUG_MODE>
)
```

### 기본 문법

```cmake
# 조건부: 조건이 참이면 값, 거짓이면 빈 문자열
$<조건:값>

# 조건부 if-else
$<IF:조건,참값,거짓값>

# 속성/정보 참조
$<TARGET_FILE:타겟>
```

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
    $<$<CXX_COMPILER_ID:GNU>:-Wall -Wextra>
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

### 정리 표

| 표현식 | 의미 |
|--------|------|
| `$<CONFIG:Debug>` | 빌드 타입이 Debug면 1 |
| `$<PLATFORM_ID:Linux>` | 플랫폼이 Linux면 1 |
| `$<CXX_COMPILER_ID:GNU>` | 컴파일러가 GCC면 1 |
| `$<TARGET_FILE:tgt>` | 타겟의 출력 파일 전체 경로 |
| `$<TARGET_FILE_DIR:tgt>` | 타겟의 출력 디렉터리 |
| `$<BUILD_INTERFACE:...>` | 빌드 시에만 적용 |
| `$<INSTALL_INTERFACE:...>` | 설치 시에만 적용 |
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

`${MY_VAR}`이 빈 문자열이면 `if( STREQUAL "value")`가 되어 구문 오류가 발생합니다. 따옴표로 감싸면 `if("" STREQUAL "value")`가 되어 안전합니다.

### 리스트와 문자열 혼동

```cmake
set(PATH "C:/Program Files/MyApp")
message("${PATH}")  # C:/Program Files/MyApp

# 위험: 공백이 리스트 구분자로 해석될 수 있음
foreach(P ${PATH})
    message("${P}")  # C:/Program, Files/MyApp (두 개로 분리!)
endforeach()

# Good: 따옴표로 감싸기
foreach(P "${PATH}")
    message("${P}")  # C:/Program Files/MyApp
endforeach()
```

### if() 조건의 자동 변수 역참조

```cmake
set(VAR "SOME_VALUE")
set(SOME_VALUE "Hello")

# CMake의 자동 역참조 (혼란스러움)
if(VAR)
    # VAR이 "SOME_VALUE"이고, SOME_VALUE도 정의되어 있으므로
    # 이중 역참조가 발생할 수 있음
endif()

# Good: 명시적으로 참조
if(DEFINED VAR)
    message("VAR is defined: ${VAR}")
endif()
```

CMake의 `if()`는 변수 이름을 자동으로 역참조하는 특이한 동작이 있습니다. 명시적으로 `${VAR}`를 사용하거나 `DEFINED`를 사용하는 것이 안전합니다.

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

# 제너레이터 표현식은 빌드 시점에 평가됨
# 디버깅하려면 file(GENERATE ...) 사용
file(GENERATE
    OUTPUT "${CMAKE_BINARY_DIR}/debug-genex.txt"
    CONTENT "Config: $<CONFIG>\n"
)
```

---

## 정리

- CMake는 **명령어 기반** 스크립팅 언어입니다.
- **변수**는 `set()`으로 설정, `${}`로 참조합니다.
- **리스트**는 세미콜론으로 구분된 문자열이며, `list()` 명령으로 조작합니다.
- **조건문**: `if()`, `elseif()`, `else()`, `endif()`.
- **반복문**: `foreach()`, `while()`.
- **함수**는 자체 스코프를 가지고, **매크로**는 텍스트 치환입니다.
- **제너레이터 표현식**은 빌드 시스템 생성 시점에 평가되며, `$<...>` 문법을 사용합니다.
- 변수 참조 시 따옴표로 감싸는 것이 안전합니다.

## 다음 장 예고

Ch 3에서는 타겟과 라이브러리를 다룹니다. `add_library`, `target_link_libraries`, 그리고 PRIVATE/PUBLIC/INTERFACE 가시성을 살펴봅니다.

## 참고 자료

- [CMake Language](https://cmake.org/cmake/help/latest/manual/cmake-language.7.html)
- [CMake Variables](https://cmake.org/cmake/help/latest/manual/cmake-variables.7.html)
- [Generator Expressions](https://cmake.org/cmake/help/latest/manual/cmake-generator-expressions.7.html)
