const bookLine = (name, weight, line) => ({ name, weight, line });

const OPEN_GAME_LINES = [
  bookLine('루이 로페즈 - 클로즈드 메인라인', 3, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f8e7', 'f1e1', 'b7b5', 'a4b3', 'd7d6', 'c2c3', 'e8g8', 'h2h3',
  ]),
  bookLine('루이 로페즈 - 베를린 디펜스', 3, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'g8f6', 'e1g1', 'f6e4', 'd2d4', 'e4d6', 'b5c6', 'd7c6', 'd4e5', 'd6f5',
  ]),
  bookLine('루이 로페즈 - 익스체인지 바리에이션', 2, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5c6', 'd7c6', 'd2d4', 'e5d4', 'd1d4',
  ]),
  bookLine('루이 로페즈 - 오픈 디펜스', 2, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f6e4', 'd2d4', 'b7b5', 'a4b3', 'd7d5',
  ]),
  bookLine('이탈리안 게임 - 지우오코 피아니시모', 3, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'd7d6', 'e1g1', 'e8g8', 'f1e1', 'a7a6',
  ]),
  bookLine('이탈리안 게임 - 지우오코 피아노', 2, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d4', 'e5d4', 'c3d4', 'c5b4', 'b1c3',
  ]),
  bookLine('에반스 갬빗', 2, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'b2b4', 'c5b4', 'c2c3', 'b4a5', 'd2d4', 'e5d4', 'e1g1',
  ]),
  bookLine('투 나이츠 디펜스', 2, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'd2d3', 'f8c5', 'c2c3', 'd7d6', 'e1g1', 'e8g8',
  ]),
  bookLine('프라이드 리버 어택', 1, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'f3g5', 'd7d5', 'e4d5', 'f6d5', 'g5f7', 'e8f7', 'd1f3',
  ]),
  bookLine('스카치 게임 - 클래시컬', 2, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4', 'e5d4', 'f3d4', 'f8c5', 'c2c3', 'g8f6',
  ]),
  bookLine('포 나이츠 게임 - 스카치 포크', 2, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'b1c3', 'g8f6', 'd2d4', 'e5d4', 'f3d4', 'f8b4',
  ]),
  bookLine('비엔나 게임', 2, [
    'e2e4', 'e7e5', 'b1c3', 'g8f6', 'f2f4', 'd7d5', 'f4e5', 'f6e4', 'd2d3',
  ]),
  bookLine('킹스 갬빗 억셉티드', 1, [
    'e2e4', 'e7e5', 'f2f4', 'e5f4', 'g1f3', 'g7g5', 'h2h4', 'g5g4', 'f3e5',
  ]),
  bookLine('비숍스 오프닝', 1, [
    'e2e4', 'e7e5', 'f1c4', 'g8f6', 'd2d3', 'c7c6', 'g1f3', 'd7d5',
  ]),
  bookLine('폰지아니 오프닝', 1, [
    'e2e4', 'e7e5', 'g1f3', 'b8c6', 'c2c3', 'g8f6', 'd2d4', 'f6e4', 'd4d5',
  ]),
  bookLine('페트로프 디펜스 - 메인라인', 2, [
    'e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3e5', 'd7d6', 'e5f3', 'f6e4', 'd2d4', 'd6d5',
  ]),
  bookLine('필리도르 디펜스', 1, [
    'e2e4', 'e7e5', 'g1f3', 'd7d6', 'd2d4', 'g8f6', 'b1c3', 'b8d7', 'f1c4', 'f8e7',
  ]),
];

const SICILIAN_LINES = [
  bookLine('시실리안 - 나이도프 메인라인', 3, [
    'e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6', 'c1g5', 'e7e6', 'f2f4', 'f8e7', 'd1f3',
  ]),
  bookLine('시실리안 - 나이도프 잉글리시 어택', 3, [
    'e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6', 'c1e3', 'e7e5', 'd4b3', 'c8e6', 'f2f3',
  ]),
  bookLine('시실리안 - 나이도프 아담스 어택', 2, [
    'e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6', 'h2h3', 'e7e5', 'd4f3',
  ]),
  bookLine('시실리안 - 드래곤 유고슬라브 어택', 3, [
    'e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'g7g6', 'c1e3', 'f8g7', 'f2f3', 'e8g8', 'd1d2', 'b8c6', 'f1c4',
  ]),
  bookLine('시실리안 - 액셀러레이티드 드래곤', 2, [
    'e2e4', 'c7c5', 'g1f3', 'b8c6', 'd2d4', 'c5d4', 'f3d4', 'g7g6', 'c2c4', 'f8g7', 'b1c3',
  ]),
  bookLine('시실리안 - 클래시컬', 2, [
    'e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'b8c6', 'c1g5', 'e7e6', 'd1d2',
  ]),
  bookLine('시실리안 - 셰베닝겐 잉글리시 어택', 2, [
    'e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'e7e6', 'c1e3', 'a7a6', 'f2f3', 'b7b5', 'd1d2',
  ]),
  bookLine('시실리안 - 타이마노프', 2, [
    'e2e4', 'c7c5', 'g1f3', 'e7e6', 'd2d4', 'c5d4', 'f3d4', 'b8c6', 'b1c3', 'd8c7', 'c1e3', 'a7a6', 'd1d2',
  ]),
  bookLine('시실리안 - 칸 바리에이션', 2, [
    'e2e4', 'c7c5', 'g1f3', 'e7e6', 'd2d4', 'c5d4', 'f3d4', 'a7a6', 'f1d3', 'b8c6', 'e1g1', 'd8c7',
  ]),
  bookLine('시실리안 - 스베시니코프', 2, [
    'e2e4', 'c7c5', 'g1f3', 'b8c6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'e7e5', 'd4b5', 'd7d6', 'c1g5', 'a7a6', 'b5a3', 'b7b5',
  ]),
  bookLine('시실리안 - 로솔리모 어택', 2, [
    'e2e4', 'c7c5', 'g1f3', 'b8c6', 'f1b5', 'g7g6', 'e1g1', 'f8g7', 'f1e1', 'e7e5', 'c2c3',
  ]),
  bookLine('시실리안 - 모스코 바리에이션', 2, [
    'e2e4', 'c7c5', 'g1f3', 'd7d6', 'f1b5', 'c8d7', 'b5d7', 'd8d7', 'e1g1', 'g8f6',
  ]),
  bookLine('알라핀 시실리안', 2, [
    'e2e4', 'c7c5', 'c2c3', 'd7d5', 'e4d5', 'd8d5', 'd2d4', 'g8f6', 'g1f3',
  ]),
  bookLine('스미스-모라 갬빗', 1, [
    'e2e4', 'c7c5', 'd2d4', 'c5d4', 'c2c3', 'd4c3', 'b1c3', 'b8c6', 'g1f3', 'd7d6', 'f1c4',
  ]),
  bookLine('클로즈드 시실리안', 2, [
    'e2e4', 'c7c5', 'b1c3', 'b8c6', 'g2g3', 'g7g6', 'f1g2', 'f8g7', 'd2d3', 'd7d6', 'f2f4',
  ]),
  bookLine('그랑프리 어택', 2, [
    'e2e4', 'c7c5', 'b1c3', 'b8c6', 'f2f4', 'g7g6', 'g1f3', 'f8g7', 'f1b5',
  ]),
  bookLine('윙 갬빗 대 시실리안', 1, [
    'e2e4', 'c7c5', 'b2b4', 'c5b4', 'a2a3', 'b4a3', 'b1a3',
  ]),
  bookLine('하이퍼 액셀러레이티드 드래곤', 1, [
    'e2e4', 'c7c5', 'g1f3', 'g7g6', 'd2d4', 'c5d4', 'f3d4', 'f8g7', 'c2c4', 'b8c6',
  ]),
];

const FRENCH_LINES = [
  bookLine('프렌치 디펜스 - 위나워', 3, [
    'e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'f8b4', 'e4e5', 'c7c5', 'a2a3', 'b4c3', 'b2c3', 'g8e7',
  ]),
  bookLine('프렌치 디펜스 - 클래시컬', 2, [
    'e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'g8f6', 'c1g5', 'f8e7', 'e4e5', 'f6d7',
  ]),
  bookLine('프렌치 디펜스 - 타라시', 2, [
    'e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1d2', 'c7c5', 'e4d5', 'e6d5', 'g1f3', 'b8c6',
  ]),
  bookLine('프렌치 디펜스 - 어드밴스', 2, [
    'e2e4', 'e7e6', 'd2d4', 'd7d5', 'e4e5', 'c7c5', 'c2c3', 'b8c6', 'g1f3', 'd8b6',
  ]),
  bookLine('프렌치 디펜스 - 익스체인지', 1, [
    'e2e4', 'e7e6', 'd2d4', 'd7d5', 'e4d5', 'e6d5', 'f1d3', 'b8c6', 'c2c3', 'f8d6',
  ]),
  bookLine('프렌치 디펜스 - 루빈스타인', 1, [
    'e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'b8d7', 'g1f3', 'g8f6',
  ]),
  bookLine('프렌치 대 킹스 인디언 어택', 1, [
    'e2e4', 'e7e6', 'd2d3', 'd7d5', 'b1d2', 'g8f6', 'g1f3', 'c7c5', 'g2g3', 'b8c6',
  ]),
];

const CARO_KANN_LINES = [
  bookLine('카로칸 디펜스 - 클래시컬 카파블랑카', 3, [
    'e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'c8f5', 'e4g3', 'f5g6', 'h2h4', 'h7h6', 'g1f3', 'b8d7',
  ]),
  bookLine('카로칸 디펜스 - 어드밴스', 2, [
    'e2e4', 'c7c6', 'd2d4', 'd7d5', 'e4e5', 'c8f5', 'g1f3', 'e7e6', 'f1e2', 'c6c5', 'e1g1', 'b8c6',
  ]),
  bookLine('카로칸 디펜스 - 파노프 보트비니크 어택', 2, [
    'e2e4', 'c7c6', 'd2d4', 'd7d5', 'e4d5', 'c6d5', 'c2c4', 'g8f6', 'b1c3', 'e7e6', 'g1f3',
  ]),
  bookLine('카로칸 디펜스 - 판타지 바리에이션', 1, [
    'e2e4', 'c7c6', 'd2d4', 'd7d5', 'f2f3', 'd5e4', 'f3e4', 'e7e5', 'g1f3',
  ]),
  bookLine('카로칸 디펜스 - 투 나이츠', 1, [
    'e2e4', 'c7c6', 'b1c3', 'd7d5', 'g1f3', 'c8g4', 'h2h3', 'g4f3', 'd1f3',
  ]),
  bookLine('카로칸 디펜스 - 익스체인지', 1, [
    'e2e4', 'c7c6', 'd2d4', 'd7d5', 'e4d5', 'c6d5', 'f1d3', 'b8c6', 'c2c3', 'g8f6', 'c1f4',
  ]),
];

const OTHER_E4_LINES = [
  bookLine('스칸디나비안 디펜스 - 메인라인', 2, [
    'e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5a5', 'd2d4', 'g8f6', 'g1f3', 'c7c6',
  ]),
  bookLine('스칸디나비안 디펜스 - 포르투기즈 감빗형', 1, [
    'e2e4', 'd7d5', 'e4d5', 'g8f6', 'd2d4', 'c8g4', 'f1e2', 'g4e2', 'd1e2', 'd8d5',
  ]),
  bookLine('알레힌 디펜스', 2, [
    'e2e4', 'g8f6', 'e4e5', 'f6d5', 'd2d4', 'd7d6', 'g1f3', 'g7g6', 'c2c4', 'd5b6',
  ]),
  bookLine('피르크 디펜스 - 오스트리안 어택', 2, [
    'e2e4', 'd7d6', 'd2d4', 'g8f6', 'b1c3', 'g7g6', 'f2f4', 'f8g7', 'g1f3', 'e8g8', 'f1d3',
  ]),
  bookLine('피르크 디펜스 - 150 어택', 2, [
    'e2e4', 'd7d6', 'd2d4', 'g8f6', 'b1c3', 'g7g6', 'c1e3', 'f8g7', 'd1d2', 'e8g8', 'f2f3',
  ]),
  bookLine('모던 디펜스', 1, [
    'e2e4', 'g7g6', 'd2d4', 'f8g7', 'b1c3', 'd7d6', 'g1f3', 'a7a6', 'a2a4', 'b8d7',
  ]),
  bookLine('오언 디펜스', 1, [
    'e2e4', 'b7b6', 'd2d4', 'c8b7', 'f1d3', 'e7e6', 'g1f3', 'g8f6',
  ]),
  bookLine('님초비치 디펜스', 1, [
    'e2e4', 'b8c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'd4d5', 'c6e5',
  ]),
];

const QUEENS_GAMBIT_LINES = [
  bookLine('퀸즈 갬빗 디클라인드 - 오소독스', 3, [
    'd2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5', 'f8e7', 'e2e3', 'e8g8', 'g1f3', 'b8d7',
  ]),
  bookLine('퀸즈 갬빗 디클라인드 - 익스체인지', 2, [
    'd2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c4d5', 'e6d5', 'c1g5', 'f8e7', 'e2e3',
  ]),
  bookLine('퀸즈 갬빗 디클라인드 - 타르타코워 시스템', 2, [
    'd2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'g1f3', 'f8e7', 'c1g5', 'e8g8', 'e2e3', 'b7b6',
  ]),
  bookLine('퀸즈 갬빗 디클라인드 - 케임브리지 스프링스', 2, [
    'd2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5', 'b8d7', 'e2e3', 'c7c6', 'g1f3', 'd8a5',
  ]),
  bookLine('퀸즈 갬빗 억셉티드', 2, [
    'd2d4', 'd7d5', 'c2c4', 'd5c4', 'g1f3', 'g8f6', 'e2e3', 'e7e6', 'f1c4', 'c7c5', 'e1g1', 'a7a6',
  ]),
  bookLine('슬라브 디펜스 - 메인라인', 3, [
    'd2d4', 'd7d5', 'c2c4', 'c7c6', 'b1c3', 'g8f6', 'g1f3', 'd5c4', 'a2a4', 'c8f5',
  ]),
  bookLine('슬라브 디펜스 - 익스체인지', 1, [
    'd2d4', 'd7d5', 'c2c4', 'c7c6', 'c4d5', 'c6d5', 'b1c3', 'g8f6', 'c1f4', 'b8c6',
  ]),
  bookLine('세미슬라브 디펜스 - 메란 구조', 2, [
    'd2d4', 'd7d5', 'c2c4', 'c7c6', 'b1c3', 'g8f6', 'g1f3', 'e7e6', 'e2e3', 'b8d7', 'f1d3', 'd5c4', 'd3c4', 'b7b5',
  ]),
  bookLine('런던 시스템', 2, [
    'd2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4', 'e7e6', 'e2e3', 'f8d6', 'f4g3', 'e8g8',
  ]),
  bookLine('조바바 런던', 1, [
    'd2d4', 'd7d5', 'b1c3', 'g8f6', 'c1f4', 'e7e6', 'e2e3', 'c7c5', 'c3b5',
  ]),
  bookLine('콜레 시스템', 1, [
    'd2d4', 'd7d5', 'g1f3', 'g8f6', 'e2e3', 'e7e6', 'f1d3', 'c7c5', 'c2c3', 'b8c6', 'b1d2',
  ]),
  bookLine('카탈란 - 클로즈드', 2, [
    'd2d4', 'g8f6', 'c2c4', 'e7e6', 'g2g3', 'd7d5', 'f1g2', 'f8e7', 'g1f3', 'e8g8', 'e1g1',
  ]),
  bookLine('카탈란 - 오픈', 2, [
    'd2d4', 'g8f6', 'c2c4', 'e7e6', 'g2g3', 'd7d5', 'f1g2', 'd5c4', 'g1f3', 'a7a6', 'e1g1', 'b7b5',
  ]),
  bookLine('트롬포브스키 어택', 1, [
    'd2d4', 'g8f6', 'c1g5', 'e7e6', 'e2e4', 'h7h6', 'g5f6', 'd8f6', 'b1c3',
  ]),
  bookLine('토레 어택', 1, [
    'd2d4', 'g8f6', 'g1f3', 'e7e6', 'c1g5', 'd7d5', 'e2e3', 'f8e7', 'b1d2', 'e8g8',
  ]),
  bookLine('베레소프 어택', 1, [
    'd2d4', 'g8f6', 'b1c3', 'd7d5', 'c1g5', 'b8d7', 'e2e3', 'c7c6',
  ]),
  bookLine('치고린 디펜스', 1, [
    'd2d4', 'd7d5', 'c2c4', 'b8c6', 'b1c3', 'g8f6', 'g1f3', 'c8g4',
  ]),
  bookLine('알빈 카운터갬빗', 1, [
    'd2d4', 'd7d5', 'c2c4', 'e7e5', 'd4e5', 'd5d4', 'g1f3', 'b8c6',
  ]),
  bookLine('블랙마-디머 갬빗', 1, [
    'd2d4', 'd7d5', 'e2e4', 'd5e4', 'b1c3', 'g8f6', 'f2f3',
  ]),
  bookLine('스톤월 어택', 1, [
    'd2d4', 'd7d5', 'e2e3', 'g8f6', 'f2f4', 'e7e6', 'g1f3', 'f8d6', 'f1d3',
  ]),
  bookLine('퀸즈 폰 게임 - 콜레 주커토트', 1, [
    'd2d4', 'd7d5', 'g1f3', 'g8f6', 'e2e3', 'e7e6', 'b2b3', 'f8d6', 'c1b2',
  ]),
  bookLine('배리 어택', 1, [
    'd2d4', 'g8f6', 'g1f3', 'g7g6', 'b1c3', 'd7d5', 'c1f4', 'f8g7', 'e2e3',
  ]),
];

const INDIAN_DEFENCE_LINES = [
  bookLine('킹스 인디언 디펜스 - 클래시컬', 3, [
    'd2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7', 'e2e4', 'd7d6', 'g1f3', 'e8g8', 'f1e2', 'e7e5', 'e1g1', 'b8c6',
  ]),
  bookLine('킹스 인디언 디펜스 - 자믹', 2, [
    'd2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7', 'e2e4', 'd7d6', 'f2f3', 'e8g8', 'c1e3', 'e7e5', 'g1e2',
  ]),
  bookLine('킹스 인디언 디펜스 - 피앙케토', 2, [
    'd2d4', 'g8f6', 'c2c4', 'g7g6', 'g1f3', 'f8g7', 'g2g3', 'e8g8', 'f1g2', 'd7d6', 'e1g1',
  ]),
  bookLine('그륀펠트 디펜스 - 익스체인지', 3, [
    'd2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'd7d5', 'c4d5', 'f6d5', 'e2e4', 'd5c3', 'b2c3', 'f8g7',
  ]),
  bookLine('그륀펠트 디펜스 - 러시안 시스템', 2, [
    'd2d4', 'g8f6', 'c2c4', 'g7g6', 'g1f3', 'f8g7', 'b1c3', 'd7d5', 'd1b3', 'd5c4', 'b3c4', 'e8g8',
  ]),
  bookLine('님조 인디언 - 루빈스타인 시스템', 3, [
    'd2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4', 'e2e3', 'e8g8', 'f1d3', 'd7d5', 'g1f3', 'c7c5',
  ]),
  bookLine('님조 인디언 - 클래시컬', 2, [
    'd2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4', 'd1c2', 'e8g8', 'a2a3', 'b4c3', 'c2c3',
  ]),
  bookLine('보고 인디언', 1, [
    'd2d4', 'g8f6', 'c2c4', 'e7e6', 'g1f3', 'f8b4', 'c1d2', 'd8e7', 'g2g3',
  ]),
  bookLine('퀸즈 인디언', 2, [
    'd2d4', 'g8f6', 'c2c4', 'e7e6', 'g1f3', 'b7b6', 'g2g3', 'c8b7', 'f1g2', 'f8e7', 'e1g1', 'e8g8',
  ]),
  bookLine('모던 베노니', 2, [
    'd2d4', 'g8f6', 'c2c4', 'c7c5', 'd4d5', 'e7e6', 'b1c3', 'e6d5', 'c4d5', 'd7d6', 'e2e4', 'g7g6',
  ]),
  bookLine('벤코 갬빗', 1, [
    'd2d4', 'g8f6', 'c2c4', 'c7c5', 'd4d5', 'b7b5', 'c4b5', 'a7a6', 'b5a6', 'g7g6',
  ]),
  bookLine('부다페스트 갬빗', 1, [
    'd2d4', 'g8f6', 'c2c4', 'e7e5', 'd4e5', 'f6g4', 'g1f3', 'b8c6',
  ]),
  bookLine('올드 인디언 디펜스', 1, [
    'd2d4', 'g8f6', 'c2c4', 'd7d6', 'b1c3', 'e7e5', 'g1f3', 'b8d7', 'e2e4',
  ]),
  bookLine('체크 베노니', 1, [
    'd2d4', 'g8f6', 'c2c4', 'c7c5', 'd4d5', 'e7e5', 'b1c3', 'd7d6', 'e2e4', 'g7g6',
  ]),
  bookLine('더치 디펜스 - 레닌그라드', 2, [
    'd2d4', 'f7f5', 'g2g3', 'g8f6', 'f1g2', 'g7g6', 'g1f3', 'f8g7', 'e1g1', 'e8g8', 'c2c4', 'd7d6',
  ]),
  bookLine('더치 디펜스 - 스톤월', 2, [
    'd2d4', 'f7f5', 'g2g3', 'g8f6', 'f1g2', 'e7e6', 'g1f3', 'd7d5', 'e1g1', 'c7c6', 'c2c4', 'f8d6',
  ]),
  bookLine('더치 디펜스 - 클래시컬', 1, [
    'd2d4', 'f7f5', 'g2g3', 'g8f6', 'f1g2', 'e7e6', 'g1f3', 'f8e7', 'e1g1', 'e8g8', 'c2c4', 'd7d6',
  ]),
  bookLine('올드 베노니', 1, [
    'd2d4', 'c7c5', 'd4d5', 'e7e5', 'c2c4', 'd7d6', 'b1c3', 'f7f5',
  ]),
];

const FLANK_OPENING_LINES = [
  bookLine('잉글리시 오프닝 - 대칭형', 3, [
    'c2c4', 'c7c5', 'b1c3', 'b8c6', 'g2g3', 'g7g6', 'f1g2', 'f8g7', 'g1f3', 'g8f6', 'e1g1', 'e8g8',
  ]),
  bookLine('잉글리시 오프닝 - 리버스드 시실리안', 3, [
    'c2c4', 'e7e5', 'b1c3', 'g8f6', 'g1f3', 'b8c6', 'g2g3', 'd7d5', 'c4d5', 'f6d5', 'f1g2',
  ]),
  bookLine('잉글리시 오프닝 - 봇비니크 시스템', 2, [
    'c2c4', 'c7c5', 'b1c3', 'b8c6', 'g2g3', 'g7g6', 'f1g2', 'f8g7', 'e2e4', 'd7d6', 'g1e2',
  ]),
  bookLine('잉글리시 오프닝 - 퀸즈 갬빗 전환형', 2, [
    'c2c4', 'e7e6', 'g1f3', 'd7d5', 'g2g3', 'g8f6', 'f1g2', 'f8e7', 'e1g1', 'e8g8',
  ]),
  bookLine('잉글리시 오프닝 - 포 나이츠', 2, [
    'c2c4', 'e7e5', 'b1c3', 'b8c6', 'g1f3', 'g8f6', 'g2g3', 'd7d5', 'c4d5', 'f6d5',
  ]),
  bookLine('레티 오프닝 - 메인라인', 3, [
    'g1f3', 'd7d5', 'c2c4', 'e7e6', 'g2g3', 'g8f6', 'f1g2', 'f8e7', 'e1g1', 'e8g8', 'd2d4',
  ]),
  bookLine('레티 오프닝 - 킹스 인디언 어택형', 2, [
    'g1f3', 'd7d5', 'g2g3', 'g8f6', 'f1g2', 'e7e6', 'e1g1', 'f8e7', 'd2d3', 'e8g8', 'b1d2',
  ]),
  bookLine('킹스 인디언 어택', 3, [
    'g1f3', 'd7d5', 'g2g3', 'g8f6', 'f1g2', 'e7e5', 'd2d3', 'b8c6', 'e1g1', 'f8e7',
  ]),
  bookLine('버드 오프닝', 2, [
    'f2f4', 'd7d5', 'g1f3', 'g8f6', 'e2e3', 'g7g6', 'b2b3', 'f8g7', 'c1b2', 'e8g8',
  ]),
  bookLine('프롬 갬빗', 1, [
    'f2f4', 'e7e5', 'f4e5', 'd7d6', 'e5d6', 'f8d6', 'g1f3', 'g7g5',
  ]),
  bookLine('라르센 오프닝', 2, [
    'b2b3', 'e7e5', 'c1b2', 'b8c6', 'e2e3', 'd7d5', 'f1b5', 'f8d6', 'g1f3',
  ]),
  bookLine('소콜스키 오프닝', 1, [
    'b2b4', 'd7d5', 'c1b2', 'g8f6', 'e2e3', 'e7e6', 'a2a3',
  ]),
  bookLine('주커토트 시스템', 2, [
    'g1f3', 'd7d5', 'e2e3', 'g8f6', 'b2b3', 'e7e6', 'c1b2', 'f8e7', 'f1e2',
  ]),
];

export const OPENING_LINES = [
  ...OPEN_GAME_LINES,
  ...SICILIAN_LINES,
  ...FRENCH_LINES,
  ...CARO_KANN_LINES,
  ...OTHER_E4_LINES,
  ...QUEENS_GAMBIT_LINES,
  ...INDIAN_DEFENCE_LINES,
  ...FLANK_OPENING_LINES,
];
