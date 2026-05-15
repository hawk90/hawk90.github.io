---
title: "Ch 2: 규칙 — 타겟, 의존성, 레시피"
date: 2025-05-14T02:00:00
description: "Makefile 규칙의 구성 요소와 동작 방식 — 다중 타겟, order-only, 레시피 접두사, 이중 콜론까지."
tags: [make, build, Makefile, rules]
series: "GNU Make"
seriesOrder: 2
draft: false
---

## 규칙의 해부

[Ch 1](/blog/tools/gnu-make/chapter01-intro)에서 본 것처럼 Makefile은 규칙(rule)의 묶음입니다. 규칙 하나의 모양은 단순합니다.

```makefile
타겟: 의존성1 의존성2
	레시피1
	레시피2
```

겉보기에는 세 줄짜리 문법이지만, Make는 이 작은 구조 위에 *다중 타겟, 분리 의존성, order-only, 레시피 접두사, 이중 콜론, .ONESHELL* 같은 손잡이를 마련해 두었습니다. 각각이 언제 필요한지, 안 쓰면 무엇이 어색해지는지를 함께 살펴봅니다.

---

## 타겟(Target)

타겟은 대부분의 경우 *만들려는 파일의 이름*입니다. Make는 그 파일을 "최신 상태"로 유지하는 데 필요한 일을 합니다.

### 단일 타겟

```makefile
hello.o: hello.c hello.h
	gcc -c hello.c -o hello.o
```

`hello.o`라는 파일이 `hello.c`와 `hello.h`보다 새것이 아닐 때 레시피가 돕니다. 가장 흔한 형태입니다.

### 다중 타겟 — 한 번에 여러 개 묶기

같은 의존성과 같은 레시피 패턴을 공유하는 타겟이라면 한 줄에 묶어 적을 수 있습니다.

```makefile
foo.o bar.o: common.h
	$(CC) -c $< -o $@
```

이 한 줄은 내부적으로 다음 두 규칙으로 펼쳐집니다.

```makefile
foo.o: common.h
	$(CC) -c $< -o $@

bar.o: common.h
	$(CC) -c $< -o $@
```

각 타겟이 *독립된 규칙*으로 복제된다는 점이 중요합니다. 즉 `make foo.o`를 부르면 `foo.o`용 레시피만, `make bar.o`는 `bar.o`용 레시피만 실행됩니다. 두 타겟이 *한 번의 명령으로 동시에 만들어지는 게 아닙니다*. 정말로 "한 명령이 두 파일을 동시에 만든다"고 알려 주고 싶다면 4.3에 추가된 **grouped target** 문법(`&:`)을 써야 합니다(Ch 4에서 다룹니다).

`$<`(첫 번째 의존성)와 `$@`(타겟 이름)은 *자동 변수*입니다. 자세한 동작은 [Ch 3](/blog/tools/gnu-make/chapter03-variables)에서 다룹니다. 지금은 손잡이로만 봐 두세요.

### 기본 타겟

`make`만 입력하면 Make는 *Makefile의 첫 규칙의 첫 타겟*을 빌드합니다. 이것이 기본 타겟입니다. 사람들이 흔히 의심하는 "왜 위쪽 규칙이 더 중요해 보이지?"라는 직관이 사실은 정답입니다.

이 동작은 *유연하면서도 위험*합니다. 자칫 `clean`이 위에 가 있는 Makefile에서 그냥 `make`를 치면 빌드 산물이 통째로 날아갑니다. 그래서 관례는 단 하나입니다.

> 첫 타겟은 항상 `all`로 둔다.

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

이 패턴이면 `make`만 쳐도 `all`이 평가되고, `all`이 `hello`와 `goodbye`에 의존하므로 둘 다 빌드됩니다. `all`은 파일을 만들지 않는 동작 이름이라 [Ch 1](/blog/tools/gnu-make/chapter01-intro#phony-타겟)에서 본 `.PHONY` 보호를 받습니다.

---

## 의존성(Prerequisites)

의존성은 타겟이 완성되기 전에 *먼저 준비되어 있어야 하는 파일*입니다. Make는 의존성 파일의 mtime을 타겟과 비교해서 재빌드 여부를 정합니다. 이 mtime 비교가 Make의 거의 모든 결정을 떠받칩니다.

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

```
hello.h ──┐
          ├──▶ main.o   ─┐
main.c  ──┘              │
                         ├──▶ hello
hello.h ──┐              │
          ├──▶ hello.o  ─┘
hello.c ──┘
```

이제 `hello.h`만 손대 봅시다.

1. `hello.h`의 mtime이 `main.o`보다 새것 → `main.o` 재컴파일
2. `hello.h`의 mtime이 `hello.o`보다 새것 → `hello.o` 재컴파일
3. 새 `main.o`, `hello.o`의 mtime이 `hello`보다 새것 → `hello` 재링크

한 헤더의 수정이 그래프를 거꾸로 거슬러 올라가며 *세 단계의 작업*을 만들어 냅니다. 이 전파가 자동으로 일어난다는 점이 Make를 손으로 만든 빌드 스크립트와 구분 짓는 핵심입니다.

### 의존성을 여러 줄로 쪼개기

같은 타겟의 의존성을 *여러 줄에 나눠* 적을 수 있습니다. 의존성은 합쳐지고, 레시피는 한 군데에만 있으면 됩니다.

```makefile
main.o: main.c
main.o: hello.h
main.o: config.h
main.o:
	gcc -c main.c -o main.o
```

위는 다음과 정확히 같은 의미입니다.

```makefile
main.o: main.c hello.h config.h
	gcc -c main.c -o main.o
```

언뜻 보면 무의미한 기법이지만, *자동 생성된 의존성 파일을 `include` 할 때* 진가가 드러납니다. 컴파일러가 `gcc -MMD`로 만들어 둔 `.d` 파일을 그대로 include하면, Make가 이 형태로 의존성을 흡수합니다. 헤더 변경이 정확히 반영되는 빌드는 이 패턴 위에서 돌아갑니다(자세한 자동 의존성 생성은 [Ch 6](/blog/tools/gnu-make/chapter06-conditionals)·[Ch 7](/blog/tools/gnu-make/chapter07-practical)에서 다룹니다).

### Order-only 의존성 — "있기만 하면 OK"

`|` 기호 뒤에 적는 의존성은 *order-only*입니다. Make는 이 파일이 *존재하는지*만 확인하고, mtime은 무시합니다.

```makefile
build/hello.o: hello.c | build
	gcc -c hello.c -o build/hello.o

build:
	mkdir -p build
```

왜 일반 의존성이 아니라 order-only가 필요할까요? 답은 *디렉터리의 mtime이 바뀌는 시점*에 있습니다.

리눅스에서 디렉터리의 mtime은 *그 안에 파일이 추가/삭제될 때마다* 갱신됩니다. `build/hello.o`를 만드는 순간 `build/`의 mtime은 `hello.o`보다 더 새것이 됩니다. 다음 빌드에서 Make는 의존성 `build`가 `build/hello.o`보다 새것이라고 판단하고, 멀쩡한 `hello.o`를 또 컴파일합니다. 그 결과로 또 mtime이 갱신되고… 영원히 같은 일을 반복합니다.

Order-only는 이 함정을 피하는 정답입니다. "디렉터리가 *없으면* 만들어라. 있으면 신경 쓰지 마라"라는 의미를 정확히 표현하는 방법이기 때문입니다. 실무에서 `mkdir -p build` 패턴이 등장할 때 거의 무조건 `|` 뒤에 두는 이유가 이것입니다.

또 다른 흔한 케이스는 *생성 도구 의존성*입니다. 코드 생성기(예: `protoc`)는 한 번만 만들면 충분하고, 이후 mtime 변경으로 전체 재빌드를 유발하면 곤란합니다. 이때도 order-only가 답입니다.

```makefile
output.h: schema.proto | $(PROTOC)
	$(PROTOC) --cpp_out=. $<

$(PROTOC):
	./build_protoc.sh
```

---

## 레시피(Recipe)

레시피는 타겟을 만드는 *셸 명령*입니다. 반드시 *탭 한 글자*로 시작하고, 한 규칙 안에서 여러 줄을 가질 수 있습니다.

### 셸이 누구인지부터

Make는 레시피를 어떤 셸로 실행할까요? POSIX 표준은 `/bin/sh`를 기본으로 정합니다. GNU Make도 별다른 설정이 없으면 `/bin/sh`를 씁니다. 윈도우 환경(MSYS2 등)에서는 `sh.exe`를 찾습니다. 즉 *어떤 시스템에서도 같은 명령이 돌도록* 만들고 싶다면 셸 호환 문법(POSIX sh)에 머무는 게 안전합니다.

`bash` 전용 기능을 쓰고 싶을 때는 `SHELL` 변수를 명시적으로 바꿉니다(아래 "셸 변경" 절).

### 각 줄은 별도의 셸 — 가장 흔한 오해

[Ch 1](/blog/tools/gnu-make/chapter01-intro)에서 잠깐 언급한 사실인데, 다시 강조할 만합니다.

> 레시피의 *각 줄*은 *각자 새 셸 프로세스*에서 실행됩니다.

이 사실을 잊으면 다음과 같은 함정에 빠집니다.

```makefile
wrong:
	cd subdir
	pwd      # subdir가 아니라 원래 디렉터리!
	ls       # 마찬가지
```

첫 줄의 `cd`는 *그 줄을 실행한 셸에만* 영향을 미치고, 그 셸은 줄이 끝나는 순간 종료됩니다. 다음 줄은 새 셸에서 시작하므로 작업 디렉터리는 Makefile이 호출된 원래 자리로 되돌아갑니다.

해결은 셋 중 하나입니다.

**방법 1 — 한 줄로 잇기 (가장 흔함)**
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

`\`로 끝낸 줄은 다음 줄과 합쳐져 한 셸 명령이 됩니다. 가독성을 위해 자주 씁니다.

**방법 3 — `.ONESHELL` (GNU Make 3.82+)**
```makefile
.ONESHELL:

correct:
	cd subdir
	pwd
	ls
```

`.ONESHELL`을 켜면 *한 레시피의 모든 줄이 한 셸에서* 실행됩니다. 직관에 가깝지만 두 가지 부작용이 있습니다.

- 에러 처리: 기본 동작은 *각 줄별 종료 코드 확인*입니다. `.ONESHELL`은 그 단위가 *레시피 전체*로 바뀌어, `set -e` 같은 셸 옵션을 직접 켜야 정확한 실패 감지가 됩니다.
- 접두사: `@` 같은 줄별 접두사는 첫 줄에만 적용됩니다.

큰 프로젝트에서는 일관된 셸 동작이 더 중요해서, `.ONESHELL` 대신 `&&` 연결을 선호합니다.

### 레시피 접두사 — `@`, `-`, `+`

레시피 줄 *맨 앞에* 특수 문자를 붙여 동작을 조절할 수 있습니다.

| 접두사 | 의미 | 자주 쓰는 자리 |
|--------|------|--------------|
| `@` | 명령어를 화면에 출력하지 않음 | `@echo "..."` 같은 사용자 친화 메시지 |
| `-` | 비-0 종료 코드를 무시하고 다음 줄로 | `-rm -f *.o` (파일 없을 때도 OK) |
| `+` | dry-run·query 모드에서도 실제 실행 | 재귀 Make 호출 `+$(MAKE) -C sub` |

세 접두사 모두 *같은 줄에 함께* 쓸 수 있습니다.

```makefile
clean:
	@-rm -f *.o   # 화면에 안 띄우고, 실패해도 무시
```

#### `@` — 명령은 살리되 출력은 죽이기

기본 동작에서 Make는 *실행하기 직전에* 그 명령 줄을 그대로 화면에 출력합니다. 일종의 "지금 이걸 합니다" 알림입니다.

```makefile
hello:
	echo "Building hello..."
	gcc -o hello main.o
```

```
$ make hello
echo "Building hello..."
Building hello...
gcc -o hello main.o
```

`echo "Building hello..."`가 두 번 보이는 이유는, 첫 번째가 Make의 "지금 이걸 합니다" 알림이고 두 번째가 `echo`의 실제 출력이기 때문입니다. 사용자 친화 메시지에는 보통 첫 번째 출력이 거슬려서, `@`로 죽입니다.

```makefile
hello:
	@echo "Building hello..."
	gcc -o hello main.o
```

```
$ make hello
Building hello...
gcc -o hello main.o
```

전체 출력을 한 번에 끄고 싶으면 `make -s`(silent) 또는 `MAKEFLAGS += --silent`를 씁니다.

#### `-` — 실패 무시

```makefile
clean:
	-rm -f *.o
	-rm -f hello
	@echo "Cleaned."
```

`rm`이 *없는 파일을 지우려 할 때* 비-0 종료 코드를 돌려주는데, 그 경우에도 Make가 중단되지 않게 합니다. `clean` 같은 정리 타겟에서 자주 봅니다. 다만 `rm -f`처럼 도구 자체에 이미 "조용히 실패" 옵션이 있을 때는 `-`를 굳이 붙일 필요가 없습니다.

#### `+` — 강제 실행

`make -n`(dry-run, 명령을 출력만 하고 실제로 실행 안 함)이나 `make -q`(query, "최신인지 확인만") 모드에서도 *실제로 실행*하라는 표식입니다. 재귀 Make 호출에서 거의 항상 붙는데, 부모 Make의 dry-run이 자식 Make에도 전달되어야 (자식이 또 dry-run을 하도록) 일관된 동작이 됩니다.

```makefile
subdir:
	+$(MAKE) -C subdir
```

`$(MAKE)`는 *현재 실행 중인 Make 자신*을 가리키는 특수 변수입니다. 단순히 `make`라고 적으면 환경 PATH에 있는 다른 Make가 실행될 수 있고, dry-run·jobserver 같은 설정이 끊깁니다.

---

## 셸 변경

Bash 전용 기능(`[[`, 배열, `<<<`, `=~` 등)이 필요하면 `SHELL` 변수를 명시적으로 바꿉니다.

```makefile
SHELL := /bin/bash

test:
	@echo "Bash version: $$BASH_VERSION"
	@[[ -f file.txt ]] && echo "exists" || echo "missing"
```

여기서 `:=`는 *즉시 확장*(simply-expanded) 대입입니다. 일반 `=`은 *지연 확장*(recursively-expanded)이라 미묘하게 동작이 다른데, 자세한 이야기는 [Ch 3](/blog/tools/gnu-make/chapter03-variables)에서 봅니다.

> 💡 *왜 `$$BASH_VERSION`이지?*: Make는 `$`를 자기 변수 시작으로 봅니다. 그래서 *셸 변수*를 표시하려면 `$`를 한 번 더 써서 `$$`로 이스케이프해야 합니다. Make는 `$$`를 만나면 `$` 한 글자로 줄여 셸에 넘기고, 셸이 그 `$BASH_VERSION`을 자기 변수로 해석합니다.

엄격 모드를 켜고 싶으면 `.SHELLFLAGS`를 함께 바꿉니다.

```makefile
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
```

`-e`는 첫 실패에서 중단, `-u`는 미정의 변수 사용 시 에러, `-o pipefail`은 파이프라인 중 하나라도 실패하면 전체를 실패로 봅니다. 운영 스크립트에서 흔히 쓰는 안전 트리오로, Makefile에 들고 오면 디버깅이 크게 쉬워집니다.

---

## 이중 콜론 규칙(`::`)

같은 타겟에 *여러 독립 레시피*를 정의하고 싶을 때 씁니다. 보통 콜론(`:`)으로는 같은 타겟을 두 번 적으면 오류이지만, 이중 콜론은 허용됩니다.

```makefile
clean::
	rm -f *.o

clean::
	rm -f *.exe

clean::
	rm -f *.log
```

`make clean`을 부르면 세 레시피가 *위에서 아래 순서로* 모두 실행됩니다.

언제 유용한가? 가장 흔한 경우는 *여러 Makefile을 `include`해서 합칠 때*입니다. 각 서브 모듈의 Makefile이 자기 몫의 정리 동작을 `clean::`으로 더하면, 상위 Makefile은 따로 합칠 필요 없이 자연스럽게 모든 `clean`이 호출됩니다.

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

단점은 *의도 추적이 어려워진다*는 것입니다. 누가 `clean::`을 추가했는지 한눈에 안 보이고, 실행 순서가 include 순서에 묶입니다. 그래서 이중 콜론은 *플러그인 형태 빌드*에서나 가끔 등장하고, 평범한 Makefile에서는 거의 안 씁니다.

---

## 흔한 실수

처음 Makefile 작성 시 자주 부딪히는 자리들입니다.

### 1. 디렉터리를 일반 의존성으로 넣기

```makefile
# 문제: build에 파일 추가될 때마다 hello.o 재컴파일
build/hello.o: hello.c build
	gcc -c hello.c -o build/hello.o
```

`build/` 디렉터리는 *그 안에 파일이 들어올 때마다* mtime이 갱신됩니다. 결과적으로 디렉터리가 항상 `hello.o`보다 새것이 되어 무한 재빌드가 일어납니다.

**해결**: order-only 의존성
```makefile
build/hello.o: hello.c | build
	gcc -c hello.c -o build/hello.o
```

### 2. cd 후 다음 줄에서 작업

```makefile
deploy:
	cd /var/www
	cp -r dist/* .    # /var/www가 아닌 원래 디렉터리에서 실행!
```

**해결**: 한 줄로 잇기
```makefile
deploy:
	cd /var/www && cp -r $(CURDIR)/dist/* .
```

`$(CURDIR)`은 Make가 시작될 때 작업 디렉터리를 담아 두는 자동 변수입니다. `cd` 이후에도 원래 디렉터리를 가리키므로 절대 경로처럼 안전합니다.

### 3. 셸 변수에 `$$` 안 붙임

```makefile
test:
	for f in *.c; do echo $f; done   # 빈 문자열 출력
```

`$f`는 Make 변수로 해석되어 *정의된 적 없는 빈 값*이 됩니다.

**해결**: `$$`로 이스케이프
```makefile
test:
	for f in *.c; do echo $$f; done
```

### 4. tab 대신 공백 들여쓰기 (반복)

여전히 가장 흔합니다. 에디터 설정을 의심하세요.

```
Makefile:5: *** missing separator.  Stop.
```

이 메시지가 보이면 99%는 탭이 아닌 공백 들여쓰기입니다.

### 5. 첫 타겟이 `clean`

```makefile
clean:
	rm -f *.o

hello: main.o
	gcc -o hello main.o
```

`make`만 치면 *첫 타겟인 `clean`*이 실행되어 빌드 산물이 날아갑니다. 관습대로 첫 타겟은 `all`로 두세요.

---

## 작은 예시 — 모든 요소 적용

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

이 Makefile은 다음을 만족합니다.
- `all`이 첫 타겟이므로 안전합니다.
- 빌드 산물이 `build/` 안에 격리되어 소스 디렉터리가 깨끗합니다.
- `build/` 디렉터리는 order-only로 잡혀 무한 재빌드를 막습니다.
- Bash strict 모드(`-eu -o pipefail`)로 작은 실수도 즉시 멈춥니다.
- `clean::`은 이중 콜론으로, 추후 다른 `.mk` 파일이 정리 동작을 더하기 쉽습니다.

다음 장에서 변수와 자동 변수(`$@`, `$<`, `$^`)를 배우면 이 Makefile을 한 번 더 줄일 수 있게 됩니다.

---

## 정리

- **타겟·의존성·레시피**가 한 규칙의 세 부분. 의존성이 새것이면 레시피가 돈다.
- **다중 타겟** `a b: dep`은 두 개의 독립 규칙으로 펼쳐진다. 진짜 그룹은 `&:` 문법(Ch 4).
- **Order-only `|`** 는 *존재만* 검사. 디렉터리·생성 도구 의존성에 거의 필수.
- 레시피의 *각 줄은 독립 셸*. `cd`가 이어지지 않는 원인. 해결은 `&&`·`\`·`.ONESHELL`.
- 레시피 **접두사**: `@`(출력 죽임), `-`(실패 무시), `+`(dry-run에도 실행).
- `SHELL`·`.SHELLFLAGS`로 Bash strict 모드를 켜 둘 만하다.
- **이중 콜론 `::`** 은 같은 타겟 여러 레시피. 플러그인식 Makefile에서 가끔 쓴다.

## 다음 장 예고

[Ch 3: 변수](/blog/tools/gnu-make/chapter03-variables)에서는 Make의 변수를 다룹니다. 사용자 정의, 자동 변수(`$@`, `$<`, `$^`, `$?`), 두 가지 확장 방식(`=` vs `:=`), 환경 변수와의 관계까지 — Make에서 "왜 같은 코드가 미묘하게 다르게 동작하지?"의 9할이 이 장에서 풀립니다.

## 참고 자료

- [GNU Make Manual — Writing Rules](https://www.gnu.org/software/make/manual/html_node/Rules.html)
- [GNU Make Manual — Recipes](https://www.gnu.org/software/make/manual/html_node/Recipes.html)
- [GNU Make Manual — Special Targets](https://www.gnu.org/software/make/manual/html_node/Special-Targets.html) (`.PHONY`, `.ONESHELL` 등)
