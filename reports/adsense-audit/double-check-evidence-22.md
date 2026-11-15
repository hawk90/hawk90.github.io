# 초벌 근거 대조 — 공개 루프 22

Sol 최종 검토용 evidence 메모다. 대상 원문 전체를 line-numbered로 대조했으며 기존 점수는 복제하지 않았다. 원문만으로 충돌해 보이는 항목은 3-1 기준에 해당하는지 Sol이 확정한다. 외부 사양·API·예시 실행은 1차 자료/실행이 필요한 미확인 사항으로 분리했다. D는 실제 양쪽 원문 구간, F는 실제 링크 대상과 문구를 적었다. 원문은 수정하지 않았다.

## 1. `part5-05-flamegraph.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-05-flamegraph.md`, 읽은 구간 1–242 전체.
- A–G: A(35–48,57–81,124–171,192–221) 수집·해석은 표준 도구 설명이며 임베디드 사례와 고유 선택 기준이 제한적. B(35–81,97–129,131–188,192–230) 수집부터 함정까지 흐름, 일부 옵션 의미/한계는 확인 필요. C(28–49,65–72,103–112,135–146,175–186) 재실행 명령은 있으나 결과·환경·버전 부족. E(24–95,97–129,131–148) 제목 주제는 다룸, 예시가 웹 서비스. F(232–238) 다음 편·링크 실대상 확인. G(1–242) 출처 링크는 저장소 URL 정도.
- D 원문쌍: profile-bpfcc 파이프 65–68 ↔ `part5-04-ebpf.md` 124–125·148–149; 수집 흐름 35–48 ↔ `part1-08-profiling-overview.md` 86–87; 비교 역할로 `part5-09-tracy-hotspot.md` 92–96, `part5-10-ebpf-continuous.md` 119, tools Python py-spy 58–65 대조. 같은 주제 tools/perf-flamegraph Ch5/Ch6는 draft stub(각 14–19, 14–20)라 공개 비교글 아님. 차분·icicle·off-CPU 본문은 이 글만의 내용.
- F: 232행 next ARM DS/Lauterbach → 공개 `part5-06-arm-ds-lauterbach.md` order45; 236–238행 5-04/5-06/5-09 링크 대상과 라벨 대조해 일치. 33행 “세 단계” 뒤 네 항목 나열은 있으나 링크 문제와 별개.
- 내부 근거 후보: 207행 99/999를 소수라고 부르고 230행 그 전제를 재사용. 자체 정수 성질로 대조 가능하나 최종 factcheck 확정은 Sol. 확인 질문: `--reverse`/`--inverted` 출력(152–159), 정렬이 stack 면적 의미를 가질지(109–111), offcputime 출력 포맷(182) 등은 FlameGraph/BCC upstream 문서·실행 필요. 188·221행 수치 출처도 확인 필요.

## 2. `part5-06-arm-ds-lauterbach.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach.md`, 읽은 구간 1–190 전체.
- A–G: A(24–73,75–126,128–167) PRACTICE·인증표·가격·시나리오가 고유 소재이나 상당수 무출처. B(24–178) 흐름은 완결, PTM 절 설명 부족·trace/breakpoint 관계 확인 필요. C(57–71,110–113,128–145) 스크립트와 절차 있으나 보드/툴 버전·결과 환경 미기재. E(2,5,24–96) 제목의 ETM/PTM와 tools가 본문에 있으나 PTM은 거의 이름만. F(178–185) 링크 검증. G(1–190) 1차 출처 없음.
- D: ETM 20·79–81 ↔ RTOS `part2-11-tracing-observability.md` 및 debugging `chapter02-jtag-swd-coresight.md` 344–356, `chapter06-trace.md` 327–357; M0·trace pins 151·161 ↔ chapter02 356, chapter06 333·345·357. Bare-metal profiling 18·206의 ETM 언급은 짧아 역할 차이. 비교 글 실제 구간 확인.
- F: 178행 next Bare-metal → 공개 `part5-07-baremetal-profiling.md` order46; 182–185행 5-05/5-07/RTOS 2-11/chapter02 대상 라벨 대조 일치.
- 내부 후보: 79행 “ETM-M0가 있다”와 161행 “Cortex-M0에는 ETM이 없다”는 양립 불가해 보임. 어느 기술문장이 맞는지는 ARM ETM TRM 필요. 확인 질문: probe 버퍼/속도(41–53), 인증 표준 coverage(100–113), 가격(117–124), gator·Streamline 지원(37,165), RTOS TCB trace(96)는 ARM/Lauterbach/표준 문서와 실제 도구 확인 필요.

## 3. `part5-07-baremetal-profiling.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-07-baremetal-profiling.md`, 읽은 구간 1–263 전체.
- A–G: A(24–54,60–96,100–173,198–235) 익숙한 측정 기법 소개, 비교표·함정은 고유하지만 선택 기준/근거 얕음. B(26–96,100–173,175–194,198–243) 코드·시나리오가 있으나 wrap·FIFO 등 설명 확인 필요. C(31–71,105–133,179–206) 코드/절차 존재, 환경·실제 결과·버전 부족. E(2,5,24–194) 제목 기법 다루지만 “profiling”보다 구간 시간 계측 중심. F(254–261) next와 related 검증. G(1–263) 주장에 연결된 1차 출처 없음.
- D: GPIO/DWT/SysTick/SystemView/ITM 원문쌍 `part1-03-measurement.md` 63–72↔63–81, 75↔84, 77–87↔100–121, 143–166↔24–54, 202–213↔148–167, 215–223↔123–146; RTOS `part2-11-tracing-observability.md` 117–127↔127–133 및 89–90↔155–158; Recipes `part10-07-interrupt-debugging.md` 217–241↔175–194; debug chapter06 387↔198–206. Recipes는 D 비교대상으로 허용.
- F: 254행 next Nsight → 공개 `part5-08-nsight.md` order47; 258–261행 5-06/5-08/RTOS2-11/debug chapter06 실제 대상 및 라벨 확인.
- 내부 후보: 136행 87µs/char(115200 baud)와 215·217행 길이 다른 `start\n`/`end\n` 모두 ~870µs가 일치하지 않음. 또한 250행 “100배”는 87µs와 100ns 비교 시와 배수가 달라 보임. 확인 질문: 84·237–243 wrap, 145 FIFO, SWO/TPIU 속도·ITM 시간은 ARM ARM/CMSIS/SEGGER 자료와 타깃 확인 필요.

## 4. `part5-08-nsight.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-08-nsight.md`, 읽은 구간 1–274 전체.
- A–G: A(28–113,127–158,181–208,212–247) 설치·timeline·NVTX·Jetson 흐름에 카메라/추론 사례가 있으나 다수 표준 설명. B(18–258) 흐름은 완결, NVTX·stream 예제 및 NPU 설명이 빈약/상충 후보. C(40–42,119–122,149–166,181–206,236) 재현 명령 있으나 버전/실제 capture 없음, 일부 수치·URL placeholder. E(2,5,20,143–158) GPU/NPU 약속 중 NPU는 DLA 언급에 한정. F(260–266) 다음 편·related 검증. G(1–274) 출처/버전 결여.
- D: CUDA stream overlap 127–141·198–206 및 DLA 145·158 ↔ Recipes `part12-05-tensorrt.md` 122–128·161–180 및 44·62–64; 인접 5-07/5-09는 계측 주제가 달라 핵심 중복 약함. 비교 원문 양쪽을 확인.
- F: 260행 next Tracy/Hotspot/uftrace → 공개 `part5-09-tracy-hotspot.md` order48; 264–266행 5-07/5-09/Embedded C++2-07 링크 라벨·대상 일치, 마지막 항목 주제 연관성은 약함.
- 내부 후보: 104·258행 PyTorch/TensorFlow layer NVTX 자동 제공 주장과 238–247행 NVTX 없는 경우 및 수동 삽입 설명이 같은 조건을 두고 충돌 후보. 확인 질문: CUDA stream 실행 순서(137–138), TensorFlow marker 지원, nsys 옵션·JetPack trace(149–166,236), DLA 대상은 NVIDIA 공식 문서 및 GPU 실행 필요.

## 5. `part5-09-tracy-hotspot.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-09-tracy-hotspot.md`, 읽은 구간 1–272 전체.
- A–G: A(24–65,67–98,100–143,145–219) 도구별 설치/소개형, 선택 절차와 임베디드 cross-target 설명 부족. B(24–219,221–263) 도구별 흐름·비교는 있으나 uftrace 출력/실행 환경 확인 필요. C(31–50,71–85,104–117,119–186) 예시 명령·출력이나 버전, target 환경, 실제 검증 부족. E(2,5,24–207) 열거한 4 도구는 소개, 비교 축 제한. F(265–272) next/related 검증. G(1–272) repo/release URL 외 문서 출처 없음.
- D: perf function_graph `part5-03-ftrace.md` 80·167↔102·134 (목적 유사하나 kernel/user-space 차이), `part5-05-flamegraph.md` flamegraph와 94·98, 5-08 204·5-10 258의 짧은 언급. 비교 쌍 범위 확인, 독립 profiler workflow와 구분됨.
- F: 265행 next Continuous Profiling → 공개 `part5-10-ebpf-continuous.md` order49; 269–272행 5-05/5-08/5-10/Embedded C++2-07 실제 링크 라벨 확인. C++ 링크 관련성은 약함.
- 내부 후보: uftrace 예시 119–131에서 parse_input 123 진입 12.345us vs 126 종료 12.000us, process 127 45.678us vs 131 45.000us로 동일 호출의 duration 값이 다른 출력. 진입줄 duration 의미를 uftrace upstream/실행으로 확인 필요. 31행 Tracy build path, 139 filter 문법, 175 plot, frame pointer 조건(254), 성능 수치(53,237)는 문서/실행 질문.

## 6. `part5-10-ebpf-continuous.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-10-ebpf-continuous.md`, 읽은 구간 1–265 전체.
- A–G: A(26–73,89–187,189–215) 여러 OSS·상용 도구 소개, 임베디드 fleet 가치는 189–197에 짧음. B(16–258) 구성 흐름은 완결, agent 운영 절차·수치 근거 부족. C(49–57,84,98,125,133–149,195,219–246) 일부 명령/코드 있으나 최신 태그·실행 환경/예상 결과 없음. E(2,5,43–187,189–197) 제목 profiler에 비해 Tetragon 보안 및 Pixie observability 범위가 포함됨. F(258,262–265) series continuation과 links 확인. G(1–265) 1차 출처 링크 없음.
- D: overhead 34–41 ↔ `part5-04-ebpf.md` 130–139; frame pointer 219–223 ↔ `part5-01-perf-basics.md` 270–277, `part5-05-flamegraph.md` 192–199, `part5-09-tracy-hotspot.md` 252–254; BPF_LSM 168 ↔ 5-04 168–180. 같은 주제 비교 원문 범위 확인.
- F: 258행은 Part5뿐 아니라 EPE 본문 시리즈 종료를 말하지만 공개 order50 `part6-01-case-isr-latency.md`가 후속. 262–265행 related 4 targets/labels 확인.
- 기존 판정 근거: 본문 내 구체 양립 불가 문장은 이번 대조에서 별도로 찾지 못함. 미확인: CNCF status, sFrame 컴파일러 지원/agent 인식, Ubuntu default frame pointer, Tetragon policy syntax, Pixie TLS, overhead·storage 추산은 공식 프로젝트/배포판 문서 및 실행이 필요. factcheck는 이 pass에서 새로 검증하지 않음.

## 7. `part6-01-case-isr-latency.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part6-01-case-isr-latency.md`, 읽은 구간 1–210 전체.
- A–G: A(18–29,31–99,101–169,171–199) 실제 사례 서사와 before/after 표가 중심. B(18–199) 증상→가설→수정→검증 흐름. C(21,31–99,101–169,173–180) 보드·수치와 절차 제시하나 출처/재현 방법/수치 신뢰성 확인 필요. E(2,5,18–199) ISR latency 제목 약속과 사례 일치. F(201–204) next 안내 없음, related 확인. G(1–210) 출처 링크 없음.
- D: irqsoff 63–72 ↔ `part5-03-ftrace.md` 103–125; affinity 145–146 ↔ `part3-06-interrupt-storm.md` 144–149; top/bottom half 149–160 ↔ `part3-05-interrupt-latency.md` 79–90. 사례라는 차별점은 존재.
- F: 본문에 다음 편 문장이 없음(실제 order50→51은 `part6-02-case-cache-thrashing.md`, 201행 link로만 나타남). 201–203 관련 6-02/5-03/3-05 링크 실제 대상·라벨 확인. 204행 “Practical RTOS Internals 2-08”은 링크 없는 명칭이며 실제 slug는 `part2-08-tick-timer.md`.
- 내부 후보: 30·179행 miss/event 양과 P999를 같이 볼 때 10kHz×1h×0.12%=43,200 events; “dozens/hour” 표현과 불일치. P999=240µs와 100µs 초과 비율 주장은 표본 수/percentile 정의 확인 필요. perf/IRQ event 의미와 실제 benchmark log는 1차 자료/실행 질문.

## 8. `part6-02-case-cache-thrashing.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part6-02-case-cache-thrashing.md`, 읽은 구간 1–207 전체.
- A–G: A(18–89,91–180) matrix-multiply 진단과 반례가 있어 사례 고유성 있음. B(18–197) 원인·수정·after 서사 있으나 핵심 roofline 공식/병렬화 조건 점검 필요. C(21,31–84,134–179) HW·명령·수치/결과 있음, compiler/toolchain/원시환경 정보 부족. E(2,5,18–89,181–197) 제목의 10x/cache miss 질문은 전개되나 이론값 기준 검증 필요. F(200–203) next 안내 없음, 링크 점검. G(1–207) 외부 출처 없음.
- D: tiling 31–43·134–152 ↔ `part2-06-cache-miss.md` 165–185; OI/blocked matmul model ↔ `part1-07-modeling.md` 81–92 및 본문 189·192. Recipes `part8-08-neon.md` 42행 4×4 NEON kernel은 주제상 인접하지만 역할 다름. 각 양쪽 범위 확인.
- F: 다음 글 문장 없음. series order52 후속은 공개 `part6-03-case-lock-contention.md`, 200–203행 related 6-01/6-03/2-06/5-01 실제 대상과 라벨 확인.
- 내부 후보: 23행 `2.1 GFLOPS × 1.8 GHz × 4 cores ≈15 GFLOPS`는 단위/중복 클럭 인자 의심(산술과 단일-thread 측정 조건이 본문 134–179행에 병존). 코드/실측이 단일 또는 멀티스레드인지 확정 전 오류 범위 좁히기 필요. AArch64/AArch32 옵션(52,56), intrinsic 형/선언(63,165) 등은 compiler 실행/공식 ISA docs 필요; 오류 확정하지 않음.

## 9. `part6-03-case-lock-contention.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part6-03-case-lock-contention.md`, 읽은 구간 1–223 전체.
- A–G: A(18–55,57–118,120–193) 가설 검증과 per-CPU 대안 사례 중심. B(18–210) 추적 흐름 완결, CPU busy 해석 충돌 후보를 포함. C(21,38–94,124–193) HW·명령·출력·before/after 제시하나 event 해석/source 및 기존 수치 provenance 확인 필요. E(2,5,18–29,97–118,184–210) 제목 throughput 질문에 대답하나 description의 cache invalidation 근거는 얇음. F(214–218) next 안내 없음, related 실제 링크 점검. G(1–223) 출처 없음.
- D: perf lock 42–55 ↔ `part4-03-lock-contention.md` 61–69·204; per-CPU 124–150 ↔ `part4-02-false-sharing.md` 118–133·222–223; USL 112–118 ↔ `part1-07-modeling.md` 114–123 및 `part4-10-smp-analysis.md` 205–213. 같은 개념을 직접 비교했고 사례 데이터 탐색 역할은 차이.
- F: 다음 편 문장 없음. 214–218 related 6-02/6-04/4-03/4-02/5-01 링크 대상과 라벨 확인.
- 내부 후보: 51행 memory-bandwidth stall이면 CPU 100% busy로 보였어야 한다는 설명과 205행 memory-bound면 보통 idle로 잡힌다는 설명이 서로 반대. Linux accounting/benchmark가 필요해 어느 주장이 맞는지는 확정 못함. perf lock이 userspace pthread mutex를 포착하는지, A72 perf c2c 지원, per-CPU 코드 race 및 측정 provenance는 공식 perf docs/target 실행 질문.

## 10. `part6-04-case-dma-tuning.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part6-04-case-dma-tuning.md`, 읽은 구간 1–246 전체.
- A–G: A(16–124,126–204,210–230) DMA 진단 사례·3단계 처리가 독립적인 서사. B(16–232) 증상부터 결과까지 갖췄으나 산술과 API/SoC 설명 후보가 결론을 좌우. C(37–97,132–175,210–215) 명령/덤프/표가 있으나 기기·kernel·sensor·컨트롤러 출처 미기재. E(2,5,16–29,103–124,210–217) 1080p60→30fps 제목을 따르나 throughput 계산 확인 필요. F(234–242) 틀린 다음 시리즈 문구와 related link 실대상 확인. G(1–246) 지정 데이터시트/primary reference 없음.
- D: burst/SG/chain/double-buffer 130–204 ↔ `part3-03-dma-performance.md` 27–41·63이후·93이후·105이후; AXI transfer 114 ↔ Recipes `part11-04-axi.md` 96; INCR16=128B 108 ↔ `part3-01-bus-architecture.md` 203. Linux 사례 적용과 개념 설명 역할을 구별. Recipes는 comparator 허용.
- F: 234행 “6장 완료, 다음 7장 advanced”는 공개 목록과 불일치: order54 `part3-12-cxl-mem-latency.md`, 같은 장 order56 `part6-05-case-cxl-llm-kv-cache.md`; 238–242행 related 대상/labels 확인.
- 내부 후보: 80행 98% busy 및 124MB/s vs 92–96·108–111의 128B/40ns, 50%=3.2GB/s 모델이 크게 안 맞고 109행 1GHz와 110행 계산상 800MHz도 어긋남. 대상 SoC/controller 문서와 원시 측정 필요; 내부 계산 충돌 후보를 Sol이 확정. 미확인: 80행 DDR3 채널 폭, `snps,*` binding 적용 대상, dmaengine maxburst/API, AXI/DDR row overhead, 사례 수치 provenance는 datasheet/kernel docs/실행 확인.

## 범위
- D의 Modern Embedded Recipes 원문은 재채점 대상에서 제외되지만 루브릭 D의 다른 시리즈 비교대상으로 사용 가능하며, 이번 관련 비교는 그 원문 구간도 확인했다.
- primary-source web/document checks 및 target 실행은 수행하지 않았다. 기술적 의심은 모두 확인 질문으로 남겼다. 사용자 미커밋 파일과 본문은 수정하지 않았고 evidence-22만 생성.
