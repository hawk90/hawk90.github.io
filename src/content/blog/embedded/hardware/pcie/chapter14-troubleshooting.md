---
title: "Ch 14: Troubleshooting — 디버깅 시나리오"
date: 2026-06-01T15:00:00
description: "PCIe 트러블슈팅 — 링크 다운, 에러 분석, 인식 불가, 성능 저하 해결"
series: "PCIe Deep Dive"
seriesOrder: 14
tags: [pcie, troubleshooting, debugging, error-analysis]
draft: true
---

PCIe 문제는 하드웨어, 펌웨어, 소프트웨어 어디서든 발생할 수 있다. 이 장에서는 실제 디버깅 시나리오와 해결 방법을 다룬다.

## 디바이스 인식 불가

TODO: 내용 작성

- lspci에 나타나지 않음
- 물리적 연결 확인
- BIOS 설정 확인
- Slot 전원 확인
- 링크 트레이닝 실패

## 링크 트레이닝 실패

TODO: 내용 작성

- LnkSta 확인
- Link Width 불일치
- Link Speed 다운그레이드
- LTSSM 상태 확인
- Equalization 문제

## AER 에러 분석

TODO: 내용 작성

- dmesg에서 AER 메시지
- Correctable vs Uncorrectable
- 에러 원인 추적
- Header Log 해석
- 반복 에러 패턴

## Completion Timeout

TODO: 내용 작성

- Non-Posted Request 실패
- Timeout 값 확인
- BAR 매핑 문제
- 디바이스 응답 없음
- 워크어라운드

## Malformed TLP

TODO: 내용 작성

- 패킷 구조 오류
- 드라이버 버그 가능성
- 디바이스 펌웨어 문제
- Header Log로 분석

## 성능 저하

TODO: 내용 작성

- Link Speed/Width 확인
- ASPM 영향
- Flow Control Credit 부족
- TLP 패킷 효율
- Payload Size 최적화

## 인터럽트 문제

TODO: 내용 작성

- 인터럽트 수신 불가
- MSI/MSI-X 설정 확인
- Affinity 문제
- 공유 인터럽트 충돌

## 전력 문제

TODO: 내용 작성

- ASPM 관련 행
- L1 진입/탈출 실패
- D-state 전환 문제
- Aux Power 부족

## 디버깅 체크리스트

TODO: 내용 작성

1. 물리적 연결 확인
2. lspci로 인식 확인
3. 링크 상태 확인
4. dmesg 에러 확인
5. AER 상태 확인
6. Configuration Space 검증
7. 드라이버 로그 확인

## 정리

- 체계적인 접근이 효과적인 디버깅의 핵심이다
- lspci, dmesg, AER 정보를 종합적으로 분석한다
- 물리 계층부터 소프트웨어까지 단계별로 확인한다
- 에러 패턴을 기록하고 재현 조건을 파악한다

## 다음 장 예고

[Chapter 15: Performance](/blog/embedded/hardware/pcie/chapter15-performance)에서 PCIe 성능 측정과 최적화를 다룬다. 레이턴시, 대역폭 분석 방법을 살펴본다.

## 관련 항목

- [Chapter 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling)
- [Chapter 13: Tools](/blog/embedded/hardware/pcie/chapter13-tools)
- [Chapter 15: Performance](/blog/embedded/hardware/pcie/chapter15-performance)
