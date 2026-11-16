---
title: "Make 규칙 분석 — 타겟·의존성·레시피의 평가"
slug: "tools/build/gnu-make/chapter02-rules"
date: 2026-06-03T09:02:00
description: "Makefile 규칙의 구성 요소와 동작 방식 — 다중 타겟, order-only, 레시피 접두사, 이중 콜론까지."
tags: [make, build, rules]
series: "GNU Make"
seriesOrder: 2
draft: false
topics: ["tools", "tools/build"]
---

## 규칙의 해부

[Ch 1](/blog/tools/build/gnu-make/chapter01-intro)에서 본 것처럼 Makefile은 규칙(rule)의 묶음입니다. 규칙 하나의 모양은 단순합니다.

```makefile
타겟: 의존성1 의존성2
	레시피1
	레시피2
```

겉보기에는 세 줄짜리 문법이지만, Make는 이 작은 구조 위에 *다중 타겟, 분리 의존성, order-only, 레시피 접두사, 이중 콜론, .ONESHELL* 같은 손잡이를 마련해 두었습니다. 각각이 언제 필요한지, 안 쓰면 무엇이 어긋나는지를 실제로 돌려 보며 살펴봅니다. 실행 환경은 Ch 1과 같은 GNU Make 4.4.1, macOS 27.2.1, Apple clang 21.0.0입니다.

---

## 타겟(Target)

타겟은 *만들려는 파일의 이름*이거나, `clean`처럼 파일을 만들지 않는 동작의 이름입니다. Make는 그 파일을 "최신 상태"로 유지하는 데 필요한 일을 합니다.

### 단일 타겟

```makefile
hello.o: hello.c hello.h
	gcc -c hello.c -o hello.o
```

`hello.o`가 없거나 의존성 중 하나라도 `hello.o`보다 새로울 때 레시피가 실행됩니다. 시간이 같으면 최신으로 봅니다.

### 다중 타겟 — 한 번에 여러 개 묶기

같은 의존성과 같은 레시피 패턴을 공유하는 타겟이라면 한 줄에 묶어 적을 수 있습니다. 아래는 [매뉴얼 4.10절](https://www.gnu.org/software/make/manual/html_node/Multiple-Targets.html)의 `bigoutput littleoutput` 예제를 실행할 수 있게 바꾼 것입니다.

```makefile
bigoutput littleoutput: text.g
	@echo "run for $@"; tr a-z A-Z < $< > $@
```

4.10절은 이 한 줄이 같은 의존성과 레시피를 가진 규칙 두 개를 따로 적은 것과 같다고 설명합니다.

```makefile
bigoutput: text.g
	@echo "run for $@"; tr a-z A-Z < $< > $@

littleoutput: text.g
	@echo "run for $@"; tr a-z A-Z < $< > $@
```

두 타겟을 함께 요청하면 레시피가 타겟마다 한 번씩, 모두 두 번 돕니다.

```text
$ make bigoutput littleoutput
run for bigoutput
run for littleoutput
```

각 타겟이 *독립된 규칙*으로 복제되기 때문입니다. `make bigoutput`만 부르면 `bigoutput`용 레시피만 실행됩니다. 두 타겟이 *한 번의 명령으로 동시에 만들어지는 게 아닙니다*. "한 명령이 두 파일을 동시에 만든다"고 알려 주려면 4.3에 추가된 **grouped target** 문법(`&:`)을 씁니다(Ch 4에서 다룹니다).

`$<`(첫 번째 의존성)와 `$@`(타겟 이름)은 *자동 변수*입니다. 자세한 동작은 [Ch 3](/blog/tools/build/gnu-make/chapter03-variables)에서 다룹니다. 다중 타겟 규칙에서는 `$@`가 타겟마다 달라지므로 레시피를 하나만 적어도 출력 파일이 겹치지 않습니다.

### 기본 타겟

`make`만 입력하면 Make는 *첫 규칙의 첫 타겟*을 빌드합니다. [매뉴얼 9.2절](https://www.gnu.org/software/make/manual/html_node/Goals.html)은 "첫 규칙에 타겟이 여러 개면 그중 첫 타겟만 기본 목표가 된다"고 덧붙입니다. Ch 1에서 `clean`이 위에 있는 Makefile이 빌드 산물을 지우는 것을 확인했으므로, [매뉴얼 16.6절](https://www.gnu.org/software/make/manual/html_node/Standard-Targets.html)의 관례대로 첫 타겟은 `all`로 둡니다.

```makefile
.PHONY: all clean

all: hello goodbye

hello: hello.o
	gcc -o hello hello.o

goodbye: goodbye.o
	gcc -o goodbye goodbye.o

clean:
	rm -f hello goodbye *.o
```

이 패턴이면 `make`만 쳐도 `all`이 평가되고, `all`이 `hello`와 `goodbye`에 의존하므로 둘 다 빌드됩니다. `all`은 파일을 만들지 않는 동작 이름이라 [Ch 1](/blog/tools/build/gnu-make/chapter01-intro#phony-타겟)에서 본 `.PHONY` 보호를 받습니다.

---

## 의존성(Prerequisites)

의존성은 타겟이 완성되기 전에 *먼저 준비되어 있어야 하는 파일*입니다. Make는 의존성을 먼저 최신으로 만든 다음, 그 mtime을 타겟과 비교해서 재빌드 여부를 정합니다.

### 의존성 체인 — 한 번의 수정이 어떻게 전파되는가

```makefile
hello: main.o hello.o
	gcc -o hello main.o hello.o

main.o: main.c hello.h
	gcc -c main.c

hello.o: hello.c hello.h
	gcc -c hello.c
```

이 Makefile이 머릿속에서 의존성 그래프로 변환되는 모습은 다음과 같습니다.

- `main.c` + `hello.h` → `main.o`
- `hello.c` + `hello.h` → `hello.o`
- `main.o` + `hello.o` → `hello`

빌드를 한 번 끝낸 뒤 `hello.h`만 갱신하면 세 단계가 모두 다시 돕니다.

```text
$ touch hello.h
$ make
gcc -c main.c
gcc -c hello.c
gcc -o hello main.o hello.o
```

1. `hello.h`의 mtime이 `main.o`보다 새것이라 `main.o`를 재컴파일합니다.
2. `hello.h`의 mtime이 `hello.o`보다 새것이라 `hello.o`를 재컴파일합니다.
3. 새 `main.o`, `hello.o`의 mtime이 `hello`보다 새것이라 `hello`를 재링크합니다.

한 헤더의 수정이 그래프를 거슬러 올라가며 *세 단계의 작업*을 만들어 냅니다. 이 전파를 Makefile 작성자가 직접 적지 않아도 된다는 점이 Make를 손으로 만든 빌드 스크립트와 구분 짓습니다.

### 의존성을 여러 줄로 쪼개기

같은 타겟의 의존성을 *여러 줄에 나눠* 적을 수 있습니다. 의존성은 합쳐지고, 레시피는 한 군데에만 있으면 됩니다.

```makefile
main.o: main.c
main.o: hello.h
main.o:
	gcc -c main.c -o main.o
```

`make -p`로 Make가 읽어 들인 규칙 데이터베이스를 출력해 보면 세 줄이 `main.o: main.c hello.h` 한 줄로 합쳐져 있고, `touch hello.h` 뒤 `make`는 `gcc -c main.c -o main.o`를 실행합니다.

이 기법은 *컴파일러가 만든 의존성 파일을 `include` 할 때* 쓰입니다. Apple clang 21.0.0으로 `gcc -MMD -MP -c main.c -o main.o`를 실행하면 `main.d`가 다음 내용으로 생깁니다.

```makefile title="main.d"
main.o: \
  /Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/SDKSettings.json \
  main.c hello.h
/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/SDKSettings.json:
hello.h:
```

Makefile에 이미 `main.o` 규칙이 있어도 이 파일을 `include`하면 의존성이 위와 같은 방식으로 합쳐집니다. Apple clang은 `main.c`, `hello.h` 외에 SDK의 `SDKSettings.json`도 의존성으로 적는다는 점이 눈에 띕니다. 이 `.d`를 `include`하면 `SDKSettings.json`의 mtime이 바뀔 때 모든 오브젝트가 다시 컴파일됩니다. 아래쪽의 빈 규칙 두 줄은 `-MP`가 만든 것입니다. 자동 의존성 생성은 [Ch 6](/blog/tools/build/gnu-make/chapter06-conditionals)·[Ch 7](/blog/tools/build/gnu-make/chapter07-practical)에서 다룹니다.

### Order-only 의존성 — "있기만 하면 OK"

`|` 기호 뒤에 적는 의존성은 *order-only*입니다. [매뉴얼 4.3절](https://www.gnu.org/software/make/manual/html_node/Prerequisite-Types.html)에 따르면 Make는 order-only 의존성도 먼저 갱신하지만, 그 mtime 때문에 현재 타겟을 다시 만들지는 않습니다.

```makefile
build/hello.o: hello.c | build
	gcc -c hello.c -o build/hello.o

build:
	mkdir -p build
```

왜 일반 의존성이 아니라 order-only가 필요할까요? 답은 *디렉터리의 mtime이 바뀌는 시점*에 있습니다. 디렉터리의 mtime은 그 안의 항목이 추가·삭제·이름 변경될 때 바뀝니다. `build/main.o`와 `build/hello.o`가 `build`를 *일반* 의존성으로 갖는 Makefile을 네 번 연속(사이에 1초씩 쉬며) 실행해 봤습니다.

```text
$ make -f normal.mk      # 1회차
mkdir -p build
gcc -c main.c -o build/main.o
gcc -c hello.c -o build/hello.o
$ make -f normal.mk      # 2회차, 3회차, 4회차 모두 같은 출력
gcc -c main.c -o build/main.o
gcc -c hello.c -o build/hello.o
```

아무것도 고치지 않았는데 매번 두 파일을 다시 컴파일했습니다. `stat`으로 보면 clang이 이미 있는 `build/main.o`를 덮어쓸 때도 `build`의 mtime이 바뀌었습니다. `ls -i`로 보면 다시 컴파일할 때마다 `build/main.o`의 inode 번호가 바뀌었습니다. clang이 기존 파일을 제자리에서 덮어쓰지 않고 새 파일로 교체하므로 디렉터리 항목이 매번 바뀝니다. 반면 `cp`로 이미 있는 파일을 덮어썼을 때는 `build`의 mtime이 그대로였습니다. 그러니 영원히 재빌드가 일어나는지는 레시피의 도구가 출력 파일을 어떻게 쓰는지에 달려 있고, 이 환경의 clang에서는 실제로 일어났습니다.

같은 규칙을 `| build`로 바꾸면 2회차부터 `make: Nothing to be done for 'all'.`이 나오고, `touch build/unrelated.txt`로 디렉터리에 파일을 추가해도 결과는 같습니다. "디렉터리가 *없으면* 만들어라. 있으면 시간은 보지 마라"를 정확히 표현하는 방법입니다.

생성 도구의 경우는 의도에 따라 갈립니다. 도구가 바뀌었을 때 출력을 다시 만들어야 한다면 아래처럼 일반 의존성으로 둡니다. 도구가 존재하기만 하면 되고 도구가 다시 빌드돼도 출력은 그대로 두고 싶을 때만 `|` 뒤에 둡니다.

```makefile
PROTOC := tools/bin/protoc

output.h: schema.proto $(PROTOC)
	$(PROTOC) --cpp_out=. $<

$(PROTOC):
	./build_protoc.sh
```

---

## 레시피(Recipe)

레시피는 타겟을 만드는 *셸 명령*입니다. 반드시 *탭 한 글자*로 시작하고, 한 규칙 안에서 여러 줄을 가질 수 있습니다.

### 셸이 누구인지부터

[매뉴얼 5.3.2절](https://www.gnu.org/software/make/manual/html_node/Choosing-the-Shell.html)에 따르면 레시피를 실행할 셸은 Make 변수 `SHELL`이 정하고, Makefile에서 설정하지 않으면 `/bin/sh`를 씁니다. 셸에 넘기는 옵션은 `.SHELLFLAGS`이며 기본값은 `-c`입니다. 사용자가 로그인 셸로 zsh를 쓰더라도 환경 변수 `SHELL`은 Make의 `SHELL`에 들어오지 않습니다. 같은 절은 개인의 대화형 셸 선택이 Makefile 동작에 영향을 주면 안 되기 때문이라고 설명합니다. 예외는 MS-DOS와 MS-Windows로, 이 두 환경에서는 환경 변수 `SHELL`을 그대로 씁니다.

그래서 레시피를 POSIX sh 문법으로 적으면 `SHELL`을 따로 정하지 않아도 같은 Makefile이 Linux와 macOS에서 같은 셸 문법으로 해석됩니다. `bash` 전용 기능을 쓰고 싶을 때는 `SHELL` 변수를 명시적으로 바꿉니다(아래 "셸 변경" 절).

### 각 줄은 별도의 셸 — 가장 흔한 오해

[Ch 1](/blog/tools/build/gnu-make/chapter01-intro)에서 실행해 본 사실을 다시 짚습니다.

> 레시피의 *각 줄*은 *각자 새 셸 프로세스*에서 실행됩니다.

이 사실을 잊으면 다음과 같은 함정에 빠집니다.

```makefile
wrong:
	cd subdir
	pwd      # subdir가 아니라 원래 디렉터리
	ls       # 마찬가지
```

첫 줄의 `cd`는 *그 줄을 실행한 셸에만* 영향을 미치고, 그 셸은 줄이 끝나는 순간 종료됩니다. 다음 줄은 새 셸에서 시작하므로 작업 디렉터리는 Makefile이 호출된 원래 자리로 되돌아갑니다.

해결은 셋 중 하나입니다.

**방법 1 — 한 줄로 잇기**

```makefile
correct:
	cd subdir && pwd && ls
```

**방법 2 — 백슬래시로 줄 연결**

```makefile
correct:
	cd subdir && \
	pwd && \
	ls
```

`\`로 끝낸 줄은 다음 줄과 합쳐져 한 셸 명령이 됩니다([매뉴얼 5.1.1절](https://www.gnu.org/software/make/manual/html_node/Splitting-Recipe-Lines.html)).

**방법 3 — `.ONESHELL` (GNU Make 3.82+)**

```makefile
.ONESHELL:

correct:
	cd subdir
	pwd
	ls
```

`.ONESHELL`을 켜면 *한 레시피의 모든 줄이 한 셸에서* 실행되고, 위 레시피의 `pwd`는 `.../one/subdir`를 출력했습니다. 대신 [매뉴얼 5.3.1절](https://www.gnu.org/software/make/manual/html_node/One-Shell.html)이 지적하는 두 가지 차이가 생깁니다.

- **에러 처리**: 기본 동작에서는 한 줄이 실패하면 그 자리에서 규칙이 실패합니다. `.ONESHELL`에서는 마지막 줄이 아닌 줄의 실패를 Make가 알아채지 못합니다. `false` 다음 줄에 `echo "after false"`를 둔 레시피는 `after false`를 출력하고 종료 코드 0으로 끝났습니다. 첫 줄에 `set -e`를 넣은 레시피는 `false`에서 멈추고 `make: *** [one.mk:9: strict] Error 1`로 실패했습니다.
- **접두사**: `@`·`-`·`+` 접두사는 첫 줄에서만 판정합니다. `SHELL`이 POSIX 계열 셸이면 둘째 줄부터의 접두사는 지우고 실행합니다. 첫 줄 `@echo first`, 둘째 줄 `@echo second`, 셋째 줄 `-false`, 넷째 줄 `echo third`인 레시피를 실행하면 명령 에코 없이 `first`, `second`, `third`만 출력되고 종료 코드는 0입니다. 첫 줄의 `@`가 레시피 전체의 에코를 껐고, 셋째 줄의 `-`는 지워진 채 `false`만 실행됐지만 마지막 줄이 아니라서 실패가 드러나지 않았습니다.

### 레시피 접두사 — `@`, `-`, `+`

레시피 줄 *맨 앞에* 특수 문자를 붙여 동작을 조절할 수 있습니다.

| 접두사 | 의미 | 자주 쓰는 자리 |
|--------|------|--------------|
| `@` | 명령어를 화면에 출력하지 않음 | `@echo "..."` 같은 사용자 친화 메시지 |
| `-` | 비-0 종료 코드를 무시하고 다음 줄로 | `-rm nofile.o` 같은 정리 명령 |
| `+` | `-n`·`-t`·`-q` 모드에서도 실제 실행 | `$(MAKE)`를 직접 적지 않은 재귀 호출 |

세 접두사 모두 *같은 줄에 함께* 쓸 수 있습니다.

```makefile
clean:
	@-rm -f *.o   # 화면에 안 띄우고, 실패해도 무시
```

#### `@` — 명령은 살리되 출력은 죽이기

기본 동작에서 Make는 *실행하기 직전에* 그 명령 줄을 그대로 화면에 출력합니다([매뉴얼 5.2절](https://www.gnu.org/software/make/manual/html_node/Echoing.html)). 첫 줄에는 `@`가 없고 둘째 줄에는 있는 레시피로 비교합니다.

```makefile
hello:
	echo "Building hello..."
	@echo "Building hello (silent)..."
```

```text
$ make hello
echo "Building hello..."
Building hello...
Building hello (silent)...
```

첫 줄은 두 번 보입니다. 하나는 Make가 출력한 명령이고 다른 하나는 `echo`의 실제 출력입니다. `@`를 붙인 둘째 줄은 `echo`의 출력만 남습니다. 전체 출력을 한 번에 끄고 싶으면 `make -s`(silent)를 씁니다. 같은 Makefile을 `make -s`로 돌리면 `Building hello...`와 `Building hello (silent)...` 두 줄만 나옵니다.

#### `-` — 실패 무시

```makefile
clean:
	-rm nofile.o
	@echo "Cleaned."
```

없는 파일을 `-f` 없이 지우면 `rm`이 실패하지만, `-` 덕분에 Make는 다음 줄로 넘어갑니다.

```text
$ make clean
rm nofile.o
rm: nofile.o: No such file or directory
make: [Makefile:2: clean] Error 1 (ignored)
Cleaned.
```

`-`를 뗀 같은 레시피는 `make: *** [Makefile:5: bad] Error 1`에서 멈추고, Make의 종료 코드는 2였습니다. `rm -f`처럼 도구 자체에 "없어도 성공" 옵션이 있으면 `-`를 붙이지 않아도 됩니다.

#### `+` — 강제 실행

`make -n`(명령을 출력만 하고 실행하지 않음), `make -t`(touch만), `make -q`(최신인지 확인만) 모드에서도 그 줄은 *실제로 실행*하라는 표식입니다. 재귀 Make를 세 가지 방식으로 적고 `make -n`으로 비교했습니다. `sub/Makefile`은 `MAKEFLAGS`를 출력하는 `echo` 한 줄입니다.

| 상위 레시피 | `make -n`에서 하위 Make |
|------------|------------------------|
| `$(MAKE) -C sub` | 실행됨. 하위 Make가 `-n`을 물려받아 `echo ... MAKEFLAGS=[n]`을 출력만 함 |
| `make -C sub` | 실행 안 됨. `make -C sub` 한 줄만 출력 |
| `+make -C sub` | 실행됨. 첫 줄과 같은 결과 |

`$(MAKE)`를 직접 적은 줄에는 `+`가 필요 없습니다. [매뉴얼 5.7.1절](https://www.gnu.org/software/make/manual/html_node/MAKE-Variable.html)이 레시피 줄에 `MAKE` 변수가 직접 나오면 `-t`·`-n`·`-q`를 그 줄에 적용하지 않는다고 정해 두었기 때문입니다. 같은 절은 `MAKE`가 다른 변수를 거쳐 간접적으로 펼쳐질 때는 이 특수 처리가 없으므로 `+`를 쓰라고 안내합니다.

```makefile
SUBMAKE = $(MAKE) -C subdir

subdir:
	+$(SUBMAKE)
```

`$(MAKE)`는 *현재 실행 중인 Make 자신*의 이름입니다. `make`라고 직접 적으면 PATH에서 처음 찾은 `make`가 실행됩니다. macOS에서 `gmake`로 시작한 빌드가 하위 디렉터리에서 `/usr/bin/make`(3.81)로 바뀌는 사고가 이렇게 생깁니다.

병렬 빌드의 jobserver는 4.4에서 사정이 바뀌었습니다. 4.4.1에서 `make -j2`로 위의 두 방식을 돌려 보면 `$(MAKE) -C sub`와 일반 `make -C sub` 모두 하위 Make의 `MAKEFLAGS`에 `-j2 --jobserver-auth=fifo:...`가 들어갔습니다. 4.4의 NEWS에 따르면 mkfifo를 지원하는 시스템에서는 named pipe 방식 jobserver를 쓰고, 이 방식에서는 재귀 호출로 표시되지 않은 하위 Make도 jobserver에 붙습니다. 그래도 `-n` 전파와 Make 바이너리 일치를 위해 `$(MAKE)`를 쓰는 이유는 그대로입니다.

---

## 셸 변경

Bash 전용 기능(`[[`, 배열, `<<<`, `=~` 등)이 필요하면 `SHELL` 변수를 명시적으로 바꿉니다.

```makefile
SHELL := /bin/bash

test:
	@echo "Bash version: $$BASH_VERSION"
	@[[ -f file.txt ]] && echo "exists" || echo "missing"
```

```text
$ make
Bash version: 3.2.57(1)-release
exists
```

macOS의 `/bin/bash`는 3.2.57이라 Bash 4 이상의 기능(연관 배열 등)은 이 셸로 쓸 수 없습니다. 여기서 `:=`는 *단순 확장*(simply-expanded) 대입입니다. 일반 `=`은 *재귀 확장*(recursively-expanded)이라 확장 시점이 다른데, 자세한 이야기는 [Ch 3](/blog/tools/build/gnu-make/chapter03-variables)에서 봅니다.

> 💡 *왜 `$$BASH_VERSION`이지?*: Make는 `$`를 자기 변수 시작으로 봅니다. 그래서 *셸 변수*를 표시하려면 `$`를 한 번 더 써서 `$$`로 이스케이프해야 합니다. Make는 `$$`를 만나면 `$` 한 글자로 줄여 셸에 넘기고, 셸이 그 `$BASH_VERSION`을 자기 변수로 해석합니다.

엄격 모드를 켜고 싶으면 `.SHELLFLAGS`(3.82+)를 함께 바꿉니다.

```makefile
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
```

`-e`는 첫 실패에서 중단, `-u`는 미정의 변수 사용 시 에러, `-o pipefail`은 파이프라인 중 하나라도 실패하면 전체를 실패로 봅니다. 차이는 파이프라인과 미정의 변수에서 드러납니다.

```text
$ make -f default.mk     # SHELL 기본값(/bin/sh -c)
false | true
pipeline ok under /bin/sh -c
$ make -f strict.mk p1   # 같은 레시피, -eu -o pipefail
false | true
make: *** [strict.mk:4: p1] Error 1
$ make -f strict.mk u    # 레시피: echo "$$UNSET_VAR"
echo "$UNSET_VAR"
/bin/bash: UNSET_VAR: unbound variable
make: *** [strict.mk:7: u] Error 1
```

기본 설정에서는 파이프라인 앞쪽의 `false`가 묻혀 다음 줄로 넘어갔고, 엄격 모드에서는 그 자리에서 멈췄습니다. 오타 난 셸 변수 이름도 빈 문자열로 넘어가지 않고 에러가 됩니다.

---

## 이중 콜론 규칙(`::`)

같은 타겟에 *여러 독립 레시피*를 정의하고 싶을 때 씁니다. 일반 콜론 규칙으로 같은 타겟에 레시피를 두 번 적으면 GNU Make는 경고를 내고 나중 것만 씁니다.

```text
$ make
Makefile:4: warning: overriding recipe for target 'clean'
Makefile:2: warning: ignoring old recipe for target 'clean'
rm -f b
```

이중 콜론으로 적으면 레시피가 각각 독립 규칙으로 남습니다.

```makefile
clean::
	@echo rm o

clean::
	@echo rm exe

clean::
	@echo rm log
```

`make clean`을 부르면 `rm o`, `rm exe`, `rm log`가 *적힌 순서대로* 모두 출력됩니다. [매뉴얼 4.13절](https://www.gnu.org/software/make/manual/html_node/Double_002dColon.html)에 따르면 의존성이 없는 이중 콜론 규칙은 타겟 파일이 있어도 항상 실행되고, 의존성이 있으면 규칙마다 *자기 의존성*만으로 따로 판정합니다. 실제로 `touch clean`으로 같은 이름의 파일을 만든 뒤에도 세 줄이 모두 출력됐습니다.

쓰임새 하나는 여러 Makefile을 `include`해서 합칠 때입니다. 각 서브 모듈의 Makefile이 자기 몫의 정리 동작을 `clean::`으로 더하면, 상위 Makefile은 따로 합칠 필요 없이 모든 `clean`이 호출됩니다.

```makefile
# common.mk
clean::
	rm -f common.o

# graphics.mk
clean::
	rm -f *.png

# 최상위 Makefile
include common.mk
include graphics.mk
# 이제 `make clean`은 common.o와 *.png를 모두 지움
```

단점은 *실행 순서가 include 순서에 묶인다*는 것입니다. 4.13절도 이중 콜론 규칙은 "다소 모호하고 그다지 유용하지 않은 경우가 많다"고 적고, 실행 순서가 상관없을 때에만 의미가 있다고 덧붙입니다.

---

## 특수 타겟 — `.PHONY` 그 다음

`.PHONY`(Ch 1에서 본 것)처럼 점(`.`)으로 시작하는 *특수 타겟*이 여럿 있고, 각각이 Make의 한 가지 동작을 켜고 끄거나 바꿉니다([매뉴얼 4.9절](https://www.gnu.org/software/make/manual/html_node/Special-Targets.html)). 이 절에서는 파일 삭제를 다루는 셋을 실행해 봅니다.

### `.SECONDARY` — *중간 산물 보존*

Make는 *암시적 규칙 사슬*로 만들어진 *중간 파일*을 빌드 후 자동 삭제합니다([매뉴얼 10.4절](https://www.gnu.org/software/make/manual/html_node/Chained-Rules.html)). 예컨대 `.y → .c → .o`로 가는 사슬에서 `.c`가 어디에도 명시되지 않았다면 중간 파일이고, 빌드가 끝난 뒤 사라집니다.

```makefile
%.c: %.y
	yacc -o $@ $<

%.o: %.c
	gcc -c $< -o $@

myparser.o: myparser.y
```

macOS의 `/usr/bin/yacc`(GNU Bison 2.3)로 실행하면 마지막에 Make가 직접 `rm myparser.c`를 실행합니다.

```text
$ make
yacc -o myparser.c myparser.y
gcc -c myparser.c -o myparser.o
rm myparser.c
```

생성된 C 코드를 디버깅용으로 남겨 두고 싶을 때 `.SECONDARY`를 씁니다.

```makefile
.SECONDARY:    # 모든 중간 파일 보존

# 또는 특정 파일만
.SECONDARY: myparser.c
```

빈 `.SECONDARY:`를 맨 앞에 넣고 다시 빌드하면 `rm myparser.c` 줄이 사라지고 `myparser.c`가 디렉터리에 남습니다.

### `.PRECIOUS` — *중단 시 삭제 방지*

Make는 *레시피 실행 중에 인터럽트되면 부분적으로 만들어진 타겟을 삭제*합니다. [매뉴얼 5.6절](https://www.gnu.org/software/make/manual/html_node/Interrupts.html)에 따르면 조건은 Make가 처음 확인한 뒤 타겟의 mtime이 바뀌었는지입니다. 깨진 산물이 다음 빌드에서 최신으로 오인되는 것을 막기 위해서입니다. 파일에 한 줄을 쓰고 3초 쉰 뒤 한 줄을 더 쓰는 레시피를 1초 만에 SIGINT로 중단해 봤습니다.

```makefile
big.tar.gz:
	echo partial > $@; sleep 3; echo done >> $@
```

```text
$ make          # 1초 뒤 SIGINT
echo partial > big.tar.gz; sleep 3; echo done >> big.tar.gz
make: *** Deleting file 'big.tar.gz'
make: *** [Makefile:2: big.tar.gz] Interrupt: 2
```

생성에 오래 걸리는 산물이라면 중단돼도 지우고 싶지 않을 수 있습니다. 그때 `.PRECIOUS`를 씁니다. 같은 규칙 앞에 `.PRECIOUS: big.tar.gz`를 넣고 똑같이 중단하면 `Deleting file` 줄이 없고, `big.tar.gz`가 `partial` 한 줄만 담은 채 남았습니다.

이 결과가 `.PRECIOUS`의 한계도 보여 줍니다. 남은 파일은 불완전하지만 mtime은 새것이라 다음 `make`가 최신으로 판단합니다. 다운로드처럼 중간 상태가 생기는 레시피라면 임시 이름으로 받고 검증한 뒤 `mv`로 최종 이름을 붙여야 합니다.

`.SECONDARY`는 *빌드 후 중간 파일 자동 삭제*를 막고, `.PRECIOUS`는 *인터럽트 시 삭제*를 막습니다. 4.9절에 따르면 `.PRECIOUS`는 중간 파일 자동 삭제도 막으므로 이 점에서 `.SECONDARY`와 겹칩니다.

### `.DELETE_ON_ERROR` — *반대 방향, 실패 시 강제 삭제*

기본적으로 Make는 *레시피가 실패해도* 그동안 만들어진 부분 산물을 삭제하지 않습니다.

```makefile
build/output.txt.gz: input.txt
	gzip -c $< > $@      # 만약 gzip이 도중에 실패하면?
```

`gzip`이 *부분적으로 출력을 쓰고 실패*하면 `output.txt.gz`가 *불완전한 상태로* 디스크에 남습니다. mtime은 최신이라 *다음 빌드에서 Make는 이미 만들어진 것으로 판단*하고, 깨진 산물을 가지고 빌드가 진행됩니다.

`.DELETE_ON_ERROR`는 이 함정을 막습니다.

```makefile
.DELETE_ON_ERROR:

build/output.txt.gz: input.txt
	gzip -c $< > $@
```

이제 레시피가 실패하면 *Make가 타겟 파일을 삭제*하고, 다음 빌드가 처음부터 다시 시도합니다. 아래 "직접 확인" 절에서 실제로 돌려 봅니다. [매뉴얼 5.5절](https://www.gnu.org/software/make/manual/html_node/Errors.html)은 이 동작이 "거의 항상 원하는 것"이지만 역사적 관행이 아니어서 호환성 때문에 명시적으로 켜야 한다고 설명합니다.

### 그 외 자주 보는 특수 타겟

| 특수 타겟 | 의미 (4.9절) |
|-----------|------|
| `.PHONY: a b c` | a/b/c가 *동작 이름*임을 알림. 같은 이름 파일이 있어도 매번 실행 |
| `.SUFFIXES:` | 접미사 목록을 비워 *옛 접미사 규칙*을 끔. 내장 규칙 전체 제거는 `-r` |
| `.ONESHELL:` | 한 레시피 안의 모든 줄을 *한 셸*에서 실행 (3.82+) |
| `.NOTPARALLEL:` | 이 Makefile에서 `-j`를 무시하고 직렬 실행. 4.4부터는 의존성을 주면 그 타겟의 의존성만 직렬 처리 |
| `.EXPORT_ALL_VARIABLES:` | 이 Makefile의 모든 변수를 *환경 변수로* 자식 프로세스에 노출 |
| `.IGNORE: target` | 이 타겟의 *모든 레시피 실패*를 무시 (`-` 접두사를 모든 줄에 붙인 효과) |

`.SUFFIXES:`가 끄는 범위를 `make -p`의 집계로 확인했습니다. 빈 Makefile에서는 `# 92 implicit rules`였고, `.SUFFIXES:` 한 줄만 둔 Makefile에서는 `# 9 implicit rules`로 줄었습니다. 남은 9개는 `%.out: %`, RCS·SCCS 체크아웃 같은 패턴 규칙이고, `.c`에서 `.o`를 만드는 규칙은 사라져 `make main.o`가 `No rule to make target 'main.o'`로 멈췄습니다. GNU Make의 C 컴파일 내장 규칙이 접미사 규칙으로 정의돼 있기 때문입니다.

---

## 흔한 실수

이 절의 출력도 모두 4.4.1에서 재현했습니다.

### 1. 디렉터리를 일반 의존성으로 넣기

```makefile
# 문제: build/의 mtime이 바뀔 때마다 hello.o 재컴파일
build/hello.o: hello.c build
	gcc -c hello.c -o build/hello.o
```

위 "Order-only 의존성" 절의 실험처럼, clang이 `build/` 안에 출력을 쓸 때마다 디렉터리 mtime이 갱신돼 이 환경에서는 매번 재컴파일이 일어났습니다.

**해결**: order-only 의존성

```makefile
build/hello.o: hello.c | build
	gcc -c hello.c -o build/hello.o
```

### 2. cd 후 다음 줄에서 작업

```makefile
deploy:
	cd /var/www
	cp -r dist/* .    # /var/www가 아닌 원래 디렉터리에서 실행
```

**해결**: 한 줄로 잇기

```makefile
deploy:
	cd /var/www && cp -r $(CURDIR)/dist/* .
```

`$(CURDIR)`은 Make가 시작될 때의 작업 디렉터리 절대 경로를 담은 변수입니다(`-C`를 썼다면 이동한 뒤의 경로, [매뉴얼 5.7절](https://www.gnu.org/software/make/manual/html_node/Recursion.html)). 셸에서 `cd`를 해도 값이 바뀌지 않으므로 원래 디렉터리의 파일을 가리킬 수 있습니다.

### 3. 셸 변수에 `$$` 안 붙임

```makefile
test:
	for f in *.c; do echo $f; done   # 빈 줄 출력
```

`$f`는 Make 변수 `f`로 해석되고, 정의된 적이 없으니 빈 값으로 펼쳐집니다. `a.c`, `b.c`가 있는 디렉터리에서 Make가 출력한 명령은 `for f in *.c; do echo ; done`이었고, 결과는 빈 줄 두 개였습니다.

**해결**: `$$`로 이스케이프

```makefile
test:
	for f in *.c; do echo $$f; done
```

이번에는 `a.c`, `b.c`가 출력됩니다.

### 4. tab 대신 공백 들여쓰기 (반복)

Ch 1에서 본 `missing separator`는 탭 문제만의 메시지가 아닙니다. 규칙도 대입도 아닌 줄이 있으면 같은 메시지가 나옵니다. `hello world`라는 줄을 넣은 파일과, `LINE := not a rule` 뒤에 `$(LINE)`만 적은 파일 모두 해당 줄 번호와 함께 `*** missing separator.  Stop.`으로 멈췄습니다. 메시지에 `did you mean TAB instead of 8 spaces?` 힌트가 없으면 들여쓰기 대신 그 줄의 내용과 변수 확장 결과를 먼저 봅니다.

### 5. 첫 타겟이 `clean`

[Ch 1의 "흔한 실수 3"](/blog/tools/build/gnu-make/chapter01-intro)에서 재현한 것과 같습니다. `make`만 치면 첫 타겟인 `clean`이 실행되어 빌드 산물이 지워집니다. 첫 타겟은 `all`로 두거나 `.DEFAULT_GOAL`을 지정합니다.

---

## 직접 확인 — 디렉터리 변경과 실패한 출력

다음 두 파일로 order-only와 `.DELETE_ON_ERROR`를 함께 확인합니다. 컴파일과 무관한 규칙이라 C 컴파일러 없이 실행됩니다.

```makefile title="Makefile"
.DEFAULT_GOAL := all
.DELETE_ON_ERROR:
.PHONY: all
all: build/output.txt

build/output.txt: input.txt | build
	cp $< $@

build:
	mkdir -p $@

partial.txt:
	printf 'partial\n' > $@; false
```

입력은 간단한 텍스트 파일입니다.

```text title="input.txt"
input version 1
```

빈 디렉터리에 두 파일을 저장한 뒤 실행한 결과입니다.

```text
$ make
mkdir -p build
cp input.txt build/output.txt
$ touch build/unrelated.txt
$ make
make: Nothing to be done for 'all'.
$ make partial.txt
printf 'partial\n' > partial.txt; false
make: *** [Makefile:13: partial.txt] Error 1
make: *** Deleting file 'partial.txt'
$ test ! -e partial.txt; echo $?
0
```

`build/`에 파일이 추가돼도 두 번째 `make`는 `output.txt`를 다시 복사하지 않습니다. `partial.txt` 레시피는 파일을 쓴 뒤 실패하고, Make가 `Deleting file`을 출력하며 그 파일을 지웁니다. `.DELETE_ON_ERROR:` 줄을 지운 Makefile로 같은 명령을 실행하면 `Error 1`까지는 같지만 `Deleting file` 줄이 없고, `partial.txt`가 `partial` 한 줄을 담은 채 남았습니다.

## 작은 예시 — 주요 요소 적용

지금까지의 도구를 한 자리에 모은 Makefile입니다.

```makefile
.PHONY: all clean

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

BUILD := build

all: $(BUILD)/hello

# 실행 파일 — 두 오브젝트에서 링크
$(BUILD)/hello: $(BUILD)/main.o $(BUILD)/hello.o | $(BUILD)
	gcc -o $@ $^

# 오브젝트 파일들 — order-only로 build 디렉터리 보장
$(BUILD)/main.o: main.c hello.h | $(BUILD)
	gcc -c $< -o $@

$(BUILD)/hello.o: hello.c hello.h | $(BUILD)
	gcc -c $< -o $@

# 디렉터리 만들기 — 한 번만
$(BUILD):
	mkdir -p $@

clean::
	@echo "Cleaning..."
	-rm -rf $(BUILD)
```

Ch 1의 `main.c`·`hello.c`·`hello.h`와 함께 실행한 결과입니다.

```text
$ make
mkdir -p build
gcc -c main.c -o build/main.o
gcc -c hello.c -o build/hello.o
gcc -o build/hello build/main.o build/hello.o
$ make
make: Nothing to be done for 'all'.
$ ./build/hello
Hello, World!
$ make clean
Cleaning...
rm -rf build
```

링크 줄에 `build`가 들어가지 않은 것은 `$^`가 order-only 의존성을 빼고 펼쳐지기 때문입니다. 이 Makefile은 다음을 만족합니다.

- `all`이 첫 타겟이므로 그냥 `make`가 빌드를 합니다.
- 빌드 산물이 `build/` 안에 모여 소스 디렉터리가 깨끗합니다.
- `build/` 디렉터리는 order-only로 잡혀, 두 번째 `make`가 아무것도 다시 만들지 않습니다.
- Bash strict 모드(`-eu -o pipefail`)로 파이프라인 중간 실패와 미정의 셸 변수에서 멈춥니다.
- `clean::`은 이중 콜론이라 나중에 다른 `.mk` 파일이 정리 동작을 더할 수 있습니다.

다음 장에서 변수와 자동 변수(`$@`, `$<`, `$^`)를 배우면 이 Makefile을 한 번 더 줄일 수 있습니다.

---

## 정리

- **타겟·의존성·레시피**가 한 규칙의 세 부분입니다. 의존성이 타겟보다 새것이면 레시피가 돕니다.
- **다중 타겟** `a b: dep`은 두 개의 독립 규칙으로 펼쳐져 레시피가 타겟마다 돕니다. 한 번에 여러 파일을 만드는 규칙은 `&:` 문법(Ch 4)으로 적습니다.
- **Order-only `|`** 는 존재만 보고 시간은 비교하지 않습니다. 디렉터리를 일반 의존성으로 두면 이 환경의 clang에서는 매번 재컴파일이 일어났습니다.
- 레시피의 *각 줄은 독립 셸*입니다. 해결은 `&&`·`\`·`.ONESHELL`이고, `.ONESHELL`은 중간 줄의 실패를 놓칩니다.
- 레시피 **접두사**는 `@`(에코 끔), `-`(실패 무시), `+`(`-n`에서도 실행)입니다. `$(MAKE)`를 직접 적은 줄에는 `+`가 필요 없습니다.
- `SHELL`·`.SHELLFLAGS`로 Bash strict 모드를 켜면 파이프라인 중간 실패가 드러납니다.
- **이중 콜론 `::`** 은 같은 타겟의 레시피 여러 개를 독립 규칙으로 유지합니다.
- `.SECONDARY`·`.PRECIOUS`·`.DELETE_ON_ERROR`는 각각 중간 파일, 인터럽트, 실패 시의 파일 삭제를 조절합니다.

## 다음 장 예고

[Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables)에서는 Make의 변수를 다룹니다. 사용자 정의, 자동 변수(`$@`, `$<`, `$^`, `$?`), 두 가지 확장 방식(`=` vs `:=`), 환경 변수와의 관계까지, "왜 같은 코드가 미묘하게 다르게 동작하지?"를 확장 시점과 출처로 나누어 확인합니다.

## 참고 자료

- [GNU Make Manual — Writing Rules](https://www.gnu.org/software/make/manual/html_node/Rules.html) — 4장. 이 글의 4.3·4.9·4.10·4.13절 인용 출처.
- [GNU Make Manual — Recipes](https://www.gnu.org/software/make/manual/html_node/Recipes.html) — 5장. 셸 선택, `.ONESHELL`, 에러·인터럽트 처리, `MAKE` 변수.
- [GNU Make Manual — Special Targets](https://www.gnu.org/software/make/manual/html_node/Special-Targets.html) (`.PHONY`, `.ONESHELL` 등)

## 관련 항목

- [Ch 1: GNU Make 소개](/blog/tools/build/gnu-make/chapter01-intro) — 규칙·mtime 비교·`.PHONY`의 기본기.
- [Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables) — 이 장의 레시피에 등장한 `$<`·`$@`와 `SHELL := ...`의 `:=` 확장 규칙.
- [Ch 4: 패턴 규칙](/blog/tools/build/gnu-make/chapter04-pattern-rules) — 다중 타겟이 두 규칙으로 펼쳐지는 문제와 grouped target `&:`의 해결.
- [CMake Ch 3: 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — 같은 "타겟"이라는 단어를 CMake가 어떻게 다른 의미로 쓰는지.
- [GNU Make Manual — Types of Prerequisites](https://www.gnu.org/software/make/manual/html_node/Prerequisite-Types.html) — order-only 의존성 `|`의 공식 정의.
