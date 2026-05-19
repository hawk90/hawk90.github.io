---
title: "Ch 5: Macros & Inline"
date: 2026-05-18T05:00:00
description: "매크로는 대문자, 부작용 주의. 인라인은 작은 함수만. 복잡한 매크로는 do { } while (0)로 감싼다."
tags: [Linux, Kernel, Macros, Inline, Preprocessor]
series: "Linux Kernel Coding Style"
seriesOrder: 5
draft: false
---

> "Macros resembling functions may be named in lower case."

## 매크로 명명

### 상수 매크로

```c
// Good: 대문자와 밑줄
#define MAX_BUFFER_SIZE 4096
#define DEFAULT_TIMEOUT_MS 1000
#define BITS_PER_LONG 64

// Bad: 소문자
#define max_buffer_size 4096
#define defaultTimeout 1000
```

### 함수형 매크로

```c
// 간단한 것: 대문자
#define ABS(x) ((x) < 0 ? -(x) : (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))

// 함수처럼 보이는 것: 소문자도 허용
#define container_of(ptr, type, member) \
        ((type *)((char *)(ptr) - offsetof(type, member)))
```

## 매크로 부작용

### 인자 다중 평가 문제

```c
// Bad: 인자가 두 번 평가된다
#define SQUARE(x) ((x) * (x))

int a = 5;
int b = SQUARE(a++);  // a가 두 번 증가한다!
// 결과: b = 5 * 6 = 30, a = 7 (예상: b = 25, a = 6)

// Good: 인라인 함수 사용
static inline int square(int x)
{
        return x * x;
}
```

### 안전한 max/min

```c
// 커널의 안전한 max/min
#define min(x, y) ({                    \
        typeof(x) _min1 = (x);          \
        typeof(y) _min2 = (y);          \
        (void) (&_min1 == &_min2);      \
        _min1 < _min2 ? _min1 : _min2;  \
})

// 타입 체크 포함
// &_min1 == &_min2는 타입이 다르면 경고 발생
```

## 복잡한 매크로

### do { } while (0) 패턴

```c
// Bad: 중괄호만 사용
#define FOO(x) { bar(x); baz(x); }

if (condition)
        FOO(value);  // 세미콜론이 else를 방해
else
        other();

// Good: do-while(0)로 감싸기
#define FOO(x) do {     \
        bar(x);         \
        baz(x);         \
} while (0)

if (condition)
        FOO(value);  // 정상 동작
else
        other();
```

### 여러 줄 매크로

```c
// Good: 백슬래시 정렬
#define COMPLEX_MACRO(arg)      \
do {                            \
        step_one(arg);          \
        step_two(arg);          \
        step_three(arg);        \
} while (0)

// Bad: 정렬 안 됨
#define COMPLEX_MACRO(arg) \
do { \
step_one(arg); \
step_two(arg); \
} while (0)
```

## 인라인 함수

### 인라인 vs 매크로

```c
// 매크로의 문제점
#define MAX(a, b) ((a) > (b) ? (a) : (b))
// - 타입 안전성 없음
// - 인자 다중 평가
// - 디버깅 어려움

// 인라인 함수의 장점
static inline int max(int a, int b)
{
        return a > b ? a : b;
}
// - 타입 체크
// - 인자 한 번 평가
// - 디버깅 가능
// - 컴파일러 최적화
```

### 인라인 사용 기준

```c
// Good: 작은 함수 (1~3줄)
static inline void set_bit(int nr, unsigned long *addr)
{
        *addr |= (1UL << nr);
}

static inline bool test_bit(int nr, unsigned long *addr)
{
        return (*addr & (1UL << nr)) != 0;
}

// Bad: 큰 함수를 인라인으로
static inline int big_function(void)
{
        /* 20줄의 복잡한 로직 */
        /* 코드 크기가 커진다 */
}
```

### 인라인 사용 권장

```c
// 인라인 적합:
// 1. 래퍼 함수
static inline int clamp(int val, int min, int max)
{
        return val < min ? min : (val > max ? max : val);
}

// 2. 접근자 함수
static inline struct list_head *list_first(struct list_head *head)
{
        return head->next;
}

// 3. 비트 연산
static inline unsigned long clear_bit(int nr, unsigned long val)
{
        return val & ~(1UL << nr);
}
```

### 인라인 피해야 할 때

```c
// 인라인 부적합:
// 1. 긴 함수 — 코드 팽창
// 2. 루프가 있는 함수
// 3. 재귀 함수
// 4. 주소가 필요한 함수

// 예: 이것은 인라인하지 않는다
static int process_buffer(char *buf, size_t len)
{
        int i;

        for (i = 0; i < len; i++) {
                if (buf[i] == '\0')
                        break;
                buf[i] = toupper(buf[i]);
        }
        return i;
}
```

## 조건부 컴파일

### 매크로를 이용한 조건부 컴파일

```c
// Good: 명확한 조건
#ifdef CONFIG_SMP
static DEFINE_PER_CPU(int, counter);
#else
static int counter;
#endif

// Good: 함수로 추상화
#ifdef CONFIG_SMP
static inline void inc_counter(void)
{
        this_cpu_inc(counter);
}
#else
static inline void inc_counter(void)
{
        counter++;
}
#endif
```

### IS_ENABLED 패턴

```c
// Good: IS_ENABLED로 코드 유지
if (IS_ENABLED(CONFIG_DEBUG)) {
        pr_debug("Debug message\n");
}

// 컴파일러가 죽은 코드 제거
// #ifdef보다 타입 체크 가능
```

## 문자열화 연산자

### # 연산자

```c
// 인자를 문자열로 변환
#define STRINGIFY(x) #x
#define XSTRINGIFY(x) STRINGIFY(x)

#define VERSION 123
const char *ver = XSTRINGIFY(VERSION);  // "123"

// 디버깅용
#define DEBUG_VAR(var) \
        pr_debug(#var " = %d\n", var)

DEBUG_VAR(count);  // "count = 42"
```

### ## 연산자

```c
// 토큰 결합
#define CONCAT(a, b) a ## b

int CONCAT(my, _variable) = 42;  // int my_variable = 42;

// 함수 생성
#define DECLARE_HANDLER(name) \
        static int handle_ ## name(void)

DECLARE_HANDLER(read);   // static int handle_read(void)
DECLARE_HANDLER(write);  // static int handle_write(void)
```

## 커널 표준 매크로

### 유용한 커널 매크로

```c
// 배열 크기
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))

// 구조체 멤버 오프셋
#define offsetof(TYPE, MEMBER) ((size_t)&((TYPE *)0)->MEMBER)

// 컨테이너 포인터
#define container_of(ptr, type, member) ({              \
        const typeof(((type *)0)->member) *__mptr = (ptr);      \
        (type *)((char *)__mptr - offsetof(type, member));      \
})

// 정렬
#define ALIGN(x, a) (((x) + (a) - 1) & ~((a) - 1))

// 범위 체크
#define in_range(val, start, len) \
        ((val) >= (start) && (val) < (start) + (len))
```

### container_of 사용 예

```c
struct my_device {
        int id;
        struct list_head list;
        char name[32];
};

void process_list_entry(struct list_head *entry)
{
        struct my_device *dev;

        dev = container_of(entry, struct my_device, list);
        pr_info("Device: %s\n", dev->name);
}
```

## 하지 말 것

### 위험한 매크로 패턴

```c
// Bad: return이 숨겨져 있다
#define CHECK_AND_RETURN(x) if (!(x)) return -EINVAL

// Bad: 변수 이름 충돌
#define SWAP(a, b) { int tmp = a; a = b; b = tmp; }

// Bad: 타입이 없는 매크로
#define BUFFER_SIZE 1024
char buffer[BUFFER_SIZE];  // 타입이 명확하지 않다

// Good: 타입이 명확한 상수
static const size_t buffer_size = 1024;
char buffer[buffer_size];
```

### 매크로 남용

```c
// Bad: 흐름 제어를 숨긴다
#define RETURN_IF_NULL(ptr) if (!ptr) return -EINVAL

// Good: 명시적으로
if (!ptr)
        return -EINVAL;

// Bad: 복잡한 로직을 매크로로
#define COMPLEX_INIT() /* 50줄 */

// Good: 함수로
static int complex_init(void) { /* 50줄 */ }
```

## 정리

| 항목 | 규칙 |
|------|------|
| 상수 | 대문자_밑줄 |
| 함수형 | do { } while (0) |
| 인자 | 괄호로 감싸기 |
| 인라인 | 작은 함수만 (1~3줄) |
| 부작용 | 다중 평가 주의 |
| 선호 | 매크로보다 인라인 |

---

다음 장에서는 **Memory & Returns**를 다룬다. kmalloc, 에러 코드, ERR_PTR 패턴을 살펴본다.
