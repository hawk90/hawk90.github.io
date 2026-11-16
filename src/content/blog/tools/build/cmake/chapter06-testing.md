---
title: "CMake 테스트와 CTest — add_test·테스트 fixture·리포트"
slug: "tools/build/cmake/chapter06-testing"
date: 2026-06-02T09:06:00
description: "CMake 테스트 프레임워크 CTest와 Google Test, Catch2 연동 방법."
tags: [cmake, build, cpp, testing, ctest]
series: "CMake"
seriesOrder: 6
draft: false
topics: ["tools", "tools/build"]
---

## 왜 테스트 자동화가 필요한가

테스트 실행 파일이 몇 개 생기는 순간부터 *손으로 돌리는 일이* 부담스러워집니다.

```bash
./build/test_math
./build/test_string
./build/test_network
./build/test_integration
# 어느 게 실패했지? 종료 코드 모음을 따로 추적해야...
```

테스트가 10개, 100개가 되면 네 가지 문제가 따라옵니다.

1. **실행 누락** — 어떤 테스트가 *실행됐는지* 기억에 의존합니다. 셸 스크립트에 새 테스트를 추가하지 않으면 CI는 그 테스트 없이 통과합니다.
2. **실패 추적** — *어느 테스트가* 깨졌는지 즉시 보이지 않습니다. 이어 붙인 로그를 뒤져야 합니다.
3. **병렬 실행** — 셸 루프는 테스트를 하나씩 돌립니다. 병렬로 돌리려면 공유 자원과 순서 의존을 직접 관리해야 합니다.
4. **CI 연동** — CI의 테스트 리포트 화면은 JUnit XML 같은 결과 파일을 읽습니다. 셸 루프는 그런 파일을 만들지 않습니다.

CTest는 CMake와 함께 제공되는 테스트 러너입니다. 테스트 목록·종료 상태·병렬 실행을 관리하고, 3.21부터는 `--output-junit <file>`로 JUnit XML 리포트를 씁니다(3.21 릴리스 노트). CI에서는 테스트 실행과 리포트 수집 단계를 별도로 설정합니다.

![CTest 실행 흐름](/images/blog/cmake/diagrams/ch06-ctest-flow.svg)

CTest는 테스트 프레임워크에 종속되지 않습니다. 실행 파일이나 스크립트를 등록하고 종료 상태를 확인합니다. 이 글의 실행 기준은 CMake/CTest 4.5.0·Ninja 1.13.2·macOS 27.2·AppleClang 21입니다. Google Test v1.15.2와 Catch2 v3.5.0은 FetchContent로 실제로 받아 빌드했고(12코어 Mac에서 `-j8` 빌드 9.3초), 커버리지는 Homebrew GCC 16과 `gcov-16`으로 확인했습니다. 마지막 완성 예제는 외부 테스트 프레임워크 없이 실행 순서와 fixture 실패 처리를 재현합니다.

---

## CTest 기초

### 테스트 활성화

프로젝트의 빌드 루트에서 CTest를 실행하려면 최상위 `CMakeLists.txt`에서 `enable_testing()`을 호출합니다. CTest는 빌드 루트의 `CTestTestfile.cmake`에서 출발해 하위 디렉터리로 내려가는데, 이 파일은 `enable_testing()`을 부른 디렉터리에만 생깁니다. 하위 디렉터리에서만 부르면 어떻게 되는지는 아래 "흔한 실수"에서 실제 출력으로 봅니다.

```cmake
# 최상위 CMakeLists.txt
cmake_minimum_required(VERSION 3.25)
project(MyProject)

enable_testing()  # 반드시 최상위에서 호출

add_subdirectory(src)
add_subdirectory(tests)
```

프로덕션 빌드에서 테스트를 빼려면 `BUILD_TESTING` 옵션으로 조건부 활성화합니다. 이 이름은 CMake의 `CTest` 모듈이 쓰는 이름과 같습니다. `include(CTest)`는 `BUILD_TESTING` 옵션(기본 ON)을 만들고 `enable_testing()`까지 호출하며, 4.5.0으로 구성한 캐시에 `BUILD_TESTING:BOOL=ON`이 생겼습니다.

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
ctest --test-dir build

# CMake를 통한 실행 (4.5.0에서 Ninja·Unix Makefiles 모두 test 타겟이 생김)
cmake --build build --target test

# 상세 출력 옵션
ctest --output-on-failure  # 실패한 테스트의 stdout/stderr만 표시
ctest -V                    # verbose — 모든 테스트 출력
ctest -VV                   # extra verbose — 더 자세한 정보
```

기본 출력은 간결합니다. 4.5.0에서 세 테스트 중 하나가 `FAIL_REGULAR_EXPRESSION`에 걸리도록 만든 결과입니다(경로는 줄임).

```text
Test project .../opt/b
    Start 1: MathTest
1/3 Test #1: MathTest .........................   Passed    0.01 sec
    Start 2: StringTest
2/3 Test #2: StringTest .......................   Passed    0.01 sec
    Start 3: NetworkTest
3/3 Test #3: NetworkTest ......................***Failed  Error regular expression found in output. Regex=[refused]  0.01 sec

67% tests passed, 1 tests failed out of 3

Total Test time (real) =   0.02 sec

The following tests FAILED:
	  3 - NetworkTest (Failed)
Errors while running CTest
Output from these tests are in: .../opt/b/Testing/Temporary/LastTest.log
Use "--rerun-failed --output-on-failure" to re-run the failed cases verbosely.
```

실패한 테스트가 있으면 `ctest`의 종료 코드는 0이 아닙니다(아래 실전 예시에서 8). CI는 이 종료 코드로 단계를 실패 처리합니다.

---

## CTest 옵션

### 필터링

테스트 이름으로 필터링할 수 있습니다. 정규식을 지원합니다.

```bash
ctest -R "Math"           # 이름에 "Math"가 포함된 테스트만
ctest -R "^Unit"          # "Unit"으로 시작하는 테스트만
ctest -E "Slow|Network"   # "Slow" 또는 "Network" 포함 테스트 제외
```

`-R`은 이름 일부만 맞아도 고릅니다. 아래 Google Test·Catch2 예제에서 `ctest -R Add`는 `MathTest.Add`와 `Addition works correctly` 두 개를 실행했습니다. 정확히 하나만 고르려면 `-R '^MathTest\.Add$'`처럼 앵커를 붙입니다.

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
ctest --parallel 4        # 명시적으로 동시 실행 수 지정
ctest --parallel 8        # -j와 동일
```

병렬 실행에서는 테스트끼리 같은 파일·포트·DB를 쓰면 서로의 결과를 덮어씁니다. 이런 테스트는 `RESOURCE_LOCK` 속성으로 같은 이름의 잠금을 걸어 직렬화합니다.

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
ctest --repeat until-fail:10  # 최대 10회, 처음 실패하면 해당 테스트 반복 중단
```

`--repeat <mode>:<n>`은 3.17에 들어왔습니다(그 전에는 3.3의 `--repeat-until-fail <n>`). 4.5.0에서 늘 통과하는 테스트에 `--repeat until-fail:3 -V`를 주면 같은 테스트가 세 번 `Passed`로 찍혔습니다. `--rerun-failed`는 직전 실행의 `Testing/Temporary/LastTestsFailed.log`를 읽어, 앞의 세 테스트 예에서는 `NetworkTest` 하나만 다시 돌렸습니다.

---

## 테스트 속성

`set_tests_properties()`로 테스트별 속성을 설정합니다.

### 타임아웃

무한 루프에 빠진 테스트를 제한하려면 테스트별 `TIMEOUT`을 명시합니다. 설정하지 않았을 때의 값은 프로젝트가 무엇을 불렀는지에 따라 다르고, `ctest -VV`의 `Test timeout computed to be:` 줄에서 확인됩니다. 4.5.0에서 `enable_testing()`만 부른 프로젝트는 `10000000`(초, 사실상 무제한)이었고, `include(CTest)`를 부른 프로젝트는 캐시의 `DART_TESTING_TIMEOUT:STRING=1500`에 따라 `1500`이었습니다. `TIMEOUT 1`을 준 3초짜리 테스트는 `***Timeout   1.02 sec`로 실패했습니다. [TIMEOUT 속성](https://cmake.org/cmake/help/v4.4/prop_test/TIMEOUT.html)을 참고합니다.

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

라벨을 붙이면 CI 단계마다 다른 묶음을 돌릴 수 있습니다.

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

## CTest 고급 — Labels, Fixtures, Properties

### Labels — 테스트 분류

```cmake
add_test(NAME UnitMath COMMAND test_math)
add_test(NAME UnitString COMMAND test_string)
add_test(NAME IntegrationDB COMMAND test_db)
add_test(NAME E2EWorkflow COMMAND test_workflow)

set_tests_properties(UnitMath UnitString PROPERTIES LABELS "unit")
set_tests_properties(IntegrationDB PROPERTIES LABELS "integration;slow")
set_tests_properties(E2EWorkflow PROPERTIES LABELS "e2e;slow")
```

라벨을 붙이면 *원하는 그룹만* 실행할 수 있습니다.

```bash
ctest -L unit              # unit 라벨만
ctest -L "unit|integration"   # 둘 중 하나
ctest -LE slow             # slow 제외
ctest -L unit -L integration  # 두 라벨 모두
```

4.5.0에서 `UnitA`(unit), `IntegB`(integration;slow), `Both`(unit;integration) 세 테스트로 확인한 선택 결과입니다.

| 명령 | 선택된 테스트 |
|------|---------------|
| `ctest -N -L unit` | UnitA, Both |
| `ctest -N -L 'unit\|integration'` | UnitA, IntegB, Both |
| `ctest -N -L unit -L integration` | Both |
| `ctest -N -LE slow -L 'unit\|integration'` | UnitA, Both |

`-L`의 값은 정규식이고, `-L`을 두 번 주면 두 조건을 모두 만족하는 테스트만 남습니다. PR마다 단위 테스트만 돌리고 야간 빌드에서 통합·E2E까지 돌리는 구성을 이 조합으로 만듭니다.

### Fixtures — 테스트 간 setup/teardown 의존성

```cmake
# 1. 시작 - 데이터베이스 세팅
add_test(NAME StartDB COMMAND ./setup_db.sh)
set_tests_properties(StartDB PROPERTIES FIXTURES_SETUP DB)

# 2. 종료 - 정리
add_test(NAME StopDB COMMAND ./cleanup_db.sh)
set_tests_properties(StopDB PROPERTIES FIXTURES_CLEANUP DB)

# 3. DB가 필요한 테스트
add_test(NAME TestQuery COMMAND test_query)
set_tests_properties(TestQuery PROPERTIES FIXTURES_REQUIRED DB)
```

CTest는 *자동으로 순서를 잡습니다*:
1. `TestQuery`를 실행해야 함 → DB fixture 필요
2. `StartDB`(SETUP) 먼저 실행
3. `TestQuery` 실행
4. `StopDB`(CLEANUP) 마지막 실행 — *다른 테스트가 다 끝나기를 기다림*

하나의 setup/cleanup 테스트를 여러 테스트가 공유할 수 있습니다. 같은 fixture에 setup 테스트를 여러 개 지정하면 그 테스트들이 모두 실행됩니다. setup이 실패하면 해당 fixture를 요구하는 테스트는 실행하지 않고 cleanup은 실행합니다(아래 실전 예시에서 실제 출력을 봅니다). `ctest -R TestQuery`처럼 본문 테스트만 골라도 setup·cleanup이 자동으로 함께 실행됩니다. fixture가 동시 자원 사용을 직렬화하지는 않으므로 공유 DB 접근에는 별도 `RESOURCE_LOCK`이 필요합니다.

`ctest -j4`에서도 순서는 지켜집니다. 2초 걸리는 setup 하나, 이를 요구하는 본문 셋, fixture와 무관한 `Free`, cleanup 하나를 4.5.0에서 돌린 결과입니다.

```text
    Start 1: Setup
    Start 5: Free
1/6 Test #5: Free .............................   Passed    0.01 sec
2/6 Test #1: Setup ............................   Passed    2.02 sec
    Start 2: Body1
    Start 3: Body2
    Start 4: Body3
3/6 Test #2: Body1 ............................   Passed    0.02 sec
4/6 Test #3: Body2 ............................   Passed    0.02 sec
5/6 Test #4: Body3 ............................   Passed    0.03 sec
    Start 6: Cleanup
6/6 Test #6: Cleanup ..........................   Passed    0.01 sec
```

`Free`는 setup과 동시에 시작했고, 본문 셋은 setup이 끝난 뒤 함께 시작했으며, cleanup은 본문이 모두 끝난 뒤 시작했습니다.

### 자주 쓰는 테스트 속성

| 속성 | 의미 |
|------|------|
| `TIMEOUT 30` | 30초 안에 안 끝나면 실패 |
| `WILL_FAIL TRUE` | *비-0 종료*가 기대 결과 (음성 테스트) |
| `PASS_REGULAR_EXPRESSION "..."` | 출력에 매칭되어야 통과 |
| `FAIL_REGULAR_EXPRESSION "..."` | 매칭되면 실패 |
| `DISABLED TRUE` | 일시 비활성화 (4.5.0 출력: `***Not Run (Disabled)`) |
| `RUN_SERIAL TRUE` | 다른 테스트와 병렬 실행 금지 |
| `PROCESSORS 4` | 이 테스트가 4 CPU 슬롯을 사용 (자원 추적) |
| `ENVIRONMENT "VAR=value"` | 환경 변수 설정 |
| `WORKING_DIRECTORY "..."` | 시작 디렉터리 |
| `DEPENDS OtherTest` | 선행 테스트가 끝난 뒤 실행. 성공 여부는 조건이 아님 |

`DEPENDS`는 실행 순서만 정합니다. 선행 테스트의 성공이 필요하면 [fixture](https://cmake.org/cmake/help/v4.4/prop_test/FIXTURES_REQUIRED.html)를 사용합니다. [DEPENDS 문서](https://cmake.org/cmake/help/v4.4/prop_test/DEPENDS.html)는 선행 결과를 고려하지 않는다고 명시합니다. `PROCESSORS 4`는 병렬 스케줄러에 슬롯 사용량을 알리는 속성이며, 프로그램의 스레드 수나 CPU 사용을 강제로 제한하는 기능은 아닙니다.

### `ctest_*` 명령 — 스크립트 모드

대시보드 제출이나 복잡한 CI 워크플로에는 *CTest 스크립트*를 씁니다. `CTestScript.cmake` 파일에 절차를 적고 `ctest -S CTestScript.cmake`로 호출합니다.

```cmake
# CTestScript.cmake
set(CTEST_SOURCE_DIRECTORY ".")
set(CTEST_BINARY_DIRECTORY "build")
set(CTEST_CMAKE_GENERATOR "Ninja")

ctest_start("Continuous")
ctest_configure()
ctest_build()
ctest_test(PARALLEL_LEVEL 8)
ctest_coverage()
ctest_submit()
```

`ctest_submit()`은 CDash 같은 *대시보드 서버*에 결과를 올립니다. Kitware가 운영하는 open.cdash.org에는 VTK와 Insight(ITK) 프로젝트 대시보드가 있고, 2026-11-16에 조회한 VTK 대시보드에는 그날 제출된 빌드가 230개였습니다. 위 스크립트는 형식만 보인 것이고 이 글에서 대시보드에 제출해 보지는 않았습니다.

---

## Google Test 연동

Google Test(GTest)는 CMake에 전용 모듈(`GoogleTest`)이 들어 있는 C++ 테스트 프레임워크입니다. 아래 코드는 v1.15.2를 받아 4.5.0에서 실제로 빌드·실행한 것입니다.

### FetchContent로 가져오기

```cmake
include(FetchContent)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.15.2
)

# Windows에서 런타임 라이브러리 충돌 방지 (중요!)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(googletest)
```

`gtest_force_shared_crt`는 googletest 자체의 옵션입니다. v1.15.2의 `cmake/internal_utils.cmake`는 MSVC·Clang에서 googletest를 정적 라이브러리로 빌드하고 이 옵션이 꺼져 있으면 `CMAKE_CXX_FLAGS*`의 `/MD`를 `-MT`로 바꿉니다. CMake 기본값인 `/MD`로 빌드한 내 실행 파일과 섞이면, googletest README가 예로 든 `error LNK2038: mismatch detected for 'RuntimeLibrary': value 'MTd_StaticDebug' doesn't match value 'MDd_DynamicDebug'` 링크 오류가 납니다. 옵션을 켜면 이 치환을 건너뜁니다. Windows에서 직접 재현하지는 않았습니다.

### 테스트 코드 작성

```cpp
// tests/test_math.cpp
#include <gtest/gtest.h>
#include <limits>
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

TEST(MathTest, Boundary) {
    // 오버플로우를 일으키지 않는 경계값 검사
    EXPECT_EQ(add(std::numeric_limits<int>::max(), 0),
              std::numeric_limits<int>::max());
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

`gtest_discover_tests()`는 빌드 직후(기본 `DISCOVERY_MODE POST_BUILD`, 3.18에 옵션 추가) 테스트 실행 파일을 `--gtest_list_tests`로 돌려 목록을 만듭니다. 아래 Catch2 예제까지 함께 빌드한 디렉터리의 4.5.0 출력입니다.

```text
$ ctest --test-dir build -N
Test project .../gt/build
  Test #1: MathTest.Add
  Test #2: MathTest.Subtract
  Test #3: MathTest.Boundary
  Test #4: Addition works correctly
  Test #5: Subtraction works correctly

Total Tests: 5
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
#               Test #3: MathTest.Boundary
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

이 절은 Catch2 v3.5.0의 컴파일된 라이브러리를 연결하는 형태입니다. v2의 헤더 전용 통합 방식과 구분합니다. 앞의 GTest 예제와 같은 빌드 디렉터리에서 실제로 받아 빌드했고, 두 프레임워크 테스트가 모두 통과했습니다.

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
#include <limits>
#include "mylib/math.hpp"

TEST_CASE("Addition works correctly", "[math]") {
    REQUIRE(add(2, 3) == 5);
    REQUIRE(add(-1, 1) == 0);

    SECTION("Edge cases") {
        REQUIRE(add(0, 0) == 0);
        REQUIRE(add(std::numeric_limits<int>::max(), 0) ==
                std::numeric_limits<int>::max());
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

list(APPEND CMAKE_MODULE_PATH "${catch2_SOURCE_DIR}/extras")
include(Catch)
catch_discover_tests(test_math)
```

`catch_discover_tests()`는 테스트 케이스를 CTest에 등록합니다. `SECTION`마다 별도 CTest 항목을 만드는 것은 아닙니다. 위 `ctest -N` 출력에서 `"Edge cases"` SECTION은 따로 나오지 않고 `Addition works correctly` 하나로 등록됐습니다. SECTION은 해당 테스트 케이스 안의 실행 경로를 나누며 실행은 Catch2가 관리합니다. [v3.5.0 CMake 통합 문서](https://github.com/catchorg/Catch2/blob/v3.5.0/docs/cmake-integration.md)를 참고합니다.

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

`-O0`은 최적화를 끄고, `-g`는 디버그 정보를 포함합니다. GCC의 `gcov(1)` 매뉴얼은 최적화가 여러 줄을 하나로 합쳐 줄 단위 통계가 덜 쓸모 있어지므로 gcov를 쓸 때는 최적화 없이 컴파일하라고 적습니다.

GCC 16으로 이 설정을 켜고 `add()`만 부르는 테스트를 돌린 뒤 `gcov-16`을 실행한 결과입니다. 테스트 실행 후 `build/CMakeFiles/mylib.dir/src/math.cpp.gcda`가 생겼습니다.

```text
$ cd build/CMakeFiles/mylib.dir/src && gcov-16 math.cpp.gcda
File '.../cov/src/math.cpp'
Lines executed:50.00% of 2
Creating 'math.cpp.gcov'
$ grep -E ':\s+[23]:' math.cpp.gcov
        1:    2:int add(int a, int b) { return a + b; }
    #####:    3:int subtract(int a, int b) { return a - b; }
```

`#####`가 한 번도 실행되지 않은 줄입니다. 아래 gcovr·lcov 명령은 이 `.gcda`들을 모아 리포트를 만드는 도구이고, 이 환경에는 설치되어 있지 않아 실행하지 않았습니다.

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
  uses: codecov/codecov-action@v7  # 2026-11-16 기준 최신 릴리스 v7.1.1, files 입력 유지
  with:
    files: coverage.xml
```

---

## 실전 예시 — 순서 의존과 성공 의존을 구분하기

다음 두 파일은 외부 프레임워크 없이 CTest의 실패 전파를 확인합니다. OrderFirst는 의도적으로 실패하지만 DEPENDS로 연결한 OrderNext는 실행됩니다. fixture 테스트는 setup 실패 시 본문을 건너뛰고 cleanup을 실행합니다.

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(CTestCheck LANGUAGES NONE)
enable_testing()
option(FAIL_SETUP "Make fixture setup fail" OFF)
add_test(NAME OrderFirst COMMAND "${CMAKE_COMMAND}" -E false)
add_test(NAME OrderNext COMMAND "${CMAKE_COMMAND}" -E echo ORDER_NEXT_RAN)
set_tests_properties(OrderNext PROPERTIES DEPENDS OrderFirst)
add_test(NAME FixtureSetup COMMAND "${CMAKE_COMMAND}"
    "-DFAIL_SETUP=${FAIL_SETUP}" -P "${CMAKE_CURRENT_SOURCE_DIR}/setup.cmake")
set_tests_properties(FixtureSetup PROPERTIES FIXTURES_SETUP DB)
add_test(NAME FixtureBody COMMAND "${CMAKE_COMMAND}" -E echo FIXTURE_BODY_RAN)
set_tests_properties(FixtureBody PROPERTIES FIXTURES_REQUIRED DB)
add_test(NAME FixtureCleanup COMMAND "${CMAKE_COMMAND}" -E echo FIXTURE_CLEANUP_RAN)
set_tests_properties(FixtureCleanup PROPERTIES FIXTURES_CLEANUP DB)
```

setup 스크립트는 옵션에 따라 성공 또는 실패합니다.

```cmake title="setup.cmake"
if(FAIL_SETUP)
    message(FATAL_ERROR "Fixture setup deliberately failed")
endif()
message(STATUS "Fixture setup ready")
```

다음은 같은 빌드 디렉터리를 재구성하는 명령입니다.

```bash
cmake -S . -B build -G Ninja
ctest --test-dir build -R '^Order' -V
ctest --test-dir build -R '^Fixture' -V
cmake -S . -B build -DFAIL_SETUP=ON
ctest --test-dir build -R '^Fixture' -V
```

4.5.0에서 첫 CTest 호출은 종료 코드 8로 끝났지만 `OrderNext`는 실행됐습니다(`-V` 출력 일부).

```text
1/2 Test #1: OrderFirst .......................***Failed    0.01 sec
...
2: ORDER_NEXT_RAN
2/2 Test #2: OrderNext ........................   Passed    0.01 sec
...
50% tests passed, 1 tests failed out of 2
```

두 번째 호출은 fixture 세 테스트가 모두 통과했습니다. `-DFAIL_SETUP=ON`으로 재구성한 뒤의 마지막 호출(`--output-on-failure`로 실행)입니다.

```text
    Start 3: FixtureSetup
1/3 Test #3: FixtureSetup .....................***Failed    0.01 sec
CMake Error at .../fx/setup.cmake:2 (message):
  Fixture setup deliberately failed



    Start 4: FixtureBody
Failed test dependencies: FixtureSetup
2/3 Test #4: FixtureBody ......................***Not Run   0.00 sec
    Start 5: FixtureCleanup
3/3 Test #5: FixtureCleanup ...................   Passed    0.01 sec

33% tests passed, 2 tests failed out of 3
```

`DEPENDS`는 실패한 선행 테스트 뒤에도 다음 테스트를 돌렸고, fixture는 setup이 실패하자 본문을 `Not Run`으로 건너뛰고 cleanup은 돌렸습니다. 두 의존성의 차이가 이 두 출력에 그대로 나옵니다.

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

4.5.0에서 `tests/`에서만 `enable_testing()`을 부른 프로젝트는 빌드 루트에 `CTestTestfile.cmake`가 없고 `build/tests/`에만 생겼습니다. 그 결과 루트에서는 테스트를 찾지 못합니다.

```text
$ ctest --test-dir build
Test project .../sub/b
No tests were found!!!
```

`ctest --test-dir build/tests`처럼 하위 디렉터리를 직접 지정하면 `100% tests passed out of 1`로 돌았습니다. 빌드 루트에서 모든 테스트를 찾게 하려면 최상위에서 활성화합니다.

### gtest_force_shared_crt 누락 (Windows)

```cmake
FetchContent_MakeAvailable(googletest)  # 사용하는 CRT 설정과 맞는지 확인 필요

# 올바른 방법
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)  # MakeAvailable 전에!
FetchContent_MakeAvailable(googletest)
```

### gtest_discover_tests가 빌드 시점에 실패

```cmake
gtest_discover_tests(test_math)  # ❌ 크로스 컴파일에서 빌드 직후 실행 단계가 실패
```

`gtest_discover_tests()`는 빌드 직후 실행 파일을 실행해 목록을 추출합니다. [GoogleTest 모듈 문서](https://cmake.org/cmake/help/latest/module/GoogleTest.html)는 크로스 컴파일 환경에서는 `CROSSCOMPILING_EMULATOR`가 설정되어 있어야 동작한다고 적습니다. 에뮬레이터가 없으면 `DISCOVERY_MODE PRE_TEST`(3.18+)로 발견을 테스트 실행 직전으로 미뤄, 타겟 환경에서 `ctest`를 돌릴 때 목록을 만들게 할 수 있습니다. 수동 `add_test()`로 바꿔도 바이너리가 호스트에서 실행 가능해지지는 않습니다.

```cmake
# 크로스 컴파일 시 대안
if(CMAKE_CROSSCOMPILING)
    # 타겟 장치 실행이나 에뮬레이터를 준비한 뒤 테스트 등록
    message(STATUS "Configure a target runner before registering tests")
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

소스 줄과 실행 결과의 대응을 읽기 쉽게 하려면 최적화를 끈 측정용 구성을 사용합니다. Debug라는 이름 자체가 -O0를 보장하지 않으므로 상세 컴파일 명령을 확인합니다. 최적화된 빌드의 커버리지는 별도의 해석 기준으로 다룹니다.

---

## 다음 장 예고

[Ch 7](/blog/tools/build/cmake/chapter07-install)에서는 **설치와 패키징**을 다룹니다. `install()` 명령으로 빌드 결과물을 시스템에 설치하고, CPack으로 배포 패키지를 만드는 방법을 살펴봅니다.

---

## 참고 자료

- [CMake - ctest](https://cmake.org/cmake/help/v4.4/manual/ctest.1.html)
- [CMake - GoogleTest 모듈](https://cmake.org/cmake/help/v4.4/module/GoogleTest.html)
- [Google Test 문서](https://google.github.io/googletest/)
- [Catch2 문서](https://github.com/catchorg/Catch2/blob/devel/docs/Readme.md)

## 관련 항목

- [Ch 5: find_package와 외부 의존성](/blog/tools/build/cmake/chapter05-find-package) — GoogleTest·Catch2를 가져오는 경로
- [Ch 7: 설치와 패키징](/blog/tools/build/cmake/chapter07-install) — 테스트를 통과한 결과물을 배포 형태로 만들기
- [Ch 8: Modern CMake 모범 사례](/blog/tools/build/cmake/chapter08-best-practices) — 테스트를 포함한 프로젝트 구조 정리
