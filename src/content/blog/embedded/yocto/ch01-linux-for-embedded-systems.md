---
title: "Ch 1: 임베디드 Linux와 Yocto의 위치"
date: 2026-05-15T01:00:00
description: "임베디드 시스템에서 Linux를 쓴다는 것의 의미와 빌드 시스템 Yocto의 자리 — 공식 Mega-Manual + scarthgap LTS 기준."
series: "Yocto Deep Dive"
seriesOrder: 1
tags: [yocto, embedded-linux, bitbake, openembedded]
draft: true
---

이 시리즈는 **Yocto Project 공식 문서**(Mega-Manual, BitBake User Manual, OE-Core Manual)와 **현행 LTS (scarthgap, 2024.4)** 기준으로 Yocto/OpenEmbedded를 정리합니다. 책 한 권으로 묶이지 않는 *살아있는 빌드 시스템*이라 release-cadence를 반영합니다. (책 — Streif *Embedded Linux Systems with the Yocto Project*(2016), Salvador & Angolini *Embedded Linux Development Using Yocto Project Cookbook*(2018) — 은 *참고*로 인용.)

## 왜 이 책인가

Yocto 입문서는 많지만 "왜 이렇게 동작하는가"를 BitBake 내부와 레시피 해석 순서까지 내려가서 설명하는 책은 드뭅니다. Streif의 책은 다음을 한 권에 묶습니다.

- **임베디드 Linux의 시스템 관점** — 부트로더, 커널, 루트 파일시스템, 패키지 매니저까지 빌드 산출물 전체 그림.
- **OE/Yocto의 메타 빌드 철학** — 왜 distro/machine/image 계층을 나누는지.
- **BitBake 엔진** — 태스크 그래프, 시그니처, sstate 캐시, 의존성 해석.
- **현실적인 BSP 작성** — 커널 레시피, 디바이스 트리, 부트로더 통합.

대안으로 Chris Simmonds의 *Mastering Embedded Linux Programming* 3판(2021)이 더 최신이지만, Yocto 자체의 *깊이*는 Streif가 우위에 있습니다. 따라서 이 시리즈는 Streif를 정본으로 삼고, 필요할 때 Simmonds·공식 Mega-Manual을 보조 자료로 인용합니다.

## 1장이 다루는 것

1장은 책 전체의 무대 설정입니다. 임베디드 시스템에서 Linux를 채택한다는 결정이 무엇을 의미하는지 — 라이선스, 부팅 흐름, 메모리 풋프린트, 커널/유저스페이스 분리 — 를 짚고, "그래서 왜 빌드 시스템이 필요한가"로 자연스럽게 넘어갑니다.

핵심 메시지:

- 임베디드 Linux는 "PC Linux를 줄인 것"이 아닙니다. 부트 시퀀스, 스토리지 모델, 업데이트 전략이 다릅니다.
- 직접 빌드(make + crosstool-NG + buildroot script)는 *작은 프로젝트*까지만 합리적입니다.
- 여러 보드·여러 제품 라인·여러 배포판 변형을 한 코드베이스로 관리하려면 *메타 빌드 시스템*이 필요하다 — 이것이 Yocto/OpenEmbedded의 존재 이유.

## 정리

- 이 시리즈는 Yocto를 *왜 그렇게 만들었는가*에 초점을 둡니다.
- 정본: Streif, *Embedded Linux Systems with the Yocto Project* (2016).
- 보조: Simmonds, *Mastering Embedded Linux Programming* 3e (2021), Yocto Mega-Manual.

## 다음 장 예고

2장은 Yocto Project 자체의 구성 요소 — Poky, OpenEmbedded-Core, BitBake, meta-yocto-bsp — 가 어떻게 맞물리는지 정리합니다.

## 관련 항목

- [원문 — Yocto Project Mega-Manual](https://docs.yoctoproject.org/)
- [Streif, *Embedded Linux Systems with the Yocto Project*](https://www.informit.com/store/embedded-linux-systems-with-the-yocto-project-9780133443240)
