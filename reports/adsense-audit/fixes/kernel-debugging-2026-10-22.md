# Kernel Debugging 9편 사실 수정 기록 — 2026-10-22

- 범위: 9편, `src/content/blog/tools/debugging/kernel/chapter01~09`만. 시작 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 각 score ledger `sourceSha256`는 시작 HEAD 내용과 일치했습니다. 점수·평가 원장은 수정하지 않았습니다.
- 상태: 9편 모두 `remediated`; 점수 재산출은 하지 않았습니다. 처분별 8개 증거 필드는 동반 JSON의 `articles[].validation`에 있습니다. URL·date·seriesOrder·draft 보존을 검사했습니다.
- Linux live kernel, bpftrace, crash, drgn, QEMU x86_64, CXL 장치가 없어 본문 target examples는 실행하지 않았습니다. 정적 검증을 실행 PASS로 확대하지 않았습니다. Full site build는 parent 담당입니다.
- 공식 자료: [printk](https://docs.kernel.org/core-api/printk-basics.html), [kernel sysctl](https://docs.kernel.org/admin-guide/sysctl/kernel.html), [ftrace](https://docs.kernel.org/trace/ftrace.html), [taint](https://docs.kernel.org/admin-guide/tainted-kernels.html), [SysRq](https://docs.kernel.org/admin-guide/sysrq.html), [BPF verifier](https://docs.kernel.org/bpf/verifier.html), [KGDB](https://docs.kernel.org/dev-tools/kgdb.html), [bpftrace 0.24](https://bpftrace.org/docs/release_024/language), [drgn](https://drgn.readthedocs.io/en/latest/user_guide.html), [CXL driver](https://docs.kernel.org/6.17/driver-api/cxl/linux/cxl-driver.html). Ch9 upstream Linux `v7.3-rc6` source snapshot SHA 목록은 JSON에 기록했습니다.

| 장 | 상태 | 확인·수정 주제 | 실행 한계 |
|---|---|---|---|
| Ch 1 | remediated | Kernel/user boundary and taint bits | verifier, gate, inline math, diff-check PASS. Live kernel/sysrq/taint behavior not run. |
| Ch 2 | remediated | printk ratelimit and console behavior | verifier, gate, inline math, diff-check PASS. No workload/performance measurement. |
| Ch 3 | remediated | ftrace function availability and vmcore limits | verifier, gate, inline math, diff-check PASS. No tracefs or vmcore execution. |
| Ch 4 | remediated | bpftrace args syntax, I/O units, verifier claims | verifier, gate, inline math, diff-check PASS. bpftrace unavailable; examples not executed. |
| Ch 5 | remediated | kgdb transport and entry conditions | verifier, gate, inline math, diff-check PASS. No QEMU/serial session or target. |
| Ch 6 | remediated | drgn CLI/API and address arithmetic | verifier and 64-bit arithmetic, gate, inline math, diff-check PASS. No crash/drgn/vmcore run. |
| Ch 7 | remediated | oops/panic decoding and module symbolization | verifier, gate, inline math, diff-check PASS. No module ELF/vmcore present. |
| Ch 8 | remediated | CXL DVSEC and mailbox failure interpretation | verifier, gate, inline math, diff-check PASS. No CXL hardware, BTF probe or device execution. |
| Ch 9 | remediated | pinned CXL initialization/probe/commit flow | verifier, gate, inline math, diff-check PASS. Source inspected, not compiled; no live CXL. |

## 검증

- `node scripts/verify-kernel-debugging-examples.mjs`: 9편 PASS. score-snapshot baseline SHA, 수정 후 SHA, 장별 핵심 사실 불변식, URL/date/seriesOrder/draft 보존, fence 균형을 검사합니다. 이는 코드 런타임 검증이 아닙니다.
- `bash scripts/audit-publish-gate.sh <9 files>`: blocking gates PASS. upstream freshness 및 cited-symbol 검사는 upstream clone 부재로 SKIPPED이며 PASS로 기록하지 않았습니다.
- `node scripts/check-inline-math.mjs <9 files>`: PASS. `git diff --check`: PASS.
- manifest의 최종 상태는 `readyForIntegration:true`입니다. Blocking publish gates, math, diff-check, verifier와 evidence 작성이 완료됐습니다. Parent가 담당하는 full site build는 아직 실행되지 않았습니다.
