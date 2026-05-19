---
title: "Ch 4: Eight Simple Rules for Designing Multithreaded Applications"
date: 2025-05-20T04:00:00
description: "멀티스레드 설계 8가지 규칙 — 실용적인 동시성 설계 지침"
series: "The Art of Concurrency"
seriesOrder: 4
tags: [concurrency, design-rules, best-practices, multithreading]
draft: true
type: book-review
bookTitle: "The Art of Concurrency"
bookAuthor: "Clay Breshears"
---

## 8가지 규칙 개요

Clay Breshears의 **실용적 설계 지침**.

```
1. 독립적인 작업 식별
2. 동시성 수준 결정
3. 스케줄링 정책 선택
4. 공유 데이터 식별
5. 동기화 메커니즘 선택
6. 락 범위 최소화
7. 단순하게 유지
8. 테스트, 테스트, 테스트
```

---

## Rule 1: 독립적인 작업 식별

**병렬화의 첫 단계**: 무엇을 병렬로 실행할 수 있는가?

```
질문:
- 데이터 의존성이 없는 작업은?
- 같은 연산을 다른 데이터에 적용하는가?
- 파이프라인 단계로 나눌 수 있는가?
```

```
예: 이미지 필터 적용

// 순차
for (pixel in image) {
    apply_filter(pixel);
}

// 분석: 각 픽셀 독립적 → 데이터 병렬
// 병렬화 가능!

예: 피보나치 계산
fib(n) = fib(n-1) + fib(n-2)

// 분석: fib(n-1)과 fib(n-2)는 독립 → 작업 병렬
// 하지만 오버헤드가 클 수 있음
```

**체크리스트**:

```
[ ] 루프 반복이 독립적인가?
[ ] 함수 호출이 독립적인가?
[ ] I/O 작업이 겹칠 수 있는가?
[ ] 분할 정복이 가능한가?
```

---

## Rule 2: 동시성 수준 결정

**몇 개의 스레드를 사용할 것인가?**

```
고려 요소:
1. 하드웨어 코어 수
2. 작업의 성격 (CPU-bound vs I/O-bound)
3. 동기화 오버헤드
4. 메모리 사용량
```

**가이드라인**:

| 작업 유형 | 권장 스레드 수 |
|----------|---------------|
| CPU-bound | 코어 수 |
| I/O-bound | 코어 수 × 2~10 |
| 혼합 | 실험으로 결정 |

```
예:
8코어 머신, CPU 집약 작업
→ 스레드 8개가 적당

8코어 머신, 웹 요청 처리 (I/O 대기 많음)
→ 스레드 16~64개도 가능
```

**너무 많은 스레드의 문제**:

```
스레드 수 > 코어 수 × 적정 배수

문제:
- 컨텍스트 스위칭 오버헤드
- 메모리 사용 증가
- 캐시 효율 저하
- 동기화 경쟁 증가
```

---

## Rule 3: 스케줄링 정책 선택

**작업을 스레드에 어떻게 할당할 것인가?**

### 정적 스케줄링

```
컴파일 타임 또는 실행 시작 시 결정

장점:
- 오버헤드 낮음
- 예측 가능

단점:
- 부하 불균형 가능

예:
Thread 0: items[0..N/4]
Thread 1: items[N/4..N/2]
Thread 2: items[N/2..3N/4]
Thread 3: items[3N/4..N]
```

### 동적 스케줄링

```
런타임에 작업 할당

장점:
- 부하 균형
- 가변 작업 크기 대응

단점:
- 스케줄링 오버헤드
- 예측 어려움

예: 작업 큐
Thread: while (!queue.empty()) {
    work = queue.pop();
    process(work);
}
```

### 청크 크기

```
동적 스케줄링에서 한 번에 가져오는 작업 수

작은 청크:
- 부하 균형 ↑
- 오버헤드 ↑

큰 청크:
- 오버헤드 ↓
- 부하 불균형 가능

균형:
- 작업 수 / (스레드 수 × 10) 정도로 시작
- 실험으로 조정
```

---

## Rule 4: 공유 데이터 식별

**동시 접근되는 데이터를 파악**.

```
공유 데이터 분류:

1. 읽기 전용 (Read-only):
   - 동기화 불필요
   - 안전하게 공유

2. 읽기-쓰기 (Read-Write):
   - 동기화 필요
   - 레이스 컨디션 위험

3. 쓰기 전용 (Write-only):
   - 동기화 필요
   - 결과 수집 시 주의
```

```
예: 히스토그램 계산

공유 데이터 분석:
- input[] : 읽기 전용 → 동기화 불필요
- histogram[] : 읽기-쓰기 → 동기화 필요

해결책:
1. 락 사용 (느림)
2. 원자 연산 (중간)
3. 스레드별 로컬 히스토그램 후 병합 (빠름)
```

**공유 최소화 원칙**:

```
가능하면:
- 로컬 복사본 사용
- 스레드별 결과 수집 후 병합
- 불변 데이터 구조 사용
```

---

## Rule 5: 동기화 메커니즘 선택

**상황에 맞는 도구 사용**.

| 메커니즘 | 용도 | 오버헤드 |
|----------|------|----------|
| **뮤텍스** | 상호 배제 | 중간 |
| **읽기-쓰기 락** | 읽기 많은 경우 | 중간~높음 |
| **원자 연산** | 단순 카운터 | 낮음 |
| **조건 변수** | 이벤트 대기 | 중간 |
| **배리어** | 동기화 지점 | 높음 |
| **락-프리** | 고성능 필요 | 복잡함 |

```
선택 가이드:

단순 카운터/플래그?
→ 원자 연산

복잡한 임계 영역?
→ 뮤텍스

읽기 >> 쓰기?
→ 읽기-쓰기 락

모든 스레드 동기화?
→ 배리어

생산자-소비자?
→ 조건 변수
```

---

## Rule 6: 락 범위 최소화

**임계 영역을 가능한 작게**.

```
나쁜 예:
lock(mutex);
read_file();      // I/O (오래 걸림)
process_data();   // 계산
update_shared();  // 실제로 락 필요한 부분
unlock(mutex);

좋은 예:
read_file();      // 락 밖에서
process_data();   // 락 밖에서
lock(mutex);
update_shared();  // 락 안에서 (최소 범위)
unlock(mutex);
```

**락 범위 최소화 기법**:

```
1. 지역 변수로 계산 후 한 번에 업데이트
   local_result = heavy_computation();
   lock(mutex);
   shared_result = local_result;
   unlock(mutex);

2. 조기 반환
   lock(mutex);
   if (condition_not_met) {
       unlock(mutex);
       return;  // 빠른 탈출
   }
   // 실제 작업
   unlock(mutex);

3. 락 분리 (Lock Splitting)
   // 하나의 큰 락 대신 여러 작은 락
   lock(mutex_for_field_a);
   update_field_a();
   unlock(mutex_for_field_a);

   lock(mutex_for_field_b);
   update_field_b();
   unlock(mutex_for_field_b);
```

---

## Rule 7: 단순하게 유지

**복잡한 동시성 코드는 버그의 온상**.

```
원칙:
- 가장 단순한 해결책 먼저
- 최적화는 측정 후에
- 명확한 소유권 정책
- 문서화
```

```
복잡한 코드 경고 신호:

✗ 여러 락의 중첩
✗ 락-프리 알고리즘 직접 구현
✗ 복잡한 조건 대기
✗ 숨겨진 공유 상태

개선:
- 잘 테스트된 라이브러리 사용
- 패턴 적용 (생산자-소비자, 스레드 풀)
- 코드 리뷰 필수
```

**단순화 전략**:

```
1. 병렬화 범위 축소
   모든 것 → 핫스팟만

2. 표준 패턴 사용
   직접 구현 → 라이브러리

3. 공유 줄이기
   공유 데이터 → 메시지 전달

4. 불변성 활용
   가변 공유 → 불변 + 복사
```

---

## Rule 8: 테스트, 테스트, 테스트

**동시성 버그는 재현이 어렵다**.

```
동시성 테스트의 어려움:
- 비결정성: 매번 다른 실행 순서
- 하이젠버그: 관찰하면 사라짐
- 타이밍 의존: 특정 조건에서만 발생
```

**테스트 전략**:

```
1. 단위 테스트
   - 순차 로직 먼저 검증
   - 동기화 코드 격리 테스트

2. 스트레스 테스트
   - 많은 스레드로 오래 실행
   - 다양한 부하 조건

3. 레이스 탐지 도구
   - ThreadSanitizer (TSan)
   - Helgrind (Valgrind)
   - Intel Inspector

4. 모델 체킹
   - 모든 인터리빙 탐색
   - 작은 코드에 적합
```

```
예: 스트레스 테스트

for (iteration = 0; iteration < 10000; iteration++) {
    reset_state();
    spawn_threads(100);  // 많은 스레드
    run_concurrent_test();
    verify_invariants();
}
```

**도구 사용**:

```
ThreadSanitizer 예:
$ clang++ -fsanitize=thread program.cpp
$ ./a.out

출력:
WARNING: ThreadSanitizer: data race
  Write of size 4 at 0x7f... by thread T1:
    #0 increment() program.cpp:10
  Previous read of size 4 at 0x7f... by thread T2:
    #0 read_counter() program.cpp:15
```

---

## 정리

| 규칙 | 핵심 | 질문 |
|------|------|------|
| 1. 작업 식별 | 병렬화 대상 | 무엇이 독립적인가? |
| 2. 동시성 수준 | 스레드 수 | 몇 개가 적당한가? |
| 3. 스케줄링 | 작업 할당 | 정적 vs 동적? |
| 4. 공유 데이터 | 동기화 대상 | 무엇이 공유되는가? |
| 5. 동기화 | 메커니즘 | 어떤 도구를 쓸까? |
| 6. 락 범위 | 최소화 | 임계 영역이 작은가? |
| 7. 단순함 | KISS | 더 단순할 수 없나? |
| 8. 테스트 | 검증 | 충분히 테스트했나? |

---

## 핵심 비교

| 스케줄링 | 장점 | 단점 | 적합한 경우 |
|----------|------|------|------------|
| 정적 | 오버헤드↓ | 불균형 가능 | 균등한 작업 |
| 동적 | 균형 | 오버헤드↑ | 가변 작업 |

| 동기화 | 성능 | 복잡도 | 용도 |
|--------|------|--------|------|
| 원자 연산 | 높음 | 낮음 | 단순 변수 |
| 뮤텍스 | 중간 | 중간 | 임계 영역 |
| 락-프리 | 최고 | 높음 | 고성능 필수 |

---

## 관련 항목

- [Ch 3: Proving Correctness and Measuring Performance](/blog/parallel/art-of-concurrency/chapter03-correctness-performance) — 정확성과 성능
- [Ch 5: Threading Libraries](/blog/parallel/art-of-concurrency/chapter05-threading-libraries) — 라이브러리
- [AMP Ch 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion) — 상호 배제 이론
- [C++ Concurrency Ch 4: Synchronizing Operations](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-operations) — 동기화 상세
