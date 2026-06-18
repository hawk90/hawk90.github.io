---
title: "Buildroot가 푸는 문제 — Yocto와의 핵심 차이 분석"
date: 2026-05-19T09:01:00
description: "Buildroot의 위치 — 임베디드 리눅스 rootfs 빌드 시스템, Yocto와의 트레이드오프."
series: "Buildroot Practical"
seriesOrder: 1
tags: [embedded, buildroot, rootfs, yocto, embedded-linux]
draft: false
---

## 한 줄 요약

> **"Buildroot는 *한 장의 Makefile* 같은 임베디드 리눅스 빌드 시스템입니다."** — 작은 시스템을 빠르게 만들고 싶을 때 가장 단순한 선택지입니다.

## 임베디드 리눅스의 부팅 가능한 이미지란

데스크톱 리눅스에서는 배포판이 모든 것을 해 줍니다. Ubuntu를 설치하면 부트로더부터 GNU userland까지 한 번에 깔립니다. 임베디드에서는 그렇지 않습니다. 보드마다 SoC가 다르고, 메모리 크기와 부팅 매체가 다르고, 필요한 패키지가 다릅니다. 결국 직접 조합해야 합니다.

조합해야 하는 것은 대략 다음과 같습니다.

- **부트로더** — U-Boot 또는 vendor BSP의 자체 부트로더
- **커널** — Linux mainline 또는 vendor fork + 보드별 device tree
- **C 라이브러리** — glibc, musl, uClibc-ng 중 하나
- **루트 파일시스템** — busybox + 필요한 패키지들
- **이미지 포맷** — SD 카드용 raw, eMMC용 sparse, NAND용 UBIFS

이 모든 것을 *cross-compile*해야 합니다. x86_64 호스트에서 ARMv7이나 AArch64 타깃용으로요. 의존성도 직접 풉니다. 패키지 A가 패키지 B의 헤더에 의존하고, 또 B가 C의 라이브러리를 링크하는 식의 그래프를 손으로 정렬하면 일주일이 지나도 부팅하지 못합니다.

이 문제를 풀어 주는 도구가 *임베디드 리눅스 빌드 시스템*입니다. 대표적인 두 가지가 Buildroot와 Yocto입니다.

## Buildroot의 설계 철학

Buildroot의 핵심은 단순함입니다. 전체가 GNU Make 위에 얹혀 있고, 설정은 리눅스 커널과 같은 Kconfig를 씁니다. 한 보드용 시스템을 만드는 과정이 다음 세 줄로 끝납니다.

```text
$ make qemu_aarch64_virt_defconfig
$ make
$ output/images/start-qemu.sh
```

처음 보면 *너무 단순한* 느낌이 듭니다. 그러나 이 단순함이 의도된 결과입니다. Buildroot는 의식적으로 다음을 *포기*합니다.

- **재현 가능한 패키지 캐싱이나 binary feed.** 매번 source부터 빌드합니다.
- **per-recipe sysroot.** 패키지 하나마다 별도의 sysroot를 두지 않습니다.
- **여러 architecture의 단일 트리 빌드.** 한 트리는 한 타깃입니다.

이 셋을 포기한 대가로 얻는 것이 *전체 구조를 한눈에 이해할 수 있는 단순함*입니다. 빌드가 무엇을 하고 있는지 `make V=1`로 한 줄씩 따라갈 수 있고, 잘못되면 어느 단계에서 잘못됐는지 즉시 파악됩니다.

## 빌드 시간이 어디로 가는가

Buildroot가 *왜* 빠르다고 하는지는 빌드 단계별 분포를 보면 명확합니다. QEMU AArch64 + busybox + 20개 패키지로 만든 최소 시스템 기준 첫 빌드.

| 단계 | 시간 | 비율 |
|---|---|---|
| Toolchain 부트스트랩 | 15 ~ 25분 | 50 ~ 60% |
| 커널 빌드 | 5 ~ 8분 | 15 ~ 20% |
| Userland 패키지 | 5 ~ 10분 | 15 ~ 25% |
| 이미지 생성 (fakeroot·mkfs) | 1 ~ 2분 | 3 ~ 5% |
| **합계** | **30 ~ 45분** | **100%** |

같은 구성을 Yocto로 빌드하면 *첫 빌드 90분 ~ 3시간*입니다. 이유는 *recipe 메타데이터 파싱*, *sstate signature 계산*, *per-recipe sysroot* 같은 인프라가 추가되기 때문입니다. 두 번째 빌드부터는 *Yocto의 sstate*가 거의 무료가 되어 단번에 뒤집힙니다. 즉 *첫 빌드만 보는가, 매 빌드를 보는가*에 따라 답이 달라집니다.

## Yocto의 설계 철학

Yocto는 정반대 방향으로 갑니다. 핵심에 BitBake라는 별도의 빌드 엔진이 있고, *recipe*마다 *task*가 있고, *task*마다 *cache key*가 있어 *signature*가 같으면 사전 빌드된 sstate를 재사용합니다.

```text
$ source oe-init-build-env
$ bitbake core-image-minimal
```

겉보기는 두 줄이지만 그 뒤에는 거대한 기반이 있습니다.

- **레이어 시스템** — meta-, meta-yocto, meta-<vendor>, meta-<bsp>가 stacking됩니다.
- **sstate-cache** — 빌드 중간 산출물을 hash로 캐시합니다.
- **Multi-config** — 한 트리에서 여러 머신을 동시에 빌드합니다.
- **SDK 생성** — `bitbake -c populate_sdk`로 외부 개발자용 toolchain SDK를 패키징합니다.

기능은 강력합니다. 다만 처음 입문하는 비용이 큽니다. recipe 하나 추가하려면 BitBake의 task graph, `do_compile`/`do_install`/`do_package` 흐름, sstate 무효화 규칙을 알아야 합니다.

## 한눈에 비교

| 항목 | Buildroot | Yocto/OE |
|---|---|---|
| **엔진** | GNU Make | BitBake (Python DSL) |
| **설정** | Kconfig | `.conf` + `.bb` recipe |
| **첫 빌드** | 30분 ~ 1시간 | 1 ~ 3시간 |
| **재빌드** | 변경 부분만 rebuild | sstate hit이면 거의 무료 |
| **packaging** | 단일 rootfs 이미지 | ipk/rpm/deb feed |
| **SDK 생성** | `make sdk`로 toolchain tar | `populate_sdk`로 풀 SDK |
| **레이어 / 외부 트리** | `BR2_EXTERNAL` (단순) | meta-layer 다중 stacking |
| **러닝 커브** | 며칠 | 몇 주 ~ 몇 달 |
| **소형 시스템** | 매우 적합 | 가능하지만 과한 도구 |
| **대형 제품 라인** | 가능하나 한계 있음 | 표준 선택 |

이 표를 글로 풀면 한 줄로 요약할 수 있습니다. *Buildroot는 단순함을 우선하고, Yocto는 유연함을 우선합니다*. 둘 다 좋은 도구이며 어느 한쪽이 절대적으로 우월하지 않습니다.

## Buildroot가 적합한 경우

다음과 같은 상황에서 Buildroot가 잘 맞습니다.

- **rootfs가 64 MB 이하**의 소형 시스템. busybox + 패키지 10 ~ 30개 수준입니다.
- **단일 보드, 단일 이미지**를 만드는 프로젝트. 변형이 한두 개 정도.
- **빠른 iteration이 중요**한 prototyping 단계. 30분 만에 한 사이클이 돕니다.
- **팀이 1 ~ 5명** 정도이며, 빌드 시스템에 별도 인력을 둘 수 없는 경우.
- **OTA·다양한 packaging이 불필요**하고, 한 이미지를 raw로 flash하는 구조.

이런 환경에서는 Yocto의 sstate-cache나 layer stacking이 *과잉 기능*입니다. 오히려 복잡도가 학습·유지보수 부담으로 돌아옵니다.

## Yocto가 적합한 경우

반대로 다음 상황에서는 Yocto가 더 잘 맞습니다.

- **여러 보드(SoC 변형 포함)를 한 코드베이스에서** 동시에 관리할 때.
- **rootfs가 수백 MB 이상**이며 패키지 수가 100개를 넘는 경우.
- **외부 개발자에게 SDK를 배포**해야 할 때. application 개발팀과 platform 팀이 분리된 조직.
- **OTA / dual-bank / A/B 업데이트**처럼 정밀한 packaging이 필요한 제품.
- **장기 LTS 유지보수**(5년 이상). Yocto의 LTS 릴리스 모델이 이 시나리오에 맞춰져 있습니다.
- **vendor BSP가 Yocto 레이어**로만 배포되는 경우. NXP, TI, Xilinx, Qualcomm 다수가 이쪽입니다.

조직이 커지고 제품 라인이 늘어나면 Buildroot의 단순함이 *제약*으로 바뀝니다. 그 시점이 Yocto로 옮길 적기입니다.

## 실제로 어디에 쓰이는가

설계 철학만 보면 흐릿한 그림이 채택 사례로 구체화됩니다.

**Buildroot 채택 사례**

- **OpenWrt** — Buildroot 기반에서 분기한 라우터·게이트웨이 시스템. 1,000개 이상의 라우터 모델이 사용 중.
- **Synology DSM 일부 모델** — NAS의 저사양 라인업 firmware.
- **Google Coral**, **NVIDIA Jetson Nano** 일부 reference image — 빠른 SDK 배포용.
- **소형 가전·IoT 게이트웨이 다수** — vendor-branded 제품의 *내부 OS*. 공개되지 않을 뿐 광범위.
- **자율주행·로봇 *내부 SoC*** — main computer는 Yocto/Linux이지만 sensor module·MCU subsystem의 Linux는 Buildroot가 흔함.

**Yocto/OE 채택 사례**

- **Tesla 차량 내부 인포테인먼트** — Yocto 기반.
- **BMW iDrive 8** — Yocto + meta-bmw.
- **Mercedes MBUX** — Yocto.
- **NXP·TI·Xilinx·Qualcomm vendor BSP** — *모두* Yocto layer 형태 (meta-imx, meta-ti, meta-xilinx, meta-qcom).
- **Tizen, AGL (Automotive Grade Linux), webOS Open Source Edition** — Yocto 기반 distribution들.

이 분포가 한 가지를 시사합니다. *대형 제품·자동차·vendor BSP는 Yocto, 소형 IoT·게이트웨이·prototyping은 Buildroot*. 두 도구가 정확히 다른 시장을 잡고 있어 *둘 다 살아남았습니다*. 한쪽이 다른 쪽을 *대체*하지 않습니다.

## 결정 트리

당장 어느 쪽으로 갈지 막막하면 다음 흐름이 도움이 됩니다.

| 질문 | 답이 *Yes*면 | 답이 *No*면 |
|---|---|---|
| 1. Vendor BSP가 *Yocto layer*로만 옵니까? | Yocto | 2번으로 |
| 2. 보드 수가 3개 이상이거나 *동시에 SoC 변형*이 있습니까? | Yocto | 3번으로 |
| 3. *외부 개발자에게 SDK를 배포*해야 합니까? | Yocto | 4번으로 |
| 4. *OTA·A/B 부팅·delta update*가 필수입니까? | Yocto (또는 Buildroot + RAUC) | 5번으로 |
| 5. 빌드 시스템 전담 인력이 있습니까? | 둘 다 가능 | Buildroot |

이 표가 모든 경우를 잡지는 못합니다. 다만 *어디서부터 망설일지*의 지도가 됩니다.

## 그 외 옵션

선택지가 둘만 있는 것은 아닙니다.

- **OpenWrt** — 라우터·게이트웨이용. Buildroot 기반으로 시작했지만 별도로 분화했습니다.
- **PTXdist** — 독일 Pengutronix가 유지하는 빌드 시스템. Buildroot와 비슷한 단순함 추구.
- **Yocto + meta-buildroot** — 두 시스템을 부분적으로 조합. 드물지만 가능합니다.
- **Debian / Ubuntu Core** — embedded용 변형이 있지만, *배포판 기반*이라 진정한 의미의 build system은 아닙니다.

이 시리즈는 Buildroot에 집중합니다. Yocto는 별도 시리즈에서 다룰 가치가 있을 만큼 큰 주제입니다.

## 가벼운 실습 — qemu_aarch64_virt

이론은 충분합니다. 실제로 한 시스템을 만들어 보면 감이 옵니다. 다음 시리즈 전체에서 두 보드를 메인 예시로 씁니다.

| 보드 | 역할 | defconfig |
|---|---|---|
| **QEMU AArch64 virt** | 빠른 iteration, 실 하드웨어 없이 검증 | `qemu_aarch64_virt_defconfig` |
| **BeagleBone Black** | 실 하드웨어, SD 카드 부팅 | `beaglebone_defconfig` |

Ch 4에서 QEMU 흐름을 처음부터 끝까지 따라가고, Ch 10에서 BeagleBone Black 실 보드 부팅으로 마무리합니다.

다음은 *지금 당장* 돌려볼 수 있는 한 줄 미리보기입니다. 시리즈를 따라가면서 한 단계씩 풀어갈 부분이지만, 이 명령이 정확히 무엇을 만드는지 머릿속에 그려두면 좋습니다.

```text
$ git clone --depth=1 https://gitlab.com/buildroot.org/buildroot.git
$ cd buildroot
$ make qemu_aarch64_virt_defconfig
$ make -j$(nproc)
... (30분쯤 뒤)
$ ls output/images/
Image  rootfs.ext2  rootfs.ext4  start-qemu.sh
```

`Image`는 커널, `rootfs.ext4`는 파일시스템, `start-qemu.sh`는 QEMU 부팅 스크립트입니다. 이 단순한 산출물 구조 자체가 Buildroot의 정체성입니다.

## 숫자로 보는 비교

마지막으로 *체감 차이*를 숫자로 정리합니다. 같은 "AArch64 busybox + nginx + sshd + Python 3" rootfs를 양쪽 도구로 만든 기준입니다.

| 항목 | Buildroot 2024.02 | Yocto Scarthgap |
|---|---|---|
| **트리 크기 (`du -sh`)** | 290 MB | 2.1 GB |
| **첫 빌드 시간** | 32분 | 110분 |
| **두 번째 빌드 (no change)** | 5초 | 8초 |
| **두 번째 빌드 (1 package 수정)** | 25초 | 12초 (sstate hit) |
| **rootfs 크기 (`-stripped`)** | 38 MB | 92 MB (디폴트 image-base 포함) |
| **`dl/` cache 크기** | 1.2 GB | 4.5 GB (sstate 포함) |
| **메타데이터 파일 수** | 270 (`.mk` + `Config.in`) | 1,800 (`.bb` + `.conf`) |

같은 결과를 얻는 데 *Yocto가 7배*의 메타데이터, *5배*의 첫 빌드 시간, *3.7배*의 dl 캐시를 요구합니다. 그 대신 *두 번째 빌드 이후의 incremental*은 Yocto가 훨씬 정확합니다. 5번째 빌드부터는 Yocto가 빠른 경우가 많아집니다.

## 자주 하는 오해

Buildroot를 처음 접하면 흔히 빠지는 오해가 몇 가지 있습니다.

- **"Buildroot는 배포판이다."** 아닙니다. Buildroot는 *배포판을 만드는 도구*입니다. apt/yum 같은 런타임 패키지 매니저가 *없습니다*. 패키지 추가는 다시 빌드해서 이미지를 교체하는 방식입니다.
- **"한 번 빌드한 패키지는 incremental로 reconfigure된다."** 아닙니다. 패키지 옵션을 바꾸면 `make <pkg>-dirclean && make <pkg>` 또는 `make clean && make` 같이 명시적으로 재빌드해야 정확합니다. Buildroot는 이 부분에서 Yocto의 sstate처럼 자동 무효화를 하지 않습니다.
- **"Yocto가 항상 더 좋다."** 아닙니다. 도구는 문제에 맞아야 합니다. 소형 IoT 보드에 Yocto를 강제로 적용하면 build farm을 따로 운영해야 할 만큼 무거워집니다.

## 정리

- Buildroot는 임베디드 리눅스 시스템을 빌드하는 *단순한* 도구이며, GNU Make와 Kconfig만으로 동작합니다.
- Yocto는 BitBake 기반의 *유연한* 도구이며, layer·sstate·SDK 같은 풍부한 인프라를 갖습니다.
- 둘의 트레이드오프는 *단순함 vs 유연함*이며, 어느 한쪽이 절대적으로 우월하지 않습니다.
- Buildroot가 적합한 시나리오는 소형 시스템, 작은 팀, 빠른 prototyping입니다.
- Yocto가 적합한 시나리오는 다중 보드, SDK 배포, 장기 유지보수입니다.
- Vendor BSP가 어느 쪽을 기준으로 제공하는지가 실무에서 결정적 요인이 될 때가 많습니다.
- 이 시리즈는 QEMU AArch64와 BeagleBone Black을 메인 예시 보드로 씁니다.

## 다음 장 예고

다음 편은 **Ch 2: 디렉터리 구조**. Buildroot 트리의 6개 핵심 디렉터리가 각각 무엇을 담당하는지 살펴봅니다.


## 관련 항목

- [Ch 2: 디렉터리 구조](/blog/embedded/buildroot/chapter02-directory-structure)
- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [BSP Development Ch 16: Buildroot/Yocto와 BSP — rootfs 통합](/blog/embedded/bsp/chapter16-rootfs) — BSP 관점에서 빌드 시스템 선택
- [원문 — Buildroot Manual](https://buildroot.org/downloads/manual/manual.html)
