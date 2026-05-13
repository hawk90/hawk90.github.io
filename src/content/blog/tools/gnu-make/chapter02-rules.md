---
title: "Ch 2: 규칙 — 타겟, 의존성, 레시피"
date: 2025-05-14T02:00:00
description: "Makefile 규칙의 구성 요소와 동작 방식을 상세히 다룹니다."
tags: [make, build, Makefile, rules]
series: "GNU Make"
seriesOrder: 2
draft: false
---

## 규칙의 해부

Ch 1에서 Makefile이 규칙(rule)의 집합이라는 것을 배웠습니다. 이번 장에서는 규칙의 각 구성 요소를 깊이 들여다봅니다.

```makefile
타겟: 의존성1 의존성2
	레시피1
	레시피2
```

간단해 보이지만, 각 부분에는 알아두면 유용한 동작과 옵션이 있습니다.

---

## 타겟(Target)

타겟은 보통 **만들려는 파일의 이름**입니다. Make는 이 파일을 만들거나 최신 상태로 유지하는 것을 목표로 합니다.

### 단일 타겟

```makefile
hello.o: hello.c hello.h
	gcc -c hello.c -o hello.o
```

`hello.o`라는 파일을 만드는 규칙입니다.

### 다중 타겟

한 줄에 여러 타겟을 나열할 수 있습니다. 이 경우 각 타겟에 같은 의존성과 레시피가 적용됩니다.

```makefile
# 이 규칙은
foo.o bar.o: common.h
	$(CC) -c $< -o $@

# 아래 두 규칙과 같습니다
foo.o: common.h
	$(CC) -c $< -o $@

bar.o: common.h
	$(CC) -c $< -o $@
```

`$<`와 `$@`는 자동 변수로, Ch 3에서 자세히 다룹니다. 지금은 `$<`가 첫 번째 의존성, `$@`가 타겟을 의미한다고만 알아 두세요.

### 기본 타겟

`make`를 인자 없이 실행하면 Makefile의 **첫 번째 타겟**을 빌드합니다. 관례상 `all`이라는 phony 타겟을 첫 번째로 두고, 여기서 실제 빌드 타겟을 의존성으로 나열합니다.

```makefile
.PHONY: all clean

all: hello goodbye    # 첫 번째 타겟

hello: hello.o
	gcc -o hello hello.o

goodbye: goodbye.o
	gcc -o goodbye goodbye.o

clean:
	rm -f hello goodbye *.o
```

이렇게 하면 `make`만 실행해도 `hello`와 `goodbye`가 모두 빌드됩니다.

---

## 의존성(Prerequisites)

의존성은 타겟을 만들기 위해 **먼저 존재해야 하는 파일**입니다. Make는 의존성 파일의 타임스탬프를 타겟과 비교해서 재빌드 여부를 결정합니다.

### 의존성 체인

의존성 파일이 다른 규칙의 타겟이면, Make는 재귀적으로 그 규칙도 처리합니다.

```makefile
hello: main.o hello.o        # hello는 main.o와 hello.o에 의존
	gcc -o hello main.o hello.o

main.o: main.c hello.h       # main.o는 main.c와 hello.h에 의존
	gcc -c main.c

hello.o: hello.c hello.h     # hello.o는 hello.c와 hello.h에 의존
	gcc -c hello.c
```

`hello.h`를 수정하면 어떻게 될까요?

1. `main.o`는 `hello.h`보다 오래됨 → 재빌드
2. `hello.o`도 `hello.h`보다 오래됨 → 재빌드
3. `hello`는 새로운 `main.o`, `hello.o`보다 오래됨 → 재빌드

이 연쇄 반응이 Make의 핵심입니다.

### 의존성 분리

같은 타겟에 대한 의존성을 여러 줄에 걸쳐 작성할 수 있습니다. 의존성이 합쳐지고, 레시피는 한 번만 정의하면 됩니다.

```makefile
main.o: main.c
main.o: hello.h
main.o: config.h
main.o:
	gcc -c main.c -o main.o
```

위 규칙은 아래와 동일합니다.

```makefile
main.o: main.c hello.h config.h
	gcc -c main.c -o main.o
```

이 기법은 자동 생성된 의존성 파일을 포함할 때 유용합니다(Ch 6에서 다룸).

### Order-only 의존성

`|` 뒤에 오는 의존성은 **order-only** 의존성입니다. 해당 파일이 **존재하는지만** 확인하고, 타임스탬프는 비교하지 않습니다.

```makefile
build/hello.o: hello.c | build
	gcc -c hello.c -o build/hello.o

build:
	mkdir -p build
```

`build` 디렉터리는 `hello.o`를 빌드하기 전에 존재해야 합니다. 하지만 디렉터리의 타임스탬프가 바뀌어도(`touch build`) `hello.o`를 다시 빌드하지 않습니다.

디렉터리를 의존성으로 쓸 때 order-only가 필수입니다. 디렉터리에 파일을 추가하면 디렉터리의 수정 시간이 바뀌는데, 이 때문에 불필요한 재빌드가 발생할 수 있기 때문입니다.

---

## 레시피(Recipe)

레시피는 타겟을 만드는 **셸 명령어**입니다. 반드시 **탭(Tab)**으로 시작해야 합니다.

### 기본 실행

```makefile
hello: main.o hello.o
	gcc -o hello main.o hello.o
```

Make는 기본적으로 레시피를 `/bin/sh`에서 실행합니다.

### 각 줄은 별도의 셸

중요한 점: **레시피의 각 줄은 별도의 셸 프로세스에서 실행됩니다.** 이 때문에 예상치 못한 동작이 발생할 수 있습니다.

```makefile
# 의도한 대로 동작하지 않음!
wrong:
	cd subdir
	pwd          # subdir가 아닌 원래 디렉터리를 출력
	ls           # subdir가 아닌 원래 디렉터리의 파일을 출력
```

`cd subdir`가 첫 번째 셸에서 실행되고, 그 셸이 종료됩니다. 두 번째 줄의 `pwd`는 새 셸에서 실행되므로 작업 디렉터리가 원래대로 돌아갑니다.

해결 방법은 한 줄로 연결하는 것입니다.

```makefile
# 방법 1: &&로 연결
correct1:
	cd subdir && pwd && ls

# 방법 2: 백슬래시로 줄 이음
correct2:
	cd subdir && \
	pwd && \
	ls
```

GNU Make 3.82 이상에서는 `.ONESHELL` 지시자를 쓸 수도 있습니다.

```makefile
.ONESHELL:

correct3:
	cd subdir
	pwd
	ls
```

`.ONESHELL`이 설정되면 한 레시피의 모든 줄이 같은 셸에서 실행됩니다.

### 레시피 접두사

레시피 줄 앞에 특수 문자를 붙여 동작을 제어할 수 있습니다.

| 접두사 | 의미 | 예시 |
|--------|------|------|
| `@` | 명령어를 화면에 출력하지 않음 | `@echo "Building..."` |
| `-` | 오류가 나도 계속 진행 | `-rm -f *.o` |
| `+` | `make -n`에서도 실제로 실행 | `+$(MAKE) -C subdir` |

#### @ (silent)

기본적으로 Make는 실행하는 명령어를 화면에 출력합니다. `@`를 붙이면 출력하지 않습니다.

```makefile
hello:
	@echo "Building hello..."
	gcc -o hello main.o
```

출력:
```
Building hello...
gcc -o hello main.o
```

`@` 없이 `echo`를 쓰면:
```
echo "Building hello..."
Building hello...
gcc -o hello main.o
```

#### - (ignore errors)

명령이 실패해도(0이 아닌 종료 코드) 다음 명령을 계속 실행합니다.

```makefile
clean:
	-rm -f *.o       # 파일이 없어도 오류 무시
	-rm -f hello
	@echo "Cleaned."
```

#### + (force execute)

`make -n`(dry-run)이나 `make -q`(query) 모드에서도 실제로 실행합니다. 주로 재귀 Make 호출에 사용합니다.

```makefile
subdir:
	+$(MAKE) -C subdir
```

---

## 셸 변경

기본 셸(`/bin/sh`)이 아닌 다른 셸을 쓰려면 `SHELL` 변수를 설정합니다.

```makefile
SHELL := /bin/bash

test:
	echo $$BASH_VERSION
	[[ -f file.txt ]] && echo "exists"   # Bash 전용 문법
```

Bash 배열이나 `[[` 조건문 같은 Bash 전용 기능을 쓰려면 이 설정이 필요합니다.

**주의**: Makefile에서 셸 변수를 참조할 때는 `$$`로 이스케이프합니다. `$VAR`는 Make 변수로 해석되고, `$$VAR`가 셸 변수가 됩니다.

---

## 이중 콜론 규칙

**이중 콜론 규칙(::)**은 같은 타겟에 여러 개의 독립적인 규칙을 정의합니다.

```makefile
clean::
	rm -f *.o

clean::
	rm -f *.exe

clean::
	rm -f *.log
```

`make clean`을 실행하면 세 레시피가 모두 실행됩니다. 일반 규칙(`:`)에서는 같은 타겟에 레시피를 두 번 정의하면 오류가 납니다.

이 기능은 여러 Makefile을 include할 때 유용합니다. 각 Makefile이 자신의 clean 동작을 추가할 수 있습니다.

---

## 흔한 실수

### 의존성에 디렉터리를 그냥 넣기

```makefile
# 문제: build 디렉터리에 파일 추가하면 매번 재빌드
build/hello.o: hello.c build
	gcc -c hello.c -o build/hello.o
```

**해결**: order-only 의존성 사용

```makefile
build/hello.o: hello.c | build
	gcc -c hello.c -o build/hello.o
```

### cd 후 다음 줄에서 작업

```makefile
deploy:
	cd /var/www
	cp -r dist/* .    # /var/www가 아닌 현재 디렉터리에 복사됨!
```

**해결**: 한 줄로 연결

```makefile
deploy:
	cd /var/www && cp -r $(CURDIR)/dist/* .
```

### 셸 변수와 Make 변수 혼동

```makefile
test:
	for f in *.c; do echo $f; done   # 아무것도 출력 안 됨
```

`$f`가 Make 변수로 해석되어 빈 문자열이 됩니다.

**해결**: `$$`로 이스케이프

```makefile
test:
	for f in *.c; do echo $$f; done
```

---

## 정리

- **타겟**은 만들려는 파일이고, **의존성**은 그 파일을 만들기 위해 필요한 파일입니다.
- 의존성이 타겟보다 새로우면 레시피를 실행합니다.
- **레시피**는 탭으로 시작하고, 각 줄은 별도의 셸에서 실행됩니다.
- `|` 뒤의 **order-only 의존성**은 존재 여부만 확인합니다(디렉터리에 유용).
- 접두사 `@`는 출력 억제, `-`는 오류 무시, `+`는 강제 실행입니다.
- 같은 타겟의 의존성은 여러 줄에 나눠 쓸 수 있고, 합쳐집니다.

## 다음 장 예고

Ch 3에서는 변수를 다룹니다. 반복을 줄이고 Makefile을 유지보수하기 쉽게 만드는 핵심 기능입니다. 사용자 정의 변수, 자동 변수(`$@`, `$<`, `$^`), 그리고 변수 확장 방식(`=` vs `:=`)을 살펴봅니다.

## 참고 자료

- [GNU Make Manual - Writing Rules](https://www.gnu.org/software/make/manual/html_node/Rules.html)
- [GNU Make Manual - Recipes](https://www.gnu.org/software/make/manual/html_node/Recipes.html)
