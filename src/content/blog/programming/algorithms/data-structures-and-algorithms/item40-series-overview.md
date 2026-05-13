---
title: "DSA 40: 시리즈 Overview — 자료구조와 알고리즘 한눈에"
date: 2026-03-11T13:00:00
description: "39개 항목 전체 관계도와 학습 순서 가이드."
tags: [Data Structure, Algorithm, Overview]
series: "Data Structures and Algorithms"
seriesOrder: 40
draft: false
draft: true
---

## 시리즈 구성

이 시리즈는 **Horowitz/Sahni — Fundamentals of Data Structures in C++** (이석호 번역) 충실 + 모던 추가.

총 **39개 + overview = 40개 항목**.

## Part A — Horowitz/Sahni 책 충실

### Ch.1 — 기본 개념
- [01. 알고리즘이란](/blog/programming/algorithms/data-structures-and-algorithms/item01-what-is-algorithm)
- [02. 점근 표기 (O, Ω, Θ)](/blog/programming/algorithms/data-structures-and-algorithms/item02-asymptotic-analysis)
- [03. 재귀와 분할 정복](/blog/programming/algorithms/data-structures-and-algorithms/item03-recursion-and-divide-conquer)

### Ch.2 — 배열
- [04. 배열 / 다차원](/blog/programming/algorithms/data-structures-and-algorithms/item04-arrays)
- [05. 구조체·다항식·희소 행렬](/blog/programming/algorithms/data-structures-and-algorithms/item05-structures-polynomials-sparse-matrix)

### Ch.3 — 스택과 큐
- [06. 스택](/blog/programming/algorithms/data-structures-and-algorithms/item06-stack)
- [07. 큐 / 덱](/blog/programming/algorithms/data-structures-and-algorithms/item07-queue-deque)

### Ch.4 — 연결 리스트
- [08. 단일·이중·원형](/blog/programming/algorithms/data-structures-and-algorithms/item08-linked-list)
- [09. 다항식·GLL 응용](/blog/programming/algorithms/data-structures-and-algorithms/item09-linked-list-applications)

### Ch.5 — 트리
- [10. 이진 트리·순회](/blog/programming/algorithms/data-structures-and-algorithms/item10-binary-tree-traversal)
- [11. 스레드 트리·표현식 트리](/blog/programming/algorithms/data-structures-and-algorithms/item11-threaded-tree-expression)
- [12. 힙·우선순위 큐](/blog/programming/algorithms/data-structures-and-algorithms/item12-heap-priority-queue)
- [13. BST](/blog/programming/algorithms/data-structures-and-algorithms/item13-binary-search-tree)
- [14. 선택 트리·포레스트·집합](/blog/programming/algorithms/data-structures-and-algorithms/item14-selection-tree-forest-set)

### Ch.6 — 그래프
- [15. 표현·DFS·BFS](/blog/programming/algorithms/data-structures-and-algorithms/item15-graph-traversal)
- [16. 연결 성분·MST](/blog/programming/algorithms/data-structures-and-algorithms/item16-connected-components-mst)
- [17. 최단 경로 (Dijkstra/BF/FW)](/blog/programming/algorithms/data-structures-and-algorithms/item17-shortest-path)
- [18. AOV/AOE 네트워크](/blog/programming/algorithms/data-structures-and-algorithms/item18-aov-aoe-network)

### Ch.7 — 정렬
- [19. 단순 정렬](/blog/programming/algorithms/data-structures-and-algorithms/item19-simple-sort)
- [20. 효율 정렬 (Quick/Merge/Heap)](/blog/programming/algorithms/data-structures-and-algorithms/item20-efficient-sort)
- [21. 비교 외·외부 정렬](/blog/programming/algorithms/data-structures-and-algorithms/item21-non-comparison-external-sort)

### Ch.8 — 해싱
- [22. 정적 해싱](/blog/programming/algorithms/data-structures-and-algorithms/item22-static-hashing)
- [23. 동적 해싱](/blog/programming/algorithms/data-structures-and-algorithms/item23-dynamic-hashing)

### Ch.9 — 히프 구조
- [24. Min-Max Heap, Deap](/blog/programming/algorithms/data-structures-and-algorithms/item24-min-max-heap-deap)
- [25. Leftist/Binomial/Fibonacci](/blog/programming/algorithms/data-structures-and-algorithms/item25-mergeable-heaps)

### Ch.10~12 — 효율 BST · Multiway · Digital
- [26. AVL 트리](/blog/programming/algorithms/data-structures-and-algorithms/item26-avl-tree)
- [27. Red-Black, Splay](/blog/programming/algorithms/data-structures-and-algorithms/item27-red-black-tree)
- [28. B-Tree / B+ Tree](/blog/programming/algorithms/data-structures-and-algorithms/item28-b-tree)
- [29. Trie / Patricia](/blog/programming/algorithms/data-structures-and-algorithms/item29-trie-patricia)

## Part B — 모던 추가

- [30. Skip List](/blog/programming/algorithms/data-structures-and-algorithms/item30-skip-list)
- [31. Disjoint Set 깊이 (Union-Find 최적화)](/blog/programming/algorithms/data-structures-and-algorithms/item31-disjoint-set-detail)
- [32. 확률적 자료구조 (Bloom, HyperLogLog)](/blog/programming/algorithms/data-structures-and-algorithms/item32-probabilistic-data-structures)
- [33. 모던 그래프 (Tarjan SCC)](/blog/programming/algorithms/data-structures-and-algorithms/item33-modern-graph)
- [34. DP 패턴 카탈로그](/blog/programming/algorithms/data-structures-and-algorithms/item34-dp-patterns)
- [35. 백트래킹](/blog/programming/algorithms/data-structures-and-algorithms/item35-backtracking)
- [36. 모던 C++ 컨테이너](/blog/programming/algorithms/data-structures-and-algorithms/item36-modern-cpp-containers)

## Part C — 보너스

- [37. 캐시 친화](/blog/programming/algorithms/data-structures-and-algorithms/item37-cache-friendly)
- [38. Lock-free](/blog/programming/algorithms/data-structures-and-algorithms/item38-lock-free)
- [39. 자료구조 선택 가이드](/blog/programming/algorithms/data-structures-and-algorithms/item39-selection-guide)
- 40. 시리즈 Overview (이 글)

## 학습 순서 추천

처음 자료구조·알고리즘 공부한다면:

### 1단계 — 필수 기초 (item 01-09)
복잡도 + 배열·스택·큐·연결 리스트.

### 2단계 — 트리·정렬 (item 10-21)
이진 트리, 힙, BST, 정렬 3종.

### 3단계 — 해싱·그래프 (item 15-18, 22)
DFS/BFS, MST, 최단 경로.

### 4단계 — 균형 트리·고급 (item 26-29, 31)
RB tree, B-tree, Union-Find 최적화.

### 5단계 — 알고리즘 패턴 (item 33-35)
Tarjan SCC, DP, 백트래킹.

### 6단계 — 실전 (item 36-39)
STL 활용, 캐시, lock-free, 선택 가이드.

## 자료구조·알고리즘 관계도 (텍스트)

<img src="/images/blog/dsa/diagrams/item40-overview.svg" alt="DSA 시리즈 전체 개요" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## 책 + 추가 학습 리소스

- **Horowitz/Sahni** — 본 시리즈의 토대
- **CLRS (Introduction to Algorithms)** — 더 깊은 분석·증명
- **Sedgewick — Algorithms** — Java/Python 구현 위주
- **Skiena — Algorithm Design Manual** — 실전 문제 카탈로그
- **LeetCode** — 패턴 익히기
- **Competitive Programming Handbook** — 경쟁 프로그래밍

## 관련 시리즈

- [Effective Modern C++](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction) — C++ 자체
- [Effective C++](/blog/programming/cpp/effective-cpp/item01-view-cpp-as-a-federation-of-languages) — 추가 가이드
- [GoF 디자인 패턴](/blog/programming/design/gof-design-patterns/item01-abstract-factory) — 객체 지향 패턴

## 마무리

자료구조·알고리즘은 **컴퓨터 과학의 어휘**. 잘 알면:
- 시간/공간 효율 정확히 추정
- 라이브러리 사용을 의식적으로
- 새 문제에 적합한 도구 즉시 선택
- 면접·경쟁 프로그래밍에서 유리

이 시리즈가 토대가 되길.
