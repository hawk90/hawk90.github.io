---
title: "AArch64 Linux MMU 기초 — Translation Table·TLB·ASID"
slug: "embedded/modern-recipes/part2-08-arm-mmu"
date: 2026-04-11T09:20:00
description: "AArch64 Linux의 translation table 단계, PTE 속성 비트, ASID로 TLB를 나누는 방식, TLB를 지우는 시점, fork와 page fault가 page table에 하는 일, SIGSEGV의 MAPERR·ACCERR 구분."
series: "Modern Embedded Recipes"
seriesOrder: 20
tags: [recipes, arm, mmu]
draft: false
topics: ["embedded"]
lastVerified: 2026-10-11
---

## 한 줄 요약

> **"MMU는 모든 메모리 접근을 translation table로 가상 → 물리 주소로 번역하고, TLB는 그 결과를 ASID 태그와 함께 캐시합니다."**

이 글은 Cortex-A 계열의 AArch64에서 Linux kernel이 MMU를 어떻게 쓰는지 다룹니다. ARMv7(AArch32)과 bare-metal MMU 설정은 다루지 않습니다. 가상 메모리와 process의 개념, `mmap()`을 써 본 정도를 전제합니다. 커널 동작은 2026-10-11에 Linux v6.12 태그의 소스·문서를 열어 대조했고, 커널 링크는 모두 v6.12를 가리킵니다.

## 어떤 상황에서 쓰나

- segfault가 `SEGV_MAPERR`인지 `SEGV_ACCERR`인지 보고 원인을 좁힐 때
- kernel config에서 page 크기와 VA 크기를 고를 때
- context switch·`fork()`·`mprotect()`·`munmap()` 뒤에 TLB가 어떻게 맞춰지는지 이해할 때

## 핵심 개념

### Process별 page table

Linux는 process마다 `mm_struct`를 두고, 그 `pgd` 필드가 page table root를 가리킵니다([`include/linux/mm_types.h`](https://github.com/torvalds/linux/blob/v6.12/include/linux/mm_types.h)). 같은 가상 주소가 process마다 다른 물리 page를 가리킬 수 있는 이유입니다.

AArch64 Linux는 가상 주소 bit 55로 TTBR0(user)과 TTBR1(kernel)을 고르고, user pgd에는 non-global(nG) mapping만 들어갑니다([`Documentation/arch/arm64/memory.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/arch/arm64/memory.rst)). 같은 문서는 kernel의 `swapper_pg_dir`에 global mapping만 있다고 쓰지만, 이는 KPTI가 꺼져 있을 때의 코드 동작과만 맞습니다. KPTI를 쓰면 부팅 중 `kpti_install_ng_mappings()`가 이미 만든 kernel mapping을 nG로 다시 쓰고 `arm64_use_ng_mappings`를 켭니다([`arch/arm64/kernel/cpufeature.c`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/kernel/cpufeature.c)). 그 뒤로 kernel mapping의 기본 속성 `PROT_DEFAULT`에 든 `PTE_MAYBE_NG`가 `PTE_NG`가 되어 kernel mapping도 nG입니다([`pgtable-prot.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/pgtable-prot.h)). global과 nG의 차이는 아래 "TLB와 ASID"에서 다룹니다.

### Translation table 단계

4 KB page, 48-bit VA에서 가상 주소의 bit 47:39·38:30·29:21·20:12가 차례로 L0·L1·L2·L3 table index이고, 11:0이 page 안 offset입니다(memory.rst의 "Translation table lookup with 4KB pages"). index가 9 bit이므로 table 하나는 entry 512개이고, descriptor가 64 bit(`pteval_t`가 `u64`, [`pgtable-types.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/pgtable-types.h))라 512 × 8 B = 4 KB, 즉 table 하나가 page 하나에 들어갑니다.

TLB에 없는 주소는 MMU가 L0부터 level마다 descriptor를 읽는 table walk로 번역합니다. L1·L2 descriptor가 다음 table이 아니라 block descriptor면 walk는 그 level에서 끝나고, 4 KB granule에서 L1 block은 1 GB, L2 block은 2 MB를 한 entry로 덮습니다. L0에는 block descriptor가 없습니다([Arm, *Learn the architecture – AArch64 memory management*, 101811_0105_00_en](https://documentation-service.arm.com/static/68e680a2587fd957f5efd742) 6장 "Translation table format"·7장 "Translation granule"). 같은 가이드는 큰 block이 walk의 읽기 횟수를 줄이고 TLB에 더 효율적으로 캐시된다고 설명합니다(5.3절).

### Page 크기와 VA 크기 고르기

page 크기와 VA 크기는 table level 수와 huge page 크기를 함께 정합니다. 아래 표의 level 수는 v6.12 [`arch/arm64/Kconfig`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/Kconfig)의 `PGTABLE_LEVELS`, huge page 크기는 [`Documentation/arch/arm64/hugetlbpage.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/arch/arm64/hugetlbpage.rst)의 표입니다.

| Page 크기 | 48-bit VA level | 52-bit VA level | PMD block | Contiguous PTE |
| --- | --- | --- | --- | --- |
| 4 KB | 4 | 5 | 2 MB | 64 KB |
| 16 KB | 4 | 4 | 32 MB | 2 MB |
| 64 KB | 3 | 3 | 512 MB | 2 MB |

VA를 줄이면 level도 줄어듭니다. 4 KB/39-bit와 16 KB/47-bit은 3단, 16 KB/36-bit과 64 KB/42-bit은 2단입니다(같은 Kconfig). table walk는 level마다 descriptor를 하나씩 읽으므로, level이 하나 늘면 page 단위 번역의 walk가 한 단계 길어집니다.

v6.12 Kconfig의 기본값은 4 KB page와 52-bit VA입니다. 52-bit를 고를 때 따질 점은 셋입니다.

- **하드웨어.** 4 KB·16 KB granule에서 52-bit 주소는 Armv8.7-A·Armv9.2-A 이전에는 쓸 수 없었습니다(Arm 가이드 7장). 하드웨어가 지원하지 않으면 kernel은 48-bit로 돌아가고(`ARM64_VA_BITS_52` help), 4 KB의 5단도 4단으로 줄어듭니다(`pgtable_l5_enabled()`가 `ARM64_HAS_VA52`일 때만 참, [`asm/pgtable.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/pgtable.h)).
- **user 주소.** user space는 기본으로 48-bit 범위의 주소를 받고, 48-bit보다 큰 hint를 `mmap()`에 줄 때만 52-bit 범위를 받습니다(memory.rst "52-bit userspace VAs"). 그 상한 `TASK_SIZE_64`는 실제 VA 폭 `vabits_actual`로 정해지므로 하드웨어가 52-bit를 지원하지 않으면 hint를 줘도 48-bit입니다([`asm/processor.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/processor.h)).
- **Pointer Authentication.** 같은 help는 52-bit VA와 PAC를 함께 쓰면 PAC가 7 bit에서 3 bit로 줄어든다고 경고하고, 확실하지 않으면 48-bit를 고르라고 권합니다.

### TLB와 ASID

TLB는 최근 번역 결과를 캐시합니다. process마다 같은 VA가 다른 물리 주소로 가므로, context switch 때 TLB를 비우지 않으려면 entry가 어느 process 것인지 구분해야 합니다. AArch64는 descriptor의 nG bit로 이를 나눕니다. nG = 1 entry는 TLB에 ASID와 함께 저장되고, lookup 때 현재 ASID와 다르면 쓰이지 않습니다. global entry는 어느 process에서나 쓰입니다(Arm 가이드 4.6절).

Linux arm64는 이를 다음처럼 씁니다([`arch/arm64/mm/context.c`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/mm/context.c)).

- **ASID 폭.** `ID_AA64MMFR0_EL1.ASIDBits`를 읽어 8 bit 또는 16 bit를 씁니다(`get_cpu_asid_bits`).
- **user page는 모두 nG.** user용 protection 값(`_PAGE_READONLY`, `_PAGE_SHARED` 등)에 모두 `PTE_NG`가 들어 있습니다(pgtable-prot.h).
- **Context switch.** `cpu_do_switch_mm`은 새 pgd를 TTBR0_EL1에, ASID를 TTBR1_EL1에 씁니다. Linux는 TCR_EL1.A1을 켜서([`proc.S`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/mm/proc.S)의 `TCR_A1`) TTBR1의 ASID를 쓰므로, ASID가 보통 TTBR0에 있다고 설명하는 위 Arm 가이드와 위치가 다릅니다. 이 함수에는 TLB invalidate가 없습니다.
- **ASID가 바닥날 때.** 빈 ASID가 없으면 generation을 올리고(`new_context`), 모든 CPU에 flush 표시를 남깁니다(`flush_context`). 각 CPU는 다음 context switch에서 `local_flush_tlb_all()`(TLBI VMALLE1)로 자기 TLB를 비웁니다.
- **KPTI.** KPTI를 쓰면 ASID를 짝으로 씁니다. bit 0이 켜진 ASID(`USER_ASID_FLAG`, [`asm/mmu.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/mmu.h))는 userspace만 mapping하고, 짝수 ASID는 kernel용으로 예약합니다(`set_kpti_asid_bits`의 주석). 그래서 process가 받을 수 있는 ASID가 절반입니다.

부팅 로그에서 이 결과를 볼 수 있습니다. `asids_update_limit()`은 `ASID allocator initialised with N entries`를 찍고, N은 2^ASID 폭이며 KPTI를 쓰면 그 절반입니다. 8-bit ASID CPU면 256, KPTI를 켜면 128이고, 16-bit면 65536, KPTI를 켜면 32768입니다.

### TLB를 언제 지우나

Arm 가이드 8.1절 "Updating translations"의 규칙은 두 가지입니다. translation fault를 내는 번역은 TLB에 캐시될 수 없으므로, invalid descriptor를 valid로 바꿀 때는 TLBI가 필요 없습니다. 반대로 valid 번역을 지우거나 바꿀 때는 TLBI가 필요합니다. 가이드는 valid 번역을 *다른* valid 번역으로 바꾸는 예로, 먼저 invalid로 만들고 TLBI한 뒤 새 값을 쓰는 Break-Before-Make(BBM)를 듭니다. Linux arm64는 모든 변경에 BBM을 쓰지는 않습니다. 쓰기 금지 전환이나 access flag 갱신처럼 일부 변경은 [`pgtable.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/pgtable.h)의 `___ptep_set_wrprotect`처럼 살아 있는 PTE를 `cmpxchg`로 제자리에서 바꾸고 TLBI를 나중에 합니다. TLB를 지우는 경로는 이렇게 나뉩니다([`tlbflush.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/tlbflush.h), [`asm/tlb.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/tlb.h)).

| 상황 | TLB 처리 |
| --- | --- |
| 빈 PTE에 처음 page를 채움(first touch) | invalid → valid라 TLBI 대상이 아님 |
| `munmap()`·`mprotect()` 범위 | mmu_gather의 `tlb_flush()` → `__flush_tlb_range()`가 그 ASID로 page마다 `TLBI VALE1IS`(table을 해제했으면 `VAE1IS`). range TLBI가 있는 CPU는 `RVALE1IS` 같은 range 명령 |
| 위 범위가 큼 | range TLBI가 없는 CPU에서 page `PTRS_PER_PTE`개(4 KB page면 512개, 2 MB) 이상이면 `flush_tlb_mm()` |
| process 종료(fullmm) | table을 해제했을 때만 `flush_tlb_mm()`. 주석대로 ASID allocator가 TLB 전체를 비우기 전에는 그 ASID를 다시 주지 않기 때문 |
| `fork()` 끝 | `dup_mmap()`이 parent에 `flush_tlb_mm()` (아래 "fork와 COW") |

`flush_tlb_mm()`은 `TLBI ASIDE1IS`로 그 ASID의 entry만 지우고, KPTI를 쓰면 `__tlbi_user`로 짝 ASID에도 같은 TLBI를 냅니다.

### PTE 속성 비트

page마다 권한과 메모리 속성이 descriptor bit로 붙습니다. 아래는 v6.12 [`pgtable-hwdef.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/include/asm/pgtable-hwdef.h)의 정의입니다.

| Bit | 커널 macro | 의미 |
| --- | --- | --- |
| 0 | `PTE_VALID` | valid descriptor |
| 4:2 | `PTE_ATTRINDX` | AttrIndx[2:0], MAIR 레지스터의 memory attribute 번호 |
| 6 | `PTE_USER` | AP[1], user 접근 |
| 7 | `PTE_RDONLY` | AP[2], read-only |
| 9:8 | `PTE_SHARED` | SH[1:0] = 3(inner shareable). LPA2를 켜면 출력 주소 bit(`PTE_ADDR_HIGH`) |
| 10 | `PTE_AF` | Access Flag |
| 11 | `PTE_NG` | nG, 1이면 ASID에 묶임 |
| 53 | `PTE_PXN` | privileged execute never |
| 54 | `PTE_UXN` | user execute never |

bit 9:8은 구성에 따라 뜻이 바뀝니다. 4 KB·16 KB page에서 52-bit VA를 고르면 물리 주소도 52-bit(`ARM64_PA_BITS_52`)만 고를 수 있고, 이때 `ARM64_LPA2`가 켜집니다(Kconfig의 `ARM64_PA_BITS_48`·`ARM64_LPA2`). 하드웨어가 52-bit VA를 지원해 TCR_EL1.DS가 켜지면 이 두 bit는 출력 주소 bit로 쓰이므로, kernel은 `PTE_SHARED`를 빼고 씁니다(proc.S의 주석, [`arch/arm64/mm/mmap.c`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/mm/mmap.c)의 `adjust_protection_map`).

`mmap.c`의 `protection_map`은 VMA 권한마다 기본 protection 값 `vma->vm_page_prot`를 정합니다.

- user page는 모두 `PTE_PXN`이라 kernel이 실행할 수 없고, `PROT_EXEC` 없이 만든 mapping은 `PTE_UXN`도 붙어 user도 실행할 수 없습니다.
- `MAP_PRIVATE`로 쓰기 가능하게 만든 VMA도 기본값은 `PAGE_READONLY`입니다. 쓰기 가능 PTE는 fault 처리기가 만듭니다. 예를 들어 anonymous VMA의 첫 write에서 `do_anonymous_page()`는 `mk_pte(…, vma->vm_page_prot)`로 PTE를 만든 뒤 VMA에 `VM_WRITE`가 있으면 `pte_mkwrite(pte_mkdirty(…))`로 쓰기 가능하게 바꿉니다([`mm/memory.c`](https://github.com/torvalds/linux/blob/v6.12/mm/memory.c)).

### fork와 COW

`fork()`에서 child는 새 `mm_struct`와 **자기 pgd**를 받습니다(`mm_init` → `mm_alloc_pgd`, [`kernel/fork.c`](https://github.com/torvalds/linux/blob/v6.12/kernel/fork.c)). parent와 child가 page table을 공유하지 않습니다. 그다음 `dup_mmap`이 `VM_WIPEONFORK`가 아닌 VMA마다 `copy_page_range()`를 부릅니다(mm/memory.c).

- `vma_needs_copy()`가 false인 VMA(`anon_vma`가 붙지 않았고 `VM_PFNMAP`·`VM_MIXEDMAP`·uffd-wp도 아닌 VMA)는 PTE를 복사하지 않습니다. child가 접근할 때 page fault가 채웁니다.
- 복사하는 VMA 중 private이면서 쓰기 가능한 COW mapping은 writable PTE를 **parent와 child 양쪽에서** write-protect합니다(`copy_present_ptes`의 "write protect it both processes").

parent 쪽 write-protect는 valid 번역을 바꾸는 일이라 TLBI가 필요합니다. 그래서 `dup_mmap()`은 복사를 마친 뒤 `flush_tlb_mm(oldmm)`으로 parent ASID의 entry를 지웁니다. TLB entry를 지우지 않으면 processor가 옛 번역을 계속 쓸 수 있으므로(Arm 가이드 8장), 이 flush가 없으면 parent의 write가 TLB에 남은 writable 번역으로 fault 없이 child와 공유하는 page에 들어갈 수 있습니다.

이렇게 fork 직후 두 process는 같은 물리 page를 각자의 page table에서 read-only로 가리킵니다. 어느 쪽이든 write하면 permission fault가 나고 `do_wp_page()`로 갑니다. 그 page를 이 process만 쓰고 있으면 그대로 쓰기 가능으로 바꾸고(`wp_page_reuse`), 아니면 `wp_page_copy()`가 새 page를 할당해 내용을 복사합니다. `wp_page_copy()`는 PTE를 `ptep_clear_flush()`로 지우고 TLB를 flush한 뒤 새 PTE를 씁니다. 코드 주석은 예전처럼 새 PTE를 먼저 쓰고 flush하면 TLB마다 옛 PTE와 새 PTE가 섞이는 구간이 생긴다고 설명합니다. 위 BBM 순서입니다.

### Page fault 처리

AArch64 fault는 종류별로 처리 함수가 나뉩니다([`arch/arm64/mm/fault.c`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/mm/fault.c)). user 주소의 translation fault(invalid descriptor)와 permission·access flag fault는 모두 `do_page_fault()`로 갑니다. 여기서 주소를 포함한 VMA가 없으면 `SIGSEGV`(`SEGV_MAPERR`), VMA가 그 접근(read·write·exec)을 허용하지 않으면 `SIGSEGV`(`SEGV_ACCERR`)입니다. VMA 검사를 통과했어도 `handle_mm_fault()`가 `VM_FAULT_SIGSEGV`를 돌려주면 `SEGV_MAPERR`입니다. VMA가 맞으면 `handle_mm_fault()` → `handle_pte_fault()`가 PTE 상태로 분기합니다. 아래는 그 분기 중 이 글과 관련된 것입니다.

| PTE 상태 | 처리 |
| --- | --- |
| PTE 없음, anonymous VMA | `do_anonymous_page()`: read면 zero page를 mapping, write면 새 page 할당 |
| PTE 없음, file VMA | `do_fault()`가 file page를 mapping |
| present가 아닌 PTE(swap entry 등) | `do_swap_page()` |
| present, write 불가 PTE에 write | `do_wp_page()` (COW, zero page 포함) |

처리를 마친 fault는 `mm_account_fault()`가 셉니다. `VM_FAULT_MAJOR`이거나 재시도한 fault면 task의 `maj_flt`, 아니면 `min_flt`를 1 올립니다.

## 코드 / 실제 사용 예

### First touch와 minor fault 수

`mmap()`은 VMA만 만들고 PTE는 비워 둡니다. 아래 코드는 첫 write 앞뒤로 `getrusage()`의 `ru_minflt`([`getrusage(2)`, man-pages 6.9](https://git.kernel.org/pub/scm/docs/man-pages/man-pages.git/tree/man/man2/getrusage.2?h=man-pages-6.9))를 읽습니다.

```c
#include <stdio.h>
#include <sys/mman.h>
#include <sys/resource.h>

int main(void) {
    struct rusage before, after;
    char *p = mmap(NULL, 4096,
                   PROT_READ | PROT_WRITE,
                   MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED)
        return 1;

    getrusage(RUSAGE_SELF, &before);
    p[0] = 42;          /* first touch: write fault, do_anonymous_page() */
    getrusage(RUSAGE_SELF, &after);

    printf("minor faults: %ld\n", after.ru_minflt - before.ru_minflt);
    munmap(p, 4096);
    return 0;
}
```

첫 write는 위 표의 첫 행에서 `do_anonymous_page()`로 가고, 이 fault 하나가 `min_flt`를 1 올립니다. `p[0] = 42` 앞에 `volatile char c = p[0];` 같은 read를 먼저 넣으면 read가 zero page를 read-only로 mapping하고, 이어지는 write가 `do_wp_page()` → `wp_page_copy()`로 새 page를 받습니다. 이때는 fault가 둘입니다.

### SIGSEGV 진단: MAPERR와 ACCERR

`si_code`는 `SEGV_MAPERR`(address not mapped to object)와 `SEGV_ACCERR`(invalid permissions for mapped object)로 나뉩니다([`sigaction(2)`, man-pages 6.9](https://git.kernel.org/pub/scm/docs/man-pages/man-pages.git/tree/man/man2/sigaction.2?h=man-pages-6.9)). 아래 프로그램은 두 경우를 만듭니다.

```c
#include <signal.h>
#include <sys/mman.h>
#include <unistd.h>

static void on_segv(int sig, siginfo_t *si, void *ctx) {
    static const char map[] = "SEGV_MAPERR\n";
    static const char acc[] = "SEGV_ACCERR\n";
    (void)sig;
    (void)ctx;
    if (si->si_code == SEGV_MAPERR)
        write(STDERR_FILENO, map, sizeof(map) - 1);
    else if (si->si_code == SEGV_ACCERR)
        write(STDERR_FILENO, acc, sizeof(acc) - 1);
    _exit(1);
}

int main(int argc, char **argv) {
    (void)argv;
    struct sigaction sa = { 0 };
    sa.sa_sigaction = on_segv;
    sa.sa_flags = SA_SIGINFO;
    sigaction(SIGSEGV, &sa, NULL);

    volatile char *p = mmap(NULL, 4096, PROT_READ,
                            MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED)
        return 2;

    if (argc > 1)
        munmap((void *)p, 4096);    /* VMA removed */
    p[0] = 1;                       /* write */
    return 0;
}
```

`do_page_fault()`를 따라가면 결과가 정해집니다.

- **인자 없이 실행.** VMA는 있지만 `VM_WRITE`가 없으므로 `SEGV_ACCERR`입니다. 이 page는 한 번도 접근하지 않아 PTE가 없으므로 하드웨어가 낸 것은 permission fault가 아니라 translation fault입니다. 이 경우의 `si_code`는 하드웨어 fault 종류가 아니라 `do_page_fault()`의 VMA 검사에서 정해집니다.
- **인자를 주고 실행.** `munmap()`으로 VMA가 없어졌으므로 `SEGV_MAPERR`입니다.

실제 프로그램에서는 `si_addr`를 `/proc/<pid>/maps`의 줄과 대조합니다. 그 주소를 포함한 줄이 없으면 MAPERR 쪽이고(해제한 메모리, 잘못된 포인터), 줄이 있으면 권한 칸(`r--p`처럼 r·w·x와 private `p`/shared `s`, [`proc.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/filesystems/proc.rst))이 그 접근을 허용하지 않는 ACCERR 쪽입니다. handler를 달지 않고 process가 죽게 두면 `show_unhandled_signals`가 켜진 kernel은 `unhandled exception` 줄에 하드웨어 fault 이름(`level N translation fault`, `level N permission fault` 등)을 남깁니다([`arch/arm64/kernel/traps.c`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/kernel/traps.c)의 `arm64_show_signal`, fault.c의 `fault_info` 표).

## 자주 보는 함정

> ⚠️ KPTI와 8-bit ASID

8-bit ASID CPU에서 KPTI를 쓰면 allocator가 쓰는 ASID는 128개입니다("TLB와 ASID"의 부팅 로그). ASID가 절반이면 빈 ASID도 그만큼 빨리 바닥나고, 바닥날 때마다 generation이 바뀌며 CPU마다 TLB 전체를 비웁니다. `asids_update_limit()`은 쓸 수 있는 ASID − 1이 possible CPU 수 이하이면 경고(`WARN_ON`)를 냅니다.

## 정리

- 4 KB page에서 52-bit VA는 하드웨어가 지원할 때만 5단 table이 되고, PAC를 3 bit로 줄이므로 48-bit와 비교해 고릅니다.
- user mapping은 nG라 context switch 경로(`cpu_do_switch_mm`)에는 TLBI가 없고, ASID가 바닥나면 CPU별로 TLB 전체를 비웁니다.
- `mprotect`·`munmap`·fork의 write-protect·COW 복사처럼 valid PTE를 바꾸는 경로는 TLBI를 내고, 빈 PTE를 채우는 first touch는 Arm 규칙상 TLBI가 필요 없습니다.
- `SEGV_MAPERR`·`SEGV_ACCERR`는 하드웨어 fault 종류가 아니라 VMA가 있는지, 그 접근을 허용하는지로 갈리므로 `si_addr`를 `/proc/<pid>/maps`와 대조해 원인을 좁힙니다.

다음 편은 Cortex-A의 MMU가 아니라 Cortex-M33에서 Secure·Non-Secure를 나누는 **TrustZone-M 기초**입니다. M-profile의 메모리 보호는 [2-07: MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)에서 다룹니다.

## 관련 항목

- [2-02: Cortex-A 시리즈 비교](/blog/embedded/modern-recipes/part2-02-cortex-a-comparison)
- [2-06: ARM 캐시 (L1/L2)](/blog/embedded/modern-recipes/part2-06-arm-cache)
- [2-07: MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)
- [2-09: TrustZone-M 기초](/blog/embedded/modern-recipes/part2-09-trustzone-m)
- [7-09: mmap 4가지 모드](/blog/embedded/modern-recipes/part7-09-mmap) — `mlock`·prefault로 real-time 작업의 page fault 피하기
- [8-04: DMA-Friendly Allocator](/blog/embedded/modern-recipes/part8-04-dma-allocator) — device에 CPU 가상 주소 대신 DMA 주소 넘기기
