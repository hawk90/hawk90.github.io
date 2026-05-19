---
title: "Part 16-01: GetStackTrace와 Symbolize — crash 시 readable stack"
date: 2026-05-26T08:00:00
description: "absl::GetStackTrace로 PC 배열을 받고 absl::Symbolize로 함수 이름·파일·라인으로 변환. signal handler 안에서도 동작하는 async-safe API."
series: "Abseil Code Review"
seriesOrder: 76
tags: [cpp, abseil, stacktrace, symbolize, debugging]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

## 한 줄 요약

`absl::GetStackTrace`는 현재 PC 체인을 배열로 채운다. `absl::Symbolize`는 그 PC를 *함수 이름 + 파일 + 라인*으로 변환한다. 두 함수는 *signal handler 안에서 안전하게 호출*할 수 있도록 설계되어 crash 시 readable한 스택을 stderr/log로 남길 수 있다. `LOG(FATAL)`/`CHECK` 실패 출력의 근간이 이 둘이다.

## 동기

production crash에서 가장 비싼 디버깅 비용은 *스택을 사람이 읽을 수 있게 만드는 일*이다. core dump가 있다면 `gdb`로 풀 수 있지만, 다음 상황에서는 core dump가 옵션이 아니다.

- container 환경에서 core dump 비활성화.
- core 크기가 수 GB라 저장·전송 불가.
- intermittent crash라 reproduce 안 됨.

이때는 프로세스가 죽기 직전 *자기 자신*이 스택을 출력해야 한다. 다음 두 가지가 필요하다.

1. PC 배열 수집 (`unwind`).
2. PC → symbol 변환 (`addr2line`이 평소 하는 일).

`absl::GetStackTrace` + `absl::Symbolize`가 이를 *async-signal-safe*하게 한다.

## API와 사용법

```cpp
#include "absl/debugging/stacktrace.h"
#include "absl/debugging/symbolize.h"

void DumpStack() {
  constexpr int kMaxDepth = 32;
  void* pcs[kMaxDepth];
  int n = absl::GetStackTrace(pcs, kMaxDepth, /*skip_count=*/1);

  for (int i = 0; i < n; ++i) {
    char buf[1024];
    if (absl::Symbolize(pcs[i], buf, sizeof(buf))) {
      std::fprintf(stderr, "  #%d 0x%p %s\n", i, pcs[i], buf);
    } else {
      std::fprintf(stderr, "  #%d 0x%p ??\n", i, pcs[i]);
    }
  }
}
```

`skip_count=1`은 `GetStackTrace` 자신의 프레임을 건너뛴다. `DumpStack` 자신도 빼고 싶으면 2로.

### Symbolize 초기화

심볼라이저는 한 번 초기화가 필요하다. main 진입 직후가 보통.

```cpp
int main(int argc, char** argv) {
  absl::InitializeSymbolizer(argv[0]);  // 실행 파일 경로 필요
  // ... 이후 LOG(FATAL), Symbolize 등 사용 가능
}
```

`argv[0]`로부터 실행 파일을 열어 ELF/Mach-O 심볼 테이블을 읽는다. *한 번 초기화 후* Symbolize 호출은 alloc 없이 동작하도록 사전 buffer를 잡는다. signal handler 안전성의 핵심.

## 내부 구현 — unwind

`absl/debugging/internal/stacktrace_*.inc`에 플랫폼별 구현이 있다. 주요 백엔드는 다음과 같다.

- `stacktrace_libunwind-inl.inc` — libunwind 기반 (Linux x86_64, ARM64).
- `stacktrace_x86-inl.inc` — frame pointer 기반.
- `stacktrace_powerpc-inl.inc`, `stacktrace_aarch64-inl.inc` — 아키텍처 직접.
- `stacktrace_win32-inl.inc` — Windows.

기본 동작은 *frame pointer 체인 추적*이다.

```text
[rbp 위로 거슬러 올라가며]
  rbp → 이전 rbp
  rbp + 8 → 호출자의 PC

각 프레임에서 PC를 pcs[]에 기록.
```

frame pointer가 omitted된(`-fomit-frame-pointer`) 빌드에서는 libunwind가 *DWARF .eh_frame*을 사용해 좀 더 정교한 unwind를 한다. 비용은 frame pointer 방식보다 크지만 정확하다.

## 내부 구현 — Symbolize

`absl/debugging/symbolize_elf.inc` (Linux 기준)의 흐름:

1. PC가 속한 ELF 모듈 찾기 (`dl_iterate_phdr` 결과를 사전 캐싱).
2. 모듈 내 `.symtab` / `.dynsym`에서 PC ≤ symbol_value + size인 가장 가까운 심볼.
3. 결과 심볼 이름을 mangled 그대로 반환 (또는 demangle 옵션 적용).

```cpp
// 핵심 (요약)
bool Symbolize(const void* pc, char* out, int out_size) {
  uintptr_t addr = reinterpret_cast<uintptr_t>(pc);

  // 1. PC가 속한 ELF 모듈 검색 (캐시)
  const SymbolicationModule* mod = FindModuleForPC(addr);
  if (!mod) return false;

  // 2. symbol table에서 binary search
  const ElfSymbol* sym = mod->FindSymbol(addr - mod->base);
  if (!sym) return false;

  // 3. demangle (옵션)
  return Demangle(sym->name, out, out_size);
}
```

핵심 설계 결정은 *심볼 테이블을 사전에 mmap*해 두고 *signal handler 안에서는 alloc/lock 없이 lookup만* 한다는 점.

## crash 핸들러에서 사용

`absl/debugging/failure_signal_handler.h`가 통합 도구를 제공한다.

```cpp
#include "absl/debugging/failure_signal_handler.h"

int main(int argc, char** argv) {
  absl::InitializeSymbolizer(argv[0]);
  absl::FailureSignalHandlerOptions opts;
  opts.use_alternate_stack = true;
  opts.alarm_on_failure_secs = 3;
  absl::InstallFailureSignalHandler(opts);
  // ...
}
```

이제 SIGSEGV/SIGABRT/SIGFPE 발생 시 자동으로 *심볼화된 스택*이 stderr로 출력된다. `LOG(FATAL)` 출력 형식과 일치.

```text
*** SIGSEGV (@0x0) received by PID 12345 (TID 0x7f...) ...
PC: @     0x55... main
    @     0x7f... __libc_start_main
    @     0x55... _start
```

## std와 boost와의 비교

| 항목 | abseil | std (C++23) | boost |
|---|---|---|---|
| stack trace | `GetStackTrace` (async-safe) | `std::stacktrace` (not async-safe) | `boost::stacktrace` |
| symbolize | `Symbolize` (async-safe) | `std::stacktrace_entry::description` | demangle 호출 |
| signal handler | 안전 | 미정의 | 일부 안전 |
| 표준 포함 | × | C++23 | × |
| backtrace lib 의존 | optional libunwind | libstdc++ libbacktrace | libbacktrace/dbghelp |

C++23 `std::stacktrace`는 *async-signal-safe를 요구하지 않는다*. crash handler에서는 여전히 abseil이 적격.

## 코드 리뷰 포인트

**1. signal handler 안에서 alloc·lock 금지**

```cpp
// 회피 — std::string은 alloc, std::cout은 stream lock
void Handler(int) {
  std::string s = MakeMessage();
  std::cout << s;
}

// Good — async-safe만
void Handler(int) {
  static char buf[256];
  int n = snprintf(buf, sizeof(buf), "crash\n");
  ::write(STDERR_FILENO, buf, n);
}
```

`absl::Symbolize`는 *내부 buffer를 사전 잡아둔다*. handler 안에서 호출해도 lock 없음.

**2. InitializeSymbolizer를 잊지 않는다**

```cpp
// 회피
absl::Symbolize(pc, buf, sizeof(buf));   // 호출은 되지만 결과 빈약

// Good
absl::InitializeSymbolizer(argv[0]);
absl::Symbolize(pc, buf, sizeof(buf));
```

초기화 없이도 함수가 동작하지만 심볼 lookup이 실패하거나 mangled 이름만 나온다.

**3. 빌드 옵션 — frame pointer 유지**

```bash
# Release 빌드에 frame pointer 유지 (스택 추적 정확도)
g++ -O2 -fno-omit-frame-pointer ...
```

`-fomit-frame-pointer`로 빌드된 release는 unwind가 부정확하다. 약간의 성능을 양보해도 디버깅 가능성을 선택하는 게 보통의 균형.

**4. skip_count 정확히**

```cpp
int n = absl::GetStackTrace(pcs, 32, /*skip*/ 0);  // GetStackTrace 자신 포함
int n = absl::GetStackTrace(pcs, 32, /*skip*/ 1);  // 호출자부터
```

`skip_count`가 너무 작으면 출력 첫 줄에 `absl::GetStackTrace`만 보인다.

## 자주 보는 안티패턴

**signal handler에서 LOG(FATAL)**

```cpp
void Handler(int) { LOG(FATAL) << "crash"; }   // 비추천
```

`LOG`는 mutex를 잡는다. signal handler 안 lock은 데드락 위험. 대신 `RAW_LOG(FATAL, "crash")` ([Part 2-07](/blog/programming/code-review/abseil/part2-07-raw-logging)).

**Symbolize 실패 시 빈 출력**

```cpp
if (absl::Symbolize(pc, buf, sizeof(buf))) {
  printf("%s\n", buf);
}
// else 무시 — PC라도 찍어야 분석 가능
```

실패해도 PC를 hex로 남기면 `addr2line`으로 후처리할 수 있다.

**stack depth 너무 작게**

```cpp
void* pcs[8];   // 깊은 스택에서 부족
int n = absl::GetStackTrace(pcs, 8, 0);
```

Google 내부 보통 32~64. 깊이 비용은 무시할 수준.

## 정리

- `GetStackTrace`로 PC 배열, `Symbolize`로 함수 이름.
- 둘 다 async-signal-safe로 설계 — crash handler에서 직접 호출 가능.
- `InstallFailureSignalHandler`가 SIGSEGV/SIGABRT/SIGFPE 통합 처리.
- 프로덕션 빌드는 *frame pointer 유지* + 심볼 테이블 포함.
- `LOG(FATAL)`/`CHECK` 실패 출력의 기반이다.

## 다음 편

[Part 16-02 — CRC32C](/blog/programming/code-review/abseil/part16-02-crc32c)에서 하드웨어 가속 체크섬을 본다.

## 관련 항목

- [Part 16-02 — CRC32C](/blog/programming/code-review/abseil/part16-02-crc32c)
- [Part 16-03 — PeriodicSampler](/blog/programming/code-review/abseil/part16-03-periodic-sampler)
- [Part 2-07 — RAW_LOG](/blog/programming/code-review/abseil/part2-07-raw-logging)
- [Part 11-04 — stack trace handler](/blog/programming/code-review/abseil/part11-04-stack-trace-handler)
- [Folly Part 9-01 — symbolizer](/blog/programming/code-review/folly/part9-01-symbolizer)
