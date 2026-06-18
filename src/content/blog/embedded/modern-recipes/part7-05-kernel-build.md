---
title: "임베디드 커널 빌드 — defconfig·menuconfig·Image·zImage"
date: 2026-04-16T09:04:00
description: "Kernel source, defconfig, menuconfig, cross-compile, module 빌드, deb/rpm 패키징까지 KBuild 전 과정을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 79
tags: [recipes, linux, kernel-build]
---

## 한 줄 요약

> **"커널 빌드 = `make defconfig` → `make menuconfig` → `make -jN` 세 줄."** 그 위에 cross-compile 변수, KBuild Makefile, packaging이 얹힙니다.

## 어떤 상황에서 쓰나

새 BSP를 받아 driver 한 줄을 켜야 할 때, vendor patch가 적용된 kernel을 직접 build해야 할 때, debug option을 켠 binary가 필요할 때 자체 build가 필요합니다. Distribution kernel을 그대로 쓰는 경우라도 module 한 개를 추가하려면 같은 source tree에서 build해야 합니다.

또 한 가지 흔한 작업은 driver 개발입니다. Out-of-tree module을 만들려면 build kernel과 같은 KBuild 시스템을 호출해야 합니다.

## 핵심 개념

빌드 흐름은 단순합니다.

1. **source 받기** — `git clone` / `tar -xJf`
2. **defconfig 선택** — `make ARCH=... <board>_defconfig`
3. **menuconfig** — `make ARCH=... menuconfig` (옵션 조정)
4. **build** — `make ARCH=... CROSS_COMPILE=... -jN`
5. **install** — `make modules_install` / 별도 target
6. **packaging** — `make deb-pkg` / `rpm-pkg`

산출물입니다.

| Path | 내용 |
|------|------|
| `arch/arm64/boot/Image` | kernel image |
| `arch/arm64/boot/dts/<vendor>/*.dtb` | device tree blob |
| `*.ko` (`find . -name '*.ko'`) | loadable modules |
| `System.map` | symbol map |
| `.config` | 현재 build config |

Cross-compile은 두 환경 변수가 핵심입니다.

```text
ARCH=arm64
CROSS_COMPILE=aarch64-linux-gnu-     # toolchain prefix
```

## 코드 / 실제 사용 예

### Source 받기

```bash
# stable kernel
git clone --depth 1 -b v6.6 https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git

# vendor BSP
git clone -b imx_5.15.71_2.2.0 https://github.com/nxp-imx/linux-imx.git
```

Stable kernel은 reference로 쓰고, vendor BSP는 실제 board용으로 씁니다. 둘은 driver와 DTB 차이가 큽니다.

### Defconfig으로 시작

```bash
cd linux
export ARCH=arm64
export CROSS_COMPILE=aarch64-linux-gnu-

make defconfig                 # generic
make imx_v8_defconfig           # vendor 제공
ls arch/arm64/configs/         # 사용 가능한 defconfig 목록
```

board별 defconfig가 가장 안전한 출발점입니다. `arch/<arch>/configs/`를 항상 확인합니다.

### menuconfig으로 조정

```bash
make menuconfig
# ncurses TUI로 옵션 토글
# / 로 검색: BME280 → Device Drivers > IIO > ...
```

원하는 옵션을 `[*]` (built-in) 또는 `[M]` (module)로 설정합니다. `M`은 `.ko`로 빌드되어 runtime 로드 가능합니다.

`make savedefconfig`으로 변경 사항을 `defconfig` 형식으로 추출할 수 있습니다.

### Build

```bash
make -j$(nproc) Image dtbs modules
# arch/arm64/boot/Image
# arch/arm64/boot/dts/<vendor>/<board>.dtb
# **/*.ko
```

`-j`는 CPU 코어 수에 맞춥니다. 64-bit ARM 빌드는 보통 8 코어에서 8~15분 정도 걸립니다.

### Module install

```bash
make INSTALL_MOD_PATH=$HOME/rootfs modules_install
# $HOME/rootfs/lib/modules/<version>/ 에 모든 .ko 복사
# modules.order, modules.dep 자동 생성
```

target rootfs에 module을 install합니다. `modprobe`가 dependency를 풀려면 `depmod -a <version>`까지 실행합니다.

### Out-of-tree module

```makefile
# Makefile
obj-m += mydrv.o

KDIR ?= /lib/modules/$(shell uname -r)/build

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean
```

```bash
# cross build
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- \
     KDIR=/work/linux-bsp modules
```

KDIR이 build kernel의 source tree를 가리키면 됩니다. 자세한 흐름은 [7-06](/blog/embedded/modern-recipes/part7-06-kernel-module)를 참조합니다.

### deb 패키지

```bash
make -j$(nproc) bindeb-pkg
# 상위 디렉토리에 linux-image-<version>_amd64.deb, linux-headers-*.deb 생성

sudo dpkg -i ../linux-image-6.6.0_*.deb
```

Debian/Ubuntu 기반 target에서는 deb-pkg가 가장 자연스럽습니다. dependency도 자동 처리됩니다.

### rpm 패키지

```bash
make rpm-pkg
# ~/rpmbuild/RPMS/aarch64/kernel-6.6.0-1.aarch64.rpm
```

Fedora/CentOS 기반에는 rpm-pkg가 표준입니다.

### 빌드 시간 줄이기

```bash
# ccache 사용
export CC="ccache aarch64-linux-gnu-gcc"

# 일부 sub-tree만 빌드
make -j8 drivers/iio/

# 미리 헤더만
make -j8 prepare modules_prepare
```

`ccache`는 같은 소스의 재컴파일을 캐시해 두 번째 빌드를 70~90% 단축시킵니다.

## 측정 / 성능 비교

| 빌드 환경 | 완전 빌드(no cache) |
|-----------|----------------------|
| 4 코어 노트북 | 45 분 |
| 16 코어 desktop | 8 분 |
| 16 코어 + ccache (재빌드) | 90 초 |

CI 환경에서는 ccache와 KBUILD output dir 분리가 시간을 크게 줄입니다.

산출물 크기 (arm64 defconfig):

| 산출물 | 크기 |
|--------|------|
| `Image` | ~20 MB |
| `Image.gz` | ~7 MB |
| `zImage` 압축률 | 약 65% |
| modules 전체 | 100~300 MB (option 따라) |

## 자주 보는 함정

> `ARCH` 또는 `CROSS_COMPILE` 누락

```bash
make defconfig          # host arch로 build됨 → x86 binary
```

cross 환경에서는 두 변수를 `export`하거나 make 인자로 매번 줍니다.

> `make oldconfig` 누락 후 재build

```text
.config가 새 옵션을 모름 → 무수한 (NEW) 질문
```

`make olddefconfig`로 새 옵션을 자동 default로 채우거나, `make oldconfig`로 하나씩 답합니다.

> Vermagic 불일치

```text
modprobe foo
Error: could not insert 'foo': Exec format error
$ modinfo foo | grep vermagic
$ uname -r
```

Module의 vermagic과 실행 중인 kernel의 vermagic이 다르면 load가 거부됩니다. Module을 빌드한 source tree와 실제 kernel이 일치해야 합니다.

> `make clean` vs `make mrproper`

```bash
make clean         # build 산출물만
make mrproper      # .config까지 삭제
```

`mrproper`는 .config를 지웁니다. 의도하지 않으면 defconfig부터 다시 시작해야 합니다.

> `INSTALL_MOD_PATH`를 root에 install

```bash
sudo make modules_install   # host의 /lib/modules에 install — 사고
```

cross build에서 `INSTALL_MOD_PATH`를 잊으면 host의 module이 덮어써집니다. 항상 명시합니다.

## 정리

- 빌드 세 줄: defconfig → menuconfig → make -jN.
- Cross build에는 `ARCH`와 `CROSS_COMPILE` 두 변수만 정확하면 됩니다.
- `savedefconfig`으로 변경 사항을 추출해 patch로 관리합니다.
- Out-of-tree module은 KDIR로 build kernel의 source tree를 가리킵니다.
- deb-pkg나 rpm-pkg로 packaging해 dependency까지 깔끔히 처리합니다.
- 빌드 시간은 ccache로 70% 이상 단축할 수 있습니다.
- Module은 vermagic이 일치해야 load 가능합니다.

다음 편은 **Kernel Module 기초**입니다. init/exit, parameter, KBuild를 정리합니다.

## 관련 항목

- [7-01: 임베디드 Linux 부팅 흐름](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)
- [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)
- [7-06: Kernel Module 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-07: 캐릭터 드라이버](/blog/embedded/modern-recipes/part7-07-char-driver)
- [7-14: 루트 파일시스템 (Buildroot 기초)](/blog/embedded/modern-recipes/part7-14-rootfs-buildroot)
