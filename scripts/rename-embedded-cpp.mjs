#!/usr/bin/env node
// Rename Embedded C++ for Real Systems titles.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'embedded-cpp');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 0, '00-preface.md',                       'Embedded C++ for Real Systems — 임베디드 모던 C++ 시리즈 소개',                   '2026-04-28T09:00:00'],

  [ 1, 'part1-01-cpp-vs-c.md',                '임베디드 C++ vs C — 런타임·코드 크기·ABI 관점 비교',                              '2026-04-28T09:01:00'],
  [ 2, 'part1-02-compiler-flags.md',          '임베디드 C++ 컴파일러 플래그 분석 — -fno-rtti·-fno-exceptions·-Os',                '2026-04-28T09:02:00'],
  [ 3, 'part1-03-runtime-requirements.md',    '임베디드 C++ 런타임 요구사항 — libstdc++·newlib·crt0 분석',                        '2026-04-28T09:03:00'],
  [ 4, 'part1-04-code-size-analysis.md',      'C++ 코드 크기 분석 — 가상 함수·템플릿·예외 비용 추적',                              '2026-04-28T09:04:00'],
  [ 5, 'part1-05-abi-compatibility.md',       'C++ ABI 호환성 — Itanium ABI·name mangling·vtable 레이아웃',                       '2026-04-28T09:05:00'],
  [ 6, 'part1-06-startup-code.md',            'C++ 스타트업 코드 분석 — .init_array·전역 생성자 호출 순서',                       '2026-04-28T09:06:00'],
  [ 7, 'part1-07-linker-scripts.md',          '임베디드 C++ 링커 스크립트 — vtable·정적 객체 배치 추적',                          '2026-04-28T09:07:00'],
  [ 8, 'part1-08-cpp-standard-choice.md',     '임베디드 C++ 표준 선택 가이드 — C++11/14/17/20/23 트레이드오프',                    '2026-04-28T09:08:00'],

  [ 9, 'part2-01-raii-basics.md',             '임베디드 RAII 기초 — 리소스 안전성과 결정적 소멸 보장',                            '2026-04-29T09:09:00'],
  [10, 'part2-02-raii-patterns.md',           '임베디드 RAII 실전 패턴 — Lock·Pin·DMA·Power 관리',                                '2026-04-29T09:10:00'],
  [11, 'part2-03-constexpr-basics.md',        'constexpr 기초와 임베디드 적용 — 컴파일 타임 계산 활용',                            '2026-04-29T09:11:00'],
  [12, 'part2-04-constexpr-advanced.md',      'constexpr 고급 활용 — 룩업 테이블·CRC·해시 컴파일 타임 생성',                       '2026-04-29T09:12:00'],
  [13, 'part2-05-consteval-constinit.md',     'consteval과 constinit 분석 — C++20 컴파일 타임 강제 메커니즘',                       '2026-04-29T09:13:00'],
  [14, 'part2-06-templates-basics.md',        '임베디드 Templates 기초 — 타입 안전과 코드 재사용 분석',                            '2026-04-29T09:14:00'],
  [15, 'part2-07-templates-cost.md',          'Template 비용 분석 — 코드 폭증·인스턴스화·디버그 정보 측정',                        '2026-04-29T09:15:00'],
  [16, 'part2-08-static-polymorphism.md',     'CRTP 패턴 분석 — vtable 없는 정적 다형성',                                          '2026-04-29T09:16:00'],
  [17, 'part2-09-type-traits.md',             'Type Traits 임베디드 활용 — SFINAE·is_pod·컴파일 타임 검사',                        '2026-04-29T09:17:00'],
  [18, 'part2-10-concepts.md',                'C++20 Concepts 활용 — 템플릿 제약과 가독성 개선',                                    '2026-04-29T09:18:00'],

  [19, 'part3-01-no-dynamic-alloc.md',        '동적 할당 없는 임베디드 C++ — placement new·정적 객체·풀',                          '2026-04-30T09:19:00'],
  [20, 'part3-02-custom-allocator-basics.md', 'Custom Allocator 기초 — std::allocator 인터페이스 분석',                             '2026-04-30T09:20:00'],
  [21, 'part3-03-pool-allocator.md',          'Pool Allocator 구현 — Fixed-Size Block과 O(1) 보장',                                  '2026-04-30T09:21:00'],
  [22, 'part3-04-pmr.md',                     'std::pmr 임베디드 활용 — Polymorphic Memory Resource 분석',                          '2026-04-30T09:22:00'],
  [23, 'part3-05-no-exception-design.md',     'No-Exception C++ 설계 — 코드 크기·결정성 트레이드오프',                              '2026-04-30T09:23:00'],
  [24, 'part3-06-error-handling-patterns.md', '임베디드 에러 처리 패턴 — Result·errno·optional 비교',                                '2026-04-30T09:24:00'],
  [25, 'part3-07-expected.md',                'std::expected 분석 — C++23 결과 타입과 에러 전파',                                    '2026-04-30T09:25:00'],
  [26, 'part3-08-no-rtti-design.md',          'No-RTTI C++ 설계 — dynamic_cast 제거와 정적 타입 분기',                               '2026-04-30T09:26:00'],
  [27, 'part3-09-smart-pointer-choice.md',    '임베디드 스마트 포인터 선택 — unique·shared·custom 비교',                            '2026-04-30T09:27:00'],
  [28, 'part3-10-ownership-model.md',         '임베디드 C++ 소유권 모델 — single·shared·borrow 패턴',                                '2026-04-30T09:28:00'],

  [29, 'part4-01-intrusive-containers.md',    'Intrusive Containers 분석 — 동적 할당 없는 컨테이너 설계',                            '2026-05-01T09:29:00'],
  [30, 'part4-02-etl-library.md',             'ETL 라이브러리 분석 — Embedded Template Library의 STL 대체',                          '2026-05-01T09:30:00'],
  [31, 'part4-03-lock-free-basics.md',        '임베디드 Lock-free 기초 — atomic·memory ordering·CAS',                                '2026-05-01T09:31:00'],
  [32, 'part4-04-lock-free-container.md',     'Lock-free Container 구현 — SPSC Queue·Ring Buffer',                                   '2026-05-01T09:32:00'],
  [33, 'part4-05-type-safe-flags.md',         'Type-safe Flags 패턴 — Enum Class·Strong Typedef·Tag',                                '2026-05-01T09:33:00'],
  [34, 'part4-06-state-machine.md',           '임베디드 State Machine 패턴 — Variant·Visitor·Table-driven 비교',                     '2026-05-01T09:34:00'],
  [35, 'part4-07-compile-time-fsm.md',        'Compile-time FSM 구현 — 템플릿으로 상태 전이 검증',                                    '2026-05-01T09:35:00'],
  [36, 'part4-08-singleton-alternatives.md',  'Singleton 대안 패턴 — Service Locator·Static Init·Phantom',                            '2026-05-01T09:36:00'],

  [37, 'part5-01-register-abstraction.md',    'MMIO Register 추상화 — 타입 안전한 비트 필드 접근',                                    '2026-05-02T09:37:00'],
  [38, 'part5-02-gpio-abstraction.md',        'GPIO 추상화 패턴 — Template·Concept으로 보드 독립성',                                  '2026-05-02T09:38:00'],
  [39, 'part5-03-peripheral-abstraction.md',  'Peripheral 추상화 — UART·SPI·I2C 공통 인터페이스 설계',                                '2026-05-02T09:39:00'],
  [40, 'part5-04-hal-design-patterns.md',     '임베디드 HAL 설계 패턴 — Static·Dynamic·Hybrid 비교',                                  '2026-05-02T09:40:00'],
];

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;

  let newFm = fm;
  newFm = newFm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`);
  newFm = newFm.replace(/^date:\s*.*$/m, `date: ${newDate}`);

  if (!/^title:/m.test(newFm) || !/^date:/m.test(newFm)) {
    throw new Error(`missing title/date after replace: ${filePath}`);
  }

  const out = `---\n${newFm}\n---\n${body}`;
  if (!DRY) writeFileSync(filePath, out);
}

let count = 0;
for (const [order, file, title, date] of PLAN) {
  const path = join(DIR, file);
  console.log(`[${order.toString().padStart(2)}] ${file}`);
  console.log(`     → ${title}`);
  console.log(`     → date: ${date}`);
  applyEdit(path, title, date);
  count++;
}
console.log(`\n${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
