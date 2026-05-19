---
title: "Part 6-05: Mutex annotations — clang thread-safety로 race를 컴파일 타임에"
date: 2026-05-24T15:00:00
description: "Part 6-05: ABSL_GUARDED_BY, ABSL_LOCKS_EXCLUDED, ABSL_EXCLUSIVE_LOCKS_REQUIRED — clang -Wthread-safety와 결합해 lock 누락을 정적 검출."
series: "Abseil Code Review"
seriesOrder: 38
tags: [cpp, abseil, sync, annotations, thread-safety]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: false
---

## 한 줄 요약

`ABSL_GUARDED_BY(mu_)`, `ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_)`, `ABSL_LOCKS_EXCLUDED(mu_)` 같은 매크로는 *clang의 `-Wthread-safety`* 정적 분석을 활성화한다. 멤버 변수와 함수에 lock 규약을 선언하면, 위반 시 **컴파일 시점**에 경고가 뜬다. race condition을 실행하기 전에 잡는 가장 효과적인 도구.

## 동기

race condition은 보통 *간헐적* 버그다. 테스트가 안 잡고 production에서 데이터 손상으로 나타난다. 정적 분석으로 *컴파일러가* 누락된 lock을 잡으면 비용이 압도적으로 낮다.

clang은 `-Wthread-safety` 플래그로 lock 규약을 추적한다. abseil은 그 매크로를 portable한 형태로 제공한다.

## 핵심 매크로

| 매크로 | 의미 | 부착 위치 |
|---|---|---|
| `ABSL_GUARDED_BY(mu)` | 이 멤버는 mu 보유 상태에서만 접근 | 멤버 변수 |
| `ABSL_PT_GUARDED_BY(mu)` | 포인터가 가리키는 객체가 mu 보호 | 포인터 멤버 |
| `ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu)` | 호출 측이 mu(exclusive) 보유해야 함 | 함수 |
| `ABSL_SHARED_LOCKS_REQUIRED(mu)` | 호출 측이 mu(shared) 보유해야 함 | 함수 |
| `ABSL_LOCKS_EXCLUDED(mu)` | 호출 시 mu를 보유하면 안 됨 (재진입 방지) | 함수 |
| `ABSL_ACQUIRED_BEFORE(mu)` / `ABSL_ACQUIRED_AFTER(mu)` | lock 순서 선언 | mutex 멤버 |
| `ABSL_NO_THREAD_SAFETY_ANALYSIS` | 분석 비활성화 (escape hatch) | 함수 |

## 기본 사용

```cpp
#include "absl/base/thread_annotations.h"
#include "absl/synchronization/mutex.h"

class Cache {
 public:
  void Set(absl::string_view k, absl::string_view v)
      ABSL_LOCKS_EXCLUDED(mu_);
  std::string Get(absl::string_view k) const
      ABSL_LOCKS_EXCLUDED(mu_);

 private:
  std::string LookupLocked(absl::string_view k) const
      ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_);

  mutable absl::Mutex mu_;
  absl::flat_hash_map<std::string, std::string> data_ ABSL_GUARDED_BY(mu_);
};

void Cache::Set(absl::string_view k, absl::string_view v) {
  absl::MutexLock l(&mu_);
  data_[std::string(k)] = std::string(v);   // OK — mu_ 보유
}

std::string Cache::Get(absl::string_view k) const {
  // 회피 — lock 없이 data_ 접근
  // return data_[std::string(k)];   // 경고: writing data_ requires holding mu_

  absl::MutexLock l(&mu_);
  return LookupLocked(k);   // OK — LookupLocked는 mu_ 요구, 우리가 보유
}

std::string Cache::LookupLocked(absl::string_view k) const {
  // mu_ 가 잡혀 있다고 가정 가능
  auto it = data_.find(k);
  return it == data_.end() ? "" : it->second;
}
```

clang은 컴파일하며 다음을 검사한다.

- `data_` 접근 시 `mu_`가 보유되어 있는가?
- `LookupLocked` 호출 측이 `mu_`를 보유하는가?
- `Set`이 `mu_`를 잡지 않고 진입하는가? (`LOCKS_EXCLUDED`)

위반은 *컴파일 경고*.

## LOCKS_EXCLUDED — 재진입 방지

```cpp
void Cache::Refresh() ABSL_LOCKS_EXCLUDED(mu_) {
  // 외부에서 mu_ 잡지 않고 호출되어야 함
  absl::MutexLock l(&mu_);
  // ...
}

void OtherMethod() {
  absl::MutexLock l(&mu_);
  Refresh();   // 경고 — mu_ 보유 상태에서 LOCKS_EXCLUDED 함수 호출
}
```

`absl::Mutex`는 *비-재진입*이다. 재진입 시 deadlock. annotation이 이를 정적으로 잡는다.

## SHARED vs EXCLUSIVE

```cpp
class Config {
 public:
  std::string Get(absl::string_view k) const
      ABSL_SHARED_LOCKS_REQUIRED(mu_);   // reader lock만으로 충분

  void Set(absl::string_view k, absl::string_view v)
      ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_);   // writer lock 필요

 private:
  mutable absl::Mutex mu_;
  absl::flat_hash_map<std::string, std::string> data_ ABSL_GUARDED_BY(mu_);
};

// 호출 측
absl::ReaderMutexLock l(&cfg.mu_);
cfg.Get(...);   // OK
cfg.Set(...);   // 경고: EXCLUSIVE 요구
```

## NO_THREAD_SAFETY_ANALYSIS — 마지막 수단

분석을 끌 수밖에 없는 경우가 있다.

- callback 안에서 lock 보유 가정이 정적으로 표현 안 될 때
- third-party API와의 경계
- thread-local 가정으로 안전한 코드

```cpp
void TrickyHandler() ABSL_NO_THREAD_SAFETY_ANALYSIS {
  // 분석 비활성화
}
```

남발 금지. 주석으로 *왜* 안전한지 문서화.

## ACQUIRED_BEFORE / ACQUIRED_AFTER

여러 mutex의 lock 순서를 강제할 수 있다.

```cpp
class Manager {
  absl::Mutex global_mu_;
  absl::Mutex local_mu_ ABSL_ACQUIRED_AFTER(global_mu_);
};
```

`global_mu_` → `local_mu_` 순서 강제. 역순으로 잡으면 경고.

## 컴파일러 옵션

clang은 `-Wthread-safety`로 활성화. 보통 다음 플래그를 함께 쓴다.

```bash
clang++ -Wthread-safety -Wthread-safety-beta my_code.cc
```

`-Werror=thread-safety`로 경고를 에러로 격상하면 빌드가 실패하므로 강제력이 생긴다.

GCC는 같은 분석을 지원하지 않는다. abseil 매크로는 GCC에서 no-op로 정의되어 컴파일은 성공한다.

## 코드 리뷰 포인트

**1. mutex가 있는 클래스는 *모든* 멤버에 GUARDED_BY**

부분 적용은 잡을 수 있는 race를 놓친다. mutex와 함께 다니는 모든 데이터에 적용.

```cpp
class Inbox {
  absl::Mutex mu_;
  std::deque<Msg> q_ ABSL_GUARDED_BY(mu_);
  size_t total_received_ ABSL_GUARDED_BY(mu_);   // 빼먹지 말 것
  size_t total_processed_ ABSL_GUARDED_BY(mu_);
};
```

**2. private helper에 EXCLUSIVE_LOCKS_REQUIRED**

```cpp
class Manager {
  void DoWork(int x) ABSL_LOCKS_EXCLUDED(mu_);
 private:
  void DoWorkLocked(int x) ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_);
  absl::Mutex mu_;
};
```

`DoWorkLocked` 이름 + annotation의 결합이 가독성을 결정적으로 높인다.

**3. mutex 잡고 callback 호출 검토**

```cpp
void Process() {
  absl::MutexLock l(&mu_);
  callback_();   // 회피 — callback이 무엇을 하는지 모름, 다른 lock 잡으면 deadlock
}
```

callback을 잡은 mutex 밖에서 호출하도록 재배치. annotation은 이를 직접 잡지 못하지만, 리뷰에서 의식적으로 살핀다.

**4. NO_THREAD_SAFETY_ANALYSIS 사용 시 주석 의무**

```cpp
// Thread safety: caller guarantees mu_ is held via shared_ptr binding.
void X() ABSL_NO_THREAD_SAFETY_ANALYSIS { ... }
```

## 안티패턴

**경고 무시 빌드**

`-Wthread-safety`를 켜고 경고가 누적되면 가치가 떨어진다. CI에서 `-Werror=thread-safety`로 강제.

**임시 변수 escape**

```cpp
class Foo {
 public:
  Bar* GetUnsafe() ABSL_LOCKS_EXCLUDED(mu_) {
    absl::MutexLock l(&mu_);
    return &bar_;   // 회피 — lock 밖으로 포인터 노출
  }
 private:
  absl::Mutex mu_;
  Bar bar_ ABSL_GUARDED_BY(mu_);
};
```

annotation이 통과해도 *런타임에는 unsafe*. 포인터 노출 자체가 race를 만든다.

## 정리

- abseil의 thread-safety 매크로 + clang `-Wthread-safety`로 lock 규약을 컴파일 타임 검증.
- `GUARDED_BY`, `EXCLUSIVE_LOCKS_REQUIRED`, `LOCKS_EXCLUDED`가 핵심 셋.
- mutex 있는 클래스의 *모든* 멤버에 일관 적용.
- `NO_THREAD_SAFETY_ANALYSIS`는 마지막 수단, 항상 주석.
- CI에서 `-Werror=thread-safety`로 강제력 확보.

## 다음 편

Part 6이 끝났다. Part 7에서 시간/Duration/CivilTime을 다룬다.

## 관련 항목

- [Part 6-01 — absl::Mutex](/blog/programming/code-review/abseil/part6-01-mutex)
- [Part 6-02 — Conditional Critical Section](/blog/programming/code-review/abseil/part6-02-conditional-critical-section)
- [Part 2-08 — Thread annotations](/blog/programming/code-review/abseil/part2-08-thread-annotations)
- [Clang docs — Thread Safety Analysis](https://clang.llvm.org/docs/ThreadSafetyAnalysis.html)
