---
title: "CMake 설치와 패키징 — install·EXPORT·CPack"
slug: "tools/build/cmake/chapter07-install"
date: 2026-06-02T09:07:00
description: "install 명령으로 빌드 결과물 배포, CPack으로 플랫폼별 패키지 생성."
tags: [cmake, build, cpp, install, cpack]
series: "CMake"
seriesOrder: 7
draft: false
topics: ["tools", "tools/build"]
---

## 왜 설치 규칙이 필요한가

빌드가 끝나면 산물은 *빌드 디렉터리에 어지럽게 흩어진 상태*입니다.

```text
build/
├── myapp
├── libmylib.so
├── CMakeFiles/
├── cmake_install.cmake
└── ...
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

`install()`은 이 매핑 규칙을 선언합니다. 어떤 파일이 어디로 가는지는 `cmake --install`이 찍는 `-- Installing: ...` 줄로 확인합니다. 이 글의 실행 기준은 CMake/CPack 4.5.0·Ninja 1.13.2·macOS 27.2·AppleClang 21이고, 아래 설치 경로와 파일 목록은 모두 이 환경에서 실행한 결과입니다. macOS에서 공유 라이브러리는 `.so`가 아니라 `.dylib`로 나옵니다. 마지막 예제는 임시 prefix에 설치한 정적 라이브러리를 다른 프로젝트에서 찾아 링크하고, TGZ 패키지를 생성합니다.

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

Windows에서 DLL은 `RUNTIME`, import 라이브러리는 `ARCHIVE`로 분류됩니다([install(TARGETS)](https://cmake.org/cmake/help/latest/command/install.html#targets)의 산출물 종류 표). 그래서 같은 `install(TARGETS)` 한 줄이 Linux에서는 `.so`를 `lib/`로, Windows에서는 `.dll`을 `bin/`으로 보냅니다. Windows 쪽은 이 글에서 실행하지 않았습니다.

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

`CMAKE_INSTALL_PREFIX`가 설치 루트입니다. [변수 문서](https://cmake.org/cmake/help/latest/variable/CMAKE_INSTALL_PREFIX.html)의 기본값은 UNIX에서 `/usr/local`, Windows에서 `c:/Program Files/${PROJECT_NAME}`이고, 3.29부터는 같은 이름의 환경 변수가 있으면 그 값이 기본값이 됩니다. 4.5.0·macOS에서 아무 설정 없이 구성한 캐시에는 `CMAKE_INSTALL_PREFIX:PATH=/usr/local`이 들어갔습니다. 설치 확인에는 시스템 디렉터리 대신 `cmake --install build --prefix ./stage`처럼 별도 경로를 사용합니다.

### DESTDIR: 패키징용 가상 루트

실제 시스템이 아닌 임시 디렉터리에 설치하려면 `DESTDIR`을 사용합니다. 배포판 패키지 빌드는 이 방식으로 파일을 스테이징 디렉터리에 모은 뒤 패키지로 묶습니다.

```bash
DESTDIR=/tmp/staging cmake --install build
```

`myapp`·공유 라이브러리 `mylib`·`include/` 디렉터리를 설치하는 프로젝트를 prefix 기본값(`/usr/local`) 그대로 `DESTDIR=$PWD/st`로 설치한 결과입니다(경로는 줄임, 헤더 설치 줄은 생략).

```text
-- Install configuration: ""
-- Installing: <src>/st/usr/local/bin/myapp
-- Installing: <src>/st/usr/local/lib/libmylib.dylib
...
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

같은 `include/`를 `DESTINATION slash`와 `DESTINATION noslash`로 각각 설치해 보면 차이가 그대로 나옵니다(4.5.0).

```text
./noslash/include/mylib/api.h
./slash/mylib/api.h
```

### 파일 필터링

`FILES_MATCHING` 뒤의 패턴에 맞는 파일만 설치하고, `EXCLUDE`를 붙인 패턴은 뺍니다.

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

`include/mylib/`에 `api.h`·`types.hpp`·`config.h.in`·`internal/detail.h`를 두고 위 규칙으로 설치하면 `api.h`와 `types.hpp` 두 파일만 남았습니다. 필터 없이 설치한 쪽에는 네 파일이 모두 들어갔습니다.

### 권한 설정

```cmake
install(FILES scripts/run.sh
    DESTINATION bin
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE
                GROUP_READ GROUP_EXECUTE
                WORLD_READ WORLD_EXECUTE
)
```

설치된 `bin/run.sh`의 권한은 `-rwxr-xr-x`였습니다. `install(FILES)`는 `PERMISSIONS`를 주지 않으면 실행 비트 없이 설치하므로, 스크립트에는 이 옵션이나 `install(PROGRAMS)`를 씁니다.

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

`CMAKE_INSTALL_LIBDIR`의 기본값은 플랫폼마다 다르고, 규칙은 `Modules/GNUInstallDirs.cmake`에 있습니다. 크로스 컴파일이 아닌 Linux에서 Debian 계열은 prefix가 `/usr`일 때 `lib/<multiarch-tuple>`, Alpine·Arch·conda 환경을 제외한 그 밖의 64비트 배포판은 `lib64`이고, 크로스 컴파일이나 그 외 플랫폼은 `lib`입니다. 4.5.0·macOS에서 구성하면 `LIBDIR=lib`, `DOCDIR=share/doc/<프로젝트 이름>`, `MANDIR=share/man`이었습니다.

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

이 절의 파일 네 개를 만들어 두면 *내 라이브러리를 설치한 사람이 두 줄*로 사용할 수 있습니다. 아래 "실전 예시"에서 실제로 설치·소비까지 돌립니다.

```cmake
# 사용자 측 CMakeLists.txt
find_package(MyLib 1.0 REQUIRED)
target_link_libraries(app PRIVATE MyLib::mylib)
```

이 두 줄이 동작하려면, 내 라이브러리가 설치될 때 *CMake 정보 파일*을 함께 깔아야 합니다. 그 정보 파일이 [Ch 5](/blog/tools/build/cmake/chapter05-find-package#동작-방식--module-모드와-config-모드)에서 본 *Config 모드*의 입력입니다.

### 설치 후의 디렉터리 구조

이 글 끝의 실전 예시(정적 라이브러리)를 Release로 빌드해 `--prefix $PWD/stage`로 설치했을 때 4.5.0이 찍은 목록입니다.

```text
-- Install configuration: "Release"
-- Installing: <src>/stage/lib/libmylib.a
-- Installing: <src>/stage/include
-- Installing: <src>/stage/include/mylib
-- Installing: <src>/stage/include/mylib/api.hpp
-- Installing: <src>/stage/lib/cmake/MyLib/MyLibTargets.cmake
-- Installing: <src>/stage/lib/cmake/MyLib/MyLibTargets-release.cmake
-- Installing: <src>/stage/lib/cmake/MyLib/MyLibConfig.cmake
-- Installing: <src>/stage/lib/cmake/MyLib/MyLibConfigVersion.cmake
```

`MyLibTargets-release.cmake`의 `release`는 빌드 구성에서 옵니다. `CMAKE_BUILD_TYPE` 없이 빌드하면 같은 파일이 `MyLibTargets-noconfig.cmake`로 생겼습니다.

| 경로 | 역할 |
|------|------|
| `lib/libmylib.a` | 라이브러리 본체 |
| `lib/cmake/MyLib/MyLibConfig.cmake` | `find_package(MyLib)` 진입점 |
| `lib/cmake/MyLib/MyLibConfigVersion.cmake` | 버전 검사 로직 |
| `lib/cmake/MyLib/MyLibTargets.cmake` | imported 타겟 정의 |
| `lib/cmake/MyLib/MyLibTargets-release.cmake` | 구성별 타겟 정보 |
| `include/mylib/api.hpp` | 공개 헤더 |

세 파일이 만들어내는 그림:

- **ConfigVersion.cmake** — 버전을 요청하면 `find_package()`가 후보 Config를 채택하기 전에 별도 스코프에서 버전 호환성을 확인하는 파일입니다.
- **Config.cmake** — 채택된 패키지의 진입점입니다. Targets를 include하고 필요한 외부 의존성을 확인합니다. ConfigVersion을 직접 include하는 역할이 아닙니다.
- **Targets.cmake** — *imported 타겟 정의*. `MyLib::mylib`라는 타겟에 *설치된 위치 기반의 include / library 경로*를 박아 둡니다.

`MyLibTargets.cmake`가 설치 위치를 하드코딩하지 않는다는 점이 중요합니다. 생성된 파일은 자기 위치(`CMAKE_CURRENT_LIST_FILE`)에서 `get_filename_component(... PATH)`를 네 번 올라가 `_IMPORT_PREFIX`를 계산하고, `INTERFACE_INCLUDE_DIRECTORIES "${_IMPORT_PREFIX}/include"`처럼 그 기준의 경로를 씁니다. 그래서 설치된 `stage/`를 다른 이름으로 옮긴 뒤 새 prefix로 소비자를 구성해도 `answer=42`가 그대로 나왔습니다. 단계별로 만들어 갑니다.

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
| `SameMajorVersion` | 설치 버전이 요청 이상이고 메이저 버전이 같아야 함 |
| `SameMinorVersion` | 설치 버전이 요청 이상이고 메이저·마이너 버전이 같아야 함 |
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
2. *오타 보호*. `::`이 포함된 이름이 타겟이 아니면 CMake가 생성 단계에서 `Target "app" links to: ... but the target was not found` 오류를 냅니다. 일반 이름은 링커 옵션 `-l<이름>`으로 넘어가 링크 단계에서야 실패합니다. 두 경우의 실제 출력은 [Ch 3](/blog/tools/build/cmake/chapter03-targets#별칭-없이-사용)에 있습니다.

### `INCLUDES DESTINATION` — 헤더 경로 자동 전파

```cmake
install(TARGETS mylib
    EXPORT MyLibTargets
    ...
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
```

`INCLUDES DESTINATION`은 *헤더 파일을 설치하는 명령이 아닙니다*. 그건 별도의 `install(DIRECTORY include/...)`이 합니다. 이 옵션은 *imported 타겟에 INTERFACE include 경로를 설정*하는 메타정보입니다.

위 줄 때문에, 사용자가 `target_link_libraries(app PRIVATE MyLib::mylib)`만 적어도 *자동으로* `-I${PREFIX}/include`가 컴파일러에 들어갑니다. `$<BUILD_INTERFACE:...>`만 걸고 `INCLUDES DESTINATION include`를 준 라이브러리를 설치하면, 생성된 `MyLibTargets.cmake`에 `INTERFACE_INCLUDE_DIRECTORIES "${_IMPORT_PREFIX}/include"`가 들어 있었습니다. [Ch 3](/blog/tools/build/cmake/chapter03-targets#가시성-키워드-private-public-interface)의 INTERFACE 가시성이 *imported 타겟에도* 동일하게 동작합니다.

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

소비자는 `CMAKE_PREFIX_PATH`로 설치 prefix를 추가하거나 `MyLib_DIR`로 Config 디렉터리를 지정합니다. 패키지 레지스트리는 설치 파일을 그 안에 복사하는 위치가 아니라 빌드 트리 등의 경로를 등록하는 장치입니다. [패키지 버전 파일과 레지스트리](https://cmake.org/cmake/help/v4.4/manual/cmake-packages.7.html)를 구분합니다.

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

`CPACK_GENERATOR`를 정하지 않으면 `include(CPack)`이 플랫폼별 기본값을 넣습니다. 4.5.0·macOS에서 생성된 `CPackConfig.cmake`에는 `set(CPACK_GENERATOR "STGZ;TGZ")`가 있었고, `cpack`만 실행하자 `mylib-1.2.3-Darwin.sh`와 `mylib-1.2.3-Darwin.tar.gz`가 생겼습니다. 명시적으로 지정하려면:

```bash
cpack -G TGZ          # tar.gz 아카이브
cpack -G ZIP          # zip 아카이브
cpack -G DEB          # Debian 패키지 (.deb)
cpack -G RPM          # Red Hat 패키지 (.rpm)
cpack -G NSIS         # Windows 설치 프로그램
cpack -G DragNDrop    # macOS DMG
cpack -G productbuild # macOS PKG
```

쓸 수 있는 생성기는 CPack을 빌드한 플랫폼에 따라 다르고, `cpack --help`의 `Generators` 절에 나옵니다. Homebrew CPack 4.5.0(macOS)의 목록에는 `TGZ`·`ZIP`·`NSIS`·`DragNDrop`·`productbuild` 등은 있지만 `DEB`와 `RPM`이 없었고, `cpack -G DEB`는 `CPack Error: Could not create CPack generator: DEB`로 실패했습니다. 아래 DEB·RPM 설정은 Linux에서 실행하는 것을 전제로 하며, 이 글에서는 실행하지 않았습니다.

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

파일 이름은 [CPack DEB 생성기 문서](https://cmake.org/cmake/help/latest/cpack_gen/deb.html)의 `CPACK_DEBIAN_FILE_NAME` 기본값 `<CPACK_PACKAGE_FILE_NAME>[-<component>].deb`에서 나옵니다. `CPACK_PACKAGE_FILE_NAME`의 기본값은 `이름-버전-시스템`이라, 같은 프로젝트를 macOS에서 구성하면 `mylib-1.2.3-Darwin`이었습니다.

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

런타임만 필요한 사용자와 헤더까지 필요한 개발자가 같은 패키지를 받지 않게 하려면 런타임, 개발 파일, 문서를 별도 패키지로 나눕니다.

### 컴포넌트 정의

```cmake
# 실행 파일 — Runtime 컴포넌트
install(TARGETS myapp
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    COMPONENT Runtime
)

# 라이브러리 — Libraries 컴포넌트
install(TARGETS mylib
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT Libraries
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT Libraries
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

```cmake
# DEB: 컴포넌트별 패키지
set(CPACK_DEB_COMPONENT_INSTALL ON)
```

Linux에서는 위 파일 이름 규칙에 따라 `mylib-1.2.3-Linux-Runtime.deb`처럼 컴포넌트 이름이 붙은 `.deb`가 컴포넌트마다 하나씩 생깁니다. DEB를 만들 수 없는 macOS에서는 아카이브 생성기로 같은 분리를 확인했습니다. 위 네 컴포넌트 규칙에 `cpack -G TGZ -D CPACK_ARCHIVE_COMPONENT_INSTALL=ON`을 주면 4.5.0이 네 파일을 만들었습니다.

```text
mylib-1.2.3-Darwin-Development.tar.gz generated.
mylib-1.2.3-Darwin-Documentation.tar.gz generated.
mylib-1.2.3-Darwin-Libraries.tar.gz generated.
mylib-1.2.3-Darwin-Runtime.tar.gz generated.
```

---

## 실전 예시 — 설치한 라이브러리를 별도 프로젝트에서 사용하기

생산자와 소비자를 분리해야 소스 트리의 경로가 우연히 전달된 문제를 발견할 수 있습니다. 아래 파일들은 생산자 루트와 그 안의 `consumer/`에 저장합니다. 설치 대상은 정적 라이브러리이므로 공유 라이브러리의 런타임 탐색 문제는 이 예제의 범위 밖입니다.

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(MyLib VERSION 1.2.3 LANGUAGES CXX)
include(GNUInstallDirs)
add_library(mylib STATIC src/mylib.cpp)
target_include_directories(mylib PUBLIC
    "$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>"
    "$<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>"
)
include(cmake/install.cmake)
set(CPACK_GENERATOR TGZ)
set(CPACK_PACKAGE_NAME MyLib)
set(CPACK_PACKAGE_VERSION "${PROJECT_VERSION}")
include(CPack)
```

설치 규칙과 패키지 파일 생성은 별도 파일에 모읍니다. include 경로는 INSTALL_INTERFACE가 제공하므로 INCLUDES DESTINATION을 중복 지정하지 않습니다.

```cmake title="cmake/install.cmake"
include(CMakePackageConfigHelpers)
set(PACKAGE_DIR "${CMAKE_INSTALL_LIBDIR}/cmake/MyLib")
install(TARGETS mylib EXPORT MyLibTargets
    ARCHIVE DESTINATION "${CMAKE_INSTALL_LIBDIR}")
install(DIRECTORY include/ DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}")
install(EXPORT MyLibTargets NAMESPACE MyLib::
    DESTINATION "${PACKAGE_DIR}")
write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfigVersion.cmake"
    VERSION "${PROJECT_VERSION}" COMPATIBILITY SameMajorVersion)
configure_package_config_file(cmake/MyLibConfig.cmake.in
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfig.cmake"
    INSTALL_DESTINATION "${PACKAGE_DIR}")
install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfigVersion.cmake"
    DESTINATION "${PACKAGE_DIR}")
```

Config는 Targets만 읽습니다. 버전 검사는 find_package가 따로 수행합니다.

```cmake title="cmake/MyLibConfig.cmake.in"
@PACKAGE_INIT@
include("${CMAKE_CURRENT_LIST_DIR}/MyLibTargets.cmake")
check_required_components(MyLib)
```

라이브러리는 확인하기 쉬운 상수 반환 API를 제공합니다.

```cpp title="include/mylib/api.hpp"
#pragma once
int answer();
```

구현은 공개 헤더를 사용합니다.

```cpp title="src/mylib.cpp"
#include <mylib/api.hpp>
int answer() { return 42; }
```

소비자는 생산자의 타겟을 직접 참조하거나 add_subdirectory로 가져오지 않습니다.

```cmake title="consumer/CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(Consumer LANGUAGES CXX)
find_package(MyLib 1.0 CONFIG REQUIRED)
add_executable(app main.cpp)
target_link_libraries(app PRIVATE MyLib::mylib)
```

소비자 프로그램에서 헤더 탐색·링크·실행을 확인합니다.

```cpp title="consumer/main.cpp"
#include <mylib/api.hpp>
#include <iostream>
int main() { std::cout << "answer=" << answer() << '\n'; }
```

Ninja가 있는 macOS·Linux 셸에서 실행합니다. `stage`는 이 예제 디렉터리 안의 임시 설치 prefix입니다.

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
cmake --install build --prefix "$PWD/stage"
cmake -S consumer -B consumer-build -G Ninja -DCMAKE_PREFIX_PATH="$PWD/stage"
cmake --build consumer-build
./consumer-build/app
cpack --config build/CPackConfig.cmake -G TGZ -B packages
```

4.5.0에서 실행 결과는 `answer=42`였습니다. `stage`를 `stage-moved`로 옮기고 새 소비자 빌드 디렉터리에서 `-DCMAKE_PREFIX_PATH=$PWD/stage-moved`로 구성해도 `answer=42`가 나왔습니다. 소비자의 요청 버전을 1.9로 바꾸면 이렇게 거절됩니다.

```text
CMake Error at CMakeLists.txt:3 (find_package):
  Could not find a configuration file for package "MyLib" that is compatible
  with requested version "1.9".

  The following configuration files were considered but not accepted:

    <src>/stage/lib/cmake/MyLib/MyLibConfig.cmake, version: 1.2.3
      The version found is not compatible with the version requested.
```

`cpack`은 `packages/MyLib-1.2.3-Darwin.tar.gz`를 만들었고, `tar tzf`로 본 내용은 다음과 같습니다(디렉터리 항목은 생략).

```text
MyLib-1.2.3-Darwin/include/mylib/api.hpp
MyLib-1.2.3-Darwin/lib/cmake/MyLib/MyLibConfig.cmake
MyLib-1.2.3-Darwin/lib/cmake/MyLib/MyLibConfigVersion.cmake
MyLib-1.2.3-Darwin/lib/cmake/MyLib/MyLibTargets-release.cmake
MyLib-1.2.3-Darwin/lib/cmake/MyLib/MyLibTargets.cmake
MyLib-1.2.3-Darwin/lib/libmylib.a
```

DEB/RPM/NSIS/DMG 생성은 이 실행 기록에서 검증하지 않았습니다.

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

`include(CPack)`은 그 시점의 변수로 `CPackConfig.cmake`를 씁니다. `project(Ord ...)`에서 위 순서로 구성하면 생성된 파일에 `set(CPACK_PACKAGE_NAME "Ord")`가 들어 있었습니다. 뒤에 적은 `MyApp`은 반영되지 않았습니다.

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

중복은 EXPORT 자체가 아니라 같은 헤더를 두 설치 규칙으로 지정했을 때 생깁니다. `PUBLIC_HEADER`에 `include/mylib/api.hpp`를 지정하고 위 두 규칙을 함께 쓰면 4.5.0 설치 로그에 같은 파일이 두 번 나옵니다.

```text
-- Installing: <src>/st/include/mylib/api.hpp
-- Up-to-date: <src>/st/include
-- Up-to-date: <src>/st/include/mylib
-- Up-to-date: <src>/st/include/mylib/api.hpp
```

결과 파일은 하나지만, 두 규칙의 목적지가 달라지면 헤더가 두 곳에 깔립니다. 한 가지 방식만 씁니다. 타겟 export는 두 방식 모두와 함께 사용할 수 있습니다.

### INCLUDES DESTINATION 누락

```cmake
install(TARGETS mylib
    EXPORT MyLibTargets
    LIBRARY DESTINATION lib
    # ❌ INCLUDES DESTINATION 누락
)
```

`INCLUDES DESTINATION`은 설치된 타겟의 include 사용 요구사항을 추가하는 방법 중 하나입니다. 이미 `target_include_directories(mylib PUBLIC $<INSTALL_INTERFACE:include>)`를 설정했다면 그 경로가 export되므로 이 옵션이 필수는 아닙니다. 마지막 완성 예제는 이 옵션 없이 소비자가 헤더를 찾는 것을 확인합니다. [install의 include 경로 처리](https://cmake.org/cmake/help/v4.4/command/install.html#installing-targets)를 참고합니다.

```cmake
install(TARGETS mylib
    EXPORT MyLibTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}  # 추가 경로를 제공하는 대안
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

`configure_package_config_file()`은 `INSTALL_DESTINATION`에서 prefix까지 몇 단계 올라가야 하는지를 계산해 `PACKAGE_PREFIX_DIR`에 박아 둡니다(이 예제의 생성 파일에는 `"${CMAKE_CURRENT_LIST_DIR}/../../../"`). 그래서 실제 설치 경로의 깊이가 다르면 `@PACKAGE_...@` 경로가 틀어집니다. `set_and_check(MyLib_INCLUDE_DIR "@PACKAGE_INCLUDE_INSTALL_DIR@")`를 넣은 Config로 4.5.0에서 시험한 결과입니다.

| 실제 설치 경로 | 소비자 구성 결과 |
|------|------|
| `share/cmake/MyLib` (깊이 3, 같음) | 통과, `MyLib_INCLUDE_DIR=<prefix>/include` |
| `cmake` (깊이 1) | `File or directory .../include referenced by variable MyLib_INCLUDE_DIR does not exist !` |

깊이가 같으면 우연히 동작하므로, 경로가 어긋난 채로 배포되기 쉽습니다. `INSTALL_DESTINATION`과 `install(FILES ... DESTINATION)`에 같은 변수를 씁니다.

---

## 다음 장 예고

[Ch 8](/blog/tools/build/cmake/chapter08-best-practices)에서는 **Modern CMake 베스트 프랙티스**를 다룹니다. 타겟 중심 접근법, 피해야 할 안티패턴, 그리고 대규모 프로젝트 구성을 정리합니다.

---

## 참고 자료

- [CMake - install 명령](https://cmake.org/cmake/help/v4.4/command/install.html)
- [CMake - CPack](https://cmake.org/cmake/help/v4.4/module/CPack.html)
- [CMake - 패키지 생성](https://cmake.org/cmake/help/v4.4/manual/cmake-packages.7.html)
- [GNUInstallDirs 모듈](https://cmake.org/cmake/help/v4.4/module/GNUInstallDirs.html)

## 관련 항목

- [Ch 6: 테스트와 CTest](/blog/tools/build/cmake/chapter06-testing) — 설치 전에 통과시켜야 할 검증 단계
- [Ch 8: Modern CMake 베스트 프랙티스](/blog/tools/build/cmake/chapter08-best-practices) — 설치까지 고려한 프로젝트 구조 정리
- [Ch 5: find_package와 외부 의존성](/blog/tools/build/cmake/chapter05-find-package) — 내가 export한 패키지를 남이 찾아 쓰는 반대편 시점
- [실전 Makefile 예제](/blog/tools/build/gnu-make/chapter07-practical) — `install` 타겟과 DESTDIR을 Make에서 직접 쓰는 방식
- [CPackComponent 모듈](https://cmake.org/cmake/help/v4.4/module/CPackComponent.html) — 컴포넌트 기반 패키징 옵션 전체
