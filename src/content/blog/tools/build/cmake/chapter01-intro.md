---
title: "CMake 소개와 첫 프로젝트 — 설치부터 빌드까지"
slug: "tools/build/cmake/chapter01-intro"
date: 2026-06-02T09:01:00
description: "왜 메타 빌드 시스템이 필요한가, CMake가 그 자리에서 무엇을 하는가, 그리고 5줄 짜리 첫 프로젝트."
tags: [cmake, build, cpp]
series: "CMake"
seriesOrder: 1
draft: false
topics: ["tools", "tools/build"]
---

## 왜 CMake가 필요한가

C++ 프로젝트를 Windows·Linux·macOS에서 *모두* 빌드해야 한다고 해 봅시다. Makefile만으로 시작하면 이렇게 됩니다.

```makefile
# Linux용 Makefile
CXX = g++
CXXFLAGS = -Wall -g
LDFLAGS = -lpthread

app: main.o utils.o
	$(CXX) -o $@ $^ $(LDFLAGS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@
```

이걸로 Linux는 빌드됩니다. 그런데 Windows에는 Makefile을 보지 않는 *Visual Studio*가 있고, macOS에는 Xcode가 있습니다. *동일한 코드*를 위해 세 종류의 빌드 파일을 별도로 만들고, 동기화하고, 컴파일러별 옵션 차이(`-Wall` vs `/W4`)를 손으로 맞춰야 합니다. 결과는 다음과 같이 부풀어 오릅니다.

1. **중복 관리** — 새 소스 파일 하나를 추가하면 세 곳을 함께 고쳐야 한다.
2. **동기화 실패** — 한쪽만 갱신하고 다른 쪽을 빠뜨리면, 그 플랫폼에서 빌드해 보기 전까지 아무도 모른다.
3. **플래그 불일치** — 같은 "Release"라도 컴파일러마다 옵션 문자열이 다르다. CMake 4.5.0이 스스로 넣는 Release 기본값만 봐도 GCC는 `-O3 -DNDEBUG`, MSVC는 `/O2 /Ob2 /DNDEBUG`다(`Modules/Compiler/GNU.cmake`, `Modules/Platform/Windows-MSVC.cmake`).

CMake는 정확히 이 문제를 풉니다. *한 개의 `CMakeLists.txt`*에서 *모든 플랫폼의 네이티브 빌드 파일*을 생성합니다.

![CMake — 메타 빌드 시스템 흐름](/images/blog/cmake/diagrams/ch01-cmake-meta-build.svg)

CMake는 *직접 컴파일하지 않습니다*. 호스트 환경을 살피고, 컴파일러를 찾고, 그에 맞는 *생성기*(generator)를 골라 Makefile·Ninja 파일·Visual Studio 솔루션·Xcode 프로젝트를 만들어 냅니다. 실제 컴파일은 생성된 빌드 시스템이 컴파일러를 호출해 수행합니다. 이 분리가 *메타 빌드 시스템*이라는 이름의 핵심입니다.

---

## CMake가 하는 일

CMake의 가장 중요한 다섯 가지 능력입니다.

| 능력 | 의미 |
|------|------|
| 크로스 플랫폼 | Linux / macOS / Windows / BSD / 임베디드 — 동일한 `CMakeLists.txt` |
| 생성기 독립 | Make / Ninja / Visual Studio / Xcode — `-G` 옵션 한 번으로 전환 |
| 외부 라이브러리 탐색 | `find_package`로 OS·패키지 매니저에 설치된 라이브러리를 *자동 발견* |
| 의존성 추적 | 타겟 간 헤더·라이브러리 의존성을 *전이적*으로 관리 |
| IDE 통합 | 3.14에 들어온 [cmake-file-api(7)](https://cmake.org/cmake/help/latest/manual/cmake-file-api.7.html)로 타겟·소스·컴파일 옵션 정보를 IDE에 넘김 |

### Makefile과의 진짜 차이

겉으로 보면 둘 다 빌드 설정을 텍스트로 적습니다. 하지만 *추상화 수준이 한 단계 다릅니다*.

```makefile
# Makefile — "이렇게 컴파일하라"는 규칙 직접 작성
main.o: main.cpp config.hpp
	g++ -std=c++17 -Wall -I./include -c main.cpp -o main.o
```

Makefile은 *어떻게* 컴파일할지를 한 줄 한 줄 명시합니다. 컴파일러 이름, 플래그, 경로, 입출력까지 모두 직접 적습니다.

```cmake
# CMakeLists.txt — "이런 타겟이 있다"는 의도 선언
add_executable(app main.cpp)
target_include_directories(app PRIVATE include)
target_compile_features(app PRIVATE cxx_std_17)
```

CMake는 타겟과 필요한 기능을 선언받아 toolchain에 맞는 빌드 규칙을 만듭니다. `cxx_std_17`은 "C++17 이상"이라는 요구이지 `-std=c++17`이라는 문자열이 아닙니다. CMake 4.5.0·AppleClang 21에서 같은 타겟에 요구 수준만 바꿔 빌드하고 `cmake --build build -v`로 컴파일 명령을 보면 차이가 드러납니다.

| 요구 | 붙은 표준 옵션 |
|------|----------------|
| `cxx_std_11` | 없음 |
| `cxx_std_17` | `-std=gnu++17` |
| `cxx_std_20` | `-std=gnu++20` |

AppleClang 21의 기본 모드가 C++14(`CMAKE_CXX_STANDARD_COMPUTED_DEFAULT`가 `14`)라서 C++11 요구는 옵션 없이 이미 만족됩니다. `gnu++`가 붙는 것은 `CMAKE_CXX_EXTENSIONS`의 기본값이 `ON`이기 때문이고, 이 표 아래쪽 "C++ 표준 지정" 절에서 `OFF`로 바꾼 결과를 봅니다. [target_compile_features](https://cmake.org/cmake/help/v4.4/command/target_compile_features.html)를 참고합니다.

이런 *선언형 모델*의 진가는 외부 라이브러리를 가져올 때 드러납니다. Makefile에서는 "사용자가 OpenSSL을 깔았는지 확인하고 경로를 찾아 `-lssl -lcrypto`를 붙이는" 코드를 직접 짜야 합니다. CMake에서는 `find_package(OpenSSL REQUIRED)`가 CMake에 들어 있는 `FindOpenSSL` 모듈로 경로를 찾고 `OpenSSL::SSL`·`OpenSSL::Crypto` 타겟을 만들어 줍니다. 탐색 순서와 실패했을 때 고치는 방법은 [Ch 5](/blog/tools/build/cmake/chapter05-find-package)에서 다룹니다.

---

## 설치

CMake는 거의 모든 패키지 매니저에 들어 있습니다.

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install cmake
```

설치 후 `cmake --version`을 확인합니다. 이 시리즈의 예제는 최소 버전 3.25를 요구합니다. [packages.ubuntu.com](https://packages.ubuntu.com/search?keywords=cmake&searchon=names&exact=1&suite=all&section=all) 기준으로 22.04(jammy)의 기본 패키지는 3.22.1이라 이 조건을 못 맞추고, 24.04(noble)는 3.28.3, 26.04(resolute)는 4.2.3입니다. 22.04에서는 [Kitware APT 저장소](https://apt.kitware.com/)를 추가하는데, 그 페이지가 지원 배포판별로 keyring과 저장소 줄을 따로 적어 두므로 거기 적힌 명령을 씁니다.

### Linux (Fedora/RHEL)

```bash
sudo dnf install cmake
```

여기서도 설치 뒤 `cmake --version`이 3.25 이상인지 확인합니다.

### macOS

```bash
brew install cmake
```

이 글의 실행 결과는 모두 이 방식으로 설치한 CMake 4.5.0(`/opt/homebrew/bin/cmake`)에서 나왔습니다.

### Windows

```powershell
# winget
winget install Kitware.CMake

# Chocolatey
choco install cmake

# Scoop
scoop install cmake
```

또는 [cmake.org/download](https://cmake.org/download/)에서 설치 프로그램을 받습니다. 설치 프로그램에는 CMake를 `PATH`에 추가하는 선택지가 있습니다. 추가하지 않았다면 PowerShell에서 `cmake`를 이름만으로 부를 수 없고, 설치 경로의 `bin\cmake.exe`를 전체 경로로 불러야 합니다. Windows 쪽 명령은 이 글을 쓰며 실행해 보지 않았습니다.

### 버전 확인

```text
$ cmake --version
cmake version 4.5.0

CMake suite maintained and supported by Kitware (kitware.com/cmake).
```

이 글의 실행 기준은 **CMake 4.5.0·Ninja 1.13.2·GNU Make 4.4.1(Homebrew `gmake`)·macOS 27.2·AppleClang 21.0.0**이고, 플래그 비교에만 Homebrew GCC 16을 함께 썼습니다. 최소 정책 버전은 3.25로 통일합니다. 시리즈 뒤쪽에서 쓰는 FetchContent의 `FIND_PACKAGE_ARGS`는 3.24, presets 스키마 version 6은 3.25에 들어왔습니다(CMake 3.24·3.25 릴리스 노트). Windows·Linux에서 돌린 결과는 이 글에 없습니다. CMake 외에 빌드 도구(Ninja나 Make)와 C++ 컴파일러도 따로 있어야 합니다.

"modern CMake"는 변수를 전역으로 쌓는 대신 타겟에 사용 요구(usage requirement)를 붙이는 방식을 가리킵니다. CMake 3.0 릴리스 노트가 새 기능으로 적은 항목에 헤더만 있는 라이브러리를 표현하는 `INTERFACE` 라이브러리 타입이 있고, 이 시리즈의 [Ch 3](/blog/tools/build/cmake/chapter03-targets)이 그 모델을 다룹니다. 반대로 오래된 최소 버전은 이제 아예 받아들여지지 않습니다. CMake 4.0이 3.5보다 오래된 버전과의 호환을 제거했기 때문인데, 아래 `cmake_minimum_required` 절에서 실제 오류를 봅니다.

---

## 첫 프로젝트

가장 단순한 CMake 프로젝트입니다.

```text
hello/
├── CMakeLists.txt
└── main.cpp
```

```cpp title="main.cpp"
// main.cpp
#include <iostream>

int main() {
    std::cout << "Hello, CMake!" << std::endl;
    return 0;
}
```

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)

project(Hello
    VERSION 1.0.0
    LANGUAGES CXX
)

add_executable(hello main.cpp)
```

세 명령이 기본 타겟을 만듭니다. 하나씩 무엇을 하는지 봅니다.

### `cmake_minimum_required(VERSION 3.25)`

CMake 최소 버전을 선언합니다. 이 버전보다 낮은 CMake로 구성하면 첫 줄에서 멈춥니다. 4.5.0에서 일부러 `VERSION 99.0`을 요구하면 이렇게 나옵니다.

```text
CMake Error at CMakeLists.txt:1 (cmake_minimum_required):
  CMake 99.0 or higher is required.  You are running version 4.5.0
```

이 선언은 *단순한 버전 체크가 아닙니다*. CMake의 *정책(policy)* 데이터베이스를 *그 버전의 동작*으로 설정합니다. CMake는 버전이 올라가면서 *행동을 바꿔야 했던 결정*들을 정책으로 가지고 있는데(예: `OLD` 정책 N과 `NEW` 정책 N), `cmake_minimum_required`가 그 정책의 기본값을 한꺼번에 정합니다.

정책은 기존 동작과 새 동작의 호환성을 관리합니다. 최소 버전 3.25 선언은 그 버전까지 도입된 정책을 NEW로 설정합니다. 이후 정책까지 자동 설정하거나 제거된 OLD 호환성을 되살리는 선언은 아닙니다.

버전 범위도 지정할 수 있습니다.

```cmake
cmake_minimum_required(VERSION 3.25...3.30)
```

이 형태는 "3.25를 최소로 요구하되, 3.30까지 들어온 정책은 NEW로 켜라"는 뜻입니다(`<min>...<policy_max>` 문법은 3.12에 들어왔습니다). 4.5.0에서 정책 값을 직접 읽어 보면 경계가 정확히 3.30에 있습니다.

```text
-- CMP0156(3.29)=NEW CMP0167(3.30)=NEW CMP0180(3.31)= CMAKE_MINIMUM_REQUIRED_VERSION=3.25
```

`VERSION 3.25` 하나만 쓰면 3.25 정책인 `CMP0140`은 NEW이고 3.30 정책인 `CMP0167`은 빈 값(미설정)입니다. 최소 버전이 너무 낮으면 4.x에서는 경고가 아니라 오류입니다. `VERSION 3.4`로 구성한 결과입니다.

```text
CMake Error at CMakeLists.txt:1 (cmake_minimum_required):
  Compatibility with CMake < 3.5 has been removed from CMake.

  Update the VERSION argument <min> value.  Or, use the <min>...<max> syntax
  to tell CMake that the project requires at least <min> but has been updated
  to work with policies introduced by <max> or earlier.

  Or, add -DCMAKE_POLICY_VERSION_MINIMUM=3.5 to try configuring anyway.
```

`VERSION 3.5`는 통과하지만 "Compatibility with CMake < 3.10 will be removed from a future version of CMake."라는 deprecated 경고가 붙습니다. 오래된 서드파티 프로젝트를 4.x로 빌드하다 첫 줄에서 막히는 이유가 이것입니다.

`cmake_minimum_required()`는 최상위 CMakeLists.txt에서 `project()`보다 먼저 호출합니다. [명령 문서](https://cmake.org/cmake/help/latest/command/cmake_minimum_required.html)의 note도 `project()` 앞에 두라고 적습니다.

### `project(...)`

```cmake
project(Hello
    VERSION 1.0.0
    LANGUAGES CXX
)
```

프로젝트 이름과 메타데이터를 설정합니다. 옵션:

| 옵션 | 의미 | 예 |
|------|------|------|
| `VERSION` | 버전 번호 | `1.0.0`, `2.3.1` |
| `LANGUAGES` | 사용 언어 | `C`, `CXX`, `CUDA`, `Fortran`, `OBJC`, `OBJCXX`, `Swift` |
| `DESCRIPTION` | 한 줄 설명 | `"My awesome library"` |
| `HOMEPAGE_URL` | 홈페이지 | `"https://example.com"` |

이 한 줄이 *여러 자동 변수*를 채워 줍니다.

```cmake
message(STATUS "Project: ${PROJECT_NAME}")           # Hello
message(STATUS "Version: ${PROJECT_VERSION}")        # 1.0.0
message(STATUS "Major: ${PROJECT_VERSION_MAJOR}")    # 1
message(STATUS "Source: ${PROJECT_SOURCE_DIR}")      # /path/to/hello
message(STATUS "Binary: ${PROJECT_BINARY_DIR}")      # /path/to/hello/build
```

위 주석의 값은 이 프로젝트를 실제로 구성했을 때 찍힌 값이고, 경로만 줄였습니다. 이 버전 변수들은 시리즈 뒤쪽에서 다시 씁니다. [Ch 4](/blog/tools/build/cmake/chapter04-options)는 `@PROJECT_VERSION_MAJOR@`를 `configure_file`로 헤더에 넣고, [Ch 7](/blog/tools/build/cmake/chapter07-install)은 `${PROJECT_VERSION}`을 `write_basic_package_version_file`과 CPack에 넘깁니다.

### `add_executable(hello main.cpp)`

*실행 파일 타겟*을 생성합니다. 첫 인자가 *타겟 이름*, 그 뒤는 *소스 파일들*.

```cmake
add_executable(hello
    main.cpp
    utils.cpp
    config.cpp
)
```

타겟 이름(`hello`)이 *실행 파일 이름*이 됩니다. Linux에서는 `hello`, Windows에서는 `hello.exe` — 확장자는 CMake가 *플랫폼 관행*에 맞춰 자동 처리합니다.

타겟은 [Ch 3](/blog/tools/build/cmake/chapter03-targets)에서 자세히 다룹니다. CMake의 모든 *Modern* 패턴은 *타겟을 중심*으로 돌아갑니다 — 옵션·include 경로·라이브러리 의존성이 모두 *타겟에 붙는* 방식입니다.

---

## 빌드하기

### Out-of-source 빌드 — 표준 관행

CMake는 *소스 디렉터리와 빌드 디렉터리를 분리*하기를 강하게 권합니다.

```text
hello/                  ← 소스 (불변)
├── CMakeLists.txt
├── main.cpp
└── build/              ← 빌드 산물 (생성·제거 가능)
    ├── CMakeCache.txt
    ├── CMakeFiles/
    ├── Makefile
    └── hello
```

이렇게 분리하면:

- `build/`만 통째로 지우면 *완전한 클린 상태*로 돌아간다. `.gitignore`도 `build/` 한 줄로 끝.
- *복수 빌드 모드*가 가능. `build-debug/`, `build-release/`를 동시에 유지 가능.
- *IDE·에디터*가 소스 트리를 깨끗하게 본다. 빌드 파일이 소스 옆에 안 섞임.

옛날 방식(`cmake .`)은 *in-source 빌드*라 부릅니다. [cmake(1)](https://cmake.org/cmake/help/latest/manual/cmake.1.html)은 이를 "supported, but discouraged"라고 적습니다. in-source 빌드를 아예 막고 싶다면 `project()` 앞에 소스·빌드 디렉터리 비교를 넣습니다.

```cmake
cmake_minimum_required(VERSION 3.25)
if(CMAKE_SOURCE_DIR STREQUAL CMAKE_BINARY_DIR)
  message(FATAL_ERROR "In-source build is not allowed. Use: cmake -B build")
endif()
project(Hello LANGUAGES CXX)
```

```text
$ cmake .
CMake Error at CMakeLists.txt:3 (message):
  In-source build is not allowed.  Use: cmake -B build


-- Configuring incomplete, errors occurred!
$ ls
CMakeCache.txt
CMakeFiles
CMakeLists.txt
main.cpp
```

구성은 멈췄지만 `CMakeCache.txt`와 `CMakeFiles/`는 이미 만들어졌습니다. 이 두 개를 지우지 않으면 다음 `cmake .`도 같은 디렉터리를 빌드 트리로 봅니다.

### 두 단계 — 구성과 빌드

CMake 사용은 *항상 두 단계*입니다.

```bash
# 1단계: 구성 (configure) — CMakeLists.txt 해석, 빌드 파일 생성
cmake -B build

# 2단계: 빌드 (build) — 생성된 빌드 파일로 실제 컴파일
cmake --build build

# 실행
./build/hello
```

`-B build`는 빌드 디렉터리를 `build`로 지정하고, 없으면 만듭니다. `-S`·`-B` 옵션은 CMake 3.13 릴리스 노트에 처음 나오며, 옛 방식(`mkdir build; cd build; cmake ..`)과 달리 디렉터리를 옮겨 다니지 않아도 됩니다.

4.5.0에서 생성기를 지정하지 않고 위 두 파일을 구성·빌드·실행한 결과입니다. 경로는 줄였습니다.

```text
$ cmake -B build
-- The CXX compiler identification is AppleClang 21.0.0.21000401
-- Detecting CXX compiler ABI info
-- Detecting CXX compiler ABI info - done
-- Check for working CXX compiler: /usr/bin/c++ - skipped
-- Detecting CXX compile features
-- Detecting CXX compile features - done
-- Configuring done (0.6s)
-- Generating done (0.0s)
-- Build files have been written to: .../hello2/build
$ cmake --build build
[ 50%] Building CXX object CMakeFiles/hello.dir/main.cpp.o
[100%] Linking CXX executable hello
[100%] Built target hello
$ ./build/hello
Hello, CMake!
```

`cmake --build build`는 생성기가 무엇이든 같은 명령으로 빌드합니다. 실제로 무엇을 부르는지는 `-v`를 붙이면 첫 줄에 나옵니다. Unix Makefiles 빌드 트리에서는 `Run Build Command(s): /opt/homebrew/bin/cmake -E env VERBOSE=1 /opt/homebrew/bin/gmake -f Makefile`, Ninja 빌드 트리에서는 `Run Build Command(s): /opt/homebrew/bin/ninja -v`였습니다. 어느 프로그램을 부를지는 구성할 때 캐시에 적힌 `CMAKE_MAKE_PROGRAM`이 정합니다.

### 생성기 선택 — `-G`

```bash
# Ninja가 설치된 경우
cmake -B build-ninja -G Ninja

# Unix Makefiles — 기본값 (Linux/macOS에서)
cmake -B build-make -G "Unix Makefiles"

# Visual Studio 2022
cmake -B build-vs -G "Visual Studio 17 2022"

# Xcode
cmake -B build-xcode -G Xcode
```

그 플랫폼에서 쓸 수 있는 생성기 목록은 `cmake --help` 출력 끝의 `Generators` 절에 있습니다. macOS의 4.5.0에서는 앞부분이 이렇습니다(뒤쪽 deprecated 항목은 줄였습니다).

```text
The following generators are available on this platform (* marks default):
* Unix Makefiles               = Generates standard UNIX makefiles.
  Ninja                        = Generates build.ninja files.
  Ninja Multi-Config           = Generates build-<Config>.ninja files.
  FASTBuild                    = Generates fbuild.bff files.
  Watcom WMake                 = Generates Watcom WMake makefiles.
  Xcode                        = Generate Xcode project files.
  CodeBlocks - Ninja           = Generates CodeBlocks project files
                                 (deprecated).
...
```

macOS 목록에는 Visual Studio 생성기가 없습니다. Visual Studio·Xcode 생성기는 `.sln`·`.xcodeproj` 같은 프로젝트 파일을 만들어 IDE에서 그대로 열게 해 줍니다.

생성기를 바꾸려면 별도 빌드 디렉터리를 씁니다. Ninja로 구성한 디렉터리에 `-G "Unix Makefiles"`를 다시 주면 이렇게 거부됩니다.

```text
CMake Error: Error: generator : Unix Makefiles
Does not match the generator used previously: Ninja
Either remove the CMakeCache.txt file and CMakeFiles directory or choose a different binary directory.
```

Make와 Ninja 모두 병렬 빌드를 지원합니다. 이 글은 둘의 빌드 시간을 재지 않았으므로 어느 쪽이 몇 배 빠르다는 숫자를 적지 않습니다. [생성기 선택](https://cmake.org/cmake/help/v4.4/manual/cmake.1.html#options)을 참고합니다.

### 빌드 타입 — `-DCMAKE_BUILD_TYPE`

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug      # 디버그
cmake -B build -DCMAKE_BUILD_TYPE=Release    # 릴리스
```

각 타입이 붙이는 옵션은 `CMAKE_CXX_FLAGS_<CONFIG>` 캐시 항목에 있습니다. 4.5.0에서 AppleClang 21과 GCC 16으로 구성한 `CMakeCache.txt`의 값은 둘이 똑같았고, MSVC 값은 실행하지 않고 `Modules/Platform/Windows-MSVC.cmake`에서 옮겼습니다.

| 타입 | AppleClang 21 · GCC 16 (실측) | MSVC (모듈 소스, 런타임 옵션 제외) |
|------|------------------|------|
| `Debug` | `-g` | `/Zi /Ob0 /Od /RTC1` |
| `Release` | `-O3 -DNDEBUG` | `/O2 /Ob2 /DNDEBUG` |
| `RelWithDebInfo` | `-O2 -g -DNDEBUG` | `/Zi /O2 /Ob1 /DNDEBUG` |
| `MinSizeRel` | `-Os -DNDEBUG` | `/O1 /Ob1 /DNDEBUG` |

GCC·Clang의 Debug에는 `-O0`이 없습니다. 최적화 옵션을 아예 주지 않아 컴파일러 기본값(`-O0`)으로 빌드되는 것입니다. MSVC의 `/Zi`는 `CMP0141`이 NEW이면(3.25 최소 버전이면 NEW) 플래그 문자열이 아니라 `MSVC_DEBUG_INFORMATION_FORMAT` 속성으로 들어갑니다. Release는 `-g`를 빼고 `NDEBUG`를 정의할 뿐, 링크 결과를 strip하지는 않습니다.

### Multi-config 생성기 — 빌드 시점 결정

Visual Studio와 Xcode 생성기는 *multi-config*입니다. 구성 시점이 아니라 *빌드 시점*에 타입을 정합니다.

```bash
cmake -B build -G "Visual Studio 17 2022"   # CMAKE_BUILD_TYPE 무시됨

cmake --build build --config Debug
cmake --build build --config Release
```

같은 `build/` 디렉터리에서 Debug·Release를 모두 빌드하고, 산물은 구성 이름의 하위 디렉터리로 갑니다. Visual Studio는 macOS에서 돌릴 수 없어서, 같은 방식의 multi-config 생성기인 `Ninja Multi-Config`(3.17에 추가)로 확인했습니다. 출력의 `...`는 컴파일러 탐지 메시지를 줄인 자리입니다.

```text
$ cmake -B build-mc -G "Ninja Multi-Config" -DCMAKE_BUILD_TYPE=Debug
...
-- Generating done (0.0s)
CMake Warning (unused-cli):
  Manually-specified variables were not used by the project:

    CMAKE_BUILD_TYPE


-- Build files have been written to: .../build-mc
$ cmake --build build-mc --config Debug
$ cmake --build build-mc --config Release
$ ls -d build-mc/*/hello
build-mc/Debug/hello
build-mc/Release/hello
```

multi-config 생성기는 `CMAKE_BUILD_TYPE`을 읽지 않으므로 CMake가 "쓰이지 않은 변수"라고 경고합니다. 구성 목록은 캐시의 `CMAKE_CONFIGURATION_TYPES`(`Debug;Release;RelWithDebInfo`)입니다. 반대로 Make·Ninja는 *single-config*라 구성마다 `build-debug/`, `build-release/`처럼 빌드 디렉터리를 따로 만듭니다.

---

## 프로젝트 구조 확장

### include / src 분리

실제 프로젝트는 *공개 헤더*와 *내부 구현*을 분리합니다.

```text
myproject/
├── CMakeLists.txt
├── include/
│   └── mylib.hpp     ← 공개 API
└── src/
    ├── main.cpp
    └── mylib.cpp     ← 구현
```

```cmake
cmake_minimum_required(VERSION 3.25)

project(MyProject VERSION 1.0.0 LANGUAGES CXX)

add_executable(myapp
    src/main.cpp
    src/mylib.cpp
)

target_include_directories(myapp PRIVATE include)
```

`target_include_directories`로 *이 타겟이 어디서 헤더를 찾는지*를 지정합니다. `PRIVATE`은 *이 타겟에서만* 사용한다는 뜻입니다. PRIVATE·INTERFACE·PUBLIC 세 가지의 의미는 [Ch 3](/blog/tools/build/cmake/chapter03-targets)에서 자세히 다룹니다 — Modern CMake의 *가장 중요한 개념* 중 하나입니다.

### C++ 표준 지정

C++ 표준을 정하는 방법이 두 가지인데, 둘은 *권장도가 다릅니다*.

**전역 설정** (구식, 모든 타겟에 적용)

```cmake
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
```

**타겟별 설정** (권장)

```cmake
target_compile_features(myapp PRIVATE cxx_std_17)
```

`target_compile_features`는 두 가지 점에서 우월합니다.

1. *타겟 범위가 명확*. 한 프로젝트에서 라이브러리는 C++14, 앱은 C++17 같은 분리가 자연스럽습니다.
2. *전이적 전파*가 됩니다. `PUBLIC`으로 설정하면, 이 타겟을 사용하는 *다른 타겟*에도 C++17이 자동 요구됩니다.

전역 설정에는 이 전파가 없습니다. [`CMAKE_CXX_STANDARD`](https://cmake.org/cmake/help/latest/variable/CMAKE_CXX_STANDARD.html)는 "타겟을 만들 때 `CXX_STANDARD` 속성의 기본값"일 뿐이라, 그 값을 설정한 디렉터리에서 만든 타겟에만 붙고 이 라이브러리를 링크하는 다른 프로젝트에는 전해지지 않습니다. 그래서 라이브러리가 C++17을 요구한다는 사실은 `target_compile_features(... PUBLIC cxx_std_17)`로 적어야 소비자에게 전달됩니다.

세 가지 표준 설정 변수의 의미:

| 변수 | 효과 |
|------|------|
| `CMAKE_CXX_STANDARD=17` | C++17 기본 요구 |
| `CMAKE_CXX_STANDARD_REQUIRED=ON` | 지원 없으면 *에러*, 폴백 금지 |
| `CMAKE_CXX_EXTENSIONS=OFF` | `-std=c++17` (표준 모드), `ON`이면 `-std=gnu++17` (확장 허용) |

`CMAKE_CXX_STANDARD 17`·`CMAKE_CXX_STANDARD_REQUIRED ON` 상태에서 `-DCMAKE_CXX_EXTENSIONS=ON`이면 컴파일 명령에 `-std=gnu++17`, `OFF`면 `-std=c++17`이 붙었습니다(AppleClang 21). `OFF`는 언어 모드를 바꿀 뿐 확장 사용을 진단하는 옵션(`-pedantic` 등)을 켜지는 않습니다.

---

## 흔한 실수

### 1. In-source 빌드

```bash
cd hello
cmake .
make
```

Unix Makefiles로 이렇게 구성하면 소스 디렉터리가 이렇게 바뀝니다.

```text
$ ls
cmake_install.cmake
CMakeCache.txt
CMakeFiles
CMakeLists.txt
main.cpp
Makefile
```

생성 파일이 소스 옆에 섞여서 `.gitignore`에 하나하나 적어야 하고, 클린하려면 지울 파일을 골라내야 합니다.

**해결**: 항상 out-of-source.

```bash
cmake -B build
cmake --build build
```

### 2. `cmake_minimum_required` 누락

```cmake
# 안 좋음
project(Hello)
cmake_minimum_required(VERSION 3.25)   # 늦음
```

4.5.0에서는 이 순서가 오류가 아니라 경고입니다.

```text
CMake Warning (author) at CMakeLists.txt:1 (project):
  cmake_minimum_required() should be called prior to this top-level project()
  call.  Please see the cmake-commands(7) manual for usage documentation of
  both commands.
```

문제는 경고가 아니라 `project()`가 실행되는 동안의 정책 상태입니다. `project()` 바로 뒤에서 정책을 읽어 보면 3.0의 `CMP0025`·`CMP0048`은 NEW(4.x에서 3.5 이전 OLD 동작은 제거됨), 3.25의 `CMP0140`은 빈 값이었고, `cmake_minimum_required(VERSION 3.25)`를 지난 뒤에야 `CMP0140`이 NEW가 됐습니다. 컴파일러 탐지와 언어 활성화는 `project()` 안에서 일어나므로, 그 사이에 걸린 정책(예: 3.25의 `CMP0141` MSVC 디버그 정보 형식)은 의도한 값이 아닌 상태로 처리됩니다.

**해결**: 무조건 첫 줄.

```cmake
cmake_minimum_required(VERSION 3.25)
project(Hello)
```

### 3. 빌드 타입 미지정

```bash
cmake -B build       # CMAKE_BUILD_TYPE 빈 문자열
```

single-config 생성기에서 `CMAKE_BUILD_TYPE`을 주지 않으면 캐시에 `CMAKE_BUILD_TYPE:STRING=`(빈 값)이 들어가고, 어느 `CMAKE_CXX_FLAGS_<CONFIG>`도 붙지 않습니다. Ninja로 빌드한 컴파일 명령을 비교하면 이렇습니다.

| 구성 | 컴파일 명령의 옵션 (AppleClang 21) |
|------|------|
| 빈 값 | `-arch arm64` 뿐 |
| `Debug` | `-g -arch arm64` |
| `Release` | `-O3 -DNDEBUG -arch arm64` |

빈 구성은 디버그 정보도 최적화도 없는 빌드라서, Debug로도 Release로도 쓸 수 없습니다. `assert`도 살아 있습니다.

**해결**: 명시적으로 지정.

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug
```

또는 `CMakeLists.txt`에 기본값 설정:

```cmake
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()
```

### 4. 자동 재구성을 수동 빌드와 혼동

```bash
# CMakeLists.txt 수정...
cmake --build build         # "CMakeLists.txt 변경이 반영 안 됨"
```

이 주석은 사실이 아닙니다. 생성된 빌드 시스템은 `CMakeLists.txt`를 입력으로 추적하고, 바뀌었으면 빌드 전에 재구성을 먼저 돌립니다. Ninja 빌드 트리에서 `CMakeLists.txt` 끝에 `message(STATUS "added later")`를 붙이고 `cmake --build`만 실행한 결과입니다.

```text
$ cmake --build build
[0/1] Re-running CMake...
-- added later
-- Configuring done (0.0s)
-- Generating done (0.0s)
-- Build files have been written to: .../hello/build-n
ninja: no work to do.
```

Unix Makefiles 빌드 트리에서도 같은 실험에서 `cmake --build`가 재구성 메시지를 먼저 찍었습니다. 구성 명령을 직접 다시 실행해야 하는 때는 `-D`로 캐시 값을 바꾸거나 생성기·toolchain 파일을 바꿀 때입니다. 빌드 시스템이 추적하는 입력이 아니기 때문입니다.

```bash
cmake -B build       # 재구성
cmake --build build
```

### 5. 변수 중심 모델로 작성

```cmake
# 옛 방식 — 권장 안 됨
include_directories(include)        # 모든 타겟에 적용
add_definitions(-DDEBUG)            # 모든 타겟에 적용
add_executable(app main.cpp)
```

이런 코드는 *프로젝트가 커지면 통제 불가*가 됩니다. 라이브러리 A에는 `-DDEBUG`가 필요한데 B에는 필요 없는 상황이 생기면 분리할 방법이 없습니다.

**해결**: 타겟 중심 명령 사용.

```cmake
add_executable(app main.cpp)
target_include_directories(app PRIVATE include)
target_compile_definitions(app PRIVATE DEBUG)
```

이 차이가 *Modern CMake*의 핵심입니다. [Ch 3](/blog/tools/build/cmake/chapter03-targets)에서 본격적으로 다룹니다.

---

## 정리

- **CMake**는 *직접 컴파일하지 않고* Make·Ninja·VS·Xcode 빌드 파일을 *생성*하는 메타 빌드 시스템.
- 크로스 플랫폼: 한 `CMakeLists.txt`로 모든 OS.
- *항상 두 단계*: `cmake -B build` (구성) + `cmake --build build` (빌드).
- *Out-of-source 빌드*가 표준. `build/` 한 디렉터리 안에 모든 산물.
- `cmake_minimum_required`는 *항상 첫 줄*. 정책 활성화에 필요.
- 빌드 타입은 *명시적*으로 — `-DCMAKE_BUILD_TYPE=Release`.
- *Modern CMake*는 *타겟 중심* 모델 — 옵션·include·라이브러리를 *타겟에 붙임*.
- 4.x는 3.5보다 낮은 최소 버전을 오류로 거부한다. 오래된 프로젝트는 `<min>...<max>` 문법으로 올린다.

## 다음 장 예고

[Ch 2: CMake 언어](/blog/tools/build/cmake/chapter02-language)에서는 CMake의 문법 자체를 다룹니다 — 변수, 리스트, 조건문, 반복, 함수, 그리고 *제너레이터 식*(generator expression)까지. 다른 언어에 익숙한 사람이 보면 *기묘하게 느껴지는* CMake 언어의 특성을 정리합니다.

## 참고 자료

- [CMake Tutorial](https://cmake.org/cmake/help/v4.4/guide/tutorial/index.html) — 공식 튜토리얼
- [Modern CMake](https://cliutils.gitlab.io/modern-cmake/) — Henry Schreiner의 무료 온라인 책
- [CMake 4.0 릴리스 노트](https://cmake.org/cmake/help/latest/release/4.0.html) — 3.5 이전 호환 제거
- [CMake Documentation](https://cmake.org/cmake/help/v4.4/) — 매뉴얼 검색의 출발점
- [Effective Modern CMake (gist)](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1) — 한 페이지 요약

## 관련 항목

- [Ch 2: CMake 언어](/blog/tools/build/cmake/chapter02-language) — 첫 프로젝트에서 쓴 명령들의 문법 자체
- [Ch 3: 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — 프로젝트 구조를 확장할 때 기준이 되는 단위
- [GNU Make 소개](/blog/tools/build/gnu-make/chapter01-intro) — CMake가 생성해 주는 빌드 파일을 직접 쓰면 어떤 모습인가
- [cmake(1) 매뉴얼](https://cmake.org/cmake/help/v4.4/manual/cmake.1.html) — configure·build·install 명령행 옵션 전체
