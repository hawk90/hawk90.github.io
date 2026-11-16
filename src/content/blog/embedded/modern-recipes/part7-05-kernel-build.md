---
title: "임베디드 커널 빌드 — defconfig·menuconfig·Image·deb 패키지"
slug: "embedded/modern-recipes/part7-05-kernel-build"
date: 2026-04-16T09:04:00
description: "Kernel source, defconfig, menuconfig, cross-compile, module 빌드, deb/rpm 패키징까지 KBuild 전 과정을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 79
tags: [recipes, linux, kernel-build]
topics: ["embedded"]
---

## 한 줄 요약

> **"커널 빌드 = `make defconfig` → (설정 조정) → `make -jN` 세 단계."** 그 위에 cross-compile 변수, out-of-tree module, packaging이 얹힙니다. 이 글의 숫자는 모두 Linux v6.12 arm64 `defconfig`를 실제로 빌드해서 얻은 값입니다.

## 어떤 상황에서 쓰나

새 BSP를 받아 driver 하나를 켜야 할 때, vendor patch가 들어간 커널을 직접 빌드해야 할 때, 디버그 옵션을 켠 커널이 필요할 때 커널을 직접 빌드합니다. 배포판 커널을 쓰더라도 모듈 하나를 더하려면 그 커널과 같은 설정·헤더로 빌드해야 합니다.

Out-of-tree driver를 개발할 때도 같은 빌드 시스템(Kbuild)을 부릅니다. 모듈은 자기를 빌드한 커널 트리의 설정과 구조체 배치를 그대로 가정하기 때문입니다.

## 이 글의 기준

- 소스: kernel.org `linux-6.12.tar.xz`(같은 디렉터리의 `sha256sums.asc`로 확인)
- 빌드 호스트: Debian 13 arm64 VM(QEMU `-accel hvf`, vCPU 6, RAM 8 GiB), gcc 14.2.0. 다른 빌드 작업이 같은 VM에서 함께 돌던 상태라 시간은 참고값입니다.
- 호스트와 대상이 모두 arm64라서 cross-compile 없이 빌드했습니다. 아래 cross 명령은 x86-64 호스트에서 쓰는 형태입니다.

## 핵심 개념

| 단계 | 명령 | 이 글의 결과 |
| --- | --- | --- |
| 소스 받기 | `tar xf linux-6.12.tar.xz` | — |
| 설정 시작 | `make defconfig` | `.config` 11,170줄 |
| 설정 조정 | `make menuconfig` 또는 `scripts/config` + `make olddefconfig` | 아래 예 |
| 빌드 | `make -j6 Image modules dtbs` | real 11분 22초 |
| 모듈 설치 | `make INSTALL_MOD_PATH=<dir> modules_install` | 모듈 1,309개, 디렉터리 340 MiB(`du -sh`) |
| 패키징 | `make bindeb-pkg` | `.deb` 4개 |

산출물과 크기입니다.

| Path | 내용 | 크기 |
|------|------|------|
| `arch/arm64/boot/Image` | 압축하지 않은 커널 이미지 | 38,246,912 B |
| `arch/arm64/boot/Image.gz` | `make Image.gz`. arm64의 기본 `KBUILD_IMAGE` | 13,875,801 B |
| `arch/arm64/boot/dts/**/*.dtb` | Device Tree blob | 1,191개(`<vendor>/` 바로 아래 1,173개, 한 단계 더 아래 18개) |
| `*.ko` | loadable module | 1,309개, 합계 349,575,392 B |
| `System.map` | symbol 주소표 | 7,463,165 B |
| `vmlinux` | 심볼·디버그 정보를 담은 ELF | 153,683,808 B |

`vmlinux`와 모듈이 큰 것은 v6.12 arm64 `defconfig`가 `CONFIG_DEBUG_INFO=y`로 끝나기 때문입니다(생성된 `.config` 10900행). `Image.gz`는 `gzip -n -f -9`로 만듭니다(`scripts/Makefile.lib:326-327`). arm64의 `KBUILD_IMAGE`가 `Image.gz`라서(`arch/arm64/Makefile:172`) 대상 없이 `make`만 치면 `Image.gz`까지 만듭니다.

Cross-compile에서 핵심 변수는 두 개입니다. `ARCH`를 주지 않으면 `uname -m`으로 정한 호스트 아키텍처가 기본값입니다(`Makefile:381`의 `ARCH ?= $(SUBARCH)`, `scripts/subarch.include:7`).

```text
ARCH=arm64
CROSS_COMPILE=aarch64-linux-gnu-     # toolchain prefix
```

## 코드 / 실제 사용 예

### Source 받기

```bash
# mainline release tarball
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.12.tar.xz
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/sha256sums.asc
grep " linux-6.12.tar.xz$" sha256sums.asc | sha256sum -c -

# NXP i.MX vendor tree (tag)
git clone --depth 1 -b lf-6.12.20-2.0.0 https://github.com/nxp-imx/linux-imx.git
```

Mainline은 기준으로 쓰고, vendor 트리는 실제 보드 지원(추가 driver·DTS)이 필요할 때 씁니다. NXP의 `linux-imx` 저장소는 릴리스를 `lf-<커널 버전>-<BSP 버전>` 형태의 태그로 냅니다(`git ls-remote`로 `lf-5.15.71-2.2.0`, `lf-6.12.20-2.0.0` 등을 확인).

### Defconfig로 시작

```bash
cd linux-6.12
make defconfig                     # arch/arm64/configs/defconfig
ls arch/arm64/configs/
```

v6.12 mainline의 `arch/arm64/configs/`에는 `defconfig`, `hardening.config`, `virt.config` 세 파일만 있습니다. arm64는 보드별 defconfig 대신 하나의 `defconfig`가 여러 SoC를 켜는 구조이고, 뒤의 둘은 기존 설정 위에 덧씌우는 조각입니다. 보드별 defconfig(예: NXP 트리의 `imx_v8_defconfig`)는 vendor 트리에 있습니다.

### 설정 조정과 savedefconfig

`make menuconfig`는 대화형 화면이라 그대로 기록하기 어려워, 같은 일을 `scripts/config`로 했습니다. BMP280/BME280 센서 driver를 모듈로 켭니다.

```bash
scripts/config --module CONFIG_BMP280
make olddefconfig
grep -E "^CONFIG_BMP280" .config
```

```text
CONFIG_BMP280=m
CONFIG_BMP280_I2C=m
CONFIG_BMP280_SPI=m
```

`scripts/config`는 `.config` 텍스트만 바꾸므로, `make olddefconfig`로 Kconfig를 다시 계산해야 `BMP280`이 `select`하는 `BMP280_I2C`·`BMP280_SPI`(`drivers/iio/pressure/Kconfig:35-36`)가 채워집니다. `make help`는 `olddefconfig`를 "Same as oldconfig but sets new symbols to their default value without prompting"으로 설명합니다. 바뀐 설정을 남길 때는 `make savedefconfig`로 기본값과 다른 항목만 담은 `defconfig`(이 경우 1,686줄)를 만듭니다.

다만 이 파일을 원래 `arch/arm64/configs/defconfig`와 `diff`하면 `CONFIG_BMP280=m` 한 줄만 다르지 않았습니다. 순서만 바뀐 줄과, 다른 옵션이 `imply`해서 기본값이 된 줄(`CONFIG_UNIX=y`, `CONFIG_INET=y` 등. `CONFIG_NET_9P_FD`가 둘을 `imply`합니다, `net/9p/Kconfig:19-22`)이 함께 사라지거나 옮겨졌습니다. 그래서 변경 이력을 남기려면 savedefconfig 결과끼리, 즉 바꾸기 전과 후를 모두 savedefconfig로 만들어 비교해야 원하는 차이만 보입니다.

### Build

```bash
make -j6 Image modules dtbs
```

```text
real	11m22.550s
user	53m26.111s
sys	4m47.814s
```

`-j`는 동시에 돌릴 작업 수입니다. 이 실행에서는 user 시간이 real의 약 4.7배였습니다. 위 기준에 적은 대로 다른 작업과 VM을 나눠 쓰던 상태의 값이라, 다른 기계의 빌드 시간을 이 숫자로 예상할 수는 없습니다.

### Module install

```bash
make INSTALL_MOD_PATH=/root/p7/rootfs modules_install
ls /root/p7/rootfs/lib/modules/6.12.0/
```

```text
build
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
modules.order
modules.softdep
modules.symbols
modules.symbols.bin
modules.weakdep
```

`modules_install`은 마지막에 `depmod`를 직접 부릅니다(출력의 `DEPMOD  /root/p7/rootfs/lib/modules/6.12.0`, `scripts/Makefile.modinst:128-135`). 그래서 `modules.dep`가 이미 생겼고, 따로 `depmod -a`를 칠 필요가 없습니다. `build`는 빌드 트리(`/root/linux-6.12`)를 가리키는 symlink라서, 이 디렉터리를 대상 보드에 그대로 복사하면 대상에서는 깨진 링크가 됩니다.

### Out-of-tree module

```makefile
obj-m += mydrv.o

KDIR ?= /lib/modules/$(shell uname -r)/build

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean
```

`KDIR`이 *모듈을 올릴 커널*을 빌드한 트리(또는 그 커널의 headers 패키지)를 가리켜야 합니다. [7-03](/blog/embedded/modern-recipes/part7-03-device-tree-basics)의 demo 모듈은 `KDIR=/root/linux-6.12`로 이 글의 트리에 맞춰 빌드했습니다. Cross build라면 같은 명령에 `ARCH`와 `CROSS_COMPILE`을 더합니다.

```bash
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- KDIR=/work/linux-6.12
```

자세한 흐름은 [7-06](/blog/embedded/modern-recipes/part7-06-kernel-module)에서 다룹니다.

### deb 패키지

```bash
make -j6 bindeb-pkg
stat -c '%s %n' ../*.deb
```

```text
8379776 /root/linux-headers-6.12.0_6.12.0-2_arm64.deb
88000844 /root/linux-image-6.12.0-dbg_6.12.0-2_arm64.deb
28705900 /root/linux-image-6.12.0_6.12.0-2_arm64.deb
1370568 /root/linux-libc-dev_6.12.0-2_arm64.deb
```

이미 빌드한 트리에서 real 1분 52초가 걸렸고, `.deb`는 소스 트리의 상위 디렉터리에 생겼습니다. `CONFIG_DEBUG_INFO=y`라서 디버그 심볼만 담은 `-dbg` 패키지가 따로 나왔습니다(`scripts/package/mkdebian:242`). 패키지 버전의 `-2`는 `scripts/build-version`이 낸 빌드 번호입니다(`scripts/package/mkdebian:155`). 대상에 설치하는 `dpkg -i`는 이 VM의 부팅 커널을 바꾸게 되어 실행하지 않았습니다.

### rpm 패키지

`make help`는 `rpm-pkg`를 "Build both source and binary RPM kernel packages"로 설명합니다. 이 VM에는 `rpmbuild`가 없어 실행하지 않았습니다.

### 빌드 시간 줄이기

`ccache`는 같은 입력의 컴파일 결과를 캐시합니다. `drivers/iio/` 아래 오브젝트를 지우고 다시 빌드하는 작은 실험을 했습니다(ccache 4.11.2, 빈 `CCACHE_DIR`에서 시작, 각 실행 전에 `ccache -z`로 통계를 비움). 이미 빌드된 트리에서 아무것도 바뀌지 않았을 때 같은 명령이 걸린 시간(no-op)도 함께 쟀습니다. Kbuild가 트리 전체의 의존성을 확인하는 고정 비용이 이 값입니다.

```bash
find drivers/iio -name "*.o" -delete
make -j6 drivers/iio/                      # plain gcc
make -j6 CC="ccache gcc" drivers/iio/      # cold cache (after deleting again)
make -j6 CC="ccache gcc" drivers/iio/      # warm cache (after deleting again)
```

| 실행 | real | ccache hits / misses |
| --- | ---: | --- |
| no-op (변경 없음) | 0.304 s | — |
| `gcc` | 2.329 s | — |
| `ccache gcc`, 빈 캐시 | 5.461 s | 24 / 109 |
| `ccache gcc`, 채운 캐시 | 0.310 s | 63 / 0 |

빈 캐시에서는 결과를 저장하는 비용 때문에 plain `gcc`보다 느렸고, 채운 캐시에서는 모든 호출이 hit이 되어 no-op과 거의 같은 시간이 걸렸습니다. 이 디렉터리에서 다시 만든 오브젝트는 45개였습니다. 지우기 전에는 74개였는데, 차이 29개는 모듈용 오브젝트입니다. 이 실험에서 디렉터리 대상은 built-in 오브젝트만 다시 만들었고 모듈 오브젝트와 `.ko`는 만들지 않았습니다. `.ko` 링크에 필요한 modpost는 `modules`나 `<경로>.ko` 같은 대상에서 돕니다(최상위 `Makefile:1904-1918`). 그래서 실험 뒤 `make modules`로 모듈을 다시 만든 다음에 `modules_install`을 했습니다. 그 전에 `modules_install`을 했더니 `No rule to make target ... imx8qxp-adc.ko`로 멈췄습니다. 전체 빌드에서의 효과는 바뀐 파일의 비율로 정해지므로 이 작은 실험으로 일반화하지 않습니다.

## 측정 / 성능 비교

이 글에서 잰 값은 위 표들에 모두 있습니다. 한 번씩 잰 값이고, 같은 VM에 다른 작업이 돌던 상태였습니다. 다른 코어 수나 ccache 조건의 빌드 시간은 재지 않았습니다.

## 자주 보는 함정

> ⚠️ `ARCH` 없이 cross 설정

`ARCH`의 기본값은 호스트의 `uname -m`에서 유도한 값입니다(`x86_64`→`x86`, `aarch64`→`arm64`, `scripts/subarch.include:7-13`). x86-64 PC에서 `make defconfig`를 하면 x86 설정이 만들어집니다. Cross 환경에서는 `ARCH`와 `CROSS_COMPILE`을 `export`하거나 make 인자로 매번 줍니다.

> ⚠️ 새 커널 소스에 옛 `.config`

옛 `.config`를 새 소스에 복사한 뒤 `make oldconfig`를 하면 새로 생긴 항목마다 질문이 나옵니다. 기본값으로 채우려면 `make olddefconfig`를 씁니다.

> ⚠️ 다른 커널용으로 빌드한 모듈

이 글의 v6.12 트리로 빌드한 모듈(`vermagic: 6.12.0 SMP preempt mod_unload aarch64`)을 Debian 커널(`6.12.116+deb13-arm64`)에 올렸습니다.

```text
insmod: ERROR: could not insert module /root/p7/703/src/demo_v2.ko: Invalid module format
[ 3671.622591] module demo_v2: .gnu.linkonce.this_module section size must match the kernel's built struct module size at run time
```

버전 문자열을 비교하기 전에, 모듈 안의 `struct module` 크기가 실행 중인 커널과 달라 거부됐습니다. `load_module()`은 ELF 검사(`elf_validity_cache_copy()`, 이 메시지가 `kernel/module/main.c:1890`)를 먼저 하고, `version magic ... should be ...` 비교(`:2108`)는 그 뒤의 `check_modinfo()`에서 합니다(`:2883`, `:2887`, `:2839`). 모듈은 올릴 커널을 빌드한 트리나 그 커널의 headers 패키지로 빌드해야 합니다.

> ⚠️ `make clean`과 `make mrproper`

`make help` 기준으로 `clean`은 "Remove most generated files but keep the config", `mrproper`는 "Remove all generated files + config + various backup files"입니다. `mrproper`는 `.config`까지 지우므로 설정을 따로 저장해 두지 않았다면 처음부터 다시 맞춰야 합니다.

> ⚠️ `INSTALL_MOD_PATH` 없이 `modules_install`

`INSTALL_MOD_PATH`를 주지 않으면 빌드 호스트의 `/lib/modules/<버전>/`에 설치합니다. Cross 빌드라면 호스트에 다른 아키텍처의 모듈이 섞입니다. 대상 rootfs 경로를 항상 명시합니다.

## 정리

- 빌드는 `defconfig` → 설정 조정 → `make -jN` 순서입니다. 이 글의 v6.12 arm64 `defconfig` 빌드는 6 vCPU에서 real 11분 22초였습니다.
- `ARCH` 기본값은 호스트 아키텍처이고, cross 빌드는 `ARCH`와 `CROSS_COMPILE`이 정합니다.
- 설정 변경은 `scripts/config`/`menuconfig` 뒤 `olddefconfig`로 의존 항목을 채우고, 비교는 savedefconfig끼리 합니다.
- `modules_install`은 `depmod`까지 하고, `build` 링크는 빌드 호스트 경로를 가리킵니다.
- `bindeb-pkg`는 이미 빌드한 트리에서 image·headers·libc-dev·dbg 네 패키지를 만들었습니다.
- ccache는 같은 입력을 다시 컴파일할 때만 빨라졌고(채운 캐시 0.310 s, no-op 0.304 s), 빈 캐시에서는 plain `gcc`보다 느렸습니다.
- 다른 커널용 모듈은 `Invalid module format`으로 거부됩니다.

다음 편은 **Kernel Module 기초**입니다. init/exit, parameter, KBuild를 정리합니다.

## 관련 항목

- [7-01: i.MX8M Mini EVK Linux 부팅 흐름](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)
- [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)
- [7-06: Kernel Module 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-07: 캐릭터 드라이버](/blog/embedded/modern-recipes/part7-07-char-driver)
- [7-14: 루트 파일시스템 (Buildroot 기초)](/blog/embedded/modern-recipes/part7-14-rootfs-buildroot)
