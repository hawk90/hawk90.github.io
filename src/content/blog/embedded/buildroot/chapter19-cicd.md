---
title: "Ch 19: CI/CD — container build와 cache 공유"
date: 2026-05-19T19:00:00
description: "GitLab/GitHub Actions에서 Buildroot 트리를 컨테이너로 빌드하고 dl·ccache를 팀이 공유하는 패턴."
series: "Buildroot Practical"
seriesOrder: 19
tags: [embedded, buildroot, ci-cd, docker, gitlab]
draft: false
---

## 한 줄 요약

> **"Buildroot CI는 *cache 공유*가 본체입니다."** — toolchain 30분 + image 10분이 매 PR마다 반복되면 CI 자체가 병목이 됩니다. dl·ccache·output을 어떻게 *재사용*할지가 설계의 시작입니다.

## CI에서 Buildroot의 특수성

일반 application CI는 commit 단위로 *몇 분 안에* 끝납니다. Buildroot는 다릅니다. 깨끗한 환경에서 한 보드를 처음 빌드하면 toolchain 30 ~ 50분 + base packages 10 ~ 20분 + image 5분이 합쳐져 *40분에서 한 시간*이 기본입니다. 이걸 *매 PR마다 반복*하면 개발자가 commit한 뒤 한 시간 뒤에야 결과를 받습니다.

그래서 Buildroot CI는 *cache 공유가 필수*입니다. Application CI에서 cache가 *optional 최적화*라면, Buildroot에서는 *기본 설계*입니다. 어떤 캐시를 어디에 두고, 키를 어떻게 정하고, 보드 변형 사이에서 어떻게 공유할지가 *CI 전체 시간*을 결정합니다.

이 장은 다섯 가지를 다룹니다. Container base image, GitLab CI 작성, GitHub Actions 작성, dl/ccache 공유 전략, matrix build의 5개입니다.

## Container base image

CI runner마다 의존성을 설치하면 *runner 시작 시간*이 커집니다. base image 하나를 만들어 둡니다. Ch 4에서 본 의존성 목록을 그대로 옮깁니다.

```dockerfile
# Dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    LC_ALL=C.UTF-8 LANG=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential bc rsync cpio file unzip wget cvs git mercurial \
    python3 python3-distutils ccache \
    libncurses5-dev libssl-dev gawk \
    bzip2 xz-utils zstd \
    ca-certificates locales sudo \
 && rm -rf /var/lib/apt/lists/*

RUN locale-gen en_US.UTF-8 && update-locale LANG=en_US.UTF-8

# Buildroot는 non-root 빌드를 요구. user를 만들어 둠.
RUN useradd -m -u 1000 -s /bin/bash builder
USER builder
WORKDIR /home/builder

ENV BR2_DL_DIR=/cache/dl \
    CCACHE_DIR=/cache/ccache \
    CCACHE_MAXSIZE=10G
```

요점은 세 가지입니다. 첫째, *Buildroot는 root 빌드를 거부*하므로 `builder` user를 만들어야 합니다. 둘째, `BR2_DL_DIR`와 `CCACHE_DIR`를 *컨테이너 안의 고정 경로*로 정해 두면 CI runner가 volume·cache를 *그 경로에 mount*하기만 하면 됩니다. 셋째, Buildroot 트리 자체는 image에 *넣지 않습니다*. PR마다 다르기 때문에 runtime에 git clone하거나 mount합니다.

base image 빌드와 push는 별도 pipeline에서 *주 1회* 정도로 충분합니다. Buildroot 의존성이 자주 바뀌지 않기 때문입니다.

## GitLab CI 예

GitLab Runner를 docker executor로 띄운 상황을 가정합니다.

```yaml
# .gitlab-ci.yml
stages: [build, package, deploy]

variables:
  BR2_DL_DIR: /cache/dl
  CCACHE_DIR: /cache/ccache
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
    - make ${BOARD}_defconfig
    - make BR2_CCACHE=y -j$(nproc) 2>&1 | tee build.log
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

`cache:` directive의 key가 `br-cache-${BOARD}`인 것이 중요합니다. *commit SHA를 키로 쓰면 매번 miss*가 납니다. 보드별로 한 키를 유지하면서 안에서 dl과 ccache가 누적되도록 설계합니다. `policy: pull-push`는 *시작 시 받고, 끝나면 다시 올림*. 변경이 거의 없는 dl도 매번 push하지만, GitLab cache는 차분만 올리므로 비용이 작습니다.

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
        board: [imx8mp_evk, raspberrypi4_64, qemu_aarch64_virt]
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
          ccache --max-size=10G
          make BR2_CCACHE=y -j$(nproc)
          ccache -s

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

`--size-only`가 핵심입니다. 기본 sync는 mtime을 비교하는데 CI runner마다 시간이 다르기 때문에 *항상 re-upload*가 발생합니다. size 비교로 줄이면 변경이 없는 1 GB tarball을 매번 올리지 않습니다.

dl/ 키 설계 두 가지 모드:

| 모드 | 키 | 장단점 |
|---|---|---|
| **Simple** | 보드명 또는 `dl-global` | 모든 source 누적. 폐기된 source도 남아 비대해짐 |
| **Hash-aware** | `hashFiles('**/*.hash')` | source set이 바뀌면 새 캐시. 깔끔하지만 처음마다 cold start |

5명 미만 팀이면 simple로 시작합니다. 한 분기에 한 번 정도 *수동으로 비대해진 dl/*을 정리합니다.

## ccache 공유

ccache는 *object cache*입니다. source A를 compile해서 object O를 만든 결과를 기억하고, 다음에 같은 source A가 들어오면 O를 *재사용*합니다. Buildroot에서는 `BR2_CCACHE=y`로 켭니다.

```bash
$ ccache -s
Summary:
  Hits:              12345 / 18567 (66.5 %)
    Direct:           9876
    Preprocessed:     2469
  Misses:             6222
  Cache size (GB):    7.8 / 10.0 (78.0 %)
```

목표 hit rate는 *50 ~ 70%*입니다. 첫 빌드는 0%, 두 번째 빌드부터 50% 이상이 나와야 cache가 일하는 겁니다. 30% 이하가 지속되면 무언가 잘못된 겁니다.

ccache 공유의 흔한 함정 세 가지.

- **권한** — root로 만든 ccache를 non-root user로 읽으면 hit가 안 됩니다. CI에서 `--user 1000:1000`으로 고정합니다.
- **target 차이** — aarch64 ccache와 armv7 ccache는 *섞어 쓰면 안 됩니다*. compiler flag가 다르면 object가 다르기 때문입니다. 보드별로 ccache 디렉터리를 분리합니다.
- **크기 한계** — `CCACHE_MAXSIZE`를 안 정하면 ccache가 무한 증가합니다. CI cache 용량 정책과 충돌합니다. 보통 10G가 무난합니다.

ccache 매체 결정은 dl과 다릅니다. ccache는 *수십만 개 작은 파일*입니다. S3에 raw로 올리면 *호출 수가 폭발*합니다. tarball로 묶어서 올립니다.

```bash
# 종료 시 — ccache 디렉터리를 한 덩어리로
tar -I 'zstd -T0' -cf ccache.tar.zst -C "$CCACHE_DIR" .
aws s3 cp ccache.tar.zst "s3://buildroot-cache/ccache/${BOARD}.tar.zst"
```

zstd 압축이 LZ4보다 약 30% 작고 LZMA보다 5배 빠릅니다. ccache처럼 *중복이 많은* 디렉터리에 잘 맞습니다.

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

세 차원을 다 켜면 *2 × 3 × 5 = 30 job*. CI runner pool이 충분하지 않으면 queue가 깁니다. 보통 *보드 변형* 한 차원만 켜두고, *release type*은 *main 브랜치 머지 시점*에만 추가로 돌립니다.

matrix에서의 cache 공유 원칙:

- **dl/ → 전체 공유** — source는 보드와 무관. 한 캐시면 충분.
- **ccache → 보드별 분리** — target architecture가 다르면 호환 안 됨.
- **output/ → 분리** — 보드마다 다른 image.

dl/을 전체 공유로 잡으면 *5 보드 × 600 MB = 3 GB*가 *공통 600 MB*로 줄어듭니다.

## 자동 산출물 배포

CI 마지막 단계는 산출물을 *artifact repo*로 보내는 것입니다. 보낼 산출물은 Ch 17 (SDK), Ch 16 (OTA bundle), Ch 18 (CVE report)에서 다룬 것들의 *합집합*입니다.

| 산출물 | 위치 | 소비자 |
|---|---|---|
| `rootfs.tar.zst` / `*.img` | `output/images/` | 양산 라인 |
| `sdk.tar.zst` | `output/host/` → `make sdk` | application 개발자 |
| `legal-info/` | `output/legal-info/` (Ch 18) | 법무 |
| SBOM JSON | `output/sbom.json` | 보안 |
| CVE report | `cve-check.txt` | 보안 / QA |
| OTA bundle | `update.raucb` (Ch 16) | OTA 서버 |

```bash
# 산출물 묶음
TAG=$(git describe --tags --always)

aws s3 cp output/images/sdcard.img \
  "s3://artifacts.example.com/${BOARD}/${TAG}/sdcard.img"

aws s3 cp output/sdk.tar.zst \
  "s3://artifacts.example.com/sdk/${TAG}.tar.zst"

aws s3 cp output/sbom.json \
  "s3://artifacts.example.com/sbom/${BOARD}/${TAG}.json"

aws s3 cp output/update.raucb \
  "s3://ota.example.com/bundles/${BOARD}/${TAG}.raucb"
```

산출물에는 *항상 git tag 또는 SHA*가 들어가야 합니다. 6개월 뒤 *이 image가 어느 commit에서 나왔는지* 추적해야 할 때를 위해 필수입니다.

GitLab/Actions의 *artifact 크기 제한*에 주의합니다. GitHub Actions는 한 artifact당 *2 GB*, GitLab은 *서버 설정*입니다. rootfs.img가 1.5 GB라면 어떻게든 들어가지만 1.8 GB가 되는 순간 실패합니다. *큰 산출물은 S3로*, CI artifact는 *200 MB 이하의 메타데이터*만 두는 패턴이 안전합니다.

## 흔한 실수

- **dl/ cache key를 git SHA로** — `key: dl-${{ github.sha }}` 같이 잡으면 *commit마다 새 캐시*. 항상 miss. 해결은 `hashFiles('**/*.hash')` 또는 보드별 고정 키.
- **ccache를 root 권한으로** — base image의 user가 root인데 빌드는 builder user로 돌리면 ccache가 *읽기는 되지만 쓰기는 안 됨*. hit rate 0%. `--user 1000:1000` 명시.
- **artifact 크기 제한 초과** — rootfs.img > 1 GB가 default artifact limit을 깸. S3로 우회.
- **`cache: paths` 가 너무 큼** — `output/` 전체를 cache에 넣으면 *수십 GB*가 매번 transfer. dl/과 ccache만 캐시.
- **matrix에 fail-fast 켜둠** — 한 보드 실패가 *다른 보드 빌드를 중단*시킴. embedded는 변형 보드 사이가 독립이므로 `fail-fast: false`가 정답.
- **container image에 트리 포함** — base image 안에 buildroot tree를 박으면 *PR마다 image 재빌드*. 트리는 항상 *외부 mount* 또는 *checkout*.
- **시간대 불일치** — runner 시간이 UTC인데 SBOM 생성 시간을 KST로 박으면 *동일 commit이 두 SBOM*. 항상 UTC.

| CI 플랫폼 | cache 한도 | artifact 한도 | matrix |
|---|---|---|---|
| **GitHub Actions** | 10 GB / repo (LRU 삭제) | 2 GB / artifact, 90일 | yes |
| **GitLab CI** | 서버 설정 (보통 5 GB) | 1 GB / job 기본 | parallel: matrix |
| **CircleCI** | 무제한 (가격 차등) | 5 GB / job | parameters matrix |
| **Drone** | volume mount 기반 | 외부 store 필요 | matrix |
| **self-hosted runner** | 디스크 한도 | 디스크 한도 | 모두 가능 |

규모가 커지면 *self-hosted runner + 큰 NFS*가 비용·속도 모두 유리해지는 임계점이 옵니다. 일반적으로 *동시 빌드 10개 이상*이 되면 검토할 가치가 있습니다.

## 정리

- Buildroot CI는 cache 공유가 *기본 설계*이지 *최적화*가 아닙니다.
- Base image는 Ubuntu 22.04 + 빌드 의존성. 트리는 mount/clone으로 *image 밖*에 둡니다.
- GitLab CI는 `cache:` directive에 보드별 키. `policy: pull-push`로 차분만 transfer.
- GitHub Actions는 `actions/cache@v4` + `hashFiles('**/*.hash')`로 dl을 *실제 변경* 시점에만 갱신.
- dl/은 *전체 공유*, ccache는 *보드별 분리*, output/은 *job별 분리*입니다.
- 팀 규모에 따라 local volume → NFS → S3 단계로 매체를 키웁니다.
- ccache hit rate 목표는 50 ~ 70%. 30% 이하면 권한·target 분리·MAXSIZE를 점검.
- matrix build는 보드 변형 한 차원에서 시작. release type·toolchain은 main 머지 시점에만.
- 산출물은 git tag/SHA로 식별. 큰 산출물은 S3로, CI artifact는 메타데이터만.
- 흔한 함정은 SHA 키·root ccache·artifact 한도·output 캐시 6가지입니다.

다음 편은 **Ch 20: Yocto로의 migration**. Buildroot로 양산한 시스템을 Yocto로 옮길 때 어떤 결정과 매핑이 필요한지를 다룹니다.

## 관련 항목

- [Ch 14: 빌드 시간 최적화 — ccache·BR2_PER_PACKAGE_DIRECTORIES·dl 공유](/blog/embedded/buildroot/chapter14-build-time) — caching의 메커니즘 전제
- [Ch 16: OTA 업데이트 — RAUC·SWUpdate·dual-bank](/blog/embedded/buildroot/chapter16-ota) — OTA bundle을 CI에서 자동 발행
- [Ch 17: SDK 생성·배포 — make sdk와 application 워크플로](/blog/embedded/buildroot/chapter17-sdk) — SDK를 CI artifact로 자동 배포
- [Ch 18: 보안 — CVE 추적·legal-info·SBOM](/blog/embedded/buildroot/chapter18-security) — CVE 스캔을 CI pipeline에 통합
- [원문 — Buildroot Manual §8.13: CI/CD considerations](https://buildroot.org/downloads/manual/manual.html)
