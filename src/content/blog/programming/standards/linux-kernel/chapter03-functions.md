---
title: "Ch 3: Functions"
date: 2025-05-14T03:00:00
description: "함수는 짧게, 한 가지만. 지역 변수 10개 이하, 중첩 3단계 이하. goto를 통한 에러 처리."
tags: [Linux, Kernel, Functions, goto, Error-Handling]
series: "Linux Kernel Coding Style"
seriesOrder: 3
draft: false
---

> "Functions should be short and sweet, and do just one thing."

## 함수 길이

### 기본 원칙

- **최대**: 한 화면 (24줄)
- **지역 변수**: 5~10개
- **들여쓰기 깊이**: 3단계 이하

```c
// Good: 짧고 명확
static int validate_input(const char *input)
{
        if (!input)
                return -EINVAL;
        if (strlen(input) > MAX_LEN)
                return -EOVERFLOW;
        return 0;
}

// Bad: 너무 길고 복잡
static int do_everything(...)
{
        // 100줄짜리 함수
        // 20개의 지역 변수
        // 5단계 중첩
        // ...
}
```

### 예외

복잡하지만 **분리하기 어려운** 경우:

- 큰 switch 문 (상태 머신)
- 프로토콜 파서
- 하드웨어 초기화 시퀀스

```c
// 허용: 복잡하지만 본질적으로 하나의 작업
static int parse_packet(struct packet *pkt)
{
        switch (pkt->type) {
        case TYPE_A:
                /* 10줄 */
                break;
        case TYPE_B:
                /* 10줄 */
                break;
        /* ... 많은 case */
        }
        return 0;
}
```

## 단일 책임

```c
// Bad: 두 가지 일을 한다
static int init_and_start_device(struct device *dev)
{
        /* 초기화 로직 */
        /* 시작 로직 */
}

// Good: 분리
static int init_device(struct device *dev)
{
        /* 초기화만 */
}

static int start_device(struct device *dev)
{
        /* 시작만 */
}
```

## 에러 처리: goto 패턴

### 중앙 집중 cleanup

```c
int init_module(void)
{
        int err;

        err = alloc_resource_a();
        if (err)
                return err;

        err = alloc_resource_b();
        if (err)
                goto free_a;

        err = alloc_resource_c();
        if (err)
                goto free_b;

        return 0;

free_b:
        free_resource_b();
free_a:
        free_resource_a();
        return err;
}
```

### 왜 goto인가?

```c
// goto 없이 — 중첩 지옥
int init_without_goto(void)
{
        int err;

        err = alloc_a();
        if (!err) {
                err = alloc_b();
                if (!err) {
                        err = alloc_c();
                        if (!err) {
                                return 0;
                        }
                        free_b();
                }
                free_a();
        }
        return err;
}

// goto 사용 — 평평하고 명확
int init_with_goto(void)
{
        int err;

        err = alloc_a();
        if (err)
                return err;

        err = alloc_b();
        if (err)
                goto free_a;

        err = alloc_c();
        if (err)
                goto free_b;

        return 0;

free_b:
        free_b();
free_a:
        free_a();
        return err;
}
```

### goto 레이블 명명

```c
// Good: 동사 형태 (무엇을 할 것인지)
err_free_buffer:
err_unregister:
err_unlock:

// Good: out_ 접두어
out_free:
out_unlock:
out:

// Bad: 모호한 이름
error:
cleanup:
fail:
```

## Exit 포인트

### Single Exit 선호

```c
// Good: 하나의 return
int function(void)
{
        int ret = 0;

        if (condition1) {
                ret = -EINVAL;
                goto out;
        }

        /* 작업 */

        if (error)
                ret = -EIO;
out:
        return ret;
}
```

### Early Return도 허용

```c
// Good: 유효성 검사 후 early return
int function(int x)
{
        if (x < 0)
                return -EINVAL;
        if (x > MAX)
                return -ERANGE;

        /* 본 작업 */
        return 0;
}
```

## 함수 프로토타입

### 파라미터 정렬

```c
// Good: 긴 파라미터 목록은 정렬
static int process_data(struct device *dev,
                        const char *buffer,
                        size_t len,
                        unsigned int flags);

// Good: 또는 한 줄에
static int simple_func(int a, int b);
```

### static 함수

파일 내부 함수는 `static`:

```c
// Good: 외부 노출 불필요하면 static
static int helper_function(void)
{
        /* ... */
}

// 외부 노출 필요한 함수만 non-static
int exported_function(void)
{
        return helper_function();
}
```

## 인라인 함수 vs 매크로

### 인라인 선호

```c
// Good: 타입 안전한 인라인
static inline int max(int a, int b)
{
        return a > b ? a : b;
}

// Bad: 매크로의 부작용
#define MAX(a, b) ((a) > (b) ? (a) : (b))
// MAX(i++, j++) — i나 j가 두 번 증가할 수 있다
```

### 인라인 사용 기준

```c
// 인라인 적합: 작은 래퍼
static inline void set_bit(int nr, unsigned long *addr)
{
        *addr |= (1UL << nr);
}

// 인라인 부적합: 큰 함수
// 코드 크기가 늘어남
static inline void big_function(void) { /* 50줄 */ }
```

## 반환값

### 에러 코드

```c
// Good: 음수 에러 코드
int function(void)
{
        if (error_condition)
                return -EINVAL;
        return 0;  // 성공
}

// Bad: 0이 에러
int bad_function(void)
{
        if (error_condition)
                return 0;  // 혼란스러움
        return 1;
}
```

### 포인터 반환

```c
// Good: 에러 시 NULL 또는 ERR_PTR
void *alloc_something(void)
{
        void *p = kmalloc(size, GFP_KERNEL);
        if (!p)
                return NULL;
        return p;
}

// ERR_PTR 패턴
struct device *create_device(void)
{
        struct device *dev;
        int err;

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
struct device *dev = create_device();
if (IS_ERR(dev))
        return PTR_ERR(dev);
```

## 정리

| 항목 | 규칙 |
|------|------|
| 길이 | 24줄 (한 화면) |
| 지역 변수 | 5~10개 |
| 중첩 | 3단계 이하 |
| 에러 처리 | goto cleanup 패턴 |
| 반환 | 음수 에러, 0 성공 |
| 포인터 | NULL 또는 ERR_PTR |

---

다음 장에서는 **Comments**를 다룬다. What보다 Why를 설명하고, 커널 Doc 형식을 살펴본다.
