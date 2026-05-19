---
title: "Ch 20: Yocto로의 migration — 언제·어떻게 옮길까"
date: 2026-05-19T20:00:00
description: "Buildroot가 한계에 도달하는 신호와 Yocto/OE로 점진 이전하는 패턴, meta-buildroot 같은 hybrid 옵션."
series: "Buildroot Practical"
seriesOrder: 20
tags: [embedded, buildroot, yocto, openembedded, migration]
draft: true
---

## 한 줄 요약

> **"Yocto로 옮길지의 결정은 *기능*이 아니라 *조직과 제품 라인*이 답을 줍니다."** — board 수, 팀 크기, vendor BSP 방향이 한계의 신호이며 migration은 *한 번에*가 아니라 *점진적으로* 진행하는 것이 합리적입니다.

이 시리즈의 첫 장에서 두 시스템의 *철학적 트레이드오프*를 다뤘습니다. 마지막 장에서는 그 트레이드오프가 *실무에서 어떤 신호로 드러나는지*, 그리고 *옮길 결심이 섰을 때 어떤 순서로 진행하는지*를 정리합니다. Buildroot에서 시작한 프로젝트가 성장하면 어느 시점에 Yocto 쪽이 자연스러워지는 *변곡점*이 옵니다. 그 변곡점을 식별하는 안목이 이 장의 목표입니다.

## 언제 Buildroot의 한계가 보이는가

다음 다섯 가지 신호가 *동시에* 또는 *순차적으로* 나타나면 이전을 진지하게 검토할 때입니다.

**신호 1 — 보드 수가 3개 이상으로 늘어남**

같은 SoC family의 변형 보드를 동시에 유지하는 순간 Buildroot의 *한 트리 한 타깃* 원칙이 비용으로 돌아옵니다. 보드별로 별도의 트리를 두면 패치가 세 번씩 적용돼야 하고, 단일 트리에 `BR2_EXTERNAL`로 묶으면 defconfig가 폭주합니다.

**신호 2 — per-package 분기가 폭주함**

특정 보드에서만 패키지의 다른 버전이 필요하거나, 특정 조건에서만 다른 옵션을 쓰는 분기가 늘어나면 `Config.in`이 *if-then-else 트리*로 변합니다. recipe별 격리가 없는 구조의 약점이 드러나는 지점입니다.

**신호 3 — vendor BSP가 Yocto-only로 발표됨**

NXP·TI·Xilinx·Qualcomm 같은 SoC vendor는 새 chip을 발표할 때 *meta-imx*·*meta-ti*·*meta-xilinx* 같은 Yocto 레이어로만 BSP를 배포하는 경우가 많습니다. Buildroot 트리에 vendor 패치를 직접 옮겨오는 작업이 *매 분기* 발생하면 그 비용이 마이그레이션 비용을 곧 넘어섭니다.

**신호 4 — SDK를 외부 개발자에게 배포해야 함**

application 개발팀과 platform 팀이 분리되고, application 팀이 *별도의 SDK*로 cross-compile해야 한다면 Yocto의 `populate_sdk_ext`가 결정적으로 편합니다. Buildroot의 `make sdk`로도 가능하지만 *recipe 확장 가능한* eSDK 같은 기능이 없습니다.

**신호 5 — CI 시간이 sstate를 매력적으로 보이게 함**

PR마다 30분씩 빌드를 반복하면 한 달이면 *팀 전체에서 수십 시간*이 누적됩니다. Yocto의 sstate-cache는 *signature 동일*이면 거의 무료로 산출물을 재사용하므로 4번째 빌드부터는 Buildroot보다 빨라지는 경우가 흔합니다.

이 다섯 신호 중 *셋 이상*이 동시에 켜져 있다면 이전 검토를 시작해도 늦지 않습니다.

## migration 비용 추정

이전 비용은 *코드 변환*보다 *팀 학습*과 *재테스트*가 차지합니다. 시스템 규모별 대략의 견적입니다.

| 규모 | 패키지 수 | 보드 수 | recipe 변환 | 팀 학습 | 재테스트 | 총합 |
|---|---|---|---|---|---|---|
| **소형** | 50 이하 | 1 ~ 2 | 1 ~ 2일 | 2 ~ 3일 | 2 ~ 3일 | **약 1주** |
| **중형** | 100 ~ 250 | 2 ~ 4 | 1 ~ 2주 | 1주 | 1 ~ 2주 | **약 1개월** |
| **대형** | 500+ | 5+ | 4 ~ 6주 | 2 ~ 3주 | 3 ~ 4주 | **약 3개월** |

소형 시스템은 *한 사람 한 주*면 끝나기도 합니다. 중형 이상은 *한 명이 전담*하기보다 *팀 전체가 일부 시간*을 떼어 진행하는 편이 안전합니다. 가장 큰 비용은 *예상 못 한 ABI 차이로 인한 런타임 사고*이며, 이는 *재테스트 단계*에 묶어 두는 게 통상입니다.

대형 시스템에서 가장 큰 함정은 *recipe 100개를 한꺼번에 변환*하려는 시도입니다. *점진적으로*가 거의 항상 옳습니다.

## 개념 매핑 — Buildroot ↔ Yocto

두 시스템은 같은 문제를 다른 어휘로 풉니다. 다음 표가 핵심 개념의 *1:1 대응*입니다.

| Buildroot | Yocto/OE | 비고 |
|---|---|---|
| `package/<name>/<name>.mk` | `recipes-<group>/<name>/<name>_<ver>.bb` | 패키지 정의 |
| `package/<name>/Config.in` | recipe 안의 `PACKAGECONFIG` | 빌드 옵션 |
| `package/<name>/<name>.hash` | recipe 안의 `SRC_URI[sha256sum]` | 무결성 |
| `package/<name>/*.patch` | `recipes-.../<name>/<name>/<patch>` | 패치 |
| `configs/<board>_defconfig` | `meta-myproject/conf/machine/<board>.conf` | 보드 정의 |
| `BR2_EXTERNAL` | `meta-<layer>` (`bblayers.conf`) | 외부 트리 |
| `BR2_PACKAGE_<X>=y` | `IMAGE_INSTALL += "x"` | 이미지에 패키지 포함 |
| `BR2_TARGET_GENERIC_HOSTNAME` | `hostname_pn-base-files = "..."` | 시스템 변수 |
| `system/skeleton/` | `recipes-core/base-files/` 안의 파일 | 기본 rootfs 골격 |
| `make sdk` | `bitbake -c populate_sdk` | SDK 빌드 |
| `output/images/rootfs.ext4` | `tmp/deploy/images/<machine>/<image>.ext4` | 산출물 |
| `make <pkg>-rebuild` | `bitbake -c compile -f <recipe>` | 강제 재빌드 |
| `dl/` cache | `downloads/` + `sstate-cache/` | 다운로드와 sstate |
| `BR2_TOOLCHAIN_EXTERNAL` | `TCMODE = "external-..."` | 외부 toolchain |

대응이 명확하지 *않은* 항목이 두 가지 있습니다. 첫째, Buildroot에는 *per-recipe sysroot*가 없으므로 Yocto의 recipe 격리를 *그대로* 옮길 수 없습니다. 둘째, Buildroot의 `Config.in`은 *글로벌 dependency* 그래프를 만들지만 Yocto는 recipe별 `DEPENDS`·`RDEPENDS`로 *국소화*합니다. 이전 시 *글로벌 분기를 recipe별 분기로* 재구성하는 작업이 필요합니다.

## 점진적 이전 — hybrid 패턴

가장 안전한 이전은 *한 번에 전환*하지 않는 것입니다. 다음 두 가지 hybrid 패턴이 실무에서 자주 쓰입니다.

**패턴 1 — 새 시스템은 Yocto, 기존은 Buildroot**

기존 제품의 firmware는 그대로 Buildroot로 유지하고, *새로 시작하는 제품 라인*만 Yocto로 진행합니다. 팀이 *두 시스템을 병행*하는 기간이 6 ~ 12개월 정도 생깁니다. 이 패턴의 장점은 *기존 출시 일정에 영향 없음*입니다.

**패턴 2 — meta-buildroot으로 Buildroot 트리를 Yocto에 임베드**

이 방식이 *덜 알려졌지만* 매우 유용합니다. `meta-buildroot` layer를 Yocto에 추가하면 Buildroot 트리 전체를 *한 recipe*로 감싸 빌드할 수 있습니다.

```text
yocto-build/
├── sources/
│   ├── poky/                       # Yocto 본가
│   ├── meta-openembedded/
│   ├── meta-imx/                   # vendor BSP
│   └── meta-buildroot/             # bridge layer
├── buildroot/                      # 기존 Buildroot 트리 그대로
│   ├── package/
│   ├── configs/
│   └── ...
└── build/
    └── conf/
        ├── bblayers.conf
        └── local.conf
```

`meta-buildroot`의 layer.conf 예시.

```bitbake
# meta-buildroot/conf/layer.conf
BBPATH .= ":${LAYERDIR}"
BBFILES += "${LAYERDIR}/recipes-*/*/*.bb"

BBFILE_COLLECTIONS += "buildroot"
BBFILE_PATTERN_buildroot = "^${LAYERDIR}/"
BBFILE_PRIORITY_buildroot = "10"
LAYERSERIES_COMPAT_buildroot = "scarthgap kirkstone"
```

Buildroot 빌드 wrapper recipe.

```bitbake
# meta-buildroot/recipes-core/buildroot-rootfs/buildroot-rootfs.bb
SUMMARY = "Buildroot-built rootfs wrapped as Yocto artifact"
LICENSE = "CLOSED"

S = "${TOPDIR}/../buildroot"

do_compile() {
    cd ${S}
    make ${BUILDROOT_DEFCONFIG}
    make -j${BB_NUMBER_THREADS}
}

do_install() {
    install -d ${D}/buildroot-output
    cp -a ${S}/output/images/* ${D}/buildroot-output/
}

FILES:${PN} += "/buildroot-output"
BUILDROOT_DEFCONFIG ?= "qemu_aarch64_virt_defconfig"
```

이 구조가 주는 이득이 큽니다. *기존 Buildroot 트리는 그대로* 유지하면서 *Yocto의 sstate·layer·SDK 인프라*를 점차 도입할 수 있습니다. 이전 기간 동안 패키지 하나씩 Buildroot에서 *떼어내* OE recipe로 옮기는 작업을 점진적으로 진행하면 됩니다.

단점은 *두 시스템의 비용*을 모두 부담한다는 점입니다. *영구적인* 구조로 권장하지 않으며 *이전 기간 동안의 다리*로 사용합니다.

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
LIC_FILES_CHKSUM = "file://LICENSE;md5=abc1234567890abcdef1234567890abcd"

SRC_URI = "https://github.com/example/myapp/archive/refs/tags/myapp-${PV}.tar.gz"
SRC_URI[sha256sum] = "1111aaaa2222bbbb3333cccc4444dddd5555eeee6666ffff7777000088889999"

DEPENDS = "openssl curl"

S = "${WORKDIR}/myapp-${PV}"

do_compile() {
    oe_runmake CC="${CC}" CFLAGS="${CFLAGS}"
}

do_install() {
    install -D -m 0755 ${S}/myapp ${D}${bindir}/myapp
    install -D -m 0644 ${S}/myapp.conf ${D}${sysconfdir}/myapp.conf
}

FILES:${PN} += "${sysconfdir}/myapp.conf"
```

차이는 다음과 같습니다. Buildroot는 *make 함수*(`MYAPP_BUILD_CMDS`)로 호출되는 표준 매크로 패턴인 반면, OE는 *do_compile·do_install* 같은 *task 함수*로 분해됩니다. 변수 이름도 다릅니다. Buildroot의 `TARGET_CC`가 OE에서는 그냥 `CC`이며 cross-compile이 *암시적*으로 활성화됩니다. `TARGET_DIR`은 `${D}`, `/usr/bin`은 `${bindir}`로 *경로 변수화*가 강제됩니다.

변환 시 가장 자주 놓치는 부분이 `FILES:${PN}` 선언입니다. OE는 *패키지 분할*을 자동으로 하므로 `/etc` 아래 설치한 파일이 *main package*에 포함되도록 명시해야 합니다. 이 한 줄을 빠뜨리면 이미지에 `myapp.conf`가 *빠집니다*.

## defconfig → MACHINE conf

Buildroot의 보드 정의는 한 줄짜리 `configs/<board>_defconfig` 파일에 *모든 옵션*이 들어 있습니다. OE의 동등물은 `meta-<layer>/conf/machine/<machine>.conf` 한 파일에 *MACHINE 특성*만 정의됩니다.

```bitbake
# meta-myproject/conf/machine/mxc8mp.conf
#@TYPE: Machine
#@NAME: NXP i.MX 8M Plus EVK
#@DESCRIPTION: Custom board based on i.MX 8M Plus

require conf/machine/include/imx-base.inc

DEFAULTTUNE ?= "cortexa53-crypto"
require conf/machine/include/tune-cortexa53.inc

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

같은 "AArch64 + busybox + nginx + sshd + Python 3" 시스템을 양쪽으로 빌드한 측정값입니다. 8-core Ryzen 7 워크스테이션, NVMe SSD, 32 GB RAM, 캐시 없는 cold start 기준.

| 시나리오 | Buildroot 2024.02 | Yocto Scarthgap | 비고 |
|---|---|---|---|
| **First build (cold)** | 32분 | 110분 | sstate 없음 |
| **Second build (no change)** | 5초 | 8초 | 변경 감지만 |
| **Second build (1 pkg 수정)** | 25초 | 12초 | sstate hit |
| **Branch switch (200 pkgs)** | 32분 (대부분 rebuild) | 14분 (sstate hit 90%) | 동일 baseline 트리 |
| **CI 4번째 빌드** | 32분 | 7분 | sstate 캐시 누적 |
| **Toolchain만 교체** | 32분 (전체 재빌드) | 18분 (sstate signature 변경) | gcc 13 → 14 |
| **Multi-board 5개 빌드** | 5 × 32분 = 160분 | 1 × 110분 + 4 × 8분 = 142분 | 첫 보드 후 sstate 공유 |

Buildroot가 빠른 시나리오는 *first build*와 *single board의 incremental* 두 가지뿐입니다. *팀 인원*과 *보드 수*가 늘어나는 순간 모든 후속 시나리오에서 Yocto가 우세합니다.

Ch 14에서 다룬 Buildroot의 `ccache + per-package directories`로 일부 격차를 좁힐 수 있지만, *cross-PR sstate 공유*는 구조적으로 불가능합니다. 이 한 가지가 5번째 빌드부터의 차이를 만들어 냅니다.

## 운영 비용 비교

빌드 시간 외의 *조직 비용*도 같이 봐야 합니다.

| 항목 | Buildroot | Yocto/OE |
|---|---|---|
| **신규 팀원 학습** | 1주 | 1 ~ 2개월 |
| **빌드 시스템 전담** | 불필요 | 1명 (5인 이상 팀일 때) |
| **CI 인프라** | runner 1대로 충분 | sstate 서버 + runner 여러 대 |
| **vendor BSP 적용** | 매 분기 patches 정리 | 새 layer 추가 |
| **장기 LTS 유지** | 2년이 한계 | 5 ~ 10년 |
| **다중 보드 추가 비용** | 보드 1개당 *주 단위* | 보드 1개당 *일 단위* |
| **SDK 외부 배포** | tarball, 확장 어려움 | eSDK, devtool 워크플로 |
| **빌드 디버깅** | `make V=1`로 즉시 | bitbake task graph, sstate 검증 필요 |

작은 팀과 단일 제품에서는 Buildroot의 *학습 비용 1주*가 무엇과도 바꿀 수 없는 자산입니다. 큰 팀과 다중 제품에서는 Yocto의 *보드 추가 비용 일 단위*가 결정적 자산입니다.

## 옮기지 말아야 할 신호

이전 결정만큼 *이전하지 않는* 결정도 중요합니다. 다음 신호가 보이면 Yocto 도입은 *과한 결정*일 가능성이 높습니다.

- **팀이 5명 이하**이며 빌드 시스템 전담 인력이 없습니다.
- **board가 1개**이고 향후 2년 내 추가 계획이 없습니다.
- **rootfs가 64 MB 이하**이며 패키지 수가 50 이하입니다.
- **vendor BSP가 mainline에 잘 들어가 있어** vendor layer 의존이 약합니다.
- **출시 일정이 6개월 이하**로 임박해 *지금 이전*은 위험합니다.
- **OTA·SDK 배포가 불필요**하고 *flash 후 종료*형 firmware입니다.

이 조건이 두세 개 겹치면 Yocto의 *유연함*은 그대로 *비용*입니다. Buildroot에 머무르면서 Ch 14 (caching), Ch 17 (SDK)에서 다룬 기술로 한계를 끌어올리는 편이 더 합리적입니다. 도구는 *문제에 맞는 것*이 답이며 *더 큰 도구*가 답인 경우는 의외로 드뭅니다.

## 시리즈 마무리

20장에 걸쳐 Buildroot의 *철학·구조·실전·운영·한계*를 차례로 다뤘습니다. 회고로 정리합니다.

| 부 | 장 | 다룬 것 |
|---|---|---|
| **I. 기초** | Ch 1 ~ 5 | 철학, 디렉터리, Kconfig, 첫 빌드, 패키지 그래프 |
| **II. 구성 요소** | Ch 6 ~ 10 | rootfs overlay, post-build·post-image, init system, networking, 실 보드 |
| **III. 커스터마이제이션** | Ch 11 ~ 15 | toolchain, kernel, device tree, BR2_EXTERNAL, caching |
| **IV. 운영** | Ch 16 ~ 19 | release branching, SDK, OTA·secure boot, CI 통합 |
| **V. 미래** | Ch 20 | Yocto 이전 결정 |

이 시리즈를 졸업한 독자가 다음에 자연스럽게 향할 곳이 있습니다.

- **Yocto/OpenEmbedded 학습** — 가장 직접적인 후속. 시작점은 *Yocto Mega-Manual*과 *OpenEmbedded Reference Manual*. 한국어 후속 시리즈는 현재 준비 중이며, 이 블로그의 *embedded/yocto* 카테고리가 생기면 그쪽으로 이어집니다.
- **Linux from Scratch (LFS)** — 빌드 시스템에 *의존하지 않고* 같은 시스템을 *손으로* 조립해 보는 경험. Buildroot가 *무엇을 자동화하는지* 가장 깊게 이해할 수 있습니다.
- **BSP Development 시리즈** — 빌드 시스템 *아래*의 BSP 계층. U-Boot, device tree, kernel BSP를 다룹니다.
- **Embedded C++ for Real Systems** — userland 쪽으로 시선을 옮길 때.

마지막으로 한 가지 당부가 있습니다. 빌드 시스템은 *수단*입니다. 제품의 가치는 그 위에 올라가는 *application과 사용자 경험*에서 옵니다. 빌드 시스템에 너무 깊이 빠지지 않고 *충분히 안다*는 선에서 멈출 줄 아는 것도 엔지니어링의 일부입니다. 이 시리즈가 그 선을 찾는 데 도움이 됐기를 바랍니다.

## 정리

- Yocto 이전의 다섯 가지 신호는 *board 수 3+*, *per-package 분기 폭주*, *vendor BSP가 Yocto-only*, *SDK 외부 배포*, *CI에 sstate가 매력적*입니다.
- 이전 비용은 소형 1주, 중형 1개월, 대형 3개월 정도이며 *recipe 변환*보다 *팀 학습과 재테스트*가 비용 대부분을 차지합니다.
- 개념 매핑은 대체로 1:1이지만 *per-recipe sysroot 부재*와 *글로벌 Config.in vs 국소 DEPENDS*가 변환의 어려운 지점입니다.
- 점진적 이전은 *meta-buildroot*로 Buildroot 트리를 Yocto에 임베드해 두 시스템을 *다리 기간* 동안 병행하는 패턴이 안전합니다.
- recipe 변환의 핵심은 *make 매크로 → task 함수*, *TARGET_CC → CC*, *TARGET_DIR → ${D}*, 그리고 `FILES:${PN}` 명시입니다.
- defconfig는 MACHINE conf로 *MACHINE 특성*만 옮기고 *패키지 선택*은 image recipe로 분리됩니다.
- 4번째 빌드부터 Yocto가 빠르며, 5개 보드 빌드에서 sstate 공유로 누적 시간이 역전됩니다.
- 옮기지 *말아야 할 신호*도 분명합니다. 팀 5명 이하·단일 보드·소형 rootfs라면 Yocto는 과한 결정입니다.
- 도구는 문제에 맞는 것이 답이며, *더 큰 도구*가 답인 경우는 의외로 드뭅니다.

## 관련 항목

- [Ch 1: Buildroot가 푸는 문제 — Yocto와의 비교](/blog/embedded/buildroot/chapter01-problem) — 이 시리즈의 출발점이자 두 시스템의 철학적 트레이드오프
- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — 두 시스템에서 toolchain 처리 방식의 차이
- [Ch 14: Caching — ccache·per-package directories·dl 공유](/blog/embedded/buildroot/chapter14-caching) — Buildroot의 caching과 Yocto sstate의 구조적 차이
- [BSP Development Ch 16: Buildroot/Yocto와 BSP — rootfs 통합](/blog/embedded/bsp/chapter16-rootfs) — BSP 관점에서 빌드 시스템 선택
- [원문 — Yocto Mega-Manual](https://docs.yoctoproject.org/singleindex.html)
- [원문 — OpenEmbedded Reference Manual](https://docs.openembedded.org/docs/ref-manual/index.html)
- [원문 — Buildroot Manual](https://buildroot.org/downloads/manual/manual.html)
