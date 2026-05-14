---
title: "Ch 6: 테스트와 CTest"
date: 2025-05-14T06:00:00
description: "CMake 테스트 프레임워크 CTest와 Google Test, Catch2 연동 방법."
tags: [cmake, build, cpp, testing, ctest]
series: "CMake"
seriesOrder: 6
draft: false
---

## 왜 테스트 자동화가 필요한가

테스트 코드를 작성했다고 가정합니다. 수동으로 실행하면 이렇습니다.

```bash
# 직접 실행 — 반복 작업의 시작
./build/test_math
./build/test_string
./build/test_network
./build/test_integration

# 실패 시 어디서 멈췄는지 확인하려면?
echo $?  # 반환 코드 확인
```

테스트가 10개, 100개로 늘어나면 다음 문제가 생깁니다.

1. **실행 누락** — 어떤 테스트를 돌렸는지 기억에 의존합니다
2. **실패 추적** — 어느 테스트가 실패했는지 한눈에 보기 어렵습니다
3. **병렬 실행** — 순차 실행으로 시간이 오래 걸립니다
4. **CI 연동** — Jenkins, GitHub Actions와 통합하려면 표준화된 인터페이스가 필요합니다

CTest는 이 문제를 해결하는 CMake 내장 테스트 실행 도구입니다.

![CTest 실행 흐름](/images/blog/cmake/diagrams/ch06-ctest-flow.svg)

---

## CTest 기초

### 테스트 활성화

CTest를 사용하려면 `enable_testing()`을 호출해야 합니다. 이 명령은 반드시 최상위 `CMakeLists.txt`에 위치해야 합니다. 하위 디렉터리에서 호출하면 CTest가 테스트를 인식하지 못합니다.

```cmake
# 최상위 CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(MyProject)

enable_testing()  # 반드시 최상위에서 호출

add_subdirectory(src)
add_subdirectory(tests)
```

프로덕션 빌드에서는 테스트를 빼고 싶을 수 있습니다. `BUILD_TESTING` 옵션으로 조건부 활성화가 가능합니다.

```cmake
option(BUILD_TESTING "Enable testing" ON)

if(BUILD_TESTING)
    enable_testing()
    add_subdirectory(tests)
endif()
```

### 테스트 추가

`add_test()`로 테스트를 등록합니다. `NAME`에는 테스트 이름을, `COMMAND`에는 실행할 명령을 지정합니다.

```cmake
# 테스트 실행 파일 생성
add_executable(test_math tests/test_math.cpp)
target_link_libraries(test_math PRIVATE mylib)

# CTest에 등록
add_test(NAME MathTest COMMAND test_math)
```

추가 인자가 필요하면 `COMMAND` 뒤에 나열합니다.

```cmake
add_test(NAME MathTest COMMAND test_math --verbose --filter=Add*)
```

### 테스트 실행

빌드 디렉터리에서 `ctest`를 실행합니다.

```bash
# 기본 실행
cd build
ctest

# CMake를 통한 실행
cmake --build build --target test

# 상세 출력 옵션
ctest --output-on-failure  # 실패한 테스트의 stdout/stderr만 표시
ctest -V                    # verbose — 모든 테스트 출력
ctest -VV                   # extra verbose — 더 자세한 정보
```

기본 출력은 간결합니다.

```
Test project /home/user/project/build
    Start 1: MathTest
1/3 Test #1: MathTest .........................   Passed    0.01 sec
    Start 2: StringTest
2/3 Test #2: StringTest .......................   Passed    0.02 sec
    Start 3: NetworkTest
3/3 Test #3: NetworkTest ......................***Failed    0.15 sec

67% tests passed, 1 tests failed out of 3
```

---

## CTest 옵션

### 필터링

테스트 이름으로 필터링할 수 있습니다. 정규식을 지원합니다.

```bash
ctest -R "Math"           # 이름에 "Math"가 포함된 테스트만
ctest -R "^Unit"          # "Unit"으로 시작하는 테스트만
ctest -E "Slow|Network"   # "Slow" 또는 "Network" 포함 테스트 제외
```

라벨로 필터링하면 테스트 종류별 실행이 가능합니다.

```bash
ctest -L unit             # unit 라벨 테스트만
ctest -L integration      # integration 라벨 테스트만
ctest -LE slow            # slow 라벨 제외
```

### 병렬 실행

테스트가 많으면 병렬 실행으로 시간을 단축합니다.

```bash
ctest -j 4                # 4개 병렬 실행
ctest -j $(nproc)         # CPU 코어 수만큼 병렬 실행
ctest --parallel 8        # -j와 동일
```

병렬 실행 시 주의할 점이 있습니다. 테스트 간에 공유 리소스(파일, 포트, DB)가 있으면 충돌이 발생할 수 있습니다. 이런 테스트는 `RESOURCE_LOCK` 속성으로 직렬화합니다.

```cmake
set_tests_properties(DBTest1 DBTest2 PROPERTIES
    RESOURCE_LOCK "database"
)
```

### 실패 처리 옵션

```bash
ctest --output-on-failure     # 실패한 테스트의 출력만 표시 (CI에서 권장)
ctest --stop-on-failure       # 첫 실패에서 즉시 중단
ctest --rerun-failed          # 이전에 실패한 테스트만 재실행
ctest --repeat until-fail:10  # 10번 연속 성공할 때까지 반복 (플레이키 테스트 탐지)
```

---

## 테스트 속성

`set_tests_properties()`로 테스트별 속성을 설정합니다.

### 타임아웃

무한 루프에 빠진 테스트를 방지합니다. 기본 타임아웃은 1500초(25분)입니다.

```cmake
add_test(NAME SlowTest COMMAND slow_test)
set_tests_properties(SlowTest PROPERTIES TIMEOUT 60)  # 60초 제한

# 여러 테스트에 동시 적용
set_tests_properties(Test1 Test2 Test3 PROPERTIES TIMEOUT 30)
```

### 라벨

테스트를 분류하여 선택적으로 실행할 수 있습니다.

```cmake
add_test(NAME UnitTest1 COMMAND unit_test_1)
add_test(NAME UnitTest2 COMMAND unit_test_2)
add_test(NAME IntegrationTest COMMAND integration_test)
add_test(NAME E2ETest COMMAND e2e_test)

set_tests_properties(UnitTest1 UnitTest2 PROPERTIES LABELS "unit")
set_tests_properties(IntegrationTest PROPERTIES LABELS "integration")
set_tests_properties(E2ETest PROPERTIES LABELS "e2e;slow")  # 복수 라벨
```

CI 파이프라인에서 단계별로 실행할 때 유용합니다.

```bash
# PR 머지 전 — 빠른 테스트만
ctest -L unit -j 8

# 머지 후 — 전체 테스트
ctest -j 4
```

### 환경 변수

테스트 실행 시 환경 변수를 주입합니다.

```cmake
set_tests_properties(MyTest PROPERTIES
    ENVIRONMENT "LOG_LEVEL=debug;DB_HOST=localhost;DB_PORT=5432"
)
```

### 작업 디렉터리

테스트가 특정 디렉터리에서 실행되어야 할 때 사용합니다.

```cmake
set_tests_properties(MyTest PROPERTIES
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}/tests/fixtures
)
```

### 기대 결과 설정

기본적으로 CTest는 반환 코드 0을 성공으로 간주합니다. 이를 변경할 수 있습니다.

```cmake
# 실패를 기대하는 테스트 (반환 코드가 0이 아니면 성공)
set_tests_properties(ExpectedFailTest PROPERTIES WILL_FAIL TRUE)

# 출력에 특정 문자열이 있어야 성공
set_tests_properties(MyTest PROPERTIES
    PASS_REGULAR_EXPRESSION "All tests passed"
)

# 출력에 특정 문자열이 있으면 실패
set_tests_properties(MyTest PROPERTIES
    FAIL_REGULAR_EXPRESSION "ERROR|FAILED|SEGFAULT"
)
```

---

## Google Test 연동

Google Test(GTest)는 가장 널리 쓰이는 C++ 테스트 프레임워크입니다. CMake와의 통합이 잘 되어 있습니다.

### FetchContent로 가져오기

```cmake
include(FetchContent)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)

# Windows에서 런타임 라이브러리 충돌 방지 (중요!)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(googletest)
```

`gtest_force_shared_crt` 옵션은 Windows에서 `/MD`(동적 런타임)와 `/MT`(정적 런타임) 불일치를 방지합니다. 설정하지 않으면 링크 에러가 발생할 수 있습니다.

### 테스트 코드 작성

```cpp
// tests/test_math.cpp
#include <gtest/gtest.h>
#include "mylib/math.hpp"

TEST(MathTest, Add) {
    EXPECT_EQ(add(2, 3), 5);
    EXPECT_EQ(add(-1, 1), 0);
    EXPECT_EQ(add(0, 0), 0);
}

TEST(MathTest, Subtract) {
    EXPECT_EQ(subtract(5, 3), 2);
    EXPECT_EQ(subtract(3, 5), -2);
}

TEST(MathTest, Overflow) {
    // int 오버플로우 테스트
    EXPECT_EQ(add(INT_MAX, 1), INT_MIN);  // 정의되지 않은 동작 주의
}
```

### 자동 테스트 발견

`gtest_discover_tests()`는 테스트 실행 파일을 분석하여 각 `TEST`를 CTest에 개별 등록합니다. 이것이 Google Test 연동의 핵심입니다.

```cmake
# tests/CMakeLists.txt
add_executable(test_math test_math.cpp)
target_link_libraries(test_math PRIVATE
    mylib
    GTest::gtest_main  # main() 함수 제공
)

include(GoogleTest)
gtest_discover_tests(test_math)
```

`gtest_discover_tests()`를 사용하면 테스트 목록이 자동으로 생성됩니다.

```bash
$ ctest -N  # 테스트 목록 확인
Test #1: MathTest.Add
Test #2: MathTest.Subtract
Test #3: MathTest.Overflow
```

### 수동 등록 vs 자동 발견

```cmake
# 수동 등록 — 실행 파일 단위로 하나의 테스트
add_test(NAME MathTests COMMAND test_math)
# ctest -N 결과: Test #1: MathTests

# 자동 발견 — TEST 단위로 개별 테스트
gtest_discover_tests(test_math)
# ctest -N 결과: Test #1: MathTest.Add
#               Test #2: MathTest.Subtract
#               Test #3: MathTest.Overflow
```

자동 발견의 장점:

1. **세밀한 필터링** — `ctest -R "Add"`로 특정 테스트만 실행
2. **병렬화** — 테스트 케이스 단위로 병렬 실행 가능
3. **실패 추적** — 어떤 테스트가 실패했는지 정확히 표시

### 발견 옵션

```cmake
gtest_discover_tests(test_math
    PROPERTIES LABELS "unit"                    # 모든 테스트에 라벨
    DISCOVERY_TIMEOUT 60                        # 발견 타임아웃
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}       # 작업 디렉터리
    TEST_PREFIX "MyProject."                    # 테스트 이름 접두사
)
```

---

## Catch2 연동

Catch2는 헤더 온리로 시작할 수 있는 가벼운 테스트 프레임워크입니다. v3부터는 컴파일된 라이브러리 형태도 지원합니다.

### FetchContent로 가져오기

```cmake
include(FetchContent)

FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG        v3.5.0
)

FetchContent_MakeAvailable(Catch2)
```

### 테스트 작성

```cpp
// tests/test_math.cpp
#include <catch2/catch_test_macros.hpp>
#include "mylib/math.hpp"

TEST_CASE("Addition works correctly", "[math]") {
    REQUIRE(add(2, 3) == 5);
    REQUIRE(add(-1, 1) == 0);

    SECTION("Edge cases") {
        REQUIRE(add(0, 0) == 0);
        REQUIRE(add(INT_MAX, 0) == INT_MAX);
    }
}

TEST_CASE("Subtraction works correctly", "[math]") {
    REQUIRE(subtract(5, 3) == 2);
    REQUIRE(subtract(3, 5) == -2);
}
```

### CMakeLists.txt

```cmake
add_executable(test_math test_math.cpp)
target_link_libraries(test_math PRIVATE
    mylib
    Catch2::Catch2WithMain  # main() 함수 포함
)

include(Catch)
catch_discover_tests(test_math)
```

Catch2의 `SECTION`은 테스트 케이스 안에서 분기를 만들어 코드 재사용을 돕습니다. 각 `SECTION`은 별도의 테스트 실행으로 등록됩니다.

---

## 코드 커버리지

테스트가 코드의 어느 부분을 실행하는지 측정합니다. CI에서 커버리지 리포트를 생성하면 테스트 누락을 발견할 수 있습니다.

### GCC/Clang 커버리지 설정

```cmake
option(ENABLE_COVERAGE "Enable coverage reporting" OFF)

if(ENABLE_COVERAGE)
    if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
        # 테스트 대상 라이브러리에 커버리지 플래그 추가
        target_compile_options(mylib PRIVATE --coverage -O0 -g)
        target_link_options(mylib PRIVATE --coverage)

        # 테스트 실행 파일에도 추가
        target_compile_options(test_math PRIVATE --coverage -O0 -g)
        target_link_options(test_math PRIVATE --coverage)
    endif()
endif()
```

`-O0`은 최적화를 끄고, `-g`는 디버그 정보를 포함합니다. 최적화가 켜져 있으면 인라인 등으로 커버리지가 부정확해집니다.

### 커버리지 측정 및 리포트

```bash
# 커버리지 활성화 빌드
cmake -B build -DENABLE_COVERAGE=ON -DCMAKE_BUILD_TYPE=Debug
cmake --build build

# 테스트 실행 (커버리지 데이터 생성)
ctest --test-dir build

# gcovr로 HTML 리포트 생성
gcovr -r . --html --html-details -o coverage.html

# 또는 lcov 사용
lcov --capture --directory build --output-file coverage.info
lcov --remove coverage.info '/usr/*' '*/tests/*' --output-file coverage.info
genhtml coverage.info --output-directory coverage_html
```

### CI에서 커버리지

GitHub Actions 예시:

```yaml
- name: Build with coverage
  run: |
    cmake -B build -DENABLE_COVERAGE=ON
    cmake --build build

- name: Run tests
  run: ctest --test-dir build --output-on-failure

- name: Generate coverage report
  run: gcovr -r . --xml -o coverage.xml

- name: Upload to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: coverage.xml
```

---

## 실전 예시: 완전한 테스트 설정

프로젝트 구조:

```
mymath/
├── CMakeLists.txt
├── include/
│   └── mymath/
│       ├── add.hpp
│       ├── subtract.hpp
│       └── multiply.hpp
├── src/
│   ├── add.cpp
│   ├── subtract.cpp
│   ├── multiply.cpp
│   └── main.cpp
└── tests/
    ├── CMakeLists.txt
    ├── test_add.cpp
    ├── test_subtract.cpp
    ├── test_multiply.cpp
    └── test_integration.cpp
```

### 최상위 CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyMath VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# === 라이브러리 ===
add_library(mymath
    src/add.cpp
    src/subtract.cpp
    src/multiply.cpp
)
target_include_directories(mymath PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# === 실행 파일 ===
add_executable(calculator src/main.cpp)
target_link_libraries(calculator PRIVATE mymath)

# === 테스트 ===
option(BUILD_TESTING "Enable testing" ON)
option(ENABLE_COVERAGE "Enable coverage" OFF)

if(BUILD_TESTING)
    enable_testing()
    add_subdirectory(tests)
endif()
```

### tests/CMakeLists.txt

```cmake
include(FetchContent)

# === Google Test 가져오기 ===
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# === 커버리지 함수 ===
function(add_coverage_flags target)
    if(ENABLE_COVERAGE AND CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
        target_compile_options(${target} PRIVATE --coverage -O0 -g)
        target_link_options(${target} PRIVATE --coverage)
    endif()
endfunction()

# === 단위 테스트 ===
add_executable(test_math
    test_add.cpp
    test_subtract.cpp
    test_multiply.cpp
)
target_link_libraries(test_math PRIVATE
    mymath
    GTest::gtest_main
)
add_coverage_flags(test_math)

include(GoogleTest)
gtest_discover_tests(test_math
    PROPERTIES LABELS "unit"
    DISCOVERY_TIMEOUT 30
)

# === 통합 테스트 ===
add_executable(test_integration test_integration.cpp)
target_link_libraries(test_integration PRIVATE
    mymath
    GTest::gtest_main
)
add_coverage_flags(test_integration)

gtest_discover_tests(test_integration
    PROPERTIES
        LABELS "integration"
        TIMEOUT 120
)

# === 부모 타겟에도 커버리지 적용 ===
if(ENABLE_COVERAGE)
    add_coverage_flags(mymath)
endif()
```

### 실행 예시

```bash
# 빌드
cmake -B build
cmake --build build

# 모든 테스트 실행
ctest --test-dir build --output-on-failure

# 단위 테스트만
ctest --test-dir build -L unit -j 8

# 특정 테스트만
ctest --test-dir build -R "Add"

# 커버리지 포함 빌드
cmake -B build-cov -DENABLE_COVERAGE=ON -DCMAKE_BUILD_TYPE=Debug
cmake --build build-cov
ctest --test-dir build-cov
gcovr -r . --html -o coverage.html
```

---

## 정리

- `enable_testing()`은 **최상위 CMakeLists.txt**에서 호출해야 합니다.
- `add_test(NAME ... COMMAND ...)`로 테스트를 등록합니다.
- `set_tests_properties()`로 타임아웃, 라벨, 환경 변수 등을 설정합니다.
- `ctest -j N`으로 병렬 실행, `-R`로 필터링, `-L`로 라벨 선택이 가능합니다.
- Google Test는 `gtest_discover_tests()`로 TEST 단위 자동 등록이 가능합니다.
- Catch2는 `catch_discover_tests()`를 사용합니다.
- 커버리지는 `--coverage` 플래그와 gcovr/lcov로 측정합니다.
- `BUILD_TESTING` 옵션으로 프로덕션 빌드에서 테스트를 제외할 수 있습니다.

---

## 흔한 실수

### enable_testing()을 하위 디렉터리에서 호출

```cmake
# tests/CMakeLists.txt
enable_testing()  # ❌ 여기서 호출하면 CTest가 테스트를 못 찾음
add_test(NAME MyTest COMMAND test_app)
```

`enable_testing()`은 반드시 최상위 `CMakeLists.txt`에서 호출해야 합니다. 그래야 `CTestTestfile.cmake`가 올바른 위치에 생성됩니다.

### gtest_force_shared_crt 누락 (Windows)

```cmake
FetchContent_MakeAvailable(googletest)  # ❌ Windows에서 링크 에러

# 올바른 방법
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)  # MakeAvailable 전에!
FetchContent_MakeAvailable(googletest)
```

### gtest_discover_tests가 빌드 시점에 실패

```cmake
gtest_discover_tests(test_math)  # ❌ 크로스 컴파일 시 실패할 수 있음
```

`gtest_discover_tests()`는 빌드된 실행 파일을 실행해서 테스트 목록을 추출합니다. 크로스 컴파일 환경에서는 호스트에서 타겟 바이너리를 실행할 수 없으므로 실패합니다.

```cmake
# 크로스 컴파일 시 대안
if(CMAKE_CROSSCOMPILING)
    add_test(NAME MathTests COMMAND test_math)  # 수동 등록
else()
    gtest_discover_tests(test_math)
endif()
```

### 테스트 간 의존성 무시

```cmake
# ❌ 테스트가 같은 파일을 사용하면 병렬 실행 시 충돌
add_test(NAME Test1 COMMAND test_app --output=/tmp/result.txt)
add_test(NAME Test2 COMMAND test_app --output=/tmp/result.txt)
```

```cmake
# 올바른 방법 — 리소스 락 사용
set_tests_properties(Test1 Test2 PROPERTIES
    RESOURCE_LOCK "output_file"
)
```

### 커버리지 플래그를 Release 빌드에 적용

```cmake
# ❌ 최적화와 커버리지는 함께 쓰면 부정확
target_compile_options(mylib PRIVATE --coverage)  # -O2와 함께 적용되면 문제
```

```cmake
# 올바른 방법
if(ENABLE_COVERAGE)
    target_compile_options(mylib PRIVATE --coverage -O0 -g)
endif()
```

커버리지 측정은 항상 Debug 빌드(`-O0`)에서 해야 정확합니다.

---

## 다음 장 예고

Ch 7에서는 **설치와 패키징**을 다룹니다. `install()` 명령으로 빌드 결과물을 시스템에 설치하고, CPack으로 배포 패키지를 만드는 방법을 살펴봅니다.

---

## 참고 자료

- [CMake - ctest](https://cmake.org/cmake/help/latest/manual/ctest.1.html)
- [CMake - GoogleTest 모듈](https://cmake.org/cmake/help/latest/module/GoogleTest.html)
- [Google Test 문서](https://google.github.io/googletest/)
- [Catch2 문서](https://github.com/catchorg/Catch2/blob/devel/docs/Readme.md)
