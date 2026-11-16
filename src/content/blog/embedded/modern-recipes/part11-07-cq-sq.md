---
title: "Command Queue·Submission Queue — NVMe·XDMA 공통 패턴"
slug: "embedded/modern-recipes/part11-07-cq-sq"
date: 2026-04-20T09:06:00
description: "Submission/Completion Queue 패턴을 NVMe·io_uring으로 정리합니다. phase bit ring을 C로 흉내 내고, QEMU NVMe에서 queue depth별 doorbell 횟수와 io_uring 일괄 제출을 trace로 직접 셉니다."
series: "Modern Embedded Recipes"
seriesOrder: 129
tags: [recipes, cq, sq, nvme, xdma, io_uring]
topics: ["embedded"]
---

## 한 줄 요약

> **"SQ·CQ는 producer-consumer ring 두 개와 doorbell로 host와 device를 비동기로 잇는 구조입니다."** host는 명령을 여러 개 쌓아 두고 doorbell 한 번으로 알리고, device는 끝난 순서대로 완료를 써 넣습니다.

## 어떤 상황에서 쓰나

[앞 편의 mailbox](/blog/embedded/modern-recipes/part11-06-mailbox)는 명령 하나를 보내고 응답을 기다리는 구조라 한 번에 명령 하나만 떠 있습니다. 장치가 여러 명령을 동시에 처리할 수 있다면 이 구조가 병목이 됩니다. 식당으로 치면 mailbox는 주문 하나를 받고 음식이 나올 때까지 다음 손님을 받지 않는 카운터이고, SQ·CQ는 주문서를 꽂는 레일(SQ)과 완성된 음식을 올려 두는 선반(CQ)이 따로 있는 주방입니다.

NVMe가 이 모델의 대표입니다. Linux의 io_uring도 같은 모양의 ring 두 개를 user space와 커널 사이에 둡니다. 반면 Xilinx XDMA는 겉보기와 달리 다른 모델을 쓰는데, 아래에서 소스로 비교합니다.

### 이 글의 실행 환경

- ring 동작 모델: C로 작성해 macOS의 Apple clang 21.0.0으로 빌드하고 실행했습니다.
- NVMe: QEMU 11.1.3 `-device nvme`(root port 아래), Debian 13 arm64 guest, 커널 `6.12.116+deb13-arm64`, fio 3.39, nvme-cli 2.13, liburing 2.9. doorbell 횟수는 QEMU의 trace event `pci_nvme_mmio_doorbell_sq`/`_cq`를 monitor에서 켜고 센 것입니다.
- 모든 IOPS·지연은 에뮬레이션된 NVMe의 값이라 실제 SSD 성능이 아닙니다. 이 글에서는 doorbell을 *몇 번* 치는지만 비교에 씁니다.

## 핵심 개념

![NVMe SQ/CQ flow — host와 device의 비동기 통신](/images/blog/modern-recipes/diagrams/part5-02-cq-sq-flow.svg)

| 요소 | 역할 |
|------|------|
| SQ (Submission Queue) | host가 쓰고 device가 읽습니다 |
| CQ (Completion Queue) | device가 쓰고 host가 읽습니다 |
| Tail | producer가 다음에 쓸 자리 |
| Head | consumer가 다음에 읽을 자리 |
| Doorbell | 바뀐 tail(SQ) 또는 head(CQ)를 상대에게 알리는 MMIO 쓰기 |
| Phase bit | CQ entry가 이번 바퀴에 새로 쓰인 것인지 표시 |

ring이 비었는지는 `head == tail`, 가득 찼는지는 `(tail + 1) % depth == head`로 판단합니다. 가득 찬 상태와 빈 상태를 구분하려고 한 칸을 비워 두므로, depth 4인 ring에는 명령이 3개까지 들어갑니다.

NVMe에서 SQ entry와 CQ entry의 크기는 고정입니다. Linux 6.12 `drivers/nvme/host/core.c`는 `BUILD_BUG_ON(sizeof(struct nvme_command) != 64)`로 64바이트를 강제하고, 16바이트 `struct nvme_completion`(`include/linux/nvme.h`)은 result, `sq_head`, `sq_id`, `command_id`, `status`를 담습니다. VM의 QEMU NVMe 컨트롤러도 Identify 결과에서 같은 값을 보고합니다(`sqes`/`cqes`의 하위 4비트가 필요 크기 2^n, 상위 4비트가 최대 크기 2^n).

```text
$ nvme id-ctrl /dev/nvme0 | grep -E "^(vid|mn|sn|oacs|sqes|cqes|maxcmd|nn) "
vid       : 0x1b36
sn        : p11a0001
mn        : QEMU NVMe Ctrl
oacs      : 0x12b
sqes      : 0x66
cqes      : 0x44
maxcmd    : 0
nn        : 256
$ nvme id-ctrl /dev/nvme0 -H | grep -A2 -E "^sqes"
sqes      : 0x66
  [7:4] : 0x6	Max SQ Entry Size (64)
  [3:0] : 0x6	Min SQ Entry Size (64)
```

`0x66`은 2^6 = 64바이트, `0x44`는 2^4 = 16바이트입니다.

## Phase bit — wrap 이후의 낡은 entry 거르기

CQ는 ring이라 한 바퀴를 돌면 같은 자리에 다시 씁니다. host가 "이 자리에 entry가 있으면 새 완료"라고 판단하면, device가 아직 이번 바퀴의 완료를 쓰지 않았을 때 지난 바퀴의 entry를 새 것으로 착각합니다. NVMe는 CQ entry의 status 비트 0을 phase tag로 써서 이 문제를 풉니다. device는 바퀴마다 phase 값을 뒤집어 쓰고, host는 자기가 기대하는 phase와 같은 entry만 새 것으로 봅니다. Linux 6.12 `drivers/nvme/host/pci.c`의 `nvme_cqe_pending()`이 정확히 이 비교입니다.

```c
static inline bool nvme_cqe_pending(struct nvme_queue *nvmeq)
{
	struct nvme_completion *hcqe = &nvmeq->cqes[nvmeq->cq_head];

	return (le16_to_cpu(READ_ONCE(hcqe->status)) & 1) == nvmeq->cq_phase;
}
```

같은 구조를 한 프로세스 안에서 흉내 낸 depth 4짜리 ring입니다. `device()`는 doorbell 값까지 SQ를 소비해 CQ에 결과(인자 × 2)를 쓰고, 마지막 칸을 쓰면 phase를 뒤집습니다.

```c
#define DEPTH 4

struct sqe { uint16_t cid; uint32_t arg; };
struct cqe { uint32_t result; uint16_t cid; uint8_t status; uint8_t phase; };

static int q_submit(uint16_t cid, uint32_t arg)
{
    uint16_t next = (sq_tail + 1) % DEPTH;
    if (next == sq_head) return -1;        /* full: 한 칸은 비워 둔다 */
    sq[sq_tail] = (struct sqe){ cid, arg };
    sq_tail = next;
    return 0;
}

static int q_reap(struct cqe *out)
{
    struct cqe *e = &cq[cq_head];
    if (e->phase != cq_phase)              /* 이번 바퀴에 device가 쓴 entry가 아님 */
        return 0;
    *out = *e;
    if (++cq_head == DEPTH) { cq_head = 0; cq_phase ^= 1; }
    return 1;
}

/* 잘못된 예: phase 대신 "cid가 0이 아니면 새 entry"로 판단 */
static int q_reap_nophase(struct cqe *out)
{
    struct cqe *e = &cq[cq_head];
    if (e->cid == 0)
        return 0;
    *out = *e;
    return 1;
}
```

`main()`은 한 라운드에 명령 3개를 넣고 doorbell을 한 번 친 뒤 완료를 거둡니다. 세 라운드 뒤, device가 아무것도 쓰지 않은 상태에서 두 reap 함수를 비교합니다.

```text
$ cc -O2 -Wall -Wextra -o ring ring.c && ./ring
round 0: cid=1 res=2 cid=2 res=4 cid=3 res=6  (next phase 1, cq_head 3)
round 1: cid=4 res=8 cid=5 res=10 cid=6 res=12  (next phase 0, cq_head 2)
round 2: cid=7 res=14 cid=8 res=16 cid=9 res=18  (next phase 1, cq_head 1)
no new completion: phase check -> 0, nophase check -> 1 (stale cid=6)
full check: submit 4th into depth 4 ring -> -1
doorbell writes: 3 for 9 commands
```

새 완료가 없을 때 phase 검사는 0을 돌려주지만, "비어 있지 않으면 새 것" 검사는 지난 바퀴의 `cid=6`을 새 완료로 잘못 거둡니다. depth 4 ring에 네 번째 명령은 들어가지 않았고, 명령 9개를 doorbell 3번으로 알렸습니다.

## NVMe에서 doorbell은 몇 번 치는가

doorbell은 MMIO 쓰기라서 명령마다 치면 비용이 큽니다. Linux NVMe 드라이버는 이를 줄이도록 짜여 있습니다. 6.12 `drivers/nvme/host/pci.c`의 `nvme_queue_rq()`는 명령을 SQ에 복사한 뒤 `nvme_write_sq_db(nvmeq, bd->last)`를 부르고, `nvme_write_sq_db()`는 block layer가 "이번 묶음의 마지막"(`bd->last`)이라고 알려 줄 때만 doorbell을 씁니다(그 전에 ring이 한 바퀴 차는 경우는 예외로 씁니다). 묶음이 끝났는데 doorbell이 남아 있으면 `nvme_commit_rqs()`가 마저 씁니다. 여러 요청이 plug로 한꺼번에 내려오면(io_uring은 3개 이상 제출할 때 plug를 씁니다, `io_uring/io_uring.c`) blk-mq가 `nvme_queue_rqs()`를 부르고, `nvme_submit_cmds()`가 묶음 전체를 SQ에 복사한 뒤 doorbell을 한 번 씁니다.

하나 더 고려할 것이 있습니다. 이 QEMU 컨트롤러는 Doorbell Buffer Config(shadow doorbell)를 지원하고(`nvme id-ctrl -H`의 oacs bit 8), Linux는 이 기능이 있으면 doorbell 쓰기 전에 `nvme_dbbuf_update_and_check_event()`로 MMIO가 필요한지 확인합니다. VM에서 QEMU trace `pci_nvme_update_sq_eventidx`가 찍히는 것으로 이 기능이 켜진 것을 확인했습니다. 따라서 아래 숫자는 driver의 묶음 처리와 shadow doorbell 검사를 모두 거친 뒤 실제로 나간 MMIO doorbell 쓰기 횟수입니다.

QEMU NVMe에서 같은 4,096개의 4 KB random read를 queue depth만 바꿔 실행하고, CPU 0에 묶인 I/O queue 1의 doorbell 쓰기를 셌습니다.

```bash
fio --name=qd1 --filename=/dev/nvme0n1 --direct=1 --rw=randread --bs=4k \
    --ioengine=io_uring --number_ios=4096 --cpus_allowed=0 --size=128m \
    --norandommap --randrepeat=1 --iodepth=1
# qd32: --iodepth=32
# qd32b: --iodepth=32 --iodepth_batch_submit=32 --iodepth_batch_complete_min=32
```

| fio 설정 | 명령 수 | SQ doorbell | CQ doorbell |
|---|---|---|---|
| iodepth=1 | 4,096 | 4,096 | 4,096 |
| iodepth=32 | 4,096 | 153 | 140 |
| iodepth=32, batch submit/complete 32 | 4,096 | 128 | 133 |

queue depth 1에서는 명령마다 SQ doorbell과 CQ doorbell을 한 번씩 쳤습니다. depth 32에서는 SQ doorbell 153번, CQ doorbell 140번이었습니다. SQ 기준으로 명령 약 27개(4,096 ÷ 153 ≈ 26.8)를 doorbell 하나로 알린 셈입니다. 제출을 32개씩 묶으라고 fio에 지시하면 SQ doorbell은 4,096 ÷ 32 = 128번으로 정확히 맞아떨어집니다. 이 VM에서 queue 1의 CPU 매핑은 `/sys/block/nvme0n1/mq/0/cpu_list` = `0`이었고, guest의 NVMe I/O queue는 CPU 4개에 하나씩 4개였습니다(`nvme0: 4/0/0 default/read/poll queues`).

## io_uring — user space에서 쓰는 SQ·CQ

io_uring은 같은 ring 모델을 user space와 커널 사이에 둡니다. 여기서 "device" 역할은 커널입니다. 아래 프로그램은 서로 64 KB씩 떨어진 4 KB 읽기 8개를 SQ에 채우고 `io_uring_submit()` 한 번으로 제출한 뒤, 완료 8개를 거둡니다.

```c
#define _GNU_SOURCE
#include <fcntl.h>
#include <liburing.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

#define N 8

int main(void)
{
	struct io_uring ring;
	int fd = open("/dev/nvme0n1", O_RDONLY | O_DIRECT);
	if (fd < 0) { perror("open"); return 1; }
	if (io_uring_queue_init(64, &ring, 0) < 0) { perror("queue_init"); return 1; }
	printf("sq entries=%u cq entries=%u\n", ring.sq.ring_entries, ring.cq.ring_entries);

	void *buf[N];
	for (int i = 0; i < N; i++) {
		if (posix_memalign(&buf[i], 4096, 4096)) return 1;
		struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
		io_uring_prep_read(sqe, fd, buf[i], 4096, (off_t)i * 65536);   /* 64 KB 간격: 인접하지 않게 */
		io_uring_sqe_set_data64(sqe, i);
	}
	printf("submitted %d in one io_uring_submit()\n", io_uring_submit(&ring));

	for (int i = 0; i < N; i++) {
		struct io_uring_cqe *cqe;
		io_uring_wait_cqe(&ring, &cqe);
		printf("cqe user_data=%llu res=%d\n",
		       (unsigned long long)io_uring_cqe_get_data64(cqe), cqe->res);
		io_uring_cqe_seen(&ring, cqe);
	}
	io_uring_queue_exit(&ring);
	return 0;
}
```

`gcc -O2 -Wall -o uring_read uring_read.c -luring`로 빌드하고 `taskset -c 0`으로 CPU 0에서 돌린 결과와, 그동안 QEMU가 기록한 NVMe doorbell입니다.

```text
sq entries=64 cq entries=128
submitted 8 in one io_uring_submit()
cqe user_data=0 res=4096
cqe user_data=1 res=4096
cqe user_data=2 res=4096
cqe user_data=3 res=4096
cqe user_data=4 res=4096
cqe user_data=6 res=4096
cqe user_data=5 res=4096
cqe user_data=7 res=4096
# QEMU trace
pci_nvme_mmio_doorbell_sq sqid 1 new_tail 86
pci_nvme_mmio_doorbell_cq cqid 1 new_head 84
pci_nvme_mmio_doorbell_cq cqid 1 new_head 86
```

세 가지가 보입니다.

- io_uring의 SQ 64개에 CQ는 128개입니다. Linux 6.12 `io_uring/io_uring.c`는 따로 지정하지 않으면 `p->cq_entries = 2 * p->sq_entries`로 잡습니다.
- 8개 명령이 NVMe SQ에 들어갔지만(tail 78 → 86) SQ doorbell은 한 번이었습니다.
- 완료는 제출 순서와 다르게 왔습니다(6이 5보다 먼저). 그래서 CQ entry에는 어느 요청의 완료인지 알려 주는 값(io_uring의 `user_data`, NVMe의 `command_id`)이 반드시 들어갑니다.

같은 프로그램을 64 KB 간격 대신 연속한 offset(0, 4 KB, 8 KB, …)으로 돌렸을 때는 NVMe SQ tail이 1만 늘었습니다(77 → 78). block layer가 인접한 읽기 8개를 32 KB 명령 하나로 합친 것입니다. "제출한 개수 = 장치가 받은 명령 수"가 아니라는 점도 측정할 때 기억해 둡니다.

## Multi-queue — CPU마다 ring 한 쌍

NVMe는 admin queue 한 쌍과 I/O queue 여러 쌍을 둡니다. 위 VM에서 Linux는 CPU 4개에 I/O queue를 하나씩 만들었고(`/sys/block/nvme0n1/mq/{0..3}/cpu_list`가 각각 `0`, `1`, `2`, `3`), `/proc/interrupts`에도 `nvme0q0`(admin)부터 `nvme0q4`까지 인터럽트가 따로 있었습니다. 한 CPU가 자기 queue에만 제출하면 다른 CPU와 tail을 두고 다툴 일이 없습니다. 위 `nvme_commit_rqs()`가 `nvmeq->sq_lock`을 잡는 것처럼 드라이버는 여전히 queue마다 lock을 두지만, 경쟁 상대가 거의 없는 lock입니다.

## Xilinx XDMA는 무엇이 다른가

XDMA도 "host가 메모리에 작업 목록을 만들고 장치에 알린다"는 점은 같지만, 자료 구조는 ring이 아니라 linked list입니다. Xilinx `dma_ip_drivers` 저장소(commit `a918c51`)의 `XDMA/linux-kernel/xdma/libxdma.h`에서 descriptor는 이렇게 생겼습니다.

```c
struct xdma_desc {
	u32 control;
	u32 bytes;		/* transfer length in bytes */
	u32 src_addr_lo;	/* source address (low 32-bit) */
	u32 src_addr_hi;	/* source address (high 32-bit) */
	u32 dst_addr_lo;	/* destination address (low 32-bit) */
	u32 dst_addr_hi;	/* destination address (high 32-bit) */
	/*
	 * next descriptor in the single-linked list of descriptors;
	 * this is the PCIe (bus) address of the next descriptor in the
	 * root complex memory
	 */
	u32 next_lo;		/* next desc address (low 32-bit) */
	u32 next_hi;		/* next desc address (high 32-bit) */
} __packed;
```

전송을 시작하는 `libxdma.c`의 `engine_start()`도 tail doorbell이 아닙니다. 첫 descriptor의 bus 주소를 SGDMA 레지스터(`first_desc_lo`/`first_desc_hi`)에 쓰고, 이어서 부르는 `engine_start_mode_config()`가 엔진 control 레지스터에 `XDMA_CTRL_RUN_STOP` 비트를 씁니다. control 필드의 `XDMA_DESC_STOPPED`(bit 0), `XDMA_DESC_COMPLETED`(bit 1), `XDMA_DESC_EOP`(bit 4)도 같은 헤더에 있습니다. 그래서 XDMA에 NVMe처럼 "tail을 doorbell에 쓴다"는 코드를 기대하면 안 되고, 완료 처리 역시 다음 편 DMA completion에서 다루는 별도 방식을 씁니다.

## 자주 보는 함정

> phase bit 없이 "비어 있지 않으면 새 완료"로 판단

위 시뮬레이션의 `q_reap_nophase()`처럼 한 바퀴 뒤에 지난 entry(`cid=6`)를 다시 처리합니다. NVMe는 status 비트 0의 phase를 비교합니다.

> 여러 스레드가 lock 없이 같은 SQ에 제출

```c
q->sq[q->sq_tail] = *cmd;
q->sq_tail++;                 /* 두 스레드가 같은 칸에 쓸 수 있음 */
```

CPU마다 queue를 나누거나, Linux NVMe 드라이버처럼 queue마다 lock(`sq_lock`)을 둡니다.

> SQ entry를 다 쓰기 전에 doorbell

entry가 coherent DMA 메모리에 있다면 doorbell은 `writel()`로 씁니다. `Documentation/memory-barriers.txt`의 "KERNEL I/O BARRIER EFFECTS" 절에 따르면 `writeX()`는 앞선 메모리 쓰기가 끝난 뒤에 나가므로 device가 덜 쓴 entry를 읽지 않습니다. `writel_relaxed()`로 doorbell을 친다면 그 보장이 없으므로 앞에 `wmb()`가 필요합니다.

> CQ head를 device에 알리지 않음

CQ head doorbell을 쓰지 않으면 device는 host가 어디까지 읽었는지 모릅니다. 위 io_uring 실습에서도 QEMU는 완료를 거둔 만큼 CQ doorbell(`new_head 84`, `86`)을 받았습니다.

> SQ full 검사 누락

```c
q->sq[q->sq_tail] = *cmd;    /* head를 넘어 덮어씀 */
q->sq_tail = (q->sq_tail + 1) % depth;
```

`(tail + 1) % depth == head`면 제출을 멈추고 완료를 먼저 거둡니다. 위 시뮬레이션에서 depth 4에 네 번째 명령은 `-1`로 거절됐습니다.

## 정리

- SQ·CQ는 ring 두 개와 doorbell로 이뤄지고, 한 칸을 비워 full과 empty를 구분합니다.
- NVMe SQ entry는 64 B(Linux `BUILD_BUG_ON`), CQ entry는 16 B이고(QEMU `sqes 0x66`/`cqes 0x44`), CQ의 phase는 status 비트 0입니다.
- phase 검사가 없으면 wrap 뒤에 지난 바퀴의 완료를 다시 처리합니다(시뮬레이션에서 `cid=6`).
- Linux NVMe 드라이버는 묶음(`bd->last` 또는 `nvme_queue_rqs()`의 batch)마다 SQ doorbell을 한 번 칩니다. QEMU NVMe에서 4,096개 읽기의 SQ doorbell은 QD1 4,096번, QD32 153번, 32개 일괄 제출 128번이었습니다.
- io_uring도 같은 ring 모델이고, 완료는 순서가 바뀔 수 있으므로 `user_data`로 짝을 맞춥니다.
- Xilinx XDMA는 ring + tail doorbell이 아니라 linked-list descriptor + 시작 레지스터 모델입니다.

다음 편은 **DMA Completion**입니다.

## 관련 항목

- [11-06: Mailbox Protocol](/blog/embedded/modern-recipes/part11-06-mailbox)
- [11-08: DMA Completion](/blog/embedded/modern-recipes/part11-08-dma-completion)
- [7-11: UIO·VFIO](/blog/embedded/modern-recipes/part7-11-uio-vfio)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
