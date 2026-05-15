---
title: "Ch 7: 설치와 패키징"
date: 2025-05-14T07:00:00
description: "install 명령으로 빌드 결과물 배포, CPack으로 플랫폼별 패키지 생성."
tags: [cmake, build, cpp, install, cpack]
series: "CMake"
seriesOrder: 7
draft: false
---

## 왜 설치 규칙이 필요한가

빌드가 끝나면 산물은 *빌드 디렉터리에 어지럽게 흩어진 상태*입니다.

```
build/
├── myapp                  # 실행 파일
├── libmylib.so           # 공유 라이브러리
├── CMakeFiles/           # CMake 내부
├── cmake_install.cmake   # 설치 스크립트 (CMake가 생성)
└── ... 수십 개의 파일
```

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

```
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

## 패키지 설정 파일: find_package 지원

라이브러리를 설치한 후 다른 프로젝트에서 `find_package(MyLib)`로 찾을 수 있게 하려면 패키지 설정 파일을 생성해야 합니다.

```
설치된 패키지 구조:

${PREFIX}/
├── lib/
│   ├── libmylib.so
│   └── cmake/
│       └── MyLib/
│           ├── MyLibConfig.cmake        # 패키지 설정
│           ├── MyLibConfigVersion.cmake # 버전 검사
│           └── MyLibTargets.cmake       # 타겟 정보
└── include/
    └── mylib/
        └── api.h
```

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

### 3단계: 타겟 내보내기

```cmake
# 타겟을 export set에 추가하며 설치
install(TARGETS mylib
    EXPORT MyLibTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

# export set을 파일로 설치
install(EXPORT MyLibTargets
    FILE MyLibTargets.cmake
    NAMESPACE MyLib::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyLib
)
```

`NAMESPACE MyLib::`는 사용측에서 `MyLib::mylib`로 링크하게 만듭니다. 타겟 이름 충돌을 방지하고, 실수로 없는 타겟을 링크하면 에러가 발생합니다.

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

결과:

```
mylib-1.2.3-Linux-Runtime.deb
mylib-1.2.3-Linux-Libraries.deb
mylib-1.2.3-Linux-Development.deb
mylib-1.2.3-Linux-Documentation.deb
```

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
