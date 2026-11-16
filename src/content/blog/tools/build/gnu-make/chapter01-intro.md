---
title: "GNU Make 소개와 첫 Makefile — 설치부터 첫 빌드까지"
slug: "tools/build/gnu-make/chapter01-intro"
date: 2026-06-03T09:01:00
description: "GNU Make의 역할, 설치 방법, 첫 Makefile 작성과 실행."
tags: [make, build]
series: "GNU Make"
seriesOrder: 1
draft: false
topics: ["tools", "tools/build"]
---

## 왜 Make가 필요한가

C나 C++ 프로젝트를 빌드하는 가장 단순한 방법은 모든 소스를 한 번에 컴파일러에 넘기는 것입니다.

```bash
gcc main.c utils.c config.c network.c -o myapp
```

파일이 네댓 개일 때는 이 방법으로 충분합니다. 하지만 `utils.c`의 한 줄만 고쳐도 위 명령은 *모든* 파일을 다시 컴파일합니다. 컴파일러는 매번 헤더를 다시 파싱하고, 같은 함수를 다시 코드 생성하고, 변하지 않은 결과물을 또 한 번 만들어 냅니다.

얼마나 차이가 나는지 직접 재 봤습니다. 함수 40개짜리 `.c` 파일 100개와 `main.c`를 만들고 Apple M2 Pro(12코어), macOS 27.2.1, Apple clang 21.0.0, GNU Make 4.4.1에서 `-O2`로 빌드했습니다.

| 방식 | 측정 (`/usr/bin/time -p`의 real) |
|------|-------------------------------|
| `gcc -O2 *.c -o app` 한 줄, 매번 전체 컴파일 | 5.27 s · 5.30 s · 5.24 s (3회) |
| Make로 처음부터 전체 빌드, 직렬 | 10.20 s · 12.20 s (2회) |
| Make로 처음부터 전체 빌드, `-j8` | 1.10 s |
| `touch m050.c` 뒤 Make 증분 빌드 | 0.20 s · 0.21 s · 0.17 s · 0.12 s (4회) |

처음부터 빌드할 때는 직렬 Make가 한 줄 명령보다 오히려 느렸습니다. 파일마다 컴파일러 프로세스를 따로 띄우기 때문입니다. Make가 이기는 지점은 두 번째 빌드부터입니다. 파일 하나만 바뀌면 그 파일 하나와 링크만 다시 돌아서, 같은 기계에서 5초대가 0.1~0.2초로 줄었습니다.

**Make**는 이 낭비를 정확히 겨냥합니다. Make는 각 파일의 *수정 시간*(mtime)을 추적해서, *변경된 파일에서 시작되는 의존성*만 다시 빌드합니다. `utils.c`만 고쳤다면 `utils.o`를 다시 만들고 최종 실행 파일을 다시 링크합니다. 그 외의 `.o` 파일은 손대지 않습니다. 이 방식을 **증분 빌드**(incremental build)라고 부릅니다.

| 파일 | 일괄 컴파일 | Make 증분 빌드 (utils.c만 수정) |
|------|------------|--------------------------------|
| main.c | → main.o 재컴파일 | 건너뜀 |
| utils.c | → utils.o 재컴파일 | → utils.o 재컴파일 |
| config.c | → config.o 재컴파일 | 건너뜀 |
| 최종 | myapp 재링크 | myapp 재링크 |

이 시리즈가 다루는 구현은 **GNU Make**입니다. [GNU Make 매뉴얼 1장](https://www.gnu.org/software/make/manual/html_node/Overview.html)은 GNU Make가 IEEE 1003.2-1992(POSIX.2)의 6.2절을 따른다고 밝히고, 그 위에 패턴 규칙·자동 변수·`$(shell)`·`$(eval)` 같은 확장을 더합니다. CMake는 "Unix Makefiles" 생성기로 Makefile을 만들어 낼 수 있지만, Ninja와 Bazel은 Make를 쓰지 않는 별개의 빌드 도구입니다.

---

## 핵심 개념: 의존성 그래프

Make가 무엇을 하는지를 한 문장으로 줄이면 "*의존성 그래프를 시간순으로 풀어내는 도구*"입니다. Makefile에 적힌 규칙들은 머릿속에서 다음과 같은 그래프로 변환됩니다.

- `hello.c → hello.o`
- `main.c → main.o`
- `hello.o + main.o → hello` (실행 파일)

각 노드는 파일(또는 동작 이름)이고, 화살표는 "이걸 만들려면 저게 있어야 한다"는 관계입니다. Make는 목표 타겟에서 출발해 의존성을 먼저 처리하고 돌아오는 깊이 우선 방식으로 그래프를 내려갑니다. [매뉴얼 2.3절](https://www.gnu.org/software/make/manual/html_node/How-Make-Works.html)의 표현으로는 "`edit`을 처리하기 전에 `edit`이 의존하는 파일들의 규칙부터 처리"합니다. 그래서 실제 실행 순서는 `.c → .o → 실행 파일`이 됩니다.

여기서 핵심은 그래프 자체가 아니라 *언제 노드를 다시 만들 것인가*입니다. 이 결정은 단순한 규칙으로 내려갑니다.

> 타겟의 mtime이 어떤 의존성보다도 작으면(=의존성이 더 새 것이면) 타겟을 다시 만든다.

`hello.c`를 수정하면 `hello.c`의 mtime이 `hello.o`보다 커지고, `hello.o`의 mtime은 `hello`보다 커집니다. 이 연쇄가 끝까지 전파되어 최종 실행 파일까지 갱신됩니다. 반대로 `main.c`는 그대로이므로 `main.o`도 갱신될 이유가 없고, 결과적으로 Make는 그쪽 가지를 통째로 건너뜁니다.

이 비교 규칙에는 예외가 셋 있습니다. 타겟 파일이 없으면 비교 없이 새로 만듭니다. `.PHONY`로 선언한 타겟은 같은 이름의 파일이 있어도 매번 레시피를 실행합니다([4.6절](https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html)). `|` 뒤에 적는 order-only 의존성은 존재만 확인하고 시간은 비교하지 않습니다([4.3절](https://www.gnu.org/software/make/manual/html_node/Prerequisite-Types.html), Ch 2에서 실행해 봅니다). 그리고 Make가 보는 것은 파일 *내용*이 아니라 mtime입니다. 아래 "수정 후 재빌드"에서 내용은 그대로 두고 `touch`만 해도 다시 빌드되는 것으로 확인합니다.

---

## 설치

배포판마다 패키지 이름만 다르고, 설치되는 것은 모두 GNU Make입니다.

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install build-essential
```

Debian bookworm의 [`build-essential` 12.9](https://packages.debian.org/bookworm/build-essential)는 `make`, `gcc`, `g++`, `libc6-dev`, `dpkg-dev`에 의존하므로 이 다섯 패키지가 함께 설치됩니다. Make만 따로 받고 싶으면 `sudo apt install make`만 해도 됩니다.

### Linux (Fedora/RHEL)

```bash
sudo dnf install make gcc
```

### macOS

macOS는 Xcode Command Line Tools를 깔면 Make가 따라옵니다.

```bash
xcode-select --install
```

이 글을 쓴 macOS 27.2.1의 `/usr/bin/make`는 2006년판 GNU Make 3.81이었습니다.

```text
$ /usr/bin/make --version
GNU Make 3.81
Copyright (C) 2006  Free Software Foundation, Inc.
...
This program built for i386-apple-darwin11.3.0
```

3.81에는 이 글 뒤쪽의 `.RECIPEPREFIX`(3.82)도, Ch 4의 grouped target(4.3)도 없습니다. 그래서 Homebrew로 최신 GNU Make를 따로 설치합니다.

```bash
brew install make
```

Homebrew 버전은 시스템 Make와 구분하도록 `gmake`라는 이름으로 설치됩니다. `brew info make`의 안내대로 `gnubin` 디렉터리를 PATH 앞에 두면 `make`라는 이름으로도 4.4.1이 실행됩니다. 이 글의 실행 결과는 모두 이 설정에서 얻었습니다.

```bash
export PATH="/opt/homebrew/opt/make/libexec/gnubin:$PATH"
```

### Windows

윈도우에는 Make가 없으므로 따로 설치합니다. 아래 세 가지 경로가 있고, 이 글에서는 셋 다 실행해 보지 않았습니다. 패키지 이름과 설치 파일은 MSYS2 패키지 페이지에서 확인했습니다.

```bash
# MSYS2의 msys 환경: make 4.4.1, 명령 이름 make
pacman -S make

# MSYS2의 UCRT64 환경: /ucrt64/bin/mingw32-make.exe로 설치됨
pacman -S mingw-w64-ucrt-x86_64-make

# WSL(Ubuntu): 리눅스와 같은 방법
sudo apt install build-essential
```

[`make`](https://packages.msys2.org/base/make)는 MSYS2의 POSIX 에뮬레이션 계층 위에서 돌고, [`mingw-w64-ucrt-x86_64-make`](https://packages.msys2.org/packages/mingw-w64-ucrt-x86_64-make)는 네이티브 윈도우 실행 파일인 `mingw32-make.exe`를 설치합니다. 두 번째를 고르면 명령 이름이 `make`가 아니라는 점을 기억해 둡니다.

### 설치 확인

```text
$ make --version
GNU Make 4.4.1
Built for aarch64-apple-darwin27.0.0
Copyright (C) 1988-2023 Free Software Foundation, Inc.
...
```

이 시리즈의 실행 결과는 위 GNU Make 4.4.1, macOS 27.2.1(Apple M2 Pro), Apple clang 21.0.0에서 얻었습니다. macOS의 `gcc`는 Apple clang을 가리키는 이름이라 예제의 `gcc` 명령도 clang이 처리합니다. 기능별 도입 버전은 4.4.1 소스에 포함된 `NEWS` 파일에서 확인했습니다. 시리즈 전체 예제를 돌리려면 grouped target(`&:`) 때문에 4.3 이상이 필요합니다.

---

## 첫 Makefile

이론은 충분히 봤으니 직접 만들어 봅시다. 두 개의 소스 파일과 하나의 헤더로 구성된 작은 C 프로그램입니다.

### 프로젝트 구조

```text
hello/
├── main.c
├── hello.c
├── hello.h
└── Makefile
```

### 소스 파일

```c title="hello.h"
// hello.h
#ifndef HELLO_H
#define HELLO_H

void say_hello(const char *name);

#endif
```

```c title="hello.c"
// hello.c
#include <stdio.h>
#include "hello.h"

void say_hello(const char *name) {
    printf("Hello, %s!\n", name);
}
```

```c title="main.c"
// main.c
#include "hello.h"

int main(void) {
    say_hello("World");
    return 0;
}
```

### Makefile 작성

이제 Makefile을 만듭니다. GNU Make는 `-f` 없이 실행되면 `GNUmakefile`, `makefile`, `Makefile` 순으로 파일을 찾습니다. [매뉴얼 3.2절](https://www.gnu.org/software/make/manual/html_node/Makefile-Names.html)은 이 중 `Makefile`을 권하는데, 디렉터리 목록 앞쪽에서 `README` 같은 중요한 파일 옆에 보이기 때문이라고 설명합니다. 대소문자를 구분하지 않는 macOS 기본 APFS 볼륨에서는 `makefile`과 `Makefile`이 같은 파일이라 둘을 함께 둘 수 없습니다.

```makefile title="Makefile"
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

> ⚠️ **탭 주의**: 명령어 줄(`gcc ...`, `rm ...`) 앞의 들여쓰기는 반드시 **탭 한 글자**여야 합니다. 스페이스로 들여쓰면 Make는 그 줄을 레시피로 보지 않고 `missing separator`로 멈춥니다(아래 "흔한 실수 1"에서 실제 메시지를 봅니다). 에디터가 탭을 스페이스로 바꾸고 있다면 Makefile에서는 꺼 둡니다. VS Code는 `editor.insertSpaces`, Vim은 `expandtab` 옵션이 이 변환을 결정하고, EditorConfig를 쓰면 `[Makefile]` 절에 `indent_style = tab`을 적습니다.

이 Makefile은 사람이 읽기에도 자연스럽습니다.
- `hello`를 만들려면 `main.o`와 `hello.o`가 필요하고, 둘이 준비되면 `gcc -o`로 묶어라.
- `main.o`는 `main.c`와 `hello.h`에서 만들어지고, 명령은 `gcc -c`다.
- `clean`은 아무것도 만들지 않고, 그냥 파일을 지운다.

Make는 이 텍스트를 위에서 본 의존성 그래프로 바꾸고, 우리가 `make`를 칠 때마다 그 그래프 위를 돌아다닙니다.

---

## Makefile 실행

### 첫 빌드

프로젝트 디렉터리에서 그냥 `make`만 칩니다.

```text
$ make
gcc -c main.c
gcc -c hello.c
gcc -o hello main.o hello.o
```

Make는 첫 줄을 보고 *기본 타겟*을 `hello`로 정합니다(첫 규칙의 타겟이 곧 기본 타겟입니다). `hello`를 만들려면 `main.o`와 `hello.o`가 있어야 하는데, 아직 둘 다 없습니다. 그래서 Make는 그래프를 거꾸로 내려가서 잎부터 채우기 시작합니다.

1. `main.o`가 없음 → `main.o` 규칙의 레시피를 실행 → `gcc -c main.c`
2. `hello.o`가 없음 → `hello.o` 규칙의 레시피를 실행 → `gcc -c hello.c`
3. 의존성 모두 준비됨 → `hello` 규칙의 레시피 실행 → `gcc -o hello ...`

직렬 실행에서 GNU Make는 의존성을 적힌 순서대로, 즉 `main.o hello.o`의 왼쪽부터 처리합니다. 4.4에서 추가된 `--shuffle=reverse`로 그 순서를 뒤집으면 출력 순서도 바뀝니다.

```text
$ make clean
rm -f hello main.o hello.o
$ make --shuffle=reverse
gcc -c hello.c
gcc -c main.c
gcc -o hello main.o hello.o
```

두 `.o`는 서로 의존하지 않으므로 어느 쪽이 먼저 만들어져도 결과는 같습니다. 이 순서에 기대는 Makefile은 `-j`로 병렬 실행할 때 깨지기 때문에, [매뉴얼 9.8절](https://www.gnu.org/software/make/manual/html_node/Options-Summary.html)은 `--shuffle`을 의존성 누락을 찾는 퍼즈 테스트 용도로 소개합니다. 병렬 빌드는 Ch 7에서 다룹니다.

빌드가 끝나면 실행 파일이 만들어집니다.

```text
$ ./hello
Hello, World!
```

### 두 번째 빌드 — 아무것도 안 함

같은 상태에서 다시 `make`를 치면 Make는 한 발자국도 움직이지 않습니다.

```text
$ make
make: 'hello' is up to date.
```

macOS의 `/usr/bin/make`(3.81)로 같은 디렉터리에서 실행하면 따옴표 모양만 다른 ``make: `hello' is up to date.``가 나옵니다. 판정은 같습니다.

이유는 단순합니다. `hello`의 mtime이 `main.o`, `hello.o`보다 새것이고, 각 `.o`의 mtime이 자기 의존성 `.c`보다 새것이기 때문입니다. 어떤 규칙도 "다시 만들어야 한다"는 조건을 충족하지 못해 Make는 그대로 종료합니다.

### 수정 후 재빌드

이제 `hello.c`만 수정해 봅시다. 실제로 코드를 고치는 대신 `touch`로 mtime만 갱신해도 효과는 같습니다(Make는 내용을 보지 않고 mtime만 봅니다).

```text
$ touch hello.c
$ make
gcc -c hello.c
gcc -o hello main.o hello.o
```

수정된 `hello.c`로 인해 `hello.o`가 옛 것이 됐고, 그 결과 `hello`도 옛 것이 됐습니다. 그래서 두 단계가 다시 돌고, `main.o`는 그대로입니다. 파일 100개짜리 프로젝트에서 이 차이가 5초대 대 0.2초 안팎이었다는 것은 첫 절의 표에서 봤습니다.

### 특정 타겟만 실행

`make` 뒤에 타겟 이름을 붙이면 그 타겟까지의 그래프만 풉니다. `clean`으로 지운 뒤 `hello.o`만 요청하면 `hello.c` 하나만 컴파일하고 멈춥니다.

```text
$ make clean
rm -f hello main.o hello.o
$ make hello.o
gcc -c hello.c
```

`clean`은 빌드 부산물 정리용 관용 타겟입니다. 잠시 뒤 "Phony 타겟" 절에서 다시 보겠습니다.

---

## Makefile의 구조

Makefile은 본질적으로 **규칙**(rule)의 묶음입니다. 한 규칙은 세 조각으로 이루어집니다.

```makefile
타겟: 의존성1 의존성2 ...
	레시피1
	레시피2
```

| 구성 요소 | 정체 | 예시 |
|-----------|------|------|
| 타겟(target) | 만들려는 파일, 또는 동작 이름 | `hello`, `clean` |
| 의존성(prerequisite) | 타겟이 의존하는 파일들 | `main.o hello.o` |
| 레시피(recipe) | 타겟을 만드는 셸 명령 (탭으로 시작) | `gcc -o hello ...` |

Make가 한 규칙을 만났을 때 내부적으로 따지는 흐름은 이렇습니다.

1. 의존성 각각에 규칙이 있으면 그 규칙을 같은 절차로 먼저 평가해 의존성을 최신으로 만든다.
2. 타겟 파일이 존재하는가? 없으면 레시피 실행.
3. 존재하면 각 의존성의 mtime을 타겟과 비교한다.
4. 의존성 중 *하나라도* 타겟보다 새것이면 레시피 실행.

1번이 비교보다 앞에 오는 것은 [매뉴얼 2.3절](https://www.gnu.org/software/make/manual/html_node/How-Make-Works.html)의 순서 그대로입니다. 4번 조건의 "하나라도"가 핵심입니다. 의존성 두 개 중 한 개만 새것이어도 레시피는 한 번 돌고, 그 결과로 타겟의 mtime이 새것이 되어 *그 타겟에 의존하는 상위 규칙*도 줄줄이 다시 돌게 됩니다. 의존성 그래프 한쪽이 자극을 받으면 위로 전파되는 셈입니다.

> 📌 셸 한 줄, 한 규칙: 레시피의 각 줄은 *별도의 셸 프로세스*에서 실행됩니다([매뉴얼 5.3절](https://www.gnu.org/software/make/manual/html_node/Execution.html)). 그래서 `cd subdir`만 적어 둔 다음 줄에서 `make`를 호출해도 디렉터리는 원래대로 돌아가 있습니다. 한 셸 안에서 묶고 싶으면 `cd subdir && make`처럼 한 줄로 잇거나 `\` 줄바꿈을 사용합니다. 실행 결과는 아래 "흔한 실수 4"에 있습니다.

---

## Phony 타겟

`clean`처럼 *파일을 만들지 않는* 타겟을 다루다 보면 한 가지 함정에 빠집니다. 어쩌다 디렉터리에 `clean`이라는 파일이 우연히 만들어졌다고 해 봅시다.

```text
$ touch clean
$ make clean
make: 'clean' is up to date.
```

Make는 동작 이름인지 파일 이름인지 구별하지 않습니다. 보이는 건 "타겟 `clean`이 존재하고 의존성이 없으니 다시 만들 필요가 없다"는 사실뿐입니다. 그래서 실제 의도였던 `rm -f ...`는 한 번도 실행되지 않습니다.

이런 사고를 막으려면 그 타겟이 *진짜 파일이 아니라 동작 이름*임을 Make에게 알려 줘야 합니다. 이때 쓰는 특수 타겟이 `.PHONY`입니다.

```makefile
.PHONY: clean
clean:
	rm -f hello main.o hello.o
```

`.PHONY`로 묶인 타겟은 디스크에 같은 이름의 파일이 있든 없든, 호출될 때마다 레시피를 실행합니다. 위와 같이 `clean` 파일을 남겨 둔 채 `.PHONY: clean`을 추가하고 다시 실행하면 이번에는 `rm -f hello main.o hello.o`가 출력됩니다. [매뉴얼 4.6절](https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html)은 phony 타겟을 쓰는 이유로 같은 이름 파일과의 충돌 방지와, Make가 그 타겟에 대해 암시적 규칙을 찾지 않아 생기는 성능 이득 두 가지를 듭니다.

타겟 이름에도 관례가 있습니다. [매뉴얼 16.6절](https://www.gnu.org/software/make/manual/html_node/Standard-Targets.html)이 GNU 프로그램용으로 정한 표준 타겟 중 자주 보는 것은 다음과 같습니다.

| 타겟 | 16.6절의 정의 |
|------|-------------|
| `all` | 프로그램 전체를 컴파일. 기본 타겟이어야 함 |
| `clean` | 빌드로 생긴 파일 삭제. 설정 기록 파일은 남김 |
| `distclean` | 설정(configure)과 빌드로 생긴 파일을 모두 삭제해 배포본 상태로 되돌림 |
| `install` | 빌드 결과를 설치 경로에 복사 |
| `check` | 자체 테스트 실행. 설치 없이 빌드만 된 상태에서 돌아야 함 |
| `dist` | 배포용 tar 파일 생성 |

테스트 타겟의 GNU 표준 이름은 `test`가 아니라 `check`입니다. `.PHONY` 선언은 한 줄에 여러 타겟을 묶을 수 있습니다.

```makefile
.PHONY: all clean install check
```

---

## 흔한 실수

아래 네 가지는 모두 위의 `hello` 프로젝트에서 직접 재현한 실수입니다. 출력은 GNU Make 4.4.1의 것이고, 3.81과 다른 곳은 따로 적었습니다.

### 1. 탭 대신 스페이스

```makefile
hello: main.o
    gcc -o hello main.o   # 스페이스 4칸 → 오류
```

```text
$ make
Makefile:2: *** missing separator.  Stop.
```

스페이스가 정확히 8칸이면 4.4.1과 3.81 모두 `Makefile:2: *** missing separator (did you mean TAB instead of 8 spaces?).  Stop.`이라고 원인을 짚어 줍니다. 4칸일 때는 위처럼 힌트 없이 멈춥니다.

Make는 레시피임을 *탭 한 글자*로만 판단합니다. 다른 언어처럼 "들여쓰기 양식이 일관되면 OK"가 아닙니다. 3.82부터는 `.RECIPEPREFIX` 변수로 탭 대신 다른 문자를 레시피 접두사로 지정할 수 있습니다.

```makefile
.RECIPEPREFIX = >
hello: main.o
> gcc -o hello main.o   # > 로 시작하면 레시피로 인식됨
```

4.4.1은 이 파일로 `gcc -o hello main.o   # > 로 시작하면 레시피로 인식됨`을 실행합니다(`#` 뒤는 셸 주석으로 넘어갑니다). macOS의 3.81은 `.RECIPEPREFIX`를 모르는 일반 변수로 취급하므로 같은 파일에서 `Makefile:3: *** missing separator.  Stop.`으로 멈춥니다.

### 2. 헤더 의존성 누락

```makefile
main.o: main.c
	gcc -c main.c
```

위 규칙에는 `hello.h`가 빠져 있습니다. `main.o`와 `hello.o` 규칙 모두에서 `hello.h`를 뺀 Makefile로 빌드한 뒤 헤더만 갱신해 보면 Make는 아무것도 하지 않습니다.

```text
$ touch hello.h
$ make
make: 'hello' is up to date.
```

같은 상태에서 `hello.h`를 의존성에 넣은 원래 Makefile로 실행하면 `gcc -c main.c`, `gcc -c hello.c`, 링크가 모두 다시 돕니다. 헤더에서 구조체 필드나 함수 시그니처를 바꿨다면, 앞의 경우에는 옛 정의로 컴파일된 `.o`가 새 코드와 링크된 채 남습니다.

헤더가 늘어나면 이 목록을 손으로 맞추기 어려워집니다. 그래서 컴파일러가 의존성을 뽑아 주는 `-MMD -MP` 옵션과 Make의 `include`를 조합해 자동화합니다. Ch 6에서 자세히 다룹니다.

### 3. 첫 타겟 = 기본 타겟

```makefile
clean:
	rm -f *.o

hello: main.o
	gcc -o hello main.o
```

이 Makefile에서 그냥 `make`를 치면 *기본 타겟이 첫 줄의 `clean`이라서* `rm -f *.o`가 실행됩니다. 빌드하려던 명령이 빌드 결과를 지웁니다.

[매뉴얼 9.2절](https://www.gnu.org/software/make/manual/html_node/Goals.html)에 따르면 기본 목표는 `.`으로 시작하는 것을 제외한 첫 타겟입니다. 그래서 Makefile의 가장 위에는 `all` 같은 빌드 타겟을 두고, `clean`은 그 아래로 내려놓습니다. 16.6절도 `all`이 기본 타겟이어야 한다고 적습니다.

```makefile
.PHONY: all clean
all: hello

hello: main.o
	gcc -o hello main.o

clean:
	rm -f *.o hello
```

순서를 바꿀 수 없는 사정이 있으면 `.DEFAULT_GOAL := hello`처럼 특수 변수로 기본 목표를 지정할 수도 있습니다. 위의 `clean`이 먼저 오는 Makefile 맨 앞에 이 줄을 넣고 `make`를 실행하면 `clean` 대신 `hello` 레시피가 돕니다. `.DEFAULT_GOAL`은 3.81에서 추가됐습니다(NEWS).

### 4. `cd`가 안 먹힌다

```makefile
build:
	cd src
	gcc -c main.c     # src/가 아니라 원래 디렉터리에서 실행됨
```

앞서 잠깐 언급했듯 레시피의 각 줄은 *독립된 셸*에서 실행됩니다. `gcc` 대신 `pwd`를 두고 실행하면 그대로 드러납니다.

```text
$ make
cd src
pwd
.../mist
```

`cd src` 직후의 셸은 곧장 종료되고, 다음 줄은 새 셸에서 원래 디렉터리로 돌아간 상태로 실행됩니다. 해결은 두 줄을 한 줄로 잇는 것입니다. 같은 실험을 `cd src && pwd`로 바꾸면 `.../mist/src`가 출력됩니다.

```makefile
build:
	cd src && gcc -c main.c
```

또는 백슬래시로 다음 줄과 연결하면 셸이 한 번만 뜹니다.

```makefile
build:
	cd src && \
	gcc -c main.c
```

---

## 작은 예시 — 전체 적용

지금까지의 내용을 한 Makefile에 모으면 다음과 같습니다.

```makefile title="complete.mk"
.PHONY: all clean
all: hello

hello: main.o hello.o
	gcc -o $@ $^

main.o: main.c hello.h
	gcc -c $<

hello.o: hello.c hello.h
	gcc -c $<

clean:
	rm -f hello main.o hello.o
```

`$@`은 현재 타겟 이름, `$^`은 모든 의존성, `$<`은 첫 번째 의존성을 가리키는 자동 변수입니다(Ch 3에서 다룹니다). 같은 명령을 매번 손으로 반복하지 않아도 되도록 Make가 제공하는 짧은 손잡이입니다.

`make -f complete.mk`로 실행하면 앞의 손으로 쓴 Makefile과 똑같이 `gcc -c main.c`, `gcc -c hello.c`, `gcc -o hello main.o hello.o`가 출력됩니다. 자동 변수가 레시피 안에서 원래 이름으로 펼쳐지기 때문입니다. 이어서 `touch hello.h` 후 다시 실행하면 세 줄이 모두 다시 돕니다.

이 Makefile은 다음을 만족합니다.

- `all`이 첫 타겟이라 안전합니다.
- 헤더 `hello.h`가 의존성으로 들어가 있어, 헤더 수정도 재컴파일을 유발합니다.
- `clean`과 `all`이 `.PHONY`로 보호됩니다.
- 자동 변수로 중복이 줄었습니다.

여전히 실무에서 쓰기엔 부족합니다(컴파일 플래그, 변수, 패턴 규칙이 빠졌습니다). 다음 장부터 이 Makefile을 점진적으로 다듬어 갑니다.

---

## 정리

- **Make**는 파일의 mtime 비교만으로 *변경된 부분만* 다시 빌드하는 증분 빌드 도구입니다. 파일 100개 실험에서 파일 하나 수정 후 재빌드는 0.2초 안팎이었습니다.
- Make의 머릿속에는 *의존성 그래프*가 있고, 그래프의 잎부터 위상 정렬 순서로 규칙을 실행합니다.
- **Makefile**의 규칙은 `타겟: 의존성` + 탭으로 시작하는 *레시피* 셸 명령으로 구성됩니다.
- 레시피의 각 줄은 *독립된 셸*에서 실행됩니다. `cd`는 다음 줄에 영향이 없습니다.
- 파일이 아닌 동작 타겟은 `.PHONY`로 묶어, 같은 이름의 파일이 있어도 안전하게 실행되도록 합니다.
- 첫 규칙의 타겟이 기본 타겟이 됩니다. GNU 표준대로 `all`을 가장 위에 두거나 `.DEFAULT_GOAL`로 지정합니다.

## 다음 장 예고

[Ch 2: 규칙](/blog/tools/build/gnu-make/chapter02-rules)에서는 규칙을 더 깊이 살펴봅니다. 다중 타겟, 의존성 체인, 그리고 레시피가 셸에서 실제로 어떻게 실행되는지(셸 선택, 종료 코드, 에러 처리)를 다룹니다.

## 참고 자료

- [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html) — 공식 매뉴얼. 이 글의 절 번호는 4.4.1판 기준입니다.
- [Recursive Make Considered Harmful](https://aegis.sourceforge.net/auug97.pdf) — Peter Miller, AUUGN 19(1), 1998, pp. 14–25. 디렉터리마다 Make를 따로 부르는 재귀 Make가 의존성 그래프를 쪼개 생기는 문제를 분석한 논문입니다(Ch 6에서 다룹니다).
- [Makefile Tutorial by Example](https://makefiletutorial.com/) — 예제 중심 입문서.

## 관련 항목

- [Ch 2: 규칙](/blog/tools/build/gnu-make/chapter02-rules) — 여기서 본 `타겟: 의존성` 한 줄을 order-only·이중 콜론·특수 타겟까지 넓힙니다.
- [Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables) — 마지막 예시에 등장한 `$@`·`$^`·`$<` 자동 변수의 정확한 동작.
- [CMake Ch 1: 소개와 첫 프로젝트](/blog/tools/build/cmake/chapter01-intro) — Makefile을 직접 적는 대신 생성해 주는 메타 빌드 시스템.
- [GNU Make Manual — Phony Targets](https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html) — `.PHONY`의 공식 설명.
