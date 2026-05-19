---
title: "Ch 10: 성능 측정과 트레이싱"
date: 2026-05-17T04:00:00
description: "QEMU 트레이싱 — TCG 프로파일링, -d 옵션, 성능 분석을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 10
tags: [RISC-V, QEMU, Tracing, Performance, TCG, perf]
draft: true
---

시리즈의 마지막 장입니다. 지금까지 다룬 머신·디버깅·풀 스택 부팅 위에서 *지금 무슨 일이 일어나고 있는지*를 들여다보는 도구를 정리합니다. QEMU의 `-d` 로그, 내장 trace subsystem, TCG 프로파일링, 플러그인, host 측 perf 연동까지 — 시뮬레이션 환경에서 얻을 수 있는 관측 정보의 *층위*를 한 번에 본 다음 시리즈를 닫습니다.

## 어떤 관측이 필요한가

부트 과정에서 무엇이 잘못됐는지를 알려면 *어느 시점*에 *어떤 정보*가 필요한지 명확히 해야 합니다.

| 알고 싶은 것 | 도구 |
|---------------|------|
| 어떤 명령이 실행되었는지 | `-d in_asm`, `-d exec` |
| 인터럽트가 언제 들어왔는지 | `-d int` |
| MMU 어떻게 동작했는지 | `-d mmu`, `-d page` |
| 디바이스 트리거 어떻게 일어났는지 | `-trace <event>` |
| TCG의 번역이 얼마나 느린지 | `-d op`, `-d op_opt` |
| 명령어 횟수 | `-icount` + plugin |
| guest의 호출 그래프 | execlog plugin |
| host CPU 자원 사용 | `perf stat/record` |

이 7가지가 모두 QEMU에 *내장*되어 있습니다.

## -d 옵션 — 가장 빠른 관측

QEMU가 어떤 카테고리를 로깅할 수 있는지는 `-d help`로 확인.

```bash
qemu-system-riscv64 -d help
```

출력의 일부:

```text
in_asm         show target assembly code for each compiled TB
out_asm        show generated host assembly code for each compiled TB
op             show micro ops
op_opt         show micro ops after optimization
op_ind         show micro ops before indirect lowering
int            show interrupts/exceptions in short format
exec           show trace before each executed TB (lots of logs)
cpu            show CPU registers before entering a TB (lots of logs)
fpu            include FPU registers in the 'cpu' logging
mmu            log MMU-related activities
pcall          x86 only: show protected mode far calls/returns/exceptions
cpu_reset      show CPU state before CPU resets
unimp          log unimplemented functionality
guest_errors   log when the guest OS does something invalid
page           dump pages at beginning of user mode emulation
nochain        do not chain compiled TBs so -d exec will show
plugin         output from plugins
```

이 중 부트 디버깅에 가장 많이 쓰는 셋.

| 카테고리 | 용도 |
|----------|------|
| `in_asm` | 어셈블리 흐름 |
| `int` | trap·exception·interrupt 시점 |
| `mmu` | page walk·translation fault |

## 명령어 트레이스 예

```bash
qemu-system-riscv64 -machine virt -nographic -kernel fw.elf \
    -d in_asm -D trace.log
```

`-D trace.log`는 trace를 file로 redirect. 콘솔과 분리되어 깔끔합니다.

`trace.log`의 일부:

```text
----------------
IN:
0x0000000080000000:  04812083          ld              ra,72(sp)
0x0000000080000004:  04012403          lw              s0,64(sp)
0x0000000080000008:  04812483          lw              s1,72(sp)
...
----------------
IN:
0x0000000080000040:  fb010113          addi            sp,sp,-80
0x0000000080000044:  04113423          sd              ra,72(sp)
...
```

QEMU는 *TB(Translation Block) 단위*로 번역하므로, 각 TB가 한 덩어리로 dump됩니다.

## 인터럽트 추적

```bash
qemu-system-riscv64 -machine virt -nographic -kernel fw.elf \
    -d int -D int.log
```

`int.log`:

```text
Taking exception 11 [Machine external interrupt]
mhartid 0
mcause 0x800000000000000b
mepc 0x80000040
mstatus 0x80006080

Taking exception 5 [Load access fault]
mhartid 0
mcause 0x5
mepc 0x80001234
mtval 0xdeadbeef
```

`mcause`·`mepc`·`mtval`이 함께 dump되어 *어떤 명령*이 *어떤 주소*에 접근하다 fault했는지가 한눈에 보입니다. 부트 디버깅에서 *kernel panic before console*를 추적할 때 결정적입니다.

## MMU 추적

```bash
qemu-system-riscv64 -d mmu,page -D mmu.log ...
```

page walk가 어떻게 일어나는지, satp register가 언제 바뀌었는지를 추적합니다.

## QEMU 내장 trace subsystem

`-d`가 *카테고리 단위*라면 trace subsystem은 *event 단위*입니다. 디바이스마다 정의된 trace event를 *선택적*으로 켤 수 있습니다.

```bash
qemu-system-riscv64 -trace help 2>&1 | grep -i riscv | head
```

```text
riscv_trap "hart:%d, async:%d, cause:%" PRId64 ", epc:0x%" ...
riscv_interrupt_taken "hart:%d, cause:%" PRId64
riscv_interrupt_set ...
sifive_uart_read "addr 0x%" ...
sifive_uart_write "addr 0x%" ...
virtio_blk_handle_request ...
```

활성화:

```bash
qemu-system-riscv64 -trace "riscv_*" -D riscv_events.log ...
```

`riscv_events.log`:

```text
1234567 riscv_trap hart:0, async:0, cause:5, epc:0x80001234, ...
1234567 riscv_interrupt_taken hart:0, cause:11
1234568 sifive_uart_write addr 0x0 value 0x48
```

선두 숫자는 *virtual time*(ns). 어느 디바이스가 *언제* 무엇을 했는지가 매우 정확히 dump됩니다.

## TCG 프로파일링

QEMU의 *번역기 자체*가 느릴 때 어떤 IR이 생성되는지 보고 싶다면.

```bash
qemu-system-riscv64 -d op,op_opt -D op.log ...
```

```text
OP after optimization and liveness analysis:
  ld_i64 tmp0,env,$0xa20
  add_i64 tmp0,tmp0,$0x4
  qemu_ld_i64 tmp1,tmp0,leq,$0x0
  st_i64 tmp1,env,$0xa28
```

이건 QEMU 자체를 개발하거나 *왜 시뮬레이션이 느린지*를 분석할 때 필요한 정보입니다. 일반 개발에선 거의 안 봅니다.

## -icount — 명령어 단위 시간

```bash
qemu-system-riscv64 -icount shift=0 ...
```

`-icount`는 *명령어 1개당 정확히 N ns(2^shift ns)*가 흐른다고 가정합니다. *결정론적* 시뮬레이션을 만듭니다.

| shift | 1 instruction = | 용도 |
|-------|------------------|------|
| 0 | 1 ns | 가장 빠른 명령 가정 |
| 3 | 8 ns | 일반적 |
| 7 | 128 ns | 느린 명령 가정 |

`-icount`는 *재현성*이 필요한 디버깅이나 *deterministic regression*에 유용합니다. 일반 부팅에서는 cost가 큽니다.

## TCG plugin

QEMU 5.0+ 이후 *동적 plugin*이 추가되었습니다. 명령 실행마다 callback을 받을 수 있어, custom 분석을 작성할 수 있습니다.

```bash
qemu-system-riscv64 -plugin contrib/plugins/libexeclog.so -d plugin \
    -machine virt -kernel fw.elf
```

`libexeclog.so`는 모든 명령을 log합니다.

```text
0, 0x80000000, 0x04812083, "ld ra,72(sp)"
0, 0x80000004, 0x04012403, "lw s0,64(sp)"
0, 0x80000008, 0x04812483, "lw s1,72(sp)"
```

자주 쓰이는 contrib plugin들.

| Plugin | 역할 |
|--------|------|
| `libexeclog.so` | 모든 명령 로그 |
| `libinsn.so` | opcode별 카운트 |
| `libhotblocks.so` | hot TB 분석 |
| `libcache.so` | cache simulator |
| `libcflow.so` | control flow |
| `libhotpages.so` | page hot/cold |

QEMU source의 `contrib/plugins/`에 있고, plugin은 *C로 작성*되어 cycle 단위로 hook할 수 있습니다.

## Custom plugin 스케치

```c
#include <qemu-plugin.h>

QEMU_PLUGIN_EXPORT int qemu_plugin_version = QEMU_PLUGIN_VERSION;

static void vcpu_insn_exec_cb(unsigned int vcpu, void *udata) {
    uint64_t pc = (uintptr_t)udata;
    /* 명령 실행 직전 호출. PC를 받아 분석. */
}

static void vcpu_tb_trans_cb(qemu_plugin_id_t id, struct qemu_plugin_tb *tb) {
    size_t n = qemu_plugin_tb_n_insns(tb);
    for (size_t i = 0; i < n; i++) {
        struct qemu_plugin_insn *insn = qemu_plugin_tb_get_insn(tb, i);
        uint64_t pc = qemu_plugin_insn_vaddr(insn);
        qemu_plugin_register_vcpu_insn_exec_cb(
            insn, vcpu_insn_exec_cb,
            QEMU_PLUGIN_CB_NO_REGS, (void *)(uintptr_t)pc);
    }
}

QEMU_PLUGIN_EXPORT
int qemu_plugin_install(qemu_plugin_id_t id, const qemu_info_t *info,
                        int argc, char **argv) {
    qemu_plugin_register_vcpu_tb_trans_cb(id, vcpu_tb_trans_cb);
    return 0;
}
```

빌드는 `gcc -shared -fPIC ...`. 이 골격이 *나만의 분석*을 위한 출발점입니다.

## Host 측 perf 연동

QEMU 자체의 host CPU 사용을 보려면 host의 `perf`를 씁니다.

```bash
perf stat qemu-system-riscv64 -machine virt -nographic -bios default
```

```text
 Performance counter stats for 'qemu-system-riscv64 ...':

       1,234,567,890      cycles
         987,654,321      instructions
           1.234567890 seconds time elapsed
           ...
```

`perf record`로 sampling profile.

```bash
perf record -F 999 -g qemu-system-riscv64 ...
perf report
```

QEMU의 *어떤 함수*에서 시간을 가장 많이 보내는지가 보입니다. TCG dispatcher, helper functions, memory access 검사 등이 hot path로 자주 보입니다.

## guest perf vs host perf

여기서 헷갈리지 말아야 할 것: *guest perf*와 *host perf*는 다릅니다.

| 종류 | 무엇을 보나 | 도구 |
|------|--------------|------|
| Host perf | QEMU 프로세스의 CPU 사용 | host의 `perf` |
| Guest perf | guest Linux 안의 application 성능 | guest 안의 `perf` (host와 무관) |

guest 안의 perf는 *QEMU의 PMU 모델*에 의존합니다. RISC-V QEMU에서 `-cpu rv64,sscofpmf=true`를 주면 가상 PMU가 동작해 guest의 perf가 *어느 정도* 의미 있는 카운트를 보여 줍니다. 정확하지는 않지만 *상대적 비교*는 가능.

## 시리즈 마무리

10장을 통과하면서 RISC-V QEMU에 대한 *완전한 어휘*가 모입니다.

| 어휘 | 출처 |
|------|------|
| binary·머신·기본 옵션 | Ch 1 |
| virt 머신 구조·DTB | Ch 2 |
| GDB stub 사용 | Ch 3 |
| sifive_e 베어메탈 | Ch 4 |
| sifive_u Linux | Ch 5 |
| OpenTitan 보안 | Ch 6 |
| spike와의 비교 | Ch 7 |
| 커스텀 디바이스(QOM) | Ch 8 |
| OpenSBI+U-Boot+Linux 풀 부팅 | Ch 9 |
| 트레이싱·plugin·perf | Ch 10 |

이 어휘로 *대부분의* RISC-V 시스템 개발 시나리오를 풀 수 있습니다. 다음 단계는:

- *내 보드*를 QEMU에 추가 — Ch 8 패턴을 가속기·peripheral·메모리 컨트롤러로 확장.
- *공식 spec*과의 cross-check — Ch 7의 spike와 cross-simulate.
- *driver 개발 통합* — QEMU Fake Device 시리즈와 결합.
- *FPGA로 검증 이양* — QEMU+VFIO 시리즈로 단계 진행.

## 흔한 함정

- **-d 너무 많이 켜면 로그가 GB 단위** — 필요한 카테고리만 선택. `nochain`도 무겁습니다.
- **trace event 이름 misspelling** — `-trace help`로 정확한 이름 확인.
- **plugin ABI 버전** — QEMU 버전에 따라 plugin API가 바뀜. plugin 빌드 시 같은 QEMU source로.
- **host perf로 guest 분석 시도** — 의미가 다릅니다. *guest 안에서 perf 돌려야 guest 성능* 보임.
- **icount 사용 시 부팅 매우 느림** — deterministic이지만 cost 큼. 디버깅 끝나면 비활성.

## 정리

- `-d` 옵션이 *카테고리 단위* 로깅의 첫 도구. `in_asm`·`int`·`mmu`가 부트 디버깅의 표준.
- 내장 trace subsystem은 *event 단위* 로깅 — `-trace help`로 사용 가능한 event 확인 후 `-trace "..."`로 활성.
- TCG 프로파일링(`op`, `op_opt`)은 QEMU 자체 개발용. 일반 사용자는 거의 안 봄.
- `-icount`로 *결정론적 simulation*. regression·재현 디버깅에 유용.
- TCG plugin으로 *custom 분석* — contrib에 execlog/hotblocks/cache 등 즉시 사용 가능한 예제.
- host perf와 guest perf는 다른 정보. RISC-V는 `sscofpmf` 활성 시 guest perf 의미 있게 동작.
- 시리즈 10장이 RISC-V 시스템 개발의 어휘를 한 번에 모음. 다음 단계는 내 보드·spike cross-check·driver dev·FPGA 검증.

## 시리즈 마무리

RISC-V QEMU의 *심화*가 무엇이었는지 한 줄로 정리: **하드웨어 없이 RISC-V 시스템 전 layer를 자유롭게 다루는 어휘를 얻는 것**.

이제 자기 보드의 prototype, 새 SoC 펌웨어, RISC-V Linux 포팅 — 어느 것이 와도 QEMU가 *기본 환경*으로 받아 줄 겁니다.

## 관련 시리즈

- [QEMU Internals](/blog/tools/emulation/qemu-internals/chapter01-architecture) — QEMU 내부를 들여다보기
- [QEMU Embedded](/blog/tools/emulation/qemu-embedded/chapter01-overview) — 임베디드 시각의 QEMU
- [QEMU Fake Device Driver](/blog/tools/emulation/qemu-fake-device/chapter01-overview) — driver 개발 워크플로
- [FPGA Driver via QEMU+VFIO](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge) — 다음 단계로의 다리
- [Driver-RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter01-why-cosim) — cycle-accurate 검증

## 참고 자료

- [QEMU Tracing](https://www.qemu.org/docs/master/devel/tracing.html)
- [QEMU TCG Plugin API](https://www.qemu.org/docs/master/devel/tcg-plugins.html)
- [RISC-V Privileged Spec](https://riscv.org/specifications/privileged-isa/)
