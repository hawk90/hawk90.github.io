---
title: "Ch 1: Make 소개 / 설치 / 첫 Makefile"
date: 2025-05-14T01:00:00
description: "GNU Make의 역할, 설치 방법, 첫 Makefile 작성과 실행."
tags: [make, build, Makefile]
series: "GNU Make"
seriesOrder: 1
draft: false
---

## 왜 Make가 필요한가

C/C++ 프로젝트를 빌드할 때 가장 단순한 방법은 모든 소스를 한 번에 컴파일하는 것입니다.

```bash
gcc main.c utils.c config.c network.c -o myapp
```

파일이 몇 개 안 되면 이 방법도 괜찮습니다. 하지만 소스 파일이 수십, 수백 개가 되면 문제가 생깁니다. `utils.c` 한 줄만 고쳤는데 전체를 다시 컴파일해야 합니다. 대규모 프로젝트에서는 이 시간이 몇 분에서 몇 시간까지 늘어날 수 있습니다.

**Make**는 이 문제를 해결합니다. 파일의 수정 시간을 추적해서 **변경된 파일만 다시 컴파일**합니다. `utils.c`만 고쳤다면 `utils.o`만 다시 만들고, 나머지는 그대로 둡니다. 이것을 **증분 빌드(incremental build)**라고 부릅니다.

```
[변경 전]                    [변경 후 - 전체 빌드]
main.c ─┐                    main.c ─┐
utils.c ─┼─▶ myapp           utils.c ─┼─▶ 전부 컴파일 (느림)
config.c ─┘                  config.c ─┘

[변경 후 - Make 사용]
main.c ──▶ (변경 없음, 건너뜀)
utils.c ──▶ utils.o만 다시 컴파일 (빠름)
config.c ─▶ (변경 없음, 건너뜀)
```

Make는 1976년 Bell Labs에서 Stuart Feldman이 만들었습니다. 이후 GNU 프로젝트에서 **GNU Make**로 재구현되어 오늘날 가장 널리 쓰이는 버전이 되었습니다. 리눅스 커널, Git, Python 인터프리터 등 수많은 오픈소스 프로젝트가 Make로 빌드됩니다.

---

## 핵심 개념: 의존성 그래프

Make의 동작 원리는 **의존성 그래프**입니다. 파일 A가 파일 B에 의존한다면, B가 수정되었을 때 A를 다시 만들어야 합니다. Make는 파일의 타임스탬프를 비교해서 이 결정을 자동으로 내립니다.

예를 들어 실행 파일 `hello`가 `main.o`와 `hello.o`에 의존하고, 각 `.o` 파일은 대응하는 `.c` 파일에 의존한다고 해 봅시다.

```
hello.c ──▶ hello.o ──┐
                      ├──▶ hello (실행 파일)
main.c ───▶ main.o ──┘
```

`hello.c`를 수정하면 Make는 다음 순서로 동작합니다.

1. `hello.c`가 `hello.o`보다 새로움 → `hello.o` 다시 컴파일
2. `hello.o`가 `hello`보다 새로움 → `hello` 다시 링크
3. `main.o`는 `main.c`보다 오래됨 → 건너뜀

이 과정이 자동으로 이루어지므로 개발자는 그냥 `make`만 실행하면 됩니다.

---

## 설치

대부분의 시스템에 Make가 이미 설치되어 있거나, 개발 도구 패키지에 포함되어 있습니다.

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install build-essential
```

`build-essential` 패키지에는 `make`, `gcc`, `g++` 등 C/C++ 개발에 필요한 도구가 모두 들어 있습니다.

### Linux (Fedora/RHEL)

```bash
sudo dnf groupinstall "Development Tools"
```

### macOS

Xcode Command Line Tools를 설치하면 Make가 포함됩니다.

```bash
xcode-select --install
```

다만 macOS에 기본 설치되는 것은 BSD Make입니다. GNU Make가 필요하면 Homebrew로 설치합니다.

```bash
brew install make
```

Homebrew로 설치한 GNU Make는 `gmake` 명령으로 실행합니다. 이 시리즈에서 다루는 기능은 대부분 BSD Make에서도 동작하지만, 고급 기능을 쓰려면 GNU Make를 권장합니다.

### Windows

Windows에서는 MinGW, MSYS2, 또는 WSL을 사용합니다.

```bash
# MSYS2
pacman -S make

# WSL (Ubuntu)
sudo apt install build-essential
```

### 설치 확인

```bash
make --version
```

```
GNU Make 4.3
Built for x86_64-pc-linux-gnu
```

버전 번호와 함께 "GNU Make"가 출력되면 준비 완료입니다.

---

## 첫 Makefile 작성

간단한 C 프로그램을 Make로 빌드해 봅시다.

### 프로젝트 구조

```
hello/
├── main.c
├── hello.c
├── hello.h
└── Makefile
```

### 소스 파일

```c
// hello.h
#ifndef HELLO_H
#define HELLO_H

void say_hello(const char *name);

#endif
```

```c
// hello.c
#include <stdio.h>
#include "hello.h"

void say_hello(const char *name) {
    printf("Hello, %s!\n", name);
}
```

```c
// main.c
#include "hello.h"

int main(void) {
    say_hello("World");
    return 0;
}
```

### Makefile

이제 Makefile을 작성합니다. 프로젝트 루트에 `Makefile`이라는 이름으로 저장합니다.

```makefile
# 실행 파일 빌드 규칙
hello: main.o hello.o
	gcc -o hello main.o hello.o

# 오브젝트 파일 빌드 규칙
main.o: main.c hello.h
	gcc -c main.c

hello.o: hello.c hello.h
	gcc -c hello.c

# 정리 규칙
clean:
	rm -f hello main.o hello.o
```

**중요**: 명령어 줄(`gcc ...`, `rm ...`) 앞의 들여쓰기는 반드시 **탭(Tab)**이어야 합니다. 스페이스로 들여쓰면 `Makefile:2: *** missing separator. Stop.` 오류가 납니다. 에디터 설정에서 탭을 스페이스로 자동 변환하는 기능이 켜져 있다면 Makefile 편집 시 꺼 두세요.

---

## Makefile 실행

### 빌드

프로젝트 디렉터리에서 `make`를 실행합니다.

```bash
$ make
gcc -c main.c
gcc -c hello.c
gcc -o hello main.o hello.o
```

Make가 의존성 순서대로 명령을 실행합니다. `hello`를 만들려면 `main.o`와 `hello.o`가 필요하고, 이들이 없으므로 먼저 만듭니다.

```bash
$ ./hello
Hello, World!
```

### 재빌드

이미 빌드가 완료된 상태에서 다시 `make`를 실행하면 어떻게 될까요?

```bash
$ make
make: 'hello' is up to date.
```

모든 파일이 최신 상태이므로 아무것도 하지 않습니다. 이제 `hello.c`를 수정해 봅시다.

```bash
$ touch hello.c   # 타임스탬프만 갱신 (실제 수정과 같은 효과)
$ make
gcc -c hello.c
gcc -o hello main.o hello.o
```

`hello.c`만 변경되었으므로 `hello.o`와 최종 `hello`만 다시 빌드됩니다. `main.o`는 건너뜁니다. 이것이 Make의 핵심 가치입니다.

### 특정 타겟 빌드

`make` 뒤에 타겟 이름을 지정하면 해당 타겟만 빌드합니다.

```bash
$ make hello.o    # hello.o만 빌드
$ make clean      # clean 타겟 실행 (파일 삭제)
```

---

## Makefile의 구조

Makefile은 **규칙(rule)**의 집합입니다. 각 규칙은 세 부분으로 구성됩니다.

```makefile
타겟: 의존성1 의존성2 ...
	레시피1
	레시피2
```

| 구성 요소 | 설명 | 예시 |
|-----------|------|------|
| **타겟(target)** | 만들려는 파일 이름, 또는 동작 이름 | `hello`, `clean` |
| **의존성(prerequisite)** | 타겟을 만들기 위해 필요한 파일들 | `main.o hello.o` |
| **레시피(recipe)** | 타겟을 만드는 셸 명령어 (탭으로 시작) | `gcc -o hello ...` |

Make는 다음 순서로 동작합니다.

1. 타겟 파일이 존재하는지 확인합니다.
2. 존재하면, 의존성 파일들의 타임스탬프와 비교합니다.
3. 의존성 중 하나라도 타겟보다 새로우면 레시피를 실행합니다.
4. 의존성 파일도 규칙이 있으면 재귀적으로 같은 과정을 반복합니다.

---

## Phony 타겟

`clean`처럼 파일을 만들지 않는 타겟을 **phony 타겟**이라고 부릅니다. 문제는 우연히 `clean`이라는 파일이 생기면 Make가 "이미 최신"이라고 판단해서 명령을 실행하지 않는다는 것입니다.

```bash
$ touch clean     # clean이라는 파일 생성
$ make clean
make: 'clean' is up to date.   # 아무것도 안 함!
```

이를 방지하려면 `.PHONY`로 선언합니다.

```makefile
.PHONY: clean
clean:
	rm -f hello main.o hello.o
```

`.PHONY`로 선언된 타겟은 파일 존재 여부와 관계없이 항상 레시피를 실행합니다.

자주 쓰는 phony 타겟들입니다.

| 타겟 | 관례적 용도 |
|------|-------------|
| `all` | 전체 빌드 (보통 첫 번째 타겟으로 둠) |
| `clean` | 빌드 결과물 삭제 |
| `install` | 시스템에 설치 |
| `test` | 테스트 실행 |
| `dist` | 배포 패키지 생성 |

---

## 흔한 실수

### 탭 대신 스페이스

```makefile
hello: main.o
    gcc -o hello main.o   # 스페이스로 들여씀 → 오류!
```

```
Makefile:2: *** missing separator.  Stop.
```

**해결**: 레시피 앞은 반드시 탭으로 들여씁니다.

### 의존성 누락

```makefile
main.o: main.c
	gcc -c main.c
# hello.h 의존성을 빠뜨림
```

`hello.h`를 수정해도 `main.o`가 다시 빌드되지 않습니다. 헤더 파일 의존성을 빠뜨리면 빌드가 꼬일 수 있습니다.

**해결**: 모든 의존성을 명시하거나, 자동 의존성 생성을 사용합니다(Ch 6에서 다룸).

### 기본 타겟 혼동

```makefile
clean:
	rm -f *.o

hello: main.o
	gcc -o hello main.o
```

`make`를 실행하면 첫 번째 타겟인 `clean`이 실행됩니다! 의도치 않게 파일이 삭제될 수 있습니다.

**해결**: 빌드 타겟을 맨 위에 둡니다. 관례상 `all`을 첫 번째로 둡니다.

```makefile
all: hello

hello: main.o
	gcc -o hello main.o

clean:
	rm -f *.o hello
```

---

## 정리

- **Make**는 파일 의존성과 타임스탬프를 기반으로 증분 빌드를 수행합니다.
- **Makefile**은 타겟, 의존성, 레시피로 구성된 규칙의 집합입니다.
- 레시피 앞의 들여쓰기는 반드시 **탭**이어야 합니다.
- `make`는 첫 번째 타겟을 빌드하고, `make <타겟>`은 지정한 타겟을 빌드합니다.
- 파일이 아닌 타겟은 `.PHONY`로 선언해서 항상 실행되도록 합니다.

## 다음 장 예고

Ch 2에서는 규칙을 더 깊이 다룹니다. 다중 타겟, 의존성 체인, 그리고 레시피가 셸에서 어떻게 실행되는지 살펴봅니다.

## 참고 자료

- [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html)
- [Makefile Tutorial by Example](https://makefiletutorial.com/)
