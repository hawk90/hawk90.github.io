---
title: "항목 50: new와 delete를 교체할 만한 경우를 이해하라"
date: 2025-02-03T02:00:00
description: "사용자 정의 new/delete가 정당한 시나리오 — 성능, 디버깅, 통계, alignment, 클러스터링. tcmalloc/jemalloc 대안."
tags: [C++, Effective C++, new, delete, Memory]
series: "Effective C++"
seriesOrder: 50
draft: true
---

## 왜 이 항목이 중요한가?

표준 `operator new`와 `operator delete`는 **범용적으로 잘 설계**되어 있다. 평균적으로 빠르고, 정확하며, thread-safe하다. 그래서 90% 이상의 코드는 그대로 쓰면 된다.

다만 특정 도메인에선 사용자 정의 할당기가 결정적 이득을 준다.

- **메모리 패턴 추적**, 디버깅, 통계.
- **풀 할당** — 같은 크기 객체를 빠르게.
- **캐시 정렬** — alignment 요구 충족.
- **클러스터링** — 관련 객체를 같은 페이지에.
- **임베디드** — 동적 할당 자체를 통제.
- **외부 대체** — tcmalloc, jemalloc, mimalloc.

이 항목은 사용자 정의 할당기가 정당한 6가지 시나리오와 외부 라이브러리 옵션을 정리한다.

## 개요

표준 `operator new`와 `operator delete`는 **범용적**으로 잘 만들어져 있다. 평균적으로 빠르고, 정확하며, thread-safe하다. 그러나 특정 도메인에선 사용자 정의 할당기가 더 우수할 수 있다. 메모리 패턴 추적, 풀 할당, 캐시 정렬, 클러스터링 등이다. 이 항목은 사용자 정의 할당기가 **정당한 시나리오 6가지**와 **외부 대체 라이브러리** 옵션을 다룬다.

## 1) 사용 패턴 통계 / 디버깅

런타임에 메모리 패턴을 추적하고 싶을 때:

```cpp
namespace memory_tracker {
    std::atomic<size_t> totalAllocated{0};
    std::atomic<size_t> allocCount{0};
}

void* operator new(std::size_t size) {
    void* p = std::malloc(size);
    if (!p) throw std::bad_alloc();
    memory_tracker::totalAllocated += size;
    memory_tracker::allocCount++;
    return p;
}

void operator delete(void* p) noexcept {
    if (p) {
        // size 추적은 더 복잡 — 별도 메타데이터 필요
        std::free(p);
    }
}
```

- 메모리 누수 추적
- 할당 패턴 분석 (어느 크기가 자주 할당되는가)
- 디버그 빌드에 magic number로 사용 후 해제 메모리 탐지

표준 라이브러리도 디버그 빌드에 비슷한 기능 — Address Sanitizer, Valgrind 등.

## 2) 효율 — 풀 할당 / 객체별 할당기

표준 `new`는 범용 — 모든 크기·패턴 처리. 특정 크기/패턴에 맞춘 풀 할당기는 훨씬 빠를 수 있음.

```cpp
class Widget {
    static FixedPool<sizeof(Widget)> pool;
public:
    static void* operator new(std::size_t size) {
        if (size != sizeof(Widget))
            return ::operator new(size);     // derived 처리
        return pool.allocate();
    }

    static void operator delete(void* p, std::size_t size) noexcept {
        if (!p) return;
        if (size != sizeof(Widget)) {
            ::operator delete(p);
            return;
        }
        pool.deallocate(p);
    }
};

FixedPool<sizeof(Widget)> Widget::pool;
```

**왜 빠른가**:
- 미리 큰 블록 한 번 할당 후 분할
- malloc/free 시스템 호출 회피
- 같은 크기 객체만 → fragmentation 0
- thread-local로 lock-free 가능

특히 **소형 객체 + 빈번한 생성/소멸**에 효과. 게임 엔진의 파티클, 노드 등.

## 3) 캐시 정렬 (cache line alignment)

표준 `new`의 정렬 보장은 보통 `alignof(std::max_align_t)` (8 또는 16 byte). SIMD나 캐시 라인 정렬이 필요하면:

```cpp
// C++17 이전
void* operator new(std::size_t size) {
    void* p = nullptr;
    if (posix_memalign(&p, 64, size) != 0)
        throw std::bad_alloc();
    return p;
}

// C++17+ 표준
void* operator new(std::size_t size, std::align_val_t alignment) {
    return std::aligned_alloc(static_cast<size_t>(alignment), size);
}
```

활용:
- SIMD 명령(SSE/AVX) — 16/32 byte 정렬 필요
- false sharing 회피 — 캐시 라인(64 byte) 격리
- DMA 호환 메모리

C++17 `alignas` + `operator new(size_t, align_val_t)` 결합:

```cpp
struct alignas(64) CacheLineAligned {
    int data[16];
};

auto* p = new CacheLineAligned;     // 자동으로 align-aware new 호출
```

## 4) 클러스터링 (메모리 지역성)

함께 자주 사용되는 객체를 같은 페이지에 둠 — 페이지 폴트 ↓, TLB 효율 ↑.

```cpp
class Game {
    std::pmr::monotonic_buffer_resource pool;     // C++17
public:
    std::pmr::vector<Enemy> enemies{&pool};        // 모두 같은 풀
    std::pmr::vector<Bullet> bullets{&pool};
};
```

게임의 모든 객체가 같은 풀 → 같은 메모리 영역 → 캐시 친화. 표준 `<memory_resource>`(C++17)가 이 패턴 지원.

## 5) 비표준 동작 추가

- **할당 ID 부여** — 객체 추적
- **소유자 정보 기록** — "어느 모듈이 할당했나"
- **자동 zero-init** — security 요구사항

```cpp
void* operator new(std::size_t size) {
    void* p = std::malloc(size);
    std::memset(p, 0, size);     // 자동 zero
    return p;
}
```

## 6) 표준 구현이 비효율인 경우

특정 컴파일러/OS의 기본 할당기가 느릴 수 있음 — 드뭄. 보통은 **외부 라이브러리 교체**가 더 좋음:

### `tcmalloc` (Google)
- thread-local 캐시
- 작은 객체 할당이 매우 빠름
- 사용: 링크 시 `-ltcmalloc`

### `jemalloc` (Facebook)
- 단편화 적음
- 멀티스레드 friendly
- Firefox, Rust 표준 등 채용

### `mimalloc` (Microsoft)
- 모던 설계 (free list shading)
- 빠르고 메모리 적음

링크만 바꾸면 적용 — `operator new`/`delete`를 자동 교체. 직접 작성보다 훨씬 안전.

## 직접 만들기 어렵다 — 미묘함

올바른 `operator new` 구현은 의외로 복잡:

- **thread safety** — 보통 lock 또는 lock-free 자료 구조
- **alignment 보장** — 모든 타입에 충분한 정렬
- **0-byte 요청 처리** — 표준은 0-byte도 유효 포인터 보장
- **handler 호출 루프** (항목 49)
- **glibc malloc 호환** — 다른 라이브러리가 `free`를 부를 수도

직접 작성하기보다 — **외부 검증된 라이브러리** 우선.

## 흔한 함정

### thread safety 무시

```cpp
class WidgetPool {
    Widget* freeList;
public:
    void* allocate() {
        if (freeList) {
            Widget* p = freeList;
            freeList = freeList->next;     // ⚠️ race
            return p;
        }
        // ...
    }
};
```

멀티스레드 환경에선 lock 또는 atomic 자료 구조 필요.

### 정렬 깨뜨림

```cpp
void* operator new(std::size_t size) {
    static char buffer[1024];
    static size_t offset = 0;
    void* p = buffer + offset;
    offset += size;                  // ⚠️ alignment 보장 X
    return p;
}
```

`alignof(std::max_align_t)` 보장 필요 — 임의 타입에 대해.

### 짝 맞춤

```cpp
void* operator new(size_t size);
// operator delete는? — 짝 안 맞으면 누수 또는 mismatch
```

항목 51 — new를 정의하면 delete도.

## 모던 변형 — `std::pmr` (C++17 polymorphic allocator)

```cpp
#include <memory_resource>

std::pmr::monotonic_buffer_resource pool(1024 * 1024);
std::pmr::vector<int> v(&pool);              // 풀에서 할당
std::pmr::unordered_map<int, std::string> m(&pool);

// 풀 해제 시 모든 객체 자동 정리
```

표준 컨테이너에 사용자 정의 메모리 자원 주입 — `operator new` 교체 없이.

다양한 풀:
- `monotonic_buffer_resource` — 한 번 할당, 풀 해제 시 한 번에
- `unsynchronized_pool_resource` — 단일 스레드 풀
- `synchronized_pool_resource` — 멀티스레드 풀

## 실무 가이드 — 결정 트리

```
메모리 할당 최적화가 필요한가?
├── 측정 결과 표준이 충분 → 그대로 (대부분)
├── 통계/디버깅 → 외부 도구 (sanitizer, valgrind)
├── 메모리 풀 — 모던 → std::pmr (C++17)
├── 메모리 풀 — 옛 → 직접 operator new (또는 외부 라이브러리)
├── alignment 필요 → alignas + C++17 align-aware new
├── 더 빠른 할당기 → tcmalloc / jemalloc / mimalloc 링크
└── 정말 표준 비효율 → 사용자 정의 (마지막 수단)
```

## 실무 가이드 — 체크리스트

- [ ] 측정 결과 메모리 할당이 병목인가?
- [ ] `std::pmr`로 충분한가? (C++17+)
- [ ] 외부 할당기(tcmalloc 등)로 해결되나?
- [ ] 정말 사용자 정의 필요하면 — 짝 맞는 delete?
- [ ] thread safety / alignment / 0-byte 처리?
- [ ] handler 호출 루프 구현?

## 핵심 정리

1. **사용자 정의 new/delete의 정당한 사유**: 통계, 풀 효율, 정렬, 클러스터링, 비표준 동작
2. **표준 할당기가 평균적으로 좋음** — 측정 후 교체
3. **외부 라이브러리(tcmalloc/jemalloc/mimalloc)** 가 직접 작성보다 안전
4. **C++17 `std::pmr`** — 표준 도구로 메모리 풀
5. **C++17 align-aware new** — alignas와 함께
6. 직접 작성은 어려움 — thread safety, alignment, 0-byte, handler 모두 고려

## 관련 항목

- [항목 49: new-handler](/blog/programming/cpp/effective-cpp/item49-understand-the-behavior-of-the-new-handler) — 실패 처리
- [항목 51: new/delete 규약](/blog/programming/cpp/effective-cpp/item51-adhere-to-convention-when-writing-new-and-delete) — 직접 작성 규칙
- [항목 52: placement delete](/blog/programming/cpp/effective-cpp/item52-write-placement-delete-if-you-write-placement-new) — 짝 맞춤
