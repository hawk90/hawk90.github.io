# Math Unicode audit

- Markdown files scanned: 3387
- Math blocks containing non-ASCII Unicode: 44

> This report is diagnostic only. Do not remove Korean labels, arrows, or symbols from equations without semantic review.

| File | Line | Sample |
| --- | ---: | --- |
| src/content/blog/embedded/aerospace-standards/do-178c/chapter11-tool-qualification-do330.md | 318 | $) · 또는 Green Hills MULTI (qualified C compiler,  |
| src/content/blog/embedded/avionics/digital-avionics-handbook/chapter11-rtos.md | 236 | $ \| F-22·B787 \| \| PikeOS \| DO-178C A \| Yes \|  |
| src/content/blog/embedded/performance-engineering/part2-10-pmu.md | 52 | \text{IPC} = \frac{\text{INST\_RETIRED}}{\text{CPU\_CYCLES}} \quad (\text{높을수록 좋음, target } 1+) |
| src/content/blog/embedded/performance-engineering/part2-10-pmu.md | 54 | \text{MPKI} = \frac{\text{L1D\_CACHE\_REFILL} \times 1000}{\text{INST\_RETIRED}} \quad (\text{낮을수록 좋음}) |
| src/content/blog/embedded/performance-engineering/part3-04-dma-vs-cpu.md | 46 | \text{CPU cost} = \frac{N}{3} \text{ cycle}, \quad \text{DMA cost} = 200 + N \text{ cycle (bus 한계)} |
| src/content/blog/embedded/performance-engineering/part3-09-power-vs-performance.md | 22 | P_{\text{static}} = \text{leakage} \quad (V \cdot \text{온도에 비례}) |
| src/content/blog/embedded/protocols/can-bus/chapter12-debugging.md | 20 | $ ($5-50k) \| OEM 표준, *시뮬레이션·CI* \| \| \| **PEAK PCAN-Explorer 6** \|  |
| src/content/blog/embedded/protocols/industrial-ethernet/chapter12-comparison.md | 31 | $ (IRT switch) \| $ (표준 PC) \| $ (표준 NIC) \|  |
| src/content/blog/embedded/protocols/mipi/chapter12-debugging.md | 18 | $) \| 도구 \| 가격 \| 특징 \| \| --- \| --- \| --- \| \| **Keysight U4421A** \| $40k+ \| 산업 표준, CSI/DSI 디코드 \| \| **Lecroy Maui** \| $50k+ \| 오실로 + protocol decoder \| \| **Crescent H |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/01-vector-space.md | 121 |  0\alpha = (0+0)\alpha \quad \text{← 체에서 } 0+0=0  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/01-vector-space.md | 122 |  \quad\,\, = 0\alpha + 0\alpha \quad \text{← (V8) 분배}  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/01-vector-space.md | 128 |  c \cdot 0_V = c(0_V + 0_V) = c\cdot 0_V + c\cdot 0_V \quad \text{← (V7) 분배}  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/01-vector-space.md | 132 |  \alpha + (-1)\alpha = 1\cdot\alpha + (-1)\alpha \quad \text{← (V5) }  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/01-vector-space.md | 133 |  \quad\,\, = (1 + (-1))\alpha = 0\cdot\alpha \quad \text{← (V8)}  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/01-vector-space.md | 134 |  \quad\,\, = 0_V \quad \text{← (1)에서 방금 얻음.}  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/01-vector-space.md | 138 |  \alpha = 1 \cdot \alpha = (c^{-1}c)\alpha = c^{-1}(c\alpha) = c^{-1} \cdot 0_V = 0_V \quad \text{← (V5), (V6), (2)}.  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/03-span.md | 86 |  \operatorname{span}(S) = \bigcap \{W : W \text{는 부분공간},\ S \subseteq W\}.  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/07-direct-sum.md | 76 |  \{\gamma_1, \dots, \gamma_p,\ \alpha_1, \dots, \alpha_q\} \quad (U \text{의 기저(basis)})  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/07-direct-sum.md | 78 |  \{\gamma_1, \dots, \gamma_p,\ \beta_1, \dots, \beta_r\} \quad (W \text{의 기저(basis)})  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/07-direct-sum.md | 82 |  \mathcal{C} := \{\gamma_1, \dots, \gamma_p,\ \alpha_1, \dots, \alpha_q,\ \beta_1, \dots, \beta_r\} \quad (\text{원소 수 } p+q+r).  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/exercises.md | 154 |  \#\{W \subseteq V : W \text{는 부분공간}\} = \sum_{k=0}^{n} \binom{n}{k}_q  |
| src/content/blog/math/linear-algebra/ch01-vector-spaces/summary.md | 4 | " tags: ["Linear Algebra", "Mathematics", "Hoffman & Kunze"] series: "Linear Algebra" seriesOrder: 193 draft: true topics: ["math"] --- > **시험·복습 직전 1분 회상용.** 정 |
| src/content/blog/math/set-theory/ch01/02-construction.md | 75 | \|A\| < \|\mathcal{P}(A)\| \quad (\text{임의의 } A) |
| src/content/blog/math/set-theory/ch01/05-foundation.md | 72 | V_{\alpha+1} := \mathcal{P}(V_\alpha) \quad (\text{한 단계 위로}) |
| src/content/blog/math/set-theory/ch01/05-foundation.md | 73 | V_\lambda := \bigcup_{\beta < \lambda} V_\beta \quad (\lambda\ \text{는 극한 순서수}) |
| src/content/blog/math/set-theory/ch01/06-choice.md | 75 | \prod_{i\in I} A_i \neq \emptyset \quad (\text{모든 } A_i \neq \emptyset) |
| src/content/blog/media/av1/chapter00-digital-video.md | 192 | 1920 \times 1080 \times 3 = 6{,}220{,}800 \text{ 바이트} \approx 6 \text{ MB / 프레임} |
| src/content/blog/media/av1/chapter00-digital-video.md | 196 | \underbrace{1920 \times 1080}_{Y} + \underbrace{960 \times 540}_{Cb} + \underbrace{960 \times 540}_{Cr} \approx 3 \text{ MB / 프레임} |
| src/content/blog/media/av1/chapter00-digital-video.md | 200 | \text{4:4:4} \rightarrow 1 + 1 + 1 = 3 \quad (\text{채널}) |
| src/content/blog/media/av1/chapter00-digital-video.md | 202 | \text{4:2:0} \rightarrow 1 + 0.25 + 0.25 = 1.5 \quad (\text{채널}) \rightarrow \textbf{절반} |
| src/content/blog/media/av1/chapter00-digital-video.md | 247 |  \text{바이트/프레임} = W \times H \times 1.5 \quad (\text{4:2:0, 8-bit 기준})  |
| src/content/blog/media/av1/chapter00-digital-video.md | 251 |  \text{바이트/초} = \text{바이트/프레임} \times \text{fps}  |
| src/content/blog/media/av1/chapter00-digital-video.md | 301 |  \text{고정소수점 값} = \text{실수} \times 2^n \quad (\text{Q}n\text{ 포맷})  |
| src/content/blog/parallel/parallel-principles/ch01-introduction.md | 175 |  T_1 = 1 = \underbrace{(1-p)}_{\text{순차 부분}} + \underbrace{p}_{\text{병렬 부분}}  |
| src/content/blog/programming/design/clean-architecture/chapter14-component-coupling.md | 83 |  I = \frac{\text{밖으로 나가는 의존} (Ce)}{\text{전체 의존} (Ce + Ca)}  |
| src/content/blog/programming/design/clean-architecture/chapter14-component-coupling.md | 119 |  A = \frac{\text{추상 클래스/인터페이스 수} (Na)}{\text{전체 클래스 수} (Nc)}  |
| src/content/blog/tools/build/gnu-make/chapter02-rules.md | 186 | BASH_VERSION`이지?*: Make는 `$`를 자기 변수 시작으로 봅니다. 그래서 *셸 변수*를 표시하려면 `$`를 한 번 더 써서 ` |
| src/content/blog/tools/build/gnu-make/chapter02-rules.md | 186 | `를 만나면 `$` 한 글자로 줄여 셸에 넘기고, 셸이 그 `$BASH_VERSION`을 자기 변수로 해석합니다. 엄격 모드를 켜고 싶으면 `.SHELLFLAGS`를 함께 바꿉니다. `-e`는 첫 실패에서 중단, `-u`는 미정의 변수 사용 시 에러, `-o pipefail`은 파이프라 |
| src/content/blog/tools/build/gnu-make/chapter05-functions.md | 226 | `이 잔뜩 등장하는 이유는 *eval 안에서 두 번 확장*되기 때문입니다. 한 번은 `call`에서, 한 번은 `eval`에서. 두 번 모두 살리고 싶은 `$`은 ` |
| src/content/blog/tools/build/gnu-make/chapter05-functions.md | 230 | `은 `$`로 한 번 줄어듦. 2. 결과 문자열: ```makefile foo_OBJS := $(patsubst %.c,$(BUILDDIR)/%.o,$(foo_SRCS)) foo: $(foo_OBJS) $(CC) -o $@ $^ ``` 3. `$(eval ...)`이 이 텍스트를 *Ma |
| src/content/blog/tools/build/gnu-make/chapter07-practical.md | 192 | t`가 헷갈리기 쉽습니다. Make 변수는 `$(...)`, 셸 변수는 ` |
| src/content/blog/tools/debugging/embedded/chapter01-rsp-protocol.md | 159 | #00`)을 줍니다 — GDB는 *software BP로 대체*합니다. ### 7. 스레드 — `H` / `T` / `qfThreadInfo` \| 요청 → 응답 \| 동작 \| \|-------------\|------\| \| `$Hg0 → $OK` \| 다음 `g` 명령을 위한 thread co |
| src/content/blog/tools/debugging/embedded/chapter08-cxl-link-debug.md | 52 | $ \| PCIe 4.0/5.0, retimer 디버깅 \| \| Keysight U4154A \| Keysight \|  |
| src/content/blog/tools/debugging/embedded/chapter08-cxl-link-debug.md | 53 | $ \| 고급 multi-link 동시 캡처 \| \| 가짜 device on FPGA \| self-built \|  |

