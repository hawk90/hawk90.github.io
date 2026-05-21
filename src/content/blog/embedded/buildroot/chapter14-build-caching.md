---
title: "Ch 14: 빌드 캐싱 깊이 — dl, ccache, per-package"
date: 2026-05-19T14:00:00
description: "Buildroot의 캐싱 계층 — dl/ source 캐시, ccache compile 캐시, BR2_PER_PACKAGE_DIRECTORIES와 sstate가 없는 이유."
series: "Buildroot Practical"
seriesOrder: 14
tags: [embedded, buildroot, ccache, caching, performance]
draft: false
---

## 한 줄 요약

> **"첫 빌드 30분, 두 번째 빌드 30초."** — Buildroot의 캐싱은 *세 계층*입니다. `dl/`이 다운로드를 막고, `ccache`가 컴파일을 막고, `BR2_PER_PACKAGE_DIRECTORIES`가 sysroot 오염을 막습니다. 셋 중 하나만 빠져도 두 번째 빌드가 다시 30분이 됩니다.

## 왜 캐싱이 별도의 장인가

이 시리즈 [Ch 4](/blog/embedded/buildroot/chapter04-first-build)에서 첫 빌드가 *30분에서 1시간*이 걸린다고 했습니다. 두 번째 빌드도 같다면 *개발이 불가능*합니다. 하루에 4~5번 `make`를 돌릴 텐데 매번 30분이면 *하루의 절반*이 빌드 대기로 사라집니다.

Buildroot의 두 번째 빌드는 *목표가 명확*합니다.

- **변경이 0**이면 *수 초* 안에 끝나야 합니다.
- **패키지 하나 patch 추가**면 *그 패키지만* 다시 빌드.
- **defconfig 한 줄 변경**이면 *영향받는 패키지만* 다시 빌드.
- **브랜치 전환**이면 *어쩔 수 없이 일부 재빌드*, 다만 다운로드는 0.

이 목표를 달성하려면 *세 계층의 캐시*가 모두 살아 있어야 합니다. 하나라도 누락되면 두 번째 빌드 시간이 *눈에 띄게* 늘어납니다. 이번 장은 각 계층이 *무엇을 캐싱하는지*, *어떻게 공유하는지*, *언제 무효화되는지*를 다룹니다.

## 3-layer 캐싱 모델

Buildroot의 캐시는 세 계층입니다. 각 계층이 빌드 파이프라인의 다른 단계를 막습니다.

| 계층 | 위치 | 캐싱 대상 | 무효화 시점 | 공유 가능? |
|---|---|---|---|---|
| **1. `dl/` (source)** | `BR2_DL_DIR` (기본 `dl/`) | tarball·git archive | hash mismatch | NFS·S3·named volume로 머신 간 공유 |
| **2. `ccache` (compile)** | `BR2_CCACHE_DIR` (기본 `$HOME/.buildroot-ccache`) | preprocessor 결과 → object 파일 | compiler 인자·소스 hash | 사용자 단위 공유 가능 |
| **3. `BR2_PER_PACKAGE_DIRECTORIES`** | `output/per-package/<pkg>/` | 패키지별 staging·target | 패키지 재빌드 시 | 단일 빌드 트리 내부 |

세 계층은 *독립*입니다. `dl/`이 살아 있어도 `ccache`가 비어 있으면 *컴파일은 처음부터*. `ccache`가 살아 있어도 `output/build`가 날아갔으면 *모든 패키지 unpack부터*. 캐싱 전략을 세울 때 이 세 계층을 *분리해서* 생각해야 합니다.

다음 절부터 각 계층을 깊이 들어갑니다.

## dl/ — source tarball cache

`dl/`은 Buildroot의 *download cache*입니다. 모든 패키지의 source archive가 한 곳에 모입니다.

```text
dl/
├── busybox/
│   ├── busybox-1.36.1.tar.bz2
│   └── busybox-1.36.1.tar.bz2.hash       # 검증 메타
├── linux/
│   ├── linux-6.6.32.tar.xz
│   └── linux-6.6.32.tar.xz.hash
├── openssl/
│   ├── openssl-3.2.1.tar.gz
│   └── openssl-3.2.1.tar.gz.hash
└── git-cache/
    └── linux-imx-6.6.32-2.2.0.tar.gz     # git fetch 결과를 tarball화
```

각 패키지가 `dl/<pkg>/<tarball>` 위치에 *고유 디렉터리*를 가집니다. 같은 패키지의 여러 버전을 동시에 보관할 수 있습니다(예: `linux-6.6.30.tar.xz`와 `linux-6.6.32.tar.xz`).

### Hash verification gate

다운로드가 끝나면 Buildroot가 `*.hash` 파일과 대조해 *검증*합니다. 일치하지 않으면 *빌드 실패*. 중간자 공격·corrupted mirror로부터 보호하는 1차 방벽입니다.

```text
$ cat package/openssl/openssl.hash
sha256  83c7329fe52c850677d75e5d0b0ca245309b97e8ecbcfdc1dfdc4ab9fac35b39  openssl-3.2.1.tar.gz
sha256  ee335...                                                          openssl-3.2.1.tar.gz.asc
```

`dl/`에 이미 같은 이름의 파일이 있어도 hash가 다르면 *재다운로드*합니다. 이 동작 때문에 `dl/`을 *그대로 공유*해도 안전합니다.

### Mirror 설정

`BR2_PRIMARY_SITE`와 `BR2_BACKUP_SITE`로 다운로드 우선순위를 바꿉니다.

```text
BR2_PRIMARY_SITE="https://internal-mirror.corp/buildroot-dl"
BR2_BACKUP_SITE="https://sources.buildroot.net"
BR2_PRIMARY_SITE_ONLY=n
```

`BR2_PRIMARY_SITE`가 *먼저* 시도됩니다. 사내 mirror가 있다면 여기에 설정합니다. `BR2_PRIMARY_SITE_ONLY=y`로 두면 fallback을 차단해 *오프라인 빌드*에 사용. 양산 환경에서 *upstream이 사라져도* 동일 산출물을 만들고 싶을 때 유용합니다.

### 머신 간 공유

`dl/`은 *완전히 read-only로 공유 가능*합니다. 같은 hash면 같은 파일이라는 보장이 있기 때문입니다.

```text
# NFS mount
$ mount -t nfs build-cache.corp:/srv/buildroot-dl /mnt/buildroot-dl
$ export BR2_DL_DIR=/mnt/buildroot-dl

# 또는 환경 변수로 명시
$ make BR2_DL_DIR=/mnt/buildroot-dl
```

CI에서는 다음 패턴이 표준입니다.

- **caching layer**: GitLab artifacts·GitHub Actions cache·S3 bucket에 `dl/` tarball을 저장.
- **named volume**: Docker로 빌드한다면 named volume(`buildroot-dl`)에 `dl/`을 두고 컨테이너 사이 공유.
- **shared NFS**: 자체 빌드 서버라면 NFS mount가 가장 단순.

`dl/`의 크기는 *프로젝트마다 1~5 GB*입니다. 한 번 캐싱하면 두 번째부터는 다운로드 시간이 *0초*에 가깝습니다.

## ccache — compile cache

ccache는 *컴파일러 결과*를 캐싱합니다. 같은 source + 같은 컴파일 인자 = 같은 object 파일이라는 원칙입니다.

```text
BR2_CCACHE=y
BR2_CCACHE_DIR="$(HOME)/.buildroot-ccache"
BR2_CCACHE_SIZE="5G"
BR2_CCACHE_INITIAL_SETUP=""
```

`BR2_CCACHE=y`가 켜지면 Buildroot가 host toolchain과 cross toolchain 모두에서 *gcc·g++ wrapper를 ccache로 교체*합니다. 빌드 시스템의 makefile은 *그대로*이고 ccache가 투명하게 끼어들어 캐싱합니다.

### Hit rate 확인

```text
$ ccache -s -d ~/.buildroot-ccache
cache directory                     /home/dev/.buildroot-ccache
primary config                      /home/dev/.buildroot-ccache/ccache.conf
cache size                          3.8 GB
max cache size                      5.0 GB
files in cache                      24138
cache hit (direct)                  18432
cache hit (preprocessed)            2104
cache miss                          3602
cache hit rate                      85.07 %
```

*hit rate 80% 이상*이 건강한 수치입니다. 70% 이하라면 두 가지 중 하나를 의심합니다.

- **캐시 디렉터리가 자주 비워짐** — CI에서 `~/.buildroot-ccache`를 cache step에 안 넣은 경우.
- **컴파일 인자가 자주 바뀜** — 빌드 ID·timestamp·`__FILE__` 절대 경로가 인자에 섞여 들어가면 hit rate가 0에 수렴.

### Cross-build cache key

ccache는 *컴파일러 실행 파일의 경로·hash*를 cache key의 일부로 씁니다. Buildroot는 toolchain을 *output 디렉터리 안*에 빌드하기 때문에 *output 디렉터리가 바뀌면* 같은 코드도 cache miss입니다.

```text
# 다른 output 디렉터리 → 다른 cache key
output-imx8/host/aarch64-buildroot-linux-gnu/bin/aarch64-buildroot-linux-gnu-gcc
output-rpi4/host/aarch64-buildroot-linux-gnu/bin/aarch64-buildroot-linux-gnu-gcc
```

해결책은 `CCACHE_COMPILERCHECK=content`로 *컴파일러 path 무시·content hash만 사용*. Buildroot가 기본으로 이 옵션을 켜 줍니다. 따라서 같은 toolchain 버전이라면 *여러 output 디렉터리 사이에서 ccache 공유*가 됩니다. 같은 사용자의 `$HOME/.buildroot-ccache` 하나로 모든 보드 트리가 캐시를 공유합니다.

### 크기 관리

`BR2_CCACHE_SIZE`가 한계입니다. 초과하면 LRU로 자동 evict됩니다.

```text
BR2_CCACHE_SIZE="5G"        # 일반 워크스테이션
BR2_CCACHE_SIZE="20G"       # 멀티 보드를 자주 빌드하는 CI
```

5 GB로 시작해서 hit rate가 80% 이하로 떨어지면 늘립니다.

## BR2_PER_PACKAGE_DIRECTORIES — sysroot 격리

기본 Buildroot는 모든 패키지가 *공유된 단일 staging·target 디렉터리*에 결과물을 누적합니다. 즉 패키지 A가 헤더를 설치하고, B가 그 헤더를 보고 빌드합니다.

이 모델의 함정은 *재빌드 contamination*입니다.

- 패키지 A를 *제거*해도 `output/staging`에는 A의 헤더가 남아 있음.
- 패키지 B는 A의 헤더가 *없는* 것으로 빌드돼야 하는데 *남아 있어서 다르게* 빌드됨.
- 결과적으로 *defconfig는 같은데 산출물이 다름*.

`BR2_PER_PACKAGE_DIRECTORIES=y`가 이 문제를 해결합니다.

```text
BR2_PER_PACKAGE_DIRECTORIES=y
```

각 패키지가 *자신만의 staging·target snapshot*을 받습니다.

```text
output/per-package/openssl/
├── host/         ─ openssl가 빌드될 때 보이는 host tree
└── target/       ─ openssl가 빌드될 때 보이는 target tree

output/per-package/libcurl/
├── host/         ─ libcurl가 보이는 host tree (openssl까지만 포함)
└── target/
```

패키지 B를 빌드할 때 *B의 의존성*만 *복사*해 와 sysroot로 씁니다. 의존성에 없는 패키지의 헤더·`.so`는 *보이지도 않습니다*. 결과적으로 패키지 빌드가 *defconfig가 명시한 의존성에만* 영향을 받는다는 보장이 생깁니다.

### 비용

`per-package`는 *공짜가 아닙니다*. 각 패키지 빌드 시작 시 sysroot를 *rsync로 복사*해야 합니다.

- **빌드 시간 ~10-20% 증가** — 패키지가 많을수록.
- **디스크 사용량 증가** — 의존성이 깊은 패키지가 많으면 2-3배.
- **incremental build에서 *느려질 수 있음*** — 매 패키지 빌드마다 rsync.

### 언제 켜는가

`per-package`는 *full rebuild의 reproducibility 도구*입니다. *incremental 최적화 도구가 아닙니다*. 다음 상황에 켭니다.

- **양산 빌드** — 빌드 결과가 *defconfig만으로 완전히 결정*되어야 할 때.
- **병렬 빌드** — 패키지 단위 병렬 컴파일(`-j`)에서 race condition을 막을 때.
- **bisect** — defconfig 변경 두 commit 사이를 비교할 때 contamination 차단.

개인 개발 워크스테이션에서는 *끄는 게 보통 더 빠릅니다*. 1초의 사소한 contamination이 *내가 직접 발견할 수 있는* 수준이라면 rsync 비용이 더 큽니다.

## 왜 sstate가 없는가

[Ch 20](/blog/embedded/buildroot/chapter20-yocto-migration)에서 다룰 Yocto는 *sstate-cache*라는 정교한 캐싱 메커니즘을 가집니다. 패키지의 *metadata signature*를 계산해 *완전히 같은 입력*이면 *output을 그대로 재사용*합니다. 빌드 트리를 옮겨도, branch를 전환해도 sstate가 살아 있으면 *수 초*에 끝납니다.

Buildroot는 *의도적으로 sstate를 도입하지 않았습니다*. 이유는 *설계 철학*입니다.

- **metadata signature가 어렵다** — recipe·patch·환경 변수·host 도구의 버전까지 정확히 추적해야 hash가 신뢰됩니다. Yocto는 이 추적을 위해 *complex layer system*을 갖췄지만 Buildroot의 단순한 makefile 시스템과는 어울리지 않습니다.
- **부정확한 invalidation의 위험** — sstate가 hit인데 *실제로는 변경된 입력*이 있었다면 *잘못된 binary*가 산출됩니다. embedded에서는 이 사고가 *현장에서야* 발견됩니다.
- **clean rebuild 신뢰의 가치** — Buildroot는 *full rebuild가 항상 가능*하다는 점을 강점으로 봅니다. 캐시는 *시간 단축 도구*이지 *진실의 원천*이 아닙니다.

대신 Buildroot가 강조하는 것은 두 가지입니다.

- **patch 재현성** — 모든 변경이 *트리 안의 텍스트 파일*. git이 정확하게 추적합니다.
- **clean rebuild가 가능한 시간 안에 끝남** — `dl/`·`ccache` 두 캐시가 살아 있으면 from-scratch 빌드가 *수 분*. sstate가 없어도 견딜 수 있는 수준.

이 trade-off는 *프로젝트 크기*에 따라 평가가 갈립니다. 패키지 300개 미만의 embedded 시스템에서는 Buildroot가 충분. 패키지 1000개가 넘는 desktop-class 배포라면 Yocto의 sstate가 큰 차이를 만듭니다.

## 빌드 시간 측정

캐싱 효과를 *측정*해야 어떤 계층이 작동하는지 알 수 있습니다.

### 전체 시간

가장 단순한 방법은 `time make`입니다.

```bash
$ time make
...
real    32m17.453s
user    181m22.110s
sys     12m05.882s
```

`real`이 wall clock 시간, `user`+`sys`가 총 CPU 시간. `user / real` 비율이 *병렬화 효율*입니다(8 코어에서 6에 가까우면 양호).

### Per-package 시간

Buildroot의 `make` 출력은 패키지 단위로 `>>>` prefix를 가집니다. 이 prefix를 잡아 *패키지별 시간*을 추출할 수 있습니다.

```bash
$ make 2>&1 | tee build.log
$ awk '/^>>>/ { print strftime("%H:%M:%S"), $0; fflush() }' build.log > timed.log

# 또는 단순 grep
$ grep '^>>>' build.log | head -20
>>> openssl 3.2.1 Downloading
>>> openssl 3.2.1 Extracting
>>> openssl 3.2.1 Patching
>>> openssl 3.2.1 Configuring
>>> openssl 3.2.1 Building
>>> openssl 3.2.1 Installing to staging directory
>>> openssl 3.2.1 Installing to target
```

각 단계의 timestamp 차이가 *그 단계의 시간*. 가장 오래 걸리는 패키지를 찾을 때 유용합니다.

### `BR2_TIME_TAR_GZ`와 utilities

```text
BR2_REPRODUCIBLE=y          # 재현성 위해 timestamp 고정
```

이 옵션은 *시간 측정 자체*는 아니지만, 빌드 결과의 hash가 *언제 빌드해도 같아지도록* 만듭니다. CI에서 *캐시 히트 여부*를 hash로 검증할 때 필수입니다.

`br2-builds`(Buildroot 팀이 제공하는 CI tool)는 정기 빌드의 시간·결과를 추적합니다. 큰 트리를 운영하면 자체 dashboard보다 이 도구를 따라 쓰는 게 빠릅니다.

## 시나리오별 2nd build 시간

캐싱이 살아 있다는 가정에서 *어떤 변경*이 *얼마나*의 재빌드를 유발하는지 정리합니다.

| 시나리오 | 영향 범위 | 예상 시간 (8 코어 워크스테이션) |
|---|---|---|
| **변경 0** | nothing | 5-15초 (timestamp 체크만) |
| **target rootfs 파일 1개 변경** | rootfs 재패키징만 | 30-60초 |
| **패키지 1개 patch 추가** | 그 패키지 + 의존하는 모든 패키지 | 1-5분 |
| **패키지 config 옵션 toggle** | 그 패키지 + 의존 패키지 + rootfs | 2-10분 |
| **kernel `.config` fragment 추가** | kernel만 (의존 패키지 없으면) | 5-15분 |
| **toolchain 옵션 변경** (libc·GCC 버전) | *전체 재빌드* | 30-50분 |
| **defconfig 전체 교체** | 전체 재빌드 | 30-50분 |
| **git branch 전환** (toolchain 그대로) | 영향받은 패키지들 | 10-30분 |
| **git branch 전환** (toolchain 변경 포함) | *전체 재빌드* | 30-50분 |

가장 비싼 시나리오는 *branch 전환에 toolchain 변경이 끼는 경우*입니다. 두 브랜치가 같은 toolchain을 쓴다면 *ccache가 살아남아* 두 번째 빌드가 빠릅니다. 다른 toolchain을 쓴다면 ccache는 hit가 나지만 *toolchain 자체 재빌드*가 30분.

실무 팁: *toolchain 옵션은 거의 안 바꾸도록* 트리 설계. 보드별 차이는 *kernel·rootfs·패키지 선택*으로 흡수하고 toolchain은 *프로젝트 전체에서 한 가지*로 유지합니다.

## CI에서의 전략

CI 환경은 *모든 빌드가 cold start*입니다. 캐싱이 없으면 매 PR이 30분. 다음 전략으로 5분 이하로 줄일 수 있습니다.

| 캐시 계층 | CI에서 켤지 | 이유 |
|---|---|---|
| **`dl/`** | **필수** | 다운로드 시간 0으로 줄임. 거의 모든 PR이 *같은 source tarball*을 씀. |
| **`ccache`** | **권장** | hit rate 70% 이상이면 1.5~3배 가속. 사용자별 *또는* 브랜치별 cache key. |
| **`BR2_PER_PACKAGE_DIRECTORIES`** | **OFF 권장** | CI는 *clean build가 기본*이라 rsync 비용만 추가됨. |
| **`output/`** | **상황에 따라** | 같은 머신·같은 commit family면 효과적. 다른 PR·다른 머신 사이에는 의미 없음. |

### GitHub Actions 예

```yaml
- name: Cache dl/
  uses: actions/cache@v4
  with:
    path: dl/
    key: buildroot-dl-${{ hashFiles('configs/imx8mp_defconfig') }}
    restore-keys: buildroot-dl-

- name: Cache ccache
  uses: actions/cache@v4
  with:
    path: ~/.buildroot-ccache
    key: buildroot-ccache-${{ github.ref }}-${{ github.sha }}
    restore-keys: |
      buildroot-ccache-${{ github.ref }}-
      buildroot-ccache-

- name: Build
  run: |
    echo "BR2_CCACHE=y" >> .config
    echo "BR2_CCACHE_DIR=$HOME/.buildroot-ccache" >> .config
    make olddefconfig
    make
```

`restore-keys`의 fallback이 핵심입니다. 정확한 cache key가 없으면 *가장 가까운 hit*를 찾아 *그 위에서* 빌드를 이어 갑니다.

[Ch 19](/blog/embedded/buildroot/chapter19-ci-cd)에서 CI 전략을 더 깊이 다룹니다.

## 흔한 실수

- **`ccache` 디렉터리가 cold rebuild마다 사라짐** — CI step에서 `~/.buildroot-ccache`를 cache action에 안 넣은 경우. hit rate가 *0%로 고정*돼 캐싱 자체가 무의미.
- **`dl/`을 머신마다 따로 가짐** — 빌드 서버 5대가 각자 `dl/`을 다운로드. 같은 mirror에서 같은 tarball을 5번 받음. NFS·named volume 하나로 통합하면 끝.
- **`BR2_PER_PACKAGE_DIRECTORIES`를 incremental 가속 도구로 오해** — 켜면 *더 빨라질 것*이라 기대하지만 실제는 *느려집니다*. 켜는 이유는 *reproducibility*. 빠르게 iterate하고 싶은 워크스테이션이면 *꺼야* 합니다.
- **`BR2_DL_DIR`을 `/tmp` 안에 둠** — 재부팅마다 `dl/`이 사라짐. 매번 다운로드. `BR2_DL_DIR`은 *영속적인* 경로에 두는 게 원칙.
- **`BR2_PRIMARY_SITE_ONLY=y`인데 사내 mirror가 죽음** — 빌드가 *전부 실패*합니다. fallback 차단은 *양산용 환경*에서만 켜고 *개발 환경*에서는 끕니다.
- **`BR2_CCACHE_SIZE`가 너무 작음** — 5 GB로 시작했는데 멀티 보드를 자주 빌드하면 LRU evict가 자주 일어남. hit rate가 떨어지면 20 GB로 늘립니다.
- **clean rebuild를 안 함** — 캐시만 신뢰하다 보면 *defconfig가 만든 binary*와 *지금 디스크에 있는 binary*가 다른 사고가 옴. 양산 전에는 항상 `make distclean && make`.

## 정리

- Buildroot의 캐싱은 *세 계층*입니다. `dl/`(source), `ccache`(compile), `BR2_PER_PACKAGE_DIRECTORIES`(sysroot 격리). 세 계층이 *독립*이라 따로 관리합니다.
- `dl/`은 hash로 검증되므로 *읽기 공유가 안전*합니다. NFS·S3·named volume로 머신 간 공유가 표준입니다.
- ccache는 `BR2_CCACHE=y`로 켜며 hit rate *80% 이상*이 건강한 수치입니다. `CCACHE_COMPILERCHECK=content` 덕분에 *여러 output 디렉터리가 같은 캐시*를 공유합니다.
- `BR2_PER_PACKAGE_DIRECTORIES`는 *reproducibility 도구*이며 *incremental 가속 도구가 아닙니다*. 양산·병렬·bisect에 켭니다. 일상 개발에서는 끄는 게 더 빠릅니다.
- Buildroot에 sstate가 없는 것은 *의도된 설계*. metadata signature 추적이 어려운 단순 makefile 시스템에서 부정확한 hit가 더 위험합니다.
- 가장 비싼 재빌드는 *toolchain 옵션 변경*과 *branch 전환에 toolchain 차이가 끼는 경우*. toolchain은 *프로젝트 전체에서 한 가지*로 묶는 게 정답입니다.
- CI에서는 `dl/`·`ccache`가 필수, `BR2_PER_PACKAGE_DIRECTORIES`는 OFF. `restore-keys` fallback으로 partial hit를 활용합니다.
- 캐시는 *시간 단축 도구*이지 *진실의 원천*이 아닙니다. 양산 전 한 번은 `make distclean && make`로 *cold rebuild*를 검증합니다.

## 다음 장 예고

다음 편은 **Ch 15: post-build·post-image 심화**. 산출물을 *우리 양산 라인의 모양*으로 다듬는 hook 두 종을 다룹니다.


## 관련 항목

- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build) — 첫 빌드가 왜 30분인지의 출발점
- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — toolchain 결정이 ccache hit rate에 미치는 영향
- [Ch 15: post-build·post-image 심화](/blog/embedded/buildroot/chapter15-post-build-deep) — 캐싱 다음 단계의 산출물 후처리
- [Ch 19: CI/CD 파이프라인](/blog/embedded/buildroot/chapter19-ci-cd) — 캐시 전략을 CI에 녹이는 실전
- [Ch 20: Yocto로의 마이그레이션](/blog/embedded/buildroot/chapter20-yocto-migration) — sstate와의 비교
- [원문 — Buildroot Manual §8.13: ccache](https://buildroot.org/downloads/manual/manual.html#ccache)
- [원문 — Buildroot Manual §8.14: per-package directories](https://buildroot.org/downloads/manual/manual.html#top-level-parallel-build)
