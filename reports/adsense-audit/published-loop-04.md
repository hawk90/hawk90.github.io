# 공개 글 AdSense 평가 — 루프 04

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-04.md) · [재검토 기록](double-check-loop-04.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일: 2026-10-18. 원문 기준 HEAD `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. `docs/adsense-audit/rubric.md` v1.2/AP-C-24 및 `anchors.md@10550ca1` 적용. bootloader31~37·BSP1~3의 원문 전체와 아래 비교 구간·내부 링크 대상을 직접 읽었다. 원문/기존 보고서/사용자 미커밋 파일은 변경하지 않았다. P0는 본문 검토 범위에서 확인 없음. 원문/산술/대상확인은 OBS, 채점/역할 판단은 INF다.

전편 `score_status: 잠정`, `confidence: 중간`. 기술 주장 전체를 검증하지 않았으므로 확정 없음. B는 열린 정확성 의심으로13 이하, C는 결과/환경/출처 수준에 따라 아래 상한 적용. 렌더/build/모바일 검사는 직접 미실시, 공통검사 `double-check-gates-2026-10-18.md` 참조. F7~8에는 폰폭검사가 필수가 아니며 F9+요건과 구분했다.

## 재평가 표

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `bootloader/chapter31-tfa-bl31-runtime.md` | 14 | 12 | 7 | 11 | 5 | 7 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bootloader/chapter32-psci-smccc.md` | 13 | 13 | 6 | 11 | 7 | 7 | 3 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bootloader/chapter33-smp-secondary-cpu-bringup.md` | 15 | 13 | 7 | 10 | 8 | 5 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bootloader/chapter34-pcie-enumeration.md` | 10 | 10 | 5 | 9 | 5 | 5 | 1 | **45** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bootloader/chapter35-uefi-cxl-init.md` | 10 | 11 | 5 | 10 | 5 | 4 | 1 | **46** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bootloader/chapter36-boot-memory-topology.md` | 11 | 11 | 6 | 9 | 6 | 4 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bootloader/chapter37-secureboot-cert-rollover.md` | 17 | 13 | 8 | 14 | 7 | 5 | 3 | **67** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter01-what-is-bsp.md` | 13 | 12 | 5 | 10 | 8 | 5 | 2 | **55** | 미검증 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter02-datasheet.md` | 13 | 12 | 7 | 10 | 7 | 5 | 3 | **57** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `bsp/chapter03-device-tree-design.md` | 12 | 10 | 7 | 9 | 6 | 6 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

| 파일 | 이전 총점 | 새 총점 | 차이 | 이전 판정 | 새 판정 |
| --- | ---: | ---: | ---: | --- | --- |
| `bootloader/chapter31-tfa-bl31-runtime.md` | 56 | 58 | +2 | 우선 조치 | 우선 조치 |
| `bootloader/chapter32-psci-smccc.md` | 59 | 60 | +1 | 우선 조치 | 우선 조치 |
| `bootloader/chapter33-smp-secondary-cpu-bringup.md` | 58 | 60 | +2 | 우선 조치 | 우선 조치 |
| `bootloader/chapter34-pcie-enumeration.md` | 45 | 45 | 0 | 우선 조치 | 우선 조치 |
| `bootloader/chapter35-uefi-cxl-init.md` | 46 | 46 | 0 | 병합 검토 | 병합 검토 |
| `bootloader/chapter36-boot-memory-topology.md` | 48 | 48 | 0 | 우선 조치 | 우선 조치 |
| `bootloader/chapter37-secureboot-cert-rollover.md` | 66 | 67 | +1 | 우선 조치 | 우선 조치 |
| `bsp/chapter01-what-is-bsp.md` | 55 | 55 | 0 | 보강 | 보강 |
| `bsp/chapter02-datasheet.md` | 57 | 57 | 0 | 우선 조치 | 우선 조치 |
| `bsp/chapter03-device-tree-design.md` | 51 | 52 | +1 | 우선 조치 | 우선 조치 |

합계548점·평균54.8, 기존541점 대비+7. 우선 조치8·병합 검토1·보강1로 판정 변경 없음. ch34·35·36·BSP1·2는 전항목 동의, 나머지는 D 재량 재보정 또는 F 근거 오류 정정이다. 같은 의미의 옛 제목은 잘못된 대상/주제 라벨과 구분했다.

## 1차 자료와 게이트 변경

- [DTSpec stable §2.2](https://devicetree-specification.readthedocs.io/en/stable/devicetree-basics.html): cell은32-bit이고 unit-address는 해당 노드 reg의 첫 주소와 대응한다. ch33 L106·113의 초과 cell은 미검증에서 오류 확인 근거로 승격, BSP3 L123의 부모reg 규칙 오류를 재확인했다.
- [UEFI2.10 §32.3.5·32.6](https://uefi.org/specs/UEFI/2.10/32_Secure_Boot_and_Driver_Signing.html): UserMode의 KEK 갱신 권한과 db/dbx 갱신 권한을 구분한다. ch37의 KEK서명 오류를 확인했다. [MS 공식 인증서 교체 안내](https://support.microsoft.com/en-us/servicing/os/secure-boot/2025/06/windows-secure-boot-certificate-expiration-and-ca-updates)의2025-11-10 변경 이력에서2K를 포함한KEK명을 확인했다. 이는 글날짜 뒤 변동으로 생긴 오류가 아니다.
- [Linuxv6.12 imx8mp.dtsi](https://raw.githubusercontent.com/torvalds/linux/v6.12/arch/arm64/boot/dts/freescale/imx8mp.dtsi)의 iomuxc/UART1/GPIO1 reg로 BSP2 세 주소 오류를 재확인했다. 기존 보고서의 나머지pinfunc/IRQ주장까지 자동 검증한 것은 아니다.
- [Linux6.10 CXL 메모리 문서](https://www.kernel.org/doc/html/v6.10/driver-api/cxl/memory-devices.html)의 도입부·CXL Port·cxl_register_map·cxl_decoder는 메모리의SPA/DPA HDM decode와 BAR에 놓인 레지스터를 구분한다. ch34 L91·107·121의 대용량 DRAM을 큰PCI BAR/window로 할당한다는 설명을 오류로 확인했다. 기존 ranges 불변만으로 내부모순이라는 판단은 철회했다.
- ch32 서로 다른 환경의 latency 예·두 코드경로만으로 내부모순을 확정한 보조 근거를 철회했다. 독립적인 functionID bit30/SMC64 표 충돌은 유지했다. ch36의 가상 시나리오를 실제 측정 조작으로 확대하지 않았다.

## 글별 근거

아래 축약경로는 `src/content/blog/embedded/` 기준이다. chNN은 bootloader/chapterNN-*를 뜻한다. 별도 tools 경로는 `src/content/blog/` 기준이다. 관련/본문 내부 링크92개를 slug로 해석해 전부 존재/공개임을 확인했고, 후행설명·실제주제·seriesOrder를 대조했다. 외부링크 전체 HTTP 검사는 미실시. Recipes 비교대상이 수정된 경우 현재 내용과 비교했고 과거평가 오류와 구분했다. 숫자 라벨은 원평가 보고서 커밋ba9f7104와 현재 모두 같은order임을 확인했다.

### `bootloader/chapter31-tfa-bl31-runtime.md`

source_file: `src/content/blog/embedded/bootloader/chapter31-tfa-bl31-runtime.md`

- score_status: 잠정; score: 58; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 아래 정확성 게이트가 총점보다 우선한다.
- uncertainties: L72는4코어 stack을16~32KB×4, L369는 코어당 보통4KB(증가8KB)라 적는다. 같은 대표 stack 크기가4~8배 달라 기존 오류 확인 유지. L365 SMCCC clobber·L373 NS 설정과 코드 판은 미검증.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 14 | L78~138 등록/OEN 인덱스→L140~198 dispatcher, L361 linker 누락 진단이 고유하나 실제 판/관측 없음.14 동의. |
| B | 12 | L18~388 부트/런타임·등록·dispatch·함정·정리 완성. SDEI L220~233·RAS L237은 개요, 정확성 의심 B≤13.12 동의. |
| C | 7 | L60~70 DTS·L361 objdump·L369 옵션을 실행 단서로 제공. L296~315 측정은 A53 1.5GHz만 있고 보드/판/방법/출처 없음 C≤8.7 동의. |
| D | 11 | L58~70 ↔ ch25 L76~96 carveout, L204~210 ↔ ch25 L133~140 서비스, L106 ↔ ch32 L74~91 OEN, L298~315 ↔ ch32 L353~364 latency, L78~88·140~198 ↔ bsp/chapter07-tfa-trustzone.md L330~340·389. 반복을 빼도 인덱스 구성/dispatcher 분석이 별개 질문이라9→11(재량 재보정). |
| E | 5 | L2 PSCI·SDEI·RAS dispatcher 추적 약속 중 PSCI L216은 다음 글로 넘기고 SDEI/RAS는 개요. 분석 약속+개요3~5 규칙으로5 동의. |
| F | 7 | L16 전제ch25·L172 흐름 도식·L392 다음ch32(order32) 맞음. L396~402 관련7개도 해당 주제. 폰폭 미검사는 F7 상한 근거가 아니며 구조/전제/탐색 근거로7 동의. |
| G | 2 | L403~404 TF-A/SMCCC 공식 링크가 끝 목록이고 코드판·주장별 연결 없음.2 동의. |

판정: 우선 조치. 병합은 위 D 공통 절의 축소 후보이며 전체 글 병합보다 고유 질문의 정확성·재현성 보강이 우선.

### `bootloader/chapter32-psci-smccc.md`

source_file: `src/content/blog/embedded/bootloader/chapter32-psci-smccc.md`

- score_status: 잠정; score: 60; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 아래 정확성 게이트가 총점보다 우선한다.
- uncertainties: L110 'ID(SMC64)' 표에0x84000002 등이 있지만 L74~78 bit30 설명·L93 CPU_OFF 예는 SMC32라고 명시한다. 구체 비트/표 충돌로 게이트 유지. L355 A72와L370 i.MX8MP는 서로 다른 예시 환경일 수 있으므로 독립 내부모순 근거에서 철회. L204·207 경로 차이, 인자/반환 레지스터 수는 판별 1차자료 전 미검증.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 13 | L74~102 function ID 비트/return code, L231~296 power_state/DT의 독립 설명.13 동의. |
| B | 13 | L19~455 ABI→CPU_ON→idle→Linux→측정→함정 완성, StateID/버전 등 미검증으로 B≤13.13 동의. |
| C | 6 | L145~225·298~349은 간략 코드, L353~382 latency는 환경 다른 표/로그와 방법 부족. 출처 없는 구체값 C≤8,6 동의. |
| D | 11 | L74~91 ↔ ch31 L106 OEN, L145~225 ↔ ch33 L189~200·bsp/chapter09-smp-bringup.md L91~97 CPU_ON, L255~296 ↔ bsp/chapter07-tfa-trustzone.md L208~236 PSCI DT. function ID·return·power_state는 독립 설명이므로10→11. 인접ch31 dispatcher/ch33secondary와 역할 구분. |
| E | 7 | L2 ABI와PSCI 연계 약속을 L74~349에서 다루되 실측 해석·실제 호출 재현 부족,7 동의. |
| F | 7 | L16 전제ch31, L460 다음ch33(order33), L464~470 관련7개 대상 일치. 내용별 표/전제/다음 단계 있어7 동의. F9+ 전용 폰폭 요건을7에 적용하지 않음. |
| G | 3 | L471~472 DEN0022/DEN0028과 L31·35 버전 문맥 제공, 개별 구현 경로 검증은 부족.3 동의. |

판정: 우선 조치. 병합은 위 D 공통 절의 축소 후보이며 전체 글 병합보다 고유 질문의 정확성·재현성 보강이 우선.

### `bootloader/chapter33-smp-secondary-cpu-bringup.md`

source_file: `src/content/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup.md`

- score_status: 잠정; score: 60; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 아래 정확성 게이트가 총점보다 우선한다.
- uncertainties: L106·113 cpu-release-addr의 한 cell 값0x70000fff8/0x70000fff0은 u32 범위를 초과한다. DTSpec §2.2.4.2로 기존 의심을 오류 승격. L421·424·427 간격은265/266µs, L432 약100µs 해석도 불일치하나 timestamp 차가 단독 CPU 실행시간이라는 의미는 별도 검증 필요. GIC 초기화/코드판 혼재 미검증.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 15 | L202~353 secondary_entry 어셈블리·percpu·GIC 연결과 L436~458 함정이 고유.15 동의. |
| B | 13 | L30~395 PSCI/spin→CPU_ON→EL진입→C→hotplug 흐름 완성. 소스판·GIC 콜백 의심 B≤13.13 동의. |
| C | 7 | L399 보드/커널6.6 명시했으나 L401~430 근사값·로그 측정절차/출처 없고 L432 해석 오류. C≤8,7 동의. |
| D | 10 | L189~195 ↔ bsp/chapter09-smp-bringup.md L91~97 호출 코드, L106 ↔ 같은 글L113 spin-table, L397~432 ↔ ch32 L353~382 관측 주제. 반복은 실제이나 L202~353 어셈블리/percpu/GIC의 독립 가치가 커8→10. 인접ch34는 다른 질문. |
| E | 8 | L2 CPU_ON부터EL1 약속을 L124~308 경로로 답함. L355~395 hotplug 확장은 과도하지 않지만 재현성 부족해8 동의. |
| F | 5 | L472~474 '마지막 세 장31~33'인데34~37 공개. 다음 실제ch34 부재, F≤5. L476·480~488 관련11개는 존재/주제 일치,5 동의. |
| G | 2 | L489~490 PSCI/booting 공식 목록, 코드경로별 커널판은 없음.2 동의. |

판정: 우선 조치. 병합은 위 D 공통 절의 축소 후보이며 전체 글 병합보다 고유 질문의 정확성·재현성 보강이 우선.

### `bootloader/chapter34-pcie-enumeration.md`

source_file: `src/content/blog/embedded/bootloader/chapter34-pcie-enumeration.md`

- score_status: 잠정; score: 45; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 아래 정확성 게이트가 총점보다 우선한다.
- uncertainties: 기존 L16·250 vsL162~164 ranges 불변만으로 내부모순이라는 근거는 철회: RC window와 개별 BAR 배치는 층위가 다를 수 있다. 대신 L91·107·121이 CXL DRAM을 큰 prefetchable BAR/window로 할당한다고 설명하는 오류를 Linux6.10 공식 문서의 HDM 메모리 decode와 register-block BAR 구분으로 확인. L125 DVSEC upstream·L179~184 Jetson CXL은 미검증.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 10 | L26~34 RC init·L42~89 scan/BAR은 표준 흐름, L193~201 실패 경계는 유용하나 실제 U-Boot 경로/관측 없음.10 동의. |
| B | 10 | L20~251 enum→resource→handoff→함정→정리, bridge subordinate·DT/ACPI 책임은 불명확. 정확성 의심 B≤13,10 동의. |
| C | 5 | L77~89 산술 예뿐 실행 U-Boot 명령/환경 없음. L71·91·209 수치 출처 없어 C≤8,5 동의. |
| D | 9 | L42~89 ↔ modern-recipes/part11-03-pcie-bar.md L55~85 sizing/scan, L123~153·222~232 ↔ hardware/cxl/chapter06-cxl-io.md L44~71·hardware/pcie/chapter03-config-space.md L119~155 DVSEC. DTB 인계 질문은 차이,9 동의. |
| E | 5 | L2 흐름 분석 약속에 L43 단순화·L128 개념 코드만 제공. 개념 소개3~5로5 동의. |
| F | 5 | L255 다음ch35(order35) 맞음. L155·263~264 Recipes149/151 라벨은 실제150/152. ba9f7104 당시도150/152라 기존 평가 오류 아님. F≤5,5 동의. |
| G | 1 | L125 2024+만 있고 공식문서/코드판/SoC 출처 없음.1 동의. |

판정: 우선 조치. 병합은 위 D 공통 절의 축소 후보이며 전체 글 병합보다 고유 질문의 정확성·재현성 보강이 우선.

### `bootloader/chapter35-uefi-cxl-init.md`

source_file: `src/content/blog/embedded/bootloader/chapter35-uefi-cxl-init.md`

- score_status: 잠정; score: 46; confidence: 중간; factcheck: 미검증.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 기술 주장 전체의 1차자료 확인이 남았다.
- uncertainties: L52~59 CEDT type표·L123~134 SPDM 실패와CEDT 제외·L141~158 OVMF 옵션·L160~169 상용 BIOS 주장은 1차자료 확인 전 의심으로 유지. 기존 부분 factcheck 이력은 전체 정확성 확인이 아니다.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 10 | L34~46 firmware모듈/책임, L173~211 함정이 있으나 구체 구현/관측 없는 일반론.10 동의. |
| B | 11 | L19~221 UEFI→CEDT/HDM→NUMA/security→확인→함정 완성. 모듈/옵션/표 검증 부족 B≤13,11 동의. |
| C | 5 | L136~158 build/acpidump는 자리표시 옵션이고 L109~121 latency/distance 출처 없음 C≤8,5 동의. |
| D | 10 | L109~121 ↔ ch36 L51~120 SRAT/HMAT/SLIT; L195~202 ↔ ch36 L291~298 create-region. L136~158 ↔ hardware/cxl/chapter12-qemu-emulation.md L29~47·103~117 CEDT/QEMU 관측. 현재 비교 글은 upstream 기반으로 보강된 상태라 본문 차이를 과거 평가 오류로 세지 않음. UEFI 책임 소개 독립성으로10 동의. |
| E | 5 | L2 초기화/CEDT/HDM 분석 약속에 L34~107은 개념표 위주,3~5 규칙5 동의. |
| F | 4 | L224 다음ch36 자체는 맞으나 '시리즈 마지막'은37 존재와 불일치. L233 Recipes150 대상151(ba9f7104도151). F≤5,4 동의. |
| G | 1 | 특정 EDK2/ACPI판·1차 출처 없음,1 동의. |

판정: 병합 검토. 병합 후보 ch36의 ACPI 개요. EDK2 생성 단계/실행검증을 보강하면 독립 질문 유지.

### `bootloader/chapter36-boot-memory-topology.md`

source_file: `src/content/blog/embedded/bootloader/chapter36-boot-memory-topology.md`

- score_status: 잠정; score: 48; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 아래 정확성 게이트가 총점보다 우선한다.
- uncertainties: L105 same-socket distance20~30이라는 정의와 L114~117 같은소켓HBM17이라는 구체 표가 불일치하여 기존 게이트 유지. L143~148 자동tier 분류·L124~135 zone결정 주체는 API 의미 확인 전 미검증. L202 '실운영 예' 뒤 L204 가상 시나리오를 명시하므로 실제 측정 조작으로 단정하지 않음.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 11 | L176~234 boot/runtime·fabric 가상예·L238~298 함정 연결은 있지만 시스템 사례/출처 부족.11 동의. |
| B | 11 | L19~305 DDR/HBM/CXL→ACPI→Linux→fabric→진단→정리 기본 완결, tier/zone 정확성 의심 B≤13.11 동의. |
| C | 6 | L152~173 명령·L207~234 예시 출력은 있으나 L23~28 latency 출처/환경 없고 가상 시나리오. C≤8,6 동의. |
| D | 9 | L51~120 ↔ ch35 L109~121 ACPI표, L291~298 ↔ ch35 L195~202 region생성; L167~173·255~266 ↔ tools/debugging/memory/chapter07-tiered-memory-diagnostics.md L91~98·263 tier/HMAT확인. 부트 책임은 독립이나 개요 중복 커9 동의. |
| E | 6 | L2 DDR+CXL 통합 토폴로지에 L51~173 ACPI→OS 답은 있으나 단일가상예·검증 부족,6 동의. |
| F | 4 | L15·17·309 마지막 안내가37 공개와 불일치하고 다음37 없음. L326 Recipes151은 실제152(ba9f7104도152). F≤5,4 동의. |
| G | 1 | 공식 ACPI/커널판별 출처 없음.1 동의. |

판정: 우선 조치. 병합은 위 D 공통 절의 축소 후보이며 전체 글 병합보다 고유 질문의 정확성·재현성 보강이 우선.

### `bootloader/chapter37-secureboot-cert-rollover.md`

source_file: `src/content/blog/embedded/bootloader/chapter37-secureboot-cert-rollover.md`

- score_status: 잠정; score: 67; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 아래 정확성 게이트가 총점보다 우선한다.
- uncertainties: L38 PK로KEK갱신 vsL137 db·KEK 모두 기존KEK서명 지시는 충돌. UEFI2.10 §32.3.5는UserMode KEK갱신에PK서명을 요구, §32.6은db/dbx에PK또는KEK 허용함을 확인. MS 공식변경이력은2025-11-10 새KEK명에2K를추가했으므로 L70 'Microsoft Corporation KEK CA2023'은 글날짜 전 정정사항 누락. PQC준비/배포명령은 전체 검증 전 의심.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 17 | L58~107 인증서 교체/내부CA/이중서명/OEM경계를 판단 흐름으로 제시. PQC L139~149는 개요,17 동의. |
| B | 13 | L19~165 키체계→만료→대체→개발자선택→등록→PQC→정리 완결. KEK서명 지시 오류와 도구별 맥락 부족 B≤13,13 동의. |
| C | 8 | L115~135 확인/등록명령과 L58~73 날짜가 있지만 실제host/측정없고 만료효과 출처는 제한적. 구체값 출처/환경의 빈틈 C≤8,8 동의. |
| D | 14 | L27~38 ↔ ch18 L164~178 키계층, L99~107 ↔ ch27 L239~246 신뢰경계. 인증서2011→2023 만료/전환 결정 L58~107은 다른 글에 없어 기존13→14. ch36/35와 검색 의도도 분리. |
| E | 7 | L2 인증서전환/PQC대비 중 L139~149 PQC는 기술 선택/이행 상세가 부족.7 동의. |
| F | 5 | L167~169 다음TPMPCR편을 예고하지만공개ch38없음. 관련 L173~176은 존재/주제 일치. F≤5,5 동의. |
| G | 3 | L177~179 MS2공식출처/UEFI목록과 날짜 문맥은 있지만 PK/KEK 명령 옆 규격절 없음.3 동의. |

판정: 우선 조치. 병합은 위 D 공통 절의 축소 후보이며 전체 글 병합보다 고유 질문의 정확성·재현성 보강이 우선.

### `bsp/chapter01-what-is-bsp.md`

source_file: `src/content/blog/embedded/bsp/chapter01-what-is-bsp.md`

- score_status: 잠정; score: 55; confidence: 중간; factcheck: 미검증.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 기술 주장 전체의 1차자료 확인이 남았다.
- uncertainties: L15·40 provisioning/OTA를BSP안팎으로 다르게 설명하지만 범위 정의 차이이며3-1의 기술 불가능 모순으로 확정하지 않음. L182~200 3~4개월 일정·벤더자료범위는 출처 미검증. 첫 허브는40~59에도보강 예외.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 13 | L21~54 역할/책임과L104~130 SoCvs보드 구분, L147~180 준비체크가 고유한 길잡이.13 동의. |
| B | 12 | L21~245 BSP경계·부팅·구성·준비·단계·정리 완성. L40 안내/범위 불안정과 수치 미검증 B≤13,12 동의. |
| C | 5 | L147~180 준비물/체크는 있으나 실행/관찰없고 L182~200 일정은 환경/출처 없음 C≤8,5 동의. |
| D | 10 | L62~102 ↔ bootloader/chapter01-boot-problem.md L65~70·108~130 ROM→init, ↔ bsp/chapter10-first-boot.md L24~40 단계. L104~180 보드책임/준비물과 허브 역할을 인정하여10 동의. |
| E | 8 | L2 BSP본질/보드별책임 약속을 L21~54·104~130으로 답함.8 동의. |
| F | 5 | L251 다음bsp2(order2)·L255~258관련4개 일치. L40 'OTA별도시리즈'인데현재bsp18/20있고 L143 RPi4/AM62예고 vs실제iMX8중심인 읽기 안내 결함,5 동의. |
| G | 2 | L259 참고목록과 대상SoC 예는 있으나 개별기간/단계 자료 없음,2 동의. |

판정: 보강. 첫 허브 예외로보강, 독립 준비물/책임 안내 유지.

### `bsp/chapter02-datasheet.md`

source_file: `src/content/blog/embedded/bsp/chapter02-datasheet.md`

- score_status: 잠정; score: 57; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 아래 정확성 게이트가 총점보다 우선한다.
- uncertainties: L47 IOMUXC30340000·L49 UART130840000·L50 GPIO130820000은 Linuxv6.12 imx8mp.dtsi의30330000/30860000/30200000과 불일치(1차자료로 재확인). 기존 pinfunc/IRQ파일위치 의심은 이번 확인범위에서 별도 유지,3개base만으로 게이트 충분. 전체 내용/점수 confidence중간, 이3개 판정근거 확실.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 13 | L89~122 pinmux읽기·L167~181 erratum·L265~285 작업흐름을 BSP구현에 연결.13 동의. |
| B | 12 | L19~327 자료우선순위→맵/핀/시계/DDR/errata→실전→정리. 주소 오류/추가 pinfunc 의심 B≤13,12 동의. |
| C | 7 | L141~161 DT매핑·L205~257 읽기 예시·L167~181 erratumID가 구체적이지만 입력주소/ALT오류·환경없는값 C≤8,7 동의. |
| D | 10 | L111~122 ↔ bsp/chapter04-pinmux-clock.md L23~34 같은pinmux표, L141~161 ↔ bsp4 L54~88 매크로/DT패턴, L205~220 ↔ bootloader/chapter23-bootrom-efuse-otp.md L36~78 부트모드. 자료를선택/읽는순서 L265~285는독립,10 동의. |
| E | 7 | L2 RM/데이터시트→BSP 약속에 구체 맵/핀/erratum 예가 있으나 실제 주소가 틀림·독립검증 부족.7 동의. |
| F | 5 | L339 다음bsp3(order3), L343~347관련5개 일치. L343 'BSP란무엇인가'는 같은bsp1의 의미상 옛제목이므로 별도오류철회. 다만 L348~349 ReferenceManual 라벨 URL이NXP/TI제품페이지라F≤5,5 유지. |
| G | 3 | L167~181 구체erratum·L348~349 vendor자료와 범위는있으나 직접RM/판연결 부족,3 동의. |

판정: 우선 조치. 병합은 위 D 공통 절의 축소 후보이며 전체 글 병합보다 고유 질문의 정확성·재현성 보강이 우선.

### `bsp/chapter03-device-tree-design.md`

source_file: `src/content/blog/embedded/bsp/chapter03-device-tree-design.md`

- score_status: 잠정; score: 52; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`. A17인ch37은 역사적LLM18보다 재현·구현 깊이가 낮다. 보강된 현재 UART와 역사적49점을 섞지 않았다.
- blockers: P0 없음. 아래 정확성 게이트가 총점보다 우선한다.
- uncertainties: L123 unit-address가 '부모노드reg첫셀'과일치한다는 규칙은 DTSpec§2.2.1.1 ownreg규칙과불일치. L226~228 root아래memory, L466~472 reg없는mdio아래phy@1/reg1 자체예시와도 맞지 않아 기존게이트동의. compatiblefallback·overlay live변경은 별도 검증전 미검증.
- evidence: 아래 A~G 원문 위치·D 대응 구간(채점은INF).

| 항목 | 점수 | 근거 및 기존 대비 |
| --- | ---: | --- |
| A | 12 | L204~264 SoC/board계층·L291~309 live확인·L359~395 함정은있으나 문법개요중심.12 동의. |
| B | 10 | L41~90 골격→속성/binding→상속→컴파일/실행→overlay→함정/전체골격. L110~121 코드가bullet로깨지고 L123규칙오류 B≤13,10 동의. |
| C | 7 | L176~202 dtbs_check·L266~309 dtc/live절차·L397~488 골격이있으나 실제출력/보드판없고 placeholder주석, C≤9(절차만)·구체주소검증부족으로7 동의. |
| D | 9 | L123~174·291~357 ↔ modern-recipes/part7-03-device-tree-basics.md L75~89·181~206·236~260 cell/status/compatible/overlay, L204~264 ↔ bootloader/chapter06-device-tree.md L19~52 DT역할. 보드계층/전체골격은차이,9 유지. Recipes는현재본문으로비교했고 그 보강을과거오류로세지않음. |
| E | 6 | L2 설계약속은 있으나 L41~174 문법기초·L397~488 placeholders중심으로 설계선택/실패 검증이약함,6 동의. |
| F | 6 | L503 다음bsp4(order4), L507~510관련4개 맞음. L507 'BSP란무엇인가'는실제bsp1과동일주제여서옛제목만으로F≤5적용한기존근거철회. L110~121 깨진코드가독성은실제결함이라6으로조정(5→6). |
| G | 2 | L511~513 공식DT/커널자료는목록,개별reg/binding/overlay근거없음.2 동의. |

판정: 우선 조치. 병합 후보 Recipes DT기초의 문법 개요. BSP의 SoC/board계층·검증 흐름은 보강.

## 기계 검산

10행 A~G 합계/이전 대비 차이/판정 우선순위/필수필드/상한을 검사했다. 합계548, 평균54.8, 이전541, 차이+7. 모든 B≤13·C≤8·E≤8·F<9. 표준 만점 범위 검사와 AP-C-24 조건부 상한을 별개로 확인했다. 이 검산은 내용의 자동 채점이나 전체 기술 검증을 뜻하지 않는다.
