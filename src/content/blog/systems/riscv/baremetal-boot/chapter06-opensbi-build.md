---
title: "Ch 6: OpenSBI 빌드와 구성"
date: 2026-05-17T00:00:00
description: "OpenSBI 빌드 — 플랫폼 포팅, 설정 옵션, 커스터마이징을 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 6
tags: [RISC-V, OpenSBI, Build, Platform]
draft: true
---

## 개요

OpenSBI 빌드 과정과 플랫폼 설정을 다룬다.

---

## 빌드 환경

TODO:

```bash
# 툴체인 설치
sudo apt install gcc-riscv64-linux-gnu

# 소스 클론
git clone https://github.com/riscv-software-src/opensbi.git
```

---

## 기본 빌드

TODO:

```bash
make CROSS_COMPILE=riscv64-linux-gnu- PLATFORM=generic
```

---

## 주요 빌드 옵션

TODO:

| 옵션 | 설명 |
|------|------|
| PLATFORM | 타겟 플랫폼 |
| CROSS_COMPILE | 툴체인 프리픽스 |
| FW_PAYLOAD_PATH | 페이로드 바이너리 |
| FW_JUMP_ADDR | 점프 주소 |
| FW_TEXT_START | OpenSBI 로드 주소 |

---

## 플랫폼 구조

TODO:

```
platform/
├── generic/
│   ├── config.mk
│   ├── objects.mk
│   └── platform.c
└── <custom>/
    └── ...
```

---

## 커스텀 플랫폼 추가

TODO: platform.c 구현

---

## 디버그 빌드

TODO:

```bash
make ... DEBUG=1
```

---

## 정리

- PLATFORM=generic이 대부분 동작
- FW_PAYLOAD로 올인원 이미지
- 커스텀 플랫폼은 platform/ 아래 추가
- DEBUG=1로 디버그 정보

---

## 다음 장 예고

Ch 7에서는 SBI 호출 규약을 다룬다.

---

## 참고 자료

- [OpenSBI Platform Guide](https://github.com/riscv-software-src/opensbi/blob/master/docs/platform_guide.md)
