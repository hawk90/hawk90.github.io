---
title: "DSA 23: 동적 해싱 — Extendible / Linear"
date: 2026-03-06T11:00:00
description: "데이터 크기 변화에 점진적으로 적응 — 디스크 기반 DB의 표준."
tags: [Data Structure, Algorithm, Hashing, Database]
series: "Data Structures and Algorithms"
seriesOrder: 23
draft: true
---

## 한 줄 요약

> **"한 번에 전체 재해싱 없이 점진적으로 확장"** — DB·파일 시스템의 디스크 기반 해싱.

## 어떤 문제를 푸는가

[item 22의 정적 해싱](/blog/programming/algorithms/data-structures-and-algorithms/item22-static-hashing)은 데이터가 늘면 **전체 재해싱** 필요 — O(n) 비용. 메모리에선 amortized O(1)이지만 **디스크에서 수 GB 재해싱은 endurance·시간 모두 부담**.

→ **점진적 확장**으로 매 삽입 비용을 amortized O(1) 유지하되 한 번의 비용도 작게.

응용:
- **DB 인덱스** (해시 인덱스)
- **파일 시스템** 디렉토리
- **분산 해시 테이블** (DHT) — 일관 해싱

## Extendible Hashing

### 직관

**디렉토리(directory)** + **버킷(bucket)** 두 단계:

- 디렉토리: 2^d 개 포인터 (d = 전역 깊이)
- 각 버킷에 키 b개까지
- 버킷 가득 차면 그 버킷만 분할 (디렉토리 두 배 안 해도 OK)

<img src="/images/blog/dsa/diagrams/item23-extendible-hash.svg" alt="확장 해싱 디렉토리/버킷" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

키의 **하위 d 비트**로 디렉토리 인덱싱.

### 분할 (split)

버킷 B가 가득 → 그 버킷만 두 개로 분할, 디렉토리에서 해당 항목들을 새 버킷으로.

local depth = global depth가 되면 → 디렉토리 두 배.

### 시간 복잡도

| | 평균 |
| --- | --- |
| 검색 | O(1) — 디렉토리 인덱싱 + 버킷 검색 |
| 삽입 | O(1) amortized |

디스크 측면: **한 번에 한 버킷만 분할** — 큰 재해싱 없음.

### 디스크 친화

- 디렉토리는 보통 메모리
- 버킷은 디스크 페이지 1개 단위
- 검색 = 1 페이지 읽기

## Linear Hashing

### 직관

**한 번에 한 버킷씩** 점진적 분할 — 디렉토리 없음.

```
초기 버킷 4개:  [B0, B1, B2, B3]
load factor 임계 도달 → B0 분할 → 새 버킷 B4 생김
                       [B0', B1, B2, B3, B4]   (B0' 와 B4 는 B0 의 절반씩)
```

다음 분할 → B1, 그 다음 → B2, ...

### 검색

해시 함수가 두 가지 사용:
- `h_i(k) = k mod 2^i` — 분할되지 않은 버킷
- `h_(i+1)(k) = k mod 2^(i+1)` — 분할된 버킷

→ 분할 포인터 p보다 작으면 새 함수, 크면 옛 함수.

### 시간 복잡도

| | 평균 |
| --- | --- |
| 검색 | O(1) |
| 삽입 | O(1) amortized |

Extendible보다 단순 — 디렉토리 없음. 그러나 분할 순서가 고정 → 일부 버킷이 비대해질 수도.

## C++ 구현 — 단순 Extendible 흉내

전체 구현은 복잡 — 핵심 아이디어만:

```cpp
template<typename K, typename V>
class ExtendibleHash {
    static constexpr int BUCKET_SIZE = 4;

    struct Bucket {
        std::vector<std::pair<K, V>> entries;
        int localDepth;
    };

    int globalDepth = 1;
    std::vector<std::shared_ptr<Bucket>> directory;

    int hash(const K& k) const { return std::hash<K>{}(k); }
    int dirIndex(const K& k) const {
        return hash(k) & ((1 << globalDepth) - 1);   // 하위 globalDepth 비트
    }

public:
    ExtendibleHash() : directory(2) {
        directory[0] = std::make_shared<Bucket>();
        directory[1] = std::make_shared<Bucket>();
        directory[0]->localDepth = directory[1]->localDepth = 1;
    }

    void insert(const K& k, const V& v) {
        // 1. 버킷 찾기
        // 2. 가득 안 차면 추가
        // 3. 가득 차면 버킷 분할 (필요 시 디렉토리 두 배)
        // (구체 구현 생략 — DB 교과서 참고)
    }

    V* find(const K& k) {
        auto& bucket = directory[dirIndex(k)];
        for (auto& [key, val] : bucket->entries)
            if (key == k) return &val;
        return nullptr;
    }
};
```

## C 구현 — 개념만

```c
typedef struct {
    int   keys[BUCKET_SIZE];
    int   count;
    int   local_depth;
} Bucket;

Bucket** directory;
int global_depth = 1;
int dir_size = 2;

int dir_index(int key) {
    return key & ((1 << global_depth) - 1);
}

void insert(int key) {
    Bucket* b = directory[dir_index(key)];
    if (b->count < BUCKET_SIZE) {
        b->keys[b->count++] = key;
    } else {
        // 분할 필요 — 코드 복잡, 생략
    }
}
```

## 동적 해싱 vs 정적 해싱 + 재해싱

| | 정적 + 재해싱 | 동적 (Extendible) |
| --- | --- | --- |
| 평균 시간 | O(1) | O(1) |
| 한 삽입 최악 | O(n) — 전체 복사 | **O(1)** — 한 버킷만 |
| 디스크 적합 | ❌ 큰 I/O | ✅ |
| 메모리 적합 | ✅ 캐시 친화 | ⚠️ 디렉토리 추가 |

## 분산 해싱 — 일관 해싱 (Consistent Hashing)

분산 시스템(Cassandra, Memcached, DynamoDB)에서:
- 노드 추가/제거 시 **소수 키만 재배치**
- 해시 공간을 원형으로

<img src="/images/blog/dsa/diagrams/item23-linear-hash.svg" alt="선형 해싱 노드 체인" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

새 노드 추가 → 인접 노드의 키 일부만 새 노드로. 전체 재해싱 X.

## 트레이드오프 — 한눈에

| 차원 | Dynamic Hashing |
| --- | --- |
| 점진적 확장 | ✅ |
| 디스크 친화 | ✅ |
| 코드 복잡 | ❌ 정적보다 훨씬 |
| 메모리 오버헤드 | ⚠️ 디렉토리 |
| 정렬된 순회 | ❌ |

## 실제 사례

- **Berkeley DB Hash** — Extendible Hashing
- **PostgreSQL Hash Index** — Linear Hashing 변형
- **Redis Hash 자료형** (특정 경우)
- **Cassandra / DynamoDB** — Consistent Hashing
- **Memcached** — Consistent Hashing

## 다음

- [Min-Max Heap, Deap](/blog/programming/algorithms/data-structures-and-algorithms/item24-min-max-heap-deap)
