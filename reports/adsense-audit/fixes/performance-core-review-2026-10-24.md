# Performance core residual review

No re-score. Evaluation ledger preserved. Scope: Full current originals, inherited unassessed dispositions and frozen evaluation entries read. Per-article primary-document comparison and declared extracted host cases only.

## Checks and limits

Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Gate: [performance-core-review-2026-10-24.gate.log](performance-core-review-2026-10-24.gate.log).
Execution: [performance-core-review-2026-10-24.verify.log](performance-core-review-2026-10-24.verify.log).
Execution: [performance-core-review-2026-10-24.math.log](performance-core-review-2026-10-24.math.log).
Execution: [performance-core-review-2026-10-24.overlap.log](performance-core-review-2026-10-24.overlap.log).

## Per-article evidence

### `part3-09-power-vs-performance.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/performance-engineering/part3-09-power-vs-performance.md
2. **problemSignalAndCounterevidence:** Unsupported DVFS/power/current/thermal tables and universal race-to-idle/governor/hotplug claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Extracted energy function normal/reversal/zero/five invalid inputs pass. CPUFreq policy/driver and idle docs compared; no power sensor.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replace with same-work/window energy model and actual100/108/68mJ calculation/cost reversal; pin Linux6.12CPUFreq/CPUIdle and remove unsupported SoC/board numbers.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Declared host/document checks, blocking gate, inline math and scoped diff pass; residual target scope remains untested. Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Before SHA-256: `00e396c094ef195c52164ecb8db57bb441b2fe1a154bad41d945720698e5f2ca`. After SHA-256: `560a79cd6d462f0e45dc1ada836fe77d66ae9e36f263dd78104ca74350ec2cb5`.

Next action: manual-review. Does measured energy/job under the real driver/OPP/idle/temperature and deadline reverse the model decision?

### `part4-02-false-sharing.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/performance-engineering/part4-02-false-sharing.md
2. **problemSignalAndCounterevidence:** FakeA72speedup/noncompiling10M, array-basealignment mistaken for stride, MESIalwaysDRAMflush, stackalignas unsupported, automaticperCPU/RTOSpadding.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual compiler confirms alignment/stride/address blocks; two pthreads each100000incrementsperfield in bothlayouts pass underASanUBSan. NativeSVGrebuilt/visuallychecked/strictzerooverlapandtouch.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Use actual C11densevs64Bslot layout and concurrent atomic correctness; distinguishlineassumptionfrommeasuredcoherency. Remove fakebenchmark and fix native diagram unsupportedclaims/clippedlabels.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Declared host/document checks, blocking gate, inline math and scoped diff pass; residual target scope remains untested. Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Before SHA-256: `0aaef7e04d4577b7cd7780fc2a870e8efdf5b2776294631f1a1760f165d6e0d2`. After SHA-256: `c677115037b25870cb64c73c49ecb2f186f5ff9cc90eed29eb3867339f323423`.

Next action: manual-review. On the target layout/PMU, are hot offsets different objects, and does the same-work benchmark justify extra footprint?

### `part4-03-lock-contention.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/performance-engineering/part4-03-lock-contention.md
2. **problemSignalAndCounterevidence:** Genericperf lock treatedaspthreadmutex, wrongwaitaggregation/universal20percent/RW30percent, ISRmutex andalignedordinaryread guarantees, fakemeasuredtable.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Official6.12perf-lockreport fields and kernel vsuserspace scope reviewed. Gate/math/diff pass; noLinuxtrace claimed.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Pin Linux6.12kernel-lockscope; separate requests/acquire/release and userspace instrumentation, cumulativewait vswalltime andRTOS/ISRcontract. Remove unsupported thresholds/timing.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Declared host/document checks, blocking gate, inline math and scoped diff pass; residual target scope remains untested. Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Before SHA-256: `a2b47eadc074a1fa942b8bc4171fb31a78e92e0e6f141f21467da946c9df860a`. After SHA-256: `49ff7542a1d81a1457468699fef73f28783e85c4070b60175fc835b3dec83e51`.

Next action: manual-review. Which matching userspace lock request/acquire/release events distinguish hold, preemption, wait and losses in the actual workload?

### `part4-07-lock-free.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/performance-engineering/part4-07-lock-free.md
2. **problemSignalAndCounterevidence:** NonatomicCAS/top, invalidAPI/freeunsafe stack, TLSunpublishedHP, waitfree fixedcycles, taggedpointerasUAFfix, fakeLSE/A72timing and unprovenqueue/libraryprogress.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Four host threads reach400000limit without exceeding; limitrefusal/zero/UINT_MAX boundaries and actualatomic_is_lock_free=1 pass ASanUBSan. C++draftatomic/progress and Michael2004 primarypublication reviewed.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replace broken executable snippets with actual boundedC11CAScounter; explain atomic query, API/allocation/reclamation progress, safeHPregistration contract and epoch limitations. Remove fakebenchmark.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Declared host/document checks, blocking gate, inline math and scoped diff pass; residual target scope remains untested. Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Before SHA-256: `d98392621084e971041720161a0ee861a373cc519c79b19cb91cbe6a1f033899`. After SHA-256: `c7210edcd834523b87e50e54ea7e0ee8d269ef5fc86193241b21f07ec9910eb2`.

Next action: manual-review. What progress and reclamation guarantees survive paused readers, allocator callbacks, retirement backlog and target atomic fallback?

## Primary sources

- [https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpufreq.html](https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpufreq.html)
- [https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpuidle.html](https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpuidle.html)
- [https://www.kernel.org/doc/html/v6.12/kernel-hacking/false-sharing.html](https://www.kernel.org/doc/html/v6.12/kernel-hacking/false-sharing.html)
- [https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-lock.txt](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-lock.txt)
- [https://eel.is/c++draft/atomics.lockfree](https://eel.is/c++draft/atomics.lockfree)
- [https://research.ibm.com/publications/hazard-pointers-safe-memory-reclamation-for-lock-free-objects](https://research.ibm.com/publications/hazard-pointers-safe-memory-reclamation-for-lock-free-objects)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
