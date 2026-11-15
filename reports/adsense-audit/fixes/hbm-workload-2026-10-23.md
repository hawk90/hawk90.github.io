# HBM workload, thermal and controller repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Full four chapters and loop28/29 evaluation entries read; scoped official APIs/docs and primary research reviewed. Unchanged extracted arithmetic/C teaching functions exercised.

## Checks and limits

No GPU/FPGA/CXL device, CUDAcompile/DRAMscheduler/truebandwidth/thermal/refresh/LLMserving/offload/UALink execution. Synthetic numerical/mask/address scenarios and hostC ASan/UBSan only. Primary-source review is scoped; retained legacy product announcements are not newly exhaustive hardware/spec verification.

Gate: [hbm-workload-2026-10-23-gate.log](hbm-workload-2026-10-23-gate.log).
Execution: [hbm-workload-2026-10-23.log](hbm-workload-2026-10-23.log).

## Per-article evidence

### `chapter05-bandwidth-bottleneck.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck.md
2. **problemSignalAndCounterevidence:** Uncompilable global CUDA allocation/kernel fragment without timing; unsupported profiler versions/field claims; 140GB on80GB H10042ms portrayed as actual inference lower bound, MFU/MBU as sufficient diagnosis.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** NVIDIA H100 specifications, Volta/Hopper architecture references, CUDA12.8.1 guide and NsightCompute2023.1.1 CLI; previous factcheck retained for legacy hardware facts.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Manually narrowed title/description to public peak, measurement methodology and roofline; replaced broken pseudo-benchmark with checked numerical postprocessor and explicit hypothetical24GB/s example; linked complete vendor examples; separated logical bytes/hardware activity and hypothetical single-path time from multiGPU latency.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted JS roofline normal memory/compute cases, unit arithmetic, invalid/nonfinite/overflow cases pass. No actual GPU bandwidth/latency or profiling run. No GPU/FPGA/CXL device, CUDAcompile/DRAMscheduler/truebandwidth/thermal/refresh/LLMserving/offload/UALink execution. Synthetic numerical/mask/address scenarios and hostC ASan/UBSan only. Primary-source review is scoped; retained legacy product announcements are not newly exhaustive hardware/spec verification.

Before SHA-256: `f919bfbc29d8a633a6c47bf6aafd3f205257ca09f920ca4a9bb36edaed963af3`. After SHA-256: `bc94fa15c1d1b6c1949ed71204d4b4d3332a5fc7f424353f208df0709138b2ef`.

Next action: manual-review. Which exact model/kernel, GPU/toolkit/driver/power/clock, verified outputs and repeated timing/counter distributions establish achieved BW and real bottleneck?

### `chapter06-thermal-power.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/hbm/chapter06-thermal-power.md
2. **problemSignalAndCounterevidence:** Title promised unmeasured refresh cost; fabricated unlabeled command output;0x20 treated as sufficient HBM thermal cause; VDDQ interval blurred discrete options and signal-swing vs supply.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual NVIDIA NVML header shows0x4/0x20/0x40 and GPU/memory conditions; official nvidia-smi docs support-device limits; JEDEC initial releases and NVIDIA DGX/GB200 product sources.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Manually narrowed title; removed fabricated output, added local capability checks/N-A handling; corrected multibit/unknown-mask handling and GPU-or-memory thermal ambiguity, sourced discrete voltages and selected cooling examples; scoped heatpath picture.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted uint64 BigInt mask tests zero/single/multiple/unknown/highbits/N-A/malformed/overwide inputs pass. Synthetic input only; no device temperature/throttling/refresh or cooling measurement. No GPU/FPGA/CXL device, CUDAcompile/DRAMscheduler/truebandwidth/thermal/refresh/LLMserving/offload/UALink execution. Synthetic numerical/mask/address scenarios and hostC ASan/UBSan only. Primary-source review is scoped; retained legacy product announcements are not newly exhaustive hardware/spec verification.

Before SHA-256: `7201ed8ff38b2c6b8d323860f6fe27483ea15f9118bcaaad475ac8fd748b82d9`. After SHA-256: `b314b102898ba09cd5d4a3b1a2ef8eb12e24420f1ebebf3e17a7e161efd902a6`.

Next action: manual-review. Which supported telemetry and timestamped load/sensor/limit/clock/power traces distinguish core thermal, memory thermal and concurrent power limits on the selected hardware?

### `chapter07-memory-controller.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/hbm/chapter07-memory-controller.md
2. **problemSignalAndCounterevidence:** Generic DRAM chapter labelled HBM-specific analysis; undefined-scope XOR fragment, stride blanket benefit and implicit all-row-hit-ready assumption; fixedperport460/32 described as guaranteed.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** JEDEC HBM3 release, Rixner original paper and author research page, AMD PG2761.0Features/AXIConsiderations2025-12-17, U55CDS978v1.3.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Manually narrowed title/description; made bounded pureC teaching map distinct from actual decoder; demonstrated stride/channel concentration and explicit XOR collision; clarified ready/ordering/starvation and documented PG276AXI3/32byte requirements; removed prose blocks and wrong draft links.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted C compiled -Wall-Wextra-Werror with ASan/UBSan;2MiBstride spreads16banks butchannel0; collision pair and100000uint64addresses/UINT64_MAX pass. No actual HBM mapping/controller/FPGA/timing or universal scheduling/performance guarantee. No GPU/FPGA/CXL device, CUDAcompile/DRAMscheduler/truebandwidth/thermal/refresh/LLMserving/offload/UALink execution. Synthetic numerical/mask/address scenarios and hostC ASan/UBSan only. Primary-source review is scoped; retained legacy product announcements are not newly exhaustive hardware/spec verification.

Before SHA-256: `03ac1ebf4f98d4fb85fbeecda4231f8d5d2972963863cd72a2632b688ddfbd89`. After SHA-256: `4b981bbe57fa14769ac476ff3c5ed250227737b0eb8616918cc5c66222920925`.

Next action: manual-review. Which actual decoder/port/crossbar/ordering/timing configuration and representative request traces establish conflicts, fairness and measured bandwidth?

### `chapter08-npu-gpu-usage.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage.md
2. **problemSignalAndCounterevidence:** Incorrect whole-activation budget/226GBtotal, incomplete nonworking attention and oversized128x128CUDAthreadblock; long-context beyond4096 without scope, batch0.65ms confused with userlatency; hostCXL memory impliedGPUaccessible.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Meta Llama2paper/fairseq2officialconfig, FlashAttention/PagedAttention originalpapers, CUDA12.8.1 sharedmemoryguide and vendor product references.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected decimal hidden tensor sizes and weight+KV subtotal/overhead limits; added exactBigIntKVcalculator; removed invalid attention/CUDA snippets in favor of actual algorithm contracts and versionedvendor tile reference; separated outputtile/block/threadmapping, scenario context limits and throughput-vs-latency; made offload path conditional and removed changingboard roster. Manualdescriptioncorrection.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted KV exact327680B/token,85899345920B batch128seq2048,2xcontext/8xMHA and BigIntlargeinput/invalid cases pass. ActualhostJS only; no CUDAcompile/LLMload/modelquality/offload/UALinkruntime validation. No GPU/FPGA/CXL device, CUDAcompile/DRAMscheduler/truebandwidth/thermal/refresh/LLMserving/offload/UALink execution. Synthetic numerical/mask/address scenarios and hostC ASan/UBSan only. Primary-source review is scoped; retained legacy product announcements are not newly exhaustive hardware/spec verification.

Before SHA-256: `03e83a096163fcf4139cc3567b919527322651c91e18c9171e688d35b649ca3f`. After SHA-256: `8c8a1750629f8f641bc591c97a7156c8b482a04104b69b6cad36ea2a56323041`.

Next action: manual-review. Which exactcheckpoint/runtime/precision/context/batch, measured allocator/workspace/KV overhead and supported GPU-host memory copy/mapping path establish feasibility and per-user latency?

## Primary sources

- [https://www.nvidia.com/en-us/data-center/h100/](https://www.nvidia.com/en-us/data-center/h100/)
- [https://docs.nvidia.com/deploy/nvidia-smi/index.html](https://docs.nvidia.com/deploy/nvidia-smi/index.html)
- [https://raw.githubusercontent.com/NVIDIA/nvidia-settings/main/src/nvml.h](https://raw.githubusercontent.com/NVIDIA/nvidia-settings/main/src/nvml.h)
- [https://docs.amd.com/r/en-US/pg276-axi-hbm/Features](https://docs.amd.com/r/en-US/pg276-axi-hbm/Features)
- [https://docs.amd.com/r/en-US/pg276-axi-hbm/AXI-Considerations](https://docs.amd.com/r/en-US/pg276-axi-hbm/AXI-Considerations)
- [https://docs.amd.com/r/en-US/ds978-u55c/Product-Details](https://docs.amd.com/r/en-US/ds978-u55c/Product-Details)
- [https://www.ece.ualberta.ca/~elliott/ece510/seminars/2002f/2002-10-29/p128-rixner.pdf](https://www.ece.ualberta.ca/~elliott/ece510/seminars/2002f/2002-10-29/p128-rixner.pdf)
- [https://docs.nvidia.com/cuda/archive/12.8.1/cuda-c-programming-guide/index.html](https://docs.nvidia.com/cuda/archive/12.8.1/cuda-c-programming-guide/index.html)
- [https://facebookresearch.github.io/fairseq2/stable/_modules/fairseq2/models/llama/config.html](https://facebookresearch.github.io/fairseq2/stable/_modules/fairseq2/models/llama/config.html)
- [https://arxiv.org/abs/2307.09288](https://arxiv.org/abs/2307.09288)
- [https://arxiv.org/abs/2205.14135](https://arxiv.org/abs/2205.14135)
- [https://arxiv.org/abs/2309.06180](https://arxiv.org/abs/2309.06180)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
