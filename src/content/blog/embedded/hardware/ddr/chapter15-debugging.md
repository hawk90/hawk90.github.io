---
title: "Ch 15: 디버깅 — 메모리 안 뜸, 트레이닝 실패, ECC 에러"
date: 2026-05-16T16:00:00
description: "DDR 메모리 문제 디버깅: 인식 불가, 트레이닝 실패, ECC 에러 사례와 해결"
series: "DDR Memory Deep Dive"
seriesOrder: 15
tags: [DDR, memory, debugging, troubleshooting, ECC]
draft: true
---

메모리 문제는 시스템 안정성에 직접적인 영향을 준다. 이 장에서는 실무에서 흔히 겪는 메모리 문제의 증상, 원인, 디버깅 방법을 다룬다.

## 메모리 인식 불가

TODO: 내용 작성

증상:
- BIOS/UEFI에서 DIMM 미인식
- 용량 불일치
- 부팅 실패

원인과 점검:
- 물리적 접촉 불량
- SPD 읽기 실패
- 초기화 시퀀스 실패
- 호환성 문제

## 트레이닝 실패

TODO: 내용 작성

증상:
- 부팅 중 멈춤
- POST 에러 코드
- 저속으로 fallback

원인과 점검:
- Write Leveling 실패
- Read Training 마진 부족
- 신호 무결성 문제
- 온도 문제

## 간헐적 데이터 오류

TODO: 내용 작성

증상:
- 애플리케이션 크래시
- 커널 패닉
- 파일 손상

원인과 점검:
- ECC 미지원 시스템
- 타이밍 마진 부족
- 전압 불안정
- 온도 변동

## ECC 에러 대응

TODO: 내용 작성

- CE 모니터링과 임계값
- UE 발생 시 대응
- DIMM 위치 식별
- 예방적 교체 기준

## 디버깅 도구 활용

TODO: 내용 작성

- memtest86+ 사용법
- dmidecode로 DIMM 정보 확인
- edac-util/rasdaemon 에러 조회
- 오실로스코프/로직 분석기 (하드웨어)

## 정리

- 메모리 인식 불가는 물리 접촉, SPD, 초기화 순서로 점검한다
- 트레이닝 실패는 신호 무결성과 마진 문제를 의심한다
- 간헐적 오류는 memtest86+로 장시간 테스트한다
- ECC CE 누적 시 예방적 DIMM 교체를 고려한다

## 다음 장 예고

Chapter 16에서는 Mode Register와 SPD 레지스터 맵을 다룬다. 각 레지스터의 의미와 설정 방법을 살펴본다.

## 관련 항목

- [Ch 14: DDR5](/blog/embedded/hardware/ddr/chapter14-ddr5) — DDR5 차이점, DFE, 듀얼 채널
- [Ch 16: 레지스터 맵](/blog/embedded/hardware/ddr/chapter16-register-maps) — Mode Register, SPD
