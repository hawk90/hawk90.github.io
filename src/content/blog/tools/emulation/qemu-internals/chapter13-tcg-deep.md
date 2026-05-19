---
title: "Ch 13: TCG 심화"
date: 2026-05-17T13:00:00
description: "Tiny Code Generator — block translation·IR·backend."
tags: [QEMU, tcg, dynamic-translation, code-cache]
series: "QEMU Internals"
seriesOrder: 13
draft: true
---

## 이 챕터의 의도

KVM은 host와 guest의 아키텍처가 같을 때만 동작한다. cross-arch(host x86에 guest ARM)나 deterministic 실행이 필요할 때 QEMU의 TCG(Tiny Code Generator)가 핵심이 된다. TCG는 guest 명령어를 block 단위로 동적 translate해 host native code로 실행한다. 이 장에서는 TCG의 frontend/IR/backend 구조와 MTTCG(multi-threaded TCG)를 차례로 본다.

## 핵심 항목

- ✦ **TCG = Dynamic Binary Translator** — guest ISA → IR → host machine code, JIT
- ✦ **Translation Block (TB)** — guest basic block 단위, branch까지 translate
- ✦ TB lookup table — guest PC → translated host code 캐시
- ✦ **Frontend disassembler** — `target/arm/translate.c`, `target/i386/translate.c` 등 per-guest-arch
- ✦ Guest ISA → TCG IR — 한 guest 명령이 1-수십 IR op
- ✦ **TCG IR** — RISC-like, ~150 ops (load/store/branch/alu/mul/div/shr/shl/extract...)
- ✦ TCG variables — `TCGv_i32`, `TCGv_i64`, temp/local/global
- ✦ TCG labels — branch target, `tcg_gen_brcond_i64`
- ✦ **Backend code generator** — `tcg/i386/tcg-target.c.inc` (host x86), `tcg/aarch64/`, `tcg/riscv/`
- ✦ IR → host machine code emit, register allocation
- ✦ **Code cache** — translated TB 보관, default 32MB
- ✦ Cache flush/invalidate — guest memory write 시 TB invalidate (`tb_flush`, `tb_invalidate_phys_range`)
- ✦ **Helper function** — emit하기 복잡한 명령 (e.g., FPU, MMU)을 C 함수로 fallback
- ✦ MMU helper — `helper_ret_ldub_mmu`, slow path on TLB miss
- ✦ **MTTCG (Multi-Threaded TCG)** — guest vCPU당 host thread, 병렬 emulation
- ✦ TB linking — direct jump으로 TB 간 fast path
- ◦ Plugin API (QEMU TCG plugin) — instrumentation
- ◦ AOT cache (실험적) — TB persist

## 다이어그램 (4)

1. TCG full pipeline — guest insn → frontend (per-arch) → IR → backend (per-host) → cache → execute
2. TB lookup + linking 흐름
3. MTTCG — N vCPU 각각 host thread, code cache 공유
4. Helper fallback 경로 (complex insn → C function)

## 코드 sketch

```c
/* Frontend 예: ARM ADD R0, R1, R2 translate */
static void disas_arm_add(DisasContext *s, uint32_t insn) {
    TCGv_i32 t0 = tcg_temp_new_i32();
    tcg_gen_add_i32(t0, cpu_R[1], cpu_R[2]);   /* IR emit */
    tcg_gen_mov_i32(cpu_R[0], t0);
    tcg_temp_free_i32(t0);
}

/* Backend 예: i386 host에서 IR add → host instruction */
static void tcg_out_add(TCGContext *s, TCGReg dst, TCGReg src1, TCGReg src2) {
    tcg_out_modrm(s, OPC_ARITH_GvEv | 0x00, dst, src2);  /* x86 ADD r/m32, r32 */
}

/* TB cache lookup */
static TranslationBlock *tb_lookup(CPUState *cpu, target_ulong pc) {
    uint32_t h = tb_jmp_cache_hash(pc);
    TranslationBlock *tb = qatomic_read(&cpu->tb_jmp_cache[h]);
    if (likely(tb && tb->pc == pc)) return tb;   /* fast path */
    return tb_htable_lookup(cpu, pc);             /* slow path */
}
```

```bash
# TCG vs KVM 비교
qemu-system-x86_64 -accel tcg -smp 4 ...   # TCG (느림, deterministic)
qemu-system-x86_64 -accel kvm -smp 4 ...   # KVM (빠름, host=x86 필요)
qemu-system-aarch64 -accel tcg -smp 4 ...  # ARM guest on x86 host (TCG만 가능)

# MTTCG 활성
qemu-system-aarch64 -accel tcg,thread=multi -smp 8

# TCG 통계
(qemu) info jit
```

## 레퍼런스

- QEMU `Documentation/devel/tcg.rst`, `Documentation/devel/tcg-ops.rst`
- QEMU `tcg/README` — 핵심 API
- QEMU `accel/tcg/` — translation core
- "Translating Guest Code: TCG" — QEMU dev wiki
- "MTTCG: Asynchronous multi-threaded execution in QEMU" — KVM Forum
- Bellard, F. "QEMU, a Fast and Portable Dynamic Translator" (USENIX ATC 2005)

## 관련 항목

- [Ch 1: QEMU 아키텍처](/blog/tools/emulation/qemu-internals/chapter01-architecture) (기존)
- [Ch 14: KVM accelerator](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [Ch 15: Coroutine](/blog/tools/emulation/qemu-internals/chapter15-coroutine)
