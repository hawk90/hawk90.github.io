---
title: "Ch 6: 외부 트리 — BR2_EXTERNAL"
date: 2026-05-19T06:00:00
description: "회사·팀의 패키지·보드 정의를 Buildroot 본체와 분리하는 BR2_EXTERNAL 메커니즘."
series: "Buildroot Practical"
seriesOrder: 6
tags: [embedded, buildroot, br2-external, layer]
draft: false
---

## 한 줄 요약

> **"Buildroot 본체에 patch를 쌓지 마라. 내 패키지·보드·defconfig는 별도 트리에 둔다."** — `BR2_EXTERNAL`은 그 분리를 공식 메커니즘으로 만들어 줍니다.

Buildroot를 한두 달 쓰다 보면 반드시 마주치는 문제가 있습니다. 회사 전용 패키지가 늘어나고, 보드 한두 개가 추가되고, 매일 `buildroot/`에 commit이 쌓이기 시작합니다. 그러다 Buildroot LTS 업그레이드 시점이 오면 충돌이 폭발합니다. *내 변경*과 *upstream 변경*이 같은 디렉터리에서 부딪히기 때문입니다.

이 장은 그 문제를 푸는 공식 답인 `BR2_EXTERNAL`을 다룹니다. 한 마디로 *내 트리만 따로 두고, Buildroot는 read-only로 사용하는 방식*입니다.

## 어떤 문제를 푸는가

Buildroot를 fork해서 수정하는 흐름은 이렇게 무너집니다.

1. 사내 패키지 `acme-firmware`를 `package/acme-firmware/`에 추가.
2. 보드 `acme-edge`를 `board/acme-edge/`와 `configs/acme_edge_defconfig`에 추가.
3. busybox config 수정, post-build 스크립트 추가, 커널 patch 두어 개 추가.
4. 6개월 뒤 Buildroot LTS 2026.02 → 2026.08 업그레이드. `git pull --rebase`가 동일 파일에 충돌을 일으킴.
5. 패치를 다시 적용하면서 *upstream*과 *내 변경*의 경계가 사라짐.

`BR2_EXTERNAL`은 이 문제를 다음과 같이 풉니다.

- 내 트리는 *독립된 디렉터리*에 둔다. Buildroot는 `git submodule`이나 별도 clone으로 read-only.
- Buildroot가 build 시점에 *환경 변수* 한 줄로 내 트리를 인식한다.
- 내 트리는 *upstream의 분기가 아니라 add-on*이 된다.

Yocto의 layer 개념과 비슷하다고 보면 됩니다. 차이는 Buildroot의 외부 트리가 훨씬 가볍다는 점입니다. 디렉터리 몇 개와 파일 세 개면 끝납니다.

## 외부 트리의 기본 구조

가장 작은 외부 트리는 다음 셋입니다.

```text
br2-acme/
├── external.desc            # 이 트리가 누구인지
├── external.mk              # 패키지의 .mk를 include
├── Config.in                # 패키지의 Config.in을 include
└── package/
    └── acme-firmware/
        ├── Config.in
        ├── acme-firmware.mk
        └── acme-firmware.hash
```

### external.desc

가장 짧은 파일입니다. 트리의 *이름*과 *설명*을 선언합니다.

```text
name: ACME
desc: ACME corporation Buildroot tree
```

`name` 값은 곧 Kconfig 변수 prefix가 됩니다. 위 예시면 `BR2_EXTERNAL_ACME_PATH`가 자동으로 정의되고, `.mk`에서 `$(BR2_EXTERNAL_ACME_PATH)`로 내 트리의 절대 경로를 참조할 수 있습니다.

### external.mk

내 트리의 모든 패키지 `.mk`를 모아 include하는 진입점입니다.

```make
include $(sort $(wildcard $(BR2_EXTERNAL_ACME_PATH)/package/*/*.mk))
```

`wildcard`로 자동 수집하므로 패키지가 늘어도 `external.mk`는 수정하지 않습니다.

### Config.in

마찬가지로 모든 패키지의 `Config.in`을 모읍니다. Buildroot menuconfig의 *최상위*에 `External options` 메뉴가 생기고, 그 안에 내 트리의 옵션이 노출됩니다.

```make
menu "ACME packages"
    source "$BR2_EXTERNAL_ACME_PATH/package/acme-firmware/Config.in"
    source "$BR2_EXTERNAL_ACME_PATH/package/acme-sensor/Config.in"
endmenu
```

여러 패키지가 있으면 `source` 줄이 늘어납니다. 자동 수집이 아니라 *명시적으로* 적는 이유는 메뉴 순서·그룹화를 통제하기 위해서입니다.

## 첫 외부 트리 만들기

빈 디렉터리에서 출발하는 절차입니다.

```text
$ mkdir -p ~/work/br2-acme/{package,board,configs}
$ cd ~/work/br2-acme

$ cat > external.desc <<'EOF'
name: ACME
desc: ACME corporation Buildroot tree
EOF

$ cat > external.mk <<'EOF'
include $(sort $(wildcard $(BR2_EXTERNAL_ACME_PATH)/package/*/*.mk))
EOF

$ touch Config.in   # 첫 단계에서는 비워 둬도 됩니다
```

이제 Buildroot에 이 트리를 알려 줍니다.

```text
$ cd ~/work/buildroot
$ make BR2_EXTERNAL=~/work/br2-acme qemu_aarch64_virt_defconfig
```

이 명령은 *영구적으로* 외부 트리 경로를 `output/.br-external.mk`에 기록합니다. 다음부터는 `make`만 쳐도 외부 트리를 인식합니다. 즉 *한 번만* `BR2_EXTERNAL=...`을 명시하면 됩니다.

```text
$ make menuconfig
# 최상위 메뉴 마지막에 "External options" 항목이 표시됩니다.
```

## 디렉터리 규약

외부 트리는 Buildroot 본체와 *완전히 같은 디렉터리 규약*을 따릅니다. 즉 본체에서 `package/htop/`에 두던 것을 외부 트리에서는 `<external>/package/htop/`에 둡니다.

| 디렉터리 | 본체 위치 | 외부 트리 위치 |
|---------|----------|--------------|
| 패키지 | `buildroot/package/<name>/` | `<external>/package/<name>/` |
| 보드 자산 | `buildroot/board/<vendor>/<board>/` | `<external>/board/<vendor>/<board>/` |
| defconfig | `buildroot/configs/<name>_defconfig` | `<external>/configs/<name>_defconfig` |
| Linux fragment | `buildroot/board/<vendor>/<board>/linux.config` | `<external>/board/<vendor>/<board>/linux.config` |
| post-build | (어디든) | `<external>/board/<vendor>/<board>/post-build.sh` |

defconfig를 외부 트리에 두면 `make list-defconfigs`에 자동으로 표시됩니다.

```text
$ make list-defconfigs
...
Built-in configs:
  qemu_aarch64_virt_defconfig - Build for qemu_aarch64_virt

External configs in $(BR2_EXTERNAL_ACME_PATH)/configs:
  acme_edge_defconfig
  acme_gateway_defconfig
```

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

```text
sha256  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  acme-firmware-1.2.3.tar.gz
sha256  abcd...  LICENSE
```

마지막으로 외부 트리 최상위의 `Config.in`에 한 줄 추가합니다.

```make
source "$BR2_EXTERNAL_ACME_PATH/package/acme-firmware/Config.in"
```

이제 `make menuconfig`에서 `External options → ACME packages → acme-firmware`로 활성화할 수 있습니다.

## 여러 외부 트리 stacking

`BR2_EXTERNAL`은 *콜론으로 구분된 여러 경로*를 받습니다. 회사 트리 위에 프로젝트 트리를 얹는 흐름이 흔합니다.

```text
$ make BR2_EXTERNAL=~/work/br2-acme:~/work/br2-project-x \
    qemu_aarch64_virt_defconfig
```

각 트리의 `external.desc`에 적힌 `name`이 prefix가 됩니다. 위 예시면 `BR2_EXTERNAL_ACME_PATH`와 `BR2_EXTERNAL_PROJECT_X_PATH`가 동시에 정의됩니다. 후자가 전자의 패키지를 *override*할 수도 있는데, 우선순위는 `BR2_EXTERNAL` 인자의 순서를 따릅니다. 뒤에 오는 트리가 이깁니다.

회사 공통은 `br2-acme/`에, 제품별 차이는 `br2-product-x/`에 두는 식의 *2단 레이어*가 실무에서 가장 흔한 구성입니다.

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

defconfig 안에서도 Buildroot의 변수 expansion이 동작합니다. 따라서 외부 트리의 절대 경로를 하드코딩하지 말고 항상 `$(BR2_EXTERNAL_<NAME>_PATH)`를 사용합니다.

## 검증 흐름

외부 트리가 제대로 인식됐는지 확인합니다.

```text
$ cd ~/work/buildroot
$ cat output/.br-external.mk
# 첫 줄에 BR2_EXTERNAL = /home/user/work/br2-acme

$ make show-info | grep -i external
BR2_EXTERNAL_ACME_PATH=/home/user/work/br2-acme

$ make printvars VARS=BR2_EXTERNAL_ACME_PATH
BR2_EXTERNAL_ACME_PATH=/home/user/work/br2-acme
```

빌드를 돌려 패키지가 잡히는지 확인합니다.

```text
$ make acme-firmware-source         # tarball 다운로드만
$ make acme-firmware                # build + install
$ make acme-firmware-show-info      # 메타데이터 확인
```

## Troubleshooting

### `make` 후 "External options" 메뉴가 안 보인다

원인은 거의 항상 두 가지입니다. `external.desc`의 `name`이 비어 있거나, 최상위 `Config.in`이 비어 있는 채로 패키지 `Config.in`을 source하지 않은 경우. menuconfig는 *최상위 Config.in이 비어 있으면* 메뉴 자체를 표시하지 않습니다.

### `make` 결과 패키지가 안 잡힌다

`external.mk`가 패키지 `.mk`를 include하지 못한 경우입니다. 패스를 확인합니다.

```text
$ make printvars VARS=ACME_FIRMWARE_VERSION
ACME_FIRMWARE_VERSION=1.2.3
```

빈 출력이 나오면 `external.mk`의 `wildcard` 경로가 틀렸거나, 패키지 `.mk` 파일명이 잘못된 경우입니다. 디렉터리명과 `.mk` 파일명이 *완전히 일치*해야 합니다.

### 두 외부 트리에서 같은 패키지 이름이 충돌

Kconfig 옵션 이름(`BR2_PACKAGE_ACME_FIRMWARE`)이 같으면 두 번째 정의가 무시됩니다. 외부 트리 이름을 패키지에 포함시키는 관례(`acme-firmware`, `proj-x-firmware`)로 회피합니다.

### Buildroot 본체와 외부 트리의 LTS 호환

외부 트리는 *Buildroot 본체에 종속*됩니다. 같은 Buildroot 본체에서 검증한 외부 트리를 다른 LTS로 옮기면 API 변경(예: `host-` prefix 정책, `pkg-config` 변경)으로 깨질 수 있습니다. 외부 트리 README에 *호환 Buildroot 버전*을 적어 두는 게 안전합니다.

## 정리

- `BR2_EXTERNAL`은 Buildroot 본체를 fork하지 않고 *내 패키지·보드·defconfig*만 분리하는 공식 메커니즘입니다.
- 최소 구성은 `external.desc`, `external.mk`, `Config.in` 셋입니다.
- 외부 트리의 디렉터리 구조는 본체와 동일합니다. `package/`, `board/`, `configs/`를 같은 규약으로 사용합니다.
- `make BR2_EXTERNAL=...`은 한 번만 명시하면 `output/.br-external.mk`에 기록됩니다.
- 콜론으로 여러 트리를 stacking할 수 있습니다. 뒤에 오는 트리가 우선순위에서 이깁니다.
- defconfig·overlay 경로는 항상 `$(BR2_EXTERNAL_<NAME>_PATH)`로 표기합니다. 절대 경로 하드코딩은 금지입니다.

다음 편은 **Ch 7: 보드 customize — overlay, post-build, post-image**.

## 관련 항목

- [Ch 5: 패키지 시스템 — .mk와 Config.in](/blog/embedded/buildroot/chapter05-package-system)
- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
- [Ch 9: 새 패키지 작성 — autotools, cmake, python](/blog/embedded/buildroot/chapter09-new-package)
- [원문 — Buildroot Manual: Keeping customizations outside of Buildroot](https://buildroot.org/downloads/manual/manual.html#outside-br-custom)
