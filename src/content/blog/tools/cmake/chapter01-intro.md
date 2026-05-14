---
title: "Ch 1: CMake 소개 / 설치 / 첫 프로젝트"
date: 2025-05-14T01:00:00
description: "CMake의 역할, 설치 방법, 첫 CMakeLists.txt 작성과 빌드."
tags: [cmake, build, cpp]
series: "CMake"
seriesOrder: 1
draft: false
---

## 왜 CMake가 필요한가

C++ 프로젝트를 Windows, Linux, macOS에서 모두 빌드해야 한다고 가정합니다. Makefile만으로는 이렇게 됩니다.

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

Windows에서는 Visual Studio 프로젝트 파일(.vcxproj)이 필요합니다. macOS에서는 Xcode 프로젝트를 만들거나 다른 Makefile을 작성해야 합니다. 플랫폼마다 빌드 설정을 따로 유지하면 다음 문제가 생깁니다.

1. **중복 관리**: 소스 파일을 추가하면 세 곳을 모두 수정해야 합니다.
2. **동기화 실패**: 한쪽만 업데이트하고 다른 쪽을 잊기 쉽습니다.
3. **플래그 불일치**: GCC의 `-Wall`과 MSVC의 `/W4`를 수동으로 맞춰야 합니다.

**CMake**는 이 문제를 해결합니다. 하나의 `CMakeLists.txt`로 모든 플랫폼의 빌드 파일을 생성합니다.

![CMake — 메타 빌드 시스템 흐름](/images/blog/cmake/diagrams/ch01-cmake-meta-build.svg)

CMake는 **메타 빌드 시스템**입니다. 직접 컴파일하지 않고, 각 플랫폼에 맞는 네이티브 빌드 파일을 생성합니다. 생성된 Makefile이나 Ninja 파일이 실제 컴파일을 수행합니다.

---

## CMake란 무엇인가

CMake는 **크로스 플랫폼 빌드 시스템 생성기**입니다. 핵심 특징을 정리합니다.

| 특징 | 설명 |
|------|------|
| **크로스 플랫폼** | Linux, Windows, macOS 등 모든 주요 플랫폼 지원 |
| **생성기 독립적** | Make, Ninja, Visual Studio, Xcode 등 다양한 빌드 시스템 출력 |
| **외부 라이브러리 탐색** | `find_package`로 시스템 라이브러리를 자동 탐색 |
| **의존성 추적** | 타겟 간 의존성을 자동으로 관리 |
| **IDE 통합** | CLion, Visual Studio Code, Qt Creator 등과 통합 |

### Makefile과의 차이

Makefile은 **빌드 규칙**을 직접 작성합니다. CMake는 **빌드 의도**를 선언하면 규칙을 생성합니다.

```makefile
# Makefile: 규칙 작성
main.o: main.cpp config.hpp
	g++ -std=c++17 -Wall -I./include -c main.cpp -o main.o
```

```cmake
# CMakeLists.txt: 의도 선언
add_executable(app main.cpp)
target_include_directories(app PRIVATE include)
target_compile_features(app PRIVATE cxx_std_17)
```

CMake는 컴파일러, 플랫폼, 의존성을 자동으로 감지하여 적절한 빌드 규칙을 생성합니다.

---

## 설치

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install cmake
```

시스템 패키지가 오래되었다면 Kitware 공식 저장소를 추가합니다.

```bash
# Kitware GPG 키 추가
wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | \
    gpg --dearmor - | sudo tee /etc/apt/trusted.gpg.d/kitware.gpg >/dev/null

# 저장소 추가
sudo apt-add-repository "deb https://apt.kitware.com/ubuntu/ $(lsb_release -cs) main"

# 설치
sudo apt update
sudo apt install cmake
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install cmake
```

### macOS

Homebrew를 사용합니다.

```bash
brew install cmake
```

### Windows

가장 간단한 방법은 패키지 관리자입니다.

```powershell
# winget (Windows 11 기본 포함)
winget install Kitware.CMake

# Chocolatey
choco install cmake

# Scoop
scoop install cmake
```

또는 [cmake.org](https://cmake.org/download/)에서 설치 프로그램을 다운로드합니다. 설치 시 **Add CMake to system PATH** 옵션을 선택하세요.

### 버전 확인

```bash
cmake --version
# cmake version 3.28.1
```

**권장 최소 버전**: 3.20 이상. Modern CMake 기능(타겟 중심 접근, 프리셋, FetchContent의 `FIND_PACKAGE_ARGS` 등)을 모두 활용하려면 **3.25 이상**을 권장합니다.

---

## 첫 프로젝트

### 프로젝트 구조

가장 단순한 CMake 프로젝트입니다.

```
hello/
├── CMakeLists.txt
└── main.cpp
```

### 소스 파일

```cpp
// main.cpp
#include <iostream>

int main() {
    std::cout << "Hello, CMake!" << std::endl;
    return 0;
}
```

### CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.15)

project(Hello
    VERSION 1.0.0
    LANGUAGES CXX
)

add_executable(hello main.cpp)
```

세 줄이 전부입니다. 각 명령의 역할을 살펴봅니다.

---

## 핵심 명령어

### cmake_minimum_required

```cmake
cmake_minimum_required(VERSION 3.15)
```

CMake 최소 버전을 지정합니다. 이 버전보다 낮은 CMake로 구성하면 오류가 발생합니다.

```
CMake Error at CMakeLists.txt:1 (cmake_minimum_required):
  CMake 3.15 or higher is required.  You are running version 3.10.2
```

버전 범위도 지정할 수 있습니다.

```cmake
cmake_minimum_required(VERSION 3.20...3.30)
```

이 명령은 CMake의 **정책(policy)**을 설정합니다. 정책은 특정 버전에서 도입된 동작 변경을 제어합니다. 반드시 **CMakeLists.txt의 첫 줄에 작성**하세요.

### project

```cmake
project(Hello
    VERSION 1.0.0
    LANGUAGES CXX
)
```

프로젝트 이름과 메타데이터를 설정합니다.

| 옵션 | 설명 | 예시 |
|------|------|------|
| `VERSION` | 버전 번호 | `1.0.0`, `2.3.1.4` |
| `LANGUAGES` | 사용 언어 | `C`, `CXX`, `CUDA`, `Fortran` |
| `DESCRIPTION` | 프로젝트 설명 | `"My awesome library"` |
| `HOMEPAGE_URL` | 홈페이지 URL | `"https://example.com"` |

이 명령은 여러 변수를 자동으로 설정합니다.

```cmake
message(STATUS "Project: ${PROJECT_NAME}")           # Hello
message(STATUS "Version: ${PROJECT_VERSION}")        # 1.0.0
message(STATUS "Major: ${PROJECT_VERSION_MAJOR}")    # 1
message(STATUS "Source: ${PROJECT_SOURCE_DIR}")      # /path/to/hello
message(STATUS "Binary: ${PROJECT_BINARY_DIR}")      # /path/to/hello/build
```

### add_executable

```cmake
add_executable(hello main.cpp)
```

실행 파일 **타겟**을 생성합니다. 첫 번째 인자가 타겟 이름, 나머지가 소스 파일입니다.

```cmake
add_executable(hello
    main.cpp
    utils.cpp
    config.cpp
)
```

타겟 이름(`hello`)은 생성되는 실행 파일 이름이 됩니다. Linux에서는 `hello`, Windows에서는 `hello.exe`가 생성됩니다.

---

## 빌드하기

### Out-of-source 빌드

CMake는 **out-of-source 빌드**를 권장합니다. 소스 디렉터리와 빌드 디렉터리를 분리하는 방식입니다.

```
hello/                  ← 소스 디렉터리 (변경 없음)
├── CMakeLists.txt
├── main.cpp
└── build/              ← 빌드 디렉터리 (생성된 파일들)
    ├── CMakeCache.txt
    ├── CMakeFiles/
    ├── Makefile
    └── hello
```

이렇게 하면 `build/` 디렉터리만 삭제하면 깨끗하게 정리됩니다. 소스 파일은 그대로입니다.

### 전통적인 방법

```bash
# 빌드 디렉터리 생성 및 이동
mkdir build
cd build

# CMake 구성 (상위 디렉터리의 CMakeLists.txt 참조)
cmake ..

# 빌드
make

# 실행
./hello
```

### 현대적인 방법 (권장)

CMake 3.13 이상에서는 `-B` 옵션으로 더 간단하게 합니다.

```bash
# 구성 (build 디렉터리 자동 생성)
cmake -B build

# 빌드
cmake --build build

# 실행
./build/hello
```

디렉터리를 이동할 필요가 없어서 편리합니다.

### 생성기 지정

`-G` 옵션으로 빌드 시스템을 선택합니다.

```bash
# Ninja (빠름, 권장)
cmake -B build -G Ninja

# Unix Makefiles (기본값)
cmake -B build -G "Unix Makefiles"

# Visual Studio 2022
cmake -B build -G "Visual Studio 17 2022"

# Xcode
cmake -B build -G Xcode
```

사용 가능한 생성기 목록은 `cmake --help` 출력 하단에서 확인합니다.

---

## 빌드 타입

### Debug와 Release

```bash
# 디버그 빌드 (최적화 없음, 디버그 정보 포함)
cmake -B build -DCMAKE_BUILD_TYPE=Debug

# 릴리스 빌드 (최적화, 디버그 정보 없음)
cmake -B build -DCMAKE_BUILD_TYPE=Release
```

| 빌드 타입 | 최적화 플래그 | 디버그 정보 | 용도 |
|-----------|---------------|-------------|------|
| `Debug` | `-O0` | `-g` | 개발, 디버깅 |
| `Release` | `-O3` | 없음 | 배포 |
| `RelWithDebInfo` | `-O2` | `-g` | 성능 프로파일링 |
| `MinSizeRel` | `-Os` | 없음 | 임베디드, 용량 제한 |

### Multi-config 생성기

Visual Studio나 Xcode는 **multi-config 생성기**입니다. 구성 시점이 아니라 빌드 시점에 타입을 선택합니다.

```bash
# 구성
cmake -B build -G "Visual Studio 17 2022"

# 빌드 시 타입 지정
cmake --build build --config Debug
cmake --build build --config Release
```

같은 빌드 디렉터리에서 Debug와 Release를 모두 빌드할 수 있습니다.

---

## 프로젝트 구조 확장

### include와 src 분리

실제 프로젝트는 헤더와 소스를 분리합니다.

```
myproject/
├── CMakeLists.txt
├── include/
│   └── mylib.hpp
└── src/
    ├── main.cpp
    └── mylib.cpp
```

```cmake
cmake_minimum_required(VERSION 3.15)

project(MyProject VERSION 1.0.0 LANGUAGES CXX)

add_executable(myapp
    src/main.cpp
    src/mylib.cpp
)

# 헤더 경로 추가
target_include_directories(myapp PRIVATE include)
```

`target_include_directories`는 타겟에 인클루드 경로를 추가합니다. `PRIVATE`은 이 타겟에서만 사용한다는 의미입니다(Ch 3에서 자세히 다룹니다).

### C++ 표준 지정

C++ 표준을 지정하는 두 가지 방법이 있습니다.

**전역 설정** (모든 타겟에 적용):

```cmake
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
```

**타겟별 설정** (권장):

```cmake
target_compile_features(myapp PRIVATE cxx_std_17)
```

타겟별 설정이 더 명확하고 세밀한 제어가 가능합니다.

| 변수/명령 | 설명 |
|-----------|------|
| `CMAKE_CXX_STANDARD` | C++ 표준 버전 (11, 14, 17, 20, 23) |
| `CMAKE_CXX_STANDARD_REQUIRED` | ON이면 지원 안 되면 오류 |
| `CMAKE_CXX_EXTENSIONS` | OFF면 표준 확장 비활성화 (-std=c++17 vs -std=gnu++17) |
| `target_compile_features` | 타겟별 C++ 기능 요구 |

---

## 흔한 실수

### in-source 빌드

```bash
# 회피: 소스 디렉터리에서 cmake 실행
cd hello
cmake .
make
```

이렇게 하면 소스 디렉터리에 빌드 파일이 생성됩니다. `CMakeCache.txt`, `CMakeFiles/`, `Makefile` 등이 섞여서 정리가 어렵습니다.

```bash
# Good: out-of-source 빌드
cmake -B build
cmake --build build
```

### cmake_minimum_required 누락

```cmake
# 회피: 첫 줄에 없음
project(Hello)
cmake_minimum_required(VERSION 3.15)  # 너무 늦음
```

`cmake_minimum_required`는 반드시 **첫 번째 명령**이어야 합니다. 이 명령이 CMake 정책을 설정하기 때문입니다.

```cmake
# Good
cmake_minimum_required(VERSION 3.15)
project(Hello)
```

### 빌드 타입 미지정

```bash
# 회피: 빌드 타입 없이 구성
cmake -B build
```

빌드 타입을 지정하지 않으면 빈 문자열이 됩니다. 이 경우 컴파일러 기본 최적화가 적용되어 예상과 다른 동작이 발생할 수 있습니다.

```bash
# Good: 명시적으로 지정
cmake -B build -DCMAKE_BUILD_TYPE=Debug
```

### 구성과 빌드 혼동

```bash
# 회피: 소스 변경 후 make만 실행
# CMakeLists.txt를 수정했는데...
cmake --build build
# "CMakeLists.txt 변경이 반영 안 됨"
```

`cmake --build`는 빌드만 수행합니다. CMakeLists.txt를 수정했다면 재구성이 필요합니다.

```bash
# Good: CMakeLists.txt 변경 시 재구성
cmake -B build
cmake --build build
```

실제로는 CMake가 자동으로 재구성을 감지하는 경우가 많지만, 확실하게 하려면 명시적으로 재구성합니다.

---

## 정리

- **CMake**는 Makefile, Ninja 파일 등을 생성하는 메타 빌드 시스템입니다.
- **크로스 플랫폼**: 하나의 `CMakeLists.txt`로 모든 플랫폼을 지원합니다.
- `cmake_minimum_required`는 **항상 첫 줄에** 작성합니다.
- `project`로 프로젝트 이름과 버전을 설정합니다.
- `add_executable`로 실행 파일 타겟을 생성합니다.
- **out-of-source 빌드**: `cmake -B build` → `cmake --build build`.
- `CMAKE_BUILD_TYPE`으로 Debug/Release를 명시적으로 지정합니다.

## 다음 장 예고

Ch 2에서는 CMake 언어를 다룹니다. 변수, 리스트, 조건문, 함수, 그리고 Generator Expression까지 CMake의 문법을 살펴봅니다.

## 참고 자료

- [CMake Tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html)
- [Modern CMake](https://cliutils.gitlab.io/modern-cmake/)
- [CMake Documentation](https://cmake.org/cmake/help/latest/)
