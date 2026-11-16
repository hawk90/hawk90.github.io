---
title: "Buildroot 패키지 시스템 분석 — .mk와 Config.in 동작 추적"
slug: "embedded/buildroot/chapter05-package-system"
date: 2026-05-19T09:05:00
description: "Buildroot 패키지 작성 규약 — Config.in 옵션 노출과 .mk 빌드 레시피."
series: "Buildroot Practical"
seriesOrder: 5
tags: [embedded, buildroot, package, mk, config-in]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"한 패키지는 `Config.in` + `<name>.mk` 두 파일이 전부입니다."** — Kconfig가 옵션을 노출하고, `.mk`가 빌드 명령을 정의합니다. 두 파일의 짝만 이해하면 2,941개 패키지 디렉터리가 모두 같은 패턴으로 풀립니다.

## 왜 패키지 시스템부터 깊이 보는가

Buildroot로 *실무*에 들어가는 순간 가장 자주 만지는 곳이 패키지입니다. 새 라이브러리를 추가하거나, 회사 내 application을 rootfs에 넣거나, 기존 패키지의 빌드 옵션을 바꾸는 일이 매주 발생합니다. 다행히 Buildroot는 *모든 패키지가 같은 패턴*을 따르도록 강제합니다. 패턴 한 번 익히면 다음부터는 *베끼고 수정*이면 충분합니다.

이 장은 두 부분으로 나뉩니다. 전반은 `Config.in` + `.mk` 한 쌍의 구조, 후반은 `generic-package` / `autotools-package` / `cmake-package` 같은 infra의 차이입니다. 예시는 설명용 `myapp` 골격과 함께, **Buildroot 2026.02.3** 트리에 실제로 있는 `libyaml`(autotools)·`cjson`(cmake) 패키지를 씁니다. 변수 값은 `make printvars`로 확인했습니다. 이 타깃은 설정만 읽어 변수를 펼치므로 빌드 없이 macOS의 GNU make 4.4.1에서도 돌아갑니다.

## 파일 두 개의 짝

`package/<name>/` 안에 다음 두 파일이 한 쌍으로 들어갑니다.

```text
package/myapp/
├── Config.in        ─ Kconfig 옵션 (menuconfig에 노출)
└── myapp.mk         ─ 빌드 레시피 (make가 실행)
```

추가로 자주 있는 파일은 다음과 같습니다.

| 파일 | 역할 |
|------|------|
| `myapp.hash` | tarball SHA-256, license 파일 hash |
| `0001-*.patch` | source에 적용할 패치 |
| `S99myapp` | `/etc/init.d`에 설치할 init script |
| `myapp.service` | systemd unit |

이 디렉터리가 메인 트리(`package/`) 어디서 *처음 등장*하려면, 같은 디렉터리 안의 부모 `Config.in`에 한 줄을 추가해야 합니다.

```make
# package/Config.in (해당 카테고리)
source "package/myapp/Config.in"
```

이 한 줄로 menuconfig 트리에 노출됩니다.

## Config.in — Kconfig 옵션 노출

`Config.in`은 *옵션 정의*입니다. 패키지를 켤지 끌지, 어떤 변형을 쓸지 같은 *선택지*를 사용자에게 보여 줍니다. 가장 단순한 예는 다음과 같습니다.

```make
config BR2_PACKAGE_MYAPP
	bool "myapp"
	depends on BR2_USE_MMU
	depends on BR2_TOOLCHAIN_HAS_THREADS
	select BR2_PACKAGE_OPENSSL
	help
	  My application that does a thing.

	  https://example.com/myapp
```

각 줄의 의미는 다음과 같습니다.

| 구문 | 의미 |
|---|---|
| `config BR2_PACKAGE_MYAPP` | 옵션 심볼. **반드시** `BR2_PACKAGE_<UPPERNAME>` 형태. |
| `bool "myapp"` | bool 타입, menuconfig 표시 이름. |
| `depends on ...` | *충족돼야* 옵션이 *보입니다*. |
| `select ...` | *함께 켜집니다* (의존성 강제). |
| `help ...` | `?` 키로 보이는 설명. |

자주 쓰는 `depends on`은 다음과 같습니다.

| 표현 | 의미 |
|---|---|
| `BR2_USE_MMU` | MMU가 있는 target만 |
| `BR2_TOOLCHAIN_HAS_THREADS` | pthread 가능 |
| `BR2_INSTALL_LIBSTDCPP` | C++ runtime이 있는 toolchain |
| `BR2_TOOLCHAIN_HEADERS_AT_LEAST_5_0` | 커널 헤더 ≥ 5.0 |
| `!BR2_STATIC_LIBS` | 정적 링크 금지 |

`select`는 *조용히 함께 켜는* 방식이라 의존성이 강제됩니다. 반면 `depends on`은 *사용자가 직접* 의존성을 켜야 합니다. 두 패턴 모두 표준이며, 패키지가 *없으면 빌드가 깨지는* 경우에는 `select`를 씁니다.

조건부 sub-옵션도 흔합니다.

```make
config BR2_PACKAGE_MYAPP
	bool "myapp"

if BR2_PACKAGE_MYAPP

config BR2_PACKAGE_MYAPP_WITH_FOO
	bool "with foo support"
	default y

config BR2_PACKAGE_MYAPP_BACKEND
	string "backend name"
	default "default"

endif
```

`if … endif` 블록은 *부모 옵션이 켜진 경우에만* 자식 옵션을 보여 줍니다. menuconfig 트리에서 *자연스러운 들여쓰기*가 일어납니다.

## .mk — 빌드 레시피

`<name>.mk`가 *실제로 빌드를 수행*합니다. 형식은 다음의 골격을 따릅니다.

```make
################################################################################
#
# myapp
#
################################################################################

MYAPP_VERSION = 1.2.3
MYAPP_SOURCE = myapp-$(MYAPP_VERSION).tar.gz
MYAPP_SITE = https://example.com/releases
MYAPP_LICENSE = MIT
MYAPP_LICENSE_FILES = LICENSE
MYAPP_DEPENDENCIES = openssl

# (infra 선택 — 아래 절에서 설명)
$(eval $(generic-package))
```

규약은 *대문자 이름 prefix*입니다. 패키지 이름이 `myapp`이면 모든 변수가 `MYAPP_*`입니다. 이 규약은 `utils/check-package`가 검사합니다. `utils/checkpackagelib/lib_mk.py`의 `TypoInPackageVariable`은 파일 이름에서 패키지 prefix를 뽑은 뒤, `[A-Z0-9_]+_[A-Z0-9_]+` 모양의 변수 중 그 prefix로 시작하지 않는 것을 오타 후보로 보고합니다(`LINUX_TOOLS`, `TARGET_FINALIZE_HOOKS` 같은 허용 목록은 예외). 매뉴얼 "Tips and tricks"의 check-package 절은 새 패키지 파일에 `./utils/check-package package/new-package/*`를 돌리라고 안내합니다.

핵심 변수들은 다음 표가 거의 전부입니다.

| 변수 | 의미 | 예 |
|---|---|---|
| `<NAME>_VERSION` | 버전 문자열 | `1.2.3` |
| `<NAME>_SITE` | source URL prefix | `https://...` |
| `<NAME>_SOURCE` | tarball 파일명 (보통 자동 유추) | `myapp-1.2.3.tar.gz` |
| `<NAME>_SITE_METHOD` | `wget`·`scp`·`sftp`·`svn`·`cvs`·`git`·`hg`·`bzr`·`file`·`local`·`smb` | `git` |
| `<NAME>_LICENSE` | SPDX-style 라이선스 | `GPL-2.0+` |
| `<NAME>_LICENSE_FILES` | source 내 라이선스 파일 | `COPYING LICENSE` |
| `<NAME>_DEPENDENCIES` | 빌드 의존 패키지 | `openssl libcurl` |
| `<NAME>_INSTALL_STAGING` | staging에 설치할지 | `YES` (라이브러리만) |
| `<NAME>_INSTALL_TARGET` | rootfs에 설치할지 | `YES` (기본값) |

`SITE_METHOD` 값 목록은 매뉴얼 "generic-package reference"의 `LIBFOO_SITE_METHOD` 항목 그대로입니다. 비워 두면 `SITE`의 URL 모양에서 추정합니다.

## 세 가지 infra — generic / autotools / cmake

마지막 줄의 `$(eval $(generic-package))`가 *infra*를 선택합니다. 패키지의 빌드 시스템이 무엇인지에 따라 골라 씁니다.

| infra | 적용 빌드 시스템 | 호출 |
|---|---|---|
| **generic-package** | 표준 빌드 시스템이 *없는* 경우 (custom Makefile, 직접 스크립트 등) | `$(eval $(generic-package))` |
| **autotools-package** | `./configure && make` (GNU autotools) | `$(eval $(autotools-package))` |
| **cmake-package** | `cmake -B build && cmake --build build` | `$(eval $(cmake-package))` |
| **meson-package** | `meson setup build && ninja -C build` | `$(eval $(meson-package))` |
| **python-package** | Python 패키징 backend (예: setuptools, flit) | `$(eval $(python-package))` |
| **kconfig-package** | 자체 Kconfig 가진 패키지 (busybox, linux) | `$(eval $(kconfig-package))` |

2026.02.3 트리에서 `package/`·`boot/`·`linux/`·`toolchain/`·`fs/`의 `.mk`가 실제로 호출하는 infra를 세면 다음과 같습니다(`grep -rhoE '^\$\(eval \$\((host-)?[a-z0-9-]+-package\)\)'`).

| infra | 호출 수 |
|---|---:|
| `autotools-package` | 1,085 |
| `python-package` | 570 |
| `generic-package` | 553 |
| `cmake-package` | 382 |
| `meson-package` | 207 |
| `host-autotools-package` | 197 |
| `host-generic-package` | 122 |
| `host-python-package` | 118 |
| `perl-package` | 117 |
| `luarocks-package` | 74 |
| `host-cmake-package` | 57 |
| `kconfig-package` | 9 |

위 표는 호출 수 상위 항목과 `kconfig-package`만 뽑은 것입니다. autotools가 가장 많고, python과 손으로 명령을 적는 generic이 그 뒤입니다. `kconfig-package`는 busybox·linux 같은 9곳에서만 씁니다. 각각 자세히 봅니다.

### generic-package — 가장 유연한 출발점

빌드 시스템이 *비표준*이라면 generic-package입니다. 아래 예는 두 hook(build, install-target)을 명시적으로 정의합니다.

```make
MYAPP_VERSION = 1.0
MYAPP_SITE = $(call github,acme,myapp,v$(MYAPP_VERSION))
MYAPP_LICENSE = Apache-2.0
MYAPP_LICENSE_FILES = LICENSE

define MYAPP_BUILD_CMDS
	$(MAKE) $(TARGET_CONFIGURE_OPTS) -C $(@D) all
endef

define MYAPP_INSTALL_TARGET_CMDS
	$(INSTALL) -D -m 0755 $(@D)/myapp $(TARGET_DIR)/usr/bin/myapp
	$(INSTALL) -D -m 0644 $(@D)/myapp.conf $(TARGET_DIR)/etc/myapp.conf
endef

$(eval $(generic-package))
```

이 코드의 *움직이는 부분*은 다음과 같습니다.

- **`$(@D)`** — `output/build/myapp-1.0/`. 패키지 빌드 디렉터리.
- **`$(TARGET_CONFIGURE_OPTS)`** — `package/Makefile.in` 290행에서 정의되는 묶음입니다. `AR="$(TARGET_AR)"`, `CC="$(TARGET_CC)"`, `CXX="$(TARGET_CXX)"`, `RANLIB=…` 같은 cross-compile 변수가 한꺼번에 들어갑니다.
- **`$(TARGET_DIR)`** — `output/target/`. staged rootfs.
- **`$(STAGING_DIR)`** — staging (헤더·라이브러리 설치용).
- **`$(INSTALL)`** — `package/Makefile.in` 264행의 `INSTALL := $(shell which install || type -p install)`, 즉 호스트의 `install` 명령입니다.

`<NAME>_CONFIGURE_CMDS`를 정의하지 않으면 *configure 단계를 건너뜁니다*. 단순 Makefile 패키지에 자주 발생하는 패턴입니다.

`$(call github,...)`는 `package/pkg-download.mk`에 정의된 helper입니다. 같은 파일에 `gitlab`도 있습니다.

```makefile
github = https://github.com/$(1)/$(2)/archive/$(3)
gitlab = https://gitlab.com/$(1)/$(2)/-/archive/$(3)
```

helper는 *디렉터리 URL*까지만 만들고, 파일 이름은 infra가 `<pkg>-<version>.tar.gz`로 채웁니다. 실제 `cjson` 패키지(`CJSON_SITE = $(call github,DaveGamble,cjson,v$(CJSON_VERSION))`)를 펼쳐 보면 둘이 나뉘어 있습니다.

```text
$ make -s printvars VARS='CJSON_SITE CJSON_SOURCE' QUOTED_VARS=YES
CJSON_SITE='https://github.com/DaveGamble/cjson/archive/v1.7.19'
CJSON_SOURCE='cjson-1.7.19.tar.gz'
```

### autotools-package — `./configure && make`

트리에서 가장 많이 쓰이는 infra입니다. infra가 configure·build·install을 모두 자동 처리하므로 `.mk`에는 메타데이터만 남습니다. 실제 `package/libyaml/libyaml.mk` 본문 전체가 다음 9줄입니다.

```makefile
LIBYAML_VERSION = 0.2.5
LIBYAML_SOURCE = yaml-$(LIBYAML_VERSION).tar.gz
LIBYAML_SITE = http://pyyaml.org/download/libyaml
LIBYAML_INSTALL_STAGING = YES
LIBYAML_LICENSE = MIT
LIBYAML_LICENSE_FILES = License
LIBYAML_CPE_ID_VENDOR = pyyaml

$(eval $(autotools-package))
$(eval $(host-autotools-package))
```

적지 않은 변수는 infra가 채웁니다. `printvars`로 펼친 결과를 보면 의존성과 설치 위치가 들어와 있습니다.

```text
$ make -s printvars VARS='LIBYAML_DEPENDENCIES HOST_LIBYAML_DEPENDENCIES LIBYAML_INSTALL_TARGET LIBYAML_DIR' QUOTED_VARS=YES
HOST_LIBYAML_DEPENDENCIES='host-skeleton'
LIBYAML_DEPENDENCIES='skeleton toolchain host-skeleton'
LIBYAML_DIR='.../out-aarch64/build/libyaml-0.2.5'
LIBYAML_INSTALL_TARGET='YES'
```

`.mk`에 `DEPENDENCIES`를 한 줄도 적지 않았는데 `skeleton toolchain host-skeleton`이 붙었습니다. 모든 target 패키지가 toolchain 뒤에 빌드되는 이유가 이것입니다. 옵션에 따라 configure 인자를 바꾸는 패턴은 `ifeq ($(BR2_PACKAGE_…),y)` 블록으로 씁니다. 아래 cjson 예에서 볼 수 있습니다.

자주 쓰는 변수들은 다음입니다.

| 변수 | 의미 |
|---|---|
| `<NAME>_CONF_OPTS` | `./configure`에 전달할 옵션 |
| `<NAME>_CONF_ENV` | `./configure` 호출 시 환경 변수 |
| `<NAME>_MAKE_OPTS` | `make`에 전달할 옵션 |
| `<NAME>_MAKE_ENV` | `make` 호출 시 환경 변수 |
| `<NAME>_INSTALL_STAGING_OPTS` | staging install 옵션 |
| `<NAME>_INSTALL_TARGET_OPTS` | target install 옵션 |

`LIBYAML_INSTALL_STAGING = YES`가 *라이브러리 패키지*의 표지입니다. staging에 헤더·`.so`·`.pc`를 설치해, *다른 패키지가 빌드 시* link할 수 있게 합니다. 실제 rootfs에는 `INSTALL_TARGET`이 별도로 처리합니다.

### cmake-package — CMake 빌드

cmake 기반 패키지의 실제 예로 `package/cjson/cjson.mk`의 앞부분과 옵션 분기를 봅니다.

```makefile
CJSON_VERSION = 1.7.19
CJSON_SITE = $(call github,DaveGamble,cjson,v$(CJSON_VERSION))
CJSON_INSTALL_STAGING = YES
CJSON_LICENSE = MIT
CJSON_LICENSE_FILES = LICENSE
CJSON_CONF_OPTS += \
	-DENABLE_CJSON_TEST=OFF \
	-DENABLE_CUSTOM_COMPILER_FLAGS=OFF

ifeq ($(BR2_SHARED_STATIC_LIBS),y)
CJSON_CONF_OPTS += -DBUILD_SHARED_AND_STATIC_LIBS=ON
else
CJSON_CONF_OPTS += -DBUILD_SHARED_AND_STATIC_LIBS=OFF
endif

ifeq ($(BR2_PACKAGE_CJSON_UTILS),y)
CJSON_CONF_OPTS += -DENABLE_CJSON_UTILS=ON
else
CJSON_CONF_OPTS += -DENABLE_CJSON_UTILS=OFF
endif

$(eval $(cmake-package))
```

`DEPENDENCIES`에 `host-cmake`를 적지 않았습니다. `package/pkg-cmake.mk`가 의존성을 직접 붙이기 때문입니다.

```makefile
$(2)_DEPENDENCIES += host-pkgconf

$(2)_DEPENDENCIES += $(BR2_CMAKE_HOST_DEPENDENCY)
```

`BR2_CMAKE_HOST_DEPENDENCY`는 `support/dependencies/check-host-cmake.mk`가 호스트 cmake 버전을 보고 정합니다. 호스트에 충분히 새로운 cmake가 있으면 비어 있습니다. macOS 호스트(Homebrew cmake 설치)에서 펼친 값이 그 경우입니다.

```text
$ make -s printvars VARS='CJSON_DEPENDENCIES CJSON_CONF_OPTS' QUOTED_VARS=YES
CJSON_CONF_OPTS='-DENABLE_CJSON_TEST=OFF -DENABLE_CUSTOM_COMPILER_FLAGS=OFF -DBUILD_SHARED_AND_STATIC_LIBS=OFF -DENABLE_CJSON_UTILS=OFF'
CJSON_DEPENDENCIES='host-pkgconf skeleton toolchain host-skeleton'
```

cross-compile 설정은 `pkg-cmake.mk` 109행이 `-DCMAKE_TOOLCHAIN_FILE="$(HOST_DIR)/share/buildroot/toolchainfile.cmake"`로 넘깁니다. 이 파일은 `support/misc/toolchainfile.cmake.in`에서 생성됩니다. 패키지 작성자는 `CONF_OPTS`만 관리하면 됩니다.

### python-package — Python 모듈

Python application·라이브러리는 별도의 infra가 있습니다.

```make
PYTHON_MYTOOL_VERSION = 0.9
PYTHON_MYTOOL_SOURCE = mytool-$(PYTHON_MYTOOL_VERSION).tar.gz
PYTHON_MYTOOL_SITE = https://example.com/mytool
PYTHON_MYTOOL_LICENSE = Apache-2.0
PYTHON_MYTOOL_LICENSE_FILES = LICENSE
PYTHON_MYTOOL_SETUP_TYPE = flit

$(eval $(python-package))
```

이 예에서는 `<NAME>_SETUP_TYPE = flit`으로 backend를 명시합니다. `host-python-flit-core` 의존성은 `pkg-python.mk` 364행이 SETUP_TYPE에 맞춰 자동으로 붙이므로 따로 적지 않습니다. 2026.02.3 `package/pkg-python.mk` 314~315행이 허용 값을 강제합니다.

```makefile
ifneq ($$(filter-out setuptools setuptools-rust pep517 flit flit-bootstrap hatch maturin poetry,$$($(2)_SETUP_TYPE)),)
$$(error "Invalid $(2)_SETUP_TYPE. Valid options are 'maturin', 'setuptools', 'setuptools-rust', 'pep517', 'flit', 'hatch' or 'poetry'.")
```

값을 비우면 308행의 `"$(2)_SETUP_TYPE must be set"` 오류로 멈춥니다. `pyproject`는 설정 파일 형식이지 이 변수에 넣을 backend 이름이 아닙니다.

## host- prefix — 호스트용 패키지

같은 패키지를 *호스트에서도* 쓰고 싶을 때가 있습니다. 예를 들어 `pkg-config`, `cmake`, `python-flit-core`는 *빌드 도중 호스트가 사용*합니다. 이때는 `host-<name>` 형태로 별도 빌드합니다.

`Config.in`은 같지만 dependencies에 `host-pkgconf`처럼 prefix를 붙입니다. `.mk`에는 *추가로* 다음 한 줄을 더합니다.

```make
$(eval $(host-autotools-package))    # 또는 host-cmake-package 등
```

이 한 줄로 *같은 패키지가 호스트용으로도* 빌드되어 `output/host/`에 설치됩니다. 흔히 *target + host 둘 다* 필요한 경우 두 줄을 함께 둡니다.

## .hash — 무결성 검증

source tarball을 받은 뒤 *hash 검증*을 합니다. `package/<name>/<name>.hash`가 정답을 담고 있습니다.

실제 `package/libyaml/libyaml.hash`는 tarball과 license 파일 두 줄입니다.

```text
# Locally calculated
sha256  c642ae9b75fee120b2d96c712538bd2cf283228d2337df2cf2988e3c02678ef4  yaml-0.2.5.tar.gz
sha256  c40112449f254b9753045925248313e9270efa36d226b22d82d4cc6c43c57f29  License
```

형식은 매뉴얼 "The .hash file" 절이 정합니다. 한 줄에 *hash 종류, hash 값, 파일 이름*을 공백 두 칸으로 구분하고, 종류는 `md5`·`sha1`·`sha224`·`sha256`·`sha384`·`sha512` 중 하나입니다. 검증이 실패했을 때 동작도 같은 절에 있습니다.

- hash가 맞지 않으면 "Buildroot considers this an error, deletes the downloaded file, and aborts."
- `.hash` 파일은 있는데 그 파일의 hash 줄이 없으면 역시 중단하지만, 받은 파일은 남겨 둡니다.
- custom version(사용자 지정 버전·URL·git 커밋)은 기본적으로 검사하지 않습니다. `BR2_DOWNLOAD_FORCE_CHECK_HASHES`를 켜면 이것도 검사하며, `qemu_aarch64_virt_defconfig`와 `beaglebone_defconfig`가 이 옵션을 켭니다.

새 버전을 올릴 때는 다음 순서로 hash를 다시 계산합니다.

```bash
make myapp-dirclean
rm dl/myapp/*
make myapp-source
sha256sum dl/myapp/myapp-1.3.0.tar.gz
```

`sha256sum` 결과를 `myapp.hash`에 갱신합니다.

license 파일 hash는 매뉴얼 표현으로 "used to detect a license change when a package version is bumped"이고, `make legal-info` 실행 때 검사됩니다.

## 패치 — package 디렉터리 안의 0001-*.patch

source에 수정이 필요하면 *직접 source를 고치지 말고* 패치 파일을 둡니다.

```text
package/myapp/
├── Config.in
├── myapp.hash
├── myapp.mk
├── 0001-fix-cross-compile.patch
└── 0002-add-musl-support.patch
```

매뉴얼 "How patches are applied" 절에 따르면 패키지 디렉터리에 `series` 파일이 있으면 그 순서로, 없으면 `*.patch`를 *알파벳 순*으로 적용합니다. 그래서 `<번호>-<설명>.patch` 이름을 권합니다. 그다음 `BR2_GLOBAL_PATCH_DIR`에 나열한 디렉터리의 패치가 같은 규칙으로 이어집니다. 매뉴얼은 `<pkg>_PATCH`로 받은 패치와 패키지 디렉터리 패치를 적용하는 단계에서 하나라도 실패하면 빌드가 멈춘다고 적습니다. 실제 `package/busybox/`에는 `0001-…`부터 `0014-wget-dont-allow-control-characters-or-spaces-in-the-URL.patch`까지 14개가 있습니다. `git format-patch` 출력 형식 그대로라 상류에 보내기도 쉽습니다.

## 디버깅 흐름

패키지를 작성하다 보면 *빌드가 깨졌는데 어디인지 모를 때*가 옵니다. 다음 흐름이 표준입니다.

```bash
make V=1 myapp 2>&1 | tee build.log
less build.log
cd output/build/myapp-1.2.3/
make CC=$(realpath ../../host/bin/aarch64-...-gcc) ...
```

`V=1`로 verbose 빌드 후 `build.log`에서 실제 명령을 찾고, 압축 풀린 source 디렉터리로 들어가 손으로 명령을 재현해 문제 위치를 좁힙니다.

특히 효과적인 명령은 다음입니다.

```bash
make myapp-dirclean
make myapp-extract
make myapp-patch
make myapp-configure
make myapp-build
make myapp-install
```

순서대로 *source 디렉터리 삭제*, *새로 압축 풀기*, *패치 적용까지*, *configure*, *build*, *install*입니다.

단계별로 끊어 들어가면 *어느 단계*에서 실패하는지 명확합니다. 각 단계의 산물은 `output/build/myapp-<ver>/.stamp_<단계>`로 표시되므로, 해당 stamp 파일을 지우면 그 단계부터 재실행합니다.

여섯 단계의 진행과 각 단계에 대응되는 make 타깃, stamp 파일을 한 장으로 정리하면 다음과 같습니다.

![Buildroot 패키지 빌드 6단계](/images/blog/buildroot/diagrams/chapter05-package-lifecycle.svg)

## 자주 하는 실수

- **`<NAME>_*` 변수 prefix를 패키지명과 안 맞춥니다.** `MYAP_SITE`처럼 오타가 난 변수는 make 입장에서 그냥 다른 변수입니다. 스크래치 `BR2_EXTERNAL` 트리에 `MYAPP_VERSION = 1.0`, `MYAP_SITE = …`로 패키지를 만들어 켜 봤더니, `SOURCE`는 infra가 `myapp-1.0.tar.gz`로 채운 상태라 파싱 단계에서 멈췄습니다.

  ```text
  .../ext-typo/package/myapp/myapp.mk:5: *** MYAPP_SITE cannot be empty when MYAPP_SOURCE is not.  Stop.
  ```

  이번에는 오류가 났지만, 오타가 `MYAPP_CONF_OPTS` 같은 선택 변수에 나면 아무 오류 없이 무시됩니다. `make -s printvars VARS='MYAPP_%'`로 infra가 본 값을 확인하고, `utils/check-package`로 오타 후보를 찾습니다.
- **`<NAME>_LICENSE`를 비웁니다.** 매뉴얼은 이 변수가 선택 사항이며, 비우면 legal-info manifest의 license 칸에 `unknown`이 찍힌다고 적습니다. 배포물의 라이선스 검토에서 빈칸이 되므로 SPDX 식별자로 채웁니다.
- **`<NAME>_DEPENDENCIES`에 *host 도구*를 빠뜨립니다.** 예를 들어 generic·autotools 패키지가 `pkg-config`를 부르는데 `host-pkgconf`를 적지 않으면, 내 호스트에 우연히 있는 `pkg-config`로 빌드되다가 다른 호스트에서 깨집니다. cmake-package만 `host-pkgconf`를 자동으로 붙입니다.
- **source 안에서 직접 수정합니다.** 다음 `make clean` 한 번이면 사라집니다. 변경은 *반드시* `0001-*.patch`로 영구화.
- **staging vs target 혼동.** *라이브러리*는 staging에도 가야 다른 패키지가 빌드 시 link할 수 있습니다. `INSTALL_STAGING = YES`를 빠뜨리지 마세요.

## 정리

- 한 패키지는 `Config.in`(옵션 노출) + `<name>.mk`(빌드 레시피) 두 파일로 정의됩니다.
- `Config.in`의 옵션 심볼은 *반드시* `BR2_PACKAGE_<UPPER>` 형태입니다.
- `.mk`는 `<NAME>_VERSION`·`SITE`·`LICENSE`·`DEPENDENCIES` 같은 변수 + infra 호출 한 줄로 동작합니다.
- 2026.02.3 트리의 infra 호출 수는 autotools 1,085, python 570, generic 553, cmake 382, meson 207 순입니다.
- `github`/`gitlab` helper는 디렉터리 URL만 만들고 파일 이름은 infra가 붙입니다. `kernel` 같은 helper는 없습니다.
- 라이브러리는 `INSTALL_STAGING = YES`로 staging에 헤더·`.so`·`.pc`를 함께 설치합니다.
- `<name>.hash`가 source와 license 파일을 검증하고, 불일치하면 받은 파일을 지우고 중단합니다.
- 변경은 *source 직접 수정 금지*, `0001-*.patch`로 영구화합니다.
- 빌드 디버깅은 `make <pkg>-extract` / `patch` / `configure` / `build` / `install`을 단계별로 끊어 갑니다.

## 다음 장 예고

다음 편은 **Ch 6: 외부 트리 — BR2_EXTERNAL**. 회사·팀의 패키지·보드를 Buildroot 본체와 분리하는 메커니즘을 다룹니다.


## 관련 항목

- [Ch 2: 디렉터리 구조](/blog/embedded/buildroot/chapter02-directory-structure)
- [Ch 3: Kconfig 설정 — menuconfig와 defconfig](/blog/embedded/buildroot/chapter03-kconfig)
- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 9: 새 패키지 작성 — autotools, cmake, python](/blog/embedded/buildroot/chapter09-new-package)
- [BSP Development Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add) — 커널 측 변경과 패키지 측 변경의 분리
- [Buildroot Manual — Adding new packages to Buildroot](https://buildroot.org/downloads/manual/manual.html#adding-packages)
