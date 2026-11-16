---
title: "Lock-Free 자료구조 성능 — CAS·ABA·Hazard Pointer·Epoch Reclamation"
slug: "embedded/performance-engineering/part4-07-lock-free"
date: 2026-04-26T09:06:00
description: "CAS 기반 lock-free와 ABA 문제, hazard pointer와 epoch reclamation 비교."
series: "Embedded Performance Engineering"
seriesOrder: 36
tags: [lock-free, cas, aba, hazard-pointer, epoch]
topics: ["embedded"]
---

## 한 줄 요약

> **"Lock-free는 '누군가는 진행한다'는 보장이지 '빠르다'는 보장이 아닙니다."** CAS 재시도 비용, ABA, 메모리 회수를 따로 재고 따로 설계합니다.

이 글의 측정 환경은 [4-06](/blog/embedded/performance-engineering/part4-06-rw-lock)과 같습니다. Apple M2 Pro 위 QEMU 11.1.3(`-accel hvf -cpu host`, vCPU 4개) Debian 13 arm64 guest, gcc 14.2.0, glibc 2.41이고, 호스트 부하가 있어 5회 실행의 중앙값으로 적습니다. HVF는 guest 명령을 M2 코어에서 그대로 실행하므로 atomic 명령의 비용은 실제 하드웨어 비용입니다.

## Progress Property

교차로에 비유하면 lock은 신호등입니다. 신호를 받은 차가 교차로 한가운데서 시동이 꺼지면 모두가 멈춥니다. Lock-free는 회전교차로입니다. 한 차가 멈춰도 다른 차는 돌아 나갈 수 있지만, 특정 차가 계속 끼어들지 못하고 맴돌 수는 있습니다.

C++ 표준 초안 [\[intro.progress\]](https://eel.is/c++draft/intro.progress)이 이 구분을 정합니다. (2.1)은 다른 thread가 모두 막혀 있을 때 lock-free 실행이 "shall complete"라고 하고 이 성질을 "sometimes termed obstruction-free"라고 부릅니다. (2.2)는 여러 lock-free 실행이 동시에 돌 때 "at least one should complete"라고 하고 이것을 "sometimes termed lock-free"라고 부릅니다. 같은 Note 3은 load-locked/store-conditional 구현에서 다른 thread가 cache line을 반복해서 가져가면 진행이 막힐 수 있다고 적습니다. 즉 표준의 lock-free는 시간 상한도, 개별 thread의 완료도 약속하지 않습니다. 개별 operation이 유한 step 안에 끝나는 wait-free는 그보다 강한 성질입니다.

## CAS — 실제 C11 atomic과 제한된 counter

CAS(compare-and-swap)는 "내가 본 값이 아직 그대로면 새 값으로 바꾼다"는 연산입니다. 공연 좌석 예매와 같습니다. 화면에서 빈 좌석을 보고 결제를 누르는 순간 누가 먼저 가져갔으면 실패하고, 다시 화면을 봅니다. 다음은 상한을 넘지 않게 counter를 올리는 함수입니다.

```c title="bounded.c"
bool increment_below(atomic_uint *c, unsigned lim, unsigned long *r)
{
    unsigned current = atomic_load_explicit(c, memory_order_relaxed);
    while (current < lim) {
        if (atomic_compare_exchange_weak_explicit(c, &current, current + 1,
                memory_order_relaxed, memory_order_relaxed))
            return true;
        (*r)++;                       /* 실패하면 current가 최신 값으로 갱신됨 */
    }
    return false;
}
```

값 하나만 다루므로 relaxed로 충분합니다. 이 counter로 다른 데이터의 준비 완료를 알리는 용도라면 [4-08](/blog/embedded/performance-engineering/part4-08-memory-ordering)의 release/acquire가 필요합니다. `current < lim` 조건 때문에 `UINT_MAX`에서도 wrap하지 않습니다.

4 thread가 각각 100만 번 호출하고 상한을 300만으로 둔 결과입니다(3회 실행).

```text
limit=3000000 final=3000000 accepted=3000000 rejected=1000000 cas_retries=885921 lock_free(atomic_uint)=1
edge: from UINT_MAX-1 -> first=1 second=0 final==UINT_MAX:1
```

최종값은 세 번 모두 정확히 상한이었고, 넘친 100만 번은 거부됐습니다. 그런데 CAS 실패 재시도가 400만 호출에 대해 783,675~935,092회(중앙값 885,921) 나왔습니다. 호출의 약 22%가 "좌석을 뺏기고 다시 본" 셈입니다. 재시도 횟수는 lock-free 코드에서 가장 먼저 기록해야 할 숫자입니다.

## ISA와 성능을 구분

Armv8.0의 atomic RMW는 `LDXR`/`STXR` 쌍(LL/SC) 루프이고, Armv8.1 LSE는 `LDADD`, `CAS` 같은 단일 명령을 추가했습니다. gcc 14.2는 기본(`-march=armv8-a`)에서 `__aarch64_ldadd4_relax` 같은 outline helper를 호출합니다. [GCC 14.2 매뉴얼의 `-moutline-atomics`](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/AArch64-Options.html) 항목은 이 helper가 "at runtime, determine if the LSE instructions from ARMv8.1-A can be used"이고 옵션이 기본으로 켜져 있다고 적습니다. `-march=armv8.1-a`에서는 `ldadd`/`casal`을 직접 냅니다(코드 생성 결과는 [4-08](/blog/embedded/performance-engineering/part4-08-memory-ordering#arm-명령)).

"명령 하나면 빠르다"는 직관을 확인하려고, 128-byte 정렬된 counter 하나를 thread 1/2/4개가 각각 200만 번 증가시켰습니다. 값은 thread당 한 연산의 평균 ns입니다.

| 연산 | 빌드 | 1 thread | 2 thread | 4 thread |
|---|---|---:|---:|---:|
| `fetch_add` relaxed | LL/SC (`-march=armv8-a -mno-outline-atomics`) | 3.88 | 7.67 | 33.11 |
| `fetch_add` relaxed | LSE (`-march=armv8.1-a`) | 1.97 | 9.23 | 41.47 |
| `fetch_add` seq_cst | LL/SC | 4.56 | 17.43 | 65.81 |
| `fetch_add` seq_cst | LSE | 4.11 | 22.90 | 102.01 |
| CAS 루프 | LL/SC | 2.30 | 11.03 | 35.14 |
| CAS 루프 | LSE | 2.10 | 8.45 | 74.53 |

경쟁이 없을 때 LSE relaxed는 5회 모두 1.93~2.01 ns로 안정적이었고, LL/SC는 2.28~6.14 ns로 실행마다 크게 흔들렸습니다. 그러나 4 thread가 같은 line을 두드리자 이 환경에서는 LSE 쪽이 더 느렸습니다. 명령이 하나여도 cache line 소유권은 매번 코어 사이를 옮겨야 하기 때문입니다. 90회 실행 모두 최종값이 기대값과 같았습니다. 4 thread CAS 루프의 재시도는 연산당 LL/SC 0.412회, LSE 0.333회였습니다. 이 표는 M2 Pro + HVF guest 한 환경의 측정입니다. 다른 코어에서의 순위는 이 글에서 재지 않았으므로, 대상 하드웨어에서 같은 표를 다시 만듭니다.

## Stack — 즉시 회수와 ABA는 별도 문제

Lock-free stack(Treiber stack)은 `top` 포인터 하나를 CAS로 바꿉니다. `pop`은 `old = top; next = old->next; CAS(top, old, next)` 순서인데, 이 짧은 순서 안에 문제가 두 개 숨어 있습니다. 하나는 다른 thread가 `old`를 이미 `free`했을 때 `old->next`를 읽는 use-after-free이고, 다른 하나는 다음 절의 ABA입니다. Atomic `top`만으로는 둘 다 막지 못하고, tag를 붙여도 앞의 것은 막지 못합니다.

## ABA 문제

CAS는 값이 같은지만 봅니다. 주차장에서 "내 자리에 흰색 차가 있으니 내 차"라고 판단하는 것과 같습니다. 그 사이 내 차가 나가고 같은 모델의 다른 흰색 차가 들어왔을 수 있습니다.

`aba.c`는 이 순서를 한 thread 안에서 그대로 재생합니다. "thread 1"이 `top`과 `next`를 읽은 뒤 멈추고, 그 사이 "thread 2"가 X, Y를 pop하고 X를 다시 push합니다. 재생이므로 매번 같은 결과가 나옵니다. `-fsanitize=address`로 빌드했습니다.

```text
t1 read: old=X next=Y
t2: popped X and Y, pushed X back; stack now X -> Z
t1 CAS(top, X, Y) succeeded=1; top is now Y, which thread 2 already popped
top->val after thread 2 frees Y: reading freed memory next
==5144==ERROR: AddressSanitizer: heap-use-after-free on address 0x502000000030 at pc 0xaaaac3991fa8 bp 0xffffc71a5580 sp 0xffffc71a5598
SUMMARY: AddressSanitizer: heap-use-after-free /root/w/aba.c:37 in main
```

`top`이 다시 X가 됐으므로 thread 1의 CAS는 성공했고, 스택 꼭대기에는 이미 꺼내서 해제한 Y가 올라갔습니다. Thread 2가 다시 넣은 X는 스택에서 사라졌습니다.

Linux kernel도 같은 문제를 문서로 적어 둡니다. v6.12 `include/linux/llist.h`의 머리 주석은 consumer가 여럿일 때 `llist_del_first()`에 lock이 필요한 이유를 "the list->first is the same as before causing the cmpxchg in llist_del_first to succeed"라고 설명합니다. 그래서 `llist`는 producer 여럿과 consumer 하나(`llist_add` + `llist_del_first`), 또는 모두를 한 번에 떼어 가는 `llist_del_all`만 lock 없이 허용합니다.

## 해결 1 — Tagged Pointer

Pointer 옆에 세대 번호를 붙여 둘을 **한 번에** CAS하면, X가 돌아와도 번호가 달라 CAS가 실패합니다. 64-bit에서는 pointer + tag가 16 byte가 되므로 16-byte CAS가 필요합니다. 그런데 이것이 언어 수준에서 lock-free로 보이는지는 별개입니다.

```c title="lockfree_q.c"
struct tagged { void *ptr; uintptr_t tag; };
_Atomic struct tagged a16;
printf("is_lock_free: 4B=%d 8B=%d 16B=%d\n", (int)atomic_is_lock_free(&a4),
       (int)atomic_is_lock_free(&a8), (int)atomic_is_lock_free(&a16));
```

```text
is_lock_free: 4B=1 8B=1 16B=0
```

gcc 14.2 + glibc 2.41에서는 `-march=armv8.1-a`로 빌드해도 16-byte가 `0`이었고, 이 질의 자체도 inline 상수가 아니라 `libatomic`의 `__atomic_is_lock_free` 호출로 컴파일됐습니다(`-latomic` 필요). 그러니 tagged pointer를 쓰려면 대상 toolchain에서 이 값을 먼저 확인합니다. 또 tag는 ABA를 *탐지*할 뿐, 이미 해제된 노드의 `next`를 읽는 use-after-free는 막지 못합니다. 그것은 다음 두 절의 회수 기법이 맡습니다.

## 해결 2 — Hazard Pointer

Hazard pointer는 Maged M. Michael이 PODC '02(2002년 7월)의 "Safe Memory Reclamation for Dynamic Lock-Free Objects Using Atomic Reads and Writes"에서 제안했고(Fraser 논문의 참고문헌 [Michael02]), 저널판이 ["Hazard pointers: Safe memory reclamation for lock-free objects"](https://research.ibm.com/publications/hazard-pointers-safe-memory-reclamation-for-lock-free-objects)(IEEE TPDS, 2004)입니다. 도서관의 "열람 중" 표지와 같습니다. Reader는 노드를 따라가기 전에 그 주소를 공개 slot에 적고, 노드를 지우려는 thread는 모든 slot을 훑어 아무도 표지를 걸지 않은 노드만 해제합니다.

| 단계 | 필요한 계약 | 빠뜨리면 생기는 일 |
|------|------|------|
| 보호 slot 등록 | 회수 thread가 훑을 수 있는 공유 배열에 slot을 둠 | thread-local 변수에만 적으면 회수 thread가 보지 못함 |
| 읽기·공개·재확인 | 주소를 slot에 쓴 뒤 원래 포인터를 다시 읽어 같은지 확인 | 공개 직전에 노드가 제거·해제됨 |
| Retire | 리스트에서 뗀 노드를 바로 해제하지 않고 retire 목록에 둠 | 다른 reader가 쓰는 노드를 해제 |
| Scan | 모든 slot을 모아 retire 목록과 대조 | 너무 이른 해제 또는 무한히 쌓이는 retire 목록 |

비용은 공개 단계에 있습니다. Keir Fraser의 박사 논문 [*Practical lock-freedom*](https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-579.html)(Cambridge UCAM-CL-TR-579, 2004) 5.2.3절은 이 계열(SMR)이 "Each time a new object reference is traversed it must be announced before it is dereferenced"이고, 그 공개에 "costly memory barrier"가 든다고 적습니다.

## 해결 3 — Epoch Reclamation

Epoch 방식은 노드마다 표지를 거는 대신 전역 시대 번호를 둡니다. 시험장에 비유하면 "3교시 시작 뒤에는 1교시 시험지를 폐기해도 된다"는 규칙입니다. 같은 논문 5.2.3절의 설명대로, 모든 thread가 현재 epoch를 관찰하면 두 epoch 전의 limbo list를 안전하게 해제합니다.

대가는 멈춘 thread입니다. Fraser는 같은 절에서 이 방식이 "not strictly lock-free"라고 하고, 공유 메모리 연산 도중 멈춘 thread가 있으면 "the limbo lists will never be reclaimed and memory cannot be reused"라고 적습니다. 선점형 scheduler에서 연산 중간에 deschedule된 thread도 같은 문제를 만듭니다. [4-06](/blog/embedded/performance-engineering/part4-06-rw-lock#rcu--lock-없는-read)의 RCU도 grace period로 회수 시점을 정하는 같은 계열이라, reader가 read 구간에서 오래 머물면 회수가 밀립니다.

## Lock-Free SPSC Queue

Producer 하나와 consumer 하나만 있으면 CAS 없이 index 두 개로 queue를 만들 수 있습니다. 회전 초밥 레일과 같습니다. 요리사는 빈 접시 자리에만 올리고(`head`), 손님은 올라온 접시만 집습니다(`tail`). 각 index를 쓰는 쪽이 하나뿐이라 경쟁이 없습니다.

```c title="spsc.c (acqrel 모드)"
static int push(uint64_t v) {
    size_t h = atomic_load_explicit(&head, memory_order_relaxed);
    size_t t = atomic_load_explicit(&tail, memory_order_acquire);
    if (h - t == CAP) return 0;                         /* full */
    ring[h & (CAP - 1)] = v;
    atomic_store_explicit(&head, h + 1, memory_order_release);  /* 데이터 쓰기 뒤에 공개 */
    return 1;
}
```

Consumer는 `head`를 acquire로 읽은 뒤 slot을 읽고 `tail`을 release로 올립니다. 용량 1,024, 2,000만 개를 넘기며 consumer가 모든 값의 순서를 검사했습니다(5회 중앙값).

| 방식 | Mitems/s | 순서 어긋남 |
|---|---:|---:|
| release/acquire index | 15.3 | 0 |
| seq_cst index | 15.1 | 0 |
| mutex로 감싼 같은 ring | 7.0 | 0 |

Lock을 빼자 처리량이 두 배가 됐습니다. 반면 seq_cst와 release/acquire는 차이가 없었는데, AArch64에서 seq_cst load/store가 acquire/release와 같은 `LDAR`/`STLR`로 컴파일되기 때문입니다([4-08](/blog/embedded/performance-engineering/part4-08-memory-ordering#arm-명령)). Producer를 둘로 늘리거나 reset·파괴를 동시에 허용하면 "각 index를 한쪽만 쓴다"는 전제가 깨집니다. 구체적인 C++ 계약은 [C++ lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)에서 다룹니다.

## MPMC — Multi-Producer Multi-Consumer

Producer와 consumer가 여럿이면 slot마다 "예약됨, 채워짐, 비워짐" 상태가 생깁니다. 이때 진짜 문제는 예약만 해 놓고 멈춘 thread입니다. 그 뒤의 operation이 그 slot을 건너뛸 수 없다면, CAS를 썼더라도 앞의 \[intro.progress\] 정의에 맞는 lock-free가 아닙니다. 위 SPSC 측정처럼 MPMC도 "멈춘 thread가 있을 때 다른 thread가 끝나는가"를 따로 시험해야 합니다.

## Lock-Free List와 Tree

Fraser 논문 2.3.4절은 CAS 기반 linked list의 계보를 정리합니다. Valois의 첫 설계는 reference count 관리 오류가 뒤의 논문들에서 지적됐고, Tim Harris의 "A Pragmatic Implementation of Non-Blocking Linked Lists"(DISC '01)가 "'pointer marking' to indicate when a node is logically deleted"로 더 단순하고 효율적인 설계를 내놨다고 적습니다. 같은 절에서 Fraser는 이 표시 기법을 4장에서 skip list에 적용한다고 적습니다. 1.3절(Contribution)은 skip list, BST, red-black tree의 lock-free 설계를 제시하고 고성능 lock 기반 설계와 비교한다고 요약합니다.

정리하면 list와 skip list에는 검증된 lock-free 설계가 있지만, 회수(앞의 두 절)까지 포함한 구현은 직접 작성하기보다 검증된 구현을 가져오는 편이 안전합니다.

## 자주 보는 함정과 측정 한계

> ⚠️ "CAS를 썼으니 lock-free"

Allocator(`malloc`), 로그 출력, 회수 scan이 lock을 잡으면 그 API 전체는 lock-free가 아닙니다. Epoch·RCU 회수는 Fraser가 적은 대로 멈춘 thread 앞에서 메모리 상한에 부딪힙니다.

> ⚠️ 16-byte CAS를 lock-free로 가정

```c
_Static_assert(ATOMIC_POINTER_LOCK_FREE == 2, "ptr");   /* 통과 */
/* 16-byte struct는 위 gcc 14.2 환경에서 atomic_is_lock_free() == 0 */
```

> ⚠️ 경쟁 없는 측정만 보고 결론

위 표에서 LSE는 1 thread에서 1.93~2.01 ns(LL/SC 2.28~6.14 ns)였지만 4 thread에서는 더 느렸습니다. 측정은 실제 thread 수와 공유 패턴으로 합니다.

측정에는 처리량 외에 CAS 재시도 횟수, 꼬리 지연, retire 목록 크기, 멈춘 thread가 있을 때의 동작을 함께 기록합니다. 이 글에서는 hazard pointer와 epoch 구현을 직접 실행하지 않았습니다. 두 절의 동작 설명은 Fraser 논문 5.2.3절의 서술에 근거합니다.

## 정리

- C++ \[intro.progress\]의 lock-free는 "동시 실행 중 적어도 하나는 끝난다"이며 시간 상한이 아닙니다.
- 상한 CAS counter는 4 thread에서 정확했지만, 호출 대비 약 22%의 재시도가 있었습니다.
- LSE 단일 명령은 경쟁 없을 때 1.93~2.01 ns(LL/SC 2.28~6.14 ns)였고, 4 thread 경쟁에서는 이 환경에서 LL/SC보다 느렸습니다.
- ABA는 재생 프로그램에서 해제된 노드를 `top`에 올렸고 ASan이 use-after-free로 잡았습니다. Linux `llist`도 같은 이유로 다중 consumer `del_first`에 lock을 요구합니다.
- Tag는 ABA를 탐지할 뿐이고, gcc 14.2에서 16-byte atomic은 `is_lock_free() == 0`이었습니다.
- Hazard pointer는 공개 단계의 barrier 비용, epoch는 멈춘 thread 앞에서의 회수 정지가 대가입니다.
- SPSC ring은 mutex 버전의 두 배(15.3 대 7.0 Mitems/s)였고, AArch64에서 seq_cst index도 같은 속도였습니다.

다음 편은 **Memory Ordering** — acquire-release semantics를 살펴봅니다.

## 관련 항목

- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
- [4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
- [Embedded C++ 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
