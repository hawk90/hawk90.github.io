# Performance tools residual review

No re-score. Evaluation ledger preserved. Scope: Full current originals, inherited unassessed dispositions and frozen evaluation entries read. Per-article primary-document comparison and declared extracted host cases only.

## Checks and limits

Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Gate: [performance-tools-review-2026-10-24.gate.log](performance-tools-review-2026-10-24.gate.log).
Execution: [performance-tools-review-2026-10-24.verify.log](performance-tools-review-2026-10-24.verify.log).
Execution: [performance-tools-review-2026-10-24.math.log](performance-tools-review-2026-10-24.math.log).
Execution: [performance-core-review-2026-10-24.overlap.log](performance-core-review-2026-10-24.overlap.log).

## Per-article evidence

### `part5-02-perf-advanced.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/performance-engineering/part5-02-perf-advanced.md
2. **problemSignalAndCounterevidence:** Group claimednever multiplex, universalrawencoding, fakeoverhead/rate/time thresholds, unversionedcallback/unsupportedcallgraphguarantees.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Extracted Pythoncallback syntax+two direct syntheticdispatch/filtercases pass; actualperf notrun. Linux6.12perfstat doc compared.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Pin Linux6.12stat/group semantics, rawPMU format and unsupported/not-counted/lostsamples; marktrace/callbackconceptual and remove universalmeasurements.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Declared host/document checks, blocking gate, inline math and scoped diff pass; residual target scope remains untested. Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Before SHA-256: `a942359f8eb04f254a4af10af125e6ea8a0adc11f0287ddaebc2a9db230ab709`. After SHA-256: `4d624c3335152dac1968dc983a85b47e1b248e89e242789784014abf5d4df90a`.

Next action: manual-review. Do target event format/group feasibility and generated callback parameters agree under the chosen perf/kernel build and unavailable-event cases?

### `part5-06-arm-ds-lauterbach.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach.md
2. **problemSignalAndCounterevidence:** Streamlinegatord vsbaremetalETMconflation, allcore/data/timingguarantees, unverifiedPRACTICE and syntheticcoverage/ISRresults, pinabsence universaltraceban.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Arm gator officialbaremetalagentdoc and TRACE32officialon/offchip/OSawareness source reviewed. Two nativeSVGsrebuilt, rendered/visuallyinspected andstrictzerooverlap/touch. No tool/probe run.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Separate gatord/barman and probe/OStraceconditions, remove unrun vendorcommands and fakecertification/results, correcttwonativefigures and boundaryclipping.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Declared host/document checks, blocking gate, inline math and scoped diff pass; residual target scope remains untested. Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Before SHA-256: `5603bbf98015fc7d552467b33efba2e5e3a16d8faee48484ea5318cdd5d74740`. After SHA-256: `2ea42317fb068c81513d591609e529f7965d14cb9fe296cb6bcb433e463bd166`.

Next action: manual-review. Which release/core/SoC/probe/RTOS/binary/trace-loss conditions support the required timing/coverage evidence without halted-core interference?

### `part5-07-baremetal-profiling.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/performance-engineering/part5-07-baremetal-profiling.md
2. **problemSignalAndCounterevidence:** DWTwrapnotbounded, SysTickmaskonlyvalidmaxreload, ITM/SWDconflation/unboundedbusywait, ISRbodycalledtotalWCET, fakeprintfduration and undocumentedSystemViewcalls.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Extracted C707264exhaustive smallreload pairs plus24bitboundaries/invalid/null/unchangedfailure passASanUBSan. CMSISSysTickscope reviewed; noMCUcounter/waveform.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Add actual generalreload downcounterhelper and one-period/constantclockcontract; separateGPIOedges/counter/exceptionbody, ITMoutputreadiness and targetfeature requirements.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Declared host/document checks, blocking gate, inline math and scoped diff pass; residual target scope remains untested. Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Before SHA-256: `e704d3552cad1ed9b62d262733ecf682f369e5789f00f8765f7fa77941de92f6`. After SHA-256: `8caf8fc22f49337685bbca83bc8736da785537504060081c9a3870243bfb02fd`.

Next action: manual-review. On the named MCU, are counter availability, enable/lock/clock/reload/sleep behavior and measured observer cost sufficient for the intended interval?

### `part5-08-nsight.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/performance-engineering/part5-08-nsight.md
2. **problemSignalAndCounterevidence:** Inheritedcorrectedstreamsequence stillinvalidsample=cpu/cpuctxsw=process and generalJetson/DLA/multimediasupport, incompleteCUDAcall andfakeASCIIcapture.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** NVIDIAUserGuideCLI tables andCUDAstreamsync documentation compared2026-10-24. Commands explicitlyunrun. NoCUDAcompile/capture/profilerresult claimed.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** UseofficialCLI sample=process-tree/cpuctxsw=process-tree; requireedition/JetPack/device matrix. Removeunverifiedmultimedia options andfakecapture, distinguishAPI/GPUdependency/overlap and balancedNVTXrange.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Declared host/document checks, blocking gate, inline math and scoped diff pass; residual target scope remains untested. Host models/functionality/layout only. No targetPMU/perf/ftrace, measuredspeedup/energy/physicalcoherence, all-schedules lockfree/reclamation proof, MCU/RTOS/ISR waveform, commercial probe/coverage, GPU/CUDA/Nsight runtime or certification. Native figures only touched three; strict text overlaps0/touch0, near counts reported, clipped borders corrected by visual review. Generic upstream gate skipped, not passed. Frozen evaluation scores unchanged.

Before SHA-256: `2052d8e5ce2bf10c0c082f1dc9f3629f7a0c8ad58aa5ec9e24150c2b39479b6f`. After SHA-256: `ff102733cea568f67b5f2bfb31b636a9936778ce906ab6cc7672b525b9fb3576`.

Next action: manual-review. On the supported GPU/driver/edition and pinned memory harness, do actual traces show dependency-correct overlap and stable workload latency?

## Primary sources

- [https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-stat.txt](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-stat.txt)
- [https://github.com/ARM-software/gator](https://github.com/ARM-software/gator)
- [https://documentation-service.arm.com/static/5f4f6c97ca7b6a3399378218](https://documentation-service.arm.com/static/5f4f6c97ca7b6a3399378218)
- [https://www.lauterbach.com/supported-platforms/architectures/arm](https://www.lauterbach.com/supported-platforms/architectures/arm)
- [https://arm-software.github.io/CMSIS_6/latest/Core/group__SysTick__gr.html](https://arm-software.github.io/CMSIS_6/latest/Core/group__SysTick__gr.html)
- [https://docs.nvidia.com/nsight-systems/UserGuide/](https://docs.nvidia.com/nsight-systems/UserGuide/)
- [https://docs.nvidia.com/cuda/cuda-runtime-api/stream-sync-behavior.html](https://docs.nvidia.com/cuda/cuda-runtime-api/stream-sync-behavior.html)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
