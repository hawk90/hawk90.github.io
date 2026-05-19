---
title: "Ch 14: Sanitizer 종합 — ASan, MSan, TSan, UBSan, HWASan, LSan"
date: 2026-05-18T15:00:00
description: "런타임 메모리·동시성·UB 검출 도구 5종 비교, 정밀 조합 가이드, production safe mode, 임베디드 적용."
tags: [cert-c, sanitizer, asan, msan, tsan, ubsan, hwasan, lsan, runtime]
series: "CERT C"
seriesOrder: 14
draft: false
---

13장에서 *fuzzing*과 sanitizer를 결합하는 패턴을 봤다. 이 장은 *각 sanitizer*의 동작 원리, 검출 가능 버그, 결합 전략, *production 빌드에 켤 수 있는가*까지 본다.

## Sanitizer 5종 — 한눈에

| Sanitizer | 검출 | 메모리 비용 | 성능 비용 | Production? |
|-----------|------|-----------|---------|------------|
| **AddressSanitizer (ASan)** | OOB, UAF, double-free | 2~3× | 30~70% | 보통 X (테스트 only) |
| **HWAddressSanitizer (HWASan)** | ASan과 동일, ARM64 | 1.1× | 5~20% | 일부 (Android) |
| **MemorySanitizer (MSan)** | 미초기화 메모리 사용 | 2~3× | 100~300% | X |
| **ThreadSanitizer (TSan)** | Data race | 5~10× | 5~15× | X |
| **UndefinedBehaviorSanitizer (UBSan)** | UB (integer, alignment 등) | < 5% | < 10% | 일부 가능 |
| **LeakSanitizer (LSan)** | Memory leak | < 5% | 추가 비용 거의 없음 | 일부 가능 |
| **Control Flow Integrity (CFI)** | indirect call/vcall 변조 | < 1% | < 5% | **가능 (권장)** |
| **Shadow Call Stack (SCS)** | Return address 변조 | 작음 | < 1% | **가능 (ARM64)** |

## AddressSanitizer (ASan) — 가장 유명

### 메커니즘

*Shadow memory* 사용. 모든 메모리 8 byte에 *1 byte shadow*. *접근 가능 여부 표시*.

```
Real memory:    [allocated 8 bytes][redzone][allocated 8 bytes][redzone]
Shadow:          [00 — all valid] [FE]      [00]                [FE]
                                   ↑ ASan이 표시 — 접근 시 trap
```

`malloc(8)`로 할당된 영역의 *양쪽에 redzone* (보통 16 byte). OOB access가 *redzone을 건드림* → 즉시 검출.

`free(p)` 후 *quarantine*. 일정 시간 *재할당되지 않음*. UAF가 *바로 새 객체에 덮어쓰지 않고* 검출 가능.

### 검출

```c
void Demo() {
    char *p = malloc(10);
    p[15] = 0;          // OOB write — 즉시 ASan trap
    free(p);
    *p = 1;             // UAF — 즉시 ASan trap
    free(p);            // double free — 즉시 ASan trap
}
```

### 출력

```
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x60200000eff5
WRITE of size 1 at 0x60200000eff5 thread T0
    #0 0x4c7d8e in Demo /src/main.c:5:9

0x60200000eff5 is located 5 bytes to the right of 10-byte region [0x60200000eff0,0x60200000effa)
allocated by thread T0 here:
    #0 0x4a8a8e in malloc
    #1 0x4c7d80 in Demo /src/main.c:4:14

SUMMARY: AddressSanitizer: heap-buffer-overflow /src/main.c:5:9 in Demo
```

*정확한 위치, 할당 위치, 콜 스택, 어떤 영역*을 모두 출력.

### 빌드

```bash
clang -fsanitize=address -fno-omit-frame-pointer -g -O1 source.c -o app
./app
```

### 검출 종류

```bash
# 기본
-fsanitize=address

# 변형
-fsanitize=address -fsanitize-address-use-after-scope    # use-after-scope
-fsanitize=address -fsanitize-address-globals-dead-stripping   # global redzone
-fsanitize=address -fsanitize-address-poison-custom-array-cookie  # custom new[]
```

### 옵션

```bash
ASAN_OPTIONS=detect_leaks=1:check_initialization_order=1:strict_init_order=1 ./app
```

`ASAN_OPTIONS` 환경 변수로 *런타임 조정*.

### 한계

- 메모리 2~3× → 임베디드에 부담.
- 성능 30~70% 저하 → 운영에 부적합.
- `placement new`, `mmap` 영역은 *기본 비대상*.

## HWASan — ARM64 hardware-accelerated

### 메커니즘

ARMv8.0+의 *Top Byte Ignore (TBI)* 활용. 64비트 포인터의 *상위 8비트*를 *태그*로 사용. 접근 시 *포인터 태그*와 *메모리 태그* 비교.

```
Pointer:   [tag: 8 bits][addr: 56 bits]
Memory:    [tag: 8 bits per 16-byte block]

Access:    pointer.tag == memory.tag → OK
           pointer.tag != memory.tag → trap
```

ASan의 *shadow memory 비용 없이* 같은 검출.

### 빌드

```bash
clang -fsanitize=hwaddress -mllvm --hwasan-globals=true source.c -o app
# ARM64 / RISC-V
```

x86_64에서는 *불가능* — ARM64 전용. Android 11+에서 *production 사용*.

### 효과

| | ASan | HWASan |
|---|------|--------|
| 메모리 | 2~3× | 1.1× |
| 성능 | 30~70% | 5~20% |
| 검출 | 동일 |  |

Android는 *system service*에 HWASan 적용. *production crash 검출* 가능.

## MemorySanitizer (MSan) — 미초기화 메모리

### 메커니즘

*Shadow bit* per byte. 0 = 초기화됨, 1 = 미초기화. 미초기화 byte를 *조건문에 쓰거나, 시스템 콜에 넘기면* trap.

### 검출

```c
void Foo() {
    int x;
    if (x > 0) {   // 위반 — 미초기화 x를 조건에
        DoSomething();
    }
}

void Bar() {
    struct Reply r;
    r.code = 200;
    // r.message 미초기화
    send(sock, &r, sizeof(r), 0);   // 시스템 콜에 미초기화 byte → trap
}
```

### 빌드

```bash
clang -fsanitize=memory -fno-omit-frame-pointer -g -O1 source.c -o app
# 단, *모든 라이브러리도 MSan으로 빌드*해야 — glibc는 비대상
clang -fsanitize=memory -stdlib=libc++ source.cpp
```

`MSAN_OPTIONS=print_stats=1:exit_code=42 ./app`

### 한계

- *모든 코드*가 MSan 빌드여야 — *외부 라이브러리* 어려움.
- 성능 100~300%.
- 임베디드 거의 *불가능*.
- 대안: 컴파일러 옵션 `-ftrivial-auto-var-init=zero` (모든 자동 변수 0 초기화 — 더 가벼움).

### 어디 쓰나

- 정보 누설 검출 (스택의 비밀이 전송되는지)
- 미초기화 변수 분기 (보안 영향)

## ThreadSanitizer (TSan) — Race detection

### 메커니즘

*Happens-before* 관계 추적. 각 메모리 접근에 *vector clock*. 두 thread가 *동기화 없이 같은 메모리 접근*하면 race.

```
Thread 1                Thread 2
─────────              ─────────
write(x = 5)
                       read(x)        ← race?
sync(lock release)
                       sync(lock acquire)
                       read(x)        ← OK — happens-after
```

### 검출

```c
int g_counter = 0;

void *Thread1(void *arg) {
    g_counter++;           // 위반 — Thread 2와 race
    return NULL;
}

void *Thread2(void *arg) {
    if (g_counter > 0) {   // 위반 — race
        DoWork();
    }
    return NULL;
}
```

### 빌드

```bash
clang -fsanitize=thread -fno-omit-frame-pointer -g -O1 source.c -o app
./app
```

### 출력

```
==12345== WARNING: ThreadSanitizer: data race (pid=12345)
  Read of size 4 at 0x7b04001e3eb0 by thread T1:
    #0 Thread2 /src/main.c:17 (app+0x...)

  Previous write of size 4 at 0x7b04001e3eb0 by thread T2:
    #0 Thread1 /src/main.c:12 (app+0x...)

  Location is global 'g_counter' of size 4 at 0x7b04001e3eb0 (app+0x000000XX)
```

*두 thread의 접근 위치와 콜 스택* 모두 표시.

### 한계

- 메모리 5~10×.
- 성능 5~15× — *매우 느림*.
- Production 불가.
- *실행되지 않은 race는 검출 안 함* (커버리지 의존).

### Fuzzing과 결합

TSan + Fuzzer로 *race를 자동으로 발견*.

```c
LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    pthread_t t1, t2;
    g_shared = 0;
    pthread_create(&t1, NULL, Thread1, NULL);
    pthread_create(&t2, NULL, Thread2, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}
```

각 *입력*이 *다른 race window*를 만들면 fuzzer + TSan이 검출.

## UndefinedBehaviorSanitizer (UBSan)

### 검출 종류

각 UB마다 *별도 sanitizer*:

```bash
# 종합
-fsanitize=undefined

# 개별
-fsanitize=alignment              # 정렬 위반
-fsanitize=bool                   # bool에 0/1 아닌 값
-fsanitize=bounds                 # 정적 배열 범위
-fsanitize=enum                   # enum 정의 외 값
-fsanitize=float-cast-overflow    # float → int 범위 초과
-fsanitize=float-divide-by-zero
-fsanitize=function               # function pointer 타입 불일치
-fsanitize=implicit-conversion    # 묵시 narrowing
-fsanitize=integer-divide-by-zero
-fsanitize=nonnull-attribute      # __attribute__((nonnull))
-fsanitize=null                   # NULL deref
-fsanitize=object-size            # `__builtin_object_size` 위반
-fsanitize=pointer-overflow       # 포인터 산술 overflow
-fsanitize=return                 # non-void 함수에서 return 누락
-fsanitize=returns-nonnull-attribute
-fsanitize=shift                  # shift count 비트 폭 초과
-fsanitize=signed-integer-overflow
-fsanitize=unreachable            # __builtin_unreachable 도달
-fsanitize=unsigned-integer-overflow  # well-defined wrap 검출
-fsanitize=vla-bound              # VLA 음수 크기
-fsanitize=vptr                   # virtual 함수 vtable 손상 (C++)
```

### 비용

```
대부분 검사 : < 10% 성능
모두 활성화 : ~30% 성능
메모리      : < 5%
```

UBSan은 *production에 켤 수도 있는* 거의 유일한 sanitizer.

### 빌드 — production 가능

```bash
# Release with minimal UBSan
clang -O2 -fsanitize=integer-divide-by-zero,null,shift,return,unreachable \
      -fsanitize-trap=undefined \      # 위반 시 abort (printf 없이 — 빠름)
      source.c -o app
```

`-fsanitize-trap=undefined`로 *crash 정보 출력 없이 즉시 abort*. 보안 critical 코드에서 권장.

### 자동차 적용

자동차 ECU에서 일부 UBSan 옵션은 *production에 켤 수 있다*.

```bash
# 자동차 펌웨어 — 안전 critical UB 검출
-fsanitize=integer-divide-by-zero
-fsanitize=null
-fsanitize=shift
-fsanitize=return
-fsanitize-trap=undefined          # abort 대신 emergency_halt() 호출 가능
```

## LeakSanitizer (LSan)

### 메커니즘

프로그램 종료 시 *garbage collection-like* 추적. *Reachable allocation*과 *unreachable allocation* 구분. Unreachable이면 leak.

### 빌드

```bash
clang -fsanitize=leak source.c -o app
# 또는 ASan에 통합 (기본)
clang -fsanitize=address -fsanitize=leak source.c
```

### 출력

```
==12345==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 100 byte(s) in 1 object(s) allocated from:
    #0 0x4a8a8e in malloc
    #1 0x4c7d80 in Foo /src/main.c:42:14

SUMMARY: AddressSanitizer: 100 byte(s) leaked in 1 allocation(s).
```

### 한계

- *Reachable한 leak*은 미검출. 예: `static` 변수가 *유지*하는 객체.
- *Long-running process*는 종료 시점이 없음 — leak 검출 어려움.
- Valgrind Memcheck가 *더 정확*하지만 *훨씬 느림*.

## CFI — Production safe

ASan/MSan/TSan은 *테스트 only*. CFI는 *production 권장*.

12장에서 본 CFI 옵션:
- `-fsanitize=cfi-icall` — 함수 포인터 무결성
- `-fsanitize=cfi-vcall` — virtual function 무결성 (C++)

비용 < 5%. *공격자가 임의 함수 호출 변조*를 차단. Production에 켜는 것이 표준.

## Shadow Call Stack — Production safe

ARM64/RISC-V. < 1% 비용. *Return address 무결성*. Android system service에 켜져 있다.

## Sanitizer 결합 — 양립성

```
ASan + UBSan      = OK (자주 함께)
ASan + LSan       = OK (ASan에 LSan 통합)
TSan + UBSan      = OK
ASan + TSan       = X (한 번에 하나)
MSan + (다른 sanitizer) = 어려움 (분리 빌드 권장)
```

### Build matrix — CI에서 다중 빌드

```yaml
# .gitlab-ci.yml
.sanitizer_build: &sanitizer_build
  stage: test
  script:
    - clang -fsanitize=$SAN -O1 -g source.c -o app_$SAN
    - ./app_$SAN < test_input

asan:
  <<: *sanitizer_build
  variables: { SAN: address }

ubsan:
  <<: *sanitizer_build
  variables: { SAN: undefined }

tsan:
  <<: *sanitizer_build
  variables: { SAN: thread }

msan:
  <<: *sanitizer_build
  variables: { SAN: memory }
```

같은 코드를 *4번 빌드*하고 *각 sanitizer로 테스트*.

## 임베디드 적용 — 가능성

| Sanitizer | 임베디드 가능 | 메모 |
|-----------|------------|------|
| ASan | △ | Memory 2~3× — 작은 MCU 어려움. Linux SBC OK. |
| HWASan | △ | ARM64 + Linux 환경 |
| MSan | X | Memory + Performance 둘 다 문제 |
| TSan | X | RTOS 환경에 거의 불가능 |
| UBSan | ✓ | Trap mode로 *production 가능* |
| LSan | △ | Long-running 시스템에서 의미 적음 |
| CFI | ✓ | *Production 권장* |
| SCS | ✓ | ARM64 production 권장 |

### Linux SBC (Cortex-A) — 추천

```bash
# 개발 / 테스트 빌드
clang -fsanitize=address,undefined -O1 -g

# Stress test (race)
clang -fsanitize=thread -O1 -g

# Production
clang -O2 \
    -fsanitize=integer-divide-by-zero,null,shift,return,unreachable \
    -fsanitize-trap=undefined \
    -fsanitize=cfi \
    -flto -fvisibility=hidden \
    -fsanitize=shadow-call-stack \      # ARM64
    -fPIE -pie \
    -Wl,-z,relro,-z,now
```

### MCU (Cortex-M) — 제한적

```bash
# 단위 테스트는 *host에서* sanitizer로
# Target firmware는 sanitizer 거의 불가능

# 컴파일 옵션만으로 일부 보호
arm-none-eabi-gcc \
    -fstack-protector-strong \
    -D_FORTIFY_SOURCE=2 \
    -ftrivial-auto-var-init=zero \
    -fsanitize=undefined -fsanitize-trap=undefined \    # 작은 overhead
    source.c
```

UBSan trap mode는 *binary 크기 증가는 있지만 성능 거의 없음*. MCU에도 적용 가능.

## CI/CD 정책 — Sanitizer matrix

```yaml
# 모든 PR
asan:    on  # 모든 PR
ubsan:   on  # 모든 PR
tsan:    on  # PR with concurrency keyword
msan:    on  # nightly only

# Release candidate
all_sanitizers: 24 시간 sanitizer + fuzz

# Production build
ubsan_trap: on
cfi:        on
scs:        on  (ARM64)
```

## 실전 — 검출 예 종합

### ASan — buffer overflow

```c
char buf[10];
gets(buf);      // ASan이 OOB write 즉시 검출 (gets 자체로는 컴파일 경고)
```

### MSan — 정보 누설

```c
struct Packet p;
p.length = 100;
// p.data 미초기화
send(sock, &p, sizeof(p), 0);    // MSan이 미초기화 데이터 send 검출
```

### TSan — race

```c
int g_state;
// Thread 1: g_state = 1;
// Thread 2: if (g_state == 1) ...
// TSan: data race detected
```

### UBSan — overflow

```c
int x = INT_MAX;
int y = x + 1;       // UBSan: signed integer overflow
```

## 도구 매트릭스 종합

| 단계 | 도구 |
|------|------|
| 코딩 | Coding standard (MISRA/CERT), IDE warning |
| 커밋 | clang-tidy, static analysis (QAC) |
| PR | ASan + UBSan unit test |
| Nightly | + MSan + TSan |
| Release | + Fuzzing 24시간 |
| Production | CFI + SCS + UBSan trap |
| Monitoring | Crashdump 자동 수집 + 분석 |

다층 방어가 *현대 보안의 표준*.

## 정리

- ASan은 *메모리 안전*. 가장 광범위 검출. 메모리·성능 비용으로 *테스트 only*.
- HWASan은 *ARM64 production* 가능. Android 적용.
- MSan은 *미초기화 검출*. 강력하지만 *모든 코드 빌드 필요*.
- TSan은 *race* 전용. 매우 느림.
- UBSan은 *production 가능*. trap mode가 임베디드에도 적합.
- LSan은 *leak*. 짧은 프로그램에 효과적.
- CFI + SCS는 *production 표준*. 비용 < 5%.
- CI에서 *sanitizer matrix*로 다층 검출.

## 다음 장 예고

15장은 *Symbolic execution and Abstract interpretation* — KLEE, angr, Polyspace Code Prover.

## 관련 항목

- [Ch 12 — Hardening Options](/blog/embedded/automotive/cert-c/chapter12-hardening-options)
- [Ch 13 — Fuzzing Pipeline](/blog/embedded/automotive/cert-c/chapter13-fuzzing-pipeline)
- [LLVM Sanitizers](https://github.com/google/sanitizers)
- [HWASan Documentation](https://clang.llvm.org/docs/HardwareAssistedAddressSanitizerDesign.html)
