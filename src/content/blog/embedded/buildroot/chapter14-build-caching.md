---
title: "Buildroot 빌드 캐싱 분석 — dl·ccache·per-package"
slug: "embedded/buildroot/chapter14-build-caching"
date: 2026-05-19T09:14:00
description: "Buildroot의 캐싱 계층 — dl/ source 캐시, ccache compile 캐시, BR2_PER_PACKAGE_DIRECTORIES와 sstate가 없는 이유."
series: "Buildroot Practical"
seriesOrder: 14
tags: [embedded, buildroot, ccache, caching, performance]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"`dl/`은 다운로드를, ccache는 컴파일을, per-package directories는 sysroot 오염을 막는다."** — Buildroot의 캐시는 세 계층이고, 서로를 대신하지 않습니다. 이 장은 셋을 같은 VM에서 켜고 끄며 잰 값으로 설명합니다.

## 왜 캐싱이 별도의 장인가

[Ch 4](/blog/embedded/buildroot/chapter04-first-build)의 첫 빌드는 29분 50초였습니다. 변경 없는 `make`는 7초였지만, `make clean` 한 번이면 처음부터 다시 돕니다. CI처럼 매번 빈 output에서 시작하는 환경이라면 그 비용이 빌드마다 붙습니다. 장보기(다운로드), 손질(컴파일), 조리대 분리(sysroot 격리)를 각각 얼마나 아낄 수 있는지 재 봐야 어느 캐시에 투자할지 정할 수 있습니다.

측정 조건은 다음과 같습니다. **Buildroot 2026.02.3**, `qemu_aarch64_virt_defconfig`에서 toolchain만 외부 toolchain(`BR2_TOOLCHAIN_EXTERNAL=y`, 이 arm64 호스트에서는 "Arm AArch64 14.2.rel1"이 선택됨)으로 바꾸고 host QEMU를 끈 설정입니다. 모든 소스는 먼저 `make source`로 공유 `dl/`에 받아 두어(667초) 다운로드 시간을 빼고 비교했습니다. 호스트는 Ch 1과 같은 사양의 Debian 13 arm64 VM(vCPU 10, RAM 12 GB)이고, 각 수치는 한 번씩 잰 값입니다.

## 3-layer 캐싱 모델

| 계층 | 위치 | 캐싱 대상 | 무효화 시점 | 공유 |
|---|---|---|---|---|
| **1. `dl/`** | `BR2_DL_DIR` (기본 `$(TOPDIR)/dl`) | tarball·git archive | hash 불일치 | 여러 트리·머신 (환경 변수 `BR2_DL_DIR`) |
| **2. ccache** | `BR2_CCACHE_DIR` (기본 `$(HOME)/.buildroot-ccache`) | 컴파일 결과(object) | 소스·인자·컴파일러가 바뀔 때 | 같은 사용자의 여러 output |
| **3. `BR2_PER_PACKAGE_DIRECTORIES`** | `output/per-package/<pkg>/` | 패키지별 host·target 트리 | 패키지 재빌드 | 한 output 안 |

세 계층은 *독립*입니다. `dl/`이 있어도 ccache가 비어 있으면 컴파일은 처음부터이고, ccache가 있어도 `output/build`가 지워졌으면 압축 해제·configure는 다시 돕니다.

## dl/ — source tarball cache

`dl/`에는 패키지마다 디렉터리가 있고 받은 파일이 그대로 들어갑니다(Ch 2의 `dl/busybox/busybox-1.37.0.tar.bz2`). hash 파일은 `dl/`이 아니라 `package/<pkg>/<pkg>.hash`에 있습니다. git으로 받는 패키지는 `dl/<pkg>/git/` 아래 저장소와, 거기서 만든 tarball(`…-git4.tar.gz`)이 함께 남습니다.

### Hash verification gate

이미 `dl/`에 있는 파일도 매번 hash를 검사합니다. `support/download/dl-wrapper`의 주석이 규칙을 적습니다.

```text
    # If the output file already exists and:
    # - there's no .hash file: do not download it again and exit promptly
    # - matches all its hashes: do not download it again and exit promptly
    # - fails at least one of its hashes: force a re-download
    # - there's no hash (but a .hash file): consider it a hard error
```

그래서 `dl/`을 여러 트리가 공유해도, 깨진 파일은 다시 받거나 빌드를 멈춥니다. Ch 9에서 hash를 일부러 틀리게 했을 때 받은 파일이 지워지고 "Incomplete download, or man-in-the-middle (MITM) attack"으로 멈춘 것이 이 경로입니다.

### Mirror 설정

```text
BR2_PRIMARY_SITE="https://internal-mirror.corp/buildroot-dl"
BR2_BACKUP_SITE="https://sources.buildroot.net"
BR2_PRIMARY_SITE_ONLY=n
```

`BR2_PRIMARY_SITE`가 먼저 시도되고, upstream이 실패하면 `BR2_BACKUP_SITE`(기본값 `https://sources.buildroot.net`)를 씁니다. Ch 10에서 `git.ti.com`의 git fetch가 멈췄을 때 이 백업 사이트의 tarball로 빌드가 이어졌습니다. `BR2_PRIMARY_SITE_ONLY=y`는 다른 위치를 시도하지 않게 막습니다(Ch 2).

### 머신 간 공유

```bash
export BR2_DL_DIR=/mnt/buildroot-dl
```

매뉴얼은 이 환경 변수가 `.config`의 값을 덮어쓴다고 적습니다(Ch 2). 이 장의 실험도 네 개 output 디렉터리가 같은 `dl/`을 썼고, 두 번째 output부터 `download` 단계 합이 2~16초였습니다(각 output의 `build-time.log`).

## ccache — compile cache

ccache는 컴파일 결과를 캐싱합니다. 같은 소스 + 같은 인자 + 같은 컴파일러면 object를 다시 쓰는 원리입니다.

```text
BR2_CCACHE=y
BR2_CCACHE_DIR="/home/br/cc14"
```

켜면 Buildroot가 `host-ccache`(이 릴리스는 4.12.3)를 빌드해 모든 host·target 컴파일에 씁니다. 같은 output에서 두 번 빌드했습니다. 첫 빌드 뒤 통계를 지우고(`make CCACHE_OPTIONS="--zero-stats" ccache-options`), `make clean` 뒤 다시 빌드했습니다.

| 빌드 | 벽시계 | ccache hit |
|---|---:|---:|
| ccache 켬, 빈 캐시 | 915.60초 | 1,299 / 6,825 (19.03%) |
| ccache 켬, `make clean` 뒤 | **423.88초** | 6,811 / 6,825 (99.79%) |
| ccache 끔 (다른 output) | 500.78초 | — |

두 번째 빌드의 `make ccache-stats` 출력입니다.

```text
Cacheable calls:    6825 / 8774 (77.79%)
  Hits:             6811 / 6825 (99.79%)
    Direct:         6367 / 6811 (93.48%)
    Preprocessed:    444 / 6811 ( 6.52%)
  Misses:             14 / 6825 ( 0.21%)
Uncacheable calls:  1949 / 8774 (22.21%)
Local storage:
  Cache size (GiB):  0.1 /  5.0 ( 2.18%)
```

읽을 점이 셋입니다.

- **warm ccache는 캐시 없는 빌드보다 77초(15%) 빨랐습니다.** `build-time.log`의 단계 합으로 보면 build 단계가 323초에서 189초로 줄었습니다. 대신 configure는 93초에서 161초로 늘었습니다. configure 스크립트가 띄우는 작은 테스트 컴파일 대부분이 캐시 대상이 아니거나(위 "Uncacheable calls" 22%), ccache 호출 비용이 붙기 때문입니다. 압축 해제·configure·설치는 ccache가 줄이지 않습니다.
- **빈 캐시로 처음 빌드한 시간(915.60초)은 ccache 없는 빌드(500.78초)보다 길었습니다.** `host-ccache` 자체를 빌드하고 모든 결과를 캐시에 쓰는 비용이 들지만, 이 차이가 전부 그것인지는 이 실험에서 나누지 않았습니다. "ccache를 켜면 첫 빌드부터 빨라진다"는 기대는 맞지 않았습니다.
- **캐시 크기는 114 MB였습니다**(`du -sh`). 기본 상한 5.0 GiB 대비 2.18%라, 이 규모의 설정에서는 용량이 문제가 되지 않았습니다.

### Cross-build cache key

매뉴얼 "Using ccache in Buildroot"는 컴파일러 옵션에 output 디렉터리의 절대 경로가 들어가면 "building in a different output directory would lead to many cache misses"라고 설명하고, 이를 위해 `BR2_CCACHE_USE_BASEDIR`(기본값 y, "Use relative paths")를 둡니다. internal toolchain이면 하나가 더 있습니다. `package/gcc/gcc.mk` 334행이 gcc의 configure 옵션(`$(HOST_DIR)`을 `@HOST_DIR@`로 바꾼 값)과 gcc 패치를 hash해 wrapper에 넣고, `toolchain/toolchain-wrapper.c` 512행이 이를 `CCACHE_COMPILERCHECK=string:<hash>`로 설정합니다. 그래서 output 디렉터리가 달라도 같은 gcc 설정이면 같은 컴파일러로 취급됩니다. 이 hash 설정은 `gcc.mk`에 있으므로 외부 toolchain에는 적용되지 않습니다.

### 크기 관리

```bash
make CCACHE_OPTIONS="--max-size=5G" ccache-options
make CCACHE_OPTIONS="--zero-stats" ccache-options
make ccache-stats
```

매뉴얼의 예시 그대로입니다. 빌드 시작 때마다 적용할 옵션은 `BR2_CCACHE_INITIAL_SETUP`에 적습니다.

## BR2_PER_PACKAGE_DIRECTORIES — sysroot 격리

기본 Buildroot는 모든 패키지가 *하나의* `host/`·`target/`에 결과를 누적합니다. 그래서 패키지 B는 의존성에 적지 않은 패키지 A의 헤더를 *우연히* 볼 수 있습니다. A가 먼저 빌드됐다면 B는 A를 찾아 쓰고, 다른 순서나 다른 머신에서는 다르게 빌드됩니다. `BR2_PER_PACKAGE_DIRECTORIES`의 help가 첫 번째 목적으로 이것을 꼽습니다("a given package only "sees" the dependencies it has explicitly expressed").

켠 output에는 패키지마다 디렉터리가 생겼습니다.

```text
$ ls ~/opp/per-package | wc -l
34
$ ls ~/opp/per-package/busybox
host
target
```

### 비용과 효과 (실측)

per-package를 켜고 매뉴얼 "Top-level parallel build" 절대로 `make -j10`을 줬습니다.

| 설정 | 벽시계 | build 단계 합 | 디스크 |
|---|---:|---:|---|
| 기본 (ccache 없음, 패키지 순차) | 500.78초 | 323초 | `build/` 2.7 GB |
| per-package + `make -j10` | 473.13초 | 588초 | `build/` 2.7 GB + `per-package/` 1.3 GB |
| 변경 없는 재빌드 (기본) | 16.62초 | — | — |
| 변경 없는 재빌드 (per-package, `-j10`) | 12.81초 | — | — |

단계 합(588초)이 벽시계(473초)보다 큰 것은 패키지 여러 개가 동시에 돌았다는 뜻입니다. 그래도 벽시계 이득은 28초(5.5%)에 그쳤습니다. 이 설정은 패키지 안에서 이미 `BR2_JLEVEL=0`(CPU 수 + 1)으로 병렬 컴파일하고, 가장 큰 커널 빌드가 혼자 오래 돌기 때문입니다. 반면 디스크는 1.3 GB 더 들었습니다. 같은 매뉴얼 절은 이 기능을 "very experimental feature, which is known to break even in some non-unusual situations"라고 적습니다.

### 언제 켜는가

실측으로 보면 per-package의 가치는 속도보다 *격리*에 있습니다. 다음 상황에 켭니다.

- **의존성 누락을 찾을 때** — `<PKG>_DEPENDENCIES`에 빠진 패키지가 있으면 per-package 빌드에서 헤더·라이브러리를 못 찾고 실패합니다. 기본 모드에서는 우연히 통과하는 문제를 드러냅니다.
- **top-level 병렬 빌드가 필요할 때** — 패키지가 많고 서로 독립적인 설정이라면 이득이 이 실험보다 클 수 있습니다. 직접 재 보고 결정합니다.

## 왜 sstate가 없는가

[Ch 20](/blog/embedded/buildroot/chapter20-yocto-migration)에서 다룰 Yocto는 task 입력의 signature가 같으면 산출물을 재사용하는 sstate-cache를 가집니다. Buildroot에는 이에 해당하는 계층이 없습니다. 위 실험에서 warm ccache로도 423.88초가 걸린 이유가 그것입니다. 컴파일은 99.79% 캐시에서 나왔지만, 압축 해제·configure·설치·이미지 생성은 전부 다시 돌았습니다.

Buildroot 매뉴얼은 sstate를 직접 다루지 않지만, 설정 변경 추적 자체를 하지 않는 이유는 "Understanding when a full rebuild is necessary"에 있습니다. "detecting this in a completely reliable manner is very difficult, and therefore the Buildroot developers have decided to simply not attempt to do this."(Ch 1) 산출물 재사용도 같은 신뢰성 문제를 피할 수 없으므로, Buildroot는 *깨끗한 재빌드가 언제나 가능하다*는 쪽을 택한 구조로 읽을 수 있습니다.

## 빌드 시간 측정

### 전체 시간

```bash
/usr/bin/time -v make
```

Ch 1의 첫 빌드에서 `Elapsed (wall clock) time`은 29:50.42, `Percent of CPU this job got`은 404%였습니다. vCPU 10개 중 평균 4개 정도만 쓰였다는 뜻이고, 패키지 사이가 순차인 기본 모드의 한계를 보여 줍니다.

### Per-package 시간

Buildroot는 단계별 시작·끝 시각을 `output/build/build-time.log`에 남깁니다. 이 장의 단계 합(build 323초 등)도 이 파일을 합산한 것입니다.

```text
1794796643.600631705:start:download            : host-skeleton
1794796643.603095030:end  :download            : host-skeleton
1794796643.698032553:start:extract             : host-skeleton
```

`make graph-build`는 이 파일로 패키지·단계별 그래프를 그립니다. 매뉴얼은 이 타깃에 `python-matplotlib`이 필요하다고 적습니다.

### 재현성

`BR2_REPRODUCIBLE=y`는 빌드 결과를 *언제 빌드해도 같게* 만드는 옵션입니다. 시간 측정 도구는 아니며, 실제로 같은 결과가 나오는지는 Ch 18에서 확인합니다.

## 시나리오별 재빌드

이 장에서 실제로 잰 시나리오와 매뉴얼이 규칙을 정한 시나리오를 나눴습니다.

| 시나리오 | 다시 도는 범위 | 근거 |
|---|---|---|
| **변경 없음** | target 마무리·rootfs 이미지·post-image | 실측 7.41초(Ch 4), 16.62초(이 장) |
| **overlay·post-build 변경** | 위와 같음 | 매뉴얼: "a simple `make` invocation will take the changes into account" |
| **패키지 1개 `-rebuild`** | 그 패키지 build·install (이미지는 다음 `make`) | 실측 busybox 8.03초(Ch 4) |
| **커널 fragment 변경** | 커널 merge·configure·build | 실측 28.16초(Ch 12) |
| **패키지 하위 옵션 변경** | 자동으로 다시 빌드하지 않음 | 매뉴얼: "the package is not automatically rebuilt" |
| **toolchain·아키텍처 변경** | 전체 재빌드 필요 | 매뉴얼: "a complete rebuild is needed" |
| **`make clean` 후 (ccache warm)** | 모든 패키지의 압축 해제부터 | 실측 423.88초 |

패키지 옵션을 바꿨을 때 무엇을 다시 빌드할지는 Buildroot가 추적하지 않습니다. 영향이 불명확하면 해당 패키지를 `-dirclean`하거나 `make clean all`을 합니다.

## CI에서의 전략

CI는 빌드마다 빈 output에서 시작하는 경우가 많습니다. 위 실측을 CI에 옮기면 다음과 같습니다.

| 캐시 계층 | CI에서 | 이유 (실측 기준) |
|---|---|---|
| **`dl/`** | 공유 | 이 장의 `make source`만 667초였습니다. 매 job 다시 받으면 이 시간이 그대로 붙습니다 |
| **ccache** | 공유 | warm이면 clean 빌드가 500.78초 → 423.88초. 단, 캐시가 비어 있을 때는 오히려 느렸습니다 |
| **`BR2_PER_PACKAGE_DIRECTORIES`** | 의존성 검증 job에만 | 속도 이득 5.5%, 디스크 +1.3 GB, 매뉴얼상 experimental |
| **`output/`** | 같은 runner에서만 | 변경 없는 재빌드는 16초대지만, 다른 commit 사이에서는 무엇을 다시 빌드할지 Buildroot가 추적하지 않음 |

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
    make imx8mp_defconfig
    echo "BR2_CCACHE=y" >> .config
    make olddefconfig
    make
```

`restore-keys`의 fallback이 핵심입니다. 정확한 key가 없으면 가장 가까운 캐시를 받아 그 위에서 빌드합니다. 이 예는 형식 예시이며 이 장에서 실제로 돌리지 않았습니다. [Ch 19](/blog/embedded/buildroot/chapter19-cicd)에서 CI 전략을 더 다룹니다.

## 흔한 실수

- **ccache 디렉터리를 CI cache에 넣지 않음** — 매 job 빈 캐시로 시작합니다. 이 장의 실측에서 빈 캐시 빌드는 ccache 없는 빌드보다 느렸습니다.
- **`dl/`을 트리 안에 두고 `make distclean`** — `distclean`은 `$(TOPDIR)/dl`을 지웁니다(Ch 2).
- **`BR2_PER_PACKAGE_DIRECTORIES`를 가속 도구로 기대** — 이 설정에서 이득은 5.5%였고 디스크는 1.3 GB 더 들었습니다.
- **`BR2_DL_DIR`을 `/tmp` 안에 둠** — 재부팅마다 사라집니다.
- **`BR2_PRIMARY_SITE_ONLY=y`인데 사내 mirror가 죽음** — 다른 위치를 시도하지 않으므로 빌드가 멈춥니다.
- **캐시만 믿고 clean 빌드를 안 함** — 패키지 옵션 변경은 자동으로 반영되지 않습니다(Ch 1). 출시 전에는 `make clean all`로 확인합니다.

## 정리

- `dl/`은 hash로 검증되므로 공유해도 안전하고, upstream이 실패하면 `BR2_BACKUP_SITE`가 받쳐 줍니다.
- 같은 output에서 `make clean` 뒤 warm ccache 빌드는 99.79% hit로 423.88초였고, ccache 없는 빌드는 500.78초였습니다. 줄어든 것은 build 단계뿐입니다.
- 빈 캐시로 처음 빌드할 때는 915.60초로 오히려 느렸습니다.
- internal toolchain은 `CCACHE_COMPILERCHECK=string:<gcc 설정 hash>`로 output 디렉터리를 넘어 캐시를 공유하고, `BR2_CCACHE_USE_BASEDIR`가 절대 경로 차이를 없앱니다.
- per-package + `-j10`은 473.13초로 5.5% 빨랐고 디스크 1.3 GB를 더 썼습니다. 가치는 의존성 격리에 있습니다.
- Buildroot에는 sstate 같은 산출물 재사용 계층이 없어, warm ccache로도 압축 해제·configure·설치는 다시 돕니다.

## 다음 장 예고

다음 편은 **Ch 15: post-build·post-image 심화**. 산출물을 *우리 양산 라인의 모양*으로 다듬는 hook 두 종을 다룹니다.


## 관련 항목

- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build) — 첫 빌드가 왜 30분인지의 출발점
- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — toolchain 결정이 ccache hit rate에 미치는 영향
- [Ch 15: post-build·post-image 심화](/blog/embedded/buildroot/chapter15-post-build-deep) — 캐싱 다음 단계의 산출물 후처리
- [Ch 19: CI/CD 파이프라인](/blog/embedded/buildroot/chapter19-cicd) — 캐시 전략을 CI에 녹이는 실전
- [Ch 20: Yocto로의 마이그레이션](/blog/embedded/buildroot/chapter20-yocto-migration) — sstate와의 비교
- [원문 — Buildroot Manual: Using ccache in Buildroot](https://buildroot.org/downloads/manual/manual.html#ccache)
- [원문 — Buildroot Manual: Top-level parallel build](https://buildroot.org/downloads/manual/manual.html#top-level-parallel-build)
