---
title: "Ch 2: 디렉터리 구조"
date: 2026-05-19T02:00:00
description: "Buildroot 트리 — package, board, configs, fs, output, dl 디렉터리의 역할."
series: "Buildroot Practical"
seriesOrder: 2
tags: [embedded, buildroot, directory]
draft: false
---

## 한 줄 요약

> **"Buildroot 트리는 6개의 핵심 디렉터리로 거의 모든 것을 설명할 수 있습니다."** — `package/`, `board/`, `configs/`, `fs/`, `output/`, `dl/`의 역할만 알면 빌드 어디서 무엇이 일어나는지 추적할 수 있습니다.

## 왜 디렉터리부터 보는가

Buildroot를 처음 받으면 디렉터리가 30개 가까이 됩니다. 그 중 대부분은 보조 역할이고, 정작 실무에서 거의 매일 들여다보는 디렉터리는 6개로 좁혀집니다. 이 6개의 역할을 먼저 머릿속에 그려 두면 다음 장의 Kconfig 메뉴 구조나 패키지 작성 규약이 자연스럽게 연결됩니다.

`buildroot/` 루트에서 `ls`를 찍어 보면 다음과 같습니다.

```text
$ ls buildroot/
arch/           CHANGES         configs/        DEVELOPERS      fs/
linux/          Makefile        package/        README          support/
board/          Config.in       COPYING         docs/           Makefile.legacy
boot/           system/         toolchain/      utils/
```

이 중 *바이트 크기로* 가장 무거운 것은 `package/`입니다. 2,000개가 넘는 패키지 정의가 들어 있습니다. 트리 구조부터 한눈에 보면 다음과 같습니다.

```text
buildroot/
├── Config.in               ─ 최상위 Kconfig 진입점
├── Makefile                ─ make 명령의 진짜 본체
├── package/                ─ 2,000+ 패키지 (Config.in + .mk 쌍)
├── board/                  ─ 보드별 파일 (defconfig 보조 자료)
├── configs/                ─ defconfig 카탈로그
├── fs/                     ─ rootfs 이미지 생성기
├── output/                 ─ 빌드 산물 (gitignore)
├── dl/                     ─ download cache (gitignore 권장)
├── linux/                  ─ Linux 커널 빌드 인프라
├── boot/                   ─ U-Boot, GRUB, syslinux 등
├── toolchain/              ─ toolchain 빌드/임포트
├── arch/                   ─ architecture별 cflags
├── system/                 ─ skeleton rootfs, init scripts
├── support/                ─ host-side 보조 스크립트
├── docs/                   ─ 매뉴얼 sources
└── utils/                  ─ check-package 같은 maintainer 도구
```

## package/ — 2,000개 패키지의 본거지

`package/`는 Buildroot의 *중심*입니다. 한 패키지는 한 서브디렉터리에 들어 있고, 거의 모두 두 파일의 쌍으로 정의됩니다.

```text
$ ls package/busybox/
0001-fix-build.patch  busybox-1.36.0.config  busybox.mk
busybox.hash          Config.in              S01logging
```

핵심은 다음 두 가지입니다.

- **`Config.in`** — Kconfig로 노출할 옵션을 정의합니다. menuconfig에서 보이는 체크박스, 선택 항목이 모두 여기서 옵니다.
- **`<name>.mk`** — 패키지를 *어떻게 빌드할지*를 기술합니다. version, source URL, 의존성, configure/build/install 명령 hook이 들어갑니다.

이 둘이 한 쌍이라는 규약이 Buildroot 패키지 시스템의 거의 전부입니다. Ch 5에서 상세히 다룹니다.

같은 디렉터리에 추가로 들어갈 수 있는 파일은 다음과 같습니다.

```text
0001-*.patch       ─ source에 적용할 패치 (번호 순)
<name>.hash        ─ source tarball의 SHA-256, license 파일 hash
S<NN><name>        ─ /etc/init.d에 설치할 init script
<name>.config      ─ defconfig (busybox·linux 같은 자체 Kconfig 패키지)
```

`package/`의 크기는 곧 *생태계 규모*입니다. 2,000개가 넘는다는 것은 *어지간한 라이브러리는 이미 들어 있다*는 뜻입니다.

## board/ — 보드별 자산

`board/`는 한 보드를 위한 *defconfig가 아닌 모든 자료*를 모읍니다.

```text
$ ls board/beaglebone/
genimage.cfg       post-build.sh       readme.txt       uEnv.txt
```

- **`genimage.cfg`** — SD 카드 이미지 레이아웃 (partition table, FAT boot 파티션, ext4 rootfs 파티션).
- **`post-build.sh`** — rootfs 빌드 직후 실행할 스크립트. `/etc/inittab` 수정, 추가 파일 복사 등.
- **`uEnv.txt`** — U-Boot 환경 변수 기본값.
- **`readme.txt`** — 보드에 대한 한 페이지 설명.

`board/`의 파일들은 `configs/<board>_defconfig`의 옵션 값(`BR2_ROOTFS_POST_BUILD_SCRIPT`, `BR2_ROOTFS_POST_IMAGE_SCRIPT` 등)으로 참조됩니다. 다음 표가 흔히 보는 패턴입니다.

| 보드 디렉터리 | 안에 있는 파일 | 어디서 참조 |
|---|---|---|
| `board/qemu/aarch64-virt/` | `readme.txt`, `linux.config` | `BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE` |
| `board/beaglebone/` | `genimage.cfg`, `post-build.sh`, `uEnv.txt` | `BR2_ROOTFS_POST_BUILD_SCRIPT` 등 |
| `board/raspberrypi4-64/` | `genimage-raspberrypi4-64.cfg`, `post-image.sh` | `BR2_ROOTFS_POST_IMAGE_SCRIPT` |

Ch 7에서 `BR2_ROOTFS_OVERLAY`, `POST_BUILD_SCRIPT`, `POST_IMAGE_SCRIPT` 세 hook을 상세히 다룹니다.

## configs/ — defconfig 카탈로그

`configs/`는 *그대로 시작점이 되는* defconfig 모음입니다. 한 파일이 한 보드(또는 한 시나리오)입니다.

```text
$ ls configs/ | wc -l
350+

$ ls configs/qemu_*
configs/qemu_aarch64_virt_defconfig
configs/qemu_arm_versatile_defconfig
configs/qemu_arm_vexpress_defconfig
configs/qemu_x86_64_defconfig
...

$ ls configs/beaglebone*
configs/beaglebone_defconfig
configs/beagleboneblack_qt5_defconfig
```

defconfig는 *최소 필요 옵션만* 담은 압축 형태이며, `make <name>_defconfig`로 `.config`에 풀어 넣을 수 있습니다.

```text
$ make qemu_aarch64_virt_defconfig
#
# configuration written to /buildroot/.config
#
```

이 명령은 한 줄로 *전체 Kconfig 트리*를 초기화합니다. defconfig는 git에 커밋되는 가장 중요한 산출물 중 하나이며, Ch 3 후반에 `make savedefconfig`로 *내 defconfig*를 만드는 흐름을 설명합니다.

## fs/ — 파일시스템 이미지 생성기

`fs/`는 rootfs를 *어떤 형식*으로 패키징할지에 관한 코드입니다.

```text
$ ls fs/
common.mk    cpio/       cramfs/     ext2/       initramfs/
iso9660/     jffs2/      squashfs/   tar/        ubi/        ubifs/
```

각 서브디렉터리에는 보통 두 파일이 있습니다.

```text
fs/ext2/
├── Config.in       ─ BR2_TARGET_ROOTFS_EXT2 옵션과 변형
└── ext2.mk         ─ mkfs.ext4 호출, sparse 변환 등
```

`fs/<format>` 자체는 *작은 빌더*입니다. 입력은 `target/` 디렉터리(staged rootfs)이고, 출력은 `output/images/rootfs.<format>` 파일입니다.

| 포맷 | 용도 | 쓰기 가능 |
|---|---|---|
| `ext2`, `ext4` | SD/eMMC raw rootfs | O |
| `squashfs` | 압축, read-only NAND/SPI flash | X |
| `cpio` | initramfs 빌드의 중간 단계 | (RAM 상에서만) |
| `tar` | container, OCI 이미지 base | (별도) |
| `ubifs` | NAND flash | O |
| `jffs2` | 구형 NOR/NAND | O |

여러 포맷을 *동시에* 켜면 같은 rootfs가 여러 형식으로 출력됩니다. Ch 8에서 비교를 다룹니다.

## output/ — 모든 산물의 종착지

`output/`은 빌드 산물이 들어가는 곳입니다. *반드시* `.gitignore`에 추가합니다. 내부 구조는 다음과 같습니다.

```text
output/
├── build/            ─ 패키지별 빌드 디렉터리 (busybox-1.36.0/, linux-6.6.30/, …)
├── host/             ─ host용 toolchain (cross-gcc, cross-binutils)
│   ├── bin/          ─   aarch64-buildroot-linux-gnu-gcc 등
│   ├── lib/
│   └── share/
├── staging/          ─ host/<TUPLE>/sysroot의 symlink (legacy)
├── target/           ─ rootfs를 *조립 중*인 트리
├── images/           ─ 최종 산물 (Image, rootfs.ext4, sdcard.img, …)
├── .config           ─ menuconfig의 결과
├── Makefile          ─ in-tree 빌드용 trampoline
└── per-package/      ─ per-package 모드 사용 시 패키지별 sysroot
```

가장 자주 보는 두 곳은 다음입니다.

- **`output/build/<pkg>-<version>/`** — 해당 패키지의 *압축 풀린 소스*. 빌드 실패 디버깅 시 들어갑니다.
- **`output/images/`** — flash하거나 QEMU에 던질 최종 산출물.

네 디렉터리의 역할을 한 장으로 정리하면 다음과 같습니다.

![output 디렉터리 4구역](/images/blog/buildroot/diagrams/chapter02-output-layout.svg)

빌드를 처음부터 다시 시작하고 싶을 때는 `make clean`이 *target만* 지우고, `output/host/`(toolchain)는 남깁니다. 정말 깨끗하게는 `rm -rf output/` 또는 `make distclean`을 씁니다.

## dl/ — 다운로드 캐시

`dl/`은 *다운로드받은 source tarball*의 캐시입니다. 한번 받으면 다시 안 받습니다.

```text
$ ls dl/busybox/
busybox-1.36.0.tar.bz2

$ ls dl/linux/
linux-6.6.30.tar.xz
```

`dl/`은 *여러 프로젝트 사이에 공유*할 수 있습니다. CI나 팀 빌드 서버에서는 NFS나 공유 mount로 한 캐시를 여러 트리가 가리키게 합니다.

```text
$ make BR2_DL_DIR=/mnt/shared/buildroot-dl ...
```

또는 환경 변수로 한 번에 설정합니다.

```bash
export BR2_DL_DIR=/mnt/shared/buildroot-dl
```

git에 *커밋하지는 않지만* `.gitignore`에 명시해 둡니다. 한 번 받기 시작하면 수 GB 단위입니다.

만약 회사 망 안쪽에서 외부 인터넷 접근이 제한된다면, `BR2_PRIMARY_SITE`로 *사내 미러*를 우선 사이트로 둘 수 있습니다.

```text
BR2_PRIMARY_SITE="https://mirror.corp.example.com/buildroot"
BR2_PRIMARY_SITE_ONLY=y
```

이 패턴은 보안 인증이 필요한 산업 환경에서 자주 씁니다.

## 보조 디렉터리들

핵심 6개 외에도 몇 군데는 알아두면 좋습니다.

- **`linux/`** — 리눅스 커널 빌드 인프라(`linux.mk`). 커널은 패키지가 아니라 *특수한 시민*이라 별도로 둡니다.
- **`boot/`** — U-Boot, Barebox, GRUB, syslinux, edk2 등 부트로더들. 각자 자체 디렉터리에 `Config.in`과 `.mk`를 가집니다.
- **`toolchain/`** — toolchain을 *직접 빌드*(`toolchain-buildroot/`)할지, *외부 toolchain을 임포트*(`toolchain-external/`)할지를 결정하는 코드.
- **`arch/`** — `Config.in.<arch>` 파일들. 각 architecture별 cpu 변형, ABI, instruction set 옵션.
- **`system/`** — skeleton rootfs (`/etc/inittab`, `/etc/passwd`, basic init scripts). 모든 빌드의 *베이스 트리*가 여기서 출발합니다.
- **`support/`** — 호스트 측 도구. `kconfig/` 안에는 menuconfig 바이너리 소스가 있습니다.
- **`utils/`** — `check-package`, `scancpan`, `genrandconfig` 같은 maintainer용 검증 도구.

## 한 번에 보는 빌드 흐름 — 어디서 어디로

위 디렉터리 사이를 데이터가 어떻게 흐르는지 한 줄로 정리하면 다음과 같습니다.

```text
configs/<board>_defconfig
        │  make <board>_defconfig
        ▼
   .config (root)
        │  make
        ▼
dl/<pkg>/<tarball>           ← (없으면 다운로드)
        │
        ▼
output/build/<pkg>-<ver>/    ← (압축 해제 + patch 적용)
        │  configure / build / install
        ▼
output/target/               ← (staged rootfs)
        │  fs/<format>/
        ▼
output/images/rootfs.<format>
                          + Image (linux/)
                          + u-boot.img (boot/uboot/)
                          + sdcard.img (board/<board>/genimage.cfg)
```

같은 흐름을 그림으로 보면 다음과 같습니다.

![Buildroot 빌드 데이터 흐름](/images/blog/buildroot/diagrams/chapter02-build-flow.svg)

이 흐름 한 장이 머릿속에 들어가면 빌드 어디서 실패해도 *어느 디렉터리를 봐야 하는지* 즉시 짚을 수 있습니다.

## 자주 하는 실수

- **`output/`을 git에 커밋합니다.** 절대 안 됩니다. 수 GB짜리 산물이 쌓입니다. `.gitignore`에 `output/`, `dl/`을 항상 추가하세요.
- **`buildroot/` 본체에 직접 패치를 쌓습니다.** 업그레이드가 지옥이 됩니다. 자신의 패키지·보드는 `BR2_EXTERNAL` 트리에 따로 두는 것이 옳습니다. Ch 6에서 다룹니다.
- **`dl/`을 자주 지웁니다.** 캐시가 사라지면 매 빌드마다 수백 MB를 다시 받습니다. CI에서는 *볼륨 마운트*로 영속화하세요.
- **`output/build/<pkg>/`를 손으로 수정합니다.** Buildroot가 다음 빌드 때 통째로 다시 풀어 덮어씁니다. 변경은 반드시 `package/<pkg>/0001-*.patch`로 남겨야 영구적입니다.

## 정리

- Buildroot의 핵심은 6개 디렉터리, `package/`·`board/`·`configs/`·`fs/`·`output/`·`dl/`입니다.
- `package/`는 2,000개 이상의 *패키지 레시피*가 모여 있는 본거지입니다.
- `board/`는 *defconfig 외*의 보드별 자산(이미지 레이아웃, post-build 스크립트, U-Boot env)입니다.
- `configs/`는 시작점이 되는 *defconfig 카탈로그*이며, `make <name>_defconfig`로 일괄 적용됩니다.
- `fs/`는 rootfs를 ext4·squashfs·initramfs 등 다양한 형식으로 패키징하는 *생성기*입니다.
- `output/`은 모든 산물의 종착지이며, `output/build/`와 `output/images/`를 가장 자주 봅니다.
- `dl/`은 다운로드 캐시이며, 팀 단위에서는 공유 mount로 운영하는 것이 효율적입니다.
- 본체 디렉터리에 직접 수정·패치를 쌓지 말고, 변경은 패치 파일 또는 `BR2_EXTERNAL`로 분리합니다.

다음 편은 **Ch 3: Kconfig 설정 — menuconfig와 defconfig**. `make menuconfig`의 8개 메뉴를 한 번에 둘러봅니다.

## 관련 항목

- [Ch 1: Buildroot가 푸는 문제 — Yocto와의 비교](/blog/embedded/buildroot/chapter01-problem)
- [Ch 3: Kconfig 설정 — menuconfig와 defconfig](/blog/embedded/buildroot/chapter03-kconfig)
- [Ch 5: 패키지 시스템 — .mk와 Config.in](/blog/embedded/buildroot/chapter05-package-system)
- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
