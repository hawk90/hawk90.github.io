---
title: "Ch 4: Comments"
date: 2026-05-18T04:00:00
description: "What보다 Why. 코드로 설명하고, 주석은 이유를 설명. kernel-doc 형식."
tags: [Linux, Kernel, Comments, Documentation]
series: "Linux Kernel Coding Style"
seriesOrder: 4
draft: true
---

> "Comments are good, but there is also a danger of over-commenting."

## 기본 원칙

### What vs Why

```c
// Bad: What (코드가 이미 말한다)
i++;  /* increment i */
if (x > 0)  /* if x is greater than zero */

// Good: Why (코드가 말하지 못하는 것)
i++;  /* retry counter for flaky hardware */
if (x > 0)  /* negative values indicate error */
```

### 코드로 설명하라

```c
// Bad: 주석으로 설명
/* Check if the user is an admin and has write permission */
if (user->flags & 0x03)

// Good: 코드가 스스로 설명
if (user_is_admin(user) && user_can_write(user))
```

## 주석 스타일

### C 스타일 사용

```c
// Good: C 스타일 (커널 표준)
/* Single line comment */

/*
 * Multi-line comment
 * with asterisks aligned
 */

// Acceptable: C99 스타일 (일부 서브시스템)
// But C style is preferred
```

### 블록 주석 형식

```c
/*
 * This is a properly formatted
 * multi-line comment block.
 * Each line starts with a space
 * after the asterisk.
 */

/*
 * Function: do_something
 *
 * This function does something important.
 * It should be called with lock held.
 */
```

## kernel-doc 형식

함수, 구조체, 열거형에 대한 문서화:

### 함수 문서화

```c
/**
 * kmalloc - allocate kernel memory
 * @size: how many bytes of memory are required
 * @flags: the type of memory to allocate
 *
 * Allocate @size bytes of memory. The @flags argument may be one of
 * the GFP flags defined in <linux/gfp.h>.
 *
 * Context: Can sleep if @flags permits. Caller must not hold spinlock.
 *
 * Return: pointer to allocated memory on success, NULL on failure.
 */
void *kmalloc(size_t size, gfp_t flags);
```

### 구조체 문서화

```c
/**
 * struct file - represents an open file
 * @f_path: the dentry and vfsmount of the file
 * @f_inode: cached inode pointer
 * @f_op: file operations table
 * @f_lock: spinlock for f_ep and f_flags
 * @f_count: reference count
 * @f_flags: file flags (O_RDONLY, etc.)
 * @f_mode: file mode (FMODE_READ, etc.)
 * @f_pos: current file position
 *
 * This structure represents an open file descriptor.
 * It is created by open() and destroyed by close().
 */
struct file {
        struct path             f_path;
        struct inode            *f_inode;
        const struct file_operations *f_op;
        spinlock_t              f_lock;
        atomic_long_t           f_count;
        unsigned int            f_flags;
        fmode_t                 f_mode;
        loff_t                  f_pos;
};
```

### 열거형 문서화

```c
/**
 * enum device_state - device state machine states
 * @DEV_UNINITIALIZED: device not yet initialized
 * @DEV_RUNNING: device is operational
 * @DEV_SUSPENDED: device is suspended
 * @DEV_ERROR: device encountered an error
 *
 * States used by the device state machine.
 */
enum device_state {
        DEV_UNINITIALIZED,
        DEV_RUNNING,
        DEV_SUSPENDED,
        DEV_ERROR,
};
```

## 특수 주석

### TODO

```c
/* TODO: implement retry logic */
/* FIXME: this is a temporary workaround */

// 형식: TODO(author): description
/* TODO(torvalds): review locking strategy */
```

### WARNING

```c
/*
 * WARNING: this function is called with interrupts disabled.
 * Do not add any sleeping operations here.
 */
```

### 락 관련

```c
/*
 * Called with rcu_read_lock() held.
 * Returns with lock still held.
 */

/* Must be called with dev->lock held */
/* Caller must hold file->f_lock */
```

## 하지 말 것

### 명백한 주석

```c
// Bad
int count = 0;  /* set count to zero */
return ret;  /* return the result */

// Good: 주석 없이
int count = 0;
return ret;
```

### 주석 처리된 코드

```c
// Bad: 죽은 코드
// old_function();
// if (obsolete_condition) {
//     do_old_thing();
// }

// Good: 지우거나, git history 언급
/* Removed: see commit abc123 */
```

### 과도한 장식

```c
// Bad
/**************************************
 *       VERY IMPORTANT SECTION       *
 **************************************/

// Good: 단순하게
/*
 * Important section
 */
```

## 파일 헤더

```c
// SPDX-License-Identifier: GPL-2.0-only
/*
 * Device driver for XYZ hardware
 *
 * Copyright (C) 2024 Author Name <author@example.com>
 *
 * This driver provides support for XYZ family of devices.
 */

#include <linux/module.h>
```

### SPDX 식별자

```c
// SPDX-License-Identifier: GPL-2.0-only
// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-License-Identifier: MIT
// SPDX-License-Identifier: BSD-3-Clause
```

## 조건부 컴파일 주석

```c
// Good: 끝에 조건 명시
#ifdef CONFIG_SMP
/* SMP-specific code */
#endif /* CONFIG_SMP */

#ifndef MODULE
/* Built-in only code */
#endif /* !MODULE */

// 긴 블록에서 특히 유용
#ifdef CONFIG_DEBUG
/* ... 50줄 ... */
#endif /* CONFIG_DEBUG */
```

## 정리

| 항목 | 규칙 |
|------|------|
| 내용 | Why, not What |
| 스타일 | C 스타일 /* */ |
| API 문서 | kernel-doc 형식 |
| 락 | 호출 조건 명시 |
| 라이선스 | SPDX 식별자 |
| 금지 | 명백한 주석, 죽은 코드 |

---

다음 장에서는 **Macros & Inline**을 다룬다. 매크로 규칙, 부작용 방지, 인라인 사용 기준을 살펴본다.
