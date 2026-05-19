---
title: "Ch 13: TCG 심화"
date: 2026-05-17T13:00:00
description: "Tiny Code Generator — block translation·IR·backend."
tags: [QEMU, tcg, dynamic-translation, code-cache, mttcg]
series: "QEMU Internals"
seriesOrder: 13
draft: true
---

**TCG**(Tiny Code Generator)는 QEMU의 *상징적인* 기능입니다. *어떤 host*에서도 *어떤 guest*를 실행 가능하게 만드는 *동적 번역기*. KVM이 *같은 architecture*에서만 동작하는 반면 TCG는 *cross-architecture*를 가능하게 합니다.

## TCG의 흐름

```text
Guest binary (ARM64 instructions)
        │
        ▼
1. Decode  →  guest opcode parser
        │
        ▼
2. Lift    →  TCG IR (Intermediate Representation)
        │
        ▼
3. Optimize  →  IR-level dead code elim, const fold
        │
        ▼
4. Backend  →  Host machine code (x86_64)
        │
        ▼
5. Cache    →  Translation Block (TB)
        │
        ▼
6. Execute  →  native 실행
```

매 guest instruction을 *그때그때 번역*하는 게 아니라 *block 단위*로 *한 번 번역해 cache*. *다음 실행*은 cache hit으로 빠름.

## Translation Block (TB)

guest의 *basic block*에 해당. branch까지의 *순차 명령 묶음*.

```text
TB (x86 host code) — guest ARM64 instructions 1~5 번역 결과:
  mov %rax, %rbx     ; guest x0 → host rax → x1
  add $0x10, %rax    ; addi x0, x0, 0x10
  cmp $0x0, %rax     ; cmp x0, 0
  je  branch_target  ; beq label
```

이 native code를 *한 번 실행*하면 guest의 5 instruction이 *그대로 실행*된 효과.

## TCG IR

source(guest)와 target(host) 사이의 *중간 언어*. 예 — ARM64 `ADD x0, x1, x2`:

```text
ld_i64   tmp0, env, $0xa00     # x1 from guest CPU state
ld_i64   tmp1, env, $0xa08     # x2
add_i64  tmp2, tmp0, tmp1
st_i64   tmp2, env, $0xa00     # → x0
```

`env`가 *guest CPU state pointer*. guest register들이 host의 memory(struct)에 보존.

## TCG 명령 종류

| 카테고리 | 예 |
|---------|-----|
| Arithmetic | `add_i64`·`sub_i32`·`mul_i64` |
| Logical | `and_i32`·`or_i64`·`xor_i32` |
| Comparison | `setcond_i32`·`brcond_i64` |
| Load/Store | `ld_i32`·`st_i64`·`qemu_ld_i64` |
| Control | `br`·`call`·`exit_tb` |
| TLB | `qemu_ld`·`qemu_st` (guest MMU 시뮬레이션) |

`qemu_ld/qemu_st`이 *특별* — guest의 *MMU translation*을 *softmmu*로 수행한 후 host memory에 접근.

## Backend — host code 생성

각 host architecture별 backend.

| Host | Backend |
|------|---------|
| x86_64 | `tcg/i386/tcg-target.c.inc` |
| aarch64 | `tcg/aarch64/tcg-target.c.inc` |
| riscv64 | `tcg/riscv/tcg-target.c.inc` |
| ppc | `tcg/ppc/tcg-target.c.inc` |
| s390x | `tcg/s390x/tcg-target.c.inc` |

each backend가 *TCG IR → host instruction* 매핑.

## Code cache

번역 결과를 *대형 buffer*에 보관.

```c
TCGContext {
    void *code_buf;       /* code cache 시작 */
    size_t code_buf_size; /* 보통 256MB+ */
    /* ... */
};
```

각 TB가 cache 안의 *고유 영역*. cache 가득 차면 *전체 flush + rebuild*.

## Indirect branch와 TB chaining

guest의 *간접 분기*(register-indirect call)는 *branch target*을 알 수 없음. 처음에는 *helper call*로 분기 → next TB lookup → 점프. 자주 가는 분기는 *static link*로 변환되어 가속(TB chaining).

```text
처음에는:
  call helper_lookup_tb     ; runtime에 다음 TB 찾기

같은 path가 자주 가면 (chaining 후):
  jmp TB_B   ; 직접 점프
```

수십 % 성능 향상.

## softmmu — guest MMU 시뮬레이션

guest의 *page table*을 host에서 *시뮬레이션*.

```text
qemu_ld virtual_addr
        │
        ▼
TLB lookup (host hash table)
        │
        ▼
  hit?
   ├── yes → host physical addr → load
   └── no  → call helper_ld → guest TLB miss handler
```

TLB가 *host hash table*. CPU별 32K entry 정도.

## Memory consistency

guest의 memory model(weak vs strong)을 host에 매핑.

- ARM weak → x86 strong: 추가 fence 거의 없음
- x86 strong → ARM weak: 추가 *dmb* 필요
- 둘 다 weak: 일부 fence

TCG가 *적절한 fence*를 emit해 *host에서 guest가 본 ordering* 유지.

## MTTCG — Multi-Thread TCG

QEMU 2.9부터 *multi-thread*. 각 vCPU thread가 *자기 코드*를 별도 thread에서 번역+실행.

```bash
qemu-system-aarch64 -accel tcg,thread=multi ...
```

multi-core guest의 성능 *상당히* 향상. *cache coherence·atomic operation*에 추가 복잡성.

## TCG plugin

TCG translation에 *hook*. Ch 10의 QEMU RISC-V tracing에서 사용한 `libexeclog.so` 같은 것.

```c
void qemu_plugin_register_vcpu_tb_trans_cb(...);
void qemu_plugin_register_vcpu_insn_exec_cb(...);
```

각 instruction execution마다 callback. coverage·tracing·custom analysis에 활용.

## TCG 성능

| 측정 | 값 |
|------|------|
| Translation cost | 수십 µs/TB |
| Cached execution | host의 ~10× |
| Cross-arch (worst) | 50~100× host |
| Same-arch TCG | 5~10× native |
| MTTCG with 4 cores | linear scaling, ~3× |

대부분은 KVM이 더 빠르지만 TCG의 *cross-arch 능력*은 KVM에 없는 강점.

## helper functions

TCG IR이 직접 표현 못 하는 *복잡한 동작*(부동소수·crypto instructions)은 *C 함수 호출*로 분기.

```c
DEF_HELPER_2(addsubpsq, void, env, i32);

void helper_addsubpsq(CPUARMState *env, uint32_t arg) {
    /* C로 emulate */
}
```

`DEF_HELPER_*` 매크로로 *signature 등록*. TCG IR에서 `gen_helper_addsubpsq(...)`로 호출.

## 디버깅 — `-d`

```bash
qemu-system-aarch64 -d in_asm,out_asm,op -D trace.log ...
```

| flag | 의미 |
|------|------|
| `in_asm` | guest assembly |
| `out_asm` | host assembly (TCG output) |
| `op` | TCG IR |
| `op_opt` | optimization 후 IR |

QEMU 자체 개발 시 또는 *왜 느린지* 분석.

## 흔한 함정

- **TCG code cache 부족** — large workload에서 flush 빈번. `-tb-size N` 키우기.
- **TLB miss 빈번** — guest의 *random memory access*가 host TLB miss로. workload 의존.
- **helper 과다** — fp instruction 등 helper 호출 빈번하면 *cache eviction*. 가능하면 native instruction.
- **single-thread TCG bottleneck** — `thread=multi`로.

## 정리

- **TCG**는 dynamic translator. guest 명령을 *host 명령으로* 번역 + cache + 실행.
- **TB**(Translation Block)가 단위. 한 번 번역, 여러 번 실행.
- **TCG IR**이 source/target 사이 추상. 100여 opcode.
- 각 host architecture별 *backend*가 IR → 명령 변환.
- **softmmu**가 guest MMU 시뮬레이션 — host hash TLB.
- **MTTCG**로 multi-thread guest 성능 ↑.
- 성능: native의 ~10×, cross-arch는 50~100×.
- 디버깅: `-d in_asm/out_asm/op`로 *각 단계 dump*.

## 다음 장 예고

다음 장은 *TCG의 반대편* — **KVM accelerator**. host와 guest가 *같은 architecture*일 때의 native 실행.

## 관련 항목

- [Ch 12: QEMU 기여하기](/blog/tools/emulation/qemu-internals/chapter12-contributing)
- [Ch 14: KVM Accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [QEMU RISC-V — Tracing](/blog/tools/emulation/qemu-riscv/chapter10-tracing) — TCG plugin 사용
