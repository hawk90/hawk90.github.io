---
title: "Ch 5: 패키지 시스템 — .mk와 Config.in"
date: 2026-05-19T05:00:00
description: "Buildroot 패키지 작성 규약 — Config.in 옵션 노출과 .mk 빌드 레시피."
series: "Buildroot Practical"
seriesOrder: 5
tags: [embedded, buildroot, package, mk, config-in]
draft: false
---

## 한 줄 요약

> **"한 패키지는 `Config.in` + `<name>.mk` 두 파일이 전부입니다."** — Kconfig가 옵션을 노출하고, `.mk`가 빌드 명령을 정의합니다. 두 파일의 짝만 이해하면 2,000개 패키지 모두가 같은 패턴으로 풀립니다.

## 왜 패키지 시스템부터 깊이 보는가

Buildroot로 *실무*에 들어가는 순간 가장 자주 만지는 곳이 패키지입니다. 새 라이브러리를 추가하거나, 회사 내 application을 rootfs에 넣거나, 기존 패키지의 빌드 옵션을 바꾸는 일이 매주 발생합니다. 다행히 Buildroot는 *모든 패키지가 같은 패턴*을 따르도록 강제합니다. 패턴 한 번 익히면 다음부터는 *베끼고 수정*이면 충분합니다.

이 장은 두 부분으로 나뉩니다. 전반은 `Config.in` + `.mk` 한 쌍의 구조, 후반은 `generic-package` / `autotools-package` / `cmake-package` 세 infra의 차이입니다.

## 파일 두 개의 짝

`package/<name>/` 안에 다음 두 파일이 한 쌍으로 들어갑니다.

```text
package/myapp/
├── Config.in        ─ Kconfig 옵션 (menuconfig에 노출)
└── myapp.mk         ─ 빌드 레시피 (make가 실행)
```

추가로 자주 있는 파일은 다음과 같습니다.

```text
myapp.hash           ─ tarball SHA-256, license 파일 hash
0001-*.patch         ─ source에 적용할 패치
S99myapp             ─ /etc/init.d에 설치할 init script
myapp.service        ─ systemd unit
```

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

규약은 *철저히 대문자 이름 prefix*입니다. 패키지 이름이 `myapp`이면 모든 변수가 `MYAPP_*`입니다. 이 prefix 규약을 깨는 패키지는 *Buildroot CI*가 거부합니다.

핵심 변수들은 다음 표가 거의 전부입니다.

| 변수 | 의미 | 예 |
|---|---|---|
| `<NAME>_VERSION` | 버전 문자열 | `1.2.3` |
| `<NAME>_SITE` | source URL prefix | `https://...` |
| `<NAME>_SOURCE` | tarball 파일명 (보통 자동 유추) | `myapp-1.2.3.tar.gz` |
| `<NAME>_SITE_METHOD` | `http` / `git` / `local` / `svn` | `git` |
| `<NAME>_LICENSE` | SPDX-style 라이선스 | `GPL-2.0+` |
| `<NAME>_LICENSE_FILES` | source 내 라이선스 파일 | `COPYING LICENSE` |
| `<NAME>_DEPENDENCIES` | 빌드 의존 패키지 | `openssl libcurl` |
| `<NAME>_INSTALL_STAGING` | staging에 설치할지 | `YES` (라이브러리만) |
| `<NAME>_INSTALL_TARGET` | rootfs에 설치할지 | `YES` (기본값) |

## 세 가지 infra — generic / autotools / cmake

마지막 줄의 `$(eval $(generic-package))`가 *infra*를 선택합니다. 패키지의 빌드 시스템이 무엇인지에 따라 골라 씁니다.

| infra | 적용 빌드 시스템 | 호출 |
|---|---|---|
| **generic-package** | 표준 빌드 시스템이 *없는* 경우 (custom Makefile, 직접 스크립트 등) | `$(eval $(generic-package))` |
| **autotools-package** | `./configure && make` (GNU autotools) | `$(eval $(autotools-package))` |
| **cmake-package** | `cmake -B build && cmake --build build` | `$(eval $(cmake-package))` |
| **meson-package** | `meson setup build && ninja -C build` | `$(eval $(meson-package))` |
| **python-package** | Python `setup.py` / pyproject | `$(eval $(python-package))` |
| **kconfig-package** | 자체 Kconfig 가진 패키지 (busybox, linux) | `$(eval $(kconfig-package))` |

대부분의 *오픈소스 라이브러리*는 autotools나 cmake입니다. 사내 application은 generic-package로 시작하는 경우가 많습니다. 각각 자세히 봅니다.

### generic-package — 가장 유연한 출발점

빌드 시스템이 *비표준*이라면 generic-package입니다. 세 hook을 명시적으로 정의합니다.

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
- **`$(TARGET_CONFIGURE_OPTS)`** — `CC=aarch64-...-gcc`, `CXX=...`, `CFLAGS=...` 등 cross-compile 변수가 한 묶음.
- **`$(TARGET_DIR)`** — `output/target/`. staged rootfs.
- **`$(STAGING_DIR)`** — staging (헤더·라이브러리 설치용).
- **`$(INSTALL)`** — `install` 명령의 안전한 wrapper.

`<NAME>_CONFIGURE_CMDS`를 정의하지 않으면 *configure 단계를 건너뜁니다*. 단순 Makefile 패키지에 자주 발생하는 패턴입니다.

`$(call github,acme,myapp,v1.0)`은 `https://github.com/acme/myapp/archive/v1.0.tar.gz`로 펼쳐지는 *helper*입니다. 자주 쓰는 helper 몇 개를 알아두면 좋습니다.

| helper | 펼쳐지는 결과 |
|---|---|
| `$(call github,owner,repo,tag)` | `https://github.com/owner/repo/archive/<tag>.tar.gz` |
| `$(call gitlab,owner,repo,tag)` | `https://gitlab.com/owner/repo/-/archive/<tag>/...` |
| `$(call kernel,longterm,v6.x,linux-6.6.30)` | kernel.org 미러 |

### autotools-package — `./configure && make`

대부분의 GNU/오픈소스 라이브러리는 autotools입니다. infra가 *configure·build·install*을 모두 자동 처리합니다.

```make
LIBFOO_VERSION = 2.5.0
LIBFOO_SOURCE = libfoo-$(LIBFOO_VERSION).tar.xz
LIBFOO_SITE = https://example.com/libfoo/releases
LIBFOO_LICENSE = LGPL-2.1+
LIBFOO_LICENSE_FILES = COPYING
LIBFOO_INSTALL_STAGING = YES
LIBFOO_DEPENDENCIES = host-pkgconf zlib

LIBFOO_CONF_OPTS = \
	--disable-static \
	--enable-shared \
	--without-docs

ifeq ($(BR2_PACKAGE_LIBFOO_WITH_TLS),y)
LIBFOO_CONF_OPTS += --enable-tls
LIBFOO_DEPENDENCIES += openssl
else
LIBFOO_CONF_OPTS += --disable-tls
endif

$(eval $(autotools-package))
```

자주 쓰는 변수들은 다음입니다.

| 변수 | 의미 |
|---|---|
| `<NAME>_CONF_OPTS` | `./configure`에 전달할 옵션 |
| `<NAME>_CONF_ENV` | `./configure` 호출 시 환경 변수 |
| `<NAME>_MAKE_OPTS` | `make`에 전달할 옵션 |
| `<NAME>_MAKE_ENV` | `make` 호출 시 환경 변수 |
| `<NAME>_INSTALL_STAGING_OPTS` | staging install 옵션 |
| `<NAME>_INSTALL_TARGET_OPTS` | target install 옵션 |

`LIBFOO_INSTALL_STAGING = YES`가 *라이브러리 패키지*의 표지입니다. staging에 헤더·`.so`·`.pc`를 설치해, *다른 패키지가 빌드 시* link할 수 있게 합니다. 실제 rootfs에는 `INSTALL_TARGET`이 별도로 처리합니다.

### cmake-package — CMake 빌드

cmake 기반 라이브러리도 그대로 표준 패턴이 있습니다.

```make
LIBBAR_VERSION = 1.0.0
LIBBAR_SOURCE = libbar-$(LIBBAR_VERSION).tar.gz
LIBBAR_SITE = https://example.com/libbar
LIBBAR_LICENSE = MIT
LIBBAR_LICENSE_FILES = LICENSE.txt
LIBBAR_INSTALL_STAGING = YES
LIBBAR_DEPENDENCIES = host-cmake

LIBBAR_CONF_OPTS = \
	-DBUILD_SHARED_LIBS=ON \
	-DBUILD_TESTING=OFF \
	-DENABLE_DOCS=OFF

$(eval $(cmake-package))
```

cmake-package는 *toolchain file*을 자동으로 적용합니다. cross-compile에 필요한 `CMAKE_C_COMPILER`, `CMAKE_FIND_ROOT_PATH`, `CMAKE_SYSROOT` 등이 한 번에 세팅됩니다. 패키지 작성자는 *옵션만* 관리하면 됩니다.

### python-package — Python 모듈

Python application·라이브러리는 별도의 infra가 있습니다.

```make
PYTHON_MYTOOL_VERSION = 0.9
PYTHON_MYTOOL_SOURCE = mytool-$(PYTHON_MYTOOL_VERSION).tar.gz
PYTHON_MYTOOL_SITE = https://example.com/mytool
PYTHON_MYTOOL_LICENSE = Apache-2.0
PYTHON_MYTOOL_LICENSE_FILES = LICENSE
PYTHON_MYTOOL_SETUP_TYPE = pyproject
PYTHON_MYTOOL_DEPENDENCIES = host-python-flit-core

$(eval $(python-package))
```

`<NAME>_SETUP_TYPE`이 `setuptools` / `flit` / `pyproject` / `distutils` 중 하나입니다. 각각 *어떤 도구로* 빌드할지를 가립니다.

## host- prefix — 호스트용 패키지

같은 패키지를 *호스트에서도* 쓰고 싶을 때가 있습니다. 예를 들어 `pkg-config`, `cmake`, `python-flit-core`는 *빌드 도중 호스트가 사용*합니다. 이때는 `host-<name>` 형태로 별도 빌드합니다.

`Config.in`은 같지만 dependencies에 `host-pkgconf`처럼 prefix를 붙입니다. `.mk`에는 *추가로* 다음 한 줄을 더합니다.

```make
$(eval $(host-autotools-package))    # 또는 host-cmake-package 등
```

이 한 줄로 *같은 패키지가 호스트용으로도* 빌드되어 `output/host/`에 설치됩니다. 흔히 *target + host 둘 다* 필요한 경우 두 줄을 함께 둡니다.

## .hash — 무결성 검증

source tarball을 받은 뒤 *hash 검증*을 합니다. `package/<name>/<name>.hash`가 정답을 담고 있습니다.

```text
# Locally calculated
sha256  ab12cd34ef...  myapp-1.2.3.tar.gz
sha256  56ef78ab90...  LICENSE
```

`make myapp-source`를 처음 돌릴 때 hash가 *생성되지 않으면* CI가 거부합니다. 새 버전을 올릴 때 다음 명령으로 hash를 다시 계산합니다.

```text
$ make myapp-dirclean
$ rm dl/myapp/*
$ make myapp-source
$ sha256sum dl/myapp/myapp-1.3.0.tar.gz
$ # 결과를 myapp.hash에 갱신
```

license 파일도 hash로 검증합니다. 이는 *업스트림이 라이센스를 조용히 바꾸는 것*을 catch하기 위한 안전장치입니다.

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

번호 순서대로(`0001`, `0002`, …) 적용됩니다. git format-patch 출력 그대로 둘 수 있어 *상류 PR 보내기*도 자연스럽습니다.

## 디버깅 흐름

패키지를 작성하다 보면 *빌드가 깨졌는데 어디인지 모를 때*가 옵니다. 다음 흐름이 표준입니다.

```text
$ make V=1 myapp 2>&1 | tee build.log    # verbose
$ less build.log                          # 실제 명령 확인
$ cd output/build/myapp-1.2.3/            # 압축 풀린 source로 진입
$ make CC=$(realpath ../../host/bin/aarch64-...-gcc) ...
$ # 손으로 명령을 재현해 문제 위치 좁히기
```

특히 효과적인 명령은 다음입니다.

```text
$ make myapp-dirclean                     # source 디렉터리 삭제
$ make myapp-extract                      # 새로 압축 풀기
$ make myapp-patch                        # 패치 적용까지
$ make myapp-configure
$ make myapp-build
$ make myapp-install
```

단계별로 끊어 들어가면 *어느 단계*에서 실패하는지 명확합니다. 각 단계의 산물은 `output/build/myapp-<ver>/.stamp_<단계>`로 표시되므로, 해당 stamp 파일을 지우면 그 단계부터 재실행합니다.

## 자주 하는 실수

- **`<NAME>_*` 변수 prefix를 패키지명과 안 맞춥니다.** 패키지가 *조용히 무시*됩니다. 항상 `make show-info | grep <name>`으로 인식 여부 확인.
- **`<NAME>_LICENSE`를 비웁니다.** maintainer CI가 reject. 정말 모르겠으면 `LICENSE = unknown`으로라도 명시.
- **`<NAME>_DEPENDENCIES`에 *host 도구*를 빠뜨립니다.** 예를 들어 `host-pkgconf`. 다른 사람 머신에서 빌드 깨집니다.
- **source 안에서 직접 수정합니다.** 다음 `make clean` 한 번이면 사라집니다. 변경은 *반드시* `0001-*.patch`로 영구화.
- **staging vs target 혼동.** *라이브러리*는 staging에도 가야 다른 패키지가 빌드 시 link할 수 있습니다. `INSTALL_STAGING = YES`를 빠뜨리지 마세요.

## 정리

- 한 패키지는 `Config.in`(옵션 노출) + `<name>.mk`(빌드 레시피) 두 파일로 정의됩니다.
- `Config.in`의 옵션 심볼은 *반드시* `BR2_PACKAGE_<UPPER>` 형태입니다.
- `.mk`는 `<NAME>_VERSION`·`SITE`·`LICENSE`·`DEPENDENCIES` 같은 변수 + infra 호출 한 줄로 동작합니다.
- infra는 `generic-package` / `autotools-package` / `cmake-package` / `meson-package` / `python-package`가 가장 흔합니다.
- 라이브러리는 `INSTALL_STAGING = YES`로 staging에 헤더·`.so`·`.pc`를 함께 설치합니다.
- `<name>.hash`가 source와 license 파일의 무결성을 검증합니다.
- 변경은 *source 직접 수정 금지*, `0001-*.patch`로 영구화합니다.
- 빌드 디버깅은 `make <pkg>-extract` / `patch` / `configure` / `build` / `install`을 단계별로 끊어 갑니다.

다음 편은 **Ch 6: 외부 트리 — BR2_EXTERNAL**. 회사·팀의 패키지·보드를 Buildroot 본체와 분리하는 메커니즘을 다룹니다.

## 관련 항목

- [Ch 2: 디렉터리 구조](/blog/embedded/buildroot/chapter02-directory-structure)
- [Ch 3: Kconfig 설정 — menuconfig와 defconfig](/blog/embedded/buildroot/chapter03-kconfig)
- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 9: 새 패키지 작성 — autotools, cmake, python](/blog/embedded/buildroot/chapter09-new-package)
- [BSP Development Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add) — 커널 측 변경과 패키지 측 변경의 분리
