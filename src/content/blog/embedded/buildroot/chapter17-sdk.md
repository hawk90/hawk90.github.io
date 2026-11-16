---
title: "Buildroot SDK 생성·배포 — make sdk와 application 워크플로"
slug: "embedded/buildroot/chapter17-sdk"
date: 2026-05-19T09:17:00
description: "Buildroot가 만든 toolchain을 application 개발자에게 SDK로 배포하는 패턴과 relocatable toolchain 한계."
series: "Buildroot Practical"
seriesOrder: 17
tags: [embedded, buildroot, sdk, toolchain, application]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"SDK는 *frozen toolchain*입니다."** — Buildroot가 만든 toolchain·sysroot를 *재배포 가능한 tarball*로 묶어 application 개발자에게 넘기는 산출물입니다. 한 번 만들면 같은 ABI 안에서 *분리된 두 팀*이 병렬로 일할 수 있습니다.

## 왜 SDK가 별도의 산출물인가

Buildroot 트리는 *시스템 개발자*의 환경입니다. 커널·rootfs·toolchain·패키지 트리를 모두 가지고 있으며, `make`를 돌리면 전체가 한꺼번에 빌드됩니다. 그런데 application 개발자는 *그 트리 전체*를 받을 필요가 없습니다. 그들이 원하는 것은 "내 application을 *이 보드 ABI*에 맞춰 cross-compile하고 싶다"입니다.

여기서 두 역할이 갈립니다. *시스템 팀*은 Buildroot 트리를 유지하며 커널·base library를 정합니다. *application 팀*은 그 위에서 도는 application만 짭니다. 두 팀이 같은 Buildroot 트리를 공유하면 충돌이 생깁니다. 시스템 팀이 라이브러리 버전을 올렸는데 application 팀의 빌드가 깨지고, 반대로 application 팀이 임시로 시스템 패키지를 추가했다가 양산 image에 새 패키지가 섞입니다.

SDK가 이 둘을 분리합니다. 시스템 팀이 *frozen toolchain + sysroot*를 SDK로 패키징해 사내 artifact repo에 올리고, application 팀은 그것을 받아 일반 cross-compile 환경처럼 씁니다. 시스템 트리 전체를 보지 않아도 됩니다.

이 장은 `make sdk`가 만드는 산출물의 구조, relocatable toolchain의 한계, 외부 application을 빌드하는 4가지 워크플로, 그리고 IDE 통합까지 다룹니다. SDK 생성·압축 해제·relocate·cross-compile은 **Buildroot 2026.02.3** QEMU defconfig 빌드(Ch 4와 같은 Debian 13 arm64 VM)에서 실제로 돌렸습니다. 이사 갈 때 공구함만 따로 챙겨 주는 것처럼, SDK는 시스템 팀의 작업장(Buildroot 트리) 대신 *공구함*(toolchain + sysroot)만 넘기는 방법입니다.

## make sdk — 무엇이 생기는가

매뉴얼 "Using the generated toolchain outside Buildroot"에 따르면 `make sdk`는 "a tarball of the content of the host directory `output/host/`"를 만들고, 이름은 `<TARGET-TUPLE>_sdk-buildroot.tar.gz`입니다. 최상위 `Makefile` 615~640행이 그 절차입니다.

1. `prepare-sdk`: `world`를 먼저 끝내고, `support/misc/relocate-sdk.sh`를 `output/host/`에 복사합니다.
2. `output/host/` 안에서 원래 경로(`$(HOST_DIR)`)를 포함한 *텍스트 파일* 목록을 `share/buildroot/sdk-relocs`에, 원래 경로를 `share/buildroot/sdk-location`에 적습니다.
3. `sdk`: `tar czf … --owner=0 --group=0 --numeric-owner --transform=…`로 `output/host/`를 묶습니다. 이름 앞부분은 `BR2_SDK_PREFIX ?= $(GNU_TARGET_NAME)_sdk-buildroot`입니다.

`environment-setup`은 기본으로 들어가지 않습니다. 매뉴얼대로 `BR2_PACKAGE_HOST_ENVIRONMENT_SETUP`을 켜야 `output/host/environment-setup`이 생깁니다. 이 옵션을 켜고 `make sdk`를 돌린 결과입니다(이미 빌드된 트리에서 69.53초).

```text
>>>   Preparing the SDK
>>>   Generating SDK tarball
$ ls -l output/images/*sdk*
-rw-r--r-- 1 br br 289781192 Nov 16 04:18 output/images/aarch64-buildroot-linux-gnu_sdk-buildroot.tar.gz
$ wc -l output/host/share/buildroot/sdk-relocs
465 output/host/share/buildroot/sdk-relocs
$ cat output/host/share/buildroot/sdk-location
/home/br/buildroot/output/host
```

압축본은 290 MB, 풀면 1.1 GB였습니다. 압축을 푼 최상위는 `output/host/`와 같은 모양입니다.

```text
aarch64-buildroot-linux-gnu/
bin/
doc/
environment-setup
etc/
include/
lib/
lib64/
libexec/
relocate-sdk.sh
sbin/
share/
usr/
```

| 경로 | 역할 |
|---|---|
| `bin/aarch64-buildroot-linux-gnu-*` | cross compiler·binutils (host에서 실행) |
| `aarch64-buildroot-linux-gnu/sysroot/` | target sysroot (헤더·라이브러리, Ch 4의 `staging/`) |
| `share/buildroot/toolchainfile.cmake` | CMake toolchain file |
| `share/buildroot/sdk-location`, `sdk-relocs` | relocate용 메타데이터 |
| `environment-setup` | `BR2_PACKAGE_HOST_ENVIRONMENT_SETUP`일 때만 |
| `relocate-sdk.sh` | 새 위치로 옮긴 뒤 경로 갱신 |

SDK에 포함된 cross compiler는 *SDK를 만든 호스트*의 실행 파일입니다.

```text
$ file bin/aarch64-buildroot-linux-gnu-gcc.br_real
bin/aarch64-buildroot-linux-gnu-gcc.br_real: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, ...
```

이 SDK는 arm64 Linux VM에서 만들었으므로 x86_64 워크스테이션에서는 실행되지 않습니다. host 아키텍처마다 Buildroot를 그 host에서 빌드해 SDK를 따로 만들어야 합니다.

## relocatable toolchain — 어떻게 동작하는가

SDK 안의 일부 텍스트 파일은 *만든 머신의 절대 경로*를 담고 있습니다. `relocate-sdk.sh`는 `sdk-relocs`에 적힌 파일마다 `sed -i "s|${OLDPATH}|${NEWPATH}|g"`를 돌리고, 마지막에 `sdk-location`을 바꿉니다. 실제로 `/tmp/sdkt/`에 풀고 두 번 돌려 봤습니다.

```text
$ ./relocate-sdk.sh
Relocating the buildroot SDK from /home/br/buildroot/output/host to /tmp/sdkt/aarch64-buildroot-linux-gnu_sdk-buildroot ...
$ ./relocate-sdk.sh
This buildroot SDK has already been relocated!
```

두 번째 실행은 `sdk-location`이 현재 경로와 같으면 바로 끝나는 스크립트의 분기입니다. 스크립트는 인자로 경로를 주면 "sets the location to [path] (without moving it)"도 지원합니다.

한계는 스크립트 자체에서 보입니다.

- **텍스트 파일만 고칩니다.** `prepare-sdk`가 `file -b --mime-type`이 `text/`인 파일만 `sdk-relocs`에 넣습니다. 바이너리에 박힌 경로는 대상이 아닙니다.
- **원래 경로 문자열만 바꿉니다.** `output/host` 밖을 가리키던 경로는 그대로입니다. 실제로 `environment-setup`의 `export "KERNELDIR=/home/br/buildroot/output/build/linux-6.18.7/"`는 relocate 뒤에도 빌드 머신 경로를 가리켰습니다. 외부 커널 모듈을 SDK로 빌드하려면 이 변수를 쓰면 안 됩니다.
- **경로 치환 검사를 합니다.** 새 경로가 옛 경로를 포함하는 식으로 잘못 치환될 경우 "Something went wrong with substituting the path!"로 멈춥니다.

반대로 relocate가 *필요 없는* 파일도 있습니다. `share/buildroot/toolchainfile.cmake`에는 relocate 전에도 원래 경로가 한 번도 나오지 않았습니다(`grep -c` 0). 파일 첫머리가 `string(REPLACE "/share/buildroot" "" RELOCATED_HOST_DIR ${CMAKE_CURRENT_LIST_DIR})`로 *자기 위치*에서 SDK 경로를 계산하기 때문입니다. `bin/pkg-config`도 `PKGCONFDIR=$(dirname $0)` 기준의 상대 경로로 sysroot를 찾습니다.

## environment-setup 스크립트

`BR2_PACKAGE_HOST_ENVIRONMENT_SETUP`이 만드는 스크립트는 `package/environment-setup/environment-setup.mk`가 조립합니다. Ch 5에서 본 `TARGET_CONFIGURE_OPTS`의 각 항목을 `export`로 옮기고, `ARCH`·`CROSS_COMPILE`·`CONFIGURE_FLAGS`와 `configure`·`cmake` alias를 붙인 뒤, `HOST_DIR`을 `$SDK_PATH`로 바꿉니다. 실제 생성된 파일의 주요 줄입니다(배너와 일부 변수 생략).

```bash
if [ x"$BASH_VERSION" != x"" ] ; then
	SDK_PATH=$(dirname $(realpath "${BASH_SOURCE[0]}"))
elif [ x"$ZSH_VERSION" != x"" ] ; then
	SDK_PATH=$(dirname $(realpath $0))
else
	echo "unsupported shell"
fi
export "CC=aarch64-buildroot-linux-gnu-gcc"
export "CXX=aarch64-buildroot-linux-gnu-g++"
...
export "CFLAGS=-D_LARGEFILE_SOURCE -D_LARGEFILE64_SOURCE -D_FILE_OFFSET_BITS=64 -O2 -g0 -D_FORTIFY_SOURCE=1"
export "LDFLAGS="
export "PKG_CONFIG=pkg-config"
export "STAGING_DIR=$SDK_PATH/aarch64-buildroot-linux-gnu/sysroot"
...
export "CXX=no"
export "ARCH=arm64"
export "CROSS_COMPILE=aarch64-buildroot-linux-gnu-"
export "CONFIGURE_FLAGS=--target=aarch64-buildroot-linux-gnu --host=aarch64-buildroot-linux-gnu --build=aarch64-unknown-linux-gnu --prefix=/usr --exec-prefix=/usr --sysconfdir=/etc --localstatedir=/var --program-prefix="
alias configure="./configure ${CONFIGURE_FLAGS}"
alias cmake="cmake -DCMAKE_TOOLCHAIN_FILE=$SDK_PATH/share/buildroot/toolchainfile.cmake -DCMAKE_INSTALL_PREFIX=/usr"
export "PATH=$SDK_PATH/bin:$SDK_PATH/sbin:$PATH"
export "KERNELDIR=/home/br/buildroot/output/build/linux-6.18.7/"
```

읽을 때 주의할 점이 넷 있습니다.

- **`SDK_PATH`는 스크립트 위치에서 계산합니다.** 그래서 이 스크립트 자체는 relocate가 필요 없습니다. bash·zsh가 아니면 "unsupported shell"을 냅니다.
- **`CXX=no`가 뒤에 다시 나옵니다.** 이 defconfig는 C++ toolchain을 켜지 않았고, `package/Makefile.in` 443행이 그 경우 `TARGET_CONFIGURE_OPTS += CXX=no`를 덧붙입니다. C++ application이 필요하면 SDK를 만들기 전에 `BR2_TOOLCHAIN_BUILDROOT_CXX`를 켭니다.
- **`PKG_CONFIG_SYSROOT_DIR`·`PKG_CONFIG_LIBDIR`은 export하지 않습니다.** 대신 SDK의 `bin/pkg-config`가 wrapper라서, 값이 비어 있으면 `DEFAULT_PKG_CONFIG_SYSROOT_DIR=${PKGCONFDIR}/../aarch64-buildroot-linux-gnu/sysroot`와 sysroot의 `usr/lib/pkgconfig`를 기본으로 씁니다. 실제로 source 후 `echo $PKG_CONFIG_SYSROOT_DIR`는 빈 값이었습니다. 개인 셸 설정에서 이 변수를 미리 지정해 두면 wrapper의 기본값을 덮어 host 라이브러리가 섞이므로, 지정하지 않는 것이 맞습니다.
- **`KERNELDIR`은 relocate되지 않습니다**(앞 절).

source한 뒤 같은 셸에서 cross-compile이 바로 됐습니다.

```text
$ . ./environment-setup
$ echo $CC; echo $CROSS_COMPILE
aarch64-buildroot-linux-gnu-gcc
aarch64-buildroot-linux-gnu-
$ $CC $CFLAGS -o /tmp/hi /tmp/hi.c && file /tmp/hi
/tmp/hi: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, for GNU/Linux 6.18.0, not stripped
```

매뉴얼은 이 스크립트를 source한 셸이 "setup only for cross-compilation, and no longer for native compilation"이 된다고 경고합니다. 네이티브 빌드는 다른 셸에서 합니다.

## 외부 application 빌드 — 4가지 빌드 시스템 예

SDK를 source한 상태에서 각 빌드 시스템은 다음 invocation으로 cross 빌드를 합니다.

### Autotools

```bash
$ source /opt/sdk/.../environment-setup
$ cd ~/myapp
$ ./configure \
    --host=aarch64-buildroot-linux-gnu \
    --prefix=/usr \
    --with-sysroot="${SYSROOT}"
$ make -j$(nproc)
$ make DESTDIR=$PWD/install install
```

`--host`가 결정적입니다. `--build`를 같이 지정하면 더 명시적이지만 autotools가 환경에서 추론합니다. `--prefix=/usr`는 *target 보드의 설치 위치*고, `DESTDIR`은 *workstation의 staging 위치*입니다.

### CMake

CMake는 toolchain file을 통해 cross 설정을 받습니다. Buildroot SDK는 `share/buildroot/toolchainfile.cmake`를 둡니다. 위 SDK로 실제로 `cmake -DCMAKE_TOOLCHAIN_FILE=…/share/buildroot/toolchainfile.cmake`를 써서 빌드한 결과도 `ELF 64-bit LSB pie executable, ARM aarch64`였습니다.

```bash
$ source /opt/sdk/.../environment-setup
$ cd ~/myapp
$ mkdir build && cd build
$ cmake \
    -DCMAKE_TOOLCHAIN_FILE="${SDK_PATH}/share/buildroot/toolchainfile.cmake" \
    -DCMAKE_INSTALL_PREFIX=/usr \
    ..
$ cmake --build . -j$(nproc)
$ DESTDIR=$PWD/install cmake --install .
```

toolchain file은 직접 쓰는 것이 아니라 `support/misc/toolchainfile.cmake.in`에서 생성됩니다. 앞서 본 `RELOCATED_HOST_DIR` 계산 뒤 다음 기본값을 둡니다(79~92행).

```cmake
if(NOT DEFINED CMAKE_FIND_ROOT_PATH)
  set(CMAKE_FIND_ROOT_PATH "${RELOCATED_HOST_DIR}/@@STAGING_SUBDIR@@")
endif()
if(NOT DEFINED CMAKE_FIND_ROOT_PATH_MODE_PROGRAM)
  set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
endif()
if(NOT DEFINED CMAKE_FIND_ROOT_PATH_MODE_PACKAGE)
  set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
endif()
```

`FIND_ROOT_PATH_MODE_*` 4개가 중요합니다. PROGRAM은 host에서 찾고(NEVER), LIBRARY/INCLUDE/PACKAGE는 sysroot에서만 찾습니다(ONLY). 모두 `if(NOT DEFINED …)`로 감싸져 있어 프로젝트가 먼저 정하면 그 값이 이깁니다.

### Meson

Meson cross file은 `share/buildroot/`가 아니라 `etc/meson/`에 있습니다. `package/pkg-meson.mk` 266~281행의 `PKG_MESON_INSTALL_CROSS_CONF`가 `TOOLCHAIN_TARGET_FINALIZE_HOOKS`에 등록돼 있어, meson 패키지를 쓰지 않는 설정에서도 `output/host/etc/meson/cross-compilation.conf`(와 플래그를 덧붙일 수 있는 `.in` 템플릿)를 만듭니다. 주석도 "suitable for use with the SDK"라고 적습니다. 이 파일은 절대 경로를 담고 있어 `sdk-relocs` 대상이고, relocate 뒤에는 새 위치를 가리켰습니다.

```text
[binaries]
c = '/tmp/sdkt/aarch64-buildroot-linux-gnu_sdk-buildroot/bin/aarch64-buildroot-linux-gnu-gcc'
cpp = '/bin/false'
ar = '/tmp/sdkt/aarch64-buildroot-linux-gnu_sdk-buildroot/bin/aarch64-buildroot-linux-gnu-gcc-ar'
strip = '/tmp/sdkt/aarch64-buildroot-linux-gnu_sdk-buildroot/bin/aarch64-buildroot-linux-gnu-strip'
...
```

`cpp = '/bin/false'`는 이 설정에 C++ toolchain이 없다는 뜻입니다. 사용은 다음과 같습니다.

```bash
. /opt/sdk/aarch64-buildroot-linux-gnu_sdk-buildroot/environment-setup
meson setup build --cross-file "$SDK_PATH/etc/meson/cross-compilation.conf" --prefix=/usr
meson compile -C build
```

### 직접 Make

custom Makefile만 있는 application은 환경변수만 잘 흘려보내면 됩니다.

```bash
$ source /opt/sdk/.../environment-setup
$ make CC="$CC" CXX="$CXX" CFLAGS="$CFLAGS" LDFLAGS="$LDFLAGS" -j$(nproc)
```

Makefile이 `?=`로 CC를 받는 정직한 구조라면 `source environment-setup` 후 그냥 `make`만 쳐도 됩니다.

| 빌드 시스템 | cross 진입점 | 표준 SDK 파일 |
|---|---|---|
| **autotools** | `./configure --host=...` | environment의 `$CC`·`$CXX` |
| **cmake** | `-DCMAKE_TOOLCHAIN_FILE=...` | `share/buildroot/toolchainfile.cmake` |
| **meson** | `--cross-file ...` | `etc/meson/cross-compilation.conf` |
| **make** | `CC=$CC ...` | environment-setup만 source |

네 가지 모두 *환경을 source한 뒤*가 출발점입니다. SDK의 일관성이 빌드 시스템에 의존하지 않게 만들어 줍니다.

## IDE 통합

application 개발자가 GUI에서 코드를 짜고 싶다면 IDE에 SDK를 연결합니다.

### VS Code

`.vscode/c_cpp_properties.json`에 sysroot와 cross-compiler를 명시합니다.

```json
{
    "configurations": [
        {
            "name": "BuildrootAArch64",
            "includePath": [
                "${workspaceFolder}/**",
                "/opt/sdk/aarch64-buildroot-linux-gnu_sdk-buildroot/aarch64-buildroot-linux-gnu/sysroot/usr/include"
            ],
            "compilerPath": "/opt/sdk/aarch64-buildroot-linux-gnu_sdk-buildroot/bin/aarch64-buildroot-linux-gnu-gcc",
            "compilerArgs": [
                "--sysroot=/opt/sdk/aarch64-buildroot-linux-gnu_sdk-buildroot/aarch64-buildroot-linux-gnu/sysroot"
            ],
            "cStandard": "c17",
            "cppStandard": "c++20",
            "intelliSenseMode": "linux-gcc-arm64"
        }
    ],
    "version": 4
}
```

`.vscode/settings.json`은 빌드 task에서 SDK 환경을 source하도록 wrapper script를 부르는 패턴이 깔끔합니다.

```json
{
    "cmake.configureEnvironment": {
        "SDK_PATH": "/opt/sdk/aarch64-buildroot-linux-gnu_sdk-buildroot"
    },
    "cmake.configureArgs": [
        "-DCMAKE_TOOLCHAIN_FILE=/opt/sdk/aarch64-buildroot-linux-gnu_sdk-buildroot/share/buildroot/toolchainfile.cmake"
    ]
}
```

### CLion

CLion은 *toolchain*과 *CMake profile*을 따로 정의합니다. Settings → Build → Toolchains에서 새 toolchain을 추가하고 다음을 지정합니다.

| 필드 | 값 |
|---|---|
| **Name** | `Buildroot AArch64` |
| **CMake** | system default |
| **Make** | system default |
| **C Compiler** | `/opt/sdk/.../bin/aarch64-buildroot-linux-gnu-gcc` |
| **C++ Compiler** | `/opt/sdk/.../bin/aarch64-buildroot-linux-gnu-g++` |
| **Debugger** | `/opt/sdk/.../bin/aarch64-buildroot-linux-gnu-gdb` (또는 host gdb-multiarch) |

그 다음 Settings → Build → CMake에 profile을 추가하고 *CMake options*에 toolchain file을 지정합니다.

```text
-DCMAKE_TOOLCHAIN_FILE=/opt/sdk/aarch64-buildroot-linux-gnu_sdk-buildroot/share/buildroot/toolchainfile.cmake
```

원격 실행을 위해 Settings → Build → Deployment에 보드의 SSH 정보를 등록하고, Run/Debug Configuration에 *Remote Debug*를 만들면 *target 보드에서 실제 실행·디버그*가 됩니다.

| IDE | toolchain 등록 위치 | sysroot 인지 방식 |
|---|---|---|
| **VS Code** | `c_cpp_properties.json` + CMake extension | `compilerArgs --sysroot` |
| **CLion** | Settings → Toolchains | CMake toolchain file 자동 인식 |
| **Qt Creator** | Kits 추가 | Qt cross + cmake/qmake 자동 |
| **Eclipse CDT** | Cross GCC plugin | 수동 include path 등록 |

## 버전 관리·배포

SDK를 사내에 배포하면 *버전 식별*이 핵심입니다. 같은 보드라도 시스템 팀이 매 sprint마다 SDK를 갱신하므로 application 팀은 *어느 SDK*로 빌드했는지 명확해야 합니다.

권장 패턴은 다음과 같습니다.

파일 이름은 처음부터 `BR2_SDK_PREFIX`로 정할 수 있습니다. 매뉴얼은 이 값을 환경 변수로 덮어쓸 수 있다고 적습니다.

```bash
$ make sdk BR2_SDK_PREFIX=sdk-myproduct-v1.4.2
$ sha256sum output/images/sdk-myproduct-v1.4.2.tar.gz \
    > output/images/sdk-myproduct-v1.4.2.tar.gz.sha256
$ aws s3 cp output/images/sdk-myproduct-v1.4.2.tar.gz \
    s3://company-artifacts/sdk/
```

파일명에 *제품·버전*을 명시하고, *체크섬을 동봉*하며, 사내 artifact repo(S3·Artifactory·Nexus 등)에 올립니다. application 팀은 다음과 같이 받습니다.

```bash
$ wget https://artifacts.example.com/sdk/sdk-myproduct-v1.4.2.tar.gz
$ wget https://artifacts.example.com/sdk/sdk-myproduct-v1.4.2.tar.gz.sha256
$ sha256sum -c sdk-myproduct-v1.4.2.tar.gz.sha256
sdk-myproduct-v1.4.2.tar.gz: OK
$ tar xzf sdk-myproduct-v1.4.2.tar.gz -C /opt/sdk/
$ /opt/sdk/aarch64-buildroot-linux-gnu_sdk-buildroot/relocate-sdk.sh
```

SDK에는 Buildroot revision을 적은 파일이 따로 들어가지 않습니다(위 최상위 목록 참고). 빌드할 때 `git describe` 값을 `BR2_SDK_PREFIX`나 별도 파일로 남겨 두면 *문제 발생 시 정확히 어느 트리·commit*에서 만든 SDK인지 추적 가능합니다. CI에서 SDK 빌드 job을 분리해 매 tagged release마다 자동 발급하는 게 표준 패턴입니다 (자세한 흐름은 [Ch 19: CI/CD](/blog/embedded/buildroot/chapter19-cicd)).

## Yocto SDK와의 차이

Yocto 생태계에도 SDK가 있고 흐름이 비슷해 보이지만 차이가 있습니다.

| 항목 | Buildroot SDK | Yocto SDK (`populate_sdk`) | Yocto eSDK |
|---|---|---|---|
| **생성 명령** | `make sdk` | `bitbake -c populate_sdk <image>` | `bitbake -c populate_sdk_ext <image>` |
| **구성** | host toolchain + target sysroot | host toolchain + target sysroot + *meta-toolchain* | 위 모두 + *devtool* + recipe 추가 |
| **recipe 추가** | 불가 (Buildroot 트리 따로 빌드) | 불가 (다시 populate 필요) | 가능 (`devtool add`) |
| **인스톨러** | tarball + relocate-sdk.sh | self-extracting `.sh` (메뉴 대화형) | self-extracting `.sh` |
| **크기** | 이 장의 QEMU 설정에서 압축 290 MB / 해제 1.1 GB | 측정하지 않음 | 측정하지 않음 |
| **재현성** | Buildroot revision으로 확정 | layer revision·hash 매트릭스 | 위와 동일 |

Yocto의 *eSDK*는 application 개발자가 *자기 환경에서 새 recipe를 추가*할 수 있게 해 줍니다. *시스템 팀에 가지 않고도* 새 라이브러리를 SDK에 끼워 빌드해 보고, 검증되면 시스템 팀에 PR로 올리는 흐름입니다. Buildroot SDK는 *static*이라 이 흐름이 안 됩니다. 새 라이브러리가 필요하면 시스템 팀이 Buildroot 트리에 추가 후 SDK를 *재발급*해야 합니다.

이 차이는 *팀 구조*에서 의미가 있습니다. application 팀이 빈번하게 새 의존성을 요구하는 환경이라면 Yocto eSDK가 마찰을 줄여 줍니다. 의존성이 비교적 안정적이고 시스템 팀이 통제권을 갖는 환경(임베디드·산업 제품 다수)이라면 Buildroot SDK의 단순함이 더 큰 장점입니다.

## 흔한 실수

다음은 SDK 배포에서 반복적으로 나오는 사고들입니다.

**relocate를 안 한 채 쓴다.**
`environment-setup`과 `toolchainfile.cmake`는 자기 위치에서 경로를 계산하지만, `sdk-relocs`에 적힌 465개 텍스트 파일(`.pc`, autotools 스크립트 등)은 원래 경로를 담고 있습니다. 매뉴얼은 압축을 푼 뒤 "the user must run the script `relocate-sdk.sh`"라고 적습니다.

**다른 host architecture에서 사용한다.**
시스템 팀이 x86_64 Linux로 만든 SDK를 ARM Mac 개발자가 받아 풀면 cross compiler 자체가 *실행 안 됩니다*. host architecture별로 SDK를 따로 발급하거나, 사내 표준 host를 *하나로 통일*해야 합니다.

**sysroot의 라이브러리를 *수동으로 수정*한다.**
"이 라이브러리만 살짝 newer 버전으로 바꿔 보자"라고 sysroot 안 `.so`를 손으로 교체하면, 보드의 실제 rootfs는 *예전 버전*이라 빌드와 런타임이 어긋납니다. sysroot는 *읽기 전용 참조 자료*이며, 변경이 필요하면 *시스템 팀이 Buildroot 트리에서* 바꿔 SDK를 재발급해야 합니다.

**pkg-config 변수를 직접 지정한다.**
SDK의 `bin/pkg-config` wrapper는 `PKG_CONFIG_LIBDIR`·`PKG_CONFIG_SYSROOT_DIR`이 *비어 있을 때* sysroot 기본값을 씁니다. 셸 설정에 host용 값을 넣어 두면 wrapper가 그 값을 그대로 써서 host 라이브러리가 섞입니다.

**SDK 버전과 보드 image 버전이 어긋난다.**
v1.4.2 SDK로 application을 빌드해 v1.3.0 보드에 올리면 *glibc·라이브러리 버전 mismatch*가 납니다. SDK 발급 시 *어느 image와 짝*인지 명시하고, CI에서 image와 SDK를 *같은 job에서* 생성하도록 묶는 게 안전합니다.

**relocate 후 다시 옮긴다.**
한 번 `relocate-sdk.sh`로 경로를 박은 SDK를 또 다른 위치로 옮기면 또 깨집니다. relocate는 *멱등*이지만 *현재 경로 기준*으로 다시 돌려야 합니다. 옮긴 후 반드시 한 번 더 실행하는 습관을 들이거나, 사내 표준 경로(`/opt/sdk/...`)를 정해 옮길 일이 없게 합니다.

## 정리

- SDK는 Buildroot가 만든 *frozen toolchain + sysroot*를 하나의 tarball로 묶은 산출물입니다. 시스템 팀과 application 팀을 분리합니다.
- `make sdk`는 `output/host/`를 묶은 `<tuple>_sdk-buildroot.tar.gz`를 만듭니다. 실측 압축 290 MB, 해제 1.1 GB였고, cross compiler는 SDK를 만든 host 아키텍처의 실행 파일입니다.
- `relocate-sdk.sh`는 `sdk-relocs`의 텍스트 파일만 `sed`로 고칩니다. `KERNELDIR`처럼 `output/host` 밖을 가리키는 경로는 바뀌지 않습니다.
- `environment-setup`은 `BR2_PACKAGE_HOST_ENVIRONMENT_SETUP`을 켜야 생기고, `CC`·`CFLAGS`·`CONFIGURE_FLAGS`와 `configure`·`cmake` alias를 줍니다. pkg-config sysroot는 export하지 않고 wrapper가 처리합니다.
- 외부 application은 autotools(`--host=`), cmake(`-DCMAKE_TOOLCHAIN_FILE=`), meson(`--cross-file`), make(환경변수)의 4가지 패턴 중 하나로 cross 빌드합니다.
- VS Code는 `c_cpp_properties.json`, CLion은 Toolchains + CMake profile로 SDK를 인지시킵니다.
- 배포는 *제품·버전 명시 + SHA256 체크섬 + artifact repo*가 표준입니다. SDK의 `version` 파일에 Buildroot revision을 기록합니다.
- Yocto SDK는 메타 정보까지 묶고 eSDK는 recipe 추가가 가능합니다. Buildroot SDK는 *static*이라 의존성 변경 시 시스템 팀의 재발급이 필요합니다.
- 흔한 사고는 relocate 누락, host architecture mismatch, sysroot 수동 수정, SDK·image 버전 어긋남입니다.

## 다음 장 예고

다음 편은 **Ch 18: Security·CVE 추적**. SDK·image를 만든 뒤 *유지보수 기간 내내* 따라붙는 보안 패치와 CVE 모니터링을 다룹니다.


## 관련 항목

- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — SDK는 이 toolchain의 *재배포 패키지*
- [Ch 14: Build cache·ccache·BR2_PER_PACKAGE_DIRECTORIES](/blog/embedded/buildroot/chapter14-build-caching) — SDK는 *frozen toolchain*이므로 캐시 정책의 한 사례
- [Ch 18: Security·CVE 추적](/blog/embedded/buildroot/chapter18-security-cve)
- [Ch 19: CI/CD — 자동 빌드와 SDK 배포 파이프라인](/blog/embedded/buildroot/chapter19-cicd) — SDK 자동 발급·체크섬·artifact repo
- [BSP Development Ch 7: 크로스 컴파일 toolchain](/blog/embedded/bsp/chapter07-tfa-trustzone) — BSP 관점의 toolchain·SDK
- [원문 — Buildroot Manual §8.13: make sdk](https://buildroot.org/downloads/manual/manual.html)
