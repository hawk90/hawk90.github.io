---
title: "mmap 4가지 모드 — Anonymous·File·Shared·Huge Page"
slug: "embedded/modern-recipes/part7-09-mmap"
date: 2026-04-16T09:08:00
description: "mmap의 네 가지 사용 모드와 madvise·MAP_HUGETLB·mlock을 코드와 측정값으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 83
tags: [recipes, mmap, madvise, huge-page, mlock]
topics: ["embedded"]
---

## 한 줄 요약

> **"mmap = page 단위로 주소 공간을 빌리는 system call."** 익명 메모리로 큰 buffer를 얻든, 파일을 메모리처럼 읽든, process 사이에 page를 공유하든 같은 호출 하나로 표현합니다. 이 글의 출력과 시간은 모두 Debian 13 arm64 VM(커널 `6.12.116+deb13-arm64`, glibc 2.41, gcc 14.2.0, page 4 KiB)에서 직접 돌린 결과입니다.

## 어떤 상황에서 쓰나

`read`는 커널의 page cache에서 사용자 buffer로 데이터를 복사합니다. 같은 파일을 `mmap`하면 page cache의 page가 사용자 주소 공간에 그대로 매핑되어 복사가 없습니다. 도서관 책을 복사해 가져가는 것과 열람실에서 원본을 펼쳐 보는 것의 차이입니다. LMDB는 데이터 전체를 memory map에 두고 읽기를 그 map에서 바로 돌려주는 구조입니다(`lmdb.h` 머리 주석). 반면 SQLite는 memory-mapped I/O를 기본으로 끄고 `PRAGMA mmap_size`로 켜게 합니다(sqlite.org "Memory-Mapped I/O": "memory mapped I/O is disabled by default").

사용자 공간에서 장치 메모리를 직접 다룰 때도 `mmap`이 통로입니다. UIO는 `/dev/uioX`를 `mmap`하면 장치의 메모리 영역을 돌려줍니다([7-11](/blog/embedded/modern-recipes/part7-11-uio-vfio)).

## 핵심 개념

`mmap`은 두 축의 조합으로 정리됩니다.

| Flags | 쓰는 곳 | 쓰기가 어디로 가나 |
|-------|------|------|
| `MAP_PRIVATE` + 익명 | 큰 메모리 할당 | 자기 process의 page |
| `MAP_SHARED` + 익명 | `fork`한 process 사이 공유 | 공유 page, 자식의 쓰기가 부모에게 보임 |
| `MAP_PRIVATE` + 파일 | 실행 파일·라이브러리 로드 | Copy-on-Write로 복사한 page, 파일은 그대로 |
| `MAP_SHARED` + 파일 | 파일을 메모리처럼 갱신, process 간 공유 | page cache, 결국 파일 |

여기에 `MAP_HUGETLB`(huge page), `MAP_LOCKED`(swap 차단과 page 미리 확보), `MAP_POPULATE`(page를 `mmap` 시점에 미리 채움) 같은 플래그가 더해집니다. 커널은 매핑을 VMA(`struct vm_area_struct`) 단위로 관리하고, 첫 접근의 page fault에서 실제 page를 붙입니다.

## 코드 / 실제 사용 예

네 모드를 한 프로그램에서 확인했습니다. 각 모드에서 쓰기가 어디까지 보이는지가 핵심입니다.

```c
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

#define SZ (16u * 1024 * 1024)

int main(void)
{
	/* 1) anonymous private */
	char *a = mmap(NULL, SZ, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
	printf("1) anon private: %p, page-aligned=%d\n", a, ((uintptr_t)a % sysconf(_SC_PAGESIZE)) == 0);

	/* 2) anonymous shared vs private across fork */
	int *sh = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);
	int *pr = (int *)a;
	sh[0] = 0; pr[0] = 0;
	if (fork() == 0) { sh[0] = 42; pr[0] = 42; _exit(0); }
	wait(NULL);
	printf("2) after child wrote 42: shared=%d private=%d\n", sh[0], pr[0]);

	/* 3) file-backed private: writes are COW, file unchanged */
	int fd = open("data.bin", O_RDWR | O_CREAT | O_TRUNC, 0644);
	ftruncate(fd, 4096);
	uint32_t *fp = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE, fd, 0);
	fp[0] = 0x11111111;
	uint32_t onfile; pread(fd, &onfile, 4, 0);
	printf("3) file private: mapping=0x%08x file=0x%08x\n", fp[0], onfile);

	/* 4) file-backed shared: writes reach the file */
	uint32_t *fs = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
	fs[0] = 0x22222222;
	msync(fs, 4096, MS_SYNC);
	pread(fd, &onfile, 4, 0);
	printf("4) file shared: mapping=0x%08x file=0x%08x\n", fs[0], onfile);

	/* length rounding */
	char *odd = mmap(NULL, 5000, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
	odd[8191] = 1;   /* inside the rounded-up second page */
	printf("5000-byte mapping: wrote byte 8191 fine (page size %ld)\n", sysconf(_SC_PAGESIZE));
	return 0;
}
```

```bash
gcc -O2 -Wall -o modes modes.c && ./modes
```

```text
1) anon private: 0xffff9a800000, page-aligned=1
2) after child wrote 42: shared=42 private=0
3) file private: mapping=0x11111111 file=0x00000000
4) file shared: mapping=0x22222222 file=0x22222222
5000-byte mapping: wrote byte 8191 fine (page size 4096)
```

- **익명 private**: 돌려받은 주소는 page 경계에 정렬됩니다. glibc `malloc`도 큰 요청은 내부에서 `mmap`을 씁니다. 그 경계(`M_MMAP_THRESHOLD`)의 처음 값은 128 KiB이고, 요즘 glibc는 해제된 블록 크기에 맞춰 이 값을 동적으로 올립니다(`mallopt(3)`, Linux man-pages 6.9.1).
- **익명 shared**: 자식이 쓴 42가 shared 영역에서는 부모에게 보였고, 같은 시점에 private 영역에서는 보이지 않았습니다. `fork` 뒤 private page는 Copy-on-Write라서 자식의 쓰기가 자식의 복사본에만 들어갔기 때문입니다.
- **파일 private**: 매핑에 쓴 값은 파일에 가지 않았습니다. 실행 파일의 `.data`처럼 "파일에서 읽어 오되 고친 내용은 내 것" 모드입니다.
- **파일 shared**: 매핑에 쓴 값이 `msync` 뒤 `pread`로 파일에서 그대로 읽혔습니다. 같은 파일을 `MAP_SHARED`로 연 다른 process도 같은 page cache를 봅니다.
- **길이 올림**: `mmap`은 길이를 page 크기로 올리므로, 5000 B를 요청해도 두 번째 page 끝(8191)까지 쓸 수 있었습니다.

### `read` 대 `mmap`, 그리고 `madvise`

1 GiB 파일(`/dev/urandom`으로 만든 뒤 한 번 읽어 page cache에 올림)을 64 B 간격으로 훑는 시간을 쟀습니다. `read`는 4 KiB씩 읽고, `mmap`은 매핑을 직접 읽습니다.

| 방식 (3회) | 시간 | minor fault |
| --- | --- | ---: |
| `read(fd, buf, 4096)` 루프 | 0.173~0.207 s | — |
| `mmap` 후 직접 접근 | 0.063~0.077 s | 16,384 |
| `mmap` + `MADV_SEQUENTIAL` | 0.062~0.076 s | 16,384 |
| `mmap(MAP_POPULATE)` 호출 + 접근 | 0.027~0.032 s + 0.026~0.032 s | 0 |

같은 VM에서 다른 빌드 작업이 돌던 상태(load average 약 15)라 절대값보다 비교에 의미가 있습니다. 세 가지가 보입니다.

- page cache에 이미 있는 파일에서는 `mmap` 직접 접근이 `read`보다 짧았습니다. `read`는 4 KiB마다 system call과 복사를 하기 때문입니다.
- 1 GiB = 262,144 page인데 minor fault는 16,384번, 즉 fault 한 번에 16 page(64 KiB)씩 붙었습니다. 커널은 파일 매핑의 fault에서 주변 page까지 한 번에 매핑하고, 그 크기가 `fault_around_bytes` 기본값 65536입니다(v6.12 `mm/memory.c:5171-5172`; 이 VM의 debugfs `fault_around_bytes`도 65536).
- `MAP_POPULATE`는 fault를 `mmap` 호출 안으로 옮깁니다. 접근할 때 fault는 0이었지만 그만큼 `mmap` 호출이 길어졌습니다. 첫 접근의 지연을 없애야 하는 실시간 코드에는 의미가 있습니다.
- 이 파일은 이미 page cache에 있어서 `MADV_SEQUENTIAL`(readahead를 늘리라는 힌트)의 차이는 보이지 않았습니다. 이 힌트는 디스크에서 처음 읽을 때 의미가 있고, 이 VM에서는 그 경우를 재지 않았습니다.

### `fork` 뒤 Copy-on-Write 비용

512 MiB를 채운 뒤 `fork`하고, 자식이 모든 page에 1바이트씩 썼습니다.

```text
MAP_PRIVATE 512 MiB: child wrote every page in 0.191 s
MAP_SHARED  512 MiB: child wrote every page in 0.059 s
```

`MAP_PRIVATE`에서는 자식의 첫 쓰기마다 page를 복사(CoW)하느라 `MAP_SHARED`보다 약 3배 걸렸습니다. 대신 `MAP_SHARED`는 자식의 쓰기가 부모에게도 보이므로, 이 비용을 피하려고 바꾸는 것은 공유가 의도일 때만 맞습니다.

### Huge Page

```bash
grep HugePages_ /proc/meminfo          # HugePages_Total: 0 by default here
echo 32 > /proc/sys/vm/nr_hugepages    # reserve 32 x 2 MiB
```

예약 없이 `MAP_HUGETLB`로 32 MiB를 요청하면 `Cannot allocate memory`였고, 2 MiB page 32개를 예약한 뒤에는 성공했습니다.

```text
MAP_HUGETLB 32 MiB: Cannot allocate memory
MAP_HUGETLB 32 MiB: ok
```

arm64의 huge page 크기는 기본 page(granule) 크기에 따라 다릅니다. 4K granule이면 연속 PTE로 64 KiB, PMD로 2 MiB, 연속 PMD로 32 MiB, PUD로 1 GiB이고, 16K·64K granule에서는 다른 조합입니다(v6.12 `Documentation/arch/arm64/hugetlbpage.rst:36-42`).

이 VM은 Transparent Huge Page가 `[always]`라서 커널이 익명 메모리에 2 MiB page를 먼저 시도합니다. 바로 아래 `MAP_LOCKED` 실험에서 64 MiB를 미리 채우는 데 fault가 32번(32 × 2 MiB = 64 MiB)뿐이었던 것이 그 흔적입니다. 다만 `defrag`가 `[madvise]`라 `MADV_HUGEPAGE`를 주지 않은 영역은 compaction을 기다리지 않고 4 KiB page로 물러섭니다(v6.12 `Documentation/admin-guide/mm/transhuge.rst:184-186`). page cache가 메모리를 채운 이 VM에서 독립 검증으로 다시 돌렸을 때는 같은 측정이 32~16,384번 사이로 바뀌었습니다. 4 KiB page였다면 16,384번입니다. TLB miss 수를 비교하려면 PMU 이벤트가 필요한데, 이 VM에서는 재지 않았습니다.

### `mlock` / `MAP_LOCKED` — 실행 중 page fault 없애기

```c
long g0 = minflt();
char *l = mmap(NULL, 64u << 20, PROT_READ | PROT_WRITE,
               MAP_PRIVATE | MAP_ANONYMOUS | MAP_LOCKED, -1, 0);
long g1 = minflt();
for (size_t i = 0; i < (64u << 20); i += 4096) l[i] = 1;
long g2 = minflt();
```

```text
MAP_LOCKED 64 MiB: 32 minor faults in mmap, 0 while touching
```

`MAP_LOCKED`는 page를 `mmap` 안에서 미리 붙이고 swap에서 제외하므로, 그 뒤 접근에서는 fault가 0이었습니다. 실시간 루프가 도는 동안 page fault를 피하려면 시작할 때 이렇게 하거나 `mlockall(MCL_CURRENT | MCL_FUTURE)`를 부릅니다. 위 측정의 `minflt()`는 `getrusage(RUSAGE_SELF)`의 `ru_minflt`입니다.

### UIO에서 장치 영역 mmap

```c
int fd = open("/dev/uio0", O_RDWR);
void *map0 = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                  MAP_SHARED, fd, 0 * getpagesize());
volatile uint32_t *reg = map0;
reg[CTRL] = 1;          /* MMIO write */
```

UIO에서 N번째 메모리 영역을 매핑하려면 `mmap`의 offset에 `N * getpagesize()`를 줍니다(v6.12 `Documentation/driver-api/uio-howto.rst:171-176`). 물리 메모리 영역은 `uio_mmap_physical()`이 `pgprot_noncached`로 매핑합니다(`drivers/uio/uio.c:759`). 이 조각은 UIO 장치가 없어 실행하지 않았고, UIO는 [7-11](/blog/embedded/modern-recipes/part7-11-uio-vfio)에서 다룹니다.

## 측정 프로그램

위 표와 CoW·huge page·`MAP_LOCKED` 출력은 모두 아래 프로그램 한 개에서 나왔습니다. `dd if=/dev/urandom of=big.bin bs=1M count=1024`로 파일을 만들고 `cat big.bin > /dev/null`로 page cache에 올린 뒤, `gcc -O2 -Wall -o bench bench.c && ./bench big.bin`으로 돌렸습니다. huge page 줄은 `nr_hugepages`를 0과 32로 바꿔 두 번 돌린 결과입니다.

```c
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static double now(void)
{
	struct timespec ts;
	clock_gettime(CLOCK_MONOTONIC, &ts);
	return ts.tv_sec + ts.tv_nsec / 1e9;
}

static long minflt(void)
{
	struct rusage ru;
	getrusage(RUSAGE_SELF, &ru);
	return ru.ru_minflt;
}

int main(int argc, char **argv)
{
	const char *file = argc > 1 ? argv[1] : "big.bin";
	int fd = open(file, O_RDONLY);
	struct stat st; fstat(fd, &st);
	size_t n = st.st_size;
	static char buf[1 << 16];
	uint64_t sum;

	for (int rep = 0; rep < 3; rep++) {
		double t0 = now(); sum = 0;
		lseek(fd, 0, SEEK_SET);
		ssize_t r;
		while ((r = read(fd, buf, 4096)) > 0)
			for (ssize_t i = 0; i < r; i += 64) sum += buf[i];
		double t1 = now();

		const char *m = mmap(NULL, n, PROT_READ, MAP_PRIVATE, fd, 0);
		long f0 = minflt(); double t2 = now(); uint64_t s2 = 0;
		for (size_t i = 0; i < n; i += 64) s2 += m[i];
		double t3 = now(); long f1 = minflt();
		munmap((void *)m, n);

		m = mmap(NULL, n, PROT_READ, MAP_PRIVATE, fd, 0);
		madvise((void *)m, n, MADV_SEQUENTIAL);
		long f2 = minflt(); double t4 = now(); uint64_t s3 = 0;
		for (size_t i = 0; i < n; i += 64) s3 += m[i];
		double t5 = now(); long f3 = minflt();
		munmap((void *)m, n);

		double tp = now();
		m = mmap(NULL, n, PROT_READ, MAP_PRIVATE | MAP_POPULATE, fd, 0);
		double tp1 = now();
		long f4 = minflt(); double t6 = now(); uint64_t s4 = 0;
		for (size_t i = 0; i < n; i += 64) s4 += m[i];
		double t7 = now(); long f5 = minflt();
		munmap((void *)m, n);

		printf("rep %d: read(4K) %.3f s | mmap %.3f s (%ld minflt) | mmap+SEQUENTIAL %.3f s (%ld) | mmap(POPULATE) call %.3f s + touch %.3f s (%ld) | sums equal %d\n",
		       rep, t1 - t0, t3 - t2, f1 - f0, t5 - t4, f3 - f2, tp1 - tp, t7 - t6, f5 - f4,
		       sum == s2 && s2 == s3 && s3 == s4);
	}

	/* COW after fork: child writes every page of a 512 MiB private mapping */
	size_t big = 512u << 20;
	char *p = mmap(NULL, big, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
	memset(p, 1, big);
	for (int shared = 0; shared < 2; shared++) {
		char *q = p;
		if (shared) {
			q = mmap(NULL, big, PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);
			memset(q, 1, big);
		}
		fflush(stdout);
		pid_t pid = fork();
		if (pid == 0) {
			double c0 = now();
			for (size_t i = 0; i < big; i += 4096) q[i] = 2;
			printf("%s 512 MiB: child wrote every page in %.3f s\n",
			       shared ? "MAP_SHARED " : "MAP_PRIVATE", now() - c0);
			fflush(stdout);
			_exit(0);
		}
		waitpid(pid, NULL, 0);
	}

	/* hugetlb */
	void *h = mmap(NULL, 32u << 20, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB, -1, 0);
	printf("MAP_HUGETLB 32 MiB: %s\n", h == MAP_FAILED ? strerror(errno) : "ok");
	if (h != MAP_FAILED) { memset(h, 0, 32u << 20); }

	/* MAP_LOCKED / mlock: faults happen at mmap time */
	long g0 = minflt();
	char *l = mmap(NULL, 64u << 20, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS | MAP_LOCKED, -1, 0);
	long g1 = minflt();
	for (size_t i = 0; i < (64u << 20); i += 4096) l[i] = 1;
	long g2 = minflt();
	printf("MAP_LOCKED 64 MiB: %ld minor faults in mmap, %ld while touching\n", g1 - g0, g2 - g1);
	return 0;
}
```

## 측정 / 성능 비교

이 글에서 잰 값은 위 표와 출력이 전부입니다. 다른 작업과 VM을 나눠 쓰던 상태에서 한 번(파일 읽기는 세 번) 잰 값이라, 숫자보다 방향(`read` 대 `mmap`, CoW 대 shared, fault 수)을 보는 용도입니다. TLB miss와 디스크에서 처음 읽는 경우의 readahead는 재지 않았습니다.

## 자주 보는 함정

> ⚠️ 파일보다 긴 매핑

```c
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <unistd.h>

static void on_bus(int sig) { (void)sig; write(1, "SIGBUS\n", 7); _exit(1); }

int main(void)
{
	setvbuf(stdout, NULL, _IONBF, 0);
	signal(SIGBUS, on_bus);
	int fd = open("small.bin", O_RDWR | O_CREAT | O_TRUNC, 0644);
	ftruncate(fd, 4096);                         /* file is one page */
	char *p = mmap(NULL, 1 << 20, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
	printf("mmap 1 MiB over a 4 KiB file: %s\n", p == MAP_FAILED ? "failed" : "ok");
	p[4095] = 'a';
	printf("write at 4095: ok\n");
	printf("1 << 20 - 1 = %d\n", 1 << 20 - 1);
	p[(1 << 20) - 1] = 'x';                      /* beyond EOF */
	printf("write at (1 << 20) - 1: ok\n");
	return 0;
}
```

```text
mmap 1 MiB over a 4 KiB file: ok
write at 4095: ok
1 << 20 - 1 = 524288
SIGBUS
```

파일보다 긴 매핑도 `mmap` 자체는 성공합니다. 파일 끝을 넘은 page를 건드리는 순간 `SIGBUS`가 났습니다. 파일 크기는 `ftruncate`로 먼저 맞춥니다. 덧붙여 `1 << 20 - 1`은 `-`가 `<<`보다 먼저 계산되어 `1 << 19` = 524288입니다. gcc는 `-Wall`에서 이 줄에 `suggest parentheses around '-' inside '<<'` 경고를 냈습니다.

> ⚠️ 매핑을 풀지 않는 장시간 process

`munmap`을 빠뜨리면 process가 끝날 때까지 VMA가 쌓입니다. process당 VMA 수의 상한은 `vm.max_map_count`이고, v6.12 커널의 기본값은 `DEFAULT_MAX_MAP_COUNT`(`USHRT_MAX - MAPCOUNT_ELF_CORE_MARGIN` = 65530, `include/linux/mm.h:204`)인데, 이 Debian 13 VM은 Debian `linux-sysctl-defaults` 패키지가 설치한 `/usr/lib/sysctl.d/50-default.conf`(systemd에서 가져온 파일)가 `vm.max_map_count = 1048576`으로 올려 두었습니다(`cat /proc/sys/vm/max_map_count`로 확인). 임베디드 rootfs에 이런 설정이 없으면 커널 기본값이 적용됩니다.

> ⚠️ Huge page 예약 없이 `MAP_HUGETLB`

위 실행처럼 `HugePages_Total`이 0이면 `MAP_HUGETLB`는 `ENOMEM`입니다. 부팅 명령줄의 `hugepages=` 또는 `/proc/sys/vm/nr_hugepages`로 먼저 예약합니다. 예약한 page는 다른 용도로 쓰이지 않으므로 필요한 만큼만 잡습니다.

## 정리

- `mmap`은 익명/파일 × private/shared 네 조합을 한 호출로 표현하고, 각 조합에서 쓰기가 어디까지 보이는지가 다릅니다.
- page cache에 있는 파일은 `mmap` 직접 접근이 `read` 루프보다 짧았고, 파일 fault는 64 KiB(`fault_around_bytes`)씩 붙었습니다.
- `MAP_POPULATE`·`MAP_LOCKED`는 fault를 `mmap` 시점으로 옮겨 실행 중 fault를 없앱니다.
- `fork` 뒤 private 매핑 전체에 쓰면 CoW 복사 비용이 납니다. 이 실행에서는 shared보다 약 3배였습니다.
- `MAP_HUGETLB`는 예약이 있어야 하고, THP는 예약 없이 익명 메모리에 2 MiB page를 시도하다가 빈 2 MiB 블록이 없으면 4 KiB로 물러섭니다.
- 파일보다 긴 매핑은 끝을 넘는 순간 `SIGBUS`이고, 연산자 우선순위로 오프셋이 틀어지는 실수는 `-Wall`이 잡습니다.

다음 편은 **epoll**입니다.

## 관련 항목

- [7-06: Kernel Module](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-07: 캐릭터 드라이버](/blog/embedded/modern-recipes/part7-07-char-driver)
- [7-11: UIO·VFIO](/blog/embedded/modern-recipes/part7-11-uio-vfio)
- [12-10: Zero-Copy](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
