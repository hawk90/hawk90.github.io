---
title: "Make 패턴 규칙과 암시적 규칙 — % 매칭 동작"
slug: "tools/build/gnu-make/chapter04-pattern-rules"
date: 2026-06-03T09:04:00
description: "% 한 글자로 100개의 규칙을 줄이는 패턴 규칙, Make 내장 암시적 규칙, 그리고 둘의 충돌·우선순위."
tags: [make, build, pattern]
series: "GNU Make"
seriesOrder: 4
draft: false
topics: ["tools", "tools/build"]
---

## 왜 패턴 규칙이 필요한가

[Ch 3](/blog/tools/build/gnu-make/chapter03-variables)에서 변수로 중복을 한 번 줄였습니다. 하지만 *오브젝트 파일마다 규칙을 한 번씩 적어야* 한다는 한계는 그대로입니다.

```makefile
main.o: main.c hello.h
	gcc -c main.c -o main.o

hello.o: hello.c hello.h
	gcc -c hello.c -o hello.o

utils.o: utils.c utils.h
	gcc -c utils.c -o utils.o
```

여기에는 사람이 한눈에 알아채는 *패턴*이 있습니다. "**`.c` 파일 하나로 같은 이름의 `.o` 파일 하나를 만든다.**" 사람은 이 패턴을 본 순간 100개 파일이라도 머릿속에서 즉시 일반화하지만, Makefile에 이걸 적어 두려면 100줄을 써야 합니다.

**패턴 규칙**(pattern rule)은 이 일반화를 *Makefile의 언어로* 표현하는 도구입니다.

```makefile
%.o: %.c
	gcc -c $< -o $@
```

`%`는 *임의의 문자열*에 매칭되는 와일드카드입니다. Make는 이 와일드카드 매칭을 다음과 같이 풉니다.

1. Make가 `main.o`를 만들 필요가 생김
2. 패턴 규칙 `%.o: %.c`를 시도
3. 타겟의 `%` = `"main"` (stem)
4. 의존성의 `%`도 같은 `"main"`으로 치환 → `main.c`
5. 레시피는 `$<`, `$@` 같은 자동 변수를 사용
6. 최종 실행: `gcc -c main.c -o main.o`

여기서 매칭된 `main` 부분을 **stem**이라고 부릅니다. stem은 자동 변수 `$*`로 가져올 수 있는데, 잠시 후 보겠습니다.

이 한 규칙이 *디렉터리 안의 모든 `.c → .o` 쌍*을 처리합니다. `.c` 파일 100개여도, 1개여도 똑같이 동작합니다.

---

## 패턴 규칙 문법

```makefile
%.타겟확장자: %.의존성확장자
	레시피
```

`%` 양쪽 모두에 *같은 값*이 들어간다는 것이 핵심입니다. 즉 `%.o: %.c`는 "이름 X에 대해 X.c → X.o"라는 *함수 모양 정의*에 가깝습니다.

### 기본 예시 — 흔히 보는 변환들

```makefile
# C 소스 → 오브젝트
%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

# C++ 소스 → 오브젝트
%.o: %.cpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -c $< -o $@

# 어셈블리 → 오브젝트
%.o: %.s
	$(AS) $(ASFLAGS) -o $@ $<

# Protocol Buffers → C++ 코드 (보조 도구 호출)
%.pb.cc %.pb.h: %.proto
	$(PROTOC) --cpp_out=. $<
```

여러 타겟을 가진 패턴 규칙은 일반적인 명시적 다중 타겟 규칙과 다릅니다. GNU Make는 콜론 종류와 무관하게 이 패턴 출력들을 한 그룹으로 취급하므로 위 예제만으로 protoc이 두 번 호출된다고 설명하면 틀립니다. 레시피는 요청된 한 파일만이 아니라 함께 선언한 출력을 모두 갱신해야 합니다. [다중 출력 패턴 규칙](https://www.gnu.org/software/make/manual/html_node/Pattern-Intro.html)을 참고합니다.

### 디렉터리를 포함한 패턴

빌드 산물을 별도 디렉터리(`build/`)에 모으는 게 표준 관행입니다. 패턴에 경로를 그대로 적으면 됩니다.

```makefile
build/%.o: src/%.c
	@mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@
```

`build/main.o`를 만들 차례가 되면 Make는 `src/main.c`를 찾아 컴파일합니다. `$(@D)`는 [Ch 3](/blog/tools/build/gnu-make/chapter03-variables#디렉터리파일-이름-분리--d-f)에서 본 *자동 변수의 디렉터리 부분*입니다.

### 패턴 안의 `%`는 *하나*만

```makefile
%.o: %.c            # OK: 타겟·의존성 한 자리씩
%-%.o: %-%.c        # 안 됨: %가 두 번
```

Make 매뉴얼은 *한 패턴에 `%`는 한 번*이라고 못 박습니다. 두 번 이상은 결정적으로 해석할 수 없습니다(어떤 글자를 어디로 매칭할지 모호하기 때문). 다중 매칭이 필요하면 보통 *정적 패턴 규칙*이나 *함수*로 풀어냅니다.

---

## 자동 변수 — stem(`$*`) 포함

[Ch 3](/blog/tools/build/gnu-make/chapter03-variables#자동-변수--규칙마다-자동으로-채워지는-손잡이)에서 본 자동 변수에 패턴 규칙에서 특히 유용한 한 가지가 더해집니다 — `$*` (stem).

| 변수 | 의미 | `build/main.o: src/main.c` 예 |
|------|------|--------------------------------|
| `$@` | 타겟 | `build/main.o` |
| `$<` | 첫 의존성 | `src/main.c` |
| `$^` | 모든 의존성 | `src/main.c` |
| `$*` | stem (% 매칭 부분) | `main` |
| `$(@D)` | 타겟 디렉터리 | `build` |
| `$(@F)` | 타겟 파일명 | `main.o` |

### `$*`의 함정 — 중첩 디렉터리

`$*`은 단순히 "확장자를 뗀 파일 이름"이 *아닙니다*. *`%` 와일드카드가 실제로 매칭한 문자열*입니다. 디렉터리가 중첩되면 차이가 드러납니다.

```makefile
build/%.o: src/%.c
	@echo "stem = $*"
	gcc -c $< -o $@
```

`build/sub/main.o`를 빌드해 봅시다.

- 패턴 `build/%.o`가 `build/sub/main.o`에 매칭되면, `%`는 *`sub/main`* 전체에 매칭됩니다.
- 따라서 `$* = sub/main`, `$@ = build/sub/main.o`, `$< = src/sub/main.c`.

`$*`을 그냥 "파일 이름"이라고 가정하고 다른 곳에 쓰면 `sub/main`처럼 슬래시가 끼어 들어와 사고가 납니다. 파일 이름만 필요하면 `$(notdir $*)`, 디렉터리만 필요하면 `$(dir $*)`을 씁니다.

```makefile
build/%.o: src/%.c
	@echo "Compiling $(notdir $*).c"
	gcc -c $< -o $@
```

---

## 암시적 규칙 — Make가 미리 알고 있는 변환

Make는 *수십 가지 기본 패턴 규칙*을 내장하고 있습니다. 이걸 *암시적 규칙*(implicit rules)이라 부릅니다. 사용자가 명시적으로 적지 않아도, Make는 `.c → .o`, `.cpp → .o`, `.o → 실행 파일` 같은 변환을 자동으로 인식합니다.

### 주요 암시적 규칙

| 결과 | 입력 | Make가 내부적으로 가진 명령 |
|------|------|----------------------------|
| `%.o` | `%.c` | `$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@` |
| `%.o` | `%.cpp` | `$(CXX) $(CPPFLAGS) $(CXXFLAGS) -c $< -o $@` |
| `%.o` | `%.s` | `$(AS) $(ASFLAGS) -o $@ $<` |
| `%`  (실행 파일) | `%.o` | `$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@` |

이 표 덕분에 *극단적으로 짧은 Makefile*도 동작합니다.

```makefile
CC := gcc
CFLAGS := -Wall -g

hello: main.o hello.o utils.o
```

이 조각은 main.c·hello.c·utils.c 등의 소스가 준비된 상태를 가정합니다. CC를 gcc로 지정했으므로 내장 규칙도 gcc를 사용합니다. 실제 실행 전 `make -n`으로 컴파일과 링크 입력을 확인합니다. 의존성만 적은 명시적 규칙에 레시피가 없으면 암시적 규칙을 검색할 수 있습니다.

### 암시적 규칙이 보고 있는 변수

암시적 규칙은 일반 패턴 규칙처럼 자동 변수를 사용합니다. 위 표의 명령에는 `$(CC)`, `$(CFLAGS)` 같은 표준 변수가 그대로 등장하는데, 사용자가 정의하지 않아도 CC=cc 같은 내장 기본값이 있습니다. 반면 CFLAGS처럼 빈 기본값을 가진 변수도 있으므로 $(origin CC)와 실제 값을 구분해 확인합니다.

빈 `$(CFLAGS)`로 빌드된 결과는 *경고도 디버그 정보도 최적화도 없는* 상태가 됩니다. 그래서 암시적 규칙에 의존하려면 *변수만큼은 반드시* 명시적으로 설정해야 합니다.

```makefile
# 권장
CC := gcc
CFLAGS := -Wall -Wextra -g -O2
CPPFLAGS := -Iinclude
LDLIBS := -lm

hello: main.o hello.o utils.o
```

### 암시적 규칙 데이터베이스 보기

Make가 내부적으로 가진 규칙 전부를 보고 싶으면 `-p`(print database) 옵션을 씁니다.

```bash
make -p -f /dev/null 2>/dev/null | less
```

`-f /dev/null`은 *현재 디렉터리의 Makefile 무시*하고 내장 규칙만 보고 싶을 때 씁니다. 출력은 길지만, `'%.o'`로 검색하면 모든 컴파일 규칙이 한자리에 모여 있습니다.

### 암시적 규칙 끄기

큰 프로젝트에서는 *의도하지 않은 규칙 매칭*이 디버깅을 어렵게 만듭니다. "왜 이 `.yacc.c` 파일이 자기 멋대로 컴파일되지?" 같은 의문이 나오면 보통 암시적 규칙이 범인입니다.

전체 비활성화 두 가지 방법:

```makefile
# 방법 1: 접미사 규칙 비우기 (구식 방식 차단)
.SUFFIXES:

# 방법 2: 명령줄 또는 MAKEFLAGS
MAKEFLAGS += --no-builtin-rules --no-builtin-variables
```

`--no-builtin-rules`는 *규칙*만, `--no-builtin-variables`는 *기본 변수(`CC=cc` 등)*까지 끕니다. 둘을 같이 끄면 빈 상태에서 시작할 수 있어, 의도가 명확한 Makefile이 됩니다. 이 옵션을 사용하면 필요한 도구와 규칙을 직접 제공해야 합니다. 다른 프로젝트가 같은 옵션을 쓴다는 이유만으로 적용하지 않습니다.

특정 패턴만 끄려면 *빈 레시피*의 패턴 규칙을 정의합니다.

```makefile
%.o: %.c    # 빈 레시피
```

Make는 이 패턴 규칙이 존재한다고 인식하지만, 레시피가 비어 있어 *내장 규칙을 발동시키지 않습니다*. 이건 거의 안 쓰는 트릭이지만 알아 둘 만은 합니다.

---

## 정적 패턴 규칙 — 적용 범위를 한정하는 패턴

정적 패턴 규칙(*static pattern rule*)은 *특정 타겟 목록*에만 패턴을 적용합니다. 일반 패턴 규칙이 *전 우주의 `.c`에 적용*되는 반면, 정적 패턴은 *명시한 타겟 N개*에만 한정됩니다.

```makefile
타겟들: 타겟패턴: 의존성패턴
	레시피
```

### 예시 — 특정 오브젝트만 다른 옵션으로

```makefile
PROD_OBJS := main.o utils.o config.o
TEST_OBJS := test_main.o test_utils.o

# 프로덕션: 최적화
$(PROD_OBJS): %.o: %.c
	$(CC) $(CFLAGS) -O2 -DNDEBUG -c $< -o $@

# 테스트: 디버그 + 커버리지
$(TEST_OBJS): %.o: %.c
	$(CC) $(CFLAGS) -g -O0 --coverage -c $< -o $@
```

일반 패턴 규칙(`%.o: %.c`)을 두 개 적어 두면 *서로 충돌*합니다(같은 `*.o` 타겟에 두 규칙이 매칭). 정적 패턴은 *적용 범위를 명시*해 이 모호함을 없앱니다.

### 일반 패턴 규칙과의 차이

| 측면 | 일반 패턴 `%.o: %.c` | 정적 패턴 `$(OBJS): %.o: %.c` |
|------|---------------------|-------------------------------|
| 적용 범위 | *모든* `.o` 타겟 | `$(OBJS)`에 포함된 타겟만 |
| 충돌 시 | 다른 패턴과 우선순위 다툼 | 명시 범위라 일찍 결정 |
| 디버깅 | "왜 이 규칙이 적용됐지?" 추적 어려움 | 적용 대상이 명시되어 한눈에 |

규모가 커지면 정적 패턴 규칙이 *유지보수상 분명한 이점*을 갖습니다. 새 종류의 `.o` 타겟이 생겨도 영향 범위가 보호되기 때문입니다.

---

## 규칙 검색 순서 — 우선순위표

Make가 한 타겟의 빌드 방법을 찾을 때 *어떤 규칙을 먼저 시도*하는지 — 이 순서를 알면 "왜 내 규칙이 안 먹히지?" 답이 보입니다.

1. 명시적 규칙이나 정적 패턴 규칙에 레시피가 있으면 그것을 사용합니다.
2. 명시적 규칙에 의존성만 있다면 암시적 규칙 검색을 할 수 있습니다.
3. 사용자 패턴과 내장 규칙의 후보 중 의존성을 충족할 수 있는 규칙을 검색합니다. 사용자 규칙·stem 길이·동률일 때 정의 순서 등이 선택에 영향을 줍니다.
4. 만들 방법도 기존 파일도 없으면 No rule to make target 오류가 납니다.

여러 패턴이 동시에 매칭될 때는 *더 구체적인 패턴이 이깁니다*. 예컨대 `%.o`와 `lib%.o`가 둘 다 `libfoo.o`에 매칭되면, *더 긴 stem*을 가지지 않은 쪽(여기서는 `lib%.o`)이 우선합니다.

실제 예:

```makefile
# 일반 패턴
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# config.o만 다른 옵션
config.o: config.c config.h defaults.h
	$(CC) $(CFLAGS) -DVERSION="1.0" -c $< -o $@
```

config.o에는 명시적 레시피가 있으므로 그 레시피를 쓰고, 나머지는 적용 가능한 패턴을 검색합니다. 더 짧은 stem을 선호하는 규칙은 GNU Make 3.82 이후 기준입니다.

---

## `VPATH` / `vpath` — 소스 검색 경로

지금까지는 *소스가 Makefile과 같은 디렉터리에 있다고 가정*했습니다. 하지만 실제 프로젝트는 `src/`, `lib/`, `include/`로 흩어집니다. 패턴 규칙에서 `%.c` 자리를 *어디까지 뒤져 볼지* 알려 주는 메커니즘이 `VPATH`와 `vpath`입니다.

### `VPATH` — 전역 검색 경로

```makefile
VPATH = src:lib:third_party

%.o: %.c
	gcc -c $< -o $@
```

`VPATH`는 *콜론*(또는 공백)으로 구분된 디렉터리 목록입니다. Make는 `%.c`를 찾을 때 *현재 디렉터리에 없으면 VPATH 경로를 순서대로 검색*합니다.

```bash
$ ls
Makefile  src/main.c  lib/utils.c

$ make main.o
# Make: main.c가 현재 디렉터리에 없네. VPATH 검색...
# → src/main.c 발견 → gcc -c src/main.c -o main.o
```

`$<`이 *발견된 경로*(`src/main.c`)로 풀린다는 점이 중요합니다. 컴파일러는 정확한 경로를 받습니다.

### `vpath` — 패턴별 검색 경로 (소문자)

대문자 `VPATH`가 *모든 파일 타입*에 적용되는 반면, 소문자 `vpath`는 *패턴별*로 지정합니다.

```makefile
vpath %.c src
vpath %.h include
vpath %.cpp src:third_party/src
```

이게 `VPATH`보다 *더 정확합니다*. `%.c`는 `src/`만 검색하고, `%.h`는 `include/`만 검색합니다. 잘못된 디렉터리의 파일이 *우연히 매칭되는* 사고를 줄입니다.

`vpath`는 *지시자*(directive)라 함수가 아닙니다. 명령으로 호출하는 게 아니라 *Makefile 최상위에 적습니다*.

### 흔한 함정 — `$@`는 *발견 경로가 아니라 원래 타겟*

```makefile
VPATH = src

%.o: %.c
	gcc -c $< -o $@
```

`main.o`를 빌드할 때:
- `$<`은 발견된 경로 `src/main.c`
- `$@`은 *우리가 요청한* `main.o` (검색 안 됨)

즉 출력 파일은 *현재 디렉터리에 생성*됩니다. 이게 원하는 동작이면 좋지만, 출력도 별도 디렉터리에 두고 싶다면 `VPATH`로는 부족합니다.

```makefile
# build/ 안에 출력하려면 패턴을 직접 적어야 함
build/%.o: src/%.c
	@mkdir -p build
	gcc -c $< -o $@
```

실무에서 `VPATH`는 *작은 프로젝트*나 *재귀 빌드 보조*에 가끔 등장하고, 큰 프로젝트는 *명시적 경로*를 더 선호합니다. 안전하고 디버깅이 쉽기 때문입니다.

---

## Grouped Target — 한 명령이 여러 파일을 만들 때 (4.3+)

GNU Make 4.3(2020)에 추가된 `&:` 문법입니다.

```makefile
# 다중 출력 패턴 규칙: 이 형태도 그룹으로 취급
%.pb.cc %.pb.h: %.proto
	$(PROTOC) --cpp_out=. $<

# 4.3+: 한 명령이 두 파일을 동시에 만든다고 명시
%.pb.cc %.pb.h &: %.proto
	$(PROTOC) --cpp_out=. $<
```

`&:`로 묶인 출력은 *한 레시피 호출로 함께 만들어진다*는 약속입니다. Make는 둘 중 하나가 필요해도 한 번만 명령을 실행합니다. *코드 생성기*(`protoc`, `yacc`, `bison`, `swig`)를 다룰 때 매우 유용합니다.

4.3 이전에는 &: 구문 자체를 사용할 수 없습니다. 다중 출력 패턴 규칙의 기존 동작과, 파일명이 고정된 명시적 grouped target의 도입을 구분합니다. 이 장은 GNU Make 4.4.1에서 실행했습니다.

---

## 직접 확인 — 독립 출력과 그룹 출력

아래 Makefile은 이름이 고정된 명시적 grouped target입니다. GNU Make 4.4.1에서 한 호출이 두 출력을 함께 만드는 것을 확인했습니다. 파일명과 일치하는 기존 출력이 없는 빈 디렉터리에서 시작합니다.

```makefile title="Makefile"
.DEFAULT_GOAL := all
.PHONY: all
all: left.txt right.txt
left.txt right.txt &: input.txt
	@printf 'RUN\n' >> calls.log
	cp input.txt left.txt
	cp input.txt right.txt
```

패턴 출력도 두 파일을 함께 갱신합니다. 이 파일은 pattern.mk로 저장합니다.

```makefile title="pattern.mk"
%.a %.b: %.in
	@printf 'PATTERN\n' >> pattern.log
	cp $< $*.a
	cp $< $*.b
```

입력은 같은 디렉터리에 저장합니다.

```text title="input.txt"
grouped input
```

다음 명령으로 생성과 재생성을 확인합니다.

```bash
make -j2
cat calls.log
rm right.txt
make -j2
cat calls.log
cp input.txt x.in
make -f pattern.mk x.a x.b
cat pattern.log
```

최초 빌드의 calls.log에는 RUN이 한 줄, right.txt를 지운 뒤 재빌드하면 두 줄입니다. pattern.mk의 일반 콜론 다중 출력 패턴 규칙도 x.a와 x.b를 한 레시피 호출로 만들며 PATTERN은 한 줄입니다. 두 경우 모두 레시피가 선언한 출력을 모두 만들어야 합니다.

## 실전 예시

```makefile
CC := gcc
CFLAGS := -Wall -Wextra -g -std=c11 -O2
CPPFLAGS := -Iinclude

SRCDIR := src
BUILDDIR := build

SRCS := $(wildcard $(SRCDIR)/*.c)
OBJS := $(patsubst $(SRCDIR)/%.c,$(BUILDDIR)/%.o,$(SRCS))

TARGET := $(BUILDDIR)/myapp

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

# 정적 패턴 규칙: $(OBJS)에만 적용
$(OBJS): $(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

$(BUILDDIR):
	mkdir -p $@

clean:
	$(RM) -r $(BUILDDIR)
```

이 Makefile은 다음을 만족합니다.

- `src/*.c` *모든* 파일을 자동 감지(`wildcard`).
- 출력은 `build/`에 격리.
- 정적 패턴으로 *오브젝트만* 이 규칙을 받아 다른 `.o`(예: 외부 라이브러리)와 충돌하지 않음.
- 디렉터리 생성은 order-only로 안전.

`wildcard`, `patsubst`는 [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions)에서 상세히 다룹니다.

---

## 흔한 실수

### 1. `%`가 여러 번 등장

```makefile
%-%.o: %.c    # 안 됨
```

`%`는 한 패턴에 *한 번*만 허용됩니다. 두 번 이상 매칭하려면 정적 패턴이나 함수로 풀어야 합니다.

### 2. stem에 경로가 끼어들음

```makefile
build/%.o: src/%.c
# build/sub/main.o의 stem = "sub/main"
```

이걸 모르고 `$*.c` 같은 식으로 *원본 위치* 가정을 깔면 사고가 납니다. `src/$*.c`는 의도와 같은 경로지만, 다른 자리에서 `$*`을 *파일 이름*처럼 쓰면 문제가 됩니다.

**해결**: 파일 이름이 필요하면 `$(notdir $*)`, 디렉터리는 `$(dir $*)`.

### 3. 레시피 없는 규칙과 명시적 빈 레시피 혼동

```makefile
%.o: %.c
	gcc -c $< -o $@

main.o: main.c header.h   # 레시피 없음
```

위 main.o 규칙은 레시피가 없으므로 의존성을 추가하고 적용 가능한 패턴 규칙의 레시피를 사용합니다. 명시적으로 빈 레시피를 주는 `main.o: main.c header.h ;`와는 다릅니다.

의도가 "패턴 규칙은 그대로 쓰되, 의존성만 추가"라면 *레시피 없이 의존성만* 적습니다.

```makefile
%.o: %.c
	gcc -c $< -o $@

# 의존성만 추가 (콜론 + 의존성, 레시피 없음 = OK)
main.o: header.h
```

이건 묘하게 보이는 GNU Make 관용입니다. 같은 타겟에 의존성을 두 번 적으면 *합쳐진다*는 사실(Ch 2에서 본 "분리 의존성")을 활용합니다.

### 4. 암시적 규칙에 의존하면서 변수를 잊음

```makefile
hello: main.o
# CC, CFLAGS 등 미설정
```

Make는 내장 규칙으로 빌드해 주지만, CC 같은 내장 기본값은 사용되지만 프로젝트에서 요구하는 경고·디버그 플래그가 자동으로 붙는 것은 아닙니다.

**해결**: 최소한 `CC`, `CFLAGS`, `CPPFLAGS`, `LDLIBS`는 설정.

### 5. 4.3 이전에서 grouped target 가정

```makefile
%.pb.cc %.pb.h &: %.proto    # 4.3 이상 필요
```

오래된 시스템에서 안 돌면 `&:` 때문일 수 있습니다. `make --version`을 먼저 확인하세요.

---

## 정리

- **패턴 규칙** `%.o: %.c`은 같은 모양의 변환을 한 줄로 일반화한다. `%`는 한 번만.
- **stem** `$*`은 `%`가 매칭한 *실제 문자열* — 중첩 디렉터리에서는 경로가 포함된다.
- **암시적 규칙**은 Make가 내장한 변환 표. `CC`/`CFLAGS` 같은 표준 변수가 필요.
- **정적 패턴** `$(OBJS): %.o: %.c`은 적용 범위를 명시해 충돌·모호함을 막는다.
- **검색 순서**: 명시적 → 정적 패턴 → 일반 패턴 → 암시적. 더 구체적인 게 이긴다.
- **Grouped target** `&:` (4.3+)은 *한 명령이 여러 출력*을 만드는 경우.
- 큰 프로젝트는 `--no-builtin-rules`로 시작해 *명시적으로* 규칙을 적는 게 안전.

## 다음 장 예고

[Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions)에서는 `wildcard`, `patsubst`, `filter`, `foreach`, `shell` 같은 Make의 내장 함수들을 다룹니다. 텍스트 처리만으로 거대한 Makefile을 *수십 줄로* 줄이는 도구들입니다.

## 참고 자료

- [GNU Make Manual — Pattern Rules](https://www.gnu.org/software/make/manual/html_node/Pattern-Rules.html)
- [GNU Make Manual — Static Pattern Rules](https://www.gnu.org/software/make/manual/html_node/Static-Pattern.html)
- [GNU Make Manual — Implicit Rules](https://www.gnu.org/software/make/manual/html_node/Implicit-Rules.html)
- [GNU Make 4.3 Release Notes](https://lists.gnu.org/archive/html/info-gnu/2020-01/msg00004.html) — grouped target 포함

## 관련 항목

- [Ch 3: 변수](/blog/tools/build/gnu-make/chapter03-variables) — 패턴 규칙 레시피를 떠받치는 `$@`·`$<`와 `CC`/`CFLAGS` 표준 어휘.
- [Ch 5: 함수](/blog/tools/build/gnu-make/chapter05-functions) — 실전 예시의 `wildcard`·`patsubst`로 타겟 목록 자체를 만드는 방법.
- [Ch 2: 규칙](/blog/tools/build/gnu-make/chapter02-rules) — 다중 타겟이 독립 규칙으로 펼쳐지는 이유와 grouped target `&:`의 배경.
- [CMake Ch 3: 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — 파일별 규칙 대신 타겟에 소스를 등록하고 컴파일 규칙은 생성기에 맡기는 방식.
- [Makefile Tutorial by Example](https://makefiletutorial.com/) — 패턴 규칙·자동 변수 예제가 많은 입문서.
