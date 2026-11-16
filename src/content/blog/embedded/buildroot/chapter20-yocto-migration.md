---
title: "Buildroot → Yocto 마이그레이션 — 언제·어떻게 옮길까"
slug: "embedded/buildroot/chapter20-yocto-migration"
date: 2026-05-19T09:20:00
description: "Buildroot가 한계에 도달하는 신호, Buildroot ↔ Yocto/OE 개념 매핑, .mk → .bb 변환과 점진 이전 순서."
series: "Buildroot Practical"
seriesOrder: 20
tags: [embedded, buildroot, yocto, openembedded, migration]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Yocto로 옮길지의 결정은 *기능*이 아니라 *조직과 제품 라인*이 답을 줍니다."** — board 수, 팀 크기, vendor BSP 방향이 한계의 신호이며 migration은 *한 번에*가 아니라 *점진적으로* 진행하는 것이 합리적입니다.

이 시리즈의 첫 장에서 두 시스템의 *철학적 트레이드오프*를 다뤘습니다. 마지막 장에서는 그 트레이드오프가 *실무에서 어떤 신호로 드러나는지*, 그리고 *옮길 결심이 섰을 때 어떤 순서로 진행하는지*를 정리합니다. 이사에 비유하면, 원룸(Buildroot)에서 짐이 늘어 투룸(Yocto)으로 옮길지 고민하는 시점입니다. 짐의 양보다 *같이 사는 사람 수*가 결정을 더 크게 좌우합니다.

Buildroot 쪽 사실은 **Buildroot 2026.02.3** 소스, Yocto 쪽 사실은 **openembedded-core `scarthgap` 브랜치**(commit `fc431686`, 2026-11-10)의 `meta/` 디렉터리에서 확인했습니다. 이 글은 Yocto 빌드를 직접 돌리지 않았으므로, Yocto의 빌드 시간을 숫자로 적지 않습니다.

## 언제 Buildroot의 한계가 보이는가

다음 다섯 가지 신호가 *동시에* 또는 *순차적으로* 나타나면 이전을 진지하게 검토할 때입니다.

**신호 1 — 보드 수가 3개 이상으로 늘어남**

같은 SoC family의 변형 보드를 동시에 유지하는 순간 Buildroot의 *한 output 디렉터리 한 설정* 원칙이 비용으로 돌아옵니다. 보드마다 `O=` 디렉터리를 따로 두고 toolchain부터 따로 빌드해야 하기 때문입니다. `BR2_EXTERNAL` 하나에 여러 defconfig를 두는 것은 가능하지만(Ch 6), 공통 부분이 defconfig마다 복제됩니다.

**신호 2 — per-package 분기가 폭주함**

특정 보드에서만 패키지의 다른 버전이 필요하거나, 특정 조건에서만 다른 옵션을 쓰는 분기가 늘어나면 `Config.in`과 `.mk`가 `ifeq` 분기로 채워집니다. Ch 6에서 확인했듯 외부 트리에서 본체 패키지를 같은 이름으로 다시 정의하면 `pkg-generic.mk`가 "defined a second time" 오류로 멈추므로, Yocto의 `.bbappend` 같은 덧씌우기 수단이 없습니다.

**신호 3 — vendor BSP가 Yocto-only로 발표됨**

NXP·TI·Xilinx 같은 SoC vendor는 BSP를 `meta-imx`·`meta-ti`·`meta-xilinx` 같은 Yocto 레이어로 배포합니다. Buildroot 본체에도 `freescale_imx8mpevk_defconfig`, `beagleplay_defconfig` 같은 보드 설정이 있지만(2026.02.3의 `configs/`는 308개), vendor가 새 chip의 커널·부트로더 fork를 레이어로만 내면 그 패치를 Buildroot 쪽으로 옮기는 일이 릴리스마다 반복됩니다.

**신호 4 — SDK를 외부 개발자에게 배포해야 함**

application 개발팀과 platform 팀이 분리되고, application 팀이 *별도의 SDK*로 cross-compile해야 한다면 Yocto의 eSDK(`meta/classes-recipe/populate_sdk_ext.bbclass`)가 편합니다. Buildroot의 `make sdk`(Ch 17)는 toolchain과 sysroot를 묶을 뿐, SDK 쪽에서 새 recipe를 추가하는 기능이 없습니다.

**신호 5 — CI 시간이 sstate를 매력적으로 보이게 함**

Ch 14에서 잰 것처럼 Buildroot는 `make clean` 뒤에 ccache가 있어도 모든 패키지를 configure·build 단계부터 다시 돕니다. Yocto는 task 입력의 signature가 같으면 `SSTATE_DIR`(기본값 `${TOPDIR}/sstate-cache`, `meta/conf/bitbake.conf` 844행)의 산출물을 그대로 가져옵니다. PR 빌드가 매번 깨끗한 환경에서 시작하는 CI라면 이 차이가 누적됩니다.

신호 하나만으로는 이전 근거가 약합니다. 신호 3(vendor BSP)처럼 외부에서 강제되는 것인지, 신호 1·5처럼 팀이 감수할 수 있는 비용인지를 나눠 봅니다.

## migration 비용을 가늠하는 단위

이전 견적을 "소형 1주, 대형 3개월" 같은 숫자로 적기는 쉽지만, 그런 숫자에는 출처가 없습니다. 대신 *세어 볼 수 있는 단위*로 비용을 쪼갭니다.

| 단위 | 세는 방법 | 비고 |
|---|---|---|
| 직접 작성한 패키지 | 외부 트리의 `package/*/` 디렉터리 수 | 본체 패키지는 대부분 OE 쪽에 같은 이름의 recipe가 있는지부터 확인 |
| 본체 패키지에 얹은 패치 | `BR2_GLOBAL_PATCH_DIR` 아래 `.patch` 수 | `.bbappend` + `SRC_URI += "file://…"`로 옮길 대상 |
| 보드 | 외부 트리 `configs/*_defconfig` 수 | MACHINE conf 하나씩 |
| post-build·post-image 스크립트 | `BR2_ROOTFS_POST_*_SCRIPT`에 등록된 파일 | image recipe의 `ROOTFS_POSTPROCESS_COMMAND`, wic 등으로 재작성 |
| 패키지 커버리지 차이 | 사용하는 본체 패키지가 OE 레이어에 있는가 | 2026.02.3의 `package/` 디렉터리는 2,941개, oe-core scarthgap `meta/`의 `.bb`는 920개라 meta-openembedded 등 추가 레이어를 같이 봐야 함 |

마지막 줄이 자주 놓치는 비용입니다. oe-core만으로는 Buildroot 본체가 가진 패키지의 일부만 덮기 때문에, 어떤 레이어를 추가로 의존할지 정하는 일이 변환 작업보다 먼저 옵니다.

## 개념 매핑 — Buildroot ↔ Yocto

두 시스템은 같은 문제를 다른 어휘로 풉니다. Yocto 쪽 이름은 oe-core scarthgap에서 확인한 것입니다.

| Buildroot | Yocto/OE | 확인 위치 / 비고 |
|---|---|---|
| `package/<name>/<name>.mk` | `recipes-<group>/<name>/<name>_<ver>.bb` | 패키지 정의 |
| `package/<name>/Config.in`의 하위 옵션 | recipe 안의 `PACKAGECONFIG` | 빌드 옵션 |
| `package/<name>/<name>.hash` | recipe 안의 `SRC_URI[sha256sum]`, `LIC_FILES_CHKSUM` | 소스·라이선스 무결성 |
| `package/<name>/*.patch` | `SRC_URI += "file://<patch>"` | 패치 |
| `configs/<board>_defconfig` | `conf/machine/<board>.conf` + image recipe | 보드 정의와 패키지 선택이 분리됨 |
| `BR2_EXTERNAL` | `meta-<layer>` (`bblayers.conf`) | 외부 트리 |
| `BR2_PACKAGE_<X>=y` | `IMAGE_INSTALL += "x"` | `core-image-minimal.bb`는 `IMAGE_INSTALL = "packagegroup-core-boot ${CORE_IMAGE_EXTRA_INSTALL}"` |
| `BR2_TARGET_GENERIC_HOSTNAME` | `hostname:pn-base-files = "..."` | `base-files_3.0.14.bb` 68행 주석이 이 방법을 안내하고, 기본값은 `${MACHINE}` |
| `system/skeleton/` | `recipes-core/base-files/` | 기본 rootfs 골격 |
| `make sdk` | `bitbake -c populate_sdk <image>` | SDK |
| `output/images/` | `tmp/deploy/images/<machine>/` | 산출물 |
| `make <pkg>-rebuild` | `bitbake -c compile -f <recipe>` | 목적은 비슷하지만 설치 단계 처리는 다름 |
| `dl/` | `downloads/` + `sstate-cache/` | sstate는 Buildroot에 대응물이 없음 |
| `BR2_TOOLCHAIN_EXTERNAL` | `TCMODE` | `bitbake.conf` 393행 `TCMODE ??= "default"`, 문서 문자열은 "Enables an external toolchain (where provided by an additional layer)" |

대응이 명확하지 *않은* 항목이 두 가지 있습니다. 첫째, Buildroot의 `BR2_PER_PACKAGE_DIRECTORIES`(Ch 14)는 패키지별 host/target 디렉터리를 만들지만 *experimental*이고 기본값이 꺼져 있습니다. Yocto는 recipe별 sysroot가 기본입니다. 둘째, Buildroot의 `Config.in`은 *하나의 전역 설정*을 만들지만 Yocto는 recipe별 `DEPENDS`·`RDEPENDS`로 의존성을 *국소화*합니다. 이전할 때 전역 `ifeq` 분기를 recipe별 `PACKAGECONFIG`나 MACHINE 변수로 다시 나눠야 합니다.

## 점진적 이전 — 병행 기간을 두는 방식

가장 안전한 이전은 *한 번에 전환*하지 않는 것입니다. 기존 제품의 firmware는 Buildroot로 유지하고, *새로 시작하는 제품 라인*만 Yocto로 진행합니다. 두 시스템을 병행하는 동안 같은 패키지를 양쪽에서 빌드해 산출물을 비교할 수 있다는 것이 이 방식의 이점입니다.

비교는 Buildroot가 이미 만들어 주는 자료로 시작합니다. Ch 6에서 인용한 매뉴얼 "Migrating from older versions"의 *General approach*는 Buildroot 버전을 올릴 때 `make graph-size`가 만드는 `file-size-stats.csv`를 전후로 비교하라고 권합니다. 같은 방법을 Yocto 이전에도 쓸 수 있습니다. Buildroot 쪽 `file-size-stats.csv`와 Yocto 이미지의 파일 목록을 대조하면 빠진 파일과 새로 생긴 큰 파일이 드러납니다.

이 글의 이전 판은 Buildroot 트리를 Yocto recipe 하나로 감싸는 `meta-buildroot` 레이어를 소개했습니다. OpenEmbedded Layer Index API에서 `name:meta-buildroot`, `name__icontains:buildroot`로 검색하면 빈 목록(`[]`)이 돌아와, 공개된 레이어로 확인할 수 없어 그 절을 삭제했습니다.

## recipe 변환 예 — .mk → .bb

가장 흔한 변환은 *작은 application 패키지*입니다. Buildroot 쪽 정의.

```makefile
################################################################################
#
# myapp
#
################################################################################

MYAPP_VERSION = 1.0
MYAPP_SITE = https://github.com/example/myapp/archive/refs/tags
MYAPP_SOURCE = myapp-$(MYAPP_VERSION).tar.gz
MYAPP_LICENSE = MIT
MYAPP_LICENSE_FILES = LICENSE
MYAPP_DEPENDENCIES = openssl libcurl

define MYAPP_BUILD_CMDS
	$(MAKE) -C $(@D) CC="$(TARGET_CC)" CFLAGS="$(TARGET_CFLAGS)"
endef

define MYAPP_INSTALL_TARGET_CMDS
	$(INSTALL) -D -m 0755 $(@D)/myapp $(TARGET_DIR)/usr/bin/myapp
	$(INSTALL) -D -m 0644 $(@D)/myapp.conf $(TARGET_DIR)/etc/myapp.conf
endef

$(eval $(generic-package))
```

같은 패키지의 OE recipe.

```bitbake
SUMMARY = "MyApp — example application"
LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://LICENSE;md5=<LICENSE 파일의 md5>"

SRC_URI = "https://github.com/example/myapp/archive/refs/tags/myapp-${PV}.tar.gz"
SRC_URI[sha256sum] = "<tarball의 sha256>"

DEPENDS = "openssl curl"

S = "${WORKDIR}/myapp-${PV}"

do_compile() {
    oe_runmake CC="${CC}" CFLAGS="${CFLAGS}"
}

do_install() {
    install -D -m 0755 ${S}/myapp ${D}${bindir}/myapp
    install -D -m 0644 ${S}/myapp.conf ${D}${sysconfdir}/myapp.conf
}
```

차이는 다음과 같습니다. Buildroot는 *make 함수*(`MYAPP_BUILD_CMDS`)로 호출되는 매크로 패턴인 반면, OE는 `do_compile`·`do_install` 같은 *task 함수*로 분해됩니다. Buildroot의 `TARGET_CC`가 OE에서는 `CC`이고, `TARGET_DIR`은 `${D}`, `/usr/bin`은 `${bindir}`로 바뀝니다. `S`는 지정하지 않으면 `bitbake.conf` 410행의 `S = "${WORKDIR}/${BP}"`가 기본값이라, tarball 최상위 디렉터리 이름이 `<pn>-<pv>`와 다를 때만 적습니다.

OE는 설치된 파일을 `${PN}`, `${PN}-dev`, `${PN}-dbg` 같은 여러 패키지로 *자동 분할*합니다(`bitbake.conf` 327행 `PACKAGES`). 분할 규칙은 `FILES:<패키지>` 변수가 정합니다. 기본 `FILES:${PN}`에는 `${bindir}/*`와 함께 `${sysconfdir}`이 이미 들어 있어, `/etc/myapp.conf`는 따로 적지 않아도 main package에 포함됩니다. 이 글의 이전 판은 `FILES:${PN} += "${sysconfdir}/myapp.conf"`가 없으면 파일이 빠진다고 적었는데, oe-core의 기본값과 맞지 않아 지웠습니다. 별도 선언이 필요한 경우는 `/opt`처럼 기본 목록에 없는 경로에 설치할 때입니다.

## defconfig → MACHINE conf

Buildroot의 보드 정의는 한 줄짜리 `configs/<board>_defconfig` 파일에 *모든 옵션*이 들어 있습니다. OE의 동등물은 `meta-<layer>/conf/machine/<machine>.conf` 한 파일에 *MACHINE 특성*만 정의됩니다.

```bitbake
# meta-myproject/conf/machine/mxc8mp.conf
#@TYPE: Machine
#@NAME: NXP i.MX 8M Plus EVK
#@DESCRIPTION: Custom board based on i.MX 8M Plus

require conf/machine/include/imx-base.inc

DEFAULTTUNE ?= "cortexa53-crypto"
require conf/machine/include/arm/armv8a/tune-cortexa53.inc

MACHINE_FEATURES += "pci wifi bluetooth"

KERNEL_DEVICETREE = "freescale/imx8mp-mxc8mp.dtb"
UBOOT_CONFIG ??= "sd"
UBOOT_CONFIG[sd] = "imx8mp_mxc8mp_defconfig,sdcard"

SERIAL_CONSOLES = "115200;ttymxc1"

IMAGE_FSTYPES += "wic.bz2 ext4"
WKS_FILE = "imx8mp-mxc8mp.wks.in"
```

이 한 파일이 Buildroot의 `mxc8mp_defconfig`에 해당합니다. 다만 그 안에 *패키지 선택*은 들어가 *있지 않습니다*. 패키지는 `IMAGE_INSTALL`이라는 *별도 변수*에서 image recipe가 관리합니다. 이 *분리*가 Yocto가 다중 보드를 깨끗하게 다루는 핵심입니다. 같은 image recipe로 `mxc8mp`, `mxc8mp-lite`, `mxc8mp-debug` 같은 변형을 모두 빌드할 수 있습니다.

```bitbake
# meta-myproject/recipes-core/images/myproject-image.bb
SUMMARY = "MyProject base image"
LICENSE = "MIT"

inherit core-image

IMAGE_INSTALL += " \
    myapp \
    openssh \
    curl \
    python3 \
    ${MACHINE_EXTRA_INSTALL} \
"

IMAGE_FEATURES += "ssh-server-openssh"
```

여기에 보드별로만 다른 패키지가 있다면 `MACHINE_EXTRA_INSTALL`을 보드 conf 안에서 다르게 정의하면 됩니다. *분기*가 *recipe 본문*이 아닌 *MACHINE 변수*로 격리됩니다.

## 빌드 시간 비교

이 글의 이전 판에는 "Buildroot 32분 / Yocto 110분" 같은 비교표가 있었지만, 측정 환경과 기록이 없어 삭제했습니다. 이 시리즈가 실제로 잰 것은 Buildroot 쪽뿐입니다. Ch 1에서 `qemu_aarch64_virt_defconfig` 첫 빌드, Ch 14에서 ccache와 per-package directories를 켜고 끈 빌드 시간을 같은 사양의 VM에서 측정했습니다.

Yocto와 비교하려면 같은 호스트에서 같은 패키지 집합으로 다음을 따로 재야 합니다.

| 시나리오 | 재야 할 것 |
|---|---|
| 첫 빌드 (캐시 없음) | `downloads/`·`sstate-cache/`를 비운 상태의 `bitbake <image>` wall time |
| 변경 없는 재빌드 | 같은 명령 재실행 시간 |
| 패키지 1개 수정 | 해당 recipe만 바뀐 뒤 재빌드 시간 |
| CI 새 runner | 공유 `SSTATE_DIR`이 있을 때와 없을 때의 차이 |

구조상 확실한 차이는 하나입니다. Buildroot에는 sstate에 해당하는 *산출물 재사용 계층*이 없습니다. 그래서 output 디렉터리가 없는 새 runner에서는 ccache가 컴파일만 줄여 줄 뿐, 압축 해제·configure·install은 매번 다시 돕니다(Ch 14 실측).

## 운영 비용 비교

빌드 시간 외의 *조직 비용*도 같이 봐야 합니다. 출처가 있는 항목과 팀이 직접 재야 하는 항목을 나눴습니다.

| 항목 | Buildroot | Yocto/OE |
|---|---|---|
| **릴리스 지원 기간** | 매뉴얼 "Release Engineering": LTS(매년 `.02`)는 *다음 LTS의 첫 bugfix 릴리스*까지, 일반 릴리스는 다음 릴리스의 첫 bugfix까지 | Yocto Project 릴리스 페이지의 LTS 일정 확인 |
| **빌드 디버깅** | `make V=1`, `make printvars`로 변수 펼쳐 보기 | `bitbake -e <recipe>`, task 로그(`temp/log.do_*`) |
| **외부 트리 덧씌우기** | 불가 (같은 이름 재정의는 오류) | `.bbappend`, 레이어 우선순위 |
| **SDK 확장** | 불가 (재발급) | eSDK + `devtool` |
| **신규 팀원 학습 기간** | 팀에서 측정 | 팀에서 측정 |

학습 기간을 "1주 vs 1~2개월"처럼 적던 칸은 근거가 없어 측정 항목으로 바꿨습니다. 팀에서 새 사람이 *패키지 하나를 추가해 이미지에 넣기까지* 걸린 시간을 기록해 두면 이전 결정의 근거가 됩니다.

## 옮기지 말아야 할 신호

이전 결정만큼 *이전하지 않는* 결정도 중요합니다. 다음 신호가 보이면 Yocto 도입은 *과한 결정*일 가능성이 높습니다.

- 빌드 시스템 전담 인력이 없습니다.
- 보드가 1개이고 추가 계획이 없습니다.
- 사용하는 본체 패키지 중 OE 레이어에 recipe가 없는 것이 많습니다(위 "비용을 가늠하는 단위" 표의 마지막 줄).
- **vendor BSP가 mainline에 잘 들어가 있어** vendor layer 의존이 약합니다.
- 출시 일정이 임박해 재테스트 기간을 확보할 수 없습니다.
- **OTA·SDK 배포가 불필요**하고 *flash 후 종료*형 firmware입니다.

이 조건이 두세 개 겹치면 Yocto의 *유연함*은 그대로 *비용*입니다. Buildroot에 머무르면서 Ch 14 (caching), Ch 17 (SDK)에서 다룬 기술로 한계를 끌어올리는 편이 더 합리적입니다. 도구는 *문제에 맞는 것*이 답이며 *더 큰 도구*가 답인 경우는 의외로 드뭅니다.

## 시리즈 마무리

20장에 걸쳐 Buildroot의 *철학·구조·실전·운영·한계*를 차례로 다뤘습니다. 회고로 정리합니다.

| 부 | 장 | 다룬 것 |
|---|---|---|
| **I. 기초** | Ch 1 ~ 5 | 철학, 디렉터리, Kconfig, 첫 빌드, 패키지 그래프 |
| **II. 구성 요소** | Ch 6 ~ 10 | BR2_EXTERNAL, 보드 설정·overlay, 파일시스템, 패키지, 실 보드 |
| **III. 커스터마이제이션** | Ch 11 ~ 15 | toolchain, kernel, U-Boot, caching, post-build·post-image |
| **IV. 운영** | Ch 16 ~ 19 | OTA, SDK, security·CVE, CI 통합 |
| **V. 미래** | Ch 20 | Yocto 이전 결정 |

이 시리즈를 졸업한 독자가 다음에 자연스럽게 향할 곳이 있습니다.

- **Yocto/OpenEmbedded 학습** — 가장 직접적인 후속. 시작점은 *Yocto Mega-Manual*과 *OpenEmbedded Reference Manual*입니다.
- **Linux from Scratch (LFS)** — 빌드 시스템에 *의존하지 않고* 같은 시스템을 *손으로* 조립해 보는 경험. Buildroot가 *무엇을 자동화하는지* 가장 깊게 이해할 수 있습니다.
- **BSP Development 시리즈** — 빌드 시스템 *아래*의 BSP 계층. U-Boot, device tree, kernel BSP를 다룹니다.
- **Embedded C++ for Real Systems** — userland 쪽으로 시선을 옮길 때.

마지막으로 한 가지 당부가 있습니다. 빌드 시스템은 *수단*입니다. 제품의 가치는 그 위에 올라가는 *application과 사용자 경험*에서 옵니다. 빌드 시스템에 너무 깊이 빠지지 않고 *충분히 안다*는 선에서 멈출 줄 아는 것도 엔지니어링의 일부입니다. 이 시리즈가 그 선을 찾는 데 도움이 됐기를 바랍니다.

## 정리

- Yocto 이전의 다섯 가지 신호는 *board 수 3+*, *per-package 분기 폭주*, *vendor BSP가 Yocto-only*, *SDK 외부 배포*, *CI에 sstate가 매력적*입니다.
- 이전 비용은 직접 작성한 패키지·본체 패치·보드·후처리 스크립트 수와, 사용하는 패키지의 OE 레이어 커버리지로 셉니다. 2026.02.3 `package/` 2,941개 대 oe-core scarthgap `.bb` 920개라 추가 레이어 선택이 먼저입니다.
- 개념 매핑은 대체로 1:1이지만 *전역 Config.in vs recipe별 DEPENDS*와 *덧씌우기(`.bbappend`) 유무*가 변환의 어려운 지점입니다.
- 점진적 이전은 새 제품 라인만 Yocto로 시작하고, `graph-size`의 `file-size-stats.csv`로 양쪽 이미지를 비교하며 병행합니다.
- recipe 변환의 핵심은 *make 매크로 → task 함수*, *TARGET_CC → CC*, *TARGET_DIR → \${D}*입니다. `/etc` 파일은 기본 `FILES:${PN}`에 이미 포함됩니다.
- defconfig는 MACHINE conf로 *MACHINE 특성*만 옮기고 *패키지 선택*은 image recipe로 분리됩니다.
- Buildroot에는 sstate 같은 산출물 재사용 계층이 없습니다. Yocto와의 시간 비교는 같은 호스트에서 직접 재야 하며, 이 시리즈는 Buildroot 쪽만 측정했습니다.
- 옮기지 *말아야 할 신호*도 분명합니다. 전담 인력 없음·단일 보드·OE 레이어 커버리지 부족이 겹치면 Yocto는 과한 결정입니다.
- 도구는 문제에 맞는 것이 답이며, *더 큰 도구*가 답인 경우는 의외로 드뭅니다.

## 관련 항목

- [Ch 1: Buildroot가 푸는 문제 — Yocto와의 비교](/blog/embedded/buildroot/chapter01-problem) — 이 시리즈의 출발점이자 두 시스템의 철학적 트레이드오프
- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — 두 시스템에서 toolchain 처리 방식의 차이
- [Ch 14: Caching — ccache·per-package directories·dl 공유](/blog/embedded/buildroot/chapter14-build-caching) — Buildroot의 caching과 Yocto sstate의 구조적 차이
- [BSP Development Ch 16: Buildroot/Yocto와 BSP — rootfs 통합](/blog/embedded/bsp/chapter16-rootfs) — BSP 관점에서 빌드 시스템 선택
- [원문 — Yocto Mega-Manual](https://docs.yoctoproject.org/singleindex.html)
- [원문 — OpenEmbedded Reference Manual](https://docs.openembedded.org/docs/ref-manual/index.html)
- [원문 — Buildroot Manual](https://buildroot.org/downloads/manual/manual.html)
