export const benchmarkResultsCalendar = {
  "generatedAt": "2026-06-22T07:46:01.112Z",
  "variants": {
    "variantA": {
      "label": "비교안 A · 조작 부담이 큰 구조",
      "description": "전체 메뉴가 접힌 것처럼 보이지만 메뉴 항목이 계속 순차 탐색되고, 예약 시간과 옵션 선택이 여러 멈춤 지점으로 흩어진 구조.",
      "tasks": {
        "task1_book_remote_tuesday_options": {
          "title": "비대면 상담 예약과 상담 옵션 선택",
          "assumptions": [
            "접힌 전체 메뉴 항목이 계속 초점을 받아 예약 조건 영역에 도달하기 전 탐색 비용이 늘어난다.",
            "예약 시간을 선택한 뒤 상담 주제와 알림 선택지가 화면상으로는 접힌 것처럼 보이지만 각 선택지가 따로 초점을 받는다.",
            "사전 작성란은 편집창으로 제공되며, 옵션을 확인하고 예약 확정까지 여러 번 이동해야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 60,
              "activations": 8,
              "decisions": 20,
              "waits": 2,
              "speechUnits": 34,
              "scanSteps": 75,
              "contextResets": 1
            },
            "byBucket": {
              "entry": {
                "navMoves": 28,
                "activations": 4,
                "decisions": 6,
                "waits": 1,
                "speechUnits": 14,
                "scanSteps": 34,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 27,
                "activations": 3,
                "decisions": 12,
                "waits": 0,
                "speechUnits": 17,
                "scanSteps": 34,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 5,
                "activations": 1,
                "decisions": 2,
                "waits": 1,
                "speechUnits": 3,
                "scanSteps": 7,
                "contextResets": 1
              }
            }
          },
          "profiles": {
            "keyboard": {
              "label": "키보드 사용자",
              "description": "숙련 키보드 사용자를 가정한 낙관적~보수적 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 37743,
                  "seconds": 37.7
                },
                "expected": {
                  "milliseconds": 56273,
                  "seconds": 56.3
                },
                "upper": {
                  "milliseconds": 80467,
                  "seconds": 80.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 16120,
                    "seconds": 16.1
                  },
                  "repeated": {
                    "milliseconds": 17850,
                    "seconds": 17.9
                  },
                  "recovery": {
                    "milliseconds": 3773,
                    "seconds": 3.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 23600,
                    "seconds": 23.6
                  },
                  "repeated": {
                    "milliseconds": 26310,
                    "seconds": 26.3
                  },
                  "recovery": {
                    "milliseconds": 6363,
                    "seconds": 6.4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 33020,
                    "seconds": 33
                  },
                  "repeated": {
                    "milliseconds": 37050,
                    "seconds": 37
                  },
                  "recovery": {
                    "milliseconds": 10397,
                    "seconds": 10.4
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 65992,
                  "seconds": 66
                },
                "expected": {
                  "milliseconds": 96169,
                  "seconds": 96.2
                },
                "upper": {
                  "milliseconds": 137987,
                  "seconds": 138
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 27200,
                    "seconds": 27.2
                  },
                  "repeated": {
                    "milliseconds": 30800,
                    "seconds": 30.8
                  },
                  "recovery": {
                    "milliseconds": 7992,
                    "seconds": 8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 38540,
                    "seconds": 38.5
                  },
                  "repeated": {
                    "milliseconds": 43680,
                    "seconds": 43.7
                  },
                  "recovery": {
                    "milliseconds": 13949,
                    "seconds": 13.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 53660,
                    "seconds": 53.7
                  },
                  "repeated": {
                    "milliseconds": 61190,
                    "seconds": 61.2
                  },
                  "recovery": {
                    "milliseconds": 23137,
                    "seconds": 23.1
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 91691,
                  "seconds": 91.7
                },
                "expected": {
                  "milliseconds": 139600,
                  "seconds": 139.6
                },
                "upper": {
                  "milliseconds": 216462,
                  "seconds": 216.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 38820,
                    "seconds": 38.8
                  },
                  "repeated": {
                    "milliseconds": 41600,
                    "seconds": 41.6
                  },
                  "recovery": {
                    "milliseconds": 11271,
                    "seconds": 11.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 57140,
                    "seconds": 57.1
                  },
                  "repeated": {
                    "milliseconds": 61340,
                    "seconds": 61.3
                  },
                  "recovery": {
                    "milliseconds": 21120,
                    "seconds": 21.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 85020,
                    "seconds": 85
                  },
                  "repeated": {
                    "milliseconds": 91500,
                    "seconds": 91.5
                  },
                  "recovery": {
                    "milliseconds": 39942,
                    "seconds": 39.9
                  }
                }
              }
            }
          }
        },
        "task2_cancel_and_rebook_thursday": {
          "title": "기존 예약 취소 뒤 목요일 오전 대면 예약",
          "assumptions": [
            "시작 시 예약 2개가 있어 새 예약을 바로 시도하면 최대 2개 제한 안내를 만나게 된다.",
            "현재 예약 영역이 결과 뒤에 있어 기존 예약 취소까지 다시 순차 이동해야 한다.",
            "취소 뒤 조건을 다시 맞추고 목요일 대면 예약 시간을 찾아야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 71,
              "activations": 9,
              "decisions": 20,
              "waits": 4,
              "speechUnits": 35,
              "scanSteps": 87,
              "contextResets": 3
            },
            "byBucket": {
              "entry": {
                "navMoves": 32,
                "activations": 5,
                "decisions": 8,
                "waits": 2,
                "speechUnits": 14,
                "scanSteps": 38,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 12,
                "activations": 1,
                "decisions": 5,
                "waits": 0,
                "speechUnits": 8,
                "scanSteps": 15,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 27,
                "activations": 3,
                "decisions": 7,
                "waits": 2,
                "speechUnits": 13,
                "scanSteps": 34,
                "contextResets": 3
              }
            }
          },
          "profiles": {
            "keyboard": {
              "label": "키보드 사용자",
              "description": "숙련 키보드 사용자를 가정한 낙관적~보수적 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 44409,
                  "seconds": 44.4
                },
                "expected": {
                  "milliseconds": 68786,
                  "seconds": 68.8
                },
                "upper": {
                  "milliseconds": 103054,
                  "seconds": 103.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 19100,
                    "seconds": 19.1
                  },
                  "repeated": {
                    "milliseconds": 7720,
                    "seconds": 7.7
                  },
                  "recovery": {
                    "milliseconds": 17589,
                    "seconds": 17.6
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 28040,
                    "seconds": 28
                  },
                  "repeated": {
                    "milliseconds": 11370,
                    "seconds": 11.4
                  },
                  "recovery": {
                    "milliseconds": 29376,
                    "seconds": 29.4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 39290,
                    "seconds": 39.3
                  },
                  "repeated": {
                    "milliseconds": 16000,
                    "seconds": 16
                  },
                  "recovery": {
                    "milliseconds": 47764,
                    "seconds": 47.8
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 80740,
                  "seconds": 80.7
                },
                "expected": {
                  "milliseconds": 125542,
                  "seconds": 125.5
                },
                "upper": {
                  "milliseconds": 190674,
                  "seconds": 190.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 31780,
                    "seconds": 31.8
                  },
                  "repeated": {
                    "milliseconds": 13440,
                    "seconds": 13.4
                  },
                  "recovery": {
                    "milliseconds": 35520,
                    "seconds": 35.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 45060,
                    "seconds": 45.1
                  },
                  "repeated": {
                    "milliseconds": 19060,
                    "seconds": 19.1
                  },
                  "recovery": {
                    "milliseconds": 61422,
                    "seconds": 61.4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 62800,
                    "seconds": 62.8
                  },
                  "repeated": {
                    "milliseconds": 26690,
                    "seconds": 26.7
                  },
                  "recovery": {
                    "milliseconds": 101184,
                    "seconds": 101.2
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 113082,
                  "seconds": 113.1
                },
                "expected": {
                  "milliseconds": 186732,
                  "seconds": 186.7
                },
                "upper": {
                  "milliseconds": 316609,
                  "seconds": 316.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 44640,
                    "seconds": 44.6
                  },
                  "repeated": {
                    "milliseconds": 17950,
                    "seconds": 17.9
                  },
                  "recovery": {
                    "milliseconds": 50492,
                    "seconds": 50.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 65740,
                    "seconds": 65.7
                  },
                  "repeated": {
                    "milliseconds": 26480,
                    "seconds": 26.5
                  },
                  "recovery": {
                    "milliseconds": 94512,
                    "seconds": 94.5
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 97740,
                    "seconds": 97.7
                  },
                  "repeated": {
                    "milliseconds": 39550,
                    "seconds": 39.5
                  },
                  "recovery": {
                    "milliseconds": 179319,
                    "seconds": 179.3
                  }
                }
              }
            }
          }
        }
      }
    },
    "variantB": {
      "label": "비교안 B · 개선 구조",
      "description": "접힌 메뉴 항목은 초점 대상에서 제외하고, 예약 가능 시간으로 바로 이동한 뒤 시간표와 옵션을 짧게 조작하는 구조.",
      "tasks": {
        "task1_book_remote_tuesday_options": {
          "title": "비대면 상담 예약과 상담 옵션 선택",
          "assumptions": [
            "접힌 전체 메뉴 항목은 초점 대상에서 제외되어 첫 진입 비용이 줄어든다.",
            "예약 가능 시간 바로 이동과 시간표 묶음 이동으로 목표 시간을 찾는 비용을 줄인다.",
            "상담 옵션은 기본 폼 요소와 사전 작성란으로 묶여 있어 필요한 값만 고르고 예약 확정으로 이어진다."
          ],
          "structural": {
            "totals": {
              "navMoves": 22,
              "activations": 9,
              "decisions": 14,
              "waits": 2,
              "speechUnits": 17,
              "scanSteps": 28,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 8,
                "activations": 5,
                "decisions": 5,
                "waits": 1,
                "speechUnits": 6,
                "scanSteps": 11,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 12,
                "activations": 3,
                "decisions": 7,
                "waits": 0,
                "speechUnits": 9,
                "scanSteps": 14,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 2,
                "activations": 1,
                "decisions": 2,
                "waits": 1,
                "speechUnits": 2,
                "scanSteps": 3,
                "contextResets": 0
              }
            }
          },
          "profiles": {
            "keyboard": {
              "label": "키보드 사용자",
              "description": "숙련 키보드 사용자를 가정한 낙관적~보수적 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 18208,
                  "seconds": 18.2
                },
                "expected": {
                  "milliseconds": 27505,
                  "seconds": 27.5
                },
                "upper": {
                  "milliseconds": 39802,
                  "seconds": 39.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 6920,
                    "seconds": 6.9
                  },
                  "repeated": {
                    "milliseconds": 9000,
                    "seconds": 9
                  },
                  "recovery": {
                    "milliseconds": 2288,
                    "seconds": 2.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 10270,
                    "seconds": 10.3
                  },
                  "repeated": {
                    "milliseconds": 13310,
                    "seconds": 13.3
                  },
                  "recovery": {
                    "milliseconds": 3925,
                    "seconds": 3.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 14520,
                    "seconds": 14.5
                  },
                  "repeated": {
                    "milliseconds": 18800,
                    "seconds": 18.8
                  },
                  "recovery": {
                    "milliseconds": 6482,
                    "seconds": 6.5
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 31200,
                  "seconds": 31.2
                },
                "expected": {
                  "milliseconds": 45768,
                  "seconds": 45.8
                },
                "upper": {
                  "milliseconds": 66084,
                  "seconds": 66.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11480,
                    "seconds": 11.5
                  },
                  "repeated": {
                    "milliseconds": 15520,
                    "seconds": 15.5
                  },
                  "recovery": {
                    "milliseconds": 4200,
                    "seconds": 4.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 16400,
                    "seconds": 16.4
                  },
                  "repeated": {
                    "milliseconds": 22060,
                    "seconds": 22.1
                  },
                  "recovery": {
                    "milliseconds": 7308,
                    "seconds": 7.3
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 23010,
                    "seconds": 23
                  },
                  "repeated": {
                    "milliseconds": 30970,
                    "seconds": 31
                  },
                  "recovery": {
                    "milliseconds": 12104,
                    "seconds": 12.1
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 43001,
                  "seconds": 43
                },
                "expected": {
                  "milliseconds": 65740,
                  "seconds": 65.7
                },
                "upper": {
                  "milliseconds": 101722,
                  "seconds": 101.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 17070,
                    "seconds": 17.1
                  },
                  "repeated": {
                    "milliseconds": 19600,
                    "seconds": 19.6
                  },
                  "recovery": {
                    "milliseconds": 6331,
                    "seconds": 6.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 25020,
                    "seconds": 25
                  },
                  "repeated": {
                    "milliseconds": 28840,
                    "seconds": 28.8
                  },
                  "recovery": {
                    "milliseconds": 11880,
                    "seconds": 11.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 36670,
                    "seconds": 36.7
                  },
                  "repeated": {
                    "milliseconds": 42750,
                    "seconds": 42.8
                  },
                  "recovery": {
                    "milliseconds": 22302,
                    "seconds": 22.3
                  }
                }
              }
            }
          }
        },
        "task2_cancel_and_rebook_thursday": {
          "title": "기존 예약 취소 뒤 목요일 오전 대면 예약",
          "assumptions": [
            "현재 예약 내용이 앞쪽에 있어 예약 개수 제한을 이해한 뒤 취소로 이어지기 쉽다.",
            "조건 적용 후 결과 제목으로 초점이 이동하고 시간표 안에서 목표 시간까지 이동한다.",
            "취소와 새 예약 확인 후 초점 복귀가 예측 가능하다."
          ],
          "structural": {
            "totals": {
              "navMoves": 17,
              "activations": 7,
              "decisions": 12,
              "waits": 3,
              "speechUnits": 12,
              "scanSteps": 21,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 6,
                "activations": 3,
                "decisions": 4,
                "waits": 1,
                "speechUnits": 4,
                "scanSteps": 7,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 6,
                "activations": 1,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 4,
                "scanSteps": 7,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 5,
                "activations": 3,
                "decisions": 4,
                "waits": 2,
                "speechUnits": 4,
                "scanSteps": 7,
                "contextResets": 0
              }
            }
          },
          "profiles": {
            "keyboard": {
              "label": "키보드 사용자",
              "description": "숙련 키보드 사용자를 가정한 낙관적~보수적 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 15073,
                  "seconds": 15.1
                },
                "expected": {
                  "milliseconds": 23563,
                  "seconds": 23.6
                },
                "upper": {
                  "milliseconds": 35441,
                  "seconds": 35.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 5160,
                    "seconds": 5.2
                  },
                  "repeated": {
                    "milliseconds": 4600,
                    "seconds": 4.6
                  },
                  "recovery": {
                    "milliseconds": 5313,
                    "seconds": 5.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 7680,
                    "seconds": 7.7
                  },
                  "repeated": {
                    "milliseconds": 6820,
                    "seconds": 6.8
                  },
                  "recovery": {
                    "milliseconds": 9063,
                    "seconds": 9.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 10870,
                    "seconds": 10.9
                  },
                  "repeated": {
                    "milliseconds": 9650,
                    "seconds": 9.7
                  },
                  "recovery": {
                    "milliseconds": 14921,
                    "seconds": 14.9
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 25992,
                  "seconds": 26
                },
                "expected": {
                  "milliseconds": 40008,
                  "seconds": 40
                },
                "upper": {
                  "milliseconds": 60307,
                  "seconds": 60.3
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 8540,
                    "seconds": 8.5
                  },
                  "repeated": {
                    "milliseconds": 7900,
                    "seconds": 7.9
                  },
                  "recovery": {
                    "milliseconds": 9552,
                    "seconds": 9.6
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 12200,
                    "seconds": 12.2
                  },
                  "repeated": {
                    "milliseconds": 11220,
                    "seconds": 11.2
                  },
                  "recovery": {
                    "milliseconds": 16588,
                    "seconds": 16.6
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 17140,
                    "seconds": 17.1
                  },
                  "repeated": {
                    "milliseconds": 15780,
                    "seconds": 15.8
                  },
                  "recovery": {
                    "milliseconds": 27387,
                    "seconds": 27.4
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 35827,
                  "seconds": 35.8
                },
                "expected": {
                  "milliseconds": 58627,
                  "seconds": 58.6
                },
                "upper": {
                  "milliseconds": 97464,
                  "seconds": 97.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 11270,
                    "seconds": 11.3
                  },
                  "repeated": {
                    "milliseconds": 9750,
                    "seconds": 9.8
                  },
                  "recovery": {
                    "milliseconds": 14807,
                    "seconds": 14.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 16560,
                    "seconds": 16.6
                  },
                  "repeated": {
                    "milliseconds": 14380,
                    "seconds": 14.4
                  },
                  "recovery": {
                    "milliseconds": 27687,
                    "seconds": 27.7
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 24320,
                    "seconds": 24.3
                  },
                  "repeated": {
                    "milliseconds": 21400,
                    "seconds": 21.4
                  },
                  "recovery": {
                    "milliseconds": 51744,
                    "seconds": 51.7
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "comparisons": {
    "task1_book_remote_tuesday_options": {
      "keyboard": {
        "expectedReductionSeconds": 28.8,
        "expectedReductionPercent": 51.2
      },
      "screenReader": {
        "expectedReductionSeconds": 50.4,
        "expectedReductionPercent": 52.4
      },
      "switch": {
        "expectedReductionSeconds": 73.9,
        "expectedReductionPercent": 52.9
      }
    },
    "task2_cancel_and_rebook_thursday": {
      "keyboard": {
        "expectedReductionSeconds": 45.2,
        "expectedReductionPercent": 65.7
      },
      "screenReader": {
        "expectedReductionSeconds": 85.5,
        "expectedReductionPercent": 68.1
      },
      "switch": {
        "expectedReductionSeconds": 128.1,
        "expectedReductionPercent": 68.6
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 125.1,
      "variantBExpectedSeconds": 51.1,
      "expectedReductionSeconds": 74,
      "expectedReductionPercent": 59.2
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 221.7,
      "variantBExpectedSeconds": 85.8,
      "expectedReductionSeconds": 135.9,
      "expectedReductionPercent": 61.3
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 326.3,
      "variantBExpectedSeconds": 124.3,
      "expectedReductionSeconds": 202,
      "expectedReductionPercent": 61.9
    }
  },
  "measurementRules": [
    "실제 계측은 과업 수행 페이지에서 첫 조작이 들어갈 때 시작합니다.",
    "과업 수행 페이지가 보이지 않는 동안의 시간은 실제 완료 시간에서 제외합니다.",
    "과업 수행 페이지 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다.",
    "과업 종료 버튼 뒤의 종료 확인 대화상자 조작은 실제 지표에서 제외합니다."
  ],
  "actualMeasurementScope": "과업 설명은 메인 창에서 확인하고, 새 탭의 실제 예약 화면 조작만 기록합니다."
};
