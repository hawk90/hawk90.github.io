---
title: "Ch 7: Data Structures"
date: 2026-05-18T07:00:00
description: "커널 자료구조 — list_head, hlist, rbtree, kref. container_of로 임베딩."
tags: [Linux, Kernel, Data-Structures, list_head, rbtree, kref]
series: "Linux Kernel Coding Style"
seriesOrder: 7
draft: true
---

> "The kernel has its own data structure implementations."

## list_head: 이중 연결 리스트

### 기본 구조

```c
#include <linux/list.h>

// 리스트 노드를 구조체에 임베드
struct my_item {
        int value;
        char name[32];
        struct list_head list;  // 리스트 링크
};

// 리스트 헤드 선언
static LIST_HEAD(my_list);

// 또는 동적 초기화
struct list_head my_list;
INIT_LIST_HEAD(&my_list);
```

### 기본 연산

```c
struct my_item *item;

// 할당 및 초기화
item = kzalloc(sizeof(*item), GFP_KERNEL);
item->value = 42;
INIT_LIST_HEAD(&item->list);

// 추가
list_add(&item->list, &my_list);       // 헤드 뒤에 (스택)
list_add_tail(&item->list, &my_list);  // 테일 앞에 (큐)

// 삭제
list_del(&item->list);
list_del_init(&item->list);  // 재사용 가능하게

// 이동
list_move(&item->list, &other_list);
list_move_tail(&item->list, &other_list);
```

### 순회

```c
// 읽기 전용 순회
struct my_item *item;
struct list_head *pos;

list_for_each(pos, &my_list) {
        item = list_entry(pos, struct my_item, list);
        pr_info("Value: %d\n", item->value);
}

// 더 간단한 매크로
list_for_each_entry(item, &my_list, list) {
        pr_info("Value: %d\n", item->value);
}

// 역순 순회
list_for_each_entry_reverse(item, &my_list, list) {
        pr_info("Value: %d\n", item->value);
}
```

### 안전한 순회 (삭제 시)

```c
struct my_item *item, *tmp;

// 순회 중 삭제 가능
list_for_each_entry_safe(item, tmp, &my_list, list) {
        if (item->value < 0) {
                list_del(&item->list);
                kfree(item);
        }
}
```

### 빈 리스트 검사

```c
if (list_empty(&my_list))
        pr_info("List is empty\n");

// 단일 요소 검사
if (list_is_singular(&my_list))
        pr_info("Only one element\n");
```

## hlist: 해시 리스트

### 메모리 효율적인 리스트

```c
#include <linux/list.h>

// hlist는 해시 테이블 버킷용
// list_head보다 메모리 절약 (pprev 사용)

struct my_hash_item {
        int key;
        int value;
        struct hlist_node node;
};

// 해시 테이블 정의
#define HASH_SIZE 256
static struct hlist_head hash_table[HASH_SIZE];

// 초기화
for (i = 0; i < HASH_SIZE; i++)
        INIT_HLIST_HEAD(&hash_table[i]);
```

### hlist 연산

```c
unsigned int hash = hash_32(key, 8);  // 8비트 해시

// 추가
hlist_add_head(&item->node, &hash_table[hash]);

// 순회
struct my_hash_item *item;
hlist_for_each_entry(item, &hash_table[hash], node) {
        if (item->key == search_key)
                return item;
}

// 삭제
hlist_del(&item->node);
```

## rbtree: 레드-블랙 트리

### 정렬된 데이터 구조

```c
#include <linux/rbtree.h>

struct my_node {
        int key;
        char *data;
        struct rb_node rb;
};

static struct rb_root my_tree = RB_ROOT;
```

### 삽입

```c
int my_insert(struct my_node *new)
{
        struct rb_node **link = &my_tree.rb_node;
        struct rb_node *parent = NULL;
        struct my_node *entry;

        // 삽입 위치 탐색
        while (*link) {
                parent = *link;
                entry = rb_entry(parent, struct my_node, rb);

                if (new->key < entry->key)
                        link = &parent->rb_left;
                else if (new->key > entry->key)
                        link = &parent->rb_right;
                else
                        return -EEXIST;  // 중복
        }

        // 삽입 및 리밸런싱
        rb_link_node(&new->rb, parent, link);
        rb_insert_color(&new->rb, &my_tree);

        return 0;
}
```

### 검색

```c
struct my_node *my_search(int key)
{
        struct rb_node *node = my_tree.rb_node;

        while (node) {
                struct my_node *entry = rb_entry(node, struct my_node, rb);

                if (key < entry->key)
                        node = node->rb_left;
                else if (key > entry->key)
                        node = node->rb_right;
                else
                        return entry;
        }

        return NULL;
}
```

### 순회

```c
struct rb_node *node;
struct my_node *entry;

// 정렬된 순서로 순회
for (node = rb_first(&my_tree); node; node = rb_next(node)) {
        entry = rb_entry(node, struct my_node, rb);
        pr_info("Key: %d\n", entry->key);
}

// 역순
for (node = rb_last(&my_tree); node; node = rb_prev(node)) {
        entry = rb_entry(node, struct my_node, rb);
        pr_info("Key: %d\n", entry->key);
}
```

### 삭제

```c
void my_remove(struct my_node *node)
{
        rb_erase(&node->rb, &my_tree);
        kfree(node);
}
```

## kref: 참조 카운팅

### 기본 사용법

```c
#include <linux/kref.h>

struct my_object {
        struct kref refcount;
        char *name;
        void *data;
};

// 생성
struct my_object *my_object_create(const char *name)
{
        struct my_object *obj;

        obj = kzalloc(sizeof(*obj), GFP_KERNEL);
        if (!obj)
                return NULL;

        kref_init(&obj->refcount);  // 카운트 1로 시작
        obj->name = kstrdup(name, GFP_KERNEL);

        return obj;
}
```

### 참조 획득/해제

```c
// 참조 획득
void my_object_get(struct my_object *obj)
{
        kref_get(&obj->refcount);
}

// 해제 콜백
static void my_object_release(struct kref *kref)
{
        struct my_object *obj = container_of(kref, struct my_object, refcount);

        kfree(obj->name);
        kfree(obj->data);
        kfree(obj);
}

// 참조 해제 (카운트 0이면 release 호출)
void my_object_put(struct my_object *obj)
{
        kref_put(&obj->refcount, my_object_release);
}
```

### 사용 예제

```c
struct my_object *obj = my_object_create("test");

// 다른 곳에서 사용
my_object_get(obj);
/* 사용 */
my_object_put(obj);

// 원래 소유자 해제
my_object_put(obj);  // 마지막 참조면 메모리 해제
```

## container_of

### 임베딩 패턴

```c
// 노드에서 컨테이너 구조체 얻기
#define container_of(ptr, type, member) ({              \
        const typeof(((type *)0)->member) *__mptr = (ptr);      \
        (type *)((char *)__mptr - offsetof(type, member));      \
})

// 사용 예
struct my_device {
        int id;
        struct list_head list;  // 임베디드
        char name[32];
};

void process(struct list_head *node)
{
        struct my_device *dev;

        dev = container_of(node, struct my_device, list);
        pr_info("Device: %s (id=%d)\n", dev->name, dev->id);
}
```

### list_entry / rb_entry

```c
// list_entry는 container_of의 별칭
#define list_entry(ptr, type, member) container_of(ptr, type, member)

// rb_entry도 동일
#define rb_entry(ptr, type, member) container_of(ptr, type, member)
```

## XArray

### 현대적인 radix tree

```c
#include <linux/xarray.h>

DEFINE_XARRAY(my_array);

// 또는 동적
struct xarray my_array;
xa_init(&my_array);

// 저장
xa_store(&my_array, index, ptr, GFP_KERNEL);

// 로드
void *ptr = xa_load(&my_array, index);

// 삭제
xa_erase(&my_array, index);

// 순회
unsigned long index;
void *entry;

xa_for_each(&my_array, index, entry) {
        pr_info("Index %lu: %p\n", index, entry);
}
```

## IDR: ID 할당

### 정수 ID 관리

```c
#include <linux/idr.h>

static DEFINE_IDR(my_idr);

// ID 할당
int id = idr_alloc(&my_idr, ptr, 0, 0, GFP_KERNEL);
if (id < 0)
        return id;  // 에러

// ID로 검색
void *ptr = idr_find(&my_idr, id);

// ID 해제
idr_remove(&my_idr, id);

// 전체 정리
idr_destroy(&my_idr);
```

## 정리

| 자료구조 | 용도 | 헤더 |
|----------|------|------|
| list_head | 이중 연결 리스트 | linux/list.h |
| hlist | 해시 버킷 | linux/list.h |
| rbtree | 정렬된 맵 | linux/rbtree.h |
| kref | 참조 카운팅 | linux/kref.h |
| xarray | 스파스 배열 | linux/xarray.h |
| idr | ID 할당 | linux/idr.h |

---

다음 장에서는 **Kconfig & Modules**를 다룬다. 커널 설정 시스템과 모듈 구조를 살펴본다.
