---
title: "Buildroot 커널 Customize — defconfig fragment와 DTS 통합"
date: 2026-05-19T09:12:00
description: "Buildroot에서 mainline 커널을 vendor 트리·custom config·in-tree DTS로 customize하는 패턴."
series: "Buildroot Practical"
seriesOrder: 12
tags: [embedded, buildroot, linux-kernel, defconfig, devicetree]
draft: false
---

## 한 줄 요약

> **"커널 customize는 *source · config · DTS · modules* 네 축의 조합입니다."** — 어느 한 축이라도 어긋나면 부팅이 안 되거나, 모듈이 안 올라오거나, 디바이스가 안 잡힙니다.

## 왜 커널을 customize하는가

Buildroot의 default 흐름은 *mainline 커널 + 보드 defconfig + in-tree DTS* 조합입니다. QEMU나 Raspberry Pi 같은 mainline 지원이 좋은 보드는 default로 충분합니다. 하지만 실제 SoC를 다루기 시작하면 vendor가 *fork된 커널 트리*(NXP `linux-imx`, TI `ti-linux-kernel`, Rockchip `kernel`)를 권장하거나, defconfig에 NFS root·`CONFIG_PREEMPT_RT`·vendor IPC 같은 추가 옵션이 필요해집니다. 보드 DTS가 in-tree에 없을 수도 있고, out-of-tree 커널 모듈을 함께 빌드해 rootfs의 `lib/modules/<ver>/`에 넣어야 할 수도 있습니다.

이 장은 위 네 축(source · defconfig · DTS · modules)을 *Buildroot 안에서 깔끔하게* 다루는 방법을 정리합니다. `BR2_LINUX_KERNEL_*` 옵션을 정확히 짚고, 흔한 실수를 끝에 모읍니다.

## BR2_LINUX_KERNEL 옵션 한눈에

먼저 핵심 옵션 트리를 훑어 둡니다. `make menuconfig`의 *Kernel* 메뉴에서 모두 같이 보입니다.

| 옵션 | 역할 |
|---|---|
| `BR2_LINUX_KERNEL` | Linux 커널 빌드 켜기 (보통 `y`) |
| `BR2_LINUX_KERNEL_LATEST_VERSION` | Buildroot가 추천하는 mainline LTS 선택 |
| `BR2_LINUX_KERNEL_CUSTOM_VERSION` | 임의 mainline tag 지정 (예: `6.6.32`) |
| `BR2_LINUX_KERNEL_CUSTOM_GIT` | git remote + commit으로 source 지정 |
| `BR2_LINUX_KERNEL_CUSTOM_TARBALL` | URL로 tarball 지정 |
| `BR2_LINUX_KERNEL_DEFCONFIG` | in-tree defconfig 이름 (예: `multi_v7`) |
| `BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG` | 트리 밖 `.config` 파일을 base로 사용 |
| `BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES` | base 위에 *추가 적용*할 .config 조각들 |
| `BR2_LINUX_KERNEL_IMAGE_TARGET_NAME` | make target (`Image`·`zImage`·`uImage`·`vmlinux`) |
| `BR2_LINUX_KERNEL_INTREE_DTS_NAME` | in-tree DTS 이름 (확장자 없이) |
| `BR2_LINUX_KERNEL_CUSTOM_DTS_PATH` | out-of-tree `.dts` 파일 경로 |
| `BR2_LINUX_KERNEL_NEEDS_HOST_OPENSSL` | sign-file·module signing 의존성 |
| `BR2_LINUX_KERNEL_INSTALL_TARGET` | bzImage 등을 `output/images/`에 복사 |

`BR2_PACKAGE_KERNEL_MODULE_*`은 별도 카테고리(Target packages → Kernel modules)에 있고, out-of-tree 모듈을 추가하면 자동으로 노출됩니다.

## Source location 4가지

커널 source를 어디서 가져올지에 따라 *upgrade 정책*과 *vendor 호환성*이 결정됩니다.

### Mainline LTS — Buildroot 추천

가장 단순한 경로입니다. `BR2_LINUX_KERNEL_LATEST_VERSION=y`로 두면 Buildroot 트리가 *현재 추천하는 LTS*를 사용합니다.

```text
BR2_LINUX_KERNEL=y
BR2_LINUX_KERNEL_LATEST_VERSION=y
```

Buildroot 팀이 매 release마다 검증하므로 보드 BSP와 충돌이 적지만, *컨트롤이 없다*는 단점이 있습니다. Buildroot release 한 번이 LTS 6.6에서 6.12로 자동 이동시킬 수 있습니다.

### Custom mainline tag — 버전 고정

특정 LTS 버전을 *명시*하고 싶을 때 씁니다. `kernel.org`의 해당 tarball을 가져오며, 양산 트리에서 재현성을 위해 버전을 고정하는 표준 패턴입니다.

```text
BR2_LINUX_KERNEL_CUSTOM_VERSION=y
BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.6.32"
```

### Custom git — vendor fork

NXP·TI·Rockchip 등 *vendor fork*를 쓸 때의 방식입니다.

```text
BR2_LINUX_KERNEL_CUSTOM_GIT=y
BR2_LINUX_KERNEL_CUSTOM_REPO_URL="https://github.com/nxp-imx/linux-imx.git"
BR2_LINUX_KERNEL_CUSTOM_REPO_VERSION="lf-6.6.23-2.0.0"
```

`REPO_VERSION`에는 tag·branch·full commit hash를 줄 수 있고, **양산 트리는 항상 full commit hash**가 정답입니다. 같은 tag가 다른 시점에 다른 commit을 가리키게 변경된 경험이 누구나 한 번씩 있습니다.

### Custom tarball — 사내 빌드 산출물

vendor가 tarball만 주거나 사내 git에 못 두는 경우에 씁니다. `$(TOPDIR)`는 Buildroot 트리 루트이고, 사내 mirror URL도 직접 적을 수 있습니다.

```text
BR2_LINUX_KERNEL_CUSTOM_TARBALL=y
BR2_LINUX_KERNEL_CUSTOM_TARBALL_LOCATION="$(TOPDIR)/dl-local/linux-vendor-6.6.tar.xz"
```

### 한눈에 비교

| 방식 | upgrade 정책 | 재현성 | vendor 호환 |
|---|---|---|---|
| `LATEST_VERSION` | Buildroot release에 종속 | 약함 | 보통 |
| `CUSTOM_VERSION` | 수동 bump | 강함 | mainline-friendly 보드만 |
| `CUSTOM_GIT` | branch/tag/hash 명시 | hash면 강함 | *vendor fork에 필수* |
| `CUSTOM_TARBALL` | URL/path만 | 강함 | sign-off 어려운 사내 source |

prototyping은 `LATEST_VERSION`으로 시작하다가, 보드가 정해지면 `CUSTOM_GIT` + full hash로 전환하는 흐름이 일반적입니다.

## defconfig — 3가지 시작점

커널 source를 정했으면 다음은 *어떤 `.config`로 시작할지*입니다. 셋 중 하나를 고릅니다.

### In-tree defconfig

커널 source 안 `arch/<arch>/configs/`에 들어 있는 defconfig를 그대로 씁니다.

```text
BR2_LINUX_KERNEL_USE_DEFCONFIG=y
BR2_LINUX_KERNEL_DEFCONFIG="multi_v7"
```

위 예는 ARM 32-bit `arch/arm/configs/multi_v7_defconfig`를 가리킵니다. `_defconfig` 접미사는 *자동으로 붙으니* 옵션 값에는 빼고 적습니다. aarch64라면 `defconfig` 한 단어(즉 `arch/arm64/configs/defconfig`)가 default이고, vendor 트리는 `imx_v8_defconfig` 같은 보드별 defconfig를 따로 둡니다.

### Custom config 파일 — 완전한 .config 통째로

defconfig가 아닌 *완전한 `.config`*를 base로 쓰고 싶을 때 씁니다. `make linux-menuconfig`로 한 번 손질한 결과를 보드 디렉터리에 저장해 두고 그 경로를 지정합니다.

```text
BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG=y
BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="$(BR2_EXTERNAL_FOO_PATH)/board/myboard/linux.config"
```

`$(BR2_EXTERNAL_FOO_PATH)`는 br2-external tree의 루트 매크로입니다(Ch 7 참고).

### Menuconfig로 임시 수정

빌드 한 번 돌린 뒤 *interactive*하게 옵션을 토글하는 흐름은 다음과 같습니다.

```bash
$ make linux-menuconfig          # ncurses로 .config 수정
$ make linux-rebuild             # 새 config로 다시 빌드
$ make linux-update-defconfig    # output의 .config → defconfig로 추출
$ make linux-update-config       # output의 .config → custom-config로 추출
```

`linux-update-defconfig`는 *최소 옵션*만 추려 in-tree defconfig 양식으로 만들어 줍니다. `linux-update-config`는 *그대로* custom config 파일로 복사합니다. 양산 트리는 *defconfig + fragment 조합*이 가장 유지보수에 좋습니다.

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

Buildroot는 base defconfig를 `make <defconfig>`로 펼친 뒤, fragment들을 *순서대로* `scripts/kconfig/merge_config.sh`로 merge하고, `make olddefconfig`로 일관성을 보정합니다. 같은 옵션이 여러 fragment에 있으면 *뒤쪽이 이김*이라, base → rt → net 순이면 net이 마지막 결정권을 갖습니다.

기능별 분리가 장점입니다. RT를 안 쓰는 보드는 fragment 한 줄을 빼면 끝나고, base defconfig를 매번 복제해 유지하지 않아도 됩니다.

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

커널 트리를 *수정하지 않고* `.dts`를 보드 디렉터리에 두는 패턴입니다. Buildroot가 빌드 직전에 커널 트리에 복사하고 `dtc`로 컴파일합니다.

```text
BR2_LINUX_KERNEL_DTS_SUPPORT=y
BR2_LINUX_KERNEL_CUSTOM_DTS_PATH="$(BR2_EXTERNAL_FOO_PATH)/board/myboard/imx8mm-myboard.dts"
```

`.dts`는 `arch/arm64/boot/dts/freescale/`로 복사되며, `#include`는 커널 트리의 상대 경로를 기준으로 해석됩니다. 사내 DTS는 mainline DTS를 base로 포함하는 패턴이 자연스럽습니다.

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

이렇게 두면 mainline 업데이트 시 base DTS만 따라오면 사내 변경분이 자동으로 유지됩니다. 사내 DTS 파일은 *br2-external에 commit*해서 커널 트리와 분리해 두는 게 표준입니다. DTS overlay를 따로 두는 패턴은 Ch 7에서 다룹니다.

## 커널 모듈 — 외부 모듈 통합

vendor가 *out-of-tree 커널 모듈*을 별도로 줄 때가 많습니다. Wi-Fi 드라이버, GPU userspace 인터페이스, 사내 IPC 모듈 등이 흔한 사례입니다. Buildroot package로 감싸면 커널과 *동시에 빌드*되고 rootfs의 `lib/modules/<ver>/`에 자동으로 들어갑니다.

```make
# package/mywifi/mywifi.mk
MYWIFI_VERSION = 1.2.0
MYWIFI_SITE = $(call github,mycorp,mywifi,$(MYWIFI_VERSION))
MYWIFI_LICENSE = GPL-2.0
MYWIFI_LICENSE_FILES = COPYING

# 이게 핵심 — kernel-module 인프라
$(eval $(kernel-module))
$(eval $(generic-package))
```

`kernel-module` 인프라가 다음을 자동으로 처리합니다. 커널 source의 `KERNELDIR`을 환경 변수로 전달하고, `make -C $(LINUX_DIR) M=$(@D) modules`로 빌드한 뒤, `make INSTALL_MOD_PATH=$(TARGET_DIR) modules_install`로 설치하고 `depmod`로 `modules.dep`까지 생성합니다.

`Config.in`에는 보통 다음 정도가 들어갑니다.

```text
config BR2_PACKAGE_MYWIFI
    bool "mywifi"
    depends on BR2_LINUX_KERNEL
    help
      Out-of-tree Wi-Fi driver for MyCorp boards.
```

`depends on BR2_LINUX_KERNEL`이 빠지면 *커널 없이도* 모듈 빌드를 시도해 실패하는 흔한 함정에 빠집니다.

## rootfs 통합 — `lib/modules/<ver>/`

커널이 빌드되면 Buildroot가 *자동으로* `modules_install`을 호출해 rootfs에 모듈을 깐 다음 `depmod`를 실행합니다. 결과는 다음 구조입니다.

```text
output/target/lib/modules/6.6.32-mycorp/
├── kernel/
│   ├── drivers/net/wireless/...
│   └── fs/...
├── modules.alias
├── modules.builtin
├── modules.dep              ─ 의존성 그래프 (depmod 산출물)
├── modules.order
└── modules.symbols
```

부팅 후 `modprobe mywifi`가 작동하려면 *모든 파일이 다 있어야* 하고, *커널 버전 문자열*과 *디렉터리 이름*이 정확히 일치해야 합니다. `uname -r`이 `6.6.32-mycorp`인데 디렉터리가 `6.6.32`라면 modprobe가 *조용히 실패*합니다. 이 사고는 `EXTRAVERSION`이나 `LOCALVERSION`이 fragment에서 바뀌었는데 모듈 install 시점에 반영이 안 됐을 때 발생합니다. `linux-reinstall`로 한 번 더 굽는 것으로 풀립니다.

## 빌드 단계 — extract부터 reinstall까지

Buildroot의 커널 빌드는 *step별*로 나뉘어 있어 개별 호출이 가능합니다.

| target | 효과 |
|---|---|
| `linux-extract` | source tarball 풀기 / git clone |
| `linux-patch` | Buildroot patch 적용 |
| `linux-configure` | defconfig + fragments → `.config` 생성 |
| `linux-build` | `make Image dtbs modules` 수행 |
| `linux-install` | `modules_install` + `output/images/` 복사 |
| `linux-rebuild` | `linux-build`부터 다시 |
| `linux-reconfigure` | `linux-configure`부터 다시 (config 변경 반영) |
| `linux-reinstall` | `linux-install`만 다시 (rootfs 재반영) |
| `linux-menuconfig` | 현재 `.config`로 menuconfig |
| `linux-savedefconfig` | `make savedefconfig` |
| `linux-update-defconfig` | savedefconfig 결과를 트리에 복사 |
| `linux-update-config` | 현재 `.config`를 custom config 파일로 복사 |
| `linux-dirclean` | linux build 디렉터리만 삭제 |

전형적인 개발 사이클은 다음과 같습니다.

```bash
$ make linux-menuconfig            # 옵션 토글
$ make linux-rebuild               # 다시 빌드
$ make linux-reinstall             # rootfs와 output/images/ 갱신
$ make                             # 최종 rootfs 이미지 재포장
```

DTS만 바꿨다면 `linux-rebuild linux-reinstall` 한 줄로 끝납니다. config fragment를 수정했다면 *반드시* `linux-reconfigure`부터 시작해야 새 fragment가 merge됩니다. `linux-rebuild`만 부르면 *예전 .config*로 빌드해 변경이 반영되지 않습니다.

`linux-dirclean` 한 번이면 깨끗하게 처음부터 다시 빌드합니다. config가 꼬였을 때 가장 안전한 reset입니다.

## 흔한 실수

### Config fragment가 적용 안 됨

가장 흔합니다. `BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES`에 경로를 추가했는데 옵션이 안 들어간 경우, 다음을 차례로 확인합니다.

- `linux-reconfigure`를 호출했는가? `rebuild`만으로는 `.config`가 갱신되지 않습니다.
- fragment 경로가 *상대 경로*가 아닌지 확인. `$(BR2_EXTERNAL_FOO_PATH)/...` 같은 매크로를 써야 합니다.
- fragment의 옵션이 *base defconfig에서 `=n`*인 경우, 의존성 때문에 `olddefconfig`가 도로 끌 수 있습니다. `output/build/linux-*/.config`를 열어 *결과*를 확인.

### DTB가 `output/images/`에 안 들어옴

`BR2_LINUX_KERNEL_DTS_SUPPORT=y`가 꺼져 있거나, DTS 이름의 *접미사를 잘못 적은* 경우가 많습니다. `.dts` 확장자를 빼야 하고, `freescale/imx8mm-evk`처럼 서브디렉터리까지 적어야 합니다. 빌드 후 `ls output/images/*.dtb`로 검증합니다. 비어 있으면 그 보드의 DTS는 빌드되지 않은 것입니다.

### `modules.dep` 누락

부팅 후 `modprobe`가 안 먹는 사고입니다. `/lib/modules/$(uname -r)/modules.dep`가 있는지 보고, 수동 `depmod -a`가 통하면 install 시점에 빠진 것입니다. 원인은 보통 `LOCALVERSION` 불일치(앞 절 참고)이거나, custom rootfs build script에서 `modules_install` 단계를 건너뛴 경우입니다.

### Kernel headers와 toolchain 불일치

Ch 11에서 다룬 ABI 문제의 *커널 쪽* 사례입니다. External toolchain이 kernel headers 5.15로 빌드됐는데 빌드하는 커널이 6.6이면 *userspace 헤더*는 5.15에 묶입니다. glibc 패키지가 새 syscall을 쓰면 런타임에 `ENOSYS`가 납니다. 해결은 toolchain headers 버전을 커널 버전에 맞추거나, 그게 불가능하면 internal toolchain으로 전환하는 것입니다. 양산 트리에서는 매번 *headers ≤ 커널*을 검증하는 게 안전합니다.

### Vendor fork의 patch 충돌

`BR2_LINUX_KERNEL_PATCH`로 mainline patch를 얹다 보면 vendor fork와 충돌이 납니다. vendor fork가 이미 그 patch를 backport했기 때문입니다. 해결은 patch를 빼거나, `--3way` merge로 손수 풀거나, vendor 트리 자체를 bump 하는 것입니다. *patch 누적*은 1년 안에 유지보수가 어려워지므로, vendor 트리 bump가 장기 관점에서 옳습니다.

### `linux-rebuild` 후 rootfs가 안 바뀜

`linux-rebuild`만 호출하면 `output/target/lib/modules/`가 *갱신되지 않습니다*. 따라서 rootfs 이미지(`rootfs.ext4`, `rootfs.cpio`)에는 *예전 모듈*이 들어갑니다. 반드시 `linux-reinstall`을 같이 호출하고, 그 뒤 `make`로 rootfs 이미지를 다시 굽습니다.

## 정리

- 커널 customize는 *source · defconfig · DTS · modules* 네 축의 조합입니다.
- Source는 mainline LTS / custom version / custom git / custom tarball 중 선택하며, vendor fork는 `CUSTOM_GIT` + full commit hash가 표준입니다.
- defconfig는 in-tree 이름 / custom config 파일 / menuconfig 중 시작점을 고르고, 그 위에 *fragment*로 기능별 옵션을 점진 추가합니다.
- DTS는 in-tree 이름으로 골라도 되고, out-of-tree `.dts`를 `CUSTOM_DTS_PATH`로 가져와도 됩니다. mainline DTS를 `#include`로 깔고 사내 변경분만 얹는 패턴이 안전합니다.
- out-of-tree 모듈은 `kernel-module` 인프라로 감싸면 자동으로 `lib/modules/<ver>/`에 들어갑니다.
- `linux-rebuild`는 빌드만, `linux-reconfigure`는 .config 재생성, `linux-reinstall`은 rootfs 반영입니다. fragment 수정 후에는 `reconfigure`부터, 모듈을 rootfs에 반영하려면 `reinstall`을 잊지 않습니다.
- Headers ≤ 커널 버전 규칙은 toolchain·커널 사이에서도 유효합니다. external toolchain의 headers 버전이 커널보다 낮아야 syscall 사고가 없습니다.
- 양산 트리는 `linux-update-defconfig` + fragment 분리 패턴으로 유지하는 게 *변경 추적*에 가장 좋습니다.

## 다음 장 예고

다음 편은 **Ch 13: U-Boot 통합**. 같은 device tree·toolchain 위에 *부트로더*를 어떻게 정렬해 single source of truth를 유지하는지 다룹니다.


## 관련 항목

- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build) — `linux-menuconfig`가 처음 등장한 흐름
- [Ch 7: 보드 customize — br2-external과 board 디렉터리](/blog/embedded/buildroot/chapter07-board-customize) — DTS·linux.config 파일의 거주 위치
- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — kernel headers ABI 일치
- [Ch 13: U-Boot 통합 — 같은 device tree 위에서](/blog/embedded/buildroot/chapter13-uboot-integration) — 부트로더와 커널의 DTS 정렬
- [BSP Development Ch 11: 커널 포팅](/blog/embedded/bsp/chapter11-kernel-port) — BSP 관점에서 vendor fork → mainline 정렬
- [원문 — Buildroot Manual §13: Customizing the generated target filesystem](https://buildroot.org/downloads/manual/manual.html)
