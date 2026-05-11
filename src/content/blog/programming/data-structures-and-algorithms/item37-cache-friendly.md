---
title: "DSA 37: 캐시 친화 자료구조 — 메모리 지역성의 위력"
date: 2026-06-11T10:00:00
description: "이론 시간 복잡도가 같아도 캐시 친화 차이로 10~100배 — vector vs list 실측."
tags: [Data Structure, Algorithm, Cache, Performance]
series: "Data Structures and Algorithms"
seriesOrder: 37
draft: false
---

## 한 줄 요약

> **"O(n)이라도 캐시 친화 = 100배 빠름"** — 모던 CPU에서 메모리는 새 디스크.

## 어떤 문제를 푸는가

이론적으로 O(log n) `std::list` traversal은 O(n) `std::vector` traversal보다 빠를까?

**아니오** — 보통 vector가 압도적.

이유: **CPU 캐시**.

## CPU 메모리 계층

```
L1 (32 KB):    ~1 ns
L2 (256 KB):   ~3 ns
L3 (수 MB):    ~10 ns
RAM (수십 GB): ~100 ns         ← L1 대비 100배
SSD (수 TB):   ~100 µs         ← L1 대비 10만배
```

매번 RAM에서 읽으면 L1 대비 100배 느림.

## 캐시 라인 (Cache Line)

CPU는 메모리를 **64 byte 단위(보통)** 로 읽음. 인접 데이터는 한 번에 캐시에 올라감.

```
배열:  [a][b][c][d][e][f]...   ← 한 캐시 라인에 16개 int
                               → 첫 접근만 느리고 나머진 캐시 hit

연결 리스트: [n1] ... [n2] ... [n3] ...   ← 흩어짐
                                         → 매 노드 접근이 캐시 미스
```

## 실측 — vector vs list

```cpp
#include <vector>
#include <list>
#include <chrono>

constexpr int N = 1000000;

void measure() {
    std::vector<int> v(N, 1);
    std::list<int>   l(N, 1);

    auto t1 = std::chrono::steady_clock::now();
    long sumV = 0;
    for (int x : v) sumV += x;
    auto t2 = std::chrono::steady_clock::now();

    long sumL = 0;
    for (int x : l) sumL += x;
    auto t3 = std::chrono::steady_clock::now();

    std::cout << "vector: " << (t2-t1).count() << "\n";
    std::cout << "list:   " << (t3-t2).count() << "\n";
}

// 결과 (대략):
// vector: 1 ms
// list:   30 ms     ← 30배 차이
```

같은 O(n)인데 list는 30배 느림. 캐시 미스.

## 캐시 친화 패턴

### 1. **연속 메모리 (`vector`)**

```cpp
std::vector<Particle> particles;   // 연속
for (auto& p : particles) p.update();   // 캐시 친화
```

vs

```cpp
std::vector<Particle*> particles;  // 포인터 (객체 흩어짐)
for (auto* p : particles) p->update();   // 캐시 미스
```

### 2. **SoA (Structure of Arrays) vs AoS (Array of Structures)**

```cpp
// AoS — 일반적
struct Particle { float x, y, z; float vx, vy, vz; };
std::vector<Particle> particles;

// SoA — 핫 멤버만 처리할 때 유리
struct Particles {
    std::vector<float> x, y, z;
    std::vector<float> vx, vy, vz;
};
```

x만 갱신하는 루프라면 SoA가 캐시 친화.

### 3. **트리 → 배열 표현 (힙)**

[item 12 힙](/blog/programming/data-structures-and-algorithms/item12-heap-priority-queue) — 완전 이진 트리를 배열로 표현 → 부모·자식이 인덱스 산술. **모두 한 메모리 영역**.

vs RB 트리 (포인터) → 캐시 비친화.

### 4. **B-tree / B+tree** (item 28)

한 노드에 100개 키 — 한 번에 한 캐시 라인 (또는 한 페이지) 읽음.

### 5. **비트 압축** (Bitmap, Bloom filter)

큰 정보를 작은 메모리에 → 캐시에 더 많이.

## False Sharing — 동시성 함정

여러 스레드가 다른 변수를 수정해도, 같은 캐시 라인이면 **서로의 캐시를 무효화** → 성능 폭락.

```cpp
struct Bad {
    alignas(8) int counter1;   // thread 1만 사용
    alignas(8) int counter2;   // thread 2만 사용 — 같은 캐시 라인!
};
```

해결: **캐시 라인 간격 두기**.

```cpp
struct Good {
    alignas(64) int counter1;   // 다른 캐시 라인
    alignas(64) int counter2;
};
```

C++17의 `std::hardware_destructive_interference_size` 사용도 가능.

## 실측 — branch prediction

CPU는 분기 예측. 패턴이 일정하면 빠름, 무작위면 느림.

```cpp
// 정렬된 배열
for (int x : sorted_arr) if (x > 128) sum += x;   // 빠름

// 정렬 안 된
for (int x : random_arr) if (x > 128) sum += x;   // 느림 (분기 예측 실패)
```

→ **데이터 정렬이 곧 성능**일 수 있음.

## 캐시 친화 자료구조 — 모던 트렌드

### `flat_hash_map` (Abseil, Boost.Unordered)

표준 `unordered_map` (chaining) → 노드 포인터, 캐시 비친화.

`flat_hash_map` — open addressing, 한 배열 → 캐시 친화. 2~5배 빠름.

### Robin Hood Hashing

Open addressing 변형. 평균 probe 거리 균등화 → 캐시 line 재사용.

### Hopscotch Hashing

각 키가 H 슬롯 안에 — 모든 검사가 한 캐시 라인에서.

### Cache-Oblivious Algorithms

캐시 크기를 모르고도 자동으로 잘 동작 — Funnelsort, recursive matrix multiply 등.

## 측정 도구

- **`perf`** (Linux) — cache miss, branch miss 카운트
- **Intel VTune** — 디테일한 마이크로아키텍처 분석
- **`std::chrono`** — 단순 wall clock
- **Google Benchmark** — micro-benchmark 표준

```bash
perf stat -e cache-misses,cache-references ./myprogram
```

## 핵심 원칙

1. **인접 메모리 = 빠름**
2. **포인터 추적 = 캐시 미스**
3. **작은 데이터 구조 = 캐시 fit**
4. **순차 접근 > 무작위 접근**
5. **branch 예측 가능하게**
6. **multi-thread는 캐시 라인 분리**

## 트레이드오프 — 한눈에

| 차원 | 캐시 친화 |
| --- | --- |
| 실측 성능 | ✅ 큰 차이 |
| 점근 복잡도 | 같음 |
| 코드 단순성 | ⚠️ SoA는 변환 비용 |
| 측정 도구 필요 | ⚠️ |

## 실제 사례

- **게임 엔진** — ECS (Entity-Component-System) — SoA 패턴
- **DB 컬럼 스토어** — Parquet, Arrow — SoA로 압축·집계 빠름
- **수치 계산** — Eigen, BLAS — 블록 알고리즘으로 캐시 활용
- **Linux kernel** — `cache_line_size()` API
- **Chrome / Firefox** — 핫패스 자료구조 모두 캐시 최적화

## 다음

- [Lock-free 자료구조 입문](/blog/programming/data-structures-and-algorithms/item38-lock-free)
