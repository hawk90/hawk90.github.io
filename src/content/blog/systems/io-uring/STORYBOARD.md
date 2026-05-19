---
title: "io_uring Deep Dive — Storyboard"
date: 2026-05-19T00:00:00
description: "io_uring 시리즈 설계 문서 — 챕터별 깊이·다이어그램·코드·레퍼런스 계획"
tags: [io_uring, linux, storyboard, internal]
draft: true
---

# io_uring Deep Dive — Storyboard

## 시리즈 목표

Linux 5.1(2019)에 도입된 *Shared Memory Ring* 기반 async I/O 인터페이스. epoll·POSIX AIO의 한계를 넘어 *전 영역 syscall amortize*, *zero-copy*, *multishot*로 진화 중. 본 시리즈는 다음을 한 자리에 묶는다.

- **분량**: 챕터당 400~700줄
- **시기 기준 (2026-05)**: io_uring spec 6.x 안정, **multishot**·**buffer rings**·**zero-copy send**·**uring_cmd** 정착. Tokio/seastar/QEMU/PostgreSQL 채택 진행. 보안 차단 정책(Docker/Chromium) vs *high-perf 워크로드*에서의 적극 활용 분기 시기.
- **깊이 기준**: Jens Axboe LKML 시리즈·LWN 해설·kernel `io_uring/` 코드·liburing 예제·실측 비교
- **시각 자료**: 챕터당 3~5개 TikZ 다이어그램
- **레퍼런스**: liburing(github.com/axboe/liburing), kernel `io_uring/`, LWN 시리즈, "Efficient IO with io_uring" PDF (Jens Axboe), Lord of the io_uring(공식 튜토리얼)

기존 자료 위치:
- `systems/linux-kernel-internals/part4-05-io-uring.md` (스텁) — 통합 또는 alias.
- `embedded/hardware/nvme/chapter12-linux-io-path.md` — NVMe 측면 일부 다룸. *교차 링크*만.

## 챕터별 스토리보드

### Ch 1: 등장 배경 — async I/O의 역사와 한계

**의도**: io_uring을 *왜* 만들었는가. 기존 모델 한계 → 디자인 동기.

- ✦ 동기식 read/write — blocking 의 비용
- ✦ `select`/`poll` → `epoll` — readiness 모델, edge/level trigger
- ✦ POSIX AIO (`aio_read`/`aio_submit`) — 사실상 실패한 이유 (glibc threadpool, 정렬 제약)
- ✦ Linux native AIO (`io_setup`/`io_submit`) — direct I/O만, buffered I/O는 blocking, file open은 blocking
- ✦ syscall 비용의 변화 — Spectre/Meltdown mitigation 후 더 비싸짐
- ✦ Jens Axboe (NVMe maintainer) 동기 — NVMe 1M IOPS에 epoll로 한계
- ✦ kernel 5.1 (2019.5) 도입 → 매 릴리스 확장
- ◦ Windows IOCP, FreeBSD kqueue 비교

**다이어그램** (4)
1. blocking/epoll/AIO/io_uring 모델 비교 (syscall 수, copy 수, batch 가능성)
2. epoll readiness vs io_uring completion 모델 차이
3. POSIX AIO vs native AIO vs io_uring — buffered I/O 지원 여부
4. syscall 비용 변화 timeline (KPTI 전후)

**코드**: `getrusage`로 syscall 횟수 측정, `strace -c` 비교
**레퍼런스**: "Efficient IO with io_uring" §1~2, LWN "Ringing in a new asynchronous I/O API" (2019)

---

### Ch 2: 핵심 디자인 — SQ/CQ + Shared Memory Ring

**의도**: io_uring의 *물리적 메모리 구조*. 모든 게 이 ring 위에 선다.

- ✦ **Submission Queue (SQ)** — userspace produces, kernel consumes
- ✦ **Completion Queue (CQ)** — kernel produces, userspace consumes
- ✦ Single Producer / Single Consumer ring — atomic ordering
- ✦ `mmap` 영역 3개 — SQ ring, CQ ring, SQE array
- ✦ **SQE (Submission Queue Entry)** 64B 구조
- ✦ **CQE (Completion Queue Entry)** 16B (또는 CQE32 확장)
- ✦ Ring head/tail 의 memory ordering (load-acquire / store-release)
- ✦ `io_uring_setup(entries, params)` — ring 크기, mmap offsets 반환
- ✦ `io_uring_enter(fd, to_submit, min_complete, flags)` — submit + wait 통합
- ✦ `io_uring_register(...)` — fixed files/buffers 등 사전 등록

**다이어그램** (5)
1. SQ/CQ ring + SQE array 메모리 layout (user vs kernel 공유)
2. SQE 64B 비트 layout (opcode, fd, off, addr, len, user_data...)
3. CQE 16B (또는 CQE32) layout
4. 한 I/O의 생애 (prep → submit → kernel exec → cqe)
5. Memory ordering — head/tail acquire/release

**코드**: 직접 `io_uring_setup` + mmap + raw SQE 작성 (no liburing) — 50줄 hello world
**레퍼런스**: kernel `io_uring/io_uring.c::io_uring_setup`, `Documentation/userspace-api/io_uring.rst`

---

### Ch 3: liburing 입문 — 안전한 user-facing API

**의도**: 매번 mmap·atomic 직접 다루지 않게 해주는 helper.

- ✦ liburing 빌드, header (`#include <liburing.h>`)
- ✦ `io_uring_queue_init(entries, &ring, flags)` — 한 줄 setup
- ✦ `io_uring_get_sqe(&ring)` → `io_uring_prep_read(...)` → `io_uring_submit(&ring)`
- ✦ `io_uring_wait_cqe(&ring, &cqe)` / `io_uring_peek_cqe`
- ✦ `io_uring_cqe_seen(&ring, cqe)` — CQ 진행
- ✦ `user_data` 패턴 — request context 식별
- ✦ Batch — 여러 SQE 채운 후 한 번 submit
- ✦ Helper: `io_uring_prep_readv/writev/openat/accept/connect/send/recv/fsync/timeout/...`

**다이어그램** (3)
1. liburing API 흐름 (prep → submit → wait → seen)
2. user_data 가 SQE → CQE를 잇는 토큰
3. Batch submit 효과 (1 syscall로 N개)

**코드**: 파일 1개 async read (50줄), 파일 N개 batch read (80줄)
**레퍼런스**: liburing examples (`examples/`), "Lord of the io_uring" 튜토리얼

---

### Ch 4: Opcode 카탈로그 — 무엇을 할 수 있나

**의도**: io_uring opcode 전수 — 같은 ring으로 *디스크 + 네트워크 + 파일시스템 + 타이머 + IPC*.

- ✦ **File I/O**: READ/WRITE/READV/WRITEV/READ_FIXED/WRITE_FIXED/SPLICE/TEE
- ✦ **Network**: ACCEPT/CONNECT/SEND/RECV/SENDMSG/RECVMSG/SHUTDOWN
- ✦ **Filesystem**: OPENAT/STATX/UNLINKAT/MKDIRAT/RENAMEAT/SYMLINKAT/LINKAT/MKDIRAT/FSETXATTR
- ✦ **Timers**: TIMEOUT / LINK_TIMEOUT / TIMEOUT_UPDATE / TIMEOUT_REMOVE
- ✦ **IPC**: POLL_ADD / POLL_REMOVE / EPOLL_CTL (epoll over io_uring)
- ✦ **Sync**: SYNC_FILE_RANGE / FALLOCATE / FADVISE / MADVISE
- ✦ **Multishot**: ACCEPT_MULTISHOT, RECV_MULTISHOT, POLL_MULTISHOT
- ✦ **Misc**: NOP, CANCEL, ASYNC_CANCEL, MSG_RING, FILES_UPDATE
- ✦ **CMD passthrough**: URING_CMD — NVMe passthrough, ublk 등
- ◦ 버전별 opcode 추가 history

**다이어그램** (4)
1. opcode 분류 트리 (file/net/fs/timer/ipc/sync/cmd)
2. opcode 별 SQE 필드 사용 패턴 (어느 필드가 무슨 의미인지)
3. Multishot vs single-shot 흐름
4. URING_CMD passthrough — kernel driver에 직접 SQE 전달

**코드**: opcode별 5-10줄 prep helper 모음
**레퍼런스**: `io_uring/opdef.c`, `liburing/include/liburing.h`

---

### Ch 5: Fixed Files & Fixed Buffers — 등록 자원

**의도**: 매 SQE에 fd/buf 검증·page-pin 비용 회피.

- ✦ Fixed Files — `io_uring_register_files(&ring, fds, n)` → SQE에는 index만
- ✦ Files update — `io_uring_register_files_update` (sparse 슬롯)
- ✦ Fixed Buffers — `io_uring_register_buffers(&ring, iovs, n)` → READ_FIXED/WRITE_FIXED
- ✦ Page pinning → DMA 친화
- ✦ `IORING_OP_PROVIDE_BUFFERS` (deprecated) → **Buffer rings (registered ring of buffers)**
- ✦ Buffer ring (IORING_REGISTER_PBUF_RING) — kernel이 자동 buffer 할당
- ◦ ulimit memlock 영향

**다이어그램** (3)
1. 일반 RW vs READ_FIXED — fd lookup / page pin 회피 경로
2. Fixed buffer 등록 → DMA path
3. Buffer ring — kernel pick buffer for multishot recv

**코드**: 같은 워크로드 일반 vs fixed 비교 (throughput·latency)
**레퍼런스**: LWN "Buffer rings for io_uring", Jens Axboe blog posts

---

### Ch 6: SQPOLL — Kernel polling thread

**의도**: syscall 자체를 *0번*으로.

- ✦ `IORING_SETUP_SQPOLL` — kernel 안 polling thread가 SQ를 watch
- ✦ `IORING_SETUP_SQ_AFF` + `sq_thread_cpu` — CPU affinity 고정
- ✦ `sq_thread_idle` — 유휴 시 sleep, 다시 깨우려면 `io_uring_enter(IORING_ENTER_SQ_WAKEUP)`
- ✦ 워크로드 적합성 — 지속 부하 ✅, 간헐 부하 ❌ (sleep/wakeup 비용 큼)
- ✦ 멀티 ring + 멀티 SQPOLL — CPU 1개 공유 또는 분리
- ✦ Permission — `CAP_SYS_NICE` 필요 (예전), 최근 완화
- ◦ COOP_TASKRUN, TASKRUN_FLAG — task_work 처리 최적화

**다이어그램** (3)
1. 일반 io_uring vs SQPOLL — syscall 횟수 비교
2. SQPOLL 상태 (running / idle / waiting wakeup)
3. CPU affinity matrix (poll thread vs user thread)

**코드**: epoll / io_uring / io_uring+SQPOLL 동일 워크로드 비교
**레퍼런스**: kernel `io_uring/sqpoll.c`

---

### Ch 7: 링크·Drain — 순서 보장과 의존성

**의도**: async지만 *순서 있는 작업* (open → read → close) 표현.

- ✦ `IOSQE_IO_LINK` — 다음 SQE를 chain, 실패하면 chain 종료
- ✦ `IOSQE_IO_HARDLINK` — 실패해도 chain 계속
- ✦ `IOSQE_IO_DRAIN` — 이 SQE 이전 모두 완료 후 실행 (barrier)
- ✦ `IOSQE_ASYNC` — 강제로 워커 스레드로
- ✦ `LINK_TIMEOUT` — 다음 SQE에 timeout 부착
- ✦ 체인 패턴 — open → read → close (3 SQE 한 번 submit)
- ◦ 부분 실패 시 cleanup 책임

**다이어그램** (3)
1. SQE chain via IO_LINK
2. DRAIN 시점 시각화 (barrier)
3. open→read→close 체인 흐름

**코드**: 체인 vs 분리 submit 비교
**레퍼런스**: LWN "Linked SQEs", liburing chain examples

---

### Ch 8: Multishot & Buffer Rings — 한 번 등록, 많이 받기

**의도**: high-throughput 네트워킹의 결정적 도구.

- ✦ **Multishot ACCEPT** — 한 SQE로 모든 incoming connection (각 connection마다 CQE)
- ✦ **Multishot RECV** — connection당 한 SQE, 매 패킷마다 CQE
- ✦ **Multishot POLL** — edge가 아닌 level-like trigger
- ✦ **Buffer rings** + multishot recv → kernel이 buffer 자동 선택
- ✦ buffer group id (IOSQE_BUFFER_SELECT)
- ✦ Zero-copy send — `IORING_OP_SEND_ZC`, `MSG_ZEROCOPY` 통합
- ✦ Sendmsg_zc — vectored zero-copy
- ◦ Receive-side zero-copy 시도 (실험적)

**다이어그램** (4)
1. multishot accept 흐름 (1 SQE → N CQE)
2. buffer ring + multishot recv (kernel buffer pick)
3. zero-copy send completion notification 2단계 (sent + freed)
4. multishot 사용 전후 SQE 수 (10K connection 가정)

**코드**: multishot echo server (~150줄)
**레퍼런스**: Jens Axboe "Multi-shot operations" blog series, liburing `test/recv-multishot.c`

---

### Ch 9: 커널 내부 — io_wq, task_work, io_ring_ctx

**의도**: io_uring을 *밑에서* 보기.

- ✦ `struct io_ring_ctx` — ring 인스턴스 상태
- ✦ `struct io_kiocb` — 한 I/O request의 kernel 표현
- ✦ **io_wq** (workqueue) — blocking opcode를 처리할 워커 풀
- ✦ task_work — completion을 issuer task에 deliver
- ✦ `IORING_SETUP_COOP_TASKRUN`, `DEFER_TASKRUN` — task work timing 제어
- ✦ Fast path — inline issue (no workqueue)
- ✦ Slow path — io_wq dispatch
- ✦ Cancellation — `IORING_OP_ASYNC_CANCEL`, task exit cleanup
- ◦ io_uring 코드 디렉토리 투어 (`io_uring/`)

**다이어그램** (4)
1. io_ring_ctx + io_kiocb 관계
2. fast path vs slow path (io_wq)
3. task_work delivery — completion → issuer
4. cancellation flow

**코드 경로**: `io_uring/io_uring.c`, `io_uring/io-wq.c`, `io_uring/rw.c`, `io_uring/net.c`
**레퍼런스**: Jens Axboe Plumbers talks, "io_uring and networking in 2023"

---

### Ch 10: 보안 — 위협 모델, 격리, 그리고 disable 추세

**의도**: io_uring이 *공격 표면*이 된 이유와 운영 정책.

- ✦ CVE 사례 — 대표 5-10건 (UAF, race, 권한 우회)
- ✦ Google ChromeOS, Android: **io_uring 비활성화** 정책
- ✦ Docker default seccomp profile — io_uring syscall 차단
- ✦ `kernel.io_uring_disabled` sysctl — 0/1/2 (allow / cap_only / disabled)
- ✦ **IORING_REGISTER_RESTRICTIONS** — opcode whitelist
- ✦ seccomp + io_uring 상호작용 (seccomp는 io_uring 안 보임)
- ✦ Confidential VM 안에서의 io_uring (TDX/SEV — 안전?)
- ◦ Fuzzing 결과 (syzkaller io_uring corpus)

**다이어그램** (3)
1. io_uring 공격 표면 (SQE injection, race window)
2. restrictions로 opcode 화이트리스트
3. sysctl io_uring_disabled state machine

**코드**: restrictions 적용 예
**레퍼런스**: Google Project Zero blog (io_uring exploits), Docker seccomp default, kernel.io_uring_disabled doc

---

### Ch 11: NVMe + io_uring 통합 — uring_cmd 패스스루 vs SPDK kernel-bypass

**의도**: io_uring의 *가장 성능 critical 응용* — 스토리지. *Kernel path*와 *Kernel bypass(SPDK)*가 어디서 갈리는지.

- ✦ 일반 read/write vs O_DIRECT vs io_uring + READ_FIXED
- ✦ **IORING_OP_URING_CMD** — driver-specific command 직접 전달
- ✦ NVMe passthrough — `io_uring_cmd` → `nvme_uring_cmd` (NVMe Admin/IO command 직접)
- ✦ ublk — userspace block driver via io_uring
- ✦ `IORING_SETUP_SQE128`, `IORING_SETUP_CQE32` — passthrough용 큰 SQE/CQE
- ✦ Database 채택 — RocksDB, PostgreSQL 17 AIO worker
- ✦ ScyllaDB seastar — io_uring 1급 사용
- ◦ EROFS / btrfs special opcodes

**SPDK 비교 — kernel path vs kernel bypass** *(흡수 절)*
- ✦ **SPDK 아키텍처** — VFIO + UIO로 NVMe controller를 userspace가 직접 소유, kernel NVMe driver 완전 우회
- ✦ Poll Mode Driver — interrupt 없이 dedicated CPU가 CQ polling
- ✦ **hugepage + DMA** — 2MB/1GB page로 IOMMU 매핑 비용 회피
- ✦ 성능 영역
  - SPDK: 단일 컨트롤러 *4-6M IOPS*, latency *수십 µs*, deterministic
  - io_uring+uring_cmd: 단일 ring *1-2M IOPS*, latency *100-200 µs*
  - 일반 io_uring (block layer): *500K-1M IOPS*
- ✦ Trade-off
  - SPDK: dedicated CPU 비용, kernel feature(security/snapshot/quota) 못 씀, 디바이스 단일 점유
  - io_uring: 멀티 프로세스 공유, kernel feature 다 씀, 운영 friendly
- ✦ **SPDK NVMe-oF target** — Lightbits·Pavilion·NetApp AFA의 기반
- ✦ **선택 기준**: AFA 어플라이언스 → SPDK. 일반 서버·DB → io_uring + uring_cmd
- ◦ vhost-user-blk — KVM guest에 SPDK 백엔드 export

**다이어그램** (1 추가)
- SPDK vs io_uring NVMe path — VFIO/PMD/hugepage vs block layer/uring_cmd

**다이어그램** (4)
1. NVMe path 비교 (sync / aio / io_uring / io_uring+passthrough / SPDK)
2. uring_cmd → driver hook 흐름
3. ublk 아키텍처
4. throughput/latency 측정 (fio with --ioengine=io_uring)

**코드**: fio io_uring engine, 직접 uring_cmd passthrough 예
**레퍼런스**: Jens Axboe "io_uring and uring_cmd" talk, ublk paper, "Asynchronous I/O Engine Using io_uring" (PostgreSQL Conf)

> 교차: NVMe 시리즈 `chapter12-linux-io-path.md`와 연결.

---

### Ch 12: 응용 사례 카탈로그

**의도**: 실제 누가 어떻게 쓰는가.

- ✦ **Tokio** (Rust) — `tokio-uring` crate, `io_uring` backend (실험적)
- ✦ **glommio** (Rust) — io_uring native scheduler
- ✦ **monoio** (Rust, ByteDance) — io_uring 1급
- ✦ **libuv** — io_uring backend (Node.js)
- ✦ **seastar / ScyllaDB** — shard-per-core + io_uring
- ✦ **QEMU** — disk backend
- ✦ **PostgreSQL 17+** — async I/O worker
- ✦ **MySQL/MariaDB** 채택 검토
- ✦ **Envoy / Cloudflare** — 네트워크 stack
- ✦ **fio** `--ioengine=io_uring` — 벤치마크 표준
- ◦ Lang-level wrapper 비교

**다이어그램** (3)
1. 채택 사례 카탈로그 (DB / web server / runtime / VM)
2. Tokio vs glommio vs monoio API 비교
3. seastar shard-per-core 모델

**코드**: 각 wrapper 1-2줄 비교 예
**레퍼런스**: 각 프로젝트 issue/PR 추적

---

### Ch 13: 디버깅·관측

**의도**: io_uring 동작을 *눈으로* 보기.

- ✦ `strace -e trace=io_uring_setup,io_uring_enter,io_uring_register`
- ✦ `/proc/$pid/fdinfo/$fd` — io_uring stats (SQ/CQ depths, dropped, registered)
- ✦ `perf trace`, `perf record -e io_uring:*`
- ✦ bpftrace — SQE flow 추적
- ✦ liburing's `io_uring_show_state` (test 빌드)
- ✦ ftrace tracepoints — `io_uring/io_uring_complete`, `io_uring_submit_req`
- ◦ tokio-console / glommio metrics

**다이어그램** (2)
1. tracepoint 위치 (submit / queue / complete / cancel)
2. bpftrace로 latency 히스토그램

**코드**: bpftrace 스크립트 — io_uring 평균/p99 latency
**레퍼런스**: kernel `include/trace/events/io_uring.h`

---

### Ch 14: 미래·로드맵 — Kernel path vs Kernel bypass의 추세

**의도**: 2026 이후 어디로 가나. *DPDK/SPDK 같은 kernel bypass와의 경계가 어디서 이동하는가*가 핵심.

- ✦ **Zero-copy 확장** — send/recv 모두 zero-copy (현재 send만 안정)
- ✦ **napi busy poll** (`IORING_REGISTER_NAPI`) — 네트워킹 polling
- ✦ **futex2 + io_uring** — async lock 대기
- ✦ **io_uring + eBPF** — BPF로 SQE 동적 생성 시도 (실험)
- ✦ **multishot 확대** — 더 많은 opcode
- ✦ **DEFER_TASKRUN** 기본화 — latency 개선
- ✦ **io_uring + Confidential VM** — TDX/SEV 안에서 안전성
- ◦ Windows IORING (Win11 22H2+) — 호환성 비교

**Kernel path vs Kernel bypass 추세** *(흡수 절)*
- ✦ **DPDK** — Telco/NFV/SmartNIC 영역에서 *절대 강자* 유지. 단순 패킷 처리는 점진 이동
- ✦ **SPDK** — NVMe AFA·NVMe-oF target에서 *de facto*. 일반 서버 DB는 io_uring+uring_cmd로 흡수
- ✦ **AF_XDP** — DPDK의 가벼운 대안. Cilium·Cloudflare 채택. *kernel 안에서* zero-copy
- ✦ **XDP/eBPF** — 단순 패킷 필터·로드밸런서는 DPDK 자리 잠식 (Linux native가 더 안전·운영 편함)
- ✦ **io_uring**의 추격선
  - 1M IOPS 부근에서 SPDK 격차 좁힘
  - busy poll·zero-copy·uring_cmd로 *kernel feature 보존하며 bypass 근접*
  - 그러나 *deterministic latency*·*per-CPU dedicated*가 필요한 영역(Telco UPF, AFA)은 여전히 DPDK/SPDK
- ✦ **경계가 이동하는 지점** (2026 시점)
  - 일반 클라우드 워크로드: io_uring/AF_XDP가 DPDK 자리 점유
  - 통신 인프라(5G/6G core, SmartNIC): DPDK 절대 강자
  - 스토리지 어플라이언스: SPDK 유지, *일반 서버 DB는 io_uring*
- ◦ **장기**: io_uring + eBPF + napi가 *kernel path 한계*를 어디까지 미는지가 관전 포인트

**다이어그램** (1 추가)
- Kernel path / Kernel bypass 점유 영역 매트릭스 (응용별 SPDK / DPDK / io_uring / AF_XDP / XDP 강세 시각화)

**다이어그램** (3)
1. multishot/zero-copy/napi 채택 roadmap
2. kernel path (io_uring) vs bypass (DPDK/SPDK) 성능 격차 추세
3. 2026 io_uring 능력 매트릭스

**코드**: 실험적 패치 인용
**레퍼런스**: LKML io_uring 메일링, KVM Forum 2024-25 발표

---

## 챕터별 분량 계획

| 챕터 | 목표 줄수 | 다이어그램 |
|------|-----------|-----------|
| 1 etymology + history | 500 | 4 |
| 2 ring design | 700 | 5 |
| 3 liburing intro | 450 | 3 |
| 4 opcodes | 600 | 4 |
| 5 fixed files/buffers | 500 | 3 |
| 6 SQPOLL | 500 | 3 |
| 7 link/drain | 500 | 3 |
| 8 multishot + zero-copy | 650 | 4 |
| 9 kernel internals | 650 | 4 |
| 10 security | 550 | 3 |
| 11 NVMe + uring_cmd | 700 | 4 |
| 12 ecosystem | 500 | 3 |
| 13 debugging | 450 | 2 |
| 14 future | 450 | 3 |
| **합계** | **~7700줄** | **48** |

## 레퍼런스

### 1차 자료

| 출처 | 활용 |
|------|------|
| kernel `io_uring/` 디렉토리 (linux mainline) | 전 챕터 |
| `Documentation/userspace-api/io_uring.rst` | 전 챕터 |
| liburing — github.com/axboe/liburing | 3~14 |
| "Efficient IO with io_uring" PDF (Jens Axboe) | 1~9 |
| "Lord of the io_uring" (unixism.net tutorial) | 3~7 |

### LWN 시리즈 (연대순)

- "Ringing in a new asynchronous I/O API" (2019.1)
- "The rapid growth of io_uring" (2020)
- "Linked SQEs in io_uring" (2020)
- "io_uring and security" (2021~)
- "Buffer rings for io_uring" (2022)
- "Async I/O improvements in PostgreSQL" (2024)
- "io_uring restrictions" (2022~)

### 컨퍼런스 발표

- Linux Plumbers Conference — io_uring track (2019~)
- Linux Storage, Filesystem, MM Summit (LSFMM)
- KVM Forum — io_uring for guest
- FOSDEM kernel track

### 응용 프로젝트

| 프로젝트 | 활용 챕터 |
|------|-----------|
| fio (`--ioengine=io_uring`) | 11, 13 |
| ScyllaDB / seastar | 12 |
| Tokio (`tokio-uring`), glommio, monoio | 12 |
| PostgreSQL 17 AIO | 11, 12 |
| QEMU disk backend | 12 |
| ublk | 11 |
| Envoy / libuv | 12 |

### 관련 시리즈 (교차 링크)

- `systems/linux-kernel-internals/part4-05-io-uring.md` — 통합 또는 alias로 이 시리즈로 redirect
- `embedded/hardware/nvme/chapter12-linux-io-path.md` — NVMe 측면
- `tools/debugging/concurrency/` — async 디버깅
- `parallel/seven-concurrency-models/` — async I/O 모델

## 최신성·시점 정리 (2026-05 기준)

| 영역 | 현 상태 | 다음 변곡점 |
|------|---------|-------------|
| Core API | kernel 6.x 안정, multishot/buffer ring 정착 | 더 많은 multishot opcode |
| Zero-copy | send_zc 안정, sendmsg_zc 안정 | recv_zc (실험적) |
| NVMe passthrough | uring_cmd 안정, ublk 상용 | 더 많은 driver passthrough |
| 보안 | sysctl `io_uring_disabled` 정책 일반화, Docker 차단 default | Confidential VM 통합 가이드 |
| 응용 | PostgreSQL 17 AIO, ScyllaDB seastar 1급 | MySQL/MariaDB 본격 채택? |
| 비교 | DPDK/SPDK 대비 kernel path 추격 중 | 격차 좁히는 지점 식별 필요 |
| Windows | IORING (Win11 22H2+) 비교 의미 생김 | 호환 layer 등장? |

## 작성 순서 권장

1. 스토리보드 사용자 검토
2. **Ch 1 (개요·역사)** → Ch 2 (ring 디자인) → Ch 3 (liburing) — 입문 3편
3. Ch 4 (opcodes) → Ch 5 (fixed) → Ch 6 (SQPOLL) → Ch 7 (link/drain) — 기능
4. Ch 8 (multishot/zero-copy) — high-perf
5. **Ch 9 (커널 내부)** — 깊이
6. Ch 10 (보안) → Ch 11 (NVMe) — 운영·응용 시작
7. Ch 12~14 — 카탈로그 / 디버깅 / 미래

## 검증

- 챕터 1편 작성 후 사용자 검토 → OK면 다음
- 다이어그램 `scripts/detect-text-overlap.py`로 overlap 검증
- 코드 예제는 *실제 빌드 가능* (liburing 링크) 한 것만
- 최신성 점검: zero-copy recv 안정 시 / kernel.io_uring_disabled 정책 변경 시 / PostgreSQL/MySQL 본격 채택 시 → Ch 8/10/12 refresh
