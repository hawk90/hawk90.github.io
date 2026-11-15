# 공개 글 AdSense 평가 — 루프 03

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-03.md) · [재검토 기록](double-check-loop-03.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일: 2026-10-18. 원문 기준 HEAD `d55f8d66`. `rubric.md` v1.2, AP-C-24, `anchors.md`의 역사적 기준 커밋 `10550ca1`을 적용했다. 대상은 `src/content/blog/embedded/bootloader/` chapter21~30 공개10편이다. 원문 전체를 다시 읽고 아래 D 대응 구간·다음 편·관련 링크를 대조했다. 원문·기존 보고서·사용자 미커밋 파일은 수정하지 않았다. 현재 UART 앵커는 보강되어 옛49점 내용과 다르므로 역사적 원문과 현재 원문을 섞지 않았다.

P0: 원문 검토에서 확인 없음. 전편 `score_status: 잠정`, `confidence: 중간`; 기술적 전체 주장 검증 완료는 아니다. 원문 내용·주소 산술·대상 존재는 OBS, 항목별 재량 채점은 INF다. C는 출처·환경 없는 수치 때문에8 이하, 열린 정확성 의심에 B는13 이하를 적용했다. D는 실제 비교 구간을 적었고 제목 키워드만으로 중복을 판정하지 않았다. 렌더·모바일·build·광고·정책 검사 명령은 본 작업자가 실행하지 않았다. 공통 검사는 부모 보고서 `double-check-gates-2026-10-18.md`를 참조한다.

## 재평가 표

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter21-board-porting.md` | 11 | 10 | 7 | 6 | 6 | 4 | 2 | **46** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter22-debugging.md` | 13 | 11 | 7 | 10 | 6 | 4 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter23-bootrom-efuse-otp.md` | 14 | 13 | 7 | 10 | 8 | 5 | 2 | **59** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter24-spl-deep.md` | 13 | 11 | 6 | 9 | 5 | 4 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter25-tfa-optee.md` | 14 | 12 | 8 | 9 | 8 | 5 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter26-ddr-training.md` | 14 | 12 | 7 | 9 | 7 | 5 | 2 | **56** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter27-chain-of-trust.md` | 16 | 12 | 8 | 10 | 8 | 5 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter28-flash-layout.md` | 15 | 13 | 7 | 9 | 8 | 5 | 2 | **59** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter29-distro-boot.md` | 14 | 13 | 7 | 10 | 8 | 4 | 2 | **58** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter30-bootloader-ci.md` | 16 | 12 | 7 | 12 | 8 | 4 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

| 파일 | 이전 총점 | 새 총점 | 차이 | 이전 판정 | 새 판정 |
| --- | ---: | ---: | ---: | --- | --- |
| `chapter21-board-porting.md` | 46 | 46 | 0 | 병합 검토 | 병합 검토 |
| `chapter22-debugging.md` | 50 | 52 | +2 | 우선 조치 | 우선 조치 |
| `chapter23-bootrom-efuse-otp.md` | 58 | 59 | +1 | 우선 조치 | 우선 조치 |
| `chapter24-spl-deep.md` | 48 | 50 | +2 | 우선 조치 | 우선 조치 |
| `chapter25-tfa-optee.md` | 56 | 58 | +2 | 우선 조치 | 우선 조치 |
| `chapter26-ddr-training.md` | 54 | 56 | +2 | 우선 조치 | 우선 조치 |
| `chapter27-chain-of-trust.md` | 58 | 61 | +3 | 우선 조치 | 우선 조치 |
| `chapter28-flash-layout.md` | 56 | 59 | +3 | 우선 조치 | 우선 조치 |
| `chapter29-distro-boot.md` | 54 | 58 | +4 | 병합 검토 | 병합 검토 |
| `chapter30-bootloader-ci.md` | 58 | 61 | +3 | 우선 조치 | 우선 조치 |

합계 560점, 평균 56점. 기존548점 대비 +12. 우선 조치8편·병합 검토2편이며 판정 변경은 없다. ch21은 전항목 동의, 나머지 변경은 아래 근거에 적었다.

## 오류 게이트 재검토

- ch22 DRAM 범위와 relocation 설명, ch23 같은 주소 ROM/OCRAM, ch24 TEXT/BSS 배치 전제, ch25 192KiB 구간에 약256KB, ch26 LPDDR4 DQS 방식, ch27 rollback 부호, ch28 동일 eraseblock 크기 산술, ch30 QEMU 검증 범위는 기존 오류 확인의 핵심을 유지했다. 외부 언어/API 의미만으로 추정한 결함은 uncertainties에 남겼다.
- 철회한 보조 근거: ch22 GDB 함수 주소4바이트 차만으로 함수 배치 불가라는 주장, ch24 완곡 본문과 단정적인 정리의 Falcon 시간 차, ch25 약32MB/31MiB 근사 차를 별도 오류로 센 부분, ch28 BBT page 번호만으로 장치 용량을 확정한 부분. 각각 핵심 모순과 다른 독립 근거를 구분했다.
- ch23 기존 B14는 열린 정확성 uncertainties가 있으므로 AP-C-24 B≤13 위반이다.13으로 수정했다. ch23 L292 후행 링크 설명은 실제 원문에 존재한다. 중간 검토에서 이를 놓치고 인용 오류라고 한 판단은 철회했으며 F5를 유지했다. 링크 라벨 안과 링크 뒤 설명을 함께 읽어야 한다.
- ch30 L187~188 size 출력 decimal/hex 불일치를 추가 확인했다.828456=0xca428(원문ca4e8),92224=0x16840(원문168c0). 원문 값의 재계산이며 API 지식을 전제로 하지 않는다.

공식 자료 확인: [U-Boot v2024.04 QEMU ARM](https://docs.u-boot.org/en/v2024.04/board/emulation/qemu-arm.html#running-u-boot)의 AArch64 최소 실행 예는 U-Boot binary를 직접 `-bios`로 실행한다. ch30 L32 TF-A 필수 일반화는 QEMU 예외를 포함하지 못한다. OP-TEE는 원문에서도 '옵션'이므로 OP-TEE가 반드시 필요하다는 오류로 확대하지 않았다. 이 한 주장 대조가 글 전체의 검증됨을 뜻하지 않는다. TF-A v2.10 소스 URL 열기는 도구 접근 실패로 종료했으며 실패를404나 기술 오류 근거로 쓰지 않았다.

## 글별 근거

D의 bsp/·buildroot/·embedded-security/·chNN 축약 경로는 src/content/blog/embedded/ 및 bootloader/chapterNN-*.md를 뜻한다. 같은 시리즈 인접 글은 원문을 읽었으며 다른 시리즈는 명시한 비교 구간을 직접 대조했다. 내부 링크76개를 slug→파일로 해석하여 모두 존재·공개를 확인했고 제목·후행 설명·관련 본문을 별도 비교했다. 존재한다고 설명까지 맞는 것으로 처리하지 않았다. 외부 링크 전체의 현재 HTTP 상태는 검사하지 않았다.

### `chapter21-board-porting.md`

source_file: `src/content/blog/embedded/bootloader/chapter21-board-porting.md`

- score_status: 잠정; score: 46; confidence: 중간; factcheck: 미검증.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 검증되지 않은 기술 주장에 대한 1차 자료 확인이 필요하다.
- uncertainties: L143~149 Kbuild 포함 범위는 언어·빌드 의미를 대조해야 하므로 오류 확정하지 않음. L155·196 common.h와2026.04 호환, L303 bootph 범위, L317 flash offset 미검증.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 11 | L71·97~147·282~303 bootph·Kconfig가 고유하나 복사·초기화 일반론이 대부분. 기존11 동의. |
| B | 10 | L43~69의1·4·5·6번 항목이 제목만 있고 L63 헤더 예가 없다. L149 의심이 열려 B≤13, 기존10 동의. |
| C | 7 | L309~318 빌드/굽기·L330~342 예시 로그. 태그·호스트 없음, L333·338 구체 수치 출처 없음 C≤8. 기존7 동의. |
| D | 6 | L73~95·203~227·322~344 ↔ bsp/chapter06-u-boot-porting.md L99~142·234~264·270~364. 같은 reference 복사·첫 출력 질문의 중복이 커6 유지. 인접 ch22 L234~242와 L344 의심 매핑도 겹침. |
| E | 6 | L2·5 configs/board/dts/MAINTAINERS 약속을 L73~366이 구현. 단일 i.MX 예에 한정되고 실전 재현성 부족, 기존6 동의. |
| F | 4 | L392 다음 내용은 ch22(order22·공개)와 맞지만 '시리즈 마지막'은 ch23~37 공개와 안 맞음. L398 BSP Ch6 라벨의 실제 대상은 bsp/chapter01-what-is-bsp.md(order1). F≤5, 기존4 동의. |
| G | 2 | L399 공식 board 문서 목록 하나·L331 로그 판2026.04, 개별 옵션/주소의 판별 근거 없음. 기존2 동의. |

판정: 병합 검토. 병합 후보: bsp/chapter06-u-boot-porting.md. bootph/Kconfig/MAINTAINERS 중심으로 좁혀 보강하거나 공통 포팅 흐름을 병합.

### `chapter22-debugging.md`

source_file: `src/content/blog/embedded/bootloader/chapter22-debugging.md`

- score_status: 잠정; score: 52; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 아래 오류 확인 근거가 총점보다 우선한다.
- uncertainties: L66~75 출력에서 제시한 DRAM은0x40000000~0x80000000인데 relocaddr0xbff7c000을 DDR 위쪽 실행 주소라 설명. 제시된 메모리 모델 불일치로 기존 오류 확인 동의. 단 L177·184 GDB 주소가4바이트 차라는 것만으로 함수 배치 불가능을 단정한 보조 근거는 철회(명령/심볼 의미 검증 필요). DEBUG_UART_NS16550/IMX 조합·L342 ramoops 보존은 미검증.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 13 | L75 relocation 주소 변환·L209~226 panic 보존·L232~242 실패 매트릭스를 도구 선택에 연결, 기존12→13. |
| B | 11 | L19~305 도구에서 L345~353 정리까지 완결. L204 kernel-log-region 찾는 방법 부족·주소 불일치·미검증 내용으로 B≤13, 기존11 유지. |
| C | 7 | L24~49·62~133·141~193 명령/출력은 있으나 L244 60%와 실행환경 없는 수치 C≤8, 기존7 유지. |
| D | 10 | L25~28·54~56 ↔ bsp/chapter06-u-boot-porting.md L157~159·270~298; L143·158~162 ↔ bsp/chapter11-bootlog-debugging.md L288~294; L232~242 ↔ 인접 ch21 L344. 커널 부팅 디버그와 부트로더 콘솔 질문이 달라9→10. |
| E | 6 | L2·5 post-mortem/panic dump 약속에 비해 L203~207은 목록 수준, 기존6 동의. |
| F | 4 | L13·309 마지막/22편 표기, L311~317 실제 장 구성 불일치. ch23(order23·공개)이 있는데 다음 편 없음. 관련 내부8개 모두 존재/공개이나 L362 debug.rst 라벨은 usage/index URL. 기존4 동의. |
| G | 1 | L362 공식 색인 링크 하나, U-Boot 판·실험 보드 없음. 기존1 동의. |

판정: 우선 조치. 병합 대상 없음. BSP ch06/ch11은 진단 절 축소 후보이나 콘솔/relocation/post-mortem 질문을 보강.

### `chapter23-bootrom-efuse-otp.md`

source_file: `src/content/blog/embedded/bootloader/chapter23-bootrom-efuse-otp.md`

- score_status: 잠정; score: 59; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 아래 오류 확인 근거가 총점보다 우선한다.
- uncertainties: L36 동일0x00910000을 ROM base, L40 SPL을 적재하는 OCRAM으로 적고 L25·273 ROM은 수정 불가라 설명. 구체 주소/저장공간 모순으로 오류 확인 동의. L61~62 fuse map·L141 TI·L209~211 counter burn 시점은 미검증. L284 'SRAM 안50KB에서 동작하는 SPL'은 코드크기와 SRAM크기를 구분하므로256KB SRAM과 모순이라고 보지 않음. L292 후행 설명을 놓쳐 기존 보고서가 없는 문구를 인용했다고 한 중간 판단은 철회했다.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L116~126 fuse map·L220~240 JTAG·L246~265 사고/공정 순서가 고유. 실제 실패 자료 없어14 유지. |
| B | 13 | L27~40 부트→L46~141 fuse→L143~218 키/카운터→L220~280 잠금/정리. 정확성 의심이 열렸으므로 기존14는 AP-C-24 B≤13 위반,13으로 수정. |
| C | 7 | L149~182 CST/fuse 명령이 있으나 판·보드 리비전 없고 L104~108 자리표시 출력·L269 0.5% 출처 없음 C≤8,7 유지. |
| D | 10 | L143~145·188~202 ↔ ch27 L19~27·239~246; L145~184 ↔ embedded-security/chapter02-secure-boot.md L159~171·247~267. fuse map/JTAG/공정 순서가 중복되지 않아9→10. 인접 ch22는 진단·ch24는 SPL로 역할 분리. |
| E | 8 | L2·5 ROM·OTP·키·rollback 약속을 L27~40·80~218이 답함. 실제 동작 분석은 약하지만 주요 키워드 누락 없어7→8(일반 SoC 제목+단일 i.MX 중심이므로8 상한). |
| F | 5 | L284 다음 편=ch24(order24·공개), 관련/본문 내부7개는 모두 존재·공개. L292 링크 뒤 설명은 실제로 '빌드 시스템 관점의 secure boot'이나 대상 buildroot/chapter18-security-cve.md는 CVE·hardening·SBOM 글이고 secure boot 내용은 없다. 기존 F≤5 감점 동의,5 유지. 라벨과 후행 설명을 함께 대조했다. |
| G | 2 | L293~294 NXP 자료 링크 있으나 판·개별 fuse 주장과 연결 없음. 기존2 동의. |

판정: 우선 조치. 병합 후보: ch27의 RoT/rollback 절. fuse 물리·map·공정 순서는 독립 역할이라 먼저 보강.

### `chapter24-spl-deep.md`

source_file: `src/content/blog/embedded/bootloader/chapter24-spl-deep.md`

- score_status: 잠정; score: 50; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 아래 오류 확인 근거가 총점보다 우선한다.
- uncertainties: L103·106 .text와BSS 시작 주소 동일인데 L151~165·334 연속된 text/data 뒤 BSS라고 설명하는 주소 전제 불일치, L66 SRAM 적재 SPL 점프↔L67·72 DDR 실행에 재배치 설명 없음. 기존 오류 확인 유지. L248 완곡본문↔L336 단정정리 시간 차는3-1 제외규칙으로 오류 건수에서 철회. BSS 실제 linker 처리·API 결함은 별도 upstream 검증 필요.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 13 | L90~127 옵션표·L137~162 linker·L169~227 적재4패턴을 묶어 기존12→13. 실측·선택 분석은 부족. |
| B | 11 | L19~338 제약→배치→적재→진단→정리 완성. L103·106 주소 전제 충돌, L222 다중 이미지 설명 부족으로 B≤13,11 유지. |
| C | 6 | L273~290 미정의 UART 상수 의사코드·L298~307 관측절차만 있음. L31~37·127·225 수치 환경/출처 없음 C≤8,6 유지. |
| D | 9 | L55~72·231~241 ↔ ch04 L57~76·195~206; L246~264 ↔ ch05 L19~30·76~101; L17·76~80 ↔ buildroot/chapter13-uboot-integration.md L267~280. 반복은 크지만 config/linker/적재 패턴 독립성 인정8→9. |
| E | 5 | L2 동작 추적 대비 map/실행 로그 없고 L307은 관측 가능성만 언급. 기존5 동의. |
| F | 4 | L342 다음 편ch25(order25·공개)은 맞지만 예고한 SPL/BL2 두 패턴이 그 글 본문 중심에 없음. L351 'SPL과BL31관계' 설명도 약속 불일치. 관련7개 대상은 존재/공개, F≤5·기존4 유지. |
| G | 2 | L353 latest SPL 문서·L131 linker 경로 있으나 보드/태그 없음.2 유지. |

판정: 우선 조치. 병합 후보: ch04 TPL/구조체, ch07 OF_PLATDATA. config·linker·4적재패턴은 독립 질문이어서 보강.

### `chapter25-tfa-optee.md`

source_file: `src/content/blog/embedded/bootloader/chapter25-tfa-optee.md`

- score_status: 잠정; score: 58; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 아래 오류 확인 근거가 총점보다 우선한다.
- uncertainties: L74~75의OCRAM 구간0x00910000~0x00940000은192KiB인데 그 칸에~256KB를 배치, 약33% 차이가 크고 칸 안에 들어가는 코드/메모리 표시와 불일치. 오류 확인을 유지하되 L79 약32MB와31MiB 구간 차이는 근사 표현이므로 독립 오류로 세지 않음. L90 30MiB carveout이 전체 구간을 모두 차지해야 한다는 전제도 없어 그 자체로 추가 오류 확정하지 않음. i.MX8MP 실제주소/BL2빌드/PSCI DT는 미검증.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L71~100 맵/carveout·L223~228 UUID·L270~276 vendor 패키징 비교가 추가 가치.14 유지. |
| B | 12 | L21~364 흐름/서비스/FIP/빌드/PSCI/함정 완결, L183·335 SPSR 주체·L215 출력 등 의심으로 B≤13,12 유지. |
| C | 8 | L203~219 fiptool·L236~264 세트리빌드·L321~343 관측명령 있음. L74~79·177·272~275 환경/출처 없는 수치 C≤8,8 유지. |
| D | 9 | L47~63 ↔ ch02 L74~94·bsp/chapter07-tfa-trustzone.md L31~43; L296~309 ↔ BSP ch07 L208~236. 인접ch24/ch26 역할은 별도이며 FIP·vendor 패키징 L197~278은 남아8→9. |
| E | 8 | L2·5 BL흐름·OPTEE/U-Boot 위치를 L39~65·144~195 및 실제 빌드가 답해7→8. 잘못된 기술주장은 별도 게이트. |
| F | 5 | L368 다음편ch26(order26·공개) 일치. L374 HAB/AHAB/HBK 라벨은 SPL/TPL인 ch24와 다르고 L373도 bootROM/fuse인ch23을 일반verifiedboot로 부름. 관련6개 존재/공개지만 F≤5,5 유지. |
| G | 2 | L377~379 공식TF-A/OPTEE/PSCI 목록은 있으나 API·주소·UUID 옆 판별근거 없음.2 유지. |

판정: 우선 조치. 병합 후보: bsp/chapter07-tfa-trustzone.md BL/PSCI 개요. FIP/패키징 질문은 독립 역할로 보강.

### `chapter26-ddr-training.md`

source_file: `src/content/blog/embedded/bootloader/chapter26-ddr-training.md`

- score_status: 잠정; score: 56; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 아래 오류 확인 근거가 총점보다 우선한다.
- uncertainties: L99 LPDDR4 DQS single-ended와 L196~197 DDR4/LPDDR4 DQS differential 주장 충돌로 오류 확인 유지. L94 'single-ended CK_t,CK_c(differential)'는 개별선/쌍 구분을 잘못 썼을 가능성, L162 blob이름/코드통합도 표현의범위 문제라 별도 확정오류 건수로 세지 않음. L86 mailbox코드·L127 eMMC에서DRAMtiming·L207~209 VREF는미검증.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L181~243 원인별 진단·L245~259 lane 결과 해석·L311~339 revision별 timing선택이 고유.14 유지. |
| B | 12 | L19~339 controller→training→실패→관측→revision 흐름 완성. 정확성 의심·튜닝결과 부재 B≤13,12 유지. |
| C | 7 | L168~177 빌드·L263~291 mtest/memtester·L301 stress. L183 90%·L195 25mil·L259 ±2 출처/환경 없음 C≤8,7 유지. |
| D | 9 | L43~83·261~301 ↔ ch09 L284~311·336~365; L277~293·343 ↔ bsp/chapter05-ddr-params.md L248~264·329~331. 반복은 크나 lane해석/revision선택/실패원인 비교는 독립적이라7→9. 인접ch25/ch27은 다른질문. |
| E | 7 | L2 보드별 튜닝 약속에 L293 tweak 한줄·L307~339 선택코드 위주라 결과부족.7 유지. |
| F | 5 | L363 다음편ch27(order27·공개) 맞음. 관련5개 모두 존재/공개. L370 ch24에 DDR firmware/flash.bin 빌드흐름을 약속하지만 ch24는DTB/SPL 일반론. F≤5,5 유지. |
| G | 2 | L372 JEDEC209-4B 목록·L54·132 소스경로에판없음.2 유지. |

판정: 우선 조치. 병합 후보: ch09 training요약, bsp/chapter05-ddr-params.md 테스트. lane/PCB/revision 질문을 남겨 보강.

### `chapter27-chain-of-trust.md`

source_file: `src/content/blog/embedded/bootloader/chapter27-chain-of-trust.md`

- score_status: 잠정; score: 61; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 아래 오류 확인 근거가 총점보다 우선한다.
- uncertainties: L241 허용검사조건을eFuse≥firmware라쓰고 L244~246 eFuse2에서fw1거부 예를들어 부호해석이충돌.3-1 내부기술결론불일치로 오류확인동의. L139~143 rkdeveloptool wf·L152~153 TI키명·L224 모듈오류코드·L233 lockdown적용은API/정책검증전확정하지않음.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 16 | L54~69 인증서계층·L73~172 세벤더키비교·L255~291 거부메시지 매핑은 이 글의 판단구조여서15→16. |
| B | 12 | L19~302 RoT→키→FIT→모듈→rotation→실패/정리 완결. L46 dmverity는표1칸·기술의심열려 B≤13,12 유지. |
| C | 8 | L77~105 cst/CSF·L178~185 mkimage·L226~231 sign-file·L268~289 거부로그. 판/환경없고 L23 eFuse256bit한계 수치 출처 없음 C≤8,8 유지. |
| D | 10 | L73~122·241~249 ↔ embedded-security/chapter02-secure-boot.md L159~219·247~267; L19~27·239~246 ↔ ch23 L143~145·188~202. 인접ch26/ch28은DDR/layout으로별도, 인증서트리/벤더진단 고유성 인정9→10. |
| E | 8 | L2·5 다단계서명흐름 약속을 L39~46·54~69·255~291이 직접 답해7→8. dmverity 부연은약해9미만. |
| F | 5 | L306 다음편내용=ch28(order28·공개), L310~315 링크6개존재/주제일치. 단L316 'RM/i.MXReferenceManual' 라벨의URL은application-note/AN4581.pdf. 문서종류 미확인인 출처라 가산보류, 기존5 유지(옛제목과문구가다르다는이유만의감점은철회). |
| G | 2 | L316~318 공식자료있으나 버전/주장연결부족,2 유지. |

판정: 우선 조치. 병합 후보: ch23 RoT/rollback·embedded-security/chapter02-secure-boot.md HAB. 전체체인/인증서/진단은독립역할이므로보강.

### `chapter28-flash-layout.md`

source_file: `src/content/blog/embedded/bootloader/chapter28-flash-layout.md`

- score_status: 잠정; score: 59; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 아래 오류 확인 근거가 총점보다 우선한다.
- uncertainties: L161 block47/offset0x5e0000은128KiB, L162 block312/0x27000000·L163 block891/0x6f600000은2MiB를전제해같은출력블록크기불일치. 내부산술오류확인동의. 단 L165 BBTpage524160만으로장치용량1GiB를확정한보조근거는철회: page크기/장치끝위치가그로그에명시되지않음. L232~240 partconf의access값·fixedpartitions/eMMC·UBIautoresize는upstream미검증.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 15 | L82~93 sizing·L126~135 A/B 분할·L284~294 설계순서가 페이지고유선택틀.14→15, 출처없는배수로20대불가. |
| B | 13 | L19~319 특성→크기→env→A/B→BBT/UBI→eMMC→설계순서까지완결. 미검증/오류열려 B≤13,13 유지. |
| C | 7 | L54~74 DTS·L105~116 Kconfig·L185~210 ubinize·L230~278 partconf/genimage. L84~95 배수/L212 overhead 출처없음 C≤8·로그불일치로7 유지. |
| D | 9 | L54~74·249~278 ↔ bsp/chapter17-image-packaging.md L69~81·138~213; L230~241·177~214 ↔ ch10 L139~152·187~218. 인접ch27/ch29은다른질문. sizing/설계절독립성이있어8→9. |
| E | 8 | L2·5 partition/NAND/eMMC/UBI 비교·sizing약속을 L23~29·78~97·154~280이답해7→8. |
| F | 5 | L323 다음편ch29(order29·공개) 일치, 관련9개존재/공개. L245·330이ch27에서RPMB활용을약속하지만ch27 전체RPMB0건. F≤5·5 유지. |
| G | 2 | L332~334 공식문서목록은있으나 L95·212 수치·Kconfig에판별출처없음.2 유지. |

판정: 우선 조치. 병합 후보: bsp/chapter17-image-packaging.md. sizing근거확보와공통구성축소후보강.

### `chapter29-distro-boot.md`

source_file: `src/content/blog/embedded/bootloader/chapter29-distro-boot.md`

- score_status: 잠정; score: 58; confidence: 중간; factcheck: 미검증.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 검증되지 않은 기술 주장에 대한 1차 자료 확인이 필요하다.
- uncertainties: 기존미검증동의. L134 signed는legacyCRC설명L136과긴장하지만cryptographic서명여부는표준확인이필요. L326 bootflowfallback·L132 모든배포판extlinux·L239 RPi모델별경로·L333 architecture검사는1차자료미확인. L155 생성일이글날짜와같다는것은허위경험근거가아님.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L33~40 네경로·L177~184 script차이·L279~286 선택표·L294~314 라벨다중부트가독자선택에기여13→14. |
| B | 13 | L21~349 동기→각경로→선택→다중부트→함정/정리완결. L134 signed·L326 fallback의심열려B≤13,13 유지. |
| C | 7 | L97~114 설정·L149 명령·L73~89·152~170 로그는있으나 실행판/보드없고 전송률수치출처/환경없음C≤8,7 유지. |
| D | 10 | L190~202·252~263 ↔ ch14 L44~54·154~164; L44~69 ↔ ch13 L138~175; L138~150 ↔ buildroot/chapter13-uboot-integration.md L158~177. 인접ch28/ch30역할은별도이며 네선택경로비교가 남아8→10. |
| E | 8 | L2·5 extlinux/boot.scr 차이/선택을 L177~184·279~286이직접답해7→8. 설명의정확성은게이트로분리. |
| F | 4 | L353 다음편ch30(order30·공개) 맞음. 내부11개존재/공개이나L314·361 A/B가DDR인ch26으로가고 L362 targetbuildroot/ch08에extlinux내용없음. F≤5·4 유지. |
| G | 2 | L363~364 공식U-Boot/syslinux목록·L38 2022.10+는있으나원문주장별출처연결없음.2 유지. |

판정: 병합 검토. 병합 후보: ch14 bootflow/efidebug·ch13 distroenv. 독립 extlinux/boot.scr 비교검색의도가있어다음조치는보강.

### `chapter30-bootloader-ci.md`

source_file: `src/content/blog/embedded/bootloader/chapter30-bootloader-ci.md`

- score_status: 잠정; score: 61; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A13 이상은 역사적 LLM 앵커18과 비교하여 더 낮게 책정했다.
- blockers: P0 없음. 아래 오류 확인 근거가 총점보다 우선한다.
- uncertainties: L113 QEMUscript가DRAMtraining검증한다는주장↔L23·119 실제DDR은simulator로재현못한다는주장충돌. L32 ARMv8TF-A필수일반화↔L86 qemu단독실행예도충돌하며공식U-Bootv2024.04QEMUARM문서의최소단독실행명령으로후자확인. OPTEE는원문에'옵션'이므로필수주장오류에포함하지않음. L185~188 size dec/hex도산술불일치가있음:828456=0xca428,92224=0x16840(원문ca4e8/168c0). L294~303VaultAPI·L63/68빌드·L128~140LAVA스키마는미검증.
- evidence: 아래 A~G 원문 위치와 D 비교 구간.

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 16 | L34~72 DAG·L88~111 prompt대기·L223~236 bisectskip·L262~279 provenance·L285~307 키분리로부트로더작업순서를연결해15→16. |
| B | 12 | L28 예고다섯단이L30~307에서완결. L130·161 flash.bin생성job없고 QEMU주장모순/미검증이열려B≤13,12 유지. |
| C | 7 | L88~111 PASS/FAIL·L193~204 regression·L223~234 bisect는절차가있으나판/실행기록없고 L208~215 임계·L253~260 크기출처없음C≤8,7 유지. |
| D | 12 | L74~82 ↔ buildroot/chapter19-cicd.md L292~300 matrix틀; L117~143·171 ↔ bsp/chapter20-production.md L140~151. 인접ch29는부트표준화질문이며prompt/DAG/SPLsize라는독립CI역할을인정10→12. |
| E | 8 | L2·5 buildmatrix·QEMU/실보드자동부팅약속을 L30~178이답함,실보드image생성누락으로8 유지. |
| F | 4 | L217·361 부트시간측정라벨의대상ch25에는해당절없음. L115·360 ch22에anchor기반검증이없음. ch31(order31·공개)있는데L329~343 마무리만있고다음편없음. 내부11개존재/공개이나F≤5·4 유지. |
| G | 2 | L364~365 공식LAVA/testpy목록이있으나L40 가상image태그외실행도구판없음.2 유지. |

판정: 우선 조치. 병합 대상 없음. rootfs/BSP CI와대상이달라부트로더image생성/관측주장/다음편을보강.

## 시리즈 공통 문제와 검증

3편 이상에 반복된 문제는 출처/환경 없는 수치(10편), 태그 없는 API·코드 인용(10편), 실제 내용과 다른 관련 설명/번호(ch21·23·24·25·26·28·29·30), 오래된 마지막 편 안내(ch21·22·30)다. 같은 틀의 H2와 상투적인 운영 임계값은 독립 예제·질문까지 대조했으며 이 신호만으로 P0를 확정하지 않았다.

기계 검증은 A~G 합계10행·이전 대비 차이10행·필수 필드10블록·B≤13/C≤8·보고서 합계/평균을 Python으로 검사했다. Markdown `git diff --check`도 실행했다. 실제 빌드/렌더 통과는 부모 공통 검사 보고서를 따로 확인해야 한다.
