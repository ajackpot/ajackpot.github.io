export const benchmarkResultsCalendar = {
  "generatedAt": "2026-03-31T05:52:42.759Z",
  "variants": {
    "variantA": {
      "label": "비교안 A · 조작 부담이 큰 구조",
      "description": "상단 링크와 조건 선택을 지난 뒤 결과에 도달하고, 예약 시간마다 여러 번 멈춰야 하며, 대화상자를 닫은 뒤 결과 제목 근처부터 다시 찾아야 하는 구조.",
      "tasks": {
        "task1_book_remote_tuesday": {
          "title": "화요일 오후 비대면 30분 상담 예약",
          "assumptions": [
            "상단 링크와 보조 링크를 지나 예약 가능 시간 영역에 도달해야 한다.",
            "예약 시간마다 선택과 자세히 보기 버튼이 분리되어 있다.",
            "대화상자를 닫으면 방금 보던 예약 시간으로 돌아가지 않고 결과 제목 근처부터 다시 찾아야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 57,
              "activations": 6,
              "decisions": 19,
              "waits": 2,
              "speechUnits": 30,
              "scanSteps": 68,
              "contextResets": 1
            },
            "byBucket": {
              "entry": {
                "navMoves": 35,
                "activations": 4,
                "decisions": 9,
                "waits": 1,
                "speechUnits": 16,
                "scanSteps": 40,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 16,
                "activations": 1,
                "decisions": 8,
                "waits": 0,
                "speechUnits": 11,
                "scanSteps": 21,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 6,
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
                  "milliseconds": 35578,
                  "seconds": 35.6
                },
                "expected": {
                  "milliseconds": 53195,
                  "seconds": 53.2
                },
                "upper": {
                  "milliseconds": 76322,
                  "seconds": 76.3
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 20530,
                    "seconds": 20.5
                  },
                  "repeated": {
                    "milliseconds": 10780,
                    "seconds": 10.8
                  },
                  "recovery": {
                    "milliseconds": 4268,
                    "seconds": 4.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 30100,
                    "seconds": 30.1
                  },
                  "repeated": {
                    "milliseconds": 15920,
                    "seconds": 15.9
                  },
                  "recovery": {
                    "milliseconds": 7175,
                    "seconds": 7.2
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 42170,
                    "seconds": 42.2
                  },
                  "repeated": {
                    "milliseconds": 22450,
                    "seconds": 22.4
                  },
                  "recovery": {
                    "milliseconds": 11702,
                    "seconds": 11.7
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 62172,
                  "seconds": 62.2
                },
                "expected": {
                  "milliseconds": 90950,
                  "seconds": 91
                },
                "upper": {
                  "milliseconds": 131032,
                  "seconds": 131
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 34520,
                    "seconds": 34.5
                  },
                  "repeated": {
                    "milliseconds": 18820,
                    "seconds": 18.8
                  },
                  "recovery": {
                    "milliseconds": 8832,
                    "seconds": 8.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 48880,
                    "seconds": 48.9
                  },
                  "repeated": {
                    "milliseconds": 26700,
                    "seconds": 26.7
                  },
                  "recovery": {
                    "milliseconds": 15370,
                    "seconds": 15.4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 68140,
                    "seconds": 68.1
                  },
                  "repeated": {
                    "milliseconds": 37460,
                    "seconds": 37.5
                  },
                  "recovery": {
                    "milliseconds": 25432,
                    "seconds": 25.4
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 83041,
                  "seconds": 83
                },
                "expected": {
                  "milliseconds": 126940,
                  "seconds": 126.9
                },
                "upper": {
                  "milliseconds": 197812,
                  "seconds": 197.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 46320,
                    "seconds": 46.3
                  },
                  "repeated": {
                    "milliseconds": 25450,
                    "seconds": 25.4
                  },
                  "recovery": {
                    "milliseconds": 11271,
                    "seconds": 11.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 68240,
                    "seconds": 68.2
                  },
                  "repeated": {
                    "milliseconds": 37580,
                    "seconds": 37.6
                  },
                  "recovery": {
                    "milliseconds": 21120,
                    "seconds": 21.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 101670,
                    "seconds": 101.7
                  },
                  "repeated": {
                    "milliseconds": 56200,
                    "seconds": 56.2
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
        "task2_move_earlier_same_day": {
          "title": "같은 날 더 이른 시간대로 변경",
          "assumptions": [
            "기존 예약 상태를 확인하는 영역까지 다시 차례대로 이동해야 한다.",
            "조건은 유지되지만 결과 목록 위치가 기억되지 않아 다시 찾아야 한다.",
            "변경 확인 대화상자를 닫으면 이전 예약 시간 대신 결과 제목 근처부터 다시 살펴야 한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 40,
              "activations": 2,
              "decisions": 11,
              "waits": 1,
              "speechUnits": 21,
              "scanSteps": 48,
              "contextResets": 1
            },
            "byBucket": {
              "entry": {
                "navMoves": 20,
                "activations": 0,
                "decisions": 3,
                "waits": 0,
                "speechUnits": 8,
                "scanSteps": 23,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 13,
                "activations": 1,
                "decisions": 6,
                "waits": 0,
                "speechUnits": 9,
                "scanSteps": 17,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 7,
                "activations": 1,
                "decisions": 2,
                "waits": 1,
                "speechUnits": 4,
                "scanSteps": 8,
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
                  "milliseconds": 23613,
                  "seconds": 23.6
                },
                "expected": {
                  "milliseconds": 35608,
                  "seconds": 35.6
                },
                "upper": {
                  "milliseconds": 51707,
                  "seconds": 51.7
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 10260,
                    "seconds": 10.3
                  },
                  "repeated": {
                    "milliseconds": 8590,
                    "seconds": 8.6
                  },
                  "recovery": {
                    "milliseconds": 4763,
                    "seconds": 4.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 14950,
                    "seconds": 14.9
                  },
                  "repeated": {
                    "milliseconds": 12670,
                    "seconds": 12.7
                  },
                  "recovery": {
                    "milliseconds": 7988,
                    "seconds": 8
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 20850,
                    "seconds": 20.9
                  },
                  "repeated": {
                    "milliseconds": 17850,
                    "seconds": 17.9
                  },
                  "recovery": {
                    "milliseconds": 13007,
                    "seconds": 13
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 42244,
                  "seconds": 42.2
                },
                "expected": {
                  "milliseconds": 62939,
                  "seconds": 62.9
                },
                "upper": {
                  "milliseconds": 92205,
                  "seconds": 92.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 17380,
                    "seconds": 17.4
                  },
                  "repeated": {
                    "milliseconds": 15000,
                    "seconds": 15
                  },
                  "recovery": {
                    "milliseconds": 9864,
                    "seconds": 9.9
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 24520,
                    "seconds": 24.5
                  },
                  "repeated": {
                    "milliseconds": 21280,
                    "seconds": 21.3
                  },
                  "recovery": {
                    "milliseconds": 17139,
                    "seconds": 17.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 34070,
                    "seconds": 34.1
                  },
                  "repeated": {
                    "milliseconds": 29830,
                    "seconds": 29.8
                  },
                  "recovery": {
                    "milliseconds": 28305,
                    "seconds": 28.3
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 56606,
                  "seconds": 56.6
                },
                "expected": {
                  "milliseconds": 88510,
                  "seconds": 88.5
                },
                "upper": {
                  "milliseconds": 141802,
                  "seconds": 141.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 23650,
                    "seconds": 23.6
                  },
                  "repeated": {
                    "milliseconds": 20450,
                    "seconds": 20.4
                  },
                  "recovery": {
                    "milliseconds": 12506,
                    "seconds": 12.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 34900,
                    "seconds": 34.9
                  },
                  "repeated": {
                    "milliseconds": 30180,
                    "seconds": 30.2
                  },
                  "recovery": {
                    "milliseconds": 23430,
                    "seconds": 23.4
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 52350,
                    "seconds": 52.4
                  },
                  "repeated": {
                    "milliseconds": 45100,
                    "seconds": 45.1
                  },
                  "recovery": {
                    "milliseconds": 44352,
                    "seconds": 44.4
                  }
                }
              }
            }
          }
        },
        "task3_cancel_and_rebook_thursday": {
          "title": "취소 후 목요일 오전 대면 예약",
          "assumptions": [
            "취소 버튼이 결과 목록 뒤에 있어 먼저 다시 찾아야 한다.",
            "취소 후 조건을 다시 맞춘 다음 목요일 예약 시간을 차례대로 찾아야 한다.",
            "새 예약을 확정할 때까지 대화상자 진입과 결과 제목으로의 복귀 부담이 겹친다."
          ],
          "structural": {
            "totals": {
              "navMoves": 56,
              "activations": 5,
              "decisions": 16,
              "waits": 3,
              "speechUnits": 28,
              "scanSteps": 66,
              "contextResets": 2
            },
            "byBucket": {
              "entry": {
                "navMoves": 34,
                "activations": 3,
                "decisions": 7,
                "waits": 1,
                "speechUnits": 14,
                "scanSteps": 39,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 12,
                "activations": 0,
                "decisions": 5,
                "waits": 0,
                "speechUnits": 8,
                "scanSteps": 15,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 10,
                "activations": 2,
                "decisions": 4,
                "waits": 2,
                "speechUnits": 6,
                "scanSteps": 12,
                "contextResets": 2
              }
            }
          },
          "profiles": {
            "keyboard": {
              "label": "키보드 사용자",
              "description": "숙련 키보드 사용자를 가정한 낙관적~보수적 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 34066,
                  "seconds": 34.1
                },
                "expected": {
                  "milliseconds": 51605,
                  "seconds": 51.6
                },
                "upper": {
                  "milliseconds": 75264,
                  "seconds": 75.3
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 19020,
                    "seconds": 19
                  },
                  "repeated": {
                    "milliseconds": 7500,
                    "seconds": 7.5
                  },
                  "recovery": {
                    "milliseconds": 7546,
                    "seconds": 7.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 27830,
                    "seconds": 27.8
                  },
                  "repeated": {
                    "milliseconds": 11050,
                    "seconds": 11.1
                  },
                  "recovery": {
                    "milliseconds": 12725,
                    "seconds": 12.7
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 38920,
                    "seconds": 38.9
                  },
                  "repeated": {
                    "milliseconds": 15550,
                    "seconds": 15.6
                  },
                  "recovery": {
                    "milliseconds": 20794,
                    "seconds": 20.8
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 61004,
                  "seconds": 61
                },
                "expected": {
                  "milliseconds": 91618,
                  "seconds": 91.6
                },
                "upper": {
                  "milliseconds": 135134,
                  "seconds": 135.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 31840,
                    "seconds": 31.8
                  },
                  "repeated": {
                    "milliseconds": 13180,
                    "seconds": 13.2
                  },
                  "recovery": {
                    "milliseconds": 15984,
                    "seconds": 16
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 45040,
                    "seconds": 45
                  },
                  "repeated": {
                    "milliseconds": 18680,
                    "seconds": 18.7
                  },
                  "recovery": {
                    "milliseconds": 27898,
                    "seconds": 27.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 62690,
                    "seconds": 62.7
                  },
                  "repeated": {
                    "milliseconds": 26170,
                    "seconds": 26.2
                  },
                  "recovery": {
                    "milliseconds": 46274,
                    "seconds": 46.3
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 80792,
                  "seconds": 80.8
                },
                "expected": {
                  "milliseconds": 127180,
                  "seconds": 127.2
                },
                "upper": {
                  "milliseconds": 204884,
                  "seconds": 204.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 43470,
                    "seconds": 43.5
                  },
                  "repeated": {
                    "milliseconds": 17250,
                    "seconds": 17.3
                  },
                  "recovery": {
                    "milliseconds": 20072,
                    "seconds": 20.1
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 64060,
                    "seconds": 64.1
                  },
                  "repeated": {
                    "milliseconds": 25500,
                    "seconds": 25.5
                  },
                  "recovery": {
                    "milliseconds": 37620,
                    "seconds": 37.6
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 95570,
                    "seconds": 95.6
                  },
                  "repeated": {
                    "milliseconds": 38250,
                    "seconds": 38.3
                  },
                  "recovery": {
                    "milliseconds": 71064,
                    "seconds": 71.1
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
      "description": "결과로 바로 이동하고, 예약 시간표에 한 번만 들어간 뒤 이동하며, 대화상자 초점 이동과 복귀를 보장하는 구조.",
      "tasks": {
        "task1_book_remote_tuesday": {
          "title": "화요일 오후 비대면 30분 상담 예약",
          "assumptions": [
            "결과로 바로 이동하는 링크와 결과 이동 버튼으로 첫 진입 부담이 낮다.",
            "예약 시간표가 하나의 묶음으로 제공되어 한 번만 들어간 뒤 이동한다.",
            "대화상자가 열리면 첫 동작으로 이동하고 닫히면 호출한 예약 시간으로 돌아온다."
          ],
          "structural": {
            "totals": {
              "navMoves": 18,
              "activations": 7,
              "decisions": 12,
              "waits": 2,
              "speechUnits": 14,
              "scanSteps": 23,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 9,
                "activations": 5,
                "decisions": 6,
                "waits": 1,
                "speechUnits": 7,
                "scanSteps": 12,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 7,
                "activations": 0,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 5,
                "scanSteps": 8,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 2,
                "activations": 2,
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
                  "milliseconds": 15150,
                  "seconds": 15.2
                },
                "expected": {
                  "milliseconds": 23045,
                  "seconds": 23
                },
                "upper": {
                  "milliseconds": 33604,
                  "seconds": 33.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 7790,
                    "seconds": 7.8
                  },
                  "repeated": {
                    "milliseconds": 4830,
                    "seconds": 4.8
                  },
                  "recovery": {
                    "milliseconds": 2530,
                    "seconds": 2.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 11570,
                    "seconds": 11.6
                  },
                  "repeated": {
                    "milliseconds": 7150,
                    "seconds": 7.2
                  },
                  "recovery": {
                    "milliseconds": 4325,
                    "seconds": 4.3
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 16370,
                    "seconds": 16.4
                  },
                  "repeated": {
                    "milliseconds": 10100,
                    "seconds": 10.1
                  },
                  "recovery": {
                    "milliseconds": 7134,
                    "seconds": 7.1
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 26052,
                  "seconds": 26.1
                },
                "expected": {
                  "milliseconds": 38539,
                  "seconds": 38.5
                },
                "upper": {
                  "milliseconds": 56088,
                  "seconds": 56.1
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 13040,
                    "seconds": 13
                  },
                  "repeated": {
                    "milliseconds": 8500,
                    "seconds": 8.5
                  },
                  "recovery": {
                    "milliseconds": 4512,
                    "seconds": 4.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 18620,
                    "seconds": 18.6
                  },
                  "repeated": {
                    "milliseconds": 12060,
                    "seconds": 12.1
                  },
                  "recovery": {
                    "milliseconds": 7859,
                    "seconds": 7.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 26150,
                    "seconds": 26.1
                  },
                  "repeated": {
                    "milliseconds": 16950,
                    "seconds": 16.9
                  },
                  "recovery": {
                    "milliseconds": 12988,
                    "seconds": 13
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 35861,
                  "seconds": 35.9
                },
                "expected": {
                  "milliseconds": 55617,
                  "seconds": 55.6
                },
                "upper": {
                  "milliseconds": 87352,
                  "seconds": 87.4
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 18620,
                    "seconds": 18.6
                  },
                  "repeated": {
                    "milliseconds": 10000,
                    "seconds": 10
                  },
                  "recovery": {
                    "milliseconds": 7241,
                    "seconds": 7.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 27320,
                    "seconds": 27.3
                  },
                  "repeated": {
                    "milliseconds": 14800,
                    "seconds": 14.8
                  },
                  "recovery": {
                    "milliseconds": 13497,
                    "seconds": 13.5
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 40120,
                    "seconds": 40.1
                  },
                  "repeated": {
                    "milliseconds": 22200,
                    "seconds": 22.2
                  },
                  "recovery": {
                    "milliseconds": 25032,
                    "seconds": 25
                  }
                }
              }
            }
          }
        },
        "task2_move_earlier_same_day": {
          "title": "같은 날 더 이른 시간대로 변경",
          "assumptions": [
            "현재 예약 상태가 같은 영역에 유지되어 다시 파악하는 부담이 적다.",
            "예약 시간 사이 이동은 방향키 중심이라 짧게 끝난다.",
            "변경 후 초점이 새 예약 요약으로 이동한다."
          ],
          "structural": {
            "totals": {
              "navMoves": 9,
              "activations": 2,
              "decisions": 6,
              "waits": 1,
              "speechUnits": 7,
              "scanSteps": 11,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 3,
                "activations": 0,
                "decisions": 1,
                "waits": 0,
                "speechUnits": 2,
                "scanSteps": 3,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 4,
                "activations": 0,
                "decisions": 3,
                "waits": 0,
                "speechUnits": 3,
                "scanSteps": 5,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 2,
                "activations": 2,
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
                  "milliseconds": 7360,
                  "seconds": 7.4
                },
                "expected": {
                  "milliseconds": 11475,
                  "seconds": 11.5
                },
                "upper": {
                  "milliseconds": 17234,
                  "seconds": 17.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 1770,
                    "seconds": 1.8
                  },
                  "repeated": {
                    "milliseconds": 3060,
                    "seconds": 3.1
                  },
                  "recovery": {
                    "milliseconds": 2530,
                    "seconds": 2.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 2600,
                    "seconds": 2.6
                  },
                  "repeated": {
                    "milliseconds": 4550,
                    "seconds": 4.5
                  },
                  "recovery": {
                    "milliseconds": 4325,
                    "seconds": 4.3
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 3650,
                    "seconds": 3.6
                  },
                  "repeated": {
                    "milliseconds": 6450,
                    "seconds": 6.5
                  },
                  "recovery": {
                    "milliseconds": 7134,
                    "seconds": 7.1
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 13012,
                  "seconds": 13
                },
                "expected": {
                  "milliseconds": 19919,
                  "seconds": 19.9
                },
                "upper": {
                  "milliseconds": 29938,
                  "seconds": 29.9
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 3120,
                    "seconds": 3.1
                  },
                  "repeated": {
                    "milliseconds": 5380,
                    "seconds": 5.4
                  },
                  "recovery": {
                    "milliseconds": 4512,
                    "seconds": 4.5
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 4420,
                    "seconds": 4.4
                  },
                  "repeated": {
                    "milliseconds": 7640,
                    "seconds": 7.6
                  },
                  "recovery": {
                    "milliseconds": 7859,
                    "seconds": 7.9
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 6180,
                    "seconds": 6.2
                  },
                  "repeated": {
                    "milliseconds": 10770,
                    "seconds": 10.8
                  },
                  "recovery": {
                    "milliseconds": 12988,
                    "seconds": 13
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 17241,
                  "seconds": 17.2
                },
                "expected": {
                  "milliseconds": 28297,
                  "seconds": 28.3
                },
                "upper": {
                  "milliseconds": 47232,
                  "seconds": 47.2
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 3450,
                    "seconds": 3.5
                  },
                  "repeated": {
                    "milliseconds": 6550,
                    "seconds": 6.5
                  },
                  "recovery": {
                    "milliseconds": 7241,
                    "seconds": 7.2
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 5100,
                    "seconds": 5.1
                  },
                  "repeated": {
                    "milliseconds": 9700,
                    "seconds": 9.7
                  },
                  "recovery": {
                    "milliseconds": 13497,
                    "seconds": 13.5
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 7650,
                    "seconds": 7.7
                  },
                  "repeated": {
                    "milliseconds": 14550,
                    "seconds": 14.6
                  },
                  "recovery": {
                    "milliseconds": 25032,
                    "seconds": 25
                  }
                }
              }
            }
          }
        },
        "task3_cancel_and_rebook_thursday": {
          "title": "취소 후 목요일 오전 대면 예약",
          "assumptions": [
            "현재 예약 영역이 빠르게 닿을 수 있는 위치에 놓인다.",
            "조건을 적용한 뒤 결과 제목으로 초점이 이동한다.",
            "새 예약 시간을 고를 때까지 반복되는 상단 영역을 건너뛸 수 있다."
          ],
          "structural": {
            "totals": {
              "navMoves": 17,
              "activations": 6,
              "decisions": 13,
              "waits": 3,
              "speechUnits": 13,
              "scanSteps": 20,
              "contextResets": 0
            },
            "byBucket": {
              "entry": {
                "navMoves": 7,
                "activations": 3,
                "decisions": 5,
                "waits": 1,
                "speechUnits": 5,
                "scanSteps": 8,
                "contextResets": 0
              },
              "repeated": {
                "navMoves": 6,
                "activations": 0,
                "decisions": 4,
                "waits": 0,
                "speechUnits": 4,
                "scanSteps": 7,
                "contextResets": 0
              },
              "recovery": {
                "navMoves": 4,
                "activations": 3,
                "decisions": 4,
                "waits": 2,
                "speechUnits": 4,
                "scanSteps": 5,
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
                  "milliseconds": 15228,
                  "seconds": 15.2
                },
                "expected": {
                  "milliseconds": 23730,
                  "seconds": 23.7
                },
                "upper": {
                  "milliseconds": 35536,
                  "seconds": 35.5
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 6030,
                    "seconds": 6
                  },
                  "repeated": {
                    "milliseconds": 4380,
                    "seconds": 4.4
                  },
                  "recovery": {
                    "milliseconds": 4818,
                    "seconds": 4.8
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 8980,
                    "seconds": 9
                  },
                  "repeated": {
                    "milliseconds": 6500,
                    "seconds": 6.5
                  },
                  "recovery": {
                    "milliseconds": 8250,
                    "seconds": 8.3
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 12720,
                    "seconds": 12.7
                  },
                  "repeated": {
                    "milliseconds": 9200,
                    "seconds": 9.2
                  },
                  "recovery": {
                    "milliseconds": 13616,
                    "seconds": 13.6
                  }
                }
              }
            },
            "screenReader": {
              "label": "화면낭독 사용자",
              "description": "키보드 비용에 발화 청취와 문맥 재구축 비용을 더한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 26452,
                  "seconds": 26.5
                },
                "expected": {
                  "milliseconds": 40427,
                  "seconds": 40.4
                },
                "upper": {
                  "milliseconds": 60632,
                  "seconds": 60.6
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 10100,
                    "seconds": 10.1
                  },
                  "repeated": {
                    "milliseconds": 7640,
                    "seconds": 7.6
                  },
                  "recovery": {
                    "milliseconds": 8712,
                    "seconds": 8.7
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 14420,
                    "seconds": 14.4
                  },
                  "repeated": {
                    "milliseconds": 10840,
                    "seconds": 10.8
                  },
                  "recovery": {
                    "milliseconds": 15167,
                    "seconds": 15.2
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 20280,
                    "seconds": 20.3
                  },
                  "repeated": {
                    "milliseconds": 15260,
                    "seconds": 15.3
                  },
                  "recovery": {
                    "milliseconds": 25092,
                    "seconds": 25.1
                  }
                }
              }
            },
            "switch": {
              "label": "스위치 사용자",
              "description": "자동 스캔 기반 순차 입력을 가정한 범위.",
              "ranges": {
                "lower": {
                  "milliseconds": 34207,
                  "seconds": 34.2
                },
                "expected": {
                  "milliseconds": 55327,
                  "seconds": 55.3
                },
                "upper": {
                  "milliseconds": 90794,
                  "seconds": 90.8
                }
              },
              "bucketRanges": {
                "lower": {
                  "entry": {
                    "milliseconds": 12820,
                    "seconds": 12.8
                  },
                  "repeated": {
                    "milliseconds": 9050,
                    "seconds": 9.1
                  },
                  "recovery": {
                    "milliseconds": 12337,
                    "seconds": 12.3
                  }
                },
                "expected": {
                  "entry": {
                    "milliseconds": 18860,
                    "seconds": 18.9
                  },
                  "repeated": {
                    "milliseconds": 13400,
                    "seconds": 13.4
                  },
                  "recovery": {
                    "milliseconds": 23067,
                    "seconds": 23.1
                  }
                },
                "upper": {
                  "entry": {
                    "milliseconds": 27770,
                    "seconds": 27.8
                  },
                  "repeated": {
                    "milliseconds": 20100,
                    "seconds": 20.1
                  },
                  "recovery": {
                    "milliseconds": 42924,
                    "seconds": 42.9
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
    "task1_book_remote_tuesday": {
      "keyboard": {
        "expectedReductionSeconds": 30.2,
        "expectedReductionPercent": 56.8
      },
      "screenReader": {
        "expectedReductionSeconds": 52.5,
        "expectedReductionPercent": 57.7
      },
      "switch": {
        "expectedReductionSeconds": 71.3,
        "expectedReductionPercent": 56.2
      }
    },
    "task2_move_earlier_same_day": {
      "keyboard": {
        "expectedReductionSeconds": 24.1,
        "expectedReductionPercent": 67.7
      },
      "screenReader": {
        "expectedReductionSeconds": 43,
        "expectedReductionPercent": 68.4
      },
      "switch": {
        "expectedReductionSeconds": 60.2,
        "expectedReductionPercent": 68
      }
    },
    "task3_cancel_and_rebook_thursday": {
      "keyboard": {
        "expectedReductionSeconds": 27.9,
        "expectedReductionPercent": 54.1
      },
      "screenReader": {
        "expectedReductionSeconds": 51.2,
        "expectedReductionPercent": 55.9
      },
      "switch": {
        "expectedReductionSeconds": 71.9,
        "expectedReductionPercent": 56.5
      }
    }
  },
  "overall": {
    "keyboard": {
      "label": "키보드 사용자",
      "variantAExpectedSeconds": 140.4,
      "variantBExpectedSeconds": 58.2,
      "expectedReductionSeconds": 82.2,
      "expectedReductionPercent": 58.5
    },
    "screenReader": {
      "label": "화면낭독 사용자",
      "variantAExpectedSeconds": 245.5,
      "variantBExpectedSeconds": 98.8,
      "expectedReductionSeconds": 146.7,
      "expectedReductionPercent": 59.8
    },
    "switch": {
      "label": "스위치 사용자",
      "variantAExpectedSeconds": 342.6,
      "variantBExpectedSeconds": 139.2,
      "expectedReductionSeconds": 203.4,
      "expectedReductionPercent": 59.4
    }
  }
};
