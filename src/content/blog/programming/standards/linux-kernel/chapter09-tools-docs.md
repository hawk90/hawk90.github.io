---
title: "Ch 9: Tools & Documentation"
date: 2025-05-14T09:00:00
description: "checkpatch.pl로 스타일 검사, sparse로 정적 분석, kernel-doc으로 문서화."
tags: [Linux, Kernel, checkpatch, sparse, kernel-doc, Documentation]
series: "Linux Kernel Coding Style"
seriesOrder: 9
draft: false
---

> "Use the tools. That's what they're for."

## checkpatch.pl

### 기본 사용법

```bash
# 패치 파일 검사
./scripts/checkpatch.pl my_patch.patch

# Git 커밋 검사
./scripts/checkpatch.pl -g HEAD
./scripts/checkpatch.pl -g HEAD~5..HEAD

# 파일 직접 검사
./scripts/checkpatch.pl --file drivers/my_driver.c
```

### 일반적인 경고

```shell
WARNING: line length of 85 exceeds 80 columns
WARNING: Prefer using '"%s...", __func__' to using 'function_name'
WARNING: Missing a blank line after declarations
WARNING: space prohibited before semicolon
ERROR: code indent should use tabs where possible
ERROR: trailing whitespace
```

### 옵션

```bash
# 에러만 표시
./scripts/checkpatch.pl --no-signoff my_patch.patch

# 특정 검사 무시
./scripts/checkpatch.pl --ignore=LINE_LENGTH my_patch.patch

# 타입 추론 강화
./scripts/checkpatch.pl --strict my_patch.patch

# 커밋 메시지 검사 포함
./scripts/checkpatch.pl --git HEAD --show-types
```

### .checkpatch.conf

```conf
# .checkpatch.conf (프로젝트 루트)

# 기본 무시 항목
--ignore=PREFER_KERNEL_TYPES
--ignore=SPLIT_STRING

# 최대 줄 길이
--max-line-length=100

# 엄격 모드
--strict
```

## sparse

### 정적 분석 도구

```bash
# sparse 설치
# Debian/Ubuntu
sudo apt install sparse

# Fedora
sudo dnf install sparse

# 빌드 시 사용
make C=1  # 수정된 파일만
make C=2  # 모든 파일
```

### sparse 어노테이션

```c
// __user: 사용자 공간 포인터
int read_from_user(__user void *buf, size_t len);

// __kernel: 커널 공간 포인터
void *__kernel ptr;

// __iomem: I/O 메모리 포인터
void __iomem *reg;

// __percpu: Per-CPU 변수
DEFINE_PER_CPU(int, my_var);

// __rcu: RCU 보호 포인터
struct my_struct __rcu *ptr;

// __bitwise: 엔디안 타입
typedef __u32 __bitwise le32;
typedef __u32 __bitwise be32;
```

### 락 어노테이션

```c
// __acquires: 락 획득
void lock_something(void) __acquires(my_lock);

// __releases: 락 해제
void unlock_something(void) __releases(my_lock);

// __must_hold: 락 필요
void do_work(void) __must_hold(my_lock);

// 예제
static DEFINE_SPINLOCK(my_lock);

static void my_function(void) __acquires(my_lock)
{
        spin_lock(&my_lock);
        /* ... */
}
```

### sparse 경고

```shell
warning: incorrect type in argument 1 (different address spaces)
   expected void *ptr
   got void [noderef] __user *user_ptr

warning: context imbalance: wrong count at exit
```

## kernel-doc

### 함수 문서화

```c
/**
 * my_function - brief description
 * @param1: first parameter description
 * @param2: second parameter description
 *
 * Longer description of what the function does.
 * Can span multiple paragraphs.
 *
 * Context: Process context. Takes and releases my_lock.
 *
 * Return: 0 on success, negative error code on failure.
 */
int my_function(int param1, const char *param2)
{
        /* ... */
}
```

### 구조체 문서화

```c
/**
 * struct my_device - device structure
 * @name: device name
 * @id: unique device identifier
 * @list: list of all devices
 * @lock: protects @data
 * @data: device-specific data
 *
 * This structure represents a device in the system.
 * Allocate with my_device_create() and free with my_device_destroy().
 */
struct my_device {
        const char *name;
        int id;
        struct list_head list;
        spinlock_t lock;
        void *data;
};
```

### 열거형 문서화

```c
/**
 * enum device_state - device state machine states
 * @DEV_IDLE: device is idle
 * @DEV_ACTIVE: device is processing
 * @DEV_ERROR: device encountered an error
 *
 * States for the device state machine.
 */
enum device_state {
        DEV_IDLE,
        DEV_ACTIVE,
        DEV_ERROR,
};
```

### 문서 생성

```bash
# HTML 문서 생성
make htmldocs

# PDF 문서 생성
make pdfdocs

# 특정 서브시스템만
make SPHINXDIRS="driver-api" htmldocs

# 출력 위치
ls Documentation/output/
```

## coccinelle

### 시맨틱 패치

```cocci
// 예: NULL 검사 후 kfree 제거
@@
expression E;
@@
- if (E != NULL)
      kfree(E);
+ kfree(E);
```

### 사용법

```bash
# 시맨틱 패치 적용
spatch --sp-file scripts/coccinelle/free/kfree.cocci drivers/

# 변경 사항 적용
spatch --sp-file my_patch.cocci --in-place drivers/my_driver.c

# 커널 빌드 시스템
make coccicheck MODE=report
make coccicheck MODE=patch
```

## 기타 도구

### smatch

```bash
# 정적 분석 (sparse 확장)
make CHECK="smatch -p=kernel" C=1
```

### cppcheck

```bash
# C/C++ 정적 분석
cppcheck --enable=all drivers/my_driver/
```

### clang-format

```bash
# .clang-format 생성 (커널 스타일)
# 커널에는 scripts/clang-format이 있지만
# 완전히 호환되지는 않음

clang-format -style=file -i drivers/my_driver.c
```

## 빌드 경고

### 경고 없는 빌드

```bash
# 모든 경고 활성화
make W=1

# 추가 경고
make W=2
make W=3

# 경고를 에러로
make KCFLAGS="-Werror"
```

### 일반적인 경고

```shell
warning: unused variable 'x'
warning: 'return' with a value, in function returning void
warning: implicit declaration of function 'foo'
warning: comparison between signed and unsigned
warning: format '%d' expects 'int' but argument has type 'long'
```

## Git 훅

### pre-commit 훅

```bash
#!/bin/bash
# .git/hooks/pre-commit

# checkpatch 실행
exec git diff --cached | ./scripts/checkpatch.pl --no-signoff -
```

### commit-msg 훅

```bash
#!/bin/bash
# .git/hooks/commit-msg

# 커밋 메시지 길이 검사
if head -1 "$1" | grep -qE '.{75,}'; then
    echo "Error: First line exceeds 74 characters"
    exit 1
fi
```

## 문서 표준

### ReStructuredText

```rst
My Subsystem
============

This is the documentation for my subsystem.

.. kernel-doc:: drivers/my_driver.c
   :functions: my_function my_other_function

.. kernel-doc:: include/linux/my_header.h
   :internal:

See Also
--------

- :doc:`/process/coding-style`
- :ref:`Documentation/driver-api/index`
```

### 문서 위치

```shell
Documentation/
├── admin-guide/         # 시스템 관리자용
├── driver-api/          # 드라이버 API
├── core-api/            # 코어 커널 API
├── process/             # 개발 프로세스
│   └── coding-style.rst # 코딩 스타일
└── translations/        # 번역
```

## 정리

| 도구 | 용도 | 명령 |
|------|------|------|
| checkpatch | 스타일 검사 | `./scripts/checkpatch.pl` |
| sparse | 정적 분석 | `make C=1` |
| kernel-doc | API 문서화 | `make htmldocs` |
| coccinelle | 시맨틱 패치 | `make coccicheck` |
| smatch | 고급 분석 | `make CHECK=smatch C=1` |

## 체크리스트

패치 제출 전:

- [ ] `checkpatch.pl` 통과
- [ ] `make C=1` (sparse) 경고 없음
- [ ] `make W=1` 경고 없음
- [ ] kernel-doc 형식 준수
- [ ] 커밋 메시지 형식 준수
- [ ] Signed-off-by 포함

---

이것으로 **Linux Kernel Coding Style** 시리즈를 마친다. 30년 이상 검증된 이 규칙들은 시스템 프로그래밍의 모범 사례를 담고 있다.
