---
title: "Ch 12: 보안 hardening 컴파일러 옵션 — Stack Canary부터 CFI까지"
date: 2025-09-10T13:00:00
description: "_FORTIFY_SOURCE, -fstack-protector, -fPIE, RELRO, BIND_NOW, -fsanitize=cfi, ShadowCallStack, AddressMasking — 보안 빌드 옵션 종합."
tags: [cert-c, hardening, security, canary, aslr, pie, relro, cfi, scs]
series: "CERT C"
seriesOrder: 12
draft: false
---

CERT 규칙 *준수*가 *첫 단계*라면, 컴파일러 *hardening 옵션*은 *두 번째 방어선*이다. 코드 자체에 버그가 있어도 *exploit를 차단하는 런타임 보호*를 컴파일러가 자동 삽입한다. 이 장은 *현대 보안 빌드의 모든 옵션*을 종합한다.

## 보안 빌드 옵션 — 종합 표

| 보호 | 옵션 | 차단하는 공격 | 비용 |
|------|------|--------------|------|
| Stack Canary | `-fstack-protector-strong` | Stack overflow → return address overwrite | < 5% |
| FORTIFY_SOURCE | `-D_FORTIFY_SOURCE=2` (또는 3) | 컴파일 시 detectable buffer overflow | 0% |
| PIE/PIC | `-fPIE -pie` | ASLR로 ROP gadget 무작위화 | 1~3% |
| Full RELRO | `-Wl,-z,relro,-z,now` | GOT/PLT 덮어쓰기 | 부팅 시간 ↑ |
| BIND_NOW | `-Wl,-z,now` | Lazy resolution 공격 | 부팅 시간 ↑ |
| Stack Clash | `-fstack-clash-protection` | 큰 stack alloc으로 heap 충돌 | < 1% |
| CFI (Indirect Call) | `-fsanitize=cfi-icall` | function pointer hijack | < 5% |
| CFI (vcall) | `-fsanitize=cfi-vcall` (C++) | vtable 덮어쓰기 | < 5% |
| ShadowCallStack | `-fsanitize=shadow-call-stack` (ARM64) | Return address 무결성 | < 1% |
| MTE | `-march=armv8.5-a+memtag` (ARMv8.5+) | UAF, OOB | 하드웨어 의존 |
| BTI | `-mbranch-protection=bti` (ARM) | Speculation 공격 일부 | < 1% |
| Pointer Authentication | `-mbranch-protection=pac-ret` | Return address 무결성 | < 1% |
| Auto-init Variables | `-ftrivial-auto-var-init=zero` | Uninitialized read 정보 누설 | < 2% |

각 옵션을 깊이 본다.

## Stack Canary — `-fstack-protector-strong`

### 메커니즘

함수 진입 시 *스택에 무작위 값(canary)을 박고*, 반환 시 *값이 변하지 않았는지 검증*한다. Buffer overflow가 *return address를 덮으면* 그 사이의 canary도 덮어 검출.

### 생성 코드

```c
void Vulnerable(const char *input) {
    char buf[100];
    strcpy(buf, input);
    /* ... */
}
```

`-fstack-protector-strong` 적용 시 GCC 출력 (x86_64):

```asm
Vulnerable:
    push    %rbp
    mov     %rsp, %rbp
    sub     $0x80, %rsp                  ; 스택 100바이트 + canary 공간
    mov     %fs:0x28, %rax               ; ← canary 읽기 (TLS)
    mov     %rax, -0x8(%rbp)             ; ← stack에 canary 저장
    xor     %eax, %eax

    ; ... strcpy 등 작업 ...

    mov     -0x8(%rbp), %rdx             ; canary 읽기
    sub     %fs:0x28, %rdx               ; 원본과 비교
    jne     stack_chk_fail               ; 다르면 __stack_chk_fail 호출 (abort)
    leave
    ret

stack_chk_fail:
    call    __stack_chk_fail@PLT         ; 검증 실패 — process abort
```

### 옵션 변형

```bash
# 비활성 (위험)
-fno-stack-protector

# 기본 — buffer가 있는 함수만
-fstack-protector

# 권장 — 더 많은 함수 (heuristic 기반)
-fstack-protector-strong

# 모든 함수 — 가장 보수적
-fstack-protector-all

# 명시적 활성화
-fstack-protector-explicit  // __attribute__((stack_protect))
```

### 차단하는 공격

```c
// Classic stack overflow
void Vulnerable(const char *input) {
    char buf[16];
    strcpy(buf, input);        // 16+ bytes → return address overwrite
}
```

공격자가 `buf`를 *return address*까지 채워 *임의 코드 실행* 시도. Canary가 *그 사이에 있어* 덮이면 abort.

### 한계

- **공격자가 canary 값을 *알아내면* 우회 가능**. fork() 후 canary가 보존되는 경우(child 프로세스), brute force로 byte 하나씩.
- **buffer overflow가 *return address가 아닌 다른 데이터* 덮어쓰는 경우 검출 안 됨** (예: function pointer in struct).
- **Heap overflow는 차단 못함** — canary는 stack only.

## `_FORTIFY_SOURCE` — 컴파일 시 buffer overflow 검출

### 메커니즘

glibc의 *문자열·메모리 함수*를 *길이 검증 wrapper*로 대체. `strcpy(dst, src)` → 컴파일러가 *dst의 크기를 안다면* `__strcpy_chk(dst, src, sizeof(dst))` 생성.

### 옵션 단계

```bash
-D_FORTIFY_SOURCE=0    # 비활성
-D_FORTIFY_SOURCE=1    # 기본 — 컴파일 가능한 case만
-D_FORTIFY_SOURCE=2    # 더 적극적 — 일부 비-결정적 case도
-D_FORTIFY_SOURCE=3    # glibc 2.34+ — 런타임에 dst 크기 추정 시도 (object_size())
```

### 컴파일 결과

```c
void Foo(const char *src) {
    char buf[10];
    strcpy(buf, src);            // ← 보호
    strncpy(buf, src, 20);       // ← 보호 (20 > sizeof(buf) 검출)
}
```

생성된 함수 호출:

```c
__strcpy_chk(buf, src, 10);      // 10 = sizeof(buf), 컴파일러가 안다
__strncpy_chk(buf, src, 20, 10); // 20 > 10 → abort
```

런타임에 `__strcpy_chk`이 *복사 길이 > dst size*면 `__chk_fail()` 호출 → abort.

### 차단 예

```c
char buf[10];
strncpy(buf, very_long_input, 20);    // strncpy로 20 byte 복사 시도
                                       // → __strncpy_chk이 abort
```

### 컴파일러 지원

- **GCC** 4.0+: `_FORTIFY_SOURCE=1, 2`
- **GCC 12+**: `_FORTIFY_SOURCE=3` (object_size builtin)
- **Clang** 9.0+: 부분 지원, 3은 18+

### 한계

- *컴파일러가 dst 크기를 알 때만* 동작. `char *p = malloc(n); strcpy(p, src);`에서 `p`의 크기는 모름.
- 새 `_FORTIFY_SOURCE=3`은 *런타임 추정*으로 일부 동적 case도.

## PIE/PIC + ASLR — `-fPIE -pie`

### 메커니즘

**Position-Independent Executable**. 실행 파일이 *어느 주소에 로드돼도 동작*. 커널이 *부팅 시마다 무작위 base address*로 로드해 *공격자의 주소 예측을 차단*(ASLR — Address Space Layout Randomization).

### 빌드 옵션

```bash
gcc -fPIE -pie source.c -o app
# 또는
gcc -fPIC -shared source.c -o libfoo.so
```

### 효과

```
# 부팅 1
./app
[프로세스 메모리]
  0x55b8a3001000  main()        ← 무작위 base
  0x55b8a3001100  Foo()
  0x7fc8d2a3f000  libc          ← 무작위
  0x7ffe9a401000  stack         ← 무작위

# 부팅 2 (같은 바이너리)
./app
  0x562931400000  main()        ← 다른 무작위 base
  ...
```

ROP(Return-Oriented Programming) 공격은 *가젯 주소*를 알아야 한다. ASLR이 *주소를 매번 바꾸어* 공격을 어렵게 한다.

### 한계

- **Info-leak 공격**으로 *한 주소 누설* 시 *전체 layout 추정* 가능 (relative offset 알면).
- *32비트 시스템*은 entropy 부족 (보통 8 비트 무작위) → brute force 가능.
- 64비트는 *충분히 큰 entropy* (28 비트 이상).

## RELRO — `-Wl,-z,relro,-z,now`

### 메커니즘

**RELocation Read-Only**. ELF의 *GOT(Global Offset Table)*과 *PLT(Procedure Linkage Table)*는 동적 라이브러리 함수 호출 주소를 담는다. 공격자가 이를 덮어쓰면 *임의 함수 호출*. RELRO가 이를 *read-only*로 만든다.

### 두 단계

```bash
# Partial RELRO (기본)
gcc -Wl,-z,relro

# Full RELRO (권장)
gcc -Wl,-z,relro,-z,now
```

**Partial**: GOT 일부만 read-only. PLT를 통한 lazy resolution용 GOT entry는 *여전히 writable*.

**Full (BIND_NOW)**: *부팅 시 모든 라이브러리 resolution*. GOT 전체 *read-only*. 더 안전하지만 *부팅 시간 증가*.

### 효과 검증

```bash
$ readelf -l app | grep GNU_RELRO
GNU_RELRO  0x000000000002de40 0x000000000060de40 ...

$ checksec --file=app
RELRO           : Full RELRO
Stack Canary    : Yes
NX enabled      : Yes
PIE             : PIE enabled
```

### 한계

- *모든 함수 주소*가 *부팅 시* 결정. *런타임 패치* 불가 (정상적인 사용에서는 문제 X).
- *RTLD_LAZY dlopen* 등 일부 동적 동작 비호환.

## Stack Clash Protection — `-fstack-clash-protection`

### 메커니즘

큰 stack 할당(`alloca`, VLA, 큰 자동 배열)이 *guard page를 건너뛰어 heap이나 다른 메모리에 충돌*하는 공격 차단. 컴파일러가 *큰 alloc을 page 단위 probe*로 분할.

### 차단하는 공격

```c
void Vulnerable(size_t n) {
    char buf[n];     // VLA — n이 매우 크면 stack overflow + heap 침범 가능
    /* ... */
}
```

`buf` 할당이 *4KB 페이지 단위로 probe*되어 *guard page를 반드시 건드림* → segfault.

### CVE 예

- **CVE-2010-3848** (Wireshark): VLA로 stack 폭주 → ROP.
- **Stack Clash family** (2017): glibc, sudo, dnsmasq 등.

## Control-Flow Integrity (CFI) — `-fsanitize=cfi`

### 메커니즘

*Indirect call*(함수 포인터, virtual call)이 *원래 의도된 함수만* 호출하도록 *컴파일 시 type signature 검증* 코드 삽입.

### 종류

| Sub-flag | 검사 |
|----------|------|
| `cfi-icall` | C function pointer 호출 |
| `cfi-vcall` (C++) | virtual function 호출 |
| `cfi-nvcall` (C++) | non-virtual member call |
| `cfi-cast-strict` | cast 정확성 |
| `cfi-derived-cast` | derived class cast |
| `cfi-unrelated-cast` | unrelated cast 차단 |
| `cfi-mfcall` | member function pointer call |

### 빌드 (Clang)

```bash
clang -fsanitize=cfi -flto -fvisibility=hidden source.c -o app
# LTO + visibility 필수
```

GCC는 *없음* — Clang/LLVM 전용.

### 생성 코드

```c
typedef int (*func_t)(int);

void Foo(func_t fn, int x) {
    fn(x);     // indirect call
}
```

CFI 적용 시:

```asm
Foo:
    ; fn 시그니처 검증
    mov     -0x8(%rsp), %rax           ; fn 로드
    mov     $type_signature_hash, %rcx  ; 예상 시그니처
    cmp     -0x8(%rax), %rcx           ; 함수 메타데이터와 비교
    jne     __cfi_check_fail            ; 다르면 abort

    ; 정상 호출
    mov     %edi, %eax
    call    *%rax
    ret
```

### 차단하는 공격

```c
typedef int (*func_t)(int);
func_t g_handlers[10];

void Vulnerable(const char *data, size_t len) {
    char buf[16];
    memcpy(buf, data, len);            // OOB write — g_handlers를 덮음
    g_handlers[0](5);                  // 공격자 통제 주소 호출
}
```

CFI 적용 시 *원본 시그니처와 다른 주소*가 호출되면 abort.

### 한계

- *LTO 필요* — 모든 컴파일 단위가 같은 LTO로.
- *Forward-edge CFI*만 — return address는 ShadowCallStack 필요.
- *Type confusion* 같은 *시그니처 일치* 공격은 차단 못함.

## ShadowCallStack — `-fsanitize=shadow-call-stack`

### 메커니즘

ARM64 / RISC-V에서 *별도 stack에 return address 저장*. 일반 stack의 return address가 덮여도 *shadow stack과 비교*해 검출.

### 빌드

```bash
clang -fsanitize=shadow-call-stack source.c -o app
# ARM64 또는 RISC-V만
```

생성 코드:

```asm
Foo:
    ; 함수 진입
    str     lr, [shadow_sp], #8      ; lr을 shadow stack에 push
    ; ... 작업 ...

    ; 함수 종료
    ldr     lr, [shadow_sp, #-8]!    ; shadow stack에서 lr 복원
    ret                               ; 검증된 lr 사용
```

### 차단

Buffer overflow가 *일반 stack의 return address*를 덮어도 *shadow stack의 원본*이 사용되어 정상 반환.

### 한계

- ARM64, RISC-V만.
- 모든 함수에 *shadow stack 접근 명령어* 추가 → < 1% overhead.

## ARM Memory Tagging Extension (MTE)

### 메커니즘

ARMv8.5+의 *하드웨어 기능*. 모든 메모리 객체에 *4비트 태그* 부착. 포인터에도 같은 태그. *접근 시 태그 불일치*면 *trap*. UAF, OOB 모두 차단.

### 빌드

```bash
clang -march=armv8.5-a+memtag -fsanitize=memtag source.c
# Cortex-X3, Cortex-A715, A720 등 지원 CPU 필요
```

### 효과

```c
char *p = malloc(100);
free(p);
*p = 5;    // UAF — MTE가 즉시 trap. p의 태그 != 메모리 태그
```

```c
char buf[10];
buf[15] = 0;    // OOB — buf+15의 태그가 buf의 태그와 다름 → trap
```

### 한계

- 하드웨어 의존 — 2023+ ARM CPU만.
- 4비트 태그 → 1/16 false negative (다른 객체가 우연히 같은 태그).
- 성능 overhead 보고 < 5%.

Pixel 8 등에서 *production 사용*. Android 14+는 MTE 활용.

## Pointer Authentication Code (PAC)

### 메커니즘

ARMv8.3+. *Return address나 function pointer*에 *암호학적 서명*. 위조 불가능.

### 빌드

```bash
clang -mbranch-protection=pac-ret source.c
# 또는
clang -mbranch-protection=standard    # pac-ret + bti
```

### 효과

```asm
Foo:
    paciasp                  ; lr에 PAC 추가
    str     lr, [sp, #-16]!  ; stack에 lr 저장

    ; ... 작업 ...

    ldr     lr, [sp], #16    ; lr 복원
    retaa                     ; PAC 검증 후 return
                              ; 위조됐으면 fault
```

iOS, macOS Apple Silicon에서 *광범위 사용*. Linux ARM64는 5.7+.

## 추가 강력 옵션

### `-ftrivial-auto-var-init=zero`

자동 변수 초기화. CERT EXP33의 자동 해소.

```bash
clang -ftrivial-auto-var-init=zero source.c
# 또는 pattern (디버그용)
clang -ftrivial-auto-var-init=pattern source.c
```

GCC 12+ 일부 지원.

### `-fzero-call-used-regs=used`

함수 반환 전 *사용한 모든 레지스터*를 0으로. ROP gadget 사용 어려움 + Spectre 일부 차단.

### `-fstack-protector-strong-arg-trampoline`

함수 인자에도 stack canary 같은 보호.

## 종합 빌드 — Hardened C 프로젝트

GCC:

```makefile
CFLAGS = \
    -O2 \
    -g \
    -fPIE \
    -fstack-protector-strong \
    -fstack-clash-protection \
    -D_FORTIFY_SOURCE=3 \
    -fcf-protection=full \
    -ftrivial-auto-var-init=zero \
    -fzero-call-used-regs=used \
    -Wall -Wextra -Werror

LDFLAGS = \
    -pie \
    -Wl,-z,relro \
    -Wl,-z,now \
    -Wl,-z,noexecstack \
    -Wl,-z,separate-code
```

Clang (with CFI + SCS):

```makefile
CFLAGS = \
    -O2 -g \
    -fPIE \
    -fstack-protector-strong \
    -fstack-clash-protection \
    -D_FORTIFY_SOURCE=3 \
    -fsanitize=cfi \
    -fsanitize=shadow-call-stack \
    -flto \
    -fvisibility=hidden \
    -ftrivial-auto-var-init=zero \
    -Wall -Wextra -Werror

LDFLAGS = \
    -pie \
    -Wl,-z,relro,-z,now,-z,noexecstack \
    -flto
```

ARM64 (Android-style):

```makefile
CFLAGS += \
    -mbranch-protection=standard \
    -march=armv8.5-a+memtag \
    -fsanitize=memtag \
    -fsanitize=shadow-call-stack
```

## checksec — 빌드 결과 검증

```bash
$ checksec --file=app

RELRO           STACK CANARY      NX            PIE             RPATH      ...
Full RELRO      Canary found      NX enabled    PIE enabled     No RPATH   ...
```

모든 항목이 *enabled*면 강력한 hardening.

```bash
$ checksec --kernel
# Linux kernel hardening 확인
```

## CVE — Hardening이 차단한 사례

- **OpenSSL CVE-2017-3735** (X.509 OOB read): _FORTIFY_SOURCE=2가 *컴파일 시 검출*.
- **Various heap overflows**: ASan + MTE가 *런타임 즉시 검출*.
- **Linux ROP exploits (2017-2020)**: PIE + ASLR이 *기본 가젯 주소 무력화*.

## Trade-off — 성능 vs 보안

| 옵션 | 보안 가치 | 성능 비용 |
|------|---------|---------|
| `-D_FORTIFY_SOURCE=2/3` | 매우 높음 | ~0% |
| `-fstack-protector-strong` | 높음 | < 5% |
| `-fPIE -pie` | 높음 | 1-3% |
| `-Wl,-z,relro,-z,now` | 매우 높음 | 부팅 시간만 |
| `-fcf-protection=full` | 중간 | < 1% |
| `-fsanitize=cfi` | 매우 높음 | < 5% |
| `-fsanitize=shadow-call-stack` | 매우 높음 | < 1% |
| `-ftrivial-auto-var-init=zero` | 중간 | < 2% |
| MTE | 매우 높음 | < 5% (HW 의존) |

거의 모든 옵션이 *성능 비용 미미*. *임베디드라도 활성화 권장*.

## 임베디드 — 옵션 선택

| 시스템 | 권장 옵션 |
|--------|----------|
| MCU 펌웨어 (Cortex-M) | stack-protector, FORTIFY_SOURCE, auto-init-zero, BTI |
| Linux SBC (Cortex-A) | 위 + PIE, RELRO, BIND_NOW, CFI, SCS (ARM64) |
| 자율주행 SoC | 모두 + MTE (지원 시) + PAC |
| Real-time RTOS | FORTIFY_SOURCE, stack-protector (Heap 없으면 일부 부적용) |

## 정리

- 컴파일러 hardening은 *CERT 규칙 준수 위의 두 번째 방어선*.
- 핵심: `_FORTIFY_SOURCE`, stack-protector, PIE, RELRO, CFI, SCS.
- 추가: MTE, PAC, auto-var-init, zero-call-used-regs.
- 거의 모든 옵션이 *성능 비용 미미*.
- *임베디드라도 활성화 가능한 옵션 모두 적용* 권장.
- `checksec`로 빌드 결과 검증. 모든 항목 enabled가 목표.

## 다음 장 예고

13장은 fuzzing 자동화 — libFuzzer, AFL++, OSS-Fuzz로 24/7 취약점 발견.

## 관련 항목

- [Ch 7 — Arrays & Strings](/blog/embedded/automotive/cert-c/chapter07-arrays-strings)
- [Ch 11 — Integer CVE Deep Dive](/blog/embedded/automotive/cert-c/chapter11-integer-cve-deep-dive)
- [GCC Security Features](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [Clang CFI](https://clang.llvm.org/docs/ControlFlowIntegrity.html)
- [Linux Kernel Hardening](https://www.kernel.org/doc/html/latest/security/self-protection.html)
