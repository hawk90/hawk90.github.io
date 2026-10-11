# 작성자 측정 요청 — `part2-08-arm-mmu.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part2-08-arm-mmu.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 2 (최종 점수 72, 상태 `unresolved`)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어에서 잰 값과 기록이 있어야 오른다. 아래 항목을 측정해 주면 글에 넣는다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 측정값은 작성자가 직접 잰 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. 부팅 로그의 ASID 폭·KPTI 상태와 'ASID allocator initialised with N entries' 실측 (KPTI on/off 비교)

- **준비:** 작성자가 가진 AArch64 보드 1~2종(예: Cortex-A53/A72/A55 계열; 보드명·SoC·코어 종류를 기록). Linux v6.12 커널(정확한 uname -r, defconfig 여부, CONFIG_UNMAP_KERNEL_AT_EL0·CONFIG_RANDOMIZE_BASE 값). 가능하면 8-bit ASID 코어와 16-bit ASID 코어 각각 하나.
- **절차:** (a) dmesg | grep -iE 'ASID allocator|kernel page table isolation|KPTI'; (b) cat /sys/devices/system/cpu/vulnerabilities/meltdown; (c) MIDR 확인: grep -E 'CPU implementer|CPU part' /proc/cpuinfo | sort -u; (d) 커널 cmdline에 kpti=1, kpti=0을 각각 주고 재부팅해 (a)~(b)를 반복(코어가 Meltdown 영향 없음이면 kpti=1로 강제한 경우만 비교); (e) KASLR(nokaslr 유무)도 바꿔 두 조합에서 dmesg의 KPTI 관련 줄이 어떻게 달라지는지 기록.
- **기록할 것:** 보드·SoC·코어별로 KPTI 상태 문자열, ASID allocator 줄의 N 값 원문(그대로 복사), meltdown sysfs 문자열, cmdline 전체, CONFIG 값. N이 본문 L68의 256/128/65536/32768 중 어느 것과 맞는지 표시. 측정 안 한 조합은 빈칸.
- **글에 넣을 위치:** 「TLB와 ASID」 절 L68 부팅 로그 문단 바로 뒤에 '작성자 보드에서 본 값' 짧은 표 1개(보드·코어·KPTI·N). 「자주 보는 함정 — KPTI와 8-bit ASID」에서 그 표를 한 번 가리키기.
- **오르는 항목:** C: 소스에서 유도한 예상값을 실제 관찰값으로 바꿈(8~11 구간의 '관찰 결과' 요건). 8-bit/16-bit, KPTI on/off 환경 차이까지 있으면 12 쪽. A: 커널 문서와 실제 부팅 로그를 대조한 이 글만의 결과. L32 KPTI/KASLR 조건 서술의 실증 근거도 됨.

## 2. First-touch 예제의 minor fault 수 실측 (write-only vs read-then-write)

- **준비:** 위 보드, Linux v6.12. 기록할 조건: /sys/kernel/mm/transparent_hugepage/enabled, /sys/kernel/mm/transparent_hugepage/hugepages-*/enabled(mTHP), getconf PAGESIZE, gcc 버전과 최적화 옵션(-O0/-O2 둘 다).
- **절차:** (a) 본문 L139-158 코드를 그대로 빌드해 20회 실행; (b) p[0]=42 앞에 'volatile char c = p[0]; (void)c;'를 넣은 변형을 빌드해 20회 실행; (c) 같은 측정을 perf stat -e minor-faults,page-faults ./a.out로도 한 번(프로세스 전체 수라 참고용); (d) THP를 always/never로 바꿔(4 KB 매핑이라 영향이 없어야 함) 한 번씩 반복.
- **기록할 것:** 변형별 출력된 'minor faults: N'의 분포(20회 중 각 값의 횟수), 컴파일 옵션, THP/mTHP 설정 문자열, 커널 버전. 예상(1, 2)과 다른 값이 나오면 그 값과 조건을 그대로 기록하고 해석은 붙이지 말 것.
- **글에 넣을 위치:** 「First touch와 minor fault 수」 코드 아래 L162 문단 끝에 '작성자 보드(…, v6.12, THP …)에서 20회 모두 1/2였다' 한 문장 또는 2행 표. 현재 '예상 결과' 문구를 관찰 결과로 대체.
- **오르는 항목:** C: '코드에서 유도한 예상'만 있어 9에 묶인 항목을 '실행 환경 + 관찰 결과'로 바꿔 8~11 상단, 컴파일 옵션·THP 차이를 기록하면 12 근처. A: 소량.

## 3. SIGSEGV 예제의 si_code와 하드웨어 fault 종류를 같은 실행에서 대조

- **준비:** 위 보드, Linux v6.12. sysctl debug.exception-trace(= show_unhandled_signals) 값 기록. 예제 2개 빌드: 본문 코드(handler 있음), handler 등록 줄(sigaction)을 뺀 변형.
- **절차:** (a) handler 있는 버전을 인자 없이/인자 있게 각각 실행해 stderr 출력 기록; (b) sudo sysctl -w debug.exception-trace=1; (c) handler 없는 변형을 인자 없이/인자 있게 실행하고 dmesg | tail로 'unhandled exception' 줄 원문 캡처; (d) 추가로 PTE가 이미 있는 경우를 보려면 PROT_READ 매핑을 먼저 한 번 읽은 뒤 write하는 변형을 실행해 (c)의 fault 이름이 'translation'에서 'permission'으로 바뀌는지 확인.
- **기록할 것:** 경우별(인자 없음, munmap 후, read 후 write) 출력된 SEGV_* 문자열과 dmesg 줄 원문(ESR 값, 'level N translation/permission fault' 부분 포함, 주소는 가려도 됨). 커널 버전, exception-trace 값.
- **글에 넣을 위치:** 「SIGSEGV 진단」 절 L211-214 bullet 뒤에 3행 표(경우 / si_code / 커널 로그의 fault 이름). L216의 'show_unhandled_signals' 문장은 이 표를 가리키는 문장으로 줄임.
- **오르는 항목:** C: 'si_code는 HW fault 종류가 아니라 VMA 검사로 정해진다'는 핵심 주장을 실제 로그로 보여 줌(관찰 결과 + 환경 → 12 근처). A: 같은 ACCERR가 translation fault와 permission fault 양쪽에서 나온다는 대조는 다른 글에 드문 진단 근거라 A 상단 근거.

## 4. fork 뒤 COW fault 수 실측 (parent·child의 첫 write)

- **준비:** 위 보드, Linux v6.12. 소스는 작성자가 새로 쓴 작은 C 프로그램: MAP_PRIVATE|MAP_ANONYMOUS로 N=16 page를 잡아 모두 write로 채운 뒤 fork; parent와 child가 각각 getrusage(RUSAGE_SELF) 앞뒤로 16 page에 한 번씩 write. THP 설정 기록.
- **절차:** (a) 프로그램을 10회 실행해 parent·child의 ru_minflt 차이를 출력; (b) 대조군: fork 전에 매핑만 하고 write하지 않은 경우(vma_needs_copy false 경로) 같은 측정; (c) child가 먼저 exit한 뒤 parent가 write하는 변형(wp_page_reuse 경로).
- **기록할 것:** 변형별 parent/child minflt 차이(10회 분포), N, page 크기, THP 설정, 커널 버전. 예상(16, 16 / reuse 경로)과 다르면 그대로 기록.
- **글에 넣을 위치:** 「fork와 COW」 절 L116 다음에 '작성자 보드에서 본 fault 수' 3행 표. 함수 체인 서술(AP-C-25 지적)을 줄이고 그 자리를 관찰값으로 대체.
- **오르는 항목:** C: fork/COW 절이 소스 추적만 있는 상태에서 관찰 결과가 생김(8~11 → 12 쪽). A: reuse/copy 두 경로를 fault 수로 구분해 보여 주는 이 글만의 예제.

## 5. mprotect() 범위 크기에 따른 소요 시간: range TLBI 유무와 512-page 경계 전후

- **준비:** 가능하면 두 코어: range TLBI가 없는 코어(예: Cortex-A53/A72)와 있는 코어(Armv8.4-TLBI 지원, 예: Neoverse N2/Cortex-A710 계열; dmesg 또는 /proc/cpuinfo의 Features와 ID_AA64ISAR0_EL1.TLB 확인 방법을 기록). Linux v6.12, CPU 주파수 고정(performance governor), 측정 코어 고정(taskset).
- **절차:** 작성자가 쓴 하네스: 4 KB page 기준 range = 256, 511, 512, 513, 1024, 8192 page를 mmap 후 모두 touch, mprotect(PROT_READ)↔mprotect(PROT_READ|PROT_WRITE)를 반복(각 1000회 이상)하며 clock_gettime(CLOCK_MONOTONIC_RAW)로 호출당 시간을 잰다. 하네스 소스와 원본 로그를 보관. 가능하면 perf stat -e dTLB-load-misses(또는 L1D_TLB_REFILL raw 이벤트)를 같이.
- **기록할 것:** 코어·page 수별 호출당 시간 중앙값·p99(ns)와 반복 횟수, 하네스 소스 위치, 원본 로그 파일. 512 경계에서 계단이 보이는지(range TLBI 없는 코어) 여부는 숫자로만 표시하고, 차이가 없으면 없다고 기록.
- **글에 넣을 위치:** 「TLB를 언제 지우나」 표(L76-82) 아래에 '작성자 보드에서 본 비용' 소절 하나(표 1개 + 측정 조건 한 줄). 표 셀에 숫자를 넣지 말 것(F 모바일 가독성 지적).
- **오르는 항목:** C: flush 경로 선택(page 단위 TLBI vs flush_tlb_mm)의 실제 트레이드오프를 측정으로 보여 줌. C 12~15 요건('실제 측정·트레이드오프·환경 차이'). A: 소스상 경계값을 실제 비용 곡선으로 닫는 선택 기준.

## 6. context switch 동안 TLB refill 관찰 (형제 글 AP-C-18 '수십 µs'·'tlbi vmalle1is' 모순을 데이터로 정리)

- **준비:** 위 보드, Linux v6.12, perf 사용 가능 커널(CONFIG_PERF_EVENTS, 코어 PMU 노출 확인: ls /sys/bus/event_source/devices). 코어 하나에 두 프로세스를 묶음(taskset -c 1).
- **절차:** (a) perf bench sched pipe -l 1000000를 taskset -c 1로 실행해 usecs/op 기록; (b) 같은 실행을 perf stat -e context-switches,dTLB-load-misses,iTLB-load-misses(또는 raw L1D_TLB_REFILL/L2D_TLB_REFILL/DTLB_WALK)로 감싸 switch당 TLB refill 수를 계산; (c) 스레드 버전(perf bench sched pipe -T, 같은 mm이라 ASID 변경 없음)과 비교; (d) KPTI on/off(1번 항목) 각각.
- **기록할 것:** 구성별 usecs/op, context-switches 수, TLB refill/walk 이벤트 수와 switch당 값, 사용한 raw 이벤트 코드, 커널 버전·코어. 해석은 'switch당 refill 수가 프로세스/스레드에서 어떤지'까지만.
- **글에 넣을 위치:** 「TLB와 ASID」 절 Context switch bullet(L64) 뒤 한 문장 + 작은 표, 또는 「정리」 두 번째 bullet의 근거로. 형제 글 rtos/practical-internals/part2-06의 '수십 µs'를 고칠 때 같은 숫자를 인용할 수 있음.
- **오르는 항목:** C: 'context switch 경로에 TLBI 없음'을 소스뿐 아니라 측정으로 보여 줌(12 근처). D/A: 형제 글과의 모순(AP-C-18)을 해결할 1차 데이터. 작성자만 낼 수 있는 비교라 A에도 기여.

## 7. 보드의 실제 VA 폭과 52-bit mmap hint 동작

- **준비:** 위 보드, Linux v6.12. CONFIG_ARM64_VA_BITS, CONFIG_ARM64_FORCE_52BIT, CONFIG_ARM64_64K_PAGES/16K 값(zcat /proc/config.gz 또는 /boot/config-*). 코어가 LVA/LPA2를 지원하는지.
- **절차:** (a) getconf PAGESIZE; (b) dmesg | grep -i 'virtual\|VA_BITS\|52-bit'; (c) 작은 C 프로그램으로 hint 없이 mmap, hint=(void*)(1UL<<50)로 mmap해 반환 주소 출력; (d) cat /proc/self/maps 마지막 줄(stack 위치)로 user VA 상한 확인.
- **기록할 것:** page 크기, CONFIG 값, 두 mmap 반환 주소(16진), stack 상단 주소, 코어 지원 여부. 52-bit 하드웨어가 없으면 hint를 줘도 48-bit 이하 주소가 나오는지 그대로 기록.
- **글에 넣을 위치:** 「Page 크기와 VA 크기 고르기」 'user 주소' bullet(L55) 뒤 한 문장. FORCE_52BIT 예외 서술(지적 사항)과 함께 두기.
- **오르는 항목:** C: 설정 선택 절에 관찰 결과 추가(소폭). A: 본문이 소스로 주장한 'hint를 줘도 48-bit'를 실제 하드웨어에서 확인.
