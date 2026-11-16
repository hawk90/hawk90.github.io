---
title: "Buildroot 커널 Customize — defconfig fragment와 DTS 통합"
slug: "embedded/buildroot/chapter12-kernel-customize"
date: 2026-05-19T09:12:00
description: "Buildroot에서 mainline 커널을 vendor 트리·custom config·in-tree DTS로 customize하는 패턴."
series: "Buildroot Practical"
seriesOrder: 12
tags: [embedded, buildroot, linux-kernel, defconfig, device-tree]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"커널 customize는 *source · config · DTS · modules* 네 축의 조합입니다."** — 어느 한 축이라도 어긋나면 부팅이 안 되거나, 모듈이 안 올라오거나, 디바이스가 안 잡힙니다.

## 왜 커널을 customize하는가

Buildroot의 default 흐름은 *mainline 커널 + 보드 defconfig + in-tree DTS* 조합입니다. QEMU나 Raspberry Pi 같은 mainline 지원이 좋은 보드는 default로 충분합니다. 하지만 실제 SoC를 다루기 시작하면 vendor가 *fork된 커널 트리*(NXP `linux-imx`, TI `ti-linux-kernel`, Rockchip `kernel`)를 권장하거나, defconfig에 NFS root·`CONFIG_PREEMPT_RT`·vendor IPC 같은 추가 옵션이 필요해집니다. 보드 DTS가 in-tree에 없을 수도 있고, out-of-tree 커널 모듈을 함께 빌드해 rootfs의 `lib/modules/<ver>/`에 넣어야 할 수도 있습니다.

이 장은 위 네 축(source · defconfig · DTS · modules)을 *Buildroot 안에서 깔끔하게* 다루는 방법을 정리합니다. 옵션 이름과 동작은 **Buildroot 2026.02.3**의 `linux/Config.in`, `linux/linux.mk`, `package/pkg-kconfig.mk`에서 확인했고, fragment·재빌드 타깃의 동작은 QEMU defconfig 빌드(Ch 4와 같은 VM)에서 직접 돌려 봤습니다. 커널 config를 식당 주문으로 치면 defconfig는 *기본 메뉴*, fragment는 *"양파 빼고 치즈 추가"* 같은 메모입니다. 메모만 바꿔 다시 주문해도 주방이 알아듣는지가 이 장의 중요한 질문입니다.

## BR2_LINUX_KERNEL 옵션 한눈에

먼저 핵심 옵션 트리를 훑어 둡니다. `make menuconfig`의 *Kernel* 메뉴에서 모두 같이 보입니다.

| 옵션 | 역할 |
|---|---|
| `BR2_LINUX_KERNEL` | Linux 커널 빌드 켜기 (보통 `y`) |
| `BR2_LINUX_KERNEL_LATEST_VERSION` | 메뉴 표시는 "Latest version (6.19)", 실제 버전은 `6.19.14` |
| `BR2_LINUX_KERNEL_CUSTOM_VERSION` | 임의 mainline 버전 지정 (QEMU defconfig는 `6.18.7`) |
| `BR2_LINUX_KERNEL_CUSTOM_GIT` | git remote + commit으로 source 지정 |
| `BR2_LINUX_KERNEL_CUSTOM_TARBALL` | URL로 tarball 지정 |
| `BR2_LINUX_KERNEL_DEFCONFIG` | in-tree defconfig 이름 (예: `multi_v7`) |
| `BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG` | 트리 밖 `.config` 파일을 base로 사용 |
| `BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES` | base 위에 *추가 적용*할 .config 조각들 |
| `BR2_LINUX_KERNEL_IMAGE_TARGET_NAME` | make target (`Image`·`zImage`·`uImage`·`vmlinux`) |
| `BR2_LINUX_KERNEL_INTREE_DTS_NAME` | in-tree DTS 이름 (확장자 없이) |
| `BR2_LINUX_KERNEL_CUSTOM_DTS_DIR` | out-of-tree DTS를 담은 디렉터리 (`CUSTOM_DTS_PATH`의 후속) |
| `BR2_LINUX_KERNEL_NEEDS_HOST_OPENSSL` | 커널 빌드가 host OpenSSL을 필요로 할 때 (QEMU defconfig가 켬) |
| `BR2_LINUX_KERNEL_INSTALL_TARGET` | 커널 이미지를 *target rootfs의 `/boot`*에 설치 ("as is typically done on x86/x86_64 systems") |

`output/images/`로의 복사는 옵션 없이 항상 일어납니다. 위 빌드 로그의 `>>> linux 6.18.7 Installing to images directory`가 그 단계입니다. out-of-tree 모듈 패키지는 별도 옵션 묶음이 아니라 일반 패키지(`BR2_PACKAGE_<NAME>`)로 노출됩니다(아래 "커널 모듈" 절).

## Source location 4가지

커널 source를 어디서 가져올지에 따라 *upgrade 정책*과 *vendor 호환성*이 결정됩니다.

### Mainline LTS — Buildroot 추천

가장 단순한 경로입니다. `BR2_LINUX_KERNEL_LATEST_VERSION=y`로 두면 그 Buildroot 릴리스가 정한 버전을 씁니다. 2026.02.3에서는 `linux/Config.in` 146행 `default "6.19.14" if BR2_LINUX_KERNEL_LATEST_VERSION`입니다.

```text
BR2_LINUX_KERNEL=y
BR2_LINUX_KERNEL_LATEST_VERSION=y
```

단점은 *Buildroot를 올리면 커널도 같이 바뀐다*는 점입니다. 이 값은 릴리스마다 갱신되므로 Buildroot 버전 bump가 곧 커널 버전 bump가 됩니다.

### Custom mainline tag — 버전 고정

특정 LTS 버전을 *명시*하고 싶을 때 씁니다. `kernel.org`의 해당 tarball을 가져오며, 양산 트리에서 재현성을 위해 버전을 고정하는 표준 패턴입니다.

```text
BR2_LINUX_KERNEL_CUSTOM_VERSION=y
BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.7"
```

QEMU defconfig가 바로 이 방식입니다. 이때 tarball hash는 `BR2_DOWNLOAD_FORCE_CHECK_HASHES=y`와 `BR2_GLOBAL_PATCH_DIR`(`board/qemu/patches`) 아래 `linux/linux.hash`로 검증합니다(Ch 5).

### Custom git — vendor fork

NXP·TI·Rockchip 등 *vendor fork*를 쓸 때의 방식입니다.

```text
BR2_LINUX_KERNEL_CUSTOM_GIT=y
BR2_LINUX_KERNEL_CUSTOM_REPO_URL="https://github.com/nxp-imx/linux-imx.git"
BR2_LINUX_KERNEL_CUSTOM_REPO_VERSION="lf-6.6.23-2.0.0"
```

`REPO_VERSION`에는 tag·branch·commit hash를 줄 수 있습니다. 양산 트리는 commit hash로 고정합니다. branch는 시간이 지나면 다른 commit을 가리키고, tag도 저장소 관리자가 옮길 수 있기 때문입니다. Buildroot는 git에서 받은 소스를 tarball로 묶어 `dl/`에 두고, 그 tarball의 hash를 검사할 수 있습니다(Ch 4의 glibc가 `glibc-2.42-67-g4ebd33dd…-git4.tar.gz`로 저장된 것과 같은 방식).

### Custom tarball — 사내 빌드 산출물

vendor가 tarball만 주거나 사내 git에 못 두는 경우에 씁니다. `$(TOPDIR)`는 Buildroot 트리 루트이고, 사내 mirror URL도 직접 적을 수 있습니다.

```text
BR2_LINUX_KERNEL_CUSTOM_TARBALL=y
BR2_LINUX_KERNEL_CUSTOM_TARBALL_LOCATION="$(TOPDIR)/dl-local/linux-vendor-6.6.tar.xz"
```

### 한눈에 비교

| 방식 | upgrade 정책 | 재현성 | vendor 호환 |
|---|---|---|---|
| `LATEST_VERSION` | Buildroot 릴리스에 종속 | Buildroot 태그를 고정하면 고정 | mainline 지원 보드 |
| `CUSTOM_VERSION` | 수동 bump | 강함 | mainline 지원 보드 |
| `CUSTOM_GIT` | branch/tag/hash 명시 | hash면 강함 | vendor fork |
| `CUSTOM_TARBALL` | URL/path만 | 파일이 바뀌지 않으면 강함 | 사내 배포 소스 |

## defconfig — 3가지 시작점

커널 source를 정했으면 다음은 *어떤 `.config`로 시작할지*입니다. 셋 중 하나를 고릅니다.

### In-tree defconfig

커널 source 안 `arch/<arch>/configs/`에 들어 있는 defconfig를 그대로 씁니다.

```text
BR2_LINUX_KERNEL_USE_DEFCONFIG=y
BR2_LINUX_KERNEL_DEFCONFIG="multi_v7"
```

위 예는 ARM 32-bit `arch/arm/configs/multi_v7_defconfig`를 가리킵니다. `linux/linux.mk` 361행이 `LINUX_KCONFIG_DEFCONFIG = $(call qstrip,$(BR2_LINUX_KERNEL_DEFCONFIG))_defconfig`로 접미사를 붙이므로 옵션 값에는 빼고 적습니다. BeagleBone defconfig의 `BR2_LINUX_KERNEL_DEFCONFIG="omap2plus"`가 실제 예입니다. aarch64라면 `defconfig` 한 단어(즉 `arch/arm64/configs/defconfig`)가 default이고, vendor 트리는 `imx_v8_defconfig` 같은 보드별 defconfig를 따로 둡니다.

### Custom config 파일 — 완전한 .config 통째로

defconfig가 아닌 *완전한 `.config`*를 base로 쓰고 싶을 때 씁니다. `make linux-menuconfig`로 한 번 손질한 결과를 보드 디렉터리에 저장해 두고 그 경로를 지정합니다.

```text
BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG=y
BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="$(BR2_EXTERNAL_FOO_PATH)/board/myboard/linux.config"
```

`$(BR2_EXTERNAL_FOO_PATH)`는 br2-external tree의 루트 경로입니다(Ch 6). QEMU defconfig는 이 방식으로 `board/qemu/aarch64-virt/linux.config`를 씁니다.

### Menuconfig로 임시 수정

빌드 한 번 돌린 뒤 *interactive*하게 옵션을 토글하는 흐름은 다음과 같습니다.

```bash
make linux-menuconfig          # ncurses로 .config 수정
make                           # 다시 빌드 (menuconfig가 stamp를 이미 지움)
make linux-update-defconfig    # savedefconfig 결과를 CUSTOM_CONFIG_FILE에 덮어씀
make linux-update-config       # .config 전체를 CUSTOM_CONFIG_FILE에 덮어씀
```

`linux-menuconfig`는 `package/pkg-kconfig.mk` 244~245행에서 `.stamp_{kconfig_fixup_done,configured,built}`와 설치 stamp를 지우므로, 그다음 `make`가 커널을 다시 빌드합니다. `linux-rebuild`를 따로 부를 필요가 없습니다.

`update-*` 타깃은 `BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE`이 가리키는 파일을 *직접 덮어씁니다*. 실험에서 QEMU defconfig 상태로 `make linux-update-defconfig`를 돌렸더니 Buildroot 트리의 `board/qemu/aarch64-virt/linux.config`가 바뀌었습니다.

```text
cp -f /home/br/buildroot/output/build/linux-6.18.7/defconfig board/qemu/aarch64-virt/linux.config
$ git diff --stat board/qemu/aarch64-virt/linux.config
 board/qemu/aarch64-virt/linux.config | 4 ++++
```

추가된 4줄 중 3줄은 *직전 실험의 fragment*(`CONFIG_SQUASHFS*`)였습니다. `.config`에서 fragment를 뺀 직후라 커널 `.config`가 아직 다시 merge되지 않은 상태였기 때문입니다. 본체 트리의 보드 파일을 가리키는 설정이라면 이 타깃을 부르기 전에 config 파일을 외부 트리로 복사해 두고, `update-*` 직후 `git diff`로 의도한 변경만 들어갔는지 확인합니다.

## defconfig fragments — 점진 추가

여기가 *Buildroot가 잘 푼 부분*입니다. base defconfig는 그대로 두고, *그 위에 덮어쓰는 .config 조각*을 여러 개 적용할 수 있습니다.

```text
BR2_LINUX_KERNEL_USE_DEFCONFIG=y
BR2_LINUX_KERNEL_DEFCONFIG="defconfig"
BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES="$(BR2_EXTERNAL_FOO_PATH)/board/myboard/linux-rt.config \
                                       $(BR2_EXTERNAL_FOO_PATH)/board/myboard/linux-net.config"
```

각 fragment는 *부분 .config*입니다. RT 활성화와 네트워크 추가 예시는 다음과 같이 짧습니다.

```text
# board/myboard/linux-rt.config
CONFIG_PREEMPT_RT=y
CONFIG_HIGH_RES_TIMERS=y
CONFIG_NO_HZ_FULL=y
# CONFIG_PREEMPT_VOLUNTARY is not set

# board/myboard/linux-net.config
CONFIG_VLAN_8021Q=y
CONFIG_BRIDGE=y
CONFIG_NETFILTER=y
CONFIG_NF_CONNTRACK=m
```

merge 절차는 `package/pkg-kconfig.mk` 63~69행의 `kconfig-package-merge-config`입니다. defconfig 이름이면 `make <name>_defconfig`로, 파일이면 그대로 복사해 base `.config`를 만든 뒤, *Buildroot의* `support/kconfig/merge_config.sh -m`로 fragment를 순서대로 합치고 `olddefconfig` 계열로 다시 정리합니다. 같은 옵션이 여러 fragment에 있으면 뒤 파일의 값이 남습니다.

`CONFIG_PREEMPT_RT`는 아키텍처가 RT를 지원해야 켜집니다. 의존성이 맞지 않는 줄은 merge 뒤 정리 단계에서 조용히 빠지므로, 결과는 항상 `output/build/linux-*/.config`에서 확인합니다.

### fragment를 바꿨을 때 다시 빌드되는가

Ch 8에서 쓴 squashfs fragment(`CONFIG_SQUASHFS=y`, `CONFIG_SQUASHFS_ZSTD=y`)로 직접 확인했습니다. 먼저 `BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES`를 *새로 지정*한 뒤 `make linux-rebuild`를 불렀습니다.

```text
>>> linux 6.18.7 Updating kernel config with fixups
>>> linux 6.18.7 Configuring
>>> linux 6.18.7 Building
>>> linux 6.18.7 Installing to target
>>> linux 6.18.7 Installing to images directory
WALL 39.35
```

`rebuild`인데도 config를 다시 merge하고 configure부터 돌았습니다. 이어서 fragment 파일에 `CONFIG_SQUASHFS_XZ=y` 한 줄을 *추가*하고 타깃 없이 `make`만 돌려도 같은 다섯 줄이 나왔고(28.16초), 결과 `.config`에는 세 줄이 모두 들어 있었습니다.

```text
CONFIG_SQUASHFS=y
CONFIG_SQUASHFS_XZ=y
CONFIG_SQUASHFS_ZSTD=y
```

이유는 `pkg-kconfig.mk` 158행의 규칙입니다. `.stamp_dotconfig`가 `$(2)_KCONFIG_FILE`과 `$(2)_KCONFIG_FRAGMENT_FILES`에 *파일 의존성*을 걸고 있어서, fragment가 stamp보다 새로우면 make가 merge부터 다시 합니다. 그래서 fragment를 고쳤을 때 `linux-reconfigure`를 따로 외울 필요는 없습니다.

기능별 분리가 fragment의 장점입니다. RT를 안 쓰는 보드는 fragment 한 줄을 빼면 끝나고, base defconfig를 매번 복제해 유지하지 않아도 됩니다. 다만 fragment를 쓰는 동안에는 `linux-update-config`가 막힙니다.

```text
$ make linux-update-config
Unable to perform linux-update-config when fragment files are set
make[1]: *** [linux/linux.mk:688: linux-update-config] Error 1
```

`pkg-kconfig.mk` 19~20행이 fragment가 설정돼 있으면 이 메시지로 중단합니다. fragment로 합친 결과를 base 파일에 다시 쓰면 base와 fragment의 경계가 사라지기 때문입니다.

## DTS — in-tree와 custom

ARM 계열에서는 *device tree*가 필수이고, Buildroot가 두 가지 길을 제공합니다.

### In-tree DTS

커널 트리 `arch/<arch>/boot/dts/...`에 이미 보드 DTS가 있는 경우입니다.

```text
BR2_LINUX_KERNEL_DTS_SUPPORT=y
BR2_LINUX_KERNEL_INTREE_DTS_NAME="freescale/imx8mm-evk \
                                  freescale/imx8mm-myboard"
```

공백으로 여러 보드를 나열할 수 있습니다. 각각이 `imx8mm-evk.dtb`, `imx8mm-myboard.dtb`로 빌드돼 `output/images/`에 복사됩니다. 같은 커널 binary로 여러 변형 보드를 부팅할 때 자주 씁니다.

### Out-of-tree DTS

커널 트리를 *수정하지 않고* `.dts`를 보드 디렉터리에 두는 패턴입니다. 2026.02.3에서는 두 옵션이 있고, `linux/Config.in`의 help가 둘의 관계를 밝힙니다.

```text
	  Due to a kernel build system changes in 6.12,
	  BR2_LINUX_KERNEL_CUSTOM_DTS_PATH is now deprecated and
	  replaced by BR2_LINUX_KERNEL_CUSTOM_DTS_DIR
```

새 옵션 `BR2_LINUX_KERNEL_CUSTOM_DTS_DIR`은 디렉터리를 받아 "copied as-is over the arch/<arch>/boot/dts/ directory"합니다. 그 디렉터리 안에 커널과 같은 vendor 하위 디렉터리(예: `freescale/`)를 두라는 것이 help의 요구입니다.

```text
BR2_LINUX_KERNEL_DTS_SUPPORT=y
BR2_LINUX_KERNEL_CUSTOM_DTS_DIR="$(BR2_EXTERNAL_FOO_PATH)/board/myboard/dts"
BR2_LINUX_KERNEL_INTREE_DTS_NAME="freescale/imx8mm-myboard"
```

`board/myboard/dts/freescale/imx8mm-myboard.dts`가 커널의 `arch/arm64/boot/dts/freescale/` 옆에 복사되므로, `#include`는 같은 디렉터리의 mainline DTS를 그대로 찾습니다. 사내 DTS는 mainline DTS를 base로 포함하는 패턴이 자연스럽습니다.

```text
// board/myboard/imx8mm-myboard.dts
/dts-v1/;
#include "imx8mm-evk.dts"

/ {
    model = "MyCorp i.MX8MM Board";
    compatible = "mycorp,imx8mm-myboard", "fsl,imx8mm";
};

&i2c1 {
    status = "okay";
    sensor@4a {
        compatible = "mycorp,sensor";
        reg = <0x4a>;
    };
};
```

이렇게 두면 mainline 업데이트 시 base DTS만 따라오면 사내 변경분이 유지됩니다. 다만 base DTS의 노드 이름이나 label이 바뀌면 `&i2c1` 같은 참조가 깨지므로 커널 bump 때마다 DTB 빌드를 확인합니다. 사내 DTS 파일은 외부 트리에 commit해 커널 트리와 분리합니다.

## 커널 모듈 — 외부 모듈 통합

vendor가 *out-of-tree 커널 모듈*을 별도로 줄 때가 많습니다. Wi-Fi 드라이버, GPU userspace 인터페이스, 사내 IPC 모듈 등이 흔한 사례입니다. Buildroot package로 감싸면 커널과 *동시에 빌드*되고 rootfs의 `lib/modules/<ver>/`에 자동으로 들어갑니다.

매뉴얼 "kernel-module tutorial"의 골격과 같습니다.

```makefile
# package/mywifi/mywifi.mk
MYWIFI_VERSION = 1.2.0
MYWIFI_SITE = $(call github,mycorp,mywifi,$(MYWIFI_VERSION))
MYWIFI_LICENSE = GPL-2.0
MYWIFI_LICENSE_FILES = COPYING

$(eval $(kernel-module))
$(eval $(generic-package))
```

매뉴얼은 두 번째 줄이 꼭 필요하다고 적습니다. "Using the `kernel-module` infrastructure on its own is not sufficient; another package infrastructure *must* be used." 또 "The dependency on `linux` is automatically added"라서 `MYWIFI_DEPENDENCIES`에 `linux`를 적지 않습니다.

`package/pkg-kernel-module.mk`가 하는 일은 두 hook입니다. post-build hook에서 `$(MAKE) -C $(LINUX_DIR) $(LINUX_MAKE_FLAGS) … M=$(@D)/<subdir> modules`를, post-install-target hook에서 같은 명령의 `modules_install`을 부릅니다. `depmod`는 모듈 패키지가 아니라 `linux/linux.mk` 603~610행의 `LINUX_RUN_DEPMOD`가 target-finalize 단계에서 한 번 돌립니다. 주석이 이유를 밝힙니다("to encompass modules installed by packages"). 또한 같은 파일은 `CONFIG_TRIM_UNUSED_KSYMS`를 커널 설정에서 끕니다. 커널이 쓰지 않는 심볼을 잘라 내면 외부 모듈이 링크할 심볼이 없어지기 때문입니다.

`Config.in`은 본체의 `package/batman-adv/Config.in`과 같은 모양이 됩니다.

```text
comment "mywifi needs a Linux kernel to be built"
	depends on !BR2_LINUX_KERNEL

config BR2_PACKAGE_MYWIFI
	bool "mywifi"
	depends on BR2_LINUX_KERNEL
	help
	  Out-of-tree Wi-Fi driver for MyCorp boards.
```

`depends on BR2_LINUX_KERNEL`이 없으면 커널을 빌드하지 않는 설정에서도 이 패키지를 켤 수 있고, 그러면 `LINUX_DIR`이 없어 빌드가 실패합니다.

## rootfs 통합 — `lib/modules/<ver>/`

커널 설정에 `CONFIG_MODULES=y`가 있으면 커널 설치 단계가 `modules_install`을 하고, target-finalize가 `depmod`를 돌립니다. QEMU defconfig는 `=m`인 옵션이 4개뿐이지만 디렉터리 구조는 그대로 생겼습니다.

```text
$ ls output/target/lib/modules/
6.18.7
$ ls output/target/lib/modules/6.18.7/
kernel
modules.alias
modules.alias.bin
modules.builtin
modules.builtin.alias.bin
modules.builtin.bin
modules.builtin.modinfo
modules.dep
modules.dep.bin
modules.devname
...
```

디렉터리 이름은 커널 빌드의 `include/config/kernel.release` 값이고, 이 빌드에서는 `6.18.7`이었습니다. `LINUX_RUN_DEPMOD`도 이 값(`LINUX_VERSION_PROBED`)으로 `depmod -a -b $(TARGET_DIR)`를 부릅니다. fragment에서 `CONFIG_LOCALVERSION`을 바꾸면 이 문자열과 디렉터리 이름이 같이 바뀌므로, 보드의 `uname -r`과 `/lib/modules/` 아래 이름이 같은지 확인합니다.

## 빌드 단계 — extract부터 reinstall까지

Buildroot의 커널 빌드는 *step별*로 나뉘어 있어 개별 호출이 가능합니다.

| target | 효과 |
|---|---|
| `linux-extract` | source tarball 풀기 / git clone |
| `linux-patch` | Buildroot patch 적용 |
| `linux-configure` | defconfig + fragments → `.config` 생성 |
| `linux-build` | `make Image dtbs modules` 수행 |
| `linux-install` | `modules_install` + `output/images/` 복사 |
| `linux-rebuild` | build와 install stamp를 지우고 다시 (`pkg-generic.mk` 1065~1068행) |
| `linux-reconfigure` | configure stamp까지 지우고 다시 |
| `linux-reinstall` | install stamp만 지우고 다시 |
| `linux-menuconfig` | 현재 `.config`로 menuconfig |
| `linux-savedefconfig` | `make savedefconfig` |
| `linux-update-defconfig` | savedefconfig 결과를 트리에 복사 |
| `linux-update-config` | 현재 `.config`를 custom config 파일로 복사 |
| `linux-dirclean` | linux build 디렉터리만 삭제 |

전형적인 개발 사이클은 다음과 같습니다.

```bash
make linux-menuconfig            # 옵션 토글 (stamp가 지워짐)
make                             # 커널 재빌드 + 설치 + rootfs 이미지 재생성
```

out-of-tree DTS나 커널 소스를 *빌드 디렉터리에서 직접* 고쳤다면 `make linux-rebuild` 뒤 `make`입니다. `rebuild`는 `clean-for-rebuild`가 `clean-for-reinstall`에 의존하므로 *설치까지* 다시 하고, 따로 `linux-reinstall`을 붙일 필요가 없습니다. rootfs 이미지는 `rebuild`가 만들지 않으므로 마지막 `make`가 필요합니다(Ch 4에서 busybox로 확인). fragment·config 파일을 고친 경우는 위 실험처럼 `make`만으로 충분합니다.

`linux-dirclean` 한 번이면 깨끗하게 처음부터 다시 빌드합니다. config가 꼬였을 때 가장 안전한 reset입니다.

## 흔한 실수

### Config fragment가 적용 안 됨

가장 흔합니다. `BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES`에 경로를 추가했는데 옵션이 안 들어간 경우, 다음을 차례로 확인합니다.

- `make` 출력에 `Updating kernel config with fixups`가 나왔는가? 나오지 않았다면 fragment 경로가 `BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES`에 실제로 들어갔는지 `make -s printvars VARS=LINUX_KCONFIG_FRAGMENT_FILES`로 확인합니다.
- 경로는 `$(BR2_EXTERNAL_FOO_PATH)/...`처럼 절대 경로로 펼쳐지는 형태로 씁니다.
- 옵션의 `depends on`이 충족되지 않으면 merge 뒤 정리 단계가 그 줄을 지웁니다. `output/build/linux-*/.config`를 열어 *결과*를 확인합니다.

### DTB가 `output/images/`에 안 들어옴

`BR2_LINUX_KERNEL_DTS_SUPPORT=y`가 꺼져 있거나 DTS 이름을 잘못 적은 경우입니다. `.dts` 확장자를 빼고, `ti/omap/am335x-boneblack`처럼 vendor 서브디렉터리까지 적습니다(BeagleBone defconfig의 실제 값). 빌드 후 `ls output/images/*.dtb`로 확인합니다. Ch 10의 BeagleBone 빌드에서는 지정한 9개 DTS가 모두 `output/images/`에 들어왔습니다.

### `modules.dep` 누락

부팅 후 `modprobe`가 안 되면 `/lib/modules/$(uname -r)/modules.dep`가 있는지 먼저 봅니다. `LINUX_RUN_DEPMOD`는 `/lib/modules/<release>` 디렉터리가 있고 커널 `.config`에 `CONFIG_MODULES=y`가 있을 때만 `depmod`를 부르므로, 둘 중 하나가 빠지면 `modules.dep`도 없습니다. post-build 스크립트가 `/lib/modules`를 지우거나 옮기는 경우도 확인합니다.

### Kernel headers와 toolchain 불일치

Ch 11에서 다룬 ABI 문제의 *커널 쪽* 사례입니다. userspace가 보는 커널 헤더는 toolchain이 정합니다. QEMU defconfig는 `BR2_KERNEL_HEADERS_AS_KERNEL=y`로 *빌드하는 커널과 같은 버전*의 헤더를 toolchain에 넣습니다. 외부 toolchain은 헤더 버전이 toolchain에 고정되므로, 그 버전이 *실행할 커널보다 높지 않아야* userspace가 커널에 없는 syscall을 부르지 않습니다.

### Vendor fork의 patch 충돌

`BR2_LINUX_KERNEL_PATCH`나 `BR2_GLOBAL_PATCH_DIR`로 mainline 패치를 얹다 보면 vendor fork와 충돌합니다. vendor가 이미 같은 패치를 backport한 경우입니다. Buildroot는 패치 적용이 실패하면 빌드를 멈추므로(Ch 5), 충돌한 패치를 빼거나 vendor 트리를 올립니다. 패치 수가 늘수록 커널을 올릴 때마다 다시 맞출 양이 늘어납니다.

### `linux-rebuild` 후 rootfs가 안 바뀜

`linux-rebuild`는 설치 stamp까지 지우므로 `output/target/lib/modules/`는 갱신됩니다(위 로그의 `Installing to target`). 바뀌지 않는 것은 *rootfs 이미지*입니다. `rebuild`는 `rootfs.ext2` 같은 이미지를 다시 만들지 않으므로 마지막에 `make`를 한 번 더 칩니다.

## 정리

- 커널 customize는 *source · defconfig · DTS · modules* 네 축의 조합입니다.
- Source는 mainline LTS / custom version / custom git / custom tarball 중 선택하며, vendor fork는 `CUSTOM_GIT` + full commit hash가 표준입니다.
- defconfig는 in-tree 이름 / custom config 파일 / menuconfig 중 시작점을 고르고, 그 위에 *fragment*로 기능별 옵션을 점진 추가합니다.
- DTS는 in-tree 이름으로 골라도 되고, out-of-tree `.dts`를 `CUSTOM_DTS_PATH`로 가져와도 됩니다. mainline DTS를 `#include`로 깔고 사내 변경분만 얹는 패턴이 안전합니다.
- out-of-tree 모듈은 `kernel-module` 인프라로 감싸면 자동으로 `lib/modules/<ver>/`에 들어갑니다.
- fragment나 config 파일을 고치면 `.stamp_dotconfig`의 파일 의존성 때문에 `make`만으로 merge·configure·build가 다시 돕니다(실측 28.16초). `linux-menuconfig`도 stamp를 지웁니다.
- `linux-rebuild`는 빌드와 *설치*를 다시 하지만 rootfs 이미지는 만들지 않습니다. 마지막에 `make`를 칩니다.
- `linux-update-config`는 fragment가 있으면 거부되고, `linux-update-defconfig`는 `CUSTOM_CONFIG_FILE`을 직접 덮어씁니다. 실행 뒤 `git diff`로 확인합니다.
- 외부 모듈은 `kernel-module` + 다른 infra 하나로 감싸고, `depmod`는 target-finalize의 `LINUX_RUN_DEPMOD`가 한 번 돌립니다.
- out-of-tree DTS는 6.12 이후 `CUSTOM_DTS_DIR`로 vendor 디렉터리째 넣습니다.

## 다음 장 예고

다음 편은 **Ch 13: U-Boot 통합**. 같은 device tree·toolchain 위에 *부트로더*를 어떻게 정렬해 single source of truth를 유지하는지 다룹니다.


## 관련 항목

- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build) — `linux-menuconfig`가 처음 등장한 흐름
- [Ch 7: 보드 customize — br2-external과 board 디렉터리](/blog/embedded/buildroot/chapter07-board-customize) — DTS·linux.config 파일의 거주 위치
- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — kernel headers ABI 일치
- [Ch 13: U-Boot 통합 — 같은 device tree 위에서](/blog/embedded/buildroot/chapter13-uboot-integration) — 부트로더와 커널의 DTS 정렬
- [BSP Development Ch 11: 커널 포팅](/blog/embedded/bsp/chapter11-bootlog-debugging) — BSP 관점에서 vendor fork → mainline 정렬
- [원문 — Buildroot Manual §13: Customizing the generated target filesystem](https://buildroot.org/downloads/manual/manual.html)
