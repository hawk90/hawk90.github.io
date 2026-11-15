# Driver-RTL Co-simulation 8편 수정 근거

작업일: 2026-10-22 · 대상: 공개된 Driver-RTL Co-simulation Ch 1–8 · 재채점: 하지 않음

점수 원장 `published-loop-01`~`published-loop-41`, `published-scores.*`, `published-summary.md`는 수정하지 않았다. chapter 1–4에는 이 연속 작업을 시작하기 전의 수정이 이미 있어 보존했다. JSON `beforeSha256`은 비교 가능한 저장소 기준인 `sourceHead`의 원본 해시이며, 이어받은 workspace 수정 전 해시를 뜻하지 않는다. `slug`, `date`, `series`, `seriesOrder`, `draft`는 모두 원본과 대조해 유지했다. 제목·description은 이번 이어받기에서 바꾸지 않았다.

## Ch 1 — 왜 pre-silicon driver 검증인가

1. **맥락과 범위:** 방법 비교, 조기 검증 비용 주장, cosim의 구성과 도입 판단을 다루는 도입 장이다.
2. **신호와 반증 조건:** 비용 배수·업계 채택·시뮬레이션 속도를 출처 없이 일반화하고 Linux driver가 RTL과 자동으로 직접 결합된다고 읽힐 수 있었다. 제품별 1차 측정이나 단일 프로세스가 보편 계약이라는 근거가 있으면 일반화가 가능하지만 이 글에는 없었다.
3. **원인과 대안:** 추상 모델의 검증 범위와 실행 결과를 구분하지 않은 설명 구조가 원인이다. 수치 주장을 완곡하게 남기기보다 실패 주입과 관찰 가능한 증거로 경계를 설명했다.
4. **증거:** 본문 전반을 읽고 MMIO·IRQ·DMA·reference 실패 표로 바꿨다. Verilator host 연결과 cocotb scheduling 문서를 대조했다. `scripts/verify-driver-cosim-examples.mjs`의 정적 계약 검사가 통과했다.
5. **표본 범위:** 도입 장과 같은 시리즈 Ch 2·3·8의 연결 설명을 표본으로 확인했다. 제품 현장·비용 자료는 이번에 조사하거나 측정하지 않았다.
6. **결정:** 근거가 없는 비용·업계·속도 문장을 제거하고 모델별 책임과 미검증 범위를 기록했다.
7. **최소 변경과 롤백:** Ch 1 본문만 수정했고 public URL·frontmatter·series metadata는 보존했다. 해당 파일 diff를 원본으로 되돌리면 롤백된다.
8. **검증과 잔여 위험:** 정적 계약 및 frontmatter 비교 통과. RTL, Linux, board 실행과 비용 측정은 하지 않았으며 이를 제품 결과로 일반화할 수 없다.

## Ch 2 — SystemVerilog DPI-C

1. **맥락과 범위:** packed vector와 open array의 C 경계, MMIO/DMA data 전달을 설명한다.
2. **신호와 반증 조건:** `N/32`는 32의 배수가 아닌 packed width에서 word 수를 누락한다. host endian에 의존하는 `memcpy`도 wire byte order를 고정하지 않는다. 모든 지원 width가 우연히 32의 배수이고 endian이 명시적으로 고정된 ABI라면 기존 코드는 그 범위에서만 성립한다.
3. **원인과 대안:** 배열 원소 수와 byte 순서를 같은 것으로 취급했다. `ceil(N/32)` 표기, little-endian byte 추출, 길이·NULL 검사를 추가했다.
4. **증거:** 256-bit packed 예제의 C helper와 부정 길이·NULL 검사 fixture를 Clang으로 컴파일하고 실행했다. 정확한 반례는 `len=33`, `len=-1`, NULL word/output이며 fixture가 실패 반환을 확인했다.
5. **표본 범위:** 256-bit/8-word 예제와 양 끝 범위, 잘못된 인자를 확인했다. 실제 simulator가 생성한 `svdpi.h` ABI는 검사하지 않았다.
6. **결정:** 검증 가능한 byte 변환만 native 검사 대상으로 삼고 DPI simulator callback은 별도 검증으로 남겼다.
7. **최소 변경과 롤백:** Ch 2의 설명·helper·fixture와 공통 verifier만 대상이다. URL과 frontmatter는 유지했다.
8. **검증과 잔여 위험:** `node scripts/verify-driver-cosim-examples.mjs`에서 byte order와 bounds fixture 통과. DPI open-array handle과 실제 simulator 생성 header의 적합성은 검증 대기다.

## Ch 3 — Verilator

1. **맥락과 범위:** counter top, C++ harness, timing과 FST dump 설명을 다룬다.
2. **신호와 반증 조건:** clock phase만 토글하는 짧은 조각을 완전한 cosim 표준 loop처럼 설명하면 `--timing` event queue와 시간을 누락한다. 순수 synchronous RTL을 전제로 하는 최소 harness라면 해당 phase 조각은 제한적으로 쓸 수 있다.
3. **원인과 대안:** synchronous 평가와 timing-enabled scheduling을 구분하지 않았다. phase 조각을 독립 실행 loop가 아니라고 명시하고 `eventsPending()`/`nextTimeSlot()` 처리가 필요한 범위를 분리했다. VCD/FST 크기·호환성도 절대 표현을 낮췄다.
4. **증거:** 본문의 동일 top, 100-cycle expected count, `--trace-fst`, open/dump/close 흐름과 공식 Verilator 5.052 manual을 대조했다. 공식 manual은 timing model에서 `eventsPending()` 및 `nextTimeSlot()` 사용을 요구한다.
5. **표본 범위:** counter 예제와 별도 DPI 조각, CI 예제의 top 이름을 확인했다. Verilator executable이 없어 generated C++·count=100·FST 파일은 실행하지 않았다.
6. **결정:** 제한된 코드 조각의 가정을 본문에서 명시하고, timing loop 전체가 검증된 듯한 설명을 제거했다.
7. **최소 변경과 롤백:** Ch 3 설명과 loop 경계만 수정. `slug`, 날짜, 순서, draft 상태는 유지했다.
8. **검증과 잔여 위험:** 정적 계약 검사 통과. Verilator compile/run과 파형 viewer 검사는 미실행이다.

## Ch 4 — cocotb

1. **맥락과 범위:** cocotb API, clock/reset 예제, ctypes callback과 pytest runner 결합을 다룬다.
2. **신호와 반증 조건:** edge trigger 이후 HDL 반응이 끝난 것처럼 읽고, 동기 C callback에서 coroutine을 await할 수 있는 것처럼 연결하면 scheduler가 멈출 수 있다. simulator phase를 고려한 별도 bridge가 구현돼 있다면 그 구체 API 범위에서만 통합할 수 있다.
3. **원인과 대안:** cocotb 1.x/2.x API와 host 호출·simulator scheduling을 하나의 동기 경계로 설명했다. 글은 2.0 API를 고정하고 `ReadOnly`를 현재 timestep 끝의 관찰 phase로 설명하며 callback fixture와 RTL simulation을 분리했다.
4. **증거:** cocotb 2.0.0 timing model·library reference 문서와 callback C ABI fixture를 대조했다. Verilator도 edge trigger에서 하위 HDL evaluation이 아직 반영되지 않을 수 있다고 설명한다.
5. **표본 범위:** callback 미등록, high-bit `uint32`, 범위 밖 주소, callback 수명 해제를 실행했다. cocotb scheduler 자체나 simulator runner는 실행할 수 없었다.
6. **결정:** 확인 가능한 host callback만 검증하고, simulator-owned coroutine/queue 또는 공식 bridge가 없는 통합은 예시로 단정하지 않는다.
7. **최소 변경과 롤백:** Ch 4 API와 callback/runner 설명 및 작은 host fixture가 범위다. 공개 경로·series metadata는 보존했다.
8. **검증과 잔여 위험:** Python 3.15에서 fixture 실행 통과. cocotb 2.0 설치·RTL simulation·AXI BFM·coverage·runner 실행은 검증 대기다.

## Ch 5 — SystemC TLM

1. **맥락과 범위:** TLM 2.0 loosely-timed modeling과 `b_transport` delay 계약을 설명한다.
2. **신호와 반증 조건:** annotation을 늘린 뒤 `wait`까지 하라고 권하면 같은 지연을 두 번 계산할 수 있다. target이 `wait`로 일부 시간을 소비하고 annotation을 그에 맞게 조정하는 명시적 정책은 가능하지만 중복 지연을 강제할 수 없다.
3. **원인과 대안:** annotated local time과 kernel simulation time을 같은 개념으로 취급했다. 가능한 정책을 분리하고 이번 예제는 annotation-only LT target으로 제한했다.
4. **증거:** Accellera OSCI TLM 2.0 LRM §8.2.7(b–f). LRM은 `b_transport`가 annotation을 늘릴 수 있고 `wait`를 호출한 경우 이미 소비한 양 이내에서 감소시킬 수 있다고 규정한다.
5. **표본 범위:** `b_transport`의 target 예제와 흔한 함정, 전체 LT/AT 설명을 확인했다. SystemC compiler/kernel이 없어 scheduler 실행은 없다.
6. **결정:** “delay 증가 후 wait 필수” 처분을 수정하고 target/initiator의 시간 소비 계약을 명시했다.
7. **최소 변경과 롤백:** Ch 5 시간 모델 문장과 한 예제만 수정. public metadata는 유지했다.
8. **검증과 잔여 위험:** LRM 대조와 정적 문자열 검사는 통과. 실제 SystemC 실행, LT quantum keeper와 AT phase 구현은 검증 대기다.

## Ch 6 — Bus Functional Model

1. **맥락과 범위:** AXI-Lite master BFM의 write/read handshake와 C driver shim 예제다.
2. **신호와 반증 조건:** AW와 W를 한 handshake로 기다리면 한 channel만 먼저 수락되는 경우 완료된 channel 정보를 잃거나 같은 cycle을 요구한다. slave가 항상 AWREADY/WREADY를 동시에 올리는 제한된 mock에서는 재현되지 않지만 AXI 채널 계약의 일반 예제는 될 수 없다.
3. **원인과 대안:** 독립 채널의 handshake 상태를 함께 묶었다. `aw_done`/`w_done`를 따로 기억하고 read/write 응답에 timeout을 넣었다. exported task는 SV context에서 호출해야 하며 일반 C thread에 열린 함수가 아니라는 조건도 추가했다. RAM 스케치가 burst ID·범위·WSTRB·동시 outstanding을 처리하지 않는다고 제한을 적었다.
4. **증거:** Arm AMBA AXI IHI0022H §A1.2.1 및 §A3.3.1의 독립 채널/handshake 규칙을 기준으로 반례를 확인했다. 코드는 AW·W 각각의 `VALID && READY` 결과를 별도 저장한다.
5. **표본 범위:** AW 먼저, W 먼저, 같은 cycle 수락의 제어 흐름과 32-bit unsigned address/data ABI를 검토했다. SVA simulator와 실제 protocol checker는 실행되지 않았다.
6. **결정:** 동시에 READY가 올라오는 경우를 전제한 코드를 독립 완료 상태·timeout이 있는 예로 교체하고 범용 AXI RAM이라는 설명을 철회했다.
7. **최소 변경과 롤백:** Ch 6 BFM 설명, master task, 단순 RAM 범위, host shim 비교표만 수정했다. URL/frontmatter를 지킨다.
8. **검증과 잔여 위험:** 코드 구조의 정적 검사는 통과. Verilog/SystemVerilog simulator가 없어 task compile·channel skew test는 미실행이다. 이 예는 full AXI4 master/RAM이 아니다.

## Ch 7 — UVM C reference model

1. **맥락과 범위:** C matrix multiply reference를 DPI open array로 UVM scoreboard에 연결하고 driver fallback과 공유한다.
2. **신호와 반증 조건:** DPI open array를 C raw pointer로 직접 받는 선언은 ABI가 맞지 않고 `int32_t` 누적 overflow는 정의되지 않은 signed overflow가 될 수 있다. 고정 배열 ABI adapter나 검증된 simulator 연속 storage라는 명시 계약이 있을 때만 직접 buffer 사용이 가능하다.
3. **원인과 대안:** high-level SV array와 low-level C core를 동일 함수 서명으로 취급하고 accumulator 범위를 제한하지 않았다. `svOpenArrayHandle` adapter 책임, dimension `size_t` 검증, `int64_t` 누적 후 `INT32` 범위 실패를 명시했다.
4. **증거:** AMD Vivado UG900의 DPI open-array 문서는 C side를 `SVOpenArrayHandle`로 표현한다. native fixture는 2×2 golden output과 32-bit accumulator 초과, invalid dimension을 검사했다.
5. **표본 범위:** 작고 비대칭인 matrix와 overflow/잘못된 dimension을 검사했다. simulator-specific open-array layout 및 UVM scoreboard 연결은 실행되지 않았다.
6. **결정:** 공유 reference를 single truth의 증거로 취급하지 않고 independent golden vector를 두며 ABI adapter를 경계로 만든다.
7. **최소 변경과 롤백:** Ch 7 core signature/경계 설명, overflow helper, reference sharing 표현만 수정. 공개 URL 및 series metadata는 유지했다.
8. **검증과 잔여 위험:** Clang native C fixture 통과. DPI wrapper 구현 자체, simulator ABI, UVM execution과 독립적인 production golden data는 후속 검증 필요.

## Ch 8 — End-to-End 통합

1. **맥락과 범위:** IRQ 연결, driver MMIO shim, Python 시나리오 wrapper와 처리량 설명을 다룬다.
2. **신호와 반증 조건:** `cur && !prev`만 검사하면 이미 high인 IRQ bit가 있는 동안 다른 bit가 새로 올라온 것을 놓친다. `ctypes.CDLL`은 공유 라이브러리를 불러오므로 일반 executable 경로를 라이브러리처럼 건네는 예는 동작 계약이 아니다. 특정 build가 실제 shared object와 export API를 만든다면 그 경로는 성립한다.
3. **원인과 대안:** edge를 전체 IRQ bus 한 신호로 취급하고 Verilator executable을 Python FFI 대상으로 간주했다. `current & ~previous` bit mask로 newly pending IRQ를 계산하고 shared library 또는 IPC/cocotb 경로를 구분했다. 재현 불가 성능 수치는 측정 조건 표로 바꿨다.
4. **증거:** 신규 IRQ bit C++ fixture는 `0x01 → 0x03`에서 bit 1만 반환하고 unchanged/신규 단일 bit도 확인했다. Python 표준 `ctypes` 문서는 `CDLL`을 loaded shared library로 정의한다.
5. **표본 범위:** 여러 IRQ bit의 상승, 유지, 단일 상승을 확인했다. simulator thread와 driver callback 통합, shared library link/export 및 pytest runner는 실행하지 않았다.
6. **결정:** 동시 IRQ 누락과 binary/library 혼동을 수정하고 실행시간 숫자를 벤치마크 조건 없이 확정하지 않는다.
7. **최소 변경과 롤백:** Ch 8 IRQ, Python loader, performance table, host shim 설명을 수정했다. 공개 경로와 series metadata는 보존했다.
8. **검증과 잔여 위험:** native IRQ mask fixture 및 정적 계약 검사 통과. 실제 Verilator/RTL/driver 통합과 30분 stress 측정은 하지 않았다.

## 검증 기록과 1차 자료

- `node scripts/verify-driver-cosim-examples.mjs` — native helper/FFI 및 각 장 static contract 검사. 상세 출력: [driver-cosim-examples.txt](driver-cosim-examples.txt)
- [Verilator 5.052 timing language support](https://verilator.org/guide/latest/languages.html), [Verilated model timing loop](https://verilator.org/guide/latest/connecting.html)
- [SystemVerilog DPI open arrays](https://docs.amd.com/r/2024.1-English/ug900-vivado-logic-simulation/Open-Arrays-in-DPI)
- [cocotb 2.0 timing model](https://docs.cocotb.org/en/v2.0.0/timing_model.html), [Clock/Event library reference](https://docs.cocotb.org/en/v2.0.0/library_reference.html)
- [OSCI TLM 2.0 LRM](https://www.accellera.org/images/downloads/standards/systemc/TLM_2_0_LRM.pdf)
- [Arm AMBA AXI IHI0022H](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/IHI0022H_amba_axi_protocol_spec.pdf)
- [Python ctypes shared-library loading](https://docs.python.org/3/library/ctypes.html)

실제 Verilator, Icarus, SystemC, cocotb simulator는 이 환경에서 실행하지 않았다. 따라서 simulator-dependent 항목은 `SKIPPED`가 아니라 **검증 대기**로 남긴다. 전체 사이트 build는 상위 작업에서 수행한다. 최종 장별 publish gate, inline math 검사 및 diff check 결과는 최종 공통 검증 기록에 이어 쓴다.

## 최종 장별 검사

- `./scripts/audit-publish-gate.sh <chapter.md>`를 Ch 1–8 각각 실행했다. 각 장에서 차단 gate(ASCII, 코드블록, tone, known falsehood, 내부 링크, 시리즈 무결성)는 통과했다. 전체 gate가 출력한 publish OK는 실행한 차단 항목에 한정한다.
- 각 실행에서 upstream freshness는 저장소의 네 unrelated upstream clone 부재를 표시했고 cited-symbol 검사도 `SKIPPED`로 나왔다. 이를 통과로 계산하지 않았다.
- `node scripts/check-inline-math.mjs <8 chapter paths>` — 8편에서 의도하지 않은 inline math 없음.
- Ch 1–8에 `git diff --check` 실행, 추가한 script/report/log에는 trailing whitespace 검색 실행. 발견 없음.
- 점수 원장 재채점은 실행하지 않았다. 전체 site build는 상위 작업에서 수행한다.
