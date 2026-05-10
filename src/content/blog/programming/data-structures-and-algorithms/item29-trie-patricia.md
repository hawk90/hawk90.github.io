---
title: "DSA 29: Trie / Patricia"
date: 2026-06-08T13:00:00
description: "문자열을 문자 단위로 트리에 — 접두사 검색·자동 완성의 표준."
tags: [Data Structure, Algorithm, Trie, String]
series: "Data Structures and Algorithms"
seriesOrder: 29
draft: true
---

## 한 줄 요약

> **"문자 단위로 트리에 — 접두사 검색·자동 완성·맞춤법 검사"** — Patricia는 가지 압축.

## 어떤 문제를 푸는가

- **자동 완성** — "ap"로 시작하는 모든 단어
- **사전 (dictionary)** — 단어 존재 검사
- **IP 라우팅** — 가장 긴 접두사 매칭
- **단어 빈도** — 검색 엔진의 토대

해시 테이블도 단어 검색 OK지만:
- 접두사 검색 ❌
- 정렬된 순회 ❌
- 메모리 (전체 키 저장)

→ **Trie**(시도 트리, 또는 prefix tree)가 답.

## Trie 구조

각 노드 = 한 문자. 루트에서 leaf까지의 경로 = 한 단어.

```
        (root)
       / | \
      a  b  c
     /   |   \
    n    a    a
   /     |     \
  t      t      t
 (ant) (bat)  (cat)
```

`isEnd` 플래그로 단어 끝 표시:

```
root
 └ a
    └ n
       └ t (isEnd=true)   ← "ant"
       └ d (isEnd=false)
          └ y (isEnd=true) ← "andy"
 └ b
    └ a
       └ t (isEnd=true)   ← "bat"
```

## C++ 구현

```cpp
class Trie {
    struct Node {
        std::array<Node*, 26> children = {};
        bool isEnd = false;
    };
    Node* root = new Node();

public:
    ~Trie() { destroy(root); }

    void insert(const std::string& word) {
        Node* cur = root;
        for (char c : word) {
            int idx = c - 'a';
            if (!cur->children[idx])
                cur->children[idx] = new Node();
            cur = cur->children[idx];
        }
        cur->isEnd = true;
    }

    bool contains(const std::string& word) const {
        Node* cur = root;
        for (char c : word) {
            int idx = c - 'a';
            if (!cur->children[idx]) return false;
            cur = cur->children[idx];
        }
        return cur->isEnd;
    }

    bool startsWith(const std::string& prefix) const {
        Node* cur = root;
        for (char c : prefix) {
            int idx = c - 'a';
            if (!cur->children[idx]) return false;
            cur = cur->children[idx];
        }
        return true;
    }

private:
    void destroy(Node* n) {
        if (!n) return;
        for (auto* c : n->children) destroy(c);
        delete n;
    }
};

// 사용
Trie t;
t.insert("apple");
t.insert("ape");
t.insert("app");

t.contains("app");        // true
t.contains("ap");         // false (isEnd 아님)
t.startsWith("ap");       // true
```

## C 구현

```c
#define ALPHABET 26

typedef struct TrieNode {
    struct TrieNode* children[ALPHABET];
    int is_end;
} TrieNode;

TrieNode* trie_new(void) {
    TrieNode* n = calloc(1, sizeof(TrieNode));
    return n;
}

void trie_insert(TrieNode* root, const char* word) {
    TrieNode* cur = root;
    for (; *word; ++word) {
        int idx = *word - 'a';
        if (!cur->children[idx]) cur->children[idx] = trie_new();
        cur = cur->children[idx];
    }
    cur->is_end = 1;
}

int trie_contains(TrieNode* root, const char* word) {
    TrieNode* cur = root;
    for (; *word; ++word) {
        int idx = *word - 'a';
        if (!cur->children[idx]) return 0;
        cur = cur->children[idx];
    }
    return cur->is_end;
}

void trie_free(TrieNode* node) {
    if (!node) return;
    for (int i = 0; i < ALPHABET; ++i) trie_free(node->children[i]);
    free(node);
}
```

## 자동 완성 — DFS로 접두사 후 모든 단어

```cpp
void collectWords(Node* node, std::string prefix, std::vector<std::string>& result) {
    if (node->isEnd) result.push_back(prefix);
    for (int i = 0; i < 26; ++i) {
        if (node->children[i]) {
            collectWords(node->children[i], prefix + char('a' + i), result);
        }
    }
}

std::vector<std::string> autocomplete(Trie& t, const std::string& prefix) {
    // (Trie 내부 access — friend 등으로)
    Node* cur = ...;   // prefix 따라 내려간 노드
    std::vector<std::string> result;
    if (cur) collectWords(cur, prefix, result);
    return result;
}
```

## 시간/공간 복잡도

| | 시간 | 공간 |
| --- | --- | --- |
| 삽입 (길이 L) | O(L) | O(L) (새 노드들) |
| 검색 (길이 L) | O(L) | — |
| 접두사 검색 | O(L) | — |
| 모든 접두사로 시작하는 단어 | O(answer length) | — |

**키 길이 L에만 의존** — n과 무관! 큰 사전에서 강력.

공간: O(N × L × A) — N=단어 수, L=평균 길이, A=알파벳 크기. 메모리 多.

## Patricia (PATRICIA / Radix Tree)

### 문제 — 일반 Trie는 메모리 多

긴 단일 자식 체인이 흔함:

```
root → a → n → t → e → l → o → p → e (단 한 단어 "antelope")
```

이 체인은 9개 노드 — 낭비.

### 해결 — 경로 압축

자식이 하나뿐인 체인을 **단일 노드**로 압축.

```
root → "antelope" (단일 노드)
```

여러 단어 공유 부분만 분할:

```
root → "ant"
        ├─ "elope"
        └─ "eater"
```

→ **메모리 ↓, 노드 수 ↓**.

### Patricia 시간

| | 시간 |
| --- | --- |
| 검색·삽입·삭제 | O(L) — 일반 trie와 같음 |

상수 인자 더 작음 + 공간 효율.

## 응용 — IP 라우팅 (longest prefix match)

라우터: 패킷의 destination IP가 어느 라우터에 가야 하는지 결정. IP 주소의 **가장 긴 매칭 접두사** 찾기.

```
192.168.0.0/16   → 라우터 A
192.168.1.0/24   → 라우터 B
192.168.1.5/32   → 라우터 C
```

`192.168.1.5` 도착 → C 매칭 (가장 긴 접두사).

→ **Patricia tree** 가 표준 (Cisco IOS 등).

## 트레이드오프 — 한눈에

| 차원 | Trie | Patricia |
| --- | --- | --- |
| 검색 (길이 L) | ✅ O(L) | ✅ O(L) |
| 접두사 검색 | ✅ | ✅ |
| 자동 완성 | ✅ | ✅ |
| 메모리 | ❌ 많음 | ✅ 압축 |
| 코드 복잡 | ✅ 단순 | ⚠️ 복잡 |

## 실제 사례

- **자동 완성** — IDE, 검색 엔진
- **맞춤법 검사** — 사전 검색 + edit distance
- **IP 라우팅 테이블** (Cisco 등) — Patricia
- **Linux kernel** — radix tree (IDR, page cache)
- **블록체인** — Merkle Patricia Trie (Ethereum)

## 다음

- [Skip List](/blog/programming/data-structures-and-algorithms/item30-skip-list)
