---
title: "4-02: mmap vs read/write — File·MMIO·Shared·Anonymous"
date: 2026-05-20T15:00:00
description: "mmap 4가지 사용처. File-backed, MMIO, shared, anonymous. read/write 비교, page fault."
series: "Modern Embedded Recipes"
seriesOrder: 20
tags: [recipes, mmap, file-io, mmio, shared-memory]
draft: true
---

## 한 줄 요약

> **"mmap = 가상 메모리 mapping"** — file·hardware·process 공유 모두 같은 API.

## 4 가지 mmap 용도

```text
1. File-backed — read/write 대안 (DB·log·LMDB)
2. MMIO — peripheral register (UIO·VFIO)
3. Shared memory — process IPC (POSIX shm)
4. Anonymous — large allocation
```

## File-Backed mmap

```c
int fd = open("data.bin", O_RDONLY);
struct stat st;
fstat(fd, &st);
void *p = mmap(NULL, st.st_size, PROT_READ, MAP_SHARED, fd, 0);

/* p[i]가 file의 i번째 byte — page fault on demand */
process(p, st.st_size);

munmap(p, st.st_size);
close(fd);
```

장점:
- **Zero-copy** — kernel page cache 그대로 user에 mapping
- **Lazy load** — 접근한 page만 disk read
- **Cross-process 공유** — 같은 file mmap = 같은 physical page

단점:
- Sequential read엔 *page fault overhead*
- Random write/append 시 *file size 변경 어려움*

## read vs mmap — 성능 비교

```text
File size 100 MB, sequential read:
  read(fd, buf, 4K) loop  : 0.8 sec (2 copy: kernel→user)
  mmap + memcpy            : 0.4 sec (1 copy)
  mmap + 직접 access       : 0.3 sec (0 copy)

Random access 10000 × 4 KB:
  pread(fd, buf, 4K, off) : 50 ms (each call: syscall + copy)
  mmap pointer access     : 12 ms (lazy fault)
```

`mmap`이 *random·sparse access*에 압도적.

## SQLite·LMDB — mmap 기반 DB

```c
/* LMDB — 매우 빠른 key-value */
MDB_env *env;
mdb_env_create(&env);
mdb_env_open(env, "./db", 0, 0664);

MDB_txn *txn;
mdb_txn_begin(env, NULL, MDB_RDONLY, &txn);

MDB_dbi dbi;
mdb_dbi_open(txn, NULL, 0, &dbi);

MDB_val key = {.mv_size = 4, .mv_data = "key1"};
MDB_val val;
mdb_get(txn, dbi, &key, &val);
/* val.mv_data — *mmap page 직접 접근*, copy 0 */
```

LMDB·MDBX — *write 시 mmap 통해 OS가 자동 disk sync*. 매우 빠른 embedded DB.

## MMIO mmap — UIO

```c
/* User-space IO — peripheral 직접 access */
int fd = open("/dev/uio0", O_RDWR);
void *reg = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                  MAP_SHARED, fd, 0);

/* peripheral register 직접 */
volatile uint32_t *r = (uint32_t*)reg;
r[CTRL_OFFSET] = 1;
uint32_t status = r[STATUS_OFFSET];

munmap(reg, 4096);
close(fd);
```

DPDK·SPDK — *kernel bypass*. 4-04 chapter 상세.

## Anonymous mmap

```c
/* malloc 대안 — 큰 buffer */
void *p = mmap(NULL, 16 * 1024 * 1024,
                PROT_READ | PROT_WRITE,
                MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

/* p[0..16MB] 사용 */

munmap(p, 16 * 1024 * 1024);
```

장점:
- **Page-aligned** 자동 (4 KB)
- **Huge page** 지원 (`MAP_HUGETLB`)
- **NUMA aware** 가능
- *Large allocation*시 malloc보다 효율

glibc malloc도 *128 KB 이상은 mmap*으로 처리 (mmap threshold).

## Shared Memory — POSIX shm

```c
/* Producer */
int fd = shm_open("/mybuf", O_CREAT | O_RDWR, 0600);
ftruncate(fd, 4096);
void *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                MAP_SHARED, fd, 0);
strcpy(p, "Hello");

/* Consumer (별도 process) */
int fd = shm_open("/mybuf", O_RDONLY, 0);
void *p = mmap(NULL, 4096, PROT_READ, MAP_SHARED, fd, 0);
printf("%s\n", p);
```

`/dev/shm/mybuf` — tmpfs 위 file. Memory에 backed.

## memfd_create — File 없는 Memory

```c
int fd = memfd_create("buf", MFD_CLOEXEC | MFD_ALLOW_SEALING);
ftruncate(fd, 4096);
void *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                MAP_SHARED, fd, 0);

/* fd를 다른 process에 전달 (Unix socket SCM_RIGHTS) */
send_fd_via_unix_socket(fd);
```

`memfd_create` — *file system path 없는 file*. Wayland·Vulkan에서 사용.

## Huge Pages

```bash
# 2 MB huge page 할당
echo 1024 > /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages
```

```c
void *p = mmap(NULL, 16 * 1024 * 1024,
                PROT_READ | PROT_WRITE,
                MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB,
                -1, 0);
```

TLB miss 큰 워크로드 (DB·DPDK) — huge page 사용.

```bash
# Transparent Huge Pages (THP)
echo always > /sys/kernel/mm/transparent_hugepage/enabled
```

자동 — kernel이 *알아서* 큰 page 사용.

## MAP_LOCKED — RT용

```c
void *p = mmap(NULL, size, PROT_READ | PROT_WRITE,
                MAP_PRIVATE | MAP_ANONYMOUS | MAP_LOCKED, -1, 0);
mlock(p, size);
```

Page swap 차단 — RT task의 *page fault 회피*. PREEMPT_RT 표준.

## copy_to_user·copy_from_user (Kernel)

```c
/* Kernel module — user space buffer 접근 */
static ssize_t my_read(struct file *f, char __user *buf, size_t n, loff_t *o) {
    char kbuf[256] = "hello";
    if (copy_to_user(buf, kbuf, n)) return -EFAULT;
    return n;
}
```

`__user` annotation — *user space pointer임을 명시*. Kernel은 *직접 access 금지*.

## Cache-Coherent vs Non-Coherent

```c
/* DMA buffer — cache 문제 */
struct dma_buf_ops {
    int (*mmap)(struct dma_buf *, struct vm_area_struct *);
};

/* dma_mmap_coherent */
dma_mmap_coherent(dev, vma, cpu_addr, dma_addr, size);
/* MMU page 자동 설정 — non-cacheable 또는 coherent */
```

## msync — File 동기화

```c
void *p = mmap(NULL, size, PROT_READ | PROT_WRITE,
                MAP_SHARED, fd, 0);
strcpy(p, "data");
msync(p, size, MS_SYNC);   /* disk write 강제 */
```

`MS_SYNC` — block until disk write done. `MS_ASYNC` — schedule.

## madvise — Kernel Hint

```c
madvise(p, size, MADV_SEQUENTIAL);   /* readahead 적극 */
madvise(p, size, MADV_RANDOM);       /* readahead 끔 */
madvise(p, size, MADV_DONTNEED);     /* 해제 hint */
madvise(p, size, MADV_HUGEPAGE);     /* huge page 시도 */
```

Database·video player — `madvise`로 *kernel 힌트*.

## io_uring + Fixed Buffer

```c
struct iovec iov = { .iov_base = mmap_p, .iov_len = SIZE };
io_uring_register_buffers(&ring, &iov, 1);

io_uring_prep_read_fixed(sqe, fd, mmap_p, len, offset, 0);
```

mmap된 buffer를 *io_uring에 등록* — 매 I/O *zero syscall, zero copy*.

## 자동차·임베디드 사례

```text
인포테인먼트 system:
  Camera /dev/videoN → V4L2 mmap → V4L2 buffer
  GPU 처리 (Vulkan/OpenGL) — *같은 mmap memory 공유*
  Display via DRM — *DMA-BUF mmap*
  
End-to-end zero-copy = mmap chain.
```

## 자주 하는 실수

> ⚠️ munmap 누락

```c
void *p = mmap(...);
return;   /* p 해제 안 됨 — 누수 */
```

→ pair `mmap`·`munmap`. RAII가 없는 C에선 *주의*.

> ⚠️ MAP_PRIVATE vs MAP_SHARED

```c
mmap(... MAP_PRIVATE ... fd, ...);
strcpy(p, "data");
/* file에 *반영 안 됨* — private copy */
```

→ disk persist 원하면 `MAP_SHARED`.

> ⚠️ Page fault overhead

```c
void *p = mmap(NULL, huge, PROT_READ | PROT_WRITE,
                MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
for (size_t i = 0; i < huge; i++) p[i] = 0;
/* 매 page fault — 16 MB → 4K page = 4000 fault */
```

→ `MAP_POPULATE` 또는 `mlock`.

> ⚠️ MMIO에 cacheable mapping

```c
void *reg = mmap(... PROT_READ | PROT_WRITE, MAP_SHARED, uio_fd, 0);
/* UIO mapping은 *non-cacheable* 자동 — that's right */
```

UIO·VFIO는 안전. 직접 `/dev/mem`은 *주의*.

## 정리

- mmap = **file·MMIO·shared·anonymous** 4 용도.
- File mmap = *page cache 직접 access* (zero-copy).
- LMDB·SQLite — mmap-based fast DB.
- POSIX shm·memfd — process 간 메모리 공유.
- **Huge page** — TLB miss 줄임.
- **MAP_LOCKED** — RT page swap 차단.

다음 편은 **epoll·io_uring**.

## 관련 항목

- [4-01: Kernel Module](/blog/embedded/modern-recipes/part4-01-kernel-module)
- [4-03: epoll·io_uring](/blog/embedded/modern-recipes/part4-03-epoll)
