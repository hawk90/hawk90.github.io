---
title: "Buildroot 외부 트리 — BR2_EXTERNAL 구성과 활용"
slug: "embedded/buildroot/chapter06-br2-external"
date: 2026-05-19T09:06:00
description: "회사·팀의 패키지·보드 정의를 Buildroot 본체와 분리하는 BR2_EXTERNAL 메커니즘."
series: "Buildroot Practical"
seriesOrder: 6
tags: [embedded, buildroot, br2-external, layer]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Buildroot 본체에 patch를 쌓지 마라. 내 패키지·보드·defconfig는 별도 트리에 둔다."** — `BR2_EXTERNAL`은 그 분리를 공식 메커니즘으로 만들어 줍니다.

Buildroot를 한두 달 쓰다 보면 반드시 마주치는 문제가 있습니다. 회사 전용 패키지가 늘어나고, 보드 한두 개가 추가되고, 매일 `buildroot/`에 commit이 쌓이기 시작합니다. 그러다 Buildroot LTS 업그레이드 시점이 오면 충돌이 폭발합니다. *내 변경*과 *upstream 변경*이 같은 디렉터리에서 부딪히기 때문입니다.

이 장은 그 문제를 푸는 공식 답인 `BR2_EXTERNAL`을 다룹니다. 한 마디로 *내 트리만 따로 두고, Buildroot는 read-only로 사용하는 방식*입니다. 아파트로 치면 Buildroot 본체는 관리사무소가 고치는 공용 배관이고, 외부 트리는 내 집 안의 가구입니다. 가구를 배관에 용접해 두면 배관 교체 날 둘 다 뜯어야 합니다.

이 장의 출력은 모두 **Buildroot 2026.02.3** 소스에서 스크래치 외부 트리 두 개(`br2-acme`, `br2-project-x`)를 만들어 실제로 돌린 결과입니다. defconfig 적용, `list-defconfigs`, `printvars`는 호스트 make만 쓰므로 macOS의 GNU make 4.4.1로 실행했습니다. 출력의 긴 스크래치 경로는 `<scratch>`로 줄였습니다.

## 어떤 문제를 푸는가

Buildroot를 fork해서 수정하는 흐름은 이렇게 무너집니다.

1. 사내 패키지 `acme-firmware`를 `package/acme-firmware/`에 추가.
2. 보드 `acme-edge`를 `board/acme-edge/`와 `configs/acme_edge_defconfig`에 추가.
3. busybox config 수정, post-build 스크립트 추가, 커널 patch 두어 개 추가.
4. 몇 달 뒤 Buildroot 2026.02.x → 2026.08 업그레이드. `git pull --rebase`가 같은 파일에서 충돌을 냅니다.
5. 패치를 다시 적용하면서 *upstream*과 *내 변경*의 경계가 사라집니다.

`BR2_EXTERNAL`은 이 문제를 다음과 같이 풉니다.

- 내 트리는 *독립된 디렉터리*에 둔다. Buildroot는 `git submodule`이나 별도 clone으로 read-only.
- Buildroot가 build 시점에 *환경 변수* 한 줄로 내 트리를 인식한다.
- 내 트리는 *upstream의 분기가 아니라 add-on*이 된다.

Yocto의 layer 개념과 비슷하다고 보면 됩니다. 차이는 Buildroot의 외부 트리에는 우선순위(`BBFILE_PRIORITY`)나 `.bbappend` 같은 덮어쓰기 장치가 없다는 점입니다. 아래 "같은 패키지 이름이 충돌" 절에서 실제로 확인합니다. 최소 구성은 파일 세 개입니다.

## 외부 트리의 기본 구조

가장 작은 외부 트리는 다음 셋입니다.

```text
br2-acme/
├── external.desc
├── external.mk
├── Config.in
└── package/
    └── acme-firmware/
        ├── Config.in
        ├── acme-firmware.mk
        └── acme-firmware.hash
```

각 파일의 역할:

| 파일 | 역할 |
|------|------|
| `external.desc` | 이 트리가 누구인지 |
| `external.mk` | 패키지의 `.mk`를 include |
| `Config.in` | 패키지의 `Config.in`을 include |

### external.desc

가장 짧은 파일입니다. 트리의 *이름*과 *설명*을 선언합니다.

```text
name: ACME
desc: ACME corporation Buildroot tree
```

`name` 값은 곧 변수 이름의 일부가 됩니다. 매뉴얼 "Keeping customizations outside of Buildroot" 절은 `name`이 필수이고 `[A-Za-z0-9_]` 문자만 쓸 수 있으며, Buildroot가 `BR2_EXTERNAL_$(NAME)_PATH`를 *Kconfig와 Makefile 양쪽에* 정의한다고 적습니다. `desc`는 선택이고 `BR2_EXTERNAL_$(NAME)_DESC`가 됩니다.

### external.mk

내 트리의 모든 패키지 `.mk`를 모아 include하는 진입점입니다.

```make
include $(sort $(wildcard $(BR2_EXTERNAL_ACME_PATH)/package/*/*.mk))
```

`wildcard`로 자동 수집하므로 패키지가 늘어도 `external.mk`는 수정하지 않습니다.

### Config.in

마찬가지로 모든 패키지의 `Config.in`을 모읍니다. Buildroot는 이 파일을 `External options` 메뉴 안에 끼워 넣습니다(실제 생성 파일은 아래 "첫 외부 트리 만들기"에서 봅니다).

```make
menu "ACME packages"
    source "$BR2_EXTERNAL_ACME_PATH/package/acme-firmware/Config.in"
    source "$BR2_EXTERNAL_ACME_PATH/package/acme-sensor/Config.in"
endmenu
```

여러 패키지가 있으면 `source` 줄이 늘어납니다. 자동 수집이 아니라 *명시적으로* 적는 이유는 메뉴 순서·그룹화를 통제하기 위해서입니다.

## 첫 외부 트리 만들기

빈 디렉터리에서 출발하는 절차입니다.

```bash
mkdir -p ~/work/br2-acme/{package,board,configs}
cd ~/work/br2-acme

cat > external.desc <<'EOF'
name: ACME
desc: ACME corporation Buildroot tree
EOF

cat > external.mk <<'EOF'
include $(sort $(wildcard $(BR2_EXTERNAL_ACME_PATH)/package/*/*.mk))
EOF

touch Config.in
```

`Config.in`은 첫 단계에서 비워 둬도 됩니다.

이제 Buildroot에 이 트리를 알려 줍니다.

```text
$ cd ~/work/buildroot
$ make BR2_EXTERNAL=$HOME/work/br2-acme qemu_aarch64_virt_defconfig
```

이 명령은 외부 트리 경로를 output 디렉터리의 `.br2-external.mk`에 기록합니다. 실제로 생긴 파일은 다음과 같습니다.

```text
$ cat out6/.br2-external.mk
#
# Automatically generated file; DO NOT EDIT.
#

BR2_EXTERNAL ?= <scratch>/ext6/br2-acme
export BR2_EXTERNAL_NAMES = 
BR2_EXTERNAL_DIRS = 
BR2_EXTERNAL_MKS = 

BR2_EXTERNAL_NAMES += ACME
BR2_EXTERNAL_DIRS += <scratch>/ext6/br2-acme
BR2_EXTERNAL_MKS += <scratch>/ext6/br2-acme/external.mk
export BR2_EXTERNAL_ACME_PATH = <scratch>/ext6/br2-acme
export BR2_EXTERNAL_ACME_DESC = ACME corporation Buildroot tree
export BR2_EXTERNAL_ACME_VERSION = 
```

`BR2_EXTERNAL ?=`라서 다음 `make`부터는 인자를 다시 줄 필요가 없습니다. 비우려면 빈 값을 넘깁니다(매뉴얼 예시는 `make BR2_EXTERNAL= xconfig`). `_VERSION`은 `support/scripts/br2-external` 111행이 외부 트리에서 `setlocalversion`(git 정보)을 돌려 채우는 값이라, git 저장소가 아닌 스크래치 트리에서는 비었습니다.

같은 단계에서 menuconfig용 파일 `.br2-external.in.menus`도 생깁니다.

```text
#
# Automatically generated file; DO NOT EDIT.
#

menu "External options"

comment "ACME corporation Buildroot tree (in <scratch>/ext6/br2-acme)"
source "<scratch>/ext6/br2-acme/Config.in"

endmenu
```

최상위 `Config.in` 마지막 줄(`source "$BR2_BASE_DIR/.br2-external.in.menus"`)이 이 파일을 읽기 때문에 menuconfig 맨 아래에 *External options*가 붙습니다.

> **메모** 상대 경로로 `BR2_EXTERNAL`을 주면 매뉴얼 표현대로 "relative to the main Buildroot source directory, *not* to the Buildroot output directory"로 해석됩니다. `O=`로 output을 따로 둘 때 헷갈리기 쉬우니 절대 경로를 씁니다.

## 디렉터리 규약

외부 트리는 Buildroot 본체와 *완전히 같은 디렉터리 규약*을 따릅니다. 즉 본체에서 `package/htop/`에 두던 것을 외부 트리에서는 `<external>/package/htop/`에 둡니다.

| 디렉터리 | 본체 위치 | 외부 트리 위치 |
|---------|----------|--------------|
| 패키지 | `buildroot/package/<name>/` | `<external>/package/<name>/` |
| 보드 자산 | `buildroot/board/<vendor>/<board>/` | `<external>/board/<vendor>/<board>/` |
| defconfig | `buildroot/configs/<name>_defconfig` | `<external>/configs/<name>_defconfig` |
| Linux fragment | `buildroot/board/<vendor>/<board>/linux.config` | `<external>/board/<vendor>/<board>/linux.config` |
| post-build | (어디든) | `<external>/board/<vendor>/<board>/post-build.sh` |

defconfig를 외부 트리의 `configs/`에 두면 `make list-defconfigs`에 자동으로 표시됩니다. 제목 줄에는 경로가 아니라 `desc` 값이 나옵니다.

```text
$ make -s O=$PWD/out6 list-defconfigs
Built-in configs:
  ...
  asus_tinker-s_rk3288_defconfig      - Build for asus_tinker-s_rk3288
  ...

External configs in "ACME corporation Buildroot tree":
  acme_edge_defconfig                 - Build for acme_edge
```

본체 defconfig 308개 뒤에 외부 트리의 1개가 붙어, 출력의 `_defconfig` 줄은 309개였습니다. 외부 defconfig도 본체 것과 똑같이 `make acme_edge_defconfig`로 적용합니다.

## 패키지 추가 — acme-firmware 예시

`package/acme-firmware/`에 세 파일을 둡니다.

### package/acme-firmware/Config.in

```make
config BR2_PACKAGE_ACME_FIRMWARE
    bool "acme-firmware"
    help
      ACME proprietary firmware loader.
      https://example.com/acme-firmware
```

### package/acme-firmware/acme-firmware.mk

```make
################################################################################
#
# acme-firmware
#
################################################################################

ACME_FIRMWARE_VERSION = 1.2.3
ACME_FIRMWARE_SITE = $(call github,acme-corp,acme-firmware,v$(ACME_FIRMWARE_VERSION))
ACME_FIRMWARE_LICENSE = Proprietary
ACME_FIRMWARE_LICENSE_FILES = LICENSE
ACME_FIRMWARE_REDISTRIBUTE = NO

ACME_FIRMWARE_DEPENDENCIES = libubox

define ACME_FIRMWARE_BUILD_CMDS
    $(MAKE) CC="$(TARGET_CC)" LD="$(TARGET_LD)" -C $(@D)
endef

define ACME_FIRMWARE_INSTALL_TARGET_CMDS
    $(INSTALL) -D -m 0755 $(@D)/acme-fw $(TARGET_DIR)/usr/bin/acme-fw
endef

$(eval $(generic-package))
```

### package/acme-firmware/acme-firmware.hash

hash 값은 실제 tarball을 받은 뒤 `sha256sum`으로 계산해 넣습니다. 예시 이름의 저장소는 존재하지 않으므로 여기에 값을 적지 않습니다. 형식은 Ch 5의 `libyaml.hash`와 같습니다.

```text
sha256  <tarball의 sha256>  acme-firmware-1.2.3.tar.gz
sha256  <LICENSE의 sha256>  LICENSE
```

마지막으로 외부 트리 최상위의 `Config.in`에 한 줄 추가합니다.

```make
source "$BR2_EXTERNAL_ACME_PATH/package/acme-firmware/Config.in"
```

이제 `make menuconfig`의 `External options` 아래에서 `acme-firmware`를 활성화할 수 있습니다. 앞의 `Config.in` 예처럼 `menu "ACME packages"`로 감쌌다면 그 하위 메뉴 안에 나옵니다.

## 여러 외부 트리 stacking

`BR2_EXTERNAL`은 여러 외부 트리 경로를 공백으로 구분해 받습니다. 회사 공통 트리와 제품 트리를 함께 지정할 수 있습니다.

```text
$ make BR2_EXTERNAL="$HOME/work/br2-acme $HOME/work/br2-project-x" \
    qemu_aarch64_virt_defconfig
```

각 트리의 `external.desc`에 적힌 `name`이 변수 이름이 됩니다. 두 트리를 넘겼을 때 `.br2-external.mk`에는 트리마다 `NAMES`·`DIRS`·`MKS`·`_PATH`·`_DESC`·`_VERSION` 묶음이 넘긴 순서대로 기록됐습니다. 그중 이름과 경로 줄만 추리면 다음과 같습니다.

```text
BR2_EXTERNAL_NAMES += ACME
export BR2_EXTERNAL_ACME_PATH = <scratch>/ext6/br2-acme
BR2_EXTERNAL_NAMES += PROJECT_X
export BR2_EXTERNAL_PROJECT_X_PATH = <scratch>/ext6/br2-project-x
```

트리가 둘 이상이면 `.br2-external.in.menus`가 트리마다 하위 메뉴를 만듭니다. 메뉴 제목은 `desc`입니다.

```text
#
# Automatically generated file; DO NOT EDIT.
#

menu "External options"

menu "ACME corporation Buildroot tree"
comment "ACME corporation Buildroot tree (in <scratch>/ext6/br2-acme)"
source "<scratch>/ext6/br2-acme/Config.in"
endmenu # ACME

menu "Product X tree"
comment "Product X tree (in <scratch>/ext6/br2-project-x)"
source "<scratch>/ext6/br2-project-x/Config.in"
endmenu # PROJECT_X

endmenu
```

`br2-project-x/Config.in`은 빈 파일(`touch`)이었지만 오류 없이 적용됐습니다. 회사 공통은 `br2-acme/`에, 제품별 차이는 `br2-project-x/`에 두는 2단 구성이 이 메커니즘에 그대로 맞습니다.

세 층의 관계를 그림으로 보면 다음과 같습니다.

![Buildroot 본체 + 회사 트리 + 제품 트리 3단 레이어](/images/blog/buildroot/diagrams/chapter06-br2-external-layers.svg)

## defconfig를 외부 트리로 옮기기

기존 defconfig를 외부 트리로 옮길 때 자주 빠지는 함정은 *path가 외부 트리 안에 있어야 한다*는 점입니다.

```text
$ cp buildroot/configs/myboard_defconfig br2-acme/configs/acme_edge_defconfig
$ git rm buildroot/configs/myboard_defconfig
```

이전에 `BR2_ROOTFS_OVERLAY="board/myboard/rootfs-overlay"` 같이 *상대 경로*로 적혀 있던 항목은 `$(BR2_EXTERNAL_ACME_PATH)/board/...`로 바꿔야 합니다.

```text
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/rootfs-overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_ACME_PATH)/board/acme/edge/post-build.sh"
```

defconfig 안에서도 이 변수가 펼쳐집니다. `acme_edge_defconfig`에 위 `BR2_ROOTFS_OVERLAY` 줄을 넣고 적용한 뒤 make가 본 값은 다음과 같습니다.

```text
$ make -s printvars VARS=BR2_ROOTFS_OVERLAY QUOTED_VARS=YES
BR2_ROOTFS_OVERLAY='"<scratch>/ext6/br2-acme/board/acme/edge/rootfs-overlay"'
```

그래서 외부 트리의 절대 경로를 하드코딩하지 말고 `$(BR2_EXTERNAL_<NAME>_PATH)`를 씁니다. 같은 defconfig를 다른 사람의 다른 경로 체크아웃에서 그대로 쓸 수 있습니다.

## 검증 흐름

외부 트리가 제대로 인식됐는지 확인합니다.

```text
$ make -s printvars VARS='BR2_EXTERNAL BR2_EXTERNAL_ACME_PATH BR2_EXTERNAL_NAMES ACME_FIRMWARE_SITE ACME_FIRMWARE_SOURCE' QUOTED_VARS=YES
ACME_FIRMWARE_SITE='https://github.com/acme-corp/acme-firmware/archive/v1.2.3'
ACME_FIRMWARE_SOURCE='acme-firmware-1.2.3.tar.gz'
BR2_EXTERNAL='<scratch>/ext6/br2-acme'
BR2_EXTERNAL_ACME_PATH='<scratch>/ext6/br2-acme'
BR2_EXTERNAL_NAMES='ACME'
```

`ACME_FIRMWARE_*`가 펼쳐졌다면 `external.mk`의 `include`가 패키지 `.mk`를 읽은 것입니다.

빌드를 돌려 패키지가 잡히는지 확인합니다.

```bash
make acme-firmware-source
make acme-firmware
make acme-firmware-show-info
```

순서대로 *tarball 다운로드만*, *build + install*, *메타데이터 확인*입니다.

## Troubleshooting

### "External options" 메뉴는 보이는데 패키지가 없다

`.br2-external.in.menus`는 외부 트리마다 `comment` 줄을 넣으므로, 외부 트리의 `Config.in`이 비어 있어도 메뉴는 생깁니다(위 `br2-project-x` 사례). 메뉴 안에 패키지가 없다면 외부 트리 최상위 `Config.in`이 패키지 `Config.in`을 `source`하지 않은 것입니다. 메뉴 자체가 없다면 `BR2_EXTERNAL`이 output 디렉터리에 기록되지 않은 것이니 `.br2-external.mk`부터 확인합니다.

### `make` 결과 패키지가 안 잡힌다

`external.mk`가 패키지 `.mk`를 include하지 못한 경우입니다. 패스를 확인합니다.

```text
$ make -s printvars VARS=ACME_FIRMWARE_VERSION
ACME_FIRMWARE_VERSION=1.2.3
```

빈 출력이 나오면 `external.mk`의 `wildcard` 경로가 틀렸거나 `.mk` 파일명이 잘못된 경우입니다. infra는 `.mk`가 들어 있는 *디렉터리 이름*을 패키지 이름으로 쓰므로(`package/pkg-utils.mk` 46행의 `pkgname`), 디렉터리 `acme-firmware/`와 파일 `acme-firmware.mk`, 변수 prefix `ACME_FIRMWARE_`가 서로 맞아야 합니다.

### 두 외부 트리에서 같은 패키지 이름이 충돌

`br2-project-x/package/acme-firmware/`에 버전만 2.0.0으로 바꾼 같은 이름의 패키지를 두고 두 트리를 함께 넘겼습니다. 뒤 트리가 덮어쓰는 일은 없었고, `printvars`처럼 패키지 `.mk`를 읽는 make 호출이 파싱 단계에서 멈췄습니다. `BR2_PACKAGE_ACME_FIRMWARE`를 켜기 전에도, 켠 뒤에도 같은 오류였습니다. 줄 번호 23은 두 번째 `.mk`의 `$(eval $(generic-package))` 줄입니다.

```text
<scratch>/ext6/br2-project-x/package/acme-firmware/acme-firmware.mk:23: *** Package 'acme-firmware' defined a second time in '<scratch>/ext6/br2-project-x/package/acme-firmware'; previous definition was in '<scratch>/ext6/br2-acme/package/acme-firmware'.  Stop.
```

이 검사는 `package/pkg-generic.mk` 464~468행에 있고, 주석이 의도를 그대로 밝힙니다.

```makefile
# Ensure the package is only declared once, i.e. do not accept that a
# package be re-defined by a br2-external tree
ifneq ($(call strip,$(filter $(1),$(PACKAGES_ALL))),)
$$(error Package '$(1)' defined a second time in '$(pkgdir)'; \
```

본체에 있는 패키지를 외부 트리에서 같은 이름으로 다시 정의해도 같은 검사에 걸립니다. 본체 패키지의 동작을 바꾸고 싶다면 이름을 바꾼 새 패키지를 만들거나, Ch 7의 overlay·post-build 또는 `BR2_GLOBAL_PATCH_DIR` 패치로 처리합니다. 외부 트리 이름을 패키지 이름 앞에 붙이는 관례(`acme-firmware`, `projx-agent`)가 이 충돌을 미리 막습니다.

### Buildroot 본체를 올릴 때

외부 트리는 본체의 infra 변수에 의존합니다. 본체가 바뀌면 외부 패키지를 고쳐야 하는 경우가 실제로 있었고, 매뉴얼 "Migrating from older versions"가 릴리스별로 적어 둡니다. 예를 들면 다음과 같습니다.

- **2017.08** — host 패키지 설치 위치가 `$(HOST_DIR)/usr`에서 `$(HOST_DIR)`로 바뀌었고, `$(HOST_DIR)/usr/lib`을 가리키는 RPATH는 더 이상 허용되지 않습니다.
- **2025.11** — golang 패키지의 `FOO_INSTALL_BINS`가 없어지고 `FOO_BUILD_TARGETS`에서 자동으로 정해집니다.
- **2026.02** — network-manager가 gnutls를 자동으로 `select`하지 않습니다.

같은 절의 "General approach"는 업그레이드 전후로 `make graph-size`의 `file-size-stats.csv`를 비교하고, Legacy 메뉴에 켜진 항목을 정리하라고 권합니다. 외부 트리 README에 검증한 Buildroot 태그를 적어 두면 이 비교의 기준점이 생깁니다.

## 정리

- `BR2_EXTERNAL`은 Buildroot 본체를 fork하지 않고 *내 패키지·보드·defconfig*만 분리하는 공식 메커니즘입니다.
- 최소 구성은 `external.desc`, `external.mk`, `Config.in` 셋입니다.
- 외부 트리의 디렉터리 구조는 본체와 동일합니다. `package/`, `board/`, `configs/`를 같은 규약으로 사용합니다.
- `make BR2_EXTERNAL=...`은 외부 트리 경로를 `output/.br2-external.mk`에 기록합니다.
- `.br2-external.mk`에 `BR2_EXTERNAL ?=`로 기록되므로 다음 `make`부터는 인자를 생략합니다.
- 공백으로 여러 트리를 지정할 수 있고, 트리마다 `desc` 이름의 하위 메뉴가 생깁니다.
- 같은 패키지 이름을 두 번 정의하면 `pkg-generic.mk`가 "defined a second time" 오류로 멈춥니다. 덮어쓰기는 지원하지 않습니다.
- defconfig·overlay 경로는 항상 `$(BR2_EXTERNAL_<NAME>_PATH)`로 표기합니다. 절대 경로 하드코딩은 금지입니다.

## 다음 장 예고

다음 편은 **Ch 7: 보드 customize — overlay, post-build, post-image**.


## 관련 항목

- [Ch 5: 패키지 시스템 — .mk와 Config.in](/blog/embedded/buildroot/chapter05-package-system)
- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
- [Ch 9: 새 패키지 작성 — autotools, cmake, python](/blog/embedded/buildroot/chapter09-new-package)
- [원문 — Buildroot Manual: Keeping customizations outside of Buildroot](https://buildroot.org/downloads/manual/manual.html#outside-br-custom)
