# 공개 글 AdSense 평가 — 루프 02

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-02.md) · [재검토 기록](double-check-loop-02.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일: 2026-10-18. 기준: `docs/adsense-audit/rubric.md` v1.2, `anchors.md`, `antipatterns.md` AP-C-24. 대상은 Bootloader Internals 11~20장 10편이다. 기준 커밋은 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`이다. 원문·기존 보고서·사용자의 미커밋 파일은 변경하지 않았다. 기존 보고서 작성 커밋 `ba9f7104` 이후 대상 10편의 diff는 없다. 대상 글 자체의 개선에 따른 점수 차이는 없다. 다만 D의 비교 글은 현재 원문으로 읽었으며, Modern Recipes 일부는 기존 평가 이후 개정됐다. 따라서 D 차이는 현재 비교를 반영한 재평가이고 모두 과거 평가 오류를 뜻하지 않는다. 특히 ch19의 MR 7-01 비교는 현재의 보드·버전 고정 서술을 기준으로 한다.

앵커는 2026-10-11 문서의 점수·근거를 구간 기준으로 사용했다. 현재 앵커 원문을 새로 채점하거나 현재 보강된 원문의 품질을 과거 앵커 점수에 혼합하지 않았다. 아래 `UART`는 `part1-04-uart-hardware.md`(49), `Build`는 `part7-05-kernel-build.md`(50), `LLM`은 `part12-10-on-device-llm.md`(74)를 뜻한다. 파일명 생략 시 원문 경로는 `src/content/blog/embedded/bootloader/`다. `MR/`는 `src/content/blog/embedded/modern-recipes/`, `BR/`는 `src/content/blog/embedded/buildroot/`다. 모든 줄 번호는 현재 원문 기준이다.

10편 본문 전체를 읽었다. D의 직접 비교는 각 행에 적힌 글의 본문을 읽고 수행했다. F의 전체 내부 링크는 frontmatter의 slug를 실제 파일로 해석해 공개 여부·제목·seriesOrder·해당 절을 확인했다. 본문에 없는 전문 키워드라는 이유만으로 관련 링크를 오답으로 판정하지 않았다. 렌더·빌드·광고 배치는 직접 검사하지 않았으며 부모의 공통 검사 대상이다. 외부 링크 응답 전수 검사는 하지 않았다.

## 결과와 기존 대비

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter11-network-boot.md` | 15 | 13 | 8 | 12 | 7 | 5 | 3 | **63** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter12-usb-boot.md` | 14 | 13 | 7 | 12 | 7 | 4 | 2 | **59** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter13-env-bootcmd.md` | 11 | 12 | 7 | 9 | 7 | 7 | 2 | **55** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter14-bootflow-bootmeth.md` | 12 | 12 | 7 | 10 | 7 | 5 | 2 | **55** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter15-fit-image.md` | 12 | 12 | 7 | 11 | 5 | 5 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter16-verified-boot.md` | 13 | 12 | 7 | 10 | 8 | 5 | 2 | **57** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter17-ab-update.md` | 15 | 12 | 7 | 10 | 8 | 5 | 2 | **59** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter18-efi-in-uboot.md` | 12 | 12 | 7 | 11 | 5 | 7 | 2 | **56** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter19-kernel-handoff.md` | 12 | 11 | 6 | 11 | 2 | 6 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter20-rauc-swupdate.md` | 11 | 11 | 6 | 7 | 7 | 6 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 |
| --- | ---: | ---: | ---: | --- | --- |
| `chapter11-network-boot.md` | 63 | 63 | 0 | 우선 조치 | 우선 조치 |
| `chapter12-usb-boot.md` | 58 | 59 | +1 | 우선 조치 | 우선 조치 |
| `chapter13-env-bootcmd.md` | 53 | 55 | +2 | 병합 검토 | 병합 검토 |
| `chapter14-bootflow-bootmeth.md` | 55 | 55 | 0 | 병합 검토 | 병합 검토 |
| `chapter15-fit-image.md` | 53 | 54 | +1 | 우선 조치 | 우선 조치 |
| `chapter16-verified-boot.md` | 59 | 57 | -2 | 우선 조치 | 우선 조치 |
| `chapter17-ab-update.md` | 60 | 59 | -1 | 우선 조치 | 우선 조치 |
| `chapter18-efi-in-uboot.md` | 52 | 56 | +4 | 우선 조치 | 우선 조치 |
| `chapter19-kernel-handoff.md` | 50 | 50 | 0 | 우선 조치 | 우선 조치 |
| `chapter20-rauc-swupdate.md` | 49 | 50 | +1 | 우선 조치 | 우선 조치 |

합계 558, 평균 55.8, 범위 50~63. 기존 합계 552에서 +6이다. 총점 일치 3/10편이며, factcheck와 최종 판정은 10/10편 동일하다. 총점의 유사성은 오류 근거까지 모두 옳았다는 뜻이 아니다. ch15의 기존 오류 사유를 철회하고 다른 1차 자료 오류로 대체했으며, ch18의 링크 감점을 상당 부분 철회했다. 전편 `score_status: 잠정`, `confidence: 중간`이다. 전체 API·수치를 검증한 글은 없어 `검증됨`·`확정`으로 올리지 않았다. P0는 본문 범위에서 발견하지 못했다.

| 파일 | 동의하는 항목 | 변경 항목과 이유 |
| --- | --- | --- |
| ch11 | A B C D E F G | 전 항목 동의. 명령·출력은 있으나 환경 없는 속도 수치와 NFS 반복, 잘못된 NFS 링크가 상한을 만든다. |
| ch12 | A B C E F G | D 11→12: 직접 비교한 MR 7-02의 fastboot는 119~131행 짧은 사용 예다. 이 글의 DFU·UMS·ROM recovery 역할은 독립적이다. |
| ch13 | B C E F G | A 10→11: 120~132행 fallback 분해와 191~205행 env redundancy가 독립 질문이다. D 8→9: ch29의 distro 중복은 크지만 env 저장·영속화까지 동일한 글은 아니다. |
| ch14 | A B C F G | D 11→10: ch29 186~206행과 모델·출력·활성화가 직접 반복된다. E 6→7: 모델 정의·명령·드라이버 작성·migration이 제목의 추상화 설명에 실제로 대응한다. |
| ch15 | C F G | A 11→12, B 11→12: multi-board·overlay 예제가 있고 default/compatible은 조건부 분기다. D 10→11: ch16은 서명, 이 글은 컨테이너·configuration 전담. E 7→5: 구조 소개·예시 출력만으로 제목의 configuration ‘추적’을 완수했다고 보기 어렵다. |
| ch16 | E F G | A 14→13, B 13→12, C 8→7: 뒤 절 반복·검증 단계의 사실 오류·암호화 명령 부정확성이 실전 연결을 약화한다. D 9→10: ch15와 겹치나 required key·rootfs 검증이라는 고유 역할을 인정한다. |
| ch17 | A C D E F G | B 13→12: agent 권한과 직접 BOOT_SLOT 변경, RAUC 계약을 서로 맞춰 읽을 수 없다. |
| ch18 | B C G | A 11→12: EFI loader·변수·stub·표준 부트 연결의 자체 구성 인정. D 10→11: ch29의 EFI 절과 겹치나 전체 loader 설명은 별도다. E 6→5: ‘동작 원리’에 비해 구현 추적이 없다. F 4→7: ch19 ABI 연결과 ch29 비교표는 실질적으로 맞는 안내다. |
| ch19 | A C E F G | B 12→11: 인계의 핵심 PC·DTB 규칙이 잘못돼 완결성을 더 낮게 본다. D 10→11: 현재 MR 7-01은 특정 보드, 이 글은 아키텍처 ABI 모음으로 역할을 구분한다. |
| ch20 | A B C E F G | D 6→7: BR 16과 도구 비교·system.conf·manifest가 반복되지만 U-Boot 측 계약을 모은 독립 의도는 있다. |

## 정확성 게이트 재검토

외부 자료는 글 날짜보다 뒤의 최신 동작을 소급하지 않도록 U-Boot **v2025.01**, Linux **v6.12**를 우선 사용했다. RAUC는 버전이 명시된 **1.13** 문서를 사용했다. 이 절의 확인은 특정 오류 판단이며 글 전체의 검증 완료를 뜻하지 않는다.

| 글 | 기존 사유 재판정 | 이번 확정 근거 |
| --- | --- | --- |
| ch11 | 38·113행의 10진수/16진수와 159행 산술은 유지. 415행 32-bit/16비트는 같은 기술 폭을 다르게 쓴 명백한 충돌이나 이것만을 주된 근거로 삼지는 않는다. | 실행 산술: `10995712.toString(16)=a7c800`, `0xa7c000=10993664`, `1500-28=1472`. 원문 출력·산술 자체가 맞지 않아 §3-1 허용. |
| ch12 | 83행 count와 92~94행 동일 장치 lsblk 불일치 유지. | `0x1d59000=30773248`, ×512/2^30=`14.673828125 GiB`. 14.9 GiB 표시뿐 아니라 256 MiB+14.6 GiB 파티션도 그 용량을 초과한다. 반올림으로 설명되지 않는다. |
| ch15 | **193행 default와 278행 compatible을 내부 모순이라던 근거 철회.** 조건이 다르면 둘 다 가능하다. 278행은 조건 누락이다. | [v2025.01 image-fit.c](https://github.com/u-boot/u-boot/blob/v2025.01/boot/image-fit.c#L1964-L1973)는 FIT_BEST_MATCH에 따라 분기한다. 대신 245행 ‘CONFIG_FIT_SIGNATURE=y면 무서명 FIT 거부’는 [공식 서명 문서의 required 키 조건](https://docs.u-boot.org/en/v2025.01/usage/fit/signature.html#public-key-storage)과 불일치해 오류 확인을 유지한다. |
| ch16 | 146행과 256·429행의 required 조건 충돌은 기술 주장이다. 186행 자동 OTP 비교와 367행 board hook은 확장 구현 여부를 알아야 하므로 원문만의 모순으로 확정하지 않는다. 388행 -e와 407행 -E도 API 의미를 1차 자료로 확인한다. | [mkimage.c v2025.01](https://github.com/u-boot/u-boot/blob/v2025.01/tools/mkimage.c#L88-L108)에서 -e는 entry point, -E는 external data다. **둘 다 암호화 옵션이 아니므로** 388~409행 암호화 절은 오류 확인. [image-fit.c의 fit_check_format](https://github.com/u-boot/u-boot/blob/v2025.01/boot/image-fit.c#L1549-L1611)은 형식 검사이며 186행의 자동 OTP rollback 비교를 수행하지 않는다. |
| ch17 | ‘> vs -ge’만으로는 core와 사용자가 짠 스크립트가 다를 수 있어 내부 모순 근거로는 불충분. 174·263행 agent가 직접 B를 쓰는데 182행은 agent가 직접 토글하지 않는다고 하므로 별도의 명시적 동작 충돌이 있다. | [U-Boot bootcount v2025.01](https://docs.u-boot.org/en/v2025.01/api/bootcount.html)은 초과(>)에서 altbootcmd를 실행한다. 174행 bootlimit=3 뒤 179행 ‘2→3→altbootcmd’는 core 동작과 불일치. [include/bootcount.h](https://github.com/u-boot/u-boot/blob/v2025.01/include/bootcount.h#L90-L105)로도 확인했다. |
| ch18 | 210행 FAT12/16/32와 414행 FAT32/16만 허용은 같은 ESP 허용 범위를 다르게 적은 구체 기술 진술이라 유지. 49행 ‘부분 구현’과 245행 ‘구현’은 요약 정도 차이라 단독 오류 근거로 채택하지 않는다. | 87·112·408·422행 `bootefi setup` 필수 단계 주장은 [v2025.01 공식 synopsis와 직접 실행 예](https://docs.u-boot.org/en/v2025.01/usage/cmd/bootefi.html)에 없다. 구현 파일 fetch가 두 번 실패했으므로 **이 부재만으로 API가 절대 없다고 추가 확정하지 않고 uncertainties에 둔다**. |
| ch19 | 45·130행 DTB 허용 방향 충돌은 유지하되 원뜻이 모호하다는 논쟁에 의존하지 않는다. | [Linux v6.12 AArch64 booting](https://docs.kernel.org/6.12/arch/arm64/booting.html#setup-the-device-tree)은 512 MiB 제한을 v4.2 이전으로 한정한다. 45·130·259행의 무조건적인 현행 요구는 오류다. 같은 문서의 Call the kernel image는 Image 시작의 실행 코드로 진입하므로 31행 고정 `Image.start+0x80`도 잘못이다. |
| ch20 | 86행 성공 후 토글과 133행 설치 때 변경은 단계가 다르면 두 번 쓰는 동작일 수도 있으므로 **그 둘만으로 논리적 불가능이라고 확정한 기존 설명은 철회**. 65~83행과 258~262행 파티션 계약 불일치는 유지. | [RAUC 1.13 U-Boot 통합](https://rauc.readthedocs.io/en/v1.13/integration.html#u-boot)은 기본 백엔드 계약을 BOOT_ORDER와 BOOT_<bootname>_LEFT로 명시한다. system.conf가 bootloader=uboot인 56행 구성에서 86·133·146행처럼 BOOT_SLOT·bootcount·upgrade_available을 RAUC가 자동 처리한다고 한 주장은 custom backend가 없는 본문 예와 맞지 않는다. |

## 글별 독립 근거

### `chapter11-network-boot.md`

source_file: `src/content/blog/embedded/bootloader/chapter11-network-boot.md`

- score_status: 잠정
- score: 63 (A15+B13+C8+D12+E7+F5+G3)
- confidence: 중간
- factcheck: 오류 확인
- anchor_ref: LLM, UART
- blockers: P0 미발견. P1 출력·MTU 산술 오류. F의 NFS 관련 목적지 불일치.
- uncertainties: 81행 DHCP option 66/next-server 구분, 161행 timeout 단위, 235행 ARM iPXE 지원, 365행 HTTPS 범위는 미대조. 실제 보드·NIC·서버와 측정 로그 부재.

| 항목 | evidence |
| --- | --- |
| A | 15 | 157~163행 전송 옵션·MTU, 375~403행 라인별 provisioning은 UART 일반 소개보다 고유하다. 144·163행 속도 결론은 무출처여서 LLM의 계산 근거 수준에 못 미친다. |
| B | 13 | 21~97 DHCP→99~163 TFTP→165~235 PXE→237~339 NFS→341~403 HTTP·양산으로 한 사이클이 닫힌다. 244/304행 exports와 259~263/307~309행 cmdline 재설명, 미해결 정확성으로 AP-C-24 B≤13. |
| C | 8 | 45~59 DHCP 설정, 103~138 TFTP 세션·서버 설정, 318~335 전체 명령이 있다. 36·144·163행 환경 없는 구체 성능 수치로 §3-1 C≤8. |
| D | 12 | 인접 ch12 21~103행은 USB flashing·UMS로 별개. ch13 136~176행↔이 글 277~296행 distro fallback 중복. 다른 시리즈 MR/part7-02-uboot-usage.md 63~82행↔103~128행 TFTP 전송·호스트 서버 중복이나 PXE/NFS·factory는 확장된다. |
| E | 7 | 2·5행의 TFTP/PXE/DHCP는 63~233행으로 대응. BOOTP는 61행 짧은 설명이라 약속 일부가 얕다. |
| F | 5 | 431행 다음편 USB→실제 ch12(12), 435~438행 ch10/12/13/29는 대응. 440행 `/blog/embedded/buildroot/chapter08-filesystems`의 NFS target/ 설명은 목적지에 없다. 439행 ch30은 실제 143~178행 uuu·시리얼·양산 라인을 다루므로 ‘factory’ 단어가 없다는 기존 오답 사유는 철회하지만 별도 NFS 결함으로 F≤5. |
| G | 3 | 144·146·160행 RFC를 주장에 붙이고 442~443행 1차 링크가 있다. 특정 U-Boot 버전·보드·수정 이력은 없다. |

다음 조치: 산술 및 근거 없는 속도·프로토콜 주장을 1차 자료로 재검증하고 NFS 중복을 줄이는 보강. 병합 대상 없음(네트워크 부트의 독립 검색 의도).

### `chapter12-usb-boot.md`

source_file: `src/content/blog/embedded/bootloader/chapter12-usb-boot.md`

- score_status: 잠정
- score: 59 (A14+B13+C7+D12+E7+F4+G2)
- confidence: 중간
- factcheck: 오류 확인
- anchor_ref: LLM, Build
- blockers: P0 미발견. P1 동일 장치 용량 불일치. F 관련 글 안내 오류.
- uncertainties: 55·58행 fastboot alias 형식, 65행 4-byte header 표현, 261행 BUF_ADDR/크기 혼동, 435행 eMMC LUN 용어, 437행 Windows 배포 드라이버 미대조.

| 항목 | evidence |
| --- | --- |
| A | 14 | 352~359행 손상 단계별 recovery 경로, 433~437행 실패 패턴은 Build의 단순 빌드 순서보다 구체적. 148~166/363~378/401~425행 uuu 반복과 범용 명령은 LLM보다 낮다. |
| B | 13 | 21~243행 fastboot·UMS·host·ROM·DFU와 348~458행 recovery·factory·실수·정리는 완결된다. 245·278행 재설명과 정확성 불확실로 B≤13. |
| C | 7 | 36~53 fastboot, 82~99 UMS·lsblk·dd, 219~241 DFU의 명령·출력은 있다. 보드·전체 버전이 없고 269~271행 전송시간은 출처·환경 없는 수치이므로 C≤8; 출력 용량 불일치로 한 단계 낮춘다. |
| D | 12 | 인접 ch11의 네트워크 세션(103~114행), ch13 env fallback(120~132행)은 역할이 다르다. MR/part7-02-uboot-usage.md 119~131행↔36~53행 fastboot flash 명령이 중복되지만 이 글 213~243 DFU·313~378 ROM recovery는 그 글에 없다. |
| E | 7 | 2·5행 fastboot·UMS·USB host 약속을 21~130행이 모두 다룬다. ‘메커니즘’ 부분은 65~75행의 짧은 프로토콜 소개여서 상단 구간이 아니다. |
| F | 4 | 462행 다음편 env는 실제 ch13(13), 466·467·470행은 역할이 맞다. 468행 fastboot 환경 변수→ch13, 469행 fastboot OTA→ch17, 472행 fastboot 보안→Security ch06에는 해당 내용을 설명하는 절이 없다. 471행 ch30 uuu 자동화 연결 자체는 143~168행으로 성립한다. |
| G | 2 | 473행 Android 1차 문서와 43행 2024.04, 331행 uuu 버전은 있으나 본문 주장의 개별 근거·실행 환경과 연결되지 않는다. |

병합 대상 없음. 다음 조치 보강: 용량·API 검증, 중복 fastboot/UMS/uuu 절 정리, 관련 항목 수정.

### `chapter13-env-bootcmd.md`

source_file: `src/content/blog/embedded/bootloader/chapter13-env-bootcmd.md`

- score_status: 잠정
- score: 55 (A11+B12+C7+D9+E7+F7+G2)
- confidence: 중간
- factcheck: 미검증
- anchor_ref: UART, Build
- blockers: P0 미발견. 정확성 대조 기록 부족, distro·boot.scr 반복.
- uncertainties: 131행 DHCP fallback의 DTB 전제, 138행 DISTRO_DEFAULTS만으로 동작한다는 범위, 224행 인용·확장 동작, 225행 random MAC 조건, 226행 두 env 카피 초기화 의무 미대조.

| 항목 | evidence |
| --- | --- |
| A | 11 | 120~132행 수작업 fallback을 함수로 분리하고 191~205행 redundancy 필요성을 연결한다. 저장 위치 선택 기준이나 실제 손상 결과는 없고 25~32·78~90행은 표준 목록이라 13점 구간 미달. |
| B | 12 | 21~44행 저장→46~74행 명령→108~189행 scenario→191~219행 redundancy·default로 본문 질문이 닫힌다. 구조·flag byte는 203행 한 문장이고 동작 검증 없음; 불확실로 B≤13. |
| C | 7 | 48~72행 저장·출력, 94~104행 default env, 197~200행 offset 구성이 있다. 일반 myboard 예이며 실행 환경·장애 관찰이 없다. 38~39·56~59행 구체 주소·크기도 실제 환경 미연결, C≤8. |
| D | 9 | ch11 277~296행↔136~176행 distro, ch14 171~196행↔143~176행 옛/새 bootcmd 역할을 비교. ch29 44~68행↔138~168행 distro 정의·파티션 순회, MR/part7-02-uboot-usage.md 47~61·84~100행↔46~74·180~189행 저장 명령·boot.scr 중복. 다만 env 저장·redundancy가 핵심 독립 의도다. |
| E | 7 | 2·5행 env·bootcmd·bootargs·distro 약속은 21~219행과 일치. 특정 장애 해결이나 분석 결과까지 제목이 약속하지 않으므로 구조 수준의 이행을 인정한다. |
| F | 7 | 241행 bootflow 예고→ch14(14). 245행 ch10 실제 378~394행 boot.scr, 246행 ch11 실제 277~296행 PXE integration, 247행 ch14 모델, 248행 BSP/chapter06-u-boot-porting.md 실제 366~407행 보드 env 설정으로 모두 대응. 118~134행 수작업 복잡성→표준화 순서가 이 글 고유 안내다. |
| G | 2 | 249행 공식 distro 문서, 138·219행 소스 경로가 있지만 버전·줄 링크와 연결되지 않는다. |

병합 대상: ch29의 distro·boot.scr 절. 전체 병합보다 해당 절을 요약·링크로 줄이고 env 저장·redundancy를 보강하는 것이 다음 조치다. 판정은 점수 구간대로 병합 검토.

### `chapter14-bootflow-bootmeth.md`

source_file: `src/content/blog/embedded/bootloader/chapter14-bootflow-bootmeth.md`

- score_status: 잠정
- score: 55 (A12+B12+C7+D10+E7+F5+G2)
- confidence: 중간
- factcheck: 미검증
- anchor_ref: Build, UART
- blockers: P0 미발견. 도입 버전·driver API·순서 변수 미검증, 관련 링크 설명 불일치.
- uncertainties: 42행 2023.07 도입 주장, 98~109행 bootmeths 변수, 196·258행 boot_targets 삭제/충돌 주장, 207행 반환값 조건과 215·218행 API 시그니처를 해당 태그 소스와 대조하지 않았다. 기억으로 오류 승격하지 않음.

| 항목 | evidence |
| --- | --- |
| A | 12 | 25~36행 세 추상과 171~196행 migration을 결합한 학습 구조는 있으나 253행 env100줄→C함수3개 결론을 측정·실제 driver 결과로 입증하지 않는다. |
| B | 12 | 모델(21~38)→명령(40~82)→방법별 예(84~167)→활성화(169~196)→driver(198~251)의 흐름은 완성. 실제 custom boot 구현은 228~230행 주석으로 끝나고 정확성 불확실로 B≤13. |
| C | 7 | 44~78행 예상 scan/info, 173~194행 설정, 202~245행 skeleton은 있다. size·buffer 등 출력은 환경 없이 제시되어 C≤8. 실제 빌드·등록·성공/실패 관찰 기록이 없어 7. |
| D | 10 | ch13 136~189행과 옛 모델 설명이 겹친다(15~17·189~196행). ch29 186~206행↔21~82·173~194행 bootflow 모델·scan 출력·활성화 중복. MR/part7-01-linux-boot-flow.md 44행은 실제 보드 bootflow 호출만 다뤄 이 글 driver 구조와는 다르다. |
| E | 7 | 2·5행 추상화 분석·distro 대체를 25~36·171~196행과 driver 세 함수(249~251행)가 설명한다. 구현 추적이 없지만 모델 설명까지 없는 개념 나열은 아니다. |
| F | 5 | 275행 FIT 예고→ch15(15). 279·280행 역할은 대응. 281행 ch18의 efi_mgr bootmeth 상세는 ch18에 없으며, 282행 BSP ch06의 보드별 bootflow 활성화도 해당 본문에 없다. 일반 EFI/포팅과 특정 bootmeth 상세는 구별해야 하므로 F≤5. |
| G | 2 | 283행 Standard Boot 공식 문서 외에 버전 고정 근거가 없다. 42행 도입 시점에도 해당 release 출처가 없다. |

병합 대상 없음. 판정은 병합 검토, 다음 조치는 보강: API·도입 버전을 검증하고 ch29 중복을 링크로 줄여 driver/migration 질문을 강화한다.

### `chapter15-fit-image.md`

source_file: `src/content/blog/embedded/bootloader/chapter15-fit-image.md`

- score_status: 잠정
- score: 54 (A12+B12+C7+D11+E5+F5+G2)
- confidence: 중간
- factcheck: 오류 확인
- anchor_ref: Build, UART
- blockers: P0 미발견. 245행 서명 강제 조건 오류. 기존 default/compatible 모순 사유는 철회.
- uncertainties: 199~213행 configuration bootargs 덮어쓰기, 304행 ramdisk 압축 처리, 305행 CONFIG_FIT_SIGNATURE_STRICT 존재·의미, 307행 키 누락 시 무조건 거부 주장은 별도 대조가 필요하다. compatible 선택에는 FIT_BEST_MATCH 전제가 빠져 있다.

| 항목 | evidence |
| --- | --- |
| A | 12 | 40~124행 두 revision·세 component, 253~278행 자동 선택, 284~297행 overlay로 변형을 설명한다. 기본 ITS·서명 예보다 독립적인 관점은 있지만 실제 실패 비교 결과가 없다. |
| B | 12 | 구조→mkimage→load→bootargs→서명→multi-board→overlay→실수(36~307행)까지 완결. default/compatible을 잘못 모순 처리해 B를 낮추지 않으며, 실제 서명 조건·API 불확실은 남아 B≤13. |
| C | 7 | 132~139행 빌드·dump, 168~190행 bootm 출력, 237~243행 서명 명령이 있다. board·tool 버전 미지정, 142·154·177·181행 출력이 예시이며 실제 환경 없는 수치로 C≤8. 실험 기록은 없다. |
| D | 11 | ch14 96행 FIT 언급은 얕고, ch16 46~129·203~256행↔40~124·215~245행 ITS·서명 중복이나 ch16은 trust/key를 전담한다. MR/part3-12-bootloader-chain.md 81~126행↔36~136행 ITS·mkimage 동일 기초, 이 글은 multi-config·overlay로 확장. |
| E | 5 | 2행 ‘구조 분석·configuration 추적’과 5행 포맷 설명 중 후자는 충분히 이행. 전자는 163~195행 예시 출력과 일반 설명이며 소스상 선택 경로·검증 관찰을 추적하지 않는다. 루브릭 분석·추적 약속의 3~5 구간. |
| F | 5 | 321행 verified boot 예고→ch16(16), 326~328행 실제 관련 역할은 맞다. 329행 Security/chapter06-ota-update.md가 ‘FIT와 OTA 결합’을 설명한다는 안내는 해당 본문에 FIT 설명이 없어 과도하다. 325행 ch14 FIT 적재 일반 연결은 96행 VBE FIT 표가 있어 단순히 용어 부재로 오답이라 하지 않는다. |
| G | 2 | 330행 공식 FIT 문서가 있으나 245행·278행 구체 동작과 연결된 태그·출처는 없다. |

병합 대상 없음. 다음 조치는 보강: required 키 조건과 선택 기능 전제를 바로잡고 ch16과 서명 예제 역할을 구분한다.

### `chapter16-verified-boot.md`

source_file: `src/content/blog/embedded/bootloader/chapter16-verified-boot.md`

- score_status: 잠정
- score: 57 (A13+B12+C7+D10+E8+F5+G2)
- confidence: 중간
- factcheck: 오류 확인
- anchor_ref: LLM, Build
- blockers: P0 미발견. 146행 required 조건 누락, 186행 fit_check_format의 OTP 비교, 388~409행 암호화 옵션 오류.
- uncertainties: 160행 booti/bootefi FIT 검증 범위, 268~290행 configuration/image 검증 함수 배치, 370행 hook 시그니처, 396행 AES-GCM 지원, 431행 최대 크기 초과 시 부분 통과, 433행 OpenSSL permission 거부 미대조. 196~198행 dm table 수치 의미도 1차 DM 문서 확인 전 산술 오류로 확정하지 않음.

| 항목 | evidence |
| --- | --- |
| A | 13 | 107행 mix-and-match 이유, 175~201행 rollback·dm-verity 연결, 437~445행 증상표는 UART 일반 소개보다 풍부하다. 46~129/203~256행 FIT·서명 재설명이 크고 핵심 검증 동작에 오류가 있다. |
| B | 12 | 키(31~44)→서명(46~129)→설정·부트(131~171)→rollback/rootfs(173~201)→다중 구성·운영(304~445)로 질문은 닫힌다. 암호화 절은 제시 명령으로 실현되지 않고 정확성 문제로 B≤13. |
| C | 7 | openssl·mkimage·TFTP와 예상 정상 로그(35~41·113~119·148~169행), 실패 체크(171행)가 있다. 실제 보드·버전·변조 이미지 관찰 없음. 138·196~198행 환경 없는 구체 크기·표 수치 때문에 C≤8; 암호화 명령 오류를 반영해7. |
| D | 10 | ch15 215~245행↔46~129·225~256행 ITS 서명·-k/-K/-r 동일. ch17 384~402행↔348~384행 anti-rollback commit 시점 중복. MR/part3-12-bootloader-chain.md 128~143행↔19~29행 trust chain 기초는 같으나 control DT required와 rootfs 연결은 이 글이 깊다. |
| E | 8 | 2·5행 RSA 서명·public key 임베딩 workflow는 35~129·229~256행으로 구체 이행. anti-rollback·암호화 확장은 별도 절이고 제목 범위를 다른 아키텍처로 바꾼 것은 아니다. |
| F | 5 | 459행 A/B 예고→ch17(17). 463행 ch15는 제목 문구가 바뀌었어도 FIT 컨테이너라는 실제 내용이 맞아 오답 아님. 466행 ch25 ‘BL1·BL2·BL31까지 서명 흐름’은 대상이 단계 모델·FIP·PSCI 중심이고 BL 서명 절을 제공하지 않아 F≤5. |
| G | 2 | 469행 공식 signature 문서, 260행 upstream 파일 경로는 있으나 버전·함수별 출처 연결 없음. |

병합 대상 없음. 다음 조치 보강: 서명 강제·rollback 구현 주체·암호화 옵션부터 수정한 뒤 반복 ITS 절을 ch15 링크로 줄인다.

### `chapter17-ab-update.md`

source_file: `src/content/blog/embedded/bootloader/chapter17-ab-update.md`

- score_status: 잠정
- score: 59 (A15+B12+C7+D10+E8+F5+G2)
- confidence: 중간
- factcheck: 오류 확인
- anchor_ref: Build, LLM
- blockers: P0 미발견. agent 권한 모순 및 altbootcmd 3회 경계 설명 오류. RAUC 자동 계약 주장의 추가 검증 필요.
- uncertainties: 189~195행 Android slot_metadata 실제 bitfield, 204~211행 Kconfig 백엔드 이름, 280행 RAUC [handler] 설정, 308행 bad 슬롯 최후 시도 규칙, 389행 SRK/PCR anti-rollback 용도 미대조. uppercase BOOT_COUNT와 lowercase bootcount가 연결되지 않는다(234·272행).

| 항목 | evidence |
| --- | --- |
| A | 15 | 314~337행 shared data schema, 343~380행 장애 위치와 health check, 384~402행 counter commit 시점을 연결한다. 단순 Build 도구 명령보다 고유한 설계 질문이나 실제 운영 결과는 없다. |
| B | 12 | layout→counter→mark-success→OTA→backend→상태·data→실패·보안(44~402행) 흐름은 있다. 174·182·263행 agent 권한과 88·179·227행 경계가 맞지 않아 핵심 계약 완결성이 낮다. B≤13. |
| C | 7 | 81~107행 env 명령과 150~164·363~378행 systemd 예가 있다. 전원차단·각 슬롯의 예상 관찰 로그나 실제 보드가 없다. 53~59행 layout 수치·357행 timeout은 환경 없는 설계 예로 실측 가점 없음, C≤8. |
| D | 10 | ch16 348~384행↔384~402행 rollback, ch18 loader와는 역할 별개. BR/chapter16-ota.md 229~258·324~347행↔77~109·144~179·363~380행 counter·health-check가 반복되나 shared data/schema·failure 분류는 이 글의 확장이다. |
| E | 8 | 2·5행 OTA 슬롯 설계·자동 fallback 약속은 44~179·282~402행과 동일 질문이다. 실전 설계 방향은 있지만 검증 결과가 없어9는 아니다. |
| F | 5 | 430행 EFI 예고→ch18(18). 435~437·439~440행 대상 역할은 실제 내용과 맞다. 434행 ch13의 fw_setenv 상세, 438행 ch27의 슬롯별 anti-rollback은 해당 대상이 제공하지 않아 cap5. 단순 옛 제목 차이를 별도 중복 감점하지 않음. |
| G | 2 | 441행 공식 U-Boot 링크가 있으나 환경 변수 절 URL과 README.bootcount라는 표시가 느슨하다. 116·189행 소스 경로는 버전 미연결. |

병합 대상 없음. 다음 조치 보강: core counter와 custom 슬롯 스크립트·RAUC backend 계약을 분리해 정확히 명시한다.

### `chapter18-efi-in-uboot.md`

source_file: `src/content/blog/embedded/bootloader/chapter18-efi-in-uboot.md`

- score_status: 잠정
- score: 56 (A12+B12+C7+D11+E5+F7+G2)
- confidence: 중간
- factcheck: 오류 확인
- anchor_ref: UART, Build
- blockers: P0 미발견. ESP 허용 FAT 종류에 대한 210·414행 불일치. bootefi setup 관련 의심.
- uncertainties: 87·112·408·422행 bootefi setup은 v2025.01 synopsis에 없지만 소스 fetch 실패로 추가 API 오류 확정 보류. 152·309행 변수 backend 범위, 176~179행 efidebug 명령, 247행 stub API, 358행 모든 generic distro ISO 보증은 미대조.

| 항목 | evidence |
| --- | --- |
| A | 12 | 37~71행 구현 기능·설정에서 249~345행 GRUB·stub 경로로 이어지는 구성이 있다. 소스 함수·실제 장애 원인 분석은 없고 37~49/230~247·150~162/292~311행 자체 반복이 크다. |
| B | 12 | loader→명령→변수→Secure Boot→표준→GRUB·stub→distro→함정(37~418행)으로 개관 완결. 본문끼리 FAT 요건이 맞지 않고 API 의심이 열려 B≤13. |
| C | 7 | 77~119행 로드 순서, 129~147행 bootmgr·userspace, 325~336행 objdump 예가 있다. 실보드·firmware 버전 미지정, 101~104행 출력 크기는 출처·환경 없는 수치라 C≤8. 사례(377~399행)도 캡처 환경 없음. |
| D | 11 | ch17의 A/B와 ch19의 kernel entry ABI는 독립. ch29 248~273행↔124~147·249~290행 EFI bootmgr·메뉴 중복. MR/part7-02-uboot-usage.md 133~143행↔73~92행 bootefi 기본 예는 같지만 변수 저장·stub·EBBR 전담 역할은 이 글에 있다. |
| E | 5 | 2행 EFI 호환 분석·loader 동작 원리와 5행 연결 약속. 345행 stub 단계 설명은 있으나 구현 함수·명세상 진입 조건을 추적한 근거 없이 개념·명령 소개 중심이라 분석 약속은 3~5 구간이다. |
| F | 7 | 431행 ABI 예고→ch19(19)는 맞고 ch19가 EFI stub 문구를 쓰지 않아도 인계 ABI 안내 역할은 성립. 438행 ch29에 267~286행 EFI/Distro 진입점·선택 비교가 실제로 있다. 437행 ch25도 179~195행 BL33/U-Boot 진입 환경을 설명해 구성의 전제로 연결된다. 435·439행 A/B·Secure Boot도 맞다. 94~122행 전체 스크립트, 249~290행 중간 로더→345행 stub 인계로 글 고유 순서를 잡으므로7. 모바일 검사는 안 했고9 불가. |
| G | 2 | 440~442행 공식 U-Boot·EBBR·Arm 출처는 있지만 각 요구의 절·버전 및 사례 환경이 없다. |

병합 대상 없음. 다음 조치 보강: ESP 규칙을 공식 명세로 정리하고 bootefi setup 실존·버전부터 검증한다. EFI 소개 반복을 줄인다.

### `chapter19-kernel-handoff.md`

source_file: `src/content/blog/embedded/bootloader/chapter19-kernel-handoff.md`

- score_status: 잠정
- score: 50 (A12+B11+C6+D11+E2+F6+G2)
- confidence: 중간
- factcheck: 오류 확인
- anchor_ref: UART, Build
- blockers: P0 미발견. PC entry와 DTB 512 MiB의 현행 요구 오류. 제목 아키텍처 범위 불일치.
- uncertainties: 64~70행 armv8_switch 인자/EL 처리, 104행 booti zImage 지원, 111행 header 파일 경로, 215행 CONFIG_KERNEL_NORELOC, 229행 identity mapping first4GB, 251행 bootargs1024바이트 주장은 미대조.

| 항목 | evidence |
| --- | --- |
| A | 12 | 101~106행 네 명령 비교와 235~241행 초기 침묵 원인 분류가 있으나 대부분 27~46·76~93·190~229행 ABI 목록이다. LLM의 계산·API 보정 같은 독립 검증은 없다. |
| B | 11 | 여러 아키텍처 레지스터→이미지 형식→DTB/initrd/cmdline→진단→정리(19~262행) 흐름은 닫힌다. 핵심 진입 주소·현행 DTB 규칙이 잘못돼 별도 검색 없이 인계를 해결할 수준은 아니다. B≤13. |
| C | 6 | 133~139행 주소·158행 booti 인자·176~184행 debug 인자는 있지만 실제 보드·버전·실행 뒤 출력 없다. 241행90%·251행1024바이트는 무출처 수치로 C≤8, 절차·관찰 부족 때문에6. |
| D | 11 | ch18 320~345행은 EFI stub 인계 전 단계, ch20은 OTA로 구별. MR/part7-01-linux-boot-flow.md 37·58~61행↔27~30·145~165행 x0·DT chosen 인계가 겹치지만 MR은 특정 i.MX8MM/U-Boot v2025.04, 이 글은 ARM32·RISC-V·x86까지 모아 범용 ABI 질문이다. |
| E | 2 | 2행 ARM/ARM64로 한정했는데 5행 description·186~231행은 RISC-V/x86까지 포함. 루브릭 특정 아키텍처 제목과 본문 범위 불일치 E≤2 적용. |
| F | 6 | 266행 RAUC·SWUpdate 예고→ch20(20), 270·271행 ch18/ch20 관련 역할과 공개 상태가 맞다. 긴 아키텍처별 제목은 있으나 전제·실전 분기를 이 글 고유의 링크로 안내하지 않아 기본 구조 수준6. |
| G | 2 | 21·188행 문서명, 272~273행 공식 Linux 링크가 있지만 태그·ABI 적용 버전이 없다. 링크 하나는 옛 booting.txt이며 응답 전수 확인은 안 함. |

병합 대상 없음. 다음 조치 보강: 제목 범위를 정하고 ABI를 버전 고정 1차 자료로 다시 작성한다.

### `chapter20-rauc-swupdate.md`

source_file: `src/content/blog/embedded/bootloader/chapter20-rauc-swupdate.md`

- score_status: 잠정
- score: 50 (A11+B11+C6+D7+E7+F6+G2)
- confidence: 중간
- factcheck: 오류 확인
- anchor_ref: UART, Build
- blockers: P0 미발견. 기본 RAUC U-Boot backend 변수 계약 오류, kernel 슬롯과 boot script 파티션 불일치.
- uncertainties: 17행 YAML 지원, 196행 copy-1/copy-2 자동 비활성 슬롯 선택, 205~210행 signed archive 구성·포맷, 37행 조직·40행 Mongoose 버전, 249~252행 옵션은 미대조. 86·133행 단계 차이만을 원문 내부 모순으로 확정하지 않음.

| 항목 | evidence |
| --- | --- |
| A | 11 | 35~46·281~290행 비교/선택표와 298~303행 mark-good·키·reboot 함정은 있으나 정성적 ‘빠름·유연함’ 결론이 많고 직접 운영 근거 없다. |
| B | 11 | 비교→각 도구 설정·패키징·설치→U-Boot→선택·실수(33~313행)는 기본 흐름 완성. 65~83행 raw kernel slots와 258~262행 파일로 읽는 boot partition이 연결되지 않아 적용 예의 완결성이 낮다. B≤13. |
| C | 6 | 52~84행 system.conf, 111~114행 bundle, 152~207행 SWUpdate 구성·패키징, 247~273행 env는 따라 읽을 수 있다. 실제 버전·보드·성공 출력 없음, 주소·파일 크기 등을 실측으로 인정하지 않음. C≤8(환경 없는 예)·≤9(절차만) 중 엄격한8, 내용 평가는6. |
| D | 7 | ch17 81~109·255~280행↔133~146·247~275행 env·mark-good 반복. BR/chapter16-ota.md 43~56·75~151·166~202행↔35~46·52~114·152~193행 비교·RAUC 설정/manifest·SWUpdate bootenv 반복이 크다. 이 글의 독립 의도는 U-Boot 연동 계약이나 현재 예가 계약을 완결하지 못한다. |
| E | 7 | 2·5행 RAUC vs SWUpdate 비교·적용을 35~46·281~290행이 직접 다룬다. description의 U-Boot 통합은 243~275행에 있지만 동작 검증은 없다. |
| F | 6 | 317행 다음 Ch21/22 안내는 실제 seriesOrder21 포팅·22 debugging과 대응. 321행 ch17·322행 ch21은 제목과 해당 본문 역할·공개 상태가 맞다. 275·312행 Ch17 전제는 링크 없이 이름만 적어 기본6. |
| G | 2 | 323·324행 두 프로젝트 공식 문서는 있으나 release·개별 주장·slot 환경과 연결되지 않는다. |

병합 대상: `BR/chapter16-ota.md`(비교·패키징 중복). 우선 조치 해소 뒤 다음 조치는 U-Boot 계약 중심 보강이며, 중복 비교/manifest는 BR16으로 부분 병합한다.

## 시리즈 공통 문제와 검증 범위

- 명령·예상 출력에 보드·tool 버전·캡처 조건이 거의 없다(10편). 합리적인 설정 예에 숫자가 들어 있다는 이유로 수치 자체를 거짓이라고 하지는 않았지만 실측·환경 차이의 가점은 주지 않았다. 출처 없는 성능 수치가 명확한 ch11·12·19는 C≤8을 직접 적용했다.
- 확장하면서 앞뒤 동일 절이 반복된다(ch11 NFS, ch12 fastboot·UMS·uuu, ch16 FIT·서명·rollback, ch18 변수·서비스). 길이를 충분성의 대리 지표로 삼지 않았다.
- 관련 링크 라벨 과장은 ch11·12·14·15·16·17에서 남는다. 반대로 CI/양산, kernel ABI, EFI/Distro 비교처럼 실제 관련성이 있는 연결은 전문 키워드 미등장만으로 오답 처리하지 않았다.
- 전체 fact-check는 아니다. 1차 자료로 확인한 사실 오류만 위 표에 확정했고 다른 의심은 글별 uncertainties로 남겼다. ‘오류 확인’과 오류 건수는 구별했다.
- 원문·빌드 자산 변경 없음. 산술 재실행, 내부 링크 실제 목적지·공개 상태·순서 대조를 수행했다. 렌더·빌드·정책 도구는 직접 실행하지 않았다. 부모 공통 결과 [double-check-gates-2026-10-18.md](double-check-gates-2026-10-18.md)는 check/build/links/sitemap/ads/anchors/reading 모두 exit 0이며 링크 0 broken·reading 위반 0을 기록한다. 이 결과를 개별 사실 정확성 통과로 해석하지 않는다.

기계 합계 검증: 요약 표 10행의 A~G 합계와 score, 기존+차이, 글별 score 식의 일치를 스크립트로 검사한다. 각 행 최대점 및 B≤13·C≤8도 확인한다.
