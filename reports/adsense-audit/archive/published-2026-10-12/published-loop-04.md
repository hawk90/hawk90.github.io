# 공개 글 AdSense 평가 — 루프 04

> 대상: 공개 글 10편 (Bootloader Internals `seriesOrder` 31~37, BSP Development `seriesOrder` 1~3)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 네 번째 루프다. 대상은 `src/content/blog/embedded/bootloader/`의 `chapter31-tfa-bl31-runtime.md`~`chapter37-secureboot-cert-rollover.md` 7편(Bootloader Internals 마지막 7편)과 `src/content/blog/embedded/bsp/`의 `chapter01-what-is-bsp.md`~`chapter03-device-tree-design.md` 3편(BSP Development 첫 3편)이다. ch31~34는 frontmatter에 `draft` 필드가 없고, 나머지 6편은 `draft: false`다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `bootloader/chapter31-tfa-bl31-runtime.md` | 14 | 12 | 7 | 9 | 5 | 7 | 2 | **56** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `bootloader/chapter32-psci-smccc.md` | 13 | 13 | 6 | 10 | 7 | 7 | 3 | **59** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `bootloader/chapter33-smp-secondary-cpu-bringup.md` | 15 | 13 | 7 | 8 | 8 | 5 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `bootloader/chapter34-pcie-enumeration.md` | 10 | 10 | 5 | 9 | 5 | 5 | 1 | **45** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `bootloader/chapter35-uefi-cxl-init.md` | 10 | 11 | 5 | 10 | 5 | 4 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `bootloader/chapter36-boot-memory-topology.md` | 11 | 11 | 6 | 9 | 6 | 4 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `bootloader/chapter37-secureboot-cert-rollover.md` | 17 | 13 | 8 | 13 | 7 | 5 | 3 | **66** | 오류 확인 | 우선 조치 | 중간 | `part12-10-on-device-llm.md`, `part1-04-uart-hardware.md` |
| `bsp/chapter01-what-is-bsp.md` | 13 | 12 | 5 | 10 | 8 | 5 | 2 | **55** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `bsp/chapter02-datasheet.md` | 13 | 12 | 7 | 10 | 7 | 5 | 3 | **57** | 오류 확인 | 우선 조치 | 높음 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `bsp/chapter03-device-tree-design.md` | 12 | 10 | 7 | 9 | 6 | 5 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |

평균 54.1점(10편 합 541), 범위 45~66점이다. 판정은 우선 조치 8편, 보강 1편, 병합 검토 1편이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 8편(bootloader ch31·32·33·34·36·37, bsp ch02·03)이고, bsp ch02만 1차 자료(mainline Linux v6.12 `imx8mp.dtsi`·`imx8mp-pinfunc.h`·`imx8mp-evk.dts`)를 직접 열어 확인했으며 나머지 7편은 원문 내부 모순(루브릭 3-1)으로 판정했다. 점수 구간으로는 ch37만 보강(60~79)이고 나머지 9편은 병합 검토(40~59)다. bsp ch01은 BSP Development 첫 글이자 로드맵을 가진 허브라 루브릭 5절 예외로 보강에 뒀다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·draft 상태까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `bootloader/chapter31-tfa-bl31-runtime.md` | 57 | 56 | -1 | 없음 |
| `bootloader/chapter32-psci-smccc.md` | 59 | 59 | 0 | 없음 |
| `bootloader/chapter33-smp-secondary-cpu-bringup.md` | 59 | 58 | -1 | 없음 |
| `bootloader/chapter34-pcie-enumeration.md` | 45 | 45 | 0 | 없음 |
| `bootloader/chapter35-uefi-cxl-init.md` | 47 | 46 | -1 | 없음 |
| `bootloader/chapter36-boot-memory-topology.md` | 48 | 48 | 0 | 없음 |
| `bootloader/chapter37-secureboot-cert-rollover.md` | 66 | 66 | 0 | 없음 |
| `bsp/chapter01-what-is-bsp.md` | 57 | 55 | -2 | 없음 |
| `bsp/chapter02-datasheet.md` | 61 | 57 | -4 | 있음 |
| `bsp/chapter03-device-tree-design.md` | 53 | 51 | -2 | 없음 |

1차 합 552에서 최종 541로 11점 내려갔다. 부풀림(AP-C-24)은 bsp ch02 1편이다. 평가자는 348~349행 '원문 — … Reference Manual' 라벨이 제품 페이지로 가는 것을 보고도 F 7을 줬고, 1차 자료로 확인되는 메모리 맵 오류를 uncertainties에만 두었다.

- 기각한 오류 확인: 없음. ch32에서 평가자가 355행(A72) 대 370행(i.MX 8M Plus 로그) 모순의 근거로 든 'MIDR 0x410fd034 = A53'은 기억에 기댄 판단이라, 같은 글 269·276행 DT(`arm,cortex-a53`)로 근거를 바꿨다. 결론은 그대로다.
- 추가한 오류 확인: 13건, 5편.
  - ch31: 72행 '4-core라면 stack 영역만 16~32 KB × 4'(코어당 16~32 KB) vs 369행 'PLATFORM_STACK_SIZE(보통 0x1000 = 4 KB)가 한 CPU의 EL3 stack 크기'. factcheck 미검증 → 오류 확인, 판정 병합 검토 → 우선 조치.
  - ch32: 28행 그림 'x0~x7 = 결과' vs 31·49행 '4개 결과'. 49행 'a1~a7이 인자' vs 31행 '6개 인자'. 110행 머리글 'ID (SMC64)' vs 75·93행 0x8400 ID는 SMC32. 204행 vs 207행 `imx_pwr_domain_on` 파일 경로 두 개.
  - ch36: 105행 SLIT 'same socket 20~30' vs 114·117행 같은 소켓 HBM 노드 distance 17.
  - bsp ch02: 47행 IOMUXC, 49행 UART1, 50행 GPIO1 주소, 120행 SAI5_RXFS ALT5 GPIO3_IO21, 244~248행 UART2_RXD ALT 표, 229행 'GIC_SPI 26'의 위치(evk.dts 0건, 실제는 imx8mp.dtsi 1077행). factcheck 미검증 → 오류 확인, 판정 보강 → 우선 조치.
  - bsp ch03: 123행 'unit-address가 *부모 노드의 reg 첫 셀*과 일치' vs 466~472행 `mdio`(reg 없음) 아래 `ethernet-phy@1`/`reg = <1>`, 226~228행 루트 아래 `memory@40000000`. factcheck 미검증 → 오류 확인, 판정 병합 검토 → 우선 조치.
- 점수 변경: ch31 E 6→5(제목의 'PSCI·SDEI·RAS dispatcher 추적'에 본문이 개념 소개 수준), ch33 C 8→7(유일한 관찰 자료인 부트 로그를 432행이 잘못 해석), ch35 A 11→10(158·169행 근거 없는 단정), bsp ch01 B 13→12·F 6→5(15·40·190행 범위 정의 충돌, 40·143행 틀린 읽기 안내), bsp ch02 A 14→13·B 13→12·F 7→5, bsp ch03 B 11→10·F 6→5(507행 옛 제목 라벨, 110~121행 깨진 코드 블록).
- 근거 정정: D 비교 줄 번호를 직접 연 줄로 바꿨다(ch31의 ch25 76~96·100·133~140행, bsp ch07 330~340·389행; ch32의 ch31 104행, bsp ch07 162~173·211~236행; ch33의 bsp ch09 90~96행; ch34의 `src/content/blog/embedded/hardware/...` 실제 경로; bsp ch01의 bootloader ch01 65~70·108~130행, bsp ch10 24~40행; bsp ch02의 chapter04 23~34·54~58·73~88행).
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. F ≤ 5가 걸린 원인은 틀린 다음 편·마무리 안내(ch33 472~474행, ch35 224행, ch36 15·17·309행, ch37 167~169행), 다른 시리즈 'Ch N' 번호 오류(ch34 155·263·264행, ch35 233행, ch36 326행), 라벨이 대상과 다름(bsp ch02 343·348·349행, bsp ch03 507행), 틀린 읽기 안내(bsp ch01 40·143행)다.

## 글별 근거

### `bootloader/chapter31-tfa-bl31-runtime.md` — 56점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 수치 모순(루브릭 3-1). 72행 'Stack은 CPU 코어 수만큼 따로 잡혀 있어 4-core라면 stack 영역만 16~32 KB × 4를 차지합니다'(코어당 16~32 KB) ↔ 369행 'TF-A의 PLATFORM_STACK_SIZE(보통 0x1000 = 4 KB)가 한 CPU의 EL3 stack 크기입니다 … 0x2000으로 늘리거나'(코어당 4~8 KB). 같은 양의 '보통' 값이 4~8배 다르다. 369행 값으로 계산하면 4~8 KB × 4 = 16~32 KB라 72행의 '× 4'가 잘못 붙은 것으로 보이지만, 적힌 그대로는 둘 다 참일 수 없다. git log(ea755e1a 신규, 96c25d7f 다이어그램, ac24bb76 제목, 26cae127 톤, be973200 topic, 0a9dd7bc slug)에는 TF-A upstream·SMCCC·PSCI와 대조한 커밋이 없어, 이 오류가 없더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | DECLARE_RT_SVC 매크로(78~104행) → runtime_svc_init의 OEN 인덱스 테이블(110~138행) → handle_sync_exception EC 분기(155~166행) → handle_runtime_svc(174~196행)로 등록·dispatch 모델을 한 줄기로 설명하고, 서비스별 'EL3에 있어야 하는 이유' 표(204~210행)와 함정 절(361행 .rt_svc_descs 링크 스크립트 누락과 objdump 확인, 377행 console flush 누락)은 이 글만의 관점이다. 다만 코드가 모두 '간략화'이고 TF-A 버전이 없으며, SDEI(220~233행)·RAS(237행)는 개념 소개 수준이다. 13~19 구간 하단. |
| B | 12 | 부트/런타임 두 단계(18~47행) → 메모리 위치(49~72행) → 등록 모델 → SMC 진입 → 서비스 → bl31_main → latency → entrypoint → 함정 → 정리(381~388행)로 기본 흐름은 완성된다. 그러나 RAS는 237행 한 문단, SDEI는 커널 측 의사 코드(222~231행)뿐이고, 부트 단계의 entrypoint 어셈블리(319~355행)가 latency 절 뒤에 와 순서가 끊긴다. 72행↔369행 모순과 283·355·365행 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | objdump로 .rt_svc_descs 섹션을 확인하는 명령(361행), reserved-memory DTS(60~70행), PLATFORM_STACK_SIZE·ENABLE_STACK_PROTECTOR 대응(369행)은 따라 할 수 있는 단서다. SMC latency 표(298~305행)와 비교 블록(309~315행)은 296행 'Cortex-A53 1.5 GHz 기준 측정값'뿐이고 SoC·TF-A 버전·측정 방법·출처가 없어 C ≤ 8. 72행 100 KB·1 MB, 307행 CPU_ON 10~100 µs도 출처가 없다. 코드가 '간략화'라 그대로 실행·대조할 수 없다. |
| D | 9 | 비교한 글: 같은 시리즈 `chapter30-bootloader-ci.md`(겹침 없음), `chapter32-psci-smccc.md`, `chapter25-tfa-optee.md`, 다른 시리즈 `bsp/chapter07-tfa-trustzone.md`, `embedded-security/chapter04-trustzone.md`. 58~70행 0xBE00_0000 carveout·reg 값·bus error ↔ ch25 76~96행. 14·381행 'BL31 상주' ↔ ch25 65·100행. 204~210행 서비스 표 ↔ ch25 133~140행, security ch04 83~91행. 106행 OEN 범위 ↔ ch32 74~91행. 298~315행 latency ↔ ch32 353~364행. 78~88·140~198행 ↔ bsp ch07 330~340·389행. runtime_svc_init 인덱스 구성(110~138행)은 이 글에만 있다. 5~9 구간. |
| E | 5 | 제목(2행)이 'PSCI·SDEI·RAS dispatcher 추적'을 약속하지만 공통 dispatcher(174~196행)만 코드로 따라가고, PSCI는 216행에서 Ch 32로 넘기고, SDEI는 커널 측 의사 코드(222~231행), RAS는 237행 한 문단이다. '분석·추적 약속 + 개념 소개 본문 = 3~5'. description(5행)의 runtime_svc 등록·vector entry·SMC latency는 이행해 3까지는 내리지 않았다. |
| F | 7 | 16행이 Ch 25를 전제 글로 명시하고 172행 다이어그램이 140~198행 코드 흐름을 묶는다. 392행 다음 편은 seriesOrder 32 `chapter32-psci-smccc.md`와 맞다. 396~402행 관련 항목 7개(ch04·25·32·33, security ch04·ch05, rtos part4-11)를 열어 번호·주제가 맞음을 확인했다. 라벨은 ac24bb76 이전의 'Ch N:' 표기지만 번호는 틀리지 않았다. entrypoint 절 순서와 모바일 렌더링 미확인으로 9 이상은 주지 않았다. |
| G | 2 | 403~404행에 TF-A firmware design(latest)과 Arm SMCCC(DEN0028) 링크, 코드 블록에 upstream 경로(79·93·111·145·175·244·324행)가 있다. TF-A 버전·태그가 없고 코드가 '간략화'다. 404행 라벨은 'SMCCC v1.4'인데 365행은 'SMCCC v1.0'을 근거로 든다. latency 표(298~305행)에는 출처가 없다. |

uncertainties:
- 72행 '100 KB 본체·1 MB carveout'은 출처가 없고 `chapter25-tfa-optee.md` 78행은 BL31을 '~64 KB'로 적었다(다른 글과의 모순).
- 58·65~66행 BL31을 DDR 0xBE00_0000에 둔다는 설명과 `bsp/chapter07-tfa-trustzone.md` 124행(entry 0x970000, SRAM)·446행(DDR에 두면 fault)이 다르다. TF-A `plat/imx/imx8m/imx8mp/include/platform_def.h`로 확인 필요.
- 79~87행 std_svc DECLARE_RT_SVC 위치(include/services/std_svc/psci.h), 175행 handle_runtime_svc의 bl31/bl31_main.c 위치 미확인.
- 204·208행 SDEI·RAS의 OEN 0x04 분류와 RAS의 별도 SMC 서비스 등록 여부 미확인.
- 220·386행 'SDEI는 SecurePartition NMI에 해당' 출처 미확인(DEN0054).
- 283행 `mp_state`는 글 안에 정의가 없고 upstream next_image_type 처리와 다를 가능성.
- 355행 el3_entrypoint_common이 'MMU 켜기 전 준비'라면서 같은 문장에서 MMU 활성화까지 한다고 쓰고, 345행·27행 그림은 MMU 설정을 별도 단계로 둔다.
- 365행 'SMCCC v1.0은 x0~x17을 caller-saved'는 `chapter32-psci-smccc.md` 31행('나머지 register는 callee가 보존')과 어긋난다. DEN0028 대조 필요.
- 307행 'hvc #0는 SMC 대비 동일 latency' vs 312·313행 HVC ~120 ns, SMC ~130 ns. 근사 표현이라 오류로 올리지 않았다.
- 298~315행 수치는 측정 방법·출처가 없고 `bsp/chapter07-tfa-trustzone.md` 354행은 같은 round trip을 'μs 단위'라고 적었다.
- 216행 i.MX 8M Plus SRC 일부 register가 secure-only라는 주장, 373행 `cm_set_next_eret_context()` 존재 미확인.

점수 구간 메모(병합 검토): 판정은 오류 확인으로 우선 조치다. 병합 대상 후보는 `src/content/blog/embedded/bootloader/chapter25-tfa-optee.md`(메모리 carveout·서비스 표 중복)와 `src/content/blog/embedded/bsp/chapter07-tfa-trustzone.md`(SMC 경로·DECLARE_RT_SVC 중복)다. 다음 조치는 보강: 'BL31 runtime_svc 내부 구조'는 독립 검색 의도라 차별화한다. 72행↔369행을 TF-A PLATFORM_STACK_SIZE 기본값으로 고치고, 58~72행은 ch25 링크로 줄이고, TF-A 버전을 고정해 코드를 upstream과 대조하고, latency 표는 출처를 찾거나 TBD로 두고, PSCI·SDEI·RAS dispatcher 추적을 제목 약속대로 채운다.

### `bootloader/chapter32-psci-smccc.md` — 59점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1, 예시 출력 대 산문). (1) 370~379행 dmesg 타임스탬프로 계산하면 CPU1 201 µs, CPU2 186 µs, CPU3 189 µs, 4개 모두까지 706 µs인데, 382행은 'CPU1~CPU3 각각이 ~100 µs 안에 올라온다', 367·455행은 '4-core를 모두 깨우면 약 100~200 µs'라 한다. (2) 355행 측정 환경 '4-core Cortex-A72 1.5 GHz' vs 370행 로그 제목 i.MX 8M Plus, 같은 글 269·276행 DT `arm,cortex-a53`. (3) 26행 그림 'x1~x7 = 인자'·49행 'a1~a7이 인자' vs 31행 'AArch64는 6개 인자', 28행 'x0~x7 = 결과' vs 31·49행 '4개 결과'(35~40행 a0~a3). (4) 110행 머리글 'ID (SMC64)' 아래 0x8400_xxxx ID vs 75행 bit30=0은 SMC32, 93행 '0x8400_0002 … CPU_OFF(SMC32)'. (5) 204행 'imx_pwr_domain_on()은 plat/imx/common/imx8_psci.c' vs 207행 주석 'plat/imx/imx8m/imx8mp/imx8mp_psci.c'. git log(0a9dd7bc, be973200, 26cae127, ac24bb76, 20c1b507 등)는 URL·메타데이터·톤·제목·다이어그램 커밋뿐이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 93행에서 0xC400_0003·0x8400_0002를 비트필드로 풀고, 167~204행 TF-A psci_cpu_on 검증 순서를 Linux 호출(300~321행)과 이어 붙인 구조는 이 글 고유다. 함정 절의 MPIDR(419행), CPU_OFF 뒤 BUG()(423~433행), MIGRATE_INFO_TYPE(441행)은 선택 기준을 준다. 72~91·110~139행 표는 사양을 옮긴 것이고 351행 '의심해야 합니다', 445행 'spec과 대조해 봅니다'는 완곡 표현이다. 353~382행 측정은 로그와 모순이라 고유 결과로 인정하지 않는다. |
| B | 13 | SMCCC(18~62행) → function ID(64~93행) → fast/yielding(95~104행) → PSCI 카탈로그·return code(106~141행) → CPU_ON(143~229행) → CPU_SUSPEND(231~253행) → Linux driver(255~321행) → version 점검(323~351행) → 측정(353~382행) → SMCCC version(384~409행) → 함정(411~445행) → 정리(447~456행)로 완성됐다. 120·437행 SYSTEM_RESET, 177·180행 unsigned 비교, 218행 음수 shift 불확실이 열려 있어 B ≤ 13. 253행 cpuidle 설명은 한 문장이다. |
| C | 6 | 코드(33~60, 157~222, 300~349, 388~406행)와 DT 예(259~296행)에 실행 환경·예상 결과가 없다. 207행은 '의사 코드'이고 217행 val은 선언이 없다. 357~365행 latency 표는 측정 방법 없는 수치라 C ≤ 8이고, 355행 환경과 370행 로그가 다르며 로그가 382·367행 결론과 맞지 않아 측정 근거로 쓸 수 없다. 415행 /sys/kernel/debug/psci 확인은 예상 출력이 없다. |
| D | 10 | 비교한 글: `chapter31-tfa-bl31-runtime.md`, `chapter33-smp-secondary-cpu-bringup.md`, `chapter25-tfa-optee.md`, `bsp/chapter07-tfa-trustzone.md`, `bsp/chapter09-smp-bringup.md`. 82~91행 OEN 표 ↔ ch31 104행. 110~123행 PSCI ID 표 ↔ ch25 286~292행. 259~296행 psci DT ↔ ch25 297~307행, bsp ch07 211~236행, bsp ch09 59~64행. 206~222행 ↔ bsp ch07 162~173행(같은 함수, 다른 본문). 353~382행 ↔ ch31 294~317행, ch33 397~414행. 419·423행 ↔ ch33 355~395행. function ID 비트 구조·fast/yielding·return code·power_state 인코딩(64~141, 231~253행)은 이 글에만 있다. |
| E | 7 | 제목 'PSCI와 SMCCC ABI — ARM 표준 SMC 호출 규약 분석'과 description(function ID 구조, fast vs yielding, CPU_ON·CPU_SUSPEND, Linux PSCI driver)이 64~93, 95~104, 143~253, 255~321행에 대응한다. 측정 절(353~382행)이 무너져 있고 도입(16행)에 대상 독자·문제가 없어 9 이상은 주지 않았다. |
| F | 7 | 460행 다음 편 'Ch 33'은 seriesOrder 33 파일과 맞고, 안내한 내용이 ch33 30·202·310·355행 절과 일치한다. 464~470행 관련 항목 7개(ch04·25·31·33, RTOS part2-06·part4-12, Security ch04)는 대상과 맞다. 16행 전제(Ch 31), 225행 Ch 33 안내가 있다. audit:reading 미확인으로 9 불가, 측정 절 결론이 로그와 어긋나 8도 주지 않았다. |
| G | 3 | 코드에 upstream 경로 주석(34·52·170·301·328·389행), 471~472행에 DEN0022(PSCI v1.1)·DEN0028(SMCCC v1.4) 링크가 있다. 커널·TF-A 버전이 없고(커널 6.6은 370행 로그 제목뿐) 170·328행 '간략화', 207행 '의사 코드'다. 사양 링크는 본문 표와 절·표 번호로 연결되지 않는다. |

uncertainties:
- 120·437행 SYSTEM_RESET을 'warm reset'이라 적었다. 기억으로는 SYSTEM_RESET은 cold reset, warm reset은 SYSTEM_RESET2다. DEN0022 미확인.
- 122행 CPU_FREEZE를 'OS-initiated suspend 변종'이라 설명. 미확인.
- 108·452행 'PSCI v1.1 함수 30개 이상' 개수를 DEN0022 목록과 대조하지 않았다.
- 159행 `mov x0, #0xC4000003`이 단일 MOV 즉시값으로 인코딩되는지 미확인.
- 177·180행 `unsigned int target_idx`의 '< 0' 비교는 항상 거짓(언어 규칙 코드 결함).
- 218행 core_id 0이면 음수 shift, 217행 val 선언 없음(207행이 의사 코드라 밝힘).
- 204·207행 경로와 bsp ch07 162행(plat/nxp/imx/...) 중 TF-A 트리의 실제 위치 미확인.
- 253행 cpuidle-arm의 StateID 자동 생성과 445행 arm,psci-suspend-param 설명의 관계 미확인.
- 246~251행 i.MX 8M Plus StateID 표는 출처 없는 값.
- 415행 PSCI_OS_INIT_MODE=1 빌드 옵션과 /sys/kernel/debug/psci 노드 미확인.
- 386·404행 ARM_SMCCC_VERSION 도입 버전, smccc_trng 등록 조건 미확인.
- 다른 글과의 모순: ch31 307·314행 CPU_ON 10~100 µs, ch33 407~411행 4-core ~1 ms, 이 글 367·455행 100~200 µs.

점수 구간 메모(병합 검토): 병합 대상 없음. function ID 비트 구조·fast/yielding·return code·power_state 인코딩은 다른 글에 없는 독립 검색 의도라 합치지 않는다. 다음 조치는 보강: 353~382행 측정 절을 로그와 맞추거나 산문을 지우고 표는 TBD, 26·28·31·49행 인자·결과 개수를 DEN0028로 통일, 110행 머리글과 204·207행 경로 수정, SYSTEM_RESET·CPU_FREEZE·'30개 이상'을 DEN0022와 대조, 겹치는 PSCI ID 표·DT 예는 ch25·bsp 글과 역할을 나눈다.

### `bootloader/chapter33-smp-secondary-cpu-bringup.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1, 예시 출력과 산술). 432행은 "`Booted secondary processor` 사이의 timestamp 차이가 한 CPU bring-up 시간"이고 "약 100 µs 단위로 올라온다"고 한다. 같은 글 부트 로그 421·424·427행은 0.087701 → 0.087966 → 0.088232라 차이가 약 265 µs이고, 409행(CPU1 총합 ~300 µs)·469행(CPU당 ~300 µs)도 같은 값을 말한다. git log(0a9dd7bc slug, be973200 topic, 26cae127 톤, ac24bb76 제목, 03012dec 텍스트 블록 변환 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | secondary_entry → secondary_startup → __secondary_switched 어셈블리(206~266행), sp_el0에 task_struct를 두어 `current`가 동작하는 이유(269행), TPIDR_EL1 percpu offset 설정 전 접근 위험(312~329행), GIC CPU interface를 secondary에서 직접 초기화해야 하는 이유(353행), 함정 6개(436~458행)가 고유하다. PSCI/spin-table 표(60~67행)와 DT 예(100~114행)는 커널 문서 수준이고, 157행 `__flush_dcache_area`와 208행 `SYM_CODE_START`·`init_kernel_el`처럼 시기가 다른 API가 섞여 있다. |
| B | 13 | spin-table vs PSCI(30~69행) → smp_init/__cpu_up(126~160행) → cpu_psci_cpu_boot(188~200행) → 어셈블리(202~267행) → secondary_start_kernel(271~308행) → percpu·GIC(310~353행) → hotplug(355~395행) → 측정(397~432행) → 함정(434~458행) → 정리(460~470행)로 완결이다. 188행 경로, 290·331행 cpu_postboot GIC 초기화, 157/208행 API 시기 불확실로 B ≤ 13. |
| C | 7 | 399행 환경(i.MX 8M Plus, 4-core A53 1.5 GHz, kernel 6.6)은 있지만 측정 방법·출처가 없고 401~411행은 근사치라 C ≤ 8. 유일한 관찰 자료인 417~430행 부트 로그를 432행이 잘못 읽는다(약 265 µs를 약 100 µs로). 함정 절(438·458행)은 dmesg 문구 단서일 뿐 기대 관찰이 있는 절차가 아니다. 상한 8에서 1점 더 뺐다. |
| D | 8 | 비교한 글: `chapter32-psci-smccc.md`, `chapter34-pcie-enumeration.md`(겹침 없음), `bsp/chapter09-smp-bringup.md`, `rtos/practical-internals/part4-07-smp-rtos.md`(겹침 없음). `cpu_psci_cpu_boot` 코드(189~195행 ↔ bsp ch09 90~96행)와 spin-table `cpu-release-addr` 형태(106행 ↔ bsp ch09 113행), spin-table/PSCI 비교·hotplug 설명이 겹친다. ch32와 CPU_ON 흐름·측정 절이 겹친다. 이 글에만 있는 것은 202~353행 어셈블리·percpu·GIC 설명이다. |
| E | 8 | 제목 'PSCI CPU_ON 호출부터 EL1 진입까지'(2행)와 description(5행)을 30~395행이 다룬다. 본문은 EL1 진입 뒤 secondary_start_kernel·idle(271~308행)과 hotplug(355행)까지 가서 제목 범위와 어긋나고 대상 독자·문제가 없어 9 이상은 주지 않았다. |
| F | 5 | 480~488행 관련 링크 9개와 476행 링크 2개의 라벨은 대상과 맞다. 그러나 472~474행이 이 장을 시리즈의 '마지막 깊이', '마지막 세 장(31·32·33)'이라 하는데 같은 디렉터리에 seriesOrder 34(`draft` 표기 없음)와 35~37(`draft: false`)이 있다. 틀린 다음 편 안내로 F ≤ 5. |
| G | 2 | 489~490행 PSCI DEN0022와 booting.rst는 글 끝 목록이고 특정 주장에 묶이지 않는다. 코드 주석의 소스 경로(129·147·188·207·315·334행)에 커널 버전이 없다. 버전 표기는 399행 'kernel 6.6'뿐이다. |

uncertainties:
- 106·113행 `cpu-release-addr = <0x0 0x70000fff8>`·`<0x0 0x70000fff0>` 두 번째 셀이 9자리 16진수라 32-bit 셀에 안 들어가 보인다(bsp ch09 113행도 같음). DT 명세 미확인.
- 188행 `cpu_psci_cpu_boot` 위치를 `drivers/firmware/psci/psci.c`로 적음. arch/arm64/kernel/psci.c일 가능성, 미확인.
- 157행 `__flush_dcache_area`와 208행 `SYM_CODE_START`·`init_kernel_el`이 399행 kernel 6.6과 맞는지 미확인.
- 290·331·442행 GIC CPU interface를 `cpu_ops->cpu_postboot`에서 초기화한다는 설명. cpuhp 콜백일 수 있음.
- 66행 spin-table을 'ARMv8 옛 spec'이라 함. Linux booting 문서가 정의처일 가능성.
- 397~411행 측정값 출처 없음. ch32 결론(100~200 µs)과 다름(다른 글과의 모순).
- 438·458행 커널 메시지 문자열 실재 여부 미확인.
- 448행 제목('MMU enable 전에')과 450행 본문('set_my_cpu_offset 이전') 조건이 다르다.

점수 구간 메모(병합 검토): 판정은 오류 확인으로 우선 조치다. 432행 해석을 로그와 맞추거나, 측정 출처를 확인하지 못하면 397~432행 측정 절을 지운다. 병합 후보는 `src/content/blog/embedded/bsp/chapter09-smp-bringup.md`(비교 절·cpu_psci_cpu_boot·hotplug 중복)와 `src/content/blog/embedded/bootloader/chapter32-psci-smccc.md`(CPU_ON·측정 중복)다. 다음 조치는 보강: 어셈블리·percpu·GIC 고유 분석이 있으므로 bsp ch09와 겹치는 비교 절은 링크로 줄이고 secondary 경로 코드를 한 커널 버전에 고정해 upstream과 대조한다. 472~474행 시리즈 마무리 문구도 ch34~37에 맞게 고친다.

### `bootloader/chapter34-pcie-enumeration.md` — 45점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 16행은 U-Boot이 "각 디바이스의 BAR을 sizing하고 메모리 공간을 할당해 DTB의 ranges 속성에 기록한 뒤 커널에 넘깁니다"라고 하고 250행 정리도 "enumeration 결과는 DTB의 ranges와 동적 노드로 커널에 인계"라 한다. 그런데 162~164행 "부트로더가 update한 후의 DTB"는 `ranges = <...>; // RC window 그대로`로, 107·114~117행에서 RC window 입력값이던 ranges를 바꾸지 않는다. 두 진술은 동시에 참일 수 없다. git 이력(23ed6256 'qualify or remove suspect claims', be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 기록이 없다. U-Boot 소스·CXL 규격은 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | RC 초기화 표(26~34행), 깊이우선 config scan(42~71행), BAR sizing(77~89행)은 PCIe 입문서의 표준 흐름이다. 코드가 "U-Boot drivers/pci/pci.c (단순화)"(43행), "drivers/pci/pci_cxl.c (개념적)"(128행)이라 U-Boot 고유 분석이 없고 실제 `pci` 명령·driver model 경로도 없다. 고유한 것은 link training 실패를 enumeration 실패로 오인하는 경우(193~201행)와 hot-plug 책임 경계(234~241행) 정도다. 220행은 완곡 표현이다. 앵커 part1-04(A 10) 수준. |
| B | 10 | RC init → scan → BAR sizing → resource 할당 → DVSEC → DTB 인계 → 함정 → 정리(20~251행)로 끝까지 간다. scan 코드(57~61행)가 subordinate bus를 쓰지 않아 bridge 라우팅을 닫는 부분이 빠졌고, CXL 결과를 ACPI CEDT(153·249행)와 DTB 노드(167~171·250행) 중 어디로 넘기는지 DT 기반 보드 기준으로 정리되지 않는다. B ≤ 13(AP-C-24). |
| C | 5 | 실행 가능한 U-Boot 명령·보드·U-Boot 버전이 없다. 로그(197~198·206·238행)는 출처 없는 예시다. 71행 "수십~수백 ms", 91행 "512 GB~2 TB", 209행 "최소 64 GB 권장"은 출처·환경 없는 수치라 C ≤ 8. BAR sizing 산술(85~86행)과 window 산술(100·115행)은 맞지만 관찰 결과·검증 절차가 없다. |
| D | 9 | 같은 시리즈 `chapter33`(겹침 없음), `chapter35-uefi-cxl-init.md`(UEFI·CEDT 생성, 역할 갈림). 다른 시리즈 `modern-recipes/part11-03-pcie-bar.md` 55~85행(orig 저장 → 0xFFFFFFFF 쓰기 → mask → 복원, Vendor 0xFFFF, bridge 재귀)이 이 글 42~71·77~89행과 거의 같다. `hardware/cxl/chapter06-cxl-io.md` 44~71행, `hardware/pcie/chapter03-config-space.md` 119~155행이 이 글 123~153·222~232행과 겹친다. DTB ranges로 RC window를 정하는 부트로더 관점은 이 글만의 역할이다. |
| E | 5 | 제목이 "U-Boot PCIe Enumeration … 흐름 분석"(2행)을 약속하지만 본문 코드는 "단순화"(43행)·"개념적"(128행) 의사 코드라 개념 소개 수준이다(3~5). description(5행)의 항목은 모두 절이 있다(20·38·73·93·123행). |
| F | 5 | 255행 다음 편 Ch 35는 seriesOrder 35 `chapter35-uefi-cxl-init.md`와 맞고, 259·260·262행 라벨은 대상 title과 맞다. 263행 "Modern Embedded Recipes Ch 149"의 대상 part11-15-pcie-to-cxl은 seriesOrder 150, 155·264행 "Ch 151"의 대상 part11-17-linux-cxl-driver는 seriesOrder 152라 번호가 틀렸다(F ≤ 5). 전제 지식 안내는 16행 Ch 19 언급뿐이다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 버전 표기는 125행 "Modern U-Boot (2024+)"뿐이고 CXL·PCIe 규격 판, 대상 SoC가 없다. 43·128행 파일 경로는 '단순화'·'개념적' 표시라 출처 역할을 하지 못한다. |

uncertainties:
- 128행 `drivers/pci/pci_cxl.c`, 125행 "Modern U-Boot (2024+)은 DVSEC scan 추가"의 upstream 존재 미확인.
- 141·153·249행 U-Boot이 ACPI CEDT 항목을 추가한다는 주장, 168·170행 `cxl,memory-device`·`cxl,dvsec-rev` 바인딩 존재 미확인.
- 167행 unit-address `@5e000000`과 169행 reg 첫 주소(0x80_00000000)가 다르고, 169행은 PCIe 자식 노드의 3-cell 주소 형식과 맞지 않을 수 있다.
- 91행 "HDM Decoder는 64-bit BAR로 노출" — component register 블록인지 CXL 규격 미확인.
- 179·184행 Jetson Orin PCIe 5.0 RC·CXL.mem 인식 주장 미확인.
- 44~68행 `int` 반환 함수에 return이 없고 subordinate bus 처리, `pci_hose_scan_bus` 시그니처 일치 여부 미확인.
- 116행 ranges 64-bit 항목의 PCI 주소와 CPU 주소가 다른데 121행은 CPU 쪽 범위만 설명한다.
- 71·209행 수치, 197·206행 로그 문자열은 출처 없는 수치·예시다.

점수 구간 메모(병합 검토): 병합 대상 없음. 일반 BAR sizing은 `modern-recipes/part11-03-pcie-bar.md`(55~85행)와 겹치지만, 부트로더가 DTB ranges로 RC window를 정하고 커널에 넘긴다는 질문은 Bootloader Internals에만 있다. 다음 조치는 보강: 16·250행과 164행 ranges 모순을 U-Boot 소스로 확인해 고치고, 일반 BAR sizing은 part11-03 링크로 줄이고, U-Boot driver model 경로·`pci` 명령 출력을 버전과 함께 넣는다.

### `bootloader/chapter35-uefi-cxl-init.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. aeedacc4는 Linux `include/acpi/actbl1.h`(struct acpi_cedt_cfmws), `drivers/cxl/acpi.c`, CXL 3.1 용어집과 대조했지만 'Coherency Domain ID' 절을 지운 것뿐이고, 커밋 본문에 "The rest of the chapter has not been fact-checked (SLIT distances, the firmware-committed decoder message)"라 적었다. 23ed6256은 출처 없는 qualify/stub 확장, 0a9dd7bc·be973200·e85d7684·0ec69ea9는 사실 대조 커밋이 아니다. 로컬에 linux·edk2 clone이 없어 1차 자료를 열지 못했다. 글 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다(131~132행과 208행은 양립, 73행 0x10000=64 KB 산술 맞음).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 고유한 부분은 U-Boot·UEFI 비교 표(23~30행), CEDT subtable 목록(52~59행), CFMWS 여러 개 예(92~94행), 실수 네 가지(171~211행)다. 27·30행 '비교적 늦음'·'spec 발표 직후'는 근거 없는 일반론이고 36·46행은 완곡 표현이다. 158행 '실 BIOS와 동일한 path', 169행 '핵심 코드는 공통'도 근거 없는 단정이다. 실수 절 로그(177~178·190·199행)는 출처·커널 버전이 없다. 앵커 part1-04(A 10)와 같은 수준. |
| B | 11 | U-Boot와의 차이(19~32행) → 모듈 역할(34~46행) → CEDT/CHBS/CFMWS(48~94행) → HDM 사전 설정(96~107행) → SRAT·HMAT(109~121행) → SPDM(123~134행) → QEMU(136~158행) → 상용 BIOS(160~169행) → 실수(171~211행) → 정리(213~220행)로 끝까지 간다. 제목의 'HDM Decoder 사전 설정'은 100~103행 이유 세 줄과 105~107행 모드 설명뿐이고 레지스터 commit 순서가 없다. ENIW·HBIG(85~86행)는 이름만 있고 131~132행 'CEDT에 active/disabled 표시'는 필드가 없다. B ≤ 13. |
| C | 5 | QEMU+OVMF 명령(140~156행)은 디바이스 옵션이 '[CXL device options...]'(150행)로 비어 있고 예상 출력은 155행 주석뿐이다. 144행 '-D CXL_ENABLED=TRUE'는 출처가 없다. 84행 512 GB, 118행 'distance 50~80'은 출처·환경이 없어 C ≤ 8. 측정·관찰 결과가 없다. |
| D | 10 | 비교한 글: `chapter34-pcie-enumeration.md`, `chapter36-boot-memory-topology.md`, `hardware/cxl/chapter12-qemu-emulation.md`, `hardware/cxl/chapter11-linux-driver.md`, `modern-recipes/part11-16-qemu-cxl-emulation.md`. 109~121행 SRAT·HMAT·SLIT ↔ ch36 51~111·303~304행. 195~202·105~107행 ↔ ch36 187·291~298·305행. 52~75·136~158행 ↔ CXL ch12 103~117·29~47행. ch34와는 CEDT 예고 수준이다. 'UEFI가 CEDT를 만들고 HDM을 미리 commit'하는 질문은 이 글에만 있다. 10~14 하단. |
| E | 5 | 제목·description(5행)이 'CEDT 생성', 'HDM Decoder 사전 설정'을 약속한다. CEDT 구조 설명(48~94행)은 있지만 EDK II가 CEDT를 만드는 코드·모듈·프로토콜은 36·46행에서 '다르다'로 넘기고, HDM 사전 설정은 96~107행 이유 목록뿐이다. 두 키워드 모두 절차가 빠져 3~5. |
| F | 4 | 224행 다음 편은 seriesOrder 36과 맞지만 같은 줄의 'Bootloader Internals 시리즈의 마무리'는 틀렸다(`chapter37-secureboot-cert-rollover.md`, seriesOrder 37, `draft: false`). 233행 'Modern Embedded Recipes Ch 150'의 대상 part11-16은 seriesOrder 151이다. 228·230·231·232행 라벨은 대상과 맞고 229행(ch19)은 설명이 대상과 약하게 맞는다. 전제 지식 안내는 17행뿐이다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 50행 'UEFI Spec과 CXL Spec 양쪽에 정의'는 판·절 번호가 없고, EDK II 태그·경로(36·46행), 커널 버전(177~199행), 상용 BIOS 출처(162~167행)도 없다. aeedacc4의 대조 출처는 커밋 본문에만 있어 G에 넣지 않았다. |

uncertainties:
- 71행 CHBS 'CXL Version 0x0001 (1.1), 0x0002 (2.0)' vs CXL Internals ch12 109행 QEMU pxb-cxl CHBS 'CXL Version 1'. 기억으로는 0=1.1, 1=2.0이지만 actbl1.h·CXL spec을 열지 못해 오류 확인에 넣지 않았다.
- 199행 'decoder already committed by firmware' vs ch36 295행 'decoder firmware-locked'(다른 글과의 모순). ndctl 문자열 미확인.
- 50행 CEDT 정의 위치 미확인.
- 138·144행 OVMF CXL 코드와 '-D CXL_ENABLED=TRUE' 옵션이 edk2 upstream에 있는지 미확인.
- 177~178·190행 cxl_acpi/cxl_mem 로그 문자열 미확인.
- 131~132·208~209행 SPDM 결과를 CEDT에 표시하는 필드와 OS 전달 여부 미확인.
- 105행 'Auto-Commit' 용어, 118행 SLIT 50~80, 86행 HBIG 256 B~16 KB, 187행 Restrictions 0x06 의미의 출처가 없다.
- 164~165행 'Intel RBU·MEBx'를 BIOS 이름으로 쓴 것, AMI Aptio V의 Genoa/Turin CXL 지원 판 미확인.

병합 대상: 병합 대상 없음. 통째로 합칠 글은 없고 겹치는 절만 정리한다. 109~121행 SRAT·HMAT·SLIT 절과 195~202행 firmware/user-managed 충돌 실수는 `src/content/blog/embedded/bootloader/chapter36-boot-memory-topology.md`(51~111·291~298행)에 맡기고 이 글에는 링크만 남길 후보다. 다음 조치: 보강(차별화). 이유: 'UEFI(EDK II)가 CEDT를 만들고 HDM을 미리 commit하는 과정'은 독립 검색 의도다. EDK II/OVMF 실제 CXL 소스 위치·버전을 1차 자료로 확인하고, HDM decoder commit 레지스터 순서를 CXL spec 절과 함께 적고, 출처 없는 로그(177·190·199행)·수치(84·118행)·빌드 옵션(144행)은 확인하거나 지운다.

### `bootloader/chapter36-boot-memory-topology.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). (1) 106행 SLIT 표는 cross-socket(UPI 1 hop)을 '40~50'으로 정의하는데 114~115행 예시는 '# socket 0'과 '# socket 1' 노드 사이를 21로 적고, 218~219행 numactl 출력도 21이며, 274행 주석은 CXL 20을 두고 'cross-socket보다 가까움'이라 해 21을 cross-socket 값으로 쓴다. (2) 105행은 same socket을 '20~30'으로 두는데 114·117행 예시는 socket 0과 'HBM on-package socket 0' 사이를 17로 적는다. (3) 25행 표는 HBM 100~150 ns, DDR 80~120 ns인데 91행 HMAT 예시는 CPU0→HBM 90 ns, CPU0→DDR0 100 ns다((3)은 대표값 표 대 예시라 약하지만 (1)만으로 성립). git log(0ec69ea9 작성, 23ed6256 'qualify or remove suspect claims', e85d7684 산문 이동, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 부트 시점과 런타임 결정을 가르는 표(180~187행), 정적·동적 영역 2단계 발견 모델(195~200행), 실수 다섯 가지(238~298행)다. SRAT·HMAT·SLIT 표(55~61, 78~82, 102~108행)는 구조체 이름 목록 수준이고, 23~28행 tier별 지연·대역폭은 출처가 없다. 253행 'BIOS update가 답', 289행 '보통 BIOS bug'는 일반론이다. 202~234행 실전 예는 스스로 '가상 시나리오'다. |
| B | 11 | tier 구성(19행) → 책임 분해(32행) → SRAT·HMAT·SLIT(51~120행) → zone 분류(122행) → tier 인식 흐름(137행) → fabric 한계(191행) → 실수(236행) → 정리(300행)로 완성됐다. description의 'SRAT·HMAT·SLIT 생성'은 표 설명뿐이고 부트로더가 구조체를 채우는 코드·필드 값이 없다. 내부 모순과 63·96·145·266행 불확실로 B ≤ 13. |
| C | 6 | numactl·dmesg·sysfs·cxl create-region 명령(152~174, 206~232, 293~296행)은 출력이 모두 예시이고 204행이 '가상 시나리오'라 밝힌다. 커널 버전·플랫폼·BIOS 환경이 없다. 23~28·102~108행 수치는 출처가 없어 C ≤ 8. 실수 절(238~298행)은 증상 출력만 있고 재현·확인 절차가 없다. |
| D | 9 | 비교한 글: `chapter35-uefi-cxl-init.md`, `chapter37-secureboot-cert-rollover.md`(겹침 없음), `tools/debugging/memory/chapter07-tiered-memory-diagnostics.md`, `hbm/chapter12-cxl-pooling-fabric.md`·`performance-engineering/part3-12-cxl-mem-latency.md`(링크만). ch35 109~120행이 이 글 51~120·137~148행의 축약판이고 ch35 195~202행 `cxl create-region` 함정이 이 글 291~298행과 같은 명령·결론이다. memory ch07 91~97행 memory_tiering 출력이 이 글 167~173·229~231행과, 263행이 255~266행과 같다. SLIT·zone 분류·부트/런타임 구분은 이 글에만 있다. |
| E | 6 | 제목 'DDR + CXL.mem 통합 인식'과 description의 SRAT·HMAT·SLIT·NUMA 매핑은 51~120·137~174행이 다룬다. description의 '생성'은 구조체 설명뿐이라 부분 미이행이다. 제목에 없는 HBM·persistent memory가 같은 비중으로 섞이고(23~28·132행), 시리즈는 U-Boot 중심인데 본문은 UEFI 서버 BIOS 이야기다. |
| F | 4 | 15행 '시리즈의 마무리', 17행 '이 마지막 장', 309행 '36편 회고'라 하지만 같은 디렉터리에 seriesOrder 37 `chapter37-secureboot-cert-rollover.md`가 `draft: false`로 공개돼 있다(eff5e201에서 공개). 326행 'Modern Embedded Recipes Ch 151'의 대상 part11-17은 seriesOrder 152다. 325·327·331~337행 라벨은 대상과 맞다. 313~320행 회고 표는 ch37을 빠뜨렸다. F ≤ 5. |
| G | 1 | 본문에 1차 출처가 없다. ACPI 사양 판(55~82·102행), CXL 사양 판(193행 'CXL 3.0'), 커널 버전(146·167행 sysfs, 161~165행 dmesg), cxl-cli 버전(294행)이 빠졌다. |

uncertainties:
- 25행 'Genoa-X'를 HBM on-package 예로 든 것(Genoa-X는 3D V-Cache 제품으로 기억) 미확인.
- 63행 CXL.mem을 'Generic Initiator Affinity 또는 Memory Affinity'로 등록한다는 주장 ACPI 사양 미확인.
- 96·147·304행 DAMON promotion/demotion이 HMAT 기반이라는 주장 미확인.
- 145행 tier 분류가 'HMAT bandwidth 기준'이라 했는데 161~162행 dmesg 예시는 latency만 보인다. 실제 기준(abstract distance) 미확인.
- 266행 HMAT가 없으면 'single tier로 가정' vs 259~260행 memory_tiering 디렉터리가 비어 있음. 커널 동작 지식이 필요해 오류 확인에 넣지 않았다.
- 105행 'same socket (UPI/NVLink 가까움)' — UPI는 소켓 간 링크라 표의 구분 미확인.
- 161~165·224~226·285~286·295행 메시지 문자열 미확인. ch35 199행은 같은 상황을 다른 문자열로 적는다(다른 글과의 모순).
- 307행 '5가지'라 하면서 네 항목 나열, 15·21행 '4가지 이상'(개수 표기 실수).
- 129행 CXL.mem 기본 Movable zone 노출 주장의 출처가 없다.
- 23~28·102~108행 지연·대역폭·distance 범위의 출처가 없다.

점수 구간 메모(병합 검토): 판정은 오류 확인으로 우선 조치다. 병합 후보는 같은 시리즈 `src/content/blog/embedded/bootloader/chapter35-uefi-cxl-init.md`(109~120행 SRAT·HMAT 절, 195~202행 firmware-managed 함정 겹침)다. SRAT·SLIT·zone 분류와 부트/런타임 구분은 이 글에만 있으므로, 먼저 SLIT·HMAT 수치 모순(106 vs 114·218·274행, 105 vs 117행, 25 vs 91행)을 ACPI SLIT·HMAT 절로 고치고, '마지막 장'·'36편 회고' 문구와 Ch 151 라벨을 고친 뒤 ch35와 병합할지 차별화 보강할지 정한다.

### `bootloader/chapter37-secureboot-cert-rollover.md` — 66점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 38행 "KEK을 바꾸려면 PK로 서명한 업데이트가 필요합니다"(160행 정리도 갱신 권한을 PK → KEK → db·dbx로 둠)와 137행 "OS가 … 2023 인증서를 db·KEK에 추가하고, 이 변경 자체가 기존 KEK 키로 서명되어 검증됩니다"는 KEK 변경의 서명 주체를 두고 동시에 참일 수 없다. 기술 동작에 관한 두 구체 진술이라 개수 표기·완곡 표현 예외가 아니다. a1c7a5cd·eff5e201은 "claims web-verified vs Microsoft primary docs"라 적었지만 대조 항목은 KEK CA 2011 2026-06-24, PCA 2011 2026-10 만료일과 mokutil/efi-readvar 옵션뿐이고 137행 갱신 경로는 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 17 | 99~107행에서 영향 범위를 세 갈래로 나눈다(103행 ARM 자체 키 체계는 무관, 105행 shim을 쓰는 x86 엣지 기기는 현장 갱신 필요, 107행 OTA 없는 현장 기기). 74~79행은 Option ROM CA 분리로 가능해진 정책을 설명하고, 62·153행은 '만료=부팅 불가' 오해를 바로잡는다. 141~149행 PQC 절은 '한 자릿수 이상'(145행), 'RSA보다 무겁습니다'(146행), '유력한 패턴'(149행) 같은 일반론이고, 156행은 완곡 표현이다. 13~19 상단. |
| B | 13 | 13~23행 문제 제기, 25~38행 변수 계층, 40~79행 2011/2023 체인과 타임라인, 81~97행 영향, 99~107행 임베디드 판단, 109~137행 확인·갱신 경로, 151~165행 실수와 정리까지 완성돼 있다. 137행 갱신 경로가 38행과 모순되고, 60행 UEFI CA 2011은 만료일 없이 '갱신 진행'뿐이며, 137행 Linux·임베디드 경로는 절차가 없다. |
| C | 8 | 115~126행 efi-readvar·mokutil 명령과 128행 판별 기준('CA 2011만 보이고 CA 2023이 없으면 갱신 전')은 재현 가능한 확인 절차다. 130~135행 예시 출력은 배포판·펌웨어·도구 버전이 없고 실제 출력 표시도 없다. 145~146행 PQC 비교는 수치도 출처도 없다. C ≤ 8. |
| D | 13 | 인접 `chapter36-boot-memory-topology.md`, `chapter35-uefi-cxl-init.md`는 겹치지 않는다. `chapter18-efi-in-uboot.md` 164~178행이 PK·KEK·db·dbx 목록과 efidebug 키 등록을 다뤄 25~38행과 겹친다. `chapter27-chain-of-trust.md` 235~249행은 eFuse revocation·anti-rollback이라 관점이 다르다. `embedded-security/chapter02-secure-boot.md`(122·159·221·269행)는 Microsoft CA 롤오버가 없다. 'KEK CA 2011'·'Option ROM UEFI CA'·'ML-DSA'·'UEFI CA 2023'은 src/content/blog 전체에서 이 글에만 나온다. |
| E | 7 | 제목의 '인증서 만료'와 '2011→2023 CA 롤오버'는 40~97·109~137행이 이행하고, description의 변수 계층(25~38행), Option ROM CA 분리(72~79행), 임베디드 영향(99~107행)도 있다. 'PQC 대비'는 139~149행 짧은 일반론뿐이라 키워드 하나 부분 미이행. |
| F | 5 | 167~169행 다음 장 예고가 'TPM PCR과 Measured Boot' 장을 약속하지만 bootloader 디렉터리는 seriesOrder 37이 마지막이다. 틀린 다음 편 안내로 F ≤ 5. 173~176행 라벨(chapter16·18·27·35)은 대상 제목과 맞다. 13행 전제 지식(Ch16·Ch27)과 107행 Ch20 연결은 기능한다. Measured Boot를 다루는 `embedded-security/chapter02-secure-boot.md` 269행으로는 연결하지 않는다. |
| G | 3 | 177~178행 Microsoft 1차 자료(support 문서, Secure Boot playbook) 링크가 있고 54행 'Microsoft 공식 가이드에 따르면'이 56~60행 타임라인 표와 이어진다. 141행은 FIPS 204·203 번호를 밝힌다. 출처가 글 끝 목록에만 있고 표 행별로 연결되지 않으며, 179행 UEFI Specification은 판 번호가 없고 115~126행 명령에 efitools·mokutil 버전이 없다. |

uncertainties:
- 23·58행 'KEK 만료 이후 db·dbx 업데이트 신뢰 불가' — 펌웨어가 인증서 유효기간을 실제로 강제하는지, 운영상 의미인지 미확인.
- 137행 KEK 갱신의 실제 서명 주체(OEM PK 서명 KEK 업데이트인지)는 Microsoft 문서로 확인하지 않았다. 오류 확인은 38행과의 내부 모순만 근거로 한다.
- 130~135행 'Subject:'·'Expires:' 형식이 efi-readvar 실제 출력과 같은지 미확인.
- 60행 Microsoft Corporation UEFI CA 2011 만료일이 '갱신 진행'으로만 적혀 있다.
- 59행 PCA 2011 만료가 '2026-10'으로 일자 없이 적혀 있다.
- 71~72행 2023 CA 명칭을 Microsoft 문서로 대조하지 않았다(a1c7a5cd는 만료일만 대조).
- 145행 'ML-DSA 서명은 RSA-2048보다 한 자릿수 이상 큼' FIPS 204 미확인.
- 103행 'TF-A trusted boot 등은 Microsoft 인증서와 무관' 일반화는 EDK II를 쓰는 ARM 서버·SystemReady 기기에는 맞지 않을 수 있다.

### `bsp/chapter01-what-is-bsp.md` — 55점, 보강

confidence: 중간

factcheck: 미검증. git log(7824b986 stub, 400892d7 linter, 160a78a8 21편 일괄 작성, 2003b8a6·a0f21c45·e85d7684 코드 블록·다이어그램 정리, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug)에 부트 체인·수치 주장을 TF-A 문서·AM335x TRM 등과 대조한 커밋이 없다. 15·40·190행 범위 정의 충돌과 54행 대 51~52행 경계 규칙 불일치는 수치·동작·API가 아닌 범위 정의라 오류 확인으로 올리지 않고 B·F에서 감점했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 벤더·커뮤니티·RTOS·사내 팀별 BSP 범위 표(25~30행), BSP/애플리케이션 경계 표(46~52행), SoC(dtsi)와 보드(board.dts·board.c) 분리 목록(108~129행), 착수 전 자료 체크리스트(151~176행), 단계별 일정 표(182~192행)는 이 글만의 정리다. 부트 체인 절(62~102행)은 일반 입문 내용이고 64행 'SoC 거의 모두가 ARMv8', 192행 '3~4개월', 198행 '80%는 그대로'는 근거 없는 단정이다. |
| B | 12 | 정의 → 범위 → 경계 → 구성요소 → 부트 체인 → 보드별 차이 → 예시 보드 → 준비물 → 일정 → 오해 → 로드맵 → 정리(13~247행)로 도입 글 흐름은 완결된다. 15행은 'factory provisioning 절차까지가 한 묶음', 40행은 provisioning·OTA를 '별도 시리즈', 190행 일정 표는 다시 BSP 단계로 넣는다. 54행 'uname -a로 답이 안 나오는 것은 BSP 책임이 아니다'도 51~52행 표와 맞지 않는다. B ≤ 13에서 범위 충돌로 더 뺐다. |
| C | 5 | 실행 가능한 명령·절차·관찰 결과가 없다. 237행 시리얼 마커('U-Boot SPL 2024.04', '[ 0.000000] Booting Linux')가 유일한 관찰 기준이다. 184~190행 일정, 192행 '3~4개월·2~4주', 198행 '80/20', 141행 '50달러 안팎'은 출처 없는 수치라 C ≤ 8이고, 151~174행은 준비물 목록이다. |
| D | 10 | 62~102행 부트 체인 ↔ `bootloader/chapter01-boot-problem.md` 65~70·108~130행, `bootloader/chapter04-boot-stages.md` 17·43~73행, `modern-recipes/part3-12-bootloader-chain.md` 25~33·148~156행. 같은 시리즈 `bsp/chapter10-first-boot.md` 24~40행이 같은 단계를 타이밍 표로 다루고 237행 마커도 겹친다. BSP 범위·경계·책임 분리·준비물·일정(21~54, 104~192행)은 다른 글에 없고, `bsp/chapter02-datasheet.md`와 역할이 갈리며 `buildroot/chapter10-real-board.md` 625~628행은 한 문단이다. |
| E | 8 | 제목 'BSP의 본질 분해 — 새 보드 부팅을 위한 코드의 자리'와 description '정의·범위·구성요소'가 21~60·104~129행에 대응한다. description의 '모든 것'은 40행에서 스스로 좁혀지고 대상 독자가 147~149행에서야 드러나 9 이상은 아니다. |
| F | 5 | 251행 다음 편(Ch 2, '네 개 챕터')은 seriesOrder 2 `chapter02-datasheet.md`(33행)와 맞고 255~258행 관련 항목 4개도 대상과 맞다. 그러나 40행은 provisioning·OTA를 '별도 시리즈'로 안내하지만 같은 시리즈에 `chapter18-ota-recovery.md`·`chapter20-production.md`가 있고(219행은 '이후 챕터'라 다시 다름), 143행은 ARMv8 예시가 RPi4·AM62x이고 Ch 2·Ch 7에 나온다지만 chapter02 41·68·233행과 chapter07 44·104행은 i.MX 8M Plus다. 208~219행 로드맵에 링크·전체 편수(21편)가 없고 66행 TODO 주석이 남았다. |
| G | 2 | 259~260행 kernel.org Device Tree usage-model과 TF-A 프로젝트 링크는 특정 주장(94~100행)에 연결되지 않는다. 버전 표기는 237행 U-Boot 2024.04뿐이고 TF-A·커널 버전, AM335x TRM 판, 138행 회로도 'CC-BY-SA' 출처가 없다. 앵커 part7-05(G 2)와 같다. |

uncertainties:
- 100행 'ARMv7(Cortex-A8, A9, A15) 보드는 BL31이 없습니다' vs `bootloader/chapter01-boot-problem.md` 117행('BL31 같은 secure monitor가 옵션'). TF-A AArch32 SP_MIN 지원 미확인.
- 15·40·190행 범위 정의 충돌(B·F에서 감점).
- 54행 uname 경계 규칙과 51~52행 표 불일치(경계 규칙이라 오류 확인 아님).
- 143행(RPi4·AM62x)과 245행(i.MX 8M·AM62x·BCM2711)이 다르고, 133행 '시리즈 내내 한 보드(BeagleBone Black)'도 chapter02의 i.MX 8M Plus 중심과 맞지 않을 수 있다.
- 64·140·141행, 182~192행 일정, 198행 80/20은 출처 없는 수치·단정이다.
- 206행 TI·NXP·ST 대 Rockchip·Allwinner·Amlogic 메인라인 비교는 출처 없는 일반화다.
- 95행 SPL/BL2 표기가 BL1을 생략한다(bootloader/chapter04는 BootROM·BL1·BL2를 따로 둠). TF-A 문서 미확인.

병합 대상: 점수 구간은 병합 검토(55점)지만 BSP Development 첫 글(seriesOrder 1, 로드맵을 가진 허브)이라 루브릭 5절에 따라 보강으로 둔다. 보강 방향: 15·40·190·219행 provisioning·OTA 범위를 하나로 맞추고 40행은 chapter18·chapter20으로 안내, 143·245행 ARMv8 예시 보드를 실제 Ch 2·Ch 7(i.MX 8M Plus)과 맞추기, 로드맵(208~219행)에 21편 링크·편수 넣기, 부트 체인 절(62~102행)은 bootloader/chapter01·chapter04 링크로 줄이고 BSP 관점만 남기기, 182~198행 수치는 출처를 대거나 지우기, 66행 TODO 정리.

### `bsp/chapter02-datasheet.md` — 57점, 우선 조치

confidence: 높음

factcheck: 오류 확인. 1차 자료 mainline Linux v6.12(adc2186) `arch/arm64/boot/dts/freescale/imx8mp.dtsi`, `imx8mp-pinfunc.h`, `imx8mp-evk.dts`를 직접 열었다. (1) 47행 IOMUXC 0x3034_0000 ↔ imx8mp.dtsi 638행 'iomuxc: pinctrl@30330000'. (2) 49행 UART1 0x3084_0000 ↔ imx8mp.dtsi 1074행 'uart1: serial@30860000'. (3) 50행 GPIO1 0x3082_0000 ↔ imx8mp.dtsi 516행 'gpio1: gpio@30200000'. (4) 120행 SAI5_RXFS ALT5 'GPIO3_IO21' ↔ imx8mp-pinfunc.h 402행 'MX8MP_IOMUXC_SAI5_RXFS__GPIO3_IO19 ... 0x5'. (5) 243~248행 UART2_RXD ALT 표(ALT1 ECSPI3_SCLK, ALT3 I2S6_DAT0, ALT4 GPIO5_IO24, ALT5 reserved) ↔ pinfunc.h 742~744행(ALT1 ECSPI3_MISO, ALT3 GPT1_COMPARE3, ALT5 GPIO5_IO24). (6) 229행은 imx8mp-evk.dts에서 'GIC_SPI 26'을 찾으라고 하지만 evk.dts에는 0건이고 imx8mp.dtsi 1077행 uart1 노드에 있다. 맞는 값: 46행 AIPS-1 0x3000_0000(dtsi 509~511행), 48행 CCM 0x3038_0000(dtsi 727행), 255·281행 UART2 0x3089_0000(dtsi 1098행), 260~275행 uart2 DT fragment(evk.dts 738~743·1028~1031행). git log로는 adb7589e가 169~181행 erratum만 pci-imx6.c와 대조했고 나머지는 대조 기록이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | RM에서 네 챕터만 고르는 우선순위(33~126행), 동작하는 BSP dts에서 RM을 역추적하는 방법(229~231행), 회로도 → ALT 표 → 메모리 맵 → DT → defconfig로 console UART2를 정하는 흐름(233~286행), upstream 주석을 옮긴 erratum(169~181행)이 고유하다. 핵심 예시인 메모리 맵(47·49·50행)과 ALT 표(120·244~248행)가 mainline 소스와 다르고, 17행 페이지 수, 35·328행 'BSP의 80%', 186행 '보통 10건 미만', 222·333행 '검색이 80%'는 출처가 없다. 304~324행은 일반론(316행)이다. |
| B | 12 | 문서 종류(19~31행) → 네 챕터(33~126행) → Pin Mux 도구(128~161행) → Errata(163~188행) → 건너뛸 부분(190~200행) → 회로도 체크리스트(202~220행) → 실전 예(233~286행) → 일주일 일정(288~302행) → 정리(326~335행) 흐름은 완성됐다. Clock Tree 절(64~78행)은 그림 한 장과 불릿 세 개로 끝나고, 231행 '특히 세 번째가 강력합니다'는 네 번째 항목(229행)을 가리킨다. B ≤ 13에 확인된 예시 오류까지 있어 12. |
| C | 7 | DT fragment(143~158·260~275행)와 U-Boot defconfig(279~284행)가 있고 260~275행은 mainline evk.dts와 같다. 실행 결과·기대 console 출력과 보드·커널·U-Boot 버전이 없다. 17행 페이지 수, 66행 '클록 노드 200~600개', 186행 '10건 미만'은 출처 없는 수치라 C ≤ 8. 288~302행 일정은 절차만 있다. |
| D | 10 | 비교한 글: `chapter01-what-is-bsp.md`, `chapter03-device-tree-design.md`, `chapter04-pinmux-clock.md`, `bootloader/chapter23-bootrom-efuse-otp.md`. 111~122행 SAI5_RXFS ALT0~7 표가 chapter04 23~34행과 행 단위로 같다(GPIO3_IO21 오류까지 복제). 141~161행 uart1 pinctrl·pinfunc.h 설명이 chapter04 54~58·73~88행과 겹친다. 93~105행 BOOT_MODE strap이 bootloader ch23 37·52·72행과 겹친다. chapter01 157~158·251행과는 역할이 갈린다. 'RM을 어디·어떤 순서로 읽는가'는 이 글에만 있다. |
| E | 7 | 제목 'SoC 데이터시트 읽기 — Pin Mux·Clock·Memory Map 파악법'과 description(5행)이 37~126행 네 챕터 절과 맞다. Clock은 64~78행으로 부분 미이행이고, 제목은 '데이터시트'인데 308·329행은 'BSP는 RM을 본다'고 하며, 일반 SoC 제목에 본문은 i.MX 8M Plus 위주다. |
| F | 5 | 339행 다음 편은 seriesOrder 3 `chapter03-device-tree-design.md`와 맞고, 344~347행(Ch 3·4·5, PCIe Ch 6)도 맞다. 343행 라벨 'BSP란 무엇인가'는 대상 chapter01 현재 제목 'BSP의 본질 분해'와 다르다. 348행 '원문 — NXP i.MX 8M Plus Reference Manual'과 349행 'TI AM62x Technical Reference Manual'은 RM이 아니라 제품 페이지(ti.com/product/AM625 등)로 간다. 라벨이 대상과 다른 관련 링크라 F ≤ 5. 78행 Ch 4 본문 링크가 있어 5. |
| G | 3 | 167행 mainline `drivers/pci/controller/dwc/pci-imx6.c`와 181행 `imx_pcie_host_post_init`이 erratum 인용과 직접 연결된다. 161행 `imx8mp-pinfunc.h`, 229행 `imx8mp-evk.dts` 경로가 있다(229행 대상은 실제로는 imx8mp.dtsi). 커널 버전·태그가 없고 44~122행에는 RM 판·절 번호가 없으며 348~349행은 제품 페이지다. |

uncertainties:
- 95~102행 BOOT_MODE[2:0](3비트)·93행 'BOOT_MODE0/1/2' vs 121행 ALT6 SRC_BOOT_MODE3, bootloader ch23 52·72행 BOOT_MODE[3:0]. RM 미확인. pinfunc.h v6.12에 SAI5_RXFS ALT4·6·7 매크로가 없어 119·121·122행도 확인 못 함.
- 84행 '4가지 boot mode' 뒤 95~102행 표는 NAND까지 5개(개수 표기 문제).
- 231행 '세 번째'가 설명하는 것은 네 번째 항목(229행)(개수 표기 문제).
- 45행 On-chip SRAM 0x0010_0000(128KB)과 44행 Boot ROM 범위는 imx8mp.dtsi에서 확인하지 못했다. bootloader ch23 37행은 OCRAM 0x00900000으로 적는다.
- 161행 'IOMUXC 레지스터 5개(MUX_CTL, PAD_CTL, INPUT_DAIZY 등)' — 매크로 다섯 숫자는 오프셋 셋과 값 둘로 보이며 'DAIZY'는 DAISY 오기로 보인다. binding 문서 미확인.
- 237행 Ball K17·L17, 111행 Ball K1은 RM 패키지 표로 확인하지 않았다.
- 282행 CONFIG_DEBUG_UART_CLOCK=24000000과 UART2_ROOT 기본 클록 일치 미확인.
- 17행 페이지 수, 66행 클록 노드 수, 186행 'Severity High 10건 미만'은 출처 없는 수치다.

점수 구간 메모(병합 검토): 병합 대상 없음. 다음 행동: 보강. 'RM을 어디·어떤 순서로 읽는가'는 `chapter04-pinmux-clock.md`와 역할이 갈려 합치지 않는다. 먼저 47·49·50·120·244~248·229행 오류를 mainline imx8mp.dtsi·imx8mp-pinfunc.h로 고치고(같은 GPIO3_IO21 표가 있는 chapter04 23~34행도 함께), 111~122행 ALT 표는 chapter04를 정본으로 두고 링크로 바꾸는 것을 검토한다.

### `bsp/chapter03-device-tree-design.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 123행은 '주소 있는 노드의 unit-address가 *부모 노드의 reg 첫 셀*과 일치해야 하고 dtc가 이를 경고한다'고 쓴다. 그런데 같은 글의 '최소 동작' skeleton 466~472행에서 부모 `mdio` 노드에는 reg가 없고, 자식 `ethernet-phy@1`의 unit-address 1은 자기 `reg = <1>`(472행)과 맞춰져 있다. 루트 아래 `memory@40000000`(226~228·415~417행)도 reg 없는 루트를 부모로 두고 자기 reg와 맞춘다. 110~111·150~152행 `serial@44e09000`, 331~333행 `camera@3c`도 노드 자신의 reg와 맞추고, 289행도 'unit-address와 reg가 어긋날 때'(노드 자신의 reg)라 쓴다. 규칙과 코드 예가 동시에 참일 수 없다. git log(0a9dd7bc·be973200·ac24bb76·c41a9273·49f2a443·160a78a8·400892d7·7824b986)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 SoC dtsi와 EVK dts를 나누고 '우리 dts는 imx8mp.dtsi만 include, EVK는 참고만'이라는 분리 원칙(204~264행)과 i.MX 8M Plus 가상 ACME 보드 skeleton(397~488행: chosen, regulator-fixed, PMIC, FEC+MDIO PHY)이다. DT 산출물 표(23~30행), compatible fallback(127~143행), 표준 속성 표(160~166행), overlay(311~357행)는 입문 자료 수준이고, 실수 절(359~395행)은 증상·로그 진단 예가 없다. |
| B | 10 | 개념 → 최소 dts → 명명 규칙 → compatible → 표준 속성 → bindings → dtsi 상속 → dtc → 런타임 확인 → overlay → 실수 → skeleton → 정리 흐름은 완성됐다. 명명 규칙 절의 핵심 규칙(123행)이 코드 예(466~472행)와 모순되고, 110~121행 DTS 예는 불릿으로 깨져(`- uart0: serial@44e09000 {`, `- };`) 읽히지 않는다. 제목의 phandle은 설명 절 없이 `&label`(97·125행)·`phy-handle`(463행)로만 나온다. B ≤ 13에 오류 확인까지 있어 10. |
| C | 7 | dtc 컴파일·역변환·cpp 전처리 명령(270~281행), dtbs_check(197~200·391~393행), 런타임 확인 명령과 예시 출력(295~307행)이 있다. 커널·dtc 버전·보드 환경 표기와 실제 실행 결과가 없다. 283행은 '`-Wall`도 추가한다'면서 286행 명령은 `-W no-unit_address_vs_reg`로 경고를 끈다. 318행 표의 overlay는 `.dtso`인데 346행 빌드 입력은 `.dts`다. 474~475행 reset-assert-us 10000 등은 출처가 없다. C ≤ 8. |
| D | 9 | 비교한 글: `chapter02-datasheet.md`, `chapter04-pinmux-clock.md`, `modern-recipes/part7-03-device-tree-basics.md`, `bootloader/chapter06-device-tree.md`. part7-03과 status(365~367행 ↔ 181~188행), compatible fallback(127~141행 ↔ 190~196행), overlay `/plugin/`·`dtc -@`(321~347행 ↔ 236~263·278~284행), 런타임 확인(291~309행 ↔ 265~276행), #address-cells 실수(373~375행 ↔ 286행 이후)가 겹친다. bootloader ch06 372~376행 `fdt apply`가 349행과 겹친다. 이 글만의 역할은 dtsi/dts 분리(204~264행), bindings·dtbs_check(176~202행), skeleton(397~488행)이다. |
| E | 6 | title '새 보드 Device Tree 설계 — node·property·phandle 작성 흐름'과 description 'SoC dtsi 상속, 보드 dts 작성, overlay 활용'(2·5행)은 204~264·397~488·311~357행과 맞는다. phandle은 설명 절 없이 `&label` 참조(97·125행)로만 다뤄 부분 미이행이다. |
| F | 5 | 503행 다음 편 'Ch 4 — Pin Mux와 Clock'은 seriesOrder 4 `chapter04-pinmux-clock.md`와 맞다. 508~510행(Ch 2·4·6)은 맞고, 507행 'Ch 1: BSP란 무엇인가'는 ac24bb76 이전 옛 제목이라 현재 제목 'BSP의 본질 분해 — 새 보드 부팅을 위한 코드의 자리'와 다르다. 110~121행 DTS 예가 깨져 읽기를 방해하고 전제 지식(Ch 2 메모리 맵) 안내가 없다. |
| G | 2 | 본문에 커널 소스 경로 `Documentation/devicetree/bindings/serial/omap_serial.yaml`(178~199행)과 글 끝 원문 링크 3개(511~513행)가 있다. 각 주장(174행 GIC_SPI 번호 규칙, 123행 unit-address 규칙, 488행 stdout-path)과 출처가 연결되지 않고 커널·dtc 버전, DT Spec 판이 없다. |

uncertainties:
- 129~139행 루트 노드 compatible(`ti,am335x-bone-black` 등)을 '드라이버 매칭' 예로 설명. 루트 compatible은 머신 식별용이라 예로 적절한지 미확인.
- 195행 'make dt_binding_check로 DT가 바인딩을 따르는지 검증' vs 199·392·496행 명령은 dtbs_check, 389행 절 제목은 dt_binding_check. 두 타깃 역할 미확인.
- 283행 '커널이 dtbs 빌드 때 첫번째 방식(dtc 직접)을 자동으로 한다' — `#include`를 쓰는 dts(219행)는 cpp 전처리가 필요해 Makefile.lib로 미확인.
- 318행 ov5640을 'Sony 카메라 모듈'로 표기 vs 332행 compatible `ovti,ov5640`.
- 488행 'stdout-path는 부트로더가 어느 UART를 console로 쓸지 알려준다' — DT Spec chosen 정의 미확인.
- 174행 'GIC_SPI 26은 번호 - 32' 규칙, 375행 ARMv8/ARMv7 셀 수, 57행 512MB 등은 upstream과 미대조.
- 19행 '세 가지 결과물' 아래 표는 6단계(개수 표기 실수, 3-1 제외).

점수 구간 메모(병합 검토): 판정은 오류 확인으로 우선 조치다. 차별화 보강 방향(part7-03과 겹치는 일반 문법 절을 줄이고 링크)은 유지하고, 먼저 123행 규칙을 DT 명세·dtc 경고 정의로 고치고 110~121행 깨진 코드 블록과 507행 라벨을 바로잡는다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (9편).** Bootloader ch31~37은 집필 커밋(ea755e1a, 0ec69ea9·23ed6256) 뒤 톤·제목·메타데이터·slug 커밋뿐이고, ch35 aeedacc4는 한 절만 대조했다고 스스로 적었다. ch37 a1c7a5cd·eff5e201은 만료일·명령 옵션만 대조했다. BSP ch01·03은 160a78a8 일괄 작성 뒤 대조 기록이 없고, ch02는 adb7589e가 erratum만 대조했다. `factcheck: 검증됨`은 0편이고 8편이 오류 확인이다. Bootloader ch31~37과 BSP Development는 `/fact-check-round` 대상이다.
- **다음 편·시리즈 마무리 안내가 ch34~37 추가를 반영하지 않음 (4편).** ch33 472~474행('마지막 세 장 31·32·33'), ch35 224행('시리즈의 마무리'), ch36 15·17·309~322행('마지막 장', '36편 회고', 회고 표에 ch37 없음), ch37 167~169행(없는 Ch 38 'TPM PCR과 Measured Boot' 예고). 네 편 모두 F ≤ 5의 직접 원인이다.
- **관련 항목 라벨이 옛 제목·틀린 번호 (7편).** 옛 'Ch N: X' 제목: ch31 396~399행, ch32 464~467행, bsp ch02 343행, bsp ch03 507행('BSP란 무엇인가'). Modern Embedded Recipes 'Ch N' 번호가 실제 seriesOrder보다 1 작음: ch34 155·263·264행(149→150, 151→152), ch35 233행(150→151), ch36 326행(151→152). '원문 — Reference Manual' 라벨이 제품 페이지로 감: bsp ch02 348~349행.
- **출처·측정 환경 없는 구체 수치 (10편 전부, C ≤ 8 상한 반복).** ch31 72·298~315행, ch32 357~365행, ch33 401~411행, ch34 71·91·209행, ch35 84·118행, ch36 23~28·102~108행, ch37 145~146행, bsp ch01 182~198행, bsp ch02 17·66·186행, bsp ch03 474~475행.
- **CPU_ON·SMC latency 측정이 세 글에서 서로 다름 (3편).** ch31 294~317행(A53 1.5 GHz, CPU_ON 10~100 µs), ch32 353~382행(A72라 하면서 로그는 i.MX 8M Plus, 4-core 100~200 µs), ch33 397~414행(i.MX 8M Plus, 4-core ~1 ms). ch32·ch33은 각 글 안에서도 로그와 결론이 맞지 않아 오류 확인 근거가 됐다. bsp ch07 354행은 같은 round trip을 'μs 단위'라 적는다. 시리즈 단위로 한 번에 정리한다.
- **코드에 버전 없이 '간략화'·'개념적'·'의사 코드' 표시와 upstream처럼 보이는 경로 (5편).** ch31 79·93·111·145·175·244·324행, ch32 170·207·328행, ch33 129·147·188·207·315·334행, ch34 43·128행, bsp ch02 161·229행. G가 1~3에 머무는 공통 원인이고, 경로 자체가 불확실로 남은 곳(ch31 175행, ch32 204·207행, ch33 188행, ch34 128행)도 있다.
- **1차 출처가 본문 주장에 붙지 않고 글 끝 목록에만 있거나 아예 없음 (10편 전부).** 글 끝 목록: ch31 403~404행, ch32 471~472행, ch33 489~490행, ch37 177~179행, bsp ch01 259~260행, bsp ch02 348~349행, bsp ch03 511~513행. 본문 출처 없음: ch34·35·36(G 1).
- **같은 내용이 시리즈 안팎에서 반복 (D 감점, 8편).** TF-A carveout·서비스 표·SMC 경로(ch31 ↔ ch25·bsp ch07), PSCI ID 표·psci DT(ch32 ↔ ch25·bsp ch07·bsp ch09), cpu_psci_cpu_boot·spin-table(ch33 ↔ bsp ch09), BAR sizing(ch34 ↔ modern-recipes part11-03), SRAT·HMAT·SLIT·firmware-managed 함정(ch35 ↔ ch36), 부트 체인(bsp ch01 ↔ bootloader ch01·ch04·bsp ch10·part3-12), ALT 표·pinctrl(bsp ch02 ↔ bsp ch04), DT 일반 문법(bsp ch03 ↔ part7-03·bootloader ch06).
- **다른 글 사이 사실 충돌 (6편 관련).** BL31 크기·위치(ch31 58·72행 vs ch25 78행 vs bsp ch07 124·446행), SMCCC 레지스터 보존(ch31 365행 vs ch32 31행), CPU_ON ID(ch32 115·159행 0xC400_0003 vs bsp ch07 327행 0x84000003), imx_pwr_domain_on 경로·본문(ch32 204~222행 vs bsp ch07 162~173행), cxl-cli 오류 문자열(ch35 199행 vs ch36 295행), BOOT_MODE 비트 수·OCRAM 주소(bsp ch02 45·95행 vs bootloader ch23 37·52·72행). 다른 글과의 모순이라 오류 확인에는 넣지 않았다.
- **CXL 일괄 커밋(0ec69ea9·23ed6256)으로 들어온 글의 같은 뼈대 (3편).** ch34·35·36이 '한 줄 요약 blockquote → 표 위주 절 → 자주 하는 실수 ### → 정리 → 다음 편 → 관련 항목'을 쓰고, 출처 없는 로그·'가상 시나리오' 출력을 공통으로 담는다. 9개 시리즈에 걸친 묶음이라 루브릭 9절 scaled content 수치 기록 대상이다. Bootloader ch31~33(같은 H2 뼈대)과 BSP ch01~03(160a78a8 일괄 작성 템플릿)도 같은 패턴이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 8편 중 1차 자료로 확인된 bsp ch02를 먼저 본다. mainline v6.12 imx8mp.dtsi·imx8mp-pinfunc.h로 47·49·50·120·229·244~248행을 고치고, 같은 GPIO3_IO21 표가 있는 bsp chapter04 23~34행도 같은 작업에서 고친다.
- 나머지 우선 조치 7편은 내부 모순 건수 순으로 본다. ch32(5건: 측정 로그·환경·인자·결과 개수·SMC64 머리글·파일 경로), ch36(SLIT·HMAT 수치 3건), ch31(stack 크기), ch33(432행 로그 해석), ch34(ranges 기록 여부), ch37(KEK 서명 주체), bsp ch03(unit-address 규칙). 각 글의 1차 자료(TF-A·Linux 태그 고정 소스, DEN0022·DEN0028, ACPI SLIT·HMAT 절, U-Boot 소스, Microsoft 문서, DT 명세)를 열고 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 F 감점 원인을 고친다: ch33·35·36·37의 시리즈 마무리·다음 편 안내, ch34·35·36의 Recipes 'Ch N' 번호, ch31·32·bsp ch02·03의 옛 제목 라벨, bsp ch02 348~349행 RM 라벨, bsp ch01 40·143행 읽기 안내. 다시 채점할 때 바로 반영된다.
- ch31~33 측정 절은 시리즈 단위로 출처를 찾거나 TBD로 둔다. ch35(병합 검토)는 SRAT·HMAT 절과 firmware-managed 함정을 ch36에 맡기는 부분 정리 뒤 차별화 보강, bsp ch01(보강)은 허브 예외 적용을 종합 검토에서 다시 확인한다.
- ch31~34의 frontmatter에 `draft` 필드가 없는 것은 공개 여부 결정 사항이라 사용자 확인으로 남긴다. bsp ch01·06·07·09·14의 TikZ TODO 주석과 bsp ch03 110~121행처럼 49f2a443 변환으로 깨진 코드 블록이 BSP 나머지 글에도 있는지 grep으로 센 뒤 다음 루프(bsp chapter04~) 채점에 반영한다.
