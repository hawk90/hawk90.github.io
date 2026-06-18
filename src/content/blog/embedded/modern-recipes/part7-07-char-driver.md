---
title: "캐릭터 드라이버 작성 — file_operations·cdev·register_chrdev"
date: 2026-04-16T09:06:00
description: "file_operations, cdev, minor 번호, copy_to/from_user, blocking I/O, misc device 단축 경로까지 character driver의 표준 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 81
tags: [recipes, linux, char-driver]
---

## 한 줄 요약

> **"Character driver = `file_operations` 한 구조체."** open, read, write, ioctl 함수 포인터를 채우고 `cdev_add`로 등록하면 `/dev/foo`가 살아납니다.

## 어떤 상황에서 쓰나

새 sensor, 외부 FPGA, 사용자 공간에 raw bus 접근을 노출해야 하는 device를 직접 만들 때 character driver가 가장 단순한 출발점입니다. Block device (block layer가 답)나 network device (net core가 답)가 아닌 모든 device가 일반적으로 char로 시작합니다.

또 한 가지 흔한 상황은 정형 framework가 무거울 때입니다. IIO나 input subsystem 같은 표준은 강력하지만 prototype 단계에서는 overhead가 있습니다. char driver로 빠르게 ioctl 한두 개를 노출해 동작을 검증한 후 표준 subsystem으로 옮기는 흐름이 흔합니다.

## 핵심 개념

| 요소 | 역할 |
|------|------|
| major / minor | `/dev` node를 driver에 매핑하는 번호 |
| `cdev` | kernel 내부 char device 객체 |
| `file_operations` | syscall과 driver 함수의 mapping 표 |
| class / device | `/sys/class/foo/`와 `/dev/foo` 자동 생성 |

가장 단순한 골격입니다.

```c
static struct file_operations fops = {
    .owner   = THIS_MODULE,
    .open    = my_open,
    .release = my_release,
    .read    = my_read,
    .write   = my_write,
    .unlocked_ioctl = my_ioctl,
};
```

이 표가 있고 cdev로 등록하면 user 공간이 `/dev/foo`로 접근하는 모든 system call이 위 함수들로 dispatch됩니다.

## 코드 / 실제 사용 예

### 최소 char driver

```c
#include <linux/module.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/uaccess.h>
#include <linux/device.h>

#define DEV_NAME "mychar"
static dev_t devno;
static struct cdev mycdev;
static struct class *mycls;

static ssize_t my_read(struct file *f, char __user *buf, size_t cnt, loff_t *off) {
    const char msg[] = "hello\n";
    size_t len = strlen(msg);
    if (*off >= len) return 0;
    if (cnt > len - *off) cnt = len - *off;
    if (copy_to_user(buf, msg + *off, cnt)) return -EFAULT;
    *off += cnt;
    return cnt;
}

static struct file_operations fops = {
    .owner = THIS_MODULE,
    .read  = my_read,
};

static int __init mod_init(void) {
    alloc_chrdev_region(&devno, 0, 1, DEV_NAME);
    cdev_init(&mycdev, &fops);
    mycdev.owner = THIS_MODULE;
    cdev_add(&mycdev, devno, 1);

    mycls = class_create("mychar");
    device_create(mycls, NULL, devno, NULL, DEV_NAME);
    return 0;
}

static void __exit mod_exit(void) {
    device_destroy(mycls, devno);
    class_destroy(mycls);
    cdev_del(&mycdev);
    unregister_chrdev_region(devno, 1);
}

module_init(mod_init);
module_exit(mod_exit);
MODULE_LICENSE("GPL");
```

`alloc_chrdev_region`이 major+minor를 동적으로 받아오고, `device_create`가 udev에게 `/dev/mychar`를 만들어달라고 신호합니다.

### copy_to_user, copy_from_user

```c
static ssize_t my_write(struct file *f, const char __user *buf, size_t cnt, loff_t *off) {
    char kbuf[64];
    if (cnt > sizeof(kbuf)) cnt = sizeof(kbuf);
    if (copy_from_user(kbuf, buf, cnt))
        return -EFAULT;
    process(kbuf, cnt);
    return cnt;
}
```

User 공간 pointer를 kernel에서 직접 dereference하면 page fault나 보안 문제가 발생합니다. 반드시 `copy_to_user`나 `copy_from_user`로 통과시킵니다.

### ioctl 정의

```c
#define MYDEV_IOC_MAGIC 'k'
#define MYDEV_GET_VAL   _IOR(MYDEV_IOC_MAGIC, 1, int)
#define MYDEV_SET_VAL   _IOW(MYDEV_IOC_MAGIC, 2, int)

static long my_ioctl(struct file *f, unsigned int cmd, unsigned long arg) {
    int val;
    switch (cmd) {
    case MYDEV_GET_VAL:
        val = current_value();
        if (copy_to_user((int __user *)arg, &val, sizeof(val))) return -EFAULT;
        break;
    case MYDEV_SET_VAL:
        if (copy_from_user(&val, (int __user *)arg, sizeof(val))) return -EFAULT;
        set_value(val);
        break;
    default:
        return -ENOTTY;
    }
    return 0;
}
```

`_IOR`, `_IOW`, `_IOWR` 매크로가 cmd 번호 encoding을 자동으로 해줍니다. user 공간 header에 같은 매크로를 두면 양쪽이 일치합니다.

### Blocking read with wait queue

```c
static DECLARE_WAIT_QUEUE_HEAD(rq);
static int data_ready;

static ssize_t my_read(struct file *f, char __user *buf, size_t cnt, loff_t *off) {
    if (wait_event_interruptible(rq, data_ready))
        return -ERESTARTSYS;
    data_ready = 0;
    return copy_data(buf, cnt);
}

static irqreturn_t my_isr(int irq, void *dev) {
    data_ready = 1;
    wake_up_interruptible(&rq);
    return IRQ_HANDLED;
}
```

ISR이 wake_up_interruptible로 read를 깨우는 표준 패턴입니다. user 공간은 그냥 read를 부르면 데이터가 올 때까지 sleep합니다.

### poll 지원

```c
static __poll_t my_poll(struct file *f, poll_table *wait) {
    poll_wait(f, &rq, wait);
    return data_ready ? (EPOLLIN | EPOLLRDNORM) : 0;
}

static struct file_operations fops = {
    ...
    .poll = my_poll,
};
```

select/poll/epoll을 지원하려면 `.poll`을 채웁니다. user 공간이 여러 fd를 동시에 기다릴 수 있게 됩니다.

### Misc device — 단축 경로

```c
#include <linux/miscdevice.h>

static struct miscdevice my_misc = {
    .minor = MISC_DYNAMIC_MINOR,
    .name  = "mychar",
    .fops  = &fops,
};

static int __init init(void) { return misc_register(&my_misc); }
static void __exit exit(void) { misc_deregister(&my_misc); }
```

misc device는 cdev, class, device_create를 한 번에 처리해줍니다. minor 번호 한 개만 필요한 작은 driver는 misc로 충분합니다.

### Multiple minor

```c
static int my_open(struct inode *ino, struct file *f) {
    int idx = iminor(ino);
    f->private_data = &my_instances[idx];
    return 0;
}
```

한 driver가 여러 device를 처리할 때 minor 번호로 구분합니다. `file->private_data`에 instance pointer를 저장해 다음 호출에서 사용합니다.

## 측정 / 성능 비교

```text
연산                              시간 (x86_64)
syscall (open/close)              ~600 ns
read (1 byte from char driver)    ~700 ns
copy_to_user (1 KB)               ~400 ns
ioctl                             ~500 ns
mmap → user 직접 접근             initial 1 µs, 이후 0
```

대용량 데이터는 read/write보다 mmap이 거의 항상 더 빠릅니다. Char driver의 read/write는 *작은 메시지나 control용*입니다.

```text
RAM 사용량
char driver (cdev)                ~64 B per device
misc device                       ~96 B (cdev 내장)
class + device entry              ~수백 B (udev attribute 포함)
```

## 자주 보는 함정

> `copy_to_user` 빼고 직접 access

```c
static ssize_t my_read(... char __user *buf, ...) {
    buf[0] = 'h';   /* kernel oops 또는 보안 사고 */
}
```

`__user` annotation이 붙은 pointer는 절대 직접 dereference하지 않습니다. sparse가 잡아주니 `make C=2`로 build해 확인합니다.

> Error path에서 cleanup 누락

```c
cdev_add(&c, ...);
if (oh_no) return -ENOMEM;   /* unregister_chrdev_region 누락 */
```

부분 등록 후 error path에서 unwind를 빠뜨리면 module reload가 충돌합니다. goto 라벨 패턴으로 cleanup을 일원화합니다.

> Concurrency 미고려

```c
static int g_counter;
static ssize_t my_write(...) { g_counter++; }    /* race */
```

여러 user가 동시에 driver를 열 수 있습니다. `atomic_inc` 또는 mutex로 보호합니다.

> Large stack 변수

```c
static ssize_t my_write(...) {
    char buf[8192];   /* 8 KB on kernel stack — overflow */
}
```

Kernel stack은 보통 16 KB입니다. 큰 buffer는 `kmalloc`이나 `vmalloc`을 씁니다.

> Major/minor 충돌

```c
register_chrdev(123, ...);   /* fixed major — 이미 사용 중일 수 있음 */
```

`alloc_chrdev_region`으로 동적 할당하는 편이 안전합니다. fixed major는 정말 합리적인 이유가 있을 때만 씁니다.

## 정리

- Character driver의 본질은 `file_operations` 함수 포인터 표 한 개입니다.
- User pointer는 반드시 `copy_to_user`나 `copy_from_user`를 거칩니다.
- ioctl 번호는 `_IOR`, `_IOW`, `_IOWR` 매크로로 정의합니다.
- Blocking read는 wait queue + wake_up 조합으로 구현합니다.
- 작은 driver는 misc device 한 줄 등록이 가장 간단합니다.
- Error path에서 goto 패턴으로 cleanup을 일원화합니다.
- 대용량 데이터에는 read/write보다 mmap이 더 적합합니다.

다음 편은 **Platform 드라이버**입니다. DT match와 probe/remove 흐름을 다룹니다.

## 관련 항목

- [7-06: Kernel Module 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-08: Platform 드라이버](/blog/embedded/modern-recipes/part7-08-platform-driver)
- [4-02: mmap](/blog/embedded/modern-recipes/part7-09-mmap)
- [4-05: sysfs](/blog/embedded/modern-recipes/part7-12-sysfs)
