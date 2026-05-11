---
title: "DSA 22: 정적 해싱 — 체이닝과 개방 주소법"
date: 2026-06-06T10:00:00
description: "키 → 인덱스 변환으로 O(1) 평균 검색. 충돌 처리 두 방식."
tags: [Data Structure, Algorithm, Hashing, Hash Table]
series: "Data Structures and Algorithms"
seriesOrder: 22
draft: false
---

## 한 줄 요약

> **"키를 직접 인덱스로 변환 → O(1) 평균 접근"** — 충돌은 체이닝/개방 주소법으로.

## 어떤 문제를 푸는가

정렬된 배열 검색: O(log n). BST: 평균 O(log n), 최악 O(n).

→ **O(1)** 가능? 가능 — 키를 **직접 인덱스로** 변환하면.

```cpp
arr[hash("hello")];   // 한 번에 접근
```

핵심: **해시 함수**가 키를 인덱스로.

## 해시 테이블 구조

- 배열 (bucket) 크기 m
- 해시 함수 `h(key) → [0, m)`
- 두 키가 같은 인덱스로 가면 → **충돌(collision)**
- 충돌 처리 방식이 핵심

## 좋은 해시 함수의 조건

1. **균등 분포** — 키가 골고루 인덱스에 분산
2. **빠른 계산** — 매 호출
3. **결정적** — 같은 키 → 같은 인덱스
4. **(암호용은 추가)** — 역산·충돌 어려움

흔한 함수:
- 정수: `key % m` (m이 소수면 좋음)
- 문자열: 다항식 해시 (`s[0]·31ⁿ⁻¹ + s[1]·31ⁿ⁻² + ...`)
- 객체: 멤버 해시 결합 (xor + shift)

## 충돌 처리 1: 체이닝 (Chaining / Separate Chaining)

같은 인덱스의 키들을 **연결 리스트**로 묶음.

```
bucket[0]: → "apple"
bucket[1]: → "banana" → "berry"   ← 충돌
bucket[2]: →
bucket[3]: → "cherry"
```

### C++ 구현

```cpp
#include <list>
#include <vector>

template<typename K, typename V>
class HashMap {
    static constexpr int M = 101;   // 소수
    std::vector<std::list<std::pair<K, V>>> buckets;

    int hash(const K& key) const { return std::hash<K>{}(key) % M; }

public:
    HashMap() : buckets(M) {}

    void insert(const K& key, const V& value) {
        auto& bucket = buckets[hash(key)];
        for (auto& [k, v] : bucket) {
            if (k == key) { v = value; return; }
        }
        bucket.push_back({key, value});
    }

    V* find(const K& key) {
        auto& bucket = buckets[hash(key)];
        for (auto& [k, v] : bucket) {
            if (k == key) return &v;
        }
        return nullptr;
    }

    bool remove(const K& key) {
        auto& bucket = buckets[hash(key)];
        for (auto it = bucket.begin(); it != bucket.end(); ++it) {
            if (it->first == key) { bucket.erase(it); return true; }
        }
        return false;
    }
};
```

### 시간 복잡도

| | 평균 | 최악 |
| --- | --- | --- |
| 검색·삽입·삭제 | O(1) | O(n) (모두 한 버킷) |

**load factor** α = n / m. 평균 체인 길이 = α.

## 충돌 처리 2: 개방 주소법 (Open Addressing)

충돌 시 **다른 빈 슬롯** 찾아 들어감 — 모든 키가 배열 안에.

| 탐사 방식 | 다음 시도 |
| --- | --- |
| **선형 탐사** (linear probing) | h(k), h(k)+1, h(k)+2, ... |
| **이차 탐사** (quadratic probing) | h(k), h(k)+1², h(k)+2², ... |
| **이중 해싱** (double hashing) | h₁(k), h₁(k)+h₂(k), h₁(k)+2·h₂(k), ... |

### 선형 탐사 — 함정: 군집 (clustering)

연속 충돌이 모여 큰 cluster 형성 → 검색 시간 증가. 이중 해싱이 더 균등.

### C++ 구현 — 선형 탐사

```cpp
template<typename K, typename V>
class OpenAddressMap {
    enum Status { EMPTY, OCCUPIED, DELETED };
    struct Slot {
        K key;
        V value;
        Status status = EMPTY;
    };
    std::vector<Slot> slots;
    int M;

    int hash(const K& key) const { return std::hash<K>{}(key) % M; }

public:
    OpenAddressMap(int m = 101) : slots(m), M(m) {}

    void insert(const K& key, const V& value) {
        int idx = hash(key);
        for (int i = 0; i < M; ++i) {
            int probe = (idx + i) % M;
            if (slots[probe].status != OCCUPIED || slots[probe].key == key) {
                slots[probe] = {key, value, OCCUPIED};
                return;
            }
        }
        // table full
    }

    V* find(const K& key) {
        int idx = hash(key);
        for (int i = 0; i < M; ++i) {
            int probe = (idx + i) % M;
            if (slots[probe].status == EMPTY) return nullptr;
            if (slots[probe].status == OCCUPIED && slots[probe].key == key)
                return &slots[probe].value;
        }
        return nullptr;
    }

    bool remove(const K& key) {
        int idx = hash(key);
        for (int i = 0; i < M; ++i) {
            int probe = (idx + i) % M;
            if (slots[probe].status == EMPTY) return false;
            if (slots[probe].status == OCCUPIED && slots[probe].key == key) {
                slots[probe].status = DELETED;   // ◄── tombstone
                return true;
            }
        }
        return false;
    }
};
```

> ⚠️ **tombstone** 필요 — 그냥 EMPTY로 만들면 탐사 체인이 끊어져 검색 실패.

## C 구현 — 체이닝

```c
#define HASH_SIZE 101

typedef struct Node {
    char key[64];
    int  value;
    struct Node* next;
} Node;

Node* table[HASH_SIZE];

static int hash(const char* s) {
    unsigned h = 0;
    while (*s) h = h * 31 + *s++;
    return h % HASH_SIZE;
}

void hash_insert(const char* key, int value) {
    int idx = hash(key);
    Node* cur = table[idx];
    while (cur) {
        if (strcmp(cur->key, key) == 0) { cur->value = value; return; }
        cur = cur->next;
    }
    Node* n = malloc(sizeof(Node));
    strcpy(n->key, key);
    n->value = value;
    n->next = table[idx];
    table[idx] = n;
}

int* hash_find(const char* key) {
    Node* cur = table[hash(key)];
    while (cur) {
        if (strcmp(cur->key, key) == 0) return &cur->value;
        cur = cur->next;
    }
    return NULL;
}
```

## 체이닝 vs 개방 주소법

| | 체이닝 | 개방 주소법 |
| --- | --- | --- |
| 메모리 효율 | ⚠️ 노드 오버헤드 | ✅ 배열만 |
| 캐시 친화 | ❌ 노드 흩어짐 | ✅ 연속 메모리 |
| load factor | α > 1 가능 | α < 1 필수 (보통 < 0.7) |
| 삭제 | ✅ 단순 | ⚠️ tombstone 필요 |
| 군집 (clustering) | ✅ 없음 | ⚠️ 선형 탐사 시 |
| 표준 라이브러리 | C++ STL `unordered_map` | Python dict, Rust HashMap |

## load factor와 재해싱 (Rehashing)

`α = n/m`이 높아지면 충돌 ↑ → 성능 저하.

→ α가 임계(예: 0.75) 넘으면 **테이블 크기 두 배로 + 모든 키 재해싱**. amortized O(1) 유지.

```cpp
void resize() {
    auto old = std::move(slots);
    M *= 2;
    slots.assign(M, {});
    for (auto& slot : old)
        if (slot.status == OCCUPIED) insert(slot.key, slot.value);
}
```

## 트레이드오프 — 한눈에

| 차원 | Hash Table |
| --- | --- |
| 평균 O(1) | ✅ 강력 |
| 최악 O(n) | ❌ 나쁜 해시·악의적 입력 |
| 정렬된 순회 | ❌ 무관계 |
| 메모리 오버헤드 | ⚠️ load factor에 따라 |
| 키 비교 가능해야 | ✅ |

## 실제 사례

- **C++ `std::unordered_map`** — 체이닝
- **Python `dict`** — open addressing (probing)
- **Java `HashMap`** — 체이닝 + 트리 변환 (충돌 多 시)
- **DB 인덱스** — 일부 (B-tree 더 흔함)
- **컴파일러 심볼 테이블**

## 다음

- [동적 해싱 (Extendible, Linear)](/blog/programming/data-structures-and-algorithms/item23-dynamic-hashing)
