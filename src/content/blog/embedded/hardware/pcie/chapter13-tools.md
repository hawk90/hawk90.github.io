---
title: "Ch 13: Tools — lspci/setpci 실전"
date: 2026-06-01T14:00:00
description: "PCIe 디버깅 도구 — lspci, setpci, devmem2, pcitree 실전 사용법"
series: "PCIe Deep Dive"
seriesOrder: 13
tags: [pcie, tools, lspci, setpci, debugging]
draft: true
---

PCIe 디버깅의 첫 단계는 도구를 능숙하게 사용하는 것이다. 이 장에서는 lspci, setpci 등 핵심 도구의 실전 사용법을 다룬다.

## lspci 기초

TODO: 내용 작성

- 기본 출력 형식
- `-v`, `-vv`, `-vvv` 상세도
- `-s` 특정 디바이스 선택
- `-d` Vendor:Device 필터
- `-t` 트리 출력

## lspci 상세 옵션

TODO: 내용 작성

- `-x`, `-xxx`, `-xxxx` 헥스 덤프
- `-n` Numeric ID
- `-nn` Numeric + 텍스트
- `-k` 커널 드라이버 정보
- `-b` Bus-centric 뷰

## lspci 출력 해석

TODO: 내용 작성

- Capabilities 섹션
- LnkCap, LnkSta (Link Capability/Status)
- DevCap, DevSta (Device Capability/Status)
- MSI/MSI-X 정보
- Power Management 상태

## setpci 기초

TODO: 내용 작성

- 레지스터 읽기: `setpci -s 01:00.0 COMMAND`
- 레지스터 쓰기: `setpci -s 01:00.0 COMMAND=0x06`
- 레지스터 이름 vs 오프셋
- 비트 조작

## setpci 고급

TODO: 내용 작성

- Capability 레지스터 접근
- `CAP_PM+0x04.b` 형식
- Extended Capability
- 스크립트 활용

## devmem2

TODO: 내용 작성

- 물리 메모리 직접 접근
- BAR 영역 읽기/쓰기
- `devmem2 0xfe000000 w`
- 주의사항 (시스템 불안정)

## /sys/bus/pci

TODO: 내용 작성

- 디바이스 속성 파일
- `config` 바이너리 파일
- `resource` 파일
- `enable`, `remove`, `rescan`
- 드라이버 바인딩

## pcitree

TODO: 내용 작성

- 토폴로지 시각화
- 트리 구조 출력
- Root Complex/Switch/Endpoint

## 기타 도구

TODO: 내용 작성

- `pciutils` 패키지
- `pci-tree`
- `lshw`
- `dmidecode`
- 벤더 전용 도구

## 정리

- lspci는 PCIe 디바이스 정보의 첫 번째 소스다
- setpci로 Configuration Space를 직접 읽고 쓸 수 있다
- devmem2는 MMIO 레지스터에 직접 접근한다
- sysfs는 스크립트 친화적인 인터페이스를 제공한다

## 다음 장 예고

[Chapter 14: Troubleshooting](/blog/embedded/hardware/pcie/chapter14-troubleshooting)에서 실제 디버깅 시나리오를 다룬다. 링크 다운, 에러 분석, 성능 문제 해결을 살펴본다.

## 관련 항목

- [Chapter 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Chapter 14: Troubleshooting](/blog/embedded/hardware/pcie/chapter14-troubleshooting)
