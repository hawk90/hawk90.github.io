---
title: "Ch 12: QEMU 기여하기"
date: 2026-05-17T12:00:00
description: "QEMU 프로젝트에 코드 기여하는 방법 — 코드 스타일, 패치 제출."
tags: [QEMU, Contributing, OpenSource, mailing-list, patch]
series: "QEMU Internals"
seriesOrder: 12
draft: true
---

QEMU는 *mainline upstream에 기여*가 가능한 open-source 프로젝트입니다. mailing list 기반 패치 흐름·코드 스타일·테스트가 *전형적인 GNU 스타일*이라 처음에는 어색할 수 있지만, 어휘만 익히면 *기여자*로 합류할 수 있습니다.

## 개발 워크플로

```text
1. 소스 클론
        │
2. 브랜치 + 변경
        │
3. 로컬 build·test
        │
4. checkpatch.pl로 style 검사
        │
5. format-patch로 patch 생성
        │
6. send-email로 mailing list 제출
        │
7. 리뷰 받기 (수 주~수 개월)
        │
8. v2, v3... iterate
        │
9. maintainer가 *tree에 picked up*
        │
10. master에 merge
```

git 기반이지만 *GitHub PR이 아닌* mailing list. 익숙해지면 *오히려 빠른* 흐름.

## 소스 + 첫 build

```bash
git clone https://gitlab.com/qemu-project/qemu.git
cd qemu

# 기본 빌드 (debug + 자주 쓰는 target)
mkdir build && cd build
../configure --target-list=aarch64-softmmu,x86_64-softmmu \
    --enable-debug --enable-kvm
make -j$(nproc)
```

`--enable-debug`로 *symbol + assertion*. mainline 기여 시 *필수*.

## Coding style

QEMU 자체 style — Linux kernel과 *비슷하지만 다름*.

```c
/* 함수 */
static void my_function(int arg)
{
    if (condition) {
        do_something();
    }
}

/* 구조체 */
typedef struct MyStruct {
    int field;
    char *name;
} MyStruct;

/* 매크로 */
#define MY_CONSTANT 42

/* 함수 prefix */
static void mydev_realize(...);   /* short, lowercase + underscore */
```

| 규칙 | 값 |
|------|-----|
| Indent | 4 spaces (no tab) |
| Line length | 80 chars |
| Brace | `if/while`은 *옆*, function은 *다음 줄* |
| Typedef | CamelCase 구조체에 typedef |
| Function name | snake_case |

## checkpatch.pl

```bash
scripts/checkpatch.pl --no-tree my.patch
```

style 위반 자동 검출. *모든 warning 제거* 후 제출.

## Static analysis

```bash
# cppcheck
make -C build cppcheck

# clang-analyzer
make -C build clang-analyzer
```

CI에서도 돌지만 *제출 전 local에서* 검증 권장.

## 패치 작성

`git commit`을 *작고 자족적*으로.

```text
hw/misc/mydev: add new device for X

Some context paragraph explaining what this device does
and why it's needed.

Signed-off-by: Your Name <you@example.com>
```

| 줄 | 의미 |
|----|------|
| 1번째 | subject — 50자 이내, *prefix: 설명* |
| 2번째 | 빈 줄 |
| 3+ | body — context, motivation |
| 끝 | `Signed-off-by:` (DCO) |

`Signed-off-by`가 *Developer Certificate of Origin* 동의. *반드시*.

## Patch series

여러 commit을 *논리적 시리즈*로.

```bash
git format-patch -3 --cover-letter --thread \
    --subject-prefix="PATCH v2" -o /tmp/patches/

ls /tmp/patches/
# 0000-cover-letter.patch
# 0001-...
# 0002-...
# 0003-...
```

cover letter에 *시리즈 전체 설명*.

## Mailing list 제출

```bash
git send-email \
    --to=qemu-devel@nongnu.org \
    --cc=maintainer@example.com \
    --in-reply-to=<message-id> \
    /tmp/patches/*.patch
```

`qemu-devel@nongnu.org`이 메인 list. *모든 패치가 여기로*. 특정 subsystem은 별도 maintainer cc(`scripts/get_maintainer.pl my.patch`로 추출).

## 리뷰 process

리뷰어가 *inline reply*로 comment.

```text
> +    if (s->ctrl & CTRL_ENABLE) {
> +        do_something();
> +    }

Why is this not done in realize?
```

답변:

```text
On 2024-..., Reviewer wrote:
> Why is this not done in realize?

Because the device's enable state can change at runtime
via the CTRL register write callback.
```

리뷰 cycle을 *수 회* 거친 후 maintainer가 *applied to staging tree*.

## QTest

```bash
# 모든 qtest
make -C build check

# 특정 device
make -C build check-qtest-aarch64
```

`tests/qtest/`의 test가 *QMP를 통해* 실 device를 시험. 새 device 추가 시 *qtest도 추가*하는 게 표준.

## Avocado / functional tests

```bash
make -C build check-avocado
```

VM을 실 OS와 함께 부팅해 *high-level scenarios* 검증. 시간이 오래 걸려 `make check`에 기본 포함 안 됨.

## 모르는 영역 — Maintainers

`MAINTAINERS` 파일이 *area별 담당자* list.

```bash
scripts/get_maintainer.pl my.patch
# John Doe <john@example.com> (maintainer:ARM machines)
# Jane Smith <jane@example.com> (reviewer:GIC)
# qemu-arm@nongnu.org (open list:ARM)
```

해당 area의 maintainer에게 *직접 cc*하면 review 가능성 ↑.

## Subsystem trees

큰 변경은 *subsystem tree*를 거쳐 master로.

| Tree | 영역 |
|------|------|
| `qemu/master` | 최종 |
| `qemu-arm/staging` | ARM |
| `qemu-block/staging` | block |
| `qemu-net/staging` | network |
| `qemu-trivial/staging` | 작은 fix |

각자가 *pull request*를 maintainer에게 보냄. *수동 GitHub PR과 비슷*.

## 좋은 첫 contribution

- typo fix
- 작은 문서 개선
- TODO comment의 small fix
- test 추가

`grep -rn "TODO" hw/`로 *작은 작업* 발굴 가능.

## CI

QEMU는 *GitLab CI*를 사용.

```text
.gitlab-ci.yml에 정의된 pipeline:
- build (다양한 target)
- check (unit + qtest)
- avocado (functional)
- container build
- docs build
```

mailing list 제출 후 maintainer가 *staging에 picked up*하면 CI가 자동 실행.

## License

QEMU 전체는 *GPLv2 (or later)*. 새 file에 license header 필수.

```c
/*
 * QEMU My Device
 *
 * Copyright (c) 2024 Your Name
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
```

## 시리즈 마무리

12장에 걸쳐 QEMU의 *겉면*을 그렸습니다.

| Ch | 주제 |
|----|------|
| 1~2 | 아키텍처 + QOM |
| 3~4 | 메모리 + main loop |
| 5~6 | block + network |
| 7~9 | PCI + IRQ + timer |
| 10~12 | migration + machine + contributing |

13장부터 *심화 영역*으로 — TCG·KVM·coroutine·VirtIO·vhost·microvm·confidential·snapshot.

## 흔한 함정

- **DCO 누락** — `Signed-off-by` 없으면 *reject*.
- **80 char 위반** — checkpatch에서 *warning*. 정리.
- **commit message style** — `subject: explanation`이 표준. typo, no period.
- **너무 큰 patch** — 한 commit이 *1000 라인 이상*이면 review 부담. *작게 나누기*.

## 정리

- QEMU는 *mailing list 기반* open-source. GitHub PR이 아님.
- `git format-patch` + `git send-email`로 제출. `Signed-off-by` 필수.
- `scripts/checkpatch.pl`로 style 검사. *80 char + 4 space indent*.
- `MAINTAINERS` 파일로 area별 담당자. `get_maintainer.pl`로 cc 추출.
- Subsystem tree(qemu-arm, qemu-block 등)를 거쳐 master로.
- `make check`·`check-qtest`·`check-avocado`로 test.
- 처음 기여는 *typo·doc·TODO fix*가 좋은 시작.
- License: GPLv2 (or later), SPDX header.

## 다음 장 예고

다음 장부터 *심화 영역*입니다. 먼저 **TCG**의 깊은 내부 — IR·JIT·optimization.

## 관련 항목

- [Ch 11: 커스텀 머신 타입](/blog/tools/emulation/qemu-internals/chapter11-custom-machine)
- [Ch 13: TCG Deep](/blog/tools/emulation/qemu-internals/chapter13-tcg-deep)
- [QEMU Official Documentation](https://www.qemu.org/docs/master/)
- [QEMU Mailing List](https://lists.gnu.org/mailman/listinfo/qemu-devel)
