---
title: "항목 55: Boost에 익숙해져라"
date: 2025-02-09T12:00:00
description: "Boost — 표준의 인큐베이터이자 production-quality 라이브러리 모음."
tags: [C++, Effective C++, Boost]
series: "Effective C++"
seriesOrder: 55
draft: true
---

> **초안** — 정리 진행 중

## 개요

**Boost**는 동료 평가를 거친 무료 C++ 라이브러리 모음. **표준 라이브러리의 인큐베이터** 역할 — 많은 Boost 라이브러리가 표준에 흡수됨 (smart pointers, regex, thread, filesystem, optional, variant, any 등).

## Boost가 다루는 영역

### 일반 유틸리티
- **Boost.Optional** — 표준 `std::optional`(C++17)의 원형
- **Boost.Variant** — `std::variant`(C++17)의 원형
- **Boost.Any** — `std::any`(C++17)의 원형
- **Boost.Tuple** — `std::tuple`의 원형

### 함수형
- **Boost.Function** — `std::function`의 원형
- **Boost.Bind** — `std::bind`의 원형
- **Boost.Lambda** — C++11 람다 이전의 람다
- **Boost.Phoenix** — 함수형 메타프로그래밍

### 스마트 포인터
- **shared_ptr, weak_ptr** — 표준 흡수
- **intrusive_ptr** — 객체 안에 카운터를 둔 ref-counting (성능)

### 메타프로그래밍
- **Boost.MPL** — 컴파일 타임 알고리즘
- **Boost.Hana** — 모던 메타프로그래밍 (C++14+)

### 자료구조
- **Boost.Multi-index** — 한 컨테이너에 여러 인덱스
- **Boost.Bimap** — 양방향 map
- **Boost.Heap** — 다양한 heap 구현

### 문자열·텍스트
- **Boost.Regex** — 표준 흡수
- **Boost.Format** — printf의 안전한 대안 (C++20 `std::format`이 표준 흡수)
- **Boost.Spirit** — 파서 콤비네이터

### 그래프
- **Boost.Graph** — 그래프 알고리즘 라이브러리

### 동시성
- **Boost.Thread** — 표준 흡수
- **Boost.Asio** — 비동기 I/O (네트워크) — 표준 흡수 진행 중

### 수치 / 자료
- **Boost.uBLAS** — 선형대수
- **Boost.Math** — 수학 함수
- **Boost.Geometry** — 기하학

### 직렬화
- **Boost.Serialization** — 객체 직렬화 (XML/binary)

### 파일 시스템
- **Boost.Filesystem** — `std::filesystem`(C++17) 원형

## 활용 가이드

- **표준에 있으면 표준 우선** — Boost는 백업
- **표준에 없는 기능** — Boost가 검증된 옵션
- **성능·이식성** — 충분히 검증되었지만 측정 권장
- **컴파일 타임 비용** — 일부 Boost는 무거움 (특히 MPL)

## C++ 표준의 진화

C++03 이후 표준이 빠르게 발전 — Boost의 많은 라이브러리가 흡수됐음. 그래도 Boost는 여전히 표준이 안 다루는 영역에서 강력.

## 핵심 정리

1. Boost = 검증된 무료 C++ 라이브러리 모음
2. 표준의 인큐베이터 — 많은 항목이 C++11/14/17/20에 흡수
3. 표준에 없는 기능에서 첫 검토 대상
4. 일부는 무겁거나 학습 곡선 있음 — 도메인에 맞게 선택
