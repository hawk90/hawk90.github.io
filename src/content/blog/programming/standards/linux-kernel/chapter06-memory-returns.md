---
title: "Ch 6: Memory & Returns"
date: 2025-05-14T06:00:00
description: "kmalloc/kfree, GFP 플래그, 에러 코드 규칙. NULL vs ERR_PTR, IS_ERR 패턴."
tags: [Linux, Kernel, Memory, kmalloc, Error-Handling, ERR_PTR]
series: "Linux Kernel Coding Style"
seriesOrder: 6
draft: false
---

> "Kernel memory allocation is different from userspace."

## 메모리 할당

### kmalloc / kfree

```c
#include <linux/slab.h>

// 기본 할당
void *ptr = kmalloc(size, GFP_KERNEL);
if (!ptr)
        return -ENOMEM;

// 해제
kfree(ptr);
ptr = NULL;  // double-free 방지
```

### GFP 플래그

```c
// GFP_KERNEL: 일반적인 경우 (슬립 가능)
ptr = kmalloc(size, GFP_KERNEL);

// GFP_ATOMIC: 인터럽트 컨텍스트, 락 홀딩 시 (슬립 불가)
ptr = kmalloc(size, GFP_ATOMIC);

// GFP_NOWAIT: 슬립하지 않지만 더 공격적
ptr = kmalloc(size, GFP_NOWAIT);

// __GFP_ZERO: 0으로 초기화
ptr = kmalloc(size, GFP_KERNEL | __GFP_ZERO);
```

### 특수 할당 함수

```c
// kzalloc: 0으로 초기화된 메모리
ptr = kzalloc(size, GFP_KERNEL);

// kcalloc: 배열 (오버플로우 체크)
arr = kcalloc(count, sizeof(*arr), GFP_KERNEL);

// krealloc: 크기 변경
new_ptr = krealloc(old_ptr, new_size, GFP_KERNEL);

// kstrdup: 문자열 복제
copy = kstrdup(original, GFP_KERNEL);

// kmemdup: 메모리 복제
copy = kmemdup(original, size, GFP_KERNEL);
```

### sizeof 사용법

```c
// Good: 변수 기반 sizeof
struct my_struct *p;
p = kmalloc(sizeof(*p), GFP_KERNEL);

// Bad: 타입 기반 sizeof
p = kmalloc(sizeof(struct my_struct), GFP_KERNEL);
// 타입이 바뀌면 sizeof도 바꿔야 한다
```

## 에러 코드

### 반환값 규칙

```c
// 함수 성공: 0 반환
// 함수 실패: 음수 에러 코드 반환

int init_device(struct device *dev)
{
        int err;

        err = alloc_resources(dev);
        if (err)
                return err;  // 음수 에러 코드

        return 0;  // 성공
}
```

### 표준 에러 코드

```c
#include <linux/errno.h>

// 메모리
-ENOMEM     // Out of memory

// 잘못된 인자
-EINVAL     // Invalid argument
-ERANGE     // Out of range

// 권한
-EPERM      // Operation not permitted
-EACCES     // Permission denied

// 존재
-ENOENT     // No such file or directory
-EEXIST     // File exists
-ENODEV     // No such device

// 상태
-EBUSY      // Device or resource busy
-EAGAIN     // Try again

// I/O
-EIO        // I/O error
-ETIMEDOUT  // Connection timed out
```

### 에러 전파

```c
// Good: 에러를 그대로 전파
int parent_function(void)
{
        int ret;

        ret = child_function();
        if (ret)
                return ret;  // 에러 전파

        return 0;
}

// Bad: 에러 무시
int bad_function(void)
{
        child_function();  // 반환값 무시
        return 0;
}
```

## 포인터 반환

### NULL vs ERR_PTR

```c
// NULL: 단순 실패 (에러 코드 없음)
void *simple_alloc(void)
{
        void *p = kmalloc(size, GFP_KERNEL);
        if (!p)
                return NULL;
        return p;
}

// ERR_PTR: 에러 코드 포함
void *detailed_alloc(void)
{
        void *p;
        int err;

        err = validate_params();
        if (err)
                return ERR_PTR(err);  // 예: ERR_PTR(-EINVAL)

        p = kmalloc(size, GFP_KERNEL);
        if (!p)
                return ERR_PTR(-ENOMEM);

        return p;
}
```

### IS_ERR / PTR_ERR

```c
#include <linux/err.h>

// 포인터 검사
void *p = create_something();

if (IS_ERR(p)) {
        int err = PTR_ERR(p);
        pr_err("Failed: %d\n", err);
        return err;
}

// NULL과 ERR_PTR 모두 검사
if (IS_ERR_OR_NULL(p)) {
        return p ? PTR_ERR(p) : -ENOMEM;
}
```

### ERR_PTR 패턴 예제

```c
struct device *create_device(int id)
{
        struct device *dev;
        int err;

        if (id < 0)
                return ERR_PTR(-EINVAL);

        dev = kzalloc(sizeof(*dev), GFP_KERNEL);
        if (!dev)
                return ERR_PTR(-ENOMEM);

        err = init_device(dev);
        if (err) {
                kfree(dev);
                return ERR_PTR(err);
        }

        return dev;
}

// 호출 측
struct device *dev = create_device(42);
if (IS_ERR(dev)) {
        pr_err("create_device failed: %ld\n", PTR_ERR(dev));
        return PTR_ERR(dev);
}
```

## 정리 패턴

### goto cleanup

```c
int init_module(void)
{
        int err;
        struct resource *a = NULL, *b = NULL, *c = NULL;

        a = alloc_resource_a();
        if (!a) {
                err = -ENOMEM;
                goto out;
        }

        b = alloc_resource_b();
        if (!b) {
                err = -ENOMEM;
                goto free_a;
        }

        c = alloc_resource_c();
        if (!c) {
                err = -ENOMEM;
                goto free_b;
        }

        return 0;

free_b:
        free_resource_b(b);
free_a:
        free_resource_a(a);
out:
        return err;
}
```

### 역순 정리

```c
void cleanup_module(void)
{
        // 할당의 역순으로 해제
        free_resource_c(c);
        free_resource_b(b);
        free_resource_a(a);
}
```

## 참조 카운팅

### kref

```c
#include <linux/kref.h>

struct my_object {
        struct kref refcount;
        /* 다른 멤버들 */
};

// 초기화
void my_object_init(struct my_object *obj)
{
        kref_init(&obj->refcount);
}

// 참조 획득
void my_object_get(struct my_object *obj)
{
        kref_get(&obj->refcount);
}

// 참조 해제
static void my_object_release(struct kref *kref)
{
        struct my_object *obj = container_of(kref, struct my_object, refcount);
        kfree(obj);
}

void my_object_put(struct my_object *obj)
{
        kref_put(&obj->refcount, my_object_release);
}
```

## vmalloc vs kmalloc

### 선택 기준

```c
// kmalloc: 물리적으로 연속, 작은 할당 (<PAGE_SIZE)
// - 빠름
// - 물리 연속 필요 시
void *p = kmalloc(1024, GFP_KERNEL);

// vmalloc: 가상적으로만 연속, 큰 할당
// - 느림
// - 물리 연속 불필요 시
void *p = vmalloc(1024 * 1024);  // 1MB
vfree(p);

// kvmalloc: 자동 선택
// - 작으면 kmalloc, 크면 vmalloc
void *p = kvmalloc(size, GFP_KERNEL);
kvfree(p);
```

## 안전한 메모리 접근

### 사용자 공간 복사

```c
#include <linux/uaccess.h>

// 사용자 → 커널
if (copy_from_user(kernel_buf, user_buf, len))
        return -EFAULT;

// 커널 → 사용자
if (copy_to_user(user_buf, kernel_buf, len))
        return -EFAULT;

// 단일 값
int val;
if (get_user(val, user_ptr))
        return -EFAULT;

if (put_user(val, user_ptr))
        return -EFAULT;
```

## 정리

| 항목 | 규칙 |
|------|------|
| 할당 | kmalloc + GFP 플래그 |
| sizeof | 변수 기반 sizeof(*p) |
| 성공 | return 0 |
| 실패 | return -ERRNO |
| 포인터 성공 | return ptr |
| 포인터 실패 | return ERR_PTR(-ERRNO) |
| 검사 | IS_ERR(), PTR_ERR() |
| 정리 | goto cleanup 패턴 |

---

다음 장에서는 **Data Structures**를 다룬다. 링크드 리스트, 해시 테이블, 레퍼런스 카운팅을 살펴본다.
