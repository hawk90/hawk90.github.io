---
title: "Part 18-01: folly::Init — main() 부트스트랩"
date: 2026-05-27T18:00:00
description: "folly::Init의 역할 — gflags 파싱, signal handler, glog 설정, exit handler 통합."
series: "Folly Code Review"
seriesOrder: 76
tags: [cpp, folly, init, bootstrap]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `folly::Init`은 main() 첫 줄에 두는 부트스트랩 객체다. gflags 파싱, glog 초기화, signal handler 설치, 기본 thread name까지 *손볼 곳을 한 줄로 줄인다*.

## 동기

C++ 서버 코드의 main()은 대개 다음을 한다.

```cpp
int main(int argc, char* argv[]) {
  google::ParseCommandLineFlags(&argc, &argv, true);
  google::InitGoogleLogging(argv[0]);
  google::InstallFailureSignalHandler();
  // signal mask, locale, OOM score, jemalloc tuning, ...
  RunServer();
  return 0;
}
```

라이브러리마다 자기 init 함수가 있고 순서·옵션이 미묘하게 다르다. 어떤 환경 변수를 읽을지, 어떤 시그널을 잡을지 일관성을 유지하기 어렵다.

`folly::Init`은 이 boilerplate를 RAII 객체 하나로 묶는다.

```cpp
#include <folly/init/Init.h>

int main(int argc, char* argv[]) {
  folly::Init init(&argc, &argv);
  RunServer();
  return 0;
}
```

생성자에서 일괄 초기화, 소멸자에서 일괄 정리. main()이 정상/비정상 종료되든 cleanup이 일관되게 호출된다.

## 무엇이 일어나는가

`folly::Init` 생성자가 다음을 순서대로 실행한다.

1. **gflags 파싱** — `--flag=value` argv 처리. `--help` 응답.
2. **glog 초기화** — log 디렉토리, severity threshold, stderr alsologto.
3. **signal handler 설치** — SIGSEGV/SIGABRT 등에 stacktrace dumper.
4. **symbolizer 초기화** — addr2line 캐시 prewarm.
5. **boost::context size 조정** (fiber 사용 시).
6. **HHWheelTimer global instance 준비**.
7. **jemalloc/RSS 통계 prewarm** (옵션).

소멸자는 (역순으로) glog flush, gflags shutdown 정도.

## API

```cpp
namespace folly {

class Init {
 public:
  enum class InitFlags {
    NO_GLOG     = 0x01,
    NO_GFLAGS   = 0x02,
    NO_SIGNAL_HANDLERS = 0x04,
  };

  Init(int* argc, char*** argv, bool removeFlags = true);
  Init(int* argc, char*** argv, InitOptions options);
  ~Init();

  Init(const Init&) = delete;
  Init& operator=(const Init&) = delete;
};

}
```

- `argc`/`argv`를 *pointer로* 받는다 — gflags 파싱 후 컨슈머 flag을 제거해 application flag만 남긴다.
- `removeFlags=false`로 원본 argv 보존 가능 (parser에 직접 넘기는 경우).
- `InitOptions`로 세부 동작 조절.

```cpp
folly::InitOptions opts;
opts.useGFlags(false);   // gflags 사용 안 함
opts.removeFlags(false); // argv 원본 유지
opts.installSignalHandlers(false);

folly::Init init(&argc, &argv, opts);
```

## 사용 패턴

### 기본

```cpp
int main(int argc, char* argv[]) {
  folly::Init init(&argc, &argv);
  LOG(INFO) << "starting";
  RunServer();
  return 0;
}
```

가장 흔한 형태. fbcode 새 binary의 95%가 이 한 줄로 시작.

### 테스트 fixture

```cpp
int main(int argc, char* argv[]) {
  testing::InitGoogleTest(&argc, argv);
  folly::Init init(&argc, &argv);
  return RUN_ALL_TESTS();
}
```

gtest의 InitGoogleTest를 먼저, folly::Init이 나머지 처리.

### 라이브러리에서

```cpp
// Library code — main() 없음
class MyService {
 public:
  void Start() {
    static folly::Init init{nullptr, nullptr, folly::InitOptions{}.useGFlags(false)};
    // ↑ argv 없는 모드 — gflags 건너뜀
  }
};
```

라이브러리가 self-contained init을 원하면 nullptr argv. 단 이렇게 쓰면 *사용자가 main()에서 별도 init했을 때* 충돌 가능. 라이브러리는 보통 init을 호출자에 맡긴다.

## Signal handler가 하는 일

```cpp
// SIGSEGV / SIGABRT / SIGBUS / SIGFPE / SIGILL
void SignalHandler(int sig) {
  // 1. 현재 thread의 stack trace dump
  folly::symbolizer::dumpStackTrace(STDERR_FILENO);
  // 2. core dump 유도 (default action)
  std::signal(sig, SIG_DFL);
  std::raise(sig);
}
```

crash 시 stacktrace를 stderr에 토해낸 뒤 default action (보통 core dump). google's `InstallFailureSignalHandler`와 비슷하나 folly의 symbolizer를 쓴다 — 더 풍부한 inline / template instantiation info.

## glog 초기화 vs xlog

```cpp
folly::Init init(&argc, &argv);

LOG(INFO) << "with glog";          // OK
XLOG(INFO) << "with xlog";          // OK — folly의 logger

```

`folly::Init`은 glog와 xlog 둘 다 초기화한다. xlog는 folly 자체 logger로 더 풍부한 category/scope 모델. 새 코드는 xlog 선호.

## 코드 리뷰 포인트

- `folly::Init`을 `main()` 첫 줄에 두지 않음 — flag/log가 일관되지 않음.
- `folly::Init` 객체가 stack이 아닌 heap에 — 소멸 시점이 main() 끝과 다름. *RAII 깨짐*.
- `Init` 호출 *전에* LOG 매크로 사용 — glog initialized 안 된 상태에서 동작 미정.
- 라이브러리 코드에서 Init 호출 → main()에서 또 호출하면 중복 / 충돌 가능.

## 자주 보는 안티패턴

```cpp
// 1. Init 후 다시 google::ParseCommandLineFlags 호출
folly::Init init(&argc, &argv);
google::ParseCommandLineFlags(&argc, &argv, true);   // 두 번 — flag 사라짐
// → Init이 이미 처리. 추가 호출 불필요.

// 2. Init 객체를 polymorphic하게 못 쓰는데 시도
std::unique_ptr<folly::Init> init = std::make_unique<folly::Init>(&argc, &argv);
// → OK는 하지만 stack RAII가 자연스러움

// 3. atexit에서 LOG 호출
std::atexit([] { LOG(INFO) << "bye"; });
// → Init 소멸자가 glog shutdown 후라 LOG 결과가 lost 가능
```

## glog와의 관계

| 항목 | google glog | folly::Init + xlog |
|------|--------------|---------------------|
| init | `InitGoogleLogging` | `folly::Init` |
| category | severity (INFO/WARNING/ERROR) | severity + 계층 category |
| 빠른 path | `LOG(INFO)` | `XLOG(DBG1)` (compile-time off) |
| structured fields | 직접 | category로 부분 |

fbcode는 glog와 xlog가 공존. 새 코드는 xlog, 레거시는 glog. 둘 다 `folly::Init`이 init.

## 정리

- `folly::Init`은 main() 첫 줄에 두는 RAII 부트스트랩.
- gflags 파싱, glog/xlog init, signal handler, symbolizer까지 한 번에.
- 라이브러리 코드보다는 *binary 진입점*에서 호출.
- `InitOptions`로 세부 끄기 가능.
- crash 시 stacktrace dump가 기본 — debug 환경 일관성 큰 가치.

## 다음 편

[Part 18-02: Indestructible](/blog/programming/code-review/folly/part18-02-indestructible)에서 global lifetime 패턴을 본다.

## 관련 항목

- [Folly Part 1-03 — build/fbcode](/blog/programming/code-review/folly/part1-03-build-fbcode)
- [Folly Part 12-01 — Singleton vs Meyers](/blog/programming/code-review/folly/part12-01-singleton-vs-meyers)
- [원문 — folly/init/Init.h](https://github.com/facebook/folly/blob/main/folly/init/Init.h)
