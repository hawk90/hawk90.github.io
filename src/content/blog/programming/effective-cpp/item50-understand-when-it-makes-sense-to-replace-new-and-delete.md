---
title: "항목 50: new와 delete를 교체할 만한 경우를 이해하라"
date: 2025-02-08T11:00:00
description: "사용자 정의 new/delete가 정당한 시나리오 — 성능, 디버깅, 통계, alignment."
tags: [C++, Effective C++, new, delete, Memory]
series: "Effective C++"
seriesOrder: 50
draft: true
---

> **초안** — 정리 진행 중

## 개요

`operator new`와 `operator delete`를 직접 만드는 건 흔하지 않지만, 다음 시나리오에선 정당:

## 1. 사용 패턴 통계 / 디버깅

```cpp
void* operator new(std::size_t size) {
    void* p = std::malloc(size);
    log_alloc(size, p);
    return p;
}
```

메모리 누수 추적, 할당 패턴 분석.

## 2. 효율 — 풀 할당 / 객체별 할당기

표준 `new`는 범용. 특정 크기/패턴에 맞는 풀 할당기는 훨씬 빠를 수 있음.

```cpp
class Widget {
public:
    static void* operator new(std::size_t size) {
        return widgetPool.allocate(size);    // 미리 잡아둔 풀에서
    }
    static void operator delete(void* p) {
        widgetPool.deallocate(p);
    }
};
```

빈번하게 생성/소멸되는 작은 객체에 효과적.

## 3. 캐시 정렬 (cache alignment)

표준 `new`의 정렬 보장은 보통 `alignof(std::max_align_t)`. SIMD 등 더 엄격한 정렬이 필요하면 직접:

```cpp
void* operator new(std::size_t size) {
    return std::aligned_alloc(64, size);    // 64-byte 정렬 (cache line)
}
```

C++17부터 `operator new(std::size_t, std::align_val_t)` 오버로드도 표준.

## 4. 클러스터링 (메모리 지역성)

자주 함께 쓰이는 객체를 같은 페이지/캐시 라인에 — 페이지 폴트·캐시 미스 ↓.

## 5. 비표준 동작 추가

- 메모리 사용량 통계
- 할당된 객체 ID 부여
- 할당 패턴 분석

## 6. 표준 구현이 비효율인 경우

특정 컴파일러/OS 표준 할당기가 느릴 때 (드뭄). `jemalloc`, `tcmalloc` 같은 대체 할당기 라이브러리 사용도 옵션.

## 주의 — 직접 만들기 어렵다

올바른 `operator new` 구현은 미묘:
- thread safety
- alignment 보장
- 0-byte 요청 처리
- handler 호출 등

대부분의 경우 표준 + 외부 할당기로 충분.

## 핵심 정리

1. 사용자 정의 new/delete는 통계, 효율, 정렬, 클러스터링에 유용
2. 표준 할당기가 평균적으로 좋음 — 정말 측정 후 교체
3. 직접 만들기 어렵다 — 표준/외부 라이브러리(tcmalloc, jemalloc) 우선 검토
4. C++17의 align-aware `new`도 표준에 포함
