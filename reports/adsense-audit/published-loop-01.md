# 공개 글 AdSense 평가 — 루프 01

> 대상: 공개 글 10편 (Bootloader Internals, `seriesOrder` 1~10)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 첫 루프다. 대상은 `src/content/blog/embedded/bootloader/`의 `chapter01-boot-problem.md`~`chapter10-storage-boot.md` 10편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter01-boot-problem.md` | 11 | 12 | 7 | 8 | 5 | 7 | 2 | **52** | 미검증 | 보강 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter02-u-boot-position.md` | 11 | 12 | 7 | 8 | 7 | 5 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter03-build-system.md` | 10 | 10 | 7 | 10 | 5 | 5 | 2 | **49** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter04-boot-stages.md` | 13 | 12 | 7 | 8 | 5 | 5 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter05-falcon-mode.md` | 12 | 12 | 7 | 13 | 7 | 5 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter06-device-tree.md` | 13 | 13 | 8 | 11 | 7 | 7 | 2 | **61** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `chapter07-driver-model.md` | 14 | 13 | 8 | 11 | 8 | 7 | 2 | **63** | 미검증 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `chapter08-board-init.md` | 13 | 12 | 7 | 11 | 7 | 5 | 2 | **57** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter09-dram-init.md` | 12 | 10 | 6 | 7 | 7 | 4 | 2 | **48** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter10-storage-boot.md` | 15 | 12 | 8 | 10 | 7 | 5 | 1 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 55.0점(10편 합 550), 범위 48~63점이다. 판정은 우선 조치 6편, 보강 3편, 병합 검토 1편이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 6편(ch03·04·05·08·09·10)이고, ch05의 외부 자료 확인 두 건을 빼면 모두 원문 내부 모순(루브릭 3-1)으로 판정했다. 점수 구간으로는 ch06·ch07만 보강(60~79)이고 나머지 8편이 병합 검토(40~59)다. ch01은 시리즈 첫 글이 도입을 겸해 루브릭 5절 허브 예외로 보강에 뒀다. P0는 찾지 못했다(ch08은 404 참고 링크 1건을 '정책 확인 필요'로 남김). 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft: false`까지이고, 렌더링·광고 배치는 보지 않았다. 외부 링크는 ch05 392행(404), ch08 621행(404)·622행(200)만 확인했다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `chapter01-boot-problem.md` | 53 | 52 | -1 | 없음 |
| `chapter02-u-boot-position.md` | 52 | 52 | 0 | 없음 |
| `chapter03-build-system.md` | 50 | 49 | -1 | 없음 |
| `chapter04-boot-stages.md` | 52 | 52 | 0 | 없음 |
| `chapter05-falcon-mode.md` | 59 | 58 | -1 | 없음 |
| `chapter06-device-tree.md` | 61 | 61 | 0 | 없음 |
| `chapter07-driver-model.md` | 63 | 63 | 0 | 없음 |
| `chapter08-board-init.md` | 57 | 57 | 0 | 없음 |
| `chapter09-dram-init.md` | 48 | 48 | 0 | 없음 |
| `chapter10-storage-boot.md` | 58 | 58 | 0 | 없음 |

1차 합 553에서 최종 550으로 3점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 1건. ch05 34행 'Wolfgang Denx가 도입'은 falcon.rst 195~197행이 RMLL 2012 Babic 발표만 출처로 들어 도입자를 1차 자료로 확정할 수 없다. uncertainties로 내렸다. 같은 글의 나머지 세 오류(341행 dd seek=0x900, 151행 spl export 인자, 46행 vs 97·165·185행 args 오프셋)는 성립한다.
- 추가한 오류 확인: 9건, 6편.
  - ch03: 430행 소제목(savedefconfig 출력 그대로 커밋 = 실수) vs 432행 본문(손대지 말고 그대로 둠). 판정이 미검증 → 오류 확인, 병합 검토 → 우선 조치로 바뀌었다.
  - ch05: 350행 같은 줄의 'Failed to load args' vs '어떤 오류 메시지도 없습니다'. 157~158행 출력 예 vs upstream falcon.rst 142~150행(결과 FDT 위치는 예측 불가).
  - ch08: 193~194행 4KB 내림 정렬 vs 202~222행 그림의 2MB '(4KB align)' 여백.
  - ch09: 136행 '1 GB, 16-bit DQ' vs 139~143행 매핑 산술(512 MB, 8바이트 offset). 184·186행 MSTR 비트 정의 vs 269행 0xa3080020 주석.
  - ch10: 304행 0xEB 133MHz ~64MB/s vs 344행 100MHz 64MB/s(상한 50MB/s). 222~235행 i.MX8M 64B OOB vs 250행 128B OOB.
- 점수 변경: ch01 A 12→11(입문 목록 비중), ch03 B 11→10(확인된 내부 모순), ch05 A 13→12(일반 목록 비중과 고유 함정 절의 오류). 나머지 7편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: D 비교 줄 번호를 직접 연 줄로 바꿨다(ch02의 ch04 67~74행·ch25 41~65행, ch04의 ch25 39~80행, ch07의 ch08 103·569~571행, ch08의 ch22 68~75행·ch04 139·148~149행 등). ch08 uncertainties가 인용한 ch04 153~171행은 SPL 코드라 139·148~149행으로 고쳤다.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점 원인은 대상 없는 '더 깊이' 줄(ch02·ch04), 404 외부 링크(ch05·ch08), 틀린 라벨·설명(ch03·ch09·ch10)이다.

## 글별 근거

### `chapter01-boot-problem.md` — 52점, 보강

confidence: 중간

factcheck: 미검증. git log(5534938b 시리즈 22장 작성, 2003b8a6 text 블록 정리, a671b202 TikZ 변환, ac24bb76 제목 변경·날짜 정규화, be973200 topic 메타, 0a9dd7bc slug 고정)에는 49~57행 진입 ABI, 112~130행 권한 수준, 138~146행 부트 시간을 Linux arm64 booting 문서·TF-A·U-Boot 소스·i.MX 8M Plus 문서와 대조한 커밋이 없다. 원문 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다(17행 32KB SRAM과 25행 '수십 KB' 이미지, 21행 EL3 시작과 121행, 158행 네 단계와 173행 체인은 서로 맞는다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 부트로더 책임을 DDR·부트 미디어·커널 ABI·환경 변수 네 가지로 나눈 틀(33~63행)과 '자주 하는 오해' 네 개(150~166행)가 뼈대다. BootROM=mask ROM(25·154행), SPL/BL1·BL2 명칭(27행), 권한 수준 목록(112~130행)은 입문 자료의 표준 목록이고 bsp/chapter01·part3-12와도 같다. 고유 자료인 부트 시간 표(138~146행)와 '자동차 2초·HMI 1초'(136행)는 출처가 없다. 37행 '수십 단계', 110행 '세부가 다릅니다'는 구체 기준 없이 끝난다. 앵커 part1-04(A 10)와 비슷하고 네 가지 책임 틀만큼 더했다. |
| B | 12 | 문제 제기(17·31행) → 네 가지 책임(35~63행) → 체인(65~71행) → 실험 보드·QEMU(73~106행) → 아키텍처 차이(108~132행) → 부트 시간(134~148행) → 오해·정리(150~177행) 흐름은 완성됐다. 제목의 'init까지'는 146행 표 한 칸과 71행 한 문장뿐이다. 47·56·57·114행 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | QEMU 실행 명령(87~88행)과 기대 출력(91~103행)은 있으나 83행 `make qemu_arm64_defconfig` 외에 cross compiler·QEMU 버전·빌드 명령이 없다. 92행 빌드 날짜 'May 19 2026'이 글 날짜(4행 2026-05-09)보다 뒤다. 부트 시간 표(140~146행)는 측정 방법·출처가 없어 C ≤ 8. 합격·실패 관찰이 다른 검증 절차가 없다. |
| D | 8 | 비교한 글: 같은 시리즈 `chapter02-u-boot-position.md`, `chapter04-boot-stages.md`, `chapter19-kernel-handoff.md`, 다른 시리즈 `bsp/chapter01-what-is-bsp.md`, `modern-recipes/part3-12-bootloader-chain.md`. 65~71·112~130행(체인, ARMv7은 BL31 없음, RISC-V는 OpenSBI)이 bsp/chapter01 62~100행과, 25·154행 BootROM 설명이 part3-12 17~40행과 같다. 49~57행 진입 ABI는 ch19 30~38행, 125~130행 RISC-V는 ch02 228~237행, 156~158행은 ch04 17행과 겹친다. |
| E | 5 | 제목(2행)은 'ROM부터 init까지'와 '빈자리 분석'을 약속하지만 본문은 개념 개관이고 init은 146행 한 칸과 71행 한 문장뿐이다. description(5행)의 '부트로더가 채우는 자리'는 33~63행이 이행한다. '분석' 약속에 개념 소개 수준이라 3~5. |
| F | 7 | 181행 다음 편은 seriesOrder 2 `chapter02-u-boot-position.md`와 맞고, 안내한 LinuxBoot도 ch02 15·148행에 있다. 185~189행 관련 항목 다섯 개(ch02, ch04, ch09, bsp ch06, embedded-security ch02)의 라벨·주제가 대상과 맞고 모두 `draft: false`다. 본문 링크 39행(ch09)·132행(ch04)·148행(ch05)과 73~81행 보드 표가 글 고유 구조다. 전제 지식 안내가 없어 9 이상은 주지 않았다. |
| G | 2 | 1차 출처는 관련 항목 끝 U-Boot 사이트(190행)와 Linux arm64 booting 문서(191행) 두 개이고 개별 주장에 붙어 있지 않다. 버전 표기는 92행 'U-Boot 2024.04'뿐이다. 앵커 part7-05(G 2)와 같은 수준. |

uncertainties:
- 47행 'ARM64 커널은 PC 주소가 어디든 동작'이 booting 문서의 정렬·오프셋 요구, ch19 34행 'PC = Image.start + 0x80'과 맞는지 미확인.
- 56행 'EL2 권장' vs ch19 36행 'EL1(또는 EL2)'. 다른 글과의 차이라 booting 문서로 정할 일.
- 57행 '모든 CPU가 secondary boot 진입점에 wait'가 spin-table·PSCI 요구와 맞는지 미확인.
- 114행 'ARMv7-A 단일 권한 모드(monitor mode가 선택)'를 ARM ARM으로 확인하지 않았다.
- 158행 'ARMv8-A는 네 단계가 흔함' vs ch04 17행 '5단계가 기본'(ch04 제목은 '4단계').
- 91~103행 QEMU 출력의 진위: 92행 빌드 시각(May 19 2026 09:00 UTC)이 글 날짜와 작성 커밋 5534938b(08:03 UTC)보다 뒤다. `-nographic` 실행인데 vidconsole·usbkbd가 나온다.
- 136·140~146행 시간 수치, 17행 '32KB SRAM'·'4GB 가상 메모리'는 출처가 없다.
- 190행 denx.de 위키, 191행 kernel.org booting.txt 옛 경로의 현재 응답은 확인하지 않았다.

병합 대상: 점수 구간은 병합 검토(52점)지만 시리즈에 00-preface·overview가 없고 이 글이 도입을 겸해(73~81행 보드 표, 39·132·148행 뒤 장 안내) 허브 예외로 보강에 뒀다. 목차형 허브는 아니므로 종합 검토에서 예외 적용을 다시 확인한다. 병합으로 간다면 후보는 `bsp/chapter01-what-is-bsp.md`의 부트 체인 절이다.

### `chapter02-u-boot-position.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(b6dedf23 시리즈 확장, ac24bb76 제목 변경, fa55144d 링크 일괄 수정, e85d7684 코드 블록 산문 이동, be973200 topics, 0a9dd7bc slug 고정)에 TF-A 문서·U-Boot doc·UEFI 명세·OpenSBI 소스와 대조한 커밋이 없다. 17행과 315행의 긴장은 일반론과 예시의 차이로 읽을 수 있어 오류 확인으로 올리지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | BL1~BL33 목록(72~94행)과 EDK II vs U-Boot 표(130~137행)는 TF-A·UEFI 개요 수준이다. 고유한 부분은 i.MX 8M Plus flash.bin 구성 트리(180~192행), SPL과 BL2 흐름 대조(218~226행), OpenSBI FW_PAYLOAD 빌드·QEMU 부트(237~271행), 선택 기준 트리(279~287행)다. 선택 기준은 280행 같은 한 줄 규칙이고, 66행 '거의 대부분은 U-Boot', 172행 '거의 안 씀', 287행 '거의 기본값'은 출처 없는 단정이다. |
| B | 12 | 네 컴포넌트 표(23~28행) → 컴포넌트별 절 → 분업(176~203행) → SPL(205~226행) → RISC-V(228~271행) → 선택 기준(273~287행) → 오해(289~309행) → 정리(311~320행)로 흐름은 완성됐다. 115행 '> 더 깊이 — ARM 아키 관점에서의 같은 주제'는 링크·본문이 없고, 277행은 TikZ TODO 주석만 남았고, 53행은 괄호가 깨진 불릿이다. 307~309행은 '오해' 절인데 답이 '맞습니다'다. AP-C-24에 따라 B ≤ 13. |
| C | 7 | U-Boot 콘솔 명령(56~64행), imx-mkimage(194~201행), OpenSBI 빌드(239~245행), QEMU 실행·출력(249~271행)이 있다. 133행 '수 MB·수백 KB', 154·157행 '수십 초·수 초', 305행 'SPL 50KB'는 출처 없는 수치라 C ≤ 8. 267행 로그 빌드 날짜(May 19 2026)가 글 날짜(4행 2026-05-09)보다 뒤다. QEMU 예는 U-Boot defconfig가 없다. |
| D | 8 | 비교한 글: 같은 시리즈 `chapter04-boot-stages.md` 67~74행(SPL과 BL2 한 자리 표, 모델 A·B)이 이 글 216~226행과 결론까지 같다. `chapter25-tfa-optee.md` 41~65·181행이 72~94·25~28행과, `chapter03-build-system.md` 44~50행이 209~212행과, `chapter01-boot-problem.md` 120~130행이 같은 요약을 한다. 다른 시리즈 `bsp/chapter07-tfa-trustzone.md` 23행이 113행과, 49·295~303행이 180~201행과 겹치고, `bsp/chapter01-what-is-bsp.md` 95·100행도 같다. EDK II·LinuxBoot 비교(117~174행)는 다른 글에 없다. |
| E | 7 | 제목의 U-Boot·TF-A·EDK II를 모두 절로 다룬다(36·68·117행). description(5행)·15행·정리(313~320행)가 '역할 분담'을 향한다. 직접 비교 표는 EDK II vs U-Boot(130~137행)뿐이고 U-Boot vs TF-A는 291~293행 설명이다. 결론(279~287행)의 근거가 얇다. |
| F | 5 | 324행 다음 편은 seriesOrder 3 `chapter03-build-system.md`와 맞고, 328~333행 관련 링크 6개와 146행 본문 링크도 대상과 맞으며 모두 `draft: false`다. 그러나 115행 '> 더 깊이 — …'는 대상 없는 관련 안내라 F ≤ 5. |
| G | 2 | 334~337행 TF-A·TianoCore·OpenSBI·LinuxBoot 홈 링크가 본문 주장(38행 연혁, 70행 '2013년 공개', 132행 'UEFI 2.10 완전 준수')과 연결되지 않는다. 98행 `tf-a/bl2/bl2_main.c` 경로에 버전이 없다. 버전은 로그 속 OpenSBI v1.5(255행)·U-Boot 2024.04(267행)뿐이다. |

uncertainties:
- 38행 'Wolfgang Denx가 1999년에 시작': 이름 표기(Denk)와 연도를 1차 자료로 확인하지 않았다.
- 70행 'ARM이 2013년에 공개', 132행 'EDK II UEFI 2.10 완전 준수' 미확인.
- 98~110행 bl2_main 조각이 upstream TF-A의 반환값 처리·`bl2_run_next_image` 인자와 같은지 미확인.
- 113행 'TF-A 없이는 PSCI가 없으니 SMP를 못 쓴다'는 spin-table 경로를 보면 과장일 수 있다. bsp/chapter07 23행도 같은 주장.
- 17행 'TF-A가 BL1·BL2·BL31 담당' vs 315행 'SPL + BL31 + BL33'·226행 'i.MX·Rockchip은 SPL 사용'의 긴장.
- 214행 'SPL과 Proper를 두 번 컴파일' vs ch03 294행 '세 번'(다른 글과의 차이).
- 267행 로그 날짜가 글 날짜보다 뒤다. 133·154·157·305행 수치는 출처가 없다.
- 307~309행 'OpenSBI는 RISC-V 전용 표준': SBI가 명세이고 OpenSBI는 구현이라 표현 확인 필요.
- 53행 괄호 깨짐으로 문장 의미가 불완전하다.

병합 대상: 글 전체를 합칠 대상은 없다(병합 대상 없음 — 생태계 비교는 독립 검색 의도가 있고 EDK II·LinuxBoot 비교 117~174행은 다른 글에 없음). 부분 병합은 BL 단계 목록(72~94행) → `chapter25-tfa-optee.md` 41~65행, SPL/BL2 흐름(216~226행) → `chapter04-boot-stages.md` 67~74행. 다음 조치는 보강: 겹치는 절을 링크로 줄이고 비교·선택 기준을 1차 자료(TF-A 문서, UEFI 명세 판, U-Boot doc/develop/uefi, OpenSBI docs)로 강화하며, 115행 빈 '더 깊이' 줄·277행 TODO·53행 괄호·307~309행 오해 절을 정리한다.

### `chapter03-build-system.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 430행 소제목(자주 하는 실수): '`savedefconfig`로 만든 파일 *그대로* 커밋'
- 432행 본문: '그룹별 빈 줄을 수동으로 넣지 마세요. 다음 `savedefconfig`에서 사라집니다'

같은 행동을 소제목은 실수로, 본문은 올바른 방법으로 써서 둘 다 참일 수 없다. git log(0a9dd7bc, be973200, fa55144d, ac24bb76, 400892d7, 3235d76c·20c1b507, 5534938b)에 1차 자료 대조 커밋이 없어 모순이 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | Kbuild 3단계(15·19~41행), 디렉터리 트리(56~130행), Kconfig depends on/select(134~165행), savedefconfig(245~264행)는 입문 글에 흔하다. 고유한 부분은 `$(SPL_TPL_)` 접두사로 Proper·SPL·TPL을 가르는 설명(281~294행), 빌드 로그 읽기(345~369행), CROSS_COMPILE 상대 경로 함정(417~428행), `obj-y` 무조건 포함(434~436행)이다. 405행 '간접 의존이 빠질 수 있습니다'는 조건 없는 완곡 표현이다. 앵커 part7-05(A 9)보다 SPL_TPL_ 절만큼 낫다. |
| B | 10 | 소스 받기(27~41행)부터 정리(447~456행)까지 흐름은 끝까지 간다. 그러나 430행과 432행이 반대 조언을 하고, 294행 '세 번'과 452행 '두 번'이 어긋나며, 제목의 '동작 추적'(.config → autoconf.h → obj-$(CONFIG_…))은 243행 한 문장뿐이다. AP-C-24로 B ≤ 13이고 확인된 모순까지 더해 10. |
| C | 7 | 명령(27~41·249~262·300~305·319~327행), 산출물 목록(45~54행), 로그 예(345~365행), 오류 예(372·440~442행)가 있다. U-Boot 태그와 호스트·툴체인 버전이 없다. 383~384행 크기(812032·84368 B)와 392~395행 map 수치는 환경 없는 수치라 C ≤ 8. 버전을 밝힌 part7-05(C 8)보다 약하다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter02-u-boot-position.md` 215행(두 번 컴파일)이 294·452행과 같은 주장이고, `chapter04-boot-stages.md`는 단계·EL·메모리 모델이라 역할이 다르다. 다른 시리즈 `bsp/chapter06-u-boot-porting.md` 46~85행 트리가 56~130행과 거의 같고, `buildroot/chapter03-kconfig.md` 321~349행 savedefconfig 흐름이 247~264행과, `modern-recipes/part7-05-kernel-build.md` 14·24~30행이 15·27~41행과 같다. SPL_TPL_ 절로 구별된다. |
| E | 5 | 제목(2행)이 '분석 — Kconfig·Makefile·defconfig 동작 추적'을 약속하지만 추적은 243행 한 문장이다. description(5행)의 네 키워드는 각각 절(134·266·205·296행)이 있어 더 내리지 않았다. |
| F | 5 | 460행 다음 편은 seriesOrder 4 `chapter04-boot-stages.md`와 맞고 안내 내용도 그 글 39·57·78·106행과 맞는다. 464~468행 관련 항목도 대상과 맞다. 그러나 469행 'Buildroot Ch 4: 패키지와 옵션'은 `buildroot/chapter04-first-build.md`('Buildroot 첫 빌드')로 가고 패키지 글은 `chapter05-package-system.md`다. 틀린 라벨이라 F ≤ 5. |
| G | 2 | 139행 drivers/mmc/Kconfig, 210행 configs/qemu_arm64_defconfig, 271행 drivers/mmc/Makefile 인용에 U-Boot 버전·태그가 없다. 1차 출처는 관련 항목 끝 U-Boot README(470행)·Kbuild 문서(471행)뿐이다. |

uncertainties:
- 213행 `CONFIG_SYS_TEXT_BASE`가 upstream에서 `CONFIG_TEXT_BASE`로 바뀌었다는 기억이 있다. 211~240행 발췌의 기준 태그를 확인하지 않았다.
- 294행 '세 번' vs 452행 '두 번'은 산문 개수 불일치(TPL은 선택)라 오류 확인에 넣지 않았다. SPL이 별도 .config를 쓰는지 CONFIG_SPL_* 심볼로 가르는지 미확인(290~292행은 후자에 가깝다).
- 49행 'u-boot-dtb.bin ← u-boot.bin + u-boot.dtb'와 361~363행 로그 순서(nodtb → CAT u-boot-dtb.bin → COPY u-boot.bin)의 관계, 48행 OF_SEPARATE와 216행 CONFIG_OF_BOARD=y, 362행 산출물의 관계를 확인하지 않았다.
- 330·415행 ARCH 환경 변수 시나리오, 389행 `make u-boot.map`이 make 타깃인지 미확인.
- 141~160행 Kconfig 발췌, 274행 `fsl_esdhc_imx.o`, 196행 'common/spl/Kconfig:33', 198행 'Selected by ARCH_OMAP2PLUS'를 upstream과 대조하지 않았다.
- 470행 U-Boot README 링크가 doc/로 옮겨졌다는 기억이 있어 유효성 미확인.

병합 대상: 점수 구간은 병합 검토이나 판정이 우선 조치라 병합 판단은 오류를 고친 뒤 다시 본다. 겹침이 큰 곳은 `bsp/chapter06-u-boot-porting.md` 46~85행(디렉터리 트리)이다. 보강 방향은 430·432행 모순 해소, U-Boot 태그 대조, autoconf.h 추적 절 보강, 트리 축소, 469행 라벨 수정이다.

### `chapter04-boot-stages.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 290행: 'SPL → BL31 인계: x0 = BL31 진입점'
- 310행: 'x0가 모든 단계에서 DTB를 가리킵니다', 379행: '단계 간 인계는 x0에 DTB physical address가 일관된 ABI입니다'

두 진술은 동시에 참일 수 없다. git log(0a9dd7bc, be973200, e85d7684, fa55144d, ac24bb76)에 1차 자료 대조 커밋도 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 고유한 부분은 SPL과 BL2 중 누가 DDR init을 맡는지 모델 A·B로 나눈 표(69~76행), 단계별 실행 위치·MMU/cache 상태(110~141행), 부트 로그 줄마다 단계 표시(316~348행), 실수 목록(350~370행)이다. BL1~BL33·EL 표(80~102행)는 TF-A firmware design 문서와 같고, 크기 표(47~53행)는 '수 KB ~ 수십 KB', '약 1 MB' 같은 출처 없는 대략값이다. 13~19 하단. |
| B | 12 | 19~37행 '왜 한 binary로 못 하나'에서 정리(372~381행)까지 흐름은 끝까지 간다. 55행 '> 더 깊이 — …'는 링크도 본문도 없는 빈 인용이고 272행 RISC-V 그림 자리는 TODO 주석이다. 290행 대 310행 모순이 열려 있어 B ≤ 13. |
| C | 7 | 코드는 '간략화' U-Boot 조각(158~227행)이라 대조할 수 없다. 크기 표(47~53행)와 메모리 맵(143~152행)은 출처·환경 없는 수치라 C ≤ 8. 부트 로그(316~346행)는 U-Boot 2024.04·BL31 v2.10·i.MX8MP EVK를 밝혔지만 빌드 날짜(317·326·329행)와 mkimage 'Created: Mon May 19 09:00:00 2026'(252행)이 글 날짜(4행 2026-05-09)보다 뒤다. 검증 절차는 370행 DEBUG_UART 한 줄뿐이다. |
| D | 8 | 비교한 글: 같은 시리즈 `chapter03-build-system.md`·`chapter05-falcon-mode.md`(역할 다름), `chapter24-spl-deep.md`, `chapter25-tfa-optee.md`, `chapter19-kernel-handoff.md`, 다른 시리즈 `bsp/chapter07-tfa-trustzone.md`, `bsp/chapter10-first-boot.md`, `modern-recipes/part3-12-bootloader-chain.md`. 39~53·95~102행 BL·EL 표 ↔ ch25 39~65행, 143~152행 메모리 맵 ↔ ch25 67~80행, 63행 RK3399 SRAM 32KB·TPL ↔ ch24 55~66행, 302~307행 x0~x3 ↔ ch19 27~30행, 312~348행 ↔ bsp ch10, 229~246행 ↔ part3-12. |
| E | 5 | 제목(2행)은 '부트 4단계 분해 — BL1·SPL·TPL·U-Boot Proper'인데 17행은 '5단계가 기본', 39행 H2는 'ARMv8-A의 다섯 단계'다. 제목의 네 이름은 본문 어느 체인(73~74행)에도 함께 나오지 않는다. |
| F | 5 | 385행 다음 편은 seriesOrder 5 `chapter05-falcon-mode.md`와 맞고, 389~396행 관련 항목 8개도 대상과 맞다. 그러나 55행 '> 더 깊이 — …'가 링크 없는 관련 항목이라 F ≤ 5. 전제 지식 안내가 없다. |
| G | 2 | 본문 출처는 397행 TF-A firmware design 링크 하나이고 특정 주장과 묶이지 않는다. 156·196·212행 U-Boot 소스 경로에 버전이 없다. 125·139·145~151행 i.MX 8M Plus 주소에 reference manual 출처가 없다. |

uncertainties:
- 212~226행 `spl_atf.c`의 `bl2_plat_get_bl_image_load_info()`·`bl31_entry(...)` 형태를 upstream으로 확인하지 않았다.
- 289~293행 SPL→BL31 x0~x3 규약을 TF-A 문서로 확인해 290행·310행 중 어느 쪽이 맞는지 정해야 한다.
- 148·256행 BL31 0x40000000 vs ch25 75행 0xBE000000(다른 글과의 차이).
- 149~150행 U-Boot Proper 영역(0x40200000~0x41000000)이 kernel 적재 주소 0x40480000을 포함한다. relocation 전제 설명이 없다.
- 98행 BL2 'EL3 또는 EL1-S'와 377행 'BL1~BL31은 EL3 secure'는 정리의 단순화로 보았다.
- 140행 'BL33 MMU off (cache on)'와 300행 '(MMU off, cache off)'의 관계가 설명되지 않았다.
- 366행 'SPL이 booti 직전에 MMU를 끄도록': booti는 U-Boot Proper 명령이라 주체 확인 필요.
- 63행 RK3399 SRAM 32KB를 TRM으로 확인하지 않았다. 252행 'Mon May 19 2026'은 달력상 화요일이다.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간 병합 검토 기준 후보는 `chapter25-tfa-optee.md`(BL 단계·EL 표·메모리 맵)와 `chapter24-spl-deep.md`(TPL·SPL)다. 'SPL과 BL2 중 누가 DDR init을 맡나'(69~76행)와 로그로 단계 구분(312~348행)은 독립 검색 의도가 있어 다음 조치는 보강이다. 먼저 290행과 310·379행의 x0 모순을 TF-A·U-Boot 1차 자료로 바로잡고, ch25와 겹치는 표·맵은 링크로 대신한다.

### `chapter05-falcon-mode.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(5534938b, 2003b8a6·ffe6517b, fa55144d, ac24bb76, be973200·0a9dd7bc)에 1차 자료 대조 커밋은 없고, 오류는 평가 중 직접 확인했다.
- (1) 341행 'dd seek=0x900 bs=512 ← OK' vs 338행 '0x900 sector = 1.125MB': GNU coreutils dd 9.12(gdd)로 실행하니 "'0x' is a zero multiplier" 경고 뒤 오프셋 0에 썼다. 176행처럼 /dev/sdX에 쓰면 sector 0을 덮는다.
- (2) 151행 `spl export fdt ${fdt_addr}` vs upstream doc/develop/falcon.rst(master) 129행 사용법 `spl export fdt [kernel_addr] [initrd_addr] [fdt_addr]`. 157~158행 출력 예(입력 주소 0x43000000이 그대로 결과 주소)도 falcon.rst 142~150행(결과 위치는 예측 불가, 실행 끝에 출력·fdtargsaddr)과 맞지 않는다.
- (3) 46행 'Falcon args 오프셋 ~800KB' vs 97행 ARGS_SECTOR=0x100(128KB)·165행 mmc write 0x100·184~185행 'dd seek=128'.
- (4) 350행 같은 줄: '"Failed to load args" 또는 바로 hang' vs '어떤 오류 메시지도 없습니다. 시리얼이 조용히 죽음'.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 strap GPIO로 개발·양산을 가르는 spl_start_uboot 예(202~215행), 부트 카운트 3회 recovery 예(220~233행), sector·KB 단위 함정(333~342행), 한계 다섯 가지(275~295행)다. 128~133·299~305행은 일반 목록이고, 54~71행 'common/spl/spl.c' 코드는 66행 주석과 달리 70행에서 무조건 jump_to_image_linux를 부르는 의사 코드다. 고유 함정 절(341행)에 오류가 있고 17행 '후방 카메라 2초'는 출처가 없다. |
| B | 12 | 개념(13~30행) → 원리(36~74행) → defconfig(76~101행) → spl_start_uboot(103~135행) → spl export(137~169행) → 굽기(171~193행) → 공존(195~236행) → 로그·시간(238~273행) → 한계·실수(275~367행) → 정리(369~378행)로 끝까지 간다. 오류 넷과 열린 불확실이 있어 B ≤ 13. 28·30행이 같은 문장을 두 번 쓴다. |
| C | 7 | 259~269행 '실제 측정값(BeagleBone Black, AM335x)' 표는 측정 방법·로그가 없어 C ≤ 8. 부트 로그(243~246행)는 i.MX8 계열, spl export 예(143~145행)는 imx8mp-evk, 202행은 IMX_GPIO_NR이라 측정 보드와 절차 보드가 다르다. 굽기 명령(178~188행)은 재현 가능해 보이지만 341행 dd 줄과 151행 인자가 틀렸다. |
| D | 13 | 비교한 글: 인접 `chapter04-boot-stages.md`(385·391행 안내뿐), `chapter06-device-tree.md`(480행 링크뿐), 같은 시리즈 `chapter24-spl-deep.md` 244~264행(IH_OS_LINUX·fallback·복구 요약이 15·82·285~291행과 겹치나 264행에서 이 글로 넘김), 다른 시리즈 `bsp/chapter15-boot-time-optimization.md` 141~156·282행(Falcon 개요·spl export·실패 경로가 76~92·137~169·195~197·289~291행과 겹침). 두 글 모두 요약이라 Falcon 상세 역할은 구별된다. |
| E | 7 | 제목 키워드(Falcon Mode, SPL, U-Boot Proper, 커널 직접 부팅)를 모두 다룬다. 다만 '부트 시간 단축'을 받치는 259~269행 표에 측정 근거가 없고 15행 '1초', 28·30행 '수백 ms', 271행 '1.3초', 372행 '수백 ms ~ 1초 이상'이 서로 다른 크기를 말한다. |
| F | 5 | 382행 다음 편은 seriesOrder 6 `chapter06-device-tree.md`와 맞고 386~391행 관련 항목 6개도 대상과 맞다. 그러나 392행 '원문 — U-Boot Falcon Mode docs'(doc/README.falcon)가 404(현재 doc/develop/falcon.rst)라 F ≤ 5. 273행 'Embedded Performance Engineering 시리즈에서 다룹니다'는 링크가 없다. |
| G | 2 | 본문 안 1차 출처는 404인 392행 링크 하나다. 로그 243·251행에 U-Boot 2024.04·Linux 6.6.0이 있지만 83·373행 CONFIG_SYS_SPL_ARGS_ADDR가 어느 판 기준인지 없고, falcon.rst(master) 67·485행은 CONFIG_SPL_PAYLOAD_ARGS_ADDR를 쓴다. 54행 소스 경로에 태그가 없다. |

uncertainties:
- 84·91행 CONFIG_SYS_OS_BASE 설명('kernel image가 적재될 메모리 주소')이 Kconfig 정의와 맞는지 미확인.
- 83·373행 CONFIG_SYS_SPL_ARGS_ADDR의 이름 변경 시점과 2024.04 기준 이름 미확인.
- 149~151행 'atags = ARMv7, fdt = ARMv8' 구분은 falcon.rst 129행에 없다.
- 54~71행 board_init_r 코드, 247~249행 SPL 로그 문자열이 upstream에 있는지 미확인. raw sector 적재(283행)인데 파티션 표기 0:1을 쓴다.
- 45·182행 U-Boot Proper 50KB, args 128KB 배치는 u-boot.bin이 78KB를 넘으면 겹친다.
- 259행 'BeagleBone Black, 1GB DDR'은 기억상 512MB다. 같은 표와 243~246행 i.MX8 로그가 같은 실험인지 알 수 없다(경험 진위 의심).
- 34행 '2012년 DENX의 Wolfgang Denx가 도입'은 falcon.rst 195~197행이 발표자만 적어 확정하지 못했다.

병합 대상: 병합 대상 없음. `chapter24-spl-deep.md` 244~264행과 `bsp/chapter15-boot-time-optimization.md` 141~156행은 이 글로 넘기는 요약이라 이 글이 Falcon 상세의 정본이다. 다음 조치는 보강: 341행 dd 줄 삭제 또는 10진수로 수정, 151행 인자를 falcon.rst 사용법(kernel_addr - fdt_addr)으로, 157~158행 출력 예와 fdtargsaddr 설명, 46행 args 오프셋을 128KB로, 350행 실패 관찰 하나로 정리, 측정 기록이 없으면 259~269행 표 TBD, 392행 링크를 doc/develop/falcon.rst로.

### `chapter06-device-tree.md` — 61점, 보강

confidence: 중간

factcheck: 미검증. git log(5534938b, 400892d7, 2003b8a6·ffe6517b·68525f0c, 3235d76c, ac24bb76, be973200, 0a9dd7bc, e8f4f432)에 U-Boot 소스·devicetree 명세와 대조한 커밋이 없다. 로컬 U-Boot clone이 없고 `data/upstream-tracking.yaml`에도 등록이 없어 평가 중 1차 자료를 열지 못했다. 48행 vs 333행은 .data가 binary 끝에 올 수 있어 모순으로 단정하지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | control DTB와 OS DTB를 나누고 fixup은 OS DTB만 대상이라는 틀(15·23~36행), CONFIG_OF_EMBED·SEPARATE·BOARD 장단점(58~59·77~78행), `fdt addr ${fdtcontroladdr}` 비추천(416~424행), booti `-` 누락(426~434행), ft_board_setup 전후 MAC 차이(436~447행)가 고유한 선택 기준이다. 36·405·438·460행은 완곡·일반 표현이다. 실측·실패 사례가 없어 part12-10(18)에 못 미친다. |
| B | 13 | 개념(19~36행) → control DTB 확보(38~98행) → 읽는 시점(100~135행) → fdt 명령(137~205행) → fixup(207~322행) → 메모리 위치(324~335행) → 공용 dts(337~361행) → overlay(363~390행) → 함정(392~460행) → 정리(462~471행)로 완결된다. ft_board_setup 호출 조건과 OS DTB 주소 선택은 없다. 정확성 불확실(122~132·224~240·255행 등)로 B ≤ 13. |
| C | 8 | fdt 세션(161~191행)은 load 바이트 수·print 출력까지 있고(163행 26580 bytes/9 ms ≈ 2.8 MiB/s 산술도 맞다), overlay 적용(367~374행)과 fdtoverlay 명령(382~386행)도 재현 가능하다. U-Boot 버전·보드 리비전이 없고 51·54·71행 크기, 333행 주소, 249·255행 예는 출처 없는 수치라 C ≤ 8. |
| D | 11 | 비교한 글: 같은 시리즈 `chapter05-falcon-mode.md`·`chapter07-driver-model.md`(겹침 적음), `chapter03-build-system.md`, `chapter08-board-init.md`, `chapter16-verified-boot.md`, `chapter19-kernel-handoff.md`, 다른 시리즈 `bsp/chapter03-device-tree-design.md`, `bsp/chapter06-u-boot-porting.md`. 109행 ↔ ch08 57행, 266~286행 ↔ ch08 381~388·522~524행, 303·322행 ↔ ch19 163~165행, 67~75행 ↔ ch03 48~49행·ch16 428행, 363~390행 ↔ bsp ch03 311~349행. 두 DTB와 fdt 명령·fixup이라는 핵심 질문은 이 글에만 있다. |
| E | 7 | 제목의 '로딩 시점'은 100~135행, 'fixup 메커니즘'은 207~322행이 답한다. '추적'은 부트 로그·디버거 없이 간략화한 소스 발췌로만 한다. 제목은 '부트로더' 일반인데 본문은 U-Boot만 다뤄 E ≤ 8. |
| F | 7 | 475행 다음 편은 seriesOrder 7 `chapter07-driver-model.md`와 맞고, 479~485행 관련 항목 7개(ch3·5·7·8·15·19, bsp ch06)의 라벨·대상이 맞다. 328행 두 DTB 흐름 그림, 392~460행 함정별 소절이 글 고유 구조다. 전제 지식 안내가 없어 8 이상은 주지 않았다. |
| G | 2 | 105·120·222·306·342행 소스 경로에 U-Boot 버전·태그가 없다. 486·487행 외부 링크(devicetree.org 명세, U-Boot Device Tree Control 문서)는 글 끝 목록이라 주장과 연결되지 않는다. |

uncertainties:
- 17행 'Device Tree는 Linux의 발명'은 Open Firmware(IEEE 1275) 기원이라는 기억과 맞지 않는다. 같은 줄 'U-Boot 2.0 시대(2014년경)'는 연도.월 버전 체계와 맞지 않는다. 'DT 없이 동작하는 U-Boot이 거의 없습니다'는 출처 없는 일반화.
- 90~95행 `board_fdt_blob_setup(int *err)` 시그니처, 107~114행 init_sequence_f 순서, 122~132행 fdtdec_setup 발췌(129행 `err` 미선언) 미확인.
- 229~232행 `fdt_fixup_memory_banks` 인자(배열을 받는다는 기억), 255행 `#size-cells = <0x02>`인데 한 셀에 0x100000000을 넣은 표기 미확인.
- 48행 'OF_EMBED는 .data'와 333행 '(embed인 경우 binary 끝에)'의 관계. 127행은 OF_SEPARATE를 `&_end`로 둔다.
- 426행 소제목 '3번째 인자'와 428·433행(둘째 자리)이 어긋난다. 위치 표기 실수로 보았다.
- ft_board_setup 호출에 CONFIG_OF_BOARD_SETUP이 필요하다는 ch08 591~594행 설명이 이 글에 없다.
- 72행 'u-boot-dtb.bin = u-boot.bin + u-boot.dtb' vs ch16 241행 'cat u-boot-nodtb.bin u-boot-dtb.dtb > u-boot.bin', 333행 0x40080000 vs ch19 134행 kernel_addr_r(다른 글과의 차이).
- 451행 fdt_getprop 권장, 455~460행 dtc 빌드 실패 출력, 51·54·71·163행 값이 실측인지 미확인.

### `chapter07-driver-model.md` — 63점, 보강

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc, be973200, ac24bb76, 작성·text 블록 정리 커밋)에 U-Boot 소스나 공식 DM 문서와 대조한 커밋이 없다. 평가 중에도 1차 자료를 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | legacy board_*_init 코드(23~54행)와 DT 노드(60~68행) 비교, usdhc 두 노드가 udevice 두 개가 되는 예(163~187행), lists_bind_fdt 발췌(199~224행), bind/probe 분리와 lazy probe(228~261행), dtoc 생성 코드(362~384행), 가상 센서 driver와 dm tree 결과(388~472행)가 이 글의 구성이다. 삼각 구조·bind/probe 구분은 558~559행 공식 문서 내용과 같고, 503·526행은 완곡 표현이다. 13~19 하단. |
| B | 13 | 구조(72~187행) → binding(189~226행) → bind/probe(228~261행) → DM_FLAG(263~287행) → 진단(289~345행) → SPL·OF_PLATDATA(347~386행) → 새 driver(388~472행) → 함정(474~533행) → 정리(535~544행)로 완성됐다. 151~152행 priv_auto/platdata_auto 혼용, 265~275행 런타임 상태를 driver .flags 표에 넣은 점, 411·427행 bus device를 dm_i2c_read에 넘기는 코드가 의심으로 열려 있고 499행 함정 설명이 불분명하다. |
| C | 8 | dm tree 출력(293~312행), probe 실패 재현(318~325행), dm uclass(331~343행), dtoc 로그(362~366행), 새 driver 뒤 dm tree(466~470행), Kconfig(528~533행)가 있다. U-Boot 버전·보드·defconfig가 없고 386행 'SPL 크기 수 KB 감소', 327행 '원인 대부분은 clock 또는 regulator'는 출처 없는 주장이라 C ≤ 8. 445행 UCLASS_SENSOR는 빌드 가능 여부가 불확실하다. |
| D | 11 | 비교한 글: 같은 시리즈 `chapter06-device-tree.md`(겹침 없음), `chapter08-board-init.md` 103·569~571행(PRE_RELOC가 277·487~495행과 같음), `chapter24-spl-deep.md` 116~127행(SPL_DM·OF_PLATDATA·dtoc가 349~386행과 겹침), `chapter04-boot-stages.md` 76·141행(언급만). 다른 시리즈 `bsp/chapter06-u-boot-porting.md` 352~364행(미probe mmc와 'clock·regulator 부재')이 316~327행과 같은 진단 흐름이다. `bsp/chapter10-first-boot.md` 111행, `qemu-riscv/chapter09-full-stack-boot.md` 174행은 겹침 없음. DM 구조 설명은 이 글뿐이다. |
| E | 8 | 제목의 uclass·driver·device 구조와 description의 'DT 기반 driver binding'을 72~187·189~226행이 다룬다. 대상 독자와 해결할 문제가 도입(13~17행)에 없어 9 이상은 주지 않았다. |
| F | 7 | 548행 다음 편은 seriesOrder 8 `chapter08-board-init.md`와 맞고, 552~557행 관련 항목 6개(ch03·06·08·09·21, bsp ch06)의 라벨·주제가 맞고 모두 `draft: false`다. 193~197행 binding 단계 목록, 476~533행 증상별 H3가 고유 구조다. 전제 지식(Ch 6 DT) 안내가 없다. |
| G | 2 | 558~559행 공식 DM 문서 링크는 'latest' 경로라 버전이 없고 관련 항목 끝에 있다. 81·106·124·200·248행 소스 경로에 릴리스·태그가 없다. 17행 '2014년 이전'도 출처가 없다. |

uncertainties:
- 151~152행 priv_auto(새 이름)와 platdata_auto(옛 이름)를 함께 썼고 380~382행은 새 이름 U_BOOT_DRVINFO·.plat을 쓴다. upstream 미확인.
- 265~275행 DM_FLAG_ACTIVATED·DM_FLAG_NAME_ALLOCED를 driver 플래그로 나열했고 254행은 dev->flags에서 읽는다. include/dm/device.h 미확인.
- 411·427·431행 dev->parent를 dm_i2c_read/dm_i2c_reg_write에 넘기는 것, 428행 dev_read_addr 결과를 u8에 넣는 것 미확인.
- 398·445·531행 sensor.h, UCLASS_SENSOR, CONFIG_DM_SENSOR가 upstream에 있는지 미확인.
- 146·183행 'fsl-esdhc-mmc' vs 381행 'fsl_esdhc_imx'. 이름 매칭 규칙을 글이 설명하지 않아 모순으로 확정하지 않았다(bsp/chapter06 363행은 fsl_esdhc_imx).
- 302~303행 dm tree는 probe 전인데 339~340행 dm uclass는 '*'를 붙였다. '*'의 의미를 글이 정의하지 않았다.
- 48~51행 주석은 'I2C 1번·2번 init'인데 두 호출이 `i2c_init(I2C_SPEED, 0)`으로 같다.
- ch04 141행 '모든 driver probe'는 이 글 245행 lazy probe와 어긋난다(다른 글과의 차이).
- 17·386·507행 주장은 출처가 없고, 213행 발췌의 id 변수는 선언되지 않았다.

### `chapter08-board-init.md` — 57점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(출력·산술과 산문)이다.
- ① 435행 'reloc off가 원본 주소와의 차'와 413~414행 bdinfo(relocaddr 0xbfe00000, reloc off 0x7fc00000)로 원본 주소는 0x40200000이고, 같은 출력 407~408·424행이 DRAM이라 보인 0x40000000~0xbfffffff 안이다. 15·17·599행 'board_init_f는 SRAM에서 시작해 DRAM training 뒤 자신을 DRAM에 복사'와 동시에 참일 수 없다.
- ② 193~194행 코드는 relocaddr = ram_top - mon_len을 4KB로 내림 정렬하므로 여백이 4KB 미만이다. 202~222행 그림은 0xBFE00000~0xC0000000(2MB)을 '(4KB align)'으로 적었다.
- ③ 465행은 dram_init 178ms를 'DDR training 시간'이라 하지만 같은 글의 dram_init 코드(119~124·130~135·496~500행)는 크기만 대입하고, bootstage에서 SPL은 447행 'end SPL'에서 이미 끝났다.

git log(0a9dd7bc, be973200, ac24bb76, ffe6517b, 3235d76c, 2003b8a6, 5534938b, 400892d7, e8f4f432)에 1차 자료 대조 커밋은 없다. 평가자가 global_data.html로 168·174·176행 r9/x18 주장을 확인했다고 적었고, 재검에서는 그 URL이 200인 것만 확인했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 고유한 부분은 pre-reloc·post-reloc·kernel handoff 단계별 hook 지도(319~395행), board_init / board_init_f / board_early_init_f 구분(579~587행), dram_init 누락·DM_FLAG_PRE_RELOC·gd 레지스터 실수 목록(533~595행), bootstage로 병목 읽기(441~465행)다. init_sequence_f/r 배열(54~87·258~284행)과 gd_t 구조(147~165행)는 upstream을 버전 없이 옮긴 수준이고, 핵심 주장 '왜 두 단계인가'(19~37행)가 413~414행 출력과 맞지 않는다. |
| B | 12 | 문제 제기(19행) → 흐름(47~313행) → hook(315~397행) → 상태 확인(399~465행) → 실수(533~595행) → 정리(597~606행)로 완성됐다. SPL이 있는 구성에서 U-Boot proper가 이미 DRAM에서 시작하는 경우를 다루지 않는다. 54~86행 배열 순서, 561행 weak dram_init 등 불확실로 B ≤ 13. |
| C | 7 | bdinfo(403~433행)와 bootstage(441~463행)에 수치가 있지만 보드·U-Boot 버전·defconfig가 없다(버전은 73행 주석 '2024.04...'뿐). C ≤ 8. 227~246행 relocate.S는 '...' 생략 조각이고 465행 178ms 해석은 119~124행 코드와 맞지 않는다. |
| D | 11 | 비교한 글: 같은 시리즈 `chapter07-driver-model.md` 277·487~489행(PRE_RELOC가 104·571~573행과 겹침), `chapter09-dram-init.md`(역할 다름, 17·398행은 board_init_f를 SPL 문맥으로 씀), `chapter22-debugging.md` 68~75행(bdinfo가 403~435행과 겹침), `chapter24-spl-deep.md` 306~307행(bootstage가 437~465행과 겹침), `chapter21-board-porting.md` 166·210~226행(116~124·496~507행과 겹침). 다른 시리즈 `bsp/chapter06-u-boot-porting.md` 234~264행, `modern-recipes/part7-01-linux-boot-flow.md` 37행. init_sequence 흐름과 hook 지도는 이 글에만 있다. |
| E | 7 | 제목의 '분리 이유', description, 19~37·47~297행, 정리 599~604행이 같은 질문을 향하지만 제목이 약속한 '분리 이유'(SRAM→DRAM)가 413~414행 출력과 맞지 않는다. |
| F | 5 | 610행 다음 편은 seriesOrder 9 `chapter09-dram-init.md`와 맞고 소개 내용(ZQ·leveling)도 그 글 25~38행과 맞다. 614~620행 관련 링크 7개도 대상과 맞다. 그러나 621행 '원문 — U-Boot board init flow'(develop/board_init.html)가 404라 F ≤ 5. 202~223행 ASCII 메모리 맵은 43행 TikZ 그림과 중복되는 §6 위반 후보다. |
| G | 2 | 52·145·171·187·228·256·300행 upstream 경로에 버전·태그가 없고 622행 global_data 문서(200)만 유효한 공식 링크다. 403~463행 출력에 보드·버전이 없다. |

uncertainties:
- 54~86행 init_sequence_f, 258~283행 init_sequence_r 항목 순서를 특정 버전 common/board_f.c·board_r.c와 대조하지 않았다(upstream clone 없음).
- 89~94·286~294행 루프는 initcall_run_list의 단순화로 보이나 미확인.
- 165행 gd 매크로와 174·176행 DECLARE_GLOBAL_DATA_PTR 형태, 189~197행 setup_dest_addr 코드, 561행 weak dram_init 반환값 미확인.
- 552·557행 gd->arch에 보드 필드를 추가하라는 권고의 관행 여부 미확인.
- 430행 irq_sp(17자리)와 431행 sp start의 자릿수 불일치, 432행 'Early malloc usage' 표기 미확인.
- 447~455행 bootstage 레코드 단위, 390행 board_prep_linux 시그니처, 509행 board_phys_sdram_size 존재 미확인.
- ch04 139·148~149행, ch22 75행, part7-01 37행(v2025.04 대조)은 U-Boot proper가 0x40200000(DDR)에서 시작한다고 쓴다. 이 글 15~17행과 충돌한다(다른 글과의 차이, 내부 모순 ①과 같은 방향).

병합 대상: 병합 대상 없음. init_sequence_f/r 흐름과 hook 지도는 시리즈 안에서 이 글에만 있어 다음 조치는 보강이다. ① 15·17·33·599행 SRAM 전제를 SPL 구성에 맞게 고치고 common/board_f.c·arch/arm/lib/crt0_64.S를 버전 고정으로 대조, ② 202~222행 메모리 맵을 193~194행 코드와 맞게 다시 그리고 TikZ로, ③ 465행 해석 수정, ④ 621행 404 링크 교체와 bdinfo·bootstage 출력에 보드·버전 표기.

### `chapter09-dram-init.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 네 가지다.
- (1) 114~116행 매크로 합 MR0_CL_17=0x44, MR0_DLL_RESET=0x100, MR0_WR_RTP_12_6=0xA00 → 0x0B44 vs 120행 주석 'MR0 = 0x0A50'.
- (2) 139행 'Physical address 30 bits' vs 140행 '[29:27] bank group + bank (5 bit)'([29:27]은 3비트, 합 32비트). 160행 `(pa >> 27) & 0x1F`도 비트 30·31을 읽는다.
- (3) 136행 '1 GB chip(16-bank, 16-bit DQ)' vs 140~143행 매핑: 16 × 2^14 × 2^10 × 2 byte = 512 MB이고 143행 '[2:0] byte offset 3 bit'는 8바이트 폭을 가정한다.
- (4) 184·186행 MSTR_DDR4=1<<4, MSTR_ACTIVE_RANK1=1<<24 vs 269행 `0xa3080020` 주석 'DDR4, 32-bit, 1 rank'(비트 4=0, 비트 24·25=1).

git log(5534938b, b6dedf23, c38cb67c·e85d7684, fa55144d, ac24bb76, be973200·0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 uMCTL2 레지스터 그룹 표(65~76행)와 'read가 0xFF면 ADDRMAP·DFITMG 의심'(78행), MR0~MR7 표(97~106행)와 MR0/MR1 디코딩(110~127행), INIT3/4/6/7 packing(130행), dfi_init 의사 코드(226~249행), DCD 누락·ZQ 저항 BOM 함정(403~404행)이다. stack 비교(43~49행), training 표(284~290행), 벤더 tool(262행)은 입문 수준이고, 고유 가치의 중심인 디코딩·매핑 예가 산술이 맞지 않는다(120·136~143·269행). 165행 '±20%'는 출처가 없다. |
| B | 10 | 큰 그림(21~37행)부터 정리까지 간다. 그러나 power-up sequence 절(198~222행)은 굵은 단계 제목 9개 사이가 빈 줄뿐이고, 제목의 PHY training은 표(284~290행)와 단순화 코드(294~311행)뿐이다. MR 순서·ZQCL 위치·0xd0000 의미 불확실이 열려 있고 빈 절과 산술 오류로 10. |
| C | 6 | mtest·memtester·stress-ng 명령과 출력(340~365행)이 있으나 보드·U-Boot 버전·실패 출력이 없다. 226~249행 의사 코드는 DDRC_DFIMISC 등을 정의하지 않는다. 198~210행 시간값, 165행 ±20%는 출처 없는 수치라 C ≤ 8. 120·139~143·269행은 독자가 재현하면 다른 값을 얻는다. |
| D | 7 | 비교한 글: 인접 `chapter08-board-init.md`(겹침 적음)·`chapter10-storage-boot.md`(겹침 없음), 같은 시리즈 `chapter26-ddr-training.md`, 다른 시리즈 `bsp/chapter05-ddr-params.md`, `modern-recipes/part4-14-ddr-init-failure.md`. 284~290행 ↔ ch26 41~47행, 294~311행 ↔ ch26 56~86행, 39~59행 ↔ ch26 88~106행, 404행 ↔ ch26 211~213행, 262·321~332행 ↔ bsp ch05 96~133행, 336~365행 ↔ bsp ch05 232~260행, 313행 ↔ bsp ch05 203~212행, 194~222행 ↔ part4-14 30~43행. 61~190행만 이 글에 있다. |
| E | 7 | 제목과 description의 '레지스터 프로그래밍, training, 파라미터 위치'를 61~249·280~313·315~334행이 답한다. PHY Training은 표 하나와 단순화 코드뿐이라 9 이상은 주지 않았다. |
| F | 4 | 423행 다음 장은 seriesOrder 10 `chapter10-storage-boot.md`와 맞고 427~430·432행 라벨도 맞다. 그러나 431행 'Ch 28: Flash 레이아웃 — DDR 파라미터 blob·firmware의 저장 위치'는 `chapter28-flash-layout.md`에 DDR blob 내용이 없고(13·31행 XIP 맥락뿐), 192행 '8장에서 본 ddr_ecc_scrub()'도 ch08에 ecc·scrub이 없다. 틀린 라벨로 F ≤ 5, 198~222행 빈 단계 제목까지 감안해 4. |
| G | 2 | 111행 'JESD79-4 § 4.1.2'와 433행 JESD79-4A 링크, 295·383행 경로가 있으나 U-Boot 태그, uMCTL2 databook 판, i.MX8M Mini RM 판이 없다. 82~90행 오프셋과 266~275행 벤더 표의 출처가 연결되지 않는다. |

uncertainties:
- 205~213·405행 'MR2 → MR3 → MR1 → MR0'을 95행에서 DDR4 기준이라 했지만 part4-14 30~43행은 같은 순서를 DDR3 절차로 적는다. JESD79-4로 확인하지 않았다.
- 210행 ZQCL 위치(MRS 앞) vs part4-14 38행(MR0 뒤).
- 301행 `dwc_ddrphy_apb_wr(0xd0000, 0x1)`='training 시작' vs ch26 70~73행(0xd0000은 MicroContMuxSel, 시작은 0xd0099).
- 292·416행 'STM32MP1은 DDR firmware blob을 가진다'와 ch26 147~162행 표의 차이.
- 386행 주석과 389·393행 ddr_get_ecc_mode()·dram_self_test()가 upstream imx8mm_evk spl.c에 있는지 미확인.
- 45~49행 전압·속도 표, 286·404행 240Ω ±1%, 177행 ECC 12.5%는 출처가 없다.
- 404행 'X-ray로 저항 값을 직접 측정'은 표현 오류로 보인다. 332행 'mar진' 오타.

병합 대상: 판정은 오류 확인으로 우선 조치이고 merge_note는 비어 있다. 점수 구간 병합 검토 기준으로 겹침이 큰 글은 `chapter26-ddr-training.md`(training 표·코드)와 `bsp/chapter05-ddr-params.md`(벤더 tool·stress test)다. 레지스터 그룹·MR 디코딩·주소 매핑(61~190행)은 이 글에만 있어 오류를 고친 뒤 병합 여부를 다시 본다.

### `chapter10-storage-boot.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(e4f6db70 'Qualify BSP storage and DDR guidance'는 출처 없는 완곡화, 0a9dd7bc·be973200·ac24bb76은 메타데이터)에 1차 자료 대조 커밋이 없다. 원문 내부 모순 여섯 가지다.
- (1) 130행 'BOOT_ACK [7]' vs 149~150행 0x49(비트7=0)를 BOOT_ACK=1로, 101행 0x48(비트7=0)을 'ack enabled'로.
- (2) 131~134행 표 [5:3]=001이 boot0 vs 101행 0x48([5:3]=001)을 'boot1'로.
- (3) 106·107행이 DEVICE_LIFE_TIME_A(0x02)와 _B(0x01)를 같은 EXT_CSD[269]에 둠.
- (4) 158~162행 `mmc bootbus 0 2 0 0`의 arg4=0을 'SDR backward-compatible'로 설명 vs 367행 같은 명령에 '# 8-bit DDR' 주석, 99행 실행 직후 102행 덤프 0x12 '8-bit DDR boot'.
- (5) 304행 0xEB quad I/O 133MHz ~64MB/s vs 335·344행 같은 0xEB를 100MHz로 64MB/s(상한 100×4/8=50MB/s, 344행 11ms·125ms도 64MB/s 기준).
- (6) 222행(부트 ROM 가정과 page size·ECC가 맞아야 SPL이 읽힘)·225~235행 i.MX8M 예 2KB/64B OOB·BCH-8 vs 250행 표 i.MX8M default 2KB/128B OOB.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 고유 내용은 EXT_CSD 덤프와 필드 해석(97~110행), PARTITION_CONFIG 비트 필드와 partconf 인자 대응(128~153행), 미디어별 load time 표(337~346행), SD→eMMC→OTA-only 전환과 fuse 명령(352~374행), 부트 ROM과 Linux MTD의 OOB 가정 불일치(254행), SPL·U-Boot ECC strength 불일치 함정(438행)이다. 모두 출처가 없고 레지스터 해석·SPI 처리량부터 어긋난다. 350행은 완곡 표현이다. 13~19 아래쪽. |
| B | 12 | BOOTSEL(21~36행) → eMMC/SD(38~165행) → SATA(167행) → NAND(187~268행) → SPI NOR(270~331행) → 성능 비교(333~350행) → 미디어 전환(352~376행) → boot.scr(378행) → GPT(396행) → 함정(428~438행) → 정리(440~447행)로 끝까지 간다. PARTITION_CONFIG·BOOT_BUS_CONFIG 해석이 엇갈려(101·130·133·149·162·367행) 어느 값이 boot0이고 ack인지 답을 얻지 못한다. description의 SPI NAND는 292행 두 문장뿐이다. |
| C | 8 | U-Boot 명령과 출력(44~60·171~183·191~205·224~242행), force_ro·dd 절차(64~72행), mkimage·parted(382~419행)가 있다. 335행 환경(i.MX8M Plus, eMMC 5.1 HS400, w25q256)을 적었지만 337~346행 값은 burst rate × 크기 산술과 그대로 같고(343행 0.7MB/6MB/s=117ms) NAND·SATA 행은 그 환경에 없다. 344행 64MB/s는 상한을 넘는다. C ≤ 8. |
| D | 10 | 비교한 글: 인접 `chapter09-dram-init.md`, `chapter11-network-boot.md`(겹침 없음), 같은 시리즈 `chapter28-flash-layout.md`(124~153행 partconf ↔ 216~243행, 187~218행 UBI ↔ 154~214행), `chapter12-usb-boot.md` 435행(같은 partconf 명령), 다른 시리즈 `tools/debugging/embedded/chapter12-bootrom-stall.md` 95~103행(draft, force_ro·dd 절차가 64~68행과 같음). 미디어별 부트 ROM·U-Boot 명령 비교 역할은 구별된다. |
| E | 7 | 제목의 MMC·SCSI·NAND·SPI Flash를 모두 다루고(38·167·187·270행) 333~350행에 비교 표가 있다. description의 SPI NAND는 292행 두 문장뿐이고, '분석'에 비해 레지스터·처리량 해석이 어긋난다. |
| F | 5 | 451행 다음 장은 seriesOrder 11 `chapter11-network-boot.md`(21·99·165·277행 절)와 맞고 링크 대상은 모두 `draft: false`다. 그러나 110행은 13장이 헬스 체크에서 값을 읽는다 하지만 `chapter13-env-bootcmd.md`에 관련 내용이 없고(grep 0건), 268·460행은 28장이 redundant SPL을 다룬다 하지만 ch28은 redundant env(113~118행)뿐이고 173행은 'block 0은 반드시 good'이다. 459행 'Ch 26: DDR 컨트롤러'는 대상 제목 'DDR Training과 PHY Calibration'과 다르다. F ≤ 5. |
| G | 1 | 본문에 1차 출처 링크가 없다. JEDEC eMMC 표준(EXT_CSD), U-Boot cmd/mmc.c, i.MX 레퍼런스 매뉴얼(244행), W25Q256 데이터시트(437행)를 이름으로만 말하거나 언급하지 않는다. U-Boot 버전도 없다. |

uncertainties:
- 101·130행 BOOT_ACK가 JEDEC에서 비트 6인지 확인하지 않았다(내부 모순만으로 판정).
- 105~107행 PRE_EOL_INFO·DEVICE_LIFE_TIME_A/B의 실제 인덱스(267·268·269 추정) 미확인.
- 100행 `mmc ecsd` 명령, 311~313행 `sf probe 0:0 100000000 0`의 quad I/O 전환과 출력 미확인.
- 335행 환경에서 SATA AHCI(346행)가 가능한지, 표 값이 실측인지 의심된다.
- 244~252행 부트 ROM page/OOB/ECC 가정, 268행 Micron·Macronix·Toshiba block 0 보장, 364~371행 fuse 뱅크·주소, 436행 BOOT_ACK=0 fallback, 331행 XIP '10~50배'는 출처가 없다.
- 277~279행 0x100000부터 8MB erase/write가 289행 DTB 오프셋 0x500000을 덮는다. 432행 경고와 같은 상황인지 미확인.
- 62행 'boot partition 1을 먼저 봅니다' vs 126행 'PARTITION_CONFIG가 가리키는 boot partition'. 'boot partition 1'의 뜻이 불명확해 오류로 올리지 않았다.
- 201행 UBI 4096 MiB와 236행 512 MiB는 다른 예시(191·225행)일 수 있다.

병합 대상: 판정은 오류 확인으로 우선 조치. 점수 구간 기준 후보는 `chapter28-flash-layout.md`(eMMC partconf 216~243행, NAND BBT·UBI 154~214행)다. 미디어별 부트 ROM 경로와 U-Boot 명령 비교라는 독립 검색 의도가 있어 다음 조치는 보강이다. 먼저 JEDEC EXT_CSD 정의, U-Boot mmc 소스, W25Q256 데이터시트, i.MX8M 레퍼런스 매뉴얼로 101·106~107·130~134·149·162·367행, 304·335·344행, 222~250행을 바로잡고, ch28과 겹치는 partconf·UBI는 링크로 넘기며 110·268·459·460행 링크 설명을 고친다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** 집필 커밋 5534938b(첫 22장 일괄)·b6dedf23 이후 slug·메타데이터·제목·TikZ·text 블록 정리·링크 일괄 커밋뿐이고, ch10은 출처 없는 e4f6db70 'Qualify …'만 거쳤다. `factcheck: 검증됨`은 0편이고 6편은 원문 내부 모순으로 오류 확인이다. Bootloader Internals는 `/fact-check-round` 대상이다.
- **U-Boot 소스 경로에 버전·태그 없음, upstream 미등록 (9편).** ch03 139·210·271행, ch04 156·196·212행, ch05 54행, ch06 105·120·222·306·342행, ch07 81·106·124·200·248행, ch08 52·145·171·187·228·256·300행, ch09 295·383행, ch02 98행(TF-A), ch10은 경로 자체도 없음. U-Boot가 `data/upstream-tracking.yaml`에 없어 `audit:upstream`·`audit-cited-symbols.py`가 이 시리즈를 보지 않는다.
- **1차 출처가 본문 주장에 붙지 않고 관련 항목 끝 '원문 —' 링크로만 있음 (9편).** ch01 190~191행, ch02 334~337행, ch03 470~471행, ch04 397행, ch05 392행, ch06 486~487행, ch07 558~559행, ch08 621~622행, ch09 433행. G가 10편 모두 1~2점인 공통 원인이다. 그중 ch05 392행(doc/README.falcon)과 ch08 621행(develop/board_init.html)은 404로 확인했고, ch01 191행(booting.txt)·ch03 470행(README)은 옛 경로로 의심된다.
- **출처·측정 환경 없는 구체 수치 (10편 전부, C ≤ 8 상한 반복).** ch01 136·140~146행, ch02 133·154·157·305행, ch03 383~384·392~395행, ch04 47~53·143~152행, ch05 17·259~269행, ch06 51·54·71·333행, ch07 327·386행, ch08 403~463행, ch09 165·198~210행, ch10 337~346행.
- **실행 기록의 날짜가 글 날짜(2026-05-09)보다 뒤 (3편).** ch01 92행, ch02 267행, ch04 252·317·326·329행이 모두 'May 19 2026'이다. 작성 커밋 시각(5534938b)보다도 뒤라 실제 실행 출력인지 의심된다(경험 진위, C ≤ 12 조항).
- **빈 자리 잔재 (3편).** 링크·본문 없는 '> 더 깊이 — ARM 아키 관점에서의 같은 주제'(ch02 115행, ch04 55행), 공개 글의 TikZ TODO 주석(ch02 277행, ch04 272행; 루프 밖 ch24 66행 부근·ch25 45행), 굵은 단계 제목만 남은 빈 절(ch09 198~222행, c38cb67c 변환 흔적). fa55144d 링크 정리와 c38cb67c 변환이 남긴 패턴으로 보여 시리즈 나머지 글도 grep이 필요하다.
- **링크 라벨·설명이 대상 글 내용과 다름 (3편).** ch03 469행(Buildroot Ch 4 '패키지와 옵션' → 첫 빌드 글), ch09 431행(ch28에 DDR blob 없음)·192행(ch08에 ddr_ecc_scrub 없음), ch10 110행(ch13에 헬스 체크 없음)·268·460행(ch28에 redundant SPL 없음)·459행(ch26 옛 제목). 루프 밖에서는 bsp/chapter15 306행 'Bootloader — Falcon Mode'가 ch01로 간다.
- **같은 내용이 시리즈 안팎에서 반복 (D 감점, 6편 이상).** BL1~BL33·EL 표(ch01 120~123행, ch02 72~94행, ch04 80~102행 ↔ ch25 41~65행, bsp/chapter07, bsp/chapter01), SPL vs BL2 흐름(ch02 216~226행 ↔ ch04 67~74행), U-Boot 트리·savedefconfig(ch03 ↔ bsp/chapter06·buildroot/chapter03), DDR training·stress test(ch09 ↔ ch26·bsp/chapter05·part4-14), eMMC partconf·UBI(ch10 ↔ ch28·ch12), dm tree 진단(ch07 ↔ bsp/chapter06). 시리즈 간 역할 분담 정리가 필요하다.
- **같은 시리즈 글 사이 사실 충돌 (6편 관련).** 부트 단계 수(ch01 158행 '네 단계' vs ch04 17행 '5단계', ch04 제목 '4단계'), 커널 진입 EL(ch01 56행 vs ch19 36행), SPL 컴파일 횟수(ch02 214행 '두 번' vs ch03 294행 '세 번'), U-Boot proper 시작 위치(ch08 15~17행 SRAM vs ch04 139·148~149행·ch22 75행 DDR 0x40200000), BL31 주소(ch04 148행 vs ch25 75행), lazy probe(ch07 245행 vs ch04 141행), DDR training 시작 레지스터(ch09 301행 vs ch26 70~73행). 다른 글과의 모순이라 오류 확인에는 넣지 않았고, fact-check 라운드에서 1차 자료로 한 번에 정한다.
- **공통 H2 뼈대 (7편 확인).** '한 줄 요약 → 본문 → 자주 하는 실수 → 정리 → 다음 편(다음 장 예고) → 관련 항목'이 ch03·04·05·06·07·09·10에 같은 순서로 있다(예: ch03 13·401·447·458·462행, ch06 13·392·462·473·477행). 루브릭 9절 scaled content 수치 기록 대상이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 6편은 오류 건수 순으로 본다. ch10(6건: EXT_CSD 비트·bootbus·SPI 처리량·OOB), ch09(4건: MR0 합·주소 비트·용량·MSTR), ch05(4건: dd seek·spl export 인자와 출력·args 오프셋·350행), ch08(3건: SRAM 전제·정렬 여백·178ms 해석), ch04(x0 인계), ch03(savedefconfig 조언). 각 글의 1차 자료(JEDEC, U-Boot 태그 고정 소스, TF-A 문서, falcon.rst, 데이터시트·RM)를 열고 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 404 링크 두 개(ch05 392행, ch08 621행)와 틀린 라벨(ch03 469행, ch09 192·431행, ch10 110·268·459·460행)을 고친다. F 감점 원인이라 다시 채점할 때 바로 반영된다.
- 시리즈 단위로 기준 U-Boot·TF-A 버전을 정하고 `data/upstream-tracking.yaml` 등록 여부를 사용자가 결정한다. 등록되면 ③⑥ 자동화가 이 시리즈에 적용된다.
- '같은 시리즈 글 사이 사실 충돌' 일곱 건은 Bootloader Internals `/fact-check-round`에서 한 번에 정한다. 단계 수·EL·SPL 빌드 횟수·U-Boot proper 시작 위치는 여러 글에 걸쳐 있다.
- ch02(병합 검토)는 BL 단계·SPL 절을 ch04·ch25 링크로 줄이는 부분 병합 뒤 보강, ch01은 허브 예외 적용을 종합 검토에서 다시 확인한다. ch06·ch07(보강)은 버전 표기와 열린 uncertainties 확인이 먼저다.
- 빈 '더 깊이' 줄·TikZ TODO·빈 단계 제목·로그 날짜 문제는 시리즈 나머지 27편에도 있는지 grep으로 수를 센 뒤 다음 루프(bootloader chapter11~) 채점에 반영한다.
