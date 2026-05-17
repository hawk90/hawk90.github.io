---
title: "Yocto Deep Dive — Storyboard"
date: 2026-10-01T00:00:00
description: "Yocto/OpenEmbedded 시리즈 설계 문서 — 공식 manual + 2026 LTS 기준 재정리"
tags: [yocto, bitbake, openembedded, storyboard, internal]
draft: true
---

# Yocto Deep Dive — Storyboard

## 시리즈 목표

**책이 아닌 *공식 문서 + 현재 LTS* 기준 시리즈**. Streif 책(2016)이나 다른 책들은 *수년 된 스냅샷*이라 override syntax 의무화·SBOM·scarthgap LTS 등 *주요 변화*가 빠짐. Yocto는 release마다 큰 변화가 있는 *살아있는 빌드 시스템*이라 책으로 묶이지 않음.

### 1차 자료

- **Yocto Project Mega-Manual** — Overview / Reference / Dev Tasks / SDK / Kernel / BSP / Profiling / Test / Migration
- **BitBake User Manual**
- **OpenEmbedded-Core Manual**
- **Yocto Project Release Notes** (kirkstone → nanbield → scarthgap)
- **OpenEmbedded Layer Index** (layers.openembedded.org)
- ELC / Embedded Open Source Summit Yocto track

### 기준 시점 (2026-05)

- LTS: **scarthgap** (5.0, 2024.4 release) — 4년 지원
- 직전 LTS: **kirkstone** (4.0, 2022.4 release) — 활발한 BSP 다수
- Override syntax: scarthgap부터 *코론 의무* (`OVERRIDES = "x:y"`)
- 컴플라이언스: SBOM (SPDX) export, CVE check 표준 워크플로우
- 신규: meta-virtualization, meta-security, meta-rust 활발

### 분량·시각

- 챕터당 500~700줄
- 챕터당 3~4개 TikZ 다이어그램 (DAG, layer 적층, build flow, sstate cache 흐름)
- *실측 명령 출력* 첨부 (`bitbake -g`, `bitbake -e`, devtool)

## 시리즈 구성 — 6 Part / ~18 챕터

### Part 1: 개념 — *왜 / 무엇 / 어떻게 다른가*

**Ch 1: 임베디드 Linux와 Yocto의 위치** *(현재 작성 중, 책 기반 → 공식 문서 기준으로 재정리)*
- 임베디드 Linux의 일반 구조 (bootloader / kernel / rootfs / app)
- Distro vs Build system 구분 (Debian = distro, Yocto = 빌드 시스템)
- 대안 비교 — Buildroot / OpenWRT / 그냥 Debian on ARM
- Yocto가 선택받는 시나리오 (제품·BSP·license 컴플라이언스)

**Ch 2: Yocto Project ≠ Distribution**
- Yocto Project = 툴(BitBake) + 메타데이터(OE-Core, meta-yocto) + reference distro(Poky)
- OpenEmbedded와의 관계 — OE-Core / BitBake / Poky 분리 역사
- Release cadence (LTS / interim), kirkstone↔nanbield↔scarthgap 차이
- 학습 곡선이 가파른 *근본 이유* — 메타데이터·DSL·인덱스의 3중 추상화

**Ch 3: Layer 모델과 BSP / DISTRO / MACHINE 분리**
- Layer 적층 — meta-* 디렉토리, `bblayers.conf`
- BSP layer / DISTRO layer / Application layer 책임 분리
- MACHINE = HW, DISTRO = policy, IMAGE = artifact 3축
- Layer compatibility (`LAYERSERIES_COMPAT`), index 검색
- 2026 변화: layer 의존성 자동 해결 도구

### Part 2: BitBake 엔진 — *어떻게 실제로 빌드되는가*

**Ch 4: BitBake — DSL과 Datastore**
- Recipe syntax — `=`/`?=`/`??=`/`+=`/`.=`/`:append`/`:prepend`/`:remove`
- Datastore (`d` object) — variable scoping, expansion
- Override 시스템 — *scarthgap 의무 콜론 syntax*
- Anonymous python, `python __anonymous`, `def`
- Inheritance — `inherit`, class file (.bbclass)
- 디버깅 — `bitbake -e RECIPE`, `bitbake-getvar`

**Ch 5: BitBake — Task graph (DAG)**
- Task = `do_*` 함수, 의존성 = `do_X[depends]` / `do_X[rdepends]`
- DAG 생성 흐름 (parse → cache → schedule → execute)
- Worker process model (BB_NUMBER_THREADS, PARALLEL_MAKE)
- `bitbake -g` 시각화, `bitbake -c listtasks`
- Event handling (`addhandler`, BuildStarted/BuildCompleted)
- Recipe parsing 캐시 (`tmp/cache/`)

**Ch 6: sstate cache — 재사용의 비밀**
- Task signature 계산 — input hash로 cache key
- `sstate-cache/` 구조, `.tgz` per task
- BB_HASHEQUIV_SERVER — *signature 등가 매핑*
- Mirror (`SSTATE_MIRRORS`), HTTP-based 공유
- Cache invalidation — 어떤 변경이 어떤 task를 깨는가
- Reproducibility — bitbake `-S printdiff`, hash equivalence
- CI 워크플로우에서 sstate 공유 패턴

### Part 3: Recipe 작성 — *실전 메타데이터*

**Ch 7: 기본 Recipe 해부**
- 최소 recipe — SRC_URI / SRCREV / S / LICENSE / LIC_FILES_CHKSUM
- Fetch backend (git / http / file / svn / repo)
- Common variables — PV / PR / PROVIDES / RPROVIDES
- Source patch 관리 — quilt 형식, devtool patch
- Common bbclass — `autotools`, `cmake`, `meson`, `cargo`, `setuptools3`, `pkgconfig`
- Recipe 검수 — `bitbake-layers add-layer`, `recipetool create`

**Ch 8: Package splitting & License compliance**
- `PACKAGES` 변수 — recipe 1개 → 여러 package
- `FILES_${PN}`, `FILES_${PN}-dev`, `FILES_${PN}-dbg`
- License 분류 — permissive / weak / strong copyleft
- `LICENSE` 표기, `LIC_FILES_CHKSUM` 검증
- `INCOMPATIBLE_LICENSE` 자동 차단
- **SBOM (SPDX) export** — 2026 컴플라이언스 표준
- CVE management — `cve-update`, `cve-check.bbclass`

**Ch 9: 고급 recipe 패턴**
- Multi-config — `BBMULTICONFIG`, multilib
- Variant recipe (debug build, fortify)
- Native vs Target — `BBCLASSEXTEND = "native nativesdk"`
- `do_install` vs `do_install:append` 패턴
- Conditional logic — `OVERRIDES`, `${@python_expr}`
- Recipe report — `oe-pkgdata-util`

### Part 4: Kernel / BSP

**Ch 10: linux-yocto 커널 관리**
- `linux-yocto` recipe 구조 — kernel.bbclass
- kernel config 관리 — defconfig fragment, kconfig merge
- Patch 적용 — `SRC_URI` patch, kmeta branch
- Out-of-tree module — `kernel-module-*` recipe 패턴
- Device tree 통합
- 2026 변화: kernel signing, lockdown, secure boot 통합

**Ch 11: Board Support Package (BSP)**
- MACHINE 정의 — `conf/machine/MACHINE.conf`
- BSP layer 구조 (`meta-raspberrypi`, `meta-intel`, `meta-xilinx`, `meta-rockchip`, `meta-tegra`)
- Bootloader recipe — `u-boot`, `grub-efi`, `tf-a`
- Image artifact — `.wic`/`.wic.gz`, `bmaptool`
- WIC partition 정의 (`*.wks`)
- BSP layer 직접 작성 — 최소 board 추가 패턴

### Part 5: SDK 와 응용 개발

**Ch 12: Standard SDK / eSDK**
- `bitbake -c populate_sdk` → standard SDK
- `bitbake -c populate_sdk_ext` → eSDK
- SDK 구조 — sysroot, cross-compiler, environment-setup
- IDE 통합 — VS Code Yocto extension, Eclipse CDT
- 2026 추가: cross-debug + devtool deploy 통합 워크플로우

**Ch 13: devtool 워크플로우**
- `devtool add` — 새 recipe 빠르게
- `devtool modify` — 기존 recipe 수정, source tree 노출
- `devtool upgrade` — 버전 업그레이드 자동화
- `devtool deploy-target` — 빠른 iteration
- `devtool reset` — 변경 폐기
- recipe 머지 — `devtool finish`

### Part 6: 운영 — *프로덕션이 묻는 것*

**Ch 14: Reproducibility & sstate 공유 CI**
- `BB_HASHEQUIV_SERVER` 설치 + 운영
- Deterministic build — SOURCE_DATE_EPOCH, locale, hostname normalize
- CI에서 sstate mirror 운영 패턴
- `oe-selftest` 자동 회귀
- AB (Yocto Autobuilder) 구축

**Ch 15: Compliance — SBOM, CVE, License**
- SPDX SBOM export — `create-spdx.bbclass`
- CVE check — `cve-check.bbclass`, NVD feed
- License audit — `license` task, license manifest
- EU CRA / US Executive Order 14028 — *2026 컴플라이언스 환경*
- 공급망 보안 — recipe 검증, source mirror

**Ch 16: Debugging / Profiling on target**
- Cross-gdb — gdbserver, sysroot
- Tracing — perf, ftrace, eBPF (bpftrace) on target
- Profiling — perf record, FlameGraph
- Coredump + crash analysis
- Image debug 옵션 — `EXTRA_IMAGE_FEATURES = "dbg-pkgs tools-debug"`
- Remote source — debuginfod 통합

**Ch 17: 트러블슈팅 시나리오북**
- Build failure 분석 — `log.do_*`, `run.do_*`
- sstate 캐시 무효화 추적 — `bitbake -S printdiff`
- Recipe parse 에러
- Layer 충돌 — `BBFILE_PRIORITY`
- License incompatibility
- 디스크 / 메모리 부족
- Network fetch 실패 (mirror fallback)

**Ch 18: 2026 변경점 정리 (Living Chapter)**
- Override syntax 의무화 (`_` → `:`)
- SBOM 의무화 (EU CRA)
- Rust 통합 (`meta-rust`)
- LTS 운영 best practice (kirkstone↔scarthgap migration)
- Yocto AI workload — meta-ml, meta-tensorflow
- Confidential Computing on edge — meta-confidential

## 챕터별 분량 계획

| Part | 챕터 | 줄수 | 다이어그램 |
|------|------|-----|-----------|
| 1 개념 | 1-3 | 500/550/600 | 3/3/4 |
| 2 BitBake | 4-6 | 700/750/700 | 4/5/4 |
| 3 Recipe | 7-9 | 700/650/600 | 4/3/3 |
| 4 Kernel/BSP | 10-11 | 600/650 | 3/4 |
| 5 SDK/devtool | 12-13 | 550/550 | 3/3 |
| 6 운영 | 14-17 | 600/600/600/650 | 3/3/3/4 |
| Living | 18 | 500 | 2 |
| **합계** | 18 | **~11,000줄** | **~63** |

## 작성 순서

1. **Ch 1 (재정리)** → Ch 2 → Ch 3 — Part 1 토대 (개념)
2. **Ch 4 → Ch 5 → Ch 6** ★ — BitBake 본체 (시리즈 핵심)
3. Ch 7 → Ch 8 → Ch 9 — recipe 실전
4. Ch 10 → Ch 11 — kernel/BSP
5. Ch 12 → Ch 13 — SDK/devtool
6. Ch 14~17 — 운영
7. Ch 18 — Living (이후 release마다 갱신)

## 검증

- 각 챕터 `bitbake -e/-g/-c` 실제 출력 첨부
- Reference 빌드: **QEMU x86_64 + scarthgap LTS** + Raspberry Pi 4
- Reproducibility: 두 머신에서 동일 hash 검증
- 매 LTS 변경 시 Ch 18 갱신 + 다른 챕터 영향 점검

## frontmatter 변경 (대대적)

기존: `type: book-review`, `bookTitle: "Embedded Linux Systems with the Yocto Project"`, `bookAuthor: "Rudolf J. Streif"`

→ *책 기반 아닌 공식 문서·LTS 기준*이므로:
- `type: book-review` → *제거* (일반 series)
- `bookTitle` / `bookAuthor` → *제거*
- description에 "*공식 Yocto Project Mega-Manual + scarthgap LTS 기준*" 명시
- 책 인용은 본문 *참고* 수준
