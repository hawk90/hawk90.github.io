---
title: "Buildroot 새 패키지 작성 — autotools·cmake·python 통합"
slug: "embedded/buildroot/chapter09-new-package"
date: 2026-05-19T09:09:00
description: "Buildroot에 새 패키지를 추가하는 실전 — autotools·cmake·python 세 케이스."
series: "Buildroot Practical"
seriesOrder: 9
tags: [embedded, buildroot, package, autotools, cmake, python]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"빌드 시스템이 정해져 있으면 Buildroot 패키지는 한 페이지면 끝난다."** — autotools, cmake, python은 *전용 infrastructure*가 모든 세부를 처리해 줍니다.

[Ch 5](/blog/embedded/buildroot/chapter05-package-system)에서 `generic-package`로 *무엇이든* 빌드할 수 있는 골격을 봤습니다. 실제 Buildroot 2026.02.3 트리를 세어 보면 target 패키지의 infra 호출은 autotools 1,085, python 570, generic 553, cmake 382 순입니다(Ch 5). 표준 빌드 시스템이 있는 패키지를 매번 `CONFIGURE_CMDS`·`BUILD_CMDS`·`INSTALL_TARGET_CMDS`로 적을 이유는 없습니다.

이 장은 세 infrastructure를 차례로 다룹니다. autotools는 **실제로 외부 트리에 패키지를 만들어 빌드**했습니다. 본체의 `package/htop`을 `htop-acme`라는 이름으로 복제하고, hash 없음·패치 적용·잘못된 hash·legal-info까지 Ch 4의 QEMU 빌드 트리(같은 VM)에서 돌렸습니다. cmake와 python은 본체의 실제 패키지(`cjson`, `python-serial`)와 infra 소스로 규칙을 확인했습니다.

## 세 infrastructure 비교

| Infrastructure | 대상 | `$(eval ...)` |
|----------------|-----|--------------|
| `autotools-package` | `./configure && make && make install`을 따르는 패키지 | `$(eval $(autotools-package))` |
| `cmake-package` | CMakeLists.txt 기반 패키지 | `$(eval $(cmake-package))` |
| `python-package` | setuptools/poetry/flit 기반 Python 패키지 | `$(eval $(python-package))` |

세 infrastructure 모두 *cross-compile 환경 변수* (`CC`, `CXX`, `CFLAGS`, sysroot)를 자동으로 주입합니다. 우리가 직접 적는 건 *URL*, *버전*, *의존성*, *라이선스*만으로 충분합니다.

## 사례 1: autotools-package — htop-acme 추가하기

`htop`은 ncurses에 의존하는 대화형 프로세스 viewer이고 autotools 기반입니다. Buildroot 본체에 `package/htop`이 이미 있으므로, 외부 트리에 *내 fork*를 두는 상황을 흉내 내 `htop-acme`로 복제했습니다. 본체 패키지를 같은 이름으로 다시 정의하면 Ch 6에서 본 "defined a second time" 오류가 나기 때문에 이름을 바꿔야 합니다.

### 디렉터리

```text
br2-acme/package/htop-acme/
├── 0001-htop-mark-acme-build.patch
├── Config.in
├── htop-acme.hash
└── htop-acme.mk
```

### Config.in

본체 `package/htop/Config.in`에서 심볼 이름만 바꿨습니다.

```text
config BR2_PACKAGE_HTOP_ACME
	bool "htop-acme"
	depends on BR2_USE_MMU # fork()
	depends on !BR2_STATIC_LIBS # dlopen()
	select BR2_PACKAGE_NCURSES
	help
	  htop is an interactive text-mode process viewer for Linux.
	  It aims to be a better top.

	  https://htop.dev/

comment "htop-acme needs a toolchain w/ dynamic library"
	depends on BR2_USE_MMU
	depends on BR2_STATIC_LIBS
```

`depends on`은 *조건*이고, `select`는 *같이 켜기*입니다. 실제로 `BR2_PACKAGE_HTOP_ACME=y` 한 줄을 넣고 `olddefconfig`를 돌리자 `.config`에 `BR2_PACKAGE_NCURSES=y`가 따라 들어왔습니다. `comment`는 조건이 맞지 않을 때 menuconfig에 *왜 안 보이는지*를 알려 주는 관례입니다.

### htop-acme.mk

본체 `htop.mk`의 변수 prefix를 `HTOP_ACME_`로 바꾼 것입니다. 옵션 분기 부분만 보입니다.

```makefile
HTOP_ACME_VERSION = 3.4.1
HTOP_ACME_SOURCE = htop-$(HTOP_ACME_VERSION).tar.xz
HTOP_ACME_SITE = https://github.com/htop-dev/htop/releases/download/$(HTOP_ACME_VERSION)
HTOP_ACME_DEPENDENCIES = ncurses
# Prevent htop build system from searching the host paths
HTOP_ACME_CONF_ENV = HTOP_NCURSES_CONFIG_SCRIPT=$(STAGING_DIR)/usr/bin/$(NCURSES_CONFIG_SCRIPTS)
HTOP_ACME_LICENSE = GPL-2.0+
HTOP_ACME_LICENSE_FILES = COPYING
...
ifeq ($(BR2_PACKAGE_LIBCAP),y)
HTOP_ACME_CONF_OPTS += --enable-capabilities
HTOP_ACME_DEPENDENCIES += libcap
else
HTOP_ACME_CONF_OPTS += --disable-capabilities
endif
...
$(eval $(autotools-package))
```

`HTOP_ACME_CONF_ENV`의 주석이 중요한 교훈을 줍니다. 패키지의 configure가 호스트 경로(`/usr/bin/ncurses6-config` 등)를 찾지 않도록, staging의 스크립트를 명시적으로 가리킵니다. 옵션마다 `--enable-*`와 `--disable-*`를 *둘 다* 적는 것도 같은 이유입니다. `--disable-*`를 빼면 configure가 빌드 호스트나 staging에 우연히 있는 라이브러리를 자동으로 찾아 쓸 수 있습니다.

`autotools-package`가 해 주는 일은 `package/pkg-autotools.mk`에 있고, 매뉴얼 "Infrastructure for autotools-based packages"가 변수를 정리합니다. `<PKG>_CONF_OPTS`는 configure 인자, `<PKG>_CONF_ENV`는 configure 환경 변수, `<PKG>_AUTORECONF = YES`는 configure 스크립트 재생성입니다.

### htop-acme.hash

먼저 `.hash` 없이 받아 봤습니다. QEMU defconfig는 `BR2_DOWNLOAD_FORCE_CHECK_HASHES=y`인데도 빌드는 경고만 내고 계속됐습니다.

```text
>>> htop-acme 3.4.1 Downloading
...
WARNING: no hash file for htop-3.4.1.tar.xz
```

`support/download/check-hash`가 hash 파일이 하나도 없을 때 `printf "WARNING: no hash file for %s\n"`를 찍고 `exit 0`하기 때문입니다. 경고를 놓치면 무결성 검사 없이 지나가므로 hash 파일은 처음부터 만듭니다.

```text
$ sha256sum dl/htop-acme/htop-3.4.1.tar.xz
904f7d4580fc11cffc7e0f06895a4789e0c1c054435752c151e812fead9f6220  dl/htop-acme/htop-3.4.1.tar.xz
$ make htop-acme-extract
$ sha256sum output/build/htop-acme-3.4.1/COPYING
8177f97513213526df2cf6184d8ff986c675afb514d4e68a404010521b880643  output/build/htop-acme-3.4.1/COPYING
```

```text
# Locally calculated
sha256  904f7d4580fc11cffc7e0f06895a4789e0c1c054435752c151e812fead9f6220  htop-3.4.1.tar.xz
sha256  8177f97513213526df2cf6184d8ff986c675afb514d4e68a404010521b880643  COPYING
```

두 값은 본체 `package/htop/htop.hash`와 같았습니다. 본체 파일은 tarball hash 위에 `# From https://github.com/htop-dev/htop/releases/download/3.4.1/htop-3.4.1.tar.xz.sha256`라는 주석을 달아, upstream이 공개한 hash와 대조했음을 기록합니다. 매뉴얼 "The .hash file"도 가능하면 upstream이 공개한 hash를 쓰고, 없으면 직접 계산했다고 주석으로 남기라고 권합니다.

`COPYING`까지 hash를 적는 이유는 매뉴얼 표현으로 "to detect a license change when a package version is bumped"이고, 이 검사는 `make legal-info` 때 돕니다.

### Config.in 등록

외부 트리 최상위 `Config.in`에 추가합니다.

```text
menu "ACME packages"
	source "$BR2_EXTERNAL_ACME_PATH/package/htop-acme/Config.in"
endmenu
```

`make htop-acme-show-info`로 infra가 본 메타데이터를 JSON으로 확인할 수 있습니다. 실제 출력의 앞부분입니다.

```json
{
    "htop-acme": {
        "type": "target",
        "name": "htop-acme",
        "virtual": false,
        "version": "3.4.1",
        "licenses": "GPL-2.0+",
        "license_files": [
            "COPYING"
        ],
        "redistributable": true,
        "dl_dir": "htop-acme",
        "downloads": [
            {
                "source": "htop-3.4.1.tar.xz",
                "uris": [
                    "https+https://github.com/htop-dev/htop/releases/download/3.4.1",
                    "https|urlencode+https://sources.buildroot.net/htop-acme",
                    "https|urlencode+https://sources.buildroot.net"
                ]
            }
        ],
        "hashes": [
            "/home/br/in/br2-acme/package/htop-acme/htop-acme.hash"
        ],
        "patches": [
            "/home/br/in/br2-acme/package/htop-acme/0001-htop-mark-acme-build.patch"
        ]
    }
}
```

다운로드 URI 목록 뒤의 두 줄이 `BR2_BACKUP_SITE`(기본 `https://sources.buildroot.net`)입니다. upstream에서 받지 못하면 Buildroot 미러를 차례로 시도합니다.

## 사례 2: cmake-package — libfoo 같은 라이브러리

CMake 기반 패키지를 추가하는 흐름입니다. 예시로 가상의 `acme-sensorlib`를 듭니다.

### Config.in

```make
config BR2_PACKAGE_ACME_SENSORLIB
    bool "acme-sensorlib"
    depends on BR2_INSTALL_LIBSTDCPP    # C++ 사용
    depends on BR2_TOOLCHAIN_GCC_AT_LEAST_4_9 # json-for-modern-cpp
    select BR2_PACKAGE_JSON_FOR_MODERN_CPP
    help
      ACME sensor abstraction library.
      Supports I2C and SPI sensors with a common API.

comment "acme-sensorlib needs a toolchain w/ C++"
    depends on !BR2_INSTALL_LIBSTDCPP
```

### acme-sensorlib.mk

```make
################################################################################
#
# acme-sensorlib
#
################################################################################

ACME_SENSORLIB_VERSION = 2.4.1
ACME_SENSORLIB_SITE = $(call github,acme-corp,sensorlib,v$(ACME_SENSORLIB_VERSION))
ACME_SENSORLIB_LICENSE = Apache-2.0
ACME_SENSORLIB_LICENSE_FILES = LICENSE
ACME_SENSORLIB_INSTALL_STAGING = YES

ACME_SENSORLIB_DEPENDENCIES = json-for-modern-cpp

ACME_SENSORLIB_CONF_OPTS = \
    -DBUILD_TESTING=OFF \
    -DBUILD_EXAMPLES=OFF \
    -DACME_SENSOR_I2C=ON \
    -DACME_SENSOR_SPI=ON

ifeq ($(BR2_PACKAGE_ACME_SENSORLIB_SHARED),y)
ACME_SENSORLIB_CONF_OPTS += -DBUILD_SHARED_LIBS=ON
else
ACME_SENSORLIB_CONF_OPTS += -DBUILD_SHARED_LIBS=OFF
endif

$(eval $(cmake-package))
```

핵심 차이입니다.

- `cmake-package`는 `-DCMAKE_TOOLCHAIN_FILE="$(HOST_DIR)/share/buildroot/toolchainfile.cmake"`를 자동으로 넘깁니다(`package/pkg-cmake.mk` 109행). `host-pkgconf`도 infra가 의존성에 붙이므로 `DEPENDENCIES`에 적지 않습니다.
- 사용자는 `_CONF_OPTS`에 *CMake 변수*만 적습니다 (`-D...`).
- `_INSTALL_STAGING = YES`로 두면 `STAGING_DIR`에도 install합니다. 라이브러리는 *다른 패키지가 빌드 시점에 헤더·.so를 참조*해야 하므로 거의 항상 staging이 필요합니다.

### Hash와 GitHub source

`github` 헬퍼는 `package/pkg-download.mk`에서 `https://github.com/$(1)/$(2)/archive/$(3)`로 정의된 *디렉터리 URL*만 만듭니다. 파일 이름은 infra가 `<pkg>-<version>.tar.gz`로 붙입니다. 본체 `cjson`을 펼친 실제 값이 그렇습니다(Ch 5).

```text
CJSON_SITE='https://github.com/DaveGamble/cjson/archive/v1.7.19'
CJSON_SOURCE='cjson-1.7.19.tar.gz'
```

hash 파일은 실제 tarball을 받은 뒤 `sha256sum`으로 계산해 넣습니다. 예시 이름의 저장소는 존재하지 않으므로 값은 적지 않습니다.

```text
# Locally calculated
sha256  <tarball의 sha256>  acme-sensorlib-2.4.1.tar.gz
sha256  <LICENSE의 sha256>  LICENSE
```

### Shared vs static option

`Config.in`에 옵션을 추가해 boolean으로 노출할 수 있습니다.

```make
config BR2_PACKAGE_ACME_SENSORLIB_SHARED
    bool "build as shared library"
    depends on BR2_PACKAGE_ACME_SENSORLIB
    default y
```

`.mk`의 `ifeq`가 이를 받습니다. 이 패턴은 `Config.in` 옵션이 *.mk의 CMake 인자로 변환되는* 표준 흐름입니다.

## 사례 3: python-package — pyserial 같은 패키지

Python 패키지는 별도 infrastructure를 씁니다. 빌드 backend는 자동 감지하지 않고, `<PKG>_SETUP_TYPE`으로 *직접 지정*해야 합니다. 비우면 `package/pkg-python.mk` 308행의 `"$(2)_SETUP_TYPE must be set"` 오류로 멈춥니다.

### Config.in

```make
config BR2_PACKAGE_PYTHON_ACME_TOOLS
    bool "python-acme-tools"
    depends on BR2_PACKAGE_PYTHON3
    select BR2_PACKAGE_PYTHON_SERIAL
    help
      ACME device management CLI for Python 3.
      https://pypi.org/project/acme-tools
```

`depends on BR2_PACKAGE_PYTHON3`은 외부 트리 패키지라서 적습니다. 본체의 Python 모듈은 `package/Config.in`에서 `if BR2_PACKAGE_PYTHON3` 블록 안의 "External python modules" 메뉴에 들어가 같은 조건을 얻습니다. `python3` 자체는 `pkg-python.mk` 349행이 target 패키지의 `DEPENDENCIES`에 `host-python3 python3`으로 붙입니다.

### python-acme-tools.mk

```make
################################################################################
#
# python-acme-tools
#
################################################################################

PYTHON_ACME_TOOLS_VERSION = 0.5.2
PYTHON_ACME_TOOLS_SOURCE = acme_tools-$(PYTHON_ACME_TOOLS_VERSION).tar.gz
PYTHON_ACME_TOOLS_SITE = https://files.pythonhosted.org/packages/source/a/acme_tools
PYTHON_ACME_TOOLS_LICENSE = MIT
PYTHON_ACME_TOOLS_LICENSE_FILES = LICENSE.txt
PYTHON_ACME_TOOLS_SETUP_TYPE = setuptools
PYTHON_ACME_TOOLS_DEPENDENCIES = python-serial

$(eval $(python-package))
```

핵심은 `PYTHON_ACME_TOOLS_SETUP_TYPE`입니다. 허용 값은 `pkg-python.mk` 314행이 강제하는 8개이고, 본체 `package/python-*/*.mk`의 `PYTHON_*_SETUP_TYPE` 줄(host 전용 패키지 포함)을 세면 다음과 같습니다.

| 값 | 본체 사용 수 | 비고 |
|----|---:|------|
| `setuptools` | 449 | 가장 흔함 |
| `hatch` | 50 | |
| `flit` | 48 | `host-python-flit-core`를 infra가 자동 의존 |
| `poetry` | 22 | |
| `pep517` | 16 | 범용 PEP 517 backend |
| `maturin` | 5 | Rust 확장 |
| `setuptools-rust` | 4 | Rust 확장 |
| `flit-bootstrap` | 4 | host 전용(`pkg-python.mk` 317~319행이 target에서 거부). flit-core 자체 같은 부트스트랩용 |

`distutils`는 허용 값이 아닙니다. 넣으면 `"Invalid $(2)_SETUP_TYPE. Valid options are 'maturin', 'setuptools', 'setuptools-rust', 'pep517', 'flit', 'hatch' or 'poetry'."` 오류가 납니다.

### PyPI에서 source 찾기

Buildroot 본체의 Python 패키지는 PyPI의 *hash 경로*를 그대로 `SITE`에 적습니다. pyserial을 감싼 `package/python-serial/python-serial.mk`의 실제 내용입니다.

```makefile
PYTHON_SERIAL_VERSION = 3.5
PYTHON_SERIAL_SOURCE = pyserial-$(PYTHON_SERIAL_VERSION).tar.gz
PYTHON_SERIAL_SITE = https://files.pythonhosted.org/packages/1e/7d/ae3f0a63f41e4d2f6cb66a5b57197850f919f59e558159a4dd3a818f5082
PYTHON_SERIAL_LICENSE = BSD-3-Clause
PYTHON_SERIAL_LICENSE_FILES = LICENSE.txt
PYTHON_SERIAL_SETUP_TYPE = setuptools

$(eval $(python-package))
$(eval $(host-python-package))
```

새 Python 패키지의 `.mk`·`Config.in`·`.hash` 초안은 본체의 `utils/scanpypi`가 PyPI 메타데이터에서 만들어 줍니다(매뉴얼 "Infrastructure for Python packages"의 `scanpypi` 절). 패키지 이름이 `python-<pypi 이름>`이 되는 것도 이 관례에서 옵니다.

### Host vs target Python

Python 패키지는 *host에만 설치*해야 할 때(빌드 도구)와 *target에만*, *둘 다* 세 가지 모드가 있습니다. 기본은 target입니다.

```make
# target only (default)
$(eval $(python-package))

# host only — 빌드 도구
$(eval $(host-python-package))

# host + target
$(eval $(python-package))
$(eval $(host-python-package))
```

`python-serial`처럼 target과 host 둘 다 정의하는 패키지는 빌드 도구가 host에서도 그 모듈을 import해야 하는 경우입니다.

## 의존성 선언 정확하게

세 infrastructure 모두 `<NAME>_DEPENDENCIES` 변수를 같은 방식으로 사용합니다.

```make
HTOP_ACME_DEPENDENCIES = ncurses libcap
```

여기서 *반드시* 알아야 할 것은 *세 종류의 의존성*입니다.

| 종류 | 변수 | 의미 |
|------|------|------|
| Build-time | `<NAME>_DEPENDENCIES` | 이 패키지를 빌드하기 전에 빌드돼 있어야 함 |
| Runtime (Kconfig) | `select BR2_PACKAGE_<DEP>` | rootfs에 포함되어야 함 |
| Toolchain | `depends on BR2_TOOLCHAIN_HAS_THREADS` 등 | 컴파일러·libc의 기능 요구 |

세 가지를 혼동하면 *menuconfig에서는 켜졌는데 빌드는 실패*하는 상태가 나옵니다. 권장 규칙:

- 라이브러리 의존(`-lncurses`)이면 `_DEPENDENCIES`에 *반드시* 적습니다.
- runtime에 *실행되는* 패키지(예: 스크립트가 `bash`를 호출)면 `Config.in`에서 `select`로 활성화합니다.
- C++·threads·wchar 등 toolchain 기능은 `Config.in`의 `depends on`으로 표현합니다.

## Patch 적용

upstream tarball에 *수정*이 필요하면 패키지 디렉터리에 `*.patch` 파일을 둡니다.

```text
br2-acme/package/htop-acme/
├── Config.in
├── htop-acme.mk
├── htop-acme.hash
├── 0001-fix-musl-build.patch
└── 0002-add-acme-column.patch
```

이름은 *번호 prefix + 짧은 설명*이 관례입니다. Buildroot가 *알파벳 순*으로 자동 적용합니다.

실제로 `htop.c`의 `main()`에 주석 한 줄을 넣는 패치를 만들어 적용했습니다. 패치 머리에 설명과 `Signed-off-by`를 두는 것은 매뉴얼 "Format and licensing of the package patches"의 요구입니다.

```text
From: ACME <dev@example.com>
Subject: [PATCH] htop: mark ACME build

Signed-off-by: ACME <dev@example.com>
---
--- a/htop.c
+++ b/htop.c
@@ -14,5 +14,6 @@
 const char* program = PACKAGE;
 
 int main(int argc, char** argv) {
+   /* ACME build */
    return CommandLine_run(argc, argv);
 }
```

`make htop-acme-dirclean` 뒤 `make htop-acme`의 출력입니다(41.10초, ncurses 빌드 포함).

```text
>>> host-ncurses 6.6-20251231 Downloading
...
>>> ncurses 6.6-20251231 Installing to staging directory
...
>>> htop-acme 3.4.1 Extracting
>>> htop-acme 3.4.1 Patching
Applying 0001-htop-mark-acme-build.patch using patch: 
patching file htop.c
>>> htop-acme 3.4.1 Updating config.sub and config.guess
>>> htop-acme 3.4.1 Patching libtool
>>> htop-acme 3.4.1 Configuring
>>> htop-acme 3.4.1 Building
>>> htop-acme 3.4.1 Installing to target
```

결과 바이너리는 cross-compile된 aarch64 실행 파일입니다.

```text
$ file output/target/usr/bin/htop
output/target/usr/bin/htop: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, for GNU/Linux 6.18.0, not stripped
```

`series` 파일(quilt 형식)도 지원합니다. 매뉴얼 "How patches are applied"에 따르면 `series`가 있으면 그 순서를, 없으면 `*.patch`를 알파벳 순으로 적용합니다. legal-info도 적용 순서를 `series` 파일로 기록합니다(아래 License 절).

## 디버깅 흐름 — *-rebuild의 활용

새 패키지를 작성하는 동안 *반복 수정*이 잦습니다. 다음 타겟이 핵심입니다.

| 타겟 | 효과 |
|------|------|
| `<name>-source` | tarball만 다운로드 + hash 검증 |
| `<name>-extract` | + 압축 해제 |
| `<name>-patch` | + patch 적용 |
| `<name>-configure` | + configure/cmake 실행 |
| `<name>-build` | + 실제 컴파일 |
| `<name>-install` | + target/staging install |
| `<name>` | 위 전체 |
| `<name>-rebuild` | build와 install 단계를 다시 실행 (source를 다시 extract하지 않음) |
| `<name>-reconfigure` | configure 이후를 다시 |
| `<name>-dirclean` | build 디렉터리 완전 삭제 |
| `<name>-show-info` | 메타데이터 JSON 출력 |
| `<name>-show-depends` | 직접 의존성만 출력 |

전형적 디버깅 흐름은 다음과 같습니다.

configure 단계에서 실패하면 autotools가 남긴 `config.log`를 봅니다.

```bash
ls output/build/htop-acme-3.4.1/config.log
less output/build/htop-acme-3.4.1/config.log
```

`.mk`를 다시 수정한 뒤 configure만 다시 돌립니다.

```bash
make htop-acme-reconfigure
```

`-rebuild`는 기존 추출·패치·설정 결과를 사용해 build와 install을 다시 합니다. 패치를 바꿨다면 `-rebuild`로는 반영되지 않습니다. 패치는 extract 직후 한 번만 적용되기 때문이며, 위 실험도 패치를 추가한 뒤 `-dirclean`부터 다시 했습니다. `.mk`의 `CONF_OPTS`를 바꿨다면 `-reconfigure`입니다.

## License 표기

`<NAME>_LICENSE`와 `<NAME>_LICENSE_FILES`는 *형식이 정해져* 있습니다. SPDX identifier를 씁니다.

```make
ACME_SENSORLIB_LICENSE = Apache-2.0
ACME_SENSORLIB_LICENSE_FILES = LICENSE
```

복합 라이선스의 표기 규칙은 매뉴얼 "generic-package reference"의 `LIBFOO_LICENSE` 항목에 있습니다. 여러 라이선스는 쉼표로, 구성 요소가 구분되면 괄호로, dual license는 `or`로 적습니다.

```makefile
HTOP_ACME_LICENSE = GPL-2.0+
LIBFOO_LICENSE = GPL-2.0+ (programs), LGPL-2.1+ (libraries)
LIBBAR_LICENSE = AFL-2.1 or GPL-2.0+
```

이 정보는 `make legal-info`가 *프로젝트 전체의 라이선스 보고서*를 만들 때 사용됩니다. 임베디드 제품의 *오픈소스 컴플라이언스*에 필수입니다.

htop-acme를 넣은 QEMU 빌드에서 실제로 돌린 결과입니다.

```text
$ make legal-info
...
>>> htop-acme 3.4.1 Collecting legal info
WARNING: the Buildroot source code has not been saved
$ ls output/legal-info/
README
buildroot.config
host-licenses
host-manifest.csv
host-sources
legal-info.sha256
licenses
manifest.csv
sources
$ ls output/legal-info/sources/htop-acme-3.4.1/
0001-htop-mark-acme-build.patch
htop-3.4.1.tar.xz
series
```

`manifest.csv`의 헤더와 htop-acme 줄입니다.

```text
"PACKAGE","VERSION","LICENSE","LICENSE FILES","SOURCE ARCHIVE","SOURCE SITE","DEPENDENCIES WITH LICENSES"
"htop-acme","3.4.1","GPL-2.0+","COPYING","htop-3.4.1.tar.xz","https://github.com/htop-dev/htop/releases/download/3.4.1","gcc-final [GPL-3.0-with-GCC-exception] glibc [GPL-2.0+ (programs), LGPL-2.1+, BSD-3-Clause, MIT (library)] linux-headers [GPL-2.0] ncurses [MIT with advertising clause] skeleton-init-common [unknown] skeleton-init-sysv [unknown]"
```

`sources/`에는 원본 tarball과 *적용한 패치*, 적용 순서를 적은 `series`가 함께 들어갑니다. 마지막 열은 이 패키지가 링크하는 의존성의 라이선스까지 보여 줍니다. 다만 그대로 컴플라이언스 문서가 되지는 않습니다. 같은 디렉터리의 `README`가 Buildroot 소스 자체와 autotools 패키지에 적용된 libtool 패치는 "due to technical limitations" 저장하지 않았고 toolchain은 "may have not been saved"라고 밝히고, 위 경고도 그 뜻입니다. `skeleton-init-*`처럼 `[unknown]`으로 찍히는 항목도 사람이 검토해야 합니다(Ch 18).

## Troubleshooting

### "Wrong hash" 에러

hash 파일의 첫 글자를 일부러 바꾸고 받은 파일을 지운 뒤 `make htop-acme-source`를 돌렸습니다.

```text
ERROR: while checking hashes from /home/br/in/br2-acme/package/htop-acme/htop-acme.hash
ERROR: htop-3.4.1.tar.xz has wrong sha256 hash:
ERROR: expected: 004f7d4580fc11cffc7e0f06895a4789e0c1c054435752c151e812fead9f6220
ERROR: got     : 904f7d4580fc11cffc7e0f06895a4789e0c1c054435752c151e812fead9f6220
ERROR: Incomplete download, or man-in-the-middle (MITM) attack
...
2026-11-16 07:20:53 ERROR 404: Not Found.
...
make[1]: *** [package/pkg-generic.mk:179: /home/br/buildroot/output/build/htop-acme-3.4.1/.stamp_downloaded] Error 1
```

upstream 파일이 hash와 맞지 않자 Buildroot는 백업 미러(`sources.buildroot.net/htop-acme/…`, `sources.buildroot.net/…`)를 차례로 시도했고, 외부 트리 패키지라 미러에 없어 404로 끝났습니다. 매뉴얼 표현대로 hash가 맞지 않으면 "deletes the downloaded file, and aborts"입니다.

원인은 tarball이 바뀌었거나 hash 파일이 틀린 경우입니다. upstream이 공개한 hash와 대조해 어느 쪽인지 먼저 확인합니다. 무작정 `sha256sum` 결과로 hash 파일을 덮으면 MITM 경고를 스스로 꺼 버리는 셈입니다.

### "No package 'ncurses' found" pkg-config 에러

`_DEPENDENCIES`에 `ncurses`를 안 적은 경우입니다. 위 빌드 로그처럼 `ncurses`는 `Installing to staging directory` 단계가 있는 라이브러리 패키지라, 의존성에 적으면 htop보다 먼저 staging에 설치됩니다.

### Python 패키지가 import는 되는데 실행이 안 된다

런타임에 import하는 모듈은 `Config.in`의 `select`로 rootfs에 들어가게 합니다. 빌드 중에 그 모듈이 필요하면(예: `setup.py`가 import) `_DEPENDENCIES`에도 적습니다. `select`는 *켜는 것*만 보장하고 *빌드 순서*는 `_DEPENDENCIES`가 정합니다.

### CMake가 host의 라이브러리를 잡는다

Buildroot의 `support/misc/toolchainfile.cmake.in`은 이미 `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER`, `…_PACKAGE ONLY`, `…_LIBRARY ONLY`, `…_INCLUDE ONLY`를 설정합니다. 그래서 `_CONF_OPTS`에 같은 값을 다시 넣어도 바뀌는 것이 없습니다. 그래도 호스트 경로가 잡힌다면 `CMakeLists.txt`가 `/usr/include` 같은 절대 경로를 직접 쓰는지, `pkg-config` 결과를 쓰는지 확인하고, 필요하면 패치로 고칩니다.

### autoreconf가 필요하다고 한다

upstream patch가 `configure.ac`를 건드리면 `autoreconf`가 필요합니다.

```make
HTOP_ACME_AUTORECONF = YES
```

매뉴얼 "Infrastructure for autotools-based packages"는 `LIBFOO_AUTORECONF`를 "whether the package should be autoreconfigured or not (i.e. if the configure script and Makefile.in files should be re-generated by re-running autoconf, automake, libtool, etc.)"로 정의하고 기본값은 `NO`입니다. 켜면 `host-autoconf`·`host-automake`·`host-libtool` 의존성도 infra가 붙입니다.

## 정리

- `autotools-package`, `cmake-package`, `python-package`는 cross-compile 환경을 자동으로 주입합니다. 실제 htop-acme 빌드 결과는 aarch64 PIE 실행 파일이었습니다.
- `.hash` 파일이 *없으면* 경고만 내고 계속하고, *틀리면* 받은 파일을 지우고 백업 미러까지 시도한 뒤 멈춥니다.
- `_DEPENDENCIES`(build-time), `select`(runtime presence), `depends on`(toolchain capability) — 세 의존성을 구분해 표현합니다.
- 라이브러리 패키지는 `_INSTALL_STAGING = YES`로 staging에도 install합니다.
- License는 SPDX identifier. `make legal-info`는 manifest·license 파일·소스·적용 패치·`series`를 모으지만, Buildroot 소스·toolchain 등은 저장하지 못한다고 README에 적습니다.
- Patch는 `*.patch` 파일을 패키지 디렉터리에 두면 extract 직후 적용되며, 패치를 바꾸면 `-dirclean`부터 다시 합니다.
- 디버깅은 `-rebuild`, `-reconfigure`, `-dirclean`을 적절히 골라 씁니다.
- Python 패키지는 `_SETUP_TYPE`을 직접 적어야 하며, 본체에서는 `setuptools`가 449개로 가장 많습니다. `distutils`는 허용 값이 아닙니다.

## 다음 장 예고

다음 편은 **Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지**.


## 관련 항목

- [Ch 5: 패키지 시스템 — .mk와 Config.in](/blog/embedded/buildroot/chapter05-package-system)
- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [원문 — Buildroot Manual: Adding new packages](https://buildroot.org/downloads/manual/manual.html#adding-packages)
- [SPDX License List](https://spdx.org/licenses/)
