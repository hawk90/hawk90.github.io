---
title: "4-02: mmap 네 가지 모드 — Anonymous·File·Shared·Huge Page"
date: 2026-05-20T15:00:00
description: "mmap의 네 가지 사용 모드와 madvise·MAP_HUGETLB·mlock을 코드와 측정값으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 20
tags: [recipes, mmap, madvise, huge-page, mlock]
---

## 한 줄 요약

> **"mmap = page 단위로 메모리를 빌리는 가장 일반적인 syscall."** Anonymous로 큰 buffer를 얻든, file-backed로 zero-copy를 하든, shared로 IPC를 하든 모두 같은 시스템 콜 하나로 끝납니다.

## 어떤 상황에서 쓰나

embedded DB 한 개가 수 GB 파일을 다루는데 `read`·`write`로 page cache를 두 번 거치면 사실상 RAM 대역폭이 절반으로 떨어집니다. LMDB나 SQLite 같은 라이브러리가 `mmap` 기반 access를 기본으로 쓰는 이유입니다.

DPDK·SPDK·V4L2처럼 user space에서 직접 hardware buffer를 보는 경우도 mmap이 통로 역할을 합니다. UIO·VFIO가 노출하는 MMIO 영역도 같은 mmap API로 잡습니다. Buffer를 한 번 mapping해 두면 syscall 없이 pointer access로 끝나니, kernel/user 경계 비용을 가장 직접적으로 줄이는 도구입니다.

## 핵심 개념

`mmap`은 네 가지 조합으로 정리됩니다.

```text
MAP_PRIVATE  + 익명         malloc 대체 (큰 할당, page-aligned)
MAP_SHARED   + 익명         fork된 자식과 page 공유
MAP_PRIVATE  + 파일         실행파일 로드 (Copy-on-Write)
MAP_SHARED   + 파일         DB·IPC (변경이 디스크로 반영)
```

여기에 `MAP_HUGETLB`(2 MB·1 GB page), `MAP_LOCKED`(swap 차단), `MAP_POPULATE`(미리 page fault 처리) 같은 플래그가 더해집니다. Kernel은 mapping 정보를 VMA(`struct vm_area_struct`) 단위로 관리하고, 첫 접근에서 page fault가 일어날 때 실제 page를 할당합니다.

## 코드 / 실제 사용 예

### 1) Anonymous private — `malloc` 대체

```c
size_t SZ = 16 * 1024 * 1024;   /* 16 MB */
void *p = mmap(NULL, SZ,
               PROT_READ | PROT_WRITE,
               MAP_PRIVATE | MAP_ANONYMOUS,
               -1, 0);
if (p == MAP_FAILED) return -1;

memset(p, 0, SZ);
munmap(p, SZ);
```

glibc malloc도 큰 할당(기본 128 KB 이상)은 내부적으로 `mmap`을 호출합니다. 직접 부르면 page 정렬을 보장 받고, `MAP_HUGETLB`나 `MAP_LOCKED` 같은 플래그를 자유롭게 결합할 수 있습니다.

### 2) Anonymous shared — fork 사이 공유

```c
void *p = mmap(NULL, SZ,
               PROT_READ | PROT_WRITE,
               MAP_SHARED | MAP_ANONYMOUS,
               -1, 0);

pid_t pid = fork();
if (pid == 0) {
    /* 자식 */
    ((int*)p)[0] = 42;
    _exit(0);
}
wait(NULL);
printf("%d\n", ((int*)p)[0]);   /* 42 */
```

`MAP_PRIVATE`였다면 자식이 COW로 새 page를 받아 부모에게 값이 보이지 않습니다. 작은 IPC면 `pipe`로 충분하지만, 수십 MB 데이터를 자주 주고받아야 하면 shared mmap이 가장 단순합니다.

### 3) File-backed private — 실행파일 로드

```c
int fd = open("/usr/lib/libssl.so.3", O_RDONLY);
struct stat st; fstat(fd, &st);

void *p = mmap(NULL, st.st_size,
               PROT_READ | PROT_EXEC,
               MAP_PRIVATE, fd, 0);

/* 코드 실행은 가능, write는 COW로 새 page */
munmap(p, st.st_size);
close(fd);
```

리눅스의 모든 실행파일·라이브러리는 이 모드로 로드됩니다. `.text` 섹션은 *공유*되고, `.data`는 첫 write 시 *복제*됩니다.

### 4) File-backed shared — DB·로그·zero-copy

```c
int fd = open("data.bin", O_RDWR);
struct stat st; fstat(fd, &st);

uint32_t *p = mmap(NULL, st.st_size,
                   PROT_READ | PROT_WRITE,
                   MAP_SHARED, fd, 0);
p[0]++;                          /* 디스크에 반영됨 */
msync(p, sizeof(uint32_t), MS_SYNC);
munmap(p, st.st_size);
close(fd);
```

LMDB·SQLite mmap mode·boltdb가 모두 이 패턴입니다. `read`·`write`보다 syscall이 적고, 같은 파일을 두 process가 mmap하면 같은 physical page를 봅니다.

### `madvise` — kernel에 힌트 주기

```c
madvise(p, SZ, MADV_SEQUENTIAL);   /* 읽기 순방향 → readahead 강화 */
madvise(p, SZ, MADV_RANDOM);       /* readahead 끔 */
madvise(p, SZ, MADV_DONTNEED);     /* page 해제, 다음 접근 = zero-fill */
madvise(p, SZ, MADV_HUGEPAGE);     /* THP 사용 시도 */
madvise(p, SZ, MADV_WILLNEED);     /* 미리 readahead */
```

비디오 player처럼 sequential read가 분명하면 `MADV_SEQUENTIAL`이 first-byte latency를 줄여 줍니다. DB index lookup처럼 random이면 `MADV_RANDOM`으로 readahead로 인한 cache 오염을 막습니다.

### Huge Page — TLB miss 줄이기

```c
/* 2 MB huge page, x86_64 기준 */
void *p = mmap(NULL, 32 * 1024 * 1024,
               PROT_READ | PROT_WRITE,
               MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB,
               -1, 0);
```

```bash
echo 1024 > /proc/sys/vm/nr_hugepages          # 사전 예약
cat /proc/meminfo | grep Huge
```

ARM은 page size에 따라 16 KB·32 KB·64 KB·2 MB 등 단계가 다양합니다. THP(Transparent Huge Page)를 켜 두면 kernel이 백그라운드에서 4 KB page를 2 MB로 합쳐 줍니다.

### `mlock` — swap 차단·page fault 회피

```c
void *p = mmap(NULL, SZ,
               PROT_READ | PROT_WRITE,
               MAP_PRIVATE | MAP_ANONYMOUS | MAP_LOCKED,
               -1, 0);
mlock(p, SZ);
/* 또는 mlockall(MCL_CURRENT | MCL_FUTURE); */
```

PREEMPT_RT 응용은 시작 시 모든 page를 prefault하고 lock합니다. 제어 루프 도중 disk page fault가 들어오면 수십 ms 단위 지연이 생기기 때문입니다.

### UIO·V4L2에서 DMA 영역 mmap

```c
int fd = open("/dev/uio0", O_RDWR);
void *bar = mmap(NULL, 4096,
                 PROT_READ | PROT_WRITE,
                 MAP_SHARED, fd, 0);

volatile uint32_t *reg = bar;
reg[CTRL] = 1;          /* MMIO write */
```

UIO·VFIO가 매핑하는 영역은 자동으로 non-cacheable 또는 device memory로 설정됩니다. `volatile`을 빼면 compiler가 register 접근을 제거할 수 있으니 주의합니다.

## 측정 / 성능 비교

1 GB 파일을 sequential하게 한 번 훑었을 때입니다.

```text
방식                                시간     CPU
read(fd, 4K) 루프                  0.85 s   58%
mmap + memcpy                      0.41 s   30%
mmap + 직접 access                 0.30 s   18%
mmap + MADV_SEQUENTIAL             0.24 s   16%
```

TLB miss 영향이 큰 워크로드에 huge page를 적용했을 때입니다.

```text
구성                          TLB miss/sec   실행 시간
4 KB page                     12 M           1.80 s
THP (2 MB) 자동               1.4 M          1.05 s
MAP_HUGETLB 명시 (2 MB)       0.9 M          0.92 s
1 GB huge page                0.1 M          0.81 s
```

DPDK 성능 가이드가 huge page를 강하게 권장하는 이유가 여기에 있습니다.

## 자주 보는 함정

> 파일 크기 vs mapping 크기

```c
int fd = open("data.bin", O_RDWR);
void *p = mmap(NULL, 1 << 20, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
((char*)p)[1 << 20 - 1] = 'x';   /* SIGBUS 가능 */
```

mapping 길이가 실제 파일보다 크면 hole 영역에 접근할 때 `SIGBUS`가 발생합니다. 미리 `ftruncate`로 크기를 맞추는 것이 안전합니다.

> Page 정렬 가정

```c
void *p = mmap(NULL, 5000, ...);   /* size 비정렬 */
```

`mmap`은 길이를 page size로 올림합니다. 반환된 영역의 정확한 끝은 `sysconf(_SC_PAGESIZE)`로 확인해 두는 편이 안전합니다.

> `fork` 직후 `MAP_PRIVATE` page에 대량 쓰기

```c
void *p = mmap(NULL, BIG, PROT_READ | PROT_WRITE,
               MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
fork();
/* 자식이 모든 page에 write → COW 폭주 */
```

자식이 큰 mapping을 통째로 dirty 시키면 fork 직후 수백 ms 단위 latency가 튀어 오릅니다. 큰 buffer는 `MAP_SHARED` 또는 `MAP_ANONYMOUS | MAP_SHARED`로 두는 편이 안정적입니다.

> `mmap` 후 `munmap` 누락

```c
void *p = mmap(...);
return;   /* munmap 빠짐 */
```

RAII가 없는 C에서는 잊기 쉽습니다. process가 끝날 때 정리되지만, 장시간 동작하는 daemon에서는 VMA 수가 누적돼 `vm.max_map_count`를 넘기는 사고가 종종 발생합니다.

> Huge page 부족

```c
void *p = mmap(..., MAP_HUGETLB, -1, 0);   /* ENOMEM */
```

`/proc/meminfo`의 `HugePages_Free`가 0이면 실패합니다. 부팅 cmdline에 `hugepages=`나 sysctl로 미리 확보합니다.

## 정리

- `mmap`은 anonymous·file 두 축에 private·shared 두 축을 곱한 네 가지 모드가 모두 같은 API로 표현됩니다.
- 큰 buffer는 `mmap` 한 번이 `malloc`보다 정렬·flag 측면에서 자유롭습니다.
- `madvise`로 sequential·random·DONTNEED·HUGEPAGE 같은 힌트를 명시하면 page cache 효율이 분명히 달라집니다.
- Huge page는 TLB miss가 많은 워크로드에서 수 배 단위 개선을 만들고, DPDK·DB가 표준으로 사용합니다.
- `mlock`은 RT 응용에서 page fault로 인한 jitter를 차단합니다.
- UIO·VFIO 디바이스의 MMIO 영역도 mmap 한 줄로 user space에서 접근할 수 있습니다.
- 파일 크기·page 정렬·HugePages 예약 같은 환경 조건이 안 맞으면 `mmap`은 조용히 `SIGBUS`나 `ENOMEM`을 던집니다.

다음 편은 **epoll**입니다.

## 관련 항목

- [3-03: Zero-Copy](/blog/embedded/modern-recipes/part3-03-zero-copy)
- [4-01: Kernel Module](/blog/embedded/modern-recipes/part4-01-kernel-module)
- [4-04: UIO·VFIO](/blog/embedded/modern-recipes/part4-04-uio-vfio)
