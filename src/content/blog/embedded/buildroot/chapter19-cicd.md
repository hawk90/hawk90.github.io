---
title: "Buildroot CI/CD 구축 — Container Build와 Cache 공유"
slug: "embedded/buildroot/chapter19-cicd"
date: 2026-05-19T09:19:00
description: "GitLab/GitHub Actions에서 Buildroot 트리를 컨테이너로 빌드하고 dl·ccache를 팀이 공유하는 패턴."
series: "Buildroot Practical"
seriesOrder: 19
tags: [embedded, buildroot, ci-cd, docker, gitlab]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Buildroot CI는 *cache 공유*가 본체입니다."** — toolchain 30분 + image 10분이 매 PR마다 반복되면 CI 자체가 병목이 됩니다. dl·ccache·output을 어떻게 *재사용*할지가 설계의 시작입니다.

## CI에서 Buildroot의 특수성

일반 application CI는 commit 단위로 몇 분 안에 끝납니다. Buildroot는 다릅니다. 이 시리즈의 VM에서 `qemu_aarch64_virt_defconfig`를 빌드하니 40분 8초가 걸렸고(Ch 1), 그중 소스 다운로드만 합산 518초였습니다. 이걸 매 PR마다 반복하면 개발자는 commit 뒤 40분을 기다립니다. 식당이 손님마다 장을 새로 보는 셈이라, CI 설계는 *장 본 재료(dl/)와 반조리 재료(ccache)를 어디에 보관하느냐*에서 시작합니다.

이 장의 사실은 **Buildroot 2026.02.3** 저장소가 *자기 자신*을 CI로 돌리는 데 쓰는 파일(`support/docker/Dockerfile`, `utils/docker-run`, `support/misc/gitlab-ci.yml.in`)과, Ch 14에서 같은 사양의 VM으로 잰 캐시 효과에서 가져왔습니다. GitLab·GitHub 설정 예는 형식 예시이며 이 장에서 실제 러너로 돌리지 않았습니다.

## Container base image

Buildroot 프로젝트는 CI용 이미지의 Dockerfile을 트리에 둡니다. `support/docker/Dockerfile`의 요지는 다음과 같습니다.

```dockerfile
FROM debian:bookworm-20250203
...
RUN apt-get -o APT::Retries=3 install -y --no-install-recommends \
        bc \
        build-essential \
        bzr \
        ca-certificates \
        cmake \
        cpio \
        curl \
        cvs \
        file \
        ...
        git \
        libncurses5-dev \
        locales \
        mercurial \
        ...
        python3 \
        ...
        rsync \
        shellcheck \
        subversion \
        unzip \
        wget \
...
# Build host-tar
RUN curl -sfL https://ftpmirror.gnu.org/tar/tar-${TAR_VERSION}.tar.xz | \
...
RUN useradd -ms /bin/bash br-user && \
    chown -R br-user:br-user /home/br-user

USER br-user
WORKDIR /home/br-user
ENV HOME=/home/br-user
ENV LC_ALL=en_US.UTF-8
```

읽을 점은 세 가지입니다.

- **base 이미지를 날짜 태그로 고정**합니다(`debian:bookworm-20250203`). 주석은 같은 날짜의 `apt-sources.list`를 함께 고치라고 적습니다. 호스트 도구 버전이 바뀌면 빌드 결과가 바뀔 수 있기 때문입니다.
- **일반 사용자(`br-user`)로 빌드**합니다. Buildroot가 root를 거부해서가 아니라, 매뉴얼 quick start가 "you can and should *build everything as a normal user*"라고 권하기 때문입니다.
- **tar를 소스에서 빌드**합니다(`TAR_VERSION="1.35"`, 주석 "We need tar >= 1.35"). git으로 받은 소스를 재현 가능한 tarball로 묶을 때 tar 버전이 영향을 주기 때문에, 이미지가 tar 버전까지 고정합니다.

컨테이너 실행은 `utils/docker-run`이 맡습니다. `--user "$(id -u):$(id -g)"`로 호스트 사용자 권한을 쓰고, Buildroot 트리와 현재 디렉터리를 같은 경로로 bind mount하며, `BR2_DL_DIR`이 설정돼 있으면 그 디렉터리도 mount하고 환경 변수로 넘깁니다(95~97행). 이미지 이름은 `.gitlab-ci.yml`의 `image:` 줄(2026.02.3에서는 `$CI_REGISTRY/buildroot.org/buildroot/base:20250218.2110`)에서 읽습니다.

```bash
BR2_DL_DIR=/cache/dl utils/docker-run make qemu_aarch64_virt_defconfig
BR2_DL_DIR=/cache/dl utils/docker-run make
```

트리를 이미지에 넣지 않고 mount하는 구조라 PR마다 이미지를 다시 만들 필요가 없습니다.

### Buildroot 자체 CI가 defconfig마다 하는 일

`support/misc/gitlab-ci.yml.in`의 `.defconfig_base` job은 다음 순서로 돕니다.

```yaml
.defconfig_base:
    stage: test
    script:
        - DEFCONFIG_NAME=${CI_JOB_NAME}
        - OUTPUT_DIR=output
        - echo "Configure Buildroot for ${DEFCONFIG_NAME}"
        - make ${DEFCONFIG_NAME}
        - ./support/scripts/check-dotconfig.py .config ./configs/${DEFCONFIG_NAME}
        - echo 'Build buildroot'
        - *run_make
        - |
            ./support/scripts/boot-qemu-image.py "${DEFCONFIG_NAME}" > >(tee runtime-test.log) 2>&1 || {
```

`*run_make`는 `make O=${OUTPUT_DIR} world legal-info`이고, 산출물(`artifacts`)로 `.config`, `build.log`, `output/images/`, `output/build/build-time.log`, `output/build/packages-file-list.txt`를 2주간 남깁니다. 제품 CI에 그대로 가져올 만한 단계가 둘 있습니다.

1. **`check-dotconfig.py`** — defconfig의 모든 `BR2_` 줄이 펼친 `.config`에 남았는지 확인합니다. 이 시리즈의 arm64 VM에서 `beaglebone_defconfig`를 적용했더니 다음 경고로 실패했습니다.

   ```text
   WARN: defconfig configs/beaglebone_defconfig can't be used:
         Missing: BR2_TOOLCHAIN_EXTERNAL_BOOTLIN=y
         Missing: BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_ARMV7_EABIHF_GLIBC_STABLE=y
   ```

   Bootlin toolchain의 `Config.in`이 `depends on BR2_HOSTARCH = "x86_64"`라서 aarch64 호스트에서는 조용히 빠지고 다른 toolchain이 선택된 것입니다(Ch 10). Kconfig는 이런 줄을 오류 없이 지우므로, CI에서 이 검사를 돌리지 않으면 *다른 toolchain으로 빌드된 이미지*가 통과합니다.
2. **`boot-qemu-image.py`** — QEMU defconfig는 빌드 뒤 실제로 부팅해 봅니다. Ch 4에서 손으로 한 부팅을 CI가 대신합니다.

## GitLab CI 예

GitLab Runner를 docker executor로 띄운 상황을 가정합니다.

```yaml
# .gitlab-ci.yml
stages: [build, package, deploy]

variables:
  BR2_DL_DIR: "$CI_PROJECT_DIR/cache/dl"
  CCACHE_DIR: "$CI_PROJECT_DIR/cache/ccache"
  IMAGE: registry.example.com/embedded/buildroot-builder:2026.02

default:
  image: $IMAGE
  before_script:
    - mkdir -p $BR2_DL_DIR $CCACHE_DIR
    - ccache --max-size=10G
    - ccache -s

.build_template: &build_template
  stage: build
  cache:
    key: "br-cache-${BOARD}"
    paths:
      - cache/dl/
      - cache/ccache/
    policy: pull-push
  script:
    - mkdir -p cache/dl cache/ccache
    - export BR2_DL_DIR="$CI_PROJECT_DIR/cache/dl"
    - make ${BOARD}_defconfig
    - echo "BR2_CCACHE=y" >> .config
    - echo "BR2_CCACHE_DIR=$CI_PROJECT_DIR/cache/ccache" >> .config
    - make olddefconfig
    - make 2>&1 | tee build.log
    - ccache -s
  artifacts:
    name: "image-${BOARD}-${CI_COMMIT_SHORT_SHA}"
    paths:
      - output/images/
      - output/legal-info/
    expire_in: 2 weeks
    when: on_success

build:imx8mp:
  <<: *build_template
  variables:
    BOARD: imx8mp_evk

build:rpi4:
  <<: *build_template
  variables:
    BOARD: raspberrypi4_64

package:sdk:
  stage: package
  needs: [build:imx8mp]
  script:
    - make sdk
    - mv output/images/*sdk* sdk.tar.gz
  artifacts:
    paths: [sdk.tar.gz]
    expire_in: 30 days

deploy:artifacts:
  stage: deploy
  needs: [build:imx8mp, build:rpi4, package:sdk]
  script:
    - aws s3 sync output/images/ s3://artifacts.example.com/$CI_COMMIT_SHA/
  only: [main, /^release\//]
```

`cache:` directive의 key가 `br-cache-${BOARD}`인 것이 중요합니다. *commit SHA를 키로 쓰면 매번 miss*가 납니다. 보드별로 한 키를 유지하면서 안에서 dl과 ccache가 누적되도록 설계합니다. `policy: pull-push`는 job 시작 때 받고 끝날 때 다시 올립니다. dl이 거의 바뀌지 않는 job이라면 업로드 비용을 줄이기 위해 dl만 다루는 job을 따로 두고 나머지 job은 `policy: pull`로 받기만 하게 나눌 수 있습니다.

## GitHub Actions 예

GitHub Actions의 `actions/cache@v4`는 *키 기반 cache*를 제공합니다. matrix build와 자연스럽게 어울립니다.

```yaml
# .github/workflows/build.yml
name: buildroot

on:
  push: { branches: [main] }
  pull_request:

jobs:
  build:
    runs-on: ubuntu-22.04
    strategy:
      fail-fast: false
      matrix:
        board: [freescale_imx8mpevk, raspberrypi4_64, qemu_aarch64_virt]
    container:
      image: ghcr.io/example/buildroot-builder:2026.02
      options: --user 1000:1000

    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }

      - name: Restore dl cache
        uses: actions/cache@v4
        with:
          path: dl
          key: br-dl-${{ hashFiles('package/**/*.hash') }}
          restore-keys: br-dl-

      - name: Restore ccache (per board)
        uses: actions/cache@v4
        with:
          path: ccache
          key: br-ccache-${{ matrix.board }}-${{ github.sha }}
          restore-keys: br-ccache-${{ matrix.board }}-

      - name: Configure
        run: make ${{ matrix.board }}_defconfig

      - name: Build
        env:
          BR2_DL_DIR: ${{ github.workspace }}/dl
          CCACHE_DIR: ${{ github.workspace }}/ccache
        run: |
          mkdir -p dl ccache
          echo "BR2_CCACHE=y" >> .config
          echo "BR2_CCACHE_DIR=\"$CCACHE_DIR\"" >> .config
          make olddefconfig
          make CCACHE_OPTIONS="--max-size=10G" ccache-options
          make
          make ccache-stats

      - name: Upload image
        uses: actions/upload-artifact@v4
        with:
          name: image-${{ matrix.board }}
          path: output/images/
          retention-days: 14
```

`hashFiles('package/**/*.hash')`로 dl 키를 잡으면 *.hash 파일이 변할 때만 새 캐시*를 만듭니다. Buildroot는 모든 source의 hash를 *.hash 파일에 박아두기 때문에 이 키는 *실제로 dl이 바뀌어야 할 때만* 바뀝니다. 반면 ccache는 보드별로 분리합니다. 같은 source라도 *target architecture가 달라지면* object가 호환되지 않기 때문입니다.

## dl/ 캐시 공유 전략

dl/은 *source tarball 모음*입니다. 같은 source면 어떤 보드든 *내용이 동일*합니다. 그래서 공유 가치가 가장 큽니다. 팀 규모에 따라 3단계 전략을 골라 씁니다.

| 팀 규모 | 전략 | 매체 | 장점 | 단점 |
|---|---|---|---|---|
| 1인 / 단일 머신 | local volume | docker named volume | 0 설정 | 머신 떠나면 사라짐 |
| 5명 / 단일 사무실 | NFS share | `/srv/buildroot/dl` | 네트워크 빠름 | NFS 서버 관리 |
| 분산·클라우드 | object storage | S3 / GCS / R2 | 어디서나 접근 | 첫 hit는 download 시간 |

S3로 공유하는 경우 다음 같은 sync script를 PR 시작과 종료에 끼웁니다.

```bash
#!/usr/bin/env bash
# scripts/dl-cache-sync.sh
set -euo pipefail

BUCKET="s3://buildroot-cache/dl"
LOCAL="${BR2_DL_DIR:-$PWD/dl}"
MODE="${1:-pull}"

mkdir -p "$LOCAL"

case "$MODE" in
  pull)
    # 받기만 — 로컬에 없는 파일만
    aws s3 sync "$BUCKET" "$LOCAL" \
        --no-progress --only-show-errors
    ;;
  push)
    # 새로 받은 source만 업로드
    aws s3 sync "$LOCAL" "$BUCKET" \
        --no-progress --only-show-errors \
        --size-only
    ;;
  *)
    echo "usage: $0 {pull|push}"; exit 1 ;;
esac
```

`--size-only`가 핵심입니다. AWS CLI의 기본 sync 전략(`awscli/customizations/s3/syncstrategy/base.py`의 `SizeAndLastModifiedSync`)은 크기가 다르거나 *로컬 파일이 S3 객체보다 새로우면* 올립니다. 새 runner에서 받거나 만든 파일의 수정 시각이 S3 쪽보다 뒤면 내용이 같아도 다시 올라가므로, `--size-only`("Makes the size of each key the only criteria used to decide whether to sync")로 크기만 비교합니다. Ch 1 기준 1.2 GB인 `dl/`을 매번 다시 올리지 않게 됩니다.

dl/ 키 설계 두 가지 모드:

| 모드 | 키 | 장단점 |
|---|---|---|
| **Simple** | 보드명 또는 `dl-global` | 모든 source 누적. 폐기된 source도 남아 비대해짐 |
| **Hash-aware** | `hashFiles('**/*.hash')` | source set이 바뀌면 새 캐시. `restore-keys`가 없으면 새 키마다 빈 캐시로 시작 |

5명 미만 팀이면 simple로 시작합니다. 한 분기에 한 번 정도 *수동으로 비대해진 dl/*을 정리합니다.

## ccache 공유

ccache는 *object cache*입니다. source A를 compile해서 object O를 만든 결과를 기억하고, 다음에 같은 source A가 들어오면 O를 *재사용*합니다. Buildroot에서는 `BR2_CCACHE=y`로 켭니다.

Ch 14에서 같은 사양의 VM으로 잰 값이 기준입니다. 빈 캐시로 첫 빌드를 하면 hit는 19.03%이고 시간은 ccache 없는 빌드보다 오히려 길었습니다(915.60초 대 500.78초). 같은 캐시로 `make clean` 뒤 다시 빌드하면 6,825회 중 6,811회 hit(99.79%), 423.88초였습니다.

```text
Cacheable calls:    6825 / 8774 (77.79%)
  Hits:             6811 / 6825 (99.79%)
    Direct:         6367 / 6811 (93.48%)
    Preprocessed:    444 / 6811 ( 6.52%)
  Misses:             14 / 6825 ( 0.21%)
Uncacheable calls:  1949 / 8774 (22.21%)
```

CI에 의미가 있는 것은 두 가지입니다. 첫째, *캐시가 이어지지 않으면 ccache는 비용*입니다. job마다 빈 캐시로 시작하면 이득이 없고 오히려 느렸습니다. 둘째, 캐시가 이어져도 줄어드는 것은 build 단계뿐이라 clean 빌드 전체로는 15% 단축이었습니다. 이 값을 기준으로 CI의 hit율과 시간을 비교합니다.

ccache 공유의 흔한 함정 세 가지.

- **권한** — root로 만든 ccache를 non-root user로 읽으면 hit가 안 됩니다. CI에서 `--user 1000:1000`으로 고정합니다.
- **target 차이** — ccache는 컴파일러와 인자를 hash에 넣으므로 aarch64와 armv7 결과가 섞여 잘못 쓰이지는 않습니다. 다만 한 디렉터리를 나눠 쓰면 서로의 항목이 용량 한도 안에서 경쟁해 밀려나므로, CI cache 단위(키)를 보드별로 나누는 편이 hit율 관리에 유리합니다. Buildroot internal toolchain은 wrapper가 `CCACHE_COMPILERCHECK=string:<gcc 설정 hash>`를 설정해(`toolchain/toolchain-wrapper.c` 512행, hash는 `package/gcc/gcc.mk` 334행에서 계산) output 디렉터리가 달라도 같은 gcc 설정이면 같은 컴파일러로 봅니다.
- **크기 한계** — ccache의 기본 한도는 ccache 자체 설정을 따릅니다. Buildroot에서는 `BR2_CCACHE_INITIAL_SETUP`에 `--max-size` 같은 옵션을 적어 빌드 시작 때 적용하거나(`Config.in` help), `make CCACHE_OPTIONS="--max-size=5G" ccache-options`로 바꿉니다(매뉴얼 "Using ccache in Buildroot"). Ch 14의 QEMU 실측에서 캐시 디렉터리는 114 MB(기본 상한 5.0 GiB의 2.18%)였습니다.

ccache 매체 결정은 dl과 다릅니다. ccache는 *수십만 개 작은 파일*입니다. S3에 raw로 올리면 *호출 수가 폭발*합니다. tarball로 묶어서 올립니다.

```bash
# 종료 시 — ccache 디렉터리를 한 덩어리로
tar -I 'zstd -T0' -cf ccache.tar.zst -C "$CCACHE_DIR" .
aws s3 cp ccache.tar.zst "s3://buildroot-cache/ccache/${BOARD}.tar.zst"
```

zstd·LZ4·LZMA의 크기와 속도는 입력 데이터, 옵션, CPU에 따라 달라집니다. 캐시를 압축한다면 실제 runner와 cache corpus에서 크기·압축·해제 시간을 함께 측정하세요.

## matrix build — 다중 defconfig 동시

한 트리에서 보드 변형이 5 ~ 10개로 늘어나면 *순차 빌드*는 비현실적입니다. CI matrix로 *동시에* 돌립니다.

```yaml
strategy:
  fail-fast: false
  matrix:
    board:
      - imx8mp_evk        # 양산 main
      - imx8mp_dev        # 개발 보드
      - imx8mm_evk        # 라이트 모델
      - raspberrypi4_64   # 데모용
      - qemu_aarch64_virt # 회귀 테스트
```

matrix dimension은 세 가지가 일반적입니다.

| 차원 | 예 | 용도 |
|---|---|---|
| **보드 변형** | imx8mp / imx8mm / rpi4 | hardware 변형마다 image |
| **release type** | dev / production | debug ON/OFF |
| **toolchain** | gcc12 / gcc13 | upgrade 검증 |

위 표의 값으로 세 차원을 다 켜면 *3 × 2 × 2 = 12 job*이고, 빌드 하나가 Ch 1처럼 40분이면 runner가 넉넉하지 않을 때 queue가 깁니다. PR에서는 *보드 변형* 한 차원만 켜고, *release type*은 *main 브랜치 머지 시점*에만 추가로 돌리는 식으로 나눕니다.

matrix에서의 cache 공유 원칙:

- **dl/ → 전체 공유** — source는 보드와 무관. 한 캐시면 충분.
- **ccache → 보드별 분리** — target architecture가 다르면 호환 안 됨.
- **output/ → 분리** — 보드마다 다른 image.

이 시리즈의 실측으로는 QEMU defconfig의 `dl/`이 1.2 GB였고(Ch 2), BeagleBone 빌드는 같은 `dl/`을 공유해 커널·toolchain 등 다른 소스만 추가로 받았습니다(Ch 10). 보드가 늘어도 공통 패키지(busybox, gcc 소스 등)는 한 번만 받습니다.

## 자동 산출물 배포

CI 마지막 단계는 산출물을 *artifact repo*로 보내는 것입니다. 보낼 산출물은 Ch 17 (SDK), Ch 16 (OTA bundle), Ch 18 (CVE report)에서 다룬 것들의 *합집합*입니다.

| 산출물 | 위치 | 소비자 |
|---|---|---|
| `rootfs.tar.zst` / `*.img` | `output/images/` | 양산 라인 |
| `<target-tuple>_sdk-buildroot.tar.gz` | `output/images/` → `make sdk` | application 개발자 |
| `legal-info/` | `output/legal-info/` (Ch 18) | 법무 |
| SBOM JSON | `make show-info \| utils/generate-cyclonedx > sbom.json` (Ch 18) | 보안 |
| CVE report | `output/pkg-stats.json`, `pkg-stats.html` (`make pkg-stats`) | 보안 / QA |
| OTA bundle | `update.raucb` (Ch 16) | OTA 서버 |

```bash
# 산출물 묶음
TAG=$(git describe --tags --always)

aws s3 cp output/images/sdcard.img \
  "s3://artifacts.example.com/${BOARD}/${TAG}/sdcard.img"

aws s3 cp output/images/aarch64-buildroot-linux-gnu_sdk-buildroot.tar.gz \
  "s3://artifacts.example.com/sdk/${TAG}-sdk.tar.gz"

aws s3 cp sbom.json \
  "s3://artifacts.example.com/sbom/${BOARD}/${TAG}.json"

aws s3 cp output/update.raucb \
  "s3://ota.example.com/bundles/${BOARD}/${TAG}.raucb"
```

산출물에는 *항상 git tag 또는 SHA*가 들어가야 합니다. 6개월 뒤 *이 image가 어느 commit에서 나왔는지* 추적해야 할 때를 위해 필수입니다.

CI 플랫폼마다 cache·artifact 크기 한도가 있고 요금제·서버 설정에 따라 다르므로, 쓰는 플랫폼의 문서에서 현재 한도를 확인합니다. 참고로 이 시리즈의 QEMU SDK tarball은 290 MB(Ch 17), BeagleBone `sdcard.img`는 208 MiB(Ch 10)였습니다. 큰 산출물은 object storage에 두고, CI artifact에는 Buildroot 자체 CI처럼 `.config`, `build.log`, `build-time.log` 같은 메타데이터를 남기는 구성이 한도 문제를 피합니다.

## 흔한 실수

- **dl/ cache key를 git SHA로** — `key: dl-${{ github.sha }}`처럼 잡으면 commit마다 primary key가 달라 항상 miss이고, `restore-keys`가 없으면 빈 캐시로 시작합니다. actions/cache 문서(`tips-and-workarounds.md`)는 캐시가 "immutable and cannot be updated"라서 매번 갱신하려면 고유 key + `restore-keys`를 쓰라고 적습니다. dl은 `hashFiles('package/**/*.hash')`처럼 내용이 바뀔 때만 바뀌는 키가 맞습니다.
- **ccache 디렉터리 권한 불일치** — 캐시를 만든 사용자와 빌드하는 사용자가 다르면 ccache가 캐시에 쓰지 못합니다. Buildroot의 `utils/docker-run`처럼 `--user "$(id -u):$(id -g)"`로 맞춥니다.
- **artifact 크기 제한 초과** — 이미지·SDK를 CI artifact로 올리다 플랫폼 한도에 걸립니다. 큰 파일은 object storage로 보냅니다.
- **`cache: paths`가 너무 큼** — `output/` 전체를 cache에 넣으면 이 시리즈의 QEMU 빌드만으로 14 GB(Ch 1)가 매번 오갑니다. dl/과 ccache만 캐시합니다.
- **matrix의 fail-fast 기본값을 그대로 둠** — GitHub 문서는 `strategy.fail-fast`의 기본값이 `true`이고, matrix의 job 하나가 실패하면 진행 중·대기 중인 job을 모두 취소한다고 적습니다. 변형 보드 사이가 독립이라면 `fail-fast: false`로 나머지 보드 결과를 받습니다.
- **container image에 트리 포함** — base image 안에 buildroot tree를 박으면 *PR마다 image 재빌드*. 트리는 항상 *외부 mount* 또는 *checkout*.
- **defconfig 줄이 조용히 빠짐** — 호스트에 따라 선택할 수 없는 옵션이 Kconfig에서 사라집니다(Ch 10의 Bootlin toolchain). Buildroot CI처럼 `support/scripts/check-dotconfig.py`를 돌립니다.

## 정리

- Buildroot CI는 cache 공유가 *기본 설계*이지 *최적화*가 아닙니다.
- Buildroot 자체 CI 이미지는 날짜를 고정한 `debian:bookworm-20250203`에 일반 사용자 `br-user`, tar 1.35를 소스 빌드해 둡니다. 트리는 `utils/docker-run`처럼 mount합니다.
- Buildroot CI의 defconfig job은 `make <defconfig>` → `check-dotconfig.py` → `make world legal-info` → `boot-qemu-image.py` 순서이고, aarch64 호스트에서 `beaglebone_defconfig`는 `check-dotconfig.py`에 걸렸습니다.
- GitLab CI는 `cache:`에 보드별 키를 두고, 기본값 `policy: pull-push`는 job 시작 때 받고 끝날 때 올립니다. 받기만 할 job은 `policy: pull`로 나눕니다.
- GitHub Actions는 `actions/cache@v4` + `hashFiles('**/*.hash')`로 dl을 *실제 변경* 시점에만 갱신.
- dl/은 *전체 공유*, ccache는 *보드별 분리*, output/은 *job별 분리*입니다.
- 팀 규모에 따라 local volume → NFS → S3 단계로 매체를 키웁니다.
- ccache 효과는 Ch 14에서 같은 VM으로 잰 값을 기준으로 삼고, 권한·cache 키·용량 한도를 점검합니다.
- matrix build는 보드 변형 한 차원에서 시작. release type·toolchain은 main 머지 시점에만.
- 산출물은 git tag/SHA로 식별. 큰 산출물은 S3로, CI artifact는 메타데이터만.
- 흔한 함정은 SHA 키, ccache 권한, artifact 한도, `output/` 전체 캐시, fail-fast, defconfig 줄 누락입니다.

## 다음 장 예고

다음 편은 **Ch 20: Yocto로의 migration**. Buildroot로 양산한 시스템을 Yocto로 옮길 때 어떤 결정과 매핑이 필요한지를 다룹니다.


## 관련 항목

- [Ch 14: 빌드 시간 최적화 — ccache·BR2_PER_PACKAGE_DIRECTORIES·dl 공유](/blog/embedded/buildroot/chapter14-build-caching) — caching의 메커니즘 전제
- [Ch 16: OTA 업데이트 — RAUC·SWUpdate·dual-bank](/blog/embedded/buildroot/chapter16-ota) — OTA bundle을 CI에서 자동 발행
- [Ch 17: SDK 생성·배포 — make sdk와 application 워크플로](/blog/embedded/buildroot/chapter17-sdk) — SDK를 CI artifact로 자동 배포
- [Ch 18: 보안 — CVE 추적·legal-info·SBOM](/blog/embedded/buildroot/chapter18-security-cve) — CVE 스캔을 CI pipeline에 통합
- [원문 — Buildroot Manual §8.13: CI/CD considerations](https://buildroot.org/downloads/manual/manual.html)
