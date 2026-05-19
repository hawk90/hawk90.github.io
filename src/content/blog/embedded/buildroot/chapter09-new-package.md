---
title: "Ch 9: 새 패키지 작성 — autotools, cmake, python"
date: 2026-05-19T09:00:00
description: "Buildroot에 새 패키지를 추가하는 실전 — autotools·cmake·python 세 케이스."
series: "Buildroot Practical"
seriesOrder: 9
tags: [embedded, buildroot, package, autotools, cmake, python]
draft: false
---

## 한 줄 요약

> **"빌드 시스템이 정해져 있으면 Buildroot 패키지는 한 페이지면 끝난다."** — autotools, cmake, python은 *전용 infrastructure*가 모든 세부를 처리해 줍니다.

[Ch 5](/blog/embedded/buildroot/chapter05-package-system)에서 `generic-package`로 *무엇이든* 빌드할 수 있는 골격을 봤습니다. 그러나 현실의 오픈소스 패키지는 99%가 *autotools, cmake, python setuptools/pip* 셋 중 하나입니다. 이걸 매번 `CONFIGURE_CMDS`·`BUILD_CMDS`·`INSTALL_TARGET_CMDS`로 적는 건 시간 낭비입니다.

이 장은 그래서 *세 가지 infrastructure*를 차례로 실제 예시와 함께 다룹니다. 각각의 *최소 .mk*가 어떻게 생겼는지, license와 hash는 어떻게 표기하는지, 의존성 선언은 어떻게 하는지, 그리고 디버깅 흐름은 어떻게 다른지.

## 세 infrastructure 비교

| Infrastructure | 대상 | `$(eval ...)` |
|----------------|-----|--------------|
| `autotools-package` | `./configure && make && make install`을 따르는 패키지 | `$(eval $(autotools-package))` |
| `cmake-package` | CMakeLists.txt 기반 패키지 | `$(eval $(cmake-package))` |
| `python-package` | setuptools/poetry/flit 기반 Python 패키지 | `$(eval $(python-package))` |

세 infrastructure 모두 *cross-compile 환경 변수* (`CC`, `CXX`, `CFLAGS`, sysroot)를 자동으로 주입합니다. 우리가 직접 적는 건 *URL*, *버전*, *의존성*, *라이선스*만으로 충분합니다.

## 사례 1: autotools-package — htop 추가하기

`htop`은 ncurses에 의존하는 대화형 프로세스 viewer입니다. autotools 기반이라 *교과서적인 사례*입니다. (실제 htop은 Buildroot 본체에 이미 있지만, 외부 트리에 *내 fork*를 두는 흐름을 가정합니다.)

### 디렉터리

```text
br2-acme/package/htop-acme/
├── Config.in
├── htop-acme.mk
└── htop-acme.hash
```

### Config.in

```make
config BR2_PACKAGE_HTOP_ACME
    bool "htop-acme"
    depends on BR2_USE_WCHAR        # ncurses-wchar 필요
    depends on BR2_TOOLCHAIN_HAS_THREADS
    select BR2_PACKAGE_NCURSES
    select BR2_PACKAGE_NCURSES_WCHAR
    help
      ACME-customized htop, interactive process viewer.
      https://github.com/acme-corp/htop

comment "htop-acme needs a toolchain w/ wchar, threads"
    depends on !BR2_USE_WCHAR || !BR2_TOOLCHAIN_HAS_THREADS
```

`depends on`은 *조건*입니다. 충족되지 않으면 메뉴에 표시되지 않거나 `comment`로 안내됩니다. `select`는 *암묵적 활성화*입니다. htop을 켜면 ncurses도 자동으로 켜집니다.

### htop-acme.mk

```make
################################################################################
#
# htop-acme
#
################################################################################

HTOP_ACME_VERSION = 3.3.0
HTOP_ACME_SOURCE = htop-$(HTOP_ACME_VERSION).tar.xz
HTOP_ACME_SITE = https://github.com/htop-dev/htop/releases/download/$(HTOP_ACME_VERSION)
HTOP_ACME_LICENSE = GPL-2.0+
HTOP_ACME_LICENSE_FILES = COPYING

HTOP_ACME_DEPENDENCIES = ncurses

HTOP_ACME_CONF_OPTS = \
    --disable-unicode=no \
    --enable-affinity \
    --disable-hwloc

ifeq ($(BR2_PACKAGE_LIBCAP),y)
HTOP_ACME_CONF_OPTS += --enable-capabilities
HTOP_ACME_DEPENDENCIES += libcap
else
HTOP_ACME_CONF_OPTS += --disable-capabilities
endif

$(eval $(autotools-package))
```

`autotools-package` 매크로는 다음을 자동으로 처리합니다.

- `./configure --host=$(GNU_TARGET_NAME) --prefix=/usr ...`
- `CC=$(TARGET_CC) CFLAGS="$(TARGET_CFLAGS)"`
- `make -C $(@D)`
- `make -C $(@D) DESTDIR=$(TARGET_DIR) install`

추가 옵션은 `_CONF_OPTS`에 적습니다. 의존성에 따라 옵션을 조건부로 바꾸려면 `ifeq`를 씁니다.

### htop-acme.hash

```text
# Locally computed
sha256  ad12345fc...  htop-3.3.0.tar.xz
sha256  cf2b...       COPYING
```

`COPYING` 파일까지 해시를 적는 이유는 *라이선스 파일이 바뀌면 알아야 하기 때문*입니다. 라이선스 변경은 *재배포 영향*이 있어 무시할 수 없습니다.

해시는 `sha256sum` 결과를 그대로 적습니다.

```text
$ sha256sum htop-3.3.0.tar.xz COPYING
ad12345fc...  htop-3.3.0.tar.xz
cf2b...       COPYING
```

### Config.in 등록

외부 트리 최상위 `Config.in`에 추가합니다.

```make
source "$BR2_EXTERNAL_ACME_PATH/package/htop-acme/Config.in"
```

`make menuconfig`에서 활성화한 뒤:

```text
$ make htop-acme-source     # tarball 다운로드 + hash 검증
$ make htop-acme            # configure + build + install
$ make htop-acme-show-info  # 메타데이터 출력
```

빌드가 성공하면 `output/target/usr/bin/htop`이 생깁니다.

## 사례 2: cmake-package — libfoo 같은 라이브러리

CMake 기반 패키지를 추가하는 흐름입니다. 예시로 가상의 `acme-sensorlib`를 듭니다.

### Config.in

```make
config BR2_PACKAGE_ACME_SENSORLIB
    bool "acme-sensorlib"
    depends on BR2_INSTALL_LIBSTDCPP    # C++ 사용
    select BR2_PACKAGE_NLOHMANN_JSON
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

ACME_SENSORLIB_DEPENDENCIES = nlohmann-json

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

- `cmake-package`는 `cmake -DCMAKE_TOOLCHAIN_FILE=...`을 자동으로 호출합니다. cross-compile toolchain 파일을 Buildroot가 생성해 줍니다.
- 사용자는 `_CONF_OPTS`에 *CMake 변수*만 적습니다 (`-D...`).
- `_INSTALL_STAGING = YES`로 두면 `STAGING_DIR`에도 install합니다. 라이브러리는 *다른 패키지가 빌드 시점에 헤더·.so를 참조*해야 하므로 거의 항상 staging이 필요합니다.

### Hash와 GitHub source

`github` 헬퍼는 `https://github.com/<user>/<repo>/archive/<ref>.tar.gz`를 자동으로 만들어 줍니다.

```text
ACME_SENSORLIB_SITE = $(call github,acme-corp,sensorlib,v$(ACME_SENSORLIB_VERSION))
```

위와 같이 쓰면 Buildroot가 *tarball 파일명*을 안정적으로 `acme-sensorlib-2.4.1.tar.gz`로 만듭니다. GitHub의 raw archive 파일명은 git ref가 들어가 *해시 일치*가 깨질 수 있어 헬퍼를 거치는 것이 안전합니다.

hash 파일:

```text
# Locally computed (post download)
sha256  e3b0...  acme-sensorlib-2.4.1.tar.gz
sha256  c712...  LICENSE
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

Python 패키지는 별도 infrastructure를 씁니다. *setup.py*, *pyproject.toml*, *poetry* 모두 자동 감지합니다.

### Config.in

```make
config BR2_PACKAGE_PYTHON_ACME_TOOLS
    bool "python-acme-tools"
    depends on BR2_PACKAGE_PYTHON3
    select BR2_PACKAGE_PYTHON_PYSERIAL
    help
      ACME device management CLI for Python 3.
      https://pypi.org/project/acme-tools
```

`depends on BR2_PACKAGE_PYTHON3`은 *반드시* 적습니다. Python 인터프리터가 없으면 의미가 없습니다.

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
PYTHON_ACME_TOOLS_DEPENDENCIES = python-pyserial

$(eval $(python-package))
```

핵심은 `PYTHON_ACME_TOOLS_SETUP_TYPE`입니다. 가능한 값:

| 값 | 의미 |
|----|------|
| `distutils` | 옛 `setup.py` |
| `setuptools` | 가장 흔함 |
| `pep517` | `pyproject.toml` 기반 (poetry, flit, hatch 등) |
| `flit` | flit 특화 |

### PyPI에서 source 찾기

PyPI 패키지의 *source tarball*은 다음 패턴입니다.

```text
https://files.pythonhosted.org/packages/source/<첫글자>/<패키지명>/<파일명>
```

예: `acme_tools-0.5.2.tar.gz` → `https://files.pythonhosted.org/packages/source/a/acme_tools/acme_tools-0.5.2.tar.gz`.

Buildroot 본체에 이미 있는 Python 패키지(`package/python-pyserial/`)를 참고하면 패턴이 명확합니다.

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

`setuptools`도 host 빌드가 필요하니, `host-python-acme-tools`를 동시에 정의하는 사례가 종종 있습니다.

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

```text
$ make htop-acme-rebuild
>>> htop-acme 3.3.0 Patching
applying patch file 0001-fix-musl-build.patch
patching file Makefile.in
applying patch file 0002-add-acme-column.patch
patching file CRT.c
```

`series` 파일(quilt 형식)도 지원합니다. 패치 순서를 명시적으로 통제하려면 `series` 파일을 두고 거기 한 줄씩 적습니다.

## 디버깅 흐름 — *-rebuild의 활용

새 패키지를 작성하는 동안 *반복 수정*이 잦습니다. 다음 타겟이 핵심입니다.

| 타겟 | 효과 |
|------|------|
| `<name>-source` | tarball만 다운로드 + hash 검증 |
| `<name>-extract` | + 압축 해제 + patch 적용 |
| `<name>-configure` | + configure/cmake 실행 |
| `<name>-build` | + 실제 컴파일 |
| `<name>-install` | + target/staging install |
| `<name>` | 위 전체 |
| `<name>-rebuild` | extract 이후를 *처음부터* 다시 |
| `<name>-reconfigure` | configure 이후를 다시 |
| `<name>-dirclean` | build 디렉터리 완전 삭제 |
| `<name>-show-info` | 메타데이터 JSON 출력 |
| `<name>-show-depends` | 직접 의존성만 출력 |

전형적 디버깅 흐름입니다.

```text
$ make htop-acme              # 첫 시도, 실패
... error: undefined reference to `cap_get_proc'

# .mk 수정: HTOP_ACME_DEPENDENCIES += libcap 추가
$ make htop-acme-rebuild      # 의존성 해결 후 다시
... still fails

# configure 옵션 확인
$ ls output/build/htop-acme-3.3.0/config.log
$ less output/build/htop-acme-3.3.0/config.log

# .mk 다시 수정
$ make htop-acme-reconfigure  # configure만 다시
```

`-rebuild`는 *extract부터* 다시 합니다. patch가 늘었거나 시리즈 변경이 있을 때 씁니다. `-reconfigure`는 *configure부터* 다시. 옵션만 바꿀 때 충분합니다.

## License 표기

`<NAME>_LICENSE`와 `<NAME>_LICENSE_FILES`는 *형식이 정해져* 있습니다. SPDX identifier를 씁니다.

```make
ACME_SENSORLIB_LICENSE = Apache-2.0
ACME_SENSORLIB_LICENSE_FILES = LICENSE
```

복합 라이선스도 SPDX 표현으로 적습니다.

```make
HTOP_ACME_LICENSE = GPL-2.0+
SOMETHING_LICENSE = MIT or GPL-2.0+
ANOTHER_LICENSE = (GPL-2.0+ and LGPL-2.1+)
```

이 정보는 `make legal-info`가 *프로젝트 전체의 라이선스 보고서*를 만들 때 사용됩니다. 임베디드 제품의 *오픈소스 컴플라이언스*에 필수입니다.

```text
$ make legal-info
$ ls output/legal-info/
host-manifest.csv  manifest.csv  README  sources/
```

`manifest.csv`에 모든 패키지의 *버전·라이선스·source URL·tarball 파일명*이 정리됩니다. 그대로 컴플라이언스 문서로 쓸 수 있습니다.

## Troubleshooting

### "Wrong hash" 에러

해시가 안 맞으면 빌드가 멈춥니다.

```text
>>> htop-acme 3.3.0 Downloading
...
ERROR: htop-3.3.0.tar.xz has wrong sha256 hash
expected: ad12345...
got:      ef67890...
```

원인은 *tarball이 변경됐거나* (GitHub auto-generated archive는 git 변경에 따라 해시가 바뀝니다), *내가 hash 파일을 잘못 적었거나*. 후자라면 `dl/`에 받힌 파일에서 해시를 다시 계산합니다.

```text
$ sha256sum dl/htop-acme/htop-3.3.0.tar.xz
```

### "No package 'ncurses' found" pkg-config 에러

`_DEPENDENCIES`에 `ncurses`를 안 적은 경우입니다. 또는 ncurses가 *host에만* 빌드되고 *staging*에 install 안 된 경우. ncurses는 staging에 install되므로 의존성만 추가하면 보통 해결됩니다.

### Python 패키지가 import는 되는데 실행이 안 된다

`_DEPENDENCIES`에 *런타임 의존성*이 빠진 경우입니다. `pyserial`을 import하지만 `select`만 하고 `_DEPENDENCIES`에 적지 않으면 *menuconfig에선 켜져도 install order가 꼬일 수 있습니다*. 둘 다 적는 게 안전합니다.

### CMake가 host의 라이브러리를 잡는다

cross-compile toolchain 파일이 잘 적용되지 않은 경우입니다. `cmake-package`가 자동으로 처리하지만, CMakeLists.txt가 `find_package`로 *불완전하게* 검색하면 host 헤더를 잡을 수 있습니다. `-DCMAKE_FIND_ROOT_PATH_MODE_PACKAGE=ONLY`를 `_CONF_OPTS`에 추가하면 강제됩니다.

### autoreconf가 필요하다고 한다

upstream patch가 `configure.ac`를 건드리면 `autoreconf`가 필요합니다.

```make
HTOP_ACME_AUTORECONF = YES
```

`_AUTORECONF = YES`를 추가하면 Buildroot가 빌드 전에 `autoreconf -fi`를 자동으로 호출합니다.

## 정리

- `autotools-package`, `cmake-package`, `python-package`는 *cross-compile 환경 변수*를 자동 주입합니다.
- 사용자는 *URL, 버전, 의존성, 라이선스, hash*만 적으면 됩니다.
- `_DEPENDENCIES`(build-time), `select`(runtime presence), `depends on`(toolchain capability) — 세 의존성을 구분해 표현합니다.
- 라이브러리 패키지는 `_INSTALL_STAGING = YES`로 staging에도 install합니다.
- License는 SPDX identifier. `make legal-info`가 컴플라이언스 보고서를 생성합니다.
- Patch는 `*.patch` 파일을 패키지 디렉터리에 두면 자동 적용됩니다.
- 디버깅은 `-rebuild`, `-reconfigure`, `-dirclean`을 적절히 골라 씁니다.
- Python 패키지는 `_SETUP_TYPE`을 정확히 적어야 합니다(`setuptools`, `pep517` 등).

다음 편은 **Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지**.

## 관련 항목

- [Ch 5: 패키지 시스템 — .mk와 Config.in](/blog/embedded/buildroot/chapter05-package-system)
- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [원문 — Buildroot Manual: Adding new packages](https://buildroot.org/downloads/manual/manual.html#adding-packages)
- [SPDX License List](https://spdx.org/licenses/)
