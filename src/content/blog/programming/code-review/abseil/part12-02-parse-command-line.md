---
title: "Abseil ParseCommandLine 동작"
date: 2026-06-13T09:00:00
description: "absl::ParseCommandLine — argv를 flag로 분리하고 positional 인자를 돌려주는 단일 진입점."
series: "Abseil Code Review"
seriesOrder: 64
tags: [cpp, abseil, flags, parsing, command-line]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 한 줄의 boilerplate

```cpp
#include "absl/flags/parse.h"

int main(int argc, char** argv) {
    std::vector<char*> positional = absl::ParseCommandLine(argc, argv);
    // 이후 GetFlag로 flag 값 읽기
}
```

`ParseCommandLine`은 *argv를 모두 소비*해 flag로 인식되는 것은 registry에 적용하고, 인식 안 되는 *positional 인자*는 반환.

## flag 구문

지원되는 형식:

```bash
./app --port=8080
./app --port 8080
./app --no-verbose            # bool 부정
./app -p 8080                 # short form (드물게 사용)
./app -- positional_arg_only  # 이후 모두 positional
```

bool은 다음 모두 동등.

```bash
--verbose --verbose=true --verbose=1
--no-verbose --verbose=false --verbose=0
```

## --help / --helpfull / --helpshort

`ParseCommandLine`이 자동 처리. 발견 즉시 출력 후 *exit*.

```bash
./app --help        # 현재 모듈의 flag만
./app --helpfull    # 모든 flag (의존 lib 포함)
./app --helpshort   # 짧은 요약
```

`--help` 출력은 *flag 등록 시* 의 `help` 문자열을 자동 모음.

## --flagfile — 파일에서 읽기

```bash
./app --flagfile=/etc/myapp.flags
```

파일에 한 줄 한 flag.

```text
# /etc/myapp.flags
--port=9090
--timeout=30s
--verbose
```

여러 환경별 설정 관리에 유용. CLI override:

```bash
./app --flagfile=/etc/myapp.flags --port=80   # 파일 + override
```

## 환경 변수 — undocumented but supported

Abseil은 *환경 변수 자동 읽기를 기본 지원하지 않는다*. 환경 변수 기반이 필요하면 명시적으로:

```cpp
const char* env = std::getenv("MYAPP_PORT");
if (env) absl::SetFlag(&FLAGS_port, std::stoi(env));
```

또는 `ParseAbseilFlagsOnly` 후 환경 변수 매핑 단계를 추가.

## 알 수 없는 flag 처리

기본은 *fatal error* — 알 수 없는 flag면 exit.

```bash
./app --unknown_flag=x
# F0525 ...: ERROR: --unknown_flag=x: unknown flag
```

`--undefok=foo,bar`로 특정 flag를 허용할 수 있다(테스트·prototyping에서만).

## ParseAbseilFlagsOnly

`ParseCommandLine`이 abseil flag뿐 아니라 *모든 등록 flag*를 처리한다. *내가 등록한 것만* 처리하려면 `ParseAbseilFlagsOnly` 변종. 라이브러리 차원에서 미세 통제가 필요한 드문 경우.

대부분 main에서는 `ParseCommandLine` 한 줄로 충분.

## main의 표준 패턴

```cpp
int main(int argc, char** argv) {
    // 1. flag 파싱
    std::vector<char*> positional = absl::ParseCommandLine(argc, argv);

    // 2. 심볼라이저 + failure handler (Part 11-04)
    absl::InitializeSymbolizer(argv[0]);
    absl::InstallFailureSignalHandler({});

    // 3. log 초기화
    absl::InitializeLog();

    // 4. positional 처리
    if (positional.size() < 2) {
        std::cerr << "usage: " << positional[0] << " <input-file>\n";
        return 1;
    }
    std::string input_file = positional[1];

    // 5. 실제 작업
    return Run(input_file);
}
```

`ParseCommandLine`을 *가장 먼저* 부른다. 이후 코드가 flag·log 등을 자유롭게 쓸 수 있다.

## positional 인자

```bash
./app --port=8080 input.txt output.txt
```

`positional` 벡터:

```cpp
positional[0] = "./app";
positional[1] = "input.txt";
positional[2] = "output.txt";
```

`--`로 명시적 구분도 가능.

```bash
./app --port=8080 -- --not-a-flag
# positional: ["./app", "--not-a-flag"]
```

## SetCommandLine* helper

테스트에서 argv 시뮬레이션:

```cpp
const char* argv[] = {"test", "--port=9999", "in.txt", nullptr};
auto pos = absl::ParseCommandLine(3, const_cast<char**>(argv));
EXPECT_EQ(absl::GetFlag(FLAGS_port), 9999);
EXPECT_EQ(pos.size(), 2);   // {"test", "in.txt"}
```

`ParseCommandLine`은 한 프로세스에서 *여러 번 호출 안전*. 테스트 fixture에서 매번 다시 호출 가능.

## 회피 패턴

```cpp
// 회피 — argv 직접 파싱
for (int i = 1; i < argc; ++i) {
    if (std::strcmp(argv[i], "--port") == 0) { ... }   // ❌ boilerplate
}

// Good
absl::ParseCommandLine(argc, argv);
int p = absl::GetFlag(FLAGS_port);
```

```cpp
// 회피 — ParseCommandLine 이전에 LOG
int main(int argc, char** argv) {
    LOG(INFO) << "boot";   // ❌ log 초기화 전, severity flag 미적용
    absl::ParseCommandLine(argc, argv);
}

// Good — 순서 지킴
int main(int argc, char** argv) {
    absl::ParseCommandLine(argc, argv);
    absl::InitializeLog();
    LOG(INFO) << "boot";
}
```

```cpp
// 회피 — Parse 결과 무시
int main(int argc, char** argv) {
    absl::ParseCommandLine(argc, argv);
    // ... positional이 필요한데 ignore
}

// Good
auto positional = absl::ParseCommandLine(argc, argv);
```

## 정리

- `absl::ParseCommandLine(argc, argv)` 한 줄로 flag 분리 + positional 추출.
- `--help`/`--helpfull`/`--helpshort`/`--flagfile` 자동 지원.
- 알 수 없는 flag는 fatal — `--undefok`로 화이트리스트 가능.
- main의 표준 순서: Parse → Symbolizer → FailureHandler → InitializeLog → 작업.
- 환경 변수 매핑은 기본 미제공 — 직접 SetFlag.

## 다음 장 예고

[Part 12-03: Flag introspection / validation](/blog/programming/code-review/abseil/part12-03-flag-introspection).

## 관련 항목

- [Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check) — `--v`, `--stderrthreshold` 등
- [Part 11-04: Stack trace / failure_signal_handler](/blog/programming/code-review/abseil/part11-04-stack-trace-handler)
- [Part 12-01: ABSL_FLAG 정의](/blog/programming/code-review/abseil/part12-01-absl-flag-define)
- [원문 — ParseCommandLine](https://abseil.io/docs/cpp/guides/flags#parsing-command-line-flags)
