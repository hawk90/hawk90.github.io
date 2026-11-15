# Embedded C++ Part 2 수정 루프 — 2026-10-22

재채점 전 원문 수정 기록입니다. 기존 점수·판정·factcheck 파일은 변경하지 않았습니다. 근거표는 published-loop-13.md(01~05), published-loop-14.md(06~10)를 읽어 참고했습니다. chapter별 전문을 읽고 확인한 오류와 실행 실패를 수정했으며 공개 URL·날짜·seriesOrder·발행 상태를 보존했습니다.

환경: Homebrew Clang 23.1.3, arm64-apple-darwin25.6.0, Node24.21.0. C++17(01/02/03/06/07/09), C++20(04/08/10), C++23 + -fno-exceptions(05). 보드/RTOS 성능 실험이 아닌 호스트 언어 계약·알고리즘 검사입니다.

공통 검증: `node scripts/verify-embedded-cpp-part2-examples.mjs NN` 10편 성공, 대상 publish gate blocking0, inline-math0. 전체 사이트 빌드·렌더 검사는 parent 통합 작업으로 넘깁니다.

## Part 2-01 — part2-01-raii-basics.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-01-raii-basics.md`. 기존 평가표 loop13의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: 획득 실패와 종료 경로를 무시한 소멸 보장·mutex release와 혼합 DMA API가 실행 가능한 공통 예처럼 제시됨. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: 보드 없는 호스트에서 추측한 STM32 DMA 구현을 고치기보다 불완전 코드 제거 후 하드웨어 계약을 명시; CMSIS mutex 성공 상태만 보호.
4. **증거**: CMSIS-RTOS2 acquire(id,timeout)→osOK 계약 및 stmt.dcl scope 규칙. 관찰: 정상 return·이동·실패 소유권 없음에서 정리 횟수 확인, 복사 컴파일 거부. [실행 로그](./embedded-cpp-part2-01-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. 실제 RTOS mutex 획득·UART TC·clock 공유·DMA 취소·PRIMASK의 보드 실행은 미검증. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `08a33a33e4c49e56c622d6970ce94d88fc194b09f937327414c811c542103049`, after `4d8b4d93143405ac7a697c414814b7ee3e749e0b1eb458996402c0d16cf3325d`.

## Part 2-02 — part2-02-raii-patterns.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-02-raii-patterns.md`. 기존 평가표 loop13의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: FINALLY의 ## 결합 때문에 같은 scope의 두 선언 충돌; 획득 실패 처리 및 비트폭 고정 설명 누락. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: 변수명 생성 2단계 확장으로 최소 수정; 미검증 zero-cost 명령과 고정 8/4B 수치 제거.
4. **증거**: cpp.concat, Core Guidelines E.19; 본문에서 추출한 scope-check.cpp. 관찰: 서로 다른 두 줄 정리 1+2=3·dismiss시 변화없음, 원 단일 단계 매크로 재정의 컴파일 실패. [실행 로그](./embedded-cpp-part2-02-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. 실제 FreeRTOS mutex·UART peripheral·lock 성능·deleter ABI 크기는 미측정. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `aeaf33470218a90bce7e3a42e210e863e19e4908910e24bfb1eeb7db0fc9a952`, after `55a2e3b2a9f2c99c21bec6ee98f85cfec95b5d3e8a21b2ddc512c54827ff82a4`.

## Part 2-03 — part2-03-constexpr-basics.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-03-constexpr-basics.md`. 기존 평가표 loop13의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: constexpr 없는 호출도 상수 접기 가능; sin 범위 축소 생략; 근거 없는 STM32 크기·시간·지원률. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: 상수 평가 의무와 최적화를 구분하고 직접 재현하는 CRC/sin 코드로 근거 대체.
4. **증거**: N4861 expr.const, Clang23.1.3 c++17 호스트 실행. 관찰: CRC-32 기준 0xcbf43926 상수식, sin256개 표본 1e-8미만, 기존 범위 미축소7항은 0.1초과오차 존재. [실행 로그](./embedded-cpp-part2-03-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능. description에서 미측정 -Os 비교 약속을 장 단위로 정정했습니다.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. 모든 실수 입력 오차·Flash/RAM 배치·MCU 시작 시간·C++26 라이브러리 지원은 검증하지 않음. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `6e79ace97c8d89ad6aaeb82f8946f0bfd707e5495b2a2cd384c9ce045fbffa1d`, after `c08908dfa5f0fad1df119fbf031f5a4277be48eab35b6b046d3ffa5ed64de3d1`.

## Part 2-04 — part2-04-constexpr-advanced.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-04-constexpr-advanced.md`. 기존 평가표 loop13의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: 32×2048<=65536은 통과하는데 실패라고 설명; 빈 bubble sort underflow; 제목 CRC약속·find_irq빈함수. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: 상한 초과 입력을33으로 정정, 반복 경계와 검색stub 완성, 본문에 없는 CRC는 제목에서 정정.
4. **증거**: N4861 alg.sort 및 expr.const, c++20 표본. 관찰: 빈 배열 정렬 및 표준constexpr sort 성공, TASKS32 성공33 static_assert 실패. [실행 로그](./embedded-cpp-part2-04-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능. 제목에서 본문에 없는 CRC 약속을 검색으로 장 단위 정정했습니다.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. 큰 N int 인덱스는 범위 전제; 보드 배치·부트 시간 미검증; hash충돌은 원문 비교 필요. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `2b74a33650b05dc87f250e6efe3ac193361feef568b9c4921f6503ed3db6aa4a`, after `d24fe778c8aa315c5a73fc4956716ad764493134d4ca084d4aa713c445e7721d`.

## Part 2-05 — part2-05-consteval-constinit.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-05-consteval-constinit.md`. 기존 평가표 loop13의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: consteval transient 할당 불가·일반 constexpr함수 전파·constinit 전역 전체 초기화 해결의 과장. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: 비constexpr 오류 경로로 throw없는 설정검증, if consteval 분기로 평가문맥명시, constinit 동적초기화 차단범위명시.
4. **증거**: N4861 expr.const, dcl.constinit, P1938R3. 관찰: fno-exceptions c++23 정상실행, transient new/delete static_assert, BAD_PIN/BAD_INIT 컴파일 거부. [실행 로그](./embedded-cpp-part2-05-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. C++23예제와 C++20 transient허용을 구분; MCU .data 복사와 다른 전역 초기화 순서는 미검증. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `609c992508f60ddd11e8a4426148ca890a42c1e2aeb52da3a3aae7f071458092`, after `6769b126319259df9a737b38c87e0bc567bf79b308fa625586981c3fcc551600`.

## Part 2-06 — part2-06-templates-basics.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-06-templates-basics.md`. 기존 평가표 loop14의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: Ring N-1용량·동시접근 제한 누락, 가변인자이름조회실패가능, 비표준itoa/ftoa, 근거없는크기합계. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: 호스트 Ring완전예제와 타입제약 추가; 정의순서와 snprintf실패경로 보강; 실측없는바이트표제거.
4. **증거**: N4861 temp.inst 및 clang c++17 실행. 관찰: empty/full·wraparound·FIFO실행, N3 컴파일거부. [실행 로그](./embedded-cpp-part2-06-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. UART송신·GPIO MMIO·ISR/태스크동시성·fmt/format라이브러리 크기는 미검증. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `66073fbd9c601d1e32c742187fc9444c7b4d88b245b1aea5934e60e0e373ba5a`, after `4a274b4bca59c0210eb309907a3cf9a4fc0ce8d99c0b9aa139c15ee32105c145`.

## Part 2-07 — part2-07-templates-cost.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-07-templates-cost.md`. 기존 평가표 loop14의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: nm합계 오류·variant코드한번·메시지__PRETTY_FUNCTION__·근거없는PCH/unity절감률. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: 합계3328로 정정하고 예시출력표시; 실측프로젝트수치제거; buffer포인터복사금지 및 표준메시지.
4. **증거**: temp.explicit 및 c++17 두TU 링크. 관찰: extern template 제공TU포함 정상42, 누락시 undefined symbol 링크실패. [실행 로그](./embedded-cpp-part2-07-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. Flash절감·빌드속도·디버그정보 수치는 실제 프로젝트 자료가 없어 미측정. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `8cdeb82299a4576ebcb1b0567208b9fa2adf215f37a2864f8667e531698bd0b4`, after `dfafde8c7cbaf678b593359c13f32ce7afe6afae732bd899000545efd2971fa1`.

## Part 2-08 — part2-08-static-polymorphism.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-08-static-polymorphism.md`. 기존 평가표 loop14의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: 불완전Derived에concept검사하면 정상구현실패; 비virtual base삭제를단순누수로설명; vptr크기고정. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: concept검사를 완성후 멤버호출시점으로 연기; private base생성/소멸과 friendDerived로 소유계약 예시.
4. **증거**: expr.delete·temp.constr.atomic, c++20 호스트. 관찰: 정상CRTP호출 및 호출수1; base독립객체/BAD_DELETE 접근거부. [실행 로그](./embedded-cpp-part2-08-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. 실제MCU성능·vtable바이트·그림의 devirtualization 미표시경로는 별도; 설명용asm은측정아님. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `1a9511fafeaca100b29d1e31d761d13f04654ec8e75020bf0f70c98417b854d9`, after `a7ad0c1ebc94208f5c858543a4feb27ca733b671320937be9325f6b1ac94978a`.

## Part 2-09 — part2-09-type-traits.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-09-type-traits.md`. 기존 평가표 loop14의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: C타입분기불가·scalar범위누락·모든템플릿실패SFINAE포괄·triviallycopyable의MMIO/wire안전과장. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: immediate context 후보제외와본문분기구분; unsigned비트추출과is_pod대체계약보강.
4. **증거**: N4861 meta.unary.cat·temp.deduct, c++17 호스트. 관찰: ready반환bool정확검출, nullptr/memberpointer scalar, uint16+signed-2 bigendian, bool컴파일거부. [실행 로그](./embedded-cpp-part2-09-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. MMIO주소·폭·접근부작용/외부바이트유효성은trait로증명불가; 동시성·성능미측정. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `35df127268b0cd43beec239b6e07190df9939499a5f2254a8f0075ce04ec5265`, after `5c3a78d332c7e9d49bf00e39da2c68b048230380f6c440a118acb76e5244a646`.

## Part 2-10 — part2-10-concepts.md

1. **맥락·범위**: 공개 글 `src/content/blog/embedded/embedded-cpp/part2-10-concepts.md`. 기존 평가표 loop14의 기술 의문을 확인했습니다.
2. **신호·반증 조건**: class template concept제약은Incomplete 정상Derived도거부; 임의trivial memcpy·concept우선순위/속도단정. 전제가 맞는 설명용 fragment는 유지하되 standalone/측정 결과로 주장하지 않음.
3. **원인·대안**: 멤버호출시점제약; 외부byte복사fallback바이트배열로제한; subsumption표현과제약범위정정.
4. **증거**: temp.constr.atomic·temp.constr.order, c++20 호스트. 관찰: Good정상호출·Bad호출제약거부, 원class제약으로되돌리면Good도실패, integral선택static_assert. [실행 로그](./embedded-cpp-part2-10-examples.log).
5. **표본**: 장 전문, 본문 titled 실행예, 해당 실패경계; 관찰일2026-10-22. MCU/RTOS 실행으로 일반화하지 않습니다.
6. **결정**: `remediated` — 원문의 오류와 검증 경로를 수정합니다. 재채점은 수행하지 않았습니다.
7. **안전 변경**: slug/date/draft/series/order/tags/topics 보존; 해당 장 diff만 롤백 가능.
8. **검증·잔여 위험**: 전용 verifier exit0, 통합 gate blocking0, inline math0. 범위concept만으로연산유효성/overflow보장불가; 컴파일속도·진단줄수·MCU실행미측정. 재검토 시점은 실제 대상 보드·toolchain으로 적용하기 전입니다.

SHA256: before `1cb0d4ec3685bc172be0684917c24e84458036b4595d5c1795b2fd141791e621`, after `a161ab84e55504ea18177539eb0835582942e5fe49282b79b434999317ae5773`.

