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

C나 C++ 프로젝트를 빌드하는 가장 단순한 방법은 모든 소스를 한 번에 컴파일러에 넘기는 것입니다.

```bash
gcc main.c utils.c config.c network.c -o myapp
```

파일이 네댓 개일 때는 이 방법이 충분히 빠릅니다. 하지만 소스가 수십 개를 넘어가면 이야기가 달라집니다. `utils.c`의 한 줄만 고쳐도 위 명령은 *모든* 파일을 다시 컴파일합니다. 컴파일러는 매번 헤더를 다시 파싱하고, 같은 함수를 다시 코드 생성하고, 변하지 않은 결과물을 또 한 번 만들어 냅니다. 작은 프로젝트라면 1~2초의 낭비이지만, 리눅스 커널이나 Chromium 같은 거대 코드베이스에서는 이런 방식이 몇 분에서 몇 시간으로 부풀어 오릅니다.

**Make**는 이 낭비를 정확히 겨냥합니다. Make는 각 파일의 *수정 시간*(mtime)을 추적해서, *변경된 파일에서 시작되는 의존성*만 다시 빌드합니다. `utils.c`만 고쳤다면 `utils.o`를 다시 만들고 최종 실행 파일을 다시 링크합니다. 그 외의 `.o` 파일은 손대지 않습니다. 이 방식을 **증분 빌드**(incremental build)라고 부릅니다.

| 파일 | 일괄 컴파일 | Make 증분 빌드 (utils.c만 수정) |
|------|------------|--------------------------------|
| main.c | → main.o 재컴파일 | 건너뜀 |
| utils.c | → utils.o 재컴파일 | → utils.o 재컴파일 |
| config.c | → config.o 재컴파일 | 건너뜀 |
| 최종 | myapp 재링크 | myapp 재링크 |

Make는 1976년 Bell Labs의 Stuart Feldman이 만들었습니다. 일화에 따르면 동료의 한 시간짜리 빌드가 매번 처음부터 다시 도는 걸 보다 못해 하룻밤 만에 만들었다고 합니다. 50년 가까이 지난 지금도 이 원리는 그대로이고, 그 위에 CMake·Bazel·Ninja 같은 도구들이 얹혀 있을 뿐입니다. 리눅스 커널, Git, Python 인터프리터, GCC 자체까지 — 오늘날 우리가 매일 쓰는 소프트웨어의 상당수가 Make 위에서 빌드됩니다.

이 시리즈에서 다루는 것은 그중 가장 널리 쓰이는 **GNU Make**입니다. POSIX Make의 상위 호환으로, 패턴 규칙·자동 변수·함수 라이브러리 같은 확장을 더해 실용성을 크게 끌어올렸습니다.

---

## 핵심 개념: 의존성 그래프

Make가 무엇을 하는지를 한 문장으로 줄이면 "*의존성 그래프를 시간순으로 풀어내는 도구*"입니다. Makefile에 적힌 규칙들은 머릿속에서 다음과 같은 그래프로 변환됩니다.

- `hello.c → hello.o`
- `main.c → main.o`
- `hello.o + main.o → hello` (실행 파일)

각 노드는 파일(또는 동작 이름)이고, 화살표는 "이걸 만들려면 저게 있어야 한다"는 관계입니다. Make는 이 그래프를 위상 정렬해서 *의존이 없는 잎부터* 차례로 채워 올라갑니다. 즉 `.c → .o → 실행 파일` 순으로 진행합니다.

여기서 핵심은 그래프 자체가 아니라 *언제 노드를 다시 만들 것인가*입니다. 이 결정은 단순한 규칙으로 내려갑니다.

> 타겟의 mtime이 어떤 의존성보다도 작으면(=의존성이 더 새 것이면) 타겟을 다시 만든다.

`hello.c`를 수정하면 `hello.c`의 mtime이 `hello.o`보다 커지고, `hello.o`의 mtime은 `hello`보다 커집니다. 이 연쇄가 끝까지 전파되어 최종 실행 파일까지 갱신됩니다. 반대로 `main.c`는 그대로이므로 `main.o`도 갱신될 이유가 없고, 결과적으로 Make는 그쪽 가지를 통째로 건너뜁니다.

이 mtime 비교 한 줄이 Make 전체의 작동 원리입니다. 빌드 시스템 입문서들이 흔히 "타임스탬프"라고 부르는 것이 바로 이것이고, 빌드 캐시나 콘텐츠 해시 기반 시스템(Bazel, Ninja 일부 옵션)도 결국 이 mtime 비교를 더 정확하게 만들려는 시도에 가깝습니다.

---

## 설치

Make는 거의 모든 유닉스 계열 시스템에 이미 깔려 있거나, 개발자 패키지 묶음에 포함되어 있습니다.

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install build-essential
```

`build-essential`은 `make` 외에 `gcc`, `g++`, `libc6-dev`, `dpkg-dev` 같은 C/C++ 개발 필수 도구를 한꺼번에 설치합니다. Make만 따로 받고 싶으면 `sudo apt install make`만 해도 됩니다.

### Linux (Fedora/RHEL)

```bash
sudo dnf groupinstall "Development Tools"
```

`@development-tools` 그룹은 Debian의 `build-essential`과 같은 역할을 합니다.

### macOS

macOS는 Xcode Command Line Tools를 깔면 Make가 따라옵니다.

```bash
xcode-select --install
```

다만 이때 설치되는 것은 *BSD Make*입니다. 이 시리즈에서 다루는 패턴 규칙·함수·고급 변수는 대부분 GNU Make 전용 기능이라, BSD Make에서는 동작하지 않거나 문법이 다릅니다. macOS에서 GNU Make를 따로 받으려면 Homebrew를 씁니다.

```bash
brew install make
```

Homebrew 버전은 시스템 BSD Make와 충돌을 피하려고 `gmake`라는 별도 이름으로 설치됩니다. 이 시리즈의 예제를 그대로 따라 하려면 `make` 대신 `gmake`를 입력하거나, 셸 alias를 걸어 두세요.

```bash
alias make='gmake'
```

### Windows

윈도우는 별도 설치가 필요합니다. 세 가지 선택지가 있습니다.

```bash
# MSYS2 — UCRT64 권장
pacman -S make

# WSL (Ubuntu) — 리눅스 환경 그대로 쓰는 가장 깔끔한 방법
sudo apt install build-essential

# MinGW-w64 — 단독 설치, mingw32-make 이름으로 들어감
```

WSL을 쓸 수 있다면 WSL이 가장 마찰이 적습니다. 윈도우 네이티브 빌드가 필요한 경우에만 MSYS2나 MinGW를 고려합니다.

### 설치 확인

```bash
make --version
```

```shell
GNU Make 4.3
Built for x86_64-pc-linux-gnu
Copyright (C) 1988-2020 Free Software Foundation, Inc.
```

첫 줄에 "GNU Make"가 보이면 준비 끝입니다. 이 시리즈는 GNU Make 4.0 이상을 가정합니다(`.RECIPEPREFIX`, `$(file ...)` 같은 함수가 4.0에서 추가됐습니다).

---

## 첫 Makefile

이론은 충분히 봤으니 직접 만들어 봅시다. 두 개의 소스 파일과 하나의 헤더로 구성된 작은 C 프로그램입니다.

### 프로젝트 구조

```shell
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

### Makefile 작성

이제 Makefile을 만듭니다. 이름은 `Makefile`(대문자 M)이 가장 무난합니다. `makefile`도 인식되지만, 대문자 쪽이 `ls` 결과에서 먼저 눈에 띄어 관행이 됐습니다.

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

> ⚠️ **탭 주의**: 명령어 줄(`gcc ...`, `rm ...`) 앞의 들여쓰기는 반드시 **탭 한 글자**여야 합니다. 스페이스 여덟 개로 들여쓰면 Make는 그 줄이 명령어임을 인식하지 못하고 `Makefile:2: *** missing separator. Stop.` 으로 멈춥니다. 에디터에서 "탭을 스페이스로 자동 변환" 옵션이 켜져 있으면 Makefile 편집 시에는 반드시 꺼 두세요. VS Code는 파일 단위로 `.editorconfig`나 `files.insertSpaces` 설정으로 다룰 수 있고, Vim에서는 `:set noexpandtab`을 자주 봅니다.

이 Makefile은 사람이 읽기에도 자연스럽습니다.
- `hello`를 만들려면 `main.o`와 `hello.o`가 필요하고, 둘이 준비되면 `gcc -o`로 묶어라.
- `main.o`는 `main.c`와 `hello.h`에서 만들어지고, 명령은 `gcc -c`다.
- `clean`은 아무것도 만들지 않고, 그냥 파일을 지운다.

Make는 이 텍스트를 위에서 본 의존성 그래프로 바꾸고, 우리가 `make`를 칠 때마다 그 그래프 위를 돌아다닙니다.

---

## Makefile 실행

### 첫 빌드

프로젝트 디렉터리에서 그냥 `make`만 칩니다.

```bash
$ make
gcc -c main.c
gcc -c hello.c
gcc -o hello main.o hello.o
```

Make는 첫 줄을 보고 *기본 타겟*을 `hello`로 정합니다(첫 규칙의 타겟이 곧 기본 타겟입니다). `hello`를 만들려면 `main.o`와 `hello.o`가 있어야 하는데, 아직 둘 다 없습니다. 그래서 Make는 그래프를 거꾸로 내려가서 잎부터 채우기 시작합니다.

1. `main.o`가 없음 → `main.o` 규칙의 레시피를 실행 → `gcc -c main.c`
2. `hello.o`가 없음 → `hello.o` 규칙의 레시피를 실행 → `gcc -c hello.c`
3. 의존성 모두 준비됨 → `hello` 규칙의 레시피 실행 → `gcc -o hello ...`

이 순서는 *그래프의 위상 정렬* 결과입니다. 같은 단계의 노드끼리는 임의 순서로 처리되며, GNU Make는 `-j` 옵션을 주면 이 둘을 *병렬*로 실행할 수도 있습니다(Ch 7에서 다룹니다).

빌드가 끝나면 실행 파일이 만들어집니다.

```bash
$ ./hello
Hello, World!
```

### 두 번째 빌드 — 아무것도 안 함

같은 상태에서 다시 `make`를 치면 Make는 한 발자국도 움직이지 않습니다.

```bash
$ make
make: 'hello' is up to date.
```

이유는 단순합니다. `hello`의 mtime이 `main.o`, `hello.o`보다 새것이고, 각 `.o`의 mtime이 자기 의존성 `.c`보다 새것이기 때문입니다. 어떤 규칙도 "다시 만들어야 한다"는 조건을 충족하지 못해 Make는 그대로 종료합니다.

### 수정 후 재빌드

이제 `hello.c`만 수정해 봅시다. 실제로 코드를 고치는 대신 `touch`로 mtime만 갱신해도 효과는 같습니다(Make는 내용을 보지 않고 mtime만 봅니다).

```bash
$ touch hello.c
$ make
gcc -c hello.c
gcc -o hello main.o hello.o
```

수정된 `hello.c`로 인해 `hello.o`가 옛 것이 됐고, 그 결과 `hello`도 옛 것이 됐습니다. 그래서 두 단계가 다시 돌고, `main.o`는 그대로입니다. 큰 프로젝트에서는 이 한 줄의 차이가 빌드 시간을 분 단위에서 초 단위로 줄여 줍니다.

### 특정 타겟만 실행

`make` 뒤에 타겟 이름을 붙이면 그 타겟까지의 그래프만 풉니다.

```bash
$ make hello.o    # hello.o까지만 빌드
$ make clean      # clean 타겟 실행 (실행 파일·오브젝트 삭제)
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

1. 타겟 파일이 존재하는가? 없으면 무조건 레시피 실행.
2. 존재하면 각 의존성의 mtime을 차례로 본다.
3. 의존성 중 *하나라도* 타겟보다 새것이면 레시피 실행.
4. 의존성 파일에도 규칙이 있으면, 그 규칙을 재귀적으로 같은 절차로 평가한다.

3번 조건의 "하나라도"가 핵심입니다. 의존성 두 개 중 한 개만 새것이어도 레시피는 한 번 돌고, 그 결과로 타겟의 mtime이 새것이 되어 *그 타겟에 의존하는 상위 규칙*도 줄줄이 다시 돌게 됩니다. 의존성 그래프 한쪽이 자극을 받으면 위로 전파되는 셈입니다.

> 📌 셸 한 줄, 한 규칙: 레시피의 각 줄은 *별도의 셸 프로세스*에서 실행됩니다. 그래서 `cd subdir`만 적어 둔 다음 줄에서 `make`를 호출해도 디렉터리는 원래대로 돌아가 있습니다. 한 셸 안에서 묶고 싶으면 `cd subdir && make`처럼 한 줄로 잇거나 `\` 줄바꿈을 사용합니다.

---

## Phony 타겟

`clean`처럼 *파일을 만들지 않는* 타겟을 다루다 보면 한 가지 함정에 빠집니다. 어쩌다 디렉터리에 `clean`이라는 파일이 우연히 만들어졌다고 해 봅시다.

```bash
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

`.PHONY`로 묶인 타겟은 디스크에 같은 이름의 파일이 있든 없든, 호출될 때마다 무조건 레시피를 실행합니다. Make 매뉴얼은 "동작을 위한 타겟에는 모두 `.PHONY`를 붙이라"고 권합니다. 관용적으로 자주 쓰는 phony 타겟은 다음과 같습니다.

| 타겟 | 관례적 의미 |
|------|-------------|
| `all` | 전체 빌드 — 보통 Makefile의 첫 타겟 |
| `clean` | 빌드 결과물 삭제 |
| `distclean` | `clean` + 환경 설정 파일까지 삭제 |
| `install` | 빌드 결과를 시스템 경로에 복사 |
| `test` | 테스트 스위트 실행 |
| `dist` | 배포용 tarball 생성 |

`.PHONY` 선언은 한 줄에 여러 타겟을 묶을 수도 있습니다.

```makefile
.PHONY: all clean install test
```

이게 더 관리하기 쉬워서, 큰 Makefile은 보통 위쪽에 `.PHONY`를 한 줄로 모아 둡니다.

---

## 흔한 실수

처음 Makefile을 다룰 때 거의 모든 사람이 같은 자리에서 발을 헛디딥니다. 몇 가지를 미리 짚어 둡니다.

### 1. 탭 대신 스페이스

```makefile
hello: main.o
    gcc -o hello main.o   # 스페이스 4칸 → 오류
```

```shell
Makefile:2: *** missing separator.  Stop.
```

Make는 레시피임을 *탭 한 글자*로만 판단합니다. 다른 언어처럼 "들여쓰기 양식이 일관되면 OK"가 아닙니다. 에디터 설정을 꺼 두는 게 가장 안전하지만, 4.0부터는 `.RECIPEPREFIX` 변수로 다른 문자를 지정할 수도 있습니다(거의 안 씁니다만 알아 두면 좋습니다).

```makefile
.RECIPEPREFIX = >
hello: main.o
> gcc -o hello main.o   # > 로 시작하면 레시피로 인식됨
```

### 2. 헤더 의존성 누락

```makefile
main.o: main.c
	gcc -c main.c
```

위 규칙에는 `hello.h`가 빠져 있습니다. `hello.h`를 수정해도 `main.o`의 mtime은 영향을 받지 않으므로 Make는 다시 빌드할 이유를 찾지 못합니다. 결과적으로 새 헤더 내용이 반영되지 않은 옛 오브젝트 파일이 살아남아, 실행 시점에 이상한 동작을 합니다.

작은 프로젝트는 헤더 의존성을 직접 적어도 되지만, 헤더가 늘어나면 곧 관리가 깨집니다. 실무에서는 컴파일러가 알아서 의존성을 뽑아 주는 `-MMD -MP` 옵션과 Make의 `include`를 조합해 자동화합니다. Ch 6에서 자세히 다룹니다.

### 3. 첫 타겟 = 기본 타겟

```makefile
clean:
	rm -f *.o

hello: main.o
	gcc -o hello main.o
```

이 Makefile에서 그냥 `make`를 치면 *기본 타겟이 첫 줄의 `clean`이라서* `rm -f *.o`가 실행됩니다. 빌드 결과가 사라지는 깜짝 놀랄 만한 사고입니다.

원인은 단순합니다. Make는 "첫 규칙의 타겟"을 기본 타겟으로 고정합니다. 그래서 관행적으로 Makefile의 가장 위에는 `all` 같은 빌드 타겟을 두고, `clean`은 그 아래로 내려놓습니다.

```makefile
.PHONY: all clean
all: hello

hello: main.o
	gcc -o hello main.o

clean:
	rm -f *.o hello
```

이 패턴이 거의 모든 오픈소스 Makefile의 시작점입니다.

### 4. `cd`가 안 먹힌다

```makefile
build:
	cd src
	gcc -c main.c     # /src 가 아니라 원래 위치에서 실행됨!
```

앞서 잠깐 언급했듯 레시피의 각 줄은 *독립된 셸*에서 실행됩니다. `cd src` 직후의 셸은 곧장 종료되고, 다음 `gcc`는 새 셸에서 원래 디렉터리로 돌아간 상태로 실행됩니다. 해결은 두 줄을 한 줄로 잇는 것입니다.

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

```makefile
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

이 Makefile은 다음을 만족합니다.
- `all`이 첫 타겟이라 안전합니다.
- 헤더 `hello.h`가 의존성으로 들어가 있어, 헤더 수정도 재컴파일을 유발합니다.
- `clean`과 `all`이 `.PHONY`로 보호됩니다.
- 자동 변수로 중복이 줄었습니다.

여전히 실무에서 쓰기엔 부족합니다(컴파일 플래그, 변수, 패턴 규칙이 빠졌습니다). 다음 장부터 이 Makefile을 점진적으로 다듬어 갑니다.

---

## 정리

- **Make**는 파일의 mtime 비교만으로 *변경된 부분만* 다시 빌드하는 증분 빌드 도구입니다.
- Make의 머릿속에는 *의존성 그래프*가 있고, 그래프의 잎부터 위상 정렬 순서로 규칙을 실행합니다.
- **Makefile**의 규칙은 `타겟: 의존성` + 탭으로 시작하는 *레시피* 셸 명령으로 구성됩니다.
- 레시피의 각 줄은 *독립된 셸*에서 실행됩니다. `cd`는 다음 줄에 영향이 없습니다.
- 파일이 아닌 동작 타겟은 `.PHONY`로 묶어, 같은 이름의 파일이 있어도 안전하게 실행되도록 합니다.
- 첫 규칙의 타겟이 기본 타겟이 됩니다. 관행적으로 `all`을 가장 위에 둡니다.

## 다음 장 예고

[Ch 2: 규칙](/blog/tools/gnu-make/chapter02-rules)에서는 규칙을 더 깊이 살펴봅니다. 다중 타겟, 의존성 체인, 그리고 레시피가 셸에서 실제로 어떻게 실행되는지(셸 선택, 종료 코드, 에러 처리)를 다룹니다.

## 참고 자료

- [GNU Make Manual](https://www.gnu.org/software/make/manual/make.html) — 공식 매뉴얼. 한 번은 끝까지 훑어볼 가치가 있습니다.
- [Recursive Make Considered Harmful](http://aegis.sourceforge.net/auug97.pdf) — Peter Miller, 1997. Make 사용 패턴에 대한 고전적 비판.
- [Makefile Tutorial by Example](https://makefiletutorial.com/) — 예제 중심 입문서.
