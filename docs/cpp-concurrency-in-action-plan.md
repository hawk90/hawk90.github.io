# C++ Concurrency in Action — Series Plan

## 책 정보

- 저자: Anthony Williams (Boost.Thread 메인테이너)
- 출판: Manning, 2nd Edition 2019 (C++17 기준, C++20 일부)
- 분량: ~600쪽, 11장
- 위상: C++ 동시성 / 멀티스레딩의 정전 (definitive guide)

## 시리즈 위상

이전 C++ 시리즈와의 관계:
- **Effective Modern C++** — 언어 기능
- **Effective C++** — 클래식 OO
- **Beautiful C++** — 모던 가이드라인
- **GoF Design Patterns** — 디자인 패턴 기초
- **C++ Software Design** — 모던 디자인
- **→ C++ Concurrency in Action** — 동시성 (이 시리즈)

자연스러운 흐름 — 언어 → 디자인 → 동시성.

## 폴더 / 명명

```
src/content/blog/programming/cpp-concurrency-in-action/
├── 00-overview.md
├── chapter01-hello-concurrent-world.md
├── chapter02-managing-threads.md
├── chapter03-sharing-data.md
├── ...
└── chapter11-testing-and-debugging.md
```

장 단위 (item 단위 아님) — 책 구조가 장별 묶음. ~~11~~ 11장.

## 11장 ToC

1. **Hello, concurrent world!** — 동시성 개요, std::thread 첫 사용
2. **Managing threads** — std::thread 생애 / 인자 전달 / std::jthread
3. **Sharing data between threads** — 락, race condition, deadlock
4. **Synchronizing concurrent operations** — condition variable, future, latch, barrier
5. **The C++ memory model and operations on atomic types** — memory order, fence
6. **Designing lock-based concurrent data structures** — stack/queue/map
7. **Designing lock-free concurrent data structures** — compare-and-swap, ABA
8. **Designing concurrent code** — 작업 분할, false sharing, 데이터 vs 작업 병렬
9. **Advanced thread management** — thread pool, work stealing, interruption
10. **Parallel algorithms** — C++17 execution policy, ranges parallel (C++23 일부)
11. **Testing and debugging multithreaded applications** — TSan, 결정성, 시뮬레이션

## Item 템플릿 (이전 시리즈와 통일)

```markdown
---
title: "Chapter N: 제목"
date: 2026-MM-DDTHH:00:00
description: "한 줄 요약"
tags: [C++, Concurrency, ...]
series: "C++ Concurrency in Action"
seriesOrder: N
---

## 왜 이 장이 중요한가?
... 동기 / 문제

## 핵심 내용
... 본문

## 코드 예제
... C++ 코드

## 함정 / 흔한 실수
... pitfalls

## 모던 변형
... C++20/23 — std::jthread, std::stop_token, std::barrier, std::latch

## 실무 가이드 — 결정 트리 / 체크리스트

## 핵심 정리

## 관련 항목
...
```

장당 — ~600-800 라인 (이전 가이드라인 시리즈 사이즈).

## 배치 계획

총 12개 글 (overview + 11장). 4 배치:

### Pilot (overview + Ch 1-2, 3 글)
- 00-overview
- Ch 1: Hello concurrent world
- Ch 2: Managing threads

### Batch A (Ch 3-5, 3 글) — 핵심 동기화
- Ch 3: Sharing data
- Ch 4: Synchronizing operations
- Ch 5: Memory model / atomics

### Batch B (Ch 6-8, 3 글) — 동시 자료구조 / 설계
- Ch 6: Lock-based
- Ch 7: Lock-free
- Ch 8: Designing concurrent code

### Batch C (Ch 9-11, 3 글) — 고급 / 도구
- Ch 9: Advanced thread management
- Ch 10: Parallel algorithms
- Ch 11: Testing / debugging

## 교차 참조 (cross-reference)

- **EMC++ 항목 35-42** — 동시성 항목 — 가장 자연스러운 짝
- **C++ Software Design 가이드라인 33-34** — std::function, callable lifetime
- **Beautiful C++** — async 관련 항목
- **GoF Observer** — async 통지 패턴
- **Singleton** — thread safety 측면

## 사전 결정 사항

1. **C++20 가중치** — std::jthread, std::stop_token, std::barrier, std::latch 적극 활용
2. **C++23** — std::move_only_function, std::generator (coroutine) 언급
3. **코드 예제 깊이** — 짧은 핵심 예제 위주, 큰 case study는 외부 참조
4. **수학적 깊이** — memory model은 직관 + 예제 중심 (포멀 검증은 생략)
5. **OS 의존성** — POSIX/Windows 차이는 최소 언급 (표준 라이브러리 중심)

## 시작 / 끝

시작 — overview에서 C++ 동시성 진화 (C++03 → 11 → 17 → 20 → 23)
끝 — Ch 11에서 도구 / 추가 학습 방향
