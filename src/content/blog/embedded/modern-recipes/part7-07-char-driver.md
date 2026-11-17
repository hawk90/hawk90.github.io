---
title: "캐릭터 드라이버 작성 — file_operations·cdev·register_chrdev"
slug: "embedded/modern-recipes/part7-07-char-driver"
date: 2026-04-16T09:06:00
description: "file_operations, cdev, minor 번호, copy_to/from_user, blocking I/O, misc device 단축 경로까지 character driver의 표준 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 81
tags: [recipes, linux, char-driver]
topics: ["embedded"]
---

## 한 줄 요약

> **"Character driver = `file_operations` 한 구조체."** open, read, write, ioctl 함수 포인터를 채우고 `cdev_add`로 등록하면 `/dev/foo`가 살아납니다. 이 글의 driver는 한 파일로 cdev와 misc device를 함께 등록하고, Debian 13 arm64(커널 `6.12.116+deb13-arm64`)에서 빌드·로드해 사용자 공간 프로그램으로 read·write·poll·ioctl 경로를 시험했습니다.

## 어떤 상황에서 쓰나

새 센서나 외부 FPGA처럼 사용자 공간에 장치 접근을 열어 줘야 할 때, character driver는 가장 단순한 출발점입니다. 커널에는 장치 종류별 틀이 있습니다. 블록 장치는 block layer, 네트워크 장치는 net core, 센서는 IIO, 입력 장치는 input subsystem이 맡습니다. 이런 틀에 맞지 않거나 아직 형태가 정해지지 않은 장치를 시험할 때 char driver로 `read`·`write`·`ioctl` 몇 개를 먼저 열어 봅니다.

비유하면 `file_operations`는 식당의 주문표입니다. 손님(사용자 공간)은 늘 같은 방식(`read`, `write`, `ioctl` system call)으로 주문하고, 주방(driver)은 주문표에 적힌 함수로 그 주문을 처리합니다.

## 핵심 개념

| 요소 | 역할 | 이 글의 실행에서 본 값 |
|------|------|------|
| major / minor | `/dev` 노드를 driver에 연결하는 번호 | `mychar` 235:0, `mymisc` 10:261 |
| `cdev` | 커널 내부의 char device 객체 | `sizeof(struct cdev)` = 104 B |
| `file_operations` | system call과 driver 함수의 대응표 | 아래 코드 |
| class / device | `/sys/class/<이름>/`과 devtmpfs가 만드는 `/dev/<이름>` | `/sys/class/mychar/mychar` |
| misc device | major 10을 공유하고 minor 하나를 받는 단축 경로 | `sizeof(struct miscdevice)` = 80 B |

구조체 크기는 이 driver가 로드될 때 `sizeof`로 찍은 값이고, 커널 설정과 아키텍처에 따라 다릅니다.

## 코드 / 실제 사용 예

### 전체 driver

아래 여섯 블록을 순서대로 이어 붙이면 이 글에서 빌드한 `mychar.c` 한 파일이 됩니다. 첫 블록은 header와 공유 상태입니다. 여러 프로세스가 동시에 열 수 있으므로 공유 상태는 mutex 하나로 보호합니다.

```c
// SPDX-License-Identifier: GPL-2.0
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/fs.h>
#include <linux/miscdevice.h>
#include <linux/module.h>
#include <linux/mutex.h>
#include <linux/poll.h>
#include <linux/uaccess.h>
#include <linux/wait.h>

#define DEV_NAME "mychar"
#define MYDEV_IOC_MAGIC 'k'
#define MYDEV_GET_VAL   _IOR(MYDEV_IOC_MAGIC, 1, int)
#define MYDEV_SET_VAL   _IOW(MYDEV_IOC_MAGIC, 2, int)

static dev_t devno;
static struct cdev mycdev;
static struct class *mycls;

static DEFINE_MUTEX(lock);            /* protects value, msg, msg_len */
static DECLARE_WAIT_QUEUE_HEAD(rq);
static int value;
static char msg[64];
static size_t msg_len;                /* 0 = nothing to read yet */
```

`read`와 `write`입니다. 사용자 공간 pointer는 `copy_to_user`·`copy_from_user`로만 다룹니다. `copy_*_user`는 사용자 페이지가 없으면 page fault를 처리하느라 잠들 수 있습니다. 그동안 lock을 쥐고 있지 않도록, mutex 안에서는 커널 버퍼(`kbuf`)로만 복사하고 사용자 공간 복사는 lock 밖에서 합니다. `read`는 `O_NONBLOCK`이면 `-EAGAIN`을, 아니면 wait queue에서 메시지가 올 때까지 잠듭니다. `write`가 메시지를 넣고 `wake_up_interruptible`로 깨웁니다.

```c
static ssize_t my_read(struct file *f, char __user *buf, size_t cnt, loff_t *off)
{
	char kbuf[64];
	size_t len;

	if (f->f_flags & O_NONBLOCK) {
		if (!READ_ONCE(msg_len))
			return -EAGAIN;
	} else if (wait_event_interruptible(rq, READ_ONCE(msg_len))) {
		return -ERESTARTSYS;
	}

	mutex_lock(&lock);
	len = min(cnt, msg_len);
	memcpy(kbuf, msg, len);
	msg_len = 0;                      /* one reader consumes the message */
	mutex_unlock(&lock);

	if (copy_to_user(buf, kbuf, len))
		return -EFAULT;
	return len;
}

static ssize_t my_write(struct file *f, const char __user *buf, size_t cnt, loff_t *off)
{
	char kbuf[64];

	if (cnt > sizeof(kbuf))
		cnt = sizeof(kbuf);
	if (copy_from_user(kbuf, buf, cnt))
		return -EFAULT;

	mutex_lock(&lock);
	memcpy(msg, kbuf, cnt);
	WRITE_ONCE(msg_len, cnt);
	mutex_unlock(&lock);
	wake_up_interruptible(&rq);
	return cnt;
}
```

`poll`은 `select`·`poll`·`epoll`이 이 fd를 기다릴 수 있게 합니다. `poll_wait`는 기다릴 wait queue를 등록할 뿐 잠들지 않고, 지금 읽을 수 있는지만 돌려줍니다.

```c
static __poll_t my_poll(struct file *f, poll_table *wait)
{
	poll_wait(f, &rq, wait);
	return READ_ONCE(msg_len) ? (EPOLLIN | EPOLLRDNORM) : 0;
}
```

`ioctl` 번호는 `_IOR`·`_IOW` 매크로가 방향·크기·magic·번호를 한 정수에 담습니다. 모르는 명령에는 `-ENOTTY`를 돌려줍니다.

```c
static long my_ioctl(struct file *f, unsigned int cmd, unsigned long arg)
{
	int val;

	switch (cmd) {
	case MYDEV_GET_VAL:
		mutex_lock(&lock);
		val = value;
		mutex_unlock(&lock);
		if (copy_to_user((int __user *)arg, &val, sizeof(val)))
			return -EFAULT;
		return 0;
	case MYDEV_SET_VAL:
		if (copy_from_user(&val, (int __user *)arg, sizeof(val)))
			return -EFAULT;
		mutex_lock(&lock);
		value = val;
		mutex_unlock(&lock);
		return 0;
	default:
		return -ENOTTY;
	}
}
```

같은 `fops`를 cdev와 misc device가 함께 씁니다. `.owner = THIS_MODULE`은 이 장치가 열려 있는 동안 모듈이 내려가지 않게 합니다. cdev 노드를 열면 `chrdev_open`이 `cdev_get()`으로 `mycdev.owner`의 모듈 참조를, `fops_get()`으로 `fops.owner`의 참조를 잡습니다(v6.12 `fs/char_dev.c:348-353`, `:408`). misc 노드는 `misc_open`의 `fops_get()`이 `fops.owner`만 잡습니다(`drivers/char/misc.c:135`). 독립 검증에서 `/dev/mychar`를 연 채로는 모듈 refcount가 2, `/dev/mymisc`는 1이었고, 두 경우 모두 `rmmod`가 `Module mychar is in use`로 거부됐습니다.

```c
static const struct file_operations fops = {
	.owner          = THIS_MODULE,
	.read           = my_read,
	.write          = my_write,
	.poll           = my_poll,
	.unlocked_ioctl = my_ioctl,
};

static struct miscdevice my_misc = {
	.minor = MISC_DYNAMIC_MINOR,
	.name  = "mymisc",
	.fops  = &fops,
};
```

등록은 `alloc_chrdev_region` → `cdev_add` → `class_create` → `device_create` → `misc_register` 순서이고, 실패하면 goto 라벨로 거꾸로 되돌립니다. Exit는 등록의 역순입니다.

```c
static int __init mod_init(void)
{
	struct device *dev;
	int ret;

	ret = alloc_chrdev_region(&devno, 0, 1, DEV_NAME);
	if (ret)
		return ret;

	cdev_init(&mycdev, &fops);
	mycdev.owner = THIS_MODULE;
	ret = cdev_add(&mycdev, devno, 1);
	if (ret)
		goto err_region;

	mycls = class_create(DEV_NAME);
	if (IS_ERR(mycls)) {
		ret = PTR_ERR(mycls);
		goto err_cdev;
	}

	dev = device_create(mycls, NULL, devno, NULL, DEV_NAME);
	if (IS_ERR(dev)) {
		ret = PTR_ERR(dev);
		goto err_class;
	}

	ret = misc_register(&my_misc);
	if (ret)
		goto err_device;

	pr_info("mychar: major=%d minor=%d, misc minor=%d, sizeof(struct cdev)=%zu sizeof(struct miscdevice)=%zu\n",
		MAJOR(devno), MINOR(devno), my_misc.minor,
		sizeof(struct cdev), sizeof(struct miscdevice));
	return 0;

err_device:
	device_destroy(mycls, devno);
err_class:
	class_destroy(mycls);
err_cdev:
	cdev_del(&mycdev);
err_region:
	unregister_chrdev_region(devno, 1);
	return ret;
}

static void __exit mod_exit(void)
{
	misc_deregister(&my_misc);
	device_destroy(mycls, devno);
	class_destroy(mycls);
	cdev_del(&mycdev);
	unregister_chrdev_region(devno, 1);
}

module_init(mod_init);
module_exit(mod_exit);
MODULE_LICENSE("GPL");
```

빌드는 [7-06](/blog/embedded/modern-recipes/part7-06-kernel-module)과 같은 Kbuild Makefile(`obj-m += mychar.o`)로 했고, 경고 없이 빌드됐습니다.

### 등록 결과

```bash
insmod mychar.ko
dmesg
ls -l /dev/mychar /dev/mymisc
grep -E "mychar|misc" /proc/devices
ls /sys/class/mychar/
```

```text
[ 4132.654242] mychar: major=235 minor=0, misc minor=261, sizeof(struct cdev)=104 sizeof(struct miscdevice)=80
crw------- 1 root root 235,   0 Nov 16 14:12 /dev/mychar
crw------- 1 root root  10, 261 Nov 16 14:12 /dev/mymisc
 10 misc
235 mychar
mychar
```

`alloc_chrdev_region`이 major 235를 동적으로 받았고, `device_create`가 장치를 등록할 때 커널의 devtmpfs가 `/dev/mychar` 노드를 만들었습니다(`drivers/base/core.c:3646`의 `devtmpfs_create_node`). misc device는 major 10을 공유하고 minor 261을 받았습니다. misc core는 major 10 전체를 하나의 `register_chrdev`로 잡아 두고(`drivers/char/misc.c:297`), `misc_register`마다 misc class 아래 device만 만듭니다(`:243`). 그래서 cdev·class·device 생성을 `misc_register` 한 번이 대신하고, minor 하나만 필요한 작은 driver는 misc로 충분합니다.

### 사용자 공간에서 시험

시험 프로그램은 ioctl, 모르는 명령, non-blocking read, `poll`, blocking read를 차례로 부르고, 마지막에 `ioctl`과 `read`를 100만 번씩 불러 호출당 시간을 잽니다. 쓰는 쪽은 200 ms 뒤 `/dev/mychar`에 `ping\n`을 쓰는 thread입니다.

```c
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <pthread.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <time.h>
#include <unistd.h>

#define MYDEV_IOC_MAGIC 'k'
#define MYDEV_GET_VAL   _IOR(MYDEV_IOC_MAGIC, 1, int)
#define MYDEV_SET_VAL   _IOW(MYDEV_IOC_MAGIC, 2, int)

static const char *path;

static double now(void)
{
	struct timespec ts;
	clock_gettime(CLOCK_MONOTONIC, &ts);
	return ts.tv_sec + ts.tv_nsec / 1e9;
}

static void *writer(void *arg)
{
	(void)arg;
	usleep(200000);                       /* 200 ms later */
	int fd = open(path, O_WRONLY);
	write(fd, "ping\n", 5);
	close(fd);
	return NULL;
}

int main(int argc, char **argv)
{
	path = argc > 1 ? argv[1] : "/dev/mychar";
	int fd = open(path, O_RDWR);
	if (fd < 0) { perror("open"); return 1; }

	int v = 42, r = 0;
	ioctl(fd, MYDEV_SET_VAL, &v);
	ioctl(fd, MYDEV_GET_VAL, &r);
	printf("ioctl: set 42, got %d (GET=0x%lx SET=0x%lx)\n", r,
	       (unsigned long)MYDEV_GET_VAL, (unsigned long)MYDEV_SET_VAL);
	int ret = ioctl(fd, 0x1234, 0);
	printf("unknown cmd: ret=%d errno=%s\n", ret, strerror(errno));

	int nb = open(path, O_RDONLY | O_NONBLOCK);
	char buf[64];
	ret = read(nb, buf, sizeof buf);
	printf("nonblocking read, empty: ret=%d errno=%s\n", ret, strerror(errno));

	struct pollfd p = { .fd = fd, .events = POLLIN };
	printf("poll(timeout=0): %d\n", poll(&p, 1, 0));

	pthread_t t;
	pthread_create(&t, NULL, writer, NULL);
	double t0 = now();
	ret = poll(&p, 1, 5000);
	printf("poll(timeout=5000): %d revents=0x%x after %.0f ms\n", ret, p.revents, (now() - t0) * 1e3);
	ret = read(fd, buf, sizeof buf);
	printf("read: %d bytes \"%.*s\"\n", ret, ret > 0 ? ret - 1 : 0, buf);
	pthread_join(t, NULL);

	pthread_create(&t, NULL, writer, NULL);
	t0 = now();
	ret = read(fd, buf, sizeof buf);         /* blocks until the writer */
	printf("blocking read returned %d after %.0f ms\n", ret, (now() - t0) * 1e3);
	pthread_join(t, NULL);

	enum { N = 1000000 };
	t0 = now();
	for (int i = 0; i < N; i++)
		ioctl(fd, MYDEV_GET_VAL, &r);
	printf("ioctl GET: %.0f ns/call (N=%d)\n", (now() - t0) / N * 1e9, N);
	t0 = now();
	for (int i = 0; i < N; i++)
		read(nb, buf, 1);
	printf("read O_NONBLOCK (EAGAIN path): %.0f ns/call (N=%d)\n", (now() - t0) / N * 1e9, N);
	return 0;
}
```

```bash
gcc -O2 -Wall -pthread -o test test.c
./test /dev/mychar
```

```text
ioctl: set 42, got 42 (GET=0x80046b01 SET=0x40046b02)
unknown cmd: ret=-1 errno=Inappropriate ioctl for device
nonblocking read, empty: ret=-1 errno=Resource temporarily unavailable
poll(timeout=0): 0
poll(timeout=5000): 1 revents=0x1 after 205 ms
read: 5 bytes "ping"
blocking read returned 5 after 204 ms
ioctl GET: 156 ns/call (N=1000000)
read O_NONBLOCK (EAGAIN path): 143 ns/call (N=1000000)
```

`MYDEV_GET_VAL`은 `0x80046b01`입니다. 최상위 비트가 읽기 방향(`_IOR`), `0x04`가 `sizeof(int)`, `0x6b`가 magic `'k'`, `0x01`이 번호입니다. 모르는 명령의 `-ENOTTY`는 사용자 공간에서 `Inappropriate ioctl for device`로 보였습니다. `poll`은 쓰는 thread가 200 ms 뒤 깨울 때까지 기다렸다가 `POLLIN`(0x1)을 돌려줬고, blocking `read`도 같은 시점에 깨어났습니다.

같은 프로그램을 `/dev/mymisc`로 돌려도 같은 결과가 나왔습니다. 두 노드가 같은 `fops`와 같은 상태를 쓰기 때문입니다.

### Multiple minor

한 driver가 같은 종류의 장치 여러 개를 맡을 때는 minor 번호로 구분합니다. `open`에서 `iminor(inode)`로 몇 번째 장치인지 알아내 `file->private_data`에 그 인스턴스를 저장하면, 이후 `read`·`write`·`ioctl`이 그 pointer를 씁니다.

```c
static int my_open(struct inode *ino, struct file *f)
{
	unsigned int idx = iminor(ino);

	if (idx >= ARRAY_SIZE(my_instances))
		return -ENODEV;
	f->private_data = &my_instances[idx];
	return 0;
}
```

이 조각은 `alloc_chrdev_region(&devno, 0, N, ...)`과 `cdev_add(&cdev, devno, N)`으로 minor N개를 등록한 경우를 가정하며, 위 driver에는 들어 있지 않아 실행하지 않았습니다.

## 측정 / 성능 비교

위 시험의 숫자는 Debian 13 arm64 VM(Apple Silicon Mac의 QEMU `-accel hvf`, vCPU 6, 다른 작업과 공유) 한 대에서 한 번 잰 값입니다.

| 호출 | 시간 |
| --- | ---: |
| `ioctl(MYDEV_GET_VAL)` (mutex + 4 B `copy_to_user`) | 156 ns/call |
| `read` on `O_NONBLOCK`, 빈 상태 (`-EAGAIN`으로 바로 반환) | 143 ns/call |
| `syscall(SYS_getppid)` (driver 없는 system call, 같은 VM에서 따로 잼) | 117~126 ns/call |

driver 안의 일(mutex + 4 B `copy_to_user`)은 두 값의 차이인 13 ns 정도였습니다. 같은 VM에서 driver를 거치지 않는 `getppid`를 같은 방법으로 100만 번 부르면 호출당 117~126 ns였으므로, 이 VM에서 호출당 시간의 대부분은 system call 진입·복귀 비용입니다(`getppid` 측정 프로그램은 위 시험 프로그램과 같은 `clock_gettime` 루프). 작은 값을 자주 주고받는 driver라면 호출 횟수를 줄이는 설계(한 번에 여러 값을 넘기기)가 driver 안의 최적화보다 효과가 큽니다. 큰 데이터를 주고받는 경우의 `mmap`은 [7-09](/blog/embedded/modern-recipes/part7-09-mmap)에서 다룹니다.

## 자주 보는 함정

> ⚠️ `copy_to_user` 없이 사용자 pointer에 직접 접근

```c
static ssize_t bad_read(struct file *f, char __user *buf, size_t cnt, loff_t *off)
{
	buf[0] = 0x68;          /* direct store through a __user pointer */
	return 1;
}
```

`__user` pointer를 직접 쓰면 그 주소가 사용자 공간에 매핑되어 있는지, 사용자가 커널 주소를 넘긴 것은 아닌지 확인하지 않습니다. 이런 실수는 sparse가 잡습니다. `make C=2`로 빌드하자(sparse 0.6.4) 다음 경고가 나왔습니다.

```text
/root/p7/707b/bad.c:7:12: warning: dereference of noderef expression
```

> ⚠️ Error path에서 cleanup 누락

```c
ret = cdev_add(&mycdev, devno, 1);
if (ret)
	return ret;   /* unregister_chrdev_region() missing */
```

위 driver처럼 등록 단계마다 goto 라벨을 두고, 실패한 지점부터 거꾸로 풀어야 합니다. exit에서 해제를 빠뜨리면 다음 로드가 어떻게 실패하는지는 [7-06](/blog/embedded/modern-recipes/part7-06-kernel-module)의 `sysfs: cannot create duplicate filename` 실행에서 봤습니다.

> ⚠️ 동시 접근을 막지 않은 공유 변수

```c
static int g_counter;                 /* plain int, no lock */
static atomic_t a_counter = ATOMIC_INIT(0);

static ssize_t racy_write(struct file *f, const char __user *buf, size_t cnt, loff_t *off)
{
	g_counter++;                  /* load, add, store: not atomic */
	atomic_inc(&a_counter);
	return cnt;
}
```

이 `write`를 가진 misc device를 만들고, thread 6개가 각각 100만 번 1바이트를 썼습니다. 두 번 돌린 결과는 다음과 같습니다.

```text
expected=6000000
plain=4662302 atomic=6000000
expected=6000000
plain=4733924 atomic=6000000
```

`g_counter++`는 읽기·더하기·쓰기 세 단계라서, 두 CPU가 같은 값을 읽고 각각 1을 더해 쓰면 한 번이 사라집니다. 이 두 실행에서는 21~22%가 사라졌고(같은 조건으로 다시 돌린 독립 검증에서는 10~17%), `atomic_inc`는 한 번도 잃지 않았습니다. 여러 값을 함께 바꿔야 하면 위 driver처럼 mutex로 묶습니다.

> ⚠️ 커널 stack에 큰 지역 변수

```c
static ssize_t big_write(struct file *f, const char __user *ubuf, size_t cnt, loff_t *off)
{
	char buf[8192];         /* 8 KiB on the kernel stack */

	if (copy_from_user(buf, ubuf, min(cnt, sizeof(buf))))
		return -EFAULT;
	return buf[0];
}
```

arm64 커널 stack은 KASAN이 없고 page가 16 KiB 이하일 때 `THREAD_SHIFT` 14, 즉 16 KiB입니다(v6.12 `arch/arm64/include/asm/memory.h:115-125`). 이 Debian 커널은 `CONFIG_ARM64_4K_PAGES=y`이고 `CONFIG_FRAME_WARN=2048`이라, 이 함수는 빌드 때 경고가 났습니다.

```text
/root/p7/707b/bad.c:18:1: warning: the frame size of 8208 bytes is larger than 2048 bytes [-Wframe-larger-than=]
```

한 함수가 stack의 절반을 쓰면 그 아래로 부르는 함수들이 남은 공간을 나눠 써야 합니다. 큰 버퍼는 `kmalloc`으로 잡거나, 위 driver처럼 64 B 같은 작은 고정 크기로 나눠 처리합니다.

> ⚠️ 고정 major 번호

```c
register_chrdev(123, "foo", &fops);   /* fixed major */
```

고정 번호는 다른 driver가 이미 쓰고 있으면 등록이 실패합니다. 위 driver는 `alloc_chrdev_region`으로 빈 번호(이 실행에서는 235)를 받았습니다. 공식으로 배정된 번호 목록은 커널의 `Documentation/admin-guide/devices.txt`에 있습니다.

## 정리

- Character driver의 핵심은 `file_operations` 함수 pointer 표 하나입니다.
- 사용자 pointer는 `copy_to_user`·`copy_from_user`로만 다루고, sparse(`make C=2`)가 직접 접근을 잡습니다.
- `ioctl` 번호는 `_IOR`·`_IOW`가 방향·크기·magic·번호를 담아 만들고, 모르는 명령에는 `-ENOTTY`를 돌려줍니다.
- Blocking read는 wait queue + `wake_up`, `poll`은 `poll_wait` + 준비 상태 반환으로 구현합니다.
- 작은 driver는 misc device 등록 한 번으로 cdev·class·device 생성을 대신합니다.
- 공유 상태는 mutex나 atomic으로 보호합니다. 보호하지 않은 `++`는 이 실행에서 21~22%를 잃었습니다.
- 등록 실패 경로는 goto 라벨로 역순 해제합니다.

다음 편은 **Platform 드라이버**입니다. DT match와 probe/remove 흐름을 다룹니다.

## 관련 항목

- [7-06: Kernel Module 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-08: Platform 드라이버](/blog/embedded/modern-recipes/part7-08-platform-driver)
- [7-09: mmap](/blog/embedded/modern-recipes/part7-09-mmap)
- [7-12: sysfs](/blog/embedded/modern-recipes/part7-12-sysfs)
