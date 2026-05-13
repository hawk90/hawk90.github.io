---
title: "Ch 2: Naming & Typedefs"
date: 2025-05-14T02:00:00
description: "snake_case 명명, 전역은 서술적으로, 지역은 짧게. typedef는 숨기지 말고 드러내라."
tags: [Linux, Kernel, Naming, typedef]
series: "Linux Kernel Coding Style"
seriesOrder: 2
draft: false
---

> "C is a Spartan language, and your naming conventions should follow suit."

## 명명 규칙: snake_case

### 기본 원칙

```c
// Good: 소문자와 밑줄
int count;
void process_request(void);
struct file_operations;

// Bad: CamelCase, Hungarian notation
int nCount;          // Hungarian
void ProcessRequest();  // CamelCase
struct FileOperations;  // PascalCase
```

### 전역 vs 지역

**전역** — 서술적으로:

```c
// Good: 전역은 명확하게
int total_allocation_count;
void flush_scheduled_work(void);
struct kmem_cache *file_cache;

// Bad: 전역인데 너무 짧음
int cnt;
void flush(void);
```

**지역** — 짧게:

```c
// Good: 지역은 간결하게
int i, j, k;          // 루프 변수
char *p, *q;          // 포인터
int tmp, ret;         // 임시, 반환값

void function(void)
{
        int i;
        char *p;
        int ret;

        for (i = 0; i < n; i++)
                process(i);

        ret = do_something();
        return ret;
}

// Bad: 지역인데 너무 김
int loop_counter_for_iterating_array;
```

### 함수 명명

동사 + 목적어 형태:

```c
// Good
int alloc_buffer(size_t size);
void free_buffer(void *buf);
int register_device(struct device *dev);
void unregister_device(struct device *dev);

// 서브시스템 접두어
int netdev_register(struct net_device *dev);
void pci_free_irq(struct pci_dev *dev, int irq);
```

## Typedef: 절제하라

### 왜 typedef를 피하는가?

```c
// Bad: 타입을 숨긴다
typedef struct {
        int x;
        int y;
} point;

point p;  // 이게 struct인지 알 수 없다

// Good: 타입을 드러낸다
struct point {
        int x;
        int y;
};

struct point p;  // 명확하게 struct임을 알 수 있다
```

### typedef가 허용되는 경우

#### 1. 불투명(Opaque) 타입

```c
// 내부 구조를 숨겨야 할 때
typedef struct __opaque_handle *handle_t;

// 사용자는 내부를 알 필요 없음
handle_t h = create_handle();
use_handle(h);
destroy_handle(h);
```

#### 2. 명확한 정수 타입

```c
// 특정 비트 수가 보장되어야 할 때
typedef __u8  u8;
typedef __u16 u16;
typedef __u32 u32;
typedef __u64 u64;

// 사용
u32 register_value;
u8 byte_array[16];
```

#### 3. 타입 안전 추상화

```c
// 같은 기본 타입이지만 의미가 다를 때
typedef u32 phys_addr_t;
typedef u32 dma_addr_t;

// 컴파일러가 혼용을 잡아주진 않지만
// 코드 리뷰에서 의도를 알 수 있다
```

#### 4. sparse 검사용

```c
// __bitwise로 타입 검사 강화
typedef u32 __bitwise le32;
typedef u32 __bitwise be32;

// sparse가 잘못된 endian 혼용을 검출
le32 little = cpu_to_le32(value);
be32 big = cpu_to_be32(value);  // 혼용하면 경고
```

### typedef 금지 사례

#### 구조체 숨기기

```c
// Bad
typedef struct foo {
        int x;
} foo_t;

foo_t f;

// Good
struct foo {
        int x;
};

struct foo f;
```

#### 포인터 숨기기

```c
// Bad: 포인터임을 숨긴다
typedef struct node *node_ptr;
node_ptr list;  // 포인터인지 알 수 없다

// Good
struct node *list;  // 명확하게 포인터
```

## 매크로 상수

```c
// Good: 대문자와 밑줄
#define MAX_BUFFER_SIZE 4096
#define DEFAULT_TIMEOUT_MS 1000
#define DEVICE_NAME "mydevice"

// 열거형이 더 나을 수 있다
enum {
        MAX_RETRIES = 3,
        MIN_BUFFER = 64,
        MAX_BUFFER = 4096,
};
```

## 구조체 태그

```c
// 태그 이름 = 타입 이름
struct file {
        /* ... */
};

struct inode {
        /* ... */
};

// 사용
struct file *f;
struct inode *i;
```

## 열거형

```c
// Good
enum state {
        STATE_IDLE,
        STATE_RUNNING,
        STATE_STOPPED,
};

// 타입으로 사용
enum state current_state;

// Bad: typedef로 숨기기
typedef enum {
        IDLE,
        RUNNING,
} state_t;
```

## 정리

| 항목 | 규칙 |
|------|------|
| 명명 | snake_case |
| 전역 | 서술적으로 |
| 지역 | 짧게 (i, p, tmp) |
| typedef | 대부분 피한다 |
| 허용 | opaque, u8/u32, __bitwise |
| 금지 | struct 숨기기, 포인터 숨기기 |

---

다음 장에서는 **Functions**를 다룬다. 짧은 함수, 단일 책임, exit 포인트 관리를 살펴본다.
