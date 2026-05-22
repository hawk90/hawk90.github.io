---
title: "Ch 7: 설치와 패키징"
date: 2026-05-17T07:00:00
description: "install 명령으로 빌드 결과물 배포, CPack으로 플랫폼별 패키지 생성."
tags: [cmake, build, cpp, install, cpack]
series: "CMake"
seriesOrder: 7
draft: false
---

## 왜 설치 규칙이 필요한가

빌드가 끝나면 산물은 *빌드 디렉터리에 어지럽게 흩어진 상태*입니다.

```text
build/
├── myapp
├── libmylib.so
├── CMakeFiles/
├── cmake_install.cmake
└── ... 수십 개의 파일
```

| 파일 | 역할 |
|------|------|
| `myapp` | 실행 파일 |
| `libmylib.so` | 공유 라이브러리 |
| `CMakeFiles/` | CMake 내부 |
| `cmake_install.cmake` | 설치 스크립트 (CMake가 생성) |

이대로는 *배포할 수가 없습니다*. 사용자에게 "이 디렉터리를 통째로 복사하세요"라고 할 수 없기 때문입니다. 실행 파일은 `/usr/local/bin`에, 라이브러리는 `/usr/local/lib`에, 헤더는 `/usr/local/include`에 가야 합니다. 그것도 *플랫폼별 관행에 맞춰* 다른 자리에 가야 합니다.

| 설치 전 (빌드 디렉터리) | 설치 후 (Linux/macOS 표준) |
|---|---|
| `build/myapp` | `/usr/local/bin/myapp` |
| `build/libmylib.so` | `/usr/local/lib/libmylib.so` |
| `src/include/mylib/*.h` | `/usr/local/include/mylib/*.h` |

`install()` 명령은 이 *매핑 규칙*을 CMakeLists.txt에 *선언*하는 도구입니다. 한 번 적어 두면 `cmake --install build`로 *항상 같은 결과*를 얻습니다. *어떤 플랫폼에서도, 어느 PREFIX로 호출해도, 어느 패키저가 호출해도* 결과는 일관됩니다.

이 챕터의 두 큰 주제는 다음과 같습니다.

1. **`install()` 규칙** — 타겟·파일·헤더·디렉터리·내보내기를 *올바른 자리*에 두기.
2. **CPack** — `install()` 규칙을 *DEB·RPM·NSIS·DMG* 패키지로 자동 변환.

![CMake 설치 파이프라인](/images/blog/cmake/diagrams/ch07-install-pipeline.svg)

---

## install 명령 기초

### 타겟 설치

가장 흔한 형태입니다. 빌드된 타겟(실행 파일, 라이브러리)을 설치합니다.

```cmake
install(TARGETS myapp mylib
    RUNTIME DESTINATION bin       # 실행 파일
    LIBRARY DESTINATION lib       # 공유 라이브러리 (.so, .dylib)
    ARCHIVE DESTINATION lib       # 정적 라이브러리 (.a, .lib)
)
```

| 키워드 | 대상 | 예시 |
|--------|------|------|
| `RUNTIME` | 실행 파일, Windows DLL | myapp, mylib.dll |
| `LIBRARY` | 공유 라이브러리 | libmylib.so, libmylib.dylib |
| `ARCHIVE` | 정적 라이브러리, import lib | libmylib.a, mylib.lib |

Windows에서 DLL은 `RUNTIME`, import 라이브러리는 `ARCHIVE`로 분류됩니다. 플랫폼별 차이를 CMake가 자동으로 처리합니다.

### 설치 실행

```bash
# 빌드
cmake -B build -DCMAKE_INSTALL_PREFIX=/usr/local
cmake --build build

# 설치 (관리자 권한 필요할 수 있음)
cmake --install build

# 특정 설정으로 설치 (Multi-config 생성기)
cmake --install build --config Release

# 상세 출력
cmake --install build --verbose
```

`CMAKE_INSTALL_PREFIX`가 설치 루트입니다. 기본값은 Unix에서 `/usr/local`, Windows에서 `C:/Program Files/${PROJECT_NAME}`입니다.

### DESTDIR: 패키징용 가상 루트

실제 시스템이 아닌 임시 디렉터리에 설치하려면 `DESTDIR`을 사용합니다. 패키지 빌드 시 필수입니다.

```bash
DESTDIR=/tmp/staging cmake --install build
```

결과:

```text
/tmp/staging/
└── usr/
    └── local/
        ├── bin/
        │   └── myapp
        ├── lib/
        │   └── libmylib.so
        └── include/
            └── mylib/
                └── api.h
```

`DESTDIR`은 `CMAKE_INSTALL_PREFIX` 앞에 붙습니다. `DESTDIR=/tmp/staging`이고 `CMAKE_INSTALL_PREFIX=/usr/local`이면 최종 경로는 `/tmp/staging/usr/local/...`이 됩니다.

---

## 파일과 디렉터리 설치

### 개별 파일 설치

```cmake
install(FILES
    include/mylib/api.h
    include/mylib/types.h
    DESTINATION include/mylib
)
```

### 디렉터리 단위 설치

```cmake
install(DIRECTORY include/
    DESTINATION include
)
# include/ 아래 모든 파일을 ${PREFIX}/include/에 복사
```

주의: `include/`(슬래시 있음)와 `include`(슬래시 없음)는 다릅니다.

```cmake
# include/ — 디렉터리 내용만 복사
install(DIRECTORY include/ DESTINATION include)
# → ${PREFIX}/include/mylib/api.h

# include — 디렉터리 자체를 복사
install(DIRECTORY include DESTINATION include)
# → ${PREFIX}/include/include/mylib/api.h  (중복!)
```

### 파일 필터링

특정 파일만 포함하거나 제외할 수 있습니다.

```cmake
install(DIRECTORY include/
    DESTINATION include
    FILES_MATCHING
        PATTERN "*.h"
        PATTERN "*.hpp"
        PATTERN "internal" EXCLUDE   # internal 디렉터리 제외
        PATTERN "*.in" EXCLUDE       # 템플릿 파일 제외
)
```

### 권한 설정

```cmake
install(FILES scripts/run.sh
    DESTINATION bin
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE
                GROUP_READ GROUP_EXECUTE
                WORLD_READ WORLD_EXECUTE
)
```

---

## GNUInstallDirs: 표준 설치 경로

직접 경로를 하드코딩하지 말고 `GNUInstallDirs` 모듈을 사용합니다. 플랫폼과 배포판에 맞는 표준 경로를 제공합니다.

```cmake
include(GNUInstallDirs)
```

| 변수 | 기본값 (Unix) | 용도 |
|------|---------------|------|
| `CMAKE_INSTALL_BINDIR` | bin | 실행 파일 |
| `CMAKE_INSTALL_LIBDIR` | lib 또는 lib64 | 라이브러리 |
| `CMAKE_INSTALL_INCLUDEDIR` | include | 헤더 파일 |
| `CMAKE_INSTALL_DATADIR` | share | 데이터 파일 |
| `CMAKE_INSTALL_MANDIR` | share/man | 매뉴얼 페이지 |
| `CMAKE_INSTALL_DOCDIR` | share/doc/${PROJECT_NAME} | 문서 |

64비트 시스템에서 일부 배포판은 `lib64`를 사용합니다. `GNUInstallDirs`가 자동으로 감지합니다.

```cmake
include(GNUInstallDirs)

install(TARGETS mylib
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
)

install(DIRECTORY include/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

install(FILES README.md LICENSE
    DESTINATION ${CMAKE_INSTALL_DOCDIR}
)
```

---

## 패키지 설정 파일 — 내 라이브러리를 `find_package`로 사용하게 하기

여기서부터가 *Modern CMake의 진수*입니다. 이 절을 잘 따라 두면 *내 라이브러리를 설치한 사람이 단 두 줄*로 사용할 수 있습니다.

```cmake
# 사용자 측 CMakeLists.txt
find_package(MyLib 1.0 REQUIRED)
target_link_libraries(app PRIVATE MyLib::mylib)
```

이 두 줄이 동작하려면, 내 라이브러리가 설치될 때 *CMake 정보 파일*을 함께 깔아야 합니다. 그 정보 파일이 [Ch 5](/blog/tools/build/cmake/chapter05-find-package#동작-방식--module-모드와-config-모드)에서 본 *Config 모드*의 입력입니다.

### 설치 후의 디렉터리 구조

설치 후의 디렉터리 구조 — `${PREFIX}/` (예: `/usr/local`):

```text
${PREFIX}/
├── bin/
│   └── myapp
├── lib/
│   ├── libmylib.so
│   └── cmake/
│       └── MyLib/
│           ├── MyLibConfig.cmake
│           ├── MyLibConfigVersion.cmake
│           ├── MyLibTargets.cmake
│           └── MyLibTargets-release.cmake
└── include/
    └── mylib/
        └── api.h
```

| 경로 | 역할 |
|------|------|
| `bin/myapp` | 실행 파일 |
| `lib/libmylib.so` | 라이브러리 본체 |
| `lib/cmake/MyLib/MyLibConfig.cmake` | `find_package(MyLib)` 진입점 |
| `lib/cmake/MyLib/MyLibConfigVersion.cmake` | 버전 검사 로직 |
| `lib/cmake/MyLib/MyLibTargets.cmake` | imported 타겟 정의 |
| `lib/cmake/MyLib/MyLibTargets-release.cmake` | 구성별 타겟 정보 |
| `include/mylib/api.h` | 공개 헤더 |

세 파일이 만들어내는 그림:

- **Config.cmake** — *진입점*. `find_package(MyLib)`이 가장 먼저 찾는 파일. 다른 두 파일을 include하고, 의존성을 확인합니다.
- **ConfigVersion.cmake** — *버전 검사*. `find_package(MyLib 1.0)` 호출에서 `1.0`이 호환되는지 결정합니다.
- **Targets.cmake** — *imported 타겟 정의*. `MyLib::mylib`라는 타겟에 *설치된 위치 기반의 include / library 경로*를 박아 둡니다.

이 셋이 *함께* 작동해야 사용자 측에서 `find_package(MyLib REQUIRED)` 한 줄이 깨끗하게 풀립니다. 단계별로 만들어 갑니다.

### 1단계: Config 파일 템플릿

```cmake
# cmake/MyLibConfig.cmake.in
@PACKAGE_INIT@

include("${CMAKE_CURRENT_LIST_DIR}/MyLibTargets.cmake")

check_required_components(MyLib)
```

`@PACKAGE_INIT@`은 `configure_package_config_file()`이 자동으로 채웁니다. 상대 경로 계산을 위한 매크로들이 포함됩니다.

### 2단계: 버전 파일 생성

```cmake
include(CMakePackageConfigHelpers)

write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)
```

`COMPATIBILITY` 옵션:

| 값 | 의미 |
|-----|------|
| `ExactVersion` | 정확히 일치해야 함 |
| `SameMajorVersion` | 메이저 버전만 일치하면 됨 (권장) |
| `SameMinorVersion` | 메이저.마이너 버전 일치 |
| `AnyNewerVersion` | 요청 버전 이상이면 됨 |

### 3단계: 타겟 내보내기 — `install(TARGETS ... EXPORT ...)`

```cmake
# 타겟을 export set에 추가하면서 설치
install(TARGETS mylib
    EXPORT MyLibTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

# export set을 .cmake 파일로 설치
install(EXPORT MyLibTargets
    FILE MyLibTargets.cmake
    NAMESPACE MyLib::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyLib
)
```

여기 등장하는 *세 가지 키워드*가 거의 모든 일을 합니다.

**`EXPORT MyLibTargets`** — *export set의 이름*. CMake 내부에 *논리적인 그룹*을 만든다고 생각하면 됩니다. 여러 타겟을 같은 export set에 묶을 수 있습니다.

```cmake
install(TARGETS mylib EXPORT MyLibTargets ...)
install(TARGETS myhelper EXPORT MyLibTargets ...)
# 두 타겟이 같은 export set에 들어감 → 한 번에 export
```

**`install(EXPORT ...)`** — *export set을 실제 파일로 내보내기*. 위에서 모은 그룹의 모든 타겟 정보를 `MyLibTargets.cmake`라는 파일에 *기록*합니다. 이 파일에는 *설치 시점에 결정되는 경로*가 들어 있어, 사용자 측에서 이 파일을 읽으면 *내 라이브러리가 어디에 설치됐는지*를 알 수 있습니다.

**`NAMESPACE MyLib::`** — *imported 타겟 이름 앞에 붙는 접두사*. 사용자가 `target_link_libraries(app PRIVATE MyLib::mylib)`로 *명확하게* 링크할 수 있게 만듭니다. 이 네임스페이스 관행은 두 효과가 있습니다.

1. *타겟 이름 충돌 방지*. 두 라이브러리가 같은 이름의 타겟을 가져도 네임스페이스로 구분됩니다.
2. *오타 보호*. CMake는 *`::`이 포함된 이름이 존재하지 않으면 즉시 에러*를 냅니다. 일반 이름은 "있을 수도 있으니 일단 진행"하다가 링크 단계에서 발견되지만, `::`이 들어가면 *구성 단계에서* 잡힙니다.

### `INCLUDES DESTINATION` — 헤더 경로 자동 전파

```cmake
install(TARGETS mylib
    EXPORT MyLibTargets
    ...
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
```

`INCLUDES DESTINATION`은 *헤더 파일을 설치하는 명령이 아닙니다*. 그건 별도의 `install(DIRECTORY include/...)`이 합니다. 이 옵션은 *imported 타겟에 INTERFACE include 경로를 설정*하는 메타정보입니다.

위 줄 때문에, 사용자가 `target_link_libraries(app PRIVATE MyLib::mylib)`만 적어도 *자동으로* `-I${PREFIX}/include`가 컴파일러에 들어갑니다. [Ch 3](/blog/tools/build/cmake/chapter03-targets#가시성-키워드-private-public-interface)의 INTERFACE 가시성이 *imported 타겟에도* 동일하게 동작합니다.

### 4단계: Config 파일 생성 및 설치

```cmake
configure_package_config_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/cmake/MyLibConfig.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfig.cmake"
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyLib
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfigVersion.cmake"
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyLib
)
```

### 사용측

```cmake
find_package(MyLib 1.0 REQUIRED)
target_link_libraries(app PRIVATE MyLib::mylib)
```

`find_package`는 다음 경로에서 `MyLibConfig.cmake`를 찾습니다:

- `${CMAKE_INSTALL_PREFIX}/lib/cmake/MyLib/`
- `/usr/lib/cmake/MyLib/`
- `~/.cmake/packages/MyLib/` (등록된 경우)

---

## CPack: 배포 패키지 생성

CPack은 CMake와 함께 제공되는 패키징 도구입니다. 설치 규칙을 바탕으로 DEB, RPM, ZIP, NSIS 등 다양한 형식의 패키지를 생성합니다.

### 기본 설정

```cmake
# CMakeLists.txt 끝에 추가
set(CPACK_PACKAGE_NAME "${PROJECT_NAME}")
set(CPACK_PACKAGE_VERSION "${PROJECT_VERSION}")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "My awesome library for doing things")
set(CPACK_PACKAGE_VENDOR "Example Inc.")
set(CPACK_PACKAGE_CONTACT "maintainer@example.com")
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_SOURCE_DIR}/LICENSE")
set(CPACK_RESOURCE_FILE_README "${CMAKE_CURRENT_SOURCE_DIR}/README.md")

include(CPack)  # 반드시 CPACK_ 변수 설정 후에 호출
```

### 패키지 생성

```bash
cmake -B build
cmake --build build
cd build
cpack
```

기본적으로 시스템에 따라 적절한 생성기를 선택합니다. 명시적으로 지정하려면:

```bash
cpack -G TGZ          # tar.gz 아카이브
cpack -G ZIP          # zip 아카이브
cpack -G DEB          # Debian 패키지 (.deb)
cpack -G RPM          # Red Hat 패키지 (.rpm)
cpack -G NSIS         # Windows 설치 프로그램
cpack -G DragNDrop    # macOS DMG
cpack -G productbuild # macOS PKG
```

### DEB 패키지 설정

```cmake
set(CPACK_GENERATOR "DEB")
set(CPACK_DEBIAN_PACKAGE_MAINTAINER "Your Name <you@example.com>")
set(CPACK_DEBIAN_PACKAGE_SECTION "devel")
set(CPACK_DEBIAN_PACKAGE_DEPENDS "libc6 (>= 2.17), libstdc++6 (>= 9)")
set(CPACK_DEBIAN_PACKAGE_HOMEPAGE "https://github.com/example/mylib")
set(CPACK_DEBIAN_PACKAGE_DESCRIPTION "Long description of the package.
This can span multiple lines and provides
detailed information about the package.")

include(CPack)
```

```bash
cpack -G DEB
# 결과: mylib-1.2.3-Linux.deb
```

### RPM 패키지 설정

```cmake
set(CPACK_GENERATOR "RPM")
set(CPACK_RPM_PACKAGE_LICENSE "MIT")
set(CPACK_RPM_PACKAGE_GROUP "Development/Libraries")
set(CPACK_RPM_PACKAGE_REQUIRES "glibc >= 2.17, libstdc++ >= 9")
set(CPACK_RPM_PACKAGE_URL "https://github.com/example/mylib")
set(CPACK_RPM_PACKAGE_DESCRIPTION "Long description of the package.")

include(CPack)
```

---

## 컴포넌트 기반 패키징

대규모 프로젝트에서는 런타임, 개발 파일, 문서를 별도 패키지로 분리하고 싶을 수 있습니다.

### 컴포넌트 정의

```cmake
# 실행 파일 — Runtime 컴포넌트
install(TARGETS myapp
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    COMPONENT Runtime
)

# 라이브러리 — Libraries 컴포넌트
install(TARGETS mylib
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    COMPONENT Libraries
)

# 헤더 — Development 컴포넌트
install(DIRECTORY include/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
    COMPONENT Development
)

# 문서 — Documentation 컴포넌트
install(FILES README.md LICENSE CHANGELOG.md
    DESTINATION ${CMAKE_INSTALL_DOCDIR}
    COMPONENT Documentation
)
```

### 컴포넌트 메타데이터

```cmake
set(CPACK_COMPONENTS_ALL Runtime Libraries Development Documentation)

set(CPACK_COMPONENT_RUNTIME_DISPLAY_NAME "Application")
set(CPACK_COMPONENT_RUNTIME_DESCRIPTION "The main executable")
set(CPACK_COMPONENT_RUNTIME_REQUIRED TRUE)

set(CPACK_COMPONENT_LIBRARIES_DISPLAY_NAME "Libraries")
set(CPACK_COMPONENT_LIBRARIES_DESCRIPTION "Shared libraries")

set(CPACK_COMPONENT_DEVELOPMENT_DISPLAY_NAME "Development")
set(CPACK_COMPONENT_DEVELOPMENT_DESCRIPTION "Headers and CMake config files")
set(CPACK_COMPONENT_DEVELOPMENT_DEPENDS Libraries)

set(CPACK_COMPONENT_DOCUMENTATION_DISPLAY_NAME "Documentation")
set(CPACK_COMPONENT_DOCUMENTATION_DESCRIPTION "README and LICENSE files")

include(CPack)
```

### 컴포넌트별 패키지 생성

```bash
# DEB: 컴포넌트별 패키지
set(CPACK_DEB_COMPONENT_INSTALL ON)
```

결과는 컴포넌트별로 분리된 `.deb` 파일들이 생깁니다 — `mylib-1.2.3-Linux-Runtime.deb`, `Libraries.deb`, `Development.deb`, `Documentation.deb`.

---

## 실전 예시: 완전한 설치 설정

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyLib VERSION 1.2.3 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(GNUInstallDirs)
include(CMakePackageConfigHelpers)

# === 라이브러리 ===
add_library(mylib src/mylib.cpp)
add_library(MyLib::mylib ALIAS mylib)  # 빌드 트리에서도 네임스페이스 사용

target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

target_compile_features(mylib PUBLIC cxx_std_17)

set_target_properties(mylib PROPERTIES
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

# === 설치 규칙 ===
install(TARGETS mylib
    EXPORT MyLibTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
        COMPONENT Runtime
        NAMELINK_COMPONENT Development
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
        COMPONENT Development
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
        COMPONENT Runtime
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

install(DIRECTORY include/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
    COMPONENT Development
)

# === 패키지 설정 파일 ===
install(EXPORT MyLibTargets
    FILE MyLibTargets.cmake
    NAMESPACE MyLib::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyLib
    COMPONENT Development
)

write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)

configure_package_config_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/cmake/MyLibConfig.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfig.cmake"
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyLib
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfigVersion.cmake"
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyLib
    COMPONENT Development
)

# === CPack 설정 ===
set(CPACK_PACKAGE_NAME "${PROJECT_NAME}")
set(CPACK_PACKAGE_VERSION "${PROJECT_VERSION}")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "My awesome library")
set(CPACK_PACKAGE_VENDOR "Example Inc.")
set(CPACK_PACKAGE_CONTACT "maintainer@example.com")
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_SOURCE_DIR}/LICENSE")

set(CPACK_COMPONENTS_ALL Runtime Development)
set(CPACK_DEB_COMPONENT_INSTALL ON)
set(CPACK_RPM_COMPONENT_INSTALL ON)

set(CPACK_DEBIAN_PACKAGE_MAINTAINER "${CPACK_PACKAGE_CONTACT}")
set(CPACK_DEBIAN_RUNTIME_PACKAGE_DEPENDS "libc6 (>= 2.17)")
set(CPACK_DEBIAN_DEVELOPMENT_PACKAGE_DEPENDS "mylib (= ${PROJECT_VERSION})")

include(CPack)
```

### 빌드 및 패키징

```bash
# 빌드
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build

# 로컬 설치 테스트
DESTDIR=/tmp/test cmake --install build
tree /tmp/test

# 패키지 생성
cd build
cpack -G DEB
cpack -G TGZ
```

---

## 정리

- `install(TARGETS ...)`로 빌드된 타겟을 설치합니다.
- `install(FILES ...)`, `install(DIRECTORY ...)`로 추가 파일을 설치합니다.
- `GNUInstallDirs`로 플랫폼 표준 경로를 사용합니다.
- 패키지 설정 파일(`*Config.cmake`, `*Targets.cmake`)을 생성하면 `find_package()`로 찾을 수 있습니다.
- `CPack`으로 DEB, RPM, ZIP 등 배포 패키지를 생성합니다.
- 컴포넌트(`COMPONENT`)로 런타임/개발/문서를 분리할 수 있습니다.
- `DESTDIR`로 실제 시스템 대신 임시 디렉터리에 설치할 수 있습니다.

---

## 흔한 실수

### include(CPack) 전에 변수를 설정하지 않음

```cmake
include(CPack)  # ❌ 변수 설정 전에 호출하면 기본값 사용

set(CPACK_PACKAGE_NAME "MyApp")  # 무시됨
```

```cmake
# 올바른 순서
set(CPACK_PACKAGE_NAME "MyApp")
set(CPACK_PACKAGE_VERSION "1.0.0")
include(CPack)  # 변수 설정 후에 호출
```

### DIRECTORY 설치 시 슬래시 누락

```cmake
install(DIRECTORY include DESTINATION include)  # ❌
# 결과: ${PREFIX}/include/include/mylib/api.h (중복!)

install(DIRECTORY include/ DESTINATION include)  # ✓
# 결과: ${PREFIX}/include/mylib/api.h
```

### EXPORT와 PUBLIC_HEADER 혼용

```cmake
# ❌ 둘 다 쓰면 헤더가 두 번 설치될 수 있음
install(TARGETS mylib
    EXPORT MyLibTargets
    PUBLIC_HEADER DESTINATION include/mylib  # 이것과
)
install(DIRECTORY include/ DESTINATION include)  # 이것이 중복
```

하나만 선택하세요. `EXPORT` + `install(DIRECTORY ...)`가 더 유연합니다.

### INCLUDES DESTINATION 누락

```cmake
install(TARGETS mylib
    EXPORT MyLibTargets
    LIBRARY DESTINATION lib
    # ❌ INCLUDES DESTINATION 누락
)
```

`INCLUDES DESTINATION`이 없으면 `MyLibTargets.cmake`에 include 경로가 포함되지 않습니다. 사용측에서 `target_include_directories()`를 별도로 호출해야 합니다.

```cmake
install(TARGETS mylib
    EXPORT MyLibTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}  # 필수!
)
```

### Config 파일 경로와 INSTALL_DESTINATION 불일치

```cmake
configure_package_config_file(
    ...
    INSTALL_DESTINATION lib/cmake/MyLib  # 이 경로와
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfig.cmake"
    DESTINATION share/cmake/MyLib  # ❌ 이 경로가 다르면 상대 경로 계산 오류
)
```

`INSTALL_DESTINATION`과 실제 설치 경로는 반드시 일치해야 합니다.

---

## 다음 장 예고

Ch 8에서는 **Modern CMake 베스트 프랙티스**를 다룹니다. 타겟 중심 접근법, 피해야 할 안티패턴, 그리고 대규모 프로젝트 구성을 정리합니다.

---

## 참고 자료

- [CMake - install 명령](https://cmake.org/cmake/help/latest/command/install.html)
- [CMake - CPack](https://cmake.org/cmake/help/latest/module/CPack.html)
- [CMake - 패키지 생성](https://cmake.org/cmake/help/latest/manual/cmake-packages.7.html)
- [GNUInstallDirs 모듈](https://cmake.org/cmake/help/latest/module/GNUInstallDirs.html)
