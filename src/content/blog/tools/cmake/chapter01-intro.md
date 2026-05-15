---
title: "Ch 1: CMake 소개 / 설치 / 첫 프로젝트"
date: 2025-05-14T01:00:00
description: "왜 메타 빌드 시스템이 필요한가, CMake가 그 자리에서 무엇을 하는가, 그리고 5줄 짜리 첫 프로젝트."
tags: [cmake, build, cpp]
series: "CMake"
seriesOrder: 1
draft: false
---

## 왜 CMake가 필요한가

C++ 프로젝트를 Windows·Linux·macOS에서 *모두* 빌드해야 한다고 해 봅시다. Makefile만으로 시작하면 이렇게 됩니다.

```makefile
# Linux용 Makefile
CC = gcc
CFLAGS = -Wall -g
LDFLAGS = -lpthread

app: main.o utils.o
	$(CC) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

이걸로 Linux는 빌드됩니다. 그런데 Windows에는 Makefile을 보지 않는 *Visual Studio*가 있고, macOS에는 Xcode가 있습니다. *동일한 코드*를 위해 세 종류의 빌드 파일을 별도로 만들고, 동기화하고, 컴파일러별 옵션 차이(`-Wall` vs `/W4`)를 손으로 맞춰야 합니다. 결과는 다음과 같이 부풀어 오릅니다.

1. **중복 관리** — 새 소스 파일 하나 추가 = 세 곳을 동시 수정.
2. **동기화 실패** — 한쪽만 갱신하고 다른 쪽을 깜빡하는 일이 *매주* 생긴다.
3. **플래그 불일치** — GCC의 `-O2`와 MSVC의 `/O2`가 *같은 의미가 아니다*. 컴파일러별 사례를 일일이 외워야 한다.

CMake는 정확히 이 문제를 풉니다. *한 개의 `CMakeLists.txt`*에서 *모든 플랫폼의 네이티브 빌드 파일*을 생성합니다.

![CMake — 메타 빌드 시스템 흐름](/images/blog/cmake/diagrams/ch01-cmake-meta-build.svg)

CMake는 *직접 컴파일하지 않습니다*. 호스트 환경을 살피고, 컴파일러를 찾고, 그에 맞는 *생성기*(generator)를 골라 Makefile·Ninja 파일·Visual Studio 솔루션·Xcode 프로젝트를 만들어 냅니다. 실제 컴파일은 그 다음 단계에서 *각 생성기가 알아서* 합니다. 이 분리가 *메타 빌드 시스템*이라는 이름의 핵심입니다.

---

## CMake가 하는 일

CMake의 가장 중요한 다섯 가지 능력입니다.

| 능력 | 의미 |
|------|------|
| 크로스 플랫폼 | Linux / macOS / Windows / BSD / 임베디드 — 동일한 `CMakeLists.txt` |
| 생성기 독립 | Make / Ninja / Visual Studio / Xcode — `-G` 옵션 한 번으로 전환 |
| 외부 라이브러리 탐색 | `find_package`로 OS·패키지 매니저에 설치된 라이브러리를 *자동 발견* |
| 의존성 추적 | 타겟 간 헤더·라이브러리 의존성을 *전이적*으로 관리 |
| IDE 통합 | CLion / VS Code / Visual Studio / Qt Creator 모두 CMake를 1급 시민으로 취급 |

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

CMake는 *무엇*을 만들지를 선언하고, *어떻게*는 CMake가 결정합니다. 컴파일러는 환경에서 자동 탐지되고, `cxx_std_17`은 GCC에서는 `-std=c++17`이 되고 MSVC에서는 `/std:c++17`이 됩니다. 같은 표현 한 줄이 *모든 컴파일러에서 의미를 보존*합니다.

이런 *선언형 모델*의 진가는 외부 라이브러리를 가져올 때 드러납니다. Makefile에서는 "사용자가 OpenSSL을 깔았는지 확인하고 경로를 찾아 `-lssl -lcrypto`를 붙이는" 코드를 직접 짜야 합니다. CMake에서는 `find_package(OpenSSL REQUIRED)`라는 한 줄이 그 일을 *모든 OS에서 동일하게* 처리합니다.

---

## 설치

CMake는 거의 모든 패키지 매니저에 들어 있습니다.

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install cmake
```

배포판 패키지가 *오래된 버전*일 때가 많습니다(Ubuntu 22.04 LTS는 3.22). 최신 기능(프리셋, FetchContent 개선)이 필요하면 Kitware 공식 저장소를 추가합니다.

```bash
wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | \
    gpg --dearmor - | sudo tee /etc/apt/trusted.gpg.d/kitware.gpg >/dev/null
sudo apt-add-repository "deb https://apt.kitware.com/ubuntu/ $(lsb_release -cs) main"
sudo apt update
sudo apt install cmake
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install cmake
```

Fedora는 보통 최신 버전을 빠르게 채택합니다.

### macOS

```bash
brew install cmake
```

Apple Silicon, Intel 모두 단일 명령으로 처리됩니다.

### Windows

```powershell
# winget (Windows 11 기본 포함)
winget install Kitware.CMake

# Chocolatey
choco install cmake

# Scoop
scoop install cmake
```

또는 [cmake.org/download](https://cmake.org/download/)에서 설치 프로그램을 받습니다. 인스톨러 중간의 *Add CMake to system PATH* 옵션을 *반드시* 켜세요. 안 켜면 PowerShell에서 `cmake` 명령이 안 보입니다.

### 버전 확인

```bash
$ cmake --version
cmake version 3.28.1
```

**권장 최소 버전**: 3.20+ (modern CMake 기능 대부분 사용 가능). 가능하면 *3.25+*(`FetchContent`의 `FIND_PACKAGE_ARGS`, presets v6, `CMakeLists.txt` 모듈 개선 등).

3.0 이전과 3.x는 *완전히 다른 도구*에 가깝습니다. "modern CMake"라는 용어는 3.0+ 이후 *타겟 중심* 모델을 가리킵니다. 2.x의 *변수 중심* 모델은 더 이상 권장되지 않습니다.

---

## 첫 프로젝트

가장 단순한 CMake 프로젝트입니다.

```
hello/
├── CMakeLists.txt
└── main.cpp
```

```cpp
// main.cpp
#include <iostream>

int main() {
    std::cout << "Hello, CMake!" << std::endl;
    return 0;
}
```

```cmake
cmake_minimum_required(VERSION 3.20)

project(Hello
    VERSION 1.0.0
    LANGUAGES CXX
)

add_executable(hello main.cpp)
```

세 줄이 전부입니다. 한 줄씩 무엇을 하는지 봅니다.

### `cmake_minimum_required(VERSION 3.20)`

CMake 최소 버전 선언. 이 버전보다 *낮은 CMake*로 빌드하면 즉시 에러가 납니다.

```
CMake Error at CMakeLists.txt:1 (cmake_minimum_required):
  CMake 3.20 or higher is required.  You are running version 3.10.2
```

이 선언은 *단순한 버전 체크가 아닙니다*. CMake의 *정책(policy)* 데이터베이스를 *그 버전의 동작*으로 설정합니다. CMake는 버전이 올라가면서 *행동을 바꿔야 했던 결정*들을 정책으로 가지고 있는데(예: `OLD` 정책 N과 `NEW` 정책 N), `cmake_minimum_required`가 그 정책의 기본값을 한꺼번에 정합니다.

정책이 왜 필요한가? CMake는 *역호환성*을 매우 강하게 보존합니다. 2.6 시절 작성된 `CMakeLists.txt`도 CMake 3.x에서 거의 그대로 돕니다. 다만 그 동안 일부 동작이 바뀌었는데, 옛 동작을 그대로 유지할지(`OLD`) 새 동작을 따를지(`NEW`)를 *프로젝트가 선택*합니다. `cmake_minimum_required(VERSION 3.20)`은 "내 코드는 3.20 시점의 동작을 가정한다"는 명시입니다.

버전 범위도 지정할 수 있습니다.

```cmake
cmake_minimum_required(VERSION 3.20...3.30)
```

이 형태는 "*3.20을 최소로 요구*하되, *3.30의 정책*까지 새 동작을 활성화하라"는 의미입니다. 점진적으로 새 CMake 버전의 모범 사례를 따라가는 권장 방식입니다.

`cmake_minimum_required`는 *Makefile의 첫 줄*에 와야 합니다. 정책이 *위쪽 줄부터 적용*되기 때문입니다.

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

`${PROJECT_VERSION_MAJOR}` 같은 변수는 *config 파일 생성*과 *심볼 export*에 자주 활용됩니다.

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

타겟은 [Ch 3](/blog/tools/cmake/chapter03-targets)에서 자세히 다룹니다. CMake의 모든 *Modern* 패턴은 *타겟을 중심*으로 돌아갑니다 — 옵션·include 경로·라이브러리 의존성이 모두 *타겟에 붙는* 방식입니다.

---

## 빌드하기

### Out-of-source 빌드 — 표준 관행

CMake는 *소스 디렉터리와 빌드 디렉터리를 분리*하기를 강하게 권합니다.

```
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

옛날 방식(`cmake .`)은 *in-source 빌드*라 부르고, CMake 매뉴얼이 명시적으로 권장하지 않습니다. 일부 프로젝트는 `cmake_minimum_required` 직후에 in-source 빌드를 *명시적으로 거부*하는 코드를 넣어 두기까지 합니다.

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

`-B build`는 *빌드 디렉터리를 build로* 지정합니다(없으면 자동 생성). CMake 3.13+ 문법으로, 옛 방식(`mkdir build; cd build; cmake ..`)보다 *디렉터리 이동이 없어* 편합니다.

`cmake --build build`는 *생성기에 무관하게* 빌드를 실행합니다. 내부적으로는 `make -C build` 또는 `ninja -C build` 또는 Visual Studio MSBuild 호출이 됩니다. *한 명령으로 모든 플랫폼*에서 동작하는 것이 핵심입니다.

### 생성기 선택 — `-G`

```bash
# Ninja — 가장 빠름, 강력 권장
cmake -B build -G Ninja

# Unix Makefiles — 기본값 (Linux/macOS에서)
cmake -B build -G "Unix Makefiles"

# Visual Studio 2022
cmake -B build -G "Visual Studio 17 2022"

# Xcode
cmake -B build -G Xcode
```

*사용 가능한 생성기 전체 목록*은 `cmake --help` 출력 끝부분에 있습니다. 흥미로운 점은, Visual Studio·Xcode 생성기는 *프로젝트 파일*(`.sln`, `.xcodeproj`)을 만들어 두어 IDE에서 그대로 열 수 있다는 것입니다.

**Ninja가 왜 권장**되는가? Make와 같은 일을 하지만 *훨씬 빠릅니다*. Make는 *셸 호출 다음 셸 호출*을 직렬화하느라 시간을 잃는데, Ninja는 *모든 명령을 미리 계획*해 두고 가능한 한 빠르게 병렬 실행합니다. 대형 프로젝트에서는 *2~3배 빠른* 빌드 시간 차가 흔합니다.

### 빌드 타입 — `-DCMAKE_BUILD_TYPE`

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug      # 디버그
cmake -B build -DCMAKE_BUILD_TYPE=Release    # 릴리스
```

| 타입 | 컴파일 옵션 | 디버그 정보 | 용도 |
|------|-------------|-------------|------|
| `Debug` | `-O0` | `-g` | 개발 |
| `Release` | `-O3` (GCC/Clang) / `/O2` (MSVC) | 없음 | 배포 |
| `RelWithDebInfo` | `-O2 -g` | 포함 | 프로파일링 |
| `MinSizeRel` | `-Os` | 없음 | 임베디드 |

`Release`만 따로 보면 *최적화 + assert 비활성화 + 디버그 심볼 제거*가 한 번에 됩니다.

### Multi-config 생성기 — 빌드 시점 결정

Visual Studio와 Xcode 생성기는 *multi-config*입니다. 구성 시점이 아니라 *빌드 시점*에 타입을 정합니다.

```bash
cmake -B build -G "Visual Studio 17 2022"   # CMAKE_BUILD_TYPE 무시됨

cmake --build build --config Debug
cmake --build build --config Release
```

같은 `build/` 디렉터리에서 Debug·Release를 *모두 빌드*할 수 있고, 각각 다른 하위 디렉터리(`Debug/`, `Release/`)에 산물이 들어갑니다. 반대로 Make·Ninja는 *single-config*라 모드별로 별도 `build-debug/`, `build-release/`를 만드는 것이 관행입니다.

---

## 프로젝트 구조 확장

### include / src 분리

실제 프로젝트는 *공개 헤더*와 *내부 구현*을 분리합니다.

```
myproject/
├── CMakeLists.txt
├── include/
│   └── mylib.hpp     ← 공개 API
└── src/
    ├── main.cpp
    └── mylib.cpp     ← 구현
```

```cmake
cmake_minimum_required(VERSION 3.20)

project(MyProject VERSION 1.0.0 LANGUAGES CXX)

add_executable(myapp
    src/main.cpp
    src/mylib.cpp
)

target_include_directories(myapp PRIVATE include)
```

`target_include_directories`로 *이 타겟이 어디서 헤더를 찾는지*를 지정합니다. `PRIVATE`은 *이 타겟에서만* 사용한다는 뜻입니다. PRIVATE·INTERFACE·PUBLIC 세 가지의 의미는 [Ch 3](/blog/tools/cmake/chapter03-targets)에서 자세히 다룹니다 — Modern CMake의 *가장 중요한 개념* 중 하나입니다.

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

전역 설정은 *전이성이 없어* 큰 프로젝트에서 사고가 납니다. Modern CMake는 *모든 것을 타겟에 붙이는* 방향을 권장합니다.

세 가지 표준 설정 변수의 의미:

| 변수 | 효과 |
|------|------|
| `CMAKE_CXX_STANDARD=17` | C++17 기본 요구 |
| `CMAKE_CXX_STANDARD_REQUIRED=ON` | 지원 없으면 *에러*, 폴백 금지 |
| `CMAKE_CXX_EXTENSIONS=OFF` | `-std=c++17` (표준 모드), `ON`이면 `-std=gnu++17` (확장 허용) |

`EXTENSIONS=OFF`를 권장합니다. 컴파일러별 확장(GCC의 `__attribute__` 등)에 무심코 의존하면 *다른 컴파일러에서 깨지는* 코드가 됩니다.

---

## 흔한 실수

### 1. In-source 빌드

```bash
cd hello
cmake .
make
```

소스 디렉터리에 `CMakeCache.txt`, `CMakeFiles/`가 만들어집니다. `.gitignore`로 처리하기 까다롭고, 클린이 어렵습니다.

**해결**: 항상 out-of-source.

```bash
cmake -B build
cmake --build build
```

### 2. `cmake_minimum_required` 누락

```cmake
# 안 좋음
project(Hello)
cmake_minimum_required(VERSION 3.20)   # 늦음
```

CMake는 첫 호출 전까지 *어떤 정책*을 따를지 모릅니다. 정책이 늦게 설정되면 위쪽 코드는 *기본(아주 옛) 동작*을 사용합니다.

**해결**: 무조건 첫 줄.

```cmake
cmake_minimum_required(VERSION 3.20)
project(Hello)
```

### 3. 빌드 타입 미지정

```bash
cmake -B build       # CMAKE_BUILD_TYPE 빈 문자열
```

CMake는 *Debug도 Release도 아닌 빈 상태*로 빌드합니다. 컴파일러 기본값(GCC는 `-O0`, MSVC는 Debug 비슷)이 적용되어 *느린데 디버그 심볼은 없는* 어중간한 결과가 됩니다.

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

### 4. CMakeLists.txt 수정 후 재구성 누락

```bash
# CMakeLists.txt 수정...
cmake --build build         # "CMakeLists.txt 변경이 반영 안 됨"
```

`cmake --build`는 *빌드만* 합니다. CMakeLists.txt를 수정한 경우 CMake가 다시 한 번 *구성 단계*를 돌아야 합니다.

실제로는 CMake가 *대부분의 경우 자동 재구성*을 감지합니다(`build/`의 의존성 추적). 그래도 확실히 하려면 명시적 재구성을 합니다.

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

이 차이가 *Modern CMake*의 핵심입니다. [Ch 3](/blog/tools/cmake/chapter03-targets)에서 본격적으로 다룹니다.

---

## 정리

- **CMake**는 *직접 컴파일하지 않고* Make·Ninja·VS·Xcode 빌드 파일을 *생성*하는 메타 빌드 시스템.
- 크로스 플랫폼: 한 `CMakeLists.txt`로 모든 OS.
- *항상 두 단계*: `cmake -B build` (구성) + `cmake --build build` (빌드).
- *Out-of-source 빌드*가 표준. `build/` 한 디렉터리 안에 모든 산물.
- `cmake_minimum_required`는 *항상 첫 줄*. 정책 활성화에 필요.
- 빌드 타입은 *명시적*으로 — `-DCMAKE_BUILD_TYPE=Release`.
- *Modern CMake*는 *타겟 중심* 모델 — 옵션·include·라이브러리를 *타겟에 붙임*.
- 생성기는 *Ninja* 권장 (`cmake -B build -G Ninja`).

## 다음 장 예고

[Ch 2: CMake 언어](/blog/tools/cmake/chapter02-language)에서는 CMake의 문법 자체를 다룹니다 — 변수, 리스트, 조건문, 반복, 함수, 그리고 *제너레이터 식*(generator expression)까지. 다른 언어에 익숙한 사람이 보면 *기묘하게 느껴지는* CMake 언어의 특성을 정리합니다.

## 참고 자료

- [CMake Tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html) — 공식 튜토리얼
- [Modern CMake](https://cliutils.gitlab.io/modern-cmake/) — Henry Schreiner의 무료 책. Modern CMake 가이드의 정전.
- [CMake Documentation](https://cmake.org/cmake/help/latest/) — 매뉴얼 검색의 출발점
- [Effective Modern CMake (gist)](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1) — 한 페이지 요약
