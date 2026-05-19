---
title: "DSA 32: 확률적 자료구조 — Bloom Filter, Count-Min Sketch, HyperLogLog"
date: 2026-05-15T08:00:00
description: "정확성 약간 포기 + 메모리 폭소 — 빅데이터 시대의 필수 도구."
tags: [Data Structure, Algorithm, Probabilistic, Bloom Filter, HyperLogLog]
series: "Data Structures and Algorithms"
seriesOrder: 32
draft: true
---

## 한 줄 요약

> **"100% 정확 대신 99.9% + 메모리 1000배 절약"** — 빅데이터의 일상 도구.

## 어떤 문제를 푸는가

- "이 URL 본 적 있어?" — 매일 수십억 URL, 메모리 부족
- "이 검색어 빈도?" — 가장 흔한 검색어 K개
- "오늘 방문자 unique 수?" — IP·user-id 정확히 카운트하려면 메모리 폭발

→ 100% 정확 X, **확률적으로 정확** + 메모리 거의 안 씀.

## 1. Bloom Filter — 멤버십 검사

### 직관

비트 배열 m bits + 해시 함수 k개.

- **add(x)**: x를 k개 해시 → 그 비트들 모두 1로
- **contains(x)**: k개 해시 → 모두 1이면 "있을 가능성", 하나라도 0이면 "확실히 없음"

→ **false negative 없음, false positive 가능**.

```
m=10, k=3, add("hello"):
hash1("hello") = 2 → bits[2] = 1
hash2("hello") = 5 → bits[5] = 1
hash3("hello") = 7 → bits[7] = 1

contains("hello"): bits[2,5,7] 모두 1 → "있을 수도"
contains("world"): hash1=2(1), hash2=5(1), hash3=4(0) → "확실히 없음"
```

### 메모리 분석

n개 원소, false positive율 p:
- 비트 수 m ≈ -(n × ln p) / (ln 2)²
- 예: n=10⁶, p=1% → m ≈ 9.6 × 10⁶ bit ≈ 1.2 MB

수백만 원소 → 약 1MB. 정확한 hash set보다 **수십 배 적음**.

### C++ 구현

```cpp
#include <bitset>
#include <functional>
#include <string>

template<std::size_t M = 1024 * 1024>
class BloomFilter {
    std::bitset<M> bits;
    static constexpr int K = 3;

    std::size_t hashI(const std::string& s, int i) const {
        return (std::hash<std::string>{}(s) + i * 0x9e3779b97f4a7c15ULL) % M;
    }

public:
    void add(const std::string& s) {
        for (int i = 0; i < K; ++i) bits.set(hashI(s, i));
    }

    bool contains(const std::string& s) const {
        for (int i = 0; i < K; ++i)
            if (!bits.test(hashI(s, i))) return false;
        return true;
    }
};
```

### 응용

- **DB 쿼리 최적화** — 키가 디스크에 있을지 미리 검사 (Cassandra, RocksDB, HBase)
- **웹 크롤러** — 이미 본 URL 검사
- **CDN** — 캐시 히트 가능성 검사
- **악성 URL 검사** — Chrome safe browsing
- **블록체인** — 트랜잭션 필터링

## 2. Count-Min Sketch — 빈도 추정

### 직관

"이 키가 몇 번 나왔어?" — 정확한 카운트는 메모리 多.

→ 2D 배열 + k개 해시. 매 +1마다 k개 위치 +1. 조회 시 k개 위치의 **최솟값**.

```
배열 (k=3, w=1000):
   row 0 [        ...        ]   ← hash0
   row 1 [        ...        ]   ← hash1
   row 2 [        ...        ]   ← hash2

increment("foo"):
  bits[0][hash0("foo") % 1000] ++
  bits[1][hash1("foo") % 1000] ++
  bits[2][hash2("foo") % 1000] ++

count("foo"): min of 3 cells
```

→ **과대 추정 가능, 과소 X**.

### C++ 구현

```cpp
#include <vector>

class CountMinSketch {
    static constexpr int W = 1024, K = 3;
    std::vector<std::vector<int>> table;

    std::size_t hashI(const std::string& s, int i) const {
        return (std::hash<std::string>{}(s) + i * 0x9e3779b97f4a7c15ULL) % W;
    }

public:
    CountMinSketch() : table(K, std::vector<int>(W, 0)) {}

    void add(const std::string& s) {
        for (int i = 0; i < K; ++i) ++table[i][hashI(s, i)];
    }

    int count(const std::string& s) const {
        int minCount = INT_MAX;
        for (int i = 0; i < K; ++i) minCount = std::min(minCount, table[i][hashI(s, i)]);
        return minCount;
    }
};
```

### 응용

- **검색 엔진 trending topics**
- **네트워크 패킷 분석** — heavy hitter 검출
- **DB 쿼리 최적화** — 통계
- **Twitter** — 트렌드 토픽 추정

## 3. HyperLogLog — Distinct Count

### 직관

n개 unique 값 카운트 — 정확하면 hash set 필요 (큰 메모리).

**HyperLogLog**: ~12 KB로 수십억 unique 값 추정 (오차 ~2%).

### 핵심 아이디어

해시 값의 **앞쪽 0 비트 수**가 클수록 입력이 많을 가능성. (확률적 분석)

여러 버킷으로 분산 → 평균.

수학:
- 해시 결과의 leading zeros 수 = ρ
- max(ρ) ≈ log₂(n) (확률적)
- 여러 버킷의 평균 → 안정된 추정

### 응용

- **Redis `PFADD` / `PFCOUNT`** — 12 KB로 unique 카운트
- **Google BigQuery COUNT(DISTINCT)** approximation
- **AWS Athena, Spark** — APPROX_DISTINCT

### 라이브러리 사용 (직접 구현은 복잡)

```cpp
// Redis client 예시
redis::HyperLogLog hll("visitors");
hll.add("user1");
hll.add("user2");
// ...
long count = hll.count();   // 약간 오차 있는 unique 수
```

## 비교

| | Bloom Filter | Count-Min | HyperLogLog |
| --- | --- | --- | --- |
| 답하는 것 | 멤버십 (있음/없음) | 빈도 | distinct 카운트 |
| 오차 종류 | false positive | 과대 추정 | ±2% (보통) |
| 메모리 | O(n) bits | O(width) | **O(log log n)** |
| 응용 | 캐시 사전 검사, URL 필터 | trending, 빈도 | unique visitor |

## 트레이드오프 — 한눈에

| 차원 | 확률적 자료구조 |
| --- | --- |
| 메모리 효율 | ✅ 압도적 |
| 정확성 | ⚠️ 약간 오차 |
| 빠름 | ✅ 매우 |
| 동시성 친화 | ✅ append-only 가능 |
| 디버깅 어려움 | ⚠️ 결정적 X |

## 실제 사례

- **Cassandra / HBase / RocksDB** — Bloom filter (read 최적화)
- **Chrome Safe Browsing** — Bloom filter (악성 URL)
- **Redis** — HyperLogLog (`PFADD`, `PFCOUNT`)
- **검색 엔진** — Count-Min sketch
- **CDN** — Bloom filter (cache lookup)

## 다음

- [모던 그래프 알고리즘 (Tarjan SCC)](/blog/programming/algorithms/data-structures-and-algorithms/item33-modern-graph)
