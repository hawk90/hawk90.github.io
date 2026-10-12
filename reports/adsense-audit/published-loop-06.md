# 공개 글 AdSense 평가 — 루프 06

> 대상: 공개 글 10편 (BSP Development `seriesOrder` 14~21, Buildroot Practical `seriesOrder` 1~2)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 여섯 번째 루프다. 대상은 `src/content/blog/embedded/bsp/`의 `chapter14-thermal-watchdog.md`~`chapter21-maintenance.md` 8편(BSP Development 마지막 8편)과 `src/content/blog/embedded/buildroot/`의 `chapter01-problem.md`·`chapter02-directory-structure.md` 2편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `bsp/chapter14-thermal-watchdog.md` | 12 | 11 | 7 | 10 | 7 | 3 | 1 | **51** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `bsp/chapter15-boot-time-optimization.md` | 14 | 13 | 8 | 11 | 6 | 4 | 1 | **57** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `bsp/chapter16-rootfs.md` | 11 | 12 | 6 | 7 | 7 | 7 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `bsp/chapter17-image-packaging.md` | 12 | 12 | 7 | 9 | 6 | 5 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `bsp/chapter18-ota-recovery.md` | 11 | 11 | 6 | 6 | 7 | 4 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `bsp/chapter19-stability-testing.md` | 14 | 12 | 8 | 10 | 6 | 4 | 1 | **55** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `bsp/chapter20-production.md` | 11 | 11 | 6 | 9 | 7 | 5 | 1 | **50** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `bsp/chapter21-maintenance.md` | 12 | 11 | 7 | 11 | 7 | 3 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `buildroot/chapter01-problem.md` | 14 | 13 | 7 | 10 | 7 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `buildroot/chapter02-directory-structure.md` | 10 | 11 | 6 | 9 | 7 | 7 | 1 | **51** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |

평균 52.7점(10편 합 527), 범위 46~60점이다. 판정은 우선 조치 6편, 병합 검토 4편이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 6편(bsp ch14·15·17·21, buildroot ch01·02)이고, buildroot ch02(Buildroot 매뉴얼 'Make tips' 직접 열람)를 빼면 모두 원문 내부 모순·산술 불일치(루브릭 3-1)로 판정했다. 점수 구간으로는 buildroot ch01만 보강(60~79)이고 나머지 9편이 병합 검토(40~59)다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft: false`, D 비교 글의 해당 행까지이고, 렌더링·광고 배치·외부 사이트 유사도는 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `bsp/chapter14-thermal-watchdog.md` | 52 | 51 | -1 | 없음 |
| `bsp/chapter15-boot-time-optimization.md` | 57 | 57 | 0 | 없음 |
| `bsp/chapter16-rootfs.md` | 53 | 52 | -1 | 없음 |
| `bsp/chapter17-image-packaging.md` | 52 | 52 | 0 | 없음 |
| `bsp/chapter18-ota-recovery.md` | 46 | 46 | 0 | 없음 |
| `bsp/chapter19-stability-testing.md` | 55 | 55 | 0 | 없음 |
| `bsp/chapter20-production.md` | 52 | 50 | -2 | 없음 |
| `bsp/chapter21-maintenance.md` | 53 | 53 | 0 | 없음 |
| `buildroot/chapter01-problem.md` | 60 | 60 | 0 | 없음 |
| `buildroot/chapter02-directory-structure.md` | 52 | 51 | -1 | 없음 |

1차 합 532에서 최종 527로 5점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 2건(판정은 둘 다 그대로).
  - bsp ch17: 341행 'GPT는 보통 1MB부터' vs 37~39·48행. 341행은 48·123행의 첫 partition 1MB 정렬이나 130행 i.MX 예를 요약한 말로도 읽혀 두 진술이 동시에 참일 수 없다고 단정할 수 없다. uncertainties로 내렸다. 129~130행 산술 겹침으로 오류 확인은 유지.
  - bsp ch21: 23행 'Greg KH가 5~6년간 보안 백포트' vs 32행 6.12 EOL 2026-12. 6.12 출시일이 글에 없어 기억에 기대야 성립한다. uncertainties로 내렸다. 36·40·31~32·311행 모순으로 오류 확인은 유지.
- 추가한 오류 확인: 4건, 3편.
  - bsp ch14: 72행 'critical | 강제 shutdown'(368행도 같음) vs 74행 '커널이 `emergency_restart()`를 호출합니다'. 판정이 미검증 → 오류 확인, 병합 검토 → 우선 조치로 바뀌었다.
  - bsp ch15: 143행 '부팅 실패 시에만 full U-Boot로 떨어집니다' vs 282행 'Falcon이 실패하면 보드가 벽돌이 됩니다'. 27~35행 '일반 BSP' 열 하한 합 2550ms·상한 합 11500ms vs 합계 3~10s. 평가자가 이미 오류 확인으로 둔 글에 근거를 더했다.
  - buildroot ch02: 192행 'make clean이 *target만* 지우고, output/host/(toolchain)는 남깁니다' vs Buildroot 매뉴얼 'Make tips'(make clean은 host·staging·target·images·toolchain 모두 삭제). 판정이 미검증 → 오류 확인, 병합 검토 → 우선 조치로 바뀌었다.
- 점수 변경: bsp ch14 B 12→11(critical 동작 모순으로 결론이 흐려짐), bsp ch16 A 12→11(코드 분량은 독창성 근거가 아님, 대응 표도 buildroot ch20과 같은 종류), bsp ch20 A 12→11(범위가 넓다는 것은 가점 근거가 아님)·B 12→11(371행 정리가 본문에 없는 FIT·dm-verity 서명을 꼽음), buildroot ch02 B 12→11(192행 정리 절차가 1차 자료와 반대). 나머지 6편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: D·F 비교 줄 번호를 직접 연 줄로 바꿨다(ch14의 modern-recipes part12-08 139~146행, ch16의 buildroot ch06 43~85행·ch20 59~74행, ch17의 bootloader ch17 70~88행, ch18의 bsp ch17 95~106·108행·bootloader ch17 142~162행·ch20 59·99·139~143행, ch19의 AER 패턴 175·176행, ch20의 bootloader ch30 117~143행 등).
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점 원인은 '마지막 챕터'라는 틀린 다음 편 안내(ch14), 옛 목차 라벨(ch15·ch19 'Ch 14: 디버깅 도구', ch21 회고 11개 장), 다른 시리즈 첫 글로 가는 주제 라벨(ch14·15·17·18·19·20)이다.

## 글별 근거

### `bsp/chapter14-thermal-watchdog.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1, AP-C-24). 72행 trip type 표는 `critical` 동작을 '강제 shutdown'이라 하고 368행 함정도 'critical 없이는 … shutdown이 안 됩니다'라고 하는데, 74행은 '이 값을 넘으면 커널이 `emergency_restart()`를 호출합니다'라고 한다. 같은 trip의 커널 동작을 끄기와 재시작으로 다르게 적어 두 진술이 동시에 참일 수 없다. 어느 쪽이 맞는지는 drivers/thermal/thermal_core.c로 정한다. git log(160a78a8 시리즈 작성, a0f21c45 ASCII→TikZ, 49f2a443·e85d7684 코드 블록 산문 정리, fa55144d 링크 기계 수정, ac24bb76 제목, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 310·316행 `fsl,ext-reset-output`(WDOG_B로 외부 reset, PMIC까지 끊기)과 374행 함정, 318~326행 SPL→U-Boot→systemd watchdog 인계, 373행 '부팅 30초인데 timeout 20초' 함정, 154~193행 외부 tmp103 sensor와 pwm-fan을 thermal zone에 묶는 DT 예다. trip type 표(67~72행), governor 표(120~126행), /dev/watchdog ioctl 예제(236~268행), systemd 설정(277~287행)은 커널 문서·man 페이지 수준이다. 87행 'Tj_max보다 5~10°C 낮게'는 출처 없는 경험칙, 128행 power_allocator 선택 기준은 없다. 6~12 구간 상단. |
| B | 11 | thermal DT(27~65행) → sysfs(91~114행) → governor(118~148행) → 외부 sensor·fan(150~194행) → watchdog(213~326행) → 시험(328~364행) → 실수·정리 흐름은 완성됐다. 그러나 핵심인 critical trip 동작을 72·368행과 74행이 다르게 설명한다. 19~21행 구조 절은 그림뿐이고, 134행 `sustainable-power` 외에 cooling device power model 언급이 없으며, 258~262행 무한 루프 때문에 264~266행 'V' 쓰기·close는 도달하지 않는다. AP-C-24상 B ≤ 13에서 모순으로 1점 더 감점. |
| C | 7 | sysfs·sensors·dmesg 명령과 예시 출력(92~113, 143~147, 201~209, 358~364행), 344행 관찰 기준이 있다. 출력에 커널 버전·보드 리비전이 없고 358행 `/proc/reset-reason`은 '보드별'이다. 80~85행 등급별 Tj·critical 값, 87행 마진은 출처·환경 없는 수치라 C ≤ 8. 실제 측정 결과는 없다. |
| D | 10 | 같은 시리즈: `chapter13-power-management.md`(DVFS 중심, thermal은 426·432행 링크뿐), `chapter15-boot-time-optimization.md`(겹침 없음), `chapter19-stability-testing.md`(stress-ng 21~33·203행 ↔ 이 글 330~344행 소폭). 다른 시리즈: `performance-engineering/part3-10-thermal.md` 17~26행 등급 표 ↔ 76~85행, 52~67행 sysfs ↔ 92~105행, 69~75행 ↔ 67~72행. `modern-recipes/part12-08-thermal.md` 64~76행 ↔ 92~105·143행, 139~146행 pwm-fan ↔ 164~170행. `bootloader/chapter17-ab-update.md` 346~358행 systemd watchdog ↔ 277~287행. `modern-recipes/part4-12-watchdog.md`는 STM32 IWDG라 겹치지 않는다. DT thermal-zones와 Linux watchdog 통합은 BSP 고유 역할이라 10~14 구간 하단. |
| E | 7 | 제목의 Trip Point(34~52, 67~74행), Cooling Device(54~62, 107~116, 164~190행), Hardware Reset(310·316, 348~364행)과 description(5행)을 모두 다룬다. 'Hardware Reset'은 316행 두 문장과 374행 한 줄뿐이라 부분 미이행. i.MX8M Mini DT 예(25행)는 범위 불일치로 보지 않았다. |
| F | 3 | 389행·17행 '시리즈의 마지막 챕터'는 틀렸다. 같은 디렉터리에 seriesOrder 15~21이 공개돼 있고 다음 편은 `chapter15-boot-time-optimization.md`다. 393행 ch12 '— sensor driver 통합'은 대상이 I2C EEPROM 사례이고 sensor 언급이 없다. 395행 Buildroot ch01 '— systemd 설정', 398행 Practical RTOS 00-preface '— watchdog 패턴 비교'도 대상 내용에 없다. 394행 ch13은 thermal 연동 본문이 없고, 397행 perf 00-preface만 맞다. 틀린 다음 편 안내·라벨로 F ≤ 5. 219행 `<!-- TODO: TikZ -->`와 217행을 되풀이하는 221~232행 text 블록도 남아 있다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 커널 버전, thermal DT binding·watchdog API 문서, i.MX8M Mini RM 판, systemd 버전이 모두 없다. 80~85행 AEC-Q100 표, 74행 `emergency_restart()`, 287행 '매 ~15초'에 출처가 없다. |

uncertainties:
- 80~85행 AEC-Q100 Grade 3 -40~125°C, Grade 2 -40~105°C는 번호가 작을수록 범위가 넓다는 기억(Grade 1 -40~125)과 어긋난다. 원문을 열지 않았다. Commercial 0~95·Industrial -40~105도 performance-engineering part3-10 21~22행(0~70, -40~85)과 다르다(다른 글과의 차이라 오류 확인에 넣지 않음).
- 277~285행 `[Service] WatchdogSec=`를 /etc/systemd/system.conf에 함께 적었다. WatchdogSec은 서비스 unit 설정으로 기억하나 man 페이지로 확인하지 않았다. 287행 '매 ~15초'도 미확인.
- 258~266행 무한 루프 뒤 'V' 쓰기는 도달하지 않고, 252·256행 ioctl 반환값을 검사하지 않는다.
- 320행 SPL 'timeout 120초'와 324행 U-Boot '60s timeout'이 같은 부팅 흐름인지 불분명.
- 369행 'no thermal-zones found', 362~363행 imx2-wdt 로그, 324행 U-Boot 로그 문자열은 upstream 소스로 확인하지 않았다.
- 157~160행 tmp103 노드에 라벨이 없는데 176행 `&tmp103`을 참조해 dtc가 실패할 수 있다. I2C 주소 0x70도 데이터시트로 확인하지 않았다.

병합 대상: 병합 대상 없음(점수 구간 병합 검토 기준 기록, 판정은 오류 확인으로 우선 조치). thermal sysfs·등급 표는 `performance-engineering/part3-10-thermal.md`, `modern-recipes/part12-08-thermal.md`와 겹치지만 DT thermal-zones 작성과 Linux watchdog 통합은 두 글에 없다. 다음 조치는 보강: 72·74·368행 critical 동작을 thermal_core.c로 정해 고치고, 17·389행 '마지막 챕터'와 393·395·398행 라벨을 고치고, 등급 표·systemd 설정 위치를 1차 자료로 대조해 고치거나 지우고(TBD), 겹치는 sysfs 설명은 다른 시리즈 글 링크로 줄인다.

### `bsp/chapter15-boot-time-optimization.md` — 57점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 안의 모순 세 가지. (1) 292행 정리 'U-Boot Falcon mode는 부트로더 단계 시간을 한 자릿수 ms로 끌어내립니다' vs 262행 'SSBL (U-Boot) | 700ms | 60ms (Falcon)'과 30행 최적화 후 'SPL → U-Boot 30~100ms'. 글 안에 한 자릿수 ms 수치가 없다. (2) 27~35행 '최적화 후' 열 상한 합 80+100+200+800+100+500 = 1780ms인데 35행 합계는 0.6~1.5s. '일반 BSP' 열도 하한 합 2550ms·상한 합 11500ms로 합계 3~10s와 맞지 않는다(STM32 표 260~265행은 합이 맞음). (3) 143행 '특수 키를 누르거나 부팅 실패 시에만 full U-Boot로 떨어집니다' vs 282행 'Falcon이 실패하면 보드가 벽돌이 됩니다. SPL이 fallback으로 U-Boot 전체를 로드할 수 있도록 환경을 짜둡니다'. git log(7824b986 stub, 160a78a8 집필, 400892d7·20c1b507·ac24bb76·fa55144d·e85d7684·be973200·0a9dd7bc 일괄 정리)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 직접 풀어 쓴 부분은 bootstage report 출력(58~68행, Mark·Elapsed 산술이 맞음), initcall_debug로 찾은 232ms pci_subsys_init을 PCIe 없는 보드의 제거 후보로 보는 판단(102~107행), ip_auto_config 700ms를 NFS root·DHCP와 연결한 해석(185~190행), 115200bps 80자 한 줄 6.9ms·100줄 700ms 산술(192행)이다. Falcon·Image 비압축·initramfs 제거·systemd 정리(141~252행)는 흔한 체크리스트 순서와 같고, 표 수치(27~35, 258~265행)는 출처가 없다. 13~19 구간 하단. |
| B | 13 | 측정(39~139행) → SPL/U-Boot(141~168행) → 커널(170~208행) → initramfs(210~229행) → userspace(231~252행) → 사례(254~274행) → 실수(276~286행)로 부트 체인 전체를 다룬다. 제목의 Parallel Init은 84행 한 문장, description(5행)의 deferred init은 본문에 없다. 96행 CONFIG_BOOT_TRACER, 178행 lzImage, 147행 CONFIG_SPL_FALCON_BOOT_MMC 불확실이 열려 있어 B ≤ 13. |
| C | 8 | CONFIG_PRINTK_TIME(44행), bootstage report(59행), systemd-analyze blame(72~82행), 측정 스크립트(113~132행), defconfig 제거 목록(160~166행), 양산 cmdline(194~206행)을 그대로 쓸 수 있다. 예시 출력의 보드·커널·U-Boot 버전이 없고, 27~35행·258~265행(256행 'ST가 공개한'만 있고 문서명 없음)은 출처·환경 없는 수치라 C ≤ 8. |
| D | 11 | Falcon 절(141~156행) ↔ `bootloader/chapter05-falcon-mode.md` 76~170행(더 깊음), `bootloader/chapter24-spl-deep.md` 248·336행(Falcon 부트 시간)·295~307행(bootstage report) ↔ 56~68행. systemd-analyze·initcall_debug(70~82, 93~105행) ↔ `bsp/chapter10-first-boot.md` 236~260행, `bsp/chapter11-bootlog-debugging.md` 120~129행. 27~35행 ↔ `bootloader/chapter01-boot-problem.md` 140~146행. `modern-recipes/part7-02-uboot-usage.md` 168행 autoboot delay 0. ROM부터 application까지 한 글에서 다루는 곳은 이 글뿐이고 인접 ch14·ch16과는 겹치지 않는다. |
| E | 6 | 제목(2행)의 Bootchart(84~91행)·initcall_debug(93~107, 181~188행)는 다루지만 Parallel Init은 84행 한 줄뿐이고 description의 deferred init은 없다. 빠진 키워드가 절반 미만이라 6~8 구간 하단. |
| F | 4 | 300행 다음 편은 `chapter16-rootfs.md`(seriesOrder 16)와 맞고 예고한 외부 트리·메타레이어도 그 글 5·41행에 있다. 관련 항목 304행 'Ch 14: 디버깅 도구'의 대상은 `chapter14-thermal-watchdog.md`, 306행 'Bootloader 시리즈 — Falcon Mode'의 대상은 `chapter01-boot-problem`, 307행 'Modern Embedded Recipes — Boot 최적화'의 대상은 00-preface다. 305행 Ch 17만 맞다. 4개 중 3개가 틀려 4. |
| G | 1 | 본문에 1차 출처 링크가 없다. 256행 'ST가 공개한 STM32MP157 0-to-login 최적화'는 문서명·링크가 없다. 커널·U-Boot·systemd 버전과 측정 보드가 없다. |

uncertainties:
- 96행 CONFIG_BOOT_TRACER가 현행 커널 Kconfig에 있는지 미확인.
- 178행 'make lzImage' 타깃이 arm Makefile에 있는지 미확인.
- 147행 CONFIG_SPL_FALCON_BOOT_MMC의 존재·이름을 U-Boot Kconfig로 확인하지 않았다.
- 152~153행 spl export 인자와 mmc write 섹터 0x500이 CONFIG_SYS_MMCSD_RAW_MODE_ARGS_SECTOR와 맞는지 적혀 있지 않다(bootloader ch05는 0x100, 다른 글과의 차이).
- 184행 'sort -k 11 -n -r'은 185~187행 출력 형식에서 11번째 필드가 시간 값이 아니라 의도대로 정렬되지 않을 수 있다(코드 결함 후보).
- 185행 initcall 출력에 '+0x0/0x60' 접미사가 없어 104행 형식과 다르다.
- 258~265행 STM32MP157 수치와 'ST가 공개한' 출처를 확인하지 않았다.
- PHY autoneg 시간이 168행 1~3초, 286행 1.5~3초, 278·291행 1초로 서로 다르다.
- 60행 'Timer summary ... (12 records)'인데 표시된 기록은 6줄이다.
- 244행 'BusyBox init만 바꿔도 1~2초', 219행 '100KB 이내', 242행 '5~30초 timeout'은 출처 없는 수치다.

병합 대상: 병합 대상 없음. Falcon 절은 `bootloader/chapter05-falcon-mode.md`와 겹치지만 부트 체인 전 구간 시간 최적화는 이 글뿐이라 독립 검색 의도가 있다. 다음 조치는 보강: 292·30·262행, 35행 합계, 143·282행 모순을 U-Boot Falcon 문서·ST 위키로 정정하고, Falcon 절은 ch05 링크로 줄이고, Parallel Init·deferred init을 본문에서 다루거나 제목·description에서 빼고, 관련 항목 3개를 바로잡는다.

### `bsp/chapter16-rootfs.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(7824b986 stub, 400892d7 linter, 160a78a8 시리즈 21편 작성, ac24bb76 제목, fa55144d 링크, be973200 topic, 0a9dd7bc slug)에 Buildroot 매뉴얼·Yocto 문서와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 원문 안에서 두 기술 진술이 동시에 참일 수 없는 모순도 찾지 못했다(트리·코드 불일치, 377행 소제목·본문 불일치는 uncertainties).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 19행 'BSP가 어떻게 빌드 시스템에 자리잡는가'라는 역할 구분, 330~338행 Buildroot·Yocto 대응 표, 369~377행 실수 목록이다. 대응 표도 buildroot ch20 59~74행 매핑 표와 같은 종류다. BR2_EXTERNAL 구성(45~90행), generic-package(158~191행), layer.conf·machine.conf(231~267행)는 매뉴얼 수준이고, 23~31행 비교 표와 39행 '자동차 OEM은 거의 Yocto'는 출처 없는 일반론이다. 코드 분량은 독창성 근거가 아니라 part1-04 앵커(10)보다 1점만 높다. |
| B | 12 | 선택 기준(21~39행) → BR2_EXTERNAL(41~146행) → 커스텀 패키지(148~193행) → Yocto 레이어(195~288행) → 이미지 레시피(290~324행) → 대응 표(326~338행) → post-image(340~365행) → 실수 → 정리 흐름은 완성됐다. U-Boot 레시피는 288행 한 문장, 빌드 결과 확인 절차가 없다. 46~69행 트리에 119행 overlay/·352행 uboot-env.txt가 없고, 153~155행 트리에 170행 src/·181행 .service가 없다. 17행의 busybox·libc·init 선택은 다루지 않는다. B ≤ 13. |
| C | 6 | make·bitbake 명령(94~98, 318~322행)과 설정 발췌가 있으나 실행 환경·Buildroot 버전·예상 출력이 없다. 324행 산출물 목록이 유일한 결과다. 25~28행 학습 기간·Yocto 첫 빌드 3~8시간·패키지 수는 출처·환경 없는 수치라 C ≤ 8. 278행 SRCREV 'abcdef1234...' 자리표시와 트리·코드 불일치로 그대로 재현되지 않는다. |
| D | 7 | (1) 72~90행 external.desc·Config.in ↔ `buildroot/chapter06-br2-external.md` 43~85행(이름만 다름). (2) 119~146행 overlay·hook ↔ `buildroot/chapter07-board-customize.md` 15~69행. (3) 21~39행 선택 표 ↔ `buildroot/chapter01-problem.md` 83~96행. (4) 326~338행 대응 표·244~314행 machine.conf·이미지 레시피 ↔ `buildroot/chapter20-yocto-migration.md` 59~74·212~252행. (5) 355~362행 genimage·bmaptool ↔ `bsp/chapter17-image-packaging.md` 205~229행. BSP 시리즈 안 역할(ch15 부트 시간, ch17 패키징)은 구별되지만 다른 시리즈와 반복이 커서 5~9 구간. |
| E | 7 | 제목 'Buildroot·Yocto와 보드별 패키지 묶기'와 description의 '외부 트리, 메타레이어'는 41~314행이 이행한다. 'RootFS 통합'에 비해 본문 상당 부분이 커널·U-Boot·machine 정의(102~122, 244~288행)이고 rootfs 구성 요소 선택은 없다. |
| F | 7 | 391행 다음 편은 seriesOrder 17 `chapter17-image-packaging.md`로 가고 예고한 GPT·A/B·writer 도구가 ch17 32·69·305행 H2와 맞다. 365행 'genimage.cfg는 다음 글에서'도 ch17 138행과 맞다. 395~398행 관련 항목 4개(ch15, ch17, buildroot ch01, modern-recipes 00-preface) 라벨이 대상과 맞다. 19행이 Buildroot 시리즈와 역할을 나눠 전제를 알려 준다. 398행은 내용 연결이 약하고 audit:reading이 없어 7. |
| G | 2 | 코드 안에 커널 v6.6.30(109·275행), Yocto kirkstone·scarthgap(239행), U-Boot 2024.04(209행) 표기가 있으나 Buildroot 버전이 없고 1차 출처 링크가 없다. 25~31·39행에도 출처가 없다. |

uncertainties:
- 26행 Yocto 첫 빌드 '3~8시간'이 buildroot ch01 89행 '1~3시간'·204행 '110분', ch20 267행 '110분'과 다르다(다른 글과의 차이).
- 28행 패키지 수 '2,500+'·'13,000+'는 패키지 목록·Layer Index로 확인하지 않았다.
- 162행 `select BR2_PACKAGE_SYSTEMD`가 init 시스템 선택(BR2_INIT_SYSTEMD)과 맞는지 미확인.
- 185~188행 multi-user.target.wants 링크를 직접 만드는 방식이 현재 Buildroot 권장(preset)과 맞는지 미확인.
- 288행 u-boot-fw-utils를 'host에서 build'와 303행 IMAGE_INSTALL에 넣는 것, EXTRA_OECONF 적용 여부 미확인.
- 375행 'ld.so.cache를 갱신하지 않으면 dynamic linker가 동작하지 않습니다'는 glibc 기본 경로 탐색과 맞지 않을 수 있다.
- 377행 소제목 'INHERIT 순서'와 본문(IMAGE_INSTALL의 = 대 +=)이 다르다.
- 46~69·153~155행 트리와 본문 경로 불일치(B 감점으로만 처리).
- 373행 'distro의 defconfig'는 커널 아키텍처 defconfig(110행 multi_v7)를 가리키는 듯해 용어가 부정확할 수 있다.

병합 대상: 후보는 `src/content/blog/embedded/buildroot/chapter06-br2-external.md`(BR2_EXTERNAL), `src/content/blog/embedded/buildroot/chapter07-board-customize.md`(overlay·post-image), `src/content/blog/embedded/buildroot/chapter20-yocto-migration.md`(대응 표·machine.conf·이미지 레시피). 'BSP를 빌드 시스템에 넣는 법'은 BSP 시리즈 안에서 독립 검색 의도가 있어 통째 병합보다 다음 조치는 보강이다. 사유: 겹치는 일반 설명은 buildroot ch06·ch07·ch20·bsp ch17 링크로 줄이고, BR2_GLOBAL_PATCH_DIR 패치 관리, 커널·U-Boot 레시피와 PREFERRED_PROVIDER, 한 BSP를 두 빌드 시스템에 함께 유지하는 방법을 1차 출처와 함께 키워야 독립 가치가 생긴다.

### `bsp/chapter17-image-packaging.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순. 129행 '0x008000 (32KB): flash.bin (SPL + ATF + U-Boot, ~2MB)'와 130행 '0x100000 (1MB): GPT primary header'. 0x8000 + 약 2MB = 약 0x208000이라 flash.bin이 1MB의 GPT header를 덮는다. 같은 절 112행('GPT가 이 영역을 침범하면 부팅이 안 됩니다')·123행이 겹침을 피하라며 내놓은 예라 두 줄이 동시에 참일 수 없다. git log(160a78a8 집필, 400892d7·be973200·0a9dd7bc 일괄 정리, ac24bb76 제목, fa55144d 링크, e4f6db70 'Qualify BSP storage and DDR guidance')에 1차 자료 대조 커밋이 없다. e4f6db70은 출처 없는 완곡화라 검증으로 치지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 몫은 SoC별 부트 영역 오프셋 표(114~121행), i.MX 8M layout 예(127~134행), genimage `in-partition-table = "no"` 설명(204행), sparse image(232~246행), 양산 flashing 도구 표(307~315행)다. Partition table 비교(23~28행), GPT LBA(36~44행), dd/bmaptool(219~230행), MTD/UBI(250~303행)는 흔한 내용이다. 30·136·355·360행은 구체 기준을 대신한 완곡 표현이다. 6~12 구간 상단. |
| B | 12 | partition table(21행) → GPT(32행) → A/B(69행) → SoC 부트 헤더(110행) → genimage(138행) → sparse(232행) → MTD(248행) → 양산 도구(305행) → 실수 → 정리로 흐름은 끝까지 간다. 86~92행의 `BOOT_SLOT`·`TRY_COUNT`·`BOOT_OK`가 97~105행 env의 `boot_slot`·`bootcount`·`bootlimit`과 대응하지 않고, 88행 'BOOT_OK=1'과 108행 'bootcount=0로 reset'도 다른 메커니즘이다. description의 eMMC·UFS 굽기 절차가 없다. B ≤ 13. |
| C | 7 | `sgdisk -p` 출력(55~66행)은 산술이 맞고(2048~67583=32MiB, free 34~2047, last usable 30543838, p4 ≈12.5GiB), DT 파티션(270~285행) 오프셋도 이어진다. genimage(209~217행), bmaptool(228~229행), mkfs.ubifs/ubinize(294~295행), uuu 스크립트(320~334행)가 있다. 보드·도구 버전·실행 결과가 없고 246·337행은 출처 없는 수치라 C ≤ 8. 129~130행 layout은 그대로 따르면 겹친다. |
| D | 9 | `bsp/chapter16-rootfs.md` 340~366행은 genimage를 이 글로 넘겨 역할이 분명하다. `bsp/chapter18-ota-recovery.md` 33~48행 bootcount·altbootcmd env는 이 글 96~108행과 거의 같다. `bootloader/chapter28-flash-layout.md` 122~153·247~276·177~210행 ↔ 73~82·163~201·291~296행, `bootloader/chapter17-ab-update.md` 70~88행 ↔ 97~108행, `buildroot/chapter10-real-board.md` 283~365·445~470행 ↔ 219~230행. SoC 부트 영역 표·sparse·양산 도구 표가 이 글만의 몫이라 5~9 구간 상단. |
| E | 6 | Flash Layout·Partition·GPT는 21~136행이 다룬다. description(5행)의 'SD/eMMC/UFS 굽기 워크플로'에서 UFS는 본문에 없고 eMMC는 17행 boot1 한 줄, SD 굽기(219~230행)만 절차가 있다. |
| F | 5 | 366행 다음 편은 seriesOrder 18 `chapter18-ota-recovery.md`와 맞고 370·371행도 맞다. 372행 'Bootloader 시리즈 — 환경 변수 — U-Boot env partition'은 `bootloader/chapter01-boot-problem`으로 가는데 환경 변수 글은 `bootloader/chapter13-env-bootcmd.md`다. 373행 'Buildroot Practical — 이미지 조립'은 `buildroot/chapter01-problem`으로 가는데 이미지 조립은 `buildroot/chapter10-real-board.md` 283행 이후다. F ≤ 5. |
| G | 1 | 1차 출처 링크가 없다. GPT(UEFI 사양), genimage 문서, U-Boot bootcount 문서, vendor RM이 없고 버전은 321행 `uuu_version 1.4.0`뿐이다. |

uncertainties:
- 341행 'GPT는 보통 1MB부터'는 38행 'LBA 1: GPT Header'와 다르게 읽히지만 48·123행 1MB 정렬이나 130행 i.MX 예의 요약으로도 읽혀 독립 오류로 올리지 않았다.
- 253행 mtdparts(512K u-boot, 128K env, 64K dtb, 4M kernel)와 258~288행 DT(dtb 파티션 없음, kernel 0xa0000)의 배치가 다르다.
- 73~82행 A/B layout과 163~201행 genimage cfg의 파티션 번호가 다르고 103~104행 `mmc 0:2`/`0:4`는 앞 layout에만 맞는다.
- 108행 'bootcount와 bootlimit은 U-Boot가 자동으로 다루는 변수'의 설정 조건(CONFIG_BOOTCOUNT_LIMIT)을 확인하지 않았다.
- 86~92행 변수와 97~105행 env 불일치(산문·코드 불일치 후보).
- 116~120행 i.MX 6/7 1024 byte, i.MX 8M 32KB, RK3399 sector 64, Tegra BCT sector 0을 vendor RM으로 확인하지 않았다.
- 324행 uuu `-offset 0x57c00`, 328행 `FB: flash gpt sdcard.gpt` 미확인.
- 26행 GPT 9.4ZB, 25행 MBR 2TB는 1차 자료로 확인하지 않았다.
- 246행 '16GB→1GB sparse 흔함', 337행 '보드 8대 동시 flash 표준'은 출처 없는 수치다.
- 48행 '16KB 예약'과 '34 LBA = 17KB' 표기 혼선(점수 외).

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 병합 대상 후보는 `src/content/blog/embedded/bootloader/chapter28-flash-layout.md`(A/B slot·genimage·UBI 겹침)이고, A/B env 블록(96~108행)은 `src/content/blog/embedded/bsp/chapter18-ota-recovery.md` 33~48행과 같아 ch18로 넘긴다. SoC 부트 영역 표·sparse·양산 도구는 이 글에만 있어 다음 조치는 보강(차별화)이다. 129~130행 layout을 NXP i.MX 8M RM 부트 절·imx-mkimage 문서로 고치고, 372·373행 링크를 `chapter13-env-bootcmd`·`chapter10-real-board`로 바꾸고, description의 eMMC/UFS 약속을 본문에 맞춘다.

### `bsp/chapter18-ota-recovery.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug, be973200 topic, fa55144d 링크, ac24bb76 제목, 그 이전 작성·stub)에 RAUC·SWUpdate·U-Boot 문서나 upstream 소스와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았다. 284~286행 -days 365 발급과 302행 '1년 발급이 문제'는 예시와 권고의 어긋남이지 사실끼리의 모순이 아니고, 25행 recovery 100MB와 336행 32~128MB는 양립한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 21~31행 OTA 방식 비교 표, 359~364행 SoC별 USB recovery 표(uuu·DFU·MaskROM·FEL), 302·376행 서명 인증서 만료 함정, 374·378행 agent 자기 갱신·downgrade 함정이 이 글의 관점이다. 나머지 A/B·bootcount(33~94행), RAUC(96~190행), SWUpdate(192~242행), Mender·ostree(244~257행)는 도구 소개다. 257행 'RAUC vs Mender' 선택 기준은 근거가 없고 25·310행 수치는 출처가 없다. |
| B | 11 | description(5행)의 약속을 모두 지나가지만 각 절이 얕다. 59행 `check_critical_services_running()`은 정의가 없고, 47행 `switch_slot`은 bootcount를 되돌리지 않으며, 352행 `load mmc 0:N ...`은 자리표시다. 284~286행은 `-days 365`로 발급하는데 302행은 1년 발급을 문제로 든다. 190행 'RAUC가 자동으로 good 표시'와 52~68행 `fw_setenv bootcount 0` 직접 리셋이 어떻게 맞물리는지 설명이 없다. 355행 H2의 fastboot는 본문에 없다. B ≤ 13. |
| C | 6 | U-Boot env(37~47행), systemd unit(70~84행), fw_env.config(88~92행), RAUC 설정·명령(100~154행), 출력 예(158~188행), SWUpdate(196~239행), openssl 키 계층(274~290행)이 있다. 도구 버전·보드·파티션 번호가 없고 출력이 실측인지 밝히지 않았다. 310·336·388행 수치는 출처가 없어 C ≤ 8. 롤백 합격·실패 시험이 없고 59·352행은 그대로 돌릴 수 없다. |
| D | 6 | `bsp/chapter17-image-packaging.md` 95~106·108행 env·설명 ↔ 이 글 37~47·35행. `bootloader/chapter17-ab-update.md` 77~110·142~162행 ↔ 33~84행. `bootloader/chapter20-rauc-swupdate.md` 59·99·139~143·148~229행 ↔ 96~242행. `buildroot/chapter16-ota.md` 39~58·60~126·231~242행 ↔ 250~257·100~154·33~94행. `embedded-security/chapter06-ota-update.md` 176~185행 ↔ 306~315행. 인접 `bsp/chapter19-stability-testing.md`와는 겹치지 않는다. 고유 부분은 recovery 파티션(328~353행)과 USB recovery 표(355~366행) 정도라 5~9 구간. |
| E | 7 | 제목의 A/B 슬롯·롤백·BootCount는 33~94행, description의 RAUC/SWUpdate·recovery 파티션·USB recovery는 96~242·328~366행이 다룬다. '통합'은 설정 예시 수준이고 355행 fastboot는 다루지 않으며 384~390행 정리가 일반론이다. |
| F | 4 | 394행 다음 편 'Ch 19: Stability testing'은 seriesOrder 19와 맞지만 안내문의 'EMC 영향'은 ch19 본문에 없다. 398행 Ch17, 399행 Ch20은 맞다. 400행 'Bootloader 시리즈 — bootcount'는 `bootloader/chapter01-boot-problem.md`로 가고 그 글에 bootcount가 0건이다. 401행은 시리즈 링크라 틀린 라벨로 보지 않았으나 OTA 서명은 `chapter06-ota-update`가 맞는 대상이다. F ≤ 5에 안내문 과장이 더해져 4. |
| G | 1 | RAUC·SWUpdate·U-Boot 문서·소스 링크와 버전이 없다. 98행 Pengutronix, 194행 SBabic, 248행 AGL·Fedora Silverblue 채택, 317행 Fedora zchunk 채택에 출처가 없다. |

uncertainties:
- 47행 switch_slot이 bootcount를 되돌리지 않아 bootlimit을 넘은 채 리셋되면 슬롯이 계속 바뀔 수 있다(bootloader ch17 102행은 switch_slot 안에서 0 설정). CONFIG_BOOTCOUNT_LIMIT 동작 미확인.
- 98행 'GPG/x509 서명을 강제'의 RAUC 서명 형식(CMS/X.509) 미확인.
- 190행 '자동으로 good 표시' vs bootloader ch20 139~143행 `rauc status mark-good` 필요. RAUC 문서로 확인 필요.
- 158~188행 `rauc install`·`rauc status` 출력 형식 미확인.
- 374행 'RAUC 1.0이 RAUC 2.0 bundle을 install' 버전 체계 미확인.
- 363행 RK MaskROM 진입을 'RECOVERY button'으로 적었다(RECOVERY 키는 Loader 모드라는 기억, 미확인).
- 351행 `if gpio input recovery_btn` 문법·반환값 미확인.
- 279~281행 intermediate CA를 CA 확장 없이 서명한다. RAUC 검증 통과 여부 미확인.
- 248행 ostree 채택, 317행 zchunk 채택, 319행 RAUC casync 지원 출처 미확인.
- 284~286행 -days 365와 302행 권고의 의도(단기 signing cert + 장기 CA인지) 불명확.
- 25·310·336·388행 수치는 출처·환경 없음.
- 355행 H2 fastboot 본문 누락.

병합 대상: 후보는 `src/content/blog/embedded/bootloader/chapter17-ab-update.md`(A/B·bootcount, 이 글 33~94행)와 `src/content/blog/embedded/bootloader/chapter20-rauc-swupdate.md`(RAUC·SWUpdate, 96~257행). 37~47행 env는 `bsp/chapter17-image-packaging.md` 95~108행과도 같다. 다음 조치는 보강: recovery 파티션(328~353행)·SoC ROM USB recovery(355~366행)·필드 복구 관점은 다른 글에 없어, A/B·RAUC·SWUpdate 설명은 bootloader ch17·ch20 링크로 줄이고 'BSP가 현장 복구 경로를 어떻게 준비·시험하나'에 집중한다. 400행 링크를 bootloader ch17·ch20으로 고친다.

### `bsp/chapter19-stability-testing.md` — 55점, 병합 검토

confidence: 중간

factcheck: 미검증. adb7589e(#56)와 f5ac9548(#57)은 dmesg watcher의 AER 패턴(175·176행)과 336행 grep -i 조언만 torvalds/linux drivers/pci/pcie/aer.c·aerdrv_errprint.c(v4.9~v6.6, mainline)와 대조했다. de653395(#51)는 365행 링크 대상 변경이다. 나머지 구체 주장(23행 stressor 수, 152행 AEC-Q104 1000시간, 207~214행 thermal cycle, 68행 stressapptest 옵션, 254~267행 kdump, 102~103행 fio 출력)은 대조 기록이 없어 글 전체로는 미검증이다. 214행 250×4h=1000h≈6주, 102행 IOPS 2856×4KiB≈11.2MiB/s, 6705MiB/600s≈11.2MiB/s 산술은 서로 맞는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 시간·누적·환경 세 축 구분(17·346행), 커널 버전별 AER 출력을 반영한 dmesg watcher(168~182행)와 대소문자 함정(336행), thermal cycle 한 주기 구성(207~214행), smart PDU power cycle 스크립트(232~246행), smoke→stress-1h→soak-72h CI 분리(296~328행), memtester mlock 함정(340행)이 고유하다. 21~126행 도구 절은 사용법 소개 수준이고 106·226·328행은 일반론, 152·350행은 근거 없는 단정이다. 13~19 구간 하단. |
| B | 12 | stress 도구(21~148행) → soak(150~201행) → thermal cycling(203~226행) → power cycle(228~246행) → kdump(248~290행) → CI(292~328행) → 실수 → 정리 흐름은 완성됐다. description(5행)의 'EMC 영향'은 본문에 없고, 154~161행의 voltage monitor·regression detector는 예시가 없으며, 합격 기준은 246행 '1000회 무fail'뿐이다. |
| C | 8 | 실행 가능한 명령·스크립트(27~35, 132~145, 165~187, 192~198, 232~243, 296~326행)와 예시 출력(47~63, 100~103행)이 있다. 102~103행 fio 출력과 106행 '11MB/s→5MB/s'는 환경이 없고 103행 max=12345·stdev=1234.56은 자리표시값처럼 보인다. 152·207~214·226행 수치도 출처가 없어 C ≤ 8. 실제 soak·thermal 결과는 없다. |
| D | 10 | 같은 시리즈: `chapter18-ota-recovery.md`(겹침 없음), `chapter20-production.md` 103행 GitLab CI(형식만 겹침, 목적은 빌드·서명), `chapter14-thermal-watchdog.md` 334행 ↔ 27·192~198행, `chapter05-ddr-params.md` 248~262행 ↔ 30·47·192~198행. 다른 시리즈: `bootloader/chapter26-ddr-training.md` 277~301행 ↔ 46~66행, `tools/debugging/kernel/chapter06-crash-drgn.md` 19~41행 ↔ 248~290행. 도구들을 양산 안정성 검증 체계로 묶는 역할은 구별된다. |
| E | 6 | 제목의 Stress·Soak·Power Cycle은 21~148, 150~201, 228~246행에서 다룬다. description의 'EMC 영향'은 5행에만 있다(grep). 키워드 하나 미이행. |
| F | 4 | 357행 다음 편은 seriesOrder 20 `chapter20-production.md`이고 예고 내용이 그 글 H2(21·103·189·224·270행)와 맞다. 361·362·365행도 맞다. 363행 'Ch 14: 디버깅 도구 — kdump와 crash 분석'은 `chapter14-thermal-watchdog.md`(kdump 언급 없음)로, 364행 'Modern Embedded Recipes — Stress recipes'는 `modern-recipes/00-preface.md`로 간다. 틀린 라벨 둘로 F ≤ 5에서 4. 106행 '본다.'로 Tone A에 반말이 섞였다. |
| G | 1 | 1차 출처 링크가 없다. stress-ng·fio·iperf3·커널 버전이 없고 48행 memtester 4.5.1은 출력 예시 문자열뿐이다. 152행 AEC-Q104는 판·조항이 없다. AER upstream 대조는 커밋 본문에만 있어 반영하지 않았다. |

uncertainties:
- 152행 'AEC-Q104는 1000시간 soak를 요구'가 어떤 시험인지 1차 자료로 확인하지 않았다.
- 23행 'stress-ng 70여 stressor'는 최근 버전 수와 다를 수 있다(미확인).
- 68행 stressapptest 'cache 비활성화, large page' 옵션 미확인.
- 207~214행 '표준 cycle (산업용)' 프로파일의 출처가 없다.
- 102~103행 fio: iodepth=16에서 clat avg 2456.78us면 약 6500 IOPS가 기대되는데 2856이고, group_reporting과 두 job이면 'jobs=1' 단독 출력이 나오지 않을 수 있다. max=12345·stdev=1234.56은 자리표시값으로 보인다.
- 93행 raw 파티션 randwrite가 데이터를 파괴한다는 경고가 없다.
- 106행 throughput 하락을 wear로 보는 근거가 없다(GC·SLC cache 등과 구분 없음).
- 279행 따옴표 안 `vmcore-*.gz`는 glob이 확장되지 않아 업로드가 실패할 수 있다.
- 184행 `dmesg -w`는 재시작 시 기존 링버퍼를 다시 읽어 중복 alert가 날 수 있다.
- 350행 'thermal cycling은 … 유일한 방법'은 66·40행과 결이 어긋난다(A 감점 사유로만 둠).

병합 대상: 병합 대상 없음. 도구별 설명은 `bsp/chapter05-ddr-params.md`, `bsp/chapter14-thermal-watchdog.md`, `bootloader/chapter26-ddr-training.md`, `tools/debugging/kernel/chapter06-crash-drgn.md`와 겹치지만 '양산 안정성 검증 체계'라는 독립 검색 의도가 있다. 다음 조치는 보강: description의 EMC 약속을 이행하거나 지우고, 363·364행 라벨을 고치고, 152·207~214행 기준에 1차 출처(AEC 문서 판, JEDEC JESD22-A104 등)를 붙이거나 지우고, 102~103행 fio 출력을 보드·eMMC·커널을 밝힌 실측값으로 바꾸고, 도구·커널 버전을 적는다.

### `bsp/chapter20-production.md` — 50점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug, be973200 topic, fa55144d 링크, ac24bb76 제목, 그 이전 작성·linter)에 SOURCE_DATE_EPOCH 범위, build-id 기본값, CST·cert_create·yubihsm-shell·lava-tool 사용법, legal-info 타깃을 1차 자료와 대조한 커밋이 없다. 평가 중에도 열지 않았다. 동시에 참일 수 없는 두 기술 진술은 찾지 못했다(360행 권고 충돌, 69·75행 none 설명은 uncertainties).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 재현성 저해 요인 표(32~41행), 키 3등급 표(193~197행), 양산 station 7단계(313~319행), 서명 layer 정리(371행)로 양산 전환을 한 글에 묶었다. 각 항목은 reproducible-builds·Buildroot 매뉴얼 수준이고, 고유 판단은 75행(build-id를 켠 채 결정적으로 만들어 crash dump와 대조) 정도다. 266·321행은 근거 없는 일반론이다. 범위가 넓다는 것은 독창성 근거가 아니다. |
| B | 11 | 재현성(21~101행) → CI(103~187행) → 키·HSM(189~222행) → secure boot(224~250행) → build farm(252~268행) → flashing(270~321행) → SBOM(323~350행) → 실수·정리 흐름은 끝까지 간다. 절마다 명령 한 조각과 한두 문장이고, 133행 두 빌드 비교 절차가 없으며, 274~309행 스크립트는 `generate_mac`·`log_failure`·`log_success`가 정의되지 않고 `provision`은 `pass`다. 371행 정리는 본문에 없는 FIT 서명·dm-verity·OTA bundle 서명을 꼽는다. B ≤ 13. |
| C | 6 | Dockerfile(81~99행), .gitlab-ci.yml(107~183행), HSM·OpenSSL 명령(205~220행), legal-info(327~341행)가 있다. 실행 환경·예상 출력·결과가 없고 hash 비교 절차도 없다. 168행 `hsm-sign`은 자리표시, 274~309행은 그대로 돌지 않는다. 83~88행은 apt 패키지 버전을 고정하지 않아 40·358행 '컴파일러 버전 pin'을 받치지 못한다. 263·266행 수치는 출처가 없어 C ≤ 8. |
| D | 9 | 인접 `bsp/chapter19-stability-testing.md`는 292~329행 회귀 감시만 이 글 140~152행과 이어지고, `bsp/chapter21-maintenance.md`는 겹치지 않는다. `bootloader/chapter30-bootloader-ci.md` 117~143·284~307행 ↔ 185~187·191~199·222행. `buildroot/chapter18-security-cve.md` 81~114·116~140·145~190행 ↔ 323~341·21~59행. `buildroot/chapter19-cicd.md` 60~100행 ↔ 77~138행. `embedded-security/chapter10-sdlc.md` 223·259행. 내용 대부분이 다른 시리즈에 더 깊게 있어 5~9 구간 상단. |
| E | 7 | 제목의 CI/CD(103~187행)·재현 가능 빌드(21~101행)·서명(224~250행)과 description의 키 관리(189~222행)를 다룬다. build farm·flashing·SBOM(252~350행)까지 넓어 초점이 흩어지고 서명 절은 명령 나열 수준이다. |
| F | 5 | 379행 다음 편은 seriesOrder 21 `chapter21-maintenance.md`와 맞고 272·383·384행도 맞다. 385행 'Embedded Security — Secure boot'는 `chapter01-threat-model.md`로 가고 `chapter02-secure-boot.md`가 따로 있다. 386행 'Buildroot Practical — SBOM'은 `chapter01-problem.md`로 가는데 SBOM은 `chapter18-security-cve.md` 116행이 다룬다. F ≤ 5. |
| G | 1 | 1차 출처 링크가 없다. 버전은 79행 Ubuntu·glibc와 83행 base image(digest `abc123...` 자리표시)뿐이다. 59행 'Buildroot, Yocto, Debian 모두 표준으로 채택'에 출처가 없다. |

uncertainties:
- 232~233행 NXP CST 호출과 `objcopy --add-section` 방식이 CST 문서와 맞는지 미확인.
- 207~211행 yubihsm-shell 옵션 조합 미확인.
- 144·151행 `lava-tool submit $LAVA_URL job.yaml` 형태 미확인.
- 187행 LAVA 풀이('Linaro Automation and Validation Architecture') vs bootloader ch30 119행('Linaro Automated Validation Architecture'). 다른 글과의 차이.
- 63행 'build-id 기본값(uuid)'을 binutils 문서로 확인하지 않았다.
- 69~72행 `--build-id=none`을 '명시적 0 값'으로 설명하면서 75행은 끄는 옵션처럼 다룬다.
- 52행 SOURCE_DATE_EPOCH가 __DATE__·gzip·tar·ar header를 '모두' 고정한다는 범위 미확인.
- 340행 `make legal-info-source-archive`, 333행 `bitbake -c create_spdx` 사용법 미확인.
- 360행 'HSM credential을 CI secret으로'를 실수로 꼽으면서 masked variable을 권하고, 196행 표는 QA 키를 CI variables에 두라고 한다.
- 83~88행 apt 미고정.
- 168행 `hsm-sign` 자리표시 여부를 본문이 밝히지 않는다.
- 263·266행 수치는 출처·환경 없음.

병합 대상: 병합 대상 없음. 겹치는 부분은 `bootloader/chapter30-bootloader-ci.md`(LAVA·키 분리), `buildroot/chapter18-security-cve.md`(legal-info·SBOM·reproducible), `buildroot/chapter19-cicd.md`(container GitLab CI)로 나뉘고, BSP 시리즈 '양산 전환' 장은 독립 검색 의도가 있다. 다음 조치는 보강: 겹치는 설명은 세 글 링크로 줄이고, 같은 commit 두 번 빌드 hash 비교 절차, 동작하는 flashing 스크립트, 371행 FIT·dm-verity 서명의 실제 설명 또는 삭제, 1차 출처·도구 버전을 채운다. 385·386행 링크를 `embedded-security/chapter02-secure-boot`, `buildroot/chapter18-security-cve`로 고친다.

### `bsp/chapter21-maintenance.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순. 36행 선택 기준 '양산 시점에 EOL이 2~3년 이상 남았을 것'과 31~32행 표 '6.6 | 2026-12', '6.12 | 2026-12', 40행 '2026년 5월 기준 새 product는 6.6 또는 6.12를 선택하는 것이 권장'(311행 정리도 같음)은 함께 성립하지 않는다. 표대로라면 남은 기간은 약 7개월이다. 표의 '(연장될 가능성)'은 기준을 채우는 진술이 아니다. git log(0a9dd7bc, 83899a96 중복 절 제거, be973200, e85d7684, fa55144d, ac24bb76, 49f2a443, 160a78a8 최초 작성, 400892d7, 7824b986)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | out-of-tree 패치 비용 논증(42~61행), LTS upgrade 7단계(170~178행), review 유형별 대응 표(145~150행), CVE 우선순위 표(246~251행)가 이 글만의 내용이다. 업스트림 기여 절차(65~97행)와 commit message·v2 예(101~119, 152~164행)는 submitting-patches.rst를 옮긴 수준이다. 180·182행은 무엇이 바뀌는지 밝히지 않는 일반론이다. |
| B | 11 | 제목의 세 주제(업스트림 기여 63~166행, 버전업 168~207행, LTS 21~40행)를 다룬다. 핵심 결론인 LTS 선택(40·311행)이 자기 기준(36행)·표(31~32행)와 모순되고, 170~182행 upgrade 절은 5.10→6.6에서 실제로 깨지는 예가 없다. B ≤ 13. |
| C | 7 | format-patch·checkpatch·get_maintainer 출력 예(76~97행), bisect run(190~205행), Yocto cve-check(238~242행)를 쓸 수 있다. 커널 버전·보드·결과가 없고 59·300행 수치는 출처가 없어 C ≤ 8. 233행 `cve-check --buildroot`는 가상 명령이다. |
| D | 11 | `chapter20-production.md`는 350행 CVE 한 줄뿐이고, 마지막 편이라 다음 글은 없다. `chapter16-rootfs.md` 369행은 이 글 298행과 같은 논지 한 문장이다. `buildroot/chapter18-security-cve.md` 261~284행 ↔ 223~251행(이 글은 Yocto cve-check·우선순위 표를 더함), `bootloader/chapter30-bootloader-ci.md` 219~221행 ↔ 186~205행, `tools/emulation/qemu-internals/chapter12-contributing.md` 24~28·137~159행은 같은 절차지만 draft다. BSP 장기 유지 역할은 구별된다. |
| E | 7 | 제목·description(2·5행)의 세 주제를 다룬다. 253~322행(약 70행)은 제목이 약속하지 않은 시리즈 회고이고 LTS 결론(40행)이 기준(36행)과 어긋난다. |
| F | 3 | 326~329·334~335행 링크 대상은 존재하고 라벨과 맞으며, 294행 앵커 안내도 기능한다. 마지막 편이라 다음 편 링크는 없다. 그러나 257~288행 회고의 장 목록이 실제 파일 제목과 다르다. Ch3(실제 Device Tree 설계)을 toolchain, Ch4(Pin Mux·Clock)를 첫 부팅, Ch5(DDR)를 Device Tree 기본, Ch7(TF-A)을 커널 포팅, Ch8(커널 설정)을 디바이스 드라이버, Ch9(SMP)를 power management, Ch10(첫 부팅)을 secure boot, Ch11(부트로그)을 multimedia, Ch12(드라이버 추가)를 네트워크, Ch13(PM)을 DRM/KMS, Ch14(Thermal·Watchdog)를 디버깅 도구로 적어 11개 장이 틀렸다. 320행 'toolchain을 어떻게 시작했는지부터'도 없는 장을 가리키고, 330행 'ESP32-C3 Mastering'은 링크가 없다. |
| G | 2 | 본문 1차 출처는 336행 submitting-patches.rst(latest)와 337행 kernel.org releases 둘이다. LTS 표(25~32행)에 조회 날짜·출처 연결이 없고 125~137·246~251행 표도 출처·시점이 없다. |

uncertainties:
- 27~32행 LTS EOL 날짜(5.15 2026-10이 5.10 2026-12보다 이른 점 포함)를 kernel.org와 대조하지 않았다.
- 23행 '5~6년간 보안 백포트'와 6.6·6.12 EOL 2026-12의 충돌은 출시일이 글에 없어 기억에 기댄 의심이다.
- 27행 5.4 '곧 EOL'(2025-12)은 40행 '2026년 5월 기준'보다 이미 지난 날짜다(staleness 후보).
- 128행 Olof Johansson, 135행 linux-imx@nxp.com, 213행 CodeAurora가 현재 MAINTAINERS·배포처와 맞는지 미확인.
- 61행 'i.MX, Allwinner의 일부 SoC' 사례는 출처가 없다.
- 229행 `make show-info | jq '.packages'`, 242행 `tmp/log/cve/*` 경로 미확인.
- 327행 Practical RTOS Internals 설명의 'RCU, dyntick'이 그 시리즈 내용과 맞는지 미확인.
- 15행 '1만 줄'과 52·59행 '50K 줄'의 연결이 불명확하다.

병합 대상: 병합 대상 없음. 시리즈 마지막 글로 LTS·업스트림 기여·유지보수라는 독립 역할이 있고 `buildroot/chapter18-security-cve.md`, `bootloader/chapter30-bootloader-ci.md`는 일부 절만 겹친다. 다음 조치는 보강: 36·40·311행 LTS 기준·권장 모순을 kernel.org releases로 고치고, 257~288·320행 회고 목차를 실제 chapter01~21 제목으로 바로잡고, 330행 링크 없는 항목을 정리한다.

### `buildroot/chapter01-problem.md` — 60점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치. 204행 표는 첫 빌드를 Buildroot 32분, Yocto 110분으로 적었는데 211행은 같은 표를 근거로 '*5배*의 첫 빌드 시간'이라고 쓴다. 110/32 ≈ 3.4배다. 같은 문장의 '7배 메타데이터'(209행 1,800/270 ≈ 6.7)와 '3.7배 dl 캐시'(208행 4.5/1.2 ≈ 3.75)는 표와 맞아 5배만 틀린다. git log(0a9dd7bc, be973200, ac24bb76, 03ec1f08, f7714f0f)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 43~49행 Buildroot가 일부러 포기한 세 가지(binary feed, per-recipe sysroot, 다중 아키텍처 단일 트리), 151~157행 Yes/No 5단계 결정 표, 53~61행 빌드 단계별 시간 분포가 고유하다. 그러나 55~61행 분포, 131~143행 채택 사례(Tesla, BMW iDrive 8 + meta-bmw, Jetson Nano 등), 201~209행 비교 표에 출처가 없다. 98·145행은 일반론이다. 13~19 구간 아래쪽. |
| B | 13 | 문제 정의(17~31행) → 설계 철학(33~81행) → 비교 표(85~96행) → 적합한 경우(100~123행) → 결정 표(147~159행) → 실습 미리보기(172~195행) → 오해(213~219행) → 정리(221~229행)로 끝까지 간다. 63행 '두 번째 빌드부터 뒤집힘' vs 205행·211행, 121행 '다수' vs 142행 '모두', 채택 사례 진위가 열려 있어 B ≤ 13. |
| C | 7 | 37~41행 세 줄 빌드, 185~193행 clone → defconfig → make → output/images 목록이 재현 가능하다. 53행은 '20개 패키지 최소 시스템'뿐이고, 199~209행은 Buildroot 2024.02·Scarthgap만 있고 호스트 CPU·디스크가 없다(같은 수치를 chapter20 263행은 '8-core Ryzen 7, NVMe, 32 GB'와 함께 적음). C ≤ 8에서 211행 산술 오류로 1점 더 감점. |
| D | 10 | `chapter02-directory-structure.md`(17~52행)는 겹치지 않는다. 203~206행 32분/110분·5초/8초·25초/12초 ↔ `chapter20-yocto-migration.md` 267~269행(같은 수치). 116~121·153~156행 ↔ chapter20 23~41행 '신호 1~5'. 85~96·102~121행 ↔ `bsp/chapter16-rootfs.md` 21~37행. 이 글은 시리즈 도입, chapter20은 이전 절차, bsp/16은 통합이 중심이라 10~14 구간 아래쪽. |
| E | 7 | 제목·description(5행)이 17~31·83~98·147~157행과 같은 질문을 향하고 범위 불일치는 없다. '분석'이 기대하게 하는 수치 비교가 199~211행에서 출처·환경 없이 끝나고 산술도 틀려 9점 이상은 아니다. |
| F | 7 | 233행 다음 편은 seriesOrder 2 `chapter02-directory-structure.md`(15행 '6개의 핵심 디렉터리')와 맞다. 238~241행 관련 링크(Ch2, Ch4 QEMU, Ch10 BeagleBone Black, BSP Ch16 rootfs)도 대상과 맞다. 176~181행 보드 표가 시리즈 진행을 알려 준다. 170행 'Yocto는 별도 시리즈에서'는 같은 시리즈의 `chapter20-yocto-migration`을 연결하지 않는 낡은 안내이고 전제 지식 안내가 없다. |
| G | 2 | 본문 출처는 242행 Buildroot Manual 링크 하나이고 주장에 연결되지 않는다. 201행 버전은 있으나 55~61·203~209행 수치와 131~143행 사례에 출처가 없다. |

uncertainties:
- 211행 '5번째 빌드부터는 Yocto가 빠른 경우가 많아집니다' vs 63행 '두 번째 빌드부터는 … 단번에 뒤집힙니다', 205~206행(무변경이면 Buildroot 5초, 1개 수정이면 Yocto 12초). 211행이 완곡해 오류 확인에 넣지 않았다. chapter20 41·338행은 '4번째 빌드부터'다.
- 121행 '다수가' vs 142행 '*모두* Yocto layer 형태'. 완곡 vs 단정 충돌이라 A 감점으로만 봤다.
- 61행 30~45분, 89행 30분~1시간, 106행 '30분 만에 한 사이클', 63행 Yocto 90분~3시간, 89행 1~3시간이 서로 다르다.
- 131~143행 채택 사례(OpenWrt 1,000개 이상, Synology DSM, Jetson Nano, Tesla, BMW meta-bmw, Mercedes MBUX, meta-qcom)를 1차 자료로 확인하지 않았다.
- 167행 'Yocto + meta-buildroot'가 실재하는 공개 레이어인지 미확인(chapter20 90~148행도 같은 주장).
- 76행 'meta-, meta-yocto'가 oe-core·meta-poky를 뜻하는지 미확인.
- 192행 qemu_aarch64_virt_defconfig 산출물 목록과 186행 저장소 경로를 2024.02 기준과 대조하지 않았다.
- 89행 Yocto 첫 빌드 1~3시간 vs bsp/chapter16-rootfs.md 26행 3~8시간.

병합 대상: 해당 없음. 점수 구간이 보강(60점)이고 시리즈 첫 글이 도입을 겸한다. 판정은 오류 확인 때문에 우선 조치이며, 211행 '5배'를 표(110/32 ≈ 3.4배)에 맞게 고친 뒤 비교 수치에 측정 환경과 출처를 붙인다.

### `buildroot/chapter02-directory-structure.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료: Buildroot 매뉴얼(https://buildroot.org/downloads/manual/manual.html, 'Make tips' 절, 평가 중 직접 열람)은 make clean을 'delete all build products (including build directories, host, staging and target trees, the images and the toolchain)'로 정의한다. 이 글 192행은 'make clean이 *target만* 지우고, output/host/(toolchain)는 남깁니다'라고 써서 정반대다. git log(29edb309, 662ae843, ac24bb76, e85d7684, be973200, 0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 33~50행 디렉터리 표, 52~76행 package/ 쌍 규약, 229~239행 보조 디렉터리 목록은 매뉴얼 수준이다. 고유한 것은 board/ 파일과 BR2_ 옵션을 짝지은 96~100행 표, 245~265행 configs→.config→dl→build→target→images 흐름과 271행 결론, 275~278행 실수 목록이다. 실패 사례·선택 기준이 없고 227행 '자주 씁니다'는 근거 없는 일반화다. |
| B | 11 | 6개 디렉터리(52·80·104·135·166·194행)와 보조(229~239행)·흐름(241~271행)·실수(273~278행)·정리(280~289행)까지 흐름은 완성됐다. 192행 make clean 범위가 매뉴얼과 반대라 독자가 그대로 판단하면 틀린다. 기준 릴리스가 없어 ls 출력(24~28, 57~59, 140~143행)이 언제 맞는지 알 수 없다. |
| C | 6 | ls·make 명령과 출력(108~122, 126~131, 198~216행)이 있다. Buildroot 버전·호스트 환경이 없고 110행 'wc -l' 출력이 '350+'라 실제 실행 결과가 아니다. 31·37·78·283행 '2,000개 이상', 218·275행 '수 GB', 277행 '수백 MB'는 출처 없는 수치라 C ≤ 8, 합격·실패가 갈리는 검증 절차가 없어 6. |
| D | 9 | 비교한 글: `chapter01-problem.md`, `chapter03-kconfig.md`(321~335행 savedefconfig, 이 글 133행은 언급만), `chapter04-first-build.md`, `chapter14-build-caching.md`. 166~181행 output/ 표 ↔ chapter04 202~221행, 194~216행 dl/ 두 블록 ↔ chapter04 300~322행(경로만 다름), 220~225행 BR2_PRIMARY_SITE ↔ chapter14 79~87행·chapter04 354행. 트리 지도 역할은 구별되지만 output/·dl/ 두 절은 반복이다. |
| E | 7 | 제목(2행)과 description(5행)의 디렉터리가 H2(52·80·104·135·166·194행)와 1:1로 맞고 과장이 없다. 대상 독자·결과는 19·271행에 넌지시 나오고 버전 범위가 없다. |
| F | 7 | 293행 다음 편은 seriesOrder 3 `chapter03-kconfig.md`와 맞다. 298~302행 관련 항목 5개(ch01·03·05·06·07)와 본문 교차 안내(67행 Ch5, 102행 Ch7, 133행 Ch3 → chapter03 321행, 164행 Ch8, 276행 Ch6)가 대상과 맞다. 전제 지식 안내가 없고 245~265행 ASCII 흐름도가 269행 SVG와 이중 제시돼(§6 후보) 7. |
| G | 1 | Buildroot 매뉴얼·git 트리 링크와 기준 릴리스가 없다. 58행 busybox-1.36.0, 203행 linux-6.6.30처럼 버전이 파일명에만 암시된다. |

uncertainties:
- 59행 'S01logging', 58행 '0001-fix-build.patch', 'busybox-1.36.0.config'가 upstream 트리에 있는지 미확인.
- 100행 board/raspberrypi4-64/: master의 raspberrypi4_64_defconfig가 post-build.sh·post-image.sh를 참조함은 확인했으나 genimage cfg 위치와 '어디서 참조' 열의 post-build 누락은 미확인.
- 140~143행 fs/ 목록(btrfs·erofs·f2fs 등)의 기준 릴리스 미확인.
- 31행 'package/가 가장 무거움', 31·37·78행 '2,000개 이상', 110행 '350+'는 출처 없는 수치다.
- 19행 '디렉터리가 30개 가까이'인데 24~28행 ls 출력에는 디렉터리 12개·파일 7개뿐이다(개수 표기).
- 188행 '네 디렉터리'는 170~181행 표 10행과 맞지 않는다(SVG 4구역으로 보이나 개수 표기).
- make clean 정의는 현재 매뉴얼 기준이다. 글에 기준 릴리스가 없어 구버전 차이 가능성은 남지만 정의는 오래 유지돼 왔다.

병합 대상: 오류 확인으로 우선 조치가 먼저다(192행 make clean 설명을 매뉴얼 기준으로 고치고 distclean과 구분). 점수 구간 기준 후보는 `src/content/blog/embedded/buildroot/chapter04-first-build.md`(이 글 166~181행 ↔ 202~221행, 194~216행 ↔ 300~322행)이지만 '트리 지도'라는 독립 검색 의도가 있어 통째 병합은 권하지 않는다. 다음 조치는 보강: output/·dl/ 상세는 ch04 또는 ch14에만 두고 이 글은 흐름(245~271행)과 board↔옵션 대응표(96~100행)를 키우며 기준 릴리스와 매뉴얼 출처를 붙인다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** BSP 8편은 160a78a8(21편 일괄 집필) 이후 linter·제목·링크·메타데이터·slug 커밋뿐이고 ch17은 출처 없는 e4f6db70 'Qualify …'만 거쳤다. ch19의 adb7589e·f5ac9548은 AER 패턴 두 줄만 대조했다. Buildroot 2편도 대조 커밋이 없다. `factcheck: 검증됨`은 0편이고 6편이 오류 확인이다. BSP Development와 Buildroot Practical은 `/fact-check-round` 대상이다.
- **관련 항목 라벨이 대상 글과 다름 — 다른 시리즈 첫 글·00-preface로 가는 주제 라벨 (6편).** ch14 395행(Buildroot ch01 '— systemd 설정')·398행(Practical RTOS 00-preface '— watchdog 패턴 비교'), ch15 306행(Bootloader '— Falcon Mode' → chapter01)·307행(modern-recipes 00-preface '— Boot 최적화'), ch17 372행(Bootloader '환경 변수' → chapter01)·373행(Buildroot '이미지 조립' → chapter01), ch18 400행(Bootloader 'bootcount' → chapter01, bootcount 0건), ch19 364행(modern-recipes 00-preface 'Stress recipes'), ch20 385행(Embedded Security 'Secure boot' → chapter01-threat-model)·386행(Buildroot 'SBOM' → chapter01). fa55144d의 SERIES 패스('see the X series' → 그 시리즈 첫 글)가 라벨은 두고 대상만 바꾼 패턴으로 보인다. ch13 434행(루프 밖)에도 같은 패턴이 있다.
- **옛 목차의 장 번호·주제 라벨이 남음 (4편).** ch14 17·389행 '시리즈의 마지막 챕터'(실제 21편), ch15 304행·ch19 363행 'Ch 14: 디버깅 도구'(실제 Ch14는 Thermal·Watchdog), ch21 257~288·320행 회고의 11개 장 이름이 실제 파일 제목과 다름. stub 커밋 7824b986의 옛 목차 이름이 남은 것으로 보인다(160a78a8 본문의 장 목록은 실제와 맞음).
- **본문에 1차 출처 링크·도구 버전 없음 (10편, G 1~2).** BSP ch14·15·17·18·19·20은 G 1, ch16은 버전이 코드 블록 안(109·209·239·275행)에만 있고, ch21은 끝의 링크 두 개(336·337행), buildroot ch01은 242행 매뉴얼 링크 하나, ch02는 없음.
- **출처·측정 환경 없는 구체 수치 (10편, C ≤ 8 상한 반복).** ch14 80~87·287행, ch15 27~35·258~265행, ch16 25~31행, ch17 246·337행, ch18 25·310·336·388행, ch19 102~106·152·207~214행, ch20 263·266행, ch21 59·300행, buildroot ch01 53~63·199~211행, ch02 31·110·218·275·277행.
- **같은 H2 뼈대 '한 줄 요약 → … → 자주 하는 실수 → 정리 → 다음 편 예고 → 관련 항목' (10편).** BSP ch15 13·276·288·298·302행, ch16 13·367·379·389·393행, ch17 13·339·353·364·368행, ch19 13·330·344·355·359행, ch20 13·352·366·377·381행, ch21 13·296·308·332행, buildroot ch01 13·213·221·231·236행, ch02 13·273·280·291·296행 등. 사이트 단위 scaled content 점검 대상이다.
- **시리즈를 넘어 같은 내용 반복 (D 감점, 7편).** A/B env(bootcount·altbootcmd)가 bsp ch17 96~108행·ch18 33~48행·bootloader ch17 70~88행에, genimage A/B cfg가 bsp ch17 163~201행·bootloader ch28 247~276행·buildroot ch10에, BR2_EXTERNAL·overlay·Yocto 대응 표가 bsp ch16과 buildroot ch06·07·20에, Buildroot vs Yocto 비교 표가 buildroot ch01 85~121행·ch20 19~41행·bsp ch16 21~37행에, systemd-analyze·initcall_debug가 bsp ch10·11·15에, stress-ng·memtester가 bsp ch05·14·19·bootloader ch26에, legal-info·reproducible·LAVA가 bsp ch20과 buildroot ch18·19·bootloader ch30에, output/·dl/ 절이 buildroot ch02·04·14에 반복된다. 시리즈 간 역할 분담 정리가 필요하다.
- **description·다음 편 안내가 본문에 없는 내용을 약속 (4편).** ch15 5행 deferred init·2행 Parallel Init, ch17 5행 eMMC/UFS 굽기, ch18 394행·ch19 5행 'EMC 영향', ch18 355행 H2 fastboot.
- **글 사이 수치 충돌 (4편 관련, 오류 확인에는 넣지 않음).** Yocto 첫 빌드(buildroot ch01 89행 1~3시간 vs bsp ch16 26행 3~8시간), Yocto가 앞서는 빌드 회차(buildroot ch01 211행 5번째 vs ch20 41·338행 4번째), 온도 등급 표(bsp ch14 80~85행 vs performance-engineering part3-10 19~26행), systemd watchdog 설정(bsp ch14 277~285행 vs bootloader ch17 355~358행). fact-check 라운드에서 1차 자료로 정하고 known-falsehoods 등재를 검토한다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 작업의 순서 제안이다.

- 우선 조치 6편을 먼저 본다. bsp ch15(3건: 292행 Falcon 한 자릿수 ms, 35행 합계 산술, 143·282행 Falcon 실패 동작), bsp ch14(critical trip shutdown vs emergency_restart, thermal_core.c로 확인), bsp ch17(129~130행 flash.bin·GPT 겹침, NXP RM·imx-mkimage), bsp ch21(36·40·311행 LTS 기준·권장, kernel.org releases), buildroot ch02(192행 make clean, 매뉴얼 Make tips), buildroot ch01(211행 '5배'). 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 F 감점 원인을 고친다: ch14 17·389행 '마지막 챕터', ch15 304·306·307행, ch17 372·373행, ch18 400행, ch19 363·364행, ch20 385·386행 관련 링크, ch21 257~288·320행 회고 목차와 330행 링크 없는 항목, buildroot ch01 170행 낡은 안내.
- buildroot ch02의 make clean 오해는 chapter05 372행 등 시리즈 다른 글과 함께 점검하고 `data/known-falsehoods.yaml` 등재 여부를 사용자가 결정한다.
- 병합 검토 4편(bsp ch16·18·19·20)은 병합보다 보강 방향이다. 겹치는 일반 설명은 buildroot ch06·07·20, bootloader ch17·20·28·30, buildroot ch18·19 링크로 줄이고 각 글의 고유 부분(빌드 시스템 이중 유지, 현장 복구 경로, 안정성 검증 체계, 양산 전환)을 1차 출처와 함께 키운다.
- 관련 항목 라벨 문제는 fa55144d SERIES 패스에서 생긴 패턴이라 BSP 시리즈 나머지 13편도 grep으로 라벨과 대상 제목을 대조한 뒤 다음 루프 채점에 반영한다.
- BSP·Bootloader·Buildroot 세 시리즈의 역할 분담(OTA·A/B·genimage·BR2_EXTERNAL·Yocto 비교)은 사용자 결정 사항으로 남긴다.
